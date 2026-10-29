import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { OUTLOOK_CLASSICAL_SOURCES, OUTLOOK_CLASSICAL_SOURCES_VERSION } from "../../../../packages/bazi-interpretation/src/outlook-classical-sources";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading, ANNUAL_DOMAIN_READING_VERSION } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { buildReadingExplanationIndex, type ReadingExplanationIndex } from "./reading-explanation-index";
import { buildScopedReadingReport, decodeScopedReadingReport, encodeScopedReadingReport } from "./scoped-reading-report";

let index: ReadingExplanationIndex, originalSourceIds: Set<string>;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成行运来源闭包回归", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
    revisionNumber: 1, createdAt: "2026-10-29T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2030, 2030);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2030, endYear: 2030,
    years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents });
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual });
  const keyMonthYears = [await prepareKeyMonthYear({ revision, assessment, annual, annualDomains, annualEvents, annualLifeStories }, 2030, [])];
  const report = buildBriefReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, synthesis,
    annualDomains, annualEvents, annualLifeStories, keyMonthYears })!;
  originalSourceIds = new Set([...assessment.sources, ...(synthesis.sources ?? []), ...(report.natalConclusion!.original.sources ?? [])].map(source => source.id));
  expect(originalSourceIds.has("outlook-zq-luck")).toBe(false);
  const before = JSON.stringify(report);
  index = buildReadingExplanationIndex({ revision, assessment, report, synthesis, generatedAt: "2026-10-29T01:00:00Z" });
  expect(JSON.stringify(report)).toBe(before);
}, 60_000);

it("includes only real catalog entries referenced by the original outlook rules, without inventing sentence-level citation support", () => {
  const required = new Set(index.conclusions.flatMap(item => item.evidence.ruleApplications.flatMap(rule => rule.sourceIds)));
  const expected = OUTLOOK_CLASSICAL_SOURCES.filter(source => required.has(source.id) && !originalSourceIds.has(source.id));
  const added = index.sources.filter(source => !originalSourceIds.has(source.id));
  expect(added).toEqual(expected.map(({ id, title, url, locator, excerpt, interpretation }) => ({ id, title, url, locator, excerpt, interpretation })));
  expect(added.map(source => source.id)).toContain("outlook-zq-luck");
  expect(added.length).toBeLessThan(OUTLOOK_CLASSICAL_SOURCES.length);
  const wealth = index.conclusions.find(item => item.domain === "wealth" && item.scope.level === "year")!;
  expect(wealth.evidence.ruleApplications.filter(rule => rule.sourceIds.includes("outlook-zq-luck")).map(rule => rule.ruleId))
    .toEqual(expect.arrayContaining(["role-rob", "role-resource", "hidden-is-auxiliary", "independent-event-evidence"]));
  expect(wealth.evidence.citations).toEqual([]);
  expect(index.citationBindings.filter(binding => binding.conclusionId === wealth.stableId)).toEqual([]);
  expect(index.sourceSnapshot.sourceVersions).toContain(OUTLOOK_CLASSICAL_SOURCES_VERSION);
  expect(wealth.sourceVersions).toContain(OUTLOOK_CLASSICAL_SOURCES_VERSION);
});

it("saves and reopens the actual 2030 income scope with its exact referenced source and original conditions", async () => {
  const original = index.conclusions.find(item => item.domain === "wealth" && item.scope.level === "year")!;
  const report = await buildScopedReadingReport({ index, query: { topic: "wealth", year: 2030 }, reportId: crypto.randomUUID(),
    saveAttemptId: crypto.randomUUID(), createdAt: "2026-10-29T02:00:00Z" });
  expect(report.index.conclusions).toEqual([original]);
  expect(report.index.sources.find(source => source.id === "outlook-zq-luck")).toEqual(index.sources.find(source => source.id === "outlook-zq-luck"));
  expect(await decodeScopedReadingReport(await encodeScopedReadingReport(report))).toEqual(report);
});

it("still rejects an unknown rule source instead of fabricating or borrowing a catalog entry", async () => {
  const changed = structuredClone(index), original = changed.conclusions.find(item => item.domain === "wealth" && item.scope.level === "year")!;
  original.evidence.ruleApplications[0]!.sourceIds.push("unregistered-source-must-not-be-filled");
  await expect(buildScopedReadingReport({ index: changed, query: { topic: "wealth", year: 2030 }, reportId: crypto.randomUUID(),
    saveAttemptId: crypto.randomUUID(), createdAt: "2026-10-29T02:00:00Z" })).rejects.toThrow("缺少规则实际引用的来源");
  expect(changed.sources.some(source => source.id === "unregistered-source-must-not-be-filled")).toBe(false);
});
