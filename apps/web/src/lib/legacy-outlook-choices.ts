import type { LegacyAnnualReadingInput, LegacyAnnualReadingChoice, LegacyAnnualReadingScope, LegacyAnnualSegmentScope, LegacyAnnualReadingFilter } from "./legacy-annual-reading-profile";
import type { ReadingFeedbackChoice } from "./local-reading-feedback";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { monthlyDomainFeedbackText } from "./local-monthly-domain-record";
import { READING_YEAR_SUMMARY_VERSION, summarizeAnnualJudgmentCaptions } from "./outlook-judgment-presentation";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "./local-reading-timeline-record";
import * as currentTimeline from "./local-reading-timeline";
import * as oldTimeline from "./legacy-outlook-v09/local-reading-timeline";
import * as currentStage from "./local-life-stage-story-record";
import * as oldStage from "./legacy-outlook-v09/local-life-stage-story-record";
import * as currentScenarios from "./annual-event-scenarios";
import * as oldScenarios from "./legacy-outlook-v09/annual-event-scenarios";

/** Exact existing container choices; no new subject or inferred old text. */
export function outlookChoices(input: LegacyAnnualReadingInput, frozen: boolean, filter?: LegacyAnnualReadingFilter): LegacyAnnualReadingChoice[] {
  const { revision, assessment, annual, life, monthly, monthlyDomains, lifeStageStory } = input;
  const result: LegacyAnnualReadingChoice[] = [];
  const prefixes: Record<string, string> = { "annual-overview": "annual-overview", trajectory: "trajectory-", "timeline-stage": "timeline-stage-", scenario: "event-",
    "life-overview": "life-overview", decade: "decade-", "life-stage": "life-stage-story-", "life-transition": "life-stage-transition-", month: "month-", "monthly-domain": "monthly-domain-" };
  const wanted = (...families: string[]) => families.some((family) => (!filter?.families || filter.families.some((value) => value === family))
    && (!filter?.subjectIds || filter.subjectIds.some((subject) => subject.startsWith(prefixes[family]!))));
  const referenceYear = life ? new Date(Date.parse(life.referenceInstant) + 8 * 3600000).getUTCFullYear() : annual?.startYear ?? monthly?.year ?? 0;
  const add = (choice: ReadingFeedbackChoice, family: LegacyAnnualReadingScope["family"], details: Partial<LegacyAnnualReadingScope> = {}) => result.push({ ...choice,
    legacyScope: { sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour },
      family, year: referenceYear, branchId: null, segmentId: null, startInstant: null, endExclusiveInstant: null, personalStartInstant: null,
      targetRef: null, backgroundRefs: [], contextRef: null, domainId: null, itemIds: [], monthId: null, decadeId: null, stageRef: null, segments: [], ...details } });
  const annualSegments = (years = annual?.years ?? []): LegacyAnnualSegmentScope[] => years.flatMap((year) => year.judgmentSegments.map((part) => ({
    branchId: part.branchId, segmentId: part.id, startInstant: part.startInstant, endExclusiveInstant: part.endExclusiveInstant,
    personalStartInstant: null, targetRef: part.judgment.targetRef, backgroundRefs: part.judgment.backgroundRefs })));
  if (annual && wanted("annual-overview", "trajectory", "timeline-stage", "scenario")) {
    const segments = annualSegments();
    add({ id: "annual-overview", label: `${annual.startYear}—${annual.endYear} 年份总览`,
      originalConclusion: `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${annual.version}`,
      sourceVersions: [annual.version, READING_YEAR_SUMMARY_VERSION] }, "annual-overview", { year: annual.startYear, segments });
    if (wanted("trajectory", "timeline-stage")) {
    const timeline = (frozen ? oldTimeline : currentTimeline).buildReadingTimeline({ revision, annual, life });
    for (const branch of timeline.branches) add({ id: readingTimelineNarrativeSubjectId(timeline, branch),
      label: `${timeline.startYear}—${timeline.endYear}年走势总评${timeline.branches.length > 1 ? ` · ${branch.label}` : ""}`,
      originalConclusion: readingTimelineNarrativeText(timeline, branch), sourceVersions: [timeline.version, ...timeline.sourceVersions] }, "trajectory", {
      year: annual.startYear, branchId: branch.id, segments: segments.filter((part) => part.branchId === branch.id) });
    for (const stage of timeline.stages) add({ id: `timeline-stage-${stage.id}`,
      label: `阶段解读 · ${stage.headline}${timeline.branches.length > 1 ? ` · ${timeline.branches.find((branch) => branch.id === stage.branchId)?.label ?? stage.branchId}` : ""}`,
      originalConclusion: `${readingTimelineStageText(stage)}\n阶段解读规则：${timeline.version}\n来源解读版本：${timeline.sourceVersions.join("、")}`,
      sourceVersions: [timeline.version, ...timeline.sourceVersions] }, "timeline-stage", { year: annual.startYear, branchId: stage.branchId,
      startInstant: stage.startInstant, endExclusiveInstant: stage.endExclusiveInstant,
      segments: segments.filter((part) => part.branchId === stage.branchId && stage.yearLinks.some((link) => link.startInstant === part.startInstant && link.endExclusiveInstant === part.endExclusiveInstant)) });
    }
    if (wanted("scenario")) for (const year of annual.years) for (const scenario of (frozen ? oldScenarios : currentScenarios).buildAnnualEventScenarios(revision, assessment, year)) {
      add({ id: `event-${year.year}-${scenario.id}`, label: `${year.year}年情境 · ${scenario.title}`,
        originalConclusion: `${year.year}年 · ${scenario.title}\n${scenario.summary}\n${scenario.examples.map((text) => `情境例：${text}`).join("\n")}\n${scenario.conditions.map((text) => `条件：${text}`).join("\n")}\n情境标识：${scenario.id}\n年度情境规则：${currentScenarios.ANNUAL_EVENT_SCENARIOS_VERSION}`,
        sourceVersions: [currentScenarios.ANNUAL_EVENT_SCENARIOS_VERSION] }, "scenario", { year: year.year, targetRef: year.transitNodeRef,
        startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant, segments: annualSegments([year]) });
    }
  }
  if (life && wanted("life-overview", "decade")) {
    add({ id: "life-overview", label: "当前阶段与交运总览", originalConclusion: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`,
      sourceVersions: [life.version] }, "life-overview", { referenceInstant: life.referenceInstant });
    for (const item of life.decades) add({ id: `decade-${item.id}`, label: `${item.startYear}—${item.endYear} ${item.ganZhi}大运${life.branches.length > 1 ? ` · ${item.branchLabel}` : ""}`,
      originalConclusion: `${item.headline}\n${item.branchLabel} · ${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${life.version}`,
      sourceVersions: [life.version] }, "decade", { year: item.startYear, branchId: item.branchId, startInstant: item.startInstant,
        endExclusiveInstant: item.endExclusiveInstant, targetRef: item.nodeRef, stageRef: item.nodeRef, decadeId: item.id });
  }
  if (lifeStageStory && wanted("life-stage", "life-transition")) {
    const record = frozen ? oldStage : currentStage;
    for (const entry of record.lifeStageStoryEntries(lifeStageStory)) if (entry.kind === "stage") {
      const stage = entry.stage;
      add({ id: record.lifeStageStorySubjectId(lifeStageStory, stage), label: `阶段主线 · ${stage.ganZhi}大运 · ${stage.headline}${lifeStageStory.branches.length > 1 ? ` · ${entry.branch.label}` : ""}`,
        originalConclusion: record.lifeStageStoryFeedbackText(lifeStageStory, entry.branch, stage), sourceVersions: record.lifeStageStoryFeedbackVersions(lifeStageStory) }, "life-stage", {
        year: new Date(Date.parse(stage.startInstant) + 8 * 3600000).getUTCFullYear(), branchId: stage.branchId, startInstant: stage.startInstant,
        endExclusiveInstant: stage.endExclusiveInstant, targetRef: stage.nodeRef, stageRef: stage.nodeRef, decadeId: stage.decadeId });
    } else {
      const item = entry.transition;
      add({ id: record.lifeStageStoryTransitionSubjectId(lifeStageStory, item), label: `交运变化 · ${item.headline}${lifeStageStory.branches.length > 1 ? ` · ${entry.branch.label}` : ""}`,
        originalConclusion: record.lifeStageStoryTransitionText(lifeStageStory, item), sourceVersions: record.lifeStageStoryFeedbackVersions(lifeStageStory) }, "life-transition", {
        year: new Date(Date.parse(item.atInstant) + 8 * 3600000).getUTCFullYear(), branchId: entry.branch.id,
        startInstant: item.atInstant, targetRef: item.toNodeRef, backgroundRefs: [item.fromNodeRef], itemIds: [item.fromDecadeId, item.toDecadeId] });
    }
  }
  if (monthly && wanted("month")) for (const item of monthly.months) add({ id: `month-${item.id}`, label: `${monthly.year}年 · ${item.label} ${item.ganZhi}`,
    originalConclusion: `${monthly.year}年 ${item.headline}\n${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${monthly.version}`,
    sourceVersions: [monthly.version] }, "month", { year: monthly.year, monthId: item.id, startInstant: item.startInstant, endExclusiveInstant: item.endExclusiveInstant,
      targetRef: item.nodeRef, segments: item.judgmentSegments.map((part) => ({ branchId: part.branchId, segmentId: part.id,
        startInstant: part.startInstant, endExclusiveInstant: part.endExclusiveInstant, personalStartInstant: part.startInstant,
        targetRef: part.judgment.targetRef, backgroundRefs: part.judgment.backgroundRefs })) });
  if (monthlyDomains && monthly && wanted("monthly-domain")) for (const reading of monthlyDomains.months) for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains) {
    const month = monthly.months.find((item) => item.id === reading.monthId);
    if (!month) throw new Error("旧月度反馈缺少原月节点。");
    add({ id: `monthly-domain-${reading.monthId}-${segment.id}-${domain.id}`,
      label: `${monthlyDomains.year}年 · ${reading.label} ${reading.ganZhi} · ${domain.title}${reading.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 3600000).toISOString().slice(0, 10)}起` : ""}`,
      originalConclusion: monthlyDomainFeedbackText(monthlyDomains, reading, branch, segment, domain), sourceVersions: [monthlyDomains.version, ...monthlyDomains.sourceVersions] }, "monthly-domain", {
      year: monthlyDomains.year, branchId: branch.id, segmentId: segment.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
      personalStartInstant: segment.personalStartInstant, monthId: reading.monthId, targetRef: month.nodeRef, backgroundRefs: segment.backgroundRefs,
      contextRef: monthlyDomains.contextRef, domainId: domain.id });
  }
  return result;
}
