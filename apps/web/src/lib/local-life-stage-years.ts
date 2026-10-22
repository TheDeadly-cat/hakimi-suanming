import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { buildNatalTransitTaskProse } from "./outlook-task-link-prose";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory, type LocalLifeStageStory, type LifeStageStoryStage } from "./local-life-stage-story";
import type { LocalAnnualOutlook, LocalAnnualYear } from "./local-annual-outlook";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import type { AnnualDomainBranchId, AnnualReadingDomainId } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import type { AnnualEventItem, AnnualEventSegment } from "./local-annual-event-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { ReadingContextReference } from "./local-reading-context";
import type { OutlookAxis, OutlookEffect, OutlookStemAction, LocalOutlookJudgment, LocalOutlookJudgmentSegment } from "./local-outlook-judgment";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";
import { evaluateNatalWealthResourceTask, NATAL_WEALTH_RESOURCE_TASK_VERSION, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";

export const LIFE_STAGE_YEARS_VERSION = "hakimi.local-life-stage-years/0.4.0" as const;
export interface LifeStageYearBasisRef {
  year: number; segmentId: string; axisId: string;
  field: "summary" | "evidence" | "blockers" | "rescues" | "unresolvedConditions" | "satisfiedConditions";
  index?: number;
}
export interface LifeStageYearSegment {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string;
  personalStartInstant: string; backgroundRefs: TransitNodeRef[];
  judgmentVersion: string; policyVersion: string; caption: string;
  ageStage: AnnualEventSegment["ageStage"]; ageLabel: string; age: AnnualEventSegment["age"];
  headline: string; paragraphs: string[]; advantages: string[]; pressures: string[]; conditions: string[];
  annualActions: OutlookStemAction[];
  axisEffects: { axis: OutlookAxis; effect: OutlookEffect }[];
  /** Original items and original order; this bridge does not rank or rewrite them. */
  items: AnnualEventItem[];
  domainRefs: { id: AnnualReadingDomainId; subjectId: string; headline: string }[];
  basisRefs: LifeStageYearBasisRef[]; sourceSubjects: string[];
}
export interface LifeStageYear {
  /** Stable across annual-window and current-date changes. */
  id: string; year: number; yearGanZhi: string; yearNodeRef: TransitNodeRef;
  startInstant: string; endExclusiveInstant: string;
  headline: string; paragraphs: string[]; segments: LifeStageYearSegment[];
  sourceSubjects: string[]; sourceVersions: string[]; contextRef: ReadingContextReference | null;
}
export interface LifeStageYearsGap {
  startInstant: string; endExclusiveInstant: string;
  reason: "outside_annual_window" | "missing_annual_segment"; message: string;
}
export interface LocalLifeStageYears {
  version: typeof LIFE_STAGE_YEARS_VERSION;
  sourceBinding: LocalLifeStageStory["sourceBinding"]; sourceVersions: string[];
  branchId: AnnualDomainBranchId; branchLabel: string; stage: LifeStageStoryStage;
  annualStartYear: number; annualEndYear: number;
  headline: string; summary: string; years: LifeStageYear[];
  highlights: { yearId: string; reason: string }[];
  coverage: { status: "complete" | "partial" | "unavailable";
    coveredIntervals: { startInstant: string; endExclusiveInstant: string }[]; gaps: LifeStageYearsGap[] };
  limitations: string[];
}
export interface BuildLifeStageYearsInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; life: LocalLifeOutlook;
  lifeStageStory: LocalLifeStageStory; selectedDecadeId: string;
  annual: LocalAnnualOutlook; annualDomains: LocalReadingAnnualDomains; annualEvents: LocalReadingAnnualEvents;
  contextual?: LocalContextualReadingBundle | null;
}

const unique = <T>(items: readonly T[]) => [...new Set(items)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (message: string): never => { throw new Error(`大运与年份衔接：${message}`); };
const time = (value: string) => { const result = Date.parse(value); if (!Number.isFinite(result)) fail("存在无效瞬时点。"); return result; };
const axisNames: Record<OutlookAxis, string> = { balance: "承接", pattern: "结构配合", seasonal: "调候" };
const kinds = ["study", "proposal", "delivery", "settlement", "new_collaboration", "work_change", "shared_arrangements"];
const kindOf = (item: AnnualEventItem) => {
  const kind = item.origin.ruleId.split("/").at(-1)!;
  if (!kinds.includes(kind)) fail("原事项缺少受支持的明确类别。");
  return kind;
};

/** A life-language connection, not a new effect or a prediction of employment. */
function connection(path: string, kind: string, god: string, task: NatalWealthResourceTask | null): string {
  if (kind === "shared_arrangements") return "长期的参与方式，在这一年也会牵动与实际相处者怎样约定、配合和保留各自空间。相处事项沿它自己的星宫线索展开。";
  if (task?.task === "resource_first") return kind === "study"
    ? "这一年把阶段主线落到必要指导、方法和练习的持续供给；重点是仍不可缺少的支持能否接住已展开的事情，并非再多准备一些就够了。"
    : "这一年的参与、用途或完成范围，牵动原来仍不可缺少的指导与支持；新事项进入时，必要支持也有需要保留的位置。";
  if (task?.task === "wealth_first") return kind === "study"
    ? "这一年新增的材料、指导或方法，要与原来的积累分清用途；阶段主线是收拢重复准备，同时保留真正需要的支持。"
    : "这一年的实际用途与原有准备进入取舍；重点是哪些准备重复、哪些仍不可缺少，不能将这一主题直接当成成果采用或回报增加。";
  if (task?.task === "official_joint") return kind === "settlement"
    ? "这一年把原约定的确认与继续使用接到长期承担上；已经明确的要求、实际投入和执行所需支持各有分工，不能只落实其中一边。"
    : "这一年把具体参与接到已有要求与执行配套之间；实际投入和方法指导各有作用，原局的分工不免除本年实际出现的牵连。";
  if (path === "resource-output" || path === "hurting-resource") {
    if (kind === "proposal") return "长期积累在这里有了一个具体出口：把自己的解释或改法拿出来试用，让实际反馈回到下一轮理解。";
    if (kind === "settlement") return "这一年更贴近已经做出的部分怎样被确认、怎样继续使用；理解与打磨之后，关注点转到完成记录和后续承担。";
    if (kind === "delivery") return "这一年把理解与呈现接到连续完成上，做熟一件事、讲清一种方法，比只多准备一份材料更贴近主线。";
    if (kind === "study") return "这一年又把注意力带回学习、指导或方法整理。新的理解怎样进入一次实际呈现，是它与长期积累之间的连接处。";
    if (kind === "new_collaboration") return "这一年把已有理解和本领带到不同用途面前，选择哪一种参与方式，也是在选择哪些积累值得继续使用。";
    return god === "比肩" ? "这一年更贴近把已学内容做成自己负责的一部分，再和同伴的完成结果衔接；自主完成是检验理解的一种方式。"
      : god === "劫财" ? "这一年更贴近把理解和表达放进共同事项，交流各自的方法，同时分清哪些可以共用、哪些仍由自己决定。"
        : "这一年让已有理解面对更明确的要求；表达得清楚与实际做到，需要在同一件事情里相互配合。";
  }
  if (path === "resource-wealth") return kind === "study" ? "新的材料、指导或方法进入已有积累，具体要分清哪些真正用得上，哪些只是又添了一轮准备。"
    : kind === "settlement" || kind === "new_collaboration" ? "这一年的实际用途，可以帮助筛选原有资料、工具和准备；留下用得上的部分，与简单扩大投入是两种不同做法。"
      : "这一年的参与与完成方式，会影响原有准备由谁使用、为哪一件事保留；阶段主线仍是让已有积累服务明确用途。";
  if (["peer-output-wealth", "hurting-wealth", "food-wealth", "wealth-food"].includes(path)) return kind === "proposal" ? "这一年把自己的判断变成可试的解法，再看别人是否真正用得上，想法、作品与用途之间的联系因此更具体。"
    : kind === "settlement" ? "这一年更贴近已有成果怎样得到确认，以及付出、使用与后续责任能否接起来；重点从提出想法走向做成之后的衔接。"
      : kind === "study" ? "新的理解和准备要接到已经在做的事情，才能继续服务实际产出；补方法与留出动手时间需要相互配合。"
        : kind === "delivery" ? "这一年把个人本领放到持续完成里，重复做到与保持质量，会让原来的想法留下更稳定的用途。"
          : "这一年的参与、选择和投入，更具体地影响个人本领由谁使用、怎样共同完成；自己的判断与实际结果需要继续连在一起。";
  if (path === "food-killings") return kind === "study" ? "这一年的指导或准备，会碰到原来处理难点的方法；理解新的要求与保留已经熟悉的步骤，需要一起衔接。"
    : "这一年把长期形成的方法放进一件具体难点中，先拆清要完成什么，再看熟悉的办法和实际帮助能否接住。";
  if (["official-resource", "killings-resource", "resource-preservation"].includes(path)) return kind === "study" ? "这一年更贴近说明、学习和帮助怎样进入实际承担；已有指导是否能用起来，比只增加准备更重要。"
    : "这一年把长期的要求与支持，落到自己真正参与的事情上；理解标准、获得帮助和亲自完成是相连的几步。";
  if (path === "official-wealth") return "这一年的时间、材料和参与安排，会与既有要求相互牵动；明确要完成什么，再分清能够自行决定的部分与需要协作的部分。";
  return "这一年的具体参与与完成方式，使长期主线有了可观察的落点；沿已有事项比较进展和牵制，不另设一种整步方向。";
}

export function actionTheme(action: OutlookStemAction): { topic: string; help: string; pressure: string } {
  const themes: Record<string, { topic: string; help: string; pressure: string }> = {
    比肩: { topic: "独立承担与平级分工", help: "自己的承担与实际帮助较有条件接上", pressure: "各自的安排和共同使用容易拉扯" },
    劫财: { topic: "共同参与、投入份额与决定边界", help: "共同参与较有条件支持实际完成", pressure: "共同使用与决定权会牵动原有安排" },
    食神: { topic: "稳定练习、细致表达与连续完成", help: "熟悉的方法较有条件形成稳定、可使用的成果", pressure: "持续完成受到额外准备或负荷的牵动" },
    伤官: { topic: "表达自己的解法与试用不同做法", help: "自己的解释或改法较有条件进入实际尝试", pressure: "展开的内容与完成、收尾之间容易脱节" },
    正财: { topic: "已有成果的确认、用途和后续承担", help: "已经做出的部分较有条件接到明确用途和回应", pressure: "投入、完成与得到确认的节奏容易错开" },
    偏财: { topic: "新的用途、合作选择与弹性安排", help: "已有本领较有条件找到不同的使用方式", pressure: "不同选择可能先占用同一份时间和条件" },
    正官: { topic: "明确要求与持续责任", help: "要求与实际能力较有条件相配", pressure: "责任和完成标准可能先于实际帮助到位" },
    七杀: { topic: "集中要求与处理顺序", help: "处理难点的方法较有条件接到具体要求", pressure: "几项要求容易抢占同一段时间和支持" },
    正印: { topic: "理解方法、学习与接受指导", help: "已有解释与帮助较有条件进入实际使用", pressure: "继续补准备可能挤掉原本用于呈现和完成的时间" },
    偏印: { topic: "专项探索与重新整理方法", help: "新的理解较有条件补上原有做法的不足", pressure: "方法反复切换可能打断原来已经开始的完成过程" }
  };
  return themes[action.tenGod] ?? fail("本年作用没有明确的十神主题。");
}

function taskActionTheme(action: OutlookStemAction, task: NatalWealthResourceTask | null): ReturnType<typeof actionTheme> {
  if (!task) return actionTheme(action);
  const group = strengthTenGodGroup(action.tenGod), regular = action.tenGod === "正财";
  if (task.task === "resource_first") return group === "wealth"
    ? { topic: regular ? "原约定与必要支持的分工" : "新用途与必要支持的分工", help: "实际用途较能与仍需保留的指导、练习和帮助配合", pressure: "实际用途牵动原来必需的指导或支持，已展开的事情可能缺少配套" }
    : group === "output" ? { topic: "继续完成与可用支持的对应", help: "正在完成的内容较能得到必要支持", pressure: "继续做或说的范围超过当前支持能接住的部分，原来的完成节奏受到牵动" }
      : { topic: group === "resource" ? "必要指导与帮助的持续供给" : "实际参与与必要支持的衔接", help: "仍不可缺少的方法或帮助较能接到已经展开的事情", pressure: "必要的支持本身仍有牵连，不能照原安排用于当前事项" };
  if (task.task === "wealth_first") return group === "resource"
    ? { topic: "新增方法与重复准备的取舍", help: "已有支持较能对应实际用途，重复准备有了收拢余地", pressure: "新的说明、方法或准备叠到已有积累上，实际使用仍容易被推后" }
    : { topic: group === "wealth" ? regular ? "既有用途与准备范围的取舍" : "新用途与原有准备的取舍" : "实际参与对准备范围的影响", help: "实际用途较能帮助收拢重复准备，同时保留必要支持", pressure: "调节准备的条件仍受牵连，已有投入难按原设想转向明确用途" };
  return { topic: group === "wealth" ? regular ? "原约定确认与执行支持" : "新用途与既有要求的配套" : "明确要求与可用方法的配合",
    help: "已经明确的要求较能接到方法、指导与实际投入，各自支持具体完成的一步",
    pressure: group === "wealth" ? "实际用途牵动执行所需的方法与支持，原有要求仍在，配套却未同步" : "眼前配合仍有牵连，既定要求与必要支持未能接到同一步" };
}

function basisFor(year: number, segment: LocalOutlookJudgmentSegment): LifeStageYearBasisRef[] {
  return segment.judgment.axes.flatMap((axis) => [
    { year, segmentId: segment.id, axisId: axis.id, field: "summary" as const },
    ...(["evidence", "blockers", "rescues", "unresolvedConditions", "satisfiedConditions"] as const).flatMap((field) => axis[field].map((_line, index) =>
      ({ year, segmentId: segment.id, axisId: axis.id, field, index })))
  ]);
}

function makeSegment(year: LocalAnnualYear, original: LocalOutlookJudgmentSegment, source: AnnualEventSegment,
  stage: LifeStageStoryStage, stageJudgment: LocalOutlookJudgment, domainRefs: LifeStageYearSegment["domainRefs"], natalTask: NatalWealthResourceTask): LifeStageYearSegment {
  const j = original.judgment, pattern = j.axes.find((axis) => axis.axis === "pattern")!;
  if (natalTask.preferredPathId && natalTask.preferredPathId !== pattern.pathId) fail("本命任务与原年度结构路径不一致。");
  const task = natalTask.preferredPathId && ["resource_first", "wealth_first", "official_joint"].includes(natalTask.task) ? natalTask : null;
  const actions = pattern.stemActions?.items ?? fail("本年缺少原透干与支内作用。");
  const visible = actions.find((action) => action.visibility === "visible") ?? fail("本年缺少原透干作用。");
  const hidden = actions.find((action) => action.visibility === "main_hidden") ?? fail("本年缺少原支内作用。");
  const primary = source.items[0], kind = primary ? kindOf(primary) : "work_change";
  const title = primary?.title ?? taskActionTheme(visible, task).topic;
  const advantages: string[] = [], pressures: string[] = [];
  for (const action of actions) {
    const words = taskActionTheme(action, task), origin = action.visibility === "visible" ? `本年${action.stem}${action.tenGod}直接带来的配合` : `年支内${action.stem}${action.tenGod}的配合`;
    if (action.effect === "assists" || action.effect === "mixed") advantages.push(`${origin}：${words.help}。`);
    if (action.effect === "obstructs" || action.effect === "mixed") pressures.push(`${origin}：${words.pressure}。`);
  }
  for (const axis of j.axes.filter((item) => item.axis !== "pattern")) {
    if (axis.effect === "assists" || axis.effect === "mixed") advantages.push(`${axisNames[axis.axis]}：${axis.summary}`);
    if (axis.effect === "obstructs" || axis.effect === "mixed") pressures.push(`${axisNames[axis.axis]}：${axis.summary}`);
  }
  const words = taskActionTheme(visible, task), hiddenWords = taskActionTheme(hidden, task);
  let annualAction = visible.effect === "assists" ? `这年较可发挥的是${words.topic}，${words.help}。`
    : visible.effect === "obstructs" ? `这年更需留意${words.topic}中的反复：${words.pressure}。`
      : visible.effect === "mixed" ? `这年的${words.topic}同时有两面：${words.help}，但${words.pressure}。`
        : `这年直接带出的主题是${words.topic}。`;
  if (hidden.effect === "assists" || hidden.effect === "mixed") annualAction += `另外，年支内还有${hiddenWords.topic}的支持线索，${hiddenWords.help}。`;
  if (hidden.effect === "obstructs" || hidden.effect === "mixed") annualAction += `年支内也保留另一层牵制：${hiddenWords.pressure}。`;
  // An actor is never upgraded from a different actor's or axis's effect.
  if ((visible.effect === "neutral" || visible.effect === "unresolved") && hidden.effect === "assists") annualAction += "这里较可用的是后面的配合，不能把前面的事项主题一并当成必然顺利。";
  if (pattern.effect === "mixed" && !actions.some((action) => action.effect === "obstructs" || action.effect === "mixed")) annualAction += "这些可用之处同时受到原有承接范围的限制，展开与完成需要同步。";
  if (pattern.effect === "obstructs" && !actions.some((action) => action.effect === "obstructs" || action.effect === "mixed")) annualAction += "本年整体配合仍有牵制，具体事项的出现并不表示原来的阻碍已经解开。";
  if (pattern.rescues.length) annualAction += "本年还有转圜条件：原有的办法或支持真正接到这项事情，才可能减少反复。";
  const stagePattern = stageJudgment.axes.find((axis) => axis.axis === "pattern")!;
  if ((stagePattern.effect === "obstructs" || stagePattern.effect === "mixed") && pattern.effect === "assists") annualAction += `这一年的助力可落在具体事情上；${stage.ganZhi}整步仍有的牵制是：${(stage.pressures[0] ?? stagePattern.summary).replace(/^直接进入的主题：/u, "")}`;
  if (primary?.domain === "relationship") annualAction = `与上述相处线索分开，本年的能力与事项配合还包括：${annualAction}`;
  const linked = buildNatalTransitTaskProse({ links: pattern.taskLinks, effect: pattern.effect, actions,
    kind, ageStage: source.age.stage, horizon: "year" });
  const paragraphs = linked ? [`${stage.ganZhi}这一步围绕“${stage.headline}”展开。${year.year}年的重点是“${linked.title}”。`, linked.summary]
    : [`${stage.ganZhi}这一步围绕“${stage.headline}”展开。到${year.year}年，更具体地落在“${title}”。${connection(pattern.pathId, kind, visible.tenGod, task)}`, annualAction];
  // A crossing-age year can contain a different example for each real phase.
  // Keep all original age examples instead of presenting the first as the year.
  const examples = source.age.segments.length > 1 ? primary?.examples ?? [] : primary?.examples.slice(0, 1) ?? [];
  paragraphs.push(...examples.map((example) => `可以对照的具体表现是：${example}`));
  const sourceSubjects = unique(["life-overview", `life-stage-story-${stage.decadeId}`, `decade-${stage.decadeId}`, `annual-${year.year}`,
    ...domainRefs.map((ref) => ref.subjectId), ...source.items.map((item) => annualEventFeedbackSubjectId(year.year, source, item)),
    ...source.items.flatMap((item) => item.origin.contextSubjectId ? [item.origin.contextSubjectId] : [])]);
  return { id: source.id, branchId: source.branchId, startInstant: source.startInstant, endExclusiveInstant: source.endExclusiveInstant,
    personalStartInstant: source.personalStartInstant, backgroundRefs: structuredClone(source.backgroundRefs), judgmentVersion: source.judgmentVersion, policyVersion: source.policyVersion,
    caption: source.judgmentCaption, ageStage: source.ageStage, ageLabel: source.ageLabel, age: structuredClone(source.age), headline: title, paragraphs,
    advantages: unique(advantages), pressures: unique(pressures), conditions: unique([...source.conditions, ...j.conditions, ...j.conflicts, ...j.coverageGaps,
      ...j.axes.flatMap((axis) => axis.unresolvedConditions), ...pattern.blockers, ...pattern.rescues,
      "年度作用是在原大运背景中对本年新增字的判断，不是将年度与大运相减所得的新分数，也不改写整步方向。",
      ...(visible.effect === "neutral" || visible.effect === "unresolved" ? ["本年透干只有事项主题或未决作用，不能借年支或其他轴的助力替它定顺。"] : [])]),
    annualActions: structuredClone(actions), axisEffects: j.axes.map((axis) => ({ axis: axis.axis, effect: axis.effect })), items: structuredClone(source.items),
    domainRefs, basisRefs: basisFor(year.year, original), sourceSubjects };
}

function coverageFor(stage: LifeStageStoryStage, years: LifeStageYear[], annual: LocalAnnualOutlook): LocalLifeStageYears["coverage"] {
  const spans = years.flatMap((year) => year.segments.map((segment) => ({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant })))
    .sort((a, b) => time(a.startInstant) - time(b.startInstant));
  const coveredIntervals: typeof spans = [];
  for (const span of spans) {
    const previous = coveredIntervals.at(-1);
    if (previous && time(span.startInstant) < time(previous.endExclusiveInstant)) fail("同一大运的年度分段重叠。");
    if (previous && time(span.startInstant) === time(previous.endExclusiveInstant)) previous.endExclusiveInstant = span.endExclusiveInstant;
    else coveredIntervals.push({ ...span });
  }
  const annualSpans = annual.years.filter((year) => year.startInstant && year.endExclusiveInstant);
  const windowStart = annualSpans.length ? Math.min(...annualSpans.map((year) => time(year.startInstant!))) : null;
  const windowEnd = annualSpans.length ? Math.max(...annualSpans.map((year) => time(year.endExclusiveInstant!))) : null;
  const gaps: LifeStageYearsGap[] = [];
  const addGap = (startInstant: string, endExclusiveInstant: string) => {
    const start = time(startInstant), end = time(endExclusiveInstant);
    const cuts = [start, end, ...(windowStart !== null && start < windowStart && windowStart < end ? [windowStart] : []), ...(windowEnd !== null && start < windowEnd && windowEnd < end ? [windowEnd] : [])].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const from = cuts[i - 1]!, to = cuts[i]!;
      const reason = windowStart !== null && windowEnd !== null && from >= windowStart && to <= windowEnd ? "missing_annual_segment" : "outside_annual_window";
      gaps.push({ startInstant: from === start ? startInstant : new Date(from).toISOString(), endExclusiveInstant: to === end ? endExclusiveInstant : new Date(to).toISOString(), reason,
        message: reason === "outside_annual_window" ? "这段不在当前已读取的年度范围内，可读取本步全部年份后查看。" : "这段没有可对应到本步的原年度分段，未借用其他阶段或分支。" });
    }
  };
  let cursor = stage.startInstant;
  for (const span of coveredIntervals) { if (time(cursor) < time(span.startInstant)) addGap(cursor, span.startInstant); cursor = span.endExclusiveInstant; }
  if (time(cursor) < time(stage.endExclusiveInstant)) addGap(cursor, stage.endExclusiveInstant);
  return { status: !coveredIntervals.length ? "unavailable" : gaps.length ? "partial" : "complete", coveredIntervals, gaps };
}

function highlightYears(years: LifeStageYear[]): LocalLifeStageYears["highlights"] {
  const selected: LocalLifeStageYears["highlights"] = [], seen = new Set<string>();
  for (const year of years) {
    const key = stable(year.segments.map((segment) => ({ actions: segment.annualActions.map(({ visibility, tenGod, effect }) => ({ visibility, tenGod, effect })),
      items: segment.items.map((item) => ({ domain: item.domain, kind: kindOf(item), title: item.title })) })));
    if (seen.has(key)) continue;
    seen.add(key); selected.push({ yearId: year.id, reason: selected.length ? "按时间先后，首次出现这一组原年度主题与作用配合。" : "从当前已读取范围内的第一年开始，先看阶段主线怎样落到具体事项。" });
    if (selected.length === 4) break;
  }
  return selected;
}

export function buildLifeStageYears(input: BuildLifeStageYearsInput): LocalLifeStageYears {
  const { revision, assessment, life, annual, annualDomains } = input;
  const story = buildLifeStageStory({ revision, assessment, life });
  if (!same(story, input.lifeStageStory)) fail("阶段主线全文或原大运来源与同修订重建结果不一致。");
  const matches = story.branches.flatMap((branch) => branch.stages.filter((stage) => stage.decadeId === input.selectedDecadeId).map((stage) => ({ branch, stage })));
  if (matches.length !== 1) fail("没有唯一的所选原大运。");
  const { branch, stage } = matches[0]!;
  if (!Number.isSafeInteger(annual.startYear) || !Number.isSafeInteger(annual.endYear) || annual.startYear > annual.endYear
    || annual.years.length !== annual.endYear - annual.startYear + 1 || annual.years.some((year, index) => year.year !== annual.startYear + index)) fail("原年度窗口缺年、重复或顺序不完整。");
  const events = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains, ...(input.contextual === undefined ? {} : { contextual: input.contextual }) });
  if (!same(events, input.annualEvents)) fail("年度事项原文、版本或现实背景与同修订重建结果不一致。");
  const natalTask = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour: assessment.sourceBinding.includeHour });
  const stageSource = life.decades.find((decade) => decade.id === stage.decadeId)!;
  const years: LifeStageYear[] = [];
  for (const year of annual.years) {
    if (!year.startInstant || !year.endExclusiveInstant) continue;
    if (time(year.startInstant) >= time(stage.endExclusiveInstant) || time(year.endExclusiveInstant) <= time(stage.startInstant)) continue;
    const eventYear = events.years.find((item) => item.year === year.year)!, domainYear = annualDomains.years.find((item) => item.year === year.year)!;
    const eventBranch = eventYear.branches.find((item) => item.id === branch.id), domainBranch = domainYear.branches.find((item) => item.id === branch.id);
    const originals = year.judgmentSegments.filter((segment) => segment.branchId === branch.id
      && time(segment.startInstant) < time(stage.endExclusiveInstant) && time(segment.endExclusiveInstant) > time(stage.startInstant));
    if (!originals.length) continue;
    if (!year.transitNodeRef || !year.yearGanZhi || !eventBranch || !domainBranch) fail("相交年度缺少同一分支的节点或原领域、事项。");
    const boundEvents = eventBranch ?? fail("相交年度缺少原事项分支。"), boundDomains = domainBranch ?? fail("相交年度缺少原领域分支。");
    const segments = originals.map((original) => {
      const j = original.judgment;
      if (time(original.startInstant) < time(stage.startInstant) || time(original.endExclusiveInstant) > time(stage.endExclusiveInstant)
        || !same(j.targetRef, year.transitNodeRef) || j.backgroundRefs.length !== 1 || !same(j.backgroundRefs[0], stage.nodeRef)) fail("原年度分段未精确属于所选大运节点或区间，不能借用另一交运段。");
      const dayun = year.dayunSegments.filter((item) => item.direction === branch.id && same(item.nodeRef, stage.nodeRef));
      if (dayun.length !== 1 || dayun[0]!.sourceStartInstant !== stage.startInstant || dayun[0]!.sourceEndExclusiveInstant !== stage.endExclusiveInstant
        || dayun[0]!.startInstant !== original.startInstant || dayun[0]!.endExclusiveInstant !== original.endExclusiveInstant) fail("年度背景与完整原大运及其实际交集不一致。");
      const eventSegments = boundEvents.segments.filter((segment) => segment.id === original.id), domainSegments = boundDomains.segments.filter((segment) => segment.id === original.id);
      if (eventSegments.length !== 1 || domainSegments.length !== 1) fail("同年度分段对应的事项或领域重复、缺失。");
      const eventSegment = eventSegments[0]!, domainSegment = domainSegments[0]!;
      for (const candidate of [eventSegment, domainSegment]) if (candidate.branchId !== branch.id || candidate.startInstant !== original.startInstant
        || candidate.endExclusiveInstant !== original.endExclusiveInstant || !same(candidate.backgroundRefs, j.backgroundRefs)
        || candidate.judgmentCaption !== outlookDirectionCaption(j, null)) fail("原分段的判断、区间或背景引用不一致。");
      const domainRefs = domainSegment.domains.map((domain) => ({ id: domain.id, headline: domain.headline, subjectId: `annual-domain-${year.year}-${original.id}-${domain.id}` }));
      return makeSegment(year, original, eventSegment, stage, stageSource.judgment, domainRefs, natalTask);
    });
    const sourceVersions = unique([LIFE_STAGE_YEARS_VERSION, NATAL_WEALTH_RESOURCE_TASK_VERSION, ...story.sourceVersions, annual.version, annualDomains.version, ...domainYear.sourceVersions,
      events.version, eventYear.version, ...eventYear.sourceVersions]);
    years.push({ id: `${stage.decadeId}:${year.year}`, year: year.year, yearGanZhi: year.yearGanZhi!, yearNodeRef: structuredClone(year.transitNodeRef!),
      startInstant: segments[0]!.startInstant, endExclusiveInstant: segments.at(-1)!.endExclusiveInstant,
      headline: `${year.year}年 · ${segments[0]!.headline}`,
      paragraphs: segments.length > 1 ? ["本年在这一步内仍有不同分段，各段的新增作用和事项分别说明。"] : [],
      segments, sourceSubjects: unique(segments.flatMap((segment) => segment.sourceSubjects)), sourceVersions, contextRef: structuredClone(eventYear.contextRef) });
  }
  const coverage = coverageFor(stage, years, annual), highlights = highlightYears(years);
  return { version: LIFE_STAGE_YEARS_VERSION, sourceBinding: structuredClone(story.sourceBinding), sourceVersions: unique([LIFE_STAGE_YEARS_VERSION, NATAL_WEALTH_RESOURCE_TASK_VERSION, ...story.sourceVersions, annual.version, annualDomains.version, events.version, ...years.flatMap((year) => year.sourceVersions)]),
    branchId: branch.id, branchLabel: branch.label, stage: structuredClone(stage), annualStartYear: annual.startYear, annualEndYear: annual.endYear,
    headline: `${stage.ganZhi}大运里，具体年份怎样接上阶段主线`,
    summary: coverage.status === "complete" ? "本步实际重合的年份已完整列出，首尾年份只保留属于这一步的原分段。"
      : coverage.status === "partial" ? "当前先显示已读取年份与本步的实际交集，尚未覆盖的时段在下方保留。" : "当前年度范围内没有可对应到本步的原分段。",
    years, highlights, coverage, limitations: ["只衔接同一命盘、同一顺逆分支和同一实际大运节点；交运年前后分别保留，不将整年套到一边。",
      "先读年份按时间及既有事项、作用差异选取，不是最好或最差排名；其他原年份、事项与条件完整保留。",
      "大运主线与年度新增作用分别陈述，某年有助力不等于十年原有压力解除；年度事项沿原年龄和已确认自述适用。",
      "本层不新增吉凶判断、事件概率或实际职业婚姻事实；未读取时段和原来源缺口不补写。"] };
}
