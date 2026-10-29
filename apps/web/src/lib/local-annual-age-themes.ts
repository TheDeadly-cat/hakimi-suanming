import type { LocalReadingAgeContext } from "./local-reading-age-context";

const CHILD_TOPICS: Record<string, string> = {
  正官: "日常规则与习惯建立", 七杀: "新要求与适应节奏", 正印: "照料支持与安全感", 偏印: "探索方式与个别支持",
  食神: "游戏表达与动手体验", 伤官: "表达意愿与尝试新方法", 正财: "日常用品与活动安排", 偏财: "活动选择与照料资源",
  比肩: "自主尝试与同伴接触", 劫财: "共同活动与轮流分享"
};
const YOUTH_TOPICS: Record<string, string> = {
  正官: "学习规则与任务落实", 七杀: "任务难度与压力应对", 正印: "系统学习与师长支持", 偏印: "兴趣探索与学习方法",
  食神: "技能练习与作品表达", 伤官: "表达想法与方法调整", 正财: "学习用品与时间安排", 偏财: "学习活动与家庭支持",
  比肩: "自主学习与同伴协作", 劫财: "集体分工与共享边界"
};
const NEUTRAL_TOPICS: Record<string, string> = {
  正官: "责任约定与规则执行", 七杀: "任务要求与应对方式", 正印: "学习积累与支持条件", 偏印: "专长探索与方法选择",
  食神: "实际表达与持续练习", 伤官: "提出想法与调整方法", 正财: "时间安排与日常资源", 偏财: "机会选择与可用支持",
  比肩: "自主安排与同伴协作", 劫财: "共同分工与资源边界"
};

/** Modern topic wording only: age changes the applicable life setting, not the judgment. */
export function annualAgeTopic(tenGod: string, age: LocalReadingAgeContext, adultTopic: string): string {
  const god = tenGod.replaceAll("殺", "杀").replaceAll("傷", "伤").replaceAll("財", "财").replace("偏官", "七杀");
  if (age.stage === "adult") return adultTopic;
  const topics = age.stage === "young_child" ? CHILD_TOPICS : age.stage === "youth" ? YOUTH_TOPICS : NEUTRAL_TOPICS;
  return topics[god] ?? "日常任务与共同安排";
}

export function annualAgeSetting(age: LocalReadingAgeContext) {
  switch (age.stage) {
    case "young_child": return { careerTitle: "照料与探索", relationshipTitle: "照料关系与同伴接触", arrangement: "照料节奏、游戏探索与日常支持", relationship: "照料者之间的安排、孩子的表达方式与共同活动" };
    case "youth": return { careerTitle: "学习与成长", relationshipTitle: "亲子与同伴相处", arrangement: "学习练习、兴趣活动与可用支持", relationship: "亲子约定、同伴分工与表达需要" };
    case "adult_transition": return { careerTitle: "学习与自主安排", relationshipTitle: "关系与自主边界", arrangement: "前段的学习和同伴生活，以及后段逐步自主的学习、实践与责任安排", relationship: "同伴协作、家庭约定与逐步自主的个人边界" };
    case "adult": return { careerTitle: "事业与事务", relationshipTitle: "关系与协作", arrangement: "事业事务与资源投入", relationship: "关系约定、合作边界与沟通节奏" };
    default: return { careerTitle: "任务与日常安排", relationshipTitle: "相处与共同安排", arrangement: "实际任务、日常支持和共同安排", relationship: "沟通方式、共同事项与个人边界" };
  }
}
