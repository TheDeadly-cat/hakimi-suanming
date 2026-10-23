import type { NatalRelationshipInteraction } from "./natal-relationship-foundation";

interface RoleTheme {
  title: string; action: string; strength: string; caution: string; suggestion: string;
  support: string; duty: string; scene: string;
}

/** Contemporary, conditional illustrations of the selected natal role.
 * These are not translations of classical predictions or facts about relatives. */
const ROLES: Record<string, RoleTheme> = {
  比肩: { title: "自主决定与平等商量", action: "各自决定的空间与共同约定的边界",
    strength: "各自能独立完成的部分分开之后，合作不必以一方包办为前提",
    caution: "双方都已有自己的做法时，小决定也可能变成谁先让步的问题",
    suggestion: "把个人可以决定的事项和必须一起确认的事项分开",
    support: "保留自己动手与作决定的空间", duty: "各自负责一部分，再对接共同安排",
    scene: "若已有伴侣，一方想自己完成一件事，另一方需要的是及时知道进度，而不一定是接手代办。" },
  劫财: { title: "共同参与与份额协调", action: "多人参与时的调用权限、分工与共同承担",
    strength: "共同参与能带来不同做法；分清各自投入后，帮助才有具体落点",
    caution: "参与的人或意见增加后，原本属于谁的时间和物品容易被默认共用",
    suggestion: "共同使用之前，确认谁能调用、谁继续承担以及追加如何同意",
    support: "可共同调用的时间、物品与参与力量", duty: "共享条件、费用分摊与临时补位",
    scene: "若已有共同生活安排，家人或朋友加入一次活动后，原有分工和费用分摊需要随参与范围重新说清。" },
  食神: { title: "温和表达与熟悉的相处节奏", action: "日常回应、共同小事与稳定重复的相处方式",
    strength: "熟悉的小事与持续回应，能让关心有可感受到的形式",
    caution: "习惯已经形成时，可能以为做过的小事足以表达需要，重要期待却仍没有说出来",
    suggestion: "保留顺手的相处习惯，也把重要期待直接说明",
    support: "熟悉办法、日常照应与可以反复使用的经验", duty: "稳定完成小事、维持交流和生活节奏",
    scene: "若已有伴侣，一起做饭、散步或完成小事可以维持联系；遇到真正重要的需要，仅靠照旧相处仍可能不够明确。" },
  伤官: { title: "直接表达与不同做法的磨合", action: "个人见解、改进意见与对方实际接受方式的衔接",
    strength: "愿意把不合适的地方说出来，能够让问题从猜测变成可以讨论的具体内容",
    caution: "指出问题的速度快于理解对方时，原本想改善一件事，听起来可能成了否定整个人",
    suggestion: "把具体不满意与希望调整的做法放在同一件事上谈",
    support: "独立见解、解决问题的尝试与改进办法", duty: "把不同意见说清，并承担改法带来的实际调整",
    scene: "若已有伴侣，对家务或共同计划提出一个新办法时，效果与对方的感受需要分别回应，讲得有道理并不等于已经达成一致。" },
  正财: { title: "稳定投入与原约定的兑现", action: "固定时间、共同开销和已经答应的责任",
    strength: "持续、可见的行动能让承诺落在具体生活里，减少只听到答应却等不到回应的落差",
    caution: "把按时做完、花费多少当成唯一的关心方式，容易忽略对方需要的理解和陪伴",
    suggestion: "将固定承担与情感回应分开说清，不用一种投入代替全部需要",
    support: "可以持续依靠的实际投入与明确约定", duty: "固定开销、规律照应与答应后的持续履行",
    scene: "若与家人或伴侣共同生活，固定费用和照料轮换已有约定时，一次临时变化也涉及原责任由谁接续。" },
  偏财: { title: "灵活投入与临时参与的取舍", action: "临时援手、额外参与与原有投入之间的分配",
    strength: "临时帮助和不同资源可以带来调整空间，适合处理原计划没有覆盖的需要",
    caution: "愿意临时多承担，不等于每次都能持续；外部邀请与已有承诺可能争用同一段时间",
    suggestion: "分清一次性帮忙与长期责任，留下原有约定所需的时间",
    support: "临时援手、灵活调度与不同渠道的实际帮助", duty: "额外参与、临时支出和原安排之间的取舍",
    scene: "若已有伴侣或共同家庭安排，一次临时帮忙、聚会或额外支出可能占到原先留给两个人的时间，热心参与与持续承担要分开。" },
  正印: { title: "理解支持与耐心回应", action: "解释背景、接受帮助与保留自己尝试的空间",
    strength: "讲清来由并耐心回应，能让对方理解一件事为什么重要",
    caution: "解释与准备持续增加时，真正需要亲自决定或尝试的部分可能被代办挤掉",
    suggestion: "明确当前需要倾听、示范还是自己处理，再决定怎样提供帮助",
    support: "持续讲解、经验传递与能够接续的照应", duty: "把需要讲清、回应支持并逐渐自己完成",
    scene: "若与长辈共同生活，经验和提醒可以帮助理解一件事；若已经有自己的办法，反复代办与实际需要的帮助也可能不一致。" },
  偏印: { title: "不同理解与专项帮助的配合", action: "独特理解、针对性办法与双方接受节奏的衔接",
    strength: "换一个角度解释或提供专项办法，可以补上原先沟通没有触及的地方",
    caution: "自己已经想明白却省略中间过程时，对方可能只看到决定改变，接不上理由",
    suggestion: "说明新办法解决哪一个具体问题，并保留对方熟悉且仍有效的部分",
    support: "针对性帮助、不同经验与替代办法", duty: "把自己的理解说明白，在新旧做法之间留出衔接",
    scene: "若有共同照料或长期生活安排，一种针对性的办法能补原方法的缺口；改变做法时若没有交代原因，参与者也可能各按各的理解继续。" },
  正官: { title: "清楚约定与稳定责任", action: "责任边界、共同标准与可持续履行的承诺",
    strength: "把承诺的内容和边界说明白，可以形成双方都能依赖的日常节奏",
    caution: "约定只剩检查和催促时，一方认为自己在负责，另一方可能感到缺少商量空间",
    suggestion: "明确责任的同时说明可调整的条件，给变化留下协商位置",
    support: "明确规则、可预期的安排与有边界的责任", duty: "按约履行、必要确认与持续负责",
    scene: "若已有伴侣，共同费用或家务约定越明确，越容易看见各自承担；出现变化时，原标准和现实余量仍需要一起调整。" },
  七杀: { title: "集中要求与相互支援", action: "几项要求相遇时的处理先后与实际可承担范围",
    strength: "事情集中时，熟悉的分工和及时补位能让支持落在最需要的一步",
    caution: "几件事都要求及时回应时，愿意负责与确实有时间承担容易出现距离",
    suggestion: "把必须立即回应和可以延后的事项分开，同时说明需要谁补位",
    support: "处理难点时的支援与集中承担", duty: "相近要求的先后、临时补位与承担上限",
    scene: "若已有照料任务，家中几项需要碰到一起时，最具体的分歧往往是先照顾哪一项、谁能接手，而不是谁更重视家人。" }
};
export function natalRelationshipRole(tenGod: string): RoleTheme {
  const role = ROLES[tenGod];
  if (!role) throw new Error("本命关系文字缺少已识别的十神角色。");
  return role;
}

export function natalFamilyHeadline(yearGod: string, monthGod: string): string {
  const names: Record<string, [string, string]> = {
    比肩: ["自主空间", "各自负责"], 劫财: ["共同调用", "共享分担"], 食神: ["熟悉照应", "稳定回应"], 伤官: ["解决办法", "表达调整"],
    正财: ["固定支持", "持续履约"], 偏财: ["灵活援手", "弹性参与"], 正印: ["耐心支持", "理解回应"], 偏印: ["专项帮助", "方法衔接"],
    正官: ["明确规则", "按约负责"], 七杀: ["难点支援", "集中承担"]
  };
  return `${names[yearGod]![0]}与${names[monthGod]![1]}分开落实`;
}

/** Uses the original binary participants only. No branch/root is removed and
 * a stem contact is never rendered as a household or partner event. */
export function relationshipInteractionLife(item: NatalRelationshipInteraction, domain: "relationship" | "family"): string {
  const positions = new Set(item.fact.participants.map(part => part.position));
  const branch = item.fact.participants.every(part => part.component === "branch");
  const clash = item.fact.relationType === "branch_six_clash" || item.fact.relationType === "stem_clash";
  const place = positions.has("day") ? positions.has("year") ? "个人相处与家庭原有安排" : positions.has("month") ? "亲近相处与日常分工" : "眼前相处与共同计划"
    : positions.has("year") && positions.has("month") ? "家庭支持与日常责任" : "已有支持与其他共同安排";
  if (!branch) return `${item.text}。这里更贴近${place}中的说法、承诺与决定${clash ? "不一致" : "彼此牵连"}。若已有共同事项，${clash ? "双方对已经答应的内容理解不同，一件事的分歧需要留在具体事项上处理" : "一项答应连着另一项承担，接受帮助与保留自己决定的空间可能需要同时说明"}。`;
  const condition = domain === "family" ? "若与家人共同生活或已有照料任务" : "若已有伴侣或长期共同生活安排";
  return `${item.text}。${place}${clash ? "有节奏不一致的一面" : "有相互连结的一面"}。${condition}，${clash ? "临时改期、家务轮换或原有习惯不同，可能让两边都认为自己的安排应被优先照顾" : "共同计划会把时间、使用空间与实际分工连在一起，愿意参与和能持续承担需要各自有落点"}。`;
}
