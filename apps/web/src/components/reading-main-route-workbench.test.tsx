import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { buildReadingTimeline } from "../lib/local-reading-timeline";
import type { LocalOutlookJudgment } from "../lib/local-outlook-judgment";
import { READING_EXPLANATION_INDEX_VERSION, unassessedReadingTime, validateReadingExplanationIndex,
  type ReadingConclusion, type ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { READING_NAVIGATION_STORAGE_KEY } from "../lib/reading-navigation-context";
import { ReadingExplanationWorkbench } from "./reading-explanation-workbench";

type State = "caution" | "opportunity" | "favorable";
let revision: RevisionRecord, nextRevision: RevisionRecord, uncertain: RevisionRecord;
let annual: LocalAnnualOutlook, nextAnnual: LocalAnnualOutlook, parallelAnnual: LocalAnnualOutlook;
async function makeRevision(id: string, sex: "male" | "unspecified", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic main-route integration", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "Synthetic UI input; no real participant or prediction evidence." }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id,
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: time === "08:26" ? 1 : 2,
    createdAt: "2026-11-07T00:00:00.000Z" });
}
beforeAll(async () => {
  [revision, nextRevision, uncertain] = await Promise.all([
    makeRevision("11111111-1111-4111-8111-111111111111", "male"),
    makeRevision("33333333-3333-4333-8333-333333333333", "male", "10:26"),
    makeRevision("44444444-4444-4444-8444-444444444444", "unspecified")
  ]);
  [annual, nextAnnual, parallelAnnual] = await Promise.all([revision, nextRevision, uncertain]
    .map(item => buildLocalAnnualOutlook(item, buildBaziPreliminaryAssessment(item), 2026)));
});
beforeEach(() => window.sessionStorage.removeItem(READING_NAVIGATION_STORAGE_KEY));

// Preserve real computed node identities, branch coverage and handover instants.
// Only qualitative directions are explicit synthetic UI scenarios, not claims
// about the person's future or a replacement implementation of the producers.
function setDirection(judgment: LocalOutlookJudgment, state: State) {
  judgment.primaryAxis = "pattern";
  judgment.label = state === "caution" ? "有压力" : state === "opportunity" ? "条件性" : "较顺";
  judgment.headline = `合成显示场景：${state}`;
  judgment.summary = `合成原判断：${state}；仍保留实际区间。`;
  judgment.conditions = ["合成条件：原有支持能否持续仍需核实。"];
  judgment.conflicts = [];
  for (const axis of judgment.axes) {
    axis.effect = axis.axis !== "pattern" ? "neutral" : state === "caution" ? "obstructs" : "assists";
    axis.summary = `合成${axis.axis}主轴原文：${axis.effect}`;
    axis.unresolvedConditions = state === "opportunity" && axis.axis === "pattern" ? judgment.conditions : [];
  }
}
function scenario(base = annual, state: (year: number, branch: string, part: number) => State = year => year === 2026 ? "caution" : year === 2030 ? "favorable" : "opportunity") {
  const copy = structuredClone(base);
  for (const year of copy.years) year.judgmentSegments.forEach((segment, part) => setDirection(segment.judgment, state(year.year, segment.branchId, part)));
  return copy;
}
function indexFor(source: LocalAnnualOutlook, sourceRevision = revision): ReadingExplanationIndex {
  const first = source.years[0]!.judgmentSegments[0]!;
  const versions = [source.version, first.judgment.version, first.judgment.policyVersion];
  const item = (key: string, domain: ReadingConclusion["domain"], scope: ReadingConclusion["scope"], label: string, text: string): ReadingConclusion => ({
    stableId: `${sourceRevision.id}/${key}`, domain, scope, label, text, direction: null, origin: "calculated",
    sourceSubjects: [`synthetic-ui:${key}`], sourceVersions: versions, personalTextIds: [],
    evidence: { facts: [], support: [], limits: ["仅供界面与范围核对，不代表真实预测。"], unknowns: [], citations: [], ruleApplications: [] }
  });
  const natal: ReadingConclusion["scope"] = { level: "natal", year: null, branchId: null, startInstant: null, endExclusiveInstant: null };
  const conclusions = [
    item("natal:pattern", "natal", natal, "本命专属解释", "本命专属原文，不得冒充年度走势。"),
    item("natal:career", "career", natal, "本命事业解释", "本命事业原文只用于本命理解。"),
    ...source.years.flatMap(year => year.judgmentSegments.flatMap((segment, part) => (["career", "wealth"] as const).map(domain =>
      item(`year:${segment.branchId}:${year.year}:${part}:${domain}`, domain,
        { level: "year", year: year.year, branchId: segment.branchId, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant },
        `${year.year}年 · ${segment.branchId} · 第${part + 1}段 · ${domain}`,
        `修订${sourceRevision.revisionNumber}独立原文：${year.year}/${segment.branchId}/${part}/${domain}。`))))
  ];
  return validateReadingExplanationIndex({ version: READING_EXPLANATION_INDEX_VERSION, generatedAt: "2026-11-07T00:00:00.000Z",
    sourceSnapshot: { caseId: sourceRevision.caseId, revisionId: sourceRevision.id, chartResultHash: sourceRevision.manifest.resultHash, includeHour: true,
      input: sourceRevision.input, ruleProfile: sourceRevision.ruleProfile, ruleProfileDigest: sourceRevision.manifest.ruleProfileDigest,
      timeCalibration: sourceRevision.timeCalibration,
      engineVersions: { engine: sourceRevision.manifest.engine, timeZoneDatabase: sourceRevision.manifest.timeZoneDatabase ?? null },
      context: null, sourceVersions: versions, reportVersion: "synthetic-main-route-integration/1", inputRecordedAt: sourceRevision.createdAt },
    conclusions, sources: [], citationBindings: [], uncertainty: unassessedReadingTime(sourceRevision), limitations: ["合成界面验收，不是真人理解记录。"] });
}
function propsFor(source: LocalAnnualOutlook, sourceRevision = revision) {
  return { index: indexFor(source, sourceRevision), revision: sourceRevision, records: [],
    mainRouteSource: { caseName: "合成当前人物", annual: source, timeline: buildReadingTimeline({ revision: sourceRevision, annual: source }), includeHour: true } };
}
const main = () => within(document.querySelector<HTMLElement>(".reading-main-route")!);
const detail = () => screen.getByRole("region", { name: "所选年份原结论" });
const detailIds = () => [...detail().querySelectorAll<HTMLElement>("[data-route-conclusion]")].map(node => node.dataset.routeConclusion);
const localTime = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

describe("main-route integration in the reading workbench", () => {
  it("names the actual missing direction input and offers the matching revision edit route", () => {
    const props = propsFor(scenario(parallelAnnual, (_year, branch) => branch === "forward" ? "caution" : "favorable"), uncertain);
    render(<ReadingExplanationWorkbench {...props} mainRouteSource={{ ...props.mainRouteSource, canEdit: true }} />);
    expect(document.querySelector(".reading-main-route")?.textContent).toContain("出生性别未填写");
    expect(main().getByRole("link", { name: "补充实际资料" }).getAttribute("href"))
      .toBe(`/cases/${uncertain.caseId}/revisions/${uncertain.id}/revise`);
    expect(screen.queryByRole("button", { name: /看 \d+ 年重点/ })).toBeNull();
  });

  it("returns from months to the same main range, branch, detail and reading position", () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 720 });
    try {
      render(<ReadingExplanationWorkbench {...propsFor(scenario())} />);
      fireEvent.click(main().getByRole("button", { name: "查看转折前后" }));
      const originalIds = detailIds();
      fireEvent.click(within(detail()).getByRole("button", { name: "看 2026 年月份" }));
      expect(document.querySelector(".reading-main-route")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "返回刚才的综合走势" }));
      expect(main().getByText("2026—2028年", { exact: true })).toBeTruthy();
      expect(detailIds()).toEqual(originalIds);
      expect(scroll).toHaveBeenLastCalledWith({ top: 720, behavior: "instant" });
    } finally {
      if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
      scroll.mockRestore();
    }
  });

  it("restores a source-validated cross-year turning detail after remount", () => {
    const props = propsFor(scenario());
    render(<ReadingExplanationWorkbench {...props} />);
    fireEvent.click(main().getByRole("button", { name: "查看转折前后" }));
    const expected = detailIds();
    cleanup();
    render(<ReadingExplanationWorkbench {...props} />);
    expect(within(detail()).getByRole("heading", { name: "转折前后" })).toBeTruthy();
    expect(detailIds()).toEqual(expected);
  });

  it("opens a real three-year route before topics without showing natal text as its answer", () => {
    render(<ReadingExplanationWorkbench {...propsFor(scenario())} />);
    expect(main().getByRole("heading", { name: "先费力，随后出现改善窗口。" })).toBeTruthy();
    expect(main().getByText("2026—2028年", { exact: true })).toBeTruthy();
    expect(main().getByLabelText("查看范围")).toHaveProperty("value", "three_years");
    expect(screen.queryByText("本命专属原文，不得冒充年度走势。")).toBeNull();
    const card = document.querySelector(".reading-main-route")!;
    expect(card.compareDocumentPosition(screen.getByRole("button", { name: "事业发展" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("changes the actual main sentence and range with 2030 and clears the previously opened details", () => {
    const onRequestYear = vi.fn();
    render(<ReadingExplanationWorkbench {...propsFor(scenario())} onRequestYear={onRequestYear} />);
    fireEvent.click(main().getByRole("button", { name: "看 2026 年重点" }));
    expect(within(detail()).getByRole("heading", { name: "2026 年重点" })).toBeTruthy();
    expect(onRequestYear).toHaveBeenLastCalledWith(2026);
    fireEvent.change(main().getByLabelText("起始年份"), { target: { value: "2030" } });
    expect(main().getByRole("heading", { name: "整体较易推进。" })).toBeTruthy();
    expect(main().getByText("2030年", { exact: true, selector: "span" })).toBeTruthy();
    expect(main().getByLabelText("查看范围")).toHaveProperty("value", "year");
    expect(screen.queryByRole("region", { name: "所选年份原结论" })).toBeNull();
    fireEvent.click(main().getByRole("button", { name: "看 2030 年重点" }));
    expect(detailIds().every(id => id?.includes(":2030:"))).toBe(true);
    expect(detailIds()).toHaveLength(2);
    expect(onRequestYear).toHaveBeenLastCalledWith(2030);
  });

  it("exposes scoped saving only after entering natal understanding, never labels three years as saved", () => {
    const onSave = vi.fn(), onSelectionChange = vi.fn();
    render(<ReadingExplanationWorkbench {...propsFor(scenario())} onSelectionChange={onSelectionChange}
      saveScopeAction={<button onClick={onSave}>保存测试范围</button>} />);
    expect(screen.queryByRole("button", { name: "保存测试范围" })).toBeNull();
    expect(onSelectionChange.mock.lastCall?.[0].isReady).toBe(false);
    expect(screen.getByText(/范围快照不包含整条多年主线/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "本命理解" }));
    expect(document.querySelector(".reading-main-route")).toBeNull();
    expect(onSelectionChange.mock.lastCall?.[0]).toMatchObject({ topic: "summary", isReady: true });
    fireEvent.click(screen.getByRole("button", { name: "保存测试范围" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "综合走势" }));
    expect(screen.queryByRole("button", { name: "保存测试范围" })).toBeNull();
    expect(onSelectionChange.mock.lastCall?.[0].isReady).toBe(false);
  });

  it("opens both actual intervals of a same-year turn with their independently bound conclusions", () => {
    const source = scenario(annual, (year, _branch, part) => year === 2028 && part === 0 ? "caution" : "opportunity");
    const props = propsFor(source), segments = source.years.find(year => year.year === 2028)!.judgmentSegments;
    expect(segments).toHaveLength(2);
    render(<ReadingExplanationWorkbench {...props} />);
    fireEvent.change(main().getByLabelText("起始年份"), { target: { value: "2028" } });
    expect(main().getByRole("heading", { name: "先费力，随后出现改善窗口。" })).toBeTruthy();
    fireEvent.click(main().getByRole("button", { name: "查看转折前后" }));
    expect(detailIds()).toEqual(props.index.conclusions.filter(item => item.scope.year === 2028).map(item => item.stableId));
    for (const segment of segments) expect(detail().textContent).toContain(`${localTime(segment.startInstant)}起至${localTime(segment.endExclusiveInstant)}前`);
    expect(detail().textContent).not.toContain("2027/locked/");
  });

  it("keeps the previous and following years together when the selected turn crosses a year boundary", () => {
    const props = propsFor(scenario()), turningPoint = props.mainRouteSource.timeline.turningPoints.find(turn => turn.before.year === 2026 && turn.after.year === 2027)!;
    expect(turningPoint).toBeDefined();
    render(<ReadingExplanationWorkbench {...props} />);
    fireEvent.click(main().getByRole("button", { name: "查看转折前后" }));
    expect(detailIds()).toEqual(props.index.conclusions.filter(item => item.scope.year === 2026 || item.scope.year === 2027).map(item => item.stableId));
    for (const period of [turningPoint.before, turningPoint.after]) expect(detail().textContent).toContain(`${localTime(period.startInstant)}起至${localTime(period.endExclusiveInstant)}前`);
    expect(detailIds().some(id => id?.includes(":2028:"))).toBe(false);
  });

  it("opens every original year link belonging to a multi-year stage rather than only its first year", () => {
    const props = propsFor(scenario(annual, () => "caution"));
    const stage = props.mainRouteSource.timeline.stages[0]!;
    const links = stage.yearLinks.filter(link => link.year <= 2028);
    expect(new Set(links.map(link => link.year)).size).toBeGreaterThan(1);
    render(<ReadingExplanationWorkbench {...props} />);
    fireEvent.click(within(main().getByRole("list", { name: "按实际时间排列的阶段与缺口" })).getAllByRole("button")[0]!);
    const expected = props.index.conclusions.filter(item => links.some(link => item.scope.year === link.year
      && item.scope.startInstant === link.startInstant && item.scope.endExclusiveInstant === link.endExclusiveInstant));
    expect(detailIds()).toEqual(expected.map(item => item.stableId));
    for (const link of links) expect(detail().textContent).toContain(`${localTime(link.startInstant)}起至${localTime(link.endExclusiveInstant)}前`);
  });

  it("restores the selected range, year and parallel branch for the same identity after remount", () => {
    const props = propsFor(scenario(parallelAnnual, (_year, branch) => branch === "forward" ? "caution" : "favorable"), uncertain);
    render(<ReadingExplanationWorkbench {...props} />);
    const assumptions = main().getByRole("group", { name: "先选一条假设路径来查看" });
    fireEvent.click(within(assumptions).getByRole("button", { name: /逆行/ }));
    fireEvent.change(main().getByLabelText("起始年份"), { target: { value: "2030" } });
    fireEvent.change(main().getByLabelText("查看范围"), { target: { value: "ten_years" } });
    expect(main().getByRole("heading", { name: "整体较易推进。" })).toBeTruthy();
    cleanup();
    render(<ReadingExplanationWorkbench {...props} />);
    expect(main().getByLabelText("起始年份")).toHaveProperty("value", "2030");
    expect(main().getByLabelText("查看范围")).toHaveProperty("value", "ten_years");
    expect(main().getByLabelText("查看路径")).toHaveProperty("value", "backward");
    expect(main().getByText("按逆行假设")).toBeTruthy();
    expect(main().getByRole("heading", { name: "整体较易推进。" })).toBeTruthy();
  });

  it("discards prior details and reading preferences when the birth revision changes", () => {
    const first = propsFor(scenario()), changed = propsFor(scenario(nextAnnual, () => "favorable"), nextRevision);
    const view = render(<ReadingExplanationWorkbench {...first} />);
    fireEvent.change(main().getByLabelText("起始年份"), { target: { value: "2030" } });
    fireEvent.click(main().getByRole("button", { name: "看 2030 年重点" }));
    expect(detail().textContent).toContain("修订1独立原文");
    view.rerender(<ReadingExplanationWorkbench {...changed} />);
    expect(screen.queryByRole("region", { name: "所选年份原结论" })).toBeNull();
    expect(main().getByLabelText("起始年份")).toHaveProperty("value", "2026");
    expect(main().getByLabelText("查看范围")).toHaveProperty("value", "three_years");
    expect(view.container.textContent).not.toContain("修订1独立原文");
    expect(main().getByRole("heading", { name: "整体较易推进。" })).toBeTruthy();
    fireEvent.click(main().getByRole("button", { name: "看 2026 年重点" }));
    expect(detail().textContent).toContain("修订2独立原文");
    expect(detailIds().every(id => id?.startsWith(nextRevision.id))).toBe(true);
  });
});
