import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, researchNoteRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { plainMonthlyPresentation } from "./plain-monthly-presentation";
import { plainLifeStagePresentation } from "./plain-life-stage-presentation";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildLocalAnnualOutlookRange, LOCAL_ANNUAL_OUTLOOK_VERSION } from "./local-annual-outlook";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";

async function fixture(child = false) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: child ? "2019-12-22" : "1995-05-18", time: child ? "11:23" : "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: child ? "female" : "male", lunarLeapMonth: false,
    location: { label: "Synthetic plain presentation", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [monthly, life, annual] = await Promise.all([buildLocalMonthlyOutlook(revision, assessment, 2029), buildLocalLifeOutlook(revision, assessment, 2029), buildLocalAnnualOutlookRange(revision, assessment, 2029, 2029)]);
  return { revision, assessment, monthly, life, annual, collection: buildMonthlyDomainReadings({ revision, assessment, monthly }), story: buildLifeStageStory({ revision, assessment, life }) };
}
let adult: Awaited<ReturnType<typeof fixture>>, child: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { [adult, child] = await Promise.all([fixture(), fixture(true)]); }, 60000);
function first(source: typeof adult) {
  const reading = source.collection.months.find(item => item.branches.some(branch => branch.segments.length > 1)) ?? source.collection.months[0]!;
  const segment = reading.branches[0]!.segments[0]!, domain = segment.domains[0]!;
  return { ...source, reading, segment, domain, month: source.monthly.months.find(item => item.id === reading.monthId)! };
}
describe("scope-bound plain month and decade presentation", () => {
  it("projects each real handover part without altering the original judgment, domain, examples or conditions", () => {
    const before = JSON.stringify(adult), x = first(adult);
    expect(x.reading.branches[0]!.segments).toHaveLength(2);
    for (const segment of x.reading.branches[0]!.segments) for (const domain of segment.domains) {
      const plain = plainMonthlyPresentation({ ...x, segment, domain });
      if (domain.id === "relationship") { expect(plain).toBeNull(); continue; }
      expect(plain).not.toBeNull();
      for (const field of ["headline", "summary", "paragraphs", "examples", "conditions", "evidence"] as const) expect(plain!.originals[field]).toEqual(domain[field]);
      expect(plain!.examples.slice(1)).toEqual(domain.examples.slice(1)); expect(plain!.conditions).toEqual(domain.conditions);
      expect(plain!.scope.interval).toEqual({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
      expect(plain!.scope.backgroundRefs).toEqual(segment.backgroundRefs);
    }
    expect(JSON.stringify(adult)).toBe(before);
  });
  it("rejects shifted nodes, boundaries and source identity, and does not use precise cached age for unknown time", () => {
    const x = first(adult);
    expect(plainMonthlyPresentation({ ...x, collection: undefined })).toBeNull();
    const wrong = structuredClone(x); wrong.month.judgmentSegments[0]!.judgment.interval.endExclusiveInstant = x.segment.startInstant;
    expect(() => plainMonthlyPresentation(wrong)).toThrow("来源不一致");
    const shifted = structuredClone(x); shifted.month.nodeRef.nodeId += "-foreign";
    expect(() => plainMonthlyPresentation(shifted)).toThrow("来源不一致");
    const foreign = structuredClone(x); foreign.collection.sourceBinding.chartResultHash = "f".repeat(64);
    expect(() => plainMonthlyPresentation(foreign)).toThrow("来源不一致");
    const wrongYear = structuredClone(x); wrongYear.collection.year++;
    expect(() => plainMonthlyPresentation(wrongYear)).toThrow("来源不一致");
    const unknown = structuredClone(x); unknown.revision.input.timePrecision = "unknown_hour";
    expect(() => plainMonthlyPresentation(unknown)).toThrow("来源不一致");
  });
  it("passes only an exact recorded work context and preserves its confirmed situations", async () => {
    for (const work of ["student", "caregiving", "retired"] as const) {
      const note = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: adult.revision.caseId, anchor: { kind: "revision", revisionId: adult.revision.id }, bodyFormat: "markdown",
        body: await buildReadingContextRecord(adult.revision, null, { work, relationship: "unspecified", fromYear: 2029, toYear: 2029, notes: "合成背景" }), tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" });
      const resolved = await resolveReadingContext({ revision: adult.revision, records: [note] });
      const contextual = buildContextualReadingBundle({ ...adult, comprehensive: null, annualDomains: null, context: resolved.latest, referenceYear: 2029 })!;
      const collection = buildMonthlyDomainReadings({ ...adult, contextual }), x = first({ ...adult, collection });
      expect(plainMonthlyPresentation(x)).toBeNull();
      const plain = plainMonthlyPresentation({ ...x, contextual })!;
      expect(plain.displayExamples).toEqual(x.domain.examples); expect(plain.originals.summary).toBe(x.domain.summary);
      const bad = structuredClone(contextual); bad.contextSource.reference.editVersion++;
      expect(() => plainMonthlyPresentation({ ...x, contextual: bad })).toThrow("来源不一致");
    }
  });
  it("retains children's actual domain scenes and binds decade originals to the same branch and interval", () => {
    const x = first(child), plain = plainMonthlyPresentation(x)!;
    expect(plain.displayExamples).toEqual(x.domain.examples); expect(plain.originals.summary).toBe(x.domain.summary);
    for (const source of [adult, child]) {
      const branch = source.story.branches[0]!, stage = branch.stages.find(item => item.decadeId === branch.currentDecadeId)!;
      const original = source.life.decades.find(item => item.id === stage.decadeId)!;
      const before = JSON.stringify({ stage, life: source.life });
      const result = plainLifeStagePresentation(source.story, stage, source.life)!;
      for (const projected of result.domains) {
        expect(projected.originals.summary).toBe(original[projected.domain as "career" | "wealth"].text);
        expect(projected.originals.paragraphs).toEqual(stage.paragraphs);
        expect(projected.scope.targetRef).toEqual(stage.nodeRef);
        expect(projected.scope.interval).toEqual({ startInstant: stage.startInstant, endExclusiveInstant: stage.endExclusiveInstant });
      }
      expect(JSON.stringify({ stage, life: source.life })).toBe(before);
      const wrong = structuredClone(stage); wrong.branchId = "forward";
      if (wrong.branchId === stage.branchId) wrong.branchId = "backward";
      expect(() => plainLifeStagePresentation(source.story, wrong, source.life)).toThrow("来源不一致");
    }
  });
  it("shows the exact annual/month contrast on each handover side and rejects another year or branch", () => {
    const x = first(adult), annualYear = adult.annual.years[0]!, before = JSON.stringify({ x, annualYear });
    const parts = x.reading.branches[0]!.segments;
    const prior = plainMonthlyPresentation({ ...x, annualYear, segment: parts[0]!, domain: parts[0]!.domains[0]! })!;
    const next = plainMonthlyPresentation({ ...x, annualYear, segment: parts[1]!, domain: parts[1]!.domains[0]! })!;
    expect(prior.summary).toContain("全年这一阶段的主线有可推进条件；本月带来的变化仍有阻力");
    expect(next.summary).not.toContain("全年这一阶段的主线有可推进条件");
    expect(prior.originals.summary).toBe(parts[0]!.domains[0]!.summary);
    const wrongYear = structuredClone(annualYear); wrongYear.year++;
    expect(() => plainMonthlyPresentation({ ...x, annualYear: wrongYear })).toThrow("来源不一致");
    const wrongBranch = structuredClone(annualYear); wrongBranch.judgmentSegments[0]!.branchId = "forward";
    expect(() => plainMonthlyPresentation({ ...x, annualYear: wrongBranch })).toThrow("来源不一致");
    expect(plainMonthlyPresentation(x)!.summary).not.toContain("全年这一阶段");
    expect(JSON.stringify({ x, annualYear })).toBe(before);
  });
  it("does not leak a replaced annual conclusion through a monthly summary while preserving the independent month", async () => {
    const x = first(adult), annualYear = adult.annual.years[0]!, subjectId = "annual-2029";
    const sourceVersions = [LOCAL_ANNUAL_OUTLOOK_VERSION];
    const originalConclusion = `${annualYear.year}年 · ${annualYear.label}\n${outlookJudgmentFeedbackText(annualYear.judgment) || annualYear.summary}\n本年自身倾向：${annualYear.yearInfluence.summary}\n大运背景：${annualYear.decadeInfluence.summary}\n年度规则：${LOCAL_ANNUAL_OUTLOOK_VERSION}`;
    const note = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: adult.revision.caseId,
      anchor: { kind: "revision", revisionId: adult.revision.id }, bodyFormat: "markdown",
      body: buildStructuredReadingFeedback(adult.assessment, { subjectId, subjectLabel: "2029年", originalConclusion, sourceVersions, rating: "unverified", actualSituation: "合成年度采用" }),
      tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
    const review = researchNoteRecordSchema.parse({ ...note, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(note, null,
      readingFeedbackSource(adult.assessment, sourceVersions), { state: "revised", notes: "明确采用", revisedConclusion: "个人年度安排以此全文为准。", occurredAt: "" }),
      createdAt: "2026-10-20T00:01:00Z", updatedAt: "2026-10-20T00:01:00Z" });
    const personal = await buildLocalPersonalReading({ revision: adult.revision, assessment: adult.assessment,
      choices: [{ id: subjectId, label: "2029年", originalConclusion, sourceVersions }], records: [note, review] });
    expect(personal.entries[0]!.state).toBe("adopted");
    expect(plainMonthlyPresentation({ ...x, annualYear, personal })!.summary).toBe(plainMonthlyPresentation(x)!.summary);
    expect(personal.entries[0]!.personalText).toBe("个人年度安排以此全文为准。");
  });
  it("distinguishes a new-use year from regular-wealth confirmation in the real 2033 cold-dew month", async () => {
    const { revision, assessment } = adult;
    const [monthly, annual] = await Promise.all([buildLocalMonthlyOutlook(revision, assessment, 2033), buildLocalAnnualOutlookRange(revision, assessment, 2033, 2033)]);
    const collection = buildMonthlyDomainReadings({ revision, assessment, monthly });
    const reading = collection.months.find(item => item.label === "寒露月")!, month = monthly.months.find(item => item.id === reading.monthId)!;
    const segment = reading.branches[0]!.segments[0]!, domain = segment.domains.find(item => item.id === "wealth")!;
    const plain = plainMonthlyPresentation({ revision, collection, reading, month, segment, domain, annualYear: annual.years[0] })!;
    expect(plain.summary).toContain("本年侧重新合作或新用途的机会");
    expect(plain.summary).toContain("须先有相应事项，不能认定新机会已经兑现");
    expect(plain.originals.summary).toBe(domain.summary);
    expect(plain.caption).toContain("本月新增作用及持续牵制");
    const note = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId,
      anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown",
      body: await buildReadingContextRecord(revision, null, { work: "retired", relationship: "unspecified", fromYear: 2033, toYear: 2033, notes: "合成退休背景" }),
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
    const resolved = await resolveReadingContext({ revision, records: [note] });
    const contextual = buildContextualReadingBundle({ revision, assessment, comprehensive: null, annualDomains: null, context: resolved.latest, referenceYear: 2033 })!;
    const retiredCollection = buildMonthlyDomainReadings({ revision, assessment, monthly, contextual });
    const retiredReading = retiredCollection.months.find(item => item.monthId === reading.monthId)!;
    const retiredSegment = retiredReading.branches[0]!.segments[0]!, retiredDomain = retiredSegment.domains.find(item => item.id === "wealth")!;
    const retiredInput = { revision, collection: retiredCollection, reading: retiredReading, month, segment: retiredSegment, domain: retiredDomain, contextual };
    const retired = plainMonthlyPresentation({ ...retiredInput, annualYear: annual.years[0] })!;
    expect(retired.summary).not.toContain("本年侧重新合作或新用途");
    expect(retired.summary).toBe(plainMonthlyPresentation(retiredInput)!.summary);
    expect(retired.displayExamples).toEqual(retiredDomain.examples);
  });
});
