import { sha256Hex } from "@hakimi/integrity";
import {
  captureBaziCitationApplicabilityObservationCurrentContext,
  preflightBaziCitationApplicabilityObservation,
  type BaziCitationApplicabilityObservationCounts,
  type BaziCitationApplicabilityObservationStatus
} from "./citation-applicability-observation";

export const BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.citation_applicability_observation_comparison/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi" as const,
  scope: "two_structurally_distinct_self_declared_records_over_one_supplied_current_context_snapshot" as const,
  comparisonPolicy: "mechanical_status_side_by_side_without_winner_ranking_consensus_or_resolution" as const,
  slotPolicy: "record_digest_sorted_slots_are_neutral_labels_without_priority_or_precedence" as const,
  distinctnessPolicy: "different_record_digest_reviewer_id_and_identity_evidence_reference_required_without_identity_or_independence_verification" as const,
  mutationPolicy: "read_only_projection_without_storage_or_chart_write" as const,
  allowedRelations: Object.freeze([
    "same_declared_status",
    "different_declared_status"
  ] as const),
  reviewerIdDigestDomain: "hakimi.bazi.citation_applicability_observation_comparison.reviewer_id/1" as const,
  recordSetDigestDomain: "hakimi.bazi.citation_applicability_observation_comparison.record_set/1" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export type BaziCitationApplicabilityObservationComparisonRelation =
  (typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.allowedRelations)[number];

export interface BaziCitationApplicabilityObservationComparisonRecord {
  slot: "slot_a" | "slot_b";
  selfDeclaredReviewerIdSha256: string;
  counts: BaziCitationApplicabilityObservationCounts;
  observedCount: number;
  allCitationsObserved: true;
  reviewerAttributionComplete: true;
  identityEvidenceReferencePresent: true;
  recordSha256: string;
}

export interface BaziCitationApplicabilityObservationComparisonItem {
  order: number;
  citationId: string;
  slotAObservation: BaziCitationApplicabilityObservationStatus;
  slotBObservation: BaziCitationApplicabilityObservationStatus;
  relation: BaziCitationApplicabilityObservationComparisonRelation;
}

export interface BaziCitationApplicabilityObservationComparisonCounts {
  total: number;
  sameDeclaredStatus: number;
  differentDeclaredStatus: number;
}

export interface BaziCitationApplicabilityObservationComparison {
  profile: typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE;
  contextBinding: Readonly<{
    contextPayloadSha256: string;
    displayContextBindingSha256: string;
    citationIds: readonly string[];
  }>;
  records: readonly [
    BaziCitationApplicabilityObservationComparisonRecord,
    BaziCitationApplicabilityObservationComparisonRecord
  ];
  items: readonly BaziCitationApplicabilityObservationComparisonItem[];
  counts: BaziCitationApplicabilityObservationComparisonCounts;
  distinctness: Readonly<{
    recordDigestsDistinct: true;
    selfDeclaredReviewerIdsDistinct: true;
    selfDeclaredIdentityEvidenceReferencesDistinct: true;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
  }>;
  boundary: Readonly<{
    oneSuppliedCurrentContextSnapshotUsedForBoth: true;
    inputOrderAffectsProjection: false;
    mechanicalStatusEqualityCompared: true;
    freeformObservationTextReturned: false;
    identityEvidenceReferenceReturned: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    humanReviewAuthenticityVerified: false;
    citationSemanticApplicabilityAssessed: false;
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    rankingPerformed: false;
    consensusClaimed: false;
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
    formalActivationAllowed: false;
    automaticPromotionAllowed: false;
    result: null;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    recordSetSha256: string;
    inputOrderAffectsDigest: false;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
  }>;
}

export type BaziCitationApplicabilityObservationComparisonErrorCode =
  | "INVALID_COMPARISON_INPUT"
  | "SLOT_A_OBSERVATION_INVALID"
  | "SLOT_B_OBSERVATION_INVALID"
  | "OBSERVATION_RECORD_INCOMPLETE"
  | "DUPLICATE_OBSERVATION_RECORD"
  | "SELF_DECLARED_REVIEWER_COLLISION"
  | "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION";

export class BaziCitationApplicabilityObservationComparisonError extends Error {
  constructor(
    readonly code: BaziCitationApplicabilityObservationComparisonErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "BaziCitationApplicabilityObservationComparisonError";
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function normalizedDeclaredIdentifier(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function relationFor(
  slotAObservation: BaziCitationApplicabilityObservationStatus,
  slotBObservation: BaziCitationApplicabilityObservationStatus
): BaziCitationApplicabilityObservationComparisonRelation {
  return slotAObservation === slotBObservation
    ? "same_declared_status"
    : "different_declared_status";
}

function comparisonCounts(
  items: readonly BaziCitationApplicabilityObservationComparisonItem[]
): BaziCitationApplicabilityObservationComparisonCounts {
  const counts: BaziCitationApplicabilityObservationComparisonCounts = {
    total: items.length,
    sameDeclaredStatus: 0,
    differentDeclaredStatus: 0
  };
  for (const item of items) {
    if (item.relation === "same_declared_status") counts.sameDeclaredStatus += 1;
    else counts.differentDeclaredStatus += 1;
  }
  return deepFreeze(counts);
}

async function compareBaziCitationApplicabilityObservationsInternal(
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationComparison> {
  if (typeof rawSlotAFileText !== "string" || typeof rawSlotBFileText !== "string") {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "INVALID_COMPARISON_INPUT",
      "双份引用适用性观察必须分别以文本输入。"
    );
  }
  const currentContextSnapshot = await captureBaziCitationApplicabilityObservationCurrentContext(
    rawCurrentContext
  );

  let slotA;
  try {
    slotA = await preflightBaziCitationApplicabilityObservation(
      rawSlotAFileText,
      currentContextSnapshot
    );
  } catch (cause) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "SLOT_A_OBSERVATION_INVALID",
      "观察 A 没有通过当前上下文预检。",
      { cause }
    );
  }

  let slotB;
  try {
    slotB = await preflightBaziCitationApplicabilityObservation(
      rawSlotBFileText,
      currentContextSnapshot
    );
  } catch (cause) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "SLOT_B_OBSERVATION_INVALID",
      "观察 B 没有通过当前上下文预检。",
      { cause }
    );
  }

  if (
    !slotA.reviewerAttributionComplete
    || !slotB.reviewerAttributionComplete
    || !slotA.allCitationsObserved
    || !slotB.allCitationsObserved
  ) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "OBSERVATION_RECORD_INCOMPLETE",
      "两份记录都必须具有完整自述归属，并填写当前全部 citation。"
    );
  }
  if (slotA.integrity.recordSha256 === slotB.integrity.recordSha256) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "DUPLICATE_OBSERVATION_RECORD",
      "同一观察记录不能占据两个并列槽位。"
    );
  }
  if (normalizedDeclaredIdentifier(slotA.envelope.reviewer.reviewerId)
    === normalizedDeclaredIdentifier(slotB.envelope.reviewer.reviewerId)) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "SELF_DECLARED_REVIEWER_COLLISION",
      "两个并列槽位必须使用不同的自述 reviewerId；这仍不构成现实身份或独立性核验。"
    );
  }
  const slotAIdentityEvidenceReference = normalizedDeclaredIdentifier(
    slotA.envelope.reviewer.identityEvidenceReference
  );
  const slotBIdentityEvidenceReference = normalizedDeclaredIdentifier(
    slotB.envelope.reviewer.identityEvidenceReference
  );
  if (
    !slotAIdentityEvidenceReference
    || !slotBIdentityEvidenceReference
    || slotAIdentityEvidenceReference === slotBIdentityEvidenceReference
  ) {
    throw new BaziCitationApplicabilityObservationComparisonError(
      "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION",
      "两个并列槽位必须提供非空且不同的自述身份材料引用；这仍不构成现实身份或独立性核验。"
    );
  }

  const sortedPreflights = [slotA, slotB].sort((left, right) => (
    left.integrity.recordSha256 === right.integrity.recordSha256
      ? 0
      : left.integrity.recordSha256 < right.integrity.recordSha256 ? -1 : 1
  ));
  const canonicalSlotA = sortedPreflights[0]!;
  const canonicalSlotB = sortedPreflights[1]!;

  const items = deepFreeze(canonicalSlotA.envelope.observations.map((slotAItem, index) => {
    const slotBItem = canonicalSlotB.envelope.observations[index]!;
    return {
      order: slotAItem.order,
      citationId: slotAItem.citationId,
      slotAObservation: slotAItem.observation,
      slotBObservation: slotBItem.observation,
      relation: relationFor(slotAItem.observation, slotBItem.observation)
    };
  }));
  const [slotAReviewerIdSha256, slotBReviewerIdSha256] = await Promise.all([
    sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.reviewerIdDigestDomain,
      reviewerId: normalizedDeclaredIdentifier(canonicalSlotA.envelope.reviewer.reviewerId)
    }),
    sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.reviewerIdDigestDomain,
      reviewerId: normalizedDeclaredIdentifier(canonicalSlotB.envelope.reviewer.reviewerId)
    })
  ]);
  const recordSetSha256 = await sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.recordSetDigestDomain,
    contextPayloadSha256: canonicalSlotA.envelope.contextBinding.contextPayloadSha256,
    recordSha256Set: [
      canonicalSlotA.integrity.recordSha256,
      canonicalSlotB.integrity.recordSha256
    ]
  });

  return deepFreeze({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
    contextBinding: {
      contextPayloadSha256: canonicalSlotA.envelope.contextBinding.contextPayloadSha256,
      displayContextBindingSha256: canonicalSlotA.envelope.contextBinding.displayContextBindingSha256,
      citationIds: canonicalSlotA.envelope.contextBinding.citationIds
    },
    records: [
      {
        slot: "slot_a",
        selfDeclaredReviewerIdSha256: slotAReviewerIdSha256,
        counts: canonicalSlotA.counts,
        observedCount: canonicalSlotA.observedCount,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: canonicalSlotA.integrity.recordSha256
      },
      {
        slot: "slot_b",
        selfDeclaredReviewerIdSha256: slotBReviewerIdSha256,
        counts: canonicalSlotB.counts,
        observedCount: canonicalSlotB.observedCount,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: canonicalSlotB.integrity.recordSha256
      }
    ],
    items,
    counts: comparisonCounts(items),
    distinctness: {
      recordDigestsDistinct: true,
      selfDeclaredReviewerIdsDistinct: true,
      selfDeclaredIdentityEvidenceReferencesDistinct: true,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false
    },
    boundary: {
      oneSuppliedCurrentContextSnapshotUsedForBoth: true,
      inputOrderAffectsProjection: false,
      mechanicalStatusEqualityCompared: true,
      freeformObservationTextReturned: false,
      identityEvidenceReferenceReturned: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      humanReviewAuthenticityVerified: false,
      citationSemanticApplicabilityAssessed: false,
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      rankingPerformed: false,
      consensusClaimed: false,
      storageMutationPerformed: false,
      chartMutationPerformed: false,
      caseOrRevisionMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false,
      result: null
    },
    integrity: {
      hashAlgorithm: "SHA-256",
      recordSetSha256,
      inputOrderAffectsDigest: false,
      digestIsDigitalSignature: false,
      authenticityClaimed: false
    }
  });
}

export async function compareBaziCitationApplicabilityObservations(
  rawSlotAFileText: unknown,
  rawSlotBFileText: unknown,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationComparison> {
  try {
    return await compareBaziCitationApplicabilityObservationsInternal(
      rawSlotAFileText,
      rawSlotBFileText,
      rawCurrentContext
    );
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationComparisonError) throw cause;
    throw new BaziCitationApplicabilityObservationComparisonError(
      "INVALID_COMPARISON_INPUT",
      "双份引用适用性观察并列预检失败关闭。",
      { cause }
    );
  }
}
