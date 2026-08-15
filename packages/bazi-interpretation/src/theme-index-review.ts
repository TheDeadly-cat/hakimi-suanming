import type { ChartFacts } from "@hakimi/contracts";
import type { BaziInterpretationResult, PillarPosition } from "./index";
import {
  buildTenGodOccurrenceReview,
  type TenGodOccurrenceReviewResult,
  type TenGodOccurrenceSource
} from "./ten-god-occurrence-review";
import {
  buildTenGodStrengthSensitivityReview,
  type TenGodStrengthSensitivityReview
} from "./ten-god-strength-sensitivity-review";
import { getTenGodPositionEditorial, isTenGodName } from "./ten-god-position-content";

export const BAZI_THEME_INDEX_REVIEW_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.theme_index_review/0.1.0",
  calculationScope: "editorial_navigation_over_existing_strength_ten_god_and_shensha_entry_points" as const,
  evidenceClass: "derived_read_only_navigation_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  filterPolicy: "temporary_client_side_visibility_only" as const,
  orderingPolicy: "fixed_pillar_order_not_ranked" as const,
  mutationPolicy: "read_only_projection" as const,
  shenshaPolicy: "explicit_gate_only_not_calculated" as const,
  overallGoodBadStatus: "withheld" as const
});

export type BaziThemeIndexId = "all" | "year" | "month" | "day" | "hour" | "shensha";
export type BaziThemeAnchorKind = "strength" | "pillar" | "shensha_gate";

export interface BaziThemeIndexItem {
  contentId: string;
  id: Exclude<BaziThemeIndexId, "all">;
  order: 1 | 2 | 3 | 4 | 5;
  label: string;
  eyebrow: string;
  availability: "available" | "partial" | "not_requested";
  anchorId: string;
  anchorKind: BaziThemeAnchorKind;
  focus: string;
  tenGods: readonly string[];
  occurrenceCount: number;
  directSummary: string;
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_navigation_projection";
  reviewStatus: "candidate_pending_expert_review";
  selectedPrimaryTheme: null;
  rank: null;
  score: null;
  overallGoodBad: null;
  result: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface BaziThemeIndexReview {
  profile: typeof BAZI_THEME_INDEX_REVIEW_PROFILE;
  strengthAnchorId: "bazi-strength-ledger";
  items: readonly [
    BaziThemeIndexItem,
    BaziThemeIndexItem,
    BaziThemeIndexItem,
    BaziThemeIndexItem,
    BaziThemeIndexItem
  ];
  filters: readonly BaziThemeIndexId[];
  availablePillarCount: number;
  totalOccurrenceCount: number;
  directSummary: string;
  sourceRefIds: readonly string[];
  knownBoundaries: readonly string[];
  selectedPrimaryTheme: null;
  expertThemeVerdict: null;
  ranking: null;
  overallGoodBad: null;
  result: null;
}

const pillarOrder: readonly PillarPosition[] = ["year", "month", "day", "hour"];
const sourceOrder: Readonly<Record<TenGodOccurrenceSource, number>> = {
  visible_stem: 0,
  hidden_stem_main: 1,
  hidden_stem_secondary: 2
};

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function positionAnchor(position: PillarPosition): string {
  return `bazi-ten-god-${position}`;
}

function buildPillarTheme(
  position: PillarPosition,
  order: 1 | 2 | 3 | 4,
  interpretation: BaziInterpretationResult,
  occurrenceReview: TenGodOccurrenceReviewResult,
  sensitivityReview: TenGodStrengthSensitivityReview
): BaziThemeIndexItem {
  const reading = interpretation.pillars.find((item) => item.position === position);
  const occurrences = occurrenceReview.pillars.find((item) => item.position === position);
  if (!reading || !occurrences || reading.ganZhi !== occurrences.ganZhi) {
    throw new Error(`${position}柱主题索引与现有解释投影不一致`);
  }
  if (
    (reading.availability === "available") !== (occurrences.availability === "available")
  ) {
    throw new Error(`${reading.positionLabel}主题索引的时辰可靠性不一致`);
  }

  const orderedOccurrences = [...occurrences.items].sort((left, right) => {
    const sourceDifference = sourceOrder[left.source] - sourceOrder[right.source];
    if (sourceDifference) return sourceDifference;
    return (left.hiddenStemIndex ?? -1) - (right.hiddenStemIndex ?? -1);
  });
  const tenGods = uniqueValues(orderedOccurrences.map((item) => item.tenGod));
  const sensitivityItems = tenGods.map((tenGod) => {
    const item = sensitivityReview.items.find((candidate) => candidate.tenGod === tenGod);
    if (!item) throw new Error(`${reading.positionLabel}${tenGod}缺少方向敏感性投影`);
    return item;
  });
  const sourceRefIds = uniqueValues([
    ...reading.sourceRefIds,
    ...orderedOccurrences.flatMap((item) => item.sourceRefIds),
    ...sensitivityItems.flatMap((item) => item.sourceRefIds)
  ]);
  const available = reading.availability === "available";
  const editorial = available && reading.focusTenGod && isTenGodName(reading.focusTenGod)
    ? getTenGodPositionEditorial(reading.focusTenGod, position)
    : null;
  if (available && !editorial) {
    throw new Error(`${reading.positionLabel}主题索引无法映射到 10×4 十神位置审稿表`);
  }
  const focus = editorial?.focus ?? "时辰不可靠，本柱内容关闭";
  const sensitivityLabel = sensitivityItems.length
    ? `${sensitivityItems.filter((item) => item.stability === "direction_sensitive").length} 类方向敏感`
    : "方向未定";

  return Object.freeze({
    contentId: `hakimi.bazi.theme_index.${position}.candidate.v0_1`,
    id: position,
    order,
    label: reading.positionLabel,
    eyebrow: `${reading.ganZhi} · Pillar topic`,
    availability: available ? "available" : "partial",
    anchorId: positionAnchor(position),
    anchorKind: "pillar",
    focus,
    tenGods: Object.freeze(tenGods),
    occurrenceCount: occurrences.occurrenceCount,
    directSummary: available
      ? `${reading.positionLabel}${reading.ganZhi}收录 ${occurrences.occurrenceCount} 项透干/藏干十神，按既有位置文案和六场景敏感性钻取；${sensitivityLabel}。`
      : `${reading.positionLabel}因时辰不可靠而保持部分可用；索引保留入口，但不列出或补猜任何时柱十神出现项。`,
    sourceRefIds: Object.freeze(sourceRefIds),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    selectedPrimaryTheme: null,
    rank: null,
    score: null,
    overallGoodBad: null,
    result: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish:
      "柱位主题索引只连接既有位置文案、出现项和方向敏感性；卡片顺序、数量和筛选状态都不证明重要性、强度、喜忌、事件或固定吉凶。"
  });
}

function buildShenshaTheme(interpretation: BaziInterpretationResult): BaziThemeIndexItem {
  return Object.freeze({
    contentId: "hakimi.bazi.theme_index.shensha.candidate.v0_1",
    id: "shensha",
    order: 5,
    label: "神煞入口",
    eyebrow: "Explicit gate · not requested",
    availability: "not_requested",
    anchorId: "bazi-shensha-gate",
    anchorKind: "shensha_gate",
    focus: "按需打开五项候选的命中事实、落柱议题与同柱复核包",
    tenGods: Object.freeze([]),
    occurrenceCount: 0,
    directSummary:
      "索引只跳到神煞显式入口，不会预先运行、计数或解释任何神煞；用户主动打开后仍只生成页面内临时候选事实。",
    sourceRefIds: Object.freeze(["smt-ten-gods", "zpzz-review-gates"]),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    selectedPrimaryTheme: null,
    rank: null,
    score: null,
    overallGoodBad: null,
    result: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish:
      "神煞入口被列入索引不表示本盘命中任何神煞，也不签发神煞方向、综合吉凶、事件或评分。"
  });
}

export function buildBaziThemeIndexReview(
  facts: ChartFacts,
  interpretation: BaziInterpretationResult,
  occurrenceReview: TenGodOccurrenceReviewResult = buildTenGodOccurrenceReview(facts, interpretation),
  sensitivityReview: TenGodStrengthSensitivityReview = buildTenGodStrengthSensitivityReview(interpretation)
): BaziThemeIndexReview {
  const items = Object.freeze([
    buildPillarTheme("year", 1, interpretation, occurrenceReview, sensitivityReview),
    buildPillarTheme("month", 2, interpretation, occurrenceReview, sensitivityReview),
    buildPillarTheme("day", 3, interpretation, occurrenceReview, sensitivityReview),
    buildPillarTheme("hour", 4, interpretation, occurrenceReview, sensitivityReview),
    buildShenshaTheme(interpretation)
  ]) as BaziThemeIndexReview["items"];

  if (items.some((item, index) => item.order !== index + 1)) {
    throw new Error("八字主题索引必须保持年、月、日、时、神煞入口的固定顺序");
  }
  if (new Set(items.map((item) => item.contentId)).size !== items.length) {
    throw new Error("八字主题索引内容 ID 必须唯一");
  }
  if (new Set(items.map((item) => item.anchorId)).size !== items.length) {
    throw new Error("八字主题索引锚点必须唯一");
  }
  const sourceRefIds = uniqueValues(items.flatMap((item) => item.sourceRefIds));
  for (const sourceRefId of sourceRefIds) {
    if (!interpretation.sourceRefs.some((source) => source.id === sourceRefId)) {
      throw new Error(`八字主题索引来源不存在：${sourceRefId}`);
    }
  }

  const availablePillarCount = items.filter(
    (item) => item.anchorKind === "pillar" && item.availability === "available"
  ).length;
  return Object.freeze({
    profile: BAZI_THEME_INDEX_REVIEW_PROFILE,
    strengthAnchorId: "bazi-strength-ledger",
    items,
    filters: Object.freeze(["all", "year", "month", "day", "hour", "shensha"] as const),
    availablePillarCount,
    totalOccurrenceCount: occurrenceReview.occurrenceCount,
    directSummary:
      `按固定年、月、日、时与神煞入口组织 ${items.length} 张导航卡；${availablePillarCount}/4 柱可读，共连接 ${occurrenceReview.occurrenceCount} 项十神出现事实。筛选只改变本页卡片可见性，不选全盘第一主题。`,
    sourceRefIds: Object.freeze(sourceRefIds),
    knownBoundaries: Object.freeze([
      "固定顺序来自页面信息架构，不是命理重要性排序。",
      "卡片数量、十神数量与出现次数不转换为力量、权重、评分或人生主题排名。",
      "筛选状态仅存在于当前组件内存，不写入案例、修订、规则快照或本地数据库。",
      "神煞索引始终只指向显式入口；在用户主动打开前不运行命中事实。",
      "selectedPrimaryTheme、expertThemeVerdict、ranking、overallGoodBad 与 result 固定为 null。"
    ]),
    selectedPrimaryTheme: null,
    expertThemeVerdict: null,
    ranking: null,
    overallGoodBad: null,
    result: null
  });
}
