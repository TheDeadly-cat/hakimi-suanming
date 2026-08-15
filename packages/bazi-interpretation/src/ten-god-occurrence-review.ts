import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import type {
  BaziInterpretationResult,
  PillarPosition,
  RelativeOrientation,
  StrengthFactor,
  StrengthBand
} from "./index";
import {
  getTenGodPositionEditorial,
  isTenGodName,
  type TenGodName,
  type TenGodPositionEditorialEntry
} from "./ten-god-position-content";
import {
  buildTenGodOrientationReviewGates,
  tenGodBalanceDirectionFor,
  tenGodBalanceDirectionLabel,
  type TenGodBalanceDirection,
  type TenGodOrientationReviewItem
} from "./ten-god-orientation-review";
import { canonicalizeStrengthTenGod } from "./strength-policy";

export const BAZI_TEN_GOD_OCCURRENCE_REVIEW_VERSION =
  "hakimi.bazi.ten_god_occurrence_review/0.1.0" as const;

export const BAZI_TEN_GOD_OCCURRENCE_REVIEW_PROFILE = Object.freeze({
  projectionVersion: BAZI_TEN_GOD_OCCURRENCE_REVIEW_VERSION,
  calculationScope: "all_visible_and_hidden_ten_god_occurrences" as const,
  availableOnDefaultChart: true,
  expandedByDefault: false,
  evidenceClass: "derived_read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  overallGoodBadStatus: "withheld" as const
});

export type TenGodOccurrenceSource =
  | "visible_stem"
  | "hidden_stem_main"
  | "hidden_stem_secondary";

export interface TenGodOccurrenceReviewItem {
  contentId: string;
  version: typeof BAZI_TEN_GOD_OCCURRENCE_REVIEW_VERSION;
  position: PillarPosition;
  positionLabel: string;
  ganZhi: string;
  source: TenGodOccurrenceSource;
  sourceLabel: string;
  stem: string;
  hiddenStemIndex: number | null;
  tenGod: TenGodName;
  isPrimaryDisplayFocus: boolean;
  strengthBand: StrengthBand;
  strengthFactorIds: readonly string[];
  strengthRuleWeight: number;
  inheritedOrientation: RelativeOrientation;
  balanceDirection: TenGodBalanceDirection;
  balanceDirectionLabel: string;
  editorialId: string;
  editorialReviewStatus: TenGodPositionEditorialEntry["reviewStatus"];
  directSummary: string;
  reviewGates: TenGodOrientationReviewItem["reviewGates"];
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_projection";
  reviewStatus: "candidate_pending_expert_review";
  result: null;
  overallGoodBad: null;
  eventOutcome: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface TenGodOccurrencePillarReview {
  position: PillarPosition;
  positionLabel: string;
  ganZhi: string;
  availability: "available" | "uncertain_hour";
  occurrenceCount: number;
  visibleStemCount: number;
  hiddenStemCount: number;
  dayMasterStemExcluded: boolean;
  items: readonly TenGodOccurrenceReviewItem[];
  result: null;
  overallGoodBad: null;
  doesNotEstablish: string;
}

export interface TenGodOccurrenceReviewResult {
  profile: typeof BAZI_TEN_GOD_OCCURRENCE_REVIEW_PROFILE;
  pillars: readonly TenGodOccurrencePillarReview[];
  occurrenceCount: number;
  withheldPositions: readonly PillarPosition[];
  knownGaps: readonly string[];
}

const pillarOrder: readonly PillarPosition[] = ["year", "month", "day", "hour"];

function canonicalTenGod(value: string): string {
  return canonicalizeStrengthTenGod(value);
}

function requireTenGod(value: string, label: string): TenGodName {
  const canonical = canonicalTenGod(value);
  if (!isTenGodName(canonical)) {
    throw new Error(`${label}无法映射到十神审稿表：${value}`);
  }
  return canonical;
}

function relativeOrientationFor(
  direction: StrengthFactor["direction"],
  band: StrengthBand
): RelativeOrientation {
  if (band === "balanced" || band === "undetermined") return "conditional";
  const weak = band === "very_weak" || band === "weak";
  return weak === (direction === "support") ? "favorable" : "challenging";
}

function strengthFactorsForOccurrence(
  interpretation: BaziInterpretationResult,
  pillar: PillarFact,
  source: TenGodOccurrenceSource,
  stem: string,
  hiddenStemIndex: number | null
): StrengthFactor[] {
  const ids = source === "visible_stem"
    ? [`visible:${pillar.name}:${stem}`]
    : [
      `hidden:${pillar.name}:${stem}:${hiddenStemIndex}`,
      ...(pillar.name === "month" && hiddenStemIndex === 0
        ? [`month-command:${pillar.branch}:${stem}`]
        : [])
    ];
  const factors = ids.map((id) => interpretation.strength.factors.find((factor) => factor.id === id));
  const missingIndex = factors.findIndex((factor) => !factor);
  if (missingIndex >= 0) {
    throw new Error(`十神出现项缺少旺衰因素：${ids[missingIndex]}`);
  }
  return factors as StrengthFactor[];
}

function occurrenceSourceLabel(
  pillar: PillarFact,
  source: TenGodOccurrenceSource,
  stem: string,
  hiddenStemIndex: number | null
): string {
  if (source === "visible_stem") return `${stem}透干`;
  if (source === "hidden_stem_main") return `${pillar.branch}藏${stem}（首位藏干）`;
  return `${pillar.branch}藏${stem}（第${(hiddenStemIndex ?? 0) + 1}藏干）`;
}

function buildOccurrence(
  pillar: PillarFact,
  source: TenGodOccurrenceSource,
  stem: string,
  rawTenGod: string,
  hiddenStemIndex: number | null,
  reading: BaziInterpretationResult["pillars"][number],
  interpretation: BaziInterpretationResult
): TenGodOccurrenceReviewItem {
  const tenGod = requireTenGod(rawTenGod, `${pillar.label}${stem}`);
  const editorial = getTenGodPositionEditorial(tenGod, pillar.name);
  if (!editorial) {
    throw new Error(`${pillar.label}${tenGod}缺少 10×4 位置审稿项`);
  }
  const factors = strengthFactorsForOccurrence(
    interpretation,
    pillar,
    source,
    stem,
    hiddenStemIndex
  );
  const directions = new Set(factors.map((factor) => factor.direction));
  if (directions.size !== 1) {
    throw new Error(`${pillar.label}${tenGod}对应的旺衰因素方向不一致`);
  }
  const inheritedOrientation = relativeOrientationFor(factors[0].direction, interpretation.strength.band);
  const balanceDirection = tenGodBalanceDirectionFor(inheritedOrientation, "available");
  const sourceLabel = occurrenceSourceLabel(pillar, source, stem, hiddenStemIndex);
  const sourceKey = source === "visible_stem" ? `visible-${stem}` : `hidden-${hiddenStemIndex}-${stem}`;
  const isPrimaryDisplayFocus = reading.focusTenGod === tenGod && (
    reading.focusSource === source
    || (reading.focusSource === "branch_main" && source === "hidden_stem_main")
  );

  return Object.freeze({
    contentId: `hakimi.bazi.ten_god_occurrence.${pillar.name}.${sourceKey}.${tenGod}.candidate.v0_1`,
    version: BAZI_TEN_GOD_OCCURRENCE_REVIEW_VERSION,
    position: pillar.name,
    positionLabel: pillar.label,
    ganZhi: pillar.ganZhi,
    source,
    sourceLabel,
    stem,
    hiddenStemIndex,
    tenGod,
    isPrimaryDisplayFocus,
    strengthBand: interpretation.strength.band,
    strengthFactorIds: Object.freeze(factors.map((factor) => factor.id)),
    strengthRuleWeight: factors.reduce((sum, factor) => sum + factor.weight, 0),
    inheritedOrientation,
    balanceDirection,
    balanceDirectionLabel: tenGodBalanceDirectionLabel(balanceDirection, "available"),
    editorialId: `${editorial.tenGod}:${editorial.position}`,
    editorialReviewStatus: editorial.reviewStatus,
    directSummary:
      `${pillar.label}${sourceLabel}映射为${tenGod}：重点落在${editorial.focus}。顺畅时，${editorial.flowing}；失衡时，${editorial.strained}。`,
    reviewGates: buildTenGodOrientationReviewGates(tenGod, pillar.label),
    sourceRefIds: Object.freeze([
      ...new Set([
        ...editorial.sourceRefIds,
        ...factors.flatMap((factor) => factor.sourceRefIds),
        "yhzp-hidden-stems",
        "zpzz-review-gates"
      ])
    ]),
    evidenceClass: "derived_read_only_projection",
    reviewStatus: "candidate_pending_expert_review",
    result: null,
    overallGoodBad: null,
    eventOutcome: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish:
      "出现项只说明该天干或藏干在当前柱位映射到哪颗十神，并连接既有位置文案与扶抑候选；不能单独证明强弱等级、透藏优先级、用神、格局、事件或固定吉凶。"
  });
}

function buildPillarOccurrences(
  facts: ChartFacts,
  position: PillarPosition,
  interpretation: BaziInterpretationResult
): TenGodOccurrencePillarReview {
  const pillar = facts.pillars[position];
  const reading = interpretation.pillars.find((item) => item.position === position);
  if (!reading || reading.ganZhi !== pillar.ganZhi) {
    throw new Error(`${pillar.label}十神出现项与解释输入不一致`);
  }
  if (pillar.hiddenStems.length !== pillar.branchTenGods.length) {
    throw new Error(`${pillar.label}藏干与地支十神数量不一致`);
  }
  if (reading.availability !== "available") {
    return Object.freeze({
      position,
      positionLabel: pillar.label,
      ganZhi: pillar.ganZhi,
      availability: "uncertain_hour",
      occurrenceCount: 0,
      visibleStemCount: 0,
      hiddenStemCount: 0,
      dayMasterStemExcluded: position === "day",
      items: Object.freeze([]),
      result: null,
      overallGoodBad: null,
      doesNotEstablish: "时辰不可靠时，不列出或解释任何时柱透干、藏干与十神出现项。"
    });
  }

  const items: TenGodOccurrenceReviewItem[] = [];
  if (position !== "day") {
    items.push(buildOccurrence(
      pillar,
      "visible_stem",
      pillar.stem,
      pillar.stemTenGod,
      null,
      reading,
      interpretation
    ));
  }
  pillar.hiddenStems.forEach((stem, index) => {
    items.push(buildOccurrence(
      pillar,
      index === 0 ? "hidden_stem_main" : "hidden_stem_secondary",
      stem,
      pillar.branchTenGods[index],
      index,
      reading,
      interpretation
    ));
  });

  if (new Set(items.map((item) => item.contentId)).size !== items.length) {
    throw new Error(`${pillar.label}十神出现项内容 ID 重复`);
  }

  return Object.freeze({
    position,
    positionLabel: pillar.label,
    ganZhi: pillar.ganZhi,
    availability: "available",
    occurrenceCount: items.length,
    visibleStemCount: items.filter((item) => item.source === "visible_stem").length,
    hiddenStemCount: items.filter((item) => item.source !== "visible_stem").length,
    dayMasterStemExcluded: position === "day",
    items: Object.freeze(items),
    result: null,
    overallGoodBad: null,
    doesNotEstablish:
      "本柱全量列表是事实与既有编辑候选的逐项连接；焦点项只用于首屏摘要，不代表其必然强于其他出现项。"
  });
}

export function buildTenGodOccurrenceReview(
  facts: ChartFacts,
  interpretation: BaziInterpretationResult
): TenGodOccurrenceReviewResult {
  const pillars = pillarOrder.map((position) => buildPillarOccurrences(facts, position, interpretation));
  const items = pillars.flatMap((pillar) => pillar.items);
  if (new Set(items.map((item) => item.contentId)).size !== items.length) {
    throw new Error("全盘十神出现项内容 ID 重复");
  }

  return Object.freeze({
    profile: BAZI_TEN_GOD_OCCURRENCE_REVIEW_PROFILE,
    pillars: Object.freeze(pillars),
    occurrenceCount: items.length,
    withheldPositions: Object.freeze(
      pillars.filter((pillar) => pillar.availability !== "available").map((pillar) => pillar.position)
    ),
    knownGaps: Object.freeze([
      "透干、首位藏干与其他藏干在此仅按当前事实来源分层；没有新增强弱排序或透藏优先级规则。",
      "每项平衡方向仍只继承 0.1.0 扶抑候选；格局、调候、合化与运限四门均未评估。",
      "重复十神按不同天干或藏干事实分别保留，不合并为次数分数，也不据数量判吉凶。",
      "所有 result、overallGoodBad 与 eventOutcome 固定为 null。"
    ])
  });
}
