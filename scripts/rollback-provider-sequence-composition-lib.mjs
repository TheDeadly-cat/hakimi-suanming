import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import {
  canonicalJson,
  sha256
} from "./release-evidence-lib.mjs";
import {
  computeRollbackEvidenceDigest,
  computeRollbackEvidenceId,
  validateRollbackDeploymentReceiptProjectionForContract
} from "./rollback-evidence-lib.mjs";
import {
  ROLLBACK_EVIDENCE_SCHEMA_PATH,
  compileRollbackEvidenceSchema
} from "./rollback-evidence-schema.mjs";
import {
  verifyPersistedProviderDeploymentCandidateSequence
} from "./provider-deployment-candidate-sequence-verifier.mjs";
import {
  ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_PATH,
  compileRollbackProviderSequenceCompositionSchema
} from "./rollback-provider-sequence-composition-schema.mjs";

export const ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_PATH =
  "docs/release/rollback-provider-sequence-composition-policy.v1.json";

const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const DEFAULT_DESCRIPTOR = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

const REQUIRED_POLICY_SPECS = Object.freeze([
  Object.freeze({
    policyId: "release-decisions",
    path: "docs/release/web-v1-release-decisions.json"
  }),
  Object.freeze({
    policyId: "hosting-security-policy",
    path: "docs/security/hosting-security-policy.json"
  }),
  Object.freeze({
    policyId: "release-and-rollback-runbook",
    path: "docs/release/web-v1-release-and-rollback-runbook.md"
  }),
  Object.freeze({
    policyId: "release-evidence-schema",
    path: "docs/release/release-evidence.schema.json"
  }),
  Object.freeze({
    policyId: "rollback-evidence-schema",
    path: ROLLBACK_EVIDENCE_SCHEMA_PATH
  }),
  Object.freeze({
    policyId: "rollback-evidence-policy",
    path: "docs/release/rollback-evidence-policy.v1.json"
  }),
  Object.freeze({
    policyId: "rollback-actor-trust-registry",
    path: "docs/release/rollback-actor-trust-registry.v1.json"
  })
]);

const ATTEMPTS = Object.freeze({
  networkAttempted: false,
  deploymentAttempted: false,
  rollbackAttempted: false
});

const AUTHORITY = Object.freeze({
  defaultV13ReceiptAllowlistMember: false,
  externalDeploymentExecutionAuthorized: false,
  rollbackExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false,
  schemaPromotionAuthorized: false
});

const CLAIMS = Object.freeze({
  providerReceiptAuthenticityVerified: false,
  providerOperationAuthenticityVerified: false,
  hostAuthenticityVerified: false,
  browserAuthenticityVerified: false,
  realAtoBtoAObserved: false,
  rollbackObserved: false,
  artifactServedByDeploymentIds: false,
  liveHostBytesVerified: false,
  browserRuntimeVerified: false,
  dataRollbackVerified: false,
  applicationDataMutationEpochVerified: false,
  continuousMutationIntervalVerified: false,
  abaResistanceVerified: false,
  releaseReady: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false
});

const EXPECTED_ROLLBACK_CLAIMS = Object.freeze({
  engineeringEvidenceOnly: true,
  rollbackExecutionEvidenceOnly: true,
  codeSignature: false,
  expertSignature: false,
  expertClaimsAuthorized: false,
  contentRightsGrant: false,
  dataRedistributionGrant: false,
  rollbackAuthorizationGranted: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false
});

const ROLLBACK_GATE_NAMES = Object.freeze([
  "policyBindingsVerified",
  "artifactLocksVerified",
  "artifactPairDistinct",
  "baselineIdentityVerified",
  "candidateIdentityVerified",
  "rollbackObservedMatchesBaseline",
  "phaseOrderVerified",
  "realHostVerified",
  "hostReceiptsVerified",
  "chromeEdgeVerified",
  "deploymentReceiptsVerified",
  "serviceWorkerControllerRestored",
  "privateDataApprovalVerified",
  "sourceV13FingerprintUnchanged",
  "mutationBoundaryPreserved",
  "actorAttestationsVerified",
  "operatorAcceptorIndependent",
  "allRequiredReceiptsPassed",
  "terminalStatusPassed",
  "rollbackEngineeringGatePassed"
]);

const EXPECTED_COMPOSITION_POLICY = Object.freeze({
  schemaVersion: 1,
  policyId: "hakimi.web-v1.rollback-provider-sequence-composition/v1",
  evidenceClass: "offline_projection_only_untrusted_candidate_composition",
  releaseIdentity: Object.freeze({
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  }),
  capabilities: Object.freeze({
    mutationEpochCapability: "absent_schema13",
    epoch: null,
    rawIndexedDbBypassAllowed: false,
    mutationEpochBypassAllowed: false
  }),
  requiredCrossBindings: Object.freeze([
    "rollback_checked_schema_id_and_digest",
    "current_rollback_policy_binding_raw_hashes",
    "persisted_provider_sequence_overlapping_epoch",
    "provider_origin_and_hosting_policy_raw_sha256",
    "candidate_b_and_restored_a_deployment_ids",
    "five_shared_artifact_projection_fields",
    "candidate_readback_before_restore_start"
  ]),
  formalBoundary: Object.freeze({
    formalRollbackEvidenceVerified: false,
    formalRollbackDownstreamReached: false,
    samePolicyEpochFormalCompositionAvailable: false,
    formalRollbackAdmissionMayNotBeBypassed: true
  }),
  terminalState: Object.freeze({
    trustClass: "untrusted_candidate_composition",
    status: "not_admitted",
    admissionStatus: "not_admitted",
    usableForAdmission: false,
    cliExitCode: 1
  }),
  attempts: ATTEMPTS,
  authority: AUTHORITY
});

export class RollbackProviderSequenceCompositionError extends Error {
  constructor(stage, code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "RollbackProviderSequenceCompositionError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new RollbackProviderSequenceCompositionError(stage, code, message, cause);
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && exactJson(Object.keys(value).sort(), [...keys].sort());
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
  requireCondition(
    typeof value === "string"
      && value.length > 0
      && value.trim() === value
      && path.isAbsolute(value),
    "input",
    "ROLLBACK_PROVIDER_COMPOSITION_PATH_INVALID",
    `${label} must be an explicit absolute path.`
  );
  requireCondition(
    !value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === ".."),
    "input",
    "ROLLBACK_PROVIDER_COMPOSITION_PATH_INVALID",
    `${label} must not contain dot segments.`
  );
  const resolved = path.resolve(value);
  requireCondition(
    value === resolved,
    "input",
    "ROLLBACK_PROVIDER_COMPOSITION_PATH_INVALID",
    `${label} must use exact resolved filesystem spelling.`
  );
  return resolved;
}

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  requireCondition(
    (allowEqual || relative !== "")
      && !path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`),
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_ROOT_ESCAPE",
    `${label} must remain inside its declared root.`
  );
  return relative.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requirePairwiseDisjoint(paths) {
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      requireCondition(
        !pathsOverlap(paths[left].value, paths[right].value)
          && !pathsOverlap(paths[right].value, paths[left].value),
        "filesystem",
        "ROLLBACK_PROVIDER_COMPOSITION_ROOT_OVERLAP",
        `${paths[left].label} and ${paths[right].label} must be disjoint in both directions.`
      );
    }
  }
}

export function parseRollbackProviderSequenceCompositionInput(input) {
  const keys = [
    "bindingRoot",
    "rollbackEvidenceRoot",
    "rollbackEvidencePath",
    "rollbackReceiptsRoot",
    "deployOutputRoot",
    "deployReceiptPath",
    "restoreOutputRoot",
    "restoreReceiptPath",
    "sequenceOutputRoot",
    "sequencePath"
  ];
  requireCondition(
    exactKeys(input, keys),
    "input",
    "ROLLBACK_PROVIDER_COMPOSITION_INPUT_INVALID",
    "Composition input must contain exactly ten path bindings."
  );
  const parsed = Object.fromEntries(keys.map((key) => [
    key,
    requireAbsoluteCanonicalPath(input[key], key)
  ]));
  relativeBoundPath(parsed.bindingRoot, parsed.rollbackEvidenceRoot, "Rollback Evidence root");
  relativeBoundPath(parsed.rollbackEvidenceRoot, parsed.rollbackEvidencePath, "Rollback Evidence input");
  relativeBoundPath(parsed.bindingRoot, parsed.rollbackReceiptsRoot, "Rollback receipt root");
  for (const [key, label] of [
    ["deployOutputRoot", "Provider deploy output root"],
    ["restoreOutputRoot", "Provider restore output root"],
    ["sequenceOutputRoot", "Provider sequence output root"]
  ]) relativeBoundPath(parsed.bindingRoot, parsed[key], label);
  requirePairwiseDisjoint([
    { label: "Rollback Evidence root", value: parsed.rollbackEvidenceRoot },
    { label: "Rollback receipt root", value: parsed.rollbackReceiptsRoot },
    { label: "Provider deploy output root", value: parsed.deployOutputRoot },
    { label: "Provider restore output root", value: parsed.restoreOutputRoot },
    { label: "Provider sequence output root", value: parsed.sequenceOutputRoot }
  ]);
  return Object.freeze(parsed);
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
      fail("filesystem", "ROLLBACK_PROVIDER_COMPOSITION_PATH_UNREADABLE", `${label} cannot be inspected.`, error);
    }
    requireCondition(
      !metadata.isSymbolicLink(),
      "filesystem",
      "ROLLBACK_PROVIDER_COMPOSITION_PATH_ALIAS",
      `${label} cannot traverse a symlink or junction.`
    );
  }
}

async function captureDirectoryLock(directoryPath, label) {
  let metadata;
  let resolvedPath;
  try {
    [metadata, resolvedPath] = await Promise.all([
      lstat(directoryPath, { bigint: true }),
      realpath(directoryPath)
    ]);
  } catch (error) {
    fail("filesystem", "ROLLBACK_PROVIDER_COMPOSITION_ROOT_UNREADABLE", `${label} cannot be inspected.`, error);
  }
  requireCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_ROOT_INVALID",
    `${label} must be one real directory.`
  );
  return Object.freeze({
    path: directoryPath,
    label,
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    realPath: comparablePath(resolvedPath)
  });
}

async function assertDirectoryLock(lock) {
  const [metadata, resolvedPath] = await Promise.all([
    lstat(lock.path, { bigint: true }),
    realpath(lock.path)
  ]);
  requireCondition(
    metadata.isDirectory()
      && !metadata.isSymbolicLink()
      && metadata.dev === lock.dev
      && metadata.ino === lock.ino
      && metadata.birthtimeNs === lock.birthtimeNs
      && comparablePath(resolvedPath) === lock.realPath,
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_ROOT_REBOUND",
    `${lock.label} changed during the overlapping verification epoch.`
  );
}

async function readOpenedFileAtZero(handle, size) {
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const { bytesRead } = await handle.read(bytes, offset, size - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  requireCondition(
    offset === size,
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_FILE_SHORT_READ",
    "A held file could not be read completely."
  );
  return bytes;
}

async function openHeldFile({ bindingRoot, filePath, rootPath, label, expectedBinding = null }) {
  relativeBoundPath(rootPath, filePath, label);
  await assertNoAliases(bindingRoot, filePath, label);
  let before;
  let handle;
  try {
    before = await lstat(filePath, { bigint: true });
    handle = await open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const metadata = await handle.stat({ bigint: true });
    requireCondition(
      before.isFile()
        && !before.isSymbolicLink()
        && metadata.isFile()
        && before.dev === metadata.dev
        && before.ino === metadata.ino
        && metadata.nlink === 1n
        && metadata.size > 0n
        && metadata.size <= BigInt(MAX_INPUT_BYTES),
      "filesystem",
      "ROLLBACK_PROVIDER_COMPOSITION_FILE_INVALID",
      `${label} must be one bounded, non-linked regular file.`
    );
    const bytes = await readOpenedFileAtZero(handle, Number(metadata.size));
    const digest = sha256(bytes);
    if (expectedBinding !== null) {
      requireCondition(
        expectedBinding.size === bytes.byteLength && expectedBinding.sha256 === digest,
        "binding",
        "ROLLBACK_PROVIDER_COMPOSITION_FILE_BINDING_MISMATCH",
        `${label} does not match its declared raw-byte binding.`
      );
    }
    const resolvedPath = comparablePath(await realpath(filePath));
    return {
      label,
      filePath,
      rootPath,
      handle,
      metadata,
      resolvedPath,
      bytes,
      binding: Object.freeze({
        path: relativeBoundPath(bindingRoot, filePath, label),
        size: bytes.byteLength,
        sha256: digest
      })
    };
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    if (error instanceof RollbackProviderSequenceCompositionError) throw error;
    fail("filesystem", "ROLLBACK_PROVIDER_COMPOSITION_FILE_UNREADABLE", `${label} cannot be held.`, error);
  }
}

async function assertHeldFileStable(held, rootLocks) {
  const bytes = await readOpenedFileAtZero(held.handle, Number(held.metadata.size));
  const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.filePath, { bigint: true }),
    realpath(held.filePath)
  ]);
  for (const lock of rootLocks) await assertDirectoryLock(lock);
  requireCondition(
    handleAfter.isFile()
      && pathAfter.isFile()
      && !pathAfter.isSymbolicLink()
      && handleAfter.dev === held.metadata.dev
      && handleAfter.ino === held.metadata.ino
      && pathAfter.dev === held.metadata.dev
      && pathAfter.ino === held.metadata.ino
      && handleAfter.size === held.metadata.size
      && handleAfter.mtimeNs === held.metadata.mtimeNs
      && handleAfter.ctimeNs === held.metadata.ctimeNs
      && handleAfter.nlink === 1n
      && pathAfter.nlink === 1n
      && comparablePath(resolvedAfter) === held.resolvedPath
      && bytes.equals(held.bytes)
      && sha256(bytes) === held.binding.sha256,
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_FILE_REBOUND",
    `${held.label} changed during the overlapping verification epoch.`
  );
}

function assertGloballyDistinctHeldFiles(heldFiles) {
  const inodes = heldFiles.map((held) => `${held.metadata.dev}:${held.metadata.ino}`);
  const realPaths = heldFiles.map((held) => held.resolvedPath);
  requireCondition(
    new Set(inodes).size === heldFiles.length && new Set(realPaths).size === heldFiles.length,
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_FILE_IDENTITY_REUSED",
    "Rollback Evidence, sidecar, deployment receipts, policies, and composition sources must be physically distinct."
  );
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("schema", "ROLLBACK_PROVIDER_COMPOSITION_JSON_INVALID", `${label} is not valid UTF-8 JSON.`, error);
  }
}

function assertExactRollbackPolicyBindings(evidence) {
  requireCondition(
    Array.isArray(evidence.policyBindings)
      && evidence.policyBindings.length === REQUIRED_POLICY_SPECS.length,
    "policy",
    "ROLLBACK_PROVIDER_COMPOSITION_POLICY_SET_INVALID",
    "Rollback Evidence must bind the exact seven current policy sources."
  );
  const byId = new Map();
  for (const binding of evidence.policyBindings) {
    requireCondition(
      isRecord(binding)
        && exactKeys(binding, ["policyId", "path", "sha256"])
        && typeof binding.policyId === "string"
        && typeof binding.path === "string"
        && SHA256_PATTERN.test(binding.sha256 ?? "")
        && !byId.has(binding.policyId),
      "policy",
      "ROLLBACK_PROVIDER_COMPOSITION_POLICY_SET_INVALID",
      "Rollback Evidence policy bindings are malformed or duplicated."
    );
    byId.set(binding.policyId, binding);
  }
  for (const spec of REQUIRED_POLICY_SPECS) {
    requireCondition(
      byId.get(spec.policyId)?.path === spec.path,
      "policy",
      "ROLLBACK_PROVIDER_COMPOSITION_POLICY_SET_INVALID",
      `Rollback Evidence policy binding ${spec.policyId} does not use its fixed path.`
    );
  }
  return byId;
}

function assertCurrentPolicyDocuments(policyDocuments) {
  const decisions = policyDocuments.get("release-decisions");
  requireCondition(
    decisions?.defaultRelease?.dbGeneration === "legacy-v13"
      && decisions.defaultRelease.targetSchema === 13
      && decisions.defaultRelease.migrationId === null
      && decisions.hosting?.publicDeploymentAuthorized === false
      && decisions.domainClaims?.expertValidatedClaimAuthorized === false,
    "policy",
    "ROLLBACK_PROVIDER_COMPOSITION_RELEASE_BOUNDARY_REBOUND",
    "Current release decisions do not preserve default-v13 and closed authorization boundaries."
  );
  const rollbackPolicy = policyDocuments.get("rollback-evidence-policy");
  requireCondition(
    rollbackPolicy?.schemaVersion === 1
      && rollbackPolicy.policyId === "hakimi.web-v1.rollback-evidence/v1"
      && rollbackPolicy.status === "contract_only_not_executed"
      && rollbackPolicy.executionAdmission?.status === "closed_missing_trusted_raw_evidence"
      && Object.entries(rollbackPolicy.executionAdmission)
        .filter(([key]) => key !== "status")
        .every(([, value]) => value === false)
      && rollbackPolicy.releaseIdentity?.channel === "default-v13"
      && rollbackPolicy.releaseIdentity?.dbGeneration === "legacy-v13"
      && rollbackPolicy.releaseIdentity?.targetSchema === 13
      && rollbackPolicy.releaseIdentity?.migrationId === null
      && rollbackPolicy.mutationEpochCapability === "absent_schema13"
      && exactJson(rollbackPolicy.requiredPolicyBindings, REQUIRED_POLICY_SPECS.map(({ policyId, path: fixedPath }) => ({
        role: policyId,
        path: fixedPath
      })))
      && Object.values(rollbackPolicy.authorizationGates ?? {}).every((value) => value === false),
    "policy",
    "ROLLBACK_PROVIDER_COMPOSITION_ROLLBACK_POLICY_REBOUND",
    "Rollback policy is not the exact closed contract-only default-v13 policy."
  );
  const hostingPolicy = policyDocuments.get("hosting-security-policy");
  requireCondition(
    hostingPolicy?.schemaVersion === 2
      && hostingPolicy.policyId === "hakimi-web-public-hosting-baseline-v2"
      && hostingPolicy.deploymentPlatform === "unselected"
      && hostingPolicy.canonicalOrigin === null
      && hostingPolicy.publicReleaseGate?.httpsRequired === true
      && hostingPolicy.publicReleaseGate?.realHostHeadersVerified === false
      && hostingPolicy.publicReleaseGate?.cspBlockingModeVerified === false,
    "policy",
    "ROLLBACK_PROVIDER_COMPOSITION_HOSTING_POLICY_REBOUND",
    "Hosting policy is not the current closed v2 source."
  );
  return hostingPolicy;
}

function assertRollbackMechanicalBoundary(evidence) {
  requireCondition(
    evidence.rollbackEvidenceId === computeRollbackEvidenceId(evidence)
      && evidence.evidenceDigest === computeRollbackEvidenceDigest(evidence),
    "identity",
    "ROLLBACK_PROVIDER_COMPOSITION_ROLLBACK_IDENTITY_INVALID",
    "Rollback Evidence id or canonical digest is invalid."
  );
  requireCondition(
    evidence.scope?.channel === "default-v13"
      && exactJson(evidence.scope.descriptor, DEFAULT_DESCRIPTOR)
      && evidence.scope.mutationPolicy === "fail_closed_no_raw_idb_bypass"
      && ["baseline", "candidate", "rollbackObserved"].every((key) =>
        evidence.identities?.[key]?.channel === "default-v13"
          && exactJson(evidence.identities[key].descriptor, DEFAULT_DESCRIPTOR))
      && exactJson(evidence.identities.rollbackObserved, evidence.identities.baseline)
      && !exactJson(evidence.identities.baseline, evidence.identities.candidate),
    "identity",
    "ROLLBACK_PROVIDER_COMPOSITION_ARTIFACT_RELATION_INVALID",
    "Rollback Evidence must declare exact default-v13 A, distinct B, and rollback identity A."
  );
  requireCondition(
    evidence.dataCopy?.databaseName === "hakimi-bazi-research"
      && evidence.dataCopy.sourceSchema === 13
      && evidence.dataCopy.epochSupport === "absent_schema13"
      && evidence.dataCopy.epochBefore === null
      && evidence.dataCopy.epochAfter === null
      && evidence.dataCopy.rawIndexedDbBypassUsed === false
      && evidence.dataCopy.mutationEpochBypassed === false
      && evidence.dataCopy.releaseControlPointerModified === false,
    "mutation_boundary",
    "ROLLBACK_PROVIDER_COMPOSITION_SCHEMA13_EPOCH_INVALID",
    "Schema 13 must preserve absent/null mutation epoch and forbid raw IndexedDB or epoch bypass."
  );
  requireCondition(
    exactJson(evidence.claims, EXPECTED_ROLLBACK_CLAIMS),
    "claims",
    "ROLLBACK_PROVIDER_COMPOSITION_ROLLBACK_CLAIMS_ESCALATED",
    "Rollback Evidence claims exceed the closed engineering-only contract."
  );
  requireCondition(
    evidence.status === "failed"
      && evidence.failure !== null
      && exactKeys(evidence.gates, ROLLBACK_GATE_NAMES)
      && ROLLBACK_GATE_NAMES.every((gate) => evidence.gates[gate] === false),
    "terminal",
    "ROLLBACK_PROVIDER_COMPOSITION_FORMAL_TERMINAL_CLAIM_REJECTED",
    "Projection-only composition requires an explicit failed rollback record with all 20 formal gates false."
  );
}

function sharedArtifactProjection(identity) {
  return Object.freeze({
    releaseEvidenceId: identity.releaseEvidence.evidenceId,
    buildVersion: identity.buildVersion,
    artifactSetDigest: identity.artifactSetDigest,
    identityLockDigest: identity.identityLock.lockDigest,
    releaseEvidenceSha256: identity.releaseEvidence.sha256
  });
}

function providerArtifactProjection(value) {
  return Object.freeze({
    releaseEvidenceId: value.releaseEvidenceId,
    buildVersion: value.buildVersion,
    artifactSetDigest: value.artifactSetDigest,
    identityLockDigest: value.identityLockDigest,
    releaseEvidenceSha256: value.releaseEvidenceSha256
  });
}

function providerTerminalGateProjection(sequence, role) {
  const candidate = sequence?.packages?.[role];
  const receipt = candidate?.receipt;
  const fixedReceipt = candidate?.fixedFiles?.receipt;
  const terminalCommit = candidate?.fixedFiles?.["terminal-commit"];
  requireCondition(
    exactKeys(receipt, ["path", "size", "sha256"])
      && exactKeys(fixedReceipt, ["path", "size", "sha256"])
      && exactJson(receipt, fixedReceipt)
      && SHA256_PATTERN.test(receipt.sha256)
      && exactKeys(terminalCommit, ["path", "size", "sha256", "commitsReceiptSha256"])
      && terminalCommit.path ===
        `${candidate.rootPath}/provider-deployment-candidate-receipt-commit.sha256`
      && terminalCommit.size === 65
      && SHA256_PATTERN.test(terminalCommit.sha256)
      && SHA256_PATTERN.test(terminalCommit.commitsReceiptSha256)
      && terminalCommit.commitsReceiptSha256 === receipt.sha256
      && terminalCommit.sha256 === sha256(`${receipt.sha256}\n`),
    "provider_sequence",
    "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_TERMINAL_GATE_INVALID",
    `${role} provider terminal gate must exactly bind the sequence receipt/fixedFiles receipt and its 65-byte commit marker.`
  );
  return Object.freeze({
    path: terminalCommit.path,
    size: terminalCommit.size,
    sha256: terminalCommit.sha256,
    commitsReceiptSha256: terminalCommit.commitsReceiptSha256
  });
}

function projectProviderTerminalGates(sequence) {
  return immutableJsonSnapshot({
    deploy: providerTerminalGateProjection(sequence, "deploy"),
    restore: providerTerminalGateProjection(sequence, "restore")
  });
}

export function assertProviderVerifierBoundary(result) {
  requireCondition(
    isRecord(result)
      && result.verificationKind === "offline-independent-persisted-provider-deployment-candidate-sequence-v1"
      && result.externalSequenceCandidateIntegrityVerified === true
      && result.pendingSequenceCandidateIntegrityVerified === false
      && result.currentRecompositionMatched === true
      && result.overlappingFilesystemEpochVerified === true
      && exactKeys(result.outputFinalization, [
        "discardSentinelPresent",
        "discardSentinelVerified",
        "finalOutputSetVerified"
      ])
      && result.outputFinalization.discardSentinelPresent === false
      && result.outputFinalization.discardSentinelVerified === false
      && result.outputFinalization.finalOutputSetVerified === true
      && result.trustClass === "untrusted_candidate"
      && result.admissionStatus === "not_admitted"
      && exactKeys(result.attempts, [
        "networkAttempted",
        "deploymentAttempted",
        "rollbackAttempted"
      ])
      && result.attempts.networkAttempted === false
      && result.attempts.deploymentAttempted === false
      && result.attempts.rollbackAttempted === false
      && result.claims?.realAtoBtoAObserved === false
      && result.claims?.rollbackObserved === false
      && result.claims?.releaseReady === false
      && exactKeys(result.authorizationBoundary, [
        "externalDeploymentExecutionAuthorized",
        "rollbackExecutionAuthorized",
        "publicDeploymentAuthorized",
        "publicReleaseAuthorized",
        "authorizationMayNotBeDerivedFromCandidateEvidence"
      ])
      && result.authorizationBoundary.externalDeploymentExecutionAuthorized === false
      && result.authorizationBoundary.rollbackExecutionAuthorized === false
      && result.authorizationBoundary.publicDeploymentAuthorized === false
      && result.authorizationBoundary.publicReleaseAuthorized === false
      && result.authorizationBoundary.authorizationMayNotBeDerivedFromCandidateEvidence === true
      && result.sequenceId === result.document?.sequenceId
      && result.sequenceDigest === result.document?.sequenceDigest,
    "provider_sequence",
    "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_VERIFIER_BOUNDARY_INVALID",
    "Persisted provider sequence verifier did not return its exact closed verified-candidate boundary."
  );
  return projectProviderTerminalGates(result.document);
}

function assertPhaseTimeContainsReceipt(phase, receipt, label) {
  const phaseStart = Date.parse(phase.startedAt);
  const phaseEnd = Date.parse(phase.completedAt);
  const receiptStart = Date.parse(receipt.startedAt);
  const receiptEnd = Date.parse(receipt.completedAt);
  requireCondition(
    [phaseStart, phaseEnd, receiptStart, receiptEnd].every(Number.isFinite)
      && phaseStart <= receiptStart
      && receiptStart <= receiptEnd
      && receiptEnd <= phaseEnd,
    "timing",
    "ROLLBACK_PROVIDER_COMPOSITION_RECEIPT_TIME_INVALID",
    `${label} receipt is outside its declared rollback phase.`
  );
}

function assertCrossBindings({ evidence, providerResult, hostingPolicy, policyBindings, receiptProjections }) {
  const sequence = providerResult.document;
  const hostingBinding = policyBindings.find((binding) => binding.policyId === "hosting-security-policy");
  requireCondition(
    sequence.scope.provider === hostingPolicy.deploymentPlatform
      && sequence.scope.origin === evidence.scope.origin
      && receiptProjections.candidate.provider === sequence.scope.provider
      && receiptProjections.rollbackObserved.provider === sequence.scope.provider
      && receiptProjections.candidate.origin === sequence.scope.origin
      && receiptProjections.rollbackObserved.origin === sequence.scope.origin
      && sequence.checkedSources.hostingPolicy.path === hostingBinding.path
      && sequence.checkedSources.hostingPolicy.size === hostingBinding.size
      && sequence.checkedSources.hostingPolicy.sha256 === hostingBinding.sha256,
    "cross_binding",
    "ROLLBACK_PROVIDER_COMPOSITION_SCOPE_OR_POLICY_MISMATCH",
    "Rollback receipts and provider sequence do not share provider, origin, and current hosting policy raw SHA-256."
  );

  const candidateB = sharedArtifactProjection(evidence.identities.candidate);
  const restoredA = sharedArtifactProjection(evidence.identities.baseline);
  requireCondition(
    exactJson(candidateB, providerArtifactProjection(sequence.artifactCandidates.deployTargetB))
      && exactJson(restoredA, providerArtifactProjection(sequence.artifactCandidates.restoreTargetA))
      && !exactJson(candidateB, restoredA),
    "cross_binding",
    "ROLLBACK_PROVIDER_COMPOSITION_ARTIFACT_PROJECTION_MISMATCH",
    "Rollback and provider inputs do not share the exact five-field B and restored-A artifact projections."
  );

  const relation = sequence.deploymentIdRelation;
  requireCondition(
    relation.baselineAId !== relation.candidateBId
      && relation.restoreBeforeDeploymentId === relation.candidateBId
      && relation.restoreRequestedDeploymentId === relation.baselineAId
      && relation.restoredActiveDeploymentId === relation.baselineAId
      && receiptProjections.candidate.deploymentId === relation.candidateBId
      && receiptProjections.rollbackObserved.deploymentId === relation.restoredActiveDeploymentId,
    "cross_binding",
    "ROLLBACK_PROVIDER_COMPOSITION_DEPLOYMENT_ID_MISMATCH",
    "Formal receipt projections do not bind candidate B and restored baseline A deployment ids."
  );

  assertPhaseTimeContainsReceipt(
    evidence.execution.candidate,
    receiptProjections.candidate,
    "Candidate"
  );
  assertPhaseTimeContainsReceipt(
    evidence.execution.rollbackObserved,
    receiptProjections.rollbackObserved,
    "Rollback-observed"
  );
  const candidateCompleted = Date.parse(receiptProjections.candidate.completedAt);
  const deployReadback = Date.parse(relation.deployFinalReadbackObservedAt);
  const restoreStarted = Date.parse(relation.restoreOperationStartedAt);
  const rollbackReceiptStarted = Date.parse(receiptProjections.rollbackObserved.startedAt);
  requireCondition(
    [candidateCompleted, deployReadback, restoreStarted, rollbackReceiptStarted].every(Number.isFinite)
      && candidateCompleted <= deployReadback
      && deployReadback < restoreStarted
      && restoreStarted <= rollbackReceiptStarted,
    "timing",
    "ROLLBACK_PROVIDER_COMPOSITION_SEQUENCE_TIME_MISMATCH",
    "Candidate receipt, deploy readback, restore start, and rollback receipt are not monotonically bound."
  );
  return Object.freeze({ candidateB, restoredA });
}

function policyBindingProjection(spec, held) {
  return Object.freeze({
    policyId: spec.policyId,
    path: held.binding.path,
    size: held.binding.size,
    sha256: held.binding.sha256
  });
}

export function validateRollbackProviderSequenceCompositionPolicy(policy) {
  requireCondition(
    exactJson(policy, EXPECTED_COMPOSITION_POLICY),
    "policy",
    "ROLLBACK_PROVIDER_COMPOSITION_POLICY_INVALID",
    "Composition policy is not the exact closed v1 policy."
  );
  return immutableJsonSnapshot(policy);
}

export function buildRollbackProviderSequenceCompositionFailure(error) {
  const known = error instanceof RollbackProviderSequenceCompositionError;
  const message = error instanceof Error ? error.message : String(error);
  return immutableJsonSnapshot({
    schemaVersion: 1,
    resultType: "rollback_provider_sequence_composition_failure_v1",
    verificationKind: "offline-projection-only-overlapping-persisted-provider-sequence-v1",
    status: "failed",
    trustClass: "untrusted_candidate_composition",
    admissionStatus: "not_admitted",
    usableForAdmission: false,
    formalRollbackEvidenceVerified: false,
    formalRollbackDownstreamReached: false,
    samePolicyEpochFormalCompositionAvailable: false,
    stage: known ? error.stage : "internal",
    code: known ? error.code : "ROLLBACK_PROVIDER_COMPOSITION_FAILED",
    messageDigest: sha256(message),
    attempts: ATTEMPTS,
    claims: CLAIMS,
    authority: AUTHORITY,
    cliExitCode: 1
  });
}

export async function composeRollbackProviderSequenceCandidate(input, { cwd = process.cwd() } = {}) {
  const parsed = parseRollbackProviderSequenceCompositionInput(input);
  const workspace = path.resolve(cwd);
  requireCondition(
    comparablePath(parsed.bindingRoot) === comparablePath(workspace),
    "input",
    "ROLLBACK_PROVIDER_COMPOSITION_BINDING_ROOT_CWD_MISMATCH",
    "Binding root must exactly equal cwd."
  );
  const rootInputs = [
    [parsed.bindingRoot, "Binding root"],
    [parsed.rollbackEvidenceRoot, "Rollback Evidence root"],
    [parsed.rollbackReceiptsRoot, "Rollback receipt root"],
    [parsed.deployOutputRoot, "Provider deploy output root"],
    [parsed.restoreOutputRoot, "Provider restore output root"],
    [parsed.sequenceOutputRoot, "Provider sequence output root"]
  ];
  await Promise.all(rootInputs.map(([root, label]) => assertNoAliases(parsed.bindingRoot, root, label)));
  const rootLocks = await Promise.all(rootInputs.map(([root, label]) => captureDirectoryLock(root, label)));
  requireCondition(
    rootLocks[0].realPath === comparablePath(await realpath(workspace)),
    "filesystem",
    "ROLLBACK_PROVIDER_COMPOSITION_BINDING_ROOT_CWD_MISMATCH",
    "Binding root and cwd must share one physical directory identity."
  );

  const heldFiles = [];
  async function hold(options) {
    const held = await openHeldFile({ bindingRoot: parsed.bindingRoot, ...options });
    heldFiles.push(held);
    return held;
  }

  try {
    const evidenceHeld = await hold({
      filePath: parsed.rollbackEvidencePath,
      rootPath: parsed.rollbackEvidenceRoot,
      label: "Rollback Evidence input"
    });
    const sidecarHeld = await hold({
      filePath: `${parsed.rollbackEvidencePath}.sha256`,
      rootPath: parsed.rollbackEvidenceRoot,
      label: "Rollback Evidence sidecar"
    });
    const evidence = parseJsonBytes(evidenceHeld.bytes, "Rollback Evidence input");
    const policyBindingById = assertExactRollbackPolicyBindings(evidence);

    const policyHeldById = new Map();
    for (const spec of REQUIRED_POLICY_SPECS) {
      const binding = policyBindingById.get(spec.policyId);
      const held = await hold({
        filePath: path.resolve(parsed.bindingRoot, spec.path),
        rootPath: parsed.bindingRoot,
        label: `Current policy ${spec.policyId}`
      });
      requireCondition(
        held.binding.sha256 === binding.sha256,
        "policy",
        "ROLLBACK_PROVIDER_COMPOSITION_POLICY_DIGEST_MISMATCH",
        `Current policy ${spec.policyId} raw bytes do not match Rollback Evidence.`
      );
      policyHeldById.set(spec.policyId, held);
    }

    const compositionPolicyHeld = await hold({
      filePath: path.resolve(parsed.bindingRoot, ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_PATH),
      rootPath: parsed.bindingRoot,
      label: "Rollback/provider composition policy"
    });
    const compositionSchemaHeld = await hold({
      filePath: path.resolve(parsed.bindingRoot, ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_PATH),
      rootPath: parsed.bindingRoot,
      label: "Rollback/provider composition schema"
    });
    const compositionPolicy = validateRollbackProviderSequenceCompositionPolicy(
      parseJsonBytes(compositionPolicyHeld.bytes, "Rollback/provider composition policy")
    );
    const rollbackValidator = compileRollbackEvidenceSchema(
      parseJsonBytes(policyHeldById.get("rollback-evidence-schema").bytes, "Rollback Evidence schema")
    );
    try {
      rollbackValidator.assert(evidence);
    } catch (error) {
      fail(
        "schema",
        "ROLLBACK_PROVIDER_COMPOSITION_ROLLBACK_SCHEMA_FAILED",
        "Rollback Evidence failed the checked current schema.",
        error
      );
    }
    assertRollbackMechanicalBoundary(evidence);
    requireCondition(
      sidecarHeld.bytes.toString("utf8") ===
        `${evidenceHeld.binding.sha256}  ${path.basename(parsed.rollbackEvidencePath)}\n`,
      "binding",
      "ROLLBACK_PROVIDER_COMPOSITION_SIDECAR_MISMATCH",
      "Rollback Evidence sidecar does not bind the exact held input bytes."
    );

    const candidateBinding = evidence.receipts.deployments.candidate;
    const rollbackBinding = evidence.receipts.deployments.rollbackObserved;
    const candidateReceiptHeld = await hold({
      filePath: path.resolve(parsed.bindingRoot, candidateBinding.path),
      rootPath: parsed.rollbackReceiptsRoot,
      label: "Candidate deployment receipt",
      expectedBinding: candidateBinding
    });
    const rollbackReceiptHeld = await hold({
      filePath: path.resolve(parsed.bindingRoot, rollbackBinding.path),
      rootPath: parsed.rollbackReceiptsRoot,
      label: "Rollback-observed deployment receipt",
      expectedBinding: rollbackBinding
    });
    assertGloballyDistinctHeldFiles(heldFiles);

    const policyDocuments = new Map([
      ["release-decisions", parseJsonBytes(policyHeldById.get("release-decisions").bytes, "Release decisions")],
      ["hosting-security-policy", parseJsonBytes(policyHeldById.get("hosting-security-policy").bytes, "Hosting policy")],
      ["rollback-evidence-policy", parseJsonBytes(policyHeldById.get("rollback-evidence-policy").bytes, "Rollback policy")]
    ]);
    const hostingPolicy = assertCurrentPolicyDocuments(policyDocuments);
    const candidateEnvelope = parseJsonBytes(candidateReceiptHeld.bytes, "Candidate deployment receipt");
    const rollbackEnvelope = parseJsonBytes(rollbackReceiptHeld.bytes, "Rollback-observed deployment receipt");

    let checkpointCount = 0;
    let receiptProjections;
    const providerResult = await verifyPersistedProviderDeploymentCandidateSequence({
      bindingRoot: parsed.bindingRoot,
      deployOutputRoot: parsed.deployOutputRoot,
      deployReceiptPath: parsed.deployReceiptPath,
      restoreOutputRoot: parsed.restoreOutputRoot,
      restoreReceiptPath: parsed.restoreReceiptPath,
      sequenceOutputRoot: parsed.sequenceOutputRoot,
      sequencePath: parsed.sequencePath,
      cwd: workspace,
      onOverlappingEpochCheckpoint: async (checkpoint) => {
        checkpointCount += 1;
        requireCondition(
          checkpointCount === 1 && checkpoint === "during_overlapping_sequence_package_epoch",
          "provider_sequence",
          "ROLLBACK_PROVIDER_COMPOSITION_CHECKPOINT_PROTOCOL_INVALID",
          "Persisted provider verifier must expose exactly one expected overlapping epoch checkpoint."
        );
        for (const held of heldFiles) await assertHeldFileStable(held, rootLocks);
        assertRollbackMechanicalBoundary(evidence);
        assertCurrentPolicyDocuments(policyDocuments);
        receiptProjections = Object.freeze({
          candidate: validateRollbackDeploymentReceiptProjectionForContract({
            envelope: candidateEnvelope,
            binding: candidateBinding,
            phaseId: "candidate",
            expectedIdentity: evidence.identities.candidate,
            document: evidence,
            hostingPolicy
          }),
          rollbackObserved: validateRollbackDeploymentReceiptProjectionForContract({
            envelope: rollbackEnvelope,
            binding: rollbackBinding,
            phaseId: "rollbackObserved",
            expectedIdentity: evidence.identities.baseline,
            document: evidence,
            hostingPolicy
          })
        });
      }
    });
    requireCondition(
      checkpointCount === 1 && isRecord(receiptProjections),
      "provider_sequence",
      "ROLLBACK_PROVIDER_COMPOSITION_CHECKPOINT_PROTOCOL_INVALID",
      "Persisted provider verifier did not complete the overlapping rollback projection checkpoint."
    );
    for (const held of heldFiles) await assertHeldFileStable(held, rootLocks);
    const providerTerminalGates = assertProviderVerifierBoundary(providerResult);

    const policyBindings = REQUIRED_POLICY_SPECS.map((spec) =>
      policyBindingProjection(spec, policyHeldById.get(spec.policyId)));
    const artifactProjection = assertCrossBindings({
      evidence,
      providerResult,
      hostingPolicy,
      policyBindings,
      receiptProjections
    });
    const relation = providerResult.document.deploymentIdRelation;
    const unsigned = {
      schemaVersion: 1,
      recordType: "rollback_provider_sequence_composition_candidate_v1",
      verificationKind: "offline-projection-only-overlapping-persisted-provider-sequence-v1",
      trustClass: compositionPolicy.terminalState.trustClass,
      status: compositionPolicy.terminalState.status,
      admissionStatus: compositionPolicy.terminalState.admissionStatus,
      usableForAdmission: false,
      formalRollbackEvidenceVerified: false,
      formalRollbackDownstreamReached: false,
      samePolicyEpochFormalCompositionAvailable: false,
      compositionId: "",
      releaseIdentity: {
        channel: "default-v13",
        descriptor: structuredClone(DEFAULT_DESCRIPTOR),
        mutationEpochCapability: "absent_schema13",
        epoch: null
      },
      rollbackEvidence: {
        binding: evidenceHeld.binding,
        sidecarBinding: sidecarHeld.binding,
        runId: evidence.runId,
        rollbackEvidenceId: evidence.rollbackEvidenceId,
        evidenceDigest: evidence.evidenceDigest
      },
      providerSequence: {
        binding: providerResult.sequenceBinding,
        sequenceId: providerResult.sequenceId,
        sequenceDigest: providerResult.sequenceDigest,
        terminalGates: providerTerminalGates
      },
      currentPolicyBindings: policyBindings,
      compositionSources: {
        policy: compositionPolicyHeld.binding,
        schema: compositionSchemaHeld.binding
      },
      hostingPolicy: {
        policyId: hostingPolicy.policyId,
        path: policyBindings.find((binding) => binding.policyId === "hosting-security-policy").path,
        size: policyBindings.find((binding) => binding.policyId === "hosting-security-policy").size,
        sha256: policyBindings.find((binding) => binding.policyId === "hosting-security-policy").sha256,
        deploymentPlatform: hostingPolicy.deploymentPlatform,
        origin: evidence.scope.origin
      },
      artifactProjection: {
        candidateB: artifactProjection.candidateB,
        restoredA: artifactProjection.restoredA,
        artifactsDistinct: true
      },
      deploymentReceipts: receiptProjections,
      deploymentRelation: {
        baselineAId: relation.baselineAId,
        candidateBId: relation.candidateBId,
        restoredActiveDeploymentId: relation.restoredActiveDeploymentId,
        candidateReceiptDeploymentId: receiptProjections.candidate.deploymentId,
        rollbackReceiptDeploymentId: receiptProjections.rollbackObserved.deploymentId,
        candidateReceiptCompletedAt: receiptProjections.candidate.completedAt,
        deployFinalReadbackObservedAt: relation.deployFinalReadbackObservedAt,
        restoreOperationStartedAt: relation.restoreOperationStartedAt,
        rollbackReceiptStartedAt: receiptProjections.rollbackObserved.startedAt
      },
      mechanicalChecks: {
        rollbackCheckedSchemaVerified: true,
        rollbackIdentityAndDigestVerified: true,
        currentPolicyRawHashesVerified: true,
        defaultV13BoundaryVerified: true,
        declaredRollbackIdentityMatchesBaselineProjection: true,
        distinctArtifactPairVerified: true,
        schema13EpochAbsenceVerified: true,
        deploymentReceiptProjectionVerified: true,
        providerSequencePersistedVerifierConsumed: true,
        providerTerminalGatesCrossBound: true,
        overlappingFilesystemEpochVerified: true,
        providerOriginHostingPolicyCrossBound: true,
        fiveFieldArtifactProjectionCrossBound: true,
        deploymentIdRelationCrossBound: true,
        timeRelationCrossBound: true
      },
      attempts: ATTEMPTS,
      claims: CLAIMS,
      authority: AUTHORITY
    };
    unsigned.compositionId = `rollback-provider-composition-${sha256(canonicalJson({
      rollbackEvidenceId: evidence.rollbackEvidenceId,
      sequenceId: providerResult.sequenceId,
      candidateReceiptSha256: receiptProjections.candidate.binding.sha256,
      rollbackReceiptSha256: receiptProjections.rollbackObserved.binding.sha256,
      compositionPolicySha256: compositionPolicyHeld.binding.sha256
    })).slice(0, 32)}`;
    const document = {
      ...unsigned,
      compositionDigest: sha256(canonicalJson(unsigned))
    };
    const compositionValidator = compileRollbackProviderSequenceCompositionSchema(
      parseJsonBytes(compositionSchemaHeld.bytes, "Rollback/provider composition schema")
    );
    try {
      compositionValidator.assert(document);
    } catch (error) {
      fail(
        "schema",
        "ROLLBACK_PROVIDER_COMPOSITION_OUTPUT_SCHEMA_FAILED",
        "Composition output failed its checked schema.",
        error
      );
    }
    return immutableJsonSnapshot(document);
  } finally {
    await Promise.all(heldFiles.map((held) => held.handle.close().catch(() => undefined)));
  }
}
