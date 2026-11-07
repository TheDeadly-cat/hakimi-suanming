import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { candidateSetRecordSchema, type CandidateSetRecord } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { aggregateCandidateMainRoutes, candidateRouteKey, prepareCandidateMainRoutes, type CandidateMainRoute, type CandidateRouteOutcome } from "./candidate-main-route";

const range = { startYear: 2030, endYear: 2032 };
let record: CandidateSetRecord, actual: CandidateMainRoute;
async function recordFor(date: string, timeZone: string, sex: "male" | "unspecified" = "unspecified") {
  const candidateSet = await calculateUnknownHourCandidates({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: null,
    timePrecision: "unknown_hour", timeZone, sex, lunarLeapMonth: false,
    location: { label: "合成未知时刻核对", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic engineering fixture" }, WORKING_DEFAULT_RULE_PROFILE);
  return candidateSetRecordSchema.parse({ schemaVersion: "1.0.0", recordVersion: 2, recordType: "unknown_hour_candidate_set",
    id: "11111111-1111-4111-8111-111111111111", alias: "合成全部候选", tags: [], notes: "synthetic", favorite: false, deletedAt: null,
    createdAt: "2026-11-07T00:00:00.000Z", updatedAt: "2026-11-07T00:00:00.000Z", candidateSet, snapshotDigest: await sha256Hex(candidateSet) });
}
beforeAll(async () => {
  record = await recordFor("1995-10-29", "America/New_York");
  actual = await prepareCandidateMainRoutes(record, range);
}, 60_000);

// Pure intersection scenarios start from the complete real producer result.
// Their changed directions are synthetic and do not claim a real common fate.
function commonOutcomes(): CandidateRouteOutcome[] {
  const outcomes = structuredClone(actual.outcomes);
  for (const outcome of outcomes) if (outcome.status === "ready") {
    outcome.route.gaps = [];
    outcome.route.stages.forEach(stage => { stage.state = "favorable"; stage.caption = "合成共同较顺"; });
  }
  return outcomes;
}

describe("unknown-hour candidate main-route intersection", () => {
  it("actually computes all 13 probes, both DST variants and both parallel directions without choosing a main chart", () => {
    expect(record.candidateSet.candidates).toHaveLength(13);
    const variants = record.candidateSet.candidates.flatMap(candidate => candidate.variants);
    expect(variants).toHaveLength(14);
    expect(actual.expectedVariantCount).toBe(14);
    expect(actual.checkedVariantCount, actual.issues.join("\n")).toBe(14);
    expect(actual.expectedRouteCount).toBe(28);
    expect(actual.checkedRouteCount, actual.issues.join("\n")).toBe(28);
    expect(actual.checkedProbeCount).toBe(13);
    const expected = record.candidateSet.candidates.flatMap(candidate => candidate.variants.flatMap(variant =>
      ["forward", "backward"].map(branchId => `${candidate.candidateId}/${variant.variantId}/${branchId}`)));
    expect(actual.outcomes.map(outcome => candidateRouteKey(outcome.source))).toEqual(expected);
    expect(new Set(actual.outcomes.map(outcome => outcome.source.syntheticRevisionId)).size).toBe(14);
    for (const outcome of actual.outcomes) {
      expect(outcome.status).toBe("ready");
      expect(outcome.source).toMatchObject({ recordId: record.id, snapshotDigest: record.snapshotDigest, candidateSetResultHash: record.candidateSet.resultHash });
      if (outcome.status === "ready") expect(outcome.route.sourceBinding.chartResultHash).toBe(outcome.source.chartResultHash);
    }
    expect(record.candidateSet.input).toMatchObject({ timePrecision: "unknown_hour", time: null });
    expect(actual.source).toMatchObject({ inputTimePrecision: "unknown_hour", inputTime: null });
    expect(actual.sourceVersions.some(version => version.includes("main-route-reading"))).toBe(true);
  });

  it("publishes only the direction shared by every candidate and keeps each source's conditions separate", () => {
    const outcomes = commonOutcomes(), before = structuredClone({ record, outcomes });
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status, result.issues.join("\n")).toBe("common");
    expect(result.headline).toContain("共同判断：较顺");
    expect(result.intervals.every(interval => interval.status === "common" && interval.members.length === 28)).toBe(true);
    expect(result.headline).not.toContain(outcomes[0]!.status === "ready" ? outcomes[0]!.route.keyCondition : "not present");
    expect({ record, outcomes }).toEqual(before);
    expect(result.outcomes).toEqual(outcomes);
    expect(result.limitations.join(" ")).toContain("并未穷尽全天每一刻");
  });

  it("never turns 27 agreeing routes into a common answer when the last route disagrees", () => {
    const outcomes = commonOutcomes(), last = outcomes.at(-1)!;
    if (last.status !== "ready") throw new Error("Fixture needs a real ready outcome");
    last.route.stages.forEach(stage => { stage.state = "caution"; });
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status).toBe("divergent");
    expect(result.headline).toContain("出现分歧");
    expect(result.firstDivergence?.factors).toContain("direction");
    expect(result.intervals.every(interval => interval.state === null)).toBe(true);
  });

  it.each(["missing", "duplicate", "failed", "wrong-record", "old-version"] as const)("keeps %s input incomplete instead of skipping it", kind => {
    const outcomes = commonOutcomes(), first = outcomes[0]!;
    if (kind === "missing") outcomes.pop();
    if (kind === "duplicate") outcomes.push(structuredClone(first));
    if (kind === "failed") outcomes[0] = { source: first.source, status: "failed", message: "synthetic failed variant" };
    if (kind === "wrong-record") first.source.recordId = "22222222-2222-4222-8222-222222222222";
    if (kind === "old-version" && first.status === "ready") first.route.sourceVersions.push("hakimi.local-outlook-judgment/0.0.0");
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status).toBe("incomplete");
    expect(result.headline).toContain("暂不能给共同主判断");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("does not omit the later DST variant or either of its parallel directions", () => {
    const outcomes = commonOutcomes().filter(outcome => outcome.source.choice !== "later");
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status).toBe("incomplete");
    expect(result.checkedVariantCount).toBe(13);
    expect(result.expectedVariantCount).toBe(14);
    expect(result.intervals.every(interval => interval.missingRouteKeys.length === 2)).toBe(true);
  });

  it("uses the union of actual interval boundaries rather than smoothing over a candidate's change", () => {
    const outcomes = commonOutcomes(), first = outcomes[0]!;
    if (first.status !== "ready") throw new Error("Fixture needs a real ready outcome");
    const original = first.route.stages[0]!;
    const middle = new Date(Math.floor((Date.parse(original.startInstant) + Date.parse(original.endExclusiveInstant)) / 2)).toISOString();
    first.route.stages.splice(0, 1, { ...original, id: `${original.id}:synthetic-before`, endExclusiveInstant: middle },
      { ...original, id: `${original.id}:synthetic-after`, startInstant: middle, state: "caution" });
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.intervals.some(interval => interval.endExclusiveInstant === middle && interval.status === "common")).toBe(true);
    expect(result.intervals.find(interval => interval.startInstant === middle)?.status).toBe("divergent");
    expect(result.firstDivergence?.atInstant).toBe(middle);
  });

  it("keeps a coverage gap incomplete even when every available state happens to agree", () => {
    const outcomes = commonOutcomes(), first = outcomes[0]!;
    if (first.status !== "ready") throw new Error("Fixture needs a real ready outcome");
    const stage = first.route.stages[0]!;
    first.route.gaps.push({ year: 2030, branchId: first.source.branchId, kind: "missing_background", startInstant: stage.startInstant,
      endExclusiveInstant: stage.endExclusiveInstant, message: "synthetic missing background", conditions: [] });
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status).toBe("incomplete");
    expect(result.intervals.some(interval => interval.status === "incomplete")).toBe(true);
  });

  it("retains the final pressure when all candidates share a pressure-opportunity-pressure sequence", () => {
    const outcomes = commonOutcomes();
    for (const outcome of outcomes) if (outcome.status === "ready") {
      outcome.route.stages = outcome.route.stages.flatMap(stage => stage.yearLinks.map((link, index) => ({ ...stage,
        id: `${stage.id}:synthetic-year:${index}`, startYear: link.year, endYear: link.year,
        startInstant: link.startInstant, endExclusiveInstant: link.endExclusiveInstant,
        state: link.year === 2031 ? "opportunity" as const : "caution" as const, yearLinks: [link]
      })));
    }
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status, result.issues.join("\n")).toBe("common");
    expect(result.headline).toContain("前段较费力，随后有机会但有条件，后段较费力");
    expect(result.intervals.at(-1)?.state).toBe("caution");
  });

  it("is independent of outcome ordering and does not use repeated evidence as votes", () => {
    const outcomes = commonOutcomes();
    expect(aggregateCandidateMainRoutes(record, range, [...outcomes].reverse())).toEqual(aggregateCandidateMainRoutes(record, range, outcomes));
  });

  it("rejects an unregistered qualitative category rather than accepting an inherited object key", () => {
    const outcomes = commonOutcomes(), first = outcomes[0]!;
    if (first.status !== "ready") throw new Error("Fixture needs a real ready outcome");
    Object.assign(first.route.stages[0]!, { state: "toString" });
    const result = aggregateCandidateMainRoutes(record, range, outcomes);
    expect(result.status).toBe("incomplete");
    expect(result.intervals[0]!.missingRouteKeys).toContain(candidateRouteKey(first.source));
  });

  it("checks persisted source integrity before starting any annual calculations", async () => {
    const corrupt = structuredClone(record); corrupt.snapshotDigest = "0".repeat(64);
    const onProgress = vi.fn();
    await expect(prepareCandidateMainRoutes(corrupt, { ...range, onProgress })).rejects.toThrow();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("cancels between variants without publishing the already calculated subset as a common result", async () => {
    let cancelled = false;
    const onProgress = vi.fn(progress => { if (progress.completedVariants === 1) cancelled = true; });
    await expect(prepareCandidateMainRoutes(record, { ...range, onProgress, isCancelled: () => cancelled })).rejects.toMatchObject({ name: "AbortError" });
    expect(onProgress.mock.calls.at(-1)![0].completedVariants).toBe(1);
  });

  it("keeps a real DST gap probe unresolved instead of substituting another clock time", async () => {
    const gapRecord = await recordFor("2018-11-04", "America/Sao_Paulo", "male");
    expect(gapRecord.candidateSet.candidates.some(candidate => candidate.variants.length === 0)).toBe(true);
    const result = await prepareCandidateMainRoutes(gapRecord, { startYear: 2030, endYear: 2030 });
    expect(result.status).toBe("incomplete");
    expect(result.checkedProbeCount).toBeLessThan(13);
    expect(result.issues.some(issue => issue.includes("时刻尚未解析"))).toBe(true);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.intervals.every(interval => interval.status === "incomplete" && interval.state === null && interval.missingProbeIds.length > 0)).toBe(true);
    expect(gapRecord.candidateSet.input).toMatchObject({ time: null, timePrecision: "unknown_hour" });
  }, 60_000);
});
