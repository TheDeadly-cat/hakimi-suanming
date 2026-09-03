import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements,
  canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements,
  parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes,
  readVedicSourceBindingAndThreeLayerRightsRequirements,
  verifyVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

export const VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH =
  "content/system-admission/vedic-real-independent-expert-review-plan.v1.json";

const ADR_RELATIVE_PATH = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const INPUT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const INPUT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const FACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";
const FACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-requirements.v1.json";
const RULE_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json";
const RULE_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-requirements.v1.json";

const CHAIN_ORDER = Object.freeze([
  ADR_RELATIVE_PATH,
  INPUT_DRAFT_RELATIVE_PATH,
  INPUT_REQUIREMENTS_RELATIVE_PATH,
  FACT_DRAFT_RELATIVE_PATH,
  FACT_REQUIREMENTS_RELATIVE_PATH,
  RULE_DRAFT_RELATIVE_PATH,
  RULE_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH
]);

const RECORD_TYPE = "vedic_real_independent_expert_review_plan_v1";
const PLAN_ID = "hakimi.vedic.real-independent-expert-review-plan/1.0.0";
const STATUS =
  "complete_verifiable_material_contract_for_two_vacant_real_independent_expert_seats_zero_expert_instances_review_not_started";
const ARTIFACT_ROLE =
  "non_product_governance_real_independent_expert_review_plan";
const CREATED_AT = "2026-08-29T00:00:00.000Z";
const DIGEST_DOMAIN = "hakimi.vedic.real-independent-expert-review-plan.v1";
const MAX_PLAN_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const EXPECTED_SOURCE_RIGHTS_IDENTITY = Object.freeze({
  bytes: 85_752,
  ledgerDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e",
  path: VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
  status:
    "requirements_only_current_scoped_inventory_38_all_unbound_open_universe_no_sources_bodies_quotes_bindings_or_three_layer_rights_established"
});

const INPUT_REQUIREMENT_IDS = Object.freeze([
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

const FACT_REQUIREMENT_IDS = Object.freeze([
  "accepted_input_and_evaluated_candidate_identity",
  "fact_generation_implementation_identity",
  "observation_instant_and_time_scale_semantics",
  "coordinate_frame_and_numeric_representation_semantics",
  "graha_catalog_and_position_semantics",
  "rahu_ketu_node_mode_and_position_invariant",
  "lagna_definition_and_position_semantics",
  "rashi_catalog_segmentation_and_boundary_semantics",
  "bhava_definition_geometry_and_assignment_semantics",
  "candidate_transition_provenance_semantics",
  "fact_completeness_uniqueness_and_cross_field_invariants",
  "rejection_channel_and_no_partial_fact_artifact"
]);

const RULE_REQUIREMENT_IDS = Object.freeze([
  "admitted_fact_contract_and_deterministic_fact_instances",
  "rule_school_identity_scope_and_lineage_semantics",
  "rule_applicability_condition_semantics",
  "rule_conflict_declaration_and_resolution_semantics",
  "rule_counterexample_model_and_retention_semantics",
  "source_body_quote_locator_and_binding",
  "rule_and_ruleset_version_digest_and_summary_semantics",
  "fact_dependency_contract_and_invariants",
  "rule_completeness_uniqueness_and_cross_rule_invariants",
  "rights_license_and_redistribution_review",
  "independent_expert_review_and_disagreement_retention",
  "high_risk_output_policy_abstention_and_failure_semantics",
  "executable_ruleset_implementation_identity_and_failure_channel"
]);

const REQUIRED_RESPONSE_FIELDS = Object.freeze([
  "finding",
  "basisRefs",
  "counterexampleRefs",
  "uncertainty",
  "recommendedDisposition"
]);

const QUESTION_DEFINITIONS = Object.freeze([
  Object.freeze({
    layer: "input",
    prompt:
      "审阅历法、本地时间、时区、DST、UTC、星历身份与出生时间不确定性语义；列出不可判定项和边界反例。",
    questionId: "input-time-place-uncertainty-and-ephemeris-semantics",
    requirementIds: Object.freeze(INPUT_REQUIREMENT_IDS.slice(0, 8)),
    title: "时间、地点、不确定性与星历输入语义"
  }),
  Object.freeze({
    layer: "input",
    prompt:
      "审阅恒星黄道、ayanamsa、Rahu/Ketu、bhava 与出生时间扰动候选的流派和版本边界，不得把候选直接提升为权威。",
    questionId: "input-zodiac-ayanamsa-node-house-and-perturbation-policy",
    requirementIds: Object.freeze(INPUT_REQUIREMENT_IDS.slice(8)),
    title: "黄道、岁差、交点、宫位与扰动策略"
  }),
  Object.freeze({
    layer: "fact",
    prompt:
      "审阅已接受输入、计算实现、时刻尺度、坐标框架、graha、交点和 lagna 的确定性事实语义及可复核边界。",
    questionId: "fact-identity-frame-graha-node-and-lagna-semantics",
    requirementIds: Object.freeze(FACT_REQUIREMENT_IDS.slice(0, 7)),
    title: "事实身份、框架、星体、交点与上升点"
  }),
  Object.freeze({
    layer: "fact",
    prompt:
      "审阅 rashi、bhava、候选转折来源、完整性唯一性和失败关闭语义；任何缺失不得生成部分事实成功件。",
    questionId: "fact-rashi-bhava-transition-invariant-and-rejection-semantics",
    requirementIds: Object.freeze(FACT_REQUIREMENT_IDS.slice(7)),
    title: "星座、宫位、转折、不变量与拒绝通道"
  }),
  Object.freeze({
    layer: "rule",
    prompt:
      "审阅规则流派身份、适用条件、冲突声明和反例保存；分歧必须形成版本化并列语义而非单一赢家。",
    questionId: "rule-school-applicability-conflict-and-counterexample-semantics",
    requirementIds: Object.freeze(RULE_REQUIREMENT_IDS.slice(0, 5)),
    title: "流派、适用性、冲突与反例"
  }),
  Object.freeze({
    layer: "rule",
    prompt:
      "审阅来源正文、exact quote、locator、规则版本和许可复核需求的内容相关性；领域专家不得签发权利法律结论。",
    questionId: "rule-source-version-and-rights-review-boundary",
    requirementIds: Object.freeze([
      RULE_REQUIREMENT_IDS[5],
      RULE_REQUIREMENT_IDS[6],
      RULE_REQUIREMENT_IDS[9]
    ]),
    title: "来源、版本与权利复核角色边界"
  }),
  Object.freeze({
    layer: "rule",
    prompt:
      "审阅事实依赖、规则完整性、执行实现身份和失败通道；工程错误必须修订冻结输入并触发两席重审。",
    questionId: "rule-fact-dependency-completeness-execution-and-failure",
    requirementIds: Object.freeze([
      RULE_REQUIREMENT_IDS[7],
      RULE_REQUIREMENT_IDS[8],
      RULE_REQUIREMENT_IDS[12]
    ]),
    title: "事实依赖、完整性、执行与失败"
  }),
  Object.freeze({
    layer: "rule",
    prompt:
      "审阅两席独立意见与分歧保存、高风险表达、弃权和失败语义；未解决分歧只能 defer 或 reject。",
    questionId: "rule-independent-review-disagreement-and-high-risk-expression",
    requirementIds: Object.freeze([
      RULE_REQUIREMENT_IDS[10],
      RULE_REQUIREMENT_IDS[11]
    ]),
    title: "独立审阅、分歧与高风险表达"
  })
]);

const ROLE_SEPARATION = Object.freeze([
  Object.freeze({
    allowedScope: Object.freeze([
      "vedic_input_semantics",
      "vedic_fact_semantics",
      "vedic_rule_school_and_version_scope",
      "vedic_source_text_translation_commentary_and_carrier_content_relevance",
      "counterexample_cases",
      "high_risk_expression_boundary"
    ]),
    forbiddenScope: Object.freeze([
      "rights_legal_conclusion",
      "engineering_reproducibility_attestation",
      "public_release_authorization",
      "other_system_domain_truth"
    ]),
    roleId: "vedic_domain_expert"
  }),
  Object.freeze({
    allowedScope: Object.freeze([
      "work_identity",
      "version_identity",
      "carrier_identity",
      "license_and_redistribution_evidence"
    ]),
    forbiddenScope: Object.freeze([
      "vedic_domain_truth",
      "rights_legal_conclusion",
      "engineering_reproducibility_attestation",
      "public_release_authorization"
    ]),
    roleId: "source_rights_reviewer"
  }),
  Object.freeze({
    allowedScope: Object.freeze([
      "input_lock",
      "fact_and_rule_lock",
      "digest_reproduction",
      "test_and_runtime_evidence"
    ]),
    forbiddenScope: Object.freeze([
      "vedic_school_truth",
      "rights_legal_conclusion",
      "public_release_authorization"
    ]),
    roleId: "engineering_reproducibility_reviewer"
  })
]);

const IDENTITY_PRIVACY_PLAN = Object.freeze({
  authenticityEstablished: false,
  identityContextInstances: Object.freeze([]),
  opinionContextInstances: Object.freeze([]),
  privateIdentityDossier: Object.freeze({
    encryptedOfflineOrEquivalentProtectedStorageRequired: true,
    rawMaterialRepositoryStorageAllowed: false,
    requiredRawFields: Object.freeze([
      "legal_identity_evidence",
      "credential_evidence",
      "scope_fit_evidence",
      "verification_process_evidence",
      "independent_verifier_binding",
      "verified_at",
      "raw_evidence_custody_ref",
      "same_upstream_dependency_disclosure_ref"
    ])
  }),
  privateOriginalOpinion: Object.freeze({
    appendOnlySealingRequired: true,
    authenticityAndCustodyVerificationRequired: true,
    rawMaterialRepositoryStorageAllowed: false,
    requiredRawFields: Object.freeze([
      "opinion_id",
      "reviewer_binding_id",
      "seat_id",
      "review_packet_id",
      "review_packet_digest",
      "question_set_digest",
      "responses_by_question_id",
      "scope_coverage",
      "disagreements_and_uncertainties",
      "submitted_at",
      "opinion_sha256",
      "signing_or_authenticity_evidence",
      "custody_ref"
    ]),
    samePacketAndQuestionSetBindingRequired: true,
    separateProtectedOriginalRequired: true,
    storageMechanismVerificationRequired: true
  }),
  publicOpaqueContextFields: Object.freeze([
    "contextId",
    "byteLength",
    "sha256",
    "custodianRef",
    "firstSeenRef",
    "retrievalRef",
    "redactedPublicBindingRef"
  ]),
  publicRepositoryProhibitedFields: Object.freeze([
    "legalName",
    "email",
    "phone",
    "address",
    "governmentId",
    "rawCredentialDocument",
    "rawOriginalOpinion",
    "privateContactHandle"
  ]),
  repositoryOpaqueContextsMayEstablishAuthenticity: false
});

const EXPERT_ELIGIBILITY_AND_VERIFICATION_PLAN = Object.freeze({
  acceptedCorroboratingEvidenceCategories: Object.freeze([
    "independent_institutional_or_professional_reference",
    "versioned_public_work_record",
    "protected_original_record_with_independent_authentication"
  ]),
  acceptedPrimaryVedicEvidenceCategories: Object.freeze([
    "attributed_vedic_training_or_teaching_record",
    "attributed_vedic_publication_translation_or_commentary_record",
    "attributed_vedic_casework_practice_or_research_record"
  ]),
  aiOnlyOrGeneratedProfileMayQualify: false,
  corroboratingEvidenceMustHaveIndependentProvenanceFromPrimary: true,
  eligibilityDecisionValues: Object.freeze(["verified", "rejected", "deferred"]),
  excludedAsSoleQualification: Object.freeze([
    "unrelated_astrology_system_expertise",
    "generic_occult_interest",
    "self_asserted_unverified_biography",
    "generated_model_output_or_ai_only_assessment"
  ]),
  minimumCorroboratingEvidenceCategories: 1,
  minimumPrimaryVedicEvidenceCategories: 1,
  primaryAndCorroboratingEvidenceRefsMustBeDistinctRecords: true,
  requiredVedicScopeCoverage: Object.freeze([
    "calendar_time_location_and_input_semantics",
    "astronomical_ephemeris_and_fact_derivation_semantics",
    "vedic_school_lineage_rule_version_and_interpretation",
    "source_text_translation_commentary_and_carrier_scope",
    "counterexamples_uncertainty_and_high_risk_expression_boundary"
  ]),
  requiredVedicScopeCoverageCount: 5,
  requiredVedicScopeCoverageRoleMappings: Object.freeze([
    Object.freeze({
      allowedScopeIds: Object.freeze(["vedic_input_semantics"]),
      scopeCoverageId: "calendar_time_location_and_input_semantics"
    }),
    Object.freeze({
      allowedScopeIds: Object.freeze(["vedic_fact_semantics"]),
      scopeCoverageId: "astronomical_ephemeris_and_fact_derivation_semantics"
    }),
    Object.freeze({
      allowedScopeIds: Object.freeze(["vedic_rule_school_and_version_scope"]),
      scopeCoverageId: "vedic_school_lineage_rule_version_and_interpretation"
    }),
    Object.freeze({
      allowedScopeIds: Object.freeze([
        "vedic_source_text_translation_commentary_and_carrier_content_relevance"
      ]),
      scopeCoverageId: "source_text_translation_commentary_and_carrier_scope"
    }),
    Object.freeze({
      allowedScopeIds: Object.freeze([
        "counterexample_cases",
        "high_risk_expression_boundary"
      ]),
      scopeCoverageId: "counterexamples_uncertainty_and_high_risk_expression_boundary"
    })
  ]),
  reviewerSeatsMayVerifyEachOther: false,
  reviewerSelfVerificationAllowed: false,
  scopeCoverageEvidenceMappingRequired: true,
  unrelatedSystemExpertiseMaySubstituteForVedicScope: false,
  verificationRecordRequiredFields: Object.freeze([
    "verification_record_id",
    "reviewer_binding_id",
    "verified_at",
    "verified_by_binding_id",
    "verification_method",
    "primary_credential_evidence_refs",
    "corroborating_evidence_refs",
    "scope_coverage_ids",
    "scope_coverage_evidence_refs",
    "eligibility_decision",
    "decision_reason",
    "raw_evidence_custody_ref"
  ]),
  verifierMustBeOutsideBothReviewerSeats: true,
  verifierMustBeDistinctFromReviewer: true
});

const INDEPENDENCE_FACTOR_IDS = Object.freeze([
  "same_institution_or_organization",
  "teacher_student_or_lineage_relationship",
  "family_or_household_relationship",
  "shared_commercial_interest",
  "rule_or_case_set_coauthorship",
  "shared_professional_service",
  "reporting_or_supervision_relationship",
  "prior_exposure_to_other_reviewer_conclusion",
  "shared_unpublished_source_or_case_material",
  "same_upstream_algorithm_or_textbook_dependency"
]);

const INDEPENDENCE_PLAN = Object.freeze({
  distinctRealNaturalPersonsRequired: true,
  factorIds: INDEPENDENCE_FACTOR_IDS,
  pairwiseAssessmentInstances: Object.freeze([]),
  pairwiseAssessmentRequired: true,
  pairwiseIndependenceVerified: false,
  sameUpstreamAgreementClassification:
    "agree_same_upstream_not_independent_corroboration",
  sameUpstreamDependencyDisclosureRequired: true,
  undisclosedMaterialDependencyFailsClosed: true
});

const REVIEW_PROCESS = Object.freeze({
  immutableOriginalOpinionsRequired: true,
  mutualDisclosureBeforeBothOriginalOpinionsSealedAllowed: false,
  reconciliationMayOverwriteOriginals: false,
  sameFrozenPacketRequired: true,
  sameQuestionSetRequired: true,
  steps: Object.freeze([
    "close_and_freeze_current_scope_sources_quotes_rights_rules_and_review_packet",
    "obtain_explicit_owner_authorization_for_protected_external_intake",
    "verify_both_reviewer_identities_credentials_scope_fit_and_pairwise_independence",
    "collect_seat_a_original_opinion_without_seat_b_opinion_access",
    "collect_seat_b_original_opinion_without_seat_a_opinion_access",
    "seal_and_preserve_both_separate_original_opinions",
    "publish_parallel_agreement_and_disagreement_inventory",
    "collect_append_only_independent_supplements_if_needed",
    "issue_reconciliation_note_without_overwriting_originals"
  ]),
  substantiveReviewStarted: false,
  supplementsMustBeSeparateRecords: true
});

const OPINION_PRESERVATION_PLAN = Object.freeze({
  appendOnlySupplementRequired: true,
  originalOpinionInstances: Object.freeze([]),
  originalsMayBeDeleted: false,
  originalsMayBeOverwritten: false,
  originalsMustRemainSeparatelyAddressable: true,
  sealedOriginalOpinions: 0
});

const DISAGREEMENT_POLICY = Object.freeze([
  Object.freeze({
    disagreementType: "school_divergence",
    requiredDisposition: "split_versioned_school_profiles"
  }),
  Object.freeze({
    disagreementType: "input_semantics",
    requiredDisposition: "split_versioned_input_policies"
  }),
  Object.freeze({
    disagreementType: "source_version_or_carrier_identity",
    requiredDisposition: "keep_affected_bindings_unverified"
  }),
  Object.freeze({
    disagreementType: "rule_interpretation",
    requiredDisposition: "preserve_parallel_interpretations_no_winner"
  }),
  Object.freeze({
    disagreementType: "engineering_error",
    requiredDisposition: "correct_artifact_freeze_new_packet_and_repeat_both_reviews"
  }),
  Object.freeze({
    disagreementType: "high_risk_expression",
    requiredDisposition: "apply_conservative_expression_or_no_release"
  }),
  Object.freeze({
    disagreementType: "cannot_decide",
    requiredDisposition: "defer"
  })
]);

const AUTOMATED_RESOLUTION_POLICY = Object.freeze({
  allowedUnresolvedDisposition: Object.freeze(["defer", "reject"]),
  generatedModelWinnerSelectionAllowed: false,
  majorityVoteAllowed: false,
  opinionAveragingAllowed: false,
  unresolvedDisagreementMayBeAdopted: false
});

const WITHDRAWAL_CORRECTION_REVOCATION_POLICY = Object.freeze({
  allowedEventTypes: Object.freeze(["correction", "withdrawal", "revocation"]),
  appendOnlyRecordRequiredFields: Object.freeze([
    "lifecycle_record_id",
    "event_type",
    "target_opinion_context_id",
    "actor_binding_id",
    "authority_evidence_ref",
    "reason",
    "effective_at",
    "record_sha256",
    "custody_ref"
  ]),
  authorityVerificationRequiredForCorrectionWithdrawalOrRevocation: true,
  correctedOpinionMustReferenceSupersededOpinion: true,
  correctionMustBeSeparateAppendOnlyRecord: true,
  correctionMayOverwriteOriginal: false,
  correctionReopensAffectedSeatAndGateUntilVerifiedResealedAndReconciled: true,
  correctionWithdrawalOrRevocationInvalidatesAffectedSeatAndGateUntilReverified: true,
  localWithholdingOrFileAbsenceCountsAsReviewerWithdrawal: false,
  originalRecordRetentionRequired: true,
  revocationMustBeSeparateAppendOnlyRecord: true,
  revocationImmediatelyInvalidatesAffectedSeatAndGate: true,
  reviewInputDriftRequiresNewPacketAndBothSeatRereview: true,
  withdrawalCorrectionOrRevocationInstances: Object.freeze([]),
  withdrawalImmediatelyInvalidatesAffectedSeatAndGate: true,
  withdrawalMustBeSeparateAppendOnlyRecord: true
});

const HIGH_RISK_EXPRESSION_REVIEW_PLAN = Object.freeze({
  disagreementDisposition: "conservative_expression_or_no_release",
  highRiskPolicyEstablished: false,
  planDefined: true,
  prohibitedBeforeSeparatePolicyAndAdmission: Object.freeze([
    "health",
    "legal",
    "financial",
    "death_or_lifespan",
    "disaster_or_calamity",
    "scientific_validity_claim",
    "prediction_accuracy_claim"
  ]),
  reviewQuestionId: "rule-independent-review-disagreement-and-high-risk-expression",
  separateHighRiskPolicyGateStillRequired: true
});

const REVIEW_PACKET_CONTRACT = Object.freeze({
  currentReviewPacketDigest: null,
  currentReviewPacketId: null,
  custodyIntegrityEvidenceRequired: true,
  externalSourceBodiesMayUseProtectedOpaqueContextRefs: true,
  inputDriftRequiresNewPacketIdAndBothSeatRereview: true,
  instanceRequiredFields: Object.freeze([
    "review_packet_id",
    "packet_sha256",
    "manifest_sha256",
    "question_set_sha256",
    "requirement_subject_set_sha256",
    "source_universe_sha256",
    "deterministic_fact_set_sha256",
    "versioned_rule_set_sha256",
    "high_risk_policy_sha256",
    "custody_ref",
    "frozen_at"
  ]),
  manifestEntriesMustBindByteLengthSha256AndCanonicalPathOrOpaqueContextRef: true,
  minimumManifestEntryTypes: Object.freeze([
    "review_scope_subject_manifest",
    "review_question_set",
    "source_binding_and_rights_status_manifest",
    "source_bodies_exact_quotes_and_locators",
    "deterministic_fact_instance_set",
    "versioned_rule_set",
    "high_risk_expression_policy",
    "reviewer_instruction_and_disagreement_policy"
  ]),
  packetMayContainOtherReviewerOpinion: false,
  questionSetDigestMustBindCurrentEightQuestions: true,
  requirementSubjectDigestMustBindCurrentThirtyEightSubjects: true,
  reviewPacketInstances: Object.freeze([]),
  samePacketDigestBoundToBothSeatsRequired: true,
  sameQuestionSetDigestBoundToBothSeatsRequired: true
});

const REVIEW_START_PREREQUISITES = Object.freeze({
  protectedExternalIntakeAuthorized: false,
  required: 16,
  satisfied: 0,
  states: Object.freeze([
    Object.freeze({
      currentState: false,
      prerequisiteId: "source_rights_requirements_universe_closed",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "all_in_scope_source_bindings_frozen_verified",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "source_bodies_exact_quotes_and_locators_bound",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "work_version_carrier_rights_review_complete",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "deterministic_fact_instances_frozen",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "versioned_ruleset_frozen",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "owner_protected_external_intake_authorized",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "final_review_packet_rebased_and_frozen",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "two_distinct_real_reviewer_seats_occupied",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "both_reviewer_identity_authenticity_verified",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "both_reviewer_credentials_and_vedic_scope_fit_verified_under_plan",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "pairwise_independence_and_same_upstream_disclosures_verified",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "private_identity_dossier_authenticity_and_custody_mechanism_ready",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "original_opinion_sealing_append_only_custody_and_storage_mechanism_ready",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "review_packet_manifest_digest_custody_and_same_question_bindings_verified",
      requiredState: true
    }),
    Object.freeze({
      currentState: false,
      prerequisiteId: "future_expert_instance_and_lifecycle_implementation_frozen",
      requiredState: true
    })
  ]),
  substantiveReviewMayStart: false
});

function vacantSeat(slotId) {
  return Object.freeze({
    credentialVerificationState: "absent",
    identityDossierContextId: null,
    identityVerificationState: "absent",
    independenceVerificationState: "absent",
    originalOpinionContextId: null,
    originalOpinionDigest: null,
    originalOpinionStored: false,
    priorExposureToOtherOpinion: null,
    publicIdentityBindingId: null,
    reviewerBinding: null,
    scopeVerificationState: "absent",
    slotId,
    status: "vacant",
    submittedAt: null
  });
}

const REVIEWER_SEATS = Object.freeze([
  vacantSeat("vedic-domain-expert-a"),
  vacantSeat("vedic-domain-expert-b")
]);

const ZERO_INSTANCE_RECEIPT = Object.freeze({
  correctionWithdrawalOrRevocationRecords: 0,
  credentialsVerified: 0,
  disagreementInventories: 0,
  eligibilityVerificationRecords: 0,
  expertReviewBundles: 0,
  identityDossierContexts: 0,
  identitiesVerified: 0,
  independentExpertReviewsVerified: 0,
  opinionContexts: 0,
  opinionsVerified: 0,
  pairwiseIndependenceAssessments: 0,
  pairwiseIndependenceVerified: 0,
  realExpertsIdentified: 0,
  reconciliationNotes: 0,
  reviewPacketInstances: 0,
  reviewSessionsStarted: 0,
  reviewerIds: Object.freeze([]),
  reviewerSlotsDefined: 2,
  reviewerSlotsOccupied: 0,
  scopeFitsVerified: 0,
  sealedOriginalOpinions: 0,
  substantiveReviewStarted: false
});

const GATE_BOUNDARY = Object.freeze({
  contentTruthEstablished: false,
  countsTowardExpertGate: false,
  expertReviewBundleComplete: false,
  expertReviewBundleState: "absent_zero_instances",
  expertTruthEstablished: false,
  planCoverageComplete: true,
  reviewPlanDefined: true,
  reviewStartEligible: false,
  rightsLegalConclusionEstablished: false
});

const AUTHORITY_BOUNDARY = Object.freeze({
  baziAuthorityInherited: false,
  contentTruthEstablished: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  expertReviewBundleComplete: false,
  expertTruthEstablished: false,
  formalAdmissionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false
});

const PRODUCT_BOUNDARY = Object.freeze({
  centralRegistryIntegration: "absent",
  domainManifest: "absent",
  legacyV13Inherited: false,
  migrationId: null,
  productSurface: "absent",
  releaseIdentity: null,
  schema13Inherited: false,
  targetSchema: null
});

const EVIDENCE_BOUNDARY = Object.freeze({
  contentTruth: "not_established",
  expertTruth: "not_established",
  identityAuthenticity: "not_established",
  independentExpertReviewsVerified: 0,
  opinionAuthenticity: "not_established",
  planMaterialCoverage: "complete",
  publicReleaseAuthorization: "not_authorized",
  releaseReadiness: "not_ready",
  rightsLegalConclusion: "not_established"
});

const OBSERVATION_BOUNDARY = Object.freeze({
  abaExcluded: false,
  boundArtifactHashAndInspectionUseSameReadBuffer: true,
  crossFileAtomicSnapshot: false,
  heldFileHandleReads: true,
  intervalMutationExcluded: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  pathEndpointRevalidated: true,
  plainDirectoryChainRequired: true,
  planAndUpstreamsAtomicSnapshot: false,
  planHashAndParseUseSameReadBuffer: true
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "real_expert_identity_credentials_scope_or_independence",
  "identity_dossier_or_original_opinion_authenticity",
  "expert_opinion_or_expert_review_bundle",
  "content_truth_expert_truth_or_traditional_authority",
  "source_binding_exact_quote_or_three_layer_rights_conclusion",
  "rights_legal_conclusion_or_redistribution_authorization",
  "high_risk_policy_completion",
  "deterministic_fact_instances_rule_instances_or_versioned_ruleset",
  "legacy_v13_schema13_or_other_system_authority_inheritance",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_release_readiness_or_public_release_authorization"
]);

export class VedicRealIndependentExpertReviewPlanError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "VedicRealIndependentExpertReviewPlanError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) {
  throw new VedicRealIndependentExpertReviewPlanError(code, message, options);
}

function translated(cause, fallbackCode, message) {
  if (cause instanceof VedicRealIndependentExpertReviewPlanError) throw cause;
  throw new VedicRealIndependentExpertReviewPlanError(
    typeof cause?.code === "string" ? cause.code : fallbackCode,
    message,
    { cause }
  );
}

function captureJsonValue(value, label = "吠陀现实独立专家审阅计划") {
  try {
    return JSON.parse(
      canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(value)
    );
  } catch (cause) {
    translated(cause, "INPUT_INVALID", label + " 不是被动可捕获的严格 JSON 数据。");
  }
}

export function canonicalStringifyVedicRealIndependentExpertReviewPlan(value) {
  try {
    return canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(value);
  } catch (cause) {
    translated(cause, "INPUT_INVALID", "吠陀现实独立专家审阅计划无法 canonical 化。");
  }
}

export function canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan(value) {
  try {
    return canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(value);
  } catch (cause) {
    translated(cause, "INPUT_INVALID", "吠陀现实独立专家审阅计划无法 canonical pretty 化。");
  }
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(canonicalStringifyVedicRealIndependentExpertReviewPlan(value), "utf8")
    .digest("hex");
}

export function computeVedicRealIndependentExpertReviewPlanDigest(planInput) {
  const plan = captureJsonValue(planInput);
  const { planDigest: _ignored, ...unsigned } = plan;
  return domainSeparatedDigest(DIGEST_DOMAIN, unsigned);
}

export function parseVedicRealIndependentExpertReviewPlanJsonBytes(
  bytes,
  label = "吠陀现实独立专家审阅计划 JSON",
  maxBytes = MAX_PLAN_BYTES
) {
  try {
    const parsed = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      bytes,
      label,
      maxBytes
    );
    return captureJsonValue(parsed, label);
  } catch (cause) {
    translated(cause, "JSON_INVALID", label + " 解析失败。");
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value);
  }
  return Object.freeze(value);
}

function exactJson(left, right) {
  return canonicalStringifyVedicRealIndependentExpertReviewPlan(left)
    === canonicalStringifyVedicRealIndependentExpertReviewPlan(right);
}

function sameFilesystemPath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function canonicalRelativePath(relativePath, label) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.startsWith("/")
    || path.posix.isAbsolute(relativePath)
    || /^[A-Za-z]:/u.test(relativePath)) {
    fail("PATH_INVALID", label + " 必须是项目内 canonical POSIX 相对路径。");
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath
    || normalized === ".."
    || normalized.startsWith("../")
    || relativePath.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail("PATH_INVALID", label + " 不是 canonical 项目内路径。");
  }
  return relativePath;
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const canonical = canonicalRelativePath(relativePath, "工件路径");
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...canonical.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === ".."
    || relative.startsWith(".." + path.sep)
    || path.isAbsolute(relative)) {
    fail("PATH_INVALID", "工件路径越出工作区。");
  }
  return { absolute, canonical, root };
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function verifyPlainDirectoryChain(root, canonicalPath, invalidCode, label) {
  const rootReal = await realpath(root);
  if (!sameFilesystemPath(rootReal, root)) {
    fail(invalidCode, label + " 工作区根必须是物理目录。");
  }
  let cursor = root;
  for (const segment of canonicalPath.split("/").slice(0, -1)) {
    cursor = path.join(cursor, segment);
    const stats = await lstat(cursor, { bigint: true });
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail(invalidCode, label + " 的目录链包含非普通目录或符号链接。");
    }
    const resolved = await realpath(cursor);
    if (!sameFilesystemPath(resolved, cursor)) {
      fail(invalidCode, label + " 的目录链包含 junction 或重定向。");
    }
  }
}

async function readAtMost(handle, size, maxBytes, invalidCode, label) {
  if (size > BigInt(maxBytes)) fail(invalidCode, label + " 超过字节上限。");
  const length = Number(size);
  const bytes = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const { bytesRead } = await handle.read(bytes, offset, length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset !== length) fail(invalidCode, label + " 读取长度与文件状态不一致。");
  return bytes;
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes,
  options = {}
) {
  const {
    invalidCode = "BOUND_ARTIFACT_ENDPOINT_INVALID",
    label = relativePath,
    missingCode = "BOUND_ARTIFACT_MISSING"
  } = options;
  const target = safeWorkspaceFile(workspaceRoot, relativePath);
  try {
    await verifyPlainDirectoryChain(target.root, target.canonical, invalidCode, label);
    const endpointBefore = await lstat(target.absolute, { bigint: true });
    if (!endpointBefore.isFile()
      || endpointBefore.isSymbolicLink()
      || endpointBefore.nlink !== 1n) {
      fail(invalidCode, label + " 必须是单链接普通文件。");
    }
    const endpointRealBefore = await realpath(target.absolute);
    if (!sameFilesystemPath(endpointRealBefore, target.absolute)) {
      fail(invalidCode, label + " 文件端点被重定向。");
    }
    const handle = await open(target.absolute, "r");
    try {
      const before = await handle.stat({ bigint: true });
      if (!sameEndpoint(before, endpointBefore)) {
        fail(invalidCode, label + " 打开前后端点不一致。");
      }
      const bytes = await readAtMost(handle, before.size, maxBytes, invalidCode, label);
      const after = await handle.stat({ bigint: true });
      const endpointAfter = await lstat(target.absolute, { bigint: true });
      const endpointRealAfter = await realpath(target.absolute);
      if (!sameEndpoint(before, after)
        || !sameEndpoint(after, endpointAfter)
        || !sameFilesystemPath(endpointRealAfter, target.absolute)) {
        fail(invalidCode, label + " 在持有句柄读取期间发生端点或区间漂移。");
      }
      return Object.freeze({
        bytes,
        path: target.canonical,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        size: bytes.byteLength
      });
    } finally {
      await handle.close();
    }
  } catch (cause) {
    if (cause instanceof VedicRealIndependentExpertReviewPlanError) throw cause;
    if (cause?.code === "ENOENT") {
      throw new VedicRealIndependentExpertReviewPlanError(
        missingCode,
        label + " 不存在。",
        { cause }
      );
    }
    throw new VedicRealIndependentExpertReviewPlanError(
      invalidCode,
      label + " 无法按稳定普通文件端点读取。",
      { cause }
    );
  }
}

function strictUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new VedicRealIndependentExpertReviewPlanError(
      "BOUND_ARTIFACT_UTF8_INVALID",
      label + " 不是严格 UTF-8。",
      { cause }
    );
  }
}

function subjectId(layer, requirementId) {
  return "vedic." + layer + "." + requirementId;
}

function buildReviewQuestions(subjectIds) {
  const available = new Set(subjectIds);
  const questions = QUESTION_DEFINITIONS.map((definition) => ({
    assignedReviewerRoleId: "vedic_domain_expert",
    coveredSubjectIds: definition.requirementIds.map((requirementId) => {
      const id = subjectId(definition.layer, requirementId);
      if (!available.has(id)) {
        fail("QUESTION_COVERAGE_INVALID", "问题集引用了不存在的 requirement subject：" + id);
      }
      return id;
    }),
    prompt: definition.prompt,
    questionId: definition.questionId,
    requiredResponseFields: [...REQUIRED_RESPONSE_FIELDS],
    title: definition.title
  }));
  const covered = questions.flatMap((question) => question.coveredSubjectIds);
  if (covered.length !== subjectIds.length
    || new Set(covered).size !== covered.length
    || !subjectIds.every((id) => covered.includes(id))) {
    fail("QUESTION_COVERAGE_INVALID", "八个问题必须精确覆盖当前 38 个 subject 且不重叠。");
  }
  return questions;
}

async function verifySourceRightsSnapshot(workspaceRoot, snapshot) {
  if (snapshot.path !== EXPECTED_SOURCE_RIGHTS_IDENTITY.path
    || snapshot.size !== EXPECTED_SOURCE_RIGHTS_IDENTITY.bytes
    || snapshot.sha256 !== EXPECTED_SOURCE_RIGHTS_IDENTITY.sha256) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_IDENTITY_MISMATCH",
      "吠陀来源权利要求账 bytes 或 raw SHA-256 漂移。"
    );
  }
  const ledger = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀来源权利要求账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  if (canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(ledger)
      !== strictUtf8(snapshot.bytes, "吠陀来源权利要求账")) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_MATERIALIZATION_MISMATCH",
      "吠陀来源权利要求账不是 canonical materialization。"
    );
  }
  let objectResult;
  let readResult;
  try {
    [objectResult, readResult] = await Promise.all([
      verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, ledger),
      readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot)
    ]);
  } catch (cause) {
    throw new VedicRealIndependentExpertReviewPlanError(
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀来源权利要求账 public object/read API 或七层闭包无效。",
      { cause }
    );
  }
  if (!exactJson(objectResult.ledger, ledger)
    || !exactJson(readResult, ledger)
    || objectResult.ledgerDigest !== EXPECTED_SOURCE_RIGHTS_IDENTITY.ledgerDigest
    || objectResult.status !== EXPECTED_SOURCE_RIGHTS_IDENTITY.status
    || objectResult.subjectCount !== 38
    || objectResult.bindingRequired !== 38
    || objectResult.bindingFrozenVerified !== 0
    || objectResult.requirementsUniverseClosed !== false
    || objectResult.sourceBundleComplete !== false
    || objectResult.rightsBundleComplete !== false) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_SEMANTIC_MISMATCH",
      "专家计划只能绑定当前 38 项开放、全未绑定、source/rights bundle 均未完成的 child。"
    );
  }
  const upstreamArtifacts = ledger.boundaryBindings?.upstreamArtifacts;
  const childChain = ledger.boundaryBindings?.chainOrder;
  if (!Array.isArray(upstreamArtifacts)
    || upstreamArtifacts.length !== 7
    || !exactJson(childChain, CHAIN_ORDER.slice(0, 7))
    || !exactJson(upstreamArtifacts.map((entry) => entry.path), CHAIN_ORDER.slice(0, 7))) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID",
      "来源权利 child 未形成精确七层单向上游。"
    );
  }
  return {
    ledger,
    objectResult,
    upstreamArtifacts: captureJsonValue(upstreamArtifacts)
  };
}

function sourceRightsArtifactBinding(snapshot, ledger) {
  return {
    artifactRole: ledger.artifactRole,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    bytes: snapshot.size,
    ledgerDigest: ledger.ledgerDigest,
    path: snapshot.path,
    rawHashAndInspectionUseSameReadBuffer: true,
    requirementsUniverseClosed: false,
    rightsBundleComplete: false,
    sha256: snapshot.sha256,
    sourceBundleComplete: false,
    status: ledger.status,
    subjectCount: 38
  };
}

async function buildUnsignedCurrent(workspaceRoot) {
  const sourceRightsSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
    MAX_BOUND_ARTIFACT_BYTES,
    {
      invalidCode: "SOURCE_RIGHTS_REQUIREMENTS_ENDPOINT_INVALID",
      label: "吠陀来源与三层权利要求账",
      missingCode: "SOURCE_RIGHTS_REQUIREMENTS_MISSING"
    }
  );
  const verified = await verifySourceRightsSnapshot(workspaceRoot, sourceRightsSnapshot);
  const subjects = verified.ledger.subjects;
  const subjectIds = subjects.map((subject) => subject.subjectId);
  const reviewQuestions = buildReviewQuestions(subjectIds);
  const unsigned = {
    artifactRole: ARTIFACT_ROLE,
    authorityBoundary: AUTHORITY_BOUNDARY,
    automatedResolutionPolicy: AUTOMATED_RESOLUTION_POLICY,
    boundaryBindings: {
      bindingDirection:
        "expert_review_plan_to_adr_input_fact_rule_and_source_rights_requirements_only",
      chainOrder: [...CHAIN_ORDER],
      planBindsCentralRegistry: false,
      planBindsParent: false,
      planBindsRuntimeProposal: false,
      planBindsSourceRightsRequirements: true,
      upstreamArtifacts: [
        ...verified.upstreamArtifacts,
        sourceRightsArtifactBinding(sourceRightsSnapshot, verified.ledger)
      ]
    },
    createdAt: CREATED_AT,
    disagreementPolicy: DISAGREEMENT_POLICY,
    doesNotEstablish: DOES_NOT_ESTABLISH,
    evidenceBoundary: EVIDENCE_BOUNDARY,
    expertEligibilityAndVerificationPlan: EXPERT_ELIGIBILITY_AND_VERIFICATION_PLAN,
    gateBoundary: GATE_BOUNDARY,
    highRiskExpressionReviewPlan: HIGH_RISK_EXPRESSION_REVIEW_PLAN,
    identityPrivacyPlan: IDENTITY_PRIVACY_PLAN,
    independencePlan: INDEPENDENCE_PLAN,
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    observationBoundary: OBSERVATION_BOUNDARY,
    opinionPreservationPlan: OPINION_PRESERVATION_PLAN,
    planCoverageComplete: true,
    planCoverageMeaning:
      "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance",
    planId: PLAN_ID,
    productBoundary: PRODUCT_BOUNDARY,
    recordType: RECORD_TYPE,
    reviewPacketContract: REVIEW_PACKET_CONTRACT,
    reviewProcess: REVIEW_PROCESS,
    reviewQuestions,
    reviewerSeats: REVIEWER_SEATS,
    reviewScope: {
      artifactSetState:
        "current_drafts_and_open_requirements_only_no_content_fact_rule_or_expert_instances",
      countsByLayer: {
        fact: subjects.filter((subject) => subject.layer === "fact").length,
        input: subjects.filter((subject) => subject.layer === "input").length,
        rule: subjects.filter((subject) => subject.layer === "rule").length
      },
      excludedScopes: [
        "bazi_domain_truth_or_expert_authority",
        "ziwei_domain_truth_or_expert_authority",
        "western_astrology_domain_truth_or_expert_authority",
        "rights_or_legal_adjudication",
        "engineering_release_readiness",
        "individual_fortune_prediction",
        "public_deployment_authorization"
      ],
      requirementSubjectCount: subjectIds.length,
      requirementSubjectIds: subjectIds,
      scopeId: "vedic-independent-productization-current-38-requirements",
      systemId: "vedic"
    },
    reviewStartPrerequisites: REVIEW_START_PREREQUISITES,
    reviewStarted: false,
    roleSeparation: ROLE_SEPARATION,
    schemaVersion: "1.0.0",
    status: STATUS,
    systemIdentity: {
      contractSystemId: "vedic",
      integrationStatus: "not_integrated",
      productStatus: "research_only",
      productSystemId: "vedic-astrology"
    },
    withdrawalCorrectionRevocationPolicy: WITHDRAWAL_CORRECTION_REVOCATION_POLICY,
    zeroInstanceReceipt: ZERO_INSTANCE_RECEIPT
  };
  return unsigned;
}

export async function buildCurrentVedicRealIndependentExpertReviewPlan(workspaceRoot) {
  const unsigned = await buildUnsignedCurrent(workspaceRoot);
  return deepFreeze({
    ...captureJsonValue(unsigned),
    planDigest: domainSeparatedDigest(DIGEST_DOMAIN, unsigned)
  });
}

function requireExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("PLAN_INVALID", label + " 必须是对象。");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("PLAN_INVALID", label + " 字段集合不匹配。");
  }
}

function requireStaticBoundary(plan) {
  requireExactKeys(plan, [
    "artifactRole",
    "authorityBoundary",
    "automatedResolutionPolicy",
    "boundaryBindings",
    "createdAt",
    "disagreementPolicy",
    "doesNotEstablish",
    "evidenceBoundary",
    "expertEligibilityAndVerificationPlan",
    "gateBoundary",
    "highRiskExpressionReviewPlan",
    "identityPrivacyPlan",
    "independencePlan",
    "integrityBoundary",
    "observationBoundary",
    "opinionPreservationPlan",
    "planCoverageComplete",
    "planCoverageMeaning",
    "planDigest",
    "planId",
    "productBoundary",
    "recordType",
    "reviewPacketContract",
    "reviewProcess",
    "reviewQuestions",
    "reviewerSeats",
    "reviewScope",
    "reviewStartPrerequisites",
    "reviewStarted",
    "roleSeparation",
    "schemaVersion",
    "status",
    "systemIdentity",
    "withdrawalCorrectionRevocationPolicy",
    "zeroInstanceReceipt"
  ], "吠陀现实独立专家审阅计划");
  if (plan.schemaVersion !== "1.0.0"
    || plan.recordType !== RECORD_TYPE
    || plan.planId !== PLAN_ID
    || plan.artifactRole !== ARTIFACT_ROLE
    || plan.createdAt !== CREATED_AT
    || plan.status !== STATUS) {
    fail("PLAN_INVALID", "吠陀现实独立专家审阅计划身份或状态无效。");
  }
  if (plan.planCoverageComplete !== true || plan.reviewStarted !== false) {
    fail(
      "PLAN_COVERAGE_OR_REVIEW_STATE_INVALID",
      "计划材料覆盖完整不得冒充现实审阅已开始或完成。"
    );
  }
  if (plan.planCoverageMeaning
      !== "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance") {
    fail(
      "PLAN_COVERAGE_OR_REVIEW_STATE_INVALID",
      "计划覆盖只能表示材料契约覆盖，不能表示专家实例、真值或 gate。"
    );
  }
  if (!exactJson(plan.reviewerSeats, REVIEWER_SEATS)
    || !exactJson(plan.zeroInstanceReceipt, ZERO_INSTANCE_RECEIPT)) {
    fail(
      "EXPERT_INSTANCE_PROMOTED",
      "两席必须保持 vacant，身份、资质、独立性、意见、撤回更正和 review 实例必须为零。"
    );
  }
  if (!exactJson(plan.identityPrivacyPlan, IDENTITY_PRIVACY_PLAN)) {
    fail("IDENTITY_PRIVACY_PLAN_INVALID", "仓外 dossier、意见原件与仓内 opaque context 的隐私分账被删改。");
  }
  if (!exactJson(
    plan.expertEligibilityAndVerificationPlan,
    EXPERT_ELIGIBILITY_AND_VERIFICATION_PLAN
  )) {
    fail(
      "EXPERT_ELIGIBILITY_PLAN_INVALID",
      "两席必须按吠陀范围证据、独立复核人和非自证记录机械核验，其他体系或 AI-only 不能替代。"
    );
  }
  if (!exactJson(plan.independencePlan, INDEPENDENCE_PLAN)) {
    fail("INDEPENDENCE_PLAN_INVALID", "两席现实自然人、逐项独立性与 same-upstream 分账被删改。");
  }
  if (!exactJson(plan.reviewProcess, REVIEW_PROCESS)
    || !exactJson(plan.opinionPreservationPlan, OPINION_PRESERVATION_PLAN)) {
    fail("OPINION_PROCESS_INVALID", "盲审顺序、同题集、原始意见分开保存或补充不覆盖边界被删改。");
  }
  if (!exactJson(plan.disagreementPolicy, DISAGREEMENT_POLICY)
    || !exactJson(plan.automatedResolutionPolicy, AUTOMATED_RESOLUTION_POLICY)) {
    fail(
      "DISAGREEMENT_POLICY_INVALID",
      "分歧不得多数表决、平均、自动选赢家或直接采用。"
    );
  }
  if (!exactJson(
    plan.withdrawalCorrectionRevocationPolicy,
    WITHDRAWAL_CORRECTION_REVOCATION_POLICY
  )) {
    fail(
      "OPINION_LIFECYCLE_POLICY_INVALID",
      "撤回、更正、撤销必须追加保存、核验权限并使受影响席位和 gate 失败关闭。"
    );
  }
  if (!exactJson(plan.highRiskExpressionReviewPlan, HIGH_RISK_EXPRESSION_REVIEW_PLAN)) {
    fail("HIGH_RISK_REVIEW_PLAN_INVALID", "高风险表达审阅计划不得冒充独立 high-risk policy gate 完成。");
  }
  if (!exactJson(plan.reviewPacketContract, REVIEW_PACKET_CONTRACT)) {
    fail(
      "REVIEW_PACKET_CONTRACT_INVALID",
      "审阅包必须绑定 manifest、digest、保管、当前 38 subjects、八问和两席同包同题集。"
    );
  }
  if (!exactJson(plan.reviewStartPrerequisites, REVIEW_START_PREREQUISITES)) {
    fail(
      "REVIEW_START_PREREQUISITES_PROMOTED",
      "当前开放来源权利和零事实/ruleset 状态不得冒充可以启动现实审阅。"
    );
  }
  if (!exactJson(plan.gateBoundary, GATE_BOUNDARY)
    || !exactJson(plan.evidenceBoundary, EVIDENCE_BOUNDARY)
    || !exactJson(plan.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail(
      "EXPERT_GATE_OR_EVIDENCE_PROMOTED",
      "计划定义不能建立 expert bundle、内容/专家真值、权利法律结论或发布证据。"
    );
  }
  if (!exactJson(plan.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTED", "领域、专家、准入和发布 authority 必须保持 false。");
  }
  if (!exactJson(plan.productBoundary, PRODUCT_BOUNDARY)) {
    fail("PRODUCT_BOUNDARY_PROMOTED", "吠陀计划不得继承 legacy-v13、Schema 13 或其他产品身份。");
  }
  if (!exactJson(plan.observationBoundary, OBSERVATION_BOUNDARY)) {
    fail(
      "OBSERVATION_BOUNDARY_PROMOTED",
      "计划没有 mutation epoch、跨文件原子快照、区间 mutation 或 ABA 排除。"
    );
  }
  if (!exactJson(plan.roleSeparation, ROLE_SEPARATION)) {
    fail("ROLE_SEPARATION_INVALID", "领域、来源权利和工程复现角色不得越权互签。");
  }
  if (plan.reviewScope?.systemId !== "vedic"
    || plan.reviewScope?.requirementSubjectCount !== 38
    || plan.reviewScope?.countsByLayer?.input !== 13
    || plan.reviewScope?.countsByLayer?.fact !== 12
    || plan.reviewScope?.countsByLayer?.rule !== 13
    || !Array.isArray(plan.reviewScope.requirementSubjectIds)
    || new Set(plan.reviewScope.requirementSubjectIds).size !== 38
    || !Array.isArray(plan.reviewQuestions)
    || plan.reviewQuestions.length !== 8) {
    fail("REVIEW_SCOPE_INVALID", "审阅范围必须精确覆盖当前 13+12+13 个吠陀 requirement subjects。");
  }
  const covered = plan.reviewQuestions.flatMap((question) => question.coveredSubjectIds ?? []);
  if (covered.length !== 38
    || new Set(covered).size !== 38
    || !plan.reviewScope.requirementSubjectIds.every((id) => covered.includes(id))
    || !plan.reviewQuestions.every((question) =>
      question?.assignedReviewerRoleId === "vedic_domain_expert")) {
    fail("QUESTION_COVERAGE_INVALID", "八个同题集问题未精确覆盖当前 38 个 subjects。");
  }
  const bindings = plan.boundaryBindings;
  const bindingText = canonicalStringifyVedicRealIndependentExpertReviewPlan(bindings);
  if (bindings?.bindingDirection
      !== "expert_review_plan_to_adr_input_fact_rule_and_source_rights_requirements_only"
    || bindings?.planBindsParent !== false
    || bindings?.planBindsCentralRegistry !== false
    || bindings?.planBindsRuntimeProposal !== false
    || bindings?.planBindsSourceRightsRequirements !== true
    || bindingText.includes("vedic-independent-productization-requirements")
    || bindingText.includes("four-system-admission")
    || bindingText.includes("vedic-runtime-and-bundle-size-proposal")
    || !exactJson(bindings?.chainOrder, CHAIN_ORDER)
    || !Array.isArray(bindings?.upstreamArtifacts)
    || bindings.upstreamArtifacts.length !== CHAIN_ORDER.length
    || !exactJson(bindings.upstreamArtifacts.map((entry) => entry.path), CHAIN_ORDER)) {
    fail(
      "BOUND_ARTIFACT_CLOSURE_INVALID",
      "专家计划必须只形成 ADR、输入/事实/规则、来源权利 child 到计划的精确单向闭包。"
    );
  }
  if (plan.integrityBoundary?.digestAlgorithm !== "SHA-256"
    || plan.integrityBoundary?.digestDomain !== DIGEST_DOMAIN
    || plan.integrityBoundary?.digestIsDigitalSignature !== false
    || plan.integrityBoundary?.authenticityEstablished !== false
    || plan.integrityBoundary?.digitalSignature !== null
    || plan.integrityBoundary?.signerIdentity !== null) {
    fail("INTEGRITY_BOUNDARY_INVALID", "SHA-256 摘要不能冒充签名、真实性或签署者。");
  }
  if (!SHA256_PATTERN.test(plan.planDigest)
    || plan.planDigest !== computeVedicRealIndependentExpertReviewPlanDigest(plan)) {
    fail("PLAN_DIGEST_MISMATCH", "吠陀现实独立专家审阅计划 digest 无效。");
  }
}

export async function verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, planInput) {
  const plan = captureJsonValue(planInput);
  requireStaticBoundary(plan);
  const expected = await buildCurrentVedicRealIndependentExpertReviewPlan(workspaceRoot);
  if (!exactJson(plan, expected)) {
    fail(
      "PLAN_MISMATCH",
      "吠陀现实独立专家审阅计划不等于当前八层绑定的 canonical 零实例计划。"
    );
  }
  const frozenPlan = deepFreeze(plan);
  return deepFreeze({
    expertReviewBundleComplete: false,
    independentExpertReviewsVerified: 0,
    plan: frozenPlan,
    planCoverageComplete: true,
    planCoverageMeaning: frozenPlan.planCoverageMeaning,
    planDigest: frozenPlan.planDigest,
    publicReleaseAuthorized: false,
    releaseReady: false,
    reviewStarted: false,
    reviewerSlotsDefined: 2,
    reviewerSlotsOccupied: 0,
    status: frozenPlan.status
  });
}

export async function readVedicRealIndependentExpertReviewPlan(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
    MAX_PLAN_BYTES,
    {
      invalidCode: "PLAN_ENDPOINT_INVALID",
      label: "吠陀现实独立专家审阅计划",
      missingCode: "PLAN_MISSING"
    }
  );
  const plan = parseVedicRealIndependentExpertReviewPlanJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan(plan)
      !== strictUtf8(snapshot.bytes, "吠陀现实独立专家审阅计划")) {
    fail("JSON_NON_CANONICAL", "吠陀现实独立专家审阅计划不是 canonical pretty JSON。");
  }
  const result = await verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, plan);
  return result.plan;
}

export const vedicRealIndependentExpertReviewPlanTestOnly = Object.freeze({
  CHAIN_ORDER,
  DIGEST_DOMAIN,
  FACT_REQUIREMENT_IDS,
  INPUT_REQUIREMENT_IDS,
  MAX_BOUND_ARTIFACT_BYTES,
  MAX_PLAN_BYTES,
  QUESTION_DEFINITIONS,
  RULE_REQUIREMENT_IDS,
  safeWorkspaceFile
});
