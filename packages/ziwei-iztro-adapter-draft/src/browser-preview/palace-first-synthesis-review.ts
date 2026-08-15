import type {
  BrowserProbeCombinationStarFact,
  BrowserProbeDisplayPalace,
  BrowserProbeDisplaySanfangGroup,
  BrowserProbeDisplayStar,
  BrowserProbeMajorStarSameStarSynthesisReview,
  BrowserProbeMajorStarSourceRef,
  BrowserProbePalaceFirstMemberFact,
  BrowserProbePalaceFirstSynthesisReview,
  BrowserProbePalaceRoleId,
  BrowserProbeSanfangProjectionRule
} from "./browser-protocol.ts";
import { ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES } from "./major-star-combination-review.ts";
import {
  requirePalaceRoleCandidateContent,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES,
  ZIWEI_PALACE_ROLE_IDS
} from "./major-star-palace-content.ts";

export const ZIWEI_PALACE_FIRST_SYNTHESIS_REVIEW_VERSION =
  "ziwei.palace_sanfang.first_reading_review/0.1" as const;

type PalaceFirstSynthesisInput = Readonly<{
  palaces: readonly BrowserProbeDisplayPalace[];
  sanfangGroups: readonly BrowserProbeDisplaySanfangGroup[];
  sameStarSyntheses: readonly BrowserProbeMajorStarSameStarSynthesisReview[];
  sanfangProjectionRule: BrowserProbeSanfangProjectionRule;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

export function createPalaceFirstSynthesisReviews(
  input: PalaceFirstSynthesisInput
): readonly BrowserProbePalaceFirstSynthesisReview[] {
  requireSha256(input.ruleSnapshotSha256, "ruleSnapshotSha256");
  requireSha256(input.artifactFactsSha256, "artifactFactsSha256");

  const reviews = input.sanfangGroups.map((group) => {
    const target = group.members.find((member) => member.relation === "self")?.palace
      ?? fail(`逐宫直读复核包缺少本宫 ${group.targetEarthlyBranchId}`);
    const targetPalaceRoleId = requirePalaceRoleId(target.roleId);
    if (group.targetEarthlyBranchId !== target.earthlyBranchId
      || group.targetRoleId !== targetPalaceRoleId) {
      return fail(`逐宫直读复核包的目标宫位与三方四正事实组不一致：${group.targetEarthlyBranchId}`);
    }
    const palaceRoleContent = requirePalaceRoleCandidateContent(targetPalaceRoleId)
      ?? fail(`逐宫直读复核包缺少 ${targetPalaceRoleId} 问题域候选`);

    const members = Object.freeze(group.members.map((member) => projectMemberFact(member.palace, {
      relation: member.relation,
      relationLabel: member.relationLabel
    })));
    const targetMember = members.find((member) => member.relation === "self")
      ?? fail(`逐宫直读复核包缺少本宫事实 ${group.targetEarthlyBranchId}`);
    const groupSyntheses = Object.freeze(group.members.flatMap((member) => (
      member.palace.stars
        .filter((star) => star.category === "major")
        .map((star) => requireSameStarSynthesis(
          input.sameStarSyntheses,
          member.palace.earthlyBranchId,
          star
        ))
    )));
    const targetSyntheses = Object.freeze(groupSyntheses.filter(
      (synthesis) => synthesis.palaceEarthlyBranchId === target.earthlyBranchId
    ));
    const targetPositionStatements = Object.freeze(
      targetSyntheses.map((synthesis) => synthesis.positionCandidate.positionSummary)
    );
    const targetMainStarState = targetMember.majorStars.length > 0
      ? "present" as const
      : "empty_in_verified_facts" as const;
    const emptyMainStarBoundary = targetMainStarState === "empty_in_verified_facts"
      ? "本宫在已验真盘面无十四主星（仅事实状态）；当前包不自动借用对宫或两组三合位主星，也不据此补写本宫位置主线。"
      : null;
    const groupFactSummary = `${members.map(memberFactSummary).join("；")}。`;
    const directStatement = targetMainStarState === "present"
      ? `${palaceRoleContent.palaceRoleLabel}问题域：${palaceRoleContent.domainSummary}。`
        + `本宫${target.heavenlyStemLabel}${target.earthlyBranchLabel}主星见${targetMember.majorStars.map(formatStarFact).join("、")}。`
        + `位置主线：${targetPositionStatements.join(" ")}三方四正事实：${groupFactSummary}`
        + "以上先形成逐宫复核队列，不按星数、亮度或四化标签相加。"
      : `${palaceRoleContent.palaceRoleLabel}问题域：${palaceRoleContent.domainSummary}。`
        + `${emptyMainStarBoundary}三方四正事实：${groupFactSummary}`
        + "以上只形成逐宫事实队列，不把空宫或会照关系自动换算为好坏。";
    const sourceRefs = mergeSourceRefs([
      ...palaceRoleContent.sourceRefs,
      ...groupSyntheses.flatMap((synthesis) => synthesis.sourceRefs),
      Object.freeze({
        sourceId: input.sanfangProjectionRule.ruleId,
        locator: "三方四正／目标宫、自宫、对宫与两组三合位的几何投影"
      })
    ]);
    const reviewQuestions = Object.freeze([
      `${palaceRoleContent.palaceRoleLabel}的问题域与现实资料有哪些吻合、反例或情境限制？`,
      targetMainStarState === "present"
        ? `本宫主星${targetMember.majorStars.map((star) => star.label).join("、")}的位置主线如何并列，哪些内容必须保留冲突而不能合并？`
        : "本宫无十四主星时，选定流派是否保持空值？若允许借星，必须提供何种规则、来源与适用条件？",
      `对宫与两组三合位的${groupSyntheses.map((synthesis) => synthesis.label).join("、") || "主星空值"}应如何补充或牵制本宫问题域？请逐项给规则与反例。`,
      "在缺少流派权重、现实记录与专家复核时，哪些好坏、身份、事件和时间结论必须继续为空？"
    ] as const);

    return Object.freeze<BrowserProbePalaceFirstSynthesisReview>({
      reviewId: `ziwei.review.palace_first.${targetPalaceRoleId}.${target.earthlyBranchId}.v0_1`,
      reviewVersion: ZIWEI_PALACE_FIRST_SYNTHESIS_REVIEW_VERSION,
      reviewKind: "derived_palace_first_reading_package",
      targetEarthlyBranchId: target.earthlyBranchId,
      targetEarthlyBranchLabel: target.earthlyBranchLabel,
      targetHeavenlyStemLabel: target.heavenlyStemLabel,
      targetPalaceRoleId,
      targetPalaceRoleLabel: palaceRoleContent.palaceRoleLabel,
      palaceRoleContent,
      targetMainStarState,
      targetMajorStars: targetMember.majorStars,
      targetStarSynthesisIds: Object.freeze(targetSyntheses.map((synthesis) => synthesis.synthesisId)),
      groupMajorStarSynthesisIds: Object.freeze(groupSyntheses.map((synthesis) => synthesis.synthesisId)),
      targetPositionStatements,
      members,
      ruleSnapshotSha256: input.ruleSnapshotSha256,
      artifactFactsSha256: input.artifactFactsSha256,
      groupFactSummary,
      directStatement,
      readingOrderStatement:
        "阅读顺序：先看本宫问题域与本宫主星位置主线，再核对本宫亮度和生年四化，随后看对宫与两组三合位；出现矛盾时保留矛盾，不按星数或标签相加。",
      emptyMainStarBoundary,
      scopeNote:
        "本包只组织既有宫位问题域候选、逐星位置候选与已验真的本命盘面事实；不含借星规则、宫干／运限四化、格局识别、流派权重、现实验证或专家结论。",
      reviewQuestions,
      sourceRefs,
      evidenceClass: "derived_palace_first_projection",
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

  return validatePalaceFirstSynthesisReviews(input, reviews);
}

function projectMemberFact(
  palace: BrowserProbeDisplayPalace,
  relation: Readonly<{
    relation: BrowserProbePalaceFirstMemberFact["relation"];
    relationLabel: string;
  }>
): BrowserProbePalaceFirstMemberFact {
  const palaceRoleId = requirePalaceRoleId(palace.roleId);
  const palaceRoleContent = requirePalaceRoleCandidateContent(palaceRoleId)
    ?? fail(`逐宫直读复核包缺少 ${palaceRoleId} 问题域候选`);
  return Object.freeze({
    relation: relation.relation,
    relationLabel: relation.relationLabel,
    palaceEarthlyBranchId: palace.earthlyBranchId,
    palaceEarthlyBranchLabel: palace.earthlyBranchLabel,
    palaceRoleId,
    palaceRoleLabel: palaceRoleContent.palaceRoleLabel,
    majorStars: Object.freeze(palace.stars.filter((star) => star.category === "major").map(projectStarFact)),
    transformationStars: Object.freeze(
      palace.stars.filter((star) => star.transformations.length > 0).map(projectStarFact)
    ),
    otherStarCount: palace.stars.filter((star) => star.category !== "major").length
  });
}

function projectStarFact(star: BrowserProbeDisplayStar): BrowserProbeCombinationStarFact {
  return Object.freeze({
    starId: star.starId,
    label: star.label,
    category: star.category,
    brightnessLabel: star.brightnessLabel,
    transformations: Object.freeze([...star.transformations])
  });
}

function requireSameStarSynthesis(
  syntheses: readonly BrowserProbeMajorStarSameStarSynthesisReview[],
  palaceEarthlyBranchId: string,
  star: BrowserProbeDisplayStar
): BrowserProbeMajorStarSameStarSynthesisReview {
  const matches = syntheses.filter((synthesis) => (
    synthesis.palaceEarthlyBranchId === palaceEarthlyBranchId
      && synthesis.starId === star.starId
  ));
  if (matches.length !== 1) {
    return fail(`逐宫直读要求 ${palaceEarthlyBranchId}/${star.starId} 恰有一份逐星合参复核包`);
  }
  return matches[0]!;
}

function memberFactSummary(member: BrowserProbePalaceFirstMemberFact): string {
  const majorStars = member.majorStars.length > 0
    ? member.majorStars.map(formatStarFact).join("、")
    : "无主星（仅事实状态）";
  const transformations = member.transformationStars.flatMap((star) => (
    star.transformations.map((transformation) => `${star.label}化${transformation}`)
  ));
  return `${member.relationLabel}${member.palaceRoleLabel}（${member.palaceEarthlyBranchLabel}）见${majorStars}`
    + `，辅／杂曜${member.otherStarCount}颗，生年四化${transformations.join("、") || "无标记"}`;
}

function formatStarFact(star: BrowserProbeCombinationStarFact): string {
  const markers = [star.brightnessLabel, ...star.transformations].filter(Boolean);
  return markers.length > 0 ? `${star.label}〔${markers.join("·")}〕` : star.label;
}

function mergeSourceRefs(
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[]
): readonly BrowserProbeMajorStarSourceRef[] {
  const bySourceId = new Map<string, BrowserProbeMajorStarSourceRef>();
  for (const sourceRef of sourceRefs) {
    if (!bySourceId.has(sourceRef.sourceId)) bySourceId.set(sourceRef.sourceId, sourceRef);
  }
  return Object.freeze([...bySourceId.values()]);
}

function validatePalaceFirstSynthesisReviews(
  input: PalaceFirstSynthesisInput,
  reviews: readonly BrowserProbePalaceFirstSynthesisReview[]
): readonly BrowserProbePalaceFirstSynthesisReview[] {
  if (input.palaces.length !== 12 || input.sanfangGroups.length !== 12 || reviews.length !== 12) {
    throw new Error(`逐宫直读复核包要求十二宫、十二组三方四正与十二份结果，实际为 ${input.palaces.length}/${input.sanfangGroups.length}/${reviews.length}`);
  }
  const expectedRelations = ["self", "opposite_plus_6", "trine_plus_4", "trine_minus_4"];
  const sourceIds = new Set([
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceId),
    input.sanfangProjectionRule.ruleId
  ]);
  const reviewIds = new Set<string>();
  const targetBranches = new Set<string>();
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u;
  for (const review of reviews) {
    if (reviewIds.has(review.reviewId)) throw new Error(`逐宫直读复核 ID 重复：${review.reviewId}`);
    if (targetBranches.has(review.targetEarthlyBranchId)) {
      throw new Error(`逐宫直读重复绑定目标宫位：${review.targetEarthlyBranchId}`);
    }
    if (review.members.map((member) => member.relation).join("|") !== expectedRelations.join("|")
      || new Set(review.members.map((member) => member.palaceEarthlyBranchId)).size !== 4) {
      throw new Error(`逐宫直读 ${review.reviewId} 的本宫、对宫与两组三合位不完整`);
    }
    const self = review.members[0]!;
    if (self.palaceEarthlyBranchId !== review.targetEarthlyBranchId
      || self.palaceRoleId !== review.targetPalaceRoleId
      || self.majorStars.length !== review.targetMajorStars.length) {
      throw new Error(`逐宫直读 ${review.reviewId} 的本宫事实与目标不一致`);
    }
    const groupMajorStarCount = review.members.reduce(
      (count, member) => count + member.majorStars.length,
      0
    );
    if (review.groupMajorStarSynthesisIds.length !== groupMajorStarCount
      || new Set(review.groupMajorStarSynthesisIds).size !== groupMajorStarCount
      || review.targetStarSynthesisIds.length !== review.targetMajorStars.length
      || review.targetPositionStatements.length !== review.targetMajorStars.length) {
      throw new Error(`逐宫直读 ${review.reviewId} 未完整绑定逐星合参复核包`);
    }
    const expectsEmpty = review.targetMajorStars.length === 0;
    if ((expectsEmpty && review.targetMainStarState !== "empty_in_verified_facts")
      || (!expectsEmpty && review.targetMainStarState !== "present")
      || (expectsEmpty && !review.emptyMainStarBoundary?.includes("不自动借用"))
      || (!expectsEmpty && review.emptyMainStarBoundary !== null)) {
      throw new Error(`逐宫直读 ${review.reviewId} 的空宫失败关闭边界不一致`);
    }
    const requiredSourceIds = new Set([
      ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId),
      ...(groupMajorStarCount > 0
        ? ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceId)
        : []),
      input.sanfangProjectionRule.ruleId
    ]);
    const reviewSourceIds = new Set(review.sourceRefs.map((sourceRef) => sourceRef.sourceId));
    if (reviewSourceIds.size !== review.sourceRefs.length
      || review.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)
      || [...requiredSourceIds].some((sourceId) => !reviewSourceIds.has(sourceId))) {
      throw new Error(`逐宫直读 ${review.reviewId} 的来源引用不完整`);
    }
    if (review.ruleSnapshotSha256 !== input.ruleSnapshotSha256
      || review.artifactFactsSha256 !== input.artifactFactsSha256) {
      throw new Error(`逐宫直读 ${review.reviewId} 的事实摘要绑定不一致`);
    }
    if (review.reviewQuestions.length !== 4 || new Set(review.reviewQuestions).size !== 4) {
      throw new Error(`逐宫直读 ${review.reviewId} 必须有四个不同的复核问题`);
    }
    if (riskyOutcomeLanguage.test(
      `${review.groupFactSummary}${review.directStatement}${review.readingOrderStatement}${review.scopeNote}`
    )) {
      throw new Error(`逐宫直读 ${review.reviewId} 含结果化措辞`);
    }
    if (review.result !== null || review.goodBadOrientation !== null || review.eventOutcome !== null
      || review.expertInterpretationIncluded || review.expertTruthClaimed
      || review.directOutcomeAllowed || review.scoringAllowed) {
      throw new Error(`逐宫直读 ${review.reviewId} 越过待审边界`);
    }
    reviewIds.add(review.reviewId);
    targetBranches.add(review.targetEarthlyBranchId);
  }

  for (const synthesis of input.sameStarSyntheses) {
    const targetUseCount = reviews.filter(
      (review) => review.targetStarSynthesisIds.includes(synthesis.synthesisId)
    ).length;
    const groupUseCount = reviews.filter(
      (review) => review.groupMajorStarSynthesisIds.includes(synthesis.synthesisId)
    ).length;
    if (targetUseCount !== 1 || groupUseCount !== 4
      || synthesis.combinationReview.ruleSnapshotSha256 !== input.ruleSnapshotSha256
      || synthesis.combinationReview.artifactFactsSha256 !== input.artifactFactsSha256) {
      throw new Error(`逐宫直读对逐星包 ${synthesis.synthesisId} 的复用关系或摘要绑定不一致`);
    }
  }
  return Object.freeze([...reviews]);
}

function requirePalaceRoleId(value: string): BrowserProbePalaceRoleId {
  if (!(ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value)) {
    return fail(`逐宫直读收到未知宫位角色 ${value}`);
  }
  return value as BrowserProbePalaceRoleId;
}

function requireSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} 不是小写十六进制 SHA-256`);
}

function fail(message: string): never {
  throw new Error(message);
}
