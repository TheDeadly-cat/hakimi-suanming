import { storedRevisionRecordSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod } from "../../../../../packages/bazi-interpretation/src/strength-policy";
import type { LocalAnnualYear } from ".././local-annual-outlook";
import type { AnnualDomainBranchId, AnnualDomainGap, AnnualDomainSegment, LocalAnnualDomainReading } from ".././local-annual-domain-reading";
import { buildAnnualEventReading, type AnnualEventSegment, type LocalAnnualEventReading } from "./local-annual-event-reading";
import { buildMonthlyDomainReadings, type LocalMonthlyDomainReadings, type MonthlyDomainSegment } from "./local-monthly-domain-reading";
import type { LocalMonthlyOutlook } from ".././local-detailed-outlook";
import type { LocalContextualReadingBundle } from ".././local-contextual-reading-record";
import type { ReadingContextReference } from ".././local-reading-context";
import type { LocalOutlookJudgment } from ".././local-outlook-judgment";

export const ANNUAL_MONTH_CONTEXT_VERSION = "hakimi.annual-month-context/0.1.0" as const;
export interface AnnualMonthGap extends AnnualDomainGap { source: "monthly" | "annual" | "link" }
export interface AnnualMonthPeriod {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string;
  /** Original derived objects, not a new period judgment. */
  monthlySegment: MonthlyDomainSegment;
  monthlyJudgment: LocalOutlookJudgment;
  annualSegment: AnnualEventSegment | null;
  annualDomainSegment: AnnualDomainSegment | null;
  conditions: string[];
}
export interface AnnualMonthBranch {
  id: AnnualDomainBranchId; label: string; periods: AnnualMonthPeriod[]; gaps: AnnualMonthGap[]; conditions: string[];
}
export interface AnnualMonth {
  monthId: string; label: string; ganZhi: string; stemTenGod: string; nodeRef: TransitNodeRef;
  startInstant: string; endExclusiveInstant: string;
  status: "ready" | "before_birth" | "unavailable";
  monthlyRelationshipFacts: {
    monthNodeRef: TransitNodeRef; natalPosition: "day"; natalGanZhi: string;
    relationType: "branch_six_combination" | "branch_six_clash";
    factId: string; ruleId: string;
    /** Relation engine's year slot is the month actor; day is natal day. */
    participants: RelationFact["participants"];
  }[];
  branches: AnnualMonthBranch[];
}
export interface AnnualMonthContext {
  version: typeof ANNUAL_MONTH_CONTEXT_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; contextRef: ReadingContextReference | null;
  year: number; yearGanZhi: string | null; yearNodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null;
  status: "ready" | "partial" | "before_birth" | "unavailable";
  months: AnnualMonth[]; limitations: string[];
}
export interface BuildAnnualMonthContextInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear;
  annualDomains: LocalAnnualDomainReading; annualEvents: LocalAnnualEventReading;
  monthly: LocalMonthlyOutlook; monthlyDomains: LocalMonthlyDomainReadings;
  contextual?: LocalContextualReadingBundle | null;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const sameRefs = (a: readonly TransitNodeRef[], b: readonly TransitNodeRef[]) => same(a.map(stable).sort(), b.map(stable).sort());
const fail = (message: string): never => { throw new Error(`年度与月份衔接：${message}`); };
const time = (value: string) => { const n = Date.parse(value); if (!Number.isFinite(n)) fail("区间瞬时点无效。"); return n; };
const limitations = [
  "只连接同一修订、同一立春年、同一顺逆分支及实际交集中的原文，不另算月度或领域吉凶。",
  "年度事项是持续背景，月份主题不等于年度事件将在本月兑现，也不构成月份发生概率或最佳时点。",
  "月度原文保留原年龄语境；年度自述适配仅按其已验证来源保留，不能把未适配的月例当成现实职业或关系状态。",
  "出生前、缺少年度内容或大运覆盖的区间完整保留，不从相邻月份、另一分支或另一交运段补入。",
];

export function buildAnnualMonthContext(input: BuildAnnualMonthContextInput): AnnualMonthContext {
  const revision = storedRevisionRecordSchema.parse(structuredClone(input.revision));
  const year = structuredClone(input.year), monthly = structuredClone(input.monthly);
  const events = buildAnnualEventReading({ revision, assessment: input.assessment, year, domains: input.annualDomains,
    ...(input.contextual === undefined ? {} : { contextual: input.contextual }) });
  if (!same(events, input.annualEvents)) fail("年度应事全文、适用背景或来源与同修订重建结果不一致。");
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment: input.assessment, monthly, contextual: input.contextual });
  if (!same(monthlyDomains, input.monthlyDomains)) fail("月份领域全文或分段与原流月重建结果不一致。");
  if (!same(monthlyDomains.contextRef, events.contextRef)) fail("年度与月份使用的阅读背景记录不一致。");
  const annualDomains = structuredClone(input.annualDomains);
  if (year.year !== monthly.year || year.year !== events.year || year.year !== monthlyDomains.year
    || !same(events.yearNodeRef, monthlyDomains.yearNodeRef) || events.yearGanZhi !== monthlyDomains.yearGanZhi
    || events.startInstant !== monthlyDomains.startInstant || events.endExclusiveInstant !== monthlyDomains.endExclusiveInstant) fail("年度与流月的原年节点、干支或完整边界不一致，不能借用邻年。");
  const sourceBinding = { caseId: revision.caseId, ...monthlyDomains.sourceBinding };
  if (!same(events.sourceBinding, sourceBinding)) fail("年度与月份源修订不一致。");
  const sourceVersions = unique([ANNUAL_MONTH_CONTEXT_VERSION, events.version, ...events.sourceVersions, annualDomains.version,
    ...annualDomains.sourceVersions, monthly.version, monthlyDomains.version, ...monthlyDomains.sourceVersions]);
  const base = { version: ANNUAL_MONTH_CONTEXT_VERSION, sourceBinding, sourceVersions, contextRef: events.contextRef,
    year: year.year, yearGanZhi: monthlyDomains.yearGanZhi, yearNodeRef: monthlyDomains.yearNodeRef,
    startInstant: monthlyDomains.startInstant, endExclusiveInstant: monthlyDomains.endExclusiveInstant };
  if (monthlyDomains.status === "unavailable") return { ...base, status: "unavailable", months: [], limitations: unique([...limitations, ...monthlyDomains.limitations, ...events.limitations]) };
  const birth = revision.timeCalibration.utcInstant ? time(revision.timeCalibration.utcInstant) : null;
  const months = monthlyDomains.months.map((month): AnnualMonth => {
    const original = monthly.months.find((item) => item.id === month.monthId);
    if (!original) return fail("月份缺少原节点对应。");
    const expectedGod = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[revision.facts.pillars.day.stem + month.ganZhi[0]!]!);
    if (original.stemTenGod !== expectedGod) fail("本月透干十神与日主及原月干不一致。");
    const from = time(month.startInstant), to = time(month.endExclusiveInstant);
    const branches = month.branches.map((branch): AnnualMonthBranch => {
      const annualBranch = events.branches.find((item) => item.id === branch.id), domainBranch = annualDomains.branches.find((item) => item.id === branch.id);
      if ((events.status === "ready" || events.status === "partial") && (!annualBranch || !domainBranch)) fail("月份缺少相同顺逆分支的年度来源。");
      const gaps: AnnualMonthGap[] = branch.gaps.map((gap) => ({ ...gap, source: "monthly" }));
      for (const gap of annualBranch?.gaps ?? []) {
        const start = Math.max(from, gap.startInstant ? time(gap.startInstant) : from), end = Math.min(to, gap.endExclusiveInstant ? time(gap.endExclusiveInstant) : to);
        if (start < end) gaps.push({ startInstant: new Date(start).toISOString(), endExclusiveInstant: new Date(end).toISOString(), message: gap.message, source: "annual" });
      }
      const periods = branch.segments.map((segment): AnnualMonthPeriod => {
        const originalJudgments = original.judgmentSegments.filter((item) => item.id === segment.id && item.branchId === branch.id);
        if (originalJudgments.length !== 1) fail("月份分段缺少唯一原判断。");
        const monthlyJudgment = originalJudgments[0]!.judgment;
        const start = time(segment.startInstant), end = time(segment.endExclusiveInstant);
        const matches = annualBranch?.segments.filter((candidate) => time(candidate.startInstant) <= start && end <= time(candidate.endExclusiveInstant)) ?? [];
        if (matches.length > 1) fail("同一月份区间有重复的年度分段。");
        const annualSegment = matches[0] ?? null;
        if (!annualSegment) {
          if (annualBranch?.segments.some((candidate) => time(candidate.startInstant) < end && start < time(candidate.endExclusiveInstant))) fail("本月分段跨越年度交运边界，不能借用某一侧内容。");
          if (events.status !== "unavailable" && !annualBranch?.gaps.some((gap) => gap.startInstant && gap.endExclusiveInstant && time(gap.startInstant) <= start && end <= time(gap.endExclusiveInstant))) fail("月份区间缺少同分支年度分段或明确缺口。");
          const message = "本月有原领域内容，但同一区间没有可用的年度应事内容；未从相邻段补入。";
          gaps.push({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, message, source: "link" });
          return { id: segment.id, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
            monthlySegment: segment, monthlyJudgment, annualSegment: null, annualDomainSegment: null, conditions: unique([...segment.conditions, message]) };
        }
        const annualDomainSegment = domainBranch?.segments.find((candidate) => candidate.id === annualSegment.id) ?? fail("年度应事分段缺少对应的年度领域。");
        if (annualSegment.branchId !== branch.id || annualDomainSegment.branchId !== branch.id
          || annualDomainSegment.startInstant !== annualSegment.startInstant || annualDomainSegment.endExclusiveInstant !== annualSegment.endExclusiveInstant) fail("年度领域与应事不是同一个原分段。");
        const yearRefs = segment.backgroundRefs.filter((ref) => ref.nodeType === "year"), luckRefs = segment.backgroundRefs.filter((ref) => ref.nodeType === "dayun");
        if (yearRefs.length !== 1 || !same(yearRefs[0], base.yearNodeRef) || yearRefs.length + luckRefs.length !== segment.backgroundRefs.length
          || !sameRefs(luckRefs, annualSegment.backgroundRefs) || !sameRefs(luckRefs, annualDomainSegment.backgroundRefs)) fail("月份与年度同段流年或大运完整引用不一致。");
        const expectedStart = Math.max(from, time(annualSegment.startInstant), birth ?? from), expectedEnd = Math.min(to, time(annualSegment.endExclusiveInstant));
        if (start !== expectedStart || end !== expectedEnd) fail("月份区间不是原月节点、年度同段与出生后范围的精确交集。");
        if (segment.judgmentVersion !== annualSegment.judgmentVersion || segment.policyVersion !== annualSegment.policyVersion) fail("年度与月份判断版本不一致。");
        return { id: segment.id, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
          monthlySegment: segment, monthlyJudgment, annualSegment, annualDomainSegment, conditions: unique([...segment.conditions, ...annualSegment.conditions]) };
      });
      return { id: branch.id, label: branch.label, periods, gaps, conditions: [...branch.conditions] };
    });
    const day = revision.facts.pillars.day;
    const monthlyRelationshipFacts = calculatePillarRelations({ year: month.ganZhi, month: revision.facts.pillars.month.ganZhi,
      day: day.ganZhi, hour: sourceBinding.includeHour ? revision.facts.pillars.hour.ganZhi : day.ganZhi }).facts
      .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2
        && (fact.relationType === "branch_six_combination" || fact.relationType === "branch_six_clash")
        && fact.participants.every((part) => part.component === "branch")
        && fact.participants.some((part) => part.position === "year" && part.value === month.ganZhi[1])
        && fact.participants.some((part) => part.position === "day" && part.value === day.branch))
      .map((fact) => ({ monthNodeRef: month.nodeRef, natalPosition: "day" as const, natalGanZhi: day.ganZhi,
        relationType: fact.relationType as "branch_six_combination" | "branch_six_clash", factId: fact.id, ruleId: fact.ruleId, participants: fact.participants }));
    return { monthId: month.monthId, label: month.label, ganZhi: month.ganZhi, stemTenGod: original.stemTenGod, nodeRef: month.nodeRef,
      startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant, status: month.status, monthlyRelationshipFacts, branches };
  });
  const status = months.every((month) => month.status === "before_birth") ? "before_birth"
    : months.some((month) => month.status !== "ready" || month.branches.some((branch) => branch.gaps.length)) ? "partial" : "ready";
  return { ...base, status, months, limitations: unique([...limitations, ...monthlyDomains.limitations, ...events.limitations]) };
}
