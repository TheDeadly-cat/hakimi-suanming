import { createPublicKey, verify as verifySignature } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import {
  validateHostingSecurityPolicy,
  validateRealDeployedHostPreflight
} from "./deployed-security-headers-lib.mjs";
import {
  assertReleaseArtifactMutationBoundary,
  verifyReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import {
  canonicalJson,
  relativePathWithin,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";
import { loadReleaseEvidenceSchemaValidator } from "./release-evidence-schema.mjs";
import { verifyReleaseEvidenceFiles } from "./verify-release-evidence.mjs";
import { loadRollbackEvidenceSchemaValidator } from "./rollback-evidence-schema.mjs";

export const ROLLBACK_EVIDENCE_POLICY_PATH =
  "docs/release/rollback-evidence-policy.v1.json";
export const ROLLBACK_ACTOR_REGISTRY_PATH =
  "docs/release/rollback-actor-trust-registry.v1.json";

export const ROLLBACK_PHASE_IDS = Object.freeze([
  "baseline",
  "candidate",
  "rollbackObserved"
]);
export const ROLLBACK_BROWSER_PROJECTS = Object.freeze(["msedge", "chrome"]);

const UTC_MILLISECONDS =
  /^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const RELEASE_EVIDENCE_ID = /^hre1-[a-f0-9]{32}$/u;
const CANONICAL_ID = /^[a-z0-9][a-z0-9._-]*$/u;

const REQUIRED_DESCRIPTOR = Object.freeze({
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

const REQUIRED_POLICY_BINDINGS = Object.freeze([
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
    path: "docs/release/rollback-evidence.schema.json"
  }),
  Object.freeze({
    policyId: "rollback-evidence-policy",
    path: ROLLBACK_EVIDENCE_POLICY_PATH
  }),
  Object.freeze({
    policyId: "rollback-actor-trust-registry",
    path: ROLLBACK_ACTOR_REGISTRY_PATH
  })
]);

const GATE_NAMES = Object.freeze([
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

const HOST_RESULT_KEYS = Object.freeze([
  "schemaVersion", "summaryType", "policyId", "verificationKind",
  "targetOrigin", "deploymentPlatform", "dnsResolutionAttempted",
  "networkAttempted", "networkCompleted", "startedAt", "completedAt",
  "expectedIdentity", "declaredResourcePaths", "probes", "redirectProbes",
  "nonPublicProbes", "gates", "strictGatePassed", "claims", "errors"
]);

const HOST_GATE_KEYS = Object.freeze([
  "policyValidated", "targetOriginSyntaxEligible", "dnsPublicAddressSetVerified",
  "publicHttpsVerified", "pathMatrixVerified", "redirectMatrixVerified",
  "securityHeadersVerified", "cacheRulesVerified", "behaviorResponseHeadersAbsent",
  "contentTypesVerified", "contentEncodingsVerified",
  "htmlManifestDeclaredResourcesVerified", "releaseIdentityVerified",
  "applicationIdentityVerified", "publicArtifactSetVerified",
  "nonPublicArtifactsHidden", "hstsHeaderVerified", "cspBlockingHeaderVerified",
  "cspBrowserEnforcementVerified", "inlineCssBrowserNetworkVerified",
  "javascriptRuntimeNetworkVerified", "serviceWorkerBrowserRuntimeVerified",
  "mockedContractVerified", "realHostVerified", "publicReleaseGatePassed"
]);

const RUNTIME_OBSERVATION_KEYS = Object.freeze([
  "observedAt", "origin", "online", "coldStart", "applicationShellSha256",
  "documentBuildVersion", "documentEvidenceId", "manifestDigest",
  "controllerPresent", "controllerScriptUrl", "controllerScriptSha256",
  "controllerBuildVersion", "activeBuildVersion", "waitingBuildVersion",
  "installingBuildVersion", "registrationScope", "cacheGeneration"
]);

const BROWSER_OBSERVATION_KEYS = Object.freeze([
  "phaseId", ...RUNTIME_OBSERVATION_KEYS, "controllerChangeCount",
  "unexpectedExternalRequestCount"
]);

const EXPORT_KEYS = Object.freeze([
  "phaseId", "format", "archiveSize", "archiveSha256",
  "logicalPayloadDigest", "sourceBeforeCommitment", "sourceAfterCommitment",
  "readOnly", "preflightPassed"
]);

const REGISTRY_KEYS = Object.freeze([
  "schemaVersion", "registryType", "registryId", "status", "actors",
  "gateSummary", "claims"
]);
const REGISTRY_ACTOR_KEYS = Object.freeze([
  "actorId", "roles", "identityAuthority", "status", "realIdentityVerified",
  "keys"
]);
const REGISTRY_KEY_KEYS = Object.freeze([
  "keyId", "algorithm", "status", "publicKeySpkiBase64", "validFrom",
  "validUntil"
]);

export class RollbackEvidenceVerificationError extends Error {
  constructor(stage, code, message, cause = undefined) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RollbackEvidenceVerificationError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new RollbackEvidenceVerificationError(stage, code, message, cause);
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

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function exactArtifactMutationBoundary(left, right) {
  try {
    assertReleaseArtifactMutationBoundary(left);
    assertReleaseArtifactMutationBoundary(right);
    return exactJson(left, right);
  } catch {
    return false;
  }
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function assertUtcMilliseconds(value, label, nullable = false) {
  if (nullable && value === null) return null;
  requireCondition(
    typeof value === "string" && UTC_MILLISECONDS.test(value),
    "timing",
    "NON_CANONICAL_TIMESTAMP",
    `${label} is not a UTC millisecond timestamp.`
  );
  const milliseconds = Date.parse(value);
  requireCondition(
    Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value,
    "timing",
    "INVALID_TIMESTAMP",
    `${label} is not a real UTC timestamp.`
  );
  return milliseconds;
}

function assertDigest(value, label) {
  requireCondition(
    typeof value === "string" && SHA256.test(value),
    "binding",
    "INVALID_DIGEST",
    `${label} is not a canonical SHA-256 digest.`
  );
  return value;
}

function normalizedUnsignedDocument(document, omittedKeys) {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !omittedKeys.includes(key))
  );
}

export function computeRollbackEvidenceId(document) {
  requireCondition(isRecord(document), "identity", "INVALID_DOCUMENT", "Rollback Evidence must be an object.");
  const basis = normalizedUnsignedDocument(document, ["rollbackEvidenceId", "evidenceDigest"]);
  return `hrb1-${sha256(canonicalJson(basis)).slice(0, 32)}`;
}

export function computeRollbackEvidenceDigest(document) {
  requireCondition(isRecord(document), "identity", "INVALID_DOCUMENT", "Rollback Evidence must be an object.");
  return sha256(canonicalJson(normalizedUnsignedDocument(document, ["evidenceDigest"])));
}

function actorDescriptor(actor) {
  return {
    actorId: actor.actorId,
    role: actor.role,
    identityAuthority: actor.identityAuthority
  };
}

function approvalWithoutAttestation(approval) {
  return {
    approvalId: approval.approvalId,
    approvalScope: approval.approvalScope,
    status: approval.status,
    approvedAt: approval.approvedAt,
    expiresAt: approval.expiresAt
  };
}

export function computeRollbackAttestationBasisDigests(document, preAcceptanceGates = null) {
  const dataOwnerBasis = {
    schemaVersion: 1,
    basisType: "rollback_data_owner_approval_v1",
    runId: document.runId,
    scope: document.scope,
    policyBindings: document.policyBindings,
    dataCopy: {
      classification: document.dataCopy.classification,
      approvedCopyClass: document.dataCopy.approvedCopyClass,
      copyId: document.dataCopy.copyId,
      databaseName: document.dataCopy.databaseName,
      sourceSchema: document.dataCopy.sourceSchema,
      epochSupport: document.dataCopy.epochSupport,
      epochBefore: document.dataCopy.epochBefore,
      epochAfter: document.dataCopy.epochAfter,
      rawIndexedDbBypassUsed: document.dataCopy.rawIndexedDbBypassUsed,
      mutationEpochBypassed: document.dataCopy.mutationEpochBypassed,
      releaseControlPointerModified: document.dataCopy.releaseControlPointerModified,
      privatePackage: document.dataCopy.privatePackage,
      approval: approvalWithoutAttestation(document.dataCopy.approval),
      fingerprint: document.dataCopy.fingerprint
    },
    actor: actorDescriptor(document.actors.dataOwnerApprover)
  };
  const operatorBasis = {
    schemaVersion: 1,
    basisType: "rollback_operator_execution_v1",
    runId: document.runId,
    scope: document.scope,
    policyBindings: document.policyBindings,
    identities: document.identities,
    execution: document.execution,
    dataCopy: document.dataCopy,
    receipts: document.receipts,
    actor: actorDescriptor(document.actors.operator)
  };
  const acceptorBasis = {
    schemaVersion: 1,
    basisType: "rollback_acceptor_verification_v1",
    runId: document.runId,
    scope: document.scope,
    policyBindings: document.policyBindings,
    identities: document.identities,
    execution: document.execution,
    dataCopy: document.dataCopy,
    receipts: document.receipts,
    operator: document.actors.operator,
    actor: actorDescriptor(document.actors.acceptor),
    preAcceptanceGates,
    terminalStatement: {
      status: document.status,
      failure: document.failure,
      claims: document.claims
    }
  };
  return Object.freeze({
    dataOwner: sha256(canonicalJson(dataOwnerBasis)),
    operator: sha256(canonicalJson(operatorBasis)),
    acceptor: preAcceptanceGates === null ? null : sha256(canonicalJson(acceptorBasis))
  });
}

async function readRegularFile(absolutePath, label) {
  let stat;
  try {
    stat = await lstat(absolutePath);
  } catch (error) {
    fail("filesystem", "FILE_UNREADABLE", `${label} is not readable.`, error);
  }
  requireCondition(
    stat.isFile() && !stat.isSymbolicLink(),
    "filesystem",
    "NON_REGULAR_FILE",
    `${label} must be a regular non-symlink file.`
  );
  return readFile(absolutePath);
}

async function assertRealContainment(rootPath, filePath, label) {
  let resolvedRoot;
  let resolvedFile;
  try {
    [resolvedRoot, resolvedFile] = await Promise.all([realpath(rootPath), realpath(filePath)]);
  } catch (error) {
    fail("filesystem", "REALPATH_FAILED", `${label} cannot be resolved.`, error);
  }
  relativePathWithin(resolvedRoot, resolvedFile, label);
}

function pathsOverlap(left, right) {
  const relative = path.relative(left, right);
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function assertNoEvidenceRootAliases(workspace, rootPath, label) {
  const relative = path.relative(path.resolve(workspace), path.resolve(rootPath));
  let current = path.resolve(workspace);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = await lstat(current);
    requireCondition(
      !stat.isSymbolicLink(),
      "filesystem",
      "EVIDENCE_ROOT_ANCESTOR_ALIAS",
      `${label} root cannot traverse a symlink or junction.`
    );
  }
}

async function assertRollbackEvidenceTreePreflight(directoryPath, label) {
  let names;
  try {
    names = await readdir(directoryPath);
  } catch (error) {
    fail(
      "filesystem",
      "EVIDENCE_TREE_UNREADABLE",
      `${label} tree cannot be enumerated.`,
      error
    );
  }
  names.sort();
  for (const name of names) {
    const entryPath = path.join(directoryPath, name);
    let entryStat;
    try {
      entryStat = await lstat(entryPath);
    } catch (error) {
      fail(
        "filesystem",
        "EVIDENCE_TREE_ENTRY_UNREADABLE",
        `${label} tree entry cannot be inspected.`,
        error
      );
    }
    requireCondition(
      !entryStat.isSymbolicLink(),
      "filesystem",
      "EVIDENCE_TREE_ALIAS",
      `${label} tree cannot contain a symlink or junction.`
    );
    if (entryStat.isDirectory()) {
      await assertRollbackEvidenceTreePreflight(entryPath, label);
      continue;
    }
    requireCondition(
      entryStat.isFile(),
      "filesystem",
      "EVIDENCE_TREE_NON_REGULAR_ENTRY",
      `${label} tree can contain only real directories and regular files.`
    );
    requireCondition(
      entryStat.nlink === 1,
      "filesystem",
      "EVIDENCE_TREE_HARDLINK",
      `${label} tree cannot contain hard-linked regular files.`
    );
  }
}

export async function assertIsolatedRollbackEvidenceRoots({
  workspace,
  input,
  baselineArtifactRoot,
  candidateArtifactRoot,
  receiptDirectory,
  privateDirectory
}) {
  let resolvedWorkspace;
  try {
    resolvedWorkspace = await realpath(workspace);
  } catch (error) {
    fail("filesystem", "REALPATH_FAILED", "Rollback workspace cannot be resolved.", error);
  }
  const workspaceStat = await lstat(workspace);
  requireCondition(
    workspaceStat.isDirectory() && !workspaceStat.isSymbolicLink(),
    "filesystem",
    "EVIDENCE_WORKSPACE_INVALID",
    "Rollback workspace must be a real non-symlink directory."
  );
  const entries = [
    ["baseline artifact", baselineArtifactRoot],
    ["candidate artifact", candidateArtifactRoot],
    ["receipt", receiptDirectory],
    ["private", privateDirectory]
  ];
  const resolved = [];
  for (const [label, rootPath] of entries) {
    relativePathWithin(workspace, rootPath, `${label} root`);
    await assertNoEvidenceRootAliases(workspace, rootPath, label);
    const rootStat = await lstat(rootPath);
    requireCondition(
      rootStat.isDirectory() && !rootStat.isSymbolicLink(),
      "filesystem",
      "EVIDENCE_ROOT_INVALID",
      `${label} root must be a real non-symlink directory.`
    );
    const resolvedRoot = await realpath(rootPath);
    try {
      relativePathWithin(resolvedWorkspace, resolvedRoot, `${label} real root`);
    } catch (error) {
      fail(
        "filesystem",
        "EVIDENCE_ROOT_ESCAPES_WORKSPACE",
        `${label} real root escapes the resolved rollback workspace.`,
        error
      );
    }
    resolved.push([label, resolvedRoot]);
  }
  for (let leftIndex = 0; leftIndex < resolved.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < resolved.length; rightIndex += 1) {
      const [leftLabel, leftPath] = resolved[leftIndex];
      const [rightLabel, rightPath] = resolved[rightIndex];
      requireCondition(
        !pathsOverlap(leftPath, rightPath) && !pathsOverlap(rightPath, leftPath),
        "filesystem",
        "EVIDENCE_ROOTS_OVERLAP",
        `${leftLabel} and ${rightLabel} roots must be realpath-distinct non-nested domains.`
      );
    }
  }
  for (const [label, resolvedRoot] of resolved) {
    await assertRollbackEvidenceTreePreflight(resolvedRoot, label);
  }
  await assertRealContainment(privateDirectory, input, "Rollback Evidence input");
  await assertRealContainment(privateDirectory, `${input}.sha256`, "Rollback Evidence sidecar");
}

async function readBindingFile({ cwd, root, binding, label, digestField = "sha256" }) {
  requireCondition(
    isRecord(binding)
      && typeof binding.path === "string"
      && Number.isInteger(binding.size)
      && binding.size > 0,
    "binding",
    "INVALID_FILE_BINDING",
    `${label} binding is malformed.`
  );
  assertDigest(binding[digestField], `${label}.${digestField}`);
  const absolutePath = path.resolve(cwd, binding.path);
  requireCondition(
    binding.path === relativePathWithin(cwd, absolutePath, label),
    "binding",
    "NON_CANONICAL_PATH",
    `${label} path is not canonical relative to the workspace.`
  );
  relativePathWithin(root, absolutePath, label);
  await assertRealContainment(root, absolutePath, label);
  const bytes = await readRegularFile(absolutePath, label);
  requireCondition(
    bytes.byteLength === binding.size && sha256(bytes) === binding[digestField],
    "binding",
    "FILE_BINDING_MISMATCH",
    `${label} bytes do not match the bound size and digest.`
  );
  return Object.freeze({ absolutePath, bytes });
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("schema", "INVALID_JSON", `${label} is not valid UTF-8 JSON.`, error);
  }
}

function identityEvidenceId(identity) {
  return identity.releaseEvidence.evidenceId;
}

function normalizedReleaseIdentity(identity) {
  return {
    descriptor: identity.descriptor,
    evidenceId: identityEvidenceId(identity),
    buildVersion: identity.buildVersion,
    manifestDigest: identity.manifestDigest,
    artifactSetDigest: identity.artifactSetDigest,
    components: identity.components
  };
}

function assertDefaultV13Identity(identity, label) {
  requireCondition(
    isRecord(identity)
      && identity.channel === "default-v13"
      && exactJson(identity.descriptor, REQUIRED_DESCRIPTOR)
      && RELEASE_EVIDENCE_ID.test(identityEvidenceId(identity) ?? "")
      && /^[a-f0-9]{12}$/u.test(identity.buildVersion ?? "")
      && SHA256.test(identity.manifestDigest ?? "")
      && SHA256.test(identity.artifactSetDigest ?? ""),
    "artifact_identity",
    "INVALID_RELEASE_IDENTITY",
    `${label} is not the frozen default-v13 identity.`
  );
}

function validateRollbackPolicy(policy) {
  const keys = [
    "schemaVersion", "policyId", "status", "executionAdmission", "evidenceType", "releaseIdentity",
    "evidenceVisibility", "requiredPhases", "requiredBrowserProjects",
    "requiredHostVerificationKind", "requiredDataCopyClasses",
    "mutationEpochCapability", "requiredPolicyBindings", "signaturePolicy",
    "authorizationGates", "doesNotEstablish"
  ];
  requireCondition(
    exactKeys(policy, keys)
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.rollback-evidence/v1"
      && policy.status === "contract_only_not_executed"
      && exactJson(policy.executionAdmission, {
        status: "closed_missing_trusted_raw_evidence",
        formalReleaseSemanticReplayVerified: false,
        hostRawProbeReceiptParserVerified: false,
        browserCdpControllerReceiptParserVerified: false,
        providerDeploymentReceiptParserVerified: false,
        dataFingerprintRecomputationVerified: false,
        actorRegistryGovernanceSignatureVerified: false,
        phaseCheckpointFreezeVerified: false,
        offlineRollbackObservationVerified: false
      })
      && policy.evidenceType === "engineering_rollback_execution_evidence"
      && policy.evidenceVisibility === "private_non_public_artifact"
      && exactJson(policy.releaseIdentity, {
        channel: "default-v13",
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      })
      && exactJson(policy.requiredPhases, [
        "baseline_observed", "candidate_deployed", "rollback_restored"
      ])
      && exactJson(policy.requiredBrowserProjects, ROLLBACK_BROWSER_PROJECTS)
      && policy.requiredHostVerificationKind === "real-network"
      && exactJson(policy.requiredDataCopyClasses, [
        "owner_approved_read_only_v13_copy",
        "approved_deidentified_v13_copy"
      ])
      && policy.mutationEpochCapability === "absent_schema13"
      && exactJson(
        policy.requiredPolicyBindings,
        REQUIRED_POLICY_BINDINGS.map(({ policyId: role, path: policyPath }) => ({ role, path: policyPath }))
      )
      && exactJson(policy.signaturePolicy, {
        algorithm: "ed25519",
        operatorAndAcceptorMustDiffer: true,
        trustedOperatorRequired: true,
        trustedAcceptorRequired: true,
        acceptanceDecisionRequired: "accept"
      })
      && exactJson(policy.authorizationGates, {
        publicDeploymentAuthorized: false,
        expertClaimsAuthorized: false,
        contentTruthAuthorized: false,
        rightsLegalConclusionAuthorized: false,
        releaseReady: false
      })
      && exactJson(policy.doesNotEstablish, [
        "real_rollback_without_a_verified_evidence_instance",
        "real_actor_identity_or_independence",
        "data_owner_consent_truth",
        "content_truth",
        "expert_truth",
        "rights_or_legal_conclusion",
        "release_readiness",
        "public_release_authorization"
      ]),
    "policy",
    "ROLLBACK_POLICY_INVALID",
    "Rollback Evidence policy is not the exact fail-closed v1 contract."
  );
  return policy;
}

function assertRollbackExecutionAdmission(policy) {
  requireCondition(
    policy.status === "contract_only_not_executed"
      && policy.executionAdmission.status === "closed_missing_trusted_raw_evidence"
      && Object.entries(policy.executionAdmission)
        .filter(([key]) => key !== "status")
        .every(([, value]) => value === false),
    "execution_admission",
    "ROLLBACK_EXECUTION_ADMISSION_POLICY_INVALID",
    "Rollback execution admission policy is not the exact closed contract."
  );
  fail(
    "execution_admission",
    "ROLLBACK_EXECUTION_ADMISSION_CLOSED",
    "Rollback execution verification is contract-only until formal semantic replay, raw host/CDP/provider receipts, data fingerprint recomputation, registry governance signatures, phase freezing, and offline observation are independently implemented and admitted in a new policy version."
  );
}

async function verifyPolicyBindings({ cwd, document }) {
  const expectedByRole = new Map(REQUIRED_POLICY_BINDINGS.map((entry) => [entry.policyId, entry]));
  requireCondition(
    Array.isArray(document.policyBindings)
      && document.policyBindings.length === REQUIRED_POLICY_BINDINGS.length,
    "policy",
    "POLICY_SET_MISMATCH",
    "Rollback Evidence does not bind the exact required policy set."
  );
  const observedRoles = new Set();
  const loaded = new Map();
  for (const binding of document.policyBindings) {
    requireCondition(
      exactKeys(binding, ["policyId", "path", "sha256"])
        && CANONICAL_ID.test(binding.policyId ?? "")
        && SHA256.test(binding.sha256 ?? ""),
      "policy",
      "POLICY_BINDING_INVALID",
      "A rollback policy binding is malformed."
    );
    const expected = expectedByRole.get(binding.policyId);
    requireCondition(
      expected !== undefined
        && !observedRoles.has(binding.policyId)
        && binding.path === expected.path,
      "policy",
      "POLICY_SET_MISMATCH",
      "Rollback Evidence policy roles or paths are not exact."
    );
    observedRoles.add(binding.policyId);
    const absolutePath = path.resolve(cwd, binding.path);
    requireCondition(
      binding.path === relativePathWithin(cwd, absolutePath, `Policy ${binding.policyId}`),
      "policy",
      "NON_CANONICAL_POLICY_PATH",
      `Policy ${binding.policyId} path is not canonical.`
    );
    const bytes = await readRegularFile(absolutePath, `Policy ${binding.policyId}`);
    requireCondition(
      sha256(bytes) === binding.sha256,
      "policy",
      "POLICY_DIGEST_MISMATCH",
      `Policy ${binding.policyId} raw bytes do not match the binding.`
    );
    loaded.set(binding.policyId, { binding, bytes });
  }
  requireCondition(
    observedRoles.size === REQUIRED_POLICY_BINDINGS.length,
    "policy",
    "POLICY_SET_MISMATCH",
    "Rollback Evidence policy set is incomplete."
  );

  const rollbackPolicy = validateRollbackPolicy(
    parseJsonBytes(loaded.get("rollback-evidence-policy").bytes, "Rollback Evidence policy")
  );
  const decisions = parseJsonBytes(loaded.get("release-decisions").bytes, "Release decisions");
  requireCondition(
    decisions.defaultRelease?.dbGeneration === "legacy-v13"
      && decisions.defaultRelease?.targetSchema === 13
      && decisions.defaultRelease?.migrationId === null
      && decisions.hosting?.publicDeploymentAuthorized === false
      && decisions.domainClaims?.expertValidatedClaimAuthorized === false,
    "policy",
    "RELEASE_BOUNDARY_MISMATCH",
    "Release decisions do not preserve the v13 and authorization boundaries."
  );

  const hostingPolicy = parseJsonBytes(
    loaded.get("hosting-security-policy").bytes,
    "Hosting security policy"
  );
  try {
    validateHostingSecurityPolicy(hostingPolicy);
    validateRealDeployedHostPreflight({ baseUrl: document.scope.origin, policy: hostingPolicy });
  } catch (error) {
    fail(
      "policy",
      "REAL_HOST_POLICY_PREFLIGHT_FAILED",
      "Hosting policy is not selected and ready for a public canonical HTTPS rollback target.",
      error
    );
  }
  requireCondition(
    document.scope.origin === hostingPolicy.canonicalOrigin,
    "policy",
    "ORIGIN_POLICY_MISMATCH",
    "Rollback scope does not match the selected canonical hosting origin."
  );

  const registry = parseJsonBytes(
    loaded.get("rollback-actor-trust-registry").bytes,
    "Rollback actor registry"
  );
  return Object.freeze({ rollbackPolicy, decisions, hostingPolicy, registry, loaded });
}

function assertFormalReceiptEnvelope({ receipt, binding, identity, releaseEvidence, lockResult, cwd }) {
  const topKeys = [
    "schemaVersion", "receiptType", "receiptId", "summaryType", "verificationKind",
    "releaseEvidenceId", "status", "verifiedAt", "evidenceId", "releaseEvidence",
    "release", "artifacts", "receiptCount", "gates",
    "formalReleaseEvidenceVerified", "claims"
  ];
  const formalGateKeys = [
    "sourceTreeClean", "evidenceIdBound", "defaultReleaseDescriptorMatched",
    "requiredReceiptsPresent", "allRecordedReceiptsPassed",
    "policyReceiptSetMatched", "recordedReceiptSetMatched",
    "policyReceiptCommandsMatched", "browserResultSummariesMatched",
    "artifactIdentityStable", "requiredArtifactComponentsPresent",
    "engineeringGatePassed"
  ];
  requireCondition(
    exactKeys(receipt, topKeys)
      && receipt.schemaVersion === 1
      && receipt.receiptType === "formal_release_evidence_verification"
      && receipt.summaryType === "formal_release_evidence_verification_v1"
      && receipt.verificationKind === "formal-current-source-and-artifact"
      && receipt.status === "passed"
      && receipt.formalReleaseEvidenceVerified === true
      && receipt.releaseEvidenceId === identityEvidenceId(identity)
      && receipt.evidenceId === identityEvidenceId(identity)
      && receipt.receiptId === binding.receiptId
      && receipt.receiptId === `formal-${identityEvidenceId(identity)}`,
    "formal_release_evidence",
    "FORMAL_RECEIPT_INVALID",
    "Formal Release Evidence receipt envelope is invalid."
  );
  const formalVerifiedAt = assertUtcMilliseconds(receipt.verifiedAt, "Formal receipt verifiedAt");
  requireCondition(
    formalVerifiedAt >= assertUtcMilliseconds(releaseEvidence.generatedAt, "Release Evidence generatedAt"),
    "timing",
    "FORMAL_RECEIPT_PRECEDES_EVIDENCE",
    "Formal verification receipt predates its Release Evidence."
  );
  requireCondition(
    binding.schemaVersion === receipt.schemaVersion
      && binding.receiptType === receipt.receiptType
      && binding.releaseEvidenceId === receipt.releaseEvidenceId
      && binding.status === receipt.status
      && binding.verifiedAt === receipt.verifiedAt,
    "formal_release_evidence",
    "FORMAL_RECEIPT_BINDING_MISMATCH",
    "Formal receipt binding does not match its envelope."
  );
  requireCondition(
    exactKeys(receipt.releaseEvidence, ["path", "sha256"])
      && receipt.releaseEvidence.path === identity.releaseEvidence.path
      && receipt.releaseEvidence.sha256 === identity.releaseEvidence.sha256,
    "formal_release_evidence",
    "FORMAL_RELEASE_EVIDENCE_BINDING_MISMATCH",
    "Formal receipt does not bind the selected Release Evidence bytes."
  );
  requireCondition(
    exactKeys(receipt.release, ["descriptor", "manifestVersion", "manifestDigest", "buildVersion"])
      && exactJson(receipt.release.descriptor, identity.descriptor)
      && receipt.release.manifestVersion === releaseEvidence.release.manifestVersion
      && receipt.release.manifestDigest === identity.manifestDigest
      && receipt.release.buildVersion === identity.buildVersion,
    "formal_release_evidence",
    "FORMAL_RELEASE_IDENTITY_MISMATCH",
    "Formal receipt release identity does not match the artifact identity."
  );
  requireCondition(
    exactKeys(receipt.artifacts, ["root", "count", "artifactSetDigest", "identityLock", "mutationBoundary"])
      && receipt.artifacts.root === identity.artifactRoot
      && receipt.artifacts.count === releaseEvidence.artifacts.count
      && receipt.artifacts.artifactSetDigest === identity.artifactSetDigest
      && exactKeys(receipt.artifacts.identityLock, ["path", "sha256", "lockDigest", "artifactSetDigest"])
      && receipt.artifacts.identityLock.path === lockResult.lockPath
      && receipt.artifacts.identityLock.sha256 === lockResult.lockFileSha256
      && receipt.artifacts.identityLock.lockDigest === lockResult.lock.lockDigest
      && receipt.artifacts.identityLock.artifactSetDigest === lockResult.artifactSetDigest
      && exactArtifactMutationBoundary(
        receipt.artifacts.mutationBoundary,
        releaseEvidence.artifacts?.mutationBoundary
      ),
    "formal_release_evidence",
    "FORMAL_ARTIFACT_BINDING_MISMATCH",
    "Formal receipt artifact identity does not match the verified lock."
  );
  requireCondition(
    Number.isInteger(receipt.receiptCount)
      && receipt.receiptCount > 0
      && receipt.receiptCount === releaseEvidence.testReceipts.length
      && exactKeys(receipt.gates, formalGateKeys)
      && formalGateKeys.every((key) => receipt.gates[key] === true),
    "formal_release_evidence",
    "FORMAL_GATE_NOT_PASSED",
    "Formal Release Evidence gates are not an exact pass."
  );
  requireCondition(
    exactKeys(receipt.claims, [
      "engineeringEvidenceOnly", "sourceAndArtifactCurrentVerified",
      "codeSignature", "browserRuntimeBeyondBoundReceiptsVerified",
      "publicReleaseAuthorized"
    ])
      && receipt.claims.engineeringEvidenceOnly === true
      && receipt.claims.sourceAndArtifactCurrentVerified === true
      && receipt.claims.codeSignature === false
      && receipt.claims.browserRuntimeBeyondBoundReceiptsVerified === false
      && receipt.claims.publicReleaseAuthorized === false,
    "formal_release_evidence",
    "FORMAL_CLAIMS_INVALID",
    "Formal receipt claims exceed the engineering evidence boundary."
  );
  requireCondition(
    receipt.releaseEvidence.path === relativePathWithin(
      cwd,
      path.resolve(cwd, receipt.releaseEvidence.path),
      "Formal receipt Release Evidence path"
    ),
    "formal_release_evidence",
    "FORMAL_PATH_NON_CANONICAL",
    "Formal receipt path is not canonical."
  );
}

export { assertFormalReceiptEnvelope as validateRollbackFormalReceiptProjectionForContract };

async function verifyArtifactIdentity({
  cwd,
  role,
  identity,
  artifactRoot,
  receiptsRoot,
  releaseEvidenceValidator
}) {
  assertDefaultV13Identity(identity, `${role} identity`);
  const expectedArtifactRoot = relativePathWithin(cwd, artifactRoot, `${role} artifact root`);
  requireCondition(
    identity.artifactRoot === expectedArtifactRoot,
    "artifact_identity",
    "ARTIFACT_ROOT_MISMATCH",
    `${role} artifactRoot does not match its CLI root.`
  );

  const evidenceBinding = identity.releaseEvidence;
  const evidenceFile = await readBindingFile({
    cwd,
    root: artifactRoot,
    binding: evidenceBinding,
    label: `${role} Release Evidence`
  });
  const releaseEvidence = parseJsonBytes(evidenceFile.bytes, `${role} Release Evidence`);
  try {
    releaseEvidenceValidator.assert(releaseEvidence);
  } catch (error) {
    fail(
      "formal_release_evidence",
      "RELEASE_EVIDENCE_SCHEMA_FAILED",
      `${role} Release Evidence failed the checked schema.`,
      error
    );
  }
  requireCondition(
    evidenceBinding.schemaVersion === 1
      && evidenceBinding.schemaId === "https://hakimi.invalid/schemas/release-evidence-v1.json"
      && evidenceBinding.evidenceType === "engineering_release_evidence"
      && evidenceBinding.evidenceId === releaseEvidence.evidenceId
      && releaseEvidence.evidenceType === evidenceBinding.evidenceType,
    "formal_release_evidence",
    "RELEASE_EVIDENCE_BINDING_MISMATCH",
    `${role} Release Evidence binding does not match its document.`
  );
  const sidecarBinding = {
    path: evidenceBinding.sidecarPath,
    size: -1,
    sha256: evidenceBinding.sidecarSha256
  };
  const sidecarAbsolute = path.resolve(cwd, evidenceBinding.sidecarPath);
  requireCondition(
    evidenceBinding.sidecarPath === relativePathWithin(cwd, sidecarAbsolute, `${role} sidecar`),
    "formal_release_evidence",
    "SIDECAR_PATH_NON_CANONICAL",
    `${role} Release Evidence sidecar path is not canonical.`
  );
  relativePathWithin(artifactRoot, sidecarAbsolute, `${role} sidecar`);
  await assertRealContainment(artifactRoot, sidecarAbsolute, `${role} sidecar`);
  const sidecarBytes = await readRegularFile(sidecarAbsolute, `${role} Release Evidence sidecar`);
  sidecarBinding.size = sidecarBytes.byteLength;
  requireCondition(
    sha256(sidecarBytes) === evidenceBinding.sidecarSha256
      && sidecarBytes.toString("utf8") ===
        `${evidenceBinding.sha256}  ${path.basename(evidenceBinding.path)}\n`,
    "formal_release_evidence",
    "RELEASE_EVIDENCE_SIDECAR_MISMATCH",
    `${role} Release Evidence sidecar does not bind the exact Evidence bytes.`
  );

  requireCondition(
    exactJson(releaseEvidence.release.descriptor, identity.descriptor)
      && releaseEvidence.release.channel === identity.channel
      && releaseEvidence.release.buildVersion === identity.buildVersion
      && releaseEvidence.release.manifestDigest === identity.manifestDigest
      && releaseEvidence.release.builtEvidenceId === evidenceBinding.evidenceId
      && releaseEvidence.release.evidenceIdBound === true
      && releaseEvidence.artifacts.root === identity.artifactRoot
      && releaseEvidence.artifacts.artifactSetDigest === identity.artifactSetDigest
      && releaseEvidence.gates.engineeringGatePassed === true,
    "formal_release_evidence",
    "RELEASE_EVIDENCE_IDENTITY_MISMATCH",
    `${role} Release Evidence does not match the selected release identity.`
  );

  const lockPath = path.resolve(cwd, identity.identityLock.path);
  relativePathWithin(receiptsRoot, lockPath, `${role} artifact lock`);
  await assertRealContainment(receiptsRoot, lockPath, `${role} artifact lock`);
  const lockBytes = await readRegularFile(lockPath, `${role} artifact lock`);
  requireCondition(
    identity.identityLock.size === lockBytes.byteLength
      && identity.identityLock.sha256 === sha256(lockBytes)
      && identity.identityLock.verified === true,
    "artifact_identity",
    "ARTIFACT_LOCK_BINDING_MISMATCH",
    `${role} artifact lock bytes do not match the binding.`
  );
  let lockResult;
  try {
    lockResult = await verifyReleaseArtifactIdentityLock({
      cwd,
      dist: artifactRoot,
      lockPath,
      evidenceId: evidenceBinding.evidenceId
    });
  } catch (error) {
    fail(
      "artifact_identity",
      "ARTIFACT_LOCK_VERIFICATION_FAILED",
      `${role} artifact lock did not verify against current bytes.`,
      error
    );
  }
  const components = releaseArtifactComponents(lockResult.lock.files);
  requireCondition(
    identity.identityLock.path === lockResult.lockPath
      && identity.identityLock.lockDigest === lockResult.lock.lockDigest
      && identity.identityLock.artifactSetDigest === lockResult.artifactSetDigest
      && identity.identityLock.evidenceId === lockResult.lock.evidenceId
      && identity.artifactSetDigest === lockResult.artifactSetDigest
      && exactJson(identity.components, components)
      && exactJson(identity.components, releaseEvidence.artifacts.components)
      && releaseEvidence.artifacts.identityLock.path === lockResult.lockPath
      && releaseEvidence.artifacts.identityLock.sha256 === lockResult.lockFileSha256
      && releaseEvidence.artifacts.identityLock.lockDigest === lockResult.lock.lockDigest
      && releaseEvidence.artifacts.identityLock.artifactSetDigest === lockResult.artifactSetDigest
      && releaseEvidence.artifacts.identityLock.verified === true,
    "artifact_identity",
    "ARTIFACT_IDENTITY_CROSS_BINDING_FAILED",
    `${role} artifact, lock, Evidence, and critical components are not identical.`
  );

  const formalBinding = identity.formalReceipt;
  const formalFile = await readBindingFile({
    cwd,
    root: receiptsRoot,
    binding: formalBinding,
    label: `${role} formal Release Evidence receipt`
  });
  const formalReceipt = parseJsonBytes(formalFile.bytes, `${role} formal receipt`);
  assertFormalReceiptEnvelope({
    receipt: formalReceipt,
    binding: formalBinding,
    identity,
    releaseEvidence,
    lockResult,
    cwd
  });
  // Envelope booleans cannot replace reopening the original bound test files.
  // The v1 CLI still uses its existing single workspace path domain; separate
  // historical A/B layouts need an explicit future contract, not path rewriting.
  let replay;
  try {
    replay = await verifyReleaseEvidenceFiles({
      sourceRoot: cwd,
      boundFilesRoot: cwd,
      inputRelativePath: evidenceBinding.path,
      receiptsRelativePath: relativePathWithin(cwd, receiptsRoot, `${role} receipts`),
      allowDirty: false,
      allowUnbound: false
    });
  } catch (error) {
    fail(
      "formal_release_evidence",
      "FORMAL_RELEASE_FILES_VERIFICATION_FAILED",
      `${role} original Release Evidence files did not pass the current supported contract.`,
      error
    );
  }
  const { verifiedAt: _recordedAt, ...recorded } = formalReceipt;
  const { verifiedAt: _replayedAt, ...replayed } = replay.verificationReceipt;
  requireCondition(
    replay.evidenceSha256 === evidenceBinding.sha256
      && exactJson(replay.evidence, releaseEvidence)
      && replay.gates.engineeringGatePassed === true
      && exactJson(recorded, replayed),
    "formal_release_evidence",
    "FORMAL_RELEASE_REPLAY_MISMATCH",
    `${role} formal receipt does not match the recomputed source, artifact, and original test files.`
  );
  return Object.freeze({ identity, releaseEvidence, formalReceipt, lockResult, components });
}

// Verifies one release's original files only; it does not admit a rollback run.
export { verifyArtifactIdentity as verifyRollbackReleaseArtifactFiles };

function assertArtifactPairDistinct(baseline, candidate) {
  requireCondition(
    path.resolve(baseline.identity.artifactRoot) !== path.resolve(candidate.identity.artifactRoot)
      && identityEvidenceId(baseline.identity) !== identityEvidenceId(candidate.identity)
      && baseline.identity.buildVersion !== candidate.identity.buildVersion
      && baseline.identity.artifactSetDigest !== candidate.identity.artifactSetDigest
      && baseline.identity.components.serviceWorker.sha256 !==
        candidate.identity.components.serviceWorker.sha256,
    "artifact_identity",
    "BASELINE_CANDIDATE_NOT_DISTINCT",
    "Candidate must be a different Evidence, build, artifact set, and Service Worker binary."
  );
}

function assertReceiptBindingCore(binding, envelope, keys, label) {
  for (const key of keys) {
    requireCondition(
      exactJson(binding[key], envelope[key]),
      "receipt",
      "RECEIPT_BINDING_MISMATCH",
      `${label} binding does not match envelope field ${key}.`
    );
  }
}

function expectedIdentityForPhase(phaseId, baselineIdentity, candidateIdentity) {
  return phaseId === "candidate" ? candidateIdentity : baselineIdentity;
}

function assertRuntimeObservation(observation, expectedIdentity, origin, label) {
  requireCondition(
    exactKeys(observation, RUNTIME_OBSERVATION_KEYS),
    "runtime",
    "RUNTIME_OBSERVATION_SHAPE_INVALID",
    `${label} runtime observation keys are not exact.`
  );
  assertUtcMilliseconds(observation.observedAt, `${label}.observedAt`);
  const expectedWorkerUrl = new URL("/sw.js", `${origin}/`).href;
  const expectedScope = new URL("/", `${origin}/`).href;
  requireCondition(
    observation.origin === origin
      && observation.online === true
      && observation.coldStart === true
      && observation.applicationShellSha256 === expectedIdentity.components.applicationShell.sha256
      && observation.documentBuildVersion === expectedIdentity.buildVersion
      && observation.documentEvidenceId === identityEvidenceId(expectedIdentity)
      && observation.manifestDigest === expectedIdentity.manifestDigest
      && observation.controllerPresent === true
      && observation.controllerScriptUrl === expectedWorkerUrl
      && observation.controllerScriptSha256 === expectedIdentity.components.serviceWorker.sha256
      && observation.controllerBuildVersion === expectedIdentity.buildVersion
      && observation.activeBuildVersion === expectedIdentity.buildVersion
      && observation.waitingBuildVersion === null
      && observation.installingBuildVersion === null
      && observation.registrationScope === expectedScope
      && observation.cacheGeneration === `hakimi-shell-${expectedIdentity.buildVersion}`,
    "service_worker",
    "RUNTIME_IDENTITY_MISMATCH",
    `${label} does not bind the expected application shell and active controller identity.`
  );
}

function assertHostVerificationSummary({
  verification,
  expectedIdentity,
  origin,
  hostingPolicy,
  hostingPolicyBinding
}) {
  requireCondition(
    exactKeys(verification, HOST_RESULT_KEYS)
      && verification.schemaVersion === 1
      && verification.summaryType === "deployed_host_verification_v1"
      && verification.policyId === hostingPolicy.policyId
      && verification.verificationKind === "real-network"
      && verification.targetOrigin === origin
      && verification.deploymentPlatform === hostingPolicy.deploymentPlatform
      && verification.dnsResolutionAttempted === true
      && verification.networkAttempted === true
      && verification.networkCompleted === true
      && verification.strictGatePassed === true,
    "host",
    "HOST_SUMMARY_INVALID",
    "Host receipt does not contain a strict real-network verification summary."
  );
  const started = assertUtcMilliseconds(verification.startedAt, "Host verification startedAt");
  const completed = assertUtcMilliseconds(verification.completedAt, "Host verification completedAt");
  requireCondition(completed >= started, "timing", "HOST_TIME_REVERSED", "Host verification time is reversed.");
  requireCondition(
    exactKeys(verification.expectedIdentity, [
      "evidenceId", "descriptor", "manifestVersion", "manifestDigest",
      "buildVersion", "releaseEvidenceSha256", "artifactCount",
      "publicArtifactCount", "policyBinding"
    ])
      && verification.expectedIdentity.evidenceId === identityEvidenceId(expectedIdentity)
      && exactJson(verification.expectedIdentity.descriptor, expectedIdentity.descriptor)
      && verification.expectedIdentity.manifestVersion === 1
      && verification.expectedIdentity.manifestDigest === expectedIdentity.manifestDigest
      && verification.expectedIdentity.buildVersion === expectedIdentity.buildVersion
      && verification.expectedIdentity.releaseEvidenceSha256 === expectedIdentity.releaseEvidence.sha256
      && Number.isInteger(verification.expectedIdentity.artifactCount)
      && verification.expectedIdentity.artifactCount > 0
      && Number.isInteger(verification.expectedIdentity.publicArtifactCount)
      && verification.expectedIdentity.publicArtifactCount > 0,
    "host",
    "HOST_EXPECTED_IDENTITY_MISMATCH",
    "Host verification expected identity does not match the phase artifact."
  );
  const expectedPolicyBinding = verification.expectedIdentity.policyBinding;
  requireCondition(
    exactKeys(expectedPolicyBinding, ["path", "policyId", "sha256", "canonicalSha256"])
      && expectedPolicyBinding.policyId === hostingPolicy.policyId
      && expectedPolicyBinding.path === hostingPolicyBinding.path
      && expectedPolicyBinding.sha256 === hostingPolicyBinding.sha256
      && expectedPolicyBinding.canonicalSha256 === sha256(canonicalJson(hostingPolicy)),
    "host",
    "HOST_POLICY_BINDING_MISMATCH",
    "Host verification does not bind the checked hosting policy."
  );
  requireCondition(
    exactKeys(verification.gates, HOST_GATE_KEYS),
    "host",
    "HOST_GATE_SHAPE_INVALID",
    "Host verification gate set is not exact."
  );
  const requiredTrueGates = [
    "policyValidated", "targetOriginSyntaxEligible", "dnsPublicAddressSetVerified",
    "publicHttpsVerified", "pathMatrixVerified", "redirectMatrixVerified",
    "securityHeadersVerified", "cacheRulesVerified", "behaviorResponseHeadersAbsent",
    "contentTypesVerified", "contentEncodingsVerified",
    "htmlManifestDeclaredResourcesVerified", "releaseIdentityVerified",
    "applicationIdentityVerified", "publicArtifactSetVerified",
    "nonPublicArtifactsHidden", "hstsHeaderVerified", "realHostVerified"
  ];
  requireCondition(
    requiredTrueGates.every((key) => verification.gates[key] === true)
      && verification.gates.mockedContractVerified === false
      && verification.gates.cspBrowserEnforcementVerified === false
      && verification.gates.inlineCssBrowserNetworkVerified === false
      && verification.gates.javascriptRuntimeNetworkVerified === false
      && verification.gates.serviceWorkerBrowserRuntimeVerified === false
      && verification.gates.publicReleaseGatePassed === false,
    "host",
    "HOST_GATE_NOT_PASSED",
    "Host verification did not pass every real-network mechanical gate."
  );
  requireCondition(
    Array.isArray(verification.probes)
      && verification.probes.length > 0
      && verification.probes.every((probe) =>
        exactKeys(probe, [
          "id", "kind", "path", "status", "noUnexpectedRedirect",
          "securityHeadersVerified", "behaviorHeadersVerified", "cacheVerified",
          "contentTypeVerified", "contentEncodingVerified", "identityVerified",
          "passed", "errorCodes"
        ])
        && probe.status === 200
        && probe.noUnexpectedRedirect === true
        && probe.securityHeadersVerified === true
        && probe.behaviorHeadersVerified === true
        && probe.cacheVerified === true
        && probe.contentTypeVerified === true
        && probe.contentEncodingVerified === true
        && probe.identityVerified === true
        && probe.passed === true
        && Array.isArray(probe.errorCodes)
        && probe.errorCodes.length === 0
      )
      && Array.isArray(verification.redirectProbes)
      && verification.redirectProbes.length === hostingPolicy.redirectRules.length
      && verification.redirectProbes.length > 0
      && verification.redirectProbes.every((probe) =>
        exactKeys(probe, ["id", "from", "status", "behaviorHeadersVerified", "passed", "errorCodes"])
        && probe.behaviorHeadersVerified === true
        && probe.passed === true
        && Array.isArray(probe.errorCodes)
        && probe.errorCodes.length === 0
      )
      && Array.isArray(verification.nonPublicProbes)
      && verification.nonPublicProbes.length === hostingPolicy.nonPublicArtifactPaths.length
      && verification.nonPublicProbes.every((probe) =>
        exactKeys(probe, [
          "id", "path", "status", "noUnexpectedRedirect",
          "behaviorHeadersVerified", "passed", "errorCodes"
        ])
        && [404, 410].includes(probe.status)
        && probe.noUnexpectedRedirect === true
        && probe.behaviorHeadersVerified === true
        && probe.passed === true
        && Array.isArray(probe.errorCodes)
        && probe.errorCodes.length === 0
      )
      && Array.isArray(verification.declaredResourcePaths)
      && verification.declaredResourcePaths.length > 0
      && Array.isArray(verification.errors)
      && verification.errors.length === 0,
    "host",
    "HOST_PROBE_MATRIX_INVALID",
    "Host verification does not contain a complete passing probe matrix."
  );
  requireCondition(
    exactKeys(verification.claims, [
      "engineeringEvidenceOnly", "realHostVerified", "browserRuntimeVerified",
      "publicDeploymentAuthorized", "releaseReady"
    ])
      && verification.claims.engineeringEvidenceOnly === true
      && verification.claims.realHostVerified === true
      && verification.claims.browserRuntimeVerified === false
      && verification.claims.publicDeploymentAuthorized === false
      && verification.claims.releaseReady === false,
    "host",
    "HOST_CLAIMS_INVALID",
    "Host verification claims exceed its real-host scope."
  );
}

async function verifyHostReceipt({
  cwd,
  receiptsRoot,
  binding,
  expectedIdentity,
  phaseId,
  document,
  hostingPolicy,
  hostingPolicyBinding
}) {
  const file = await readBindingFile({
    cwd,
    root: receiptsRoot,
    binding,
    label: `${phaseId} host receipt`
  });
  const envelope = parseJsonBytes(file.bytes, `${phaseId} host receipt`);
  const keys = [
    "schemaVersion", "receiptType", "receiptId", "runId", "phaseId", "status",
    "observedAt", "origin", "artifactSetDigest", "applicationShellSha256",
    "serviceWorkerSha256", "verification"
  ];
  requireCondition(
    exactKeys(envelope, keys),
    "host",
    "HOST_RECEIPT_SHAPE_INVALID",
    `${phaseId} host receipt envelope keys are not exact.`
  );
  assertReceiptBindingCore(binding, envelope, keys.filter((key) => key !== "verification"), `${phaseId} host receipt`);
  assertUtcMilliseconds(envelope.observedAt, `${phaseId} host observedAt`);
  requireCondition(
    envelope.schemaVersion === 1
      && envelope.receiptType === "host_observation"
      && envelope.runId === document.runId
      && envelope.phaseId === phaseId
      && envelope.status === "passed"
      && envelope.origin === document.scope.origin
      && envelope.artifactSetDigest === expectedIdentity.artifactSetDigest
      && envelope.applicationShellSha256 === expectedIdentity.components.applicationShell.sha256
      && envelope.serviceWorkerSha256 === expectedIdentity.components.serviceWorker.sha256,
    "host",
    "HOST_RECEIPT_IDENTITY_MISMATCH",
    `${phaseId} host receipt does not match the expected identity.`
  );
  assertHostVerificationSummary({
    verification: envelope.verification,
    expectedIdentity,
    origin: document.scope.origin,
    hostingPolicy,
    hostingPolicyBinding
  });
  requireCondition(
    envelope.observedAt === envelope.verification.completedAt,
    "timing",
    "HOST_OBSERVATION_TIME_MISMATCH",
    `${phaseId} host observation time does not match its verification completion.`
  );
  return Object.freeze({ binding, envelope });
}

function assertReadOnlyExports(exports, commitments, documentFingerprint, label) {
  requireCondition(
    Array.isArray(exports)
      && exports.length === ROLLBACK_PHASE_IDS.length
      && exactJson(exports.map((entry) => entry.phaseId), ROLLBACK_PHASE_IDS),
    "data_integrity",
    "EXPORT_PHASE_SET_INVALID",
    `${label} does not contain one ordered read-only export per phase.`
  );
  let logicalPayloadDigest = null;
  for (const entry of exports) {
    requireCondition(
      exactKeys(entry, EXPORT_KEYS)
        && entry.format === "full-v1.2"
        && Number.isInteger(entry.archiveSize)
        && entry.archiveSize > 0
        && SHA256.test(entry.archiveSha256 ?? "")
        && SHA256.test(entry.logicalPayloadDigest ?? "")
        && entry.sourceBeforeCommitment === commitments[entry.phaseId]
        && entry.sourceAfterCommitment === commitments[entry.phaseId]
        && entry.readOnly === true
        && entry.preflightPassed === true,
      "data_integrity",
      "READ_ONLY_EXPORT_INVALID",
      `${label} ${entry.phaseId} export is not a strict read-only full-v1.2 receipt.`
    );
    logicalPayloadDigest ??= entry.logicalPayloadDigest;
    requireCondition(
      entry.logicalPayloadDigest === logicalPayloadDigest,
      "data_integrity",
      "EXPORT_PAYLOAD_CHANGED",
      `${label} logical export payload changed across phases.`
    );
  }
  requireCondition(
    documentFingerprint.beforeCommitment === documentFingerprint.afterCommitment
      && Object.values(commitments).every((value) => value === documentFingerprint.beforeCommitment),
    "data_integrity",
    "V13_FINGERPRINT_CHANGED",
    `${label} HMAC commitments do not preserve the approved v13 copy.`
  );
  return logicalPayloadDigest;
}

async function verifyBrowserReceipt({
  cwd,
  receiptsRoot,
  binding,
  document,
  baselineIdentity,
  candidateIdentity
}) {
  const file = await readBindingFile({
    cwd,
    root: receiptsRoot,
    binding,
    label: `${binding.projectName} browser rollback receipt`
  });
  const envelope = parseJsonBytes(file.bytes, `${binding.projectName} browser receipt`);
  const coreKeys = [
    "schemaVersion", "receiptType", "receiptId", "runId", "projectName",
    "runtimeProduct", "status", "startedAt", "completedAt", "attempts",
    "phaseIds", "profileBindingDigest"
  ];
  requireCondition(
    exactKeys(envelope, [...coreKeys, "observations", "dataIntegrity", "errors"]),
    "browser",
    "BROWSER_RECEIPT_SHAPE_INVALID",
    `${binding.projectName} browser receipt envelope keys are not exact.`
  );
  assertReceiptBindingCore(binding, envelope, coreKeys, `${binding.projectName} browser receipt`);
  const started = assertUtcMilliseconds(envelope.startedAt, `${binding.projectName}.startedAt`);
  const completed = assertUtcMilliseconds(envelope.completedAt, `${binding.projectName}.completedAt`);
  requireCondition(
    completed >= started
      && envelope.schemaVersion === 1
      && envelope.receiptType === "browser_rollback_execution"
      && envelope.runId === document.runId
      && envelope.status === "passed"
      && envelope.attempts === 1
      && exactJson(envelope.phaseIds, ROLLBACK_PHASE_IDS)
      && SHA256.test(envelope.profileBindingDigest ?? "")
      && ((envelope.projectName === "msedge" && /^Edg\/[0-9]+(\.[0-9]+)+$/u.test(envelope.runtimeProduct ?? ""))
        || (envelope.projectName === "chrome" && /^Chrome\/[0-9]+(\.[0-9]+)+$/u.test(envelope.runtimeProduct ?? "")))
      && Array.isArray(envelope.errors)
      && envelope.errors.length === 0,
    "browser",
    "BROWSER_RECEIPT_NOT_STRICT_PASS",
    `${binding.projectName} browser receipt is not one clean real-browser pass.`
  );
  requireCondition(
    Array.isArray(envelope.observations)
      && envelope.observations.length === ROLLBACK_PHASE_IDS.length
      && exactJson(envelope.observations.map((entry) => entry.phaseId), ROLLBACK_PHASE_IDS),
    "browser",
    "BROWSER_PHASE_SET_INVALID",
    `${binding.projectName} browser receipt does not bind A to B to A.`
  );
  let priorControllerChangeCount = -1;
  for (const observation of envelope.observations) {
    requireCondition(
      exactKeys(observation, BROWSER_OBSERVATION_KEYS)
        && Number.isInteger(observation.controllerChangeCount)
        && observation.controllerChangeCount >= 0
        && observation.unexpectedExternalRequestCount === 0,
      "browser",
      "BROWSER_OBSERVATION_INVALID",
      `${binding.projectName} ${observation.phaseId} observation is malformed.`
    );
    const expectedIdentity = expectedIdentityForPhase(
      observation.phaseId,
      baselineIdentity,
      candidateIdentity
    );
    const runtime = Object.fromEntries(
      RUNTIME_OBSERVATION_KEYS.map((key) => [key, observation[key]])
    );
    assertRuntimeObservation(
      runtime,
      expectedIdentity,
      document.scope.origin,
      `${binding.projectName} ${observation.phaseId}`
    );
    if (observation.phaseId !== "baseline") {
      requireCondition(
        observation.controllerChangeCount > priorControllerChangeCount,
        "service_worker",
        "CONTROLLER_DID_NOT_CHANGE",
        `${binding.projectName} did not observe a fresh controller transition.`
      );
    }
    priorControllerChangeCount = observation.controllerChangeCount;
  }

  const data = envelope.dataIntegrity;
  requireCondition(
    exactKeys(data, [
      "algorithm", "keyId", "projectionVersion", "domainSeparator",
      "privatePackagePlaintextCommitment", "commitments",
      "storeInventoryDigest", "rowCountDigest",
      "rawIndexedDbBypassUsed", "mutationEpochBypassed",
      "releaseControlPointerModified", "exports"
    ])
      && data.algorithm === "hmac-sha256"
      && data.keyId === document.dataCopy.fingerprint.keyId
      && data.projectionVersion === document.dataCopy.fingerprint.projectionVersion
      && data.domainSeparator === document.dataCopy.fingerprint.domainSeparator
      && data.privatePackagePlaintextCommitment ===
        document.dataCopy.fingerprint.privatePackagePlaintextCommitment
      && exactKeys(data.commitments, ROLLBACK_PHASE_IDS)
      && ROLLBACK_PHASE_IDS.every((phaseId) => SHA256.test(data.commitments[phaseId] ?? ""))
      && data.storeInventoryDigest === document.dataCopy.fingerprint.storeInventoryDigest
      && data.rowCountDigest === document.dataCopy.fingerprint.rowCountDigest
      && data.rawIndexedDbBypassUsed === false
      && data.mutationEpochBypassed === false
      && data.releaseControlPointerModified === false,
    "data_integrity",
    "BROWSER_DATA_INTEGRITY_INVALID",
    `${binding.projectName} did not preserve the private v13 mutation boundary.`
  );
  const logicalPayloadDigest = assertReadOnlyExports(
    data.exports,
    data.commitments,
    document.dataCopy.fingerprint,
    binding.projectName
  );
  return Object.freeze({ binding, envelope, logicalPayloadDigest });
}

export function validateRollbackDeploymentReceiptProjectionForContract({
  envelope,
  binding,
  phaseId,
  expectedIdentity,
  document,
  hostingPolicy
}) {
  const coreKeys = [
    "schemaVersion", "receiptType", "receiptId", "runId", "phaseId", "status",
    "provider", "deploymentId", "startedAt", "completedAt", "origin",
    "artifactLockDigest"
  ];
  requireCondition(
    phaseId === "candidate" || phaseId === "rollbackObserved",
    "deployment",
    "DEPLOYMENT_PHASE_INVALID",
    "Deployment receipt phase must be candidate or rollbackObserved."
  );
  assertDefaultV13Identity(expectedIdentity, `${phaseId} deployment expected identity`);
  requireCondition(
    exactKeys(binding, [...coreKeys, "path", "size", "sha256"])
      && typeof binding.path === "string"
      && binding.path.length > 0
      && Number.isInteger(binding.size)
      && binding.size > 0
      && SHA256.test(binding.sha256 ?? ""),
    "deployment",
    "DEPLOYMENT_RECEIPT_BINDING_SHAPE_INVALID",
    `${phaseId} deployment receipt binding keys are not exact.`
  );
  requireCondition(
    exactKeys(envelope, [...coreKeys, "action", "expectedIdentity", "errors"]),
    "deployment",
    "DEPLOYMENT_RECEIPT_SHAPE_INVALID",
    `${phaseId} deployment receipt envelope keys are not exact.`
  );
  assertReceiptBindingCore(binding, envelope, coreKeys, `${phaseId} deployment receipt`);
  const started = assertUtcMilliseconds(envelope.startedAt, `${phaseId} deployment startedAt`);
  const completed = assertUtcMilliseconds(envelope.completedAt, `${phaseId} deployment completedAt`);
  const expectedAction = phaseId === "candidate" ? "deploy_candidate" : "restore_baseline";
  requireCondition(
    completed >= started
      && envelope.schemaVersion === 1
      && envelope.receiptType === "deployment_action"
      && envelope.runId === document.runId
      && envelope.phaseId === phaseId
      && envelope.status === "passed"
      && envelope.provider === hostingPolicy.deploymentPlatform
      && CANONICAL_ID.test(envelope.deploymentId ?? "")
      && envelope.origin === document.scope.origin
      && envelope.artifactLockDigest === expectedIdentity.identityLock.lockDigest
      && envelope.action === expectedAction
      && exactJson(envelope.expectedIdentity, normalizedReleaseIdentity(expectedIdentity))
      && Array.isArray(envelope.errors)
      && envelope.errors.length === 0,
    "deployment",
    "DEPLOYMENT_RECEIPT_INVALID",
    `${phaseId} deployment action does not bind the expected release unit.`
  );
  return immutableJsonSnapshot({
    schemaVersion: envelope.schemaVersion,
    receiptType: envelope.receiptType,
    receiptId: envelope.receiptId,
    runId: envelope.runId,
    phaseId: envelope.phaseId,
    status: envelope.status,
    provider: envelope.provider,
    deploymentId: envelope.deploymentId,
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    origin: envelope.origin,
    artifactLockDigest: envelope.artifactLockDigest,
    action: envelope.action,
    expectedIdentity: normalizedReleaseIdentity(expectedIdentity),
    binding: {
      path: binding.path,
      size: binding.size,
      sha256: binding.sha256
    }
  });
}

async function verifyDeploymentReceipt({
  cwd,
  receiptsRoot,
  binding,
  phaseId,
  expectedIdentity,
  document,
  hostingPolicy
}) {
  const file = await readBindingFile({
    cwd,
    root: receiptsRoot,
    binding,
    label: `${phaseId} deployment receipt`
  });
  const envelope = parseJsonBytes(file.bytes, `${phaseId} deployment receipt`);
  validateRollbackDeploymentReceiptProjectionForContract({
    envelope,
    binding,
    phaseId,
    expectedIdentity,
    document,
    hostingPolicy
  });
  return Object.freeze({ binding, envelope });
}

export function validateRollbackPhaseReceiptProjectionForContract({
  phase,
  envelope,
  phaseId,
  expectedIdentity,
  runId,
  origin,
  receiptDigests,
  previousEvidenceDigest
}) {
  const phaseKeys = [
    "phaseId", "status", "startedAt", "completedAt", "durationMs",
    "runtimeObservation", "receiptBinding", "failureCode", "evidenceDigest"
  ];
  const envelopeKeys = [
    "schemaVersion", "receiptType", "runId", "phaseId", "status", "startedAt",
    "completedAt", "durationMs", "runtimeObservation", "hostReceiptSha256",
    "browserReceiptSha256", "deploymentReceiptSha256",
    "previousPhaseEvidenceDigest", "failureCode", "evidenceDigest"
  ];
  requireCondition(
    ROLLBACK_PHASE_IDS.includes(phaseId),
    "phase",
    "PHASE_ID_INVALID",
    "Rollback phase receipt phaseId is not one of the fixed A to B to A phases."
  );
  assertDefaultV13Identity(expectedIdentity, `${phaseId} phase expected identity`);
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch (error) {
    fail("phase", "PHASE_CONTEXT_INVALID", "Rollback phase context origin is invalid.", error);
  }
  requireCondition(
    /^hrr1-[a-f0-9]{32}$/u.test(runId ?? "")
      && parsedOrigin.protocol === "https:"
      && parsedOrigin.origin === origin
      && parsedOrigin.username === ""
      && parsedOrigin.password === ""
      && parsedOrigin.pathname === "/"
      && parsedOrigin.search === ""
      && parsedOrigin.hash === ""
      && parsedOrigin.port === "",
    "phase",
    "PHASE_CONTEXT_INVALID",
    "Rollback phase context must bind one canonical run and default-port HTTPS origin."
  );
  requireCondition(
    exactKeys(phase, phaseKeys),
    "phase",
    "PHASE_RECORD_SHAPE_INVALID",
    `${phaseId} phase record keys are not exact.`
  );
  requireCondition(
    exactKeys(phase.receiptBinding, ["path", "size", "sha256"])
      && typeof phase.receiptBinding.path === "string"
      && phase.receiptBinding.path.length > 0
      && Number.isInteger(phase.receiptBinding.size)
      && phase.receiptBinding.size > 0
      && SHA256.test(phase.receiptBinding.sha256 ?? ""),
    "phase",
    "PHASE_RECEIPT_BINDING_SHAPE_INVALID",
    `${phaseId} phase receipt binding keys are not exact.`
  );
  requireCondition(
    exactKeys(receiptDigests, ["host", "browsers", "deployment"])
      && SHA256.test(receiptDigests.host ?? "")
      && exactKeys(receiptDigests.browsers, ROLLBACK_BROWSER_PROJECTS)
      && ROLLBACK_BROWSER_PROJECTS.every((project) =>
        SHA256.test(receiptDigests.browsers[project] ?? ""))
      && (phaseId === "baseline"
        ? receiptDigests.deployment === null && previousEvidenceDigest === null
        : SHA256.test(receiptDigests.deployment ?? "")
          && SHA256.test(previousEvidenceDigest ?? "")),
    "phase",
    "PHASE_DIGEST_CONTEXT_INVALID",
    `${phaseId} phase receipt digest context does not preserve the fixed A to B to A null/SHA relation.`
  );
  requireCondition(
    phase.phaseId === phaseId
      && phase.status === "passed"
      && phase.failureCode === null
      && SHA256.test(phase.evidenceDigest ?? ""),
    "phase",
    "PHASE_NOT_PASSED",
    `${phaseId} phase is not an exact pass.`
  );
  const started = assertUtcMilliseconds(phase.startedAt, `${phaseId}.startedAt`);
  const completed = assertUtcMilliseconds(phase.completedAt, `${phaseId}.completedAt`);
  requireCondition(
    completed >= started && phase.durationMs === completed - started,
    "timing",
    "PHASE_DURATION_MISMATCH",
    `${phaseId} duration is not its exact UTC millisecond interval.`
  );
  assertRuntimeObservation(phase.runtimeObservation, expectedIdentity, origin, phaseId);
  requireCondition(
    exactKeys(envelope, envelopeKeys),
    "phase",
    "PHASE_RECEIPT_SHAPE_INVALID",
    `${phaseId} phase receipt envelope keys are not exact.`
  );
  requireCondition(
    envelope.schemaVersion === 1
      && envelope.receiptType === "rollback_phase_execution_v1"
      && envelope.runId === runId
      && envelope.phaseId === phaseId
      && envelope.status === "passed"
      && envelope.startedAt === phase.startedAt
      && envelope.completedAt === phase.completedAt
      && envelope.durationMs === phase.durationMs
      && exactJson(envelope.runtimeObservation, phase.runtimeObservation)
      && envelope.hostReceiptSha256 === receiptDigests.host
      && exactJson(envelope.browserReceiptSha256, receiptDigests.browsers)
      && envelope.deploymentReceiptSha256 === receiptDigests.deployment
      && envelope.previousPhaseEvidenceDigest === previousEvidenceDigest
      && envelope.failureCode === null
      && SHA256.test(envelope.evidenceDigest ?? ""),
    "phase",
    "PHASE_RECEIPT_INVALID",
    `${phaseId} phase receipt is not an exact hash-chained pass.`
  );
  const calculatedDigest = sha256(canonicalJson(
    normalizedUnsignedDocument(envelope, ["evidenceDigest"])
  ));
  requireCondition(
    envelope.evidenceDigest === calculatedDigest
      && phase.evidenceDigest === calculatedDigest,
    "phase",
    "PHASE_EVIDENCE_DIGEST_MISMATCH",
    `${phaseId} phase evidence digest is invalid.`
  );
  return immutableJsonSnapshot({
    schemaVersion: envelope.schemaVersion,
    receiptType: envelope.receiptType,
    runId: envelope.runId,
    phaseId: envelope.phaseId,
    status: envelope.status,
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    durationMs: envelope.durationMs,
    runtimeObservation: envelope.runtimeObservation,
    hostReceiptSha256: envelope.hostReceiptSha256,
    browserReceiptSha256: envelope.browserReceiptSha256,
    deploymentReceiptSha256: envelope.deploymentReceiptSha256,
    previousPhaseEvidenceDigest: envelope.previousPhaseEvidenceDigest,
    failureCode: envelope.failureCode,
    evidenceDigest: calculatedDigest,
    binding: phase.receiptBinding
  });
}

async function verifyPhaseReceipt({
  cwd,
  receiptsRoot,
  phase,
  phaseId,
  expectedIdentity,
  document,
  hostReceipt,
  browserReceipts,
  deploymentReceipt,
  previousEvidenceDigest
}) {
  requireCondition(
    phase.phaseId === phaseId
      && phase.status === "passed"
      && phase.failureCode === null
      && phase.receiptBinding !== null,
    "phase",
    "PHASE_NOT_PASSED",
    `${phaseId} phase is not an exact pass.`
  );
  const file = await readBindingFile({
    cwd,
    root: receiptsRoot,
    binding: phase.receiptBinding,
    label: `${phaseId} phase receipt`
  });
  const envelope = parseJsonBytes(file.bytes, `${phaseId} phase receipt`);
  return validateRollbackPhaseReceiptProjectionForContract({
    phase,
    envelope,
    phaseId,
    expectedIdentity,
    runId: document.runId,
    origin: document.scope.origin,
    receiptDigests: {
      host: hostReceipt.binding.sha256,
      browsers: Object.fromEntries(ROLLBACK_BROWSER_PROJECTS.map((project) => [
        project,
        browserReceipts.get(project).binding.sha256
      ])),
      deployment: deploymentReceipt?.binding.sha256 ?? null
    },
    previousEvidenceDigest
  });
}

function parseCanonicalBase64(value, label) {
  requireCondition(
    typeof value === "string" && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/u.test(value),
    "actor_attestation",
    "INVALID_BASE64",
    `${label} is not canonical base64.`
  );
  const bytes = Buffer.from(value, "base64");
  requireCondition(
    bytes.length > 0 && bytes.toString("base64") === value,
    "actor_attestation",
    "INVALID_BASE64",
    `${label} does not round-trip as canonical base64.`
  );
  return bytes;
}

export function validateRollbackActorRegistryForContract(registry) {
  requireCondition(
    exactKeys(registry, REGISTRY_KEYS)
      && registry.schemaVersion === 1
      && registry.registryType === "rollback_actor_trust_registry"
      && registry.registryId === "hakimi.web-v1.rollback-actors/v1"
      && ["unconfigured_no_trusted_actors", "configured_trusted_actors"].includes(registry.status)
      && Array.isArray(registry.actors)
      && exactKeys(registry.gateSummary, [
        "trustedOperators", "trustedAcceptors", "realIdentityRecordsBound",
        "rollbackAcceptanceAuthorized"
      ])
      && exactKeys(registry.claims, [
        "engineeringRegistryOnly", "realIdentityVerified",
        "realIndependenceVerified", "publicDeploymentAuthorized", "releaseReady"
      ])
      && registry.claims.engineeringRegistryOnly === true
      && registry.claims.publicDeploymentAuthorized === false
      && registry.claims.releaseReady === false,
    "actor_attestation",
    "ACTOR_REGISTRY_INVALID",
    "Rollback actor trust registry shape or claims are invalid."
  );
  const actors = new Map();
  const keyIds = new Set();
  const publicKeyFingerprints = new Set();
  for (const actor of registry.actors) {
    requireCondition(
      exactKeys(actor, REGISTRY_ACTOR_KEYS)
        && CANONICAL_ID.test(actor.actorId ?? "")
        && Array.isArray(actor.roles)
        && actor.roles.length > 0
        && new Set(actor.roles).size === actor.roles.length
        && actor.roles.every((role) => ["operator", "acceptor", "data_owner_approver"].includes(role))
        && CANONICAL_ID.test(actor.identityAuthority ?? "")
        && actor.status === "trusted"
        && actor.realIdentityVerified === true
        && Array.isArray(actor.keys)
        && actor.keys.length > 0
        && !actors.has(actor.actorId),
      "actor_attestation",
      "ACTOR_REGISTRY_ENTRY_INVALID",
      "A trusted rollback actor registry entry is malformed or duplicated."
    );
    const keys = new Map();
    for (const key of actor.keys) {
      requireCondition(
        exactKeys(key, REGISTRY_KEY_KEYS)
          && CANONICAL_ID.test(key.keyId ?? "")
          && key.algorithm === "ed25519"
          && key.status === "active"
          && typeof key.publicKeySpkiBase64 === "string"
          && (key.validUntil === null || typeof key.validUntil === "string")
          && !keys.has(key.keyId)
          && !keyIds.has(key.keyId),
        "actor_attestation",
        "ACTOR_KEY_INVALID",
        "A rollback actor key is malformed, duplicated, or not Ed25519."
      );
      assertUtcMilliseconds(key.validFrom, `Actor key ${key.keyId} validFrom`);
      assertUtcMilliseconds(key.validUntil, `Actor key ${key.keyId} validUntil`, true);
      const spki = parseCanonicalBase64(key.publicKeySpkiBase64, `Actor key ${key.keyId}`);
      let publicKey;
      try {
        publicKey = createPublicKey({ key: spki, format: "der", type: "spki" });
      } catch (error) {
        fail("actor_attestation", "ACTOR_PUBLIC_KEY_INVALID", "Actor Ed25519 SPKI cannot be parsed.", error);
      }
      requireCondition(
        publicKey.asymmetricKeyType === "ed25519",
        "actor_attestation",
        "ACTOR_PUBLIC_KEY_INVALID",
        "Actor key is not an Ed25519 public key."
      );
      const canonicalSpki = publicKey.export({ format: "der", type: "spki" });
      requireCondition(
        Buffer.isBuffer(canonicalSpki) && spki.equals(canonicalSpki),
        "actor_attestation",
        "ACTOR_PUBLIC_KEY_NON_CANONICAL",
        "Actor Ed25519 SPKI must use its canonical DER encoding."
      );
      const publicKeyFingerprint = sha256(canonicalSpki);
      requireCondition(
        !publicKeyFingerprints.has(publicKeyFingerprint),
        "actor_attestation",
        "ACTOR_PUBLIC_KEY_REUSED",
        "A single Ed25519 public key cannot represent multiple independent rollback actors."
      );
      keyIds.add(key.keyId);
      publicKeyFingerprints.add(publicKeyFingerprint);
      keys.set(key.keyId, Object.freeze({ ...key, publicKey }));
    }
    actors.set(actor.actorId, Object.freeze({ ...actor, keys }));
  }
  const trustedOperators = [...actors.values()].filter((actor) => actor.roles.includes("operator")).length;
  const trustedAcceptors = [...actors.values()].filter((actor) => actor.roles.includes("acceptor")).length;
  const realIdentityRecordsBound = [...actors.values()].filter((actor) => actor.realIdentityVerified).length;
  const rollbackAcceptanceAuthorized = trustedOperators > 0
    && trustedAcceptors > 0
    && [...actors.values()].some((actor) => actor.roles.includes("data_owner_approver"))
    && realIdentityRecordsBound >= 3
    && registry.claims.realIdentityVerified === true
    && registry.claims.realIndependenceVerified === true;
  requireCondition(
    registry.gateSummary.trustedOperators === trustedOperators
      && registry.gateSummary.trustedAcceptors === trustedAcceptors
      && registry.gateSummary.realIdentityRecordsBound === realIdentityRecordsBound
      && registry.gateSummary.rollbackAcceptanceAuthorized === rollbackAcceptanceAuthorized
      && registry.claims.realIdentityVerified === (realIdentityRecordsBound > 0)
      && registry.status === (actors.size === 0
        ? "unconfigured_no_trusted_actors"
        : "configured_trusted_actors"),
    "actor_attestation",
    "ACTOR_REGISTRY_SUMMARY_MISMATCH",
    "Rollback actor registry summary does not match its actors."
  );
  requireCondition(
    rollbackAcceptanceAuthorized,
    "actor_attestation",
    "ACTOR_REGISTRY_UNCONFIGURED",
    "Rollback actor registry has no independently trusted execution set."
  );
  return Object.freeze({ registry, actors });
}

function resolveTrustedActorKey(registryResult, actorBinding, expectedRole, signedAt) {
  const actor = registryResult.actors.get(actorBinding.actorId);
  requireCondition(
    actor !== undefined
      && actor.roles.includes(expectedRole)
      && actor.identityAuthority === actorBinding.identityAuthority
      && actorBinding.role === expectedRole
      && actorBinding.attestation.subjectId === actorBinding.actorId,
    "actor_attestation",
    "UNTRUSTED_ACTOR",
    `${expectedRole} is not a matching trusted registry actor.`
  );
  const key = actor.keys.get(actorBinding.attestation.keyId);
  requireCondition(
    key !== undefined,
    "actor_attestation",
    "UNTRUSTED_ACTOR_KEY",
    `${expectedRole} attestation key is not trusted for that actor.`
  );
  const signedMilliseconds = assertUtcMilliseconds(signedAt, `${expectedRole} signedAt`);
  const validFrom = assertUtcMilliseconds(key.validFrom, `${expectedRole} key validFrom`);
  const validUntil = assertUtcMilliseconds(key.validUntil, `${expectedRole} key validUntil`, true);
  requireCondition(
    signedMilliseconds >= validFrom && (validUntil === null || signedMilliseconds <= validUntil),
    "actor_attestation",
    "ACTOR_KEY_OUTSIDE_VALIDITY",
    `${expectedRole} signed outside the trusted key validity window.`
  );
  return key;
}

async function verifySignatureAttestation({
  cwd,
  privateRoot,
  actorBinding,
  expectedRole,
  expectedBasisDigest,
  expectedDecision,
  expectedApprovedCopyClass,
  allowedCopyClasses,
  registryResult
}) {
  const binding = actorBinding.attestation;
  const file = await readBindingFile({
    cwd,
    root: privateRoot,
    binding,
    label: `${expectedRole} attestation`
  });
  const envelope = parseJsonBytes(file.bytes, `${expectedRole} attestation`);
  const bindingKeys = [
    "attestationId", "attestationType", "subjectId", "keyId",
    "signatureAlgorithm", "signedAt", "payloadDigest"
  ];
  requireCondition(
    exactKeys(envelope, [
      "schemaVersion", "recordType", ...bindingKeys, "payload", "signatureBase64"
    ])
      && envelope.schemaVersion === 1
      && envelope.recordType === "rollback_signature_attestation_v1",
    "actor_attestation",
    "ATTESTATION_ENVELOPE_INVALID",
    `${expectedRole} attestation envelope keys are not exact.`
  );
  assertReceiptBindingCore(binding, envelope, bindingKeys, `${expectedRole} attestation`);
  requireCondition(
    binding.signatureAlgorithm === "ed25519"
      && binding.subjectId === actorBinding.actorId
      && SHA256.test(binding.payloadDigest ?? ""),
    "actor_attestation",
    "ATTESTATION_BINDING_INVALID",
    `${expectedRole} attestation binding is invalid.`
  );
  const expectedPayloadType = {
    operator: "rollback_operator_execution_v1",
    acceptor: "rollback_acceptor_verification_v1",
    data_owner_approver: "rollback_data_owner_approval_v1"
  }[expectedRole];
  requireCondition(
    exactKeys(envelope.payload, [
      "schemaVersion", "payloadType", "basisDigest", "decision", "approvedCopyClass"
    ])
      && envelope.payload.schemaVersion === 1
      && envelope.payload.payloadType === expectedPayloadType
      && envelope.payload.basisDigest === expectedBasisDigest
      && envelope.payload.decision === expectedDecision
      && (expectedRole === "data_owner_approver"
        ? allowedCopyClasses.includes(envelope.payload.approvedCopyClass)
          && envelope.payload.approvedCopyClass === expectedApprovedCopyClass
        : envelope.payload.approvedCopyClass === null),
    "actor_attestation",
    "ATTESTATION_BASIS_MISMATCH",
    `${expectedRole} attestation payload does not match the verifier-derived basis.`
  );
  const payloadDigest = sha256(canonicalJson(envelope.payload));
  requireCondition(
    payloadDigest === envelope.payloadDigest,
    "actor_attestation",
    "ATTESTATION_PAYLOAD_DIGEST_MISMATCH",
    `${expectedRole} payload digest is invalid.`
  );
  const key = resolveTrustedActorKey(
    registryResult,
    actorBinding,
    expectedRole,
    envelope.signedAt
  );
  const signature = parseCanonicalBase64(envelope.signatureBase64, `${expectedRole} signature`);
  const signedStatementDigest = computeRollbackSignedStatementDigest(
    envelope,
    actorBinding.actorId
  );
  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      null,
      Buffer.from(signedStatementDigest, "hex"),
      key.publicKey,
      signature
    );
  } catch (error) {
    fail("actor_attestation", "ATTESTATION_SIGNATURE_ERROR", `${expectedRole} signature could not be verified.`, error);
  }
  requireCondition(
    signatureValid,
    "actor_attestation",
    "ATTESTATION_SIGNATURE_INVALID",
    `${expectedRole} Ed25519 signature is invalid.`
  );
  return Object.freeze({ binding, envelope, signedAt: Date.parse(envelope.signedAt) });
}

export function computeRollbackSignedStatementDigest(envelope, actorId) {
  requireCondition(
    isRecord(envelope)
      && CANONICAL_ID.test(actorId ?? "")
      && [
        "schemaVersion", "recordType", "attestationId", "attestationType",
        "subjectId", "keyId", "signatureAlgorithm", "signedAt", "payloadDigest"
      ].every((key) => Object.hasOwn(envelope, key)),
    "actor_attestation",
    "ATTESTATION_SIGNED_STATEMENT_INVALID",
    "Rollback attestation signed statement is incomplete."
  );
  return sha256(canonicalJson({
    schemaVersion: envelope.schemaVersion,
    recordType: envelope.recordType,
    attestationId: envelope.attestationId,
    attestationType: envelope.attestationType,
    actorId,
    subjectId: envelope.subjectId,
    keyId: envelope.keyId,
    signatureAlgorithm: envelope.signatureAlgorithm,
    signedAt: envelope.signedAt,
    payloadDigest: envelope.payloadDigest
  }));
}

async function verifyPrivateDataAndAttestations({
  cwd,
  privateRoot,
  document,
  rollbackPolicy,
  registry,
  preAcceptanceGates,
  lastPhaseCompletedAt
}) {
  requireCondition(
    document.dataCopy.classification === "private_approved_v13_copy"
      && rollbackPolicy.requiredDataCopyClasses.includes(document.dataCopy.approvedCopyClass)
      && document.dataCopy.databaseName === "hakimi-bazi-research"
      && document.dataCopy.sourceSchema === 13
      && document.dataCopy.epochSupport === "absent_schema13"
      && document.dataCopy.epochBefore === null
      && document.dataCopy.epochAfter === null
      && document.dataCopy.rawIndexedDbBypassUsed === false
      && document.dataCopy.mutationEpochBypassed === false
      && document.dataCopy.releaseControlPointerModified === false
      && document.dataCopy.privatePackage.encryption === "encrypted_external"
      && document.dataCopy.privatePackage.plaintextEmbedded === false
      && document.dataCopy.privatePackage.keyMaterialEmbedded === false
      && document.dataCopy.fingerprint.algorithm === "hmac-sha256"
      && CANONICAL_ID.test(document.dataCopy.fingerprint.keyId ?? "")
      && document.dataCopy.fingerprint.projectionVersion === "v13-deidentified-projection-v1"
      && document.dataCopy.fingerprint.domainSeparator === "hakimi.rollback.v13.fingerprint.v1"
      && SHA256.test(document.dataCopy.fingerprint.privatePackagePlaintextCommitment ?? "")
      && document.dataCopy.fingerprint.beforeCommitment === document.dataCopy.fingerprint.afterCommitment
      && document.dataCopy.fingerprint.keyMaterialEmbedded === false
      && document.dataCopy.fingerprint.sourceDataEmbedded === false,
    "data_integrity",
    "PRIVATE_V13_BOUNDARY_INVALID",
    "Private v13 copy or absent-schema13 mutation boundary is invalid."
  );
  const packageFile = await readBindingFile({
    cwd,
    root: privateRoot,
    binding: {
      path: document.dataCopy.privatePackage.path,
      size: document.dataCopy.privatePackage.size,
      ciphertextSha256: document.dataCopy.privatePackage.ciphertextSha256
    },
    label: "Encrypted private v13 package",
    digestField: "ciphertextSha256"
  });
  requireCondition(packageFile.bytes.byteLength > 0, "data_integrity", "PRIVATE_PACKAGE_EMPTY", "Private package is empty.");

  const registryResult = validateRollbackActorRegistryForContract(registry);
  const actorIds = [
    document.actors.operator.actorId,
    document.actors.acceptor.actorId,
    document.actors.dataOwnerApprover.actorId
  ];
  const keyIds = [
    document.actors.operator.attestation.keyId,
    document.actors.acceptor.attestation.keyId,
    document.actors.dataOwnerApprover.attestation.keyId
  ];
  requireCondition(
    new Set(actorIds).size === actorIds.length && new Set(keyIds).size === keyIds.length,
    "actor_attestation",
    "ACTOR_INDEPENDENCE_FAILED",
    "Operator, acceptor, and data-owner approver must use different actors and keys."
  );
  const basis = computeRollbackAttestationBasisDigests(document, preAcceptanceGates);
  const dataOwner = await verifySignatureAttestation({
    cwd,
    privateRoot,
    actorBinding: document.actors.dataOwnerApprover,
    expectedRole: "data_owner_approver",
    expectedBasisDigest: basis.dataOwner,
    expectedDecision: "approve",
    expectedApprovedCopyClass: document.dataCopy.approvedCopyClass,
    allowedCopyClasses: rollbackPolicy.requiredDataCopyClasses,
    registryResult
  });
  const operator = await verifySignatureAttestation({
    cwd,
    privateRoot,
    actorBinding: document.actors.operator,
    expectedRole: "operator",
    expectedBasisDigest: basis.operator,
    expectedDecision: "executed",
    expectedApprovedCopyClass: null,
    allowedCopyClasses: rollbackPolicy.requiredDataCopyClasses,
    registryResult
  });
  const acceptor = await verifySignatureAttestation({
    cwd,
    privateRoot,
    actorBinding: document.actors.acceptor,
    expectedRole: "acceptor",
    expectedBasisDigest: basis.acceptor,
    expectedDecision: "accept",
    expectedApprovedCopyClass: null,
    allowedCopyClasses: rollbackPolicy.requiredDataCopyClasses,
    registryResult
  });
  const approvalAt = assertUtcMilliseconds(document.dataCopy.approval.approvedAt, "Data approval approvedAt");
  const expiresAt = assertUtcMilliseconds(document.dataCopy.approval.expiresAt, "Data approval expiresAt", true);
  const baselineStartedAt = assertUtcMilliseconds(document.execution.baseline.startedAt, "Baseline startedAt");
  const generatedAt = assertUtcMilliseconds(document.generatedAt, "Rollback Evidence generatedAt");
  requireCondition(
    document.dataCopy.approval.status === "approved"
      && document.dataCopy.approval.approvalScope === "isolated_rollback_rehearsal_v13_copy"
      && exactJson(document.dataCopy.approval.attestation, document.actors.dataOwnerApprover.attestation)
      && approvalAt === dataOwner.signedAt
      && dataOwner.signedAt <= baselineStartedAt
      && (expiresAt === null || expiresAt >= lastPhaseCompletedAt)
      && operator.signedAt >= lastPhaseCompletedAt
      && acceptor.signedAt > operator.signedAt
      && acceptor.signedAt <= generatedAt,
    "actor_attestation",
    "ATTESTATION_TIME_ORDER_INVALID",
    "Approval, execution, acceptance, and generation times are not causally ordered."
  );
  return Object.freeze({ registryResult, dataOwner, operator, acceptor, basis });
}

function assertScope(document, rollbackPolicy) {
  requireCondition(
    document.evidenceType === "engineering_rollback_execution_evidence"
      && /^hrr1-[a-f0-9]{32}$/u.test(document.runId ?? "")
      && /^hrb1-[a-f0-9]{32}$/u.test(document.rollbackEvidenceId ?? "")
      && document.scope.channel === "default-v13"
      && exactJson(document.scope.descriptor, REQUIRED_DESCRIPTOR)
      && exactJson(document.scope.browserProjects, ROLLBACK_BROWSER_PROJECTS)
      && document.scope.dataClassification === "private_approved_v13_copy"
      && document.scope.mutationPolicy === "fail_closed_no_raw_idb_bypass"
      && ["real_https_staging", "real_https_production"].includes(document.scope.hostMode)
      && document.scope.runKind === "planned_drill"
      && rollbackPolicy.releaseIdentity.channel === document.scope.channel
      && rollbackPolicy.releaseIdentity.dbGeneration === document.scope.descriptor.dbGeneration
      && rollbackPolicy.releaseIdentity.targetSchema === document.scope.descriptor.targetSchema
      && rollbackPolicy.releaseIdentity.migrationId === document.scope.descriptor.migrationId,
    "scope",
    "ROLLBACK_SCOPE_INVALID",
    "Rollback Evidence scope is not the fixed real-host default-v13 contract."
  );
  let url;
  try {
    url = new URL(document.scope.origin);
  } catch (error) {
    fail("scope", "ROLLBACK_ORIGIN_INVALID", "Rollback scope origin is not a valid URL.", error);
  }
  requireCondition(
    url.protocol === "https:"
      && url.origin === document.scope.origin
      && url.username === ""
      && url.password === ""
      && url.pathname === "/"
      && url.search === ""
      && url.hash === ""
      && url.port === "",
    "scope",
    "ROLLBACK_ORIGIN_INVALID",
    "Rollback scope origin must be a canonical default-port HTTPS origin."
  );
}

function assertClaims(claims) {
  const expected = {
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
  };
  requireCondition(
    exactJson(claims, expected),
    "claims",
    "CLAIMS_ESCALATION",
    "Rollback Evidence claims exceed its private engineering execution scope."
  );
}

function assertTimeWithin(value, start, end, label) {
  const time = assertUtcMilliseconds(value, label);
  requireCondition(
    time >= start && time <= end,
    "timing",
    "RECEIPT_OUTSIDE_PHASE",
    `${label} is outside its phase interval.`
  );
}

function buildPreAcceptanceGates() {
  return Object.freeze({
    policyBindingsVerified: true,
    artifactLocksVerified: true,
    artifactPairDistinct: true,
    baselineIdentityVerified: true,
    candidateIdentityVerified: true,
    rollbackObservedMatchesBaseline: true,
    phaseOrderVerified: true,
    realHostVerified: true,
    hostReceiptsVerified: true,
    chromeEdgeVerified: true,
    deploymentReceiptsVerified: true,
    serviceWorkerControllerRestored: true,
    privateDataApprovalVerified: true,
    sourceV13FingerprintUnchanged: true,
    mutationBoundaryPreserved: true,
    operatorAcceptorIndependent: true,
    allRequiredReceiptsPassed: true,
    operatorAttestationExpected: true
  });
}

export function buildRollbackVerificationFailure({ inputPath, error }) {
  const known = error instanceof RollbackEvidenceVerificationError;
  const code = known ? error.code : "ROLLBACK_EVIDENCE_VERIFICATION_FAILED";
  const stage = known ? error.stage : "internal";
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    schemaVersion: 1,
    summaryType: "rollback_evidence_verification_v1",
    verificationKind: "offline-no-git-no-network",
    status: "failed",
    input: inputPath,
    stage,
    code,
    messageDigest: sha256(message),
    rollbackEvidenceVerified: false,
    gates: Object.freeze(Object.fromEntries(GATE_NAMES.map((name) => [name, false]))),
    claims: Object.freeze({
      engineeringEvidenceOnly: true,
      realRollbackExecutionEvidenceVerified: false,
      realWorldActorIndependenceEstablishedByVerifier: false,
      dataOwnerConsentTruthEstablishedByVerifier: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false,
      contentRightsGrant: false
    })
  });
}

export async function verifyRollbackEvidence({
  cwd = process.cwd(),
  inputPath,
  baselineRoot,
  candidateRoot,
  receiptsRoot,
  privateRoot
}) {
  const workspace = path.resolve(cwd);
  const input = path.resolve(inputPath);
  const baselineArtifactRoot = path.resolve(baselineRoot);
  const candidateArtifactRoot = path.resolve(candidateRoot);
  const receiptDirectory = path.resolve(receiptsRoot);
  const privateDirectory = path.resolve(privateRoot);
  requireCondition(
    new Set([
      baselineArtifactRoot,
      candidateArtifactRoot,
      receiptDirectory,
      privateDirectory
    ]).size === 4,
    "filesystem",
    "ROOTS_NOT_DISTINCT",
    "Baseline, candidate, receipt, and private roots must be distinct."
  );

  let rollbackValidator;
  let releaseEvidenceValidator;
  try {
    [rollbackValidator, releaseEvidenceValidator] = await Promise.all([
      loadRollbackEvidenceSchemaValidator(workspace),
      loadReleaseEvidenceSchemaValidator(workspace)
    ]);
  } catch (error) {
    fail("schema", "SCHEMA_LOAD_FAILED", "Evidence schemas could not be loaded and compiled.", error);
  }
  const evidenceBytes = await readRegularFile(input, "Rollback Evidence input");
  const evidence = parseJsonBytes(evidenceBytes, "Rollback Evidence input");
  try {
    rollbackValidator.assert(evidence);
  } catch (error) {
    fail("schema", "ROLLBACK_SCHEMA_FAILED", "Rollback Evidence failed its checked schema.", error);
  }
  const sidecarPath = `${input}.sha256`;
  const sidecarBytes = await readRegularFile(sidecarPath, "Rollback Evidence sidecar");
  const rawEvidenceSha256 = sha256(evidenceBytes);
  requireCondition(
    sidecarBytes.toString("utf8") === `${rawEvidenceSha256}  ${path.basename(input)}\n`,
    "schema",
    "ROLLBACK_SIDECAR_MISMATCH",
    "Rollback Evidence sidecar does not bind the exact input bytes."
  );
  requireCondition(
    evidence.rollbackEvidenceId === computeRollbackEvidenceId(evidence)
      && evidence.evidenceDigest === computeRollbackEvidenceDigest(evidence),
    "identity",
    "ROLLBACK_EVIDENCE_DIGEST_MISMATCH",
    "Rollback Evidence id or canonical evidence digest is invalid."
  );
  assertUtcMilliseconds(evidence.generatedAt, "Rollback Evidence generatedAt");

  const policyResult = await verifyPolicyBindings({ cwd: workspace, document: evidence });
  assertScope(evidence, policyResult.rollbackPolicy);
  assertClaims(evidence.claims);
  assertRollbackExecutionAdmission(policyResult.rollbackPolicy);
  await assertIsolatedRollbackEvidenceRoots({
    workspace,
    input,
    baselineArtifactRoot,
    candidateArtifactRoot,
    receiptDirectory,
    privateDirectory
  });

  const baseline = await verifyArtifactIdentity({
    cwd: workspace,
    role: "baseline",
    identity: evidence.identities.baseline,
    artifactRoot: baselineArtifactRoot,
    receiptsRoot: receiptDirectory,
    releaseEvidenceValidator
  });
  const candidate = await verifyArtifactIdentity({
    cwd: workspace,
    role: "candidate",
    identity: evidence.identities.candidate,
    artifactRoot: candidateArtifactRoot,
    receiptsRoot: receiptDirectory,
    releaseEvidenceValidator
  });
  assertArtifactPairDistinct(baseline, candidate);
  requireCondition(
    exactJson(evidence.identities.rollbackObserved, evidence.identities.baseline),
    "artifact_identity",
    "ROLLBACK_OBSERVED_NOT_BASELINE",
    "Rollback-observed canonical identity must be the exact baseline identity."
  );

  const hostReceipts = new Map();
  for (const phaseId of ROLLBACK_PHASE_IDS) {
    const expectedIdentity = expectedIdentityForPhase(
      phaseId,
      evidence.identities.baseline,
      evidence.identities.candidate
    );
    hostReceipts.set(phaseId, await verifyHostReceipt({
      cwd: workspace,
      receiptsRoot: receiptDirectory,
      binding: evidence.receipts.host[phaseId],
      expectedIdentity,
      phaseId,
      document: evidence,
      hostingPolicy: policyResult.hostingPolicy,
      hostingPolicyBinding: policyResult.loaded.get("hosting-security-policy").binding
    }));
  }

  requireCondition(
    exactJson(
      evidence.receipts.browsers.map((binding) => binding.projectName),
      ROLLBACK_BROWSER_PROJECTS
    ),
    "browser",
    "BROWSER_PROJECT_SET_INVALID",
    "Rollback Evidence must bind exactly one Edge receipt followed by one Chrome receipt."
  );
  const browserReceipts = new Map();
  for (const binding of evidence.receipts.browsers) {
    browserReceipts.set(binding.projectName, await verifyBrowserReceipt({
      cwd: workspace,
      receiptsRoot: receiptDirectory,
      binding,
      document: evidence,
      baselineIdentity: evidence.identities.baseline,
      candidateIdentity: evidence.identities.candidate
    }));
  }
  requireCondition(
    browserReceipts.get("msedge").binding.profileBindingDigest !==
      browserReceipts.get("chrome").binding.profileBindingDigest
      && browserReceipts.get("msedge").logicalPayloadDigest ===
        browserReceipts.get("chrome").logicalPayloadDigest,
    "browser",
    "BROWSER_PROFILE_OR_DATA_BINDING_INVALID",
    "Edge and Chrome must use distinct profiles over the same logical approved copy."
  );

  const deploymentReceipts = new Map();
  for (const phaseId of ["candidate", "rollbackObserved"]) {
    const expectedIdentity = expectedIdentityForPhase(
      phaseId,
      evidence.identities.baseline,
      evidence.identities.candidate
    );
    deploymentReceipts.set(phaseId, await verifyDeploymentReceipt({
      cwd: workspace,
      receiptsRoot: receiptDirectory,
      binding: evidence.receipts.deployments[phaseId],
      phaseId,
      expectedIdentity,
      document: evidence,
      hostingPolicy: policyResult.hostingPolicy
    }));
  }
  requireCondition(
    deploymentReceipts.get("candidate").envelope.deploymentId !==
      deploymentReceipts.get("rollbackObserved").envelope.deploymentId,
    "deployment",
    "DEPLOYMENT_ACTION_REUSED",
    "Candidate deployment and rollback action must have different provider operation ids."
  );

  const phaseReceipts = new Map();
  let previousEvidenceDigest = null;
  for (const phaseId of ROLLBACK_PHASE_IDS) {
    const expectedIdentity = expectedIdentityForPhase(
      phaseId,
      evidence.identities.baseline,
      evidence.identities.candidate
    );
    const verified = await verifyPhaseReceipt({
      cwd: workspace,
      receiptsRoot: receiptDirectory,
      phase: evidence.execution[phaseId],
      phaseId,
      expectedIdentity,
      document: evidence,
      hostReceipt: hostReceipts.get(phaseId),
      browserReceipts,
      deploymentReceipt: deploymentReceipts.get(phaseId) ?? null,
      previousEvidenceDigest
    });
    phaseReceipts.set(phaseId, verified);
    previousEvidenceDigest = verified.evidenceDigest;
  }
  const phaseIntervals = ROLLBACK_PHASE_IDS.map((phaseId) => ({
    phaseId,
    start: Date.parse(evidence.execution[phaseId].startedAt),
    end: Date.parse(evidence.execution[phaseId].completedAt)
  }));
  requireCondition(
    phaseIntervals[0].end <= phaseIntervals[1].start
      && phaseIntervals[1].end <= phaseIntervals[2].start,
    "timing",
    "PHASE_ORDER_INVALID",
    "Rollback phases are not an ordered, non-overlapping A to B to A sequence."
  );
  for (const [label, verifiedIdentity, phaseStart] of [
    ["baseline", baseline, phaseIntervals[0].start],
    ["candidate", candidate, phaseIntervals[1].start]
  ]) {
    requireCondition(
      Date.parse(verifiedIdentity.releaseEvidence.generatedAt) <= phaseStart
        && Date.parse(verifiedIdentity.formalReceipt.verifiedAt) <= phaseStart
        && Date.parse(verifiedIdentity.lockResult.lock.createdAt) <= phaseStart,
      "timing",
      "FORMAL_RELEASE_ADMISSION_AFTER_PHASE",
      `${label} artifact lock, Release Evidence, and formal receipt must predate its deployment phase.`
    );
  }
  for (const { phaseId, start, end } of phaseIntervals) {
    assertTimeWithin(hostReceipts.get(phaseId).envelope.observedAt, start, end, `${phaseId} host observation`);
    assertTimeWithin(evidence.execution[phaseId].runtimeObservation.observedAt, start, end, `${phaseId} runtime observation`);
    for (const receipt of browserReceipts.values()) {
      const observation = receipt.envelope.observations.find((entry) => entry.phaseId === phaseId);
      assertTimeWithin(observation.observedAt, start, end, `${receipt.binding.projectName} ${phaseId}`);
    }
    const deployment = deploymentReceipts.get(phaseId);
    if (deployment) {
      const deploymentStart = Date.parse(deployment.envelope.startedAt);
      const deploymentEnd = Date.parse(deployment.envelope.completedAt);
      requireCondition(
        deploymentStart >= start && deploymentEnd <= end,
        "timing",
        "DEPLOYMENT_OUTSIDE_PHASE",
        `${phaseId} deployment receipt is outside its phase.`
      );
    }
  }
  for (const receipt of browserReceipts.values()) {
    requireCondition(
      Date.parse(receipt.envelope.startedAt) <= phaseIntervals[0].start
        && Date.parse(receipt.envelope.completedAt) >= phaseIntervals[2].end,
      "timing",
      "BROWSER_SESSION_NOT_CONTINUOUS",
      `${receipt.binding.projectName} browser session did not span the full A to B to A sequence.`
    );
  }
  const capturedBeforeAt = assertUtcMilliseconds(
    evidence.dataCopy.fingerprint.capturedBeforeAt,
    "Data fingerprint capturedBeforeAt"
  );
  const capturedAfterAt = assertUtcMilliseconds(
    evidence.dataCopy.fingerprint.capturedAfterAt,
    "Data fingerprint capturedAfterAt"
  );
  requireCondition(
    capturedBeforeAt <= phaseIntervals[0].start
      && capturedAfterAt >= phaseIntervals[2].end
      && capturedAfterAt <= Date.parse(evidence.generatedAt),
    "data_integrity",
    "DATA_FINGERPRINT_TIME_INVALID",
    "Private v13 fingerprint did not surround the complete rollback exercise."
  );

  const preAcceptanceGates = buildPreAcceptanceGates();
  const attestations = await verifyPrivateDataAndAttestations({
    cwd: workspace,
    privateRoot: privateDirectory,
    document: evidence,
    rollbackPolicy: policyResult.rollbackPolicy,
    registry: policyResult.registry,
    preAcceptanceGates,
    lastPhaseCompletedAt: phaseIntervals[2].end
  });

  const gates = Object.freeze({
    policyBindingsVerified: true,
    artifactLocksVerified: true,
    artifactPairDistinct: true,
    baselineIdentityVerified: true,
    candidateIdentityVerified: true,
    rollbackObservedMatchesBaseline: true,
    phaseOrderVerified: true,
    realHostVerified: true,
    hostReceiptsVerified: true,
    chromeEdgeVerified: true,
    deploymentReceiptsVerified: true,
    serviceWorkerControllerRestored: true,
    privateDataApprovalVerified: true,
    sourceV13FingerprintUnchanged: true,
    mutationBoundaryPreserved: true,
    actorAttestationsVerified: true,
    operatorAcceptorIndependent: true,
    allRequiredReceiptsPassed: true,
    terminalStatusPassed: evidence.failure === null,
    rollbackEngineeringGatePassed: evidence.failure === null
  });
  requireCondition(
    gates.terminalStatusPassed
      && gates.rollbackEngineeringGatePassed
      && evidence.status === "passed"
      && evidence.failure === null
      && exactJson(evidence.gates, gates),
    "terminal",
    "TERMINAL_STATUS_MISMATCH",
    "Rollback Evidence terminal status, failure record, or 20 derived gates do not match."
  );

  return Object.freeze({
    schemaVersion: 1,
    summaryType: "rollback_evidence_verification_v1",
    verificationKind: "offline-no-git-no-network",
    status: "passed",
    verifiedAt: new Date().toISOString(),
    runId: evidence.runId,
    rollbackEvidenceId: evidence.rollbackEvidenceId,
    input: Object.freeze({
      path: relativePathWithin(workspace, input, "Rollback Evidence input"),
      sha256: rawEvidenceSha256
    }),
    scope: Object.freeze({
      origin: evidence.scope.origin,
      hostMode: evidence.scope.hostMode,
      channel: evidence.scope.channel,
      descriptor: evidence.scope.descriptor,
      browserProjects: evidence.scope.browserProjects
    }),
    identities: Object.freeze({
      baseline: normalizedReleaseIdentity(evidence.identities.baseline),
      candidate: normalizedReleaseIdentity(evidence.identities.candidate),
      rollbackObserved: normalizedReleaseIdentity(evidence.identities.rollbackObserved)
    }),
    gates,
    rollbackEvidenceVerified: true,
    claims: Object.freeze({
      engineeringEvidenceOnly: true,
      realRollbackExecutionEvidenceVerified: true,
      realRollbackScope: "one-bound-run-origin-artifact-pair-browser-matrix-and-approved-v13-copy",
      realWorldActorIndependenceEstablishedByVerifier: false,
      dataOwnerConsentTruthEstablishedByVerifier: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false,
      contentRightsGrant: false
    }),
    attestationDigests: attestations.basis
  });
}
