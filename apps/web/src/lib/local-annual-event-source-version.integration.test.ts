import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { ANNUAL_EVENT_READING_PROSE_VERSION } from "./annual-event-reading-prose";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents, describeReadingAnnualEvents, annualEventFeedbackSubjectId, annualEventFeedbackText, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import { annualEventCompositionChoices } from "./local-annual-event-composition-record";
import { composeAnnualEvents } from "./local-annual-event-composition";
import { buildReadingPriorities, type LocalReadingPriorities } from "./local-reading-priorities";
import { priorityEventKey, projectPriorityAnnualEvents } from "./priority-annual-events";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";

const oldProseVersion = "hakimi.annual-event-reading-prose/0.6.0";
let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook;
let annualDomains: LocalReadingAnnualDomains, events: LocalReadingAnnualEvents, priorities: LocalReadingPriorities;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成文字版本绑定检查", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  events = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  priorities = buildReadingPriorities({ revision, annual, annualDomains });
});

function workChoice(): ReadingFeedbackChoice {
  const reading = events.years.find((entry) => entry.year === 2028)!, branch = reading.branches[0]!, segment = branch.segments[0]!;
  const item = segment.items.find((entry) => entry.id === "career-work-change")!;
  expect(item).toBeTruthy();
  return { id: annualEventFeedbackSubjectId(reading.year, segment, item), label: item.title,
    originalConclusion: annualEventFeedbackText(reading, branch, segment, item), sourceVersions: [events.version, ...reading.sourceVersions] };
}
function note(body: string, review: boolean): ResearchNoteRecord {
  const instant = review ? "2026-10-16T01:01:00Z" : "2026-10-16T01:00:00Z";
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: ["解读反馈", ...(review ? ["解读复核"] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: instant, updatedAt: instant };
}
async function adoptedRecords(choice: ReadingFeedbackChoice): Promise<ResearchNoteRecord[]> {
  const root = note(buildStructuredReadingFeedback(assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial",
    aspect: "合成验证：本人实际推进次序不同。", actualSituation: "合成验证：保留本人对当时原文的修订。", requestedRevision: "合成个人修订，不替换新版自动原文。" }), false);
  const reviewed = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment, choice.sourceVersions),
    { state: "revised", notes: "合成明确采用动作。", revisedConclusion: "合成个人修订，不替换新版自动原文。", occurredAt: "2028 年" }), true);
  return [root, reviewed];
}

describe("event prose version reaches projection, feedback and same-source recording", () => {
  it("carries prose 0.7 through real work changes and complete settlement members without changing their identities or exact periods", () => {
    expect(ANNUAL_EVENT_READING_PROSE_VERSION).toBe("hakimi.annual-event-reading-prose/0.12.0");
    const original = JSON.stringify(events), projected = projectPriorityAnnualEvents(priorities, events);
    for (const year of events.years) {
      expect(year.sourceVersions).toContain(ANNUAL_EVENT_READING_PROSE_VERSION);
      expect(year.sourceVersions).not.toContain(oldProseVersion);
      for (const branch of year.branches) for (const segment of branch.segments) {
        const displayed = projected.get(priorityEventKey(year.year, branch.id, segment.id))!;
        expect(displayed).toBeTruthy();
        expect(displayed.startInstant).toBe(segment.startInstant);
        expect(displayed.endExclusiveInstant).toBe(segment.endExclusiveInstant);
        expect(displayed.backgroundRefs).toEqual(segment.backgroundRefs);
        expect(displayed.items.flatMap((group) => group.members).sort((a, b) => a.id.localeCompare(b.id)))
          .toEqual([...segment.items].sort((a, b) => a.id.localeCompare(b.id)));
      }
    }
    expect(workChoice().sourceVersions).toContain(ANNUAL_EVENT_READING_PROSE_VERSION);
    const settlement = events.years.find((year) => year.year === 2032)!;
    const group = composeAnnualEvents(settlement).branches[0]!.segments[0]!.items.find((item) => item.kind === "settlement")!;
    expect(group.members.map((item) => item.id)).toEqual(["career-settlement", "wealth-settlement"]);
    const combined = annualEventCompositionChoices(events).find((choice) => choice.id.includes("2032-"))!;
    expect(combined.sourceVersions).toContain(ANNUAL_EVENT_READING_PROSE_VERSION);
    for (const member of group.members) {
      expect(combined.originalConclusion).toContain(member.summary);
      for (const reason of member.why) expect(combined.originalConclusion).toContain(reason);
    }
    expect(JSON.stringify(events)).toBe(original);
  });

  it("retains the complete professional reasoning in projection, individual feedback and the same-source report", () => {
    const original = JSON.stringify(events), projected = projectPriorityAnnualEvents(priorities, events);
    const report = describeReadingAnnualEvents(events, { revision, assessment, annual, annualDomains }).join("\n");
    for (const year of events.years.filter((entry) => [2028, 2030, 2032].includes(entry.year))) {
      const originalYear = annual.years.find((entry) => entry.year === year.year)!;
      for (const branch of year.branches) for (const segment of branch.segments) {
        const pattern = originalYear.judgmentSegments.find((entry) => entry.id === segment.id && entry.branchId === branch.id)!.judgment.axes.find((entry) => entry.axis === "pattern")!;
        const members = projected.get(priorityEventKey(year.year, branch.id, segment.id))!.items.flatMap((group) => group.members);
        for (const item of segment.items.filter((entry) => entry.domain !== "relationship")) {
          expect(item.why).toContain(pattern.summary);
          expect(item.summary).not.toContain(pattern.summary);
          expect(item.why).toEqual(expect.arrayContaining([...pattern.rescues, ...pattern.unresolvedConditions]));
          expect(members.find((entry) => entry.id === item.id)).toEqual(item);
          const feedback = annualEventFeedbackText(year, branch, segment, item);
          for (const reason of item.why) {
            expect(feedback).toContain(reason);
            expect(report).toContain(reason);
          }
        }
      }
    }
    expect(JSON.stringify(events)).toBe(original);
    const changedReason = structuredClone(events);
    changedReason.years[0]!.branches[0]!.segments[0]!.items[0]!.why.push("未绑定原作用的专业说明。");
    expect(() => describeReadingAnnualEvents(changedReason, { revision, assessment, annual, annualDomains })).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
  });

  it("does not reuse an explicit old-prose personal adoption even when the subject and original text are identical", async () => {
    for (const current of [workChoice(), annualEventCompositionChoices(events).find((choice) => choice.id.includes("2032-"))!]) {
      const older = { ...current, sourceVersions: current.sourceVersions!.map((version) => version === ANNUAL_EVENT_READING_PROSE_VERSION ? oldProseVersion : version) };
      const records = await adoptedRecords(older), before = JSON.stringify(records);
      const result = await buildLocalPersonalReading({ revision, assessment, choices: [current], records });
      expect(result.entries).toEqual([]);
      expect(result.issues.join()).toContain("解读版本与当前内容不同");
      expect(JSON.stringify(records)).toBe(before);
      const accepted = await buildLocalPersonalReading({ revision, assessment, choices: [current], records: await adoptedRecords(current) });
      expect(accepted.entries[0]!.state).toBe("adopted");
      expect(accepted.entries[0]!.originalConclusion).toBe(current.originalConclusion);
      expect(accepted.entries[0]!.readingVersions).toContain(ANNUAL_EVENT_READING_PROSE_VERSION);
    }
  });

  it("rejects an old prose identity or changed prose on a new report instead of signing it as current", () => {
    const source = { revision, assessment, annual, annualDomains };
    expect(describeReadingAnnualEvents(events, source).join("\n")).toContain(ANNUAL_EVENT_READING_PROSE_VERSION);
    const oldIdentity = structuredClone(events);
    oldIdentity.years[0]!.sourceVersions = oldIdentity.years[0]!.sourceVersions.map((version) => version === ANNUAL_EVENT_READING_PROSE_VERSION ? oldProseVersion : version);
    expect(() => describeReadingAnnualEvents(oldIdentity, source)).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
    const changedText = structuredClone(events);
    changedText.years[0]!.branches[0]!.segments[0]!.items[0]!.summary += "未绑定来源的追加结论。";
    expect(() => describeReadingAnnualEvents(changedText, source)).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
  });

  it("rejects stale, missing, duplicate or mixed prose identities from priority cards without discarding their original domain fallback", () => {
    const original = JSON.stringify(priorities);
    for (const versions of [[], ["hakimi.annual-event-reading-prose/0.0.0"],
      [ANNUAL_EVENT_READING_PROSE_VERSION, ANNUAL_EVENT_READING_PROSE_VERSION],
      [ANNUAL_EVENT_READING_PROSE_VERSION, "hakimi.annual-event-reading-prose/0.0.0"]]) {
      const changed = structuredClone(events);
      for (const year of changed.years) year.sourceVersions = [...year.sourceVersions.filter((version) => !version.startsWith("hakimi.annual-event-reading-prose/")), ...versions];
      expect(projectPriorityAnnualEvents(priorities, changed).size).toBe(0);
      expect(JSON.stringify(priorities)).toBe(original);
      expect(priorities.branches[0]!.years[0]!.segments[0]!.domains.map((domain) => domain.id)).toEqual(["career", "wealth", "relationship"]);
    }
    expect(projectPriorityAnnualEvents(priorities, events).size).toBeGreaterThan(0);
  });
});
