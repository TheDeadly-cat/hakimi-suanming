import type { LocalAnnualOutlook, LocalAnnualYear } from "./local-annual-outlook";
import { plainAnnualYearSegments, plainOutlookCaption } from "./plain-outlook-reading";

export const PLAIN_YEAR_OVERVIEW_VERSION = "hakimi.plain-year-overview/0.1.0" as const;
export type PlainYearGroup = "favorable" | "opportunity" | "caution" | "mixed" | "unclear";
export interface PlainYearPeriod {
  year: number; segmentId: string; branchId: string; branchLabel: string;
  startInstant: string; endExclusiveInstant: string; label: string; caption: string; group: PlainYearGroup;
}
const localDate = (instant: string, year: number) => {
  const date = new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10);
  return `${Number(date.slice(0, 4)) === year ? "" : `${date.slice(0, 4)}/`}${date.slice(5).replace("-", "/")}`;
};

/** Classify existing conclusions for navigation only. Never average a handover
 * or choose between the parallel directions of an unknown-direction chart. */
export function plainYearPeriods(year: LocalAnnualYear): PlainYearPeriod[] {
  const counts = new Map<string, number>();
  for (const segment of year.judgmentSegments) counts.set(segment.branchId, (counts.get(segment.branchId) ?? 0) + 1);
  return plainAnnualYearSegments(year).map(segment => {
    const source = year.judgmentSegments.find(item => item.id === segment.segmentId && item.branchId === segment.branchId)!;
    const primary = source.judgment.axes.find(axis => axis.axis === source.judgment.primaryAxis);
    const opportunity = segment.category === "unresolved" && primary?.effect === "assists";
    const group: PlainYearGroup = segment.category === "favorable" ? "favorable" : opportunity ? "opportunity" : segment.category === "caution" ? "caution" : segment.category === "mixed" ? "mixed" : "unclear";
    const split = (counts.get(segment.branchId) ?? 0) > 1;
    return { ...segment, year: year.year, group,
      label: `${year.year}年${split ? ` ${localDate(segment.startInstant, year.year)}—${localDate(segment.endExclusiveInstant, year.year)}前` : ""}${counts.size > 1 ? ` · ${segment.branchLabel}` : ""}` };
  });
}

export function plainYearSummary(year: LocalAnnualYear): string {
  const periods = plainYearPeriods(year);
  if (!periods.length) return year.summary || plainOutlookCaption(year.judgment);
  return periods.map(period => `${period.label}：${period.caption}`).join("；");
}

export function plainYearCaption(year: LocalAnnualYear): string {
  const periods = plainYearPeriods(year);
  if (!periods.length) return !year.judgment && year.label === "暂不可判" ? "暂不作个人判断" : plainOutlookCaption(year.judgment);
  if (new Set(periods.map(period => period.branchId)).size > 1) return "起运方向不同，分别看";
  const captions = [...new Set(periods.map(period => period.caption))];
  return captions.length > 1 ? "交运前后有变化" : captions[0]!;
}

export function plainYearTopic(year: LocalAnnualYear): string {
  const axis = year.ownJudgment?.axes.find(item => item.axis === "pattern") ?? year.judgmentSegments[0]?.judgment.axes.find(item => item.axis === "pattern");
  const actor = axis?.stemActions?.items.find(item => item.visibility === "visible");
  const topics: Record<string,string> = { 正印: "学习准备与实际完成", 偏印: "换个办法，补上不足", 伤官: "新办法与作品试用", 食神: "熟练做法与持续成果", 正财: "成果确认与投入安排", 偏财: "新用途与新的合作", 正官: "要求、责任与分工", 七杀: "集中任务与应对压力", 比肩: "自主安排与共同决定", 劫财: "共同参与和费用分担" };
  return topics[actor?.tenGod ?? ""] ?? "阅读这一年的具体事项";
}

export function buildPlainYearOverview(annual: LocalAnnualOutlook) {
  return annual.years.flatMap(plainYearPeriods);
}
