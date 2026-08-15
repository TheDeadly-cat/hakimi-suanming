import type {
  BrowserProbeCorePalaceRoleId,
  BrowserProbeMajorStarPalaceCandidateContent,
  BrowserProbeMajorStarPalaceContentSource,
  BrowserProbePalaceRoleCandidateContent,
  BrowserProbePalaceRoleId
} from "./browser-protocol.ts";
import { ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT } from "./major-star-content.ts";

export const ZIWEI_MAJOR_STAR_PALACE_CONTENT_VERSION =
  "ziwei.major_star_all_palaces.neutral_candidate/0.2" as const;

const CLASSICAL_PALACE_SOURCE_ID = "ziwei.classic.zwdsql.volume2.all_palaces.wikisource.2026_08_12";
const MODERN_PALACE_SOURCE_ID = "ziwei.modern.iztro.palace_system.all_palaces.2026_08_12";

export const ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES = Object.freeze<
  readonly BrowserProbeMajorStarPalaceContentSource[]
>([
  Object.freeze({
    sourceId: CLASSICAL_PALACE_SOURCE_ID,
    sourceKind: "public_domain_classical_palace_transcription",
    title: "《紫微斗数全书》卷二·十二宫逐星条目（维基文库转录）",
    sourceUrl: "https://zh.wikisource.org/wiki/紫微斗數全書/卷二",
    accessedAt: "2026-08-12",
    usageBoundary: "仅定位卷二十二宫逐星条目，供原创位置化候选核对主题；不照搬富贵、灾祸、疾病、寿命、职业、婚育或身份断语。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: MODERN_PALACE_SOURCE_ID,
    sourceKind: "modern_original_palace_learning_material",
    title: "紫微斗数宫位系统｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/zh_TW/learn/palace",
    accessedAt: "2026-08-12",
    usageBoundary: "仅用于核对十二宫各自的问题域后重新组织原创位置化短句；不复制原网页文案，也不把宫位主题当成吉凶或事件结果。",
    expertTruthClaimed: false
  })
]);

export const ZIWEI_PALACE_ROLE_IDS = Object.freeze([
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "wellbeing",
  "parents"
] as const satisfies readonly BrowserProbePalaceRoleId[]);

const ZIWEI_CORE_PALACE_ROLE_IDS = Object.freeze([
  "life", "wealth", "career", "travel"
] as const satisfies readonly BrowserProbeCorePalaceRoleId[]);

type PalaceMetadata = Readonly<{
  label: string;
  classicalLocator: string;
  modernLocator: string;
  domainSummary: string;
  reviewPrompt: string;
}>;

const PALACE_METADATA = Object.freeze<Record<BrowserProbePalaceRoleId, PalaceMetadata>>({
  life: Object.freeze({
    label: "命宫",
    classicalLocator: "卷二／一 命宫",
    modernLocator: "宫位系统／命宫",
    domainSummary: "处理自我定位、回应方式与人生关注点时",
    reviewPrompt: "需合参身宫、亮度、同宫星与命财官迁四宫；本条不等于人格定型。"
  }),
  siblings: Object.freeze({
    label: "兄弟宫",
    classicalLocator: "卷二／二兄弟",
    modernLocator: "宫位系统／兄弟宫",
    domainSummary: "处理手足、同辈协作与资源往来时",
    reviewPrompt: "需合参命宫、交友宫与现实关系资料；本条不判断手足数量，也不预定同辈关系结果。"
  }),
  spouse: Object.freeze({
    label: "夫妻宫",
    classicalLocator: "卷二／三妻妾",
    modernLocator: "宫位系统／夫妻宫",
    domainSummary: "处理亲密关系、承诺方式与相处边界时",
    reviewPrompt: "需合参命宫、福德宫与双方现实选择；本条不预测婚期、婚姻结果，也不使用性别刻板断语。"
  }),
  children: Object.freeze({
    label: "子女宫",
    classicalLocator: "卷二／四子女",
    modernLocator: "宫位系统／子女宫",
    domainSummary: "处理亲子、培育、创作及合作输出时",
    reviewPrompt: "需合参田宅宫、现实家庭与创作情境；本条不判断生育能力、子女数量或亲子结果。"
  }),
  wealth: Object.freeze({
    label: "财帛宫",
    classicalLocator: "卷二／五财帛",
    modernLocator: "宫位系统／财帛宫",
    domainSummary: "处理财务态度、资源交换与物质需求时",
    reviewPrompt: "需合参福德、田宅、实际收支与风险承受度；本条不判断财富多寡，也不是投资建议。"
  }),
  health: Object.freeze({
    label: "疾厄宫",
    classicalLocator: "卷二／六疾厄",
    modernLocator: "宫位系统／疾厄宫",
    domainSummary: "观察身体使用、恢复节奏与日常负荷时",
    reviewPrompt: "需合参现实作息、就医资料与专业意见；本条不诊断疾病、不判断寿命，也不能替代医疗服务。"
  }),
  travel: Object.freeze({
    label: "迁移宫",
    classicalLocator: "卷二／七迁移",
    modernLocator: "宫位系统／迁移宫",
    domainSummary: "进入外部环境、陌生场域与公开互动时",
    reviewPrompt: "需合参命宫、出行目的、外部环境与现实支持；本条不直接预测异地成败。"
  }),
  friends: Object.freeze({
    label: "交友宫",
    classicalLocator: "卷二／八奴仆",
    modernLocator: "宫位系统／仆役宫（现代界面作交友宫）",
    domainSummary: "处理社交圈、协作网络与沟通选择时",
    reviewPrompt: "需合参兄弟宫、迁移宫与具体互动证据；本条不判断某个人是否可信、背叛或具有固定身份。"
  }),
  career: Object.freeze({
    label: "官禄宫",
    classicalLocator: "卷二／九官禄",
    modernLocator: "宫位系统／官禄宫",
    domainSummary: "处理工作态度、任务结构与责任分工时",
    reviewPrompt: "需合参命宫、财帛、迁移、实际技能与行业环境；本条不直接指定职业或成就。"
  }),
  property: Object.freeze({
    label: "田宅宫",
    classicalLocator: "卷二／十田宅",
    modernLocator: "宫位系统／田宅宫",
    domainSummary: "处理家庭空间、收藏、安定感与长期积累时",
    reviewPrompt: "需合参财帛宫、现实产权与家庭安排；本条不据此断定置业、继承、资产规模或家庭结果。"
  }),
  wellbeing: Object.freeze({
    label: "福德宫",
    classicalLocator: "卷二／十一福德",
    modernLocator: "宫位系统／福德宫",
    domainSummary: "观察内在思考、精神休息与价值感受时",
    reviewPrompt: "需合参命宫、现实生活节奏与本人表达；本条不作心理诊断，也不把内在体验固定成性格标签。"
  }),
  parents: Object.freeze({
    label: "父母宫",
    classicalLocator: "卷二／十二父母",
    modernLocator: "宫位系统／父母宫",
    domainSummary: "处理长辈互动、早期支持及制度文书关系时",
    reviewPrompt: "需合参命宫、田宅宫与现实家庭资料；本条不判断父母健康、寿命或家庭命运。"
  })
});

export const ZIWEI_PALACE_ROLE_CONTENT_VERSION =
  "ziwei.palace_role.neutral_candidate/0.1" as const;

export const ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT = Object.freeze(
  ZIWEI_PALACE_ROLE_IDS.map((palaceRoleId) => {
    const palace = PALACE_METADATA[palaceRoleId];
    return Object.freeze<BrowserProbePalaceRoleCandidateContent>({
      contentId: `ziwei.content.palace_role.${palaceRoleId}.neutral.v0_1`,
      contentVersion: ZIWEI_PALACE_ROLE_CONTENT_VERSION,
      contentKind: "neutral_palace_domain_candidate",
      palaceRoleId,
      palaceRoleLabel: palace.label,
      domainSummary: palace.domainSummary,
      reviewPrompt: palace.reviewPrompt,
      derivationMethod: "editorial_restatement_of_source_bound_palace_domain",
      sourceRefs: Object.freeze([
        Object.freeze({
          sourceId: CLASSICAL_PALACE_SOURCE_ID,
          locator: palace.classicalLocator
        }),
        Object.freeze({
          sourceId: MODERN_PALACE_SOURCE_ID,
          locator: palace.modernLocator
        })
      ]),
      reviewStatus: "awaiting_expert_review",
      publicationStatus: "isolated_candidate_only",
      expertTruthClaimed: false,
      directOutcomeAllowed: false,
      scoringAllowed: false
    });
  })
);

const PALACE_ROLE_CANDIDATE_BY_ID = validateAndIndexPalaceRoleCandidates();

export function requirePalaceRoleCandidateContent(
  palaceRoleId: string
): BrowserProbePalaceRoleCandidateContent | null {
  if (!isPalaceRoleId(palaceRoleId)) return null;
  return PALACE_ROLE_CANDIDATE_BY_ID.get(palaceRoleId)
    ?? fail(`十二宫问题域候选缺少 ${palaceRoleId}`);
}

type StarPalaceSeed = Readonly<{
  starId: string;
  label: string;
  summaries: Readonly<Record<BrowserProbeCorePalaceRoleId, string>>;
}>;

const SEEDS = Object.freeze<readonly StarPalaceSeed[]>([
  {
    starId: "ziwei.star.iztro.ziwei-maj",
    label: "紫微",
    summaries: {
      life: "紫微落命宫，统筹、秩序与位置感会成为理解自我定位和决策方式的主线。",
      wealth: "紫微落财帛宫，资源处理更强调全局配置、长期安排与掌控边界，而不只看单笔得失。",
      career: "紫微落官禄宫，工作场景更突出统筹、责任位置、决策结构和带动全局的方式。",
      travel: "紫微落迁移宫，进入外部环境时更容易呈现组织者、协调者或主导议程的一面。"
    }
  },
  {
    starId: "ziwei.star.iztro.tianji-maj",
    label: "天机",
    summaries: {
      life: "天机落命宫，分析、策划和随情境调整是理解反应模式的重点，思路往往先于行动。",
      wealth: "天机落财帛宫，财务态度更重信息、方案比较和机动调整，资源路径可能不止一种。",
      career: "天机落官禄宫，做事方式偏向规划、拆解问题和处理变化，工作节奏可能随任务快速切换。",
      travel: "天机落迁移宫，在陌生环境中更重观察、试探和寻找路径，外部变化容易激活思考。"
    }
  },
  {
    starId: "ziwei.star.iztro.taiyang-maj",
    label: "太阳",
    summaries: {
      life: "太阳落命宫，表达、承担和可见度成为自我呈现的重要部分，倾向把态度放到公开场域。",
      wealth: "太阳落财帛宫，对资源价值的判断常联系投入、责任和可见成果，也重视交换是否公开清楚。",
      career: "太阳落官禄宫，工作方式偏向公开承担、沟通推动与让成果被看见。",
      travel: "太阳落迁移宫，在外部场域更容易主动表达、承担角色并建立可见度。"
    }
  },
  {
    starId: "ziwei.star.iztro.wuqu-maj",
    label: "武曲",
    summaries: {
      life: "武曲落命宫，直接行动、效率和结果意识成为处理问题的主要观察点。",
      wealth: "武曲落财帛宫，资源处理倾向量化、预算、执行与边界清楚，重视投入是否产生结果。",
      career: "武曲落官禄宫，工作方式突出执行、独立处理和以成果检验进度。",
      travel: "武曲落迁移宫，在陌生或变化场域中倾向先解决实际问题，以行动建立位置。"
    }
  },
  {
    starId: "ziwei.star.iztro.tiantong-maj",
    label: "天同",
    summaries: {
      life: "天同落命宫，亲和、和缓与舒适感影响反应模式，常先寻找较低摩擦的相处方式。",
      wealth: "天同落财帛宫，财务态度较重稳定、生活感受与资源带来的舒适度。",
      career: "天同落官禄宫，做事方式重协作、气氛与可持续节奏，倾向减少不必要冲突。",
      travel: "天同落迁移宫，在外部环境中较重亲和与适应，常以放松关系来进入新场域。"
    }
  },
  {
    starId: "ziwei.star.iztro.lianzhen-maj",
    label: "廉贞",
    summaries: {
      life: "廉贞落命宫，边界、原则和自我要求成为自我定位的重要部分，对分寸较敏感。",
      wealth: "廉贞落财帛宫，资源处理更关注规则、所有权、交换条件和风险边界。",
      career: "廉贞落官禄宫，工作方式强调标准、权责和流程边界，也在意规则能否被执行。",
      travel: "廉贞落迁移宫，进入外部关系时较先确认分寸与立场，呈现谨慎而有界限的一面。"
    }
  },
  {
    starId: "ziwei.star.iztro.tianfu-maj",
    label: "天府",
    summaries: {
      life: "天府落命宫，稳定承载、管理和留有余地成为反应模式的重要观察点。",
      wealth: "天府落财帛宫，资源态度偏向保存、配置、建立缓冲与维持长期稳定。",
      career: "天府落官禄宫，做事方式重运营、承接、持续性和让系统保持有序。",
      travel: "天府落迁移宫，在外部环境中倾向以稳健、可靠和资源整合建立信任。"
    }
  },
  {
    starId: "ziwei.star.iztro.taiyin-maj",
    label: "太阴",
    summaries: {
      life: "太阴落命宫，内在感受、细节和安全感在自我判断中占较大比重，表达可能先经过内心衡量。",
      wealth: "太阴落财帛宫，资源态度重积累、细微成本、安全感与长期储备。",
      career: "太阴落官禄宫，工作方式重细节、质量、照料与幕后推进，未必追求高可见度。",
      travel: "太阴落迁移宫，在陌生场域中倾向先观察气氛和关系，再决定表达与投入程度。"
    }
  },
  {
    starId: "ziwei.star.iztro.tanlang-maj",
    label: "贪狼",
    summaries: {
      life: "贪狼落命宫，好奇、兴趣和社交体验会扩展自我探索的范围，注意力可能同时落在多个方向。",
      wealth: "贪狼落财帛宫，资源态度较重机会、体验与扩展空间，也容易关注新的交换方式。",
      career: "贪狼落官禄宫，做事方式带有探索、连接人群与尝试多角色的倾向。",
      travel: "贪狼落迁移宫，在外部环境中社交适应和新鲜感较突出，容易被多样机会吸引。"
    }
  },
  {
    starId: "ziwei.star.iztro.jumen-maj",
    label: "巨门",
    summaries: {
      life: "巨门落命宫，提问、辨析和语言表达成为认识自己与回应环境的重要工具。",
      wealth: "巨门落财帛宫，资源处理更关注信息差、条款、比较与协商过程。",
      career: "巨门落官禄宫，工作方式偏向分析、论证、沟通和指出问题，意见交锋可能较多。",
      travel: "巨门落迁移宫，在外部场域中更容易通过提问、解释或讨论建立位置，也需留意沟通摩擦。"
    }
  },
  {
    starId: "ziwei.star.iztro.tianxiang-maj",
    label: "天相",
    summaries: {
      life: "天相落命宫，公平、协调和支持系统成为自我定位的重要部分，常会兼顾不同角色。",
      wealth: "天相落财帛宫，资源态度重平衡分配、规则、互惠与维持关系的可持续性。",
      career: "天相落官禄宫，工作方式重接口协调、流程、服务和让各方职责衔接。",
      travel: "天相落迁移宫，在外部环境中倾向维护体面、协调立场并寻找双方都能接受的安排。"
    }
  },
  {
    starId: "ziwei.star.iztro.tianliang-maj",
    label: "天梁",
    summaries: {
      life: "天梁落命宫，原则、保护和经验感成为反应模式的重要部分，容易关注长期影响。",
      wealth: "天梁落财帛宫，资源态度偏向稳健、责任和长期可承受性，较在意用途是否合理。",
      career: "天梁落官禄宫，工作方式重指导、监督、保护机制和经验判断。",
      travel: "天梁落迁移宫，在外部环境中容易呈现照拂、守原则或提供经验支持的一面。"
    }
  },
  {
    starId: "ziwei.star.iztro.qisha-maj",
    label: "七杀",
    summaries: {
      life: "七杀落命宫，决断、承压和面对变化成为反应模式的主要观察点，行动常瞄准关键问题。",
      wealth: "七杀落财帛宫，资源处理倾向抓关键、快速决策和集中投入，节奏可能较有起伏。",
      career: "七杀落官禄宫，工作方式突出攻坚、推进和在压力下完成转变。",
      travel: "七杀落迁移宫，在陌生环境中倾向独立判断、快速适应并直接处理挑战。"
    }
  },
  {
    starId: "ziwei.star.iztro.pojun-maj",
    label: "破军",
    summaries: {
      life: "破军落命宫，打破旧结构、重启和重新定义规则成为自我探索的重要线索。",
      wealth: "破军落财帛宫，资源态度常围绕重新配置、转换成本和舍弃旧安排展开。",
      career: "破军落官禄宫，工作方式偏向改革、重构、处理转型或从混乱中建立新秩序。",
      travel: "破军落迁移宫，外部变化容易推动更换路径、试验新环境和重新安排生活结构。"
    }
  }
]);

const STAR_MOTIFS = Object.freeze<Record<string, string>>({
  "ziwei.star.iztro.ziwei-maj": "统筹、秩序与位置感",
  "ziwei.star.iztro.tianji-maj": "分析、策划与随情境调整",
  "ziwei.star.iztro.taiyang-maj": "表达、承担与可见度",
  "ziwei.star.iztro.wuqu-maj": "执行、效率与结果意识",
  "ziwei.star.iztro.tiantong-maj": "亲和、和缓与舒适节奏",
  "ziwei.star.iztro.lianzhen-maj": "边界、原则与分寸",
  "ziwei.star.iztro.tianfu-maj": "承载、管理与长期稳定",
  "ziwei.star.iztro.taiyin-maj": "内在感受、细节与安全感",
  "ziwei.star.iztro.tanlang-maj": "好奇、兴趣与社交扩展",
  "ziwei.star.iztro.jumen-maj": "提问、辨析与语言表达",
  "ziwei.star.iztro.tianxiang-maj": "协调、公平与支持系统",
  "ziwei.star.iztro.tianliang-maj": "原则、保护与经验判断",
  "ziwei.star.iztro.qisha-maj": "决断、承压与关键行动",
  "ziwei.star.iztro.pojun-maj": "重构、重启与规则更新"
});

export const ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT = Object.freeze(
  SEEDS.flatMap((seed) => ZIWEI_PALACE_ROLE_IDS.map((palaceRoleId) => {
    const palace = PALACE_METADATA[palaceRoleId];
    return Object.freeze<BrowserProbeMajorStarPalaceCandidateContent>({
      contentId: `ziwei.content.major_star_all_palaces.${seed.starId.split(".").at(-1)}.${palaceRoleId}.neutral.v0_2`,
      contentVersion: ZIWEI_MAJOR_STAR_PALACE_CONTENT_VERSION,
      contentKind: "neutral_palace_semantics_candidate",
      starId: seed.starId,
      label: seed.label,
      palaceRoleId,
      palaceRoleLabel: palace.label,
      positionSummary: positionSummary(seed, palaceRoleId, palace),
      reviewPrompt: palace.reviewPrompt,
      derivationMethod: "editorial_synthesis_of_star_theme_and_palace_domain",
      sourceRefs: Object.freeze([
        Object.freeze({
          sourceId: CLASSICAL_PALACE_SOURCE_ID,
          locator: `${palace.classicalLocator}／${seed.label}`
        }),
        Object.freeze({
          sourceId: MODERN_PALACE_SOURCE_ID,
          locator: palace.modernLocator
        })
      ]),
      reviewStatus: "awaiting_expert_review",
      publicationStatus: "isolated_candidate_only",
      requiresCombinationReview: true,
      expertTruthClaimed: false,
      directOutcomeAllowed: false,
      scoringAllowed: false
    });
  }))
);

const CANDIDATE_BY_STAR_AND_PALACE = validateAndIndexCandidates();

export function requireMajorStarPalaceCandidateContent(
  starId: string,
  label: string,
  palaceRoleId: string
): BrowserProbeMajorStarPalaceCandidateContent | null {
  if (!isPalaceRoleId(palaceRoleId)) return null;
  const candidate = CANDIDATE_BY_STAR_AND_PALACE.get(contentKey(starId, palaceRoleId));
  if (!candidate) throw new Error(`十四主星十二宫候选缺少 ${starId} × ${palaceRoleId}`);
  if (candidate.label !== label) {
    throw new Error(`十四主星十二宫候选标签不匹配：${starId} 应为 ${candidate.label}，实际为 ${label}`);
  }
  return candidate;
}

function isCorePalaceRoleId(value: string): value is BrowserProbeCorePalaceRoleId {
  return (ZIWEI_CORE_PALACE_ROLE_IDS as readonly string[]).includes(value);
}

function isPalaceRoleId(value: string): value is BrowserProbePalaceRoleId {
  return (ZIWEI_PALACE_ROLE_IDS as readonly string[]).includes(value);
}

function positionSummary(
  seed: StarPalaceSeed,
  palaceRoleId: BrowserProbePalaceRoleId,
  palace: PalaceMetadata
): string {
  if (isCorePalaceRoleId(palaceRoleId)) return seed.summaries[palaceRoleId];
  const motif = STAR_MOTIFS[seed.starId];
  if (!motif) throw new Error(`十四主星十二宫候选缺少 ${seed.starId} 的星曜表达线索`);
  return `${seed.label}落${palace.label}，${palace.domainSummary}，“${motif}”会成为主要观察线索；这是位置化合参候选，不代表单项结果。`;
}

function contentKey(starId: string, palaceRoleId: BrowserProbePalaceRoleId): string {
  return `${starId}::${palaceRoleId}`;
}

function validateAndIndexCandidates(): ReadonlyMap<string, BrowserProbeMajorStarPalaceCandidateContent> {
  const expectedCount = ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.length * ZIWEI_PALACE_ROLE_IDS.length;
  if (ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT.length !== expectedCount) {
    throw new Error(`十四主星十二宫候选必须恰有 ${expectedCount} 条`);
  }
  const baseByStarId = new Map(
    ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT.map((candidate) => [candidate.starId, candidate])
  );
  const sourceIds = new Set(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId));
  const byKey = new Map<string, BrowserProbeMajorStarPalaceCandidateContent>();
  const contentIds = new Set<string>();
  const riskyOutcomeLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u;
  for (const candidate of ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT) {
    const base = baseByStarId.get(candidate.starId);
    if (!base || base.label !== candidate.label) {
      throw new Error(`十四主星十二宫候选未绑定有效基础星曜：${candidate.starId}`);
    }
    const key = contentKey(candidate.starId, candidate.palaceRoleId);
    if (byKey.has(key)) throw new Error(`十四主星十二宫候选键重复：${key}`);
    if (contentIds.has(candidate.contentId)) throw new Error(`十四主星十二宫内容 ID 重复：${candidate.contentId}`);
    if (candidate.sourceRefs.length !== 2 || candidate.sourceRefs.some((ref) => !sourceIds.has(ref.sourceId))) {
      throw new Error(`十四主星十二宫候选 ${key} 的来源引用不完整`);
    }
    if (riskyOutcomeLanguage.test(candidate.positionSummary)) {
      throw new Error(`十四主星十二宫候选 ${key} 含有禁止的绝对化、结果化或个人标签措辞`);
    }
    byKey.set(key, candidate);
    contentIds.add(candidate.contentId);
  }
  for (const base of ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT) {
    for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
      if (!byKey.has(contentKey(base.starId, palaceRoleId))) {
        throw new Error(`十四主星十二宫候选缺少 ${base.starId} × ${palaceRoleId}`);
      }
    }
  }
  return byKey;
}

function validateAndIndexPalaceRoleCandidates(): ReadonlyMap<
  BrowserProbePalaceRoleId,
  BrowserProbePalaceRoleCandidateContent
> {
  if (ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT.length !== ZIWEI_PALACE_ROLE_IDS.length) {
    throw new Error(`十二宫问题域候选必须恰有 ${ZIWEI_PALACE_ROLE_IDS.length} 条`);
  }
  const sourceIds = new Set(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId));
  const byRoleId = new Map<BrowserProbePalaceRoleId, BrowserProbePalaceRoleCandidateContent>();
  const contentIds = new Set<string>();
  const riskyOutcomeLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|适合/u;
  for (const candidate of ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT) {
    if (byRoleId.has(candidate.palaceRoleId)) {
      throw new Error(`十二宫问题域候选角色重复：${candidate.palaceRoleId}`);
    }
    if (contentIds.has(candidate.contentId)) {
      throw new Error(`十二宫问题域候选内容 ID 重复：${candidate.contentId}`);
    }
    if (candidate.sourceRefs.length !== 2
      || new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 2
      || candidate.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId))) {
      throw new Error(`十二宫问题域候选 ${candidate.palaceRoleId} 的来源引用不完整`);
    }
    if (riskyOutcomeLanguage.test(`${candidate.domainSummary}${candidate.reviewPrompt}`)) {
      throw new Error(`十二宫问题域候选 ${candidate.palaceRoleId} 含结果化措辞`);
    }
    byRoleId.set(candidate.palaceRoleId, candidate);
    contentIds.add(candidate.contentId);
  }
  for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
    if (!byRoleId.has(palaceRoleId)) throw new Error(`十二宫问题域候选缺少 ${palaceRoleId}`);
  }
  return byRoleId;
}

function fail(message: string): never {
  throw new Error(message);
}
