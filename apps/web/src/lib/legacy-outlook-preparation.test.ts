import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualReadingChoicePairs, prepareLegacyAnnualReading, type LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";
import { buildAnnualEventScenarios } from "./annual-event-scenarios";
import { buildAnnualEventScenarios as oldScenarios } from "./legacy-outlook-v09/annual-event-scenarios";
import { preparedLegacyOutlook } from "./legacy-outlook-preparation";

let source: LegacyAnnualReadingInput;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic genuine old calculation", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-19T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, 2029, 2029);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2029, endYear: 2029, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  const life = await buildLocalLifeOutlook(revision, assessment, 2029), lifeStageStory = buildLifeStageStory({ revision, assessment, life });
  const monthly = await buildLocalMonthlyOutlook(revision, assessment, 2029), monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly });
  source = { revision, assessment, annual, annualDomains, life, lifeStageStory, monthly, monthlyDomains,
    selectedDecadeId: life.decades.find((item) => item.ganZhi === "丁丑")!.id };
  expect(() => buildAnnualReadingChoicePairs(source)).toThrow("尚未核对");
  await prepareLegacyAnnualReading(source);
}, 30_000);

it("replays the real old 0.9 calculation instead of relabelling the corrected handover judgment", () => {
  const old = preparedLegacyOutlook(source), before = JSON.stringify(source);
  const effects = (value: typeof old) => value.annual!.years[0]!.judgmentSegments.map((segment) => segment.judgment.axes.find((axis) => axis.axis === "pattern")!.effect);
  expect(effects(old)).toEqual(["assists", "assists"]);
  expect(effects(source)).toEqual(["assists", "mixed"]);
  expect(old.annual!.years[0]!.judgmentSegments.map((segment) => [segment.id, segment.startInstant, segment.endExclusiveInstant, segment.judgment.backgroundRefs]))
    .toEqual(source.annual!.years[0]!.judgmentSegments.map((segment) => [segment.id, segment.startInstant, segment.endExclusiveInstant, segment.judgment.backgroundRefs]));
  expect(old.annual!.version).toBe("hakimi.local-annual-outlook/0.8.0");
  expect(old.life!.version).toBe("hakimi.local-detailed-outlook/0.5.0");
  expect(old.monthly!.months.flatMap((month) => month.judgmentSegments).every((part) => part.judgment.version === "hakimi.local-outlook-judgment/0.9.0")).toBe(true);
  expect(JSON.stringify(source)).toBe(before);
});

it("pairs both real prose epochs with the same current target and preserves old month and stage subjects", () => {
  const pairs = buildAnnualReadingChoicePairs(source);
  const events = pairs.pairs.filter((pair) => pair.scope.family === "event");
  expect(events.some((pair) => pair.legacyChoice.sourceVersions?.includes("hakimi.local-annual-event-reading/0.5.0"))).toBe(true);
  expect(events.some((pair) => pair.legacyChoice.sourceVersions?.includes("hakimi.local-annual-event-reading/0.6.0"))).toBe(true);
  expect(events.every((pair) => pair.currentChoice.sourceVersions?.includes("hakimi.local-annual-event-reading/0.7.0"))).toBe(true);
  for (const family of ["annual-month", "stage-year", "month", "monthly-domain", "decade", "life-stage", "life-transition", "trajectory"] as const) {
    expect(pairs.pairs.some((pair) => pair.scope.family === family), family).toBe(true);
  }
  // Scenario identity includes the old actual effect. It must not be relabelled
  // onto the mixed replacement; all fixed-scope event/month/stage choices pair.
  const old = preparedLegacyOutlook(source), year = source.annual!.years[0]!;
  const beforeIds = oldScenarios(source.revision, source.assessment, old.annual!.years[0]!).map(item => `event-${year.year}-${item.id}`);
  const afterIds = buildAnnualEventScenarios(source.revision, source.assessment, year).map(item => `event-${year.year}-${item.id}`);
  expect(pairs.unpaired.map(item => item.legacyChoice.id)).toEqual(beforeIds.filter(id => !afterIds.includes(id)));
  expect(pairs.unpaired).toHaveLength(3);
  expect(pairs.unpaired.every(item => item.reason === "当前没有同一反馈主题。")).toBe(true);
});

it("cannot use a completed proof for edited sources, missing actual monthly input or altered contexts", async () => {
  const altered = structuredClone(source); altered.annual!.years[0]!.judgmentSegments[1]!.startInstant = "2029-06-01T00:00:00Z";
  expect(() => buildAnnualReadingChoicePairs(altered)).toThrow("尚未核对");
  await expect(prepareLegacyAnnualReading(altered)).rejects.toThrow("完整计算输出");
  const missing = { ...source, monthly: undefined, monthlyDomains: undefined };
  await prepareLegacyAnnualReading(missing);
  expect(buildAnnualReadingChoicePairs(missing, { families: ["annual-month", "month", "monthly-domain"] }).pairs).toEqual([]);
  const output = preparedLegacyOutlook(source); output.annual!.years[0]!.summary = "edited outside";
  expect(preparedLegacyOutlook(source).annual!.years[0]!.summary).not.toBe("edited outside");
});

it("replays supplied life and monthly scopes without fabricating an annual window", async () => {
  const isolated = { revision: source.revision, assessment: source.assessment, life: source.life, lifeStageStory: source.lifeStageStory,
    monthly: source.monthly, monthlyDomains: source.monthlyDomains };
  await prepareLegacyAnnualReading(isolated);
  const old = preparedLegacyOutlook(isolated), pairs = buildAnnualReadingChoicePairs(isolated);
  expect(old.annual).toBeUndefined(); expect(old.annualDomains).toBeUndefined();
  expect(old.life!.version).toBe("hakimi.local-detailed-outlook/0.5.0");
  for (const family of ["life-overview", "decade", "life-stage", "life-transition", "month", "monthly-domain"] as const)
    expect(pairs.pairs.some(pair => pair.scope.family === family)).toBe(true);
  expect(pairs.pairs.some(pair => ["annual", "annual-month", "stage-year", "trajectory"].includes(pair.scope.family))).toBe(false);
});
