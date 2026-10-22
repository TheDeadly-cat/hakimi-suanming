import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { resolveLifeStageAnnualRange } from "./local-annual-range";

type Input = Omit<Parameters<typeof resolveLifeStageAnnualRange>[0], "decadeId">;
const cases = new Map<string, Input>();
beforeAll(async () => {
  for (const [id, date, time, sex] of [["a", "1995-08-18", "08:26", "unspecified"], ["r3", "2019-12-22", "11:23", "female"]] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
      location: { label: "Synthetic exact stage year range", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, 2026);
    cases.set(id, { revision, assessment, life });
  }
});

it("reads all eleven Lichun years of the actual backward stage and preserves the original default ten-year result", async () => {
  const input = cases.get("a")!, stage = input.life.decades.find((item) => item.branchId === "backward" && item.ganZhi === "庚辰")!;
  const range = await resolveLifeStageAnnualRange({ ...input, decadeId: stage.id });
  expect(range.status).toBe("complete"); expect([range.startYear, range.endYear]).toEqual([2028, 2038]); expect(range.gaps).toEqual([]);
  expect(range.nodeRef).toEqual(stage.nodeRef); expect(range.startYearNodeRef!.startInstant).toContain("2028-02-");
  const [annual, legacy, ten] = await Promise.all([
    buildLocalAnnualOutlookRange(input.revision, input.assessment, 2028, 2038),
    buildLocalAnnualOutlook(input.revision, input.assessment, 2028),
    buildLocalAnnualOutlookRange(input.revision, input.assessment, 2028, 2037)
  ]);
  expect(annual.years).toHaveLength(11); expect(annual.years.slice(0, 10)).toEqual(legacy.years); expect(ten).toEqual(legacy);
  expect(annual.years[0]!.judgmentSegments.filter((item) => item.branchId === "backward")).toHaveLength(2);
  expect(annual.years[0]!.judgmentSegments.find((item) => item.branchId === "backward" && item.startInstant === stage.startInstant)!.judgment.backgroundRefs).toContainEqual(stage.nodeRef);
}, 30_000);

it("keeps the two direction branches on their own exact decade references", async () => {
  const input = cases.get("a")!, forward = input.life.decades.find((item) => item.branchId === "forward" && item.ganZhi === "丁亥")!, backward = input.life.decades.find((item) => item.branchId === "backward" && item.ganZhi === "辛巳")!;
  const results = await Promise.all([forward, backward].map((stage) => resolveLifeStageAnnualRange({ ...input, decadeId: stage.id })));
  expect(results.map((item) => item.branchId)).toEqual(["forward", "backward"]);
  expect(results[0]!.nodeRef.manualDirection).toBe("forward"); expect(results[1]!.nodeRef.manualDirection).toBe("backward");
  expect(results[0]!.startInstant).not.toBe(results[1]!.startInstant);
  for (const result of results) expect(result.endYear! - result.startYear! + 1).toBe(11);
});

it("clips late decades to complete supported Lichun years and explicitly keeps the unsupported remainder", async () => {
  const input = cases.get("r3")!, stage = input.life.decades.find((item) => item.startYear <= 2099 && item.endYear >= 2101)!;
  expect(stage).toBeDefined();
  const result = await resolveLifeStageAnnualRange({ ...input, decadeId: stage.id });
  expect(result.status).toBe("partial"); expect(result.endYear).toBe(2099);
  expect(result.gaps).toEqual([expect.objectContaining({ endExclusiveInstant: stage.endExclusiveInstant })]);
  expect(result.gaps[0]!.startInstant).toContain("2100-02-");
  const outside = input.life.decades.find((item) => Date.parse(item.startInstant) > Date.parse(result.gaps[0]!.startInstant))!;
  expect(outside).toBeDefined();
  const unavailable = await resolveLifeStageAnnualRange({ ...input, decadeId: outside.id });
  expect(unavailable.status).toBe("unavailable"); expect(unavailable.startYear).toBeNull(); expect(unavailable.endYear).toBeNull();
  expect(unavailable.gaps).toEqual([expect.objectContaining({ startInstant: outside.startInstant, endExclusiveInstant: outside.endExclusiveInstant })]);
});

it("rejects altered sources, hours, node bounds and unsupported range requests without inventing a replacement", async () => {
  const input = cases.get("a")!, stage = input.life.decades[0]!;
  const changed = structuredClone(input); changed.life.decades[0]!.endExclusiveInstant = "2080-01-01T00:00:00.000Z";
  await expect(resolveLifeStageAnnualRange({ ...changed, decadeId: stage.id })).rejects.toThrow("原节点不一致");
  const hour = structuredClone(input); hour.assessment.sourceBinding.includeHour = false;
  await expect(resolveLifeStageAnnualRange({ ...hour, decadeId: stage.id })).rejects.toThrow("来源不一致");
  for (const [from, to] of [[2026, 2025], [2026, 2038], [1899, 1900], [2099, 2101], [2026.5, 2027]]) {
    await expect(buildLocalAnnualOutlookRange(input.revision, input.assessment, from!, to!)).rejects.toThrow("1—12");
  }
});
