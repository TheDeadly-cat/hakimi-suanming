export const SHENSHA_POSITION_CONTENT_VERSION = "hakimi.shensha.position_editorial/0.1.0" as const;

export const SHENSHA_EDITORIAL_RULE_IDS = [
  "jiangxing",
  "huagai",
  "xianchi",
  "yima",
  "tianyi-guiren"
] as const;
export type ShenshaEditorialRuleId = (typeof SHENSHA_EDITORIAL_RULE_IDS)[number];

export const SHENSHA_EDITORIAL_POSITIONS = ["year", "month", "day", "hour"] as const;
export type ShenshaEditorialPosition = (typeof SHENSHA_EDITORIAL_POSITIONS)[number];

export type ShenshaEditorialName = "将星" | "华盖" | "咸池（桃花）" | "驿马" | "天乙贵人";

export interface ShenshaPositionEditorialEntry {
  contentId: string;
  contentVersion: typeof SHENSHA_POSITION_CONTENT_VERSION;
  ruleId: ShenshaEditorialRuleId;
  name: ShenshaEditorialName;
  position: ShenshaEditorialPosition;
  positionLabel: "年柱" | "月柱" | "日柱" | "时柱";
  directSummary: string;
  constructiveExpression: string;
  tensionToReview: string;
  reviewPrompt: string;
  evidenceClass: "original_editorial";
  reviewStatus: "candidate_pending_expert_review";
  sourceRefIds: readonly string[];
  result: null;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

type EntryDraft = Pick<
  ShenshaPositionEditorialEntry,
  "directSummary" | "constructiveExpression" | "tensionToReview" | "reviewPrompt"
>;

const NAMES: Readonly<Record<ShenshaEditorialRuleId, ShenshaEditorialName>> = Object.freeze({
  jiangxing: "将星",
  huagai: "华盖",
  xianchi: "咸池（桃花）",
  yima: "驿马",
  "tianyi-guiren": "天乙贵人"
});

const POSITION_LABELS = Object.freeze({
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱"
} as const satisfies Record<ShenshaEditorialPosition, ShenshaPositionEditorialEntry["positionLabel"]>);

const CLASSICAL_SOURCE_BY_RULE: Readonly<Record<ShenshaEditorialRuleId, string>> = Object.freeze({
  jiangxing: "smt-shensha-volume-2",
  huagai: "smt-shensha-volume-2",
  xianchi: "smt-shensha-volume-2",
  yima: "smt-shensha-volume-3",
  "tianyi-guiren": "smt-shensha-volume-3"
});

function entry(
  ruleId: ShenshaEditorialRuleId,
  position: ShenshaEditorialPosition,
  draft: EntryDraft
): ShenshaPositionEditorialEntry {
  return Object.freeze({
    contentId: `hakimi.shensha.position.${ruleId}.${position}.candidate.v0_1`,
    contentVersion: SHENSHA_POSITION_CONTENT_VERSION,
    ruleId,
    name: NAMES[ruleId],
    position,
    positionLabel: POSITION_LABELS[position],
    ...draft,
    evidenceClass: "original_editorial" as const,
    reviewStatus: "candidate_pending_expert_review" as const,
    sourceRefIds: Object.freeze([
      CLASSICAL_SOURCE_BY_RULE[ruleId],
      "hakimi-shensha-position-editorial-v0.5"
    ]),
    result: null,
    expertTruthClaimed: false as const,
    directOutcomeAllowed: false as const,
    scoringAllowed: false as const,
    doesNotEstablish: "不能单独证明贵人、桃花、迁移、婚恋、职业、疾病、灾祸、财富或固定吉凶。"
  });
}

const drafts: Record<ShenshaEditorialRuleId, Record<ShenshaEditorialPosition, EntryDraft>> = {
  jiangxing: {
    year: {
      directSummary: "将星落年柱，组织位置、责任期待与在群体中承担主心骨的议题，会先从早年环境和外部形象进入视野。",
      constructiveExpression: "能较早学习协调同辈、明确分工，并在需要时承担公共责任。",
      tensionToReview: "需要检查是否把被看见等同于必须掌控，或长期替群体承担过量责任。",
      reviewPrompt: "须合参旺衰、官杀印比、同柱组合与现实家庭经验；本条不等于天生领导者。"
    },
    month: {
      directSummary: "将星落月柱，组织制度、工作分工、决策责任和资源调度，是这项命中的主要位置议题。",
      constructiveExpression: "在职责清楚时，能把分散任务排成次序，并推动团队形成共同节奏。",
      tensionToReview: "需要检查是否过度集中决定权、难以授权，或把职位感看得重于实际协作。",
      reviewPrompt: "须合参月令、官杀印比、职业环境与实际授权；本条不保证职位、权力或升迁。"
    },
    day: {
      directSummary: "将星落日柱，日常决定、亲密相处中的责任分配与彼此主导空间，是优先观察的关系议题。",
      constructiveExpression: "能在关键事情上作出决定，也愿意把责任、边界和协商程序说清楚。",
      tensionToReview: "需要检查是否把照顾变成管理，或把亲密关系处理成单向服从。",
      reviewPrompt: "须合参日支十神、全局强弱与双方现实互动；本条不预测伴侣身份或婚姻结果。"
    },
    hour: {
      directSummary: "将星落时柱，长期项目、产出方向和未来团队中的组织角色，是这项命中的主要观察入口。",
      constructiveExpression: "能为远期目标建立角色、节奏和交付责任，让多人协作持续运转。",
      tensionToReview: "需要检查是否把长期计划做成僵硬层级，或因凡事居中而难以退出和复盘。",
      reviewPrompt: "须合参时柱可靠性、全局十神与现实计划；本条不保证晚年地位、子女成就或事业结果。"
    }
  },
  huagai: {
    year: {
      directSummary: "华盖落年柱，早年环境中的独处经验、审美取向、专门兴趣与不同于群体的观察方式，会更值得留意。",
      constructiveExpression: "能从安静空间发展独立品味、专注力或较早形成的专门兴趣。",
      tensionToReview: "需要检查是否因不被理解而过早退回自己的世界，减少必要的求助和交流。",
      reviewPrompt: "须合参印星、食伤、同柱组合与真实成长经验；本条不证明孤独命、宗教身份或艺术天赋。"
    },
    month: {
      directSummary: "华盖落月柱，专业深度、独立研究、工艺标准和在制度中保留专门空间，是主要位置议题。",
      constructiveExpression: "能在相对安静的条件下长期打磨方法、作品或少数人掌握的技能。",
      tensionToReview: "需要检查是否用完美标准隔离协作，或长期闭门而缺少外部验证。",
      reviewPrompt: "须合参月令、印食结构、工作要求与成果反馈；本条不直接指定职业或学术成就。"
    },
    day: {
      directSummary: "华盖落日柱，亲密关系里的精神空间、审美默契、独处需求和表达节奏，是优先观察的相处议题。",
      constructiveExpression: "能在亲近中保留各自空间，也愿意通过作品、兴趣或深入谈话建立连接。",
      tensionToReview: "需要检查是否把需要空间变成长期冷却，或用个人标准替代双向沟通。",
      reviewPrompt: "须合参日支十神、同柱组合与实际沟通；本条不证明孤婚、离异或感情淡薄。"
    },
    hour: {
      directSummary: "华盖落时柱，长期研究、创作、技艺沉淀和内在秩序，会成为未来计划的重要观察方向。",
      constructiveExpression: "能沿一个专门主题持续累积，在时间中形成独到方法或稳定作品。",
      tensionToReview: "需要检查是否长期封闭打磨、拒绝反馈，或把小众路径变成与现实脱节。",
      reviewPrompt: "须合参时柱可靠性、印食组合、现实产出与外部反馈；本条不保证才华、名声或晚年状态。"
    }
  },
  xianchi: {
    year: {
      directSummary: "咸池落年柱，早年环境和外部形象中的可见度、社交反馈、审美与吸引力议题，会更早进入个人经验。",
      constructiveExpression: "能较快感知群体气氛，用得体呈现和友好互动建立连接。",
      tensionToReview: "需要检查是否过度依赖他人注视，或让外部评价替代自己的边界和判断。",
      reviewPrompt: "须合参旺衰、食伤财星、同柱组合与真实社交经验；本条不作道德判断，也不证明桃花多寡。"
    },
    month: {
      directSummary: "咸池落月柱，工作与制度场景中的表达吸引力、人际可见度、审美呈现和边界管理，是主要位置议题。",
      constructiveExpression: "能在公开场合建立亲和感，把表达、形象或体验转成有效沟通。",
      tensionToReview: "需要检查是否让应酬、注意力竞争或关系暧昧干扰职责与专业边界。",
      reviewPrompt: "须合参月令、食伤财官、行业规范与实际行为；本条不保证人缘、客户或职业结果。"
    },
    day: {
      directSummary: "咸池落日柱，亲密相处中的吸引、身体感受、情感表达与同意边界，是必须说清楚的位置议题。",
      constructiveExpression: "能表达欣赏和需要，并在双方同意、尊重和清楚边界下建立亲近感。",
      tensionToReview: "需要检查是否用被需要证明自我价值，或让期待、暧昧和现实承诺彼此混淆。",
      reviewPrompt: "须合参日支十神、全局组合与双方现实选择；本条不预测婚恋次数、忠诚度、怀孕或性行为。"
    },
    hour: {
      directSummary: "咸池落时柱，长期创作与公开表达中的受众连接、审美传播和持续可见度，是主要观察方向。",
      constructiveExpression: "能理解受众感受，让作品、服务或长期社交网络保持温度和吸引力。",
      tensionToReview: "需要检查是否不断追逐新鲜反馈，造成方向漂移、曝光过度或私人边界变薄。",
      reviewPrompt: "须合参时柱可靠性、食伤财星、现实作品与平台环境；本条不保证名气、关系或晚年生活。"
    }
  },
  yima: {
    year: {
      directSummary: "驿马落年柱，早年环境中的移动、地域变化、跨圈接触与适应外部世界，是优先观察的经历议题。",
      constructiveExpression: "能较早学习在不同环境中辨认规则、建立路径并保持基本适应力。",
      tensionToReview: "需要检查是否把变化当成唯一出路，或长期缺少可恢复、可停靠的基础。",
      reviewPrompt: "须合参旺衰、冲合、同柱组合与真实迁动经历；本条不预测搬家、出国或离乡成败。"
    },
    month: {
      directSummary: "驿马落月柱，工作环境中的岗位变化、跨部门协作、出行与外部资源连接，是主要位置议题。",
      constructiveExpression: "能在任务变化时迅速切换场景，把异地、跨域或流动信息接入工作。",
      tensionToReview: "需要检查是否频繁换向却缺少交接，或用忙碌移动掩盖制度和能力问题。",
      reviewPrompt: "须合参月令、冲合、职业条件与现实行动；本条不保证调动、升迁、旅行收益或职业类型。"
    },
    day: {
      directSummary: "驿马落日柱，日常节奏、居住安排和亲密关系中对变化、空间与共同路线的需要，是主要相处议题。",
      constructiveExpression: "能和重要他人讨论变化，给彼此活动空间，并共同调整生活路线。",
      tensionToReview: "需要检查是否用离开或持续变化回避冲突，造成承诺、居所或节奏反复失稳。",
      reviewPrompt: "须合参日支十神、冲合与实际关系安排；本条不预测异地恋、分离、婚变或居住结果。"
    },
    hour: {
      directSummary: "驿马落时柱，长期学习、远期项目、跨地域发展和阶段性转场，是未来计划的重要观察方向。",
      constructiveExpression: "能把远期扩展拆成阶段路线，在变化中保留复盘、资源和下一站准备。",
      tensionToReview: "需要检查是否长期处于转场状态，频繁重启却没有完成积累。",
      reviewPrompt: "须合参时柱可靠性、冲合、运限与现实资源；本条不保证晚年迁居、海外发展或项目成功。"
    }
  },
  "tianyi-guiren": {
    year: {
      directSummary: "天乙贵人落年柱，早年环境中的支持者、长辈资源、求助经验与社会连接，是优先观察的支持议题。",
      constructiveExpression: "能识别可用帮助、尊重专业支持，也愿意在得到资源后建立自己的能力。",
      tensionToReview: "需要检查是否把认可或照顾当成理所当然，或过度依赖权威替自己作决定。",
      reviewPrompt: "须合参旺衰、印官、同柱组合与真实支持经历；本条不保证出身、贵人出现或逢凶化吉。"
    },
    month: {
      directSummary: "天乙贵人落月柱，工作与制度中的导师、专业协助、程序资源和求助路径，是主要位置议题。",
      constructiveExpression: "能在复杂任务中找到合适专家和制度入口，并把帮助转化成可复用方法。",
      tensionToReview: "需要检查是否等待他人兜底，或因人情依赖而忽略程序、公平和自身责任。",
      reviewPrompt: "须合参月令、印官、组织现实与实际协作；本条不保证提拔、录取、升迁或问题自动化解。"
    },
    day: {
      directSummary: "天乙贵人落日柱，日常与亲密关系中的互助、协商、资源共享和接受支持，是主要相处议题。",
      constructiveExpression: "能在需要时提出清楚请求，也愿意以对等方式回应他人的帮助。",
      tensionToReview: "需要检查是否把关系期待成救援系统，或用帮助交换控制、亏欠和服从。",
      reviewPrompt: "须合参日支十神、全局组合与双方现实行动；本条不证明伴侣条件、婚姻幸福或有人兜底。"
    },
    hour: {
      directSummary: "天乙贵人落时柱，长期计划中的支持网络、专业协作、传承与帮助他人，是未来方向的重要观察点。",
      constructiveExpression: "能逐步建立互助网络，把个人经验整理成可供他人使用的支持系统。",
      tensionToReview: "需要检查是否过度承担救援角色，或让长期计划依赖少数关键关系。",
      reviewPrompt: "须合参时柱可靠性、印官组合与现实网络；本条不保证晚年福气、子女回报或长期资源。"
    }
  }
};

export const SHENSHA_POSITION_EDITORIAL = Object.freeze(
  SHENSHA_EDITORIAL_RULE_IDS.flatMap((ruleId) =>
    SHENSHA_EDITORIAL_POSITIONS.map((position) => entry(ruleId, position, drafts[ruleId][position]))
  )
);

function validateAndIndex(): ReadonlyMap<string, ShenshaPositionEditorialEntry> {
  const expectedCount = SHENSHA_EDITORIAL_RULE_IDS.length * SHENSHA_EDITORIAL_POSITIONS.length;
  if (SHENSHA_POSITION_EDITORIAL.length !== expectedCount) {
    throw new Error(`神煞位置议题候选必须恰有 ${expectedCount} 条`);
  }
  const byKey = new Map<string, ShenshaPositionEditorialEntry>();
  const contentIds = new Set<string>();
  const riskyLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|死亡|犯法/u;
  for (const candidate of SHENSHA_POSITION_EDITORIAL) {
    const key = `${candidate.ruleId}:${candidate.position}`;
    if (byKey.has(key)) throw new Error(`神煞位置议题候选键重复：${key}`);
    if (contentIds.has(candidate.contentId)) throw new Error(`神煞位置议题候选 ID 重复：${candidate.contentId}`);
    if (candidate.sourceRefIds.length !== 2) throw new Error(`神煞位置议题候选 ${key} 来源不完整`);
    if (riskyLanguage.test([
      candidate.directSummary,
      candidate.constructiveExpression,
      candidate.tensionToReview
    ].join(" "))) {
      throw new Error(`神煞位置议题候选 ${key} 含绝对化、结果化或高风险断语`);
    }
    if (candidate.result !== null || candidate.expertTruthClaimed
      || candidate.directOutcomeAllowed || candidate.scoringAllowed) {
      throw new Error(`神煞位置议题候选 ${key} 越过待审内容边界`);
    }
    byKey.set(key, candidate);
    contentIds.add(candidate.contentId);
  }
  return byKey;
}

const POSITION_EDITORIAL_BY_KEY = validateAndIndex();

export function requireShenshaPositionEditorial(
  ruleId: ShenshaEditorialRuleId,
  position: ShenshaEditorialPosition
): ShenshaPositionEditorialEntry {
  const candidate = POSITION_EDITORIAL_BY_KEY.get(`${ruleId}:${position}`);
  if (!candidate) throw new Error(`神煞位置议题候选缺少 ${ruleId} × ${position}`);
  return candidate;
}
