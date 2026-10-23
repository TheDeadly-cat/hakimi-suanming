import { transitNodeRefSchema, type RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingTimeline, LOCAL_READING_TIMELINE_VERSION, type LocalReadingTimeline } from "./local-reading-timeline";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export function readingTimelineNarrativeSubjectId(timeline: LocalReadingTimeline, branch: LocalReadingTimeline["branches"][number]): string {
  return `trajectory-${timeline.startYear}-${timeline.endYear}-${branch.id}`;
}

/** The same complete prose and anchors are used by feedback and the saved report. */
export function readingTimelineNarrativeText(timeline: LocalReadingTimeline, branch: LocalReadingTimeline["branches"][number]): string {
  const narrative = branch.narrative;
  return [`${timeline.startYear}—${timeline.endYear}年走势 · ${branch.label}`, narrative.headline,
    ...narrative.statements.map((statement) => statement.text), ...narrative.paragraphs,
    ...narrative.conditions.map((condition) => `走势条件：${condition}`),
    `走势依据：${JSON.stringify(narrative.statements.map(({ id, kind, stageIds, turningPointIds }) => ({ id, kind, stageIds, turningPointIds })))}`,
    `阶段解读规则：${timeline.version}`, `来源解读版本：${timeline.sourceVersions.join("、")}`].join("\n");
}

/** The readable conclusion retained in both the full report and stage feedback. */
export function readingTimelineStageText(stage: LocalReadingTimeline["stages"][number]): string {
  return [`${stage.branchLabel} · ${stage.headline}`, stage.summary, `${stage.startInstant} 至 ${stage.endExclusiveInstant}（不含终点）`,
    ...stage.yearLinks.flatMap((year) => [`${year.year}年：${year.caption}`, year.reason, `生活主题：${year.lifeTheme}`,
      `${year.startInstant} 至 ${year.endExclusiveInstant}（不含终点）`, ...year.conditions.map((condition) => `条件：${condition}`)]),
    ...stage.conditions.map((condition) => `阶段条件：${condition}`)].join("\n");
}

/** Retain exact source intervals and references alongside the readable overview. */
export function describeReadingTimeline(timeline: LocalReadingTimeline, assessment: BaziPreliminaryAssessment,
  annual: LocalAnnualOutlook | null, life: LocalLifeOutlook | null | undefined, revision?: RevisionRecord): string[] {
  if (!annual || timeline.version !== LOCAL_READING_TIMELINE_VERSION
    || timeline.sourceBinding.revisionId !== assessment.sourceBinding.revisionId
    || timeline.sourceBinding.chartResultHash !== assessment.sourceBinding.chartResultHash
    || timeline.sourceBinding.includeHour !== assessment.sourceBinding.includeHour
    || timeline.startYear !== annual.startYear || timeline.endYear !== annual.endYear
    || timeline.lifeReferenceInstant !== (life?.referenceInstant ?? null)) throw new Error("阶段解读与当前命盘、年份或定位时刻不一致，请重新打开后保存。");
  const judgments = annual.years.flatMap((year) => year.judgmentSegments.map((segment) => segment.judgment));
  const versions = new Set<string>([annual.version, ...(life ? [life.version] : []), ...judgments.flatMap((item) => [item.version, item.policyVersion])]);
  if (JSON.stringify([...timeline.sourceVersions].sort()) !== JSON.stringify([...versions].sort())) throw new Error("阶段解读的来源版本不一致。");
  const links = [...timeline.stages.flatMap((stage) => stage.yearLinks.map((link) => ({ branchId: stage.branchId, link }))),
    ...timeline.turningPoints.flatMap((point) => [point.before, point.after].map((link) => ({ branchId: point.branchId, link })))];
  for (const { branchId, link } of links) {
    const year = annual.years.find((item) => item.year === link.year);
    const ref = transitNodeRefSchema.parse(link.nodeRef);
    const start = Date.parse(link.startInstant), end = Date.parse(link.endExclusiveInstant);
    if (!year?.transitNodeRef || JSON.stringify(ref) !== JSON.stringify(transitNodeRefSchema.parse(year.transitNodeRef))
      || !year.startInstant || !year.endExclusiveInstant || !Number.isFinite(start) || !Number.isFinite(end)
      || start >= end || start < Date.parse(year.startInstant) || end > Date.parse(year.endExclusiveInstant)) throw new Error("阶段解读的年份节点或区间不一致。");
    const segments = year.judgmentSegments.filter((segment) => segment.branchId === branchId
      && segment.startInstant === link.startInstant && segment.endExclusiveInstant === link.endExclusiveInstant);
    const references = (items: typeof link.backgroundRefs) => items.map((item) => JSON.stringify(transitNodeRefSchema.parse(item))).sort();
    if (segments.length !== 1 || JSON.stringify(transitNodeRefSchema.parse(segments[0]!.judgment.targetRef)) !== JSON.stringify(ref)
      || JSON.stringify(references(segments[0]!.judgment.backgroundRefs)) !== JSON.stringify(references(link.backgroundRefs))) {
      throw new Error("阶段解读的分支、原区间或大运背景不一致。");
    }
  }
  for (const point of timeline.turningPoints) if (point.before.endExclusiveInstant !== point.atInstant || point.after.startInstant !== point.atInstant) throw new Error("阶段变化的前后边界不连续。");
  if (!revision) throw new Error("阶段走势缺少本次命盘来源，已停止保存。");
  if (revision.id !== timeline.sourceBinding.revisionId || revision.manifest.resultHash !== timeline.sourceBinding.chartResultHash) {
    throw new Error("阶段走势的命盘来源不一致，已停止保存。");
  }
  const expected = buildReadingTimeline({ revision, annual, life });
  if (stable(timeline) !== stable(expected)) throw new Error("阶段走势正文、引用或原始计算不一致，已停止保存。");
  const linkEvidence = (link: LocalReadingTimeline["stages"][number]["yearLinks"][number]) => [
    `年份节点：${JSON.stringify(link.nodeRef)}`, `背景节点：${JSON.stringify(link.backgroundRefs)}`,
    `判断角度：${link.axisIds.join("、")}`, ...link.evidence.map((line) => `- 年份依据：${line}`)];
  return ["## 关键阶段与变化年份", timeline.headline, timeline.summary,
    ...timeline.branches.flatMap((branch) => [`### ${branch.label}`,
      readingTimelineNarrativeText(timeline, branch),
      ...timeline.stages.filter((stage) => stage.branchId === branch.id).flatMap((stage) => [
        `#### ${stage.headline}`, readingTimelineStageText(stage), ...stage.yearLinks.flatMap(linkEvidence),
        ...stage.evidence.map((line) => `- 阶段依据：${line}`)]),
      ...timeline.turningPoints.filter((point) => point.branchId === branch.id).flatMap((point) => [
        `#### ${point.headline}`, point.summary, `变化时刻：${point.atInstant}`,
        `前段：${point.before.caption}；${point.before.startInstant} 至 ${point.before.endExclusiveInstant}（不含终点）`, point.before.reason, `生活主题：${point.before.lifeTheme}`,
        `后段：${point.after.caption}；${point.after.startInstant} 至 ${point.after.endExclusiveInstant}（不含终点）`, point.after.reason, `生活主题：${point.after.lifeTheme}`,
        ...point.conditions.map((line) => `- 变化条件：${line}`), ...point.evidence.map((line) => `- 变化依据：${line}`)]),
      ...timeline.gaps.filter((gap) => gap.branchId === branch.id).flatMap((gap) => [
        `${gap.year}年覆盖说明：${gap.message}`, ...(gap.startInstant && gap.endExclusiveInstant ? [`${gap.startInstant} 至 ${gap.endExclusiveInstant}（不含终点）`] : []), ...gap.conditions]),
      ...branch.conditions.map((line) => `- 分支条件：${line}`)]),
    ...timeline.limitations, `阶段解读规则：${timeline.version}`, `阶段来源版本：${timeline.sourceVersions.join("、")}`,
    `阶段定位时刻：${timeline.lifeReferenceInstant ?? "尚未提供"}`];
}
