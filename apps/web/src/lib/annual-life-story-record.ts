import { ANNUAL_LIFE_STORY_VERSION, buildReadingAnnualLifeStories, type AnnualLifeStory, type AnnualLifeStorySegment,
  type BuildAnnualLifeStoryInput, type BuildReadingAnnualLifeStoriesInput, type LocalReadingAnnualLifeStories } from "./annual-life-story";
import { LOCAL_ANNUAL_OUTLOOK_VERSION } from "./local-annual-outlook";
import { ANNUAL_EVENT_READING_VERSION } from "./local-annual-event-reading";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { annualEventFeedbackSubjectId, annualEventFeedbackText, READING_ANNUAL_EVENTS_VERSION } from "./local-annual-event-record";
import { annualEventCompositionChoices, annualEventCompositionSubjectId } from "./local-annual-event-composition-record";
import { contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import type { ReadingFeedbackChoice } from "./local-reading-feedback";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "./local-personal-reading";
import { assertPersonalReadingLegacyYearBindings, personalAdoptionLabel } from "./local-personal-reading-legacy";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const lines = (label: string, values: readonly string[]) => values.map((value) => `- ${label}：${value}`);
function branchFor(story: AnnualLifeStory, segment: AnnualLifeStorySegment) {
  const matches = story.branches.filter((branch) => branch.id === segment.branchId
    && branch.segments.filter((item) => item.id === segment.id && stable(item) === stable(segment)).length === 1);
  if (story.version !== ANNUAL_LIFE_STORY_VERSION || matches.length !== 1) throw new Error("年度总评与原年份、分支或分段不一致。");
  return matches[0]!;
}
export function annualLifeStorySubjectId(story: AnnualLifeStory, segment: AnnualLifeStorySegment): string {
  branchFor(story, segment);
  const id = `annual-life-story-${story.year}-${segment.branchId}-${segment.id}`;
  if (id.length > 500) throw new Error("年度总评反馈标识超过可保存范围。");
  return id;
}
export function annualLifeStoryFeedbackVersions(story: AnnualLifeStory, segment: AnnualLifeStorySegment): string[] {
  branchFor(story, segment);
  const versions = [story.version, LOCAL_ANNUAL_OUTLOOK_VERSION, ANNUAL_EVENT_READING_VERSION];
  if (versions.some((version) => !segment.sourceVersions.includes(version))) throw new Error("年度总评缺少原年度或应事情境版本。");
  return versions;
}
/** A fixed original conclusion, independent of the loaded annual window and
 * browsing instant. Full computed objects remain in their original sections. */
export function annualLifeStoryFeedbackText(story: AnnualLifeStory, segment: AnnualLifeStorySegment): string {
  const branch = branchFor(story, segment);
  return [`${story.year}年 · ${branch.label} · ${segment.headline}`, `本年干支：${story.yearGanZhi ?? "待定"}`,
    `年度总评分段：${segment.id}；分支：${segment.branchId}`,
    `${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
    `个人适用起点：${segment.personalStartInstant}；${segment.ageLabel}`, `原综合判断：${segment.caption}`,
    `大运背景：${segment.backgroundLabels.join("、")}`, `年龄语境：${JSON.stringify(segment.age)}`,
    ...segment.paragraphs.flatMap((paragraph) => [paragraph.text,
      `总评段落引用：${JSON.stringify({ id: paragraph.id, kind: paragraph.kind, sourceSubjects: paragraph.sourceSubjects,
        basisRefs: paragraph.basisRefs, eventItemIds: paragraph.eventItemIds })}`]),
    ...lines("总评条件", segment.conditions), ...lines("原分支条件", branch.conditions),
    `原年度节点：${JSON.stringify(story.yearNodeRef)}`, `原背景节点：${JSON.stringify(segment.backgroundRefs)}`,
    `原判断版本：${segment.judgmentVersion}；${segment.policyVersion}`, `原判断依据引用：${JSON.stringify(segment.basisRefs)}`,
    `原主题引用：${JSON.stringify(segment.sourceSubjects)}`, `背景引用：${JSON.stringify(story.contextRef)}`,
    `命盘来源：${JSON.stringify(story.sourceBinding)}`, `年度总评规则：${story.version}`,
    `完整本段来源版本：${JSON.stringify(segment.sourceVersions)}`].join("\n");
}
function adopted(entry: LocalPersonalReadingEntry, choice: ReadingFeedbackChoice): boolean {
  return entry.state === "adopted" && !!entry.personalText && entry.effectiveConclusion === entry.personalText && !entry.issues.length
    && entry.originalConclusion === choice.originalConclusion
    && stable([...new Set(entry.readingVersions)].sort()) === stable([...new Set(choice.sourceVersions ?? [])].sort())
    && !!entry.selectedReviewRefs.length && entry.selectedReviewRefs.every((ref) => entry.feedback.some((feedback) =>
      feedback.latestReviewRef && stable(feedback.latestReviewRef) === stable(ref) && feedback.reviewState === "revised"
      && feedback.revisedConclusion === entry.personalText && feedback.canReview && !feedback.chainIssues.length));
}
export function annualLifeStoryPersonalSources(story: AnnualLifeStory, segment: AnnualLifeStorySegment,
  personal: LocalPersonalReading | null | undefined, source: BuildAnnualLifeStoryInput): LocalPersonalReadingEntry[] {
  branchFor(story, segment);
  if (!personal || !(["caseId", "revisionId", "chartResultHash", "includeHour"] as const).every((key) => personal.sourceBinding[key] === story.sourceBinding[key])) return [];
  if (source.revision.caseId !== story.sourceBinding.caseId || source.revision.id !== story.sourceBinding.revisionId
    || source.revision.manifest.resultHash !== story.sourceBinding.chartResultHash || source.assessment.sourceBinding.includeHour !== story.sourceBinding.includeHour
    || source.year.year !== story.year || source.events.year !== story.year || source.domains.year !== story.year
    || stable(source.year.transitNodeRef) !== stable(story.yearNodeRef) || stable(source.events.sourceBinding) !== stable(story.sourceBinding)
    || stable(source.events.contextRef) !== stable(story.contextRef)) throw new Error("年度总评个人采用缺少同源年份。");
  const original = source.year.judgmentSegments.find((item) => item.id === segment.id && item.branchId === segment.branchId);
  const eventBranch = source.events.branches.find((branch) => branch.id === segment.branchId);
  const eventSegment = eventBranch?.segments.find((item) => item.id === segment.id);
  const domainBranch = source.domains.branches.find((branch) => branch.id === segment.branchId);
  const domainSegment = domainBranch?.segments.find((item) => item.id === segment.id);
  if (!original || !eventBranch || !eventSegment || !domainBranch || !domainSegment
    || [original, eventSegment, domainSegment].some((item) => item.startInstant !== segment.startInstant || item.endExclusiveInstant !== segment.endExclusiveInstant)
    || stable(original.judgment.backgroundRefs) !== stable(segment.backgroundRefs)
    || stable(eventSegment.backgroundRefs) !== stable(segment.backgroundRefs) || stable(domainSegment.backgroundRefs) !== stable(segment.backgroundRefs)) {
    throw new Error("年度总评个人采用的原分段或背景不一致。");
  }
  const ownId = annualLifeStorySubjectId(story, segment), dependencies = new Set([ownId, ...segment.sourceSubjects, ...segment.paragraphs.flatMap((paragraph) => paragraph.sourceSubjects)]);
  const choices: ReadingFeedbackChoice[] = [
    { id: ownId, label: segment.headline, originalConclusion: annualLifeStoryFeedbackText(story, segment), sourceVersions: annualLifeStoryFeedbackVersions(story, segment) },
    { id: `annual-${story.year}`, label: `${story.year}年`, sourceVersions: [LOCAL_ANNUAL_OUTLOOK_VERSION],
      originalConclusion: `${source.year.year}年 · ${source.year.label}\n${outlookJudgmentFeedbackText(source.year.judgment) || source.year.summary}\n本年自身倾向：${source.year.yearInfluence.summary}\n大运背景：${source.year.decadeInfluence.summary}\n年度规则：${LOCAL_ANNUAL_OUTLOOK_VERSION}` },
    ...domainSegment.domains.map((domain) => ({ id: `annual-domain-${story.year}-${segment.id}-${domain.id}`, label: domain.title,
      originalConclusion: annualDomainFeedbackText(source.domains, domainBranch, domainSegment, domain), sourceVersions: [source.domains.version, ...source.domains.sourceVersions] })),
    ...eventSegment.items.map((item) => ({ id: annualEventFeedbackSubjectId(story.year, eventSegment, item), label: item.title,
      originalConclusion: annualEventFeedbackText(source.events, eventBranch, eventSegment, item), sourceVersions: [READING_ANNUAL_EVENTS_VERSION, ...source.events.sourceVersions] })),
    ...annualEventCompositionChoices({ version: READING_ANNUAL_EVENTS_VERSION, sourceBinding: story.sourceBinding, startYear: story.year, endYear: story.year, years: [source.events] })
      .filter((choice) => choice.id === annualEventCompositionSubjectId(story.year, segment, { id: "settlement-closeout" }))
  ];
  const contextualIds = new Set(eventSegment.items.flatMap((item) => item.origin.contextSubjectId && dependencies.has(item.origin.contextSubjectId) ? [item.origin.contextSubjectId] : []));
  if (contextualIds.size) {
    const contextual = source.contextual;
    if (!contextual || stable(contextual.sourceBinding) !== stable(story.sourceBinding) || stable(contextual.contextSource.reference) !== stable(story.contextRef)) throw new Error("年度总评个人采用的现实背景不一致。");
    for (const id of contextualIds) {
      const matches = contextual.readings.filter((reading) => reading.subjectId === id), reading = matches[0];
      if (matches.length !== 1 || !reading || reading.scope.kind !== "annual") throw new Error("年度总评个人采用缺少背景原主题。");
      const scope = reading.scope;
      if (scope.year !== story.year || scope.branchId !== segment.branchId || scope.segmentId !== segment.id
        || scope.startInstant !== segment.startInstant || scope.endExclusiveInstant !== segment.endExclusiveInstant
        || !eventSegment.items.some((item) => item.origin.contextSubjectId === id && item.origin.sourceDomainId === scope.domainId)) throw new Error("年度总评个人采用的背景区间不一致。");
      choices.push({ id, label: reading.title, originalConclusion: contextualFeedbackText(reading, contextual), sourceVersions: contextualFeedbackVersions(reading, contextual) });
    }
  }
  assertPersonalReadingLegacyYearBindings(personal, source, [...dependencies]);
  return personal.entries.filter((entry) => dependencies.has(entry.subjectId) && choices.some((choice) => choice.id === entry.subjectId && adopted(entry, choice)));
}
export function describeReadingAnnualLifeStories(collection: LocalReadingAnnualLifeStories, source: BuildReadingAnnualLifeStoriesInput,
  personal?: LocalPersonalReading | null, referenceLines = lines): string[] {
  if (stable(collection) !== stable(buildReadingAnnualLifeStories(source))) throw new Error("年度生活总评与本次年份、分支、分段或原文不一致，已停止保存。");
  return ["## 这一年的生活总评", `总评集合版本：${collection.version}`, `命盘来源：${JSON.stringify(collection.sourceBinding)}`,
    `总评覆盖年份：${collection.startYear}—${collection.endYear}`, `完整总评来源版本：${JSON.stringify(collection.sourceVersions)}`,
    ...collection.years.flatMap((story) => {
      const summarySource = story.branches.length === 1 && story.branches[0]!.segments.length === 1
        ? story.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.paragraphs
          .filter((paragraph) => paragraph.kind === "mainline" && story.summary === `${segment.caption}。${paragraph.text}`)
          .map((paragraph) => ({ branchId: branch.id, segmentId: segment.id, paragraphId: paragraph.id, prefix: `${segment.caption}。` })))) : [];
      return [`### ${story.year}年 · ${story.headline}`,
      ...(summarySource.length === 1 ? [`年度简介引用：${JSON.stringify(summarySource[0])}`] : [story.summary]),
      `年度范围：${story.startInstant ?? "待定"} 至 ${story.endExclusiveInstant ?? "待定"}；状态：${story.status}`,
      `原年度节点：${JSON.stringify(story.yearNodeRef)}`, `背景引用：${JSON.stringify(story.contextRef)}`, `本年来源版本：${JSON.stringify(story.sourceVersions)}`,
      ...story.branches.flatMap((branch) => [`#### ${branch.label}`,
        ...branch.segments.flatMap((segment) => {
          const input: BuildAnnualLifeStoryInput = { revision: source.revision, assessment: source.assessment,
            year: source.annual.years.find((year) => year.year === story.year)!, domains: source.annualDomains.years.find((year) => year.year === story.year)!,
            events: source.annualEvents.years.find((year) => year.year === story.year)!, contextual: source.contextual };
          const adoptedSources = annualLifeStoryPersonalSources(story, segment, personal, input);
          return [...adoptedSources.flatMap((entry) => [`本段关联${personalAdoptionLabel(entry)}：${entry.subjectId}`, entry.personalText!, `个人采用引用：${JSON.stringify(entry.selectedReviewRefs)}`]),
            ...(adoptedSources.length ? ["以下自动总评保留为原计算对照，不替代相关个人修订；原主题分别保留。"] : []),
            annualLifeStoryFeedbackText(story, segment), `年度总评反馈主题：${annualLifeStorySubjectId(story, segment)}`];
        }), `本分支覆盖缺口：${JSON.stringify(branch.gaps)}`, ...referenceLines("分支条件", branch.conditions)]),
      ...referenceLines("年度总评范围", story.limitations)]; }),
    "本节只保存新增总评及精确引用；原年度判断、完整领域与事项正文仍在本报告原章节。"];
}
