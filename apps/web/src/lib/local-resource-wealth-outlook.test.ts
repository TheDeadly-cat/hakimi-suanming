import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import type { LocalOutlookJudgment } from "./local-outlook-judgment";

async function fixture(date: string, time: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic resource wealth task", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic, no biographical claim" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  return { revision, assessment: buildBaziPreliminaryAssessment(revision) };
}
const pattern = (judgment: LocalOutlookJudgment) => judgment.axes.find((axis) => axis.axis === "pattern")!;
let metal: Awaited<ReturnType<typeof fixture>>, wood: Awaited<ReturnType<typeof fixture>>;
let annual: Awaited<ReturnType<typeof buildLocalAnnualOutlook>>;
beforeAll(async () => {
  [metal, wood] = await Promise.all([fixture("1999-01-09", "02:26"), fixture("2018-11-19", "14:26")]);
  annual = await buildLocalAnnualOutlook(metal.revision, metal.assessment, 2026);
});

describe("actual resource wealth path is shared by natal and timed readings", () => {
  it("distinguishes a usable wealth role from a wealth stem tied to the natal resource", () => {
    const free = annual.years.find((year) => year.year === 2035)!.ownJudgment!;
    const tied = annual.years.find((year) => year.year === 2034)!.ownJudgment!;
    expect(pattern(free)).toMatchObject({ pathId: "resource-wealth", effect: "assists" });
    expect(pattern(free).summary).toContain("乙偏财原已透出，本期再现");
    expect(pattern(tied)).toMatchObject({ pathId: "resource-wealth", effect: "unresolved" });
    expect(pattern(tied).summary).toContain("天干五合");
    expect(tied.primaryAxis).toBe("pattern"); expect(tied.label).toBe("条件性");
    expect(pattern(tied).sourceIds).toContain("outlook-zq-resource-wealth");
    expect(pattern(tied).summary).toContain("不把财再现直接读成财运转好");
  });

  it("retains the natal wealth task under a new print, and never makes a tied original wealth freely effective", async () => {
    const extraPrint = annual.years.find((year) => year.year === 2029)!.ownJudgment!;
    expect(pattern(extraPrint).effect).toBe("mixed");
    expect(pattern(extraPrint).summary).toContain("继续增加已有的印支持");
    expect(pattern(extraPrint).rescues.join()).toContain("乙偏财");
    expect(pattern(extraPrint).blockers.join()).not.toContain("财克关键");
    const woodYears = await buildLocalAnnualOutlook(wood.revision, wood.assessment, 2036);
    const recurringWealth = woodYears.years.find((year) => year.year === 2038)!.ownJudgment!;
    expect(pattern(recurringWealth).pathId).toBe("resource-wealth");
    expect(pattern(recurringWealth).effect).toBe("unresolved");
    expect(pattern(recurringWealth).unresolvedConditions.join()).toContain("天干五合");
    expect(recurringWealth.primaryAxis).toBe("pattern");
  });

  it("carries the same factual path through actual two-direction years, decades and twelve months without moving intervals", async () => {
    const source = await fixture("1999-01-09", "02:26", "unspecified"), before = JSON.stringify(source);
    const [years, life, months] = await Promise.all([
      buildLocalAnnualOutlook(source.revision, source.assessment, 2026),
      buildLocalLifeOutlook(source.revision, source.assessment, 2026),
      buildLocalMonthlyOutlook(source.revision, source.assessment, 2035)
    ]);
    expect(years.years).toHaveLength(10); expect(months.months).toHaveLength(12);
    expect(new Set(years.years.flatMap((year) => year.judgmentSegments.map((segment) => segment.branchId)))).toEqual(new Set(["forward", "backward"]));
    const judgments = [...life.decades.map((decade) => decade.judgment), ...months.months.flatMap((month) => [month.ownJudgment!, ...month.judgmentSegments.map((segment) => segment.judgment)]),
      ...years.years.flatMap((year) => [year.ownJudgment!, ...year.judgmentSegments.map((segment) => segment.judgment)])];
    for (const judgment of judgments.filter((item) => item && item.axes.length)) {
      expect(pattern(judgment).pathId).toBe("resource-wealth");
      expect(judgment.sourceBinding.revisionId).toBe(source.revision.id);
      expect(judgment.version).toBe("hakimi.local-outlook-judgment/0.10.0");
    }
    for (const segment of [...years.years.flatMap((year) => year.judgmentSegments), ...months.months.flatMap((month) => month.judgmentSegments)]) {
      expect(segment.judgment.interval).toEqual({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
    }
    expect(JSON.stringify(source)).toBe(before);
  });

  it("puts the actual moderating stem in the first answer and preserves it in the full record", () => {
    for (const source of [metal, wood]) {
      const before = structuredClone(source), c = buildBaziComprehensiveReading(source.revision, source.assessment);
      const synthesis = buildReadingSynthesis({ revision: source.revision, assessment: source.assessment, comprehensive: c, life: null });
      expect(c.patternDiagnosis!.primaryPathId).toBe("resource-wealth");
      expect(synthesis.headline).toBe("积累已经有底子，要让实际用途决定取舍");
      expect(synthesis.keyPoints!.find((point) => point.id === "useful")!.text).toBe(c.usefulGuidance!.answer.headline);
      const body = buildLocalReadingSnapshot(source.assessment, null, { sourceRevision: source.revision, comprehensive: c, synthesis });
      expect(body).toContain(c.usefulGuidance!.answer.summary);
      expect(body).toContain("outlook-zq-resource-wealth");
      expect(body).toContain(synthesis.headline); expect(source).toEqual(before);
    }
  });
});
