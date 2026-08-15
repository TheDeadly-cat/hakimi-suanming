import type {
  BrowserProbeCombinationStarFact,
  BrowserProbeDisplayPalace,
  BrowserProbeDisplaySanfangGroup,
  BrowserProbeDisplayStar,
  BrowserProbeMajorStarCombinationReviewSource,
  BrowserProbeMajorStarCombinationSanfangFact,
  BrowserProbeMajorStarPalaceCombinationReview,
  BrowserProbePalaceRoleId,
  BrowserProbeMajorStarSourceRef
} from "./browser-protocol.ts";
import { ZIWEI_PALACE_ROLE_IDS } from "./major-star-palace-content.ts";

export const ZIWEI_MAJOR_STAR_PALACE_COMBINATION_REVIEW_VERSION =
  "ziwei.major_star_all_palaces.combination_review/0.2" as const;

const BRIGHTNESS_SOURCE_ID = "ziwei.modern.iztro.star_brightness.review_boundary.2026_08_12";
const MUTAGEN_SOURCE_ID = "ziwei.modern.iztro.mutagen.review_boundary.2026_08_12";
const RELATION_SOURCE_ID = "ziwei.technical.iztro.same_palace_sanfang_terms.2026_08_12";
const CLASSICAL_SOURCE_ID = "ziwei.classic.zwdsql.volume3.combination_order.wikisource.2026_08_12";

export const ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES = Object.freeze<
  readonly BrowserProbeMajorStarCombinationReviewSource[]
>([
  Object.freeze({
    sourceId: BRIGHTNESS_SOURCE_ID,
    sourceKind: "modern_original_brightness_learning_material",
    title: "紫微斗数星曜系统·星曜亮度｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/zh_TW/learn/star",
    accessedAt: "2026-08-12",
    usageBoundary: "仅说明亮度是需注明流派口径的调节条件；保留盘面原值，不把庙旺自动映射为吉、得分或结果。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: MUTAGEN_SOURCE_ID,
    sourceKind: "modern_original_mutagen_learning_material",
    title: "紫微斗数四化｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/zh_TW/learn/mutagen",
    accessedAt: "2026-08-12",
    usageBoundary: "仅说明四化依附星曜且需区分本命、宫干与运限；本轮只登记已验真的生年四化，不复制四化断语。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: RELATION_SOURCE_ID,
    sourceKind: "upstream_technical_relation_documentation",
    title: "紫微斗数基础·同宫与会照术语｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/learn/basis",
    accessedAt: "2026-08-12",
    usageBoundary: "只用于定义同宫、三合位和对宫的位置关系；不依据星数、关系名称或单颗星自动生成好坏。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: CLASSICAL_SOURCE_ID,
    sourceKind: "public_domain_classical_combination_transcription",
    title: "《紫微斗数全书》卷三·谈星要论（维基文库转录）",
    sourceUrl: "https://zh.wikisource.org/wiki/紫微斗數全書/卷三",
    accessedAt: "2026-08-12",
    usageBoundary: "仅定位亮度、四化、同宫与十二宫三方关系需要合参的传统条件；不采用古籍中的富贵、灾祸、疾病、寿命或身份断语。",
    expertTruthClaimed: false
  })
]);

type CombinationReviewInput = Readonly<{
  palaces: readonly BrowserProbeDisplayPalace[];
  sanfangGroups: readonly BrowserProbeDisplaySanfangGroup[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

export function createMajorStarPalaceCombinationReviews(
  input: CombinationReviewInput
): readonly BrowserProbeMajorStarPalaceCombinationReview[] {
  requireSha256(input.ruleSnapshotSha256, "ruleSnapshotSha256");
  requireSha256(input.artifactFactsSha256, "artifactFactsSha256");

  const reviews = input.palaces.flatMap((palace) => {
    requirePalaceRoleId(palace.roleId);
    const group = input.sanfangGroups.find(
      (candidate) => candidate.targetEarthlyBranchId === palace.earthlyBranchId
    );
    if (!group || group.targetRoleId !== palace.roleId) {
      throw new Error(`宫位 ${palace.roleId}/${palace.earthlyBranchId} 缺少绑定的三方四正事实组`);
    }
    return palace.stars.filter((star) => star.category === "major").map((star) => createReview({
      palace,
      group,
      star,
      ruleSnapshotSha256: input.ruleSnapshotSha256,
      artifactFactsSha256: input.artifactFactsSha256
    }));
  });

  return validateReviews(input.palaces, reviews);
}

type ReviewInput = Readonly<{
  palace: BrowserProbeDisplayPalace;
  group: BrowserProbeDisplaySanfangGroup;
  star: BrowserProbeDisplayStar;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

function createReview(input: ReviewInput): BrowserProbeMajorStarPalaceCombinationReview {
  const palaceRoleId = requirePalaceRoleId(input.palace.roleId);
  const palaceCandidate = input.star.palaceCandidateContent;
  if (!palaceCandidate || palaceCandidate.palaceRoleId !== palaceRoleId) {
    throw new Error(`十二宫主星 ${input.star.starId} 缺少绑定的位置化候选`);
  }

  const otherMajorStars = Object.freeze(input.palace.stars
    .filter((star) => star.category === "major" && star.starId !== input.star.starId)
    .map(projectStarFact));
  const otherStars = Object.freeze(input.palace.stars
    .filter((star) => star.category !== "major")
    .map(projectStarFact));
  const sanfang = Object.freeze(input.group.members.flatMap((member) => {
    if (member.relation === "self") return [];
    const majorStars = Object.freeze(member.palace.stars
      .filter((star) => star.category === "major")
      .map(projectStarFact));
    const transformationStars = Object.freeze(member.palace.stars
      .filter((star) => star.transformations.length > 0)
      .map(projectStarFact));
    return [Object.freeze<BrowserProbeMajorStarCombinationSanfangFact>({
      relation: member.relation,
      relationLabel: member.relationLabel,
      palaceEarthlyBranchId: member.palace.earthlyBranchId,
      palaceEarthlyBranchLabel: member.palace.earthlyBranchLabel,
      palaceRoleId: member.palace.roleId,
      palaceRoleLabel: member.palace.roleLabel,
      majorStars,
      transformationStars,
      otherStarCount: member.palace.stars.filter((star) => star.category !== "major").length
    })];
  }));

  const selfState = Object.freeze({
    brightnessLabel: input.star.brightnessLabel,
    transformations: Object.freeze([...input.star.transformations]),
    transformationScope: "natal_birth_year_only" as const
  });
  const sourceRefs = Object.freeze<readonly BrowserProbeMajorStarSourceRef[]>([
    Object.freeze({
      sourceId: BRIGHTNESS_SOURCE_ID,
      locator: `星曜的亮度／${input.star.label}／${input.star.brightnessLabel ?? "未标注"}`
    }),
    Object.freeze({
      sourceId: MUTAGEN_SOURCE_ID,
      locator: `紫微斗数四化／本命生年四化／${input.star.transformations.join("、") || "无标记"}`
    }),
    Object.freeze({
      sourceId: RELATION_SOURCE_ID,
      locator: "术语／同宫、会、照、冲、扶拱"
    }),
    Object.freeze({
      sourceId: CLASSICAL_SOURCE_ID,
      locator: "卷三／谈星要论"
    })
  ]);
  const factSummary = combinationFactSummary(
    input.star,
    palaceCandidate.palaceRoleLabel,
    otherMajorStars,
    otherStars,
    sanfang
  );
  const reviewQuestions = Object.freeze([
    brightnessReviewQuestion(input.star, palaceCandidate.palaceRoleLabel),
    transformationReviewQuestion(input.star, palaceCandidate.palaceRoleLabel),
    samePalaceReviewQuestion(input.star, otherMajorStars, otherStars),
    sanfangReviewQuestion(input.star, sanfang)
  ] as const);

  return Object.freeze({
    reviewId: `ziwei.review.major_star_all_palaces.${input.star.starId.split(".").at(-1)}.${palaceRoleId}.${input.palace.earthlyBranchId}.v0_2`,
    reviewVersion: ZIWEI_MAJOR_STAR_PALACE_COMBINATION_REVIEW_VERSION,
    reviewKind: "source_bound_combination_fact_review",
    candidateContentId: palaceCandidate.contentId,
    starId: input.star.starId,
    label: input.star.label,
    palaceEarthlyBranchId: input.palace.earthlyBranchId,
    palaceEarthlyBranchLabel: input.palace.earthlyBranchLabel,
    palaceRoleId,
    palaceRoleLabel: palaceCandidate.palaceRoleLabel,
    ruleSnapshotSha256: input.ruleSnapshotSha256,
    artifactFactsSha256: input.artifactFactsSha256,
    factSummary,
    selfState,
    samePalace: Object.freeze({ otherMajorStars, otherStars }),
    sanfang,
    reviewQuestions,
    sourceRefs,
    result: null,
    reviewStatus: "awaiting_expert_rule",
    publicationStatus: "isolated_review_only",
    factsDerivedFromVerifiedArtifact: true,
    interpretationIncluded: false,
    expertTruthClaimed: false,
    directOutcomeAllowed: false,
    scoringAllowed: false
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

function combinationFactSummary(
  star: BrowserProbeDisplayStar,
  palaceRoleLabel: string,
  otherMajorStars: readonly BrowserProbeCombinationStarFact[],
  otherStars: readonly BrowserProbeCombinationStarFact[],
  sanfang: readonly BrowserProbeMajorStarCombinationSanfangFact[]
): string {
  const ownState = displayStarFact(projectStarFact(star));
  const samePalaceSummary = otherMajorStars.length > 0
    ? `同宫另有主星${otherMajorStars.map(displayStarFact).join("、")}`
    : "同宫无其他主星";
  const otherStarSummary = `另有${otherStars.length}颗辅／杂曜`;
  const sanfangSummary = sanfang.map((member) => {
    const stars = member.majorStars.length > 0
      ? member.majorStars.map(displayStarFact).join("、")
      : "无主星";
    return `${member.relationLabel}${member.palaceRoleLabel}见${stars}`;
  }).join("；");
  return `${ownState}落${palaceRoleLabel}；${samePalaceSummary}，${otherStarSummary}；${sanfangSummary}。`;
}

function displayStarFact(star: BrowserProbeCombinationStarFact): string {
  const suffix = [star.brightnessLabel, ...star.transformations].filter(Boolean).join("·");
  return suffix ? `${star.label}〔${suffix}〕` : star.label;
}

function brightnessReviewQuestion(star: BrowserProbeDisplayStar, palaceRoleLabel: string): string {
  return star.brightnessLabel
    ? `亮度“${star.brightnessLabel}”在选定流派中如何调节“${star.label}落${palaceRoleLabel}”的表达？请给适用条件与反例。`
    : `本星没有亮度标记；选定流派是否要求保持缺省，禁止为“${star.label}落${palaceRoleLabel}”补值？`;
}

function transformationReviewQuestion(star: BrowserProbeDisplayStar, palaceRoleLabel: string): string {
  return star.transformations.length > 0
    ? `本星当前只有生年四化“${star.transformations.join("、")}”；它如何调节“${star.label}落${palaceRoleLabel}”？请勿混入宫干或运限四化。`
    : `本星当前无生年四化标记；是否应保持空值，禁止把宫干或运限四化补入“${star.label}落${palaceRoleLabel}”？`;
}

function samePalaceReviewQuestion(
  star: BrowserProbeDisplayStar,
  otherMajorStars: readonly BrowserProbeCombinationStarFact[],
  otherStars: readonly BrowserProbeCombinationStarFact[]
): string {
  const labels = [...otherMajorStars, ...otherStars].map((item) => item.label);
  return labels.length > 0
    ? `同宫的${labels.join("、")}与${star.label}主题如何并列、增强、转向或冲突？请逐项给规则与来源。`
    : `${star.label}所在宫位没有其他星曜；是否应明确保持“无同宫条件”，而不是借星补写？`;
}

function sanfangReviewQuestion(
  star: BrowserProbeDisplayStar,
  sanfang: readonly BrowserProbeMajorStarCombinationSanfangFact[]
): string {
  const summary = sanfang.map((member) => (
    `${member.relationLabel}${member.palaceRoleLabel}${member.majorStars.length > 0
      ? `的${member.majorStars.map((item) => item.label).join("、")}`
      : "无主星"}`
  )).join("；");
  return `${star.label}与${summary}如何合参？请区分对宫和两组三合位、定义冲突规则，禁止按星数相加。`;
}

function validateReviews(
  palaces: readonly BrowserProbeDisplayPalace[],
  reviews: readonly BrowserProbeMajorStarPalaceCombinationReview[]
): readonly BrowserProbeMajorStarPalaceCombinationReview[] {
  const expectedCount = palaces.reduce(
    (count, palace) => count + palace.stars.filter((star) => star.category === "major").length,
    0
  );
  if (reviews.length !== expectedCount) {
    throw new Error(`十二宫组合复核包应有 ${expectedCount} 条，实际为 ${reviews.length} 条`);
  }
  const reviewIds = new Set<string>();
  const candidateContentIds = new Set<string>();
  const sourceIds = new Set(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceId));
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u;
  for (const review of reviews) {
    if (reviewIds.has(review.reviewId)) throw new Error(`十二宫组合复核 ID 重复：${review.reviewId}`);
    if (candidateContentIds.has(review.candidateContentId)) {
      throw new Error(`十二宫组合复核重复绑定位置候选：${review.candidateContentId}`);
    }
    if (review.sourceRefs.length !== 4 || review.sourceRefs.some((ref) => !sourceIds.has(ref.sourceId))) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 的来源引用不完整`);
    }
    if (review.reviewQuestions.length !== 4 || new Set(review.reviewQuestions).size !== 4) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 必须有四个不同的待审问题`);
    }
    if (review.sanfang.length !== 3
      || new Set(review.sanfang.map((member) => member.relation)).size !== 3) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 的三方关系不完整`);
    }
    const samePalaceStarIds = [
      ...review.samePalace.otherMajorStars,
      ...review.samePalace.otherStars
    ].map((star) => star.starId);
    if (samePalaceStarIds.includes(review.starId) || new Set(samePalaceStarIds).size !== samePalaceStarIds.length) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 的同宫星事实重复或包含本星`);
    }
    if (riskyOutcomeLanguage.test(review.factSummary)) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 的事实摘要含结果化措辞`);
    }
    if (review.result !== null || review.interpretationIncluded || review.expertTruthClaimed
      || review.directOutcomeAllowed || review.scoringAllowed) {
      throw new Error(`十二宫组合复核 ${review.reviewId} 越过待审事实边界`);
    }
    reviewIds.add(review.reviewId);
    candidateContentIds.add(review.candidateContentId);
  }
  return Object.freeze([...reviews]);
}

function requireSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} 不是小写十六进制 SHA-256`);
}

function isPalaceRoleId(value: string): value is BrowserProbePalaceRoleId {
  return (ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value);
}

function requirePalaceRoleId(value: string): BrowserProbePalaceRoleId {
  if (!isPalaceRoleId(value)) throw new Error(`未知宫位 ${value} 不能生成组合复核包`);
  return value;
}
