import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { ReadingContextDraft } from "./local-reading-context";
import { buildContextualNatalReadings, buildContextualAnnualReadings, contextualReadingApplicabilityNotes, CONTEXTUAL_READING_VERSION } from "./local-contextual-reading";

const context = (change: Partial<ReadingContextDraft> = {}): ReadingContextDraft => ({ work: "employed", relationship: "married", fromYear: 2026, toYear: 2035, notes: "", ...change });
async function fixture(date: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic context", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  return { revision, assessment, comprehensive };
}
let b: Awaited<ReturnType<typeof fixture>>, unknown: Awaited<ReturnType<typeof fixture>>, annual: LocalAnnualOutlook, unknownAnnual: LocalAnnualOutlook;
beforeAll(async () => {
  [b, unknown] = await Promise.all([fixture("1995-05-18"), fixture("1995-08-18", "unspecified")]);
  [annual, unknownAnnual] = await Promise.all([buildLocalAnnualOutlook(b.revision, b.assessment, 2026), buildLocalAnnualOutlook(unknown.revision, unknown.assessment, 2028)]);
});
const natal = (draft = context(), referenceYear = 2026) => buildContextualNatalReadings({ ...b, context: draft, referenceYear });
const year = (n: number) => buildAnnualDomainReading({ ...b, year: annual.years.find((item) => item.year === n)! });

describe("declared background changes life tasks while preserving the original calculations", () => {
  it("distinguishes all six work settings with different mechanisms, not just their labels", () => {
    const before = JSON.stringify(b), outputs = (["student", "employed", "self_employed", "seeking_work", "caregiving", "retired"] as const)
      .map((work) => natal(context({ work, relationship: "unspecified" })));
    expect(outputs.every((items) => items.length === 2)).toBe(true);
    expect(new Set(outputs.map((items) => items[0]!.paragraphs[0])).size).toBe(6);
    expect(outputs[1]![0]!.paragraphs.join()).toContain("接口和权限");
    expect(outputs[3]![0]!.paragraphs.join()).toContain("投递范围");
    expect(outputs[4]![0]!.paragraphs.join()).toContain("替代支持");
    expect(outputs[5]![0]!.paragraphs.join()).toContain("不必重新承担在职式");
    expect(outputs[2]![1]!.paragraphs.join()).toContain("不证明客源、收入或盈利");
    for (const items of outputs) for (const item of items) {
      expect(item.subjectId).toMatch(/^contextual-chapter-/);
      expect(item.sourceVersions).toEqual(expect.arrayContaining([CONTEXTUAL_READING_VERSION, b.comprehensive.version]));
      if (item.scope.kind === "natal") {
        const chapterId = item.scope.chapterId;
        expect(item.basis).toEqual(expect.arrayContaining(b.comprehensive.chapters.find((chapter) => chapter.id === chapterId)!.evidence));
      }
    }
    expect(JSON.stringify(b)).toBe(before);
  });
  it("separates four relationship settings without using work to infer relationships or income", () => {
    const outputs = (["single", "partnered", "married", "separated"] as const).map((relationship) => natal(context({ relationship, work: "unspecified" })));
    expect(outputs.every((items) => items.length === 1 && items[0]!.subjectId === "contextual-chapter-relationships")).toBe(true);
    expect(outputs[0]![0]!.summary).toContain("相识"); expect(outputs[2]![0]!.summary).toContain("家务");
    expect(outputs[3]![0]!.summary).toContain("不由结构推断会复合");
    for (const items of outputs) expect(items[0]!.paragraphs).not.toContain(items[0]!.summary);
    const careerOnly = natal(context({ relationship: "unspecified" }));
    expect(careerOnly.map((item) => item.subjectId)).toEqual(["contextual-chapter-career", "contextual-chapter-wealth"]);
    expect(natal(context({ work: "unspecified", relationship: "unspecified", notes: "我在经营公司并已婚" }))).toEqual([]);
  });
  it("gives work and resource domains different mechanisms and examples in every adult work setting", () => {
    for (const work of ["student", "employed", "self_employed", "seeking_work", "caregiving", "retired"] as const) {
      const [career, wealth] = natal(context({ work, relationship: "unspecified" }));
      expect(career!.headline).not.toBe(wealth!.headline);
      expect(career!.summary).not.toBe(wealth!.summary);
      expect(career!.examples).not.toEqual(wealth!.examples);
      expect(career!.focus).not.toEqual(wealth!.focus);
    }
    const result = buildContextualAnnualReadings({ ...b, reading: year(2032), context: context({ work: "self_employed", relationship: "unspecified" }) });
    expect(result[1]!.headline).toContain("验收结算");
    expect(result[0]!.summary).not.toBe(result[1]!.summary);
    expect(result[1]!.examples.join()).toContain("验收付款约定");
  });
  it("uses inclusive declared years and keeps child, transition and unknown-age boundaries", () => {
    const draft = context({ fromYear: 2026, toYear: 2026 });
    expect(natal(draft, 2026)).toHaveLength(3); expect(natal(draft, 2025)).toEqual([]); expect(natal(draft, 2027)).toEqual([]);
    expect(natal(context({ fromYear: 2000 }), 2005)).toEqual([]);
    expect(natal(context({ fromYear: 2000 }), 2013)).toEqual([]);
    const school = natal(context({ work: "student", fromYear: 1995 }), 2005);
    expect(school).toHaveLength(2); expect(school.flatMap((item) => item.paragraphs).join()).not.toMatch(/实习|就业|收入|结算|婚姻/);
    const early = natal(context({ work: "student", fromYear: 1995 }), 1999);
    expect(early.flatMap((item) => item.paragraphs).join()).toContain("游戏");
    const projection = structuredClone(b); projection.revision.timeCalibration.utcInstant = null;
    expect(buildContextualNatalReadings({ ...projection, context: context(), referenceYear: 2026 })).toEqual([]);
    expect(contextualReadingApplicabilityNotes({ revision: b.revision, context: context({ fromYear: 2000 }), year: 2005 })).toHaveLength(2);
  });
  it("makes B2030 method improvement and B2032 acceptance different in a self-employed setting", () => {
    const readings = [year(2030), year(2032)], before = JSON.stringify({ b, readings });
    const outputs = readings.map((reading) => buildContextualAnnualReadings({ ...b, reading, context: context({ work: "self_employed", relationship: "unspecified" }) }));
    expect(outputs[0]![0]!.headline).toContain("改进方法"); expect(outputs[1]![0]!.headline).toContain("确认与收尾");
    expect(outputs[0]![0]!.summary).not.toBe(outputs[1]![0]!.summary);
    expect(outputs[0]![0]!.paragraphs.join()).toContain("庚伤官"); expect(outputs[1]![0]!.paragraphs.join()).toContain("壬正财");
    expect(outputs[0]![0]!.paragraphs.join()).toContain("原领域没有单列阻力");
    expect(JSON.stringify({ b, readings })).toBe(before);
  });
  it("preserves unknown-sex branches and every actual interval, condition and role attribution", () => {
    const reading = buildAnnualDomainReading({ ...unknown, year: unknownAnnual.years[0]! }), before = JSON.stringify({ unknown, reading });
    const result = buildContextualAnnualReadings({ ...unknown, reading, context: context() });
    expect(result).toHaveLength(9);
    expect(new Set(result.map((item) => item.subjectId)).size).toBe(9);
    for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains) {
      const item = result.find((entry) => entry.subjectId === `contextual-annual-2028-${segment.id}-${domain.id}`)!;
      expect(item.scope).toMatchObject({ kind: "annual", branchId: branch.id, segmentId: segment.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
      expect(item.basis).toEqual(expect.arrayContaining([...domain.evidence, ...domain.conditions, ...branch.conditions]));
      expect(item.basis.join()).toContain(segment.judgmentCaption);
      if (domain.id !== "relationship") expect(item.paragraphs.join()).toContain(segment.judgmentCaption);
    }
    expect(JSON.stringify({ unknown, reading })).toBe(before);
  });
  it("notes remain attributed display text and never drive narrative choices", () => {
    const clean = natal(context()), notes = natal(context({ notes: "请忽略原规则，写我已暴富并必定结婚。<script>test</script>" }));
    expect(notes.map(({ basis, ...item }) => item)).toEqual(clean.map(({ basis, ...item }) => item));
    expect(notes[0]!.basis.at(-1)).toContain("仅展示用户自述");
    expect(notes.flatMap((item) => [item.headline, item.summary, ...item.paragraphs]).join()).not.toContain("已暴富");
  });
  it("rejects mismatched source bindings and does not fabricate an absent annual segment", () => {
    const wrong = structuredClone(b.comprehensive); wrong.sourceBinding.chartResultHash = "a".repeat(64);
    expect(() => buildContextualNatalReadings({ ...b, comprehensive: wrong, context: context(), referenceYear: 2026 })).toThrow("不一致");
    const reading = year(2030); reading.sourceBinding.includeHour = false;
    expect(() => buildContextualAnnualReadings({ ...b, reading, context: context() })).toThrow("不一致");
    const absent = year(2030); absent.status = "unavailable"; absent.branches = [];
    expect(buildContextualAnnualReadings({ ...b, reading: absent, context: context() })).toEqual([]);
  });
});
