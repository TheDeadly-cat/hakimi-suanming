import type {
  BrowserProbeDisplayPalace,
  BrowserProbeMajorStarPalaceCombinationReview,
  BrowserProbeMajorStarSameStarSynthesisReview,
  BrowserProbeMajorStarSourceRef
} from "./browser-protocol.ts";
import { ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES } from "./major-star-combination-review.ts";
import { ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES } from "./major-star-palace-content.ts";

export const ZIWEI_MAJOR_STAR_SAME_STAR_SYNTHESIS_REVIEW_VERSION =
  "ziwei.major_star_all_palaces.same_star_synthesis_review/0.1" as const;

type SameStarSynthesisInput = Readonly<{
  palaces: readonly BrowserProbeDisplayPalace[];
  combinationReviews: readonly BrowserProbeMajorStarPalaceCombinationReview[];
}>;

export function createMajorStarSameStarSynthesisReviews(
  input: SameStarSynthesisInput
): readonly BrowserProbeMajorStarSameStarSynthesisReview[] {
  const reviews = input.combinationReviews.map((combinationReview) => {
    const palace = input.palaces.find(
      (candidate) => candidate.earthlyBranchId === combinationReview.palaceEarthlyBranchId
    );
    if (!palace || palace.roleId !== combinationReview.palaceRoleId) {
      throw new Error(`逐星合参缺少宫位 ${combinationReview.palaceRoleId}/${combinationReview.palaceEarthlyBranchId}`);
    }
    const star = palace.stars.find((candidate) => candidate.starId === combinationReview.starId);
    const positionCandidate = star?.palaceCandidateContent;
    if (!star || star.category !== "major" || !positionCandidate) {
      throw new Error(`逐星合参 ${combinationReview.starId} 缺少同宫主星或位置候选`);
    }
    if (positionCandidate.contentId !== combinationReview.candidateContentId
      || positionCandidate.palaceRoleId !== combinationReview.palaceRoleId
      || positionCandidate.label !== combinationReview.label) {
      throw new Error(`逐星合参 ${combinationReview.reviewId} 的位置候选与事实包不一致`);
    }

    const sourceRefs = Object.freeze<readonly BrowserProbeMajorStarSourceRef[]>([
      ...positionCandidate.sourceRefs,
      ...combinationReview.sourceRefs
    ]);
    const reviewQuestions = Object.freeze([
      `${combinationReview.label}落${combinationReview.palaceRoleLabel}的位置主线与现实经历有哪些吻合、反例或情境限制？`,
      `亮度“${combinationReview.selfState.brightnessLabel ?? "未标注"}”及生年四化“${combinationReview.selfState.transformations.join("、") || "无标记"}”在选定流派中如何调节位置主线？`,
      `同宫、对宫和两组三合位的星曜应如何补充、牵制或保留冲突？请逐条给出规则与来源，不按星数相加。`,
      "在缺少流派权重、现实记录与专家复核时，哪些吉凶、身份、事件和时间结论必须继续为空？"
    ] as const);

    return Object.freeze<BrowserProbeMajorStarSameStarSynthesisReview>({
      synthesisId: `ziwei.synthesis.same_star.${combinationReview.starId.split(".").at(-1)}.${combinationReview.palaceRoleId}.${combinationReview.palaceEarthlyBranchId}.v0_1`,
      synthesisVersion: ZIWEI_MAJOR_STAR_SAME_STAR_SYNTHESIS_REVIEW_VERSION,
      synthesisKind: "derived_same_star_reading_package",
      starId: combinationReview.starId,
      label: combinationReview.label,
      palaceEarthlyBranchId: combinationReview.palaceEarthlyBranchId,
      palaceEarthlyBranchLabel: combinationReview.palaceEarthlyBranchLabel,
      palaceRoleId: combinationReview.palaceRoleId,
      palaceRoleLabel: combinationReview.palaceRoleLabel,
      candidateContentId: positionCandidate.contentId,
      combinationReviewId: combinationReview.reviewId,
      directStatement:
        `${positionCandidate.positionSummary} 当前已验真盘面同时见：${combinationReview.factSummary} `
        + "两段内容先并列成复核队列，不把庙旺、四化名称、同宫数量或三方关系自动换算为好坏。",
      readingOrderStatement:
        "阅读顺序：先看星落宫的位置主线，再核对本星亮度与生年四化，随后看同宫、对宫和两组三合位；出现矛盾时保留矛盾，不按星数或标签相加。",
      scopeNote:
        "本包只组织现有位置候选与已验真的本命盘面事实；不含宫干／运限四化、格局识别、流派权重、现实验证或专家结论。",
      positionCandidate,
      combinationReview,
      reviewQuestions,
      sourceRefs,
      evidenceClass: "derived_same_star_projection",
      result: null,
      goodBadOrientation: null,
      eventOutcome: null,
      reviewStatus: "awaiting_expert_review",
      publicationStatus: "isolated_review_only",
      factsDerivedFromVerifiedArtifact: true,
      editorialCandidateIncluded: true,
      expertInterpretationIncluded: false,
      expertTruthClaimed: false,
      directOutcomeAllowed: false,
      scoringAllowed: false
    });
  });

  return validateSameStarSynthesisReviews(input, reviews);
}

function validateSameStarSynthesisReviews(
  input: SameStarSynthesisInput,
  reviews: readonly BrowserProbeMajorStarSameStarSynthesisReview[]
): readonly BrowserProbeMajorStarSameStarSynthesisReview[] {
  const expectedCount = input.palaces.reduce(
    (count, palace) => count + palace.stars.filter((star) => star.category === "major").length,
    0
  );
  if (input.combinationReviews.length !== expectedCount || reviews.length !== expectedCount) {
    throw new Error(`逐星合参复核包应有 ${expectedCount} 条，实际为 ${reviews.length} 条`);
  }

  const synthesisIds = new Set<string>();
  const combinationReviewIds = new Set<string>();
  const sourceIds = new Set([
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceId)
  ]);
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u;
  for (const review of reviews) {
    if (synthesisIds.has(review.synthesisId)) throw new Error(`逐星合参 ID 重复：${review.synthesisId}`);
    if (combinationReviewIds.has(review.combinationReviewId)) {
      throw new Error(`逐星合参重复绑定组合事实包：${review.combinationReviewId}`);
    }
    if (review.sourceRefs.length !== 6
      || new Set(review.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 6
      || review.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId))) {
      throw new Error(`逐星合参 ${review.synthesisId} 的来源引用不完整`);
    }
    if (review.reviewQuestions.length !== 4 || new Set(review.reviewQuestions).size !== 4) {
      throw new Error(`逐星合参 ${review.synthesisId} 必须有四个不同的复核问题`);
    }
    if (review.combinationReview.result !== null
      || review.combinationReview.sanfang.length !== 3
      || review.combinationReview.candidateContentId !== review.positionCandidate.contentId) {
      throw new Error(`逐星合参 ${review.synthesisId} 没有绑定完整的 result:null 事实包`);
    }
    if (riskyOutcomeLanguage.test(`${review.directStatement}${review.readingOrderStatement}${review.scopeNote}`)) {
      throw new Error(`逐星合参 ${review.synthesisId} 含结果化措辞`);
    }
    if (review.result !== null || review.goodBadOrientation !== null || review.eventOutcome !== null
      || review.expertInterpretationIncluded || review.expertTruthClaimed
      || review.directOutcomeAllowed || review.scoringAllowed) {
      throw new Error(`逐星合参 ${review.synthesisId} 越过待审边界`);
    }
    synthesisIds.add(review.synthesisId);
    combinationReviewIds.add(review.combinationReviewId);
  }
  return Object.freeze([...reviews]);
}
