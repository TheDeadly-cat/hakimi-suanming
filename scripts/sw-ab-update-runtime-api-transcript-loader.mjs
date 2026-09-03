import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  compileSwAbUpdateRuntimeClientCaptureSchema
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript,
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  compileSwAbUpdateRuntimeApiTranscriptSchema
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";

const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_TUPLE_BYTES = 512 * 1024;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function relativeWithin(root, candidate, label) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    relative === ""
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_PATH_OUTSIDE_ROOT: ${label} escapes its required root.`
    );
  }
  return relative.replaceAll("\\", "/");
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function identityProjection(stat, resolvedPath) {
  return Object.freeze({
    realPath: comparablePath(resolvedPath),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
  });
}

async function readOpenedFileBounded(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function readStableRegularFile({
  bindingRoot,
  filePath,
  relativePath,
  label,
  maximumSize
}) {
  const absolutePath = path.resolve(filePath);
  const checkedRelative = relativeWithin(bindingRoot, absolutePath, label);
  if (relativePath && checkedRelative !== relativePath) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_PATH_BINDING_INVALID: ${label} path drifted.`
    );
  }
  const pathBefore = await lstat(absolutePath, { bigint: true });
  const resolvedBefore = await realpath(absolutePath);
  if (
    !pathBefore.isFile()
    || pathBefore.isSymbolicLink()
    || pathBefore.nlink !== 1n
    || pathBefore.size <= 0n
    || pathBefore.size > BigInt(maximumSize)
  ) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_FILE_INVALID: ${label} must be one bounded regular single-link file.`
    );
  }
  relativeWithin(bindingRoot, resolvedBefore, `${label} physical path`);
  const handle = await open(absolutePath, "r");
  try {
    const before = await handle.stat({ bigint: true });
    if (!sameIdentity(pathBefore, before)) {
      throw new Error(
        `SW_AB_RUNTIME_API_TRANSCRIPT_FILE_REBOUND: ${label} changed before held read.`
      );
    }
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(absolutePath, { bigint: true });
    const resolvedAfter = await realpath(absolutePath);
    if (
      !sameIdentity(before, after)
      || !sameIdentity(after, pathAfter)
      || !pathAfter.isFile()
      || pathAfter.isSymbolicLink()
      || after.nlink !== 1n
      || pathAfter.nlink !== 1n
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || after.size !== pathAfter.size
      || after.mtimeNs !== pathAfter.mtimeNs
      || after.ctimeNs !== pathAfter.ctimeNs
      || bytes.length !== Number(before.size)
      || comparablePath(resolvedBefore) !== comparablePath(resolvedAfter)
    ) {
      throw new Error(
        `SW_AB_RUNTIME_API_TRANSCRIPT_FILE_CHANGED: ${label} changed during held read.`
      );
    }
    relativeWithin(bindingRoot, resolvedAfter, `${label} terminal physical path`);
    return Object.freeze({
      bytes,
      binding: Object.freeze({
        path: checkedRelative,
        size: bytes.length,
        sha256: sha256(bytes)
      }),
      identity: identityProjection(after, resolvedAfter)
    });
  } finally {
    await handle.close();
  }
}

async function assertExactBundleFileSet(bundleRoot) {
  const entries = await readdir(bundleRoot, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expected = [
    ...SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE
  ].sort();
  if (
    canonicalJson(names) !== canonicalJson(expected)
    || entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
  ) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_FILE_SET_INVALID: bundle must contain exactly eight tuple files and one manifest."
    );
  }
}

function assertDistinctPhysicalSnapshots(snapshots) {
  const paths = snapshots.map((snapshot) => snapshot.identity.realPath);
  const inodeKeys = snapshots.map((snapshot) =>
    `${snapshot.identity.dev}\0${snapshot.identity.ino}\0${snapshot.identity.birthtimeNs}`
  );
  if (new Set(paths).size !== snapshots.length || new Set(inodeKeys).size !== snapshots.length) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_PHYSICAL_ALIAS: bundle and source files must be physically distinct."
    );
  }
}

function sourceBinding(snapshot, requirement, value) {
  return Object.freeze({
    role: requirement.role,
    path: requirement.path,
    size: snapshot.bytes.length,
    rawSha256: sha256(snapshot.bytes),
    canonicalSha256: sha256(canonicalJson(value))
  });
}

function sameSnapshot(left, right) {
  return canonicalJson(left.binding) === canonicalJson(right.binding)
    && canonicalJson(left.identity) === canonicalJson(right.identity);
}

export async function loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle({
  cwd = process.cwd(),
  bindingRoot = cwd,
  bundleDirectory
}) {
  const resolvedCwd = path.resolve(cwd);
  const resolvedRoot = path.resolve(bindingRoot);
  if (comparablePath(resolvedRoot) !== comparablePath(resolvedCwd)) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_BINDING_ROOT_MISMATCH: binding root must equal verifier cwd."
    );
  }
  const bundleRoot = path.resolve(bundleDirectory);
  relativeWithin(resolvedRoot, bundleRoot, "bundle directory");
  const bundleStat = await lstat(bundleRoot, { bigint: true });
  const bundlePhysical = await realpath(bundleRoot);
  if (!bundleStat.isDirectory() || bundleStat.isSymbolicLink()) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_ROOT_UNSAFE: bundle root must be a real directory."
    );
  }
  relativeWithin(resolvedRoot, bundlePhysical, "bundle physical directory");
  await assertExactBundleFileSet(bundleRoot);
  const bundleFileNames = [
    ...SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE
  ];
  const initialBundleSnapshots = await Promise.all(bundleFileNames.map((fileName, index) =>
    readStableRegularFile({
      bindingRoot: bundleRoot,
      filePath: path.join(bundleRoot, fileName),
      relativePath: fileName,
      label: fileName,
      maximumSize: index < 8 ? MAX_TUPLE_BYTES : MAX_MANIFEST_BYTES
    })
  ));
  const initialSourceSnapshots = await Promise.all(
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS.map((requirement) =>
      readStableRegularFile({
        bindingRoot: resolvedRoot,
        filePath: path.resolve(resolvedRoot, ...requirement.path.split("/")),
        relativePath: requirement.path,
        label: requirement.role,
        maximumSize: MAX_SOURCE_BYTES
      })
    )
  );
  assertDistinctPhysicalSnapshots([...initialBundleSnapshots, ...initialSourceSnapshots]);
  const tupleRecords = initialBundleSnapshots.slice(0, 8).map((snapshot, index) =>
    parseSwAbUpdateRuntimeApiTranscriptJsonBytes(snapshot.bytes, `tuple ${index + 1}`)
  );
  const manifestSnapshot = initialBundleSnapshots[8];
  const manifest = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
    manifestSnapshot.bytes,
    "bundle manifest"
  );
  const sourceValues = initialSourceSnapshots.map((snapshot, index) =>
    parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
      snapshot.bytes,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS[index].role
    )
  );
  const checkedSourceBindings = initialSourceSnapshots.map((snapshot, index) =>
    sourceBinding(
      snapshot,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS[index],
      sourceValues[index]
    )
  );
  const policy = sourceValues[0];
  const schemaValidator = compileSwAbUpdateRuntimeApiTranscriptSchema(sourceValues[1]);
  const runtimePolicy = sourceValues[2];
  const runtimeSchemaValidator = compileSwAbUpdateRuntimeClientCaptureSchema(sourceValues[3]);
  const tupleInputs = tupleRecords.map((record, index) => ({
    record,
    binding: initialBundleSnapshots[index].binding
  }));
  const derived = deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript({
    manifest,
    tupleInputs,
    checkedSourceBindings,
    policy,
    schemaValidator,
    runtimePolicy,
    runtimeSchemaValidator
  });
  const manifestMtime = BigInt(manifestSnapshot.identity.mtimeNs);
  if (
    initialBundleSnapshots.slice(0, 8)
      .some((snapshot) => BigInt(snapshot.identity.mtimeNs) > manifestMtime)
  ) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_MANIFEST_ORDER_INVALID: manifest was not published after the tuple files."
    );
  }
  await assertExactBundleFileSet(bundleRoot);
  const [terminalBundleSnapshots, terminalSourceSnapshots] = await Promise.all([
    Promise.all(bundleFileNames.map((fileName, index) =>
      readStableRegularFile({
        bindingRoot: bundleRoot,
        filePath: path.join(bundleRoot, fileName),
        relativePath: fileName,
        label: `terminal ${fileName}`,
        maximumSize: index < 8 ? MAX_TUPLE_BYTES : MAX_MANIFEST_BYTES
      })
    )),
    Promise.all(SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS.map((requirement) =>
      readStableRegularFile({
        bindingRoot: resolvedRoot,
        filePath: path.resolve(resolvedRoot, ...requirement.path.split("/")),
        relativePath: requirement.path,
        label: `terminal ${requirement.role}`,
        maximumSize: MAX_SOURCE_BYTES
      })
    ))
  ]);
  await assertExactBundleFileSet(bundleRoot);
  const initialAll = [...initialBundleSnapshots, ...initialSourceSnapshots];
  const terminalAll = [...terminalBundleSnapshots, ...terminalSourceSnapshots];
  if (initialAll.some((snapshot, index) => !sameSnapshot(snapshot, terminalAll[index]))) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_TERMINAL_FILE_SET_CHANGED: bundle or source changed between endpoint snapshots."
    );
  }
  assertDistinctPhysicalSnapshots(terminalAll);
  return Object.freeze({
    result: Object.freeze({
      ...derived,
      terminalEndpointSnapshotsMatched: true
    }),
    manifestBinding: manifestSnapshot.binding,
    tupleBindings: Object.freeze(initialBundleSnapshots.slice(0, 8).map((entry) => entry.binding)),
    sourceBindings: Object.freeze(checkedSourceBindings),
    endpointFingerprint: Object.freeze({
      manifest: manifestSnapshot.identity,
      tuples: Object.freeze(initialBundleSnapshots.slice(0, 8).map((entry) => entry.identity)),
      sources: Object.freeze(initialSourceSnapshots.map((entry) => entry.identity))
    })
  });
}
