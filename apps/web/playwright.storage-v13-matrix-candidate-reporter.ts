import { createHash } from "node:crypto";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase
} from "@playwright/test/reporter";

import {
  STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
  STORAGE_V13_MATRIX_AUTHORITY,
  STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME,
  assertStorageV13MatrixCandidateAttemptMarkerStable,
  loadStorageV13MatrixCandidateAttemptMarker,
  parseStorageV13MatrixCandidateEnvironment,
  publishStorageV13MatrixCandidateSummary
} from "../../scripts/storage-v13-matrix-candidate-runtime.mjs";

const PROJECT_NAMES = Object.freeze(["msedge", "chrome"] as const);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_RECEIPT_BYTES = 16 * 1024 * 1024;

type ProjectName = (typeof PROJECT_NAMES)[number];
type ExactFilesystemIdentity = Readonly<{
  realPath: string;
  dev: bigint;
  ino: bigint;
  birthtimeNs: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}>;
type ReporterDirectoryLocks = Readonly<{
  bindingRoot: ExactFilesystemIdentity;
  outputRoot: ExactFilesystemIdentity;
  projectRoots: Readonly<Record<ProjectName, ExactFilesystemIdentity>>;
  projectEntryNames: Readonly<Record<ProjectName, readonly string[]>>;
}>;
type HeldRegularFile = Readonly<{
  filePath: string;
  handle: FileHandle;
  bytes: Buffer;
  identity: ExactFilesystemIdentity;
  size: bigint;
}>;

function publicationDirectoryLocks(locks: ReporterDirectoryLocks) {
  const exactIdentity = (identity: ExactFilesystemIdentity) => Object.freeze({
    realPath: identity.realPath,
    dev: identity.dev.toString(10),
    ino: identity.ino.toString(10),
    birthtimeNs: identity.birthtimeNs.toString(10)
  });
  return Object.freeze({
    bindingRoot: exactIdentity(locks.bindingRoot),
    outputRoot: exactIdentity(locks.outputRoot),
    projectRoots: Object.freeze({
      msedge: exactIdentity(locks.projectRoots.msedge),
      chrome: exactIdentity(locks.projectRoots.chrome)
    }),
    projectEntryNames: locks.projectEntryNames
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sortJsonValue(entry));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortJsonValue(value[key])])
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function comparablePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function sameExactIdentity(left: ExactFilesystemIdentity, right: ExactFilesystemIdentity): boolean {
  return comparablePath(left.realPath) === comparablePath(right.realPath)
    && left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function sameStableIdentity(left: ExactFilesystemIdentity, right: ExactFilesystemIdentity): boolean {
  return sameExactIdentity(left, right)
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryIdentity(directory: string, label: string): Promise<ExactFilesystemIdentity> {
  const [metadata, resolved] = await Promise.all([
    lstat(directory, { bigint: true }),
    realpath(directory)
  ]);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || metadata.ino === 0n
    || comparablePath(resolved) !== comparablePath(directory)
  ) {
    throw new Error(`${label} is not one exact non-link directory.`);
  }
  return Object.freeze({
    realPath: path.resolve(resolved),
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs
  });
}

async function captureReporterDirectoryLocks(
  bindingRoot: string,
  outputRoot: string
): Promise<ReporterDirectoryLocks> {
  return Object.freeze({
    bindingRoot: await captureDirectoryIdentity(bindingRoot, "Candidate binding root"),
    outputRoot: await captureDirectoryIdentity(outputRoot, "Candidate output root"),
    projectRoots: Object.freeze({
      msedge: await captureDirectoryIdentity(path.join(outputRoot, "msedge"), "msedge project root"),
      chrome: await captureDirectoryIdentity(path.join(outputRoot, "chrome"), "chrome project root")
    }),
    projectEntryNames: Object.freeze({
      msedge: Object.freeze((await readdir(path.join(outputRoot, "msedge"))).sort()),
      chrome: Object.freeze((await readdir(path.join(outputRoot, "chrome"))).sort())
    })
  });
}

async function assertReporterDirectoryLocksStable(
  bindingRoot: string,
  outputRoot: string,
  locks: ReporterDirectoryLocks
): Promise<void> {
  const current = await captureReporterDirectoryLocks(bindingRoot, outputRoot);
  if (
    !sameStableIdentity(current.bindingRoot, locks.bindingRoot)
    || !sameExactIdentity(current.outputRoot, locks.outputRoot)
    || PROJECT_NAMES.some((projectName) =>
      !sameStableIdentity(current.projectRoots[projectName], locks.projectRoots[projectName])
      || canonicalJson(current.projectEntryNames[projectName])
        !== canonicalJson(locks.projectEntryNames[projectName])
    )
  ) {
    throw new Error("Candidate reporter directory identity changed during summary collection.");
  }
}

async function openHeldRegularFile(filePath: string, label: string): Promise<HeldRegularFile> {
  const handle = await open(filePath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    const identity = Object.freeze({
      realPath: path.resolve(resolvedBefore),
      dev: handleBefore.dev,
      ino: handleBefore.ino,
      birthtimeNs: handleBefore.birthtimeNs,
      mtimeNs: handleBefore.mtimeNs,
      ctimeNs: handleBefore.ctimeNs
    });
    const pathIdentity = Object.freeze({
      realPath: path.resolve(resolvedBefore),
      dev: pathBefore.dev,
      ino: pathBefore.ino,
      birthtimeNs: pathBefore.birthtimeNs,
      mtimeNs: pathBefore.mtimeNs,
      ctimeNs: pathBefore.ctimeNs
    });
    if (
      !handleBefore.isFile()
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || handleBefore.nlink !== 1n
      || pathBefore.nlink !== 1n
      || handleBefore.size <= 0n
      || handleBefore.size > BigInt(MAX_RECEIPT_BYTES)
      || !sameStableIdentity(identity, pathIdentity)
      || comparablePath(resolvedBefore) !== comparablePath(filePath)
    ) {
      throw new Error(`${label} is not one bounded regular file.`);
    }
    const expectedSize = Number(handleBefore.size);
    const bytes = Buffer.alloc(expectedSize);
    let offset = 0;
    while (offset < expectedSize) {
      const { bytesRead } = await handle.read(bytes, offset, expectedSize - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const overflowProbe = Buffer.alloc(1);
    const { bytesRead: overflowBytesRead } = await handle.read(
      overflowProbe,
      0,
      1,
      expectedSize
    );
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    const handleAfterIdentity = Object.freeze({
      realPath: path.resolve(resolvedAfter),
      dev: handleAfter.dev,
      ino: handleAfter.ino,
      birthtimeNs: handleAfter.birthtimeNs,
      mtimeNs: handleAfter.mtimeNs,
      ctimeNs: handleAfter.ctimeNs
    });
    const pathAfterIdentity = Object.freeze({
      realPath: path.resolve(resolvedAfter),
      dev: pathAfter.dev,
      ino: pathAfter.ino,
      birthtimeNs: pathAfter.birthtimeNs,
      mtimeNs: pathAfter.mtimeNs,
      ctimeNs: pathAfter.ctimeNs
    });
    if (
      !sameStableIdentity(identity, handleAfterIdentity)
      || !sameStableIdentity(handleAfterIdentity, pathAfterIdentity)
      || handleAfter.size !== handleBefore.size
      || pathAfter.size !== handleBefore.size
      || handleAfter.nlink !== 1n
      || pathAfter.nlink !== 1n
      || pathAfter.isSymbolicLink()
      || offset !== expectedSize
      || overflowBytesRead !== 0
      || comparablePath(resolvedAfter) !== comparablePath(filePath)
    ) {
      throw new Error(`${label} changed while its held bytes were read.`);
    }
    return Object.freeze({ filePath, handle, bytes, identity, size: handleBefore.size });
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function assertHeldRegularFileStable(held: HeldRegularFile, label: string): Promise<void> {
  const [handleMetadata, pathMetadata, resolved] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.filePath, { bigint: true }),
    realpath(held.filePath)
  ]);
  const handleIdentity = Object.freeze({
    realPath: path.resolve(resolved),
    dev: handleMetadata.dev,
    ino: handleMetadata.ino,
    birthtimeNs: handleMetadata.birthtimeNs,
    mtimeNs: handleMetadata.mtimeNs,
    ctimeNs: handleMetadata.ctimeNs
  });
  const pathIdentity = Object.freeze({
    realPath: path.resolve(resolved),
    dev: pathMetadata.dev,
    ino: pathMetadata.ino,
    birthtimeNs: pathMetadata.birthtimeNs,
    mtimeNs: pathMetadata.mtimeNs,
    ctimeNs: pathMetadata.ctimeNs
  });
  const verificationBytes = Buffer.alloc(Number(held.size) + 1);
  let offset = 0;
  while (offset < verificationBytes.byteLength) {
    const { bytesRead } = await held.handle.read(
      verificationBytes,
      offset,
      verificationBytes.byteLength - offset,
      offset
    );
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.filePath, { bigint: true }),
    realpath(held.filePath)
  ]);
  const handleAfterIdentity = Object.freeze({
    realPath: path.resolve(resolvedAfter),
    dev: handleAfter.dev,
    ino: handleAfter.ino,
    birthtimeNs: handleAfter.birthtimeNs,
    mtimeNs: handleAfter.mtimeNs,
    ctimeNs: handleAfter.ctimeNs
  });
  const pathAfterIdentity = Object.freeze({
    realPath: path.resolve(resolvedAfter),
    dev: pathAfter.dev,
    ino: pathAfter.ino,
    birthtimeNs: pathAfter.birthtimeNs,
    mtimeNs: pathAfter.mtimeNs,
    ctimeNs: pathAfter.ctimeNs
  });
  if (
    !sameStableIdentity(held.identity, handleIdentity)
    || !sameStableIdentity(handleIdentity, pathIdentity)
    || !sameStableIdentity(handleIdentity, handleAfterIdentity)
    || !sameStableIdentity(handleAfterIdentity, pathAfterIdentity)
    || handleMetadata.size !== held.size
    || pathMetadata.size !== held.size
    || handleAfter.size !== held.size
    || pathAfter.size !== held.size
    || handleMetadata.nlink !== 1n
    || pathMetadata.nlink !== 1n
    || handleAfter.nlink !== 1n
    || pathAfter.nlink !== 1n
    || pathMetadata.isSymbolicLink()
    || pathAfter.isSymbolicLink()
    || offset !== Number(held.size)
    || !verificationBytes.subarray(0, offset).equals(held.bytes)
    || comparablePath(resolved) !== comparablePath(held.filePath)
    || comparablePath(resolvedAfter) !== comparablePath(held.filePath)
  ) {
    throw new Error(`${label} changed before candidate summary completion.`);
  }
}

async function closeHeldRegularFilesBestEffort(heldFiles: readonly HeldRegularFile[]): Promise<void> {
  await Promise.allSettled(heldFiles.map(async (held) => {
    try {
      await held.handle.close();
    } catch {
      // Closing cannot revoke or reclassify a terminally committed artifact.
    }
  }));
}

function writeStdoutBestEffort(value: string): void {
  const onError = (): void => undefined;
  try {
    process.stdout.on("error", onError);
    process.stdout.write(value, () => {
      try {
        process.stdout.removeListener("error", onError);
      } catch {
        // Diagnostic cleanup is also best effort.
      }
    });
  } catch {
    try {
      process.stdout.removeListener("error", onError);
    } catch {
      // A diagnostic stream failure cannot escape the committed branch.
    }
  }
}

async function writeBoundPendingSummary(
  bindingRoot: string,
  outputRoot: string,
  locks: ReporterDirectoryLocks,
  bytes: Buffer
): Promise<void> {
  await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, locks);
  const summaryPath = path.join(outputRoot, STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME);
  const handle = await open(summaryPath, "wx+");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(summaryPath, { bigint: true }),
      realpath(summaryPath)
    ]);
    const beforeIdentity = Object.freeze({
      realPath: path.resolve(resolvedBefore),
      dev: handleBefore.dev,
      ino: handleBefore.ino,
      birthtimeNs: handleBefore.birthtimeNs,
      mtimeNs: handleBefore.mtimeNs,
      ctimeNs: handleBefore.ctimeNs
    });
    const pathBeforeIdentity = Object.freeze({
      realPath: path.resolve(resolvedBefore),
      dev: pathBefore.dev,
      ino: pathBefore.ino,
      birthtimeNs: pathBefore.birthtimeNs,
      mtimeNs: pathBefore.mtimeNs,
      ctimeNs: pathBefore.ctimeNs
    });
    if (
      !handleBefore.isFile()
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || handleBefore.nlink !== 1n
      || pathBefore.nlink !== 1n
      || !sameStableIdentity(beforeIdentity, pathBeforeIdentity)
      || comparablePath(resolvedBefore) !== comparablePath(summaryPath)
    ) {
      throw new Error("Candidate summary is not bound to the newly opened regular file.");
    }
    await handle.writeFile(bytes);
    await handle.sync();
    const persisted = Buffer.alloc(bytes.byteLength + 1);
    let persistedOffset = 0;
    while (persistedOffset < persisted.byteLength) {
      const { bytesRead } = await handle.read(
        persisted,
        persistedOffset,
        persisted.byteLength - persistedOffset,
        persistedOffset
      );
      if (bytesRead === 0) break;
      persistedOffset += bytesRead;
    }
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(summaryPath, { bigint: true }),
      realpath(summaryPath)
    ]);
    const handleAfterIdentity = Object.freeze({
      realPath: path.resolve(resolvedAfter),
      dev: handleAfter.dev,
      ino: handleAfter.ino,
      birthtimeNs: handleAfter.birthtimeNs,
      mtimeNs: handleAfter.mtimeNs,
      ctimeNs: handleAfter.ctimeNs
    });
    const pathAfterIdentity = Object.freeze({
      realPath: path.resolve(resolvedAfter),
      dev: pathAfter.dev,
      ino: pathAfter.ino,
      birthtimeNs: pathAfter.birthtimeNs,
      mtimeNs: pathAfter.mtimeNs,
      ctimeNs: pathAfter.ctimeNs
    });
    if (
      !sameExactIdentity(beforeIdentity, handleAfterIdentity)
      || !sameStableIdentity(handleAfterIdentity, pathAfterIdentity)
      || handleAfter.size !== BigInt(bytes.byteLength)
      || pathAfter.size !== handleAfter.size
      || handleAfter.nlink !== 1n
      || pathAfter.nlink !== 1n
      || pathAfter.isSymbolicLink()
      || persistedOffset !== bytes.byteLength
      || !persisted.subarray(0, persistedOffset).equals(bytes)
      || comparablePath(resolvedAfter) !== comparablePath(summaryPath)
    ) {
      throw new Error("Candidate summary changed while it was written and read back.");
    }
    await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, locks);
  } finally {
    await handle.close();
  }
  await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, locks);
}

function receiptDigest(document: Record<string, unknown>): string {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

async function bindBrowserReceipt(
  outputRoot: string,
  projectName: ProjectName,
  runId: string,
  attemptMarker: Readonly<Record<string, unknown>>
) {
  const receiptPath = path.join(outputRoot, projectName, "browser-receipt.json");
  const held = await openHeldRegularFile(
    receiptPath,
    `${projectName} candidate browser receipt`
  );
  try {
    const document = JSON.parse(held.bytes.toString("utf8")) as unknown;
    if (
      !isRecord(document)
      || document.receiptType !== "storage_v13_browser_matrix_receipt_candidate_v2"
      || document.receiptId !== `${runId}-${projectName}`
      || document.projectName !== projectName
      || document.browserChannel !== projectName
      || canonicalJson(document.attemptMarker) !== canonicalJson(attemptMarker)
      || document.trustClass !== "untrusted_candidate"
      || document.status !== "not_admitted"
      || document.executionAdmission !== "closed_deferred_boundaries"
      || document.matrixComplete !== false
      || document.strictGatePassed !== false
      || !Array.isArray(document.operationObservations)
      || document.operationObservations.length !== 6
      || document.operationObservations.flatMap((operation) =>
        isRecord(operation) && Array.isArray(operation.captures) ? operation.captures : []
      ).length !== 16
      || !Array.isArray(document.deferredBoundaries)
      || document.deferredBoundaries.length !== 4
      || !SHA256_PATTERN.test(String(document.receiptDigest ?? ""))
      || document.receiptDigest !== receiptDigest(document)
      || canonicalJson(document.authority) !== canonicalJson(STORAGE_V13_MATRIX_AUTHORITY)
    ) {
      throw new Error(`${projectName} candidate browser receipt failed the closed summary check.`);
    }
    return Object.freeze({
      receipt: Object.freeze({
        path: `${projectName}/browser-receipt.json`,
        size: held.bytes.byteLength,
        sha256: sha256(held.bytes),
        receiptId: document.receiptId,
        receiptDigest: document.receiptDigest
      }),
      held
    });
  } catch (error) {
    await held.handle.close();
    throw error;
  }
}

export default class StorageV13MatrixCandidateReporter implements Reporter {
  private tests: TestCase[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.tests = suite.allTests();
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult["status"] }> {
    if (process.argv.includes("--list")) return { status: result.status };

    const outputRoot = process.env.HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT;
    const bindingRoot = process.env.HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT;
    const runId = process.env.HAKIMI_STORAGE_V13_MATRIX_RUN_ID;
    const attemptId = process.env.HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID;
    const errors: string[] = [];
    const heldReceipts: HeldRegularFile[] = [];
    let directoryLocks: ReporterDirectoryLocks | null = null;
    let rootPublicationSetValid = false;
    let candidateEnvironment: ReturnType<typeof parseStorageV13MatrixCandidateEnvironment> | null = null;
    let attemptMarker: Awaited<ReturnType<typeof loadStorageV13MatrixCandidateAttemptMarker>> | null = null;
    if (!outputRoot || !path.isAbsolute(outputRoot)) {
      errors.push("Candidate output root must be an explicit absolute path.");
    }
    if (!runId || !/^[a-z0-9][a-z0-9-]{7,127}$/u.test(runId)) {
      errors.push("Candidate run id is missing or invalid.");
    }
    if (!attemptId || !/^attempt-[a-f0-9]{64}$/u.test(attemptId)) {
      errors.push("Candidate attempt id is missing or invalid.");
    }
    if (
      !bindingRoot
      || !path.isAbsolute(bindingRoot)
      || !outputRoot
      || !runId
      || comparablePath(outputRoot) !== comparablePath(path.join(
        bindingRoot,
        "tmp",
        "storage-v13-matrix-candidate",
        runId
      ))
    ) {
      errors.push("Candidate output root must remain bound to tmp/storage-v13-matrix-candidate/<runId>.");
    }
    try {
      candidateEnvironment = parseStorageV13MatrixCandidateEnvironment(process.env);
      attemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(candidateEnvironment);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    if (
      bindingRoot
      && outputRoot
      && runId
      && path.isAbsolute(bindingRoot)
      && path.isAbsolute(outputRoot)
      && comparablePath(outputRoot) === comparablePath(path.join(
        bindingRoot,
        "tmp",
        "storage-v13-matrix-candidate",
        runId
      ))
    ) {
      try {
        directoryLocks = await captureReporterDirectoryLocks(bindingRoot, outputRoot);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const projects: Array<Readonly<Record<string, unknown>>> = [];
    for (const projectName of PROJECT_NAMES) {
      const projectTests = this.tests.filter(
        (candidate) => candidate.parent.project()?.name === projectName
      );
      const exactPass = projectTests.length === 1
        && projectTests[0]?.expectedStatus === "passed"
        && projectTests[0]?.outcome() === "expected"
        && projectTests[0]?.results.length === 1
        && projectTests[0]?.results[0]?.status === "passed";
      let receipt = null;
      if (!exactPass) {
        errors.push(`${projectName} must contain exactly one single-attempt passing test.`);
      } else if (outputRoot && path.isAbsolute(outputRoot) && runId) {
        try {
          if (!bindingRoot || !directoryLocks) {
            throw new Error("Candidate reporter directory locks are unavailable.");
          }
          await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, directoryLocks);
          if (!attemptMarker) throw new Error("Candidate attempt marker is unavailable.");
          const boundReceipt = await bindBrowserReceipt(
            outputRoot,
            projectName,
            runId,
            attemptMarker.binding
          );
          receipt = boundReceipt.receipt;
          heldReceipts.push(boundReceipt.held);
          await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, directoryLocks);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      projects.push(Object.freeze({
        projectName,
        discovered: projectTests.length,
        expectedStatus: projectTests[0]?.expectedStatus ?? null,
        outcome: projectTests[0]?.outcome() ?? null,
        attempts: projectTests[0]?.results.length ?? 0,
        resultStatuses: Object.freeze(
          projectTests.flatMap((candidate) => candidate.results.map((entry) => entry.status))
        ),
        receipt
      }));
    }
    const unexpectedProjectNames = [...new Set(this.tests
      .map((candidate) => candidate.parent.project()?.name ?? "unknown-project")
      .filter((projectName) => !PROJECT_NAMES.includes(projectName as ProjectName)))].sort();
    if (unexpectedProjectNames.length > 0) {
      errors.push(`Unexpected browser projects: ${unexpectedProjectNames.join(", ")}.`);
    }
    if (result.status !== "passed") errors.push(`Playwright full result was ${result.status}.`);

    if (outputRoot && path.isAbsolute(outputRoot) && bindingRoot && directoryLocks) {
      try {
        await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, directoryLocks);
        const rootEntries = (await readdir(outputRoot)).sort();
        if (canonicalJson(rootEntries) !== canonicalJson([
          ...PROJECT_NAMES,
          STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME
        ].sort())) {
          errors.push(
            "Candidate output root must contain only the two browser project directories and exact attempt marker before summary publication."
          );
        } else {
          rootPublicationSetValid = true;
        }
        await assertReporterDirectoryLocksStable(bindingRoot, outputRoot, directoryLocks);
      } catch (error) {
        rootPublicationSetValid = false;
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    try {
      await Promise.all(heldReceipts.map((held) =>
        assertHeldRegularFileStable(held, "Candidate browser receipt")
      ));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    const buildSummary = (): Record<string, unknown> => {
      const summary: Record<string, unknown> = {
        schemaVersion: 2,
        summaryType: "storage_v13_matrix_playwright_candidate_summary_v2",
        trustClass: "untrusted_candidate",
        status: "not_admitted",
        executionAdmission: "closed_deferred_boundaries",
        candidateCaptureComplete: errors.length === 0,
        matrixComplete: false,
        strictGatePassed: false,
        runId: runId ?? null,
        attemptMarker: attemptMarker ? { ...attemptMarker.binding } : null,
        expectedProjectNames: [...PROJECT_NAMES],
        fullResultStatus: result.status,
        unexpectedProjectNames,
        errors: [...errors],
        projects,
        authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
        completedAt: new Date().toISOString(),
        summaryDigest: "0".repeat(64)
      };
      summary.summaryDigest = sha256(canonicalJson({ ...summary, summaryDigest: undefined }));
      return summary;
    };

    let summary = buildSummary();
    let summaryBytes: Buffer | null = null;
    let pendingSummaryWritten = false;
    const summaryErrorCount = errors.length;
    if (
      outputRoot
      && path.isAbsolute(outputRoot)
      && bindingRoot
      && directoryLocks
      && candidateEnvironment
      && attemptMarker
      && rootPublicationSetValid
    ) {
      try {
        const preWriteAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(
          candidateEnvironment
        );
        assertStorageV13MatrixCandidateAttemptMarkerStable(
          attemptMarker,
          preWriteAttemptMarker
        );
        summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`, "utf8");
        await Promise.all(heldReceipts.map((held) =>
          assertHeldRegularFileStable(held, "Candidate browser receipt")
        ));
        await writeBoundPendingSummary(bindingRoot, outputRoot, directoryLocks, summaryBytes);
        pendingSummaryWritten = true;
        const postWriteAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(
          candidateEnvironment
        );
        assertStorageV13MatrixCandidateAttemptMarkerStable(
          attemptMarker,
          postWriteAttemptMarker
        );
        await Promise.all(heldReceipts.map((held) =>
          assertHeldRegularFileStable(held, "Candidate browser receipt")
        ));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        process.stderr.write(
          `Storage v13 candidate summary write failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }
    if (
      pendingSummaryWritten
      && summaryBytes
      && errors.length === summaryErrorCount
      && outputRoot
      && bindingRoot
      && directoryLocks
      && candidateEnvironment
      && attemptMarker
    ) {
      const committedLogLine = `HAKIMI_STORAGE_V13_MATRIX_RESULT ${JSON.stringify(summary)}\n`;
      const committedResult = Object.freeze({
        status: summary.candidateCaptureComplete === true ? result.status : "failed" as const
      });
      try {
        const prePublishAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(
          candidateEnvironment
        );
        assertStorageV13MatrixCandidateAttemptMarkerStable(
          attemptMarker,
          prePublishAttemptMarker
        );
        await Promise.all(heldReceipts.map((held) =>
          assertHeldRegularFileStable(held, "Candidate browser receipt")
        ));
        await publishStorageV13MatrixCandidateSummary({
          candidateEnvironment,
          expectedAttemptMarker: attemptMarker,
          expectedBytes: summaryBytes,
          directoryLocks: publicationDirectoryLocks(directoryLocks)
        });
        // After the terminal marker commits, only non-throwing cleanup, a
        // best-effort log, and the prebuilt result may run.
        await closeHeldRegularFilesBestEffort(heldReceipts);
        writeStdoutBestEffort(committedLogLine);
        return committedResult;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        process.stderr.write(
          `Storage v13 candidate terminal summary publication failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }
    // Receipt handles remain held through the terminal marker rename. Closing
    // them cannot revoke or reclassify an already committed publication.
    await closeHeldRegularFilesBestEffort(heldReceipts);
    summary = buildSummary();
    process.stdout.write(`HAKIMI_STORAGE_V13_MATRIX_RESULT ${JSON.stringify(summary)}\n`);
    return {
      status: "failed"
    };
  }
}
