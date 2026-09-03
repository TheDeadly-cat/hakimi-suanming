import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  canonicalPrettyStringifyVedicProductizationRequirements,
  parseVedicProductizationRequirementsJsonBytes,
  verifyVedicProductizationRequirementsLedger
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal,
  parseVedicRuntimeAndBundleSizeProposalJsonBytes,
  verifyVedicRuntimeAndBundleSizeProposal
} from "./vedic-runtime-and-bundle-size-proposal-lib.mjs";
import {
  canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes
} from "./vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs";
import {
  isVerifiedVedicCivilTimeFactBrowserObservationCandidate,
  loadVedicCivilTimeFactBrowserObservationCandidate,
  serializeVedicCivilTimeFactBrowserObservationCandidate
} from "./vedic-civil-time-fact-browser-observation-lib.mjs";

const REFLECT_APPLY_INTRINSIC = Reflect.apply;
const REFLECT_OWN_KEYS_INTRINSIC = Reflect.ownKeys;
const ARRAY_IS_ARRAY_INTRINSIC = Array.isArray;
const ARRAY_PROTOTYPE_INTRINSIC = Array.prototype;
const ARRAY_FIND_INTRINSIC = Array.prototype.find;
const ARRAY_JOIN_INTRINSIC = Array.prototype.join;
const ARRAY_MAP_INTRINSIC = Array.prototype.map;
const ARRAY_SOME_INTRINSIC = Array.prototype.some;
const ARRAY_SORT_INTRINSIC = Array.prototype.sort;
const BUFFER_ALLOC_INTRINSIC = Buffer.alloc;
const BUFFER_BYTE_LENGTH_INTRINSIC = Buffer.byteLength;
const BUFFER_FROM_INTRINSIC = Buffer.from;
const BUFFER_TO_STRING_INTRINSIC = Buffer.prototype.toString;
const JSON_PARSE_INTRINSIC = JSON.parse;
const JSON_STRINGIFY_INTRINSIC = JSON.stringify;
const OBJECT_DEFINE_PROPERTY_INTRINSIC = Object.defineProperty;
const OBJECT_FREEZE_INTRINSIC = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR_INTRINSIC =
  Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF_INTRINSIC = Object.getPrototypeOf;
const OBJECT_HAS_OWN_INTRINSIC = Object.hasOwn;
const OBJECT_IS_FROZEN_INTRINSIC = Object.isFrozen;
const OBJECT_IS_INTRINSIC = Object.is;
const OBJECT_KEYS_INTRINSIC = Object.keys;
const OBJECT_PROTOTYPE_INTRINSIC = Object.prototype;
const OBJECT_VALUES_INTRINSIC = Object.values;
const NUMBER_IS_FINITE_INTRINSIC = Number.isFinite;
const PATH_IS_ABSOLUTE_INTRINSIC = path.isAbsolute;
const PATH_JOIN_INTRINSIC = path.join;
const PATH_RELATIVE_INTRINSIC = path.relative;
const PATH_RESOLVE_INTRINSIC = path.resolve;
const STRING_INCLUDES_INTRINSIC = String.prototype.includes;
const STRING_SPLIT_INTRINSIC = String.prototype.split;
const STRING_STARTS_WITH_INTRINSIC = String.prototype.startsWith;
const UTIL_TYPES_IS_PROXY_INTRINSIC = utilTypes.isProxy;
const WEAK_SET_ADD_INTRINSIC = WeakSet.prototype.add;
const WEAK_SET_HAS_INTRINSIC = WeakSet.prototype.has;
const FS_MODE_MASK = fsConstants.S_IFMT;
const FS_MODE_DIRECTORY = fsConstants.S_IFDIR;
const FS_MODE_REGULAR = fsConstants.S_IFREG;
const FS_MODE_SYMBOLIC_LINK = fsConstants.S_IFLNK;
const FS_OPEN_READ_FLAGS = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
const HASH_PROBE = createHash("sha256");
const HASH_UPDATE_INTRINSIC = HASH_PROBE.update;
const HASH_DIGEST_INTRINSIC = HASH_PROBE.digest;

const MAX_ARTIFACT_BYTES = 1024 * 1024;
const DIGEST_DOMAIN =
  "hakimi.vedic.independent-browser-quality-gate-release-evidence.design-candidate.v0.1";

export const VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/vedic-independent-browser-quality-gate-and-release-evidence-design-candidate.v0.1.0.json";

const DESIGN_ID =
  "hakimi.vedic.independent-browser-quality-gate-and-release-evidence.design-candidate/0.1.0";
const RECORD_TYPE =
  "vedic_independent_browser_quality_gate_and_release_evidence_design_candidate_v0_1";
const STATUS =
  "requirements_only_eight_interface_conjunctive_design_candidate_zero_release_evidence_instances_parent_still_required_absent_no_rereview_effect";
const CREATED_AT = "2026-09-01T00:00:00.000Z";

const INTERFACE_REQUIREMENT_IDS = Object.freeze([
  "microsoft_edge_browser_receipt_interface",
  "google_chrome_browser_receipt_interface",
  "artifact_identity_receipt_interface",
  "build_receipt_interface",
  "runtime_execution_receipt_interface",
  "deployment_receipt_interface",
  "rollback_receipt_interface",
  "evidence_retention_receipt_interface"
]);

const QUANTITATIVE_PLAN_REFS = Object.freeze([
  "#/measurementPlan/browserMatrix/0/plannedRuns",
  "#/measurementPlan/browserMatrix/1/plannedRuns",
  "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
  "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
]);

const BROWSER_SCENARIO_IDS = Object.freeze([
  "unique",
  "gap",
  "overlap_reject",
  "overlap_earlier",
  "overlap_later"
]);

function browserRunRole(
  runRoleId,
  profileState,
  viewportProfile,
  connectivitySequence,
  cacheState,
  serviceWorkerLifecycle,
  updateLifecycle
) {
  return Object.freeze({
    cacheState,
    connectivitySequence,
    currentExecutedInstances: 0,
    formalReceiptInstances: 0,
    profileState,
    requiredScenarioIds: Object.freeze([...BROWSER_SCENARIO_IDS]),
    runRoleId,
    serviceWorkerLifecycle,
    updateLifecycle,
    viewportProfile
  });
}

function exactBrowserRunRoles() {
  return Object.freeze([
    browserRunRole(
      "fresh_profile_online_desktop",
      "new_empty_browser_profile",
      "owner_selected_fixed_desktop_viewport",
      "online_only",
      "cold_empty_before_exact_release_load",
      "no_registration_before_run_then_record_actual_registration_state",
      "initial_exact_release_load_no_update"
    ),
    browserRunRole(
      "fresh_profile_online_390x844",
      "second_new_empty_browser_profile",
      "desktop_browser_emulated_390x844_viewport",
      "online_only",
      "cold_empty_before_exact_release_load",
      "no_registration_before_run_then_record_actual_registration_state",
      "initial_exact_release_load_no_update"
    ),
    browserRunRole(
      "retained_profile_offline_update_transition",
      "retained_profile_from_accepted_release_n_install",
      "owner_selected_fixed_desktop_viewport",
      "online_release_n_then_offline_cold_start_then_online_update_then_offline_recheck",
      "warm_release_n_cache_then_measured_release_n_plus_1_convergence",
      "record_release_n_controller_then_release_n_plus_1_controller_and_cache_convergence",
      "bind_subject_release_n_plus_1_and_predecessor_release_n_artifact_identities_or_fail_closed"
    )
  ]);
}

const BROWSER_RUN_MATRIX_REQUIREMENTS = Object.freeze([
  Object.freeze({
    browserId: "microsoft_edge",
    currentAcceptedReceipts: 0,
    currentExecutedRuns: 0,
    exactBrowserVersionRequired: true,
    exactRunRoleSetRequired: true,
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[0],
    plannedRuns: 3,
    runRoles: exactBrowserRunRoles(),
    uniqueProfileDirectoriesRequired: true,
    uniqueRunIdsRequired: true
  }),
  Object.freeze({
    browserId: "google_chrome",
    currentAcceptedReceipts: 0,
    currentExecutedRuns: 0,
    exactBrowserVersionRequired: true,
    exactRunRoleSetRequired: true,
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[1],
    plannedRuns: 3,
    runRoles: exactBrowserRunRoles(),
    uniqueProfileDirectoriesRequired: true,
    uniqueRunIdsRequired: true
  })
]);

const EVIDENCE_ACCOUNTS = Object.freeze([
  Object.freeze({
    accountId: "engineering_evidence",
    authorityGranted: false,
    formalReceiptAccepted: false,
    observationPresent: true
  }),
  Object.freeze({
    accountId: "browser_runtime_evidence",
    authorityGranted: false,
    formalReceiptAccepted: false,
    observationPresent: true,
    productionValidated: false
  }),
  Object.freeze({
    accountId: "content_truth",
    authorityGranted: false,
    established: false
  }),
  Object.freeze({
    accountId: "expert_truth",
    authorityGranted: false,
    established: false
  }),
  Object.freeze({
    accountId: "rights_legal_judgment",
    authorityGranted: false,
    established: false
  }),
  Object.freeze({
    accountId: "release_readiness",
    authorityGranted: false,
    established: false
  }),
  Object.freeze({
    accountId: "public_release_authorization",
    authorityGranted: false,
    established: false
  })
]);

const BOUND_CONTEXTS = Object.freeze({
  independentProductBoundaryAdr: Object.freeze({
    contextId: "vedic_independent_product_boundary_adr",
    path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
    bytes: 4531,
    sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63",
    requiredMarker: "6. 独立浏览器质量门和 Release Evidence 设计；"
  }),
  historicalParent: Object.freeze({
    contextId: "historical_parent_requirements_ledger_v1",
    path: "content/system-admission/vedic-independent-productization-requirements.v1.json",
    bytes: 25578,
    sha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb",
    requiredRereviewRequirementId:
      "independent_browser_gate_and_release_evidence_design",
    requiredRereviewRequirementState: "required_absent"
  }),
  runtimeAndBundleSizeProposal: Object.freeze({
    contextId: "runtime_and_bundle_size_proposal_v1",
    path: "content/system-admission/vedic-runtime-and-bundle-size-proposal.v1.json",
    bytes: 27241,
    sha256: "e268aa78d6123c34481752cc8e0789e1a185f3f2e2ce9757c45d6227f5bea30e",
    semanticDigestField: "proposalDigest",
    semanticDigest: "ae9fb180d97e81a30a9157655d168bb4101d993f859f40990db31c2e12954f15",
    requiredDeferredDesignKey: "browserGateAndReleaseEvidence",
    expectedDesignArtifactsObserved: 0,
    expectedRequirementState:
      "separate_rereview_requirement_plan_only_not_satisfied"
  }),
  storageDesignCandidate: Object.freeze({
    contextId: "independent_storage_backup_recovery_rollback_design_candidate_v0_1",
    path:
      "content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json",
    bytes: 25978,
    sha256: "1eeaf1419ce4b3ae01f277f6389fc3bbdf5a59605f89d4c7ae7eccfc1a8d1bbf",
    semanticDigestField: "designDigest",
    semanticDigest: "5a96993f7750722a984eb6f5845ce1e49e6c5f49e5b49735629698a47eb11958",
    fullLoaderPrivateBrandRequired: true,
    formalRereviewRequirementSatisfied: false
  }),
  civilTimeFactBrowserObservation: Object.freeze({
    contextId: "civil_time_fact_browser_observation_candidate_v1",
    path:
      "content/system-admission/vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json",
    bytes: 22446,
    sha256: "fdfb6da43215e87e103f428d59d104b43cb3be3b4468880b9417f0baf6167e0a",
    semanticDigestField: "observationDigest",
    semanticDigest: "019ee27933a5a63eb2636a3b3618df25b9a365fed0101f88e1e8ddc1bcb68f6d",
    fullLoaderPrivateBrandRequired: true,
    activeAdmissionEffect: "none"
  })
});

const RECEIPT_TYPE_DEFINITIONS = Object.freeze([
  Object.freeze({
    receiptType: "vedic_edge_browser_quality_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[0],
    minimumAcceptedReceipts: 3,
    currentAcceptedReceipts: 0,
    issuerRoleId: "independent_browser_matrix_observer"
  }),
  Object.freeze({
    receiptType: "vedic_chrome_browser_quality_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[1],
    minimumAcceptedReceipts: 3,
    currentAcceptedReceipts: 0,
    issuerRoleId: "independent_browser_matrix_observer"
  }),
  Object.freeze({
    receiptType: "vedic_release_artifact_identity_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[2],
    minimumAcceptedReceipts: 1,
    currentAcceptedReceipts: 0,
    issuerRoleId: "engineering_artifact_identity_recorder"
  }),
  Object.freeze({
    receiptType: "vedic_release_build_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[3],
    minimumAcceptedReceipts: 2,
    currentAcceptedReceipts: 0,
    issuerRoleId: "independent_build_executor"
  }),
  Object.freeze({
    receiptType: "vedic_runtime_execution_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[4],
    minimumAcceptedReceipts: 6,
    currentAcceptedReceipts: 0,
    issuerRoleId: "runtime_security_privacy_observer"
  }),
  Object.freeze({
    receiptType: "vedic_deployment_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[5],
    minimumAcceptedReceipts: 1,
    currentAcceptedReceipts: 0,
    issuerRoleId: "deployment_provider_operator"
  }),
  Object.freeze({
    receiptType: "vedic_rollback_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[6],
    minimumAcceptedReceipts: 1,
    currentAcceptedReceipts: 0,
    issuerRoleId: "rollback_recovery_operator"
  }),
  Object.freeze({
    receiptType: "vedic_release_evidence_retention_receipt",
    interfaceRequirementId: INTERFACE_REQUIREMENT_IDS[7],
    minimumAcceptedReceipts: 1,
    currentAcceptedReceipts: 0,
    issuerRoleId: "evidence_retention_custodian"
  })
]);

const ACTOR_ROLE_REQUIREMENTS = Object.freeze([
  Object.freeze({
    roleId: "engineering_artifact_identity_recorder",
    roleInstances: 0,
    authority: "records_exact_source_toolchain_and_output_identity_only"
  }),
  Object.freeze({
    roleId: "independent_build_executor",
    roleInstances: 0,
    authority: "executes_clean_reproducible_builds_only"
  }),
  Object.freeze({
    roleId: "independent_browser_matrix_observer",
    roleInstances: 0,
    authority: "observes_fixed_browser_device_and_viewport_runs_only"
  }),
  Object.freeze({
    roleId: "runtime_security_privacy_observer",
    roleInstances: 0,
    authority: "records_runtime_probes_without_domain_or_release_authority"
  }),
  Object.freeze({
    roleId: "deployment_provider_operator",
    roleInstances: 0,
    authority: "records_https_provider_and_deployment_operation_only"
  }),
  Object.freeze({
    roleId: "rollback_recovery_operator",
    roleInstances: 0,
    authority: "records_backup_recovery_and_forward_rollback_operation_only"
  }),
  Object.freeze({
    roleId: "evidence_retention_custodian",
    roleInstances: 0,
    authority: "retains_authorized_non_person_evidence_without_admission_authority"
  }),
  Object.freeze({
    roleId: "vedic_product_owner_authorizer",
    roleInstances: 0,
    authority: "future_explicit_scope_license_deployment_and_public_release_decisions"
  })
]);

function interfaceRequirement(
  interfaceRequirementId,
  failClosedConditions,
  invariants,
  requiredEvidenceBeforeImplementation,
  requiredInputs,
  requiredOutputs,
  nonClaims
) {
  return Object.freeze({
    interfaceRequirementId,
    failClosedConditions: Object.freeze(failClosedConditions),
    invariants: Object.freeze(invariants),
    nonClaims: Object.freeze(nonClaims),
    requiredEvidenceBeforeImplementation: Object.freeze(
      requiredEvidenceBeforeImplementation
    ),
    requiredInputs: Object.freeze(requiredInputs),
    requiredOutputs: Object.freeze(requiredOutputs),
    requirementsDefined: true,
    runtimeImplementationInstances: 0,
    status: "requirements_only_zero_implementation"
  });
}

const COMMON_RECEIPT_FIELDS = [
  "receipt_type_and_schema_version",
  "independent_vedic_product_release_and_evidence_set_identity",
  "subject_artifact_set_digest_and_source_closure_digest",
  "run_or_operation_id_and_canonical_utc_times",
  "actor_role_and_verifiable_authority_ref",
  "status_failure_code_and_partial_evidence_disposition"
];

const INTERFACE_REQUIREMENTS = Object.freeze([
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[0],
    [
      "browser_is_not_microsoft_edge_or_version_is_unpinned",
      "fewer_than_three_independent_runs",
      "artifact_or_evidence_set_identity_mismatch",
      "required_desktop_or_390x844_viewport_missing",
      "console_or_runtime_failure_or_partial_facts_observed",
      "real_person_data_or_unapproved_profile_state_used"
    ],
    [
      "each_run_binds_one_exact_subject_release_artifact_and_browser_version",
      "three_runs_are_separate_and_retain_raw_observation_receipts",
      "exact_three_run_roles_are_fresh_desktop_fresh_390x844_and_retained_offline_update_transition",
      "desktop_and_390x844_layouts_must_not_overflow_or_hide_gate_state",
      "synthetic_scenarios_preserve_unique_gap_overlap_and_failure_semantics"
    ],
    [
      "microsoft_edge_exact_version_and_device_profile",
      "three_synthetic_runtime_execution_receipts",
      "viewport_layout_and_console_observations",
      "same_release_evidence_set_binding"
    ],
    [...COMMON_RECEIPT_FIELDS, "edge_version_device_viewport_and_scenario_matrix"],
    [
      "vedic_edge_browser_quality_receipt",
      "fail_closed_edge_browser_gate_status"
    ],
    [
      "current_codex_in_app_browser_observation_is_not_an_edge_receipt",
      "edge_quality_gate_not_executed_or_satisfied"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[1],
    [
      "browser_is_not_google_chrome_or_version_is_unpinned",
      "fewer_than_three_independent_runs",
      "artifact_or_evidence_set_identity_mismatch",
      "required_desktop_or_390x844_viewport_missing",
      "console_or_runtime_failure_or_partial_facts_observed",
      "real_person_data_or_unapproved_profile_state_used"
    ],
    [
      "each_run_binds_one_exact_subject_release_artifact_and_browser_version",
      "three_runs_are_separate_and_retain_raw_observation_receipts",
      "exact_three_run_roles_are_fresh_desktop_fresh_390x844_and_retained_offline_update_transition",
      "desktop_and_390x844_layouts_must_not_overflow_or_hide_gate_state",
      "synthetic_scenarios_preserve_unique_gap_overlap_and_failure_semantics"
    ],
    [
      "google_chrome_exact_version_and_device_profile",
      "three_synthetic_runtime_execution_receipts",
      "viewport_layout_and_console_observations",
      "same_release_evidence_set_binding"
    ],
    [...COMMON_RECEIPT_FIELDS, "chrome_version_device_viewport_and_scenario_matrix"],
    [
      "vedic_chrome_browser_quality_receipt",
      "fail_closed_chrome_browser_gate_status"
    ],
    [
      "current_codex_in_app_browser_observation_is_not_a_chrome_receipt",
      "chrome_quality_gate_not_executed_or_satisfied"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[2],
    [
      "independent_vedic_product_or_release_identity_absent",
      "legacy_v13_or_schema_13_inherited_as_vedic_identity",
      "source_toolchain_or_output_file_identity_incomplete",
      "artifact_authenticity_or_signature_claim_without_verifiable_signer",
      "formal_admission_or_owner_scope_decision_absent"
    ],
    [
      "artifact_identity_covers_exact_source_toolchain_configuration_and_output_envelope",
      "every_file_has_path_byte_length_and_sha256",
      "artifact_identity_and_authority_decisions_are_separate_accounts",
      "no_observation_digest_is_a_signature_or_publisher_authentication"
    ],
    [
      "independent_non_null_vedic_product_release_schema_and_migration_identity",
      "formal_admission_and_owner_scope_license_deployment_decision",
      "complete_source_toolchain_and_runtime_dependency_closure",
      "exact_release_output_envelope_and_authenticity_disposition"
    ],
    [...COMMON_RECEIPT_FIELDS, "exact_file_inventory_toolchain_and_authenticity_disposition"],
    [
      "vedic_release_artifact_identity_receipt",
      "fail_closed_artifact_identity_gate_status"
    ],
    [
      "current_vedic_product_release_schema_and_migration_identity_remain_null",
      "two_build_output_digest_is_not_a_formal_release_artifact_identity_receipt"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[3],
    [
      "fewer_than_two_clean_build_receipts",
      "builds_share_output_directory_or_uncontrolled_cache",
      "source_toolchain_config_or_lock_identity_differs",
      "output_envelopes_are_not_byte_exact",
      "build_mutates_source_workspace_or_uses_unrecorded_network_input"
    ],
    [
      "two_builds_use_distinct_real_os_temp_directories",
      "both_builds_bind_the_same_source_toolchain_config_and_lock_identity",
      "both_builds_emit_the_same_exact_allowlisted_file_envelope",
      "build_and_release_authorization_are_separate_accounts"
    ],
    [
      "two_independent_clean_build_receipts",
      "toolchain_lock_configuration_and_environment_identity",
      "exact_output_manifest_and_byte_comparison",
      "source_workspace_before_after_integrity_observation"
    ],
    [...COMMON_RECEIPT_FIELDS, "outdir_toolchain_modules_output_manifest_and_workspace_integrity"],
    [
      "vedic_release_build_receipt",
      "fail_closed_build_gate_status"
    ],
    [
      "current_operator_supplied_two_build_observation_is_baseline_only",
      "formal_build_receipts_not_issued"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[4],
    [
      "csp_form_action_or_connect_src_not_observed_fail_closed",
      "network_storage_cookie_or_service_worker_probe_not_performed_or_inconclusive",
      "console_warning_error_or_unhandled_failure_observed",
      "stale_result_partial_fact_or_input_change_clear_failure",
      "worker_request_response_digest_or_exact_shape_binding_failure",
      "probe_null_coerced_to_zero_or_absence_claim"
    ],
    [
      "performed_false_and_observed_null_remain_distinct_from_observed_zero",
      "runtime_receipt_binds_exact_browser_build_origin_headers_and_synthetic_scenario",
      "failure_returns_no_partial_facts_and_clears_previous_view",
      "person_derived_fields_are_not_logged_persisted_transmitted_or_published"
    ],
    [
      "response_header_csp_form_action_and_connect_src_observation",
      "network_storage_cookie_service_worker_and_console_probe_receipts",
      "worker_request_response_shape_digest_and_stale_generation_observation",
      "synthetic_unique_gap_overlap_unknown_zone_and_input_change_scenarios"
    ],
    [...COMMON_RECEIPT_FIELDS, "probe_performed_flags_observed_values_headers_console_and_scenarios"],
    [
      "vedic_runtime_execution_receipt",
      "fail_closed_runtime_execution_gate_status"
    ],
    [
      "current_network_storage_cookie_and_service_worker_probes_are_not_complete",
      "runtime_zero_activity_not_established",
      "production_runtime_gate_not_satisfied"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[5],
    [
      "https_provider_host_or_tls_identity_absent",
      "pwa_manifest_service_worker_offline_or_update_receipt_absent",
      "deployed_artifact_differs_from_accepted_release_artifact",
      "cache_update_or_old_client_convergence_unverified",
      "deployment_operator_or_owner_authorization_absent",
      "public_deployment_authorized_false"
    ],
    [
      "deployment_uses_the_exact_accepted_release_artifact",
      "https_headers_pwa_offline_update_and_cache_behavior_are_separate_evidence",
      "old_and_new_client_convergence_is_tested_without_schema_13_inheritance",
      "deployment_success_does_not_authorize_public_release_or_expert_claims"
    ],
    [
      "provider_account_host_tls_and_https_header_identity",
      "pwa_manifest_service_worker_offline_cold_start_and_update_receipts",
      "cache_and_old_client_convergence_matrix",
      "explicit_owner_deployment_authorization"
    ],
    [...COMMON_RECEIPT_FIELDS, "provider_host_tls_pwa_offline_update_cache_and_owner_authorization"],
    [
      "vedic_deployment_receipt",
      "fail_closed_deployment_gate_status"
    ],
    [
      "current_loopback_origin_is_not_a_deployment_receipt",
      "pwa_service_worker_public_host_and_deployment_not_validated"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[6],
    [
      "independent_storage_namespace_or_backend_absent",
      "mutation_epoch_or_atomic_commit_receipt_absent",
      "backup_or_recovery_receipt_absent",
      "rollback_target_artifact_or_provider_sequence_unverified",
      "rollback_rewinds_epoch_or_overwrites_without_forward_commit",
      "interval_mutation_or_aba_exclusion_unproven"
    ],
    [
      "rollback_consumes_verified_backup_recovery_deployment_and_artifact_receipts",
      "successful_rollback_is_a_forward_mutation_with_one_new_epoch",
      "failed_rollback_changes_neither_active_state_nor_epoch",
      "evidence_and_expert_disagreements_are_retained_across_rollback"
    ],
    [
      "independent_storage_namespace_and_backend_selection",
      "mutation_epoch_atomicity_interval_and_aba_receipts",
      "verified_backup_and_recovery_dry_runs",
      "provider_rollback_sequence_and_owner_rollback_authority"
    ],
    [...COMMON_RECEIPT_FIELDS, "before_after_release_epoch_backup_recovery_and_provider_sequence"],
    [
      "vedic_rollback_receipt",
      "fail_closed_release_rollback_gate_status"
    ],
    [
      "storage_design_candidate_is_not_storage_or_rollback_implementation",
      "mutation_epoch_atomicity_interval_integrity_and_aba_exclusion_not_established",
      "rollback_not_executed"
    ]
  ),
  interfaceRequirement(
    INTERFACE_REQUIREMENT_IDS[7],
    [
      "release_evidence_set_missing_any_required_receipt_type_or_count",
      "receipt_release_artifact_or_epoch_identity_mismatch",
      "retention_duration_location_integrity_or_deletion_policy_undecided",
      "person_derived_digest_or_unredistributable_material_in_public_evidence",
      "actor_role_independence_or_owner_final_authorization_absent",
      "partial_or_conflicting_receipts_collapsed_to_success"
    ],
    [
      "all_eight_interfaces_are_conjunctive_and_partial_completion_never_sets_ready",
      "every_receipt_binds_one_release_evidence_set_and_exact_artifact_identity",
      "person_derived_private_and_link_only_material_remain_separated_by_disposition",
      "conflicts_fail_closed_and_are_preserved_without_majority_average_or_model_selection",
      "owner_public_release_authorization_is_separate_from_evidence_completeness"
    ],
    [
      "complete_minimum_receipt_counts_for_all_eight_interfaces",
      "content_addressed_evidence_inventory_and_retention_policy",
      "privacy_rights_and_redistribution_disposition_per_artifact",
      "actor_role_separation_and_explicit_owner_public_release_decision"
    ],
    [...COMMON_RECEIPT_FIELDS, "retention_inventory_privacy_rights_conflicts_and_owner_final_decision"],
    [
      "vedic_release_evidence_retention_receipt",
      "fail_closed_release_evidence_set_status"
    ],
    [
      "current_release_evidence_set_instances_zero",
      "release_evidence_complete_false",
      "release_ready_and_public_release_authorized_false"
    ]
  )
]);

const VERIFIED_RESULTS = new WeakSet();

function fail(code, message, cause) {
  const error = new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
  error.code = code;
  throw error;
}

function rejectProxy(value, label) {
  if (value !== null
    && typeof value === "object"
    && REFLECT_APPLY_INTRINSIC(UTIL_TYPES_IS_PROXY_INTRINSIC, utilTypes, [value])) {
    fail("UNTRUSTED_PROXY_REJECTED", `${label} 不得是 Proxy。`);
  }
}

function capturePlainJson(value, label = "candidate", seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!REFLECT_APPLY_INTRINSIC(NUMBER_IS_FINITE_INTRINSIC, Number, [value])
      || REFLECT_APPLY_INTRINSIC(OBJECT_IS_INTRINSIC, Object, [value, -0])) {
      fail("NON_CANONICAL_NUMBER", `${label} 含非有限数或 -0。`);
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("NON_JSON_VALUE", `${label} 含非 JSON 值。`);
  }
  rejectProxy(value, label);
  if (REFLECT_APPLY_INTRINSIC(WEAK_SET_HAS_INTRINSIC, seen, [value])) {
    fail("ALIASED_OR_CYCLIC_GRAPH", `${label} 含 alias 或 cycle。`);
  }
  REFLECT_APPLY_INTRINSIC(WEAK_SET_ADD_INTRINSIC, seen, [value]);
  if (REFLECT_APPLY_INTRINSIC(ARRAY_IS_ARRAY_INTRINSIC, Array, [value])) {
    if (REFLECT_APPLY_INTRINSIC(
      OBJECT_GET_PROTOTYPE_OF_INTRINSIC,
      Object,
      [value]
    ) !== ARRAY_PROTOTYPE_INTRINSIC) {
      fail("CUSTOM_PROTOTYPE_REJECTED", `${label} 数组原型不可信。`);
    }
    const keys = REFLECT_APPLY_INTRINSIC(
      REFLECT_OWN_KEYS_INTRINSIC,
      Reflect,
      [value]
    );
    if (REFLECT_APPLY_INTRINSIC(
      ARRAY_SOME_INTRINSIC,
      keys,
      [(key) => typeof key !== "string"]
    )
      || keys.length !== value.length + 1
      || keys[keys.length - 1] !== "length") {
      fail("ARRAY_SHAPE_REJECTED", `${label} 数组必须稠密且无额外或 symbol 字段。`);
    }
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = REFLECT_APPLY_INTRINSIC(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR_INTRINSIC,
        Object,
        [value, `${index}`]
      );
      if (!descriptor
        || !REFLECT_APPLY_INTRINSIC(
          OBJECT_HAS_OWN_INTRINSIC,
          Object,
          [descriptor, "value"]
        )
        || descriptor.enumerable !== true) {
        fail("ACCESSOR_OR_SPARSE_REJECTED", `${label}[${index}] 不是普通数据字段。`);
      }
      REFLECT_APPLY_INTRINSIC(OBJECT_DEFINE_PROPERTY_INTRINSIC, Object, [
        output,
        `${index}`,
        {
          configurable: true,
          enumerable: true,
          value: capturePlainJson(descriptor.value, `${label}[${index}]`, seen),
          writable: true
        }
      ]);
    }
    return output;
  }
  if (REFLECT_APPLY_INTRINSIC(
    OBJECT_GET_PROTOTYPE_OF_INTRINSIC,
    Object,
    [value]
  ) !== OBJECT_PROTOTYPE_INTRINSIC) {
    fail("CUSTOM_PROTOTYPE_REJECTED", `${label} 对象原型不可信。`);
  }
  const keys = REFLECT_APPLY_INTRINSIC(
    REFLECT_OWN_KEYS_INTRINSIC,
    Reflect,
    [value]
  );
  if (REFLECT_APPLY_INTRINSIC(
    ARRAY_SOME_INTRINSIC,
    keys,
    [(key) => typeof key !== "string"]
  )) {
    fail("SYMBOL_KEY_REJECTED", `${label} 不得含 symbol 字段。`);
  }
  const output = {};
  REFLECT_APPLY_INTRINSIC(ARRAY_SORT_INTRINSIC, keys, []);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    const descriptor = REFLECT_APPLY_INTRINSIC(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR_INTRINSIC,
      Object,
      [value, key]
    );
    if (!descriptor
      || !REFLECT_APPLY_INTRINSIC(
        OBJECT_HAS_OWN_INTRINSIC,
        Object,
        [descriptor, "value"]
      )
      || descriptor.enumerable !== true) {
      fail("ACCESSOR_REJECTED", `${label}.${key} 不是普通可枚举数据字段。`);
    }
    REFLECT_APPLY_INTRINSIC(OBJECT_DEFINE_PROPERTY_INTRINSIC, Object, [
      output,
      key,
      {
        configurable: true,
        enumerable: true,
        value: capturePlainJson(descriptor.value, `${label}.${key}`, seen),
        writable: true
      }
    ]);
  }
  return output;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY_INTRINSIC(WEAK_SET_HAS_INTRINSIC, seen, [value])) {
    return value;
  }
  REFLECT_APPLY_INTRINSIC(WEAK_SET_ADD_INTRINSIC, seen, [value]);
  const children = REFLECT_APPLY_INTRINSIC(
    OBJECT_VALUES_INTRINSIC,
    Object,
    [value]
  );
  for (let index = 0; index < children.length; index += 1) {
    deepFreeze(children[index], seen);
  }
  return REFLECT_APPLY_INTRINSIC(OBJECT_FREEZE_INTRINSIC, Object, [value]);
}

function isDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return true;
  if (REFLECT_APPLY_INTRINSIC(WEAK_SET_HAS_INTRINSIC, seen, [value])) {
    return true;
  }
  REFLECT_APPLY_INTRINSIC(WEAK_SET_ADD_INTRINSIC, seen, [value]);
  if (!REFLECT_APPLY_INTRINSIC(OBJECT_IS_FROZEN_INTRINSIC, Object, [value])) {
    return false;
  }
  const children = REFLECT_APPLY_INTRINSIC(
    OBJECT_VALUES_INTRINSIC,
    Object,
    [value]
  );
  for (let index = 0; index < children.length; index += 1) {
    if (!isDeepFrozen(children[index], seen)) return false;
  }
  return true;
}

function canonicalCompact(value) {
  if (value === null || typeof value !== "object") {
    return REFLECT_APPLY_INTRINSIC(JSON_STRINGIFY_INTRINSIC, JSON, [value]);
  }
  if (REFLECT_APPLY_INTRINSIC(ARRAY_IS_ARRAY_INTRINSIC, Array, [value])) {
    const mapped = REFLECT_APPLY_INTRINSIC(
      ARRAY_MAP_INTRINSIC,
      value,
      [canonicalCompact]
    );
    return `[${REFLECT_APPLY_INTRINSIC(ARRAY_JOIN_INTRINSIC, mapped, [","])}]`;
  }
  const keys = REFLECT_APPLY_INTRINSIC(OBJECT_KEYS_INTRINSIC, Object, [value]);
  REFLECT_APPLY_INTRINSIC(ARRAY_SORT_INTRINSIC, keys, []);
  const mapped = REFLECT_APPLY_INTRINSIC(ARRAY_MAP_INTRINSIC, keys, [
    (key) => `${REFLECT_APPLY_INTRINSIC(
      JSON_STRINGIFY_INTRINSIC,
      JSON,
      [key]
    )}:${canonicalCompact(value[key])}`
  ]);
  return `{${REFLECT_APPLY_INTRINSIC(ARRAY_JOIN_INTRINSIC, mapped, [","])}}`;
}

function canonicalPretty(value) {
  const captured = capturePlainJson(value);
  const reparsed = REFLECT_APPLY_INTRINSIC(
    JSON_PARSE_INTRINSIC,
    JSON,
    [canonicalCompact(captured)]
  );
  return REFLECT_APPLY_INTRINSIC(
    JSON_STRINGIFY_INTRINSIC,
    JSON,
    [reparsed, null, 2]
  ) + "\n";
}

function sha256Bytes(bytes) {
  const hash = createHash("sha256");
  REFLECT_APPLY_INTRINSIC(HASH_UPDATE_INTRINSIC, hash, [bytes]);
  return REFLECT_APPLY_INTRINSIC(HASH_DIGEST_INTRINSIC, hash, ["hex"]);
}

function computeDigestInternal(value) {
  const captured = capturePlainJson(value);
  const { designDigest: _ignored, ...unsigned } = captured;
  const hash = createHash("sha256");
  REFLECT_APPLY_INTRINSIC(HASH_UPDATE_INTRINSIC, hash, [DIGEST_DOMAIN, "utf8"]);
  REFLECT_APPLY_INTRINSIC(HASH_UPDATE_INTRINSIC, hash, [
    REFLECT_APPLY_INTRINSIC(BUFFER_FROM_INTRINSIC, Buffer, [[0]])
  ]);
  REFLECT_APPLY_INTRINSIC(HASH_UPDATE_INTRINSIC, hash, [
    canonicalCompact(unsigned),
    "utf8"
  ]);
  return REFLECT_APPLY_INTRINSIC(HASH_DIGEST_INTRINSIC, hash, ["hex"]);
}

export function computeVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateDigest(
  value
) {
  return computeDigestInternal(value);
}

export function canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
  value
) {
  return canonicalPretty(value);
}

export function parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
  bytes,
  label = "吠陀独立浏览器质量门与 Release Evidence 设计候选 JSON"
) {
  const parsed =
    parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
      bytes,
      label,
      MAX_ARTIFACT_BYTES
    );
  return capturePlainJson(parsed, label);
}

function contextProjection(context) {
  return capturePlainJson(context);
}

function buildDesignProjection() {
  const unsigned = {
    activeAdmissionEffect: "none",
    actorRoleRequirements: ACTOR_ROLE_REQUIREMENTS,
    artifactRole:
      "non_product_requirements_only_independent_browser_quality_gate_and_release_evidence_design_candidate",
    authorityBoundary: {
      artifactAuthenticityEstablished: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false,
      scientificTruthEstablished: false,
      sourceFreezeEstablished: false
    },
    baselineEngineeringObservation: {
      activeAdmissionEffect: "none",
      actualPersonDataEntered: false,
      artifactBindingCount: 25,
      browserObservationFieldCount: 40,
      browserObservationCount: 1,
      browserProduct: "Codex In-app Browser",
      browserVersion: null,
      buildArtifactFileCountPerRun: 12,
      buildManifestPayloadEntryCount: 11,
      buildOutputIdentityCount: 2,
      buildOutputIdentityDigest:
        "2037ddbf4a4ccea5b80e597751dd30c51f9e4a99a5fef353531570c8b5f78ccd",
      chromeAcceptedReceipts: 0,
      chromeValidated: false,
      connectSrcNoneResponseHeaderObserved: true,
      consoleProbePerformed: true,
      consoleWarningOrErrorCountObserved: 0,
      currentObservationIsFormalReleaseEvidence: false,
      edgeAcceptedReceipts: 0,
      edgeValidated: false,
      emittedNoticeCount: 3,
      evidenceAccountCount: 7,
      formalContextBindingCount: 7,
      formActionNoneResponseHeaderObserved: true,
      headerObservationProvenance:
        "separate_http_response_read_not_iab_dom_observation",
      historicalSecondPrecisionOffsetBrowserObserved: "UTC+08:05:43",
      iabObservationCount: 1,
      lockedBuildInputCount: 17,
      namedControlsBrowserObserved: 0,
      networkProbePerformed: false,
      networkRequestCountObserved: null,
      observationDigest:
        "019ee27933a5a63eb2636a3b3618df25b9a365fed0101f88e1e8ddc1bcb68f6d",
      operatorSuppliedEvidence: true,
      origin: "http://127.0.0.1:4226",
      productionBrowserRuntimeEvidenceEstablished: false,
      productionBrowserObservationCount: 0,
      productionHostValidated: false,
      runtimeImportEdgeCount: 31,
      runtimeModuleCount: 13,
      runtimeSourceIdentityCount: 15,
      scenarioCount: 5,
      scenarioIds: [
        "unique",
        "gap",
        "overlap_reject",
        "overlap_earlier",
        "overlap_later"
      ],
      serviceWorkerProbePerformed: false,
      serviceWorkerRegistrationObserved: null,
      storageInspectionProhibited: true,
      storageMutationObserved: null,
      storageProbePerformed: false,
      cookieInspectionProhibited: true,
      cookieMutationObserved: null,
      cookieProbePerformed: false,
      syntheticDataOnly: true,
      topLevelFieldCount: 22,
      toolAttestationEstablished: false
    },
    browserRunMatrixRequirements:
      capturePlainJson(BROWSER_RUN_MATRIX_REQUIREMENTS),
    boundaryBindings: {
      civilTimeFactBrowserObservation:
        contextProjection(BOUND_CONTEXTS.civilTimeFactBrowserObservation),
      historicalParent: contextProjection(BOUND_CONTEXTS.historicalParent),
      independentProductBoundaryAdr:
        contextProjection(BOUND_CONTEXTS.independentProductBoundaryAdr),
      runtimeAndBundleSizeProposal:
        contextProjection(BOUND_CONTEXTS.runtimeAndBundleSizeProposal),
      storageDesignCandidate: contextProjection(BOUND_CONTEXTS.storageDesignCandidate)
    },
    createdAt: CREATED_AT,
    designCoverage: {
      designExecutionStarted: false,
      designMaterialCandidateComplete: true,
      designMaterialCandidateCompleteMeans:
        "eight_requirements_texts_present_only",
      designReceiptsIssued: 0,
      interfaceRequirementIds: capturePlainJson(INTERFACE_REQUIREMENT_IDS),
      interfaceRequirementsDefined: 8,
      interfaceRequirementsRequired: 8,
      quantitativePlanRefs: QUANTITATIVE_PLAN_REFS
    },
    designId: DESIGN_ID,
    doesNotEstablish: [
      "formal_parent_update_supersession_or_rereview_satisfaction",
      "independent_vedic_product_release_schema_or_migration_identity",
      "formal_input_fact_rule_or_system_admission",
      "chrome_edge_browser_matrix_or_production_runtime_acceptance",
      "pwa_service_worker_offline_update_public_host_or_https_provider_validation",
      "network_storage_cookie_service_worker_or_console_zero_activity",
      "selected_runtime_storage_backend_namespace_or_capacity_budget",
      "mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion",
      "backup_recovery_deployment_rollback_or_evidence_retention_execution",
      "source_binding_rights_legal_content_expert_or_scientific_truth",
      "release_evidence_completeness_release_readiness_or_public_authorization",
      "legacy_v13_schema_13_or_cross_system_authority_inheritance"
    ],
    evidenceBoundary: {
      acceptedArtifactIdentityReceipts: 0,
      acceptedBuildReceipts: 0,
      acceptedChromeBrowserReceipts: 0,
      acceptedDeploymentReceipts: 0,
      acceptedEdgeBrowserReceipts: 0,
      acceptedEvidenceRetentionReceipts: 0,
      acceptedRollbackReceipts: 0,
      acceptedRuntimeExecutionReceipts: 0,
      releaseEvidenceSetInstances: 0,
      releaseEvidenceComplete: false
    },
    evidenceAccounts: capturePlainJson(EVIDENCE_ACCOUNTS),
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      requirementsUniverseClosed: false,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7,
      rereviewTriggered: false
    },
    integrityBoundary: {
      artifactAuthenticityEstablished: false,
      designDigestAlgorithm: "sha256",
      designDigestDomain: DIGEST_DOMAIN,
      designDigestIsDigitalSignature: false,
      adrSnapshotHashAndMarkerUseSameBuffer: true,
      browserSnapshotHashAndFullLoaderSerializationUseSeparateReads: true,
      directContextCount: 5,
      directJsonContextHashAndLocalParseSameBufferCount: 3,
      fixedPathCurrentVerificationRequired: true,
      fullLoaderPrivateBrandCountRequired: 2,
      sameBufferHashParsePerBoundFile: false,
      signerIdentityEstablished: false,
      transitiveClosureIndependentlyRawPinned: false,
      transitiveRawContextCountIndependentlyPinned: 0,
      upstreamCapabilityBrandCount: 2
    },
    interfaceRequirements: INTERFACE_REQUIREMENTS,
    observationBoundary: {
      abaExcluded: false,
      boundFilesObservedSequentially: true,
      browserObservationOperatorSupplied: true,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      simultaneousCurrentRawClosureVerified: false
    },
    productBoundary: {
      centralFormalRegistryIntegration: "absent",
      databaseInstances: 0,
      databaseSchema: "absent",
      formalProductSurface: "absent",
      mainApplicationIntegration: false,
      migrationId: null,
      namespaceInstances: 0,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      storageNamespace: null,
      targetSchema: null
    },
    projectDefaultReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      inheritedByVedicProductIdentity: false,
      migrationId: null,
      targetSchema: 13
    },
    quantitativePlanObservations: {
      browserMatrixEntriesObserved: 2,
      candidateCeilingEntriesObserved: 18,
      candidateCeilingsApproved: 0,
      candidateCeilingsMeasured: 0,
      chromeExecutedRuns: 0,
      chromePlannedRuns: 3,
      edgeExecutedRuns: 0,
      edgePlannedRuns: 3,
      observedMeasurements: 0,
      plannedBrowserRunsTotal: 6,
      retentionCeilings: [
        {
          approvalStatus: "unapproved_candidate",
          inheritedAsApprovedBudget: false,
          inheritedAsMeasurement: false,
          measurementStatus: "not_measured",
          observedValue: null,
          optionId: "browser_embedded",
          planRef: "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
          proposedCeiling: 50000000,
          unit: "bytes"
        },
        {
          approvalStatus: "unapproved_candidate",
          inheritedAsApprovedBudget: false,
          inheritedAsMeasurement: false,
          measurementStatus: "not_measured",
          observedValue: null,
          optionId: "loopback_local_service",
          planRef: "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling",
          proposedCeiling: 100000000,
          unit: "bytes"
        }
      ],
      runtimeOptionsObserved: 2
    },
    receiptTypeDefinitions: capturePlainJson(RECEIPT_TYPE_DEFINITIONS),
    recordType: RECORD_TYPE,
    releaseEvidenceConjunctiveGate: {
      allEightInterfacesRequired: true,
      allReceiptsMustBindSameSubjectArtifactReleaseAndEvidenceSet: true,
      actorIdentityMaySatisfyMultipleRequiredRoles: false,
      automaticPromotionAllowed: false,
      crossReceiptBindingFields: [
        "independent_vedic_product_identity",
        "release_identity",
        "target_schema_identity",
        "migration_identity",
        "release_evidence_set_identity",
        "source_lock_identity",
        "subject_artifact_set_digest",
        "runtime_option_identity",
        "build_identity",
        "storage_identity",
        "deployment_host_identity",
        "mutation_epoch_lineage",
        "rollback_release_lineage"
      ],
      conflictDisposition: "preserve_and_fail_closed_no_vote_average_or_model_winner",
      currentGateSatisfied: false,
      currentReleaseEvidenceSetId: null,
      exactBrowserRunRoleMatricesRequired: true,
      duplicateReceiptIdRejected: true,
      exactChronologyFreshnessReplayAndRevocationRulesRequired: true,
      extraReceiptRoleRejected: true,
      legacyV13Schema13IdentitySubstitutionRejected: true,
      missingReceiptRoleRejected: true,
      mixedReleaseArtifactRuntimeOrHostBundleRejected: true,
      nonNullIndependentVedicIdentitiesRequired: true,
      ownerAuthorizationSeparatelyRequired: true,
      partialCompletionMaySetGateTrue: false,
      predecessorArtifactMayReplaceSubjectArtifact: false,
      receiptMaySatisfyMultipleRoles: false,
      receiptRoleExactSetRequired: true,
      requiredInterfaceIds: capturePlainJson(INTERFACE_REQUIREMENT_IDS),
      requiredReceiptTypesAndMinimumCounts:
        capturePlainJson(RECEIPT_TYPE_DEFINITIONS),
      transitionRoleAdditionalBindingFields: [
        "predecessor_release_identity",
        "predecessor_artifact_set_digest",
        "update_source_identity",
        "before_after_cache_and_controller_lineage"
      ],
      transitionRoleId: "retained_profile_offline_update_transition",
      transitionRolePredecessorBindingsAreAdditionalOnly: true
    },
    rereviewBoundary: {
      currentDesignCandidateMaterialPresent: true,
      formalRereviewRequirementSatisfied: false,
      historicalParentRequirementState: "required_absent",
      historicalParentRereviewRequirementsComplete: 3,
      historicalParentRereviewRequirementsRequired: 7,
      ownerDecision: null,
      parentLedgerUpdated: false,
      registryUpdated: false
    },
    storageDesignBaseline: {
      approvedCapacityBudgets: 0,
      backupDryRunsExecuted: 0,
      backupImplementations: 0,
      backupReceiptsIssued: 0,
      compareAndSwapImplementations: 0,
      designInterfaceRequirementsDefined: 6,
      designInterfaceRequirementsRequired: 6,
      directContextEndpointSnapshots: 4,
      measuredCapacityValues: 0,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      recoveryDryRunsExecuted: 0,
      recoveryImplementations: 0,
      recoveryReceiptsIssued: 0,
      releaseRollbackReceiptInterchangeableWithStorageDesignInterface: false,
      rollbackDryRunsExecuted: 0,
      rollbackImplementations: 0,
      rollbackReceiptsIssued: 0,
      totalContextEndpointSnapshots: 20,
      transitiveContextEndpointSnapshots: 16
    },
    schemaVersion: "0.1.0",
    status: STATUS,
    systemIdentity: {
      independentFromBaziZiweiWestern: true,
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      systemId: "vedic-astrology",
      targetSchema: null
    },
    transitiveRawClosureBoundary: {
      completeCurrentRawClosureClaimed: false,
      directCurrentContextsPinned: 5,
      downgradeReason:
        "five_direct_contexts_and_two_full_loader_private_brands_only_no_independent_transitive_raw_repin",
      transitiveClosureIndependentlyRawPinned: false,
      transitiveCurrentRawContextsIndependentlyPinned: 0
    }
  };
  return deepFreeze({
    ...unsigned,
    designDigest: computeDigestInternal(unsigned)
  });
}

function exactJson(left, right) {
  return canonicalCompact(left) === canonicalCompact(right);
}

export function verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(
  value
) {
  const captured = capturePlainJson(value);
  const expected = buildDesignProjection();
  if (!exactJson(captured, expected)
    || captured.designDigest !== computeDigestInternal(captured)) {
    fail(
      "DESIGN_OBJECT_MISMATCH",
      "吠陀浏览器质量门与 Release Evidence 设计候选、八接口、计数或红门漂移。"
    );
  }
  return deepFreeze(captured);
}

function workspaceRootReal(workspaceRoot) {
  const requested = REFLECT_APPLY_INTRINSIC(
    PATH_RESOLVE_INTRINSIC,
    path,
    [workspaceRoot]
  );
  const stat = lstatSync(requested);
  if ((stat.mode & FS_MODE_MASK) !== FS_MODE_DIRECTORY
    || (stat.mode & FS_MODE_MASK) === FS_MODE_SYMBOLIC_LINK) {
    fail("WORKSPACE_ROOT_INVALID", "workspace root 必须是真实普通目录。" );
  }
  return realpathSync(requested);
}

function safeAbsolute(root, relativePath) {
  if (typeof relativePath !== "string"
    || REFLECT_APPLY_INTRINSIC(
      STRING_INCLUDES_INTRINSIC,
      relativePath,
      ["\\"]
    )) {
    fail("BOUND_PATH_INVALID", "固定路径必须使用规范 POSIX 相对路径。" );
  }
  const segments = REFLECT_APPLY_INTRINSIC(
    STRING_SPLIT_INTRINSIC,
    relativePath,
    ["/"]
  );
  if (REFLECT_APPLY_INTRINSIC(
    ARRAY_SOME_INTRINSIC,
    segments,
    [(segment) => !segment || segment === "." || segment === ".."]
  )) {
    fail("BOUND_PATH_INVALID", "固定路径不得为空或越界。" );
  }
  let cursor = root;
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    cursor = REFLECT_APPLY_INTRINSIC(PATH_JOIN_INTRINSIC, path, [cursor, segment]);
    let stat;
    try {
      stat = lstatSync(cursor);
    } catch (cause) {
      fail("BOUND_ARTIFACT_MISSING", `${relativePath} 不存在。`, cause);
    }
    if ((stat.mode & FS_MODE_MASK) === FS_MODE_SYMBOLIC_LINK) {
      fail("BOUND_PATH_LINK_REJECTED", `${relativePath} 路径链不得含符号链接或 junction。`);
    }
  }
  const resolved = realpathSync(cursor);
  const relative = REFLECT_APPLY_INTRINSIC(
    PATH_RELATIVE_INTRINSIC,
    path,
    [root, resolved]
  );
  if (!relative
    || REFLECT_APPLY_INTRINSIC(
      STRING_STARTS_WITH_INTRINSIC,
      relative,
      [".."]
    )
    || REFLECT_APPLY_INTRINSIC(PATH_IS_ABSOLUTE_INTRINSIC, path, [relative])) {
    fail("BOUND_PATH_ESCAPE", `${relativePath} 未解析到 workspace 内普通文件。`);
  }
  return resolved;
}

function readStableSnapshot(root, relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const absolutePath = safeAbsolute(root, relativePath);
  const flags = FS_OPEN_READ_FLAGS;
  let descriptor;
  try {
    descriptor = openSync(absolutePath, flags);
    const before = fstatSync(descriptor);
    if ((before.mode & FS_MODE_MASK) !== FS_MODE_REGULAR
      || before.size <= 0
      || before.size > maxBytes) {
      fail("BOUND_ARTIFACT_SIZE_INVALID", `${relativePath} 不是允许大小的普通文件。`);
    }
    const bytes = REFLECT_APPLY_INTRINSIC(
      BUFFER_ALLOC_INTRINSIC,
      Buffer,
      [before.size]
    );
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("BOUND_ARTIFACT_SHORT_READ", `${relativePath} 稳定读取不完整。`);
      offset += count;
    }
    const after = fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      fail("BOUND_ARTIFACT_CHANGED_DURING_READ", `${relativePath} 在读取期间漂移。`);
    }
    return REFLECT_APPLY_INTRINSIC(OBJECT_FREEZE_INTRINSIC, Object, [{
      bytes,
      byteLength: bytes.length,
      sha256: sha256Bytes(bytes),
      text: REFLECT_APPLY_INTRINSIC(
        BUFFER_TO_STRING_INTRINSIC,
        bytes,
        ["utf8"]
      )
    }]);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function requireIdentity(snapshot, context, label) {
  if (snapshot.byteLength !== context.bytes || snapshot.sha256 !== context.sha256) {
    fail("BOUND_CONTEXT_IDENTITY_MISMATCH", `${label} 的当前 bytes/SHA-256 漂移。`);
  }
}

async function collectAndVerifyCurrentContexts(workspaceRoot) {
  const root = workspaceRootReal(workspaceRoot);
  const adrSnapshot = readStableSnapshot(root, BOUND_CONTEXTS.independentProductBoundaryAdr.path);
  const parentSnapshot = readStableSnapshot(root, BOUND_CONTEXTS.historicalParent.path);
  const runtimeSnapshot = readStableSnapshot(
    root,
    BOUND_CONTEXTS.runtimeAndBundleSizeProposal.path
  );
  const storageSnapshot = readStableSnapshot(root, BOUND_CONTEXTS.storageDesignCandidate.path);
  const browserSnapshot = readStableSnapshot(
    root,
    BOUND_CONTEXTS.civilTimeFactBrowserObservation.path
  );
  requireIdentity(adrSnapshot, BOUND_CONTEXTS.independentProductBoundaryAdr, "独立产品边界 ADR");
  requireIdentity(parentSnapshot, BOUND_CONTEXTS.historicalParent, "formal parent v1");
  requireIdentity(runtimeSnapshot, BOUND_CONTEXTS.runtimeAndBundleSizeProposal, "runtime proposal v1");
  requireIdentity(storageSnapshot, BOUND_CONTEXTS.storageDesignCandidate, "storage design candidate");
  requireIdentity(
    browserSnapshot,
    BOUND_CONTEXTS.civilTimeFactBrowserObservation,
    "civil-time fact browser observation"
  );
  if (!REFLECT_APPLY_INTRINSIC(
    STRING_INCLUDES_INTRINSIC,
    adrSnapshot.text,
    [BOUND_CONTEXTS.independentProductBoundaryAdr.requiredMarker]
  )) {
    fail("ADR_MARKER_MISSING", "ADR 第 6 项固定标记不存在。" );
  }

  const parent = parseVedicProductizationRequirementsJsonBytes(parentSnapshot.bytes);
  if (parent.ledgerDigest !== BOUND_CONTEXTS.historicalParent.semanticDigest
    || canonicalPrettyStringifyVedicProductizationRequirements(parent) !== parentSnapshot.text) {
    fail("PARENT_PROJECTION_MISMATCH", "formal parent v1 摘要或 materialization 漂移。" );
  }
  await verifyVedicProductizationRequirementsLedger(root, parent);
  const parentRow = REFLECT_APPLY_INTRINSIC(
    ARRAY_FIND_INTRINSIC,
    parent.rereviewRequirements,
    [(entry) =>
      entry.requirementId
        === BOUND_CONTEXTS.historicalParent.requiredRereviewRequirementId]
  );
  if (!parentRow
    || parentRow.requirementState !== BOUND_CONTEXTS.historicalParent.requiredRereviewRequirementState
    || parentRow.artifactRefs.length !== 0
    || parent.gateSummary.rereviewRequirementsComplete !== 3
    || parent.gateSummary.rereviewRequirementsRequired !== 7
    || parent.gateSummary.admissionGatesSatisfied !== 0
    || parent.gateSummary.bindingFrozenVerified !== 0
    || parent.gateSummary.independentExpertReviewsVerified !== 0
    || parent.gateSummary.requirementsUniverseClosed !== false) {
    fail("PARENT_REREVIEW_BOUNDARY_MISMATCH", "formal parent 第 6 项不再是 required_absent。" );
  }

  const runtime = parseVedicRuntimeAndBundleSizeProposalJsonBytes(runtimeSnapshot.bytes);
  if (runtime.proposalDigest !== BOUND_CONTEXTS.runtimeAndBundleSizeProposal.semanticDigest
    || canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(runtime) !== runtimeSnapshot.text) {
    fail("RUNTIME_PROPOSAL_MISMATCH", "runtime proposal v1 摘要或 materialization 漂移。" );
  }
  await verifyVedicRuntimeAndBundleSizeProposal(root, runtime);
  const deferred = runtime.deferredIndependentDesignRequirements.browserGateAndReleaseEvidence;
  if (!deferred
    || deferred.designArtifactsObserved !== 0
    || deferred.requirementState
      !== BOUND_CONTEXTS.runtimeAndBundleSizeProposal.expectedRequirementState
    || !exactJson(deferred.interfaceRequirementIds, INTERFACE_REQUIREMENT_IDS)
    || !exactJson(deferred.quantitativePlanRefs, QUANTITATIVE_PLAN_REFS)
    || runtime.runtimeOptions.length !== 2
    || REFLECT_APPLY_INTRINSIC(
      ARRAY_SOME_INTRINSIC,
      runtime.runtimeOptions,
      [(option) => option.candidateCeilings.length !== 9]
    )
    || runtime.measurementPlan.browserMatrix.length !== 2
    || runtime.measurementPlan.observedMeasurementCount !== 0
    || runtime.measurementPlan.measurementStatus !== "not_measured"
    || !exactJson(
      REFLECT_APPLY_INTRINSIC(
        ARRAY_MAP_INTRINSIC,
        runtime.measurementPlan.browserMatrix,
        [(row) => ({
        browserId: row.browserId,
        executedRuns: row.executedRuns,
        plannedRuns: row.plannedRuns
        })]
      ),
      [
        { browserId: "microsoft_edge", executedRuns: 0, plannedRuns: 3 },
        { browserId: "google_chrome", executedRuns: 0, plannedRuns: 3 }
      ]
    )
    || !exactJson(
      REFLECT_APPLY_INTRINSIC(
        ARRAY_MAP_INTRINSIC,
        runtime.runtimeOptions,
        [(option) => ({
        approvalStatus: option.candidateCeilings[8].approvalStatus,
        measurementStatus: option.candidateCeilings[8].measurementStatus,
        observedValue: option.candidateCeilings[8].observedValue,
        optionId: option.optionId,
        proposedCeiling: option.candidateCeilings[8].proposedCeiling
        })]
      ),
      [
        {
          approvalStatus: "unapproved_candidate",
          measurementStatus: "not_measured",
          observedValue: null,
          optionId: "browser_embedded",
          proposedCeiling: 50000000
        },
        {
          approvalStatus: "unapproved_candidate",
          measurementStatus: "not_measured",
          observedValue: null,
          optionId: "loopback_local_service",
          proposedCeiling: 100000000
        }
      ]
    )) {
    fail("RUNTIME_DEFERRED_DESIGN_MISMATCH", "runtime proposal 第 6 项八接口或量化引用漂移。" );
  }

  const storageParsed =
    parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
      storageSnapshot.bytes
    );
  if (storageParsed.designDigest !== BOUND_CONTEXTS.storageDesignCandidate.semanticDigest
    || canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      storageParsed
    ) !== storageSnapshot.text
    || storageParsed.designCoverage.interfaceRequirementsDefined !== 6
    || storageParsed.designCoverage.interfaceRequirementsRequired !== 6
    || storageParsed.designCoverage.designExecutionStarted !== false
    || storageParsed.designCoverage.designReceiptsIssued !== 0
    || storageParsed.observationBoundary.directContextEndpointSnapshots !== 4
    || storageParsed.observationBoundary.transitiveContextEndpointSnapshots !== 16
    || storageParsed.observationBoundary.totalContextEndpointSnapshots !== 20
    || storageParsed.capacityBoundary.measuredCapacityValues !== 0
    || storageParsed.capacityBoundary.approvedCapacityBudgets !== 0
    || storageParsed.mutationBoundary.mutationEpochAvailable !== false
    || storageParsed.mutationBoundary.mutationEpochReceipt !== null
    || REFLECT_APPLY_INTRINSIC(
      ARRAY_SOME_INTRINSIC,
      REFLECT_APPLY_INTRINSIC(
        OBJECT_VALUES_INTRINSIC,
        Object,
        [storageParsed.backupRecoveryRollbackBoundary]
      ),
      [(count) => count !== 0]
    )) {
    fail("STORAGE_DESIGN_PROJECTION_MISMATCH", "storage design candidate 摘要或 materialization 漂移。" );
  }
  const storageLoaded =
    await loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(root);
  if (!isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(storageLoaded)
    || storageLoaded.designDigest !== BOUND_CONTEXTS.storageDesignCandidate.semanticDigest
    || storageLoaded.rereviewBoundary.formalRereviewRequirementSatisfied !== false) {
    fail("STORAGE_PRIVATE_BRAND_REQUIRED", "storage design 必须来自固定路径 full loader 私有品牌。" );
  }

  const browserLoaded = loadVedicCivilTimeFactBrowserObservationCandidate(root);
  if (!isVerifiedVedicCivilTimeFactBrowserObservationCandidate(browserLoaded)
    || browserLoaded.observationDigest
      !== BOUND_CONTEXTS.civilTimeFactBrowserObservation.semanticDigest
    || serializeVedicCivilTimeFactBrowserObservationCandidate(browserLoaded)
      !== browserSnapshot.text
    || browserLoaded.activeAdmissionEffect !== "none"
    || browserLoaded.browserObservation.productionBrowserRuntimeEvidenceEstablished !== false
    || browserLoaded.authorityBoundary.releaseEvidenceComplete !== false
    || browserLoaded.artifactBindingCount !== 25
    || browserLoaded.formalContext.bindings.length !== 7
    || browserLoaded.buildOutputIdentities.length !== 2
    || REFLECT_APPLY_INTRINSIC(
      ARRAY_SOME_INTRINSIC,
      browserLoaded.buildOutputIdentities,
      [(run) => run.artifacts.length !== 12]
    )
    || browserLoaded.browserObservation.browserProduct !== "Codex In-app Browser"
    || browserLoaded.browserObservation.browserVersion !== null
    || browserLoaded.browserObservation.origin !== "http://127.0.0.1:4226"
    || browserLoaded.browserObservation.chromeValidated !== false
    || browserLoaded.browserObservation.edgeValidated !== false
    || browserLoaded.browserObservation.crossBrowserValidated !== false
    || browserLoaded.browserObservation.networkProbePerformed !== false
    || browserLoaded.browserObservation.networkRequestCountObserved !== null
    || browserLoaded.browserObservation.storageProbePerformed !== false
    || browserLoaded.browserObservation.storageMutationObserved !== null
    || browserLoaded.browserObservation.cookieProbePerformed !== false
    || browserLoaded.browserObservation.cookieMutationObserved !== null
    || browserLoaded.browserObservation.serviceWorkerProbePerformed !== false
    || browserLoaded.browserObservation.serviceWorkerRegistrationObserved !== null
    || !exactJson(
      REFLECT_APPLY_INTRINSIC(
        ARRAY_MAP_INTRINSIC,
        browserLoaded.browserObservation.scenarios,
        [(scenario) => scenario.scenarioId]
      ),
      ["unique", "gap", "overlap_reject", "overlap_earlier", "overlap_later"]
    )) {
    fail("BROWSER_PRIVATE_BRAND_REQUIRED", "browser observation 必须来自固定路径 full loader 私有全红品牌。" );
  }

  return deepFreeze({
    contexts: REFLECT_APPLY_INTRINSIC(
      ARRAY_MAP_INTRINSIC,
      REFLECT_APPLY_INTRINSIC(
        OBJECT_VALUES_INTRINSIC,
        Object,
        [BOUND_CONTEXTS]
      ),
      [contextProjection]
    ),
    directCurrentContextCount: 5,
    fullLoaderPrivateBrandCount: 2,
    sequentialFixedPathObservationMechanicallyVerified: true,
    simultaneousCurrentRawClosureVerified: false
  });
}

function readCandidateSnapshot(workspaceRoot) {
  const root = workspaceRootReal(workspaceRoot);
  return readStableSnapshot(
    root,
    VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH
  );
}

export async function buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
  workspaceRoot
) {
  await collectAndVerifyCurrentContexts(workspaceRoot);
  return verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(
    buildDesignProjection()
  );
}

export async function readCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
  workspaceRoot = process.cwd()
) {
  const before = readCandidateSnapshot(workspaceRoot);
  const parsed =
    parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      before.bytes
    );
  if (before.text
    !== canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      parsed
    )) {
    fail("DESIGN_MATERIALIZATION_MISMATCH", "设计候选不是 canonical LF materialization。" );
  }
  const verified =
    verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(parsed);
  await collectAndVerifyCurrentContexts(workspaceRoot);
  const after = readCandidateSnapshot(workspaceRoot);
  if (before.byteLength !== after.byteLength || before.sha256 !== after.sha256) {
    fail("DESIGN_CHANGED_DURING_VERIFICATION", "设计候选在顺序验证期间漂移。" );
  }
  return verified;
}

export async function loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
  workspaceRoot = process.cwd()
) {
  const candidate =
    await readCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      workspaceRoot
    );
  const result = deepFreeze(capturePlainJson({
    activeAdmissionEffect: "none",
    artifact: {
      bytes: REFLECT_APPLY_INTRINSIC(
        BUFFER_BYTE_LENGTH_INTRINSIC,
        Buffer,
        [
        canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
          candidate
        ),
        "utf8"
        ]
      ),
      path:
        VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH,
      sha256: sha256Bytes(REFLECT_APPLY_INTRINSIC(
        BUFFER_FROM_INTRINSIC,
        Buffer,
        [
          canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
            candidate
          ),
          "utf8"
        ]
      ))
    },
    authorityBoundary: candidate.authorityBoundary,
    baselineEngineeringObservation: candidate.baselineEngineeringObservation,
    designCoverage: candidate.designCoverage,
    designDigest: candidate.designDigest,
    designId: candidate.designId,
    evidenceBoundary: candidate.evidenceBoundary,
    gateSummary: candidate.gateSummary,
    productBoundary: candidate.productBoundary,
    projectDefaultReleaseGovernanceContext:
      candidate.projectDefaultReleaseGovernanceContext,
    rereviewBoundary: candidate.rereviewBoundary,
    sequentialFixedPathObservationMechanicallyVerified: true,
    simultaneousCurrentRawClosureVerified: false
  }));
  if (!isDeepFrozen(result)) {
    fail(
      "VERIFIED_RESULT_NOT_DEEPLY_FROZEN",
      "固定路径验证结果在签发私有品牌前必须递归深冻结。"
    );
  }
  REFLECT_APPLY_INTRINSIC(WEAK_SET_ADD_INTRINSIC, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
  value
) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY_INTRINSIC(WEAK_SET_HAS_INTRINSIC, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY_INTRINSIC(OBJECT_IS_FROZEN_INTRINSIC, Object, [value]);
}

export const vedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateTestOnly =
  Object.freeze({
    ACTOR_ROLE_REQUIREMENTS,
    BROWSER_RUN_MATRIX_REQUIREMENTS,
    BROWSER_SCENARIO_IDS,
    BOUND_CONTEXTS,
    CREATED_AT,
    DESIGN_ID,
    DIGEST_DOMAIN,
    EVIDENCE_ACCOUNTS,
    INTERFACE_REQUIREMENT_IDS,
    INTERFACE_REQUIREMENTS,
    MAX_ARTIFACT_BYTES,
    QUANTITATIVE_PLAN_REFS,
    RECEIPT_TYPE_DEFINITIONS,
    RECORD_TYPE,
    STATUS,
    buildDesignProjection,
    collectAndVerifyCurrentContexts,
    readStableSnapshot,
    sha256Bytes
  });
