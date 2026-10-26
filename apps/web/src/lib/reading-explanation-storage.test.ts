import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  appendReadingExplanationIndex, readReadingExplanationIndex, validateReadingExplanationIndex,
  READING_EXPLANATION_INDEX_VERSION, READING_EXPLANATION_MARKER,
  READING_EXPLANATION_SHARED_VERSIONS_MARKER, READING_EXPLANATION_SHARED_VERSIONS_FORMAT,
  type ReadingConclusion, type ReadingExplanationIndex
} from "./reading-explanation-index";
import { encodeReadingReportBundle, decodeReadingReportBundle } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";

const WIRE_LIMIT = 3_000_000;
const EXPANDED_UTF8_LIMIT = 8 * 1024 * 1024;
const revisionId = "22600000-0000-4000-8000-000000000207";
const caseId = "22600000-0000-4000-8000-000000000107";
const endV1 = "<!-- /hakimi-reading-explanation-index-v1 -->";
const endV2 = "<!-- /hakimi-reading-explanation-index-v2 -->";
const json = (value: unknown) => JSON.stringify(value);

/** Declared storage fixtures are not calculated charts or prediction evidence. */
function fixture(count = 3): ReadingExplanationIndex {
  const conclusions: ReadingConclusion[] = Array.from({ length: count }, (_, n) => {
    const year = 2026 + Math.floor(n / 6) % 10;
    const level = n === 0 ? "natal" as const : n % 3 ? "year" as const : "month" as const;
    return { stableId: `${revisionId}/storage:${n}`, label: `完整结论 ${n}`, text: `原句 ${n}：条件、标点与换行均保留。\n🌿 e\u0301`,
      domain: n % 3 === 0 ? "career" : n % 3 === 1 ? "wealth" : "relationship",
      scope: level === "natal" ? { level, year: null, branchId: null, startInstant: null, endExclusiveInstant: null }
        : { level, year, branchId: n % 2 ? "forward" : "backward", startInstant: `${year}-02-04T00:00:00.000Z`,
          endExclusiveInstant: level === "year" ? `${year + 1}-02-04T00:00:00.000Z` : `${year}-03-05T00:00:00.000Z` },
      sourceSubjects: [`fact:${n}`, "literal-ref:0"], direction: n % 2 ? "neutral" : "pressured", origin: "calculated",
      sourceVersions: n % 2 ? ["producer/b", "producer/a"] : ["producer/a", "producer/b"], personalTextIds: [],
      evidence: { facts: [`独立事实 ${n}`], ruleApplications: [{ ruleId: `rule:${n}`, title: "原规则", decision: "保留有条件的判断。",
        support: ["本项支持"], limitations: ["不是必然结果"], sourceIds: n === 0 ? ["source-a"] : [], sourceSubjects: [`fact:${n}`] }],
        support: [`支持 ${n}`], limits: ["条件不省略"], unknowns: ["尚未核实实际发生"], citations: n === 0 ? ["source-a"] : [] } };
  });
  return validateReadingExplanationIndex({ version: READING_EXPLANATION_INDEX_VERSION, generatedAt: "2026-10-26T00:00:00.000Z",
    sourceSnapshot: { caseId, revisionId, chartResultHash: "synthetic-storage-hash", includeHour: true,
      input: { calendarType: "gregorian", sourceVersionsRef: 0, limitsRef: 1, literal: { format: "not-a-wire", sourceVersionSets: [["user text"]] } },
      ruleProfile: { id: "synthetic-profile" }, ruleProfileDigest: "synthetic-rule-digest", timeCalibration: {}, engineVersions: { engine: "synthetic/1" },
      context: { note: "{\"sourceVersionsRef\":0,\"limitsRef\":1}", sourceVersionsRef: 1, limitsRef: 0,
        sourceVersionSets: [["unchanged literal"]], evidenceLimitSets: [["literal condition"]],
        ruleApplicationRefs: [0], ruleApplicationPool: [{ title: "literal context, not a stored rule" }] },
      sourceVersions: ["producer/a", "producer/b"], reportVersion: "edition/storage-fixture", inputRecordedAt: "2026-10-25T00:00:00.000Z" },
    conclusions, sources: [{ id: "source-a", title: "合成来源", url: "https://example.invalid/source", locator: "测试位置", excerpt: "原文", interpretation: "原关联说明" },
      { id: "unrelated", title: "无关来源", url: "https://example.invalid/unrelated", locator: "另一位置", excerpt: "不能借用的原文", interpretation: "无自动关联" }],
    citationBindings: count ? [{ conclusionId: conclusions[0]!.stableId, sourceId: "source-a", producerField: "fixture.sourceIds", usageNote: "仅该项关联" }] : [],
    uncertainty: { revisionId, chartResultHash: "synthetic-storage-hash", inputReliability: "user_supplied_not_independently_verified",
      inputPrecision: "exact_minute", pillarStatus: "not_assessed", offsetsMinutes: [], changedPillars: [], blockedOffsets: [], interpretationStatus: "not_assessed", note: "未评估" },
    limitations: ["合成格式回归；不是命理判断。"] });
}

function twoPoolWire(index: ReadingExplanationIndex) {
  const sourceVersionSets: string[][] = [], evidenceLimitSets: string[][] = [];
  const positions = new Map<string, number>(), limitPositions = new Map<string, number>();
  const conclusions = index.conclusions.map(({ sourceVersions, ...item }) => {
    const key = json(sourceVersions);
    if (!positions.has(key)) { positions.set(key, sourceVersionSets.length); sourceVersionSets.push([...sourceVersions]); }
    const { limits, ...evidence } = item.evidence, limitKey = json(limits);
    if (!limitPositions.has(limitKey)) { limitPositions.set(limitKey, evidenceLimitSets.length); evidenceLimitSets.push([...limits]); }
    return { ...item, evidence: { ...evidence, limitsRef: limitPositions.get(limitKey)! }, sourceVersionsRef: positions.get(key)! };
  });
  return { format: READING_EXPLANATION_SHARED_VERSIONS_FORMAT, sourceVersionSets, evidenceLimitSets, index: { ...index, conclusions } };
}
function wire(index: ReadingExplanationIndex, shareRules = true) {
  const two = twoPoolWire(index), ruleApplicationPool: ReadingConclusion["evidence"]["ruleApplications"] = [];
  const positions = new Map<string, number>();
  const conclusions = two.index.conclusions.map(item => {
    if (!shareRules) return item;
    const { ruleApplications, ...evidence } = item.evidence;
    const ruleApplicationRefs = ruleApplications.map(rule => {
      const key = json(rule);
      if (!positions.has(key)) { positions.set(key, ruleApplicationPool.length); ruleApplicationPool.push(structuredClone(rule)); }
      return positions.get(key)!;
    });
    return { ...item, evidence: { ...evidence, ruleApplicationRefs } };
  });
  return { format: two.format, sourceVersionSets: two.sourceVersionSets, evidenceLimitSets: two.evidenceLimitSets,
    ...(shareRules ? { ruleApplicationPool } : {}), index: { ...two.index, conclusions } };
}
function frame(payload: unknown, version: 1 | 2, prefix = "# 原始档案\r\n原文不重算。") {
  return `${prefix}\n\n${version === 1 ? READING_EXPLANATION_MARKER : READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n${json(payload)}\n${version === 1 ? endV1 : endV2}`;
}
function mutateWire(index: ReadingExplanationIndex, mutate: (value: any) => void): string {
  const value = wire(index); mutate(value); return frame(value, 2);
}

describe("reading explanation storage compatibility and strict framing", () => {
  it("keeps the existing small v1 bytes and reads old optional fields without imposing sorted JSON keys", () => {
    const index = fixture(), prefix = "\ufeff# 旧档案\r\n逐字保留。🌿\n", before = json(index);
    const saved = appendReadingExplanationIndex(prefix, index);
    expect(saved).toBe(frame(index, 1, prefix));
    expect(readReadingExplanationIndex(saved)).toEqual(index);
    const { version, ...rest } = structuredClone(index);
    const old: any = { ...rest, version }; // This legal v1 order is not a sorted/canonical-v2 order.
    delete old.conclusions[0].personalTextIds;
    expect(readReadingExplanationIndex(frame(old, 1))).toEqual(index);
    expect(json(index)).toBe(before);
  });

  it("reads canonical small v2 and preserves literal ref-like data, array order, duplicates and independent arrays", () => {
    const index = fixture();
    index.conclusions[0]!.sourceVersions = ["same", "same", "second"];
    index.conclusions[1]!.sourceVersions = [];
    index.conclusions[2]!.sourceVersions = [...index.conclusions[0]!.sourceVersions];
    index.conclusions[0]!.evidence.limits = [...index.conclusions[0]!.sourceVersions];
    index.conclusions[1]!.evidence.limits = [];
    index.conclusions[2]!.evidence.limits = [...index.conclusions[0]!.sourceVersions];
    const ruleA = structuredClone(index.conclusions[0]!.evidence.ruleApplications[0]!);
    ruleA.provenance = { version: "provenance/1", producerVersion: "fixture/1", selector: "fixture", selection: "first", factRefs: ["fact:a"] };
    const ruleB = { ...structuredClone(ruleA), ruleId: "other-rule", title: "另一条规则" };
    index.conclusions[0]!.evidence.ruleApplications = [ruleA, ruleB, structuredClone(ruleA)];
    index.conclusions[1]!.evidence.ruleApplications = [];
    index.conclusions[2]!.evidence.ruleApplications = structuredClone(index.conclusions[0]!.evidence.ruleApplications);
    index.conclusions[0]!.text += `\n${READING_EXPLANATION_MARKER}\n${READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n${endV2}`;
    const before = json(index), restored = readReadingExplanationIndex(frame(wire(index), 2))!;
    expect(restored).toEqual(index);
    // Earlier two-pool experimental exports remain readable without rewriting.
    expect(readReadingExplanationIndex(frame(wire(index, false), 2))).toEqual(index);
    expect(restored.sourceSnapshot.input).toEqual(index.sourceSnapshot.input);
    expect(restored.sourceSnapshot.context).toEqual(index.sourceSnapshot.context);
    restored.conclusions[0]!.sourceVersions.push("local edit");
    expect(restored.conclusions[2]!.sourceVersions).toEqual(["same", "same", "second"]);
    expect(restored.conclusions[0]!.evidence.limits).toEqual(["same", "same", "second"]);
    restored.conclusions[0]!.evidence.limits.push("local condition edit");
    expect(restored.conclusions[2]!.evidence.limits).toEqual(["same", "same", "second"]);
    restored.conclusions[0]!.evidence.ruleApplications[0]!.support.push("local rule edit");
    restored.conclusions[0]!.evidence.ruleApplications[0]!.provenance!.factRefs.push("local fact edit");
    expect(restored.conclusions[0]!.evidence.ruleApplications[2]).toEqual(ruleA);
    expect(restored.conclusions[2]!.evidence.ruleApplications).toEqual([ruleA, ruleB, ruleA]);
    expect(json(index)).toBe(before);
    expect(appendReadingExplanationIndex("small", fixture())).toContain(`\n${READING_EXPLANATION_MARKER}\n`);
  });

  it("retains v1 reserved-marker strictness and rejects duplicate, mixed or unsupported framed blocks", () => {
    const index = fixture(), plain = "原文没有保存索引，也不据此补写新版依据。";
    expect(readReadingExplanationIndex(plain)).toBeNull();
    expect(readReadingExplanationIndex(appendReadingExplanationIndex(plain, index))).toEqual(index);
    const v1Literal = `旧 v1 保留标记 ${READING_EXPLANATION_MARKER} 即使在普通行中也按既有严格行为拒绝。`;
    expect(() => readReadingExplanationIndex(v1Literal)).toThrow();
    expect(() => appendReadingExplanationIndex(v1Literal, index)).toThrow();
    const literalInV1 = structuredClone(index); literalInV1.conclusions[0]!.text += READING_EXPLANATION_MARKER;
    expect(() => readReadingExplanationIndex(frame(literalInV1, 1))).toThrow();
    const old = frame(index, 1), shared = frame(wire(index), 2);
    for (const archive of [old, shared]) expect(() => appendReadingExplanationIndex(archive, index)).toThrow();
    for (const inline of [READING_EXPLANATION_MARKER, READING_EXPLANATION_SHARED_VERSIONS_MARKER,
      "<!-- hakimi-reading-explanation-index-v999 -->"]) {
      const prefix = `前文嵌入 ${inline} 后仍有文字，不能绕过保留家族检查。`;
      expect(() => appendReadingExplanationIndex(prefix, index)).toThrow();
      expect(() => readReadingExplanationIndex(frame(index, 1, prefix))).toThrow();
      expect(() => readReadingExplanationIndex(frame(wire(index), 2, prefix))).toThrow();
    }
    for (const archive of [old + "\n" + old, shared + "\n" + shared, old + "\n" + shared, shared + "\n" + old,
      `原文\n<!-- hakimi-reading-explanation-index-v999 -->\n{}\n<!-- /hakimi-reading-explanation-index-v999 -->`,
      shared.replace(endV2, endV1), shared.slice(0, -endV2.length), old + "\n追加文本", shared + "\n追加文本"]) {
      expect(() => readReadingExplanationIndex(archive)).toThrow();
    }
  });

  it("rejects noncanonical JSON, truncated payloads and unsupported or extra v2 structure", () => {
    const index = fixture();
    for (const version of [1, 2] as const) {
      const original = frame(version === 1 ? index : wire(index), version);
      const payload = json(version === 1 ? index : wire(index));
      const firstKey = version === 1 ? '"version"' : '"format"';
      const malformed = [original.replace(payload, " " + payload), original.replace(payload, payload + "\n"),
        original.replace(payload, payload.slice(0, -1)), original.replace(payload, payload.replace(`{${firstKey}:`, `{${firstKey}:"duplicate",${firstKey}:`)),
        original.replace(payload, payload.replace("原句", "\\u539f句"))];
      for (const value of malformed) expect(() => readReadingExplanationIndex(value)).toThrow();
    }
    for (const mutate of [
      (value: any) => { value.format = "hakimi.reading-explanation-shared-arrays/999"; },
      (value: any) => { value.extra = true; },
      (value: any) => { value.index.extra = true; },
      (value: any) => { value.index.conclusions[0].sourceVersions = ["unexpected literal field"]; },
      (value: any) => { delete value.index.conclusions[0].sourceVersionsRef; },
      (value: any) => { value.index.conclusions[0].evidence.limits = ["unexpected literal field"]; },
      (value: any) => { delete value.index.conclusions[0].evidence.limitsRef; },
      (value: any) => { value.index.conclusions[0].evidence = []; },
      (value: any) => { delete value.ruleApplicationPool; },
      (value: any) => { value.index.conclusions[0].evidence.ruleApplications = []; },
      (value: any) => { delete value.index.conclusions[0].evidence.ruleApplicationRefs; }
    ]) expect(() => readReadingExplanationIndex(mutateWire(index, mutate))).toThrow();
  });
});

describe("shared array pool bounds and original semantic validation", () => {
  it("rejects invalid references and malformed pool values at their original array/text bounds", () => {
    const index = fixture();
    for (const reference of [-1, 0.5, "0", true, null, 2]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.index.conclusions[0].sourceVersionsRef = reference; }))).toThrow();
    }
    for (const reference of [-1, 0.5, "0", true, null, 1]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.index.conclusions[0].evidence.limitsRef = reference; }))).toThrow();
    }
    for (const reference of [-1, 0.5, "0", true, null, 3]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.index.conclusions[0].evidence.ruleApplicationRefs = [reference]; }))).toThrow();
    }
    for (const references of [null, 0, "0", {}, Array.from({ length: 151 }, () => 0)]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.index.conclusions[0].evidence.ruleApplicationRefs = references; }))).toThrow();
    }
    for (const pool of [null, {}, ["not an array"], [[null]], [[3]], [["x".repeat(30_001)]], [Array.from({ length: 501 }, () => "x")], []]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.sourceVersionSets = pool; }))).toThrow();
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.evidenceLimitSets = pool; }))).toThrow();
    }
    const valid = fixture(1);
    for (const versions of [["x".repeat(30_000)], Array.from({ length: 500 }, (_, n) => `version:${n}`), []]) {
      valid.conclusions[0]!.sourceVersions = versions;
      valid.conclusions[0]!.evidence.limits = [...versions];
      expect(readReadingExplanationIndex(frame(wire(valid), 2))!.conclusions[0]!.sourceVersions).toEqual(versions);
      expect(readReadingExplanationIndex(frame(wire(valid), 2))!.conclusions[0]!.evidence.limits).toEqual(versions);
    }
    const application = structuredClone(valid.conclusions[0]!.evidence.ruleApplications[0]!);
    for (const applications of [[], Array.from({ length: 150 }, () => structuredClone(application))]) {
      valid.conclusions[0]!.evidence.ruleApplications = applications;
      expect(readReadingExplanationIndex(frame(wire(valid), 2))!.conclusions[0]!.evidence.ruleApplications).toEqual(applications);
    }
    for (const rule of [null, [], "not an object", { ...application, extra: true }, { ...application, support: [3] },
      { ...application, support: ["x".repeat(30_001)] }, { ...application, limitations: Array.from({ length: 501 }, () => "x") },
      { ...application, provenance: { version: "v", producerVersion: "p", selector: "s", selection: "s", factRefs: [], extra: true } }]) {
      expect(() => readReadingExplanationIndex(mutateWire(index, value => { value.ruleApplicationPool[0] = rule; }))).toThrow();
    }
  });

  it("rejects duplicate, unused and reordered pools even when they would expand to the same index", () => {
    const index = fixture();
    index.conclusions[1]!.evidence.limits = ["another limitation set"];
    const duplicate = wire(index); duplicate.sourceVersionSets.push([...duplicate.sourceVersionSets[0]!]);
    duplicate.index.conclusions[0]!.sourceVersionsRef = 2;
    const unused = wire(index); unused.sourceVersionSets.push(["unused"]);
    const reordered = wire(index); reordered.sourceVersionSets.reverse();
    for (const item of reordered.index.conclusions) item.sourceVersionsRef = 1 - item.sourceVersionsRef;
    const duplicateLimits = wire(index); duplicateLimits.evidenceLimitSets.push([...duplicateLimits.evidenceLimitSets[0]!]);
    duplicateLimits.index.conclusions[0]!.evidence.limitsRef = 2;
    const unusedLimits = wire(index); unusedLimits.evidenceLimitSets.push(["unused condition"]);
    const reorderedLimits = wire(index); reorderedLimits.evidenceLimitSets.reverse();
    for (const item of reorderedLimits.index.conclusions) item.evidence.limitsRef = 1 - item.evidence.limitsRef;
    const duplicateRules = wire(index); duplicateRules.ruleApplicationPool!.push(structuredClone(duplicateRules.ruleApplicationPool![0]!));
    (duplicateRules.index.conclusions[0]!.evidence as any).ruleApplicationRefs = [3];
    const unusedRules = wire(index); unusedRules.ruleApplicationPool!.push({ ...structuredClone(unusedRules.ruleApplicationPool![0]!), ruleId: "unused-rule" });
    const reorderedRules = wire(index); reorderedRules.ruleApplicationPool!.reverse();
    for (const item of reorderedRules.index.conclusions) (item.evidence as any).ruleApplicationRefs = (item.evidence as any).ruleApplicationRefs.map((ref: number) => 2 - ref);
    for (const value of [duplicate, unused, reordered, duplicateLimits, unusedLimits, reorderedLimits, duplicateRules, unusedRules, reorderedRules]) expect(() => readReadingExplanationIndex(frame(value, 2))).toThrow();
  });

  it("retains the original semantic guards after either v1 parsing or v2 expansion", () => {
    const mutations: ((value: ReadingExplanationIndex) => void)[] = [
      value => { value.conclusions[1]!.stableId = value.conclusions[0]!.stableId; },
      value => { value.sources[1]!.id = value.sources[0]!.id; },
      value => { value.uncertainty.chartResultHash = "other"; },
      value => { value.conclusions[1]!.stableId = `99999999-9999-4999-8999-999999999999/foreign`; },
      value => { value.citationBindings[0]!.conclusionId = "missing"; },
      value => { value.citationBindings[0]!.sourceId = "missing"; },
      value => { value.conclusions[0]!.evidence.citations = ["unrelated"]; },
      value => { value.conclusions[1]!.scope.endExclusiveInstant = value.conclusions[1]!.scope.startInstant; },
      value => { value.conclusions[1]!.scope.year = null; },
      value => { (value.conclusions[0]!.evidence as any).extra = true; }
    ];
    for (const mutate of mutations) {
      const index = fixture(); mutate(index);
      expect(() => readReadingExplanationIndex(frame(index, 1))).toThrow();
      expect(() => readReadingExplanationIndex(frame(wire(index), 2))).toThrow();
    }
  });

  it("preserves the exact 3M v1 write/read boundary and the same v2 wire-read boundary", () => {
    const index = fixture(1);
    index.sourceSnapshot.input.padding = "";
    index.sourceSnapshot.input.padding = "a".repeat(WIRE_LIMIT - json(index).length);
    expect(json(index).length).toBe(WIRE_LIMIT);
    expect(appendReadingExplanationIndex("legacy boundary", index)).toContain(`\n${READING_EXPLANATION_MARKER}\n`);
    expect(readReadingExplanationIndex(frame(index, 1))!.sourceSnapshot.input.padding).toBe(index.sourceSnapshot.input.padding);
    index.sourceSnapshot.input.padding = String(index.sourceSnapshot.input.padding) + "a";
    expect(() => readReadingExplanationIndex(frame(index, 1))).toThrow();
    // With one short array there is no saving to offset v2's framing overhead.
    expect(() => appendReadingExplanationIndex("still too large", index)).toThrow();

    const shared = wire(fixture(1)); shared.index.sourceSnapshot.input.padding = "";
    shared.index.sourceSnapshot.input.padding = "b".repeat(WIRE_LIMIT - json(shared).length);
    expect(json(shared).length).toBe(WIRE_LIMIT);
    expect(readReadingExplanationIndex(frame(shared, 2))!.conclusions).toHaveLength(1);
    shared.index.sourceSnapshot.input.padding = String(shared.index.sourceSnapshot.input.padding) + "b";
    expect(() => readReadingExplanationIndex(frame(shared, 2))).toThrow();
  });

  it("bounds expanded JSON by UTF8 bytes before materialization without lowering the legitimate 8MiB boundary", () => {
    const index = fixture(250);
    // All pooled fields contain Chinese and supplementary-plane characters.
    // Twelve distinct application objects also exercise two-digit references.
    const repeated = "汉".repeat(1_500) + "𐀀".repeat(1_125);
    const repeatedLimits = "汉".repeat(1_501) + "𐀀".repeat(1_124);
    const applications = Array.from({ length: 12 }, (_, n) => ({ ...structuredClone(index.conclusions[0]!.evidence.ruleApplications[0]!),
      ruleId: `budget-rule:${n}`, support: [repeated] }));
    for (const [n, item] of index.conclusions.entries()) {
      item.sourceVersions = [repeated]; item.evidence.limits = [repeatedLimits]; item.evidence.ruleApplications = [structuredClone(applications[n % 12]!)];
    }
    // The last empty arrays have negative replacement cost. A guard inside the
    // accumulation loop would reject this valid final boundary prematurely.
    index.conclusions.at(-1)!.sourceVersions = [];
    index.conclusions.at(-1)!.evidence.limits = [];
    index.conclusions.at(-1)!.evidence.ruleApplications = [];
    index.sourceSnapshot.input.padding = "";
    const padding = EXPANDED_UTF8_LIMIT - Buffer.byteLength(json(index), "utf8");
    expect(padding).toBeGreaterThan(0);
    index.sourceSnapshot.input.padding = "p".repeat(padding);
    expect(Buffer.byteLength(json(index), "utf8")).toBe(EXPANDED_UTF8_LIMIT);
    const shared = wire(index);
    expect(json(shared).length).toBeLessThan(WIRE_LIMIT);
    const restored = readReadingExplanationIndex(frame(shared, 2))!;
    expect(restored.conclusions).toHaveLength(250);
    expect(restored.conclusions.slice(0, -1).every(item => item.sourceVersions.length === 1 && item.sourceVersions[0] === repeated)).toBe(true);
    expect(restored.conclusions.slice(0, -1).every(item => item.evidence.limits.length === 1 && item.evidence.limits[0] === repeatedLimits)).toBe(true);
    expect(restored.conclusions.slice(0, -1).every((item, n) => json(item.evidence.ruleApplications) === json([applications[n % 12]]))).toBe(true);
    expect(restored.conclusions.at(-1)!.sourceVersions).toEqual([]);
    expect(restored.conclusions.at(-1)!.evidence.limits).toEqual([]);
    expect(restored.conclusions.at(-1)!.evidence.ruleApplications).toEqual([]);
    shared.index.sourceSnapshot.input.padding = String(shared.index.sourceSnapshot.input.padding) + "p";
    expect(json(shared).length).toBeLessThan(WIRE_LIMIT);
    expect(() => readReadingExplanationIndex(frame(shared, 2))).toThrow();
  });
});

it("writes oversized repeated-version indexes as lossless v2 through the unchanged report bundle and snapshot codec", async () => {
  const index = fixture(50);
  const repeated = Array.from({ length: 8 }, (_, n) => `producer:${n}:` + "x".repeat(8_000));
  for (const item of index.conclusions) item.sourceVersions = [...repeated];
  const original = json(index);
  expect(original.length).toBeGreaterThan(WIRE_LIMIT);
  expect(Buffer.byteLength(original, "utf8")).toBeLessThan(EXPANDED_UTF8_LIMIT);
  const archive = appendReadingExplanationIndex("# 全部原档案\n固定前文。", index);
  expect(archive).toContain(`\n${READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n`);
  expect(archive).not.toContain(`\n${READING_EXPLANATION_MARKER}\n`);
  const wirePayload = JSON.parse(archive.split(`\n${READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n`)[1]!.slice(0, -(`\n${endV2}`).length));
  expect(Array.isArray(wirePayload.ruleApplicationPool)).toBe(true);
  expect(wirePayload.index.conclusions.every((item: any) => Array.isArray(item.evidence.ruleApplicationRefs) && !Object.hasOwn(item.evidence, "ruleApplications"))).toBe(true);
  const report = { reading: "# 原阅读稿\r\n全部判断与条件。🌿", archive, version: index.sourceSnapshot.reportVersion };
  const encoded = await encodeReadingReportBundle(report), stored = await packReadingSnapshot(encoded);
  expect(stored.length).toBeLessThanOrEqual(200_000);
  const reopened = await decodeReadingReportBundle(await unpackReadingSnapshot(stored));
  expect(reopened).toEqual(report);
  expect(readReadingExplanationIndex(reopened!.archive)).toEqual(index);
  expect(json(index)).toBe(original);
}, 20_000);
