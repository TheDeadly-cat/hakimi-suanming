import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import {
  buildLocalLifeOutlook, buildLocalMonthlyOutlook, LOCAL_DETAILED_QUERY_RANGE,
  type LocalLifeOutlook, type LocalMonthlyOutlook
} from "./local-detailed-outlook";

async function revisionFor(sex: "male" | "female" | "unspecified", date = "1995-08-18") {
  const chart = await calculateChart({
    schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic detailed outlook", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic"
  }, withDayBoundary("zi_start_23"));
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z" });
}
let male: RevisionRecord, female: RevisionRecord, unspecified: RevisionRecord;
let assessment: BaziPreliminaryAssessment;
let life: LocalLifeOutlook, monthly: LocalMonthlyOutlook;
beforeAll(async () => {
  [male, female, unspecified] = await Promise.all([revisionFor("male"), revisionFor("female"), revisionFor("unspecified")]);
  assessment = buildBaziPreliminaryAssessment(male);
  [life, monthly] = await Promise.all([
    buildLocalLifeOutlook(male, assessment, 2026), buildLocalMonthlyOutlook(male, assessment, 2028)
  ]);
}, 30_000);

describe("detailed life and monthly outlook from actual interval facts", () => {
  it("lists every calculated decade with exact references, ages, topics and an explicit reference instant", async () => {
    const snapshot = await calculateTransitSnapshot({ revision: male, atInstant: life.referenceInstant });
    expect(life.status).toBe("available");
    expect(life.decades).toHaveLength(snapshot.luckCycleRuleSnapshot.decadeCount);
    expect(life.decades.map((item) => item.nodeRef)).toEqual(snapshot.tracks.dayun.map((node) => node.ref));
    expect(life.referenceLabel).toContain("并非整年唯一大运");
    expect(life.branches).toHaveLength(1);
    expect(life.decades.filter((item) => item.isCurrent)).toHaveLength(1);
    expect(life.decades.find((item) => item.isCurrent)!.ganZhi).toBe("辛巳");
    expect(life.branches[0]!.currentDecadeId).toBe(life.decades.find((item) => item.isCurrent)!.id);
    expect(life.branches[0]!.handoverInstant).toBe(life.decades[0]!.startInstant);
    for (const [index, decade] of life.decades.entries()) {
      expect(decade.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect([decade.career.id, decade.wealth.id, decade.relationship.id]).toEqual(["career", "wealth", "relationship"]);
      expect(decade.ageLabel).toContain("非虚岁");
      expect(decade.evidence.some((text) => text.includes(decade.nodeRef.nodeId))).toBe(true);
      expect(decade.judgment.targetRef).toEqual(decade.nodeRef);
      expect(decade.judgment.interval).toEqual({ startInstant: decade.startInstant, endExclusiveInstant: decade.endExclusiveInstant });
      expect(decade.headline).toBe(decade.judgment.headline);
      expect(decade.paragraphs.join()).not.toMatch(/规则 [\w-]+|\.\d{3}Z|覆盖/);
      if (index) expect(life.decades[index - 1]!.endExclusiveInstant).toBe(decade.startInstant);
    }
    expect(new Set(life.decades.map((item) => item.headline)).size).toBe(life.decades.length);
  });

  it("switches current decade at the exact handover and does not invent a pre-handover or post-coverage decade", async () => {
    const next = life.decades.find((item) => item.startYear === 2028)!;
    expect(next.startInstant).toBe("2028-12-20T20:58:00.000Z");
    const [before, exact, early, late] = await Promise.all([
      buildLocalLifeOutlook(male, assessment, 2028, { atInstant: new Date(Date.parse(next.startInstant) - 1).toISOString() }),
      buildLocalLifeOutlook(male, assessment, 2028, { atInstant: next.startInstant }),
      buildLocalLifeOutlook(male, assessment, 1996), buildLocalLifeOutlook(male, assessment, 2100)
    ]);
    expect(before.decades.find((item) => item.isCurrent)!.index).toBe(next.index - 1);
    expect(exact.decades.find((item) => item.isCurrent)!.id).toBe(next.id);
    expect(early.branches[0]!.currentDecadeId).toBeNull();
    expect(early.branches[0]!.summary).toContain("尚未交入第一步大运");
    expect(late.branches[0]!.currentDecadeId).toBeNull();
    expect(late.branches[0]!.summary).toContain("大运序列之外");
  }, 30_000);

  it("builds exactly twelve contiguous Jie months, including next-year Xiaohan, without calendar-month guesses", async () => {
    expect(monthly.months).toHaveLength(12);
    expect(monthly.months.map((month) => month.label)).toEqual(["立春月", "惊蛰月", "清明月", "立夏月", "芒种月", "小暑月", "立秋月", "白露月", "寒露月", "立冬月", "大雪月", "小寒月"]);
    expect(monthly.months[0]!.startInstant).toBe(monthly.startInstant);
    expect(monthly.months[11]!.endExclusiveInstant).toBe(monthly.endExclusiveInstant);
    expect(monthly.months[11]!.startInstant.startsWith("2029-01")).toBe(true);
    for (const [index, month] of monthly.months.entries()) {
      expect(month.themes.map((theme) => theme.id)).toEqual(["career", "wealth", "relationship"]);
      expect(month.paragraphs.join()).not.toMatch(/规则 [\w-]+|\.\d{3}Z|覆盖/);
      if (index) expect(monthly.months[index - 1]!.endExclusiveInstant).toBe(month.startInstant);
    }
    const boundary = monthly.months[1]!.startInstant;
    const [before, exact] = await Promise.all([
      calculateTransitSnapshot({ revision: male, atInstant: new Date(Date.parse(boundary) - 1).toISOString() }),
      calculateTransitSnapshot({ revision: male, atInstant: boundary })
    ]);
    expect(before.slots.month.status === "resolved" && before.slots.month.node.ref).toEqual(monthly.months[0]!.nodeRef);
    expect(exact.slots.month.status === "resolved" && exact.slots.month.node.ref).toEqual(monthly.months[1]!.nodeRef);
  });

  it("preserves the exact December handover segments and includes natal, year and decade interaction evidence", () => {
    const december = monthly.months.find((month) => month.label === "大雪月")!;
    const branch = december.branches[0]!;
    expect(branch.segments).toHaveLength(2);
    expect(branch.segments[0]!.startInstant).toBe(december.startInstant);
    expect(branch.segments[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(branch.segments[1]!.startInstant).toBe(branch.segments[0]!.endExclusiveInstant);
    expect(branch.segments[1]!.endExclusiveInstant).toBe(december.endExclusiveInstant);
    expect(branch.segments[0]!.ganZhi).not.toBe(branch.segments[1]!.ganZhi);
    expect(branch.judgmentSegments).toHaveLength(2);
    expect(december.judgmentSegments).toEqual(branch.judgmentSegments);
    for (const [index, judgmentSegment] of branch.judgmentSegments.entries()) {
      const segment = branch.segments[index]!;
      expect(judgmentSegment.judgment.targetRef).toEqual(december.nodeRef);
      expect(judgmentSegment.startInstant).toBe(segment.startInstant);
      expect(judgmentSegment.endExclusiveInstant).toBe(segment.endExclusiveInstant);
      expect(judgmentSegment.judgment.interval).toEqual({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
      expect(judgmentSegment.judgment.backgroundRefs).toEqual(expect.arrayContaining([segment.nodeRef, monthly.yearNodeRef]));
    }
    expect(december.judgment!.interval).toEqual({ startInstant: december.startInstant, endExclusiveInstant: december.endExclusiveInstant });
    expect(branch.summary).toContain("本月交运");
    expect(monthly.months.some((month) => month.evidence.some((text) => text.includes("与日柱")))).toBe(true);
    expect(monthly.months.some((month) => month.evidence.some((text) => text.includes("与流年")))).toBe(true);
    expect(monthly.months.some((month) => month.branches.some((item) => item.evidence.some((text) => text.includes("与大运"))))).toBe(true);
    expect(monthly.limitations.join()).toContain("合不等于");
  });

  it("retains both unspecified-sex branches and never aliases their references or chooses a dominant life", async () => {
    const unknownAssessment = buildBaziPreliminaryAssessment(unspecified);
    const [unknownLife, unknownMonths, femaleLife] = await Promise.all([
      buildLocalLifeOutlook(unspecified, unknownAssessment, 2026),
      buildLocalMonthlyOutlook(unspecified, unknownAssessment, 2026),
      buildLocalLifeOutlook(female, buildBaziPreliminaryAssessment(female), 2026)
    ]);
    expect(unknownLife.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    expect(unknownLife.decades).toHaveLength(life.decades.length * 2);
    expect(unknownLife.decades.filter((item) => item.isCurrent)).toHaveLength(2);
    expect(new Set(unknownLife.decades.map((item) => item.id)).size).toBe(unknownLife.decades.length);
    for (const decade of unknownLife.decades) expect(decade.nodeRef.manualDirection).toBe(decade.branchId);
    for (const month of unknownMonths.months) {
      expect(month.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
      expect(month.conditions.join()).toContain("顺逆未确定");
      expect(month.judgment!.label).toBe("条件性");
      expect(month.direction).toBeNull();
      for (const branch of month.branches) expect(branch.segments.every((segment) => segment.nodeRef.manualDirection === branch.id)).toBe(true);
      for (const branch of month.branches) expect(branch.judgmentSegments.every((segment) => segment.branchId === branch.id
        && segment.judgment.backgroundRefs.some((ref) => ref.nodeType === "dayun" && ref.manualDirection === branch.id))).toBe(true);
    }
    expect(femaleLife.decades.find((item) => item.isCurrent)!.ganZhi).not.toBe(life.decades.find((item) => item.isCurrent)!.ganZhi);
  }, 30_000);

  it("reads actual weak-chart months differently and keeps balance separate while seasonal changes enter their own axis", async () => {
    const weak = await revisionFor("male", "1995-03-18");
    const weakAssessment = buildBaziPreliminaryAssessment(weak);
    expect(weakAssessment.balance.baselineDirection).toBe("support");
    const weakResult = await buildLocalMonthlyOutlook(weak, weakAssessment, 2026);
    expect(new Set(weakResult.months.map((month) => month.ownDirection)).size).toBeGreaterThan(1);
    expect(new Set(weakResult.months.map((month) => month.headline)).size).toBe(12);
    const supportedWithLoad = weakResult.months.find((month) => month.label === "立秋月")!;
    expect(supportedWithLoad.judgment!.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("assists");
    expect(supportedWithLoad.judgment!.axes.find((axis) => axis.axis === "balance")!.effect).toBe("mixed");
    expect(supportedWithLoad.themes[0]!.text).toContain("承接上也有支持与消耗并存");
    expect(supportedWithLoad.themes[0]!.text).toContain("调整范围或节奏");
    const neutral = weakResult.months.find((month) => month.label === "寒露月")!;
    expect(neutral.judgment!.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("neutral");
    expect(neutral.themes[0]!.text).not.toMatch(/支持.*不足|要求.*先到|容易反复面对|有牵制/);
    expect(monthly.months.every((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "balance")!.effect === "neutral")).toBe(true);
    expect(monthly.months.some((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "pattern")!.effect !== "neutral")).toBe(true);
    const differentSeasonal = structuredClone(assessment);
    differentSeasonal.seasonal.preferredStems = ["丙", "丁"];
    differentSeasonal.seasonal.preferredElements = ["fire"];
    const comparison = await buildLocalMonthlyOutlook(male, differentSeasonal, 2028);
    expect(comparison.months.map((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "balance")))
      .toEqual(monthly.months.map((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "balance")));
    expect(comparison.months.map((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "seasonal")!.evidence))
      .not.toEqual(monthly.months.map((month) => month.ownJudgment!.axes.find((axis) => axis.axis === "seasonal")!.evidence));
    expect(monthly.months.some((month) => month.sensitivity.length > 0)).toBe(true);
  }, 30_000);

  it("supports prior and future years only inside the full-year range and does not narrate pre-birth months as personal experience", async () => {
    expect(LOCAL_DETAILED_QUERY_RANGE).toEqual({ fromYear: 1900, toYear: 2100, monthlyToYear: 2099 });
    const [past, future, earliest] = await Promise.all([buildLocalMonthlyOutlook(male, assessment, 1994), buildLocalMonthlyOutlook(male, assessment, 2099), buildLocalMonthlyOutlook(male, assessment, 1900)]);
    expect(past.months).toHaveLength(12);
    expect(past.months.every((month) => month.direction === null && month.ownDirection === null && month.headline.includes("出生前"))).toBe(true);
    for (const month of past.months) {
      expect(month.judgment).toBeNull();
      expect(month.ownJudgment).toBeNull();
      expect(month.judgmentSegments).toEqual([]);
      expect(month.sensitivity).toEqual([]);
      expect(month.evidence.join()).not.toMatch(/扶抑|与日柱|与月柱|与大运/);
      expect(month.themes.every((theme) => theme.text.includes("不作个人"))).toBe(true);
      for (const branch of month.branches) {
        expect(branch.direction).toBeNull();
        expect(branch.segments).toEqual([]);
        expect(branch.judgment).toBeNull();
        expect(branch.judgmentSegments).toEqual([]);
        expect(branch.summary).toContain("不作个人");
        expect(branch.evidence.join()).not.toMatch(/扶抑|合看|与日柱|与月柱|与大运/);
      }
    }
    expect(future.months).toHaveLength(12);
    expect(future.months[11]!.endExclusiveInstant.startsWith("2100-02")).toBe(true);
    expect(earliest.months).toHaveLength(12);
    expect(earliest.months[0]!.startInstant.startsWith("1900-02")).toBe(true);
    for (const year of [1899, 2100, 2101, 2026.5]) await expect(buildLocalMonthlyOutlook(male, assessment, year)).rejects.toThrow(/整数/);
    await expect(buildLocalLifeOutlook(male, assessment, 2101)).rejects.toThrow(/整数/);
  }, 30_000);

  it("publishes the comprehensive judgment as the direction and headline without losing the own-month distinction", () => {
    const visibleDirection = (label: string) => label === "条件性" || label === "暂不可判" ? null : label;
    expect(life.version).toBe("hakimi.local-detailed-outlook/0.6.0");
    expect(monthly.version).toBe(life.version);
    expect(life.summary).toContain("当前行辛巳大运");
    expect(life.summary).toContain("2028-12-21 04:58:00");
    expect(life.summary).not.toContain("不是寿命判断");
    expect(life.limitations.join()).toContain("不是寿命判断");
    for (const decade of life.decades) {
      expect(decade.direction).toBe(visibleDirection(decade.judgment.label));
      expect(decade.paragraphs[0]).toContain(decade.ganZhi);
      expect(decade.paragraphs[0]).toContain(decade.judgment.headline.split("：").at(-1)!);
      // Full 0.2 judgment/ref/segment objects are also deeply compared in the
      // preserved before/after integration probe, independently of prose changes.
      expect(decade.judgment.axes.map((axis) => axis.axis)).toEqual(["balance", "pattern", "seasonal"]);
    }
    for (const month of monthly.months) {
      expect(month.judgment!.targetRef).toEqual(month.nodeRef);
      expect(month.ownJudgment!.targetRef).toEqual(month.nodeRef);
      expect(month.ownJudgment!.backgroundRefs).toEqual([]);
      expect(month.direction).toBe(visibleDirection(month.judgment!.label));
      expect(month.ownDirection).toBe(visibleDirection(month.ownJudgment!.label));
      expect(month.headline).toContain(month.judgment!.headline);
      expect(month.paragraphs.join()).not.toContain("本盘当前不固定喜忌，阅读重点放在事务主题");
    }
  });

  it("keeps the uncovered pre-handover background conditional while retaining a separate own-month reading", async () => {
    const result = await buildLocalMonthlyOutlook(male, assessment, 1996);
    for (const month of result.months) {
      expect(month.ownJudgment).not.toBeNull();
      expect(month.judgmentSegments).toHaveLength(1);
      expect(month.judgmentSegments[0]!.startInstant).toBe(month.startInstant);
      expect(month.judgmentSegments[0]!.endExclusiveInstant).toBe(month.endExclusiveInstant);
      expect(month.judgment!.label).toBe("条件性");
      expect(month.direction).toBeNull();
      expect(month.judgment!.backgroundRefs).toEqual([result.yearNodeRef]);
      expect(month.branches[0]!.segments).toEqual([]);
      expect(month.branches[0]!.judgment!.label).toBe("条件性");
    }
  }, 30_000);

  it("retains the year-only interval before the first handover and switches background at its exact instant", async () => {
    const first = life.decades[0]!;
    const result = await buildLocalMonthlyOutlook(male, assessment, first.startYear);
    const month = result.months.find((item) => Date.parse(item.startInstant) < Date.parse(first.startInstant)
      && Date.parse(item.endExclusiveInstant) > Date.parse(first.startInstant))!;
    const pieces = month.branches[0]!.judgmentSegments;
    expect(pieces).toHaveLength(2);
    expect(pieces[0]!.startInstant).toBe(month.startInstant);
    expect(pieces[0]!.endExclusiveInstant).toBe(first.startInstant);
    expect(pieces[0]!.judgment.backgroundRefs).toEqual([result.yearNodeRef]);
    expect(pieces[1]!.startInstant).toBe(first.startInstant);
    expect(pieces[1]!.endExclusiveInstant).toBe(month.endExclusiveInstant);
    expect(pieces[1]!.judgment.backgroundRefs).toEqual(expect.arrayContaining([first.nodeRef, result.yearNodeRef]));
    expect(pieces.every((piece) => piece.judgment.targetRef.nodeId === month.nodeRef.nodeId)).toBe(true);
    expect(month.judgment!.label).toBe("条件性");
  }, 30_000);

  it("captures input before awaits and rejects stale hashes or an inconsistent include-hour scope", async () => {
    const mutableRevision = structuredClone(male), mutableAssessment = structuredClone(assessment);
    const pending = buildLocalLifeOutlook(mutableRevision, mutableAssessment, 2026);
    mutableRevision.input.date = "1990-01-01"; mutableAssessment.balance.baselineFavorableElements = [];
    expect(await pending).toEqual(life);
    const stale = structuredClone(assessment); stale.sourceBinding.chartResultHash = "a".repeat(64);
    await expect(buildLocalMonthlyOutlook(male, stale, 2026)).rejects.toThrow(/不匹配/);
    const wrongScope = structuredClone(assessment); wrongScope.sourceBinding.includeHour = false;
    await expect(buildLocalLifeOutlook(male, wrongScope, 2026)).rejects.toThrow(/时柱使用范围/);
    const unknown = { ...male, input: { ...male.input, time: null, timePrecision: "unknown_hour" as const } };
    await expect(buildLocalMonthlyOutlook(unknown, assessment, 2026)).rejects.toThrow(/时柱使用范围/);
    await expect(buildLocalLifeOutlook(male, assessment, 2026, { atInstant: "2025-12-01T00:00:00Z" })).rejects.toThrow(/所选/);
  });

  it("keeps same-stem own-month differences and the separate persistent background pressure", () => {
    const spring = monthly.months.find((month) => month.label === "惊蛰月")!, winter = monthly.months.find((month) => month.label === "小寒月")!;
    expect(spring.stemTenGod).toBe(winter.stemTenGod); expect(spring.ganZhi).toBe("乙卯"); expect(winter.ganZhi).toBe("乙丑");
    const springPattern = spring.judgment!.axes.find((axis) => axis.axis === "pattern")!;
    expect(springPattern.effect).toBe("mixed");
    expect(springPattern.stemActions!.items.find(actor => actor.visibility === "visible")!.effect).toBe("assists");
    expect(springPattern.blockers.length).toBeGreaterThan(0);
    expect(winter.judgment!.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("mixed");
    expect(spring.ownJudgment!.axes.find(axis => axis.axis === "pattern")!.effect).toBe("obstructs");
    expect(spring.ownJudgment!.backgroundRefs).toEqual([]);
    expect(winter.ownJudgment!.backgroundRefs).toEqual([]);
    expect(spring.ownJudgment!.axes.find(axis => axis.axis === "pattern")).not.toEqual(winter.ownJudgment!.axes.find(axis => axis.axis === "pattern"));
    expect(spring.themes[0]!.text).toContain("实际承接能力");
    expect(winter.themes[0]!.text).toContain("实际承接能力");
    expect(spring.themes[0]!.evidence).not.toEqual(winter.themes[0]!.evidence);
    expect(spring.themes[1]!.evidence).not.toEqual(winter.themes[1]!.evidence);
    expect(spring.themes[0]!.evidence.join()).toContain("peer-output-wealth");
  });

  it("first-decade and actual childhood months use growth and daily-resource language, while decade and month horizons differ", async () => {
    const first = life.decades[0]!;
    expect(first.ganZhi).toBe("癸未");
    expect(first.career.text).toContain("3—5周岁期间"); expect(first.career.text).toContain("6—13周岁期间");
    const childhood = await buildLocalMonthlyOutlook(male, assessment, 2005);
    const body = (paragraphs: string[], themes: { text: string }[]) => [...paragraphs, ...themes.map((theme) => theme.text)].join();
    expect(body(first.paragraphs, [first.career, first.wealth, first.relationship])).not.toMatch(/工作|收入|结算|履约|婚姻|夫妻|岗位/);
    for (const month of childhood.months) {
      expect(body(month.paragraphs, month.themes)).not.toMatch(/工作|收入|结算|履约|婚姻|夫妻|岗位/);
      expect(month.themes[0]!.text).toMatch(/本月/);
      expect(month.themes[0]!.text).not.toContain("逐步形成的能力");
      expect(month.themes[0]!.text).not.toContain("成果体现");
    }
    expect(first.career.text).toContain("逐步形成的能力");
    expect(life.decades.find((decade) => decade.isCurrent)!.career.text).not.toBe(first.career.text);
  });

  it("known ages across eighteen are split accurately and never described as age-unknown", async () => {
    const femaleLife = await buildLocalLifeOutlook(female, buildBaziPreliminaryAssessment(female), 2026);
    const transition = femaleLife.decades.find((decade) => buildLocalReadingAgeContext(female.timeCalibration.utcInstant, decade.startInstant, decade.endExclusiveInstant).stage === "adult_transition")!;
    expect(transition).toBeDefined();
    expect(transition.career.text).toContain("17周岁期间");
    expect(transition.career.text).toMatch(/18—\d+周岁期间/);
    expect(transition.paragraphs.join()).not.toMatch(/年龄.*未锁定|年龄未可靠/);
    expect(transition.relationship.text).toMatch(/18—\d+周岁期间/);
    expect(transition.conditions.join()).toContain("跨过18周岁");
  });

  it("a pure day-stem interaction is narrated as personal participation, not as a day-branch relationship event", () => {
    const month = monthly.months.find((item) => item.label === "清明月")!;
    const relationship = month.themes.find((theme) => theme.id === "relationship")!;
    expect(month.ganZhi).toBe("丙辰");
    expect(relationship.evidence.join()).toContain("与日柱辛巳见天干五合");
    expect(relationship.evidence.join()).not.toMatch(/与日柱辛巳见地支/);
    expect(relationship.text).toContain("日干互动");
    expect(relationship.text).not.toMatch(/共同生活|婚姻|关系确定/);
    expect(month.conditions.join()).toContain("仅有日干互动");
  });

  it("handover and unspecified routes keep the actual background and local effects in their prose", async () => {
    const december = monthly.months.find((month) => month.label === "大雪月")!;
    expect(december.themes[0]!.text).toContain("辛巳大运");
    expect(december.themes[0]!.text).toContain("庚辰大运");
    expect(december.themes[0]!.text).toContain("2028-12-21");
    const unknown = await buildLocalMonthlyOutlook(unspecified, buildBaziPreliminaryAssessment(unspecified), 2026);
    for (const month of unknown.months) {
      expect(month.themes[0]!.text).toContain("若按顺行");
      expect(month.themes[0]!.text).toContain("若按逆行");
      for (const branch of month.branches) for (const segment of branch.segments) expect(month.themes[0]!.text).toContain(segment.ganZhi);
      expect(month.direction).toBeNull();
    }
    const partialRescue = unknown.months.find((month) => month.label === "寒露月")!;
    const rescued = partialRescue.judgmentSegments.filter((segment) => segment.judgment.axes.some((axis) => axis.axis === "pattern" && axis.rescues.length));
    expect(rescued).toHaveLength(1); expect(partialRescue.judgmentSegments).toHaveLength(2);
    expect(partialRescue.paragraphs.join()).toContain("部分分段已识别");
  });
});
