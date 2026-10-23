import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { buildNatalTransitTaskProse } from ".././outlook-task-link-prose";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualOutlook, type LocalAnnualYear } from ".././local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, type LocalAnnualDomainReading, type AnnualDomainBranchId, type AnnualDomainGap } from ".././local-annual-domain-reading";
import { buildAnnualEventReading, type LocalAnnualEventReading, type AnnualEventSegment, type AnnualEventItem } from "./local-annual-event-reading";
import type { LocalReadingAnnualDomains } from ".././local-annual-domain-record";
import { annualEventFeedbackSubjectId, READING_ANNUAL_EVENTS_VERSION, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import { composeAnnualEvents, annualEventCompositionSubjectId, ANNUAL_EVENT_COMPOSITION_VERSION } from ".././local-annual-event-composition";
import type { LocalContextualReadingBundle } from ".././local-contextual-reading-record";
import type { LocalOutlookJudgment, OutlookAxis, OutlookStemAction } from ".././local-outlook-judgment";
import { LIFE_STAGE_YEARS_VERSION } from "./local-life-stage-years";
import { outlookDirectionCaption } from ".././outlook-judgment-presentation";
import { evaluateNatalWealthResourceTask, NATAL_WEALTH_RESOURCE_TASK_VERSION, type NatalWealthResourceTask } from "../../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { annualLifeActionTheme, buildAnnualLifeMainline, annualLifeCoordination } from ".././annual-life-mainline";

export const ANNUAL_LIFE_STORY_VERSION = "hakimi.annual-life-story/0.5.0" as const;
export interface AnnualLifeStoryBasisRef {
  axisId: string; field: "summary" | "evidence" | "blockers" | "rescues" | "unresolvedConditions" | "satisfiedConditions"; index?: number;
}
export interface AnnualLifeStoryParagraph {
  id: string; kind: "mainline" | "support" | "pressure" | "coordination" | "relationship";
  text: string; sourceSubjects: string[]; basisRefs: AnnualLifeStoryBasisRef[]; eventItemIds: string[];
}
export interface AnnualLifeStorySegment {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string; personalStartInstant: string;
  backgroundRefs: TransitNodeRef[]; backgroundLabels: string[];
  judgmentVersion: string; policyVersion: string; caption: string;
  age: AnnualEventSegment["age"]; ageLabel: string;
  headline: string; paragraphs: AnnualLifeStoryParagraph[]; conditions: string[];
  sourceVersions: string[]; sourceSubjects: string[]; basisRefs: AnnualLifeStoryBasisRef[];
}
export interface AnnualLifeStory {
  version: string; sourceBinding: LocalAnnualEventReading["sourceBinding"]; sourceVersions: string[];
  year: number; yearGanZhi: string | null; yearNodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null; status: LocalAnnualEventReading["status"];
  contextRef: LocalAnnualEventReading["contextRef"];
  headline: string; summary: string;
  branches: { id: AnnualDomainBranchId; label: string; segments: AnnualLifeStorySegment[]; gaps: AnnualDomainGap[]; conditions: string[] }[];
  limitations: string[];
}
export interface BuildAnnualLifeStoryInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear;
  domains: LocalAnnualDomainReading; events: LocalAnnualEventReading; contextual?: LocalContextualReadingBundle | null;
}
export interface LocalReadingAnnualLifeStories {
  version: string; sourceBinding: AnnualLifeStory["sourceBinding"]; sourceVersions: string[];
  startYear: number; endYear: number; years: AnnualLifeStory[];
}
export interface BuildReadingAnnualLifeStoriesInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; annual: LocalAnnualOutlook;
  annualDomains: LocalReadingAnnualDomains; annualEvents: LocalReadingAnnualEvents; contextual?: LocalContextualReadingBundle | null;
}

const unique = <T>(items: readonly T[]) => [...new Set(items)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (message: string): never => { throw new Error(`年度生活总评：${message}`); };
const axisNames: Record<OutlookAxis, string> = { balance: "承接", pattern: "结构配合", seasonal: "调候" };
const kindOf = (item: AnnualEventItem) => item.origin.ruleId.split("/").at(-1)!;
const supportedKinds = new Set(["work_change", "study", "proposal", "delivery", "settlement", "new_collaboration", "shared_arrangements"]);
function basisFor(judgment: LocalOutlookJudgment, axes = judgment.axes): AnnualLifeStoryBasisRef[] {
  return axes.flatMap((axis) => [{ axisId: axis.id, field: "summary" as const },
    ...(["evidence", "blockers", "rescues", "unresolvedConditions", "satisfiedConditions"] as const).flatMap((field) =>
      axis[field].map((_line, index) => ({ axisId: axis.id, field, index }))) ]);
}
function subjectsFor(year: number, segment: AnnualEventSegment, items: readonly AnnualEventItem[]): string[] {
  return unique([`annual-${year}`, ...items.flatMap((item) => [
    `annual-domain-${year}-${segment.id}-${item.origin.sourceDomainId}`, annualEventFeedbackSubjectId(year, segment, item),
    ...(item.origin.contextSubjectId ? [item.origin.contextSubjectId] : []) ])]);
}

function makeSegment(input: BuildAnnualLifeStoryInput, eventSegment: AnnualEventSegment, judgment: LocalOutlookJudgment,
  composition: ReturnType<typeof composeAnnualEvents>["branches"][number]["segments"][number], sourceVersions: string[], task: NatalWealthResourceTask): AnnualLifeStorySegment {
  const pattern = judgment.axes.find((axis) => axis.axis === "pattern") ?? fail("原分段缺少格局轴。");
  const actions = pattern.stemActions?.items ?? fail("原分段缺少结构化作用。");
  const visible = actions.find((action) => action.visibility === "visible") ?? fail("原分段缺少透干作用。");
  const hidden = actions.find((action) => action.visibility === "main_hidden") ?? fail("原分段缺少支本气作用。");
  const practical = eventSegment.items.filter((item) => item.domain === "career" || item.domain === "wealth"), relationships = eventSegment.items.filter((item) => item.domain === "relationship");
  for (const item of eventSegment.items) if (!supportedKinds.has(kindOf(item))) fail("原事项类别不能识别。");
  const kind = practical[0] ? kindOf(practical[0]) : "work_change";
  const primary = practical.find((item) => item.domain === "career" && item.priority === "primary")
    ?? practical.find((item) => item.priority === "primary") ?? practical[0];
  const scope = { path: pattern.pathId, task };
  const actionTheme = (action: OutlookStemAction) => annualLifeActionTheme(action, scope);
  const work = primary?.origin.contextSubjectId ? input.contextual?.contextSource.document.context.work ?? null : null;
  const baseTheme = buildAnnualLifeMainline({ ...scope, kind: primary ? kindOf(primary) : kind, visible, hidden,
    age: eventSegment.age, label: judgment.label, work });
  const linked = buildNatalTransitTaskProse({ links: pattern.taskLinks, effect: pattern.effect, actions, kind: primary ? kindOf(primary) : kind, ageStage: eventSegment.age.stage, horizon: "year" });
  const theme = linked ? { ...baseTheme, headline: linked.title, text: linked.summary, explainedActors: ["visible", "main_hidden"] } : baseTheme;
  const paragraphs: AnnualLifeStoryParagraph[] = [];
  const add = (id: string, kind: AnnualLifeStoryParagraph["kind"], text: string, items: readonly AnnualEventItem[], refs: AnnualLifeStoryBasisRef[], extraSubjects: string[] = []) => {
    if (text) paragraphs.push({ id, kind, text, sourceSubjects: unique([...subjectsFor(input.year.year, eventSegment, items), ...extraSubjects]), basisRefs: refs,
      eventItemIds: items.map((item) => item.id) });
  };
  const patternRefs = basisFor(judgment, [pattern]);
  const mainlineRefs: AnnualLifeStoryBasisRef[] = [...patternRefs, ...judgment.axes.filter(axis => axis.axis !== "pattern").flatMap(axis => [
    { axisId: axis.id, field: "summary" as const }, ...axis.unresolvedConditions.map((_text, index) => ({ axisId: axis.id, field: "unresolvedConditions" as const, index }))])];
  add("mainline", "mainline", theme.text, practical, mainlineRefs);
  const positive = actions.filter((action) => !theme.explainedActors.includes(action.visibility) && (action.effect === "assists" || action.effect === "mixed"));
  const negative = actions.filter((action) => !theme.explainedActors.includes(action.visibility) && (action.effect === "obstructs" || action.effect === "mixed"));
  const neutralVisible = visible.effect === "neutral" || visible.effect === "unresolved";
  if (positive.length) {
    const lead = neutralVisible ? `本年${visible.stem}${visible.tenGod}带出的是${actionTheme(visible).topic}，这项本身没有单独定顺。真正可用的配合在于：` : "这一年可发挥的部分是：";
    const helpGroups = new Map<string,string[]>();
    for (const action of positive) {
      const help = actionTheme(action).help, names = helpGroups.get(help) ?? [];
      names.push(action.visibility === "visible" ? `透出的${action.stem}${action.tenGod}` : `年支内的${action.stem}${action.tenGod}`);helpGroups.set(help,names);
    }
    const parts = [...helpGroups].map(([help,names]) => `${names.join("与")}对应${help}`);
    const support = neutralVisible && positive.length === 1 && positive[0] === hidden
      ? `主线中的可用配合来自年支内的${hidden.stem}${hidden.tenGod}，具体落在${actionTheme(hidden).topic}。透出的${visible.stem}${visible.tenGod}仍对应${actionTheme(visible).topic}，这项本身没有单独定顺。`
      : `${lead}${parts.join("；")}。`;
    add("support", "support", support, practical, patternRefs);
  }
  const otherPressure = judgment.axes.filter((axis) => axis.axis !== "pattern" && (axis.effect === "mixed" || axis.effect === "obstructs"));
  const pressureParts = negative.map((action) => `${action.visibility === "visible" ? `本年${action.stem}${action.tenGod}直接进入的这项` : `年支内${action.stem}${action.tenGod}的配合`}仍有牵制：${actionTheme(action).pressure}。`);
  if (!linked && !actions.some(action => action.effect === "obstructs" || action.effect === "mixed") && (pattern.effect === "mixed" || pattern.effect === "obstructs")) pressureParts.push("上述具体事项在整体配合上仍有牵制，可用之处与原来的承担范围未必同步。" );
  // A conflicting axis is not a vote. Keep its original summary and actual
  // blocker/rescue references, rather than erasing it behind the primary axis.
  for (const axis of otherPressure) pressureParts.push(`${axisNames[axis.axis]}还有另一面：${axis.summary}${axis.blockers.length ? `具体牵动是：${unique(axis.blockers).join("；")}` : ""}`);
  const rescueAxes = judgment.axes.filter((axis) => axis.rescues.length);
  if (rescueAxes.length) pressureParts.push("原判断还保留可转圜的配合：已有办法或明确用途真正接到当前事情，才可能减少反复；这些支持尚不能当成阻碍已经解除。" );
  if (pressureParts.length) add("pressure", "pressure", pressureParts.join(""), practical,
    basisFor(judgment, unique([pattern, ...otherPressure, ...rescueAxes])));
  const pair = composition.items.find((item) => item.kind === "settlement");
  const career = practical.find((item) => item.domain === "career"), wealth = practical.find((item) => item.domain === "wealth");
  if (career && wealth) {
    let text = pair ? "已做事情的确认，与已约定的费用、物品或后续安排，是同一件事的两侧。得到回应以后还涉及谁继续承担、哪些可以结束；完成与实际兑现分别保留。"
      : kind === "proposal" ? "行动一侧是把改法实际做一次，投入一侧是用品、试做花费和共同腾出的时间怎样变化。两者一起看，才能说明这次尝试具体改变了什么。"
        : kind === "study" ? "学习一侧是理解和试用，投入一侧是资料、用品与准备时间。准备真正进入实际完成时，两边才接在同一件事上；停留在补充材料阶段的部分仍占用动手时间。"
          : kind === "delivery" ? "持续完成依靠熟悉步骤和实际回应，重复使用则需要时间、材料与照应。做成一次与持续维持不同，后续使用和维护也是这段安排的一部分。"
            : kind === "new_collaboration" ? "参与一侧看彼此能否一起做，投入一侧看各自愿意拿出多少时间、物品和协助。一次尝试后的反馈，会让下一次是否继续更清楚。"
              : "自己的负责范围与共同使用的条件相互影响。实际分工与时间、用品、费用的承担，是同一段生活安排的两个侧面。";
    text = annualLifeCoordination(scope) ?? text;
    add("coordination", "coordination", text, [career, wealth], patternRefs, pair ? [annualEventCompositionSubjectId(input.year.year, eventSegment, pair)] : []);
  }
  for (const item of relationships) {
    // The relationship summary is already age-, lens- and same-segment-aware.
    // Retain both unknown-sex lenses and do not feed it a career-axis effect.
    add(`relationship-${item.id}`, "relationship", item.summary, [item], []);
  }
  const conditions = unique([...eventSegment.conditions, ...judgment.conditions, ...judgment.conflicts, ...judgment.coverageGaps,
    ...judgment.axes.flatMap((axis) => axis.unresolvedConditions), ...eventSegment.age.conditions,
    "总体方向沿原分段判断；领域只是具体生活落点，不按领域多少投票，也不将事业配合解释为关系顺利。",
    ...(pattern.pathId === "resource-wealth" ? ["本路径的财作用是调节已有积累，不直接套成回款、发财或财生官。"] : [])]);
  return { id: eventSegment.id, branchId: eventSegment.branchId, startInstant: eventSegment.startInstant, endExclusiveInstant: eventSegment.endExclusiveInstant,
    personalStartInstant: eventSegment.personalStartInstant, backgroundRefs: structuredClone(eventSegment.backgroundRefs), backgroundLabels: [...eventSegment.backgroundLabels],
    judgmentVersion: eventSegment.judgmentVersion, policyVersion: eventSegment.policyVersion, caption: eventSegment.judgmentCaption,
    age: structuredClone(eventSegment.age), ageLabel: eventSegment.ageLabel, headline: theme.headline, paragraphs, conditions,
    sourceVersions: [...sourceVersions], sourceSubjects: unique(paragraphs.flatMap((paragraph) => paragraph.sourceSubjects)), basisRefs: basisFor(judgment) };
}

export function buildAnnualLifeStory(input: BuildAnnualLifeStoryInput): AnnualLifeStory {
  const events = buildAnnualEventReading({ revision: input.revision, assessment: input.assessment, year: input.year, domains: input.domains,
    ...(input.contextual === undefined ? {} : { contextual: input.contextual }) });
  if (!same(events, input.events)) fail("原年度事项、背景或来源与同修订重建结果不一致。");
  const composition = composeAnnualEvents(events);
  const task = evaluateNatalWealthResourceTask({ facts: input.assessment.balance.structural.inputFacts, includeHour: input.assessment.sourceBinding.includeHour });
  const sourceVersions = unique([ANNUAL_LIFE_STORY_VERSION, LIFE_STAGE_YEARS_VERSION, NATAL_WEALTH_RESOURCE_TASK_VERSION, ANNUAL_EVENT_COMPOSITION_VERSION,
    events.version, ...events.sourceVersions, input.domains.version, ...input.domains.sourceVersions]);
  const branches = events.branches.map((branch) => ({ id: branch.id, label: branch.label, gaps: structuredClone(branch.gaps), conditions: [...branch.conditions],
    segments: branch.segments.map((segment) => {
      const originals = input.year.judgmentSegments.filter((item) => item.id === segment.id && item.branchId === branch.id);
      if (originals.length !== 1) fail("找不到唯一的同分支原年度分段。");
      const original = originals[0]!, judgment = original.judgment;
      if (segment.startInstant !== original.startInstant || segment.endExclusiveInstant !== original.endExclusiveInstant
        || !same(segment.backgroundRefs, judgment.backgroundRefs) || !same(judgment.targetRef, input.year.transitNodeRef)
        || segment.judgmentCaption !== outlookDirectionCaption(judgment, null)) fail("原年度分段的节点、区间或判断不一致。");
      const groups = composition.branches.find((item) => item.id === branch.id)?.segments.filter((item) => item.id === segment.id);
      if (groups?.length !== 1) fail("整件事项没有唯一的同段来源。");
      return makeSegment(input, segment, judgment, groups![0]!, sourceVersions, task);
    }) }));
  const only = branches.length === 1 && branches[0]!.segments.length === 1 ? branches[0]!.segments[0]! : null;
  return { version: ANNUAL_LIFE_STORY_VERSION, sourceBinding: structuredClone(events.sourceBinding), sourceVersions, year: events.year,
    yearGanZhi: events.yearGanZhi, yearNodeRef: structuredClone(events.yearNodeRef), startInstant: events.startInstant, endExclusiveInstant: events.endExclusiveInstant,
    status: events.status, contextRef: structuredClone(events.contextRef),
    headline: only ? `${events.year}年 · ${only.headline}` : `${events.year}年 · 按实际背景分别看这一年的主线`,
    summary: only ? `${only.caption}。${only.paragraphs.find((paragraph) => paragraph.kind === "mainline")!.text}`
      : events.status === "before_birth" ? "本年早于出生，不作个人经历解读。"
        : branches.length > 1 ? "顺行与逆行是并列的背景条件，各自的支持、牵制和生活落点分别保留。"
          : branches.some((branch) => branch.segments.length > 1) ? "本年交运前后的具体配合分段说明；换运本身不等于转好或转坏。" : "当前没有可用的个人年度分段。",
    branches, limitations: ["这是原年度判断与原事项的生活总评，不增加吉凶规则、事件概率、现实职业或婚姻事实。",
      "原透干与支内作用分开，调候、承接与格局差别保留；有条件的支持不改成全面顺利。",
      "各分支、交运段和年龄段沿原边界；关系只沿原同段星宫事项，不从其他领域推导。"] };
}

export function buildReadingAnnualLifeStories(input: BuildReadingAnnualLifeStoriesInput): LocalReadingAnnualLifeStories {
  const { revision, assessment, annual, annualDomains, annualEvents } = input;
  const binding = { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour };
  if (annual.version !== LOCAL_ANNUAL_OUTLOOK_VERSION || annualDomains.version !== ANNUAL_DOMAIN_READING_VERSION || annualEvents.version !== READING_ANNUAL_EVENTS_VERSION
    || annual.revisionId !== binding.revisionId || annual.chartResultHash !== binding.chartResultHash
    || annualDomains.revisionId !== binding.revisionId || annualDomains.chartResultHash !== binding.chartResultHash || annualDomains.includeHour !== binding.includeHour
    || !same(annualEvents.sourceBinding, binding) || annualDomains.startYear !== annual.startYear || annualDomains.endYear !== annual.endYear
    || annualEvents.startYear !== annual.startYear || annualEvents.endYear !== annual.endYear
    || annual.years.length !== annual.endYear - annual.startYear + 1 || annual.years.some((year, index) => year.year !== annual.startYear + index)
    || annualDomains.years.length !== annual.years.length || annualEvents.years.length !== annual.years.length
    || new Set(annualDomains.years.map((year) => year.year)).size !== annual.years.length || new Set(annualEvents.years.map((year) => year.year)).size !== annual.years.length) fail("完整年度窗口或命盘来源不一致。");
  const years = annual.years.map((year) => {
    const domains = annualDomains.years.find((item) => item.year === year.year), events = annualEvents.years.find((item) => item.year === year.year);
    if (!domains || !events) fail("缺少本年的原领域或事项。");
    return buildAnnualLifeStory({ revision, assessment, year, domains: domains!, events: events!, ...(input.contextual === undefined ? {} : { contextual: input.contextual }) });
  });
  return { version: ANNUAL_LIFE_STORY_VERSION, sourceBinding: binding, sourceVersions: unique([ANNUAL_LIFE_STORY_VERSION, annual.version, annualEvents.version, ...years.flatMap((year) => year.sourceVersions)]),
    startYear: annual.startYear, endYear: annual.endYear, years };
}
