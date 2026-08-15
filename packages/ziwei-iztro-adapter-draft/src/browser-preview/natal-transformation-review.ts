import type {
  BrowserProbeDisplayPalace,
  BrowserProbeDisplaySanfangGroup,
  BrowserProbeDisplayStar,
  BrowserProbeMajorStarPalaceContentSource,
  BrowserProbeMajorStarSourceRef,
  BrowserProbeNatalTransformationContentSource,
  BrowserProbeNatalTransformationLabel,
  BrowserProbeNatalTransformationOccurrenceReview,
  BrowserProbePalaceNatalTransformationReview,
  BrowserProbePalaceRoleCandidateContent,
  BrowserProbePalaceRoleId,
  BrowserProbeSanfangRelation
} from "./browser-protocol.ts";
import {
  requirePalaceRoleCandidateContent,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES,
  ZIWEI_PALACE_ROLE_IDS
} from "./major-star-palace-content.ts";
import {
  requireNatalTransformationCandidateContent,
  ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES
} from "./natal-transformation-content.ts";
import { requireNatalTransformationPalaceCandidateContent }
  from "./natal-transformation-palace-content.ts";

export const ZIWEI_PALACE_NATAL_TRANSFORMATION_REVIEW_VERSION =
  "ziwei.palace_sanfang.natal_transformation_review/0.1" as const;

type NatalTransformationReviewInput = Readonly<{
  palaces: readonly BrowserProbeDisplayPalace[];
  sanfangGroups: readonly BrowserProbeDisplaySanfangGroup[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

export function createPalaceNatalTransformationReviews(
  input: NatalTransformationReviewInput
): readonly BrowserProbePalaceNatalTransformationReview[] {
  requireSha256(input.ruleSnapshotSha256, "ruleSnapshotSha256");
  requireSha256(input.artifactFactsSha256, "artifactFactsSha256");

  const reviews = input.sanfangGroups.map((group) => {
    const target = group.members.find((member) => member.relation === "self")?.palace
      ?? fail(`本命生年四化修正复核包缺少本宫 ${group.targetEarthlyBranchId}`);
    const targetPalaceRoleId = requirePalaceRoleId(target.roleId);
    if (group.targetEarthlyBranchId !== target.earthlyBranchId
      || group.targetRoleId !== targetPalaceRoleId) {
      return fail(`本命生年四化修正复核包的目标宫位与三方四正事实组不一致：${group.targetEarthlyBranchId}`);
    }

    const occurrences = Object.freeze(group.members.flatMap((member) => {
      const palaceRoleId = requirePalaceRoleId(member.palace.roleId);
      const palaceRoleContent = requirePalaceRoleCandidateContent(palaceRoleId)
        ?? fail(`本命生年四化修正复核包缺少 ${palaceRoleId} 问题域候选`);
      return member.palace.stars.flatMap((star) => star.transformations.map((transformationLabel) => (
        createOccurrence({
          targetEarthlyBranchId: target.earthlyBranchId,
          relation: member.relation,
          relationLabel: member.relationLabel,
          palace: member.palace,
          palaceRoleId,
          palaceRoleContent,
          star,
          transformationLabel
        })
      )));
    }));
    const occurrenceSummary = occurrences.map((occurrence) => (
      `${occurrence.relationLabel}${occurrence.palaceRoleLabel}${occurrence.starLabel}化${occurrence.transformationLabel}`
      + `（${occurrence.candidateContent.motionLabel}）`
    )).join("；");
    const absenceBoundary = occurrences.length === 0
      ? "本组三方四正内没有已验真的本命生年四化标记；当前复核包保持空集合，不补入宫干、飞化、自化或运限四化。"
      : null;
    const directStatement = occurrences.length > 0
      ? `${target.roleLabel}三方四正内见 ${occurrenceSummary}。这些文字只把已验真标签连接到中性修正候选，不据此判定结果。`
      : `${target.roleLabel}三方四正内未见已验真的本命生年四化标记；不凭缺省状态补写修正方向。`;
    const reviewQuestions = Object.freeze([
      occurrences.length > 0
        ? `本组的${occurrences.map((occurrence) => `${occurrence.starLabel}化${occurrence.transformationLabel}`).join("、")}是否应采用当前中性修正方向？请逐项给出流派规则与反例。`
        : "本组无本命生年四化标记时，选定流派是否要求继续保持空集合？请说明任何例外的来源与条件。",
      "四化修正应如何与星曜基础语义、落宫问题域和三方四正关系并列，哪些冲突必须保留而不能相互抵消？",
      "请确认当前材料只适用于本命生年四化，并明确宫干飞化、自化、大限与流年四化的独立规则入口。",
      "在缺少现实记录与专家裁决时，哪些好坏方向、身份判断、事件结果和时间结论必须继续保持为空？"
    ] as const);

    return Object.freeze<BrowserProbePalaceNatalTransformationReview>({
      reviewId: `ziwei.review.palace_natal_transformation.${targetPalaceRoleId}.${target.earthlyBranchId}.v0_1`,
      reviewVersion: ZIWEI_PALACE_NATAL_TRANSFORMATION_REVIEW_VERSION,
      reviewKind: "derived_natal_transformation_modifier_review",
      targetEarthlyBranchId: target.earthlyBranchId,
      targetEarthlyBranchLabel: target.earthlyBranchLabel,
      targetPalaceRoleId,
      targetPalaceRoleLabel: target.roleLabel,
      transformationScope: "natal_birth_year_only",
      occurrences,
      ruleSnapshotSha256: input.ruleSnapshotSha256,
      artifactFactsSha256: input.artifactFactsSha256,
      directStatement,
      readingOrderStatement:
        "阅读顺序：先确认星曜、宫位与本命生年四化标签，再读星曜落宫主线，最后把四化作为一层中性修正；不同四化来源不得混用。",
      absenceBoundary,
      reviewQuestions,
      sourceRefs: createReviewSourceRefs(),
      evidenceClass: "derived_natal_transformation_modifier_projection",
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

  return validateReviews(input, reviews);
}

type OccurrenceInput = Readonly<{
  targetEarthlyBranchId: string;
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palace: BrowserProbeDisplayPalace;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleContent: BrowserProbePalaceRoleCandidateContent;
  star: BrowserProbeDisplayStar;
  transformationLabel: string;
}>;

function createOccurrence(input: OccurrenceInput): BrowserProbeNatalTransformationOccurrenceReview {
  const candidateContent = requireNatalTransformationCandidateContent(input.transformationLabel);
  const palaceCandidateContent = requireNatalTransformationPalaceCandidateContent(
    candidateContent.transformationLabel,
    input.palaceRoleId
  );
  const basePositionCandidate = input.star.category === "major"
    ? input.star.palaceCandidateContent
      ?? fail(`本命生年四化修正复核包缺少主星 ${input.star.starId} 的落宫候选`)
    : null;
  if (basePositionCandidate && basePositionCandidate.palaceRoleId !== input.palaceRoleId) {
    return fail(`本命生年四化修正复核包的主星位置候选与宫位不一致：${input.star.starId}`);
  }
  const basePositionState = basePositionCandidate
    ? "major_star_position_candidate_present" as const
    : "not_applicable_non_major_star" as const;
  const positionStatement = basePositionCandidate
    ? `原位置主线保留为：${basePositionCandidate.positionSummary}`
    : "本星不是十四主星，当前不补写主星落宫位置主线。";

  return Object.freeze({
    occurrenceId:
      `ziwei.occurrence.natal_transformation.${input.targetEarthlyBranchId}.${input.palace.earthlyBranchId}`
      + `.${input.star.starId.split(".").at(-1)}.${transformationSlug(candidateContent.transformationLabel)}.v0_1`,
    relation: input.relation,
    relationLabel: input.relationLabel,
    palaceEarthlyBranchId: input.palace.earthlyBranchId,
    palaceEarthlyBranchLabel: input.palace.earthlyBranchLabel,
    palaceRoleId: input.palaceRoleId,
    palaceRoleLabel: input.palaceRoleContent.palaceRoleLabel,
    palaceRoleContent: input.palaceRoleContent,
    starId: input.star.starId,
    starLabel: input.star.label,
    starCategory: input.star.category,
    transformationLabel: candidateContent.transformationLabel,
    candidateContent,
    palaceCandidateContent,
    basePositionState,
    basePositionCandidate,
    directStatement:
      `${input.relationLabel}${input.palaceRoleContent.palaceRoleLabel}（${input.palace.earthlyBranchLabel}）`
      + `已验真 ${input.star.label}化${candidateContent.transformationLabel}。问题域先看：`
      + `${input.palaceRoleContent.domainSummary}。${positionStatement}`
      + `通用四化方向为“${candidateContent.motionLabel}”：${candidateContent.plainLanguage}`
      + `落宫修正候选为：${palaceCandidateContent.positionSummary}`
      + palaceCandidateContent.counterweight,
    sourceRefs: palaceCandidateContent.sourceRefs,
    evidenceClass: "verified_natal_transformation_fact_with_editorial_candidate",
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
}

function createReviewSourceRefs(): readonly BrowserProbeMajorStarSourceRef[] {
  return Object.freeze([
    ...ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES.map((source) => Object.freeze({
      sourceId: source.sourceId,
      locator: transformationSourceLocator(source)
    })),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => Object.freeze({
      sourceId: source.sourceId,
      locator: palaceSourceLocator(source)
    }))
  ]);
}

function transformationSourceLocator(source: BrowserProbeNatalTransformationContentSource): string {
  switch (source.sourceKind) {
    case "modern_original_mutagen_learning_material":
      return "四化星／禄、权、科、忌的调节方向与非固定吉凶边界";
    case "public_domain_classical_mutagen_transcription":
      return "卷一／问化禄、化权、化科、化忌星所主若何";
    case "secondary_method_difference_overview":
      return "流派／四化派别与十天干四化表差异";
  }
}

function palaceSourceLocator(source: BrowserProbeMajorStarPalaceContentSource): string {
  switch (source.sourceKind) {
    case "public_domain_classical_palace_transcription":
      return "卷二／十二宫逐星篇目与安禄权科忌四星变化诀的篇目定位";
    case "modern_original_palace_learning_material":
      return "宫位系统／十二宫问题域与本命盘不直接判定好坏的边界";
  }
}

function validateReviews(
  input: NatalTransformationReviewInput,
  reviews: readonly BrowserProbePalaceNatalTransformationReview[]
): readonly BrowserProbePalaceNatalTransformationReview[] {
  if (input.palaces.length !== 12 || input.sanfangGroups.length !== 12 || reviews.length !== 12) {
    throw new Error(
      `本命生年四化修正复核包要求十二宫、十二组三方四正与十二份结果，实际为 `
      + `${input.palaces.length}/${input.sanfangGroups.length}/${reviews.length}`
    );
  }
  const sourceIds = new Set([
    ...ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId)
  ]);
  const expectedLabels: readonly BrowserProbeNatalTransformationLabel[] = ["禄", "权", "科", "忌"];
  const artifactFacts = input.palaces.flatMap((palace) => palace.stars.flatMap((star) => (
    star.transformations.map((transformationLabel) => Object.freeze({
      factKey: transformationFactKey(palace.earthlyBranchId, star.starId, transformationLabel),
      palaceEarthlyBranchId: palace.earthlyBranchId,
      starId: star.starId,
      transformationLabel: requireNatalTransformationCandidateContent(transformationLabel).transformationLabel
    }))
  )));
  if (artifactFacts.length !== 4
    || new Set(artifactFacts.map((fact) => fact.factKey)).size !== 4
    || artifactFacts.map((fact) => fact.transformationLabel).sort().join("|")
      !== [...expectedLabels].sort().join("|")) {
    throw new Error("本命生年四化修正复核包要求已验真盘面恰有禄、权、科、忌各一条事实");
  }

  const reviewIds = new Set<string>();
  const occurrenceIds = new Set<string>();
  const targetBranches = new Set<string>();
  const occurrenceUseByFact = new Map(artifactFacts.map((fact) => [fact.factKey, 0]));
  const occurrenceUseByLabel = new Map(expectedLabels.map((label) => [label, 0]));
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸/u;

  for (const review of reviews) {
    if (reviewIds.has(review.reviewId) || targetBranches.has(review.targetEarthlyBranchId)) {
      throw new Error(`本命生年四化修正复核包 ID 或目标宫位重复：${review.reviewId}`);
    }
    const group = input.sanfangGroups.find(
      (candidate) => candidate.targetEarthlyBranchId === review.targetEarthlyBranchId
    ) ?? fail(`本命生年四化修正复核包缺少事实组：${review.targetEarthlyBranchId}`);
    const expectedOccurrenceKeys = group.members.flatMap((member) => member.palace.stars.flatMap((star) => (
      star.transformations.map((transformationLabel) => (
        transformationFactKey(member.palace.earthlyBranchId, star.starId, transformationLabel)
      ))
    )));
    const actualOccurrenceKeys = review.occurrences.map((occurrence) => (
      transformationFactKey(
        occurrence.palaceEarthlyBranchId,
        occurrence.starId,
        occurrence.transformationLabel
      )
    ));
    if (actualOccurrenceKeys.join("|") !== expectedOccurrenceKeys.join("|")) {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 与三方四正事实不一致`);
    }
    const expectsAbsence = review.occurrences.length === 0;
    if ((expectsAbsence && !review.absenceBoundary?.includes("不补入宫干、飞化、自化或运限四化"))
      || (!expectsAbsence && review.absenceBoundary !== null)) {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 的空集合边界不一致`);
    }
    if (review.sourceRefs.length !== 5
      || new Set(review.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 5
      || review.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)) {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 的来源引用不完整`);
    }
    if (review.reviewQuestions.length !== 4 || new Set(review.reviewQuestions).size !== 4
      || review.transformationScope !== "natal_birth_year_only") {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 的范围或专家问题无效`);
    }
    if (review.ruleSnapshotSha256 !== input.ruleSnapshotSha256
      || review.artifactFactsSha256 !== input.artifactFactsSha256) {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 的事实摘要绑定不一致`);
    }
    if (riskyOutcomeLanguage.test(`${review.directStatement}${review.readingOrderStatement}`)
      || review.result !== null || review.goodBadOrientation !== null || review.eventOutcome !== null
      || review.expertInterpretationIncluded || review.expertTruthClaimed
      || review.directOutcomeAllowed || review.scoringAllowed) {
      throw new Error(`本命生年四化修正复核包 ${review.reviewId} 越过待审边界`);
    }

    for (const occurrence of review.occurrences) {
      if (occurrenceIds.has(occurrence.occurrenceId)
        || occurrence.sourceRefs.length !== 5
        || occurrence.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId))
        || occurrence.candidateContent.transformationLabel !== occurrence.transformationLabel
        || occurrence.palaceRoleContent.palaceRoleId !== occurrence.palaceRoleId
        || occurrence.palaceCandidateContent.transformationLabel !== occurrence.transformationLabel
        || occurrence.palaceCandidateContent.palaceRoleId !== occurrence.palaceRoleId
        || occurrence.palaceCandidateContent.genericCandidateContentId
          !== occurrence.candidateContent.contentId
        || occurrence.palaceCandidateContent.palaceRoleContentId
          !== occurrence.palaceRoleContent.contentId
        || occurrence.sourceRefs.map((sourceRef) => sourceRef.sourceId).join("|")
          !== occurrence.palaceCandidateContent.sourceRefs.map(
            (sourceRef) => sourceRef.sourceId
          ).join("|")
        || (occurrence.starCategory === "major") !== (occurrence.basePositionCandidate !== null)
        || (occurrence.basePositionCandidate !== null
          && occurrence.basePositionCandidate.palaceRoleId !== occurrence.palaceRoleId)
        || riskyOutcomeLanguage.test(occurrence.directStatement)
        || occurrence.result !== null || occurrence.goodBadOrientation !== null
        || occurrence.eventOutcome !== null || occurrence.expertInterpretationIncluded
        || occurrence.expertTruthClaimed || occurrence.directOutcomeAllowed || occurrence.scoringAllowed) {
        throw new Error(`本命生年四化修正事实 ${occurrence.occurrenceId} 越过绑定或待审边界`);
      }
      const factKey = transformationFactKey(
        occurrence.palaceEarthlyBranchId,
        occurrence.starId,
        occurrence.transformationLabel
      );
      const factUseCount = occurrenceUseByFact.get(factKey);
      if (factUseCount === undefined) {
        throw new Error(`本命生年四化修正事实 ${occurrence.occurrenceId} 没有对应的已验真盘面事实`);
      }
      occurrenceUseByFact.set(factKey, factUseCount + 1);
      occurrenceUseByLabel.set(
        occurrence.transformationLabel,
        (occurrenceUseByLabel.get(occurrence.transformationLabel) ?? 0) + 1
      );
      occurrenceIds.add(occurrence.occurrenceId);
    }
    reviewIds.add(review.reviewId);
    targetBranches.add(review.targetEarthlyBranchId);
  }

  const totalOccurrences = reviews.reduce((count, review) => count + review.occurrences.length, 0);
  if (totalOccurrences !== 16
    || [...occurrenceUseByFact.values()].some((count) => count !== 4)
    || [...occurrenceUseByLabel.values()].some((count) => count !== 4)) {
    throw new Error("每条本命生年四化事实必须恰好进入四组三方四正，十二宫总计应有 16 次引用");
  }
  return Object.freeze([...reviews]);
}

function transformationFactKey(
  palaceEarthlyBranchId: string,
  starId: string,
  transformationLabel: string
): string {
  return `${palaceEarthlyBranchId}/${starId}/${transformationLabel}`;
}

function transformationSlug(label: BrowserProbeNatalTransformationLabel): "lu" | "quan" | "ke" | "ji" {
  return ({ 禄: "lu", 权: "quan", 科: "ke", 忌: "ji" } as const)[label];
}

function requirePalaceRoleId(value: string): BrowserProbePalaceRoleId {
  if (!(ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value)) {
    return fail(`本命生年四化修正复核包收到未知宫位角色 ${value}`);
  }
  return value as BrowserProbePalaceRoleId;
}

function requireSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} 不是小写十六进制 SHA-256`);
}

function fail(message: string): never {
  throw new Error(message);
}
