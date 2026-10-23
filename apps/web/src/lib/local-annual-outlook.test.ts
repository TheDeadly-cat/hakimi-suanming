import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import {
  strengthElementRelation, type FiveElement
} from "@hakimi/bazi-interpretation";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";

async function revisionFor(sex: "male" | "female" | "unspecified", date = "1995-08-18") {
  const chart = await calculateChart({
    schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic annual fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: ""
  }, withDayBoundary("zi_start_23"));
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z" });
}

// Legacy display assumptions deliberately alter only the outer raw projection.
// The independently validated structural working result must not follow them.
function withAssumption(revision: RevisionRecord, direction: "support" | "drain" | "balanced") {
  const assessment = buildBaziPreliminaryAssessment(revision);
  const elements: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
  const support = elements.filter((element) => ["same_element", "generates_day_master"]
    .includes(strengthElementRelation(assessment.balance.dayMasterElement, element)));
  const demand = elements.filter((element) => !support.includes(element));
  assessment.balance.direction = direction;
  assessment.balance.baselineDirection = direction;
  assessment.balance.baselineFavorableElements = direction === "balanced" ? [] : direction === "support" ? support : demand;
  assessment.balance.baselineUnfavorableElements = direction === "balanced" ? [] : direction === "support" ? demand : support;
  assessment.balance.favorableElements = [...assessment.balance.baselineFavorableElements];
  assessment.balance.unfavorableElements = [...assessment.balance.baselineUnfavorableElements];
  return assessment;
}

let male: RevisionRecord, female: RevisionRecord, unknown: RevisionRecord;
let support: BaziPreliminaryAssessment, drain: BaziPreliminaryAssessment;
let maleSupport: LocalAnnualOutlook, maleDrain: LocalAnnualOutlook, femaleSupport: LocalAnnualOutlook;
beforeAll(async () => {
  [male, female, unknown] = await Promise.all([revisionFor("male"), revisionFor("female"), revisionFor("unspecified")]);
  support = withAssumption(male, "support"); drain = withAssumption(male, "drain");
  [maleSupport, maleDrain, femaleSupport] = await Promise.all([
    buildLocalAnnualOutlook(male, support, 2026), buildLocalAnnualOutlook(male, drain, 2026),
    buildLocalAnnualOutlook(female, withAssumption(female, "support"), 2026)
  ]);
}, 30_000);

describe("local annual outlook with actual transit facts", () => {
  it("reuses exact Lichun year boundaries and returns ten distinct years with a usable transit reference", async () => {
    expect(maleSupport.years.map((year) => year.year)).toEqual(Array.from({ length: 10 }, (_, i) => 2026 + i));
    const year = maleSupport.years[0]!;
    expect(year.yearGanZhi).toBe("丙午");
    expect(year.startInstant).not.toBe("2026-01-01T00:00:00.000Z");
    const before = await calculateTransitSnapshot({ revision: male, atInstant: new Date(Date.parse(year.startInstant!) - 1).toISOString() });
    const exact = await calculateTransitSnapshot({ revision: male, atInstant: year.startInstant! });
    expect(before.slots.year.status === "resolved" && before.slots.year.node.ganZhi).toBe("乙巳");
    expect(exact.slots.year.status).toBe("resolved");
    if (exact.slots.year.status !== "resolved") throw new Error("expected real year");
    expect(year.transitNodeRef).toEqual(exact.slots.year.node.ref);
    expect(year.endExclusiveInstant).toBe(exact.slots.year.node.endExclusiveInstant);
    expect(year.evidence.some((text) => text.includes("立春"))).toBe(true);
  });

  it("actually includes the sex/year-yinyang dayun: the same fire year can differ by its decade background", async () => {
    const m = maleSupport.years[0]!, f = femaleSupport.years[0]!;
    expect(m.dayunGanZhi).toBe("辛巳");
    expect(f.dayunGanZhi).toBe("丁亥");
    expect(m.yearGanZhi).toBe(f.yearGanZhi);
    // The actual raw support scenarios still expose the original contrast;
    // they no longer replace the independently selected working direction.
    expect(m.scenarioBranches.find((item) => item.id.includes(":raw-") && item.balanceDirection === "support")!.direction).toBe("利弊并见");
    expect(f.scenarioBranches.find((item) => item.id.includes(":raw-") && item.balanceDirection === "support")!.direction).toBe("有压力");
    expect(m.scenarioBranches.find((item) => item.id.endsWith(":working"))!.balanceDirection).toBe(getWorkingBalance(support).direction);
    expect(m.label).toBe(m.judgment!.label); expect(f.label).toBe(f.judgment!.label);
    expect(m.judgment!.backgroundRefs).not.toEqual(f.judgment!.backgroundRefs);
    expect(m.dayunStatus).toBe("resolved");
    expect(f.dayunStatus).toBe("resolved");
    for (const [revision, result] of [[male, m], [female, f]] as const) {
      const snapshot = await calculateTransitSnapshot({ revision, atInstant: result.atInstant });
      expect(result.dayunSegments[0]!.nodeRef).toEqual(snapshot.slots.dayun.status === "resolved" ? snapshot.slots.dayun.node.ref : null);
      expect(result.evidence.some((text) => text.includes(`大运${result.dayunGanZhi}`))).toBe(true);
    }
    // The opposite year-stem polarity must also keep the core's actual route.
    const yangMale = await revisionFor("male", "1994-08-18");
    const yangFemale = await revisionFor("female", "1994-08-18");
    const results = await Promise.all([yangMale, yangFemale].map((revision) => buildLocalAnnualOutlook(revision, withAssumption(revision, "support"), 2026)));
    expect(results[0]!.years[0]!.dayunGanZhi).not.toBe(results[1]!.years[0]!.dayunGanZhi);
  }, 30_000);

  it("shows exact within-year dayun handover segments instead of assigning the July decade to the whole year", () => {
    const handover = maleSupport.years.find((year) => year.dayunSegments.length > 1)!;
    expect(handover).toBeDefined();
    const [first, second] = handover.dayunSegments;
    expect(first!.startInstant).toBe(handover.startInstant);
    expect(first!.endExclusiveInstant).toBe(second!.startInstant);
    expect(second!.endExclusiveInstant).toBe(handover.endExclusiveInstant);
    expect(first!.ganZhi).not.toBe(second!.ganZhi);
    expect(handover.themes.find((theme) => theme.id === "change")!.text).toContain("交运");
    expect(handover.summary).toContain(first!.ganZhi);
    expect(handover.summary).toContain(second!.ganZhi);
    expect(second!.startInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(handover.summary).toContain("2028-12-21（UTC+08）起");
    expect(handover.judgmentSegments).toHaveLength(2);
    expect(handover.judgment!.summary).toContain("辛巳大运");
    expect(handover.judgment!.summary).toContain("庚辰大运");
    expect(handover.judgment!.summary).not.toContain("dayun");
    for (const [index, segment] of handover.judgmentSegments.entries()) {
      expect(segment.judgment.targetRef).toEqual(handover.transitNodeRef);
      expect(segment.judgment.backgroundRefs).toEqual([handover.dayunSegments[index]!.nodeRef]);
      expect(segment.judgment.interval).toEqual({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
    }
  });

  it("uses balance independently of seasonal preferences and derives concrete ten-god/relation themes", async () => {
    expect(support.balance.baselineDirection).not.toBe(drain.balance.baselineDirection);
    expect(getWorkingBalance(support)).toEqual(getWorkingBalance(drain));
    expect(maleSupport.years.map((year) => year.judgment)).toEqual(maleDrain.years.map((year) => year.judgment));
    const changedSeasonal = structuredClone(support);
    changedSeasonal.seasonal.preferredElements = ["fire"];
    changedSeasonal.seasonal.preferredStems = ["丙", "丁"];
    changedSeasonal.seasonal.balanceConflict = true;
    const changed = await buildLocalAnnualOutlook(male, changedSeasonal, 2026);
    expect(changed.years.map((year) => year.yearInfluence)).toEqual(maleSupport.years.map((year) => year.yearInfluence));
    expect(changed.years.map((year) => year.decadeInfluence)).toEqual(maleSupport.years.map((year) => year.decadeInfluence));
    expect(changed.years.map((year) => year.ownJudgment!.axes.find((axis) => axis.axis === "balance"))).toEqual(maleSupport.years.map((year) => year.ownJudgment!.axes.find((axis) => axis.axis === "balance")));
    expect(changed.years[1]!.ownJudgment!.axes.find((axis) => axis.axis === "seasonal")).not.toEqual(maleSupport.years[1]!.ownJudgment!.axes.find((axis) => axis.axis === "seasonal"));
    expect(maleSupport.years.every((year) => year.themes.map((theme) => theme.id).join() === "career,relationship,change")).toBe(true);
    expect(maleSupport.years.some((year) => year.themes.some((theme) => theme.evidence.some((text) => /地支六冲|地支六合|天干五合|天干冲/.test(text))))).toBe(true);
    expect(maleSupport.years[0]!.themes[0]!.evidence.some((text) => text.includes("十神"))).toBe(true);
  });

  it("distinguishes whole ten-god names: Shangguan is output and Jie-cai is peer cooperation", () => {
    expect(maleSupport.years.find((year) => year.year === 2030)!.themes[0]!.text).toContain("合作分工与资源边界");
    expect(maleSupport.years.find((year) => year.year === 2032)!.themes[0]!.text).toContain("表达提案与方法调整");
    expect(maleSupport.years.filter((year) => year.summary.includes("（")).every((year) =>
      Array.from(year.summary).filter((char) => char === "（").length === Array.from(year.summary).filter((char) => char === "）").length)).toBe(true);
  });

  it("a sensitive assessment keeps a definite baseline answer and exposes the alternate result", async () => {
    const sensitive = structuredClone(support);
    sensitive.balance.direction = "conditional";
    sensitive.balance.favorableElements = [];
    sensitive.balance.unfavorableElements = [];
    sensitive.balance.scenarioDirections = [support, drain].map((assessment, index) => ({
      ...assessment.balance.scenarioDirections[0]!, id: `test-assumption-${index}`, label: index === 0 ? "生扶假设" : "泄耗假设",
      direction: assessment.balance.baselineDirection,
      favorableElements: assessment.balance.baselineFavorableElements,
      unfavorableElements: assessment.balance.baselineUnfavorableElements
    }));
    const result = await buildLocalAnnualOutlook(male, sensitive, 2026);
    expect(result.years.map((year) => year.label)).toEqual(maleSupport.years.map((year) => year.label));
    expect(result.years.every((year) => year.evidence.some((text) => text.startsWith("当前扶抑说明：")))).toBe(true);
    expect(result.years.every((year) => year.judgment!.axes.some((axis) => axis.axis === "balance" && axis.unresolvedConditions.length === 0 && axis.evidence.some((text) => text.startsWith("原计权对照："))))).toBe(true);
    expect(result.years.every((year) => year.scenarioBranches.filter((scenario) => scenario.id.includes(":raw-")).every((scenario) => scenario.label.includes("原计权对照")))).toBe(true);
    expect(result.years.some((year) => new Set(year.scenarioBranches.map((scenario) => scenario.direction)).size > 1)).toBe(true);
    expect(result.years[0]!.conditions.length).toBeGreaterThan(0);
  });

  it("unknown sex gives both explicit direction conditions rather than silently choosing a decade", async () => {
    const result = await buildLocalAnnualOutlook(unknown, withAssumption(unknown, "support"), 2026);
    const year = result.years[0]!;
    expect(year.label).toBe("条件性");
    expect(new Set(year.dayunSegments.map((segment) => segment.direction))).toEqual(new Set(["forward", "backward"]));
    expect(year.scenarioBranches.some((scenario) => scenario.label.includes("顺行"))).toBe(true);
    expect(year.scenarioBranches.some((scenario) => scenario.label.includes("逆行"))).toBe(true);
    expect(year.scenarioBranches.filter((scenario) => scenario.id.endsWith(":working"))).toHaveLength(2);
    expect(new Set(year.scenarioBranches.filter((scenario) => scenario.balanceDirection === "support").map((scenario) => scenario.direction)).size).toBe(2);
    expect(year.themes).toHaveLength(3);
    expect(year.yearInfluence.direction).toBe("主题解读");
    expect(year.decadeInfluence.direction).toBe("主题解读");
    expect(year.decadeInfluence.summary).toContain("若按顺行");
    expect(year.decadeInfluence.summary).toContain("若按逆行");
    expect(year.summary).toContain(year.primaryTheme.text);
  });

  it("an actual balanced chart gives differentiated themes without turning unclassified balance into stable fortune", async () => {
    const assessment = buildBaziPreliminaryAssessment(male);
    expect(assessment.balance.baselineDirection).toBe("balanced");
    expect(assessment.balance.baselineFavorableElements).toEqual([]);
    const result = await buildLocalAnnualOutlook(male, assessment, 2026);
    expect(result.version).toBe("hakimi.local-annual-outlook/0.9.0");
    expect(new Set(result.years.map((year) => year.label)).size).toBeGreaterThan(1);
    expect(result.years[0]!.label).toBe("有压力");
    expect(result.years.every((year) => year.label === year.judgment!.label && year.judgment!.primaryAxis === "pattern")).toBe(true);
    expect(result.years.every((year) => year.summary.includes(`${year.yearGanZhi}年`))).toBe(true);
    expect(result.years.every((year) => year.yearInfluence.direction === "主题解读")).toBe(true);
    expect(result.years.every((year) => year.judgment!.axes.filter((axis) => axis.axis === "balance").every((axis) => axis.effect === "neutral"))).toBe(true);
    expect(result.years.every((year) => !year.summary.includes("平稳"))).toBe(true);
    expect(result.years.some((year) => year.primaryTheme.title.includes("交运"))).toBe(true);
    expect(new Set(result.years.map((year) => year.primaryTheme.title)).size).toBe(10);
    expect(result.years.every((year) => year.primaryTheme.evidence.length > 0 && !/[?？]/.test(year.summary))).toBe(true);
    expect(new Set(result.years.map((year) => year.summary)).size).toBe(10);
  });

  it("an actual weak chart separates a helpful year from a mixed decade and retains the known pressure years", async () => {
    const revision = await revisionFor("male", "1995-03-18");
    const assessment = buildBaziPreliminaryAssessment(revision);
    expect(assessment.balance.baselineDirection).toBe("support");
    const result = await buildLocalAnnualOutlook(revision, assessment, 2026);
    const year = result.years[0]!;
    expect(year.yearInfluence.direction).toBe("较顺");
    expect(year.decadeInfluence.direction).toBe("利弊并见");
    expect(year.label).toBe(year.judgment!.label);
    expect(year.judgment!.axes.some((axis) => axis.axis === "pattern" && axis.pathId === "official-resource")).toBe(true);
    expect(year.yearInfluence.evidence.every((text) => text.startsWith("流年"))).toBe(true);
    expect(year.decadeInfluence.evidence.every((text) => text.includes("大运") && !text.includes("流年"))).toBe(true);
    expect(result.years.filter((item) => item.scenarioBranches.find((branch) => branch.id.endsWith(":working"))?.direction === "有压力").map((item) => item.year)).toEqual([2031, 2032, 2034, 2035]);
    expect(year.evidence.join()).toContain("本年自身较顺；大运自身利弊并见");
    expect(year.summary).toContain(year.judgment!.summary);
  });

  it("an actual strong chart retains working year differences without letting raw sensitivity set the main label", async () => {
    const revision = await revisionFor("male", "1993-04-03");
    const assessment = buildBaziPreliminaryAssessment(revision);
    expect(assessment.balance.baselineDirection).toBe("drain");
    const result = await buildLocalAnnualOutlook(revision, assessment, 2026);
    expect(result.years.every((year) => year.scenarioBranches.find((branch) => branch.id.endsWith(":working"))?.direction === "利弊并见")).toBe(true);
    expect(result.years.every((year) => year.judgment!.axes.find((axis) => axis.axis === "balance")!.unresolvedConditions.length === 0)).toBe(true);
    expect(new Set(result.years.map((year) => year.ownJudgment!.headline)).size).toBe(10);
    expect(new Set(result.years.map((year) => year.ownJudgment!.axes.find((axis) => axis.axis === "balance")!.effect)).size).toBeGreaterThan(1);
    expect(result.years.filter((year) => year.yearInfluence.direction === "较顺").map((year) => year.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(result.years.filter((year) => year.yearInfluence.direction === "有压力").map((year) => year.year)).toEqual([2032, 2034, 2035]);
    expect(new Set(result.years.map((year) => year.primaryTheme.title)).size).toBe(10);
    expect(result.years.find((year) => year.year === 2032)!.primaryTheme.title).toContain("交运");
    expect(result.years.every((year) => year.label === year.judgment!.label)).toBe(true);
    expect(result.years.every((year) => year.summary.includes(year.judgment!.summary))).toBe(true);
    expect(result.limitations.join()).toContain("现代简化规则");
  });

  it("an actual unspecified-sex chart leads with concrete yearly topics while retaining all directional hypotheses", async () => {
    const assessment = buildBaziPreliminaryAssessment(unknown);
    const result = await buildLocalAnnualOutlook(unknown, assessment, 2026);
    expect(result.years.every((year) => year.label === "条件性")).toBe(true);
    expect(new Set(result.years.map((year) => year.primaryTheme.title)).size).toBe(10);
    expect(result.years.every((year) => year.summary.includes(year.primaryTheme.text) && !/[?？]/.test(year.summary))).toBe(true);
    expect(result.years.every((year) => year.decadeInfluence.summary.includes("若按顺行") && year.decadeInfluence.summary.includes("若按逆行"))).toBe(true);
    expect(result.years.some((year) => year.scenarioBranches.length > 2)).toBe(true);
    expect(result.years.every((year) => year.yearInfluence.direction === "主题解读")).toBe(true);
  });

  it("keeps source objects unchanged, rejects a mismatched assessment, and preserves unsupported years", async () => {
    const revisionBefore = structuredClone(male), assessmentBefore = structuredClone(support);
    const range = await buildLocalAnnualOutlook(male, support, 2100);
    expect(male).toEqual(revisionBefore); expect(support).toEqual(assessmentBefore);
    expect(range.years.slice(1).every((year) => year.label === "暂不可判" && year.transitNodeRef === null)).toBe(true);
    expect(range.years.slice(1).every((year) => year.yearInfluence.direction === null && year.decadeInfluence.direction === null)).toBe(true);
    const mismatch = structuredClone(support); mismatch.sourceBinding.chartResultHash = "a".repeat(64);
    await expect(buildLocalAnnualOutlook(male, mismatch, 2026)).rejects.toThrow("不匹配");
    await expect(buildLocalAnnualOutlook(male, support, 2026.5)).rejects.toThrow("整数");
  });

  it("historical queries before birth retain calendar nodes without inventing personal experiences", async () => {
    const result = await buildLocalAnnualOutlook(male, support, 1980);
    expect(result.years).toHaveLength(10);
    for (const year of result.years) {
      expect(year.summary).toContain("出生之前");
      expect(year.yearGanZhi).toBeTruthy();
      expect(year.transitNodeRef).not.toBeNull();
      expect(year.yearInfluence.direction).toBeNull();
      expect(year.decadeInfluence.direction).toBeNull();
      expect(year.themes).toEqual([]);
      expect(year.scenarioBranches).toEqual([]);
      expect(year.dayunSegments).toEqual([]);
      expect(year.judgment).toBeNull(); expect(year.ownJudgment).toBeNull(); expect(year.judgmentSegments).toEqual([]);
    }
  });

  it("keeps the actual child's annual main text consistent with the childhood event setting", async () => {
    const actual = buildBaziPreliminaryAssessment(male);
    const childhood = (await buildLocalAnnualOutlook(male, actual, 2005)).years[0]!;
    expect(childhood.themes[0]!.title).toBe("学习与成长");
    expect(childhood.primaryTheme.text).toContain("学习活动与家庭支持");
    expect(childhood.themes[0]!.text).toContain("技能练习与作品表达");
    expect([childhood.primaryTheme.text, childhood.yearInfluence.summary, childhood.decadeInfluence.summary,
      ...childhood.themes.map(item => `${item.title}${item.text}`)].join()).not.toMatch(/事业|岗位|收入|客户|薪酬|资质准备/);
    expect(childhood.conditions.join()).toContain("9—10周岁");
    expect(childhood.label).toBe(childhood.judgment!.label);
    expect(childhood.summary).toContain(childhood.judgment!.summary);
  });

  it("uses birth-year care and cross-18-year contexts without assuming employment", async () => {
    const actual = buildBaziPreliminaryAssessment(male);
    const [birth, transition, adult] = await Promise.all([1995, 2013, 2025].map(year => buildLocalAnnualOutlook(male, actual, year)));
    expect(birth.years[0]!.themes[0]!.title).toBe("照料与探索");
    expect(birth.years[0]!.conditions.join()).toContain("出生之后适用");
    expect(transition.years[0]!.themes[0]!.title).toBe("学习与自主安排");
    expect(transition.years[0]!.primaryTheme.text).toContain("前段的学习和同伴生活");
    expect(transition.years[0]!.conditions.join()).toContain("17—18周岁");
    expect(adult.years[0]!.themes[0]!.title).toBe("事业与事务");
    expect(adult.years[0]!.conditions.join()).toContain("职业、就学、收入和关系状态未知");
  });

  it("does not promote a real day-stem-only clash into a day-branch relationship signal", async () => {
    const childhood = (await buildLocalAnnualOutlook(male, buildBaziPreliminaryAssessment(male), 2005)).years[0]!;
    const relationship = childhood.themes.find(theme => theme.id === "relationship")!;
    expect(relationship.evidence.some(item => item.includes("流年乙酉与日柱辛巳见天干冲"))).toBe(true);
    expect(relationship.evidence.some(item => item.includes("与日柱") && item.includes("地支"))).toBe(false);
    expect(relationship.text).toContain("日干互动本身不能推出亲密关系的变化");
    expect(childhood.primaryTheme.id).toBe("career");
  });
});
