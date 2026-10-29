import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { buildLocalLifeOutlook, type LocalLifeOutlook } from "../lib/local-detailed-outlook";
import { outlookDirectionCaption } from "../lib/outlook-judgment-presentation";
import { ReadingPeriodSummary } from "./reading-period-summary";
import { buildReadingTimeline, type LocalReadingTimeline } from "../lib/local-reading-timeline";
import { ChartReadingWorkbench } from "./chart-reading-workbench";

let revision: RevisionRecord, annual: LocalAnnualOutlook, beforeHandover: LocalLifeOutlook, afterHandover: LocalLifeOutlook, unknownLife: LocalLifeOutlook;
let timeline: LocalReadingTimeline, unknownTimeline: LocalReadingTimeline, firstHandoverTimeline: LocalReadingTimeline;
beforeAll(async () => {
  const input = { schemaVersion: "1.0.0" as const, calendarType: "gregorian" as const, date: "1995-08-18", time: "08:26", timePrecision: "exact_minute" as const,
    timeZone: "Asia/Shanghai", sex: "male" as const, lunarLeapMonth: false, location: { label: "合成阶段摘要", latitude: null, longitude: null, precision: "unknown" as const }, sourceNote: "synthetic" };
  const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  [annual, beforeHandover, afterHandover] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2024),
    buildLocalLifeOutlook(revision, assessment, 2028, { atInstant: "2028-12-20T12:00:00Z" }),
    buildLocalLifeOutlook(revision, assessment, 2028, { atInstant: "2028-12-22T12:00:00Z" })]);
  const unknownChart = await calculateChart({ ...input, sex: "unspecified" }, WORKING_DEFAULT_RULE_PROFILE);
  const unknown = storedRevisionRecordSchema.parse({ ...revision, ...unknownChart, id: crypto.randomUUID() });
  unknownLife = await buildLocalLifeOutlook(unknown, buildBaziPreliminaryAssessment(unknown), 2028, { atInstant: "2028-12-20T12:00:00Z" });
  timeline = buildReadingTimeline({ revision, annual, life: beforeHandover });
  const [unknownAnnual, firstAnnual] = await Promise.all([
    buildLocalAnnualOutlook(unknown, buildBaziPreliminaryAssessment(unknown), 2028),
    buildLocalAnnualOutlook(revision, assessment, 1998)
  ]);
  unknownTimeline = buildReadingTimeline({ revision: unknown, annual: unknownAnnual, life: unknownLife });
  firstHandoverTimeline = buildReadingTimeline({ revision, annual: firstAnnual });
});
afterEach(cleanup);

describe("answer-first period reading", () => {
  it("shows the actual current decade and changes it at the precise handover, preserving conditions", () => {
    const view = render(<ReadingPeriodSummary life={beforeHandover} annual={annual} />);
    const current = beforeHandover.decades.find((item) => item.isCurrent)!;
    expect(screen.getByText(current.headline)).toBeTruthy();
    expect(screen.getByText("2028年12月21日转入庚辰大运。")).toBeTruthy();
    expect(view.container.textContent).toContain(beforeHandover.branches[0]!.summary);
    expect(view.container.textContent).toContain(annual.summary);
    view.rerender(<ReadingPeriodSummary life={afterHandover} annual={annual} />);
    expect(screen.queryByText(current.headline)).toBeNull();
    expect(screen.getByText(afterHandover.decades.find((item) => item.isCurrent)!.headline)).toBeTruthy();
  });
  it("shows each conditional year without turning its qualified judgment into an unqualified good year", () => {
    const select = vi.fn();
    const view = render(<ReadingPeriodSummary life={beforeHandover} annual={annual} onSelectYear={select} />);
    fireEvent.click(screen.getByText("展开这十年的具体结论"));
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("link")).toHaveLength(10);
    const year = annual.years.find((item) => item.label === "条件性")!;
    const link = within(list).getByRole("link", { name: `${year.year}年 · ${outlookDirectionCaption(year.judgment, year.label)}` });
    expect(link.getAttribute("href")).toBe("#reading-yearly");
    fireEvent.click(link);
    expect(select).toHaveBeenCalledWith(year.year);
    expect(view.container.textContent).toContain(year.judgment!.headline.split("：").slice(1).join("："));
  });
  it("keeps both direction branches when sex is unspecified", () => {
    const view = render(<ReadingPeriodSummary life={unknownLife} annual={null} />);
    expect(unknownLife.branches).toHaveLength(2);
    for (const branch of unknownLife.branches) {
      expect(view.container.textContent).toContain(branch.label);
      expect(view.container.textContent).toContain(branch.summary);
      const current = unknownLife.decades.find((item) => item.id === branch.currentDecadeId);
      if (current) expect(view.container.textContent).toContain(current.headline);
    }
  });

  it("replaces the caption list with every real stage, exact handover and working year links", () => {
    const select = vi.fn();
    const view = render(<ReadingPeriodSummary life={beforeHandover} annual={annual} timeline={timeline} onSelectYear={select} />);
    expect(screen.getByRole("heading", { name: "关键阶段与变化年份" })).toBeTruthy();
    expect(screen.queryByText("展开这十年的具体结论")).toBeNull();
    expect(view.container.querySelectorAll(".reading-timeline-stage")).toHaveLength(timeline.stages.length);
    for (const stage of timeline.stages) {
      const article = Array.from(view.container.querySelectorAll(".reading-timeline-stage")).find((item) => item.getAttribute("data-stage-id") === stage.id)!;
      expect(article.textContent).toContain(stage.summary);
      for (const link of stage.yearLinks) {
        expect(article.textContent).toContain(link.reason);
        expect(article.textContent).toContain(link.lifeTheme);
      }
      expect(article.querySelector(`time[datetime="${stage.startInstant}"]`)).toBeTruthy();
      expect(article.querySelector(`time[datetime="${stage.endExclusiveInstant}"]`)).toBeTruthy();
    }
    const handover = timeline.turningPoints.find((item) => item.kind === "handover" && item.year === 2028)!;
    expect(handover).toBeDefined();
    const change = screen.getByRole("complementary", { name: "2028年交运变化" });
    expect(change.querySelector(`time[datetime="${handover.atInstant}"]`)).toBeTruthy();
    expect(change.textContent).toContain("北京时间");
    expect(change.textContent).toContain(handover.before.caption);
    expect(change.textContent).toContain(handover.after.caption);
    const link = within(change).getByRole("link", { name: "阅读 2028 年详解 →" });
    expect(link.getAttribute("href")).toBe("#reading-yearly");
    fireEvent.click(link); expect(select).toHaveBeenCalledWith(2028);
  });

  it("keeps unknown direction branches in separate parallel containers instead of one chronology", () => {
    const view = render(<ReadingPeriodSummary life={null} annual={null} timeline={unknownTimeline} onSelectYear={vi.fn()} />);
    expect(view.container.querySelectorAll(".reading-timeline-branch")).toHaveLength(2);
    for (const branch of unknownTimeline.branches) {
      const section = screen.getByRole("region", { name: branch.label });
      const ids = Array.from(section.querySelectorAll(".reading-timeline-stage")).map((item) => item.getAttribute("data-stage-id"));
      expect(ids).toEqual(branch.stageIds);
      expect(ids.every((id) => unknownTimeline.stages.find((item) => item.id === id)!.branchId === branch.id)).toBe(true);
    }
    expect(view.container.textContent).not.toContain("未来十年");
  });

  it("shows the first handover's partial year and the uncovered interval without extending the new decade backwards", () => {
    const view = render(<ReadingPeriodSummary life={null} annual={null} timeline={firstHandoverTimeline} onSelectYear={vi.fn()} />);
    const change = firstHandoverTimeline.turningPoints.find((item) => item.kind === "handover" && item.year === 1998)!;
    expect(change).toBeDefined();
    const stage = firstHandoverTimeline.stages.find((item) => item.startInstant === change.atInstant)!;
    const article = Array.from(view.container.querySelectorAll(".reading-timeline-stage")).find((item) => item.getAttribute("data-stage-id") === stage.id)!;
    expect(article.querySelector(`time[datetime="${change.atInstant}"]`)).toBeTruthy();
    expect(article.textContent).toContain("1998年12月21日");
    expect(firstHandoverTimeline.gaps.some((gap) => gap.kind === "missing_background" && gap.year === 1998)).toBe(true);
    for (const gap of firstHandoverTimeline.gaps) expect(view.container.textContent).toContain(gap.message);
    expect(screen.queryByText("当前所在阶段")).toBeNull();
  });

  it("only passes the timeline through the workbench for the same revision, hour scope and year window", () => {
    const props = { revision, assessment: buildBaziPreliminaryAssessment(revision), caseName: "合成阶段", annualOutlook: annual, lifeOutlook: beforeHandover };
    const view = render(<ChartReadingWorkbench {...props} timeline={timeline} />);
    expect(screen.getByRole("heading", { name: "关键阶段与变化年份" })).toBeTruthy();
    const wrongHash = structuredClone(timeline); wrongHash.sourceBinding.chartResultHash += "x";
    view.rerender(<ChartReadingWorkbench {...props} timeline={wrongHash} />);
    expect(screen.queryByRole("heading", { name: "关键阶段与变化年份" })).toBeNull();
    const wrongHour = structuredClone(timeline); wrongHour.sourceBinding.includeHour = false;
    view.rerender(<ChartReadingWorkbench {...props} timeline={wrongHour} />);
    expect(screen.queryByRole("heading", { name: "关键阶段与变化年份" })).toBeNull();
    const wrongWindow = structuredClone(timeline); wrongWindow.startYear -= 1;
    view.rerender(<ChartReadingWorkbench {...props} timeline={wrongWindow} />);
    expect(screen.queryByRole("heading", { name: "关键阶段与变化年份" })).toBeNull();
    expect(screen.getByRole("heading", { name: "先看阶段与年份" })).toBeTruthy();
  });
});
