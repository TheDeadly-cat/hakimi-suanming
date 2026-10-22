/** Frozen compatibility-only implementation. Original SHA-256: 79d1571c9fb8953caf2e80bd011cb2ee7c369ea8ea1d6006d7eb7102f087725f.
 * Never use this module for current automatic reading output. Import paths only are relocated. */
import type { AnnualEventReadingProseInput, AnnualEventReadingProse } from "./annual-event-reading-prose";
import type { ReadingContextRelationship } from "../local-reading-context";
import type { AnnualRelationshipSignal } from "../annual-relationship-signals";
import type { AnnualRelationshipTiming, AnnualRelationshipTimingLens } from "../annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, type AnnualRelationshipNatalContext } from "../annual-relationship-natal-context";

type Topic = Pick<AnnualEventReadingProse, "title" | "summary" | "examples" | "reasoning">;
const YOUNGER_JOINED: Record<"young_child" | "youth" | "adult_transition" | "unknown", Topic> = {
  young_child: { title: "熟悉的照料与共同活动形成配合", summary: "本年的相处主题落在照料、陪伴与共同活动怎样配合。先让孩子熟悉谁来回应、何时一起活动，再把接送与交接安排成稳定的日常。",
    examples: ["家人一起安排接送、陪伴或游戏时，明确主要照料者与替补，让回应方式尽量一致", "共同活动逐渐固定下来后，观察孩子喜欢怎样参与，再调整活动时间和陪伴方式"] },
  youth: { title: "同伴活动与家人约定更具体", summary: "本年重点是把与家人、同伴已经商量的事情落实。共同活动、参与时间和各自负责的部分说清后，更容易知道怎样一起完成，也能保留个人安排。",
    examples: ["同伴共同准备一次活动或作品时，确定每个人负责的部分和一起完成的时间", "与家人约定外出、活动或回家时间，把自己希望参与的内容与需要的帮助一并说清"] },
  adult_transition: { title: "更自主的相处与共同约定落实", summary: "这一年龄过渡段更重视把自主参与和共同约定接起来。与家人或同伴商量的计划，需要同时明确自己的决定范围、愿意承担的部分和仍需要的支持。",
    examples: ["共同活动或实践计划开始落实时，说明自己负责什么、哪些决定仍需与家人或同伴协商", "生活安排更自主后，重新约定联系与共同参与的时间，让独立空间和已有承诺都能落实"] },
  unknown: { title: "已有联系与共同约定具体落实", summary: "本年按实际已有的联系与共同事项阅读，重点是把口头约定落实为时间、参与方式与完成范围。具体对象沿实际参与者和已经存在的事项确定。",
    examples: ["已有共同事项时，确认参与者、具体时间与各自负责的部分，把待商量和已确认的内容分开", "共同活动逐渐固定后，确认哪些安排愿意继续，哪些需要保留个人决定空间"] }
};
const YOUNGER_CLASH: typeof YOUNGER_JOINED = {
  young_child: { title: "照料节奏与交接方式调整", summary: "本年的相处重点是照料与熟悉节奏怎样调整。接送、陪伴或回应方式需要改变时，先把交接说清，让孩子知道接下来由谁陪伴、会怎样安排。",
    examples: ["若接送、作息或陪伴安排改变，家人确认交接时间、日常习惯与临时替补，减少前后做法不一致", "孩子的参与方式或回应需要变化时，照料者通过一起活动了解需要，再调整陪伴与休息节奏"] },
  youth: { title: "同伴相处、活动时间与分工重排", summary: "本年重点是调整原来不再合适的相处和参与方式。同伴分工、活动时间或家人约定有变化时，先说明哪里难以继续，再把新的安排具体谈清。",
    examples: ["共同活动的时间或分工改变后，重新确认各自负责什么，避免仍按旧约定互相等待", "自己希望参与的活动与家人安排冲突时，分别说明时间、往返和所需帮助，商量可执行的调整"] },
  adult_transition: { title: "独立空间与原有共同安排重谈", summary: "这一年龄过渡段先处理更自主的生活与原有约定之间的落差。联系频率、活动参与或家人分工需要调整时，分清希望自己决定的部分和仍需共同配合的部分。",
    examples: ["作息或参与范围变化后，与家人、同伴重定联系时间和共同事项，不把临时变动当成原承诺全部取消", "一项计划需要更多自主决定时，确认自己承担的后续责任，以及仍需要别人协助的具体环节"] },
  unknown: { title: "相处时间、参与范围与共同约定调整", summary: "本年先对照实际已有的共同安排，找出哪项时间、参与范围或分工不再合适。把需要改变的部分与仍愿意维持的约定分开，再确定新的执行方式。",
    examples: ["已有共同事项难以沿原日程推进时，重新确认时间、交接和由谁告知变动", "参与者需要的空间或投入范围不同，把共同决定与各自决定的事项分开说明"] }
};
const JOINED: Record<ReadingContextRelationship, Topic> = {
  single: { title: "从已有认识走向约见与期待确认", summary: "单身且现实中已有接触时，本年重点是把聊天落实为一次双方愿意的约见，再确认彼此继续了解的期待。具体相处比仅凭联系频繁更能说明双方期待。",
    examples: ["已有认识对象时，商定一次双方都方便的见面或共同活动，观察是否愿意继续安排下一次", "接触逐渐熟悉后，分别说明希望怎样相处、投入多少时间，确认对关系的理解是否一致"] },
  partnered: { title: "把交往承诺落实为共同计划", summary: "按已有伴侣背景，本年重点是把双方认可的下一步变成可执行的计划。见面、共同出行或相处安排，需要同时确定时间和各自负责的部分。",
    examples: ["将已经讨论过的共同活动排进双方日程，分别确认谁准备、何时共同决定", "谈下一阶段相处计划时，把已经达成的约定与仍需考虑的部分列开，避免一方当作定案、一方仍在试探"] },
  married: { title: "共同生活计划落到家务、居住与时间", summary: "按已婚背景，本年先把共同生活中已经认同的计划做实。居住空间、家务和陪伴时间由谁持续承担，比口头同意更需要具体安排。",
    examples: ["一项居住或家庭出行计划进入实际准备时，确认时间、使用空间及后续维护分工", "把家务和共同时间安排成双方可执行的日程；如有照料事项，一并确认主要负责人与替补"] },
  separated: { title: "必要联络形成约定，交接事项逐项完成", summary: "按已分开背景，本年的靠近线索先用于仍需协作的现实事项。把必要联络、物品或共同安排谈成明确约定，不从能够协商推断恢复伴侣关系。",
    examples: ["仍有物品需要归还或交接时，确认清单、时间和交接方式，完成一项就明确一项", "如仍有共同照料或日程事项，约定必要联系的渠道与处理范围，其他生活由各自安排"] },
  unspecified: { title: "把已有交往或共同安排落实到下一步", summary: "关系状态未填写，本年先对照现实中已经存在的联系：已有伴侣可落实共同计划；单身且已有接触可安排约见、确认期待。没有这些背景时，就看家人、朋友或同住者的共同安排。",
    examples: ["若已有伴侣：将一项共同计划落到具体时间与分工，区分已同意的部分和待商量的部分", "若单身且已有认识对象：通过一次双方愿意的约见了解期待；没有交往对象时，对照家人或朋友的共同活动"] }
};
const CLASH: Record<ReadingContextRelationship, Topic> = {
  single: { title: "交往期待与个人生活节奏重新匹配", summary: "单身且已有接触时，本年重点是重新匹配见面频率、回应方式与个人空间。先看原安排哪里不适合，再决定怎样继续了解；安排改变本身不说明关系应当结束。",
    examples: ["已有接触对象时，比较彼此能见面的时间和期望频率，重新商定一种双方能持续的方式", "若尚无交往对象：调整与朋友、家人或同住者的相处时间，分清愿意共同参加与希望独处的安排"] },
  partnered: { title: "相处频率与原有承诺重新对齐", summary: "按已有伴侣背景，本年先处理原来约定与实际生活之间的落差。见面、联系频率或共同计划需要重谈执行方式，把临时调整与双方仍认可的承诺分开。",
    examples: ["一方作息或往返安排改变后，重定见面与联系时间，说明临时变动怎样提前告知", "共同出行或下一阶段计划难以按原方案推进时，分别确认哪些仍保留、哪些需要改期或重做分工"] },
  married: { title: "家务、居住与共同时间重新安排", summary: "按已婚背景，本年重点是重排共同生活的实际分工。作息、居住使用或照料安排变化时，先处理谁承担什么、怎样交接，再讨论各自需要保留的时间。",
    examples: ["生活节奏变化后，重新分配家务、空间使用和陪伴时间，避免仍沿用已经难以执行的旧分工", "如有家庭出行或照料调整，确认交接、替补与临时变动通知方式，让双方知道哪部分需要接手"] },
  separated: { title: "必要联系与物品交接重新划清边界", summary: "按已分开背景，本年先把必须共同处理的事与各自独立生活分开。联系频率、交接时间或剩余安排不适合时，逐项调整边界，不把每一次必要联络延伸成新的日常约束。",
    examples: ["交接物品、场所使用或既定日程需要改变时，重新确认清单、时间与明确的联系渠道", "仍需共同处理的事项约定何时联系、由谁确认完成；其余安排留给各自决定"] },
  unspecified: { title: "亲近关系中的时间、空间与分工重排", summary: "关系状态未填写，本年先看现实里哪一项共同安排需要调整。已有伴侣可对照相处或家务分工；单身有接触可对照约见与个人空间；没有伴侣背景时不套用夫妻事件。",
    examples: ["若已有伴侣：核对哪项见面、家务或共同计划已不适合当前日程，重新确认谁负责什么", "若单身且有接触：商量联系频率和个人空间；若没有交往对象，则对照家人、朋友或同住者的具体安排"] }
};
const sameScope = (a: AnnualRelationshipSignal, b: AnnualRelationshipSignal) => a.segmentId === b.segmentId && a.branchId === b.branchId
  && a.natalPosition === b.natalPosition && a.natalGanZhi === b.natalGanZhi
  && Number.isFinite(Date.parse(a.startInstant)) && Date.parse(a.startInstant) === Date.parse(b.startInstant)
  && Number.isFinite(Date.parse(a.endExclusiveInstant)) && Date.parse(a.endExclusiveInstant) === Date.parse(b.endExclusiveInstant);

function backgroundTopic(input: AnnualEventReadingProseInput, relation: ReadingContextRelationship): string {
  const signals = input.relationshipSignals ?? [];
  const anchors = signals.filter((signal) => signal.source === "year" && signal.natalPosition === "day"
    && (signal.relationType === "branch_six_combination" ? input.hasDayBranchCombination : input.hasDayBranchClash));
  if (anchors.length !== 1) return "";
  // The model supplies exact facts. A legacy boolean alone cannot lend another
  // branch or another handover period to this sentence.
  const background = signals.filter((signal) => signal.source === "dayun" && sameScope(anchors[0]!, signal));
  if (!background.length) return "";
  const joined = background.some((signal) => signal.relationType === "branch_six_combination"), clash = background.some((signal) => signal.relationType === "branch_six_clash");
  const labels = [...new Set(background.map((signal) => `${signal.ganZhi}大运`))].join("、");
  const subject = input.age.stage === "adult" ? ({ single: "已有接触的频率与个人空间", partnered: "共同计划与日常相处节奏", married: "共同生活计划与家务、居住分工", separated: "必要协作与各自生活的边界", unspecified: "现实中已有的共同安排" })[relation]
    : input.age.stage === "young_child" ? "照料交接与熟悉节奏" : input.age.stage === "youth" ? "同伴活动与家人约定"
      : input.age.stage === "adult_transition" ? "逐步独立的安排与家人同伴的配合" : "实际已有的联系与共同安排";
  if (input.hasDayBranchCombination && clash) return `本段${labels}另有日支六冲背景，${subject}同时带着重排任务：本年共同安排的落实，要与旧安排怎样调整一起处理。`;
  if (input.hasDayBranchClash && joined) return `本段${labels}另有日支六合背景，${subject}仍有需要配合的部分：本年先改不适用的执行方式，不把日程或分工变化直接当作关系结论。`;
  return joined ? `本段${labels}也有日支六合背景，${subject}可作为持续配合的主题；本年先落实一项已有参与者能执行的安排，再看是否适合延续。`
    : `本段${labels}也有日支六冲背景，${subject}需要分步骤重排；先解决眼前最不适用的一项，不把所有共同约定一起推倒。`;
}

type TimingMode = "entry" | "joined" | "clash";
const TIMING_ADULT: Record<ReadingContextRelationship, Record<TimingMode, Topic>> = {
  single: {
    entry: { title: "新的认识与关系期待进入视野", summary: "这一年的关系主题更集中在新的认识、重新联系与主动表达期待。一般往来能否转成持续接触，会比仅有聊天或短暂热络更值得对照。",
      examples: ["朋友介绍、共同活动或日常往来中出现进一步了解的接触，开始讨论是否再见面", "原本没有明确方向的联系，转为表达想怎样相处、愿意投入多少时间"] },
    joined: { title: "从认识走向稳定交往", summary: "这一年的关系主线从认识与往来转向持续相处、确认彼此期待。推进点在于能否把聊天变成具体约见，把好感落实为双方认可的联系节奏。",
      examples: ["新的认识或重新联系进入单独约见，双方开始安排下一次共同活动", "接触逐渐稳定后，讨论是否继续专注了解，以及彼此认可的关系边界"] },
    clash: { title: "认识机会与相处节奏同时变化", summary: "这一年接触与关系期待的主题，与时间、距离或个人空间的调整同时出现。新的了解可以展开，但是否愿意继续，会更直接地取决于双方能否找到持续相处的方式。",
      examples: ["认识新的人或恢复联系时，发现见面频率、往返距离与各自日程需要重新匹配", "互动从一般往来转深后，对回应速度、独处时间或投入范围的不同期待进入讨论"] }
  },
  partnered: {
    entry: { title: "关系期待与持续投入更明确", summary: "已有交往中，下一步期待与持续投入成为本年更明确的题目。原来含糊的承诺会落实到相处时间、双方愿意承担的部分，以及是否准备推进共同安排。",
      examples: ["原来只笼统谈过的下一步，开始涉及见面频率、参与彼此生活和共同时间", "一方表达更明确的期待，双方讨论怎样维持联系、分担准备和兑现约定"] },
    joined: { title: "交往承诺进入共同计划", summary: "本年更适合对照交往中的下一步如何具体化：共同出行、生活安排或对关系的确认，从口头意愿进入双方能够执行的计划。推进取决于两人实际达成的约定。",
      examples: ["共同活动或下一阶段计划进入排期，参与范围与各自负责的部分逐渐明确", "双方开始确认对关系的共同理解，讨论哪些承诺已经接受、哪些仍需时间"] },
    clash: { title: "更明确的关系期待伴随相处方式调整", summary: "本年关系期待与相处方式的差异更需要一起处理。推进关系的同时，见面、联系或共同计划也可能需要改期、重新分工，不能把愿意靠近等同于原安排都适合。",
      examples: ["下一步计划被提上日程后，双方发现作息、往返或投入时间仍需重新安排", "更明确的承诺带来新的分工，原先默认的联系频率与独立空间开始需要重谈"] }
  },
  married: {
    entry: { title: "共同生活中的投入与责任更受关注", summary: "已婚背景下，本年的关系主题落在共同生活需要怎样持续投入。陪伴、费用与日常责任之间的配合，会比单独增加某一种付出更直接地影响双方对承诺的理解。",
      examples: ["共同计划需要更多时间或费用时，原来没有说明的分担方式进入讨论", "一方对陪伴或承担提出更明确的期待，双方重新核对能够持续做到的部分"] },
    joined: { title: "共同生活计划进入落实阶段", summary: "本年更值得对照共同生活计划从认同走向落实的变化。家务、居住使用和共同时间需要形成彼此认可的安排，承诺能否持续兑现成为具体落点。",
      examples: ["居住、家庭出行或已有共同计划进入实际准备，时间与后续维护责任逐渐具体", "共同时间或家务安排固定下来后，双方确认主要负责人与临时调整方式"] },
    clash: { title: "共同承诺与家务居住节奏一起调整", summary: "本年共同承诺的主题与生活节奏调整并存。投入期待更明确时，家务、居住空间或陪伴时间也需要重新配合；实际分工的改变不直接说明婚姻结果。",
      examples: ["一项共同计划推进时，原有作息、空间使用或家务分工已难沿用，双方重排安排", "照料或陪伴需求改变后，主要负责人与替补交接更明确，同时保留各自时间"] }
  },
  separated: {
    entry: { title: "必要联络中的投入与承诺重新明确", summary: "已分开背景下，本年的关系线索先对应仍有往来的事项。必要联系、剩余投入和已经答应的责任可能更明确，能否协作与是否恢复伴侣关系是两件事。",
      examples: ["物品、共同费用或既定安排仍需处理时，双方确认愿意履行的范围", "必要联络重新出现，联系渠道、处理期限和完成标准变得更清楚"] },
    joined: { title: "交接与必要协作形成具体约定", summary: "本年更贴近把仍需共同处理的事情谈成可执行的约定。物品交接、已有日程或共同责任可以逐项落实，协商顺畅也不等于复合。",
      examples: ["剩余物品或事项确定交接时间和方式，完成一项便明确一项", "仍有共同照料或日程责任时，必要联系的范围与分工更具体"] },
    clash: { title: "必要联系与独立生活边界重新安排", summary: "本年仍需处理的联系与各自生活节奏可能同时变化。交接、费用或剩余安排更需要明确边界，哪些必须共同决定、哪些各自处理会成为具体问题。",
      examples: ["交接时间或既定安排改变后，联系频率与处理范围需要重新确认", "一方希望改变剩余责任的承担方式，双方区分共同事项与独立生活安排"] }
  },
  unspecified: {
    entry: { title: "新的接触或已有关系的期待更明确", summary: "本年的关系主题落在接触、投入与承诺怎样进入实际生活。单身时可对照新的认识或重新联系；已有伴侣时，则对应期待更明确以及愿意怎样持续投入。",
      examples: ["若单身：新的认识、重新联系或主动表达期待，开始进入持续接触的讨论", "若已有伴侣：共同时间、投入范围或下一步期待逐渐明确；已分开则只对照必要联络"] },
    joined: { title: "相识或共同计划走向具体确认", summary: "本年星与宫的两层线索同时指向关系议题的具体化。单身时可对照从认识到持续约见；已有伴侣时，则看共同计划与关系期待是否形成双方认可的约定。",
      examples: ["若单身：新的认识或已有联系开始落实约见，双方确认是否愿意继续了解", "若已有伴侣：共同计划进入排期与分工；已分开时只对照仍需协作的现实事项"] },
    clash: { title: "关系接触与相处安排同时变化", summary: "本年接触或承诺的主题，与共同时间和个人空间的调整并存。单身时可对照新认识与相处节奏是否适合；已有伴侣时，则看推进计划时哪些原安排需要重谈。",
      examples: ["若单身：新的接触与见面频率、距离或个人空间的取舍同时出现", "若已有伴侣：原有计划与生活节奏需要重新匹配；已分开时只处理必要联系和交接"] }
  }
};

function stellarBackground(lens: AnnualRelationshipTimingLens, adult: boolean): string {
  const signals = lens.signals.filter((signal) => signal.source === "dayun" && lens.backgroundSignalIds.includes(signal.id) && signal.kind !== "palace_contact");
  if (!signals.length) return "";
  if (!adult) return `本段${[...new Set(signals.map((signal) => `${signal.ganZhi}大运`))].join("、")}另有${[...new Set(signals.map((signal) => `${signal.stem ?? ""}${signal.tenGod ?? ""}${signal.kind === "star_stem_contact" ? "与原透干互动" : signal.kind === "hidden_to_visible" ? "与原藏位同字对应" : "明透"}`))].join("、")}的事实背景；共同参与、回应与分工仍按这个时段区别阅读，不据背景新增另一件年度事项。`;
  return `同段星干背景另列：${[...new Set(signals.map((signal) => signal.text))].join("")}这些配合属于本段大运背景，会使投入或承诺的牵连需要分别处理；不另算作今年新增的一次相遇。`;
}

function timingBackground(lens: AnnualRelationshipTimingLens, mode: TimingMode, adult: boolean): string {
  const signals = lens.signals.filter((signal) => signal.source === "dayun" && lens.backgroundSignalIds.includes(signal.id));
  const palace = signals.filter((signal) => signal.kind === "palace_contact"), labels = [...new Set(palace.map((signal) => `${signal.ganZhi}大运`))].join("、");
  const stellar = stellarBackground(lens, adult);
  if (!labels) return stellar;
  const joined = palace.some((signal) => signal.relationType === "branch_six_combination"), clash = palace.some((signal) => signal.relationType === "branch_six_clash");
  const subject = adult ? "相处时间、个人空间与共同分工" : "参与时间、回应方式与共同安排";
  if (mode === "joined" && clash) return `本段${labels}另有日支六冲背景，${subject}仍有调整任务；本年计划的落实，要与旧安排的重排一起处理。${stellar}`;
  if (mode === "clash" && joined) return `本段${labels}另有日支六合背景，${subject}仍有持续配合的一面；本年的变化不等于所有原有约定一起结束。${stellar}`;
  return (joined ? `本段${labels}的日支六合是持续背景，${subject}仍围绕共同配合展开，不另算一次年度相遇。`
    : `本段${labels}的日支六冲是持续背景，${subject}需要给调整留出空间，不将背景另写成今年新增的结果。`) + stellar;
}

function palaceOnlyStellarBackground(input: AnnualEventReadingProseInput): string {
  const timing = input.relationshipTiming;
  if (!timing?.triggered) return "";
  return timing.lenses.filter((lens) => lens.focus === "annual_focus").map((lens) => {
    const text = stellarBackground(lens, input.age.stage === "adult");
    return text && timing.lenses.length > 1 ? `${lens.label}：${text}` : text;
  }).filter(Boolean).join(" ");
}

function youngerTimingTopic(input: AnnualEventReadingProseInput, mode: TimingMode): Topic {
  const early = input.age.stage === "young_child", unknown = input.age.stage === "unknown", transition = input.age.stage === "adult_transition";
  const subject = early ? "照料与陪伴" : unknown ? "联系与共同事项" : "同伴活动与家人约定";
  const title = mode === "joined" ? `${subject}进入更具体的配合` : mode === "clash" ? `${subject}与参与节奏同时调整` : `新的${subject}进入日常`;
  const summary = mode === "joined" ? `${early ? "照料者之间的配合和共同活动" : unknown ? "参与者之间的联系与共同计划" : "同伴交流、共同活动与家人安排"}更需要落实为稳定的参与方式，谁来回应、何时一起完成会成为具体落点。`
    : mode === "clash" ? `${subject}有了新的参与或期待时，原来的时间、分工和回应方式也可能不再合适。新的联系与日常节奏如何衔接，是本段更明确的主题。`
    : `${subject}出现新的参与、回应或期待，重点是这些联系如何进入实际日常。${transition ? "逐步自主的决定与仍需家人同伴配合的部分分别保留。" : ""}`;
  const examples = early ? [mode === "clash" ? "照料或活动参与有了变化，接送、陪伴与熟悉的作息需要重新配合" : "新的陪伴、共同活动或照料参与进入日常，孩子逐渐熟悉由谁回应",
    mode === "joined" ? "家人把共同活动和交接安排固定下来，回应方式与临时替补更清楚" : "孩子与参与者的互动方式变化，家人需要说明陪伴时间和交接安排"]
    : unknown ? [mode === "clash" ? "新的联系或参与要求出现时，原有时间和分工需要调整" : "新的认识或共同事项进入日程，参与者开始确认愿意继续投入的范围",
      mode === "joined" ? "共同计划从口头讨论进入排期，谁负责什么逐渐明确" : "参与者对联系频率或回应方式的期待不同，实际安排成为讨论内容"]
      : [mode === "clash" ? "新同伴活动与原有学习、家庭日程不一致，参与时间与分工重新安排" : "新同伴或共同活动进入生活，参与方式与各自负责的部分逐渐明确",
        mode === "joined" ? "同伴计划得到家人配合后，活动时间与所需帮助形成具体约定" : "自主参与的期待增加，与家人或同伴讨论哪些由自己决定、哪些仍需共同配合"];
  return { title, summary, examples };
}

function timingTopic(input: AnnualEventReadingProseInput): Topic | null {
  const timing: AnnualRelationshipTiming | undefined = input.relationshipTiming;
  if (!timing?.triggered) return null;
  const active = timing.lenses.filter((lens) => lens.focus === "annual_focus");
  // Palace-only calls retain the previous yearly/background interpretation.
  if (!active.some((lens) => lens.signals.some((signal) => signal.source === "year" && lens.triggerSignalIds.includes(signal.id) && signal.kind !== "palace_contact"))) return null;
  const adult = input.age.stage === "adult", relation = input.appliedRelationship ?? "unspecified";
  const readings = timing.lenses.map((lens): { lens: AnnualRelationshipTimingLens; topic: Topic } => {
    const year = lens.signals.filter((signal) => signal.source === "year" && lens.annualSignalIds.includes(signal.id));
    const entry = year.find((signal) => signal.kind === "star_entry" && signal.relevance === "primary_star");
    const contacts = year.filter((signal) => signal.kind === "star_stem_contact" && lens.triggerSignalIds.includes(signal.id));
    const contact = contacts.find((signal) => signal.relevance === "primary_star") ?? contacts[0];
    const joined = year.some((signal) => signal.kind === "palace_contact" && signal.relationType === "branch_six_combination");
    const clash = year.some((signal) => signal.kind === "palace_contact" && signal.relationType === "branch_six_clash");
    const mode: TimingMode = clash ? "clash" : joined ? "joined" : "entry";
    if (lens.focus !== "annual_focus") return { lens, topic: { title: `${lens.label}未新增年度窗口`, summary: `本年没有独立的年度触发；${lens.focus === "background_only" ? "已有大运信号只作为本段持续背景保留。" : "不从另一视角借入同一个关系结论。"}`, examples: [] } };
    if (!entry && !contact) {
      const original = adult ? (joined ? JOINED : CLASH)[relation]
        : (joined ? YOUNGER_JOINED : YOUNGER_CLASH)[input.age.stage === "before_birth" || input.age.stage === "adult" ? "unknown" : input.age.stage];
      return { lens, topic: { title: original.title, summary: `${original.summary}${adult ? "本视角没有本年主配偶星明透的触发" : "这一路没有新增的年度角色触发"}，上述只据本年日支互动。${timingBackground(lens, mode, adult)}`, examples: [...original.examples] } };
    }
    const base = adult ? TIMING_ADULT[relation][mode] : youngerTimingTopic(input, mode);
    let title = base.title, summary = base.summary, examples = [...base.examples];
    if (!entry && contact) {
      title = adult ? clash ? "原有承诺与相处节奏同时调整" : joined ? "原有投入与承诺进入共同安排" : "原有投入与关系承诺受到牵动" : "原有参与和共同约定受到牵动";
      summary = adult ? `本年更明确的是原有投入、期待或承诺需要重新配合。${relation === "single" ? "一般往来与进一步了解的期待是否一致，会进入具体讨论；不把相关财星的作用直接写成对象出现。" : relation === "separated" ? "仍需处理的联系和交接可能重新议定范围，必要协作不等于恢复伴侣关系。" : "共同安排中已经答应的部分与仍可商量的部分，需要重新区分。"}` : `${base.summary}本年触及的是已见角色之间的配合，不从传统星名套用成年关系经历。`;
      if (adult) examples = relation === "single" ? ["接触中的时间投入或相处期待被重新谈起，双方区分一般往来与进一步了解", "原有协作或共同安排牵动个人日程，是否继续投入成为具体选择"]
        : relation === "separated" ? ["剩余交接或必要联系出现新的安排要求，双方重新确认处理范围", "已经答应的责任与各自独立生活相互影响，需要明确可协商的部分"]
          : ["共同计划里的时间、费用或责任互相牵动，原先口头同意的内容需要重新明确", "一方对既有约定提出不同理解，双方开始区分必须履行与可以调整的部分"];
    }
    const signalLead = adult && entry ? `本年${entry.stem}${entry.tenGod}明透${joined ? "，并有日支六合" : clash ? "，并有日支六冲" : ""}。`
      : adult && contact ? contacts.map((signal) => signal.text).join("") + (clash ? "本年还见日支六冲，相处时间与原有日程需要同时配合。" : joined ? "本年还见日支六合，具体的共同安排也进入这一主题。" : "") : "";
    const roleDetail = adult && entry?.tenGod === "七杀" ? "七杀视角着重要求与推进节奏：愿意靠近、希望多快推进和能够承担到哪里，是不同问题。"
      : adult && entry?.tenGod === "正官" ? "正官视角着重持续约定：关系期待能否形成双方认可、可持续履行的承诺，是具体分界。" : "";
    const appeared = adult && year.some((signal) => signal.kind === "hidden_to_visible" && signal.relevance === "primary_star") ? "原局只在支内的同字线索本年明透，表示观察位置由藏转显，不表示这是第一次相识或首次有感情。" : "";
    return { lens, topic: { title, summary: `${summary}${signalLead}${roleDetail}${appeared}${timingBackground(lens, mode, adult)}`, examples } };
  });
  if (readings.length === 1) return readings[0]!.topic;
  return { title: adult ? "财与官杀两种关系视角分别对照" : "不同传统视角下的共同参与与安排",
    summary: readings.map(({ lens, topic }) => `${lens.label}：${topic.summary}`).join("\n\n"),
    examples: readings.flatMap(({ lens, topic }) => topic.examples.map((example) => `${lens.label}：${example}`)) };
}

type NatalLens = AnnualRelationshipNatalContext["lenses"][number];
type PalaceGroup = AnnualRelationshipNatalContext["dayPalace"]["roleGroup"];
const NATAL_POSITION = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;
const NATAL_RELATION = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" } as const;

function natalReasoning(context: AnnualRelationshipNatalContext, lens: NatalLens, timing: AnnualRelationshipTimingLens): string[] {
  const presenceText = (role: string, value: NatalLens["primary"]) => `${lens.label}${role}（${value.tenGods.join("、") || "无另列角色"}）：${value.presence === "visible" ? "已有明透" : value.presence === "hidden_only" ? "仅在支藏" : "所选本命位置未见"}。${value.occurrences.map((item) => `${NATAL_POSITION[item.position]}${item.ganZhi}${item.visibility === "visible" ? "明透" : item.visibility === "main_hidden" ? "本气藏" : "余气藏"}${item.stem}${item.tenGod}（位置 ${item.id}）`).join("；")}`;
  const relationText = (item: AnnualRelationshipNatalContext["palaceInteractions"][number]) => `${item.participants.map((p) => `${NATAL_POSITION[p.position]}${p.component === "stem" ? "干" : "支"}${p.value}`).join("与")}有${NATAL_RELATION[item.relationType]}；事实 ${item.factId}；规则 ${item.ruleId}。`;
  return [presenceText("主角色", lens.primary), ...(lens.related.tenGods.length ? [presenceText("相关角色", lens.related)] : []),
    `本命日柱${context.dayPalace.ganZhi}，日支${context.dayPalace.branch}本气${context.dayPalace.mainStem}${context.dayPalace.mainTenGod}；生活主题沿该位置解释，不据此推定真实婚姻状态。`,
    ...context.palaceInteractions.map(relationText), ...lens.visibleStarInteractions.map(relationText),
    ...timing.signals.map((signal) => signal.text),
    "明透、支藏与本年同字对应是不同事实层；本命明透不表示已有伴侣，本年同字明透也不表示首次相识。",
    "支藏不代表真实心理隐瞒或此前没有表达，不能据此推定暗恋或过往关系经历。",
    "相处需求、表达方式和共同安排属于上述事实的本地现代解释，不是古籍逐字给出的事件保证。"];
}

function lifePalace(group: PalaceGroup, input: AnnualEventReadingProseInput): { summary: string; example: string } {
  if (input.age.stage !== "adult") {
    const people = input.age.stage === "young_child" ? "照料回应" : input.age.stage === "youth" ? "同伴互动与家人约定" : "实际参与者的共同安排";
    const themes: Record<PalaceGroup, { summary: string; example: string }> = {
      authority: { summary: `${people}中，答应什么、由谁持续回应会成为具体落点，要求与能做到的部分需要对应。`, example: "共同活动确定了要求后，参与者需要明确回应时间、负责部分与可以调整的情形" },
      output: { summary: `${people}中，自己的想法能否说清、别人是否有机会回应，是本段更具体的变化。`, example: "在共同活动里表达不同想法后，大家开始调整轮流参与和回应的节奏" },
      resource: { summary: `${people}中，怎样获得理解和帮助更受关注，回应方式与实际需要是否相合成为重点。`, example: "需要帮助时，倾听、陪同和代为处理开始被区分，参与方式随之调整" },
      peer: { summary: `${people}中，自主决定与一起商量的界限更明确，亲近不必等于所有安排都一致。`, example: "共同活动中出现各自想独立完成的部分，参与者重新分清共同决定和个人决定" },
      wealth: { summary: `${people}中，实际参加多少、材料与时间由谁准备，会把原先笼统的约定变得具体。`, example: "活动进入准备后，时间、材料和负责人员逐渐确定，实际投入与口头约定相互核对" },
    };
    return themes[group];
  }
  const separated = input.appliedRelationship === "separated";
  const themes: Record<PalaceGroup, { summary: string; example: string }> = {
    authority: { summary: separated ? "必要联络的范围与已答应责任是重点，完成交接和继续承担哪些事项需要分清。" : "相处更看重约定能否持续兑现、双方是否承担得起；只有答应而没有稳定回应，会成为具体卡点。", example: separated ? "剩余事项排定期限后，双方明确谁确认完成、哪些责任到此结束" : "共同安排被提上日程后，双方开始明确谁负责、何时回应，以及临时变化怎样告知" },
    output: { summary: separated ? "表达边界和回应节奏是重点，必要沟通如何说清、何时结束，比联系次数更具体。" : "相处的落点在表达与回应节奏：愿意说出期待是一端，对方能否接住、是否有时间回应是另一端。", example: separated ? "必要联络中出现不同理解，双方把处理事项说清，并约定回复范围" : "一次谈话或共同活动后，双方更明确怎样表达想继续了解、何时回复，以及哪些话只是随口一说" },
    resource: { summary: separated ? "仍需帮助的部分与各自独立处理的部分要分开，提供协助不等于重新承担全部生活。" : "相处更需要理解和合适的回应；一方愿意帮助时，另一方需要的是倾听、陪伴还是自己决定，会影响配合。", example: separated ? "处理剩余事项时，双方说明需要哪种协助、完成后由谁独立接手" : "一方提出需要支持后，双方开始区分陪伴、实际帮助和希望自己处理的空间" },
    peer: { summary: separated ? "各自自主安排与必要协作的边界更重要，已有共同事项不能无限延伸到独立生活。" : "相处更在意彼此自主与平等参与；一起行动和保留各自安排之间，需要形成双方认可的界限。", example: separated ? "必要交接与各自日程冲突时，双方重新约定可协商范围" : "联系趋于稳定后，双方开始讨论哪些安排共同决定、哪些保留各自选择" },
    wealth: { summary: separated ? "剩余费用、时间和物品交接更具体，已经答应的投入与仍可商量的部分需要对应。" : "相处更看重可见的投入：时间、共同安排和已经答应的事能否落实，比单一的热情表达更能体现承诺。", example: separated ? "物品或共同费用进入核对时，原有投入被逐项确认，处理范围逐渐明确" : "计划涉及共同时间或费用后，双方把愿意投入的部分与后续维护责任具体说开" },
  };
  return themes[group];
}

function recurringRoleTopic(input: AnnualEventReadingProseInput, presence: NatalLens["primary"]["presence"], mode: TimingMode): Topic {
  const relation = input.appliedRelationship ?? "unspecified", base = TIMING_ADULT[relation][mode];
  if (presence === "absent") return { ...base, examples: [...base.examples] };
  const visible = presence === "visible";
  const summaries: Record<ReadingContextRelationship, string> = {
    single: visible ? "这一年更侧重让接触中的投入与下一步期待得到明确回应。联系是否持续、愿意怎样相处，会比一时热络更能区分彼此期待。" : "本年的重点是把相处期待说清，让投入有具体落点。一般往来与愿意继续了解，需要通过表达和回应来区分。",
    partnered: visible ? "已有交往中，答应的下一步怎样落实成为本年的重点。持续投入与共同安排能否对应，比再次表达意愿更具体。" : "已有交往中，本年更侧重怎样表达相处期待。双方对联系、陪伴和下一步的理解，需要落到彼此听得懂、能够回应的具体事项。",
    married: visible ? "共同生活中，已经认可的投入和责任如何持续兑现，是本年更直接的关系题目。" : "共同生活中，本年更侧重表达陪伴、分担与回应的需要，让彼此能够针对具体事项作出安排。",
    separated: visible ? "必要往来中，已答应的交接和责任需要明确怎样履行，协作范围与各自独立生活分开处理。" : "必要往来中，本年更侧重把费用、物品或联系的处理期待说清，明确回应不等于恢复伴侣关系。",
    unspecified: visible ? "这一年更侧重投入与承诺得到明确回应：愿意承担多少、怎样持续参与，会成为关系中的具体题目。" : "本年的重点是把相处期待说清，让投入有具体落点。想怎样相处、需要什么回应，要通过具体交流形成彼此理解的安排。",
  };
  const titles: Record<ReadingContextRelationship, string> = {
    single: visible ? "投入与相处期待进入明确约定" : "把相处期待说清，让投入有落点",
    partnered: visible ? "已有承诺落实到共同安排" : "相处期待与陪伴需要说清",
    married: visible ? "共同责任与持续投入进入落实" : "陪伴与分担需要更明确的回应",
    separated: "必要联络与剩余责任逐项明确",
    unspecified: visible ? "投入与承诺需要更明确的回应" : "把相处期待说清，让投入有落点",
  };
  const progression = mode === "joined" ? "本年的推进点在共同计划进入时间、参与范围与下一步的确认。"
    : mode === "clash" ? "与此同时，相处频率、个人空间或原有日程也需要调整，靠近的意愿与实际节奏要一起配合。" : "";
  return { title: mode === "entry" ? titles[relation] : base.title, summary: summaries[relation] + progression, examples: [...base.examples] };
}

function lifeBackground(lens: AnnualRelationshipTimingLens, mode: TimingMode, input: AnnualEventReadingProseInput): string {
  const background = lens.signals.filter((signal) => signal.source === "dayun" && lens.backgroundSignalIds.includes(signal.id));
  if (!background.length) return "";
  const joined = background.some((s) => s.kind === "palace_contact" && s.relationType === "branch_six_combination");
  const clash = background.some((s) => s.kind === "palace_contact" && s.relationType === "branch_six_clash");
  const contacts = background.filter((s) => s.kind === "star_stem_contact");
  const combination = contacts.some((s) => s.relationType === "stem_five_combination"), conflict = contacts.some((s) => s.relationType === "stem_clash");
  const adult = input.age.stage === "adult", separated = adult && input.appliedRelationship === "separated";
  const subject = separated ? "必要协作与各自生活" : adult ? "共同期待与各自生活节奏" : "共同参与与各自日常安排";
  const pieces: string[] = [];
  if (mode === "joined" && clash) pieces.push(`这一阶段仍有重排旧节奏的任务，${subject}需要同时兼顾；愿意一起推进，并不表示原来的安排都适合。`);
  else if (mode === "clash" && joined) pieces.push("这一阶段仍保留持续配合的基础，变化更集中在做法与日程的重新匹配，不把调整写成所有约定都结束。");
  else if (clash) pieces.push(`这一阶段${subject}之间仍有调整任务，回应时间和参与范围需要留出变化余地。`);
  else if (joined) pieces.push("这一阶段已有共同配合的持续背景，年度的新安排需要接上原来愿意保留的部分。");
  if (combination && conflict) pieces.push(`这一阶段不同投入与约定相互牵动，${subject}既有需要衔接的一面，也有需要重新划清的边界。`);
  else if (conflict) pieces.push(`这一阶段更需要处理${subject}不一致的地方，投入或回应方式不能只按单方期待推进。`);
  else if (combination) pieces.push("这一阶段一项共同投入容易牵动另一项安排，协作范围与各自承担的部分会更具体。");
  else if (background.some((s) => s.kind === "star_entry" || s.kind === "hidden_to_visible")) pieces.push(adult ? "这一阶段还带着持续投入与回应的要求，年度的新期待需要落回实际能承担的日常。" : "这一阶段仍有持续参与与回应的要求，本年的活动需要接上平日能够做到的安排。");
  return pieces.join("");
}

function answerFirstTopic(input: AnnualEventReadingProseInput): Topic | null {
  const context = input.relationshipNatalContext, timing = input.relationshipTiming;
  if (!context) return null;
  if (!timing || context.version !== ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION
    || (["revisionId", "chartResultHash", "includeHour", "sex"] as const).some((key) => context.sourceBinding[key] !== timing.sourceBinding[key])
    || context.lenses.length !== timing.lenses.length || context.lenses.some((lens, i) => lens.id !== timing.lenses[i]?.id)) throw new Error("年度关系正文与本命上下文来源不一致。");
  if (!timing.triggered) return null;
  const adult = input.age.stage === "adult", relation = input.appliedRelationship ?? "unspecified";
  const readings = timing.lenses.map((lens, index) => {
    const natal = context.lenses[index]!;
    const year = lens.signals.filter((s) => s.source === "year" && lens.annualSignalIds.includes(s.id));
    const entry = year.find((s) => s.kind === "star_entry" && s.relevance === "primary_star");
    const contacts = year.filter((s) => s.kind === "star_stem_contact" && lens.triggerSignalIds.includes(s.id));
    const mode: TimingMode = year.some((s) => s.kind === "palace_contact" && s.relationType === "branch_six_clash") ? "clash"
      : year.some((s) => s.kind === "palace_contact" && s.relationType === "branch_six_combination") ? "joined" : "entry";
    const reasoning = natalReasoning(context, natal, lens);
    if (lens.focus !== "annual_focus") return { lens, topic: { title: "本年未另列关系变化", summary: "这一视角本年没有另列的关系变化线索，保留已有背景，不借另一视角补出相同结论。", examples: [], reasoning } };
    const exact = entry ? natal.primary.occurrences.filter((item) => item.stem === entry.stem && item.tenGod === entry.tenGod) : [];
    const presence = entry ? exact.some((item) => item.visibility === "visible") ? "visible" : exact.length ? "hidden_only" : "absent" : natal.primary.presence;
    let base: Topic;
    if (!adult) {
      base = youngerTimingTopic(input, mode);
      if (entry && mode === "entry") {
        const early = input.age.stage === "young_child", youth = input.age.stage === "youth";
        base = { title: early ? "照料参与与回应方式更明确" : youth ? "同伴参与与家人约定更具体" : "共同参与与回应方式更明确",
          summary: early ? "本年的相处重点落在照料、陪伴和活动中的回应方式，由谁参与、怎样持续回应需要形成具体安排。"
            : youth ? "本年的相处重点落在同伴参与与家人约定，怎样表达自己的参与意愿、怎样回应共同要求，会成为日常中的具体事项。"
              : "本年的相处重点落在实际参与者怎样表达意愿、回应共同要求，以及能够持续参与到什么程度。",
          examples: [early ? "照料或游戏安排中，回应时间与主要参与者的分工更具体" : "共同活动中，参与意愿、回应时间与负责部分逐渐明确", "若实际参加新的活动，参与者再据真实安排确认回应与分工，不由本年角色再现推定新人物"] };
      }
    }
    else if (entry) base = recurringRoleTopic(input, presence, mode);
    else if (contacts.length) base = { title: "既有投入与关系安排相互牵动", summary: relation === "separated" ? "本年更集中在必要联系与剩余责任怎样重新配合；原先答应的部分与仍可商量的部分需要分清。"
      : "本年更集中在投入与相处安排怎样配合：某一项约定的变化会牵动其他期待，关系的具体进展取决于能否形成双方可持续的安排。", examples: [...TIMING_ADULT[relation][mode].examples] };
    else {
      const original = (mode === "joined" ? JOINED : CLASH)[relation];
      base = { ...original, examples: [...original.examples], ...(relation === "unspecified" ? { summary: mode === "joined"
        ? "本年的关系主题是把共同安排推进到具体确认：参与时间、彼此期待和下一步怎样落实，会成为实际相处的重点。"
        : "本年的关系变化主要落在共同时间、个人空间与分工的重新匹配；一项安排需要调整，不等于所有原有约定都要结束。" } : {}) };
    }
    const palace = lifePalace(context.dayPalace.roleGroup, input);
    // The local life interpretation is deliberately separate from exact natal
    // and annual statements. Those statements survive intact in reasoning.
    return { lens, topic: { title: base.title, summary: `${base.summary}${palace.summary}${lifeBackground(lens, mode, input)}`,
      examples: [base.examples[0]!, palace.example], reasoning } };
  });
  if (readings.length === 1) return readings[0]!.topic;
  return { title: adult ? "两种关系视角分别看今年的变化" : "不同视角下的参与与相处变化",
    summary: readings.map(({ lens, topic }) => `${lens.label}：${topic.summary}`).join("\n\n"),
    examples: readings.flatMap(({ lens, topic }) => topic.examples.map((example) => `${lens.label}：${example}`)),
    reasoning: [...new Set(readings.flatMap(({ topic }) => topic.reasoning))] };
}

/** A language layer over the caller's original yearly trigger and exact
 * background facts. It never creates a relationship event or predicts an outcome. */
export function buildAnnualRelationshipTopic(input: AnnualEventReadingProseInput): Topic | null {
  if (input.kind !== "shared_arrangements" || input.age.stage === "before_birth") return null;
  const answer = answerFirstTopic(input);
  if (answer) return answer;
  const timed = timingTopic(input);
  if (timed) return timed;
  const stellar = palaceOnlyStellarBackground(input);
  if (input.age.stage !== "adult") {
    if (!input.hasDayBranchClash && !input.hasDayBranchCombination) return null;
    const topic = (input.hasDayBranchCombination ? YOUNGER_JOINED : YOUNGER_CLASH)[input.age.stage];
    return { title: topic.title, summary: `${topic.summary}${backgroundTopic(input, "unspecified")}${stellar}`, examples: [...topic.examples] };
  }
  if (!input.hasDayBranchClash && !input.hasDayBranchCombination) return {
    title: "表达立场与协作承诺的协调", summary: "本项更贴近个人怎样表达意见、答应什么以及愿意怎样参与；先把期待说清，再确认共同安排，不把日干互动扩成婚恋转折。",
    examples: ["自己的参与方式与对方预期不同，重新说明时间投入与承诺范围", "讨论意见时把个人取舍和对关系的重视分别表达"] };
  const relation = input.appliedRelationship ?? "unspecified";
  const topic = (input.hasDayBranchCombination ? JOINED : CLASH)[relation];
  return { title: topic.title, summary: `${topic.summary}${backgroundTopic(input, relation)}${stellar}`, examples: [...topic.examples] };
}
