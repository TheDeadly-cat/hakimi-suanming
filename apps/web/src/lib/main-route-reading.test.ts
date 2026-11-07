import { beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalOutlookJudgment, OutlookEffect, OutlookJudgmentLabel } from "./local-outlook-judgment";
import { buildReadingTimeline } from "./local-reading-timeline";
import { READING_EXPLANATION_INDEX_VERSION, unassessedReadingTime, type ReadingConclusion, type ReadingExplanationIndex } from "./reading-explanation-index";
import { buildMainRouteReading, MAIN_ROUTE_READING_VERSION, type MainRouteState, type MainRouteReading } from "./main-route-reading";

let revision: RevisionRecord, uncertain: RevisionRecord, annual: LocalAnnualOutlook, both: LocalAnnualOutlook;
async function fixture(sex: "male" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: { label: "Synthetic main route fixture", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-11-07T00:00:00Z" });
}
beforeAll(async () => {
  [revision, uncertain] = await Promise.all([fixture("male"), fixture("unspecified")]);
  [annual, both] = await Promise.all([buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2026), buildLocalAnnualOutlook(uncertain, buildBaziPreliminaryAssessment(uncertain), 2026)]);
});
const stateParts: Record<MainRouteState, [OutlookJudgmentLabel, OutlookEffect]> = {
  favorable: ["较顺", "assists"], opportunity: ["条件性", "assists"], caution: ["有压力", "obstructs"],
  mixed: ["利弊并见", "mixed"], theme: ["主题解读", "neutral"], unclear: ["条件性", "unresolved"]
};
function setJudgment(judgment: LocalOutlookJudgment, state: MainRouteState) {
  const [label, effect] = stateParts[state];
  const condition: Record<MainRouteState, string> = {
    favorable: "现有支持仍需保持；新增要求超出可用时间时，这条路线需要重新核对。",
    opportunity: "需确认原有支持仍可使用。",
    caution: "现有要求仍超过可用支持；支持未补齐前，不能将阻力当作已经解除。",
    mixed: "推进所需支持与新增投入同时存在，不能只保留有利的一面。",
    theme: "当前只确认事项主题，尚无足够依据确定推进更顺或更费力。",
    unclear: "影响方向的条件仍未确认，不能按较有利的假设直接下结论。"
  };
  judgment.label = label; judgment.primaryAxis = "pattern"; judgment.headline = `合成阶段：${label}`;
  judgment.summary = `合成主轴原文：${state}`; judgment.conditions = [condition[state]];
  judgment.conflicts = state === "mixed" ? ["推进支持与收入投入要求同时存在。"] : [];
  for (const axis of judgment.axes) {
    axis.effect = axis.axis === "pattern" ? effect : "neutral";
    axis.unresolvedConditions = axis.axis === "pattern" && state === "opportunity" ? ["需确认原有支持仍可使用。"] : [];
    axis.summary = `${axis.axis}合成原文：${axis.effect}`;
    axis.blockers = axis.axis === "pattern" && (state === "caution" || state === "mixed") ? [condition[state]] : [];
    axis.evidence = [`${axis.axis}合成依据，类别${axis.effect}；用于界面投影测试。`];
    axis.rescues = [];
  }
}
function withStates(states: MainRouteState[], base = annual) {
  const copy = structuredClone(base);
  for (let offset = 0; offset < states.length; offset++) {
    const year = copy.years.find(item => item.year === copy.startYear + offset)!;
    for (const segment of year.judgmentSegments) setJudgment(segment.judgment, states[offset]!);
  }
  return copy;
}
function indexFor(source = annual): ReadingExplanationIndex {
  const first = source.years[0]!.judgmentSegments[0]!;
  const conclusion = (domain: "career" | "wealth", direction: string, text: string): ReadingConclusion => ({
    stableId: `${revision.id}/synthetic:${domain}`, label: `${source.startYear}年 · ${domain}`, domain, text,
    scope: { level: "year", year: source.startYear, branchId: first.branchId, startInstant: first.startInstant, endExclusiveInstant: first.endExclusiveInstant },
    direction, origin: "calculated", sourceSubjects: [`synthetic:${domain}:original`], sourceVersions: [first.judgment.version, first.judgment.policyVersion], personalTextIds: [],
    evidence: { facts: [], ruleApplications: [], support: [], limits: [`${domain}的原条件`], unknowns: [], citations: [] }
  });
  return { version: READING_EXPLANATION_INDEX_VERSION, generatedAt: "2026-11-07T00:00:00Z",
    sourceSnapshot: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true,
      input: structuredClone(revision.input) as unknown as Record<string, unknown>, ruleProfile: structuredClone(revision.ruleProfile) as unknown as Record<string, unknown>,
      ruleProfileDigest: revision.manifest.ruleProfileDigest, timeCalibration: structuredClone(revision.timeCalibration) as unknown as Record<string, unknown>,
      engineVersions: { engine: revision.manifest.engine, timeZoneDatabase: revision.manifest.timeZoneDatabase ?? null }, context: null,
      sourceVersions: [source.version, first.judgment.version, first.judgment.policyVersion], reportVersion: "synthetic-main-route", inputRecordedAt: revision.createdAt },
    conclusions: [conclusion("career", "favorable", "事业已有推进支持，但仍需确认完成条件。"), conclusion("wealth", "pressured", "收入投入仍受牵制，不能因为事业推进就当作同步改善。")],
    sources: [], citationBindings: [], uncertainty: unassessedReadingTime(revision), limitations: [] };
}

describe("source-bound primary time route", () => {
  it("surfaces the real 1995-08-18 chart's unmet condition instead of its method disclaimer", () => {
    // Unmodified production chart/annual result: this is also the browser
    // fixture where a methodological note previously hid the actual blocker.
    const original = structuredClone(annual), result = buildMainRouteReading({ revision, annual, selectedYear: 2026 });
    expect(result.keyCondition).toBe("大运辛巳透辛可克年柱透乙；原已保护的偏财支点受到牵连，进入本段持续条件。");
    expect(result.keyConditionPlain).toBe("当前规则提示，原本支持推进的条件可能受牵制，仍需留意这部分阻力。");
    expect(result.keyCondition).not.toContain("本地联合谓词");
    expect(result.conditions).toContain("结构规则为本地联合谓词，不是古籍规定的数值阈值，也不把根数、透干数相加为分数。");
    expect(result.stages[0]!.evidence).toContain(result.keyCondition);
    expect(annual).toEqual(original);
  });

  it.each([
    "大运辛巳透辛可克年柱透乙；原已保护的偏财支点未受到牵连，进入本段持续条件。",
    "并非大运辛巳透辛可克年柱透乙；原已保护的偏财支点受到牵连，进入本段持续条件。",
    "大运辛巳透辛可克年柱透乙；原已保护的偏财支点受到牵连，进入本段持续条件。但实际牵制仍未确定。",
    "尚不能认定原已保护的偏财支点受到牵连。",
    "大运辛巳透辛可克年柱透乙；支点是否受到牵连仍未确定。"
  ])("never projects a negated or qualified condition into an affirmative plain sentence: %s", condition => {
    const source = structuredClone(annual), selected = source.years[0]!.judgmentSegments[0]!.judgment;
    selected.axes.find(axis => axis.axis === selected.primaryAxis)!.blockers = [condition];
    const result = buildMainRouteReading({ revision, annual: source, range: "year" });
    expect(result.keyCondition).toBe(condition); expect(result.keyConditionPlain).toBeNull();
  });

  it("requires the exact template to come from the selected producer blocker", () => {
    const source = structuredClone(annual), selected = source.years[0]!.judgmentSegments[0]!.judgment;
    const original = selected.axes.find(axis => axis.axis === selected.primaryAxis)!.blockers[0]!;
    selected.axes.find(axis => axis.axis === selected.primaryAxis)!.blockers = [];
    selected.conditions = [original]; selected.conflicts = [];
    const result = buildMainRouteReading({ revision, annual: source, range: "year" });
    expect(result.keyCondition).toBe(original); expect(result.keyConditionPlain).toBeNull();
  });
  it.each<[MainRouteState, string]>([
    ["favorable", "整体较易推进"], ["opportunity", "能否落实仍取决于条件"], ["caution", "整体推进较费力"],
    ["mixed", "仍受阻力牵制"], ["theme", "顺逆暂未确定"], ["unclear", "当前不能定下顺逆"]
  ])("gives the %s category a clear sentence without inventing a score", (state, phrase) => {
    const source = withStates([state, state, state]);
    const result = buildMainRouteReading({ revision, annual: source });
    expect(result.status).toBe("ready"); expect(result.headline).toContain(phrase);
    expect(result.stages.every(stage => stage.state === state)).toBe(true);
    expect(result.summary.length).toBeLessThanOrEqual(2); expect(result.headline).not.toMatch(/\d+%|[0-9]+分/);
    expect(result.version).toBe(MAIN_ROUTE_READING_VERSION);
    if (state === "opportunity") { expect(result.headline).not.toContain("整体较易"); expect(result.keyCondition).toContain("原有支持"); }
  });

  it("uses the exact same-year turn and keeps both intervals", () => {
    const source = structuredClone(annual), year = source.years.find(item => item.year === 2028)!;
    expect(year.judgmentSegments).toHaveLength(2);
    setJudgment(year.judgmentSegments[0]!.judgment, "caution"); setJudgment(year.judgmentSegments[1]!.judgment, "opportunity");
    const result = buildMainRouteReading({ revision, annual: source, selectedYear: 2028, range: "year" });
    expect(result.headline).toBe("先费力，随后出现改善窗口。"); expect(result.stages).toHaveLength(2);
    expect(result.stages[0]!.endExclusiveInstant).toBe(year.judgmentSegments[1]!.startInstant);
    expect(result.nextTurningPoint?.atInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(result.stages.map(stage => stage.target)).toEqual(year.judgmentSegments.map(segment => ({ year: 2028, branchId: segment.branchId,
      startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant })));
  });

  it("describes a downturn and does not hide a later reversal after an improvement", () => {
    const down = buildMainRouteReading({ revision, annual: withStates(["favorable", "caution", "caution"]) });
    expect(down.headline).toBe("前段有推进机会，随后阻力增加。");
    const reversal = buildMainRouteReading({ revision, annual: withStates(["caution", "opportunity", "caution"]) });
    expect(reversal.headline).toBe("先费力，随后出现改善窗口，后段较费力。");
    expect(reversal.stages.some(stage => stage.startYear === 2027 && stage.state === "opportunity")).toBe(true);
  });

  it("keeps an unchanged-pressure handover without drawing a rise", () => {
    const source = structuredClone(annual), year = source.years.find(item => item.year === 2028)!;
    for (const segment of year.judgmentSegments) setJudgment(segment.judgment, "caution");
    const result = buildMainRouteReading({ revision, annual: source, selectedYear: 2028, range: "year" });
    expect(result.headline).toBe("整体推进较费力。"); expect(result.stages).toHaveLength(2);
    expect(result.turningPoints[0]?.kind).toBe("handover"); expect(result.turningPoints[0]?.summary).toContain("不表示自动转好");
    expect(result.nextTurningPoint).toBeNull(); expect(result.summary.join(" ")).not.toContain("下一处变化");
    expect(result.headline).not.toMatch(/改善|转好|上升/);
  });

  it("skips an unchanged handover when locating the next real judgment change", () => {
    const source = structuredClone(annual);
    for (const year of source.years.filter(item => item.year >= 2028 && item.year <= 2030)) {
      for (const segment of year.judgmentSegments) setJudgment(segment.judgment, year.year === 2028 ? "caution" : "opportunity");
    }
    const result = buildMainRouteReading({ revision, annual: source, selectedYear: 2028 });
    expect(result.turningPoints[0]!.year).toBe(2028); expect(result.turningPoints[0]!.kind).toBe("handover");
    expect(result.nextTurningPoint!.year).toBe(2029);
    expect(result.summary.join(" ")).toContain("下一处变化在2029年");
  });

  it("shows the complete primary condition instead of repeating the selected branch assumption", () => {
    const source = structuredClone(both), year = source.years[0]!;
    const selected = year.judgmentSegments.find(segment => segment.branchId === "forward")!.judgment;
    setJudgment(selected, "opportunity");
    const condition = "已有支持尚未落实，不代表当前已经转好；仍须确认支持可持续，未确认前不能作确定改善。";
    selected.axes.find(axis => axis.axis === selected.primaryAxis)!.unresolvedConditions = ["模型边界：只供展示定位。", condition];
    selected.conditions = ["判断区间 2026年（不含终点）。", "顺逆未定，各大运条件分别判断。", condition];
    const result = buildMainRouteReading({ revision: uncertain, annual: source, range: "year", branchId: "forward" });
    expect(result.assumption).toBe("按顺行假设"); expect(result.keyCondition).toBe(condition);
    expect(result.keyCondition).not.toContain("当前按顺行");
  });

  it("keeps an explicit unresolved-condition message when the source provides only display metadata", () => {
    const source = structuredClone(annual), selected = source.years[0]!.judgmentSegments[0]!.judgment;
    selected.axes.forEach(axis => { axis.unresolvedConditions = []; axis.blockers = []; });
    selected.conditions = ["判断区间 2026年（不含终点）。", "顺逆未定，各大运条件分别判断。",
      "结构规则为本地联合谓词，不是古籍规定的数值阈值，也不把根数、透干数相加为分数。"];
    selected.conflicts = [];
    const result = buildMainRouteReading({ revision, annual: source, range: "year" });
    expect(result.keyCondition).toBe("这段原判断未单列可用于核实的条件；暂不能说明哪些资料会改变这条路线。");
  });

  it("retains an actual threshold sensitivity condition with its full limitation", () => {
    const source = structuredClone(annual), selected = source.years[0]!.judgmentSegments[0]!.judgment;
    const condition = "财食/承接的0.8、1.0、1.2替代分界不一致；主句沿1.0本地模型，轻重分歧保留为条件。";
    selected.axes.find(axis => axis.axis === selected.primaryAxis)!.unresolvedConditions = [condition];
    const result = buildMainRouteReading({ revision, annual: source, range: "year" });
    expect(result.keyCondition).toBe(condition);
  });

  it("shows a missing middle year and never joins the surviving years", () => {
    const source = withStates(["caution", "caution", "favorable"]); source.years = source.years.filter(year => year.year !== 2027);
    const result = buildMainRouteReading({ revision, annual: source });
    expect(result.gaps.some(gap => gap.year === 2027 && gap.kind === "unavailable_year")).toBe(true);
    expect(result.headline).toContain("缺口"); expect(result.headline).not.toContain("随后出现改善");
    expect(result.stages.every(stage => !(stage.startYear < 2027 && stage.endYear > 2027))).toBe(true);
    expect(result.stages.flatMap(stage => stage.yearLinks).some(link => link.year === 2027)).toBe(false);
  });

  it("uses actual coverage for three- and ten-year requests and reports an outside year", () => {
    const source = structuredClone(annual); source.endYear = source.startYear; source.years = source.years.slice(0, 1);
    const before = structuredClone(source);
    for (const range of ["three_years", "ten_years"] as const) {
      const result = buildMainRouteReading({ revision, annual: source, range });
      expect(result.range.label).toBe("2026年"); expect(result.range.coverageNote).toContain("只覆盖2026年");
      expect(result.stages.flatMap(stage => stage.yearLinks).every(link => link.year === 2026)).toBe(true);
    }
    expect(source).toEqual(before);
    const outside = buildMainRouteReading({ revision, annual: source, selectedYear: 2040, range: "year" });
    expect(outside.status).toBe("unavailable"); expect(outside.stages).toEqual([]); expect(outside.primaryYear).toBeNull();
    expect(outside.gaps[0]!.year).toBe(2040); expect(outside.range.label).toBe("2040年");
  });

  it("requires an explicit parallel branch and never selects the happier one", () => {
    const source = structuredClone(both);
    for (const year of source.years) for (const segment of year.judgmentSegments) setJudgment(segment.judgment, segment.branchId === "forward" ? "caution" : "favorable");
    const unselected = buildMainRouteReading({ revision: uncertain, annual: source });
    expect(unselected.status).toBe("choose_branch"); expect(unselected.selectedBranchId).toBeNull(); expect(unselected.stages).toEqual([]);
    expect(unselected.headline).toContain("从2026年起"); expect(unselected.headline).toContain("分歧");
    const forward = buildMainRouteReading({ revision: uncertain, annual: source, branchId: "forward" });
    expect(forward.headline).toBe("整体推进较费力。"); expect(forward.assumption).toBe("按顺行假设");
    expect(forward.stages.every(stage => stage.branchId === "forward")).toBe(true);
    expect(() => buildMainRouteReading({ revision: uncertain, annual: source, branchId: "locked" })).toThrow("分支");
  });

  it("rejects stale revision, chart, hour, judgment-policy and supplied-timeline data", () => {
    expect(() => buildMainRouteReading({ revision: { ...revision, id: "33333333-3333-4333-8333-333333333333" }, annual })).toThrow("来源");
    expect(() => buildMainRouteReading({ revision, annual: { ...annual, chartResultHash: "f".repeat(64) } })).toThrow("来源");
    expect(() => buildMainRouteReading({ revision, annual, includeHour: false })).toThrow("时柱");
    const old = structuredClone(annual); old.years[0]!.judgmentSegments[0]!.judgment.policyVersion = "old-policy";
    expect(() => buildMainRouteReading({ revision, annual: old })).toThrow("版本");
    const timeline = buildReadingTimeline({ revision, annual }); timeline.stages[0]!.summary += "changed";
    expect(() => buildMainRouteReading({ revision, annual, timeline })).toThrow("原结论");
  });

  it("preserves source targets, versions, conditions and original data without mutation", () => {
    const before = structuredClone({ revision, annual }), timeline = buildReadingTimeline({ revision, annual });
    const result = buildMainRouteReading({ revision, annual, timeline, selectedYear: 2027, range: "year" });
    expect({ revision, annual }).toEqual(before);
    expect(result.sourceBinding).toMatchObject({ caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
      ruleProfileDigest: revision.manifest.ruleProfileDigest });
    for (const stage of result.stages) {
      expect(stage.yearLinks.every(link => link.year === 2027)).toBe(true);
      expect(stage.sourceVersions).toEqual(expect.arrayContaining([annual.years[1]!.judgmentSegments[0]!.judgment.version]));
      expect(timeline.stages.find(item => item.id === stage.sourceStageId)).toBeDefined();
      expect(stage.startInstant).toBe(stage.yearLinks[0]!.startInstant);
      expect(stage.conditions).toEqual(expect.arrayContaining(annual.years[1]!.judgmentSegments[0]!.judgment.conditions));
    }
  });

  it("retains independently supported career and income differences without new domain scoring", () => {
    const source = withStates(["favorable"]), index = indexFor(source), original = structuredClone(index);
    const result = buildMainRouteReading({ revision, annual: source, range: "year", explanationIndex: index });
    expect(result.domainNotes.map(note => note.direction)).toEqual(["favorable", "pressured"]);
    expect(result.summary).toContain("2026年首段，事业支持较多，收入阻力较多。");
    expect(result.domainNotes.map(note => note.text)).toEqual(index.conclusions.map(conclusion => conclusion.text));
    expect(result.headline).toBe("整体较易推进。"); expect(index).toEqual(original);
  });

  it("does not borrow natal, personal, other-year or other-branch domain text", () => {
    const index = indexFor();
    for (const mutate of [
      (item: ReadingConclusion) => { item.origin = "personal"; },
      (item: ReadingConclusion) => { item.scope.level = "natal"; },
      (item: ReadingConclusion) => { item.scope.year = 2027; },
      (item: ReadingConclusion) => { item.scope.branchId = "forward"; }
    ]) {
      const modified = structuredClone(index); modified.conclusions.forEach(mutate);
      expect(buildMainRouteReading({ revision, annual, range: "year", explanationIndex: modified }).domainNotes).toEqual([]);
    }
    const otherRules = structuredClone(index); otherRules.sourceSnapshot.ruleProfileDigest = "other-rules";
    expect(() => buildMainRouteReading({ revision, annual, explanationIndex: otherRules })).toThrow("规则版本");
    const otherPerson = structuredClone(index); otherPerson.sourceSnapshot.caseId = "44444444-4444-4444-8444-444444444444";
    expect(() => buildMainRouteReading({ revision, annual, explanationIndex: otherPerson })).toThrow("人物");
    const oldVersion = structuredClone(index); oldVersion.conclusions[0]!.sourceVersions.push("hakimi.outlook-model/0.0.1");
    expect(() => buildMainRouteReading({ revision, annual, explanationIndex: oldVersion })).toThrow("旧判断版本");
  });

  it("leaves an unloaded annual view unavailable instead of showing natal conclusions", () => {
    const result = buildMainRouteReading({ revision, annual: null, timeline: null, selectedYear: 2030 });
    expect(result.status).toBe("unavailable"); expect(result.range.startYear).toBeNull(); expect(result.range.label).toContain("2030");
    expect(result.range.coverageNote).toContain("不用本命解释替代"); expect(result.stages).toEqual([]);
  });

  it("keeps the core route stable under year, segment, axis and evidence ordering changes", () => {
    const source = withStates(["caution", "opportunity", "caution"]), reordered = structuredClone(source);
    reordered.years.reverse();
    for (const year of reordered.years) {
      year.judgmentSegments.reverse();
      for (const judgment of [year.judgment, year.ownJudgment, ...year.judgmentSegments.map(segment => segment.judgment)]) {
        if (!judgment) continue;
        judgment.axes.reverse();
        for (const axis of judgment.axes) axis.evidence = [...axis.evidence.slice().reverse(), ...axis.evidence];
      }
    }
    const core = (route: MainRouteReading) => ({ headline: route.headline, summary: route.summary, primaryYear: route.primaryYear,
      selectedBranch: route.selectedBranchId, periods: route.stages.map(stage => ({ target: stage.target, state: stage.state, primaryAxis: stage.primaryAxis })),
      next: route.nextTurningPoint?.atInstant ?? null });
    expect(core(buildMainRouteReading({ revision, annual: reordered }))).toEqual(core(buildMainRouteReading({ revision, annual: source })));
    expect(reordered.years[0]!.year).toBe(2035); // Ordering the view did not mutate input.
  });

  it("locates the earliest parallel-branch disagreement independently of input year order", () => {
    const source = structuredClone(both);
    for (const year of source.years) for (const segment of year.judgmentSegments) setJudgment(segment.judgment,
      year.year < 2027 || segment.branchId === "forward" ? "caution" : "favorable");
    const reversed = structuredClone(source); reversed.years.reverse(); reversed.years.forEach(year => year.judgmentSegments.reverse());
    for (const input of [source, reversed]) {
      const result = buildMainRouteReading({ revision: uncertain, annual: input });
      expect(result.headline).toBe("从2027年起，不同资料假设的主判断出现分歧。");
      expect(result.keyCondition).toContain("出生性别未填写"); expect(result.summary.join(" ")).toContain("天干阴阳与性别");
      expect(result.selectedBranchId).toBeNull(); expect(result.stages).toEqual([]);
    }
  });

  it("does not let duplicate domain evidence or reversed input choose a different core sentence", () => {
    const index = indexFor(), source = structuredClone(index), duplicate = structuredClone(source.conclusions[0]!);
    duplicate.stableId += ":duplicate"; duplicate.sourceSubjects.push(...duplicate.sourceSubjects);
    source.conclusions.push(duplicate); source.conclusions.reverse();
    const original = buildMainRouteReading({ revision, annual, explanationIndex: index }), result = buildMainRouteReading({ revision, annual, explanationIndex: source });
    expect(result.headline).toBe(original.headline); expect(result.summary).toEqual(original.summary);
    expect(result.domainNotes).toHaveLength(2);
    expect(result.domainNotes.find(note => note.domain === "career")!.conclusionIds).toHaveLength(2);
  });

  it("rejects contradictory same-domain sources and repeated axes instead of picking the first", () => {
    const index = indexFor(), contradictory = structuredClone(index.conclusions[0]!);
    contradictory.stableId += ":different"; contradictory.direction = "pressured"; contradictory.text = "同一领域的相反合成判断。";
    index.conclusions.push(contradictory);
    for (const conclusions of [index.conclusions, index.conclusions.slice().reverse()]) {
      expect(() => buildMainRouteReading({ revision, annual, explanationIndex: { ...index, conclusions } })).toThrow("不同原结论");
    }
    const source = structuredClone(annual), judgment = source.years[0]!.judgmentSegments[0]!.judgment;
    judgment.axes.push(structuredClone(judgment.axes[0]!));
    expect(() => buildMainRouteReading({ revision, annual: source })).toThrow("作用轴重复");
  });

  it("reviews the six required synthetic routes with their actual explanations and conditions", () => {
    const disagreement = structuredClone(both);
    for (const year of disagreement.years) for (const segment of year.judgmentSegments) setJudgment(segment.judgment, segment.branchId === "forward" ? "caution" : "favorable");
    const domainSource = withStates(["opportunity", "opportunity", "opportunity"]);
    const samples = [
      { id: "continuous_support", scenario: "连续向好", route: buildMainRouteReading({ revision, annual: withStates(["favorable", "favorable", "favorable"]) }), expected: "整体较易推进" },
      { id: "continuous_pressure", scenario: "连续承压", route: buildMainRouteReading({ revision, annual: withStates(["caution", "caution", "caution"]) }), expected: "整体推进较费力" },
      { id: "pressure_then_opportunity", scenario: "先紧后松", route: buildMainRouteReading({ revision, annual: withStates(["caution", "opportunity", "opportunity"]) }), expected: "先费力，随后出现改善窗口" },
      { id: "opportunity_then_pressure", scenario: "先顺后紧", route: buildMainRouteReading({ revision, annual: withStates(["favorable", "caution", "caution"]) }), expected: "随后阻力增加" },
      { id: "domain_difference", scenario: "领域分化", route: buildMainRouteReading({ revision, annual: domainSource, explanationIndex: indexFor(domainSource) }), expected: "能否落实仍取决于条件" },
      { id: "input_disagreement", scenario: "资料分歧", route: buildMainRouteReading({ revision: uncertain, annual: disagreement }), expected: "主判断出现分歧" }
    ];
    for (const sample of samples) {
      expect(sample.route.headline).toContain(sample.expected);
      expect(sample.route.summary.length).toBeGreaterThan(0); expect(sample.route.summary.length).toBeLessThanOrEqual(2);
      expect(sample.route.keyCondition).toBeTruthy(); expect(sample.route.headline).not.toMatch(/一定|必然|\d+%/);
    }
    expect(samples[4]!.route.summary.join(" ")).toContain("事业支持较多，收入阻力较多");
    expect(samples[5]!.route.keyCondition).toContain("出生性别未填写");
    if (process.env.HAKIMI_MAIN_ROUTE_COPY_REVIEW_PATH) {
      const destination = path.resolve(process.env.HAKIMI_MAIN_ROUTE_COPY_REVIEW_PATH);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, JSON.stringify({ schema: "hakimi.main-route-copy-review/1", reviewDate: "2026-11-07", generatedAt: new Date().toISOString(),
        presentationVersion: MAIN_ROUTE_READING_VERSION, synthetic: true, humanReviewed: false, expertReviewed: false,
        fixtureNote: "合成生产者判断，沿用真实生产排盘的区间与身份结构；不是个人预测或真人理解结果。",
        explanationPolicy: "最多两项解释，记录实际条数；不为凑数添加无来源句子。",
        samples: samples.map(({ id, scenario, route }) => ({ id, scenario, headline: route.headline, explanations: route.summary, explanationCount: route.summary.length,
          keyCondition: route.keyCondition, keyConditionPlain: route.keyConditionPlain, sourceBinding: route.sourceBinding, sourceVersions: route.sourceVersions,
          range: route.range, status: route.status, assumption: route.assumption,
          periods: route.stages.map(stage => ({ target: stage.target, caption: stage.caption, primaryAxis: stage.primaryAxis, sourceStageId: stage.sourceStageId,
            sourceVersions: stage.sourceVersions, originalHeadline: stage.headline, originalSummary: stage.summary, conditions: stage.conditions })),
          nextTurningPoint: route.nextTurningPoint && { atInstant: route.nextTurningPoint.atInstant, year: route.nextTurningPoint.year, originalSummary: route.nextTurningPoint.summary },
          domainNotes: route.domainNotes })) }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    }
  });
});
