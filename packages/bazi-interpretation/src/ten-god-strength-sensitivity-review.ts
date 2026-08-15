import type {
  BaziInterpretationResult,
  StrengthFactorDirection
} from "./index";
import type { StrengthBand } from "./strength-thresholds";
import {
  buildStrengthSensitivityReview,
  validateStrengthSensitivityReview,
  type StrengthSensitivityReview,
  type StrengthSensitivityScenarioId
} from "./strength-sensitivity-review";
import {
  tenGodBalanceDirectionLabel,
  type TenGodBalanceDirection
} from "./ten-god-orientation-review";
import { canonicalizeStrengthTenGod } from "./strength-policy";

export const BAZI_TEN_GOD_STRENGTH_SENSITIVITY_REVIEW_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.ten_god_strength_sensitivity_review/0.1.0",
  calculationScope: "propagate_strength_engineering_scenarios_to_present_ten_gods" as const,
  evidenceClass: "derived_engineering_sensitivity_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  mutationPolicy: "read_only_projection" as const,
  displayPolicy: "downgrade_disagreement_to_conditional" as const,
  overallGoodBadStatus: "withheld" as const
});

export type TenGodDirectionSensitivityStability =
  | "stable_across_engineering_scenarios"
  | "direction_sensitive"
  | "insufficient";

export interface TenGodStrengthSensitivityScenario {
  scenarioId: StrengthSensitivityScenarioId;
  scenarioLabel: string;
  strengthBand: StrengthBand;
  factorDirection: StrengthFactorDirection;
  balanceDirection: TenGodBalanceDirection;
  officialRuleCandidate: false;
  overallGoodBad: null;
}

export interface TenGodStrengthSensitivityItem {
  contentId: string;
  tenGod: string;
  factorDirection: StrengthFactorDirection;
  baselineBalanceDirection: TenGodBalanceDirection;
  baselineBalanceDirectionLabel: string;
  effectiveBalanceDirection: TenGodBalanceDirection;
  effectiveBalanceDirectionLabel: string;
  stability: TenGodDirectionSensitivityStability;
  stabilityLabel: string;
  distinctBalanceDirections: readonly TenGodBalanceDirection[];
  scenarios: readonly TenGodStrengthSensitivityScenario[];
  directSummary: string;
  sourceRefIds: readonly string[];
  evidenceClass: "derived_engineering_sensitivity_projection";
  reviewStatus: "candidate_pending_expert_review";
  selectedOfficialScenarioId: null;
  expertOrientation: null;
  overallGoodBad: null;
  result: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface TenGodStrengthSensitivityReview {
  profile: typeof BAZI_TEN_GOD_STRENGTH_SENSITIVITY_REVIEW_PROFILE;
  strengthSensitivityVersion: string;
  scenarioCount: number;
  items: readonly TenGodStrengthSensitivityItem[];
  sensitiveTenGodCount: number;
  stableTenGodCount: number;
  insufficientTenGodCount: number;
  knownBoundaries: readonly string[];
  selectedOfficialScenarioId: null;
  expertOrientation: null;
  overallGoodBad: null;
  result: null;
}

const REVIEW_SOURCE_REF_IDS = [
  "dtt-strength",
  "smt-ten-gods",
  "smt-position",
  "zpzz-review-gates"
] as const;

function canonicalTenGod(value: string): string {
  return canonicalizeStrengthTenGod(value);
}

export function tenGodBalanceDirectionForStrengthBand(
  factorDirection: StrengthFactorDirection,
  band: StrengthBand
): TenGodBalanceDirection {
  if (band === "balanced" || band === "undetermined") return "conditional";
  const weak = band === "very_weak" || band === "weak";
  return weak === (factorDirection === "support")
    ? "may_restore_balance"
    : "may_amplify_imbalance";
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function stabilityFor(
  directions: readonly TenGodBalanceDirection[]
): TenGodDirectionSensitivityStability {
  const distinct = uniqueValues(directions);
  if (distinct.length > 1) return "direction_sensitive";
  if (distinct.length === 0 || distinct[0] === "conditional") return "insufficient";
  return "stable_across_engineering_scenarios";
}

function stabilityLabel(stability: TenGodDirectionSensitivityStability): string {
  if (stability === "stable_across_engineering_scenarios") return "六场景方向一致";
  if (stability === "direction_sensitive") return "六场景方向分歧";
  return "六场景无法定向";
}

function effectiveDirectionLabel(
  direction: TenGodBalanceDirection,
  stability: TenGodDirectionSensitivityStability
): string {
  if (stability === "direction_sensitive") return "六场景分歧：条件性";
  if (stability === "insufficient") return "场景不足：条件性";
  return direction === "may_restore_balance"
    ? "六场景一致：可能补偏"
    : "六场景一致：可能增偏";
}

function factorDirectionByTenGod(
  interpretation: BaziInterpretationResult
): Map<string, StrengthFactorDirection> {
  const directions = new Map<string, StrengthFactorDirection>();
  for (const factor of interpretation.strength.factors) {
    const tenGod = canonicalTenGod(factor.tenGod);
    const existing = directions.get(tenGod);
    if (existing && existing !== factor.direction) {
      throw new Error(`十神旺衰作用侧不一致：${tenGod}`);
    }
    directions.set(tenGod, factor.direction);
  }
  for (const reading of interpretation.pillars) {
    if (reading.availability !== "available" || !reading.focusTenGod) continue;
    const tenGod = canonicalTenGod(reading.focusTenGod);
    if (!directions.has(tenGod)) {
      throw new Error(`十神敏感性缺少作用侧事实：${reading.positionLabel}${tenGod}`);
    }
  }
  return directions;
}

function validateSourceRefs(interpretation: BaziInterpretationResult): void {
  for (const sourceRefId of REVIEW_SOURCE_REF_IDS) {
    if (!interpretation.sourceRefs.some((sourceRef) => sourceRef.id === sourceRefId)) {
      throw new Error(`十神敏感性来源不存在：${sourceRefId}`);
    }
  }
}

function buildItem(
  tenGod: string,
  factorDirection: StrengthFactorDirection,
  interpretation: BaziInterpretationResult,
  strengthReview: StrengthSensitivityReview
): TenGodStrengthSensitivityItem {
  const scenarios = strengthReview.scenarios.map((scenario): TenGodStrengthSensitivityScenario => Object.freeze({
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    strengthBand: scenario.band,
    factorDirection,
    balanceDirection: tenGodBalanceDirectionForStrengthBand(factorDirection, scenario.band),
    officialRuleCandidate: false,
    overallGoodBad: null
  }));
  const baselineScenario = scenarios.find((scenario) => scenario.scenarioId === "baseline_current_candidate");
  if (!baselineScenario) throw new Error("十神敏感性缺少当前比较基线");
  const distinctBalanceDirections = uniqueValues(scenarios.map((scenario) => scenario.balanceDirection));
  const stability = stabilityFor(distinctBalanceDirections);
  const effectiveBalanceDirection = stability === "stable_across_engineering_scenarios"
    ? distinctBalanceDirections[0]!
    : "conditional";
  const label = stabilityLabel(stability);
  const baselineLabel = tenGodBalanceDirectionLabel(baselineScenario.balanceDirection, "available");
  const directSummary = stability === "stable_across_engineering_scenarios"
    ? `${tenGod}在六个工程扰动场景中都保持“${baselineLabel.replace("平衡方向：", "")}”；这只说明当前场景集内方向一致，不证明权重或命理规则正确。`
    : stability === "direction_sensitive"
      ? `${tenGod}按当前基线为“${baselineLabel.replace("平衡方向：", "")}”，但替代工程场景出现不同方向；对用户展示降为“条件性”，等待规则与案例复核。`
      : `${tenGod}在当前场景中无法形成非条件性的稳定方向；不生成补偏、增偏或吉凶结论。`;
  const factorSourceRefIds = interpretation.strength.factors
    .filter((factor) => canonicalTenGod(factor.tenGod) === tenGod)
    .flatMap((factor) => factor.sourceRefIds);

  return Object.freeze({
    contentId: `hakimi.bazi.ten_god_strength_sensitivity.${tenGod}.candidate.v0_1`,
    tenGod,
    factorDirection,
    baselineBalanceDirection: baselineScenario.balanceDirection,
    baselineBalanceDirectionLabel: baselineLabel,
    effectiveBalanceDirection,
    effectiveBalanceDirectionLabel: effectiveDirectionLabel(effectiveBalanceDirection, stability),
    stability,
    stabilityLabel: label,
    distinctBalanceDirections: Object.freeze(distinctBalanceDirections),
    scenarios: Object.freeze(scenarios),
    directSummary,
    sourceRefIds: Object.freeze([...new Set([...factorSourceRefIds, ...REVIEW_SOURCE_REF_IDS])]),
    evidenceClass: "derived_engineering_sensitivity_projection",
    reviewStatus: "candidate_pending_expert_review",
    selectedOfficialScenarioId: null,
    expertOrientation: null,
    overallGoodBad: null,
    result: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish:
      "本条只传播六个工程旺衰场景对十神扶抑方向的影响；不选正式场景，不证明用神、格局、调候、事件、身份或永久吉凶。"
  });
}

export function buildTenGodStrengthSensitivityReview(
  interpretation: BaziInterpretationResult,
  strengthReview: StrengthSensitivityReview = buildStrengthSensitivityReview(interpretation)
): TenGodStrengthSensitivityReview {
  validateStrengthSensitivityReview(strengthReview, interpretation);
  validateSourceRefs(interpretation);
  const directions = factorDirectionByTenGod(interpretation);
  const items = [...directions.entries()].map(([tenGod, direction]) => (
    buildItem(tenGod, direction, interpretation, strengthReview)
  ));
  const review: TenGodStrengthSensitivityReview = {
    profile: BAZI_TEN_GOD_STRENGTH_SENSITIVITY_REVIEW_PROFILE,
    strengthSensitivityVersion: strengthReview.profile.projectionVersion,
    scenarioCount: strengthReview.scenarios.length,
    items: Object.freeze(items),
    sensitiveTenGodCount: items.filter((item) => item.stability === "direction_sensitive").length,
    stableTenGodCount: items.filter((item) => item.stability === "stable_across_engineering_scenarios").length,
    insufficientTenGodCount: items.filter((item) => item.stability === "insufficient").length,
    knownBoundaries: Object.freeze([
      "替代场景只扰动当前工程权重、去重和因素纳入方式，不代表任何已认证门派规则。",
      "方向分歧时统一降为条件性；不会挑选对用户更乐观或更悲观的场景。",
      "六场景一致只表示这组工程扰动没有翻转方向，不等于规则正确或专家复核通过。",
      "selectedOfficialScenarioId、expertOrientation、overallGoodBad 与 result 固定为 null；只读且不触碰 mutation epoch。"
    ]),
    selectedOfficialScenarioId: null,
    expertOrientation: null,
    overallGoodBad: null,
    result: null
  };
  return Object.freeze(review);
}
