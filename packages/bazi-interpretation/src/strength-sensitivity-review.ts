import {
  BAZI_STRENGTH_BAND_LABELS,
  classifyStrengthBand,
  type StrengthBand
} from "./strength-thresholds";
import type {
  BaziInterpretationResult,
  StrengthFactor,
  StrengthFactorDirection
} from "./index";
import {
  BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS,
  BAZI_STRENGTH_SENSITIVITY_SCENARIOS
} from "./strength-policy";
import type { StrengthSensitivityScenarioId as StrengthPolicyScenarioId } from "./strength-policy";

export const BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.strength_sensitivity_review/0.1.0",
  evidenceClass: "derived_engineering_sensitivity_audit" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  mutationPolicy: "read_only_projection" as const
});

export const STRENGTH_EXPERT_REVIEW_QUESTIONS = BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS;

export type StrengthSensitivityScenarioId = StrengthPolicyScenarioId;

export type StrengthSensitivityDirection =
  | "support_leading"
  | "demand_leading"
  | "balanced"
  | "undetermined";

export type StrengthSensitivityStability =
  | "stable_across_engineering_scenarios"
  | "band_sensitive"
  | "direction_sensitive"
  | "insufficient";

export interface StrengthSensitivityAppliedFactor {
  factorId: string;
  label: string;
  group: StrengthFactor["group"];
  direction: StrengthFactorDirection;
  sourceWeight: number;
  appliedWeight: number;
}

export interface StrengthSensitivityScenario {
  id: StrengthSensitivityScenarioId;
  label: string;
  purpose: string;
  role: "current_candidate_baseline" | "sensitivity_only";
  officialRuleCandidate: false;
  includedFactorIds: string[];
  excludedFactorIds: string[];
  appliedFactors: StrengthSensitivityAppliedFactor[];
  supportWeight: number;
  demandWeight: number;
  supportRatio: number | null;
  band: StrengthBand;
  bandLabel: string;
  broadDirection: StrengthSensitivityDirection;
  agreesWithBaselineBand: boolean;
  agreesWithBaselineDirection: boolean;
}

export interface StrengthSensitivityDuplicateDiagnostic {
  detected: boolean;
  monthCommandFactorId: string | null;
  monthHiddenMainFactorId: string | null;
  combinedSourceWeight: number | null;
  directSummary: string;
}

export interface StrengthSensitivityReview {
  profile: typeof BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE;
  baselineRulePackId: string;
  baselineRuleVersion: string;
  baselineBand: StrengthBand;
  baselineDirection: StrengthSensitivityDirection;
  duplicateMonthMain: StrengthSensitivityDuplicateDiagnostic;
  scenarios: StrengthSensitivityScenario[];
  distinctBands: StrengthBand[];
  distinctDirections: StrengthSensitivityDirection[];
  stability: StrengthSensitivityStability;
  stabilityLabel: string;
  directSummary: string;
  expertReviewQuestions: readonly string[];
  knownBoundaries: string[];
  sourceRefIds: string[];
  selectedOfficialScenarioId: null;
  expertStrengthVerdict: null;
  overallGoodBad: null;
  result: null;
}

const REVIEW_SOURCE_REF_IDS = ["dtt-strength", "smt-position", "yhzp-hidden-stems"] as const;

function broadDirection(supportWeight: number, demandWeight: number): StrengthSensitivityDirection {
  if (supportWeight + demandWeight === 0) return "undetermined";
  if (supportWeight === demandWeight) return "balanced";
  return supportWeight > demandWeight ? "support_leading" : "demand_leading";
}

function findDuplicateMonthMain(factors: readonly StrengthFactor[]): StrengthSensitivityDuplicateDiagnostic {
  const monthCommand = factors.find((factor) => factor.group === "month_command" && factor.position === "month") ?? null;
  const monthStem = monthCommand?.id.split(":")[2] ?? null;
  const expectedHiddenId = monthStem ? `hidden:month:${monthStem}:0` : null;
  const monthHiddenMain = expectedHiddenId
    ? factors.find((factor) => factor.id === expectedHiddenId && factor.group === "hidden_stem" && factor.direction === monthCommand?.direction) ?? null
    : null;
  const detected = monthCommand !== null && monthHiddenMain !== null;
  return {
    detected,
    monthCommandFactorId: monthCommand?.id ?? null,
    monthHiddenMainFactorId: monthHiddenMain?.id ?? null,
    combinedSourceWeight: detected ? monthCommand.weight + monthHiddenMain.weight : null,
    directSummary: detected
      ? `当前候选把同一月支主气分别计入月令项 ${monthCommand.weight} 权重和首位藏干项 ${monthHiddenMain.weight} 权重；去重场景用于观察这项假设是否改变结论。`
      : "当前事实中未检出可确认的月令主气与月支首位藏干重复项；去重场景仍保留，但不会凭空删除因素。"
  };
}

type StrengthSensitivityPolicyScenario = (typeof BAZI_STRENGTH_SENSITIVITY_SCENARIOS)[number];

function scenarioExcludesFactor(
  definition: StrengthSensitivityPolicyScenario,
  factor: StrengthFactor,
  duplicateHiddenId: string | null
): boolean {
  if (definition.operation === "deduplicate_month_main" || definition.operation === "equal_presence_deduplicated") {
    return factor.id === duplicateHiddenId;
  }
  if (definition.operation === "exclude_month_command") return factor.group === "month_command";
  if (definition.operation === "exclude_visible_stems") return factor.group === "visible_stem";
  if (definition.operation === "exclude_hidden_stems") return factor.group === "hidden_stem";
  return false;
}

function buildScenario(
  definition: StrengthSensitivityPolicyScenario,
  factors: readonly StrengthFactor[],
  duplicateHiddenId: string | null
): StrengthSensitivityScenario {
  const included = factors.filter((factor) => !scenarioExcludesFactor(definition, factor, duplicateHiddenId));
  const excluded = factors.filter((factor) => scenarioExcludesFactor(definition, factor, duplicateHiddenId));
  const appliedFactors = included.map((factor) => ({
    factorId: factor.id,
    label: factor.label,
    group: factor.group,
    direction: factor.direction,
    sourceWeight: factor.weight,
    appliedWeight: definition.operation === "equal_presence_deduplicated" ? 1 : factor.weight
  }));
  const supportWeight = appliedFactors
    .filter((factor) => factor.direction === "support")
    .reduce((sum, factor) => sum + factor.appliedWeight, 0);
  const demandWeight = appliedFactors
    .filter((factor) => factor.direction === "demand")
    .reduce((sum, factor) => sum + factor.appliedWeight, 0);
  const total = supportWeight + demandWeight;
  const band = classifyStrengthBand(supportWeight, demandWeight);
  return {
    id: definition.id,
    label: definition.label,
    purpose: definition.purpose,
    role: definition.role,
    officialRuleCandidate: false,
    includedFactorIds: included.map((factor) => factor.id),
    excludedFactorIds: excluded.map((factor) => factor.id),
    appliedFactors,
    supportWeight,
    demandWeight,
    supportRatio: total === 0 ? null : supportWeight / total,
    band,
    bandLabel: BAZI_STRENGTH_BAND_LABELS[band],
    broadDirection: broadDirection(supportWeight, demandWeight),
    agreesWithBaselineBand: false,
    agreesWithBaselineDirection: false
  };
}

function stabilityLabel(stability: StrengthSensitivityStability): string {
  if (stability === "stable_across_engineering_scenarios") return "工程扰动下稳定";
  if (stability === "band_sensitive") return "分档对工程假设敏感";
  if (stability === "direction_sensitive") return "支持/泄耗方向对工程假设敏感";
  return "因素不足，无法比较";
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function sameIdSet(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((id) => expected.includes(id));
}

export function validateStrengthSensitivityReview(
  review: StrengthSensitivityReview,
  interpretation: BaziInterpretationResult
): void {
  const factors = interpretation.strength.factors;
  const factorIds = factors.map((factor) => factor.id);
  if (new Set(factorIds).size !== factorIds.length) throw new Error("旺衰因素 ID 必须唯一");
  if (factors.some((factor) => !Number.isFinite(factor.weight) || factor.weight <= 0)) {
    throw new Error("旺衰因素权重必须是正有限数");
  }
  if (review.scenarios.length !== BAZI_STRENGTH_SENSITIVITY_SCENARIOS.length
    || new Set(review.scenarios.map((scenario) => scenario.id)).size !== BAZI_STRENGTH_SENSITIVITY_SCENARIOS.length
    || review.scenarios.some((scenario, index) => scenario.id !== BAZI_STRENGTH_SENSITIVITY_SCENARIOS[index]?.id)) {
    throw new Error("旺衰敏感性场景必须完整且唯一");
  }
  for (const sourceRefId of review.sourceRefIds) {
    if (!interpretation.sourceRefs.some((sourceRef) => sourceRef.id === sourceRefId)) {
      throw new Error(`旺衰敏感性来源不存在：${sourceRefId}`);
    }
  }
  for (const [index, scenario] of review.scenarios.entries()) {
    const policyScenario = BAZI_STRENGTH_SENSITIVITY_SCENARIOS[index];
    if (!policyScenario || scenario.label !== policyScenario.label || scenario.purpose !== policyScenario.purpose
      || scenario.role !== policyScenario.role) {
      throw new Error(`旺衰敏感性场景政策漂移：${scenario.id}`);
    }
    const covered = [...scenario.includedFactorIds, ...scenario.excludedFactorIds];
    if (new Set(covered).size !== covered.length || !sameIdSet(covered, factorIds)) {
      throw new Error(`旺衰敏感性场景因素覆盖不完整：${scenario.id}`);
    }
    if (!sameIdSet(scenario.appliedFactors.map((factor) => factor.factorId), scenario.includedFactorIds)) {
      throw new Error(`旺衰敏感性场景应用权重与纳入因素不一致：${scenario.id}`);
    }
    if (scenario.appliedFactors.some((factor) => !Number.isFinite(factor.appliedWeight) || factor.appliedWeight <= 0)) {
      throw new Error(`旺衰敏感性场景权重无效：${scenario.id}`);
    }
    const support = scenario.appliedFactors.filter((factor) => factor.direction === "support").reduce((sum, factor) => sum + factor.appliedWeight, 0);
    const demand = scenario.appliedFactors.filter((factor) => factor.direction === "demand").reduce((sum, factor) => sum + factor.appliedWeight, 0);
    if (support !== scenario.supportWeight || demand !== scenario.demandWeight || classifyStrengthBand(support, demand) !== scenario.band) {
      throw new Error(`旺衰敏感性场景汇总不一致：${scenario.id}`);
    }
    if (scenario.officialRuleCandidate !== false) throw new Error("敏感性场景不得自动成为正式规则");
  }
  const baseline = review.scenarios.find((scenario) => scenario.id === "baseline_current_candidate");
  if (!baseline || baseline.supportWeight !== interpretation.strength.supportWeight || baseline.demandWeight !== interpretation.strength.demandWeight || baseline.band !== interpretation.strength.band) {
    throw new Error("旺衰敏感性基线必须原样复现当前候选");
  }
  if (review.selectedOfficialScenarioId !== null || review.expertStrengthVerdict !== null || review.overallGoodBad !== null || review.result !== null) {
    throw new Error("旺衰敏感性审计不得签发专家结论或总体吉凶");
  }
}

export function buildStrengthSensitivityReview(
  interpretation: BaziInterpretationResult
): StrengthSensitivityReview {
  const factors = interpretation.strength.factors;
  const factorIds = factors.map((factor) => factor.id);
  if (new Set(factorIds).size !== factorIds.length) throw new Error("旺衰因素 ID 必须唯一");
  const duplicateMonthMain = findDuplicateMonthMain(factors);
  const scenarios = BAZI_STRENGTH_SENSITIVITY_SCENARIOS.map((definition) => buildScenario(
    definition,
    factors,
    duplicateMonthMain.monthHiddenMainFactorId
  ));
  const baseline = scenarios[0];
  if (!baseline) throw new Error("旺衰敏感性缺少基线场景");
  for (const scenario of scenarios) {
    scenario.agreesWithBaselineBand = scenario.band === baseline.band;
    scenario.agreesWithBaselineDirection = scenario.broadDirection === baseline.broadDirection;
  }
  const distinctBands = uniqueValues(scenarios.map((scenario) => scenario.band));
  const distinctDirections = uniqueValues(scenarios.map((scenario) => scenario.broadDirection));
  const stability: StrengthSensitivityStability = baseline.band === "undetermined"
    ? "insufficient"
    : distinctDirections.length > 1
      ? "direction_sensitive"
      : distinctBands.length > 1
        ? "band_sensitive"
        : "stable_across_engineering_scenarios";
  const label = stabilityLabel(stability);
  const review: StrengthSensitivityReview = {
    profile: BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE,
    baselineRulePackId: interpretation.profile.rulePackId,
    baselineRuleVersion: interpretation.profile.ruleVersion,
    baselineBand: baseline.band,
    baselineDirection: baseline.broadDirection,
    duplicateMonthMain,
    scenarios,
    distinctBands,
    distinctDirections,
    stability,
    stabilityLabel: label,
    directSummary: `当前候选为“${baseline.bandLabel}”。六个工程审计场景得到 ${distinctBands.length} 种分档、${distinctDirections.length} 种支持/泄耗方向，结论为“${label}”；这只说明模型对工程假设的敏感程度，不签发命理真值。`,
    expertReviewQuestions: STRENGTH_EXPERT_REVIEW_QUESTIONS,
    knownBoundaries: [
      "六个场景是工程扰动，不对应也不冒充任何命理门派。",
      "审计只复用当前候选已经采集的因素，不能判断从格、专旺、化气、调候、大运流年等缺口。",
      "分档稳定不等于规则正确，分档变化也不自动证明某个替代场景正确。",
      "本投影只读，不回写命盘、修订、存储或 mutation epoch。"
    ],
    sourceRefIds: [...REVIEW_SOURCE_REF_IDS],
    selectedOfficialScenarioId: null,
    expertStrengthVerdict: null,
    overallGoodBad: null,
    result: null
  };
  validateStrengthSensitivityReview(review, interpretation);
  return review;
}
