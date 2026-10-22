import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook, type LocalAnnualYear } from "./local-annual-outlook";
import { buildAnnualDomainReading, type AnnualReadingDomainId } from "./local-annual-domain-reading";

async function revisionFor(date: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic annual domains", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let xin: RevisionRecord, resource: RevisionRecord, unknownSex: RevisionRecord;
let a: LocalAnnualOutlook, b: LocalAnnualOutlook, u: LocalAnnualOutlook, child: LocalAnnualOutlook, early: LocalAnnualOutlook;
beforeAll(async () => {
  [xin, resource, unknownSex] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "unspecified")]);
  [a, b, u, child, early] = await Promise.all([
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 2026), buildLocalAnnualOutlook(resource, buildBaziPreliminaryAssessment(resource), 2026),
    buildLocalAnnualOutlook(unknownSex, buildBaziPreliminaryAssessment(unknownSex), 2028), buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 2005),
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 1990)
  ]);
});
const year = (outlook: LocalAnnualOutlook, n: number) => outlook.years.find((item) => item.year === n)!;
const read = (revision: RevisionRecord, annualYear: LocalAnnualYear) => buildAnnualDomainReading({ revision, assessment: buildBaziPreliminaryAssessment(revision), year: annualYear });
const domain = (revision: RevisionRecord, annualYear: LocalAnnualYear, id: AnnualReadingDomainId) => read(revision, annualYear).branches[0]!.segments[0]!.domains.find((item) => item.id === id)!;

describe("annual domain reading from actual local branch and actor facts", () => {
  it("binds all three domains to their original segment and keeps all input judgments unchanged", () => {
    const original = year(a, 2031), assessment = buildBaziPreliminaryAssessment(xin), before = structuredClone({ xin, assessment, original });
    const result = buildAnnualDomainReading({ revision: xin, assessment, year: original });
    expect({ xin, assessment, original }).toEqual(before);
    expect(result.sourceBinding).toEqual({ revisionId: xin.id, chartResultHash: xin.manifest.resultHash, includeHour: true });
    expect(result.yearNodeRef).toEqual(original.transitNodeRef);
    expect(result.branches[0]!.segments[0]!.domains.map((item) => item.id)).toEqual(["career", "wealth", "relationship"]);
    expect(result.branches[0]!.segments[0]!.id).toBe(original.judgmentSegments[0]!.id);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([assessment.version, a.version, original.judgment!.version, original.judgment!.policyVersion]));
  });

  it("A2032 and A2033 keep different output forms and the hidden-print pressure rather than a shared mixed template", () => {
    const x = domain(xin, year(a, 2032), "career"), y = domain(xin, year(a, 2033), "career");
    expect(x.headline).toContain("提案"); expect(y.headline).toContain("稳定交付");
    expect(x.examples).not.toEqual(y.examples);
    expect(y.evidence.join()).toMatch(/支本气己偏印.*增加牵制/);
    expect(x.evidence.join()).toContain("支本气癸食神");
    expect(y.obstacles.join()).toContain("准备环节或额外要求挤入");
  });

  it("B2028 attributes support to hidden Geng, not the exposed Wu, and keeps B2029's actual handover", () => {
    const x = domain(resource, year(b, 2028), "career");
    expect(x.summary).toContain("支持另来自庚伤官的支内承接");
    expect(x.summary).not.toContain("透干戊已有对应的结构支持");
    expect(x.evidence.join()).toMatch(/透戊劫财.*未单独定向/);
    const y = read(resource, year(b, 2029));
    expect(y.branches[0]!.segments).toHaveLength(2);
    expect(y.branches[0]!.segments[0]!.endExclusiveInstant).toBe(y.branches[0]!.segments[1]!.startInstant);
    expect(y.branches[0]!.segments[1]!.backgroundRefs).toEqual(year(b, 2029).judgmentSegments[1]!.judgment.backgroundRefs);
  });

  it("B2030 output and B2032 wealth have different career and resource conclusions despite the same overall direction", () => {
    expect(year(b, 2030).judgment!.label).toBe(year(b, 2032).judgment!.label);
    for (const id of ["career", "wealth"] as const) {
      const output = domain(resource, year(b, 2030), id), wealth = domain(resource, year(b, 2032), id);
      expect(output.headline).not.toBe(wealth.headline); expect(output.examples).not.toEqual(wealth.examples);
      expect(output.summary).toContain("庚伤官"); expect(wealth.summary).toContain("壬正财");
    }
  });

  it("month-branch interaction affects work context without being promoted to a day-branch relationship event", () => {
    const work = domain(resource, year(b, 2031), "career"), relations = domain(resource, year(b, 2031), "relationship");
    expect(work.evidence.join()).toContain("本命月柱辛巳有地支六冲");
    expect(work.paragraphs.join()).toContain("排期、任务接口");
    expect(relations.summary).not.toContain("与本命日支有冲");
    expect(relations.paragraphs.join()).toContain("外部学习或工作安排");
  });

  it("A2031 day-branch clash and A2035 day-stem clash keep different relationship scopes", () => {
    const branch = domain(xin, year(a, 2031), "relationship"), stem = domain(xin, year(a, 2035), "relationship");
    expect(branch.summary).toContain("与本命日支有冲");
    expect(stem.summary).toContain("触及本命日干"); expect(stem.summary).not.toContain("与本命日支有冲");
    expect(stem.paragraphs.join()).toContain("不能直接当作亲密关系或婚姻状态变化");
  });

  it("unknown sex remains two parallel branches, with each segment's own rescue and exact background", () => {
    const original = year(u, 2028), result = read(unknownSex, original);
    expect(result.status).toBe("ready"); expect(result.branches.map((item) => item.id)).toEqual(["forward", "backward"]);
    expect(result.branches.map((item) => item.segments.length)).toEqual([1, 2]);
    for (const branch of result.branches) for (const segment of branch.segments) {
      const source = original.judgmentSegments.find((item) => item.id === segment.id)!;
      expect(segment.startInstant).toBe(source.startInstant); expect(segment.endExclusiveInstant).toBe(source.endExclusiveInstant);
      expect(segment.backgroundRefs).toEqual(source.judgment.backgroundRefs);
      for (const rescue of source.judgment.axes.find((axis) => axis.axis === "pattern")!.rescues) {
        expect(segment.domains[0]!.evidence).toContain(rescue);
        expect(segment.domains[0]!.conditions).toContain(rescue);
      }
    }
    expect(result.branches[0]!.segments[0]!.judgmentCaption).toContain("利弊并见");
    expect(result.branches[1]!.segments.every((segment) => segment.judgmentCaption.includes("有压力"))).toBe(true);
  });

  it("first-luck gap and real child/transition ages do not become adult work and income claims", () => {
    const first = read(xin, year(early, 1998));
    expect(first.status).toBe("partial"); expect(first.branches[0]!.segments[0]!.backgroundRefs).toEqual([]);
    expect(first.branches[0]!.segments[0]!.endExclusiveInstant).toBe("1998-12-20T20:58:00.000Z");
    for (const n of [2005, 2013]) {
      const result = read(xin, year(child, n));
      const text = result.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.domains.flatMap((item) => [item.headline, ...item.examples]))).join();
      expect(text).not.toMatch(/岗位|项目回款|本人收入|结算|婚姻/);
    }
    expect(read(xin, year(child, 2013)).branches[0]!.segments[0]!.ageStage).toBe("adult_transition");
  });

  it("unknown age uses neutral scenarios rather than defaulting to a child's carers", () => {
    // Compatibility projection boundary: no new unknown-time natal calculation.
    const unknownAge = structuredClone(xin); unknownAge.timeCalibration.utcInstant = null;
    const result = read(unknownAge, year(a, 2031));
    expect(result.branches[0]!.segments[0]!.ageStage).toBe("unknown");
    const text = result.branches[0]!.segments[0]!.domains.flatMap((item) => [...item.paragraphs, ...item.examples]).join();
    expect(text).not.toMatch(/孩子|照料者|照料、家人/);
  });

  it("before-birth years have no personal domains and altered bindings or policies fail closed", () => {
    const unavailable = read(xin, year(early, 1990)); expect(unavailable.status).toBe("before_birth"); expect(unavailable.branches).toEqual([]);
    const wrong = buildBaziPreliminaryAssessment(xin); wrong.sourceBinding.includeHour = false;
    expect(() => buildAnnualDomainReading({ revision: xin, assessment: wrong, year: year(a, 2031) })).toThrow("不匹配");
    const altered = structuredClone(year(a, 2031)); Object.assign(altered.judgmentSegments[0]!.judgment, { policyVersion: "hakimi.outlook-model/9.9.9" });
    expect(() => read(xin, altered)).toThrow("判断版本");
  });

  it("keeps a short three-topic overview and explains preparation, delivery and realization in life language", () => {
    const result = read(resource, year(b, 2026));
    expect(result.summary.length).toBeLessThan(220);
    for (const branch of result.branches) for (const segment of branch.segments) for (const item of segment.domains) expect(result.summary).not.toContain(item.summary);
    const prep = domain(resource, year(b, 2026), "career");
    expect(prep.paragraphs[0]).toContain("应用和交付时间");
    const proposal = domain(resource, year(b, 2030), "career");
    const accepted = domain(resource, year(b, 2032), "wealth");
    expect(proposal.paragraphs[0]).toContain("方案要被采用");
    expect(accepted.paragraphs[0]).toContain("验收、结算与持续支出");
    expect([prep, proposal, accepted].flatMap(item=>[...item.paragraphs,...item.opportunities,...item.obstacles]).join()).not.toMatch(/上方逐项列明|尚未仅凭透干|本段已识别的作用对象/);
  });
});
