import type { ResearchNoteRecord, TransitNodeRef } from "@hakimi/contracts";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { buildNatalRelationshipFoundation } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { evaluateNatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { buildAnnualMonthContext, type BuildAnnualMonthContextInput, type AnnualMonth, type AnnualMonthPeriod } from "./annual-month-context";
import { createAnnualRelationshipTimingBuilder, type AnnualRelationshipTiming } from "./annual-relationship-timing";
import type { EventTendencyCategory, EventTendencyDirection, EventTendencyLevel } from "./annual-event-tendencies";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import { LOCAL_ANNUAL_OUTLOOK_VERSION } from "./local-annual-outlook";
import type { OutlookStemAction } from "./local-outlook-judgment";
import { buildLocalPersonalReading, type LocalPersonalReading, type LocalPersonalReadingEntry } from "./local-personal-reading";
import type { LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";
import type { ReadingContextReference, ReadingContextRelationship, ReadingContextWork } from "./local-reading-context";
import { assertPersonalReadingLegacyBindings } from "./local-personal-reading-legacy";
import { buildAnnualLifeStory, type AnnualLifeStory } from "./annual-life-story";
import { annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions, annualLifeStorySubjectId } from "./annual-life-story-record";
import { buildAnnualMonthStory, type LocalAnnualMonthStory } from "./local-annual-month-story";
import { annualMonthStoryEntries, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions, annualMonthStorySubjectId } from "./local-annual-month-story-record";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { monthlyDomainFeedbackText } from "./local-monthly-domain-record";
import { annualEventFeedbackText, READING_ANNUAL_EVENTS_VERSION } from "./local-annual-event-record";
import { composeAnnualEvents, ANNUAL_EVENT_COMPOSITION_VERSION, annualEventCompositionSubjectId } from "./local-annual-event-composition";
import { annualEventCompositionFeedbackText } from "./local-annual-event-composition-record";
import { contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { summarizeAnnualJudgmentCaptions, READING_YEAR_SUMMARY_VERSION } from "./outlook-judgment-presentation";
import type { ReadingFeedbackChoice } from "./local-reading-feedback";
import { plainAnnualMonthContrast } from "./plain-monthly-presentation";

export const KEY_MONTH_EVENT_TENDENCIES_VERSION = "hakimi.key-month-event-tendencies/0.2.0" as const;
type Domain = "career" | "wealth" | "relationship";
type BranchId = "locked" | "forward" | "backward";
export interface KeyMonthEventEvidence {
  id: string;
  kind: "actor" | "task_relation" | "palace_relation" | "star_entry" | "star_relation" | "career_relation" | "annual_relationship" | "annual_actor" | "judgment_context";
  origin: "month" | "year" | "dayun" | "natal";
  nodeRef: TransitNodeRef | null;
  axisId: string | null;
  actionIndex: number | null;
  refs: { axisId: string; field: string; index: number }[];
  factId: string | null;
  lensId: "wealth" | "authority" | null;
  text: string;
}
export interface KeyMonthEventTendency {
  id: string; category: EventTendencyCategory; domain: Domain;
  level: EventTendencyLevel; levelLabel: string; direction: EventTendencyDirection;
  title: string; text: string; origin: "calculated" | "contextual" | "personal";
  scope: { year: number; branchId: BranchId; monthId: string; segmentId: string; annualSegmentId: string | null;
    startInstant: string; endExclusiveInstant: string; targetRef: TransitNodeRef; backgroundRefs: TransitNodeRef[] };
  applicableIntervals: { startInstant: string; endExclusiveInstant: string }[];
  workState: ReadingContextWork; relationshipState: ReadingContextRelationship;
  sourceSubjects: string[]; personalTextIds: string[];
  supportEvidenceIds: string[]; counterEvidenceIds: string[]; evidenceIds: string[];
  lensIds: ("wealth" | "authority")[]; ruleIds: string[]; sourceIds: string[]; conditions: string[];
  /** Preserve the automatic interpretation for comparison, never present it
   * as the current answer when origin is personal. */
  automatic?: { level: EventTendencyLevel; direction: EventTendencyDirection; text: string };
}
export interface KeyMonthEventPeriod {
  id: string; monthId: string; monthLabel: string; monthGanZhi: string; branchId: BranchId;
  startInstant: string; endExclusiveInstant: string; age: LocalReadingAgeContext;
  events: KeyMonthEventTendency[];
}
export interface KeyMonthSelection {
  monthId: string; label: string; ganZhi: string; startInstant: string; endExclusiveInstant: string;
  periodIds: string[]; eventIds: string[];
}
export interface KeyMonthEventTendencies {
  version: typeof KEY_MONTH_EVENT_TENDENCIES_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; contextRef: ReadingContextReference | null;
  year: number; status: "ready" | "partial" | "before_birth" | "unavailable";
  startInstant: string | null; endExclusiveInstant: string | null;
  branches: { id: BranchId; label: string; periods: KeyMonthEventPeriod[]; keyMonths: KeyMonthSelection[];
    gaps: { startInstant: string | null; endExclusiveInstant: string | null; message: string }[] }[];
  evidence: KeyMonthEventEvidence[];
  personalTexts: { id: string; subjectId: string; title: string; text: string }[];
  limitations: string[];
}
export interface BuildKeyMonthEventTendenciesInput extends BuildAnnualMonthContextInput {
  annual?: LocalAnnualOutlook | null;
  annualLifeStory?: AnnualLifeStory | null;
  annualMonthStory?: LocalAnnualMonthStory | null;
  personal?: LocalPersonalReading | null;
  /** The actual loaded window, needed to replay older annual/life epochs.
   * Monthly inputs below are replaced with this exact requested year's data. */
  legacySource?: LegacyAnnualReadingInput;
}
export interface KeyMonthEventSelection {
  category: EventTendencyCategory; branchId: BranchId;
  startInstant: string; endExclusiveInstant: string; limit?: 1 | 2 | 3;
}
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const fail = (message: string): never => { throw new Error(`关键月份事件：${message}`); };
const categories: EventTendencyCategory[] = ["promotion", "job_change", "money_inflow", "money_loss", "romance", "commitment", "separation"];
const titles: Record<EventTendencyCategory, string> = { promotion: "升职", job_change: "换工作", money_inflow: "进财", money_loss: "破财", romance: "恋爱", commitment: "谈婚论嫁", separation: "分开" };
const levels: Record<EventTendencyLevel, string> = { clear: "倾向较明显", possible: "有一定倾向", weak: "线索较弱", none: "未见突出线索", not_applicable: "当前条件不适用" };
const ranks: Record<EventTendencyLevel, number> = { clear: 3, possible: 2, weak: 1, none: 0, not_applicable: -1 };
const domainOf = (category: EventTendencyCategory): Domain => ["promotion", "job_change"].includes(category) ? "career" : ["money_inflow", "money_loss"].includes(category) ? "wealth" : "relationship";
const helps = (item: OutlookStemAction) => item.effect === "assists" || item.effect === "mixed";
const hurts = (item: OutlookStemAction) => item.effect === "obstructs" || item.effect === "mixed";
const isWealth = (item: OutlookStemAction) => ["正财", "偏财"].includes(item.tenGod);
const isResource = (item: OutlookStemAction) => ["正印", "偏印"].includes(item.tenGod);
const isAuthority = (item: OutlookStemAction) => ["正官", "七杀"].includes(item.tenGod);
const condition = "月份倾向只依据本月实际作用及同段年运背景；支持程度不是发生概率，也不保证事件发生。";
function versions(items: readonly string[]) { return stable(unique(items).sort()); }

/** Original choices for the newly loaded month-year, rather than the page's
 * previous query year. No new subject or short-prose feedback identity. */
export function buildKeyMonthReadingChoices(input: BuildKeyMonthEventTendenciesInput): ReadingFeedbackChoice[] {
  const { revision, assessment, year, annualDomains, annualEvents, monthly, monthlyDomains } = input;
  buildAnnualMonthContext(input);
  const choices = new Map<string, ReadingFeedbackChoice>();
  const add = (id: string, text: string, sourceVersions: string[]) => choices.set(id, { id, label: id, originalConclusion: text, sourceVersions });
  add(`annual-${year.year}`, `${year.year}年 · ${year.label}\n${outlookJudgmentFeedbackText(year.judgment) || year.summary}\n本年自身倾向：${year.yearInfluence.summary}\n大运背景：${year.decadeInfluence.summary}\n年度规则：${LOCAL_ANNUAL_OUTLOOK_VERSION}`, [LOCAL_ANNUAL_OUTLOOK_VERSION]);
  if (input.annual) {
    if (input.annual.revisionId !== revision.id || input.annual.chartResultHash !== revision.manifest.resultHash
      || !input.annual.years.some(item => same(item, year))) fail("年度总览缺少同一完整年份。");
    add("annual-overview", `${summarizeAnnualJudgmentCaptions(input.annual)}\n${input.annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${input.annual.version}`, [input.annual.version, READING_YEAR_SUMMARY_VERSION]);
  }
  for (const month of monthly.months) add(`month-${month.id}`, `${monthly.year}年 ${month.headline}\n${month.startInstant} 至 ${month.endExclusiveInstant}\n${month.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(month.judgment)}\n岁运解读规则：${monthly.version}`, [monthly.version]);
  for (const month of monthlyDomains.months) for (const branch of month.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    add(`monthly-domain-${month.monthId}-${segment.id}-${domain.id}`, monthlyDomainFeedbackText(monthlyDomains, month, branch, segment, domain), [monthlyDomains.version, ...monthlyDomains.sourceVersions]);
  for (const branch of annualDomains.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    add(`annual-domain-${year.year}-${segment.id}-${domain.id}`, annualDomainFeedbackText(annualDomains, branch, segment, domain), [annualDomains.version, ...annualDomains.sourceVersions]);
  const composed = composeAnnualEvents(annualEvents);
  for (const branch of annualEvents.branches) for (const segment of branch.segments) {
    for (const item of segment.items) add(`annual-event-${year.year}-${segment.id}-${item.id}`, annualEventFeedbackText(annualEvents, branch, segment, item), [READING_ANNUAL_EVENTS_VERSION, ...annualEvents.sourceVersions]);
    for (const group of composed.branches.find(b => b.id === branch.id)?.segments.find(s => s.id === segment.id)?.items ?? [])
      if (group.kind === "settlement") add(annualEventCompositionSubjectId(year.year, segment, group), annualEventCompositionFeedbackText(annualEvents, branch, segment, group), [READING_ANNUAL_EVENTS_VERSION, ANNUAL_EVENT_COMPOSITION_VERSION, ...annualEvents.sourceVersions]);
  }
  if (input.contextual) for (const item of input.contextual.readings) add(item.subjectId, contextualFeedbackText(item, input.contextual), contextualFeedbackVersions(item, input.contextual));
  {
    const expected = buildAnnualLifeStory({ revision, assessment, year, domains: annualDomains, events: annualEvents, contextual: input.contextual });
    if (input.annualLifeStory && !same(input.annualLifeStory, expected)) fail("年度总评与本年原来源不一致。");
    for (const branch of expected.branches) for (const segment of branch.segments)
      add(annualLifeStorySubjectId(expected, segment), annualLifeStoryFeedbackText(expected, segment), annualLifeStoryFeedbackVersions(expected, segment));
  }
  {
    const expected = buildAnnualMonthStory(input);
    if (input.annualMonthStory && !same(input.annualMonthStory, expected)) fail("年月故事与原月份来源不一致。");
    for (const { month, branch, period, domain } of annualMonthStoryEntries(expected))
      add(annualMonthStorySubjectId(expected, month, period, domain), annualMonthStoryFeedbackText(expected, month, branch, period, domain), annualMonthStoryFeedbackVersions(expected));
  }
  return [...choices.values()];
}

/** Re-resolve the actual stored records for this newly loaded year. A caller
 * must not reuse a personal view built from another query year's choices. */
export async function buildKeyMonthPersonalReading(input: BuildKeyMonthEventTendenciesInput,
  records: readonly ResearchNoteRecord[]): Promise<LocalPersonalReading> {
  if (input.legacySource && (!same(input.legacySource.revision, input.revision)
    || !same(input.legacySource.assessment, input.assessment)
    || !same(input.legacySource.contextual ?? null, input.contextual ?? null))) fail("历史个人来源与本月命盘或阅读背景不一致。");
  return buildLocalPersonalReading({ revision: input.revision, assessment: input.assessment,
    choices: buildKeyMonthReadingChoices(input), records,
    legacySource: { ...input.legacySource, revision: input.revision, assessment: input.assessment,
      monthly: input.monthly, monthlyDomains: input.monthlyDomains, contextual: input.contextual } });
}

/** Validate only the original subjects this projection consumes. Unrelated
 * personal notes are left to their own consumer; a mismatching relevant
 * adoption is rejected rather than silently replaced with an automatic event. */
function adoptedEntries(input: BuildKeyMonthEventTendenciesInput, subjects: string[]): Map<string, LocalPersonalReadingEntry> {
  const result = new Map<string, LocalPersonalReadingEntry>(), personal = input.personal;
  if (!personal) return result;
  const { revision, assessment, monthly, monthlyDomains } = input;
  const binding = { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour };
  if (!same(personal.sourceBinding, binding)) return fail("个人修订属于其他命盘或时柱范围。");
  const relevant = personal.entries.filter(entry => subjects.includes(entry.subjectId));
  // Month-own and monthly-domain families are enumerated by the full replay,
  // not the annual-only enumerator. Use the identical source prepared by the
  // asynchronous personal builder; never manufacture an annual wrapper.
  assertPersonalReadingLegacyBindings(personal, { ...input.legacySource, revision, assessment,
    monthly, monthlyDomains, contextual: input.contextual }, relevant.map(entry => entry.subjectId));
  if (!relevant.some(entry => entry.state === "adopted")) return result;
  const choices = new Map(buildKeyMonthReadingChoices(input).map(choice => [choice.id, choice]));
  const seen = new Set<string>();
  for (const entry of relevant) {
    if (seen.has(entry.subjectId)) fail("个人修订主题重复。");
    seen.add(entry.subjectId);
    if (entry.state !== "adopted") continue;
    const choice = choices.get(entry.subjectId);
    if (!choice || choice.originalConclusion !== entry.originalConclusion || versions(choice.sourceVersions ?? []) !== versions(entry.readingVersions)
      || !entry.personalText || entry.effectiveConclusion !== entry.personalText || entry.issues.length || !entry.selectedReviewRefs.length
      || entry.selectedReviewRefs.some(ref => !entry.feedback.some(feedback => same(feedback.latestReviewRef, ref) && feedback.reviewState === "revised"
        && feedback.revisedConclusion === entry.personalText && feedback.canReview && !feedback.chainIssues.length)))
      fail("已采用修订缺少同段完整原文、版本或有效复核；未用自动事件替代。");
    result.set(entry.subjectId, entry);
  }
  return result;
}

/** A selected event keeps its exact adult intersection, not a calendar-month
 * guess or a twelfth of the annual answer. No source objects are mutated. */
export function selectKeyMonthEvents(reading: KeyMonthEventTendencies, selection: KeyMonthEventSelection): KeyMonthEventTendency[] {
  if (!Number.isFinite(Date.parse(selection.startInstant)) || !Number.isFinite(Date.parse(selection.endExclusiveInstant))
    || selection.startInstant >= selection.endExclusiveInstant) return fail("选择区间无效。");
  const candidates = reading.branches.find(branch => branch.id === selection.branchId)?.periods.flatMap(period =>
    period.events.filter(item => item.category === selection.category && (item.origin === "personal" || ranks[item.level] > 0))
      .flatMap(item => item.applicableIntervals.map(interval => ({
        ...structuredClone(item), scope: { ...structuredClone(item.scope),
          startInstant: interval.startInstant > selection.startInstant ? interval.startInstant : selection.startInstant,
          endExclusiveInstant: interval.endExclusiveInstant < selection.endExclusiveInstant ? interval.endExclusiveInstant : selection.endExclusiveInstant },
      })).filter(item => item.scope.startInstant < item.scope.endExclusiveInstant))) ?? [];
  candidates.sort((a, b) => (b.origin === "personal" ? 4 : ranks[b.level]) - (a.origin === "personal" ? 4 : ranks[a.level])
    || a.scope.startInstant.localeCompare(b.scope.startInstant));
  const monthIds = unique(candidates.map(item => item.scope.monthId)).slice(0, selection.limit ?? 2);
  return candidates.filter(item => monthIds.includes(item.scope.monthId)).sort((a, b) => a.scope.startInstant.localeCompare(b.scope.startInstant));
}

export function buildKeyMonthEventTendencies(input: BuildKeyMonthEventTendenciesInput): KeyMonthEventTendencies {
  // This existing strict bridge verifies actual Jie boundaries, all original
  // monthly actions and full ordered year/dayun refs before prose is produced.
  const context = buildAnnualMonthContext(input);
  const foundation = buildNatalRelationshipFoundation(input.revision, input.assessment);
  const natalTask = evaluateNatalWealthResourceTask({ facts: input.assessment.balance.structural.inputFacts, includeHour: context.sourceBinding.includeHour });
  const timingBuilder = createAnnualRelationshipTimingBuilder(input.revision, input.assessment);
  const timingBySegment = new Map<string, AnnualRelationshipTiming>();
  const evidence = new Map<string, KeyMonthEventEvidence>();
  const put = (item: KeyMonthEventEvidence) => { const old = evidence.get(item.id); if (old && !same(old, item)) fail("依据标识对应不同原文。"); evidence.set(item.id, item); return item.id; };
  const composed = composeAnnualEvents(input.annualEvents);
  const branches = new Map<BranchId, KeyMonthEventTendencies["branches"][number]>();
  const buildPeriod = (month: AnnualMonth, period: AnnualMonthPeriod): KeyMonthEventPeriod => {
    const judgment = period.monthlyJudgment, pattern = judgment.axes.find(axis => axis.axis === "pattern");
    if (!pattern?.stemActions || pattern.stemActions.items.length !== 2) return fail("原月段缺少完整透干、本气作用。");
    const actions = pattern.stemActions.items, relations = pattern.taskLinks?.items.flatMap(item => item.relations) ?? [];
    const annualSegment = period.annualSegment ? input.year.judgmentSegments.find(segment => segment.id === period.annualSegment!.id
      && segment.branchId === period.branchId && segment.startInstant <= period.startInstant && segment.endExclusiveInstant >= period.endExclusiveInstant)
      ?? fail("月段缺少同一分支、精确覆盖的年度判断。") : null;
    const annualPattern = annualSegment?.judgment.axes.find(axis => axis.axis === "pattern");
    const age = buildLocalReadingAgeContext(context.sourceBinding.includeHour ? input.revision.timeCalibration.utcInstant : null, period.startInstant, period.endExclusiveInstant);
    const applicableIntervals = age.segments.filter(part => part.stage === "adult").map(part => ({ startInstant: part.startInstant, endExclusiveInstant: part.endExclusiveInstant }));
    const document = input.contextual?.contextSource.document.context;
    const eligibleContext = document && document.fromYear <= context.year && context.year <= document.toYear && applicableIntervals.length > 0;
    const work: ReadingContextWork = eligibleContext ? document.work : "unspecified";
    const relationship: ReadingContextRelationship = eligibleContext ? document.relationship : "unspecified";
    const prefix = `${period.branchId}:${month.monthId}:${period.id}`;
    const actorEvidence = (index: number) => {
      const action = actions[index]!, refs = [
        ...action.evidenceIndexes.map(index => ({ axisId: pattern.id, field: "evidence", index })),
        ...action.blockerIndexes.map(index => ({ axisId: pattern.id, field: "blockers", index })),
        ...action.satisfiedConditionIndexes.map(index => ({ axisId: pattern.id, field: "satisfiedConditions", index })),
      ];
      const text = refs.map(ref => pattern[ref.field as "evidence" | "blockers" | "satisfiedConditions"][ref.index] ?? fail("月作用依据索引越界。")).join("\n");
      return put({ id: `${prefix}:actor:${index}`, kind: "actor", origin: "month", nodeRef: month.nodeRef,
        axisId: pattern.id, actionIndex: index, refs, factId: null, lensId: null, text });
    };
    const edgeEvidence = (index: number) => {
      const edge = relations[index]!;
      return put({ id: `${prefix}:edge:${index}`, kind: "task_relation",
        origin: edge.from.origin.kind === "target" ? "month" : edge.from.origin.kind === "natal" ? "natal" : edge.from.origin.nodeRef.nodeType === "year" ? "year" : "dayun",
        nodeRef: edge.from.origin.kind === "natal" ? null : edge.from.origin.nodeRef, axisId: pattern.id, actionIndex: null,
        refs: structuredClone(edge.refs), factId: null, lensId: null,
        text: edge.refs.map(ref => judgment.axes.find(axis => axis.id === ref.axisId)?.[ref.field][ref.index] ?? fail("月任务依据索引越界。")).join("\n") });
    };
    // Annual context is explanatory only: it never becomes a monthly trigger,
    // changes its level, or adds a support/counter vote.
    const annualActorEvidence = (index: number) => {
      const action = annualPattern?.stemActions?.items[index];
      if (!action || !annualPattern || !annualSegment) return fail("年度角色缺少原段依据。");
      const refs = [
        ...action.evidenceIndexes.map(index => ({ axisId: annualPattern.id, field: "evidence", index })),
        ...action.blockerIndexes.map(index => ({ axisId: annualPattern.id, field: "blockers", index })),
        ...action.satisfiedConditionIndexes.map(index => ({ axisId: annualPattern.id, field: "satisfiedConditions", index })),
      ];
      return put({ id: `${prefix}:annual-actor:${index}`, kind: "annual_actor", origin: "year", nodeRef: annualSegment.judgment.targetRef,
        axisId: annualPattern.id, actionIndex: index, refs, factId: null, lensId: null,
        text: refs.map(ref => annualPattern[ref.field as "evidence" | "blockers" | "satisfiedConditions"][ref.index] ?? fail("年度角色依据索引越界。")).join("\n") });
    };
    const annualPrimary = annualSegment?.judgment.axes.find(axis => axis.axis === annualSegment.judgment.primaryAxis);
    const monthlyPrimary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis);
    const contrast = annualSegment ? plainAnnualMonthContrast(annualSegment.judgment, judgment) : "";
    const contrastEvidence = () => {
      if (!annualSegment || !annualPrimary || !monthlyPrimary) return [];
      return [put({ id: `${prefix}:annual-context`, kind: "judgment_context", origin: "year", nodeRef: annualSegment.judgment.targetRef,
        axisId: annualPrimary.id, actionIndex: null, refs: [], factId: null, lensId: null,
        text: annualPrimary.summary }), put({ id: `${prefix}:month-context`, kind: "judgment_context", origin: "month", nodeRef: month.nodeRef,
        axisId: monthlyPrimary.id, actionIndex: null, refs: [], factId: null, lensId: null,
        text: monthlyPrimary.summary })];
    };
    const indexes = (fn: (item: OutlookStemAction) => boolean) => actions.flatMap((item, i) => fn(item) ? [i] : []);
    const edges = (groups: string[], targetOnly = false) => relations.flatMap((edge, i) =>
      edge.contributesPressure && groups.includes(edge.to.group) && (!targetOnly || edge.from.origin.kind === "target") ? [i] : []);
    type Draft = { level: EventTendencyLevel; text: string; support: string[]; counter: string[]; context?: string[]; rule: string; risk?: boolean; lensIds?: ("wealth" | "authority")[] };
    const drafts = new Map<EventTendencyCategory, Draft>(categories.map(category => [category, { level: "none", text: `本月未见可单列的${titles[category]}线索。`, support: [], counter: [], rule: "no-month-trigger" }]));
    const set = (category: EventTendencyCategory, draft: Draft) => drafts.set(category, draft);
    const workEligible = !["student", "caregiving", "retired"].includes(work);
    const promotionEligible = workEligible && !["self_employed", "seeking_work"].includes(work);
    const authorityHelp = indexes(action => isAuthority(action) && helps(action)), resourceHelp = indexes(action => isResource(action) && helps(action));
    const authorityResource = ["official-resource", "killings-resource"].includes(pattern.pathId)
      && pattern.taskLinks?.items.some(link => link.functions.some(edge => edge.from.group === "authority" && edge.to.group === "resource" && edge.operation === "generate"));
    if (promotionEligible && (authorityHelp.length || (authorityResource && resourceHelp.length))) {
      const supports = unique([...authorityHelp, ...(authorityResource ? resourceHelp : [])]);
      const counter = unique([...edges(["authority", "resource"]).map(edgeEvidence),
        ...indexes(action => (isAuthority(action) || isResource(action)) && hurts(action)).map(actorEvidence)]);
      const visible = authorityHelp.some(i => actions[i]!.visibility === "visible");
      const supportedScene = visible ? "本月可能接到更正式的职责、考核认可或晋升安排"
        : authorityHelp.length ? supports.some(i => isResource(actions[i]!))
          ? "本月原任务的职责承接得到专业准备或指导配合，可能被安排承担更重要的工作"
          : "本月原岗位要求或任务分工可能带来职责承接，属于间接的晋升观察线索"
          : "本月较易因专业准备、资格或指导支持而成为重要任务的承接人";
      set("promotion", { level: counter.length ? "weak" : visible ? "possible" : "weak",
        text: `${work === "unspecified" ? "若在职，" : ""}${supportedScene}${counter.length ? "；原职责或配套仍受牵制，任命与落实可能需要重新确认。" : "，适合留意授权、转正或职责提升的具体通知。"}`,
        support: supports.map(actorEvidence), counter, rule: "monthly-responsibility-support" });
    }
    const authorityPressure = indexes(action => isAuthority(action) && hurts(action)), currentDutyEdges = edges(["authority"], true);
    const monthClashes = calculatePillarRelations({ year: month.ganZhi, month: input.revision.facts.pillars.month.ganZhi, day: month.ganZhi, hour: input.revision.facts.pillars.month.ganZhi }).facts
      .filter(fact => fact.completeness === "binary" && fact.relationType === "branch_six_clash" && fact.participants.length === 2
        && fact.participants.some(p => p.position === "year" && p.component === "branch") && fact.participants.some(p => p.position === "month" && p.component === "branch"));
    const clashIds = monthClashes.map(fact => put({ id: `${prefix}:career:${fact.id}`, kind: "career_relation", origin: "month", nodeRef: month.nodeRef,
      axisId: null, actionIndex: null, refs: [], factId: fact.id, lensId: null,
      text: `实际${month.label}${month.ganZhi}与本命月柱${input.revision.facts.pillars.month.ganZhi}构成地支六冲；关系引擎year槽为流月，month槽为本命月柱。` }));
    if (workEligible && (authorityPressure.length || currentDutyEdges.length || clashIds.length)) set("job_change", {
      level: clashIds.length || authorityPressure.some(i => actions[i]!.visibility === "visible") ? "possible" : "weak",
      text: work === "seeking_work" ? "本月可能遇到面试岗位、入职时间或录用要求变化，转投其他机会或重谈安排的倾向更突出。"
        : work === "self_employed" ? "本月可能更换合作方式、调整经营分工或退出一项旧安排，变化落在当前角色与要求。"
        : `${work === "unspecified" ? "若在职，" : ""}本月容易出现调岗、团队或工作地点调整，也可能因职责与要求不合而谈离职、换单位。`,
      support: [...authorityPressure.map(actorEvidence), ...currentDutyEdges.map(edgeEvidence), ...clashIds], counter: [], rule: "monthly-duty-or-month-pillar-change" });
    const wealthHelp = indexes(action => isWealth(action) && helps(action)), wealthPressure = indexes(action => isWealth(action) && hurts(action));
    const selectedTask = natalTask.preferredPathId === pattern.pathId ? natalTask.task : null;
    const specialMoney = ["resource_first", "wealth_first", "official_joint"].includes(selectedTask ?? "")
      || ["official-resource", "killings-resource", "food-killings", "resource-wealth"].includes(pattern.pathId);
    if (wealthHelp.length && !specialMoney) {
      const counter = unique([...edges(["wealth", "output"]).map(edgeEvidence), ...wealthHelp.filter(i => actions[i]!.effect === "mixed").map(actorEvidence)]);
      const actor = actions[wealthHelp[0]!]!;
      const daily = ["student", "seeking_work", "caregiving", "retired"].includes(work);
      const annualWealthIndex = annualPattern?.stemActions?.items.findIndex(action => action.visibility === "visible" && isWealth(action) && helps(action)) ?? -1;
      const annualWealth = annualPattern?.stemActions?.items[annualWealthIndex];
      const changedReturnRole = !daily && annualWealth && annualWealth.tenGod !== actor.tenGod;
      const returnScene = changedReturnRole
        ? actor.tenGod === "正财"
          ? "本年有新合作或新用途的进账线索；本月若已有明确约定，更侧重报酬确认、结算、还款或续用，不表示年内新机会已经兑现。"
          : "本年侧重原有约定的兑现；本月另有新合作或新用途带来的分配机会，需要实际新增安排，不能把原有款项直接算成新增进账。"
        : daily ? "本月原先约定的退款、报销、共同分担或借用归还较有落实机会，是否进账仍取决于已有款项。"
          : actor.tenGod === "正财" ? "本月若已有完成事项或明确约定，较有条件确认报酬、结算、还款或原订单续用；实际到账仍须有相应款项。"
            : "本月合作、新客户或成果的新用途较容易带来款项与分配机会，进账通常与实际参与的安排相连。";
      set("money_inflow", { level: actor.visibility === "visible" ? counter.length ? "possible" : "clear" : "weak",
        text: returnScene + (counter.length ? "同段仍有牵制，金额、分担或兑现时间可能反复确认。" : ""),
        support: wealthHelp.map(actorEvidence), counter, context: changedReturnRole ? [annualActorEvidence(annualWealthIndex)] : [], rule: "monthly-supported-return" });
    }
    const costActors = indexes(action => hurts(action) && (isWealth(action) || isResource(action) || ["食神", "伤官", "比肩", "劫财"].includes(action.tenGod)));
    const costEdges = edges(["resource", "output", "wealth"], true);
    if (costActors.length || costEdges.length) {
      const resourceActor = costActors.map(i => actions[i]!).find(isResource);
      const outputCost = costActors.some(i => ["食神", "伤官", "比肩", "劫财"].includes(actions[i]!.tenGod));
      const resourceOutputEdges = costEdges.map(index => relations[index]!).filter(edge => resourceActor
        && edge.from.stem === resourceActor.stem && edge.from.visibility === resourceActor.visibility && edge.to.group === "output");
      const combined = resourceOutputEdges.some(edge => edge.operation === "combine"), controlled = resourceOutputEdges.some(edge => edge.operation === "control");
      const outputHelp = indexes(action => ["食神", "伤官"].includes(action.tenGod) && helps(action));
      const costScene = resourceOutputEdges.length
        ? `本月${resourceActor!.tenGod === "正印" ? "原有课程、指导或资料" : "专项工具、新方法或替代方案"}${combined ? "可能与原有完成办法相互牵连" : "可能打断原有完成办法"}${combined && controlled ? "，也可能挤占实际完成的空间" : ""}；若因此反复学习、试用或购买，就可能增加费用。`
        : null;
      const helpScene = resourceOutputEdges.length && outputHelp.length
        ? `${outputHelp.some(index => actions[index]!.tenGod === "伤官") ? "同月也有改法和试用的可用条件" : "同月也有熟悉本领与稳定完成的可用条件"}，不等于上述费用已经免除。` : "";
      set("money_loss", { level: costActors.some(i => actions[i]!.visibility === "visible") ? "possible" : "weak", risk: true,
        text: specialMoney && wealthPressure.length ? "本月新增要求可能占去必要工具、指导或执行配套，为补回支持或处理新增任务而追加花费。"
          : costScene ? costScene + helpScene : resourceActor ? resourceActor.tenGod === "偏印"
            ? "本月可能另买专项工具、试用不同方法或更换方案；新旧配置并行，容易多花替换和试用费用。"
            : "本月原有课程、指导或资料可能反复补充，准备迟迟没用于实际完成，容易增加补课和重复购买费用。"
            : outputCost ? "本月返工、试做或共同分担可能超出原预算，材料、协作与临时周转费用容易增加。"
              : "本月原有款项或投入易被重新分配，可能追加承担、延期回收，或支付计划外的费用。",
        support: [...costActors.map(actorEvidence), ...costEdges.map(edgeEvidence)],
        counter: costActors.filter(i => actions[i]!.effect === "mixed").map(actorEvidence), context: helpScene ? outputHelp.map(actorEvidence) : [], rule: "monthly-extra-cost" });
    }
    // Relationship triggers are independently derived from the actual month.
    // A recurring annual/dayun signal is only context, never a monthly trigger.
    let timing: AnnualRelationshipTiming | null = null;
    if (period.annualSegment) {
      timing = timingBySegment.get(period.annualSegment.id) ?? null;
      if (!timing) {
        const annual = input.year.judgmentSegments.find(s => s.id === period.annualSegment!.id && s.branchId === period.branchId) ?? fail("缺少原年段。");
        timing = timingBuilder(input.year, annual); timingBySegment.set(annual.id, timing);
      }
    }
    const lensResults = foundation.perspectives.map(lens => {
      const support: string[] = [], counter: string[] = [], background: string[] = [];
      let palaceJoin = false, palaceClash = false, star = false, starJoin = false, starClash = false;
      for (const fact of month.monthlyRelationshipFacts) {
        const id = put({ id: `${prefix}:${lens.id}:palace:${fact.factId}`, kind: "palace_relation", origin: "month", nodeRef: month.nodeRef,
          axisId: null, actionIndex: null, refs: [], factId: fact.factId, lensId: lens.id,
          text: `本月${month.ganZhi}与原日支${foundation.dayPalace.branch}有${fact.relationType === "branch_six_combination" ? "六合" : "六冲"}；仅为同一原日宫关系事实。` });
        if (fact.relationType === "branch_six_combination") { palaceJoin = true; support.push(id); }
        else { palaceClash = true; counter.push(id); }
      }
      const visible = actions.find(action => action.visibility === "visible")!;
      if (lens.primaryTenGods.includes(visible.tenGod)) {
        star = true; support.push(put({ id: `${prefix}:${lens.id}:star-entry`, kind: "star_entry", origin: "month", nodeRef: month.nodeRef,
          axisId: pattern.id, actionIndex: actions.indexOf(visible), refs: [], factId: null, lensId: lens.id,
          text: `本月透${visible.stem}${visible.tenGod}，属于${lens.label}的主星角色；这里只使用角色身份，不借事业或财务作用给关系定吉凶。` }));
      }
      for (const occurrence of lens.occurrences.filter(o => o.visibility === "visible" && lens.primaryTenGods.includes(o.tenGod))) {
        const facts = calculatePillarRelations({ year: month.ganZhi, month: occurrence.ganZhi, day: month.ganZhi, hour: occurrence.ganZhi }).facts.filter(fact =>
          fact.completeness === "binary" && fact.participants.length === 2 && ["stem_five_combination", "stem_clash"].includes(fact.relationType)
          && fact.participants.every(p => p.component === "stem") && fact.participants.some(p => p.position === "year") && fact.participants.some(p => p.position === "month"));
        for (const fact of facts) {
          const joined = fact.relationType === "stem_five_combination";
          const id = put({ id: `${prefix}:${lens.id}:star:${occurrence.id}:${fact.id}`, kind: "star_relation", origin: "month", nodeRef: month.nodeRef,
            axisId: null, actionIndex: null, refs: [], factId: fact.id, lensId: lens.id,
            text: `本月干${month.ganZhi[0]}与原${occurrence.position}柱明透${occurrence.stem}${occurrence.tenGod}有${joined ? "天干五合" : "天干冲"}；原星位置保留。` });
          if (joined) { starJoin = true; support.push(id); } else { starClash = true; counter.push(id); }
        }
      }
      const active = star || starJoin || starClash || palaceJoin || palaceClash;
      const yearlyLens = timing?.lenses.find(item => item.id === lens.id);
      if (active && yearlyLens) for (const signal of yearlyLens.signals.filter(s => yearlyLens.triggerSignalIds.includes(s.id))) {
        background.push(put({ id: `${prefix}:${lens.id}:annual:${signal.id}`, kind: "annual_relationship", origin: "year", nodeRef: signal.nodeRef,
          axisId: null, actionIndex: null, refs: [], factId: signal.factId, lensId: lens.id, text: signal.text }));
      }
      return { id: lens.id, support, counter, background, star, starJoin, starClash, palaceJoin, palaceClash };
    });
    const progressing = lensResults.filter(lens => lens.star || lens.starJoin || lens.palaceJoin);
    const changing = lensResults.filter(lens => lens.palaceClash || lens.starClash);
    const partialPrefix = (lenses: typeof lensResults) => foundation.perspectives.length > 1 && lenses.length === 1 ? "在其中一种关系视角下，" : "";
    const progressingCounter = progressing.filter(lens => lens.counter.length > 0);
    const counterClause = progressingCounter.length ? foundation.perspectives.length > 1 && progressingCounter.length < progressing.length
      ? "；其中一种关系视角另有期待或节奏摩擦，不能把接近直接当作关系稳定。" : "；同时有节奏或期待摩擦，不能把接近直接当作关系稳定。" : "。";
    const partnered = relationship === "partnered" || relationship === "married";
    const romanceScene = progressing.some(lens => lens.palaceJoin && (lens.star || lens.starJoin))
      ? "本月相识或原有好感较容易接到具体见面，双方可能确认约会、增加共同活动，让来往更持续"
      : progressing.some(lens => lens.star) ? "本月可能出现新相识、主动联系或更明确的好感，有机会从偶尔聊天进入约会和持续来往"
        : progressing.some(lens => lens.starJoin) ? "本月原有联系可能拉近，双方容易重新谈感受、回应和关系定位"
          : "本月双方时间较容易凑到一起，可能增加见面、约会或共同活动，原来零散的来往更具体";
    if (!partnered && relationship !== "separated" && progressing.length) set("romance", {
      level: progressing.some(l => l.palaceJoin && (l.star || l.starJoin)) ? "possible" : "weak",
      text: `${partialPrefix(progressing)}${romanceScene}${counterClause}`,
      support: progressing.flatMap(l => l.support), counter: progressing.flatMap(l => l.counter), lensIds: progressing.map(l => l.id), rule: "monthly-star-or-palace-contact" });
    if (relationship !== "separated" && relationship !== "married" && progressing.some(l => l.palaceJoin || l.starJoin)) set("commitment", {
      level: partnered && progressing.some(l => l.palaceJoin && (l.star || l.starJoin) && l.background.length) ? "possible" : "weak",
      text: `${partialPrefix(progressing)}${relationship === "single" ? "若本月已建立稳定交往，" : "已有稳定交往者，"}可能把见家人、订婚、共同居住或婚事安排提上日程；还需双方确有承诺基础${counterClause}`,
      support: progressing.flatMap(l => l.support), counter: progressing.flatMap(l => l.counter), lensIds: progressing.map(l => l.id), rule: "monthly-specific-commitment-arrangement" });
    if (relationship !== "single" && changing.length) set("separation", {
      level: changing.some(l => l.palaceClash && l.starClash) ? "possible" : "weak", risk: true,
      text: `${partialPrefix(changing)}${relationship === "separated" ? "本月可能再谈旧关系的物品、费用或联络边界，分居与交接安排容易变化。" : "若已有伴侣，本月容易因见面时间、共同计划或回应落差而疏远，可能争执、暂时分居或考虑分开；单项冲动线索不等于必然结束。"}`,
      support: changing.flatMap(l => l.counter), counter: changing.flatMap(l => l.support), lensIds: changing.map(l => l.id), rule: "monthly-relationship-friction" });
    const allAnnualEvidence = lensResults.flatMap(lens => lens.background);
    const events = categories.map((category): KeyMonthEventTendency => {
      const domain = domainOf(category), draft = drafts.get(category)!;
      const sourceSubjects = ["annual-overview", `annual-${context.year}`, `month-${month.monthId}`,
        `monthly-domain-${month.monthId}-${period.id}-${domain}`,
        `annual-month-story-${context.year}-${month.monthId}-${period.id}-${domain}`];
      if (period.annualSegment) {
        sourceSubjects.push(`annual-life-story-${context.year}-${period.branchId}-${period.annualSegment.id}`, `annual-domain-${context.year}-${period.annualSegment.id}-${domain}`);
        const items = period.annualSegment.items.filter(item => item.domain === domain);
        sourceSubjects.push(...items.map(item => `annual-event-${context.year}-${period.annualSegment!.id}-${item.id}`), ...items.flatMap(item => item.origin.contextSubjectId ? [item.origin.contextSubjectId] : []));
        const groups = composed.branches.find(b => b.id === period.branchId)?.segments.find(s => s.id === period.annualSegment!.id)?.items ?? [];
        sourceSubjects.push(...groups.filter(group => group.kind === "settlement" && group.members.some(member => items.some(item => item.id === member.id)))
          .map(group => annualEventCompositionSubjectId(context.year, period.annualSegment!, group)));
      }
      const notApplicable = !applicableIntervals.length || (domain === "career" && (!workEligible || (category === "promotion" && !promotionEligible)))
        || (category === "romance" && (partnered || relationship === "separated")) || (category === "commitment" && ["married", "separated"].includes(relationship))
        || (category === "separation" && relationship === "single");
      const level: EventTendencyLevel = notApplicable ? "not_applicable" : draft.level;
      const showContrast = domain !== "relationship" && ranks[level] > 0 && Boolean(contrast);
      const direction: EventTendencyDirection = ranks[level] <= 0 ? "unindicated" : draft.counter.length ? "mixed" : draft.risk ? "pressured" : "supported";
      const label = domain === "relationship" && relationship === "separated" ? "旧关系安排" : titles[category];
      return { id: `key-month-${context.year}-${prefix}-${category}`, category, domain, level, levelLabel: levels[level], direction, title: label,
        text: notApplicable ? !applicableIntervals.length ? "本段未有可确认的成年适用区间，保留原学习、相处或年龄未知内容，不套用成人事件。"
          : "按已确认的现实身份，本段不生成此类事件；原同域生活内容仍保留。" : draft.text + (showContrast ? contrast : ""),
        origin: context.contextRef ? "contextual" : "calculated",
        scope: { year: context.year, branchId: period.branchId, monthId: month.monthId, segmentId: period.id, annualSegmentId: period.annualSegment?.id ?? null,
          startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant, targetRef: structuredClone(month.nodeRef), backgroundRefs: structuredClone(judgment.backgroundRefs) },
        applicableIntervals: structuredClone(applicableIntervals), workState: work, relationshipState: relationship,
        sourceSubjects: unique(sourceSubjects), personalTextIds: [], supportEvidenceIds: unique(draft.support), counterEvidenceIds: unique(draft.counter),
        evidenceIds: unique([...draft.support, ...draft.counter, ...(draft.context ?? []), ...(showContrast ? contrastEvidence() : []), ...(domain === "relationship" ? allAnnualEvidence : [])]), lensIds: draft.lensIds ?? [],
        ruleIds: [`key-month-event:${draft.rule}:v1`], sourceIds: domain === "relationship" ? unique(foundation.perspectives.filter(lens => !draft.lensIds?.length || draft.lensIds.includes(lens.id)).flatMap(lens => lens.sourceIds)) : [],
        conditions: unique([condition, ...age.conditions, ...(domain === "relationship" ? ["只有本月新星宫作用才能形成月候选；年度关系线索仅作为背景，关系合冲不构成结婚或分开保证。"] : []),
          ...(age.stage === "adult_transition" ? ["成人事件只适用于本段18周岁生日之后的区间。"] : [])]) };
    });
    return { id: period.id, monthId: month.monthId, monthLabel: month.label, monthGanZhi: month.ganZhi, branchId: period.branchId,
      startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant, age, events };
  };
  for (const month of context.months) for (const branch of month.branches) {
    const entry = branches.get(branch.id) ?? { id: branch.id, label: branch.label, periods: [], keyMonths: [], gaps: [] };
    entry.periods.push(...branch.periods.map(period => buildPeriod(month, period)));
    entry.gaps.push(...branch.gaps.map(gap => ({ startInstant: gap.startInstant, endExclusiveInstant: gap.endExclusiveInstant, message: gap.message })));
    branches.set(branch.id, entry);
  }
  const allEvents = [...branches.values()].flatMap(branch => branch.periods.flatMap(period => period.events));
  const adopted = adoptedEntries(input, unique(allEvents.flatMap(item => item.sourceSubjects)));
  const personalTexts = [...adopted.values()].map(entry => ({ id: `key-month-personal-${entry.subjectId}`, subjectId: entry.subjectId, title: entry.subjectLabel, text: entry.personalText! }));
  for (const item of allEvents) {
    const entries = item.sourceSubjects.flatMap(subject => adopted.has(subject) ? [adopted.get(subject)!] : []);
    if (entries.length) {
      item.automatic = { level: item.level, direction: item.direction, text: item.text };
      item.origin = "personal"; item.text = "已采用个人修订，展开查看完整原文。";
      item.level = "none"; item.levelLabel = "已采用个人修订"; item.direction = "unindicated";
      item.personalTextIds = entries.map(entry => `key-month-personal-${entry.subjectId}`);
    }
  }
  for (const branch of branches.values()) {
    const candidates = branch.periods.flatMap(period => period.events.filter(item => item.origin === "personal" || ranks[item.level] > 0));
    candidates.sort((a, b) => (b.origin === "personal" ? 4 : ranks[b.level]) - (a.origin === "personal" ? 4 : ranks[a.level])
      || a.scope.startInstant.localeCompare(b.scope.startInstant));
    for (const id of unique(candidates.map(item => item.scope.monthId)).slice(0, 3)) {
      const month = context.months.find(item => item.monthId === id)!;
      const periods = branch.periods.filter(period => period.monthId === id);
      branch.keyMonths.push({ monthId: id, label: month.label, ganZhi: month.ganZhi, startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant,
        periodIds: periods.map(period => period.id), eventIds: periods.flatMap(period => period.events.filter(item => item.origin === "personal" || ranks[item.level] > 0).map(item => item.id)) });
    }
    branch.keyMonths.sort((a, b) => a.startInstant.localeCompare(b.startInstant));
  }
  return { version: KEY_MONTH_EVENT_TENDENCIES_VERSION, sourceBinding: structuredClone(context.sourceBinding),
    sourceVersions: unique([KEY_MONTH_EVENT_TENDENCIES_VERSION, ...context.sourceVersions, foundation.version, natalTask.version, ...[...timingBySegment.values()].flatMap(timing => timing.sourceVersions)]),
    contextRef: structuredClone(context.contextRef), year: context.year, status: context.status, startInstant: context.startInstant, endExclusiveInstant: context.endExclusiveInstant,
    branches: [...branches.values()], evidence: [...evidence.values()], personalTexts,
    limitations: unique([condition, "这里只覆盖已实际读取的十二节令月；其他年份须先按原配置计算真实流月，再生成关键月份。",
      "每个方向最多展示三个不同节令月；交运月的各原分段保留，事件级筛选可按准确年度区间另取一至两个对应月份。",
      "节令月起止采用原节点半开区间；小寒月可跨入下一公历年，未改为自然月份。",
      "没有突出的月候选不表示现实没有事件，也不以年度候选填补月份空白。",
      "月度星干候选仅取主星角色及原明透主星的合冲；偏财相关视角不单独扩成月度伴侣触发，未声称与年度星宫规则范围相同。",
      ...context.limitations]) };
}
