import type {
  BrowserProbeCoreMinorStarCandidateContent,
  BrowserProbeCoreMinorStarPalaceCandidateContent,
  BrowserProbeCoreMinorStarSanfangOccurrenceReview,
  BrowserProbeCoreMinorStarSanfangReview,
  BrowserProbeDisplayPalace,
  BrowserProbeDisplaySanfangGroup,
  BrowserProbeDisplayStar,
  BrowserProbeMajorStarSourceRef,
  BrowserProbePalaceRoleId,
  BrowserProbeSanfangProjectionRule,
  BrowserProbeSanfangRelation
} from "./browser-protocol.ts";
import {
  resolveCoreMinorStarCandidateContent,
  resolveCoreMinorStarPalaceCandidateContent,
  ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES,
  ZIWEI_CORE_MINOR_STAR_IDS
} from "./core-minor-star-content.ts";
import {
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES,
  ZIWEI_PALACE_ROLE_IDS
} from "./major-star-palace-content.ts";

export const ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION =
  "ziwei.core_minor_star.sanfang_occurrence_review/0.1" as const;

export type CoreMinorStarSanfangReviewInput = Readonly<{
  palaces: readonly BrowserProbeDisplayPalace[];
  sanfangGroups: readonly BrowserProbeDisplaySanfangGroup[];
  sanfangProjectionRule: BrowserProbeSanfangProjectionRule;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

type ProjectedCoreMinorStar = Readonly<{
  baseCandidate: BrowserProbeCoreMinorStarCandidateContent;
  palaceCandidate: BrowserProbeCoreMinorStarPalaceCandidateContent;
}>;

export const ZIWEI_CORE_MINOR_STAR_SANFANG_RELATIONS = Object.freeze<readonly Readonly<{
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  offset: number;
}>[]>([
  { relation: "self", relationLabel: "本宫", offset: 0 },
  { relation: "opposite_plus_6", relationLabel: "对宫（+6）", offset: 6 },
  { relation: "trine_plus_4", relationLabel: "三合位（+4）", offset: 4 },
  { relation: "trine_minus_4", relationLabel: "三合位（−4）", offset: -4 }
]);

export const ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE = Object.freeze({
  ruleId: "ziwei.sanfang_geometry.iztro_docs.v1",
  method: "target_index_self_plus_minus_4_and_plus_6" as const,
  sourceKind: "upstream_technical_documentation" as const,
  sourceTitle: "紫微斗数基础｜紫微研习社 iztro.com",
  sourceUrl: "https://docs.iztro.com/learn/basis",
  accessedAt: "2026-08-12",
  interpretationIncluded: false as const,
  expertTruthClaimed: false as const
}) satisfies BrowserProbeSanfangProjectionRule;

export function createCoreMinorStarSanfangReviews(
  input: CoreMinorStarSanfangReviewInput
): readonly BrowserProbeCoreMinorStarSanfangReview[] {
  requireSha256(input.ruleSnapshotSha256, "ruleSnapshotSha256");
  requireSha256(input.artifactFactsSha256, "artifactFactsSha256");
  validateGeometry(input);
  const projectedFacts = collectProjectedFacts(input.palaces);

  const reviews = input.sanfangGroups.map((group, reviewIndex) => {
    const target = input.palaces[reviewIndex]
      ?? fail(`核心十二辅煞三方四正复核包缺少序号 ${reviewIndex} 的目标宫`);
    const targetPalaceRoleId = requirePalaceRoleId(target.roleId);
    let occurrenceOrder = 0;
    const occurrences = Object.freeze(group.members.flatMap((member) => {
      const palaceRoleId = requirePalaceRoleId(member.palace.roleId);
      return member.palace.stars.flatMap((star, sourceStarIndex) => {
        const projected = requireProjectedCoreMinor(star, palaceRoleId);
        if (projected === null) return [];
        occurrenceOrder += 1;
        return [createOccurrence({
          order: occurrenceOrder,
          targetEarthlyBranchId: target.earthlyBranchId,
          targetPalaceRoleId,
          relation: member.relation,
          relationLabel: member.relationLabel,
          palace: member.palace,
          palaceRoleId,
          sourceStarIndex,
          star,
          projected,
          ruleSnapshotSha256: input.ruleSnapshotSha256,
          artifactFactsSha256: input.artifactFactsSha256
        })];
      });
    }));
    const selfOccurrences = occurrences.filter((occurrence) => occurrence.relation === "self");
    const targetCoreMinorState = selfOccurrences.length > 0
      ? "present" as const
      : "empty_in_verified_facts" as const;
    const absenceBoundary = targetCoreMinorState === "empty_in_verified_facts"
      ? "本宫已验真事实中没有核心十二辅煞；对宫与三合位 occurrence 只保留原关系，不借入本宫、不替本宫补星。"
      : null;
    const summary = occurrences.length === 0
      ? "本组三方四正没有核心十二辅煞 occurrence"
      : occurrences.map((occurrence) => (
        `${occurrence.relationLabel}${occurrence.palaceRoleLabel}${occurrence.starLabel}`
      )).join("；");

    return Object.freeze<BrowserProbeCoreMinorStarSanfangReview>({
      reviewId:
        `ziwei.review.core_minor_star_sanfang.${targetPalaceRoleId}.${target.earthlyBranchId}.v0_1`,
      order: reviewIndex + 1,
      reviewVersion: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION,
      reviewKind: "derived_core_minor_star_sanfang_occurrence_review",
      targetEarthlyBranchId: target.earthlyBranchId,
      targetEarthlyBranchLabel: target.earthlyBranchLabel,
      targetPalaceRoleId,
      targetPalaceRoleLabel: target.roleLabel,
      targetCoreMinorState,
      occurrences,
      ruleSnapshotSha256: input.ruleSnapshotSha256,
      artifactFactsSha256: input.artifactFactsSha256,
      sanfangProjectionRule: input.sanfangProjectionRule,
      directStatement:
        `${target.roleLabel}按本宫、对宫、两组三合位读取：${summary}。`
        + "这里只登记事实位置并连接基础与落宫候选，不以传统分组或出现数量形成方向、事件或结果。",
      readingOrderStatement:
        "固定顺序为本宫、对宫（+6）、三合位（+4）、三合位（−4）；每宫内保持已验真星曜原序。关系位置不得互换，也不得把外宫星曜借作本宫星曜。",
      absenceBoundary,
      reviewQuestions: Object.freeze([
        "逐项星曜 × 宫位候选是否符合所选流派？请分别给出成立条件、限制与反例。",
        "本宫、对宫与两组三合位应怎样并列阅读，哪些关系不得改写成同宫或借星？",
        "亮度与本命生年四化只作为已验真事实字段时，还需要哪些独立规则才能参与解释？",
        "在没有具名审稿与现实记录时，哪些方向、事件、时间与结果字段必须继续为空？"
      ] as const),
      sourceRefs: createReviewSourceRefs(input.sanfangProjectionRule),
      evidenceClass: "derived_core_minor_star_sanfang_occurrence_projection",
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

  return validateReviews(input, projectedFacts, reviews);
}

type OccurrenceInput = Readonly<{
  order: number;
  targetEarthlyBranchId: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palace: BrowserProbeDisplayPalace;
  palaceRoleId: BrowserProbePalaceRoleId;
  sourceStarIndex: number;
  star: BrowserProbeDisplayStar;
  projected: ProjectedCoreMinorStar;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

function createOccurrence(
  input: OccurrenceInput
): BrowserProbeCoreMinorStarSanfangOccurrenceReview {
  const { baseCandidate, palaceCandidate } = input.projected;
  return Object.freeze({
    occurrenceId:
      `ziwei.occurrence.core_minor_star_sanfang.${input.targetEarthlyBranchId}`
      + `.${input.palace.earthlyBranchId}.${input.star.starId.split(".").at(-1)}.v0_1`,
    order: input.order,
    targetEarthlyBranchId: input.targetEarthlyBranchId,
    targetPalaceRoleId: input.targetPalaceRoleId,
    relation: input.relation,
    relationLabel: input.relationLabel,
    palaceEarthlyBranchId: input.palace.earthlyBranchId,
    palaceEarthlyBranchLabel: input.palace.earthlyBranchLabel,
    palaceRoleId: input.palaceRoleId,
    palaceRoleLabel: input.palace.roleLabel,
    sourceStarIndex: input.sourceStarIndex,
    starId: input.star.starId,
    starLabel: input.star.label,
    starCategory: "minor" as const,
    brightnessLabel: input.star.brightnessLabel,
    transformations: Object.freeze([...input.star.transformations]),
    nomenclatureConflictState: input.star.starId === "ziwei.star.iztro.dikong-min"
      ? "classical_tiankong_not_dikong" as const
      : "none" as const,
    ruleSnapshotSha256: input.ruleSnapshotSha256,
    artifactFactsSha256: input.artifactFactsSha256,
    baseCandidateContentId: baseCandidate.contentId,
    palaceCandidateContentId: palaceCandidate.contentId,
    baseCandidateContent: baseCandidate,
    palaceCandidateContent: palaceCandidate,
    directStatement:
      `${input.relationLabel}${input.palace.roleLabel}（${input.palace.earthlyBranchLabel}）`
      + `已验真见${input.star.label}。基础候选：${baseCandidate.plainLanguage}`
      + `落宫候选：${palaceCandidate.positionSummary}${palaceCandidate.counterweight}`,
    sourceRefs: palaceCandidate.sourceRefs,
    evidenceClass: "verified_core_minor_star_fact_with_editorial_candidate" as const,
    result: null,
    goodBadOrientation: null,
    eventOutcome: null,
    reviewStatus: "awaiting_expert_review" as const,
    publicationStatus: "isolated_review_only" as const,
    factsDerivedFromVerifiedArtifact: true as const,
    editorialCandidateIncluded: true as const,
    expertInterpretationIncluded: false as const,
    expertTruthClaimed: false as const,
    directOutcomeAllowed: false as const,
    scoringAllowed: false as const
  });
}

function requireProjectedCoreMinor(
  star: BrowserProbeDisplayStar,
  palaceRoleId: BrowserProbePalaceRoleId
): ProjectedCoreMinorStar | null {
  const expectedBase = resolveCoreMinorStarCandidateContent(star.starId, star.label, star.category);
  const expectedPalace = resolveCoreMinorStarPalaceCandidateContent(
    star.starId,
    star.label,
    star.category,
    palaceRoleId
  );
  if (expectedBase === null || expectedPalace === null) {
    if (expectedBase !== null || expectedPalace !== null
      || star.coreMinorCandidateContent !== null
      || star.coreMinorPalaceCandidateContent !== null) {
      return fail(`非核心或未知星曜不得携带核心十二辅煞候选：${star.starId}`);
    }
    return null;
  }
  if (star.category !== "minor"
    || JSON.stringify(star.coreMinorCandidateContent) !== JSON.stringify(expectedBase)
    || JSON.stringify(star.coreMinorPalaceCandidateContent) !== JSON.stringify(expectedPalace)
    || expectedPalace.baseCandidateContentId !== expectedBase.contentId
    || expectedPalace.palaceRoleId !== palaceRoleId) {
    return fail(`核心十二辅煞事实与冻结候选失配：${star.starId}/${palaceRoleId}`);
  }
  return Object.freeze({ baseCandidate: expectedBase, palaceCandidate: expectedPalace });
}

function collectProjectedFacts(
  palaces: readonly BrowserProbeDisplayPalace[]
): readonly Readonly<{ factKey: string; starId: string }>[] {
  const facts = palaces.flatMap((palace) => {
    const palaceRoleId = requirePalaceRoleId(palace.roleId);
    return palace.stars.flatMap((star) => {
      const projected = requireProjectedCoreMinor(star, palaceRoleId);
      return projected === null
        ? []
        : [Object.freeze({
          factKey: coreFactKey(palace.earthlyBranchId, star.starId),
          starId: star.starId
        })];
    });
  });
  if (facts.length !== ZIWEI_CORE_MINOR_STAR_IDS.length
    || new Set(facts.map((fact) => fact.factKey)).size !== facts.length
    || new Set(facts.map((fact) => fact.starId)).size !== ZIWEI_CORE_MINOR_STAR_IDS.length
    || ZIWEI_CORE_MINOR_STAR_IDS.some((starId) => !facts.some((fact) => fact.starId === starId))) {
    return fail("核心十二辅煞动态复核要求十二个精确星键在已验真盘面各出现一次");
  }
  return Object.freeze(facts);
}

function validateGeometry(input: CoreMinorStarSanfangReviewInput): void {
  if (input.palaces.length !== 12 || input.sanfangGroups.length !== 12) {
    fail(`核心十二辅煞三方四正复核要求 12 宫和 12 组，实际为 ${input.palaces.length}/${input.sanfangGroups.length}`);
  }
  if (new Set(input.palaces.map((palace) => palace.earthlyBranchId)).size !== 12) {
    fail("核心十二辅煞三方四正复核要求十二个不重复地支宫位");
  }
  if (JSON.stringify(input.sanfangProjectionRule)
    !== JSON.stringify(ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE)) {
    fail("核心十二辅煞三方四正复核只接受当前纯几何、非解释的关系规则");
  }
  for (const [targetIndex, group] of input.sanfangGroups.entries()) {
    const target = input.palaces[targetIndex]!;
    if (group.targetEarthlyBranchId !== target.earthlyBranchId
      || group.targetRoleId !== target.roleId
      || group.members.length !== ZIWEI_CORE_MINOR_STAR_SANFANG_RELATIONS.length) {
      fail(`核心十二辅煞三方四正事实组目标或成员数失配：${target.earthlyBranchId}`);
    }
    for (const [memberIndex, relation] of ZIWEI_CORE_MINOR_STAR_SANFANG_RELATIONS.entries()) {
      const member = group.members[memberIndex]!;
      const expectedPalace = input.palaces[
        (targetIndex + relation.offset + input.palaces.length) % input.palaces.length
      ]!;
      if (member.relation !== relation.relation
        || member.relationLabel !== relation.relationLabel
        || JSON.stringify(member.palace) !== JSON.stringify(expectedPalace)) {
        fail(`核心十二辅煞三方四正关系顺序或宫位事实失配：${target.earthlyBranchId}/${relation.relation}`);
      }
    }
  }
}

function validateReviews(
  input: CoreMinorStarSanfangReviewInput,
  facts: readonly Readonly<{ factKey: string; starId: string }>[],
  reviews: readonly BrowserProbeCoreMinorStarSanfangReview[]
): readonly BrowserProbeCoreMinorStarSanfangReview[] {
  if (reviews.length !== 12) fail("核心十二辅煞三方四正复核必须恰有十二份目标宫复核");
  const sourceIds = new Set([
    ...ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId),
    input.sanfangProjectionRule.ruleId
  ]);
  const reviewIds = new Set<string>();
  const occurrenceIds = new Set<string>();
  const useByFact = new Map(facts.map((fact) => [fact.factKey, 0]));
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸|死亡|离婚/u;

  for (const [reviewIndex, review] of reviews.entries()) {
    const group = input.sanfangGroups[reviewIndex]!;
    const target = input.palaces[reviewIndex]!;
    const expectedOccurrenceKeys = group.members.flatMap((member) => {
      const palaceRoleId = requirePalaceRoleId(member.palace.roleId);
      return member.palace.stars.flatMap((star) => (
        requireProjectedCoreMinor(star, palaceRoleId) === null
          ? []
          : [coreFactKey(member.palace.earthlyBranchId, star.starId)]
      ));
    });
    const actualOccurrenceKeys = review.occurrences.map((occurrence) => (
      coreFactKey(occurrence.palaceEarthlyBranchId, occurrence.starId)
    ));
    const selfCount = review.occurrences.filter((occurrence) => occurrence.relation === "self").length;
    if (review.order !== reviewIndex + 1
      || review.reviewVersion !== ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION
      || reviewIds.has(review.reviewId)
      || review.targetEarthlyBranchId !== target.earthlyBranchId
      || review.targetPalaceRoleId !== target.roleId
      || actualOccurrenceKeys.join("|") !== expectedOccurrenceKeys.join("|")) {
      fail(`核心十二辅煞三方四正复核顺序、目标或 occurrence 失配：${review.reviewId}`);
    }
    const expectsEmptySelf = selfCount === 0;
    if ((expectsEmptySelf && (
      review.targetCoreMinorState !== "empty_in_verified_facts"
      || !review.absenceBoundary?.includes("不借入本宫")
    )) || (!expectsEmptySelf && (
      review.targetCoreMinorState !== "present" || review.absenceBoundary !== null
    ))) {
      fail(`核心十二辅煞三方四正复核空宫边界失配：${review.reviewId}`);
    }
    if (review.ruleSnapshotSha256 !== input.ruleSnapshotSha256
      || review.artifactFactsSha256 !== input.artifactFactsSha256
      || JSON.stringify(review.sanfangProjectionRule) !== JSON.stringify(input.sanfangProjectionRule)
      || review.sourceRefs.length !== 5
      || new Set(review.sourceRefs.map((ref) => ref.sourceId)).size !== 5
      || review.sourceRefs.some((ref) => !sourceIds.has(ref.sourceId) || !ref.locator)
      || review.reviewQuestions.length !== 4
      || new Set(review.reviewQuestions).size !== 4
      || riskyOutcomeLanguage.test(`${review.directStatement}${review.readingOrderStatement}`)
      || review.result !== null
      || review.goodBadOrientation !== null
      || review.eventOutcome !== null
      || review.expertInterpretationIncluded
      || review.expertTruthClaimed
      || review.directOutcomeAllowed
      || review.scoringAllowed) {
      fail(`核心十二辅煞三方四正复核越过来源、哈希或待审边界：${review.reviewId}`);
    }
    for (const [occurrenceIndex, occurrence] of review.occurrences.entries()) {
      const sourcePalace = group.members.find(
        (member) => member.relation === occurrence.relation
      )?.palace ?? fail(`核心十二辅煞 occurrence 缺少关系事实：${occurrence.occurrenceId}`);
      const sourceStar = sourcePalace.stars[occurrence.sourceStarIndex]
        ?? fail(`核心十二辅煞 occurrence 缺少原始星曜序号：${occurrence.occurrenceId}`);
      const projected = requireProjectedCoreMinor(
        sourceStar,
        requirePalaceRoleId(sourcePalace.roleId)
      ) ?? fail(`核心十二辅煞 occurrence 指向非核心星曜：${occurrence.occurrenceId}`);
      if (occurrence.order !== occurrenceIndex + 1
        || occurrenceIds.has(occurrence.occurrenceId)
        || occurrence.targetEarthlyBranchId !== review.targetEarthlyBranchId
        || occurrence.targetPalaceRoleId !== review.targetPalaceRoleId
        || occurrence.palaceEarthlyBranchId !== sourcePalace.earthlyBranchId
        || occurrence.palaceRoleId !== sourcePalace.roleId
        || occurrence.starId !== sourceStar.starId
        || occurrence.starLabel !== sourceStar.label
        || occurrence.starCategory !== "minor"
        || occurrence.brightnessLabel !== sourceStar.brightnessLabel
        || occurrence.transformations.join("|") !== sourceStar.transformations.join("|")
        || occurrence.nomenclatureConflictState !== (
          sourceStar.starId === "ziwei.star.iztro.dikong-min"
            ? "classical_tiankong_not_dikong"
            : "none"
        )
        || occurrence.ruleSnapshotSha256 !== input.ruleSnapshotSha256
        || occurrence.artifactFactsSha256 !== input.artifactFactsSha256
        || occurrence.baseCandidateContentId !== projected.baseCandidate.contentId
        || occurrence.palaceCandidateContentId !== projected.palaceCandidate.contentId
        || JSON.stringify(occurrence.baseCandidateContent) !== JSON.stringify(projected.baseCandidate)
        || JSON.stringify(occurrence.palaceCandidateContent) !== JSON.stringify(projected.palaceCandidate)
        || JSON.stringify(occurrence.sourceRefs) !== JSON.stringify(projected.palaceCandidate.sourceRefs)
        || riskyOutcomeLanguage.test(occurrence.directStatement)
        || occurrence.result !== null
        || occurrence.goodBadOrientation !== null
        || occurrence.eventOutcome !== null
        || occurrence.expertInterpretationIncluded
        || occurrence.expertTruthClaimed
        || occurrence.directOutcomeAllowed
        || occurrence.scoringAllowed) {
        fail(`核心十二辅煞 occurrence 越过事实、候选或待审边界：${occurrence.occurrenceId}`);
      }
      const factKey = coreFactKey(occurrence.palaceEarthlyBranchId, occurrence.starId);
      const currentUse = useByFact.get(factKey);
      if (currentUse === undefined) fail(`核心十二辅煞 occurrence 没有已验真事实：${occurrence.occurrenceId}`);
      useByFact.set(factKey, currentUse + 1);
      occurrenceIds.add(occurrence.occurrenceId);
    }
    reviewIds.add(review.reviewId);
  }

  const totalOccurrences = reviews.reduce((sum, review) => sum + review.occurrences.length, 0);
  if (totalOccurrences !== facts.length * 4
    || [...useByFact.values()].some((count) => count !== 4)) {
    fail("每条核心十二辅煞盘面事实必须恰好进入四组三方四正；结构覆盖不得当作评分");
  }
  return Object.freeze([...reviews]);
}

function createReviewSourceRefs(
  rule: BrowserProbeSanfangProjectionRule
): readonly BrowserProbeMajorStarSourceRef[] {
  return Object.freeze([
    ...ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES.map((source) => Object.freeze({
      sourceId: source.sourceId,
      locator: source.sourceKind === "modern_original_minor_star_learning_material"
        ? "十四辅星／核心十二精确星键、传统主题与流派差异边界"
        : "卷一／诸星问答论／精确篇目定位；地空与天空名目冲突保留"
    })),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => Object.freeze({
      sourceId: source.sourceId,
      locator: source.sourceKind === "modern_original_palace_learning_material"
        ? "宫位系统／十二宫问题域与不直接判定结果的边界"
        : "卷二／十二宫逐星篇目定位"
    })),
    Object.freeze({
      sourceId: rule.ruleId,
      locator: "三方四正几何／目标索引 0、+6、+4、−4；只支持关系位置，不支持语义断语"
    })
  ]);
}

function coreFactKey(palaceEarthlyBranchId: string, starId: string): string {
  return `${palaceEarthlyBranchId}/${starId}`;
}

function requirePalaceRoleId(value: string): BrowserProbePalaceRoleId {
  if (!(ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value)) {
    return fail(`核心十二辅煞三方四正复核收到未知宫位角色 ${value}`);
  }
  return value as BrowserProbePalaceRoleId;
}

function requireSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} 不是小写十六进制 SHA-256`);
}

function fail(message: string): never {
  throw new Error(message);
}
