import type { BuildAnnualMonthContextInput } from "./annual-month-context";
import { ANNUAL_MONTH_CONTEXT_VERSION } from "./annual-month-context";
import { ANNUAL_EVENT_READING_VERSION } from "./local-annual-event-reading";
import { MONTHLY_DOMAIN_READING_VERSION } from "./local-monthly-domain-reading";
import { buildAnnualMonthStory, type LocalAnnualMonthStory, type AnnualMonthStoryMonth, type AnnualMonthStoryBranch, type AnnualMonthStoryPeriod, type AnnualMonthStoryDomain } from "./local-annual-month-story";
import type { LocalPersonalReading } from "./local-personal-reading";
import { assertPersonalReadingLegacyBindings, assertPersonalReadingLegacyYearBindings, personalAdoptionLabel } from "./local-personal-reading-legacy";
import type { LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export const annualMonthStorySubjectId = (story: LocalAnnualMonthStory, month: AnnualMonthStoryMonth, period: AnnualMonthStoryPeriod, domain: AnnualMonthStoryDomain) =>
  `annual-month-story-${story.year}-${month.monthId}-${period.id}-${domain.id}`;

// Feedback binds the direct producers here and the complete transitive version
// manifest in originalConclusion. Its existing exact-text/hash guard therefore
// detects a change to any dependency without truncating provenance or enlarging
// the feedback format's bounded readingVersions array.
export const annualMonthStoryFeedbackVersions = (story: LocalAnnualMonthStory) =>
  [story.version, ANNUAL_MONTH_CONTEXT_VERSION, ANNUAL_EVENT_READING_VERSION, MONTHLY_DOMAIN_READING_VERSION];

export function annualMonthStoryEntries(story: LocalAnnualMonthStory) {
  return story.months.flatMap((month) => month.branches.flatMap((branch) => branch.periods.flatMap((period) =>
    period.domains.map((domain) => ({ month, branch, period, domain })) )));
}
export function annualMonthStoryPersonalSources(story: LocalAnnualMonthStory, domain: AnnualMonthStoryDomain, personal?: LocalPersonalReading | null, legacySource?: LegacyAnnualReadingInput | BuildAnnualMonthContextInput) {
  if (!personal || stable(personal.sourceBinding) !== stable(story.sourceBinding)) return [];
  const month = domain.links.monthlyDomain;
  const subjects = new Set([`annual-${story.year}`, `month-${month.monthId}`, `monthly-domain-${month.monthId}-${month.segmentId}-${month.domainId}`,
    ...domain.links.annualEvents.flatMap((ref) => [`annual-event-${ref.year}-${ref.segmentId}-${ref.itemId}`, `annual-domain-${ref.year}-${ref.segmentId}-${ref.domainId}`])]);
  const locations = annualMonthStoryEntries(story).filter((item) => stable(item.domain) === stable(domain));
  if (locations.length !== 1) throw new Error("年月衔接个人采用的领域不属于唯一原分段。");
  const location = locations[0]!, own = annualMonthStorySubjectId(story, location.month, location.period, domain);
  const proofSubjects = [own, ...subjects];
  if (personal.entries.some((entry) => proofSubjects.includes(entry.subjectId) && entry.feedback.some((feedback) => feedback.legacyReplay))) {
    const year = legacySource && ("year" in legacySource ? legacySource.year : legacySource.annual?.years.find((item) => item.year === story.year));
    const yearNodes = story.nodes.filter((node) => node.ref.nodeType === "year");
    if (!legacySource || !year || year.year !== story.year || yearNodes.length !== 1 || stable(year.transitNodeRef) !== stable(yearNodes[0]!.ref)
      || year.startInstant !== story.startInstant || year.endExclusiveInstant !== story.endExclusiveInstant
      || legacySource.revision.caseId !== story.sourceBinding.caseId || legacySource.revision.id !== story.sourceBinding.revisionId
      || legacySource.revision.manifest.resultHash !== story.sourceBinding.chartResultHash
      || legacySource.assessment.sourceBinding.includeHour !== story.sourceBinding.includeHour
      || stable(legacySource.contextual?.contextSource.reference ?? null) !== stable(story.contextRef)
      || legacySource.monthly?.year !== story.year || legacySource.monthlyDomains?.year !== story.year) {
      throw new Error("年月衔接历史采用的年份、背景或来源与当前段落不一致。");
    }
    const ownEntry = personal.entries.find((entry) => entry.subjectId === own);
    if (ownEntry && (ownEntry.originalConclusion !== annualMonthStoryFeedbackText(story, location.month, location.branch, location.period, domain)
      || stable([...new Set(ownEntry.readingVersions)].sort()) !== stable([...new Set(annualMonthStoryFeedbackVersions(story))].sort()))) {
      throw new Error("年月衔接历史采用与当前原文不一致。");
    }
  }
  if (legacySource && "year" in legacySource) assertPersonalReadingLegacyYearBindings(personal, { ...legacySource, domains: legacySource.annualDomains }, proofSubjects);
  else assertPersonalReadingLegacyBindings(personal, legacySource, proofSubjects);
  return personal.entries.filter((entry) => subjects.has(entry.subjectId) && entry.state === "adopted" && entry.personalText && !entry.issues.length);
}
function lines(story: LocalAnnualMonthStory, month: AnnualMonthStoryMonth, branch: AnnualMonthStoryBranch, period: AnnualMonthStoryPeriod, domain: AnnualMonthStoryDomain) {
  return [`${story.year}年 · ${month.label} ${month.ganZhi} · ${branch.label} · ${domain.title}`,
    `月份标识：${month.monthId}；状态：${month.status}；分支：${branch.id}；分段：${period.id}`,
    `${period.startInstant} 至 ${period.endExclusiveInstant}（不含终点）`,
    `个人范围从 ${period.personalStartInstant} 起；${period.ageLabel}`, `原月判断：${period.judgmentCaption}`,
    ...(period.annualJudgmentCaption ? [`原年段判断：${period.annualJudgmentCaption}`] : []),
    ...period.backgroundLabels.map((text) => `背景：${text}`),
    domain.summary, ...domain.examples.map((text) => `生活情境：${text}`),
    ...domain.conditions.map((text) => `条件：${text}`), ...domain.evidence.map((text) => `依据：${text}`),
    ...period.conditions.map((text) => `分段条件：${text}`), ...branch.conditions.map((text) => `分支条件：${text}`),
    `年月原文引用：${JSON.stringify(domain.links)}`, `衔接类型：${domain.connection}；阶段：${domain.phase}`,
    `出处标识：${domain.sourceIds.join("、")}`];
}
export function annualMonthStoryFeedbackText(story: LocalAnnualMonthStory, month: AnnualMonthStoryMonth, branch: AnnualMonthStoryBranch, period: AnnualMonthStoryPeriod, domain: AnnualMonthStoryDomain): string {
  const refs = [domain.links.monthlyDomain, ...domain.links.annualEvents];
  const keys = new Set(refs.flatMap((ref) => [ref.targetNodeKey, ...ref.backgroundNodeKeys]));
  const nodes = story.nodes.filter((node) => keys.has(node.key));
  if (nodes.length !== keys.size) throw new Error("年月衔接缺少原始节点引用。");
  return [...lines(story, month, branch, period, domain), `衔接规则：${story.version}`, `完整来源版本：${JSON.stringify(story.sourceVersions)}`,
    `原始节点：${JSON.stringify(nodes)}`, `命盘来源：${JSON.stringify(story.sourceBinding)}`, `生活背景引用：${JSON.stringify(story.contextRef)}`].join("\n");
}
export function describeAnnualMonthStory(story: LocalAnnualMonthStory, source: BuildAnnualMonthContextInput, personal?: LocalPersonalReading | null,
  referenceLines: (label: string, items: readonly string[]) => string[] = (label, items) => items.map((text) => `${label}：${text}`)): string[] {
  const expected = buildAnnualMonthStory(source);
  if (stable(story) !== stable(expected)) throw new Error("年月衔接与本次年度、月份、分支或原文不一致，已停止保存。");
  if (personal) {
    const subjects = annualMonthStoryEntries(story).flatMap(({ month, period, domain }) => [annualMonthStorySubjectId(story, month, period, domain),
      ...domain.links.annualEvents.map((ref) => `annual-event-${ref.year}-${ref.segmentId}-${ref.itemId}`)]);
    assertPersonalReadingLegacyYearBindings(personal, { ...source, domains: source.annualDomains }, subjects);
  }
  return ["## 年度主题与十二节令月", story.headline, story.summary,
    `年度：${story.year} ${story.yearGanZhi ?? ""}；状态：${story.status}；${story.startInstant} 至 ${story.endExclusiveInstant}（不含终点）`,
    ...story.months.flatMap((month) => [`### ${month.label} · ${month.ganZhi}`, `月份标识：${month.monthId}；状态：${month.status}`, `${month.startInstant} 至 ${month.endExclusiveInstant}（不含终点）`,
      ...(month.status === "before_birth" ? ["出生前仅保留历法范围，不作个人解读。"] : []),
      ...month.branches.flatMap((branch) => [`#### ${branch.label}`, `分支：${branch.id}`, ...referenceLines("分支条件", branch.conditions),
        ...branch.periods.flatMap((period) => [
          `##### 原分段 ${period.id}`,
          `${period.startInstant} 至 ${period.endExclusiveInstant}（不含终点）`,
          `个人范围从 ${period.personalStartInstant} 起；${period.ageLabel}`, `原月判断：${period.judgmentCaption}`,
          ...(period.annualJudgmentCaption ? [`原年段判断：${period.annualJudgmentCaption}`] : []),
          ...period.backgroundLabels.map((text) => `背景：${text}`), ...referenceLines("分段条件", period.conditions),
          ...period.domains.flatMap((domain) => {
          const subject = annualMonthStorySubjectId(story, month, period, domain);
          const own = personal && stable(personal.sourceBinding) === stable(story.sourceBinding)
            ? personal.entries.find((entry) => entry.subjectId === subject && entry.state === "adopted" && entry.personalText && !entry.issues.length) : undefined;
          const sources = annualMonthStoryPersonalSources(story, domain, personal, source);
          return [`###### ${domain.title}`, `衔接反馈主题：${subject}`,
            ...(own ? [`当前阅读：${personalAdoptionLabel(own)}`, own.personalText!, `采用来源：${JSON.stringify(own.selectedReviewRefs)}`]
              : sources.length ? ["当前阅读：年度或月度来源已有个人修订，自动衔接保留供对照。",
                ...sources.flatMap((entry) => [`${entry.subjectLabel}：${entry.personalText}`, `采用来源：${JSON.stringify(entry.selectedReviewRefs)}`])] : []),
            "自动衔接原文：", domain.summary, ...domain.examples.map((text) => `生活情境：${text}`),
            ...referenceLines("条件", domain.conditions), ...referenceLines("依据", domain.evidence),
            `年月原文引用：${JSON.stringify(domain.links)}`, `衔接类型：${domain.connection}；阶段：${domain.phase}`,
            `出处标识：${domain.sourceIds.join("、")}`];
        })]), ...branch.gaps.map((gap) => `${gap.source}范围说明：${gap.startInstant ?? "未定"} 至 ${gap.endExclusiveInstant ?? "未定"}；${gap.message}`)])]),
    "### 年月衔接原始节点与来源", `节点共享表：${JSON.stringify(story.nodes)}`, `命盘来源：${JSON.stringify(story.sourceBinding)}`,
    `生活背景引用：${JSON.stringify(story.contextRef)}`, `衔接规则：${story.version}`, `完整来源版本：${JSON.stringify(story.sourceVersions)}`, ...story.limitations];
}
