import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { buildMainRouteReading, type MainRouteReading } from "../lib/main-route-reading";
import { ReadingMainRouteCard } from "./reading-main-route-card";

let revision: RevisionRecord, uncertain: RevisionRecord, annual: LocalAnnualOutlook, parallel: LocalAnnualOutlook;
const keyCondition = "合成展示条件：既有支持必须仍可使用。";

async function createRevision(sex: "male" | "unspecified"): Promise<RevisionRecord> {
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic main route card test", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "Synthetic UI coverage, not an observed prediction." }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...calculated, schemaVersion: "1.0.0",
    id: sex === "male" ? "11111111-1111-4111-8111-111111111111" : "33333333-3333-4333-8333-333333333333",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-11-07T00:00:00Z" });
}

beforeAll(async () => {
  [revision, uncertain] = await Promise.all([createRevision("male"), createRevision("unspecified")]);
  [annual, parallel] = await Promise.all([
    buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2026),
    buildLocalAnnualOutlook(uncertain, buildBaziPreliminaryAssessment(uncertain), 2026)
  ]);
});

/** Keep real source identities, year boundaries and the 2028 handover. Only
 * qualitative judgments are an explicit synthetic display contract, ensuring
 * that a cross-year stage and its condition can be exercised deterministically. */
function continuousOpportunity(): LocalAnnualOutlook {
  const source = structuredClone(annual);
  const first = source.years[0]!.judgmentSegments[0]!.judgment;
  const paths = new Map(first.axes.map(axis => [axis.axis, axis.pathId]));
  for (const year of source.years) for (const segment of year.judgmentSegments) {
    const judgment = segment.judgment;
    judgment.label = "条件性";
    judgment.primaryAxis = "pattern";
    judgment.headline = "合成机会判断";
    judgment.summary = "合成展示原文，保留条件。";
    judgment.conditions = [keyCondition];
    judgment.conflicts = [];
    for (const axis of judgment.axes) {
      axis.pathId = paths.get(axis.axis)!;
      axis.effect = axis.axis === "pattern" ? "assists" : "neutral";
      axis.unresolvedConditions = axis.axis === "pattern" ? [keyCondition] : [];
    }
  }
  return source;
}

function mount(model: MainRouteReading) {
  const callbacks = { onRangeChange: vi.fn(), onYearChange: vi.fn(), onBranchChange: vi.fn(), onOpenYear: vi.fn(), onOpenPeriods: vi.fn() };
  const view = render(<ReadingMainRouteCard model={model} caseName="合成甲的档案" range={model.range.mode}
    years={[2026, 2027, 2028]} {...callbacks} />);
  return { ...view, ...callbacks };
}

describe("ReadingMainRouteCard", () => {
  it("opens every original year interval of a cross-year stage, not only its first year", () => {
    const model = buildMainRouteReading({ revision, annual: continuousOpportunity() });
    expect(model.stages[0]!.yearLinks.map(link => link.year)).toEqual([2026, 2027, 2028]);
    const { onOpenPeriods, onOpenYear } = mount(model);
    const stageList = screen.getByRole("list", { name: "按实际时间排列的阶段与缺口" });
    fireEvent.click(within(stageList).getAllByRole("button", { name: /查看这一阶段/ })[0]!);

    expect(onOpenPeriods).toHaveBeenCalledTimes(1);
    const [label, periods] = onOpenPeriods.mock.calls[0]!;
    expect(label).toContain("有机会但有条件");
    expect(periods).toEqual(model.stages[0]!.yearLinks);
    expect(periods.map((period: { year: number }) => period.year)).toEqual([2026, 2027, 2028]);
    expect(onOpenYear).not.toHaveBeenCalled();
  });

  it("opens both sides of the real same-year handover with the exact shared boundary", () => {
    const source = continuousOpportunity();
    const before = source.years.find(year => year.year === 2028)!.judgmentSegments[0]!.judgment;
    before.label = "有压力";
    before.axes.find(axis => axis.axis === before.primaryAxis)!.effect = "obstructs";
    const model = buildMainRouteReading({ revision, annual: source, selectedYear: 2028, range: "year" });
    expect(model.nextTurningPoint?.atInstant).toBe("2028-12-20T20:58:00.000Z");
    const { onOpenPeriods, onOpenYear } = mount(model);
    fireEvent.click(screen.getByRole("button", { name: "查看转折前后" }));

    expect(onOpenPeriods).toHaveBeenCalledTimes(1);
    const [label, periods] = onOpenPeriods.mock.calls[0]!;
    expect(label).toBe("转折前后");
    expect(periods).toHaveLength(2);
    expect(periods).toEqual([model.nextTurningPoint!.before, model.nextTurningPoint!.after]);
    expect(periods[0].endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(periods[1].startInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(periods[0].startInstant).not.toBe(periods[1].startInstant);
    expect(onOpenYear).not.toHaveBeenCalled();
  });

  it("shows the key condition immediately while detailed evidence remains optional", () => {
    const model = buildMainRouteReading({ revision, annual: continuousOpportunity(), range: "year" });
    expect(model.keyCondition).toBe(keyCondition);
    mount(model);
    const condition = screen.getByText("关键条件：").parentElement!;
    expect(condition.textContent).toContain(keyCondition);
    expect(condition.closest("details")).toBeNull();
    expect(condition.closest("[hidden]")).toBeNull();
    expect(screen.getByText("为什么这样判断 · 条件与依据").closest("details")!.open).toBe(false);
    expect(screen.getByRole("heading", { name: model.headline })).toBeTruthy();
    expect(screen.getByText("合成甲的档案")).toBeTruthy();
  });

  it("forwards range, year and explicitly selected branch changes independently", () => {
    const model = buildMainRouteReading({ revision: uncertain, annual: parallel, branchId: "forward" });
    const { onRangeChange, onYearChange, onBranchChange, onOpenYear, onOpenPeriods } = mount(model);
    fireEvent.change(screen.getByLabelText("查看范围"), { target: { value: "ten_years" } });
    fireEvent.change(screen.getByLabelText("起始年份"), { target: { value: "2028" } });
    fireEvent.change(screen.getByLabelText("查看路径"), { target: { value: "backward" } });
    expect(onRangeChange).toHaveBeenCalledExactlyOnceWith("ten_years");
    expect(onYearChange).toHaveBeenCalledExactlyOnceWith(2028);
    expect(onBranchChange).toHaveBeenCalledExactlyOnceWith("backward");
    expect(onOpenYear).not.toHaveBeenCalled();
    expect(onOpenPeriods).not.toHaveBeenCalled();
  });

  it("requires a deliberate choice when parallel paths are unresolved", () => {
    const model = buildMainRouteReading({ revision: uncertain, annual: parallel });
    expect(model.status).toBe("choose_branch");
    const { onBranchChange, onOpenYear, onOpenPeriods } = mount(model);
    expect(screen.queryByRole("button", { name: /看 \d+ 年重点/ })).toBeNull();
    expect(onBranchChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "若按逆行" }));
    expect(onBranchChange).toHaveBeenCalledExactlyOnceWith("backward");
    expect(onOpenYear).not.toHaveBeenCalled();
    expect(onOpenPeriods).not.toHaveBeenCalled();
  });

  it("leaves the missing middle year visibly between real stages and expands the remaining original intervals", () => {
    const source = continuousOpportunity();
    source.years = source.years.filter(year => year.year !== 2027);
    const model = buildMainRouteReading({ revision, annual: source });
    const { onOpenPeriods } = mount(model);
    const stageList = screen.getByRole("list", { name: "按实际时间排列的阶段与缺口" });
    const initial = within(stageList).getAllByRole("listitem");
    expect(initial).toHaveLength(3);
    expect(initial[0]!.textContent).toContain("2026-");
    expect(initial[1]!.textContent).toContain("2027年");
    expect(initial[1]!.textContent).toContain("结果缺口");
    expect(within(initial[1]!).queryByRole("button")).toBeNull();
    expect(initial[2]!.textContent).toContain("2028-");
    expect(onOpenPeriods).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "展开其余 1 个阶段与缺口" }));
    expect(within(stageList).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "收起其余阶段" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("makes the main action a precise year entry and never offers to save an unsaved multi-year route", () => {
    const model = buildMainRouteReading({ revision, annual, selectedYear: 2026, range: "three_years" });
    const { onOpenYear, onOpenPeriods } = mount(model);
    fireEvent.click(screen.getByRole("button", { name: /看 2026 年重点/ }));
    expect(onOpenYear).toHaveBeenCalledExactlyOnceWith(2026);
    expect(onOpenPeriods).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /保存|已保存/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /保存|已保存/ })).toBeNull();
  });
});
