import { buildLifeStageYears, LIFE_STAGE_YEARS_VERSION, type BuildLifeStageYearsInput, type LocalLifeStageYears, type LifeStageYear } from "./local-life-stage-years";
import { LIFE_STAGE_STORY_VERSION } from "./local-life-stage-story";
import { LOCAL_ANNUAL_OUTLOOK_VERSION } from "./local-annual-outlook";
import { lifeStageStoryPersonalSources } from "./local-life-stage-story-record";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { annualEventFeedbackSubjectId, annualEventFeedbackText } from "./local-annual-event-record";
import { annualEventCompositionChoices, annualEventCompositionSubjectId } from "./local-annual-event-composition-record";
import { contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { buildReadingFeedbackChoices, type ReadingFeedbackChoice } from "./local-reading-feedback";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "./local-personal-reading";
import { assertPersonalReadingLegacyBindings, personalAdoptionLabel } from "./local-personal-reading-legacy";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const lines = (label: string, values: readonly string[]) => values.map((value) => `- ${label}：${value}`);
function assertYear(bridge: LocalLifeStageYears, year: LifeStageYear): void {
  if (bridge.version !== LIFE_STAGE_YEARS_VERSION || bridge.stage.branchId !== bridge.branchId
    || bridge.years.filter((candidate) => candidate.id === year.id && stable(candidate) === stable(year)).length !== 1
    || year.id !== `${bridge.stage.decadeId}:${year.year}` || year.segments.some((segment) => segment.branchId !== bridge.branchId)) {
    throw new Error("阶段年度正文与原大运、年份或分支不一致。");
  }
}
export function lifeStageYearSubjectId(bridge: LocalLifeStageYears, year: LifeStageYear): string {
  assertYear(bridge, year);
  const id = `life-stage-year-${year.id}`;
  if (id.length > 500) throw new Error("阶段年度反馈标识超过可保存范围。");
  return id;
}
export function lifeStageYearFeedbackVersions(bridge: LocalLifeStageYears, year: LifeStageYear): string[] {
  assertYear(bridge, year);
  const versions = [bridge.version, LIFE_STAGE_STORY_VERSION, LOCAL_ANNUAL_OUTLOOK_VERSION];
  if (versions.some((version) => !year.sourceVersions.includes(version))) throw new Error("阶段年度缺少原阶段或年度版本。");
  // The complete per-year manifest remains in the original text. This direct
  // producer set stays within the existing feedback contract's twenty entries.
  return versions;
}
/** Stable original text: neither the browsing instant nor the loaded window,
 * highlights or coverage can change feedback about this exact stage-year. */
export function lifeStageYearFeedbackText(bridge: LocalLifeStageYears, year: LifeStageYear): string {
  assertYear(bridge, year);
  return [`${year.year}年 · ${bridge.branchLabel} · ${bridge.stage.ganZhi}大运 · ${year.headline}`,
    `阶段年度标识：${year.id}`, `原大运：${bridge.stage.decadeId}`,
    `原阶段范围：${bridge.stage.startInstant} 至 ${bridge.stage.endExclusiveInstant}（不含终点）`,
    `原阶段判断：${bridge.stage.caption}`, `原阶段节点：${JSON.stringify(bridge.stage.nodeRef)}`,
    `本年干支：${year.yearGanZhi}；本段年度范围：${year.startInstant} 至 ${year.endExclusiveInstant}（不含终点）`,
    ...year.paragraphs, `原年度节点：${JSON.stringify(year.yearNodeRef)}`,
    ...year.segments.flatMap((segment) => [
      `### ${segment.headline}`, `原年度分段：${segment.id}；分支：${segment.branchId}`,
      `${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
      `个人适用起点：${segment.personalStartInstant}；${segment.ageLabel}`, `年龄语境：${JSON.stringify(segment.age)}`,
      `年龄阶段：${segment.ageStage}；原综合判断：${segment.caption}`, ...segment.paragraphs,
      ...lines("可发挥之处", segment.advantages), ...lines("可能的牵制", segment.pressures), ...lines("适用条件", segment.conditions),
      `背景节点：${JSON.stringify(segment.backgroundRefs)}`,
      `原判断版本：${segment.judgmentVersion}；${segment.policyVersion}`,
      `原年度作用：${JSON.stringify(segment.annualActions)}`, `原轴作用：${JSON.stringify(segment.axisEffects)}`,
      `原判断依据引用：${JSON.stringify(segment.basisRefs)}`, `原领域引用：${JSON.stringify(segment.domainRefs)}`,
      // Full event objects are already saved once in the annual-event section.
      // Keep their exact ordered identities, and the displayed title/summary.
      ...segment.items.flatMap((item) => [`原年度事项：${item.title}`, item.summary,
        `原事项引用：${JSON.stringify({ subjectId: annualEventFeedbackSubjectId(year.year, segment, item), itemId: item.id, domain: item.domain, priority: item.priority })}`]),
      `本段原主题：${JSON.stringify(segment.sourceSubjects)}`]),
    `本年原主题：${JSON.stringify(year.sourceSubjects)}`, `背景引用：${JSON.stringify(year.contextRef)}`,
    `命盘来源：${JSON.stringify(bridge.sourceBinding)}`, `阶段年度规则：${bridge.version}`,
    `完整本年来源版本：${JSON.stringify(year.sourceVersions)}`].join("\n");
}
function adopted(entry: LocalPersonalReadingEntry, choice: ReadingFeedbackChoice): boolean {
  return entry.state === "adopted" && !!entry.personalText && entry.effectiveConclusion === entry.personalText && !entry.issues.length
    && entry.originalConclusion === choice.originalConclusion
    && stable([...new Set(entry.readingVersions)].sort()) === stable([...new Set(choice.sourceVersions ?? [])].sort())
    && !!entry.selectedReviewRefs.length && entry.selectedReviewRefs.every((ref) => entry.feedback.some((feedback) =>
      feedback.latestReviewRef && stable(feedback.latestReviewRef) === stable(ref) && feedback.reviewState === "revised"
      && feedback.revisedConclusion === entry.personalText && feedback.canReview && !feedback.chainIssues.length));
}
/** A personal change to an exact source folds this automatic bridge; it does
 * not turn the user's text into new computed annual facts or replace a sibling. */
export function lifeStageYearPersonalSources(bridge: LocalLifeStageYears, year: LifeStageYear,
  personal: LocalPersonalReading | null | undefined, source: BuildLifeStageYearsInput): LocalPersonalReadingEntry[] {
  assertYear(bridge, year);
  if (!personal || !(["caseId", "revisionId", "chartResultHash", "includeHour"] as const)
    .every((key) => personal.sourceBinding[key] === bridge.sourceBinding[key])) return [];
  if (source.revision.id !== bridge.sourceBinding.revisionId || source.revision.caseId !== bridge.sourceBinding.caseId
    || source.revision.manifest.resultHash !== bridge.sourceBinding.chartResultHash || source.selectedDecadeId !== bridge.stage.decadeId
    || source.lifeStageStory.sourceBinding.sex !== bridge.sourceBinding.sex
    || !source.lifeStageStory.branches.some((branch) => branch.id === bridge.branchId && branch.stages.some((stage) => stable(stage) === stable(bridge.stage)))) {
    throw new Error("阶段年度个人采用核对缺少同源阶段。");
  }
  const result = lifeStageStoryPersonalSources(source.lifeStageStory, bridge.stage, personal, source.life);
  const choices: ReadingFeedbackChoice[] = [{ id: lifeStageYearSubjectId(bridge, year), label: year.headline,
    originalConclusion: lifeStageYearFeedbackText(bridge, year), sourceVersions: lifeStageYearFeedbackVersions(bridge, year) },
    ...buildReadingFeedbackChoices(source.assessment, source.annual, []).filter((choice) => choice.id === `annual-${year.year}`)];
  const domains = source.annualDomains.years.find((value) => value.year === year.year);
  const events = source.annualEvents.years.find((value) => value.year === year.year);
  if (!domains || !events || stable(events.yearNodeRef) !== stable(year.yearNodeRef)) throw new Error("阶段年度个人采用核对缺少原年来源。");
  const segmentIds = new Set(year.segments.map((segment) => segment.id));
  for (const branch of domains.branches.filter((branch) => branch.id === bridge.branchId)) for (const segment of branch.segments.filter((segment) => segmentIds.has(segment.id))) {
    for (const domain of segment.domains) choices.push({ id: `annual-domain-${year.year}-${segment.id}-${domain.id}`, label: domain.title,
      originalConclusion: annualDomainFeedbackText(domains, branch, segment, domain), sourceVersions: [domains.version, ...domains.sourceVersions] });
  }
  for (const branch of events.branches.filter((branch) => branch.id === bridge.branchId)) for (const segment of branch.segments.filter((segment) => segmentIds.has(segment.id))) {
    const original = year.segments.find((item) => item.id === segment.id)!;
    if (segment.startInstant !== original.startInstant || segment.endExclusiveInstant !== original.endExclusiveInstant
      || stable(segment.items) !== stable(original.items) || stable(segment.backgroundRefs) !== stable(original.backgroundRefs)) throw new Error("阶段年度个人采用的原分段不一致。");
    for (const item of segment.items) choices.push({ id: annualEventFeedbackSubjectId(year.year, segment, item), label: item.title,
      originalConclusion: annualEventFeedbackText(events, branch, segment, item), sourceVersions: [source.annualEvents.version, ...events.sourceVersions] });
  }
  const composedChoices = annualEventCompositionChoices({ ...source.annualEvents, years: [events] });
  choices.push(...composedChoices.filter((choice) => year.segments.some((segment) => choice.id === annualEventCompositionSubjectId(year.year, segment, { id: "settlement-closeout" }))));
  const contextualIds = new Set(year.segments.flatMap((segment) => segment.items.flatMap((item) => item.origin.contextSubjectId ? [item.origin.contextSubjectId] : [])));
  if (contextualIds.size) {
    const contextual = source.contextual;
    if (!contextual || stable(contextual.contextSource.reference) !== stable(year.contextRef)
      || !(["caseId", "revisionId", "chartResultHash", "includeHour"] as const).every((key) => contextual.sourceBinding[key] === bridge.sourceBinding[key])) {
      throw new Error("阶段年度个人采用的现实背景来源不一致。");
    }
    for (const id of contextualIds) {
      const matches = contextual.readings.filter((reading) => reading.subjectId === id), reading = matches[0];
      if (matches.length !== 1 || !reading || reading.scope.kind !== "annual") throw new Error("阶段年度个人采用缺少对应背景主题。");
      const scope = reading.scope;
      if (scope.year !== year.year || scope.branchId !== bridge.branchId || !year.segments.some((segment) => segment.id === scope.segmentId
        && segment.startInstant === scope.startInstant && segment.endExclusiveInstant === scope.endExclusiveInstant
        && segment.items.some((item) => item.origin.contextSubjectId === id && item.origin.sourceDomainId === scope.domainId))) {
        throw new Error("阶段年度个人采用的背景主题区间不一致。");
      }
      choices.push({ id, label: reading.title, originalConclusion: contextualFeedbackText(reading, contextual), sourceVersions: contextualFeedbackVersions(reading, contextual) });
    }
  }
  assertPersonalReadingLegacyBindings(personal, source, choices.map((choice) => choice.id));
  return [...new Map([...result, ...personal.entries.filter((entry) => choices.some((choice) => choice.id === entry.subjectId && adopted(entry, choice)))].map((entry) => [entry.subjectId, entry])).values()];
}
export function describeLifeStageYears(bridge: LocalLifeStageYears, source: BuildLifeStageYearsInput,
  personal?: LocalPersonalReading | null, referenceLines = lines): string[] {
  if (stable(bridge) !== stable(buildLifeStageYears(source))) throw new Error("阶段年度衔接与本次大运、年度分段或原文不一致，已停止保存。");
  return ["## 大运主线与逐年衔接", `阶段年度规则：${bridge.version}`, `命盘来源：${JSON.stringify(bridge.sourceBinding)}`,
    `完整衔接来源版本：${JSON.stringify(bridge.sourceVersions)}`, `分支：${bridge.branchId} · ${bridge.branchLabel}`,
    `阶段主线引用：life-stage-story-${bridge.stage.decadeId}`, `原阶段节点：${JSON.stringify(bridge.stage.nodeRef)}`,
    bridge.headline, bridge.summary, `已载年度范围：${bridge.annualStartYear}—${bridge.annualEndYear}`,
    `覆盖记录：${JSON.stringify(bridge.coverage)}`, `阅读重点：${JSON.stringify(bridge.highlights)}`,
    ...bridge.years.flatMap((year) => {
      const adoptedSources = lifeStageYearPersonalSources(bridge, year, personal, source);
      return [`### ${year.year}年 · ${year.headline}`,
        ...adoptedSources.flatMap((entry) => [`本段关联${personalAdoptionLabel(entry)}：${entry.subjectId}`, entry.personalText!, `个人采用引用：${JSON.stringify(entry.selectedReviewRefs)}`]),
        ...(adoptedSources.length ? ["以下自动衔接保留为原计算对照，不替代个人修订。"] : []),
        lifeStageYearFeedbackText(bridge, year), `阶段年度反馈主题：${lifeStageYearSubjectId(bridge, year)}`];
    }), "原大运、年度判断和年度事项完整正文仍分别保留在本报告原章节；本节引用原节点与原事项，不生成另一套判断。",
    ...referenceLines("衔接阅读范围", bridge.limitations)];
}
