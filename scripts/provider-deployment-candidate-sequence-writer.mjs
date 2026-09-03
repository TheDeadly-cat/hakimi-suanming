import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  unlink
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  loadVerifiedProviderDeploymentCandidateSequence,
  parseProviderDeploymentCandidateSequenceInput,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
} from "./provider-deployment-candidate-sequence-loader.mjs";
import { parseProviderDeploymentCandidateLoaderJsonBytes } from "./provider-deployment-candidate-loader.mjs";
import {
  providerDeploymentCandidateSequenceDiscardSentinelBytes,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
  verifyPendingProviderDeploymentCandidateSequenceBeforeFinalization
} from "./provider-deployment-candidate-sequence-verifier.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS = Object.freeze({
  ...PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS,
  sequenceOutputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_OUTPUT_ROOT"
});

const MAX_SEQUENCE_BYTES = 16 * 1024 * 1024;
const stringifyJson = JSON.stringify;

function fail(code, message, cause, details = null) {
  const error = new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
  Object.defineProperty(error, "failureCode", { value: code, enumerable: false });
  if (details !== null) {
    for (const [key, value] of Object.entries(details)) {
      Object.defineProperty(error, key, { value, enumerable: false });
    }
  }
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function isErrno(error, code) {
  return error !== null && typeof error === "object" && error.code === code;
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
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", `${label} must be an explicit absolute path.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", `${label} must use exact resolved filesystem spelling.`);
  }
  return resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", `${key} must be explicit and free of surrounding whitespace.`);
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
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", `${label} must be a strict descendant of its root.`);
  return relative.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requireDisjoint(left, right, label) {
  if (pathsOverlap(left, right) || pathsOverlap(right, left)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_ROOT_OVERLAP", `${label} must be disjoint in both directions.`);
  }
}

function requirePrivateTmpRoot(bindingRoot, outputRoot) {
  const relative = relativeBoundPath(bindingRoot, outputRoot, "Sequence output root");
  if (relative.split("/")[0] !== "tmp") {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_SCOPE_INVALID",
      "Sequence candidate output must remain under the workspace tmp/ private evidence root."
    );
  }
}

export function parseProviderDeploymentCandidateSequenceWriterInput(input) {
  const keys = [
    "bindingRoot", "deployOutputRoot", "deployReceiptPath", "restoreOutputRoot",
    "restoreReceiptPath", "sequenceOutputRoot"
  ];
  if (!exactKeys(input, keys)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "Writer input must have the exact six path fields.");
  }
  const sequenceInput = parseProviderDeploymentCandidateSequenceInput({
    bindingRoot: input.bindingRoot,
    deployOutputRoot: input.deployOutputRoot,
    deployReceiptPath: input.deployReceiptPath,
    restoreOutputRoot: input.restoreOutputRoot,
    restoreReceiptPath: input.restoreReceiptPath
  });
  const sequenceOutputRoot = requireAbsoluteCanonicalPath(input.sequenceOutputRoot, "Sequence output root");
  requirePrivateTmpRoot(sequenceInput.bindingRoot, sequenceOutputRoot);
  requireDisjoint(sequenceOutputRoot, sequenceInput.deployOutputRoot, "Sequence and deploy output roots");
  requireDisjoint(sequenceOutputRoot, sequenceInput.restoreOutputRoot, "Sequence and restore output roots");
  return Object.freeze({ ...sequenceInput, sequenceOutputRoot });
}

export function parseProviderDeploymentCandidateSequenceWriterEnvironment(environment = process.env) {
  if (!isRecord(environment)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "Writer environment must be an object.");
  }
  return parseProviderDeploymentCandidateSequenceWriterInput({
    bindingRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.bindingRoot),
    deployOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.deployOutputRoot),
    deployReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.deployReceiptPath),
    restoreOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.restoreOutputRoot),
    restoreReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.restoreReceiptPath),
    sequenceOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS.sequenceOutputRoot)
  });
}

async function assertExistingDirectoryChain(bindingRoot, candidate, label) {
  const relative = relativeBoundPath(bindingRoot, candidate, label, { allowEqual: true });
  let current = bindingRoot;
  for (const segment of relative.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PATH_INVALID", `${label} cannot be inspected.`, error);
    }
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PATH_ALIAS", `${label} must traverse only real directories.`);
    }
  }
  const resolved = await realpath(candidate);
  if (comparablePath(resolved) !== comparablePath(candidate)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PATH_ALIAS", `${label} must not use an aliased path.`);
  }
}

async function captureDirectoryLock(directoryPath, label, { includeTimes = true } = {}) {
  let metadata;
  let resolved;
  try {
    metadata = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_REBOUND", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PATH_ALIAS", `${label} must be a real directory with identity.`);
  }
  if (comparablePath(resolved) !== comparablePath(directoryPath)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PATH_ALIAS", `${label} must not resolve through an alias.`);
  }
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    mtimeNs: includeTimes ? metadata.mtimeNs : null,
    ctimeNs: includeTimes ? metadata.ctimeNs : null,
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
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_REBOUND", `${label} changed after sequence publication.`);
  }
}

async function createSequenceOutputRoot(input, lifecycle) {
  const parent = path.dirname(input.sequenceOutputRoot);
  await assertExistingDirectoryChain(input.bindingRoot, parent, "Sequence output parent");
  try {
    await mkdir(input.sequenceOutputRoot, { recursive: false });
    lifecycle.outputRootCreated = true;
  } catch (error) {
    if (isErrno(error, "EEXIST")) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_EXISTS", "Sequence output root must not already exist.");
    }
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_CREATE_FAILED", "Sequence output root could not be created.", error);
  }
  await assertExistingDirectoryChain(input.bindingRoot, input.sequenceOutputRoot, "Sequence output root");
  const [outputIdentity, deployReal, restoreReal] = await Promise.all([
    captureDirectoryLock(input.sequenceOutputRoot, "Sequence output root", { includeTimes: false }),
    realpath(input.deployOutputRoot),
    realpath(input.restoreOutputRoot)
  ]);
  requireDisjoint(outputIdentity.realPath, deployReal, "Resolved sequence and deploy output roots");
  requireDisjoint(outputIdentity.realPath, restoreReal, "Resolved sequence and restore output roots");
  if ((await readdir(input.sequenceOutputRoot)).length !== 0) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_NOT_EMPTY", "New sequence output root must be empty.");
  }
  return outputIdentity;
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

async function openPublishedSequence(input, destination, expectedBytes) {
  const handle = await open(destination, "r");
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(destination, { bigint: true }),
      realpath(destination)
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
      || comparablePath(resolvedBefore) !== comparablePath(destination)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_FILE_UNSAFE", "Published sequence must be a bounded single-link regular file.");
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(before.size));
    if (bytes.byteLength !== expectedBytes.byteLength || !bytes.equals(expectedBytes)) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_BYTES_MISMATCH", "Published sequence bytes differ from the validated document.");
    }
    const after = await handle.stat({ bigint: true });
    if (
      !sameFileIdentity(before, after)
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || after.nlink !== 1n
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_FILE_REBOUND", "Published sequence changed while it was opened.");
    return {
      handle,
      destination,
      metadata: after,
      resolvedPath: comparablePath(resolvedBefore),
      bytes,
      binding: Object.freeze({
        path: relativeBoundPath(input.bindingRoot, destination, "Sequence candidate binding"),
        size: bytes.byteLength,
        sha256: sha256(bytes)
      })
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function assertPublishedSequenceStable(input, held, outputLock) {
  const bytes = await readOpenedFileBoundedAtZero(held.handle, Number(held.metadata.size));
  const [after, pathAfter, resolvedAfter, names] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.destination, { bigint: true }),
    realpath(held.destination),
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
    || canonicalJson(names.sort()) !== canonicalJson([
      PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
      PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
    ].sort())
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_FILE_REBOUND", "Published sequence changed before writer completion.");
  await assertDirectoryLock(input.sequenceOutputRoot, outputLock, "Sequence output root");
}

async function publishDiscardSentinel(input) {
  const destination = path.join(
    input.sequenceOutputRoot,
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME
  );
  const bytes = providerDeploymentCandidateSequenceDiscardSentinelBytes();
  let handle;
  try {
    handle = await open(destination, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    const metadata = await handle.stat({ bigint: true });
    if (
      !metadata.isFile()
      || metadata.ino === 0n
      || metadata.nlink !== 1n
      || metadata.size !== BigInt(bytes.byteLength)
    ) fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_DISCARD_SENTINEL_INVALID",
      "Sequence discard sentinel was not created as the fixed single-link regular file."
    );
  } catch (error) {
    if (error instanceof Error && error.failureCode === "PROVIDER_CANDIDATE_SEQUENCE_WRITE_DISCARD_SENTINEL_INVALID") {
      throw error;
    }
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_DISCARD_SENTINEL_FAILED",
      "Sequence discard sentinel could not be armed before publication.",
      error
    );
  } finally {
    if (handle) await handle.close().catch(() => undefined);
  }
  return Object.freeze({ destination, bytes });
}

async function removeVerifiedDiscardSentinel(input, sentinel, outputLock) {
  const handle = await open(sentinel.destination, "r");
  try {
    const [metadata, pathMetadata, resolved, names] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(sentinel.destination, { bigint: true }),
      realpath(sentinel.destination),
      readdir(input.sequenceOutputRoot)
    ]);
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(metadata.size));
    if (
      !metadata.isFile()
      || metadata.ino === 0n
      || metadata.nlink !== 1n
      || !pathMetadata.isFile()
      || pathMetadata.isSymbolicLink()
      || pathMetadata.nlink !== 1n
      || !sameFileIdentity(metadata, pathMetadata)
      || comparablePath(resolved) !== comparablePath(sentinel.destination)
      || !bytes.equals(sentinel.bytes)
      || canonicalJson(names.sort()) !== canonicalJson([
        PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
        PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
      ].sort())
    ) fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_DISCARD_SENTINEL_REBOUND",
      "Sequence discard sentinel or pending output set changed before finalization."
    );
    await assertDirectoryLock(input.sequenceOutputRoot, outputLock, "Sequence output root");
  } finally {
    await handle.close().catch(() => undefined);
  }
  await unlink(sentinel.destination);
}

async function publishSequenceDocument(input, outputIdentity, document, onPublishedSequenceCheckpoint) {
  const prepublicationNames = (await readdir(input.sequenceOutputRoot)).sort();
  if (canonicalJson(prepublicationNames) !== canonicalJson([
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME
  ])) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_NOT_EMPTY",
      "Sequence output root must contain only the armed discard sentinel before publication."
    );
  }
  const currentIdentity = await captureDirectoryLock(input.sequenceOutputRoot, "Sequence output root", { includeTimes: false });
  if (
    currentIdentity.dev !== outputIdentity.dev
    || currentIdentity.ino !== outputIdentity.ino
    || currentIdentity.birthtimeNs !== outputIdentity.birthtimeNs
    || currentIdentity.realPath !== outputIdentity.realPath
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_REBOUND", "Sequence output root identity changed before publication.");
  const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SEQUENCE_BYTES) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_BYTES_INVALID", "Sequence document exceeds the bounded output size.");
  }
  const destination = path.join(input.sequenceOutputRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME);
  const temporary = path.join(input.sequenceOutputRoot, `.sequence-${randomUUID()}.tmp`);
  let temporaryHandle;
  let temporaryExists = false;
  try {
    temporaryHandle = await open(temporary, "wx", 0o600);
    temporaryExists = true;
    await temporaryHandle.writeFile(bytes);
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = undefined;
    await link(temporary, destination);
    await unlink(temporary);
    temporaryExists = false;
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_PUBLISH_FAILED", "Sequence candidate could not be published without overwrite.", error);
  } finally {
    if (temporaryHandle) await temporaryHandle.close().catch(() => undefined);
    if (temporaryExists) await unlink(temporary).catch(() => undefined);
  }
  let held;
  try {
    held = await openPublishedSequence(input, destination, bytes);
    if (onPublishedSequenceCheckpoint) {
      await onPublishedSequenceCheckpoint(immutableJsonSnapshot({
        phase: "after_sequence_publication_before_output_lock",
        sequencePath: held.destination,
        sequenceBinding: held.binding
      }));
    }
    const outputLock = await captureDirectoryLock(input.sequenceOutputRoot, "Sequence output root");
    if (
      outputLock.dev !== outputIdentity.dev
      || outputLock.ino !== outputIdentity.ino
      || outputLock.birthtimeNs !== outputIdentity.birthtimeNs
      || outputLock.realPath !== outputIdentity.realPath
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_REBOUND", "Sequence output root identity changed during publication.");
    return { held, outputLock };
  } catch (error) {
    if (held?.handle) await held.handle.close().catch(() => undefined);
    throw error;
  }
}

export async function writeProviderDeploymentCandidateSequenceCandidate(options) {
  if (!isRecord(options)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "Writer options must be an object.");
  }
  const allowed = [
    "bindingRoot", "deployOutputRoot", "deployReceiptPath", "restoreOutputRoot",
    "restoreReceiptPath", "sequenceOutputRoot", "cwd", "onOutputRootCreatedCheckpoint",
    "onPublishedSequenceCheckpoint"
  ];
  if (Object.keys(options).some((key) => !allowed.includes(key))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "Writer options contain an unknown field.");
  }
  if (options.onPublishedSequenceCheckpoint !== undefined && typeof options.onPublishedSequenceCheckpoint !== "function") {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "onPublishedSequenceCheckpoint must be a trusted function when used.");
  }
  if (options.onOutputRootCreatedCheckpoint !== undefined && typeof options.onOutputRootCreatedCheckpoint !== "function") {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_INPUT_INVALID", "onOutputRootCreatedCheckpoint must be a trusted function when used.");
  }
  const input = parseProviderDeploymentCandidateSequenceWriterInput({
    bindingRoot: options.bindingRoot,
    deployOutputRoot: options.deployOutputRoot,
    deployReceiptPath: options.deployReceiptPath,
    restoreOutputRoot: options.restoreOutputRoot,
    restoreReceiptPath: options.restoreReceiptPath,
    sequenceOutputRoot: options.sequenceOutputRoot
  });
  const cwd = options.cwd ?? process.cwd();
  if (comparablePath(input.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_BINDING_ROOT_CWD_MISMATCH", "Binding root must exactly equal cwd.");
  }
  const composerArgs = {
    bindingRoot: input.bindingRoot,
    deployOutputRoot: input.deployOutputRoot,
    deployReceiptPath: input.deployReceiptPath,
    restoreOutputRoot: input.restoreOutputRoot,
    restoreReceiptPath: input.restoreReceiptPath,
    cwd
  };
  const document = await loadVerifiedProviderDeploymentCandidateSequence(composerArgs);
  const lifecycle = { outputRootCreated: false, discardSentinelArmed: false };
  let publication;
  try {
    const outputIdentity = await createSequenceOutputRoot(input, lifecycle);
    if (options.onOutputRootCreatedCheckpoint) {
      await options.onOutputRootCreatedCheckpoint(immutableJsonSnapshot({
        phase: "after_output_root_creation_before_discard_sentinel",
        sequenceOutputRoot: input.sequenceOutputRoot
      }));
    }
    const discardSentinel = await publishDiscardSentinel(input);
    lifecycle.discardSentinelArmed = true;
    publication = await publishSequenceDocument(
      input,
      outputIdentity,
      document,
      options.onPublishedSequenceCheckpoint
    );
    const parsed = parseProviderDeploymentCandidateLoaderJsonBytes(
      publication.held.bytes,
      "Persisted provider deployment candidate sequence"
    );
    if (canonicalJson(parsed) !== canonicalJson(document)) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_BYTES_MISMATCH", "Persisted sequence JSON differs from the final document.");
    }
    const externalVerification = await verifyPendingProviderDeploymentCandidateSequenceBeforeFinalization({
      ...composerArgs,
      sequenceOutputRoot: input.sequenceOutputRoot,
      sequencePath: publication.held.destination
    });
    if (
      externalVerification.externalSequenceCandidateIntegrityVerified !== false
      || externalVerification.pendingSequenceCandidateIntegrityVerified !== true
      || externalVerification.currentRecompositionMatched !== true
      || externalVerification.overlappingFilesystemEpochVerified !== true
      || externalVerification.outputFinalization?.discardSentinelPresent !== true
      || externalVerification.outputFinalization?.discardSentinelVerified !== true
      || externalVerification.outputFinalization?.finalOutputSetVerified !== false
      || canonicalJson(externalVerification.document) !== canonicalJson(document)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_WRITE_POSTVERIFY_FAILED", "Independent external verification did not reproduce the written sequence.");
    await assertPublishedSequenceStable(input, publication.held, publication.outputLock);
    const completedResult = immutableJsonSnapshot({
      verificationKind: "offline-persisted-provider-deployment-candidate-sequence-writer-v1",
      sequenceCandidateWritten: true,
      independentExternalVerificationPassed: true,
      independentFinalOutputSetVerificationPassed: false,
      discardSentinelArmedDuringVerification: true,
      discardSentinelRemovedAsFinalPublicationStep: true,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      sequencePath: publication.held.destination,
      sequenceBinding: publication.held.binding,
      attempts: {
        networkAttempted: false,
        deploymentAttempted: false,
        rollbackAttempted: false
      },
      authorizationBoundary: {
        externalDeploymentExecutionAuthorized: false,
        rollbackExecutionAuthorized: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        authorizationMayNotBeDerivedFromCandidateEvidence: true
      },
      claims: {
        realAtoBtoAObserved: false,
        rollbackObserved: false,
        releaseReady: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        contentTruthAuthorized: false,
        expertClaimsAuthorized: false,
        rightsLegalConclusionAuthorized: false
      },
      mutationBoundary: {
        pendingOutputFilesHeldAndRecheckedBeforeFinalization: true,
        finalizedBySingleDiscardSentinelUnlink: true,
        finalOutputSetExternallyReverifiedInsideWriter: false,
        continuousFilesystemEpochVerified: false,
        samePermissionMutationExcluded: false,
        abaMutationExcluded: false,
        publicVerifierRequiredAfterWriterReturn: true
      },
      document,
      externalVerification: {
        verificationKind: externalVerification.verificationKind,
        pendingSequenceCandidateIntegrityVerified: true,
        currentRecompositionMatched: true,
        overlappingFilesystemEpochVerified: true,
        discardSentinelVerified: true,
        finalOutputSetVerified: false
      }
    });
    await removeVerifiedDiscardSentinel(input, discardSentinel, publication.outputLock);
    return completedResult;
  } catch (error) {
    if (!lifecycle.outputRootCreated) throw error;
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_DISCARD_REQUIRED",
      `Persisted sequence did not complete independent verification and its output root must not be reused: ${error instanceof Error ? error.message : String(error)}`,
      error,
      {
        outputRootCreated: true,
        discardSentinelArmed: lifecycle.discardSentinelArmed,
        discardSentinelExpectedToRemain: lifecycle.discardSentinelArmed
      }
    );
  } finally {
    if (publication?.held?.handle) await publication.held.handle.close().catch(() => undefined);
  }
}

function cliSuccessLedger(result) {
  return {
    verificationKind: result.verificationKind,
    candidatePublicationCompleted: true,
    sequenceCandidateWritten: true,
    stdoutPresentationCompleted: true,
    publicVerifierRequiredAfterWriterReturn: true,
    independentFinalOutputSetVerificationPassed: false,
    sequencePath: result.sequencePath,
    sequenceSha256: result.sequenceBinding.sha256,
    sequenceId: result.document.sequenceId,
    sequenceDigest: result.document.sequenceDigest,
    trustClass: result.trustClass,
    admissionStatus: result.admissionStatus,
    realAtoBtoAObserved: false,
    rollbackObserved: false,
    networkAttempted: false,
    deploymentAttempted: false,
    rollbackAttempted: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  };
}

function cliFailureLedger(error, publishedResult) {
  const candidatePublicationCompleted = publishedResult?.sequenceCandidateWritten === true;
  const outputDiscardRequired = !candidatePublicationCompleted
    && error instanceof Error
    && error.failureCode === "PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_DISCARD_REQUIRED";
  return {
    verificationKind: "offline-persisted-provider-deployment-candidate-sequence-writer-v1",
    candidatePublicationCompleted,
    sequenceCandidateWritten: candidatePublicationCompleted,
    stdoutPresentationCompleted: false,
    publicVerifierRequiredAfterWriterReturn: candidatePublicationCompleted,
    independentFinalOutputSetVerificationPassed: false,
    outputDiscardRequired,
    discardSentinelArmed: outputDiscardRequired && error.discardSentinelArmed === true,
    discardSentinelExpectedToRemain: outputDiscardRequired
      && error.discardSentinelExpectedToRemain === true,
    ...(candidatePublicationCompleted ? {
      sequencePath: publishedResult.sequencePath,
      sequenceSha256: publishedResult.sequenceBinding.sha256,
      sequenceId: publishedResult.document.sequenceId,
      sequenceDigest: publishedResult.document.sequenceDigest
    } : {}),
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
  };
}

function writeCliStream(stream, text) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, keepErrorListener = false) => {
      if (settled) return;
      settled = true;
      if (!keepErrorListener) stream.off("error", onError);
      if (error) reject(error);
      else resolve();
    };
    const onError = (error) => finish(error);
    stream.once("error", onError);
    try {
      stream.write(text, (error) => finish(error, error !== undefined && error !== null));
    } catch (error) {
      finish(error);
    }
  });
}

export async function runProviderDeploymentCandidateSequenceWriterCli(options = {}) {
  const environment = options.environment ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const stdoutWrite = options.stdoutWrite ?? ((text) => writeCliStream(process.stdout, text));
  const stderrWrite = options.stderrWrite ?? ((text) => writeCliStream(process.stderr, text));
  const serializeSuccess = options.serializeSuccess
    ?? ((value) => stringifyJson(value, null, 2));
  let result;
  try {
    const input = parseProviderDeploymentCandidateSequenceWriterEnvironment(environment);
    result = await writeProviderDeploymentCandidateSequenceCandidate({ ...input, cwd });
  } catch (error) {
    await stderrWrite(`${stringifyJson(cliFailureLedger(error, undefined), null, 2)}\n`);
    return 1;
  }
  try {
    await stdoutWrite(`${serializeSuccess(cliSuccessLedger(result))}\n`);
    return 0;
  } catch (error) {
    await stderrWrite(`${stringifyJson(cliFailureLedger(error, result), null, 2)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await runProviderDeploymentCandidateSequenceWriterCli();
}
