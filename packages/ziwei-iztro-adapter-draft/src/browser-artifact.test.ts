// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import {
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ziweiNatalFixtureDraftSchema,
  type ZiweiBirthInputDraft,
  type ZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import {
  createZiweiBrowserEngineeringArtifactDraft,
  calculateZiweiBrowserSourceGraphSha256,
  verifyZiweiBrowserEngineeringArtifactDraft,
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  ziweiBrowserEngineeringArtifactDraftSchema,
  type ZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserSourceIdentityDraft
} from "./browser-preview/browser-artifact.ts";
import { requireVerifiedBrowserProbeResponse } from "./browser-preview/main-response-gate.ts";
import { createZiweiBrowserDisplayProjection } from "./browser-preview/display-projection.ts";
import {
  ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT,
  ZIWEI_MAJOR_STAR_CONTENT_SOURCES,
  ZIWEI_MAJOR_STAR_CONTENT_VERSION
} from "./browser-preview/major-star-content.ts";
import {
  ZIWEI_PALACE_ROLE_IDS,
  ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT,
  ZIWEI_PALACE_ROLE_CONTENT_VERSION,
  ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_VERSION,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES
} from "./browser-preview/major-star-palace-content.ts";
import {
  assertCoreMinorStarCandidateTextWithinRiskBoundary,
  assertCoreMinorStarFactProjectionWithinBoundary,
  resolveCoreMinorStarCandidateContent,
  resolveCoreMinorStarPalaceCandidateContent,
  ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT,
  ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES,
  ZIWEI_CORE_MINOR_STAR_CONTENT_VERSION,
  ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES,
  ZIWEI_CORE_MINOR_STAR_IDS,
  ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT,
  ZIWEI_CORE_MINOR_STAR_PALACE_CONTENT_VERSION
} from "./browser-preview/core-minor-star-content.ts";
import { ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION }
  from "./browser-preview/core-minor-star-sanfang-review.ts";
import {
  ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES,
  ZIWEI_MAJOR_STAR_PALACE_COMBINATION_REVIEW_VERSION
} from "./browser-preview/major-star-combination-review.ts";
import { ZIWEI_MAJOR_STAR_SAME_STAR_SYNTHESIS_REVIEW_VERSION } from "./browser-preview/major-star-synthesis-review.ts";
import { ZIWEI_PALACE_FIRST_SYNTHESIS_REVIEW_VERSION } from "./browser-preview/palace-first-synthesis-review.ts";
import {
  ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT,
  ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES,
  ZIWEI_NATAL_TRANSFORMATION_CONTENT_VERSION
} from "./browser-preview/natal-transformation-content.ts";
import {
  ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION
} from "./browser-preview/natal-transformation-palace-content.ts";
import { ZIWEI_PALACE_NATAL_TRANSFORMATION_REVIEW_VERSION } from "./browser-preview/natal-transformation-review.ts";
import {
  createPalaceFourPartSynthesisContents,
  ZIWEI_PALACE_FOUR_PART_SYNTHESIS_CONTENT_VERSION
} from "./browser-preview/palace-four-part-synthesis-content.ts";
import {
  ZIWEI_BROWSER_PROBE_PROTOCOL,
  type BrowserProbeSuccessResponse
} from "./browser-preview/browser-protocol.ts";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const WORKER_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_WORKER_ID = "33333333-3333-4333-8333-333333333333";
const STARTED_AT = "2026-08-10T00:00:00.000Z";
const COMPLETED_AT = "2026-08-10T00:00:00.010Z";

const TEST_BRANCH_IDS = [
  "zi", "chou", "yin", "mao", "chen", "si",
  "wu", "wei", "shen", "you", "xu", "hai"
] as const;

function brightnessByEarthlyBranch(
  values: readonly ("miao" | "wang" | "de" | "li" | "ping" | "xian" | "bu" | null)[]
): Readonly<Record<typeof TEST_BRANCH_IDS[number], string | null>> {
  return Object.fromEntries(TEST_BRANCH_IDS.map((branchId, index) => [branchId, values[index]])) as
    Readonly<Record<typeof TEST_BRANCH_IDS[number], string | null>>;
}

function nullBrightnessByEarthlyBranch(): Readonly<Record<
  typeof TEST_BRANCH_IDS[number],
  null
>> {
  return brightnessByEarthlyBranch(Array.from({ length: 12 }, () => null)) as
    Readonly<Record<typeof TEST_BRANCH_IDS[number], null>>;
}

const INPUT: ZiweiBirthInputDraft = {
  contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  systemId: ZIWEI_DOUSHU_SYSTEM_ID,
  calendarInput: { calendar: "gregorian", date: "1995-08-18" },
  shichenIndex: 6,
  sexForCalculation: "male",
  solarTimeAdjustment: "none",
  civilContext: {
    usedForCalculation: false,
    localTime: null,
    timeZone: null,
    location: {
      precision: "unknown",
      label: "browser-artifact-test",
      latitude: null,
      longitude: null
    }
  },
  birthSourceRef: "local.browser.test",
  sourceNote: "Browser engineering artifact integrity test input."
};

let nodeFixture: ZiweiNatalFixtureDraft;
let artifact: ZiweiBrowserEngineeringArtifactDraft;
let successResponse: BrowserProbeSuccessResponse;
let browserSourceIdentity: ZiweiBrowserSourceIdentityDraft;

beforeAll(async () => {
  const ruleSnapshot = await createIztro258RuleSnapshotDraft();
  nodeFixture = await calculateIztro258EngineeringFixture(INPUT, { ruleSnapshot });
  const files = ZIWEI_BROWSER_SOURCE_PATHS.map((path, index) => ({
    path,
    sha256: (index + 1).toString(16).padStart(64, "0")
  }));
  const sourceProjection = {
    identityVersion: ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
    digestAlgorithm: ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
    files
  } as const;
  browserSourceIdentity = {
    ...sourceProjection,
    browserSourceGraphSha256: await calculateZiweiBrowserSourceGraphSha256(sourceProjection),
    browserWorkerSourceSha256: files.find((entry) => entry.path.endsWith("browser-worker.ts"))!.sha256
  };
  artifact = await createZiweiBrowserEngineeringArtifactDraft({
    input: nodeFixture.input,
    ruleSnapshot: nodeFixture.ruleSnapshot,
    facts: nodeFixture.facts,
    requestId: REQUEST_ID,
    workerInstanceId: WORKER_ID,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    browserSourceIdentity
  });
  successResponse = {
    ok: true,
    protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
    requestId: REQUEST_ID,
    workerInstanceId: WORKER_ID,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    result: { artifact }
  };
}, 30_000);

describe("Ziwei Browser engineering artifact", () => {
  it("freezes one neutral, source-bound candidate for every one of the fourteen major stars", () => {
    expect(ZIWEI_MAJOR_STAR_CONTENT_VERSION).toBe("ziwei.major_star.neutral_candidate/0.1");
    expect(ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT).toHaveLength(14);
    expect(new Set(ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.map((entry) => entry.starId)).size).toBe(14);
    expect(new Set(ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.map((entry) => entry.contentId)).size).toBe(14);
    expect(ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.map((entry) => entry.label)).toEqual([
      "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府",
      "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"
    ]);
    expect(ZIWEI_MAJOR_STAR_CONTENT_SOURCES).toHaveLength(2);
    const sourceIds = new Set(ZIWEI_MAJOR_STAR_CONTENT_SOURCES.map((source) => source.sourceId));
    for (const entry of ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT) {
      expect(entry.coreThemes).toHaveLength(3);
      expect(entry.reviewStatus).toBe("awaiting_expert_review");
      expect(entry.publicationStatus).toBe("isolated_candidate_only");
      expect(entry.expertTruthClaimed).toBe(false);
      expect(entry.directOutcomeAllowed).toBe(false);
      expect(entry.scoringAllowed).toBe(false);
      expect(entry.sourceRefs).toHaveLength(2);
      expect(entry.sourceRefs.every((ref) => sourceIds.has(ref.sourceId))).toBe(true);
      expect(`${entry.plainLanguage}${entry.balancePrompt}`).not.toMatch(/你|一定|必然|注定|保证|终身|大吉|大凶/u);
    }
  });

  it("freezes exactly twelve source-bound neutral core-minor candidates without alias or category broadcast", () => {
    expect(ZIWEI_CORE_MINOR_STAR_CONTENT_VERSION)
      .toBe("ziwei.core_minor_star.neutral_candidate/0.1");
    expect(ZIWEI_CORE_MINOR_STAR_IDS).toEqual([
      "ziwei.star.iztro.zuofu-min",
      "ziwei.star.iztro.youbi-min",
      "ziwei.star.iztro.wenchang-min",
      "ziwei.star.iztro.wenqu-min",
      "ziwei.star.iztro.tiankui-min",
      "ziwei.star.iztro.tianyue-min",
      "ziwei.star.iztro.qingyang-min",
      "ziwei.star.iztro.tuoluo-min",
      "ziwei.star.iztro.huoxing-min",
      "ziwei.star.iztro.lingxing-min",
      "ziwei.star.iztro.dikong-min",
      "ziwei.star.iztro.dijie-min"
    ]);
    expect(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT).toHaveLength(12);
    expect(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.map((entry) => entry.label)).toEqual([
      "左辅", "右弼", "文昌", "文曲", "天魁", "天钺",
      "擎羊", "陀罗", "火星", "铃星", "地空", "地劫"
    ]);
    expect(new Set(
      ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.map((entry) => entry.contentId)
    ).size).toBe(12);
    expect(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.filter(
      (entry) => entry.traditionalCluster === "supporting_six"
    )).toHaveLength(6);
    expect(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.filter(
      (entry) => entry.traditionalCluster === "challenging_six"
    )).toHaveLength(6);

    expect(ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES).toHaveLength(2);
    for (const source of ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES) {
      expect(source.sourceUrl.startsWith("https://")).toBe(true);
      expect(source.usageBoundary).toContain("候选");
      expect(source.usageBoundary).toContain("流派");
      expect(source.candidateUseOnly).toBe(true);
      expect(source.schoolBoundaryDeclared).toBe(true);
      expect(source.expertTruthClaimed).toBe(false);
    }
    expect(ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES[0]?.usageBoundary).toContain(
      "本项目只取左辅、右弼、文昌、文曲、天魁、天钺、擎羊、陀罗、火星、铃星、地空、地劫这十二个精确星键"
    );
    expect(ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES[0]?.usageBoundary).toContain(
      "分组不等于个人好坏是本项目另行施加"
    );

    const frozenLabels = new Map(
      artifact.ruleSnapshot.rules.starRegistry.entries.map((entry) => [entry.starId, entry.zhCnLabel])
    );
    for (const candidate of ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT) {
      expect(candidate.label).toBe(frozenLabels.get(candidate.starId));
      expect(candidate.factCategory).toBe("minor");
      expect(candidate.traditionalClusterIsOutcome).toBe(false);
      expect(candidate.traditionalClusterBoundary).toContain("不表示");
      expect(candidate.coreThemes).toHaveLength(3);
      expect(`${candidate.coreThemes.join("")}${candidate.plainLanguage}`).not.toMatch(
        /破财|贫困|疾病|寿命|死亡|手术|生育|婚期|离婚|克夫|克妻|继承|投资建议|可信|背叛|心理诊断/u
      );
      expect(candidate.counterweight).not.toMatch(/事故|暴力|破财|贫困|心理问题/u);
      expect(candidate.sourceRefs).toHaveLength(2);
      expect(candidate.sourceRefs.filter((sourceRef) => sourceRef.semanticCandidateSupport))
        .toEqual([expect.objectContaining({ bindingTarget: "exact_star" })]);
      expect(candidate.goodBadOrientation).toBeNull();
      expect(candidate.eventOutcome).toBeNull();
      expect(candidate.result).toBeNull();
      expect(candidate.reviewStatus).toBe("awaiting_expert_review");
      expect(candidate.publicationStatus).toBe("isolated_candidate_only");
      expect(candidate.expertTruthClaimed).toBe(false);
      expect(candidate.directOutcomeAllowed).toBe(false);
      expect(candidate.scoringAllowed).toBe(false);
    }

    const factBoundaries = Object.fromEntries(
      ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES.map((boundary) => [
        boundary.starId,
        {
          brightnessCanAppear: boundary.brightnessCanAppear,
          brightnessByEarthlyBranch: boundary.brightnessByEarthlyBranch,
          transformations: boundary.natalBirthYearTransformationRules.map(
            (rule) => `${rule.yearStemId}:${rule.transformationLabel}`
          )
        }
      ])
    );
    expect(factBoundaries).toEqual({
      "ziwei.star.iztro.zuofu-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: ["ren:科"]
      },
      "ziwei.star.iztro.youbi-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: ["wu:科"]
      },
      "ziwei.star.iztro.wenchang-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          "de", "miao", "xian", "li", "de", "miao", "xian", "li", "de", "miao", "xian", "li"
        ]),
        transformations: ["bing:科", "xin:忌"]
      },
      "ziwei.star.iztro.wenqu-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          "de", "miao", "ping", "wang", "de", "miao", "xian", "wang", "de", "miao", "xian", "wang"
        ]),
        transformations: ["ji:忌", "xin:科"]
      },
      "ziwei.star.iztro.tiankui-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: []
      },
      "ziwei.star.iztro.tianyue-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: []
      },
      "ziwei.star.iztro.qingyang-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          "xian", "miao", null, "xian", "miao", null, "xian", "miao", null, "xian", "miao", null
        ]),
        transformations: []
      },
      "ziwei.star.iztro.tuoluo-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          null, "miao", "xian", null, "miao", "xian", null, "miao", "xian", null, "miao", "xian"
        ]),
        transformations: []
      },
      "ziwei.star.iztro.huoxing-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li"
        ]),
        transformations: []
      },
      "ziwei.star.iztro.lingxing-min": {
        brightnessCanAppear: true,
        brightnessByEarthlyBranch: brightnessByEarthlyBranch([
          "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li"
        ]),
        transformations: []
      },
      "ziwei.star.iztro.dikong-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: []
      },
      "ziwei.star.iztro.dijie-min": {
        brightnessCanAppear: false,
        brightnessByEarthlyBranch: nullBrightnessByEarthlyBranch(),
        transformations: []
      }
    });
    expect(ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES.every(
      (boundary) => boundary.factValuesOnly && !boundary.interpretationIncluded
    )).toBe(true);
    const frozenBrightnessRows = new Map(
      artifact.ruleSnapshot.rules.brightnessTable.entries.map((entry) => [entry.starId, entry.byEarthlyBranch])
    );
    for (const boundary of ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES) {
      expect(boundary.brightnessByEarthlyBranch).toEqual(
        frozenBrightnessRows.get(boundary.starId) ?? nullBrightnessByEarthlyBranch()
      );
      expect(boundary.brightnessCanAppear).toBe(
        Object.values(boundary.brightnessByEarthlyBranch).some((value) => value !== null)
      );
    }

    const dikong = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.find(
      (candidate) => candidate.starId === "ziwei.star.iztro.dikong-min"
    );
    expect(dikong?.sourceRefs.find(
      (sourceRef) => sourceRef.bindingTarget === "nomenclature_conflict"
    )).toMatchObject({ semanticCandidateSupport: false });
    expect(dikong?.sourceRefs.find(
      (sourceRef) => sourceRef.bindingTarget === "nomenclature_conflict"
    )?.locator).toContain("不是项目星键地空");

    expect(resolveCoreMinorStarCandidateContent(
      "ziwei.star.iztro.wenchang-min",
      "文昌",
      "minor"
    )).toBe(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT[2]);
    expect(() => resolveCoreMinorStarCandidateContent(
      "ziwei.star.iztro.wenchang-min",
      "文曲",
      "minor"
    )).toThrow(/标签不匹配/u);
    expect(() => resolveCoreMinorStarCandidateContent(
      "ziwei.star.iztro.wenchang-min",
      "文昌",
      "auxiliary"
    )).toThrow(/必须来自 minor 事实/u);
    expect(resolveCoreMinorStarCandidateContent(
      "ziwei.star.iztro.lucun-min",
      "禄存",
      "minor"
    )).toBeNull();
    const tiankong = artifact.ruleSnapshot.rules.starRegistry.entries.find(
      (entry) => entry.zhCnLabel === "天空"
    );
    expect(tiankong).toBeDefined();
    expect(resolveCoreMinorStarCandidateContent(
      tiankong!.starId,
      tiankong!.zhCnLabel,
      "auxiliary"
    )).toBeNull();
    expect(() => resolveCoreMinorStarCandidateContent(
      "ziwei.star.iztro.dikong-min",
      "天空",
      "minor"
    )).toThrow(/标签不匹配/u);

    const wenchang = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT[2]!;
    const tiankui = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT[4]!;
    const qingyang = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT[6]!;
    const tuoluo = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT[7]!;
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      wenchang,
      "chou",
      "miao",
      ["ke"],
      "bing"
    )).not.toThrow();
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      tiankui,
      "chou",
      "miao",
      [],
      "yi"
    )).toThrow(/在 chou 的亮度必须为 null/u);
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      wenchang,
      "chou",
      "miao",
      ["ke"],
      "yi"
    )).toThrow(/本命四化不在冻结事实边界/u);
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      qingyang,
      "yin",
      null,
      [],
      "yi"
    )).not.toThrow();
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      qingyang,
      "yin",
      "miao",
      [],
      "yi"
    )).toThrow(/在 yin 的亮度必须为 null/u);
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      tuoluo,
      "yin",
      "xian",
      [],
      "yi"
    )).not.toThrow();
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      tuoluo,
      "yin",
      null,
      [],
      "yi"
    )).toThrow(/在 yin 的亮度必须为 xian/u);
    expect(() => assertCoreMinorStarFactProjectionWithinBoundary(
      wenchang,
      "unknown",
      "miao",
      ["ke"],
      "bing"
    )).toThrow(/未知地支/u);

    const highRiskPhrases = [
      "必有灾祸", "必见血光", "注定牢狱", "必有残疾", "寿数夭折",
      "必然流产", "已经妊娠", "财富多寡已定", "职业失业", "患有精神病", "人格定型"
    ];
    for (const forwardText of highRiskPhrases) {
      expect(() => assertCoreMinorStarCandidateTextWithinRiskBoundary({
        forwardText,
        counterweight: "只观察条件，不写结果。"
      })).toThrow(/高风险结果语言/u);
    }
    expect(() => assertCoreMinorStarCandidateTextWithinRiskBoundary({
      forwardText: "观察表达与现实条件如何互动。",
      counterweight: "必须核对现实资料，不能从候选直接推出结果。",
      reviewerOnlyText: "本条不判断财富多寡、疾病、妊娠、流产、失业、精神病或人格定型。"
    })).not.toThrow();
    expect(() => assertCoreMinorStarCandidateTextWithinRiskBoundary({
      forwardText: "观察表达与现实条件如何互动。",
      counterweight: "这也可能预示血光或牢狱。"
    })).toThrow(/反向提醒不得枚举惊吓性断语/u);
  });

  it("freezes all 144 core-minor palace candidates with null outcomes", () => {
    expect(ZIWEI_CORE_MINOR_STAR_PALACE_CONTENT_VERSION)
      .toBe("ziwei.core_minor_star_all_palaces.neutral_candidate/0.1");
    expect(ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT).toHaveLength(144);
    expect(new Set(
      ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT.map((candidate) => candidate.contentId)
    ).size).toBe(144);
    expect(new Set(
      ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT.map((candidate) => candidate.positionSummary)
    ).size).toBe(144);

    for (const starId of ZIWEI_CORE_MINOR_STAR_IDS) {
      expect(ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT.filter(
        (candidate) => candidate.starId === starId
      )).toHaveLength(12);
    }
    for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
      expect(ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT.filter(
        (candidate) => candidate.palaceRoleId === palaceRoleId
      )).toHaveLength(12);
    }
    for (const candidate of ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT) {
      expect(candidate.factCategory).toBe("minor");
      expect(candidate.traditionalClusterIsOutcome).toBe(false);
      expect(candidate.positionSummary.startsWith(
        `${candidate.label}落${candidate.palaceRoleLabel}`
      )).toBe(true);
      expect(candidate.positionSummary).not.toMatch(
        /破财|贫困|疾病|寿命|死亡|手术|生育|婚期|离婚|克夫|克妻|继承|投资建议|可信|背叛|心理诊断/u
      );
      expect(candidate.sourceRefs).toHaveLength(4);
      expect(new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size).toBe(4);
      expect(candidate.requiresCombinationReview).toBe(true);
      expect(candidate.goodBadOrientation).toBeNull();
      expect(candidate.eventOutcome).toBeNull();
      expect(candidate.result).toBeNull();
      expect(candidate.expertTruthClaimed).toBe(false);
      expect(candidate.directOutcomeAllowed).toBe(false);
      expect(candidate.scoringAllowed).toBe(false);
    }

    const tuoluoLife = resolveCoreMinorStarPalaceCandidateContent(
      "ziwei.star.iztro.tuoluo-min",
      "陀罗",
      "minor",
      "life"
    );
    expect(tuoluoLife).toMatchObject({
      label: "陀罗",
      palaceRoleId: "life",
      palaceRoleLabel: "命宫",
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
    expect(tuoluoLife?.positionSummary).toContain("陀罗落命宫");
    expect(resolveCoreMinorStarPalaceCandidateContent(
      "ziwei.star.iztro.lucun-min",
      "禄存",
      "minor",
      "life"
    )).toBeNull();
  });

  it("projects core-minor content only onto exact facts and keeps all other stars null", () => {
    const projection = createZiweiBrowserDisplayProjection(artifact);
    expect(projection.coreMinorStarContentSources).toEqual(ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES);
    expect(projection.coreMinorStarCandidateContent)
      .toEqual(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT);
    expect(projection.coreMinorStarPalaceCandidateContent)
      .toEqual(ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT);

    const stars = projection.displayPalaces.flatMap((palace) => palace.stars.map((star) => ({
      ...star,
      palaceRoleId: palace.roleId,
      earthlyBranchId: palace.earthlyBranchId
    })));
    const projectedCoreMinorStars = stars.filter((star) => star.coreMinorCandidateContent !== null);
    expect(projectedCoreMinorStars).toHaveLength(12);
    expect(new Set(projectedCoreMinorStars.map((star) => star.starId)))
      .toEqual(new Set(ZIWEI_CORE_MINOR_STAR_IDS));
    for (const star of projectedCoreMinorStars) {
      expect(star.category).toBe("minor");
      expect(star.coreMinorCandidateContent?.starId).toBe(star.starId);
      expect(star.coreMinorPalaceCandidateContent).toMatchObject({
        starId: star.starId,
        palaceRoleId: star.palaceRoleId,
        goodBadOrientation: null,
        eventOutcome: null,
        result: null,
        expertTruthClaimed: false,
        directOutcomeAllowed: false,
        scoringAllowed: false
      });
      if (!star.coreMinorCandidateContent?.factProjectionBoundary.brightnessCanAppear) {
        expect(star.brightnessLabel).toBeNull();
      }
    }

    for (const star of stars.filter((entry) => !ZIWEI_CORE_MINOR_STAR_IDS.includes(
      entry.starId as typeof ZIWEI_CORE_MINOR_STAR_IDS[number]
    ))) {
      expect(star.coreMinorCandidateContent).toBeNull();
      expect(star.coreMinorPalaceCandidateContent).toBeNull();
    }
    expect(stars.filter((star) => star.category === "minor"
      && star.coreMinorCandidateContent === null).length).toBeGreaterThan(0);
    expect(stars.filter((star) => star.category === "auxiliary")).not.toHaveLength(0);
    expect(stars.filter((star) => star.category === "auxiliary").every(
      (star) => star.coreMinorCandidateContent === null
        && star.coreMinorPalaceCandidateContent === null
    )).toBe(true);
    expect(stars.filter((star) => star.category === "major").every(
      (star) => star.coreMinorCandidateContent === null
        && star.coreMinorPalaceCandidateContent === null
    )).toBe(true);

    const tuoluo = stars.find((star) => star.starId === "ziwei.star.iztro.tuoluo-min");
    expect(tuoluo).toMatchObject({
      label: "陀罗",
      category: "minor",
      palaceRoleId: "life",
      earthlyBranchId: "yin",
      coreMinorCandidateContent: { label: "陀罗" },
      coreMinorPalaceCandidateContent: {
        palaceRoleId: "life",
        palaceRoleLabel: "命宫",
        result: null
      }
    });
  });

  it("freezes all 168 source-bound major-star candidates for the twelve palace roles", () => {
    expect(ZIWEI_MAJOR_STAR_PALACE_CONTENT_VERSION)
      .toBe("ziwei.major_star_all_palaces.neutral_candidate/0.2");
    expect(ZIWEI_PALACE_ROLE_IDS).toEqual([
      "life", "siblings", "spouse", "children", "wealth", "health",
      "travel", "friends", "career", "property", "wellbeing", "parents"
    ]);
    expect(ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT).toHaveLength(168);
    expect(new Set(
      ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT.map((entry) => entry.contentId)
    ).size).toBe(168);
    expect(new Set(
      ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT.map((entry) => entry.positionSummary)
    ).size).toBe(168);
    expect(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES).toHaveLength(2);

    const sourceIds = new Set(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId));
    const baseLabels = new Map(
      ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.map((entry) => [entry.starId, entry.label])
    );
    for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
      expect(ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT.filter(
        (entry) => entry.palaceRoleId === palaceRoleId
      )).toHaveLength(14);
    }
    for (const entry of ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT) {
      expect(baseLabels.get(entry.starId)).toBe(entry.label);
      expect(entry.positionSummary.startsWith(`${entry.label}落${entry.palaceRoleLabel}`)).toBe(true);
      expect(entry.derivationMethod).toBe("editorial_synthesis_of_star_theme_and_palace_domain");
      expect(entry.reviewStatus).toBe("awaiting_expert_review");
      expect(entry.publicationStatus).toBe("isolated_candidate_only");
      expect(entry.requiresCombinationReview).toBe(true);
      expect(entry.expertTruthClaimed).toBe(false);
      expect(entry.directOutcomeAllowed).toBe(false);
      expect(entry.scoringAllowed).toBe(false);
      expect(entry.sourceRefs).toHaveLength(2);
      expect(entry.sourceRefs.every((ref) => sourceIds.has(ref.sourceId))).toBe(true);
      expect(entry.positionSummary).not.toMatch(/你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u);
    }

    const tianjiSpouse = ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT.find(
      (entry) => entry.label === "天机" && entry.palaceRoleId === "spouse"
    );
    expect(tianjiSpouse?.positionSummary).toContain(
      "处理亲密关系、承诺方式与相处边界时，“分析、策划与随情境调整”会成为主要观察线索"
    );
    expect(tianjiSpouse?.reviewPrompt).toContain("不预测婚期、婚姻结果");
  });

  it("freezes one source-bound neutral problem-domain candidate for every palace role", () => {
    expect(ZIWEI_PALACE_ROLE_CONTENT_VERSION).toBe("ziwei.palace_role.neutral_candidate/0.1");
    expect(ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT).toHaveLength(12);
    expect(new Set(ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT.map((candidate) => candidate.contentId)).size)
      .toBe(12);
    expect(ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT.map((candidate) => candidate.palaceRoleId))
      .toEqual(ZIWEI_PALACE_ROLE_IDS);
    const sourceIds = new Set(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId));
    for (const candidate of ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT) {
      expect(candidate.contentKind).toBe("neutral_palace_domain_candidate");
      expect(candidate.domainSummary.length).toBeGreaterThan(8);
      expect(candidate.reviewPrompt.length).toBeGreaterThan(12);
      expect(candidate.sourceRefs).toHaveLength(2);
      expect(new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size).toBe(2);
      expect(candidate.sourceRefs.every((sourceRef) => sourceIds.has(sourceRef.sourceId))).toBe(true);
      expect(candidate.reviewStatus).toBe("awaiting_expert_review");
      expect(candidate.publicationStatus).toBe("isolated_candidate_only");
      expect(candidate.expertTruthClaimed).toBe(false);
      expect(candidate.directOutcomeAllowed).toBe(false);
      expect(candidate.scoringAllowed).toBe(false);
      expect(`${candidate.domainSummary}${candidate.reviewPrompt}`)
        .not.toMatch(/你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u);
    }
  });

  it("projects source-bound combination fact reviews while keeping every conclusion null", () => {
    expect(ZIWEI_MAJOR_STAR_PALACE_COMBINATION_REVIEW_VERSION)
      .toBe("ziwei.major_star_all_palaces.combination_review/0.2");
    expect(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES).toHaveLength(4);
    expect(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceKind)).toEqual([
      "modern_original_brightness_learning_material",
      "modern_original_mutagen_learning_material",
      "upstream_technical_relation_documentation",
      "public_domain_classical_combination_transcription"
    ]);
    expect(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES
      .every((source) => source.expertTruthClaimed === false)).toBe(true);

    const projection = createZiweiBrowserDisplayProjection(artifact);
    const reviews = projection.majorStarPalaceCombinationReviews;
    const sourceIds = new Set(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES.map((source) => source.sourceId));
    const expectedReviewCount = projection.displayPalaces.reduce(
      (count, palace) => count + palace.stars.filter((star) => star.category === "major").length,
      0
    );
    expect(expectedReviewCount).toBe(14);
    expect(reviews).toHaveLength(expectedReviewCount);
    expect(new Set(reviews.map((review) => review.reviewId)).size).toBe(expectedReviewCount);
    expect(new Set(reviews.map((review) => review.candidateContentId)).size).toBe(expectedReviewCount);
    expect(projection.majorStarCombinationReviewSources).toEqual(ZIWEI_MAJOR_STAR_COMBINATION_REVIEW_SOURCES);

    for (const review of reviews) {
      expect(review.ruleSnapshotSha256).toBe(artifact.ruleSnapshot.ruleSnapshotSha256);
      expect(review.artifactFactsSha256).toBe(artifact.digests.factsSha256);
      expect(review.selfState.transformationScope).toBe("natal_birth_year_only");
      expect(review.sanfang.map((member) => member.relation)).toEqual([
        "opposite_plus_6", "trine_plus_4", "trine_minus_4"
      ]);
      expect(review.reviewQuestions).toHaveLength(4);
      expect(new Set(review.reviewQuestions).size).toBe(4);
      expect(review.sourceRefs).toHaveLength(4);
      expect(review.sourceRefs.every((ref) => sourceIds.has(ref.sourceId))).toBe(true);
      expect(review.result).toBeNull();
      expect(review.reviewStatus).toBe("awaiting_expert_rule");
      expect(review.publicationStatus).toBe("isolated_review_only");
      expect(review.factsDerivedFromVerifiedArtifact).toBe(true);
      expect(review.interpretationIncluded).toBe(false);
      expect(review.expertTruthClaimed).toBe(false);
      expect(review.directOutcomeAllowed).toBe(false);
      expect(review.scoringAllowed).toBe(false);
      expect(review.factSummary).not.toMatch(/一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u);
    }

    const qishaLife = reviews.find((review) => review.label === "七杀" && review.palaceRoleId === "life");
    expect(qishaLife).toMatchObject({
      palaceRoleLabel: "命宫",
      selfState: { brightnessLabel: "庙", transformations: [] },
      result: null
    });
    expect(qishaLife?.samePalace.otherMajorStars).toEqual([]);
    expect(qishaLife?.samePalace.otherStars.map((star) => star.label)).toEqual([
      "陀罗", "解神", "天巫", "孤辰", "阴煞"
    ]);
    expect(qishaLife?.sanfang.map((member) => member.majorStars.map((star) => star.label))).toEqual([
      ["紫微", "天府"], ["破军"], ["贪狼"]
    ]);
    expect(qishaLife?.factSummary).toBe(
      "七杀〔庙〕落命宫；同宫无其他主星，另有5颗辅／杂曜；对宫（+6）迁移见紫微〔旺·科〕、天府〔得〕；三合位（+4）官禄见破军〔庙〕；三合位（−4）财帛见贪狼〔庙〕。"
    );

    const ziweiTravel = reviews.find((review) => review.label === "紫微" && review.palaceRoleId === "travel");
    expect(ziweiTravel?.selfState.transformations).toEqual(["科"]);
    expect(ziweiTravel?.samePalace.otherMajorStars.map((star) => star.label)).toEqual(["天府"]);
  });

  it("joins every major star's position and group facts into a null-result reading package", () => {
    expect(ZIWEI_MAJOR_STAR_SAME_STAR_SYNTHESIS_REVIEW_VERSION)
      .toBe("ziwei.major_star_all_palaces.same_star_synthesis_review/0.1");

    const projection = createZiweiBrowserDisplayProjection(artifact);
    const syntheses = projection.majorStarSameStarSynthesisReviews;
    expect(syntheses).toHaveLength(14);
    expect(new Set(syntheses.map((review) => review.synthesisId)).size).toBe(14);
    expect(new Set(syntheses.map((review) => review.combinationReviewId)).size).toBe(14);

    for (const synthesis of syntheses) {
      expect(synthesis.synthesisKind).toBe("derived_same_star_reading_package");
      expect(synthesis.evidenceClass).toBe("derived_same_star_projection");
      expect(synthesis.candidateContentId).toBe(synthesis.positionCandidate.contentId);
      expect(synthesis.combinationReviewId).toBe(synthesis.combinationReview.reviewId);
      expect(synthesis.combinationReview.candidateContentId).toBe(synthesis.candidateContentId);
      expect(synthesis.combinationReview.result).toBeNull();
      expect(synthesis.combinationReview.sanfang.map((member) => member.relation)).toEqual([
        "opposite_plus_6", "trine_plus_4", "trine_minus_4"
      ]);
      expect(synthesis.directStatement).toContain(synthesis.positionCandidate.positionSummary);
      expect(synthesis.directStatement).toContain(synthesis.combinationReview.factSummary);
      expect(synthesis.readingOrderStatement).toContain("位置主线");
      expect(synthesis.readingOrderStatement).toContain("同宫、对宫和两组三合位");
      expect(synthesis.reviewQuestions).toHaveLength(4);
      expect(new Set(synthesis.reviewQuestions).size).toBe(4);
      expect(synthesis.sourceRefs).toHaveLength(6);
      expect(new Set(synthesis.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size).toBe(6);
      expect(synthesis.result).toBeNull();
      expect(synthesis.goodBadOrientation).toBeNull();
      expect(synthesis.eventOutcome).toBeNull();
      expect(synthesis.reviewStatus).toBe("awaiting_expert_review");
      expect(synthesis.publicationStatus).toBe("isolated_review_only");
      expect(synthesis.factsDerivedFromVerifiedArtifact).toBe(true);
      expect(synthesis.editorialCandidateIncluded).toBe(true);
      expect(synthesis.expertInterpretationIncluded).toBe(false);
      expect(synthesis.expertTruthClaimed).toBe(false);
      expect(synthesis.directOutcomeAllowed).toBe(false);
      expect(synthesis.scoringAllowed).toBe(false);
      expect(`${synthesis.directStatement}${synthesis.scopeNote}`)
        .not.toMatch(/一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u);
    }

    const qishaLife = syntheses.find(
      (synthesis) => synthesis.label === "七杀" && synthesis.palaceRoleId === "life"
    );
    expect(qishaLife).toMatchObject({
      palaceRoleLabel: "命宫",
      result: null,
      goodBadOrientation: null,
      eventOutcome: null,
      combinationReview: {
        selfState: { brightnessLabel: "庙", transformations: [] },
        result: null
      }
    });
    expect(qishaLife?.directStatement).toContain(
      "对宫（+6）迁移见紫微〔旺·科〕、天府〔得〕"
    );
    expect(qishaLife?.scopeNote).toContain("不含宫干／运限四化");
  });

  it("builds exactly one null-result palace-first reading package for every target palace", async () => {
    expect(ZIWEI_PALACE_FIRST_SYNTHESIS_REVIEW_VERSION)
      .toBe("ziwei.palace_sanfang.first_reading_review/0.1");
    const projection = createZiweiBrowserDisplayProjection(artifact);
    const reviews = projection.palaceFirstSynthesisReviews;
    expect(reviews).toHaveLength(12);
    expect(new Set(reviews.map((review) => review.reviewId)).size).toBe(12);
    expect(new Set(reviews.map((review) => review.targetEarthlyBranchId)).size).toBe(12);

    for (const review of reviews) {
      expect(review.reviewKind).toBe("derived_palace_first_reading_package");
      expect(review.evidenceClass).toBe("derived_palace_first_projection");
      expect(review.members.map((member) => member.relation)).toEqual([
        "self", "opposite_plus_6", "trine_plus_4", "trine_minus_4"
      ]);
      expect(new Set(review.members.map((member) => member.palaceEarthlyBranchId)).size).toBe(4);
      expect(review.members[0]?.palaceEarthlyBranchId).toBe(review.targetEarthlyBranchId);
      expect(review.palaceRoleContent.palaceRoleId).toBe(review.targetPalaceRoleId);
      expect(review.ruleSnapshotSha256).toBe(artifact.ruleSnapshot.ruleSnapshotSha256);
      expect(review.artifactFactsSha256).toBe(artifact.digests.factsSha256);
      const groupMajorStarCount = review.members.reduce(
        (count, member) => count + member.majorStars.length,
        0
      );
      expect(review.groupMajorStarSynthesisIds).toHaveLength(groupMajorStarCount);
      expect(new Set(review.groupMajorStarSynthesisIds).size).toBe(groupMajorStarCount);
      expect(review.targetStarSynthesisIds).toHaveLength(review.targetMajorStars.length);
      expect(review.targetPositionStatements).toHaveLength(review.targetMajorStars.length);
      expect(review.reviewQuestions).toHaveLength(4);
      expect(new Set(review.reviewQuestions).size).toBe(4);
      expect(new Set(review.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size)
        .toBe(review.sourceRefs.length);
      expect(review.result).toBeNull();
      expect(review.goodBadOrientation).toBeNull();
      expect(review.eventOutcome).toBeNull();
      expect(review.reviewStatus).toBe("awaiting_expert_review");
      expect(review.publicationStatus).toBe("isolated_review_only");
      expect(review.factsDerivedFromVerifiedArtifact).toBe(true);
      expect(review.editorialCandidateIncluded).toBe(true);
      expect(review.expertInterpretationIncluded).toBe(false);
      expect(review.expertTruthClaimed).toBe(false);
      expect(review.directOutcomeAllowed).toBe(false);
      expect(review.scoringAllowed).toBe(false);
      expect(`${review.groupFactSummary}${review.directStatement}${review.scopeNote}`)
        .not.toMatch(/一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u);
    }

    for (const synthesis of projection.majorStarSameStarSynthesisReviews) {
      expect(reviews.filter(
        (review) => review.targetStarSynthesisIds.includes(synthesis.synthesisId)
      )).toHaveLength(1);
      expect(reviews.filter(
        (review) => review.groupMajorStarSynthesisIds.includes(synthesis.synthesisId)
      )).toHaveLength(4);
    }

    const qishaLife = reviews.find((review) => review.targetPalaceRoleId === "life");
    expect(qishaLife).toMatchObject({
      targetPalaceRoleLabel: "命宫",
      targetMainStarState: "present",
      result: null,
      goodBadOrientation: null,
      eventOutcome: null
    });
    expect(qishaLife?.targetMajorStars.map((star) => star.label)).toEqual(["七杀"]);
    expect(qishaLife?.targetStarSynthesisIds).toHaveLength(1);
    expect(qishaLife?.groupMajorStarSynthesisIds).toHaveLength(5);
    expect(qishaLife?.sourceRefs).toHaveLength(7);
    expect(qishaLife?.directStatement).toContain("命宫问题域");
    expect(qishaLife?.directStatement).toContain("本宫戊寅主星见七杀〔庙〕");
    expect(qishaLife?.directStatement).toContain("对宫（+6）迁移宫（申）见紫微〔旺·科〕、天府〔得〕");

    const emptyInput: ZiweiBirthInputDraft = {
      ...INPUT,
      calendarInput: { calendar: "gregorian", date: "1991-02-14" },
      sourceNote: "Browser engineering artifact empty-palace projection test input."
    };
    const emptyFixture = await calculateIztro258EngineeringFixture(emptyInput, {
      ruleSnapshot: artifact.ruleSnapshot
    });
    const emptyArtifact = await createZiweiBrowserEngineeringArtifactDraft({
      input: emptyFixture.input,
      ruleSnapshot: emptyFixture.ruleSnapshot,
      facts: emptyFixture.facts,
      requestId: REQUEST_ID,
      workerInstanceId: WORKER_ID,
      startedAt: STARTED_AT,
      completedAt: COMPLETED_AT,
      browserSourceIdentity
    });
    const emptyProjection = createZiweiBrowserDisplayProjection(emptyArtifact);
    const emptyTarget = emptyProjection.palaceFirstSynthesisReviews.find(
      (review) => review.targetMainStarState === "empty_in_verified_facts"
    );
    expect(emptyTarget).toBeDefined();
    expect(emptyTarget?.targetMajorStars).toEqual([]);
    expect(emptyTarget?.targetStarSynthesisIds).toEqual([]);
    expect(emptyTarget?.targetPositionStatements).toEqual([]);
    expect(emptyTarget?.emptyMainStarBoundary).toContain("不自动借用对宫或两组三合位主星");
    expect(emptyTarget?.directStatement).toContain("不把空宫或会照关系自动换算为好坏");
  });

  it("projects four source-bound natal transformation candidates into every matching palace group", () => {
    expect(ZIWEI_NATAL_TRANSFORMATION_CONTENT_VERSION)
      .toBe("ziwei.natal_transformation.neutral_candidate/0.1");
    expect(ZIWEI_PALACE_NATAL_TRANSFORMATION_REVIEW_VERSION)
      .toBe("ziwei.palace_sanfang.natal_transformation_review/0.1");
    expect(ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES).toHaveLength(3);
    expect(ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT).toHaveLength(4);
    expect(ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT.map(
      (candidate) => candidate.transformationLabel
    )).toEqual(["禄", "权", "科", "忌"]);
    expect(new Set(ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT.map(
      (candidate) => candidate.contentId
    )).size).toBe(4);
    const sourceIds = new Set(ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES.map(
      (source) => source.sourceId
    ));
    for (const candidate of ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT) {
      expect(candidate.sourceRefs).toHaveLength(3);
      expect(new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size).toBe(3);
      expect(candidate.sourceRefs.every((sourceRef) => sourceIds.has(sourceRef.sourceId))).toBe(true);
      expect(candidate.reviewStatus).toBe("awaiting_expert_review");
      expect(candidate.publicationStatus).toBe("isolated_candidate_only");
      expect(candidate.expertTruthClaimed).toBe(false);
      expect(candidate.directOutcomeAllowed).toBe(false);
      expect(candidate.scoringAllowed).toBe(false);
      expect(`${candidate.plainLanguage}${candidate.counterweight}${candidate.reviewPrompt}`)
        .not.toMatch(/你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸|疾病|寿命/u);
    }

    const projection = createZiweiBrowserDisplayProjection(artifact);
    expect(projection.natalTransformationContentSources)
      .toEqual(ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES);
    expect(projection.natalTransformationCandidateContent)
      .toEqual(ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT);
    expect(projection.natalTransformationPalaceCandidateContent)
      .toEqual(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT);
    expect(projection.palaceNatalTransformationReviews).toHaveLength(12);
    expect(new Set(projection.palaceNatalTransformationReviews.map(
      (review) => review.reviewId
    )).size).toBe(12);
    const occurrences = projection.palaceNatalTransformationReviews.flatMap(
      (review) => review.occurrences
    );
    expect(occurrences).toHaveLength(16);
    for (const label of ["禄", "权", "科", "忌"] as const) {
      expect(occurrences.filter((occurrence) => occurrence.transformationLabel === label))
        .toHaveLength(4);
    }
    for (const review of projection.palaceNatalTransformationReviews) {
      expect(review.transformationScope).toBe("natal_birth_year_only");
      expect(review.ruleSnapshotSha256).toBe(artifact.ruleSnapshot.ruleSnapshotSha256);
      expect(review.artifactFactsSha256).toBe(artifact.digests.factsSha256);
      expect(review.reviewQuestions).toHaveLength(4);
      expect(review.sourceRefs).toHaveLength(5);
      expect(review.result).toBeNull();
      expect(review.goodBadOrientation).toBeNull();
      expect(review.eventOutcome).toBeNull();
      expect(review.expertInterpretationIncluded).toBe(false);
      expect(review.expertTruthClaimed).toBe(false);
      expect(review.directOutcomeAllowed).toBe(false);
      expect(review.scoringAllowed).toBe(false);
    }
    for (const occurrence of occurrences) {
      expect(occurrence.candidateContent.transformationLabel).toBe(occurrence.transformationLabel);
      expect(occurrence.palaceRoleContent.palaceRoleId).toBe(occurrence.palaceRoleId);
      expect(occurrence.palaceCandidateContent.transformationLabel)
        .toBe(occurrence.transformationLabel);
      expect(occurrence.palaceCandidateContent.palaceRoleId).toBe(occurrence.palaceRoleId);
      expect(occurrence.palaceCandidateContent.genericCandidateContentId)
        .toBe(occurrence.candidateContent.contentId);
      expect(occurrence.palaceCandidateContent.palaceRoleContentId)
        .toBe(occurrence.palaceRoleContent.contentId);
      expect(occurrence.sourceRefs).toHaveLength(5);
      expect(occurrence.result).toBeNull();
      expect(occurrence.goodBadOrientation).toBeNull();
      expect(occurrence.eventOutcome).toBeNull();
      expect(occurrence.expertInterpretationIncluded).toBe(false);
      expect(occurrence.expertTruthClaimed).toBe(false);
    }

    const lifeReview = projection.palaceNatalTransformationReviews.find(
      (review) => review.targetPalaceRoleId === "life"
    );
    expect(lifeReview?.occurrences).toHaveLength(1);
    expect(lifeReview?.occurrences[0]).toMatchObject({
      relation: "opposite_plus_6",
      palaceRoleLabel: "迁移宫",
      starLabel: "紫微",
      transformationLabel: "科",
      basePositionState: "major_star_position_candidate_present",
      result: null,
      goodBadOrientation: null,
      eventOutcome: null
    });
    expect(lifeReview?.occurrences[0]?.basePositionCandidate?.positionSummary)
      .toContain("紫微落迁移宫");
    expect(lifeReview?.occurrences[0]?.palaceCandidateContent.positionSummary)
      .toContain("生年化科星曜落迁移宫");
    expect(lifeReview?.occurrences[0]?.palaceCandidateContent.positionSummary)
      .toContain("公开表达、外部评价与被识别");
    expect(lifeReview?.directStatement).toContain("对宫（+6）迁移宫紫微化科");
  });

  it("builds twelve traceable four-part palace candidates without selecting an outcome", () => {
    expect(ZIWEI_PALACE_FOUR_PART_SYNTHESIS_CONTENT_VERSION)
      .toBe("ziwei.palace_sanfang.four_part_synthesis_candidate/0.1");
    expect(ZIWEI_BROWSER_SOURCE_PATHS.filter((path) => path.endsWith(".ts"))).toHaveLength(21);
    expect(ZIWEI_BROWSER_SOURCE_PATHS).toContain(
      "src/browser-preview/palace-four-part-synthesis-content.ts"
    );
    expect(ZIWEI_BROWSER_SOURCE_PATHS).toContain(
      "src/browser-preview/core-minor-star-content.ts"
    );
    expect(ZIWEI_BROWSER_SOURCE_PATHS).toContain(
      "src/browser-preview/core-minor-star-sanfang-review.ts"
    );
    expect(ZIWEI_BROWSER_SOURCE_PATHS).toContain(
      "src/browser-preview/core-minor-star-sanfang-review-feedback.ts"
    );
    const projection = createZiweiBrowserDisplayProjection(artifact);
    const contents = projection.palaceFourPartSynthesisContents;
    expect(contents).toHaveLength(12);
    expect(new Set(contents.map((content) => content.contentId)).size).toBe(12);
    expect(new Set(contents.map((content) => content.targetEarthlyBranchId)).size).toBe(12);

    for (const content of contents) {
      expect(content.parts.map((part) => part.sectionId)).toEqual([
        "palace_theme",
        "external_pull",
        "resource_pressure_observation",
        "contradiction_synthesis"
      ]);
      expect(content.parts.map((part) => part.order)).toEqual([1, 2, 3, 4]);
      expect(content.parts.map((part) => part.relationBindings.map(
        (binding) => binding.relation
      ))).toEqual([
        ["self"],
        ["opposite_plus_6", "trine_plus_4", "trine_minus_4"],
        ["self", "opposite_plus_6", "trine_plus_4", "trine_minus_4"],
        ["self", "opposite_plus_6", "trine_plus_4", "trine_minus_4"]
      ]);
      expect(content.ruleSnapshotSha256).toBe(artifact.ruleSnapshot.ruleSnapshotSha256);
      expect(content.artifactFactsSha256).toBe(artifact.digests.factsSha256);
      expect(content.selectedDominantTheme).toBeNull();
      expect(content.resourcePressureOrientation).toBeNull();
      expect(content.goodBadOrientation).toBeNull();
      expect(content.eventOutcome).toBeNull();
      expect(content.result).toBeNull();
      expect(content.reviewStatus).toBe("awaiting_expert_review");
      expect(content.publicationStatus).toBe("isolated_candidate_only");
      expect(content.expertInterpretationIncluded).toBe(false);
      expect(content.expertTruthClaimed).toBe(false);
      expect(content.directOutcomeAllowed).toBe(false);
      expect(content.scoringAllowed).toBe(false);
      expect(new Set(content.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size)
        .toBe(content.sourceRefs.length);

      const transformationReview = projection.palaceNatalTransformationReviews.find(
        (review) => review.targetEarthlyBranchId === content.targetEarthlyBranchId
      );
      expect(transformationReview).toBeDefined();
      expect(content.parts[2].transformationOccurrenceIds).toEqual(
        transformationReview?.occurrences.map((occurrence) => occurrence.occurrenceId)
      );
      for (const part of content.parts) {
        expect(part.ruleSnapshotSha256).toBe(content.ruleSnapshotSha256);
        expect(part.artifactFactsSha256).toBe(content.artifactFactsSha256);
        expect(part.sourceRefs.length).toBeGreaterThan(0);
        expect(new Set(part.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size)
          .toBe(part.sourceRefs.length);
        expect(part.directStatement)
          .not.toMatch(/一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸|疾病|寿命|适合/u);
        for (const binding of part.majorStarBindings) {
          const synthesis = projection.majorStarSameStarSynthesisReviews.find(
            (candidate) => candidate.synthesisId === binding.synthesisId
          );
          expect(synthesis).toBeDefined();
          expect(binding).toMatchObject({
            starId: synthesis?.starId,
            starLabel: synthesis?.label,
            palaceEarthlyBranchId: synthesis?.palaceEarthlyBranchId,
            palaceRoleId: synthesis?.palaceRoleId,
            positionCandidateContentId: synthesis?.positionCandidate.contentId,
            positionSummary: synthesis?.positionCandidate.positionSummary,
            brightnessLabel: synthesis?.combinationReview.selfState.brightnessLabel,
            transformations: synthesis?.combinationReview.selfState.transformations
          });
        }
      }
    }

    for (const synthesis of projection.majorStarSameStarSynthesisReviews) {
      expect(contents.filter((content) => content.parts[0].majorStarBindings.some(
        (binding) => binding.synthesisId === synthesis.synthesisId
      ))).toHaveLength(1);
      expect(contents.filter((content) => content.parts[3].majorStarBindings.some(
        (binding) => binding.synthesisId === synthesis.synthesisId
      ))).toHaveLength(4);
    }

    const life = contents.find((content) => content.targetPalaceRoleId === "life");
    expect(life?.parts[0].majorStarBindings.map((binding) => binding.starLabel)).toEqual(["七杀"]);
    expect(life?.parts[0].transformationOccurrenceIds).toEqual([]);
    expect(life?.parts[1].majorStarBindings.map((binding) => binding.starLabel)).toEqual([
      "紫微", "天府", "破军", "贪狼"
    ]);
    expect(life?.parts[1].transformationOccurrenceIds).toEqual([
      "ziwei.occurrence.natal_transformation.yin.shen.ziwei-maj.ke.v0_1"
    ]);
    expect(life?.parts[2].directStatement).toContain("不判断哪一项是资源、哪一项是压力");

    const career = contents.find((content) => content.targetPalaceRoleId === "career");
    expect(career).toBeDefined();
    expect(career?.parts.every((part) => part.transformationOccurrenceIds.length === 0)).toBe(true);
    expect(career?.parts[2].directStatement).toContain("四化观察项保持空集合");
  });

  it("keeps empty palaces unborrowed and rejects incomplete or cross-hash synthesis inputs", async () => {
    const emptyInput: ZiweiBirthInputDraft = {
      ...INPUT,
      calendarInput: { calendar: "gregorian", date: "1991-02-14" },
      sourceNote: "Browser engineering artifact four-part empty-palace test input."
    };
    const emptyFixture = await calculateIztro258EngineeringFixture(emptyInput, {
      ruleSnapshot: artifact.ruleSnapshot
    });
    const emptyArtifact = await createZiweiBrowserEngineeringArtifactDraft({
      input: emptyFixture.input,
      ruleSnapshot: emptyFixture.ruleSnapshot,
      facts: emptyFixture.facts,
      requestId: REQUEST_ID,
      workerInstanceId: WORKER_ID,
      startedAt: STARTED_AT,
      completedAt: COMPLETED_AT,
      browserSourceIdentity
    });
    const emptyProjection = createZiweiBrowserDisplayProjection(emptyArtifact);
    const emptyContent = emptyProjection.palaceFourPartSynthesisContents.find(
      (content) => content.targetMainStarState === "empty_in_verified_facts"
    );
    expect(emptyContent).toBeDefined();
    expect(emptyContent?.parts[0].majorStarBindings).toEqual([]);
    expect(emptyContent?.parts[0].directStatement)
      .toContain("不借用对宫或两组三合位主星补写本宫主线");

    const projection = createZiweiBrowserDisplayProjection(artifact);
    expect(() => createPalaceFourPartSynthesisContents({
      palaceFirstSynthesisReviews: projection.palaceFirstSynthesisReviews,
      majorStarSameStarSynthesisReviews: projection.majorStarSameStarSynthesisReviews.slice(1),
      palaceNatalTransformationReviews: projection.palaceNatalTransformationReviews
    })).toThrow(/缺少逐星包|完整消费/u);

    const crossHashTransformationReviews = projection.palaceNatalTransformationReviews.map(
      (review, index) => index === 0
        ? { ...review, artifactFactsSha256: "0".repeat(64) }
        : review
    );
    expect(() => createPalaceFourPartSynthesisContents({
      palaceFirstSynthesisReviews: projection.palaceFirstSynthesisReviews,
      majorStarSameStarSynthesisReviews: projection.majorStarSameStarSynthesisReviews,
      palaceNatalTransformationReviews: crossHashTransformationReviews
    })).toThrow(/绑定不一致/u);
  });

  it("freezes a distinct, five-source candidate for every natal transformation and palace pair", () => {
    expect(ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION)
      .toBe("ziwei.natal_transformation_all_palaces.neutral_candidate/0.1");
    expect(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT).toHaveLength(48);
    expect(new Set(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.map(
      (candidate) => candidate.contentId
    )).size).toBe(48);
    expect(new Set(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.map(
      (candidate) => candidate.positionSummary
    )).size).toBe(48);
    for (const label of ["禄", "权", "科", "忌"] as const) {
      expect(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.filter(
        (candidate) => candidate.transformationLabel === label
      )).toHaveLength(12);
    }
    for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
      expect(ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.filter(
        (candidate) => candidate.palaceRoleId === palaceRoleId
      )).toHaveLength(4);
    }
    for (const candidate of ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT) {
      expect(candidate.sourceRefs).toHaveLength(5);
      expect(new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size).toBe(5);
      expect(candidate.reviewStatus).toBe("awaiting_expert_review");
      expect(candidate.publicationStatus).toBe("isolated_candidate_only");
      expect(candidate.expertTruthClaimed).toBe(false);
      expect(candidate.directOutcomeAllowed).toBe(false);
      expect(candidate.scoringAllowed).toBe(false);
      expect(`${candidate.positionSummary}${candidate.counterweight}${candidate.reviewPrompt}`)
        .not.toMatch(/你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|灾祸/u);
    }
  });

  it("fails closed when the Browser source sentinel is loaded outside the dedicated Vite injection", async () => {
    await expect(import("./browser-preview/generated-browser-source-identity.ts"))
      .rejects.toThrow(/was not injected by the dedicated Vite boundary/u);
  });

  it("keeps the Browser artifact and Node-only receipt mutually non-interchangeable", async () => {
    const browserVerification = await verifyZiweiBrowserEngineeringArtifactDraft(artifact);
    expect(browserVerification.success).toBe(true);
    expect(artifact.artifactKind).toBe("ziwei_browser_natal_engineering_artifact");
    expect(artifact.execution.runtime).toBe("browser_web_worker");
    expect(artifact.digests.historicalExecutionAuthenticated).toBe(false);
    expect(artifact.boundary.productionEligible).toBe(false);
    expect(artifact.boundary.expertTruthClaimed).toBe(false);

    expect(ziweiBrowserEngineeringArtifactDraftSchema.safeParse(nodeFixture).success).toBe(false);
    expect(ziweiNatalFixtureDraftSchema.safeParse(artifact).success).toBe(false);
  });

  it("rejects unknown and missing Browser artifact fields", async () => {
    const withUnknown = structuredClone(artifact) as ZiweiBrowserEngineeringArtifactDraft & { unexpected?: boolean };
    withUnknown.unexpected = true;
    const unknownResult = await verifyZiweiBrowserEngineeringArtifactDraft(withUnknown);
    expect(unknownResult.success).toBe(false);
    if (!unknownResult.success) expect(unknownResult.reason).toBe("schema_invalid");

    const missing = structuredClone(artifact) as unknown as Record<string, unknown>;
    delete missing.evidence;
    const missingResult = await verifyZiweiBrowserEngineeringArtifactDraft(missing);
    expect(missingResult.success).toBe(false);
    if (!missingResult.success) expect(missingResult.reason).toBe("schema_invalid");
  });

  it.each([
    ["input", tamperInput],
    ["rule", tamperRule],
    ["facts", tamperFacts],
    ["execution", tamperExecution]
  ] as const)("fails closed when %s content is changed", async (_label, tamper) => {
    const changed = structuredClone(artifact);
    tamper(changed);
    const result = await verifyZiweiBrowserEngineeringArtifactDraft(changed);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("digest_mismatch");
  });

  it("makes the main-thread gate reject a bad artifact digest before display", async () => {
    const response = structuredClone(successResponse);
    response.result.artifact.digests.factsSha256 = "0".repeat(64);
    await expect(requireVerifiedBrowserProbeResponse(response, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/工件验真失败|digest mismatch/u);
  });

  it("makes the main-thread gate reject an envelope/Worker identity mismatch before display", async () => {
    const response = structuredClone(successResponse);
    (response as { workerInstanceId: string }).workerInstanceId = OTHER_WORKER_ID;
    await expect(requireVerifiedBrowserProbeResponse(response, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/身份与回包信封不一致/u);
  });

  it("returns only a fully verified artifact from the main-thread gate", async () => {
    const accepted = await requireVerifiedBrowserProbeResponse(
      successResponse,
      REQUEST_ID,
      INPUT,
      browserSourceIdentity
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error("expected success");
    expect(accepted.result.artifact.digests.artifactSha256).toBe(artifact.digests.artifactSha256);
    expect(accepted.result.artifact.execution.requestId).toBe(REQUEST_ID);
  });

  it("rejects same-count Worker-supplied display text and derives display only from verified facts", async () => {
    const forged = structuredClone(successResponse) as unknown as {
      result: Record<string, unknown>;
    };
    forged.result.displayPalaces = artifact.facts.palaces.map(() => ({ label: "伪造星曜" }));
    forged.result.displaySummary = { gregorianDate: artifact.facts.calendarFacts.gregorianDate };
    await expect(requireVerifiedBrowserProbeResponse(forged, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/成功结果字段不完整/u);

    const projection = createZiweiBrowserDisplayProjection(artifact);
    expect(projection.displayPalaces).toHaveLength(12);
    expect(projection.displayPalaces[0]!.stars.map((star) => star.category)).toEqual(
      artifact.facts.palaces[0]!.stars.map((star) => star.category)
    );
    const projectedStars = projection.displayPalaces.flatMap((palace) => palace.stars);
    const projectedMajorStars = projectedStars.filter((star) => star.category === "major");
    expect(projectedMajorStars).toHaveLength(14);
    expect(new Set(projectedMajorStars.map((star) => star.starId)).size).toBe(14);
    expect(projectedMajorStars.every((star) => star.candidateContent?.starId === star.starId)).toBe(true);
    expect(projectedStars.filter((star) => star.category !== "major")
      .every((star) => star.candidateContent === null)).toBe(true);
    expect(projection.majorStarContentSources).toEqual(ZIWEI_MAJOR_STAR_CONTENT_SOURCES);
    const palaceRoleIds = new Set<string>(ZIWEI_PALACE_ROLE_IDS);
    const palaceRoleLabels = {
      life: "命宫",
      siblings: "兄弟宫",
      spouse: "夫妻宫",
      children: "子女宫",
      wealth: "财帛宫",
      health: "疾厄宫",
      travel: "迁移宫",
      friends: "交友宫",
      career: "官禄宫",
      property: "田宅宫",
      wellbeing: "福德宫",
      parents: "父母宫"
    } as const;
    const projectedStarsWithPalaces = projection.displayPalaces.flatMap((palace) => palace.stars.map((star) => ({
      palace,
      star
    })));
    const projectedPalaceMajorStars = projectedStarsWithPalaces.filter(
      ({ palace, star }) => palaceRoleIds.has(palace.roleId) && star.category === "major"
    );
    expect(projectedPalaceMajorStars).toHaveLength(14);
    for (const { palace, star } of projectedStarsWithPalaces) {
      if (palaceRoleIds.has(palace.roleId) && star.category === "major") {
        expect(star.palaceCandidateContent).toMatchObject({
          starId: star.starId,
          label: star.label,
          palaceRoleId: palace.roleId,
          palaceRoleLabel: palaceRoleLabels[palace.roleId as keyof typeof palaceRoleLabels],
          expertTruthClaimed: false,
          directOutcomeAllowed: false,
          scoringAllowed: false
        });
      } else {
        expect(star.palaceCandidateContent).toBeNull();
      }
    }
    expect(projectedStarsWithPalaces.filter(({ star }) => star.palaceCandidateContent !== null))
      .toHaveLength(projectedPalaceMajorStars.length);
    expect(projection.majorStarPalaceContentSources).toEqual(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES);
    expect(projection.displaySanfangGroups).toHaveLength(12);
    expect(projection.sanfangProjectionRule).toMatchObject({
      ruleId: "ziwei.sanfang_geometry.iztro_docs.v1",
      method: "target_index_self_plus_minus_4_and_plus_6",
      interpretationIncluded: false,
      expertTruthClaimed: false
    });

    const firstGroup = projection.displaySanfangGroups[0]!;
    expect(firstGroup.members.map((member) => member.relation)).toEqual([
      "self",
      "opposite_plus_6",
      "trine_plus_4",
      "trine_minus_4"
    ]);
    expect(firstGroup.members.map((member) => member.palace.earthlyBranchId)).toEqual([
      projection.displayPalaces[0]!.earthlyBranchId,
      projection.displayPalaces[6]!.earthlyBranchId,
      projection.displayPalaces[4]!.earthlyBranchId,
      projection.displayPalaces[8]!.earthlyBranchId
    ]);
    for (const [targetIndex, group] of projection.displaySanfangGroups.entries()) {
      expect(group.members).toHaveLength(4);
      expect(new Set(group.members.map((member) => member.palace.earthlyBranchId)).size).toBe(4);
      expect(group.members.map((member) => member.palace.earthlyBranchId)).toEqual([
        projection.displayPalaces[targetIndex]!.earthlyBranchId,
        projection.displayPalaces[(targetIndex + 6) % 12]!.earthlyBranchId,
        projection.displayPalaces[(targetIndex + 4) % 12]!.earthlyBranchId,
        projection.displayPalaces[(targetIndex + 8) % 12]!.earthlyBranchId
      ]);
    }
  });

  it("rejects a validly shaped artifact from a different Browser source graph", async () => {
    const otherIdentity = structuredClone(browserSourceIdentity);
    otherIdentity.files[0]!.sha256 = "f".repeat(64);
    otherIdentity.browserSourceGraphSha256 = await calculateZiweiBrowserSourceGraphSha256(otherIdentity);
    await expect(requireVerifiedBrowserProbeResponse(successResponse, REQUEST_ID, INPUT, otherIdentity))
      .rejects.toThrow(/源码图身份/u);
  });
});

function tamperInput(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.input.sourceNote = `${candidate.input.sourceNote} changed`;
}

function tamperRule(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.ruleSnapshot.sourceCatalog[0]!.notes = `${candidate.ruleSnapshot.sourceCatalog[0]!.notes} changed`;
}

function tamperFacts(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  const lunarDate = candidate.facts.calendarFacts.lunarDate;
  lunarDate.day = lunarDate.day === 30 ? 29 : lunarDate.day + 1;
}

function tamperExecution(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.execution.workerInstanceId = OTHER_WORKER_ID;
}
