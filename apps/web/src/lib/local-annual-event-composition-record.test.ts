import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId, annualEventFeedbackText, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import { composeAnnualEvents } from "./local-annual-event-composition";
import { annualEventCompositionChoices, annualEventCompositionFeedbackText, annualEventCompositionSubjectId } from "./local-annual-event-composition-record";
import { buildStructuredReadingFeedback, parseReadingFeedback } from "./local-reading-feedback";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";

let revision: RevisionRecord, annual: LocalAnnualOutlook, domains: LocalReadingAnnualDomains, events: LocalReadingAnnualEvents;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成事项合并测试", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  domains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  events = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains: domains });
});

describe("composed event feedback and full report", () => {
  it("binds a separate combined answer without changing either original member", () => {
    const original = JSON.stringify(events);
    const reading = events.years.find((year) => year.year === 2032)!;
    const branch = reading.branches[0]!, segment = branch.segments[0]!;
    const group = composeAnnualEvents(reading).branches[0]!.segments[0]!.items.find((item) => item.kind === "settlement")!;
    expect(group.kind).toBe("settlement");
    const choice = annualEventCompositionChoices(events).find((item) => item.id === annualEventCompositionSubjectId(2032, segment, group))!;
    expect(choice).toBeTruthy();
    expect(choice.originalConclusion.length).toBeLessThanOrEqual(30_000);
    expect(choice.sourceVersions!.length).toBeLessThanOrEqual(20);
    for (const member of group.members) {
      expect(choice.id).not.toBe(annualEventFeedbackSubjectId(2032, segment, member));
      expect(choice.originalConclusion).toContain(annualEventFeedbackText(reading, branch, segment, member));
    }
    const feedback = parseReadingFeedback(buildStructuredReadingFeedback(buildBaziPreliminaryAssessment(revision), {
      subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
      sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "仅为软件合成测试", requestedRevision: "" }));
    expect(feedback.kind).toBe("feedback");
    expect(JSON.stringify(events)).toBe(original);
    const crossed = { ...segment, startInstant: "1900-01-01T00:00:00Z" };
    expect(() => annualEventCompositionFeedbackText(reading, branch, crossed, group)).toThrow("合并事项与原年度、分支或分段不一致");
    const changed = { ...group, summary: "未绑定的合并结论" };
    expect(() => annualEventCompositionFeedbackText(reading, branch, segment, changed)).toThrow("合并事项与原年度、分支或分段不一致");
  });

  it("saves and losslessly reopens the combined presentation and both original full sources", async () => {
    const reading = events.years.find((year) => year.year === 2032)!;
    const segment = reading.branches[0]!.segments[0]!;
    const group = composeAnnualEvents(reading).branches[0]!.segments[0]!.items.find((item) => item.kind === "settlement")!;
    const text = buildLocalReadingSnapshot(buildBaziPreliminaryAssessment(revision), annual,
      { sourceRevision: revision, annualDomains: domains, annualEvents: events });
    if (group.kind !== "settlement") throw new Error("Expected actual B2032 settlement");
    expect(text).toContain(`整件事项 · ${group.title}`);
    expect(text).toContain(group.summary);
    expect(text).toContain(annualEventCompositionSubjectId(2032, segment, group));
    for (const member of group.members) {
      expect(text).toContain(annualEventFeedbackSubjectId(2032, segment, member));
      for (const value of [member.title, member.summary, ...member.why, ...member.examples, ...member.conditions, ...member.evidence]) expect(text).toContain(value);
    }
    expect(await unpackReadingSnapshot(await packReadingSnapshot(text))).toBe(text);
  });
});
