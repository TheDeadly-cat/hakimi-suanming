import type { ZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";
import type {
  BrowserProbeDisplayPalace,
  BrowserProbeDisplayProjection,
  BrowserProbeDisplaySanfangGroup
} from "./browser-protocol.ts";
import {
  requireMajorStarCandidateContent,
  ZIWEI_MAJOR_STAR_CONTENT_SOURCES
} from "./major-star-content.ts";
import {
  requireMajorStarPalaceCandidateContent,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES
} from "./major-star-palace-content.ts";
import {
  assertCoreMinorStarFactProjectionWithinBoundary,
  resolveCoreMinorStarCandidateContent,
  resolveCoreMinorStarPalaceCandidateContent,
  ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT,
  ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES,
  ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT
} from "./core-minor-star-content.ts";
import {
  createMajorStarPalaceCombinationReviews,
  ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES
} from "./major-star-combination-review.ts";
import { createMajorStarSameStarSynthesisReviews } from "./major-star-synthesis-review.ts";
import { createPalaceFirstSynthesisReviews } from "./palace-first-synthesis-review.ts";
import {
  ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT,
  ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES
} from "./natal-transformation-content.ts";
import { ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT }
  from "./natal-transformation-palace-content.ts";
import { createPalaceNatalTransformationReviews } from "./natal-transformation-review.ts";
import { createPalaceFourPartSynthesisContents }
  from "./palace-four-part-synthesis-content.ts";
import {
  createCoreMinorStarSanfangReviews,
  ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
  ZIWEI_CORE_MINOR_STAR_SANFANG_RELATIONS
}
  from "./core-minor-star-sanfang-review.ts";

const ROLE_LABELS = Object.freeze<Record<string, string>>({
  life: "命宫",
  siblings: "兄弟",
  spouse: "夫妻",
  children: "子女",
  wealth: "财帛",
  health: "疾厄",
  travel: "迁移",
  friends: "交友",
  career: "官禄",
  property: "田宅",
  wellbeing: "福德",
  parents: "父母"
});
const BRANCH_LABELS = Object.freeze<Record<string, string>>({
  zi: "子", chou: "丑", yin: "寅", mao: "卯", chen: "辰", si: "巳",
  wu: "午", wei: "未", shen: "申", you: "酉", xu: "戌", hai: "亥"
});
const STEM_LABELS = Object.freeze<Record<string, string>>({
  jia: "甲", yi: "乙", bing: "丙", ding: "丁", wu: "戊",
  ji: "己", geng: "庚", xin: "辛", ren: "壬", gui: "癸"
});
const BRIGHTNESS_LABELS = Object.freeze<Record<string, string>>({
  miao: "庙", wang: "旺", de: "得", li: "利", ping: "平", xian: "陷", bu: "不"
});
const TRANSFORMATION_LABELS = Object.freeze<Record<string, string>>({
  lu: "禄", quan: "权", ke: "科", ji: "忌"
});
const BUREAU_LABELS = Object.freeze<Record<string, string>>({
  water_2: "水二局", wood_3: "木三局", metal_4: "金四局", earth_5: "土五局", fire_6: "火六局"
});

/**
 * Display is derived locally from the already-verified artifact. The main thread never
 * accepts Worker-supplied labels, categories, brightness or transformation projections.
 */
export function createZiweiBrowserDisplayProjection(
  artifact: ZiweiBrowserEngineeringArtifactDraft
): BrowserProbeDisplayProjection {
  const facts = artifact.facts;
  const starLabelById = new Map(
    artifact.ruleSnapshot.rules.starRegistry.entries.map((entry) => [entry.starId, entry.zhCnLabel])
  );
  const lunar = facts.calendarFacts.lunarDate;
  const ganzhi = facts.calendarFacts.ganzhi;
  const displayPalaces: readonly BrowserProbeDisplayPalace[] = facts.palaces.map((palace) => ({
    earthlyBranchId: palace.earthlyBranchId,
    earthlyBranchLabel: label(BRANCH_LABELS, palace.earthlyBranchId),
    heavenlyStemLabel: label(STEM_LABELS, palace.heavenlyStemId),
    roleId: palace.roleId,
    roleLabel: label(ROLE_LABELS, palace.roleId),
    isBodyPalace: palace.isBodyPalace,
    stars: palace.stars.map((star) => {
      const starLabel = starLabelById.get(star.starId)
        ?? fail(`已验真事实中的星曜 ${star.starId} 缺少冻结显示标签`);
      const coreMinorCandidateContent = resolveCoreMinorStarCandidateContent(
        star.starId,
        starLabel,
        star.category
      );
      assertCoreMinorStarFactProjectionWithinBoundary(
        coreMinorCandidateContent,
        palace.earthlyBranchId,
        star.brightnessId,
        star.transformationIds,
        facts.directionBasis.yearStemId
      );
      return {
        starId: star.starId,
        label: starLabel,
        category: star.category,
        brightnessLabel: star.brightnessId ? label(BRIGHTNESS_LABELS, star.brightnessId) : null,
        transformations: star.transformationIds.map((id) => label(TRANSFORMATION_LABELS, id)),
        candidateContent: star.category === "major"
          ? requireMajorStarCandidateContent(star.starId, starLabel)
          : null,
        palaceCandidateContent: star.category === "major"
          ? requireMajorStarPalaceCandidateContent(star.starId, starLabel, palace.roleId)
          : null,
        coreMinorCandidateContent,
        coreMinorPalaceCandidateContent: resolveCoreMinorStarPalaceCandidateContent(
          star.starId,
          starLabel,
          star.category,
          palace.roleId
        )
      };
    })
  }));
  const displaySanfangGroups = createDisplaySanfangGroups(displayPalaces);
  const majorStarPalaceCombinationReviews = createMajorStarPalaceCombinationReviews({
    palaces: displayPalaces,
    sanfangGroups: displaySanfangGroups,
    ruleSnapshotSha256: artifact.ruleSnapshot.ruleSnapshotSha256,
    artifactFactsSha256: artifact.digests.factsSha256
  });
  const majorStarSameStarSynthesisReviews = createMajorStarSameStarSynthesisReviews({
    palaces: displayPalaces,
    combinationReviews: majorStarPalaceCombinationReviews
  });
  const palaceFirstSynthesisReviews = createPalaceFirstSynthesisReviews({
    palaces: displayPalaces,
    sanfangGroups: displaySanfangGroups,
    sameStarSyntheses: majorStarSameStarSynthesisReviews,
    sanfangProjectionRule: ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
    ruleSnapshotSha256: artifact.ruleSnapshot.ruleSnapshotSha256,
    artifactFactsSha256: artifact.digests.factsSha256
  });
  const palaceNatalTransformationReviews = createPalaceNatalTransformationReviews({
    palaces: displayPalaces,
    sanfangGroups: displaySanfangGroups,
    ruleSnapshotSha256: artifact.ruleSnapshot.ruleSnapshotSha256,
    artifactFactsSha256: artifact.digests.factsSha256
  });
  const palaceFourPartSynthesisContents = createPalaceFourPartSynthesisContents({
    palaceFirstSynthesisReviews,
    majorStarSameStarSynthesisReviews,
    palaceNatalTransformationReviews
  });
  const coreMinorStarSanfangReviews = createCoreMinorStarSanfangReviews({
    palaces: displayPalaces,
    sanfangGroups: displaySanfangGroups,
    sanfangProjectionRule: ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
    ruleSnapshotSha256: artifact.ruleSnapshot.ruleSnapshotSha256,
    artifactFactsSha256: artifact.digests.factsSha256
  });
  return {
    displayPalaces,
    displaySanfangGroups,
    sanfangProjectionRule: ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
    majorStarContentSources: ZIWEI_MAJOR_STAR_CONTENT_SOURCES,
    majorStarPalaceContentSources: ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES,
    coreMinorStarContentSources: ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES,
    coreMinorStarCandidateContent: ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT,
    coreMinorStarPalaceCandidateContent: ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT,
    majorStarCombinationReviewSources: ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES,
    natalTransformationContentSources: ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES,
    natalTransformationCandidateContent: ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT,
    natalTransformationPalaceCandidateContent:
      ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT,
    majorStarPalaceCombinationReviews,
    majorStarSameStarSynthesisReviews,
    palaceFirstSynthesisReviews,
    palaceNatalTransformationReviews,
    palaceFourPartSynthesisContents,
    coreMinorStarSanfangReviews,
    displaySummary: {
      gregorianDate: facts.calendarFacts.gregorianDate,
      lunarDate: `${lunar.year}年${lunar.isLeapMonth ? "闰" : ""}${lunar.month}月${lunar.day}日`,
      shichen: `${label(BRANCH_LABELS, facts.calendarFacts.shichen.branchId)}时 ${facts.calendarFacts.shichen.civilRange}`,
      sex: facts.directionBasis.sexForCalculation === "male" ? "男" : "女",
      lifePalace: label(BRANCH_LABELS, facts.lifePalaceBranchId),
      bodyPalace: label(BRANCH_LABELS, facts.bodyPalaceBranchId),
      fiveElementBureau: label(BUREAU_LABELS, facts.fiveElementBureauId),
      direction: facts.directionBasis.resolvedDirection === "forward" ? "顺行" : "逆行",
      ganzhi: [ganzhi.year, ganzhi.month, ganzhi.day, ganzhi.hour].map(ganzhiLabel).join(" · ")
    }
  };
}

function createDisplaySanfangGroups(
  palaces: readonly BrowserProbeDisplayPalace[]
): readonly BrowserProbeDisplaySanfangGroup[] {
  if (palaces.length !== 12) {
    return fail(`三方四正事实投影需要十二宫，实际收到 ${palaces.length} 宫`);
  }
  const uniqueBranches = new Set(palaces.map((palace) => palace.earthlyBranchId));
  if (uniqueBranches.size !== 12) {
    return fail("三方四正事实投影要求十二个不重复地支宫位");
  }
  return palaces.map((target, targetIndex) => ({
    targetEarthlyBranchId: target.earthlyBranchId,
    targetRoleId: target.roleId,
    members: ZIWEI_CORE_MINOR_STAR_SANFANG_RELATIONS.map(({
      relation, relationLabel, offset
    }) => {
      const palaceIndex = (targetIndex + offset + palaces.length) % palaces.length;
      const palace = palaces[palaceIndex]
        ?? fail(`三方四正事实投影找不到序号 ${palaceIndex} 的宫位`);
      return { relation, relationLabel, palace };
    })
  }));
}

function ganzhiLabel(value: string): string {
  const match = /^(jia|yi|bing|ding|wu|ji|geng|xin|ren|gui)_(zi|chou|yin|mao|chen|si|wu|wei|shen|you|xu|hai)$/u
    .exec(value);
  if (!match) return fail(`已验真事实中的干支 ${value} 不是规范标识`);
  return `${label(STEM_LABELS, match[1]!)}${label(BRANCH_LABELS, match[2]!)}`;
}

function label(dictionary: Readonly<Record<string, string>>, key: string): string {
  return dictionary[key] ?? fail(`已验真事实缺少显示标签 ${key}`);
}

function fail(message: string): never {
  throw new Error(message);
}
