import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents, annualEventFeedbackText } from "./local-annual-event-record";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { buildReadingPriorities } from "./local-reading-priorities";
import { priorityEventKey, projectPriorityAnnualEvents } from "./priority-annual-events";
import { OUTLOOK_STEM_ACTIONS_VERSION } from "./local-outlook-judgment";

async function fixture() {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1999-01-09", time: "02:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic annual mechanism record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  const annualDomains: LocalReadingAnnualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: true, startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  return { revision, assessment, annual, annualDomains };
}
let source: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { source = await fixture(); });

describe("annual mechanism survives preview, feedback and complete original report", () => {
  it("preserves the actual stem action separately from its mixed structure and all saved context", () => {
    const before = JSON.stringify(source), events = buildReadingAnnualEvents(source);
    const priorities = buildReadingPriorities(source), projected = projectPriorityAnnualEvents(priorities, events);
    const body = buildLocalReadingSnapshot(source.assessment, source.annual, { sourceRevision: source.revision, annualDomains: source.annualDomains, annualEvents: events, priorities });
    const year = source.annual.years.find((item) => item.year === 2028)!;
    const axis = year.ownJudgment!.axes.find((item) => item.axis === "pattern")!;
    expect(axis.effect).toBe("mixed");
    expect(axis.stemActions!.items.find((item) => item.visibility === "visible")!.effect).toBe("obstructs");
    expect(axis.stemActions!.version).toBe(OUTLOOK_STEM_ACTIONS_VERSION);
    for (const original of [year.ownJudgment!, ...year.judgmentSegments.map((segment) => segment.judgment)]) {
      const actions = original.axes.find((item) => item.axis === "pattern")!.stemActions!;
      expect(body).toContain(`透干与本气分项：${JSON.stringify(actions)}`);
    }
    for (const reading of events.years.filter((item) => [2028, 2034].includes(item.year))) {
      expect(reading.sourceVersions).toContain(OUTLOOK_STEM_ACTIONS_VERSION);
      for (const branch of reading.branches) for (const segment of branch.segments) {
        const members = projected.get(priorityEventKey(reading.year, branch.id, segment.id))!.items.flatMap((group) => group.members);
        for (const item of segment.items) {
          expect(members).toContainEqual(item);
          const feedback = annualEventFeedbackText(reading, branch, segment, item);
          for (const value of [item.title, item.summary, ...item.examples, JSON.stringify(item.origin)]) {
            expect(feedback).toContain(value); expect(body).toContain(value);
          }
        }
        for (const ref of segment.backgroundRefs) expect(body).toContain(JSON.stringify(ref));
      }
    }
    expect(JSON.stringify(source)).toBe(before);
  });

  it("rejects a changed machine effect even when domains are rebuilt from the same forged annual input", () => {
    const forged = structuredClone(source), year = forged.annual.years.find((item) => item.year === 2028)!;
    const axis = year.judgmentSegments[0]!.judgment.axes.find((item) => item.axis === "pattern")!;
    const actor = axis.stemActions!.items.find((item) => item.visibility === "visible")!;
    expect(actor.effect).toBe("obstructs"); actor.effect = "assists";
    expect(() => {
      forged.annualDomains.years = forged.annual.years.map((entry) => buildAnnualDomainReading({ revision: forged.revision, assessment: forged.assessment, year: entry }));
      buildReadingAnnualEvents(forged);
    }).toThrow();
    const original = source.annual.years.find((item) => item.year === 2028)!.judgmentSegments[0]!.judgment.axes.find((item) => item.axis === "pattern")!;
    expect(original.stemActions!.items.find((item) => item.visibility === "visible")!.effect).toBe("obstructs");
  });
});
