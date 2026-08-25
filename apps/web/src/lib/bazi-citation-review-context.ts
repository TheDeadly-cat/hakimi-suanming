import type {
  BaziCitationApplicabilityObservationComparisonCounts,
  BaziCitationApplicabilityObservationComparisonRelation,
  BaziCitationApplicabilityObservationComparison,
  BaziCitationApplicabilityObservationCounts,
  BaziCitationApplicabilityObservationPairLifecycleInspection,
  BaziCitationApplicabilityObservationPairLifecycleRecord,
  BaziCitationApplicabilityObservationPairLifecycleSidecar,
  BaziCitationApplicabilityObservationPairLifecycleWithholdingReason,
  BaziCitationApplicabilityObservationStatus,
  BaziCitationReviewContextSnapshot
} from "@hakimi/bazi-review-context";
import type { CaseBundle } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import type {
  LocalKnowledgeCitationReviewWorksetSnapshot,
  ReadLocalKnowledgeCitationReviewWorksetSnapshotOptions
} from "@hakimi/storage";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "./current-release";

export const LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE = Object.freeze({
  snapshotVersion: "hakimi.web.local_bazi_citation_review_context_read/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_locator_bound_revision_field_and_one_repository_read_citation_workset" as const,
  readPolicy: "two_consecutive_case_and_workset_reads_with_second_workset_digest_cas" as const,
  mutationPolicy: "read_only" as const,
  digestDomain: "hakimi.web.local_bazi_citation_review_context_read.payload/1" as const,
  reviewStatus: "local_read_only_observation_context_not_persisted" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation/0.1.0",
  contentVersion: "0.1.0",
  scope: "context_reread_bound_local_template_and_read_only_preflight_projection" as const,
  contextPolicy: "fresh_two_pass_read_must_match_previously_displayed_context_digest" as const,
  mutationPolicy: "no_storage_or_chart_write" as const,
  reviewerIdentityPolicy: "self_declared_not_verified" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_comparison/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_fresh_context_reread_two_file_mechanical_side_by_side_projection" as const,
  contextPolicy: "one_fresh_two_pass_read_must_bind_both_files_and_match_previously_displayed_context_digest" as const,
  comparisonPolicy: "record_digest_sorted_declared_status_equality_only_without_winner_ranking_consensus_or_resolution" as const,
  distinctnessPolicy: "different_record_reviewer_id_and_identity_reference_without_identity_or_independence_verification" as const,
  mutationPolicy: "no_storage_chart_case_or_revision_write" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_pair_lifecycle_preparation/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_fresh_context_reread_two_complete_files_and_one_deterministic_sensitive_local_sidecar" as const,
  contextPolicy: "one_fresh_two_pass_read_must_match_previously_displayed_context_digest" as const,
  filePolicy: "explicit_leaf_owned_blocked_sensitive_preparation_without_persistence_or_delivery_attestation" as const,
  mutationPolicy: "read_only_repository_reread_without_storage_chart_case_revision_or_rule_pack_write" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  reviewerWithdrawalAuthorityVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_pair_lifecycle_reopen/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_to_sixteen_explicit_local_lifecycle_files_reconciled_before_one_fresh_context_reread" as const,
  reconciliationPolicy: "digest_chain_prefix_merge_only_without_clock_input_order_majority_or_latest_wins" as const,
  contextPolicy: "one_fresh_two_pass_read_must_match_previously_displayed_context_digest" as const,
  withheldPolicy: "fresh_release_context_display_and_record_set_digest_match_without_comparison_readiness" as const,
  filePolicy: "private_leaf_owned_canonical_blocked_sensitive_content_without_persistence_attestation" as const,
  mutationPolicy: "read_only_repository_reread_without_storage_chart_case_revision_or_rule_pack_write" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  reviewerWithdrawalAuthorityVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_pair_lifecycle_withholding_preparation/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_explicit_local_lifecycle_file_and_one_finite_reason_terminal_successor" as const,
  contextPolicy: "context_independent_successor_without_current_context_or_withdrawal_authority_attestation" as const,
  eventPolicy: "one_target_record_one_terminal_local_user_withholding_event_without_restore_or_reason_override" as const,
  filePolicy: "private_leaf_owned_canonical_blocked_sensitive_content_without_persistence_attestation" as const,
  mutationPolicy: "pure_successor_preparation_without_storage_chart_case_revision_or_rule_pack_write" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  reviewerWithdrawalAuthorityVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_pair_lifecycle_round_trip/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_explicit_local_lifecycle_file_strict_reinspection_against_one_expected_sidecar_digest" as const,
  verificationPolicy: "structural_integrity_reinspection_and_expected_digest_equality_only" as const,
  persistencePolicy: "selected_file_reopened_without_local_persistence_or_delivery_attestation" as const,
  mutationPolicy: "no_storage_chart_case_revision_or_rule_pack_write" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  reviewerWithdrawalAuthorityVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS = Object.freeze([
  "local_user_request",
  "suspected_record_error",
  "context_superseded",
  "privacy_request",
  "other_unspecified"
] as const satisfies readonly BaziCitationApplicabilityObservationPairLifecycleWithholdingReason[]);

export interface LocalBaziCitationReviewContextLocator {
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
}

export interface ReadLocalBaziCitationReviewContextOptions {
  expectedPriorContextPayloadSha256?: string;
}

type ReleaseModuleIdentity = Readonly<{
  dbGeneration: string;
  databaseName: string;
  targetSchema: number;
  migrationId: string | null;
  buildVersion: string | null;
  manifestDigest: string | null;
  evidenceId: string | null;
  evidenceBound: boolean;
  engineeringEvidenceOnly: true;
}>;

type RepositoryDatabaseIdentity = Readonly<{
  name: string;
  targetSchemaVersion: number;
  verno: number;
  isOpen(): boolean;
}>;

export interface LocalBaziCitationReviewContextReadDependencies {
  releaseIdentity: ReleaseModuleIdentity;
  caseRepository: Readonly<{
    database: RepositoryDatabaseIdentity;
    getCase(caseId: string): Promise<CaseBundle | null>;
  }>;
  knowledgeRepository: Readonly<{
    database: RepositoryDatabaseIdentity;
    readLocalKnowledgeCitationReviewWorksetSnapshot(
      evidenceSubjectId: string,
      options?: ReadLocalKnowledgeCitationReviewWorksetSnapshotOptions
    ): Promise<LocalKnowledgeCitationReviewWorksetSnapshot>;
  }>;
}

export interface LocalBaziCitationReviewContextRead {
  profile: typeof LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE;
  context: BaziCitationReviewContextSnapshot;
  releaseModuleBinding: Readonly<{
    dbGeneration: "legacy-v13";
    databaseName: string;
    targetSchema: 13;
    migrationId: null;
    buildVersion: string | null;
    storageManifestDigest: string | null;
    releaseEvidenceId: string | null;
    releaseEvidenceBound: boolean;
    expectedLegacyTupleMatched: true;
    engineeringEvidenceOnly: true;
  }>;
  repositoryReadBinding: Readonly<{
    databaseName: string;
    targetSchemaVersion: 13;
    caseBundleReadPasses: 2;
    knowledgeWorksetReadPasses: 2;
    secondWorksetReadUsedExpectedDigest: true;
    worksetSnapshotSha256: string;
    firstContextPayloadSha256: string;
    secondContextPayloadSha256: string;
    expectedPriorContextPayloadSha256: string | null;
    expectedPriorContextMatched: true | null;
  }>;
  boundary: Readonly<{
    locatorOnlyCallerInput: true;
    fullCaseOrRevisionAcceptedFromCaller: false;
    fullWorksetAcceptedFromCaller: false;
    caseBundleRepositoryReadPerformed: true;
    knowledgeWorksetRepositoryReadPerformed: true;
    twoPassDigestRevalidationPerformed: true;
    sameConfiguredDatabaseInstanceVerified: true;
    repositoryConfigurationMatchedReleaseNameAndTargetSchema: true;
    storageReadPerformed: true;
    firstPassDiscardedBeforeReturn: true;
    returnedContextBuiltFromSecondPass: true;
    caseBundleFreshRereadPerformed: true;
    worksetFreshRereadWithExpectedDigestPerformed: true;
    worksetDigestFreshnessRevalidatedBetweenPasses: true;
    continuousFreshnessAttested: false;
    currentAtReturnAttested: false;
    caseBundleAtomicSnapshotVerified: false;
    crossRepositoryAtomicSnapshotVerified: false;
    caseRevisionAndKnowledgeAtomicCaptureVerified: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    rawBirthInputCopied: false;
    caseAliasTagsNotesCopied: false;
    sourceTextReturned: false;
    localSourceTextProcessedTransiently: true;
    containsDerivedSensitiveChartData: true;
    sourceAuthenticityClaimed: false;
    humanReviewPerformed: false;
    reviewerIdentityVerified: false;
    externalProviderUseAuthorized: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    storageMutationPerformed: false;
    schemaOrReleaseIdentityMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    authenticityClaimed: false;
    result: null;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationTemplate {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE;
  fileName: "hakimi-bazi-citation-applicability-observation-v01.json";
  content: string;
  binding: Readonly<{
    caseId: string;
    revisionId: string;
    evidenceSubjectId: string;
    fieldPath: string;
    contextPayloadSha256: string;
    displayContextBindingSha256: string;
    worksetSnapshotSha256: string;
    matchingSourceSetSha256: string;
    citationCount: number;
  }>;
  boundary: Readonly<{
    contextFreshRereadPerformed: true;
    priorDisplayedContextDigestMatched: true;
    sourceTextIncluded: false;
    fieldValueIncluded: false;
    rawBirthInputIncluded: false;
    containsDerivedSensitiveChartBinding: true;
    storageMutationPerformed: false;
    mutationEpochBypassed: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationPreflightProjection {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE;
  binding: LocalBaziCitationApplicabilityObservationTemplate["binding"];
  reviewer: Readonly<{
    reviewerId: string;
    displayName: string;
    affiliation: string;
    identityVerified: false;
  }>;
  counts: BaziCitationApplicabilityObservationCounts;
  observedCount: number;
  allCitationsObserved: boolean;
  reviewerAttributionComplete: boolean;
  recordSha256: string;
  boundary: Readonly<{
    contextFreshRereadPerformed: true;
    priorDisplayedContextDigestMatched: true;
    suppliedCurrentContextDigestMatched: true;
    freeformObservationTextReturnedToUi: false;
    identityVerified: false;
    humanReviewAuthenticityVerified: false;
    chartApplicabilityAssessed: false;
    citationSemanticApplicabilityAssessed: false;
    eligibleForFormalActivation: false;
    automaticPromotionAllowed: false;
    storageMutationPerformed: false;
    mutationEpochBypassed: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationComparisonProjection {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE;
  binding: LocalBaziCitationApplicabilityObservationTemplate["binding"];
  records: readonly [
    Readonly<{
      slot: "slot_a";
      selfDeclaredReviewerIdSha256: string;
      counts: BaziCitationApplicabilityObservationCounts;
      observedCount: number;
      allCitationsObserved: true;
      reviewerAttributionComplete: true;
      identityEvidenceReferencePresent: true;
      recordSha256: string;
    }>,
    Readonly<{
      slot: "slot_b";
      selfDeclaredReviewerIdSha256: string;
      counts: BaziCitationApplicabilityObservationCounts;
      observedCount: number;
      allCitationsObserved: true;
      reviewerAttributionComplete: true;
      identityEvidenceReferencePresent: true;
      recordSha256: string;
    }>
  ];
  items: readonly Readonly<{
    order: number;
    citationId: string;
    slotAObservation: BaziCitationApplicabilityObservationStatus;
    slotBObservation: BaziCitationApplicabilityObservationStatus;
    relation: BaziCitationApplicabilityObservationComparisonRelation;
  }>[];
  counts: BaziCitationApplicabilityObservationComparisonCounts;
  distinctness: Readonly<{
    recordDigestsDistinct: true;
    selfDeclaredReviewerIdsDistinct: true;
    selfDeclaredIdentityEvidenceReferencesDistinct: true;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
  }>;
  recordSetSha256: string;
  boundary: Readonly<{
    contextFreshRereadPerformed: true;
    priorDisplayedContextDigestMatched: true;
    sameFreshContextSnapshotUsedForBoth: true;
    inputOrderAffectsProjection: false;
    suppliedCurrentContextDigestMatched: true;
    mechanicalStatusEqualityCompared: true;
    freeformObservationTextReturnedToUi: false;
    identityEvidenceReferenceReturnedToUi: false;
    identityVerified: false;
    reviewerIndependenceVerified: false;
    humanReviewAuthenticityVerified: false;
    citationSemanticApplicabilityAssessed: false;
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    rankingPerformed: false;
    consensusClaimed: false;
    currentAtReturnAttested: false;
    eligibleForFormalActivation: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE;
  fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";
  content: string;
  contentBytes: number;
  ledgerId: string;
  recordSetSha256: string;
  sidecarSha256: string;
  comparison: LocalBaziCitationApplicabilityObservationComparisonProjection;
  boundary: Readonly<{
    explicitUserPreparationActionRequired: true;
    contextFreshRereadPerformed: true;
    priorDisplayedContextDigestMatched: true;
    sameFreshContextSnapshotUsedForBoth: true;
    lifecycleSidecarCreatedAndReinspected: true;
    currentContextDigestMatchedDuringPreparation: true;
    currentAtReturnAttested: false;
    containsDerivedSensitiveChartBinding: true;
    containsUntrustedReviewerFreeformText: true;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: true;
    formalStoreUsed: false;
    localFilePersistencePerformed: false;
    preparedFileDeliveryPerformed: false;
    networkTransmissionPerformed: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    rulePackMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    consensusClaimed: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
  }>;
}

export type LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummary = Readonly<{
  recordSha256: string;
  state: BaziCitationApplicabilityObservationPairLifecycleRecord["state"];
}>;

export type LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummaries = readonly [
  LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummary,
  LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummary
];

export type LocalBaziCitationApplicabilityObservationPairLifecycleStateCounts = Readonly<{
  recordedNotWithheld: 0 | 1 | 2;
  withheld: 0 | 1 | 2;
}>;

export interface LocalBaziCitationApplicabilityObservationPairLifecycleReopen {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE;
  status: "current_context_matched_comparison_ready" | "current_context_matched_withheld";
  fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";
  /** Sensitive canonical content. The private leaf must not lift this through a public prop or callback. */
  content: string;
  contentBytes: number;
  ledgerId: string;
  recordSetSha256: string;
  sidecarSha256: string;
  records: LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummaries;
  counts: LocalBaziCitationApplicabilityObservationPairLifecycleStateCounts;
  inputCount: number;
  outputDigestFoundAmongInputs: boolean;
  comparison: LocalBaziCitationApplicabilityObservationComparisonProjection | null;
  boundary: Readonly<{
    explicitUserReopenActionRequired: true;
    inputFilesSnapshottedBeforeRepositoryRead: true;
    inputLifecycleFilesInspectedBeforeRepositoryRead: true;
    crossFileReconciliationPerformedBeforeRepositoryRead: true;
    oneFreshContextRereadAfterReconciliation: true;
    freshContextTwoPassDigestRevalidationPerformed: true;
    priorDisplayedContextDigestMatched: true;
    releaseIdentityDigestTupleMatched: true;
    contextPayloadDigestMatched: true;
    displayContextBindingDigestMatched: true;
    recordSetDigestRecomputedAgainstFreshContext: true;
    withheldRecordsExcludedFromComparisonReadiness: true;
    mechanicalComparisonProjectionReturned: boolean;
    inputOrderAffectsReconciliation: false;
    clockReadPerformed: false;
    randomnessUsed: false;
    currentAtReturnAttested: false;
    containsDerivedSensitiveChartBinding: true;
    containsUntrustedReviewerFreeformText: true;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: true;
    formalStoreUsed: false;
    localFilePersistencePerformed: false;
    preparedFileDeliveryPerformed: false;
    byteForByteDeliveryAttested: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    rulePackMutationPerformed: false;
    schemaOrReleaseIdentityMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    humanReviewAuthenticityVerified: false;
    digestIsDigitalSignature: false;
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    rankingPerformed: false;
    consensusClaimed: false;
    priorExportsRecalled: false;
    physicalDeletionAttested: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE;
  fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";
  /** Sensitive canonical content. The private leaf must not lift this through a public prop or callback. */
  content: string;
  contentBytes: number;
  ledgerId: string;
  recordSetSha256: string;
  sidecarSha256: string;
  records: LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummaries;
  counts: LocalBaziCitationApplicabilityObservationPairLifecycleStateCounts;
  targetRecordSha256: string;
  reasonCode: BaziCitationApplicabilityObservationPairLifecycleWithholdingReason;
  boundary: Readonly<{
    explicitUserPreparationActionRequired: true;
    sourceLifecycleFileInspected: true;
    deterministicSuccessorCreatedAndReinspected: true;
    finiteReasonCodeRequired: true;
    terminalLocalWithholdingOnly: true;
    localUserWithholdingIsReviewerWithdrawal: false;
    localUserActionAttested: false;
    reviewerWithdrawalAuthorityVerified: false;
    currentContextReadPerformed: false;
    currentContextDigestMatched: false;
    currentAtReturnAttested: false;
    withheldRecordBytesRetainedInSuccessorSidecar: true;
    priorSidecarMutationPerformed: false;
    containsDerivedSensitiveChartBinding: true;
    containsUntrustedReviewerFreeformText: true;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: false;
    formalStoreUsed: false;
    localFilePersistencePerformed: false;
    preparedFileDeliveryPerformed: false;
    byteForByteDeliveryAttested: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    rulePackMutationPerformed: false;
    schemaOrReleaseIdentityMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    humanReviewAuthenticityVerified: false;
    digestIsDigitalSignature: false;
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    rankingPerformed: false;
    consensusClaimed: false;
    priorExportsRecalled: false;
    physicalDeletionAttested: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
  }>;
}

export interface LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification {
  profile: typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE;
  matched: true;
  fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";
  contentBytes: number;
  ledgerId: string;
  recordSetSha256: string;
  sidecarSha256: string;
  records: LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummaries;
  counts: LocalBaziCitationApplicabilityObservationPairLifecycleStateCounts;
  boundary: Readonly<{
    explicitUserReinspectionActionRequired: true;
    lifecycleFileStructurallyReinspected: true;
    expectedSidecarDigestMatched: true;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
    byteForByteDeliveryAttested: false;
    localFilePersistenceAttested: false;
    currentContextReadPerformed: false;
    currentAtReturnAttested: false;
    containsDerivedSensitiveChartBinding: true;
    containsUntrustedReviewerFreeformText: true;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: false;
    formalStoreUsed: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    rulePackMutationPerformed: false;
    schemaOrReleaseIdentityMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    humanReviewAuthenticityVerified: false;
    priorExportsRecalled: false;
    physicalDeletionAttested: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
  }>;
}

export type LocalBaziCitationApplicabilityObservationErrorCode =
  | "INVALID_EXPECTED_CONTEXT_DIGEST"
  | "OBSERVATION_TEMPLATE_FAILED"
  | "OBSERVATION_PREFLIGHT_FAILED"
  | "OBSERVATION_COMPARISON_PREFLIGHT_FAILED"
  | "OBSERVATION_PAIR_LIFECYCLE_PREPARATION_FAILED"
  | "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED"
  | "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED"
  | "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED";

export class LocalBaziCitationApplicabilityObservationError extends Error {
  constructor(
    readonly code: LocalBaziCitationApplicabilityObservationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "LocalBaziCitationApplicabilityObservationError";
  }
}

type LocalBaziCitationReviewContextReadPayload = Omit<LocalBaziCitationReviewContextRead, "integrity">;

export type LocalBaziCitationReviewContextReadErrorCode =
  | "INVALID_LOCATOR"
  | "INVALID_OPTIONS"
  | "RELEASE_IDENTITY_MISMATCH"
  | "REPOSITORY_IDENTITY_MISMATCH"
  | "REPOSITORY_NOT_READY"
  | "CASE_NOT_FOUND"
  | "REVISION_NOT_FOUND"
  | "REVIEW_CONTEXT_BLOCKED"
  | "CONTEXT_CHANGED_DURING_READ"
  | "PRIOR_CONTEXT_STALE"
  | "READ_FAILED";

export class LocalBaziCitationReviewContextReadError extends Error {
  constructor(
    readonly code: LocalBaziCitationReviewContextReadErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "LocalBaziCitationReviewContextReadError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EVIDENCE_SUBJECT_ID = /^[a-z][A-Za-z0-9.-]{2,159}$/u;
const FIELD_PATH = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/u;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const BUILD_VERSION = /^[a-f0-9]{12}$/u;
const BOUND_RELEASE_EVIDENCE_ID = /^hre1-[a-f0-9]{32}$/u;
const MAX_LIFECYCLE_SIDECAR_BYTES = 2 * 1024 * 1024;
const MAX_LIFECYCLE_REOPEN_FILES = 16;
const MAX_LIFECYCLE_REOPEN_TEXT_UNITS = 8 * 1024 * 1024;
const TEXT_ENCODER = new TextEncoder();

function exactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: "INVALID_LOCATOR" | "INVALID_OPTIONS",
  subject: string
): asserts value is Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new LocalBaziCitationReviewContextReadError(code, `${subject} 必须是普通对象。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
  if (
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key))
    || ownKeys.length !== expected.size
  ) {
    throw new LocalBaziCitationReviewContextReadError(code, `${subject} 字段集合不匹配。`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new LocalBaziCitationReviewContextReadError(code, `${subject}.${key} 必须是自有可枚举数据字段。`);
    }
  }
}

function snapshotLocator(rawLocator: unknown): Readonly<LocalBaziCitationReviewContextLocator> {
  exactDataRecord(
    rawLocator,
    ["caseId", "revisionId", "evidenceSubjectId", "fieldPath"],
    "INVALID_LOCATOR",
    "复核 locator"
  );
  const locator = {
    caseId: rawLocator.caseId,
    revisionId: rawLocator.revisionId,
    evidenceSubjectId: rawLocator.evidenceSubjectId,
    fieldPath: rawLocator.fieldPath
  };
  if (
    typeof locator.caseId !== "string"
    || !UUID.test(locator.caseId)
    || typeof locator.revisionId !== "string"
    || !UUID.test(locator.revisionId)
    || typeof locator.evidenceSubjectId !== "string"
    || !EVIDENCE_SUBJECT_ID.test(locator.evidenceSubjectId)
    || typeof locator.fieldPath !== "string"
    || !FIELD_PATH.test(locator.fieldPath)
  ) {
    throw new LocalBaziCitationReviewContextReadError(
      "INVALID_LOCATOR",
      "复核 locator 的 Case、Revision、证据主题或字段路径格式无效。"
    );
  }
  return Object.freeze(locator as LocalBaziCitationReviewContextLocator);
}

function snapshotOptions(rawOptions: unknown): Readonly<{
  expectedPriorContextPayloadSha256: string | null;
}> {
  if (
    rawOptions === null
    || typeof rawOptions !== "object"
    || Array.isArray(rawOptions)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(rawOptions))
  ) {
    throw new LocalBaziCitationReviewContextReadError("INVALID_OPTIONS", "复核读取 options 必须是普通对象。");
  }
  const ownKeys = Reflect.ownKeys(rawOptions);
  if (
    ownKeys.some((key) => key !== "expectedPriorContextPayloadSha256")
    || ownKeys.length > 1
  ) {
    throw new LocalBaziCitationReviewContextReadError("INVALID_OPTIONS", "复核读取 options 包含未来字段。");
  }
  const descriptor = Object.getOwnPropertyDescriptor(rawOptions, "expectedPriorContextPayloadSha256");
  if (descriptor && (!("value" in descriptor) || descriptor.enumerable !== true)) {
    throw new LocalBaziCitationReviewContextReadError(
      "INVALID_OPTIONS",
      "复核读取 options 必须使用自有可枚举数据字段。"
    );
  }
  const expected = descriptor?.value;
  if (expected !== undefined && (typeof expected !== "string" || !LOWERCASE_SHA256.test(expected))) {
    throw new LocalBaziCitationReviewContextReadError(
      "INVALID_OPTIONS",
      "旧复核上下文摘要必须是规范小写 SHA-256。"
    );
  }
  return Object.freeze({ expectedPriorContextPayloadSha256: expected ?? null });
}

function assertReleaseAndRepositories(
  dependencies: LocalBaziCitationReviewContextReadDependencies
): asserts dependencies is LocalBaziCitationReviewContextReadDependencies & {
  releaseIdentity: ReleaseModuleIdentity & {
    dbGeneration: "legacy-v13";
    targetSchema: 13;
    migrationId: null;
  };
} {
  const identity = dependencies.releaseIdentity;
  if (
    identity.dbGeneration !== "legacy-v13"
    || identity.targetSchema !== 13
    || identity.migrationId !== null
    || typeof identity.databaseName !== "string"
    || identity.databaseName.length < 1
    || identity.databaseName.length > 256
    || (identity.buildVersion !== null && !BUILD_VERSION.test(identity.buildVersion))
    || (identity.manifestDigest !== null && !LOWERCASE_SHA256.test(identity.manifestDigest))
    || (
      identity.evidenceId !== null
      && identity.evidenceId !== "unbound-local-build"
      && !BOUND_RELEASE_EVIDENCE_ID.test(identity.evidenceId)
    )
    || identity.evidenceBound !== (
      identity.evidenceId !== null && BOUND_RELEASE_EVIDENCE_ID.test(identity.evidenceId)
    )
    || identity.engineeringEvidenceOnly !== true
  ) {
    throw new LocalBaziCitationReviewContextReadError(
      "RELEASE_IDENTITY_MISMATCH",
      "Revision 字段来源复核只允许 legacy-v13 / targetSchema 13 / migrationId null。"
    );
  }
  const caseDatabase = dependencies.caseRepository.database;
  const knowledgeDatabase = dependencies.knowledgeRepository.database;
  if (
    caseDatabase !== knowledgeDatabase
    || caseDatabase.name !== identity.databaseName
    || caseDatabase.targetSchemaVersion !== 13
    || caseDatabase.verno !== 13
    || typeof caseDatabase.isOpen !== "function"
    || knowledgeDatabase.name !== identity.databaseName
    || knowledgeDatabase.targetSchemaVersion !== 13
    || knowledgeDatabase.verno !== 13
  ) {
    throw new LocalBaziCitationReviewContextReadError(
      "REPOSITORY_IDENTITY_MISMATCH",
      "Case 与知识仓储没有绑定当前 Release 的同一 legacy-v13 数据库实例。"
    );
  }
  if (!caseDatabase.isOpen()) {
    throw new LocalBaziCitationReviewContextReadError(
      "REPOSITORY_NOT_READY",
      "legacy-v13 数据库尚未由应用启动流程显式打开。"
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
}

async function readOneContextPass(
  locator: Readonly<LocalBaziCitationReviewContextLocator>,
  dependencies: LocalBaziCitationReviewContextReadDependencies,
  expectedWorksetSnapshotSha256?: string
): Promise<BaziCitationReviewContextSnapshot> {
  const bundle = await dependencies.caseRepository.getCase(locator.caseId);
  if (!bundle) {
    throw new LocalBaziCitationReviewContextReadError("CASE_NOT_FOUND", "所选 Case 不存在。");
  }
  const matchingRevisions = bundle.revisions.filter((revision) => revision.id === locator.revisionId);
  if (matchingRevisions.length !== 1) {
    throw new LocalBaziCitationReviewContextReadError(
      "REVISION_NOT_FOUND",
      "所选 Revision 不存在或 Case 中出现重复 Revision 身份。"
    );
  }
  const workset = await dependencies.knowledgeRepository
    .readLocalKnowledgeCitationReviewWorksetSnapshot(
      locator.evidenceSubjectId,
      expectedWorksetSnapshotSha256 === undefined
        ? {}
        : { expectedWorksetSnapshotSha256 }
    );
  let reviewContextModule: typeof import("@hakimi/bazi-review-context") | null = null;
  try {
    reviewContextModule = await import("@hakimi/bazi-review-context");
    return await reviewContextModule.buildBaziCitationReviewContextSnapshot({
      releaseIdentity: {
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      selection: locator,
      caseRecord: bundle.caseRecord,
      revision: matchingRevisions[0]!,
      workset
    });
  } catch (cause) {
    if (
      reviewContextModule
      && cause instanceof reviewContextModule.BaziCitationReviewContextSnapshotError
    ) {
      throw new LocalBaziCitationReviewContextReadError(
        "REVIEW_CONTEXT_BLOCKED",
        "当前 Revision 字段与来源工作集未通过本机观察上下文门。",
        { cause }
      );
    }
    throw cause;
  }
}

/** @internal Repository injection port for isolated contract tests only. */
export async function readLocalBaziCitationReviewContextFromRepositoriesForTesting(
  rawLocator: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies,
  rawOptions: ReadLocalBaziCitationReviewContextOptions = {}
): Promise<LocalBaziCitationReviewContextRead> {
  try {
    const locator = snapshotLocator(rawLocator);
    const options = snapshotOptions(rawOptions);
    assertReleaseAndRepositories(dependencies);
    const first = await readOneContextPass(locator, dependencies);
    let second: BaziCitationReviewContextSnapshot;
    try {
      second = await readOneContextPass(
        locator,
        dependencies,
        first.worksetBinding.worksetSnapshotSha256
      );
    } catch (cause) {
      if (
        cause instanceof LocalBaziCitationReviewContextReadError
        && (
          cause.code === "CASE_NOT_FOUND"
          || cause.code === "REVISION_NOT_FOUND"
          || cause.code === "REVIEW_CONTEXT_BLOCKED"
        )
      ) {
        throw new LocalBaziCitationReviewContextReadError(
          "CONTEXT_CHANGED_DURING_READ",
          "第二次 Case/Revision 读取没有复现首次可构建上下文。",
          { cause }
        );
      }
      const codeDescriptor = cause !== null && typeof cause === "object"
        ? Object.getOwnPropertyDescriptor(cause, "code")
        : undefined;
      if (
        codeDescriptor
        && "value" in codeDescriptor
        && (
          codeDescriptor.value === "CITATION_REVIEW_WORKSET_SNAPSHOT_STALE"
          || codeDescriptor.value === "CITATION_REVIEW_WORKSET_SNAPSHOT_REVALIDATION_FAILED"
        )
      ) {
        throw new LocalBaziCitationReviewContextReadError(
          "CONTEXT_CHANGED_DURING_READ",
          "第二次工作集 CAS 没有复现首次仓储摘要。",
          { cause }
        );
      }
      throw cause;
    }
    if (first.integrity.payloadSha256 !== second.integrity.payloadSha256) {
      throw new LocalBaziCitationReviewContextReadError(
        "CONTEXT_CHANGED_DURING_READ",
        "两次连续仓储读取生成了不同的 Revision 字段复核上下文。"
      );
    }
    if (
      options.expectedPriorContextPayloadSha256 !== null
      && options.expectedPriorContextPayloadSha256 !== second.integrity.payloadSha256
    ) {
      throw new LocalBaziCitationReviewContextReadError(
        "PRIOR_CONTEXT_STALE",
        "此前显示的 Revision 字段复核上下文已变化。"
      );
    }

    const identity = dependencies.releaseIdentity;
    const releaseModuleBinding = Object.freeze({
      dbGeneration: "legacy-v13" as const,
      databaseName: identity.databaseName,
      targetSchema: 13 as const,
      migrationId: null,
      buildVersion: identity.buildVersion,
      storageManifestDigest: identity.manifestDigest,
      releaseEvidenceId: identity.evidenceId,
      releaseEvidenceBound: identity.evidenceBound,
      expectedLegacyTupleMatched: true as const,
      engineeringEvidenceOnly: true as const
    });
    const repositoryReadBinding = Object.freeze({
      databaseName: dependencies.caseRepository.database.name,
      targetSchemaVersion: 13 as const,
      caseBundleReadPasses: 2 as const,
      knowledgeWorksetReadPasses: 2 as const,
      secondWorksetReadUsedExpectedDigest: true as const,
      worksetSnapshotSha256: second.worksetBinding.worksetSnapshotSha256,
      firstContextPayloadSha256: first.integrity.payloadSha256,
      secondContextPayloadSha256: second.integrity.payloadSha256,
      expectedPriorContextPayloadSha256: options.expectedPriorContextPayloadSha256,
      expectedPriorContextMatched: options.expectedPriorContextPayloadSha256 === null ? null : true as const
    });
    const boundary = Object.freeze({
      locatorOnlyCallerInput: true as const,
      fullCaseOrRevisionAcceptedFromCaller: false as const,
      fullWorksetAcceptedFromCaller: false as const,
      caseBundleRepositoryReadPerformed: true as const,
      knowledgeWorksetRepositoryReadPerformed: true as const,
      twoPassDigestRevalidationPerformed: true as const,
      sameConfiguredDatabaseInstanceVerified: true as const,
      repositoryConfigurationMatchedReleaseNameAndTargetSchema: true as const,
      storageReadPerformed: true as const,
      firstPassDiscardedBeforeReturn: true as const,
      returnedContextBuiltFromSecondPass: true as const,
      caseBundleFreshRereadPerformed: true as const,
      worksetFreshRereadWithExpectedDigestPerformed: true as const,
      worksetDigestFreshnessRevalidatedBetweenPasses: true as const,
      continuousFreshnessAttested: false as const,
      currentAtReturnAttested: false as const,
      caseBundleAtomicSnapshotVerified: false as const,
      crossRepositoryAtomicSnapshotVerified: false as const,
      caseRevisionAndKnowledgeAtomicCaptureVerified: false as const,
      mutationEpochRevalidationPerformed: false as const,
      mutationEpochBypassed: false as const,
      rawBirthInputCopied: false as const,
      caseAliasTagsNotesCopied: false as const,
      sourceTextReturned: false as const,
      localSourceTextProcessedTransiently: true as const,
      containsDerivedSensitiveChartData: true as const,
      sourceAuthenticityClaimed: false as const,
      humanReviewPerformed: false as const,
      reviewerIdentityVerified: false as const,
      externalProviderUseAuthorized: false as const,
      networkTransmissionPerformed: false as const,
      networkTransmissionAuthorized: false as const,
      storageMutationPerformed: false as const,
      schemaOrReleaseIdentityMutationPerformed: false as const,
      caseOrRevisionMutationPerformed: false as const,
      publicExportAuthorized: false as const,
      publicReleaseAuthorized: false as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      formalActivationAllowed: false as const,
      authenticityClaimed: false as const,
      result: null
    });
    const payload: LocalBaziCitationReviewContextReadPayload = Object.freeze({
      profile: LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE,
      context: second,
      releaseModuleBinding,
      repositoryReadBinding,
      boundary
    });
    const result: LocalBaziCitationReviewContextRead = Object.freeze({
      ...payload,
      integrity: Object.freeze({
        hashAlgorithm: "SHA-256" as const,
        payloadSha256: await sha256Hex({
          domain: LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE.digestDomain,
          payload
        }),
        authenticityClaimed: false as const
      })
    });
    return deepFreeze(result);
  } catch (cause) {
    if (cause instanceof LocalBaziCitationReviewContextReadError) throw cause;
    throw new LocalBaziCitationReviewContextReadError(
      "READ_FAILED",
      "Revision 字段来源复核的两次本机只读流程失败关闭。",
      { cause }
    );
  }
}

export async function readCurrentLocalBaziCitationReviewContext(
  rawLocator: unknown,
  rawOptions: ReadLocalBaziCitationReviewContextOptions = {}
): Promise<LocalBaziCitationReviewContextRead> {
  try {
    const locator = snapshotLocator(rawLocator);
    const options = snapshotOptions(rawOptions);
    const { caseRepository, knowledgeRepository } = await import("@hakimi/storage");
    return await readLocalBaziCitationReviewContextFromRepositoriesForTesting(locator, {
      releaseIdentity: CURRENT_RELEASE_ENGINEERING_IDENTITY,
      caseRepository,
      knowledgeRepository
    }, {
      ...(options.expectedPriorContextPayloadSha256 === null
        ? {}
        : { expectedPriorContextPayloadSha256: options.expectedPriorContextPayloadSha256 })
    });
  } catch (cause) {
    if (cause instanceof LocalBaziCitationReviewContextReadError) throw cause;
    throw new LocalBaziCitationReviewContextReadError(
      "READ_FAILED",
      "Revision 字段来源复核的当前 Release 读取失败关闭。",
      { cause }
    );
  }
}

function expectedDisplayedContextDigest(rawDigest: unknown): string {
  if (typeof rawDigest !== "string" || !LOWERCASE_SHA256.test(rawDigest)) {
    throw new LocalBaziCitationApplicabilityObservationError(
      "INVALID_EXPECTED_CONTEXT_DIGEST",
      "此前显示的 Revision 字段上下文摘要必须是规范小写 SHA-256。"
    );
  }
  return rawDigest;
}

function observationBindingProjection(
  read: LocalBaziCitationReviewContextRead
): LocalBaziCitationApplicabilityObservationTemplate["binding"] {
  return deepFreeze({
    caseId: read.context.caseBinding.caseId,
    revisionId: read.context.revisionBinding.revisionId,
    evidenceSubjectId: read.context.subjectBinding.evidenceSubjectId,
    fieldPath: read.context.subjectBinding.fieldPath,
    contextPayloadSha256: read.context.integrity.payloadSha256,
    displayContextBindingSha256: read.context.displayContextBinding.payloadSha256,
    worksetSnapshotSha256: read.context.worksetBinding.worksetSnapshotSha256,
    matchingSourceSetSha256: read.context.worksetBinding.matchingSourceSetSha256,
    citationCount: read.context.worksetBinding.citationIdsWithStoredVerifiedStatus.length
  });
}

function observationComparisonProjection(
  read: LocalBaziCitationReviewContextRead,
  comparison: BaziCitationApplicabilityObservationComparison
): LocalBaziCitationApplicabilityObservationComparisonProjection {
  const [slotA, slotB] = comparison.records;
  const result: LocalBaziCitationApplicabilityObservationComparisonProjection = {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
    binding: observationBindingProjection(read),
    records: [
      {
        slot: "slot_a",
        selfDeclaredReviewerIdSha256: slotA.selfDeclaredReviewerIdSha256,
        counts: slotA.counts,
        observedCount: slotA.observedCount,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: slotA.recordSha256
      },
      {
        slot: "slot_b",
        selfDeclaredReviewerIdSha256: slotB.selfDeclaredReviewerIdSha256,
        counts: slotB.counts,
        observedCount: slotB.observedCount,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: slotB.recordSha256
      }
    ],
    items: comparison.items.map((item) => ({
      order: item.order,
      citationId: item.citationId,
      slotAObservation: item.slotAObservation,
      slotBObservation: item.slotBObservation,
      relation: item.relation
    })),
    counts: comparison.counts,
    distinctness: {
      recordDigestsDistinct: true,
      selfDeclaredReviewerIdsDistinct: true,
      selfDeclaredIdentityEvidenceReferencesDistinct: true,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false
    },
    recordSetSha256: comparison.integrity.recordSetSha256,
    boundary: {
      contextFreshRereadPerformed: true,
      priorDisplayedContextDigestMatched: true,
      sameFreshContextSnapshotUsedForBoth: true,
      inputOrderAffectsProjection: false,
      suppliedCurrentContextDigestMatched: true,
      mechanicalStatusEqualityCompared: true,
      freeformObservationTextReturnedToUi: false,
      identityEvidenceReferenceReturnedToUi: false,
      identityVerified: false,
      reviewerIndependenceVerified: false,
      humanReviewAuthenticityVerified: false,
      citationSemanticApplicabilityAssessed: false,
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      rankingPerformed: false,
      consensusClaimed: false,
      currentAtReturnAttested: false,
      eligibleForFormalActivation: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false,
      storageMutationPerformed: false,
      chartMutationPerformed: false,
      caseOrRevisionMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  };
  return deepFreeze(result);
}

async function rereadObservationContext(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead> = readCurrentLocalBaziCitationReviewContext
): Promise<LocalBaziCitationReviewContextRead> {
  const expectedPriorContextPayloadSha256 = expectedDisplayedContextDigest(
    rawExpectedPriorContextPayloadSha256
  );
  const read = await reader(rawLocator, {
    expectedPriorContextPayloadSha256
  });
  if (
    read.repositoryReadBinding.expectedPriorContextMatched !== true
    || read.context.integrity.payloadSha256 !== expectedPriorContextPayloadSha256
  ) {
    throw new LocalBaziCitationApplicabilityObservationError(
      "INVALID_EXPECTED_CONTEXT_DIGEST",
      "新的两遍仓储读取没有复现此前显示的 Revision 字段上下文。"
    );
  }
  return read;
}

async function prepareBaziCitationApplicabilityObservationTemplateWithReader(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead>
): Promise<LocalBaziCitationApplicabilityObservationTemplate> {
  try {
    const read = await rereadObservationContext(
      rawLocator,
      rawExpectedPriorContextPayloadSha256,
      reader
    );
    const observationModule = await import("@hakimi/bazi-review-context");
    const template = await observationModule
      .createBaziCitationApplicabilityObservationTemplate(read.context);
    const result: LocalBaziCitationApplicabilityObservationTemplate = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
      fileName: observationModule.BAZI_CITATION_APPLICABILITY_OBSERVATION_FILENAME,
      content: observationModule.serializeBaziCitationApplicabilityObservationTemplate(template),
      binding: observationBindingProjection(read),
      boundary: {
        contextFreshRereadPerformed: true,
        priorDisplayedContextDigestMatched: true,
        sourceTextIncluded: false,
        fieldValueIncluded: false,
        rawBirthInputIncluded: false,
        containsDerivedSensitiveChartBinding: true,
        storageMutationPerformed: false,
        mutationEpochBypassed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (cause instanceof LocalBaziCitationApplicabilityObservationError) throw cause;
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_TEMPLATE_FAILED",
      "引用适用性观察模板准备失败关闭。",
      { cause }
    );
  }
}

async function preflightBaziCitationApplicabilityObservationWithReader(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawFileText: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead>
): Promise<LocalBaziCitationApplicabilityObservationPreflightProjection> {
  try {
    if (typeof rawFileText !== "string") {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PREFLIGHT_FAILED",
        "引用适用性观察文件必须以文本读取。"
      );
    }
    const read = await rereadObservationContext(
      rawLocator,
      rawExpectedPriorContextPayloadSha256,
      reader
    );
    const observationModule = await import("@hakimi/bazi-review-context");
    const preflight = await observationModule.preflightBaziCitationApplicabilityObservation(
      rawFileText,
      read.context
    );
    const result: LocalBaziCitationApplicabilityObservationPreflightProjection = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
      binding: observationBindingProjection(read),
      reviewer: {
        reviewerId: preflight.envelope.reviewer.reviewerId,
        displayName: preflight.envelope.reviewer.displayName,
        affiliation: preflight.envelope.reviewer.affiliation,
        identityVerified: false
      },
      counts: preflight.counts,
      observedCount: preflight.observedCount,
      allCitationsObserved: preflight.allCitationsObserved,
      reviewerAttributionComplete: preflight.reviewerAttributionComplete,
      recordSha256: preflight.integrity.recordSha256,
      boundary: {
        contextFreshRereadPerformed: true,
        priorDisplayedContextDigestMatched: true,
        suppliedCurrentContextDigestMatched: true,
        freeformObservationTextReturnedToUi: false,
        identityVerified: false,
        humanReviewAuthenticityVerified: false,
        chartApplicabilityAssessed: false,
        citationSemanticApplicabilityAssessed: false,
        eligibleForFormalActivation: false,
        automaticPromotionAllowed: false,
        storageMutationPerformed: false,
        mutationEpochBypassed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (cause instanceof LocalBaziCitationApplicabilityObservationError) throw cause;
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PREFLIGHT_FAILED",
      "引用适用性观察文件的当前上下文预检失败关闭。",
      { cause }
    );
  }
}

async function preflightBaziCitationApplicabilityObservationComparisonWithReader(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead>
): Promise<LocalBaziCitationApplicabilityObservationComparisonProjection> {
  try {
    if (
      typeof rawSlotAFileText !== "string"
      || typeof rawSlotBFileText !== "string"
      || rawSlotAFileText.length > 512 * 1024
      || rawSlotBFileText.length > 512 * 1024
      || new TextEncoder().encode(rawSlotAFileText).byteLength > 512 * 1024
      || new TextEncoder().encode(rawSlotBFileText).byteLength > 512 * 1024
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_COMPARISON_PREFLIGHT_FAILED",
        "双份引用适用性观察文件必须分别以不超过 512 KiB 的文本读取。"
      );
    }
    const read = await rereadObservationContext(
      rawLocator,
      rawExpectedPriorContextPayloadSha256,
      reader
    );
    const observationModule = await import("@hakimi/bazi-review-context");
    const comparison = await observationModule.compareBaziCitationApplicabilityObservations(
      rawSlotAFileText,
      rawSlotBFileText,
      read.context
    );
    return observationComparisonProjection(read, comparison);
  } catch (cause) {
    if (cause instanceof LocalBaziCitationApplicabilityObservationError) throw cause;
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_COMPARISON_PREFLIGHT_FAILED",
      "双份引用适用性观察的同一当前上下文并列预检失败关闭。",
      { cause }
    );
  }
}

async function prepareBaziCitationApplicabilityObservationPairLifecycleWithReader(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead>
): Promise<LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile> {
  try {
    if (
      typeof rawSlotAFileText !== "string"
      || typeof rawSlotBFileText !== "string"
      || rawSlotAFileText.length > 512 * 1024
      || rawSlotBFileText.length > 512 * 1024
      || new TextEncoder().encode(rawSlotAFileText).byteLength > 512 * 1024
      || new TextEncoder().encode(rawSlotBFileText).byteLength > 512 * 1024
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_PREPARATION_FAILED",
        "双观察生命周期文件只能从两份各不超过 512 KiB 的观察文本显式准备。"
      );
    }
    const read = await rereadObservationContext(
      rawLocator,
      rawExpectedPriorContextPayloadSha256,
      reader
    );
    const observationModule = await import("@hakimi/bazi-review-context");
    const [comparison, sidecar] = await Promise.all([
      observationModule.compareBaziCitationApplicabilityObservations(
        rawSlotAFileText,
        rawSlotBFileText,
        read.context
      ),
      observationModule.createBaziCitationApplicabilityObservationPairLifecycleSidecar(
        rawSlotAFileText,
        rawSlotBFileText,
        read.context
      )
    ]);
    const content = observationModule
      .serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(sidecar);
    const [inspection, evaluation] = await Promise.all([
      observationModule.inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(content),
      observationModule.evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
        content,
        read.context
      )
    ]);
    const contentBytes = new TextEncoder().encode(content).byteLength;
    if (
      contentBytes > 2 * 1024 * 1024
      || inspection.sidecar.integrity.sidecarSha256 !== sidecar.integrity.sidecarSha256
      || inspection.recordedNotWithheldCount !== 2
      || inspection.withheldRecordCount !== 0
      || inspection.structurallyCompletePair !== true
      || inspection.pairComparisonAllowed !== false
      || evaluation.status !== "supplied_context_snapshot_matched_read_only"
      || evaluation.mechanicalComparisonEligibleUnderSuppliedContextSnapshot !== true
      || evaluation.currentContextDigestMatched !== true
      || evaluation.boundary.suppliedContextRepositoryOriginAttested !== false
      || evaluation.boundary.suppliedContextStorageFreshnessAttested !== false
      || evaluation.boundary.currentAtReturnAttested !== false
      || sidecar.contextBinding.contextPayloadSha256 !== read.context.integrity.payloadSha256
      || sidecar.contextBinding.displayContextBindingSha256
        !== read.context.displayContextBinding.payloadSha256
      || sidecar.contextBinding.recordSetSha256 !== comparison.integrity.recordSetSha256
    ) {
      throw new Error("prepared lifecycle sidecar self-check mismatch");
    }
    const result: LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE,
      fileName: observationModule
        .BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME,
      content,
      contentBytes,
      ledgerId: sidecar.ledgerId,
      recordSetSha256: sidecar.contextBinding.recordSetSha256,
      sidecarSha256: sidecar.integrity.sidecarSha256,
      comparison: observationComparisonProjection(read, comparison),
      boundary: {
        explicitUserPreparationActionRequired: true,
        contextFreshRereadPerformed: true,
        priorDisplayedContextDigestMatched: true,
        sameFreshContextSnapshotUsedForBoth: true,
        lifecycleSidecarCreatedAndReinspected: true,
        currentContextDigestMatchedDuringPreparation: true,
        currentAtReturnAttested: false,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: true,
        formalStoreUsed: false,
        localFilePersistencePerformed: false,
        preparedFileDeliveryPerformed: false,
        networkTransmissionPerformed: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        rulePackMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        semanticConflictResolutionPerformed: false,
        winnerSelectionPerformed: false,
        consensusClaimed: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (cause instanceof LocalBaziCitationApplicabilityObservationError) throw cause;
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_PREPARATION_FAILED",
      "双观察生命周期敏感本机文件准备失败关闭。",
      { cause }
    );
  }
}

function captureLifecycleReopenTexts(rawSidecarTexts: unknown): readonly string[] {
  if (
    !Array.isArray(rawSidecarTexts)
    || Object.getPrototypeOf(rawSidecarTexts) !== Array.prototype
    || rawSidecarTexts.length < 1
    || rawSidecarTexts.length > MAX_LIFECYCLE_REOPEN_FILES
  ) {
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
      `生命周期重开必须显式提供 1 至 ${MAX_LIFECYCLE_REOPEN_FILES} 份普通文本数组。`
    );
  }
  const ownKeys = Reflect.ownKeys(rawSidecarTexts);
  const expectedKeys = new Set<PropertyKey>([
    "length",
    ...Array.from({ length: rawSidecarTexts.length }, (_, index) => String(index))
  ]);
  if (
    ownKeys.length !== expectedKeys.size
    || ownKeys.some((key) => !expectedKeys.has(key))
  ) {
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
      "生命周期重开文本数组必须稠密且不得包含附加字段。"
    );
  }
  const descriptors = Object.getOwnPropertyDescriptors(rawSidecarTexts);
  const texts: string[] = [];
  let totalTextUnits = 0;
  let totalBytes = 0;
  for (let index = 0; index < rawSidecarTexts.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor
      || !("value" in descriptor)
      || descriptor.enumerable !== true
      || typeof descriptor.value !== "string"
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
        `生命周期重开输入 ${index + 1} 必须是自有可枚举文本项。`
      );
    }
    const textUnits = descriptor.value.length;
    if (
      textUnits > MAX_LIFECYCLE_SIDECAR_BYTES
      || totalTextUnits + textUnits > MAX_LIFECYCLE_REOPEN_TEXT_UNITS
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
        "生命周期重开输入超过单份 2 MiB 或合计 8 MiB 的文本与 UTF-8 预算。"
      );
    }
    const bytes = TEXT_ENCODER.encode(descriptor.value).byteLength;
    totalTextUnits += textUnits;
    totalBytes += bytes;
    if (
      bytes > MAX_LIFECYCLE_SIDECAR_BYTES
      || totalBytes > MAX_LIFECYCLE_REOPEN_TEXT_UNITS
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
        "生命周期重开输入超过单份 2 MiB 或合计 8 MiB 的文本与 UTF-8 预算。"
      );
    }
    texts.push(descriptor.value);
  }
  return Object.freeze(texts);
}

function lifecycleRecordStateSummaries(
  inspection: BaziCitationApplicabilityObservationPairLifecycleInspection
): LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummaries {
  return deepFreeze(inspection.sidecar.records.map((recordItem) => ({
    recordSha256: recordItem.recordSha256,
    state: recordItem.state
  })) as [
    LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummary,
    LocalBaziCitationApplicabilityObservationPairLifecycleRecordStateSummary
  ]);
}

function lifecycleStateCounts(
  inspection: BaziCitationApplicabilityObservationPairLifecycleInspection
): LocalBaziCitationApplicabilityObservationPairLifecycleStateCounts {
  return deepFreeze({
    recordedNotWithheld: inspection.recordedNotWithheldCount,
    withheld: inspection.withheldRecordCount
  });
}

async function assertLifecycleBindingMatchesFreshContext(
  sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar,
  read: LocalBaziCitationReviewContextRead,
  observationModule: typeof import("@hakimi/bazi-review-context")
): Promise<void> {
  const releaseIdentity = sidecar.contextBinding.releaseIdentity;
  const recordSha256Set = sidecar.records.map((recordItem) => recordItem.recordSha256);
  const recomputedRecordSetSha256 = await sha256Hex({
    domain: observationModule
      .BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.recordSetDigestDomain,
    contextPayloadSha256: read.context.integrity.payloadSha256,
    recordSha256Set
  });
  if (
    releaseIdentity.dbGeneration !== "legacy-v13"
    || releaseIdentity.targetSchema !== 13
    || releaseIdentity.migrationId !== null
    || read.releaseModuleBinding.dbGeneration !== "legacy-v13"
    || read.releaseModuleBinding.targetSchema !== 13
    || read.releaseModuleBinding.migrationId !== null
    || sidecar.contextBinding.contextPayloadSha256 !== read.context.integrity.payloadSha256
    || sidecar.contextBinding.displayContextBindingSha256
      !== read.context.displayContextBinding.payloadSha256
    || sidecar.contextBinding.recordSetSha256 !== recomputedRecordSetSha256
    || sidecar.records.some((recordItem) => (
      recordItem.envelope.contextBinding.releaseIdentity.dbGeneration !== "legacy-v13"
      || recordItem.envelope.contextBinding.releaseIdentity.targetSchema !== 13
      || recordItem.envelope.contextBinding.releaseIdentity.migrationId !== null
      || recordItem.envelope.contextBinding.contextPayloadSha256
        !== read.context.integrity.payloadSha256
      || recordItem.envelope.contextBinding.displayContextBindingSha256
        !== read.context.displayContextBinding.payloadSha256
    ))
  ) {
    throw new Error("reconciled lifecycle sidecar does not match the fresh context digests");
  }
}

async function reopenBaziCitationApplicabilityObservationPairLifecycleWithReader(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSidecarTexts: unknown,
  reader: (
    rawLocator: unknown,
    options: ReadLocalBaziCitationReviewContextOptions
  ) => Promise<LocalBaziCitationReviewContextRead>
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleReopen> {
  try {
    const sidecarTexts = captureLifecycleReopenTexts(rawSidecarTexts);
    const observationModule = await import("@hakimi/bazi-review-context");
    const inputInspections = await Promise.all(sidecarTexts.map((sidecarText) => (
      observationModule.inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
        sidecarText
      )
    )));
    const reconciledSidecar = await observationModule
      .reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars(sidecarTexts);
    const content = observationModule
      .serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(reconciledSidecar);
    const inspection = await observationModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(content);
    const contentBytes = TEXT_ENCODER.encode(content).byteLength;
    if (
      contentBytes > MAX_LIFECYCLE_SIDECAR_BYTES
      || inspection.sidecar.integrity.sidecarSha256
        !== reconciledSidecar.integrity.sidecarSha256
      || inspection.sidecar.ledgerId !== reconciledSidecar.ledgerId
      || inspection.structurallyCompletePair !== true
      || inspection.pairComparisonAllowed !== false
      || inspection.currentContextChecked !== false
    ) {
      throw new Error("reconciled lifecycle canonical reinspection mismatch");
    }

    const read = await rereadObservationContext(
      rawLocator,
      rawExpectedPriorContextPayloadSha256,
      reader
    );
    await assertLifecycleBindingMatchesFreshContext(
      inspection.sidecar,
      read,
      observationModule
    );

    let status: LocalBaziCitationApplicabilityObservationPairLifecycleReopen["status"];
    let comparison: LocalBaziCitationApplicabilityObservationComparisonProjection | null;
    if (inspection.withheldRecordCount === 0) {
      const evaluation = await observationModule
        .evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
          content,
          read.context
        );
      if (
        evaluation.status !== "supplied_context_snapshot_matched_read_only"
        || evaluation.mechanicalComparisonEligibleUnderSuppliedContextSnapshot !== true
        || evaluation.currentContextCheckAttempted !== true
        || evaluation.currentContextCheckCompleted !== true
        || evaluation.currentContextDigestMatched !== true
      ) {
        throw new Error("unwithheld lifecycle sidecar did not pass current-context evaluation");
      }
      const packageComparison = await observationModule
        .compareBaziCitationApplicabilityObservations(
          JSON.stringify(inspection.sidecar.records[0].envelope),
          JSON.stringify(inspection.sidecar.records[1].envelope),
          read.context
        );
      if (
        packageComparison.integrity.recordSetSha256
        !== inspection.sidecar.contextBinding.recordSetSha256
      ) {
        throw new Error("lifecycle comparison record-set digest mismatch");
      }
      status = "current_context_matched_comparison_ready";
      comparison = observationComparisonProjection(read, packageComparison);
    } else {
      status = "current_context_matched_withheld";
      comparison = null;
    }

    const outputDigestFoundAmongInputs = inputInspections.some((inputInspection) => (
      inputInspection.sidecar.integrity.sidecarSha256
      === inspection.sidecar.integrity.sidecarSha256
    ));
    const result: LocalBaziCitationApplicabilityObservationPairLifecycleReopen = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
      status,
      fileName: observationModule
        .BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME,
      content,
      contentBytes,
      ledgerId: inspection.sidecar.ledgerId,
      recordSetSha256: inspection.sidecar.contextBinding.recordSetSha256,
      sidecarSha256: inspection.sidecar.integrity.sidecarSha256,
      records: lifecycleRecordStateSummaries(inspection),
      counts: lifecycleStateCounts(inspection),
      inputCount: sidecarTexts.length,
      outputDigestFoundAmongInputs,
      comparison,
      boundary: {
        explicitUserReopenActionRequired: true,
        inputFilesSnapshottedBeforeRepositoryRead: true,
        inputLifecycleFilesInspectedBeforeRepositoryRead: true,
        crossFileReconciliationPerformedBeforeRepositoryRead: true,
        oneFreshContextRereadAfterReconciliation: true,
        freshContextTwoPassDigestRevalidationPerformed: true,
        priorDisplayedContextDigestMatched: true,
        releaseIdentityDigestTupleMatched: true,
        contextPayloadDigestMatched: true,
        displayContextBindingDigestMatched: true,
        recordSetDigestRecomputedAgainstFreshContext: true,
        withheldRecordsExcludedFromComparisonReadiness: true,
        mechanicalComparisonProjectionReturned: comparison !== null,
        inputOrderAffectsReconciliation: false,
        clockReadPerformed: false,
        randomnessUsed: false,
        currentAtReturnAttested: false,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: true,
        formalStoreUsed: false,
        localFilePersistencePerformed: false,
        preparedFileDeliveryPerformed: false,
        byteForByteDeliveryAttested: false,
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        rulePackMutationPerformed: false,
        schemaOrReleaseIdentityMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        humanReviewAuthenticityVerified: false,
        digestIsDigitalSignature: false,
        semanticConflictResolutionPerformed: false,
        winnerSelectionPerformed: false,
        rankingPerformed: false,
        consensusClaimed: false,
        priorExportsRecalled: false,
        physicalDeletionAttested: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (
      cause instanceof LocalBaziCitationApplicabilityObservationError
      && cause.code === "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED"
    ) {
      throw cause;
    }
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED",
      "双观察生命周期本机重开、合并与当前上下文复核失败关闭。",
      { cause }
    );
  }
}

function finiteLifecycleWithholdingReason(
  rawReasonCode: unknown
): BaziCitationApplicabilityObservationPairLifecycleWithholdingReason {
  if (
    typeof rawReasonCode !== "string"
    || !LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS
      .some((reasonCode) => reasonCode === rawReasonCode)
  ) {
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED",
      "生命周期本机撤下只能使用预定义有限理由码。"
    );
  }
  return rawReasonCode as BaziCitationApplicabilityObservationPairLifecycleWithholdingReason;
}

export async function prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
  rawSidecarText: unknown,
  rawTargetRecordSha256: unknown,
  rawReasonCode: unknown
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile> {
  try {
    if (
      typeof rawTargetRecordSha256 !== "string"
      || !LOWERCASE_SHA256.test(rawTargetRecordSha256)
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED",
        "生命周期本机撤下目标必须是规范小写记录 SHA-256。"
      );
    }
    const reasonCode = finiteLifecycleWithholdingReason(rawReasonCode);
    const observationModule = await import("@hakimi/bazi-review-context");
    if (
      observationModule.BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE
        .allowedWithholdingReasons.length
        !== LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS.length
      || observationModule.BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE
        .allowedWithholdingReasons.some((value, index) => (
          value !== LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS[index]
        ))
    ) {
      throw new Error("facade withholding reason set does not match package contract");
    }
    const sourceInspection = await observationModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(rawSidecarText);
    const successor = await observationModule
      .withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
        rawSidecarText,
        rawTargetRecordSha256,
        reasonCode
      );
    const content = observationModule
      .serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(successor);
    const inspection = await observationModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(content);
    const contentBytes = TEXT_ENCODER.encode(content).byteLength;
    const target = inspection.sidecar.records.find((recordItem) => (
      recordItem.recordSha256 === rawTargetRecordSha256
    ));
    const terminalEvent = target?.events[target.events.length - 1];
    if (
      contentBytes > MAX_LIFECYCLE_SIDECAR_BYTES
      || inspection.sidecar.ledgerId !== sourceInspection.sidecar.ledgerId
      || inspection.sidecar.contextBinding.recordSetSha256
        !== sourceInspection.sidecar.contextBinding.recordSetSha256
      || inspection.withheldRecordCount !== sourceInspection.withheldRecordCount + 1
      || inspection.recordedNotWithheldCount !== sourceInspection.recordedNotWithheldCount - 1
      || target?.state !== "withheld_by_local_user"
      || terminalEvent?.kind !== "withheld_by_local_user"
      || terminalEvent.reasonCode !== reasonCode
      || inspection.sidecar.integrity.sidecarSha256 !== successor.integrity.sidecarSha256
    ) {
      throw new Error("withholding successor canonical reinspection mismatch");
    }
    const result: LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
      fileName: observationModule
        .BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME,
      content,
      contentBytes,
      ledgerId: inspection.sidecar.ledgerId,
      recordSetSha256: inspection.sidecar.contextBinding.recordSetSha256,
      sidecarSha256: inspection.sidecar.integrity.sidecarSha256,
      records: lifecycleRecordStateSummaries(inspection),
      counts: lifecycleStateCounts(inspection),
      targetRecordSha256: rawTargetRecordSha256,
      reasonCode,
      boundary: {
        explicitUserPreparationActionRequired: true,
        sourceLifecycleFileInspected: true,
        deterministicSuccessorCreatedAndReinspected: true,
        finiteReasonCodeRequired: true,
        terminalLocalWithholdingOnly: true,
        localUserWithholdingIsReviewerWithdrawal: false,
        localUserActionAttested: false,
        reviewerWithdrawalAuthorityVerified: false,
        currentContextReadPerformed: false,
        currentContextDigestMatched: false,
        currentAtReturnAttested: false,
        withheldRecordBytesRetainedInSuccessorSidecar: true,
        priorSidecarMutationPerformed: false,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: false,
        formalStoreUsed: false,
        localFilePersistencePerformed: false,
        preparedFileDeliveryPerformed: false,
        byteForByteDeliveryAttested: false,
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        rulePackMutationPerformed: false,
        schemaOrReleaseIdentityMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        humanReviewAuthenticityVerified: false,
        digestIsDigitalSignature: false,
        semanticConflictResolutionPerformed: false,
        winnerSelectionPerformed: false,
        rankingPerformed: false,
        consensusClaimed: false,
        priorExportsRecalled: false,
        physicalDeletionAttested: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (
      cause instanceof LocalBaziCitationApplicabilityObservationError
      && cause.code === "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED"
    ) {
      throw cause;
    }
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED",
      "双观察生命周期有限理由本机撤下 successor 准备失败关闭。",
      { cause }
    );
  }
}

export async function verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip(
  rawSidecarText: unknown,
  rawExpectedSidecarSha256: unknown
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification> {
  try {
    if (
      typeof rawSidecarText !== "string"
      || rawSidecarText.length > MAX_LIFECYCLE_SIDECAR_BYTES
      || TEXT_ENCODER.encode(rawSidecarText).byteLength > MAX_LIFECYCLE_SIDECAR_BYTES
      || typeof rawExpectedSidecarSha256 !== "string"
      || !LOWERCASE_SHA256.test(rawExpectedSidecarSha256)
    ) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED",
        "生命周期往返复核需要不超过 2 MiB 的文本与规范预期 sidecar SHA-256。"
      );
    }
    const observationModule = await import("@hakimi/bazi-review-context");
    const inspection = await observationModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(rawSidecarText);
    if (inspection.sidecar.integrity.sidecarSha256 !== rawExpectedSidecarSha256) {
      throw new LocalBaziCitationApplicabilityObservationError(
        "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED",
        "重新读取的生命周期 sidecar 摘要与准备时摘要不一致。"
      );
    }
    const canonicalContent = observationModule
      .serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(inspection.sidecar);
    const canonicalInspection = await observationModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(canonicalContent);
    if (canonicalInspection.sidecar.integrity.sidecarSha256 !== rawExpectedSidecarSha256) {
      throw new Error("round-trip canonical reinspection digest mismatch");
    }
    const result: LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification = {
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
      matched: true,
      fileName: observationModule
        .BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME,
      contentBytes: TEXT_ENCODER.encode(rawSidecarText).byteLength,
      ledgerId: inspection.sidecar.ledgerId,
      recordSetSha256: inspection.sidecar.contextBinding.recordSetSha256,
      sidecarSha256: inspection.sidecar.integrity.sidecarSha256,
      records: lifecycleRecordStateSummaries(inspection),
      counts: lifecycleStateCounts(inspection),
      boundary: {
        explicitUserReinspectionActionRequired: true,
        lifecycleFileStructurallyReinspected: true,
        expectedSidecarDigestMatched: true,
        digestIsDigitalSignature: false,
        authenticityClaimed: false,
        byteForByteDeliveryAttested: false,
        localFilePersistenceAttested: false,
        currentContextReadPerformed: false,
        currentAtReturnAttested: false,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: false,
        formalStoreUsed: false,
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        rulePackMutationPerformed: false,
        schemaOrReleaseIdentityMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        humanReviewAuthenticityVerified: false,
        priorExportsRecalled: false,
        physicalDeletionAttested: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      }
    };
    return deepFreeze(result);
  } catch (cause) {
    if (
      cause instanceof LocalBaziCitationApplicabilityObservationError
      && cause.code === "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED"
    ) {
      throw cause;
    }
    throw new LocalBaziCitationApplicabilityObservationError(
      "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED",
      "双观察生命周期文件往返摘要复核失败关闭。",
      { cause }
    );
  }
}

export async function prepareCurrentLocalBaziCitationApplicabilityObservationTemplate(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown
): Promise<LocalBaziCitationApplicabilityObservationTemplate> {
  return prepareBaziCitationApplicabilityObservationTemplateWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    readCurrentLocalBaziCitationReviewContext
  );
}

export async function preflightCurrentLocalBaziCitationApplicabilityObservation(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawFileText: unknown
): Promise<LocalBaziCitationApplicabilityObservationPreflightProjection> {
  return preflightBaziCitationApplicabilityObservationWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawFileText,
    readCurrentLocalBaziCitationReviewContext
  );
}

export async function preflightCurrentLocalBaziCitationApplicabilityObservationComparison(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown
): Promise<LocalBaziCitationApplicabilityObservationComparisonProjection> {
  return preflightBaziCitationApplicabilityObservationComparisonWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSlotAFileText,
    rawSlotBFileText,
    readCurrentLocalBaziCitationReviewContext
  );
}

export async function prepareCurrentLocalBaziCitationApplicabilityObservationPairLifecycle(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown
): Promise<LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile> {
  return prepareBaziCitationApplicabilityObservationPairLifecycleWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSlotAFileText,
    rawSlotBFileText,
    readCurrentLocalBaziCitationReviewContext
  );
}

export async function reopenCurrentLocalBaziCitationApplicabilityObservationPairLifecycle(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSidecarTexts: unknown
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleReopen> {
  return reopenBaziCitationApplicabilityObservationPairLifecycleWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSidecarTexts,
    readCurrentLocalBaziCitationReviewContext
  );
}

/** @internal Repository injection port for isolated contract tests only. */
export async function prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies
): Promise<LocalBaziCitationApplicabilityObservationTemplate> {
  return prepareBaziCitationApplicabilityObservationTemplateWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    (locator, options) => readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      locator,
      dependencies,
      options
    )
  );
}

/** @internal Repository injection port for isolated contract tests only. */
export async function preflightLocalBaziCitationApplicabilityObservationFromRepositoriesForTesting(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawFileText: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies
): Promise<LocalBaziCitationApplicabilityObservationPreflightProjection> {
  return preflightBaziCitationApplicabilityObservationWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawFileText,
    (locator, options) => readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      locator,
      dependencies,
      options
    )
  );
}

/** @internal Repository injection port for isolated contract tests only. */
export async function preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies
): Promise<LocalBaziCitationApplicabilityObservationComparisonProjection> {
  return preflightBaziCitationApplicabilityObservationComparisonWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSlotAFileText,
    rawSlotBFileText,
    (locator, options) => readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      locator,
      dependencies,
      options
    )
  );
}

/** @internal Repository injection port for isolated contract tests only. */
export async function prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies
): Promise<LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile> {
  return prepareBaziCitationApplicabilityObservationPairLifecycleWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSlotAFileText,
    rawSlotBFileText,
    (locator, options) => readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      locator,
      dependencies,
      options
    )
  );
}

/** @internal Repository injection port for isolated contract tests only. */
export async function reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
  rawLocator: unknown,
  rawExpectedPriorContextPayloadSha256: unknown,
  rawSidecarTexts: unknown,
  dependencies: LocalBaziCitationReviewContextReadDependencies
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleReopen> {
  return reopenBaziCitationApplicabilityObservationPairLifecycleWithReader(
    rawLocator,
    rawExpectedPriorContextPayloadSha256,
    rawSidecarTexts,
    (locator, options) => readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      locator,
      dependencies,
      options
    )
  );
}
