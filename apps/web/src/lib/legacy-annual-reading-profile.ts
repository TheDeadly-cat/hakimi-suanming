import { NATAL_PATTERN_PATH_VERSION } from "../../../../packages/bazi-interpretation/src/natal-pattern-path";
import { STRUCTURAL_STRENGTH_ASSESSMENT_VERSION } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { OUTLOOK_CLASSICAL_SOURCES_VERSION } from "../../../../packages/bazi-interpretation/src/outlook-classical-sources";
import * as priorEvents from "./legacy-annual-v06/local-annual-event-reading";
import * as priorEventRecord from "./legacy-annual-v06/local-annual-event-record";
import * as priorStory from "./legacy-annual-v06/annual-life-story";
import * as priorStoryRecord from "./legacy-annual-v06/annual-life-story-record";
import * as priorComposition from "./legacy-annual-v06/local-annual-event-composition";
import * as priorCompositionRecord from "./legacy-annual-v06/local-annual-event-composition-record";
import * as priorMonth from "./legacy-annual-v06/local-annual-month-story";
import * as priorMonthRecord from "./legacy-annual-v06/local-annual-month-story-record";
import * as priorStage from "./legacy-annual-v06/local-life-stage-years";
import * as priorStageRecord from "./legacy-annual-v06/local-life-stage-years-record";
import * as frozenAnnual from "./legacy-outlook-v09/local-annual-outlook";
import * as frozenDetailed from "./legacy-outlook-v09/local-detailed-outlook";
import * as frozenJudgment from "./legacy-outlook-v09/local-outlook-judgment";
import * as frozenLifeStory from "./legacy-outlook-v09/local-life-stage-story";
import * as frozenMonth from "./legacy-outlook-v09/local-monthly-domain-reading";
import * as frozenMonthProse from "./legacy-outlook-v09/monthly-domain-prose";
import { prepareLegacyOutlook, preparedLegacyOutlook, preparedLegacyYear } from "./legacy-outlook-preparation";
import { outlookChoices } from "./legacy-outlook-choices";
import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { NATAL_WEALTH_RESOURCE_TASK_VERSION } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualOutlook, type LocalAnnualYear } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, type LocalAnnualDomainReading } from "./local-annual-domain-reading";
import { annualDomainFeedbackText, type LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { LOCAL_DETAILED_OUTLOOK_VERSION, type LocalLifeOutlook, type LocalMonthlyOutlook } from "./local-detailed-outlook";
import { LIFE_STAGE_STORY_VERSION, type LocalLifeStageStory } from "./local-life-stage-story";
import { MONTHLY_DOMAIN_READING_VERSION, type LocalMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { MONTHLY_DOMAIN_PROSE_VERSION } from "./monthly-domain-prose";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, OUTLOOK_STEM_ACTIONS_VERSION } from "./local-outlook-judgment";
import { CONTEXTUAL_READING_VERSION } from "./local-contextual-reading";
import { contextualFeedbackText, contextualFeedbackVersions, type LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { READING_CONTEXT_FORMAT, type ReadingContextReference } from "./local-reading-context";
import { ADULT_LIFE_SITUATIONS_VERSION } from "./adult-life-situations";
import { ANNUAL_RELATIONSHIP_SIGNALS_VERSION } from "./annual-relationship-signals";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION } from "./annual-relationship-natal-context";
import { type ReadingFeedbackChoice } from "./local-reading-feedback";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import * as currentEvents from "./local-annual-event-reading";
import * as currentEventRecord from "./local-annual-event-record";
import * as currentStory from "./annual-life-story";
import * as currentStoryRecord from "./annual-life-story-record";
import * as currentComposition from "./local-annual-event-composition";
import * as currentCompositionRecord from "./local-annual-event-composition-record";
import * as currentMonth from "./local-annual-month-story";
import * as currentMonthRecord from "./local-annual-month-story-record";
import * as currentStage from "./local-life-stage-years";
import * as currentStageRecord from "./local-life-stage-years-record";
import * as oldEvents from "./legacy-annual-v05/local-annual-event-reading";
import * as oldEventRecord from "./legacy-annual-v05/local-annual-event-record";
import * as oldStory from "./legacy-annual-v05/annual-life-story";
import * as oldStoryRecord from "./legacy-annual-v05/annual-life-story-record";
import * as oldComposition from "./legacy-annual-v05/local-annual-event-composition";
import * as oldCompositionRecord from "./legacy-annual-v05/local-annual-event-composition-record";
import * as oldMonth from "./legacy-annual-v05/local-annual-month-story";
import * as oldMonthRecord from "./legacy-annual-v05/local-annual-month-story-record";
import * as oldStage from "./legacy-annual-v05/local-life-stage-years";
import * as oldStageRecord from "./legacy-annual-v05/local-life-stage-years-record";

/** This profile verifies historical originals; it is never a current prose producer. */
export const LEGACY_ANNUAL_READING_PROFILE_VERSION = "hakimi.legacy-annual-reading-profile/outlook-0.9-events-0.5-0.6/2" as const;
export type LegacyAnnualChoiceFamily = "event" | "story" | "composition" | "domain" | "contextual" | "annual" | "annual-month" | "stage-year"
  | "annual-overview" | "trajectory" | "timeline-stage" | "scenario" | "life-overview" | "decade" | "life-stage" | "life-transition" | "month" | "monthly-domain";
export interface LegacyAnnualReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment;
  annual?: LocalAnnualOutlook | null; annualDomains?: LocalReadingAnnualDomains | null;
  contextual?: LocalContextualReadingBundle | null;
  monthly?: LocalMonthlyOutlook | null; monthlyDomains?: LocalMonthlyDomainReadings | null;
  life?: LocalLifeOutlook | null; lifeStageStory?: LocalLifeStageStory | null;
  selectedDecadeId?: string | null;
}
export interface LegacyAnnualYearReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear;
  domains: LocalAnnualDomainReading; contextual?: LocalContextualReadingBundle | null;
  monthly?: LocalMonthlyOutlook | null; monthlyDomains?: LocalMonthlyDomainReadings | null;
}
export interface LegacyAnnualReadingFilter { epochs?: readonly ("event-0.5" | "event-0.6")[]; families?: readonly LegacyAnnualChoiceFamily[]; subjectIds?: readonly string[] }
type Binding = oldEvents.LocalAnnualEventReading["sourceBinding"];
export interface LegacyAnnualSegmentScope {
  branchId: string; segmentId: string; startInstant: string; endExclusiveInstant: string;
  personalStartInstant: string | null; targetRef: TransitNodeRef | null; backgroundRefs: TransitNodeRef[];
}
export interface LegacyAnnualReadingScope {
  referenceInstant?: string;
  sourceBinding: Binding; family: LegacyAnnualChoiceFamily; year: number;
  branchId: string | null; segmentId: string | null; startInstant: string | null; endExclusiveInstant: string | null;
  personalStartInstant: string | null; targetRef: TransitNodeRef | null; backgroundRefs: TransitNodeRef[];
  contextRef: ReadingContextReference | null; domainId: string | null; itemIds: string[];
  monthId: string | null; decadeId: string | null; stageRef: TransitNodeRef | null;
  segments: LegacyAnnualSegmentScope[];
}
export interface LegacyAnnualReadingChoice extends ReadingFeedbackChoice { legacyScope: LegacyAnnualReadingScope }
export interface AnnualReadingChoicePair { legacyChoice: ReadingFeedbackChoice; currentChoice: ReadingFeedbackChoice; scope: LegacyAnnualReadingScope }
export interface AnnualReadingChoicePairs {
  profileVersion: typeof LEGACY_ANNUAL_READING_PROFILE_VERSION; sourceBinding: Binding;
  pairs: AnnualReadingChoicePair[]; unpaired: { legacyChoice: ReadingFeedbackChoice; reason: string }[];
}
export interface LegacyAnnualReadingChoices {
  profileVersion: typeof LEGACY_ANNUAL_READING_PROFILE_VERSION; sourceBinding: Binding; choices: LegacyAnnualReadingChoice[];
}
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (reason: string): never => { throw new Error(`旧版年度重放来源：${reason}`); };
const bindingFor = (input: Pick<LegacyAnnualReadingInput, "revision" | "assessment">): Binding => ({ caseId: input.revision.caseId,
  revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash, includeHour: input.assessment.sourceBinding.includeHour });

// Shared implementations are permitted only under the exact frozen producer contract.
// Frozen local modules retain their own old versions. No current output is relabelled.
function assertDependencies(input: Pick<LegacyAnnualReadingInput, "revision" | "assessment">): void {
  const expected: [string, string][] = [
    [input.assessment.version, "hakimi.bazi.preliminary-assessment/0.7.0"],
    [frozenAnnual.LOCAL_ANNUAL_OUTLOOK_VERSION, "hakimi.local-annual-outlook/0.8.0"],
    [ANNUAL_DOMAIN_READING_VERSION, "hakimi.local-annual-domain-reading/0.1.0"],
    [frozenDetailed.LOCAL_DETAILED_OUTLOOK_VERSION, "hakimi.local-detailed-outlook/0.5.0"],
    [frozenLifeStory.LIFE_STAGE_STORY_VERSION, "hakimi.local-life-stage-story/0.1.0"],
    [frozenMonth.MONTHLY_DOMAIN_READING_VERSION, "hakimi.local-monthly-domain-reading/0.3.0"],
    [frozenMonthProse.MONTHLY_DOMAIN_PROSE_VERSION, "hakimi.monthly-domain-prose/0.3.0"],
    [frozenJudgment.LOCAL_OUTLOOK_JUDGMENT_VERSION, "hakimi.local-outlook-judgment/0.9.0"],
    [frozenJudgment.OUTLOOK_STEM_ACTIONS_VERSION, "hakimi.outlook-stem-actions/0.1.0"],
    [CONTEXTUAL_READING_VERSION, "hakimi.local-contextual-reading/0.2.0"],
    [READING_CONTEXT_FORMAT, "hakimi.local-reading-context/1"],
    [ADULT_LIFE_SITUATIONS_VERSION, "hakimi.adult-life-situations/0.2.0"],
    [ANNUAL_RELATIONSHIP_SIGNALS_VERSION, "hakimi.annual-relationship-signals/0.1.0"],
    [ANNUAL_RELATIONSHIP_TIMING_VERSION, "hakimi.annual-relationship-timing/0.1.0"],
    [ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, "hakimi.annual-relationship-natal-context/0.1.0"],
    [NATAL_WEALTH_RESOURCE_TASK_VERSION, "hakimi.natal-wealth-resource-task/0.1.0"],
    [NATAL_PATTERN_PATH_VERSION, "hakimi.natal-pattern-path/0.3.0"],
    [STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, "hakimi.structural-strength-assessment/0.4.0"],
    [OUTLOOK_CLASSICAL_SOURCES_VERSION, "hakimi.outlook-classical-sources/0.4.0"],
  ];
  for (const [actual, version] of expected) if (actual !== version) fail(`共享依赖版本已变化：${version}。`);
  if (!same(buildBaziPreliminaryAssessment(input.revision), input.assessment)) fail("初判不是同修订的完整原输出。");
}
const acceptedVersions = new Set([
  "hakimi.local-reading-timeline/0.3.0", "hakimi.annual-event-scenarios/0.4.0",
  "hakimi.local-annual-event-reading/0.6.0", "hakimi.annual-event-reading-prose/0.10.0", "hakimi.annual-event-signals/0.3.0", "hakimi.local-life-stage-years/0.3.0",
  "hakimi.adult-life-situations/0.2.0", "hakimi.annual-event-reading-prose/0.9.0", "hakimi.annual-event-signals/0.2.0",
  "hakimi.annual-life-story/0.4.0", "hakimi.annual-month-context/0.1.0", "hakimi.annual-relationship-natal-context/0.1.0",
  "hakimi.annual-relationship-signals/0.1.0", "hakimi.annual-relationship-timing-sources/0.1.0", "hakimi.annual-relationship-timing/0.1.0",
  "hakimi.bazi.preliminary-assessment/0.7.0", "hakimi.local-annual-domain-reading/0.1.0", "hakimi.local-annual-event-composition/0.2.0",
  "hakimi.local-annual-event-reading/0.5.0", "hakimi.local-annual-month-story/0.4.0", "hakimi.local-annual-outlook/0.8.0",
  "hakimi.local-detailed-content/0.2.0", "hakimi.local-detailed-outlook/0.5.0", "hakimi.local-life-stage-story/0.1.0",
  "hakimi.local-life-stage-years/0.2.0", "hakimi.local-monthly-domain-reading/0.3.0", "hakimi.local-outlook-judgment/0.9.0",
  "hakimi.local-reading-annual-events/0.1.0", "hakimi.monthly-domain-prose/0.3.0", "hakimi.natal-relationship-foundation/0.2.0",
  "hakimi.natal-relationship-sources/0.2.0", "hakimi.natal-wealth-resource-task/0.1.0", "hakimi.outlook-model/0.7.0",
  "hakimi.outlook-stem-actions/0.1.0", "hakimi.reading-year-summary/0.1.0", "hakimi.local-contextual-reading/0.2.0",
  "hakimi.local-reading-context/1"
]);
function assertLegacyVersions(versions: readonly string[], contextual?: LocalContextualReadingBundle | null): void {
  const ref = contextual?.contextSource.reference;
  const contextVersion = ref ? `context-record/${ref.noteId}/${ref.editVersion}/${ref.bodySha256}` : null;
  for (const version of versions) if (!acceptedVersions.has(version) && version !== contextVersion) fail(`旧来源含不支持的版本：${version}。`);
}
function accepts(family: LegacyAnnualChoiceFamily, filter?: LegacyAnnualReadingFilter): boolean { return !filter?.families || filter.families.includes(family); }
function selected(entry: LegacyAnnualReadingChoice, filter?: LegacyAnnualReadingFilter): boolean {
  return accepts(entry.legacyScope.family, filter) && (!filter?.subjectIds || filter.subjectIds.includes(entry.id));
}
function scopeFor(input: LegacyAnnualYearReadingInput, family: LegacyAnnualChoiceFamily,
  value: Partial<Omit<LegacyAnnualReadingScope, "sourceBinding" | "family" | "year">> = {}): LegacyAnnualReadingScope {
  return { sourceBinding: bindingFor(input), family, year: input.year.year,
    branchId: null, segmentId: null, startInstant: input.year.startInstant, endExclusiveInstant: input.year.endExclusiveInstant,
    personalStartInstant: null, targetRef: input.year.transitNodeRef, backgroundRefs: [], contextRef: null,
    domainId: null, itemIds: [], monthId: null, decadeId: null, stageRef: null, segments: [], ...value };
}
function segmentScope(segment: Pick<oldEvents.AnnualEventSegment, "id" | "branchId" | "startInstant" | "endExclusiveInstant" | "personalStartInstant" | "backgroundRefs">) {
  return { branchId: segment.branchId, segmentId: segment.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
    personalStartInstant: segment.personalStartInstant, backgroundRefs: segment.backgroundRefs };
}
function entry(choice: ReadingFeedbackChoice, scope: LegacyAnnualReadingScope): LegacyAnnualReadingChoice {
  return { ...choice, legacyScope: structuredClone(scope) };
}
type EventYear = Omit<oldEvents.LocalAnnualEventReading, "version"> & { version: string };
type MonthInput<E> = LegacyAnnualYearReadingInput & { events: E; monthly: LocalMonthlyOutlook; monthlyDomains: LocalMonthlyDomainReadings };
type StageInput<E> = LegacyAnnualReadingInput & { annual: LocalAnnualOutlook; annualDomains: LocalReadingAnnualDomains;
  life: LocalLifeOutlook; lifeStageStory: LocalLifeStageStory; selectedDecadeId: string; events: E[] };
interface Adapter<E extends EventYear> {
  frozen: boolean;
  buildEvents(input: LegacyAnnualYearReadingInput): E;
  eventText(reading: E, branch: oldEvents.AnnualEventBranch, segment: oldEvents.AnnualEventSegment, item: oldEvents.AnnualEventItem): string;
  story(input: LegacyAnnualYearReadingInput & { events: E }): oldStory.AnnualLifeStory;
  storyText: typeof oldStoryRecord.annualLifeStoryFeedbackText;
  storySubject: typeof oldStoryRecord.annualLifeStorySubjectId;
  storyVersions: typeof oldStoryRecord.annualLifeStoryFeedbackVersions;
  compositions(input: LegacyAnnualYearReadingInput, reading: E): LegacyAnnualReadingChoice[];
  month(input: MonthInput<E>): oldMonth.LocalAnnualMonthStory;
  monthVersions(story: oldMonth.LocalAnnualMonthStory): string[];
  stage(input: StageInput<E>): LegacyAnnualReadingChoice[];
}

// Resolve record exports at invocation time: independent record consumers can
// import this profile through their adoption guards during module initialization.
function makeAdapter<E extends EventYear>(adapter: Adapter<E>): Adapter<E> { return adapter; }
const oldAdapter = makeAdapter<oldEvents.LocalAnnualEventReading>({
  frozen: true,
  buildEvents: (input) => oldEvents.buildAnnualEventReading(input),
  eventText: (reading, branch, segment, item) => oldEventRecord.annualEventFeedbackText(reading, branch, segment, item),
  story: (input) => oldStory.buildAnnualLifeStory(input),
  storyText: (story, segment) => oldStoryRecord.annualLifeStoryFeedbackText(story, segment),
  storySubject: (story, segment) => oldStoryRecord.annualLifeStorySubjectId(story, segment),
  storyVersions: (story, segment) => oldStoryRecord.annualLifeStoryFeedbackVersions(story, segment),
  compositions: (input, reading) => {
    const result: LegacyAnnualReadingChoice[] = [];
    for (const branch of oldComposition.composeAnnualEvents(reading).branches) for (const segment of branch.segments) {
      const originalBranch = reading.branches.find((item) => item.id === branch.id) ?? fail("合并事项缺少原分支。");
      const original = originalBranch.segments.find((item) => item.id === segment.id) ?? fail("合并事项缺少原分段。");
      for (const group of segment.items) if (group.kind === "settlement") result.push(entry({
        id: oldComposition.annualEventCompositionSubjectId(reading.year, original, group), label: group.title,
        originalConclusion: oldCompositionRecord.annualEventCompositionFeedbackText(reading, originalBranch, original, group),
        sourceVersions: [oldComposition.ANNUAL_EVENT_COMPOSITION_VERSION, oldEventRecord.READING_ANNUAL_EVENTS_VERSION, ...reading.sourceVersions]
      }, scopeFor(input, "composition", { ...segmentScope(original), contextRef: reading.contextRef,
        itemIds: group.members.map((item) => item.id) })));
    }
    return result;
  },
  month: (input) => oldMonth.buildAnnualMonthStory({ ...input, annualDomains: input.domains, annualEvents: input.events }),
  monthVersions: (story) => oldMonthRecord.annualMonthStoryFeedbackVersions(story),
  stage: (input) => {
    const annualEvents = { version: oldEventRecord.READING_ANNUAL_EVENTS_VERSION, sourceBinding: bindingFor(input),
      startYear: input.annual.startYear, endYear: input.annual.endYear, years: input.events };
    const bridge = oldStage.buildLifeStageYears({ ...input, annualEvents });
    assertLegacyVersions([bridge.version, ...bridge.sourceVersions, ...bridge.years.flatMap((year) => year.sourceVersions)], input.contextual);
    return bridge.years.map((year) => {
      const originalYear = input.annual.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少真实年来源。");
      const domains = input.annualDomains.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少同年领域。");
      return entry({ id: oldStageRecord.lifeStageYearSubjectId(bridge, year), label: year.headline,
        originalConclusion: oldStageRecord.lifeStageYearFeedbackText(bridge, year),
        sourceVersions: oldStageRecord.lifeStageYearFeedbackVersions(bridge, year) }, scopeFor({ ...input, year: originalYear, domains }, "stage-year", {
        branchId: bridge.branchId, startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
        decadeId: bridge.stage.decadeId, stageRef: bridge.stage.nodeRef, targetRef: year.yearNodeRef, contextRef: year.contextRef,
        segments: year.segments.map((segment) => ({ ...segmentScope(segment), targetRef: year.yearNodeRef })),
        itemIds: year.segments.flatMap((segment) => segment.items.map((item) => item.id))
      }));
    });
  }
});
const priorAdapter = makeAdapter<priorEvents.LocalAnnualEventReading>({
  frozen: true,
  buildEvents: (input) => priorEvents.buildAnnualEventReading(input),
  eventText: (reading, branch, segment, item) => priorEventRecord.annualEventFeedbackText(reading, branch, segment, item),
  story: (input) => priorStory.buildAnnualLifeStory(input),
  storyText: (story, segment) => priorStoryRecord.annualLifeStoryFeedbackText(story, segment),
  storySubject: (story, segment) => priorStoryRecord.annualLifeStorySubjectId(story, segment),
  storyVersions: (story, segment) => priorStoryRecord.annualLifeStoryFeedbackVersions(story, segment),
  compositions: (input, reading) => {
    const result: LegacyAnnualReadingChoice[] = [];
    for (const branch of priorComposition.composeAnnualEvents(reading).branches) for (const segment of branch.segments) {
      const originalBranch = reading.branches.find((item) => item.id === branch.id) ?? fail("合并事项缺少原分支。");
      const original = originalBranch.segments.find((item) => item.id === segment.id) ?? fail("合并事项缺少原分段。");
      for (const group of segment.items) if (group.kind === "settlement") result.push(entry({
        id: priorComposition.annualEventCompositionSubjectId(reading.year, original, group), label: group.title,
        originalConclusion: priorCompositionRecord.annualEventCompositionFeedbackText(reading, originalBranch, original, group),
        sourceVersions: [priorComposition.ANNUAL_EVENT_COMPOSITION_VERSION, priorEventRecord.READING_ANNUAL_EVENTS_VERSION, ...reading.sourceVersions]
      }, scopeFor(input, "composition", { ...segmentScope(original), contextRef: reading.contextRef,
        itemIds: group.members.map((item) => item.id) })));
    }
    return result;
  },
  month: (input) => priorMonth.buildAnnualMonthStory({ ...input, annualDomains: input.domains, annualEvents: input.events }),
  monthVersions: (story) => priorMonthRecord.annualMonthStoryFeedbackVersions(story),
  stage: (input) => {
    const annualEvents = { version: priorEventRecord.READING_ANNUAL_EVENTS_VERSION, sourceBinding: bindingFor(input),
      startYear: input.annual.startYear, endYear: input.annual.endYear, years: input.events };
    const bridge = priorStage.buildLifeStageYears({ ...input, annualEvents });
    assertLegacyVersions([bridge.version, ...bridge.sourceVersions, ...bridge.years.flatMap((year) => year.sourceVersions)], input.contextual);
    return bridge.years.map((year) => {
      const originalYear = input.annual.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少真实年来源。");
      const domains = input.annualDomains.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少同年领域。");
      return entry({ id: priorStageRecord.lifeStageYearSubjectId(bridge, year), label: year.headline,
        originalConclusion: priorStageRecord.lifeStageYearFeedbackText(bridge, year),
        sourceVersions: priorStageRecord.lifeStageYearFeedbackVersions(bridge, year) }, scopeFor({ ...input, year: originalYear, domains }, "stage-year", {
        branchId: bridge.branchId, startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
        decadeId: bridge.stage.decadeId, stageRef: bridge.stage.nodeRef, targetRef: year.yearNodeRef, contextRef: year.contextRef,
        segments: year.segments.map((segment) => ({ ...segmentScope(segment), targetRef: year.yearNodeRef })),
        itemIds: year.segments.flatMap((segment) => segment.items.map((item) => item.id))
      }));
    });
  }
});
const currentAdapter = makeAdapter<currentEvents.LocalAnnualEventReading>({
  frozen: false,
  buildEvents: (input) => currentEvents.buildAnnualEventReading(input),
  eventText: (reading, branch, segment, item) => currentEventRecord.annualEventFeedbackText(reading, branch, segment, item),
  story: (input) => currentStory.buildAnnualLifeStory(input),
  storyText: (story, segment) => currentStoryRecord.annualLifeStoryFeedbackText(story, segment),
  storySubject: (story, segment) => currentStoryRecord.annualLifeStorySubjectId(story, segment),
  storyVersions: (story, segment) => currentStoryRecord.annualLifeStoryFeedbackVersions(story, segment),
  compositions: (input, reading) => {
    const result: LegacyAnnualReadingChoice[] = [];
    for (const branch of currentComposition.composeAnnualEvents(reading).branches) for (const segment of branch.segments) {
      const originalBranch = reading.branches.find((item) => item.id === branch.id) ?? fail("合并事项缺少原分支。");
      const original = originalBranch.segments.find((item) => item.id === segment.id) ?? fail("合并事项缺少原分段。");
      for (const group of segment.items) if (group.kind === "settlement") result.push(entry({
        id: currentComposition.annualEventCompositionSubjectId(reading.year, original, group), label: group.title,
        originalConclusion: currentCompositionRecord.annualEventCompositionFeedbackText(reading, originalBranch, original, group),
        sourceVersions: [currentComposition.ANNUAL_EVENT_COMPOSITION_VERSION, currentEventRecord.READING_ANNUAL_EVENTS_VERSION, ...reading.sourceVersions]
      }, scopeFor(input, "composition", { ...segmentScope(original), contextRef: reading.contextRef,
        itemIds: group.members.map((item) => item.id) })));
    }
    return result;
  },
  month: (input) => currentMonth.buildAnnualMonthStory({ ...input, annualDomains: input.domains, annualEvents: input.events }),
  monthVersions: (story) => currentMonthRecord.annualMonthStoryFeedbackVersions(story),
  stage: (input) => {
    const annualEvents = { version: currentEventRecord.READING_ANNUAL_EVENTS_VERSION, sourceBinding: bindingFor(input),
      startYear: input.annual.startYear, endYear: input.annual.endYear, years: input.events };
    const bridge = currentStage.buildLifeStageYears({ ...input, annualEvents });
    return bridge.years.map((year) => {
      const originalYear = input.annual.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少真实年来源。");
      const domains = input.annualDomains.years.find((item) => item.year === year.year) ?? fail("阶段年度缺少同年领域。");
      return entry({ id: currentStageRecord.lifeStageYearSubjectId(bridge, year), label: year.headline,
        originalConclusion: currentStageRecord.lifeStageYearFeedbackText(bridge, year),
        sourceVersions: currentStageRecord.lifeStageYearFeedbackVersions(bridge, year) }, scopeFor({ ...input, year: originalYear, domains }, "stage-year", {
        branchId: bridge.branchId, startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
        decadeId: bridge.stage.decadeId, stageRef: bridge.stage.nodeRef, targetRef: year.yearNodeRef, contextRef: year.contextRef,
        segments: year.segments.map((segment) => ({ ...segmentScope(segment), targetRef: year.yearNodeRef })),
        itemIds: year.segments.flatMap((segment) => segment.items.map((item) => item.id))
      }));
    });
  }
});

function enumerateYear<E extends EventYear>(input: LegacyAnnualYearReadingInput, adapter: Adapter<E>, filter?: LegacyAnnualReadingFilter) {
  const reading = adapter.buildEvents(input);
  if (adapter.frozen) assertLegacyVersions([reading.version, ...reading.sourceVersions], input.contextual);
  if (!same(reading.sourceBinding, bindingFor(input)) || reading.year !== input.year.year
    || !same(reading.yearNodeRef, input.year.transitNodeRef)) fail("年度重放身份不一致。");
  const result: LegacyAnnualReadingChoice[] = [];
  if (accepts("event", filter)) for (const branch of reading.branches) for (const segment of branch.segments) for (const item of segment.items) {
    result.push(entry({ id: oldEventRecord.annualEventFeedbackSubjectId(reading.year, segment, item), label: item.title,
      originalConclusion: adapter.eventText(reading, branch, segment, item),
      sourceVersions: [oldEventRecord.READING_ANNUAL_EVENTS_VERSION, ...reading.sourceVersions] },
      scopeFor(input, "event", { ...segmentScope(segment), contextRef: reading.contextRef, domainId: item.origin.sourceDomainId, itemIds: [item.id] })));
  }
  if (accepts("story", filter)) {
    const story = adapter.story({ ...input, events: reading });
    if (adapter.frozen) assertLegacyVersions([story.version, ...story.sourceVersions, ...story.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.sourceVersions))], input.contextual);
    for (const branch of story.branches) for (const segment of branch.segments) result.push(entry({
      id: adapter.storySubject(story, segment), label: segment.headline,
      originalConclusion: adapter.storyText(story, segment), sourceVersions: adapter.storyVersions(story, segment)
    }, scopeFor(input, "story", { ...segmentScope(segment), contextRef: story.contextRef,
      itemIds: reading.branches.find((item) => item.id === branch.id)?.segments.find((item) => item.id === segment.id)?.items.map((item) => item.id) ?? [] })));
  }
  if (accepts("composition", filter)) result.push(...adapter.compositions(input, reading));
  if (accepts("domain", filter)) for (const branch of input.domains.branches) for (const segment of branch.segments) for (const domain of segment.domains) {
    result.push(entry({ id: `annual-domain-${input.year.year}-${segment.id}-${domain.id}`, label: domain.title,
      originalConclusion: annualDomainFeedbackText(input.domains, branch, segment, domain),
      sourceVersions: [input.domains.version, ...input.domains.sourceVersions] }, scopeFor(input, "domain", { ...segmentScope(segment), domainId: domain.id })));
  }
  if (accepts("contextual", filter) && input.contextual) for (const item of input.contextual.readings) {
    const scope = item.scope;
    if (scope.kind !== "annual" || scope.year !== input.year.year) continue;
    const segment = reading.branches.find((branch) => branch.id === scope.branchId)?.segments.find((part) => part.id === scope.segmentId);
    if (!segment || segment.startInstant !== scope.startInstant || segment.endExclusiveInstant !== scope.endExclusiveInstant) return fail("背景来源不属于本年实际分段。");
    result.push(entry({ id: item.subjectId, label: item.title, originalConclusion: contextualFeedbackText(item, input.contextual),
      sourceVersions: contextualFeedbackVersions(item, input.contextual) }, scopeFor(input, "contextual", { ...segmentScope(segment),
      contextRef: reading.contextRef, domainId: scope.domainId })));
  }
  if (accepts("annual", filter)) result.push(entry({ id: `annual-${input.year.year}`, label: `${input.year.year}年 · ${input.year.label}`,
    originalConclusion: `${input.year.year}年 · ${input.year.label}\n${outlookJudgmentFeedbackText(input.year.judgment) || input.year.summary}\n本年自身倾向：${input.year.yearInfluence.summary}\n大运背景：${input.year.decadeInfluence.summary}\n年度规则：${adapter.frozen ? frozenAnnual.LOCAL_ANNUAL_OUTLOOK_VERSION : LOCAL_ANNUAL_OUTLOOK_VERSION}`,
    sourceVersions: [adapter.frozen ? frozenAnnual.LOCAL_ANNUAL_OUTLOOK_VERSION : LOCAL_ANNUAL_OUTLOOK_VERSION] }, scopeFor(input, "annual", {
      segments: reading.branches.flatMap((branch) => branch.segments.map((segment) => ({ ...segmentScope(segment), targetRef: reading.yearNodeRef })))
    })));
  if (accepts("annual-month", filter) && input.monthly && input.monthlyDomains && input.monthly.year === input.year.year) {
    const monthStory = adapter.month({ ...input, events: reading, monthly: input.monthly, monthlyDomains: input.monthlyDomains });
    if (adapter.frozen) assertLegacyVersions([monthStory.version, ...monthStory.sourceVersions], input.contextual);
    const refFor = (key: string) => monthStory.nodes.find((node) => node.key === key)?.ref ?? fail("月份引用缺少完整节点。");
    for (const { month, branch, period, domain } of oldMonthRecord.annualMonthStoryEntries(monthStory)) {
      const source = domain.links.monthlyDomain;
      result.push(entry({ id: oldMonthRecord.annualMonthStorySubjectId(monthStory, month, period, domain), label: domain.title,
        originalConclusion: oldMonthRecord.annualMonthStoryFeedbackText(monthStory, month, branch, period, domain),
        sourceVersions: adapter.monthVersions(monthStory) }, scopeFor(input, "annual-month", {
          branchId: branch.id, segmentId: period.id, startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant,
          personalStartInstant: period.personalStartInstant, targetRef: refFor(source.targetNodeKey), backgroundRefs: source.backgroundNodeKeys.map(refFor),
          contextRef: monthStory.contextRef, domainId: domain.id, monthId: month.monthId,
          itemIds: domain.links.annualEvents.map((item) => item.itemId),
          segments: domain.links.annualEvents.map((item) => {
            const original = reading.branches.find((part) => part.id === item.branchId)?.segments.find((part) => part.id === item.segmentId)
              ?? fail("月份关联年度缺少实际原段。");
            return { ...segmentScope(original), targetRef: refFor(item.targetNodeKey), backgroundRefs: item.backgroundNodeKeys.map(refFor) };
          })
        })));
    }
  }
  return { reading, entries: result.filter((item) => selected(item, filter)) };
}
function validateWindow(input: LegacyAnnualReadingInput, frozen = false): void {
  if (!input.annual || !input.annualDomains) return;
  const { annual, annualDomains } = input;
  if (annual.version !== (frozen ? frozenAnnual.LOCAL_ANNUAL_OUTLOOK_VERSION : LOCAL_ANNUAL_OUTLOOK_VERSION) || annualDomains.version !== ANNUAL_DOMAIN_READING_VERSION
    || annual.revisionId !== input.revision.id || annual.chartResultHash !== input.revision.manifest.resultHash
    || annualDomains.revisionId !== input.revision.id || annualDomains.chartResultHash !== input.revision.manifest.resultHash
    || annualDomains.includeHour !== input.assessment.sourceBinding.includeHour || annualDomains.startYear !== annual.startYear
    || annualDomains.endYear !== annual.endYear || annualDomains.years.length !== annual.years.length
    || new Set(annual.years.map((year) => year.year)).size !== annual.years.length
    || new Set(annualDomains.years.map((year) => year.year)).size !== annual.years.length) fail("原年度窗口或领域集合不一致。");
}
function enumerate<E extends EventYear>(input: LegacyAnnualReadingInput, adapter: Adapter<E>, filter?: LegacyAnnualReadingFilter): LegacyAnnualReadingChoice[] {
  validateWindow(input, adapter.frozen);
  if (!input.annual || !input.annualDomains) return outlookChoices(input, adapter.frozen, filter).filter(item => selected(item, filter));
  const entries: LegacyAnnualReadingChoice[] = [], events: E[] = [];
  for (const year of input.annual.years) {
    const domains = input.annualDomains.years.find((item) => item.year === year.year) ?? fail("年度领域缺失。");
    const result = enumerateYear({ ...input, year, domains }, adapter, filter);
    entries.push(...result.entries); events.push(result.reading);
  }
  if (accepts("stage-year", filter) && input.life && input.lifeStageStory && input.selectedDecadeId) entries.push(...adapter.stage({ ...input,
    annual: input.annual, annualDomains: input.annualDomains, life: input.life, lifeStageStory: input.lifeStageStory,
    selectedDecadeId: input.selectedDecadeId, events }).filter((item) => selected(item, filter)));
  entries.push(...outlookChoices(input, adapter.frozen, filter).filter((item) => selected(item, filter)));
  return entries;
}
function uniqueEntries(entries: LegacyAnnualReadingChoice[]): LegacyAnnualReadingChoice[] {
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) fail("同一来源有重复反馈身份。");
  return entries;
}
function pairChoices(input: Pick<LegacyAnnualReadingInput, "revision" | "assessment" | "contextual">,
  old: LegacyAnnualReadingChoice[], current: LegacyAnnualReadingChoice[]): AnnualReadingChoicePairs {
  uniqueEntries(old); uniqueEntries(current);
  const pairs: AnnualReadingChoicePair[] = [], unpaired: AnnualReadingChoicePairs["unpaired"] = [];
  for (const previous of old) {
    assertLegacyVersions(previous.sourceVersions ?? [], input.contextual);
    const next = current.find((item) => item.id === previous.id);
    const { legacyScope: scope, ...legacyChoice } = previous;
    if (!next || !same(scope, next.legacyScope)) { unpaired.push({ legacyChoice, reason: next ? "原分支、区间、节点、领域或背景已经变化。" : "当前没有同一反馈主题。" }); continue; }
    const { legacyScope: _currentScope, ...currentChoice } = next;
    pairs.push({ legacyChoice, currentChoice, scope: structuredClone(scope) });
  }
  return { profileVersion: LEGACY_ANNUAL_READING_PROFILE_VERSION, sourceBinding: bindingFor(input), pairs, unpaired };
}

/** Prepares authentic old calendar-derived readings once, only for callers
 * that have historical feedback to verify. No caller-supplied old objects. */
export async function prepareLegacyAnnualReading(input: LegacyAnnualReadingInput): Promise<void> {
  assertDependencies(input);
  await prepareLegacyOutlook(input);
}
function epochs(filter?: LegacyAnnualReadingFilter) {
  return filter?.epochs ?? ["event-0.5", "event-0.6"];
}
const enumerateOld = (input: LegacyAnnualReadingInput, epoch: string, filter?: LegacyAnnualReadingFilter) =>
  epoch === "event-0.5" ? enumerate(input, oldAdapter, filter) : enumerate(input, priorAdapter, filter);
const enumerateOldYear = (input: LegacyAnnualYearReadingInput, epoch: string, filter?: LegacyAnnualReadingFilter) =>
  epoch === "event-0.5" ? enumerateYear(input, oldAdapter, filter).entries : enumerateYear(input, priorAdapter, filter).entries;
function distinctOld(entries: LegacyAnnualReadingChoice[]): LegacyAnnualReadingChoice[] {
  const seen = new Set<string>();
  return entries.filter((entry) => { const key = stable(entry); if (seen.has(key)) return false; seen.add(key); return true; });
}
export function buildLegacyAnnualReadingChoices(input: LegacyAnnualReadingInput, filter?: LegacyAnnualReadingFilter): LegacyAnnualReadingChoices {
  assertDependencies(input);
  const old = preparedLegacyOutlook(input);
  const choices = distinctOld(epochs(filter).flatMap((epoch) => enumerateOld(old, epoch, filter)));
  for (const choice of choices) assertLegacyVersions(choice.sourceVersions ?? [], old.contextual);
  return { profileVersion: LEGACY_ANNUAL_READING_PROFILE_VERSION, sourceBinding: bindingFor(input), choices };
}
export function buildAnnualReadingChoicePairs(input: LegacyAnnualReadingInput, filter?: LegacyAnnualReadingFilter): AnnualReadingChoicePairs {
  assertDependencies(input);
  const old = preparedLegacyOutlook(input), current = enumerate(input, currentAdapter, filter);
  const results = epochs(filter).map((epoch) => pairChoices(old, enumerateOld(old, epoch, filter), current));
  return { profileVersion: LEGACY_ANNUAL_READING_PROFILE_VERSION, sourceBinding: bindingFor(input),
    pairs: [...new Map(results.flatMap((result) => result.pairs).map((pair) => [stable(pair), pair])).values()],
    unpaired: [...new Map(results.flatMap((result) => result.unpaired).map((item) => [stable(item), item])).values()] };
}
export function buildAnnualYearChoicePairs(input: LegacyAnnualYearReadingInput, filter?: LegacyAnnualReadingFilter): AnnualReadingChoicePairs {
  assertDependencies(input);
  const old = preparedLegacyYear(input), current = enumerateYear(input, currentAdapter, filter).entries;
  const results = epochs(filter).map((epoch) => pairChoices(old, enumerateOldYear(old, epoch, filter), current));
  return { profileVersion: LEGACY_ANNUAL_READING_PROFILE_VERSION, sourceBinding: bindingFor(input),
    pairs: [...new Map(results.flatMap((result) => result.pairs).map((pair) => [stable(pair), pair])).values()],
    unpaired: [...new Map(results.flatMap((result) => result.unpaired).map((item) => [stable(item), item])).values()] };
}
