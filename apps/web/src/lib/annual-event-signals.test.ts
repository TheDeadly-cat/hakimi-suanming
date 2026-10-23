import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { evaluateNatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { buildLocalAnnualOutlookRange, type LocalAnnualYear } from "./local-annual-outlook";
import { createAnnualEventSignalBuilder } from "./annual-event-signals";

const fixtures = new Map<string, { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear }>();
beforeAll(async () => {
  for (const [task, date, time, year] of [
    ["resource_first", "1957-09-13", "00:26", 2032],
    ["wealth_first", "1982-10-02", "10:26", 2032],
    ["official_joint", "1944-08-09", "04:26", 2028]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "Synthetic task-aligned annual signals", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic calendar fixture, not a historical person's birth date" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision);
    fixtures.set(task, { revision, assessment, year: (await buildLocalAnnualOutlookRange(revision, assessment, year, year)).years[0]! });
  }
});

it.each(["resource_first", "wealth_first", "official_joint"])("carries the exact %s natal task without adding the annual stem or changing the original axis", (kind) => {
  const { revision, assessment, year } = fixtures.get(kind)!, before = JSON.stringify({ revision, assessment, year });
  const make = createAnnualEventSignalBuilder(revision, assessment), segment = year.judgmentSegments[0]!, signal = make(year, segment);
  const expected = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour: true });
  expect(signal.patternContext.natalTask).toEqual(expected);
  expect(signal.patternContext.natalTask.task).toBe(kind);
  expect(signal.patternContext.pathId).toBe(expected.preferredPathId);
  for (const pair of signal.patternContext.natalTask.pairs) {
    for (const actor of [pair.wealth, pair.resource]) expect(actor.stem).toBe(revision.facts.pillars[actor.position].stem);
  }
  signal.patternContext.natalTask.pairs[0]!.wealth.stem = "changed";
  expect(make(year, segment).patternContext.natalTask).toEqual(expected);
  expect(JSON.stringify({ revision, assessment, year })).toBe(before);
});

it("rejects wrong source, selected natal facts, or substituted annual action metadata", () => {
  const { revision, assessment, year } = fixtures.get("wealth_first")!;
  const wrong = structuredClone(assessment); wrong.sourceBinding.chartResultHash = "0".repeat(64);
  expect(() => createAnnualEventSignalBuilder(revision, wrong)).toThrow("来源");
  const facts = structuredClone(assessment); facts.balance.structural.inputFacts.pillars.month = structuredClone(revision.facts.pillars.year);
  expect(() => createAnnualEventSignalBuilder(revision, facts)).toThrow("所选柱");
  const altered = structuredClone(year), axis = altered.judgmentSegments[0]!.judgment.axes.find(row => row.axis === "pattern")!;
  axis.stemActions!.items[0]!.effect = "assists";
  expect(() => createAnnualEventSignalBuilder(revision, assessment)(altered, altered.judgmentSegments[0]!)).toThrow("元数据");
});

it("does not borrow a stored hour in an explicitly labelled unknown-hour selected-pillar factory projection", () => {
  const revision = structuredClone(fixtures.get("wealth_first")!.revision);
  revision.input.time = null; revision.input.timePrecision = "unknown_hour";
  const assessment = buildBaziPreliminaryAssessment(revision);
  expect(evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour: false }).preferredPathId).toBeNull();
  // This validates the natal factory scope only, not an unknown-hour transit.
  expect(() => createAnnualEventSignalBuilder(revision, assessment)).not.toThrow();
  const changed = structuredClone(assessment); changed.balance.structural.inputFacts.pillars.hour = { ...revision.facts.pillars.hour!, stem: "甲" };
  // The existing working-assessment verifier also rejects an inserted hour;
  // it is not accepted as an extra source of roots for the new task.
  expect(() => createAnnualEventSignalBuilder(revision, changed)).toThrow("结构工作结果");
});
