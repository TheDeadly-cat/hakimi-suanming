import { OUTLOOK_NATAL_TASK_LINKS_VERSION, type OutlookNatalTaskLinks } from "./outlook-natal-task-links";
import type { OutlookEffect, OutlookStemAction } from "./local-outlook-judgment";
import type { LocalReadingAgeStage } from "./local-reading-age-context";

export const OUTLOOK_TASK_LINK_PROSE_VERSION = "hakimi.outlook-task-link-prose/0.1.0" as const;
type Action = Pick<OutlookStemAction, "visibility" | "stem" | "tenGod" | "effect">;
export interface NatalTransitTaskProseInput {
  links?: OutlookNatalTaskLinks; effect: OutlookEffect; actions: readonly Action[];
  kind?: string; ageStage: LocalReadingAgeStage; domain?: "career" | "wealth"; horizon: "year" | "month" | "decade";
}
type Topic = { title: string; summary: string; example: string };
function currentTopic(input: NatalTransitTaskProseInput, child: boolean): Topic {
  const actor = input.actions.find(action => action.visibility === "visible");
  const money = input.domain === "wealth";
  const kind = input.kind ?? ({ 正印: "study", 偏印: "study", 伤官: "proposal", 食神: "delivery", 正财: "settlement", 偏财: "new_collaboration" } as Record<string,string>)[actor?.tenGod ?? ""] ?? "work_change";
  const topics: Record<string, [string,string,string,string,string,string]> = {
    study: ["理解指导，接回实际完成", "学习准备与已有用品的取舍", "要处理的是新说明、指导和实际练习怎样接起来", "要处理的是资料、用品与准备时间怎样用到真正卡住的一步", "若有正在学习的做法：听过解释后自己做一小段，分清缺的是理解还是实际练习。", "若已有资料或用品：核对哪些正在使用，哪些准备占去了实际练习的时间。"],
    proposal: ["改法进入试用，具体效果逐步显现", "改法试用的投入与已有条件", "要处理的是让改法进入小范围试用，从具体回应中比较哪里更合用", "要处理的是试做所用的时间、材料，以及试过以后是否继续投入", "若已有一个改法：用熟悉的办法做一小段试样，比较它有没有真正处理原来的难点。", "若准备试一种改法：利用手边材料先做一版，再核对追加用品是否真的有用。"],
    delivery: ["熟悉方法继续发挥，持续完成仍需配合", "持续使用的消耗与维护", "要处理的是把已经会用的方法稳定做完，让做成一次接到持续完成", "要处理的是反复使用所需的时间、用品和后续维护", "若已有练熟的步骤：完整做完一轮，再看下一轮能否按相近的方式继续。", "若用品需要反复使用：区分这一轮已经用掉的部分与下一轮仍可继续使用的部分。"],
    settlement: ["已做的事情进入确认，后续承担另行说清", "既有投入确认与后续续用", "要处理的是已做部分获得原约定中的回应，确认哪些已经完成、哪些仍需补齐", "要处理的是已发生的投入得到确认，以及归还、续用和后续由谁承担", "若已有完成的作品或约定：对照实际完成的部分获得回应，尚待补做的内容另外列明。", "若已有共同费用或借用物品：核对已经承担的部分，归还与继续使用分别确认。"],
    new_collaboration: ["不同用途进入尝试，参与方式重新衔接", "新用途所需的时间与物品", "要处理的是把已有做法接到不同用途或新的共同安排", "要处理的是新增用途需要多少时间和物品，是否挤占原来已经答应的部分", "若有新的活动或共同安排：先用已有办法参与一小段，再对照它与原来做法的差别。", "若已有物品要用于另一项安排：分清暂时借用与长期占用，各自保留实际使用范围。"],
    work_change: ["眼前要求与原有方法重新配合", "共同承担与可用支持重新分配", "要处理的是眼前要求、实际分工与原来会用的方法能否接上", "要处理的是共同安排所需的时间、用品和协助怎样分别承担", "若有共同约定：把需要自己做的一步与他人配合的一步分开，核对原有做法还能否使用。", "若有共同安排：核对谁能拿出哪些用品和时间，已承诺的部分与新增要求分别说明。"]
  };
  const row = topics[kind] ?? topics.work_change!;
  const effect = actor?.effect;
  const direction = effect === "assists" ? "，这项本身已有可推进的配合。" : effect === "obstructs" ? "，这项本身仍有妨碍落实的牵制。" : effect === "mixed" ? "，这项本身同时有可用配合和需要处理的牵制。" : "；这项本身尚未单独定顺，不能借别的配合判断它推进顺利。";
  const specialised = kind === "study" && actor?.tenGod === "偏印" ? (money ? "专项方法与补缺投入" : "换一种专项方法，补上具体缺口") : row[money ? 1 : 0]!;
  const title = kind === "study" && effect === "obstructs" ? money ? "准备占用持续增加，投入尚待用起来" : "准备增多，能拿出来的东西反而被推后" : specialised;
  const pressure = kind === "study" && effect === "obstructs" ? "准备反复加深，原本要拿出来用的内容容易往后挪。" : "";
  return { title, summary: `${pressure}${child ? "在学习、活动和日常小事中，" : ""}${row[money ? 3 : 2]}${direction}`, example: row[money ? 5 : 4]! };
}
/** Describes verified task links. It never computes an effect from prose,
 * counts roots, or turns a background relation into a new annual event. */
export function buildNatalTransitTaskProse(input: NatalTransitTaskProseInput): { title: string; summary: string; examples: string[]; taskSummary: string } | null {
  const { links, actions, effect, ageStage } = input;
  if (!links?.items.length || ageStage === "before_birth") return null;
  if (links.version !== OUTLOOK_NATAL_TASK_LINKS_VERSION) throw new Error("本命与岁运任务的解释版本不一致。");
  const money = input.domain === "wealth", child = ageStage === "young_child" || ageStage === "youth";
  const target = input.horizon === "decade" ? "这步大运" : input.horizon === "month" ? "本月" : "本年";
  const work = child ? "学习、活动中的做法" : "已经会用的方法";
  const topic = currentTopic(input, child);
  const answers = links.items.map((link) => {
    const pressured = link.relations.filter((relation) => relation.contributesPressure);
    const background = pressured.filter((relation) => relation.from.origin.kind === "background");
    const incoming = pressured.filter((relation) => relation.from.origin.kind === "target");
    const combined = pressured.some((relation) => relation.operation === "combine");
    const controlled = pressured.some((relation) => relation.operation === "control");
    const visible = actions.find((action) => action.visibility === "visible");
    const support = actions.some((action) => action.effect === "assists" || action.effect === "mixed");
    let title: string, summary: string, example: string;
    if (link.taskId === "resource_food_controls_killing") {
      title = pressured.length ? combined ? "新支持牵动原有方法，完成与应对要求要一起看" : "方法仍要发挥，指导与准备同时牵制" : "把已有方法用出来，同时回应集中的要求";
      summary = `${work}在这里承担两件事：把理解表达、做出成果，也把集中的要求拆成可以处理的步骤。`;
      if (controlled) summary += "指导和准备牵制这套方法时，受到影响的不只是展示进度，也包括原来处理难点的办法。";
      if (combined) summary += "新增支持与原有做法发生牵连，可能需要反复协调怎样继续使用；这不等于原来的能力已经消失。";
      if (!pressured.length) summary += support ? "本段可用的配合能接到实际完成与应对难点上。" : "本段仍须看这些方法能否接上眼前要求，不能仅因要求出现就断定顺利或承压。";
      example = money ? "同一段时间既要完成已有内容，又要补充说明或接受指导，时间与用品先保留给能实际处理难点的步骤。"
        : `${child ? "在一次学习或活动中" : "在一件实际需要完成的事情中"}，原来练熟的办法既用来做出结果，也用来回应较集中的要求；若指导反复改变做法，两边的进度都会受到牵动。`;
    } else if (link.taskId === "chen_ren_resource_use") {
      title = pressured.length ? "职责仍在，原有理解与支持受到牵动" : "以已有理解和支持承接职责，要求多少另看";
      summary = "本命承担要求的关键在已有理解、方法和支持能否继续使用。职责出现得多，并不等于每项要求都已有同样稳固的承接条件。";
      const supportPressure = pressured.some(relation => relation.to.group === "resource");
      const dutyPressure = pressured.some(relation => relation.to.group === "authority");
      if (supportPressure) summary += "本段直接牵动这份承接支持，已有责任仍需完成，做法与可用条件却需要重新接上。";
      if (dutyPressure) summary += "另有原本承担要求的环节受到表达或做法牵动，需要重新协调按什么要求完成；这项作用针对职责本身，不能说成理解或帮助已被夺走。";
      if (!pressured.length && support) summary += "本段可用配合更贴近把要求说明白、把支持接到执行上，而不是单凭职责数量增加来判断进展。";
      else if (!pressured.length) summary += "本段先保留要求与实际支持的区别，不把明面上的职责当作已经稳固的力量。";
      const rooted = link.roots.filter((item) => item.object.group === "resource" && item.natal.length);
      const newRoots = link.roots.filter((item) => item.object.group === "authority" && item.target.length);
      if (rooted.length && newRoots.length) summary += `${target}另给承担要求的字补入了根气，这项变化与原有支持分别保留，仍需同时看本段牵制。`;
      example = money ? "一项原有约定仍需继续完成，已经用于学习、说明或协助的时间和用品受到其他用途占用，需核对哪些支持实际还能接上。"
        : "已有一项明确要求，需要依靠熟悉的讲解、做法或协助完成；要求更清楚时，仍分别确认自己掌握的步骤与实际可获得的帮助。";
    } else {
      title = pressured.length ? "保护处理难点的方法，帮助本身也有两面" : "补稳原有方法，再承接集中的要求";
      summary = `${work}原来的支撑较浅，却承担着处理较集中要求的任务，本段重点是让这套办法能实际用起来。`;
      if (controlled) summary += "原有指导既能帮助理解，也可能压住自己的做法；不能把所有帮助都撤掉，也不能让指导代替实际尝试。";
      if (combined) summary += "本段另有相互牵连，原来能够使用的办法需要保留实际发挥的位置。";
      const strengthened = link.roots.some((item) => item.object.group === "output" && item.target.length);
      if (strengthened) summary += `${target}给这套方法补入了具体支撑；已有牵制仍须另看，并不等于难点已经全部解除。`;
      else if (support && !pressured.length) summary += "本段已有配合可以帮助方法落实，但仍不能跳过原先的承接条件。";
      if (visible?.tenGod === "正财" || visible?.tenGod === "偏财") summary += "投入或用途的增加可能一面减轻指导对方法的限制，一面又增加要处理的要求，两面需要同时保留。";
      example = money ? "有限时间、用品或帮助优先支持原来能处理难点的具体步骤；新增投入若同时带来更多要求，需分开核对它究竟缓解还是增加了负担。"
        : `${child ? "学习或活动" : "实际完成事情"}时，先让已经会用的一小段办法继续发挥，再把必要讲解接到卡住的地方；反复换整套做法会使原本较弱的环节难以稳定。`;
    }
    if (background.length) summary += `其中的牵制来自当前仍在场的${background.some((relation) => relation.from.origin.kind === "background" && relation.from.origin.nodeRef.nodeType === "dayun") ? "大运背景" : "年运背景"}，会随本段背景延续，并非${target}才新出现。`;
    if (incoming.length && background.length) summary += `${target}新进入的作用与这层持续背景分别成立。`;
    if (effect === "mixed") summary += "所以本段同时保留可推进之处与实际牵制，不能只按有帮助的一面概括。";
    return { title, summary, example };
  });
  const pressured = links.items.flatMap(link => link.relations).filter(relation => relation.contributesPressure);
  const suffix = pressured.some(relation => relation.operation === "combine") ? "，原有配合另有牵连" : pressured.length ? "，原有方法仍受牵制" : "";
  const hidden = actions.find(action => action.visibility === "main_hidden");
  const visible = actions.find(action => action.visibility === "visible");
  let hiddenSummary = "";
  if (hidden && hidden.tenGod !== visible?.tenGod) {
    const own = currentTopic({ ...input, kind: undefined, actions: [{ ...hidden, visibility: "visible" }] }, child);
    const name = `${input.horizon === "decade" ? "运支" : input.horizon === "month" ? "月支" : "年支"}内的${hidden.stem}${hidden.tenGod}`;
    hiddenSummary = `另看${name}：${own.summary}`;
  }
  const taskSummary = `${hiddenSummary}${answers.map(answer => answer.summary).join("")}`;
  return { title: `${topic.title}${suffix}`, summary: `${topic.summary}${taskSummary}`, examples: [topic.example, ...new Set(answers.map(answer => answer.example))], taskSummary };
}
