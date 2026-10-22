import { beforeAll, describe, expect, it } from "vitest";
import type { BirthInput, RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildStrengthSensitivityReview, interpretBaziChart } from "./index";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { PRELIMINARY_SEASONAL_CATALOG } from "./preliminary-seasonal-catalog";

const birth: BirthInput = {
  schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
  timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
  location: { label: "合成命盘", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic"
};
async function revisionFor(date = birth.date, time = birth.time): Promise<RevisionRecord> {
  const chart = await calculateChart({ ...birth, date, time }, WORKING_DEFAULT_RULE_PROFILE);
  return { schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z",
    input: chart.input, timeCalibration: chart.timeCalibration, ruleProfile: chart.ruleProfile,
    facts: chart.facts, luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot, manifest: chart.manifest };
}

describe("local preliminary assessment independent from historical interpretation", () => {
  let demo: RevisionRecord;
  beforeAll(async () => { demo = await revisionFor(); });

  it.each([["2018-11-19", "14:26", "戊"], ["1999-01-09", "02:26", "乙"]])("uses the validated resource-wealth focus for %s instead of a generic print-first candidate", async (date, time, wealthStem) => {
    const revision = await revisionFor(date, time), original = structuredClone(revision), result = buildBaziPreliminaryAssessment(revision);
    expect(result.balance.structural.working.focus).toBe("wealth_moderates_resource");
    expect(result.pattern.headline).toContain("印旺用财取向");
    const candidate = result.pattern.candidates.find((item) => item.id === "resource-wealth")!;
    expect(candidate.summary).toContain(wealthStem); expect(candidate.conditions.join()).toContain("不宣告合去");
    expect(candidate.sourceIds).toContain("structural-zq-resource-wealth");
    expect(result.sources.some((source) => source.id === "structural-zq-resource-wealth")).toBe(true);
    expect(result.balance.supportWeight).toBe(result.balance.structural.raw.supportWeight);
    expect(revision).toEqual(original);
  });

  it("does not add the resource-wealth candidate to residual-root or two-wealth counterexamples", async () => {
    for (const [date, time] of [["1999-01-19", "02:26"], ["2021-02-27", "14:26"]]) {
      const result = buildBaziPreliminaryAssessment(await revisionFor(date!, time!));
      expect(result.balance.structural.working.selection).toBe("raw_fallback");
      expect(result.pattern.candidates.some((candidate) => candidate.id === "resource-wealth")).toBe(false);
    }
  });

  it("answers the real computed Xin-Shen chart with separate structure, balance and seasonal axes", () => {
    expect(Object.values(demo.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["乙亥", "甲申", "辛巳", "壬辰"]);
    const result = buildBaziPreliminaryAssessment(demo);
    expect(result.pattern.family).toBe("peer");
    expect(result.headline).toBe("辛金相对中和，月劫背景 · 伤官生财取向");
    expect(result.pattern.monthHiddenStems).toEqual([
      { stem: "庚", tenGod: "劫财", visibleAt: [] },
      { stem: "壬", tenGod: "伤官", visibleAt: ["hour"] },
      { stem: "戊", tenGod: "正印", visibleAt: [] }
    ]);
    expect(result.balance).toMatchObject({ supportWeight: 11, demandWeight: 14, band: "balanced", direction: "conditional", favorableElements: [], unfavorableElements: [] });
    expect(result.balance.baselineSummary).toMatch(/^按当前基线，日主相对中和/);
    expect(result.balance.scenarioDirections.find((scenario) => scenario.id === "deduplicate_month_main"))
      .toMatchObject({ supportWeight: 9, demandWeight: 14, direction: "support", favorableElements: ["earth", "metal"] });
    expect(result.balance.scenarioDirections.find((scenario) => scenario.id === "without_visible_stems"))
      .toMatchObject({ supportWeight: 11, demandWeight: 8, direction: "drain" });
    expect(result.seasonal).toMatchObject({ coverage: "checked_classic_clause", preferredStems: ["壬"], balanceConflict: true });
    expect(result.seasonal.presence.find((entry) => entry.stem === "戊")).toEqual({ stem: "戊", visibleAt: [], hiddenAt: ["month", "day", "hour"] });
    expect(result.readings).toHaveLength(7);
    expect(result.readings.every((reading) => reading.text.length > 10 && !reading.text.includes("？"))).toBe(true);
    expect(result.balance.structural.findings.every((finding) => finding.sourceIds.every((id) => result.sources.some((source) => source.id === id)))).toBe(true);
  });

  it("does not mutate the input, old interpretation output or old null boundaries", () => {
    const originalRevision = JSON.stringify(demo);
    const legacy = JSON.stringify(interpretBaziChart(demo.facts));
    const legacyReview = buildStrengthSensitivityReview(interpretBaziChart(demo.facts));
    const one = buildBaziPreliminaryAssessment(demo);
    expect(buildBaziPreliminaryAssessment(demo)).toEqual(one);
    expect(JSON.stringify(demo)).toBe(originalRevision);
    expect(JSON.stringify(interpretBaziChart(demo.facts))).toBe(legacy);
    expect(buildStrengthSensitivityReview(interpretBaziChart(demo.facts))).toEqual(legacyReview);
    expect(legacyReview).toMatchObject({ selectedOfficialScenarioId: null, expertStrengthVerdict: null, overallGoodBad: null, result: null });
    expect(one.sourceBinding.chartResultHash).toBe(demo.manifest.resultHash);
  });

  it.each([
    ["1995-02-18", "wealth"], ["1995-03-18", "official"], ["1995-05-18", "resource"],
    ["1995-08-16", "output"], ["1995-08-18", "peer"], ["1995-10-18", "seven_killings"]
  ])("reads a computed %s chart as %s without borrowing the Xin-Shen rule", async (date, family) => {
    const revision = await revisionFor(date);
    const result = buildBaziPreliminaryAssessment(revision);
    expect(result.pattern.family).toBe(family);
    expect(result.pattern.evidence.length).toBeGreaterThan(1);
    expect(result.summary.length).toBeGreaterThan(30);
    if (date !== birth.date) {
      expect(result.seasonal.ruleId).not.toBe("qiongtong-xin-shen-v1");
      expect(result.seasonal.coverage).toBe("checked_classic_clause");
      expect(result.seasonal.headline).toContain(`${revision.facts.pillars.day.stem}日${revision.facts.pillars.month.branch}月`);
      const fallback = buildBaziPreliminaryAssessment(revision, { seasonalCatalog: [] });
      expect(fallback.seasonal.ruleId).toBeNull();
      expect(fallback.seasonal.coverage).toBe("simplified_seasonal_observation");
      expect(fallback.seasonal.summary).toContain("现代简化季节观察");
      expect(fallback.seasonal.preferredElements).toEqual([]);
    }
  });

  it("does not promote hidden-only output into the same visible wealth-generation candidate", async () => {
    const earlier = await revisionFor(birth.date, "06:26");
    const result = buildBaziPreliminaryAssessment(earlier);
    expect(earlier.facts.pillars.hour.ganZhi).toBe("辛卯");
    expect(result.pattern.candidates.some((candidate) => candidate.id === "output-wealth")).toBe(false);
    expect(result.pattern.monthHiddenStems.find((entry) => entry.stem === "壬")?.visibleAt).toEqual([]);
    expect(result.seasonal.presence.find((entry) => entry.stem === "壬")?.hiddenAt).toEqual(["year", "month"]);
  });

  it("uses the real Yi-You month's unexposed killing and exposed Ding food as distinct candidate roles", async () => {
    const revision = await revisionFor("1995-09-21", "02:26"), result = buildBaziPreliminaryAssessment(revision);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["乙亥", "乙酉", "乙卯", "丁丑"]);
    expect(result.version).toBe("hakimi.bazi.preliminary-assessment/0.7.0");
    expect(result.pattern.family).toBe("seven_killings");
    expect(result.pattern.monthHiddenStems.find((item) => item.stem === "辛")?.visibleAt).toEqual([]);
    const candidate = result.pattern.candidates.find((item) => item.id === "food-killing")!;
    expect(candidate.status).toBe("conditional");
    expect(candidate.summary).toContain("月令辛七杀提供当令背景");
    expect(candidate.summary).toContain("时干丁食神已透");
    expect(candidate.summary).not.toContain("食神与七杀透出");
    expect(candidate.conditions.join()).toContain("根气");
    expect(candidate.conditions.join()).toContain("杀旺、食强、身健");
    expect(candidate.evidence.join()).toContain("month-killing-yi");
    for (const id of candidate.sourceIds) expect(result.sources.some((source) => source.id === id && source.url && source.excerpt)).toBe(true);
  });

  it("names Ren-Xu's actual month-killing and visible food without removing wealth or inventing exposed killing", async () => {
    const revision = await revisionFor("1995-10-18"), result = buildBaziPreliminaryAssessment(revision);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["乙亥", "丙戌", "壬午", "甲辰"]);
    expect(result.pattern.monthHiddenStems.find((item) => item.stem === "戊")?.visibleAt).toEqual([]);
    expect(result.pattern.candidates.find((item) => item.id === "food-killing")?.summary).toContain("时干甲食神已透");
    expect(result.pattern.candidates.some((item) => item.id === "output-wealth")).toBe(true);
  });

  it("removes the only food partner when the Yi-You hour is unknown rather than borrowing cached Ding", async () => {
    const revision = await revisionFor("1995-09-21", "02:26");
    revision.input.time = null; revision.input.timePrecision = "unknown_hour";
    const result = buildBaziPreliminaryAssessment(revision);
    expect(result.pattern.candidates.some((item) => item.id === "food-killing")).toBe(false);
    expect(result.pattern.evidence.join()).not.toContain("丁");
    expect(result.pattern.sourceIds).not.toContain("outlook-zq-killing-month-example");
    expect(result.sourceBinding.includeHour).toBe(false);
  });

  it("uses unexposed month-official with a real exposed print, while month-killing plus wealth alone stays background", async () => {
    const official = await revisionFor("2000-03-11", "10:26"), result = buildBaziPreliminaryAssessment(official);
    expect(Object.values(official.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["庚辰", "己卯", "戊辰", "丁巳"]);
    expect(result.pattern.monthHiddenStems.find((item) => item.stem === "乙")?.visibleAt).toEqual([]);
    expect(result.pattern.candidates.find((item) => item.id === "official-resource")?.summary).toContain("时干丁正印已透");
    expect(result.sources.some((source) => source.id === "outlook-zq-official-month-example")).toBe(true);
    const wealthOnly = buildBaziPreliminaryAssessment(await revisionFor("1995-09-21", "06:26"));
    expect(wealthOnly.pattern.candidates.some((item) => ["food-killing", "killing-resource"].includes(item.id))).toBe(false);
    expect(wealthOnly.pattern.sourceIds).not.toContain("outlook-zq-killing-month-example");
  });

  it("retains the visible day stem in a Lu background without adding it as an extra balance factor", async () => {
    const revision = await revisionFor("1995-12-18");
    const result = buildBaziPreliminaryAssessment(revision);
    expect(revision.facts.pillars.day.stem).toBe("癸");
    expect(result.pattern.background).toBe("建禄背景");
    expect(result.pattern.monthHiddenStems.find((item) => item.stem === "癸")?.visibleAt).toContain("day");
    expect(result.balance.supportWeight).toBe(interpretBaziChart(revision.facts).strength.supportWeight);
  });

  it("retains concrete baseline element directions even when alternative scenarios disagree", async () => {
    const revision = await revisionFor("1995-03-18");
    const result = buildBaziPreliminaryAssessment(revision);
    expect(result.balance.baselineDirection).toBe("support");
    expect(result.balance.baselineFavorableElements).toEqual(["fire", "earth"]);
    expect(result.balance.baselineUnfavorableElements).toEqual(["wood", "metal", "water"]);
    expect(result.balance.baselineSummary).toContain("优先火、土");
    expect(result.balance.summary.startsWith(result.balance.baselineSummary)).toBe(true);
    if (result.balance.direction === "conditional") expect(result.balance.favorableElements).toEqual([]);
  });

  it("excludes an unreliable historical hour from pattern, seasonal presence and readings", () => {
    const unknownHour = { ...demo, input: { ...demo.input, time: null, timePrecision: "unknown_hour" as const } };
    const result = buildBaziPreliminaryAssessment(unknownHour);
    expect(result.sourceBinding.includeHour).toBe(false);
    expect(result.pattern.candidates.some((candidate) => candidate.id === "output-wealth")).toBe(false);
    expect(result.readings.filter((reading) => reading.axis === "pillar")).toHaveLength(3);
    expect(result.seasonal.presence.every((entry) => !entry.visibleAt.includes("hour") && !entry.hiddenAt.includes("hour"))).toBe(true);
    expect(result.limitations.join("")).toContain("时柱已从本次初判");
  });

  it("rejects ambiguous catalog matches and unresolved sources instead of guessing", () => {
    const rule = PRELIMINARY_SEASONAL_CATALOG.find((item) => item.dayStem === "辛" && item.monthBranch === "申")!;
    expect(() => buildBaziPreliminaryAssessment(demo, { seasonalCatalog: [rule, { ...rule, id: "duplicate" }] })).toThrow(/重复登记/);
    expect(() => buildBaziPreliminaryAssessment(demo, { seasonalCatalog: [{ ...rule, sourceIds: ["missing"] }] })).toThrow(/缺少对应来源/);
  });

  it("rejects mismatched hidden-stem facts and exposes no automatic transformed or completed pattern claim", () => {
    const invalid = structuredClone(demo);
    invalid.facts.pillars.month.branchTenGods.pop();
    expect(() => buildBaziPreliminaryAssessment(invalid)).toThrow(/一一对应/);
    const result = buildBaziPreliminaryAssessment(demo);
    expect(result.pattern.conditions.join("")).toContain("合化真伪");
    expect(result.pattern.candidates.every((candidate) => candidate.status === "conditional")).toBe(true);
    const sourceIds = new Set(result.sources.map((source) => source.id));
    expect(result.readings.flatMap((reading) => reading.sourceIds).every((id) => sourceIds.has(id))).toBe(true);
  });
});
