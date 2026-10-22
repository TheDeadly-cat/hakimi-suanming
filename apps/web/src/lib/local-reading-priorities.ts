import { transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import type { LocalOutlookJudgment, OutlookAxis, OutlookEffect } from "./local-outlook-judgment";
import { buildReadingTimeline, type LocalReadingTimeline, type ReadingTimelineBranchId, type ReadingTimelineGap, type ReadingTimelineTurningPoint } from "./local-reading-timeline";
import { outlookDirectionCaption, READING_YEAR_SUMMARY_VERSION } from "./outlook-judgment-presentation";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading, type AnnualDomainReading } from "./local-annual-domain-reading";
import { BAZI_PRELIMINARY_ASSESSMENT_VERSION, buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalReadingAgeStage } from "./local-reading-age-context";

export const LOCAL_READING_PRIORITIES_VERSION = "hakimi.local-reading-priorities/0.2.0" as const;
export type ReadingPriorityCategory = "support" | "pressure" | "mixed" | "conditional" | "theme" | "unavailable";
export interface ReadingPriorityDomainTheme extends AnnualDomainReading {
  sourceVersions: string[];
}
export interface ReadingPrioritySegment {
  id: string; branchId: ReadingTimelineBranchId; startInstant: string; endExclusiveInstant: string;
  judgment: LocalOutlookJudgment; caption: string; category: ReadingPriorityCategory;
  primaryAxis: OutlookAxis | null; primaryEffect: OutlookEffect | null;
  personalStartInstant: string | null; ageStage: LocalReadingAgeStage | null; ageLabel: string | null;
  domains: ReadingPriorityDomainTheme[]; conditions: string[];
}
export interface ReadingPriorityReason {
  kind: "handover" | "judgment_change" | "support_start" | "pressure_start";
  text: string; turningPointId: string | null; atInstant: string | null; segmentIds: string[];
}
export interface ReadingPriorityYear {
  id: string; year: number; yearGanZhi: string | null; nodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null;
  caption: string; summary: string; categories: ReadingPriorityCategory[];
  segments: ReadingPrioritySegment[]; selectionReasons: ReadingPriorityReason[];
  turningPoints: ReadingTimelineTurningPoint[]; gaps: ReadingTimelineGap[]; conditions: string[];
}
export interface ReadingPriorityBranch {
  id: ReadingTimelineBranchId; label: string; priorityYearIds: string[];
  years: ReadingPriorityYear[]; gaps: ReadingTimelineGap[]; conditions: string[];
}
export interface LocalReadingPriorities {
  version: typeof LOCAL_READING_PRIORITIES_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; startYear: number; endYear: number; lifeReferenceInstant: string | null;
  headline: string; summary: string; branches: ReadingPriorityBranch[]; limitations: string[];
}
export interface BuildReadingPrioritiesInput {
  revision: RevisionRecord; annual: LocalAnnualOutlook; life?: LocalLifeOutlook | null;
  timeline?: LocalReadingTimeline | null; annualDomains?: LocalReadingAnnualDomains | null;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const refKey = (ref: TransitNodeRef) => stable(transitNodeRefSchema.parse(ref));
const sameRefs = (a: readonly TransitNodeRef[], b: readonly TransitNodeRef[]) => stable(a.map(refKey).sort()) === stable(b.map(refKey).sort());
const dateTime = (value: string) => new Date(Date.parse(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ") + "（UTC+08）";
const axisLabel = { pattern: "结构", balance: "扶抑", seasonal: "调候" };
function category(judgment: LocalOutlookJudgment): ReadingPriorityCategory {
  return ({ 较顺: "support", 有压力: "pressure", 利弊并见: "mixed", 条件性: "conditional", 主题解读: "theme", 暂不可判: "unavailable" } as const)[judgment.label];
}
function judgmentChangeReason(turn: ReadingTimelineTurningPoint): string {
  if (turn.before.caption !== turn.after.caption) return `已有判断在本年发生变化：前段“${turn.before.caption}”，后段“${turn.after.caption}”；具体三轴条件可对照原依据。`;
  const firstSentence = (text: string) => { const end = text.indexOf("。"); return end < 0 ? text : text.slice(0, end + 1); };
  // Keep the timeline's stated axis/condition change and one complete original
  // sentence from each side. Full reasons remain in the untouched turning point.
  const change = turn.summary.split("前段依据：")[0]!.replace("总体仍为", "总体表述仍为");
  return `${change}前段依据：${firstSentence(turn.before.reason)}后段依据：${firstSentence(turn.after.reason)}`;
}

function validateDomains(revision: RevisionRecord, collection: LocalReadingAnnualDomains, annual: LocalAnnualOutlook, source: LocalReadingPriorities["sourceBinding"]): void {
  if (collection.version !== ANNUAL_DOMAIN_READING_VERSION || collection.revisionId !== source.revisionId
    || collection.chartResultHash !== source.chartResultHash || collection.includeHour !== source.includeHour
    || collection.startYear !== annual.startYear || collection.endYear !== annual.endYear
    || collection.years.length !== annual.years.length || new Set(collection.years.map((item) => item.year)).size !== annual.years.length) {
    throw new Error("重点年份的分领域来源或年份范围不一致。");
  }
  // Rebuild only the narrative from the supplied immutable year judgments.
  // This is one assessment per view, not a new transit calculation per year.
  const assessment = buildBaziPreliminaryAssessment(revision);
  for (const reading of collection.years) {
    const original = annual.years.find((year) => year.year === reading.year);
    if (!original || reading.version !== collection.version || stable(reading.sourceBinding) !== stable(source)
      || reading.yearGanZhi !== original.yearGanZhi || reading.startInstant !== original.startInstant || reading.endExclusiveInstant !== original.endExclusiveInstant
      || (reading.yearNodeRef ? refKey(reading.yearNodeRef) : null) !== (original.transitNodeRef ? refKey(original.transitNodeRef) : null)) throw new Error("重点年份的分领域节点或区间不一致。");
    const judgments = [original.judgment, original.ownJudgment, ...original.judgmentSegments.map((segment) => segment.judgment)].filter((item) => item !== null);
    const versions = unique([BAZI_PRELIMINARY_ASSESSMENT_VERSION, annual.version, ...judgments.flatMap((item) => [item.version, item.policyVersion])]);
    if (stable([...reading.sourceVersions].sort()) !== stable(versions.sort())) throw new Error("重点年份的分领域来源版本不一致。");
    if (new Set(reading.branches.map((branch) => branch.id)).size !== reading.branches.length) throw new Error("重点年份的分领域分支重复。");
    const seen = new Set<string>();
    for (const branch of reading.branches) for (const segment of branch.segments) {
      const sourceSegment = original.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id);
      const key = `${branch.id}:${segment.id}`;
      if (!sourceSegment || seen.has(key) || segment.branchId !== branch.id || segment.startInstant !== sourceSegment.startInstant
        || segment.endExclusiveInstant !== sourceSegment.endExclusiveInstant || !sameRefs(segment.backgroundRefs, sourceSegment.judgment.backgroundRefs)
        || segment.judgmentVersion !== sourceSegment.judgment.version || segment.policyVersion !== sourceSegment.judgment.policyVersion
        || stable(segment.domains.map((domain) => domain.id).sort()) !== stable(["career", "relationship", "wealth"])) throw new Error("重点年份的领域主题与原分支、分段或版本不一致。");
      seen.add(key);
    }
    if (seen.size !== original.judgmentSegments.length) throw new Error("重点年份的分领域主题缺少原判断分段。");
    const expected = buildAnnualDomainReading({ revision, assessment, year: original });
    if (stable(reading) !== stable(expected)) throw new Error("重点年份的完整领域原文、年龄或个人区间与当前原计算不一致。");
  }
}

/** Reading order, not a new fortune judgment. Every caption and segment remains
 * the supplied local calculation; conditional primary effects stay conditional. */
export function buildReadingPriorities({ revision, annual, life = null, timeline = null, annualDomains = null }: BuildReadingPrioritiesInput): LocalReadingPriorities {
  const checked = buildReadingTimeline({ revision, annual, life });
  if (timeline && stable(timeline) !== stable(checked)) throw new Error("重点年份的阶段脉络与当前原始计算不一致。");
  if (annualDomains) validateDomains(revision, annualDomains, annual, checked.sourceBinding);
  const sourceVersions = unique([LOCAL_READING_PRIORITIES_VERSION, checked.version, READING_YEAR_SUMMARY_VERSION, ...checked.sourceVersions,
    ...(annualDomains ? [annualDomains.version, ...annualDomains.years.flatMap((reading) => reading.sourceVersions)] : [])]);
  const orderedYears = [...annual.years].sort((a, b) => a.year - b.year);
  const branches: ReadingPriorityBranch[] = checked.branches.map((branch) => {
    const years: ReadingPriorityYear[] = orderedYears.map((year): ReadingPriorityYear => {
      const domainReading = annualDomains?.years.find((item) => item.year === year.year);
      const domainBranch = domainReading?.branches.find((item) => item.id === branch.id);
      const segments: ReadingPrioritySegment[] = year.judgmentSegments.filter((segment) => segment.branchId === branch.id).map((segment) => {
        const judgment = segment.judgment, primary = judgment.axes.find((axis) => axis.axis === judgment.primaryAxis);
        const domainSegment = domainBranch?.segments.find((item) => item.id === segment.id);
        return { id: segment.id, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
          judgment: structuredClone(judgment), caption: outlookDirectionCaption(judgment, year.label), category: category(judgment),
          primaryAxis: judgment.primaryAxis, primaryEffect: primary?.effect ?? null,
          personalStartInstant: domainSegment?.personalStartInstant ?? null,
          ageStage: domainSegment?.ageStage ?? null, ageLabel: domainSegment?.ageLabel ?? null,
          domains: domainSegment?.domains.map((domain) => ({ ...structuredClone(domain),
            sourceVersions: unique([domainReading!.version, ...domainReading!.sourceVersions]) })) ?? [],
          conditions: unique([...judgment.conditions, ...branch.conditions]) };
      });
      const turns = checked.turningPoints.filter((point) => point.branchId === branch.id && point.year === year.year);
      const gaps = checked.gaps.filter((gap) => gap.branchId === branch.id && gap.year === year.year);
      const captions = unique(segments.map((segment) => segment.caption));
      const caption = !segments.length ? "暂不可判" : captions.length === 1 ? captions[0]!
        : segments.map((segment) => `${dateTime(segment.startInstant)}起：${segment.caption}`).join("；");
      const summary = segments.length ? segments.map((segment) => {
        const main = segment.judgment.axes.find((axis) => axis.axis === segment.primaryAxis);
        return `${segments.length > 1 ? `${dateTime(segment.startInstant)}起，` : ""}${segment.caption}。${main?.summary ?? segment.judgment.summary}`;
      }).join(" ") : year.summary;
      return { id: `priority:${branch.id}:${year.year}`, year: year.year, yearGanZhi: year.yearGanZhi,
        nodeRef: structuredClone(year.transitNodeRef), startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
        caption, summary, categories: segments.length ? unique(segments.map((segment) => segment.category)) : ["unavailable"], segments,
        selectionReasons: turns.map((turn): ReadingPriorityReason => ({ kind: turn.kind,
          text: turn.kind === "handover" ? `本年有实际交运：${turn.headline}。交运前后分别为“${turn.before.caption}”与“${turn.after.caption}”，换运不代表自动转好。`
            : judgmentChangeReason(turn),
          turningPointId: turn.id, atInstant: turn.atInstant,
          segmentIds: segments.filter((segment) => (segment.startInstant === turn.before.startInstant && segment.endExclusiveInstant === turn.before.endExclusiveInstant)
            || (segment.startInstant === turn.after.startInstant && segment.endExclusiveInstant === turn.after.endExclusiveInstant)).map((segment) => segment.id) })),
        turningPoints: structuredClone(turns), gaps: structuredClone(gaps), conditions: unique([...year.conditions, ...gaps.flatMap((gap) => gap.conditions)]) };
    });
    const priorityYearIds: string[] = [];
    const changeYears = years.filter((year) => year.turningPoints.length).sort((a, b) => {
      const rank = (year: ReadingPriorityYear) => year.turningPoints.some((point) => point.kind === "handover") ? 0 : 1;
      return rank(a) - rank(b) || a.year - b.year;
    }).slice(0, 3);
    priorityYearIds.push(...changeYears.map((year) => year.id));
    for (const target of ["support", "pressure"] as const) {
      const effect = target === "support" ? "assists" : "obstructs";
      const found = years.flatMap((year) => year.segments.map((segment) => ({ year, segment })))
        .find(({ segment }) => segment.category === target || (segment.category === "conditional" && segment.primaryEffect === effect));
      if (!found) continue;
      const { year, segment } = found;
      year.selectionReasons.push({ kind: target === "support" ? "support_start" : "pressure_start", turningPointId: null,
        atInstant: segment.startInstant, segmentIds: [segment.id],
        text: `本窗口最早可读的${segment.category === "conditional" ? "有条件的" : ""}${target === "support" ? "支持" : "承压"}线索位于本年该分段${segment.primaryAxis ? `（${axisLabel[segment.primaryAxis]}）` : ""}，原结论为“${segment.caption}”。` });
      if (!priorityYearIds.includes(year.id)) priorityYearIds.push(year.id);
    }
    return { id: branch.id, label: branch.label, priorityYearIds, years, gaps: structuredClone(checked.gaps.filter((gap) => gap.branchId === branch.id)),
      conditions: [...branch.conditions] };
  });
  return { version: LOCAL_READING_PRIORITIES_VERSION, sourceBinding: { ...checked.sourceBinding }, sourceVersions,
    startYear: annual.startYear, endYear: annual.endYear, lifeReferenceInstant: checked.lifeReferenceInstant,
    headline: `${annual.startYear}—${annual.endYear}年值得先看的变化与阶段起点`,
    summary: branches.map((branch) => `${branch.label}：${branch.priorityYearIds.length ? `${branch.priorityYearIds.map((id) => branch.years.find((year) => year.id === id)!.year).join("、")}年可先读，具体入选原因逐项列出。` : "目前没有可单列的变化或支持、承压起点，完整年份与缺口仍保留。"}`).join(" "),
    branches, limitations: ["阅读顺序优先实际交运，再看已有判断变化，同类按年份先后；每分支最多三个变化年，再补窗口内最早支持、承压线索年各一个并去重。",
      "这些是值得先读的年份，不是最好或最差年份，没有新增吉凶分数、概率或岁运规则。",
      "条件性判断即使主轴有支持或阻碍，仍保留原标签、完整限定与分段；不扩大为全年确定结论。",
      "顺逆分支平行阅读；缺失区间、未覆盖大运与不可用年份原样保留，不借相邻年份补齐。",
      "日期按固定UTC+08展示；保存的原始瞬时点与半开分段边界不变。", ...(!annualDomains ? ["本次未提供年度分领域文本，未补造事业、资源或关系主题。"] : [])] };
}
