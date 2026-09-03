export const VEDIC_INPUT_ADMISSION_KERNEL_VERSION =
  "hakimi.vedic-input-admission-kernel/0.1-draft" as const;
export const VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION =
  "hakimi.vedic-input-governance-packet/0.1-draft" as const;
export const VEDIC_FROZEN_PACKET_CANDIDATE_SCHEMA_VERSION =
  "hakimi.vedic-frozen-packet-transition-candidate/0.1-draft" as const;
export const VEDIC_TRANSITION_REJECTION_SCHEMA_VERSION =
  "hakimi.vedic-transition-rejection-receipt/0.1-draft.2" as const;
export const VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION =
  "hakimi.vedic-pre-snapshot-evidence-manifest-candidate/0.1-draft" as const;

export const VEDIC_READINESS_CANDIDATE_DIGEST =
  "688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb" as const;
export const VEDIC_TRANSITION_CONTRACT_DIGEST =
  "548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac" as const;

export const VEDIC_CANONICALIZATION_PROFILE =
  "sorted-object-keys-compact-json-fatal-utf8-no-bom-no-duplicates-v1" as const;
export const VEDIC_PACKET_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/governance-packet/v0.1" as const;
export const VEDIC_PACKET_MANIFEST_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/governance-packet-manifest/v0.1" as const;
export const VEDIC_REQUIREMENT_SET_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/requirement-set/v0.1" as const;
export const VEDIC_INVARIANT_SET_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/invariant-set/v0.1" as const;
export const VEDIC_CONDITION_SET_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/condition-set/v0.1" as const;
export const VEDIC_REVIEW_CONTENT_MANIFEST_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/review-content-manifest/v0.1" as const;
export const VEDIC_PRIVACY_PROJECTION_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/privacy-projection/v0.1" as const;
export const VEDIC_PRE_SNAPSHOT_MANIFEST_ID =
  "pre_snapshot_evidence_manifest" as const;
export const VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission/pre-snapshot-evidence-manifest/v0.1.0" as const;
export const VEDIC_PRE_SNAPSHOT_CANDIDATE_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/pre-snapshot-evidence-manifest-candidate/v0.1" as const;

export const VEDIC_REQUIREMENT_IDS = Object.freeze([
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
] as const);

export const VEDIC_INVARIANT_IDS = Object.freeze([
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
] as const);

export const VEDIC_CONDITION_IDS = Object.freeze([
  "all_thirteen_owner_selections_and_scope_decisions_accepted",
  "all_thirteen_source_or_first_party_provenance_bindings_frozen_verified",
  "all_thirteen_work_version_carrier_rights_and_distribution_dispositions_complete",
  "two_independent_domain_opinions_cover_same_frozen_thirteen_requirement_packet",
  "two_independent_source_rights_reviews_and_legal_authority_disposition_complete",
  "schema_specific_structural_and_semantic_validator_receipts_complete",
  "mutation_epoch_atomic_snapshot_aba_and_private_input_lifecycle_receipts_complete",
  "owner_supersession_formal_parent_and_central_registry_projection_complete"
] as const);

export const VEDIC_REVIEW_CONTENT_DIGEST_FIELDS = Object.freeze([
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
] as const);

export const VEDIC_TRANSITION_IDS = Object.freeze([
  "freeze_packet",
  "seal_pre_snapshot_evidence_manifest",
  "verify_conditions_1_to_7",
  "verify_supersession_projection",
  "invalidate"
] as const);

export const VEDIC_STATE_IDS = Object.freeze([
  "uninstantiated",
  "packet_frozen_receipts_incomplete",
  "pre_snapshot_evidence_manifest_complete_unverified",
  "conditions_1_to_7_verified_supersession_pending",
  "all_eight_conditions_mechanically_verified_input_gate_candidate",
  "invalidated_new_packet_and_epoch_required"
] as const);

export const VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS = Object.freeze([
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
] as const);

export const VEDIC_PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS = Object.freeze([
  "admission_epoch_snapshot_receipt",
  "conditions_one_to_seven_evaluation_receipt",
  "supersession_intent_receipt",
  "supersession_commit_receipt",
  "final_readiness_evaluation_receipt"
] as const);

export const VEDIC_PRE_SNAPSHOT_DEFINED_RECEIPT_CARDINALITIES = Object.freeze({
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
} as const);

export const VEDIC_PRE_SNAPSHOT_UNDEFINED_RECEIPT_CARDINALITY_KINDS = Object.freeze([
  "legal_authority_disposition_receipt"
] as const);

export const VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS = Object.freeze([
  "same_cycle_and_packet_for_every_receipt",
  "pre_snapshot_evidence_manifest_closed",
  "manifest_layer_exact_set_coverage",
  "no_active_correction_withdrawal_or_revocation"
] as const);

export type Sha256Hex = string;
export type VedicRequirementId = typeof VEDIC_REQUIREMENT_IDS[number];
export type VedicInvariantId = typeof VEDIC_INVARIANT_IDS[number];
export type VedicConditionId = typeof VEDIC_CONDITION_IDS[number];
export type VedicReviewContentDigestField = typeof VEDIC_REVIEW_CONTENT_DIGEST_FIELDS[number];
export type VedicTransitionId = typeof VEDIC_TRANSITION_IDS[number];
export type VedicStateId = typeof VEDIC_STATE_IDS[number];
export type VedicPreSnapshotIncludedReceiptKind =
  typeof VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS[number];
export type VedicPreSnapshotManifestGuardId =
  typeof VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS[number];

export type VedicAuthorityBoundary = Readonly<{
  contentTruthEstablished: false;
  domainAuthorityAuthorized: false;
  expertClaimsAuthorized: false;
  expertTruthEstablished: false;
  formalAdmissionAuthorized: false;
  highRiskClaimsAuthorized: false;
  inputContractGateSatisfied: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  releaseEvidenceComplete: false;
  releaseReady: false;
  rightsLegalConclusionEstablished: false;
}>;

export const VEDIC_AUTHORITY_NONE = Object.freeze({
  contentTruthEstablished: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  expertTruthEstablished: false,
  formalAdmissionAuthorized: false,
  highRiskClaimsAuthorized: false,
  inputContractGateSatisfied: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false
} as const satisfies VedicAuthorityBoundary);

export type VedicGovernancePacket = Readonly<{
  admissionCycleId: string;
  authorityBoundary: Readonly<{
    authorityEffect: "none";
    candidateInstanceCount: 0;
    digestSemanticOriginVerified: false;
    freeTextFieldCount: 0;
    governancePolicyOnly: true;
    personalDataFieldCount: 0;
    personDerivedDigestFieldCount: 0;
    privacySourceProvenanceEstablished: false;
  }>;
  canonicalizationProfile: typeof VEDIC_CANONICALIZATION_PROFILE;
  conditionIds: readonly VedicConditionId[];
  conditionSetDigest: Sha256Hex;
  digestAlgorithm: "SHA-256";
  distributionOperationSetDigest: Sha256Hex;
  invariantIds: readonly VedicInvariantId[];
  invariantSetDigest: Sha256Hex;
  packetDigest: Sha256Hex;
  packetDigestDomain: typeof VEDIC_PACKET_DIGEST_DOMAIN;
  packetId: string;
  packetManifestDigest: Sha256Hex;
  packetSchemaVersion: typeof VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION;
  packetScope: "system_governance_policy_only_no_person_input_instances";
  privacyProjectionDigest: Sha256Hex;
  privateLifecyclePolicyDigest: Sha256Hex;
  questionSetDigest: Sha256Hex;
  requirementIds: readonly VedicRequirementId[];
  requirementSetDigest: Sha256Hex;
  reviewContentManifestDigest: Sha256Hex;
  reviewInstructionAndDisagreementPolicyDigest: Sha256Hex;
  selectedValueSetDigest: Sha256Hex;
  sourceBindingManifestDigest: Sha256Hex;
  systemIdentity: Readonly<{
    baziIdentityInherited: false;
    contractSystemId: "vedic";
    independentProductId: null;
    legacyV13IdentityInherited: false;
    migrationId: null;
    migrationIdentityInherited: false;
    productSystemId: "vedic-astrology";
    releaseIdentity: null;
    releaseIdentityInherited: false;
    storageNamespaceClass: "vedic-input-admission-kernel-draft";
    targetSchema: null;
    targetSchemaInherited: false;
  }>;
  targetJurisdictionSetDigest: Sha256Hex;
  targetUseProfileDigest: Sha256Hex;
  threeLayerRightsEvidenceManifestDigest: Sha256Hex;
  transitionContractDigest: typeof VEDIC_TRANSITION_CONTRACT_DIGEST;
  upstreamReadinessCandidateDigest: typeof VEDIC_READINESS_CANDIDATE_DIGEST;
  validatorProfileSetDigest: Sha256Hex;
}>;

export type VedicReviewContentDigests = Readonly<Record<VedicReviewContentDigestField, Sha256Hex>>;

export type VedicKernelStateSnapshot = Readonly<{
  chainHeadDigest: Sha256Hex;
  consumedNonceSetHeadDigest: Sha256Hex;
  mutationEpoch: number;
  revocationLedgerHeadDigest: Sha256Hex;
  stateDigest: Sha256Hex;
  stateId: VedicStateId;
}>;

export type VedicKernelOperationContext = Readonly<{
  generationScopedOperationNonce: string;
  idempotencyKey: string;
  idempotencyKeyPreviouslyObserved: boolean;
  ledgerGenerationId: string;
  operationId: string;
  operationIdPreviouslyObserved: boolean;
  operationNoncePreviouslyConsumed: boolean;
}>;

export type VedicPreSnapshotReceiptReferenceCandidate = Readonly<{
  admissionCycleId: string;
  packetDigest: Sha256Hex;
  packetDigestDomain: typeof VEDIC_PACKET_DIGEST_DOMAIN;
  packetId: string;
  packetManifestDigest: Sha256Hex;
  receiptDigest: Sha256Hex;
  receiptId: string;
  receiptKind: string;
}>;

export type VedicPreSnapshotRevocationObservationCandidate = Readonly<{
  activeCorrectionReceiptIds: readonly string[];
  activeRevocationReceiptIds: readonly string[];
  activeWithdrawalReceiptIds: readonly string[];
  revocationLedgerHeadDigest: Sha256Hex;
}>;

export type VedicPreSnapshotEvidenceManifestCandidate = Readonly<{
  admissionCycleId: string;
  declaredManifestDigestDomain: typeof VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN;
  manifestId: typeof VEDIC_PRE_SNAPSHOT_MANIFEST_ID;
  packetDigest: Sha256Hex;
  packetDigestDomain: typeof VEDIC_PACKET_DIGEST_DOMAIN;
  packetId: string;
  packetManifestDigest: Sha256Hex;
  receiptReferences: readonly VedicPreSnapshotReceiptReferenceCandidate[];
  revocationObservation: VedicPreSnapshotRevocationObservationCandidate;
  schemaVersion: typeof VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION;
}>;

export type VedicPreSnapshotManifestPreflightReport = Readonly<{
  acceptedReceipt: false;
  activeLifecycleReferenceProjectionEmpty: boolean;
  authorityBoundary: VedicAuthorityBoundary;
  authorityEffect: "none";
  candidateManifestClosed: false;
  candidateManifestDigest: Sha256Hex;
  candidateManifestDigestDomain: typeof VEDIC_PRE_SNAPSHOT_CANDIDATE_DIGEST_DOMAIN;
  candidateOnly: true;
  canAdvanceState: false;
  declaredManifestDigestDomain: typeof VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN;
  exactKnownCardinalityProjectionMatches: boolean;
  executableReceiptSchemasAvailable: false;
  failedGuardIds: readonly VedicPreSnapshotManifestGuardId[];
  formalManifestInstanceCreated: false;
  includedReceiptKindProjectionOnly: boolean;
  knownReceiptKindCounts: readonly Readonly<{
    count: number;
    receiptKind: VedicPreSnapshotIncludedReceiptKind;
  }>[];
  legalAuthorityDispositionCardinalityDefined: false;
  legalAuthorityDispositionReferenceCount: number;
  manifestId: typeof VEDIC_PRE_SNAPSHOT_MANIFEST_ID;
  observationClass: "draft_candidate_projection_preflight";
  outputReceiptKindProjectionAbsent: boolean;
  receiptReferenceCount: number;
  receiptReferenceIdsUnique: boolean;
  revocationHeadProjectionMatchesState: boolean;
  runtimeRevocationRecheckEstablished: false;
  sameCycleAndPacketProjectionMatches: boolean;
  underlyingAcceptedReceiptInstancesVerified: false;
  underlyingReceiptPacketBindingsVerified: false;
}>;

export type VedicKernelTransitionRequest = Readonly<{
  currentState: VedicKernelStateSnapshot;
  operation: VedicKernelOperationContext;
  transitionId: string;
}>;

export type VedicFrozenPacketTransitionCandidate = Readonly<{
  acceptedReceipt: false;
  afterEpoch: number;
  authorityBoundary: VedicAuthorityBoundary;
  authorityEffect: "none";
  beforeEpoch: number;
  candidateReceipt: Readonly<{
    acceptedReceipt: false;
    authorityEffect: "none";
    candidateOnly: true;
    commitObserved: false;
    mutationEpochRuntimeEstablished: false;
    packetDigest: Sha256Hex;
    packetId: string;
    packetManifestDigest: Sha256Hex;
    receiptDigest: Sha256Hex;
    receiptId: string;
    receiptKind: "frozen_packet_receipt";
    receiptSchemaVersion: typeof VEDIC_FROZEN_PACKET_CANDIDATE_SCHEMA_VERSION;
    receiptStatus: "draft_candidate_not_issued_not_accepted";
  }>;
  commitObserved: false;
  fromState: "uninstantiated";
  generationScopedOperationNonce: string;
  idempotencyKey: string;
  ledgerGenerationId: string;
  mutationEpochRuntimeEstablished: false;
  nextChainHeadDigest: Sha256Hex;
  nextConsumedNonceSetHeadDigest: Sha256Hex;
  nextRevocationLedgerHeadDigest: Sha256Hex;
  nextStateDigest: Sha256Hex;
  operationId: string;
  outcome: "draft_transition_candidate";
  packet: VedicGovernancePacket;
  previousChainHeadDigest: Sha256Hex;
  previousConsumedNonceSetHeadDigest: Sha256Hex;
  previousRevocationLedgerHeadDigest: Sha256Hex;
  previousStateDigest: Sha256Hex;
  toState: "packet_frozen_receipts_incomplete";
  transitionId: "freeze_packet";
}>;

export type VedicTransitionRejectionReceipt = Readonly<{
  acceptedReceipt: false;
  admissionCycleId: string;
  afterEpoch: number;
  attemptedTransitionId: string;
  authorityBoundary: VedicAuthorityBoundary;
  authorityEffect: "none";
  beforeEpoch: number;
  commitObserved: false;
  failedGuardIds: readonly string[];
  generationScopedOperationNonce: string;
  idempotencyKey: string;
  ledgerGenerationId: string;
  mutationEpochRuntimeEstablished: false;
  nextChainHeadDigest: Sha256Hex;
  nextConsumedNonceSetHeadDigest: Sha256Hex;
  nextRevocationLedgerHeadDigest: Sha256Hex;
  nextStateDigest: Sha256Hex;
  nonceConsumed: false;
  operationId: string;
  outcome: "transition_rejection_receipt";
  packetDigest: Sha256Hex;
  packetDigestDomain: typeof VEDIC_PACKET_DIGEST_DOMAIN;
  packetId: string;
  packetManifestDigest: Sha256Hex;
  packetSchemaVersion: typeof VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION;
  previousChainHeadDigest: Sha256Hex;
  previousConsumedNonceSetHeadDigest: Sha256Hex;
  previousRevocationLedgerHeadDigest: Sha256Hex;
  previousStateDigest: Sha256Hex;
  receiptDigest: Sha256Hex;
  receiptKind: "transition_rejection_receipt";
  receiptSchemaVersion: typeof VEDIC_TRANSITION_REJECTION_SCHEMA_VERSION;
  receiptStatus: "deterministic_failure_response_not_accepted_receipt";
  rejectionCode:
    | "EPOCH_OVERFLOW"
    | "FROM_STATE_MISMATCH"
    | "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED"
    | "REPLAY_OR_IDEMPOTENCY_CONFLICT"
    | "TRANSITION_NOT_IMPLEMENTED"
    | "UNKNOWN_TRANSITION";
  stateAfter: VedicStateId;
  stateBefore: VedicStateId;
}>;

export type VedicKernelTransitionResult =
  | VedicFrozenPacketTransitionCandidate
  | VedicTransitionRejectionReceipt;
