import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
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
  VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
  canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence,
  computeVedicRuntimeDependencyLicenseEvidenceDigest,
  parseVedicRuntimeDependencyLicenseEvidenceJsonBytes,
  readVedicRuntimeDependencyLicenseEvidence,
  verifyVedicRuntimeDependencyLicenseEvidence
} from "./vedic-runtime-dependency-license-evidence-lib.mjs";

export const VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH =
  "content/system-admission/vedic-runtime-and-bundle-size-proposal.v1.json";

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
  RULE_REQUIREMENTS_RELATIVE_PATH
]);

const STATUS =
  "complete_quantified_decision_neutral_proposal_runtime_unselected_unimplemented_unvalidated";
const ARTIFACT_ROLE = "non_product_governance_runtime_and_bundle_size_proposal";
const CREATED_AT = "2026-08-29T00:00:00.000Z";
const DIGEST_DOMAIN = "hakimi-vedic-runtime-and-bundle-size-proposal-v1";
const MAX_PROPOSAL_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const MAX_SNAPSHOT_NODES = 60_000;
const MAX_SNAPSHOT_TEXT_CODE_UNITS = 4_000_000;
const MAX_SNAPSHOT_DEPTH = 128;

const EXPECTED_RAW_IDENTITIES = Object.freeze({
  [ADR_RELATIVE_PATH]: Object.freeze({
    bytes: 4_531,
    sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
  }),
  [INPUT_DRAFT_RELATIVE_PATH]: Object.freeze({
    bytes: 16_529,
    sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
  }),
  [INPUT_REQUIREMENTS_RELATIVE_PATH]: Object.freeze({
    bytes: 15_859,
    sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
  }),
  [FACT_DRAFT_RELATIVE_PATH]: Object.freeze({
    bytes: 14_240,
    sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
  }),
  [FACT_REQUIREMENTS_RELATIVE_PATH]: Object.freeze({
    bytes: 42_634,
    sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
  }),
  [RULE_DRAFT_RELATIVE_PATH]: Object.freeze({
    bytes: 12_140,
    sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
  }),
  [RULE_REQUIREMENTS_RELATIVE_PATH]: Object.freeze({
    bytes: 30_734,
    sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"
  })
});

const EXPECTED_DIGESTS = Object.freeze({
  adrSemanticDigest: "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89",
  inputDraftSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
  inputRequirementsLedgerDigest: "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0",
  factDraftSemanticDigest: "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1",
  factRequirementsLedgerDigest: "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8",
  ruleDraftSemanticDigest: "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3",
  ruleRequirementsLedgerDigest: "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f"
});

const EXPECTED_STATUSES = Object.freeze({
  inputRequirements: "input_contract_draft_present_zero_instances_not_admitted",
  factRequirements:
    "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted",
  ruleRequirements:
    "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
});

const EXPECTED_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_IDENTITY = Object.freeze({
  artifactRole: "authoritative_project_record_of_public_runtime_dependency_license_observations",
  bytes: 23_919,
  dependenciesWithObservedRefs: 4,
  dependenciesWithoutObservedRefs: 1,
  evidenceDigest: "cbd459847bd4f57450f8389f127aa76c424298511786811b17c3cb88a856c926",
  legalReviewsComplete: 0,
  loopbackEvidenceRefs: 0,
  path: VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
  publicHttpReadsObserved: 10,
  publicObjectApiVerified: true,
  publicReadApiVerified: true,
  publicReleaseAuthorized: false,
  rawHashAndSemanticInspectionUseSameBuffer: true,
  redistributionAuthorizations: 0,
  releaseReady: false,
  sha256: "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1",
  sourceObservationCount: 5,
  stableImmediateReadPairs: 4,
  status:
    "five_claimed_publisher_or_maintainer_public_endpoints_ten_read_receipts_observed_four_of_five_dependencies_have_refs_loopback_zero_link_only_unreviewed_unsigned_no_legal_conclusion_redistribution_or_selection",
  unstableImmediateReadPairs: 1
});

function ceiling(metricId, unit, proposedCeiling) {
  return Object.freeze({
    approvalStatus: "unapproved_candidate",
    comparator: "less_than_or_equal",
    evidenceRefs: Object.freeze([]),
    measurementStatus: "not_measured",
    metricId,
    observedValue: null,
    proposedCeiling,
    unit
  });
}

const RUNTIME_OPTIONS = Object.freeze([
  Object.freeze({
    candidateCeilings: Object.freeze([
      ceiling("application_code_uncompressed_bytes", "bytes", 6_000_000),
      ceiling("initial_network_download_bytes", "bytes", 20_000_000),
      ceiling("installed_offline_footprint_bytes", "bytes", 100_000_000),
      ceiling("first_load_interactive_ms", "milliseconds", 8_000),
      ceiling("offline_cold_start_interactive_ms", "milliseconds", 5_000),
      ceiling("incremental_update_download_bytes", "bytes", 20_000_000),
      ceiling("single_calculation_p95_ms", "milliseconds", 2_000),
      ceiling("peak_runtime_memory_bytes", "bytes", 268_435_456),
      ceiling("evidence_retention_bytes_per_release", "bytes", 50_000_000)
    ]),
    decisionStatus: "candidate_unselected_unimplemented",
    optionId: "browser_embedded",
    preferenceRank: null,
    privacyReviewStatus: "required_not_performed",
    reproducibilityReviewStatus: "required_not_performed",
    securityReviewStatus: "required_not_performed"
  }),
  Object.freeze({
    candidateCeilings: Object.freeze([
      ceiling("client_and_service_uncompressed_bytes", "bytes", 250_000_000),
      ceiling("initial_network_download_bytes", "bytes", 150_000_000),
      ceiling("installed_offline_footprint_bytes", "bytes", 750_000_000),
      ceiling("first_load_interactive_ms", "milliseconds", 15_000),
      ceiling("offline_local_service_start_ms", "milliseconds", 10_000),
      ceiling("incremental_update_download_bytes", "bytes", 150_000_000),
      ceiling("single_calculation_p95_ms", "milliseconds", 1_500),
      ceiling("peak_runtime_memory_bytes", "bytes", 536_870_912),
      ceiling("evidence_retention_bytes_per_release", "bytes", 100_000_000)
    ]),
    decisionStatus: "candidate_unselected_unimplemented",
    optionId: "loopback_local_service",
    preferenceRank: null,
    privacyReviewStatus: "required_not_performed",
    reproducibilityReviewStatus: "required_not_performed",
    securityReviewStatus: "required_not_performed"
  })
]);

function tradeoffDimension(identifiedRiskIds, requiredControlIds) {
  return Object.freeze({
    identifiedRiskIds: Object.freeze(identifiedRiskIds),
    requiredControlIds: Object.freeze(requiredControlIds),
    validationStatus: "required_not_performed"
  });
}

const SECURITY_PRIVACY_REPRODUCIBILITY_TRADEOFF_MATRIX = Object.freeze([
  Object.freeze({
    optionId: "browser_embedded",
    preferenceClaimed: false,
    privacy: tradeoffDimension(
      [
        "browser_storage_extension_and_profile_exposure_unvalidated",
        "browser_network_egress_behavior_unvalidated"
      ],
      [
        "offline_no_egress_browser_test_plan",
        "separate_vedic_browser_storage_namespace_plan",
        "sensitive_field_retention_and_export_policy_plan"
      ]
    ),
    reproducibility: tradeoffDimension(
      [
        "browser_engine_device_and_cache_variance_unvalidated",
        "browser_ephemeris_data_version_drift_unvalidated"
      ],
      [
        "edge_chrome_fixed_device_matrix_plan",
        "browser_runtime_data_and_rule_digest_capture_plan"
      ]
    ),
    security: tradeoffDimension(
      [
        "browser_supply_chain_and_cached_asset_integrity_unvalidated",
        "browser_main_thread_and_worker_isolation_unvalidated"
      ],
      [
        "browser_content_security_and_asset_integrity_plan",
        "worker_boundary_and_message_schema_plan",
        "browser_release_artifact_identity_plan"
      ]
    )
  }),
  Object.freeze({
    optionId: "loopback_local_service",
    preferenceClaimed: false,
    privacy: tradeoffDimension(
      [
        "loopback_payload_and_local_log_exposure_unvalidated",
        "local_service_network_egress_behavior_unvalidated"
      ],
      [
        "loopback_payload_minimization_and_log_redaction_plan",
        "offline_no_egress_service_test_plan",
        "separate_vedic_service_storage_namespace_plan"
      ]
    ),
    reproducibility: tradeoffDimension(
      [
        "python_native_library_and_platform_variance_unvalidated",
        "service_data_file_and_environment_drift_unvalidated"
      ],
      [
        "runtime_native_dependency_and_data_digest_capture_plan",
        "fixed_service_environment_replay_matrix_plan"
      ]
    ),
    security: tradeoffDimension(
      [
        "loopback_origin_authentication_and_port_exposure_unvalidated",
        "local_service_process_and_update_integrity_unvalidated"
      ],
      [
        "loopback_bind_scope_authentication_and_request_origin_plan",
        "service_binary_and_update_digest_plan",
        "least_privilege_service_process_boundary_plan"
      ]
    )
  })
]);

const DEPENDENCY_DECISION_BOUNDARY = Object.freeze({
  dedicatedWorker: "undecided_not_selected",
  ephemerisDataFiles: "undecided_not_selected",
  loopbackLocalService: "undecided_not_selected",
  pythonRuntime: "undecided_not_selected",
  swissEphemeris: "undecided_not_selected"
});

const PYTHON_PSF_LEGAL_OVERVIEW_EVIDENCE_REF =
  "hakimi.vedic.runtime-license-evidence/python-psf-legal-public-read/2026-08-29";
const SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-commit-license-public-read/2026-08-29";
const SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-dynamic-overview-public-read/2026-08-29";
const SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-professional-contract-template-public-read/2026-08-29";
const WHATWG_DEDICATED_WORKER_EVIDENCE_REF =
  "hakimi.vedic.runtime-license-evidence/whatwg-workers-living-standard-public-read/2026-08-29";

function dependencyLicenseQuestions(dependencyId, evidenceRefs, reviewQuestionIds) {
  return Object.freeze({
    dependencyId,
    evidenceRefs: Object.freeze(evidenceRefs),
    legalConclusionEstablished: false,
    redistributionAuthorized: false,
    reviewComplete: false,
    reviewQuestionIds: Object.freeze(reviewQuestionIds),
    selection: "undecided_not_selected"
  });
}

const DEPENDENCY_LICENSE_QUESTION_MATRIX = Object.freeze([
  dependencyLicenseQuestions("python_runtime", [
    PYTHON_PSF_LEGAL_OVERVIEW_EVIDENCE_REF
  ], [
    "python_runtime_exact_version_and_license_identity_question",
    "python_runtime_packaging_and_redistribution_terms_question",
    "python_runtime_security_update_and_support_window_question"
  ]),
  dependencyLicenseQuestions("swiss_ephemeris_code", [
    SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF,
    SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF
  ], [
    "swiss_ephemeris_code_exact_version_and_license_identity_question",
    "swiss_ephemeris_binding_and_distribution_terms_question",
    "swiss_ephemeris_code_update_and_provenance_question"
  ]),
  dependencyLicenseQuestions("ephemeris_data_files", [
    SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF,
    SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF
  ], [
    "ephemeris_data_file_set_version_and_provenance_question",
    "ephemeris_data_file_use_and_redistribution_rights_question",
    "ephemeris_data_file_update_integrity_question"
  ]),
  dependencyLicenseQuestions("dedicated_worker", [
    WHATWG_DEDICATED_WORKER_EVIDENCE_REF
  ], [
    "dedicated_worker_platform_support_question",
    "dedicated_worker_isolation_and_message_boundary_question",
    "dedicated_worker_packaging_dependency_license_question"
  ]),
  dependencyLicenseQuestions("loopback_local_service", [], [
    "loopback_service_process_distribution_question",
    "loopback_service_port_origin_and_authentication_review_question",
    "loopback_service_runtime_dependency_license_question"
  ])
]);

const LICENSE_RIGHTS_BOUNDARY = Object.freeze({
  codeLicenseEvidenceRefs: Object.freeze([
    PYTHON_PSF_LEGAL_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF,
    SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF
  ]),
  codeLicenseReviewed: false,
  ephemerisDataLicenseEvidenceRefs: Object.freeze([
    SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF,
    SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF
  ]),
  ephemerisDataLicenseReviewed: false,
  observedEvidenceIsLegalConclusion: false,
  legalReviewComplete: false,
  redistributionAuthorized: false,
  redistributionConditionRefs: Object.freeze([]),
  rightsLegalConclusionEstablished: false
});

const MEASUREMENT_PLAN = Object.freeze({
  browserMatrix: Object.freeze([
    Object.freeze({
      browserId: "microsoft_edge",
      evidenceRefs: Object.freeze([]),
      executedRuns: 0,
      executionStatus: "planned_not_executed",
      plannedRuns: 3,
      targetDeviceClass: "fixed_desktop_candidate_unselected"
    }),
    Object.freeze({
      browserId: "google_chrome",
      evidenceRefs: Object.freeze([]),
      executedRuns: 0,
      executionStatus: "planned_not_executed",
      plannedRuns: 3,
      targetDeviceClass: "fixed_desktop_candidate_unselected"
    })
  ]),
  measurementScenarioIds: Object.freeze([
    "first_load_online",
    "offline_cold_start",
    "incremental_update",
    "single_chart_calculation",
    "peak_runtime_memory",
    "release_evidence_retention"
  ]),
  measurementStatus: "not_measured",
  observedMeasurementCount: 0,
  targetDeviceSelectionStatus: "unselected"
});

const DEFERRED_DESIGN_REQUIREMENTS = Object.freeze({
  browserGateAndReleaseEvidence: Object.freeze({
    artifactRefs: Object.freeze([]),
    designArtifactsObserved: 0,
    interfaceRequirementIds: Object.freeze([
      "microsoft_edge_browser_receipt_interface",
      "google_chrome_browser_receipt_interface",
      "artifact_identity_receipt_interface",
      "build_receipt_interface",
      "runtime_execution_receipt_interface",
      "deployment_receipt_interface",
      "rollback_receipt_interface",
      "evidence_retention_receipt_interface"
    ]),
    quantitativePlanRefs: Object.freeze([
      "#/measurementPlan/browserMatrix/0/plannedRuns",
      "#/measurementPlan/browserMatrix/1/plannedRuns",
      "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
    ]),
    requirementState: "separate_rereview_requirement_plan_only_not_satisfied"
  }),
  storageBackupRecoveryMutationEpochCapacityRollback: Object.freeze({
    artifactRefs: Object.freeze([]),
    designArtifactsObserved: 0,
    interfaceRequirementIds: Object.freeze([
      "separate_vedic_storage_namespace_interface",
      "storage_capacity_budget_interface",
      "mutation_epoch_receipt_interface",
      "backup_interface",
      "recovery_interface",
      "rollback_interface"
    ]),
    quantitativePlanRefs: Object.freeze([
      "#/runtimeOptions/0/candidateCeilings/2/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/2/proposedCeiling",
      "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
    ]),
    requirementState: "separate_rereview_requirement_plan_only_not_satisfied"
  })
});

const EVIDENCE_BOUNDARY = Object.freeze({
  browserReceipts: 0,
  browserRunsExecuted: 0,
  buildArtifactsObserved: 0,
  buildReceipts: 0,
  candidateCeilingsAreMeasurements: false,
  implementationArtifactsObserved: 0,
  implementationReceipts: 0,
  measurementReceipts: 0,
  performanceMeasurementsObserved: 0,
  proposalTargetsApproved: false,
  proposalTargetsQuantified: true,
  runtimeExecutionsObserved: 0,
  runtimeReceipts: 0,
  successReceipts: 0
});

const AUTHORITY_BOUNDARY = Object.freeze({
  browserEvidenceEstablished: false,
  budgetApproved: false,
  buildEvidenceEstablished: false,
  centralAdmissionAuthorized: false,
  expertClaimsAuthorized: false,
  formalAdmissionAuthorized: false,
  implementationAuthorized: false,
  productRuntimeAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  runtimeOptionSelected: false
});

const PRODUCT_BOUNDARY = Object.freeze({
  buildArtifact: "absent",
  centralRegistryIntegration: "absent",
  implementation: "absent",
  legacyV13Inherited: false,
  migrationId: null,
  productSurface: "absent",
  releaseIdentity: null,
  runtimeProfile: "proposal_only_unselected",
  schema13Inherited: false,
  targetSchema: null
});

const OBSERVATION_BOUNDARY = Object.freeze({
  abaExcluded: false,
  boundArtifactHashAndInspectionUseSameReadBuffer: true,
  crossFileAtomicSnapshot: false,
  heldFileHandleReads: true,
  intervalMutationExcluded: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  nestedVerifierSameBufferTransitivityClaimed: false,
  parentAndChildrenAtomicSnapshot: false,
  pathEndpointRevalidated: true,
  plainDirectoryChainRequired: true,
  proposalHashAndParseUseSameReadBuffer: true
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "approved_budget_or_service_level_objective",
  "selected_runtime_option_or_architecture_decision",
  "runtime_implementation_or_build_artifact",
  "measured_bundle_download_install_update_or_evidence_retention_bytes",
  "measured_startup_calculation_or_memory_performance",
  "browser_runtime_offline_or_update_validation",
  "python_swiss_ephemeris_data_worker_or_service_selection",
  "code_or_ephemeris_data_license_rights_or_redistribution_conclusion",
  "public_endpoint_retrieval_receipt_as_authenticity_version_selection_complete_legal_review_or_license_grant",
  "dynamic_webpage_digest_as_frozen_source_body_or_stable_version",
  "unsigned_professional_contract_template_as_executed_contract_or_license_authorization",
  "whatwg_platform_spec_as_packaged_worker_implementation_or_dependency_license",
  "python_license_family_page_as_exact_runtime_version_or_packaging_rights",
  "storage_backup_recovery_mutation_epoch_capacity_or_rollback_design_completion",
  "browser_gate_or_release_evidence_design_completion",
  "proposal_material_coverage_as_review_implementation_measurement_or_evidence_completion",
  "legacy_v13_schema13_or_bazi_authority_inheritance",
  "central_registry_integration_or_formal_admission",
  "product_surface_release_readiness_or_public_release_authorization",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion"
]);

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

export class VedicRuntimeAndBundleSizeProposalError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "VedicRuntimeAndBundleSizeProposalError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) {
  throw new VedicRuntimeAndBundleSizeProposalError(code, message, options);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotJsonValue(input, label = "吠陀运行时与体积提案", depth = 0, state = undefined) {
  const activeState = state ?? {
    nodes: 0,
    textCodeUnits: 0,
    seen: new WeakSet()
  };
  activeState.nodes += 1;
  if (activeState.nodes > MAX_SNAPSHOT_NODES || depth > MAX_SNAPSHOT_DEPTH) {
    fail("INPUT_BUDGET_EXCEEDED", `${label} 超过结构预算。`);
  }
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "string") {
    activeState.textCodeUnits += input.length;
    if (activeState.textCodeUnits > MAX_SNAPSHOT_TEXT_CODE_UNITS) {
      fail("INPUT_BUDGET_EXCEEDED", `${label} 超过文本预算。`);
    }
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input) || Object.is(input, -0)) {
      fail("INPUT_VALUE_INVALID", `${label} 含非有限数或负零。`);
    }
    return input;
  }
  if (typeof input !== "object") {
    fail("INPUT_VALUE_INVALID", `${label} 含非 JSON 值。`);
  }
  if (utilTypes.isProxy(input)) fail("INPUT_PROXY_FORBIDDEN", `${label} 不接受 Proxy。`);
  if (activeState.seen.has(input)) {
    fail("INPUT_CYCLE_OR_ALIAS_FORBIDDEN", `${label} 不接受循环或对象别名。`);
  }
  activeState.seen.add(input);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "INPUT_DESCRIPTOR_INVALID",
      `${label} 无法被动读取描述符。`,
      { cause }
    );
  }
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
    fail("INPUT_SYMBOL_FORBIDDEN", `${label} 不接受 Symbol 键。`);
  }
  for (const descriptor of Object.values(descriptors)) {
    if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
      fail("INPUT_ACCESSOR_FORBIDDEN", `${label} 不接受访问器。`);
    }
  }
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", `${label} 数组原型无效。`);
    }
    const keys = Object.keys(descriptors).filter((key) => key !== "length");
    if (keys.length !== input.length
      || keys.some((key, index) => key !== String(index))) {
      fail("INPUT_ARRAY_INVALID", `${label} 数组稀疏或含额外字段。`);
    }
    return keys.map((key) => snapshotJsonValue(
      descriptors[key].value,
      `${label}[${key}]`,
      depth + 1,
      activeState
    ));
  }
  if (Object.getPrototypeOf(input) !== Object.prototype) {
    fail("INPUT_PROTOTYPE_INVALID", `${label} 必须是普通对象。`);
  }
  const output = {};
  for (const key of Object.keys(descriptors).sort(compareCodeUnits)) {
    activeState.textCodeUnits += key.length;
    if (activeState.textCodeUnits > MAX_SNAPSHOT_TEXT_CODE_UNITS) {
      fail("INPUT_BUDGET_EXCEEDED", `${label} 超过文本预算。`);
    }
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: snapshotJsonValue(
        descriptors[key].value,
        `${label}.${key}`,
        depth + 1,
        activeState
      ),
      writable: true
    });
  }
  return output;
}

function canonicalJsonFromSnapshot(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonFromSnapshot(entry)).join(",")}]`;
  }
  const keys = Object.keys(value).sort(compareCodeUnits);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJsonFromSnapshot(value[key])}`).join(",")}}`;
}

function canonicalPrettyFromSnapshot(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function canonicalStringifyVedicRuntimeAndBundleSizeProposal(value) {
  return canonicalJsonFromSnapshot(snapshotJsonValue(value));
}

export function canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(value) {
  return canonicalPrettyFromSnapshot(snapshotJsonValue(value));
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(canonicalJsonFromSnapshot(value), "utf8")
    .digest("hex");
}

export function computeVedicRuntimeAndBundleSizeProposalDigest(proposalInput) {
  const proposal = snapshotJsonValue(proposalInput);
  const { proposalDigest: _ignored, ...unsigned } = proposal;
  return domainSeparatedDigest(DIGEST_DOMAIN, unsigned);
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) walkAst(entry, visit);
    } else if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

function captureUint8Array(bytes, label, maxBytes) {
  if (utilTypes.isProxy(bytes)) {
    fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  }
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "JSON_BYTES_INVALID",
      `${label} 的内部字节槽不可读。`,
      { cause }
    );
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0
    || !Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength < 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
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
      throw new VedicRuntimeAndBundleSizeProposalError(
        "JSON_BYTES_INVALID",
        `${label} 的 ArrayBuffer 状态不可读。`,
        { cause }
      );
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "JSON_BYTES_INVALID",
      `${label} 无法复制到私有固定缓冲区。`,
      { cause }
    );
  }
  return captured;
}

export function parseVedicRuntimeAndBundleSizeProposalJsonBytes(
  bytes,
  label = "吠陀运行时与体积提案 JSON",
  maxBytes = MAX_PROPOSAL_BYTES
) {
  const captured = captureUint8Array(bytes, label, maxBytes);
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(captured);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "JSON_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "vedic-runtime-and-bundle-size-proposal.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "JSON_INVALID",
      `${label} 不能按严格 JSON 检查。`,
      { cause }
    );
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "JSON_INVALID",
      `${label} 不是合法 JSON。`,
      { cause }
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
  }
  return parsed;
}

function canonicalRelativePath(relativePath, label) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || relativePath.includes(":")
    || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    fail("PATH_INVALID", `${label} 必须是 canonical 工作区相对路径。`);
  }
  return relativePath;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function sameFilesystemPath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const canonical = canonicalRelativePath(relativePath, "工件路径");
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...canonical.split("/"));
  if (!insideRoot(root, absolute)) fail("PATH_INVALID", "工件路径越出工作区。");
  return { absolute, canonical, root };
}

function sameFileEndpoint(left, right) {
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
    fail(invalidCode, `${label} 工作区根必须是物理目录。`);
  }
  const segments = canonicalPath.split("/").slice(0, -1);
  let cursor = root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    const details = await lstat(cursor, { bigint: true });
    if (!details.isDirectory() || details.isSymbolicLink()) {
      fail(invalidCode, `${label} 的目录链不能包含符号链接、junction 或特殊端点。`);
    }
    const resolved = await realpath(cursor);
    if (!insideRoot(rootReal, resolved)) fail(invalidCode, `${label} 的目录链 realpath 越出工作区。`);
  }
}

async function readAtMost(handle, maxBytes, invalidCode, label) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    if (capacity <= 0) break;
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, null);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
  }
  if (total > maxBytes) fail(invalidCode, `${label} 超过输入上限。`);
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes, options = {}) {
  const {
    invalidCode = "BOUND_ARTIFACT_ENDPOINT_INVALID",
    label = relativePath,
    missingCode = "BOUND_ARTIFACT_MISSING"
  } = options;
  const { absolute, canonical, root } = safeWorkspaceFile(workspaceRoot, relativePath);
  await verifyPlainDirectoryChain(root, canonical, invalidCode, label);
  let before;
  try {
    before = await lstat(absolute, { bigint: true });
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(missingCode, `${label} 不存在。`, { cause });
  }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(invalidCode, `${label} 必须是单链接、非空、有限大小普通文件。`);
  }
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileEndpoint(before, opened)) {
      fail(invalidCode, `${label} 打开后端点发生变化。`);
    }
    const bytes = await readAtMost(handle, maxBytes, invalidCode, label);
    const [afterHandle, afterPath, afterReal] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute)
    ]);
    if (!afterPath.isFile() || afterPath.isSymbolicLink() || afterPath.nlink !== 1n
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(afterHandle, afterPath)
      || !sameFilesystemPath(afterReal, absolute)
      || BigInt(bytes.byteLength) !== afterHandle.size) {
      fail(invalidCode, `${label} 读取期间端点发生变化。`);
    }
    await verifyPlainDirectoryChain(root, canonical, invalidCode, label);
    return Object.freeze({
      bytes,
      path: canonical,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.byteLength
    });
  } finally {
    await handle.close();
  }
}

function strictUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "BOUND_ARTIFACT_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
}

function requireExactRawIdentity(snapshot, label) {
  const expected = EXPECTED_RAW_IDENTITIES[snapshot.path];
  if (!expected || snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("BOUND_ARTIFACT_IDENTITY_MISMATCH", `${label} 的 bytes 或 raw SHA-256 漂移。`);
  }
}

function noBacklink(boundaryBindings, label) {
  const text = canonicalJsonFromSnapshot(snapshotJsonValue(boundaryBindings, label));
  if (text.includes("vedic-independent-productization-requirements")
    || text.includes("four-system-admission")
    || Object.prototype.hasOwnProperty.call(boundaryBindings, "parentProductizationRequirements")) {
    fail("BOUNDARY_BACKLINK_FORBIDDEN", `${label} 不得回链 parent 或中央 registry。`);
  }
}

function artifactBinding(snapshot, role, extra = {}) {
  return {
    artifactRole: role,
    bytes: snapshot.size,
    path: snapshot.path,
    rawHashAndInspectionUseSameReadBuffer: true,
    sha256: snapshot.sha256,
    ...extra
  };
}

async function verifyUpstreamSnapshots(workspaceRoot, snapshots) {
  const byPath = new Map(snapshots.map((snapshot) => [snapshot.path, snapshot]));
  for (const relativePath of CHAIN_ORDER) {
    const snapshot = byPath.get(relativePath);
    if (!snapshot) fail("BOUND_ARTIFACT_MISSING", `缺少上游工件 ${relativePath}。`);
    requireExactRawIdentity(snapshot, relativePath);
  }

  const adr = byPath.get(ADR_RELATIVE_PATH);
  const adrText = strictUtf8(adr.bytes, "吠陀产品边界 ADR");
  for (const requiredText of [
    "是否接受 Python、Swiss Ephemeris、数据文件和额外 Worker/服务尚未决定",
    "Edge/Chrome 及目标设备的独立测试矩阵",
    "不得为了复用现有 v13 发布管线而把吠陀数据写入八字 Schema 13"
  ]) {
    if (!adrText.includes(requiredText)) {
      fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀 ADR 运行时边界语义缺失。");
    }
  }

  const inputDraftSnapshot = byPath.get(INPUT_DRAFT_RELATIVE_PATH);
  const inputDraft = parseVedicInputContractDraftJsonBytes(inputDraftSnapshot.bytes);
  if (canonicalPrettyStringifyVedicInputContractDraft(inputDraft)
      !== strictUtf8(inputDraftSnapshot.bytes, "吠陀输入合同草案")
    || computeVedicInputContractDraftSemanticDigest(inputDraft)
      !== EXPECTED_DIGESTS.inputDraftSemanticDigest) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀输入合同草案 canonical 或 semantic digest 无效。");
  }
  await verifyVedicInputContractDraft(workspaceRoot, inputDraft);

  const inputRequirementsSnapshot = byPath.get(INPUT_REQUIREMENTS_RELATIVE_PATH);
  const inputRequirements = parseVedicInputContractRequirementsJsonBytes(inputRequirementsSnapshot.bytes);
  if (canonicalPrettyStringifyVedicInputContractRequirements(inputRequirements)
      !== strictUtf8(inputRequirementsSnapshot.bytes, "吠陀输入合同要求账")
    || computeVedicInputContractRequirementsDigest(inputRequirements)
      !== EXPECTED_DIGESTS.inputRequirementsLedgerDigest
    || inputRequirements.status !== EXPECTED_STATUSES.inputRequirements) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀输入合同要求账闭包无效。");
  }
  noBacklink(inputRequirements.boundaryBindings, "吠陀输入合同要求账");
  await verifyVedicInputContractRequirementsLedger(workspaceRoot, inputRequirements);

  const factDraftSnapshot = byPath.get(FACT_DRAFT_RELATIVE_PATH);
  const factDraft = parseVedicFactContractDraftJsonBytes(factDraftSnapshot.bytes);
  if (canonicalPrettyStringifyVedicFactContractDraft(factDraft)
      !== strictUtf8(factDraftSnapshot.bytes, "吠陀事实合同草案")
    || computeVedicFactContractDraftSemanticDigest(factDraft)
      !== EXPECTED_DIGESTS.factDraftSemanticDigest) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀事实合同草案 canonical 或 semantic digest 无效。");
  }
  await verifyVedicFactContractDraft(workspaceRoot, factDraft);

  const factRequirementsSnapshot = byPath.get(FACT_REQUIREMENTS_RELATIVE_PATH);
  const factRequirements = parseVedicFactContractRequirementsJsonBytes(factRequirementsSnapshot.bytes);
  if (canonicalPrettyStringifyVedicFactContractRequirements(factRequirements)
      !== strictUtf8(factRequirementsSnapshot.bytes, "吠陀事实合同要求账")
    || computeVedicFactContractRequirementsDigest(factRequirements)
      !== EXPECTED_DIGESTS.factRequirementsLedgerDigest
    || factRequirements.status !== EXPECTED_STATUSES.factRequirements) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀事实合同要求账闭包无效。");
  }
  noBacklink(factRequirements.boundaryBindings, "吠陀事实合同要求账");
  await verifyVedicFactContractRequirementsLedger(workspaceRoot, factRequirements);

  const ruleDraftSnapshot = byPath.get(RULE_DRAFT_RELATIVE_PATH);
  const ruleDraft = parseVedicRuleContractDraftJsonBytes(ruleDraftSnapshot.bytes);
  if (canonicalPrettyStringifyVedicRuleContractDraft(ruleDraft)
      !== strictUtf8(ruleDraftSnapshot.bytes, "吠陀规则合同草案")
    || computeVedicRuleContractDraftSemanticDigest(ruleDraft)
      !== EXPECTED_DIGESTS.ruleDraftSemanticDigest) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀规则合同草案 canonical 或 semantic digest 无效。");
  }
  await verifyVedicRuleContractDraft(workspaceRoot, ruleDraft);

  const ruleRequirementsSnapshot = byPath.get(RULE_REQUIREMENTS_RELATIVE_PATH);
  const ruleRequirements = parseVedicRuleContractRequirementsJsonBytes(ruleRequirementsSnapshot.bytes);
  if (canonicalPrettyStringifyVedicRuleContractRequirements(ruleRequirements)
      !== strictUtf8(ruleRequirementsSnapshot.bytes, "吠陀规则合同要求账")
    || computeVedicRuleContractRequirementsDigest(ruleRequirements)
      !== EXPECTED_DIGESTS.ruleRequirementsLedgerDigest
    || ruleRequirements.status !== EXPECTED_STATUSES.ruleRequirements) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀规则合同要求账闭包无效。");
  }
  noBacklink(ruleRequirements.boundaryBindings, "吠陀规则合同要求账");
  const expectedRuleChain = [...ruleRequirements.boundaryBindings.chainOrder, RULE_REQUIREMENTS_RELATIVE_PATH];
  if (canonicalJsonFromSnapshot(expectedRuleChain) !== canonicalJsonFromSnapshot(CHAIN_ORDER)
    || new Set(expectedRuleChain).size !== CHAIN_ORDER.length) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀规则要求账未形成精确七层单向链。");
  }
  await verifyVedicRuleContractRequirementsLedger(workspaceRoot, ruleRequirements);

  return [
    artifactBinding(adr, "independent_product_boundary_adr", {
      decisionStatus: "accepted_research_boundary",
      semanticDigest: EXPECTED_DIGESTS.adrSemanticDigest
    }),
    artifactBinding(inputDraftSnapshot, "project_authored_isolated_input_contract_draft", {
      semanticDigest: EXPECTED_DIGESTS.inputDraftSemanticDigest,
      status: "isolated_contract_draft"
    }),
    artifactBinding(inputRequirementsSnapshot, "non_product_governance_requirements_inventory", {
      ledgerDigest: EXPECTED_DIGESTS.inputRequirementsLedgerDigest,
      status: EXPECTED_STATUSES.inputRequirements
    }),
    artifactBinding(factDraftSnapshot, "project_authored_isolated_fact_contract_draft", {
      semanticDigest: EXPECTED_DIGESTS.factDraftSemanticDigest,
      status: "isolated_contract_draft"
    }),
    artifactBinding(factRequirementsSnapshot, "non_product_governance_fact_requirements_inventory", {
      ledgerDigest: EXPECTED_DIGESTS.factRequirementsLedgerDigest,
      status: EXPECTED_STATUSES.factRequirements
    }),
    artifactBinding(ruleDraftSnapshot, "project_authored_isolated_rule_contract_draft", {
      semanticDigest: EXPECTED_DIGESTS.ruleDraftSemanticDigest,
      status: "isolated_contract_draft"
    }),
    artifactBinding(ruleRequirementsSnapshot, "non_product_governance_rule_requirements_inventory", {
      ledgerDigest: EXPECTED_DIGESTS.ruleRequirementsLedgerDigest,
      status: EXPECTED_STATUSES.ruleRequirements
    })
  ];
}

async function verifyRuntimeDependencyLicenseEvidenceSnapshot(workspaceRoot, snapshot) {
  const approved = EXPECTED_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_IDENTITY;
  if (snapshot.path !== approved.path
    || snapshot.size !== approved.bytes
    || snapshot.sha256 !== approved.sha256) {
    fail(
      "RUNTIME_LICENSE_EVIDENCE_IDENTITY_MISMATCH",
      "吠陀运行时依赖许可 evidence child 的 bytes 或 raw SHA-256 漂移。"
    );
  }
  const evidence = parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(
    snapshot.bytes,
    "吠陀运行时依赖许可 evidence JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  if (canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence(evidence)
      !== strictUtf8(snapshot.bytes, "吠陀运行时依赖许可 evidence child")
    || evidence.evidenceDigest !== approved.evidenceDigest
    || computeVedicRuntimeDependencyLicenseEvidenceDigest(evidence) !== approved.evidenceDigest) {
    fail(
      "RUNTIME_LICENSE_EVIDENCE_DIGEST_MISMATCH",
      "吠陀运行时依赖许可 evidence child 的 canonical materialization 或 digest 无效。"
    );
  }
  let objectResult;
  let readResult;
  try {
    [objectResult, readResult] = await Promise.all([
      verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, evidence),
      readVedicRuntimeDependencyLicenseEvidence(workspaceRoot)
    ]);
  } catch (cause) {
    throw new VedicRuntimeAndBundleSizeProposalError(
      "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID",
      "吠陀运行时依赖许可 evidence child 的 ADR 闭包或 public API 验证无效。",
      { cause }
    );
  }
  const boundary = evidence.boundaryBindings;
  const boundaryText = canonicalJsonFromSnapshot(snapshotJsonValue(boundary));
  if (canonicalJsonFromSnapshot(snapshotJsonValue(objectResult.evidence))
      !== canonicalJsonFromSnapshot(snapshotJsonValue(evidence))
    || canonicalJsonFromSnapshot(snapshotJsonValue(readResult))
      !== canonicalJsonFromSnapshot(snapshotJsonValue(evidence))
    || boundary?.bindingDirection !== "runtime_dependency_license_evidence_to_adr_only"
    || boundary?.childBindsRuntimeProposal !== false
    || boundary?.childBindsParent !== false
    || boundary?.childBindsCentralRegistry !== false
    || boundaryText.includes(VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH)
    || boundaryText.includes("vedic-independent-productization-requirements")
    || boundaryText.includes("four-system-admission")) {
    fail(
      "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID",
      "吠陀运行时依赖许可 evidence child 必须保持 ADR-only、无 proposal/parent/registry 回链。"
    );
  }
  const projection = {
    artifactRole: evidence.artifactRole,
    bytes: snapshot.size,
    dependenciesWithObservedRefs: objectResult.dependenciesWithObservedRefs,
    dependenciesWithoutObservedRefs: objectResult.dependenciesWithoutObservedRefs,
    evidenceDigest: objectResult.evidenceDigest,
    legalReviewsComplete: objectResult.legalReviewsComplete,
    loopbackEvidenceRefs: objectResult.loopbackEvidenceRefs,
    path: snapshot.path,
    publicHttpReadsObserved: objectResult.publicHttpReadsObserved,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: objectResult.publicReleaseAuthorized,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    redistributionAuthorizations: objectResult.redistributionAuthorizations,
    releaseReady: objectResult.releaseReady,
    sha256: snapshot.sha256,
    sourceObservationCount: objectResult.sourceObservationCount,
    stableImmediateReadPairs: objectResult.stableImmediateReadPairs,
    status: objectResult.status,
    unstableImmediateReadPairs: objectResult.unstableImmediateReadPairs
  };
  if (canonicalJsonFromSnapshot(snapshotJsonValue(projection))
      !== canonicalJsonFromSnapshot(
        snapshotJsonValue(EXPECTED_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_IDENTITY)
      )) {
    fail(
      "RUNTIME_LICENSE_EVIDENCE_PROJECTION_INVALID",
      "公开读取观察不得晋升为 5/5 覆盖、许可复核、法律结论、再分发或发布授权。"
    );
  }
  return projection;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

async function buildUnsignedCurrent(workspaceRoot) {
  const [snapshots, runtimeDependencyLicenseEvidenceSnapshot] = await Promise.all([
    Promise.all(CHAIN_ORDER.map((relativePath) => readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      MAX_BOUND_ARTIFACT_BYTES,
      { label: relativePath }
    ))),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        invalidCode: "RUNTIME_LICENSE_EVIDENCE_ENDPOINT_INVALID",
        label: "吠陀运行时依赖许可 evidence child",
        missingCode: "RUNTIME_LICENSE_EVIDENCE_MISSING"
      }
    )
  ]);
  const [upstreamArtifacts, runtimeDependencyLicenseEvidence] = await Promise.all([
    verifyUpstreamSnapshots(workspaceRoot, snapshots),
    verifyRuntimeDependencyLicenseEvidenceSnapshot(
      workspaceRoot,
      runtimeDependencyLicenseEvidenceSnapshot
    )
  ]);
  return {
    artifactRole: ARTIFACT_ROLE,
    authorityBoundary: AUTHORITY_BOUNDARY,
    boundaryBindings: {
      bindingDirection:
        "proposal_to_adr_input_fact_and_rule_drafts_and_requirements_only",
      chainOrder: CHAIN_ORDER,
      proposalBindsCentralRegistry: false,
      proposalBindsParent: false,
      upstreamArtifacts
    },
    createdAt: CREATED_AT,
    deferredIndependentDesignRequirements: DEFERRED_DESIGN_REQUIREMENTS,
    dependencyDecisionBoundary: DEPENDENCY_DECISION_BOUNDARY,
    dependencyLicenseQuestionMatrix: DEPENDENCY_LICENSE_QUESTION_MATRIX,
    doesNotEstablish: DOES_NOT_ESTABLISH,
    evidenceBoundary: EVIDENCE_BOUNDARY,
    licenseRightsBoundary: LICENSE_RIGHTS_BOUNDARY,
    measurementPlan: MEASUREMENT_PLAN,
    observationBoundary: OBSERVATION_BOUNDARY,
    productBoundary: PRODUCT_BOUNDARY,
    proposalCoverageComplete: true,
    proposalId: "hakimi.vedic.runtime-and-bundle-size-proposal/1.0.0",
    recordType: "vedic_runtime_and_bundle_size_proposal_v1",
    reviewsComplete: false,
    runtimeDependencyLicenseEvidenceClosure: {
      bindingDirection:
        "runtime_dependency_license_evidence_to_runtime_proposal_aggregator_only",
      childBindsCentralRegistry: false,
      childBindsParent: false,
      childBindsProposal: false,
      runtimeDependencyLicenseEvidence
    },
    securityPrivacyReproducibilityTradeoffMatrix:
      SECURITY_PRIVACY_REPRODUCIBILITY_TRADEOFF_MATRIX,
    runtimeOptions: RUNTIME_OPTIONS,
    schemaVersion: "1.0.0",
    selectedRuntimeOptionId: null,
    status: STATUS,
    systemIdentity: {
      contractSystemId: "vedic",
      integrationStatus: "not_integrated",
      productStatus: "research_only",
      productSystemId: "vedic-astrology"
    }
  };
}

export async function buildCurrentVedicRuntimeAndBundleSizeProposal(workspaceRoot) {
  const unsigned = await buildUnsignedCurrent(workspaceRoot);
  return deepFreeze({
    ...unsigned,
    proposalDigest: domainSeparatedDigest(DIGEST_DOMAIN, snapshotJsonValue(unsigned))
  });
}

function exactJson(left, right) {
  return canonicalJsonFromSnapshot(snapshotJsonValue(left))
    === canonicalJsonFromSnapshot(snapshotJsonValue(right));
}

function requireExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("PROPOSAL_INVALID", `${label} 必须是对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("PROPOSAL_INVALID", `${label} 字段集合不匹配。`);
  }
}

function requireStaticBoundary(proposal) {
  requireExactKeys(proposal, [
    "artifactRole", "authorityBoundary", "boundaryBindings", "createdAt",
    "deferredIndependentDesignRequirements", "dependencyDecisionBoundary",
    "dependencyLicenseQuestionMatrix", "doesNotEstablish",
    "evidenceBoundary", "licenseRightsBoundary", "measurementPlan", "observationBoundary",
    "productBoundary", "proposalCoverageComplete", "proposalDigest", "proposalId",
    "recordType", "reviewsComplete", "runtimeDependencyLicenseEvidenceClosure",
    "runtimeOptions", "schemaVersion",
    "securityPrivacyReproducibilityTradeoffMatrix", "selectedRuntimeOptionId", "status",
    "systemIdentity"
  ], "吠陀运行时与体积提案");
  if (proposal.schemaVersion !== "1.0.0"
    || proposal.recordType !== "vedic_runtime_and_bundle_size_proposal_v1"
    || proposal.proposalId !== "hakimi.vedic.runtime-and-bundle-size-proposal/1.0.0"
    || proposal.artifactRole !== ARTIFACT_ROLE
    || proposal.status !== STATUS
    || proposal.createdAt !== CREATED_AT) {
    fail("PROPOSAL_INVALID", "吠陀运行时与体积提案身份或状态无效。");
  }
  if (proposal.selectedRuntimeOptionId !== null) {
    fail("RUNTIME_SELECTION_PROMOTED", "吠陀运行时 option 尚未选择。");
  }
  if (proposal.proposalCoverageComplete !== true || proposal.reviewsComplete !== false) {
    fail(
      "PROPOSAL_COVERAGE_INVALID",
      "proposal material coverage 完整不代表 review、实现、测量或证据完成。"
    );
  }
  const options = proposal.runtimeOptions;
  if (!Array.isArray(options) || options.length !== 2) {
    fail("BUDGET_PROPOSAL_INVALID", "运行时提案必须保持两个 decision-neutral option。");
  }
  for (const option of options) {
    for (const metric of Array.isArray(option?.candidateCeilings) ? option.candidateCeilings : []) {
      if (metric.observedValue !== null
        || metric.measurementStatus !== "not_measured"
        || !Array.isArray(metric.evidenceRefs)
        || metric.evidenceRefs.length !== 0) {
        fail("MEASUREMENT_PROMOTED", "未批准 ceiling 不得冒充测量或附加证据。");
      }
    }
  }
  if (!exactJson(options, RUNTIME_OPTIONS)) {
    fail("BUDGET_PROPOSAL_INVALID", "运行时 option 或数值 ceiling 被删改。");
  }
  if (!exactJson(
    proposal.securityPrivacyReproducibilityTradeoffMatrix,
    SECURITY_PRIVACY_REPRODUCIBILITY_TRADEOFF_MATRIX
  )) {
    fail(
      "TRADEOFF_MATRIX_INVALID",
      "安全、隐私、可复现性 matrix 只能记录固定风险、控制要求与未执行验证。"
    );
  }
  if (!exactJson(proposal.dependencyDecisionBoundary, DEPENDENCY_DECISION_BOUNDARY)) {
    fail("RUNTIME_SELECTION_PROMOTED", "Python、Swiss Ephemeris、数据、Worker 或 service 不得提前选择。");
  }
  if (!exactJson(proposal.dependencyLicenseQuestionMatrix, DEPENDENCY_LICENSE_QUESTION_MATRIX)) {
    fail(
      "DEPENDENCY_LICENSE_MATRIX_INVALID",
      "依赖许可 matrix 只能引用批准的公开端点观察，并保持未选择、未完成 review 与无法律结论。"
    );
  }
  if (!exactJson(proposal.licenseRightsBoundary, LICENSE_RIGHTS_BOUNDARY)) {
    fail(
      "LICENSE_RIGHTS_PROMOTED",
      "公开端点观察不得被改写为已复核许可、权利、法律结论或再分发权限。"
    );
  }
  requireExactKeys(proposal.runtimeDependencyLicenseEvidenceClosure, [
    "bindingDirection", "childBindsCentralRegistry", "childBindsParent",
    "childBindsProposal", "runtimeDependencyLicenseEvidence"
  ], "runtimeDependencyLicenseEvidenceClosure");
  const licenseEvidenceClosure = proposal.runtimeDependencyLicenseEvidenceClosure;
  const licenseEvidenceProjection = licenseEvidenceClosure.runtimeDependencyLicenseEvidence;
  const closureText = canonicalJsonFromSnapshot(
    snapshotJsonValue(proposal.runtimeDependencyLicenseEvidenceClosure)
  );
  if (licenseEvidenceClosure.bindingDirection
      !== "runtime_dependency_license_evidence_to_runtime_proposal_aggregator_only"
    || licenseEvidenceClosure.childBindsCentralRegistry !== false
    || licenseEvidenceClosure.childBindsParent !== false
    || licenseEvidenceClosure.childBindsProposal !== false
    || closureText.includes("vedic-independent-productization-requirements")
    || closureText.includes("four-system-admission")
    || !exactJson(
      licenseEvidenceProjection,
      EXPECTED_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_IDENTITY
    )) {
    fail(
      "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID",
      "许可 evidence child 只能作为 proposal 的单向聚合输入，且不得回链 parent/registry 或晋升。"
    );
  }
  const observedRefs = new Set([
    PYTHON_PSF_LEGAL_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PINNED_LICENSE_EVIDENCE_REF,
    SWISS_EPHEMERIS_DYNAMIC_OVERVIEW_EVIDENCE_REF,
    SWISS_EPHEMERIS_PROFESSIONAL_CONTRACT_EVIDENCE_REF,
    WHATWG_DEDICATED_WORKER_EVIDENCE_REF
  ]);
  const referencedEvidence = proposal.dependencyLicenseQuestionMatrix.flatMap(
    (entry) => entry.evidenceRefs
  );
  if (referencedEvidence.length !== 8
    || referencedEvidence.some((evidenceRef) => !observedRefs.has(evidenceRef))
    || new Set(referencedEvidence).size !== 5
    || licenseEvidenceProjection.dependenciesWithObservedRefs !== 4
    || licenseEvidenceProjection.dependenciesWithoutObservedRefs !== 1
    || licenseEvidenceProjection.loopbackEvidenceRefs !== 0
    || licenseEvidenceProjection.legalReviewsComplete !== 0
    || licenseEvidenceProjection.redistributionAuthorizations !== 0
    || licenseEvidenceProjection.publicReleaseAuthorized !== false
    || licenseEvidenceProjection.releaseReady !== false) {
    fail(
      "PRIMARY_SOURCE_OBSERVATION_PROMOTED",
      "evidence refs 必须保持 1/3/3/1/0，且读取回执不得冒充法律复核、许可或发布授权。"
    );
  }
  if (proposal.measurementPlan?.browserMatrix?.some((entry) =>
    entry.executedRuns !== 0 || entry.executionStatus !== "planned_not_executed"
      || !Array.isArray(entry.evidenceRefs) || entry.evidenceRefs.length !== 0)) {
    fail("BROWSER_EXECUTION_PROMOTED", "Edge/Chrome 当前只规划、零执行、零证据。");
  }
  if (!exactJson(proposal.measurementPlan, MEASUREMENT_PLAN)) {
    fail("MEASUREMENT_PLAN_INVALID", "运行时测量计划被删改或伪造执行结果。");
  }
  if (!exactJson(proposal.deferredIndependentDesignRequirements, DEFERRED_DESIGN_REQUIREMENTS)) {
    fail("DEFERRED_REQUIREMENT_PROMOTED", "独立 storage/recovery 或 Release Evidence 设计不得由本提案冒充完成。");
  }
  if (!exactJson(proposal.evidenceBoundary, EVIDENCE_BOUNDARY)) {
    fail("IMPLEMENTATION_OR_EVIDENCE_PROMOTED", "实现、build、runtime、browser 或 receipt 必须保持零。");
  }
  if (!exactJson(proposal.productBoundary, PRODUCT_BOUNDARY)) {
    fail("PRODUCT_BOUNDARY_PROMOTED", "不得继承 legacy-v13、Schema 13、产品表面或 release identity。");
  }
  if (!exactJson(proposal.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTED", "运行时、准入、发布或专家 authority 必须保持 false。");
  }
  if (!exactJson(proposal.observationBoundary, OBSERVATION_BOUNDARY)) {
    fail("OBSERVATION_BOUNDARY_PROMOTED", "mutation epoch、原子快照、interval mutation 或 ABA 不得伪造。");
  }
  if (!exactJson(proposal.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail("EVIDENCE_BOUNDARY_PROMOTED", "doesNotEstablish 边界不得删改。");
  }
  requireExactKeys(proposal.boundaryBindings, [
    "bindingDirection", "chainOrder", "proposalBindsCentralRegistry", "proposalBindsParent",
    "upstreamArtifacts"
  ], "boundaryBindings");
  const bindingText = canonicalJsonFromSnapshot(proposal.boundaryBindings);
  if (proposal.boundaryBindings.proposalBindsParent !== false
    || proposal.boundaryBindings.proposalBindsCentralRegistry !== false
    || bindingText.includes("vedic-independent-productization-requirements")
    || bindingText.includes("four-system-admission")) {
    fail("BOUNDARY_BACKLINK_FORBIDDEN", "运行时提案不得回链 parent 或中央 registry。");
  }
  if (!exactJson(proposal.boundaryBindings.chainOrder, CHAIN_ORDER)
    || new Set(proposal.boundaryBindings.chainOrder).size !== CHAIN_ORDER.length) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "运行时提案必须绑定唯一精确七层上游。");
  }
  if (proposal.proposalDigest !== computeVedicRuntimeAndBundleSizeProposalDigest(proposal)) {
    fail("PROPOSAL_DIGEST_MISMATCH", "吠陀运行时与体积提案 digest 不匹配。");
  }
}

export async function verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposalInput) {
  const proposal = snapshotJsonValue(proposalInput);
  requireStaticBoundary(proposal);
  const expected = await buildCurrentVedicRuntimeAndBundleSizeProposal(workspaceRoot);
  if (!exactJson(proposal, expected)) {
    fail("PROPOSAL_MISMATCH", "吠陀运行时与体积提案不等于当前七层绑定的 canonical proposal。");
  }
  const frozenProposal = deepFreeze(proposal);
  return deepFreeze({
    artifactRole: frozenProposal.artifactRole,
    browserReceipts: frozenProposal.evidenceBoundary.browserReceipts,
    browserRunsExecuted: frozenProposal.evidenceBoundary.browserRunsExecuted,
    budgetCeilingsProposed: frozenProposal.runtimeOptions.reduce(
      (total, option) => total + option.candidateCeilings.length,
      0
    ),
    buildReceipts: frozenProposal.evidenceBoundary.buildReceipts,
    ledger: frozenProposal,
    observedMeasurementCount: frozenProposal.measurementPlan.observedMeasurementCount,
    primarySourceObservationCount:
      frozenProposal.runtimeDependencyLicenseEvidenceClosure
        .runtimeDependencyLicenseEvidence.sourceObservationCount,
    proposalDigest: frozenProposal.proposalDigest,
    publicSourceHttpReadsObserved:
      frozenProposal.runtimeDependencyLicenseEvidenceClosure
        .runtimeDependencyLicenseEvidence.publicHttpReadsObserved,
    publicReleaseAuthorized: frozenProposal.authorityBoundary.publicReleaseAuthorized,
    releaseReady: frozenProposal.authorityBoundary.releaseReady,
    runtimeOptionsProposed: frozenProposal.runtimeOptions.length,
    runtimeReceipts: frozenProposal.evidenceBoundary.runtimeReceipts,
    selectedRuntimeOptionId: frozenProposal.selectedRuntimeOptionId,
    stableImmediateReadPairs:
      frozenProposal.runtimeDependencyLicenseEvidenceClosure
        .runtimeDependencyLicenseEvidence.stableImmediateReadPairs,
    status: frozenProposal.status
  });
}

export async function readVedicRuntimeAndBundleSizeProposal(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
    MAX_PROPOSAL_BYTES,
    {
      invalidCode: "PROPOSAL_ENDPOINT_INVALID",
      label: "吠陀运行时与体积提案",
      missingCode: "PROPOSAL_MISSING"
    }
  );
  const proposal = parseVedicRuntimeAndBundleSizeProposalJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(proposal)
      !== strictUtf8(snapshot.bytes, "吠陀运行时与体积提案")) {
    fail("JSON_NON_CANONICAL", "吠陀运行时与体积提案不是 canonical pretty JSON。" );
  }
  const result = await verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposal);
  return result.ledger;
}

export const vedicRuntimeAndBundleSizeProposalTestOnly = Object.freeze({
  CHAIN_ORDER,
  MAX_BOUND_ARTIFACT_BYTES,
  MAX_PROPOSAL_BYTES,
  safeWorkspaceFile
});
