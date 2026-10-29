import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { OutlookAxisFinding, OutlookEffect } from "./local-outlook-judgment";

export type EventDomain = "career" | "wealth" | "relationship" | "change";
export interface EventTopic { title: string; meaning: string; examples: string[] }
type LifeStage = "young_child" | "youth" | "adult_transition" | "adult" | "unknown";
export interface AnnualEventContext {
  stage: LifeStage; ageRange: string; path: string; pathLabel: string; effect: OutlookEffect;
  rescued: boolean; divergent: boolean; natalFocus: "responsibility" | "resources" | "expression" | "support" | "autonomy";
  god: string; patternAxes: OutlookAxisFinding[]; evidence: string[]; conditions: string[];
}
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const FLOW_PATHS = ["peer-output-wealth", "wealth-food", "hurting-wealth", "food-wealth"];
const PATH_LABELS: Record<string, string> = {
  "peer-output-wealth": "自主推进、技能产出与资源兑现的配合", "wealth-food": "实际需求与稳定产出的衔接", "hurting-wealth": "表达、解决问题与成果兑现的衔接", "food-wealth": "稳定技能与成果兑现的配合",
  "official-resource": "专业支持与职责承接的配合", "official-wealth": "资源安排与履责要求的衔接", "killings-resource": "专业支持与高要求任务的衔接", "food-killings": "具体方法与高要求任务的配合",
  "resource-output": "学习支持与实际成果的衔接", "resource-preservation": "积累与应用之间的取舍", "hurting-resource": "专业规范与个人表达的配合",
  "official-background": "职责与规则", "seven_killings-background": "高要求任务与承接能力", "resource-background": "学习支持与能力积累", "output-background": "个人表达与实际产出", "wealth-background": "现实需求与资源安排", "peer-background": "自主推进与同伴合作"
};
function ageAt(birth: Date, instant: number) {
  const date = new Date(instant), difference = date.getUTCFullYear() - birth.getUTCFullYear();
  const anniversary = Date.UTC(birth.getUTCFullYear() + difference, birth.getUTCMonth(), birth.getUTCDate(), birth.getUTCHours(), birth.getUTCMinutes(), birth.getUTCSeconds(), birth.getUTCMilliseconds());
  return Math.max(0, difference - (instant < anniversary ? 1 : 0));
}

/** Selects modern descriptions from already computed facts. No event probability,
 * new fortune score, or classical quantitative claim is introduced here. */
export function annualEventContext(revision: RevisionRecord, preliminary: BaziPreliminaryAssessment, year: LocalAnnualYear, god: string): AnnualEventContext {
  const birth = revision.timeCalibration.utcInstant ? Date.parse(revision.timeCalibration.utcInstant) : NaN;
  const start = Date.parse(year.startInstant!), end = Date.parse(year.endExclusiveInstant!);
  const low = Number.isFinite(birth) ? ageAt(new Date(birth), Math.max(start, birth)) : null;
  const high = Number.isFinite(birth) ? ageAt(new Date(birth), end - 1) : null;
  const stage: LifeStage = low === null || high === null ? "unknown" : high < 6 ? "young_child" : high < 18 ? "youth" : low < 18 ? "adult_transition" : "adult";
  const ageRange = low === null ? "年龄未能可靠换算" : `${low}${high !== low ? `—${high}` : ""}周岁`;
  const judgments = year.judgmentSegments.length ? year.judgmentSegments.map((segment) => segment.judgment) : year.judgment ? [year.judgment] : [];
  const patternAxes = judgments.flatMap((judgment) => judgment.axes.filter((axis) => axis.axis === "pattern"));
  const paths = unique(patternAxes.map((axis) => axis.pathId)), effects = unique(patternAxes.map((axis) => axis.effect));
  const path = paths.length === 1 ? paths[0]! : `${preliminary.pattern.family}-background`;
  // Disagreement is retained as a branch condition, never settled by voting.
  const effect: OutlookEffect = effects.length === 1 ? effects[0]! : effects.length ? "mixed" : "unresolved";
  const visible = [revision.facts.pillars.year, revision.facts.pillars.month, ...(preliminary.sourceBinding.includeHour ? [revision.facts.pillars.hour] : [])];
  const groups = visible.map((pillar) => strengthTenGodGroup(canonicalizeStrengthTenGod(pillar.stemTenGod)));
  const natalFocus = groups.includes("authority") ? "responsibility" : groups.includes("wealth") ? "resources" : groups.includes("output") ? "expression" : groups.includes("resource") ? "support" : "autonomy";
  const evidence = [
    `年龄语境：出生瞬时 ${revision.timeCalibration.utcInstant ?? "未锁定"}；年度 ${year.startInstant} 至 ${year.endExclusiveInstant}（不含终点）；按UTC周年换算 ${ageRange}。`,
    ...visible.map((pillar) => `本命${pillar.label}${pillar.ganZhi}透${pillar.stem}，为${canonicalizeStrengthTenGod(pillar.stemTenGod)}。`),
    ...patternAxes.flatMap((axis) => [`结构路径 ${axis.pathId}；作用 ${axis.effect}；规则 ${axis.ruleId}；来源 ${axis.sourceIds.join("、")}。`, ...axis.evidence, ...axis.blockers, ...axis.rescues]),
    ...year.judgmentSegments.map((segment) => `${segment.branchLabel}，${segment.startInstant} 至 ${segment.endExclusiveInstant}：${segment.judgment.headline}。`)
  ];
  const conditions = [
    `本流年约 ${ageRange}。年龄只用于选择生活场景；按UTC周年换算，闰日周年落在当年3月1日，6岁及18岁是本地措辞分界，不推断实际入学、就业或法律身份。`,
    ...(stage === "adult" ? ["职业、就学、收入和婚恋状态均未知；工作、合作或亲近关系的例子只在相应现实背景中适用。"]
      : stage === "adult_transition" ? ["本流年跨过18周岁措辞分界，先按学习、实践与家庭安排描述；只有确有工作或合作时才对应成人事务。"]
        : stage === "unknown" ? ["年龄未可靠换算，保留学习、协作与家庭事务，不假定已经就业或有收入。"] : ["儿童阶段只对应学习探索、照料和同伴生活；家庭资源安排不等于儿童自己的收入或投资。"]),
    ...unique(patternAxes.flatMap((axis) => axis.unresolvedConditions)),
    ...(effect === "neutral" ? ["本年在所选结构路径上未检出明确助力或阻碍，情境只说明事项主题，不额外推断承压。"]
      : effect === "unresolved" ? ["所选结构路径的作用仍未决，下面保留可对照的事项主题，不将未决当作不利。"] : []),
    ...(effects.length > 1 || year.dayunStatus !== "resolved" ? ["不同大运分段或顺逆假设下的作用并不完全相同，情境需按对应时间及分支阅读，未按票数合成。"] : [])
  ];
  return { stage, ageRange, path, pathLabel: PATH_LABELS[path] ?? preliminary.pattern.background, effect,
    rescued: patternAxes.some((axis) => axis.rescues.length > 0), divergent: effects.length > 1, natalFocus, god, patternAxes, evidence: unique(evidence), conditions: unique(conditions) };
}

function childhoodTopic(domain: EventDomain, context: AnnualEventContext): EventTopic {
  const early = context.stage === "young_child", supported = context.effect === "assists", difficult = context.effect === "obstructs";
  const group = strengthTenGodGroup(context.god);
  if (domain === "career") {
    if (early) return { title: "探索习惯与日常学习", meaning: `这一年先看孩子在游戏、表达和照料节奏中的适应；${supported ? "现有支持较容易接上新的尝试" : difficult ? "新要求与原有习惯之间可能需要更多适应时间" : "愿意尝试与需要照顾的部分可能同时出现"}`,
      examples: ["接触新的游戏、语言表达或日常活动，需要照料者反复回应", "活动方式或照料节奏改变，孩子在熟悉做法与新尝试之间转换"] };
    if (group === "output" || FLOW_PATHS.includes(context.path)) return { title: supported ? "表达与作品得到应用" : "学习表达与任务负荷",
      meaning: `按本盘${context.pathLabel}的具体作用，这一年更贴近作品展示、动手任务和表达机会；${supported ? "已有兴趣或方法较容易接上明确的学习任务" : difficult ? "想做的活动与能持续完成的任务可能不匹配" : "表现机会与完成要求并存，帮助能否落实会影响过程"}`,
      examples: supported ? ["已有兴趣被用于展示、比赛或小组成果，个人想法得到实际运用", "从练习转为完成一份可展示的作品，得到老师或同伴的具体回应"] : difficult || context.effect === "mixed" ? ["学习活动或小组任务增多，完成时间与个人节奏需要协调", "自己的做法与老师、小组的要求不同，完成方式进入讨论"] : ["已有兴趣被用于一次练习、展示或小组活动", "学习内容怎样表达、作品用什么形式呈现，成为具体任务"] };
    return { title: group === "authority" ? "规则要求与学习任务" : group === "peer" ? "同伴合作与自主尝试" : "学习方法与支持衔接",
      meaning: `这一年主要对应学习规则、同伴协作及帮助来源；${supported ? "已有帮助较能接住新的要求" : difficult ? "任务要求与能够得到的帮助可能不同步" : "独立尝试与接受指导之间需要磨合"}`,
      examples: ["学习要求、活动分工或同伴合作方式进入讨论", supported ? "老师或家人提供的方法被用于完成新的学习任务" : difficult || context.effect === "mixed" ? "同一任务出现不同要求，需要更多说明、练习或他人协助" : "学习方法与活动安排形成一项可具体讨论的计划"] };
  }
  if (domain === "wealth") return { title: early ? "照料与日常资源安排" : "学习活动与家庭资源",
    meaning: `资源主题在${context.ageRange}阶段主要落在家庭提供的时间、材料与活动条件；${difficult ? "几项需要可能争用同一份时间或开支" : "关注所需支持能否跟上实际活动"}`,
    examples: early ? ["照料时间、日常用品或活动安排需要家人重新协调", "新的活动需求与家庭原有节奏之间出现取舍"] : ["课程、活动材料或设备需求成为家庭讨论的事项", "不同学习活动需要家人分配陪伴时间和可用资源"] };
  if (domain === "relationship") return { title: early ? "照料关系与熟悉感" : "亲子约定与同伴相处", meaning: "本年的日柱互动放在年龄语境中，主要对应照料者、家人或同伴之间的相处节奏与共同约定",
    examples: early ? ["照料者或日常回应方式变化，需要重新建立熟悉的相处节奏", "孩子表达需要的方式与家人的理解之间出现磨合"] : ["与家人约定的作息、活动或责任需要重新协调", "朋友或小组的安排改变，个人意愿与共同规则进入讨论"] };
  return { title: early ? "活动节奏与照料衔接" : "学习与生活节奏转换", meaning: "变化主题先对应活动、学习或家庭安排的衔接，不预设成人的工作和收入变化",
    examples: early ? ["日常活动或照料安排前后不同，需要重新适应节奏", "熟悉环境与新活动之间转换，家人的陪伴方式随之调整"] : ["课程、活动或小组任务前后衔接，原来的时间安排需要改变", "若家庭确有地点或接送变化，学习和同伴活动的节奏会受到影响"] };
}

function ageNeutralTopic(domain: EventDomain): EventTopic {
  const topics: Record<EventDomain, EventTopic> = {
    career: { title: "任务与方法的衔接", meaning: "年龄尚未可靠换算，本项先对应学习、日常任务与协作中可以对照的事项", examples: ["现有方法被用于一项学习或协作任务", "共同事项需要明确各自的参与方式和完成内容"] },
    wealth: { title: "日常资源与共同事项", meaning: "资源主题先对应时间、材料与日常安排的用途", examples: ["一项共同事项开始讨论所需时间、材料或使用条件", "已有资源怎样用于当前需要，成为可具体协商的议题"] },
    relationship: { title: "个人意愿与共同安排", meaning: "本年的日柱互动先对应个人意愿与共同事项之间的协调，不预设具体关系身份", examples: ["自己的参与方式与他人的期待进入讨论", "原有共同约定需要结合当下实际安排再次确认"] },
    change: { title: "日常安排的衔接", meaning: "变化主题先对应计划、活动或协作方式的衔接，具体生活阶段仍需对应现实", examples: ["原定事项的先后顺序或参与方式进入调整", "一项安排结束，另一项安排开始，需要重新衔接时间"] }
  };
  return topics[domain];
}
function nonDirectionalTopic(domain: "career" | "wealth", context: AnnualEventContext): EventTopic {
  if (domain === "wealth") return { title: "资源用途与兑现条件", meaning: `本命${context.pathLabel}提供了资源阅读的线索，本年可对照的事项是现有投入怎样服务实际需要，以及共同事项采用什么兑现条件`,
    examples: ["已有投入、工具或时间安排与一项具体事务重新对应", "共同事项讨论使用范围、承担方式或验收条件，尚不由此判断收益变化"] };
  if (["official-resource", "official-wealth", "killings-resource"].includes(context.path)) return { title: "职责与专业准备的对应", meaning: `本命更强调${context.pathLabel}，本年的事项主题落在职责范围、专业准备与协作方式怎样对应`,
    examples: ["一项已有事务重新明确负责人、标准或交付说明", "现有经验或资格被用于讨论可以承担的范围"] };
  if (context.path === "food-killings") return { title: "问题要求与方法选择", meaning: "本年可对照的主题是具体问题采用什么解决方法，以及参与者分别负责哪一部分", examples: ["某项事务需要展示解决思路或核对具体方法", "任务标准、可用工具与协作方式进入讨论"] };
  if (["resource-output", "resource-preservation", "hurting-resource"].includes(context.path)) return { title: "学习内容的实际用途", meaning: `本命更强调${context.pathLabel}，本年可对照的事项是知识、经验或工具用在什么地方，以及成果采用什么形式呈现`,
    examples: ["已有知识或工具被用于一份方案、练习或阶段成果", "学习内容的应用范围与成果呈现方式进入讨论"] };
  return { title: "现有能力与任务形式", meaning: `本命${context.pathLabel}提供了事务阅读的线索，本年先关注已有能力怎样对应实际需要，以及参与方式如何确定`,
    examples: ["已有经验被用于一项实际任务，讨论明确的成果形式", "共同事项讨论参与范围、完成内容或后续衔接方式"] };
}

export function personalizeAnnualTopic(domain: EventDomain, base: EventTopic, context: AnnualEventContext, dayInteraction?: { branch: boolean; clash: boolean }): { rule: string; topic: EventTopic } {
  if (context.stage === "unknown") return { rule: `unknown-age-${context.path}-${context.effect}`, topic: ageNeutralTopic(domain) };
  if (context.stage !== "adult") return { rule: `${context.stage}-${context.path}-${context.effect}`, topic: childhoodTopic(domain, context) };
  if ((domain === "career" || domain === "wealth") && (context.effect === "neutral" || context.effect === "unresolved")) {
    return { rule: `${context.path}-${context.effect}-topic-only`, topic: nonDirectionalTopic(domain, context) };
  }
  const supported = context.effect === "assists", obstructed = context.effect === "obstructs", mixed = context.effect === "mixed";
  const group = strengthTenGodGroup(context.god), flow = FLOW_PATHS.includes(context.path), governed = ["official-resource", "official-wealth", "killings-resource"].includes(context.path);
  let topic = base;
  if (domain === "career" && flow) {
    const friction = group === "authority" ? "成果要求遇到规则约束" : group === "resource" ? "准备积累挤压实际交付" : group === "peer" ? "共同项目中的份额与主导权" : "需求增加，承接容易吃紧";
    topic = supported ? { title: "专业成果接上实际需求", meaning: `原局${context.pathLabel}在本年获得具体助力，事情更可能围绕已有能力怎样变成可交付成果展开，专业输出有机会成为合作的入口`,
      examples: ["已有方案、作品或专业方法被要求进入试用、交付或延续合作", "外部需求与自己的拿手能力接上，讨论从表达想法转向成果范围和兑现条件"] }
      : obstructed || mixed ? { title: mixed ? `${friction}，仍有承接空间` : friction,
        meaning: `原局依靠${context.pathLabel}衔接成果与资源，本年${group === "authority" ? "更可能面对成果要过审核、责任要落到人的情境" : group === "resource" ? "学习、准备或新的方法要求可能延长成果落地的过程" : group === "peer" ? "合作推进与个人负责范围、资源分配之间更容易出现拉扯" : "新需求与已有任务同时占用精力，机会并不等于已经有余力接住"}${context.rescued ? "；原有结构中存在具体保护或转圜条件，过程可能经过重新协调后继续推进" : ""}`,
        examples: group === "authority" ? ["原本按效果推进的事项，需要补充审核、标准或责任确认", "成果获得使用机会，同时被要求满足更明确的流程和交付限制"] : group === "resource" ? ["进修、工具更新或方法调整占用原定交付时间", "方案需要补充材料或重新验证，原来的完成节奏因此改变"] : group === "peer" ? ["同伴或合作方提出新的份额、权限或成果归属要求", "共同事项可以继续推进，但原定分工需要重新谈定"] : ["多个需求或合作同时到来，现有时间和支持难以全部覆盖", "接洽进展快于实际交付，范围、期限或承担方式出现重谈"] }
      : { ...base, meaning: `${base.meaning}；本命${context.pathLabel}提供了成果转化的线索，本年尚不足以把这条路径单向判成助力或阻碍` };
  } else if (domain === "career" && governed) {
    topic = { title: supported ? "职责得到专业与资源支持" : "职责要求与支持条件的磨合",
      meaning: `本命更强调${context.pathLabel}，本年${supported ? "更贴近既有专业积累被用于承担明确事务的情境" : mixed ? "既有专业支持可用，也有新增职责或既有规则带来的牵制" : "更容易出现要求先到、资格准备或支持安排随后补上的情境"}${context.rescued ? "；已有支持能提供缓冲，实际承接仍需协调" : ""}`,
      examples: supported ? ["组织或合作方把更明确的职责交给已有准备的人，同时提供流程或专业支持", "已有学习、资质或经验被用于一项需要审核和持续负责的事务"] : mixed ? ["已有专业经验提供了承担事务的空间，同时需要配合新的责任标准", "支持渠道能够接上一部分要求，剩余分工或执行方式仍需协调"] : ["新的责任、考核或履约标准到来，所需支持尚未完全同步", "表达意见或改变做法时，个人专业判断与既有规则发生需要协调的差异"] };
  } else if (domain === "career" && context.path === "food-killings") {
    topic = { title: supported ? "用实际方法处理难题" : "任务难度与解决办法重新匹配", meaning: `本命更强调${context.pathLabel}，本年更突出具体方法能否接住压力；${supported ? "已有技术或经验有可应用的空间" : mixed ? "已有方法能承接一部分要求，新的限制也影响实际应用" : "问题要求、解决工具与可承担范围之间尚有牵制"}`,
      examples: supported ? ["原来积累的方法被用于解决期限明确或要求较高的问题", "复杂任务被拆成可以交付的部分，具体能力得到检验"] : ["原有解决办法遇到新的限制，任务范围或完成条件需要调整", "压力要求与实际方法不完全对接，需要补充支持或改变分工"] };
  } else if (domain === "career" && ["resource-output", "hurting-resource", "resource-preservation"].includes(context.path)) {
    topic = { title: supported ? "积累开始转为可见成果" : "学习积累与实际表达之间的磨合", meaning: `本命${context.pathLabel}关注支持、学习与表达的衔接，本年${supported ? "较值得留意知识、经验或专业方法进入实际应用的机会" : mixed ? "既有积累能派上用场，实际表达或交付也受到条件牵制" : "可能面对准备已经不少、实际表达或应用仍需重整的情境"}`,
      examples: supported ? ["培训或研究中的内容被用于作品、方案或实际服务", "前辈指导与个人做法接上，形成可以重复使用的成果"] : ["对方法的理解与实际任务要求不同，需要重做表达或应用方式", "继续准备与按时交付之间出现拉扯，学习安排不能直接代替完成成果"] };
  }
  if (domain === "wealth" && flow) {
    topic = supported ? { title: "成果兑现的条件逐渐具体", meaning: `本命${context.pathLabel}与本年的助力落在成果转化环节，资源议题更可能是已有产出如何验收、结算与延续`,
      examples: ["已有工作成果或服务进入验收、结算、续约条件的讨论", "合作方开始明确对价与承担范围，投入和回报之间的联系更具体"] }
      : { title: context.rescued ? "兑现受牵制，但有协商余地" : "投入与兑现的节奏不一致", meaning: `同一条${context.pathLabel}路径在本年${obstructed ? "有较明确的负荷或牵制" : mixed ? "既有承接也有牵制" : "仍有适用条件"}，财务情境更贴近先投入时间、材料或协作成本，兑现条件仍需等待确认${context.rescued ? "；具体保护条件可能对应重新议定范围后恢复衔接" : ""}`,
      examples: ["事项已经消耗时间或资源，但验收、结算或分配条件尚未同步确定", context.rescued ? "原先卡住的范围或责任通过已有支持重新协商，继续推进仍需对方接受" : "几个目标争用同一份预算或精力，部分安排需要延后或缩小"] };
  } else if (domain === "wealth" && (governed || context.path === "food-killings")) {
    topic = { title: "承担责任所需的资源与回报", meaning: `本命${context.pathLabel}使资源议题更贴近履责所需的时间、工具与支持；${supported ? "已有准备与新增任务之间较有承接" : mixed ? "已有准备能支持一部分责任，资源调用仍有需要协调之处" : "责任扩大与可以调动的资源未必同步"}`,
      examples: ["任务或合作要求提高，所需设备、学习或协助成本变得具体", "承担范围与相应回报、支持或报销条件需要重新对应"] };
  } else if (domain === "wealth" && context.path.startsWith("resource")) {
    topic = { title: supported ? "学习投入开始找到用途" : "投入积累与眼前兑现的取舍", meaning: `本命积累与应用的取舍使资源主题落在学习、工具和能力建设；${supported ? "过去的投入更可能出现实际应用场景" : mixed ? "过去的投入有应用机会，眼前兑现也有需要协调的条件" : "继续积累与眼前可用成果之间可能出现时间差"}`,
      examples: ["原有课程、工具或专业积累被重新用于一项明确需求", "学习支持需要持续投入，同时当前任务对完成时间提出要求"] };
  }
  if (domain === "relationship" && dayInteraction) {
    const issue = context.natalFocus === "responsibility" ? "责任、承诺与各自角色" : context.natalFocus === "resources" ? "时间投入、共同计划与资源安排" : context.natalFocus === "expression" ? "表达方式与彼此期待" : context.natalFocus === "support" ? "照顾、支持与独立空间" : "自主安排与平等分工";
    topic = { title: dayInteraction.branch ? dayInteraction.clash ? "共同安排遇到不同节奏" : "共同意愿开始涉及实际投入" : "个人意愿与共同要求的协调",
      meaning: `本命透干较突出${issue}，本年${dayInteraction.branch ? dayInteraction.clash ? "日支受到冲的互动，可能面对双方节奏不同、原有约定需要调整的情境" : "日支出现合的互动，可能从表达意愿转向讨论一项更具体的共同安排" : "只有日干层面的互动，重点是自己的角色与对方要求怎样衔接"}`,
      examples: context.natalFocus === "resources" ? [dayInteraction.clash ? "一方投入事务的时间变化，牵动共同计划或相处安排" : "双方讨论共同活动或长期计划，具体时间与投入成为重点", "关系或合作中的承诺需要落到可承担的时间、成本与责任"] : context.natalFocus === "responsibility" ? ["双方对承诺或责任的理解不同，需要把各自能承担的范围说清", dayInteraction.clash ? "原有角色分工不再适合新的任务节奏，约定进入调整" : "一项共同计划需要双方确认各自角色，而非只表达意愿"] : ["个人想法与对方期待进入更具体的讨论，表达方式影响相互理解", dayInteraction.clash ? "相处或协作节奏发生变化，原来默认的安排需要重新确认" : "共同事项从口头意向转向实际安排，需要彼此持续回应"] };
  }
  return { rule: `${context.path}-${context.effect}${context.rescued ? "-rescue-conditional" : ""}`, topic };
}
