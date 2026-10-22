import { revisionRecordSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { buildNatalTransitTaskProse, OUTLOOK_TASK_LINK_PROSE_VERSION } from "./outlook-task-link-prose";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { LocalAnnualYear } from "./local-annual-outlook";
import { ANNUAL_LIFE_STORY_VERSION, type AnnualLifeStory, type AnnualLifeStoryBasisRef, type AnnualLifeStoryParagraph } from "./annual-life-story";
import { ANNUAL_EVENT_READING_VERSION, type AnnualEventItem, type LocalAnnualEventReading } from "./local-annual-event-reading";
import { annualEventFeedbackSubjectId } from "./local-annual-event-record";
import { createOutlookRescueVerifier, OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgment, type OutlookAxisFinding, type OutlookStemAction } from "./local-outlook-judgment";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";
import { buildAnnualPatternReaderProse, rewriteAnnualPatternScene, type AnnualPatternReaderProse } from "./annual-pattern-reader-prose";
import type { OutlookRescueTraceBundle } from "./outlook-rescue-trace";
import { buildAnnualRescueLifeProse, rescueRefKey, type AnnualRescueLifeProse } from "./annual-rescue-life-prose";
import { buildAnnualDistinctSceneProse, type AnnualDistinctSceneProse, type AnnualDistinctSceneProseInput } from "./annual-distinct-scene-prose";
import { buildPlainOutlookDomainReading, plainOutlookCaption, PLAIN_OUTLOOK_READING_VERSION } from "./plain-outlook-reading";

export const ANNUAL_READER_ANSWER_VERSION = "hakimi.annual-reader-answer/0.8.0" as const;
export interface BuildAnnualReaderAnswerInput {
  year: LocalAnnualYear; story: AnnualLifeStory; events: LocalAnnualEventReading;
  branchId: "locked" | "forward" | "backward"; segmentId: string;
  revision?: RevisionRecord; assessment?: BaziPreliminaryAssessment;
}
export interface AnnualReaderAnswerParagraph extends Omit<AnnualLifeStoryParagraph, "kind"> {
  kind: AnnualLifeStoryParagraph["kind"] | "scene";
  label?: string;
  detailsOnly?: boolean;
}
export function annualReaderParagraphLabel(paragraph: Pick<AnnualReaderAnswerParagraph, "kind" | "label">): string {
  return paragraph.label ?? ({ mainline: "今年重点", support: "较有利的环节", pressure: "主要阻力", coordination: "事项之间的联系", scene: "具体生活情境", relationship: "关系另看" } as const)[paragraph.kind];
}
export interface AnnualReaderAnswer {
  version: typeof ANNUAL_READER_ANSWER_VERSION;
  sourceBinding: LocalAnnualEventReading["sourceBinding"];
  sourceVersions: string[];
  scope: { year: number; branchId: BuildAnnualReaderAnswerInput["branchId"]; segmentId: string;
    startInstant: string; endExclusiveInstant: string; personalStartInstant: string; yearNodeRef: TransitNodeRef; backgroundRefs: TransitNodeRef[] };
  headline: string; caption: string; paragraphs: AnnualReaderAnswerParagraph[];
  sourceSubjects: string[]; conditions: string[]; coveredEventIds: string[];
  eventMappings: {
    eventId: string;
    summary: { original: string; paragraphIds: string[] };
    examples: { index: number; original: string; text: string; paragraphId: string;
      sceneSource?: Pick<AnnualDistinctSceneProse, "version" | "templateIds" | "setting" | "sourceMechanisms"> }[];
  }[];
  rescueMappings: { groupId: string; traceIds: string[]; paragraphId: string; text: string;
    rescueRefs: AnnualRescueLifeProse["groups"][number]["rescueRefs"]; basisRefs: AnnualRescueLifeProse["groups"][number]["basisRefs"] }[];
  originals: {
    storyHeadline: string; storySummary: string;
    storyParagraphs: AnnualLifeStoryParagraph[];
    eventTexts: Pick<AnnualEventItem, "id" | "domain" | "title" | "summary" | "examples" | "why" | "applicability" | "notApplicableWhen" | "conditions" | "evidence">[];
    actorBasis: { axisId: string; action: OutlookStemAction; summary: string | null; evidence: string[]; blockers: string[]; satisfiedConditions: string[] }[];
    natalTask?: NatalWealthResourceTask;
    rescueTrace?: OutlookRescueTraceBundle;
    wholeJudgment: Pick<LocalOutlookJudgment, "label" | "primaryAxis" | "headline" | "summary" | "axes" | "conflicts" | "conditions" | "coverageGaps">;
  };
}
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (text: string): never => { throw new Error(`年度阅读答案：${text}`); };
const must = (ok: boolean, text: string) => { if (!ok) fail(text); };
const effects = new Set(["assists", "obstructs", "mixed", "neutral", "unresolved"]);
const basisFields = new Set(["summary", "evidence", "blockers", "rescues", "unresolvedConditions", "satisfiedConditions"]);
const axisLabels = { balance: "承接与支持", pattern: "具体事项配合", seasonal: "原局用字配合" } as const;
const axisRefs = (axes: readonly OutlookAxisFinding[]): AnnualLifeStoryBasisRef[] => axes.flatMap(axis => [
  { axisId: axis.id, field: "summary" as const },
  ...(["evidence", "blockers", "rescues", "unresolvedConditions", "satisfiedConditions"] as const).flatMap(field => axis[field].map((_text, index) => ({ axisId: axis.id, field, index })))
]);
function balanceMeaning(axis: OutlookAxisFinding): string {
  if (axis.effect === "assists") return axis.pathId === "support"
    ? "已有事情较有条件获得支持，可用条件与需要完成的部分更能接上。"
    : "已有本领较有条件用起来，实际使用、成果回应与外部要求更有衔接。";
  if (axis.effect === "obstructs") return axis.pathId === "support"
    ? "需要完成的部分增加，可用帮助或条件尚未同步跟上。"
    : "准备和支持还在增加，已有本领用起来的出口却未同步打开。";
  if (axis.effect === "mixed") return "一面补充帮助，一面增加要承担的事情，可用条件与实际负担并未完全同步。";
  return axis.effect === "neutral" ? "承接这一面未另外给出偏顺或承压的方向。" : "承接这一面仍按具体任务保留取舍，尚未单独定向。";
}
function withoutRepeatedQualification(text: string): string {
  return ["这项进展仍有原来的承接与配合条件，单项能推进的部分不代表整段都顺畅。",
    "这项进展仍需要原有承接与配合条件落实，不能扩大为所有事情都顺。",
    "单项有发挥空间，整段仍有另一面的牵制，下面分开说明。"]
    .reduce((value, sentence) => value.split(sentence).join(""), text);
}
function composeWholeJudgment(judgment: LocalOutlookJudgment, patternMain: string, patternHeadline: string,
  task: NatalWealthResourceTask | null, targetGanZhi: string | null, rescueProse: AnnualRescueLifeProse | null) {
  const primary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis) ?? fail("整体判断没有对应的主导轴。");
  const pattern = judgment.axes.find(axis => axis.axis === "pattern")!;
  const main = withoutRepeatedQualification(patternMain);
  const introductory: Record<LocalOutlookJudgment["label"], string> = {
    较顺: "今年整体较顺。", 有压力: "今年整体较费力，有些事情容易被拖慢。", 利弊并见: "今年有机会，也有费力的地方，需要分开看。",
    条件性: primary.effect === "assists" ? "这一段有可推进的机会，结果还不能只看顺利的一面。"
      : primary.effect === "obstructs" ? judgment.axes.some(axis => axis.rescues.length > 0)
        ? "本段主要事情偏费力，已有转机仍有待落实。" : "本段主要事情偏费力，缓和这些牵制仍取决于具体条件。"
        : primary.effect === "mixed" ? "这一段有机会，也有会拖慢进度的问题。" : "这一段的结果尚未明朗，先看已经明确的事情和卡点。",
    主题解读: "今年已有明确事项主题，整体尚未形成单一助阻方向。", 暂不可判: "本段暂不形成个人年度结论。"
  };
  let overall = introductory[judgment.label];
  if (primary.axis === "balance") overall += `${balanceMeaning(primary)}具体到眼前事项，${main}`;
  else if (primary.axis === "seasonal") overall += `主导依据来自原局用字的配合：${primary.effect === "assists" ? "这一层已有支持。" : primary.effect === "obstructs" ? "这一层已有明确牵制。" : primary.effect === "mixed" ? "这一层的支持和牵制并存。" : "这一层还没有落实单一方向。"}${main}`;
  else overall += main;
  let headline = patternHeadline;
  if (primary.axis === "balance") headline = judgment.label === "较顺" ? primary.pathId === "support" ? "整体较顺，已有事情更有支持" : "整体较顺，已有本领更能用起来"
    : judgment.label === "利弊并见" ? "帮助与负担并存，推进有顺有阻" : primary.effect === "obstructs" ? "事情偏费力，可用条件尚未跟上" : "推进仍有条件，可用支持需要落实";
  else if (judgment.label === "利弊并见") headline = `有顺有阻：${patternHeadline}`;

  const supports: string[] = [], pressures: string[] = [], limitations: string[] = [], rescues = new Map<string, string[]>();
  const explainedConditions = new Set(rescueProse?.groups.flatMap(group => group.explainedConditionRefs.map(rescueRefKey)) ?? []);
  const explainedBlockers = new Set(rescueProse?.groups.flatMap(group => group.explainedBlockerRefs.map(rescueRefKey)) ?? []);
  for (const axis of judgment.axes) {
    if (axis.axis === "balance" && axis !== primary) {
      if (axis.effect === "assists") supports.push(balanceMeaning(axis));
      else if (axis.effect === "obstructs" || axis.effect === "mixed") pressures.push(balanceMeaning(axis));
    }
    if (axis.axis === "seasonal" && ["assists", "obstructs", "mixed"].includes(axis.effect)) {
      const specific = [...new Set([...axis.satisfiedConditions, ...axis.blockers.filter((_line, index) => !explainedBlockers.has(rescueRefKey({ axisId: axis.id, field: "blockers", index })))])];
      const opening = axis.effect === "assists" ? "原局用字配合另有支持" : axis.effect === "mixed" ? "原局用字配合同时保留支持与牵制" : "原局用字配合另有牵制";
      // A translated obstacle below already describes this contribution. Do
      // not add the raw summary again when every specific blocker is covered.
      if (specific.length || !axis.blockers.length) {
        const line = `${opening}：${specific.length ? specific.join("；") : axis.summary}`;
        (axis.effect === "assists" ? supports : pressures).push(line);
      }
    }
    for (const rescue of axis.rescues) rescues.set(rescue, [...(rescues.get(rescue) ?? []), axisLabels[axis.axis]]);
    // Select exact original condition text for display, not for deciding an
    // effect. Target-labelled conditions are most specific; other conditions
    // remain complete in the original scope and every axis is referenced below.
    if (axis === primary || axis.axis === "pattern" && primary.axis !== "pattern") {
      const meaningful = [...new Set(axis.unresolvedConditions.filter((line, index) => !line.startsWith("模型边界：") && !task?.conditions.includes(line)
        && !explainedConditions.has(rescueRefKey({ axisId: axis.id, field: "unresolvedConditions", index }))))];
      const targetSpecific = meaningful.filter(line => targetGanZhi !== null && line.startsWith(`流年${targetGanZhi}透`));
      const chosen = targetSpecific.length ? targetSpecific : meaningful.slice(0, 1);
      limitations.push(...chosen.map(line => `${axisLabels[axis.axis]}尚未落实之处：${line === "财食/承接的0.8、1.0、1.2替代分界不一致；主句沿1.0本地模型，轻重分歧保留为条件。"
        ? "对新增要求与可用支持的轻重判断仍有分歧，不能把局部改善当作条件已经充分成立。"
        : rescueProse && line === "救应已识别具体对象与根气，但强度、先后及是否完全奏效未由出现次数证明。"
          ? "已有可缓和的办法，但作用大小和先后尚未明确；被多处提到，也不表示效果更强。" : line}`));
    }
  }
  // Conflicts are already selected by the calculation, not a vote in this view.
  // Each contributing axis is explained above; do not repeat its full conflict
  // summary again. All conflicts are preserved verbatim in originals/conditions.
  const rescueText = rescueProse ? rescueProse.groups.map(group => group.text)
    : [...rescues].map(([line, axes]) => `${[...new Set(axes)].join("与")}的具体转机候选：${line}`);
  let rescuePurpose = "";
  if (rescueText.length) rescuePurpose = task?.task === "resource_first" && task.preferredPathId === pattern.pathId
    ? "转机要落在收住新增用途的占用、给仍必需的指导和准备留下位置。"
    : (task?.task === "wealth_first" && task.preferredPathId === pattern.pathId) || pattern.pathId === "resource-wealth"
      ? "转机要落在可调整的重复准备真正收拢，同时保留必要支持。"
      : "转机要接到本段实际受牵制的环节，已有办法或支持仍需落实到眼前事情。";
  const secondary = [...supports, ...pressures, ...limitations, ...(rescueText.length ? rescueProse ? rescueText : [rescuePurpose, ...rescueText,
    "这些是原判断列出的候选，相关限制仍在；出现救应不等于牵制已经解除。"] : [])];
  return { headline, main: overall, secondary: [...new Set(secondary)].join("\n"),
    secondaryKind: (pressures.length || limitations.length || rescueText.length ? "pressure" : "support") as "pressure" | "support",
    secondaryLabel: rescueText.length ? "相反条件与具体转机" : pressures.length ? "另一面的牵制" : limitations.length ? "尚未落实的具体环节" : "其他可用配合",
    basisRefs: axisRefs(judgment.axes) };
}

function natalTaskFor(input: BuildAnnualReaderAnswerInput): NatalWealthResourceTask | null {
  if (!input.revision && !input.assessment) return null;
  if (!input.revision || !input.assessment) return fail("本命修订与初判必须同时提供。");
  const revision = revisionRecordSchema.parse(input.revision), assessment = input.assessment;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  const binding = { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour };
  must(input.events.sourceBinding.caseId === revision.caseId
    && assessment.sourceBinding.revisionId === binding.revisionId && assessment.sourceBinding.chartResultHash === binding.chartResultHash
    && assessment.sourceBinding.includeHour === includeHour
    && same(assessment.balance.structural.sourceBinding, binding)
    && input.events.sourceBinding.revisionId === binding.revisionId && input.events.sourceBinding.chartResultHash === binding.chartResultHash
    && input.events.sourceBinding.includeHour === includeHour, "本命任务与原年度的来源不一致。");
  const facts = assessment.balance.structural.inputFacts;
  for (const position of ["year", "month", "day", ...(includeHour ? ["hour" as const] : [])] as const)
    must(same(facts.pillars[position], revision.facts.pillars[position]), "本命任务的所选柱与修订事实不一致。");
  const task = evaluateNatalWealthResourceTask({ facts, includeHour });
  must(input.story.sourceVersions.includes(task.version), "原年度未登记同版本的本命财印任务。");
  return task;
}

// Exact editorial replacements of current source sentences. The condition and
// subject remain intact; no occupation is inferred from notes or free text.
// A changed/unrecognised sentence stays verbatim and is still mapped below.
const PREPARATION_SCENES = new Map<string, string>([
  ["若在职，涉及岗位培训、前辈指导或需要补充的专业说明时，原配合存在具体牵连，眼前事项不能直接沿原安排继续。",
    "若在职，涉及岗位培训、前辈指导或需要补充的专业说明时，培训和补充说明占用了原定完成时间，手上的工作已有内容，却迟迟没有拿出来交付。"],
  ["若正在求职或进修，涉及目标资格、课程理解与申请材料的准备时，原配合存在具体牵连，眼前事项不能直接沿原安排继续。",
    "若正在求职或进修，涉及目标资格、课程理解与申请材料的准备时，课程和材料一轮轮增加，作品、申请或实际练习被往后推。"],
  ["若在职，涉及培训资料、工具和准备工时的实际用途时，原配合有实际牵连，可调整的投入和继续承担还需接上。",
    "若在职，涉及培训资料、工具和准备工时的实际用途时，时间和工具已经投入准备，实际使用却没有同步，原本能用于完成工作的条件继续被占用。"],
  ["若正在求职或进修，涉及课程、资格材料与练习时间的取舍时，原配合有实际牵连，可调整的投入和继续承担还需接上。",
    "若正在求职或进修，涉及课程、资格材料与练习时间的取舍时，课程、材料所需的时间或费用若持续增加，继续补充又可能挤到动手练习，已有准备还没有变成可展示的成果。"]
]);
function verifyAction(action: OutlookStemAction, axis: OutlookAxisFinding) {
  must(["visible", "main_hidden"].includes(action.visibility) && /^[甲乙丙丁戊己庚辛壬癸]$/u.test(action.stem)
    && ["正印", "偏印", "食神", "伤官", "正财", "偏财", "正官", "七杀", "比肩", "劫财"].includes(action.tenGod)
    && effects.has(action.effect) && typeof action.summaryBasis === "boolean", "结构化作用身份或方向无效。");
  for (const [indexes, lines] of [[action.evidenceIndexes, axis.evidence], [action.blockerIndexes, axis.blockers], [action.satisfiedConditionIndexes, axis.satisfiedConditions]] as const) {
    must(Array.isArray(indexes) && new Set(indexes).size === indexes.length && indexes.every(index => Number.isSafeInteger(index) && index >= 0 && index < lines.length), "结构化作用索引无效。");
  }
}
function validate(input: BuildAnnualReaderAnswerInput) {
  const { year, story, events, branchId, segmentId } = input;
  must(story.version === ANNUAL_LIFE_STORY_VERSION && events.version === ANNUAL_EVENT_READING_VERSION, "原阅读版本不匹配。");
  must(year.year === story.year && year.year === events.year && same(story.sourceBinding, events.sourceBinding)
    && year.yearGanZhi === story.yearGanZhi && year.yearGanZhi === events.yearGanZhi && same(year.transitNodeRef, story.yearNodeRef)
    && same(year.transitNodeRef, events.yearNodeRef) && year.startInstant === story.startInstant && year.startInstant === events.startInstant
    && year.endExclusiveInstant === story.endExclusiveInstant && year.endExclusiveInstant === events.endExclusiveInstant
    && same(story.contextRef, events.contextRef) && story.status === events.status, "年度身份、区间或背景引用不一致。");
  if (["before_birth", "unavailable"].includes(story.status) || !year.transitNodeRef) return null;
  const storyBranches = story.branches.filter(branch => branch.id === branchId), eventBranches = events.branches.filter(branch => branch.id === branchId);
  must(storyBranches.length === 1 && eventBranches.length === 1, "没有唯一的原分支。");
  const stories = storyBranches[0]!.segments.filter(segment => segment.id === segmentId), eventSegments = eventBranches[0]!.segments.filter(segment => segment.id === segmentId);
  const originals = year.judgmentSegments.filter(segment => segment.branchId === branchId && segment.id === segmentId);
  must(stories.length === 1 && eventSegments.length === 1 && originals.length === 1, "没有唯一的同分支原分段。");
  const section = stories[0]!, segment = eventSegments[0]!, original = originals[0]!, judgment = original.judgment;
  must(section.branchId === branchId && segment.branchId === branchId && section.startInstant === segment.startInstant && section.startInstant === original.startInstant
    && section.endExclusiveInstant === segment.endExclusiveInstant && section.endExclusiveInstant === original.endExclusiveInstant
    && same(judgment.interval, { startInstant: section.startInstant, endExclusiveInstant: section.endExclusiveInstant })
    && same(section.backgroundRefs, segment.backgroundRefs) && same(section.backgroundRefs, judgment.backgroundRefs)
    && same(section.backgroundLabels, segment.backgroundLabels) && same(judgment.targetRef, year.transitNodeRef)
    && section.personalStartInstant === segment.personalStartInstant && same(section.age, segment.age) && section.ageLabel === segment.ageLabel
    && section.judgmentVersion === judgment.version && segment.judgmentVersion === judgment.version
    && section.policyVersion === judgment.policyVersion && segment.policyVersion === judgment.policyVersion
    && section.caption === segment.judgmentCaption && section.caption === outlookDirectionCaption(judgment, null), "原段的年龄、节点或判断不一致。");
  must(judgment.sourceBinding.revisionId === events.sourceBinding.revisionId && judgment.sourceBinding.chartResultHash === events.sourceBinding.chartResultHash
    && judgment.sourceBinding.includeHour === events.sourceBinding.includeHour && year.transitNodeRef.revisionId === events.sourceBinding.revisionId
    && year.transitNodeRef.chartResultHash === events.sourceBinding.chartResultHash, "命盘来源不匹配。");
  for (const ref of section.backgroundRefs) must(year.dayunSegments.some(background => same(background.nodeRef, ref) && background.direction === branchId
    && Date.parse(background.startInstant) <= Date.parse(section.startInstant) && Date.parse(section.endExclusiveInstant) <= Date.parse(background.endExclusiveInstant)), "大运背景越过本段或借用了另一分支。");
  must(new Set(segment.items.map(item => item.id)).size === segment.items.length && new Set(judgment.axes.map(axis => axis.id)).size === judgment.axes.length, "原事项或判断轴重复。");
  must(events.sourceVersions.every(version => story.sourceVersions.includes(version)) && same(section.sourceVersions, story.sourceVersions), "原解释来源版本不一致。");
  for (const paragraph of section.paragraphs) {
    must(paragraph.eventItemIds.every(id => segment.items.some(item => item.id === id)) && paragraph.sourceSubjects.every(subject => section.sourceSubjects.includes(subject)), "原总评依赖的事项或主题缺失。");
  }
  for (const ref of [...section.basisRefs, ...section.paragraphs.flatMap(paragraph => paragraph.basisRefs)]) {
    const axis = judgment.axes.find(value => value.id === ref.axisId);
    must(!!axis && basisFields.has(ref.field), "原作用依据不存在。");
    if (!axis) return fail("原作用依据不存在。");
    must(ref.field === "summary" ? ref.index === undefined : Number.isSafeInteger(ref.index) && ref.index! >= 0 && ref.index! < axis[ref.field].length, "原作用依据索引无效。");
  }
  const pattern = judgment.axes.find(axis => axis.axis === "pattern");
  must(judgment.axes.length === 3 && new Set(judgment.axes.map(axis => axis.axis)).size === 3
    && judgment.axes.every(axis => ["balance", "pattern", "seasonal"].includes(axis.axis) && effects.has(axis.effect))
    && judgment.axes.some(axis => axis.axis === judgment.primaryAxis), "整体判断的三轴或主导轴不完整。");
  if (!pattern || pattern.stemActions?.version !== OUTLOOK_STEM_ACTIONS_VERSION) return fail("原分段缺少可用的结构化作用。");
  const actions = pattern.stemActions.items;
  must(actions.length === 2 && new Set(actions.map(action => action.visibility)).size === 2, "原分段透干与本气作用不完整。");
  actions.forEach(action => verifyAction(action, pattern));
  const visible = actions.find(action => action.visibility === "visible")!, hidden = actions.find(action => action.visibility === "main_hidden")!;
  must(visible.stem === year.yearGanZhi?.[0], "原透干不是本年对象。");
  if (year.ownJudgment) {
    const own = year.ownJudgment.axes.find(axis => axis.axis === "pattern")?.stemActions;
    must(!!own && own.items.every(action => actions.some(value => value.visibility === action.visibility && value.stem === action.stem && value.tenGod === action.tenGod)), "本年透藏对象与原年度不一致。");
  }
  return { section, segment, judgment, pattern, visible, hidden };
}

/** An editorial view of current validated source products. Invalid input throws
 * so the UI can fall back; unavailable/prebirth input returns null. No producer
 * or feedback text is replaced, and every transformed original remains here. */
export function buildAnnualReaderAnswer(input: BuildAnnualReaderAnswerInput): AnnualReaderAnswer | null {
  const natalTask = natalTaskFor(input);
  const bound = validate(input);
  if (!bound || bound.section.age.stage === "before_birth") return null;
  const { section, segment, judgment, pattern, visible, hidden } = bound;
  if (natalTask?.preferredPathId) must(natalTask.preferredPathId === pattern.pathId, "本命财印任务与原分段路径不一致。");
  const practical = segment.items.filter(item => item.domain === "career" || item.domain === "wealth");
  if (!practical.length) return null;
  const adult = section.age.stage === "adult" && section.age.segments.every(part => part.stage === "adult");
  const originalMain = section.paragraphs.find(paragraph => paragraph.kind === "mainline");
  if (!originalMain) return fail("原总评主线缺失。");
  const originalPractical = section.paragraphs.filter(paragraph => paragraph.kind !== "relationship");
  const rescueTrace = input.revision && input.assessment ? createOutlookRescueVerifier(input.revision, input.assessment)({ judgment,
    target: { nodeType: "year", ganZhi: input.year.yearGanZhi!, ref: input.year.transitNodeRef! },
    backgrounds: judgment.backgroundRefs.map(ref => {
      const matching = input.year.dayunSegments.filter(background => same(background.nodeRef, ref));
      must(matching.length === 1, "救应说明没有唯一的同段大运背景。");
      return { nodeType: "dayun" as const, ganZhi: matching[0]!.ganZhi, ref: matching[0]!.nodeRef };
    }) }) : null;
  const rescueProse = rescueTrace ? buildAnnualRescueLifeProse(rescueTrace) : null;
  const subjects = (items: readonly AnnualEventItem[]) => unique([`annual-${input.year.year}`, ...items.flatMap(item => [
    `annual-domain-${input.year.year}-${segment.id}-${item.origin.sourceDomainId}`, annualEventFeedbackSubjectId(input.year.year, segment, item), ...(item.origin.contextSubjectId ? [item.origin.contextSubjectId] : [])])]);
  const paragraphs: AnnualReaderAnswerParagraph[] = [];
  const add = (id: string, kind: AnnualReaderAnswerParagraph["kind"], text: string, items: readonly AnnualEventItem[], refs: AnnualLifeStoryBasisRef[], dependencySubjects = subjects(items)) => {
    if (text) paragraphs.push({ id, kind, text, sourceSubjects: [...dependencySubjects], basisRefs: structuredClone(refs), eventItemIds: items.map(item => item.id) });
  };
  let headline = section.headline, rewritten = false, main = originalMain.text;
  let rewrittenKind: "study" | "proposal" | "settlement" | null = null;
  let patternProse: AnnualPatternReaderProse | null = null;
  const kindOf = (item: AnnualEventItem) => item.origin.ruleId.split("/").at(-1);
  const onlyKind = (kind: string) => practical.every(item => kindOf(item) === kind);
  const explained = new Set<string>();
  const eventMappings: AnnualReaderAnswer["eventMappings"] = [];
  const linked = input.revision && input.assessment ? buildNatalTransitTaskProse({ links: pattern.taskLinks, effect: pattern.effect,
    actions: pattern.stemActions!.items, kind: practical[0] ? kindOf(practical[0]) : undefined, ageStage: section.age.stage, horizon: "year" }) : null;
  if (linked) {
    headline = linked.title; main = linked.summary; rewritten = true;
    explained.add("visible"); explained.add("main_hidden");
  }
  // These are effect-sensitive readings of one already selected path. Other
  // tasks retain their producer's exact mechanism instead of guessing a target.
  if (!rewritten && !pattern.taskLinks?.items.length && adult && pattern.pathId === "resource-output") {
    if (visible.tenGod === "正印" && visible.effect === "obstructs" && onlyKind("study")) {
      headline = "准备一轮轮增加，能拿出来的东西反而被推后";
      main = "这一段的主要阻力在准备与完成相互挤压：已有内容可以继续做，说明、资料和修改却不断加上来，原本能拿出来使用的部分容易往后挪。";
      if (hidden.tenGod === "偏印" && hidden.effect === "obstructs") { main += "方法转换又会打断原进度：旧的一步先停下，新办法还没有接稳。"; explained.add("main_hidden"); }
      main += "准备已投入时间和用品，实际成果仍需跟上。";
      explained.add("visible"); rewritten = true; rewrittenKind = "study";
    } else if (visible.tenGod === "伤官" && visible.effect === "assists" && onlyKind("proposal")) {
      headline = "改法进入试用，实际差别比继续解释更有分量";
      main = "已有经验较能支持一次小范围尝试。把样例或改法实际用过以后，哪里比原办法方便、哪里仍不合用，会得到更具体的回应；这一段可发挥的是把解法做给人看，而不只继续说明想法。";
      explained.add("visible"); rewritten = true; rewrittenKind = "proposal";
    } else if (visible.tenGod === "正财" && visible.effect === "assists" && onlyKind("settlement")) {
      headline = "旧成果进入确认，新用途与后续承担分别说清";
      main = "已经做过的部分较有条件获得原约定的回应，重点从继续准备转向确认哪些已经完成、哪些责任可以结束。完成记录、已发生投入与原约定更有条件对应，但继续使用和追加承担仍是下一步的事。";
      explained.add("visible"); rewritten = true; rewrittenKind = "settlement";
      if (hidden.tenGod === "偏财" && hidden.effect === "assists") {
        main += "另一项支持在于已有成果能接到不同用途或新的参与：新的试用范围与原来约定的兑现，需要分开说明。";
        explained.add("main_hidden");
      }
    }
  }
  // Optional same-source natal input enables the new path-specific view. Old
  // callers keep their existing pattern text and mapping choices; special tasks are never
  // inferred from a similarly named path or from free-form explanations.
  if (!rewritten && !pattern.taskLinks?.items.length && adult && natalTask && practical.every(item => kindOf(item) === kindOf(practical[0]!))) {
    patternProse = buildAnnualPatternReaderProse({ path: pattern.pathId, task: natalTask, kind: kindOf(practical[0]!)!, visible, hidden });
    if (patternProse) {
      headline = patternProse.headline; main = patternProse.main; rewritten = true;
      patternProse.explainedActors.forEach(visibility => explained.add(visibility));
    }
  }
  const whole = composeWholeJudgment(judgment, main, headline, natalTask, input.year.yearGanZhi, rescueProse);
  const plainDomains = new Map(practical.map(item => [item.domain, input.revision && input.assessment ? buildPlainOutlookDomainReading({ judgment, domain: item.domain as "career" | "wealth",
    original: { headline: item.title, summary: item.summary, paragraphs: [], examples: item.examples, conditions: item.conditions, evidence: item.evidence },
    age: section.age, horizon: "year", kind: kindOf(item), task: natalTask, ...(input.events.contextRef ? { appliedWork: "unspecified" as const } : {}) }) : null]));
  const plainCareer = plainDomains.get("career");
  if (plainCareer) {
    if (input.events.contextRef) plainCareer.headline = plainCareer.headline.replace(/^事业与做事：/u, "做事与配合：");
    whole.headline = plainCareer.headline;
    whole.main = `${plainOutlookCaption(judgment)}。${plainCareer.headline}。`;
    // The full conditions stay in originals and the scoped condition panel.
    // Keep other calculated axes and real rescue explanations, not a second
    // rendering of the same target role's pressure.
    const other = judgment.axes.filter(axis => axis.axis !== "pattern" && ["assists", "obstructs", "mixed"].includes(axis.effect));
    whole.secondary = [...other.filter(axis => axis.axis === "balance").map(balanceMeaning),
      ...(rescueProse?.groups.map(group => group.text) ?? []),
      ...other.filter(axis => axis.axis === "seasonal" && !rescueProse?.groups.some(group => group.basisRefs.some(ref => ref.axisId === axis.id))).map(axis => axis.summary)].join("\n");
    whole.secondaryLabel = rescueProse?.groups.length ? "可以缓解的地方" : "还要留意的地方";
    rewritten = true;
    explained.add("visible"); explained.add("main_hidden");
  }
  headline = whole.headline;
  if (rewritten) {
    add("reader-mainline", "mainline", whole.main, practical, whole.basisRefs, originalMain.sourceSubjects);
    paragraphs[paragraphs.length - 1]!.label = "综合判断与今年重点";
    for (const paragraph of originalPractical.filter(value => value.kind === "support" || value.kind === "pressure")) {
      const directional = pattern.stemActions!.items.filter(action => paragraph.kind === "support" ? ["assists", "mixed"].includes(action.effect) : ["obstructs", "mixed"].includes(action.effect));
      if (directional.some(action => !explained.has(action.visibility))) {
        const retained = structuredClone(paragraph);
        if (patternProse && retained.kind === "pressure") for (const line of patternProse.replacedPressureLines) retained.text = retained.text.split(line).join("");
        if (retained.text) paragraphs.push(retained);
      }
    }
    if (whole.secondary) {
      add("reader-whole-contributions", whole.secondaryKind, whole.secondary, practical, whole.basisRefs);
      paragraphs[paragraphs.length - 1]!.label = whole.secondaryLabel;
      if (plainCareer) paragraphs[paragraphs.length - 1]!.detailsOnly = true;
    }
  } else {
    // Preserve all original age-specific statements. The first paragraph now
    // starts with the actual overall conclusion even when no scene is rewritten.
    paragraphs.push(...structuredClone(originalPractical).map(paragraph => paragraph.kind === "mainline"
      ? { ...paragraph, text: whole.main, label: "综合判断与今年重点", basisRefs: whole.basisRefs } : paragraph));
  }
  const sceneLocations = new Map<string, string>();
  if (rewritten) for (const domain of unique(practical.map(item => item.domain))) {
    const items = practical.filter(item => item.domain === domain), paragraphId = `reader-scene-${domain}`;
    const examples = items.flatMap(item => item.examples.map((original, index) => {
      // These descriptors identify the source's conditional setting, never the
      // person's actual occupation. Confirmed contexts keep their own source.
      const plain = plainDomains.get(domain);
      const useConditionalScenes = !linked && adult && natalTask !== null && input.events.contextRef === null;
      const distinct = useConditionalScenes ? buildAnnualDistinctSceneProse({ original, kind: kindOf(item) as AnnualDistinctSceneProseInput["kind"],
        domain: domain as "career" | "wealth", path: pattern.pathId, task: natalTask!, visible, hidden, age: section.age }) : null;
      const text = plain && plain.originals.examples[index] === original && plain.examples[index] !== original ? plain.examples[index]! : input.events.contextRef ? original : useConditionalScenes ? distinct?.text ?? original
        : patternProse ? rewriteAnnualPatternScene(original, domain as "career" | "wealth", patternProse, visible)
          : rewrittenKind === "study" ? PREPARATION_SCENES.get(original) ?? original : original;
      // Share only when both the complete source and its displayed explanation
      // agree. A domain-specific rewrite of a shared source still needs its own
      // location; two different originals never merge because their text matches.
      const sceneKey = JSON.stringify([original, text]);
      const location = sceneLocations.get(sceneKey) ?? paragraphId;
      sceneLocations.set(sceneKey, location);
      return { eventId: item.id, index, original, text, paragraphId: location,
        ...(distinct ? { sceneSource: { version: distinct.version, templateIds: [...distinct.templateIds], setting: distinct.setting, sourceMechanisms: [...distinct.sourceMechanisms] } } : {}) };
    }));
    // The mainline carries the original direction. Each domain then gives its
    // own observable process, with every source scene retained or explicitly
    // translated. This replaces the old summary-plus-examples repetition.
    const leads = {
      study: { career: "做事上的卡点是准备越来越细，能展示或实际完成的部分却被挤到后面。", wealth: "投入上的卡点是准备一直占用时间与用品，使用和后续安排没有同步。" },
      proposal: { career: "这份助力落在把解法试给人看，反馈能指出改动的具体价值。", wealth: "试用同时显出材料、花费和共同时间的实际用途，试做与正式采用的投入范围仍要分开。" },
      settlement: { career: "事情做过以后，原约定中的认可、补充说明和下一次承担较有条件分开落实。", wealth: "已发生投入较有条件得到确认，继续使用、补办和新增用途的花费另有各自的承担。" }
    } as const;
    const plain = plainDomains.get(domain);
    const lead = plain ? plain.summary : linked ? items.map(item => item.summary).join("\n") : patternProse ? domain === "career" ? patternProse.careerLead : patternProse.wealthLead
      : leads[rewrittenKind!][domain as "career" | "wealth"];
    add(paragraphId, "scene", [lead, ...unique(examples.filter(example => example.paragraphId === paragraphId).map(example => example.text))].join("\n"), items, originalMain.basisRefs);
    paragraphs[paragraphs.length - 1]!.label = plain ? plain.headline.split("：")[0]! : domain === "career" ? "事业与做事" : "财务与回报";
    for (const item of items) eventMappings.push({ eventId: item.id,
      summary: { original: item.summary, paragraphIds: ["reader-mainline", paragraphId] },
      examples: examples.filter(example => example.eventId === item.id).map(({ eventId: _eventId, ...example }) => example) });
  }
  for (const mapping of eventMappings) for (const example of mapping.examples) {
    const paragraph = paragraphs.find(p => p.id === example.paragraphId)!;
    const item = practical.find(value => value.id === mapping.eventId)!;
    paragraph.eventItemIds = unique([...paragraph.eventItemIds, item.id]);
    paragraph.sourceSubjects = unique([...paragraph.sourceSubjects, ...subjects([item])]);
  }
  if (plainCareer && adult && !input.events.contextRef) {
    const byText = new Map<string, typeof eventMappings[number]["examples"]>();
    for (const mapping of eventMappings) for (const example of mapping.examples) {
      const key = JSON.stringify([example.original, example.text]);
      byText.set(key, [...(byText.get(key) ?? []), example]);
    }
    const extra = [...byText.values()].filter(examples => examples.every(example => example.index > 0));
    if (extra.length) {
      const id = "reader-additional-scenes", items = practical.filter(item => eventMappings.find(mapping => mapping.eventId === item.id)?.examples.some(example => extra.some(group => group.includes(example))));
      const texts = unique(extra.map(group => group[0]!.text));
      for (const paragraph of paragraphs.filter(p => p.kind === "scene")) paragraph.text = paragraph.text.split("\n").filter(line => !texts.includes(line)).join("\n");
      add(id, "scene", texts.join("\n"), items, originalMain.basisRefs);
      paragraphs[paragraphs.length - 1]!.label = "其他原有情境";
      paragraphs[paragraphs.length - 1]!.detailsOnly = true;
      extra.flat().forEach(example => { example.paragraphId = id; });
    }
  }
  const coveredEventIds = eventMappings.filter(mapping => {
    const item = practical.find(value => value.id === mapping.eventId)!;
    return mapping.summary.original === item.summary && mapping.summary.paragraphIds.every(id => paragraphs.some(p => p.id === id && p.eventItemIds.includes(item.id)))
      && mapping.examples.length === item.examples.length && mapping.examples.every((example, index) => example.index === index && example.original === item.examples[index]
        && paragraphs.some(p => p.id === example.paragraphId && p.eventItemIds.includes(item.id) && p.text.split("\n").includes(example.text)));
  }).map(mapping => mapping.eventId);
  if (plainCareer) {
    const item = segment.items.find(value => value.domain === "relationship" && value.relationshipTiming);
    if (item && adult) {
      const relation = buildPlainOutlookDomainReading({ judgment, domain: "relationship", horizon: "year", age: section.age, relationshipTiming: item.relationshipTiming,
        original: { headline: item.title, summary: item.summary, paragraphs: [], examples: item.examples, conditions: item.conditions, evidence: item.evidence } });
      if (relation) {
        add("reader-relationship", "relationship", relation.summary, [item], section.paragraphs.filter(p => p.kind === "relationship").flatMap(p => p.basisRefs));
        paragraphs[paragraphs.length - 1]!.label = "感情";
      }
    } else if (!item) {
      add("reader-relationship", "relationship", adult ? "现有判断还不足以断定这段时间有明确的感情变化。" : "现有判断还不足以断定这段时间有明确的相处变化。", [], []);
      paragraphs[paragraphs.length - 1]!.label = adult ? "感情" : "相处";
    }
  }
  const sourceSubjects = unique(paragraphs.flatMap(paragraph => paragraph.sourceSubjects));
  must(sourceSubjects.every(subject => section.sourceSubjects.includes(subject)), "新正文超出了原总评依赖范围。");
  const originals: AnnualReaderAnswer["originals"] = {
    wholeJudgment: structuredClone({ label: judgment.label, primaryAxis: judgment.primaryAxis, headline: judgment.headline, summary: judgment.summary,
      axes: judgment.axes, conflicts: judgment.conflicts, conditions: judgment.conditions, coverageGaps: judgment.coverageGaps }),
    storyHeadline: section.headline, storySummary: input.story.summary,
    storyParagraphs: structuredClone(section.paragraphs),
    eventTexts: segment.items.map(({ id, domain, title, summary, examples, why, applicability, notApplicableWhen, conditions, evidence }) => structuredClone({ id, domain, title, summary, examples, why, applicability, notApplicableWhen, conditions, evidence })),
    ...(natalTask ? { natalTask: structuredClone(natalTask) } : {}),
    ...(rescueTrace ? { rescueTrace: structuredClone(rescueTrace) } : {}),
    actorBasis: pattern.stemActions!.items.map(action => ({ axisId: pattern.id, action: structuredClone(action), summary: action.summaryBasis ? pattern.summary : null,
      evidence: action.evidenceIndexes.map(index => pattern.evidence[index]!), blockers: action.blockerIndexes.map(index => pattern.blockers[index]!), satisfiedConditions: action.satisfiedConditionIndexes.map(index => pattern.satisfiedConditions[index]!) }))
  };
  return { version: ANNUAL_READER_ANSWER_VERSION, sourceBinding: structuredClone(input.events.sourceBinding),
    sourceVersions: unique([ANNUAL_READER_ANSWER_VERSION, PLAIN_OUTLOOK_READING_VERSION, ...section.sourceVersions, ...(linked ? [OUTLOOK_TASK_LINK_PROSE_VERSION] : []), ...(rescueTrace && rescueProse ? [rescueTrace.version, rescueProse.version] : []),
      ...eventMappings.flatMap(mapping => mapping.examples.flatMap(example => example.sceneSource ? [example.sceneSource.version] : []))]),
    scope: { year: input.year.year, branchId: input.branchId, segmentId: input.segmentId, startInstant: section.startInstant,
      endExclusiveInstant: section.endExclusiveInstant, personalStartInstant: section.personalStartInstant, yearNodeRef: structuredClone(input.year.transitNodeRef!), backgroundRefs: structuredClone(section.backgroundRefs) },
    headline, caption: plainOutlookCaption(judgment), paragraphs, sourceSubjects, coveredEventIds, eventMappings,
    rescueMappings: rewritten && rescueProse ? rescueProse.groups.map(group => ({ groupId: group.id, traceIds: [...group.traceIds],
      paragraphId: "reader-whole-contributions", text: group.text, rescueRefs: structuredClone(group.rescueRefs), basisRefs: structuredClone(group.basisRefs) })) : [],
    conditions: unique([...section.conditions, ...practical.flatMap(item => [...item.conditions, ...item.applicability, ...item.notApplicableWhen])]), originals };
}
