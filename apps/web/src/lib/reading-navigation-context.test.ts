import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { MAIN_ROUTE_READING_VERSION } from "./main-route-reading";
import { LOCAL_READING_EDITION_VERSION } from "./local-reading-version";
import { READING_EXPLANATION_INDEX_VERSION, unassessedReadingTime, validateReadingExplanationIndex, type ReadingExplanationIndex } from "./reading-explanation-index";
import { READING_NAVIGATION_STORAGE_KEY, readReadingNavigationYearSeed, readReadingOverviewNavigation,
  writeReadingNavigation, writeReadingOverviewNavigation, type ReadingOverviewDetail, type ReadingOverviewNavigation } from "./reading-navigation-context";

let revision: RevisionRecord, index: ReadingExplanationIndex;
beforeAll(async () => {
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic navigation contract", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "Synthetic test" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...calculated, schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-11-07T00:00:00Z" });
  const annual = await buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2026);
  // This index is a navigation-only display contract. Time coordinates and
  // identities come from real production segments; its prose is not a reading.
  index = validateReadingExplanationIndex({ version: READING_EXPLANATION_INDEX_VERSION, generatedAt: "2026-11-07T00:00:00Z",
    sourceSnapshot: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
      includeHour: true, input: revision.input, ruleProfile: revision.ruleProfile, ruleProfileDigest: revision.manifest.ruleProfileDigest,
      timeCalibration: revision.timeCalibration, engineVersions: { engine: revision.manifest.engine, timeZoneDatabase: revision.manifest.timeZoneDatabase ?? null },
      context: null, sourceVersions: [annual.version], reportVersion: LOCAL_READING_EDITION_VERSION, inputRecordedAt: revision.createdAt },
    conclusions: annual.years.flatMap(year => year.judgmentSegments.map(segment => ({
      stableId: `${revision.id}/navigation:${year.year}:${segment.id}`, domain: "career", label: "导航坐标测试", text: "仅验证导航位置。",
      direction: null, origin: "calculated", sourceSubjects: [segment.id], sourceVersions: [annual.version], personalTextIds: [],
      scope: { level: "year", year: year.year, branchId: segment.branchId, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant },
      evidence: { facts: [], ruleApplications: [], support: [], limits: [], unknowns: [], citations: [] }
    }))), sources: [], citationBindings: [], uncertainty: unassessedReadingTime(revision), limitations: [] });
});
beforeEach(() => window.sessionStorage.clear());

function period(year: number, part = 0) {
  const scope = index.conclusions.filter(item => item.scope.year === year)[part]!.scope;
  return { year, startInstant: scope.startInstant!, endExclusiveInstant: scope.endExclusiveInstant! };
}
function writeDetail(detail: ReadingOverviewDetail, range: ReadingOverviewNavigation["range"] = "three_years") {
  writeReadingNavigation(index, revision, { topic: "summary", year: detail.year, branchId: "locked" });
  writeReadingOverviewNavigation(index, revision, { view: "main", range, detail });
}
function raw() { return JSON.parse(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)!); }
function saveRaw(value: unknown) { window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify(value)); }

describe("main route navigation identity and detail coordinates", () => {
  it("persists all selected stage coordinates with the display version and no copied report text", () => {
    const detail: ReadingOverviewDetail = { kind: "stage", year: 2026, periods: [period(2026), period(2027), period(2028)] };
    const before = structuredClone(index);
    writeDetail(detail);
    expect(readReadingOverviewNavigation(index, revision)).toEqual({ view: "main", range: "three_years", detail });
    expect(raw().presentation.mainRouteVersion).toBe(MAIN_ROUTE_READING_VERSION);
    expect(JSON.stringify(raw())).not.toContain("仅验证导航位置");
    expect(index).toEqual(before);
  });

  it("restores both exact sides of a turn and preserves their common boundary", () => {
    const detail: ReadingOverviewDetail = { kind: "turn", year: 2028, periods: [period(2028, 0), period(2028, 1)] };
    writeDetail(detail, "year");
    const restored = readReadingOverviewNavigation(index, revision).detail!;
    expect(restored).toEqual(detail);
    expect(restored.periods![0]!.endExclusiveInstant).toBe(restored.periods![1]!.startInstant);
  });

  it.each(["duplicate", "altered-interval", "outside-range", "reversed", "partial-turn"] as const)("rejects %s rather than restoring an approximate detail", failure => {
    const detail: ReadingOverviewDetail = { kind: "stage", year: 2026, periods: [period(2026), period(2027)] };
    if (failure === "duplicate") detail.periods!.push(period(2027));
    if (failure === "altered-interval") detail.periods![0]!.startInstant = new Date(Date.parse(detail.periods![0]!.startInstant) + 1).toISOString();
    if (failure === "outside-range") detail.periods!.push(period(2029));
    if (failure === "reversed") detail.periods!.reverse();
    if (failure === "partial-turn") { detail.kind = "turn"; detail.periods = [period(2026)]; }
    writeDetail(detail);
    expect(readReadingOverviewNavigation(index, revision).detail).toBeUndefined();
    expect(raw().presentation.detail).toBeUndefined();
  });

  it("drops a stored detail when the reader moves to another topic or year", () => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    writeReadingNavigation(index, revision, { topic: "wealth", year: 2028, branchId: "locked" });
    expect(readReadingOverviewNavigation(index, revision).detail).toBeUndefined();
    writeDetail({ kind: "year", year: 2028 }, "year");
    writeReadingNavigation(index, revision, { topic: "summary", year: 2029, branchId: "locked" });
    expect(readReadingOverviewNavigation(index, revision).detail).toBeUndefined();
  });

  it("requires the chosen branch for every restored coordinate", () => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    const twoBranches = structuredClone(index);
    twoBranches.conclusions = index.conclusions.map(item => ({ ...item, scope: { ...item.scope, branchId: "forward" } }));
    twoBranches.conclusions.push(...index.conclusions.map(item => ({ ...item, stableId: `${item.stableId}:backward`,
      scope: { ...item.scope, branchId: "backward", startInstant: new Date(Date.parse(item.scope.startInstant!) + 1).toISOString() } })));
    const saved = raw(); saved.selection.branchId = "backward";
    saved.presentation.detail = { kind: "stage", year: 2028, periods: [period(2028)] }; saveRaw(saved);
    expect(readReadingOverviewNavigation(twoBranches, revision).detail).toBeUndefined();
    saved.selection.branchId = undefined; saveRaw(saved);
    expect(readReadingOverviewNavigation(twoBranches, revision).detail).toBeUndefined();
  });

  it.each(["version", "identity"] as const)("does not restore detail after the %s has changed", failure => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    const saved = raw();
    if (failure === "version") saved.presentation.mainRouteVersion = "old-presentation";
    else { const identity = JSON.parse(saved.identity); identity[1] = "33333333-3333-4333-8333-333333333333"; saved.identity = JSON.stringify(identity); }
    saveRaw(saved);
    expect(readReadingOverviewNavigation(index, revision)).toEqual({ view: "main", range: "three_years" });
  });

  it.each([2045, 2100])("keeps the exact source-bound %s year before computing that window", year => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    const saved = raw(); saved.selection.year = year; delete saved.presentation.detail; saveRaw(saved);
    expect(readReadingNavigationYearSeed(revision)).toBe(year);
  });

  it.each([1899, 2101, 2045.5, "2045"]) ("rejects an unsupported year seed %s without clamping it", year => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    const saved = raw(); saved.selection.year = year; saveRaw(saved);
    expect(readReadingNavigationYearSeed(revision)).toBeUndefined();
  });

  it("rejects a year seed with stale report, index, main-route or hour identity", () => {
    writeDetail({ kind: "year", year: 2028 }, "year");
    const saved = raw();
    for (const field of [4, 5, 6]) {
      const changed = structuredClone(saved), identity = JSON.parse(changed.identity);
      identity[field] = field === 6 ? false : "old-version"; changed.identity = JSON.stringify(identity); saveRaw(changed);
      expect(readReadingNavigationYearSeed(revision)).toBeUndefined();
    }
    saved.presentation.mainRouteVersion = "old-main-route"; saveRaw(saved);
    expect(readReadingNavigationYearSeed(revision)).toBeUndefined();
  });
});
