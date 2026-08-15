import type {
  BrowserProbeMajorStarSameStarSynthesisReview,
  BrowserProbeMajorStarSourceRef,
  BrowserProbePalaceFirstMemberFact,
  BrowserProbePalaceFirstSynthesisReview,
  BrowserProbePalaceFourPartMajorStarBinding,
  BrowserProbePalaceFourPartRelationBinding,
  BrowserProbePalaceFourPartSection,
  BrowserProbePalaceFourPartSectionId,
  BrowserProbePalaceFourPartSynthesisContent,
  BrowserProbePalaceNatalTransformationReview,
  BrowserProbeSanfangRelation
} from "./browser-protocol.ts";

export const ZIWEI_PALACE_FOUR_PART_SYNTHESIS_CONTENT_VERSION =
  "ziwei.palace_sanfang.four_part_synthesis_candidate/0.1" as const;

const RELATION_ORDER = Object.freeze<readonly BrowserProbeSanfangRelation[]>([
  "self",
  "opposite_plus_6",
  "trine_plus_4",
  "trine_minus_4"
]);

const SECTION_ORDER = Object.freeze<readonly BrowserProbePalaceFourPartSectionId[]>([
  "palace_theme",
  "external_pull",
  "resource_pressure_observation",
  "contradiction_synthesis"
]);

type PalaceFourPartSynthesisInput = Readonly<{
  palaceFirstSynthesisReviews: readonly BrowserProbePalaceFirstSynthesisReview[];
  majorStarSameStarSynthesisReviews: readonly BrowserProbeMajorStarSameStarSynthesisReview[];
  palaceNatalTransformationReviews: readonly BrowserProbePalaceNatalTransformationReview[];
}>;

type SectionInput = Readonly<{
  sectionId: BrowserProbePalaceFourPartSectionId;
  order: 1 | 2 | 3 | 4;
  title: string;
  directStatement: string;
  relations: readonly BrowserProbeSanfangRelation[];
}>;

export function createPalaceFourPartSynthesisContents(
  input: PalaceFourPartSynthesisInput
): readonly BrowserProbePalaceFourPartSynthesisContent[] {
  const synthesisById = uniqueMap(
    input.majorStarSameStarSynthesisReviews,
    (synthesis) => synthesis.synthesisId,
    "四段式候选收到重复逐星 synthesisId"
  );
  const transformationByTarget = uniqueMap(
    input.palaceNatalTransformationReviews,
    (review) => review.targetEarthlyBranchId,
    "四段式候选收到重复四化目标宫位"
  );

  const contents = input.palaceFirstSynthesisReviews.map((palaceReview) => {
    const transformationReview = transformationByTarget.get(palaceReview.targetEarthlyBranchId)
      ?? fail(`四段式候选缺少 ${palaceReview.targetEarthlyBranchId} 的本命生年四化包`);
    requireReviewAgreement(palaceReview, transformationReview);

    const memberByBranch = uniqueMap(
      palaceReview.members,
      (member) => member.palaceEarthlyBranchId,
      `四段式候选 ${palaceReview.reviewId} 收到重复关系宫位`
    );
    const groupSyntheses = palaceReview.groupMajorStarSynthesisIds.map((synthesisId) => (
      synthesisById.get(synthesisId)
        ?? fail(`四段式候选 ${palaceReview.reviewId} 缺少逐星包 ${synthesisId}`)
    ));
    for (const synthesis of groupSyntheses) {
      if (synthesis.combinationReview.ruleSnapshotSha256 !== palaceReview.ruleSnapshotSha256
        || synthesis.combinationReview.artifactFactsSha256 !== palaceReview.artifactFactsSha256
        || synthesis.result !== null
        || synthesis.goodBadOrientation !== null
        || synthesis.eventOutcome !== null
        || synthesis.combinationReview.result !== null
        || synthesis.expertInterpretationIncluded
        || synthesis.expertTruthClaimed
        || synthesis.directOutcomeAllowed
        || synthesis.scoringAllowed) {
        return fail(`四段式候选的逐星包越过摘要或待审边界：${synthesis.synthesisId}`);
      }
    }
    const starBindings = groupSyntheses.map((synthesis) => (
      createMajorStarBinding(synthesis, requireMemberForSynthesis(memberByBranch, synthesis))
    ));
    const relationBindings = palaceReview.members.map(createRelationBinding);
    const occurrences = transformationReview.occurrences;
    const allRelations = RELATION_ORDER;
    const externalRelations = RELATION_ORDER.slice(1);
    const selfBindings = starBindings.filter((binding) => binding.relation === "self");
    const externalBindings = starBindings.filter((binding) => binding.relation !== "self");
    const selfOccurrences = occurrences.filter((occurrence) => occurrence.relation === "self");
    const externalOccurrences = occurrences.filter((occurrence) => occurrence.relation !== "self");
    const transformationObservation = occurrences.length === 0
      ? "本组三方四正没有已验真的本命生年四化；四化观察项保持空集合，不补入其他四化来源。"
      : `本组三方四正登记 ${occurrences.map((occurrence) => (
        `${occurrence.relationLabel}${occurrence.palaceRoleLabel}${occurrence.starLabel}化${occurrence.transformationLabel}`
      )).join("、")}；这些只作为待审观察项。`;
    const targetTheme = palaceReview.targetMainStarState === "empty_in_verified_facts"
      ? `${palaceReview.targetPalaceRoleLabel}先看本宫问题域：${palaceReview.palaceRoleContent.domainSummary}`
        + "本宫在已验真盘面无十四主星；本段保持主星与位置候选空集合，不借用对宫或两组三合位主星补写本宫主线。"
      : `${palaceReview.targetPalaceRoleLabel}先看本宫问题域：${palaceReview.palaceRoleContent.domainSummary}`
        + `本宫已验真主星为${formatStarBindings(selfBindings)}；位置候选逐项保留，不合成单一主导主题。`;
    const externalPull = externalBindings.length === 0
      ? "依次核对对宫与两组三合位；当前没有可绑定的十四主星位置候选，外部牵引保持空集合。"
      : `依次核对对宫与两组三合位：${formatStarBindings(externalBindings)}。这些是关系来源明确的会照候选，不改写成本宫落星。`;
    const resourcePressure = `${formatBrightnessAndTransformations(starBindings)}${transformationObservation}`
      + "当前只列观察项，不判断哪一项是资源、哪一项是压力，也不计算强弱或权重。";
    const contradictionSynthesis =
      `本宫与外部三宫共绑定 ${starBindings.length} 份逐星合参、${occurrences.length} 条本命生年四化出现事实。`
      + "可能互补或牵制的内容保持并列；当前不选择主导主题，不抵消矛盾，也不生成吉凶或事件结果。";

    const sectionInputs: readonly SectionInput[] = Object.freeze([
      {
        sectionId: "palace_theme",
        order: 1,
        title: "本宫主题",
        directStatement: targetTheme,
        relations: ["self"]
      },
      {
        sectionId: "external_pull",
        order: 2,
        title: "外部牵引",
        directStatement: externalPull,
        relations: externalRelations
      },
      {
        sectionId: "resource_pressure_observation",
        order: 3,
        title: "资源／压力观察项",
        directStatement: resourcePressure,
        relations: allRelations
      },
      {
        sectionId: "contradiction_synthesis",
        order: 4,
        title: "矛盾合成",
        directStatement: contradictionSynthesis,
        relations: allRelations
      }
    ]);

    const parts = Object.freeze(sectionInputs.map((section) => createSection({
      section,
      palaceReview,
      transformationReview,
      relationBindings,
      starBindings,
      synthesisById
    }))) as BrowserProbePalaceFourPartSynthesisContent["parts"];
    const sourceRefs = mergeSourceRefs(parts.flatMap((part) => part.sourceRefs));

    return Object.freeze<BrowserProbePalaceFourPartSynthesisContent>({
      contentId:
        `ziwei.content.palace_four_part.${palaceReview.targetPalaceRoleId}`
        + `.${palaceReview.targetEarthlyBranchId}.v0_1`,
      contentVersion: ZIWEI_PALACE_FOUR_PART_SYNTHESIS_CONTENT_VERSION,
      contentKind: "derived_palace_four_part_synthesis_candidate",
      targetEarthlyBranchId: palaceReview.targetEarthlyBranchId,
      targetEarthlyBranchLabel: palaceReview.targetEarthlyBranchLabel,
      targetPalaceRoleId: palaceReview.targetPalaceRoleId,
      targetPalaceRoleLabel: palaceReview.targetPalaceRoleLabel,
      targetMainStarState: palaceReview.targetMainStarState,
      parts,
      ruleSnapshotSha256: palaceReview.ruleSnapshotSha256,
      artifactFactsSha256: palaceReview.artifactFactsSha256,
      sourceRefs,
      selectedDominantTheme: null,
      resourcePressureOrientation: null,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null,
      reviewStatus: "awaiting_expert_review",
      publicationStatus: "isolated_candidate_only",
      factsDerivedFromVerifiedArtifact: true,
      editorialCandidateIncluded: true,
      expertInterpretationIncluded: false,
      expertTruthClaimed: false,
      directOutcomeAllowed: false,
      scoringAllowed: false
    });
  });

  return validatePalaceFourPartSynthesisContents(input, contents);
}

function createSection(input: Readonly<{
  section: SectionInput;
  palaceReview: BrowserProbePalaceFirstSynthesisReview;
  transformationReview: BrowserProbePalaceNatalTransformationReview;
  relationBindings: readonly BrowserProbePalaceFourPartRelationBinding[];
  starBindings: readonly BrowserProbePalaceFourPartMajorStarBinding[];
  synthesisById: ReadonlyMap<string, BrowserProbeMajorStarSameStarSynthesisReview>;
}>): BrowserProbePalaceFourPartSection {
  const relations = new Set(input.section.relations);
  const majorStarBindings = input.starBindings.filter((binding) => relations.has(binding.relation));
  const occurrences = input.transformationReview.occurrences.filter(
    (occurrence) => relations.has(occurrence.relation)
  );
  const sourceRefs = mergeSourceRefs([
    ...input.palaceReview.sourceRefs,
    ...input.transformationReview.sourceRefs,
    ...majorStarBindings.flatMap((binding) => {
      const synthesis = input.synthesisById.get(binding.synthesisId)
        ?? fail(`四段式候选 ${input.palaceReview.reviewId} 缺少逐星来源 ${binding.synthesisId}`);
      return synthesis.sourceRefs;
    }),
    ...occurrences.flatMap((occurrence) => occurrence.sourceRefs)
  ]);
  return Object.freeze({
    sectionId: input.section.sectionId,
    order: input.section.order,
    title: input.section.title,
    directStatement: input.section.directStatement,
    relationBindings: Object.freeze(input.relationBindings.filter(
      (binding) => relations.has(binding.relation)
    )),
    majorStarBindings: Object.freeze(majorStarBindings),
    transformationOccurrenceIds: Object.freeze(occurrences.map(
      (occurrence) => occurrence.occurrenceId
    )),
    sourceRefs,
    ruleSnapshotSha256: input.palaceReview.ruleSnapshotSha256,
    artifactFactsSha256: input.palaceReview.artifactFactsSha256
  });
}

function createRelationBinding(
  member: BrowserProbePalaceFirstMemberFact
): BrowserProbePalaceFourPartRelationBinding {
  return Object.freeze({
    relation: member.relation,
    relationLabel: member.relationLabel,
    palaceEarthlyBranchId: member.palaceEarthlyBranchId,
    palaceEarthlyBranchLabel: member.palaceEarthlyBranchLabel,
    palaceRoleId: member.palaceRoleId,
    palaceRoleLabel: member.palaceRoleLabel
  });
}

function createMajorStarBinding(
  synthesis: BrowserProbeMajorStarSameStarSynthesisReview,
  member: BrowserProbePalaceFirstMemberFact
): BrowserProbePalaceFourPartMajorStarBinding {
  const star = member.majorStars.find((candidate) => candidate.starId === synthesis.starId)
    ?? fail(`四段式候选缺少 ${member.palaceEarthlyBranchId}/${synthesis.starId} 的主星事实`);
  if (star.label !== synthesis.label
    || synthesis.palaceRoleId !== member.palaceRoleId
    || synthesis.positionCandidate.starId !== synthesis.starId
    || synthesis.positionCandidate.palaceRoleId !== member.palaceRoleId
    || synthesis.combinationReview.selfState.brightnessLabel !== star.brightnessLabel
    || synthesis.combinationReview.selfState.transformations.join("|")
      !== star.transformations.join("|")) {
    return fail(`四段式候选的逐星包与宫位事实不一致：${synthesis.synthesisId}`);
  }
  return Object.freeze({
    relation: member.relation,
    relationLabel: member.relationLabel,
    palaceEarthlyBranchId: member.palaceEarthlyBranchId,
    palaceEarthlyBranchLabel: member.palaceEarthlyBranchLabel,
    palaceRoleId: member.palaceRoleId,
    palaceRoleLabel: member.palaceRoleLabel,
    starId: synthesis.starId,
    starLabel: synthesis.label,
    synthesisId: synthesis.synthesisId,
    positionCandidateContentId: synthesis.positionCandidate.contentId,
    positionSummary: synthesis.positionCandidate.positionSummary,
    brightnessLabel: star.brightnessLabel,
    transformations: Object.freeze([...star.transformations])
  });
}

function requireMemberForSynthesis(
  memberByBranch: ReadonlyMap<string, BrowserProbePalaceFirstMemberFact>,
  synthesis: BrowserProbeMajorStarSameStarSynthesisReview
): BrowserProbePalaceFirstMemberFact {
  const member = memberByBranch.get(synthesis.palaceEarthlyBranchId)
    ?? fail(`四段式候选的逐星包不属于当前三方四正：${synthesis.synthesisId}`);
  if (member.palaceRoleId !== synthesis.palaceRoleId) {
    return fail(`四段式候选的逐星包宫位角色不一致：${synthesis.synthesisId}`);
  }
  return member;
}

function requireReviewAgreement(
  palaceReview: BrowserProbePalaceFirstSynthesisReview,
  transformationReview: BrowserProbePalaceNatalTransformationReview
): void {
  if (transformationReview.targetPalaceRoleId !== palaceReview.targetPalaceRoleId
    || transformationReview.targetEarthlyBranchLabel !== palaceReview.targetEarthlyBranchLabel
    || transformationReview.ruleSnapshotSha256 !== palaceReview.ruleSnapshotSha256
    || transformationReview.artifactFactsSha256 !== palaceReview.artifactFactsSha256) {
    throw new Error(`四段式候选的逐宫包与四化包绑定不一致：${palaceReview.reviewId}`);
  }
  requireSha256(palaceReview.ruleSnapshotSha256, "ruleSnapshotSha256");
  requireSha256(palaceReview.artifactFactsSha256, "artifactFactsSha256");
  if (palaceReview.members.map((member) => member.relation).join("|")
      !== RELATION_ORDER.join("|")
    || palaceReview.result !== null
    || palaceReview.goodBadOrientation !== null
    || palaceReview.eventOutcome !== null
    || palaceReview.expertInterpretationIncluded
    || palaceReview.expertTruthClaimed
    || palaceReview.directOutcomeAllowed
    || palaceReview.scoringAllowed
    || transformationReview.result !== null
    || transformationReview.goodBadOrientation !== null
    || transformationReview.eventOutcome !== null
    || transformationReview.expertInterpretationIncluded
    || transformationReview.expertTruthClaimed
    || transformationReview.directOutcomeAllowed
    || transformationReview.scoringAllowed) {
    throw new Error(`四段式候选的来源包越过关系顺序或待审空值边界：${palaceReview.reviewId}`);
  }
  const memberByRelation = new Map(palaceReview.members.map((member) => [member.relation, member]));
  const occurrenceIds = new Set<string>();
  const expectedOccurrenceFacts = palaceReview.members.flatMap((member) => (
    member.transformationStars.flatMap((star) => star.transformations.map(
      (transformation) => `${member.relation}/${member.palaceEarthlyBranchId}/${star.starId}/${transformation}`
    ))
  ));
  const actualOccurrenceFacts: string[] = [];
  for (const occurrence of transformationReview.occurrences) {
    const member = memberByRelation.get(occurrence.relation)
      ?? fail(`四段式候选的四化事实引用未知关系：${occurrence.occurrenceId}`);
    if (occurrenceIds.has(occurrence.occurrenceId)
      || occurrence.palaceEarthlyBranchId !== member.palaceEarthlyBranchId
      || occurrence.palaceRoleId !== member.palaceRoleId
      || occurrence.result !== null
      || occurrence.goodBadOrientation !== null
      || occurrence.eventOutcome !== null
      || occurrence.expertInterpretationIncluded
      || occurrence.expertTruthClaimed
      || occurrence.directOutcomeAllowed
      || occurrence.scoringAllowed) {
      throw new Error(`四段式候选的四化事实越过关系或待审边界：${occurrence.occurrenceId}`);
    }
    occurrenceIds.add(occurrence.occurrenceId);
    actualOccurrenceFacts.push(
      `${occurrence.relation}/${occurrence.palaceEarthlyBranchId}`
      + `/${occurrence.starId}/${occurrence.transformationLabel}`
    );
  }
  if (actualOccurrenceFacts.join("|") !== expectedOccurrenceFacts.join("|")) {
    throw new Error(`四段式候选的四化出现事实未完整消费：${transformationReview.reviewId}`);
  }
  if ((transformationReview.occurrences.length === 0
      && !transformationReview.absenceBoundary)
    || (transformationReview.occurrences.length > 0
      && transformationReview.absenceBoundary !== null)) {
    throw new Error(`四段式候选的四化空集合边界不一致：${transformationReview.reviewId}`);
  }
}

function formatStarBindings(
  bindings: readonly BrowserProbePalaceFourPartMajorStarBinding[]
): string {
  return bindings.map((binding) => {
    const markers = [binding.brightnessLabel, ...binding.transformations].filter(Boolean);
    return `${binding.relationLabel}${binding.palaceRoleLabel}${binding.starLabel}`
      + `${markers.length > 0 ? `〔${markers.join("·")}〕` : ""}`
      + `（${binding.positionSummary}）`;
  }).join("；");
}

function formatBrightnessAndTransformations(
  bindings: readonly BrowserProbePalaceFourPartMajorStarBinding[]
): string {
  if (bindings.length === 0) {
    return "三方四正内没有可绑定的十四主星亮度观察项。";
  }
  return `亮度与星曜四化观察项：${bindings.map((binding) => (
    `${binding.relationLabel}${binding.starLabel}〔亮度${binding.brightnessLabel ?? "未标注"}`
      + `；本命生年四化${binding.transformations.join("、") || "无标记"}〕`
  )).join("；")}。`;
}

function validatePalaceFourPartSynthesisContents(
  input: PalaceFourPartSynthesisInput,
  contents: readonly BrowserProbePalaceFourPartSynthesisContent[]
): readonly BrowserProbePalaceFourPartSynthesisContent[] {
  if (input.palaceFirstSynthesisReviews.length !== 12
    || input.palaceNatalTransformationReviews.length !== 12
    || contents.length !== 12) {
    throw new Error(
      "四段式候选要求十二份逐宫包、十二份四化包与十二份输出，实际为 "
      + `${input.palaceFirstSynthesisReviews.length}/`
      + `${input.palaceNatalTransformationReviews.length}/${contents.length}`
    );
  }
  const synthesisById = uniqueMap(
    input.majorStarSameStarSynthesisReviews,
    (synthesis) => synthesis.synthesisId,
    "四段式候选校验收到重复逐星 synthesisId"
  );
  const contentIds = new Set<string>();
  const targetBranches = new Set<string>();
  const targetSynthesisUses = new Map([...synthesisById.keys()].map((id) => [id, 0]));
  const groupSynthesisUses = new Map([...synthesisById.keys()].map((id) => [id, 0]));
  const riskyOutcomeLanguage = /一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸|疾病|寿命|适合/u;

  for (const content of contents) {
    const palaceReview = input.palaceFirstSynthesisReviews.find(
      (review) => review.targetEarthlyBranchId === content.targetEarthlyBranchId
    ) ?? fail(`四段式候选缺少来源逐宫包：${content.contentId}`);
    const transformationReview = input.palaceNatalTransformationReviews.find(
      (review) => review.targetEarthlyBranchId === content.targetEarthlyBranchId
    ) ?? fail(`四段式候选缺少来源四化包：${content.contentId}`);
    if (contentIds.has(content.contentId) || targetBranches.has(content.targetEarthlyBranchId)) {
      throw new Error(`四段式候选 ID 或目标宫位重复：${content.contentId}`);
    }
    if (content.parts.length !== 4
      || content.parts.map((part) => part.order).join("|") !== "1|2|3|4"
      || content.parts.map((part) => part.sectionId).join("|") !== SECTION_ORDER.join("|")) {
      throw new Error(`四段式候选 ${content.contentId} 未保持固定四段顺序`);
    }
    if (content.ruleSnapshotSha256 !== palaceReview.ruleSnapshotSha256
      || content.artifactFactsSha256 !== palaceReview.artifactFactsSha256
      || content.targetPalaceRoleId !== palaceReview.targetPalaceRoleId
      || content.targetMainStarState !== palaceReview.targetMainStarState) {
      throw new Error(`四段式候选 ${content.contentId} 的目标或摘要绑定不一致`);
    }

    const expectedRelationsBySection: Readonly<Record<BrowserProbePalaceFourPartSectionId,
      readonly BrowserProbeSanfangRelation[]>> = {
      palace_theme: ["self"],
      external_pull: RELATION_ORDER.slice(1),
      resource_pressure_observation: RELATION_ORDER,
      contradiction_synthesis: RELATION_ORDER
    };
    const memberByRelation = new Map(palaceReview.members.map((member) => [member.relation, member]));
    const synthesisRelation = new Map(palaceReview.groupMajorStarSynthesisIds.map((synthesisId) => {
      const synthesis = synthesisById.get(synthesisId)
        ?? fail(`四段式候选 ${content.contentId} 引用未知逐星包 ${synthesisId}`);
      const member = palaceReview.members.find(
        (candidate) => candidate.palaceEarthlyBranchId === synthesis.palaceEarthlyBranchId
      ) ?? fail(`四段式候选 ${content.contentId} 的逐星包不属于三方四正 ${synthesisId}`);
      return [synthesisId, member.relation] as const;
    }));

    for (const part of content.parts) {
      const expectedRelations = expectedRelationsBySection[part.sectionId];
      if (part.relationBindings.map((binding) => binding.relation).join("|")
        !== expectedRelations.join("|")) {
        throw new Error(`四段式候选 ${content.contentId}/${part.sectionId} 的关系顺序不完整`);
      }
      for (const relationBinding of part.relationBindings) {
        const member = memberByRelation.get(relationBinding.relation)
          ?? fail(`四段式候选 ${content.contentId} 缺少关系 ${relationBinding.relation}`);
        if (relationBinding.palaceEarthlyBranchId !== member.palaceEarthlyBranchId
          || relationBinding.palaceRoleId !== member.palaceRoleId) {
          throw new Error(`四段式候选 ${content.contentId}/${part.sectionId} 的关系宫位错误`);
        }
      }
      const expectedSynthesisIds = palaceReview.groupMajorStarSynthesisIds.filter(
        (synthesisId) => expectedRelations.includes(
          synthesisRelation.get(synthesisId)
            ?? fail(`四段式候选缺少逐星关系 ${synthesisId}`)
        )
      );
      if (part.majorStarBindings.map((binding) => binding.synthesisId).join("|")
        !== expectedSynthesisIds.join("|")) {
        throw new Error(`四段式候选 ${content.contentId}/${part.sectionId} 未完整消费逐星包`);
      }
      const expectedOccurrenceIds = transformationReview.occurrences
        .filter((occurrence) => expectedRelations.includes(occurrence.relation))
        .map((occurrence) => occurrence.occurrenceId);
      if (part.transformationOccurrenceIds.join("|") !== expectedOccurrenceIds.join("|")) {
        throw new Error(`四段式候选 ${content.contentId}/${part.sectionId} 的四化出现绑定不一致`);
      }
      if (part.ruleSnapshotSha256 !== content.ruleSnapshotSha256
        || part.artifactFactsSha256 !== content.artifactFactsSha256
        || part.sourceRefs.length === 0
        || new Set(part.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size
          !== part.sourceRefs.length
        || part.sourceRefs.some((sourceRef) => !sourceRef.sourceId || !sourceRef.locator)
        || riskyOutcomeLanguage.test(part.directStatement)) {
        throw new Error(`四段式候选 ${content.contentId}/${part.sectionId} 越过摘要、来源或措辞边界`);
      }
      for (const binding of part.majorStarBindings) {
        const synthesis = synthesisById.get(binding.synthesisId)
          ?? fail(`四段式候选 ${content.contentId} 引用未知逐星包 ${binding.synthesisId}`);
        if (binding.starId !== synthesis.starId
          || binding.starLabel !== synthesis.label
          || binding.palaceEarthlyBranchId !== synthesis.palaceEarthlyBranchId
          || binding.palaceRoleId !== synthesis.palaceRoleId
          || binding.positionCandidateContentId !== synthesis.positionCandidate.contentId
          || binding.positionSummary !== synthesis.positionCandidate.positionSummary
          || binding.brightnessLabel !== synthesis.combinationReview.selfState.brightnessLabel
          || binding.transformations.join("|")
            !== synthesis.combinationReview.selfState.transformations.join("|")) {
          throw new Error(`四段式候选 ${content.contentId} 的逐星可追溯字段不一致`);
        }
      }
    }

    const firstPart = content.parts[0];
    if (content.targetMainStarState === "empty_in_verified_facts"
      && (firstPart.majorStarBindings.length !== 0
        || !firstPart.directStatement.includes("不借用对宫或两组三合位主星"))) {
      throw new Error(`四段式候选 ${content.contentId} 的空宫边界未失败关闭`);
    }
    if (transformationReview.occurrences.length === 0
      && content.parts.some((part) => part.transformationOccurrenceIds.length !== 0)) {
      throw new Error(`四段式候选 ${content.contentId} 在无四化时补造了出现事实`);
    }
    if (content.sourceRefs.length === 0
      || new Set(content.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size
        !== content.sourceRefs.length
      || content.selectedDominantTheme !== null
      || content.resourcePressureOrientation !== null
      || content.goodBadOrientation !== null
      || content.eventOutcome !== null
      || content.result !== null
      || content.reviewStatus !== "awaiting_expert_review"
      || content.publicationStatus !== "isolated_candidate_only"
      || !content.factsDerivedFromVerifiedArtifact
      || !content.editorialCandidateIncluded
      || content.expertInterpretationIncluded
      || content.expertTruthClaimed
      || content.directOutcomeAllowed
      || content.scoringAllowed) {
      throw new Error(`四段式候选 ${content.contentId} 越过待审空值边界`);
    }

    for (const synthesisId of palaceReview.targetStarSynthesisIds) {
      targetSynthesisUses.set(synthesisId, (targetSynthesisUses.get(synthesisId) ?? 0) + 1);
    }
    for (const synthesisId of palaceReview.groupMajorStarSynthesisIds) {
      groupSynthesisUses.set(synthesisId, (groupSynthesisUses.get(synthesisId) ?? 0) + 1);
    }
    contentIds.add(content.contentId);
    targetBranches.add(content.targetEarthlyBranchId);
  }

  if ([...targetSynthesisUses.values()].some((count) => count !== 1)
    || [...groupSynthesisUses.values()].some((count) => count !== 4)) {
    throw new Error("四段式候选必须让每份逐星包恰好作为本宫一次、作为三方四正四次被完整消费");
  }
  return Object.freeze([...contents]);
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

function uniqueMap<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
  duplicateMessage: string
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key)) throw new Error(`${duplicateMessage}：${key}`);
    result.set(key, value);
  }
  return result;
}

function requireSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} 不是小写十六进制 SHA-256`);
}

function fail(message: string): never {
  throw new Error(message);
}
