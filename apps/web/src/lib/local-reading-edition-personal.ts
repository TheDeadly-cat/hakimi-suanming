import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";
import type { LocalPersonalReadingEntry } from "./local-personal-reading";
import { assertPersonalReadingLegacyBindings, legacyAnnualInputFromExtras } from "./local-personal-reading-legacy";
import { buildReadingFeedbackChoices, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { summarizeAnnualJudgmentCaptions, READING_YEAR_SUMMARY_VERSION } from "./outlook-judgment-presentation";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { monthlyDomainFeedbackText } from "./local-monthly-domain-record";
import { annualEventFeedbackSubjectId, annualEventFeedbackText } from "./local-annual-event-record";
import { annualEventCompositionChoices } from "./local-annual-event-composition-record";
import { contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { annualMonthStoryEntries, annualMonthStorySubjectId, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions } from "./local-annual-month-story-record";
import { lifeStageStoryEntries, lifeStageStorySubjectId, lifeStageStoryTransitionSubjectId, lifeStageStoryFeedbackText, lifeStageStoryTransitionText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";
import { lifeStageYearSubjectId, lifeStageYearFeedbackText, lifeStageYearFeedbackVersions } from "./local-life-stage-years-record";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions } from "./annual-life-story-record";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "./local-reading-timeline-record";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const versions = (items: readonly string[]) => [...new Set(items)].sort();

/** Register the existing feedback identities, never create an edition-specific
 * replacement for the original conclusion. Only current, explicitly adopted
 * text may suppress an automatic paragraph in the new reading view. */
export function editionPersonalEntries(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null, e: LocalReadingSnapshotExtras): Map<string, LocalPersonalReadingEntry> {
  const result = new Map<string, LocalPersonalReadingEntry>(), personal = e.personalReading;
  if (!personal) return result;
  assertPersonalReadingLegacyBindings(personal, legacyAnnualInputFromExtras(assessment, annual, e));
  const source = personal.sourceBinding;
  if (!e.sourceRevision || source.caseId !== e.sourceRevision.caseId || source.revisionId !== assessment.sourceBinding.revisionId
    || source.chartResultHash !== assessment.sourceBinding.chartResultHash || source.includeHour !== assessment.sourceBinding.includeHour) throw new Error("通读成稿的个人阅读来源不一致。");
  const extra: ReadingFeedbackChoice[] = [];
  const add = (id: string, originalConclusion: string, sourceVersions: string[]) => extra.push({ id, label: id, originalConclusion, sourceVersions });
  const { comprehensive: c, life, monthly, timeline, contextual, annualDomains, monthlyDomains, annualEvents, annualMonthStory: monthStory, lifeStageStory: stageStory, lifeStageYears: stageYears, annualLifeStories } = e;
  if (annual) add("annual-overview", `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${annual.version}`, [annual.version, READING_YEAR_SUMMARY_VERSION]);
  if (c) {
    for (const chapter of c.chapters) add(`chapter-${chapter.id}`, `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${c.version}`, [c.version]);
    for (const entry of c.usefulGuidance?.entries ?? []) add(`useful-stem-${entry.id}`, `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map((condition) => `条件：${condition}`).join("\n")}\n取用解读规则：${c.usefulGuidance!.version}\n综合解读规则：${c.version}`, [c.version, c.usefulGuidance!.version]);
  }
  if (life) {
    add("life-overview", `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`, [life.version]);
    for (const item of life.decades) add(`decade-${item.id}`, `${item.headline}\n${item.branchLabel} · ${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${life.version}`, [life.version]);
  }
  if (monthly) for (const item of monthly.months) add(`month-${item.id}`, `${monthly.year}年 ${item.headline}\n${item.startInstant} 至 ${item.endExclusiveInstant}\n${item.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(item.judgment)}\n岁运解读规则：${monthly.version}`, [monthly.version]);
  if (timeline) {
    for (const branch of timeline.branches) add(readingTimelineNarrativeSubjectId(timeline, branch), readingTimelineNarrativeText(timeline, branch), [timeline.version, ...timeline.sourceVersions]);
    for (const stage of timeline.stages) add(`timeline-stage-${stage.id}`, `${readingTimelineStageText(stage)}\n阶段解读规则：${timeline.version}\n来源解读版本：${timeline.sourceVersions.join("、")}`, [timeline.version, ...timeline.sourceVersions]);
  }
  if (contextual) for (const item of contextual.readings) add(item.subjectId, contextualFeedbackText(item, contextual), contextualFeedbackVersions(item, contextual));
  for (const reading of annualDomains?.years ?? []) for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    add(`annual-domain-${reading.year}-${segment.id}-${domain.id}`, annualDomainFeedbackText(reading, branch, segment, domain), [reading.version, ...reading.sourceVersions]);
  if (monthlyDomains) for (const reading of monthlyDomains.months) for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    add(`monthly-domain-${reading.monthId}-${segment.id}-${domain.id}`, monthlyDomainFeedbackText(monthlyDomains, reading, branch, segment, domain), [monthlyDomains.version, ...monthlyDomains.sourceVersions]);
  if (annualEvents) for (const reading of annualEvents.years) for (const branch of reading.branches) for (const segment of branch.segments) for (const item of segment.items)
    add(annualEventFeedbackSubjectId(reading.year, segment, item), annualEventFeedbackText(reading, branch, segment, item), [annualEvents.version, ...reading.sourceVersions]);
  extra.push(...annualEventCompositionChoices(annualEvents ?? null));
  if (monthStory) for (const { month, branch, period, domain } of annualMonthStoryEntries(monthStory)) add(annualMonthStorySubjectId(monthStory, month, period, domain), annualMonthStoryFeedbackText(monthStory, month, branch, period, domain), annualMonthStoryFeedbackVersions(monthStory));
  if (stageStory) for (const entry of lifeStageStoryEntries(stageStory)) {
    if (entry.kind === "stage") add(lifeStageStorySubjectId(stageStory, entry.stage), lifeStageStoryFeedbackText(stageStory, entry.branch, entry.stage), lifeStageStoryFeedbackVersions(stageStory));
    else add(lifeStageStoryTransitionSubjectId(stageStory, entry.transition), lifeStageStoryTransitionText(stageStory, entry.transition), lifeStageStoryFeedbackVersions(stageStory));
  }
  if (stageYears) for (const year of stageYears.years) add(lifeStageYearSubjectId(stageYears, year), lifeStageYearFeedbackText(stageYears, year), lifeStageYearFeedbackVersions(stageYears, year));
  if (annualLifeStories) for (const story of annualLifeStories.years) for (const branch of story.branches) for (const segment of branch.segments)
    add(annualLifeStorySubjectId(story, segment), annualLifeStoryFeedbackText(story, segment), annualLifeStoryFeedbackVersions(story, segment));
  if (e.annualScenarios) for (const year of e.annualScenarios.years) for (const item of year.scenarios) add(`event-${year.year}-${item.id}`, `${year.year}年 · ${item.title}\n${item.summary}\n${item.examples.map((text) => `情境例：${text}`).join("\n")}\n${item.conditions.map((text) => `条件：${text}`).join("\n")}\n情境标识：${item.id}\n年度情境规则：${e.annualScenarios.version}`, [e.annualScenarios.version]);
  const choices = new Map<string, ReadingFeedbackChoice>();
  for (const choice of buildReadingFeedbackChoices(assessment, annual, extra)) {
    const previous = choices.get(choice.id);
    if (previous && (previous.originalConclusion !== choice.originalConclusion || stable(versions(previous.sourceVersions ?? [])) !== stable(versions(choice.sourceVersions ?? [])))) throw new Error("通读成稿的原文主题存在歧义。");
    choices.set(choice.id, choice);
  }
  const seen = new Set<string>();
  for (const entry of personal.entries) {
    if (seen.has(entry.subjectId)) throw new Error("通读成稿的个人主题重复。");
    seen.add(entry.subjectId);
    if (entry.state !== "adopted") continue;
    const choice = choices.get(entry.subjectId);
    if (!choice || choice.originalConclusion !== entry.originalConclusion || stable(versions(choice.sourceVersions ?? [])) !== stable(versions(entry.readingVersions))
      || !entry.personalText || entry.personalText !== entry.effectiveConclusion || entry.issues.length || !entry.selectedReviewRefs.length
      || entry.selectedReviewRefs.some((ref) => !entry.feedback.some((feedback) => stable(feedback.latestReviewRef) === stable(ref) && feedback.reviewState === "revised"
        && feedback.revisedConclusion === entry.personalText && feedback.canReview && !feedback.chainIssues.length))) throw new Error("通读成稿的个人采用与当前原文、版本或复核链不一致。");
    result.set(entry.subjectId, entry);
  }
  return result;
}
