import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  buildSwAbRuntimeCollectorIssuanceResult,
  failSwAbRuntimeCollectorIssuance,
  parseSwAbRuntimeCollectorIssuanceJsonBytes,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_FILES,
  validateSwAbRuntimeCollectorAttemptMarker,
  validateSwAbRuntimeCollectorIssuancePolicy,
  validateSwAbRuntimeCollectorIssuanceReceipt
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  compileSwAbUpdateRuntimeCollectorIssuanceSchema
} from "./sw-ab-update-runtime-collector-issuance-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";

const MAX_MARKER_BYTES = 2 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const MAX_TUPLE_BYTES = 512 * 1024;
const MAX_TRANSCRIPT_MANIFEST_BYTES = 1024 * 1024;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function relativeWithin(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    failSwAbRuntimeCollectorIssuance(
      "PATH_OUTSIDE_ROOT",
      "filesystem",
      `${label} escapes its required root.`
    );
  }
  return relative.split(path.sep).join("/");
}

function requireAbsoluteCanonicalPath(value, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.trim() !== value
    || !path.isAbsolute(value)
    || path.resolve(value) !== value
    || value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")
  ) {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "input",
      `${label} must be one explicit absolute canonical path.`
    );
  }
  return value;
}

async function assertRealDirectoryChain(bindingRoot, candidate, label) {
  const relative = relativeWithin(bindingRoot, candidate, label, { allowEqual: true });
  let current = bindingRoot;
  for (const segment of relative.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (cause) {
      failSwAbRuntimeCollectorIssuance(
        "PATH_ALIAS",
        "filesystem",
        `${label} cannot be inspected.`,
        cause
      );
    }
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      failSwAbRuntimeCollectorIssuance(
        "PATH_ALIAS",
        "filesystem",
        `${label} must traverse only real directories.`
      );
    }
  }
  const physical = await realpath(candidate);
  if (comparablePath(physical) !== comparablePath(candidate)) {
    failSwAbRuntimeCollectorIssuance(
      "PATH_ALIAS",
      "filesystem",
      `${label} must not resolve through an alias.`
    );
  }
}

function directoryIdentity(metadata, physical) {
  return Object.freeze({
    realPath: comparablePath(physical),
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    birthtimeNs: String(metadata.birthtimeNs),
    mtimeNs: String(metadata.mtimeNs),
    ctimeNs: String(metadata.ctimeNs)
  });
}

async function captureDirectoryIdentity(directoryPath, label) {
  let metadata;
  let physical;
  try {
    [metadata, physical] = await Promise.all([
      lstat(directoryPath, { bigint: true }),
      realpath(directoryPath)
    ]);
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "ROOT_REBOUND",
      "filesystem",
      `${label} cannot be locked.`,
      cause
    );
  }
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || metadata.ino === 0n
    || comparablePath(physical) !== comparablePath(directoryPath)
  ) {
    failSwAbRuntimeCollectorIssuance(
      "PATH_ALIAS",
      "filesystem",
      `${label} must be one real unaliased directory.`
    );
  }
  return directoryIdentity(metadata, physical);
}

async function assertDirectoryIdentity(directoryPath, expected, label) {
  const actual = await captureDirectoryIdentity(directoryPath, label);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    failSwAbRuntimeCollectorIssuance(
      "ROOT_REBOUND",
      "filesystem",
      `${label} changed during verification.`
    );
  }
}

async function assertExactRootSet(runRoot) {
  const entries = await readdir(runRoot, { withFileTypes: true });
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const names = [...byName.keys()].sort();
  const completed = [
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
  ].sort();
  const incomplete = [
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
  ].sort();
  const markerOnly = [SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE];
  if (
    ((canonicalJson(names) === canonicalJson(incomplete)
      && byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY)?.isDirectory())
      || canonicalJson(names) === canonicalJson(markerOnly))
    && byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE)?.isFile()
  ) {
    failSwAbRuntimeCollectorIssuance(
      "CAPSULE_NOT_ISSUED",
      "filesystem",
      "Collector run root is an incomplete discard-required attempt without a terminal receipt."
    );
  }
  if (
    canonicalJson(names) !== canonicalJson(completed)
    || !byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE)?.isFile()
    || byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE)?.isSymbolicLink()
    || !byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY)?.isDirectory()
    || byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY)?.isSymbolicLink()
    || !byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE)?.isFile()
    || byName.get(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE)?.isSymbolicLink()
  ) {
    failSwAbRuntimeCollectorIssuance(
      "FILE_SET_INVALID",
      "filesystem",
      "Collector run root must contain exactly marker, transcript directory, and terminal receipt."
    );
  }
}

async function assertExactTranscriptSet(transcriptRoot) {
  const entries = await readdir(transcriptRoot, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  if (
    canonicalJson(names) !== canonicalJson([...SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_FILES].sort())
    || entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
  ) {
    failSwAbRuntimeCollectorIssuance(
      "FILE_SET_INVALID",
      "filesystem",
      "Transcript directory must contain the exact eight tuples and one manifest."
    );
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function fileIdentity(metadata, physical) {
  return Object.freeze({
    realPath: comparablePath(physical),
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    birthtimeNs: String(metadata.birthtimeNs),
    size: String(metadata.size),
    mtimeNs: String(metadata.mtimeNs),
    ctimeNs: String(metadata.ctimeNs),
    nlink: String(metadata.nlink)
  });
}

async function readOpenedAtZero(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function holdStableRegularFile({
  bindingRoot,
  filePath,
  relativePath,
  label,
  maximumSize
}) {
  const checkedPath = path.resolve(filePath);
  const actualRelative = relativeWithin(bindingRoot, checkedPath, label);
  if (actualRelative !== relativePath) {
    failSwAbRuntimeCollectorIssuance(
      "PATH_OUTSIDE_ROOT",
      "filesystem",
      `${label} path binding drifted.`
    );
  }
  let pathBefore;
  let physicalBefore;
  let handle;
  try {
    [pathBefore, physicalBefore] = await Promise.all([
      lstat(checkedPath, { bigint: true }),
      realpath(checkedPath)
    ]);
    if (
      !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.ino === 0n
      || pathBefore.nlink !== 1n
      || pathBefore.size <= 0n
      || pathBefore.size > BigInt(maximumSize)
      || comparablePath(physicalBefore) !== comparablePath(checkedPath)
    ) {
      failSwAbRuntimeCollectorIssuance(
        "FILE_INVALID",
        "filesystem",
        `${label} must be one bounded regular single-link unaliased file.`
      );
    }
    handle = await open(checkedPath, "r");
    const before = await handle.stat({ bigint: true });
    if (!sameFileIdentity(pathBefore, before)) {
      failSwAbRuntimeCollectorIssuance(
        "FILE_REBOUND",
        "filesystem",
        `${label} changed before the held read.`
      );
    }
    const bytes = await readOpenedAtZero(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(checkedPath, { bigint: true });
    const physicalAfter = await realpath(checkedPath);
    if (
      !sameFileIdentity(before, after)
      || !sameFileIdentity(after, pathAfter)
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || after.size !== pathAfter.size
      || after.mtimeNs !== pathAfter.mtimeNs
      || after.ctimeNs !== pathAfter.ctimeNs
      || after.nlink !== 1n
      || pathAfter.nlink !== 1n
      || bytes.length !== Number(after.size)
      || comparablePath(physicalAfter) !== comparablePath(checkedPath)
    ) {
      failSwAbRuntimeCollectorIssuance(
        "FILE_REBOUND",
        "filesystem",
        `${label} changed during the held read.`
      );
    }
    return {
      label,
      path: checkedPath,
      handle,
      bytes,
      identity: fileIdentity(after, physicalAfter),
      binding: Object.freeze({ path: relativePath, size: bytes.length, sha256: sha256(bytes) })
    };
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    throw error;
  }
}

function assertGloballyDistinctFiles(heldFiles) {
  const paths = heldFiles.map((held) => held.identity.realPath);
  const inodeKeys = heldFiles.map((held) =>
    `${held.identity.dev}\0${held.identity.ino}\0${held.identity.birthtimeNs}`
  );
  if (new Set(paths).size !== heldFiles.length || new Set(inodeKeys).size !== heldFiles.length) {
    failSwAbRuntimeCollectorIssuance(
      "PHYSICAL_ALIAS",
      "filesystem",
      "Marker, receipt, transcript, and source files must all have distinct physical identities."
    );
  }
}

async function assertHeldFileStable(held) {
  const bytes = await readOpenedAtZero(held.handle, Number(held.identity.size));
  const [after, pathAfter, physicalAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.path, { bigint: true }),
    realpath(held.path)
  ]);
  if (
    fileIdentity(after, physicalAfter).realPath !== held.identity.realPath
    || String(after.dev) !== held.identity.dev
    || String(after.ino) !== held.identity.ino
    || String(after.birthtimeNs) !== held.identity.birthtimeNs
    || String(after.size) !== held.identity.size
    || String(after.mtimeNs) !== held.identity.mtimeNs
    || String(after.ctimeNs) !== held.identity.ctimeNs
    || after.nlink !== 1n
    || !pathAfter.isFile()
    || pathAfter.isSymbolicLink()
    || pathAfter.nlink !== 1n
    || String(pathAfter.dev) !== held.identity.dev
    || String(pathAfter.ino) !== held.identity.ino
    || String(pathAfter.birthtimeNs) !== held.identity.birthtimeNs
    || comparablePath(physicalAfter) !== held.identity.realPath
    || bytes.length !== held.bytes.length
    || !bytes.equals(held.bytes)
  ) {
    failSwAbRuntimeCollectorIssuance(
      "TERMINAL_SET_CHANGED",
      "filesystem",
      `${held.label} changed inside the overlapping held-file verification window.`
    );
  }
}

function checkedSourceBinding(held, requirement, value) {
  return Object.freeze({
    role: requirement.role,
    path: requirement.path,
    size: held.bytes.length,
    rawSha256: sha256(held.bytes),
    canonicalSha256: sha256(canonicalJson(value))
  });
}

function transcriptBundleBinding({ transcriptResult, manifest, manifestHeld }) {
  return Object.freeze({
    relativeDirectory: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    manifestPath: `${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${manifestHeld.binding.path}`,
    manifestSize: manifestHeld.binding.size,
    manifestSha256: manifestHeld.binding.sha256,
    bundleId: transcriptResult.bundleId,
    bundleDigest: transcriptResult.bundleDigest,
    derivedEvidenceDigest: transcriptResult.derivedEvidenceDigest,
    sourceSetDigest: manifest.sourceSetDigest,
    tupleFileCount: 8,
    tupleBindings: structuredClone(manifest.tupleBindings)
  });
}

export async function loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
  cwd = process.cwd(),
  bindingRoot = cwd,
  runRoot,
  onHeldEpochCheckpoint
}) {
  if (onHeldEpochCheckpoint !== undefined && typeof onHeldEpochCheckpoint !== "function") {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "input",
      "onHeldEpochCheckpoint must be a function when supplied."
    );
  }
  const resolvedCwd = requireAbsoluteCanonicalPath(path.resolve(cwd), "cwd");
  const resolvedBindingRoot = requireAbsoluteCanonicalPath(path.resolve(bindingRoot), "bindingRoot");
  const resolvedRunRoot = requireAbsoluteCanonicalPath(runRoot, "runRoot");
  if (comparablePath(resolvedCwd) !== comparablePath(resolvedBindingRoot)) {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "input",
      "bindingRoot must exactly equal cwd."
    );
  }
  const runRelative = relativeWithin(resolvedBindingRoot, resolvedRunRoot, "runRoot");
  if (runRelative.split("/")[0] !== "tmp") {
    failSwAbRuntimeCollectorIssuance(
      "PATH_OUTSIDE_ROOT",
      "input",
      "Collector issuance candidates must remain under the workspace tmp root."
    );
  }
  const transcriptRoot = path.join(
    resolvedRunRoot,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
  );
  await assertRealDirectoryChain(resolvedBindingRoot, resolvedRunRoot, "runRoot");
  await assertExactRootSet(resolvedRunRoot);
  await assertRealDirectoryChain(resolvedBindingRoot, transcriptRoot, "transcriptRoot");
  await assertExactTranscriptSet(transcriptRoot);
  const [bindingLock, runLock, transcriptLock] = await Promise.all([
    captureDirectoryIdentity(resolvedBindingRoot, "bindingRoot"),
    captureDirectoryIdentity(resolvedRunRoot, "runRoot"),
    captureDirectoryIdentity(transcriptRoot, "transcriptRoot")
  ]);
  if (bindingLock.realPath !== comparablePath(await realpath(resolvedCwd))) {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "input",
      "cwd and bindingRoot do not share one physical identity."
    );
  }

  const heldFiles = [];
  try {
    const markerHeld = await holdStableRegularFile({
      bindingRoot: resolvedRunRoot,
      filePath: path.join(resolvedRunRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE),
      relativePath: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
      label: "attempt marker",
      maximumSize: MAX_MARKER_BYTES
    });
    heldFiles.push(markerHeld);
    const tupleHeld = [];
    for (let index = 0; index < SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_FILES.length; index += 1) {
      const fileName = SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_FILES[index];
      const held = await holdStableRegularFile({
        bindingRoot: transcriptRoot,
        filePath: path.join(transcriptRoot, fileName),
        relativePath: fileName,
        label: `transcript ${fileName}`,
        maximumSize: index < 8 ? MAX_TUPLE_BYTES : MAX_TRANSCRIPT_MANIFEST_BYTES
      });
      tupleHeld.push(held);
      heldFiles.push(held);
    }
    const receiptHeld = await holdStableRegularFile({
      bindingRoot: resolvedRunRoot,
      filePath: path.join(resolvedRunRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE),
      relativePath: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
      label: "terminal collector receipt",
      maximumSize: MAX_RECEIPT_BYTES
    });
    heldFiles.push(receiptHeld);
    const sourceHeld = [];
    for (const requirement of SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS) {
      const held = await holdStableRegularFile({
        bindingRoot: resolvedBindingRoot,
        filePath: path.join(resolvedBindingRoot, ...requirement.path.split("/")),
        relativePath: requirement.path,
        label: requirement.role,
        maximumSize: MAX_SOURCE_BYTES
      });
      sourceHeld.push(held);
      heldFiles.push(held);
    }
    assertGloballyDistinctFiles(heldFiles);

    const sourceValues = sourceHeld.map((held, index) =>
      parseSwAbRuntimeCollectorIssuanceJsonBytes(
        held.bytes,
        SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS[index].role
      )
    );
    const checkedSourceBindings = sourceHeld.map((held, index) =>
      checkedSourceBinding(
        held,
        SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS[index],
        sourceValues[index]
      )
    );
    const policy = validateSwAbRuntimeCollectorIssuancePolicy(sourceValues[0]);
    let schemaValidator;
    try {
      schemaValidator = compileSwAbUpdateRuntimeCollectorIssuanceSchema(sourceValues[1]);
    } catch (cause) {
      failSwAbRuntimeCollectorIssuance(
        "SCHEMA_INVALID",
        "source",
        "Checked collector issuance Schema is invalid.",
        cause
      );
    }
    const marker = parseSwAbRuntimeCollectorIssuanceJsonBytes(markerHeld.bytes, "attempt marker");
    validateSwAbRuntimeCollectorAttemptMarker({
      marker,
      policy,
      schemaValidator,
      checkedSourceBindings
    });
    const tupleRecords = tupleHeld.slice(0, 8).map((held, index) =>
      parseSwAbRuntimeCollectorIssuanceJsonBytes(held.bytes, `transcript tuple ${index + 1}`)
    );
    const manifestHeld = tupleHeld[8];
    const manifest = parseSwAbRuntimeCollectorIssuanceJsonBytes(
      manifestHeld.bytes,
      "transcript manifest"
    );
    let transcriptLoaded;
    try {
      transcriptLoaded = await loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle({
        cwd: resolvedCwd,
        bindingRoot: resolvedBindingRoot,
        bundleDirectory: transcriptRoot
      });
    } catch (cause) {
      failSwAbRuntimeCollectorIssuance(
        "TRANSCRIPT_INVALID",
        "transcript",
        "Nested decoded API transcript bundle failed its independent verifier.",
        cause
      );
    }
    if (
      canonicalJson(transcriptLoaded.manifestBinding) !== canonicalJson(manifestHeld.binding)
      || canonicalJson(transcriptLoaded.tupleBindings)
        !== canonicalJson(tupleHeld.slice(0, 8).map((held) => held.binding))
      || canonicalJson(transcriptLoaded.sourceBindings)
        !== canonicalJson(checkedSourceBindings.slice(2))
      || transcriptLoaded.result.bundleId !== manifest.bundleId
      || transcriptLoaded.result.bundleDigest !== manifest.bundleDigest
      || transcriptLoaded.result.tupleCount !== 8
      || transcriptLoaded.result.sourceBindingCount !== 4
    ) {
      failSwAbRuntimeCollectorIssuance(
        "TRANSCRIPT_BINDING_MISMATCH",
        "transcript",
        "Nested transcript verifier result drifted from the files held by the outer verifier."
      );
    }
    const bundleBinding = transcriptBundleBinding({
      transcriptResult: transcriptLoaded.result,
      manifest,
      manifestHeld
    });
    const receipt = parseSwAbRuntimeCollectorIssuanceJsonBytes(
      receiptHeld.bytes,
      "collector issuance receipt"
    );
    validateSwAbRuntimeCollectorIssuanceReceipt({
      receipt,
      marker,
      markerBinding: markerHeld.binding,
      policy,
      schemaValidator,
      checkedSourceBindings,
      transcript: {
        bundleBinding,
        tupleBindings: tupleHeld.slice(0, 8).map((held) => held.binding),
        tupleRecords
      }
    });

    if (onHeldEpochCheckpoint) {
      await onHeldEpochCheckpoint(Object.freeze({
        phase: "after_initial_validation_before_terminal_reread",
        runRoot: resolvedRunRoot,
        markerBinding: markerHeld.binding,
        receiptBinding: receiptHeld.binding,
        transcriptBundleDigest: transcriptLoaded.result.bundleDigest
      }));
    }
    for (const held of heldFiles) await assertHeldFileStable(held);
    await Promise.all([
      assertExactRootSet(resolvedRunRoot),
      assertExactTranscriptSet(transcriptRoot),
      assertDirectoryIdentity(resolvedBindingRoot, bindingLock, "bindingRoot"),
      assertDirectoryIdentity(resolvedRunRoot, runLock, "runRoot"),
      assertDirectoryIdentity(transcriptRoot, transcriptLock, "transcriptRoot")
    ]);
    return Object.freeze({
      result: buildSwAbRuntimeCollectorIssuanceResult({
        receipt,
        transcriptResult: transcriptLoaded.result,
        terminalEndpointSnapshotsMatched: true
      }),
      markerBinding: markerHeld.binding,
      receiptBinding: receiptHeld.binding,
      transcriptBundleBinding: bundleBinding,
      sourceBindings: Object.freeze(checkedSourceBindings),
      endpointFingerprint: Object.freeze({
        marker: markerHeld.identity,
        receipt: receiptHeld.identity,
        transcript: Object.freeze(tupleHeld.map((held) => held.identity)),
        sources: Object.freeze(sourceHeld.map((held) => held.identity))
      })
    });
  } finally {
    for (const held of heldFiles.reverse()) await held.handle.close().catch(() => undefined);
  }
}

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_LOADER_SOURCE_PATHS = Object.freeze({
  policy: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH,
  schema: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH
});
