import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLink } from "../lib/router";
import { createReadingSourceCache } from "../lib/local-reading-source-cache";
import { CONTEXTUAL_READING_VERSION } from "../lib/local-contextual-reading";
import { ANNUAL_EVENT_READING_VERSION } from "../lib/local-annual-event-reading";
import { ANNUAL_EVENT_SIGNALS_VERSION } from "../lib/annual-event-signals";
import type { ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { researchNoteRecordSchema } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { webReportExportPort } from "@hakimi/platform";
import { researchRepository } from "@hakimi/storage";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { resolveLifeStageAnnualRange, type LifeStageAnnualRange } from "../lib/local-annual-range";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook, type LocalLifeOutlook, type LocalMonthlyOutlook } from "../lib/local-detailed-outlook";
import { buildLifeStageYears, LIFE_STAGE_YEARS_VERSION, type LocalLifeStageYears } from "../lib/local-life-stage-years";
import { lifeStageYearSubjectId, lifeStageYearFeedbackText, lifeStageYearFeedbackVersions, lifeStageYearPersonalSources } from "../lib/local-life-stage-years-record";
import { ANNUAL_LIFE_STORY_VERSION, buildReadingAnnualLifeStories, type LocalReadingAnnualLifeStories } from "../lib/annual-life-story";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions, annualLifeStoryPersonalSources } from "../lib/annual-life-story-record";
import { buildLifeStageStory, type LocalLifeStageStory } from "../lib/local-life-stage-story";
import { lifeStageStoryEntries, lifeStageStorySubjectId, lifeStageStoryFeedbackText, lifeStageStoryTransitionSubjectId,
  lifeStageStoryTransitionText, lifeStageStoryFeedbackVersions } from "../lib/local-life-stage-story-record";
import { ANNUAL_EVENT_SCENARIOS_VERSION, buildAnnualEventScenarios } from "../lib/annual-event-scenarios";
import { outlookJudgmentFeedbackText } from "../lib/local-outlook-judgment-record";
import { READING_YEAR_SUMMARY_VERSION, summarizeAnnualJudgmentCaptions } from "../lib/outlook-judgment-presentation";
import { buildReadingTimeline, type LocalReadingTimeline } from "../lib/local-reading-timeline";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "../lib/local-reading-timeline-record";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { annualDomainFeedbackText, type LocalReadingAnnualDomains } from "../lib/local-annual-domain-record";
import { buildLocalPersonalReading, type LocalPersonalReading, type LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { legacyAnnualInputFromExtras } from "../lib/local-personal-reading-legacy";
import { buildReadingContextRecord, resolveReadingContext, parseReadingContext, LOCAL_READING_CONTEXT_TAG, type ReadingContextDraft, type ResolvedReadingContext } from "../lib/local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions, type LocalContextualReadingBundle } from "../lib/local-contextual-reading-record";
import { buildReadingSynthesis, type LocalReadingSynthesis } from "../lib/local-reading-synthesis";
import { buildReadingPriorities, type LocalReadingPriorities } from "../lib/local-reading-priorities";
import { buildMonthlyDomainReadings, MONTHLY_DOMAIN_READING_VERSION, type LocalMonthlyDomainReadings } from "../lib/local-monthly-domain-reading";
import { monthlyDomainFeedbackText } from "../lib/local-monthly-domain-record";
import { MONTHLY_DOMAIN_PROSE_VERSION } from "../lib/monthly-domain-prose";
import { ADULT_LIFE_SITUATIONS_VERSION } from "../lib/adult-life-situations";
import { ANNUAL_EVENT_READING_PROSE_VERSION } from "../lib/annual-event-reading-prose";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId, annualEventFeedbackText, type LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import { annualEventCompositionChoices } from "../lib/local-annual-event-composition-record";
import { buildAnnualMonthStory, LOCAL_ANNUAL_MONTH_STORY_VERSION, type LocalAnnualMonthStory } from "../lib/local-annual-month-story";
import { annualMonthStoryEntries, annualMonthStorySubjectId, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions } from "../lib/local-annual-month-story-record";
import { buildLocalReadingFeedback, LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_SNAPSHOT_TAG, type LocalReadingAnnualScenarios } from "../lib/local-reading-record";
import { buildLocalReadingReport, LOCAL_READING_EDITION_VERSION } from "../lib/local-reading-edition";
import { buildReadingExplanationIndex, type ReadingTimeUncertainty } from "../lib/reading-explanation-index";
import { ReadingExplanationWorkbench } from "./reading-explanation-workbench";
import { ReadingCaseReviewPanel } from "./reading-case-review-panel";
import { createReadingMonthPreparation } from "../lib/reading-month-preparation";
import { createReadingSaveTiming, publishReadingSaveTiming, type ReadingSaveOverlapWork, type ReadingSaveTiming, type ReadingSaveTimingSnapshot } from "../lib/reading-save-timing";
import { buildBriefReadingReport } from "../lib/brief-reading-report";
import { prepareKeyMonthYear, type PreparedKeyMonthYear, type KeyMonthEventSources } from "../lib/key-month-event-source";
import { KEY_MONTH_EVENT_TENDENCIES_VERSION } from "../lib/key-month-event-tendencies";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import { packReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { buildReadingFeedbackChoices, buildStructuredReadingFeedback, buildReadingFeedbackReview, feedbackNoteReference,
  parseReadingFeedback, readFeedbackThread, readingFeedbackSource, LOCAL_READING_REVIEW_TAG, type ReadingFeedbackReviewDraft } from "../lib/local-reading-feedback";
import { ChartReadingWorkbench, type ReadingFeedbackChoice } from "./chart-reading-workbench";
import { PreparedFileDeliveryDialog, type PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { DetailedOutlookPanel } from "./detailed-outlook-panel";
import { ReadingSectionNavigation } from "./reading-section-navigation";
import { ReadingSavedRecord } from "./reading-saved-record";
import { PersonalReadingProvider, PersonalReadingOverview } from "./personal-reading-note";
import { ContextualReadingProvider } from "./contextual-reading-provider";
import { ReadingContextPanel } from "./reading-context-panel";
import { acquireResearchJournalMutation, lockResearchJournalMutationUnknown, releaseResearchJournalMutation } from "./research-journal-mutation-coordinator";
import mountainsUrl from "../assets/reading-mountains-v1.png";
import "./local-reading-container.css";

interface Props {
  revision: RevisionRecord;
  caseName: string;
  readOnly: boolean;
  onEditBirthData: () => void;
  onOpenDetails: () => void;
  onOpenTransit: () => void;
  onOpenRecords: () => void;
}

function LocalReadingContent(props: Props) {
  const { revision } = props;
  const active = useRef(true);
  const saveDiagnosticsEnabled = import.meta.env.DEV && import.meta.env.VITE_READING_SAVE_DIAGNOSTICS === "1";
  const [saveTimingSnapshot, setSaveTimingSnapshot] = useState<ReadingSaveTimingSnapshot | null>(null);
  const saveTimingSequence = useRef(0);
  const saveTiming = useRef<{ timing: ReadingSaveTiming; record: ResearchNoteRecord | null } | null>(null);
  const observeSaveRender = useCallback(<T,>(work: ReadingSaveOverlapWork, task: () => T): T => {
    const pending = saveTiming.current;
    return pending ? pending.timing.measureOverlappingRender(work, task) : task();
  }, []);
  const finishSaveTiming = useCallback((status: "succeeded" | "failed" | "cancelled") => {
    const pending = saveTiming.current;
    if (!pending) return;
    pending.timing.finish(status);
    setSaveTimingSnapshot(pending.timing.snapshot());
    publishReadingSaveTiming(pending.timing);
    saveTiming.current = null;
  }, []);
  useEffect(() => () => { finishSaveTiming("cancelled"); }, [finishSaveTiming]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const assessmentResult = useMemo(() => {
    try { return { value: buildBaziPreliminaryAssessment(revision), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "当前命盘暂时无法生成本地解读。") }; }
  }, [revision]);
  const assessment = assessmentResult.value;
  const [records, setRecords] = useState<ResearchNoteRecord[]>([]);
  const [caseRecords, setCaseRecords] = useState<ResearchNoteRecord[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const comprehensiveResult = useMemo(() => {
    if (!assessment) return { value: null, error: null };
    try { return { value: buildBaziComprehensiveReading(revision, assessment), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "综合解读暂未生成，基础命局判断仍可阅读。") }; }
  }, [assessment, revision]);
  const comprehensive = comprehensiveResult.value;
  const [referenceInstant] = useState(() => new Date().toISOString());
  const currentYear = new Date(referenceInstant).getFullYear();
  const [queryYear, setQueryYear] = useState(currentYear);
  const [selectedDecadeId, setSelectedDecadeId] = useState("");
  const [annualWindow, setAnnualWindow] = useState<
    { kind: "rolling"; startYear: number; endYear: number; sequence: number }
    | { kind: "stage"; decadeId: string; sequence: number }
  >({ kind: "rolling", startYear: Math.min(currentYear, 2090), endYear: Math.min(currentYear, 2090) + 9, sequence: 0 });
  const [life, setLife] = useState<LocalLifeOutlook | null>(null);
  const [monthlyValue, setMonthly] = useState<LocalMonthlyOutlook | null>(null);
  const [lifeLoading, setLifeLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [lifeError, setLifeError] = useState<string | null>(null);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const lifeStageStoryResult = useMemo<{ value: LocalLifeStageStory | null; error: string | null }>(() => {
    if (!assessment || !life) return { value: null, error: null };
    try { return { value: buildLifeStageStory({ revision, assessment, life }), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "人生阶段主线暂未生成，请重新读取后保存完整解读。") }; }
  }, [revision, assessment, life]);
  const lifeStageStory = lifeStageStoryResult.value;
  const [exportArtifact, setExportArtifact] = useState<PreparedFileArtifact | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [annualValue, setAnnual] = useState<LocalAnnualOutlook | null>(null);
  const [annualPending, setAnnualLoading] = useState(true);
  const [resolvedAnnualKey, setResolvedAnnualKey] = useState("");
  const [rangeResult, setRangeResult] = useState<{ key: string; value: LifeStageAnnualRange } | null>(null);
  const requestedStage = annualWindow.kind === "stage" ? life?.decades.find((item) => item.id === annualWindow.decadeId) : null;
  const rangeLife = annualWindow.kind === "stage" ? life : null;
  const rangeLifeLoading = annualWindow.kind === "stage" && lifeLoading;
  const rangeLifeError = annualWindow.kind === "stage" ? lifeError : null;
  const annualRequestKey = JSON.stringify({ revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment?.sourceBinding.includeHour, window: annualWindow,
    stage: requestedStage ? { nodeRef: requestedStage.nodeRef, startInstant: requestedStage.startInstant, endExclusiveInstant: requestedStage.endExclusiveInstant } : null });
  const annual = resolvedAnnualKey === annualRequestKey ? annualValue : null;
  const annualLoading = annualPending || resolvedAnnualKey !== annualRequestKey;
  const stageAnnualRange = annualWindow.kind === "stage" && rangeResult?.key === annualRequestKey ? rangeResult.value : null;
  const annualStartYear = annualWindow.kind === "rolling" ? annualWindow.startYear : stageAnnualRange?.startYear ?? null;
  const annualEndYear = annualWindow.kind === "rolling" ? annualWindow.endYear : stageAnnualRange?.endYear ?? null;
  const monthly = monthlyValue?.year === queryYear && (annualWindow.kind === "rolling" || annual?.years.some((item) => item.year === queryYear)) ? monthlyValue : null;
  const [annualError, setAnnualError] = useState<string | null>(null);
  const annualScenariosResult = useMemo<{ value: LocalReadingAnnualScenarios | null; error: string | null }>(() => {
    if (!assessment || !annual) return { value: null, error: null };
    try {
      return { value: {
        version: ANNUAL_EVENT_SCENARIOS_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
        includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
        years: annual.years.map((year) => ({ year: year.year, transitNodeRef: year.transitNodeRef,
          scenarios: buildAnnualEventScenarios(revision, assessment, year) }))
      }, error: null };
    } catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "年度情境暂未生成，请重新打开后保存完整解读。") }; }
  }, [revision, assessment, annual]);
  const annualScenarios = annualScenariosResult.value;
  const selectedAnnual = annual?.years.find((year) => year.year === queryYear) ?? null;
  const timelineResult = useMemo<{ value: LocalReadingTimeline | null; error: string | null }>(() => {
    if (!annual?.years.length) return { value: null, error: null };
    try { return { value: buildReadingTimeline({ revision, annual, life }), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "阶段变化解读暂未生成，请重新打开后保存完整解读。") }; }
  }, [revision, annual, life]);
  const timeline = timelineResult.value;
  const annualDomainsResult = useMemo<{ value: LocalReadingAnnualDomains | null; error: string | null }>(() => {
    if (!assessment || !annual?.years.length) return { value: null, error: null };
    try {
      return { value: { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id,
        chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
        startYear: annual.startYear, endYear: annual.endYear,
        years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) }, error: null };
    } catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "年度分领域详读暂未生成，请重新打开后保存完整解读。") }; }
  }, [revision, assessment, annual]);
  const annualDomains = annualDomainsResult.value;
  const [contextResult, setContextResult] = useState<{ records: ResearchNoteRecord[]; value: ResolvedReadingContext | null; error: string | null } | null>(null);
  useEffect(() => {
    let current = true;
    if (recordsLoading || recordsError) return () => { current = false; };
    void resolveReadingContext({ revision, records }).then((value) => {
      if (current) setContextResult({ records, value, error: value.issues.length ? value.issues.join("；") : null });
    }).catch((reason) => { if (current) setContextResult({ records, value: null, error: safeVisibleErrorMessage(reason, "阅读背景暂未确认，通用解读仍可阅读。") }); });
    return () => { current = false; };
  }, [revision, records, recordsLoading, recordsError]);
  const currentContextResult = !recordsLoading && !recordsError && contextResult?.records === records ? contextResult : null;
  const contextLoading = !recordsError && !currentContextResult;
  const contextError = recordsError ?? currentContextResult?.error ?? null;
  const currentContext = currentContextResult?.value?.latest ?? null;
  const [contextualCache] = useState(() => createReadingSourceCache<LocalContextualReadingBundle | null>());
  const contextualResult = useMemo<{ value: LocalContextualReadingBundle | null; error: string | null }>(() => {
    if (!assessment || contextLoading || contextError) return { value: null, error: null };
    try {
      const input = { revision, assessment, comprehensive, annualDomains, context: currentContext, referenceYear: currentYear };
      return { value: contextualCache.read({ version: CONTEXTUAL_READING_VERSION, input }, () => buildContextualReadingBundle(input)), error: null };
    }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "结合背景的说明暂未生成，通用解读仍可阅读。") }; }
  }, [CONTEXTUAL_READING_VERSION, contextualCache, revision, assessment, comprehensive, annualDomains, currentContext, currentYear, contextLoading, contextError]);
  const contextual = contextualResult.value;
  const [monthlyDomainsCache] = useState(() => createReadingSourceCache<LocalMonthlyDomainReadings>());
  const monthlyDomainsResult = useMemo<{ value: LocalMonthlyDomainReadings | null; error: string | null }>(() => {
    if (!assessment || !monthly || contextLoading || contextError || contextualResult.error) return { value: null, error: null };
    try {
      const input = { revision, assessment, monthly, contextual };
      return { value: monthlyDomainsCache.read({ versions: [MONTHLY_DOMAIN_READING_VERSION, MONTHLY_DOMAIN_PROSE_VERSION, ADULT_LIFE_SITUATIONS_VERSION], input },
        () => buildMonthlyDomainReadings(input)), error: null };
    }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "月度分领域详读暂未生成，原流月判断仍可阅读。") }; }
  }, [MONTHLY_DOMAIN_READING_VERSION, MONTHLY_DOMAIN_PROSE_VERSION, ADULT_LIFE_SITUATIONS_VERSION, monthlyDomainsCache, revision, assessment, monthly, contextual, contextLoading, contextError, contextualResult.error]);
  const monthlyDomains = monthlyDomainsResult.value;
  const [annualEventsCache] = useState(() => createReadingSourceCache<LocalReadingAnnualEvents>());
  const annualEventsResult = useMemo<{ value: LocalReadingAnnualEvents | null; error: string | null }>(() => {
    if (!assessment || !annual || !annualDomains || contextLoading || contextError || contextualResult.error) return { value: null, error: null };
    try {
      const input = { revision, assessment, annual, annualDomains, contextual };
      return { value: annualEventsCache.read({ versions: [ANNUAL_EVENT_READING_VERSION, ANNUAL_EVENT_READING_PROSE_VERSION, ANNUAL_EVENT_SIGNALS_VERSION, ADULT_LIFE_SITUATIONS_VERSION], input },
        () => buildReadingAnnualEvents(input)), error: null };
    }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "年度应事情境暂未生成，完整领域解释仍可阅读。") }; }
  }, [ANNUAL_EVENT_READING_VERSION, ANNUAL_EVENT_READING_PROSE_VERSION, ANNUAL_EVENT_SIGNALS_VERSION, ADULT_LIFE_SITUATIONS_VERSION, annualEventsCache, revision, assessment, annual, annualDomains, contextual, contextLoading, contextError, contextualResult.error]);
  const annualEvents = annualEventsResult.value;
  const annualLifeStoriesCache = useRef<{ identity: string; value: LocalReadingAnnualLifeStories } | null>(null);
  const annualLifeStoriesResult = useMemo<{ value: LocalReadingAnnualLifeStories | null; error: string | null }>(() => {
    if (!assessment || !annual?.years.length || !annualDomains || !annualEvents || annualLoading
      || contextLoading || contextError || contextualResult.error) return { value: null, error: null };
    try {
      const input = { revision, assessment, annual, annualDomains, annualEvents, contextual };
      const identity = JSON.stringify({ version: ANNUAL_LIFE_STORY_VERSION, input });
      if (annualLifeStoriesCache.current?.identity === identity) return { value: annualLifeStoriesCache.current.value, error: null };
      const value = buildReadingAnnualLifeStories(input);
      const source = value.sourceBinding;
      if (value.version !== ANNUAL_LIFE_STORY_VERSION || source.caseId !== revision.caseId || source.revisionId !== revision.id
        || source.chartResultHash !== revision.manifest.resultHash || source.includeHour !== assessment.sourceBinding.includeHour
        || value.startYear !== annual.startYear || value.endYear !== annual.endYear || value.years.length !== annual.years.length
        || new Set(value.years.map((item) => item.year)).size !== value.years.length
        || annual.years.some((year) => !value.years.some((story) => story.year === year.year && story.version === value.version
          && JSON.stringify(story.sourceBinding) === JSON.stringify(source) && story.startInstant === year.startInstant
          && story.endExclusiveInstant === year.endExclusiveInstant && JSON.stringify(story.yearNodeRef) === JSON.stringify(year.transitNodeRef)))) {
        throw new Error("年度生活总评与当前年份窗口、命盘或原节点不一致，已停止保存。");
      }
      annualLifeStoriesCache.current = { identity, value };
      return { value, error: null };
    } catch (reason) {
      annualLifeStoriesCache.current = null;
      return { value: null, error: safeVisibleErrorMessage(reason, "年度生活总评暂未生成，原年度与情境仍可阅读。") };
    }
  }, [ANNUAL_LIFE_STORY_VERSION, revision, assessment, annual, annualDomains, annualEvents, contextual,
    annualLoading, contextLoading, contextError, contextualResult.error]);
  const annualLifeStories = annualLifeStoriesResult.value;
  const selectedAnnualLifeStory = annualLifeStories?.years.find((story) => story.year === queryYear) ?? null;
  const annualLifeStoryChoices = useMemo<ReadingFeedbackChoice[]>(() => annualLifeStories?.years.flatMap((story) =>
    story.branches.flatMap((branch) => branch.segments.map((segment) => ({
      id: annualLifeStorySubjectId(story, segment),
      label: `${story.year}年生活总评 · ${branch.label}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10)}起` : ""}`,
      originalConclusion: annualLifeStoryFeedbackText(story, segment), sourceVersions: annualLifeStoryFeedbackVersions(story, segment)
    })))) ?? [], [annualLifeStories]);

  const displayedDecadeId = life?.decades.find((item) => item.id === selectedDecadeId)?.id
    ?? life?.decades.find((item) => item.isCurrent)?.id ?? life?.decades[0]?.id ?? "";
  const lifeStageYearsCache = useRef<{ input: string; value: LocalLifeStageYears } | null>(null);
  const lifeStageYearsResult = useMemo<{ value: LocalLifeStageYears | null; error: string | null }>(() => {
    if (!assessment || !life || !lifeStageStory || !displayedDecadeId || !annual?.years.length || !annualDomains || !annualEvents
      || annualLoading || contextLoading || contextError || contextualResult.error) return { value: null, error: null };
    try {
      const input = { revision, assessment, life, lifeStageStory, selectedDecadeId: displayedDecadeId, annual, annualDomains, annualEvents, contextual };
      const identity = JSON.stringify({ version: LIFE_STAGE_YEARS_VERSION, input });
      if (lifeStageYearsCache.current?.input === identity) return { value: lifeStageYearsCache.current.value, error: null };
      const value = buildLifeStageYears(input);
      lifeStageYearsCache.current = { input: identity, value };
      return { value, error: null };
    } catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "大运与年度衔接暂未生成，原大运和年度内容仍可阅读。") }; }
  }, [LIFE_STAGE_YEARS_VERSION, revision, assessment, life, lifeStageStory, displayedDecadeId, annual, annualDomains, annualEvents, contextual,
    annualLoading, contextLoading, contextError, contextualResult.error]);
  const lifeStageYears = lifeStageYearsResult.value;
  const lifeStageYearChoices = useMemo<ReadingFeedbackChoice[]>(() => lifeStageYears?.years.map((year) => ({
    id: lifeStageYearSubjectId(lifeStageYears, year), label: `${lifeStageYears.stage.ganZhi}大运 · ${year.year}年 · ${lifeStageYears.branchLabel}`,
    originalConclusion: lifeStageYearFeedbackText(lifeStageYears, year), sourceVersions: lifeStageYearFeedbackVersions(lifeStageYears, year)
  })) ?? [], [lifeStageYears]);
  // A note refresh can reconstruct byte-identical derived sources. Reuse only
  // the last completely verified input, never a year/source-only cache key.
  const annualMonthStoryCache = useRef<{ input: string; value: LocalAnnualMonthStory } | null>(null);
  const annualMonthStoryResult = useMemo<{ value: LocalAnnualMonthStory | null; error: string | null }>(() => {
    if (!assessment || !selectedAnnual || !annualDomains || !annualEvents || !monthly || !monthlyDomains
      || annualLoading || monthlyLoading || contextLoading || contextError || contextualResult.error
      || monthly.year !== queryYear || monthlyDomains.year !== queryYear || annual?.startYear !== annualStartYear || annual?.endYear !== annualEndYear) return { value: null, error: null };
    try {
      const domain = annualDomains.years.find((item) => item.year === queryYear);
      const events = annualEvents.years.find((item) => item.year === queryYear);
      if (!domain || !events) throw new Error("年月衔接缺少所选年份的完整年度来源，请重新读取后保存。");
      const input = { revision, assessment, year: selectedAnnual, annualDomains: domain, annualEvents: events, monthly, monthlyDomains, contextual };
      const identity = JSON.stringify({ version: LOCAL_ANNUAL_MONTH_STORY_VERSION, input });
      if (annualMonthStoryCache.current?.input === identity) return { value: annualMonthStoryCache.current.value, error: null };
      const value = buildAnnualMonthStory(input);
      annualMonthStoryCache.current = { input: identity, value };
      return { value, error: null };
    } catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "年月衔接暂未生成，原年度与月份仍可阅读。") }; }
  }, [LOCAL_ANNUAL_MONTH_STORY_VERSION, revision, assessment, selectedAnnual, annualDomains, annualEvents, monthly, monthlyDomains, contextual,
    queryYear, annualLoading, monthlyLoading, contextLoading, contextError, contextualResult.error, annual?.startYear, annual?.endYear, annualStartYear, annualEndYear]);
  const annualMonthStory = annualMonthStoryResult.value;
  const annualMonthStoryChoices = useMemo<ReadingFeedbackChoice[]>(() => annualMonthStory ? annualMonthStoryEntries(annualMonthStory).map(({ month, branch, period, domain }) => ({
    id: annualMonthStorySubjectId(annualMonthStory, month, period, domain),
    label: `${annualMonthStory.year}年年月衔接 · ${month.label} · ${domain.title}${month.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.periods.length > 1 ? ` · ${new Date(Date.parse(period.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10)}起` : ""}`,
    originalConclusion: annualMonthStoryFeedbackText(annualMonthStory, month, branch, period, domain),
    sourceVersions: annualMonthStoryFeedbackVersions(annualMonthStory)
  })) : [], [annualMonthStory]);
  const composedEventChoices = useMemo(() => annualEventCompositionChoices(annualEvents), [annualEvents]);
  const annualEventChoices = useMemo<ReadingFeedbackChoice[]>(() => annualEvents?.years.flatMap((reading) =>
    reading.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.items.map((item) => ({
      id: annualEventFeedbackSubjectId(reading.year, segment, item),
      label: `${reading.year}年应事 · ${item.title}${reading.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10)}起` : ""}`,
      originalConclusion: annualEventFeedbackText(reading, branch, segment, item),
      sourceVersions: [annualEvents.version, ...reading.sourceVersions]
    }))))) ?? [], [annualEvents]);
  const contextualChoices = useMemo<ReadingFeedbackChoice[]>(() => contextual?.readings.map((reading) => ({ id: reading.subjectId,
    label: `结合背景 · ${reading.title}${reading.scope.kind === "annual" ? ` · ${reading.scope.year}年` : ""}`,
    originalConclusion: contextualFeedbackText(reading, contextual), sourceVersions: contextualFeedbackVersions(reading, contextual) })) ?? [], [contextual]);
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; requestId: number } | null>(null);
  const domainFeedbackChoices = useMemo<ReadingFeedbackChoice[]>(() => annualDomains?.years.flatMap((reading) =>
    reading.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.domains.map((domain) => ({
      id: `annual-domain-${reading.year}-${segment.id}-${domain.id}`,
      label: `${reading.year}年 · ${domain.title}${reading.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)}起` : ""}`,
      originalConclusion: annualDomainFeedbackText(reading, branch, segment, domain),
      sourceVersions: [reading.version, ...reading.sourceVersions]
    }))))) ?? [], [annualDomains]);
  const monthlyFeedbackChoices = useMemo<ReadingFeedbackChoice[]>(() => monthlyDomains?.months.flatMap((reading) =>
    reading.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.domains.map((domain) => ({
      id: `monthly-domain-${reading.monthId}-${segment.id}-${domain.id}`,
      label: `${monthlyDomains.year}年 · ${reading.label} ${reading.ganZhi} · ${domain.title}${reading.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10)}起` : ""}`,
      originalConclusion: monthlyDomainFeedbackText(monthlyDomains, reading, branch, segment, domain),
      sourceVersions: [monthlyDomains.version, ...monthlyDomains.sourceVersions]
    }))))) ?? [], [monthlyDomains]);
  const lifeStageChoices = useMemo<ReadingFeedbackChoice[]>(() => lifeStageStory ? lifeStageStoryEntries(lifeStageStory).map((entry) => entry.kind === "stage" ? {
    id: lifeStageStorySubjectId(lifeStageStory, entry.stage), label: `阶段主线 · ${entry.stage.ganZhi}大运 · ${entry.stage.headline}${lifeStageStory.branches.length > 1 ? ` · ${entry.branch.label}` : ""}`,
    originalConclusion: lifeStageStoryFeedbackText(lifeStageStory, entry.branch, entry.stage), sourceVersions: lifeStageStoryFeedbackVersions(lifeStageStory)
  } : {
    id: lifeStageStoryTransitionSubjectId(lifeStageStory, entry.transition), label: `交运变化 · ${entry.transition.headline}${lifeStageStory.branches.length > 1 ? ` · ${entry.branch.label}` : ""}`,
    originalConclusion: lifeStageStoryTransitionText(lifeStageStory, entry.transition), sourceVersions: lifeStageStoryFeedbackVersions(lifeStageStory)
  }) : [], [lifeStageStory]);
  const feedbackChoices = useMemo<ReadingFeedbackChoice[]>(() => [
  ...(annual ? [{ id: "annual-overview", label: `${annual.startYear}—${annual.endYear} 年份总览`, originalConclusion: `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${annual.version}` }] : []),
  ...(life ? [{ id: "life-overview", label: "当前阶段与交运总览", originalConclusion: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}` }] : []),
  ...(timeline?.branches.map((branch) => ({ id: readingTimelineNarrativeSubjectId(timeline, branch),
    label: `${timeline.startYear}—${timeline.endYear}年走势总评${timeline.branches.length > 1 ? ` · ${branch.label}` : ""}`,
    originalConclusion: readingTimelineNarrativeText(timeline, branch) })) ?? []),
  ...(timeline?.stages.map((stage) => ({ id: `timeline-stage-${stage.id}`,
    label: `阶段解读 · ${stage.headline}${timeline.branches.length > 1 ? ` · ${timeline.branches.find((branch) => branch.id === stage.branchId)?.label ?? stage.branchId}` : ""}`,
    originalConclusion: `${readingTimelineStageText(stage)}\n阶段解读规则：${timeline.version}\n来源解读版本：${timeline.sourceVersions.join("、")}` })) ?? []),
  ...(comprehensive?.chapters.map((chapter) => ({
    id: `chapter-${chapter.id}`, label: `综合解读 · ${chapter.title}`,
    originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${comprehensive.version}`
  })) ?? []), ...(comprehensive?.usefulGuidance?.entries.map((entry) => ({
    id: `useful-stem-${entry.id}`, label: `取用分工 · ${entry.stem}（${entry.tenGod}）`,
    originalConclusion: `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map((condition) => `条件：${condition}`).join("\n")}\n取用解读规则：${comprehensive.usefulGuidance!.version}\n综合解读规则：${comprehensive.version}`
  })) ?? []), ...(life?.decades.map((item) => ({ id: `decade-${item.id}`, label: `${item.startYear}—${item.endYear} ${item.ganZhi}大运${life.branches.length > 1 ? ` · ${item.branchLabel}` : ""}`,
    originalConclusion: `${item.headline}\n${item.branchLabel} · ${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${life.version}` })) ?? []),
  ...(monthly?.months.map((item) => ({ id: `month-${item.id}`, label: `${monthly.year}年 · ${item.label} ${item.ganZhi}`,
    originalConclusion: `${monthly.year}年 ${item.headline}\n${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${monthly.version}` })) ?? []),
  ...(annualScenarios?.years.flatMap((entry) => entry.scenarios.map((scenario) => ({
    id: `event-${entry.year}-${scenario.id}`, label: `${entry.year}年情境 · ${scenario.title}`,
    originalConclusion: `${entry.year}年 · ${scenario.title}\n${scenario.summary}\n${scenario.examples.map((text) => `情境例：${text}`).join("\n")}\n${scenario.conditions.map((text) => `条件：${text}`).join("\n")}\n情境标识：${scenario.id}\n年度情境规则：${annualScenarios.version}`
  }))) ?? [])].map<ReadingFeedbackChoice>((choice) => ({ ...choice, sourceVersions: choice.id.startsWith("timeline-stage-") || choice.id.startsWith("trajectory-") ? [timeline!.version, ...timeline!.sourceVersions]
    : choice.id.startsWith("useful-stem-") ? [comprehensive!.version, comprehensive!.usefulGuidance!.version]
    : choice.id.startsWith("chapter-") ? [comprehensive!.version]
    : choice.id.startsWith("month-") ? [monthly!.version] : choice.id.startsWith("event-") ? [annualScenarios!.version]
      : choice.id === "annual-overview" ? [annual!.version, READING_YEAR_SUMMARY_VERSION] : [life!.version] })).concat(domainFeedbackChoices, monthlyFeedbackChoices, contextualChoices, annualEventChoices, composedEventChoices, annualMonthStoryChoices, lifeStageChoices, lifeStageYearChoices, annualLifeStoryChoices), [comprehensive, life, monthly, annualScenarios, annual, timeline, domainFeedbackChoices, monthlyFeedbackChoices, contextualChoices, annualEventChoices, composedEventChoices, annualMonthStoryChoices, lifeStageChoices, lifeStageYearChoices, annualLifeStoryChoices]);
  const personalChoices = useMemo(() => assessment ? buildReadingFeedbackChoices(assessment, annual, feedbackChoices) : [], [assessment, annual, feedbackChoices]);
  const personalLegacySource = useMemo(() => assessment ? legacyAnnualInputFromExtras(assessment, annual,
    { sourceRevision: revision, annualDomains, contextual, monthly, monthlyDomains, life, lifeStageStory, lifeStageYears }) : undefined,
  [revision, assessment, annual, annualDomains, contextual, monthly, monthlyDomains, life, lifeStageStory, lifeStageYears]);
  const [personalResult, setPersonalResult] = useState<{ records: ResearchNoteRecord[]; choices: ReadingFeedbackChoice[];
    legacySource: typeof personalLegacySource;
    value: LocalPersonalReading | null; error: string | null } | null>(null);
  useEffect(() => {
    let current = true;
    if (!assessment || recordsLoading || recordsError) return () => { current = false; };
    void buildLocalPersonalReading({ revision, assessment, choices: personalChoices, records, legacySource: personalLegacySource }).then((value) => {
      if (current) setPersonalResult({ records, choices: personalChoices, legacySource: personalLegacySource, value, error: null });
    }).catch((reason) => {
      if (current) setPersonalResult({ records, choices: personalChoices, legacySource: personalLegacySource, value: null,
        error: safeVisibleErrorMessage(reason, "个人反馈暂未接入，原计算仍可阅读。请重新读取记录后再保存完整解读。") });
    });
    return () => { current = false; };
  }, [revision, assessment, personalChoices, personalLegacySource, records, recordsLoading, recordsError]);
  const currentPersonalResult = !recordsLoading && !recordsError && personalResult?.records === records && personalResult.choices === personalChoices
    && personalResult.legacySource === personalLegacySource ? personalResult : null;
  const personalReading = currentPersonalResult?.value ?? null;
  const personalLoading = !recordsError && (!currentPersonalResult || recordsLoading);
  const personalError = recordsError ?? currentPersonalResult?.error ?? null;
  const personalReadingReady = !personalLoading && !personalError && !!personalReading
    && !contextLoading && !contextError && !contextualResult.error;
  const annualLifePersonalResult = useMemo<{ value: Record<string, LocalPersonalReadingEntry[]>; error: string | null }>(() => {
    if (!personalReading || !annualLifeStories || !assessment || !annual || !annualDomains || !annualEvents) return { value: {}, error: null };
    try {
      return { value: Object.fromEntries(annualLifeStories.years.flatMap((story) => {
        const year = annual.years.find((item) => item.year === story.year);
        const domains = annualDomains.years.find((item) => item.year === story.year);
        const events = annualEvents.years.find((item) => item.year === story.year);
        if (!domains || !events || !year) throw new Error("年度总评的个人修订缺少同年来源。");
        const source = { revision, assessment, year, domains, events, contextual };
        return story.branches.flatMap((branch) => branch.segments.map((segment) =>
          [`${story.year}:${segment.id}`, annualLifeStoryPersonalSources(story, segment, personalReading, source)]));
      })), error: null };
    } catch (reason) { return { value: {}, error: safeVisibleErrorMessage(reason, "年度总评的个人修订关联暂未核对，请重新读取。") }; }
  }, [personalReading, annualLifeStories, revision, assessment, annual, annualDomains, annualEvents, contextual]);
  const navigationStories = !personalLoading && !personalError && !annualLoading && !annualError
    && !annualLifeStoriesResult.error && !annualLifePersonalResult.error ? annualLifeStories : null;

  const stageYearPersonalResult = useMemo<{ value: Record<string, LocalPersonalReadingEntry[]>; error: string | null }>(() => {
    if (!personalReading || !lifeStageYears || !assessment || !life || !lifeStageStory || !annual || !annualDomains || !annualEvents) return { value: {}, error: null };
    try {
      const source = { revision, assessment, life, lifeStageStory, selectedDecadeId: displayedDecadeId, annual, annualDomains, annualEvents, contextual };
      return { value: Object.fromEntries(lifeStageYears.years.map((year) => [year.id, lifeStageYearPersonalSources(lifeStageYears, year, personalReading, source)])), error: null };
    } catch (reason) { return { value: {}, error: safeVisibleErrorMessage(reason, "阶段年度的个人修订关联暂未核对，请重新读取。") }; }
  }, [personalReading, lifeStageYears, revision, assessment, life, lifeStageStory, displayedDecadeId, annual, annualDomains, annualEvents, contextual]);
  const synthesisResult = useMemo<{ value: LocalReadingSynthesis | null; error: string | null }>(() => {
    if (!assessment || !comprehensive || personalLoading || personalError || contextLoading || contextError || contextualResult.error) return { value: null, error: null };
    try { return { value: buildReadingSynthesis({ revision, assessment, comprehensive, life, annual, timeline, contextual, personal: personalReading }), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "综合总评暂未生成，各章节仍可阅读。") }; }
  }, [revision, assessment, comprehensive, life, annual, timeline, contextual, personalReading, personalLoading, personalError, contextLoading, contextError, contextualResult.error]);
  const prioritiesResult = useMemo<{ value: LocalReadingPriorities | null; error: string | null }>(() => {
    if (!annual?.years.length || !timeline) return { value: null, error: null };
    try { return { value: buildReadingPriorities({ revision, annual, life, timeline, annualDomains }), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "重点年份暂未整理，完整逐年解读仍可阅读。") }; }
  }, [revision, annual, life, timeline, annualDomains]);
  const synthesis = synthesisResult.value, priorities = prioritiesResult.value;
  const readVersion = useRef(0);
  const refreshRecords = useCallback(async (saved?: { timing: ReadingSaveTiming; record: ResearchNoteRecord | null }) => {
    const version = ++readVersion.current;
    saved?.timing.start("post_save_validation");
    setRecordsLoading(true);
    try {
      const notes = await researchRepository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
      if (!active.current || version !== readVersion.current) {
        if (saved) finishSaveTiming("cancelled");
        return;
      }
      if (saved) {
        saved.timing.count({ recordsRead: notes.length });
        const stored = notes.find(note => note.id === saved.record?.id);
        const verified = !!stored && !!saved.record && stored.caseId === saved.record.caseId
          && JSON.stringify(stored.anchor) === JSON.stringify(saved.record.anchor) && stored.body === saved.record.body
          && stored.editVersion === saved.record.editVersion && stored.lifecycle === saved.record.lifecycle;
        // A diagnostic failure must not retry a committed write or change stored data.
        if (!verified) finishSaveTiming("failed");
        else { saved.timing.end(); saved.timing.start("page_refresh"); }
      }
      setCaseRecords(notes);
      setRecords(notes.filter((note) => note.anchor.kind === "revision" && note.anchor.revisionId === revision.id
        && (note.tags.includes(LOCAL_READING_SNAPSHOT_TAG) || note.tags.includes(LOCAL_READING_FEEDBACK_TAG) || note.tags.includes(LOCAL_READING_CONTEXT_TAG)
          || parseReadingContext(note.body).kind !== "legacy")));
      setRecordsError(null);
    } catch (reason) {
      if (saved) finishSaveTiming("failed");
      if (active.current && version === readVersion.current) setRecordsError(safeVisibleErrorMessage(reason, "本地解读记录暂未读到。"));
    } finally { if (active.current && version === readVersion.current) setRecordsLoading(false); }
  }, [revision.caseId, revision.id, finishSaveTiming]);
  useEffect(() => { void refreshRecords(); }, [refreshRecords]);
  useEffect(() => {
    let current = true;
    if (!assessment) { setAnnualLoading(false); setResolvedAnnualKey(annualRequestKey); return; }
    if (annualWindow.kind === "stage" && !rangeLife) {
      if (!rangeLifeLoading) { setAnnualLoading(false); setResolvedAnnualKey(annualRequestKey); setAnnualError(rangeLifeError ?? "尚未取得所选大运，不能借用其他年份。"); }
      return () => { current = false; };
    }
    setAnnualLoading(true); setAnnual(null); setAnnualError(null);
    void (async () => {
      if (annualWindow.kind === "rolling") return buildLocalAnnualOutlook(revision, assessment, annualWindow.startYear);
      const range = await resolveLifeStageAnnualRange({ revision, assessment, life: rangeLife!, decadeId: annualWindow.decadeId });
      if (!current) return null;
      setRangeResult({ key: annualRequestKey, value: range });
      if (range.startYear === null || range.endYear === null) return null;
      const first = range.startYear, last = range.endYear;
      setQueryYear((previous) => previous >= first && previous <= last ? previous : currentYear >= first && currentYear <= last ? currentYear : first);
      return buildLocalAnnualOutlookRange(revision, assessment, first, last);
    })().then((value) => { if (current) setAnnual(value); })
      .catch((reason) => { if (current) setAnnualError(safeVisibleErrorMessage(reason, "年度解读暂不可用，命局判断仍可阅读。")); })
      .finally(() => { if (current) { setResolvedAnnualKey(annualRequestKey); setAnnualLoading(false); } });
    return () => { current = false; };
  }, [assessment, revision, annualRequestKey, annualWindow, rangeLife, rangeLifeLoading, rangeLifeError, currentYear]);
  useEffect(() => {
    let current = true;
    if (!assessment) { setLifeLoading(false); return; }
    setLifeLoading(true); setLife(null); setLifeError(null);
    void buildLocalLifeOutlook(revision, assessment, currentYear, { atInstant: referenceInstant }).then((value) => {
      if (current) setLife(value);
    }).catch((reason) => { if (current) setLifeError(safeVisibleErrorMessage(reason, "人生大运暂未生成，命局解读仍可阅读。")); })
      .finally(() => { if (current) setLifeLoading(false); });
    return () => { current = false; };
  }, [assessment, revision, currentYear, referenceInstant]);
  useEffect(() => {
    let current = true;
    if (!assessment) { setMonthlyLoading(false); return; }
    setMonthlyLoading(true); setMonthly(null); setMonthlyError(null);
    void buildLocalMonthlyOutlook(revision, assessment, queryYear).then((value) => {
      if (current) setMonthly(value);
    }).catch((reason) => { if (current) setMonthlyError(safeVisibleErrorMessage(reason, "这一年的流月暂未生成，可以继续阅读命局与大运。")); })
      .finally(() => { if (current) setMonthlyLoading(false); });
    return () => { current = false; };
  }, [assessment, revision, queryYear]);
  const selectYear = (year: number) => {
    setQueryYear(year);
    if (annualStartYear === null || annualEndYear === null || year < annualStartYear || year > annualEndYear) {
      const startYear = Math.min(year, 2090);
      setAnnualWindow((previous) => ({ kind: "rolling", startYear, endYear: startYear + 9, sequence: previous.sequence + 1 }));
    }
  };
  const selectDecade = (decadeId: string) => {
    if (!life?.decades.some((item) => item.id === decadeId)) return;
    setSelectedDecadeId(decadeId);
    setAnnualWindow((previous) => ({ kind: "stage", decadeId, sequence: previous.sequence + 1 }));
  };

  const saveRecord = async (content: string | (() => Promise<string>), tag: string, additionalTags: string[] = [], timing?: ReadingSaveTiming) => {
    if (props.readOnly) throw new Error("请先恢复此命盘，再保存记录。");
    const operation = acquireResearchJournalMutation("note-save", revision.caseId);
    if (!operation) throw new Error("另一条记录正在保存或等待核对，请到解读记录中查看后再试。");
    try {
      const body = typeof content === "function" ? await content() : content;
      researchNoteRecordSchema.shape.body.parse(body);
      if (!active.current) throw new Error("当前命盘已切换，请重新打开对应记录后保存。");
      try {
        const write = () => researchRepository.createResearchNote({ caseId: revision.caseId,
          anchor: { kind: "revision" as const, revisionId: revision.id }, body, tags: [tag, ...additionalTags], sourceRefs: [], lifecycle: "active" as const });
        const record = timing ? await timing.measureAsync("repository_write", write) : await write();
        if (timing && saveTiming.current?.timing === timing) saveTiming.current.record = record;
      } catch (reason) {
        lockResearchJournalMutationUnknown(operation, { targetKind: "research_note", targetId: null,
          action: tag, expectedState: `修订 ${revision.id}`, draftIdentity: `正文 ${body.length} 字符` },
          safeVisibleErrorMessage(reason, "保存结果尚未确认。"));
        throw new Error("保存结果尚未确认，已停止重复写入。请先到解读记录核对是否已有这条内容。");
      }
    } finally { releaseResearchJournalMutation(operation); }
    await refreshRecords(timing && saveTiming.current?.timing === timing ? saveTiming.current : undefined);
  };

  const appendReview = async (root: ResearchNoteRecord, draft: ReadingFeedbackReviewDraft, expectedLatestId: string | null) => {
    if (!assessment) throw new Error("当前命盘尚未确认。");
    return saveRecord(async () => {
      const current = await researchRepository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
      const original = current.find((item) => item.id === root.id && item.lifecycle === "active");
      if (!original || original.caseId !== revision.caseId || original.anchor.kind !== "revision" || original.anchor.revisionId !== revision.id
        || JSON.stringify(await feedbackNoteReference(original)) !== JSON.stringify(await feedbackNoteReference(root))) throw new Error("原反馈正文或版本已经变化，请重新读取后复核。");
      const thread = await readFeedbackThread(original, current);
      if (!thread.canAppend || thread.latest?.record.lifecycle === "archived" || (thread.latest?.record.id ?? null) !== expectedLatestId) throw new Error("复核记录已有变化或最新复核已归档，请重新读取后接续；原输入可保留。");
      return buildReadingFeedbackReview(original, thread.latest?.record ?? null, readingFeedbackSource(assessment), draft);
    }, LOCAL_READING_FEEDBACK_TAG, [LOCAL_READING_REVIEW_TAG]);
  };
  const adoptPersonalRevision = async (rootNoteId: string, expectedLatestId: string | null) => {
    const feedback = personalReading?.entries.flatMap((entry) => entry.feedback).find((item) => item.rootRef.noteId === rootNoteId);
    const root = records.find((record) => record.id === rootNoteId);
    if (!feedback?.canReview || !root || (feedback.latestReviewRef?.noteId ?? null) !== expectedLatestId) {
      throw new Error("这条反馈或复核已有变化，请重新读取后采用；原文仍保留。");
    }
    const reference = await feedbackNoteReference(root);
    if (reference.editVersion !== feedback.rootRef.editVersion || reference.bodySha256 !== feedback.rootRef.bodySha256) {
      throw new Error("反馈原文已变化，请重新读取后采用。");
    }
    const parsed = parseReadingFeedback(root.body);
    if (parsed.kind !== "feedback" || !parsed.value.requestedRevision.trim()) throw new Error("这条反馈尚未提供可采用的个人修订文本。");
    return appendReview(root, { state: "revised",
      notes: "本人选择将原反馈中提出的修订用于本项个人解读；实际情况与具体方面保留在原反馈。",
      revisedConclusion: parsed.value.requestedRevision, occurredAt: parsed.value.occurredAt }, expectedLatestId);
  };
  const requirePersonalReading = () => {
    if (personalLoading) throw new Error("正在把你的反馈接入本次解读，请稍后保存。");
    if (personalError) throw new Error(personalError);
    if (!personalReading) throw new Error("个人反馈尚未读取完成，请重新读取记录后保存。");
    return personalReading;
  };
  const saveReadingContext = async (draft: ReadingContextDraft) => {
    if (contextLoading || !currentContextResult?.value) throw new Error("正在读取背景，请稍后保存。");
    if (!currentContextResult.value.canAppend || contextError) throw new Error(contextError || "背景记录有变化，请重新读取后保存。");
    const expectedReference = currentContext?.ref ?? null;
    return saveRecord(async () => {
      const freshRecords = await researchRepository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
      const fresh = await resolveReadingContext({ revision, records: freshRecords });
      if (!fresh.canAppend || fresh.issues.length || JSON.stringify(fresh.latest?.ref ?? null) !== JSON.stringify(expectedReference)) {
        throw new Error("阅读背景已有更新，请重新读取后再保存；输入已保留。");
      }
      return buildReadingContextRecord(revision, fresh.latest?.record ?? null, draft);
    }, LOCAL_READING_CONTEXT_TAG);
  };
  const requireContextualReading = () => {
    if (contextLoading) throw new Error("正在结合阅读背景，请稍后保存。");
    if (contextError || contextualResult.error) throw new Error(contextError ?? contextualResult.error!);
    return contextual;
  };
  const storyError = annualLifeStoriesResult.error ?? annualLifePersonalResult.error ?? stageYearPersonalResult.error ?? lifeStageYearsResult.error ?? lifeStageStoryResult.error ?? annualMonthStoryResult.error ?? annualEventsResult.error ?? annualDomainsResult.error ?? monthlyDomainsResult.error;
  const reportLoading = annualLoading || lifeLoading || monthlyLoading || personalLoading || contextLoading
    || Boolean(annual && (annual.startYear !== annualStartYear || annual.endYear !== annualEndYear)) || Boolean(monthly && monthly.year !== queryYear)
    || Boolean(selectedAnnual && monthly && !annualMonthStory && !storyError && !contextError && !contextualResult.error);
  const requireCompleteReading = () => {
    if (reportLoading) throw new Error("完整解读仍在整理，请完成后再保存或导出。");
    const error = comprehensiveResult.error ?? annualError ?? lifeError ?? monthlyError ?? personalError ?? contextError ?? contextualResult.error ?? storyError;
    if (error) throw new Error(error);
    if (stageAnnualRange?.status === "unavailable") throw new Error("所选大运没有可完整阅读的年度范围，不能把其他年份保存为这步大运的解读。");
    if (!annual?.years.length || !life || !monthly) throw new Error("完整解读缺少年度、大运或流月内容，请重新读取后保存或导出。");
    if (annual?.years.length && displayedDecadeId && !lifeStageYears) throw new Error("大运与年度衔接仍在整理，请完成后再保存或导出。");
    if (!annualLifeStories || annualLifeStories.startYear !== annualStartYear || annualLifeStories.endYear !== annualEndYear
      || !selectedAnnualLifeStory || selectedAnnualLifeStory.year !== queryYear) throw new Error("当前年份窗口的生活总评仍在整理，请完成后再保存或导出。");
    if (!lifeStageStory) throw new Error("人生阶段主线仍在整理，请完成后再保存或导出。");
    if (!annualMonthStory || annualMonthStory.year !== queryYear) throw new Error("所选年份的年月衔接仍在整理，请完成后再保存或导出。");
  };
  const baseBriefResult = useMemo(() => {
    if (reportLoading || !assessment || !synthesis || !annual || !life || !annualEvents || !annualLifeStories || !personalReadingReady) return { value: null, error: null };
    try {
      return { value: observeSaveRender("brief_render", () => buildBriefReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly, monthlyDomains,
        annualScenarios, timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading, contextual, synthesis, priorities })), error: null };
    } catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "主报告尚未整理完成，可展开查看现有解读。") }; }
  }, [reportLoading, assessment, synthesis, annual, life, annualEvents, annualLifeStories, personalReadingReady, revision, comprehensive,
    lifeStageStory, lifeStageYears, monthly, monthlyDomains, annualScenarios, timeline, annualDomains, annualMonthStory, personalReading, contextual, priorities]);
  // Reading requests one year; a complete save/export still prepares every year.
  const plannedKeyYears = [...new Set(baseBriefResult.value?.years.map(year => year.year) ?? [])].sort((a, b) => a - b);
  const plannedKeyYearsKey = JSON.stringify(plannedKeyYears);
  const keyMonthRecords = records.filter(record => record.tags.includes(LOCAL_READING_FEEDBACK_TAG) || record.tags.includes(LOCAL_READING_REVIEW_TAG));
  const keyMonthRequestKey = baseBriefResult.value && annual && assessment ? JSON.stringify({
    version: KEY_MONTH_EVENT_TENDENCIES_VERSION, revision: revision.id, chart: revision.manifest.resultHash,
    assessmentVersion: assessment.version, annualVersion: annual.version, annualStart: annual.startYear, annualEnd: annual.endYear,
    years: plannedKeyYears, context: contextual, records: keyMonthRecords
  }) : "";
  const keyMonthFacts = useMemo(() => [revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual],
    [revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual]);
  const [keyMonthResult, setKeyMonthResult] = useState<{ key: string; facts: typeof keyMonthFacts; years: PreparedKeyMonthYear[]; completed: number; ready: boolean; error: string | null } | null>(null);
  const keyMonthSources = useMemo<KeyMonthEventSources | null>(() => assessment && annual && annualDomains && annualEvents && annualLifeStories
    ? { revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual, legacySource: personalLegacySource } : null,
    [revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual, personalLegacySource]);
  const monthPreparation = useMemo(() => keyMonthSources && keyMonthRequestKey
    ? createReadingMonthPreparation(JSON.parse(plannedKeyYearsKey) as number[], async year => {
      // Let the progress state paint and input events run between calculated years.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      return prepareKeyMonthYear(keyMonthSources, year, keyMonthRecords);
    }) : null,
    [keyMonthSources, keyMonthRequestKey, plannedKeyYearsKey]);
  const [completePreparing, setCompletePreparing] = useState(false);
  useEffect(() => {
    if (!monthPreparation || !plannedKeyYears.includes(queryYear)) return;
    let current = true;
    const ready = monthPreparation.ready();
    setKeyMonthResult({ key: keyMonthRequestKey, facts: keyMonthFacts, years: ready, completed: ready.length, ready: false, error: null });
    void monthPreparation.read(queryYear).then(() => {
      const values = monthPreparation.ready();
      if (current) setKeyMonthResult({ key: keyMonthRequestKey, facts: keyMonthFacts, years: values, completed: values.length, ready: true, error: null });
    }).catch(reason => {
      if (current) setKeyMonthResult({ key: keyMonthRequestKey, facts: keyMonthFacts, years: monthPreparation.ready(), completed: monthPreparation.ready().length, ready: true,
        error: safeVisibleErrorMessage(reason, "重点月份暂未整理完成，已保留本命与年度结论。") });
    });
    return () => { current = false; };
  }, [monthPreparation, keyMonthRequestKey, keyMonthFacts, queryYear, plannedKeyYearsKey]);
  const keyMonthReady = keyMonthResult?.key === keyMonthRequestKey && keyMonthResult.facts === keyMonthFacts && keyMonthResult.ready;
  const keyMonthLoading = !!keyMonthRequestKey && plannedKeyYears.length > 0 && !keyMonthReady;
  const keyMonthError = keyMonthResult?.key === keyMonthRequestKey && keyMonthResult.facts === keyMonthFacts ? keyMonthResult.error : null;
  const keyMonthYears = keyMonthReady && !keyMonthError ? keyMonthResult.years : null;
  const briefResult = useMemo(() => {
    if (!baseBriefResult.value || !keyMonthYears?.length || !assessment || !annual) return baseBriefResult;
    try { return { value: observeSaveRender("brief_render", () => buildBriefReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, life, lifeStageStory,
      lifeStageYears, monthly, monthlyDomains, annualScenarios, timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory,
      personalReading, contextual, synthesis, priorities, keyMonthYears })), error: null }; }
    catch (reason) { return { value: baseBriefResult.value, error: safeVisibleErrorMessage(reason, "关键月份未通过来源核对，已保留原年度结论。") }; }
  }, [baseBriefResult, keyMonthYears, assessment, annual, revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly,
    monthlyDomains, annualScenarios, timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading, contextual, synthesis, priorities]);
  const requestFeedback = (id: string) => setFeedbackTarget((previous) => ({ id, requestId: (previous?.requestId ?? 0) + 1 }));
  const [timeUncertainty, setTimeUncertainty] = useState<ReadingTimeUncertainty | undefined>();
  const explanationGeneratedAt = useMemo(() => new Date().toISOString(), [baseBriefResult.value, timeUncertainty]);
  const reportInputToken = useMemo(() => ({}), [baseBriefResult.value, monthPreparation, timeUncertainty, queryYear]);
  const currentReportInput = useRef(reportInputToken);
  currentReportInput.current = reportInputToken;
  const explanationResult = useMemo(() => {
    if (!briefResult.value || !assessment) return { value: null, error: null };
    try { return { value: observeSaveRender("explanation_render", () => buildReadingExplanationIndex({ report: briefResult.value!, revision, assessment, synthesis,
      context: contextual?.contextSource ?? null, generatedAt: explanationGeneratedAt, reportVersion: LOCAL_READING_EDITION_VERSION,
      timeUncertainty })), error: null }; }
    catch (reason) { return { value: null, error: safeVisibleErrorMessage(reason, "逐条依据暂未整理完成，原报告仍可阅读。") }; }
  }, [briefResult.value, revision, assessment, synthesis, contextual, explanationGeneratedAt, timeUncertainty]);
  // Preserve the topic component while a new year is calculated; its old result
  // is hidden during the transition, never presented as the requested year.
  const lastExplanation = useRef(explanationResult.value);
  if (explanationResult.value) lastExplanation.current = explanationResult.value;
  const displayedExplanation = explanationResult.value ?? (lastExplanation.current?.sourceSnapshot.revisionId === revision.id ? lastExplanation.current : null);
  const prepareCompleteReport = async (timing?: ReadingSaveTiming, publishPreparedMonths = true) => {
    requireCompleteReading();
    if (!briefResult.value || briefResult.error) throw new Error(briefResult.error ?? "完整主报告仍在整理，请稍后保存。");
    if (!monthPreparation || !annual) throw new Error("年度与月份来源尚未准备好。");
    if (!assessment) throw new Error("当前命局解读尚未生成。");
    if (annualScenariosResult.error) throw new Error(annualScenariosResult.error);
    if (timelineResult.error) throw new Error(timelineResult.error);
    if (annualDomainsResult.error) throw new Error(annualDomainsResult.error);
    if (monthlyDomainsResult.error) throw new Error(monthlyDomainsResult.error);
    if (annualEventsResult.error) throw new Error(annualEventsResult.error);
    if (annual && !annualEvents) throw new Error("年度应事情境仍在整理，请稍后保存完整解读。");
    if (synthesisResult.error || prioritiesResult.error) throw new Error(synthesisResult.error ?? prioritiesResult.error!);
    setCompletePreparing(true);
    try {
      timing?.count({ plannedYears: annual.years.length, readyYearsBefore: monthPreparation.ready().length });
      timing?.end(); // preconditions stop immediately before the complete month wait.
      const allKeyMonths = timing ? await timing.measureAsync("month_preparation", () => monthPreparation.all()) : await monthPreparation.all();
      timing?.count({ preparedYears: allKeyMonths.length, preparedMonths: allKeyMonths.reduce((sum, item) => sum + item.monthly.months.length, 0) });
      if (!active.current || currentReportInput.current !== reportInputToken) throw new Error("准备期间命盘、背景或年份已变化，本次没有保存旧请求；请在当前页面重新操作。");
      if (allKeyMonths.length !== annual.years.length || annual.years.some(year => !allKeyMonths.some(prepared => prepared.year === year.year))) {
        throw new Error("年度范围内的月份尚未全部核对，未生成不完整报告。");
      }
      // A save uses these complete sources directly and immediately refreshes
      // records afterwards. Publishing them here would rebuild the visible
      // report/index during compression, only to invalidate that state again.
      // Explicit full-year reading and export still publish every prepared year.
      if (publishPreparedMonths) setKeyMonthResult({ key: keyMonthRequestKey, facts: keyMonthFacts, years: allKeyMonths, completed: allKeyMonths.length, ready: true, error: null });
      return buildLocalReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly, monthlyDomains,
      annualScenarios, timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading: requirePersonalReading(),
      contextual: requireContextualReading(), synthesis, priorities, keyMonthYears: allKeyMonths, explanationGeneratedAt, explanationTimeUncertainty: timeUncertainty }, timing);
    } finally { if (active.current) setCompletePreparing(false); }
  };
  // Finish at a React commit containing the refreshed records and their current
  // derived personal/context/index state. This is not a browser-paint timestamp.
  useEffect(() => {
    const pending = saveTiming.current;
    if (!pending?.record || pending.timing.snapshot().stages.find(stage => stage.stage === "page_refresh")?.status !== "running") return;
    if (recordsError || personalError || contextError || contextualResult.error || briefResult.error || explanationResult.error || keyMonthError) {
      finishSaveTiming("failed"); return;
    }
    if (recordsLoading || reportLoading || keyMonthLoading || completePreparing || !personalReadingReady || !explanationResult.value) return;
    if (records.some(record => record.id === pending.record!.id && record.body === pending.record!.body)) finishSaveTiming("succeeded");
  });
  const saveCompleteReport = async () => {
    const timing = saveDiagnosticsEnabled ? createReadingSaveTiming(++saveTimingSequence.current) : undefined;
    if (timing) {
      finishSaveTiming("cancelled");
      saveTiming.current = { timing, record: null };
      timing.start("preconditions");
      setSaveTimingSnapshot(timing.snapshot());
    }
    try {
      await saveRecord(async () => {
        const report = await prepareCompleteReport(timing, false);
        timing?.count({ readingCharacters: report.reading.length, archiveCharacters: report.archive.length });
        const encode = async () => packReadingSnapshot(await encodeReadingReportBundle(report));
        const body = timing ? await timing.measureAsync("encoding_compression", encode) : await encode();
        timing?.count({ storedCharacters: body.length });
        return body;
      }, LOCAL_READING_SNAPSHOT_TAG, [], timing);
    } catch (error) {
      if (timing && saveTiming.current?.timing === timing) finishSaveTiming("failed");
      throw error;
    }
  };
  const exportCompleteReport = async (format: "reading" | "archive") => {
    try {
      const report = await prepareCompleteReport();
      setExportArtifact({ blob: new Blob([report[format]], { type: "text/markdown;charset=utf-8" }),
        filename: `hakimi-${format === "reading" ? "reading" : "reading-archive"}-${revision.id}.md`,
        title: format === "reading" ? "完整命理解读" : "完整判断与依据档案",
        description: format === "reading"
          ? "按命局、人生阶段、逐年与流月连续阅读，保留本次个人修订和对应条件。"
          : "本次全部原始判断、来源、计算条件与版本记录，供逐项对照。",
        sharePolicy: "blocked_sensitive" });
      setExportError(null);
    } catch (reason) { setExportError(safeVisibleErrorMessage(reason, "解读文件暂未生成，请稍后再试。")); }
  };

  if (!assessment) return <section className="reading-unavailable" role="alert"><h1>命局解读暂不可用</h1>
    <p>{assessmentResult.error}</p><button className="secondary-action" onClick={props.onOpenDetails}>查看原始命盘</button></section>;
  return <PersonalReadingProvider reading={personalReading} onAdopt={props.readOnly ? undefined : adoptPersonalRevision}>
    <ContextualReadingProvider readings={contextual?.readings ?? []} contextRef={contextual?.contextSource.reference} referenceYear={contextual?.referenceYear} onFeedback={props.readOnly ? undefined : requestFeedback}>
    <div className="local-reading-document" aria-busy={reportLoading || completePreparing} onClickCapture={event => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#reading-"]') : null;
      const href = link?.getAttribute("href");
      if (!href) return;
      const target = document.getElementById(href.slice(1));
      if (!target || !event.currentTarget.contains(target)) return;
      let ancestor = target.parentElement;
      while (ancestor && ancestor !== event.currentTarget) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
    }}>
    {props.readOnly ? <p className="reading-readonly" role="status">此命盘已在回收站，当前可阅读已有解读。</p> : null}
    {comprehensiveResult.error ? <p className="reading-readonly" role="alert">{comprehensiveResult.error}</p> : null}
    {timelineResult.error ? <p className="reading-readonly" role="alert">{timelineResult.error}</p> : null}
    {annualDomainsResult.error ? <p className="reading-readonly" role="alert">{annualDomainsResult.error}</p> : null}
    {exportError ? <p className="reading-readonly" role="alert">{exportError}</p> : null}
    {currentPersonalResult?.error ? <p className="reading-readonly" role="alert">{currentPersonalResult.error}</p> : null}
    {synthesisResult.error ? <p className="reading-readonly" role="alert">{synthesisResult.error}</p> : null}
    {prioritiesResult.error ? <p className="reading-readonly" role="alert">{prioritiesResult.error}</p> : null}
    {briefResult.error ? <p className="reading-readonly" role="alert">{briefResult.error}</p> : null}
    {explanationResult.error ? <p className="reading-readonly" role="alert">{explanationResult.error}</p> : null}
    {keyMonthLoading ? <p className="reading-readonly" role="status">正在整理 {queryYear} 年的关键月份，本命与年度结论可先阅读。</p> : null}
    {completePreparing ? <p className="reading-readonly" role="status">正在补齐完整报告所需的 {plannedKeyYears.length} 年月份，完成核对后才会保存或导出。</p> : null}
    {keyMonthError ? <p className="reading-readonly" role="alert">{keyMonthError}</p> : null}
    <ReadingSectionNavigation canGiveFeedback={!props.readOnly} />
    <ChartReadingWorkbench revision={revision} caseName={props.caseName} assessment={assessment}
      comprehensive={comprehensive} synthesis={synthesis} briefReport={briefResult.value} priorities={priorities} annualEvents={annualEvents}
      explanationPanel={displayedExplanation ? <ReadingExplanationWorkbench index={displayedExplanation} revision={revision}
        records={caseRecords} onTimeUncertaintyChange={setTimeUncertainty} onRequestYear={selectYear} monthsLoading={keyMonthLoading}
        loading={!explanationResult.value || reportLoading} /> : undefined}
      onPrepareCompleteReading={() => { void prepareCompleteReport().catch(reason => setExportError(safeVisibleErrorMessage(reason, "完整年月暂未准备好，已保留当前专题。"))); }}
      annualLifeStories={navigationStories} annualLifeStoryPersonalSources={annualLifePersonalResult.value}
      extraFeedbackChoices={feedbackChoices} feedbackTarget={feedbackTarget} reportLoading={reportLoading || completePreparing}
      selectedYear={queryYear} onSelectYear={selectYear}
      annualOutlook={annual} lifeOutlook={life} timeline={timeline} annualLoading={annualLoading} annualError={annualError}
      decorativeImageUrl={mountainsUrl} onOpenDetails={props.onOpenDetails} onOpenTransit={props.onOpenTransit}
      onEditBirthData={props.readOnly ? undefined : props.onEditBirthData}
      onExportReading={() => { void exportCompleteReport("reading"); }}
      onExportArchive={() => { void exportCompleteReport("archive"); }}
      onSaveReading={props.readOnly ? undefined : saveCompleteReport}
      onAddFeedback={props.readOnly ? undefined : (draft) => {
        if (!draft.subjectId) return saveRecord(buildLocalReadingFeedback(assessment, draft.originalConclusion, draft.actualSituation), LOCAL_READING_FEEDBACK_TAG);
        const choice = buildReadingFeedbackChoices(assessment, annual, feedbackChoices).find((item) => item.id === draft.subjectId);
        if (!choice || choice.originalConclusion !== draft.originalConclusion
          || JSON.stringify(choice.sourceVersions ?? []) !== JSON.stringify(draft.sourceVersions ?? [])) throw new Error("原结论或对应版本已变化，请重新选择后保存；输入内容可保留。");
        return saveRecord(buildStructuredReadingFeedback(assessment, { ...draft, subjectLabel: choice.label, sourceVersions: choice.sourceVersions }), LOCAL_READING_FEEDBACK_TAG);
      }} />
    <details className="reading-extended-details" id="reading-extended-details"><summary>展开大运、逐年与月份详读</summary>
    <DetailedOutlookPanel revision={revision} assessment={assessment} life={life} monthly={monthly} year={queryYear}
      selectedDecadeId={displayedDecadeId} onSelectDecade={selectDecade} lifeStageYears={lifeStageYears}
      lifeStageYearPersonalSources={stageYearPersonalResult.value} lifeStageYearsError={stageYearPersonalResult.error ?? lifeStageYearsResult.error} stageAnnualRange={stageAnnualRange}
      stageAnnualRangeLoading={annualWindow.kind === "stage" && annualLoading} onYearChange={selectYear} annualYears={annual?.years ?? []} sources={assessment.sources}
      monthlyDomains={monthlyDomains} annualMonthStory={annualMonthStory} lifeStageStory={lifeStageStory} personalReading={personalReading} personalReadingReady={personalReadingReady} personalLegacySource={personalLegacySource}
      annualYear={selectedAnnual} annualScenarios={annualScenarios?.years.find((entry) => entry.year === queryYear)?.scenarios ?? []}
      annualDomainReading={annualDomains?.years.find((entry) => entry.year === queryYear) ?? null}
      annualEventReading={annualEvents?.years.find((entry) => entry.year === queryYear) ?? null}
      annualLifeStory={selectedAnnualLifeStory} annualLifeStoryError={annualLifeStoriesResult.error ?? annualLifePersonalResult.error}
      annualLifeStories={navigationStories}
      annualLifeStoryPersonalSources={annualLifePersonalResult.value}
      onFeedbackDomain={props.readOnly ? undefined : requestFeedback}
      annualLoading={annualLoading} annualError={annualError ?? annualDomainsResult.error ?? annualScenariosResult.error ?? annualEventsResult.error}
      lifeLoading={lifeLoading} monthlyLoading={monthlyLoading} lifeError={lifeError ?? lifeStageStoryResult.error} monthlyError={monthlyError ?? monthlyDomainsResult.error ?? annualMonthStoryResult.error} />
    </details>
    <details className="reading-extended-details"><summary>补充生活背景，让解读更贴近自己</summary>
    <ReadingContextPanel contextKey={`${revision.caseId}:${revision.id}`} context={currentContext?.context ?? null} defaultYear={currentYear}
      loading={contextLoading} readOnly={props.readOnly} error={contextError ?? contextualResult.error} onReload={() => refreshRecords()}
      onSave={props.readOnly ? undefined : saveReadingContext}
      onClear={props.readOnly ? undefined : () => saveReadingContext({ work: "unspecified", relationship: "unspecified", notes: "",
        fromYear: currentContext?.context.fromYear ?? currentYear, toYear: currentContext?.context.toYear ?? currentYear })} />
    {currentContext && !contextLoading && !contextError && !contextualResult.error && !contextual?.readings.length
      ? <p className="outlook-period">当前年份与年龄范围没有可套用的职业或关系身份，以上保留完整通用解读。</p> : null}
    </details>
    {exportArtifact ? <PreparedFileDeliveryDialog presentation="reading" artifact={exportArtifact} exportPort={webReportExportPort} onClose={() => setExportArtifact(null)} /> : null}
    <details className="reading-extended-details" id="reading-case-review"><summary>围绕一条已保存结论复盘</summary>
      <ReadingCaseReviewPanel caseId={revision.caseId} records={caseRecords} readOnly={props.readOnly || recordsLoading || !!recordsError} onReload={() => refreshRecords()} />
    </details>
    <section className="reading-saved-records" id="reading-records" tabIndex={-1} aria-labelledby="reading-saved-title">
      <div><h2 id="reading-saved-title">这张命盘的已存报告</h2>
        <div><AppLink className="text-link" href={`/reports?case=${encodeURIComponent(revision.caseId)}`}>前往我的报告</AppLink><button className="text-button" onClick={() => void refreshRecords()}>重新读取记录</button></div></div>
      {recordsLoading ? <p role="status">正在读取记录…</p> : null}
      {recordsError ? <p role="alert">{recordsError} <button className="text-button" onClick={() => void refreshRecords()}>重新读取</button></p> : null}
      {!recordsLoading && !recordsError && !records.some((record) => record.lifecycle === "active") ? <p>保存解读或提交反馈后，会显示在这里，方便下次核对。</p> : null}
      {records.filter((record) => record.lifecycle === "active" && record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)).map((record) => <ReadingSavedRecord key={record.id} record={record} reportLabel="阅读报告" />)}
      <details className="reading-fold"><summary>反馈、个人修订与补充资料</summary>
        <PersonalReadingOverview />
        <button className="text-button" onClick={props.onOpenRecords}>管理全部记录</button>
        {records.filter((record) => record.lifecycle === "active" && !record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)).map((record) => <ReadingSavedRecord key={record.id} record={record} relatedRecords={records}
          onAppendReview={props.readOnly ? undefined : (draft, expectedLatestId) => appendReview(record, draft, expectedLatestId)} />)}
      </details>
    </section>
    {saveDiagnosticsEnabled ? <details className="reading-extended-details" data-testid="reading-save-diagnostics">
      <summary>保存耗时诊断（仅开发环境）</summary>
      <p>只记录本次操作的阶段耗时和数量；页面刷新指当前数据完成 React 提交，不代表屏幕绘制时间。</p>
      {saveTimingSnapshot ? <pre>{JSON.stringify(saveTimingSnapshot, null, 2)}</pre> : <p>尚未执行完整保存。</p>}
    </details> : null}
  </div></ContextualReadingProvider></PersonalReadingProvider>;
}

export function LocalReadingContainer(props: Props) {
  return <LocalReadingContent key={`${props.revision.caseId}:${props.revision.id}:${props.revision.manifest.resultHash}`} {...props} />;
}
