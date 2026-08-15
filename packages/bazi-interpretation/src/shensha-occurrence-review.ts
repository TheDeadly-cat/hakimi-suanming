import type { ChartFacts } from "@hakimi/contracts";
import type {
  ShenshaPillarPosition,
  ShenshaResearchResult,
  ShenshaRuleDefinition
} from "./shensha-research";

export const BAZI_SHENSHA_OCCURRENCE_REVIEW_VERSION =
  "hakimi.bazi.shensha_occurrence_review/0.1.0" as const;

export const BAZI_SHENSHA_OCCURRENCE_REVIEW_PROFILE = Object.freeze({
  projectionVersion: BAZI_SHENSHA_OCCURRENCE_REVIEW_VERSION,
  calculationScope: "registered_hit_occurrences_grouped_by_pillar" as const,
  visibleAfterExplicitResearchPreview: true,
  formalLayerActivated: false,
  evidenceClass: "derived_read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  interpretationStatus: "withheld" as const,
  scoringAllowed: false
});

export interface ShenshaOccurrenceReviewItem {
  contentId: string;
  version: typeof BAZI_SHENSHA_OCCURRENCE_REVIEW_VERSION;
  position: ShenshaPillarPosition;
  positionLabel: string;
  ganZhi: string;
  matchedBranch: string;
  ruleId: ShenshaRuleDefinition["id"];
  name: ShenshaRuleDefinition["name"];
  basis: ShenshaRuleDefinition["basis"];
  basisLabel: ShenshaRuleDefinition["basisLabel"];
  basisValue: string;
  targetBranches: readonly string[];
  matchStatement: string;
  sourceLocator: string;
  editorialId: string;
  directSummary: string;
  constructiveExpression: string;
  tensionToReview: string;
  reviewPrompt: string;
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_projection";
  reviewStatus: "candidate_pending_expert_review";
  interpretation: null;
  shenshaOrientation: null;
  overallGoodBad: null;
  eventOutcome: null;
  result: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface ShenshaOccurrencePillarReview {
  position: ShenshaPillarPosition;
  positionLabel: string;
  ganZhi: string;
  availability: "available" | "uncertain_hour";
  occurrenceCount: number;
  items: readonly ShenshaOccurrenceReviewItem[];
  result: null;
  overallGoodBad: null;
  doesNotEstablish: string;
}

export interface ShenshaOccurrenceReviewResult {
  profile: typeof BAZI_SHENSHA_OCCURRENCE_REVIEW_PROFILE;
  pillars: readonly ShenshaOccurrencePillarReview[];
  occurrenceCount: number;
  withheldPositions: readonly ShenshaPillarPosition[];
  knownGaps: readonly string[];
}

const pillarOrder: readonly ShenshaPillarPosition[] = ["year", "month", "day", "hour"];

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function basisValueFor(facts: ChartFacts, basis: ShenshaRuleDefinition["basis"]): string {
  return basis === "year_branch" ? facts.pillars.year.branch : facts.pillars.year.stem;
}

function buildOccurrenceItems(
  facts: ChartFacts,
  shensha: ShenshaResearchResult
): ShenshaOccurrenceReviewItem[] {
  const items: ShenshaOccurrenceReviewItem[] = [];
  const excluded = new Set(shensha.excludedPositions);

  if (excluded.size !== shensha.excludedPositions.length) {
    throw new Error("神煞按柱出现项的关闭位置重复");
  }
  if ([...excluded].some((position) => position !== "hour")) {
    throw new Error("当前神煞研究协议只允许因时辰不可靠而关闭时柱");
  }

  for (const hit of shensha.hits) {
    const rule = shensha.rules.find((candidate) => candidate.id === hit.ruleId);
    if (!rule) throw new Error(`神煞按柱出现项找不到规则：${hit.ruleId}`);
    const basisValue = basisValueFor(facts, rule.basis);
    const targetByBasis: Readonly<Record<string, readonly string[]>> = rule.targetByBasis;
    const targetBranches = targetByBasis[basisValue] ?? [];
    if (
      hit.name !== rule.name
      || hit.basis !== rule.basis
      || hit.basisLabel !== rule.basisLabel
      || hit.basisValue !== basisValue
      || !arraysEqual(hit.targetBranches, targetBranches)
      || !arraysEqual(hit.sourceRefIds, rule.sourceRefIds)
      || hit.sourceLocator !== rule.sourceLocator
      || hit.reviewStatus !== rule.reviewStatus
      || hit.interpretation !== null
    ) {
      throw new Error(`${hit.name}命中事实与当前规则注册表不一致`);
    }
    if (
      hit.positions.length !== hit.positionLabels.length
      || hit.positions.length !== hit.positionEditorialCandidates.length
      || new Set(hit.positions).size !== hit.positions.length
    ) {
      throw new Error(`${hit.name}命中位置、标签与位置候选没有逐项对齐`);
    }

    const expectedMatchedBranches = [...new Set(
      hit.positions.map((position) => facts.pillars[position].branch)
    )];
    if (!arraysEqual(hit.matchedBranches, expectedMatchedBranches)) {
      throw new Error(`${hit.name}实际命中支与命中位置不一致`);
    }

    hit.positions.forEach((position, index) => {
      if (excluded.has(position)) {
        throw new Error(`${hit.name}命中了已关闭的${facts.pillars[position].label}`);
      }
      const pillar = facts.pillars[position];
      const editorial = hit.positionEditorialCandidates[index];
      if (
        hit.positionLabels[index] !== pillar.label
        || editorial.position !== position
        || editorial.positionLabel !== pillar.label
        || editorial.ruleId !== hit.ruleId
        || editorial.name !== hit.name
      ) {
        throw new Error(`${hit.name}${pillar.label}的位置候选映射不一致`);
      }
      if (
        !hit.targetBranches.includes(pillar.branch)
        || !hit.matchedBranches.includes(pillar.branch)
      ) {
        throw new Error(`${hit.name}${pillar.label}地支不满足当前命中事实`);
      }

      items.push(Object.freeze({
        contentId: `hakimi.bazi.shensha_occurrence.${hit.ruleId}.${position}.candidate.v0_1`,
        version: BAZI_SHENSHA_OCCURRENCE_REVIEW_VERSION,
        position,
        positionLabel: pillar.label,
        ganZhi: pillar.ganZhi,
        matchedBranch: pillar.branch,
        ruleId: hit.ruleId,
        name: hit.name,
        basis: hit.basis,
        basisLabel: hit.basisLabel,
        basisValue: hit.basisValue,
        targetBranches: Object.freeze([...hit.targetBranches]),
        matchStatement:
          `以${hit.basisLabel}${hit.basisValue}取${hit.targetBranches.join("、")}；${pillar.label}${pillar.ganZhi}的地支${pillar.branch}命中。`,
        sourceLocator: rule.sourceLocator,
        editorialId: editorial.contentId,
        directSummary: editorial.directSummary,
        constructiveExpression: editorial.constructiveExpression,
        tensionToReview: editorial.tensionToReview,
        reviewPrompt: editorial.reviewPrompt,
        sourceRefIds: Object.freeze([...new Set([
          ...hit.sourceRefIds,
          ...editorial.sourceRefIds
        ])]),
        evidenceClass: "derived_read_only_projection",
        reviewStatus: "candidate_pending_expert_review",
        interpretation: null,
        shenshaOrientation: null,
        overallGoodBad: null,
        eventOutcome: null,
        result: null,
        expertTruthClaimed: false,
        scoringAllowed: false,
        doesNotEstablish:
          "按柱出现项只把已经命中的神煞事实连接到对应位置议题；不能单独证明神煞强弱、喜忌、事件、时间结果或任何身份结论。"
      }));
    });
  }

  if (new Set(items.map((item) => item.contentId)).size !== items.length) {
    throw new Error("全盘神煞按柱出现项内容 ID 重复");
  }
  return items;
}

export function buildShenshaOccurrenceReview(
  facts: ChartFacts,
  shensha: ShenshaResearchResult
): ShenshaOccurrenceReviewResult {
  const items = buildOccurrenceItems(facts, shensha);
  const withheld = new Set(shensha.excludedPositions);
  const pillars = pillarOrder.map((position): ShenshaOccurrencePillarReview => {
    const pillar = facts.pillars[position];
    const availability = withheld.has(position) ? "uncertain_hour" : "available";
    const pillarItems = items.filter((item) => item.position === position);
    if (availability === "uncertain_hour" && pillarItems.length) {
      throw new Error(`${pillar.label}已关闭却仍含神煞出现项`);
    }
    return Object.freeze({
      position,
      positionLabel: pillar.label,
      ganZhi: pillar.ganZhi,
      availability,
      occurrenceCount: pillarItems.length,
      items: Object.freeze(pillarItems),
      result: null,
      overallGoodBad: null,
      doesNotEstablish: availability === "available"
        ? "本柱数量只表示当前五条年干/年支基准候选的事实命中数；零项不表示没有其他神煞，多项也不形成吉凶分。"
        : "时辰不可靠时，不列出或解释任何时柱神煞出现项。"
    });
  });

  return Object.freeze({
    profile: BAZI_SHENSHA_OCCURRENCE_REVIEW_PROFILE,
    pillars: Object.freeze(pillars),
    occurrenceCount: items.length,
    withheldPositions: Object.freeze([...shensha.excludedPositions]),
    knownGaps: Object.freeze([
      "按柱投影只重排现有五条神煞候选的命中事实，没有新增、替换或扩大取法。",
      "同一神煞命中多柱时逐柱保留，不合并为次数分数，也不据数量判断吉凶。",
      "日干/日支异法、生旺、冲破、空亡、组合与运限仍未裁决。",
      "所有 interpretation、shenshaOrientation、overallGoodBad、eventOutcome 与 result 固定为 null。"
    ])
  });
}
