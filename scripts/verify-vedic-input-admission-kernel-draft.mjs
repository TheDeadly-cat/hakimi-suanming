import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseJavaScript } from "@babel/parser";

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const VEDIC_KERNEL_PACKAGE_NAME =
  "@hakimi/vedic-input-admission-kernel-draft";
export const VEDIC_KERNEL_PACKAGE_DIRECTORY =
  "packages/vedic-input-admission-kernel-draft";

const FROZEN_SCHEMA_PATH =
  "content/system-admission/vedic-input-admission-frozen-packet-receipt.v0.1.0.schema.json";
const REJECTION_SCHEMA_PATH =
  "content/system-admission/vedic-input-admission-transition-rejection-receipt.v0.1.0.schema.json";
const MANIFEST_SCHEMA_PATH =
  "content/system-admission/vedic-input-admission-pre-snapshot-evidence-manifest-candidate.v0.1.0.schema.json";
const UPSTREAM_REGISTRY_PATH = "scripts/system-contract-draft-registry.json";
const DOWNSTREAM_REGISTRY_PATH =
  "scripts/system-contract-downstream-draft-registry.json";
const ROOT_MANIFEST_PATH = "package.json";
const LOCK_PATH = "package-lock.json";
const RESTRICTED_WEB_PATH = "apps/web/src/lib/local-user-data-cleanup.ts";
const TRANSITION_REQUIREMENTS_PATH =
  "content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json";

const FORMAL_PARENT_PATHS = Object.freeze([
  "content/system-admission/four-system-admission.v1.json",
  "content/system-admission/vedic-input-admission-readiness-candidate.v0.1.0.json",
  TRANSITION_REQUIREMENTS_PATH
]);

const PACKAGE_FILE_SET = Object.freeze([
  "README.md",
  "package.json",
  "src/evaluator.test.ts",
  "src/evaluator.ts",
  "src/frozen-packet-schema.ts",
  "src/protocol.ts",
  "tsconfig.json",
  "vitest.config.ts"
]);

const FIXED_RAW_IDENTITIES = Object.freeze({
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/README.md`]: Object.freeze({
    bytes: 5_307,
    sha256: "590467f1c0de277476dbad5cb15b1b59fc4cab277ed93b13e9349b88fb7c61f0"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/package.json`]: Object.freeze({
    bytes: 358,
    sha256: "161ef453575192dcc89e7ad095a67001653628dbfad49e4b0706247afee313f2"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/protocol.ts`]: Object.freeze({
    bytes: 17_437,
    sha256: "ba7a9d79ccffd89b580dc9535f347d6febee3625c9007bb7bd2c7a391a6df6c3"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/frozen-packet-schema.ts`]: Object.freeze({
    bytes: 22_122,
    sha256: "8d1c75a1ba54689653d6b13f25bf7badae7ce8cadbbf7d5336de25b6a38390b3"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/evaluator.ts`]: Object.freeze({
    bytes: 27_542,
    sha256: "7d0660f4c6823bea25e18c343aa86c610b76dfc0e83de33081dc79cc1381bd98"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/evaluator.test.ts`]: Object.freeze({
    bytes: 33_697,
    sha256: "05f67634afa59e2a05f8432ae111babcd53f87c80802878fde3379e2082327e6"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/tsconfig.json`]: Object.freeze({
    bytes: 209,
    sha256: "a6e1cd9ecab965e460aa18d009723c8b961c6768af50f169dc663cd80ebe998a"
  }),
  [`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/vitest.config.ts`]: Object.freeze({
    bytes: 314,
    sha256: "ea0654c3137fa6ff32f2d6808948a37102ddf48c9dc60227bad0962e071f2397"
  }),
  [FROZEN_SCHEMA_PATH]: Object.freeze({
    bytes: 17_286,
    sha256: "4332c97d303d6a38851e16a8522abd5ba7b16b0f76f7c6c0685823b7f6e00f0a"
  }),
  [REJECTION_SCHEMA_PATH]: Object.freeze({
    bytes: 16_676,
    sha256: "4c05931f4fcfd4de2ff899ecbd4b050288303935975482437c953d09414a9ba6"
  }),
  [MANIFEST_SCHEMA_PATH]: Object.freeze({
    bytes: 6_706,
    sha256: "16056568cd59296a8b7b45c7bf0ae98781f6559b034798d7cb54713aa6a325ed"
  }),
  [UPSTREAM_REGISTRY_PATH]: Object.freeze({
    bytes: 13_698,
    sha256: "9892ee572e967cff4c6a8a509560691cb2f34fe6049f8257cf4b6feda6f6c8d7"
  }),
  [DOWNSTREAM_REGISTRY_PATH]: Object.freeze({
    bytes: 1_808,
    sha256: "c17503797376c5800364f8976b8c11e5b42479a637206de8b09ae77374f1cc59"
  })
});

const REQUIREMENT_IDS = Object.freeze([
  "civil_calendar_and_date",
  "local_wall_time_and_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "place_coordinates_and_precision",
  "iana_time_zone_and_tzdb_identity",
  "dst_gap_overlap_resolution",
  "utc_conversion_and_time_scale",
  "ephemeris_identity_version_and_coverage",
  "sidereal_zodiac_declaration",
  "ayanamsa_identity_and_version",
  "rahu_ketu_mode",
  "bhava_house_definition",
  "birth_time_perturbation_candidates_and_transition_points"
]);

const INVARIANT_IDS = Object.freeze([
  "civil_date_validity",
  "calendar_identity_version",
  "canonical_wall_time",
  "precision_vocabulary",
  "uncertainty_representation",
  "interval_ordering",
  "candidate_semantics",
  "coordinate_reference_system",
  "coordinate_precision_semantics",
  "location_privacy_boundary",
  "iana_zone_identity",
  "tzdb_version_identity",
  "coverage_update_policy",
  "dst_gap_overlap_classification",
  "dst_resolution_policy",
  "utc_conversion_consistency",
  "time_scale_identity",
  "ephemeris_identity_version_digest",
  "ephemeris_coverage",
  "sidereal_zodiac_identity_version",
  "ayanamsa_identity_version",
  "node_mode_definition_version",
  "bhava_definition_version",
  "perturbation_candidate_semantics",
  "transition_ordering",
  "perturbation_policy_identity"
]);

const CONDITION_IDS = Object.freeze([
  "all_thirteen_owner_selections_and_scope_decisions_accepted",
  "all_thirteen_source_or_first_party_provenance_bindings_frozen_verified",
  "all_thirteen_work_version_carrier_rights_and_distribution_dispositions_complete",
  "two_independent_domain_opinions_cover_same_frozen_thirteen_requirement_packet",
  "two_independent_source_rights_reviews_and_legal_authority_disposition_complete",
  "schema_specific_structural_and_semantic_validator_receipts_complete",
  "mutation_epoch_atomic_snapshot_aba_and_private_input_lifecycle_receipts_complete",
  "owner_supersession_formal_parent_and_central_registry_projection_complete"
]);

const REVIEW_DIGEST_FIELDS = Object.freeze([
  "selectedValueSetDigest",
  "targetUseProfileDigest",
  "questionSetDigest",
  "sourceBindingManifestDigest",
  "threeLayerRightsEvidenceManifestDigest",
  "validatorProfileSetDigest",
  "privateLifecyclePolicyDigest",
  "distributionOperationSetDigest",
  "targetJurisdictionSetDigest",
  "reviewInstructionAndDisagreementPolicyDigest"
]);

const DECLARED_TRANSITION_IDS = Object.freeze([
  "freeze_packet",
  "seal_pre_snapshot_evidence_manifest",
  "verify_conditions_1_to_7",
  "verify_supersession_projection",
  "invalidate"
]);
const STATE_IDS = Object.freeze([
  "uninstantiated",
  "packet_frozen_receipts_incomplete",
  "pre_snapshot_evidence_manifest_complete_unverified",
  "conditions_1_to_7_verified_supersession_pending",
  "all_eight_conditions_mechanically_verified_input_gate_candidate",
  "invalidated_new_packet_and_epoch_required"
]);
const UNIMPLEMENTED_DECLARED_TRANSITION_IDS = Object.freeze(
  DECLARED_TRANSITION_IDS.filter((transitionId) =>
    !["freeze_packet", "seal_pre_snapshot_evidence_manifest"].includes(transitionId))
);
const REJECTION_CODES = Object.freeze([
  "EPOCH_OVERFLOW",
  "FROM_STATE_MISMATCH",
  "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED",
  "REPLAY_OR_IDEMPOTENCY_CONFLICT",
  "TRANSITION_NOT_IMPLEMENTED",
  "UNKNOWN_TRANSITION"
]);

const PRE_SNAPSHOT_MANIFEST_GUARD_IDS = Object.freeze([
  "same_cycle_and_packet_for_every_receipt",
  "pre_snapshot_evidence_manifest_closed",
  "manifest_layer_exact_set_coverage",
  "no_active_correction_withdrawal_or_revocation"
]);

const PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS = Object.freeze([
  "frozen_packet_receipt",
  "owner_selection_receipt",
  "source_or_first_party_binding_receipt",
  "three_layer_rights_evidence_receipt",
  "vedic_domain_expert_opinion_binding_receipt",
  "domain_disagreement_inventory_receipt",
  "source_rights_review_receipt",
  "legal_authority_disposition_receipt",
  "structural_validator_receipt",
  "semantic_validator_receipt",
  "private_lifecycle_public_non_person_attestation_receipt"
]);

const PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS = Object.freeze([
  "admission_epoch_snapshot_receipt",
  "conditions_one_to_seven_evaluation_receipt",
  "supersession_intent_receipt",
  "supersession_commit_receipt",
  "final_readiness_evaluation_receipt"
]);

const PRE_SNAPSHOT_DEFINED_CARDINALITIES = Object.freeze({
  domain_disagreement_inventory_receipt: 1,
  frozen_packet_receipt: 1,
  owner_selection_receipt: 13,
  private_lifecycle_public_non_person_attestation_receipt: 1,
  semantic_validator_receipt: 1,
  source_or_first_party_binding_receipt: 13,
  source_rights_review_receipt: 2,
  structural_validator_receipt: 1,
  three_layer_rights_evidence_receipt: 13,
  vedic_domain_expert_opinion_binding_receipt: 2
});

const REJECTION_GUARD_IDS = Object.freeze([
  "after_epoch_must_equal_before_plus_one",
  "from_state_packet_frozen_receipts_incomplete",
  "from_state_uninstantiated",
  "idempotency_key_not_previously_observed",
  "manifest_layer_exact_set_coverage",
  "no_active_correction_withdrawal_or_revocation",
  "operation_id_not_previously_observed",
  "operation_nonce_not_previously_consumed",
  "pre_snapshot_evidence_manifest_closed",
  "same_cycle_and_packet_for_every_receipt",
  "transition_not_implemented",
  "unknown_transition"
]);

const REJECTION_PACKET_IDENTITY_FIELDS = Object.freeze([
  "admissionCycleId",
  "packetDigest",
  "packetDigestDomain",
  "packetId",
  "packetManifestDigest",
  "packetSchemaVersion"
]);

const FROZEN_ROOT_FIELDS = Object.freeze([
  "acceptedReceipt", "afterEpoch", "authorityBoundary", "authorityEffect", "beforeEpoch",
  "candidateReceipt", "commitObserved", "fromState", "generationScopedOperationNonce",
  "idempotencyKey", "ledgerGenerationId", "mutationEpochRuntimeEstablished",
  "nextChainHeadDigest", "nextConsumedNonceSetHeadDigest", "nextRevocationLedgerHeadDigest",
  "nextStateDigest", "operationId", "outcome", "packet", "previousChainHeadDigest",
  "previousConsumedNonceSetHeadDigest", "previousRevocationLedgerHeadDigest",
  "previousStateDigest", "toState", "transitionId"
]);

const FROZEN_CANDIDATE_RECEIPT_FIELDS = Object.freeze([
  "acceptedReceipt", "authorityEffect", "candidateOnly", "commitObserved",
  "mutationEpochRuntimeEstablished", "packetDigest", "packetId", "packetManifestDigest",
  "receiptDigest", "receiptId", "receiptKind", "receiptSchemaVersion", "receiptStatus"
]);

const FROZEN_GOVERNANCE_PACKET_FIELDS = Object.freeze([
  "admissionCycleId", "authorityBoundary", "canonicalizationProfile", "conditionIds",
  "conditionSetDigest", "digestAlgorithm", "distributionOperationSetDigest", "invariantIds",
  "invariantSetDigest", "packetDigest", "packetDigestDomain", "packetId",
  "packetManifestDigest", "packetSchemaVersion", "packetScope", "privacyProjectionDigest",
  "privateLifecyclePolicyDigest", "questionSetDigest", "requirementIds", "requirementSetDigest",
  "reviewContentManifestDigest", "reviewInstructionAndDisagreementPolicyDigest",
  "selectedValueSetDigest", "sourceBindingManifestDigest", "systemIdentity",
  "targetJurisdictionSetDigest", "targetUseProfileDigest", "threeLayerRightsEvidenceManifestDigest",
  "transitionContractDigest", "upstreamReadinessCandidateDigest", "validatorProfileSetDigest"
]);

const FROZEN_PACKET_AUTHORITY_FIELDS = Object.freeze([
  "authorityEffect", "candidateInstanceCount", "digestSemanticOriginVerified",
  "freeTextFieldCount", "governancePolicyOnly", "personalDataFieldCount",
  "personDerivedDigestFieldCount", "privacySourceProvenanceEstablished"
]);

const REJECTION_ROOT_FIELDS = Object.freeze([
  "acceptedReceipt", "admissionCycleId", "afterEpoch", "attemptedTransitionId",
  "authorityBoundary", "authorityEffect", "beforeEpoch", "commitObserved", "failedGuardIds",
  "generationScopedOperationNonce", "idempotencyKey", "ledgerGenerationId",
  "mutationEpochRuntimeEstablished", "nextChainHeadDigest", "nextConsumedNonceSetHeadDigest",
  "nextRevocationLedgerHeadDigest", "nextStateDigest", "nonceConsumed", "operationId",
  "outcome", "packetDigest", "packetDigestDomain", "packetId", "packetManifestDigest",
  "packetSchemaVersion", "previousChainHeadDigest", "previousConsumedNonceSetHeadDigest",
  "previousRevocationLedgerHeadDigest", "previousStateDigest", "receiptDigest", "receiptKind",
  "receiptSchemaVersion", "receiptStatus", "rejectionCode", "stateAfter", "stateBefore"
]);

const MANIFEST_ROOT_FIELDS = Object.freeze([
  "admissionCycleId", "declaredManifestDigestDomain", "manifestId", "packetDigest",
  "packetDigestDomain", "packetId", "packetManifestDigest", "receiptReferences",
  "revocationObservation", "schemaVersion"
]);

const MANIFEST_RECEIPT_REFERENCE_FIELDS = Object.freeze([
  "admissionCycleId", "packetDigest", "packetDigestDomain", "packetId",
  "packetManifestDigest", "receiptDigest", "receiptId", "receiptKind"
]);

const MANIFEST_REVOCATION_OBSERVATION_FIELDS = Object.freeze([
  "activeCorrectionReceiptIds", "activeRevocationReceiptIds",
  "activeWithdrawalReceiptIds", "revocationLedgerHeadDigest"
]);

const FROZEN_SCHEMA_KEYWORDS = Object.freeze([
  "$id", "$schema", "title", "description", "type", "additionalProperties",
  "required", "properties", "$defs", "x-hakimiBoundary",
  "x-hakimiReviewContentDigestFields", "x-hakimiEvaluatorInvariants"
]);
const REJECTION_SCHEMA_KEYWORDS = Object.freeze([
  "$id", "$schema", "title", "description", "type", "additionalProperties",
  "required", "properties", "allOf", "$defs", "x-hakimiSchemaRevision",
  "x-hakimiBoundary", "x-hakimiOperationBinding", "x-hakimiEvaluatorInvariants"
]);
const MANIFEST_SCHEMA_KEYWORDS = Object.freeze([
  "$schema", "$id", "title", "description", "type", "additionalProperties",
  "required", "properties", "$defs", "x-hakimiManifestContractProjection",
  "x-hakimiBoundary"
]);

const SCHEMA_SEMANTIC_IDENTITIES = Object.freeze({
  frozen: "0d73e070ab5c220316af69633ae8a8c030d786b820782631cca5989f8e16fead",
  manifest: "92c430edd3916dab6d99e568f9e4330752a3a0369761394c0ffe8671b5b94ba5",
  rejection: "0cd131586e56e8f83689f55e1a22af42b6750ca853d0489b5d3822ea749ad065"
});

const LOCAL_DRAFT_IDENTITY_TOKENS = Object.freeze([
  VEDIC_KERNEL_PACKAGE_NAME,
  "packages/vedic-input-admission-kernel-draft",
  "vedic-input-admission-kernel-draft",
  "hakimi.vedic-frozen-packet-transition-candidate/0.1-draft",
  "hakimi.vedic-pre-snapshot-evidence-manifest-candidate/0.1-draft",
  "hakimi.vedic-transition-rejection-receipt/0.1-draft",
  "hakimi.vedic-transition-rejection-receipt/0.1-draft.2",
  "urn:hakimi:vedic:input-admission:frozen-packet-transition-candidate:0.1.0",
  "urn:hakimi:vedic:input-admission:pre-snapshot-evidence-manifest-candidate:0.1.0",
  "urn:hakimi:vedic:input-admission:transition-rejection-receipt:0.1.0",
  "urn:hakimi:vedic:input-admission:transition-rejection-receipt:0.1-draft.2",
  FROZEN_SCHEMA_PATH,
  REJECTION_SCHEMA_PATH,
  MANIFEST_SCHEMA_PATH,
  "vedic-input-admission-frozen-packet-receipt.v0.1.0.schema.json",
  "vedic-input-admission-transition-rejection-receipt.v0.1.0.schema.json",
  "vedic-input-admission-pre-snapshot-evidence-manifest-candidate.v0.1.0.schema.json",
  "hakimi/vedic-input-admission-kernel-draft/pre-snapshot-evidence-manifest-candidate/v0.1",
  "evaluateVedicInputAdmissionTransition",
  "inspectVedicPreSnapshotEvidenceManifestCandidate"
]);

const EXPECTED_UPSTREAM_ZERO_INSTANCE_STATE = Object.freeze({
  stateInstances: [],
  transitionInstances: [],
  frozenPacketInstances: [],
  admissionCycleInstances: [],
  ledgerGenerationInstances: [],
  admissionEpochInstances: [],
  evaluationSnapshotInstances: [],
  preSnapshotEvidenceManifestInstances: [],
  conditionsOneToSevenEvaluationInputManifestInstances: [],
  finalReadinessEvaluationInputManifestInstances: [],
  receiptInstances: [],
  actorInstances: [],
  seatInstances: [],
  acceptedReceipts: 0,
  operationNoncesConsumed: 0,
  privateLifecyclePublicAttestationReceipts: 0,
  evaluationReceipts: 0,
  supersessionReceipts: 0,
  transitionEvaluatorImplemented: false,
  executableReceiptSchemasImplemented: false,
  runtimeReceiptEvidenceEstablished: false,
  mutationEpochAvailable: false,
  crossFileAtomicSnapshot: false,
  intervalMutationExcluded: false,
  abaExcluded: false,
  inputContractGateSatisfied: false,
  formalAdmissionAuthorized: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  rightsLegalConclusionEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false
});

const AUTHORITY_FALSE_KEYS = Object.freeze([
  "contentTruthEstablished",
  "domainAuthorityAuthorized",
  "expertClaimsAuthorized",
  "expertTruthEstablished",
  "formalAdmissionAuthorized",
  "highRiskClaimsAuthorized",
  "inputContractGateSatisfied",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "releaseEvidenceComplete",
  "releaseReady",
  "rightsLegalConclusionEstablished"
]);

const UPSTREAM_READINESS_DIGEST =
  "688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb";
const TRANSITION_CONTRACT_DIGEST =
  "548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac";

const EXPECTED_PACKAGE_MANIFEST = Object.freeze({
  name: VEDIC_KERNEL_PACKAGE_NAME,
  version: "0.0.0-draft.0",
  private: true,
  type: "module",
  exports: {},
  "x-hakimi-isolated-draft": {
    schemaVersion: 1,
    kind: "contract",
    systemId: "vedic-astrology",
    productionImport: "forbidden",
    allowedDraftDependencies: []
  },
  dependencies: {}
});

const EXPECTED_REGISTRY_ENTRY = Object.freeze({
  directoryName: "vedic-input-admission-kernel-draft",
  packageName: VEDIC_KERNEL_PACKAGE_NAME,
  presence: "when-present",
  kind: "contract",
  systemId: "vedic-astrology",
  dependencies: {},
  allowedBareImports: ["node:crypto"],
  crossDraftEdges: [],
  specialChecks: [],
  lockClosures: []
});

const EXPECTED_MUTATION_EXPERIMENT_REGISTRY_ENTRY = Object.freeze({
  directoryName: "vedic-mutation-epoch-runtime-experiment-draft",
  packageName: "@hakimi/vedic-mutation-epoch-runtime-experiment-draft",
  presence: "when-present",
  kind: "workspace",
  systemId: "vedic-astrology",
  dependencies: {},
  allowedBareImports: [],
  crossDraftEdges: [],
  specialChecks: ["fake-indexeddb-test-only-v1"],
  lockClosures: []
});

const EXPECTED_WESTERN_CIVIL_TIME_REGISTRY_ENTRY = Object.freeze({
  directoryName: "western-civil-time-input-adapter-draft",
  packageName: "@hakimi/western-civil-time-input-adapter-draft",
  presence: "when-present",
  kind: "adapter",
  systemId: "western-astrology",
  dependencies: {
    "@hakimi/tzdb-core": "0.1.0",
    "@hakimi/western-astrology-contracts-draft": "0.0.0-draft.0"
  },
  allowedBareImports: [
    "@hakimi/tzdb-core",
    "node:crypto",
    "node:fs",
    "node:path"
  ],
  crossDraftEdges: [
    {
      from: "src/index.ts",
      toPackage: "@hakimi/western-astrology-contracts-draft",
      to: "src/index.ts"
    }
  ],
  specialChecks: [],
  lockClosures: []
});

const EXPECTED_DOWNSTREAM_REGISTRY = Object.freeze({
  schemaVersion: 1,
  registryClass: "downstream-isolated-drafts-not-bound-into-upstream-readiness",
  upstreamRegistryPath: UPSTREAM_REGISTRY_PATH,
  drafts: [
    EXPECTED_REGISTRY_ENTRY,
    EXPECTED_MUTATION_EXPERIMENT_REGISTRY_ENTRY,
    EXPECTED_WESTERN_CIVIL_TIME_REGISTRY_ENTRY
  ]
});

const EXPECTED_ROOT_SCRIPTS = Object.freeze({
  "check:vedic-input-admission-kernel-draft":
    "node scripts/verify-vedic-input-admission-kernel-draft.mjs",
  "test:vedic-input-admission-kernel-draft":
    "vitest run --config packages/vedic-input-admission-kernel-draft/vitest.config.ts && node --test scripts/verify-vedic-input-admission-kernel-draft.test.mjs",
  "typecheck:vedic-input-admission-kernel-draft":
    "tsc --noEmit -p packages/vedic-input-admission-kernel-draft/tsconfig.json"
});

const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".html", ".js", ".json", ".jsx", ".mjs", ".scss", ".ts", ".tsx"
]);
const SCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const IGNORED_TREE_DIRECTORIES = new Set([
  ".git", ".vite", "coverage", "dist", "node_modules", "playwright-report", "test-results"
]);
const FATAL_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export class VedicInputAdmissionKernelDraftVerificationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicInputAdmissionKernelDraftVerificationError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicInputAdmissionKernelDraftVerificationError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function normalizeRelative(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function resolveWorkspacePath(root, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0
    || relativePath.includes("\\") || relativePath.includes("\0")
    || path.posix.isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("UNSAFE_PATH", "Verifier path is not a fixed safe workspace-relative path.");
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...relativePath.split("/"));
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail("UNSAFE_PATH", "Verifier path escapes the workspace root.");
  }
  return resolved;
}

async function readRegularFile(root, relativePath, maximumBytes = 2 * 1024 * 1024) {
  const absolutePath = resolveWorkspacePath(root, relativePath);
  let stat;
  try {
    stat = await lstat(absolutePath);
  } catch (cause) {
    fail("ARTIFACT_MISSING", `Required artifact is missing: ${relativePath}`, cause);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1
    || stat.size <= 0 || stat.size > maximumBytes) {
    fail("ARTIFACT_ENDPOINT_INVALID", `Required artifact endpoint is invalid: ${relativePath}`);
  }
  let bytes;
  try {
    bytes = await readFile(absolutePath);
  } catch (cause) {
    fail("ARTIFACT_READ_FAILED", `Required artifact could not be read: ${relativePath}`, cause);
  }
  if (bytes.byteLength !== stat.size) {
    fail("ARTIFACT_POINT_READ_DRIFT", `Artifact changed during its point read: ${relativePath}`);
  }
  return bytes;
}

function decodeUtf8(bytes, relativePath, { allowBom = false } = {}) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    if (!allowBom) fail("UTF8_BOM_FORBIDDEN", `UTF-8 BOM is forbidden: ${relativePath}`);
  }
  try {
    return FATAL_UTF8_DECODER.decode(bytes);
  } catch (cause) {
    fail("UTF8_INVALID", `Artifact is not fatal UTF-8: ${relativePath}`, cause);
  }
}

function parseJson(bytes, relativePath) {
  try {
    return JSON.parse(decodeUtf8(bytes, relativePath));
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionKernelDraftVerificationError) throw cause;
    fail("JSON_INVALID", `Artifact is not valid JSON: ${relativePath}`, cause);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertDeepEqual(actual, expected, code, label) {
  if (!isDeepStrictEqual(actual, expected)) fail(code, `${label} drifted from its exact contract.`);
}

function assertExactKeys(value, expectedKeys, code, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code, `${label} is not an object.`);
  }
  assertDeepEqual(Object.keys(value), expectedKeys, code, `${label} keyword set`);
}

function assertExactClosedSchemaObject(node, expectedFields, code, label) {
  if (node?.type !== "object" || node?.additionalProperties !== false) {
    fail(code, `${label} is not an exact closed object schema.`);
  }
  assertDeepEqual(node.required, expectedFields, code, `${label} required fields`);
  assertDeepEqual(Object.keys(node.properties ?? {}), expectedFields, code, `${label} properties`);
}

function assertSchemaSemanticIdentity(schema, expectedDigest, label) {
  const digest = sha256(Buffer.from(JSON.stringify(schema), "utf8"));
  if (digest !== expectedDigest) {
    fail("SCHEMA_SEMANTIC_IDENTITY_DRIFT", `${label} parsed semantic identity drifted.`);
  }
}

function decodeAsciiSourceEscapes(source) {
  const decode = (digits) => {
    const codePoint = Number.parseInt(digits, 16);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x7f
      ? String.fromCodePoint(codePoint)
      : "_";
  };
  return source
    .replace(/\\u\{([0-9a-f]{1,6})\}/giu, (_match, digits) => decode(digits))
    .replace(/\\u([0-9a-f]{4})/giu, (_match, digits) => decode(digits))
    .replace(/\\x([0-9a-f]{2})/giu, (_match, digits) => decode(digits));
}

function canonicalizeSourceForLeakageScan(source) {
  return decodeAsciiSourceEscapes(source).replaceAll("\\", "/").toLowerCase();
}

function containsLocalDraftIdentity(value) {
  const canonicalValue = canonicalizeSourceForLeakageScan(value);
  return LOCAL_DRAFT_IDENTITY_TOKENS.some((token) =>
    canonicalValue.includes(canonicalizeSourceForLeakageScan(token))
  );
}

function visitSyntaxNodes(value, visitor) {
  if (Array.isArray(value)) {
    for (const entry of value) visitSyntaxNodes(entry, visitor);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (typeof value.type === "string") visitor(value);
  for (const [key, child] of Object.entries(value)) {
    if (["comments", "errors", "extra", "loc", "tokens"].includes(key)) continue;
    visitSyntaxNodes(child, visitor);
  }
}

function evaluateStaticStringArray(node, bindings, seenBindings = new Set()) {
  if (node === null || typeof node !== "object") return undefined;
  if (node.type === "ArrayExpression") {
    const output = [];
    for (const element of node.elements) {
      if (!element || element.type === "SpreadElement") return undefined;
      const value = evaluateStaticString(element, bindings, seenBindings);
      if (value === undefined) return undefined;
      output.push(value);
    }
    return output;
  }
  if ([
    "ParenthesizedExpression",
    "TSAsExpression",
    "TSNonNullExpression",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
    "TypeCastExpression"
  ].includes(node.type)) {
    return evaluateStaticStringArray(node.expression, bindings, seenBindings);
  }
  if (node.type === "Identifier" && bindings.has(node.name)
    && !seenBindings.has(node.name)) {
    const nextSeen = new Set(seenBindings);
    nextSeen.add(node.name);
    return evaluateStaticStringArray(bindings.get(node.name), bindings, nextSeen);
  }
  return undefined;
}

function evaluateStaticString(node, bindings, seenBindings = new Set()) {
  if (node === null || typeof node !== "object") return undefined;
  if (node.type === "StringLiteral" || node.type === "DirectiveLiteral") {
    return typeof node.value === "string" ? node.value : undefined;
  }
  if (node.type === "TemplateLiteral") {
    let output = "";
    for (let index = 0; index < node.quasis.length; index += 1) {
      output += node.quasis[index]?.value?.cooked ?? node.quasis[index]?.value?.raw ?? "";
      if (index < node.expressions.length) {
        const expression = evaluateStaticString(
          node.expressions[index],
          bindings,
          seenBindings
        );
        if (expression === undefined) return undefined;
        output += expression;
      }
    }
    return output;
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = evaluateStaticString(node.left, bindings, seenBindings);
    const right = evaluateStaticString(node.right, bindings, seenBindings);
    return left === undefined || right === undefined ? undefined : left + right;
  }
  if (node.type === "CallExpression" && node.callee?.type === "MemberExpression"
    && node.callee.computed === false && node.callee.property?.type === "Identifier") {
    if (node.callee.property.name === "join" && node.arguments.length <= 1) {
      const values = evaluateStaticStringArray(node.callee.object, bindings, seenBindings);
      const separator = node.arguments.length === 0
        ? ","
        : evaluateStaticString(node.arguments[0], bindings, seenBindings);
      return values === undefined || separator === undefined
        ? undefined
        : values.join(separator);
    }
    if (node.callee.property.name === "concat") {
      const receiver = evaluateStaticString(node.callee.object, bindings, seenBindings);
      if (receiver === undefined) return undefined;
      let output = receiver;
      for (const argument of node.arguments) {
        if (argument?.type === "SpreadElement") return undefined;
        const value = evaluateStaticString(argument, bindings, seenBindings);
        if (value === undefined) return undefined;
        output += value;
      }
      return output;
    }
  }
  if ([
    "ParenthesizedExpression",
    "TSAsExpression",
    "TSNonNullExpression",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
    "TypeCastExpression"
  ].includes(node.type)) {
    return evaluateStaticString(node.expression, bindings, seenBindings);
  }
  if (node.type === "ConditionalExpression") {
    const consequent = evaluateStaticString(node.consequent, bindings, seenBindings);
    const alternate = evaluateStaticString(node.alternate, bindings, seenBindings);
    return consequent !== undefined && consequent === alternate ? consequent : undefined;
  }
  if (node.type === "Identifier" && bindings.has(node.name)
    && !seenBindings.has(node.name)) {
    const nextSeen = new Set(seenBindings);
    nextSeen.add(node.name);
    return evaluateStaticString(bindings.get(node.name), bindings, nextSeen);
  }
  return undefined;
}

function assertNoStaticLocalDraftReference(source, relativePath) {
  let tree;
  try {
    tree = parseJavaScript(source, {
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      plugins: ["decorators-legacy", "explicitResourceManagement", "importAttributes", "jsx", "typescript"],
      sourceFilename: relativePath,
      sourceType: "unambiguous"
    });
  } catch (cause) {
    fail(
      "PRODUCTION_SCAN_PARSE_FAILED",
      `Inspectable Web script could not be parsed fail-closed: ${relativePath}`,
      cause
    );
  }
  const bindings = new Map();
  visitSyntaxNodes(tree, (node) => {
    if (node.type !== "VariableDeclaration" || node.kind !== "const") return;
    for (const declaration of node.declarations ?? []) {
      if (declaration?.id?.type === "Identifier" && declaration.init) {
        bindings.set(declaration.id.name, declaration.init);
      }
    }
  });
  let leaked = false;
  visitSyntaxNodes(tree, (node) => {
    if (leaked) return;
    const value = evaluateStaticString(node, bindings);
    if (value !== undefined && containsLocalDraftIdentity(value)) leaked = true;
  });
  if (leaked) {
    fail(
      "PRODUCTION_IMPORT_LEAKAGE",
      `Isolated Vedic kernel identity is statically reachable from apps/web: ${relativePath}`
    );
  }
}

function assertFixedIdentity(relativePath, bytes) {
  const expected = FIXED_RAW_IDENTITIES[relativePath];
  if (!expected || bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) {
    fail("RAW_IDENTITY_MISMATCH", `Fixed raw identity mismatch: ${relativePath}`);
  }
}

function extractConstStringArray(source, identifier) {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = source.match(new RegExp(
    `export const ${escaped} = Object\\.freeze\\(\\[([\\s\\S]*?)\\] as const\\);`,
    "u"
  ));
  if (!match) fail("SOURCE_SEMANTICS_MISMATCH", `Missing fixed source array: ${identifier}`);
  const values = [...match[1].matchAll(/"([^"\\]*)"/gu)].map((entry) => entry[1]);
  const residue = match[1].replace(/"[^"\\]*"\s*,?/gu, "").trim();
  if (residue !== "") fail("SOURCE_SEMANTICS_MISMATCH", `Non-literal source array: ${identifier}`);
  return values;
}

function requireSourceFragment(source, fragment, label) {
  if (!source.includes(fragment)) fail("SOURCE_SEMANTICS_MISMATCH", `Missing source boundary: ${label}`);
}

function assertClosedObjectSchemas(value, location = "schema") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertClosedObjectSchemas(entry, `${location}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (value.type === "object" && value.additionalProperties !== false) {
    fail("SCHEMA_OPEN_OBJECT", `JSON Schema object is not closed: ${location}`);
  }
  for (const [key, child] of Object.entries(value)) {
    assertClosedObjectSchemas(child, `${location}.${key}`);
  }
}

function assertNoTargetReceiptProperty(value, location = "schema") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoTargetReceiptProperty(entry, `${location}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (value.properties && Object.hasOwn(value.properties, "targetReceiptId")) {
    fail("TARGET_RECEIPT_ID_FORBIDDEN", `targetReceiptId property is forbidden: ${location}`);
  }
  if (Array.isArray(value.required) && value.required.includes("targetReceiptId")) {
    fail("TARGET_RECEIPT_ID_FORBIDDEN", `targetReceiptId requirement is forbidden: ${location}`);
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoTargetReceiptProperty(child, `${location}.${key}`);
  }
}

function assertAuthorityDefinition(schema, label) {
  const definition = schema?.$defs?.authorityBoundary;
  assertExactKeys(
    definition,
    ["type", "additionalProperties", "required", "properties"],
    "SCHEMA_AUTHORITY_DRIFT",
    `${label} authority definition`
  );
  assertExactClosedSchemaObject(
    definition,
    AUTHORITY_FALSE_KEYS,
    "SCHEMA_AUTHORITY_DRIFT",
    `${label} authority definition`
  );
  for (const key of AUTHORITY_FALSE_KEYS) {
    if (!isDeepStrictEqual(definition.properties[key], { const: false })) {
      fail("SCHEMA_AUTHORITY_DRIFT", `${label} authority field is not const false: ${key}`);
    }
  }
}

function assertBoundaryFalse(boundary, keys, label) {
  for (const key of keys) {
    if (boundary?.[key] !== false) fail("SCHEMA_BOUNDARY_DRIFT", `${label} is not false: ${key}`);
  }
}

function verifySchemas(frozenSchema, rejectionSchema, manifestSchema) {
  assertExactKeys(
    frozenSchema,
    FROZEN_SCHEMA_KEYWORDS,
    "SCHEMA_KEYWORD_DRIFT",
    "frozen schema root"
  );
  assertExactKeys(
    rejectionSchema,
    REJECTION_SCHEMA_KEYWORDS,
    "SCHEMA_KEYWORD_DRIFT",
    "rejection schema root"
  );
  assertExactKeys(
    manifestSchema,
    MANIFEST_SCHEMA_KEYWORDS,
    "SCHEMA_KEYWORD_DRIFT",
    "manifest schema root"
  );
  assertExactClosedSchemaObject(
    frozenSchema,
    FROZEN_ROOT_FIELDS,
    "FROZEN_ROOT_SHAPE_DRIFT",
    "frozen schema root"
  );
  assertExactClosedSchemaObject(
    rejectionSchema,
    REJECTION_ROOT_FIELDS,
    "REJECTION_ROOT_SHAPE_DRIFT",
    "rejection schema root"
  );
  assertExactClosedSchemaObject(
    manifestSchema,
    MANIFEST_ROOT_FIELDS,
    "MANIFEST_ROOT_SHAPE_DRIFT",
    "manifest schema root"
  );
  assertDeepEqual(
    Object.keys(frozenSchema.$defs ?? {}),
    ["sha256", "authorityBoundary", "packetAuthorityBoundary", "systemIdentity", "candidateReceipt", "governancePacket"],
    "FROZEN_DEFINITION_SHAPE_DRIFT",
    "frozen schema definition set"
  );
  assertDeepEqual(
    Object.keys(rejectionSchema.$defs ?? {}),
    ["sha256", "mutationEpoch", "stateId", "authorityBoundary"],
    "REJECTION_DEFINITION_SHAPE_DRIFT",
    "rejection schema definition set"
  );
  assertDeepEqual(
    Object.keys(manifestSchema.$defs ?? {}),
    ["receiptId", "receiptReference", "revocationObservation", "sha256"],
    "MANIFEST_DEFINITION_SHAPE_DRIFT",
    "manifest schema definition set"
  );
  assertExactClosedSchemaObject(
    frozenSchema.$defs?.candidateReceipt,
    FROZEN_CANDIDATE_RECEIPT_FIELDS,
    "FROZEN_CANDIDATE_SHAPE_DRIFT",
    "frozen candidate receipt"
  );
  assertExactClosedSchemaObject(
    frozenSchema.$defs?.governancePacket,
    FROZEN_GOVERNANCE_PACKET_FIELDS,
    "FROZEN_PACKET_SHAPE_DRIFT",
    "frozen governance packet"
  );
  assertExactClosedSchemaObject(
    frozenSchema.$defs?.packetAuthorityBoundary,
    FROZEN_PACKET_AUTHORITY_FIELDS,
    "FROZEN_PACKET_AUTHORITY_SHAPE_DRIFT",
    "frozen packet authority boundary"
  );
  assertExactClosedSchemaObject(
    manifestSchema.$defs?.receiptReference,
    MANIFEST_RECEIPT_REFERENCE_FIELDS,
    "MANIFEST_RECEIPT_REFERENCE_SHAPE_DRIFT",
    "manifest receipt reference"
  );
  assertExactClosedSchemaObject(
    manifestSchema.$defs?.revocationObservation,
    MANIFEST_REVOCATION_OBSERVATION_FIELDS,
    "MANIFEST_REVOCATION_SHAPE_DRIFT",
    "manifest revocation observation"
  );
  assertClosedObjectSchemas(frozenSchema, "frozenSchema");
  assertClosedObjectSchemas(rejectionSchema, "rejectionSchema");
  assertClosedObjectSchemas(manifestSchema, "manifestSchema");
  assertNoTargetReceiptProperty(frozenSchema, "frozenSchema");
  assertNoTargetReceiptProperty(rejectionSchema, "rejectionSchema");
  assertNoTargetReceiptProperty(manifestSchema, "manifestSchema");
  assertAuthorityDefinition(frozenSchema, "frozen schema");
  assertAuthorityDefinition(rejectionSchema, "rejection schema");

  assertDeepEqual(
    frozenSchema.$defs?.sha256,
    { type: "string", pattern: "^[0-9a-f]{64}$" },
    "SCHEMA_GRAMMAR_DRIFT",
    "frozen sha256 grammar"
  );
  assertDeepEqual(
    rejectionSchema.$defs?.sha256,
    { type: "string", pattern: "^[0-9a-f]{64}$" },
    "SCHEMA_GRAMMAR_DRIFT",
    "rejection sha256 grammar"
  );
  assertDeepEqual(
    manifestSchema.$defs?.sha256,
    { type: "string", pattern: "^[0-9a-f]{64}$" },
    "SCHEMA_GRAMMAR_DRIFT",
    "manifest sha256 grammar"
  );
  assertDeepEqual(
    rejectionSchema.$defs?.mutationEpoch,
    { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    "SCHEMA_GRAMMAR_DRIFT",
    "rejection mutation epoch grammar"
  );
  assertDeepEqual(
    rejectionSchema.$defs?.stateId,
    { enum: [...STATE_IDS] },
    "SCHEMA_GRAMMAR_DRIFT",
    "rejection state ID grammar"
  );
  assertDeepEqual(
    manifestSchema.$defs?.receiptId,
    { type: "string", pattern: "^vedic-receipt/[0-9a-f]{32,128}$" },
    "SCHEMA_GRAMMAR_DRIFT",
    "manifest receipt ID grammar"
  );
  assertDeepEqual(
    manifestSchema.$defs?.receiptReference?.properties?.receiptKind,
    { type: "string", pattern: "^[a-z][a-z0-9_]{0,95}$" },
    "SCHEMA_GRAMMAR_DRIFT",
    "manifest receipt kind grammar"
  );
  for (const field of [
    "activeCorrectionReceiptIds",
    "activeRevocationReceiptIds",
    "activeWithdrawalReceiptIds"
  ]) {
    assertDeepEqual(
      manifestSchema.$defs?.revocationObservation?.properties?.[field],
      {
        type: "array",
        maxItems: 512,
        uniqueItems: true,
        items: { $ref: "#/$defs/receiptId" }
      },
      "SCHEMA_GRAMMAR_DRIFT",
      `manifest ${field} grammar`
    );
  }

  if (frozenSchema.$id !== "urn:hakimi:vedic:input-admission:frozen-packet-transition-candidate:0.1.0"
    || frozenSchema.additionalProperties !== false
    || frozenSchema.properties?.acceptedReceipt?.const !== false
    || frozenSchema.properties?.commitObserved?.const !== false
    || frozenSchema.properties?.mutationEpochRuntimeEstablished?.const !== false
    || frozenSchema.properties?.authorityEffect?.const !== "none"
    || frozenSchema.properties?.outcome?.const !== "draft_transition_candidate") {
    fail("FROZEN_SCHEMA_BOUNDARY_DRIFT", "Frozen output schema no longer describes only a non-authoritative draft candidate.");
  }
  const candidate = frozenSchema.$defs?.candidateReceipt;
  if (candidate?.additionalProperties !== false
    || candidate?.properties?.acceptedReceipt?.const !== false
    || candidate?.properties?.candidateOnly?.const !== true
    || candidate?.properties?.commitObserved?.const !== false
    || candidate?.properties?.mutationEpochRuntimeEstablished?.const !== false
    || candidate?.properties?.receiptStatus?.const !== "draft_candidate_not_issued_not_accepted") {
    fail("FROZEN_SCHEMA_BOUNDARY_DRIFT", "Nested frozen receipt projection is not candidate-only.");
  }
  assertBoundaryFalse(frozenSchema["x-hakimiBoundary"], [
    "acceptedReceipt", "commitObserved", "countsTowardFormalAdmission",
    "expertClaimsAuthorized", "formalAdmissionAuthorized", "issuedReceipt",
    "mutationEpochRuntimeEstablished", "persistedReceipt", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseReady"
  ], "frozen schema boundary");
  if (frozenSchema["x-hakimiBoundary"]?.candidateOnly !== true
    || frozenSchema["x-hakimiBoundary"]?.authorityEffect !== "none") {
    fail("FROZEN_SCHEMA_BOUNDARY_DRIFT", "Frozen schema boundary is not candidate-only with no authority effect.");
  }

  const packet = frozenSchema.$defs?.governancePacket;
  assertDeepEqual(packet?.properties?.requirementIds?.const, REQUIREMENT_IDS, "SCHEMA_SET_DRIFT", "schema requirement IDs");
  assertDeepEqual(packet?.properties?.invariantIds?.const, INVARIANT_IDS, "SCHEMA_SET_DRIFT", "schema invariant IDs");
  assertDeepEqual(packet?.properties?.conditionIds?.const, CONDITION_IDS, "SCHEMA_SET_DRIFT", "schema condition IDs");
  assertDeepEqual(frozenSchema["x-hakimiReviewContentDigestFields"], REVIEW_DIGEST_FIELDS, "SCHEMA_SET_DRIFT", "schema review digest fields");
  if (packet?.properties?.upstreamReadinessCandidateDigest?.const !== UPSTREAM_READINESS_DIGEST
    || packet?.properties?.transitionContractDigest?.const !== TRANSITION_CONTRACT_DIGEST) {
    fail("SCHEMA_UPSTREAM_IDENTITY_DRIFT", "Frozen schema upstream digest identity drifted.");
  }
  const systemIdentity = frozenSchema.$defs?.systemIdentity;
  const expectedSystemIdentity = {
    baziIdentityInherited: false,
    contractSystemId: "vedic",
    independentProductId: null,
    legacyV13IdentityInherited: false,
    migrationId: null,
    migrationIdentityInherited: false,
    productSystemId: "vedic-astrology",
    releaseIdentity: null,
    releaseIdentityInherited: false,
    storageNamespaceClass: "vedic-input-admission-kernel-draft",
    targetSchema: null,
    targetSchemaInherited: false
  };
  assertExactKeys(
    systemIdentity,
    ["type", "additionalProperties", "required", "properties"],
    "SCHEMA_SYSTEM_IDENTITY_DRIFT",
    "schema system identity"
  );
  assertExactClosedSchemaObject(
    systemIdentity,
    Object.keys(expectedSystemIdentity),
    "SCHEMA_SYSTEM_IDENTITY_DRIFT",
    "schema system identity"
  );
  for (const [key, expected] of Object.entries(expectedSystemIdentity)) {
    if (!isDeepStrictEqual(systemIdentity?.properties?.[key], { const: expected })) {
      fail("SCHEMA_SYSTEM_IDENTITY_DRIFT", `Schema system identity drifted: ${key}`);
    }
  }
  const expectedPacketAuthority = {
    authorityEffect: "none",
    candidateInstanceCount: 0,
    digestSemanticOriginVerified: false,
    freeTextFieldCount: 0,
    governancePolicyOnly: true,
    personalDataFieldCount: 0,
    personDerivedDigestFieldCount: 0,
    privacySourceProvenanceEstablished: false
  };
  for (const [key, expected] of Object.entries(expectedPacketAuthority)) {
    if (!isDeepStrictEqual(packet?.properties?.authorityBoundary, {
      $ref: "#/$defs/packetAuthorityBoundary"
    }) || !isDeepStrictEqual(
      frozenSchema.$defs?.packetAuthorityBoundary?.properties?.[key],
      { const: expected }
    )) {
      fail("SCHEMA_PACKET_AUTHORITY_DRIFT", `Frozen packet authority drifted: ${key}`);
    }
  }

  if (manifestSchema.$id
      !== "urn:hakimi:vedic:input-admission:pre-snapshot-evidence-manifest-candidate:0.1.0"
    || manifestSchema.additionalProperties !== false
    || manifestSchema.properties?.schemaVersion?.const
      !== "hakimi.vedic-pre-snapshot-evidence-manifest-candidate/0.1-draft"
    || manifestSchema.properties?.manifestId?.const !== "pre_snapshot_evidence_manifest"
    || manifestSchema.properties?.declaredManifestDigestDomain?.const
      !== "hakimi/vedic-input-admission/pre-snapshot-evidence-manifest/v0.1.0"
    || manifestSchema.properties?.receiptReferences?.maxItems !== 512
    || manifestSchema.$defs?.receiptId?.pattern !== "^vedic-receipt/[0-9a-f]{32,128}$"
    || manifestSchema.$defs?.revocationObservation?.properties
      ?.activeCorrectionReceiptIds?.maxItems !== 512
    || manifestSchema.$defs?.revocationObservation?.properties
      ?.activeRevocationReceiptIds?.maxItems !== 512
    || manifestSchema.$defs?.revocationObservation?.properties
      ?.activeWithdrawalReceiptIds?.maxItems !== 512) {
    fail("MANIFEST_SCHEMA_BOUNDARY_DRIFT", "Manifest candidate schema identity or local diagnostic limits drifted.");
  }
  const manifestProjection = manifestSchema["x-hakimiManifestContractProjection"];
  assertDeepEqual(
    manifestProjection?.includedReceiptKinds,
    PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS,
    "MANIFEST_SCHEMA_CONTRACT_DRIFT",
    "manifest included receipt kinds"
  );
  assertDeepEqual(
    manifestProjection?.excludedOutputReceiptKinds,
    PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS,
    "MANIFEST_SCHEMA_CONTRACT_DRIFT",
    "manifest excluded output receipt kinds"
  );
  assertDeepEqual(
    manifestProjection?.definedReceiptCardinalities,
    PRE_SNAPSHOT_DEFINED_CARDINALITIES,
    "MANIFEST_SCHEMA_CONTRACT_DRIFT",
    "manifest defined receipt cardinalities"
  );
  assertDeepEqual(
    manifestProjection?.undefinedReceiptCardinalityKinds,
    ["legal_authority_disposition_receipt"],
    "MANIFEST_SCHEMA_CONTRACT_DRIFT",
    "manifest undefined receipt cardinality kinds"
  );
  for (const localOnlyField of [
    "candidateRootAndEntryShapesAreUpstreamNormative",
    "candidateDigestMayBeUsedAsFormalManifestOrIdempotencyIdentity",
    "entryOrderingIsUpstreamNormative",
    "localDiagnosticReceiptIdPatternIsUpstreamNormative",
    "localDiagnosticReceiptReferenceLimitIsUpstreamNormative",
    "receiptIdUniquenessEstablishedBySchemaAlone",
    "receiptKindExactSetEstablishedBySchemaAlone",
    "revocationObservationShapeIsUpstreamNormative"
  ]) {
    if (manifestProjection?.[localOnlyField] !== false) {
      fail("MANIFEST_SCHEMA_BOUNDARY_DRIFT", `Local manifest diagnostic field was promoted: ${localOnlyField}`);
    }
  }
  assertBoundaryFalse(manifestSchema["x-hakimiBoundary"], [
    "acceptedReceipt", "countsTowardFormalAdmission", "executableReceiptSchemasAvailable",
    "expertClaimsAuthorized", "formalAdmissionAuthorized", "formalManifestInstanceCreated",
    "legalAuthorityDispositionCardinalityDefined", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseReady", "runtimeRevocationRecheckEstablished",
    "sealedManifestEstablished"
  ], "manifest schema boundary");
  if (manifestSchema["x-hakimiBoundary"]?.candidateOnly !== true
    || manifestSchema["x-hakimiBoundary"]?.authorityEffect !== "none") {
    fail("MANIFEST_SCHEMA_BOUNDARY_DRIFT", "Manifest schema is not candidate-only with authority none.");
  }

  if (rejectionSchema.$id
      !== "urn:hakimi:vedic:input-admission:transition-rejection-receipt:0.1-draft.2"
    || rejectionSchema.additionalProperties !== false
    || rejectionSchema.properties?.acceptedReceipt?.const !== false
    || rejectionSchema.properties?.commitObserved?.const !== false
    || rejectionSchema.properties?.mutationEpochRuntimeEstablished?.const !== false
    || rejectionSchema.properties?.nonceConsumed?.const !== false
    || rejectionSchema.properties?.authorityEffect?.const !== "none"
    || rejectionSchema.properties?.outcome?.const !== "transition_rejection_receipt"
    || rejectionSchema.properties?.receiptSchemaVersion?.const
      !== "hakimi.vedic-transition-rejection-receipt/0.1-draft.2"
    || rejectionSchema["x-hakimiSchemaRevision"] !== 2
    || rejectionSchema.properties?.packetDigestDomain?.const
      !== "hakimi/vedic-input-admission-kernel-draft/governance-packet/v0.1"
    || rejectionSchema.properties?.packetSchemaVersion?.const
      !== "hakimi.vedic-input-governance-packet/0.1-draft") {
    fail("REJECTION_SCHEMA_BOUNDARY_DRIFT", "Rejection schema no longer describes a zero-mutation rejected response.");
  }
  for (const field of REJECTION_PACKET_IDENTITY_FIELDS) {
    if (!rejectionSchema.required?.includes(field)
      || !Object.hasOwn(rejectionSchema.properties ?? {}, field)) {
      fail("REJECTION_PACKET_BINDING_DRIFT", `Rejection schema lost packet identity field: ${field}`);
    }
  }
  assertDeepEqual(
    rejectionSchema.properties?.rejectionCode?.enum,
    REJECTION_CODES,
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "rejection code set"
  );
  assertDeepEqual(
    rejectionSchema.properties?.failedGuardIds?.items?.enum,
    REJECTION_GUARD_IDS,
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "rejection guard ID set"
  );
  if (rejectionSchema.properties?.failedGuardIds?.maxItems !== 4
    || rejectionSchema.properties?.failedGuardIds?.uniqueItems !== true) {
    fail("REJECTION_TRANSITION_MAPPING_DRIFT", "Rejection guard list bounds drifted.");
  }
  const mappingClauses = rejectionSchema.allOf;
  if (!Array.isArray(mappingClauses) || mappingClauses.length !== REJECTION_CODES.length) {
    fail("REJECTION_TRANSITION_MAPPING_DRIFT", "Rejection code mapping clause count drifted.");
  }
  const clausesByCode = {};
  for (const clause of mappingClauses) {
    assertExactKeys(
      clause,
      ["if", "then"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      "rejection mapping clause"
    );
    assertExactKeys(
      clause.if,
      ["properties", "required"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      "rejection mapping condition"
    );
    assertExactKeys(
      clause.if.properties,
      ["rejectionCode"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      "rejection mapping condition properties"
    );
    const rejectionCode = clause?.if?.properties?.rejectionCode?.const;
    if (!REJECTION_CODES.includes(rejectionCode)
      || Object.hasOwn(clausesByCode, rejectionCode)
      || !isDeepStrictEqual(clause?.if?.required, ["rejectionCode"])
      || !isDeepStrictEqual(clause.if.properties.rejectionCode, { const: rejectionCode })) {
      fail("REJECTION_TRANSITION_MAPPING_DRIFT", "Rejection code mapping is missing, duplicated, or non-exhaustive.");
    }
    clausesByCode[rejectionCode] = clause.then;
  }
  for (const rejectionCode of [
    "UNKNOWN_TRANSITION",
    "TRANSITION_NOT_IMPLEMENTED",
    "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED"
  ]) {
    assertExactKeys(
      clausesByCode[rejectionCode],
      ["properties"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      `${rejectionCode} mapping result`
    );
  }
  assertExactKeys(
    clausesByCode.FROM_STATE_MISMATCH,
    ["oneOf"],
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "FROM_STATE_MISMATCH mapping result"
  );
  for (const branch of clausesByCode.FROM_STATE_MISMATCH.oneOf ?? []) {
    assertExactKeys(
      branch,
      ["properties"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      "FROM_STATE_MISMATCH mapping branch"
    );
  }
  for (const rejectionCode of ["REPLAY_OR_IDEMPOTENCY_CONFLICT", "EPOCH_OVERFLOW"]) {
    assertExactKeys(
      clausesByCode[rejectionCode],
      ["properties", "allOf"],
      "REJECTION_TRANSITION_MAPPING_DRIFT",
      `${rejectionCode} mapping result`
    );
  }
  assertDeepEqual(
    clausesByCode.UNKNOWN_TRANSITION?.properties,
    {
      attemptedTransitionId: { not: { enum: [...DECLARED_TRANSITION_IDS] } },
      failedGuardIds: { const: ["unknown_transition"] }
    },
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "unknown transition mapping"
  );
  assertDeepEqual(
    clausesByCode.TRANSITION_NOT_IMPLEMENTED?.properties,
    {
      attemptedTransitionId: { enum: [...UNIMPLEMENTED_DECLARED_TRANSITION_IDS] },
      failedGuardIds: { const: ["transition_not_implemented"] }
    },
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "unimplemented transition mapping"
  );
  assertDeepEqual(
    clausesByCode.FROM_STATE_MISMATCH?.oneOf?.map((branch) => branch.properties),
    [
      {
        attemptedTransitionId: { const: "freeze_packet" },
        failedGuardIds: { const: ["from_state_uninstantiated"] },
        stateBefore: { not: { const: "uninstantiated" } }
      },
      {
        attemptedTransitionId: { const: "seal_pre_snapshot_evidence_manifest" },
        failedGuardIds: { const: ["from_state_packet_frozen_receipts_incomplete"] },
        stateBefore: { not: { const: "packet_frozen_receipts_incomplete" } }
      }
    ],
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "from-state transition mapping"
  );
  assertDeepEqual(
    clausesByCode.PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED?.properties,
    {
      attemptedTransitionId: { const: "seal_pre_snapshot_evidence_manifest" },
      failedGuardIds: { const: [...PRE_SNAPSHOT_MANIFEST_GUARD_IDS] },
      stateBefore: { const: "packet_frozen_receipts_incomplete" }
    },
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "pre-snapshot seal blocker mapping"
  );
  const replayGuardCombinations = [
    ["operation_id_not_previously_observed"],
    ["idempotency_key_not_previously_observed"],
    ["operation_nonce_not_previously_consumed"],
    ["operation_id_not_previously_observed", "idempotency_key_not_previously_observed"],
    ["operation_id_not_previously_observed", "operation_nonce_not_previously_consumed"],
    ["idempotency_key_not_previously_observed", "operation_nonce_not_previously_consumed"],
    [
      "operation_id_not_previously_observed",
      "idempotency_key_not_previously_observed",
      "operation_nonce_not_previously_consumed"
    ]
  ];
  const expectedStateBindings = [
    {
      if: { properties: { attemptedTransitionId: { const: "freeze_packet" } } },
      then: { properties: { stateBefore: { const: "uninstantiated" } } }
    },
    {
      if: {
        properties: {
          attemptedTransitionId: { const: "seal_pre_snapshot_evidence_manifest" }
        }
      },
      then: {
        properties: { stateBefore: { const: "packet_frozen_receipts_incomplete" } }
      }
    }
  ];
  assertDeepEqual(
    clausesByCode.REPLAY_OR_IDEMPOTENCY_CONFLICT?.properties?.attemptedTransitionId,
    { enum: ["freeze_packet", "seal_pre_snapshot_evidence_manifest"] },
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "replay attempted transitions"
  );
  assertDeepEqual(
    clausesByCode.REPLAY_OR_IDEMPOTENCY_CONFLICT?.properties?.failedGuardIds?.oneOf
      ?.map((entry) => entry.const),
    replayGuardCombinations,
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "replay guard combinations"
  );
  assertDeepEqual(
    clausesByCode.REPLAY_OR_IDEMPOTENCY_CONFLICT?.allOf,
    expectedStateBindings,
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "replay state bindings"
  );
  assertDeepEqual(
    clausesByCode.EPOCH_OVERFLOW?.properties,
    {
      afterEpoch: { const: Number.MAX_SAFE_INTEGER },
      attemptedTransitionId: { enum: ["freeze_packet", "seal_pre_snapshot_evidence_manifest"] },
      beforeEpoch: { const: Number.MAX_SAFE_INTEGER },
      failedGuardIds: { const: ["after_epoch_must_equal_before_plus_one"] },
      stateBefore: { enum: ["uninstantiated", "packet_frozen_receipts_incomplete"] }
    },
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "epoch overflow mapping"
  );
  assertDeepEqual(
    clausesByCode.EPOCH_OVERFLOW?.allOf,
    expectedStateBindings,
    "REJECTION_TRANSITION_MAPPING_DRIFT",
    "epoch overflow state bindings"
  );
  assertBoundaryFalse(rejectionSchema["x-hakimiBoundary"], [
    "acceptedReceipt", "commitObserved", "countsTowardFormalAdmission",
    "expertClaimsAuthorized", "formalAdmissionAuthorized", "mutationEpochRuntimeEstablished",
    "nonceConsumed", "publicDeploymentAuthorized", "publicReleaseAuthorized", "releaseReady",
    "targetReceiptIssued"
  ], "rejection schema boundary");
  if (rejectionSchema["x-hakimiBoundary"]?.authorityEffect !== "none"
    || !rejectionSchema["x-hakimiEvaluatorInvariants"]?.forbiddenFields?.includes("targetReceiptId")) {
    fail("REJECTION_SCHEMA_BOUNDARY_DRIFT", "Rejection schema does not preserve the no-target-receipt boundary.");
  }

  assertSchemaSemanticIdentity(
    frozenSchema,
    SCHEMA_SEMANTIC_IDENTITIES.frozen,
    "frozen schema"
  );
  assertSchemaSemanticIdentity(
    rejectionSchema,
    SCHEMA_SEMANTIC_IDENTITIES.rejection,
    "rejection schema"
  );
  assertSchemaSemanticIdentity(
    manifestSchema,
    SCHEMA_SEMANTIC_IDENTITIES.manifest,
    "manifest schema"
  );
}

function verifyUpstreamSealBlockers(contract) {
  assertDeepEqual(
    {
      allGuardsRequired: contract?.guardDefinitions?.allGuardsRequired,
      failureDisposition: contract?.guardDefinitions?.failureDisposition,
      guardEvaluatorImplemented: contract?.guardDefinitions?.guardEvaluatorImplemented,
      guardInstances: contract?.guardDefinitions?.guardInstances
    },
    {
      allGuardsRequired: true,
      failureDisposition: "not_ready_no_product_receipt",
      guardEvaluatorImplemented: false,
      guardInstances: []
    },
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream guard evaluator boundary"
  );
  const orderedGuards = contract?.guardDefinitions?.orderedGuards;
  if (!Array.isArray(orderedGuards)
    || orderedGuards.length !== 21
    || orderedGuards.some((entry) => entry?.currentSatisfied !== false)) {
    fail("UPSTREAM_SEAL_BLOCKER_DRIFT", "Upstream guard zero-satisfaction boundary drifted.");
  }
  assertDeepEqual(
    {
      acceptedOrGateSatisfiedMayBeIssuerSupplied:
        contract?.receiptEnvelopeRequirements?.acceptedOrGateSatisfiedMayBeIssuerSupplied,
      authenticMayBeIssuerSupplied:
        contract?.receiptEnvelopeRequirements?.authenticMayBeIssuerSupplied,
      digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth:
        contract?.receiptEnvelopeRequirements
          ?.digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth,
      executableReceiptSchema:
        contract?.receiptEnvelopeRequirements?.executableReceiptSchema,
      executableReceiptSchemaIds:
        contract?.receiptEnvelopeRequirements?.executableReceiptSchemaIds,
      rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope:
        contract?.receiptEnvelopeRequirements
          ?.rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope,
      receiptDigestIsDigitalSignature:
        contract?.receiptEnvelopeRequirements?.receiptDigestIsDigitalSignature
    },
    {
      acceptedOrGateSatisfiedMayBeIssuerSupplied: false,
      authenticMayBeIssuerSupplied: false,
      digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth: false,
      executableReceiptSchema: false,
      executableReceiptSchemaIds: [],
      rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope: false,
      receiptDigestIsDigitalSignature: false
    },
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream receipt envelope authority boundary"
  );
  assertDeepEqual(
    {
      acceptedReceipts: contract?.receiptTypeRequirements?.acceptedReceipts,
      legalDispositionReceiptStructurallyVerified:
        contract?.receiptTypeRequirements?.legalDispositionReceiptStructurallyVerified,
      nonSuccessLifecycleCurrentInstances:
        contract?.receiptTypeRequirements?.nonSuccessLifecycleReceiptRequirements
          ?.currentInstances,
      nonSuccessLifecycleMayEnterSuccessExactSet:
        contract?.receiptTypeRequirements?.nonSuccessLifecycleReceiptRequirements
          ?.mayEnterSuccessExactSet,
      receiptInstances: contract?.receiptTypeRequirements?.receiptInstances,
      rejectionReceiptMayEnterSuccessExactSet:
        contract?.receiptTypeRequirements?.rejectionReceiptMayEnterSuccessExactSet,
      requirementsOnlyNoExecutableSchemas:
        contract?.receiptTypeRequirements?.requirementsOnlyNoExecutableSchemas,
      rightsLegalConclusionRecorded:
        contract?.receiptTypeRequirements?.rightsLegalConclusionRecorded,
      structuralVerificationAloneMaySetRightsLegalConclusionRecorded:
        contract?.receiptTypeRequirements
          ?.structuralVerificationAloneMaySetRightsLegalConclusionRecorded
    },
    {
      acceptedReceipts: 0,
      legalDispositionReceiptStructurallyVerified: false,
      nonSuccessLifecycleCurrentInstances: [],
      nonSuccessLifecycleMayEnterSuccessExactSet: false,
      receiptInstances: [],
      rejectionReceiptMayEnterSuccessExactSet: false,
      requirementsOnlyNoExecutableSchemas: true,
      rightsLegalConclusionRecorded: false,
      structuralVerificationAloneMaySetRightsLegalConclusionRecorded: false
    },
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream receipt success and legal boundary"
  );
  assertDeepEqual(
    {
      allEightConditionsAloneConferFormalAdmission:
        contract?.evaluationRequirements?.allEightConditionsAloneConferFormalAdmission,
      conditionSkippingAllowed: contract?.evaluationRequirements?.conditionSkippingAllowed,
      evaluationInstances: contract?.evaluationRequirements?.evaluationInstances,
      evaluationReceipts: contract?.evaluationRequirements?.evaluationReceipts,
      evaluatorByteDigest: contract?.evaluationRequirements?.evaluatorByteDigest,
      evaluatorIdentity: contract?.evaluationRequirements?.evaluatorIdentity,
      evaluatorImplemented: contract?.evaluationRequirements?.evaluatorImplemented,
      generativeModelWinnerSelectionAllowed:
        contract?.evaluationRequirements?.generativeModelWinnerSelectionAllowed,
      majorityVoteAllowed: contract?.evaluationRequirements?.majorityVoteAllowed,
      opinionAveragingAllowed: contract?.evaluationRequirements?.opinionAveragingAllowed,
      outputReceiptMayBeIncludedInOwnInputManifest:
        contract?.evaluationRequirements?.outputReceiptMayBeIncludedInOwnInputManifest,
      partialCompletionMaySetGateTrue:
        contract?.evaluationRequirements?.partialCompletionMaySetGateTrue,
      successfulMechanicalCandidateAuthorityEffect:
        contract?.evaluationRequirements?.successfulMechanicalCandidateAuthorityEffect
    },
    {
      allEightConditionsAloneConferFormalAdmission: false,
      conditionSkippingAllowed: false,
      evaluationInstances: [],
      evaluationReceipts: 0,
      evaluatorByteDigest: null,
      evaluatorIdentity: null,
      evaluatorImplemented: false,
      generativeModelWinnerSelectionAllowed: false,
      majorityVoteAllowed: false,
      opinionAveragingAllowed: false,
      outputReceiptMayBeIncludedInOwnInputManifest: false,
      partialCompletionMaySetGateTrue: false,
      successfulMechanicalCandidateAuthorityEffect: "none"
    },
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream evaluation and authority boundary"
  );
  if (!Array.isArray(contract?.evaluationRequirements?.manifestLayers)
    || contract.evaluationRequirements.manifestLayers.length !== 3
    || contract.evaluationRequirements.manifestLayers.some(
      (entry) => entry?.currentInstances !== 0
    )) {
    fail("UPSTREAM_SEAL_BLOCKER_DRIFT", "Upstream manifest-layer zero-instance boundary drifted.");
  }
  assertDeepEqual(
    contract?.zeroInstanceState,
    EXPECTED_UPSTREAM_ZERO_INSTANCE_STATE,
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream zero-instance state"
  );
  if (contract?.contractDigest !== TRANSITION_CONTRACT_DIGEST
    || contract?.activeAdmissionEffect !== "none"
    || contract?.transitionRequirements?.transitionEvaluatorImplemented !== false
    || !isDeepStrictEqual(contract?.transitionRequirements?.transitionInstances, [])
    || contract?.receiptEnvelopeRequirements?.executableReceiptSchema !== false
    || !isDeepStrictEqual(contract?.receiptEnvelopeRequirements?.executableReceiptSchemaIds, [])
    || contract?.receiptTypeRequirements?.requirementsOnlyNoExecutableSchemas !== true
    || !isDeepStrictEqual(contract?.receiptTypeRequirements?.receiptInstances, [])
    || contract?.receiptTypeRequirements?.acceptedReceipts !== 0
    || contract?.zeroInstanceState?.executableReceiptSchemasImplemented !== false
    || contract?.zeroInstanceState?.runtimeReceiptEvidenceEstablished !== false
    || !isDeepStrictEqual(contract?.zeroInstanceState?.preSnapshotEvidenceManifestInstances, [])) {
    fail("UPSTREAM_SEAL_BLOCKER_DRIFT", "Upstream zero-instance, schema, or runtime seal blockers drifted.");
  }

  const transitions = contract.transitionRequirements.futureTransitionDefinitions.filter(
    (entry) => entry?.transitionId === "seal_pre_snapshot_evidence_manifest"
  );
  assertDeepEqual(transitions, [{
    transitionId: "seal_pre_snapshot_evidence_manifest",
    fromStateIds: ["packet_frozen_receipts_incomplete"],
    toStateId: "pre_snapshot_evidence_manifest_complete_unverified",
    requiredGuardIds: [...PRE_SNAPSHOT_MANIFEST_GUARD_IDS],
    authorityEffect: "none"
  }], "UPSTREAM_SEAL_BLOCKER_DRIFT", "upstream seal transition");

  const guardProjection = contract.guardDefinitions.orderedGuards
    .filter((entry) => PRE_SNAPSHOT_MANIFEST_GUARD_IDS.includes(entry?.guardId))
    .map((entry) => ({ guardId: entry.guardId, currentSatisfied: entry.currentSatisfied }));
  assertDeepEqual(
    guardProjection,
    PRE_SNAPSHOT_MANIFEST_GUARD_IDS.map((guardId) => ({
      guardId,
      currentSatisfied: false
    })),
    "UPSTREAM_SEAL_BLOCKER_DRIFT",
    "upstream seal guard status"
  );

  const manifestLayers = contract.evaluationRequirements.manifestLayers.filter(
    (entry) => entry?.manifestId === "pre_snapshot_evidence_manifest"
  );
  assertDeepEqual(manifestLayers, [{
    manifestId: "pre_snapshot_evidence_manifest",
    digestDomain: "hakimi/vedic-input-admission/pre-snapshot-evidence-manifest/v0.1.0",
    includedReceiptKinds: [...PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS],
    excludedOutputReceiptKinds: [...PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS],
    currentInstances: 0
  }], "UPSTREAM_SEAL_BLOCKER_DRIFT", "upstream pre-snapshot manifest layer");

  const families = contract.receiptTypeRequirements.families;
  for (const [receiptKind, expectedCount] of Object.entries(
    PRE_SNAPSHOT_DEFINED_CARDINALITIES
  )) {
    const matches = families.filter((entry) => entry?.receiptKind === receiptKind);
    if (matches.length !== 1
      || matches[0].minimumCount !== expectedCount
      || matches[0].maximumCount !== expectedCount) {
      fail("UPSTREAM_SEAL_BLOCKER_DRIFT", `Upstream fixed cardinality drifted: ${receiptKind}`);
    }
  }
  const legalFamilies = families.filter(
    (entry) => entry?.receiptKind === "legal_authority_disposition_receipt"
  );
  if (legalFamilies.length !== 1
    || legalFamilies[0].minimumCount !== "required_undefined"
    || legalFamilies[0].maximumCount !== "required_undefined") {
    fail("UPSTREAM_SEAL_BLOCKER_DRIFT", "Upstream legal-authority receipt cardinality is no longer required_undefined.");
  }
}

async function listPackageFiles(root) {
  const packageRoot = resolveWorkspacePath(root, VEDIC_KERNEL_PACKAGE_DIRECTORY);
  const output = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail("PACKAGE_ENDPOINT_INVALID", "Kernel package contains a symbolic link.");
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) output.push(normalizeRelative(path.relative(packageRoot, absolute)));
      else fail("PACKAGE_ENDPOINT_INVALID", "Kernel package contains a non-file endpoint.");
    }
  }
  await visit(packageRoot);
  return output.sort();
}

async function scanAppsWeb(root) {
  const webRootRelative = "apps/web";
  const webRoot = resolveWorkspacePath(root, webRootRelative);
  let inspected = 0;
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_TREE_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = normalizeRelative(path.relative(path.resolve(root), absolute));
      if (relative === RESTRICTED_WEB_PATH) continue;
      if (entry.isSymbolicLink()) fail("PRODUCTION_SCAN_ENDPOINT_INVALID", `Production scan encountered a symbolic link: ${relative}`);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const bytes = await readRegularFile(root, relative, 4 * 1024 * 1024);
      const text = decodeUtf8(bytes, relative, { allowBom: true });
      inspected += 1;
      if (containsLocalDraftIdentity(text)) {
        fail("PRODUCTION_IMPORT_LEAKAGE", `Isolated Vedic kernel leaked into an inspectable apps/web source: ${relative}`);
      }
      if (SCRIPT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        assertNoStaticLocalDraftReference(text, relative);
      }
    }
  }
  await visit(webRoot);
  return inspected;
}

async function assertNoFormalParentLeakage(root) {
  for (const relativePath of FORMAL_PARENT_PATHS) {
    const text = decodeUtf8(await readRegularFile(root, relativePath), relativePath);
    if (containsLocalDraftIdentity(text)) {
      fail("FORMAL_PARENT_LEAKAGE", `Kernel draft leaked into a formal or upstream parent: ${relativePath}`);
    }
  }
}

function verifyRegistryLayers(upstreamRegistry, downstreamRegistry) {
  if (!Array.isArray(upstreamRegistry?.drafts)) {
    fail("UPSTREAM_REGISTRY_INVALID", "Upstream readiness registry drafts are unavailable.");
  }
  const upstreamBacklinks = upstreamRegistry.drafts.filter(
    (entry) => entry?.packageName === VEDIC_KERNEL_PACKAGE_NAME
      || entry?.directoryName === "vedic-input-admission-kernel-draft"
  );
  if (upstreamBacklinks.length !== 0) {
    fail("UPSTREAM_REGISTRY_BACKLINK", "Upstream readiness registry must not backlink the downstream kernel draft.");
  }
  assertDeepEqual(
    downstreamRegistry,
    EXPECTED_DOWNSTREAM_REGISTRY,
    "DOWNSTREAM_REGISTRY_DRIFT",
    "downstream isolated-draft registry"
  );
  const downstreamEntries = downstreamRegistry.drafts.filter(
    (entry) => entry?.packageName === VEDIC_KERNEL_PACKAGE_NAME
      || entry?.directoryName === "vedic-input-admission-kernel-draft"
  );
  if (downstreamEntries.length !== 1) {
    fail("DOWNSTREAM_REGISTRY_ENTRY_COUNT_DRIFT", "Downstream kernel entry is missing or duplicated.");
  }
  assertDeepEqual(
    downstreamEntries[0],
    EXPECTED_REGISTRY_ENTRY,
    "DOWNSTREAM_REGISTRY_DRIFT",
    "downstream kernel registry entry"
  );
}

export async function verifyVedicInputAdmissionKernelDraft(root = WORKSPACE_ROOT) {
  const resolvedRoot = path.resolve(root);
  const fixedBytes = {};
  for (const relativePath of Object.keys(FIXED_RAW_IDENTITIES)) {
    const bytes = await readRegularFile(resolvedRoot, relativePath);
    assertFixedIdentity(relativePath, bytes);
    fixedBytes[relativePath] = bytes;
  }

  assertDeepEqual(await listPackageFiles(resolvedRoot), PACKAGE_FILE_SET, "PACKAGE_FILE_SET_DRIFT", "kernel package file set");

  const packageManifest = parseJson(
    fixedBytes[`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/package.json`],
    `${VEDIC_KERNEL_PACKAGE_DIRECTORY}/package.json`
  );
  assertDeepEqual(packageManifest, EXPECTED_PACKAGE_MANIFEST, "PACKAGE_MANIFEST_DRIFT", "kernel package manifest");

  const upstreamRegistry = parseJson(
    fixedBytes[UPSTREAM_REGISTRY_PATH],
    UPSTREAM_REGISTRY_PATH
  );
  const downstreamRegistry = parseJson(
    fixedBytes[DOWNSTREAM_REGISTRY_PATH],
    DOWNSTREAM_REGISTRY_PATH
  );
  verifyRegistryLayers(upstreamRegistry, downstreamRegistry);

  const lock = parseJson(await readRegularFile(resolvedRoot, LOCK_PATH), LOCK_PATH);
  assertDeepEqual(lock.packages?.[`node_modules/${VEDIC_KERNEL_PACKAGE_NAME}`], {
    resolved: VEDIC_KERNEL_PACKAGE_DIRECTORY,
    link: true
  }, "LOCK_LINK_DRIFT", "kernel lock link");
  assertDeepEqual(lock.packages?.[VEDIC_KERNEL_PACKAGE_DIRECTORY], {
    name: VEDIC_KERNEL_PACKAGE_NAME,
    version: "0.0.0-draft.0"
  }, "LOCK_WORKSPACE_DRIFT", "kernel lock workspace entry");

  const rootManifest = parseJson(await readRegularFile(resolvedRoot, ROOT_MANIFEST_PATH), ROOT_MANIFEST_PATH);
  for (const [scriptName, expected] of Object.entries(EXPECTED_ROOT_SCRIPTS)) {
    if (rootManifest.scripts?.[scriptName] !== expected) {
      fail("ROOT_SCRIPT_DRIFT", `Root script drifted: ${scriptName}`);
    }
  }

  const protocolText = decodeUtf8(
    fixedBytes[`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/protocol.ts`],
    `${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/protocol.ts`
  );
  const packetSchemaText = decodeUtf8(
    fixedBytes[`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/frozen-packet-schema.ts`],
    `${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/frozen-packet-schema.ts`
  );
  const evaluatorText = decodeUtf8(
    fixedBytes[`${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/evaluator.ts`],
    `${VEDIC_KERNEL_PACKAGE_DIRECTORY}/src/evaluator.ts`
  );
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_REQUIREMENT_IDS"), REQUIREMENT_IDS, "SOURCE_SET_DRIFT", "source requirement IDs");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_INVARIANT_IDS"), INVARIANT_IDS, "SOURCE_SET_DRIFT", "source invariant IDs");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_CONDITION_IDS"), CONDITION_IDS, "SOURCE_SET_DRIFT", "source condition IDs");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_REVIEW_CONTENT_DIGEST_FIELDS"), REVIEW_DIGEST_FIELDS, "SOURCE_SET_DRIFT", "source review digest fields");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_TRANSITION_IDS"), DECLARED_TRANSITION_IDS, "SOURCE_SET_DRIFT", "source transition IDs");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_STATE_IDS"), STATE_IDS, "SOURCE_SET_DRIFT", "source state IDs");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS"), PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS, "SOURCE_SET_DRIFT", "source pre-snapshot included receipt kinds");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS"), PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS, "SOURCE_SET_DRIFT", "source pre-snapshot excluded output receipt kinds");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_PRE_SNAPSHOT_UNDEFINED_RECEIPT_CARDINALITY_KINDS"), ["legal_authority_disposition_receipt"], "SOURCE_SET_DRIFT", "source undefined receipt cardinality kinds");
  assertDeepEqual(extractConstStringArray(protocolText, "VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS"), PRE_SNAPSHOT_MANIFEST_GUARD_IDS, "SOURCE_SET_DRIFT", "source pre-snapshot guard IDs");
  requireSourceFragment(protocolText, `"${UPSTREAM_READINESS_DIGEST}" as const`, "readiness digest");
  requireSourceFragment(protocolText, `"${TRANSITION_CONTRACT_DIGEST}" as const`, "transition contract digest");
  requireSourceFragment(protocolText, "independentProductId: null;", "null independent product identity");
  requireSourceFragment(protocolText, "productSystemId: \"vedic-astrology\";", "draft product system label");
  requireSourceFragment(protocolText, "migrationId: null;", "null migration identity");
  requireSourceFragment(protocolText, "releaseIdentity: null;", "null release identity");
  requireSourceFragment(protocolText, "targetSchema: null;", "null target schema");
  for (const key of AUTHORITY_FALSE_KEYS) requireSourceFragment(protocolText, `${key}: false`, `authority false ${key}`);
  requireSourceFragment(evaluatorText, "acceptedReceipt: false,", "candidate accepted receipt false");
  requireSourceFragment(evaluatorText, "candidateOnly: true,", "candidate-only result");
  requireSourceFragment(evaluatorText, "outcome: \"draft_transition_candidate\"", "draft transition outcome");
  requireSourceFragment(evaluatorText, "afterEpoch: currentState.mutationEpoch,", "rejection epoch unchanged");
  requireSourceFragment(evaluatorText, "nextChainHeadDigest: currentState.chainHeadDigest,", "rejection chain head unchanged");
  requireSourceFragment(evaluatorText, "nextConsumedNonceSetHeadDigest: currentState.consumedNonceSetHeadDigest,", "rejection nonce head unchanged");
  requireSourceFragment(evaluatorText, "nextRevocationLedgerHeadDigest: currentState.revocationLedgerHeadDigest,", "rejection revocation head unchanged");
  requireSourceFragment(evaluatorText, "nextStateDigest: currentState.stateDigest,", "rejection state digest unchanged");
  requireSourceFragment(evaluatorText, "nonceConsumed: false,", "rejection nonce not consumed");
  requireSourceFragment(evaluatorText, "admissionCycleId: packet.admissionCycleId,", "rejection admission-cycle binding");
  requireSourceFragment(evaluatorText, "packetDigest: packet.packetDigest,", "rejection packet digest binding");
  requireSourceFragment(evaluatorText, "packetManifestDigest: packet.packetManifestDigest,", "rejection packet manifest binding");
  requireSourceFragment(evaluatorText, "packetSchemaVersion: packet.packetSchemaVersion,", "rejection packet schema binding");
  requireSourceFragment(evaluatorText, "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED", "pre-snapshot seal blocker code");
  requireSourceFragment(evaluatorText, "candidateManifestClosed: false,", "manifest projection never marked closed");
  requireSourceFragment(evaluatorText, "legalAuthorityDispositionCardinalityDefined: false,", "undefined legal authority cardinality");
  requireSourceFragment(evaluatorText, "runtimeRevocationRecheckEstablished: false,", "runtime revocation recheck unavailable");
  requireSourceFragment(evaluatorText, "if (source.length > MAX_PRE_SNAPSHOT_RECEIPT_REFERENCES)", "lifecycle projection item limit");
  requireSourceFragment(
    evaluatorText,
    'requireExactKeys(record, ["currentState", "operation", "transitionId"], "request");',
    "three-field transition request without manifest payload"
  );
  if ([protocolText, packetSchemaText, evaluatorText].some((text) => text.includes("targetReceiptId"))) {
    fail("SOURCE_TARGET_RECEIPT_ID_FORBIDDEN", "Kernel source contains forbidden targetReceiptId material.");
  }

  const frozenSchema = parseJson(fixedBytes[FROZEN_SCHEMA_PATH], FROZEN_SCHEMA_PATH);
  const rejectionSchema = parseJson(fixedBytes[REJECTION_SCHEMA_PATH], REJECTION_SCHEMA_PATH);
  const manifestSchema = parseJson(fixedBytes[MANIFEST_SCHEMA_PATH], MANIFEST_SCHEMA_PATH);
  verifySchemas(frozenSchema, rejectionSchema, manifestSchema);
  const upstreamTransitionRequirements = parseJson(
    await readRegularFile(resolvedRoot, TRANSITION_REQUIREMENTS_PATH),
    TRANSITION_REQUIREMENTS_PATH
  );
  verifyUpstreamSealBlockers(upstreamTransitionRequirements);

  await assertNoFormalParentLeakage(resolvedRoot);
  const appsWebInspectableFiles = await scanAppsWeb(resolvedRoot);

  return Object.freeze({
    observationClass: "point_in_time_non_atomic_source_observation",
    kernelDraftMechanicallyObserved: true,
    pointInTimeSourceObservation: true,
    crossFileAtomicSnapshot: false,
    trustedRuntimeObserved: false,
    runtimeEstablished: false,
    persistenceEstablished: false,
    transitionPersisted: false,
    acceptedReceiptIssued: false,
    preSnapshotManifestCandidateProjectionSchemaObserved: true,
    preSnapshotManifestPositiveTransitionCandidateImplemented: false,
    preSnapshotManifestSealFailClosedEvaluatorObserved: true,
    upstreamSealBlockersMechanicallyObserved: true,
    legalAuthorityDispositionCardinalityDefined: false,
    executableSuccessReceiptSchemasAvailable: false,
    runtimeRevocationRecheckEstablished: false,
    formalParentIntegrated: false,
    fourSystemRegistryIntegrated: false,
    upstreamReadinessRegistryBacklinkObserved: false,
    downstreamRegistryObserved: true,
    appsWebProductionImportObserved: false,
    appsWebStaticStringConstantFoldingApplied: true,
    appsWebUnresolvedRuntimeSpecifierAbsenceEstablished: false,
    productionDependencyClosureEstablished: false,
    appsWebInspectableFiles,
    appsWebObservationScope:
      "parseable_script_and_scannable_text_sources_except_explicitly_restricted_file",
    restrictedWebFileIntentionallyNotRead: true,
    restrictedWebPath: RESTRICTED_WEB_PATH,
    requirementIdsRequired: REQUIREMENT_IDS.length,
    invariantIdsRequired: INVARIANT_IDS.length,
    conditionIdsRequired: CONDITION_IDS.length,
    reviewContentDigestFieldsRequired: REVIEW_DIGEST_FIELDS.length,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionEstablished: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    deploymentVerified: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    formalAdmissionAuthorized: false,
    authorityEffect: "none",
    fixedRawIdentities: Object.entries(FIXED_RAW_IDENTITIES).map(([artifactPath, identity]) => ({
      path: artifactPath,
      bytes: identity.bytes,
      sha256: identity.sha256
    }))
  });
}

export const vedicInputAdmissionKernelDraftTestOnly = Object.freeze({
  fixedRawIdentities: FIXED_RAW_IDENTITIES,
  formalParentPaths: FORMAL_PARENT_PATHS,
  frozenSchemaPath: FROZEN_SCHEMA_PATH,
  manifestSchemaPath: MANIFEST_SCHEMA_PATH,
  lockPath: LOCK_PATH,
  packageDirectory: VEDIC_KERNEL_PACKAGE_DIRECTORY,
  packageFileSet: PACKAGE_FILE_SET,
  packageName: VEDIC_KERNEL_PACKAGE_NAME,
  downstreamRegistryPath: DOWNSTREAM_REGISTRY_PATH,
  rejectionSchemaPath: REJECTION_SCHEMA_PATH,
  restrictedWebPath: RESTRICTED_WEB_PATH,
  rootManifestPath: ROOT_MANIFEST_PATH,
  upstreamRegistryPath: UPSTREAM_REGISTRY_PATH,
  transitionRequirementsPath: TRANSITION_REQUIREMENTS_PATH,
  verifyRegistryLayers,
  verifySchemaSemantics: verifySchemas,
  verifyUpstreamSealBlockers
});

const isCli = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  if (process.argv.length !== 2) {
    process.stderr.write(`${JSON.stringify({
      errorCode: "CLI_ARGUMENTS_FORBIDDEN",
      kernelDraftMechanicallyObserved: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    })}\n`);
    process.exitCode = 2;
  } else {
    try {
      const report = await verifyVedicInputAdmissionKernelDraft(WORKSPACE_ROOT);
      process.stdout.write(`${JSON.stringify(report)}\n`);
    } catch (cause) {
      process.stderr.write(`${JSON.stringify({
        errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
        kernelDraftMechanicallyObserved: false,
        message: cause instanceof Error ? cause.message : "Unexpected verifier failure.",
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        releaseReady: false
      })}\n`);
      process.exitCode = 1;
    }
  }
}
