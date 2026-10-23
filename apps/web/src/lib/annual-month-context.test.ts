import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { ANNUAL_MONTH_CONTEXT_VERSION, buildAnnualMonthContext, type BuildAnnualMonthContextInput } from "./annual-month-context";

async function revisionFor(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic annual-month context", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
async function inputFor(revision: RevisionRecord, yearNumber: number): Promise<BuildAnnualMonthContextInput> {
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, monthly] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, yearNumber), buildLocalMonthlyOutlook(revision, assessment, yearNumber)]);
  const year = annual.years[0]!, annualDomains = buildAnnualDomainReading({ revision, assessment, year });
  return { revision, assessment, year, annualDomains, annualEvents: buildAnnualEventReading({ revision, assessment, year, domains: annualDomains }),
    monthly, monthlyDomains: buildMonthlyDomainReadings({ revision, assessment, monthly }) };
}
let a: BuildAnnualMonthContextInput, b: BuildAnnualMonthContextInput, unknown: BuildAnnualMonthContextInput, child: BuildAnnualMonthContextInput;
let birth: BuildAnnualMonthContextInput, firstLuck: BuildAnnualMonthContextInput, beforeBirth: BuildAnnualMonthContextInput;
beforeAll(async () => {
  const [ar, br, ur, cr] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "unspecified"), revisionFor("2019-12-22", "female", "11:23")]);
  [a, b, unknown, child, birth, firstLuck, beforeBirth] = await Promise.all([
    inputFor(ar, 2028), inputFor(br, 2032), inputFor(ur, 2028), inputFor(cr, 2029), inputFor(ar, 1995), inputFor(ar, 1998), inputFor(ar, 1990),
  ]);
}, 60_000);

describe("exact same-source annual-to-month context", () => {
  it("preserves all twelve original months, exact captions and all same-domain source text", () => {
    for (const source of [a, b, unknown, child]) {
      const before = JSON.stringify(source), result = buildAnnualMonthContext(source);
      expect(result.version).toBe(ANNUAL_MONTH_CONTEXT_VERSION); expect(result.months).toHaveLength(12);
      expect(result.yearNodeRef).toEqual(source.year.transitNodeRef);
      for (const [index, month] of result.months.entries()) {
        const original = source.monthly.months[index]!, domains = source.monthlyDomains.months[index]!;
        expect([month.monthId, month.nodeRef, month.startInstant, month.endExclusiveInstant, month.stemTenGod]).toEqual([original.id, original.nodeRef, original.startInstant, original.endExclusiveInstant, original.stemTenGod]);
        for (const branch of month.branches) for (const period of branch.periods) {
          const old = domains.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === period.id)!;
          expect(period.monthlySegment).toEqual(old);
          expect(period.monthlyJudgment).toEqual(original.judgmentSegments.find((item) => item.id === period.id)!.judgment);
          expect(period.annualSegment).toEqual(source.annualEvents.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === period.annualSegment!.id));
          expect(period.annualDomainSegment).toEqual(source.annualDomains.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === period.annualSegment!.id));
          for (const id of ["career", "wealth", "relationship"]) {
            expect(period.monthlySegment.domains.find((domain) => domain.id === id)).toEqual(old.domains.find((domain) => domain.id === id));
            expect(period.annualSegment!.items.filter((item) => item.domain === id)).toEqual(source.annualEvents.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === period.annualSegment!.id)!.items.filter((item) => item.domain === id));
          }
        }
      }
      expect(JSON.stringify(source)).toBe(before);
    }
  });

  it("binds A's December handover to its two actual annual segments and never borrows the other branch", () => {
    const known = buildAnnualMonthContext(a).months.find((month) => month.label === "大雪月")!;
    const periods = known.branches[0]!.periods;
    expect(periods).toHaveLength(2);
    expect(periods[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z"); expect(periods[1]!.startInstant).toBe(periods[0]!.endExclusiveInstant);
    expect(periods.map((period) => period.annualSegment!.backgroundLabels)).toEqual([["辛巳大运"], ["庚辰大运"]]);
    expect(periods[0]!.annualSegment!.id).not.toBe(periods[1]!.annualSegment!.id);
    const parallel = buildAnnualMonthContext(unknown).months.find((month) => month.label === "大雪月")!;
    expect(parallel.branches.map((branch) => [branch.id, branch.periods.length])).toEqual([["forward", 1], ["backward", 2]]);
    expect(parallel.branches[0]!.periods[0]!.annualSegment!.backgroundLabels).toEqual(["丁亥大运"]);
    for (const branch of parallel.branches) for (const period of branch.periods) {
      expect(period.annualSegment!.branchId).toBe(branch.id);
      expect(period.annualSegment!.backgroundRefs).toEqual(period.monthlySegment.backgroundRefs.filter((ref) => ref.nodeType === "dayun"));
    }
    expect(parallel.branches[0]!.periods[0]!.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("mixed");
    for (const period of parallel.branches[1]!.periods) {
      const pattern = period.monthlyJudgment.axes.find(axis => axis.axis === "pattern")!;
      expect(pattern.effect).toBe("mixed");
      expect(pattern.stemActions!.items.find(actor => actor.visibility === "visible")!.effect).toBe("assists");
      expect(pattern.blockers.length).toBeGreaterThan(0);
    }
  });

  it("keeps B2032 real month gods and month-palace facts separate from the annual relationship window", () => {
    const result = buildAnnualMonthContext(b), clash = result.months.find((month) => month.label === "惊蛰月")!, joined = result.months.find((month) => month.label === "清明月")!;
    expect([clash.ganZhi, clash.stemTenGod, joined.ganZhi, joined.stemTenGod]).toEqual(["癸卯", "偏财", "甲辰", "正官"]);
    expect(clash.monthlyRelationshipFacts.map((fact) => fact.relationType)).toEqual(["branch_six_clash"]);
    expect(joined.monthlyRelationshipFacts.map((fact) => fact.relationType)).toEqual(["branch_six_combination"]);
    for (const month of result.months) for (const fact of month.monthlyRelationshipFacts) {
      expect(fact.monthNodeRef).toEqual(month.nodeRef); expect(fact.natalPosition).toBe("day"); expect(fact.natalGanZhi).toBe("己酉");
      expect(fact.participants).toHaveLength(2); expect(fact.participants.every((part) => part.component === "branch")).toBe(true);
      expect(fact.participants.map((part) => part.position).sort()).toEqual(["day", "year"]);
      expect(fact.participants.find((part) => part.position === "year")!.value).toBe(month.ganZhi[1]);
      expect(fact.participants.find((part) => part.position === "day")!.value).toBe("酉");
    }
    const noMonthlyContact = result.months.find((month) => month.monthlyRelationshipFacts.length === 0)!;
    expect(noMonthlyContact.branches[0]!.periods[0]!.annualSegment!.items.some((item) => item.domain === "relationship")).toBe(true);
    expect(noMonthlyContact.monthlyRelationshipFacts).toEqual([]);
  });

  it("preserves female-child age and does not turn yearly authority into adult relationship facts", () => {
    const result = buildAnnualMonthContext(child);
    for (const month of result.months) for (const branch of month.branches) for (const period of branch.periods) {
      expect(period.monthlySegment.ageStage).not.toBe("adult"); expect(period.annualSegment!.ageStage).not.toBe("adult");
      const relation = period.annualSegment!.items.find((item) => item.domain === "relationship")!;
      expect(relation.relationshipTiming!.sourceBinding.sex).toBe("female");
      expect(relation.summary).not.toMatch(/已有伴侣|共同婚姻|夫妻生活/);
    }
  });

  it("keeps before-birth months, birthday clipping and first-luck year-only portions without filling them", () => {
    const old = buildAnnualMonthContext(beforeBirth);
    expect(old.status).toBe("before_birth"); expect(old.months).toHaveLength(12);
    expect(old.months.every((month) => month.status === "before_birth" && month.branches.every((branch) => branch.periods.length === 0))).toBe(true);
    const born = buildAnnualMonthContext(birth), instant = new Date(birth.revision.timeCalibration.utcInstant!).toISOString();
    const birthday = born.months.find((month) => Date.parse(month.startInstant) < Date.parse(instant) && Date.parse(instant) < Date.parse(month.endExclusiveInstant))!;
    expect(birthday.branches[0]!.periods[0]!.startInstant).toBe(instant);
    expect(birthday.branches[0]!.gaps).toEqual(expect.arrayContaining([expect.objectContaining({ source: "monthly", startInstant: birthday.startInstant, endExclusiveInstant: instant })]));
    const first = buildAnnualMonthContext(firstLuck), december = first.months.find((month) => month.label === "大雪月")!.branches[0]!.periods;
    expect(december).toHaveLength(2); expect(december[0]!.annualSegment!.backgroundRefs).toEqual([]);
    expect(december[0]!.monthlySegment.backgroundRefs.map((ref) => ref.nodeType)).toEqual(["year"]);
    expect(december[1]!.annualSegment!.backgroundLabels).toEqual(["癸未大运"]);
    expect(december[1]!.startInstant).toBe("1998-12-20T20:58:00.000Z");
  });

  it("retains unknown-hour rejection and projects an explicit unavailable contract without inventing monthly nodes", async () => {
    const revision = structuredClone(a.revision); revision.input.time = null; revision.input.timePrecision = "unknown_hour";
    const assessment = buildBaziPreliminaryAssessment(revision);
    await expect(buildLocalMonthlyOutlook(revision, assessment, 2028)).rejects.toThrow("完整性复算");
    const annual = await buildLocalAnnualOutlook(revision, assessment, 2028), year = annual.years[0]!;
    expect(year.transitNodeRef).toBeNull();
    // Explicit unavailable transport contract after rejection, not a claimed
    // calculateChart or monthly-engine result for an unknown birth time.
    const monthly = { ...a.monthly, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, status: "unavailable" as const,
      yearGanZhi: null, yearNodeRef: null, startInstant: null, endExclusiveInstant: null, months: [], limitations: ["Unknown-hour source rejected upstream; no monthly nodes supplied."] };
    const annualDomains = buildAnnualDomainReading({ revision, assessment, year });
    const annualEvents = buildAnnualEventReading({ revision, assessment, year, domains: annualDomains });
    const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly });
    const result = buildAnnualMonthContext({ revision, assessment, year, annualDomains, annualEvents, monthly, monthlyDomains });
    expect(result.status).toBe("unavailable"); expect(result.sourceBinding.includeHour).toBe(false); expect(result.months).toEqual([]); expect(result.yearNodeRef).toBeNull();
  });

  it("rejects altered derived prose, original month god, missing months, adjacent years and duplicate/crossed branches", async () => {
    const changes: ((source: BuildAnnualMonthContextInput) => void)[] = [
      (s) => { s.annualEvents.branches[0]!.segments[0]!.items[0]!.summary += "tampered"; },
      (s) => { s.annualDomains.branches[0]!.segments[0]!.domains[0]!.examples[0] += "tampered"; },
      (s) => { s.monthlyDomains.months[0]!.branches[0]!.segments[0]!.domains[0]!.evidence.push("tampered"); },
      (s) => { s.monthly.months[0]!.stemTenGod = "invalid-ten-god"; },
      (s) => { s.monthly.months.pop(); },
      (s) => { s.monthly.year += 1; },
      (s) => { s.monthly.months[0]!.branches.push(structuredClone(s.monthly.months[0]!.branches[0]!)); },
      (s) => { s.monthly.months[0]!.branches[1]!.id = "forward"; },
      (s) => { s.annualEvents.branches[0]!.segments[0]!.backgroundRefs[0]!.manualDirection = "backward"; },
    ];
    for (const change of changes) { const invalid = structuredClone(unknown); change(invalid); expect(() => buildAnnualMonthContext(invalid)).toThrow(); }
    const otherYear = structuredClone(b); otherYear.year = a.year; otherYear.annualDomains = a.annualDomains; otherYear.annualEvents = a.annualEvents;
    expect(() => buildAnnualMonthContext(otherYear)).toThrow();
    const nextYear = await inputFor(a.revision, 2029);
    expect(() => buildAnnualMonthContext({ ...nextYear, monthly: a.monthly, monthlyDomains: a.monthlyDomains })).toThrow("不能借用邻年");
  });

  it("rejects a coherently changed month boundary or same-ID background ref before bridging", () => {
    const altered = structuredClone(a), month = altered.monthly.months.find((m) => m.judgmentSegments.length === 2)!;
    const part = month.branches[0]!.judgmentSegments[0]!;
    part.endExclusiveInstant = new Date(Date.parse(part.endExclusiveInstant) - 1).toISOString(); part.judgment.interval.endExclusiveInstant = part.endExclusiveInstant;
    month.judgmentSegments = month.branches.flatMap((branch) => branch.judgmentSegments);
    expect(() => buildAnnualMonthContext(altered)).toThrow();
    const wrong = structuredClone(a); wrong.monthly.months[0]!.branches[0]!.segments[0]!.nodeRef.ruleProfileDigest = "e".repeat(64);
    expect(() => buildAnnualMonthContext(wrong)).toThrow();
  });

  it("requires annual and monthly prose to share the confirmed contextual source", async () => {
    const input = structuredClone(b), body = await buildReadingContextRecord(input.revision, null, { work: "student", relationship: "single", fromYear: 2032, toYear: 2032, notes: "不从备注推定职业或婚史" });
    const note: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId, anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body,
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    const resolved = await resolveReadingContext({ revision: input.revision, records: [note] });
    input.contextual = buildContextualReadingBundle({ revision: input.revision, assessment: input.assessment, comprehensive: null, context: resolved.latest,
      annualDomains: { version: input.annualDomains.version, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash, includeHour: true, startYear: 2032, endYear: 2032, years: [input.annualDomains] }, referenceYear: 2032 })!;
    input.annualEvents = buildAnnualEventReading({ revision: input.revision, assessment: input.assessment, year: input.year, domains: input.annualDomains, contextual: input.contextual });
    // A current contextual annual source cannot be paired with the earlier,
    // unadapted monthly collection, even when its timing is identical.
    expect(() => buildAnnualMonthContext(input)).toThrow("月份领域全文或分段");
    input.monthlyDomains = buildMonthlyDomainReadings({ revision: input.revision, assessment: input.assessment, monthly: input.monthly, contextual: input.contextual });
    const result = buildAnnualMonthContext(input), period = result.months[0]!.branches[0]!.periods[0]!;
    expect(result.contextRef).toEqual(input.contextual.contextSource.reference);
    expect(period.annualSegment!.items.find((item) => item.domain === "career")!.origin.contextSubjectId).not.toBeNull();
    expect(period.monthlySegment.domains).toEqual(input.monthlyDomains.months[0]!.branches[0]!.segments[0]!.domains);
    const missingContext = structuredClone(input); delete missingContext.contextual;
    expect(() => buildAnnualMonthContext(missingContext)).toThrow();
  });

  it("returns isolated original objects and never mutates the source calculations", () => {
    const input = structuredClone(a), before = JSON.stringify(input), result = buildAnnualMonthContext(input);
    const period = result.months[0]!.branches[0]!.periods[0]!;
    period.annualSegment!.items[0]!.summary = "caller mutation"; period.monthlySegment.domains[0]!.examples.push("caller mutation");
    period.monthlyJudgment.summary = "caller mutation"; result.months[0]!.nodeRef.nodeId = "caller mutation";
    expect(JSON.stringify(input)).toBe(before);
  });
});
