import type { ChartFacts } from "@hakimi/contracts";
import type { BaziInterpretationResult } from "./index";
import {
  buildStrengthSensitivityReview,
  type StrengthSensitivityReview
} from "./strength-sensitivity-review";
import {
  buildTenGodStrengthSensitivityReview,
  type TenGodStrengthSensitivityReview
} from "./ten-god-strength-sensitivity-review";
import {
  buildTenGodOccurrenceReview,
  type TenGodOccurrenceReviewResult
} from "./ten-god-occurrence-review";

export const BAZI_FIRST_READ_REVIEW_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.first_read_review/0.1.0",
  calculationScope: "fixed_four_step_navigation_over_existing_read_only_projections" as const,
  evidenceClass: "derived_read_only_navigation_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  orderPolicy: "fixed_not_ranked" as const,
  displayedByDefault: true,
  mutationPolicy: "read_only_projection" as const,
  overallGoodBadStatus: "withheld" as const
});

export type BaziFirstReadStepId =
  | "strength_confidence"
  | "pillar_ten_gods"
  | "repeated_ten_gods"
  | "shensha_gate";

export type BaziFirstReadAvailability =
  | "available"
  | "partial"
  | "not_available"
  | "not_requested";

export interface BaziFirstReadStep {
  contentId: string;
  id: BaziFirstReadStepId;
  order: 1 | 2 | 3 | 4;
  eyebrow: string;
  title: string;
  availability: BaziFirstReadAvailability;
  label: string;
  directSummary: string;
  items: readonly string[];
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_navigation_projection";
  reviewStatus: "candidate_pending_expert_review";
  result: null;
  overallGoodBad: null;
  selectedPrimaryTheme: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface BaziFirstReadReview {
  profile: typeof BAZI_FIRST_READ_REVIEW_PROFILE;
  steps: readonly [
    BaziFirstReadStep,
    BaziFirstReadStep,
    BaziFirstReadStep,
    BaziFirstReadStep
  ];
  availablePillarCount: number;
  totalOccurrenceCount: number;
  repeatedTenGodCount: number;
  directSummary: string;
  sourceRefIds: readonly string[];
  knownBoundaries: readonly string[];
  selectedPrimaryTheme: null;
  expertFirstReadVerdict: null;
  overallGoodBad: null;
  result: null;
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function strengthStep(
  interpretation: BaziInterpretationResult,
  strengthReview: StrengthSensitivityReview
): BaziFirstReadStep {
  const unavailable = interpretation.strength.band === "undetermined";
  const summary = unavailable
    ? "当前事实不足，旺衰候选未定；首读不继续推导稳定的扶抑方向。"
    : strengthReview.stability === "stable_across_engineering_scenarios"
      ? `${interpretation.strength.directSummary} 六个工程扰动场景保持同一分档与支持/泄耗方向；这只是场景内稳定，不是专家定论。`
      : `${interpretation.strength.directSummary} 六个工程扰动场景得到 ${strengthReview.distinctBands.length} 种分档、${strengthReview.distinctDirections.length} 种支持/泄耗方向；首读保留基线，但不把它当成稳定定论。`;
  return Object.freeze({
    contentId: "hakimi.bazi.first_read.strength_confidence.candidate.v0_1",
    id: "strength_confidence",
    order: 1,
    eyebrow: "Strength confidence",
    title: "先看旺衰是否稳定",
    availability: unavailable ? "not_available" : "available",
    label: `${interpretation.strength.dayMaster.stem}${interpretation.strength.dayMaster.elementLabel} · ${interpretation.strength.label}`,
    directSummary: summary,
    items: Object.freeze([
      `当前基线：支持 ${interpretation.strength.supportWeight} / 泄耗克 ${interpretation.strength.demandWeight}`,
      `六场景：${strengthReview.stabilityLabel}`
    ]),
    sourceRefIds: Object.freeze(uniqueValues(strengthReview.sourceRefIds)),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    result: null,
    overallGoodBad: null,
    selectedPrimaryTheme: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish: "本步只摘要当前旺衰候选及其工程敏感性；不建立用神、格局、调候、运限或吉凶。"
  });
}

function pillarStep(
  interpretation: BaziInterpretationResult,
  tenGodReview: TenGodStrengthSensitivityReview
): BaziFirstReadStep {
  const sensitivityByTenGod = new Map(tenGodReview.items.map((item) => [item.tenGod, item] as const));
  const available = interpretation.pillars.filter((reading) => reading.availability === "available");
  const items = interpretation.pillars.map((reading) => {
    if (reading.availability !== "available" || !reading.focusTenGod) {
      return `${reading.positionLabel}${reading.ganZhi}：时辰不可靠，本柱关闭`;
    }
    const sensitivity = sensitivityByTenGod.get(reading.focusTenGod);
    if (!sensitivity) throw new Error(`${reading.positionLabel}${reading.focusTenGod}缺少十神方向敏感性`);
    return `${reading.positionLabel}${reading.ganZhi}：${reading.focusTenGod} · ${sensitivity.effectiveBalanceDirectionLabel}`;
  });
  return Object.freeze({
    contentId: "hakimi.bazi.first_read.pillar_ten_gods.candidate.v0_1",
    id: "pillar_ten_gods",
    order: 2,
    eyebrow: "Ten Gods by pillar",
    title: "再按年、月、日、时读落点",
    availability: available.length === 4 ? "available" : available.length ? "partial" : "not_available",
    label: `${available.length}/4 柱可读`,
    directSummary:
      "四柱按固定位置顺序展开，不把某一柱或某颗十神自动排成全盘第一；每柱显示的方向已继承六场景敏感性降级。",
    items: Object.freeze(items),
    sourceRefIds: Object.freeze(uniqueValues([
      ...interpretation.pillars.flatMap((reading) => reading.sourceRefIds),
      ...tenGodReview.items.flatMap((item) => item.sourceRefIds)
    ])),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    result: null,
    overallGoodBad: null,
    selectedPrimaryTheme: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish: "四柱顺序是阅读导航，不是重要性排名；位置主题不证明现实身份、事件或固定吉凶。"
  });
}

function repeatedTenGodStep(
  occurrenceReview: TenGodOccurrenceReviewResult
): BaziFirstReadStep {
  const allItems = occurrenceReview.pillars.flatMap((pillar) => pillar.items);
  const occurrencesByTenGod = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const existing = occurrencesByTenGod.get(item.tenGod) ?? [];
    occurrencesByTenGod.set(item.tenGod, [...existing, item]);
  }
  const repeated = [...occurrencesByTenGod.entries()].filter(([, items]) => items.length > 1);
  const items = repeated.map(([tenGod, occurrences]) => {
    const positions = uniqueValues(occurrences.map((item) => item.positionLabel));
    return `${tenGod}出现 ${occurrences.length} 项 · ${positions.join("、")}`;
  });
  const availability: BaziFirstReadAvailability = allItems.length
    ? "available"
    : "not_available";
  const label = allItems.length
    ? `${repeated.length} 类重复 · ${allItems.length} 项事实`
    : "没有可读出现项";
  return Object.freeze({
    contentId: "hakimi.bazi.first_read.repeated_ten_gods.candidate.v0_1",
    id: "repeated_ten_gods",
    order: 3,
    eyebrow: "Repeated occurrences",
    title: "再看哪些十神重复出现",
    availability,
    label,
    directSummary: repeated.length
      ? "重复只表示不同透干或藏干事实映射到同一十神，帮助用户继续阅读相关位置；次数不转成强度、排名或吉凶分数。"
      : "当前可读透干与藏干中没有重复十神；这不表示全盘缺少组合主题，也不生成吉凶结论。",
    items: Object.freeze(items),
    sourceRefIds: Object.freeze(uniqueValues(allItems.flatMap((item) => item.sourceRefIds))),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    result: null,
    overallGoodBad: null,
    selectedPrimaryTheme: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish: "出现次数是事实索引，不等于力量、优先级、用神、格局或人生主题权重。"
  });
}

function shenshaGateStep(): BaziFirstReadStep {
  return Object.freeze({
    contentId: "hakimi.bazi.first_read.shensha_gate.candidate.v0_1",
    id: "shensha_gate",
    order: 4,
    eyebrow: "Optional fact layer",
    title: "最后按需打开神煞事实",
    availability: "not_requested",
    label: "默认关闭 · 待主动打开",
    directSummary:
      "首读不会自动运行或解释神煞。进入完整解读并主动打开后，只显示已注册候选的命中基准、落柱与复核议题；正式神煞层和吉凶仍关闭。",
    items: Object.freeze([
      "用户动作前：not_requested",
      "正式神煞层：false",
      "个案取向 / 总体吉凶：null"
    ]),
    sourceRefIds: Object.freeze(["smt-ten-gods", "zpzz-review-gates"]),
    evidenceClass: "derived_read_only_navigation_projection",
    reviewStatus: "candidate_pending_expert_review",
    result: null,
    overallGoodBad: null,
    selectedPrimaryTheme: null,
    expertTruthClaimed: false,
    scoringAllowed: false,
    doesNotEstablish: "本步只是显式入口边界；不证明当前盘命中或不命中任何神煞，也不签发神煞解释。"
  });
}

export function buildBaziFirstReadReview(
  facts: ChartFacts,
  interpretation: BaziInterpretationResult,
  strengthReview: StrengthSensitivityReview = buildStrengthSensitivityReview(interpretation),
  tenGodReview: TenGodStrengthSensitivityReview = buildTenGodStrengthSensitivityReview(
    interpretation,
    strengthReview
  ),
  occurrenceReview: TenGodOccurrenceReviewResult = buildTenGodOccurrenceReview(facts, interpretation)
): BaziFirstReadReview {
  const steps = Object.freeze([
    strengthStep(interpretation, strengthReview),
    pillarStep(interpretation, tenGodReview),
    repeatedTenGodStep(occurrenceReview),
    shenshaGateStep()
  ]) as BaziFirstReadReview["steps"];
  if (steps.some((step, index) => step.order !== index + 1)) {
    throw new Error("八字首读步骤必须保持固定 1—4 顺序");
  }
  const contentIds = steps.map((step) => step.contentId);
  if (new Set(contentIds).size !== contentIds.length) throw new Error("八字首读内容 ID 必须唯一");
  const availablePillarCount = interpretation.pillars.filter((reading) => reading.availability === "available").length;
  const allOccurrences = occurrenceReview.pillars.flatMap((pillar) => pillar.items);
  const counts = new Map<string, number>();
  for (const item of allOccurrences) counts.set(item.tenGod, (counts.get(item.tenGod) ?? 0) + 1);
  const repeatedTenGodCount = [...counts.values()].filter((count) => count > 1).length;
  const sourceRefIds = uniqueValues(steps.flatMap((step) => step.sourceRefIds));
  for (const sourceRefId of sourceRefIds) {
    if (!interpretation.sourceRefs.some((source) => source.id === sourceRefId)) {
      throw new Error(`八字首读来源不存在：${sourceRefId}`);
    }
  }
  return Object.freeze({
    profile: BAZI_FIRST_READ_REVIEW_PROFILE,
    steps,
    availablePillarCount,
    totalOccurrenceCount: occurrenceReview.occurrenceCount,
    repeatedTenGodCount,
    directSummary:
      `按固定四步阅读：先核对“${interpretation.strength.label}”候选的稳定性，再读 ${availablePillarCount}/4 柱十神，随后查看 ${repeatedTenGodCount} 类重复十神，神煞保持待主动打开。此顺序不选全盘第一主题。`,
    sourceRefIds: Object.freeze(sourceRefIds),
    knownBoundaries: Object.freeze([
      "四步顺序是信息架构，不是命理重要性排名。",
      "首读只摘要既有只读投影，不新增旺衰、十神、神煞或吉凶算法。",
      "重复次数不转为强度、评分或优先级。",
      "神煞在用户主动打开前保持 not_requested；不会因首读自动执行。",
      "selectedPrimaryTheme、expertFirstReadVerdict、overallGoodBad 与 result 固定为 null。"
    ]),
    selectedPrimaryTheme: null,
    expertFirstReadVerdict: null,
    overallGoodBad: null,
    result: null
  });
}
