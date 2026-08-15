export const TEN_GOD_NAMES = [
  "比肩",
  "劫财",
  "食神",
  "伤官",
  "正财",
  "偏财",
  "正官",
  "七杀",
  "正印",
  "偏印"
] as const;

export type TenGodName = (typeof TEN_GOD_NAMES)[number];

export const TEN_GOD_PILLAR_POSITIONS = ["year", "month", "day", "hour"] as const;
export type TenGodPillarPosition = (typeof TEN_GOD_PILLAR_POSITIONS)[number];

export interface TenGodPositionEditorialEntry {
  tenGod: TenGodName;
  position: TenGodPillarPosition;
  focus: string;
  flowing: string;
  strained: string;
  evidenceClass: "original_editorial";
  reviewStatus: "candidate_pending_expert_review";
  sourceRefIds: readonly ["smt-ten-gods", "smt-position", "hakimi-editorial"];
  doesNotEstablish: string;
}

type TenGodPositionDraft = Pick<TenGodPositionEditorialEntry, "focus" | "flowing" | "strained">;

function entry(
  tenGod: TenGodName,
  position: TenGodPillarPosition,
  draft: TenGodPositionDraft
): TenGodPositionEditorialEntry {
  return Object.freeze({
    tenGod,
    position,
    ...draft,
    evidenceClass: "original_editorial" as const,
    reviewStatus: "candidate_pending_expert_review" as const,
    sourceRefIds: ["smt-ten-gods", "smt-position", "hakimi-editorial"] as const,
    doesNotEstablish: "不能单独证明具体事件、关系结果、职业层级或固定吉凶。"
  });
}

const drafts: Record<TenGodName, Record<TenGodPillarPosition, TenGodPositionDraft>> = {
  比肩: {
    year: {
      focus: "早年环境里的自主意识、同辈参照与家族边界",
      flowing: "较早学会独立，也能在同辈关系里平等协作",
      strained: "容易把比较当成自我证明，或对外界意见保持过强防御"
    },
    month: {
      focus: "工作制度中的专业自主、同岗位协作与职责边界",
      flowing: "能守住自己的负责范围，同时与能力相近的人并肩推进",
      strained: "容易出现职责重叠、互不相让或只认可自己的做法"
    },
    day: {
      focus: "日常自我与亲密关系里的独立空间、平等感和分寸",
      flowing: "亲近时仍能保留自我，也愿意用对等方式商量",
      strained: "容易因坚持公平或自主而显得疏离、固执"
    },
    hour: {
      focus: "长期计划中的自驱力、同路伙伴与持续投入方式",
      flowing: "能独立推进长期目标，并建立稳定的同伴网络",
      strained: "容易独自承担过多，或在长期合作中反复发生同质竞争"
    }
  },
  劫财: {
    year: {
      focus: "早年群体中的竞争感、资源分享与快速结盟",
      flowing: "面对变化敢于争取，也能迅速调动同辈支持",
      strained: "容易把资源有限理解成必须抢先，忽略交换成本"
    },
    month: {
      focus: "组织环境中的资源调度、竞争节奏与团队动员",
      flowing: "能在压力场景里快速组队、补位并推动行动",
      strained: "容易越过职责边界，或因短期争取损害长期协作"
    },
    day: {
      focus: "亲密相处中的主动权、共同资源与即时决定",
      flowing: "愿意一起承担风险，也能在需要时果断保护共同利益",
      strained: "容易把关心变成干预，或在金钱、时间、决定权上冲动"
    },
    hour: {
      focus: "长期项目里的创业冲劲、集体行动与资源再分配",
      flowing: "敢于开启新局，并能把分散的人力迅速组织起来",
      strained: "容易频繁换方向、过度扩张或低估合伙边界"
    }
  },
  食神: {
    year: {
      focus: "早年环境中的表达安全感、生活感受与被照料经验",
      flowing: "较容易用温和、具体的方式表达自己并照顾气氛",
      strained: "容易回避紧张议题，或用舒适感代替必要的行动"
    },
    month: {
      focus: "工作中的稳定产出、技艺打磨与服务体验",
      flowing: "能把能力持续做成可交付成果，并顾及使用者感受",
      strained: "容易求全求舒适、节奏偏慢，或产出过多而缺少收束"
    },
    day: {
      focus: "日常相处中的温度、身体感受与自然表达",
      flowing: "愿意分享生活并通过稳定照料建立亲近感",
      strained: "容易把不满藏在迁就里，或以享受回避关系中的难题"
    },
    hour: {
      focus: "长期创作、技能沉淀与可持续的生活安排",
      flowing: "适合用长期主义培养作品、方法或照料型成果",
      strained: "容易兴趣铺得太开，或把持续输出变成无边界消耗"
    }
  },
  伤官: {
    year: {
      focus: "早年环境中的质疑意识、表达锋芒与对既有叙事的反应",
      flowing: "能较早发现不合理之处，并发展出鲜明表达",
      strained: "容易因反驳权威或追求不同而与环境持续对抗"
    },
    month: {
      focus: "制度与工作场景中的改进欲、专业批判和创新表达",
      flowing: "善于识别流程漏洞，提出更有效的新办法",
      strained: "容易让表达锋芒盖过方案本身，直接撞上规则与评价体系"
    },
    day: {
      focus: "亲密关系中的真实表达、挑剔标准与边界谈判",
      flowing: "敢于说出需求，也能帮助彼此修正无效相处模式",
      strained: "容易用批评代替沟通，或把每个分歧升级成原则问题"
    },
    hour: {
      focus: "长期创意、独立观点与对未来规则的重新设计",
      flowing: "适合持续发展原创方法，并把复杂问题说清楚",
      strained: "容易反复推翻已有成果，或因不耐约束而难以完成闭环"
    }
  },
  正财: {
    year: {
      focus: "早年形成的资源观、责任感与稳定交换方式",
      flowing: "较早理解投入、回报和承诺之间的对应关系",
      strained: "容易把安全感过度系在可控资源或外在结果上"
    },
    month: {
      focus: "工作中的预算意识、日常经营与责任兑现",
      flowing: "擅长把资源安排清楚，并通过稳定执行累积信用",
      strained: "容易因过度求稳而错过调整，或把所有任务都当成负担"
    },
    day: {
      focus: "亲密关系中的现实投入、共同生活与承诺落实",
      flowing: "愿意用具体行动维护日常秩序和共同资源",
      strained: "容易用付出衡量感情，或对分工与回报过度计较"
    },
    hour: {
      focus: "长期资产、时间预算与稳步兑现的计划",
      flowing: "能把远期目标拆成可持续的小步积累",
      strained: "容易只守已有路径，或因担心损失而压缩探索空间"
    }
  },
  偏财: {
    year: {
      focus: "外部环境中的机会感、人情往来与流动资源",
      flowing: "容易看见环境窗口，并通过开放连接获得信息",
      strained: "容易被新鲜机会牵引，投入分散或承诺过多"
    },
    month: {
      focus: "工作中的商务连接、多方资源与非标准机会",
      flowing: "能整合不同利益相关者，把零散资源拼成可行方案",
      strained: "容易追逐短期窗口，忽略合同、边界和持续交付"
    },
    day: {
      focus: "日常相处中的开放度、社交资源与弹性安排",
      flowing: "愿意分享机会，也能让关系保有空间和活力",
      strained: "容易让外部应酬挤压亲密时间，或在承诺上显得漂移"
    },
    hour: {
      focus: "长期布局中的机会组合、跨界连接与资源流动",
      flowing: "能持续建立跨圈层网络，并为未来保留多种选项",
      strained: "容易同时下注太多方向，造成注意力和资源失焦"
    }
  },
  正官: {
    year: {
      focus: "早年接触的规范、评价体系与公共形象",
      flowing: "较能理解边界和责任，并在外部场合建立可信感",
      strained: "容易过早服从评价，或把犯错等同于失去认可"
    },
    month: {
      focus: "职业制度中的职责、程序、标准与正式角色",
      flowing: "适合在清晰规则内稳定履责，并逐步建立专业声誉",
      strained: "容易被流程和责任压住，或过度依赖外部授权"
    },
    day: {
      focus: "亲密关系中的承诺、规则感与彼此尊重",
      flowing: "愿意明确责任和界线，用可预期的方式维护关系",
      strained: "容易把相处变成考核，或因怕失序而压抑真实需求"
    },
    hour: {
      focus: "长期目标中的秩序建设、公共责任与稳定路径",
      flowing: "能为远期目标建立制度，并持续维护可信的成果",
      strained: "容易把未来规划写得过死，或因责任过重缺少弹性"
    }
  },
  七杀: {
    year: {
      focus: "早年环境中的压力感、竞争信号与危机反应",
      flowing: "在边界清楚时能迅速判断风险，发展出行动果断的一面",
      strained: "容易长期保持戒备，或把外界差异都理解成威胁"
    },
    month: {
      focus: "工作环境中的高压任务、竞争约束与决断要求",
      flowing: "适合在明确授权和规则下处理急难、复杂或高强度问题",
      strained: "容易用强硬替代分析，或让持续压力侵蚀协作质量"
    },
    day: {
      focus: "亲密相处中的安全感、冲突处理与控制边界",
      flowing: "面对关键问题不回避，也能在风险出现时保护关系",
      strained: "容易因焦虑而控制、逼迫或把分歧处理成输赢"
    },
    hour: {
      focus: "长期目标中的攻坚能力、风险管理与决策纪律",
      flowing: "能把压力转成有节奏的训练，持续完成高难度目标",
      strained: "容易长期处于战斗模式，忽略恢复、复盘和替代方案"
    }
  },
  正印: {
    year: {
      focus: "早年获得的照顾、知识框架与安全底座",
      flowing: "较能从稳定支持中建立学习习惯和基本信任",
      strained: "容易依赖熟悉体系，或把被保护当成无需行动"
    },
    month: {
      focus: "工作中的学习体系、凭据、支持资源与方法沉淀",
      flowing: "善于吸收成熟知识，并把经验整理成稳定方法",
      strained: "容易准备过度、行动偏慢，或只认可有权威背书的方案"
    },
    day: {
      focus: "日常相处中的理解、包容与被支持的需要",
      flowing: "愿意倾听并提供稳定支持，也能接受他人的帮助",
      strained: "容易用照顾回避边界问题，或形成单向依赖"
    },
    hour: {
      focus: "长期学习、知识传承与支持系统建设",
      flowing: "适合积累体系化知识，并把经验转成可复用的基础设施",
      strained: "容易持续收藏而不输出，或让长期计划停留在准备阶段"
    }
  },
  偏印: {
    year: {
      focus: "早年形成的非标准观察、敏感度与独立理解路径",
      flowing: "能从少见角度理解环境，不轻易被单一叙事限制",
      strained: "容易对环境保持疏离，或因想法跳跃难以被理解"
    },
    month: {
      focus: "工作中的抽象洞察、跨域学习与非标准方法",
      flowing: "适合处理模糊问题，发展冷门但有穿透力的专长",
      strained: "容易跳过共同语言、频繁换框架，或与现实交付脱节"
    },
    day: {
      focus: "亲密相处中的精神空间、敏感反应与独特需要",
      flowing: "能理解细微差异，也尊重彼此不被标准化的部分",
      strained: "容易退回自己的解释体系，造成猜测、冷却或沟通断层"
    },
    hour: {
      focus: "长期研究、独立创作与小众方向的持续探索",
      flowing: "能沿少有人走的路径累积原创洞察和专门能力",
      strained: "容易长期封闭打磨、缺少验证，或反复偏离可完成目标"
    }
  }
};

export const TEN_GOD_POSITION_EDITORIAL = Object.freeze(
  TEN_GOD_NAMES.flatMap((tenGod) =>
    TEN_GOD_PILLAR_POSITIONS.map((position) => entry(tenGod, position, drafts[tenGod][position]))
  )
);

const entryIndex = new Map(
  TEN_GOD_POSITION_EDITORIAL.map((item) => [`${item.tenGod}:${item.position}`, item] as const)
);

export function isTenGodName(value: string): value is TenGodName {
  return (TEN_GOD_NAMES as readonly string[]).includes(value);
}

export function getTenGodPositionEditorial(
  tenGod: string,
  position: TenGodPillarPosition
): TenGodPositionEditorialEntry | null {
  if (!isTenGodName(tenGod)) return null;
  return entryIndex.get(`${tenGod}:${position}`) ?? null;
}
