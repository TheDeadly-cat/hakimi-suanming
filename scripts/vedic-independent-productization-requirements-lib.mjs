import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalPrettyStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputContractRequirements,
  computeVedicInputContractRequirementsDigest,
  parseVedicInputContractRequirementsJsonBytes,
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicFactContractDraft,
  computeVedicFactContractDraftSemanticDigest,
  parseVedicFactContractDraftJsonBytes,
  verifyVedicFactContractDraft
} from "./vedic-fact-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicFactContractRequirements,
  computeVedicFactContractRequirementsDigest,
  parseVedicFactContractRequirementsJsonBytes,
  verifyVedicFactContractRequirementsLedger
} from "./vedic-fact-contract-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicRuleContractDraft,
  computeVedicRuleContractDraftSemanticDigest,
  parseVedicRuleContractDraftJsonBytes,
  verifyVedicRuleContractDraft
} from "./vedic-rule-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicRuleContractRequirements,
  computeVedicRuleContractRequirementsDigest,
  parseVedicRuleContractRequirementsJsonBytes,
  verifyVedicRuleContractRequirementsLedger
} from "./vedic-rule-contract-requirements-lib.mjs";
import {
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
  canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal,
  computeVedicRuntimeAndBundleSizeProposalDigest,
  parseVedicRuntimeAndBundleSizeProposalJsonBytes,
  readVedicRuntimeAndBundleSizeProposal,
  verifyVedicRuntimeAndBundleSizeProposal
} from "./vedic-runtime-and-bundle-size-proposal-lib.mjs";
import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements,
  computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
  parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes,
  readVedicSourceBindingAndThreeLayerRightsRequirements,
  verifyVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";
import {
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
  canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan,
  computeVedicRealIndependentExpertReviewPlanDigest,
  parseVedicRealIndependentExpertReviewPlanJsonBytes,
  readVedicRealIndependentExpertReviewPlan,
  verifyVedicRealIndependentExpertReviewPlan
} from "./vedic-real-independent-expert-review-plan-lib.mjs";

export const VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-independent-productization-requirements.v1.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";
const VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-requirements.v1.json";
const VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json";
const VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-requirements.v1.json";
const RUNTIME_PROPOSAL_STATUS =
  "complete_quantified_decision_neutral_proposal_runtime_unselected_unimplemented_unvalidated";
const SOURCE_RIGHTS_REQUIREMENTS_STATUS =
  "requirements_only_current_scoped_inventory_38_all_unbound_open_universe_no_sources_bodies_quotes_bindings_or_three_layer_rights_established";
const EXPERT_REVIEW_PLAN_STATUS =
  "complete_verifiable_material_contract_for_two_vacant_real_independent_expert_seats_zero_expert_instances_review_not_started";
const PARENT_LEDGER_STATUS =
  "input_fact_rule_contract_drafts_runtime_bundle_proposal_source_rights_requirements_only_inventory_and_two_vacant_seat_expert_review_plan_present_open_universe_zero_bindings_zero_expert_instances_research_only_not_admitted";
const SOURCE_RIGHTS_REREVIEW_PARTIAL_STATUS =
  "requirements_only_inventory_present_open_universe_all_38_unbound_no_sources_bindings_or_three_layer_rights_rereview_requirement_incomplete";
const SOURCE_BUNDLE_PARTIAL_ABSENT_STATUS =
  "requirements_inventory_present_all_38_unbound_no_source_candidates_bodies_quotes_locators_or_bindings_source_bundle_absent";
const RIGHTS_BUNDLE_PARTIAL_ABSENT_STATUS =
  "requirements_inventory_present_all_38_unbound_no_work_version_carrier_rights_evidence_rights_bundle_absent";
const EXPERT_REVIEW_GATE_PLAN_ONLY_STATUS =
  "review_plan_present_two_seats_defined_zero_verified_real_experts_identity_credentials_independence_original_opinions_expert_review_bundle_absent";
const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.vedic.independent-productization-requirements.v1";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const EXPECTED_ADR_RAW_IDENTITY = Object.freeze({
  path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  bytes: 4_531,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});

const EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY = Object.freeze({
  artifactRole: "project_authored_isolated_input_contract_draft",
  bytes: 16_529,
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  schemaSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
  schemaStatus: "isolated_contract_draft",
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_requirements_inventory",
  bytes: 15_859,
  inputContractArtifacts: 1,
  inputContractGateSatisfied: false,
  inputInstancesObserved: 0,
  ledgerDigest: "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0",
  path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  requirementsDraftCovered: 13,
  requirementsResolved: 0,
  sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59",
  status: "input_contract_draft_present_zero_instances_not_admitted"
});

const EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY = Object.freeze({
  artifactRole: "project_authored_isolated_fact_contract_draft",
  bytes: 14_240,
  factContractGateSatisfied: false,
  factFamiliesDefined: 4,
  factInstancesObserved: 0,
  path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  requirementsResolved: 0,
  schemaSemanticDigest: "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1",
  schemaStatus: "isolated_contract_draft",
  sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
});

const EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_fact_requirements_inventory",
  bytes: 42_634,
  factContractArtifacts: 1,
  factContractGateSatisfied: false,
  factInstancesObserved: 0,
  ledgerDigest: "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8",
  path: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  requirementsDefined: 12,
  requirementsDraftCovered: 12,
  requirementsResolved: 0,
  requirementsUniverseClosed: false,
  sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38",
  status: "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
});

const EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY = Object.freeze({
  artifactRole: "project_authored_isolated_rule_contract_draft",
  blockedPrerequisitesDefined: 13,
  blockedPrerequisitesResolved: 0,
  blockedPrerequisitesUniverseClosed: false,
  bytes: 12_140,
  path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  requirementsResolved: 0,
  ruleContractGateSatisfied: false,
  ruleDefinitionsIncluded: 0,
  ruleEvaluationCapability: false,
  ruleInstancesObserved: 0,
  rulesetExecutionCapability: false,
  rulesetInstancesObserved: 0,
  schemaSemanticDigest: "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3",
  schemaStatus: "isolated_contract_draft",
  sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d",
  versionedRulesetGateSatisfied: false
});

const EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_rule_requirements_inventory",
  bytes: 30_734,
  ledgerDigest: "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f",
  path: VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  requirementsDefined: 13,
  requirementsDraftCovered: 13,
  requirementsResolved: 0,
  requirementsUniverseClosed: false,
  ruleCandidatesObserved: 0,
  ruleContractArtifacts: 1,
  ruleContractGateSatisfied: false,
  ruleDefinitionsObserved: 0,
  ruleEvaluatorInstances: 0,
  ruleFailureReceipts: 0,
  ruleImplementationInstances: 0,
  ruleInstancesObserved: 0,
  ruleReceiptIssued: false,
  ruleReceipts: 0,
  rulesetInstancesObserved: 0,
  sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94",
  status:
    "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted",
  successReceiptIssued: false,
  successReceipts: 0,
  versionedRulesetGateSatisfied: false
});

const EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_runtime_and_bundle_size_proposal",
  browserReceipts: 0,
  browserRunsExecuted: 0,
  budgetCeilingsProposed: 18,
  buildArtifactsObserved: 0,
  buildReceipts: 0,
  bytes: 27_241,
  dependenciesWithObservedRefs: 4,
  dependenciesWithoutObservedRefs: 1,
  implementationArtifactsObserved: 0,
  implementationReceipts: 0,
  legalReviewsComplete: 0,
  loopbackEvidenceRefs: 0,
  measurementReceipts: 0,
  observedMeasurementCount: 0,
  path: VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
  performanceMeasurementsObserved: 0,
  proposalCoverageComplete: true,
  primarySourceObservationCount: 5,
  proposalDigest: "ae9fb180d97e81a30a9157655d168bb4101d993f859f40990db31c2e12954f15",
  proposalTargetsApproved: false,
  publicObjectApiVerified: true,
  publicReadApiVerified: true,
  publicReleaseAuthorized: false,
  publicSourceHttpReadsObserved: 10,
  rawHashAndSemanticInspectionUseSameBuffer: true,
  redistributionAuthorizations: 0,
  releaseReady: false,
  reviewsComplete: false,
  runtimeExecutionsObserved: 0,
  runtimeOptionSelected: false,
  runtimeOptionsProposed: 2,
  runtimeReceipts: 0,
  selectedRuntimeOptionId: null,
  sha256: "e268aa78d6123c34481752cc8e0789e1a185f3f2e2ce9757c45d6227f5bea30e",
  stableImmediateReadPairs: 4,
  status: RUNTIME_PROPOSAL_STATUS,
  successReceipts: 0,
  runtimeDependencyLicenseEvidenceDigest:
    "cbd459847bd4f57450f8389f127aa76c424298511786811b17c3cb88a856c926",
  runtimeDependencyLicenseEvidenceReleaseReady: false,
  runtimeDependencyLicenseEvidenceSha256:
    "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1",
  unstableImmediateReadPairs: 1
});

const EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_source_binding_and_three_layer_rights_requirements_inventory",
  bindingFrozenVerified: 0,
  bindingRequired: 38,
  bindingRequirementsInventoryDefined: true,
  bytes: 85_752,
  carrierRightsEstablished: 0,
  exactLocatorsEstablished: 0,
  exactQuotesBound: 0,
  ledgerDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e",
  licenseEstablished: false,
  path: VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  publicObjectApiVerified: true,
  publicReadApiVerified: true,
  publicReleaseAuthorized: false,
  rawHashAndSemanticInspectionUseSameBuffer: true,
  releaseReady: false,
  requirementsUniverseClosed: false,
  rightsBundleComplete: false,
  rightsEstablished: false,
  rightsLegalConclusionEstablished: false,
  sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
  sourceBindingEstablished: false,
  sourceBodiesBound: 0,
  sourceBundleComplete: false,
  sourceCandidatesAttached: 0,
  status: SOURCE_RIGHTS_REQUIREMENTS_STATUS,
  subjectCount: 38,
  versionRightsEstablished: 0,
  workRightsEstablished: 0
});

const EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY = Object.freeze({
  artifactRole: "non_product_governance_real_independent_expert_review_plan",
  bytes: 37_131,
  expertReviewBundleComplete: false,
  independentExpertReviewsVerified: 0,
  path: VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
  planCoverageComplete: true,
  planCoverageMeaning:
    "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance",
  planDigest: "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af",
  publicObjectApiVerified: true,
  publicReadApiVerified: true,
  publicReleaseAuthorized: false,
  rawHashAndSemanticInspectionUseSameBuffer: true,
  releaseReady: false,
  reviewStarted: false,
  reviewerSlotsDefined: 2,
  reviewerSlotsOccupied: 0,
  sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89",
  status: EXPERT_REVIEW_PLAN_STATUS
});

const INPUT_CONTRACT_DRAFT_ARTIFACT_REFS = Object.freeze([
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH
]);

const FACT_CONTRACT_DRAFT_ARTIFACT_REFS = Object.freeze([
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH
]);

const RULE_CONTRACT_DRAFT_ARTIFACT_REFS = Object.freeze([
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH
]);

const RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_ARTIFACT_REFS = Object.freeze([
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH
]);

const SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS = Object.freeze([
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH
]);

const REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_ARTIFACT_REFS = Object.freeze([
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH
]);

const INPUT_FACT_AND_RULE_DRAFT_ARTIFACT_REFS = Object.freeze([
  ...INPUT_CONTRACT_DRAFT_ARTIFACT_REFS,
  ...FACT_CONTRACT_DRAFT_ARTIFACT_REFS,
  ...RULE_CONTRACT_DRAFT_ARTIFACT_REFS
]);

const SEVEN_LAYER_CLOSURE_PATHS = Object.freeze([
  VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH
]);

const EIGHT_LAYER_CLOSURE_PATHS = Object.freeze([
  ...SEVEN_LAYER_CLOSURE_PATHS,
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH
]);

const SOURCE_RIGHTS_EIGHT_LAYER_CLOSURE_PATHS = Object.freeze([
  ...SEVEN_LAYER_CLOSURE_PATHS,
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH
]);

const EXPERT_REVIEW_PLAN_NINE_LAYER_CLOSURE_PATHS = Object.freeze([
  ...SOURCE_RIGHTS_EIGHT_LAYER_CLOSURE_PATHS,
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH
]);

const EXTERNAL_RESEARCH_OBSERVATION_SPECS = Object.freeze([
  Object.freeze({
    observationId: "external-repository-research-audit",
    path: "docs/GitHub外部参考审计-2026-08-24.md",
    bytes: 97_473,
    sha256: "ac3b4620de3d183f60511b1ec0dacb268281f43fee75018ae533efb5ddd957bc"
  }),
  Object.freeze({
    observationId: "public-site-and-repository-research-audit",
    path: "docs/公开命理网站与五仓库吸收审计-2026-08-25.md",
    bytes: 19_451,
    sha256: "082c1a852b129c3ca5e35c6e619603071dff59a9615702862af4316538db34c0"
  })
]);

const REREVIEW_REQUIREMENTS = Object.freeze([
  Object.freeze({
    requirementId: "own_input_fact_and_rule_drafts",
    title: "本项目自己的输入、事实和规则草案"
  }),
  Object.freeze({
    requirementId: "runtime_and_bundle_size_proposal",
    title: "运行时与体积提案"
  }),
  Object.freeze({
    requirementId: "three_layer_source_rights_ledger",
    title: "作品、版本、载体三层来源权利账"
  }),
  Object.freeze({
    requirementId: "two_independent_real_expert_review_plan",
    title: "至少两名目标范围现实专家的可核验审阅计划"
  }),
  Object.freeze({
    requirementId: "independent_storage_backup_recovery_and_rollback_design",
    title: "独立数据库、备份、恢复与回滚设计"
  }),
  Object.freeze({
    requirementId: "independent_browser_gate_and_release_evidence_design",
    title: "独立浏览器质量门和 Release Evidence 设计"
  }),
  Object.freeze({
    requirementId: "owner_scope_license_and_deployment_decision",
    title: "所有者对产品范围、许可和部署边界的明确决定"
  })
]);

const ADMISSION_GATE_IDS = Object.freeze([
  "input_contract",
  "deterministic_facts",
  "versioned_ruleset",
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "high_risk_policy",
  "release_evidence"
]);

const ADR_REQUIRED_MARKERS = Object.freeze([
  "# ADR-0001：吠陀占星保持独立研究、暂不集成",
  "- 状态：accepted-research-boundary",
  "- productStatus：`research-only`",
  "- integrationStatus：`not-integrated`",
  "- authorityStatus：`not-authoritative`",
  "- publicReleaseAuthorized：`false`",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。",
  "在独立准入门关闭前，不创建占位计算结果、空数据库分区、伪成功回执、用户可点击入口或“综合命运”输出。",
  "1. 本项目自己的输入、事实和规则草案；",
  "2. 运行时与体积提案；",
  "3. 作品/版本/载体三层来源权利账；",
  "4. 至少两名目标范围现实专家的可核验审阅计划；",
  "5. 独立数据库、备份、恢复与回滚设计；",
  "6. 独立浏览器质量门和 Release Evidence 设计；",
  "7. 所有者对产品范围、许可和部署边界的明确决定。"
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "formally_admitted_or_semantically_selected_vedic_input_contract",
  "vedic_fact_producer_or_deterministic_facts",
  "formally_admitted_or_semantically_selected_vedic_rule_contract",
  "vedic_rule_definition_body_instance_evaluation_or_method_truth",
  "vedic_rule_evaluator_implementation_or_versioned_ruleset",
  "vedic_rule_failure_rule_or_success_receipt_instance",
  "vedic_versioned_ruleset",
  "source_candidate_identity_or_source_body",
  "exact_quote_or_locator",
  "closed_or_exhaustive_source_rights_requirements_universe",
  "source_binding_or_frozen_binding",
  "license_or_three_layer_rights_conclusion",
  "expert_identity_credentials_independence_opinion_or_truth",
  "expert_review_plan_material_as_expert_instance_review_execution_review_bundle_or_expert_truth",
  "artifact_authenticity_or_digital_signature",
  "bazi_authority_inheritance",
  "cross_system_comparison_or_concept_equivalence",
  "browser_or_runtime_validation",
  "runtime_option_selection_implementation_build_or_execution",
  "runtime_performance_measurement_or_browser_build_runtime_receipt_evidence",
  "proposal_material_coverage_as_review_storage_or_release_evidence_design_completion",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_or_release_readiness",
  "public_release_authorization"
]);

const EXPECTED_EVIDENCE_LEDGER = Object.freeze({
  artifactAuthenticity: "not_established",
  browserReceipts: 0,
  browserRunsExecuted: 0,
  browserRuntimeEvidence: "not_assessed",
  buildArtifactsObserved: 0,
  buildReceipts: 0,
  contentTruth: "not_established",
  engineeringIdentity:
    "adr_input_fact_rule_draft_requirements_runtime_bundle_proposal_source_rights_requirements_expert_review_plan_and_non_product_observation_raw_identities_verified",
  expertTruth: "not_established",
  implementationArtifactsObserved: 0,
  implementationReceipts: 0,
  measurementReceipts: 0,
  performanceMeasurementsObserved: 0,
  proposalCoverageComplete: true,
  proposalTargetsApproved: false,
  publicReleaseAuthorization: "not_authorized",
  releaseReadiness: "not_ready",
  reviewsComplete: false,
  rightsLegalConclusion: "not_established",
  ruleEvaluatorEvidence: "absent",
  ruleInstanceEvidence: "zero_observed",
  ruleReceiptEvidence: "zero_observed",
  rulesetEvidence: "zero_instances_versioned_ruleset_absent",
  runtimeExecutionsObserved: 0,
  runtimeOptionSelected: false,
  runtimeReceipts: 0,
  successReceipts: 0
});

const EXPECTED_PRODUCT_BOUNDARY = Object.freeze({
  domainManifest: "absent",
  factContract: "isolated_contract_draft",
  factProducer: "absent",
  inputContract: "isolated_contract_draft",
  migrationId: null,
  mutationEpochCapability: "absent_no_admitted_product_schema",
  productSurface: "absent",
  projector: "absent",
  releaseIdentity: null,
  ruleContract: "isolated_contract_draft",
  ruleEvaluator: "absent",
  runtimeImplementation: "absent",
  runtimeOption: "unselected",
  runtimeProposal: "quantified_governance_proposal_unselected_unimplemented_unvalidated",
  sourceBindingLedger: "requirements_only_open_universe_all_unbound",
  targetSchema: null,
  versionedRuleset: "absent"
});

const EXPECTED_GATE_SUMMARY = Object.freeze({
  admissionGatesRequired: 8,
  admissionGatesSatisfied: 0,
  artifactAuthenticityEstablished: false,
  bindingFrozenVerified: 0,
  bindingRequired: 38,
  bindingRequirementsInventoryDefined: true,
  comparisonIncluded: false,
  expertReviewBundleComplete: false,
  factReceiptIssued: false,
  independentExpertReviewsVerified: 0,
  independentExpertsRequired: 2,
  licenseEstablished: false,
  productArtifactsPresent: 3,
  publicReleaseAuthorized: false,
  releaseReady: false,
  requirementsUniverseClosed: false,
  rereviewRequirementsComplete: 3,
  rereviewRequirementsRequired: 7,
  rereviewTriggered: false,
  rightsEstablished: false,
  ruleCandidatesObserved: 0,
  ruleContractGateSatisfied: false,
  ruleDefinitionsObserved: 0,
  ruleEvaluatorInstances: 0,
  ruleFailureReceipts: 0,
  ruleImplementationInstances: 0,
  ruleInstancesObserved: 0,
  ruleReceiptIssued: false,
  ruleReceipts: 0,
  rulesetInstancesObserved: 0,
  sourceBindingEstablished: false,
  successReceiptIssued: false,
  successReceipts: 0,
  versionedRulesetGateSatisfied: false
});

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

export class VedicProductizationRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicProductizationRequirementsError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicProductizationRequirementsError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "吠陀产品化要求账对象 API 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀产品化要求账对象 API 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀产品化要求账对象 API 含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀产品化要求账对象 API 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀产品化要求账对象 API 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀产品化要求账对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀产品化要求账对象 API 不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      throw new VedicProductizationRequirementsError(
        "INPUT_OBJECT_UNSAFE",
        "吠陀产品化要求账对象 API 无法安全捕获对象描述符。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀产品化要求账对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀产品化要求账对象 API 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀产品化要求账对象 API 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀产品化要求账对象 API 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀产品化要求账对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀产品化要求账对象 API 只接受普通 JSON 对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀产品化要求账对象 API 不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    nodes: 0,
    textCharacters: 0,
    active: new WeakSet()
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "吠陀产品化要求账只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicProductizationRequirements(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicProductizationRequirements(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicProductizationRequirements(value), "utf8")
    .digest("hex");
}

export function computeVedicProductizationRequirementsDigest(ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned);
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

export function parseVedicProductizationRequirementsJsonBytes(
  bytes,
  label = "吠陀产品化要求账 JSON",
  maxBytes = MAX_LEDGER_BYTES
) {
  if (utilTypes.isProxy(bytes)) {
    fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  }
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是具有内部 Uint8Array 品牌的字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "JSON_BYTES_INVALID",
      `${label} 的内部字节槽不可读。`,
      { cause }
    );
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength < 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (typeof utilTypes.isSharedArrayBuffer === "function"
    && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) {
    fail("JSON_BYTES_INVALID", `${label} 的 backing buffer 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      throw new VedicProductizationRequirementsError(
        "JSON_BYTES_INVALID",
        `${label} 的 ArrayBuffer 状态不可读。`,
        { cause }
      );
    }
    if (resizable) {
      fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
    }
  }
  const capturedBytes = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, capturedBytes, [bytes]);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "JSON_BYTES_INVALID",
      `${label} 无法复制到私有固定缓冲区。`,
      { cause }
    );
  }
  if (capturedBytes.byteLength >= 3
    && capturedBytes[0] === 0xef
    && capturedBytes[1] === 0xbb
    && capturedBytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(capturedBytes);
  } catch (cause) {
    throw new VedicProductizationRequirementsError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "vedic-independent-productization-requirements.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new VedicProductizationRequirementsError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof VedicProductizationRequirementsError) throw cause;
    throw new VedicProductizationRequirementsError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_ARTIFACT_PATH", `吠陀产品化要求账文件路径不安全：${String(relativePath)}`);
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", `吠陀产品化要求账文件路径越界：${relativePath}`);
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, invalidCode, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) fail(invalidCode, `${label} 的目录链越出工作区。`);
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(invalidCode, `${label} 的目录链不能包含符号链接、junction 或特殊端点。`);
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, `${label} 的目录链 realpath 越出工作区。`);
    }
    endpoints.push(Object.freeze({ absolutePath: cursor, resolvedPath, metadata }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath
      && sameFileEndpoint(entry.metadata, other.metadata);
  });
}

async function readAtMost(handle, maxBytes, invalidCode, label) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, total);
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
    total += bytesRead;
  }
  if (total > maxBytes) fail(invalidCode, `${label} 超过输入上限。`);
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes,
  { missingCode, invalidCode, label }
) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label);
    [before, actual] = await Promise.all([lstat(absolute), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof VedicProductizationRequirementsError) throw cause;
    throw new VedicProductizationRequirementsError(missingCode, `${label} 不存在：${relativePath}`, { cause });
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual) || before.isSymbolicLink() || !before.isFile()
    || before.nlink !== 1 || before.size <= 0 || before.size > maxBytes) {
    fail(invalidCode, `${label} 必须是工作区内独立普通小文件：${relativePath}`);
  }
  const handle = await open(actual, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || !sameFileEndpoint(before, opened)) {
      fail(invalidCode, `${label} 在打开前发生身份换绑：${relativePath}`);
    }
    const bytes = await readAtMost(handle, maxBytes, invalidCode, label);
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      handle.stat(),
      lstat(absolute),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, `${label} 在读取端点之间发生变化：${relativePath}`);
    }
    return Object.freeze({
      bytes,
      size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  } finally {
    await handle.close();
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BOUND_ARTIFACT_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim()) fail("BOUND_ARTIFACT_INVALID", `${label} 为空。`);
    return text;
  } catch (cause) {
    if (cause instanceof VedicProductizationRequirementsError) throw cause;
    throw new VedicProductizationRequirementsError("BOUND_ARTIFACT_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
}

function canonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function semanticIdentityProjection() {
  return {
    authorityStatus: "not-authoritative",
    boundaryId: "hakimi.vedic.independent-product-boundary/1.0.0",
    decisionStatus: "accepted-research-boundary",
    integrationStatus: "not-integrated",
    productStatus: "research-only",
    publicReleaseAuthorized: false,
    rereviewRequirementIds: REREVIEW_REQUIREMENTS.map((entry) => entry.requirementId)
  };
}

function requireExactRawIdentity(snapshot, expected, label) {
  if (snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("BOUND_ARTIFACT_IDENTITY_MISMATCH", `${label} 与批准的原始字节身份不一致。`);
  }
}

function exactJson(left, right) {
  return canonicalStringifyVedicProductizationRequirements(left)
    === canonicalStringifyVedicProductizationRequirements(right);
}

function approvedInputContractDraftProjection() {
  return {
    artifactRole: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.artifactRole,
    bytes: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.bytes,
    path: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    schemaSemanticDigest: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.schemaSemanticDigest,
    schemaStatus: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.schemaStatus,
    sha256: EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.sha256
  };
}

function approvedInputContractRequirementsProjection() {
  return {
    artifactRole: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.artifactRole,
    bytes: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.bytes,
    inputContractArtifacts: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.inputContractArtifacts,
    inputContractGateSatisfied: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.inputContractGateSatisfied,
    inputInstancesObserved: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.inputInstancesObserved,
    ledgerDigest: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest,
    path: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDraftCovered: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsDraftCovered,
    requirementsResolved: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsResolved,
    sha256: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.sha256,
    status: EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.status
  };
}

function approvedFactContractDraftProjection() {
  return {
    artifactRole: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.artifactRole,
    bytes: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.bytes,
    factContractGateSatisfied: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.factContractGateSatisfied,
    factFamiliesDefined: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.factFamiliesDefined,
    factInstancesObserved: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.factInstancesObserved,
    path: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsResolved: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.requirementsResolved,
    schemaSemanticDigest: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.schemaSemanticDigest,
    schemaStatus: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.schemaStatus,
    sha256: EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.sha256
  };
}

function approvedFactContractRequirementsProjection() {
  return {
    artifactRole: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.artifactRole,
    bytes: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.bytes,
    factContractArtifacts: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.factContractArtifacts,
    factContractGateSatisfied: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.factContractGateSatisfied,
    factInstancesObserved: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.factInstancesObserved,
    ledgerDigest: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest,
    path: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDefined: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsDefined,
    requirementsDraftCovered: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsDraftCovered,
    requirementsResolved: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsResolved,
    requirementsUniverseClosed: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.requirementsUniverseClosed,
    sha256: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.sha256,
    status: EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.status
  };
}

function approvedRuleContractDraftProjection() {
  return {
    artifactRole: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.artifactRole,
    blockedPrerequisitesDefined:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.blockedPrerequisitesDefined,
    blockedPrerequisitesResolved:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.blockedPrerequisitesResolved,
    blockedPrerequisitesUniverseClosed:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.blockedPrerequisitesUniverseClosed,
    bytes: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.bytes,
    path: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsResolved: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.requirementsResolved,
    ruleContractGateSatisfied:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.ruleContractGateSatisfied,
    ruleDefinitionsIncluded: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.ruleDefinitionsIncluded,
    ruleEvaluationCapability:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.ruleEvaluationCapability,
    ruleInstancesObserved: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.ruleInstancesObserved,
    rulesetExecutionCapability:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.rulesetExecutionCapability,
    rulesetInstancesObserved:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.rulesetInstancesObserved,
    schemaSemanticDigest: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.schemaSemanticDigest,
    schemaStatus: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.schemaStatus,
    sha256: EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.sha256,
    versionedRulesetGateSatisfied:
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.versionedRulesetGateSatisfied
  };
}

function approvedRuleContractRequirementsProjection() {
  return {
    artifactRole: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.artifactRole,
    bytes: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.bytes,
    ledgerDigest: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest,
    path: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDefined: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.requirementsDefined,
    requirementsDraftCovered:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.requirementsDraftCovered,
    requirementsResolved: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.requirementsResolved,
    requirementsUniverseClosed:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.requirementsUniverseClosed,
    ruleCandidatesObserved:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleCandidatesObserved,
    ruleContractArtifacts:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleContractArtifacts,
    ruleContractGateSatisfied:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleContractGateSatisfied,
    ruleDefinitionsObserved:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleDefinitionsObserved,
    ruleEvaluatorInstances:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleEvaluatorInstances,
    ruleFailureReceipts:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleFailureReceipts,
    ruleImplementationInstances:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleImplementationInstances,
    ruleInstancesObserved:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleInstancesObserved,
    ruleReceiptIssued: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleReceiptIssued,
    ruleReceipts: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ruleReceipts,
    rulesetInstancesObserved:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.rulesetInstancesObserved,
    sha256: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.sha256,
    status: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.status,
    successReceiptIssued:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.successReceiptIssued,
    successReceipts: EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.successReceipts,
    versionedRulesetGateSatisfied:
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.versionedRulesetGateSatisfied
  };
}

function approvedRuntimeAndBundleSizeProposalProjection() {
  return { ...EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY };
}

function approvedSourceRightsRequirementsProjection() {
  return { ...EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY };
}

function approvedRealIndependentExpertReviewPlanProjection() {
  return { ...EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY };
}

async function verifyInputContractDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY, "吠陀输入合同草案");
  const schema = parseVedicInputContractDraftJsonBytes(
    snapshot.bytes,
    "吠陀输入合同草案 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀输入合同草案");
  if (canonicalPrettyStringifyVedicInputContractDraft(schema) !== source) {
    fail("INPUT_CONTRACT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是批准的 canonical materialization。");
  }
  let result;
  try {
    result = await verifyVedicInputContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "INPUT_CONTRACT_DRAFT_CLOSURE_INVALID",
      "吠陀输入合同草案的 draft → ADR 闭包无效。",
      { cause }
    );
  }
  const projection = {
    artifactRole: result.artifactRole,
    bytes: snapshot.size,
    path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    schemaSemanticDigest: computeVedicInputContractDraftSemanticDigest(schema),
    schemaStatus: result.schemaStatus,
    sha256: snapshot.sha256
  };
  if (!exactJson(projection, approvedInputContractDraftProjection())
    || result.inputContractGateSatisfied !== false
    || result.requirementsResolved !== 0
    || result.inputInstancesObserved !== 0
    || result.formalAdmissionAuthorized !== false
    || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail("INPUT_CONTRACT_DRAFT_SEMANTIC_MISMATCH", "吠陀输入合同草案越过了批准的未准入边界。");
  }
  return projection;
}

async function verifyInputContractRequirementsSnapshot(workspaceRoot, snapshot, draftProjection) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY, "吠陀输入要求子账");
  const ledger = parseVedicInputContractRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀输入要求子账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀输入要求子账");
  if (canonicalPrettyStringifyVedicInputContractRequirements(ledger) !== source) {
    fail("INPUT_CONTRACT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀输入要求子账不是批准的 canonical materialization。");
  }
  if (ledger.ledgerDigest !== EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest
    || computeVedicInputContractRequirementsDigest(ledger)
      !== EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest) {
    fail("INPUT_CONTRACT_REQUIREMENTS_DIGEST_MISMATCH", "吠陀输入要求子账摘要无效。");
  }
  let result;
  try {
    result = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "INPUT_CONTRACT_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀输入要求子账的 draft + ADR 闭包无效。",
      { cause }
    );
  }
  if (ledger.boundaryBindings?.bindingDirection !== "requirements_to_draft_and_adr_only"
    || Object.prototype.hasOwnProperty.call(ledger.boundaryBindings, "parentProductizationRequirements")
    || !exactJson(ledger.boundaryBindings.inputContractDraft, draftProjection)
    || ledger.productBoundary?.inputContract !== "isolated_contract_draft"
    || Object.values(ledger.authorityBoundary ?? {}).some((value) => value !== false)) {
    fail("INPUT_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀输入要求子账不得回绑父账或晋级产品与权威。");
  }
  const projection = {
    artifactRole: ledger.systemIdentity?.artifactRole,
    bytes: snapshot.size,
    inputContractArtifacts: result.inputContractArtifacts,
    inputContractGateSatisfied: result.inputContractGateSatisfied,
    inputInstancesObserved: result.inputInstancesObserved,
    ledgerDigest: result.ledgerDigest,
    path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDraftCovered: result.requirementsDraftCovered,
    requirementsResolved: result.requirementsResolved,
    sha256: snapshot.sha256,
    status: result.status
  };
  if (!exactJson(projection, approvedInputContractRequirementsProjection())
    || result.releaseReady !== false || result.publicReleaseAuthorized !== false) {
    fail("INPUT_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀输入要求子账越过了批准的零实例未准入边界。");
  }
  return projection;
}

async function verifyFactContractDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY, "吠陀事实合同草案");
  const schema = parseVedicFactContractDraftJsonBytes(
    snapshot.bytes,
    "吠陀事实合同草案 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀事实合同草案");
  if (canonicalPrettyStringifyVedicFactContractDraft(schema) !== source) {
    fail("FACT_CONTRACT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀事实合同草案不是批准的 canonical materialization。");
  }
  let result;
  try {
    result = await verifyVedicFactContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "FACT_CONTRACT_DRAFT_CLOSURE_INVALID",
      "吠陀事实合同草案的 ADR + input closure 无效。",
      { cause }
    );
  }
  const projection = {
    artifactRole: result.artifactRole,
    bytes: snapshot.size,
    factContractGateSatisfied: result.factContractGateSatisfied,
    factFamiliesDefined: result.factFamiliesDefined,
    factInstancesObserved: result.factInstancesObserved,
    path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsResolved: result.requirementsResolved,
    schemaSemanticDigest: computeVedicFactContractDraftSemanticDigest(schema),
    schemaStatus: result.schemaStatus,
    sha256: snapshot.sha256
  };
  if (!exactJson(projection, approvedFactContractDraftProjection())
    || result.deterministicFactsGateSatisfied !== false
    || result.factGenerationCapability !== false
    || result.factReceiptIssued !== false
    || result.formalAdmissionAuthorized !== false
    || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail("FACT_CONTRACT_DRAFT_SEMANTIC_MISMATCH", "吠陀事实合同草案越过了批准的零实例未准入边界。");
  }
  return projection;
}

async function verifyFactContractRequirementsSnapshot(workspaceRoot, snapshot, factDraftProjection) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY, "吠陀事实要求子账");
  const ledger = parseVedicFactContractRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀事实要求子账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀事实要求子账");
  if (canonicalPrettyStringifyVedicFactContractRequirements(ledger) !== source) {
    fail("FACT_CONTRACT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀事实要求子账不是批准的 canonical materialization。");
  }
  if (ledger.ledgerDigest !== EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest
    || computeVedicFactContractRequirementsDigest(ledger)
      !== EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest) {
    fail("FACT_CONTRACT_REQUIREMENTS_DIGEST_MISMATCH", "吠陀事实要求子账摘要无效。");
  }
  let result;
  try {
    result = await verifyVedicFactContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "FACT_CONTRACT_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀事实要求子账的 ADR + input + fact draft 闭包无效。",
      { cause }
    );
  }
  const bindings = ledger.boundaryBindings;
  const bindingText = canonicalStringifyVedicProductizationRequirements(bindings);
  if (bindings?.bindingDirection
      !== "requirements_to_adr_input_draft_input_requirements_and_fact_draft_only"
    || Object.prototype.hasOwnProperty.call(bindings, "parentProductizationRequirements")
    || bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH)
    || bindingText.includes("content/system-admission/four-system-admission.v1.json")
    || !exactJson(bindings.factContractDraft, {
      artifactRole: factDraftProjection.artifactRole,
      bytes: factDraftProjection.bytes,
      path: factDraftProjection.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      schemaSemanticDigest: factDraftProjection.schemaSemanticDigest,
      schemaStatus: factDraftProjection.schemaStatus,
      sha256: factDraftProjection.sha256
    })
    || ledger.productBoundary?.factContract !== "isolated_contract_draft"
    || ledger.productBoundary?.factProducer !== "absent"
    || ledger.productBoundary?.projector !== "absent"
    || Object.values(ledger.authorityBoundary ?? {}).some((value) => value !== false)) {
    fail("FACT_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀事实要求子账不得回绑 parent 或晋级事实、产品与权威。");
  }
  const projection = {
    artifactRole: ledger.systemIdentity?.artifactRole,
    bytes: snapshot.size,
    factContractArtifacts: result.factContractArtifacts,
    factContractGateSatisfied: result.factContractGateSatisfied,
    factInstancesObserved: result.factInstancesObserved,
    ledgerDigest: result.ledgerDigest,
    path: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDefined: result.requirementsDefined,
    requirementsDraftCovered: result.requirementsDraftCovered,
    requirementsResolved: result.requirementsResolved,
    requirementsUniverseClosed: result.requirementsUniverseClosed,
    sha256: snapshot.sha256,
    status: result.status
  };
  if (!exactJson(projection, approvedFactContractRequirementsProjection())
    || result.releaseReady !== false || result.publicReleaseAuthorized !== false) {
    fail("FACT_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀事实要求子账越过了批准的开放 universe、零实例未准入边界。");
  }
  return projection;
}

async function verifyRuleContractDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY, "吠陀规则合同草案");
  const schema = parseVedicRuleContractDraftJsonBytes(
    snapshot.bytes,
    "吠陀规则合同草案 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀规则合同草案");
  if (canonicalPrettyStringifyVedicRuleContractDraft(schema) !== source) {
    fail(
      "RULE_CONTRACT_DRAFT_MATERIALIZATION_MISMATCH",
      "吠陀规则合同草案不是批准的 canonical materialization。"
    );
  }
  let result;
  try {
    result = await verifyVedicRuleContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID",
      "吠陀规则合同草案的 ADR + input + fact closure 无效。",
      { cause }
    );
  }
  const projection = {
    artifactRole: result.artifactRole,
    blockedPrerequisitesDefined: result.blockedPrerequisitesDefined,
    blockedPrerequisitesResolved: result.blockedPrerequisitesResolved,
    blockedPrerequisitesUniverseClosed: result.blockedPrerequisitesUniverseClosed,
    bytes: snapshot.size,
    path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsResolved: result.requirementsResolved,
    ruleContractGateSatisfied: result.ruleContractGateSatisfied,
    ruleDefinitionsIncluded: result.ruleDefinitionsIncluded,
    ruleEvaluationCapability: result.ruleEvaluationCapability,
    ruleInstancesObserved: result.ruleInstancesObserved,
    rulesetExecutionCapability: result.rulesetExecutionCapability,
    rulesetInstancesObserved: result.rulesetInstancesObserved,
    schemaSemanticDigest: computeVedicRuleContractDraftSemanticDigest(schema),
    schemaStatus: result.schemaStatus,
    sha256: snapshot.sha256,
    versionedRulesetGateSatisfied: result.versionedRulesetGateSatisfied
  };
  if (!exactJson(projection, approvedRuleContractDraftProjection())
    || result.ruleBodiesIncluded !== 0
    || result.sourceBodiesIncluded !== 0
    || result.ruleReceiptIssued !== false
    || result.successReceiptIssued !== false
    || result.formalAdmissionAuthorized !== false
    || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail(
      "RULE_CONTRACT_DRAFT_SEMANTIC_MISMATCH",
      "吠陀规则合同草案越过了零规则、零 evaluator、零 ruleset、零回执未准入边界。"
    );
  }
  return projection;
}

async function verifyRuleContractRequirementsSnapshot(
  workspaceRoot,
  snapshot,
  ruleDraftProjection
) {
  requireExactRawIdentity(
    snapshot,
    EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY,
    "吠陀规则要求子账"
  );
  const ledger = parseVedicRuleContractRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀规则要求子账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀规则要求子账");
  if (canonicalPrettyStringifyVedicRuleContractRequirements(ledger) !== source) {
    fail(
      "RULE_CONTRACT_REQUIREMENTS_MATERIALIZATION_MISMATCH",
      "吠陀规则要求子账不是批准的 canonical materialization。"
    );
  }
  if (ledger.ledgerDigest !== EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest
    || computeVedicRuleContractRequirementsDigest(ledger)
      !== EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.ledgerDigest) {
    fail("RULE_CONTRACT_REQUIREMENTS_DIGEST_MISMATCH", "吠陀规则要求子账摘要无效。");
  }
  let result;
  try {
    result = await verifyVedicRuleContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "RULE_CONTRACT_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀规则要求子账的 ADR + input + fact + rule draft 闭包无效。",
      { cause }
    );
  }
  const bindings = ledger.boundaryBindings;
  const bindingText = canonicalStringifyVedicProductizationRequirements(bindings);
  const sevenLayerClosure = [
    ...(Array.isArray(bindings?.chainOrder) ? bindings.chainOrder : []),
    VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH
  ];
  if (bindings?.bindingDirection
      !== "requirements_to_adr_input_draft_input_requirements_fact_draft_fact_requirements_and_rule_draft_only"
    || !exactJson(sevenLayerClosure, SEVEN_LAYER_CLOSURE_PATHS)
    || new Set(sevenLayerClosure).size !== SEVEN_LAYER_CLOSURE_PATHS.length
    || Object.prototype.hasOwnProperty.call(bindings, "parentProductizationRequirements")
    || bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH)
    || bindingText.includes("content/system-admission/four-system-admission.v1.json")
    || !exactJson(bindings.ruleContractDraft, {
      artifactRole: ruleDraftProjection.artifactRole,
      bytes: ruleDraftProjection.bytes,
      path: ruleDraftProjection.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      schemaSemanticDigest: ruleDraftProjection.schemaSemanticDigest,
      schemaStatus: ruleDraftProjection.schemaStatus,
      sha256: ruleDraftProjection.sha256
    })
    || ledger.productBoundary?.ruleContract !== "isolated_contract_draft"
    || ledger.productBoundary?.ruleEvaluator !== "absent"
    || ledger.productBoundary?.versionedRuleset !== "absent"
    || Object.values(ledger.authorityBoundary ?? {}).some((value) => value !== false)) {
    fail(
      "RULE_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH",
      "吠陀规则要求子账不得回绑 parent 或晋级规则、evaluator、ruleset、产品与权威。"
    );
  }
  const receipt = ledger.zeroInstanceRequirementsReceipt;
  const projection = {
    artifactRole: ledger.systemIdentity?.artifactRole,
    bytes: snapshot.size,
    ledgerDigest: result.ledgerDigest,
    path: VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsDefined: result.requirementsDefined,
    requirementsDraftCovered: result.requirementsDraftCovered,
    requirementsResolved: result.requirementsResolved,
    requirementsUniverseClosed: result.requirementsUniverseClosed,
    ruleCandidatesObserved: receipt?.ruleCandidatesObserved,
    ruleContractArtifacts: result.ruleContractArtifacts,
    ruleContractGateSatisfied: result.ruleContractGateSatisfied,
    ruleDefinitionsObserved: receipt?.ruleDefinitionsObserved,
    ruleEvaluatorInstances: receipt?.ruleEvaluatorInstances,
    ruleFailureReceipts: receipt?.ruleFailureReceipts,
    ruleImplementationInstances: receipt?.ruleImplementationInstances,
    ruleInstancesObserved: result.ruleInstancesObserved,
    ruleReceiptIssued: receipt?.ruleReceiptIssued,
    ruleReceipts: receipt?.ruleReceipts,
    rulesetInstancesObserved: receipt?.rulesetInstancesObserved,
    sha256: snapshot.sha256,
    status: result.status,
    successReceiptIssued: receipt?.successReceiptIssued,
    successReceipts: receipt?.successReceipts,
    versionedRulesetGateSatisfied: result.versionedRulesetGateSatisfied
  };
  if (!exactJson(projection, approvedRuleContractRequirementsProjection())
    || receipt?.countsTowardAdmission !== false
    || receipt?.receiptIsProductReceipt !== false
    || receipt?.receiptIsRuleReceipt !== false
    || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail(
      "RULE_CONTRACT_REQUIREMENTS_SEMANTIC_MISMATCH",
      "吠陀规则要求子账越过了开放 universe、零规则/evaluator/ruleset/回执未准入边界。"
    );
  }
  return projection;
}

async function verifyRuntimeAndBundleSizeProposalSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(
    snapshot,
    EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY,
    "吠陀运行时与体积提案"
  );
  const proposal = parseVedicRuntimeAndBundleSizeProposalJsonBytes(
    snapshot.bytes,
    "吠陀运行时与体积提案 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀运行时与体积提案");
  if (canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(proposal) !== source) {
    fail(
      "RUNTIME_PROPOSAL_MATERIALIZATION_MISMATCH",
      "吠陀运行时与体积提案不是批准的 canonical materialization。"
    );
  }
  if (proposal.proposalDigest !== EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY.proposalDigest
    || computeVedicRuntimeAndBundleSizeProposalDigest(proposal)
      !== EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY.proposalDigest) {
    fail("RUNTIME_PROPOSAL_DIGEST_MISMATCH", "吠陀运行时与体积提案摘要无效。");
  }
  let objectResult;
  let readResult;
  try {
    [objectResult, readResult] = await Promise.all([
      verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposal),
      readVedicRuntimeAndBundleSizeProposal(workspaceRoot)
    ]);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "RUNTIME_PROPOSAL_CLOSURE_INVALID",
      "吠陀运行时与体积提案的七层线性上游、许可 evidence child 或 public API 闭包无效。",
      { cause }
    );
  }
  const bindings = proposal.boundaryBindings;
  const bindingText = canonicalStringifyVedicProductizationRequirements(bindings);
  const eightLayerClosure = [
    ...(Array.isArray(bindings?.chainOrder) ? bindings.chainOrder : []),
    VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH
  ];
  const deferredPlans = Object.values(proposal.deferredIndependentDesignRequirements ?? {});
  const evidence = proposal.evidenceBoundary;
  const licenseEvidenceClosure = proposal.runtimeDependencyLicenseEvidenceClosure;
  const licenseEvidence = licenseEvidenceClosure?.runtimeDependencyLicenseEvidence;
  if (!exactJson(objectResult.ledger, proposal)
    || !exactJson(readResult, proposal)
    || bindings?.bindingDirection
      !== "proposal_to_adr_input_fact_and_rule_drafts_and_requirements_only"
    || bindings?.proposalBindsParent !== false
    || bindings?.proposalBindsCentralRegistry !== false
    || bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH)
    || bindingText.includes("content/system-admission/four-system-admission.v1.json")
    || !exactJson(eightLayerClosure, EIGHT_LAYER_CLOSURE_PATHS)
    || new Set(eightLayerClosure).size !== EIGHT_LAYER_CLOSURE_PATHS.length
    || proposal.proposalCoverageComplete !== true
    || proposal.reviewsComplete !== false
    || proposal.selectedRuntimeOptionId !== null
    || proposal.measurementPlan?.observedMeasurementCount !== 0
    || proposal.measurementPlan?.measurementStatus !== "not_measured"
    || proposal.measurementPlan?.browserMatrix?.some((entry) =>
      entry.executedRuns !== 0 || entry.executionStatus !== "planned_not_executed"
        || !Array.isArray(entry.evidenceRefs) || entry.evidenceRefs.length !== 0)
    || evidence?.proposalTargetsApproved !== false
    || evidence?.performanceMeasurementsObserved !== 0
    || evidence?.implementationArtifactsObserved !== 0
    || evidence?.implementationReceipts !== 0
    || evidence?.buildArtifactsObserved !== 0
    || evidence?.buildReceipts !== 0
    || evidence?.runtimeExecutionsObserved !== 0
    || evidence?.runtimeReceipts !== 0
    || evidence?.browserRunsExecuted !== 0
    || evidence?.browserReceipts !== 0
    || evidence?.measurementReceipts !== 0
    || evidence?.successReceipts !== 0
    || licenseEvidenceClosure?.bindingDirection
      !== "runtime_dependency_license_evidence_to_runtime_proposal_aggregator_only"
    || licenseEvidenceClosure?.childBindsProposal !== false
    || licenseEvidenceClosure?.childBindsParent !== false
    || licenseEvidenceClosure?.childBindsCentralRegistry !== false
    || licenseEvidence?.dependenciesWithObservedRefs !== 4
    || licenseEvidence?.dependenciesWithoutObservedRefs !== 1
    || licenseEvidence?.loopbackEvidenceRefs !== 0
    || licenseEvidence?.legalReviewsComplete !== 0
    || licenseEvidence?.redistributionAuthorizations !== 0
    || licenseEvidence?.publicReleaseAuthorized !== false
    || licenseEvidence?.releaseReady !== false
    || deferredPlans.length !== 2
    || deferredPlans.some((entry) => entry.designArtifactsObserved !== 0
      || entry.requirementState !== "separate_rereview_requirement_plan_only_not_satisfied"
      || !Array.isArray(entry.artifactRefs) || entry.artifactRefs.length !== 0)
    || Object.values(proposal.authorityBoundary ?? {}).some((value) => value !== false)
    || proposal.productBoundary?.releaseIdentity !== null
    || proposal.productBoundary?.targetSchema !== null
    || proposal.productBoundary?.migrationId !== null
    || proposal.productBoundary?.legacyV13Inherited !== false
    || proposal.productBoundary?.schema13Inherited !== false
    || Object.prototype.hasOwnProperty.call(proposal, "productArtifactsPresent")) {
    fail(
      "RUNTIME_PROPOSAL_SEMANTIC_MISMATCH",
      "运行时提案材料覆盖不得冒充选型、review、实现、测量、浏览器、receipt、设计完成或权威。"
    );
  }
  const projection = {
    artifactRole: proposal.artifactRole,
    browserReceipts: evidence.browserReceipts,
    browserRunsExecuted: evidence.browserRunsExecuted,
    budgetCeilingsProposed: objectResult.budgetCeilingsProposed,
    buildArtifactsObserved: evidence.buildArtifactsObserved,
    buildReceipts: evidence.buildReceipts,
    bytes: snapshot.size,
    dependenciesWithObservedRefs: licenseEvidence.dependenciesWithObservedRefs,
    dependenciesWithoutObservedRefs: licenseEvidence.dependenciesWithoutObservedRefs,
    implementationArtifactsObserved: evidence.implementationArtifactsObserved,
    implementationReceipts: evidence.implementationReceipts,
    legalReviewsComplete: licenseEvidence.legalReviewsComplete,
    loopbackEvidenceRefs: licenseEvidence.loopbackEvidenceRefs,
    measurementReceipts: evidence.measurementReceipts,
    observedMeasurementCount: objectResult.observedMeasurementCount,
    path: VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
    performanceMeasurementsObserved: evidence.performanceMeasurementsObserved,
    primarySourceObservationCount: objectResult.primarySourceObservationCount,
    proposalCoverageComplete: proposal.proposalCoverageComplete,
    proposalDigest: objectResult.proposalDigest,
    proposalTargetsApproved: evidence.proposalTargetsApproved,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: objectResult.publicReleaseAuthorized,
    publicSourceHttpReadsObserved: objectResult.publicSourceHttpReadsObserved,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    redistributionAuthorizations: licenseEvidence.redistributionAuthorizations,
    releaseReady: objectResult.releaseReady,
    reviewsComplete: proposal.reviewsComplete,
    runtimeExecutionsObserved: evidence.runtimeExecutionsObserved,
    runtimeOptionSelected: proposal.authorityBoundary.runtimeOptionSelected,
    runtimeOptionsProposed: objectResult.runtimeOptionsProposed,
    runtimeReceipts: evidence.runtimeReceipts,
    selectedRuntimeOptionId: objectResult.selectedRuntimeOptionId,
    sha256: snapshot.sha256,
    stableImmediateReadPairs: objectResult.stableImmediateReadPairs,
    status: objectResult.status,
    successReceipts: evidence.successReceipts,
    runtimeDependencyLicenseEvidenceDigest: licenseEvidence.evidenceDigest,
    runtimeDependencyLicenseEvidenceReleaseReady: licenseEvidence.releaseReady,
    runtimeDependencyLicenseEvidenceSha256: licenseEvidence.sha256,
    unstableImmediateReadPairs: licenseEvidence.unstableImmediateReadPairs
  };
  if (!exactJson(projection, approvedRuntimeAndBundleSizeProposalProjection())) {
    fail(
      "RUNTIME_PROPOSAL_SEMANTIC_MISMATCH",
      "吠陀运行时提案越过了批准的材料覆盖完整、零 review/实现/测量/receipt 边界。"
    );
  }
  return projection;
}

async function verifySourceRightsRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(
    snapshot,
    EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY,
    "吠陀来源与三层权利要求账"
  );
  const ledger = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀来源与三层权利要求账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀来源与三层权利要求账");
  if (canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(ledger) !== source) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_MATERIALIZATION_MISMATCH",
      "吠陀来源与三层权利要求账不是批准的 canonical materialization。"
    );
  }
  if (ledger.ledgerDigest !== EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY.ledgerDigest
    || computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(ledger)
      !== EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY.ledgerDigest) {
    fail("SOURCE_RIGHTS_REQUIREMENTS_DIGEST_MISMATCH", "吠陀来源与三层权利要求账摘要无效。");
  }
  let objectResult;
  let readResult;
  try {
    [objectResult, readResult] = await Promise.all([
      verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, ledger),
      readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot)
    ]);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀来源与三层权利要求 child 的七层上游闭包或 public read/object API 验证无效。",
      { cause }
    );
  }
  const bindings = ledger.boundaryBindings;
  const bindingText = canonicalStringifyVedicProductizationRequirements(bindings);
  const eightLayerClosure = [
    ...(Array.isArray(bindings?.chainOrder) ? bindings.chainOrder : []),
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH
  ];
  const boundary = ledger.sourceRightsBoundary;
  if (!exactJson(objectResult.ledger, ledger)
    || !exactJson(readResult, ledger)
    || bindings?.bindingDirection
      !== "source_rights_requirements_to_adr_input_fact_and_rule_drafts_and_requirements_only"
    || bindings?.childBindsParent !== false
    || bindings?.childBindsCentralRegistry !== false
    || bindings?.childBindsRuntimeProposal !== false
    || bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH)
    || bindingText.includes("content/system-admission/four-system-admission.v1.json")
    || bindingText.includes(VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH)
    || !exactJson(eightLayerClosure, SOURCE_RIGHTS_EIGHT_LAYER_CLOSURE_PATHS)
    || new Set(eightLayerClosure).size !== SOURCE_RIGHTS_EIGHT_LAYER_CLOSURE_PATHS.length
    || objectResult.subjectCount !== 38
    || objectResult.bindingRequirementsInventoryDefined !== true
    || objectResult.bindingRequired !== 38
    || objectResult.bindingFrozenVerified !== 0
    || objectResult.requirementsUniverseClosed !== false
    || objectResult.sourceBundleComplete !== false
    || objectResult.rightsBundleComplete !== false
    || boundary?.sourceCandidatesAttached !== 0
    || boundary?.sourceBodiesBound !== 0
    || boundary?.exactQuotesBound !== 0
    || boundary?.exactLocatorsEstablished !== 0
    || boundary?.workRightsEstablished !== 0
    || boundary?.versionRightsEstablished !== 0
    || boundary?.carrierRightsEstablished !== 0
    || boundary?.sourceBindingEstablished !== false
    || boundary?.licenseEstablished !== false
    || boundary?.rightsEstablished !== false
    || boundary?.rightsLegalConclusionEstablished !== false
    || ledger.requirementsUniverse?.exhaustiveVedicSourceRightsUniverseClaimed !== false
    || ledger.scopeExclusions?.runtimeProposalBound !== false
    || ledger.scopeExclusions?.parentProductizationRequirementsCovered !== false
    || ledger.scopeExclusions?.centralRegistryCovered !== false
    || Object.values(ledger.authorityBoundary ?? {}).some((value) => value !== false)
    || ledger.productBoundary?.releaseIdentity !== null
    || ledger.productBoundary?.targetSchema !== null
    || ledger.productBoundary?.migrationId !== null
    || ledger.productBoundary?.legacyV13Inherited !== false
    || ledger.productBoundary?.schema13Inherited !== false) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_SEMANTIC_MISMATCH",
      "来源权利 requirements-only child 不得冒充闭合 universe、来源/binding、三层权利、runtime、parent、registry、发布身份或权威。"
    );
  }
  const projection = {
    artifactRole: ledger.artifactRole,
    bindingFrozenVerified: objectResult.bindingFrozenVerified,
    bindingRequired: objectResult.bindingRequired,
    bindingRequirementsInventoryDefined: objectResult.bindingRequirementsInventoryDefined,
    bytes: snapshot.size,
    carrierRightsEstablished: boundary.carrierRightsEstablished,
    exactLocatorsEstablished: boundary.exactLocatorsEstablished,
    exactQuotesBound: boundary.exactQuotesBound,
    ledgerDigest: objectResult.ledgerDigest,
    licenseEstablished: boundary.licenseEstablished,
    path: VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: objectResult.publicReleaseAuthorized,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    releaseReady: objectResult.releaseReady,
    requirementsUniverseClosed: objectResult.requirementsUniverseClosed,
    rightsBundleComplete: objectResult.rightsBundleComplete,
    rightsEstablished: boundary.rightsEstablished,
    rightsLegalConclusionEstablished: boundary.rightsLegalConclusionEstablished,
    sha256: snapshot.sha256,
    sourceBindingEstablished: boundary.sourceBindingEstablished,
    sourceBodiesBound: boundary.sourceBodiesBound,
    sourceBundleComplete: objectResult.sourceBundleComplete,
    sourceCandidatesAttached: boundary.sourceCandidatesAttached,
    status: objectResult.status,
    subjectCount: objectResult.subjectCount,
    versionRightsEstablished: boundary.versionRightsEstablished,
    workRightsEstablished: boundary.workRightsEstablished
  };
  if (!exactJson(projection, approvedSourceRightsRequirementsProjection())) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_SEMANTIC_MISMATCH",
      "吠陀来源权利 child 越过了批准的 38 项开放 requirements-only、全未绑定边界。"
    );
  }
  return projection;
}

async function verifyRealIndependentExpertReviewPlanSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(
    snapshot,
    EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY,
    "吠陀现实独立专家审阅计划"
  );
  const plan = parseVedicRealIndependentExpertReviewPlanJsonBytes(
    snapshot.bytes,
    "吠陀现实独立专家审阅计划 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀现实独立专家审阅计划");
  if (canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan(plan) !== source) {
    fail(
      "EXPERT_REVIEW_PLAN_MATERIALIZATION_MISMATCH",
      "吠陀现实独立专家审阅计划不是批准的 canonical materialization。"
    );
  }
  if (plan.planDigest
      !== EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY.planDigest
    || computeVedicRealIndependentExpertReviewPlanDigest(plan)
      !== EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY.planDigest) {
    fail("EXPERT_REVIEW_PLAN_DIGEST_MISMATCH", "吠陀现实独立专家审阅计划摘要无效。");
  }
  let objectResult;
  let readResult;
  try {
    [objectResult, readResult] = await Promise.all([
      verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, plan),
      readVedicRealIndependentExpertReviewPlan(workspaceRoot)
    ]);
  } catch (cause) {
    throw new VedicProductizationRequirementsError(
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID",
      "吠陀现实独立专家审阅计划的八层上游闭包或 public read/object API 验证无效。",
      { cause }
    );
  }
  const bindings = plan.boundaryBindings;
  const bindingText = canonicalStringifyVedicProductizationRequirements(bindings);
  const nineLayerClosure = [
    ...(Array.isArray(bindings?.chainOrder) ? bindings.chainOrder : []),
    VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH
  ];
  const zero = plan.zeroInstanceReceipt;
  if (!exactJson(objectResult.plan, plan)
    || !exactJson(readResult, plan)
    || bindings?.bindingDirection
      !== "expert_review_plan_to_adr_input_fact_rule_and_source_rights_requirements_only"
    || bindings?.planBindsParent !== false
    || bindings?.planBindsCentralRegistry !== false
    || bindings?.planBindsRuntimeProposal !== false
    || bindings?.planBindsSourceRightsRequirements !== true
    || bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH)
    || bindingText.includes("content/system-admission/four-system-admission.v1.json")
    || bindingText.includes(VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH)
    || !exactJson(nineLayerClosure, EXPERT_REVIEW_PLAN_NINE_LAYER_CLOSURE_PATHS)
    || new Set(nineLayerClosure).size !== EXPERT_REVIEW_PLAN_NINE_LAYER_CLOSURE_PATHS.length
    || objectResult.planCoverageComplete !== true
    || objectResult.planCoverageMeaning
      !== "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance"
    || objectResult.reviewerSlotsDefined !== 2
    || objectResult.reviewerSlotsOccupied !== 0
    || objectResult.reviewStarted !== false
    || objectResult.independentExpertReviewsVerified !== 0
    || objectResult.expertReviewBundleComplete !== false
    || objectResult.releaseReady !== false
    || objectResult.publicReleaseAuthorized !== false
    || plan.reviewScope?.requirementSubjectCount !== 38
    || plan.reviewQuestions?.length !== 8
    || plan.reviewStartPrerequisites?.substantiveReviewMayStart !== false
    || plan.reviewStartPrerequisites?.required !== 16
    || plan.reviewStartPrerequisites?.satisfied !== 0
    || plan.reviewStartPrerequisites?.protectedExternalIntakeAuthorized !== false
    || plan.reviewStartPrerequisites?.states?.length !== 16
    || !plan.reviewStartPrerequisites.states.every((entry) =>
      entry?.currentState === false && entry?.requiredState === true)
    || plan.expertEligibilityAndVerificationPlan?.requiredVedicScopeCoverageCount !== 5
    || plan.expertEligibilityAndVerificationPlan?.verifierMustBeDistinctFromReviewer !== true
    || plan.expertEligibilityAndVerificationPlan?.verifierMustBeOutsideBothReviewerSeats !== true
    || plan.expertEligibilityAndVerificationPlan?.reviewerSeatsMayVerifyEachOther !== false
    || plan.expertEligibilityAndVerificationPlan?.reviewerSelfVerificationAllowed !== false
    || plan.expertEligibilityAndVerificationPlan?.aiOnlyOrGeneratedProfileMayQualify !== false
    || plan.expertEligibilityAndVerificationPlan?.primaryAndCorroboratingEvidenceRefsMustBeDistinctRecords !== true
    || plan.expertEligibilityAndVerificationPlan?.corroboratingEvidenceMustHaveIndependentProvenanceFromPrimary !== true
    || plan.expertEligibilityAndVerificationPlan?.unrelatedSystemExpertiseMaySubstituteForVedicScope !== false
    || plan.expertEligibilityAndVerificationPlan?.requiredVedicScopeCoverageRoleMappings?.length !== 5
    || !plan.reviewQuestions.every((question) =>
      question?.assignedReviewerRoleId === "vedic_domain_expert")
    || plan.reviewPacketContract?.currentReviewPacketId !== null
    || plan.reviewPacketContract?.currentReviewPacketDigest !== null
    || plan.reviewPacketContract?.reviewPacketInstances?.length !== 0
    || plan.reviewPacketContract?.samePacketDigestBoundToBothSeatsRequired !== true
    || plan.reviewPacketContract?.sameQuestionSetDigestBoundToBothSeatsRequired !== true
    || zero?.reviewerSlotsDefined !== 2
    || zero?.reviewerSlotsOccupied !== 0
    || zero?.identitiesVerified !== 0
    || zero?.credentialsVerified !== 0
    || zero?.pairwiseIndependenceAssessments !== 0
    || zero?.pairwiseIndependenceVerified !== 0
    || zero?.scopeFitsVerified !== 0
    || zero?.reviewPacketInstances !== 0
    || zero?.reviewSessionsStarted !== 0
    || zero?.opinionsVerified !== 0
    || zero?.sealedOriginalOpinions !== 0
    || zero?.independentExpertReviewsVerified !== 0
    || zero?.substantiveReviewStarted !== false
    || plan.gateBoundary?.countsTowardExpertGate !== false
    || plan.gateBoundary?.expertReviewBundleComplete !== false
    || plan.gateBoundary?.expertTruthEstablished !== false
    || plan.gateBoundary?.contentTruthEstablished !== false
    || Object.values(plan.authorityBoundary ?? {}).some((value) => value !== false)
    || plan.productBoundary?.releaseIdentity !== null
    || plan.productBoundary?.targetSchema !== null
    || plan.productBoundary?.migrationId !== null
    || plan.productBoundary?.legacyV13Inherited !== false
    || plan.productBoundary?.schema13Inherited !== false) {
    fail(
      "EXPERT_REVIEW_PLAN_SEMANTIC_MISMATCH",
      "专家计划材料覆盖不得冒充现实专家、身份资质独立性、意见、review 执行、bundle、真值、准入或发布权威。"
    );
  }
  const projection = {
    artifactRole: plan.artifactRole,
    bytes: snapshot.size,
    expertReviewBundleComplete: objectResult.expertReviewBundleComplete,
    independentExpertReviewsVerified: objectResult.independentExpertReviewsVerified,
    path: VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
    planCoverageComplete: objectResult.planCoverageComplete,
    planCoverageMeaning: objectResult.planCoverageMeaning,
    planDigest: objectResult.planDigest,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: objectResult.publicReleaseAuthorized,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    releaseReady: objectResult.releaseReady,
    reviewStarted: objectResult.reviewStarted,
    reviewerSlotsDefined: objectResult.reviewerSlotsDefined,
    reviewerSlotsOccupied: objectResult.reviewerSlotsOccupied,
    sha256: snapshot.sha256,
    status: objectResult.status
  };
  if (!exactJson(projection, approvedRealIndependentExpertReviewPlanProjection())) {
    fail(
      "EXPERT_REVIEW_PLAN_SEMANTIC_MISMATCH",
      "吠陀专家计划越过了批准的两席空位、零实例、未启动、bundle 缺失边界。"
    );
  }
  return projection;
}

function buildExternalObservation(spec, snapshot) {
  requireExactRawIdentity(snapshot, spec, `外部研究观察 ${spec.observationId}`);
  decodeStrictUtf8(snapshot.bytes, `外部研究观察 ${spec.observationId}`);
  return {
    authenticityEstablished: false,
    bindingEstablished: false,
    bytes: snapshot.size,
    exactLocatorEstablished: false,
    exactQuoteBound: false,
    expertEvidenceEstablished: false,
    licenseEstablished: false,
    observationId: spec.observationId,
    path: spec.path,
    role: "non_product_research_observation",
    rightsEstablished: false,
    sha256: snapshot.sha256,
    sourceBodyBound: false
  };
}

export async function buildCurrentVedicProductizationRequirementsLedger(workspaceRoot) {
  const [
    adrSnapshot,
    inputDraftSnapshot,
    inputRequirementsSnapshot,
    factDraftSnapshot,
    factRequirementsSnapshot,
    ruleDraftSnapshot,
    ruleRequirementsSnapshot,
    runtimeProposalSnapshot,
    sourceRightsRequirementsSnapshot,
    expertReviewPlanSnapshot,
    ...externalSnapshots
  ] = await Promise.all([
    readStableWorkspaceFile(workspaceRoot, EXPECTED_ADR_RAW_IDENTITY.path, MAX_BOUND_ARTIFACT_BYTES, {
      missingCode: "ADR_MISSING",
      invalidCode: "ADR_ENDPOINT_INVALID",
      label: "吠陀独立产品边界 ADR"
    }),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_INPUT_CONTRACT_DRAFT_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "INPUT_CONTRACT_DRAFT_MISSING",
        invalidCode: "INPUT_CONTRACT_DRAFT_ENDPOINT_INVALID",
        label: "吠陀输入合同草案"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_INPUT_CONTRACT_REQUIREMENTS_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "INPUT_CONTRACT_REQUIREMENTS_MISSING",
        invalidCode: "INPUT_CONTRACT_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀输入要求子账"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_FACT_CONTRACT_DRAFT_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "FACT_CONTRACT_DRAFT_MISSING",
        invalidCode: "FACT_CONTRACT_DRAFT_ENDPOINT_INVALID",
        label: "吠陀事实合同草案"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_FACT_CONTRACT_REQUIREMENTS_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "FACT_CONTRACT_REQUIREMENTS_MISSING",
        invalidCode: "FACT_CONTRACT_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀事实要求子账"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_RULE_CONTRACT_DRAFT_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "RULE_CONTRACT_DRAFT_MISSING",
        invalidCode: "RULE_CONTRACT_DRAFT_ENDPOINT_INVALID",
        label: "吠陀规则合同草案"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_RULE_CONTRACT_REQUIREMENTS_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "RULE_CONTRACT_REQUIREMENTS_MISSING",
        invalidCode: "RULE_CONTRACT_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀规则要求子账"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "RUNTIME_PROPOSAL_MISSING",
        invalidCode: "RUNTIME_PROPOSAL_ENDPOINT_INVALID",
        label: "吠陀运行时与体积提案"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_SOURCE_RIGHTS_REQUIREMENTS_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "SOURCE_RIGHTS_REQUIREMENTS_MISSING",
        invalidCode: "SOURCE_RIGHTS_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀来源与三层权利要求账"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      EXPECTED_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_IDENTITY.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "EXPERT_REVIEW_PLAN_MISSING",
        invalidCode: "EXPERT_REVIEW_PLAN_ENDPOINT_INVALID",
        label: "吠陀现实独立专家审阅计划"
      }
    ),
    ...EXTERNAL_RESEARCH_OBSERVATION_SPECS.map((spec) => readStableWorkspaceFile(
      workspaceRoot,
      spec.path,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "EXTERNAL_OBSERVATION_MISSING",
        invalidCode: "EXTERNAL_OBSERVATION_ENDPOINT_INVALID",
        label: `外部研究观察 ${spec.observationId}`
      }
    ))
  ]);
  requireExactRawIdentity(adrSnapshot, EXPECTED_ADR_RAW_IDENTITY, "吠陀独立产品边界 ADR");
  const adrText = decodeStrictUtf8(adrSnapshot.bytes, "吠陀独立产品边界 ADR");
  for (const marker of ADR_REQUIRED_MARKERS) {
    if (!adrText.includes(marker)) fail("ADR_SEMANTIC_IDENTITY_MISMATCH", `吠陀 ADR 缺少批准的语义标记：${marker}`);
  }
  const semanticProjection = semanticIdentityProjection();
  const semanticIdentity = {
    ...semanticProjection,
    semanticDigest: domainSeparatedDigest(ADR_SEMANTIC_DIGEST_DOMAIN, semanticProjection)
  };
  const externalResearchObservations = EXTERNAL_RESEARCH_OBSERVATION_SPECS.map(
    (spec, index) => buildExternalObservation(spec, externalSnapshots[index])
  );
  const inputContractDraft = await verifyInputContractDraftSnapshot(workspaceRoot, inputDraftSnapshot);
  const inputContractRequirements = await verifyInputContractRequirementsSnapshot(
    workspaceRoot,
    inputRequirementsSnapshot,
    inputContractDraft
  );
  const factContractDraft = await verifyFactContractDraftSnapshot(workspaceRoot, factDraftSnapshot);
  const factContractRequirements = await verifyFactContractRequirementsSnapshot(
    workspaceRoot,
    factRequirementsSnapshot,
    factContractDraft
  );
  const ruleContractDraft = await verifyRuleContractDraftSnapshot(
    workspaceRoot,
    ruleDraftSnapshot
  );
  const ruleContractRequirements = await verifyRuleContractRequirementsSnapshot(
    workspaceRoot,
    ruleRequirementsSnapshot,
    ruleContractDraft
  );
  const runtimeAndBundleSizeProposal = await verifyRuntimeAndBundleSizeProposalSnapshot(
    workspaceRoot,
    runtimeProposalSnapshot
  );
  const sourceRightsRequirements = await verifySourceRightsRequirementsSnapshot(
    workspaceRoot,
    sourceRightsRequirementsSnapshot
  );
  const realIndependentExpertReviewPlan =
    await verifyRealIndependentExpertReviewPlanSnapshot(
      workspaceRoot,
      expertReviewPlanSnapshot
    );
  const unsigned = {
    admissionGateRequirements: ADMISSION_GATE_IDS.map((gateId) => ({
      artifactRefs: gateId === "input_contract"
        ? [...INPUT_CONTRACT_DRAFT_ARTIFACT_REFS]
        : gateId === "deterministic_facts"
          ? [...FACT_CONTRACT_DRAFT_ARTIFACT_REFS]
          : gateId === "versioned_ruleset"
            ? [...RULE_CONTRACT_DRAFT_ARTIFACT_REFS]
            : gateId === "source_bundle" || gateId === "rights_bundle"
              ? [...SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS]
              : gateId === "expert_review_bundle"
                ? [...REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_ARTIFACT_REFS]
            : [],
      gateId,
      requirementState: gateId === "input_contract"
        ? "draft_present_formal_input_contract_not_admitted"
        : gateId === "deterministic_facts"
          ? "fact_contract_draft_present_producer_and_fact_instances_absent"
          : gateId === "versioned_ruleset"
            ? "rule_contract_draft_present_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
            : gateId === "source_bundle"
              ? SOURCE_BUNDLE_PARTIAL_ABSENT_STATUS
              : gateId === "rights_bundle"
                ? RIGHTS_BUNDLE_PARTIAL_ABSENT_STATUS
                : gateId === "expert_review_bundle"
                  ? EXPERT_REVIEW_GATE_PLAN_ONLY_STATUS
            : "required_absent"
    })),
    authorityBoundary: {
      baziAuthorityInherited: false,
      comparisonIncluded: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      factReceiptIssued: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      ruleContractGateSatisfied: false,
      ruleEvaluationAuthorized: false,
      ruleReceiptIssued: false,
      rulesetExecutionAuthorized: false,
      successReceiptIssued: false,
      versionedRulesetGateSatisfied: false
    },
    bindingBoundary: {
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      bindingRequirementsInventoryDefined: true,
      carrierRightsEvidenceRefs: [],
      exactLocatorRefs: [],
      exactQuoteRefs: [],
      frozenBindingIds: [],
      licenseEstablished: false,
      licenseEvidenceRefs: [],
      requirementsUniverseClosed: false,
      rightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      sourceBindingEstablished: false,
      sourceBodyRefs: [],
      sourceCandidateIds: [],
      versionRightsEvidenceRefs: [],
      workRightsEvidenceRefs: []
    },
    boundaryAdr: {
      bytes: adrSnapshot.size,
      path: EXPECTED_ADR_RAW_IDENTITY.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      role: "independent_product_boundary_adr",
      semanticIdentity,
      sha256: adrSnapshot.sha256
    },
    createdAt: LEDGER_CREATED_AT,
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedger: { ...EXPECTED_EVIDENCE_LEDGER },
    expertBoundary: {
      credentialsVerified: 0,
      expertOpinionIds: [],
      expertReviewBundle: "absent",
      expertReviewPlanDefined: true,
      expertReviewSeatsDefined: 2,
      expertReviewSeatsFilled: 0,
      expertReviewStarted: false,
      expertTruthEstablished: false,
      identitiesVerified: 0,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      opinionsVerified: 0,
      reviewerIds: []
    },
    externalResearchObservations,
    factContractDraftClosure: {
      bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
      childBindsParent: false,
      factContractDraft,
      factContractRequirements
    },
    gateSummary: { ...EXPECTED_GATE_SUMMARY },
    inputContractDraftClosure: {
      bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
      childBindsParent: false,
      inputContractDraft,
      inputContractRequirements
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: "hakimi.vedic.independent-productization-requirements/1.0.0",
    observationBoundary: {
      abaExcluded: false,
      boundArtifactHashAndInspectionUseSameReadBuffer: true,
      crossFileAtomicSnapshot: false,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      ledgerHashAndParseUseSameReadBuffer: true,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      parentAndChildrenAtomicSnapshot: false,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true
    },
    productBoundary: { ...EXPECTED_PRODUCT_BOUNDARY },
    recordType: "vedic_independent_productization_requirements_v1",
    rereviewRequirements: REREVIEW_REQUIREMENTS.map((entry, index) => ({
      artifactRefs: index === 0
        ? [...INPUT_FACT_AND_RULE_DRAFT_ARTIFACT_REFS]
        : index === 1
          ? [...RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_ARTIFACT_REFS]
          : index === 2
            ? [...SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS]
            : index === 3
              ? [...REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_ARTIFACT_REFS]
          : [],
      requirementId: entry.requirementId,
      requirementState: index === 0
        ? "complete_structural_drafts_present_research_only_not_admitted"
        : index === 1
          ? RUNTIME_PROPOSAL_STATUS
          : index === 2
            ? SOURCE_RIGHTS_REREVIEW_PARTIAL_STATUS
            : index === 3
              ? EXPERT_REVIEW_PLAN_STATUS
          : "required_absent",
      title: entry.title
    })),
    ruleContractDraftClosure: {
      bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
      childBindsParent: false,
      ruleContractDraft,
      ruleContractRequirements
    },
    runtimeAndBundleSizeProposalClosure: {
      bindingDirection: "proposal_to_parent_aggregator_only",
      childBindsCentralRegistry: false,
      childBindsParent: false,
      runtimeAndBundleSizeProposal
    },
    realIndependentExpertReviewPlanClosure: {
      bindingDirection:
        "real_independent_expert_review_plan_to_parent_aggregator_only",
      childBindsCentralRegistry: false,
      childBindsParent: false,
      childBindsRuntimeProposal: false,
      childBindsSourceRightsRequirements: true,
      realIndependentExpertReviewPlan
    },
    sourceRightsRequirementsClosure: {
      bindingDirection: "source_rights_requirements_to_parent_aggregator_only",
      childBindsCentralRegistry: false,
      childBindsParent: false,
      childBindsRuntimeProposal: false,
      sourceRightsRequirements
    },
    schemaVersion: "1.0.0",
    status: PARENT_LEDGER_STATUS,
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productType: "research_boundary_only"
    }
  };
  return deepFreezeJson({
    ...unsigned,
    ledgerDigest: domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned)
  });
}

function requireExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("LEDGER_INVALID", `${label} 必须是对象。`);
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("LEDGER_INVALID", `${label} 字段集合不匹配。`);
}

function requireStaticFailClosedBoundary(ledger) {
  requireExactKeys(ledger, [
    "admissionGateRequirements", "authorityBoundary", "bindingBoundary", "boundaryAdr", "createdAt",
    "doesNotEstablish", "evidenceLedger", "expertBoundary", "externalResearchObservations", "gateSummary",
    "factContractDraftClosure", "inputContractDraftClosure", "integrityBoundary", "ledgerDigest", "ledgerId",
    "observationBoundary", "productBoundary", "recordType", "rereviewRequirements",
    "realIndependentExpertReviewPlanClosure", "ruleContractDraftClosure",
    "runtimeAndBundleSizeProposalClosure", "schemaVersion", "status",
    "sourceRightsRequirementsClosure", "systemIdentity"
  ], "吠陀产品化要求账");
  if (ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== "vedic_independent_productization_requirements_v1"
    || ledger.ledgerId !== "hakimi.vedic.independent-productization-requirements/1.0.0"
    || ledger.status !== PARENT_LEDGER_STATUS) {
    fail("LEDGER_INVALID", "吠陀产品化要求账身份或状态无效。");
  }
  if (!canonicalUtc(ledger.createdAt) || ledger.createdAt !== LEDGER_CREATED_AT) {
    fail("UTC_INVALID", "吠陀产品化要求账 createdAt 必须是批准的 canonical UTC。");
  }
  if (!exactJson(ledger.productBoundary, EXPECTED_PRODUCT_BOUNDARY)) {
    fail(
      "PRODUCT_BOUNDARY_PROMOTION",
      "吠陀不得借用发布身份、Schema、产品表面、producer、rule evaluator 或 versioned ruleset。"
    );
  }
  if (!exactJson(ledger.evidenceLedger, EXPECTED_EVIDENCE_LEDGER)
    || !exactJson(ledger.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail(
      "EVIDENCE_BOUNDARY_PROMOTED",
      "吠陀工程闭包不得冒充规则实例、evaluator、ruleset、回执、内容、专家或发布证据。"
    );
  }
  if (ledger.bindingBoundary.bindingRequirementsInventoryDefined !== true
    || ledger.bindingBoundary.bindingRequired !== 38
    || ledger.bindingBoundary.requirementsUniverseClosed !== false
    || ledger.gateSummary.bindingRequirementsInventoryDefined !== true
    || ledger.gateSummary.bindingRequired !== 38
    || ledger.gateSummary.requirementsUniverseClosed !== false) {
    fail(
      "BINDING_REQUIREMENTS_INVENTORY_INVALID",
      "吠陀必须保持当前 38 项、开放 universe 的 requirements-only inventory，不能降成 0/0、null 或冒充闭合。"
    );
  }
  const bindingArrays = [
    ledger.bindingBoundary.carrierRightsEvidenceRefs,
    ledger.bindingBoundary.versionRightsEvidenceRefs,
    ledger.bindingBoundary.exactLocatorRefs,
    ledger.bindingBoundary.exactQuoteRefs,
    ledger.bindingBoundary.frozenBindingIds,
    ledger.bindingBoundary.licenseEvidenceRefs,
    ledger.bindingBoundary.sourceBodyRefs,
    ledger.bindingBoundary.sourceCandidateIds,
    ledger.bindingBoundary.workRightsEvidenceRefs
  ];
  if (ledger.bindingBoundary.bindingFrozenVerified !== 0
    || bindingArrays.some((entries) => !Array.isArray(entries) || entries.length !== 0)
    || ledger.bindingBoundary.sourceBindingEstablished !== false
    || ledger.bindingBoundary.licenseEstablished !== false
    || ledger.bindingBoundary.rightsEstablished !== false
    || ledger.bindingBoundary.rightsLegalConclusionEstablished !== false) {
    fail("BINDING_BOUNDARY_PROMOTED", "吠陀来源正文、quote、locator、binding、许可和权利必须保持空或 false。");
  }
  if (!Array.isArray(ledger.rereviewRequirements) || ledger.rereviewRequirements.length !== 7
    || ledger.rereviewRequirements[0]?.requirementId !== "own_input_fact_and_rule_drafts"
    || ledger.rereviewRequirements[0]?.requirementState
      !== "complete_structural_drafts_present_research_only_not_admitted"
    || !exactJson(
      ledger.rereviewRequirements[0]?.artifactRefs,
      [...INPUT_FACT_AND_RULE_DRAFT_ARTIFACT_REFS]
    )
    || ledger.rereviewRequirements[1]?.requirementId !== "runtime_and_bundle_size_proposal"
    || ledger.rereviewRequirements[1]?.requirementState !== RUNTIME_PROPOSAL_STATUS
    || !exactJson(
      ledger.rereviewRequirements[1]?.artifactRefs,
      [...RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_ARTIFACT_REFS]
    )
    || ledger.rereviewRequirements[2]?.requirementId !== "three_layer_source_rights_ledger"
    || ledger.rereviewRequirements[2]?.requirementState !== SOURCE_RIGHTS_REREVIEW_PARTIAL_STATUS
    || !exactJson(
      ledger.rereviewRequirements[2]?.artifactRefs,
      [...SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS]
    )
    || ledger.rereviewRequirements[3]?.requirementId
      !== "two_independent_real_expert_review_plan"
    || ledger.rereviewRequirements[3]?.requirementState !== EXPERT_REVIEW_PLAN_STATUS
    || !exactJson(
      ledger.rereviewRequirements[3]?.artifactRefs,
      [...REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_ARTIFACT_REFS]
    )
    || ledger.rereviewRequirements.slice(4).some((entry) => entry.requirementState !== "required_absent"
      || !Array.isArray(entry.artifactRefs) || entry.artifactRefs.length !== 0)) {
    fail(
      "REREVIEW_REQUIREMENTS_PROMOTED",
      "吠陀仅完成 3/7 计划材料；来源权利 item 3 仍是开放 requirements-only，专家 item 4 仅为两席空位计划，不得冒充 review、专家 bundle、触发重审、设计完成或准入。"
    );
  }
  if (!Array.isArray(ledger.admissionGateRequirements) || ledger.admissionGateRequirements.length !== 8
    || ledger.admissionGateRequirements[0]?.gateId !== "input_contract"
    || ledger.admissionGateRequirements[0]?.requirementState
      !== "draft_present_formal_input_contract_not_admitted"
    || !exactJson(ledger.admissionGateRequirements[0]?.artifactRefs, [...INPUT_CONTRACT_DRAFT_ARTIFACT_REFS])
    || ledger.admissionGateRequirements[1]?.gateId !== "deterministic_facts"
    || ledger.admissionGateRequirements[1]?.requirementState
      !== "fact_contract_draft_present_producer_and_fact_instances_absent"
    || !exactJson(ledger.admissionGateRequirements[1]?.artifactRefs, [...FACT_CONTRACT_DRAFT_ARTIFACT_REFS])
    || ledger.admissionGateRequirements[2]?.gateId !== "versioned_ruleset"
    || ledger.admissionGateRequirements[2]?.requirementState
      !== "rule_contract_draft_present_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
    || !exactJson(
      ledger.admissionGateRequirements[2]?.artifactRefs,
      [...RULE_CONTRACT_DRAFT_ARTIFACT_REFS]
    )
    || ledger.admissionGateRequirements[3]?.gateId !== "source_bundle"
    || ledger.admissionGateRequirements[3]?.requirementState !== SOURCE_BUNDLE_PARTIAL_ABSENT_STATUS
    || !exactJson(
      ledger.admissionGateRequirements[3]?.artifactRefs,
      [...SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS]
    )
    || ledger.admissionGateRequirements[4]?.gateId !== "rights_bundle"
    || ledger.admissionGateRequirements[4]?.requirementState !== RIGHTS_BUNDLE_PARTIAL_ABSENT_STATUS
    || !exactJson(
      ledger.admissionGateRequirements[4]?.artifactRefs,
      [...SOURCE_RIGHTS_REQUIREMENTS_ARTIFACT_REFS]
    )
    || ledger.admissionGateRequirements[5]?.gateId !== "expert_review_bundle"
    || ledger.admissionGateRequirements[5]?.requirementState
      !== EXPERT_REVIEW_GATE_PLAN_ONLY_STATUS
    || !exactJson(
      ledger.admissionGateRequirements[5]?.artifactRefs,
      [...REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_ARTIFACT_REFS]
    )
    || ledger.admissionGateRequirements.slice(6).some((entry) => entry.requirementState !== "required_absent"
      || !Array.isArray(entry.artifactRefs) || entry.artifactRefs.length !== 0)) {
    fail(
      "ADMISSION_GATES_PROMOTED",
      "吠陀结构草案、来源权利 requirements-only 清单和专家计划不得冒充正式输入、确定性事实、ruleset、source/rights bundle、专家 bundle 或任何准入 gate。"
    );
  }
  if (!exactJson(ledger.gateSummary, EXPECTED_GATE_SUMMARY)) {
    fail(
      "GATE_SUMMARY_PROMOTED",
      "吠陀仅有 3 个独立合同草案产品工件；运行时提案、来源权利 requirements-only child 和专家计划均不计产品工件，且必须保持 38/0/open、专家 0、0/8、3/7、未触发重审。"
    );
  }
  const closure = ledger.inputContractDraftClosure;
  if (closure?.bindingDirection !== "draft_and_requirements_to_parent_aggregator_only"
    || closure.childBindsParent !== false
    || !exactJson(closure.inputContractDraft, approvedInputContractDraftProjection())
    || !exactJson(closure.inputContractRequirements, approvedInputContractRequirementsProjection())) {
    fail("INPUT_CONTRACT_DRAFT_CLOSURE_INVALID", "吠陀父聚合账必须精确绑定 draft + child，且 child 不得回绑 parent。");
  }
  const factClosure = ledger.factContractDraftClosure;
  if (factClosure?.bindingDirection !== "draft_and_requirements_to_parent_aggregator_only"
    || factClosure.childBindsParent !== false
    || !exactJson(factClosure.factContractDraft, approvedFactContractDraftProjection())
    || !exactJson(factClosure.factContractRequirements, approvedFactContractRequirementsProjection())) {
    fail("FACT_CONTRACT_DRAFT_CLOSURE_INVALID", "吠陀父聚合账必须精确绑定 fact draft + child，且 child 不得回绑 parent。");
  }
  const ruleClosure = ledger.ruleContractDraftClosure;
  if (ruleClosure?.bindingDirection !== "draft_and_requirements_to_parent_aggregator_only"
    || ruleClosure.childBindsParent !== false
    || !exactJson(ruleClosure.ruleContractDraft, approvedRuleContractDraftProjection())
    || !exactJson(
      ruleClosure.ruleContractRequirements,
      approvedRuleContractRequirementsProjection()
    )) {
    fail(
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID",
      "吠陀父聚合账必须精确绑定 rule draft + child，且 child 不得回绑 parent。"
    );
  }
  const runtimeClosure = ledger.runtimeAndBundleSizeProposalClosure;
  if (runtimeClosure?.bindingDirection !== "proposal_to_parent_aggregator_only"
    || runtimeClosure.childBindsParent !== false
    || runtimeClosure.childBindsCentralRegistry !== false
    || !exactJson(
      runtimeClosure.runtimeAndBundleSizeProposal,
      approvedRuntimeAndBundleSizeProposalProjection()
    )) {
    fail(
      "RUNTIME_PROPOSAL_CLOSURE_INVALID",
      "吠陀父聚合账必须精确绑定运行时提案，且 proposal 不得回绑 parent 或中央 registry。"
    );
  }
  const expertPlanClosure = ledger.realIndependentExpertReviewPlanClosure;
  if (expertPlanClosure?.bindingDirection
      !== "real_independent_expert_review_plan_to_parent_aggregator_only"
    || expertPlanClosure.childBindsParent !== false
    || expertPlanClosure.childBindsCentralRegistry !== false
    || expertPlanClosure.childBindsRuntimeProposal !== false
    || expertPlanClosure.childBindsSourceRightsRequirements !== true
    || !exactJson(
      expertPlanClosure.realIndependentExpertReviewPlan,
      approvedRealIndependentExpertReviewPlanProjection()
    )) {
    fail(
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID",
      "吠陀父聚合账必须精确绑定两席空位专家计划；计划只可单向绑定来源权利 child，不得回绑 runtime、parent 或中央 registry。"
    );
  }
  const sourceRightsClosure = ledger.sourceRightsRequirementsClosure;
  if (sourceRightsClosure?.bindingDirection
      !== "source_rights_requirements_to_parent_aggregator_only"
    || sourceRightsClosure.childBindsParent !== false
    || sourceRightsClosure.childBindsCentralRegistry !== false
    || sourceRightsClosure.childBindsRuntimeProposal !== false
    || !exactJson(
      sourceRightsClosure.sourceRightsRequirements,
      approvedSourceRightsRequirementsProjection()
    )) {
    fail(
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID",
      "吠陀父聚合账必须精确绑定来源权利 requirements-only child，且 child 不得回绑 runtime、parent 或中央 registry。"
    );
  }
  if (!exactJson(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    parentAndChildrenAtomicSnapshot: false,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true
  })) {
    fail("OBSERVATION_BOUNDARY_PROMOTED", "吠陀父子账没有 mutation epoch、跨文件或父子原子快照、区间 mutation 排除或 ABA 排除。");
  }
  if (ledger.expertBoundary.independentExpertsRequired !== 2
    || ledger.expertBoundary.expertReviewPlanDefined !== true
    || ledger.expertBoundary.expertReviewSeatsDefined !== 2
    || ledger.expertBoundary.expertReviewSeatsFilled !== 0
    || ledger.expertBoundary.expertReviewStarted !== false
    || ledger.expertBoundary.independentExpertReviewsVerified !== 0
    || ledger.expertBoundary.identitiesVerified !== 0
    || ledger.expertBoundary.credentialsVerified !== 0
    || ledger.expertBoundary.opinionsVerified !== 0
    || ledger.expertBoundary.expertReviewBundle !== "absent"
    || ledger.expertBoundary.expertTruthEstablished !== false
    || !Array.isArray(ledger.expertBoundary.reviewerIds) || ledger.expertBoundary.reviewerIds.length !== 0
    || !Array.isArray(ledger.expertBoundary.expertOpinionIds) || ledger.expertBoundary.expertOpinionIds.length !== 0) {
    fail(
      "EXPERT_BOUNDARY_PROMOTED",
      "吠陀只定义了两席空位计划；现实专家仍须 2 名且当前身份、资质、独立性、意见、review 与 bundle 全为空。"
    );
  }
  if (ledger.externalResearchObservations.some((entry) => entry.role !== "non_product_research_observation"
    || entry.bindingEstablished !== false || entry.sourceBodyBound !== false
    || entry.exactQuoteBound !== false || entry.exactLocatorEstablished !== false
    || entry.licenseEstablished !== false || entry.rightsEstablished !== false
    || entry.expertEvidenceEstablished !== false || entry.authenticityEstablished !== false)) {
    fail("EXTERNAL_OBSERVATION_PROMOTED", "外部研究观察不能冒充来源、binding、许可、专家或真实性证据。");
  }
  if (ledger.integrityBoundary.digestAlgorithm !== "SHA-256"
    || ledger.integrityBoundary.digestDomain !== LEDGER_DIGEST_DOMAIN
    || ledger.integrityBoundary.digestIsDigitalSignature !== false
    || ledger.integrityBoundary.authenticityEstablished !== false
    || ledger.integrityBoundary.digitalSignature !== null
    || ledger.integrityBoundary.signerIdentity !== null) {
    fail("INTEGRITY_BOUNDARY_PROMOTED", "SHA-256 摘要不能冒充签名或真实性。");
  }
  if (Object.values(ledger.authorityBoundary).some((value) => value !== false)) {
    fail("AUTHORITY_PROMOTED", "吠陀准入、比较、发布及八字权威继承必须全部为 false。");
  }
  if (!SHA256_PATTERN.test(ledger.ledgerDigest)
    || ledger.ledgerDigest !== computeVedicProductizationRequirementsDigest(ledger)) {
    fail("LEDGER_DIGEST_MISMATCH", "吠陀产品化要求账 ledgerDigest 无效。");
  }
}

export async function readVedicProductizationRequirementsLedger(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    {
      missingCode: "LEDGER_MISSING",
      invalidCode: "LEDGER_ENDPOINT_INVALID",
      label: "吠陀产品化要求账"
    }
  );
  const ledger = parseVedicProductizationRequirementsJsonBytes(snapshot.bytes);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (source !== canonicalPrettyStringifyVedicProductizationRequirements(ledger)) {
    fail("JSON_NON_CANONICAL", "吠陀产品化要求账原始 JSON 必须是固定排序、两空格缩进和单一结尾换行。");
  }
  return ledger;
}

export async function verifyVedicProductizationRequirementsLedger(workspaceRoot, ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  requireStaticFailClosedBoundary(ledger);
  const expected = await buildCurrentVedicProductizationRequirementsLedger(workspaceRoot);
  if (canonicalStringifyVedicProductizationRequirements(ledger)
    !== canonicalStringifyVedicProductizationRequirements(expected)) {
    fail("LEDGER_MISMATCH", "吠陀产品化要求账与当前 ADR、外部观察或零实例失败关闭边界不一致。");
  }
  const frozenLedger = deepFreezeJson(ledger);
  return Object.freeze({
    admissionGatesSatisfied: frozenLedger.gateSummary.admissionGatesSatisfied,
    bindingFrozenVerified: frozenLedger.gateSummary.bindingFrozenVerified,
    bindingRequired: frozenLedger.gateSummary.bindingRequired,
    bindingRequirementsInventoryDefined:
      frozenLedger.gateSummary.bindingRequirementsInventoryDefined,
    expertReviewPlanDefined: frozenLedger.expertBoundary.expertReviewPlanDefined,
    expertReviewPlanStatus:
      frozenLedger.realIndependentExpertReviewPlanClosure
        .realIndependentExpertReviewPlan.status,
    expertReviewSeatsDefined: frozenLedger.expertBoundary.expertReviewSeatsDefined,
    expertReviewSeatsFilled: frozenLedger.expertBoundary.expertReviewSeatsFilled,
    expertReviewStarted: frozenLedger.expertBoundary.expertReviewStarted,
    independentExpertReviewsVerified: 0,
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    productArtifactsPresent: frozenLedger.gateSummary.productArtifactsPresent,
    publicReleaseAuthorized: false,
    releaseReady: false,
    requirementsUniverseClosed: frozenLedger.gateSummary.requirementsUniverseClosed,
    rereviewRequirementsComplete: frozenLedger.gateSummary.rereviewRequirementsComplete,
    rereviewTriggered: frozenLedger.gateSummary.rereviewTriggered,
    rightsBundleComplete:
      frozenLedger.sourceRightsRequirementsClosure.sourceRightsRequirements.rightsBundleComplete,
    runtimeProposalStatus:
      frozenLedger.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.status,
    sourceBundleComplete:
      frozenLedger.sourceRightsRequirementsClosure.sourceRightsRequirements.sourceBundleComplete,
    sourceRightsRequirementsStatus:
      frozenLedger.sourceRightsRequirementsClosure.sourceRightsRequirements.status,
    status: frozenLedger.status
  });
}
