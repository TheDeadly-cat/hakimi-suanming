import { storedCandidateSetRecordSchema, storedRevisionRecordSchema, type CandidateSetRecord, type UnknownHourProbeVariant } from "@hakimi/contracts";
import { verifyCandidateSetRecordIntegrity } from "@hakimi/chart-integrity";
import { canonicalStringify } from "@hakimi/integrity";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange, LOCAL_ANNUAL_OUTLOOK_VERSION } from "./local-annual-outlook";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION } from "./local-outlook-judgment";
import { buildMainRouteReading, MAIN_ROUTE_READING_VERSION, type MainRouteReading, type MainRouteStage, type MainRouteState } from "./main-route-reading";

export const CANDIDATE_MAIN_ROUTE_VERSION = "hakimi.candidate-main-route/0.1.0" as const;
type Branch = "locked" | "forward" | "backward";
export interface CandidateMainRouteRange { startYear: number; endYear: number }
export interface CandidateMainRouteSource {
  recordId: string; snapshotDigest: string; candidateSetResultHash: string; ruleProfileDigest: string; tzdbVersion: string;
  candidateId: string; probeIndex: number; representativeTime: string; variantId: string; choice: UnknownHourProbeVariant["choice"];
  instant: string; chartResultHash: string; branchId: Branch; syntheticRevisionId: string;
}
export type CandidateRouteOutcome = { source: CandidateMainRouteSource; status: "ready"; route: MainRouteReading }
  | { source: CandidateMainRouteSource; status: "failed"; message: string };
export interface CandidateCommonInterval {
  id: string; startInstant: string; endExclusiveInstant: string;
  status: "common" | "divergent" | "incomplete"; state: MainRouteState | null; label: string;
  members: { routeKey: string; stageId: string; state: MainRouteState }[];
  missingRouteKeys: string[]; missingProbeIds: string[];
}
export interface CandidateMainRoute {
  version: typeof CANDIDATE_MAIN_ROUTE_VERSION;
  source: { recordId: string; snapshotDigest: string; candidateSetResultHash: string; ruleProfileDigest: string; tzdbVersion: string;
    inputTimePrecision: "unknown_hour"; inputTime: null };
  range: CandidateMainRouteRange;
  status: "common" | "divergent" | "incomplete";
  headline: string; summary: string; issues: string[]; limitations: string[];
  expectedProbeCount: number; checkedProbeCount: number; expectedVariantCount: number; checkedVariantCount: number;
  expectedRouteCount: number; checkedRouteCount: number;
  firstDivergence: { atInstant: string; factors: ("birth_time" | "dst_choice" | "direction")[] } | null;
  intervals: CandidateCommonInterval[]; outcomes: CandidateRouteOutcome[]; sourceVersions: string[];
}
export interface CandidateMainRouteProgress { completedVariants: number; totalVariants: number; completedRoutes: number; totalRoutes: number }
const labels: Record<MainRouteState, string> = { favorable: "较顺", opportunity: "有机会但有条件", caution: "较费力",
  mixed: "利弊交织", theme: "主题明确，顺逆未定", unclear: "暂未确定" };
const unique = <T,>(items: readonly T[]) => [...new Set(items)];
const branchIds = (record: CandidateSetRecord): Branch[] => record.candidateSet.input.sex === "unspecified" ? ["forward", "backward"] : ["locked"];
export const candidateRouteKey = (source: Pick<CandidateMainRouteSource, "candidateId" | "variantId" | "branchId">) => `${source.candidateId}/${source.variantId}/${source.branchId}`;
const day = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 10);
function assertRange(range: CandidateMainRouteRange) {
  if (!Number.isInteger(range.startYear) || !Number.isInteger(range.endYear) || range.startYear < 1900 || range.endYear > 2100
    || range.endYear < range.startYear || range.endYear - range.startYear > 9) throw new Error("候选走势范围须在1900—2100年内，最多十年。");
}
function expectedSources(record: CandidateSetRecord) {
  return record.candidateSet.candidates.flatMap(candidate => candidate.variants.flatMap(variant => branchIds(record).map(branchId => ({
    recordId: record.id, snapshotDigest: record.snapshotDigest, candidateSetResultHash: record.candidateSet.resultHash,
    ruleProfileDigest: record.candidateSet.ruleProfileDigest, tzdbVersion: record.candidateSet.tzdbVersion,
    candidateId: candidate.candidateId, probeIndex: candidate.probeIndex, representativeTime: candidate.representativeTime,
    variantId: variant.variantId, choice: variant.choice, instant: variant.instant, chartResultHash: variant.chartResultHash, branchId
  }))));
}
function sourceMatches(actual: CandidateMainRouteSource, expected: ReturnType<typeof expectedSources>[number]) {
  const { syntheticRevisionId, ...identity } = actual;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(syntheticRevisionId)
    && canonicalStringify(identity) === canonicalStringify(expected);
}
function covers(stage: MainRouteStage, start: number, end: number) {
  return Date.parse(stage.startInstant) <= start && Date.parse(stage.endExclusiveInstant) >= end;
}
function divergenceFactors(members: CandidateCommonInterval["members"], outcomes: CandidateRouteOutcome[]) {
  const states = members.map(member => ({ ...member, source: outcomes.find(outcome => candidateRouteKey(outcome.source) === member.routeKey)!.source }));
  const factors: ("birth_time" | "dst_choice" | "direction")[] = [];
  for (const a of states) for (const b of states) {
    if (a.state === b.state) continue;
    if (a.source.variantId === b.source.variantId && a.source.branchId !== b.source.branchId) factors.push("direction");
    if (a.source.candidateId === b.source.candidateId && a.source.variantId !== b.source.variantId && a.source.branchId === b.source.branchId) factors.push("dst_choice");
    if (a.source.candidateId !== b.source.candidateId && a.source.branchId === b.source.branchId) factors.push("birth_time");
  }
  return unique(factors);
}

/** Pure display intersection of already calculated outcomes. The async entry
 * verifies the persisted record and every chart digest before producing these
 * outcomes. No representative, majority, favorable branch or averaged score is
 * selected. Each common interval needs every expected variant and direction. */
export function aggregateCandidateMainRoutes(raw: CandidateSetRecord, range: CandidateMainRouteRange, supplied: CandidateRouteOutcome[]): CandidateMainRoute {
  assertRange(range);
  const record = storedCandidateSetRecordSchema.parse(raw), expected = expectedSources(record), issues: string[] = [];
  const outcomes: CandidateRouteOutcome[] = [];
  const currentVersions = [MAIN_ROUTE_READING_VERSION, LOCAL_ANNUAL_OUTLOOK_VERSION, LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION];
  const expectedKeys = new Set(expected.map(candidateRouteKey));
  if (supplied.some(outcome => !expectedKeys.has(candidateRouteKey(outcome.source)))) issues.push("收到不属于本候选组的路线，未计入共同判断。");
  for (const source of expected) {
    const matches = supplied.filter(outcome => candidateRouteKey(outcome.source) === candidateRouteKey(source));
    if (matches.length !== 1) { issues.push(`${source.variantId} / ${source.branchId}：${matches.length ? "重复结果" : "尚未取得结果"}，不能计作已核对。`); continue; }
    const outcome = matches[0]!;
    if (!sourceMatches(outcome.source, source)) { issues.push(`${source.variantId}：来源身份不匹配。`); continue; }
    if (outcome.status === "failed") { outcomes.push(outcome); issues.push(`${source.variantId} / ${source.branchId}：${outcome.message}`); continue; }
    const route = outcome.route, binding = route.sourceBinding;
    const staleVersion = currentVersions.some(version => !route.sourceVersions.includes(version)
      || route.sourceVersions.some(item => item.startsWith(version.slice(0, version.lastIndexOf("/") + 1)) && item !== version));
    if (route.version !== MAIN_ROUTE_READING_VERSION || staleVersion || binding.caseId !== record.id || binding.revisionId !== outcome.source.syntheticRevisionId
      || binding.chartResultHash !== source.chartResultHash || binding.ruleProfileDigest !== source.ruleProfileDigest || !binding.includeHour
      || route.selectedBranchId !== source.branchId || route.range.startYear !== range.startYear || route.range.endYear !== range.endYear
      || route.status !== "ready") { issues.push(`${source.variantId} / ${source.branchId}：判断范围、分支或版本未完整对应。`); continue; }
    outcomes.push(outcome);
    if (route.gaps.length) issues.push(`${source.variantId} / ${source.branchId}：原年度判断存在覆盖缺口。`);
  }
  const missingProbeIds = record.candidateSet.candidates.filter(candidate => !candidate.variants.length).map(candidate => candidate.candidateId);
  for (const candidate of record.candidateSet.candidates) if (!candidate.variants.length) {
    issues.push(`${candidate.candidateId}：时刻尚未解析，没有可核对的变体。`);
  }
  const ready = outcomes.filter((outcome): outcome is Extract<CandidateRouteOutcome, { status: "ready" }> => outcome.status === "ready");
  const boundaries = unique(ready.flatMap(outcome => outcome.route.stages.flatMap(stage =>
    [stage.startInstant, stage.endExclusiveInstant, ...stage.yearLinks.flatMap(link => [link.startInstant, link.endExclusiveInstant])])).map(Date.parse))
    .filter(Number.isFinite).sort((a, b) => a - b);
  const intervals: CandidateCommonInterval[] = [];
  for (let index = 1; index < boundaries.length; index++) {
    const start = boundaries[index - 1]!, end = boundaries[index]!;
    if (start >= end) continue;
    const members: CandidateCommonInterval["members"] = [], missingRouteKeys: string[] = [];
    for (const source of expected) {
      const routeKey = candidateRouteKey(source), outcome = ready.find(item => candidateRouteKey(item.source) === routeKey);
      const stages = outcome?.route.stages.filter(stage => covers(stage, start, end)) ?? [];
      const gap = outcome?.route.gaps.some(item => item.startInstant === null || item.endExclusiveInstant === null
        || (Date.parse(item.startInstant) < end && Date.parse(item.endExclusiveInstant) > start));
      if (stages.length !== 1 || gap || stages[0]!.branchId !== source.branchId || !Object.hasOwn(labels, stages[0]!.state)) missingRouteKeys.push(routeKey);
      else members.push({ routeKey, stageId: stages[0]!.id, state: stages[0]!.state });
    }
    const states = unique(members.map(member => member.state));
    const status = missingProbeIds.length || missingRouteKeys.length || !expected.length ? "incomplete" : states.length === 1 ? "common" : "divergent";
    intervals.push({ id: `candidate-interval:${start}:${end}`, startInstant: new Date(start).toISOString(), endExclusiveInstant: new Date(end).toISOString(),
      status, state: status === "common" ? states[0]! : null, label: status === "common" ? labels[states[0]!] : status === "divergent" ? "候选判断有分歧" : "尚未完整核对",
      members, missingRouteKeys, missingProbeIds: [...missingProbeIds] });
  }
  if (!intervals.length) issues.push("没有可共同覆盖的实际年度区间。");
  if (intervals.some(interval => interval.status === "incomplete")) issues.push("部分实际区间缺少至少一条候选路线的有效判断。");
  const firstDivergent = intervals.find(interval => interval.status === "divergent");
  const firstDivergence = firstDivergent ? { atInstant: firstDivergent.startInstant, factors: divergenceFactors(firstDivergent.members, outcomes) } : null;
  const status = issues.length ? "incomplete" : firstDivergence ? "divergent" : "common";
  const commonStates = unique(intervals.flatMap(interval => interval.status === "common" && interval.state ? [interval.state] : []));
  const firstChange = intervals.find(interval => interval.state !== intervals[0]?.state), last = intervals.at(-1);
  const headline = status === "incomplete" ? "还未完成全部候选核对，暂不能给共同主判断。"
    : status === "divergent" ? `候选从${day(firstDivergence!.atInstant)}起出现分歧，暂不能定下一条路线。`
    : commonStates.length === 1 ? `全部候选在这段时间的共同判断：${labels[commonStates[0]!] }。`
      : `全部候选的共同变化：前段${intervals[0]!.label}，随后${firstChange!.label}${last?.state !== firstChange?.state ? `，后段${last!.label}` : ""}。`;
  const readyKeys = new Set(ready.map(outcome => candidateRouteKey(outcome.source)));
  const variants = record.candidateSet.candidates.flatMap(candidate => candidate.variants.map(variant => ({ candidate, variant })));
  const completeVariant = (candidateId: string, variantId: string) => branchIds(record).every(branchId => readyKeys.has(candidateRouteKey({ candidateId, variantId, branchId })));
  return { version: CANDIDATE_MAIN_ROUTE_VERSION,
    source: { recordId: record.id, snapshotDigest: record.snapshotDigest, candidateSetResultHash: record.candidateSet.resultHash,
      ruleProfileDigest: record.candidateSet.ruleProfileDigest, tzdbVersion: record.candidateSet.tzdbVersion, inputTimePrecision: "unknown_hour", inputTime: null },
    range: { ...range }, status, headline,
    summary: status === "common" ? "共同内容只表示所有已列探针在同一实际区间的方向一致；各候选的原因和适用条件仍分别查看。"
      : status === "divergent" ? "出生时刻、重复墙上时刻或顺逆假设仍影响结果。下方保留实际分歧区间，可明确选择一条假设查看。"
        : "未核对、失败或有覆盖缺口的候选不能被略过，其余候选也不能代替它。",
    issues: unique(issues), limitations: ["出生时刻仍为未知，未建立或保存唯一主盘。", "13个代表性探针并未穷尽全天每一刻，不是对所有可能出生瞬时的证明。",
      "一致指已有规则的定性方向一致，不代表现实结果的概率，也不表示各候选具有共同原因。", "当前辅助走势只在本页计算，未改写原候选组或旧报告。"],
    expectedProbeCount: 13, checkedProbeCount: record.candidateSet.candidates.filter(candidate => candidate.variants.length
      && candidate.variants.every(variant => completeVariant(candidate.candidateId, variant.variantId))).length,
    expectedVariantCount: variants.length, checkedVariantCount: variants.filter(({ candidate, variant }) => completeVariant(candidate.candidateId, variant.variantId)).length,
    expectedRouteCount: expected.length, checkedRouteCount: ready.length, intervals, outcomes,
    firstDivergence, sourceVersions: unique([CANDIDATE_MAIN_ROUTE_VERSION, record.candidateSet.algorithmId, record.candidateSet.probeDefinitionVersion,
      record.candidateSet.tzdbVersion, ...ready.flatMap(outcome => outcome.route.sourceVersions)]) };
}

/** Local, cancellable calculation only. Each variant gets its own temporary
 * revision for existing producers; these exact probe times are never written
 * back to the parent unknown-hour record or represented as an observed birth. */
export async function prepareCandidateMainRoutes(raw: CandidateSetRecord, options: CandidateMainRouteRange & {
  onProgress?: (progress: CandidateMainRouteProgress) => void; isCancelled?: () => boolean;
}): Promise<CandidateMainRoute> {
  assertRange(options);
  const assertActive = () => { if (options.isCancelled?.()) throw new DOMException("候选核对已取消。", "AbortError"); };
  assertActive();
  const record = await verifyCandidateSetRecordIntegrity(raw); assertActive();
  const expected = expectedSources(record), outcomes: CandidateRouteOutcome[] = [];
  const variants = record.candidateSet.candidates.flatMap(candidate => candidate.variants.map(variant => ({ candidate, variant })));
  let completedVariants = 0;
  const progress = () => options.onProgress?.({ completedVariants, totalVariants: variants.length, completedRoutes: outcomes.length, totalRoutes: expected.length });
  progress();
  for (const { candidate, variant } of variants) {
    assertActive();
    await new Promise<void>(resolve => setTimeout(resolve, 0)); assertActive();
    const syntheticRevisionId = crypto.randomUUID();
    const sources = expected.filter(source => source.candidateId === candidate.candidateId && source.variantId === variant.variantId)
      .map(source => ({ ...source, syntheticRevisionId }));
    try {
      const revision = storedRevisionRecordSchema.parse({ ...variant.chart, schemaVersion: "1.0.0", id: syntheticRevisionId,
        caseId: record.id, revisionNumber: 1, createdAt: record.createdAt });
      const assessment = buildBaziPreliminaryAssessment(revision);
      const annual = await buildLocalAnnualOutlookRange(revision, assessment, options.startYear, options.endYear); assertActive();
      for (const source of sources) {
        assertActive();
        try {
          const route = buildMainRouteReading({ revision, annual, includeHour: true, selectedYear: options.startYear,
            range: options.endYear === options.startYear ? "year" : options.endYear - options.startYear < 3 ? "three_years" : "ten_years", branchId: source.branchId });
          outcomes.push({ source, status: "ready", route });
        } catch { outcomes.push({ source, status: "failed", message: "该假设的年度判断未能完整核对。" }); }
      }
    } catch (error) {
      assertActive();
      for (const source of sources) outcomes.push({ source, status: "failed", message: "该时刻变体的年度结果未能生成。" });
    }
    completedVariants += 1; progress();
  }
  assertActive();
  return aggregateCandidateMainRoutes(record, options, outcomes);
}
