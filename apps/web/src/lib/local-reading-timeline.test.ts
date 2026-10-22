import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, type LocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingTimeline } from "./local-reading-timeline";

async function revisionFor(date: string, sex: "male" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: { label: "Synthetic timeline fixture", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let xin: RevisionRecord, resource: RevisionRecord, unspecified: RevisionRecord;
let annual: LocalAnnualOutlook, resourceAnnual: LocalAnnualOutlook, early: LocalAnnualOutlook, both: LocalAnnualOutlook, life: LocalLifeOutlook;
beforeAll(async () => {
  [xin, resource, unspecified] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "unspecified")]);
  [annual, resourceAnnual, early, both, life] = await Promise.all([
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 2026), buildLocalAnnualOutlook(resource, buildBaziPreliminaryAssessment(resource), 2026),
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 1998), buildLocalAnnualOutlook(unspecified, buildBaziPreliminaryAssessment(unspecified), 2028),
    buildLocalLifeOutlook(xin, buildBaziPreliminaryAssessment(xin), 2026)
  ]);
});

describe("existing judgments organized as exact, branch-specific reading stages", () => {
  it("preserves source judgments and gives every annual link its exact original node", () => {
    const before = structuredClone({ xin, annual, life }), result = buildReadingTimeline({ revision: xin, annual, life });
    expect({ xin, annual, life }).toEqual(before);
    expect(result.sourceBinding).toEqual({ revisionId: xin.id, chartResultHash: xin.manifest.resultHash, includeHour: true });
    expect([result.startYear, result.endYear]).toEqual([2026, 2035]);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([annual.version, life.version]));
    for (const stage of result.stages) for (const link of stage.yearLinks) {
      const original = annual.years.find((year) => year.year === link.year)!;
      expect(link.nodeRef).toEqual(original.transitNodeRef); expect(link.lifeTheme).toBe(original.primaryTheme.text);
      expect(link.evidence).toEqual(expect.arrayContaining(original.primaryTheme.evidence));
    }
    expect(result.branches[0]!.currentStageId).not.toBeNull();
    expect(result.stages.length).toBeGreaterThan(4);
  });

  it("keeps different causes for equally favorable years and explains a hidden-qi direction already computed", () => {
    const result = buildReadingTimeline({ revision: resource, annual: resourceAnnual });
    const links = result.stages.flatMap((stage) => stage.yearLinks), output = links.find((link) => link.year === 2030)!, wealth = links.find((link) => link.year === 2032)!;
    expect(output.caption).toBe(wealth.caption); expect(output.reason).not.toBe(wealth.reason);
    expect(output.reason).toContain("庚伤官"); expect(wealth.reason).toContain("壬正财");
    expect(links.find((link) => link.year === 2028)!.reason).toContain("支内本气承接");
    expect(links.find((link) => link.year === 2028)!.reason).toContain("藏庚");
    const multi = result.stages.find((stage) => stage.yearLinks.length > 1)!;
    expect(multi.summary).toContain(`其中${multi.yearLinks[0]!.year}年的生活主题`);
    expect(multi.summary).toContain(multi.yearLinks[0]!.lifeTheme);
    for (const stage of result.stages) for (let index = 1; index < stage.yearLinks.length; index++) expect(stage.yearLinks[index - 1]!.endExclusiveInstant).toBe(stage.yearLinks[index]!.startInstant);
  });

  it("uses the real 2028 handover instant without calling an unchanged pressure direction an improvement", () => {
    const result = buildReadingTimeline({ revision: xin, annual, life }), turn = result.turningPoints.find((point) => point.kind === "handover" && point.year === 2028)!;
    expect(turn.atInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(turn.before.endExclusiveInstant).toBe(turn.after.startInstant); expect(turn.after.startInstant).toBe(turn.atInstant);
    expect(turn.before.caption).toBe(turn.after.caption); expect(turn.summary).toContain("不表示自动转好");
    expect(turn.headline).toContain("2028-12-21 04:58:00（UTC+08）");
    expect(turn.before.backgroundRefs[0]!.nodeId).not.toBe(turn.after.backgroundRefs[0]!.nodeId);
    expect(result.stages.some((stage) => stage.endExclusiveInstant === turn.atInstant)).toBe(true);
    expect(result.stages.some((stage) => stage.startInstant === turn.atInstant)).toBe(true);
  });

  it("does not extend the first decade backward across the actual 1998 pre-handover gap", () => {
    const result = buildReadingTimeline({ revision: xin, annual: early });
    const gap = result.gaps.find((item) => item.year === 1998 && item.kind === "missing_background")!;
    expect(gap.endExclusiveInstant).toBe("1998-12-20T20:58:00.000Z");
    const pieces = result.stages.flatMap((stage) => stage.yearLinks).filter((link) => link.year === 1998);
    expect(pieces).toHaveLength(2); expect(pieces[0]!.backgroundRefs).toEqual([]);
    expect(pieces[1]!.startInstant).toBe(gap.endExclusiveInstant); expect(pieces[1]!.backgroundRefs).toHaveLength(1);
    expect(result.turningPoints.find((point) => point.year === 1998)!.kind).toBe("handover");
  });

  it("keeps complete forward/backward 2028 timelines parallel instead of treating partial status as missing coverage", () => {
    expect(both.years[0]!.dayunStatus).toBe("partial");
    const result = buildReadingTimeline({ revision: unspecified, annual: both });
    expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    expect(result.gaps.filter((gap) => gap.year === 2028)).toEqual([]);
    const forward = result.stages.filter((stage) => stage.branchId === "forward").flatMap((stage) => stage.yearLinks).filter((link) => link.year === 2028);
    const backward = result.stages.filter((stage) => stage.branchId === "backward").flatMap((stage) => stage.yearLinks).filter((link) => link.year === 2028);
    expect(forward).toHaveLength(1); expect(backward).toHaveLength(2);
    expect(forward[0]!.caption).toContain("利弊并见"); expect(backward.every((link) => link.caption.includes("有压力"))).toBe(true);
    expect(result.turningPoints.filter((point) => point.year === 2028).map((point) => point.branchId)).toEqual(["backward"]);
  });

  it("does not invent a current stage from an unloaded life view or an outside-window reference", () => {
    expect(buildReadingTimeline({ revision: xin, annual }).branches[0]!.currentStageId).toBeNull();
    const result = buildReadingTimeline({ revision: xin, annual: early, life });
    expect(result.lifeReferenceInstant).toBe(life.referenceInstant);
    expect(result.branches[0]!.currentStageId).toBeNull(); expect(result.branches[0]!.nextStageId).toBeNull();
  });

  it("rejects wrong-source data and forged segment intervals or duplicate/overlapping segments", () => {
    const wrong = structuredClone(annual); wrong.chartResultHash = "f".repeat(64);
    expect(() => buildReadingTimeline({ revision: xin, annual: wrong })).toThrow("来源不匹配");
    const badInterval = structuredClone(annual); badInterval.years[0]!.judgmentSegments[0]!.endExclusiveInstant = badInterval.years[1]!.endExclusiveInstant!;
    expect(() => buildReadingTimeline({ revision: xin, annual: badInterval })).toThrow();
    const duplicate = structuredClone(annual); duplicate.years[0]!.judgmentSegments.push(structuredClone(duplicate.years[0]!.judgmentSegments[0]!));
    expect(() => buildReadingTimeline({ revision: xin, annual: duplicate })).toThrow("重复");
    const wrongTarget = structuredClone(annual); wrongTarget.years[0]!.judgmentSegments[0]!.judgment.targetRef = structuredClone(wrongTarget.years[1]!.transitNodeRef!);
    expect(() => buildReadingTimeline({ revision: xin, annual: wrongTarget })).toThrow("不匹配");
  });

  it("rejects one parallel segment or a later year using a different judgment policy", () => {
    const mixed = structuredClone(both);
    Object.assign(mixed.years[0]!.judgmentSegments[0]!.judgment, { policyVersion: "hakimi.outlook-model/9.9.9" });
    const before = structuredClone(mixed);
    expect(() => buildReadingTimeline({ revision: unspecified, annual: mixed })).toThrow("判断版本");
    expect(mixed).toEqual(before);
    const later = structuredClone(annual);
    Object.assign(later.years[1]!.ownJudgment!, { version: "hakimi.local-outlook-judgment/9.9.9" });
    expect(() => buildReadingTimeline({ revision: xin, annual: later })).toThrow("判断版本");
  });

  it("keeps omitted computed coverage explicit rather than filling it from a neighboring year", () => {
    const incomplete = structuredClone(annual); incomplete.years[2]!.judgmentSegments = [];
    const result = buildReadingTimeline({ revision: xin, annual: incomplete });
    expect(result.gaps.find((gap) => gap.year === 2028)?.kind).toBe("missing_branch_coverage");
    expect(result.stages.flatMap((stage) => stage.yearLinks).some((link) => link.year === 2028)).toBe(false);
    expect(result.stages.some((stage) => stage.startYear < 2028 && stage.endYear > 2028)).toBe(false);
  });

  it("retains real pre-birth years as unavailable rather than assigning a personal stage", async () => {
    const beforeBirth = await buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 1990);
    const result = buildReadingTimeline({ revision: xin, annual: beforeBirth });
    expect(result.stages.flatMap((stage) => stage.yearLinks).every((link) => link.year >= 1995)).toBe(true);
    expect(result.gaps.find((gap) => gap.year === 1990)?.kind).toBe("unavailable_year");
    expect(result.gaps.find((gap) => gap.year === 1990)?.message).toContain("出生之前");
    expect(result.branches[0]!.narrative.statements.find((statement) => statement.kind === "coverage")!.text).toContain("出生之前");
  });

  it("anchors concise trend statements to original stages without promoting conditional support or hidden support to a visible actor", () => {
    const before = structuredClone(resourceAnnual), result = buildReadingTimeline({ revision: resource, annual: resourceAnnual });
    expect(resourceAnnual).toEqual(before); expect(result.version).toBe("hakimi.local-reading-timeline/0.3.0");
    const narrative = result.branches[0]!.narrative;
    expect(narrative.statements.length).toBeGreaterThanOrEqual(2); expect(narrative.statements.length).toBeLessThanOrEqual(5);
    const support = narrative.statements.find((statement) => statement.kind === "support_window")!;
    expect(support.text).toContain("结构上较顺，需看承接与救应");
    expect(support.text).toContain("本年天干未单独定向"); expect(support.text).toContain("藏庚");
    expect(support.text).toContain("以2028年的作用为例");
    expect(support.text).toContain("2029-05-23前");
    const handoverInstant = resourceAnnual.years.find(year => year.year === 2029)!.judgmentSegments[1]!.startInstant;
    const afterHandover = result.stages.find(stage => stage.startInstant === handoverInstant)!;
    expect(afterHandover).toBeDefined();
    expect(support.stageIds).not.toContain(afterHandover.id);
    expect(afterHandover.caption).toContain("利弊并见");
    for (const statement of narrative.statements) {
      expect(statement.stageIds.every((id) => result.stages.some((stage) => stage.id === id && stage.branchId === "locked"))).toBe(true);
      expect(statement.turningPointIds.every((id) => result.turningPoints.some((point) => point.id === id && point.branchId === "locked"))).toBe(true);
    }
    expect(narrative.paragraphs.join(" ")).toContain("同段年份的作用对象仍有区别");
    expect(narrative.conditions.join(" ")).toContain("其余时段");
    const overview = narrative.statements.find((statement) => statement.kind === "overview")!;
    expect(overview.stageIds).toEqual(result.stages.map((stage) => stage.id));
    for (const stage of result.stages) expect(overview.text).toContain(stage.caption);
    expect(overview.text).toContain("2034-02-04至2036-02-04前，结构上有压力");
    expect(resourceAnnual.years.filter(year => year.year >= 2034).every(year => year.judgmentSegments.every(segment =>
      segment.judgment.axes.find(axis => axis.axis === "pattern")!.effect === "obstructs"))).toBe(true);
  });

  it("keeps the real unchanged-pressure handover explicit and the pre-handover background gap visible", () => {
    const current = buildReadingTimeline({ revision: xin, annual, life });
    const statement = current.branches[0]!.narrative.statements.find((item) => item.kind === "turning_point")!;
    expect(statement.text).toContain("2028-12-21 04:58:00（UTC+08）");
    expect(statement.text).toContain("换运前后仍为"); expect(statement.text).toContain("不是自动转好");
    expect(statement.text).toContain(current.turningPoints.find((point) => point.kind === "handover")!.after.reason);
    const gap = buildReadingTimeline({ revision: xin, annual: early }).branches[0]!.narrative.statements.find((item) => item.kind === "coverage")!;
    expect(gap.text).toContain("1998-12-21 04:58:00（UTC+08）"); expect(gap.text).toContain("没有大运背景覆盖");
  });

  it("keeps unknown-direction narratives and existing stage themes inside their actual branch", () => {
    const result = buildReadingTimeline({ revision: unspecified, annual: both });
    const forward = result.branches.find((branch) => branch.id === "forward")!, backward = result.branches.find((branch) => branch.id === "backward")!;
    expect(forward.narrative.statements.find((item) => item.kind === "turning_point")!.text).toContain("2032-08-30 05:34:00（UTC+08）");
    expect(backward.narrative.statements.find((item) => item.kind === "turning_point")!.text).toContain("2028-12-21 04:58:00（UTC+08）");
    for (const branch of result.branches) {
      expect(branch.narrative.statements.every((statement) => statement.stageIds.every((id) => branch.stageIds.includes(id)) && statement.turningPointIds.every((id) => branch.turningPointIds.includes(id)))).toBe(true);
      for (const stage of result.stages.filter((item) => item.branchId === branch.id)) for (const link of stage.yearLinks) {
        expect(link.lifeTheme).toBe(link.reason);
        expect(link.lifeTheme).not.toContain(branch.id === "forward" ? "若按逆行" : "若按顺行");
      }
    }
    const forward2028 = result.stages.find((stage) => stage.branchId === "forward" && stage.startYear === 2028)!;
    expect(forward2028.summary).not.toContain("2028-12-21"); expect(forward2028.summary).not.toContain("辛巳大运");
  });

  it("does not turn unresolved R4 2034 into the supportive 2035 window", async () => {
    const revision = await revisionFor("1999-01-09", "male", "02:26");
    const outlook = await buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2034);
    const result = buildReadingTimeline({ revision, annual: outlook });
    const first = result.stages.find((stage) => stage.startYear === 2034)!;
    expect(first.caption).toBe("条件性");
    expect(outlook.years[0]!.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("unresolved");
    const support = result.branches[0]!.narrative.statements.find((item) => item.kind === "support_window")!;
    expect(support.stageIds).not.toContain(first.id);
    expect(support.stageIds.some((id) => result.stages.find((stage) => stage.id === id)!.startYear === 2035)).toBe(true);
  });

  it("keeps the real R4 mixed-period print pressure and wealth rescue in the narrative even when supportive windows are present", async () => {
    const revision = await revisionFor("1999-01-09", "male", "02:26");
    const annual = await buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2026);
    const result = buildReadingTimeline({ revision, annual }), statements = result.branches[0]!.narrative.statements;
    expect(statements.some((statement) => statement.kind === "support_window")).toBe(true);
    const mixed = statements.find((statement) => statement.kind === "mixed_window")!;
    const stage = result.stages.find((stage) => stage.id === mixed.stageIds[0])!;
    expect(stage.startYear).toBe(2028); expect(mixed.stageIds).toEqual([stage.id]);
    expect(mixed.text).toContain("以2028年的作用为例");
    expect(mixed.text).toContain(stage.yearLinks[0]!.reason);
    expect(mixed.text).toContain("继续增加已有的印支持");
    expect(mixed.text).toContain("月柱透乙偏财有根"); expect(mixed.text).toContain("约束新增戊正印的候选");
    expect(annual.years.find((year) => year.year === 2028)!.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.effect).toBe("mixed");
    expect(mixed.text).not.toContain("同一分段的");
    expect(statements.length).toBeLessThanOrEqual(5);
  });

  it.each([2027, 2028])("explains both original axes of the real forward %i mixed segment without borrowing another branch or changing direction", async (yearNumber) => {
    const outlook = yearNumber === 2028 ? both : await buildLocalAnnualOutlook(unspecified, buildBaziPreliminaryAssessment(unspecified), yearNumber);
    const before = structuredClone(outlook), result = buildReadingTimeline({ revision: unspecified, annual: outlook });
    expect(outlook).toEqual(before);
    const original = outlook.years[0]!.judgmentSegments.find((segment) => segment.branchId === "forward")!;
    const pattern = original.judgment.axes.find((axis) => axis.axis === "pattern")!, seasonal = original.judgment.axes.find((axis) => axis.axis === "seasonal")!;
    expect(original.judgment.label).toBe("利弊并见"); expect(pattern.effect).toBe("assists");
    const branch = result.branches.find((branch) => branch.id === "forward")!, mixed = branch.narrative.statements.find((statement) => statement.kind === "mixed_window")!;
    const stage = result.stages.find((stage) => stage.id === mixed.stageIds[0])!;
    expect(stage.yearLinks[0]!.startInstant).toBe(original.startInstant); expect(stage.yearLinks[0]!.endExclusiveInstant).toBe(original.endExclusiveInstant);
    expect(mixed.text).toContain(`以${yearNumber}年的作用为例`); expect(mixed.text).toContain(stage.yearLinks[0]!.reason);
    expect(mixed.text).toContain("同一分段的调候作用");
    for (const line of [seasonal.summary, ...seasonal.blockers, ...seasonal.rescues]) {
      expect(mixed.text).toContain(line); expect(mixed.text.split(line).length - 1).toBe(1);
      expect(branch.narrative.statements.find((statement) => statement.kind === "overview")!.text).toContain(line);
    }
    const backward = result.branches.find((branch) => branch.id === "backward")!;
    expect(backward.narrative.statements.find((statement) => statement.kind === "overview")!.text).not.toContain("同一分段的调候作用");
    expect(branch.narrative.statements.every((statement) => statement.stageIds.every((id) => branch.stageIds.includes(id)))).toBe(true);
  });
});
