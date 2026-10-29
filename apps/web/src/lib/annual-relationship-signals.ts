import { transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { calculatePillarRelations } from "@hakimi/relations-core";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgmentSegment } from "./local-outlook-judgment";

export const ANNUAL_RELATIONSHIP_SIGNALS_VERSION = "hakimi.annual-relationship-signals/0.1.0" as const;
/** A fact from the target year or its actual, separately identified background.
 * Positions inside the original pair-scan fact ID are not re-labelled. */
export interface AnnualRelationshipSignal {
  source: "year" | "dayun";
  relationType: "branch_six_combination" | "branch_six_clash";
  nodeRef: TransitNodeRef; ganZhi: string;
  natalPosition: "day"; natalGanZhi: string;
  factId: string; ruleId: string;
  segmentId: string; branchId: "locked" | "forward" | "backward";
  startInstant: string; endExclusiveInstant: string;
}
export interface BuildAnnualRelationshipSignalsInput {
  revision: RevisionRecord; year: LocalAnnualYear; segment: LocalOutlookJudgmentSegment;
}

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (message: string): never => { throw new Error(`年度关系依据：${message}`); };

/** The parent event builder verifies the whole annual/domain product first.
 * This leaf additionally binds every retained pair fact to that exact segment
 * and its registered target/background references; it never discovers a new
 * background by looking for a nearby decade or joining another direction. */
export function buildAnnualRelationshipSignals({ revision, year, segment }: BuildAnnualRelationshipSignalsInput): AnnualRelationshipSignal[] {
  if (!year.transitNodeRef || !year.yearGanZhi || !year.startInstant || !year.endExclusiveInstant) return fail("缺少本年原节点或区间。");
  const originals = year.judgmentSegments.filter((item) => item.id === segment.id && item.branchId === segment.branchId);
  if (originals.length !== 1 || !same(originals[0], segment)) return fail("分段不是原年度中的唯一完整分段。");
  const start = Date.parse(segment.startInstant), end = Date.parse(segment.endExclusiveInstant);
  const yearStart = Date.parse(year.startInstant), yearEnd = Date.parse(year.endExclusiveInstant);
  const target = transitNodeRefSchema.parse(segment.judgment.targetRef), yearRef = transitNodeRefSchema.parse(year.transitNodeRef);
  const binding = segment.judgment.sourceBinding;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  if (![start, end, yearStart, yearEnd].every(Number.isFinite) || start >= end || start < yearStart || end > yearEnd
    || segment.judgment.interval.startInstant !== segment.startInstant || segment.judgment.interval.endExclusiveInstant !== segment.endExclusiveInstant
    || target.nodeType !== "year" || !same(target, yearRef) || target.startInstant !== year.startInstant
    || target.revisionId !== revision.id || target.chartResultHash !== revision.manifest.resultHash
    || binding.revisionId !== revision.id || binding.chartResultHash !== revision.manifest.resultHash || binding.includeHour !== includeHour) return fail("年度、分段或命盘来源不一致。");
  if ((revision.input.sex === "unspecified") !== (segment.branchId !== "locked")) return fail("分段顺逆与本命性别范围不一致。");
  const backgroundRefs = segment.judgment.backgroundRefs;
  if (backgroundRefs.length > 1) return fail("同一年度分段不能混入多个大运背景。");
  const overlapping = year.dayunSegments.filter((item) => item.direction === segment.branchId
    && Date.parse(item.startInstant) < end && start < Date.parse(item.endExclusiveInstant));
  if (overlapping.length !== backgroundRefs.length || overlapping.some((item) => !backgroundRefs.some((ref) => same(ref, item.nodeRef)))) return fail("分段的大运背景与原年度实际覆盖不一致。");
  const backgrounds = backgroundRefs.map((supplied) => {
    const ref = transitNodeRefSchema.parse(supplied);
    const matches = year.dayunSegments.filter((item) => item.direction === segment.branchId && same(item.nodeRef, ref));
    if (matches.length !== 1) return fail("背景节点缺少同分支的唯一原大运。");
    const original = matches[0]!, expectedDirection = segment.branchId === "locked" ? null : segment.branchId;
    const sourceStart = Date.parse(original.sourceStartInstant), sourceEnd = Date.parse(original.sourceEndExclusiveInstant);
    if (ref.nodeType !== "dayun" || ref.revisionId !== target.revisionId || ref.chartResultHash !== target.chartResultHash
      || ref.ruleProfileDigest !== target.ruleProfileDigest || ref.luckCycleRuleDigest !== target.luckCycleRuleDigest
      || ref.timelineVersion !== target.timelineVersion || ref.algorithmId !== target.algorithmId || ref.manualDirection !== expectedDirection
      || ref.startInstant !== original.sourceStartInstant || !Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd) || sourceStart >= sourceEnd
      || start !== Math.max(yearStart, sourceStart) || end !== Math.min(yearEnd, sourceEnd)
      || Date.parse(original.startInstant) !== start || Date.parse(original.endExclusiveInstant) !== end) return fail("背景不能跨段、跨方向或超出实际交运交集。");
    return { nodeRef: ref, ganZhi: original.ganZhi };
  });
  const natalGanZhi = revision.facts.pillars.day.ganZhi;
  const pair = (source: AnnualRelationshipSignal["source"], nodeRef: TransitNodeRef, ganZhi: string): AnnualRelationshipSignal[] =>
    calculatePillarRelations({ year: ganZhi, month: natalGanZhi, day: ganZhi, hour: natalGanZhi }).facts
      .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2
        && (fact.relationType === "branch_six_combination" || fact.relationType === "branch_six_clash")
        && fact.participants.every((part) => part.component === "branch")
        && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"))
      .map((fact) => ({ source, relationType: fact.relationType as AnnualRelationshipSignal["relationType"], nodeRef: structuredClone(nodeRef), ganZhi,
        natalPosition: "day", natalGanZhi, factId: fact.id, ruleId: fact.ruleId, segmentId: segment.id, branchId: segment.branchId,
        startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant }));
  return [...pair("year", target, year.yearGanZhi), ...backgrounds.flatMap((background) => pair("dayun", background.nodeRef, background.ganZhi))];
}
