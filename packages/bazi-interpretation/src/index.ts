import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import {
  BAZI_STRENGTH_BAND_LABELS,
  type StrengthBand
} from "./strength-thresholds";
import {
  getTenGodPositionEditorial,
  type TenGodPositionEditorialEntry
} from "./ten-god-position-content";
import { BAZI_INTERPRETATION_SOURCE_REFS } from "./source-refs";
import {
  canonicalizeStrengthTenGod,
  strengthFactorDirectionForTenGod,
  strengthTenGodGroup,
  type StrengthFactorDirection,
  type TenGodGroup
} from "./strength-policy";
import {
  BAZI_STRENGTH_PILLAR_ORDER,
  BAZI_STRENGTH_POSITION_LABELS,
  deriveBaziStrengthAssessment,
  type PillarPosition,
  type StrengthAssessment
} from "./strength-assessment-core";

export {
  TEN_GOD_NAMES,
  TEN_GOD_PILLAR_POSITIONS,
  TEN_GOD_POSITION_EDITORIAL,
  getTenGodPositionEditorial,
  isTenGodName,
  type TenGodName,
  type TenGodPillarPosition,
  type TenGodPositionEditorialEntry
} from "./ten-god-position-content";
export * from "./shensha-research";
export * from "./shensha-position-content";
export * from "./shensha-occurrence-review";
export * from "./ten-god-orientation-review";
export * from "./ten-god-occurrence-review";
export * from "./position-synthesis-review";
export * from "./strength-thresholds";
export {
  BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS,
  BAZI_STRENGTH_METHOD_REVIEW_ITEM_IDS,
  BAZI_STRENGTH_POLICY,
  BAZI_STRENGTH_SENSITIVITY_SCENARIO_IDS,
  BAZI_STRENGTH_TEN_GOD_ALIASES,
  BAZI_STRENGTH_TEN_GOD_GROUPS,
  BAZI_STRENGTH_UNRESOLVED_STRUCTURES,
  BAZI_STRENGTH_WEIGHT_SUMMARY,
  canonicalizeStrengthTenGod,
  strengthFactorDirectionForTenGod,
  strengthFactorWeight,
  strengthTenGodGroup,
  type StrengthFactorDirection,
  type StrengthPolicyFactorGroup,
  type TenGodGroup
} from "./strength-policy";
export * from "./strength-sensitivity-review";
export * from "./strength-assessment-core";
export * from "./strength-claim-registry";
export * from "./strength-evidence-narrative";
export * from "./ten-god-strength-sensitivity-review";
export * from "./first-read-review";
export * from "./theme-index-review";
export * from "./source-refs";
export * from "./content-review-queue";
export * from "./content-review-feedback";
export * from "./current-chart-hit-review";

export const BAZI_INTERPRETATION_RULE_PROFILE = Object.freeze({
  rulePackId: "hakimi-bazi-strength-ten-god-candidate",
  ruleVersion: "0.1.0",
  editorialVersion: "0.2.0",
  editorialCoverage: "10x4_explicit_candidate" as const,
  school: "子平旺衰研究候选",
  reviewStatus: "candidate_pending_expert_review" as const,
  rights: "original_editorial" as const
});

export type RelativeOrientation = "favorable" | "challenging" | "conditional";

export interface PillarTenGodReading {
  position: PillarPosition;
  positionLabel: string;
  ganZhi: string;
  availability: "available" | "uncertain_hour";
  focusSource: "visible_stem" | "branch_main" | "unavailable";
  focusTenGod: string | null;
  hiddenTenGods: string[];
  orientation: RelativeOrientation;
  orientationLabel: string;
  editorialId: string | null;
  editorialReviewStatus: TenGodPositionEditorialEntry["reviewStatus"] | "not_available";
  directSummary: string;
  strengthLink: string;
  doesNotEstablish: string;
  sourceRefIds: string[];
}

export interface BaziInterpretationResult {
  profile: typeof BAZI_INTERPRETATION_RULE_PROFILE;
  sourceRefs: typeof BAZI_INTERPRETATION_SOURCE_REFS;
  strength: StrengthAssessment;
  pillars: PillarTenGodReading[];
}

export interface BaziInterpretationOptions {
  includeHour?: boolean;
}

const pillarOrder: PillarPosition[] = [...BAZI_STRENGTH_PILLAR_ORDER];

const bandLabels = BAZI_STRENGTH_BAND_LABELS;

const canonicalTenGod = canonicalizeStrengthTenGod;

const positionContent: Record<PillarPosition, { label: string }> = Object.fromEntries(
  Object.entries(BAZI_STRENGTH_POSITION_LABELS).map(([position, label]) => [position, { label }])
) as Record<PillarPosition, { label: string }>;

function tenGodGroup(value: string): TenGodGroup | null {
  return strengthTenGodGroup(value);
}

function factorDirection(value: string): StrengthFactorDirection | null {
  return strengthFactorDirectionForTenGod(value);
}

function orientationFor(tenGod: string, band: StrengthBand): RelativeOrientation {
  const direction = factorDirection(tenGod);
  if (!direction || band === "balanced" || band === "undetermined") return "conditional";
  const weak = band === "very_weak" || band === "weak";
  return weak === (direction === "support") ? "favorable" : "challenging";
}

function orientationLabel(orientation: RelativeOrientation): string {
  if (orientation === "favorable") return "当前取向：偏有利";
  if (orientation === "challenging") return "当前取向：需警惕";
  return "当前取向：条件性";
}

function strengthLink(tenGod: string, band: StrengthBand, orientation: RelativeOrientation): string {
  const group = tenGodGroup(tenGod);
  if (!group || band === "undetermined") return "旺衰尚未形成可用候选，暂不判定这颗十神的相对取向。";
  if (band === "balanced") return "日主接近本规则的中和区间，不能只凭这一颗十神固定判吉凶。";
  const side = group === "peer" || group === "resource" ? "印比支持侧" : group === "output" ? "食伤泄身侧" : group === "wealth" ? "财星耗身侧" : "官杀压力侧";
  return `${tenGod}属于${side}；结合当前“${bandLabels[band]}”候选，${orientation === "favorable" ? "通常有助于回到平衡" : "更容易放大当前失衡，需看组合是否有转化"}。`;
}

function buildPillarReading(pillar: PillarFact, band: StrengthBand, includeHour: boolean): PillarTenGodReading {
  const position = pillar.name;
  const positionMeta = positionContent[position];
  if (position === "hour" && !includeHour) {
    return {
      position,
      positionLabel: positionMeta.label,
      ganZhi: pillar.ganZhi,
      availability: "uncertain_hour",
      focusSource: "unavailable",
      focusTenGod: null,
      hiddenTenGods: [],
      orientation: "conditional",
      orientationLabel: "时辰未定",
      editorialId: null,
      editorialReviewStatus: "not_available",
      directSummary: "当前输入没有可靠时辰，时柱内容不参与旺衰，也不生成位置断语。",
      strengthLink: "补充可靠时辰并创建新修订后再评估；不会回写当前历史修订。",
      doesNotEstablish: "没有可靠时辰时，不推断任何时柱主题。",
      sourceRefIds: ["hakimi-editorial"]
    };
  }
  const focusSource = position === "day" ? "branch_main" : "visible_stem";
  const rawTenGod = position === "day" ? pillar.branchTenGods[0] : pillar.stemTenGod;
  const focusTenGod = rawTenGod ? canonicalTenGod(rawTenGod) : null;
  const content = focusTenGod ? getTenGodPositionEditorial(focusTenGod, position) : null;
  const orientation = focusTenGod ? orientationFor(focusTenGod, band) : "conditional";
  const sourceLabel = position === "day" ? `${pillar.branch}支主气` : `${pillar.stem}透干`;
  return {
    position,
    positionLabel: positionMeta.label,
    ganZhi: pillar.ganZhi,
    availability: "available",
    focusSource,
    focusTenGod,
    hiddenTenGods: [...new Set(pillar.branchTenGods.map(canonicalTenGod))],
    orientation,
    orientationLabel: orientationLabel(orientation),
    editorialId: content ? `${content.tenGod}:${content.position}` : null,
    editorialReviewStatus: content?.reviewStatus ?? "not_available",
    directSummary: content && focusTenGod
      ? `${positionMeta.label}${sourceLabel}见${focusTenGod}：重点落在${content.focus}。顺畅时，${content.flowing}；失衡时，${content.strained}。`
      : `${positionMeta.label}缺少可识别的十神映射，暂不生成位置解释。`,
    strengthLink: focusTenGod ? strengthLink(focusTenGod, band, orientation) : "当前十神无法进入旺衰联动。",
    doesNotEstablish: content?.doesNotEstablish ?? "当前条目没有可用审稿内容，不生成扩展结论。",
    sourceRefIds: ["smt-ten-gods", "smt-position", "hakimi-editorial"]
  };
}

export function interpretBaziChart(
  facts: ChartFacts,
  options: BaziInterpretationOptions = {}
): BaziInterpretationResult {
  const includeHour = options.includeHour ?? true;
  const strength = deriveBaziStrengthAssessment(facts, includeHour);

  return {
    profile: BAZI_INTERPRETATION_RULE_PROFILE,
    sourceRefs: BAZI_INTERPRETATION_SOURCE_REFS,
    strength,
    pillars: pillarOrder.map((position) => buildPillarReading(facts.pillars[position], strength.band, includeHour))
  };
}
