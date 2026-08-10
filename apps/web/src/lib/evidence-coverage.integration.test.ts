import { describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { buildEvidenceCoverageReport } from "@hakimi/knowledge-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

describe("Bazi core evidence coverage", () => {
  it("counts every one of the current 36 provenance fields, including xun, without inventing citations", async () => {
    const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const first = await buildEvidenceCoverageReport({
      provenance: chart.facts.fieldProvenance,
      citations: [],
      sourceRights: []
    });
    const second = await buildEvidenceCoverageReport({
      provenance: [...chart.facts.fieldProvenance].reverse(),
      citations: [],
      sourceRights: []
    });

    expect(first.metrics.provenanceCompleteness).toEqual({ numerator: 36, denominator: 36, rate: 1 });
    expect(first.metrics.structuredLink).toEqual({ numerator: 0, denominator: 36, rate: 0 });
    expect(first.provenanceStatusCounts.experimental).toBe(36);
    expect(first.rows.filter((row) => row.subject.fieldPaths[0]?.endsWith(".xun"))).toHaveLength(4);
    expect(first.unregistered).toEqual([]);
    expect(first.digest).toBe(second.digest);
  });
});
