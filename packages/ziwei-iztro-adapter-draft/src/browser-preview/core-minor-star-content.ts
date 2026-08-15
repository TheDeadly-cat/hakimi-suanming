import type {
  BrowserProbeCoreMinorStarBrightnessByEarthlyBranch,
  BrowserProbeCoreMinorStarBrightnessId,
  BrowserProbeCoreMinorStarCandidateContent,
  BrowserProbeCoreMinorStarContentSource,
  BrowserProbeCoreMinorStarEarthlyBranchId,
  BrowserProbeCoreMinorStarFactProjectionBoundary,
  BrowserProbeCoreMinorStarPalaceCandidateContent,
  BrowserProbeCoreMinorStarSourceRef,
  BrowserProbeCoreMinorStarTraditionalCluster,
  BrowserProbeDisplayStar,
  BrowserProbePalaceRoleId
} from "./browser-protocol.ts";
import {
  requirePalaceRoleCandidateContent,
  ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES,
  ZIWEI_PALACE_ROLE_IDS
} from "./major-star-palace-content.ts";

export const ZIWEI_CORE_MINOR_STAR_CONTENT_VERSION =
  "ziwei.core_minor_star.neutral_candidate/0.1" as const;
export const ZIWEI_CORE_MINOR_STAR_PALACE_CONTENT_VERSION =
  "ziwei.core_minor_star_all_palaces.neutral_candidate/0.1" as const;

const MODERN_SOURCE_ID = "ziwei.modern.iztro.core_minor_star.candidate.2026_08_13";
const CLASSICAL_SOURCE_ID = "ziwei.classic.zwdsql.volume1.core_minor_star.wikisource.2026_08_13";

export const ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES = Object.freeze<
  readonly BrowserProbeCoreMinorStarContentSource[]
>([
  Object.freeze({
    sourceId: MODERN_SOURCE_ID,
    sourceKind: "modern_original_minor_star_learning_material",
    title: "十四辅星｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/zh_TW/learn/minor-star",
    accessedAt: "2026-08-13",
    usageBoundary:
      "原页提供十四辅星中的传统分组与主题；本项目只取左辅、右弼、文昌、文曲、天魁、天钺、擎羊、陀罗、火星、铃星、地空、地劫这十二个精确星键，排除禄存、天马及其他 minor／auxiliary。分组不等于个人好坏是本项目另行施加的候选边界；不同流派可能采用不同解释，本项目不复制原文，也不把该页当作专家真值。",
    candidateUseOnly: true,
    schoolBoundaryDeclared: true,
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: CLASSICAL_SOURCE_ID,
    sourceKind: "public_domain_classical_minor_star_transcription",
    title: "《紫微斗数全书》卷一·诸星问答论（维基文库转录）",
    sourceUrl: "https://zh.wikisource.org/wiki/紫微斗數全書/卷一",
    accessedAt: "2026-08-13",
    usageBoundary:
      "只用于候选来源的传统篇目定位与辅助追溯，不作为现代语义或结果真值；不采用古籍中的富贵、灾祸、疾病、寿命、身份或确定结果断语。卷一写作天空地劫，不能精确绑定项目的地空星键；古籍转录不是现代专家真值，具体流派仍待具名审稿。",
    candidateUseOnly: true,
    schoolBoundaryDeclared: true,
    expertTruthClaimed: false
  })
]);

export const ZIWEI_CORE_MINOR_STAR_IDS = Object.freeze([
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
] as const);

type CoreMinorStarSeed = Readonly<{
  starId: typeof ZIWEI_CORE_MINOR_STAR_IDS[number];
  label: string;
  traditionalCluster: BrowserProbeCoreMinorStarTraditionalCluster;
  coreThemes: readonly [string, string, string];
  plainLanguage: string;
  counterweight: string;
  reviewPrompt: string;
  classicalLocator: string;
  classicalBindingTarget?: "exact_star" | "nomenclature_conflict";
  modernLocator: string;
}>;

const SEEDS = Object.freeze<readonly CoreMinorStarSeed[]>([
  {
    starId: "ziwei.star.iztro.zuofu-min",
    label: "左辅",
    traditionalCluster: "supporting_six",
    coreThemes: ["主动协助", "资源协调", "直接补位"],
    plainLanguage:
      "候选主题指向较主动、可见的协助与资源协调；落入某宫时，可观察该问题域如何通过补位、引导或关系网络推进。",
    counterweight:
      "协助也可能变成代办、主导过度或依赖，不能自动等同于贵人出现、身份提升或结果顺利。",
    reviewPrompt: "请按选定流派核对左辅的协助方向、成立条件，以及支持转成控制或依赖的反例。",
    classicalLocator: "卷一／诸星问答论／问左辅所主若何",
    modernLocator: "十四辅星／六吉星／左辅星"
  },
  {
    starId: "ziwei.star.iztro.youbi-min",
    label: "右弼",
    traditionalCluster: "supporting_six",
    coreThemes: ["间接协助", "倾听调和", "柔性补位"],
    plainLanguage:
      "候选主题指向较间接、柔和的支持与调和；落入某宫时，可观察该问题域如何通过倾听、缓冲或幕后协作得到补充。",
    counterweight:
      "调和也可能带来立场摇摆、过度迁就或帮倒忙，不能自动等同于关系和谐或问题解决。",
    reviewPrompt: "请按选定流派核对右弼的柔性支持方向，以及调和失去边界时的成立条件和反例。",
    classicalLocator: "卷一／诸星问答论／问右弼所主若何",
    modernLocator: "十四辅星／六吉星／右弼星"
  },
  {
    starId: "ziwei.star.iztro.wenchang-min",
    label: "文昌",
    traditionalCluster: "supporting_six",
    coreThemes: ["文字组织", "记忆整理", "规范表达"],
    plainLanguage:
      "候选主题指向文字、记录、记忆与结构化表达；落入某宫时，可观察该问题域如何被整理、命名和按规则说明。",
    counterweight:
      "结构化也可能变成拘泥格式、过度记忆或只重文面，不能自动等同于考试、资格、名声或专业能力。",
    reviewPrompt: "请按选定流派核对文昌的文字与结构方向，并区分表达能力、现实执行和四化修正。",
    classicalLocator: "卷一／诸星问答论／问文昌星所主若何",
    modernLocator: "十四辅星／六吉星／文昌星"
  },
  {
    starId: "ziwei.star.iztro.wenqu-min",
    label: "文曲",
    traditionalCluster: "supporting_six",
    coreThemes: ["艺术表达", "情感转译", "灵活沟通"],
    plainLanguage:
      "候选主题指向艺术感、口语表达与情感转译；落入某宫时，可观察该问题域如何借由语气、形式和灵活沟通呈现。",
    counterweight:
      "表达丰富也可能伴随分心、修饰过度或只停留在感受，不能自动等同于表达获得怎样的现实评价或关系走向。",
    reviewPrompt: "请按选定流派核对文曲的表达与转译方向，并说明何时应保留散漫或形式多于行动的反例。",
    classicalLocator: "卷一／诸星问答论／问文曲星所主若何",
    modernLocator: "十四辅星／六吉星／文曲星"
  },
  {
    starId: "ziwei.star.iztro.tiankui-min",
    label: "天魁",
    traditionalCluster: "supporting_six",
    coreThemes: ["标准识别", "及时支持", "决断推动"],
    plainLanguage:
      "候选主题指向较直接的判断、标准与及时支持；落入某宫时，可观察该问题域如何识别当下要点并推动眼前事项。",
    counterweight:
      "及时支持仍取决于能力、请求和环境，也可能只处理眼前问题，不能自动等同于权位、资格或机会兑现。",
    reviewPrompt: "请按选定流派核对天魁的标准与即时支持方向，并列出支持未形成长期结果的反例。",
    classicalLocator: "卷一／诸星问答论／问天魁天钺星所主若何",
    modernLocator: "十四辅星／六吉星／天魁星"
  },
  {
    starId: "ziwei.star.iztro.tianyue-min",
    label: "天钺",
    traditionalCluster: "supporting_six",
    coreThemes: ["分析策划", "间接支持", "源头化解"],
    plainLanguage:
      "候选主题指向分析、策划与较间接的支持；落入某宫时，可观察该问题域如何通过方案、洞察或调整条件来处理根因。",
    counterweight:
      "策划不等于执行，间接支持也可能难以被察觉或取得，不能自动等同于贵人、成功或风险消失。",
    reviewPrompt: "请按选定流派核对天钺的策划与间接支持方向，并区分方案形成、实际执行和现实资源。",
    classicalLocator: "卷一／诸星问答论／问天魁天钺星所主若何",
    modernLocator: "十四辅星／六吉星／天钺星"
  },
  {
    starId: "ziwei.star.iztro.qingyang-min",
    label: "擎羊",
    traditionalCluster: "challenging_six",
    coreThemes: ["直接行动", "切分处理", "快速推进"],
    plainLanguage:
      "候选主题指向直接、切入和快速行动；落入某宫时，可观察该问题域如何通过明确取舍、立即处理或突破阻滞推进。",
    counterweight:
      "直接推进也可能增加摩擦、遗漏评估或造成边界碰撞，不能自动等同于任何现实事件、结果或个性结论。",
    reviewPrompt: "请按选定流派核对擎羊的行动与切分方向，并说明速度、摩擦和必要评估之间的条件。",
    classicalLocator: "卷一／诸星问答论／问擎羊星所主若何",
    modernLocator: "十四辅星／六煞星／擎羊星"
  },
  {
    starId: "ziwei.star.iztro.tuoluo-min",
    label: "陀罗",
    traditionalCluster: "challenging_six",
    coreThemes: ["反复推敲", "持续钻研", "渐进推进"],
    plainLanguage:
      "候选主题指向反复推敲、持续钻研与渐进推进；落入某宫时，可观察该问题域如何在循环核对中累积理解。",
    counterweight:
      "深入也可能转成纠结、拖延或重复消耗，不能自动等同于受阻、错失机会或长期成就。",
    reviewPrompt: "请按选定流派核对陀罗的推敲与渐进方向，并给出深入研究和无效循环的区分条件。",
    classicalLocator: "卷一／诸星问答论／问陀罗星所主若何",
    modernLocator: "十四辅星／六煞星／陀罗星"
  },
  {
    starId: "ziwei.star.iztro.huoxing-min",
    label: "火星",
    traditionalCluster: "challenging_six",
    coreThemes: ["快速点燃", "即时反应", "显性推动"],
    plainLanguage:
      "候选主题指向快速启动、即时反应与较显性的推动；落入某宫时，可观察该问题域如何被热度、急迫感或当下决定加速。",
    counterweight:
      "快速启动也可能压缩思考、放大情绪或追求即时结果，不能自动等同于任何现实冲突、损失或事件结局。",
    reviewPrompt: "请按选定流派核对火星的启动与即时反应方向，并给出活力和欠缺评估之间的反例。",
    classicalLocator: "卷一／诸星问答论／问火星所主若何",
    modernLocator: "十四辅星／六煞星／火星"
  },
  {
    starId: "ziwei.star.iztro.lingxing-min",
    label: "铃星",
    traditionalCluster: "challenging_six",
    coreThemes: ["内在蓄压", "审慎盘算", "延后释放"],
    plainLanguage:
      "候选主题指向把压力收在内部、审慎盘算与延后释放；落入某宫时，可观察该问题域如何在沉淀后表达或行动。",
    counterweight:
      "审慎也可能变成压力累积、表达延迟或错过窗口，不能自动等同于任何心理状态、关系走向或现实结果。",
    reviewPrompt: "请按选定流派核对铃星的蓄压与延后方向，并说明审慎、压抑和适时表达的边界。",
    classicalLocator: "卷一／诸星问答论／问铃星所主若何",
    modernLocator: "十四辅星／六煞星／铃星"
  },
  {
    starId: "ziwei.star.iztro.dikong-min",
    label: "地空",
    traditionalCluster: "challenging_six",
    coreThemes: ["抽象思考", "跳脱既定", "落地检验"],
    plainLanguage:
      "候选主题指向抽象思考、跳脱既定路径与大量设想；落入某宫时，可观察该问题域如何产生不同视角并接受落地检验。",
    counterweight:
      "想法扩展也可能与执行脱节或在复杂步骤前中断，不能自动等同于任何财务、信念或创作结果。",
    reviewPrompt: "请按选定流派核对地空的抽象与跳脱方向，并列出创意形成、逃避步骤和现实验证的区分条件。",
    classicalLocator: "卷一／诸星问答论／问天空地劫所主若何（命名冲突记录：篇目目标为天空，不是项目星键地空；不计作地空精确语义证据）",
    classicalBindingTarget: "nomenclature_conflict",
    modernLocator: "十四辅星／六煞星／地空星"
  },
  {
    starId: "ziwei.star.iztro.dijie-min",
    label: "地劫",
    traditionalCluster: "challenging_six",
    coreThemes: ["机会筛选", "现实取舍", "阶段投入"],
    plainLanguage:
      "候选主题指向对机会、成本与投入节奏进行筛选；落入某宫时，可观察该问题域如何在现实取舍中选择阶段性路径。",
    counterweight:
      "谨慎筛选也可能造成过早退出、投入碎片化或错过长期累积，不能自动等同于任何财务处境或长期结果。",
    reviewPrompt: "请按选定流派核对地劫的筛选与取舍方向，并说明风险意识、过早退出和持续投入之间的条件。",
    classicalLocator: "卷一／诸星问答论／问天空地劫所主若何",
    modernLocator: "十四辅星／六煞星／地劫星"
  }
]);

const CLUSTER_BOUNDARIES = Object.freeze<
  Record<BrowserProbeCoreMinorStarTraditionalCluster, string>
>({
  supporting_six:
    "supporting_six 只登记传统六吉星分组，不表示当前盘、当前宫位或当前人必然有利；仍须按流派合看主星、亮度、四化、同宫与三方四正。",
  challenging_six:
    "challenging_six 只登记传统六煞星分组，不表示当前盘、当前宫位或当前人必然不利；仍须按流派合看主星、亮度、四化、同宫与三方四正。"
});

const CORE_MINOR_STAR_EARTHLY_BRANCH_IDS = Object.freeze([
  "zi", "chou", "yin", "mao", "chen", "si",
  "wu", "wei", "shen", "you", "xu", "hai"
] as const satisfies readonly BrowserProbeCoreMinorStarEarthlyBranchId[]);

type CoreMinorStarBrightnessTuple = readonly [
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null,
  BrowserProbeCoreMinorStarBrightnessId | null
];

const NULL_BRIGHTNESS_BY_EARTHLY_BRANCH = freezeBrightnessByEarthlyBranch([
  null, null, null, null, null, null, null, null, null, null, null, null
]);

const BRIGHTNESS_BY_STAR_ID = Object.freeze<Readonly<Record<
  typeof ZIWEI_CORE_MINOR_STAR_IDS[number],
  BrowserProbeCoreMinorStarBrightnessByEarthlyBranch
>>>({
  "ziwei.star.iztro.zuofu-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH,
  "ziwei.star.iztro.youbi-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH,
  "ziwei.star.iztro.wenchang-min": freezeBrightnessByEarthlyBranch([
    "de", "miao", "xian", "li", "de", "miao", "xian", "li", "de", "miao", "xian", "li"
  ]),
  "ziwei.star.iztro.wenqu-min": freezeBrightnessByEarthlyBranch([
    "de", "miao", "ping", "wang", "de", "miao", "xian", "wang", "de", "miao", "xian", "wang"
  ]),
  "ziwei.star.iztro.tiankui-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH,
  "ziwei.star.iztro.tianyue-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH,
  "ziwei.star.iztro.qingyang-min": freezeBrightnessByEarthlyBranch([
    "xian", "miao", null, "xian", "miao", null, "xian", "miao", null, "xian", "miao", null
  ]),
  "ziwei.star.iztro.tuoluo-min": freezeBrightnessByEarthlyBranch([
    null, "miao", "xian", null, "miao", "xian", null, "miao", "xian", null, "miao", "xian"
  ]),
  "ziwei.star.iztro.huoxing-min": freezeBrightnessByEarthlyBranch([
    "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li"
  ]),
  "ziwei.star.iztro.lingxing-min": freezeBrightnessByEarthlyBranch([
    "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li"
  ]),
  "ziwei.star.iztro.dikong-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH,
  "ziwei.star.iztro.dijie-min": NULL_BRIGHTNESS_BY_EARTHLY_BRANCH
});

const NATAL_TRANSFORMATION_RULES_BY_STAR_ID = Object.freeze<
  Readonly<Record<typeof ZIWEI_CORE_MINOR_STAR_IDS[number],
    BrowserProbeCoreMinorStarFactProjectionBoundary["natalBirthYearTransformationRules"]>>
>({
  "ziwei.star.iztro.zuofu-min": [{ yearStemId: "ren", transformationId: "ke", transformationLabel: "科" }],
  "ziwei.star.iztro.youbi-min": [{ yearStemId: "wu", transformationId: "ke", transformationLabel: "科" }],
  "ziwei.star.iztro.wenchang-min": [
    { yearStemId: "bing", transformationId: "ke", transformationLabel: "科" },
    { yearStemId: "xin", transformationId: "ji", transformationLabel: "忌" }
  ],
  "ziwei.star.iztro.wenqu-min": [
    { yearStemId: "ji", transformationId: "ji", transformationLabel: "忌" },
    { yearStemId: "xin", transformationId: "ke", transformationLabel: "科" }
  ],
  "ziwei.star.iztro.tiankui-min": [],
  "ziwei.star.iztro.tianyue-min": [],
  "ziwei.star.iztro.qingyang-min": [],
  "ziwei.star.iztro.tuoluo-min": [],
  "ziwei.star.iztro.huoxing-min": [],
  "ziwei.star.iztro.lingxing-min": [],
  "ziwei.star.iztro.dikong-min": [],
  "ziwei.star.iztro.dijie-min": []
});

export const ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES = Object.freeze(
  ZIWEI_CORE_MINOR_STAR_IDS.map((starId) => {
    const brightnessByEarthlyBranch = BRIGHTNESS_BY_STAR_ID[starId];
    return Object.freeze<
      BrowserProbeCoreMinorStarFactProjectionBoundary & Readonly<{ starId: string }>
    >({
      starId,
      brightnessCanAppear: Object.values(brightnessByEarthlyBranch).some((value) => value !== null),
      brightnessByEarthlyBranch,
      natalBirthYearTransformationRules: Object.freeze(
        NATAL_TRANSFORMATION_RULES_BY_STAR_ID[starId].map((rule) => Object.freeze({ ...rule }))
      ),
      factValuesOnly: true,
      interpretationIncluded: false
    });
  })
);

const FACT_PROJECTION_BOUNDARY_BY_STAR_ID = validateAndIndexFactProjectionBoundaries();

export const ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT = Object.freeze(
  SEEDS.map((seed) => Object.freeze<BrowserProbeCoreMinorStarCandidateContent>({
    contentId: `ziwei.content.core_minor_star.${seed.starId.split(".").at(-1)}.neutral.v0_1`,
    contentVersion: ZIWEI_CORE_MINOR_STAR_CONTENT_VERSION,
    contentKind: "neutral_core_minor_star_semantics_candidate",
    starId: seed.starId,
    label: seed.label,
    factCategory: "minor",
    traditionalCluster: seed.traditionalCluster,
    traditionalClusterIsOutcome: false,
    traditionalClusterBoundary: CLUSTER_BOUNDARIES[seed.traditionalCluster],
    factProjectionBoundary: FACT_PROJECTION_BOUNDARY_BY_STAR_ID.get(seed.starId)
      ?? fail(`核心十二辅星缺少事实投影边界 ${seed.starId}`),
    coreThemes: Object.freeze([...seed.coreThemes]) as readonly [string, string, string],
    plainLanguage: seed.plainLanguage,
    counterweight: seed.counterweight,
    reviewPrompt: seed.reviewPrompt,
    derivationMethod: "editorial_synthesis_of_source_bound_core_minor_star_themes",
    sourceRefs: Object.freeze<readonly BrowserProbeCoreMinorStarSourceRef[]>([
      Object.freeze({
        sourceId: MODERN_SOURCE_ID,
        locator: seed.modernLocator,
        bindingTarget: "exact_star",
        semanticCandidateSupport: true
      }),
      Object.freeze({
        sourceId: CLASSICAL_SOURCE_ID,
        locator: seed.classicalLocator,
        bindingTarget: seed.classicalBindingTarget ?? "exact_star",
        semanticCandidateSupport: false
      })
    ]),
    goodBadOrientation: null,
    eventOutcome: null,
    result: null,
    reviewStatus: "awaiting_expert_review",
    publicationStatus: "isolated_candidate_only",
    expertTruthClaimed: false,
    directOutcomeAllowed: false,
    scoringAllowed: false
  }))
);

const BASE_CANDIDATE_BY_STAR_ID = validateAndIndexBaseCandidates();

export const ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT = Object.freeze(
  ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.flatMap((baseCandidate) => (
    ZIWEI_PALACE_ROLE_IDS.map((palaceRoleId) => {
      const palaceRoleContent = requirePalaceRoleCandidateContent(palaceRoleId)
        ?? fail(`核心十二辅星落宫候选缺少 ${palaceRoleId} 问题域`);
      const sourceRefs = mergeSourceRefs(
        baseCandidate.sourceRefs,
        palaceRoleContent.sourceRefs
      );
      return Object.freeze<BrowserProbeCoreMinorStarPalaceCandidateContent>({
        contentId:
          `ziwei.content.core_minor_star_all_palaces.${baseCandidate.starId.split(".").at(-1)}`
          + `.${palaceRoleId}.neutral.v0_1`,
        contentVersion: ZIWEI_CORE_MINOR_STAR_PALACE_CONTENT_VERSION,
        contentKind: "neutral_core_minor_star_palace_semantics_candidate",
        starId: baseCandidate.starId,
        label: baseCandidate.label,
        factCategory: "minor",
        palaceRoleId,
        palaceRoleLabel: palaceRoleContent.palaceRoleLabel,
        baseCandidateContentId: baseCandidate.contentId,
        palaceRoleContentId: palaceRoleContent.contentId,
        traditionalCluster: baseCandidate.traditionalCluster,
        traditionalClusterIsOutcome: false,
        positionSummary:
          `${baseCandidate.label}落${palaceRoleContent.palaceRoleLabel}，在“${palaceRoleContent.domainSummary}”这一问题域中，`
          + `可先观察“${baseCandidate.coreThemes.join("、")}”如何参与；这是来源绑定的星曜 × 宫位候选，`
          + "不把传统分组、亮度或单一标签换算为好坏。",
        counterweight:
          `${baseCandidate.counterweight} 落入${palaceRoleContent.palaceRoleLabel}后，仍须核对主星、亮度、`
          + "本命生年四化、同宫与三方四正。",
        reviewPrompt:
          `${palaceRoleContent.reviewPrompt} 另请专家核对${baseCandidate.label}在该问题域中的主题、成立条件与反例。`,
        derivationMethod: "editorial_synthesis_of_core_minor_star_theme_and_palace_domain",
        sourceRefs,
        requiresCombinationReview: true,
        goodBadOrientation: null,
        eventOutcome: null,
        result: null,
        reviewStatus: "awaiting_expert_review",
        publicationStatus: "isolated_candidate_only",
        expertTruthClaimed: false,
        directOutcomeAllowed: false,
        scoringAllowed: false
      });
    })
  ))
);

const PALACE_CANDIDATE_BY_KEY = validateAndIndexPalaceCandidates();

export function resolveCoreMinorStarCandidateContent(
  starId: string,
  label: string,
  category: BrowserProbeDisplayStar["category"]
): BrowserProbeCoreMinorStarCandidateContent | null {
  const candidate = BASE_CANDIDATE_BY_STAR_ID.get(starId);
  if (!candidate) return null;
  if (category !== "minor") {
    return fail(`核心十二辅星 ${starId} 必须来自 minor 事实，实际为 ${category}`);
  }
  if (candidate.label !== label) {
    return fail(`核心十二辅星标签不匹配：${starId} 应为 ${candidate.label}，实际为 ${label}`);
  }
  return candidate;
}

export function resolveCoreMinorStarPalaceCandidateContent(
  starId: string,
  label: string,
  category: BrowserProbeDisplayStar["category"],
  palaceRoleId: string
): BrowserProbeCoreMinorStarPalaceCandidateContent | null {
  const baseCandidate = resolveCoreMinorStarCandidateContent(starId, label, category);
  if (!baseCandidate) return null;
  if (!isPalaceRoleId(palaceRoleId)) {
    return fail(`核心十二辅星 ${starId} 收到未知宫位 ${palaceRoleId}`);
  }
  const candidate = PALACE_CANDIDATE_BY_KEY.get(contentKey(starId, palaceRoleId));
  if (!candidate) {
    return fail(`核心十二辅星落宫候选缺少 ${starId} × ${palaceRoleId}`);
  }
  if (candidate.label !== label || candidate.baseCandidateContentId !== baseCandidate.contentId) {
    return fail(`核心十二辅星落宫候选与基础候选不一致：${starId} × ${palaceRoleId}`);
  }
  return candidate;
}

export function assertCoreMinorStarFactProjectionWithinBoundary(
  candidate: BrowserProbeCoreMinorStarCandidateContent | null,
  earthlyBranchId: string,
  brightnessId: string | null,
  transformationIds: readonly string[],
  yearStemId: string
): void {
  if (!candidate) return;
  const boundary = candidate.factProjectionBoundary;
  if (!isCoreMinorStarEarthlyBranchId(earthlyBranchId)) {
    return fail(`核心十二辅星 ${candidate.starId} 收到未知地支 ${earthlyBranchId}`);
  }
  const expectedBrightnessId = boundary.brightnessByEarthlyBranch[earthlyBranchId];
  if (brightnessId !== expectedBrightnessId) {
    return fail(
      `核心十二辅星 ${candidate.starId} 在 ${earthlyBranchId} 的亮度必须为 `
      + `${expectedBrightnessId ?? "null"}，实际为 ${brightnessId ?? "null"}`
    );
  }
  const expectedTransformationIds = boundary.natalBirthYearTransformationRules
    .filter((rule) => rule.yearStemId === yearStemId)
    .map((rule) => rule.transformationId);
  if (transformationIds.length !== expectedTransformationIds.length
    || transformationIds.some((id) => !expectedTransformationIds.includes(id as "ke" | "ji"))) {
    return fail(
      `核心十二辅星 ${candidate.starId} 的 ${yearStemId} 年干本命四化不在冻结事实边界内`
    );
  }
}

export function assertCoreMinorStarCandidateTextWithinRiskBoundary(
  input: Readonly<{
    forwardText: string;
    counterweight: string;
    reviewerOnlyText?: string;
  }>
): void {
  if (absoluteOutcomeLanguagePattern().test(input.forwardText)
    || directHighRiskResultLanguagePattern().test(input.forwardText)) {
    return fail("核心十二辅星正向直读字段包含未授权的确定或高风险结果语言");
  }
  if (alarmingCounterweightLanguagePattern().test(input.counterweight)) {
    return fail("核心十二辅星用户可见反向提醒不得枚举惊吓性断语");
  }
}

function validateAndIndexFactProjectionBoundaries(): ReadonlyMap<
  string,
  BrowserProbeCoreMinorStarFactProjectionBoundary & Readonly<{ starId: string }>
> {
  if (ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES.length !== 12) {
    return fail("核心十二辅星事实投影边界必须恰有 12 条");
  }
  const expectedTransformationRules = new Set([
    "ziwei.star.iztro.zuofu-min:ren:ke",
    "ziwei.star.iztro.youbi-min:wu:ke",
    "ziwei.star.iztro.wenchang-min:bing:ke",
    "ziwei.star.iztro.wenchang-min:xin:ji",
    "ziwei.star.iztro.wenqu-min:ji:ji",
    "ziwei.star.iztro.wenqu-min:xin:ke"
  ]);
  const actualTransformationRules = new Set<string>();
  const brightnessStarIds = new Set<string>();
  const byStarId = new Map<
    string,
    BrowserProbeCoreMinorStarFactProjectionBoundary & Readonly<{ starId: string }>
  >();
  for (const [index, boundary] of ZIWEI_CORE_MINOR_STAR_FACT_PROJECTION_BOUNDARIES.entries()) {
    const expectedBrightnessByEarthlyBranch = BRIGHTNESS_BY_STAR_ID[boundary.starId as
      typeof ZIWEI_CORE_MINOR_STAR_IDS[number]];
    const actualBrightnessKeys = Object.keys(boundary.brightnessByEarthlyBranch);
    const exactBrightnessMapMatches = expectedBrightnessByEarthlyBranch !== undefined
      && actualBrightnessKeys.length === CORE_MINOR_STAR_EARTHLY_BRANCH_IDS.length
      && CORE_MINOR_STAR_EARTHLY_BRANCH_IDS.every((branchId, branchIndex) => (
        actualBrightnessKeys[branchIndex] === branchId
        && boundary.brightnessByEarthlyBranch[branchId] === expectedBrightnessByEarthlyBranch[branchId]
      ));
    const brightnessCanAppear = Object.values(boundary.brightnessByEarthlyBranch)
      .some((value) => value !== null);
    if (boundary.starId !== ZIWEI_CORE_MINOR_STAR_IDS[index]
      || byStarId.has(boundary.starId)
      || !exactBrightnessMapMatches
      || boundary.brightnessCanAppear !== brightnessCanAppear
      || !boundary.factValuesOnly
      || boundary.interpretationIncluded) {
      return fail(`核心十二辅星事实投影边界身份或证据类无效：${boundary.starId}`);
    }
    if (boundary.brightnessCanAppear) brightnessStarIds.add(boundary.starId);
    for (const rule of boundary.natalBirthYearTransformationRules) {
      if ((rule.transformationId === "ke" ? "科" : "忌") !== rule.transformationLabel) {
        return fail(`核心十二辅星事实投影四化标签不匹配：${boundary.starId}`);
      }
      const key = `${boundary.starId}:${rule.yearStemId}:${rule.transformationId}`;
      if (actualTransformationRules.has(key)) {
        return fail(`核心十二辅星事实投影四化规则重复：${key}`);
      }
      actualTransformationRules.add(key);
    }
    byStarId.set(boundary.starId, boundary);
  }
  const expectedBrightnessStarIds = new Set(
    Object.entries(BRIGHTNESS_BY_STAR_ID)
      .filter(([, byBranch]) => Object.values(byBranch).some((value) => value !== null))
      .map(([starId]) => starId)
  );
  if (!sameSet(brightnessStarIds, expectedBrightnessStarIds)
    || !sameSet(actualTransformationRules, expectedTransformationRules)) {
    return fail("核心十二辅星亮度或本命四化事实投影边界偏离冻结集合");
  }
  return byStarId;
}

function validateAndIndexBaseCandidates(): ReadonlyMap<
  string,
  BrowserProbeCoreMinorStarCandidateContent
> {
  if (ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES.length !== 2) {
    return fail("核心十二辅星必须登记现代候选来源与古典篇目来源各一条");
  }
  const sourceIds = new Set<string>();
  for (const source of ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES) {
    if (sourceIds.has(source.sourceId)
      || !source.sourceUrl.startsWith("https://")
      || !source.usageBoundary.includes("候选")
      || !source.usageBoundary.includes("流派")
      || !source.candidateUseOnly
      || !source.schoolBoundaryDeclared
      || source.expertTruthClaimed) {
      return fail(`核心十二辅星来源无效、重复或缺少候选／流派边界：${source.sourceId}`);
    }
    sourceIds.add(source.sourceId);
  }
  if (ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.length !== ZIWEI_CORE_MINOR_STAR_IDS.length) {
    return fail("核心十二辅星基础候选必须恰有 12 条");
  }

  const expectedLabels = [
    "左辅", "右弼", "文昌", "文曲", "天魁", "天钺",
    "擎羊", "陀罗", "火星", "铃星", "地空", "地劫"
  ];
  const byStarId = new Map<string, BrowserProbeCoreMinorStarCandidateContent>();
  const contentIds = new Set<string>();
  for (const [index, candidate] of ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.entries()) {
    if (candidate.starId !== ZIWEI_CORE_MINOR_STAR_IDS[index]
      || candidate.label !== expectedLabels[index]
      || byStarId.has(candidate.starId)
      || contentIds.has(candidate.contentId)) {
      return fail(`核心十二辅星顺序、标签、星键或内容 ID 无效：${candidate.contentId}`);
    }
    if (candidate.factCategory !== "minor"
      || candidate.coreThemes.length !== 3
      || new Set(candidate.coreThemes).size !== 3
      || candidate.sourceRefs.length !== 2
      || new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 2
      || candidate.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)
      || candidate.sourceRefs.filter((sourceRef) => sourceRef.semanticCandidateSupport).length !== 1
      || candidate.sourceRefs.some((sourceRef) => sourceRef.semanticCandidateSupport
        && sourceRef.bindingTarget !== "exact_star")) {
      return fail(`核心十二辅星 ${candidate.starId} 的类别、主题或来源不完整`);
    }
    if (candidate.starId === "ziwei.star.iztro.dikong-min") {
      const classicalRef = candidate.sourceRefs.find((sourceRef) => sourceRef.sourceId === CLASSICAL_SOURCE_ID);
      if (classicalRef?.bindingTarget !== "nomenclature_conflict"
        || classicalRef.semanticCandidateSupport
        || !classicalRef.locator.includes("不是项目星键地空")) {
        return fail("地空不得把古典天空篇目标记作精确星键或语义证据");
      }
    }
    if (candidate.traditionalClusterIsOutcome
      || !candidate.traditionalClusterBoundary.includes("不表示")) {
      return fail(`核心十二辅星 ${candidate.starId} 越过传统分组或结果语言边界`);
    }
    assertCoreMinorStarCandidateTextWithinRiskBoundary({
      forwardText: `${candidate.coreThemes.join("")}${candidate.plainLanguage}`,
      counterweight: candidate.counterweight,
      reviewerOnlyText: candidate.reviewPrompt
    });
    if (candidate.goodBadOrientation !== null
      || candidate.eventOutcome !== null
      || candidate.result !== null
      || candidate.reviewStatus !== "awaiting_expert_review"
      || candidate.publicationStatus !== "isolated_candidate_only"
      || candidate.expertTruthClaimed
      || candidate.directOutcomeAllowed
      || candidate.scoringAllowed) {
      return fail(`核心十二辅星 ${candidate.starId} 开启了未授权的结论或发布字段`);
    }
    byStarId.set(candidate.starId, candidate);
    contentIds.add(candidate.contentId);
  }
  const clusterCounts = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.reduce(
    (counts, candidate) => ({
      ...counts,
      [candidate.traditionalCluster]: counts[candidate.traditionalCluster] + 1
    }),
    { supporting_six: 0, challenging_six: 0 }
  );
  if (clusterCounts.supporting_six !== 6 || clusterCounts.challenging_six !== 6) {
    return fail("核心十二辅星的传统分组必须恰为 supporting_six 6 条、challenging_six 6 条");
  }
  return byStarId;
}

function validateAndIndexPalaceCandidates(): ReadonlyMap<
  string,
  BrowserProbeCoreMinorStarPalaceCandidateContent
> {
  const expectedCount = ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT.length * ZIWEI_PALACE_ROLE_IDS.length;
  if (ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT.length !== expectedCount) {
    return fail(`核心十二辅星十二宫候选必须恰有 ${expectedCount} 条`);
  }
  const sourceIds = new Set([
    ...ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId)
  ]);
  const byKey = new Map<string, BrowserProbeCoreMinorStarPalaceCandidateContent>();
  const contentIds = new Set<string>();
  const summaries = new Set<string>();
  for (const candidate of ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT) {
    const baseCandidate = BASE_CANDIDATE_BY_STAR_ID.get(candidate.starId);
    const palaceRoleContent = requirePalaceRoleCandidateContent(candidate.palaceRoleId)
      ?? fail(`核心十二辅星落宫候选收到未知宫位 ${candidate.palaceRoleId}`);
    const key = contentKey(candidate.starId, candidate.palaceRoleId);
    if (!baseCandidate
      || candidate.label !== baseCandidate.label
      || candidate.baseCandidateContentId !== baseCandidate.contentId
      || candidate.palaceRoleContentId !== palaceRoleContent.contentId
      || candidate.palaceRoleLabel !== palaceRoleContent.palaceRoleLabel
      || byKey.has(key)
      || contentIds.has(candidate.contentId)
      || summaries.has(candidate.positionSummary)) {
      return fail(`核心十二辅星落宫候选身份、覆盖或快照无效：${key}`);
    }
    if (candidate.factCategory !== "minor"
      || candidate.traditionalCluster !== baseCandidate.traditionalCluster
      || candidate.traditionalClusterIsOutcome
      || candidate.sourceRefs.length !== 4
      || new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 4
      || candidate.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)
      || !candidate.positionSummary.startsWith(`${candidate.label}落${candidate.palaceRoleLabel}`)) {
      return fail(`核心十二辅星落宫候选的类别、来源或边界无效：${key}`);
    }
    assertCoreMinorStarCandidateTextWithinRiskBoundary({
      forwardText: candidate.positionSummary,
      counterweight: candidate.counterweight,
      reviewerOnlyText: candidate.reviewPrompt
    });
    if (!candidate.requiresCombinationReview
      || candidate.goodBadOrientation !== null
      || candidate.eventOutcome !== null
      || candidate.result !== null
      || candidate.reviewStatus !== "awaiting_expert_review"
      || candidate.publicationStatus !== "isolated_candidate_only"
      || candidate.expertTruthClaimed
      || candidate.directOutcomeAllowed
      || candidate.scoringAllowed) {
      return fail(`核心十二辅星落宫候选开启了未授权的结论或发布字段：${key}`);
    }
    byKey.set(key, candidate);
    contentIds.add(candidate.contentId);
    summaries.add(candidate.positionSummary);
  }
  for (const baseCandidate of ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT) {
    for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
      if (!byKey.has(contentKey(baseCandidate.starId, palaceRoleId))) {
        return fail(`核心十二辅星十二宫候选缺少 ${baseCandidate.starId} × ${palaceRoleId}`);
      }
    }
  }
  return byKey;
}

function mergeSourceRefs(
  coreMinorSourceRefs: readonly BrowserProbeCoreMinorStarSourceRef[],
  palaceSourceRefs: readonly Readonly<{ sourceId: string; locator: string }>[]
): readonly BrowserProbeCoreMinorStarSourceRef[] {
  const normalizedPalaceSourceRefs = palaceSourceRefs.map((sourceRef) => ({
    ...sourceRef,
    bindingTarget: "exact_palace_role" as const,
    semanticCandidateSupport: true
  }));
  const bySourceId = new Map<string, BrowserProbeCoreMinorStarSourceRef>();
  for (const sourceRef of [...coreMinorSourceRefs, ...normalizedPalaceSourceRefs]) {
    if (!bySourceId.has(sourceRef.sourceId)) {
      bySourceId.set(sourceRef.sourceId, Object.freeze({ ...sourceRef }));
    }
  }
  return Object.freeze([...bySourceId.values()]);
}

function contentKey(starId: string, palaceRoleId: BrowserProbePalaceRoleId): string {
  return `${starId}::${palaceRoleId}`;
}

function isPalaceRoleId(value: string): value is BrowserProbePalaceRoleId {
  return (ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value);
}

function isCoreMinorStarEarthlyBranchId(
  value: string
): value is BrowserProbeCoreMinorStarEarthlyBranchId {
  return (CORE_MINOR_STAR_EARTHLY_BRANCH_IDS as readonly string[]).includes(value);
}

function freezeBrightnessByEarthlyBranch(
  values: CoreMinorStarBrightnessTuple
): BrowserProbeCoreMinorStarBrightnessByEarthlyBranch {
  return Object.freeze(Object.fromEntries(
    CORE_MINOR_STAR_EARTHLY_BRANCH_IDS.map((branchId, index) => [branchId, values[index]])
  ) as unknown as BrowserProbeCoreMinorStarBrightnessByEarthlyBranch);
}

function absoluteOutcomeLanguagePattern(): RegExp {
  return /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|适合/u;
}

function directHighRiskResultLanguagePattern(): RegExp {
  return /破财|贫困|贫贱|财富多寡|财运|资产规模|灾祸|血光|牢狱|官灾|残疾|夭折|疾病|寿命|死亡|手术|生育|怀孕|妊娠|流产|婚期|婚姻结果|离婚|克夫|克妻|职业指定|失业|继承|投资建议|可信|背叛|精神病|心理诊断|人格定型|性别刻板/u;
}

function alarmingCounterweightLanguagePattern(): RegExp {
  return /破财|贫困|贫贱|灾祸|血光|牢狱|官灾|残疾|夭折|疾病|死亡|手术|流产|离婚|克夫|克妻|失业|背叛|精神病|心理问题|事故|暴力/u;
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function fail(message: string): never {
  throw new Error(message);
}
