export const BAZI_EXPERT_REVIEW_CYCLE_KERNEL_VERSION =
  "hakimi.bazi.expert-review-cycle-kernel/0.1-draft" as const;
export const BAZI_EXPERT_REVIEW_CYCLE_FAILURE_RESPONSE_SCHEMA_VERSION =
  "hakimi.bazi.expert-review-cycle-transition-failure-response/0.1-draft" as const;
export const BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION =
  "hakimi.bazi.expert-review-bundle-manifest-candidate/0.1-draft" as const;

export const BAZI_REVIEW_CYCLE_CANONICALIZATION_PROFILE =
  "sorted-object-keys-compact-json-fatal-utf8-no-bom-no-duplicates-v1" as const;
export const BAZI_REVIEW_CYCLE_FAILURE_RESPONSE_DIGEST_DOMAIN =
  "hakimi/bazi-expert-review-cycle-kernel-draft/transition-failure-response/v0.1" as const;
export const BAZI_REVIEW_BUNDLE_MANIFEST_CANDIDATE_DIGEST_DOMAIN =
  "hakimi/bazi-expert-review-cycle-kernel-draft/bundle-manifest-candidate/v0.1" as const;

export const BAZI_REVIEW_CYCLE_STATE_IDS = Object.freeze([
  "prerequisites_blocked",
  "owner_intake_authorization_pending",
  "authority_verification_pending",
  "independence_pending",
  "blind_opinions_pending",
  "opinions_sealed",
  "disagreement_inventory_pending",
  "reconciliation_pending",
  "bundle_sealed",
  "invalidated_new_cycle_required"
] as const);

export const BAZI_REVIEW_CYCLE_TRANSITION_IDS = Object.freeze([
  "request_collection_start",
  "record_owner_intake_authorization",
  "record_authority_verification",
  "record_pairwise_independence",
  "record_blind_opinion_a",
  "record_blind_opinion_b",
  "seal_original_opinions",
  "record_disagreement_inventory",
  "record_reconciliation",
  "seal_expert_review_bundle",
  "record_correction",
  "record_withdrawal",
  "record_credential_revocation",
  "invalidate_for_artifact_drift"
] as const);

export const BAZI_COLLECTION_START_BLOCKER_IDS = Object.freeze([
  "formal_packet_intake_gap_binding_drift",
  "formal_packet_current_artifact_lock_missing",
  "bazi_source_binding_freeze_incomplete_0_of_12",
  "source_bundle_incomplete",
  "three_layer_rights_bundle_incomplete",
  "owner_external_intake_authorization_absent",
  "reviewer_participation_consent_receipts_absent",
  "verifier_authority_instances_absent",
  "reviewer_identity_credential_scope_instances_absent",
  "pairwise_independence_instance_absent",
  "original_opinion_and_seal_instances_absent",
  "immutable_bundle_manifest_instance_absent",
  "schema13_mutation_epoch_atomic_snapshot_aba_receipts_absent"
] as const);

export const BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS = Object.freeze([
  "owner_intake_authorization_receipts",
  "reviewer_participation_consent_receipts",
  "verifier_authority_receipts",
  "reviewer_identity_credential_scope_receipts",
  "pairwise_independence_receipts",
  "original_opinion_byte_seal_receipts",
  "opinion_authenticity_receipts",
  "first_seen_custody_receipts",
  "disagreement_inventory_receipts",
  "supplement_receipts",
  "reconciliation_receipts",
  "correction_receipts",
  "withdrawal_receipts",
  "credential_revocation_receipts",
  "source_binding_freeze_receipts",
  "three_layer_rights_closure_receipts"
] as const);

export const BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES = Object.freeze({
  owner_intake_authorization_receipts: 1,
  reviewer_participation_consent_receipts: 2,
  verifier_authority_receipts: 3,
  reviewer_identity_credential_scope_receipts: 2,
  pairwise_independence_receipts: 1,
  original_opinion_byte_seal_receipts: 2,
  opinion_authenticity_receipts: 2,
  first_seen_custody_receipts: 2,
  disagreement_inventory_receipts: 1,
  source_binding_freeze_receipts: 12,
  three_layer_rights_closure_receipts: 12
} as const);

export type Sha256Hex = string;
export type BaziReviewCycleStateId = typeof BAZI_REVIEW_CYCLE_STATE_IDS[number];
export type BaziReviewCycleTransitionId = typeof BAZI_REVIEW_CYCLE_TRANSITION_IDS[number];
export type BaziCollectionStartBlockerId = typeof BAZI_COLLECTION_START_BLOCKER_IDS[number];
export type BaziReviewBundleManifestComponentId =
  typeof BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS[number];

export type BaziReviewAuthorityBoundary = Readonly<{
  contentTruthEstablished: false;
  expertClaimsAuthorized: false;
  expertGateClosureAuthorized: false;
  expertTruthEstablished: false;
  formalAdmissionAuthorized: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  releaseEvidenceComplete: false;
  releaseReady: false;
  rightsLegalConclusionEstablished: false;
}>;

export const BAZI_REVIEW_AUTHORITY_NONE = Object.freeze({
  contentTruthEstablished: false,
  expertClaimsAuthorized: false,
  expertGateClosureAuthorized: false,
  expertTruthEstablished: false,
  formalAdmissionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false
} as const satisfies BaziReviewAuthorityBoundary);

export type BaziReviewCycleUpstreamObservation = Readonly<{
  currentManifestObservationCandidateId:
    "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0";
  currentManifestObservationRawSha256:
    "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491";
  currentReadinessLedgerId:
    "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0";
  currentReadinessRawSha256:
    "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2";
  expertIntakeCandidateId:
    "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0";
  expertIntakeCandidateRawSha256:
    "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df";
  historicalPacketId: "hakimi.bazi.strength.expert-review-packet/1.5.0";
  historicalPacketRawSha256:
    "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163";
  observationOnly: true;
  upstreamBytesVerifiedByKernelRuntime: false;
}>;

export const BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION = Object.freeze({
  currentManifestObservationCandidateId:
    "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0",
  currentManifestObservationRawSha256:
    "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491",
  currentReadinessLedgerId:
    "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  currentReadinessRawSha256:
    "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  expertIntakeCandidateId:
    "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
  expertIntakeCandidateRawSha256:
    "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  historicalPacketId: "hakimi.bazi.strength.expert-review-packet/1.5.0",
  historicalPacketRawSha256:
    "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
  observationOnly: true,
  upstreamBytesVerifiedByKernelRuntime: false
} as const satisfies BaziReviewCycleUpstreamObservation);

export type BaziReviewCycleDraftRequirementsSnapshot = Readonly<{
  authorityBoundary: BaziReviewAuthorityBoundary;
  blockerIds: readonly BaziCollectionStartBlockerId[];
  currentCounts: Readonly<{
    bindingFrozenRequired: 12;
    bindingFrozenVerified: 0;
    independentExpertsRequired: 2;
    independentExpertReviewsVerified: 0;
    originalOpinions: 0;
    reviewerSlotsOccupied: 0;
    sealedOriginalOpinions: 0;
  }>;
  draftLifecycleRequirementBoundary: Readonly<{
    baziOwnerAcceptanceRecorded: false;
    candidateRequirementsOnly: true;
    countsAsCurrentBaziPolicy: false;
    inheritedFromVedicAuthority: false;
    requirements: Readonly<{
      artifactDriftClosesAffectedSeatAndGate: true;
      correctionAppendsAndSupersedesWithoutOverwrite: true;
      correctionReopensAffectedSeatAndGate: true;
      credentialRevocationImmediatelyClosesAffectedSeatAndGate: true;
      deletionOfPriorOpinionOrLifecycleRecordAllowed: false;
      generatedModelWinnerSelectionAllowed: false;
      majorityVoteAllowed: false;
      opinionAveragingAllowed: false;
      withdrawalImmediatelyClosesAffectedSeatAndGate: true;
    }>;
  }>;
  releaseGovernance: Readonly<{
    activeLine: "legacy-v13";
    migrationId: null;
    mutationEpochAvailableForSchema13: false;
    mutationEpochBoundaryRequired: true;
    reviewCycleEpochIsSchema13MutationEpoch: false;
    targetSchema: 13;
  }>;
  schemaVersion: typeof BAZI_EXPERT_REVIEW_CYCLE_KERNEL_VERSION;
  status: "zero_instance_authority_none_positive_transitions_not_implemented";
  upstreamObservation: BaziReviewCycleUpstreamObservation;
}>;

export const BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS = Object.freeze({
  authorityBoundary: BAZI_REVIEW_AUTHORITY_NONE,
  blockerIds: BAZI_COLLECTION_START_BLOCKER_IDS,
  currentCounts: Object.freeze({
    bindingFrozenRequired: 12,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    originalOpinions: 0,
    reviewerSlotsOccupied: 0,
    sealedOriginalOpinions: 0
  }),
  draftLifecycleRequirementBoundary: Object.freeze({
    baziOwnerAcceptanceRecorded: false,
    candidateRequirementsOnly: true,
    countsAsCurrentBaziPolicy: false,
    inheritedFromVedicAuthority: false,
    requirements: Object.freeze({
      artifactDriftClosesAffectedSeatAndGate: true,
      correctionAppendsAndSupersedesWithoutOverwrite: true,
      correctionReopensAffectedSeatAndGate: true,
      credentialRevocationImmediatelyClosesAffectedSeatAndGate: true,
      deletionOfPriorOpinionOrLifecycleRecordAllowed: false,
      generatedModelWinnerSelectionAllowed: false,
      majorityVoteAllowed: false,
      opinionAveragingAllowed: false,
      withdrawalImmediatelyClosesAffectedSeatAndGate: true
    })
  }),
  releaseGovernance: Object.freeze({
    activeLine: "legacy-v13",
    migrationId: null,
    mutationEpochAvailableForSchema13: false,
    mutationEpochBoundaryRequired: true,
    reviewCycleEpochIsSchema13MutationEpoch: false,
    targetSchema: 13
  }),
  schemaVersion: BAZI_EXPERT_REVIEW_CYCLE_KERNEL_VERSION,
  status: "zero_instance_authority_none_positive_transitions_not_implemented",
  upstreamObservation: BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION
} as const satisfies BaziReviewCycleDraftRequirementsSnapshot);

export type BaziReviewCycleStateSnapshot = Readonly<{
  chainHeadDigest: Sha256Hex;
  consumedNonceSetHeadDigest: Sha256Hex;
  credentialRevocationHeadDigest: Sha256Hex;
  reviewCycleEpoch: number;
  stateDigest: Sha256Hex;
  stateId: BaziReviewCycleStateId;
}>;

export type BaziReviewCycleOperationContext = Readonly<{
  generationScopedOperationNonce: string;
  idempotencyKey: string;
  idempotencyKeyPreviouslyObserved: boolean;
  ledgerGenerationId: string;
  operationId: string;
  operationIdPreviouslyObserved: boolean;
  operationNoncePreviouslyConsumed: boolean;
}>;

export type BaziReviewCycleTransitionRequest = Readonly<{
  currentState: BaziReviewCycleStateSnapshot;
  operation: BaziReviewCycleOperationContext;
  transitionId: string;
}>;

export type BaziReviewCycleTransitionRejection = Readonly<{
  acceptedReceipt: false;
  afterReviewCycleEpoch: number;
  attemptedTransitionId: string;
  authorityBoundary: BaziReviewAuthorityBoundary;
  authorityEffect: "none";
  beforeReviewCycleEpoch: number;
  commitObserved: false;
  failedGuardIds: readonly string[];
  generationScopedOperationNonce: string;
  idempotencyKey: string;
  ledgerGenerationId: string;
  nextChainHeadDigest: Sha256Hex;
  nextConsumedNonceSetHeadDigest: Sha256Hex;
  nextCredentialRevocationHeadDigest: Sha256Hex;
  nextStateDigest: Sha256Hex;
  nonceConsumed: false;
  operationId: string;
  outcome: "transition_failure_response";
  previousChainHeadDigest: Sha256Hex;
  previousConsumedNonceSetHeadDigest: Sha256Hex;
  previousCredentialRevocationHeadDigest: Sha256Hex;
  previousStateDigest: Sha256Hex;
  failureResponseDigest: Sha256Hex;
  failureResponseDigestDomain: typeof BAZI_REVIEW_CYCLE_FAILURE_RESPONSE_DIGEST_DOMAIN;
  failureResponseSchemaVersion: typeof BAZI_EXPERT_REVIEW_CYCLE_FAILURE_RESPONSE_SCHEMA_VERSION;
  personDataPresenceAssessed: false;
  personDerivedDigestExcluded: false;
  rejectionCode:
    | "COLLECTION_START_BLOCKED"
    | "EPOCH_INVALID"
    | "FROM_STATE_MISMATCH"
    | "REPLAY_OR_IDEMPOTENCY_CONFLICT"
    | "TRANSITION_NOT_IMPLEMENTED"
    | "UNKNOWN_TRANSITION";
  reviewCycleEpochIsSchema13MutationEpoch: false;
  safeToPublish: false;
  schema13MutationEpochAvailable: false;
  stateAfter: BaziReviewCycleStateId;
  stateBefore: BaziReviewCycleStateId;
}>;

export type BaziReviewBundleManifestCandidate = Readonly<{
  componentReceiptRefs: Readonly<Record<BaziReviewBundleManifestComponentId, readonly never[]>>;
  credentialRevocationHeadDigest: Sha256Hex;
  historicalPacketId: "hakimi.bazi.strength.expert-review-packet/1.5.0";
  manifestId: string;
  reviewCycleId: string;
  schemaVersion: typeof BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION;
}>;

export type BaziReviewBundleManifestPreflightReport = Readonly<{
  acceptedReceipt: false;
  authorityBoundary: BaziReviewAuthorityBoundary;
  authorityEffect: "none";
  canAdvanceState: false;
  candidateDigest: Sha256Hex;
  candidateDigestDomain: typeof BAZI_REVIEW_BUNDLE_MANIFEST_CANDIDATE_DIGEST_DOMAIN;
  candidateOnly: true;
  componentCounts: Readonly<Record<BaziReviewBundleManifestComponentId, 0>>;
  exactZeroInstanceShapeVerified: true;
  formalManifestInstanceCreated: false;
  manifestComplete: false;
  missingRequiredComponentIds: readonly BaziReviewBundleManifestComponentId[];
  originalOpinionBytesVerified: false;
  personDataPresenceAssessed: false;
  personDerivedDigestExcluded: false;
  positiveManifestInputsAccepted: false;
  reviewCycleEpochIsSchema13MutationEpoch: false;
  schema13MutationEpochAvailable: false;
  safeToPublish: false;
  signaturesVerified: false;
  firstSeenAndCustodyVerified: false;
}>;
