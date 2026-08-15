import type {
  BrowserProbeMajorStarCandidateContent,
  BrowserProbeMajorStarContentSource
} from "./browser-protocol.ts";

export const ZIWEI_MAJOR_STAR_CONTENT_VERSION = "ziwei.major_star.neutral_candidate/0.1" as const;

const CLASSICAL_SOURCE_ID = "ziwei.classic.zwdsql.volume1.wikisource.2026_08_12";
const MODERN_SOURCE_ID = "ziwei.modern.iztro.major_star.2026_08_12";

export const ZIWEI_MAJOR_STAR_CONTENT_SOURCES = Object.freeze<
  readonly BrowserProbeMajorStarContentSource[]
>([
  Object.freeze({
    sourceId: CLASSICAL_SOURCE_ID,
    sourceKind: "public_domain_classical_transcription",
    title: "《紫微斗数全书》卷一·诸星问答论（维基文库转录）",
    sourceUrl: "https://zh.wikisource.org/zh-hans/紫微斗數全書/卷一",
    accessedAt: "2026-08-12",
    usageBoundary: "仅作传统星名、篇目与历史主题的定位依据；不照搬古文断语，维基文库转录文本按其页面许可使用。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: MODERN_SOURCE_ID,
    sourceKind: "modern_original_learning_material",
    title: "十四主星｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/learn/major-star",
    accessedAt: "2026-08-12",
    usageBoundary: "仅用于交叉核对主题后重新组织中性短句；不复制原网页文案，原页版权与署名要求仍归原作者。",
    expertTruthClaimed: false
  })
]);

type MajorStarSeed = Readonly<{
  starId: string;
  label: string;
  classicalLocator: string;
  coreThemes: readonly [string, string, string];
  plainLanguage: string;
  balancePrompt: string;
}>;

const SEEDS = Object.freeze<readonly MajorStarSeed[]>([
  {
    starId: "ziwei.star.iztro.ziwei-maj",
    label: "紫微",
    classicalLocator: "诸星问答论／问紫微所主若何",
    coreThemes: ["统筹", "秩序", "长期视角"],
    plainLanguage: "候选基础语义指向统筹、位置感与资源调度；落入某宫时，可先看该宫主题如何被组织起来。",
    balancePrompt: "目标感较强时，也要核对现实资源、同宫星与四化是否支持承载。"
  },
  {
    starId: "ziwei.star.iztro.tianji-maj",
    label: "天机",
    classicalLocator: "诸星问答论／问天机所主如何",
    coreThemes: ["思考", "策划", "变通"],
    plainLanguage: "候选基础语义指向分析、策划与寻找多种路径；落入某宫时，可先看该宫是否强调思路和变化。",
    balancePrompt: "想法增多时可能分散，需要结合执行型星曜、亮度与四化判断能否落地。"
  },
  {
    starId: "ziwei.star.iztro.taiyang-maj",
    label: "太阳",
    classicalLocator: "诸星问答论／问太阳所主若何",
    coreThemes: ["表达", "责任", "可见度"],
    plainLanguage: "候选基础语义指向公开表达、主动承担与被看见；落入某宫时，可先看该宫如何走向外部舞台。",
    balancePrompt: "主动承担也可能变成过度主导，需结合亮度、对宫与同宫星观察表达方式。"
  },
  {
    starId: "ziwei.star.iztro.wuqu-maj",
    label: "武曲",
    classicalLocator: "诸星问答论／问武曲星所主为何",
    coreThemes: ["执行", "资源", "结果"],
    plainLanguage: "候选基础语义指向直接行动、资源处理与结果意识；落入某宫时，可先看该宫怎样把事情做成。",
    balancePrompt: "重效率和独立处理时，可能压缩沟通与前置规划，需结合其他星曜校正。"
  },
  {
    starId: "ziwei.star.iztro.tiantong-maj",
    label: "天同",
    classicalLocator: "诸星问答论／问天同星所主若何",
    coreThemes: ["和缓", "协调", "舒适"],
    plainLanguage: "候选基础语义指向亲和、协调与稳定感；落入某宫时，可先看该宫怎样寻求和谐与较低摩擦。",
    balancePrompt: "偏向求稳或避开冲突时，边界与行动力度要结合其他星曜再判断。"
  },
  {
    starId: "ziwei.star.iztro.lianzhen-maj",
    label: "廉贞",
    classicalLocator: "诸星问答论／问廉贞所主若何",
    coreThemes: ["边界", "原则", "自我要求"],
    plainLanguage: "候选基础语义指向规则意识、自我保护与清楚边界；落入某宫时，可先看该宫怎样处理分寸和立场。",
    balancePrompt: "认真、直接或防御性较强时可能形成距离感，需结合同宫星与四化观察沟通空间。"
  },
  {
    starId: "ziwei.star.iztro.tianfu-maj",
    label: "天府",
    classicalLocator: "诸星问答论／问天府所主若何",
    coreThemes: ["积累", "管理", "稳定"],
    plainLanguage: "候选基础语义指向保存、管理与稳步积累；落入某宫时，可先看该宫如何容纳资源并维持秩序。",
    balancePrompt: "重视稳妥与留存时，可能延后变化，需要结合破旧立新的星曜一起看。"
  },
  {
    starId: "ziwei.star.iztro.taiyin-maj",
    label: "太阴",
    classicalLocator: "诸星问答论／问太阴星所主若何",
    coreThemes: ["内在感受", "照料", "审美积累"],
    plainLanguage: "候选基础语义指向内在感受、细致照料与审美或储备；落入某宫时，可先看该宫的内在需求。",
    balancePrompt: "对环境与关系较敏感时可能反复衡量，需结合亮度、同宫星与四化观察表达程度。"
  },
  {
    starId: "ziwei.star.iztro.tanlang-maj",
    label: "贪狼",
    classicalLocator: "诸星问答论／问贪狼所主若何",
    coreThemes: ["兴趣", "社交", "探索"],
    plainLanguage: "候选基础语义指向兴趣驱动、好奇探索与社交吸引；落入某宫时，可先看该宫如何扩大体验。",
    balancePrompt: "投入与欲望可形成动力，也要结合同宫星与四化观察是否出现过度扩张或沉浸。"
  },
  {
    starId: "ziwei.star.iztro.jumen-maj",
    label: "巨门",
    classicalLocator: "诸星问答论／问巨门所主若何",
    coreThemes: ["表达", "质疑", "信息辨析"],
    plainLanguage: "候选基础语义指向提问、辨析与语言表达；落入某宫时，可先看该宫如何处理信息差和不同意见。",
    balancePrompt: "分析与质疑能帮助澄清，也可能形成争论；尤其需要结合四化与同宫星判断。"
  },
  {
    starId: "ziwei.star.iztro.tianxiang-maj",
    label: "天相",
    classicalLocator: "诸星问答论／问天相星所主若何",
    coreThemes: ["协调", "支持", "规则形象"],
    plainLanguage: "候选基础语义指向协调各方、支持系统与维护体面规则；落入某宫时，可先看该宫如何连接人与制度。",
    balancePrompt: "兼顾各方可能提高组织能力，也可能带来犹豫或回避问题，需结合亮度和会照判断。"
  },
  {
    starId: "ziwei.star.iztro.tianliang-maj",
    label: "天梁",
    classicalLocator: "诸星问答论／问天梁星所主若何",
    coreThemes: ["保护", "原则", "经验"],
    plainLanguage: "候选基础语义指向保护、经验与原则感；落入某宫时，可先看该宫如何承担照拂或守住底线。",
    balancePrompt: "坚持原则与经验时也可能显得疏离或固守，需要结合对宫、同宫星与四化观察。"
  },
  {
    starId: "ziwei.star.iztro.qisha-maj",
    label: "七杀",
    classicalLocator: "诸星问答论／问七杀星所主若何",
    coreThemes: ["决断", "推进", "变动"],
    plainLanguage: "候选基础语义指向决断、承压推进与面对变化；落入某宫时，可先看该宫怎样快速打开局面。",
    balancePrompt: "推进力度较强时，要补看评估、沟通与持续资源，不能只凭单星判断结果。"
  },
  {
    starId: "ziwei.star.iztro.pojun-maj",
    label: "破军",
    classicalLocator: "诸星问答论／问破军所主若何",
    coreThemes: ["突破", "重构", "消耗"],
    plainLanguage: "候选基础语义指向打破旧结构、重新组织与付出转换成本；落入某宫时，可先看该宫如何更新规则。",
    balancePrompt: "先破后立需要退路、资源预算与后续承接，需结合三方四正和四化再判断。"
  }
]);

export const ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT = Object.freeze(
  SEEDS.map((seed) => Object.freeze<BrowserProbeMajorStarCandidateContent>({
    contentId: `ziwei.content.major_star.${seed.starId.split(".").at(-1)}.neutral.v0_1`,
    contentVersion: ZIWEI_MAJOR_STAR_CONTENT_VERSION,
    contentKind: "neutral_base_semantics_candidate",
    starId: seed.starId,
    label: seed.label,
    coreThemes: Object.freeze([...seed.coreThemes]),
    plainLanguage: seed.plainLanguage,
    balancePrompt: seed.balancePrompt,
    sourceRefs: Object.freeze([
      Object.freeze({ sourceId: CLASSICAL_SOURCE_ID, locator: seed.classicalLocator }),
      Object.freeze({ sourceId: MODERN_SOURCE_ID, locator: `十四主星／${seed.label}星` })
    ]),
    reviewStatus: "awaiting_expert_review",
    publicationStatus: "isolated_candidate_only",
    expertTruthClaimed: false,
    directOutcomeAllowed: false,
    scoringAllowed: false
  }))
);

const CANDIDATE_BY_STAR_ID = validateAndIndexCandidates();

export function requireMajorStarCandidateContent(
  starId: string,
  label: string
): BrowserProbeMajorStarCandidateContent {
  const candidate = CANDIDATE_BY_STAR_ID.get(starId);
  if (!candidate) throw new Error(`十四主星候选注册表缺少 ${starId}`);
  if (candidate.label !== label) {
    throw new Error(`十四主星候选注册表标签不匹配：${starId} 应为 ${candidate.label}，实际为 ${label}`);
  }
  return candidate;
}

function validateAndIndexCandidates(): ReadonlyMap<string, BrowserProbeMajorStarCandidateContent> {
  if (ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.length !== 14) {
    throw new Error(`十四主星候选注册表必须恰有 14 条，实际为 ${ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.length}`);
  }
  const sourceIds = new Set(ZIWEI_MAJOR_STAR_CONTENT_SOURCES.map((source) => source.sourceId));
  if (sourceIds.size !== ZIWEI_MAJOR_STAR_CONTENT_SOURCES.length) {
    throw new Error("十四主星候选来源 ID 不得重复");
  }
  const byStarId = new Map<string, BrowserProbeMajorStarCandidateContent>();
  const contentIds = new Set<string>();
  const riskyAbsoluteLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶/u;
  for (const candidate of ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT) {
    if (byStarId.has(candidate.starId)) throw new Error(`十四主星候选星曜 ID 重复：${candidate.starId}`);
    if (contentIds.has(candidate.contentId)) throw new Error(`十四主星候选内容 ID 重复：${candidate.contentId}`);
    if (candidate.coreThemes.length !== 3 || new Set(candidate.coreThemes).size !== 3) {
      throw new Error(`十四主星候选 ${candidate.starId} 必须有三个不重复主题`);
    }
    if (candidate.sourceRefs.length !== 2 || candidate.sourceRefs.some((ref) => !sourceIds.has(ref.sourceId))) {
      throw new Error(`十四主星候选 ${candidate.starId} 的来源引用不完整`);
    }
    if (riskyAbsoluteLanguage.test(`${candidate.plainLanguage}${candidate.balancePrompt}`)) {
      throw new Error(`十四主星候选 ${candidate.starId} 含有禁止的绝对化或个人标签措辞`);
    }
    byStarId.set(candidate.starId, candidate);
    contentIds.add(candidate.contentId);
  }
  return byStarId;
}
