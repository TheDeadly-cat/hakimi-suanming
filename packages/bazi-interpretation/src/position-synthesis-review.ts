import type {
  BaziInterpretationResult,
  PillarPosition,
  RelativeOrientation
} from "./index";
import {
  buildTenGodOrientationReview,
  type TenGodBalanceDirection
} from "./ten-god-orientation-review";
import type {
  ShenshaPillarPosition,
  ShenshaResearchResult
} from "./shensha-research";

export const BAZI_POSITION_SYNTHESIS_REVIEW_VERSION =
  "hakimi.bazi.position_synthesis_review/0.1.0" as const;

export const BAZI_POSITION_SYNTHESIS_REVIEW_PROFILE = Object.freeze({
  projectionVersion: BAZI_POSITION_SYNTHESIS_REVIEW_VERSION,
  calculationScope: "read_only_same_pillar_projection" as const,
  enabledByDefault: false,
  evidenceClass: "derived_read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  overallResultStatus: "withheld" as const
});

export interface BaziPositionSynthesisReviewItem {
  contentId: string;
  version: typeof BAZI_POSITION_SYNTHESIS_REVIEW_VERSION;
  position: PillarPosition;
  positionLabel: string;
  ganZhi: string;
  strengthBand: BaziInterpretationResult["strength"]["band"];
  strengthLabel: string;
  strengthSummary: string;
  tenGod: string | null;
  tenGodEditorialId: string | null;
  tenGodOrientation: RelativeOrientation;
  tenGodOrientationLabel: string;
  tenGodBalanceDirection: TenGodBalanceDirection;
  tenGodBalanceDirectionLabel: string;
  tenGodOverallGoodBad: null;
  tenGodPositionSummary: string;
  shenshaRuleId: ShenshaResearchResult["hits"][number]["ruleId"];
  shenshaName: string;
  shenshaPositionEditorialId: string;
  shenshaPositionSummary: string;
  directSummary: string;
  reviewQuestions: readonly [string, string, string];
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_projection";
  reviewStatus: "candidate_pending_expert_review";
  result: null;
  overallOrientation: null;
  shenshaOrientation: null;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface BaziPositionSynthesisReviewResult {
  profile: typeof BAZI_POSITION_SYNTHESIS_REVIEW_PROFILE;
  items: readonly BaziPositionSynthesisReviewItem[];
  knownGaps: readonly string[];
}

function requireSamePillarReading(
  interpretation: BaziInterpretationResult,
  position: ShenshaPillarPosition
): BaziInterpretationResult["pillars"][number] {
  const reading = interpretation.pillars.find((item) => item.position === position);
  if (!reading) {
    throw new Error(`同柱合参缺少${position}十神位置解读`);
  }
  if (reading.availability !== "available") {
    throw new Error(`同柱合参的${reading.positionLabel}可靠性与神煞命中不一致`);
  }
  return reading;
}

export function buildBaziPositionSynthesisReview(
  interpretation: BaziInterpretationResult,
  shensha: ShenshaResearchResult
): BaziPositionSynthesisReviewResult {
  const items: BaziPositionSynthesisReviewItem[] = [];
  const contentIds = new Set<string>();
  const orientationReviewByPosition = new Map(
    buildTenGodOrientationReview(interpretation).items.map((item) => [item.position, item] as const)
  );

  for (const hit of shensha.hits) {
    for (const candidate of hit.positionEditorialCandidates) {
      if (!hit.positions.includes(candidate.position)) {
        throw new Error(`神煞位置候选 ${candidate.contentId} 不在命中位置中`);
      }
      const reading = requireSamePillarReading(interpretation, candidate.position);
      const orientationReview = orientationReviewByPosition.get(candidate.position);
      if (!orientationReview || orientationReview.tenGod !== reading.focusTenGod) {
        throw new Error(`同柱合参缺少${reading.positionLabel}十神平衡方向复核项`);
      }
      const tenGodLabel = reading.focusTenGod ?? "未映射十神";
      const contentId =
        `hakimi.bazi.position_synthesis.${candidate.position}.${hit.ruleId}.${reading.focusTenGod ?? "unmapped"}.candidate.v0_1`;
      if (contentIds.has(contentId)) {
        throw new Error(`同柱合参内容 ID 重复：${contentId}`);
      }
      contentIds.add(contentId);

      const reviewQuestions = Object.freeze([
        `现实记录中，${candidate.positionLabel}的“${tenGodLabel}”位置主题与“${candidate.name}”议题是否同时出现，而非只命中其中一项？`,
        `当该柱表达失衡时，是否出现“${candidate.tensionToReview}”这类可以由经历核对的情境？`,
        `是否存在“${candidate.constructiveExpression}”的反例或替代解释，足以阻止把单项命中写成结果？`
      ]) as readonly [string, string, string];

      items.push(Object.freeze({
        contentId,
        version: BAZI_POSITION_SYNTHESIS_REVIEW_VERSION,
        position: candidate.position,
        positionLabel: candidate.positionLabel,
        ganZhi: reading.ganZhi,
        strengthBand: interpretation.strength.band,
        strengthLabel: interpretation.strength.label,
        strengthSummary: interpretation.strength.directSummary,
        tenGod: reading.focusTenGod,
        tenGodEditorialId: reading.editorialId,
        tenGodOrientation: reading.orientation,
        tenGodOrientationLabel: reading.orientationLabel,
        tenGodBalanceDirection: orientationReview.balanceDirection,
        tenGodBalanceDirectionLabel: orientationReview.balanceDirectionLabel,
        tenGodOverallGoodBad: null,
        tenGodPositionSummary: reading.directSummary,
        shenshaRuleId: hit.ruleId,
        shenshaName: candidate.name,
        shenshaPositionEditorialId: candidate.contentId,
        shenshaPositionSummary: candidate.directSummary,
        directSummary:
          `${candidate.positionLabel}把${tenGodLabel}位置解读与${candidate.name}议题放进同一事实包。${orientationReview.balanceDirectionLabel}只来自十神相对当前日主“${interpretation.strength.label}”候选的扶抑方向；${candidate.name}不参与这个标签，十神综合喜忌与同柱综合结果继续为 null。`,
        reviewQuestions,
        sourceRefIds: Object.freeze([
          ...new Set([
            ...reading.sourceRefIds,
            ...orientationReview.sourceRefIds,
            ...candidate.sourceRefIds,
            ...hit.sourceRefIds
          ])
        ]),
        evidenceClass: "derived_read_only_projection",
        reviewStatus: "candidate_pending_expert_review",
        result: null,
        overallOrientation: null,
        shenshaOrientation: null,
        expertTruthClaimed: false,
        directOutcomeAllowed: false,
        scoringAllowed: false,
        doesNotEstablish:
          "本包只并排连接同柱已有旺衰、十神与神煞候选；不能单独证明全盘吉凶、神煞吉凶、现实事件、时间结果或任何身份结论。"
      }));
    }
  }

  return Object.freeze({
    profile: BAZI_POSITION_SYNTHESIS_REVIEW_PROFILE,
    items: Object.freeze(items),
    knownGaps: Object.freeze([
      "同柱合参只连接已经显示的事实和候选，没有新增五行、十神或神煞规则。",
      "可能补偏、可能增偏或条件性只继承十神相对旺衰的扶抑方向，不转移为十神综合喜忌、神煞或同柱综合吉凶。",
      "尚未处理同柱干支整体、刑冲合害、生旺空亡、格局、调候、运限引动与现实事件时序。",
      "所有综合结果固定为 null，仍需命理专家逐条复核和用户现实记录校验。"
    ])
  });
}
