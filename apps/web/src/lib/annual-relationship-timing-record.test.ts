import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { createAnnualRelationshipTimingBuilder, type AnnualRelationshipTiming } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION, createAnnualRelationshipTimingRecordWriter, expandAnnualRelationshipTiming,
  type AnnualRelationshipTimingRecordPool, type CompactAnnualRelationshipTiming } from "./annual-relationship-timing-record";

const COMPACT = "关系时机紧凑记录：", POOL = "关系时机共享表：";
const readCompact = (lines: string[]): CompactAnnualRelationshipTiming => JSON.parse(lines.find((line) => line.startsWith(COMPACT))!.slice(COMPACT.length));
const readPool = (writer: ReturnType<typeof createAnnualRelationshipTimingRecordWriter>): AnnualRelationshipTimingRecordPool =>
  JSON.parse(writer.appendix().find((line) => line.startsWith(POOL))!.slice(POOL.length));
let timings: AnnualRelationshipTiming[];
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic lossless timing record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2028);
  const year = annual.years[0]!, build = createAnnualRelationshipTimingBuilder(revision, assessment);
  timings = year.judgmentSegments.map((segment) => build(year, segment));
});

describe("shallow lossless annual relationship metadata references", () => {
  it("restores all three real unknown-direction handover periods byte-for-byte without mixing branches", () => {
    expect(timings).toHaveLength(3);
    const before = JSON.stringify(timings), writer = createAnnualRelationshipTimingRecordWriter();
    const compact = timings.map((timing) => readCompact(writer.describe(timing))), pool = readPool(writer);
    expect(pool.format).toBe(ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION);
    expect(pool.sourceBindings).toHaveLength(1);
    expect(compact.map((item, index) => JSON.stringify(expandAnnualRelationshipTiming(item, pool)) === JSON.stringify(timings[index]))).toEqual([true, true, true]);
    const expectedRefs = timings.flatMap((timing) => [timing.scope.targetRef, ...timing.scope.backgroundRefs, ...timing.lenses.flatMap((lens) => lens.signals.map((signal) => signal.nodeRef))]);
    expect(pool.nodeRefs).toHaveLength(new Set(expectedRefs.map((ref) => JSON.stringify(ref))).size);
    expect(JSON.stringify(timings)).toBe(before);
  });

  it("emits a repeated record once and keeps every occurrence addressable by its record ID", () => {
    const writer = createAnnualRelationshipTimingRecordWriter();
    expect(writer.appendix()).toEqual([]);
    const first = writer.describe(timings[0]!), appendix = writer.appendix();
    expect(writer.describe(structuredClone(timings[0]!))).toEqual(["关系时机记录：rt-1"]);
    expect(writer.appendix()).toEqual(appendix);
    expect(JSON.stringify(expandAnnualRelationshipTiming(readCompact(first), readPool(writer)))).toBe(JSON.stringify(timings[0]));
  });

  it("preserves JSON key order, duplicate condition strings, all signal text and original Unicode exactly", () => {
    const reverse = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).reverse()) as T;
    const input = structuredClone(timings[0]!);
    input.sourceBinding = reverse(input.sourceBinding);
    input.scope = reverse({ ...input.scope, targetRef: reverse(input.scope.targetRef) });
    input.conditions.push("完整保留：甲乙、原文\n下一行 👩‍👩‍👧‍👦", "重复条件", "重复条件");
    input.lenses = input.lenses.map((lens) => reverse({ ...lens, signals: lens.signals.map((signal) => reverse({ ...signal, nodeRef: reverse(signal.nodeRef) })) }));
    const reordered = reverse(input), before = JSON.stringify(reordered), writer = createAnnualRelationshipTimingRecordWriter();
    const compact = readCompact(writer.describe(reordered));
    expect(JSON.stringify(expandAnnualRelationshipTiming(compact, readPool(writer)))).toBe(before);
    expect(JSON.stringify(reordered)).toBe(before);
  });

  it("does not expose aliases to the input, compact record or shared table", () => {
    const input = structuredClone(timings[0]!), before = JSON.stringify(input), writer = createAnnualRelationshipTimingRecordWriter();
    const compact = readCompact(writer.describe(input)), pool = readPool(writer);
    input.conditions[0] = "later input edit";
    const expanded = expandAnnualRelationshipTiming(compact, pool);
    expanded.conditions[0] = "later expanded edit";
    expanded.scope.targetRef.nodeId = "later-node-edit";
    expect(JSON.stringify(expandAnnualRelationshipTiming(compact, pool))).toBe(before);
    expect(readPool(writer)).toEqual(pool);
  });

  it("rejects missing, wrong-table, fractional, negative and out-of-range references", () => {
    const writer = createAnnualRelationshipTimingRecordWriter(), compact = readCompact(writer.describe(timings[0]!)), pool = readPool(writer);
    for (const badRef of [{ $ref: "conditions", index: 0 }, { $ref: "sourceBindings", index: -1 }, { $ref: "sourceBindings", index: 0.5 },
      { $ref: "sourceBindings", index: 99999 }, { $ref: "sourceBindings" }, { $ref: "sourceBindings", index: 0, extra: true }]) {
      const bad = structuredClone(compact); bad.value.sourceBinding = badRef;
      expect(() => expandAnnualRelationshipTiming(bad, pool)).toThrow("引用记录");
    }
  });

  it("rejects unsupported record/pool/model versions and malformed shared data without silently dropping anything", () => {
    const writer = createAnnualRelationshipTimingRecordWriter(), compact = readCompact(writer.describe(timings[0]!)), pool = readPool(writer);
    for (const patch of [{ format: "future/99" }, { nodeRefs: [{}] }, { sourceBindings: [{ ...pool.sourceBindings[0], sex: "other" }] },
      { conditions: ["not-an-array"] }, { sourceVersions: [[99]] }, { unexpected: [] }])
      expect(() => expandAnnualRelationshipTiming(compact, { ...pool, ...patch })).toThrow("引用记录");
    expect(() => expandAnnualRelationshipTiming({ ...compact, format: "future/99" }, pool)).toThrow("引用记录");
    const badModel = structuredClone(compact); badModel.value.version = "future/99";
    expect(() => expandAnnualRelationshipTiming(badModel, pool)).toThrow("引用记录");
    const omitted = structuredClone(compact); delete omitted.value.conditions;
    expect(() => expandAnnualRelationshipTiming(omitted, pool)).toThrow("引用记录");
    const next = createAnnualRelationshipTimingRecordWriter(), badInput = structuredClone(timings[0]!);
    (badInput.scope.targetRef as unknown as Record<string, unknown>).nodeId = null;
    expect(() => next.describe(badInput)).toThrow("引用记录");
    expect(next.appendix()).toEqual([]);
    expect(next.describe(timings[0]!)[0]).toBe("关系时机记录：rt-1");
  });
});
