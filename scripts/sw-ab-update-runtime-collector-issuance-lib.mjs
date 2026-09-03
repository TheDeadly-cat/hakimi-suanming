import {
  createPublicKey,
  sign as signDigest,
  verify as verifyDigest
} from "node:crypto";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH =
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH =
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE =
  "00-collector-attempt-marker.json";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY =
  "api-transcript";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE =
  "99-collector-issuance.json";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS =
  "untrusted_ephemeral_self_signed_collector_issuance_candidate";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS = "issuance_incomplete";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION =
  "closed_missing_selected_https_origin";

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS = Object.freeze([
  Object.freeze({
    role: "collector-issuance-policy",
    path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH
  }),
  Object.freeze({
    role: "collector-issuance-schema",
    path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH
  }),
  Object.freeze({
    role: "api-transcript-policy",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json"
  }),
  Object.freeze({
    role: "api-transcript-schema",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json"
  }),
  Object.freeze({
    role: "runtime-capture-policy",
    path: "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json"
  }),
  Object.freeze({
    role: "runtime-capture-schema",
    path: "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json"
  })
]);

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY = Object.freeze({
  algorithm: "ed25519",
  keyScope: "ephemeral_per_attempt_self_issued",
  signedDigestEncoding: "raw_sha256_bytes",
  publicKeyEncoding: "canonical_spki_der_base64",
  signatureEncoding: "base64",
  externalTrustAnchor: false,
  externalIdentityBinding: false,
  externalTimestampAuthority: false,
  historicalRevocationRegistry: false,
  provesOnly: "single_ephemeral_key_internal_chain_integrity"
});

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS = Object.freeze({
  ephemeralSelfSignatureChainVerified: true,
  collectorIssuanceProjectionVerified: true,
  phaseMajorIssuanceChainVerified: true,
  transcriptBundleBindingVerified: true,
  overlappingHeldFileEpochEstablished: true,
  intervalMutationExcluded: false,
  abaExcluded: false
});

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY = Object.freeze({
  attemptMarkerHandleHeldAcrossIssuance: true,
  overlappingHeldFileEpochEstablished: true,
  allEvidenceFilesContinuouslyHeldAcrossIssuance: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE = Object.freeze({
  callerSuppliedObservationAuthenticityVerified: false,
  runtimeCollectorProvenanceVerified: false,
  browserObjectIssuanceAuthenticityVerified: false,
  browserBinaryProvenanceVerified: false,
  browserRuntimeProvenanceVerified: false,
  browserTransportAuthenticityVerified: false,
  realBrowserExecutionVerified: false,
  osProcessRestartProvenanceVerified: false,
  twoClientRuntimeProvenanceVerified: false,
  serviceWorkerResponseProvenanceVerified: false,
  offlineTransportClosureVerified: false,
  attemptFreshnessExternallyVerified: false,
  bundleReplayResistanceVerified: false,
  concurrentFilesystemMutationResistanceVerified: false
});

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY = Object.freeze({
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

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^run-[a-f0-9]{64}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const COLLECTOR_NONCE_PATTERN = /^collector-[a-f0-9]{64}$/u;
const ISSUER_KEY_ID_PATTERN = /^ed25519-[a-f0-9]{64}$/u;
const BROWSER_NONCE_PATTERN = /^browser-[a-f0-9]{64}$/u;
const CONTEXT_NONCE_PATTERN = /^context-[a-f0-9]{64}$/u;
const PAGE_NONCE_PATTERN = /^page-[a-f0-9]{64}$/u;
const SESSION_NONCE_PATTERN = /^session-[a-f0-9]{64}$/u;
const CHALLENGE_NONCE_PATTERN = /^challenge-[a-f0-9]{64}$/u;
const ISSUANCE_ID_PATTERN = /^swabci1-[a-f0-9]{32}$/u;
const RELEASE_EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;

export class SwAbRuntimeCollectorIssuanceError extends Error {
  constructor(code, stage, message, cause) {
    super(
      `SW_AB_RUNTIME_COLLECTOR_ISSUANCE_${code}: ${message}`,
      cause === undefined ? undefined : { cause }
    );
    this.name = "SwAbRuntimeCollectorIssuanceError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: true },
      failureCode: {
        value: `SW_AB_RUNTIME_COLLECTOR_ISSUANCE_${code}`,
        enumerable: true
      },
      stage: { value: stage, enumerable: true }
    });
  }
}

export function failSwAbRuntimeCollectorIssuance(code, stage, message, cause) {
  throw new SwAbRuntimeCollectorIssuanceError(code, stage, message, cause);
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

function requireCondition(condition, code, stage, message) {
  if (!condition) failSwAbRuntimeCollectorIssuance(code, stage, message);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

export function immutableSwAbRuntimeCollectorIssuanceSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

export function parseSwAbRuntimeCollectorIssuanceJsonBytes(bytes, label) {
  try {
    return parseSwAbUpdateRuntimeApiTranscriptJsonBytes(bytes, label);
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "JSON_INVALID",
      "json",
      `${label} is not strict duplicate-free JSON.`,
      cause
    );
  }
}

function parseCanonicalTimestamp(value, label) {
  const milliseconds = Date.parse(value);
  requireCondition(
    typeof value === "string"
      && Number.isFinite(milliseconds)
      && new Date(milliseconds).toISOString() === value,
    "INPUT_INVALID",
    "semantic",
    `${label} is not a canonical UTC timestamp.`
  );
  return milliseconds;
}

function validateCanonicalOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "semantic",
      "Origin is not a valid URL.",
      cause
    );
  }
  requireCondition(
    parsed.protocol === "https:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.pathname === "/"
      && parsed.origin === value,
    "INPUT_INVALID",
    "semantic",
    "Origin must be one canonical HTTPS origin without credentials, query, hash, or path."
  );
}

function validateArtifactBindings(bindings) {
  requireCondition(
    exactKeys(bindings, ["A", "B"]),
    "INPUT_INVALID",
    "semantic",
    "Artifact bindings must contain exact A and B entries."
  );
  for (const label of ["A", "B"]) {
    const binding = bindings[label];
    requireCondition(
      exactKeys(binding, [
        "label",
        "releaseEvidenceId",
        "buildVersion",
        "serviceWorkerSha256",
        "artifactSetDigest"
      ])
        && binding.label === label
        && RELEASE_EVIDENCE_ID_PATTERN.test(binding.releaseEvidenceId ?? "")
        && BUILD_VERSION_PATTERN.test(binding.buildVersion ?? "")
        && SHA256_PATTERN.test(binding.serviceWorkerSha256 ?? "")
        && SHA256_PATTERN.test(binding.artifactSetDigest ?? ""),
      "INPUT_INVALID",
      "semantic",
      `Artifact ${label} binding is invalid.`
    );
  }
  requireCondition(
    bindings.A.releaseEvidenceId !== bindings.B.releaseEvidenceId
      && bindings.A.buildVersion !== bindings.B.buildVersion
      && bindings.A.serviceWorkerSha256 !== bindings.B.serviceWorkerSha256
      && bindings.A.artifactSetDigest !== bindings.B.artifactSetDigest,
    "INPUT_INVALID",
    "semantic",
    "Artifact A and B identities must be distinct."
  );
}

function canonicalBase64Bytes(value, label, expectedLength = null) {
  requireCondition(
    typeof value === "string"
      && value.length > 0
      && !/\s/u.test(value)
      && /^[A-Za-z0-9+/]+={0,2}$/u.test(value),
    "SIGNATURE_INVALID",
    "signature",
    `${label} is not canonical base64.`
  );
  const bytes = Buffer.from(value, "base64");
  requireCondition(
    bytes.toString("base64") === value
      && (expectedLength === null || bytes.length === expectedLength),
    "SIGNATURE_INVALID",
    "signature",
    `${label} does not round-trip canonically.`
  );
  return bytes;
}

export function parseCanonicalEd25519PublicKey(publicKeySpkiBase64) {
  const bytes = canonicalBase64Bytes(publicKeySpkiBase64, "Issuer public key");
  let key;
  try {
    key = createPublicKey({ key: bytes, format: "der", type: "spki" });
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "SIGNATURE_INVALID",
      "signature",
      "Issuer public key is not canonical SPKI DER.",
      cause
    );
  }
  const exported = key.export({ format: "der", type: "spki" });
  requireCondition(
    key.asymmetricKeyType === "ed25519" && Buffer.from(exported).equals(bytes),
    "SIGNATURE_INVALID",
    "signature",
    "Issuer public key is not one canonical Ed25519 SPKI key."
  );
  return Object.freeze({ key, bytes });
}

function domainDigest(namespace, document) {
  return sha256(canonicalJson({ namespace, document }));
}

export function computeSwAbRuntimeCollectorMarkerDigest(marker) {
  const document = structuredClone(marker);
  delete document.markerDigest;
  delete document.markerSignatureBase64;
  return domainDigest("hakimi-sw-ab-runtime-collector-attempt-marker-v1", document);
}

export function computeSwAbRuntimeCollectorMarkerStatementDigest(marker) {
  return domainDigest("hakimi-sw-ab-runtime-collector-attempt-marker-signature-v1", {
    schemaVersion: marker.schemaVersion,
    recordType: marker.recordType,
    issuerKeyId: marker.issuerKeyId,
    markerDigest: marker.markerDigest
  });
}

export function computeSwAbRuntimeCollectorChainGenesisDigest(marker) {
  return domainDigest("hakimi-sw-ab-runtime-collector-issuance-chain-genesis-v1", {
    markerDigest: marker.markerDigest,
    issuerKeyId: marker.issuerKeyId
  });
}

export function computeSwAbRuntimeCollectorTupleIssuanceDigest({
  runId,
  attemptId,
  collectorInstanceNonce,
  issuance
}) {
  const document = structuredClone(issuance);
  delete document.issuanceDigest;
  return domainDigest("hakimi-sw-ab-runtime-collector-tuple-issuance-v1", {
    runId,
    attemptId,
    collectorInstanceNonce,
    ...document
  });
}

export function computeSwAbRuntimeCollectorIssuanceIdentityBaseDigest(receipt) {
  const document = structuredClone(receipt);
  delete document.issuanceId;
  delete document.receiptDigest;
  delete document.receiptSignatureBase64;
  return domainDigest("hakimi-sw-ab-runtime-collector-issuance-identity-v1", document);
}

export function computeSwAbRuntimeCollectorReceiptDigest(receipt) {
  const document = structuredClone(receipt);
  delete document.receiptDigest;
  delete document.receiptSignatureBase64;
  return domainDigest("hakimi-sw-ab-runtime-collector-issuance-receipt-v1", {
    issuanceId: receipt.issuanceId,
    document
  });
}

export function computeSwAbRuntimeCollectorReceiptStatementDigest(receipt) {
  return domainDigest("hakimi-sw-ab-runtime-collector-issuance-receipt-signature-v1", {
    schemaVersion: receipt.schemaVersion,
    recordType: receipt.recordType,
    issuerKeyId: receipt.issuerKeyId,
    issuanceId: receipt.issuanceId,
    receiptDigest: receipt.receiptDigest
  });
}

export function signSwAbRuntimeCollectorDigest(privateKey, digest) {
  requireCondition(
    SHA256_PATTERN.test(digest ?? ""),
    "SIGNATURE_INVALID",
    "signature",
    "Signed digest must be a lowercase SHA-256 digest."
  );
  return signDigest(null, Buffer.from(digest, "hex"), privateKey).toString("base64");
}

function verifySwAbRuntimeCollectorDigest(publicKey, digest, signatureBase64, label) {
  const signature = canonicalBase64Bytes(signatureBase64, `${label} signature`, 64);
  requireCondition(
    verifyDigest(null, Buffer.from(digest, "hex"), publicKey, signature),
    "SIGNATURE_INVALID",
    "signature",
    `${label} signature is invalid.`
  );
}

export function validateSwAbRuntimeCollectorIssuancePolicy(policy) {
  const expectedTuples = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.map((entry, index) => ({
    sequence: index + 1,
    projectName: entry.projectName,
    phase: entry.phase,
    slot: entry.slot,
    transcriptPath: `${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index]}`
  }));
  requireCondition(
    exactKeys(policy, [
      "schemaVersion",
      "policyId",
      "trustClass",
      "status",
      "executionAdmission",
      "releaseIdentity",
      "capabilities",
      "requiredBrowserProjects",
      "requiredPhases",
      "requiredSlots",
      "rootLayout",
      "requiredTupleIssuances",
      "requiredSourceBindings",
      "signatureBoundary",
      "terminalState",
      "mutationBoundary",
      "provenance",
      "authority"
    ])
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.sw-ab-update-runtime-collector-issuance-candidate/v1"
      && policy.trustClass === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
      && policy.status === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
      && policy.executionAdmission === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
      && exactJson(policy.releaseIdentity, {
        channel: "default-v13",
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      })
      && exactJson(policy.capabilities, {
        mutationEpochCapability: "absent_schema13",
        epoch: null
      })
      && exactJson(policy.requiredBrowserProjects, ["msedge", "chrome"])
      && exactJson(policy.requiredPhases, ["initial-a", "post-claim"])
      && exactJson(policy.requiredSlots, ["retained-old-a", "reload-to-b"])
      && exactJson(policy.rootLayout, {
        attemptMarkerFile: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
        transcriptDirectory: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
        terminalIssuanceFile: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
      })
      && exactJson(policy.requiredTupleIssuances, expectedTuples)
      && exactJson(policy.requiredSourceBindings, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS)
      && exactJson(policy.signatureBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY)
      && exactJson(policy.mutationBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY)
      && exactJson(policy.terminalState, {
        ephemeralSelfSignatureChainVerified: true,
        collectorIssuanceProjectionVerified: true,
        phaseMajorIssuanceChainVerified: true,
        transcriptBundleBindingVerified: true,
        overlappingHeldFileEpochEstablished: true,
        intervalMutationExcluded: false,
        abaExcluded: false,
        usableForRuntimeEvidence: false,
        usableForCandidateAssembly: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE)
      && exactJson(policy.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY),
    "AUTHORITY_PROMOTION",
    "policy",
    "Collector issuance policy drifted from the fixed v13 self-signature boundary."
  );
  return policy;
}

function validateSourceBindings(bindings, policy) {
  requireCondition(
    Array.isArray(bindings)
      && bindings.length === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.length,
    "SOURCE_BINDING_MISMATCH",
    "source",
    "Collector issuance source bindings are incomplete."
  );
  for (let index = 0; index < bindings.length; index += 1) {
    const actual = bindings[index];
    const expected = policy.requiredSourceBindings[index];
    requireCondition(
      exactKeys(actual, ["role", "path", "size", "rawSha256", "canonicalSha256"])
        && actual.role === expected.role
        && actual.path === expected.path
        && Number.isInteger(actual.size)
        && actual.size > 0
        && SHA256_PATTERN.test(actual.rawSha256 ?? "")
        && SHA256_PATTERN.test(actual.canonicalSha256 ?? ""),
      "SOURCE_BINDING_MISMATCH",
      "source",
      `Collector issuance source binding ${index + 1} is invalid.`
    );
  }
}

export function validateSwAbRuntimeCollectorAttemptMarker({
  marker,
  policy,
  schemaValidator,
  checkedSourceBindings
}) {
  try {
    schemaValidator.assert(marker);
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "SCHEMA_INVALID",
      "marker",
      "Attempt marker does not match the checked Schema.",
      cause
    );
  }
  requireCondition(
    marker.schemaVersion === 1
      && marker.recordType === "sw_ab_update_runtime_collector_attempt_marker_candidate_v1"
      && marker.trustClass === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
      && marker.status === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
      && marker.executionAdmission === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
      && RUN_ID_PATTERN.test(marker.runId ?? "")
      && ATTEMPT_ID_PATTERN.test(marker.attemptId ?? "")
      && COLLECTOR_NONCE_PATTERN.test(marker.collectorInstanceNonce ?? "")
      && ISSUER_KEY_ID_PATTERN.test(marker.issuerKeyId ?? "")
      && exactJson(marker.releaseIdentity, policy.releaseIdentity)
      && exactJson(marker.capabilities, policy.capabilities)
      && exactJson(marker.rootLayout, policy.rootLayout)
      && exactJson(marker.signatureBoundary, policy.signatureBoundary)
      && exactJson(marker.authority, policy.authority),
    "AUTHORITY_PROMOTION",
    "marker",
    "Attempt marker identity, capability, signature boundary, or authority ledger drifted."
  );
  validateCanonicalOrigin(marker.origin);
  validateArtifactBindings(marker.artifactBindings);
  parseCanonicalTimestamp(marker.createdAt, "Attempt marker createdAt");
  validateSourceBindings(marker.sourceBindings, policy);
  requireCondition(
    marker.sourceSetDigest === sha256(canonicalJson(marker.sourceBindings))
      && exactJson(marker.sourceBindings, checkedSourceBindings),
    "SOURCE_BINDING_MISMATCH",
    "marker",
    "Attempt marker source bindings do not match the independently held sources."
  );
  const publicKey = parseCanonicalEd25519PublicKey(marker.issuerPublicKeySpkiDerBase64);
  requireCondition(
    marker.issuerKeyId === `ed25519-${sha256(publicKey.bytes)}`,
    "SIGNATURE_INVALID",
    "marker",
    "Attempt marker issuer key id does not bind the canonical public key."
  );
  requireCondition(
    marker.markerDigest === computeSwAbRuntimeCollectorMarkerDigest(marker),
    "CHAIN_INVALID",
    "marker",
    "Attempt marker digest is invalid."
  );
  verifySwAbRuntimeCollectorDigest(
    publicKey.key,
    computeSwAbRuntimeCollectorMarkerStatementDigest(marker),
    marker.markerSignatureBase64,
    "Attempt marker"
  );
  return Object.freeze({ publicKey: publicKey.key, publicKeyBytes: publicKey.bytes });
}

function validateTupleIssuanceChain({ receipt, marker, transcript }) {
  requireCondition(
    Array.isArray(receipt.tupleIssuances) && receipt.tupleIssuances.length === 8,
    "TUPLE_ORDER_INVALID",
    "receipt",
    "Collector receipt must contain exactly eight tuple issuances."
  );
  const browserByProject = new Map();
  const contextByProject = new Map();
  const pageByProjectSlot = new Map();
  const sessionNonces = new Set();
  const challengeNonces = new Set();
  let predecessor = computeSwAbRuntimeCollectorChainGenesisDigest(marker);
  for (let index = 0; index < receipt.tupleIssuances.length; index += 1) {
    const issuance = receipt.tupleIssuances[index];
    const expectedTuple = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index];
    const expectedFile = SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index];
    const heldBinding = transcript.tupleBindings[index];
    const heldRecord = transcript.tupleRecords[index];
    requireCondition(
      issuance.sequence === index + 1
        && issuance.projectName === expectedTuple.projectName
        && issuance.phase === expectedTuple.phase
        && issuance.slot === expectedTuple.slot
        && issuance.transcriptPath === `${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${expectedFile}`
        && issuance.transcriptSize === heldBinding.size
        && issuance.transcriptSha256 === heldBinding.sha256
        && issuance.transcriptRecordDigest === heldRecord.recordDigest
        && BROWSER_NONCE_PATTERN.test(issuance.browserIssuanceNonce ?? "")
        && CONTEXT_NONCE_PATTERN.test(issuance.browserContextIssuanceNonce ?? "")
        && PAGE_NONCE_PATTERN.test(issuance.pageIssuanceNonce ?? "")
        && SESSION_NONCE_PATTERN.test(issuance.sessionNonce ?? "")
        && CHALLENGE_NONCE_PATTERN.test(issuance.challengeNonce ?? ""),
      "TUPLE_ORDER_INVALID",
      "receipt",
      `Tuple issuance ${index + 1} drifted from the phase-major transcript binding.`
    );
    const project = issuance.projectName;
    const pageKey = `${project}\0${issuance.slot}`;
    const priorBrowser = browserByProject.get(project);
    const priorContext = contextByProject.get(project);
    const priorPage = pageByProjectSlot.get(pageKey);
    if (priorBrowser === undefined) browserByProject.set(project, issuance.browserIssuanceNonce);
    if (priorContext === undefined) contextByProject.set(project, issuance.browserContextIssuanceNonce);
    if (priorPage === undefined) pageByProjectSlot.set(pageKey, issuance.pageIssuanceNonce);
    requireCondition(
      (priorBrowser === undefined || priorBrowser === issuance.browserIssuanceNonce)
        && (priorContext === undefined || priorContext === issuance.browserContextIssuanceNonce)
        && (priorPage === undefined || priorPage === issuance.pageIssuanceNonce),
      "NONCE_REUSED",
      "receipt",
      `Tuple issuance ${index + 1} broke browser/context/page nonce continuity.`
    );
    requireCondition(
      !sessionNonces.has(issuance.sessionNonce)
        && !challengeNonces.has(issuance.challengeNonce),
      "NONCE_REUSED",
      "receipt",
      `Tuple issuance ${index + 1} reused a session or challenge nonce.`
    );
    sessionNonces.add(issuance.sessionNonce);
    challengeNonces.add(issuance.challengeNonce);
    requireCondition(
      issuance.sessionNonce === heldRecord.cdpSession.instanceNonce
        && issuance.challengeNonce === heldRecord.serviceWorkerChallenge.request.challengeNonce
        && issuance.challengeNonce === heldRecord.serviceWorkerChallenge.response.challengeNonce,
      "TRANSCRIPT_BINDING_MISMATCH",
      "receipt",
      `Tuple issuance ${index + 1} nonce does not bind the decoded transcript record.`
    );
    requireCondition(
      issuance.previousIssuanceDigest === predecessor
        && issuance.issuanceDigest === computeSwAbRuntimeCollectorTupleIssuanceDigest({
          runId: receipt.runId,
          attemptId: receipt.attemptId,
          collectorInstanceNonce: receipt.collectorInstanceNonce,
          issuance
        }),
      "CHAIN_INVALID",
      "receipt",
      `Tuple issuance ${index + 1} hash-chain relation is invalid.`
    );
    predecessor = issuance.issuanceDigest;
  }
  requireCondition(
    new Set(browserByProject.values()).size === 2
      && new Set(contextByProject.values()).size === 2
      && new Set(pageByProjectSlot.values()).size === 4,
    "NONCE_REUSED",
    "receipt",
    "Browser, context, or page issuance nonces are not isolated as required."
  );
}

export function validateSwAbRuntimeCollectorIssuanceReceipt({
  receipt,
  marker,
  markerBinding,
  policy,
  schemaValidator,
  checkedSourceBindings,
  transcript
}) {
  try {
    schemaValidator.assert(receipt);
  } catch (cause) {
    failSwAbRuntimeCollectorIssuance(
      "SCHEMA_INVALID",
      "receipt",
      "Collector issuance receipt does not match the checked Schema.",
      cause
    );
  }
  requireCondition(
    receipt.schemaVersion === 1
      && receipt.recordType === "sw_ab_update_runtime_collector_issuance_candidate_v1"
      && receipt.trustClass === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
      && receipt.status === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
      && receipt.executionAdmission === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
      && receipt.usableForRuntimeEvidence === false
      && receipt.usableForCandidateAssembly === false
      && receipt.formalReleaseEvidenceReceipt === false
      && receipt.cliExitCode === 1
      && receipt.runId === marker.runId
      && receipt.attemptId === marker.attemptId
      && receipt.collectorInstanceNonce === marker.collectorInstanceNonce
      && receipt.issuerKeyId === marker.issuerKeyId
      && receipt.origin === marker.origin
      && exactJson(receipt.releaseIdentity, marker.releaseIdentity)
      && exactJson(receipt.capabilities, marker.capabilities)
      && exactJson(receipt.rootLayout, marker.rootLayout)
      && exactJson(receipt.artifactBindings, marker.artifactBindings)
      && exactJson(receipt.signatureBoundary, policy.signatureBoundary)
      && exactJson(receipt.mechanicalChecks, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS)
      && exactJson(receipt.mutationBoundary, policy.mutationBoundary)
      && exactJson(receipt.provenance, policy.provenance)
      && exactJson(receipt.authority, policy.authority),
    "AUTHORITY_PROMOTION",
    "receipt",
    "Collector receipt identity, terminal state, mutation boundary, provenance, or authority drifted."
  );
  const markerTime = parseCanonicalTimestamp(marker.createdAt, "Attempt marker createdAt");
  const capturedTime = parseCanonicalTimestamp(receipt.capturedAt, "Collector receipt capturedAt");
  requireCondition(
    capturedTime >= markerTime,
    "CHAIN_INVALID",
    "receipt",
    "Collector receipt predates its attempt marker."
  );
  validateSourceBindings(receipt.sourceBindings, policy);
  requireCondition(
    exactJson(receipt.sourceBindings, checkedSourceBindings)
      && receipt.sourceSetDigest === sha256(canonicalJson(receipt.sourceBindings))
      && receipt.sourceSetDigest === marker.sourceSetDigest,
    "SOURCE_BINDING_MISMATCH",
    "receipt",
    "Collector receipt source bindings drifted from the marker or held sources."
  );
  requireCondition(
    exactJson(receipt.attemptMarkerBinding, {
      path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
      size: markerBinding.size,
      sha256: markerBinding.sha256,
      markerDigest: marker.markerDigest,
      issuerKeyId: marker.issuerKeyId,
      issuerPublicKeySpkiDerBase64: marker.issuerPublicKeySpkiDerBase64
    }),
    "MARKER_CHANGED",
    "receipt",
    "Collector receipt does not bind the held attempt marker."
  );
  requireCondition(
    exactJson(receipt.transcriptBundleBinding, transcript.bundleBinding),
    "TRANSCRIPT_BINDING_MISMATCH",
    "receipt",
    "Collector receipt does not bind the independently verified transcript bundle."
  );
  validateTupleIssuanceChain({ receipt, marker, transcript });
  requireCondition(
    ISSUANCE_ID_PATTERN.test(receipt.issuanceId ?? "")
      && receipt.issuanceId
        === `swabci1-${computeSwAbRuntimeCollectorIssuanceIdentityBaseDigest(receipt).slice(0, 32)}`
      && receipt.receiptDigest === computeSwAbRuntimeCollectorReceiptDigest(receipt),
    "CHAIN_INVALID",
    "receipt",
    "Collector receipt identity or digest is invalid."
  );
  const { key } = parseCanonicalEd25519PublicKey(marker.issuerPublicKeySpkiDerBase64);
  verifySwAbRuntimeCollectorDigest(
    key,
    computeSwAbRuntimeCollectorReceiptStatementDigest(receipt),
    receipt.receiptSignatureBase64,
    "Collector receipt"
  );
  return receipt;
}

export function buildSwAbRuntimeCollectorIssuanceResult({
  receipt,
  transcriptResult,
  terminalEndpointSnapshotsMatched
}) {
  return immutableSwAbRuntimeCollectorIssuanceSnapshot({
    code: "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_NOT_ADMITTED",
    trustClass: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
    status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
    executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
    ephemeralSelfSignatureChainVerified: true,
    collectorIssuanceProjectionVerified: true,
    phaseMajorIssuanceChainVerified: true,
    transcriptBundleBindingVerified: true,
    terminalEndpointSnapshotsMatched,
    overlappingHeldFileEpochEstablished: true,
    attemptMarkerHandleHeldAcrossIssuance: false,
    continuousMutationEpochVerified: false,
    samePermissionMutationExcluded: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null,
    releaseIdentity: receipt.releaseIdentity,
    capabilities: receipt.capabilities,
    provenance: receipt.provenance,
    authority: receipt.authority,
    callerSuppliedObservationAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    browserObjectIssuanceAuthenticityVerified: false,
    browserBinaryProvenanceVerified: false,
    browserTransportAuthenticityVerified: false,
    realBrowserExecutionVerified: false,
    attemptFreshnessExternallyVerified: false,
    bundleReplayResistanceVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    runId: receipt.runId,
    attemptId: receipt.attemptId,
    issuanceId: receipt.issuanceId,
    receiptDigest: receipt.receiptDigest,
    bundleId: transcriptResult.bundleId,
    bundleDigest: transcriptResult.bundleDigest,
    derivedEvidenceDigest: transcriptResult.derivedEvidenceDigest,
    tupleCount: receipt.tupleIssuances.length,
    verifierNetworkAttempted: false,
    verifierBrowserAttempted: false,
    verifierDeploymentAttempted: false,
    cliExitCode: 1
  });
}

export function buildSwAbRuntimeCollectorIssuanceFailure(error) {
  return immutableSwAbRuntimeCollectorIssuanceSnapshot({
    code: error instanceof SwAbRuntimeCollectorIssuanceError
      ? error.failureCode
      : "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_UNEXPECTED_FAILURE",
    trustClass: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
    status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
    executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
    ephemeralSelfSignatureChainVerified: false,
    collectorIssuanceProjectionVerified: false,
    phaseMajorIssuanceChainVerified: false,
    transcriptBundleBindingVerified: false,
    terminalEndpointSnapshotsMatched: false,
    overlappingHeldFileEpochEstablished: false,
    attemptMarkerHandleHeldAcrossIssuance: false,
    continuousMutationEpochVerified: false,
    samePermissionMutationExcluded: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null,
    releaseIdentity: {
      channel: "default-v13",
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    capabilities: {
      mutationEpochCapability: "absent_schema13",
      epoch: null
    },
    provenance: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE,
    authority: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY,
    callerSuppliedObservationAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    browserObjectIssuanceAuthenticityVerified: false,
    browserBinaryProvenanceVerified: false,
    browserTransportAuthenticityVerified: false,
    realBrowserExecutionVerified: false,
    attemptFreshnessExternallyVerified: false,
    bundleReplayResistanceVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    verifierNetworkAttempted: false,
    verifierBrowserAttempted: false,
    verifierDeploymentAttempted: false,
    cliExitCode: 1,
    error: error instanceof Error ? error.message : String(error)
  });
}

export const SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_FILES = Object.freeze([
  ...SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE
]);
