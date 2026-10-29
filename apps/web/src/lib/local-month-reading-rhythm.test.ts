import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualMonthStory } from "./local-annual-month-story";
import { buildMonthReadingRhythm, MONTH_READING_RHYTHM_VERSION, type BuildMonthReadingRhythmInput } from "./local-month-reading-rhythm";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";

async function revisionFor(date: string, sex: "male" | "female" | "unspecified", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic month reading rhythm", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
}
async function inputFor(revision: RevisionRecord, yearNumber: number, withContext = false): Promise<BuildMonthReadingRhythmInput> {
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, monthly] = await Promise.all([buildLocalAnnualOutlookRange(revision, assessment, yearNumber, yearNumber), buildLocalMonthlyOutlook(revision, assessment, yearNumber)]);
  const year = annual.years[0]!, annualDomains = buildAnnualDomainReading({ revision, assessment, year });
  let contextual = null;
  if (withContext) {
    const record = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId,
      anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown",
      body: await buildReadingContextRecord(revision, null, { work: "retired", relationship: "unspecified", fromYear: yearNumber, toYear: yearNumber, notes: "合成自述" }),
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z" });
    const resolved = await resolveReadingContext({ revision, records: [record] });
    contextual = buildContextualReadingBundle({ revision, assessment, comprehensive: null, referenceYear: yearNumber, context: resolved.latest,
      annualDomains: { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
        includeHour: assessment.sourceBinding.includeHour, startYear: yearNumber, endYear: yearNumber, years: [annualDomains] } });
  }
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly, contextual });
  const annualEvents = buildAnnualEventReading({ revision, assessment, year, domains: annualDomains, contextual });
  return { monthly, monthlyDomains, contextual, annualMonthStory: buildAnnualMonthStory({ revision, assessment, year, annualDomains, annualEvents, monthly, monthlyDomains, contextual }) };
}
let b: BuildMonthReadingRhythmInput, unknown: BuildMonthReadingRhythmInput, child: BuildMonthReadingRhythmInput, beforeBirth: BuildMonthReadingRhythmInput, retired: BuildMonthReadingRhythmInput;
beforeAll(async () => {
  const [br, ar, cr] = await Promise.all([revisionFor("1995-05-18", "male"), revisionFor("1995-08-18", "unspecified"), revisionFor("2019-12-22", "female", "11:23")]);
  [b, unknown, child, beforeBirth, retired] = await Promise.all([inputFor(br, 2032), inputFor(ar, 2028), inputFor(cr, 2025), inputFor(cr, 2018), inputFor(br, 2032, true)]);
}, 60_000);

describe("a continuous reading of existing monthly judgments", () => {
  it("keeps B's twelve real months, their distinct topics and all original inputs", () => {
    const before = JSON.stringify(b), result = buildMonthReadingRhythm(b), branch = result.branches[0]!;
    expect(result.version).toBe(MONTH_READING_RHYTHM_VERSION);
    expect(new Set(branch.periods.map(period => period.monthId)).size).toBe(12);
    expect(branch.directionRanges.flatMap(range => range.periodIds)).toEqual(branch.periods.map(period => period.id));
    const picked = ["清明月", "立夏月", "立秋月", "白露月"].map(label => branch.periods.find(period => period.monthLabel === label)!);
    expect(new Set(picked.map(period => period.summary)).size).toBe(4);
    for (const period of branch.periods) {
      const original = b.monthly.months.find(month => month.id === period.monthId)!.judgmentSegments.find(segment => segment.id === period.id)!;
      expect(period.label).toBe(original.judgment.label);
      expect(period.caption).toBe(outlookDirectionCaption(original.judgment, null));
      expect(period.headline).toContain(period.caption);
      expect(period.nodeRef).toEqual(original.judgment.targetRef);
      expect(period.backgroundRefs).toEqual(original.judgment.backgroundRefs);
      for (const axis of original.judgment.axes) for (const text of [...axis.blockers, ...axis.rescues]) expect(period.conditions).toContain(text);
    }
    result.branches[0]!.periods[0]!.backgroundRefs[0]!.nodeId = "caller-only";
    expect(JSON.stringify(b)).toBe(before);
  });
  it("keeps both directions and the exact handover inside A's month, even without a better caption", () => {
    const result = buildMonthReadingRhythm(unknown);
    expect(result.branches.map(branch => branch.id).sort()).toEqual(["backward", "forward"]);
    for (const branch of result.branches) {
      const expected = unknown.monthly.months.flatMap(month => month.judgmentSegments.filter(segment => segment.branchId === branch.id));
      expect(branch.periods.map(period => [period.id, period.startInstant, period.endExclusiveInstant])).toEqual(expected.map(segment => [segment.id, segment.startInstant, segment.endExclusiveInstant]));
      for (const period of branch.periods) expect(period.branchId).toBe(branch.id);
    }
    const reverse = result.branches.find(branch => branch.id === "backward")!, handover = reverse.periods.find(period => period.handoverBefore)!;
    expect(handover).toBeDefined();
    expect(handover.startInstant).toBe("2028-12-20T20:58:00.000Z");
    const index = reverse.periods.indexOf(handover), prior = reverse.periods[index - 1]!;
    expect(prior.monthId).toBe(handover.monthId);
    expect(prior.endExclusiveInstant).toBe(handover.startInstant);
    expect(reverse.directionRanges.some(range => range.periodIds.includes(prior.id) && range.periodIds.includes(handover.id))).toBe(false);
    expect(reverse.overview).toContain("交运所在月份");
  });
  it("does not vote from aggregate directions or turn neutral monthly actors into good months", () => {
    const copy = structuredClone(b), expected = buildMonthReadingRhythm(b);
    for (const month of copy.monthly.months) {
      month.direction = "favorable" as typeof month.direction;
      if (month.judgment) month.judgment.label = "较顺";
      if (month.ownJudgment) month.ownJudgment.label = "较顺";
    }
    expect(buildMonthReadingRhythm(copy)).toEqual(expected);
    const rows = expected.branches[0]!.periods.filter(period => ["清明月", "立夏月", "立秋月", "白露月"].includes(period.monthLabel));
    expect(rows).toHaveLength(4);
    for (const period of rows) {
      const source = b.monthly.months.find(month => month.id === period.monthId)!.judgmentSegments.find(segment => segment.id === period.id)!;
      expect(source.judgment.axes.find(axis => axis.axis === "pattern")!.stemActions!.items.find(actor => actor.visibility === "visible")!.effect).toBe("neutral");
      expect(period.label).toBe(source.judgment.label);
    }
    expect(expected.branches[0]!.overview).not.toMatch(/最佳|最差|概率|必然/);
  });
  it("retains actual adoption subjects without turning annual-only relationship themes into monthly timing", () => {
    const result = buildMonthReadingRhythm(b);
    for (const period of result.branches[0]!.periods) {
      const original = b.annualMonthStory.months.find(month => month.monthId === period.monthId)!.branches[0]!.periods.find(segment => segment.id === period.id)!;
      expect(period.sourceSubjects).toContain(`month-${period.monthId}`);
      expect(period.sourceSubjects).toContain(`annual-${b.monthly.year}`);
      for (const topic of period.topics) {
        expect(topic.sourceSubjects).toContain(`monthly-domain-${period.monthId}-${period.id}-${topic.domainId}`);
        expect(topic.sourceSubjects).toContain(`annual-month-story-${b.monthly.year}-${period.monthId}-${period.id}-${topic.domainId}`);
        for (const link of original.domains.find(domain => domain.id === topic.domainId)!.links.annualEvents)
          expect(topic.sourceSubjects).toContain(`annual-event-${link.year}-${link.segmentId}-${link.itemId}`);
      }
      const relation = original.domains.find(domain => domain.id === "relationship")!;
      if (relation.connection === "annual_background") expect(period.topics.some(topic => topic.domainId === "relationship")).toBe(false);
    }
    // Projection-only gap: no linked yearly claim may acquire a year-adoption
    // dependency just because the calendar background is the same year.
    const monthlyOnly = structuredClone(b);
    for (const month of monthlyOnly.annualMonthStory.months) for (const branch of month.branches) for (const period of branch.periods)
      for (const domain of period.domains) { domain.links.annualEvents = []; domain.connection = "monthly_only"; }
    expect(buildMonthReadingRhythm(monthlyOnly).branches.flatMap(branch => branch.periods)
      .every(period => !period.sourceSubjects.includes(`annual-${b.monthly.year}`))).toBe(true);
  });
  it("keeps child language and birth-before gaps without adding adult events", () => {
    const result = buildMonthReadingRhythm(child);
    expect(result.branches[0]!.periods.some(period => period.ageLabel.includes("5") && period.ageLabel.includes("6"))).toBe(true);
    for (const period of result.branches[0]!.periods) expect(period.summary).not.toMatch(/工资|在职|客户|录用|婚期|加薪/);
    const absent = buildMonthReadingRhythm(beforeBirth);
    expect(absent.status).toBe("before_birth");
    expect(absent.branches.every(branch => !branch.periods.length && branch.gaps.filter(gap => gap.source === "before_birth").length === 12)).toBe(true);
    for (const month of beforeBirth.annualMonthStory.months) for (const branch of month.branches)
      for (const gap of branch.gaps) expect(absent.branches.find(item => item.id === branch.id)!.gaps).toContainEqual(gap);
  });
  it("binds actual retired context subjects and refuses a missing or different background", () => {
    const before = JSON.stringify(retired), result = buildMonthReadingRhythm(retired);
    expect(result.contextRef).toEqual(retired.contextual!.contextSource.reference);
    const actual = retired.contextual!.readings.filter(reading => reading.scope.kind === "annual" && reading.scope.domainId !== "relationship");
    expect(actual.length).toBeGreaterThan(0);
    for (const reading of actual) expect(result.branches.flatMap(branch => branch.periods.flatMap(period => period.sourceSubjects))).toContain(reading.subjectId);
    expect(() => buildMonthReadingRhythm({ ...retired, contextual: null })).toThrow("同源现实背景");
    const different = structuredClone(retired); different.contextual!.contextSource.reference.editVersion++;
    expect(() => buildMonthReadingRhythm(different)).toThrow("同源现实背景");
    expect(JSON.stringify(retired)).toBe(before);
  });
  it("rejects wrong versions, captions, periods, branches, references and unsupported context", () => {
    const mutations: ((copy: BuildMonthReadingRhythmInput) => void)[] = [
      copy => { copy.monthlyDomains.sourceBinding.chartResultHash = "another"; },
      copy => { copy.annualMonthStory.months[0]!.branches[0]!.periods[0]!.judgmentCaption = "较顺"; },
      copy => { copy.annualMonthStory.months[0]!.branches[0]!.periods[0]!.endExclusiveInstant = "2032-03-05T00:00:00.000Z"; },
      copy => { copy.annualMonthStory.months[0]!.branches[0]!.periods[0]!.domains[0]!.links.monthlyDomain.branchId = "forward"; },
      copy => { copy.annualMonthStory.nodes[0]!.ref.nodeId += "/wrong"; },
      copy => { copy.monthlyDomains.sourceVersions.push("unmatched-version/9"); },
      copy => { const ref = { noteId: "different-context", editVersion: 1, bodySha256: "a".repeat(64) }; copy.monthlyDomains.contextRef = ref; copy.annualMonthStory.contextRef = ref; },
      copy => { copy.annualMonthStory.months[0]!.branches[0]!.periods.pop(); },
    ];
    for (const mutate of mutations) { const copy = structuredClone(b); mutate(copy); expect(() => buildMonthReadingRhythm(copy)).toThrow("月份节奏来源"); }
  });
});
