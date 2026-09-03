import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  parseSwAbUpdateRuntimeClientCaptureJsonBytes,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
  verifySwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  compileSwAbUpdateRuntimeClientCaptureSchema,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
} from "./sw-ab-update-runtime-client-capture-schema.mjs";

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
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
    throw new Error(`SW_AB_RUNTIME_CAPTURE_PATH_OUTSIDE_ROOT: ${label} escapes its required root.`);
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

async function readStableRegularFile({ bindingRoot, filePath, label, maximumSize }) {
  const absolutePath = path.resolve(filePath);
  const relativePath = relativeWithin(bindingRoot, absolutePath, label);
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
      `SW_AB_RUNTIME_CAPTURE_FILE_INVALID: ${label} must be one bounded regular single-link file.`
    );
  }
  relativeWithin(bindingRoot, resolvedBefore, `${label} physical path`);
  const handle = await open(absolutePath, "r");
  try {
    const before = await handle.stat({ bigint: true });
    if (
      !sameIdentity(pathBefore, before)
      || !before.isFile()
      || before.isSymbolicLink()
      || before.nlink !== 1n
      || before.size <= 0n
      || before.size > BigInt(maximumSize)
    ) {
      throw new Error(
        `SW_AB_RUNTIME_CAPTURE_FILE_REBOUND: ${label} changed or exceeded its bound before its held read.`
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
      throw new Error(`SW_AB_RUNTIME_CAPTURE_FILE_CHANGED: ${label} changed during its held read.`);
    }
    relativeWithin(bindingRoot, resolvedAfter, `${label} terminal physical path`);
    return Object.freeze({
      bytes,
      binding: Object.freeze({
        path: relativePath,
        size: bytes.length,
        sha256: sha256(bytes)
      }),
      identity: identityProjection(after, resolvedAfter)
    });
  } finally {
    await handle.close();
  }
}

function endpointFingerprint(snapshot) {
  return Object.freeze({ binding: snapshot.binding, identity: snapshot.identity });
}

function assertDistinctPhysicalSnapshots(snapshots) {
  const realPaths = snapshots.map((snapshot) => snapshot.identity.realPath);
  const inodeKeys = snapshots.map((snapshot) =>
    `${snapshot.identity.dev}\0${snapshot.identity.ino}\0${snapshot.identity.birthtimeNs}`
  );
  if (new Set(realPaths).size !== snapshots.length || new Set(inodeKeys).size !== snapshots.length) {
    throw new Error(
      "SW_AB_RUNTIME_CAPTURE_PHYSICAL_ALIAS: input, policy, and Schema must be distinct physical files."
    );
  }
}

export async function loadVerifiedSwAbUpdateRuntimeClientCapture({
  cwd = process.cwd(),
  bindingRoot = cwd,
  inputPath
}) {
  const resolvedCwd = path.resolve(cwd);
  const resolvedRoot = path.resolve(bindingRoot);
  if (comparablePath(resolvedRoot) !== comparablePath(resolvedCwd)) {
    throw new Error(
      "SW_AB_RUNTIME_CAPTURE_BINDING_ROOT_MISMATCH: binding root must equal the verifier cwd."
    );
  }
  const inputAbsolute = path.resolve(inputPath);
  const policyAbsolute = path.resolve(
    resolvedRoot,
    ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH.split("/")
  );
  const schemaAbsolute = path.resolve(
    resolvedRoot,
    ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH.split("/")
  );
  const [inputSnapshot, policySnapshot, schemaSnapshot] = await Promise.all([
    readStableRegularFile({
      bindingRoot: resolvedRoot,
      filePath: inputAbsolute,
      label: "runtime capture evidence",
      maximumSize: MAX_CAPTURE_BYTES
    }),
    readStableRegularFile({
      bindingRoot: resolvedRoot,
      filePath: policyAbsolute,
      label: "runtime capture policy",
      maximumSize: MAX_SOURCE_BYTES
    }),
    readStableRegularFile({
      bindingRoot: resolvedRoot,
      filePath: schemaAbsolute,
      label: "runtime capture schema",
      maximumSize: MAX_SOURCE_BYTES
    })
  ]);
  assertDistinctPhysicalSnapshots([inputSnapshot, policySnapshot, schemaSnapshot]);
  if (
    policySnapshot.binding.path !== SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH
    || schemaSnapshot.binding.path !== SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
  ) {
    throw new Error(
      "SW_AB_RUNTIME_CAPTURE_SOURCE_PATH_INVALID: checked policy or Schema path drifted."
    );
  }
  const evidence = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
    inputSnapshot.bytes,
    "SW A-to-B runtime client capture evidence"
  );
  const policy = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
    policySnapshot.bytes,
    "SW A-to-B runtime client capture policy"
  );
  const schema = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
    schemaSnapshot.bytes,
    "SW A-to-B runtime client capture Schema"
  );
  const schemaValidator = compileSwAbUpdateRuntimeClientCaptureSchema(schema);
  const result = verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator });
  const sourceBindings = Object.freeze([
    Object.freeze({
      role: "runtime-client-capture-policy",
      ...policySnapshot.binding,
      canonicalSha256: sha256(canonicalJson(policy))
    }),
    Object.freeze({
      role: "runtime-client-capture-schema",
      ...schemaSnapshot.binding,
      canonicalSha256: sha256(canonicalJson(schema))
    })
  ]);
  return Object.freeze({
    result,
    inputBinding: inputSnapshot.binding,
    endpointFingerprint: Object.freeze({
      input: endpointFingerprint(inputSnapshot),
      projection: result.compositionProjection,
      sourceBindings
    }),
    sourceBindings
  });
}
