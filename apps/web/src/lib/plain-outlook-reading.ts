import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { AnnualLifeStoryBasisRef } from "./annual-life-story";
import type { AnnualRelationshipTiming } from "./annual-relationship-timing";
import type { AnnualDomainReading, AnnualReadingDomainId } from "./local-annual-domain-reading";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgment, OutlookAxisFinding, OutlookStemAction, OutlookEffect, OutlookJudgmentLabel } from "./local-outlook-judgment";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextWork } from "./local-reading-context";

export const PLAIN_OUTLOOK_READING_VERSION = "hakimi.plain-outlook-reading/0.2.0" as const;
export type PlainOutlookCategory = "favorable" | "caution" | "mixed" | "theme" | "unresolved";
export type PlainOutlookOriginal = Pick<AnnualDomainReading, "headline" | "summary" | "paragraphs" | "examples" | "conditions" | "evidence">;
export interface PlainOutlookDomainInput {
  /** The caller has already validated this exact producer segment. */
  judgment: LocalOutlookJudgment; domain: AnnualReadingDomainId;
  original: PlainOutlookOriginal; age: LocalReadingAgeContext;
  horizon: "year" | "month" | "decade";
  kind?: string; task?: NatalWealthResourceTask | null;
  /** Only an already verified, in-range contextual reading may supply this. */
  appliedWork?: ReadingContextWork | null;
  relationshipTiming?: AnnualRelationshipTiming | null;
}
export interface PlainOutlookDomainReading extends PlainOutlookOriginal {
  version: typeof PLAIN_OUTLOOK_READING_VERSION; domain: AnnualReadingDomainId;
  sourceBinding: LocalOutlookJudgment["sourceBinding"];
  scope: Pick<LocalOutlookJudgment, "targetRef" | "backgroundRefs" | "interval">;
  originals: PlainOutlookOriginal; basisRefs: AnnualLifeStoryBasisRef[];
}

function category(judgment: LocalOutlookJudgment): PlainOutlookCategory {
  if (judgment.label === "较顺") return "favorable";
  if (judgment.label === "有压力") return "caution";
  if (judgment.label === "利弊并见") return "mixed";
  const primary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis);
  if (primary?.effect === "mixed") return "mixed";
  if (primary?.effect === "obstructs") return "caution";
  // A conditional supporting axis does not establish an overall good period.
  return judgment.label === "主题解读" || primary?.effect === "neutral" ? "theme" : "unresolved";
}
export function plainOutlookCaption(judgment: LocalOutlookJudgment | null | undefined, fallback = "尚难判断顺逆"): string {
  if (!judgment) return fallback;
  return plainOutlookLabel(judgment.label, judgment.axes.find(axis => axis.axis === judgment.primaryAxis)?.effect ?? null);
}
export function plainOutlookLabel(label: OutlookJudgmentLabel, primaryEffect: OutlookEffect | null): string {
  if (label === "暂不可判") return "暂不作个人判断";
  if (label === "较顺") return "较顺，值得把握";
  if (label === "有压力") return "较费力，需要留意";
  if (label === "利弊并见" || primaryEffect === "mixed") return "有机会，也有阻力";
  if (primaryEffect === "obstructs") return "较费力，需要留意";
  if (primaryEffect === "assists") return "有可推进的机会";
  return label === "主题解读" || primaryEffect === "neutral" ? "有明确主题，顺逆未定" : "结果尚未明朗";
}
export function plainAnnualYearSegments(year: LocalAnnualYear) {
  return year.judgmentSegments.map(segment => ({ segmentId: segment.id, branchId: segment.branchId, branchLabel: segment.branchLabel,
    startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
    category: category(segment.judgment), caption: plainOutlookCaption(segment.judgment) }));
}

type Words = { topic: string; help: string; pressure: string };
const CAREER: Record<string, Words> = {
  正印: { topic: "学习指导与实际完成", help: "讲解或示范补上不会做的一步，已经开始的事情较容易接着完成", pressure: "资料、说明和修改一轮轮增加，真正做完或拿出来使用的部分容易被推后" },
  偏印: { topic: "专项学习与方法转换", help: "一种不同的办法补上原来的缺口，已有进度较容易接续", pressure: "新旧做法来回切换，原来的进度先停下，新办法却还没有接稳" },
  食神: { topic: "熟练本领与持续完成", help: "熟悉的本领较容易派上用场，做过一次的事情更容易接着完成", pressure: "会做的事情仍在，但连续完成容易被打断，做成一次还难以稳定重复" },
  伤官: { topic: "改法、样例与试用反馈", help: "改法或作品较有利于进入试用，实际做出来更容易让人看清它的价值", pressure: "想法和改法不缺，真正拿来使用却容易卡住，说明与实际接受之间还有距离" },
  正财: { topic: "已有成果的确认与续用", help: "已经做过的成果较有利于得到确认，原约定的回应与后续续用更容易谈清", pressure: "已经做过的部分仍要补说明或重新确认，事情做完与得到回应之间容易隔着一步" },
  偏财: { topic: "不同用途与新的参与", help: "已有成果较有机会用在新的地方，新的参与方式能带来实际反馈", pressure: "新安排占用原来已经排好的时间，参与增加却容易拖住手头的事情" },
  正官: { topic: "明确职责与完成标准", help: "明确要求与自己能做的部分较容易接上，答应的事情更有条件按约完成", pressure: "要求已经明确，执行所需的时间、方法或帮助却没有跟上" },
  七杀: { topic: "集中要求与难点处理", help: "解决难点的方法较能用起来，几项集中的要求有了可行的处理步骤", pressure: "几项要求挤在同一段时间，顾了眼前一项又容易拖住另一项" },
  比肩: { topic: "独立承担与自己的完成范围", help: "自己负责的部分较容易完整做出来，独立尝试能接到实际完成", pressure: "自己的做法与共同安排不同步，想独立完成却仍要等别人的输入" },
  劫财: { topic: "共同参与与分工", help: "共同参与较能补到实际完成，分工与互相帮助更容易落到具体步骤", pressure: "参与和意见增加，决定与执行却分散开来，事情容易卡在分工上" }
};
const WEALTH: Record<string, Words> = {
  正印: { topic: "学习、工具与准备投入", help: "已有知识、工具和准备时间较能用到实处，前期投入更容易继续发挥作用", pressure: "资料、工具或准备时间继续增加，真正用起来的部分却没有同步，投入容易停在等待中" },
  偏印: { topic: "新旧工具和专项学习投入", help: "专项办法补到缺口，原有物品或学习投入不必全部重来", pressure: "新旧工具、材料或方法两头占用，换办法的过程增加了时间和用品的消耗" },
  食神: { topic: "熟练成果的持续使用与维护", help: "已经会做的东西较能持续被使用，重复使用与后续维护更容易接上", pressure: "反复完成所需的时间和用品增加，持续使用却不够稳定，投入与回报不容易同步" },
  伤官: { topic: "试用花费与追加投入", help: "试做较容易显出材料、时间和花费的实际用途，继续投入的范围更容易说清", pressure: "修改和试做继续消耗材料与时间，采用范围却还没明确，追加投入容易反复" },
  正财: { topic: "原约定的费用、回报与续用", help: "已有投入或成果较有利于得到原约定的确认，费用核对、归还与续用更容易分清", pressure: "原约定中的费用或回报仍待核对，已承担的部分与后续责任容易混在一起" },
  偏财: { topic: "新用途的投入与分担", help: "已有成果或物品较有机会接到不同用途，新参与的投入和分担更容易谈清", pressure: "新用途挤占已有时间和物品，临时增加的花费或分担没有同步说清" },
  正官: { topic: "已答应事项的配套投入", help: "已有条件较能对应原约定，时间、用品和实际帮助各有明确用途", pressure: "答应承担的部分增加，配套时间、用品与帮助却没有跟上" },
  七杀: { topic: "集中需要与临时补缺", help: "有限的时间、物品和帮助较能用到关键难点，临时补缺更有着落", pressure: "几件事同时要用同一份时间、物品或帮助，临时补缺容易打乱原来的投入安排" },
  比肩: { topic: "个人使用与共同分担", help: "自己能使用的条件与共同需要较能配合，各自承担的部分更容易分清", pressure: "个人使用与共同分担挤在一起，留给自己的时间或物品又被别处占用" },
  劫财: { topic: "共同投入与追加份额", help: "共同时间和材料较能互相补足，已有投入更容易用到实际需要", pressure: "临时追加的需要牵动原先份额，谁决定、谁补足容易出现分歧" }
};
const groups = (god: string) => ["正印", "偏印"].includes(god) ? "resource" : ["正财", "偏财"].includes(god) ? "wealth" : ["食神", "伤官"].includes(god) ? "output" : ["正官", "七杀"].includes(god) ? "authority" : "peer";

function wordsFor(action: OutlookStemAction, input: PlainOutlookDomainInput, pattern: OutlookAxisFinding): Words {
  const money = input.domain === "wealth", group = groups(action.tenGod);
  const base = (money ? WEALTH : CAREER)[action.tenGod];
  if (!base) throw new Error("白话解读缺少已支持的十神角色。");
  const task = input.task && input.task.preferredPathId === pattern.pathId ? input.task.task : null;
  const moderates = pattern.pathId === "resource-wealth" || task === "wealth_first";
  if (moderates && group === "wealth") return { topic: money ? "资料、工具与学习投入的实际用途" : "已有准备的用途与取舍", help: money ? "重复占用的资料、工具和学习投入较能收拢，必要部分仍能继续使用" : "重复准备较容易减少，真正有用的积累更容易接到实际完成", pressure: "想减少的准备仍被原用途或共同安排占着，省下投入与完成事情还没有接上" };
  if (task === "resource_first") {
    if (group === "wealth") return { topic: action.tenGod === "正财" ? "原约定与必要支持的安排" : "新用途与必要支持的安排", help: "实际用途较能与必需的指导、工具和帮助并行", pressure: money ? `${action.tenGod === "正财" ? "原约定的确认与续用" : "新增用途"}占去了原先留给必要学习、工具或练习的投入，追加承担与原有需要容易相互挤压` : `${action.tenGod === "正财" ? "已有约定的确认和续用" : "新用途"}挤占仍必需的指导、工具或练习时间，事情想往前做，支持却没有跟上` };
    if (group === "resource") return { topic: money ? "必要学习、工具与帮助的投入" : "已经开始的事情所需的具体指导", help: money ? "已有投入较能补到真正缺帮助的一步，必要的学习与工具继续发挥作用" : "必要讲解或帮助较能补上缺口，已经开始的内容有了继续完成的办法", pressure: "仍然离不开的指导或帮助难以按原安排使用，已经开始的事情容易停在缺支持的一步" };
    if (group === "output") return { ...base, pressure: "想继续做出的内容增加，指导、时间和帮助却没有同步，熟悉的事情也难按原节奏完成" };
  }
  if (task === "official_joint" && group === "wealth") return {
    topic: action.tenGod === "正财" ? "原约定确认与执行所需投入" : "新安排与执行所需投入",
    help: "实际投入较能服务于明确要求，必要的方法和帮助仍有位置",
    pressure: `${action.tenGod === "正财" ? "原约定的确认、续用及配套投入" : "新安排的投入"}占用了仍需使用的指导或帮助，但已经答应的要求并没有减少`
  };
  if (["official-resource", "killings-resource"].includes(pattern.pathId) && group === "resource") return { topic: "执行要求所需的方法与帮助", help: "讲解或专项办法较能补到执行步骤，明确要求有了实际做法", pressure: "原来可用的指导或帮助难以接续，但已经答应的要求仍在，执行容易停在缺支持的一步" };
  if (pattern.pathId === "food-killings" && group === "output") return { topic: "应对集中要求的熟练办法", help: "处理难点的办法较有支撑，熟练步骤更容易帮助完成集中的要求", pressure: "自己的表达或熟练做法难以持续发挥，集中的要求却没有减少" };
  if (pattern.pathId === "food-killings" && group === "wealth") return { topic: action.tenGod === "正财" ? "已有成果确认与新增承担" : "新增投入与更多要求", help: "实际投入较能给处理难点的办法留下使用空间", pressure: "投入增加一面可能帮助把办法用起来，一面又带来更多要处理的要求，花了时间或添了条件也未必更省力" };
  const edges = pattern.taskLinks?.items.flatMap(link => link.relations).filter(edge => edge.contributesPressure
    && edge.from.origin.kind === "target" && edge.from.stem === action.stem) ?? [];
  if (edges.some(edge => edge.to.group === "authority")) return { ...base, pressure: "自己的表达或完成方法与既定要求对不上，事情容易卡在按什么标准完成" };
  if (edges.some(edge => edge.to.group === "resource")) return { ...base, pressure: "眼前的安排占用了仍然需要的方法或帮助，已有要求没有减少，执行所需的支持却没接齐" };
  // This existing path treats expression against its authority requirements.
  // Keep that object even when the optional natal task links do not apply.
  if (pattern.pathId === "official-wealth" && group === "output") return { ...base,
    topic: money ? "按约完成所需的时间与用品" : "自己的做法与既定要求",
    pressure: money ? "自己的做法与约定要求不同，已花的时间和用品还要用于调整，完成后的使用与回应也要重新对上" : "自己的表达或熟悉做法与既定要求对不上，想按自己的方式完成，也会碰到不同的完成标准" };
  return base;
}
function actionSentence(action: OutlookStemAction, words: Words): string {
  if (action.effect === "assists") return `${words.help}。`;
  if (action.effect === "obstructs") return `${words.pressure}。`;
  if (action.effect === "mixed") return `${words.help}；但${words.pressure}。`;
  return action.effect === "neutral" ? `这一段围绕${words.topic}展开；这一事项主题本身不单独定顺逆。` : `${words.topic}是这一段的重点，实际进展尚未明朗。`;
}
export function plainOutlookExample(original: string, effect: OutlookStemAction["effect"], domain: AnnualReadingDomainId): string {
  const positive = effect === "assists", pressure = effect === "obstructs" || effect === "mixed";
  const source: Record<string, string> = {
    "若有正在学习的做法：听过解释后自己做一小段，分清缺的是理解还是实际练习。": positive
      ? "若有正在学习的做法：一条讲解补上不会做的步骤，已经停下的事情有了接着做的办法。"
      : pressure ? "若有正在学习的做法：说明和修改继续增加，原本要拿出来使用的部分反而迟迟没有做完。" : "若有正在学习的做法：说明到了实际使用的一步，能独立完成的部分与仍需帮助的地方开始显出差别。",
    "若已有资料或用品：核对哪些正在使用，哪些准备占去了实际练习的时间。": pressure
      ? "若已有资料或用品：材料和工具不断添置，实际使用却没有跟上，时间与物品先花在了等待和修改上。" : positive ? "若已有资料或用品：实际使用显出哪些能继续沿用、哪些暂时用不上，投入开始有了具体去处。" : "若已有资料或用品：到了准备使用的环节，哪些能够沿用、哪些仍缺配套，需要在实际使用中分清。",
    "若已有一个改法：用熟悉的办法做一小段试样，比较它有没有真正处理原来的难点。": positive
      ? "若已有一个改法：方案先在一小段实际事务中试用，使用者的反馈更能指出它比旧办法方便在哪里。" : pressure ? "若已有一个改法：试样与实际使用之间还有差距，新的反馈让方案进入下一轮调整。" : "若已有一个改法：试样面向具体的使用场合，想改变的部分与实际需要开始有了对照。",
    "若准备试一种改法：利用手边材料先做一版，再核对追加用品是否真的有用。": "若准备试一种改法：第一轮试做用掉的材料和时间变得具体，继续采用与追加投入开始需要分开商量。",
    "若已有练熟的步骤：完整做完一轮，再看下一轮能否按相近的方式继续。": positive ? "若已有练熟的步骤：同一套做法较能重复完成，做成一次的经验有了继续使用的空间。" : pressure ? "若已有练熟的步骤：第一轮能做完，下一轮却容易因配合变化而中断，熟悉本领与持续完成还不完全同步。" : "若已有练熟的步骤：同一套步骤进入重复使用，完成一轮与下一轮所需的配合成为两件具体的事。",
    "若用品需要反复使用：区分这一轮已经用掉的部分与下一轮仍可继续使用的部分。": "若用品需要反复使用：消耗、维护与下一轮续用开始分别出现，已经投入的东西哪些还能继续用变得清楚。",
    "若已有完成的作品或约定：对照实际完成的部分获得回应，尚待补做的内容另外列明。": positive ? "若已有完成的作品或约定：对方较容易对已完成部分给出回应，确认后的部分与还要补做的内容开始分开。" : pressure ? "若已有完成的作品或约定：已做部分仍被要求补说明，原约定的确认与下一次承担容易混在一起。" : "若已有完成的作品或约定：已做部分到了需要对照原约定的时候，原完成范围与后续承担分别成为具体话题。",
    "若已有共同费用或借用物品：核对已经承担的部分，归还与继续使用分别确认。": "若已有共同费用或借用物品：已经承担的部分进入确认，归还、继续使用和后续由谁承担成为不同的事项。",
    "若有新的活动或共同安排：先用已有办法参与一小段，再对照它与原来做法的差别。": positive ? "若有新的活动或共同安排：已有做法被用到另一种场合，参与者的实际反馈帮助它找到新的用法。" : pressure ? "若有新的活动或共同安排：已有做法被用到另一种场合，新的参与者和原来答应的事情开始争用时间。" : "若有新的活动或共同安排：原来的做法面对另一种用途，参与范围与具体需要开始显出差别。",
    "若已有物品要用于另一项安排：分清暂时借用与长期占用，各自保留实际使用范围。": "若已有物品要用于另一项安排：临时借用与长期占用的差别开始显出，原安排和新增用途需要分别分担。",
    "若有共同约定：把需要自己做的一步与他人配合的一步分开，核对原有做法还能否使用。": "若有共同约定：自己已经做完的部分开始交给别人接续，分工是否清楚直接影响下一步的进度。",
    "若有共同安排：核对谁能拿出哪些用品和时间，已承诺的部分与新增要求分别说明。": "若有共同安排：已有时间和用品分别被用于不同事项，临时追加的需要与原先答应的份额出现差别。"
  };
  return domain === "relationship" ? original : source[original] ?? original;
}
function briefVerdict(action: OutlookStemAction, words: Words, input: PlainOutlookDomainInput, pattern: OutlookAxisFinding): string {
  const task = input.task?.preferredPathId === pattern.pathId ? input.task?.task : null;
  if (pattern.pathId === "official-wealth" && groups(action.tenGod) === "output" && action.effect === "obstructs") return input.domain === "wealth" ? "时间与用品花在调整，使用与回应还需对齐" : "自己的做法与要求不同，完成标准需要对齐";
  if ((task === "wealth_first" || pattern.pathId === "resource-wealth") && groups(action.tenGod) === "wealth") return action.effect === "assists" ? "重复投入较能收拢，已有准备更能用起来" : action.effect === "obstructs" ? "准备想减却减不下来，实际使用仍被拖慢" : "准备需要按用途取舍，效果尚未明朗";
  if (task === "resource_first" && groups(action.tenGod) === "wealth") return action.effect === "obstructs" ? `${action.tenGod === "正财" ? "原约定" : "新用途"}挤占必要支持，事情较费力` : `${words.topic}，实际进展尚未明朗`;
  if (task === "official_joint" && groups(action.tenGod) === "wealth") return `${action.tenGod === "正财" ? "原约定的确认" : "新安排的推进"}${action.effect === "assists" ? "较有利" : action.effect === "obstructs" ? "较费力，执行支持没跟上" : "仍待具体配套"}`;
  const positives: Record<string,string> = { 正印:"指导补到卡点，事情较能接着做",偏印:"专项办法补缺口，进度较能接续",食神:"熟练本领较有利于持续完成",伤官:"改法与作品较有利于试用",正财:"已有成果较有利于确认与续用",偏财:"已有成果较有机会找到新用途",正官:"明确要求较容易落实",七杀:"处理集中难点较有办法",比肩:"独立完成较有支撑",劫财:"共同参与较容易落到完成" };
  const pressures: Record<string,string> = { 正印:"准备增加，实际完成容易推后",偏印:"方法来回转换，原进度容易中断",食神:"熟练做法难持续，完成容易反复",伤官:"改法有想法，实际采用容易卡住",正财:"已做部分仍待确认，后续容易拖延",偏财:"新安排挤占手头事项",正官:"要求已经明确，执行没有跟上",七杀:"要求集中，事情容易相互挤压",比肩:"独立做事与共同安排不同步",劫财:"参与增加，分工容易卡住" };
  if (input.domain === "wealth") return action.effect === "assists" ? `${words.topic}较有利` : action.effect === "obstructs" ? `${words.topic}较费力` : `${words.topic}是重点`;
  return action.effect === "assists" ? positives[action.tenGod]! : action.effect === "obstructs" ? pressures[action.tenGod]! : action.effect === "mixed" ? `${words.topic}有顺有阻` : `${words.topic}是重点`;
}
function backgroundSentence(pattern: OutlookAxisFinding, money: boolean): string {
  const links = pattern.taskLinks?.items ?? [];
  const edges = links.flatMap(link => link.relations).filter(edge => edge.contributesPressure && edge.from.origin.kind !== "target");
  if (!edges.length) return "";
  const output = edges.some(edge => edge.to.group === "output"), resource = edges.some(edge => edge.to.group === "resource"), authority = edges.some(edge => edge.to.group === "authority");
  const parts: string[] = [];
  if (output) parts.push(money ? "指导、修改或方法转换仍会占用时间和用品，不能只看新增机会" : "原本拿手的做法仍容易被补充指导或方法转换打断，完成事情和处理难点都会慢下来");
  if (resource) parts.push("原来仍需使用的方法或帮助还有接不上的地方，新的进展不能代替这部分支持");
  if (authority) parts.push("原有要求与实际做法仍有冲突，职责更明确也不等于执行更轻松");
  return parts.length ? `同时，${parts.join("；")}。` : "";
}
function relationText(input: PlainOutlookDomainInput): string | null {
  const timing = input.relationshipTiming;
  if (!timing) return null;
  if (timing.sourceBinding.revisionId !== input.judgment.sourceBinding.revisionId
    || timing.sourceBinding.chartResultHash !== input.judgment.sourceBinding.chartResultHash
    || timing.scope.startInstant !== input.judgment.interval.startInstant || timing.scope.endExclusiveInstant !== input.judgment.interval.endExclusiveInstant) throw new Error("关系白话解读与原判断时段不一致。");
  const signals = timing.lenses.flatMap(lens => lens.signals).filter(signal => signal.source === "year");
  if (!signals.length) return "本年没有新增的具体关系线索，已有相处状态仍是阅读重点。";
  if (signals.some(signal => signal.kind === "palace_contact" && signal.relationType === "branch_six_clash")) return "关系上的共同安排和相处边界是本年重点，可能出现原计划需要调整、两个人的节奏需要重新商量的情形。";
  if (signals.some(signal => signal.kind === "palace_contact" && signal.relationType === "branch_six_combination")) return "本年关系上的共同安排更突出，具体表现可落在一起安排时间、商量分工或重新明确彼此期待。";
  return "本年感情上的重点是把期待和回应说清。若正在发展关系，重点在彼此回应；若已有伴侣，重点在原先说好的事能否落实。谈婚安排的线索与实际成婚分开看，这里不直接断定结婚或分手。";
}
/** Pure reading projection. Direction and every original remain unchanged. */
export function buildPlainOutlookDomainReading(input: PlainOutlookDomainInput): PlainOutlookDomainReading | null {
  const { judgment, age, domain, original } = input;
  if (age.stage === "before_birth") return null;
  const pattern = judgment.axes.find(axis => axis.axis === "pattern"), actions = pattern?.stemActions?.items;
  if (!pattern || !actions || actions.length !== 2) return null;
  const visible = actions.find(action => action.visibility === "visible"), hidden = actions.find(action => action.visibility === "main_hidden");
  if (!visible || !hidden) return null;
  if (input.task?.preferredPathId && input.task.preferredPathId !== pattern.pathId) throw new Error("白话解读的财印任务与原路径不一致。");
  const child = age.stage === "young_child" || age.stage === "youth", safeAge = age.stage === "adult" && age.segments.every(segment => segment.stage === "adult");
  const dailyRole = input.appliedWork === "retired" || input.appliedWork === "caregiving", student = input.appliedWork === "student";
  const label = domain === "relationship" ? child ? "同伴相处" : "感情" : domain === "career" ? child ? "学习与活动" : dailyRole ? "日常事务" : student ? "学习与实践" : !safeAge ? "做事与配合" : "事业与做事" : child || !safeAge ? "时间与用品" : "财务与回报";
  let summary: string;
  if (domain === "relationship") {
    if (!safeAge) return null;
    const value = relationText(input); if (!value) return null; summary = value;
  } else {
    const front = wordsFor(visible, input, pattern), back = wordsFor(hidden, input, pattern);
    summary = actionSentence(visible, front);
    const hiddenSentence = actionSentence(hidden, back);
    if (hidden.tenGod !== visible.tenGod && ["assists", "obstructs", "mixed"].includes(hidden.effect) && !summary.includes(hiddenSentence)) summary += `另外，${hiddenSentence}`;
    const background = backgroundSentence(pattern, domain === "wealth");
    if (background) summary += background;
    else if (["mixed", "obstructs"].includes(pattern.effect) && !actions.some(action => ["mixed", "obstructs"].includes(action.effect))) summary += "这些进展之外仍有需要解决的问题，不能只看顺利的一面。";
    if (safeAge && domain === "wealth" && ["食神", "伤官"].includes(visible.tenGod) && visible.effect === "assists") summary += "这里说的是成果使用和投入安排，并未据此判断收入已经增加。";
    const forStage = (value: string, stage: string) => stage === "young_child" || stage === "youth" ? value
      .replaceAll("费用核对", "物品的使用").replaceAll("费用或回报", "物品和回应").replaceAll("花费", "用品消耗").replaceAll("成果", stage === "young_child" ? "做完的小事" : "已做的练习或作品")
      .replaceAll("回报", "使用回应").replaceAll("既定要求", "活动约定").replaceAll("职责", "活动约定").replaceAll("资料、课程", "说明、练习").replaceAll("学习投入", "练习时间") : value;
    if (age.segments.length > 1) summary = age.segments.map(segment => `${segment.label}：${forStage(summary, segment.stage)}`).join("\n");
    else summary = forStage(summary, age.stage);
    if (dailyRole) summary = `${input.appliedWork === "caregiving" ? "照料与家务安排中" : "日常活动和已经答应的事情中"}，${summary}`;
    else if (student) summary = `学习与实践中，${summary}`;
  }
  const basisRefs: AnnualLifeStoryBasisRef[] = judgment.axes.flatMap(axis => [{ axisId: axis.id, field: "summary" as const },
    ...(["evidence", "blockers", "rescues", "satisfiedConditions", "unresolvedConditions"] as const).flatMap(field => axis[field].map((_value, index) => ({ axisId: axis.id, field, index })))]);
  const headline = `${label}：${domain === "relationship" ? "期待与共同安排" : briefVerdict(visible, wordsFor(visible, input, pattern), input, pattern)}`;
  return { version: PLAIN_OUTLOOK_READING_VERSION, domain, headline: child ? headline.replaceAll("费用", "物品使用").replaceAll("回报", "回应").replaceAll("成果", "已做的小事").replaceAll("职责", "活动约定") : headline,
    summary, paragraphs: [...original.paragraphs], examples: safeAge && input.horizon === "year" && !input.appliedWork ? original.examples.map(example => plainOutlookExample(example, visible.effect, domain)) : [...original.examples], conditions: [...original.conditions], evidence: [...original.evidence],
    sourceBinding: structuredClone(judgment.sourceBinding), scope: structuredClone({ targetRef: judgment.targetRef, backgroundRefs: judgment.backgroundRefs, interval: judgment.interval }),
    originals: structuredClone(original), basisRefs };
}
