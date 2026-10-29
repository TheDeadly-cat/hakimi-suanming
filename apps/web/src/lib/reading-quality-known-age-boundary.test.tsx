import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { webReportExportPort } from "@hakimi/platform";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildLocalReadingReport } from "./local-reading-edition";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { encodeReadingReportBundle, decodeReadingReportBundle } from "./local-reading-report-bundle";
import { readReadingExplanationIndex } from "./reading-explanation-index";
import { ReadingSavedRecord } from "../components/reading-saved-record";
import { resetPreparedFileDeliveryCoordinatorForTests } from "../components/prepared-file-delivery-coordinator";

// H08 is now a disclosed, known regression case, not a fresh holdout sample.
// The immutable first evaluation remains 9/10. Its whole-main-text inequality
// did not distinguish annual crossing-age scope from fully adult month scope.
const createdAt = "2026-10-24T00:00:00.000Z";
const eighteenthBirthday = "2028-07-13T16:02:00.000Z";
async function baseFixture() {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "2010-07-14", time: "00:02",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "female", lunarLeapMonth: false,
    location: { label: "Public synthetic reading evaluation holdout-family-b", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "Synthetic evaluation; not a real person or observed life outcome." }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "8d1cf521-fc8a-48b0-a9dc-6ae1eec7ae0b",
    caseId: "5602b24e-7d7d-4922-a9b3-43bc3faa002b", revisionNumber: 1, createdAt });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2028, 2028);
  const life = await buildLocalLifeOutlook(revision, assessment, 2028);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2028, endYear: 2028,
    years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  return { revision, assessment, comprehensive, annual, life, annualDomains };
}
async function withContext(base: Awaited<ReturnType<typeof baseFixture>>, work: "student" | "caregiving") {
  const { revision, assessment, comprehensive, annual, life, annualDomains } = base;
  const body = await buildReadingContextRecord(revision, null, { work, relationship: "unspecified", fromYear: 2028, toYear: 2028,
    notes: "Explicit synthetic context; no free-text occupation inference." });
  const contextRecord = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0",
    id: work === "student" ? "a88aa880-0123-4123-a123-000000000000" : "a88aa880-0123-4123-a123-000000000001",
    caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown", body,
    tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt, updatedAt: createdAt });
  const context = (await resolveReadingContext({ revision, records: [contextRecord] })).latest;
  const contextual = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains, context, referenceYear: 2028 })!;
  const source = { revision, assessment, annual, annualDomains, contextual };
  const annualEvents = buildReadingAnnualEvents(source);
  const annualLifeStories = buildReadingAnnualLifeStories({ ...source, annualEvents });
  const prepared = await prepareKeyMonthYear({ ...source, annualEvents, annualLifeStories }, 2028, []);
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual, life, contextual });
  const extras = { sourceRevision: revision, comprehensive, annualDomains, annualEvents, annualLifeStories,
    keyMonthYears: [prepared], synthesis, life, contextual, explanationGeneratedAt: createdAt };
  const report = buildBriefReadingReport(assessment, annual, extras)!;
  const edition = buildLocalReadingReport(assessment, annual, extras);
  return { ...base, work, contextRecord, contextual, prepared, extras, report, edition };
}
type Fixture = Awaited<ReturnType<typeof withContext>>;
let student: Fixture, caregiving: Fixture, baseBefore: string;
const segments = (f: Fixture) => f.report.plainReading!.outlook.branches.flatMap(branch => branch.years.flatMap(year => year.segments));
const members = (f: Fixture) => segments(f).flatMap(segment => segment.monthWindows.flatMap(window => window.members));
const topic = (f: Fixture, label: string, domain: "career" | "wealth") => members(f).find(member => member.label === label)!.topics.find(item => item.domain === domain)!;

beforeAll(async () => {
  const base = await baseFixture();
  baseBefore = JSON.stringify(base);
  student = await withContext(base, "student");
  caregiving = await withContext(base, "caregiving");
  expect(JSON.stringify(base)).toBe(baseBefore);
}, 60_000);
afterEach(() => { cleanup(); vi.restoreAllMocks(); resetPreparedFileDeliveryCoordinatorForTests(); });

describe("known H08: exact age boundary and declared context, not holdout rescoring", () => {
  it("preserves the full year and month nodes while separating the actual eighteenth anniversary", () => {
    expect(Object.values(student.revision.facts.pillars).map(pillar => pillar.ganZhi)).toEqual(["庚寅", "癸未", "乙丑", "丙子"]);
    expect(student.revision.timeCalibration.utcInstant).toBe("2010-07-13T16:02:00Z");
    expect(student.revision.manifest.resultHash).toBe("6a40f4e9d76508304dc1d26115cd47e66a34bb5cbd96257ce742fb9339037656");
    const rawYear = student.annual.years[0]!;
    expect(rawYear.judgmentSegments).toHaveLength(1);
    const raw = rawYear.judgmentSegments[0]!;
    expect([raw.startInstant, raw.endExclusiveInstant]).toEqual(["2028-02-04T07:31:13.000Z", "2029-02-03T13:20:47.000Z"]);
    const age = buildLocalReadingAgeContext(student.revision.timeCalibration.utcInstant, raw.startInstant, raw.endExclusiveInstant);
    expect(age.stage).toBe("adult_transition");
    expect(age.segments.map(part => [part.stage, part.startInstant, part.endExclusiveInstant])).toEqual([
      ["youth", raw.startInstant, eighteenthBirthday], ["adult", eighteenthBirthday, raw.endExclusiveInstant]
    ]);
    expect(segments(student).map(part => [part.id, part.branchId, part.startInstant, part.endExclusiveInstant]))
      .toEqual(rawYear.judgmentSegments.map(part => [part.id, part.branchId, part.startInstant, part.endExclusiveInstant]));
    expect(members(student)).toHaveLength(12);
    expect(members(student).map(member => member.topics[0]!.contentRules!.scope.ageStage))
      .toEqual(["youth", "youth", "youth", "youth", "youth", "adult_transition", "adult", "adult", "adult", "adult", "adult", "adult"]);
    const crossing = members(student).find(member => member.label === "小暑月")!;
    expect([crossing.startInstant, crossing.endExclusiveInstant]).toEqual(["2028-07-06T13:30:18.000Z", "2028-08-06T23:21:11.000Z"]);
    expect(buildLocalReadingAgeContext(student.revision.timeCalibration.utcInstant, crossing.startInstant, crossing.endExclusiveInstant).segments
      .map(part => [part.stage, part.startInstant, part.endExclusiveInstant])).toEqual([
      ["youth", crossing.startInstant, eighteenthBirthday], ["adult", eighteenthBirthday, crossing.endExclusiveInstant]
    ]);
    for (const f of [student, caregiving]) for (const member of members(f)) {
      const originalMonth = f.prepared.monthly.months.find(month => month.id === member.monthId)!;
      const original = originalMonth.judgmentSegments.find(part => part.id === member.periodId)!;
      expect([member.startInstant, member.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
      for (const domain of member.topics) {
        const scope = domain.contentRules!.scope;
        expect(scope.sourceBinding).toEqual(original.judgment.sourceBinding);
        expect(scope.targetRef).toEqual(original.judgment.targetRef);
        expect(scope.backgroundRefs).toEqual(original.judgment.backgroundRefs);
        expect(scope.interval).toEqual(original.judgment.interval);
        expect(scope.targetRef).toMatchObject({ nodeType: "month" });
        expect(scope.backgroundRefs.find(ref => ref.nodeType === "year")).toEqual(rawYear.transitNodeRef);
        expect(scope.backgroundRefs.filter(ref => ref.nodeType === "dayun")).toEqual(raw.judgment.backgroundRefs);
      }
    }
  });

  it("does not force adult context into the crossing year, but uses each verified context in adult months", () => {
    expect(student.revision).toEqual(caregiving.revision);
    expect(student.assessment).toEqual(caregiving.assessment);
    expect(student.annual).toEqual(caregiving.annual);
    expect(student.prepared.monthly).toEqual(caregiving.prepared.monthly);
    expect(student.contextual.contextSource.reference).not.toEqual(caregiving.contextual.contextSource.reference);
    for (const f of [student, caregiving]) {
      expect(f.contextual.contextSource.document.context.work).toBe(f.work);
      expect(f.contextual.readings).toEqual([]); // No wholly adult annual/natal scope in this year.
      for (const segment of segments(f)) for (const domain of segment.domainEvidence) {
        expect(domain.contentRules!.scope).toMatchObject({ ageStage: "adult_transition", work: "unspecified" });
      }
      for (const member of members(f)) for (const domain of member.topics) {
        const scope = domain.contentRules!.scope;
        expect(scope.work).toBe(scope.ageStage === "adult" ? f.work : "unspecified");
        if (scope.ageStage !== "adult") expect(domain.summary).not.toMatch(/照料家人和家务|岗位晋升|工资上涨|客户订单/u);
      }
    }
    expect(segments(student)[0]!.domains).toEqual(segments(caregiving)[0]!.domains);
    for (const member of members(student).slice(0, 6)) {
      const other = members(caregiving).find(item => item.periodId === member.periodId)!;
      expect(member.topics.map(item => item.summary)).toEqual(other.topics.map(item => item.summary));
    }
    // These are two actual adult-month differences, not a whole-document
    // inequality that could pass on a context ID or unrelated wording alone.
    expect(topic(student, "立秋月", "wealth").summary).toContain("课程要求和提交期限");
    expect(topic(caregiving, "立秋月", "wealth").summary).toContain("照料时间和家人的约定");
    expect(topic(student, "寒露月", "career").summary).toContain("课程讲解和导师指导");
    expect(topic(caregiving, "寒露月", "career").summary).toContain("照料方法和家人帮助");
    expect(topic(caregiving, "寒露月", "career").summary).not.toContain("课程讲解和导师指导");
    expect(student.edition.archive).not.toBe(caregiving.edition.archive);
  });

  it.each(["student", "caregiving"] as const)("saves and exports %s with exact annual/month/context evidence and no record rewrite", async work => {
    const f = work === "student" ? student : caregiving;
    const packed = await packReadingSnapshot(await encodeReadingReportBundle(f.edition));
    expect(packed.length).toBeLessThanOrEqual(200_000);
    const decoded = (await decodeReadingReportBundle(await unpackReadingSnapshot(packed)))!;
    expect(decoded).toEqual(f.edition);
    expect(decoded.reading).toContain(f.report.plainReading!.bodyText);
    const index = readReadingExplanationIndex(decoded.archive)!;
    expect(index.sourceSnapshot).toMatchObject({ caseId: f.revision.caseId, revisionId: f.revision.id,
      chartResultHash: f.revision.manifest.resultHash, context: f.contextual.contextSource });
    for (const member of members(f)) for (const domain of member.topics) {
      const conclusion = index.conclusions.find(item => item.scope.level === "month" && item.domain === domain.domain
        && item.scope.startInstant === member.startInstant && item.scope.endExclusiveInstant === member.endExclusiveInstant)!;
      expect(conclusion.scope).toMatchObject({ year: 2028, branchId: segments(f)[0]!.branchId });
      expect(conclusion.text).toContain(domain.summary);
      expect(conclusion.sourceSubjects).toEqual(domain.sourceSubjects);
    }
    const record = researchNoteRecordSchema.parse({ ...f.contextRecord,
      id: work === "student" ? "b88aa880-0123-4123-a123-000000000000" : "b88aa880-0123-4123-a123-000000000001",
      tags: ["本地解读快照"], body: packed });
    const before = JSON.stringify(record);
    const save = vi.spyOn(webReportExportPort, "saveFile").mockImplementation(async (_blob, filename) =>
      ({ status: "download_requested", filename, method: "browser_download" }));
    const view = render(<ReadingSavedRecord record={record}/>);
    fireEvent.click(view.container.querySelector("summary")!);
    fireEvent.click(await screen.findByRole("button", { name: "导出这份通读报告" }));
    fireEvent.click(screen.getByRole("button", { name: /^下载$/u }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const exported = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject;
      reader.readAsText(save.mock.calls[0]![0]);
    });
    expect(exported).toBe(f.edition.reading);
    expect(JSON.stringify(record)).toBe(before);
  }, 15_000);
});
