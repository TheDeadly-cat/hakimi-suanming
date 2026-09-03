import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parse, parseExpression } from "@babel/parser";
import {
  verifyBaziBindingFreezeRequirements
} from "./bazi-binding-freeze-requirements-lib.mjs";
import {
  verifyBaziEngineeringBindingCandidateLedger
} from "./bazi-engineering-binding-candidate-lib.mjs";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";

export const BAZI_PR10BC_SCOPE_RECONCILIATION_RELATIVE_PATH =
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json";

const SOURCE_CANDIDATE_LEDGER_RELATIVE_PATH =
  "content/bazi-strength-source-binding-candidates.v1.json";
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_LEDGER_BYTES = 512 * 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const ENGINEERING_BINDING_IDS = Object.freeze([
  "binding:core:derive-assessment",
  "binding:policy:factor-inclusion",
  "binding:policy:direction-map",
  "binding:policy:weights",
  "binding:policy:month-duplication",
  "binding:policy:thresholds",
  "binding:sensitivity:six-scenarios"
]);

const CURRENT_BINDING_IDS = Object.freeze([
  ...ENGINEERING_BINDING_IDS,
  "binding:dtt:month-command",
  "binding:smt-v5:relative-relations",
  "binding:smt-v10:whole-chart",
  "binding:yhzp:hidden-listing",
  "binding:zpzz:review-gates"
]);

const HISTORICAL_CANDIDATE_IDENTITIES = Object.freeze({
  relativeRelations: Object.freeze({
    candidateId: "smt-v5-wikisource-r2706483-candidate-v1",
    bindingId: "binding:smt-v5:relative-relations",
    quoteCandidateIds: Object.freeze(["smt-v5-relative-relations-minimal-v1"]),
    relationBoundary: "adjacent_relative_relations_text_candidate_not_season_table"
  }),
  monthCommandContext: Object.freeze({
    candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
    bindingId: "binding:dtt:month-command",
    quoteCandidateIds: Object.freeze(["dtt-yueling-minimal-v1"]),
    relationBoundary: "adjacent_month_command_text_candidate_not_season_relation_table"
  }),
  rootingPassage: Object.freeze({
    candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
    bindingId: "binding:dtt:month-command",
    quoteCandidateIds: Object.freeze(["dtt-rooting-minimal-v1"]),
    relationBoundary: "adjacent_rooting_passage_candidate_not_rooting_rule_table"
  }),
  hiddenListing: Object.freeze({
    candidateId: "yhzp-wikisource-r2593607-candidate-v1",
    bindingId: "binding:yhzp:hidden-listing",
    quoteCandidateIds: Object.freeze(["yhzp-hidden-stem-listing-minimal-v1"]),
    relationBoundary: "adjacent_hidden_stem_listing_candidate_not_rooting_strength_table"
  }),
  wholeChart: Object.freeze({
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
    bindingId: "binding:smt-v10:whole-chart",
    quoteCandidateIds: Object.freeze(["smt-v10-tougan-minimal-v1"]),
    relationBoundary: "adjacent_stem_exposure_passage_candidate_not_tougan_rule_table"
  }),
  wholeChartContext: Object.freeze({
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
    bindingId: "binding:smt-v10:whole-chart",
    quoteCandidateIds: Object.freeze(["smt-v10-yueling-minimal-v1"]),
    relationBoundary: "adjacent_whole_chart_text_candidate_not_season_relation_table"
  })
});

const ARTIFACT_DEFINITIONS = Object.freeze([
  Object.freeze({
    path: "packages/bazi-interpretation/src/strength-assessment-core.ts",
    role: "scoped_engineering_producer",
    stableSymbols: Object.freeze([
      "const GENERATED_ELEMENT",
      "const CONTROLLED_ELEMENT",
      "export function strengthElementRelation(",
      "export function collectBaziStrengthFactors(",
      "export function deriveBaziStrengthAssessment(",
      "group: \"visible_stem\"",
      "strengthFactorWeight(\"visible_stem\")",
      "const month = facts.pillars.month",
      "const monthMainTenGod = month.branchTenGods[0]",
      "const monthMainStem = month.hiddenStems[0]",
      "group: \"month_command\"",
      "position: \"month\"",
      "strengthFactorWeight(\"month_command\")",
      "pillar.hiddenStems.forEach",
      "strengthFactorWeight(\"hidden_stem\", index)",
      "const supportWeight = factors",
      "const demandWeight = factors",
      "const supportRatio = total === 0 ? null : supportWeight / total"
    ])
  }),
  Object.freeze({
    path: "packages/bazi-interpretation/src/strength-policy.ts",
    role: "scoped_engineering_policy",
    stableSymbols: Object.freeze([
      "export const BAZI_STRENGTH_FACTOR_WEIGHTS",
      "export const BAZI_STRENGTH_BAND_THRESHOLDS",
      "export function strengthFactorWeight(",
      "hiddenStemIndex: number | null = null",
      "export function classifyStrengthBand("
    ])
  }),
  Object.freeze({
    path: "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
    role: "scoped_engineering_sensitivity_producer",
    stableSymbols: Object.freeze([
      "export const BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE",
      "export function validateStrengthSensitivityReview(",
      "export function buildStrengthSensitivityReview("
    ])
  }),
  Object.freeze({
    path: "packages/bazi-core/src/index.ts",
    role: "scoped_runtime_fact_producer_not_admission",
    stableSymbols: Object.freeze([
      "function buildPillar(",
      "LunarUtil.ZHI_HIDE_GAN",
      "field: `${prefix}.hiddenStems`",
      "verificationStatus: \"experimental\" as const"
    ])
  }),
  Object.freeze({
    path: "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
    role: "scoped_score_projection_consumer",
    stableSymbols: Object.freeze([
      "const recomputedSupportWeight",
      "const recomputedDemandWeight",
      "const recomputedSupportRatio",
      "分类小计无法由逐项证据贡献独立复算。"
    ])
  }),
  Object.freeze({
    path: "packages/bazi-interpretation/src/strength-claim-registry.ts",
    role: "current_binding_registry_inventory_source",
    stableSymbols: Object.freeze([
      "const sourceBindings: readonly BaziStrengthClaimSourceBinding[] = Object.freeze([",
      "export const BAZI_STRENGTH_CLAIM_REGISTRY: BaziStrengthClaimRegistry = Object.freeze({"
    ])
  })
]);

const BASIS_ARTIFACT_PATHS = Object.freeze([
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  SOURCE_CANDIDATE_LEDGER_RELATIVE_PATH
]);

function ref(pathValue, stableSymbols, observationBoundary) {
  return Object.freeze({
    path: pathValue,
    stableSymbols: Object.freeze([...stableSymbols]),
    observationBoundary
  });
}

function adjacentCandidate(identity) {
  return Object.freeze({
    ...identity,
    quoteCandidateIds: Object.freeze([...identity.quoteCandidateIds])
  });
}

const SCORE_PRODUCER_REFS = Object.freeze([
  ref(
    "packages/bazi-interpretation/src/strength-assessment-core.ts",
    ["collectBaziStrengthFactors", "deriveBaziStrengthAssessment", "supportWeight", "demandWeight", "supportRatio"],
    "current_support_demand_ratio_and_band_engineering_projection"
  ),
  ref(
    "packages/bazi-interpretation/src/strength-policy.ts",
    ["BAZI_STRENGTH_FACTOR_WEIGHTS", "BAZI_STRENGTH_BAND_THRESHOLDS", "strengthFactorWeight", "classifyStrengthBand"],
    "current_engineering_candidate_weights_thresholds_and_classification"
  ),
  ref(
    "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
    ["BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE", "buildStrengthSensitivityReview"],
    "six_scenario_engineering_sensitivity_projection"
  )
]);

const SCORE_CONSUMER_REFS = Object.freeze([
  ref(
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
    ["recomputedSupportWeight", "recomputedDemandWeight", "recomputedSupportRatio"],
    "web_source_recomputes_engineering_projection_not_browser_runtime_evidence"
  )
]);

const TABLE_EVIDENCE_REQUIREMENTS = Object.freeze([
  "explicit_rule_model_and_scope",
  "per_value_source_or_first_party_derivation_provenance",
  "work_edition_and_carrier_identity",
  "work_edition_and_carrier_rights_evidence",
  "two_independent_domain_opinions"
]);

const SCORE_REVIEW_REQUIREMENTS = Object.freeze([
  "first_class_score_semantics_contract",
  "engineering_review",
  "two_independent_domain_opinions",
  "supersession_chain",
  "applicable_rights_evidence"
]);

function concept(input) {
  return Object.freeze({
    topicId: input.topicId,
    originalTopicOrder: input.originalTopicOrder,
    recommendedBatchOrder: input.recommendedBatchOrder,
    recommendedBatch: input.recommendedBatch,
    mappingState: input.mappingState,
    currentBindingIds: Object.freeze([...(input.currentBindingIds ?? [])]),
    nearestNonEquivalentBindingIds: Object.freeze([...(input.nearestNonEquivalentBindingIds ?? [])]),
    adjacentHistoricalCandidates: Object.freeze(
      (input.adjacentHistoricalCandidates ?? []).map(adjacentCandidate)
    ),
    observedProducerRefs: Object.freeze([...(input.observedProducerRefs ?? [])]),
    observedConsumerRefs: Object.freeze([...(input.observedConsumerRefs ?? [])]),
    originClassification: input.originClassification,
    scoreMeaning: input.scoreMeaning ?? null,
    authorityBoundary: input.authorityBoundary,
    externalEvidenceRequired: Object.freeze([...input.externalEvidenceRequired]),
    dedicatedCurrentBindingExists: false,
    dedicatedRuleTableOrScoreMeaningFieldObservedInScopedArtifacts: false,
    formalScoringAllowed: false,
    parallelBindingCreated: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    bindingFreezeEffect: "none"
  });
}

export const BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS = Object.freeze([
  concept({
    topicId: "support.season_production",
    originalTopicOrder: 6,
    recommendedBatchOrder: 4,
    recommendedBatch: "PR10B_rule_tables_and_season_relations",
    mappingState: "underdefined_generic_relation_and_month_command_pipeline_observed_not_season_table",
    nearestNonEquivalentBindingIds: [
      "binding:core:derive-assessment",
      "binding:policy:factor-inclusion",
      "binding:policy:direction-map",
      "binding:policy:weights",
      "binding:policy:month-duplication"
    ],
    adjacentHistoricalCandidates: [
      HISTORICAL_CANDIDATE_IDENTITIES.relativeRelations,
      HISTORICAL_CANDIDATE_IDENTITIES.monthCommandContext,
      HISTORICAL_CANDIDATE_IDENTITIES.wholeChartContext
    ],
    observedProducerRefs: [
      ref(
        "packages/bazi-interpretation/src/strength-assessment-core.ts",
        ["GENERATED_ELEMENT", "strengthElementRelation"],
        "generic_five_element_relation_function_has_no_season_dimension"
      ),
      ref(
        "packages/bazi-interpretation/src/strength-assessment-core.ts",
        ["const month = facts.pillars.month", "group: \"month_command\"", "position: \"month\"", "strengthFactorWeight(\"month_command\")"],
        "non_equivalent_month_command_engineering_pipeline_exists_but_is_not_season_production_table"
      )
    ],
    originClassification: "underdefined_audit_concept_with_generic_relation_and_month_command_engineering_pipeline",
    authorityBoundary: "no_season_specific_production_table_or_dedicated_binding_observed_in_scoped_artifacts",
    externalEvidenceRequired: TABLE_EVIDENCE_REQUIREMENTS
  }),
  concept({
    topicId: "support.season_control",
    originalTopicOrder: 7,
    recommendedBatchOrder: 5,
    recommendedBatch: "PR10B_rule_tables_and_season_relations",
    mappingState: "underdefined_generic_relation_and_month_command_pipeline_observed_not_season_table",
    nearestNonEquivalentBindingIds: [
      "binding:core:derive-assessment",
      "binding:policy:factor-inclusion",
      "binding:policy:direction-map",
      "binding:policy:weights",
      "binding:policy:month-duplication"
    ],
    adjacentHistoricalCandidates: [
      HISTORICAL_CANDIDATE_IDENTITIES.relativeRelations,
      HISTORICAL_CANDIDATE_IDENTITIES.monthCommandContext,
      HISTORICAL_CANDIDATE_IDENTITIES.wholeChartContext
    ],
    observedProducerRefs: [
      ref(
        "packages/bazi-interpretation/src/strength-assessment-core.ts",
        ["CONTROLLED_ELEMENT", "strengthElementRelation"],
        "generic_five_element_relation_function_has_no_season_dimension"
      ),
      ref(
        "packages/bazi-interpretation/src/strength-assessment-core.ts",
        ["const month = facts.pillars.month", "group: \"month_command\"", "position: \"month\"", "strengthFactorWeight(\"month_command\")"],
        "non_equivalent_month_command_engineering_pipeline_exists_but_is_not_season_control_table"
      )
    ],
    originClassification: "underdefined_audit_concept_with_generic_relation_and_month_command_engineering_pipeline",
    authorityBoundary: "no_season_specific_control_table_or_dedicated_binding_observed_in_scoped_artifacts",
    externalEvidenceRequired: TABLE_EVIDENCE_REQUIREMENTS
  }),
  concept({
    topicId: "support.season_storage",
    originalTopicOrder: 8,
    recommendedBatchOrder: 6,
    recommendedBatch: "PR10B_rule_tables_and_season_relations",
    mappingState: "not_registered_no_scoped_producer_observed",
    originClassification: "unregistered_audit_concept",
    authorityBoundary: "no_storage_rule_table_binding_or_scoped_producer_observed",
    externalEvidenceRequired: TABLE_EVIDENCE_REQUIREMENTS
  }),
  concept({
    topicId: "support.rooting_tables",
    originalTopicOrder: 9,
    recommendedBatchOrder: 7,
    recommendedBatch: "PR10B_rule_tables_and_season_relations",
    mappingState: "runtime_hidden_stem_fact_and_adjacent_text_only_not_rooting_table",
    nearestNonEquivalentBindingIds: ["binding:policy:weights"],
    adjacentHistoricalCandidates: [
      HISTORICAL_CANDIDATE_IDENTITIES.rootingPassage,
      HISTORICAL_CANDIDATE_IDENTITIES.hiddenListing
    ],
    observedProducerRefs: [
      ref(
        "packages/bazi-core/src/index.ts",
        ["buildPillar", "LunarUtil.ZHI_HIDE_GAN", "field: `${prefix}.hiddenStems`"],
        "experimental_hidden_stem_fact_derivation_not_rooting_strength_table"
      ),
      ref(
        "packages/bazi-interpretation/src/strength-assessment-core.ts",
        ["pillar.hiddenStems.forEach", "strengthFactorWeight(\"hidden_stem\", index)"],
        "hidden_stem_index_weight_consumption_not_rooting_rule_table"
      )
    ],
    originClassification: "unregistered_audit_concept_with_non_equivalent_runtime_fact",
    authorityBoundary: "hidden_stem_listing_and_index_weight_do_not_establish_rooting_strength",
    externalEvidenceRequired: TABLE_EVIDENCE_REQUIREMENTS
  }),
  concept({
    topicId: "support.tougan_tables",
    originalTopicOrder: 10,
    recommendedBatchOrder: 8,
    recommendedBatch: "PR10B_rule_tables_and_season_relations",
    mappingState: "visible_stem_presence_and_adjacent_text_only_not_tougan_table",
    nearestNonEquivalentBindingIds: ["binding:policy:factor-inclusion"],
    adjacentHistoricalCandidates: [HISTORICAL_CANDIDATE_IDENTITIES.wholeChart],
    observedProducerRefs: [ref(
      "packages/bazi-interpretation/src/strength-assessment-core.ts",
      ["group: \"visible_stem\"", "strengthFactorWeight(\"visible_stem\")"],
      "visible_stem_presence_weighting_not_tougan_rule_or_grade_table"
    )],
    originClassification: "unregistered_audit_concept_with_non_equivalent_visible_fact",
    authorityBoundary: "visible_stem_presence_does_not_establish_tougan_rule_table",
    externalEvidenceRequired: TABLE_EVIDENCE_REQUIREMENTS
  }),
  concept({
    topicId: "strength.zhushou_position_decay",
    originalTopicOrder: 4,
    recommendedBatchOrder: 9,
    recommendedBatch: "PR10C_engineering_heuristics_and_score_semantics",
    mappingState: "ambiguous_hidden_stem_index_weight_is_not_pillar_position_decay",
    nearestNonEquivalentBindingIds: ["binding:policy:weights"],
    observedProducerRefs: [ref(
      "packages/bazi-interpretation/src/strength-policy.ts",
      ["strengthFactorWeight", "hiddenStemIndex"],
      "hidden_stem_list_index_changes_weight_but_no_pillar_position_argument_exists"
    )],
    originClassification: "undefined_audit_concept_not_current_engineering_binding",
    authorityBoundary: "position_dimension_and_decay_semantics_must_be_defined_before_mapping",
    externalEvidenceRequired: [
      "human_definition_of_position_dimension",
      "explicit_decay_rule_and_coefficients",
      ...SCORE_REVIEW_REQUIREMENTS
    ]
  }),
  concept({
    topicId: "strength.score_observation_only",
    originalTopicOrder: 5,
    recommendedBatchOrder: 10,
    recommendedBatch: "PR10C_engineering_heuristics_and_score_semantics",
    mappingState: "mapped_to_existing_engineering_candidates_no_dedicated_score_meaning_field",
    currentBindingIds: ENGINEERING_BINDING_IDS,
    observedProducerRefs: SCORE_PRODUCER_REFS,
    observedConsumerRefs: SCORE_CONSUMER_REFS,
    originClassification: "project_engineering_heuristic_candidate_projection",
    scoreMeaning: "observational_engineering_candidate_only",
    authorityBoundary: "engineering_observation_only_no_classical_expert_scientific_or_predictive_authority",
    externalEvidenceRequired: SCORE_REVIEW_REQUIREMENTS
  }),
  concept({
    topicId: "support.position_decay",
    originalTopicOrder: 11,
    recommendedBatchOrder: 11,
    recommendedBatch: "PR10C_engineering_heuristics_and_score_semantics",
    mappingState: "ambiguous_hidden_stem_index_weight_is_not_pillar_position_decay",
    nearestNonEquivalentBindingIds: ["binding:policy:weights"],
    observedProducerRefs: [ref(
      "packages/bazi-interpretation/src/strength-policy.ts",
      ["strengthFactorWeight", "hiddenStemIndex"],
      "hidden_stem_list_index_changes_weight_but_no_pillar_position_argument_exists"
    )],
    originClassification: "undefined_audit_concept_not_current_engineering_binding",
    authorityBoundary: "position_dimension_and_decay_semantics_must_be_defined_before_mapping",
    externalEvidenceRequired: [
      "human_definition_of_position_dimension",
      "explicit_decay_rule_and_coefficients",
      ...SCORE_REVIEW_REQUIREMENTS
    ]
  }),
  concept({
    topicId: "support.score_semantics",
    originalTopicOrder: 12,
    recommendedBatchOrder: 12,
    recommendedBatch: "PR10C_engineering_heuristics_and_score_semantics",
    mappingState: "mapped_to_existing_engineering_candidates_no_dedicated_score_meaning_field",
    currentBindingIds: ENGINEERING_BINDING_IDS,
    observedProducerRefs: SCORE_PRODUCER_REFS,
    observedConsumerRefs: SCORE_CONSUMER_REFS,
    originClassification: "project_engineering_heuristic_candidate_projection",
    scoreMeaning: "observational_engineering_candidate_only",
    authorityBoundary: "engineering_observation_only_no_classical_expert_scientific_or_predictive_authority",
    externalEvidenceRequired: SCORE_REVIEW_REQUIREMENTS
  })
]);

export class BaziPr10bcScopeReconciliationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "BaziPr10bcScopeReconciliationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziPr10bcScopeReconciliationError(code, message);
}

function canonicalValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])
  );
}

export function canonicalStringifyBaziPr10bcScopeReconciliation(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeBaziPr10bcScopeReconciliationDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return createHash("sha256")
    .update(canonicalStringifyBaziPr10bcScopeReconciliation(unsigned), "utf8")
    .digest("hex");
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail("UNSAFE_PATH", `PR10B/PR10C 对账路径不安全：${relativePath}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function readBoundFile(workspaceRoot, relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspaceFile(root, relativePath);
  let actual;
  let metadata;
  try {
    [actual, metadata] = await Promise.all([realpath(absolute), stat(absolute)]);
  } catch (cause) {
    throw new BaziPr10bcScopeReconciliationError(
      "ARTIFACT_MISSING",
      `PR10B/PR10C 对账文件不存在：${relativePath}`,
      { cause }
    );
  }
  const relative = path.relative(root, actual);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
    || !metadata.isFile()
    || metadata.size <= 0
    || metadata.size > maxBytes
  ) {
    fail("UNSAFE_PATH", `PR10B/PR10C 对账目标不是工作区内普通小文件：${relativePath}`);
  }
  return Object.freeze({ bytes: await readFile(actual), metadata });
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new WeakSet();
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

export function parseBaziPr10bcScopeReconciliationJsonBytes(bytes, label = "PR10B/PR10C 对账 JSON") {
  if (!(bytes instanceof Uint8Array)) fail("LEDGER_INVALID", `${label} 必须是字节。`);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("LEDGER_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new BaziPr10bcScopeReconciliationError(
      "LEDGER_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
  if (!source.trim()) fail("LEDGER_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "bazi-pr10bc-scope-reconciliation.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new BaziPr10bcScopeReconciliationError(
      "LEDGER_INVALID",
      `${label} 不能按严格 JSON 检查。`,
      { cause }
    );
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("LEDGER_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) {
        fail("LEDGER_DUPLICATE_KEY", `${label} 含重复对象键。`);
      }
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("LEDGER_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziPr10bcScopeReconciliationError) throw cause;
    throw new BaziPr10bcScopeReconciliationError(
      "LEDGER_INVALID",
      `${label} 不是有效 JSON。`,
      { cause }
    );
  }
}

function parseLedger(bytes, label) {
  return parseBaziPr10bcScopeReconciliationJsonBytes(bytes, label);
}

function exactStringSet(actual, expected, label) {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (canonicalStringifyBaziPr10bcScopeReconciliation(normalizedActual)
    !== canonicalStringifyBaziPr10bcScopeReconciliation(normalizedExpected)) {
    fail("INVENTORY_DRIFT", `${label} 与当前对账定义不一致。`);
  }
}

export function extractExactCurrentBaziStrengthBindingIds(registrySource) {
  if (typeof registrySource !== "string" || registrySource.length === 0) {
    fail("REGISTRY_INVENTORY_DRIFT", "旺衰 claim registry 源码必须是非空字符串。");
  }
  let fileAst;
  try {
    fileAst = parse(registrySource, {
      sourceFilename: "strength-claim-registry.ts",
      sourceType: "module",
      errorRecovery: false,
      attachComment: false,
      plugins: ["typescript"]
    });
  } catch (cause) {
    throw new BaziPr10bcScopeReconciliationError(
      "REGISTRY_INVENTORY_DRIFT",
      "旺衰 claim registry 不能按 TypeScript AST 解析。",
      { cause }
    );
  }
  const declarations = [];
  walkAst(fileAst, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === "sourceBindings") {
      declarations.push(node);
    }
  });
  if (declarations.length !== 1) {
    fail("REGISTRY_INVENTORY_DRIFT", "旺衰 claim registry 必须精确声明一次 sourceBindings。");
  }
  const initializer = declarations[0].init;
  const array = initializer?.type === "CallExpression"
    && initializer.callee?.type === "MemberExpression"
    && initializer.callee.computed === false
    && initializer.callee.object?.type === "Identifier"
    && initializer.callee.object.name === "Object"
    && initializer.callee.property?.type === "Identifier"
    && initializer.callee.property.name === "freeze"
    && initializer.arguments.length === 1
    && initializer.arguments[0]?.type === "ArrayExpression"
    ? initializer.arguments[0]
    : null;
  if (!array || array.elements.length !== CURRENT_BINDING_IDS.length || array.elements.some((element) => !element)) {
    fail("REGISTRY_INVENTORY_DRIFT", "旺衰 sourceBindings 必须是精确 12 项 Object.freeze 数组。");
  }
  const bindingIds = array.elements.map((element) => {
    const object = element?.type === "CallExpression"
      && element.callee?.type === "MemberExpression"
      && element.callee.computed === false
      && element.callee.object?.type === "Identifier"
      && element.callee.object.name === "Object"
      && element.callee.property?.type === "Identifier"
      && element.callee.property.name === "freeze"
      && element.arguments.length === 1
      && element.arguments[0]?.type === "ObjectExpression"
      ? element.arguments[0]
      : null;
    if (!object) fail("REGISTRY_INVENTORY_DRIFT", "旺衰 sourceBindings 含非 Object.freeze 对象项。");
    const propertyKeys = new Set();
    for (const property of object.properties) {
      const key = property.type === "ObjectProperty"
        && property.computed === false
        && property.key?.type === "Identifier"
        ? property.key.name
        : property.type === "ObjectProperty"
          && property.computed === false
          && property.key?.type === "StringLiteral"
          ? property.key.value
          : null;
      if (key === null || propertyKeys.has(key)) {
        fail(
          "REGISTRY_INVENTORY_DRIFT",
          "旺衰 sourceBindings 每项只允许唯一、直接、非计算 ObjectProperty，禁止 spread／method／重复覆盖。"
        );
      }
      propertyKeys.add(key);
    }
    const bindingProperties = object.properties.filter((property) =>
      property.type === "ObjectProperty"
      && property.computed === false
      && ((property.key?.type === "Identifier" && property.key.name === "bindingId")
        || (property.key?.type === "StringLiteral" && property.key.value === "bindingId"))
    );
    if (bindingProperties.length !== 1 || bindingProperties[0].value?.type !== "StringLiteral") {
      fail("REGISTRY_INVENTORY_DRIFT", "旺衰 sourceBindings 每项必须有唯一 literal bindingId。");
    }
    return bindingProperties[0].value.value;
  });
  if (
    canonicalStringifyBaziPr10bcScopeReconciliation(bindingIds)
    !== canonicalStringifyBaziPr10bcScopeReconciliation(CURRENT_BINDING_IDS)
  ) {
    fail("REGISTRY_INVENTORY_DRIFT", "旺衰 sourceBindings 不是当前精确 12 条有序枚举。");
  }
  return Object.freeze(bindingIds);
}

function validateDefinitions() {
  if (BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS.length !== 9) {
    fail("DEFINITION_DRIFT", "PR10B/PR10C 对账定义必须精确包含九个旧深审概念。");
  }
  const topicIds = new Set();
  const originalOrders = new Set();
  for (const [index, entry] of BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS.entries()) {
    if (
      entry.recommendedBatchOrder !== index + 4
      || !Number.isInteger(entry.originalTopicOrder)
      || entry.originalTopicOrder < 4
      || entry.originalTopicOrder > 12
      || originalOrders.has(entry.originalTopicOrder)
      || topicIds.has(entry.topicId)
    ) {
      fail("DEFINITION_DRIFT", "PR10B/PR10C 对账主题顺序或身份重复。");
    }
    topicIds.add(entry.topicId);
    originalOrders.add(entry.originalTopicOrder);
    if (
      entry.dedicatedCurrentBindingExists !== false
      || entry.dedicatedRuleTableOrScoreMeaningFieldObservedInScopedArtifacts !== false
      || entry.formalScoringAllowed !== false
      || entry.parallelBindingCreated !== false
      || entry.contentTruthEstablished !== false
      || entry.expertTruthEstablished !== false
      || entry.rightsLegalConclusionEstablished !== false
      || entry.bindingFreezeEffect !== "none"
    ) {
      fail("DEFINITION_DRIFT", `${entry.topicId} 违反失败关闭对账边界。`);
    }
  }
  exactStringSet(originalOrders, [4, 5, 6, 7, 8, 9, 10, 11, 12], "旧深审原始主题顺序");
}

function buildBasisArtifact(relativePath, file) {
  return Object.freeze({
    path: relativePath,
    bytes: file.metadata.size,
    sha256: createHash("sha256").update(file.bytes).digest("hex")
  });
}

function buildArtifactObservation(definition, file) {
  const source = file.bytes.toString("utf8");
  for (const symbol of definition.stableSymbols) {
    if (!source.includes(symbol)) {
      fail("STABLE_SYMBOL_DRIFT", `${definition.path} 缺少对账稳定符号：${symbol}`);
    }
  }
  return Object.freeze({
    path: definition.path,
    role: definition.role,
    bytes: file.metadata.size,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    stableSymbols: Object.freeze([...definition.stableSymbols]),
    admissionEffect: "none"
  });
}

function validateScopedAbsences(artifactSources) {
  const scopedSource = ARTIFACT_DEFINITIONS
    .filter((entry) => entry.role.startsWith("scoped_"))
    .map((entry) => artifactSources.get(entry.path))
    .join("\n");
  for (const forbidden of [
    "seasonProduction",
    "seasonControl",
    "seasonStorage",
    "rootingTable",
    "touganTable",
    "positionDecay",
    "zhushouPositionDecay",
    "scoreMeaning"
  ]) {
    if (scopedSource.toLowerCase().includes(forbidden.toLowerCase())) {
      fail("SCOPED_CONCEPT_DRIFT", `scoped producer/consumer 新增了待对账字段：${forbidden}`);
    }
  }

  const assessment = artifactSources.get("packages/bazi-interpretation/src/strength-assessment-core.ts");
  const relationStart = assessment.indexOf("export function strengthElementRelation(");
  const relationEnd = assessment.indexOf("export function expectedElementRelationForTenGodGroup", relationStart);
  const relationBlock = assessment.slice(relationStart, relationEnd);
  if (relationStart < 0 || relationEnd <= relationStart || /season|month|jieqi/iu.test(relationBlock)) {
    fail("SCOPED_CONCEPT_DRIFT", "五行关系函数不再是无季节维度的通用关系。");
  }

  const policy = artifactSources.get("packages/bazi-interpretation/src/strength-policy.ts");
  const weightStart = policy.indexOf("export function strengthFactorWeight(");
  const weightEnd = policy.indexOf("export function classifyStrengthBand(", weightStart);
  const weightBlock = policy.slice(weightStart, weightEnd);
  if (
    weightStart < 0
    || weightEnd <= weightStart
    || !weightBlock.includes("hiddenStemIndex")
    || /pillarPosition|positionDecay|yearPosition|monthPosition|dayPosition|hourPosition/iu.test(weightBlock)
  ) {
    fail("SCOPED_CONCEPT_DRIFT", "当前权重函数不再满足“藏干索引而非柱位衰减”的对账观察。");
  }
}

function validateConceptReferences(
  freezeLedger,
  engineeringLedger,
  sourceLedger,
  artifactObservations,
  registryBindingIds
) {
  const bindingIds = new Set(freezeLedger.bindings.map((entry) => entry.bindingId));
  const engineeringBindingIds = new Set(engineeringLedger.candidates.map((entry) => entry.bindingId));
  const sourceCandidateById = new Map(sourceLedger.candidates.map((entry) => [entry.candidateId, entry]));
  const artifactByPath = new Map(artifactObservations.map((entry) => [entry.path, entry]));
  const topicIds = new Set(BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS.map((entry) => entry.topicId));

  if ([...topicIds].some((topicId) => bindingIds.has(topicId))) {
    fail("INVENTORY_DRIFT", "旧深审概念被误当作当前 binding ID。");
  }
  if (
    canonicalStringifyBaziPr10bcScopeReconciliation(freezeLedger.bindings.map((entry) => entry.bindingId))
    !== canonicalStringifyBaziPr10bcScopeReconciliation(registryBindingIds)
  ) {
    fail("INVENTORY_DRIFT", "readiness binding 顺序与 claim registry 的 sourceBindings 精确枚举不一致。");
  }
  exactStringSet(engineeringBindingIds, ENGINEERING_BINDING_IDS, "七条工程 binding");

  for (const entry of BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS) {
    for (const bindingId of [...entry.currentBindingIds, ...entry.nearestNonEquivalentBindingIds]) {
      if (!bindingIds.has(bindingId)) fail("REFERENCE_DRIFT", `${entry.topicId} 引用了不存在的 binding：${bindingId}`);
    }
    for (const bindingId of entry.currentBindingIds) {
      if (!engineeringBindingIds.has(bindingId)) {
        fail("REFERENCE_DRIFT", `${entry.topicId} 的 currentBindingIds 不是工程候选：${bindingId}`);
      }
    }
    for (const adjacent of entry.adjacentHistoricalCandidates) {
      const candidate = sourceCandidateById.get(adjacent.candidateId);
      if (!candidate || candidate.bindingId !== adjacent.bindingId || !bindingIds.has(adjacent.bindingId)) {
        fail("REFERENCE_DRIFT", `${entry.topicId} 的相邻历史候选身份漂移。`);
      }
      const candidateQuoteIds = new Set(candidate.quoteCandidates.map((quote) => quote.quoteCandidateId));
      if (
        adjacent.quoteCandidateIds.length === 0
        || adjacent.quoteCandidateIds.some((quoteCandidateId) => !candidateQuoteIds.has(quoteCandidateId))
        || candidate.rightsObservation.distributionDecision !== "link_only"
        || candidate.rightsObservation.legalConclusion !== "not_established"
        || candidate.reviewState.contentTruth !== "not_established"
      ) {
        fail("REFERENCE_DRIFT", `${entry.topicId} 的相邻 quote candidate 或 link-only 红线漂移。`);
      }
    }
    for (const observed of [...entry.observedProducerRefs, ...entry.observedConsumerRefs]) {
      const artifact = artifactByPath.get(observed.path);
      if (!artifact) fail("REFERENCE_DRIFT", `${entry.topicId} 引用了未锁定 artifact：${observed.path}`);
      for (const symbol of observed.stableSymbols) {
        if (!artifact.stableSymbols.some((locked) => locked.includes(symbol) || symbol.includes(locked))) {
          const definition = ARTIFACT_DEFINITIONS.find((item) => item.path === observed.path);
          if (!definition || !definition.stableSymbols.some((locked) => locked.includes(symbol) || symbol.includes(locked))) {
            fail("REFERENCE_DRIFT", `${entry.topicId} 的观察符号未受 artifact lock 约束：${symbol}`);
          }
        }
      }
    }
  }
}

export async function buildCurrentBaziPr10bcScopeReconciliation(workspaceRoot, options = {}) {
  validateDefinitions();

  const [basisFiles, artifactFiles] = await Promise.all([
    Promise.all(BASIS_ARTIFACT_PATHS.map(async (relativePath) => ({
      relativePath,
      file: await readBoundFile(workspaceRoot, relativePath, MAX_LEDGER_BYTES)
    }))),
    Promise.all(ARTIFACT_DEFINITIONS.map(async (definition) => ({
      definition,
      file: await readBoundFile(workspaceRoot, definition.path)
    })))
  ]);

  const basisFileByPath = new Map(
    basisFiles.map(({ relativePath, file }) => [relativePath, file])
  );
  const freezeLedger = parseLedger(
    basisFileByPath.get("content/system-admission/bazi-binding-freeze-requirements.v1.json").bytes,
    "八字 binding 冻结准备账"
  );
  const engineeringLedger = parseLedger(
    basisFileByPath.get("content/bazi-strength-engineering-binding-candidates.v1.json").bytes,
    "八字工程 binding 候选账"
  );
  const sourceLedger = parseLedger(
    basisFileByPath.get(SOURCE_CANDIDATE_LEDGER_RELATIVE_PATH).bytes,
    "八字来源候选账"
  );
  const basisArtifacts = basisFiles.map(({ relativePath, file }) =>
    buildBasisArtifact(relativePath, file)
  );
  await verifyBaziBindingFreezeRequirements(workspaceRoot, freezeLedger);
  await verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, engineeringLedger);
  verifyBaziSourceBindingCandidateLedger(sourceLedger);

  if (
    freezeLedger.gateSummary.bindingRequired !== 12
    || freezeLedger.gateSummary.projectEngineeringBindings !== 7
    || freezeLedger.gateSummary.historicalTextBindings !== 4
    || freezeLedger.gateSummary.reviewGateBindings !== 1
    || freezeLedger.gateSummary.bindingFrozenVerified !== 0
    || engineeringLedger.gateSummary.bindingsFrozen !== 0
    || sourceLedger.gateSummary.bindingFrozenVerified !== 0
  ) {
    fail("INVENTORY_DRIFT", "当前 7/4/1 binding 分账或 0/12 冻结边界已漂移。");
  }

  const artifactSources = new Map(
    artifactFiles.map(({ definition, file }) => [definition.path, file.bytes.toString("utf8")])
  );
  validateScopedAbsences(artifactSources);
  const registryBindingIds = extractExactCurrentBaziStrengthBindingIds(
    artifactSources.get("packages/bazi-interpretation/src/strength-claim-registry.ts")
  );
  const artifactObservations = artifactFiles.map(({ definition, file }) =>
    buildArtifactObservation(definition, file)
  );
  validateConceptReferences(
    freezeLedger,
    engineeringLedger,
    sourceLedger,
    artifactObservations,
    registryBindingIds
  );

  const currentBindingIds = registryBindingIds;
  const adjacentHistoricalBindingIds = new Set(
    BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS.flatMap((entry) =>
      entry.adjacentHistoricalCandidates.map((candidate) => candidate.bindingId)
    )
  );
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_pr10bc_scope_reconciliation_ledger",
    ledgerId: "hakimi.bazi.pr10bc.scope-reconciliation/1.0.0",
    status: "scope_reconciliation_only_no_binding_created",
    createdAt: options.createdAt ?? new Date().toISOString(),
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    scopeInput: {
      sourceClass: "user_supplied_second_deep_review_concepts_4_to_12",
      topicsReconciled: 9,
      interpretationBoundary: "old_audit_topic_ids_are_not_current_binding_ids",
      orderingBoundary: "deep_review_contains_conflicting_original_and_recommended_orders_reconciliation_uses_recommended_batch_order"
    },
    mappingAuthorityBoundary: {
      mappingProjectionClass: "repository_authored_scope_judgment_not_domain_truth",
      mappingProjectionMechanicallyReproduced: true,
      semanticEquivalenceMechanicallyEstablished: false,
      userSuppliedReviewAttachmentBytesBound: false,
      domainExpertMappingApproved: false
    },
    observationBoundary: {
      scopedSourceHashAndInspectionUseSameReadBuffer: true,
      basisArtifactHashAndParsedValidationUseSameReadBuffer: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    currentBindingInventory: {
      bindingIds: currentBindingIds,
      enumerationSource: "packages/bazi-interpretation/src/strength-claim-registry.ts#sourceBindings",
      exactRegisteredSourceBindings: 12,
      projectEngineeringBindings: 7,
      historicalTextBindings: 4,
      reviewGateBindings: 1,
      bindingsFrozenVerified: 0
    },
    basisArtifacts,
    artifactObservations,
    concepts: BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS,
    gateSummary: {
      scopeProjectionsReproduced: 9,
      exactCurrentBindingIdMatches: 0,
      pr10bRuleTableConcepts: 5,
      dedicatedRuleTablesObservedInScopedArtifacts: 0,
      repositoryWideRuleTableAbsenceEstablished: false,
      conceptsWithAdjacentHistoricalCandidates: 4,
      tableValueSourceBundlesComplete: 0,
      pr10cEngineeringSemanticConcepts: 4,
      conceptsMappedToExistingEngineeringBindings: 2,
      ambiguousPositionDecayConcepts: 2,
      firstClassScoreMeaningFieldsObservedInScopedArtifacts: 0,
      repositoryWideScoreMeaningAbsenceEstablished: false,
      semanticMappingsMechanicallyEstablished: 0,
      domainExpertMappingsApproved: 0,
      engineeringCandidateBindingsReferenced: ENGINEERING_BINDING_IDS.length,
      historicalCandidateBindingsReferencedAsAdjacentContext: adjacentHistoricalBindingIds.size,
      parallelBindingsCreated: 0,
      bindingFrozenVerified: 0,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "current_binding_inventories_artifact_hashes_stable_symbols_and_scoped_absences_mechanically_reconciled",
      browserRuntimeEvidence: "not_assessed_source_consumer_observation_only",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "new_binding_or_parallel_binding_identity",
      "rule_table_value_provenance",
      "position_decay_definition_or_implementation",
      "formal_score_semantics",
      "semantic_equivalence_between_audit_topics_and_current_bindings",
      "repository_wide_rule_table_or_alternate_identifier_absence",
      "source_body_or_exact_quote_text",
      "binding_frozen_verification",
      "classical_or_traditional_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "cross_file_atomic_snapshot",
      "interval_mutation_or_aba_exclusion",
      "central_release_manifest_closure",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeBaziPr10bcScopeReconciliationDigest(unsigned)
  });
}

export async function readBaziPr10bcScopeReconciliation(
  workspaceRoot,
  relativePath = BAZI_PR10BC_SCOPE_RECONCILIATION_RELATIVE_PATH
) {
  const file = await readBoundFile(workspaceRoot, relativePath, MAX_LEDGER_BYTES);
  return parseLedger(file.bytes, "PR10B/PR10C 概念范围对账账本");
}

export async function verifyBaziPr10bcScopeReconciliation(workspaceRoot, ledgerInput) {
  if (!ledgerInput || typeof ledgerInput !== "object" || Array.isArray(ledgerInput)) {
    fail("LEDGER_INVALID", "PR10B/PR10C 概念范围对账账本必须是 JSON 对象。");
  }
  if (
    typeof ledgerInput.createdAt !== "string"
    || !Number.isFinite(Date.parse(ledgerInput.createdAt))
    || !SHA256_PATTERN.test(ledgerInput.ledgerDigest ?? "")
  ) {
    fail("LEDGER_INVALID", "PR10B/PR10C 概念范围对账账本时间或摘要无效。");
  }
  const expected = await buildCurrentBaziPr10bcScopeReconciliation(workspaceRoot, {
    createdAt: ledgerInput.createdAt
  });
  if (
    canonicalStringifyBaziPr10bcScopeReconciliation(ledgerInput)
    !== canonicalStringifyBaziPr10bcScopeReconciliation(expected)
  ) {
    fail(
      "LEDGER_MISMATCH",
      "PR10B/PR10C 概念范围对账与当前 7/4/1 binding、scoped producer/consumer 或失败关闭状态不一致。"
    );
  }
  return Object.freeze({
    ledger: ledgerInput,
    ledgerDigest: ledgerInput.ledgerDigest,
    scopeProjectionsReproduced: ledgerInput.gateSummary.scopeProjectionsReproduced,
    parallelBindingsCreated: ledgerInput.gateSummary.parallelBindingsCreated,
    bindingsFrozen: ledgerInput.gateSummary.bindingFrozenVerified
  });
}
