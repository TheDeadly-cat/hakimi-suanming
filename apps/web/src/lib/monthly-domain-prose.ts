import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { buildNatalTransitTaskProse } from "./outlook-task-link-prose";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { AnnualDomainReading, AnnualReadingDomainId } from "./local-annual-domain-reading";
import type { LocalMonthlyPeriod } from "./local-detailed-outlook";
import { OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgment, type OutlookAxisFinding, type OutlookEffect, type OutlookStemAction } from "./local-outlook-judgment";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextWork } from "./local-reading-context";
import { ADULT_LIFE_SITUATIONS_VERSION, buildAdultLifeSituations, type AdultSituationMechanism } from "./adult-life-situations";

export const MONTHLY_DOMAIN_PROSE_VERSION = "hakimi.monthly-domain-prose/0.5.0" as const;
export interface MonthlyDomainProseInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment;
  month: Pick<LocalMonthlyPeriod, "ganZhi" | "nodeRef">; yearGanZhi: string | null;
  judgment: LocalOutlookJudgment; age: LocalReadingAgeContext; backgroundDayunLabels: string[];
  appliedWork?: ReadingContextWork;
}
type Actor = { stem: string; god: string; effect: OutlookEffect; evidence: string[]; blockers: string[]; satisfied: string[]; metadata: OutlookStemAction };
type Topic = { label: string; mechanism: string; opening: string; friction: string; example: string; watch: string; situationMechanism?: AdultSituationMechanism };
type Pair = { position: "month" | "day"; fact: RelationFact; text: string };
const unique = <T>(values: readonly T[]) => [...new Set(values)];

type MonthRoleWords = { theme: string; help: string; pressure: string; example: string };
// Editorial meanings of the existing roles. Direction comes only from the
// exact period's typed action; these words never assign a new effect.
const MONTH_ROLES: Record<string, { career: MonthRoleWords; wealth: MonthRoleWords }> = {
  正官: {
    career: { theme: "侧重原先答应了什么、怎样才算完成，以及最后一步由谁负责", help: "已有要求与自己能做的部分接上，让答应的事按约完成", pressure: "完成标准已经明确，但相应帮助或可用时间还没有跟上", example: "一次共同安排临近办妥，参与的人对怎样才算完成有不同理解，于是剩余的部分需要落实到具体人。" },
    wealth: { theme: "侧重原有约定对应哪些用品、时间与实际帮助", help: "已有配套能够对应答应的事，投入的用途较清楚", pressure: "要承担的部分增加，用品、时间和帮助却仍沿用原来的安排", example: "已答应的一件事需要借用用品和他人协助，现有条件能完成哪一部分、还缺什么，成为本月具体的投入问题。" },
  },
  七杀: {
    career: { theme: "侧重几项集中的要求怎样排出先后，以及难处出现时怎样得到帮助", help: "处理难点的方法接到眼前要求，集中要做的事有了可用解法", pressure: "几项要求抢占同一段时间，顾了眼前一项又拖住另一项", example: "几件已答应的事凑在相近时间，一部分能独立处理，另一部分要等人协助，先后次序开始影响完成。" },
    wealth: { theme: "侧重集中需要占用哪些现有条件，哪些能替代、哪些确实缺少", help: "有限的用品和帮助用到最影响完成的地方", pressure: "几项需要同时占用同一份用品、时间或帮助，临时补缺打乱原来的使用安排", example: "几件事情同时要用一份工具或他人的时间，先满足哪一处、能否用现有办法替代，关系到其余安排还能否继续。" },
  },
  比肩: {
    career: { theme: "侧重自己负责的部分怎样完整做出来，再与共同安排衔接", help: "自己的尝试与实际帮助接上，各自完成的部分较能连起来", pressure: "自己的做法与共同安排互相拉扯，想独立完成却仍要等别人的输入", example: "自己已会做的一部分先做完整，其他人才能清楚接上哪里；各自完成与共同收尾开始有了清楚的分界。" },
    wealth: { theme: "侧重自己使用的条件与共同承担分开，时间和用品各有去处", help: "个人可用条件与共同需要相配，原有投入较能持续发挥用途", pressure: "个人使用与共同承担挤在一起，已经留给自己的条件又被别处占用", example: "一份用品既供自己使用也供大家共用，个人实际用了多少、剩下的整理和维护由谁承担，需要分开说明。" },
  },
  劫财: {
    career: { theme: "侧重多人参与时谁提出办法、谁决定、谁把事情做完", help: "共同参与能够接到具体完成，各人的帮助有了实际落点", pressure: "参与和意见增加，却把决定与实际完成分散到不同人手里", example: "一次家务、出行或共同活动有几种做法，提出意见的人与实际执行的人未必相同，彼此怎样接上成为具体题目。" },
    wealth: { theme: "侧重共同时间、用品与份额怎样使用，以及临时增加的部分由谁补上", help: "共同投入接到实际用途，已有时间和材料较能互相补足", pressure: "共同使用与决定权牵动原有份额，临时多用的部分没有对应承担", example: "几个人共用材料或一起分担费用，原先说好的份额与临时追加的需要并不完全相同，追加怎样同意成为新的安排。" },
  },
  正印: {
    career: { theme: "侧重听懂说明、接受指导，再把已经理解的部分真正用出来", help: "已有解释与帮助进入实际使用，原来卡住的步骤得到支持", pressure: "继续补说明、查资料或重练方法，挤掉原本用于实际完成的时间", example: "已有的一条说明到了实际使用环节，独立能做的部分与仍需帮助的地方开始显出来。" },
    wealth: { theme: "侧重已有材料、工具与准备时间究竟用在了哪里", help: "已有知识和工具找到实际用途，原先投入的条件能够接着使用", pressure: "准备继续增加，材料、工具或帮助却停在等待使用的状态", example: "已有用品或学过的办法到了需要使用的时候，哪些条件能够沿用、哪些还缺配套，成为具体的使用问题。" },
  },
  偏印: {
    career: { theme: "侧重一种不同的方法能否解开具体难处，熟悉的做法还要保留哪些", help: "新的理解补上原有做法的不足，小范围尝试找到可用办法", pressure: "方法来回切换，原来已经开始的部分反而被打断", example: "对同一处难点作一次小尝试，比较两种做法各能解决什么，原来已经能用的部分仍然保留。" },
    wealth: { theme: "侧重新材料或工具试用需要多少投入，哪些值得继续保留", help: "有限试用分清真正适合的条件，现有投入不必全部推倒重来", pressure: "新旧方法同时占用材料和维护时间，试用还没定下来就增加了持续承担", example: "新工具和现有用品各试一小部分，实际占用多少时间、还需搭配什么，会显出不同的使用条件。" },
  },
  食神: {
    career: { theme: "侧重熟悉的方法能否反复做出相近结果，把已有的本领稳稳呈现", help: "熟悉的方法形成稳定、可使用的成果，已会的部分能够连续完成", pressure: "继续增加要做的部分，超过眼下时间与帮助能接住的范围，熟悉的事也难按原节奏持续", example: "一项手艺、兴趣制作或日常活动沿熟悉的方法再做一次，结果稳定后，参与的人更容易知道自己可以接上哪一部分。" },
    wealth: { theme: "侧重已有用品能否持续使用，重复完成与后续维护各花多少时间", help: "已有用品和方法持续发挥用途，重复投入较能留下可复用的部分", pressure: "每次重复消耗与维护都在增加，已有条件难以支持原定的频率", example: "一种用品或办法需要反复使用，哪些每次都消耗、哪些能留下继续用，以及整理维护花多少时间，逐渐变得清楚。" },
  },
  伤官: {
    career: { theme: "侧重把自己的解法说清楚，用一次具体尝试看它是否真能解决问题", help: "具体改法进入小范围试用，让卡住的环节得到实际反馈", pressure: "想展开的改法多于能够完成的部分，表达、试用与收尾接不上", example: "一次共同安排总卡在同一环节，换一个具体做法先试一轮，参与者的实际感受会比争论哪种说法更好更清楚。" },
    wealth: { theme: "侧重试一次新做法会占用什么，哪些原有材料可以沿用", help: "小范围试用看清用品和时间怎样用得更合适，不必一开始就扩大投入", pressure: "改法还未得到实际反馈，配套材料和试用时间已不断增加", example: "试用一个新办法额外占用了共同时间和材料，能沿用的部分与确需补充的部分分开后，后续还要投入什么更容易看清。" },
  },
  正财: {
    career: { theme: "侧重已经做出的部分怎样得到回应，确认后还要承担什么", help: "已有成果接到明确用途和回应，做完与得到确认较能相接", pressure: "已经投入、实际完成与得到确认的节奏错开，收尾仍有反复", example: "一件已办事项等具体回应，确认哪些已经接受、哪些还需补做之后，原有约定才有清楚的收尾。" },
    wealth: { theme: "侧重已使用的用品、时间或共同费用怎样说明，剩余承担还在哪里", help: "已有投入得到清楚的用途说明，后续补充与原来承担较能分开", pressure: "投入已经发生，使用或承担却还没确认，后续补充继续占用现有条件", example: "物品归还、共同费用或已经付出的时间到了需要说明的时候，原先承担的部分与之后仍需补充的部分并不一样。" },
  },
  偏财: {
    career: { theme: "侧重新的需要或参与选择与原来安排怎样并存", help: "已有本领找到不同使用方式，新的需要有了可以试着接上的部分", pressure: "几个新选择先占用同一段时间，愿意参与的范围超过实际能继续完成的部分", example: "原来的事情尚未收尾，又出现一次活动或新的用途；可以先尝试哪一部分、哪些不能同时兼顾，需要分别说明。" },
    wealth: { theme: "侧重新用途能否沿用现有条件，另需的时间与材料有多少", help: "现有用品或本领找到新的用途，新增选择不必都从头投入", pressure: "新选择的准备先发生，持续使用与退出后的承担却还不清楚", example: "一件已有用品出现新用途，是否要另备材料、会占用谁的时间，以及不用之后留下什么，都影响这次选择的实际投入。" },
  },
};
const SCHOOL: Record<string, { label: string; example: string }> = {
  比肩: { label: "独立尝试与同伴分工", example: "自己完成一部分练习，再与同伴核对衔接的部分" },
  劫财: { label: "小组参与与共同材料", example: "一次小组活动讨论谁做哪一部分、怎样共同使用材料" },
  食神: { label: "重复练习与作品完成", example: "用熟悉的方法完成一份作品，再听取一次具体反馈" },
  伤官: { label: "表达想法与尝试改法", example: "把一个不同想法做成小尝试，看看实际结果是否符合原要求" },
  正财: { label: "已答应任务的完成与确认", example: "核对一项已答应的练习是否完成，材料与后续整理是否齐备" },
  偏财: { label: "新活动选择与时间安排", example: "比较一次新活动与原安排需要的时间和帮助" },
  正官: { label: "活动规则与责任约定", example: "开始活动前说明规则、负责的部分和遇到问题找谁协助" },
  七杀: { label: "集中任务与求助方式", example: "把几项相近时间的要求分成先后，说明哪一部分需要帮助" },
  正印: { label: "理解指导并用于练习", example: "把老师或家人的一条指导用于练习，再说出还有哪里不明白" },
  偏印: { label: "探索新方法与保留熟悉做法", example: "对一个小问题尝试新材料或方法，同时保留能继续活动的熟悉做法" }
};
const RELATION_TOPICS: Record<string, string> = {
  比肩: "各自安排与共同决定的边界", 劫财: "参与份额与共同事项的分工", 食神: "日常回应与共同活动的完成", 伤官: "不同意见怎样被表达和听见",
  正财: "已约定事项中的实际投入", 偏财: "临时邀约与原安排的取舍", 正官: "承诺内容与实际履行", 七杀: "集中要求下如何互相说明限制",
  正印: "理解、指导与需要的支持", 偏印: "不同习惯与接受帮助的方式"
};
const RELATION_LABELS: Partial<Record<RelationFact["relationType"], string>> = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" };
function pairs(ganZhi: string, revision: RevisionRecord): Pair[] {
  return (["month", "day"] as const).flatMap((position) => {
    const natal = revision.facts.pillars[position].ganZhi;
    return calculatePillarRelations({ year: ganZhi, month: natal, day: ganZhi, hour: natal }).facts
      .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2 && RELATION_LABELS[fact.relationType]
        && fact.participants.some((p) => p.position === "year") && fact.participants.some((p) => p.position === "month"))
      .map((fact) => ({ position, fact, text: `本月${ganZhi}与本命${position === "month" ? "月柱" : "日柱"}${natal}有${RELATION_LABELS[fact.relationType]}（${fact.participants.map((p) => p.value).join("、")}）；规则 ${fact.ruleId}；事实 ${fact.id}。` }));
  });
}
function readActor(stem: string, visible: boolean, input: MonthlyDomainProseInput, pattern: OutlookAxisFinding): Actor {
  const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[input.revision.facts.pillars.day.stem + stem] ?? "");
  if (!SCHOOL[god]) throw new Error("月度生活解释缺少可识别的十神事实。");
  const metadata = pattern.stemActions;
  if (!metadata || metadata.version !== OUTLOOK_STEM_ACTIONS_VERSION || metadata.items.length !== 2
    || metadata.items.filter((item) => item.visibility === "visible").length !== 1 || metadata.items.filter((item) => item.visibility === "main_hidden").length !== 1) throw new Error("月度生活解释缺少完整的原作用元数据。");
  const action = metadata.items.find((item) => item.visibility === (visible ? "visible" : "main_hidden"))!;
  if (action.stem !== stem || action.tenGod !== god || typeof action.summaryBasis !== "boolean" || !["assists", "obstructs", "mixed", "neutral", "unresolved"].includes(action.effect)) throw new Error("月度作用对象与目标月干支不一致。");
  const lines = (indexes: number[], original: string[]) => {
    if (!Array.isArray(indexes) || new Set(indexes).size !== indexes.length || indexes.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= original.length)) throw new Error("月度作用依据索引无效。");
    // The wrapper verifies the complete axis against the original computation.
    // This pure renderer checks shape/range, never Chinese formatting or effect.
    return indexes.map((index) => original[index]!);
  };
  const evidence = lines(action.evidenceIndexes, pattern.evidence), blockers = lines(action.blockerIndexes, pattern.blockers);
  const satisfied = lines(action.satisfiedConditionIndexes, pattern.satisfiedConditions);
  return { stem, god, effect: action.effect, evidence, blockers, satisfied, metadata: action };
}
function actionText(actor: Actor) {
  return actor.effect === "assists" ? "原段列为结构支持" : actor.effect === "obstructs" ? "原段列为结构牵制或负荷" : actor.effect === "mixed" ? "原段同时保留结构支持与牵制" : actor.effect === "neutral" ? "原段未单独定向，具体合克仍分读" : "原段作用仍待条件成立，未按支持或压力定论";
}
function topic(domain: "career" | "wealth", god: string, age: LocalReadingAgeContext): Topic {
  const words = MONTH_ROLES[god]![domain], school = SCHOOL[god]!;
  const labels: Record<string, [string, string]> = {
    比肩: ["自己完成的部分与共同安排", "个人使用与共同承担"], 劫财: ["共同参与中的分工衔接", "共同用品、份额与临时补缺"],
    食神: ["熟悉方法的稳定呈现", "用品持续使用与整理维护"], 伤官: ["不同做法的实际试用", "试用改法所占的时间与材料"],
    正财: ["已有事情进入确认和收尾", "已有约定的用途与剩余承担"], 偏财: ["新选择与原安排相遇", "新用途与现有投入的取舍"],
    正官: ["已答应事项进入落实阶段", "约定对应的时间与帮助"], 七杀: ["几项要求集中到一起", "集中需要与有限条件"],
    正印: ["理解与实际使用的衔接", "已有用品和准备的实际用途"], 偏印: ["新方法与熟悉做法的衔接", "试用与继续保留的投入"],
  };
  const adultOrUnknown = age.stage === "adult" || age.stage === "unknown";
  if (adultOrUnknown) return { label: labels[god]![domain === "career" ? 0 : 1], mechanism: `本月${words.theme}。`, opening: words.help, friction: words.pressure,
    example: words.example, watch: words.theme.replace(/^侧重/u, "") };
  const early = age.stage === "young_child", younger = (age.startAge ?? 6) < 12;
  const scenes: Record<string, string> = {
    比肩: "想自己完成其中一部分，再让同伴接上另一部分", 劫财: "几个人都想参与，实际动手和共用材料的次序还不一样",
    食神: "熟悉的小作品或玩法再做一次，结果能否保持相近变得清楚", 伤官: "提出一种不同玩法，试过以后才知道它是否真的更合适",
    正财: "已经答应的活动到了收尾，做完的部分需要得到具体回应", 偏财: "出现另一种想参加的活动，它会与原来的时间安排相遇",
    正官: "共同说好的规则需要落实到自己负责的部分", 七杀: "几个需要处理的要求凑到一起，自己能做和需要帮助的部分不同",
    正印: "听到的一条说明在实际尝试中派上用场，哪里还不明白也会显出来", 偏印: "换一种材料或方法试一小步，与熟悉做法的差别变得可见",
  };
  const setting = early ? "熟悉游戏或与照料者的小活动" : younger ? "日常活动、兴趣或小练习" : "兴趣实践或同伴共同活动";
  return { label: domain === "career" ? school.label : `${school.label}的材料与支持`,
    mechanism: `${setting}中，${scenes[god]}。${domain === "wealth" ? "这里涉及的是陪伴时间、活动用品与可得到的帮助。" : ""}`,
    opening: words.help, friction: words.pressure,
    example: domain === "career" ? `一次${setting}中，${scenes[god]}。` : `一次${setting}需要共用材料或得到帮助；${scenes[god]}，用品与陪伴时间也要随实际参与配合。`,
    watch: early ? "活动与回应、用品和陪伴时间" : "实际参与、可用材料与得到的帮助" };
}

function actorTopic(domain: "career" | "wealth", actor: Actor, age: LocalReadingAgeContext, input: MonthlyDomainProseInput, pattern: OutlookAxisFinding, task: NatalWealthResourceTask): Topic {
  let base = topic(domain, actor.god, age);
  const moderates = pattern.pathId === "resource-wealth" || (task.preferredPathId === pattern.pathId && task.task === "wealth_first");
  if (moderates && ["正财", "偏财", "正印", "偏印"].includes(actor.god)) base.situationMechanism = "resource_moderation";
  else if (task.preferredPathId === pattern.pathId && task.task === "resource_first" && ["正财", "偏财", "正印", "偏印"].includes(actor.god)) base.situationMechanism = "resource_protection";
  else if (["official-resource", "killings-resource"].includes(pattern.pathId ?? "") && ["正官", "七杀", "正印", "偏印"].includes(actor.god)) base.situationMechanism = "authority_resource";
  else if (["food-wealth", "hurting-wealth", "peer-output-wealth"].includes(pattern.pathId ?? "") && ["食神", "伤官"].includes(actor.god)) base.situationMechanism = "output_to_wealth";
  if (moderates && ["正财", "偏财"].includes(actor.god)) base = { ...base,
    label: domain === "career" ? "已有准备与实际完成的取舍" : "已有投入中必要与重复部分的区分",
    mechanism: domain === "career" ? "已经接触的方法、资料或帮助很多时，哪些仍要保留、哪些用途重叠成为本月的具体题目。原来想做的部分与现有准备怎样相配，需要各自有实际用途。"
      : "已有用品、材料或支持要按实际用途作取舍。重复占用的部分与仍不可缺的基础不是一回事，减少一种投入不等于把全部支持撤掉。",
    opening: domain === "career" ? "已有准备得到取舍，真正用得上的方法能够留出实际完成的空间" : "用途重复的投入得到区分，必要的用品与支持可以继续保留",
    friction: domain === "career" ? "准备的取舍带有牵连，想减少反复与真正有条件继续完成之间还没有接上" : "想重新安排投入，但原用途和已有承担仍会牵住可调整的部分",
    example: domain === "career" ? "一种兴趣或日常事项接触了几种做法，实际常用的、还未用过的以及暂时不能少的部分并不一样，这些差别进入眼前的安排。"
      : "几份材料或几件用品用途相近，真正持续使用的只是其中一部分；闲置占用与仍需保留的基础开始显出差别。" };
  if (task.preferredPathId === pattern.pathId && task.task === "resource_first" && ["正印", "偏印"].includes(actor.god)) base = { ...base,
    opening: domain === "career" ? "适用的指导与帮助接到已展开的内容，让想做的部分有条件继续完成" : "需要的材料和帮助补到实际缺口，已有投入较能支持正在做的部分" };
  if (!["obstructs", "mixed"].includes(actor.effect)) return base;
  const label = `节令月${input.month.ganZhi}透${actor.stem}`, positions = { 年柱: "year", 月柱: "month", 时柱: "hour" } as const;
  const targets = actor.blockers.flatMap((line) => {
    // Decode only the exact named-target forms emitted by the judgment. This
    // chooses wording for an already obstructing actor, never its direction.
    if (!line.startsWith(label)) return [];
    const rest = line.slice(label.length), found = /^(与关键|可克关键)(年柱|月柱|时柱)透([甲乙丙丁戊己庚辛壬癸])/u.exec(rest);
    if (!found) return [];
    const position = positions[found[2] as keyof typeof positions], stem = found[3]!;
    if ((position === "hour" && !input.assessment.sourceBinding.includeHour) || input.revision.facts.pillars[position].stem !== stem) return [];
    const combination = found[1] === "与关键";
    if (combination && !line.includes("天干五合")) return [];
    const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[input.revision.facts.pillars.day.stem + stem]!);
    return [{ combination, group: strengthTenGodGroup(god) }];
  });
  if (targets.length) {
    const labels = { resource: domain === "career" ? "原有指导、理解或帮助" : "现有支持的实际用途", authority: domain === "career" ? "原先约定的要求" : "履行原约定所需的条件",
      wealth: domain === "career" ? "已经投入的时间与可用条件" : "已有用品、时间与共同承担", output: domain === "career" ? "原本会做或想呈现的部分" : "持续使用与完成所需的投入",
      peer: domain === "career" ? "各自的做法与参与安排" : "个人使用与共同分配" };
    const grouped = [...new Set(targets.map((target) => target.group))];
    const frictions = grouped.map((group) => {
      const object = group ? labels[group] : "既有配合", groupTargets = targets.filter((target) => target.group === group);
      const combination = groupTargets.some((target) => target.combination), control = groupTargets.some((target) => !target.combination);
      if (combination && control) return `${object}与眼前做法相互牵动，原先的支持和实际完成难以直接接上`;
      return combination ? `${object}与眼前做法牵在一起，不能直接按原来的配合继续`
        : group === "authority" ? domain === "career" ? "自己的表达或做法与原先约定的要求对不上" : "自己想用的时间和材料牵动履行原有约定所需的条件"
          : `${object}受到眼前事项的牵动，实际完成与所需支持未必同步`;
    });
    const scenes = { resource: domain === "career" ? "一件事原本可以依照已有说明继续，实际要用时，所需的帮助又牵涉其他安排，继续完成的时间可能随之调整。" : "一份原本可用的材料或帮助另有用途，想继续用在眼前事项时，提供支持的人和使用时间不一定能照旧。",
      authority: domain === "career" ? "一次共同活动中，自己试出的做法与大家原先答应的要求不同，想法能否被接受与事情能否按约完成成为两件事。" : "自己想尝试的内容与已经答应的安排要用同一份时间或材料，留给各自的部分因而需要重新配合。",
      wealth: domain === "career" ? "原先留给一件事情的用品或时间，又被自己的新安排占用，想继续做的部分与原来已经答应的部分相遇。" : "一件共用物品原来已有用途，新的使用方式占了它的时间，归还、分摊或剩余承担可能因此需要重新商量。",
      output: domain === "career" ? "熟悉的活动正做到可以呈现的地方，又增加了说明或附带要求，原来会做的部分也要调整之后才能继续。" : "原来能持续使用的用品或办法，多了配套要求与等待，重复完成实际要用的时间和材料发生变化。",
      peer: domain === "career" ? "各自原先能独立做完的部分遇到共同安排，参与方式和衔接时间开始互相影响。" : "个人使用的条件遇到共同安排，原来留给自己的部分与大家要用的部分发生交集。" };
    const group = grouped.length === 1 ? grouped[0] : null;
    const situationMechanism: AdultSituationMechanism = group === "resource" ? "resource_tie" : group === "wealth" ? "wealth_tie"
      : group === "output" ? "output_tie" : group === "authority" && targets.every((target) => !target.combination) ? "authority_conflict" : "general_constraint";
    return { ...base, situationMechanism, friction: frictions.join("；"), example: unique(grouped.map((group) => group ? scenes[group] : "原有的帮助或安排出现牵连，继续完成需要与实际支持重新接上。")).join(" ") };
  }
  if (actor.blockers.length) return { ...base, situationMechanism: "general_constraint", friction: "原有配合有明确牵连，眼前做法不能直接按原安排持续", example: "原来能够接上的帮助或安排另有牵连，继续完成的方式需要随实际支持改变；具体对象保留在本段依据里。" };
  if (["食神", "伤官"].includes(actor.god)) return { ...base,
    situationMechanism: "output_overload",
    friction: domain === "career" ? "继续做或说的部分超过当前支持能接住的范围，熟悉的事也难按原节奏持续" : "想继续做出的内容增加，而现有用品、时间与帮助还接不上",
    example: domain === "career" ? "熟悉的活动或做法又展开几个部分，但可用帮助没有同步，想完成的范围与持续做得到的范围出现差距。" : "想增加活动或重复完成，实际可用的材料与帮助仍是原来那些，能继续到哪里取决于现有条件能否接上。" };
  return base;
}

function livedTopic(domain: "career" | "wealth", actor: Actor, input: MonthlyDomainProseInput, pattern: OutlookAxisFinding, task: NatalWealthResourceTask): Topic {
  const phases = input.age.segments.length ? input.age.segments.map((segment) => ({ ...input.age, ...segment, segments: [segment] })) : [input.age];
  const topics = phases.map((age) => {
    let value = actorTopic(domain, actor, age, input, pattern, task);
    if (actor.effect === "assists") value = { ...value, label: value.opening.split("，")[0]! };
    if (actor.effect === "obstructs") value = { ...value, label: actor.blockers.length ? value.friction.split("，")[0]!
      : actor.god === "正印" ? domain === "career" ? "准备增多，实际使用被拖住" : "投入停在准备，实际用途还未接上" : value.friction.split("，")[0]! };
    if (actor.effect === "mixed") value = { ...value, label: `${value.label}的发挥与牵制并存` };
    // Examples show a possible scene, not a checklist. Preserve an explicitly
    // identified obstruction's scene instead of reverting to a ten-god cliché.
    if (!actor.blockers.length && ["正印", "偏印"].includes(actor.god)) {
      if (actor.effect === "assists") value = { ...value, example: actor.god === "偏印"
        ? domain === "career" ? "熟悉的办法卡在某一处，一种不同的解释或小范围尝试补上了缺口，原来已经会做的部分也能继续接着用。" : "一种专项工具或替代材料补上了原有用品不适用的地方，局部试用就能沿用其余现有条件，不必整套重备。"
        : domain === "career" ? "一条说明或示范补上了原来不会做的一步，卡住的活动有了继续尝试的办法。" : "已有的一件用品或学过的办法找到具体用途，原先需要重新准备的部分可以沿用现有条件。" };
      else if (actor.effect === "obstructs") value = { ...value, example: actor.god === "偏印"
        ? domain === "career" ? "原来正在做的部分换了一种方法，旧进度先停下来，新办法却还没有接上，反复转换占去了继续完成的时间。" : "新旧工具或材料都还在占用，旧的一套暂时不能撤下，新的一套又需要配套，两头准备挤占了实际使用的时间。"
        : domain === "career" ? "说明、材料或修改继续增加，原本要拿出来用的部分迟迟没有用上，实际完成的时间被准备占去。" : "为一件事情准备的用品和资料越来越多，真正使用的部分却没有跟上，时间与材料继续停在准备环节。" };
    }
    return value;
  });
  if (topics.length === 1) return topics[0]!;
  const combine = (key: keyof Topic) => topics.map((item, index) => `${phases[index]!.label}段：${item[key]}`).join(" ");
  return { label: topics[0]!.label, mechanism: combine("mechanism"), opening: combine("opening"), friction: combine("friction"), example: combine("example"), watch: combine("watch"), situationMechanism: topics[0]!.situationMechanism };
}

function effectSentence(actor: Actor, description: Topic, secondary = false): string {
  const lead = secondary ? "另一项配合中，" : "";
  if (actor.effect === "assists") return `${lead}较能发挥的是${description.opening}。`;
  if (actor.effect === "obstructs") return `${lead}容易遇到的牵制是${description.friction}。`;
  if (actor.effect === "mixed") return `${lead}${description.opening}；同时，${description.friction}。`;
  return secondary ? `还涉及${description.label}。` : `本月的具体题目是${description.label}。`;
}

/** Consume exactly one prevalidated month segment. It never changes the parent
 * monthly judgment, borrows a year actor's direction or merges luck branches. */
export function buildMonthlyDomainProse(input: MonthlyDomainProseInput): AnnualDomainReading[] {
  const revision = revisionRecordSchema.parse(input.revision), { month, judgment, age } = input;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  for (const binding of [input.assessment.sourceBinding, judgment.sourceBinding]) if (binding.revisionId !== revision.id || binding.chartResultHash !== revision.manifest.resultHash || binding.includeHour !== includeHour) throw new Error("月度生活解释与命盘或时辰范围不一致。");
  if (month.nodeRef.nodeType !== "month" || JSON.stringify(month.nodeRef) !== JSON.stringify(judgment.targetRef)) throw new Error("月度生活解释的目标节点不一致。");
  const expectedAge = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, judgment.interval.startInstant, judgment.interval.endExclusiveInstant);
  if (age.stage !== expectedAge.stage || age.startAge !== expectedAge.startAge || age.endAge !== expectedAge.endAge || age.personalStartInstant !== expectedAge.personalStartInstant
    || JSON.stringify(age.segments) !== JSON.stringify(expectedAge.segments)) throw new Error("月度生活解释的年龄与实际分段不一致。");
  if (age.stage === "before_birth") return [];
  const pattern = judgment.axes.find((axis) => axis.axis === "pattern");
  if (!pattern) throw new Error("月度生活解释缺少原结构判断。");
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: input.assessment.balance.structural.inputFacts, includeHour });
  const mainStem = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[month.ganZhi[1] ?? ""]?.[0];
  if (!LunarUtil.JIA_ZI.includes(month.ganZhi) || !mainStem) throw new Error("月度生活解释缺少有效干支。");
  const visible = readActor(month.ganZhi[0]!, true, input, pattern), main = readActor(mainStem, false, input, pattern), relations = pairs(month.ganZhi, revision);
  const monthPairs = relations.filter((pair) => pair.position === "month"), dayPairs = relations.filter((pair) => pair.position === "day");
  const dayBranch = dayPairs.filter((pair) => pair.fact.relationType.startsWith("branch_")), dayStem = dayPairs.filter((pair) => pair.fact.relationType.startsWith("stem_"));
  const monthClash = monthPairs.some((pair) => pair.fact.relationType.endsWith("clash"));
  const dayClash = dayBranch.some((pair) => pair.fact.relationType === "branch_six_clash");
  const adult = age.stage === "adult", unknown = age.stage === "unknown", early = age.stage === "young_child";
  const background = `本段已有背景：${input.yearGanZhi ? `${input.yearGanZhi}流年` : "流年标签未提供"}；${input.backgroundDayunLabels.length ? input.backgroundDayunLabels.join("、") : "未绑定大运"}。`;
  const backgroundCondition = `${background}这些是本月所处条件，不当作本月又新增一次年运或交运。`;
  const actorBasis = `本月${month.ganZhi}透${visible.stem}${visible.god}，${actionText(visible)}；${month.ganZhi[1]}支本气${main.stem}${main.god}，${actionText(main)}。支内本气只作承接线索，不当成已透出的字；这里是原结构作用，不是关系吉凶。`;
  const baseEvidence = [`解释 ${MONTHLY_DOMAIN_PROSE_VERSION}；原路径 ${pattern.pathId}；原综合判断 ${judgment.headline}。`,
    `目标月节点 ${month.nodeRef.nodeId}；本段 ${judgment.interval.startInstant} 至 ${judgment.interval.endExclusiveInstant}（不含终点）。`,
    actorBasis, background, ...judgment.axes.flatMap((axis) => [...axis.evidence, ...axis.blockers, ...axis.rescues])];
  const baseConditions = unique([...age.conditions, ...judgment.conditions, ...judgment.conflicts, ...judgment.coverageGaps,
    ...judgment.axes.flatMap((axis) => [...axis.unresolvedConditions, ...axis.blockers, ...axis.rescues]), backgroundCondition,
    "生活事项是对原月度事实的现代解释，不是事情已经发生，也没有新增领域吉凶、概率或收入保证。",
    "天干合克、救应和作用对象沿用本段原判断；支内条件不升级为透干，某段支持不推广到交运另一侧或另一顺逆分支。"]);
  return (["career", "wealth", "relationship"] as const).map((domain): AnnualDomainReading => {
    const evidence = [...baseEvidence], conditions = [...baseConditions];
    let title: string, headline: string, summary: string, paragraphs: string[], opportunities: string[], obstacles: string[], examples: string[], watchPoints: string[];
    if (domain === "relationship") {
      const issue = RELATION_TOPICS[visible.god]!;
      title = adult ? "关系与共同事项" : unknown ? "关系与协作" : "家人与同伴";
      headline = dayBranch.length ? dayClash ? `${month.ganZhi}月：共同安排需要回应不同节奏` : `${month.ganZhi}月：共同意愿进入具体安排`
        : dayStem.length ? `${month.ganZhi}月：个人取舍与参与方式` : `${month.ganZhi}月：${issue}`;
      summary = dayBranch.length ? `本月与本命日支有${dayClash ? "六冲" : "六合"}，关注${issue}。${dayClash ? "若彼此任务或时间不同步，原来的默认安排就需要具体商量" : "共同意愿要落实为谁参与、何时进行和各自承担什么"}。`
        : dayStem.length ? `本月触及本命日干，较具体的议题是个人意愿与${issue}如何协调。`
          : `本月关系主题是${issue}，重点落在已有约定的履行与日常参与方式。`;
      paragraphs = [adult ? `透干${visible.stem}${visible.god}提示的共同事项，可从双方怎样回应具体需要来观察。${dayBranch.length ? "有真实关系或长期协作背景时，双方表达的需要与实际投入要逐项对应。" : "原有约定怎样履行、实际参与时间是否匹配，以及变化时有没有及时说明，都可以成为这次交流的内容。"}`
        : unknown ? "年龄与具体关系身份未锁定，本月只放在意愿表达、实际参与和日常协作中理解。"
          : early ? "当前年龄对应照料回应、陪伴与熟悉活动；月度互动放在孩子与照料者的日常配合里理解。" : "当前年龄对应家人约定、同伴活动和逐渐形成的自主空间；共同事项不预设成年关系角色。",
        ...(monthClash ? [`本月还触及本命月柱的冲动。只有现实中的${adult ? "学习或工作" : unknown ? "外部协作" : "学习或活动"}安排确实改变时，才进一步核对共同时间是否需要调整。`] : [])];
      opportunities = [dayBranch.length && !dayClash ? "把已经愿意共同做的事落实成明确安排，给双方回应和调整的空间。" : "把这次具体需要与能承担的部分说清楚，让对方有实际回应的机会。"];
      obstacles = dayClash ? ["双方时间、任务或期待可能不同步，原来不必解释的安排需要重新说明。"] : dayStem.length ? ["个人选择与已经答应的参与方式之间可能需要取舍。"] : [];
      examples = early ? ["照料者调整一次陪伴或活动安排，观察孩子的回应并保留熟悉节奏"]
        : !adult && !unknown ? [`一次家人或同伴活动中讨论${issue}`]
          : dayBranch.length ? [dayClash ? "共同计划与双方实际任务发生时间碰撞，逐项商量保留和调整的部分" : "一项原来只说愿意参加的共同活动，开始确定时间和实际分工"]
            : [`围绕一项已经存在的共同安排，具体讨论${issue}`];
      watchPoints = ["是否已有相应共同事项", "对方实际表达的需要与已经答应的参与方式", "个人决定与共同安排分开核对"];
      conditions.push("日支合冲只是已覆盖的二元互动，不保证相识、结婚、分开或其他关系结果；日干互动不冒充日支互动。");
      if (!dayBranch.length && !dayStem.length) conditions.push("本月未检出覆盖范围内的日干日支直接二元合冲，关系主题沿已有共同事项展开，不借综合方向推断关系结果。");
      evidence.push(...relations.map((pair) => pair.text));
    } else {
      const front = livedTopic(domain, visible, input, pattern, wealthResourceTask), hidden = livedTopic(domain, main, input, pattern, wealthResourceTask);
      title = domain === "career" ? adult ? "做事与能力发挥" : unknown ? "日常事项与参与" : "学习探索与活动" : "时间、用品与实际支持";
      const focus = ["neutral", "unresolved"].includes(visible.effect) && ["assists", "obstructs"].includes(main.effect) ? hidden : front;
      headline = `${month.ganZhi}月：${focus.label}`;
      summary = effectSentence(visible, front);
      if (main.god !== visible.god || (main.effect !== visible.effect && !["neutral", "unresolved"].includes(main.effect))) summary += effectSentence(main, hidden, true);
      paragraphs = [front.mechanism,
        ...(main.god !== visible.god ? [hidden.mechanism] : []),
        ...(monthPairs.some((pair) => pair.fact.relationType === "branch_six_clash") ? ["若原有活动、参与方式或日程确实变化，已经开始的事情与新的安排可能需要同时照顾；这里只保留原有地支冲的联系。"]
          : monthPairs.some((pair) => pair.fact.relationType === "stem_clash") ? ["这处联系落在想法、表达或承诺怎样配合，不直接说明生活环境或工作已经改变。"] : []),
        ...(domain === "career" ? [background] : [])];
      const actorDescriptions: [Actor, Topic][] = [[visible, front], [main, hidden]];
      opportunities = unique(actorDescriptions.flatMap(([actor, description]) => ["assists", "mixed"].includes(actor.effect) ? [description.opening] : []));
      obstacles = unique(actorDescriptions.flatMap(([actor, description]) => ["obstructs", "mixed"].includes(actor.effect) ? [description.friction] : []));
      const ownBlockers = new Set([...visible.blockers, ...main.blockers]), oldBlockers = pattern.blockers.filter((line) => !ownBlockers.has(line));
      if (oldBlockers.length) conditions.push("原局或年运背景已有牵制继续作为本段条件保留，没有把它重复描述为本月新发生的事情。");
      const balance = judgment.axes.find((axis) => axis.axis === "balance");
      if (balance?.effect === "obstructs" || balance?.effect === "mixed") obstacles.push(domain === "career" ? "原扶抑口径另有限制，任务增加时可用的时间与协助需要同步。" : "原扶抑口径另有限制，实际可承担的时间与材料要与事项范围对应。");
      // Positional contract consumed by the year/month bridge: visible first,
      // different hidden role second; age phases stay inside each actor example.
      examples = [front.example, ...(main.god !== visible.god ? [hidden.example] : [])];
      // The first two positions remain the original visible/hidden examples.
      // Additional adult scenes carry explicit life-setting prerequisites and
      // use this actor's own effect and identified mechanism, never the year label.
      const selectedActors: [Actor, Topic][] = focus === hidden ? [[main, hidden], [visible, front]] : actorDescriptions;
      const adultScenes = selectedActors.flatMap(([actor, description], index) => {
        if (index > 0 && (actor.god === selectedActors[0]![0].god || ["neutral", "unresolved"].includes(actor.effect))) return [];
        const selected = buildAdultLifeSituations({ domain, god: actor.god, effect: actor.effect, age,
          appliedWork: input.appliedWork ?? null, mechanism: description.situationMechanism ?? "role" });
        return selected ? [{ actor, selected }] : [];
      });
      if (adultScenes.length) {
        const first = adultScenes[0]!;
        examples.push(...first.selected.examples.slice(0, 2).map((example) => `${first.actor.god}这一项：${example}`));
        const other = adultScenes[1];
        if (other?.selected.examples[0]) examples.push(`${other.actor.god}的另一项配合：${other.selected.examples[0]}`);
        conditions.push(...adultScenes.flatMap(({ selected }) => selected.applicability));
        evidence.push(`具体成人情境：${ADULT_LIFE_SITUATIONS_VERSION}；沿本段各自作用和已识别机制解释，未填写职业背景不等于已经就业。`);
      }
      watchPoints = unique([front.watch, ...(main.god !== visible.god ? [hidden.watch] : []), domain === "career" ? "有没有具体完成与反馈" : "只核对实际可用与已经确认的资源"]);
      conditions.push("月干与支本气的作用分别保留；支内支持不改写成月干有利，两者相反时不互相抵消。",
        "机会条目是本段可观察的发挥方式，不等于已实现；没有单列阻力也不代表现实没有困难。",
        ...(!opportunities.length ? ["原段未单列月干或支本气的结构支持；没有用主题或日常情境补成助力。"] : []));
      if ((pattern.effect === "mixed" || pattern.effect === "obstructs") && ![visible, main].some((actor) => ["mixed", "obstructs"].includes(actor.effect))) summary += "这些可用之处仍与原有承接牵制并存，不能仅按单项发挥理解整个配合。";
      if (pattern.rescues.length) summary += "已有的帮助或办法真正接到难点时，才可能减少反复。";
      evidence.push(`原作用元数据 ${OUTLOOK_STEM_ACTIONS_VERSION}；月干 ${visible.effect}、支本气 ${main.effect}，只引用本段自身依据，不从年度或综合标签推回角色方向。`);
      evidence.push(...visible.satisfied, ...main.satisfied);
      evidence.push(...monthPairs.map((pair) => pair.text));
      const linked = buildNatalTransitTaskProse({ links: pattern.taskLinks, effect: pattern.effect,
        actions: pattern.stemActions!.items, ageStage: age.stage, domain, horizon: "month" });
      if (linked) {
        // Task links explain an additional natal/background dependency. They
        // must not replace this month's own role, age or confirmed life setting.
        // In particular, the visible/hidden example positions stay intact.
        summary += linked.taskSummary;
        if (pattern.taskLinks!.items.some((link) => link.relations.some((relation) => relation.contributesPressure
          && relation.from.origin.kind === "background"))) {
          obstacles.push("原来需要保护的处理方法或承接支持仍受到背景牵制，不能只看新增事项。");
        }
      }
    }
    return { id: domain, title, headline, summary, paragraphs, opportunities, obstacles, examples, watchPoints,
      conditions: unique(conditions), evidence: unique(evidence), sourceIds: unique(judgment.axes.flatMap((axis) => axis.sourceIds)) };
  });
}
