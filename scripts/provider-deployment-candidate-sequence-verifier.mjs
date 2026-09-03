import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadVerifiedProviderDeploymentCandidateSequence,
  parseProviderDeploymentCandidateSequenceInput,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
} from "./provider-deployment-candidate-sequence-loader.mjs";
import { parseProviderDeploymentCandidateLoaderJsonBytes } from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS = Object.freeze({
  ...PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS,
  sequenceOutputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_OUTPUT_ROOT",
  sequencePath: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_FILE"
});

export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME = "output-discard-required.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_DOCUMENT = Object.freeze({
  schemaVersion: 1,
  recordType: "provider_deployment_candidate_sequence_discard_sentinel_v1",
  publicationState: "pending_independent_verification",
  sequenceCandidateWritten: false,
  outputDiscardRequired: true,
  admissionStatus: "not_admitted"
});

const MAX_SEQUENCE_BYTES = 16 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RECEIPT_FILE_NAME = "provider-deployment-candidate-receipt.json";
const TERMINAL_COMMIT_FILE_NAME = "provider-deployment-candidate-receipt-commit.sha256";

export function providerDeploymentCandidateSequenceDiscardSentinelBytes() {
  return Buffer.from(`${JSON.stringify(PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_DOCUMENT, null, 2)}\n`, "utf8");
}

function fail(code, message, cause) {
  throw new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function requireAbsoluteCanonicalPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || !path.isAbsolute(value)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", `${label} must be an explicit absolute path.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", `${label} must use exact resolved filesystem spelling.`);
  }
  return resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", `${key} must be explicit and free of surrounding whitespace.`);
  }
  return value;
}

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", `${label} must be a strict descendant of its root.`);
  return relative.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requireDisjoint(left, right, label) {
  if (pathsOverlap(left, right) || pathsOverlap(right, left)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_ROOT_OVERLAP", `${label} must be disjoint in both directions.`);
  }
}

function requirePrivateTmpRoot(bindingRoot, outputRoot) {
  const relative = relativeBoundPath(bindingRoot, outputRoot, "Sequence output root");
  if (relative.split("/")[0] !== "tmp") {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_OUTPUT_SCOPE_INVALID",
      "Persisted sequence candidate must remain under the workspace tmp/ private evidence root."
    );
  }
}

export function parseProviderDeploymentCandidateSequenceVerifierInput(input) {
  const keys = [
    "bindingRoot", "deployOutputRoot", "deployReceiptPath", "restoreOutputRoot",
    "restoreReceiptPath", "sequenceOutputRoot", "sequencePath"
  ];
  if (!exactKeys(input, keys)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", "Verifier input must have the exact seven path fields.");
  }
  const sequenceInput = parseProviderDeploymentCandidateSequenceInput({
    bindingRoot: input.bindingRoot,
    deployOutputRoot: input.deployOutputRoot,
    deployReceiptPath: input.deployReceiptPath,
    restoreOutputRoot: input.restoreOutputRoot,
    restoreReceiptPath: input.restoreReceiptPath
  });
  const sequenceOutputRoot = requireAbsoluteCanonicalPath(input.sequenceOutputRoot, "Sequence output root");
  const sequencePath = requireAbsoluteCanonicalPath(input.sequencePath, "Sequence file");
  requirePrivateTmpRoot(sequenceInput.bindingRoot, sequenceOutputRoot);
  relativeBoundPath(sequenceOutputRoot, sequencePath, "Sequence file");
  if (comparablePath(sequencePath) !== comparablePath(path.join(
    sequenceOutputRoot,
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
  ))) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PATH_INVALID", "Sequence path must use the fixed candidate filename.");
  requireDisjoint(sequenceOutputRoot, sequenceInput.deployOutputRoot, "Sequence and deploy output roots");
  requireDisjoint(sequenceOutputRoot, sequenceInput.restoreOutputRoot, "Sequence and restore output roots");
  return Object.freeze({ ...sequenceInput, sequenceOutputRoot, sequencePath });
}

export function parseProviderDeploymentCandidateSequenceVerifierEnvironment(environment = process.env) {
  if (!isRecord(environment)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", "Verifier environment must be an object.");
  }
  return parseProviderDeploymentCandidateSequenceVerifierInput({
    bindingRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.bindingRoot),
    deployOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.deployOutputRoot),
    deployReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.deployReceiptPath),
    restoreOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.restoreOutputRoot),
    restoreReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.restoreReceiptPath),
    sequenceOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.sequenceOutputRoot),
    sequencePath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_ENVIRONMENT_KEYS.sequencePath)
  });
}

async function assertNoAliases(bindingRoot, candidate, label) {
  const relative = relativeBoundPath(bindingRoot, candidate, label, { allowEqual: true });
  let current = bindingRoot;
  for (const segment of relative.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PATH_ALIAS", `${label} cannot be inspected.`, error);
    }
    if (metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PATH_ALIAS", `${label} cannot traverse a symlink or junction.`);
    }
  }
}

async function captureDirectoryLock(directoryPath, label) {
  let metadata;
  let resolved;
  try {
    metadata = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_ROOT_REBOUND", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PATH_ALIAS", `${label} must be a real directory with identity.`);
  }
  if (comparablePath(resolved) !== comparablePath(directoryPath)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PATH_ALIAS", `${label} must not resolve through an alias.`);
  }
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs,
    realPath: comparablePath(resolved)
  });
}

function sameDirectoryLock(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.realPath === right.realPath;
}

async function assertDirectoryLock(directoryPath, lock, label) {
  const current = await captureDirectoryLock(directoryPath, label);
  if (!sameDirectoryLock(lock, current)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_ROOT_REBOUND", `${label} changed during verification.`);
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function readOpenedFileBoundedAtZero(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.byteLength) {
    const { bytesRead } = await handle.read(target, offset, target.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function openHeldSequence(input, rootLock) {
  await Promise.all([
    assertDirectoryLock(input.sequenceOutputRoot, rootLock, "Sequence output root"),
    assertNoAliases(input.bindingRoot, input.sequencePath, "Sequence file")
  ]);
  let handle;
  try {
    handle = await open(input.sequencePath, "r");
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_FILE_UNSAFE", "Sequence file could not be opened.", error);
  }
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(input.sequencePath, { bigint: true }),
      realpath(input.sequencePath)
    ]);
    if (
      !before.isFile()
      || before.ino === 0n
      || before.nlink !== 1n
      || before.size <= 0n
      || before.size > BigInt(MAX_SEQUENCE_BYTES)
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.nlink !== 1n
      || !sameFileIdentity(before, pathBefore)
      || comparablePath(resolvedBefore) !== comparablePath(input.sequencePath)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_FILE_UNSAFE", "Sequence file must be a bounded single-link regular file.");
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(input.sequencePath, { bigint: true }),
      realpath(input.sequencePath)
    ]);
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
      || pathAfter.isSymbolicLink()
      || comparablePath(resolvedBefore) !== comparablePath(resolvedAfter)
      || bytes.byteLength !== Number(before.size)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_FILE_REBOUND", "Sequence file changed during initial read.");
    let document;
    try {
      document = parseProviderDeploymentCandidateLoaderJsonBytes(bytes, "Persisted provider deployment candidate sequence");
    } catch (error) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_JSON_INVALID", "Persisted sequence is not strict JSON.", error);
    }
    return {
      handle,
      document,
      bytes,
      metadata: after,
      resolvedPath: comparablePath(resolvedAfter),
      identity: Object.freeze({ dev: String(after.dev), ino: String(after.ino), realPath: comparablePath(resolvedAfter) }),
      binding: Object.freeze({
        path: relativeBoundPath(input.bindingRoot, input.sequencePath, "Persisted sequence binding"),
        size: bytes.byteLength,
        sha256: sha256(bytes)
      })
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function openHeldDiscardSentinel(input, rootLock) {
  const sentinelPath = path.join(
    input.sequenceOutputRoot,
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME
  );
  await Promise.all([
    assertDirectoryLock(input.sequenceOutputRoot, rootLock, "Sequence output root"),
    assertNoAliases(input.bindingRoot, sentinelPath, "Sequence discard sentinel")
  ]);
  let handle;
  try {
    handle = await open(sentinelPath, "r");
  } catch (error) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_DISCARD_SENTINEL_INVALID",
      "Pending writer verification requires the fixed discard sentinel.",
      error
    );
  }
  try {
    const expectedBytes = providerDeploymentCandidateSequenceDiscardSentinelBytes();
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(sentinelPath, { bigint: true }),
      realpath(sentinelPath)
    ]);
    if (
      !before.isFile()
      || before.ino === 0n
      || before.nlink !== 1n
      || before.size !== BigInt(expectedBytes.byteLength)
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.nlink !== 1n
      || !sameFileIdentity(before, pathBefore)
      || comparablePath(resolvedBefore) !== comparablePath(sentinelPath)
    ) fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_DISCARD_SENTINEL_INVALID",
      "Sequence discard sentinel must be the fixed single-link regular file."
    );
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(sentinelPath, { bigint: true }),
      realpath(sentinelPath)
    ]);
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
      || pathAfter.isSymbolicLink()
      || comparablePath(resolvedBefore) !== comparablePath(resolvedAfter)
      || !bytes.equals(expectedBytes)
    ) fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_DISCARD_SENTINEL_INVALID",
      "Sequence discard sentinel bytes or identity changed during initial read."
    );
    return {
      handle,
      path: sentinelPath,
      bytes,
      metadata: after,
      resolvedPath: comparablePath(resolvedAfter)
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldSequenceStable(
  input,
  held,
  rootLock,
  stage,
  expectedNames = [PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME]
) {
  const bytes = await readOpenedFileBoundedAtZero(held.handle, Number(held.metadata.size));
  const [after, pathAfter, resolvedAfter, names] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(input.sequencePath, { bigint: true }),
    realpath(input.sequencePath),
    readdir(input.sequenceOutputRoot)
  ]);
  if (
    !sameFileIdentity(held.metadata, after)
    || !sameFileIdentity(after, pathAfter)
    || held.metadata.size !== after.size
    || held.metadata.mtimeNs !== after.mtimeNs
    || held.metadata.ctimeNs !== after.ctimeNs
    || after.size !== pathAfter.size
    || after.mtimeNs !== pathAfter.mtimeNs
    || after.ctimeNs !== pathAfter.ctimeNs
    || after.nlink !== 1n
    || pathAfter.nlink !== 1n
    || pathAfter.isSymbolicLink()
    || held.resolvedPath !== comparablePath(resolvedAfter)
    || bytes.byteLength !== held.bytes.byteLength
    || sha256(bytes) !== held.binding.sha256
    || canonicalJson(names.sort()) !== canonicalJson([...expectedNames].sort())
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_FILE_REBOUND", `Sequence file changed ${stage}.`);
  await assertDirectoryLock(input.sequenceOutputRoot, rootLock, "Sequence output root");
}

async function assertHeldDiscardSentinelStable(input, held, rootLock, expectedNames, stage) {
  const bytes = await readOpenedFileBoundedAtZero(held.handle, Number(held.metadata.size));
  const [after, pathAfter, resolvedAfter, names] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.path, { bigint: true }),
    realpath(held.path),
    readdir(input.sequenceOutputRoot)
  ]);
  if (
    !sameFileIdentity(held.metadata, after)
    || !sameFileIdentity(after, pathAfter)
    || held.metadata.size !== after.size
    || held.metadata.mtimeNs !== after.mtimeNs
    || held.metadata.ctimeNs !== after.ctimeNs
    || after.size !== pathAfter.size
    || after.mtimeNs !== pathAfter.mtimeNs
    || after.ctimeNs !== pathAfter.ctimeNs
    || after.nlink !== 1n
    || pathAfter.nlink !== 1n
    || pathAfter.isSymbolicLink()
    || held.resolvedPath !== comparablePath(resolvedAfter)
    || !bytes.equals(held.bytes)
    || canonicalJson(names.sort()) !== canonicalJson([...expectedNames].sort())
  ) fail(
    "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_DISCARD_SENTINEL_REBOUND",
    `Sequence discard sentinel changed ${stage}.`
  );
  await assertDirectoryLock(input.sequenceOutputRoot, rootLock, "Sequence output root");
}

function assertPersistedTerminalGateBindings(document) {
  if (!isRecord(document?.packages)) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TERMINAL_GATE_BINDING_INVALID",
      "Persisted sequence packages are unavailable for terminal-gate validation."
    );
  }
  for (const role of ["deploy", "restore"]) {
    const candidate = document.packages[role];
    const receipt = candidate?.receipt;
    const fixedReceipt = candidate?.fixedFiles?.receipt;
    const terminalCommit = candidate?.fixedFiles?.["terminal-commit"];
    const expectedReceiptPath = `${candidate?.rootPath}/${RECEIPT_FILE_NAME}`;
    const expectedTerminalPath = `${candidate?.rootPath}/${TERMINAL_COMMIT_FILE_NAME}`;
    if (
      !exactKeys(receipt, ["path", "size", "sha256"])
      || !exactKeys(fixedReceipt, ["path", "size", "sha256"])
      || canonicalJson(receipt) !== canonicalJson(fixedReceipt)
      || receipt.path !== expectedReceiptPath
      || !SHA256_PATTERN.test(receipt.sha256 ?? "")
      || !exactKeys(terminalCommit, ["path", "size", "sha256", "commitsReceiptSha256"])
      || terminalCommit.path !== expectedTerminalPath
      || terminalCommit.size !== 65
      || !SHA256_PATTERN.test(terminalCommit.sha256 ?? "")
      || terminalCommit.sha256 !== sha256(`${receipt.sha256}\n`)
      || !SHA256_PATTERN.test(terminalCommit.commitsReceiptSha256 ?? "")
      || terminalCommit.commitsReceiptSha256 !== receipt.sha256
    ) {
      fail(
        "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TERMINAL_GATE_BINDING_INVALID",
        `${role} persisted terminal gate must be the exact four-field 65-byte marker bound to its raw receipt SHA-256.`
      );
    }
  }
}

function assertPersistedDigestClosure(document) {
  try {
    for (const role of ["deploy", "restore"]) {
      const candidate = document.packages[role];
      const { packageDigest, ...unsignedPackage } = candidate;
      if (packageDigest !== sha256(canonicalJson(unsignedPackage))) {
        fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PACKAGE_DIGEST_MISMATCH", `${role} package digest is invalid.`);
      }
    }
    if (document.packageSetDigest !== sha256(canonicalJson(document.packages))) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_PACKAGE_SET_DIGEST_MISMATCH", "Package-set digest is invalid.");
    }
    const expectedSequenceId = `provider-sequence-${sha256(canonicalJson({
      deployReceiptDigest: document.packages.deploy.receiptDigest,
      restoreReceiptDigest: document.packages.restore.receiptDigest,
      packageSetDigest: document.packageSetDigest
    })).slice(0, 32)}`;
    if (document.sequenceId !== expectedSequenceId) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_SEQUENCE_ID_MISMATCH", "Sequence id is invalid.");
    }
    const { sequenceDigest, ...unsignedSequence } = document;
    if (sequenceDigest !== sha256(canonicalJson(unsignedSequence))) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_SEQUENCE_DIGEST_MISMATCH", "Sequence digest is invalid.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_")) throw error;
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_DIGEST_STRUCTURE_INVALID", "Sequence digest structure is invalid.", error);
  }
}

function assertCheckpointProtocol(checkpoint, held) {
  if (
    !exactKeys(checkpoint, ["phase", "recomposedDocument", "heldFileIdentities"])
    || checkpoint.phase !== "after_final_sequence_validation"
    || !Object.isFrozen(checkpoint)
    || !Object.isFrozen(checkpoint.recomposedDocument)
    || !Array.isArray(checkpoint.heldFileIdentities)
    || !Object.isFrozen(checkpoint.heldFileIdentities)
    || checkpoint.heldFileIdentities.length !== 17
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Composer checkpoint contract is invalid.");
  const expectedPaths = new Map();
  for (const role of ["deploy", "restore"]) {
    for (const [fileRole, binding] of Object.entries(checkpoint.recomposedDocument.packages[role].fixedFiles)) {
      expectedPaths.set(`${role}:${fileRole}`, binding.path);
    }
  }
  expectedPaths.set("source:hostingPolicy", checkpoint.recomposedDocument.checkedSources.hostingPolicy.path);
  expectedPaths.set("source:candidateSchema", checkpoint.recomposedDocument.checkedSources.candidateSchema.path);
  expectedPaths.set("source:sequenceSchema", checkpoint.recomposedDocument.checkedSources.sequenceSchema.path);
  if (expectedPaths.size !== 17) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Recomposed identity path set is incomplete.");
  }
  const inodeIdentities = new Set();
  const realPaths = new Set();
  const observedKeys = new Set();
  for (const identity of checkpoint.heldFileIdentities) {
    if (
      !exactKeys(identity, ["key", "path", "dev", "ino", "realPath"])
      || !Object.isFrozen(identity)
      || typeof identity.key !== "string"
      || !expectedPaths.has(identity.key)
      || typeof identity.path !== "string"
      || identity.path.length === 0
      || expectedPaths.get(identity.key) !== identity.path
      || typeof identity.dev !== "string"
      || identity.dev.length === 0
      || typeof identity.ino !== "string"
      || identity.ino.length === 0
      || typeof identity.realPath !== "string"
      || !path.isAbsolute(identity.realPath)
    ) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Held identity projection is invalid.");
    }
    observedKeys.add(identity.key);
    inodeIdentities.add(`${identity.dev}:${identity.ino}`);
    realPaths.add(identity.realPath);
  }
  if (observedKeys.size !== 17) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Held identity keys are incomplete or duplicated.");
  }
  if ([...expectedPaths.keys()].some((key) => !observedKeys.has(key))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Held identity keys do not exactly match the recomposed document.");
  }
  if (
    inodeIdentities.size !== 17
    || realPaths.size !== 17
    || inodeIdentities.has(`${held.identity.dev}:${held.identity.ino}`)
    || realPaths.has(held.identity.realPath)
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_FILE_IDENTITY_REUSED", "Sequence file must be physically distinct from all 17 composer inputs.");
}

async function verifyPersistedProviderDeploymentCandidateSequenceInternal(options, { pendingWriterFinalization }) {
  if (!isRecord(options)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", "Verifier options must be an object.");
  }
  const allowed = [
    "bindingRoot", "deployOutputRoot", "deployReceiptPath", "restoreOutputRoot", "restoreReceiptPath",
    "sequenceOutputRoot", "sequencePath", "cwd", "onOverlappingEpochCheckpoint"
  ];
  if (Object.keys(options).some((key) => !allowed.includes(key))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", "Verifier options contain an unknown field.");
  }
  if (options.onOverlappingEpochCheckpoint !== undefined && typeof options.onOverlappingEpochCheckpoint !== "function") {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_INPUT_INVALID", "onOverlappingEpochCheckpoint must be a trusted function when used.");
  }
  const input = parseProviderDeploymentCandidateSequenceVerifierInput({
    bindingRoot: options.bindingRoot,
    deployOutputRoot: options.deployOutputRoot,
    deployReceiptPath: options.deployReceiptPath,
    restoreOutputRoot: options.restoreOutputRoot,
    restoreReceiptPath: options.restoreReceiptPath,
    sequenceOutputRoot: options.sequenceOutputRoot,
    sequencePath: options.sequencePath
  });
  const cwd = options.cwd ?? process.cwd();
  if (comparablePath(input.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_BINDING_ROOT_CWD_MISMATCH", "Binding root must exactly equal cwd.");
  }
  await Promise.all([
    assertNoAliases(input.bindingRoot, input.sequenceOutputRoot, "Sequence output root"),
    assertNoAliases(input.bindingRoot, input.sequencePath, "Sequence file")
  ]);
  const [rootLock, deployReal, restoreReal] = await Promise.all([
    captureDirectoryLock(input.sequenceOutputRoot, "Sequence output root"),
    realpath(input.deployOutputRoot),
    realpath(input.restoreOutputRoot)
  ]);
  requireDisjoint(rootLock.realPath, deployReal, "Resolved sequence and deploy output roots");
  requireDisjoint(rootLock.realPath, restoreReal, "Resolved sequence and restore output roots");
  const expectedNames = pendingWriterFinalization
    ? [
        PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
        PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
      ].sort()
    : [PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME];
  const initialNames = (await readdir(input.sequenceOutputRoot)).sort();
  if (canonicalJson(initialNames) !== canonicalJson(expectedNames)) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_OUTPUT_SET_INVALID",
      pendingWriterFinalization
        ? "Pending sequence output root must contain exactly the fixed sequence file and discard sentinel."
        : "Sequence output root must contain exactly the fixed sequence file."
    );
  }
  let discardSentinel;
  let held;
  try {
    if (pendingWriterFinalization) {
      discardSentinel = await openHeldDiscardSentinel(input, rootLock);
    }
    held = await openHeldSequence(input, rootLock);
    assertPersistedTerminalGateBindings(held.document);
    assertPersistedDigestClosure(held.document);
    let checkpointCount = 0;
    const recomposed = await loadVerifiedProviderDeploymentCandidateSequence({
      bindingRoot: input.bindingRoot,
      deployOutputRoot: input.deployOutputRoot,
      deployReceiptPath: input.deployReceiptPath,
      restoreOutputRoot: input.restoreOutputRoot,
      restoreReceiptPath: input.restoreReceiptPath,
      cwd,
      onVerifiedSequenceConsumer: async (checkpoint) => {
        checkpointCount += 1;
        if (checkpointCount !== 1) {
          fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Composer checkpoint must occur exactly once.");
        }
        assertCheckpointProtocol(checkpoint, held);
        if (canonicalJson(held.document) !== canonicalJson(checkpoint.recomposedDocument)) {
          fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CURRENT_RECOMPOSITION_MISMATCH", "Persisted sequence differs from current recomposition inside the overlapping epoch.");
        }
        const expectedBytes = Buffer.from(`${JSON.stringify(checkpoint.recomposedDocument, null, 2)}\n`, "utf8");
        if (!held.bytes.equals(expectedBytes)) {
          fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_NON_CANONICAL_BYTES", "Persisted sequence bytes are not the fixed writer serialization of current recomposition.");
        }
        if (options.onOverlappingEpochCheckpoint !== undefined) {
          try {
            await options.onOverlappingEpochCheckpoint("during_overlapping_sequence_package_epoch");
          } catch (error) {
            fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TEST_CHECKPOINT_FAILED", "Trusted verifier checkpoint failed.", error);
          }
        }
        await assertHeldSequenceStable(
          input,
          held,
          rootLock,
          "inside the overlapping composer epoch",
          expectedNames
        );
        if (discardSentinel) {
          await assertHeldDiscardSentinelStable(
            input,
            discardSentinel,
            rootLock,
            expectedNames,
            "inside the overlapping composer epoch"
          );
        }
      }
    });
    if (checkpointCount !== 1) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CHECKPOINT_PROTOCOL_INVALID", "Composer checkpoint was not reached exactly once.");
    }
    if (canonicalJson(held.document) !== canonicalJson(recomposed)) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_CURRENT_RECOMPOSITION_MISMATCH", "Persisted sequence differs from final current recomposition.");
    }
    assertPersistedDigestClosure(recomposed);
    await assertHeldSequenceStable(input, held, rootLock, "before verifier completion", expectedNames);
    if (discardSentinel) {
      await assertHeldDiscardSentinelStable(
        input,
        discardSentinel,
        rootLock,
        expectedNames,
        "before verifier completion"
      );
    }
    return immutableJsonSnapshot({
      verificationKind: pendingWriterFinalization
        ? "offline-independent-persisted-provider-deployment-candidate-sequence-pending-finalization-v1"
        : "offline-independent-persisted-provider-deployment-candidate-sequence-v1",
      externalSequenceCandidateIntegrityVerified: !pendingWriterFinalization,
      pendingSequenceCandidateIntegrityVerified: pendingWriterFinalization,
      currentRecompositionMatched: true,
      overlappingFilesystemEpochVerified: true,
      outputFinalization: {
        discardSentinelPresent: pendingWriterFinalization,
        discardSentinelVerified: pendingWriterFinalization,
        finalOutputSetVerified: !pendingWriterFinalization
      },
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      sequenceBinding: held.binding,
      sequenceId: recomposed.sequenceId,
      sequenceDigest: recomposed.sequenceDigest,
      limitations: {
        rawProjectionDerivationVerified: false,
        providerAuthenticatedReceiptVerified: false,
        providerOperationAuthenticityVerified: false,
        realAtoBtoAObserved: false,
        rollbackObserved: false,
        liveHostBytesVerified: false,
        browserRuntimeVerified: false,
        dataRollbackVerified: false,
        applicationDataMutationEpochVerified: false,
        receiptHistoricalWriteOrderVerified: false,
        independentCorroborationVerified: false
      },
      attempts: {
        networkAttempted: false,
        deploymentAttempted: false,
        rollbackAttempted: false
      },
      admissionGates: {
        trustedProviderParserVerified: false,
        providerAuthenticatedReceiptVerified: false,
        sequenceAdmissionPassed: false,
        deploymentAdmissionPassed: false,
        rollbackAdmissionPassed: false,
        publicReleaseGatePassed: false
      },
      authorizationBoundary: {
        externalDeploymentExecutionAuthorized: false,
        rollbackExecutionAuthorized: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        authorizationMayNotBeDerivedFromCandidateEvidence: true
      },
      claims: {
        providerOperationObserved: false,
        realAtoBtoAObserved: false,
        rollbackObserved: false,
        artifactServedByDeploymentIds: false,
        liveHostBytesVerified: false,
        browserRuntimeVerified: false,
        dataRollbackVerified: false,
        applicationDataMutationEpochVerified: false,
        releaseReady: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        contentTruthAuthorized: false,
        expertClaimsAuthorized: false,
        rightsLegalConclusionAuthorized: false
      },
      document: recomposed
    });
  } finally {
    if (held?.handle) await held.handle.close().catch(() => undefined);
    if (discardSentinel?.handle) await discardSentinel.handle.close().catch(() => undefined);
  }
}

export async function verifyPersistedProviderDeploymentCandidateSequence(options) {
  return verifyPersistedProviderDeploymentCandidateSequenceInternal(options, {
    pendingWriterFinalization: false
  });
}

export async function verifyPendingProviderDeploymentCandidateSequenceBeforeFinalization(options) {
  return verifyPersistedProviderDeploymentCandidateSequenceInternal(options, {
    pendingWriterFinalization: true
  });
}

async function runCli() {
  try {
    const input = parseProviderDeploymentCandidateSequenceVerifierEnvironment(process.env);
    const result = await verifyPersistedProviderDeploymentCandidateSequence({ ...input, cwd: process.cwd() });
    process.stdout.write(`${JSON.stringify({
      verificationKind: result.verificationKind,
      externalSequenceCandidateIntegrityVerified: true,
      currentRecompositionMatched: true,
      overlappingFilesystemEpochVerified: true,
      sequenceId: result.sequenceId,
      sequenceDigest: result.sequenceDigest,
      sequenceSha256: result.sequenceBinding.sha256,
      trustClass: result.trustClass,
      admissionStatus: result.admissionStatus,
      realAtoBtoAObserved: false,
      rollbackObserved: false,
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verificationKind: "offline-independent-persisted-provider-deployment-candidate-sequence-v1",
      externalSequenceCandidateIntegrityVerified: false,
      currentRecompositionMatched: false,
      overlappingFilesystemEpochVerified: false,
      usableForAdmission: false,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      realAtoBtoAObserved: false,
      rollbackObserved: false,
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
