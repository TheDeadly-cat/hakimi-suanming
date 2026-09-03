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

export const VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json";

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

const RECORD_TYPE = "vedic_source_binding_and_three_layer_rights_requirements_v1";
const LEDGER_ID =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0";
const STATUS =
  "requirements_only_current_scoped_inventory_38_all_unbound_open_universe_no_sources_bodies_quotes_bindings_or_three_layer_rights_established";
const ARTIFACT_ROLE =
  "non_product_governance_source_binding_and_three_layer_rights_requirements_inventory";
const CREATED_AT = "2026-08-29T00:00:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements.v1";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const MAX_SNAPSHOT_NODES = 100_000;
const MAX_SNAPSHOT_TEXT_CODE_UNITS = 6_000_000;
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

function subject(layer, layerOrder, globalOrder, requirementId, requirementClass) {
  const requirementPath = layer === "input"
    ? INPUT_REQUIREMENTS_RELATIVE_PATH
    : layer === "fact"
      ? FACT_REQUIREMENTS_RELATIVE_PATH
      : RULE_REQUIREMENTS_RELATIVE_PATH;
  const draftPath = layer === "input"
    ? INPUT_DRAFT_RELATIVE_PATH
    : layer === "fact"
      ? FACT_DRAFT_RELATIVE_PATH
      : RULE_DRAFT_RELATIVE_PATH;
  const draftRequirementPointer = layer === "input"
    ? `${draftPath}#/properties/${requirementId}`
    : `${draftPath}#/x-hakimiBoundary/blockedPrerequisiteIds/${layerOrder - 1}`;
  return Object.freeze({
    basisRefsEstablishFormalSource: false,
    bindingDigest: null,
    bindingState: "required_unbound",
    carrierIdentity: null,
    carrierRightsEstablished: false,
    carrierRightsEvidenceRefs: Object.freeze([]),
    contentTruthEstablished: false,
    draftRequirementPointer,
    exactLocatorEstablished: false,
    exactLocatorRefs: Object.freeze([]),
    exactQuoteDigest: null,
    exactQuoteRefs: Object.freeze([]),
    exactQuoteStored: false,
    expertReviewIds: Object.freeze([]),
    expertTruthEstablished: false,
    formalDistributionPolicy: null,
    frozenAt: null,
    frozenBindingId: null,
    globalOrder,
    layer,
    layerOrder,
    licenseEstablished: false,
    licenseEvidenceRefs: Object.freeze([]),
    redistributionAuthorized: false,
    requirementClass,
    requirementId,
    requirementIdentityVerifiedFromBoundUpstreams: true,
    rightsLegalConclusionEstablished: false,
    selectedSourceCandidateId: null,
    sourceBindingEstablished: false,
    sourceBodyDigest: null,
    sourceBodyRefs: Object.freeze([]),
    sourceCandidateIds: Object.freeze([]),
    sourceCarrierRecordId: null,
    sourceOrProvenanceMode: null,
    sourceRightsRecordId: null,
    subjectId: `vedic.${layer}.${requirementId}`,
    traditionalAuthorityClaimed: false,
    upstreamRequirementPointer:
      `${requirementPath}#/requirementInventory/requirements/${layerOrder - 1}/requirementId`,
    versionIdentity: null,
    versionRightsEstablished: false,
    versionRightsEvidenceRefs: Object.freeze([]),
    workIdentity: null,
    workRightsEstablished: false,
    workRightsEvidenceRefs: Object.freeze([])
  });
}

const SUBJECTS = Object.freeze([
  ...INPUT_REQUIREMENT_IDS.map((requirementId, index) => subject(
    "input",
    index + 1,
    index + 1,
    requirementId,
    index < 6 ? "input_declaration" : "calculation_policy_declaration"
  )),
  ...FACT_REQUIREMENT_IDS.map((requirementId, index) => subject(
    "fact",
    index + 1,
    INPUT_REQUIREMENT_IDS.length + index + 1,
    requirementId,
    "v0_1_scoped_fact_prerequisite"
  )),
  ...RULE_REQUIREMENT_IDS.map((requirementId, index) => subject(
    "rule",
    index + 1,
    INPUT_REQUIREMENT_IDS.length + FACT_REQUIREMENT_IDS.length + index + 1,
    requirementId,
    "v0_1_scoped_rule_prerequisite"
  ))
]);

const DEFAULT_CLOSURE_REQUIREMENTS = Object.freeze({
  carrierIdentityRequired: true,
  carrierRightsEvidenceRequired: true,
  exactLocatorRequired: true,
  generatedModelWinnerSelectionAllowed: false,
  minimalSufficientQuoteOrFirstPartyRationaleRequired: true,
  nonRedistributableMaterialPolicy: "private_or_link_only",
  sourceBodyDigestRequired: true,
  sourceCarrierRecordRequired: true,
  sourceOrFirstPartyProvenanceIdentityRequired: true,
  sourceRightsRecordRequired: true,
  twoIndependentDomainOpinionsRequiredForDomainClaims: true,
  twoIndependentSourceRightsReviewersRequired: true,
  versionIdentityRequired: true,
  versionRightsEvidenceRequired: true,
  workIdentityRequired: true,
  workRightsEvidenceRequired: true
});

const REQUIREMENTS_UNIVERSE = Object.freeze({
  bindingRequired: 38,
  bindingRequiredScope: "current_bound_input_fact_and_rule_requirements_only",
  bindingRequirementsInventoryDefined: true,
  countsByLayer: Object.freeze({ fact: 12, input: 13, rule: 13 }),
  currentBoundUpstreamInventoryCoveredExactly: true,
  currentScopedSubjectCount: 38,
  exhaustiveVedicSourceRightsUniverseClaimed: false,
  futureRequirementExpansionRequiresExplicitLedgerRevision: true,
  requirementsUniverseClosed: false
});

const SOURCE_RIGHTS_BOUNDARY = Object.freeze({
  bindingFrozenVerified: 0,
  bindingRequired: 38,
  bindingRequirementsInventoryDefined: true,
  carrierIdentitiesFrozen: 0,
  carrierRightsEstablished: 0,
  carrierRightsEvidenceRefs: Object.freeze([]),
  exactLocatorsEstablished: 0,
  exactLocatorRefs: Object.freeze([]),
  exactQuotesBound: 0,
  exactQuoteRefs: Object.freeze([]),
  licenseEstablished: false,
  licenseEvidenceRefs: Object.freeze([]),
  requirementsUniverseClosed: false,
  rightsEstablished: false,
  rightsLegalConclusionEstablished: false,
  sourceBindingEstablished: false,
  sourceBodiesBound: 0,
  sourceBodyRefs: Object.freeze([]),
  sourceCandidateIds: Object.freeze([]),
  sourceCandidatesAttached: 0,
  sourceRightsRecordIds: Object.freeze([]),
  sourceCarrierRecordIds: Object.freeze([]),
  versionIdentitiesFrozen: 0,
  versionRightsEstablished: 0,
  versionRightsEvidenceRefs: Object.freeze([]),
  workIdentitiesFrozen: 0,
  workRightsEstablished: 0,
  workRightsEvidenceRefs: Object.freeze([])
});

const EXPERT_BOUNDARY = Object.freeze({
  credentialsVerified: 0,
  expertOpinionIds: Object.freeze([]),
  expertReviewBundle: "absent",
  expertTruthEstablished: false,
  identitiesVerified: 0,
  independentExpertReviewsVerified: 0,
  independentExpertsRequired: 2,
  opinionsVerified: 0,
  reviewerIds: Object.freeze([])
});

const AUTHORITY_BOUNDARY = Object.freeze({
  contentTruthEstablished: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  expertTruthEstablished: false,
  formalAdmissionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false,
  sourceBundleComplete: false,
  rightsBundleComplete: false,
  expertReviewBundleComplete: false
});

const PRODUCT_BOUNDARY = Object.freeze({
  centralRegistryIntegration: "absent",
  legacyV13Inherited: false,
  migrationId: null,
  productSurface: "absent",
  releaseIdentity: null,
  schema13Inherited: false,
  sourceBindingLedger:
    "requirements_only_open_universe_all_unbound_no_formal_source_or_rights_records",
  targetSchema: null
});

const OBSERVATION_BOUNDARY = Object.freeze({
  abaExcluded: false,
  boundArtifactHashAndInspectionUseSameReadBuffer: true,
  crossFileAtomicSnapshot: false,
  endpointSnapshotOnly: true,
  heldFileHandleReads: true,
  intervalMutationExcluded: false,
  ledgerAndUpstreamsAtomicSnapshot: false,
  ledgerHashAndParseUseSameReadBuffer: true,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  pathEndpointRevalidated: true,
  plainDirectoryChainRequired: true
});

const SCOPE_EXCLUSIONS = Object.freeze({
  centralRegistryCovered: false,
  parentProductizationRequirementsCovered: false,
  runtimeDependencyLicenseQuestionMatrixCovered: false,
  runtimeProposalBound: false,
  runtimeScopeDisposition:
    "separate_open_runtime_dependency_license_questions_not_counted_in_current_38_subjects"
});

const GATE_SUMMARY = Object.freeze({
  bindingFrozenVerified: 0,
  bindingRequired: 38,
  bindingRequirementsInventoryDefined: true,
  carrierRightsEstablished: 0,
  exactLocatorsEstablished: 0,
  exactQuotesBound: 0,
  expertReviewedSubjects: 0,
  expertReviewBundleComplete: false,
  licenseEstablished: false,
  releaseReady: false,
  requirementsUniverseClosed: false,
  rightsBundleComplete: false,
  sourceBodiesBound: 0,
  sourceBundleComplete: false,
  sourceCandidatesAttached: 0,
  versionRightsEstablished: 0,
  workRightsEstablished: 0
});

const EVIDENCE_LEDGER = Object.freeze({
  browserRuntimeEvidence: "not_assessed_in_requirements_ledger",
  contentTruth: "not_established",
  engineeringRequirementIdentity:
    "seven_bound_upstream_raw_identities_and_exact_current_38_subject_inventory_verified",
  expertTruth: "not_established",
  publicReleaseAuthorization: "not_authorized",
  releaseReadiness: "not_ready",
  rightsLegalConclusion: "not_established"
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "closed_or_exhaustive_vedic_source_rights_requirements_universe",
  "source_candidate_identity_or_selected_provenance_mode",
  "source_body_digest_or_stored_source_body",
  "exact_quote_text_digest_or_locator",
  "work_version_or_carrier_identity",
  "source_rights_or_source_carrier_record",
  "source_binding_or_frozen_binding",
  "work_version_or_carrier_rights_evidence",
  "license_redistribution_or_rights_legal_conclusion",
  "content_truth_or_traditional_authority",
  "expert_identity_credentials_independence_opinion_or_truth",
  "runtime_dependency_license_question_coverage",
  "runtime_proposal_parent_or_central_registry_binding",
  "legacy_v13_schema13_or_bazi_authority_inheritance",
  "browser_runtime_storage_backup_recovery_or_deployment_evidence",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_release_readiness_or_public_release_authorization"
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

export class VedicSourceBindingAndThreeLayerRightsRequirementsError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "VedicSourceBindingAndThreeLayerRightsRequirementsError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) {
  throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(code, message, options);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotJsonValue(input, label = "吠陀来源与三层权利要求账", depth = 0, state = undefined) {
  const activeState = state ?? { nodes: 0, textCodeUnits: 0, seen: new WeakSet() };
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
  if (typeof input !== "object") fail("INPUT_VALUE_INVALID", `${label} 含非 JSON 值。`);
  if (utilTypes.isProxy(input)) fail("INPUT_PROXY_FORBIDDEN", `${label} 不接受 Proxy。`);
  if (activeState.seen.has(input)) {
    fail("INPUT_CYCLE_OR_ALIAS_FORBIDDEN", `${label} 不接受循环或对象别名。`);
  }
  activeState.seen.add(input);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch (cause) {
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
    if (keys.length !== input.length || keys.some((key, index) => key !== String(index))) {
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
  return `{${keys.map((key) =>
    `${JSON.stringify(key)}:${canonicalJsonFromSnapshot(value[key])}`).join(",")}}`;
}

export function canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(value) {
  return canonicalJsonFromSnapshot(snapshotJsonValue(value));
}

export function canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(value) {
  return `${JSON.stringify(snapshotJsonValue(value), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(canonicalJsonFromSnapshot(value), "utf8")
    .digest("hex");
}

export function computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(ledgerInput) {
  const ledger = snapshotJsonValue(ledgerInput);
  const { ledgerDigest: _ignored, ...unsigned } = ledger;
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
  if (utilTypes.isProxy(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
      throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
      "JSON_BYTES_INVALID",
      `${label} 无法复制到私有固定缓冲区。`,
      { cause }
    );
  }
  return captured;
}

export function parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
  bytes,
  label = "吠陀来源与三层权利要求账 JSON",
  maxBytes = MAX_LEDGER_BYTES
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
      sourceFilename: "vedic-source-binding-and-three-layer-rights-requirements.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
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
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
      missingCode,
      `${label} 不存在。`,
      { cause }
    );
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
    throw new VedicSourceBindingAndThreeLayerRightsRequirementsError(
      "BOUND_ARTIFACT_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
}

function exactJson(left, right) {
  return canonicalJsonFromSnapshot(snapshotJsonValue(left))
    === canonicalJsonFromSnapshot(snapshotJsonValue(right));
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
    || text.includes("vedic-runtime-and-bundle-size-proposal")
    || Object.prototype.hasOwnProperty.call(boundaryBindings, "parentProductizationRequirements")) {
    fail("BOUNDARY_BACKLINK_FORBIDDEN", `${label} 不得回链 runtime、parent 或中央 registry。`);
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

function exactIds(actual, expected, label) {
  if (!exactJson(actual, expected)) {
    fail("SUBJECT_BASIS_MISMATCH", `${label} requirementId 集合或顺序漂移。`);
  }
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
    "正式来源包必须逐项建立作品、版本、载体三层身份与许可记录",
    "权利未知或不允许再分发的材料只能 private、link-only 或不存储",
    "作品/版本/载体三层来源权利账"
  ]) {
    if (!adrText.includes(requiredText)) {
      fail("BOUND_ARTIFACT_CLOSURE_INVALID", "吠陀 ADR 来源与三层权利边界语义缺失。");
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
  exactIds(
    inputRequirements.requirementInventory.requirements.map((entry) => entry.requirementId),
    INPUT_REQUIREMENT_IDS,
    "吠陀输入要求账"
  );
  exactIds(
    inputDraft.required.filter((entry) => entry !== "contractVersion"),
    INPUT_REQUIREMENT_IDS,
    "吠陀输入合同草案"
  );

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
  exactIds(
    factRequirements.requirementInventory.requirements.map((entry) => entry.requirementId),
    FACT_REQUIREMENT_IDS,
    "吠陀事实要求账"
  );
  exactIds(
    factDraft["x-hakimiBoundary"].blockedPrerequisiteIds,
    FACT_REQUIREMENT_IDS,
    "吠陀事实合同草案"
  );

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
  await verifyVedicRuleContractRequirementsLedger(workspaceRoot, ruleRequirements);
  exactIds(
    ruleRequirements.requirementInventory.requirements.map((entry) => entry.requirementId),
    RULE_REQUIREMENT_IDS,
    "吠陀规则要求账"
  );
  exactIds(
    ruleDraft["x-hakimiBoundary"].blockedPrerequisiteIds,
    RULE_REQUIREMENT_IDS,
    "吠陀规则合同草案"
  );

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

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

async function buildUnsignedCurrent(workspaceRoot) {
  const snapshots = await Promise.all(CHAIN_ORDER.map((relativePath) => readStableWorkspaceFile(
    workspaceRoot,
    relativePath,
    MAX_BOUND_ARTIFACT_BYTES,
    { label: relativePath }
  )));
  const upstreamArtifacts = await verifyUpstreamSnapshots(workspaceRoot, snapshots);
  return {
    artifactRole: ARTIFACT_ROLE,
    authorityBoundary: AUTHORITY_BOUNDARY,
    boundaryBindings: {
      bindingDirection:
        "source_rights_requirements_to_adr_input_fact_and_rule_drafts_and_requirements_only",
      chainOrder: CHAIN_ORDER,
      childBindsCentralRegistry: false,
      childBindsParent: false,
      childBindsRuntimeProposal: false,
      upstreamArtifacts
    },
    createdAt: CREATED_AT,
    defaultClosureRequirements: DEFAULT_CLOSURE_REQUIREMENTS,
    doesNotEstablish: DOES_NOT_ESTABLISH,
    evidenceLedger: EVIDENCE_LEDGER,
    expertBoundary: EXPERT_BOUNDARY,
    gateSummary: GATE_SUMMARY,
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: LEDGER_ID,
    observationBoundary: OBSERVATION_BOUNDARY,
    productBoundary: PRODUCT_BOUNDARY,
    recordType: RECORD_TYPE,
    requirementsUniverse: REQUIREMENTS_UNIVERSE,
    schemaVersion: "1.0.0",
    scopeExclusions: SCOPE_EXCLUSIONS,
    sourceRightsBoundary: SOURCE_RIGHTS_BOUNDARY,
    status: STATUS,
    subjects: SUBJECTS,
    systemIdentity: {
      contractSystemId: "vedic",
      integrationStatus: "not_integrated",
      productStatus: "research_only",
      productSystemId: "vedic-astrology"
    }
  };
}

export async function buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot) {
  const unsigned = await buildUnsignedCurrent(workspaceRoot);
  return deepFreeze({
    ...unsigned,
    ledgerDigest: domainSeparatedDigest(DIGEST_DOMAIN, snapshotJsonValue(unsigned))
  });
}

function requireExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("LEDGER_INVALID", `${label} 必须是对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("LEDGER_INVALID", `${label} 字段集合不匹配。`);
  }
}

function requireStaticBoundary(ledger) {
  requireExactKeys(ledger, [
    "artifactRole", "authorityBoundary", "boundaryBindings", "createdAt",
    "defaultClosureRequirements", "doesNotEstablish", "evidenceLedger", "expertBoundary",
    "gateSummary", "integrityBoundary", "ledgerDigest", "ledgerId", "observationBoundary",
    "productBoundary", "recordType", "requirementsUniverse", "schemaVersion", "scopeExclusions",
    "sourceRightsBoundary", "status", "subjects", "systemIdentity"
  ], "吠陀来源与三层权利要求账");
  if (ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== RECORD_TYPE
    || ledger.ledgerId !== LEDGER_ID
    || ledger.artifactRole !== ARTIFACT_ROLE
    || ledger.status !== STATUS
    || ledger.createdAt !== CREATED_AT) {
    fail("LEDGER_INVALID", "吠陀来源与三层权利要求账身份或状态无效。");
  }
  if (!exactJson(ledger.defaultClosureRequirements, DEFAULT_CLOSURE_REQUIREMENTS)) {
    fail("CLOSURE_REQUIREMENTS_INVALID", "来源与三层权利未来闭包要求被删改。");
  }
  if (!exactJson(ledger.requirementsUniverse, REQUIREMENTS_UNIVERSE)) {
    fail("REQUIREMENTS_UNIVERSE_PROMOTED", "当前 38 条不得冒充封闭或穷尽的吠陀来源权利宇宙。");
  }
  if (!exactJson(ledger.sourceRightsBoundary, SOURCE_RIGHTS_BOUNDARY)
    || !exactJson(ledger.gateSummary, GATE_SUMMARY)) {
    fail("SOURCE_RIGHTS_PROMOTED", "来源、正文、quote、locator、binding、三层权利或许可不得提前建立。");
  }
  if (!exactJson(ledger.subjects, SUBJECTS)) {
    fail("SUBJECT_INVENTORY_INVALID", "38 条当前 scoped subject 身份、顺序或 unbound 状态被删改。");
  }
  const subjectIds = ledger.subjects.map((entry) => entry.subjectId);
  if (subjectIds.length !== 38 || new Set(subjectIds).size !== 38) {
    fail("SUBJECT_INVENTORY_INVALID", "subject 必须保持 38 条且 ID 唯一。");
  }
  if (!exactJson(ledger.expertBoundary, EXPERT_BOUNDARY)) {
    fail("EXPERT_PROMOTED", "现实专家身份、资质、意见或真值必须保持零或未建立。");
  }
  if (!exactJson(ledger.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTED", "内容、专家、权利、准入或发布 authority 必须保持 false。");
  }
  if (!exactJson(ledger.productBoundary, PRODUCT_BOUNDARY)) {
    fail("PRODUCT_BOUNDARY_PROMOTED", "不得继承 legacy-v13、Schema 13、产品表面或 release identity。");
  }
  if (!exactJson(ledger.observationBoundary, OBSERVATION_BOUNDARY)) {
    fail("OBSERVATION_BOUNDARY_PROMOTED", "mutation epoch、原子快照、interval mutation 或 ABA 不得伪造。");
  }
  if (!exactJson(ledger.scopeExclusions, SCOPE_EXCLUSIONS)) {
    fail("SCOPE_EXCLUSION_INVALID", "runtime、parent 与 registry 必须保持明确排除。");
  }
  if (!exactJson(ledger.evidenceLedger, EVIDENCE_LEDGER)
    || !exactJson(ledger.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail("EVIDENCE_BOUNDARY_PROMOTED", "工程 subject inventory 不得冒充内容、专家、权利或发布证据。");
  }
  if (!exactJson(ledger.integrityBoundary, {
    authenticityEstablished: false,
    digestAlgorithm: "SHA-256",
    digestDomain: DIGEST_DOMAIN,
    digestIsDigitalSignature: false,
    digitalSignature: null,
    signerIdentity: null
  })) {
    fail("INTEGRITY_BOUNDARY_INVALID", "摘要不是数字签名、真实性或签署者身份。");
  }
  requireExactKeys(ledger.boundaryBindings, [
    "bindingDirection", "chainOrder", "childBindsCentralRegistry", "childBindsParent",
    "childBindsRuntimeProposal", "upstreamArtifacts"
  ], "boundaryBindings");
  const bindingText = canonicalJsonFromSnapshot(ledger.boundaryBindings);
  if (ledger.boundaryBindings.childBindsParent !== false
    || ledger.boundaryBindings.childBindsCentralRegistry !== false
    || ledger.boundaryBindings.childBindsRuntimeProposal !== false
    || bindingText.includes("vedic-independent-productization-requirements")
    || bindingText.includes("four-system-admission")
    || bindingText.includes("vedic-runtime-and-bundle-size-proposal")) {
    fail("BOUNDARY_BACKLINK_FORBIDDEN", "来源权利要求 child 不得绑定 runtime、parent 或中央 registry。");
  }
  if (!exactJson(ledger.boundaryBindings.chainOrder, CHAIN_ORDER)
    || new Set(ledger.boundaryBindings.chainOrder).size !== CHAIN_ORDER.length) {
    fail("BOUND_ARTIFACT_CLOSURE_INVALID", "来源权利要求账必须绑定唯一精确七层上游。");
  }
  if (ledger.ledgerDigest
      !== computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(ledger)) {
    fail("LEDGER_DIGEST_MISMATCH", "吠陀来源与三层权利要求账 digest 不匹配。");
  }
}

export async function verifyVedicSourceBindingAndThreeLayerRightsRequirements(
  workspaceRoot,
  ledgerInput
) {
  const ledger = snapshotJsonValue(ledgerInput);
  requireStaticBoundary(ledger);
  const expected = await buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  if (!exactJson(ledger, expected)) {
    fail("LEDGER_MISMATCH", "吠陀来源与三层权利要求账不等于当前七层绑定的 canonical ledger。");
  }
  const frozenLedger = deepFreeze(ledger);
  return deepFreeze({
    bindingFrozenVerified: frozenLedger.gateSummary.bindingFrozenVerified,
    bindingRequired: frozenLedger.gateSummary.bindingRequired,
    bindingRequirementsInventoryDefined:
      frozenLedger.gateSummary.bindingRequirementsInventoryDefined,
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    publicReleaseAuthorized: frozenLedger.authorityBoundary.publicReleaseAuthorized,
    releaseReady: frozenLedger.authorityBoundary.releaseReady,
    requirementsUniverseClosed:
      frozenLedger.requirementsUniverse.requirementsUniverseClosed,
    rightsBundleComplete: frozenLedger.gateSummary.rightsBundleComplete,
    sourceBundleComplete: frozenLedger.gateSummary.sourceBundleComplete,
    status: frozenLedger.status,
    subjectCount: frozenLedger.subjects.length
  });
}

export async function readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    {
      invalidCode: "LEDGER_ENDPOINT_INVALID",
      label: "吠陀来源与三层权利要求账",
      missingCode: "LEDGER_MISSING"
    }
  );
  const ledger = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(ledger)
      !== strictUtf8(snapshot.bytes, "吠陀来源与三层权利要求账")) {
    fail("JSON_NON_CANONICAL", "吠陀来源与三层权利要求账不是 canonical pretty JSON。");
  }
  const result = await verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, ledger);
  return result.ledger;
}

export const vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly = Object.freeze({
  CHAIN_ORDER,
  DIGEST_DOMAIN,
  FACT_REQUIREMENT_IDS,
  INPUT_REQUIREMENT_IDS,
  MAX_BOUND_ARTIFACT_BYTES,
  MAX_LEDGER_BYTES,
  RULE_REQUIREMENT_IDS,
  SUBJECTS,
  safeWorkspaceFile
});
