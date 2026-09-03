#!/usr/bin/env node

import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseProviderDeploymentCandidateLoaderJsonBytes } from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";
import {
  STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
  STORAGE_V13_MATRIX_AUTHORITY,
  STORAGE_V13_MATRIX_CAPABILITIES,
  STORAGE_V13_MATRIX_ENVIRONMENT_KEYS,
  STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES,
  STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES,
  STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES,
  STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS,
  STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES,
  STORAGE_V13_MATRIX_POLICY_PATH,
  STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH,
  STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
  loadStorageV13MatrixGovernanceBindings,
  loadVerifiedDeployedPwaCandidateArtifact,
  parseStorageV13MatrixCandidateEnvironment,
  revalidateDeployedPwaCandidateArtifactIdentity
} from "./storage-v13-matrix-candidate-runtime.mjs";

export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH =
  "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json";
export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/storage-v13-matrix-browser-receipt-candidate-v2.json";
export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256 =
  "1a67adbb0c4a0f63002c4973a532d152fd49297da7d229b1797fa3902144c3af";
export const STORAGE_V13_MATRIX_CANDIDATE_VERIFIER_ENVIRONMENT_KEYS =
  STORAGE_V13_MATRIX_ENVIRONMENT_KEYS;

const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_BINDING = Object.freeze({
  path: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH,
  schemaId: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID,
  canonicalSha256: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256
});

const PROJECT_NAMES = Object.freeze(["msedge", "chrome"]);
const RECEIPT_FILE_NAME = "browser-receipt.json";
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const TERMINAL_COMMIT_BYTES = 65;
const MAX_DOWNLOAD_BYTES = 120 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CAPTURE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const DOWNLOAD_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/u;
const DOWNLOAD_FILENAME_PATTERNS_BY_OPERATION = Object.freeze({
  export: /^hakimi-full-backup-\d{4}-\d{2}-\d{2}\.zip$/u,
  restore: /^hakimi-before-restore-\d{4}-\d{2}-\d{2}\.zip$/u
});
const SNAPSHOT_KEYS = Object.freeze([
  "schemaVersion",
  "recordType",
  "captureId",
  "operationId",
  "phase",
  "capturedAt",
  "databaseName",
  "physicalVersion",
  "dexieVersion",
  "transactionMode",
  "storeNames",
  "stores",
  "semanticWitness",
  "snapshotDigest"
]);
const SNAPSHOT_STORE_KEYS = Object.freeze([
  "storeName",
  "count",
  "recordsDigest",
  "logicalContentDigest"
]);
const SEMANTIC_WITNESS_KEYS = Object.freeze([
  "witnessType",
  "maximumEntriesPerCollection",
  "cases",
  "revisions",
  "revisionFingerprints",
  "candidateSetFingerprintInventory",
  "witnessDigest"
]);
const SEMANTIC_CASE_KEYS = Object.freeze([
  "caseIdDigest",
  "latestRevisionIdDigest",
  "revisionCount",
  "lifecycleState",
  "lifecycleIndependentRecordDigest",
  "editStableRecordDigest",
  "recordDigest"
]);
const SEMANTIC_REVISION_KEYS = Object.freeze([
  "revisionIdDigest",
  "caseIdDigest",
  "revisionNumber",
  "recordDigest"
]);
const SEMANTIC_FINGERPRINT_KEYS = Object.freeze([
  "sourceIdDigest",
  "subjectIdDigest",
  "recordDigest"
]);
const SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_KEYS = Object.freeze([
  "count",
  "logicalContentDigest"
]);
const OPERATION_KEYS = Object.freeze([
  "operationId",
  "status",
  "uiPath",
  "observationMethod",
  "captures",
  "download",
  "backup",
  "safetyBackup"
]);
const DOWNLOAD_KEYS = Object.freeze([
  "observed",
  "eventCount",
  "size",
  "sha256",
  "suggestedFilename"
]);
const BACKUP_PROJECTION_KEYS = Object.freeze([
  "formatVersion",
  "payloadDigest",
  "logicalPartitionNames",
  "counts",
  "sharedPartitionContentDigests"
]);
const FORMAL_RECEIPT_IDS = Object.freeze([
  "backup",
  "artifact-stability",
  "boot",
  "build",
  "built-contract",
  "cross-schema-v13-v16",
  "evidence-tooling",
  "governance",
  "orphaned-v13-recovery",
  "pwa",
  "typecheck",
  "unit",
  "web-v1-flow"
]);

export class StorageV13MatrixCandidateVerificationError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "StorageV13MatrixCandidateVerificationError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new StorageV13MatrixCandidateVerificationError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function requireCondition(condition, code, message) {
  if (!condition) fail(code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function compareCanonicalText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    fail(
      "STORAGE_V13_MATRIX_VERIFIER_PATH_OUTSIDE_ROOT",
      `${label} must remain a ${allowEqual ? "bound path" : "strict descendant"} of its root.`
    );
  }
  return relative.split(path.sep).join("/");
}

function requirePrivateOutputRoot(bindingRoot, outputRoot) {
  const relative = relativeBoundPath(bindingRoot, outputRoot, "Candidate output root");
  requireCondition(
    relative.split("/")[0] === "tmp",
    "STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SCOPE_INVALID",
    "The untrusted candidate output must remain under the workspace tmp/ root."
  );
}

function requireCanonicalTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  requireCondition(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    "STORAGE_V13_MATRIX_VERIFIER_TIMESTAMP_INVALID",
    `${label} must be a canonical UTC ISO instant.`
  );
  return parsed;
}

function environmentFromInput(input) {
  return {
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.origin]: input.origin,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.outputRoot]: input.outputRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.bindingRoot]: input.bindingRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactRoot]: input.artifactRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactLock]: input.artifactLock,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.releaseEvidenceId]: input.releaseEvidenceId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.runId]: input.runId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.attemptId]: input.attemptId
  };
}

export function parseStorageV13MatrixCandidateVerifierInput(input) {
  const keys = [
    "origin",
    "outputRoot",
    "bindingRoot",
    "artifactRoot",
    "artifactLock",
    "releaseEvidenceId",
    "runId",
    "attemptId"
  ];
  requireCondition(
    exactKeys(input, keys),
    "STORAGE_V13_MATRIX_VERIFIER_INPUT_INVALID",
    "Verifier input must contain the exact eight storage-v13 candidate fields."
  );
  const parsed = parseStorageV13MatrixCandidateEnvironment(environmentFromInput(input));
  requirePrivateOutputRoot(parsed.bindingRoot, parsed.outputRoot);
  return parsed;
}

export function parseStorageV13MatrixCandidateVerifierEnvironment(environment = process.env) {
  requireCondition(
    isRecord(environment),
    "STORAGE_V13_MATRIX_VERIFIER_INPUT_INVALID",
    "Verifier environment must be an object."
  );
  const input = {};
  for (const [field, environmentKey] of Object.entries(STORAGE_V13_MATRIX_ENVIRONMENT_KEYS)) {
    const value = environment[environmentKey];
    requireCondition(
      typeof value === "string" && value.length > 0 && value.trim() === value,
      "STORAGE_V13_MATRIX_VERIFIER_ENVIRONMENT_MISSING",
      `${environmentKey} must be explicit and free of surrounding whitespace.`
    );
    input[field] = value;
  }
  return parseStorageV13MatrixCandidateVerifierInput(input);
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
      fail("STORAGE_V13_MATRIX_VERIFIER_PATH_UNSAFE", `${label} cannot be inspected.`, error);
    }
    requireCondition(
      !metadata.isSymbolicLink(),
      "STORAGE_V13_MATRIX_VERIFIER_PATH_UNSAFE",
      `${label} cannot traverse a symlink or junction.`
    );
  }
}

async function captureDirectoryLock(directoryPath, label) {
  let metadata;
  let resolved;
  try {
    [metadata, resolved] = await Promise.all([
      lstat(directoryPath, { bigint: true }),
      realpath(directoryPath)
    ]);
  } catch (error) {
    fail("STORAGE_V13_MATRIX_VERIFIER_DIRECTORY_UNSAFE", `${label} could not be locked.`, error);
  }
  requireCondition(
    metadata.isDirectory()
      && !metadata.isSymbolicLink()
      && metadata.ino !== 0n
      && comparablePath(resolved) === comparablePath(directoryPath),
    "STORAGE_V13_MATRIX_VERIFIER_DIRECTORY_UNSAFE",
    `${label} must be a real, non-aliased directory with filesystem identity.`
  );
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

async function assertDirectoryLock(directoryPath, expected, label) {
  const current = await captureDirectoryLock(directoryPath, label);
  requireCondition(
    sameDirectoryLock(expected, current),
    "STORAGE_V13_MATRIX_VERIFIER_DIRECTORY_REBOUND",
    `${label} changed during verification.`
  );
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

async function openHeldFile({ bindingRoot, filePath, label }) {
  await assertNoAliases(bindingRoot, filePath, label);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    fail("STORAGE_V13_MATRIX_VERIFIER_FILE_UNSAFE", `${label} could not be opened.`, error);
  }
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      before.isFile()
        && before.ino !== 0n
        && before.nlink === 1n
        && before.size > 0n
        && before.size <= BigInt(MAX_JSON_BYTES)
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && pathBefore.nlink === 1n
        && sameFileIdentity(before, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(filePath),
      "STORAGE_V13_MATRIX_VERIFIER_FILE_UNSAFE",
      `${label} must be a bounded single-link regular file.`
    );
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      sameFileIdentity(before, after)
        && sameFileIdentity(after, pathAfter)
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && after.size === pathAfter.size
        && after.mtimeNs === pathAfter.mtimeNs
        && after.ctimeNs === pathAfter.ctimeNs
        && after.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter)
        && bytes.byteLength === Number(before.size),
      "STORAGE_V13_MATRIX_VERIFIER_FILE_REBOUND",
      `${label} changed during its initial held-file read.`
    );
    return {
      handle,
      filePath,
      label,
      bytes,
      metadata: after,
      resolvedPath: comparablePath(resolvedAfter),
      identity: Object.freeze({ dev: String(after.dev), ino: String(after.ino), realPath: comparablePath(resolvedAfter) }),
      binding: Object.freeze({
        path: relativeBoundPath(bindingRoot, filePath, `${label} binding`),
        size: bytes.byteLength,
        sha256: sha256(bytes)
      })
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldFileStable(held, stage) {
  const bytes = await readOpenedFileBoundedAtZero(held.handle, Number(held.metadata.size));
  const [after, pathAfter, resolvedAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.filePath, { bigint: true }),
    realpath(held.filePath)
  ]);
  requireCondition(
    sameFileIdentity(held.metadata, after)
      && sameFileIdentity(after, pathAfter)
      && held.metadata.size === after.size
      && held.metadata.mtimeNs === after.mtimeNs
      && held.metadata.ctimeNs === after.ctimeNs
      && after.size === pathAfter.size
      && after.mtimeNs === pathAfter.mtimeNs
      && after.ctimeNs === pathAfter.ctimeNs
      && after.nlink === 1n
      && pathAfter.nlink === 1n
      && !pathAfter.isSymbolicLink()
      && held.resolvedPath === comparablePath(resolvedAfter)
      && bytes.byteLength === held.bytes.byteLength
      && sha256(bytes) === held.binding.sha256,
    "STORAGE_V13_MATRIX_VERIFIER_FILE_REBOUND",
    `${held.label} changed ${stage}.`
  );
}

function assertGloballyDistinctHeldFiles(heldFiles) {
  const inodeIdentities = heldFiles.map((held) => `${held.identity.dev}:${held.identity.ino}`);
  const realPaths = heldFiles.map((held) => held.identity.realPath);
  requireCondition(
    new Set(inodeIdentities).size === heldFiles.length
      && new Set(realPaths).size === heldFiles.length,
    "STORAGE_V13_MATRIX_VERIFIER_FILE_IDENTITY_REUSED",
    "Every receipt, attachment, and checked source must have a distinct physical identity."
  );
}

function parseHeldJson(held) {
  try {
    return parseProviderDeploymentCandidateLoaderJsonBytes(held.bytes, held.label);
  } catch (error) {
    fail("STORAGE_V13_MATRIX_VERIFIER_JSON_INVALID", `${held.label} is not strict JSON.`, error);
  }
}

function validateTerminalCommitMarker({ terminalCommitHeld, summaryHeld }) {
  const expectedBytes = Buffer.from(`${summaryHeld.binding.sha256}\n`, "utf8");
  requireCondition(
    expectedBytes.byteLength === TERMINAL_COMMIT_BYTES
      && terminalCommitHeld.bytes.byteLength === TERMINAL_COMMIT_BYTES
      && /^[a-f0-9]{64}\n$/u.test(terminalCommitHeld.bytes.toString("utf8"))
      && terminalCommitHeld.bytes.equals(expectedBytes),
    "STORAGE_V13_MATRIX_VERIFIER_TERMINAL_COMMIT_INVALID",
    "Candidate terminal commit marker must be the exact raw summary SHA-256 plus one LF."
  );
  return Object.freeze({
    ...terminalCommitHeld.binding,
    commitsSummarySha256: summaryHeld.binding.sha256
  });
}

function expectedAttachmentSpecs(policy) {
  const specs = [];
  let sequence = 0;
  for (let operationIndex = 0; operationIndex < policy.observedOperations.length; operationIndex += 1) {
    const operation = policy.observedOperations[operationIndex];
    for (let captureIndex = 0; captureIndex < operation.capturePhases.length; captureIndex += 1) {
      sequence += 1;
      const phase = operation.capturePhases[captureIndex];
      specs.push(Object.freeze({
        operationIndex,
        captureIndex,
        operationId: operation.operationId,
        phase,
        sequence,
        fileName: `${String(operationIndex + 1).padStart(2, "0")}-${operation.operationId}-${String(captureIndex + 1).padStart(2, "0")}-${phase}.json`
      }));
    }
  }
  requireCondition(
    specs.length === 16,
    "STORAGE_V13_MATRIX_VERIFIER_POLICY_ATTACHMENT_COUNT_INVALID",
    "The frozen v2 candidate policy must derive exactly 16 attachments per browser."
  );
  return Object.freeze(specs);
}

function assertExactNames(actualNames, expectedNames, code, label) {
  requireCondition(
    exactJson([...actualNames].sort(), [...expectedNames].sort()),
    code,
    `${label} must contain exactly the fixed candidate entries.`
  );
}

function assertFormalReceiptDecisionIdsExcluded(decisions) {
  const commands = decisions?.releaseEvidence?.defaultV13RequiredReceiptCommands;
  requireCondition(
    isRecord(commands)
      && exactJson(Object.keys(commands), FORMAL_RECEIPT_IDS)
      && !canonicalJson(commands).includes("storage-v13-matrix"),
    "STORAGE_V13_MATRIX_VERIFIER_FORMAL_RECEIPT_DECISION_IDS_REBOUND",
    "The formal default-v13 receipt decision id set must remain the exact 13-item set without this candidate."
  );
}

function snapshotProjection(snapshot) {
  return {
    databaseName: snapshot.databaseName,
    physicalVersion: snapshot.physicalVersion,
    dexieVersion: snapshot.dexieVersion,
    transactionMode: snapshot.transactionMode,
    storeNames: snapshot.storeNames,
    stores: snapshot.stores,
    semanticWitness: snapshot.semanticWitness
  };
}

function semanticWitnessProjection(witness) {
  return {
    witnessType: witness.witnessType,
    maximumEntriesPerCollection: witness.maximumEntriesPerCollection,
    cases: witness.cases,
    revisions: witness.revisions,
    revisionFingerprints: witness.revisionFingerprints,
    candidateSetFingerprintInventory: witness.candidateSetFingerprintInventory
  };
}

function requireUniqueSemanticDigests(values, label) {
  requireCondition(
    new Set(values).size === values.length,
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_WITNESS_DUPLICATE",
    `${label} must not contain duplicate digests.`
  );
}

function assertSemanticWitness(witness, label) {
  requireCondition(
    exactKeys(witness, SEMANTIC_WITNESS_KEYS)
      && witness.witnessType === "bounded_hashed_case_revision_relationships_v1"
      && witness.maximumEntriesPerCollection === STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && Array.isArray(witness.cases)
      && Array.isArray(witness.revisions)
      && Array.isArray(witness.revisionFingerprints)
      && isRecord(witness.candidateSetFingerprintInventory)
      && witness.cases.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && witness.revisions.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && witness.revisionFingerprints.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES,
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_WITNESS_INVALID",
    `${label} semantic witness shape or bound is invalid.`
  );
  for (const entry of witness.cases) {
    requireCondition(
      exactKeys(entry, SEMANTIC_CASE_KEYS)
        && SHA256_PATTERN.test(entry.caseIdDigest ?? "")
        && SHA256_PATTERN.test(entry.latestRevisionIdDigest ?? "")
        && Number.isSafeInteger(entry.revisionCount)
        && entry.revisionCount > 0
        && (entry.lifecycleState === "active" || entry.lifecycleState === "trashed")
        && SHA256_PATTERN.test(entry.lifecycleIndependentRecordDigest ?? "")
        && SHA256_PATTERN.test(entry.editStableRecordDigest ?? "")
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_CASE_INVALID",
      `${label} contains an invalid hashed Case witness.`
    );
  }
  for (const entry of witness.revisions) {
    requireCondition(
      exactKeys(entry, SEMANTIC_REVISION_KEYS)
        && SHA256_PATTERN.test(entry.revisionIdDigest ?? "")
        && SHA256_PATTERN.test(entry.caseIdDigest ?? "")
        && Number.isSafeInteger(entry.revisionNumber)
        && entry.revisionNumber > 0
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_REVISION_INVALID",
      `${label} contains an invalid hashed Revision witness.`
    );
  }
  for (const entry of witness.revisionFingerprints) {
    requireCondition(
      exactKeys(entry, SEMANTIC_FINGERPRINT_KEYS)
        && SHA256_PATTERN.test(entry.sourceIdDigest ?? "")
        && SHA256_PATTERN.test(entry.subjectIdDigest ?? "")
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_FINGERPRINT_INVALID",
      `${label} contains an invalid hashed revision fingerprint witness.`
    );
  }
  requireCondition(
    exactKeys(
      witness.candidateSetFingerprintInventory,
      SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_KEYS
    )
      && Number.isSafeInteger(witness.candidateSetFingerprintInventory.count)
      && witness.candidateSetFingerprintInventory.count >= 0
      && SHA256_PATTERN.test(
        witness.candidateSetFingerprintInventory.logicalContentDigest ?? ""
      ),
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_INVALID",
    `${label} candidate-set fingerprint aggregate is invalid.`
  );
  requireUniqueSemanticDigests(witness.cases.map((entry) => entry.caseIdDigest), `${label} Case ids`);
  requireUniqueSemanticDigests(witness.cases.map((entry) => entry.recordDigest), `${label} Case records`);
  requireUniqueSemanticDigests(witness.revisions.map((entry) => entry.revisionIdDigest), `${label} Revision ids`);
  requireUniqueSemanticDigests(witness.revisions.map((entry) => entry.recordDigest), `${label} Revision records`);
  requireUniqueSemanticDigests(
    witness.revisionFingerprints.map((entry) => entry.sourceIdDigest),
    `${label} revision fingerprint source ids`
  );
  requireUniqueSemanticDigests(
    witness.revisionFingerprints.map((entry) => entry.recordDigest),
    `${label} revision fingerprint records`
  );
  requireCondition(
    exactJson(witness.cases, [...witness.cases].sort((left, right) =>
      compareCanonicalText(left.caseIdDigest, right.caseIdDigest)))
      && exactJson(witness.revisions, [...witness.revisions].sort((left, right) =>
        compareCanonicalText(left.caseIdDigest, right.caseIdDigest)
          || left.revisionNumber - right.revisionNumber
          || compareCanonicalText(left.revisionIdDigest, right.revisionIdDigest)))
      && exactJson(witness.revisionFingerprints, [...witness.revisionFingerprints].sort((left, right) =>
        compareCanonicalText(left.subjectIdDigest, right.subjectIdDigest)
          || compareCanonicalText(left.sourceIdDigest, right.sourceIdDigest))),
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_WITNESS_ORDER_INVALID",
    `${label} semantic witness collections are not canonically ordered.`
  );
  const caseMap = new Map(witness.cases.map((entry) => [entry.caseIdDigest, entry]));
  const revisionsByCase = new Map(witness.cases.map((entry) => [entry.caseIdDigest, []]));
  for (const revision of witness.revisions) {
    requireCondition(
      caseMap.has(revision.caseIdDigest),
      "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_ORPHAN_REVISION",
      `${label} contains a Revision outside the complete Case inventory.`
    );
    revisionsByCase.get(revision.caseIdDigest).push(revision);
  }
  for (const caseEntry of witness.cases) {
    const revisions = revisionsByCase.get(caseEntry.caseIdDigest);
    requireCondition(
      revisions.length === caseEntry.revisionCount
        && revisions.every((revision, index) => revision.revisionNumber === index + 1)
        && revisions.at(-1)?.revisionIdDigest === caseEntry.latestRevisionIdDigest,
      "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_CASE_REVISION_MISMATCH",
      `${label} Case latestRevisionId/revisionCount is not bound to its complete Revision inventory.`
    );
  }
  const revisionMap = new Map(witness.revisions.map((entry) => [entry.revisionIdDigest, entry]));
  requireCondition(
    witness.revisionFingerprints.length === witness.revisions.length
      && witness.revisionFingerprints.every((entry) => {
        const revision = revisionMap.get(entry.sourceIdDigest);
        return revision?.caseIdDigest === entry.subjectIdDigest;
      }),
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_FINGERPRINT_RELATION_INVALID",
    `${label} revision fingerprints do not exactly cover the Revision inventory.`
  );
  requireCondition(
    SHA256_PATTERN.test(witness.witnessDigest ?? "")
      && witness.witnessDigest === sha256(canonicalJson(semanticWitnessProjection(witness))),
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_WITNESS_DIGEST_INVALID",
    `${label} semantic witness digest is invalid.`
  );
  return witness;
}

function assertSnapshot(snapshot, expected, receipt, previousCapturedAt) {
  requireCondition(
    exactKeys(snapshot, SNAPSHOT_KEYS),
    "STORAGE_V13_MATRIX_VERIFIER_SNAPSHOT_SHAPE_INVALID",
    `${receipt.projectName} ${expected.operationId}/${expected.phase} snapshot shape is invalid.`
  );
  const expectedCaptureId = `${receipt.receiptId}-${String(expected.sequence).padStart(2, "0")}`;
  requireCondition(
    snapshot.schemaVersion === 2
      && snapshot.recordType === "storage_v13_native_readonly_snapshot_v2"
      && typeof snapshot.captureId === "string"
      && CAPTURE_ID_PATTERN.test(snapshot.captureId)
      && snapshot.captureId === expectedCaptureId
      && snapshot.operationId === expected.operationId
      && snapshot.phase === expected.phase
      && snapshot.databaseName === "hakimi-bazi-research"
      && snapshot.physicalVersion === 130
      && snapshot.dexieVersion === 13
      && snapshot.transactionMode === "readonly"
      && exactJson(snapshot.storeNames, STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES)
      && Array.isArray(snapshot.stores)
      && snapshot.stores.length === STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.length,
    "STORAGE_V13_MATRIX_VERIFIER_SNAPSHOT_IDENTITY_INVALID",
    `${receipt.projectName} ${expected.operationId}/${expected.phase} is not the exact ordered native readonly v13 capture.`
  );
  const capturedAt = requireCanonicalTimestamp(
    snapshot.capturedAt,
    `${receipt.projectName} ${expected.operationId}/${expected.phase} capturedAt`
  );
  requireCondition(
    capturedAt >= receipt.startedTimestamp
      && capturedAt <= receipt.completedTimestamp
      && capturedAt >= previousCapturedAt,
    "STORAGE_V13_MATRIX_VERIFIER_CAPTURE_TIME_ORDER_INVALID",
    `${receipt.projectName} capture timestamps must be nondecreasing and inside the receipt interval.`
  );
  for (let index = 0; index < snapshot.stores.length; index += 1) {
    const store = snapshot.stores[index];
    requireCondition(
      exactKeys(store, SNAPSHOT_STORE_KEYS)
        && store.storeName === STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES[index]
        && Number.isSafeInteger(store.count)
        && store.count >= 0
        && SHA256_PATTERN.test(store.recordsDigest ?? "")
        && (store.storeName === "birthFingerprints"
          ? store.logicalContentDigest === null
          : SHA256_PATTERN.test(store.logicalContentDigest ?? "")),
      "STORAGE_V13_MATRIX_VERIFIER_STORE_SNAPSHOT_INVALID",
      `${receipt.projectName} ${expected.operationId}/${expected.phase} store projection is invalid.`
    );
  }
  assertSemanticWitness(snapshot.semanticWitness, `${receipt.projectName} ${expected.operationId}/${expected.phase}`);
  const storeMap = new Map(snapshot.stores.map((store) => [store.storeName, store]));
  requireCondition(
    snapshot.semanticWitness.cases.length === storeMap.get("cases")?.count
      && snapshot.semanticWitness.revisions.length === storeMap.get("revisions")?.count
      && snapshot.semanticWitness.revisionFingerprints.length
        + snapshot.semanticWitness.candidateSetFingerprintInventory.count
        === storeMap.get("birthFingerprints")?.count,
    "STORAGE_V13_MATRIX_VERIFIER_SEMANTIC_WITNESS_CARDINALITY_MISMATCH",
    `${receipt.projectName} ${expected.operationId}/${expected.phase} semantic inventory does not cover the Case, Revision, and typed birth-fingerprint stores.`
  );
  requireCondition(
    SHA256_PATTERN.test(snapshot.snapshotDigest ?? "")
      && snapshot.snapshotDigest === sha256(canonicalJson(snapshotProjection(snapshot))),
    "STORAGE_V13_MATRIX_VERIFIER_SNAPSHOT_DIGEST_INVALID",
    `${receipt.projectName} ${expected.operationId}/${expected.phase} snapshot digest is invalid.`
  );
  return Object.freeze({ snapshot, capturedAt });
}

function storesByName(snapshot) {
  return new Map(snapshot.stores.map((store) => [store.storeName, store]));
}

function changedStores(before, after) {
  const left = storesByName(before);
  const right = storesByName(after);
  return STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.filter((storeName) => {
    const beforeStore = left.get(storeName);
    const afterStore = right.get(storeName);
    const semanticChanged = storeName === "cases"
      ? !exactJson(before.semanticWitness.cases, after.semanticWitness.cases)
      : storeName === "revisions"
        ? !exactJson(before.semanticWitness.revisions, after.semanticWitness.revisions)
        : storeName === "birthFingerprints"
          ? !exactJson({
            revisionFingerprints: before.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              before.semanticWitness.candidateSetFingerprintInventory
          }, {
            revisionFingerprints: after.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              after.semanticWitness.candidateSetFingerprintInventory
          })
          : false;
    return beforeStore.count !== afterStore.count
      || beforeStore.recordsDigest !== afterStore.recordsDigest
      || beforeStore.logicalContentDigest !== afterStore.logicalContentDigest
      || semanticChanged;
  });
}

function countDelta(before, after, storeName) {
  return storesByName(after).get(storeName).count - storesByName(before).get(storeName).count;
}

function requireSameSnapshot(left, right, label) {
  requireCondition(
    left.snapshotDigest === right.snapshotDigest,
    "STORAGE_V13_MATRIX_VERIFIER_UNEXPECTED_MUTATION",
    `${label} must preserve the exact native readonly snapshot digest.`
  );
}

function requireAdjacentSnapshot(left, right, label) {
  requireCondition(
    left.snapshotDigest === right.snapshotDigest,
    "STORAGE_V13_MATRIX_VERIFIER_OPERATION_ADJACENCY_INVALID",
    `${label} must join at one exact native readonly snapshot digest.`
  );
}

function validateDownload(download, operationId, projectName) {
  const operationFilenamePattern = DOWNLOAD_FILENAME_PATTERNS_BY_OPERATION[operationId];
  const expected = operationFilenamePattern !== undefined;
  if (expected) {
    requireCondition(
      exactKeys(download, DOWNLOAD_KEYS)
        && download.observed === true
        && download.eventCount === 1
        && Number.isSafeInteger(download.size)
        && download.size > 0
        && download.size <= MAX_DOWNLOAD_BYTES
        && SHA256_PATTERN.test(download.sha256 ?? "")
        && typeof download.suggestedFilename === "string"
        && DOWNLOAD_FILENAME_PATTERN.test(download.suggestedFilename)
        && operationFilenamePattern.test(download.suggestedFilename),
      "STORAGE_V13_MATRIX_VERIFIER_DOWNLOAD_INVALID",
      `${projectName} ${operationId} requires one exact downloaded artifact observation.`
    );
  } else {
    requireCondition(
      exactJson(download, {
        observed: false,
        eventCount: 0,
        size: null,
        sha256: null,
        suggestedFilename: null
      }),
      "STORAGE_V13_MATRIX_VERIFIER_DOWNLOAD_INVALID",
      `${projectName} ${operationId} must not report a download.`
    );
  }
}

function validateBackup(backup, operationId, projectName) {
  const expected = operationId === "export" || operationId === "restore";
  if (!expected) {
    requireCondition(
      backup === null,
      "STORAGE_V13_MATRIX_VERIFIER_BACKUP_INVALID",
      `${projectName} ${operationId} must not carry a backup projection.`
    );
    return;
  }
  requireCondition(
    exactKeys(backup, BACKUP_PROJECTION_KEYS)
      && backup.formatVersion === "1.2.0"
      && SHA256_PATTERN.test(backup.payloadDigest ?? "")
      && exactJson(backup.logicalPartitionNames, STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES)
      && isRecord(backup.counts)
      && exactJson(Object.keys(backup.counts).sort(), [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES].sort())
      && Object.values(backup.counts).every((count) => Number.isSafeInteger(count) && count >= 0)
      && backup.counts.revisionCalculationReceipts === 0
      && !("birthFingerprints" in backup.counts)
      && isRecord(backup.sharedPartitionContentDigests)
      && exactJson(
        Object.keys(backup.sharedPartitionContentDigests).sort(),
        [...STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES].sort()
      )
      && Object.values(backup.sharedPartitionContentDigests)
        .every((digest) => SHA256_PATTERN.test(digest)),
    "STORAGE_V13_MATRIX_VERIFIER_BACKUP_INVALID",
    `${projectName} ${operationId} backup projection is invalid or mixes logical and physical sets.`
  );
}

function validateSafetyBackup(safetyBackup, operationId, projectName) {
  if (operationId !== "restore") {
    requireCondition(
      safetyBackup === null,
      "STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_INVALID",
      `${projectName} ${operationId} must not carry a restore safety-backup projection.`
    );
    return;
  }
  requireCondition(
    exactKeys(safetyBackup, BACKUP_PROJECTION_KEYS)
      && safetyBackup.formatVersion === "1.2.0"
      && SHA256_PATTERN.test(safetyBackup.payloadDigest ?? "")
      && exactJson(
        safetyBackup.logicalPartitionNames,
        STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES
      )
      && isRecord(safetyBackup.counts)
      && exactJson(
        Object.keys(safetyBackup.counts).sort(),
        [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES].sort()
      )
      && Object.values(safetyBackup.counts).every(
        (count) => Number.isSafeInteger(count) && count >= 0
      )
      && safetyBackup.counts.revisionCalculationReceipts === 0
      && !("birthFingerprints" in safetyBackup.counts)
      && isRecord(safetyBackup.sharedPartitionContentDigests)
      && exactJson(
        Object.keys(safetyBackup.sharedPartitionContentDigests).sort(),
        [...STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES].sort()
      )
      && Object.values(safetyBackup.sharedPartitionContentDigests)
        .every((digest) => SHA256_PATTERN.test(digest)),
    "STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_INVALID",
    `${projectName} restore safety backup is not the exact logical-16 projection.`
  );
}

function requireSafetyBackupContentMatchSnapshot(safetyBackup, snapshot, projectName) {
  const snapshotStores = storesByName(snapshot);
  requireCondition(
    STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.length === 15
      && STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.every(
        (partitionName) => safetyBackup.counts[partitionName] === snapshotStores.get(partitionName).count
          && safetyBackup.sharedPartitionContentDigests[partitionName]
            === snapshotStores.get(partitionName).logicalContentDigest
      ),
    "STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_CONTENT_MISMATCH",
    `${projectName} restore safety-backup counts and canonical-multiset content digests must equal before_commit for all 15 shared partitions.`
  );
}

function requireExportBackupContentMatchSnapshot(backup, snapshot, projectName) {
  const snapshotStores = storesByName(snapshot);
  requireCondition(
    STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.length === 15
      && STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.every(
        (partitionName) => backup.counts[partitionName] === snapshotStores.get(partitionName).count
          && backup.sharedPartitionContentDigests[partitionName]
            === snapshotStores.get(partitionName).logicalContentDigest
      ),
    "STORAGE_V13_MATRIX_VERIFIER_EXPORT_BACKUP_CONTENT_MISMATCH",
    `${projectName} export backup counts and canonical-multiset content digests must equal after_ui_read for all 15 shared partitions.`
  );
}

function semanticDiff(beforeEntries, afterEntries, keyName) {
  const before = new Map(beforeEntries.map((entry) => [entry[keyName], entry]));
  const after = new Map(afterEntries.map((entry) => [entry[keyName], entry]));
  return Object.freeze({
    added: Object.freeze([...after.entries()].filter(([key]) => !before.has(key)).map(([, value]) => value)),
    removed: Object.freeze([...before.entries()].filter(([key]) => !after.has(key)).map(([, value]) => value)),
    changed: Object.freeze([...before.entries()].filter(([key, value]) =>
      after.has(key) && !exactJson(value, after.get(key))).map(([key, value]) =>
      Object.freeze({ before: value, after: after.get(key) }))),
    unchanged: Object.freeze([...before.entries()].filter(([key, value]) =>
      after.has(key) && exactJson(value, after.get(key))).map(([, value]) => value))
  });
}

function requireCreateSemanticRelationship(beforeSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const cases = semanticDiff(before.cases, after.cases, "caseIdDigest");
  const revisions = semanticDiff(before.revisions, after.revisions, "revisionIdDigest");
  const fingerprints = semanticDiff(
    before.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const createdCase = cases.added[0];
  const createdRevision = revisions.added[0];
  const createdFingerprint = fingerprints.added[0];
  requireCondition(
    cases.added.length === 1 && cases.removed.length === 0 && cases.changed.length === 0
      && revisions.added.length === 1 && revisions.removed.length === 0 && revisions.changed.length === 0
      && fingerprints.added.length === 1
      && fingerprints.removed.length === 0
      && fingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      )
      && createdCase.lifecycleState === "active"
      && createdCase.revisionCount === 1
      && createdCase.latestRevisionIdDigest === createdRevision.revisionIdDigest
      && createdRevision.caseIdDigest === createdCase.caseIdDigest
      && createdRevision.revisionNumber === 1
      && createdFingerprint.sourceIdDigest === createdRevision.revisionIdDigest
      && createdFingerprint.subjectIdDigest === createdCase.caseIdDigest,
    "STORAGE_V13_MATRIX_VERIFIER_CREATE_SEMANTIC_RELATION_INVALID",
    "Create must append exactly one Case, its first Revision, and the matching revision fingerprint without rewriting prior records."
  );
}

function requireEditSemanticRelationship(beforeSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const cases = semanticDiff(before.cases, after.cases, "caseIdDigest");
  const revisions = semanticDiff(before.revisions, after.revisions, "revisionIdDigest");
  const fingerprints = semanticDiff(
    before.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const changedCase = cases.changed[0];
  const newRevision = revisions.added[0];
  const newFingerprint = fingerprints.added[0];
  requireCondition(
    cases.added.length === 0 && cases.removed.length === 0 && cases.changed.length === 1
      && revisions.added.length === 1 && revisions.removed.length === 0 && revisions.changed.length === 0
      && fingerprints.added.length === 1
      && fingerprints.removed.length === 0
      && fingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      )
      && changedCase.before.lifecycleState === "active"
      && changedCase.after.lifecycleState === "active"
      && changedCase.before.editStableRecordDigest === changedCase.after.editStableRecordDigest
      && changedCase.after.revisionCount === changedCase.before.revisionCount + 1
      && newRevision.caseIdDigest === changedCase.after.caseIdDigest
      && newRevision.revisionNumber === changedCase.after.revisionCount
      && changedCase.after.latestRevisionIdDigest === newRevision.revisionIdDigest
      && before.revisions.some((entry) =>
        entry.revisionIdDigest === changedCase.before.latestRevisionIdDigest)
      && newFingerprint.sourceIdDigest === newRevision.revisionIdDigest
      && newFingerprint.subjectIdDigest === changedCase.after.caseIdDigest,
    "STORAGE_V13_MATRIX_VERIFIER_EDIT_SEMANTIC_RELATION_INVALID",
    "Edit must append one Revision, preserve every old Revision byte digest, and advance only the owning Case latest pointer/count."
  );
}

function requireDeleteSemanticRelationship(beforeSnapshot, trashedSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const trashed = trashedSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const trashCases = semanticDiff(before.cases, trashed.cases, "caseIdDigest");
  const trashRevisions = semanticDiff(before.revisions, trashed.revisions, "revisionIdDigest");
  const trashFingerprints = semanticDiff(
    before.revisionFingerprints,
    trashed.revisionFingerprints,
    "sourceIdDigest"
  );
  const lifecycleChange = trashCases.changed[0];
  requireCondition(
    trashCases.added.length === 0 && trashCases.removed.length === 0 && trashCases.changed.length === 1
      && trashRevisions.added.length === 0
      && trashRevisions.removed.length === 0
      && trashRevisions.changed.length === 0
      && trashFingerprints.added.length === 0
      && trashFingerprints.removed.length === 0
      && trashFingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        trashed.candidateSetFingerprintInventory
      )
      && lifecycleChange.before.lifecycleState === "active"
      && lifecycleChange.after.lifecycleState === "trashed"
      && lifecycleChange.before.caseIdDigest === lifecycleChange.after.caseIdDigest
      && lifecycleChange.before.latestRevisionIdDigest === lifecycleChange.after.latestRevisionIdDigest
      && lifecycleChange.before.revisionCount === lifecycleChange.after.revisionCount
      && lifecycleChange.before.lifecycleIndependentRecordDigest
        === lifecycleChange.after.lifecycleIndependentRecordDigest
      && lifecycleChange.before.recordDigest !== lifecycleChange.after.recordDigest,
    "STORAGE_V13_MATRIX_VERIFIER_DELETE_TRASH_PRECONDITION_INVALID",
    "Delete must first observe one active Case becoming trashed while every Revision and revision fingerprint remains unchanged."
  );

  const deletedCases = semanticDiff(trashed.cases, after.cases, "caseIdDigest");
  const deletedRevisions = semanticDiff(trashed.revisions, after.revisions, "revisionIdDigest");
  const deletedFingerprints = semanticDiff(
    trashed.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const targetCase = lifecycleChange.after;
  const targetRevisions = trashed.revisions.filter(
    (entry) => entry.caseIdDigest === targetCase.caseIdDigest
  );
  const targetRevisionIds = new Set(targetRevisions.map((entry) => entry.revisionIdDigest));
  requireCondition(
    deletedCases.added.length === 0
      && deletedCases.removed.length === 1
      && deletedCases.removed[0].caseIdDigest === targetCase.caseIdDigest
      && deletedCases.changed.length === 0
      && deletedRevisions.added.length === 0
      && deletedRevisions.changed.length === 0
      && deletedRevisions.removed.length === targetCase.revisionCount
      && deletedRevisions.removed.every((entry) => targetRevisionIds.has(entry.revisionIdDigest))
      && deletedFingerprints.added.length === 0
      && deletedFingerprints.changed.length === 0
      && deletedFingerprints.removed.length === targetRevisionIds.size
      && deletedFingerprints.removed.every((entry) =>
        targetRevisionIds.has(entry.sourceIdDigest)
          && entry.subjectIdDigest === targetCase.caseIdDigest)
      && exactJson(
        trashed.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      ),
    "STORAGE_V13_MATRIX_VERIFIER_DELETE_SEMANTIC_RELATION_INVALID",
    "Permanent delete must remove only the already-trashed Case and its exact Revision/fingerprint graph."
  );
}

async function captureExactArtifactFilesystemBinding({ bindingRoot, target, label, expectedKind }) {
  await assertNoAliases(bindingRoot, target, label);
  let metadata;
  let resolved;
  try {
    [metadata, resolved] = await Promise.all([
      lstat(target, { bigint: true }),
      realpath(target)
    ]);
  } catch (error) {
    fail(
      "STORAGE_V13_MATRIX_VERIFIER_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
      `${label} cannot be independently inspected.`,
      error
    );
  }
  requireCondition(
    (expectedKind === "directory" ? metadata.isDirectory() : metadata.isFile())
      && !metadata.isSymbolicLink()
      && metadata.ino !== 0n
      && comparablePath(resolved) === comparablePath(target),
    "STORAGE_V13_MATRIX_VERIFIER_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
    `${label} must retain one exact non-aliased filesystem identity.`
  );
  return Object.freeze({
    binding: Object.freeze({
      path: relativeBoundPath(bindingRoot, resolved, `${label} binding`),
      dev: metadata.dev.toString(10),
      ino: metadata.ino.toString(10),
      birthtimeNs: metadata.birthtimeNs.toString(10)
    }),
    metadata
  });
}

async function expectedArtifactIdentity(artifact, input) {
  const lock = artifact.verificationSnapshot?.lock;
  const lockFile = artifact.verificationSnapshot?.lockFile;
  const artifactRoot = artifact.verificationSnapshot?.artifactRoot;
  requireCondition(
    isRecord(lock)
      && isRecord(lockFile)
      && isRecord(artifactRoot)
      && typeof artifactRoot.realPath === "string"
      && typeof lockFile.realPath === "string"
      && comparablePath(artifactRoot.realPath) === comparablePath(input.artifactRoot)
      && comparablePath(lockFile.realPath) === comparablePath(input.artifactLock)
      && SHA256_PATTERN.test(lock.manifestDigest ?? "")
      && SHA256_PATTERN.test(artifact.artifactSetDigest ?? "")
      && SHA256_PATTERN.test(artifact.lockDigest ?? "")
      && SHA256_PATTERN.test(lockFile.sha256 ?? "")
      && lock.artifactSetDigest === artifact.artifactSetDigest
      && lock.lockDigest === artifact.lockDigest
      && lock.buildVersion === artifact.buildVersion
      && exactJson(lock.descriptor, artifact.descriptor)
      && Number.isSafeInteger(lock.fileCount)
      && lock.fileCount > 0
      && Array.isArray(lock.files)
      && lock.files.length === lock.fileCount
      && sha256(canonicalJson(lock.files)) === artifact.artifactSetDigest
      && isRecord(artifact.pwaManifest)
      && isRecord(artifact.serviceWorker)
      && Number.isSafeInteger(lockFile.size)
      && lockFile.size > 0
      && lockFile.nlink === 1,
    "STORAGE_V13_MATRIX_VERIFIER_ARTIFACT_IDENTITY_INVALID",
    "The independently verified locked artifact identity is incomplete."
  );
  const [artifactRootFilesystem, identityLockFilesystem] = await Promise.all([
    captureExactArtifactFilesystemBinding({
      bindingRoot: input.bindingRoot,
      target: input.artifactRoot,
      label: "Artifact root",
      expectedKind: "directory"
    }),
    captureExactArtifactFilesystemBinding({
      bindingRoot: input.bindingRoot,
      target: input.artifactLock,
      label: "Artifact identity lock",
      expectedKind: "file"
    })
  ]);
  requireCondition(
    identityLockFilesystem.metadata.nlink === 1n
      && identityLockFilesystem.metadata.size === BigInt(lockFile.size),
    "STORAGE_V13_MATRIX_VERIFIER_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
    "Artifact identity lock link count or size differs from the independently verified lock snapshot."
  );
  return {
    releaseEvidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    manifestDigest: lock.manifestDigest,
    artifactSetDigest: artifact.artifactSetDigest,
    lockDigest: artifact.lockDigest,
    descriptor: artifact.descriptor,
    pwaManifest: artifact.pwaManifest,
    serviceWorker: artifact.serviceWorker,
    fileCount: lock.fileCount,
    files: lock.files,
    artifactRoot: artifactRootFilesystem.binding,
    identityLock: {
      ...identityLockFilesystem.binding,
      nlink: Number(identityLockFilesystem.metadata.nlink),
      size: lockFile.size,
      sha256: lockFile.sha256
    }
  };
}

function artifactVerificationDigest(artifact) {
  return sha256(canonicalJson({
    releaseEvidenceId: artifact?.releaseEvidenceId,
    descriptor: artifact?.descriptor,
    buildVersion: artifact?.buildVersion,
    artifactSetDigest: artifact?.artifactSetDigest,
    pwaManifest: artifact?.pwaManifest,
    serviceWorker: artifact?.serviceWorker,
    lockDigest: artifact?.lockDigest,
    verificationSnapshot: artifact?.verificationSnapshot,
    storageV13ExactFilesystemIdentity: artifact?.storageV13ExactFilesystemIdentity
  }));
}

function expectedArtifactStability(artifact) {
  const digest = artifactVerificationDigest(artifact);
  return {
    initialVerificationDigest: digest,
    finalVerificationDigest: digest,
    stable: true
  };
}

function expectedPageIdentity(artifact) {
  return {
    appBootReady: "true",
    dbGeneration: "legacy-v13",
    dbSchema: "13",
    evidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    descriptor: artifact.descriptor
  };
}

function receiptDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

function runSummaryDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.summaryDigest;
  return sha256(canonicalJson(unsigned));
}

function attemptMarkerDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.markerDigest;
  return sha256(canonicalJson(unsigned));
}

function validateAttemptMarker({ markerHeld, input }) {
  const document = parseHeldJson(markerHeld);
  const binding = Object.freeze({
    attemptId: input.attemptId,
    path: markerHeld.binding.path,
    size: markerHeld.binding.size,
    sha256: markerHeld.binding.sha256,
    markerDigest: document?.markerDigest
  });
  requireCondition(
    exactKeys(document, [
      "schemaVersion",
      "markerType",
      "trustClass",
      "status",
      "executionAdmission",
      "runId",
      "attemptId",
      "outputRoot",
      "authority",
      "createdAt",
      "markerDigest"
    ])
      && document.schemaVersion === 1
      && document.markerType === "storage_v13_matrix_candidate_attempt_marker_v1"
      && document.trustClass === "untrusted_candidate"
      && document.status === "not_admitted"
      && document.executionAdmission === "closed_deferred_boundaries"
      && document.runId === input.runId
      && document.attemptId === input.attemptId
      && ATTEMPT_ID_PATTERN.test(document.attemptId)
      && document.outputRoot === relativeBoundPath(
        input.bindingRoot,
        input.outputRoot,
        "Candidate attempt marker output root"
      )
      && exactJson(document.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && markerHeld.binding.path === relativeBoundPath(
        input.bindingRoot,
        path.join(input.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME),
        "Candidate attempt marker path"
      )
      && markerHeld.binding.size <= 65_536
      && requireCanonicalTimestamp(document.createdAt, "candidate attempt marker createdAt") >= 0
      && SHA256_PATTERN.test(document.markerDigest ?? "")
      && document.markerDigest === attemptMarkerDigest(document),
    "STORAGE_V13_MATRIX_VERIFIER_ATTEMPT_MARKER_INVALID",
    "Candidate attempt marker must bind this exact run, high-entropy attempt id, held path, bytes, and closed authority."
  );
  return Object.freeze({
    document: immutableJsonSnapshot(document),
    binding
  });
}

function validateRunSummary({ summaryHeld, verifiedReceipts, input, attemptMarkerBinding }) {
  const document = parseHeldJson(summaryHeld);
  const keys = [
    "schemaVersion",
    "summaryType",
    "trustClass",
    "status",
    "executionAdmission",
    "candidateCaptureComplete",
    "matrixComplete",
    "strictGatePassed",
    "runId",
    "attemptMarker",
    "expectedProjectNames",
    "fullResultStatus",
    "unexpectedProjectNames",
    "errors",
    "projects",
    "authority",
    "completedAt",
    "summaryDigest"
  ];
  requireCondition(
    exactKeys(document, keys)
      && document.schemaVersion === 2
      && document.summaryType === "storage_v13_matrix_playwright_candidate_summary_v2"
      && document.trustClass === "untrusted_candidate"
      && document.status === "not_admitted"
      && document.executionAdmission === "closed_deferred_boundaries"
      && document.candidateCaptureComplete === true
      && document.matrixComplete === false
      && document.strictGatePassed === false
      && document.runId === input.runId
      && exactJson(document.attemptMarker, attemptMarkerBinding)
      && exactJson(document.expectedProjectNames, PROJECT_NAMES)
      && document.fullResultStatus === "passed"
      && exactJson(document.unexpectedProjectNames, [])
      && exactJson(document.errors, [])
      && exactJson(document.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && SHA256_PATTERN.test(document.summaryDigest ?? "")
      && document.summaryDigest === runSummaryDigest(document)
      && Array.isArray(document.projects)
      && document.projects.length === 2,
    "STORAGE_V13_MATRIX_VERIFIER_RUN_SUMMARY_INVALID",
    "Playwright candidate summary must record one exact pass per required browser while remaining closed and not admitted."
  );
  const completedAt = requireCanonicalTimestamp(document.completedAt, "candidate run summary completedAt");
  for (let index = 0; index < PROJECT_NAMES.length; index += 1) {
    const projectName = PROJECT_NAMES[index];
    const project = document.projects[index];
    const verified = verifiedReceipts[projectName];
    requireCondition(
      exactKeys(project, [
        "projectName",
        "discovered",
        "expectedStatus",
        "outcome",
        "attempts",
        "resultStatuses",
        "receipt"
      ])
        && project.projectName === projectName
        && project.discovered === 1
        && project.expectedStatus === "passed"
        && project.outcome === "expected"
        && project.attempts === 1
        && exactJson(project.resultStatuses, ["passed"])
        && exactJson(project.receipt, {
          path: `${projectName}/${RECEIPT_FILE_NAME}`,
          size: verified.receiptBinding.size,
          sha256: verified.receiptBinding.sha256,
          receiptId: verified.document.receiptId,
          receiptDigest: verified.document.receiptDigest
        })
        && completedAt >= requireCanonicalTimestamp(
          verified.document.completedAt,
          `${projectName} receipt completedAt`
        ),
      "STORAGE_V13_MATRIX_VERIFIER_RUN_SUMMARY_PROJECT_INVALID",
      `${projectName} summary entry must bind one single-attempt passing receipt.`
    );
  }
  return Object.freeze({ document: immutableJsonSnapshot(document), binding: summaryHeld.binding });
}

function validateReceipt({
  projectName,
  receiptHeld,
  attachmentHeldByName,
  attachmentSpecs,
  policy,
  governance,
  validator,
  input,
  artifact,
  artifactIdentity,
  attemptMarkerBinding
}) {
  const document = parseHeldJson(receiptHeld);
  try {
    validator.assert(document);
  } catch (error) {
    fail(
      "STORAGE_V13_MATRIX_VERIFIER_SCHEMA_VALIDATION_FAILED",
      `${projectName} receipt does not validate against the held candidate schema.`,
      error
    );
  }
  const expectedProductPattern = projectName === "msedge"
    ? /^Edg\/\d+(?:\.\d+)+$/u
    : /^Chrome\/\d+(?:\.\d+)+$/u;
  const startedTimestamp = requireCanonicalTimestamp(document.startedAt, `${projectName} startedAt`);
  const completedTimestamp = requireCanonicalTimestamp(document.completedAt, `${projectName} completedAt`);
  requireCondition(
    startedTimestamp <= completedTimestamp,
    "STORAGE_V13_MATRIX_VERIFIER_INTERVAL_INVALID",
    `${projectName} receipt interval is reversed.`
  );
  requireCondition(
    document.receiptId === `${input.runId}-${projectName}`
      && document.projectName === projectName
      && document.browserChannel === projectName
      && expectedProductPattern.test(document.actualProduct)
      && document.targetOrigin === input.origin
      && exactJson(document.attemptMarker, attemptMarkerBinding)
      && exactJson(document.releaseIdentity, policy.releaseIdentity)
      && exactJson(document.capabilities, STORAGE_V13_MATRIX_CAPABILITIES)
      && exactJson(document.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && exactJson(document.policyBindings, [
        { role: "storage-v13-matrix-candidate-policy", ...governance.policy },
        { role: "formal-release-decisions-id-exclusion", ...governance.releaseDecisions }
      ].map(({ document: ignored, ...binding }) => binding))
      && exactJson(document.artifactIdentity, artifactIdentity)
      && exactJson(document.artifactStability, expectedArtifactStability(artifact))
      && exactJson(document.pageIdentity, expectedPageIdentity(artifact))
      && exactJson(document.deferredBoundaries, policy.deferredBoundaries)
      && document.receiptDigest === receiptDigest(document),
    "STORAGE_V13_MATRIX_VERIFIER_RECEIPT_IDENTITY_INVALID",
    `${projectName} receipt is not bound to the current policy, artifact, page, run, or digest.`
  );

  const receiptContext = { ...document, startedTimestamp, completedTimestamp };
  const snapshots = [];
  let previousCapturedAt = startedTimestamp;
  const observedCaptureIds = new Set();
  for (let operationIndex = 0; operationIndex < document.operationObservations.length; operationIndex += 1) {
    const operation = document.operationObservations[operationIndex];
    const operationPolicy = policy.observedOperations[operationIndex];
    requireCondition(
      exactKeys(operation, OPERATION_KEYS)
        && operation.operationId === STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS[operationIndex]
        && operation.operationId === operationPolicy.operationId
        && operation.uiPath === operationPolicy.uiPath
        && operation.status === "observed_pass"
        && operation.observationMethod === "native_indexeddb_readonly_v2"
        && operation.captures.length === operationPolicy.capturePhases.length,
      "STORAGE_V13_MATRIX_VERIFIER_OPERATION_INVALID",
      `${projectName} operation ${String(operation.operationId)} is incomplete or out of order.`
    );
    validateDownload(operation.download, operation.operationId, projectName);
    validateBackup(operation.backup, operation.operationId, projectName);
    validateSafetyBackup(operation.safetyBackup, operation.operationId, projectName);
    const operationSnapshots = [];
    for (let captureIndex = 0; captureIndex < operation.captures.length; captureIndex += 1) {
      const expected = attachmentSpecs.find((spec) =>
        spec.operationIndex === operationIndex && spec.captureIndex === captureIndex
      );
      const binding = operation.captures[captureIndex];
      const held = attachmentHeldByName.get(expected.fileName);
      const expectedPath = relativeBoundPath(input.bindingRoot, held.filePath, `${projectName} attachment path`);
      requireCondition(
        binding.phase === expected.phase
          && binding.path === expectedPath
          && binding.size === held.binding.size
          && binding.sha256 === held.binding.sha256
          && !observedCaptureIds.has(binding.captureId),
        "STORAGE_V13_MATRIX_VERIFIER_ATTACHMENT_BINDING_INVALID",
        `${projectName} ${expected.fileName} binding is missing, duplicated, or rebound.`
      );
      const parsedSnapshot = parseHeldJson(held);
      const validated = assertSnapshot(parsedSnapshot, expected, receiptContext, previousCapturedAt);
      previousCapturedAt = validated.capturedAt;
      observedCaptureIds.add(binding.captureId);
      requireCondition(
        binding.captureId === parsedSnapshot.captureId
          && binding.snapshotDigest === parsedSnapshot.snapshotDigest,
        "STORAGE_V13_MATRIX_VERIFIER_ATTACHMENT_BINDING_INVALID",
        `${projectName} ${expected.fileName} does not bind its exact capture identity and digest.`
      );
      operationSnapshots.push(parsedSnapshot);
      snapshots.push(parsedSnapshot);
    }
    if (["create", "edit", "delete", "export"].includes(operation.operationId)) {
      requireCondition(
        exactJson(
          changedStores(operationSnapshots[0], operationSnapshots.at(-1)),
          operationPolicy.exactChangedStores
        ),
        "STORAGE_V13_MATRIX_VERIFIER_STORE_DIFF_INVALID",
        `${projectName} ${operation.operationId} changed an unexpected physical store set.`
      );
      for (const [storeName, expectedDelta] of Object.entries(operationPolicy.countDeltas)) {
        requireCondition(
          countDelta(operationSnapshots[0], operationSnapshots.at(-1), storeName) === expectedDelta,
          "STORAGE_V13_MATRIX_VERIFIER_COUNT_DELTA_INVALID",
          `${projectName} ${operation.operationId} count delta for ${storeName} is invalid.`
        );
      }
    }
    if (operation.operationId === "create") {
      requireCreateSemanticRelationship(operationSnapshots[0], operationSnapshots[1]);
    }
    if (operation.operationId === "edit") {
      requireEditSemanticRelationship(operationSnapshots[0], operationSnapshots[1]);
    }
    if (operation.operationId === "delete") {
      requireCondition(
        exactJson(changedStores(operationSnapshots[0], operationSnapshots[1]), ["cases"])
          && countDelta(operationSnapshots[0], operationSnapshots[1], "cases") === 0,
        "STORAGE_V13_MATRIX_VERIFIER_DELETE_TRASH_STORE_DIFF_INVALID",
        `${projectName} trash transition may change only the Case store without changing its count.`
      );
      requireDeleteSemanticRelationship(
        operationSnapshots[0],
        operationSnapshots[1],
        operationSnapshots[2]
      );
    }
  }
  requireCondition(
    snapshots.length === 16 && observedCaptureIds.size === 16,
    "STORAGE_V13_MATRIX_VERIFIER_ATTACHMENT_COUNT_INVALID",
    `${projectName} must bind exactly 16 unique ordered v2 attachments.`
  );

  const [create, , deletion, exported, restore, cancel] = document.operationObservations;
  const operationSnapshots = document.operationObservations.map((operation) =>
    operation.captures.map((binding) => snapshots.find((snapshot) => snapshot.captureId === binding.captureId))
  );
  requireAdjacentSnapshot(operationSnapshots[0][1], operationSnapshots[1][0], `${projectName} create to edit adjacency`);
  requireAdjacentSnapshot(operationSnapshots[1][1], operationSnapshots[2][0], `${projectName} edit to delete adjacency`);
  requireSameSnapshot(operationSnapshots[0][0], operationSnapshots[2][2], `${projectName} create/edit/delete round trip`);
  requireSameSnapshot(operationSnapshots[3][1], operationSnapshots[4][0], `${projectName} export backup baseline`);
  requireCondition(
    exactJson(exported.backup, restore.backup),
    "STORAGE_V13_MATRIX_VERIFIER_BACKUP_BINDING_MISMATCH",
    `${projectName} restore must bind the exact export backup projection.`
  );
  requireExportBackupContentMatchSnapshot(
    exported.backup,
    operationSnapshots[3][1],
    projectName
  );
  requireCondition(
    restore.safetyBackup.payloadDigest !== restore.backup.payloadDigest,
    "STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_TARGET_COLLISION",
    `${projectName} restore safety-backup payload must differ from the restore target payload.`
  );
  requireSafetyBackupContentMatchSnapshot(
    restore.safetyBackup,
    operationSnapshots[4][3],
    projectName
  );
  requireSameSnapshot(operationSnapshots[4][1], operationSnapshots[4][2], `${projectName} restore preflight`);
  requireSameSnapshot(operationSnapshots[4][2], operationSnapshots[4][3], `${projectName} restore pre-commit state`);
  requireSameSnapshot(operationSnapshots[4][0], operationSnapshots[4][4], `${projectName} restore committed state`);
  requireSameSnapshot(operationSnapshots[4][4], operationSnapshots[5][0], `${projectName} cancel precondition`);
  requireSameSnapshot(operationSnapshots[5][0], operationSnapshots[5][1], `${projectName} cancel result`);
  requireCondition(
    operationSnapshots[4][0].snapshotDigest !== operationSnapshots[4][1].snapshotDigest,
    "STORAGE_V13_MATRIX_VERIFIER_RESTORE_NO_MUTATION_FIXTURE",
    `${projectName} restore fixture must contain a genuinely changed current state.`
  );
  requireCondition(
    cancel.download.eventCount === 0 && cancel.download.observed === false,
    "STORAGE_V13_MATRIX_VERIFIER_CANCEL_DOWNLOAD_INVALID",
    `${projectName} cancel must remain a zero-download observation.`
  );
  return Object.freeze({ document: immutableJsonSnapshot(document), receiptBinding: receiptHeld.binding });
}

async function closeHeldFiles(heldFiles) {
  await Promise.all(heldFiles.map((held) => held.handle.close().catch(() => undefined)));
}

export async function verifyStorageV13MatrixCandidate(options) {
  requireCondition(
    isRecord(options),
    "STORAGE_V13_MATRIX_VERIFIER_INPUT_INVALID",
    "Verifier options must be an object."
  );
  const candidateKeys = [
    "origin",
    "outputRoot",
    "bindingRoot",
    "artifactRoot",
    "artifactLock",
    "releaseEvidenceId",
    "runId",
    "attemptId"
  ];
  const allowedOptionKeys = new Set([...candidateKeys, "cwd", "onVerificationCheckpoint"]);
  requireCondition(
    Object.keys(options).every((key) => allowedOptionKeys.has(key)),
    "STORAGE_V13_MATRIX_VERIFIER_INPUT_INVALID",
    "Verifier options contain an unknown field."
  );
  requireCondition(
    options.onVerificationCheckpoint === undefined
      || typeof options.onVerificationCheckpoint === "function",
    "STORAGE_V13_MATRIX_VERIFIER_INPUT_INVALID",
    "onVerificationCheckpoint must be a trusted function when supplied."
  );
  const input = parseStorageV13MatrixCandidateVerifierInput(
    Object.fromEntries(candidateKeys.map((key) => [key, options[key]]))
  );
  const cwd = path.resolve(options.cwd ?? process.cwd());
  requireCondition(
    comparablePath(cwd) === comparablePath(input.bindingRoot),
    "STORAGE_V13_MATRIX_VERIFIER_BINDING_ROOT_CWD_MISMATCH",
    "Candidate binding root must exactly equal the verifier cwd."
  );

  const sourcePaths = Object.freeze({
    schema: path.resolve(cwd, STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH),
    policy: path.resolve(cwd, STORAGE_V13_MATRIX_POLICY_PATH),
    decisions: path.resolve(cwd, STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH)
  });
  const heldFiles = [];
  try {
    await Promise.all([
      assertNoAliases(input.bindingRoot, input.outputRoot, "Candidate output root"),
      ...Object.entries(sourcePaths).map(([role, filePath]) =>
        assertNoAliases(input.bindingRoot, filePath, `Checked ${role} source`)
      )
    ]);
    const outputLock = await captureDirectoryLock(input.outputRoot, "Candidate output root");
    const outputNames = await readdir(input.outputRoot);
    assertExactNames(
      outputNames,
      [
        ...PROJECT_NAMES,
        STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
        STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
        STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME
      ],
      "STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SET_INVALID",
      "Candidate output root"
    );
    const projectLocks = new Map();
    for (const projectName of PROJECT_NAMES) {
      const projectRoot = path.join(input.outputRoot, projectName);
      await assertNoAliases(input.bindingRoot, projectRoot, `${projectName} project root`);
      projectLocks.set(projectName, await captureDirectoryLock(projectRoot, `${projectName} project root`));
    }
    requireCondition(
      new Set([...projectLocks.values()].map((lock) => `${String(lock.dev)}:${String(lock.ino)}`)).size === 2,
      "STORAGE_V13_MATRIX_VERIFIER_PROJECT_IDENTITY_REUSED",
      "The two browser projects must use distinct physical directories."
    );

    const sourceHeldByRole = new Map();
    for (const [role, filePath] of Object.entries(sourcePaths)) {
      const held = await openHeldFile({
        bindingRoot: input.bindingRoot,
        filePath,
        label: `Checked ${role} source`
      });
      heldFiles.push(held);
      sourceHeldByRole.set(role, held);
    }
    const summaryHeld = await openHeldFile({
      bindingRoot: input.bindingRoot,
      filePath: path.join(input.outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME),
      label: "Playwright candidate run summary"
    });
    heldFiles.push(summaryHeld);
    const terminalCommitHeld = await openHeldFile({
      bindingRoot: input.bindingRoot,
      filePath: path.join(input.outputRoot, STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME),
      label: "Candidate terminal commit marker"
    });
    heldFiles.push(terminalCommitHeld);
    const terminalGateBinding = validateTerminalCommitMarker({
      terminalCommitHeld,
      summaryHeld
    });
    const attemptMarkerHeld = await openHeldFile({
      bindingRoot: input.bindingRoot,
      filePath: path.join(input.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME),
      label: "Candidate attempt marker"
    });
    heldFiles.push(attemptMarkerHeld);
    const attemptMarker = validateAttemptMarker({ markerHeld: attemptMarkerHeld, input });
    const schemaHeld = sourceHeldByRole.get("schema");
    const schema = parseHeldJson(schemaHeld);
    const heldSchemaBinding = {
      path: schemaHeld.binding.path,
      schemaId: schema?.$id,
      canonicalSha256: sha256(canonicalJson(schema))
    };
    requireCondition(
      exactJson(heldSchemaBinding, STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_BINDING),
      "STORAGE_V13_MATRIX_VERIFIER_SCHEMA_BINDING_REBOUND",
      "Held candidate schema path, id, or canonical SHA-256 differs from the fixed verifier binding."
    );
    let validator;
    try {
      validator = compileEvidenceSchemaForId(schema, STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID);
    } catch (error) {
      fail("STORAGE_V13_MATRIX_VERIFIER_SCHEMA_INVALID", "Candidate schema cannot be independently audited and compiled.", error);
    }
    const heldPolicy = parseHeldJson(sourceHeldByRole.get("policy"));
    const heldDecisions = parseHeldJson(sourceHeldByRole.get("decisions"));
    assertFormalReceiptDecisionIdsExcluded(heldDecisions);
    const governance = await loadStorageV13MatrixGovernanceBindings(cwd);
    requireCondition(
      sourceHeldByRole.get("policy").binding.size === governance.policy.size
        && sourceHeldByRole.get("policy").binding.sha256 === governance.policy.sha256
        && sha256(canonicalJson(heldPolicy)) === governance.policy.canonicalSha256
        && sourceHeldByRole.get("decisions").binding.size === governance.releaseDecisions.size
        && sourceHeldByRole.get("decisions").binding.sha256 === governance.releaseDecisions.sha256
        && sha256(canonicalJson(heldDecisions)) === governance.releaseDecisions.canonicalSha256,
      "STORAGE_V13_MATRIX_VERIFIER_GOVERNANCE_SOURCE_REBOUND",
      "Held candidate policy or formal receipt decision source differs from current governance validation."
    );
    const attachmentSpecs = expectedAttachmentSpecs(governance.policy.document);
    const expectedProjectNames = [
      RECEIPT_FILE_NAME,
      ...attachmentSpecs.map((spec) => spec.fileName)
    ];
    const heldByProject = new Map();
    for (const projectName of PROJECT_NAMES) {
      const projectRoot = path.join(input.outputRoot, projectName);
      const projectNames = await readdir(projectRoot);
      assertExactNames(
        projectNames,
        expectedProjectNames,
        "STORAGE_V13_MATRIX_VERIFIER_PROJECT_OUTPUT_SET_INVALID",
        `${projectName} project root`
      );
      const byName = new Map();
      for (const fileName of expectedProjectNames) {
        const held = await openHeldFile({
          bindingRoot: input.bindingRoot,
          filePath: path.join(projectRoot, fileName),
          label: `${projectName} ${fileName}`
        });
        heldFiles.push(held);
        byName.set(fileName, held);
      }
      heldByProject.set(projectName, byName);
    }
    assertGloballyDistinctHeldFiles(heldFiles);

    const initialArtifact = await loadVerifiedDeployedPwaCandidateArtifact(input);
    const initialArtifactIdentity = await expectedArtifactIdentity(initialArtifact, input);
    const verifiedReceipts = {};
    for (const projectName of PROJECT_NAMES) {
      const heldByName = heldByProject.get(projectName);
      verifiedReceipts[projectName] = validateReceipt({
        projectName,
        receiptHeld: heldByName.get(RECEIPT_FILE_NAME),
        attachmentHeldByName: new Map(
          attachmentSpecs.map((spec) => [spec.fileName, heldByName.get(spec.fileName)])
        ),
        attachmentSpecs,
        policy: governance.policy.document,
        governance,
        validator,
        input,
        artifact: initialArtifact,
        artifactIdentity: initialArtifactIdentity,
        attemptMarkerBinding: attemptMarker.binding
      });
    }
    const msedge = verifiedReceipts.msedge.document;
    const chrome = verifiedReceipts.chrome.document;
    requireCondition(
      msedge.receiptId !== chrome.receiptId
        && exactJson(msedge.releaseIdentity, chrome.releaseIdentity)
        && exactJson(msedge.capabilities, chrome.capabilities)
        && exactJson(msedge.policyBindings, chrome.policyBindings)
        && exactJson(msedge.attemptMarker, chrome.attemptMarker)
        && exactJson(msedge.artifactIdentity, chrome.artifactIdentity)
        && exactJson(msedge.artifactStability, chrome.artifactStability)
        && exactJson(msedge.pageIdentity, chrome.pageIdentity)
        && exactJson(msedge.deferredBoundaries, chrome.deferredBoundaries)
        && exactJson(msedge.authority, chrome.authority),
      "STORAGE_V13_MATRIX_VERIFIER_BROWSER_PAIR_MISMATCH",
      "Edge and Chrome receipts must be distinct projects bound to one exact policy and locked artifact identity."
    );
    const runSummary = validateRunSummary({
      summaryHeld,
      verifiedReceipts,
      input,
      attemptMarkerBinding: attemptMarker.binding
    });

    if (options.onVerificationCheckpoint !== undefined) {
      try {
        await options.onVerificationCheckpoint("after_candidate_validation_before_final_revalidation");
      } catch (error) {
        fail("STORAGE_V13_MATRIX_VERIFIER_CHECKPOINT_FAILED", "Trusted verifier checkpoint failed.", error);
      }
    }
    const finalArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(input, initialArtifact);
    const finalArtifactIdentity = await expectedArtifactIdentity(finalArtifact, input);
    requireCondition(
      exactJson(initialArtifactIdentity, finalArtifactIdentity),
      "STORAGE_V13_MATRIX_VERIFIER_ARTIFACT_FILESYSTEM_IDENTITY_REBOUND",
      "Artifact root or identity lock exact filesystem identity changed during verification."
    );
    await Promise.all(heldFiles.map((held) => assertHeldFileStable(held, "before verifier completion")));
    await Promise.all([
      assertDirectoryLock(input.outputRoot, outputLock, "Candidate output root"),
      ...PROJECT_NAMES.map((projectName) =>
        assertDirectoryLock(
          path.join(input.outputRoot, projectName),
          projectLocks.get(projectName),
          `${projectName} project root`
        )
      )
    ]);
    assertExactNames(
      await readdir(input.outputRoot),
      [
        ...PROJECT_NAMES,
        STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
        STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
        STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME
      ],
      "STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SET_INVALID",
      "Candidate output root"
    );
    for (const projectName of PROJECT_NAMES) {
      assertExactNames(
        await readdir(path.join(input.outputRoot, projectName)),
        expectedProjectNames,
        "STORAGE_V13_MATRIX_VERIFIER_PROJECT_OUTPUT_SET_INVALID",
        `${projectName} project root`
      );
    }

    return immutableJsonSnapshot({
      verificationKind: "offline-independent-storage-v13-browser-matrix-candidate-v2",
      verificationScope: "offline_candidate_envelopes_and_local_artifact_only",
      candidateEnvelopeIntegrityVerified: true,
      schemaValidated: true,
      schemaBinding: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_BINDING,
      browserReceiptEnvelopesVerified: true,
      attemptMarkerVerified: true,
      terminalCommitMarkerVerified: true,
      candidateCaptureComplete: true,
      attachmentsVerifiedPerProject: 16,
      totalAttachmentsVerified: 32,
      lockedLocalArtifactIdentityVerified: true,
      remoteServedArtifactBytesVerified: false,
      downloadBodiesRetainedForOfflineVerification: false,
      formalReceiptDecisionIdsExcluded: true,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      executionAdmission: "closed_deferred_boundaries",
      matrixComplete: false,
      strictGatePassed: false,
      usableForAdmission: false,
      verifierNetworkAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      artifactIdentity: initialArtifactIdentity,
      receiptBindings: {
        msedge: verifiedReceipts.msedge.receiptBinding,
        chrome: verifiedReceipts.chrome.receiptBinding
      },
      receiptDigests: {
        msedge: msedge.receiptDigest,
        chrome: chrome.receiptDigest
      },
      attemptMarkerBinding: attemptMarker.binding,
      terminalGateBinding,
      runSummaryBinding: runSummary.binding,
      runSummaryDigest: runSummary.document.summaryDigest,
      documents: {
        msedge,
        chrome,
        runSummary: runSummary.document
      }
    });
  } finally {
    await closeHeldFiles(heldFiles);
  }
}

export function buildStorageV13MatrixCandidateVerificationFailure(error) {
  return Object.freeze({
    verificationKind: "offline-independent-storage-v13-browser-matrix-candidate-v2",
    verificationScope: "offline_candidate_envelopes_and_local_artifact_only",
    candidateEnvelopeIntegrityVerified: false,
    schemaValidated: false,
    schemaBinding: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_BINDING,
    browserReceiptEnvelopesVerified: false,
    attemptMarkerVerified: false,
    terminalCommitMarkerVerified: false,
    candidateCaptureComplete: false,
    attachmentsVerifiedPerProject: 0,
    totalAttachmentsVerified: 0,
    lockedLocalArtifactIdentityVerified: false,
    remoteServedArtifactBytesVerified: false,
    downloadBodiesRetainedForOfflineVerification: false,
    formalReceiptDecisionIdsExcluded: false,
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    matrixComplete: false,
    strictGatePassed: false,
    usableForAdmission: false,
    verifierNetworkAttempted: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseReady: false,
    error: error instanceof Error ? error.message : String(error)
  });
}

async function runCli() {
  try {
    const input = parseStorageV13MatrixCandidateVerifierEnvironment(process.env);
    const result = await verifyStorageV13MatrixCandidate({ ...input, cwd: process.cwd() });
    process.stdout.write(`${JSON.stringify({
      verificationKind: result.verificationKind,
      verificationScope: result.verificationScope,
      candidateEnvelopeIntegrityVerified: result.candidateEnvelopeIntegrityVerified,
      schemaValidated: result.schemaValidated,
      schemaBinding: result.schemaBinding,
      browserReceiptEnvelopesVerified: result.browserReceiptEnvelopesVerified,
      terminalCommitMarkerVerified: result.terminalCommitMarkerVerified,
      candidateCaptureComplete: result.candidateCaptureComplete,
      attachmentsVerifiedPerProject: result.attachmentsVerifiedPerProject,
      totalAttachmentsVerified: result.totalAttachmentsVerified,
      lockedLocalArtifactIdentityVerified: result.lockedLocalArtifactIdentityVerified,
      remoteServedArtifactBytesVerified: result.remoteServedArtifactBytesVerified,
      downloadBodiesRetainedForOfflineVerification: result.downloadBodiesRetainedForOfflineVerification,
      formalReceiptDecisionIdsExcluded: result.formalReceiptDecisionIdsExcluded,
      trustClass: result.trustClass,
      admissionStatus: result.admissionStatus,
      executionAdmission: result.executionAdmission,
      matrixComplete: result.matrixComplete,
      strictGatePassed: result.strictGatePassed,
      usableForAdmission: result.usableForAdmission,
      verifierNetworkAttempted: result.verifierNetworkAttempted,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      releaseReady: result.releaseReady,
      terminalGateBinding: result.terminalGateBinding,
      receiptDigests: result.receiptDigests
    }, null, 2)}\n`);
    process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify(buildStorageV13MatrixCandidateVerificationFailure(error), null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
