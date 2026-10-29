import { storedRevisionRecordSchema, type RevisionRecord, type TransitNode, type TransitNodeRef } from "@hakimi/contracts";
import { calculateTransitSnapshot, CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR } from "@hakimi/transit-core";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { LOCAL_DETAILED_QUERY_RANGE, type LocalLifeOutlook } from "./local-detailed-outlook";

export const LIFE_STAGE_ANNUAL_RANGE_VERSION = "hakimi.life-stage-annual-range/0.1.0" as const;
export interface LifeStageAnnualRange {
  version: typeof LIFE_STAGE_ANNUAL_RANGE_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  decadeId: string; branchId: "locked" | "forward" | "backward"; nodeRef: TransitNodeRef;
  startInstant: string; endExclusiveInstant: string;
  status: "complete" | "partial" | "unavailable";
  startYear: number | null; endYear: number | null;
  startYearNodeRef: TransitNodeRef | null; endYearNodeRef: TransitNodeRef | null;
  gaps: { startInstant: string; endExclusiveInstant: string; message: string }[];
}
const yearLabel = (node: TransitNode) => Number(new Date(Date.parse(node.startInstant) + 8 * 3_600_000).toISOString().slice(0, 4));
const sameRef = (left: TransitNodeRef, right: TransitNodeRef) =>
  Object.keys(left).length === Object.keys(right).length && Object.entries(left).every(([key, value]) => right[key as keyof TransitNodeRef] === value);

/** Resolve actual Lichun labels, never infer them from a decade's civil years. */
export async function resolveLifeStageAnnualRange(input: {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; life: LocalLifeOutlook; decadeId: string;
}): Promise<LifeStageAnnualRange> {
  const revision = storedRevisionRecordSchema.parse(structuredClone(input.revision));
  const assessment = structuredClone(input.assessment), life = structuredClone(input.life);
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  if (assessment.sourceBinding.revisionId !== revision.id || assessment.sourceBinding.chartResultHash !== revision.manifest.resultHash
    || assessment.sourceBinding.includeHour !== includeHour || life.revisionId !== revision.id || life.chartResultHash !== revision.manifest.resultHash) {
    throw new Error("大运年份范围与当前命盘来源不一致，已拒绝混用。");
  }
  const matches = life.decades.filter((item) => item.id === input.decadeId);
  if (matches.length !== 1) throw new Error("所选大运不存在或不唯一。");
  const stage = matches[0]!;
  const start = Date.parse(stage.startInstant), end = Date.parse(stage.endExclusiveInstant);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end
    || stage.nodeRef.nodeType !== "dayun" || stage.nodeRef.revisionId !== revision.id
    || stage.nodeRef.chartResultHash !== revision.manifest.resultHash) throw new Error("所选大运的节点或区间无效。");
  const base = {
    version: LIFE_STAGE_ANNUAL_RANGE_VERSION,
    sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour },
    decadeId: stage.id, branchId: stage.branchId, nodeRef: stage.nodeRef,
    startInstant: stage.startInstant, endExclusiveInstant: stage.endExclusiveInstant
  };
  const unavailable = (message: string): LifeStageAnnualRange => ({ ...base, status: "unavailable", startYear: null, endYear: null,
    startYearNodeRef: null, endYearNodeRef: null, gaps: [{ startInstant: stage.startInstant, endExclusiveInstant: stage.endExclusiveInstant, message }] });
  const supported = CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.supportedRange;
  const engineStart = Date.parse(`${supported.from}T00:00:00+08:00`);
  const engineEnd = Date.parse(`${supported.to}T23:59:59.999+08:00`);
  const manualDirection = stage.branchId === "locked" ? undefined : stage.branchId;
  const read = (at: number) => calculateTransitSnapshot({ revision, atInstant: new Date(at).toISOString(), ...(manualDirection ? { manualDirection } : {}) });
  // Clamp only the query instant, then take the engine's real year node. A
  // clipped target does not make the decade's unsupported portion available.
  let endpoints;
  try {
    endpoints = await Promise.all([read(Math.min(engineEnd, Math.max(engineStart, start))), read(Math.min(engineEnd, Math.max(engineStart, end - 1)))]);
  } catch { return unavailable("这步大运的端点未能取得可核对的立春年度，未借用其他年份代替。"); }
  for (const snapshot of endpoints) {
    const original = snapshot.tracks.dayun.find((node) => sameRef(node.ref, stage.nodeRef));
    if (!original || original.startInstant !== stage.startInstant || original.endExclusiveInstant !== stage.endExclusiveInstant
      || original.ganZhi !== stage.ganZhi) throw new Error("所选大运与引擎原节点不一致，已拒绝生成年份范围。");
  }
  const nodes: TransitNode[] = [];
  for (const snapshot of endpoints) {
    if (snapshot.slots.year.status !== "resolved") return unavailable("当前时间精度未能解析立春年度，保留原大运说明。");
    let node = snapshot.slots.year.node;
    const label = yearLabel(node), bounded = Math.min(LOCAL_DETAILED_QUERY_RANGE.monthlyToYear, Math.max(LOCAL_DETAILED_QUERY_RANGE.fromYear, label));
    if (bounded !== label) {
      try {
        const boundedSnapshot = await read(Date.parse(`${bounded}-07-01T04:00:00.000Z`));
        if (boundedSnapshot.slots.year.status !== "resolved") return unavailable("支持边界的完整立春年度未能解析。");
        node = boundedSnapshot.slots.year.node;
      } catch { return unavailable("支持边界的完整立春年度未能解析。"); }
    }
    nodes.push(node);
  }
  const first = nodes[0]!, last = nodes[1]!;
  const coveredStart = Math.max(start, Date.parse(first.startInstant));
  const coveredEnd = Math.min(end, Date.parse(last.endExclusiveInstant));
  if (coveredStart >= coveredEnd) return unavailable(`这步大运不在可完整阅读年与月的 ${LOCAL_DETAILED_QUERY_RANGE.fromYear}—${LOCAL_DETAILED_QUERY_RANGE.monthlyToYear} 立春年度范围内。`);
  const startYear = yearLabel(first), endYear = yearLabel(last);
  if (endYear < startYear || endYear - startYear + 1 > 12) throw new Error("这步大运的实际立春年度范围超过单次 1—12 年窗口，未截断冒充整步。");
  const gaps: LifeStageAnnualRange["gaps"] = [];
  if (coveredStart > start) gaps.push({ startInstant: stage.startInstant, endExclusiveInstant: new Date(coveredStart).toISOString(), message: "这段早于可完整阅读年与月的首个立春年度，保留原大运，不补造年度说明。" });
  if (coveredEnd < end) gaps.push({ startInstant: new Date(coveredEnd).toISOString(), endExclusiveInstant: stage.endExclusiveInstant, message: "这段超出可完整阅读年与月的末个立春年度，保留原大运，不补造年度说明。" });
  return { ...base, status: gaps.length ? "partial" : "complete", startYear, endYear, startYearNodeRef: first.ref, endYearNodeRef: last.ref, gaps };
}
