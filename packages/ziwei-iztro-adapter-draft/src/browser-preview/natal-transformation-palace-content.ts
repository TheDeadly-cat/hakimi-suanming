import type {
  BrowserProbeMajorStarSourceRef,
  BrowserProbeNatalTransformationLabel,
  BrowserProbeNatalTransformationPalaceCandidateContent,
  BrowserProbePalaceRoleId
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

export const ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION =
  "ziwei.natal_transformation_all_palaces.neutral_candidate/0.1" as const;

const TRANSFORMATION_LABELS = Object.freeze([
  "禄", "权", "科", "忌"
] as const satisfies readonly BrowserProbeNatalTransformationLabel[]);

type PalaceTransformationSeed = Readonly<{
  palaceRoleId: BrowserProbePalaceRoleId;
  focus: string;
  effects: Readonly<Record<BrowserProbeNatalTransformationLabel, string>>;
  counterweights: Readonly<Record<BrowserProbeNatalTransformationLabel, string>>;
  reviewEvidence: string;
}>;

const PALACE_SEEDS = Object.freeze<readonly PalaceTransformationSeed[]>([
  Object.freeze({
    palaceRoleId: "life",
    focus: "自我定位、回应方式与人生关注点",
    effects: Object.freeze({
      禄: "自我探索、可用资源与行动选择是否明显增多",
      权: "自主决定、边界维护与承担后果是否更突出",
      科: "自我表达、身份说明与被理解的需求是否更显眼",
      忌: "自我评价、定位落差与反复校正是否占用更多注意"
    }),
    counterweights: Object.freeze({
      禄: "选择和投入增加也可能分散注意或抬高维持成本，不能据此固定人格或判定人生顺逆。",
      权: "主导和承担增加也可能带来自我压力或边界僵持，不能据此认定能力、地位或控制结果。",
      科: "表达更容易被看见不等于评价有利或身份成立，也可能只是更频繁地解释自己。",
      忌: "对定位落差的在意不等于现实受阻，也可能推动重新命名目标、补足信息或调整边界。"
    }),
    reviewEvidence: "身宫、命财官迁四宫关系与本人长期叙述"
  }),
  Object.freeze({
    palaceRoleId: "siblings",
    focus: "手足、同辈协作与资源往来",
    effects: Object.freeze({
      禄: "互助资源、共同活动与往来频率是否增加",
      权: "分工、话语权与替同辈承担责任是否更突出",
      科: "沟通说明、协调评价与关系被看见的程度是否提高",
      忌: "比较、承诺落差或资源分配问题是否被反复关注"
    }),
    counterweights: Object.freeze({
      禄: "往来变多也可能增加人情、时间或资源成本，不能据此判定手足数量或关系亲疏。",
      权: "承担分工也可能形成控制冲突或责任不对称，不能据此预定谁主导、谁服从。",
      科: "沟通更充分不等于争议消失或评价一致，也可能只是让分歧更清楚。",
      忌: "比较或分配焦虑不等于关系破裂，需要以具体承诺、资源记录和双方说法核对。"
    }),
    reviewEvidence: "具体往来记录、分工约定与双方说法"
  }),
  Object.freeze({
    palaceRoleId: "spouse",
    focus: "亲密关系、承诺方式与相处边界",
    effects: Object.freeze({
      禄: "情感投入、共同活动与相互照顾的资源是否增加",
      权: "承诺推进、边界协商与关系中的决定责任是否更突出",
      科: "关系表达、公开说明与沟通调停是否更受关注",
      忌: "安全感落差、承诺确认或相处细节是否被反复检视"
    }),
    counterweights: Object.freeze({
      禄: "投入增加也可能提高时间、情绪或生活安排成本，不等于关系自然稳定。",
      权: "主动推进也可能带来控制感或权责冲突，不能据此判断婚期、婚姻结果或伴侣身份。",
      科: "关系被说明或被看见不等于双方感受一致，也不代表承诺已经成立。",
      忌: "对承诺和安全感的牵挂不等于分离或失败，需要回到双方选择与真实互动。"
    }),
    reviewEvidence: "双方现实选择、沟通记录与相处边界"
  }),
  Object.freeze({
    palaceRoleId: "children",
    focus: "亲子、培育、创作及合作输出",
    effects: Object.freeze({
      禄: "培育资源、创作投入与输出机会是否增多",
      权: "引导、管理与完成作品或培育任务的责任是否更突出",
      科: "作品呈现、教学说明与反馈沟通是否更容易被看见",
      忌: "培育进度、创作缺口或照顾责任是否形成持续牵挂"
    }),
    counterweights: Object.freeze({
      禄: "投入和机会增加也可能带来时间、照顾或制作成本，不能换算为生育或作品结果。",
      权: "引导责任增强也可能压缩他人自主或造成完成压力，不能据此预定亲子角色。",
      科: "作品或教学被看见不等于质量裁决、合作成功或评价一致。",
      忌: "对进度和责任的挂心不等于现实失败，也不得据此判断生育能力、子女数量或亲子结果。"
    }),
    reviewEvidence: "现实家庭安排、创作过程、合作约定与反馈记录"
  }),
  Object.freeze({
    palaceRoleId: "wealth",
    focus: "财务态度、资源交换与物质需求",
    effects: Object.freeze({
      禄: "可调度资源、交换机会与配置项目是否增多",
      权: "预算控制、资源分配与财务决定责任是否更突出",
      科: "财务说明、记录透明度与专业信誉是否更受关注",
      忌: "收支落差、价值焦虑或账目核对是否反复占用注意"
    }),
    counterweights: Object.freeze({
      禄: "资源和项目增多也可能同步放大消费、维护或机会成本，不等于收入或收益增加。",
      权: "控制预算也可能带来风险集中或分配冲突，不能据此认定获利能力。",
      科: "记录清楚或信誉可见不等于资产增加、交易成功或资格获批。",
      忌: "对缺口和账目的在意不等于实际贫困或损失，应以真实收支、负债与风险资料核对。"
    }),
    reviewEvidence: "真实收支、资产负债、合同与风险承受资料"
  }),
  Object.freeze({
    palaceRoleId: "health",
    focus: "身体使用、恢复节奏与日常负荷",
    effects: Object.freeze({
      禄: "对作息、恢复与身体照护的关注和投入是否增加",
      权: "管理日程、训练安排与就医决定责任是否更突出",
      科: "身体感受的表达、健康记录与专业沟通是否更受重视",
      忌: "对不适、负荷或恢复不足的感受是否被反复关注"
    }),
    counterweights: Object.freeze({
      禄: "照护投入增加也可能伴随时间、费用或过度安排，不能据此判断身体状态。",
      权: "主动管理不等于控制所有健康结果，也可能因计划过密而增加压力。",
      科: "记录和表达更清楚不等于诊断成立或问题已经解决。",
      忌: "反复在意身体感受不等于病情恶化；本条不诊断、不判断寿命，也不能替代医疗服务。"
    }),
    reviewEvidence: "现实作息、健康记录、就医资料与专业意见"
  }),
  Object.freeze({
    palaceRoleId: "travel",
    focus: "外部环境、陌生场域与公开互动",
    effects: Object.freeze({
      禄: "跨场域接触、外部资源与公开互动机会是否增多",
      权: "在陌生环境中的主动决策、协调与承担是否更突出",
      科: "公开表达、外部评价与被识别的程度是否提高",
      忌: "环境不适配、行程变动或公开反馈是否形成反复牵挂"
    }),
    counterweights: Object.freeze({
      禄: "外部机会增多也可能放大奔波、适应与社交成本，不等于异地顺利。",
      权: "主动协调也可能带来责任集中或与环境规则冲突，不能据此判断外部成败。",
      科: "被看见不等于评价有利、邀请落实或身份获认，也可能只是曝光增加。",
      忌: "对陌生环境的担心不等于行程失败，应以目的、条件和现实支持核对。"
    }),
    reviewEvidence: "实际行程、环境条件、公开反馈与现实支持"
  }),
  Object.freeze({
    palaceRoleId: "friends",
    focus: "社交圈、协作网络与沟通选择",
    effects: Object.freeze({
      禄: "合作接点、社群资源与互动频率是否增多",
      权: "组织协调、分派任务与网络责任是否更突出",
      科: "社群表达、专业形象与沟通调停是否更容易被看见",
      忌: "信任落差、回应缺口或群体边界是否被反复检视"
    }),
    counterweights: Object.freeze({
      禄: "联系和资源增加也可能扩大人情、筛选与维护成本，不能据此判断某人是否可靠。",
      权: "组织责任增强也可能造成控制冲突或角色负荷，不等于自然拥有影响力。",
      科: "形象和表达被看见不等于关系稳固或评价一致，也可能放大误读。",
      忌: "对信任和回应的牵挂不等于背叛，应回到具体互动、约定和证据。"
    }),
    reviewEvidence: "具体互动、协作约定、回应记录与多方说法"
  }),
  Object.freeze({
    palaceRoleId: "career",
    focus: "工作态度、任务结构与责任分工",
    effects: Object.freeze({
      禄: "任务资源、合作渠道与可投入项目是否增多",
      权: "决策、执行、管理与承担交付责任是否更突出",
      科: "成果说明、专业评价与资格呈现是否更受关注",
      忌: "能力落差、任务反馈或责任缺口是否被反复检视"
    }),
    counterweights: Object.freeze({
      禄: "项目和资源增多也可能同步放大工时、协调与交付成本，不等于职位或收入变化。",
      权: "责任集中也可能带来压力、控制冲突或风险集中，不能据此认定升迁。",
      科: "成果可见或资格被讨论不等于评价有利、录用或晋升落实。",
      忌: "对能力和反馈的在意不等于职业失败，可用于核对技能、资源和任务边界。"
    }),
    reviewEvidence: "实际职责、技能记录、绩效反馈与行业环境"
  }),
  Object.freeze({
    palaceRoleId: "property",
    focus: "家庭空间、收藏、安定感与长期积累",
    effects: Object.freeze({
      禄: "空间资源、收藏投入与家庭支持事项是否增多",
      权: "空间安排、产权边界与长期维护责任是否更突出",
      科: "家庭沟通、文书说明与资产信息透明度是否更受关注",
      忌: "安定感落差、维修责任或产权细节是否被反复检视"
    }),
    counterweights: Object.freeze({
      禄: "投入和资源增多也可能扩大维护、占用或家庭协调成本，不等于置业或资产增长。",
      权: "安排和维护责任增强也可能造成边界冲突，不能据此判断产权结果。",
      科: "文书与信息更清楚不等于交易、继承或家庭共识已经成立。",
      忌: "对空间和安定感的牵挂不等于失去资产，应以产权、合同和家庭安排核对。"
    }),
    reviewEvidence: "现实产权、合同、维修记录与家庭安排"
  }),
  Object.freeze({
    palaceRoleId: "wellbeing",
    focus: "内在思考、精神休息与价值感受",
    effects: Object.freeze({
      禄: "休息资源、兴趣投入与内在满足的来源是否增多",
      权: "管理节奏、坚持价值选择与自我要求是否更突出",
      科: "感受表达、观念说明与审美呈现是否更容易被看见",
      忌: "意义落差、未满足感或反复思虑是否占用更多注意"
    }),
    counterweights: Object.freeze({
      禄: "兴趣和休息投入增加也可能变成逃避、消费或时间负担，不能据此判断幸福程度。",
      权: "自我要求和节奏控制增强也可能压缩休息或形成僵持，不等于内在稳定。",
      科: "感受能够被说明不等于被理解或问题解决，也可能停留在分析层面。",
      忌: "未满足感与反复思虑不等于心理诊断，可提示核对生活节奏、支持和本人表达。"
    }),
    reviewEvidence: "本人表达、生活节奏、现实支持与长期体验记录"
  }),
  Object.freeze({
    palaceRoleId: "parents",
    focus: "长辈互动、早期支持及制度文书关系",
    effects: Object.freeze({
      禄: "支持资源、沟通往来与制度协助事项是否增多",
      权: "照顾、协调、文书处理与责任承担是否更突出",
      科: "长辈沟通、资格文书与制度评价是否更受关注",
      忌: "期待落差、支持缺口或文书细节是否被反复检视"
    }),
    counterweights: Object.freeze({
      禄: "支持和往来增多也可能带来责任、人情或制度成本，不能据此判断家庭命运。",
      权: "承担照顾或文书责任也可能造成权责冲突，不能据此预定长辈状态。",
      科: "沟通与文书被看见不等于审批、认可或家庭共识已经成立。",
      忌: "对期待和支持缺口的牵挂不等于长辈受损；不得据此判断父母健康或寿命。"
    }),
    reviewEvidence: "现实家庭资料、制度文书、互动记录与当事人说法"
  })
]);

export const ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT = Object.freeze(
  PALACE_SEEDS.flatMap((seed) => TRANSFORMATION_LABELS.map((transformationLabel) => {
    const genericCandidate = requireNatalTransformationCandidateContent(transformationLabel);
    const palaceRoleContent = requirePalaceRoleCandidateContent(seed.palaceRoleId)
      ?? fail(`四化十二宫候选缺少 ${seed.palaceRoleId} 问题域`);
    return Object.freeze<BrowserProbeNatalTransformationPalaceCandidateContent>({
      contentId:
        `ziwei.content.natal_transformation_all_palaces.${transformationSlug(transformationLabel)}`
        + `.${seed.palaceRoleId}.neutral.v0_1`,
      contentVersion: ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION,
      contentKind: "neutral_natal_transformation_palace_modifier_candidate",
      transformationLabel,
      palaceRoleId: seed.palaceRoleId,
      palaceRoleLabel: palaceRoleContent.palaceRoleLabel,
      genericCandidateContentId: genericCandidate.contentId,
      palaceRoleContentId: palaceRoleContent.contentId,
      positionSummary:
        `生年化${transformationLabel}星曜落${palaceRoleContent.palaceRoleLabel}时，可先观察`
        + `${seed.effects[transformationLabel]}；这里说的是${seed.focus}中的阅读修正，不是结果结论。`,
      counterweight: seed.counterweights[transformationLabel],
      reviewPrompt:
        `请专家核对“生年化${transformationLabel}星曜落${palaceRoleContent.palaceRoleLabel}”`
        + `是否适用于选定流派，并用${seed.reviewEvidence}说明成立条件和反例。`,
      derivationMethod: "editorial_synthesis_of_transformation_theme_and_palace_domain",
      sourceRefs: mergeSourceRefs(genericCandidate.sourceRefs, palaceRoleContent.sourceRefs),
      reviewStatus: "awaiting_expert_review",
      publicationStatus: "isolated_candidate_only",
      expertTruthClaimed: false,
      directOutcomeAllowed: false,
      scoringAllowed: false
    });
  }))
);

const CANDIDATE_BY_KEY = validateAndIndexCandidates();

export function requireNatalTransformationPalaceCandidateContent(
  transformationLabel: string,
  palaceRoleId: string
): BrowserProbeNatalTransformationPalaceCandidateContent {
  const candidate = CANDIDATE_BY_KEY.get(candidateKey(transformationLabel, palaceRoleId));
  if (!candidate) {
    throw new Error(`四化十二宫候选不接受组合：${transformationLabel} × ${palaceRoleId}`);
  }
  return candidate;
}

function mergeSourceRefs(
  transformationSourceRefs: readonly BrowserProbeMajorStarSourceRef[],
  palaceSourceRefs: readonly BrowserProbeMajorStarSourceRef[]
): readonly BrowserProbeMajorStarSourceRef[] {
  return Object.freeze([...transformationSourceRefs, ...palaceSourceRefs].map(
    (sourceRef) => Object.freeze({ ...sourceRef })
  ));
}

function validateAndIndexCandidates(): ReadonlyMap<
  string,
  BrowserProbeNatalTransformationPalaceCandidateContent
> {
  if (PALACE_SEEDS.length !== 12
    || new Set(PALACE_SEEDS.map((seed) => seed.palaceRoleId)).size !== 12
    || PALACE_SEEDS.some((seed, index) => seed.palaceRoleId !== ZIWEI_PALACE_ROLE_IDS[index])) {
    throw new Error("四化十二宫候选的宫位种子必须按固定顺序恰好覆盖十二宫");
  }
  if (ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.length !== 48) {
    throw new Error("四化十二宫候选必须恰有 4 × 12 = 48 条");
  }
  const sourceIds = new Set([
    ...ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES.map((source) => source.sourceId),
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES.map((source) => source.sourceId)
  ]);
  if (sourceIds.size !== 5) throw new Error("四化十二宫候选必须复用恰好五个既有来源");
  const contentIds = new Set<string>();
  const summaries = new Set<string>();
  const byKey = new Map<string, BrowserProbeNatalTransformationPalaceCandidateContent>();
  const riskyOutcomeLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|灾祸/u;

  for (const candidate of ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT) {
    const key = candidateKey(candidate.transformationLabel, candidate.palaceRoleId);
    const genericCandidate = requireNatalTransformationCandidateContent(candidate.transformationLabel);
    const palaceRoleContent = requirePalaceRoleCandidateContent(candidate.palaceRoleId)
      ?? fail(`四化十二宫候选缺少 ${candidate.palaceRoleId} 问题域`);
    if (byKey.has(key) || contentIds.has(candidate.contentId) || summaries.has(candidate.positionSummary)) {
      throw new Error(`四化十二宫候选组合、内容 ID 或位置短解重复：${candidate.contentId}`);
    }
    if (candidate.genericCandidateContentId !== genericCandidate.contentId
      || candidate.palaceRoleContentId !== palaceRoleContent.contentId
      || candidate.palaceRoleLabel !== palaceRoleContent.palaceRoleLabel) {
      throw new Error(`四化十二宫候选 ${candidate.contentId} 的基础内容绑定不一致`);
    }
    if (candidate.sourceRefs.length !== 5
      || new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 5
      || candidate.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)) {
      throw new Error(`四化十二宫候选 ${candidate.contentId} 的五来源绑定不完整`);
    }
    if (riskyOutcomeLanguage.test(
      `${candidate.positionSummary}${candidate.counterweight}${candidate.reviewPrompt}`
    )) {
      throw new Error(`四化十二宫候选 ${candidate.contentId} 含结果化措辞`);
    }
    if (candidate.expertTruthClaimed || candidate.directOutcomeAllowed || candidate.scoringAllowed) {
      throw new Error(`四化十二宫候选 ${candidate.contentId} 越过待审边界`);
    }
    byKey.set(key, candidate);
    contentIds.add(candidate.contentId);
    summaries.add(candidate.positionSummary);
  }
  for (const palaceRoleId of ZIWEI_PALACE_ROLE_IDS) {
    for (const transformationLabel of TRANSFORMATION_LABELS) {
      if (!byKey.has(candidateKey(transformationLabel, palaceRoleId))) {
        throw new Error(`四化十二宫候选缺少 ${transformationLabel} × ${palaceRoleId}`);
      }
    }
  }
  return byKey;
}

function candidateKey(transformationLabel: string, palaceRoleId: string): string {
  return `${transformationLabel}::${palaceRoleId}`;
}

function transformationSlug(label: BrowserProbeNatalTransformationLabel): "lu" | "quan" | "ke" | "ji" {
  return ({ 禄: "lu", 权: "quan", 科: "ke", 忌: "ji" } as const)[label];
}

function fail(message: string): never {
  throw new Error(message);
}
