import { createHash } from "node:crypto";
import {
  close as closeFileDescriptorCallback,
  constants as fsConstants,
  fstat as statFileDescriptorCallback,
  open as openFileDescriptorCallback,
  read as readFileDescriptorCallback
} from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  canonicalStringifyVedicProductizationRequirements,
  parseVedicProductizationRequirementsJsonBytes
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
  isVerifiedVedicInputAdmissionReadinessCandidate,
  loadVedicInputAdmissionReadinessCandidate
} from "./vedic-input-admission-readiness-candidate-lib.mjs";
import {
  VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
  isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate
} from "./vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs";

const MAX_CONTRACT_BYTES = 512 * 1024;
const CONTRACT_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-transition-and-receipt-requirements/v0.1.0";
const CANONICALIZATION_PROFILE =
  "sorted_object_keys_compact_json_finite_numbers_aliases_expanded_active_cycles_rejected_v1";
const SCHEMA_VERSION =
  "vedic-input-admission-transition-and-receipt-requirements/v0.1.0";
const RECORD_TYPE =
  "vedic-input-admission-transition-and-receipt-requirements";
const CONTRACT_ID =
  "vedic-input-admission-transition-and-receipt-requirements-v0.1.0";
const INTERNAL_JSON_LABEL = "吠陀输入准入 transition/receipt 要求合同 JSON";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const JSON_STRINGIFY = JSON.stringify;
const TEST_ONLY_READ_PHASES = Object.freeze([
  "after-open",
  "before-read",
  "after-read"
]);

// Filled from the reviewed persisted artifact. Keeping these values in this
// module makes a self-resigned semantic mutation fail closed.
const EXPECTED_CONTRACT_DIGEST =
  "548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac";
const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 57125,
  rawSha256: "e394f26f581b517666fec4b8361cba85c6c2761d0dfd06ba5cab23710bafde4d"
});

export const VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json";

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "recordType",
  "contractId",
  "status",
  "createdAt",
  "activeAdmissionEffect",
  "systemIdentity",
  "upstreamBindings",
  "stateModel",
  "transitionRequirements",
  "guardDefinitions",
  "actorRoleRequirements",
  "frozenPacketRequirements",
  "admissionEpochRequirements",
  "receiptEnvelopeRequirements",
  "receiptTypeRequirements",
  "evaluationRequirements",
  "privacyBoundary",
  "supersessionRequirements",
  "requiredUndefined",
  "zeroInstanceState",
  "observationBoundary",
  "integrityBoundary",
  "authorityBoundary",
  "evidenceLedgerSeparation",
  "doesNotEstablish",
  "contractDigest"
]);

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

const ACTOR_ROLE_IDS = Object.freeze([
  "product_owner",
  "vedic_domain_expert",
  "source_rights_reviewer",
  "engineering_reproducibility_reviewer",
  "independent_legal_authority",
  "formal_admission_governance"
]);

const COMMON_RECEIPT_FIELDS = Object.freeze([
  "receiptSchemaVersion",
  "receiptKind",
  "receiptId",
  "operationId",
  "idempotencyKey",
  "generationScopedOperationNonce",
  "systemId",
  "independentProductId",
  "storageNamespaceId",
  "ledgerId",
  "ledgerGenerationId",
  "admissionCycleId",
  "packetSchemaVersion",
  "packetId",
  "packetDigestDomain",
  "packetDigest",
  "packetManifestDigest",
  "selectedValueSetDigest",
  "targetUseProfileDigest",
  "questionSetDigest",
  "sourceBindingManifestDigest",
  "threeLayerRightsEvidenceManifestDigest",
  "validatorProfileSetDigest",
  "privateLifecyclePolicyDigest",
  "distributionOperationSetDigest",
  "targetJurisdictionSetDigest",
  "reviewInstructionAndDisagreementPolicyDigest",
  "requirementIds",
  "requirementSetDigest",
  "invariantIds",
  "invariantSetDigest",
  "conditionIds",
  "conditionSetDigest",
  "evidenceSetDigest",
  "issuerRoleId",
  "protectedIssuerContextRef",
  "authorityEvidenceContextRef",
  "payloadContextRef",
  "payloadDigestDomain",
  "payloadDigest",
  "issuedAtMutationEpoch",
  "custodyRef",
  "validityPolicyId",
  "canonicalizationProfile",
  "digestAlgorithm",
  "receiptDigestDomain",
  "receiptDigest",
  "signatureProfile",
  "signatureContextRef",
  "signingKeyContextRef",
  "trustAnchorSnapshotDigest"
]);

const CAS_PRECONDITION_FIELDS = Object.freeze([
  "storageNamespaceId",
  "ledgerId",
  "ledgerGenerationId",
  "beforeEpoch",
  "previousStateDigest",
  "previousChainHeadDigest",
  "previousRevocationHeadDigest",
  "generationScopedOperationNonce",
  "previousConsumedNonceSetHeadDigest",
  "operationId",
  "idempotencyKey"
]);

const ATOMIC_COMMIT_FIELDS = Object.freeze([
  "nextState",
  "afterEpoch",
  "usedOperationId",
  "usedIdempotencyKey",
  "usedGenerationScopedOperationNonce",
  "nextConsumedNonceSetHeadDigest",
  "receipt",
  "nextChainHeadDigest",
  "nextRevocationHeadDigest",
  "nextSupersessionHeadDigest"
]);

const RECEIPT_KINDS = Object.freeze([
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
  "private_lifecycle_public_non_person_attestation_receipt",
  "admission_epoch_snapshot_receipt",
  "supersession_intent_receipt",
  "supersession_commit_receipt",
  "conditions_one_to_seven_evaluation_receipt",
  "final_readiness_evaluation_receipt"
]);

const TYPE_SPECIFIC_REQUIRED_PAYLOAD_FIELDS = Object.freeze({
  frozen_packet_receipt: Object.freeze([
    "admissionCycleId", "packetId", "packetManifestDigest",
    "requirementSetDigest", "invariantSetDigest", "conditionSetDigest",
    "privacyProjectionDigest"
  ]),
  owner_selection_receipt: Object.freeze([
    "requirementId", "selectedValueDigest", "scopeDigest",
    "targetUseProfileDigest", "decision"
  ]),
  source_or_first_party_binding_receipt: Object.freeze([
    "requirementId", "sourceOrProvenanceMode", "sourceBodyDigest",
    "locatorSetDigest", "minimalQuoteOrFirstPartyRationaleDigest",
    "bindingDigest"
  ]),
  three_layer_rights_evidence_receipt: Object.freeze([
    "requirementId", "workIdentityDigest", "workRightsEvidenceDigest",
    "versionIdentityDigest", "versionRightsEvidenceDigest",
    "carrierIdentityDigest", "carrierRightsEvidenceDigest",
    "distributionDispositionPolicyRef", "evidenceOnlyNotLegalConclusion"
  ]),
  vedic_domain_expert_opinion_binding_receipt: Object.freeze([
    "expertSeatId", "identityEligibilityScopeVerificationRefs",
    "pairwiseIndependenceAssessmentRef", "samePacketAndQuestionSetDigest",
    "sealedOriginalOpinionDigest", "thirteenRequirementCoverageDigest",
    "priorExposureDeclaration"
  ]),
  domain_disagreement_inventory_receipt: Object.freeze([
    "opinionReceiptIds", "parallelAgreementAndDisagreementDigest",
    "unresolvedItemIds", "disposition", "winnerSelected"
  ]),
  source_rights_review_receipt: Object.freeze([
    "reviewerSeatId", "identityEligibilityScopeVerificationRefs",
    "pairwiseIndependenceAssessmentRef", "samePacketDigest",
    "threeLayerEvidenceCoverageDigest", "sealedReviewOpinionDigest"
  ]),
  legal_authority_disposition_receipt: Object.freeze([
    "legalAuthoritySeatId", "identityEligibilityCapacityVerificationRefs",
    "professionalStatusContextRef", "engagementOrMandateContextRef",
    "sourceRightsReviewReceiptIds", "targetUseProfileDigest",
    "targetJurisdictionSetDigest", "applicableLawCandidateSetDigest",
    "lawVersionAndEffectiveDateDigest", "conflictOfLawsAnalysisContextRef",
    "uncoveredJurisdictionIds",
    "materialOperationJurisdictionDispositionMatrixDigest",
    "assumptionsLimitationsAndUnresolvedIssuesDigest",
    "requiredProductRestrictionsDigest",
    "conflictDisclosureAndMitigationDigest", "signedPayloadSha256",
    "signatureOrAttestationMethod", "signatureEvidenceContextRef",
    "keyOrCertificateBindingRef", "signatureVerificationStatus",
    "certificateOrAuthorityRevocationStatusRef"
  ]),
  structural_validator_receipt: Object.freeze([
    "validatorId", "validatorVersion", "validatorByteDigest", "schemaDigest",
    "exactSetCoverageDigest", "failureCorpusDigest", "runnerIdentityDigest",
    "result"
  ]),
  semantic_validator_receipt: Object.freeze([
    "validatorId", "validatorVersion", "validatorByteDigest",
    "invariantSetDigest", "counterexampleCorpusDigest", "coverageDigest",
    "runnerIdentityDigest", "result"
  ]),
  private_lifecycle_public_non_person_attestation_receipt: Object.freeze([
    "payloadClass", "privateLifecycleSchemaDigest", "privateNamespaceClassId",
    "retentionDeletionPolicyDigest", "runtimeCanaryTestCorpusDigest",
    "protectedRuntimeEvidenceContextRef", "evidenceFreshnessPolicyId",
    "revocationLedgerHeadDigest", "publicGovernanceProjectionDigest",
    "candidateInstanceCount", "personalDataFieldCount",
    "personDerivedDigestCount", "candidateInstanceRefs", "personalDataRefs",
    "freeTextFieldsPresent", "result"
  ]),
  admission_epoch_snapshot_receipt: Object.freeze([
    "transitionType", "fromState", "toState", "ledgerGenerationId",
    "beforeEpoch", "afterEpoch",
    "generationScopedOperationNonce", "previousStateDigest",
    "nextStateDigest", "previousChainHeadDigest", "nextChainHeadDigest",
    "previousConsumedNonceSetHeadDigest", "nextConsumedNonceSetHeadDigest",
    "preSnapshotEvidenceManifestDigest", "readSetDigest", "writeSetDigest",
    "revocationLedgerHeadDigest", "atomicityMechanismRef",
    "abaDefenseEvidenceRef", "privateLifecyclePolicyRef",
    "privateLifecyclePublicAttestationReceiptId", "evaluationSnapshotEpoch"
  ]),
  supersession_intent_receipt: Object.freeze([
    "predecessorPacketDigest", "successorPacketDigest", "ownerDecisionDigest",
    "adoptedRestrictionSetDigest",
    "preSupersessionReadinessEvaluationReceiptId"
  ]),
  supersession_commit_receipt: Object.freeze([
    "transitionType", "fromState", "toState", "beforeEpoch", "afterEpoch",
    "previousStateDigest", "nextStateDigest", "previousChainHeadDigest",
    "nextChainHeadDigest", "previousConsumedNonceSetHeadDigest",
    "nextConsumedNonceSetHeadDigest", "revocationLedgerHeadDigest",
    "formalParentPreimageDigest", "formalParentPostimageDigest",
    "registrySlotId", "registryPreimageDigest", "registryPostimageDigest",
    "oldLedgerGenerationId", "newLedgerGenerationId", "transactionContextRef",
    "rollbackContextRef"
  ]),
  conditions_one_to_seven_evaluation_receipt: Object.freeze([
    "transitionType", "fromState", "toState", "beforeEpoch", "afterEpoch",
    "previousStateDigest", "nextStateDigest", "previousChainHeadDigest",
    "nextChainHeadDigest", "previousConsumedNonceSetHeadDigest",
    "nextConsumedNonceSetHeadDigest", "revocationLedgerHeadDigest",
    "preSnapshotEvidenceManifestDigest", "admissionEpochSnapshotReceiptId",
    "privateLifecyclePublicAttestationReceiptId",
    "conditionOneToSevenEvaluationInputManifestDigest",
    "evaluationSnapshotEpoch", "orderedGuardResultDigest",
    "conditionResultDigest", "resultingState", "evaluatorIdentityDigest",
    "authorityEffect"
  ]),
  final_readiness_evaluation_receipt: Object.freeze([
    "transitionType", "fromState", "toState", "beforeEpoch", "afterEpoch",
    "previousStateDigest", "nextStateDigest", "previousChainHeadDigest",
    "nextChainHeadDigest", "previousConsumedNonceSetHeadDigest",
    "nextConsumedNonceSetHeadDigest", "revocationLedgerHeadDigest",
    "conditionsOneToSevenEvaluationReceiptId", "supersessionIntentReceiptId",
    "supersessionCommitReceiptId", "finalEvaluationInputManifestDigest",
    "evaluationSnapshotEpoch", "orderedGuardResultDigest",
    "conditionResultDigest", "resultingState", "evaluatorIdentityDigest",
    "authorityEffect"
  ])
});

const PACKET_REVIEW_CONTENT_BINDING_FIELDS = Object.freeze([
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

const NON_SUCCESS_RECEIPT_KINDS = Object.freeze([
  "evidence_correction_receipt",
  "evidence_withdrawal_receipt",
  "evidence_revocation_receipt",
  "transition_rejection_receipt"
]);

const FORWARD_INVALIDATION_RECEIPT_KINDS = Object.freeze([
  "evidence_correction_receipt",
  "evidence_withdrawal_receipt",
  "evidence_revocation_receipt"
]);

const NO_MUTATION_RECEIPT_KINDS = Object.freeze([
  "transition_rejection_receipt"
]);

const FORWARD_INVALIDATION_REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  "targetReceiptId",
  "targetReceiptDigest",
  "reasonCode",
  "protectedReasonContextRef",
  "previousRevocationLedgerHeadDigest",
  "nextRevocationLedgerHeadDigest",
  "previousConsumedNonceSetHeadDigest",
  "nextConsumedNonceSetHeadDigest",
  "generationScopedOperationNonce",
  "beforeEpoch",
  "afterEpoch"
]);

const CORRECTION_REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  "targetReceiptId",
  "targetReceiptDigest",
  "replacementReceiptId",
  "replacementReceiptDigest",
  "reasonCode",
  "protectedReasonContextRef",
  "previousRevocationLedgerHeadDigest",
  "nextRevocationLedgerHeadDigest",
  "previousConsumedNonceSetHeadDigest",
  "nextConsumedNonceSetHeadDigest",
  "generationScopedOperationNonce",
  "beforeEpoch",
  "afterEpoch"
]);

const REJECTION_REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  "attemptedTransitionId",
  "rejectionCode",
  "failedGuardIds",
  "protectedReasonContextRef",
  "generationScopedOperationNonce",
  "beforeEpoch",
  "afterEpoch",
  "previousStateDigest",
  "nextStateDigest",
  "previousChainHeadDigest",
  "nextChainHeadDigest",
  "previousRevocationLedgerHeadDigest",
  "nextRevocationLedgerHeadDigest",
  "previousConsumedNonceSetHeadDigest",
  "nextConsumedNonceSetHeadDigest"
]);

const REVOCATION_CAS_IDENTITY_RULE = Object.freeze({
  receiptPreviousField: "previousRevocationLedgerHeadDigest",
  casPreviousField: "previousRevocationHeadDigest",
  receiptNextField: "nextRevocationLedgerHeadDigest",
  atomicCommitNextField: "nextRevocationHeadDigest",
  correspondingValuesMustBeExactlyEqual: true
});

const FORWARD_CONSUMED_NONCE_HEAD_RULE =
  "next_must_differ_from_previous_and_advance_atomically_by_adding_only_this_generation_scoped_operation_nonce";

const NON_SUCCESS_TYPE_SPECIFIC_REQUIREMENTS = Object.freeze({
  evidence_correction_receipt: Object.freeze({
    mutationSemantics: "append_only_forward_invalidation_and_replacement",
    afterEpochRule: "before_epoch_plus_one",
    revocationHeadRule: "advance_atomically",
    revocationCasIdentityRule: REVOCATION_CAS_IDENTITY_RULE,
    consumedNonceHeadRule: FORWARD_CONSUMED_NONCE_HEAD_RULE,
    operationNonceRule: "consume_atomically",
    requiredPayloadFields: CORRECTION_REQUIRED_PAYLOAD_FIELDS
  }),
  evidence_withdrawal_receipt: Object.freeze({
    mutationSemantics: "append_only_forward_invalidation",
    afterEpochRule: "before_epoch_plus_one",
    revocationHeadRule: "advance_atomically",
    revocationCasIdentityRule: REVOCATION_CAS_IDENTITY_RULE,
    consumedNonceHeadRule: FORWARD_CONSUMED_NONCE_HEAD_RULE,
    operationNonceRule: "consume_atomically",
    requiredPayloadFields: FORWARD_INVALIDATION_REQUIRED_PAYLOAD_FIELDS
  }),
  evidence_revocation_receipt: Object.freeze({
    mutationSemantics: "append_only_forward_invalidation",
    afterEpochRule: "before_epoch_plus_one",
    revocationHeadRule: "advance_atomically",
    revocationCasIdentityRule: REVOCATION_CAS_IDENTITY_RULE,
    consumedNonceHeadRule: FORWARD_CONSUMED_NONCE_HEAD_RULE,
    operationNonceRule: "consume_atomically",
    requiredPayloadFields: FORWARD_INVALIDATION_REQUIRED_PAYLOAD_FIELDS
  }),
  transition_rejection_receipt: Object.freeze({
    mutationSemantics: "deterministic_no_ledger_mutation_failure_response",
    afterEpochRule: "equals_before_epoch",
    stateDigestRule: "next_equals_previous",
    chainHeadRule: "next_equals_previous",
    revocationHeadRule: "next_equals_previous",
    revocationCasIdentityRule: REVOCATION_CAS_IDENTITY_RULE,
    consumedNonceHeadRule: "next_equals_previous",
    operationNonceRule: "not_consumed",
    requiredPayloadFields: REJECTION_REQUIRED_PAYLOAD_FIELDS
  })
});

const PROHIBITED_PERSONAL_FIELD_CLASSES = Object.freeze([
  "civil_birth_date_year_month_day",
  "local_birth_wall_time_or_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "person_linked_iana_time_zone",
  "place_name_latitude_longitude_or_precision",
  "utc_or_candidate_instant",
  "perturbation_candidate_or_transition_point",
  "name_alias_note_or_other_free_text",
  "person_input_or_candidate_reference"
]);

const PROHIBITED_PERSON_DERIVED_IDENTIFIERS = Object.freeze([
  "candidate_input_digest",
  "personal_payload_digest",
  "birth_data_fingerprint",
  "deterministic_person_linkable_identifier"
]);

const REQUIRED_UNDEFINED_ITEMS = Object.freeze([
  "independentProductIdentity",
  "independentStorageNamespaceId",
  "ledgerId",
  "ledgerGenerationId",
  "trustedMutationCoordinator",
  "externalMonotonicAnchorOrFencingMechanism",
  "frozenPacketIdAndDigest",
  "selectedRequirementValues",
  "sourceBodiesQuotesLocatorsAndBindings",
  "workVersionCarrierIdentitiesAndRightsEvidence",
  "vedicDistributionDispositionVocabulary",
  "realProductOwnerIdentityCapacityAndSignature",
  "realDomainExpertIdentitiesQualificationsOpinionsAndIndependence",
  "realSourceRightsReviewerIdentitiesQualificationsOpinionsAndIndependence",
  "independentLegalAuthorityRoleEligibilityMinimumSeatsJurisdictionCapacityAndSignatureProfiles",
  "executableReceiptSchemaIds",
  "transitionEvaluatorIdentityAndDigest",
  "formalParentTargetIdentityVersionAndDigest",
  "centralRegistryTargetSlotAndSchema",
  "supersessionTransactionMechanism",
  "vedicTargetSchema",
  "vedicMigrationId",
  "vedicReleaseIdentity"
]);

const VERIFIED_RESULTS = new WeakSet();

export class VedicInputAdmissionTransitionAndReceiptRequirementsError extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "VedicInputAdmissionTransitionAndReceiptRequirementsError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicInputAdmissionTransitionAndReceiptRequirementsError(
    code,
    message,
    cause
  );
}

function canonicalStringify(value) {
  try {
    return canonicalStringifyVedicProductizationRequirements(value);
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError) {
      throw cause;
    }
    fail(
      "NON_CANONICAL_JSON",
      "吠陀输入准入 transition/receipt 要求只接受有限、被动、无 active cycle 的 JSON 值。",
      cause
    );
  }
}

function canonicalValue(value) {
  try {
    return JSON.parse(canonicalStringify(value));
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError) {
      throw cause;
    }
    fail("NON_CANONICAL_JSON", "无法形成吠陀 transition/receipt 规范 JSON 快照。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "冻结前发现 accessor。 ");
    }
    deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function isRecursivelyFrozenPassive(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)
        || !isRecursivelyFrozenPassive(descriptor.value, seen)) return false;
    }
  } catch {
    return false;
  }
  return true;
}

function requirePlainRecord(value, code, label) {
  let invalid;
  try {
    invalid = value === null || typeof value !== "object"
      || Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype;
  } catch (cause) {
    fail(code, label + " 无法作为被动普通 JSON 对象检查。", cause);
  }
  if (invalid) fail(code, label + " 必须是普通 JSON 对象。");
  return value;
}

function requireExactKeys(value, expected, code, label) {
  const record = requirePlainRecord(value, code, label);
  let actual;
  try {
    actual = Object.keys(record).sort();
  } catch (cause) {
    fail(code, label + " 的字段无法安全枚举。", cause);
  }
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail(code, label + " 含缺失、陈旧或额外字段。");
  }
  return record;
}

function requireExactStringSet(value, expected, code, label) {
  if (!Array.isArray(value) || value.length !== expected.length
    || value.some((entry) => typeof entry !== "string")
    || new Set(value).size !== value.length
    || value.some((entry, index) => entry !== expected[index])) {
    fail(code, label + " 必须保持 exact ordered unique set。");
  }
}

function requireEmptyArray(value, code, label) {
  if (!Array.isArray(value) || value.length !== 0) {
    fail(code, label + " 必须保持空数组。");
  }
}

function domainSeparatedDigest(value) {
  return createHash("sha256")
    .update(CONTRACT_DIGEST_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

export function computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(
  value
) {
  const unsigned = canonicalValue(value);
  delete unsigned.contractDigest;
  return domainSeparatedDigest(unsigned);
}

export function canonicalStringifyVedicInputAdmissionTransitionAndReceiptRequirements(
  value
) {
  return canonicalStringify(value);
}

export function canonicalPrettyStringifyVedicInputAdmissionTransitionAndReceiptRequirements(
  value
) {
  canonicalStringify(value);
  return JSON_STRINGIFY.call(JSON, value, null, 2) + "\n";
}

export function parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
  bytes,
  _callerLabel = INTERNAL_JSON_LABEL,
  maxBytes = MAX_CONTRACT_BYTES
) {
  try {
    return parseVedicProductizationRequirementsJsonBytes(
      bytes,
      INTERNAL_JSON_LABEL,
      maxBytes
    );
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError) {
      throw cause;
    }
    const code = typeof cause?.code === "string" ? cause.code : "JSON_INVALID";
    fail(
      code,
      code === "JSON_TOO_LARGE"
        ? INTERNAL_JSON_LABEL + " 超过输入上限。"
        : INTERNAL_JSON_LABEL + " 不符合严格 UTF-8/无 BOM/无重复键 JSON 字节边界。",
      cause
    );
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length < 1
    || relativePath.length > 400 || relativePath.includes("\0")
    || relativePath.includes("\\") || relativePath.includes(":")
    || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some((segment) =>
      segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀 transition/receipt 要求文件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".."
    || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀 transition/receipt 要求路径越出工作区。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".."
    && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino
    && left.nlink === right.nlink && left.size === right.size
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function isStatsType(metadata, expectedType) {
  return metadata !== null && typeof metadata === "object"
    && Number.isSafeInteger(metadata.mode)
    && (metadata.mode & fsConstants.S_IFMT) === expectedType;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, invalidCode, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, label + " 的目录链越出工作区。");
  }
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor);
    if (isStatsType(metadata, fsConstants.S_IFLNK)
      || !isStatsType(metadata, fsConstants.S_IFDIR)) {
      fail(invalidCode, label + " 的目录链不能包含链接、junction 或特殊端点。");
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, label + " 的目录链 realpath 越出工作区。");
    }
    endpoints.push(Object.freeze({ absolutePath: cursor, metadata, resolvedPath }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath
      && sameEndpoint(entry.metadata, other.metadata);
  });
}

function openFileDescriptor(absolutePath, flags) {
  return new Promise((resolve, reject) => {
    openFileDescriptorCallback(absolutePath, flags, (error, descriptor) => {
      if (error) reject(error);
      else resolve(descriptor);
    });
  });
}

function statFileDescriptor(descriptor) {
  return new Promise((resolve, reject) => {
    statFileDescriptorCallback(descriptor, (error, metadata) => {
      if (error) reject(error);
      else resolve(metadata);
    });
  });
}

function readFileDescriptor(descriptor, buffer, offset, length, position) {
  return new Promise((resolve, reject) => {
    readFileDescriptorCallback(
      descriptor,
      buffer,
      offset,
      length,
      position,
      (error, bytesRead) => {
        if (error) reject(error);
        else resolve(bytesRead);
      }
    );
  });
}

function closeFileDescriptor(descriptor) {
  return new Promise((resolve, reject) => {
    closeFileDescriptorCallback(descriptor, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function readExactOpenedSize(descriptor, expectedSize, invalidCode, label) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
    fail(invalidCode, label + " 的已打开文件尺寸无效。");
  }
  const bytes = Buffer.allocUnsafe(expectedSize);
  let total = 0;
  while (total < expectedSize) {
    const bytesRead = await readFileDescriptor(
      descriptor,
      bytes,
      total,
      expectedSize - total,
      total
    );
    if (bytesRead === 0) fail(invalidCode, label + " 在 held-handle 读取期间提前截断。");
    total += bytesRead;
  }
  const growthProbe = Buffer.allocUnsafe(1);
  const growthBytesRead = await readFileDescriptor(
    descriptor,
    growthProbe,
    0,
    1,
    expectedSize
  );
  if (growthBytesRead !== 0) fail(invalidCode, label + " 在 held-handle 读取期间增长。");
  return bytes;
}

async function runTestOnlyReadPhaseHook(options, phase) {
  const descriptor = Object.getOwnPropertyDescriptor(options, "testOnlyReadPhaseHook");
  if (descriptor === undefined) return;
  if (!("value" in descriptor) || typeof descriptor.value !== "function") {
    fail("TEST_ONLY_READ_HOOK_INVALID", "test-only held-read hook 必须是 data function。");
  }
  try {
    await descriptor.value(phase);
  } catch (cause) {
    fail("TEST_ONLY_READ_HOOK_FAILED", "test-only held-read hook 执行失败。", cause);
  }
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_CONTRACT_BYTES,
  options = {}
) {
  const invalidCode = options.invalidCode ?? "ARTIFACT_ENDPOINT_INVALID";
  const missingCode = options.missingCode ?? "ARTIFACT_MISSING";
  const label = options.label ?? relativePath;
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    before = await lstat(absolute);
    actual = await realpath(absolute);
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError) {
      throw cause;
    }
    fail(missingCode, label + " 不存在。", cause);
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual) || isStatsType(before, fsConstants.S_IFLNK)
    || !isStatsType(before, fsConstants.S_IFREG) || before.nlink !== 1
    || before.size <= 0 || before.size > maxBytes) {
    fail(invalidCode, label + " 必须是工作区内独立普通小文件。");
  }

  const descriptor = await openFileDescriptor(actual, "r");
  try {
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[0]);
    const opened = await statFileDescriptor(descriptor);
    if (!isStatsType(opened, fsConstants.S_IFREG) || opened.nlink !== 1
      || !sameEndpoint(before, opened)) {
      fail(invalidCode, label + " 在打开前发生身份换绑。");
    }
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[1]);
    const bytes = await readExactOpenedSize(descriptor, opened.size, invalidCode, label);
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[2]);
    const revalidatedBytes = await readExactOpenedSize(
      descriptor,
      opened.size,
      invalidCode,
      label
    );
    if (Buffer.compare(bytes, revalidatedBytes) !== 0) {
      fail(invalidCode, label + " 在 held-handle 双读取之间发生内容变化。");
    }
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      statFileDescriptor(descriptor),
      lstat(absolute),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label)
    ]);
    if (isStatsType(afterPath, fsConstants.S_IFLNK)
      || !isStatsType(afterPath, fsConstants.S_IFREG) || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, label + " 在 held-handle 读取区间发生变化。");
    }
    return Object.freeze({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex")
    });
  } finally {
    await closeFileDescriptor(descriptor);
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef
    && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", label + " 不得包含 UTF-8 BOM。");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function requireAllFalseExact(value, keys, code, label) {
  const record = requireExactKeys(value, keys, code, label);
  if (keys.some((key) => record[key] !== false)) {
    fail(code, label + " 必须逐项保持 false。");
  }
  return record;
}

function requireSystemIdentity(contract) {
  const identity = requireExactKeys(contract.systemIdentity, [
    "systemId",
    "independentFromBaziZiweiWestern",
    "crossSystemAuthorityInheritanceAllowed",
    "independentProductIdentity",
    "independentStorageNamespaceId",
    "targetSchema",
    "migrationId",
    "releaseIdentity",
    "projectReleaseGovernanceContext"
  ], "SYSTEM_IDENTITY_MISMATCH", "systemIdentity");
  const context = requireExactKeys(identity.projectReleaseGovernanceContext, [
    "activeRulePackId", "targetSchema", "migrationId",
    "contextOnlyNotInheritedByVedic"
  ], "SYSTEM_IDENTITY_MISMATCH", "projectReleaseGovernanceContext");
  if (identity.systemId !== "vedic"
    || identity.independentFromBaziZiweiWestern !== true
    || identity.crossSystemAuthorityInheritanceAllowed !== false
    || identity.independentProductIdentity !== null
    || identity.independentStorageNamespaceId !== null
    || identity.targetSchema !== null
    || identity.migrationId !== null
    || identity.releaseIdentity !== null
    || context.activeRulePackId !== "legacy-v13"
    || context.targetSchema !== 13
    || context.migrationId !== null
    || context.contextOnlyNotInheritedByVedic !== true) {
    fail("SYSTEM_IDENTITY_MISMATCH", "Vedic 独立身份或 legacy-v13 项目上下文边界漂移。");
  }
}

function requireRawBinding(value, expected, label) {
  requireExactKeys(value, [
    "path", "bytes", "sha256", "semanticDigestField", "semanticDigest", "role"
  ], "UPSTREAM_BINDING_MISMATCH", label);
  if (!exactJson(value, expected)) {
    fail("UPSTREAM_BINDING_MISMATCH", label + " 与冻结上游身份不一致。");
  }
}

function requireUpstreamBindings(contract) {
  const bindings = requireExactKeys(contract.upstreamBindings, [
    "bindingDirection",
    "directBindingCount",
    "readinessCandidate",
    "storageDesignCandidate",
    "readinessTransitiveEndpointListCopied",
    "browserAndFixedProbeContextOnlyViaReadiness",
    "upstreamsBacklinkThisContract",
    "contractRewritesUpstreams"
  ], "UPSTREAM_BINDING_MISMATCH", "upstreamBindings");
  if (bindings.bindingDirection
      !== "exact_current_upstream_snapshots_to_requirements_contract_only"
    || bindings.directBindingCount !== 2
    || bindings.readinessTransitiveEndpointListCopied !== false
    || bindings.browserAndFixedProbeContextOnlyViaReadiness !== true
    || bindings.upstreamsBacklinkThisContract !== false
    || bindings.contractRewritesUpstreams !== false) {
    fail("UPSTREAM_BINDING_MISMATCH", "上游绑定方向、计数或非反向修改边界漂移。");
  }
  requireRawBinding(bindings.readinessCandidate, {
    path: VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
    bytes: 35325,
    sha256: "7f42750a2d11a64bc9ad2cdbef5838aa7081d60fd314c44647079eae426f19dd",
    semanticDigestField: "candidateDigest",
    semanticDigest: "688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb",
    role: "thirteen_requirement_twenty_six_invariant_eight_condition_zero_readiness_parent"
  }, "readinessCandidate");
  requireRawBinding(bindings.storageDesignCandidate, {
    path:
      VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
    bytes: 25978,
    sha256: "1eeaf1419ce4b3ae01f277f6389fc3bbdf5a59605f89d4c7ae7eccfc1a8d1bbf",
    semanticDigestField: "designDigest",
    semanticDigest: "5a96993f7750722a984eb6f5845ce1e49e6c5f49e5b49735629698a47eb11958",
    role: "mutation_epoch_backup_recovery_rollback_requirements_only_zero_implementation_parent"
  }, "storageDesignCandidate");
}

function requireStateTransitionAndGuards(contract) {
  const state = requireExactKeys(contract.stateModel, [
    "modelType", "currentProjection", "stateMachineImplemented", "stateInstances",
    "futureStateDefinitions", "positiveStateNamesMayUseAdmittedAuthorizedReady",
    "conditionsAreNecessaryNotSufficient", "formalAdmissionRequiresSeparateVersionedTransition"
  ], "STATE_MODEL_MISMATCH", "stateModel");
  requireEmptyArray(state.stateInstances, "STATE_MODEL_MISMATCH", "stateInstances");
  const stateIds = [
    "uninstantiated",
    "packet_frozen_receipts_incomplete",
    "pre_snapshot_evidence_manifest_complete_unverified",
    "conditions_1_to_7_verified_supersession_pending",
    "all_eight_conditions_mechanically_verified_input_gate_candidate",
    "invalidated_new_packet_and_epoch_required"
  ];
  if (state.modelType
      !== "future_fail_closed_transition_requirements_only_no_runtime_state_machine"
    || state.currentProjection !== "requirements_only_not_instantiated"
    || state.stateMachineImplemented !== false
    || state.positiveStateNamesMayUseAdmittedAuthorizedReady !== false
    || state.conditionsAreNecessaryNotSufficient !== true
    || state.formalAdmissionRequiresSeparateVersionedTransition !== true
    || !Array.isArray(state.futureStateDefinitions)
    || state.futureStateDefinitions.length !== stateIds.length
    || state.futureStateDefinitions.some((entry, index) => {
      requireExactKeys(entry, ["stateId", "authorityEffect", "terminal"],
        "STATE_MODEL_MISMATCH", "futureStateDefinitions[" + index + "]");
      return entry.stateId !== stateIds[index]
        || entry.authorityEffect !== "none"
        || entry.terminal !== (index === stateIds.length - 1);
    })) {
    fail("STATE_MODEL_MISMATCH", "未来状态定义或零实现边界漂移。");
  }

  const transitions = requireExactKeys(contract.transitionRequirements, [
    "transitionEvaluatorImplemented", "transitionInstances",
    "evidenceCollectionIsOverwriteTransition", "evidenceCollectionMode",
    "futureTransitionDefinitions", "invalidationTriggers",
    "invalidatedStateMayReturnInPlace", "recoveryRequiresNewCyclePacketEpochAndEvaluation"
  ], "TRANSITION_REQUIREMENTS_MISMATCH", "transitionRequirements");
  requireEmptyArray(transitions.transitionInstances,
    "TRANSITION_REQUIREMENTS_MISMATCH", "transitionInstances");
  if (transitions.transitionEvaluatorImplemented !== false
    || transitions.evidenceCollectionIsOverwriteTransition !== false
    || transitions.evidenceCollectionMode
      !== "append_only_until_pre_snapshot_evidence_manifest_sealed"
    || transitions.invalidatedStateMayReturnInPlace !== false
    || transitions.recoveryRequiresNewCyclePacketEpochAndEvaluation !== true
    || !Array.isArray(transitions.futureTransitionDefinitions)
    || transitions.futureTransitionDefinitions.length !== 5
    || !exactJson(transitions.futureTransitionDefinitions, [
      {
        transitionId: "freeze_packet",
        fromStateIds: ["uninstantiated"],
        toStateId: "packet_frozen_receipts_incomplete",
        requiredGuardIds: [
          "packet_exact_identity",
          "packet_review_content_exact_identity",
          "no_person_input_instance_in_governance_packet",
          "unknown_missing_ambiguous_means_false"
        ],
        authorityEffect: "none"
      },
      {
        transitionId: "seal_pre_snapshot_evidence_manifest",
        fromStateIds: ["packet_frozen_receipts_incomplete"],
        toStateId: "pre_snapshot_evidence_manifest_complete_unverified",
        requiredGuardIds: [
          "same_cycle_and_packet_for_every_receipt",
          "pre_snapshot_evidence_manifest_closed",
          "manifest_layer_exact_set_coverage",
          "no_active_correction_withdrawal_or_revocation"
        ],
        authorityEffect: "none"
      },
      {
        transitionId: "verify_conditions_1_to_7",
        fromStateIds: ["pre_snapshot_evidence_manifest_complete_unverified"],
        toStateId: "conditions_1_to_7_verified_supersession_pending",
        requiredGuardIds: [
          "evaluation_snapshot_exact_identity",
          "actor_role_eligible_authenticated_and_scope_allowed",
          "required_distinct_actors_verified",
          "disagreements_preserved_and_non_automatic",
          "private_lifecycle_public_attestation_valid",
          "acyclic_manifest_layering",
          "epoch_atomicity_interval_and_aba_receipt_valid"
        ],
        authorityEffect: "none"
      },
      {
        transitionId: "verify_supersession_projection",
        fromStateIds: ["conditions_1_to_7_verified_supersession_pending"],
        toStateId: "all_eight_conditions_mechanically_verified_input_gate_candidate",
        requiredGuardIds: [
          "supersession_parent_registry_transaction_valid",
          "all_eight_conditions_necessary_not_sufficient"
        ],
        authorityEffect: "none"
      },
      {
        transitionId: "invalidate",
        fromStateIds: [
          "packet_frozen_receipts_incomplete",
          "pre_snapshot_evidence_manifest_complete_unverified",
          "conditions_1_to_7_verified_supersession_pending",
          "all_eight_conditions_mechanically_verified_input_gate_candidate"
        ],
        toStateId: "invalidated_new_packet_and_epoch_required",
        requiredGuardIds: ["append_only_invalidation_forward_epoch"],
        authorityEffect: "none"
      }
    ])
    || !exactJson(transitions.invalidationTriggers, [
      "packet_value_or_manifest_drift",
      "new_evidence_after_pre_snapshot_evidence_manifest_seal",
      "evidence_correction",
      "evidence_withdrawal",
      "evidence_revocation",
      "receipt_replacement",
      "actor_eligibility_or_authenticity_change",
      "trust_anchor_or_key_revocation_change",
      "ledger_generation_or_evaluation_snapshot_drift"
    ])) {
    fail("TRANSITION_REQUIREMENTS_MISMATCH", "future transition 必须保持仅要求、append-only 与零权限效果。");
  }

  const guards = requireExactKeys(contract.guardDefinitions, [
    "allGuardsRequired", "guardEvaluatorImplemented", "guardInstances",
    "failureDisposition", "orderedGuards"
  ], "GUARD_DEFINITIONS_MISMATCH", "guardDefinitions");
  requireEmptyArray(guards.guardInstances,
    "GUARD_DEFINITIONS_MISMATCH", "guardInstances");
  if (guards.allGuardsRequired !== true
    || guards.guardEvaluatorImplemented !== false
    || guards.failureDisposition !== "not_ready_no_product_receipt"
    || !Array.isArray(guards.orderedGuards)
    || guards.orderedGuards.length !== 21
    || new Set(guards.orderedGuards.map((entry) => entry?.guardId)).size !== 21
    || guards.orderedGuards.some((entry, index) => {
      requireExactKeys(entry, ["order", "guardId", "requirement", "currentSatisfied"],
        "GUARD_DEFINITIONS_MISMATCH", "orderedGuards[" + index + "]");
      return entry.order !== index + 1
        || typeof entry.guardId !== "string" || entry.guardId.length === 0
        || typeof entry.requirement !== "string" || entry.requirement.length === 0
        || entry.currentSatisfied !== false;
    })) {
    fail("GUARD_DEFINITIONS_MISMATCH", "21 个 ordered guards 必须唯一且全部未满足。");
  }
  requireExactStringSet(
    guards.orderedGuards.map((entry) => entry.guardId),
    [
      "strict_bytes_parser_and_canonical_materialization",
      "vedic_identity_no_cross_system_fallback",
      "packet_exact_identity",
      "same_cycle_and_packet_for_every_receipt",
      "pre_snapshot_evidence_manifest_closed",
      "manifest_layer_exact_set_coverage",
      "actor_role_eligible_authenticated_and_scope_allowed",
      "required_distinct_actors_verified",
      "disagreements_preserved_and_non_automatic",
      "no_active_correction_withdrawal_or_revocation",
      "evaluation_snapshot_exact_identity",
      "epoch_atomicity_interval_and_aba_receipt_valid",
      "replay_idempotency_restore_and_fork_safe",
      "no_person_input_instance_in_governance_packet",
      "append_only_invalidation_forward_epoch",
      "supersession_parent_registry_transaction_valid",
      "all_eight_conditions_necessary_not_sufficient",
      "unknown_missing_ambiguous_means_false",
      "packet_review_content_exact_identity",
      "acyclic_manifest_layering",
      "private_lifecycle_public_attestation_valid"
    ],
    "GUARD_DEFINITIONS_MISMATCH",
    "ordered guard ids"
  );
  const guardIds = new Set(guards.orderedGuards.map((entry) => entry.guardId));
  if (transitions.futureTransitionDefinitions.some((entry) =>
    !Array.isArray(entry.requiredGuardIds)
      || entry.requiredGuardIds.some((guardId) => !guardIds.has(guardId)))) {
    fail("TRANSITION_REQUIREMENTS_MISMATCH", "future transition 引用了未定义 guard。");
  }
}

function requireActorRoles(contract) {
  const actors = requireExactKeys(contract.actorRoleRequirements, [
    "roleInstances", "seatInstances", "identityVerificationInstances",
    "eligibilityVerificationInstances", "signatureVerificationInstances", "roles",
    "requiredActorBindingFields", "signerMayVerifyOwnEligibility",
    "rawIdentityCredentialsOrContactDataMayEnterPublicRepository",
    "generativeModelMayOccupyAnyRoleOrSeat"
  ], "ACTOR_ROLE_REQUIREMENTS_MISMATCH", "actorRoleRequirements");
  for (const field of [
    "roleInstances", "seatInstances", "identityVerificationInstances",
    "eligibilityVerificationInstances", "signatureVerificationInstances"
  ]) requireEmptyArray(actors[field], "ACTOR_ROLE_REQUIREMENTS_MISMATCH", field);
  if (!Array.isArray(actors.roles) || actors.roles.length !== ACTOR_ROLE_IDS.length
    || actors.roles.some((role, index) => role?.roleId !== ACTOR_ROLE_IDS[index]
      || role.currentSeatCount !== 0)
    || actors.signerMayVerifyOwnEligibility !== false
    || actors.rawIdentityCredentialsOrContactDataMayEnterPublicRepository !== false
    || actors.generativeModelMayOccupyAnyRoleOrSeat !== false) {
    fail("ACTOR_ROLE_REQUIREMENTS_MISMATCH", "五权威角色与 formal projection actor 必须 exact、零席位且无自证。");
  }
  const legal = actors.roles[4];
  requireExactKeys(legal, [
    "roleId", "minimumSeatCount", "allowedScopes", "forbiddenScopes",
    "currentSeatCount", "roleDefinitionStatus", "eligibilityPolicyRef",
    "jurisdictionPolicyRef", "capacityPolicyRef", "signatureProfileRef"
  ], "LEGAL_ROLE_REQUIRED_UNDEFINED_MISMATCH", "independent_legal_authority");
  if (legal.minimumSeatCount !== "required_undefined"
    || legal.roleDefinitionStatus !== "required_undefined"
    || legal.eligibilityPolicyRef !== null
    || legal.jurisdictionPolicyRef !== null
    || legal.capacityPolicyRef !== null
    || legal.signatureProfileRef !== null) {
    fail("LEGAL_ROLE_REQUIRED_UNDEFINED_MISMATCH", "独立法律角色必须保持 required_undefined 与引用空缺。");
  }
}

function requireFrozenPacket(contract) {
  const packet = requireExactKeys(contract.frozenPacketRequirements, [
    "currentAdmissionCycleId", "currentPacketId", "currentPacketDigest",
    "currentPacketInstances", "packetScope", "requiredFields",
    "reviewContentBindingFields",
    "requirementCount", "requirementIds", "invariantCount", "invariantIds",
    "conditionCount", "conditionIds", "exactSetEqualityRequired",
    "countsAloneSufficient", "packetChangeRequiresNewAdmissionCycle",
    "oldOpinionsAutomaticallyCarryForward", "candidateInputInstancesAllowed"
  ], "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "frozenPacketRequirements");
  requireEmptyArray(packet.currentPacketInstances,
    "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "currentPacketInstances");
  requireExactStringSet(packet.requirementIds, REQUIREMENT_IDS,
    "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "requirementIds");
  requireExactStringSet(packet.invariantIds, INVARIANT_IDS,
    "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "invariantIds");
  requireExactStringSet(packet.conditionIds, CONDITION_IDS,
    "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "conditionIds");
  requireExactStringSet(
    packet.reviewContentBindingFields,
    PACKET_REVIEW_CONTENT_BINDING_FIELDS,
    "FROZEN_PACKET_REQUIREMENTS_MISMATCH",
    "reviewContentBindingFields"
  );
  requireExactStringSet(packet.requiredFields, [
    "admissionCycleId",
    "packetSchemaVersion",
    "packetId",
    "packetManifestDigest",
    "packetDigestDomain",
    "packetDigest",
    "requirementSetDigest",
    "invariantSetDigest",
    "conditionSetDigest",
    "receiptTypeRequirementSetDigest",
    "privacyProjectionDigest",
    ...PACKET_REVIEW_CONTENT_BINDING_FIELDS,
    "frozenAt",
    "custodyRef"
  ], "FROZEN_PACKET_REQUIREMENTS_MISMATCH", "requiredFields");
  if (packet.currentAdmissionCycleId !== null
    || packet.currentPacketId !== null
    || packet.currentPacketDigest !== null
    || packet.packetScope !== "system_governance_policy_only_no_person_input_instances"
    || packet.requirementCount !== 13 || packet.invariantCount !== 26
    || packet.conditionCount !== 8 || packet.exactSetEqualityRequired !== true
    || packet.countsAloneSufficient !== false
    || packet.packetChangeRequiresNewAdmissionCycle !== true
    || packet.oldOpinionsAutomaticallyCarryForward !== false
    || packet.candidateInputInstancesAllowed !== 0
    || packet.reviewContentBindingFields.some((field) =>
      !packet.requiredFields.includes(field))) {
    fail("FROZEN_PACKET_REQUIREMENTS_MISMATCH", "13/26/8 exact-set 或零个人实例 packet 边界漂移。");
  }
}

function requireNonSuccessLifecycleReceiptRequirements(value) {
  const nonSuccess = requireExactKeys(
    value,
    [
      "currentInstances", "mayEnterSuccessExactSet", "receiptKinds",
      "forwardInvalidationReceiptKinds", "noMutationReceiptKinds",
      "typeSpecificRequirements", "unrevokeAllowed",
      "deletionOrOverwriteOfTargetAllowed",
      "failedTransitionChangesAnyAtomicCommitField"
    ],
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements"
  );
  requireEmptyArray(
    nonSuccess.currentInstances,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements.currentInstances"
  );
  requireExactStringSet(
    nonSuccess.receiptKinds,
    NON_SUCCESS_RECEIPT_KINDS,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements.receiptKinds"
  );
  requireExactStringSet(
    nonSuccess.forwardInvalidationReceiptKinds,
    FORWARD_INVALIDATION_RECEIPT_KINDS,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements.forwardInvalidationReceiptKinds"
  );
  requireExactStringSet(
    nonSuccess.noMutationReceiptKinds,
    NO_MUTATION_RECEIPT_KINDS,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements.noMutationReceiptKinds"
  );
  requireExactKeys(
    nonSuccess.typeSpecificRequirements,
    NON_SUCCESS_RECEIPT_KINDS,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "nonSuccessLifecycleReceiptRequirements.typeSpecificRequirements"
  );
  if (!exactJson(
    nonSuccess.typeSpecificRequirements,
    NON_SUCCESS_TYPE_SPECIFIC_REQUIREMENTS
  )) {
    fail(
      "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
      "四种 non-success lifecycle receipt 必须逐 kind 保持 exact mutation requirements。"
    );
  }
  if (nonSuccess.mayEnterSuccessExactSet !== false
    || nonSuccess.unrevokeAllowed !== false
    || nonSuccess.deletionOrOverwriteOfTargetAllowed !== false
    || nonSuccess.failedTransitionChangesAnyAtomicCommitField !== false) {
    fail(
      "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
      "non-success lifecycle receipt 必须保持零成功集合、不可撤销和失败零原子变更边界。"
    );
  }
  return nonSuccess;
}

function requireEpochReceiptAndEvaluation(contract) {
  const epoch = requireExactKeys(contract.admissionEpochRequirements, [
    "identityPlanesMustRemainSeparate", "identityPlanes",
    "currentLedgerGenerationId", "currentMutationEpoch",
    "currentEvaluationSnapshotEpoch", "currentConsumedNonceSetHeadDigest",
    "mutationEpochAvailable", "mutationEpochReceipt", "mutationEpochReceiptsIssued",
    "operationNoncesConsumed", "crossFileAtomicSnapshot",
    "intervalMutationExcluded", "abaExcluded", "singleWriterFencingEstablished",
    "externalMonotonicAnchorEstablished",
    "offlineCloneOrOldBackupRollbackResistanceEstablished",
    "runtimeImplementationInstances", "futureCasPreconditionFields",
    "futureAtomicCommitFields", "successfulMutationAdvancesEpochByExactlyOne",
    "failedMutationChangesNoAtomicCommitField",
    "sameStateDigestAfterAbaStillRequiresDifferentEpochAndChainHead",
    "generationScopedNonceRequired", "consumedNonceHeadCommittedAtomically",
    "restoreAndRollbackAreForwardMutations",
    "evidenceIssuedAtMutationEpochMayPrecedeEvaluationSnapshot",
    "allEvidenceMustHaveSameIssuanceMutationEpoch",
    "allEvidenceMustBeReverifiedAtSameEvaluationSnapshotEpoch"
  ], "ADMISSION_EPOCH_REQUIREMENTS_MISMATCH", "admissionEpochRequirements");
  requireExactStringSet(epoch.futureCasPreconditionFields, CAS_PRECONDITION_FIELDS,
    "ADMISSION_EPOCH_REQUIREMENTS_MISMATCH", "futureCasPreconditionFields");
  requireExactStringSet(epoch.futureAtomicCommitFields, ATOMIC_COMMIT_FIELDS,
    "ADMISSION_EPOCH_REQUIREMENTS_MISMATCH", "futureAtomicCommitFields");
  const expectedPlanes = [
    ["admission_cycle_and_packet", ["admissionCycleId", "packetId", "packetDigest"]],
    ["ledger_mutation_clock", ["ledgerGenerationId", "mutationEpoch", "stateDigest", "chainHeadDigest"]],
    ["evaluation_snapshot", ["evaluationSnapshotEpoch", "snapshotDigest", "evaluationInputManifestDigest", "revocationLedgerHeadDigest"]]
  ];
  if (epoch.identityPlanesMustRemainSeparate !== true
    || !Array.isArray(epoch.identityPlanes) || epoch.identityPlanes.length !== 3
    || epoch.identityPlanes.some((plane, index) => {
      requireExactKeys(plane, ["planeId", "requiredIdentityFields", "purpose"],
        "ADMISSION_EPOCH_REQUIREMENTS_MISMATCH", "identityPlanes[" + index + "]");
      return plane.planeId !== expectedPlanes[index][0]
        || !exactJson(plane.requiredIdentityFields, expectedPlanes[index][1]);
    })
    || epoch.currentLedgerGenerationId !== null
    || epoch.currentMutationEpoch !== null
    || epoch.currentEvaluationSnapshotEpoch !== null
    || epoch.currentConsumedNonceSetHeadDigest !== null
    || epoch.mutationEpochAvailable !== false
    || epoch.mutationEpochReceipt !== null
    || epoch.mutationEpochReceiptsIssued !== 0
    || epoch.operationNoncesConsumed !== 0
    || epoch.crossFileAtomicSnapshot !== false
    || epoch.intervalMutationExcluded !== false
    || epoch.abaExcluded !== false
    || epoch.singleWriterFencingEstablished !== false
    || epoch.externalMonotonicAnchorEstablished !== false
    || epoch.offlineCloneOrOldBackupRollbackResistanceEstablished !== false
    || epoch.runtimeImplementationInstances !== 0
    || epoch.successfulMutationAdvancesEpochByExactlyOne !== true
    || epoch.failedMutationChangesNoAtomicCommitField !== true
    || epoch.sameStateDigestAfterAbaStillRequiresDifferentEpochAndChainHead !== true
    || epoch.generationScopedNonceRequired !== true
    || epoch.consumedNonceHeadCommittedAtomically !== true
    || epoch.restoreAndRollbackAreForwardMutations !== true
    || epoch.evidenceIssuedAtMutationEpochMayPrecedeEvaluationSnapshot !== true
    || epoch.allEvidenceMustHaveSameIssuanceMutationEpoch !== false
    || epoch.allEvidenceMustBeReverifiedAtSameEvaluationSnapshotEpoch !== true) {
    fail("ADMISSION_EPOCH_REQUIREMENTS_MISMATCH", "三层 epoch、A→B→A、replay 或 runtime 全红边界漂移。");
  }

  const envelope = requireExactKeys(contract.receiptEnvelopeRequirements, [
    "draftReceiptEnvelopeRequirementsDefined", "executableReceiptSchema",
    "executableReceiptSchemaIds", "acceptedOrGateSatisfiedMayBeIssuerSupplied",
    "authenticMayBeIssuerSupplied", "commonRequiredFields",
    "aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements",
    "lifecycleFieldsAreReceiptKindSpecific",
    "opaqueProtectedContextRefsRequired",
    "rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope",
    "receiptDigestIsDigitalSignature",
    "digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth",
    "receiptIdMinimumRandomBits", "receiptIdMayDeriveFromPersonalData",
    "operationNonceMayDeriveFromPersonalData"
  ], "RECEIPT_ENVELOPE_REQUIREMENTS_MISMATCH", "receiptEnvelopeRequirements");
  requireEmptyArray(envelope.executableReceiptSchemaIds,
    "RECEIPT_ENVELOPE_REQUIREMENTS_MISMATCH", "executableReceiptSchemaIds");
  requireExactStringSet(envelope.commonRequiredFields, COMMON_RECEIPT_FIELDS,
    "RECEIPT_ENVELOPE_REQUIREMENTS_MISMATCH", "commonRequiredFields");
  if (envelope.draftReceiptEnvelopeRequirementsDefined !== true
    || envelope.executableReceiptSchema !== false
    || envelope.acceptedOrGateSatisfiedMayBeIssuerSupplied !== false
    || envelope.authenticMayBeIssuerSupplied !== false
    || envelope.aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements
      !== true
    || envelope.lifecycleFieldsAreReceiptKindSpecific !== true
    || envelope.opaqueProtectedContextRefsRequired !== true
    || envelope.rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope !== false
    || envelope.receiptDigestIsDigitalSignature !== false
    || envelope.digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth !== false
    || envelope.receiptIdMinimumRandomBits !== 128
    || envelope.receiptIdMayDeriveFromPersonalData !== false
    || envelope.operationNonceMayDeriveFromPersonalData !== false) {
    fail("RECEIPT_ENVELOPE_REQUIREMENTS_MISMATCH", "draft-only receipt envelope 或隐私/真实性边界漂移。");
  }

  const types = requireExactKeys(contract.receiptTypeRequirements, [
    "requirementsOnlyNoExecutableSchemas", "receiptInstances", "acceptedReceipts",
    "successFamiliesFormOneFlatManifest",
    "successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput",
    "typeSpecificRequiredPayloadFields", "families",
    "nonSuccessLifecycleReceiptRequirements",
    "rejectionReceiptMayEnterSuccessExactSet",
    "legalDispositionReceiptStructurallyVerified", "rightsLegalConclusionRecorded",
    "structuralVerificationAloneMaySetRightsLegalConclusionRecorded"
  ], "RECEIPT_TYPE_REQUIREMENTS_MISMATCH", "receiptTypeRequirements");
  requireEmptyArray(types.receiptInstances,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH", "receiptInstances");
  const typeSpecific = requireExactKeys(
    types.typeSpecificRequiredPayloadFields,
    RECEIPT_KINDS,
    "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
    "typeSpecificRequiredPayloadFields"
  );
  if (!exactJson(typeSpecific, TYPE_SPECIFIC_REQUIRED_PAYLOAD_FIELDS)) {
    fail(
      "RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
      "16 个 success receipt families 的 type-specific payload exact projection 漂移。"
    );
  }
  for (const receiptKind of RECEIPT_KINDS) {
    const fields = typeSpecific[receiptKind];
    if (!Array.isArray(fields) || fields.length === 0
      || fields.some((field) => typeof field !== "string" || field.length === 0)
      || new Set(fields).size !== fields.length) {
      fail("RECEIPT_TYPE_REQUIREMENTS_MISMATCH",
        receiptKind + " type-specific payload fields 必须非空且唯一。");
    }
  }
  requireNonSuccessLifecycleReceiptRequirements(
    types.nonSuccessLifecycleReceiptRequirements
  );
  const expectedFamilies = [
    ["frozen_packet_receipt", 1, 1, "product_owner",
      "exact_frozen_governance_packet"],
    ["owner_selection_receipt", 13, 13, "product_owner",
      "exactly_one_per_requirement"],
    ["source_or_first_party_binding_receipt", 13, 13,
      "source_rights_reviewer",
      "exactly_one_per_requirement_provenance_evidence_only"],
    ["three_layer_rights_evidence_receipt", 13, 13,
      "source_rights_reviewer",
      "work_version_carrier_evidence_per_requirement_not_legal_conclusion"],
    ["vedic_domain_expert_opinion_binding_receipt", 2, 2,
      "vedic_domain_expert",
      "each_distinct_expert_covers_same_exact_thirteen_requirement_packet"],
    ["domain_disagreement_inventory_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "parallel_original_opinion_inventory_no_winner"],
    ["source_rights_review_receipt", 2, 2, "source_rights_reviewer",
      "two_independent_reviews_of_same_packet"],
    ["legal_authority_disposition_receipt", "required_undefined",
      "required_undefined", "independent_legal_authority",
      "all_target_jurisdictions_material_layers_and_requested_operations"],
    ["structural_validator_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "schema_specific_structural_exact_set_and_failure_channel"],
    ["semantic_validator_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "exact_twenty_six_invariants_and_counterexample_corpus"],
    ["private_lifecycle_public_non_person_attestation_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "current_revocation_checked_public_projection_of_private_lifecycle_runtime_evidence_without_person_data_or_person_derived_digest"],
    ["admission_epoch_snapshot_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "atomic_evaluation_snapshot_epoch_revocation_and_aba_boundary"],
    ["supersession_intent_receipt", 1, 1, "product_owner",
      "explicit_owner_predecessor_successor_and_restriction_intent"],
    ["supersession_commit_receipt", 1, 1, "formal_admission_governance",
      "formal_parent_registry_transaction_and_rollback_refs"],
    ["conditions_one_to_seven_evaluation_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "acyclic_pre_snapshot_evidence_plus_epoch_snapshot_condition_one_to_seven_result_authority_none"],
    ["final_readiness_evaluation_receipt", 1, 1,
      "engineering_reproducibility_reviewer",
      "acyclic_prior_evaluation_plus_supersession_outputs_all_eight_candidate_state_authority_none"]
  ].map(([receiptKind, minimumCount, maximumCount, issuerRoleId, coverage]) => ({
    receiptKind,
    minimumCount,
    maximumCount,
    issuerRoleId,
    coverage
  }));
  if (types.requirementsOnlyNoExecutableSchemas !== true
    || types.acceptedReceipts !== 0
    || types.successFamiliesFormOneFlatManifest !== false
    || types.successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput !== true
    || !exactJson(types.families, expectedFamilies)
    || types.rejectionReceiptMayEnterSuccessExactSet !== false
    || types.legalDispositionReceiptStructurallyVerified !== false
    || types.rightsLegalConclusionRecorded !== false
    || types.structuralVerificationAloneMaySetRightsLegalConclusionRecorded !== false) {
    fail("RECEIPT_TYPE_REQUIREMENTS_MISMATCH", "receipt family exact-set、零实例或法律红态漂移。");
  }
  const legalReceipt = types.families[7];
  if (legalReceipt.minimumCount !== "required_undefined"
    || legalReceipt.maximumCount !== "required_undefined"
    || legalReceipt.issuerRoleId !== "independent_legal_authority") {
    fail("LEGAL_ROLE_REQUIRED_UNDEFINED_MISMATCH", "法律处置 receipt 数量必须保持 required_undefined。");
  }

  const evaluation = requireExactKeys(contract.evaluationRequirements, [
    "evaluatorImplemented", "evaluatorIdentity", "evaluatorByteDigest",
    "evaluationInstances", "evaluationReceipts", "exactRequirementSetRequired",
    "exactInvariantSetRequired", "exactConditionSetRequired",
    "manifestLayeringAcyclicRequired", "manifestCoverageUnit",
    "manifestLayerCount", "manifestLayers",
    "outputReceiptMayBeIncludedInOwnInputManifest",
    "manifestDigestDomainsMustBeDistinct",
    "partialCompletionMaySetGateTrue", "conditionSkippingAllowed",
    "majorityVoteAllowed", "opinionAveragingAllowed",
    "generativeModelWinnerSelectionAllowed", "unresolvedDisagreementDisposition",
    "unknownMissingAmbiguousExtraDisposition",
    "allEightConditionsAloneConferFormalAdmission",
    "successfulMechanicalCandidateAuthorityEffect", "futureFormalAdmissionTransitionRequired"
  ], "EVALUATION_REQUIREMENTS_MISMATCH", "evaluationRequirements");
  requireEmptyArray(evaluation.evaluationInstances,
    "EVALUATION_REQUIREMENTS_MISMATCH", "evaluationInstances");
  const expectedManifestLayers = [
    {
      manifestId: "pre_snapshot_evidence_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/pre-snapshot-evidence-manifest/v0.1.0",
      includedReceiptKinds: RECEIPT_KINDS.slice(0, 11),
      excludedOutputReceiptKinds: [
        "admission_epoch_snapshot_receipt",
        "conditions_one_to_seven_evaluation_receipt",
        "supersession_intent_receipt",
        "supersession_commit_receipt",
        "final_readiness_evaluation_receipt"
      ],
      currentInstances: 0
    },
    {
      manifestId: "conditions_one_to_seven_evaluation_input_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/conditions-one-to-seven-evaluation-input-manifest/v0.1.0",
      includedComponentIds: [
        "pre_snapshot_evidence_manifest_digest",
        "admission_epoch_snapshot_receipt_digest"
      ],
      excludedOutputReceiptKinds: [
        "conditions_one_to_seven_evaluation_receipt"
      ],
      currentInstances: 0
    },
    {
      manifestId: "final_readiness_evaluation_input_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/final-readiness-evaluation-input-manifest/v0.1.0",
      includedComponentIds: [
        "conditions_one_to_seven_evaluation_receipt_digest",
        "supersession_intent_receipt_digest",
        "supersession_commit_receipt_digest"
      ],
      excludedOutputReceiptKinds: ["final_readiness_evaluation_receipt"],
      currentInstances: 0
    }
  ];
  const manifestDomains = Array.isArray(evaluation.manifestLayers)
    ? evaluation.manifestLayers.map((layer) => layer?.digestDomain)
    : [];
  if (evaluation.evaluatorImplemented !== false
    || evaluation.evaluatorIdentity !== null
    || evaluation.evaluatorByteDigest !== null
    || evaluation.evaluationReceipts !== 0
    || evaluation.exactRequirementSetRequired !== 13
    || evaluation.exactInvariantSetRequired !== 26
    || evaluation.exactConditionSetRequired !== 8
    || evaluation.manifestLayeringAcyclicRequired !== true
    || evaluation.manifestCoverageUnit
      !== "receipt_kind_plus_receipt_id_plus_receipt_digest"
    || evaluation.manifestLayerCount !== 3
    || !exactJson(evaluation.manifestLayers, expectedManifestLayers)
    || evaluation.outputReceiptMayBeIncludedInOwnInputManifest !== false
    || evaluation.manifestDigestDomainsMustBeDistinct !== true
    || new Set(manifestDomains).size !== 3
    || evaluation.partialCompletionMaySetGateTrue !== false
    || evaluation.conditionSkippingAllowed !== false
    || evaluation.majorityVoteAllowed !== false
    || evaluation.opinionAveragingAllowed !== false
    || evaluation.generativeModelWinnerSelectionAllowed !== false
    || evaluation.allEightConditionsAloneConferFormalAdmission !== false
    || evaluation.successfulMechanicalCandidateAuthorityEffect !== "none"
    || evaluation.futureFormalAdmissionTransitionRequired !== true) {
    fail("EVALUATION_REQUIREMENTS_MISMATCH", "13/26/8 evaluator 必须保持零实现、必要非充分与零权限效果。");
  }
}

function requirePrivacySupersessionAndZeroState(contract) {
  const privacy = requireExactKeys(contract.privacyBoundary, [
    "allowedPayloadClass", "exactSchemaRequired", "governanceDigestAllowlistRequired",
    "booleanPrivacySelfDeclarationSufficient", "keyBlacklistAloneSufficient",
    "candidateInstanceCount", "personalDataFieldCount", "personDerivedDigestCount",
    "candidateInstanceRefs", "personalDataRefs", "freeTextFieldsPresent",
    "prohibitedPersonalFieldClasses", "prohibitedStableDerivedIdentifiers",
    "futurePersonalInputLifecycleUsesSeparatePrivateSchemaAndNamespace",
    "futurePrivateLifecycleReceiptConsumableByAdmissionEvaluator",
    "publicNonPersonLifecycleAttestationRequired",
    "publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator",
    "publicNonPersonLifecycleAttestationCurrentInstances",
    "publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead",
    "publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest",
    "publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage",
    "publicProjectionMayClaimAnonymous", "runtimeNoLeakageEstablished",
    "browserDomUrlHistoryConsoleNetworkStorageServiceWorkerNoLeakageEstablished",
    "stableDigestMechanicallyBlockedForArbitraryCandidate"
  ], "PRIVACY_BOUNDARY_MISMATCH", "privacyBoundary");
  requireEmptyArray(privacy.candidateInstanceRefs,
    "PRIVACY_BOUNDARY_MISMATCH", "candidateInstanceRefs");
  requireEmptyArray(privacy.personalDataRefs,
    "PRIVACY_BOUNDARY_MISMATCH", "personalDataRefs");
  requireExactStringSet(privacy.prohibitedPersonalFieldClasses,
    PROHIBITED_PERSONAL_FIELD_CLASSES,
    "PRIVACY_BOUNDARY_MISMATCH", "prohibitedPersonalFieldClasses");
  requireExactStringSet(privacy.prohibitedStableDerivedIdentifiers,
    PROHIBITED_PERSON_DERIVED_IDENTIFIERS,
    "PRIVACY_BOUNDARY_MISMATCH", "prohibitedStableDerivedIdentifiers");
  if (privacy.allowedPayloadClass !== "governance_policy_packet_only"
    || privacy.exactSchemaRequired !== true
    || privacy.governanceDigestAllowlistRequired !== true
    || privacy.booleanPrivacySelfDeclarationSufficient !== false
    || privacy.keyBlacklistAloneSufficient !== false
    || privacy.candidateInstanceCount !== 0
    || privacy.personalDataFieldCount !== 0
    || privacy.personDerivedDigestCount !== 0
    || privacy.freeTextFieldsPresent !== false
    || privacy.futurePersonalInputLifecycleUsesSeparatePrivateSchemaAndNamespace !== true
    || privacy.futurePrivateLifecycleReceiptConsumableByAdmissionEvaluator !== false
    || privacy.publicNonPersonLifecycleAttestationRequired !== true
    || privacy.publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator !== true
    || privacy.publicNonPersonLifecycleAttestationCurrentInstances !== 0
    || privacy.publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead !== true
    || privacy.publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest !== false
    || privacy.publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage !== false
    || privacy.publicProjectionMayClaimAnonymous !== false
    || privacy.runtimeNoLeakageEstablished !== false
    || privacy.browserDomUrlHistoryConsoleNetworkStorageServiceWorkerNoLeakageEstablished !== false
    || privacy.stableDigestMechanicallyBlockedForArbitraryCandidate !== false) {
    fail("PRIVACY_BOUNDARY_MISMATCH", "PII exact-schema、person-derived digest 或 runtime no-leakage 红态漂移。");
  }

  const undefinedBoundary = requireExactKeys(contract.requiredUndefined, [
    "items", "undefinedValuesMayBeInferredFromBaziOrOtherSystems",
    "verifiedPrivateOrVerifiedRedistributableVocabularyInheritedFromBazi"
  ], "REQUIRED_UNDEFINED_MISMATCH", "requiredUndefined");
  requireExactStringSet(undefinedBoundary.items, REQUIRED_UNDEFINED_ITEMS,
    "REQUIRED_UNDEFINED_MISMATCH", "requiredUndefined.items");
  if (undefinedBoundary.undefinedValuesMayBeInferredFromBaziOrOtherSystems !== false
    || undefinedBoundary.verifiedPrivateOrVerifiedRedistributableVocabularyInheritedFromBazi !== false) {
    fail("REQUIRED_UNDEFINED_MISMATCH", "required-undefined 不得从八字或其他体系推断继承。");
  }

  const supersession = requireExactKeys(contract.supersessionRequirements, [
    "supersedesReadinessCandidate", "candidateIsFormalParent", "formalParentUpdated",
    "centralRegistryUpdated", "supersessionTransactionImplemented",
    "supersessionReceiptInstances", "ownerIntentRequired",
    "formalGovernanceCommitRequired", "requiredBindings",
    "higherSemverNewerCreatedAtOrFileOverwriteConfersSupersession",
    "supersededPacketAcceptsNewEvidence", "digestCycleBetweenParentPostimageAndReceiptForbidden"
  ], "SUPERSESSION_REQUIREMENTS_MISMATCH", "supersessionRequirements");
  requireEmptyArray(supersession.supersessionReceiptInstances,
    "SUPERSESSION_REQUIREMENTS_MISMATCH", "supersessionReceiptInstances");
  if (supersession.supersedesReadinessCandidate !== false
    || supersession.candidateIsFormalParent !== false
    || supersession.formalParentUpdated !== false
    || supersession.centralRegistryUpdated !== false
    || supersession.supersessionTransactionImplemented !== false
    || supersession.ownerIntentRequired !== true
    || supersession.formalGovernanceCommitRequired !== true
    || supersession.higherSemverNewerCreatedAtOrFileOverwriteConfersSupersession !== false
    || supersession.supersededPacketAcceptsNewEvidence !== false
    || supersession.digestCycleBetweenParentPostimageAndReceiptForbidden !== true) {
    fail("SUPERSESSION_REQUIREMENTS_MISMATCH", "supersession 必须显式、前向、零实例且非隐式覆盖。");
  }

  const zero = requireExactKeys(contract.zeroInstanceState, [
    "stateInstances", "transitionInstances", "frozenPacketInstances",
    "admissionCycleInstances", "ledgerGenerationInstances", "admissionEpochInstances",
    "evaluationSnapshotInstances", "preSnapshotEvidenceManifestInstances",
    "conditionsOneToSevenEvaluationInputManifestInstances",
    "finalReadinessEvaluationInputManifestInstances",
    "receiptInstances", "actorInstances", "seatInstances",
    "acceptedReceipts", "operationNoncesConsumed",
    "privateLifecyclePublicAttestationReceipts", "evaluationReceipts",
    "supersessionReceipts",
    "transitionEvaluatorImplemented", "executableReceiptSchemasImplemented",
    "runtimeReceiptEvidenceEstablished", "mutationEpochAvailable",
    "crossFileAtomicSnapshot", "intervalMutationExcluded", "abaExcluded",
    "inputContractGateSatisfied", "formalAdmissionAuthorized", "releaseReady",
    "publicDeploymentAuthorized", "publicReleaseAuthorized", "expertClaimsAuthorized",
    "highRiskClaimsAuthorized", "rightsLegalConclusionEstablished",
    "contentTruthEstablished", "expertTruthEstablished"
  ], "ZERO_INSTANCE_STATE_MISMATCH", "zeroInstanceState");
  for (const field of [
    "stateInstances", "transitionInstances", "frozenPacketInstances",
    "admissionCycleInstances", "ledgerGenerationInstances", "admissionEpochInstances",
    "evaluationSnapshotInstances", "preSnapshotEvidenceManifestInstances",
    "conditionsOneToSevenEvaluationInputManifestInstances",
    "finalReadinessEvaluationInputManifestInstances",
    "receiptInstances", "actorInstances", "seatInstances"
  ]) requireEmptyArray(zero[field], "ZERO_INSTANCE_STATE_MISMATCH", field);
  const zeroCounterFields = [
    "acceptedReceipts", "operationNoncesConsumed",
    "privateLifecyclePublicAttestationReceipts", "evaluationReceipts",
    "supersessionReceipts"
  ];
  for (const field of zeroCounterFields) {
    if (zero[field] !== 0) fail("ZERO_INSTANCE_STATE_MISMATCH", field + " 必须为 0。");
  }
  for (const [key, value] of Object.entries(zero)) {
    if (!key.endsWith("Instances") && !zeroCounterFields.includes(key)
      && value !== false) {
      fail("ZERO_INSTANCE_STATE_MISMATCH", key + " 必须保持 false。");
    }
  }
}

function requireObservationIntegrityAndAuthority(contract) {
  const observationKeys = [
    "requirementsArtifactPersisted", "currentContractEndpointMechanicallyObserved",
    "currentUpstreamEndpointsMechanicallyObserved", "heldFileHandleReads",
    "pathEndpointRevalidated", "contractHashAndParseUseSameReadBuffer",
    "upstreamHashAndParseUseSameReadBuffer", "crossFileAtomicSnapshot",
    "simultaneousCurrentRawClosureVerified", "mutationEpochAvailable",
    "intervalMutationExcluded", "abaExcluded", "erasedPreloadExcluded",
    "loadedModuleByteIdentityVerified", "nodeLoaderIntegrityVerified",
    "runtimeLauncherIdentityVerified", "runtimeIntrinsicIntegrityVerified",
    "runtimeReceiptExecutionObserved", "browserRuntimeObserved",
    "staticRequirementsDoNotProveRuntimeProperties"
  ];
  const observation = requireExactKeys(contract.observationBoundary,
    observationKeys, "OBSERVATION_BOUNDARY_MISMATCH", "observationBoundary");
  if (observation.requirementsArtifactPersisted !== true
    || observation.staticRequirementsDoNotProveRuntimeProperties !== true
    || observationKeys.slice(1, -1).some((key) => observation[key] !== false)) {
    fail("OBSERVATION_BOUNDARY_MISMATCH", "静态要求工件不得提升为 runtime、epoch 或 atomic evidence。");
  }

  const integrity = requireExactKeys(contract.integrityBoundary, [
    "canonicalizationProfile", "digestAlgorithm", "digestDomain",
    "contractDigestExcludesOwnField", "contractDigestIsDigitalSignature",
    "digitalSignature", "signerIdentity", "artifactAuthenticityEstablished"
  ], "INTEGRITY_BOUNDARY_MISMATCH", "integrityBoundary");
  if (integrity.canonicalizationProfile !== CANONICALIZATION_PROFILE
    || integrity.digestAlgorithm !== "SHA-256"
    || integrity.digestDomain !== CONTRACT_DIGEST_DOMAIN
    || integrity.contractDigestExcludesOwnField !== true
    || integrity.contractDigestIsDigitalSignature !== false
    || integrity.digitalSignature !== null
    || integrity.signerIdentity !== null
    || integrity.artifactAuthenticityEstablished !== false) {
    fail("INTEGRITY_BOUNDARY_MISMATCH", "contract digest 只能证明内部完整性，不能成为签名或真实性。");
  }

  requireAllFalseExact(contract.authorityBoundary, [
    "contentTruthEstablished", "expertTruthEstablished",
    "rightsLegalConclusionEstablished", "inputContractGateSatisfied",
    "formalAdmissionAuthorized", "domainAuthorityAuthorized",
    "expertClaimsAuthorized", "highRiskClaimsAuthorized",
    "releaseEvidenceComplete", "releaseReady", "publicDeploymentAuthorized",
    "publicReleaseAuthorized"
  ], "AUTHORITY_BOUNDARY_MISMATCH", "authorityBoundary");
}

// The detailed projection is completed against the reviewed JSON below. The
// separately pinned semantic digest remains an independent anti-self-resigning
// boundary in addition to those explicit invariants.
function requireContractProjection(contract) {
  requireExactKeys(
    contract,
    EXPECTED_TOP_LEVEL_KEYS,
    "CONTRACT_OBJECT_MISMATCH",
    "吠陀 transition/receipt 要求合同顶层"
  );
  if (contract.schemaVersion !== SCHEMA_VERSION
    || contract.recordType !== RECORD_TYPE
    || contract.contractId !== CONTRACT_ID
    || contract.createdAt !== "2026-08-30T00:00:00.000Z"
    || contract.activeAdmissionEffect !== "none") {
    fail("CONTRACT_OBJECT_MISMATCH", "固定身份、时间或零准入效果漂移。");
  }
  if (typeof contract.contractDigest !== "string"
    || !SHA256_PATTERN.test(contract.contractDigest)
    || contract.contractDigest
      !== computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(contract)
    || contract.contractDigest !== EXPECTED_CONTRACT_DIGEST) {
    fail("CONTRACT_DIGEST_MISMATCH", "domain-separated contractDigest 无效或不是冻结投影。");
  }
  if (contract.status
      !== "transition_and_receipt_requirements_defined_zero_instances_no_evaluator_no_authority") {
    fail("CONTRACT_OBJECT_MISMATCH", "合同状态必须保持 requirements-only、零实例、零 evaluator、零权限。");
  }
  requireSystemIdentity(contract);
  requireUpstreamBindings(contract);
  requireStateTransitionAndGuards(contract);
  requireActorRoles(contract);
  requireFrozenPacket(contract);
  requireEpochReceiptAndEvaluation(contract);
  requirePrivacySupersessionAndZeroState(contract);
  requireObservationIntegrityAndAuthority(contract);
  if (!Array.isArray(contract.doesNotEstablish)
    || contract.doesNotEstablish.length !== 16
    || new Set(contract.doesNotEstablish).size !== 16) {
    fail("DOES_NOT_ESTABLISH_MISMATCH", "doesNotEstablish 必须保持 16 项唯一否定边界。");
  }
  return contract;
}

export function verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(
  value
) {
  let invalidRoot;
  try {
    invalidRoot = value === null || typeof value !== "object"
      || Array.isArray(value) || utilTypes.isProxy(value);
  } catch (cause) {
    fail("CONTRACT_OBJECT_MISMATCH", "合同根无法安全检查。", cause);
  }
  if (invalidRoot) fail("CONTRACT_OBJECT_MISMATCH", "合同根必须是普通 JSON 对象。");
  let contract;
  try {
    contract = canonicalValue(value);
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError) throw cause;
    fail("CONTRACT_OBJECT_MISMATCH", "合同对象不是安全被动 JSON 投影。", cause);
  }
  requireContractProjection(contract);
  return deepFreeze(contract);
}

async function readCurrentContractEnvelope(workspaceRoot, options = {}) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
    MAX_CONTRACT_BYTES,
    {
      ...options,
      invalidCode: "CONTRACT_ENDPOINT_INVALID",
      missingCode: "CONTRACT_MISSING",
      label: "吠陀输入准入 transition/receipt 要求合同"
    }
  );
  const parsed = parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
    snapshot.bytes
  );
  if (decodeStrictUtf8(snapshot.bytes, INTERNAL_JSON_LABEL)
    !== canonicalPrettyStringifyVedicInputAdmissionTransitionAndReceiptRequirements(parsed)) {
    fail("CONTRACT_MATERIALIZATION_MISMATCH", "合同不是唯一 canonical LF materialization。");
  }
  const contract =
    verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(parsed);
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_IDENTITY_DRIFT", "合同 persisted raw bytes/SHA-256 漂移。");
  }
  return Object.freeze({
    contract,
    snapshot: Object.freeze({
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    })
  });
}

export async function readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
  workspaceRoot,
  options = {}
) {
  const { contract } = await readCurrentContractEnvelope(workspaceRoot, options);
  return contract;
}

function requireVerifiedUpstreamResults(contract, readiness, storage) {
  if (!isVerifiedVedicInputAdmissionReadinessCandidate(readiness)
    || !isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(storage)) {
    fail("UPSTREAM_VERIFIED_BRAND_MISSING", "两个固定上游 loader 未签发各自模块私有品牌。");
  }
  const readinessBinding = contract.upstreamBindings.readinessCandidate;
  const storageBinding = contract.upstreamBindings.storageDesignCandidate;
  if (!exactJson(readiness.artifact, {
    path: readinessBinding.path,
    bytes: readinessBinding.bytes,
    sha256: readinessBinding.sha256
  }) || readiness.candidateDigest !== readinessBinding.semanticDigest
    || readinessBinding.semanticDigestField !== "candidateDigest"
    || readiness.requirementsDefined !== 13
    || readiness.requirementsResolved !== 0
    || readiness.admissionGatesSatisfied !== 0
    || readiness.necessaryConditionsRequired !== 8
    || readiness.necessaryConditionsSatisfied !== 0
    || readiness.inputContractGateSatisfied !== false
    || readiness.activeAdmissionEffect !== "none"
    || readiness.conjunctiveReadinessConditions?.positiveTransitionEvaluatorImplemented !== false
    || readiness.conjunctiveReadinessConditions?.positiveReceiptSchemasDefined !== false
    || readiness.conjunctiveReadinessConditions?.positiveTransitionReceiptsAccepted !== 0
    || readiness.formalAdmissionAuthorized !== false
    || readiness.releaseReady !== false
    || readiness.publicDeploymentAuthorized !== false
    || readiness.publicReleaseAuthorized !== false
    || readiness.expertClaimsAuthorized !== false) {
    fail("UPSTREAM_READINESS_RED_STATE_MISMATCH",
      "readiness loader 当前 exact identity、0/13、0/8、零 evaluator/receipt 或权限红态漂移。");
  }
  if (!exactJson(storage.artifact, {
    path: storageBinding.path,
    bytes: storageBinding.bytes,
    sha256: storageBinding.sha256
  }) || storage.designDigest !== storageBinding.semanticDigest
    || storageBinding.semanticDigestField !== "designDigest"
    || storage.activeAdmissionEffect !== "none"
    || storage.currentVedicStorageDesignMechanicallyVerified !== false
    || storage.sequentialEndpointObservationMechanicallyVerified !== true
    || storage.simultaneousCurrentRawClosureVerified !== false
    || storage.productIdentity?.targetSchema !== null
    || storage.productIdentity?.migrationId !== null
    || storage.productIdentity?.releaseIdentity !== null
    || storage.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || storage.projectReleaseGovernanceContext?.targetSchema !== 13
    || storage.projectReleaseGovernanceContext?.migrationId !== null
    || storage.projectReleaseGovernanceContext?.inheritedByVedicProductIdentity !== false
    || Object.values(storage.implementationAccounting).some((value) => value !== 0)
    || storage.mutationRedGates?.mutationEpochAvailable !== false
    || storage.mutationRedGates?.mutationEpochReceipt !== null
    || storage.mutationRedGates?.mutationEpochReceiptsIssued !== 0
    || storage.mutationRedGates?.compareAndSwapImplementations !== 0
    || storage.mutationRedGates?.crossFileAtomicSnapshot !== false
    || storage.mutationRedGates?.intervalMutationExcluded !== false
    || storage.mutationRedGates?.abaExcluded !== false
    || Object.values(storage.authorityRedGates).some((value) => value !== false)) {
    fail("UPSTREAM_STORAGE_RED_STATE_MISMATCH",
      "storage design loader 当前 exact identity、零实现、无 epoch/ABA 或权限红态漂移。");
  }
}

export async function loadVedicInputAdmissionTransitionAndReceiptRequirements(
  workspaceRoot = process.cwd()
) {
  const { contract, snapshot } = await readCurrentContractEnvelope(workspaceRoot);
  // These must remain two distinct loader calls. Their current observations are
  // sequential and therefore never promoted to a cross-file atomic snapshot.
  const readiness = await loadVedicInputAdmissionReadinessCandidate(workspaceRoot);
  const storage =
    await loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    );
  requireVerifiedUpstreamResults(contract, readiness, storage);
  const nonSuccessRequirements =
    contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements;

  const result = deepFreeze(canonicalValue({
    artifact: {
      path:
        VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    contractId: contract.contractId,
    contractDigest: contract.contractDigest,
    status: contract.status,
    activeAdmissionEffect: contract.activeAdmissionEffect,
    requirementIdsRequired: REQUIREMENT_IDS.length,
    invariantIdsRequired: INVARIANT_IDS.length,
    conditionsRequired: CONDITION_IDS.length,
    guardsDefined: contract.guardDefinitions.orderedGuards.length,
    actorRolesDefined: contract.actorRoleRequirements.roles.length,
    authorityRolesRequired: 5,
    formalProjectionActorsRequired: 1,
    receiptFamiliesDefined: contract.receiptTypeRequirements.families.length,
    nonSuccessLifecycleReceiptKindsDefined:
      nonSuccessRequirements.receiptKinds.length,
    forwardInvalidationReceiptKindsDefined:
      nonSuccessRequirements.forwardInvalidationReceiptKinds.length,
    noMutationReceiptKindsDefined:
      nonSuccessRequirements.noMutationReceiptKinds.length,
    typeSpecificTransitionBoundSuccessReceiptKindsDefined: 4,
    successFamiliesFormOneFlatManifest:
      contract.receiptTypeRequirements.successFamiliesFormOneFlatManifest,
    successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput:
      contract.receiptTypeRequirements
        .successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput,
    packetReviewContentBindingFieldsRequired:
      contract.frozenPacketRequirements.reviewContentBindingFields.length,
    draftReceiptEnvelopeRequirementsDefined:
      contract.receiptEnvelopeRequirements.draftReceiptEnvelopeRequirementsDefined,
    aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements:
      contract.receiptEnvelopeRequirements
        .aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements,
    executableReceiptSchemasImplemented:
      contract.zeroInstanceState.executableReceiptSchemasImplemented,
    positiveTransitionEvaluatorImplemented: false,
    receiptInstances: 0,
    transitionInstances: 0,
    admissionCycleInstances: 0,
    ledgerGenerationInstances: 0,
    evaluationSnapshotInstances: 0,
    preSnapshotEvidenceManifestInstances: 0,
    conditionsOneToSevenEvaluationInputManifestInstances: 0,
    finalReadinessEvaluationInputManifestInstances: 0,
    manifestLayerCount: contract.evaluationRequirements.manifestLayerCount,
    manifestLayerInstances: 0,
    manifestLayeringAcyclicRequired:
      contract.evaluationRequirements.manifestLayeringAcyclicRequired,
    outputReceiptMayBeIncludedInOwnInputManifest:
      contract.evaluationRequirements.outputReceiptMayBeIncludedInOwnInputManifest,
    manifestDigestDomainsMustBeDistinct:
      contract.evaluationRequirements.manifestDigestDomainsMustBeDistinct,
    nonSuccessLifecycleReceiptInstances: 0,
    forwardInvalidationEpochHeadNonceAtomicAdvanceRequired: true,
    transitionRejectionDeterministicNoMutationRequired: true,
    failedTransitionChangesAnyAtomicCommitField:
      nonSuccessRequirements.failedTransitionChangesAnyAtomicCommitField,
    operationNoncesConsumed: 0,
    currentConsumedNonceSetHeadDigest:
      contract.admissionEpochRequirements.currentConsumedNonceSetHeadDigest,
    generationScopedNonceRequired:
      contract.admissionEpochRequirements.generationScopedNonceRequired,
    consumedNonceHeadCommittedAtomically:
      contract.admissionEpochRequirements.consumedNonceHeadCommittedAtomically,
    generationScopedNonceRuntimeEnforced: false,
    consumedNonceHeadAtomicCommitRuntimeObserved: false,
    manifestLayerExactSetRuntimeVerified: false,
    nonSuccessLifecycleReceiptExecutionObserved: false,
    forwardInvalidationRuntimeVerified: false,
    transitionRejectionRuntimeVerified: false,
    runtimeReceiptEvidenceEstablished: false,
    runtimeReceiptExecutionObserved: false,
    browserRuntimeObserved: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    singleWriterFencingEstablished: false,
    externalMonotonicAnchorEstablished: false,
    offlineCloneOrOldBackupRollbackResistanceEstablished: false,
    candidateInstanceCount: 0,
    personalDataFieldCount: 0,
    personDerivedDigestCount: 0,
    publicProjectionMayClaimAnonymous: false,
    stableDigestMechanicallyBlockedForArbitraryCandidate: false,
    publicNonPersonLifecycleAttestationRequired:
      contract.privacyBoundary.publicNonPersonLifecycleAttestationRequired,
    publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator:
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator,
    publicNonPersonLifecycleAttestationCurrentInstances: 0,
    publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead:
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead,
    publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest:
      false,
    publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage: false,
    publicNonPersonLifecycleAttestationRuntimeVerified: false,
    independentLegalAuthorityRoleStatus: "required_undefined",
    independentLegalAuthorityMinimumSeatCount: "required_undefined",
    independentLegalAuthorityCurrentSeatCount: 0,
    inputContractGateSatisfied: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    domainAuthorityAuthorized: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false,
    legalConclusionAuthorized: false,
    formalProjectionAuthorized: false,
    upstreamArtifacts: Object.freeze([
      readiness.artifact,
      storage.artifact
    ]),
    observationBoundary: {
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      pathEndpointRevalidated: true,
      contractHashAndParseUseSameHeldHandleBuffer: true,
      upstreamLoadersCalledSeparately: true,
      upstreamEndpointsObservedSequentially: true,
      crossFileAtomicSnapshot: false,
      parentAndChildrenAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      erasedPreloadExcluded: false,
      loadedModuleByteIdentityVerified: false,
      nodeLoaderIntegrityVerified: false,
      runtimeIntrinsicIntegrityVerified: false,
      runtimeLauncherIdentityVerified: false
    }
  }));
  if (result.requirementIdsRequired !== 13
    || result.invariantIdsRequired !== 26
    || result.conditionsRequired !== 8
    || result.guardsDefined !== 21
    || result.actorRolesDefined !== 6
    || result.receiptFamiliesDefined !== 16
    || result.nonSuccessLifecycleReceiptKindsDefined !== 4
    || result.forwardInvalidationReceiptKindsDefined !== 3
    || result.noMutationReceiptKindsDefined !== 1
    || result.typeSpecificTransitionBoundSuccessReceiptKindsDefined !== 4
    || result.successFamiliesFormOneFlatManifest !== false
    || result.successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput !== true
    || result.packetReviewContentBindingFieldsRequired !== 10
    || result.draftReceiptEnvelopeRequirementsDefined !== true
    || result.aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements
      !== true
    || result.executableReceiptSchemasImplemented !== false
    || result.positiveTransitionEvaluatorImplemented !== false
    || result.receiptInstances !== 0
    || result.transitionInstances !== 0
    || result.admissionCycleInstances !== 0
    || result.ledgerGenerationInstances !== 0
    || result.evaluationSnapshotInstances !== 0
    || result.preSnapshotEvidenceManifestInstances !== 0
    || result.conditionsOneToSevenEvaluationInputManifestInstances !== 0
    || result.finalReadinessEvaluationInputManifestInstances !== 0
    || result.manifestLayerCount !== 3
    || result.manifestLayerInstances !== 0
    || result.manifestLayeringAcyclicRequired !== true
    || result.outputReceiptMayBeIncludedInOwnInputManifest !== false
    || result.manifestDigestDomainsMustBeDistinct !== true
    || result.nonSuccessLifecycleReceiptInstances !== 0
    || result.forwardInvalidationEpochHeadNonceAtomicAdvanceRequired !== true
    || result.transitionRejectionDeterministicNoMutationRequired !== true
    || result.failedTransitionChangesAnyAtomicCommitField !== false
    || result.operationNoncesConsumed !== 0
    || result.currentConsumedNonceSetHeadDigest !== null
    || result.generationScopedNonceRequired !== true
    || result.consumedNonceHeadCommittedAtomically !== true
    || result.generationScopedNonceRuntimeEnforced !== false
    || result.consumedNonceHeadAtomicCommitRuntimeObserved !== false
    || result.manifestLayerExactSetRuntimeVerified !== false
    || result.nonSuccessLifecycleReceiptExecutionObserved !== false
    || result.forwardInvalidationRuntimeVerified !== false
    || result.transitionRejectionRuntimeVerified !== false
    || result.runtimeReceiptEvidenceEstablished !== false
    || result.runtimeReceiptExecutionObserved !== false
    || result.browserRuntimeObserved !== false
    || result.mutationEpochAvailable !== false
    || result.intervalMutationExcluded !== false
    || result.abaExcluded !== false
    || result.singleWriterFencingEstablished !== false
    || result.externalMonotonicAnchorEstablished !== false
    || result.offlineCloneOrOldBackupRollbackResistanceEstablished !== false
    || result.candidateInstanceCount !== 0
    || result.personalDataFieldCount !== 0
    || result.personDerivedDigestCount !== 0
    || result.publicProjectionMayClaimAnonymous !== false
    || result.stableDigestMechanicallyBlockedForArbitraryCandidate !== false
    || result.publicNonPersonLifecycleAttestationRequired !== true
    || result.publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator !== true
    || result.publicNonPersonLifecycleAttestationCurrentInstances !== 0
    || result.publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead !== true
    || result.publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest !== false
    || result.publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage !== false
    || result.publicNonPersonLifecycleAttestationRuntimeVerified !== false
    || result.independentLegalAuthorityRoleStatus !== "required_undefined"
    || result.independentLegalAuthorityMinimumSeatCount !== "required_undefined"
    || result.independentLegalAuthorityCurrentSeatCount !== 0
    || result.inputContractGateSatisfied !== false
    || result.contentTruthEstablished !== false
    || result.expertTruthEstablished !== false
    || result.rightsLegalConclusionEstablished !== false
    || result.domainAuthorityAuthorized !== false
    || result.formalAdmissionAuthorized !== false
    || result.highRiskClaimsAuthorized !== false
    || result.releaseEvidenceComplete !== false
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.publicReleaseAuthorized !== false
    || result.expertClaimsAuthorized !== false) {
    fail("VERIFIED_RESULT_PROJECTION_MISMATCH",
      "最终 requirements-only 投影未保持 13/26/8、六角色、零 runtime/PII/epoch 与全权限红态。");
  }
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(
  value
) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value) && isRecursivelyFrozenPassive(value);
}

export const vedicInputAdmissionTransitionAndReceiptRequirementsTestOnly =
  Object.freeze({
    canonicalizationProfile: CANONICALIZATION_PROFILE,
    digestDomain: CONTRACT_DIGEST_DOMAIN,
    conditionIds: CONDITION_IDS,
    invariantIds: INVARIANT_IDS,
    requirementIds: REQUIREMENT_IDS,
    actorRoleIds: ACTOR_ROLE_IDS,
    commonReceiptFields: COMMON_RECEIPT_FIELDS,
    casPreconditionFields: CAS_PRECONDITION_FIELDS,
    atomicCommitFields: ATOMIC_COMMIT_FIELDS,
    receiptKinds: RECEIPT_KINDS,
    typeSpecificRequiredPayloadFields: TYPE_SPECIFIC_REQUIRED_PAYLOAD_FIELDS,
    packetReviewContentBindingFields: PACKET_REVIEW_CONTENT_BINDING_FIELDS,
    nonSuccessReceiptKinds: NON_SUCCESS_RECEIPT_KINDS,
    forwardInvalidationReceiptKinds: FORWARD_INVALIDATION_RECEIPT_KINDS,
    noMutationReceiptKinds: NO_MUTATION_RECEIPT_KINDS,
    nonSuccessTypeSpecificRequirements:
      NON_SUCCESS_TYPE_SPECIFIC_REQUIREMENTS,
    topLevelKeys: EXPECTED_TOP_LEVEL_KEYS,
    CONTRACT_DIGEST_DOMAIN,
    CONTRACT_ID,
    EXPECTED_CONTRACT_DIGEST,
    EXPECTED_PERSISTED,
    EXPECTED_TOP_LEVEL_KEYS,
    MAX_CONTRACT_BYTES,
    RECORD_TYPE,
    SCHEMA_VERSION,
    testOnlyReadPhases: TEST_ONLY_READ_PHASES,
    canonicalStringify,
    exactJson,
    readStableWorkspaceFile,
    requireContractProjection,
    requireNonSuccessLifecycleReceiptRequirements,
    requireExactStringSet,
    requireEmptyArray,
    requireVerifiedUpstreamResults
  });
