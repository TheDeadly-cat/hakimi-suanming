import { expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { createOutlookRescueVerifier } from "./local-outlook-judgment";
import { buildAnnualRescueLifeProse } from "./annual-rescue-life-prose";

// Q06 is a newly constructed exploratory sample used to diagnose this defect.
// It is a known-case regression, not a blind test or prediction accuracy result.
it("keeps the real Q06 2034 uncounted owl candidates when no visible food object was selected", async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1999-10-11", time: "03:28",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Q06 synthetic rescue regression", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic exploratory sample" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "22600000-0000-4000-8000-000000000206",
    caseId: "22600000-0000-4000-8000-000000000106", revisionNumber: 1, createdAt: "2026-10-26T00:00:00.000Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, 2034, 2034);
  const year = annual.years[0]!, verify = createOutlookRescueVerifier(revision, assessment);
  const traces = year.judgmentSegments.map(segment => verify({ judgment: segment.judgment,
    target: { nodeType: "year", ganZhi: year.yearGanZhi!, ref: year.transitNodeRef! },
    backgrounds: segment.judgment.backgroundRefs.map(ref => ({ nodeType: "dayun",
      ganZhi: year.dayunSegments.find(part => JSON.stringify(part.nodeRef) === JSON.stringify(ref))!.ganZhi, ref })) }));
  const candidates = traces.flatMap(trace => trace.items).filter(item => item.kind === "wealth_controls_owl" && !item.protectedObjects.length);
  expect(candidates).toHaveLength(2);
  for (const item of candidates) {
    expect(item.helpers.every(helper => helper.group === "wealth")).toBe(true);
    expect(item.obstacles.every(obstacle => obstacle.tenGod === "偏印")).toBe(true);
    expect(item.countsAsSupport).toBe(false);
    expect(item.obstacleRelations).toEqual([]);
    expect(item.counterEffects).toEqual(expect.arrayContaining([expect.objectContaining({ status: "conditional", targets: [] })]));
  }
  const before = structuredClone(traces);
  for (const trace of traces) {
    const prose = buildAnnualRescueLifeProse(trace);
    for (const item of trace.items) expect(prose.groups.flatMap(group => group.traceIds)).toContain(item.id);
    const specific = trace.items.filter(item => item.kind === "counter_obstacle" && item.protectedObjects.length);
    expect(specific.length).toBeGreaterThan(0);
    for (const item of candidates.filter(value => trace.items.includes(value))) {
      const group = prose.groups.find(value => value.traceIds.includes(item.id))!;
      expect(group.text).toContain("这条配合自身尚未确认哪一项熟悉做法会直接受益");
      expect(group.rescueRefs).toEqual(expect.arrayContaining(item.rescueRefs));
      expect(group.basisRefs).toEqual(expect.arrayContaining(item.conditionRefs));
    }
  }
  expect(traces).toEqual(before);
}, 20_000);
