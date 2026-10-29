/** Frozen compatibility-only implementation. Original SHA-256: 7cd4a700c8504da9d2fb98671b69ae063ee3c4448e11e2196c5bd838bf819308.
 * Never use this module for current automatic reading output. Import paths only are relocated. */
import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "../legacy-outlook-v09/local-annual-outlook";
import type { LocalReadingAnnualDomains } from "../local-annual-domain-record";
import type { LocalContextualReadingBundle } from "../local-contextual-reading-record";
import { buildAnnualEventReading, type LocalAnnualEventReading } from "./local-annual-event-reading";
import { composeAnnualEvents, ANNUAL_EVENT_COMPOSITION_VERSION, annualEventCompositionSubjectId } from "./local-annual-event-composition";
import { ANNUAL_RELATIONSHIP_TIMING_SOURCES, ANNUAL_RELATIONSHIP_TIMING_SOURCES_VERSION } from "../annual-relationship-timing-sources";
import { createAnnualRelationshipTimingRecordWriter } from "../annual-relationship-timing-record";

export const READING_ANNUAL_EVENTS_VERSION = "hakimi.local-reading-annual-events/0.1.0" as const;
export interface LocalReadingAnnualEvents {
  version: typeof READING_ANNUAL_EVENTS_VERSION;
  sourceBinding: LocalAnnualEventReading["sourceBinding"];
  startYear: number; endYear: number; years: LocalAnnualEventReading[];
}
export interface ReadingAnnualEventsInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; annual: LocalAnnualOutlook;
  annualDomains: LocalReadingAnnualDomains; contextual?: LocalContextualReadingBundle | null;
}
type Branch = LocalAnnualEventReading["branches"][number];
type Segment = Branch["segments"][number];
type Item = Segment["items"][number];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const lines = (label: string, items: readonly string[]) => items.map((item) => `- ${label}：${item}`);

export function buildReadingAnnualEvents(input: ReadingAnnualEventsInput): LocalReadingAnnualEvents {
  const { revision, assessment, annual, annualDomains, contextual } = input;
  if (annual.revisionId !== revision.id || annual.chartResultHash !== revision.manifest.resultHash
    || annualDomains.revisionId !== revision.id || annualDomains.chartResultHash !== revision.manifest.resultHash
    || annualDomains.includeHour !== assessment.sourceBinding.includeHour
    || annualDomains.startYear !== annual.startYear || annualDomains.endYear !== annual.endYear
    || annualDomains.years.length !== annual.years.length
    || new Set(annualDomains.years.map((item) => item.year)).size !== annual.years.length) throw new Error("年度应事情境与本次命盘或年份范围不一致。");
  const years = annual.years.map((year) => {
    const domains = annualDomains.years.find((item) => item.year === year.year);
    if (!domains) throw new Error("年度应事情境缺少本年分领域来源。");
    return buildAnnualEventReading({ revision, assessment, year, domains, contextual });
  });
  return { version: READING_ANNUAL_EVENTS_VERSION,
    sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour },
    startYear: annual.startYear, endYear: annual.endYear, years };
}

export function annualEventFeedbackSubjectId(year: number, segment: Pick<Segment, "id">, item: Item): string {
  const id = `annual-event-${year}-${segment.id}-${item.id}`;
  if (id.length > 500) throw new Error("应事情境标识过长，无法绑定个人反馈。");
  return id;
}
export function annualEventFeedbackText(reading: LocalAnnualEventReading, branch: Branch, segment: Segment, item: Item): string {
  return [`${reading.year}年 · ${branch.label} · ${item.priority === "primary" ? "优先对照" : "同时留意"} · ${item.title}`,
    `${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
    `个人适用起点：${segment.personalStartInstant}；${segment.ageLabel}`,
    `大运背景：${segment.backgroundLabels.join("、")}`, `原综合判断：${segment.judgmentCaption}`,
    item.summary, ...lines("对应情境", item.examples), ...lines("这样列出的理由", item.why),
    ...lines("原判断适用情境", item.applicability), ...lines("不宜直接套用", item.notApplicableWhen),
    ...lines("条件", item.conditions), ...lines("原分段条件", segment.conditions), ...lines("分支条件", branch.conditions),
    ...lines("依据", item.evidence), `来源条目：${item.sourceIds.join("、")}`, `情境规则来源：${JSON.stringify(item.origin)}`,
    ...(item.relationshipTiming ? [`关系时机完整依据：${JSON.stringify(item.relationshipTiming)}`] : []),
    `背景引用：${JSON.stringify(reading.contextRef)}`, `应事情境规则：${reading.version}`, `来源版本：${reading.sourceVersions.join("、")}`].join("\n");
}

/** Rebuild the whole view from original branches, periods and context before
 * saving. The same item formatter binds feedback to the exact displayed text. */
export function describeReadingAnnualEvents(reading: LocalReadingAnnualEvents, source: {
  revision?: RevisionRecord; assessment: BaziPreliminaryAssessment; annual: LocalAnnualOutlook | null;
  annualDomains?: LocalReadingAnnualDomains | null; contextual?: LocalContextualReadingBundle | null;
}, referenceLines = lines): string[] {
  if (!source.revision || !source.annual || !source.annualDomains) throw new Error("年度应事情境缺少完整命盘、年度或领域来源，已停止保存。");
  const expected = buildReadingAnnualEvents({ ...source, revision: source.revision, annual: source.annual, annualDomains: source.annualDomains });
  if (stable(reading) !== stable(expected)) throw new Error("年度应事情境与本次分支、分段、背景或原判断不一致，已停止保存。");
  const composed = new Map(reading.years.map((year) => [year.year, composeAnnualEvents(year)]));
  const relationshipRecords = createAnnualRelationshipTimingRecordWriter();
  const relationshipSourceIds = new Set(reading.years.flatMap((year) => year.branches.flatMap((branch) => branch.segments
    .flatMap((segment) => segment.items.flatMap((item) => item.relationshipTiming?.sourceIds ?? [])))));
  const relationshipSources = ANNUAL_RELATIONSHIP_TIMING_SOURCES.filter((item) => relationshipSourceIds.has(item.id));
  for (const id of relationshipSourceIds) if (!relationshipSources.some((item) => item.id === id) && id !== "hakimi-editorial") {
    throw new Error("年度关系时机缺少可定位出处，已停止保存。");
  }
  // The full annual-domain section is already stored in the same snapshot.
  // Reference its exact segment instead of duplicating its conditions per event.
  const eventReferences = (year: number, branch: Branch, segment: Segment, item: Item) => {
    const original = source.annualDomains!.years.find((entry) => entry.year === year)!.branches
      .find((entry) => entry.id === branch.id)!.segments.find((entry) => entry.id === segment.id)!.domains
      .find((entry) => entry.id === item.origin.sourceDomainId)!;
    return [`完整领域依据与条件：见本报告 ${year} 年／${branch.label}／${segment.startInstant} 起／${original.title}。`,
      ...referenceLines("情境条件", item.conditions.filter((text) => !original.conditions.includes(text))),
      ...referenceLines("情境依据", item.evidence.filter((text) => !original.evidence.includes(text)))];
  };
  return ["## 年度应事情境先读", "以下主次是本地规则的阅读顺序，不是发生概率；按各段实际背景分别对照。",
    ...reading.years.flatMap((year) => [`### ${year.year} ${year.yearGanZhi ?? ""}`,
      `时间节点：${JSON.stringify(year.yearNodeRef)}`, `背景引用：${JSON.stringify(year.contextRef)}`,
      ...year.branches.flatMap((branch) => [`#### ${branch.label}`,
        ...branch.segments.flatMap((segment) => [`##### ${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
          `个人适用起点：${segment.personalStartInstant}；${segment.ageLabel}`, `大运背景：${segment.backgroundLabels.join("、")}`,
          `原综合判断：${segment.judgmentCaption}`, `背景节点：${JSON.stringify(segment.backgroundRefs)}`,
          ...composed.get(year.year)!.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === segment.id)!.items
            .filter((group) => group.kind === "settlement").flatMap((group) => group.kind === "settlement" ? [
              `###### 整件事项 · ${group.title}`, group.summary, `合并规则：${ANNUAL_EVENT_COMPOSITION_VERSION}`,
              `成员原说明：${group.members.map((item) => annualEventFeedbackSubjectId(year.year, segment, item)).join("、")}`,
              `整件事项反馈主题：${annualEventCompositionSubjectId(year.year, segment, group)}`,
              "下面完整保留两项原领域说明及其反馈身份。"
            ] : []),
          ...segment.items.flatMap((item) => [`###### ${item.priority === "primary" ? "优先对照" : "同时留意"} · ${item.title}`,
            item.summary, ...lines("对应情境", item.examples), ...lines("这样列出的理由", item.why),
            ...lines("原判断适用情境", item.applicability), ...lines("不宜直接套用", item.notApplicableWhen),
            ...eventReferences(year.year, branch, segment, item),
            `来源条目：${item.sourceIds.join("、")}`, `情境规则来源：${JSON.stringify(item.origin)}`,
            ...(item.relationshipTiming ? relationshipRecords.describe(item.relationshipTiming) : []),
            `反馈主题：${annualEventFeedbackSubjectId(year.year, segment, item)}`]),
          ...referenceLines("分段条件", segment.conditions)]),
        ...branch.gaps.flatMap((gap) => [`覆盖说明：${gap.message}`, `缺口区间：${gap.startInstant} 至 ${gap.endExclusiveInstant}`]),
        ...referenceLines("分支条件", branch.conditions)]),
      ...referenceLines("应事范围", year.limitations), `应事情境规则：${year.version}`, `来源版本：${year.sourceVersions.join("、")}`]),
    ...relationshipRecords.appendix(),
    ...(relationshipSources.length ? ["## 年度关系阅读来源", `年度关系来源版本：${ANNUAL_RELATIONSHIP_TIMING_SOURCES_VERSION}`,
      ...relationshipSources.map((item) => `${item.title}\n${item.locator}\n${item.url}\n原文短引：${item.excerpt}\n本地解释：${item.interpretation}\n完整出处记录：${JSON.stringify(item)}`)] : []),
    `应事情境命盘来源：${JSON.stringify(reading.sourceBinding)}`, `应事集合版本：${reading.version}`];
}
