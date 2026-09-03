import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  computeSwAbUpdateRuntimeClientCaptureDigest,
  computeSwAbUpdateRuntimeClientId,
  computeSwAbUpdateRuntimeObservationDigest,
  computeSwAbUpdateRuntimeTargetId,
  verifySwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript,
  validateSwAbUpdateRuntimeApiTranscriptTuple
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  parseSwAbRuntimeCollectorIssuanceJsonBytes
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";

export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH =
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH =
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE =
  "01-derived-runtime-client-capture.json";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE =
  "99-producer-bridge-publication.json";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE =
  ".producer-bridge-publication-pending";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE =
  "100-producer-bridge-publication-commit.sha256";
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RECORD_TYPE =
  "sw_ab_update_runtime_derived_evidence_producer_bridge_publication_v1";

export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS =
  Object.freeze([
    Object.freeze({
      role: "producer-bridge-policy",
      path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH
    }),
    Object.freeze({
      role: "producer-bridge-schema",
      path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH
    }),
    ...SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.slice(4, 6),
    ...SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.slice(2, 4),
    ...SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.slice(0, 2)
  ]);

export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY =
  Object.freeze({
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES =
  Object.freeze({ mutationEpochCapability: "absent_schema13", epoch: null });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY =
  Object.freeze({
    issuanceFilesHeldAcrossPendingRootMaterialization: true,
    issuanceFilesHeldAcrossTerminalCommit: false,
    issuanceTerminalRereadCompletedBeforeTerminalCommit: true,
    bridgeOwnContractSourcesHeldAcrossTerminalCommit: true,
    allEightContractSourcesHeldAcrossTerminalCommit: false,
    allEightContractSourcesTerminalRereadCompletedBeforeTerminalCommit: true,
    completePendingSetVerifiedBeforeRootRename: true,
    sameParentPendingRootRenameCompleted: true,
    finalPendingSetVerifiedBeforeTerminalCommit: true,
    derivedDocumentProjectionAndDigestTripleMatched: true,
    terminalCommitMarkerBoundToPublicationDigest: true,
    terminalCommitMarkerPublishedLastBySameDirectoryRename: true,
    publicLoaderRequiresTerminalCommitMarker: true,
    businessOutputHandlesHeldAcrossTerminalCommit: true,
    pendingCommitMarkerHandleHeldAcrossRename: false,
    postTerminalCommitThrowingWorkAbsent: true,
    allEvidenceFilesContinuouslyHeldAcrossCaptureAndPublication: false,
    crashDurabilityVerified: false,
    concurrentReaderSnapshotIsolationVerified: false
  });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY =
  Object.freeze({
    continuousMutationEpochVerified: false,
    samePermissionMutationExcluded: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null
  });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE =
  Object.freeze({
    trustedImmutableProducerVerified: false,
    callerSuppliedPageAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    browserObjectIssuanceAuthenticityVerified: false,
    browserBinaryProvenanceVerified: false,
    browserTransportAuthenticityVerified: false,
    realBrowserExecutionVerified: false,
    realHttpsHostVerified: false,
    externalIssuerIdentityVerified: false,
    attemptFreshnessExternallyVerified: false,
    bundleReplayResistanceVerified: false,
    publicRedistributionAuthorized: false
  });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY =
  Object.freeze({
    defaultV13ReceiptAllowlistMember: false,
    formalReleaseEvidenceReceipt: false,
    trustedProviderVerified: false,
    trustedHostVerified: false,
    trustedBrowserRuntimeVerified: false,
    deploymentReady: false,
    releaseReady: false,
    externalDeploymentExecutionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    contentTruthAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    schemaPromotionAuthorized: false
  });
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS =
  Object.freeze({
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    rollbackAttempted: false,
    gitAttempted: false
  });

const FIXED_POLICY_KEYS = Object.freeze([
  "schemaVersion", "policyId", "producerBridgeStatus", "evidenceClass", "status",
  "executionAdmission", "releaseIdentity", "capabilities", "requiredSourceBindings",
  "outputLayout", "publicationBoundary", "mutationBoundary", "provenance", "authority",
  "attempts", "terminalState", "limitations"
]);
const FIXED_PUBLICATION_KEYS = Object.freeze([
  "schemaVersion", "recordType", "producerBridgeStatus", "evidenceClass", "status",
  "trustClass", "strictGatePassed", "runtimeAdmissionPassed", "admissionPassed",
  "usableForAdmission",
  "executionAdmission", "usableForRuntimeEvidence", "usableForCandidateAssembly",
  "formalReleaseEvidenceReceipt", "publishedAt", "releaseIdentity", "capabilities",
  "issuanceBinding", "transcriptBinding", "derivedEvidenceBinding", "sourceBindings",
  "sourceSetDigest", "publicationBoundary", "mutationBoundary", "provenance", "authority",
  "attempts", "bridgeId", "publicationDigest", "cliExitCode"
]);

export class SwAbRuntimeDerivedEvidenceProducerBridgeError extends Error {
  constructor(code, stage, message, options = {}) {
    super(message, options);
    this.name = "SwAbRuntimeDerivedEvidenceProducerBridgeError";
    this.failureCode = `SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_${code}`;
    this.stage = stage;
  }
}

export function failSwAbRuntimeDerivedEvidenceProducerBridge(code, stage, message, cause) {
  throw new SwAbRuntimeDerivedEvidenceProducerBridgeError(
    code,
    stage,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export function immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot(value) {
  return deepFreeze(structuredClone(value));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      Object.keys(value).sort(),
      [...keys].sort()
    );
}

export function requireSwAbRuntimeDerivedEvidenceProducerBridgeInput(args, label) {
  if (!Array.isArray(args) || args.length !== 1) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "INPUT_INVALID", "input", `${label} requires exactly one input object.`
    );
  }
  const value = args[0];
  const prototype = isRecord(value) ? Object.getPrototypeOf(value) : undefined;
  const descriptors = isRecord(value) ? Object.getOwnPropertyDescriptors(value) : {};
  const keys = ["cwd", "bindingRoot", "issuanceRunRoot", "bridgeRoot"];
  if (
    !isRecord(value)
    || (prototype !== Object.prototype && prototype !== null)
    || Object.getOwnPropertySymbols(value).length !== 0
    || !exactKeys(value, keys)
    || Object.values(descriptors).some((descriptor) => !("value" in descriptor))
    || keys.some((key) => typeof descriptors[key]?.value !== "string"
      || descriptors[key].value.length === 0
      || descriptors[key].value.trim() !== descriptors[key].value)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "INPUT_INVALID",
      "input",
      `${label} accepts only own data properties cwd, bindingRoot, issuanceRunRoot, and bridgeRoot.`
    );
  }
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, descriptors[key].value])));
}

export function parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(bytes, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 4 * 1024 * 1024) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "JSON_INVALID", "parse", `${label} must be one bounded non-empty byte buffer.`
    );
  }
  try {
    return parseSwAbRuntimeCollectorIssuanceJsonBytes(bytes, label);
  } catch (cause) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "JSON_INVALID", "parse", `${label} is not strict duplicate-free JSON.`, cause
    );
  }
}

export function validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy(policy) {
  if (
    !exactKeys(policy, FIXED_POLICY_KEYS)
    || policy.schemaVersion !== 1
    || policy.policyId !== "sw-ab-update-runtime-derived-evidence-producer-bridge-policy-v1"
    || policy.producerBridgeStatus !== "producer_bridge_present_mechanically_untrusted"
    || policy.evidenceClass !== "offline_untrusted_runtime_derived_evidence_producer_bridge_candidate"
    || policy.status !== "bridge_candidate_not_admitted"
    || policy.executionAdmission !== "closed_missing_selected_https_origin"
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.releaseIdentity,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.capabilities,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.requiredSourceBindings,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(policy.outputLayout, {
      derivedEvidenceFile: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
      terminalPublicationFile: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
      pendingCommitMarkerFile:
        SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE,
      terminalCommitMarkerFile:
        SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
      terminalCommitMarkerEncoding: "lowercase_publication_digest_hex_plus_lf",
      exactFileCount: 3,
      artifactOutputCount: 2,
      publicationDocumentWrittenBeforeTerminalCommit: true,
      terminalCommitMarkerPublishedLast: true,
      existingFinalRootReuseAllowed: false
    })
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.publicationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.mutationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.provenance,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.authority,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      policy.attempts,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(policy.terminalState, {
      trustClass: "untrusted_derived_evidence_producer_bridge_candidate",
      strictGatePassed: false,
      runtimeAdmissionPassed: false,
      admissionPassed: false,
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      usableForAdmission: false,
      formalReleaseEvidenceReceipt: false,
      cliExitCode: 1
    })
    || !Array.isArray(policy.limitations)
    || policy.limitations.length !== 4
    || policy.limitations.some((entry) => typeof entry !== "string" || entry.length < 20)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "POLICY_INVALID", "source", "Producer bridge policy drifted from the frozen v1 boundary."
    );
  }
  return immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot(policy);
}

export function checkedSwAbRuntimeDerivedEvidenceProducerBridgeSourceBinding(
  bytes,
  value,
  requirement
) {
  return Object.freeze({
    role: requirement.role,
    path: requirement.path,
    size: bytes.length,
    rawSha256: sha256(bytes),
    canonicalSha256: sha256(canonicalJson(value))
  });
}

export function reconstructSwAbUpdateRuntimeDerivedEvidence({
  manifest,
  tupleInputs,
  checkedTranscriptSourceBindings,
  transcriptPolicy,
  transcriptSchemaValidator,
  runtimePolicy,
  runtimeSchemaValidator,
  transcriptLoadedResult
}) {
  const validated = tupleInputs.map((input, index) =>
    validateSwAbUpdateRuntimeApiTranscriptTuple({
      record: input.record,
      tuple: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index],
      sequence: index + 1,
      origin: manifest.origin,
      artifactBindings: manifest.artifactBindings,
      schemaValidator: transcriptSchemaValidator
    })
  );
  const observations = validated.map((entry) => {
    const observation = structuredClone(entry.observation);
    observation.cdp.pseudonymousTargetId = computeSwAbUpdateRuntimeTargetId({
      runId: manifest.runId,
      attemptId: manifest.attemptId,
      projectName: observation.projectName,
      rawTargetId: observation.cdp.rawTargetId
    });
    observation.serviceWorkerMessage.pseudonymousClientId = computeSwAbUpdateRuntimeClientId({
      runId: manifest.runId,
      attemptId: manifest.attemptId,
      projectName: observation.projectName,
      rawSourceClientId: observation.serviceWorkerMessage.rawSourceClientId
    });
    observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
    return observation;
  });
  const evidence = {
    schemaVersion: 1,
    evidenceType: "sw_ab_update_runtime_client_capture_candidate_v1",
    trustClass: "untrusted_raw_capture_candidate",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    usableForCandidateAssembly: false,
    runId: manifest.runId,
    attemptId: manifest.attemptId,
    capturedAt: manifest.capturedAt,
    origin: manifest.origin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES),
    artifactBindings: structuredClone(manifest.artifactBindings),
    implementedObservationScopes: [...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES],
    deferredObservationScopes: [...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES],
    observations,
    provenance: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE),
    authority: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY),
    evidenceDigest: "0".repeat(64)
  };
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const runtimeVerification = verifySwAbUpdateRuntimeClientCapture({
    evidence,
    policy: runtimePolicy,
    schemaValidator: runtimeSchemaValidator
  });
  const derived = deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript({
    manifest,
    tupleInputs,
    checkedSourceBindings: checkedTranscriptSourceBindings,
    policy: transcriptPolicy,
    schemaValidator: transcriptSchemaValidator,
    runtimePolicy,
    runtimeSchemaValidator
  });
  if (
    evidence.evidenceDigest !== derived.derivedEvidenceDigest
    || evidence.evidenceDigest !== transcriptLoadedResult?.derivedEvidenceDigest
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      runtimeVerification.compositionProjection,
      derived.derivedProjection
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      runtimeVerification.compositionProjection,
      transcriptLoadedResult?.derivedProjection
    )
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "TRIPLE_MATCH_FAILED",
      "derivation",
      "Reconstructed evidence, public derivation, and independent loader projection drifted."
    );
  }
  return Object.freeze({
    evidence: immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot(evidence),
    projection: runtimeVerification.compositionProjection,
    derivedResult: derived
  });
}

export function derivedSwAbRuntimeEvidenceBinding(bytes, evidence) {
  return Object.freeze({
    path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
    size: bytes.length,
    rawSha256: sha256(bytes),
    canonicalSha256: sha256(canonicalJson(evidence)),
    semanticDigest: evidence.evidenceDigest
  });
}

export function computeSwAbRuntimeDerivedEvidenceProducerBridgePublicationDigest(publication) {
  const copy = structuredClone(publication);
  delete copy.bridgeId;
  delete copy.publicationDigest;
  return sha256(canonicalJson(copy));
}

export function finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication(value) {
  const publication = structuredClone(value);
  publication.publicationDigest =
    computeSwAbRuntimeDerivedEvidenceProducerBridgePublicationDigest(publication);
  publication.bridgeId = `swabpb1-${publication.publicationDigest.slice(0, 32)}`;
  return immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot(publication);
}

export function swAbRuntimeDerivedEvidenceProducerBridgeTerminalCommitMarkerBytes(
  publicationDigest
) {
  if (!/^[a-f0-9]{64}$/u.test(publicationDigest ?? "")) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "TERMINAL_COMMIT_MARKER_INVALID",
      "publication",
      "Terminal commit marker requires one lowercase publication digest."
    );
  }
  return Buffer.from(`${publicationDigest}\n`, "utf8");
}

export function validateSwAbRuntimeDerivedEvidenceProducerBridgePublication({
  publication,
  policy,
  schemaValidator,
  expectedIssuanceBinding,
  expectedTranscriptBinding,
  expectedDerivedEvidenceBinding,
  expectedSourceBindings
}) {
  try {
    schemaValidator.assert(publication);
  } catch (cause) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "SCHEMA_INVALID", "publication", "Bridge publication does not match its checked Schema.", cause
    );
  }
  const publishedAt = Date.parse(publication.publishedAt);
  if (
    !exactKeys(publication, FIXED_PUBLICATION_KEYS)
    || publication.schemaVersion !== 1
    || publication.recordType !== SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RECORD_TYPE
    || publication.producerBridgeStatus !== policy.producerBridgeStatus
    || publication.evidenceClass !== policy.evidenceClass
    || publication.trustClass !== policy.terminalState.trustClass
    || publication.status !== policy.status
    || publication.executionAdmission !== policy.executionAdmission
    || publication.usableForRuntimeEvidence !== false
    || publication.usableForCandidateAssembly !== false
    || publication.formalReleaseEvidenceReceipt !== false
    || publication.strictGatePassed !== false
    || publication.runtimeAdmissionPassed !== false
    || publication.admissionPassed !== false
    || publication.usableForAdmission !== false
    || !Number.isFinite(publishedAt)
    || new Date(publishedAt).toISOString() !== publication.publishedAt
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.releaseIdentity, policy.releaseIdentity)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.capabilities, policy.capabilities)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.issuanceBinding, expectedIssuanceBinding)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.transcriptBinding, expectedTranscriptBinding)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      publication.derivedEvidenceBinding,
      expectedDerivedEvidenceBinding
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.sourceBindings, expectedSourceBindings)
    || publication.sourceSetDigest !== sha256(canonicalJson(expectedSourceBindings))
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      publication.publicationBoundary,
      policy.publicationBoundary
    )
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.mutationBoundary, policy.mutationBoundary)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.provenance, policy.provenance)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.authority, policy.authority)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(publication.attempts, policy.attempts)
    || publication.cliExitCode !== 1
    || publication.publicationDigest
      !== computeSwAbRuntimeDerivedEvidenceProducerBridgePublicationDigest(publication)
    || publication.bridgeId !== `swabpb1-${publication.publicationDigest.slice(0, 32)}`
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PUBLICATION_INVALID",
      "publication",
      "Bridge publication identity, bindings, boundary, or terminal state drifted."
    );
  }
  const paths = publication.sourceBindings.map((entry) => entry.path);
  const roles = publication.sourceBindings.map((entry) => entry.role);
  if (new Set(paths).size !== 8 || new Set(roles).size !== 8) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "SOURCE_ALIAS", "source", "Bridge source paths and roles must be eight unique bindings."
    );
  }
  return immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot(publication);
}

export function buildSwAbRuntimeDerivedEvidenceProducerBridgeResult(publication, projection) {
  return immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot({
    code: "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED",
    producerBridgeStatus: publication.producerBridgeStatus,
    evidenceClass: publication.evidenceClass,
    trustClass: publication.trustClass,
    status: publication.status,
    executionAdmission: publication.executionAdmission,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForAdmission: false,
    releaseIdentity: publication.releaseIdentity,
    capabilities: publication.capabilities,
    publicationBoundary: publication.publicationBoundary,
    mutationBoundary: publication.mutationBoundary,
    provenance: publication.provenance,
    authority: publication.authority,
    attempts: publication.attempts,
    runId: publication.issuanceBinding.runId,
    attemptId: publication.issuanceBinding.attemptId,
    issuanceId: publication.issuanceBinding.issuanceId,
    receiptDigest: publication.issuanceBinding.receiptDigest,
    bundleId: publication.transcriptBinding.bundleId,
    bundleDigest: publication.transcriptBinding.bundleDigest,
    derivedEvidenceDigest: publication.derivedEvidenceBinding.semanticDigest,
    bridgeId: publication.bridgeId,
    publicationDigest: publication.publicationDigest,
    derivedProjection: projection,
    cliExitCode: 1
  });
}

export function buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure(error) {
  const code = error instanceof SwAbRuntimeDerivedEvidenceProducerBridgeError
    ? error.failureCode
    : "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_UNEXPECTED_FAILURE";
  const stage = error instanceof SwAbRuntimeDerivedEvidenceProducerBridgeError
    ? error.stage
    : "unexpected";
  return immutableSwAbRuntimeDerivedEvidenceProducerBridgeSnapshot({
    code,
    stage,
    producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
    evidenceClass: "offline_untrusted_runtime_derived_evidence_producer_bridge_candidate",
    trustClass: "untrusted_derived_evidence_producer_bridge_candidate",
    status: "bridge_candidate_not_admitted",
    executionAdmission: "closed_missing_selected_https_origin",
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForAdmission: false,
    releaseIdentity: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY,
    capabilities: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES,
    publicationBoundary: {
      ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY,
      issuanceFilesHeldAcrossPendingRootMaterialization: false,
      issuanceTerminalRereadCompletedBeforeTerminalCommit: false,
      bridgeOwnContractSourcesHeldAcrossTerminalCommit: false,
      allEightContractSourcesTerminalRereadCompletedBeforeTerminalCommit: false,
      completePendingSetVerifiedBeforeRootRename: false,
      sameParentPendingRootRenameCompleted: false,
      finalPendingSetVerifiedBeforeTerminalCommit: false,
      derivedDocumentProjectionAndDigestTripleMatched: false,
      terminalCommitMarkerBoundToPublicationDigest: false,
      terminalCommitMarkerPublishedLastBySameDirectoryRename: false,
      businessOutputHandlesHeldAcrossTerminalCommit: false,
      postTerminalCommitThrowingWorkAbsent: false
    },
    mutationBoundary: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY,
    provenance: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE,
    authority: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY,
    attempts: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS,
    messageDigest: sha256(canonicalJson({
      family: "sw-ab-update-runtime-derived-evidence-producer-bridge",
      code,
      stage
    })),
    cliExitCode: 1
  });
}

export function comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32"
    ? path.toNamespacedPath(resolved).toLocaleLowerCase("en-US")
    : resolved;
}

export function requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath(value, label) {
  if (
    typeof value !== "string"
    || !path.isAbsolute(value)
    || path.normalize(value) !== value
    || value.endsWith(path.sep)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PATH_INVALID", "input", `${label} must be one canonical absolute path.`
    );
  }
  return value;
}

export function relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (
    relative === ""
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PATH_OUTSIDE_ROOT", "filesystem", `${label} must be strictly inside its binding root.`
    );
  }
  return relative.split(path.sep).join("/");
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function bridgeFileIdentity(stat, physical) {
  return Object.freeze({
    realPath: comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(physical),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
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

export async function holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
  bindingRoot,
  filePath,
  relativePath,
  label,
  maximumSize = 4 * 1024 * 1024
}) {
  const checkedPath = path.resolve(filePath);
  if (relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge(bindingRoot, checkedPath, label)
    !== relativePath) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PATH_BINDING_MISMATCH", "filesystem", `${label} relative path drifted.`
    );
  }
  let handle;
  try {
    const [pathBefore, physicalBefore] = await Promise.all([
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
      || comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(physicalBefore)
        !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(checkedPath)
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "FILE_INVALID", "filesystem", `${label} must be one bounded regular single-link unaliased file.`
      );
    }
    handle = await open(checkedPath, "r");
    const before = await handle.stat({ bigint: true });
    if (!sameFileIdentity(pathBefore, before)) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "FILE_REBOUND", "filesystem", `${label} rebound before held read.`
      );
    }
    const bytes = await readOpenedAtZero(handle, Number(before.size));
    const [after, pathAfter, physicalAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(checkedPath, { bigint: true }),
      realpath(checkedPath)
    ]);
    if (
      !sameFileIdentity(before, after)
      || !sameFileIdentity(after, pathAfter)
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || after.nlink !== 1n
      || pathAfter.nlink !== 1n
      || bytes.length !== Number(after.size)
      || comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(physicalAfter)
        !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(checkedPath)
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "FILE_CHANGED", "filesystem", `${label} changed during held read.`
      );
    }
    return {
      label,
      path: checkedPath,
      handle,
      bytes,
      identity: bridgeFileIdentity(after, physicalAfter),
      binding: Object.freeze({ path: relativePath, size: bytes.length, sha256: sha256(bytes) })
    };
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    throw error;
  }
}

export async function assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held) {
  const bytes = await readOpenedAtZero(held.handle, Number(held.identity.size));
  const [after, pathAfter, physicalAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.path, { bigint: true }),
    realpath(held.path)
  ]);
  if (
    String(after.dev) !== held.identity.dev
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
    || comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(physicalAfter) !== held.identity.realPath
    || bytes.length !== held.bytes.length
    || !bytes.equals(held.bytes)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "TERMINAL_SET_CHANGED", "filesystem", `${held.label} changed inside its held verification window.`
    );
  }
}

export function assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles(heldFiles) {
  const paths = heldFiles.map((held) => held.identity.realPath);
  const identities = heldFiles.map((held) =>
    `${held.identity.dev}\0${held.identity.ino}\0${held.identity.birthtimeNs}`
  );
  if (new Set(paths).size !== heldFiles.length || new Set(identities).size !== heldFiles.length) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PHYSICAL_ALIAS", "filesystem", "Bridge inputs and outputs must have distinct physical identities."
    );
  }
}

async function assertExactSwAbRuntimeDerivedEvidenceProducerBridgeNamedFileSet(
  root,
  expected,
  label
) {
  const entries = await readdir(root, { withFileTypes: true });
  if (
    entries.length !== expected.length
    || entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      entries.map((entry) => entry.name).sort(),
      [...expected].sort()
    )
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "FILE_SET_INVALID", "filesystem", label
    );
  }
}

export async function assertExactSwAbRuntimeDerivedEvidenceProducerBridgeFileSet(root) {
  return assertExactSwAbRuntimeDerivedEvidenceProducerBridgeNamedFileSet(
    root,
    [
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
    ],
    "Bridge root must contain exactly two business JSON files and the terminal commit marker."
  );
}

export async function assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet(root) {
  return assertExactSwAbRuntimeDerivedEvidenceProducerBridgeNamedFileSet(
    root,
    [
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
    ],
    "Pending bridge root must contain exactly two business JSON files and the pending marker."
  );
}

export async function assertRealSwAbRuntimeDerivedEvidenceProducerBridgeDirectoryChain(
  root,
  target,
  label
) {
  const relative = relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge(root, target, label);
  let current = root;
  const segments = relative.split("/");
  for (const segment of segments) {
    current = path.join(current, segment);
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "DIRECTORY_ALIAS", "filesystem", `${label} contains a non-real directory component.`
      );
    }
    if (comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(await realpath(current))
      !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(current)) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "DIRECTORY_ALIAS", "filesystem", `${label} contains a junction or physical alias.`
      );
    }
  }
}

export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TRANSCRIPT_FILES =
  Object.freeze([
    ...SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE
  ]);
export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT =
  Object.freeze({
    marker: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    transcriptDirectory: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    receipt: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
  });
