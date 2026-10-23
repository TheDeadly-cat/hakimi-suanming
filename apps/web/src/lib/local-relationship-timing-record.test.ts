import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents, describeReadingAnnualEvents, annualEventFeedbackText, annualEventFeedbackSubjectId } from "./local-annual-event-record";
import { buildStructuredReadingFeedback, parseReadingFeedback } from "./local-reading-feedback";
import { ANNUAL_RELATIONSHIP_TIMING_SOURCES } from "./annual-relationship-timing-sources";
import { expandAnnualRelationshipTiming } from "./annual-relationship-timing-record";

async function fixture() {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic timing source", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: true, startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  const source = { revision, assessment, annual, annualDomains };
  return { source, events: buildReadingAnnualEvents(source) };
}
let data: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { data = await fixture(); });

describe("annual relationship timing across feedback and full records", () => {
  it("preserves all exact branches, signals, versions, source excerpts and feedback bodies", () => {
    const before = JSON.stringify(data), report = describeReadingAnnualEvents(data.events, data.source).join("\n");
    const compactRecords = report.split("\n").filter((line) => line.startsWith("关系时机紧凑记录：")).map((line) => JSON.parse(line.slice("关系时机紧凑记录：".length)));
    const sharedLine = report.split("\n").find((line) => line.startsWith("关系时机共享表："))!;
    const shared = JSON.parse(sharedLine.slice("关系时机共享表：".length));
    const expandedRecords = compactRecords.map((compact) => expandAnnualRelationshipTiming(compact, shared));
    let count = 0;
    for (const year of data.events.years) for (const branch of year.branches) for (const segment of branch.segments) for (const item of segment.items) {
      if (!item.relationshipTiming) continue;
      count++;
      const timing = item.relationshipTiming, feedback = annualEventFeedbackText(year, branch, segment, item);
      // The report stores shared fields once; reconstruction must preserve the
      // original JSON byte-for-byte, including all fields and their order.
      // Standalone feedback still carries the entire unreduced object.
      expect(expandedRecords.map((entry) => JSON.stringify(entry))).toContain(JSON.stringify(timing));
      expect(feedback).toContain(JSON.stringify(timing));
      expect(timing.scope.branchId).toBe(branch.id); expect(timing.scope.segmentId).toBe(segment.id);
      for (const text of [item.title, item.summary, ...item.examples, ...item.why]) { expect(report).toContain(text); expect(feedback).toContain(text); }
      const parsed = parseReadingFeedback(buildStructuredReadingFeedback(data.source.assessment, { subjectId: annualEventFeedbackSubjectId(year.year, segment, item), subjectLabel: item.title,
        originalConclusion: feedback, sourceVersions: [data.events.version, ...year.sourceVersions], rating: "unverified", actualSituation: "合成反馈；没有真实婚恋资料。" }));
      expect(parsed.kind).toBe("feedback"); if (parsed.kind === "feedback") expect(parsed.value.originalConclusion).toBe(feedback);
      for (const id of timing.sourceIds) {
        const source = ANNUAL_RELATIONSHIP_TIMING_SOURCES.find((entry) => entry.id === id);
        expect(source).toBeTruthy(); expect(report).toContain(JSON.stringify(source));
      }
    }
    expect(count).toBeGreaterThan(5); expect(JSON.stringify(data)).toBe(before);
    for (const source of ANNUAL_RELATIONSHIP_TIMING_SOURCES) expect(createHash("sha256").update(source.excerpt).digest("hex")).toBe(source.provenance!.excerptSha256);
  });
  it("rejects omitted timing, changed text and borrowed direction facts before saving", () => {
    for (const change of ["omit", "text", "branch", "signal", "source"] as const) {
      const altered = structuredClone(data.events);
      const item = altered.years.flatMap((year) => year.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.items))).find((item) => item.relationshipTiming)!;
      if (change === "omit") delete item.relationshipTiming;
      else if (change === "text") item.summary = "没有原始依据的新断语";
      else if (change === "branch") item.relationshipTiming!.scope.branchId = item.relationshipTiming!.scope.branchId === "forward" ? "backward" : "forward";
      else if (change === "signal") item.relationshipTiming!.lenses[0]!.triggerSignalIds.push("borrowed-year-star");
      else item.relationshipTiming!.sourceIds.push("nonexistent-source");
      expect(() => describeReadingAnnualEvents(altered, data.source)).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
    }
  });
});
