import { transitNodeRefSchema, type RevisionRecord, type TransitNode } from "@hakimi/contracts";
import { buildNatalTransitTaskProse } from "./outlook-task-link-prose";
import type { RelationType } from "@hakimi/relations-core";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalOutlookJudgment, LocalOutlookJudgmentSegment, OutlookAxisFinding, OutlookEffect } from "./local-outlook-judgment";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext, type LocalReadingAgeSegment } from "./local-reading-age-context";

export const LOCAL_DETAILED_CONTENT_VERSION = "hakimi.local-detailed-content/0.3.0" as const;
export interface DetailedContentFact { type: RelationType; natalPosition: string | null; text: string }
export interface DetailedContentTheme { id: "career" | "wealth" | "relationship"; title: string; text: string; evidence: string[] }
export interface DetailedPersonalizedContent {
  age: LocalReadingAgeContext; paragraphs: string[]; themes: DetailedContentTheme[]; conditions: string[]; evidence: string[];
}
type Horizon = "decade" | "month";
type Effect = OutlookEffect | "varied";
type Category = "flow" | "governed" | "method" | "learning" | "general";
interface Context {
  horizon: Horizon; node: TransitNode; age: LocalReadingAgeContext; path: string; pathLabel: string; category: Category;
  pattern: Effect; balance: Effect; seasonal: Effect; rescueScope: "none" | "some" | "all"; god: string;
  focus: "responsibility" | "resources" | "expression" | "support" | "autonomy";
  facts: DetailedContentFact[]; axes: OutlookAxisFinding[]; assessment: BaziPreliminaryAssessment;
}
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const PATHS: Record<string, { label: string; category: Category }> = {
  "peer-output-wealth": { label: "自主推进、技能产出与资源兑现的配合", category: "flow" },
  "wealth-food": { label: "实际需求与稳定产出的衔接", category: "flow" },
  "hurting-wealth": { label: "表达、解决问题与成果兑现的衔接", category: "flow" },
  "food-wealth": { label: "稳定技能与成果兑现的配合", category: "flow" },
  "official-resource": { label: "专业支持与职责承接的配合", category: "governed" },
  "official-wealth": { label: "资源安排与履责要求的衔接", category: "governed" },
  "killings-resource": { label: "专业支持与高要求任务的衔接", category: "governed" },
  "food-killings": { label: "具体方法与高要求任务的配合", category: "method" },
  "resource-output": { label: "学习支持与实际成果的衔接", category: "learning" },
  "resource-wealth": { label: "财裁抑过多印的投入、保留必要支持的配合", category: "learning" },
  "resource-preservation": { label: "积累与应用之间的取舍", category: "learning" },
  "hurting-resource": { label: "专业规范与个人表达的配合", category: "learning" }
};
const FAMILIES: Record<string, string> = { official: "职责与规则", seven_killings: "要求与承接能力", resource: "学习支持与能力积累", output: "个人表达与实际产出", wealth: "现实需要与资源安排", peer: "自主推进与同伴协作" };
const isClash = (fact: DetailedContentFact) => fact.type === "branch_six_clash" || fact.type === "stem_clash";
function effectOf(axes: OutlookAxisFinding[], axis: OutlookAxisFinding["axis"]): Effect {
  const effects = unique(axes.filter((item) => item.axis === axis).map((item) => item.effect));
  // Different periods stay different. Neutral plus assistance is not obstruction.
  return effects.length === 1 ? effects[0]! : effects.length ? "varied" : "unresolved";
}
const stagePrefix = (context: Context) => context.horizon === "decade" ? "这一步大运" : "本节令月";
const isDirectional = (effect: Effect) => effect === "assists" || effect === "obstructs" || effect === "mixed";

/** Only explains the already selected resource-wealth axis. The quoted
 * summaries retain its actual actors, constraints and segment backgrounds. */
function resourceWealthAdult(context: Context, domain: "career" | "wealth"): string {
  const long = context.horizon === "decade", group = strengthTenGodGroup(context.god);
  const actor = `${context.node.ganZhi.slice(0, 1)}${context.god}`;
  const actions: Record<string, { career: string; wealth: string }> = {
    wealth: {
      career: "把实际需求、应用范围和必要准备对应起来，让财参与裁印；重点是减少暂时用不上的资料与投入，而非取消必要学习",
      wealth: "把时间、费用和工具落实到明确用途，让资源约束过多准备；财已受合克时，新增财不能直接算成已经完成调节"
    },
    resource: {
      career: "辨清新增的训练、资料或协助是否仍在解决真实问题；原有印已经充足，重复准备能否被财调节，是本期更具体的任务",
      wealth: "核对新增学习与工具投入怎样占用可用资源；印有基础作用，但重复加层未必是当前所需，仍要看原有财能否裁抑过多投入"
    },
    peer: {
      career: "区分自主推进与共同资源的决定权；比劫会牵动用于裁印的财，分工或主导权的变化要落实到哪些支持仍可调整",
      wealth: "分清共同事项由谁投入、谁决定用途；比劫对财的牵制可能影响裁印，不把更多同伴支持自动等同于更可用的资源"
    },
    output: {
      career: "让表达或成果接上实际需求，再看食伤生财能否帮助调节过多准备；已有想法需要被使用，但不因此一概增加所有输出任务",
      wealth: "看成果怎样转成可支配的时间、工具或对价，再用于印财调节；食伤生财是一条配合联系，不能跳过财受合克或实际兑现的条件"
    },
    authority: {
      career: "把新增职责、标准或紧迫要求与现有投入分开核对；官杀会改变财与印的配合，不能沿原裁印方向把更多责任一并判为助力",
      wealth: "辨明资源究竟用于原有应用，还是转去承担新增要求；财生官杀、官杀生印可能改变裁印任务，要看真实作用而非单纯扩大投入"
    }
  };
  const effect = context.pattern === "assists" ? "原结构判断给这项调节提供了助力，仍按具体合克与承接条件使用。"
    : context.pattern === "obstructs" ? "原结构判断显示这项调节受到牵制，当前更应辨清卡住的对象与可调整范围。"
      : context.pattern === "mixed" ? "原结构判断同时保留可用配合与具体牵制，两部分分开看，不能只取有利一面。"
        : context.pattern === "varied" ? "不同分段的配合并不一致，以下原判断各自对应其时间与背景，不能合并成一项共同好坏。"
          : "原结构尚未形成明确助阻，本期先按具体用字与任务阅读，不从未决条件额外推断顺利或承压。";
  const summaries = unique(context.axes.filter((axis) => axis.axis === "pattern" && axis.pathId === "resource-wealth").map((axis) => axis.summary));
  return `${long ? "这一步大运" : "本节令月"}的${actor}，放在财裁印、保留必要支持的主线中阅读。${group ? actions[group]?.[domain] ?? "按已知实际用字核对投入与支持的用途" : "目标十神分组尚未明确，先保留已算出的财印作用，不另指定资源或职责角色"}。${effect}${summaries.length ? `具体作用：${summaries.join("；")}` : ""}`;
}

function careerAdult(context: Context): string {
  const long = context.horizon === "decade", effect = context.pattern, group = strengthTenGodGroup(context.god);
  if (context.path === "resource-wealth") return resourceWealthAdult(context, "career");
  if (!isDirectional(effect)) return `${long ? "这一步发展的主线" : "眼前可对照的事项"}是${context.pathLabel}。${long ? "已有经验怎样积累成稳定能力、与何种职责和协作方式相配，是这一阶段持续形成的选择。" : "具体可对应一次任务范围、完成形式或协作接口的确认；本月尚不由这些主题另加一条好坏判断。"}`;
  if (context.category === "flow") {
    if (effect === "assists") return `${long ? "这一阶段较能把个人能力逐步转成稳定的交付方式" : "本月较值得留意已有方案或技能接上明确需求的机会"}，重点在${context.pathLabel}。${long ? "可能反复经历从独立完成到协同交付、从单次成果到延续合作的过程。" : "事情更贴近一轮试用、成果展示、验收或合作范围的落实。"}`;
    const pressure = group === "authority" ? "成果推进与流程、审核或责任标准之间的摩擦" : group === "resource" ? "继续准备与实际交付之间的挤压" : group === "peer" ? "共同推进与份额、主导权分配之间的拉扯" : "需求增加与实际承接能力之间的落差";
    return `${long ? "这一阶段容易反复面对" : "本月更可能面对"}${pressure}。${effect === "mixed" ? "已有能力和合作条件仍有可用之处，同时需要处理具体限制。" : long ? "形成什么样的承担范围，比不断增加事项更直接影响发展的连贯性。" : "具体可对应完成期限、执行范围或分工的一次重新商定。"}${context.rescueScope !== "none" ? `${context.rescueScope === "some" ? "部分分段" : "原有结构中"}存在保护或转圜条件，实际支持接上后才有机会把卡住的环节继续推进。` : ""}`;
  }
  if (context.category === "governed") return `${long ? "这一步围绕专业准备如何承接职责而发展" : "本月重点是某项责任如何获得专业与执行支持"}。${effect === "assists" ? long ? "已有学习、经验或资格较能进入持续负责的事务，逐步形成被信任的工作方式。" : "已有经验或支持渠道可能接上一项审核、授权或职责确认。" : effect === "mixed" ? "支持条件与新的责任约束同时存在，部分要求可以承接，部分执行办法仍需协调。" : long ? "角色要求与能够调动的支持可能长期不同步，准备、承担与调整之间会反复取舍。" : "任务要求先到，资格准备、协助或权限安排可能随后补上，当前事项需要重新衔接。"}`;
  if (context.category === "method") return `${long ? "这一阶段更突出用具体能力处理高要求事务" : "本月更突出用现成方法处理一个具体难题"}。${effect === "assists" ? long ? "积累可重复的方法、形成自己的处理流程，是能力被实际检验的路径。" : "可对应一次技术复核、问题拆解或期限明确的交付。" : effect === "mixed" ? "既有方法有可用之处，任务限制也影响实际应用，支持与牵制需要一起看。" : long ? "原有办法与外部要求之间可能反复不合拍，能力范围和协助方式会成为阶段性选择。" : "现成办法遇到新的限制，解决范围、工具或协助方式可能需要重议。"}`;
  if (context.category === "learning") return `${long ? "这一步的主线是把积累逐渐变成能够使用的成果" : "本月关注已有知识或方法怎样用在一项具体任务上"}。${effect === "assists" ? long ? "学习支持与个人表达有衔接空间，经验可能逐步沉淀为可复用的方法。" : "可对应把培训、研究或过去的练习转成一次方案、作品或实际应用。" : effect === "mixed" ? "准备和支持有帮助，表达、应用或完成时间也受到条件牵制。" : long ? "准备与应用可能反复脱节，持续积累的内容需要重新找到合适的呈现和用途。" : "继续准备与按时完成之间出现拉扯，方法或表达形式可能需要重做。"}`;
  return `${long ? "这一步" : "本月"}围绕${context.pathLabel}展开。${effect === "assists" ? "已有条件提供了一部分承接空间。" : effect === "mixed" ? "可推进的部分与需要调整的部分同时存在。" : "现有要求与可承担范围之间有需要处理的限制。"}`;
}

function wealthAdult(context: Context): string {
  const long = context.horizon === "decade", effect = context.pattern;
  if (context.path === "resource-wealth") return resourceWealthAdult(context, "wealth");
  if (!isDirectional(effect)) return `${long ? "这一阶段资源安排的重点" : "本月的资源主题"}是已有投入怎样对应实际用途，以及共同事项采用什么承担和兑现条件。${long ? "长期责任、能力建设和日常可用资源之间，会逐步形成自己的分配方式。" : "可对应一次使用范围、材料安排或验收条件的讨论，未据此推断收入增减。"}`;
  if (context.category === "flow") return `${long ? "资源变化更可能与技能产出能否持续兑现相连" : "资源议题主要连着眼前成果的验收与兑现"}。${effect === "assists" ? long ? "阶段重心是让成果、承担范围和回报条件形成较稳定的衔接，而非只依赖一次机会。" : "已有产出可能进入结算、续作或对价确认，讨论内容比机会本身更具体。" : effect === "mixed" ? "已有成果有承接空间，投入、分配或兑现节奏也存在需要协调的地方。" : long ? "时间和资源投入可能持续走在兑现之前，哪些事项能形成连贯回报、哪些占用过多，需要在经历中重新分清。" : "事情可能已经投入时间或材料，但验收、分配或兑现条件尚未同步，当前安排有重谈空间。"}${context.balance === "obstructs" ? "从当前扶抑口径看，额外事项的承接也受限制，不能把资源机会直接等同于可完成的收益。" : ""}`;
  if (context.category === "learning") return `${long ? "这一阶段资源较多围绕学习、工具与能力建设形成取舍" : "本月可对照一笔学习、工具或方法应用所需的资源安排"}。${effect === "assists" ? "过去的投入有找到实际用途的线索，主题是投入与成果怎样接上。" : effect === "mixed" ? "部分投入可以应用，继续准备与眼前兑现仍有取舍。" : "积累占用的时间或资源与当前可用成果之间可能存在落差。"}`;
  return `${long ? "这一步的资源议题与持续承担责任的方式相连" : "本月资源议题更贴近完成当前责任所需的工具、时间或协助"}。${effect === "assists" ? "已有准备提供了一部分承接，任务范围与相应支持的对应关系更值得留意。" : effect === "mixed" ? "支持可以接上一部分要求，另外的分摊或调用条件仍需协调。" : "责任要求与能调动的资源可能不同步，支出、协助或承担范围可能重新商定。"}`;
}

function relationshipText(context: Context, stage: LocalReadingAgeSegment["stage"] | "unknown"): string {
  const long = context.horizon === "decade", day = context.facts.filter((fact) => fact.natalPosition === "day");
  const branch = day.filter((fact) => fact.type.startsWith("branch_")), stem = day.filter((fact) => fact.type.startsWith("stem_"));
  if (stage === "young_child") return `${long ? "这一段的相处主题首先是熟悉的照料、回应与探索空间" : "本月先对照照料回应与日常活动的适应"}。${branch.length ? "日支互动可放在与照料者相处、活动安排衔接的语境中理解。" : "个人需要怎样被表达和理解，比成人关系角色更贴合这一年龄。"}`;
  if (stage === "youth") return `${long ? "这一段更贴近亲子约定、同伴相处与逐渐形成的自主空间" : "本月更贴近与家人、同伴之间的一项具体约定"}。${branch.length ? isClash(branch[0]!) ? "活动或相处节奏不同，原来默认的安排可能进入调整。" : "共同活动和彼此期待可能需要进一步落实到参与方式。" : stem.length ? "只有日干层面的互动，重点在自己怎样表达、参与和选择，不把它扩成关系状态变化。" : "相处主题仍以已有关系和日常互动为基础。"}`;
  if (stage === "unknown") return "年龄与现实身份未锁定，关系主题保持在个人意愿、参与方式与日常协作；不默认照料、就业或婚恋角色。";
  if (!branch.length && stem.length) return `${long ? "这一阶段更突出个人角色如何逐步形成" : "本月较突出一次个人意愿或参与方式的取舍"}。当前日干互动对应自己的表达、决定与他人要求之间的协调。`;
  const focus = { responsibility: "责任、承诺与角色", resources: "时间投入和共同资源", expression: "表达方式与期待", support: "照顾支持与独立空间", autonomy: "自主安排与平等分工" }[context.focus];
  if (!branch.length) return `${long ? `长期相处仍围绕${focus}展开。` : `本月可沿既有关系，关注${focus}。`}当前没有新增明确的日支互动线索，具体相处变化仍由真实关系和安排决定。`;
  return `${long ? "这一阶段的关系课题更可能反复落在" : "本月一项共同安排可能牵动"}${focus}。${branch.some(isClash) ? long ? "双方节奏或分工改变时，原有约定可能需要反复修订，关键是怎样适应不同要求。" : "可对应时间安排、分工或共同计划的一次调整，变化不等同于关系破裂。" : long ? "共同意愿怎样逐渐落实为可承担的安排，是比口头承诺更具体的阶段课题。" : "可对应共同活动、合作或投入条件进入具体讨论，合的事实不保证关系结果。"}`;
}

function nonAdultTheme(domain: DetailedContentTheme["id"], context: Context, stage: LocalReadingAgeSegment["stage"] | "unknown"): string {
  if (domain === "relationship") return relationshipText(context, stage);
  const long = context.horizon === "decade", effect = context.pattern;
  if (stage === "unknown") return domain === "career" ? `${long ? "这一阶段" : "本月"}先对应学习、日常任务与协作方式。已有经验怎样用于具体事项、参与内容怎样确定，是不依赖职业或学籍身份的阅读线索。`
    : "资源只对应时间、材料和日常安排的用途，具体来源与承担者未知，不默认为本人收入或家庭供给。";
  if (domain === "wealth") return `${long ? "这段年龄的资源安排主要服务于持续的照料、学习和活动条件" : "本月资源主题先对应具体活动所需的时间、材料或日常支持"}。${effect === "obstructs" ? "几项需要可能争用同一份时间或可用条件，安排上会出现取舍。" : effect === "mixed" ? "已有支持能满足部分需要，其他活动仍要协调时间和材料。" : effect === "assists" ? "已有支持较容易找到具体用途，重点是能否跟上实际活动。" : "具体看现有安排怎样对应需要，不额外推断资源增减。"}`;
  if (stage === "young_child") return `${long ? "这一段发展先落在游戏探索、表达与日常习惯的形成" : "本月先看一次新活动、表达尝试或作息安排的适应"}。${effect === "assists" ? "已有回应和支持较能接上新的尝试。" : effect === "obstructs" ? "新要求与熟悉做法之间可能需要更多适应。" : effect === "mixed" ? "愿意尝试的部分与仍需照顾的部分同时存在。" : "本期只保留探索与适应的主题，不从未决作用推断孩子表现。"}`;
  const group = strengthTenGodGroup(context.god);
  const task = group === "output" || context.category === "flow" ? "表达、动手任务与学习成果" : group === "authority" ? "学习规则与任务要求" : group === "peer" ? "自主尝试与同伴合作" : "学习方法与支持来源";
  return `${long ? `这一段逐步形成的能力，主要通过${task}体现。` : `本月较具体的事项主要是${task}。`}${effect === "assists" ? long ? "既有兴趣和帮助有接上练习的空间，持续参与与完成活动能逐渐形成经验。" : "可对应一次作品展示、小组任务或把学到的方法用于当前活动。" : effect === "obstructs" ? long ? "活动要求与自己的节奏可能反复不合拍，尝试、接受帮助和调整方法构成这一段的课题。" : "任务要求与可用时间或帮助可能不同步，完成方式需要重新协调。" : effect === "mixed" ? "已有兴趣或支持提供参与空间，同时也有任务节奏或规则方面的牵制。" : "具体可看学习内容怎样呈现、活动怎样分工；没有明确作用时不额外推断表现好坏。"}`;
}

function themeText(domain: DetailedContentTheme["id"], context: Context): string {
  const capacity = domain === "career" && context.pattern === "assists" ? context.balance === "obstructs" ? "机会与可承担范围仍需同步，事项可能需要分期、调整范围或增加协助。"
    : context.balance === "mixed" ? "承接上也有支持与消耗并存的条件，一部分事项可推进，另一部分可能需要调整范围或节奏。"
      : context.balance === "varied" ? "承接条件随分段背景变化，同一机会需要按所列区间判断能够承担多少。" : "" : "";
  const adult = () => domain === "career" ? `${careerAdult(context)}${capacity}` : domain === "wealth" ? wealthAdult(context) : relationshipText(context, "adult");
  if (context.age.stage === "adult") return adult();
  if (context.age.stage === "unknown") return nonAdultTheme(domain, context, "unknown");
  if (context.age.stage === "before_birth") return "本区间早于出生，不作个人生活情境解读。";
  if (context.age.segments.length === 1) return nonAdultTheme(domain, context, context.age.segments[0]!.stage);
  return context.age.segments.map((segment) => `${segment.label}期间：${segment.stage === "adult" ? adult() : nonAdultTheme(domain, context, segment.stage)}`).join(" ");
}

function mechanics(context: Context): string {
  const subject = stagePrefix(context);
  const pattern = context.pattern === "assists" ? "结构上有支持既有发展方式的线索" : context.pattern === "obstructs" ? "结构上对既有发展方式有牵制" : context.pattern === "mixed" ? "结构上同时存在可借用的支持和需要处理的牵制" : context.pattern === "varied" ? "不同时间或顺逆分支的结构作用不同，需要按对应区间分别阅读" : "结构作用尚未形成明确助力或阻碍，保留具体事务主题";
  const balance = context.balance === "assists" ? "当前扶抑口径提供了承接的支持" : context.balance === "obstructs" ? "当前扶抑口径仍提示任务与支持之间的承接限制" : context.balance === "mixed" ? "扶抑侧的支持与消耗并存" : context.balance === "varied" ? "扶抑作用随所列分段条件变化" : context.balance === "neutral" ? "扶抑没有固定喜忌，本次另看具体结构作用" : "扶抑仍有未决条件";
  const seasonal = context.seasonal === "assists" ? `调候侧重的${context.assessment.seasonal.preferredStems.join("、")}字有补入或保护的支持线索`
    : context.seasonal === "obstructs" ? `调候侧重的${context.assessment.seasonal.preferredStems.join("、")}字受到牵连，适用条件需一并保留`
      : context.seasonal === "mixed" ? "调候的用字支持与牵制同时存在" : context.seasonal === "varied" ? "调候作用随分段背景变化" : "";
  return `${subject}${pattern}；${balance}。${context.rescueScope !== "none" ? `${context.rescueScope === "some" ? "部分分段" : "本期"}已识别具体保护或转圜线索，是否足以解决牵制仍取决于原有条件。` : ""}${seasonal ? `${seasonal}。` : ""}`;
}

function segmentNotes(context: Context, segments: readonly LocalOutlookJudgmentSegment[]): string {
  if (segments.length < 2) return "";
  const date = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10);
  return ` 分段对照：${segments.map((segment) => {
    const effect = effectOf(segment.judgment.axes, "pattern");
    const meaning = effect === "assists" ? "所需方法与承接条件有助力" : effect === "obstructs" ? "推进方式与承接条件有牵制" : effect === "mixed" ? "可借用的支持与实际限制并存" : effect === "neutral" ? "结构侧只保留事项主题" : "适用条件仍需分别阅读";
    return `${date(segment.startInstant)}至${date(segment.endExclusiveInstant)}（UTC+08），${segment.branchLabel}：${meaning}${segment.judgment.axes.some((axis) => axis.axis === "pattern" && axis.rescues.length) ? "，本段有需条件核对的保护线索" : ""}`;
  }).join("；")}。`;
}

function interactionText(context: Context): string {
  const month = context.facts.filter((fact) => fact.natalPosition === "month"), day = context.facts.filter((fact) => fact.natalPosition === "day");
  const child = context.age.stage === "young_child" || context.age.stage === "youth", transitional = context.age.stage === "adult_transition";
  const environment = child ? "照料、学习或同伴活动的安排" : transitional ? "前段的学习生活、后段实际参与的事务安排" : context.age.stage === "unknown" ? "日常任务与活动安排" : "已有职责、工作方法或协作安排";
  const parts: string[] = [];
  if (month.length) parts.push(`${month.some(isClash) ? "与本命月柱有冲的互动" : "与本命月柱有合的联系"}，可对照${environment}${context.horizon === "decade" ? "怎样在阶段中反复调整或衔接" : "在本月的一次调整或衔接"}。`);
  if (day.length) parts.push(transitional ? themeText("relationship", context) : relationshipText(context, child ? context.age.stage === "young_child" ? "young_child" : "youth" : context.age.stage === "unknown" ? "unknown" : "adult"));
  if (!parts.length) parts.push(`${stagePrefix(context)}没有新增明确的月柱、日柱合冲主线，生活情境沿已有结构与实际任务展开。`);
  return parts.join("");
}

export function buildDetailedPersonalizedContent(input: { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; node: TransitNode; judgment: LocalOutlookJudgment; judgmentSegments?: readonly LocalOutlookJudgmentSegment[]; facts: readonly DetailedContentFact[]; horizon: Horizon }): DetailedPersonalizedContent {
  const { revision, assessment, node, judgment, horizon } = input;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  const targetRef = transitNodeRefSchema.parse(node.ref);
  if (assessment.sourceBinding.revisionId !== revision.id || assessment.sourceBinding.chartResultHash !== revision.manifest.resultHash || assessment.sourceBinding.includeHour !== includeHour
    || judgment.sourceBinding.revisionId !== revision.id || judgment.sourceBinding.chartResultHash !== revision.manifest.resultHash || judgment.sourceBinding.includeHour !== includeHour
    || targetRef.revisionId !== revision.id || targetRef.chartResultHash !== revision.manifest.resultHash || targetRef.startInstant !== node.startInstant
    || (horizon === "decade" ? node.nodeType !== "dayun" : node.nodeType !== "month")) throw new Error("岁运个性化正文与源盘、时柱范围或运限目标不匹配。");
  const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, node.startInstant, node.endExclusiveInstant);
  const checkJudgment = (item: LocalOutlookJudgment, start: string, end: string) => {
    if (item.sourceBinding.revisionId !== revision.id || item.sourceBinding.chartResultHash !== revision.manifest.resultHash || item.sourceBinding.includeHour !== includeHour
      || JSON.stringify(transitNodeRefSchema.parse(item.targetRef)) !== JSON.stringify(targetRef)
      || item.interval.startInstant !== start || item.interval.endExclusiveInstant !== end) throw new Error("岁运个性化判断的完整目标引用或区间不匹配。");
    for (const background of item.backgroundRefs) {
      const ref = transitNodeRefSchema.parse(background);
      if (ref.revisionId !== revision.id || ref.chartResultHash !== revision.manifest.resultHash || ref.ruleProfileDigest !== targetRef.ruleProfileDigest
        || ref.luckCycleRuleDigest !== targetRef.luckCycleRuleDigest || ref.timelineVersion !== targetRef.timelineVersion) throw new Error("岁运个性化背景规则身份不匹配。");
    }
  };
  checkJudgment(judgment, node.startInstant, node.endExclusiveInstant);
  const ids = new Set<string>(), ends = new Map<string, number>();
  for (const segment of input.judgmentSegments ?? []) {
    const start = Date.parse(segment.startInstant), end = Date.parse(segment.endExclusiveInstant);
    if (ids.has(segment.id) || !(start < end) || start < Date.parse(node.startInstant) || end > Date.parse(node.endExclusiveInstant)
      || start < (ends.get(segment.branchId) ?? -Infinity)) throw new Error("岁运个性化分段范围、顺序或标识不匹配。");
    checkJudgment(segment.judgment, segment.startInstant, segment.endExclusiveInstant);
    if (segment.judgment.backgroundRefs.some((ref) => ref.nodeType === "dayun" && ref.manualDirection !== (segment.branchId === "locked" ? null : segment.branchId))) throw new Error("岁运个性化分段顺逆背景不匹配。");
    ids.add(segment.id); ends.set(segment.branchId, end);
  }
  const sourceJudgments = input.judgmentSegments?.length ? input.judgmentSegments.map((segment) => segment.judgment) : [judgment];
  const axes = sourceJudgments.flatMap((item) => item.axes), paths = unique(axes.filter((axis) => axis.axis === "pattern").map((axis) => axis.pathId));
  const path = paths.length === 1 ? paths[0]! : `${assessment.pattern.family}-background`;
  const visible = [revision.facts.pillars.year, revision.facts.pillars.month, ...(includeHour ? [revision.facts.pillars.hour] : [])];
  const groups = visible.map((pillar) => strengthTenGodGroup(canonicalizeStrengthTenGod(pillar.stemTenGod)));
  const rescueSegments = sourceJudgments.filter((item) => item.axes.some((axis) => axis.axis === "pattern" && axis.rescues.length > 0)).length;
  const context: Context = { horizon, node, age, path, pathLabel: PATHS[path]?.label ?? FAMILIES[assessment.pattern.family]!, category: PATHS[path]?.category ?? "general",
    pattern: effectOf(axes, "pattern"), balance: effectOf(axes, "balance"), seasonal: effectOf(axes, "seasonal"), rescueScope: rescueSegments === 0 ? "none" : rescueSegments === sourceJudgments.length ? "all" : "some",
    god: canonicalizeStrengthTenGod(node.stemTenGod), focus: groups.includes("authority") ? "responsibility" : groups.includes("wealth") ? "resources" : groups.includes("output") ? "expression" : groups.includes("resource") ? "support" : "autonomy",
    facts: input.facts.filter((fact) => includeHour || fact.natalPosition !== "hour"), axes, assessment };
  const evidence = [`正文规则 ${LOCAL_DETAILED_CONTENT_VERSION}；${horizon}；实际路径 ${path}；结构${context.pattern}、扶抑${context.balance}、调候${context.seasonal}，未按票数合成。`,
    `源修订 ${revision.id}；结果 ${revision.manifest.resultHash}；目标节点 ${node.ref.nodeId}；${node.startInstant} 至 ${node.endExclusiveInstant}。`,
    `真实年龄语境 ${age.label}，个人适用起点 ${age.personalStartInstant}。`,
    ...visible.map((pillar) => `本命${pillar.label}${pillar.ganZhi}透${pillar.stemTenGod}。`),
    ...axes.flatMap((axis) => [`${axis.axis}：${axis.pathId}／${axis.effect}；${axis.ruleId}；来源${axis.sourceIds.join("、")}。`, ...axis.evidence, ...axis.blockers, ...axis.rescues])];
  const conditions = unique([...age.conditions, ...sourceJudgments.flatMap((item) => [...item.conditions, ...item.axes.flatMap((axis) => axis.unresolvedConditions)]),
    ...age.segments.map((segment) => `${segment.label}叙述适用 ${segment.startInstant} 至 ${segment.endExclusiveInstant}，不改变原运限边界。`),
    ...(context.pattern === "neutral" || context.pattern === "unresolved" ? ["结构中性或未决只保留事务主题，不由未知额外推断承压。"] : []),
    ...(context.pattern === "varied" || context.balance === "varied" || context.seasonal === "varied" ? ["所列分段或顺逆假设有不同作用，正文只概括共同事务，具体方向仍看各段原判断。"] : []),
    "生活情境是传统初判的现代解释，未识别实际职业、学籍、收入或婚恋状态，没有事件概率或结果保证。",
    ...(context.facts.some((fact) => fact.natalPosition === "day" && fact.type.startsWith("stem_")) && !context.facts.some((fact) => fact.natalPosition === "day" && fact.type.startsWith("branch_")) ? ["本期仅有日干互动，解释个人角色与参与方式，不扩成日支或婚姻状态变化。"] : [])]);
  const titles = age.stage === "adult" ? ["事业与能力发展", "财务与资源安排", "关系与协作"] : age.stage === "adult_transition" ? ["学习实践与后续发展", "不同阶段的资源安排", "自主空间与相处方式"] : age.stage === "unknown" ? ["任务与能力运用", "日常资源安排", "个人与协作"] : ["学习探索与成长", "日常支持与活动资源", "照料、亲子与同伴"];
  const taskText = (domain?: "career" | "wealth") => sourceJudgments.flatMap((source) => {
    const pattern = source.axes.find((axis) => axis.axis === "pattern");
    if (!pattern) return [];
    const prose = buildNatalTransitTaskProse({ links: pattern.taskLinks, effect: pattern.effect, actions: pattern.stemActions?.items ?? [],
      ageStage: age.stage, domain, horizon });
    if (!prose) return [];
    const part = input.judgmentSegments?.find((segment) => segment.judgment === source);
    return [sourceJudgments.length > 1 ? `${part?.branchLabel ?? "本段"}（${source.interval.startInstant} 至 ${source.interval.endExclusiveInstant}，不含终点）：${prose.summary}` : prose.summary];
  }).join("\n\n");
  const themes = (["career", "wealth", "relationship"] as const).map((id, index): DetailedContentTheme => ({ id, title: titles[index]!, text: id !== "relationship" && taskText(id)
    ? taskText(id) : `${themeText(id, context)}${id === "career" ? segmentNotes(context, input.judgmentSegments ?? []) : ""}`, evidence: unique([...evidence, ...context.facts.filter((fact) => id === "career" ? fact.natalPosition === "month" : id === "relationship" ? fact.natalPosition === "day" : isClash(fact)).map((fact) => fact.text)]) }));
  const phase = age.stage === "unknown" ? "年龄未可靠换算，先按日常任务理解" : age.stage === "adult_transition" ? `${age.label}，学习与成人事务按实际年龄分别阅读` : age.stage === "adult" ? `${age.label}，具体按现实身份对照` : `${age.label}，先看成长、学习和日常支持`;
  return { age, themes, evidence: unique(evidence), conditions, paragraphs: [
    `${stagePrefix(context)}为${node.ganZhi}，${phase}。${judgment.headline.includes("：") ? judgment.headline.slice(judgment.headline.indexOf("：") + 1) : judgment.headline}。`,
    `${taskText() || mechanics(context)}${horizon === "decade" ? "这里描述逐步形成的能力与选择，具体年份和月份仍会改变表现。" : "这里描述眼前事项的推进与调整，不能把一个节令月的作用延伸成整步大运。"}`,
    interactionText(context)
  ] };
}
