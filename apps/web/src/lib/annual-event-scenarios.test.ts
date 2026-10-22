import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_EVENT_SCENARIOS_VERSION, buildAnnualEventScenarios } from "./annual-event-scenarios";

async function revisionFor(date: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: {label: "Synthetic event scenarios", latitude: null, longitude: null, precision: "unknown"}, sourceNote: "synthetic"}, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z"});
}
let revisions: RevisionRecord[], outlooks: LocalAnnualOutlook[];
beforeAll(async () => {
  revisions = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-03-18"), revisionFor("1993-04-03"), revisionFor("1995-08-18", "unspecified")]);
  outlooks = await Promise.all(revisions.map((revision) => buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2026)));
});

describe("local annual event scenarios", () => {
  it("returns two to four distinct, evidence-backed domains using actual chart/year products", () => {
    expect(ANNUAL_EVENT_SCENARIOS_VERSION).toBe("hakimi.annual-event-scenarios/0.4.0");
    const signatures = new Set<string>();
    revisions.forEach((revision, index) => {
      const preliminary = buildBaziPreliminaryAssessment(revision);
      for (const year of outlooks[index]!.years) {
        const scenarios = buildAnnualEventScenarios(revision, preliminary, year);
        expect(scenarios.length).toBeGreaterThanOrEqual(2);
        expect(scenarios.length).toBeLessThanOrEqual(4);
        expect(new Set(scenarios.map((scenario) => scenario.domain)).size).toBe(scenarios.length);
        signatures.add(scenarios.map((scenario) => scenario.domain + scenario.title).join());
        for (const scenario of scenarios) {
          expect(scenario.examples.length).toBeGreaterThanOrEqual(2);
          expect(scenario.evidence[0]).toContain("触发规则");
          expect(scenario.evidence.some((text) => text.includes(year.yearGanZhi!))).toBe(true);
          expect(scenario.conditions[0]).toContain("不表示已经发生");
          expect(scenario.summary).not.toMatch(/[?？]/);
        }
      }
    });
    expect(signatures.size).toBeGreaterThan(10);
    const demo = buildBaziPreliminaryAssessment(revisions[0]!);
    expect(buildAnnualEventScenarios(revisions[0]!, demo, outlooks[0]!.years[0]!)[0]!.title).toContain("成果要求遇到规则约束");
    expect(buildAnnualEventScenarios(revisions[0]!, demo, outlooks[0]!.years[0]!)[0]!.summary).not.toContain(outlooks[0]!.years[0]!.judgment!.summary);
  });

  it("only produces relationship scenarios when the current year actually interacts with the natal day pillar", () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision);
    for (const year of outlooks[0]!.years) {
      const actual = calculatePillarRelations({year: year.yearGanZhi!, month: revision.facts.pillars.day.ganZhi,
        day: year.yearGanZhi!, hour: revision.facts.pillars.day.ganZhi}).facts.filter((fact) => fact.completeness === "binary"
        && ["stem_five_combination", "stem_clash", "branch_six_combination", "branch_six_clash"].includes(fact.relationType)
        && fact.participants.length === 2 && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"));
      const relationship = buildAnnualEventScenarios(revision, preliminary, year).find((scenario) => scenario.domain === "relationship");
      expect(Boolean(relationship)).toBe(actual.length > 0);
      if (relationship) expect(relationship.evidence.some((text) => text.includes("本命日柱辛巳"))).toBe(true);
    }
    expect(buildAnnualEventScenarios(revision, preliminary, outlooks[0]!.years[1]!).some((scenario) => scenario.domain === "relationship")).toBe(false);
  });

  it("uses actual within-year handovers, and does not mistake two unknown-sex routes for a handover", () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision);
    const year = outlooks[0]!.years.find((item) => item.year === 2028)!;
    const transition = buildAnnualEventScenarios(revision, preliminary, year).find((scenario) => scenario.id.includes("dayun-handover"))!;
    expect(transition).toBeDefined();
    expect(transition.conditions.some((text) => text.includes("2028-12-21（UTC+08）"))).toBe(true);
    for (const segment of year.dayunSegments) expect(transition.evidence.some((text) => text.includes(segment.nodeRef.nodeId))).toBe(true);
    const unspecified = revisions[3]!, conditional = buildBaziPreliminaryAssessment(unspecified);
    const conditionalYear = outlooks[3]!.years[0]!;
    expect(conditionalYear.dayunSegments).toHaveLength(2);
    const scenarios = buildAnnualEventScenarios(unspecified, conditional, conditionalYear);
    expect(scenarios.some((scenario) => scenario.id.includes("dayun-handover"))).toBe(false);
    expect(scenarios[0]!.evidence.some((text) => text.startsWith("若按顺行"))).toBe(true);
    expect(scenarios[0]!.evidence.some((text) => text.startsWith("若按逆行"))).toBe(true);
  });

  it("returns no personal events for years wholly before birth or without an annual node", async () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision);
    const historical = await buildLocalAnnualOutlook(revision, preliminary, 1990);
    expect(historical.years[0]!.transitNodeRef).not.toBeNull();
    expect(buildAnnualEventScenarios(revision, preliminary, historical.years[0]!)).toEqual([]);
    expect(buildAnnualEventScenarios(revision, preliminary, {...outlooks[0]!.years[0]!, transitNodeRef: null})).toEqual([]);
  });

  it("rejects mixed source bindings, mismatched node refs and malformed decade intervals", () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision), year = outlooks[0]!.years[0]!;
    expect(() => buildAnnualEventScenarios(revision, buildBaziPreliminaryAssessment(revisions[1]!), year)).toThrow("源盘");
    const mismatchedHour = structuredClone(preliminary); mismatchedHour.sourceBinding.includeHour = false;
    expect(() => buildAnnualEventScenarios(revision, mismatchedHour, year)).toThrow("时柱范围");
    const mismatchedYear = structuredClone(year); mismatchedYear.transitNodeRef!.chartResultHash = "a".repeat(64);
    expect(() => buildAnnualEventScenarios(revision, preliminary, mismatchedYear)).toThrow("流年引用");
    const mismatchedDecade = structuredClone(year); mismatchedDecade.dayunSegments[0]!.nodeRef.revisionId = "33333333-3333-4333-8333-333333333333";
    expect(() => buildAnnualEventScenarios(revision, preliminary, mismatchedDecade)).toThrow("大运分段引用");
    const brokenInterval = structuredClone(year); brokenInterval.dayunSegments[0]!.endExclusiveInstant = year.startInstant!;
    expect(() => buildAnnualEventScenarios(revision, preliminary, brokenInterval)).toThrow("大运分段区间");
    expect(() => buildAnnualEventScenarios(revision, preliminary, {...year, yearGanZhi: "甲子"})).toThrow("流年干支");
    const wrongJudgment = structuredClone(year); wrongJudgment.judgment!.sourceBinding.chartResultHash = "b".repeat(64);
    expect(() => buildAnnualEventScenarios(revision, preliminary, wrongJudgment)).toThrow("综合判断源盘");
    const wrongSegment = structuredClone(year); wrongSegment.judgmentSegments[0]!.judgment.sourceBinding.includeHour = false;
    expect(() => buildAnnualEventScenarios(revision, preliminary, wrongSegment)).toThrow("时柱范围");
    const wrongBackground = structuredClone(year); wrongBackground.judgment!.backgroundRefs[0]!.nodeId = "not-the-background";
    expect(() => buildAnnualEventScenarios(revision, preliminary, wrongBackground)).toThrow();
  });

  it("does not consume an unknown cached hour or mutate its chart, preliminary assessment, or annual product", () => {
    const revision = structuredClone(revisions[0]!);
    revision.input = {...revision.input, time: null, timePrecision: "unknown_hour"};
    const preliminary = buildBaziPreliminaryAssessment(revision), knownHourYear = outlooks[0]!.years[0]!;
    expect(() => buildAnnualEventScenarios(revision, preliminary, knownHourYear)).toThrow("时柱范围");
    // Projection-only legacy compatibility fixture. A fresh unknown-hour chart is
    // handled upstream; do not reuse a judgment that consumed the cached hour.
    const year = {...knownHourYear, judgment: null, ownJudgment: null, judgmentSegments: []};
    const before = JSON.stringify({revision, preliminary, year});
    const scenarios = buildAnnualEventScenarios(revision, preliminary, year);
    expect(JSON.stringify({revision, preliminary, year})).toBe(before);
    const other = structuredClone(revision); other.facts.pillars.hour = structuredClone(revisions[1]!.facts.pillars.hour);
    expect(buildAnnualEventScenarios(other, buildBaziPreliminaryAssessment(other), year)).toEqual(scenarios);
    expect(JSON.stringify(scenarios)).not.toContain("本命时柱");
  });

  it("the same incoming wealth god produces different concrete scenarios for a supported peer-flow and an overburdened hurting-wealth chart", async () => {
    const weak = await revisionFor("1995-11-16"), strong = revisions[0]!;
    const [a, b] = await Promise.all([strong, weak].map((revision) => buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2025)));
    const first = a!.years[0]!, second = b!.years[0]!;
    expect(first.yearGanZhi).toBe("乙巳"); expect(second.yearGanZhi).toBe("乙巳");
    expect(first.judgment!.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("assists");
    expect(second.judgment!.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("obstructs");
    const good = buildAnnualEventScenarios(strong, buildBaziPreliminaryAssessment(strong), first);
    const pressure = buildAnnualEventScenarios(weak, buildBaziPreliminaryAssessment(weak), second);
    expect(good[0]!.summary).toContain("成果"); expect(pressure[0]!.summary).toContain("新需求与已有任务同时占用精力");
    for (const domain of ["career", "wealth"] as const) {
      expect(good.find((item) => item.domain === domain)!.examples).not.toEqual(pressure.find((item) => item.domain === domain)!.examples);
      expect(good.find((item) => item.domain === domain)!.title).not.toBe(pressure.find((item) => item.domain === domain)!.title);
    }
    expect(good[0]!.evidence.join()).toContain("peer-output-wealth");
    expect(pressure[0]!.evidence.join()).toContain("hurting-wealth");
    expect(good[0]!.summary).not.toContain(first.judgment!.summary);
    expect(pressure[0]!.summary).not.toContain(second.judgment!.summary);
  });

  it("relationship scenarios use the actual day interaction and natal concerns, not the annual fortune label", async () => {
    const other = await revisionFor("1995-11-16"), preliminary = buildBaziPreliminaryAssessment(other);
    const otherYear = (await buildLocalAnnualOutlook(other, preliminary, 2026)).years[0]!;
    const resources = buildAnnualEventScenarios(revisions[0]!, buildBaziPreliminaryAssessment(revisions[0]!), outlooks[0]!.years[0]!).find((scenario) => scenario.domain === "relationship")!;
    const responsibility = buildAnnualEventScenarios(other, preliminary, otherYear).find((scenario) => scenario.domain === "relationship")!;
    expect(resources.summary).toContain("共同计划与资源安排");
    expect(responsibility.summary).toContain("责任、承诺与各自角色");
    expect(resources.examples).not.toEqual(responsibility.examples);
    expect(resources.summary).not.toContain("有压力"); expect(responsibility.summary).not.toContain("有压力");
    expect(resources.conditions.join()).toContain("未据此推断婚恋");
  });

  it("actual childhood and adulthood intervals of the same chart select age-appropriate scenarios without altering the chart", async () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision), before = JSON.stringify({ revision, preliminary });
    const childhood = (await buildLocalAnnualOutlook(revision, preliminary, 2005)).years[0]!;
    const adult = (await buildLocalAnnualOutlook(revision, preliminary, 2025)).years[0]!;
    const young = buildAnnualEventScenarios(revision, preliminary, childhood), grown = buildAnnualEventScenarios(revision, preliminary, adult);
    expect(young[0]!.conditions.join()).toContain("9—10周岁"); expect(grown[0]!.conditions.join()).toContain("29—30周岁");
    expect(young[0]!.examples).not.toEqual(grown[0]!.examples);
    const childCopy = young.map((item) => [item.title, item.summary, ...item.examples].join()).join();
    expect(childCopy).not.toMatch(/岗位|客户|回款|薪酬|结算|续约|投资|婚恋|夫妻/);
    expect(childCopy).toMatch(/学习|同伴|家庭/);
    expect(young.flatMap((item) => item.conditions).join()).not.toContain("资源与收入情境仍需对应现实工作或合作");
    expect(JSON.stringify({ revision, preliminary })).toBe(before);
  });

  it("birth-year and eighteen-year boundary cases retain exact applicability and do not assume employment", async () => {
    const revision = revisions[0]!, preliminary = buildBaziPreliminaryAssessment(revision);
    const [birth, transition] = await Promise.all([1995, 2013].map((year) => buildLocalAnnualOutlook(revision, preliminary, year)));
    const infant = buildAnnualEventScenarios(revision, preliminary, birth!.years[0]!);
    expect(infant[0]!.conditions.join()).toContain("出生之后");
    expect(infant[0]!.conditions.join()).toContain("0周岁");
    expect(infant.map((item) => item.examples.join()).join()).not.toMatch(/考试|岗位|收入|客户|项目/);
    const turningEighteen = buildAnnualEventScenarios(revision, preliminary, transition!.years[0]!);
    expect(turningEighteen[0]!.conditions.join()).toContain("17—18周岁");
    expect(turningEighteen[0]!.conditions.join()).toContain("不推断实际入学、就业");
    expect(turningEighteen.map((item) => item.examples.join()).join()).not.toMatch(/岗位|结算|续约/);
  });

  it("actual neutral or unresolved structures describe themes instead of inventing pressure", async () => {
    const print = await revisionFor("1995-05-18"), printAssessment = buildBaziPreliminaryAssessment(print);
    const cases = [
      { revision: revisions[1]!, year: outlooks[1]!.years.find((item) => item.year === 2028)!, effect: "neutral" },
      { revision: print, year: (await buildLocalAnnualOutlook(print, printAssessment, 2024)).years[0]!, effect: "neutral" },
      { revision: revisions[2]!, year: outlooks[2]!.years[0]!, effect: "unresolved" }
    ];
    for (const { revision, year, effect } of cases) {
      expect(year.judgment!.axes.filter((axis) => axis.axis === "pattern").every((axis) => axis.effect === effect)).toBe(true);
      const career = buildAnnualEventScenarios(revision, buildBaziPreliminaryAssessment(revision), year).find((item) => item.domain === "career")!;
      expect(career.summary).not.toMatch(/要求先到|支持.*随后|尚有牵制|准备已经不少|仍需重整/);
      expect(career.examples.join()).not.toMatch(/尚未完全同步|出现拉扯|需要重做/);
      expect(career.evidence.join()).toContain(`作用 ${effect}`);
    }
  });

  it("an unavailable birth instant uses age-neutral language instead of assuming childhood", () => {
    // Legacy calibration boundary, not a fresh successful chart calculation.
    const revision = structuredClone(revisions[0]!); revision.timeCalibration.utcInstant = null;
    const scenarios = buildAnnualEventScenarios(revision, buildBaziPreliminaryAssessment(revision), outlooks[0]!.years[0]!);
    expect(scenarios[0]!.conditions.join()).toContain("年龄未可靠换算");
    const copy = scenarios.map((item) => [item.title, item.summary, ...item.examples].join()).join();
    expect(copy).not.toMatch(/孩子|儿童|照料者|家人提供|家庭提供|亲子|老师/);
    expect(copy).not.toMatch(/岗位|客户|收入/);
    expect(scenarios.flatMap((item) => item.conditions).join()).not.toContain("资源与收入情境仍需对应现实工作或合作");
  });
});
