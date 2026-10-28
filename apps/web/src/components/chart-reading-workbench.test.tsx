import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "../lib/local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { buildReadingPriorities } from "../lib/local-reading-priorities";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId, annualEventFeedbackText, type LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import { annualEventCompositionSubjectId, annualEventCompositionFeedbackText } from "../lib/local-annual-event-composition-record";
import { composeAnnualEvents } from "../lib/local-annual-event-composition";
import type { AnnualEventSegment } from "../lib/local-annual-event-reading";
import { projectPriorityAnnualEvents, priorityEventKey } from "../lib/priority-annual-events";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { ChartReadingWorkbench, type ReadingSaveFeedback } from "./chart-reading-workbench";
import { ReadingPrioritiesPanel } from "./reading-priorities-panel";
import { PersonalReadingProvider } from "./personal-reading-note";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildReadingSynthesis } from "../lib/local-reading-synthesis";
import { buildBriefReadingReport } from "../lib/brief-reading-report";
import { revealReadingSection } from "./reading-section-navigation";

async function fixture(date: string, sex: "male" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic priority event UI", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2028);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
    startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  return { revision, assessment, annual, annualDomains, priorities: buildReadingPriorities({ revision, annual, annualDomains }),
    events: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }) };
}
let b: Awaited<ReturnType<typeof fixture>>, unknown: Awaited<ReturnType<typeof fixture>>;
function backgroundFixture(value: Awaited<ReturnType<typeof fixture>>) {
  const comprehensive = buildBaziComprehensiveReading(value.revision, value.assessment);
  const synthesis = buildReadingSynthesis({ revision: value.revision, assessment: value.assessment, comprehensive, annual: value.annual });
  const brief = buildBriefReadingReport(value.assessment, value.annual, { sourceRevision: value.revision, comprehensive, synthesis,
    annualDomains: value.annualDomains, annualEvents: value.events });
  if (!brief) throw new Error("Synthetic main report must be available for deferred background tests");
  return { comprehensive, synthesis, brief };
}
let bBackground: ReturnType<typeof backgroundFixture>;
beforeAll(async () => {
  [b, unknown] = await Promise.all([fixture("1995-05-18", "male"), fixture("1995-08-18", "unspecified")]);
  bBackground = backgroundFixture(b);
}, 60_000);

async function card(year: number, branch?: HTMLElement) {
  const element = within(branch ?? screen.getByRole("region", { name: "关键年份先读" })).getByRole("article", { name: `${year}年先读`, hidden: true });
  let folded = element.closest("details:not([open])");
  while (folded) { await userEvent.click(folded.querySelector("summary")!); folded = element.closest("details:not([open])"); }
  return element;
}
function navigation(element: HTMLElement) {
  return within(element).getByLabelText("年份导航摘要");
}
function fullYear(element: HTMLElement) {
  return within(element).getByText("展开本年完整内容与依据").closest("details")!;
}
async function openFullYear(element: HTMLElement) {
  const full = fullYear(element);
  expect(full.open).toBe(false);
  await userEvent.click(full.querySelector("summary")!);
  expect(full.open).toBe(true);
  return full;
}
function expectPeriod(element: HTMLElement, segment: AnnualEventSegment) {
  const times = element.querySelectorAll("time");
  expect(times[0]!.dateTime).toBe(segment.startInstant);
  expect(times[1]!.dateTime).toBe(segment.endExclusiveInstant);
}
function expectCompleteEvents(element: HTMLElement, segment: AnnualEventSegment) {
  for (const item of segment.items) {
    for (const original of [item.title, item.summary, ...item.examples, ...item.why,
      ...item.applicability, ...item.notApplicableWhen, ...item.conditions, ...item.evidence, ...item.sourceIds]) {
      expect(element.textContent).toContain(original);
    }
  }
  for (const condition of segment.conditions) expect(element.textContent).toContain(condition);
}
function personal(subjectId: string, originalConclusion: string, personalText: string): LocalPersonalReading {
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: b.events.sourceBinding, sourceVersions: [], issues: [], entries: [{
    subjectId, subjectLabel: subjectId, originalConclusion, readingVersions: [], state: "adopted", personalText, effectiveConclusion: personalText,
    feedback: [], selectedReviewRefs: [], issues: [] }] };
}

describe("priority-year event reading on actual charts", () => {
  it("keeps one primary save action and reveals complete exports only on request", async () => {
    const onSaveReading = vi.fn(), onEditBirthData = vi.fn(), onExportReading = vi.fn();
    const view = render(<ChartReadingWorkbench revision={b.revision} caseName="合成范围说明" assessment={b.assessment}
      onSaveReading={onSaveReading} onEditBirthData={onEditBirthData} onExportReading={onExportReading} onExportArchive={vi.fn()} />);
    const header = within(view.container.querySelector<HTMLElement>(".reading-workbench-header")!);
    const save = header.getByRole("button", { name: "保存解读" });
    expect(document.getElementById(save.getAttribute("aria-describedby")!)?.textContent).toContain("全部年份与月份、计算分支和依据");
    expect(view.container.querySelector<HTMLDetailsElement>(".reading-export-menu")!.open).toBe(false);
    await userEvent.click(header.getByRole("button", { name: "编辑资料" }));
    expect(onEditBirthData).toHaveBeenCalledTimes(1);
    await userEvent.click(header.getByText("更多"));
    await userEvent.click(header.getByRole("button", { name: "导出完整解读" }));
    expect(onExportReading).toHaveBeenCalledTimes(1);
    await userEvent.click(header.getByText("更多"));
    expect(view.container.querySelector<HTMLDetailsElement>(".reading-export-menu")!.open).toBe(false);
    expect(onSaveReading).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "先看懂这份命盘" })).toBeTruthy();
  });
  it("shows actual save phases without a percentage and opens the specifically confirmed report", () => {
    const onSaveReading=vi.fn(), props={revision:b.revision,caseName:"合成保存状态",assessment:b.assessment,briefReport:bBackground.brief,onSaveReading};
    const view=render(<ChartReadingWorkbench {...props} saveFeedback={{status:"working",stage:"month_preparation"}}/>);
    const header=()=>within(view.container.querySelector<HTMLElement>(".reading-workbench-header")!);
    expect(header().getByRole("status").textContent).toContain("正在整理完整年份和月份");
    expect(header().getByRole("button",{name:"正在保存"}).hasAttribute("disabled")).toBe(true);
    fireEvent.click(header().getByRole("button",{name:"正在保存"}));expect(onSaveReading).not.toHaveBeenCalled();
    for(const [stage,label] of [["encoding_compression","正在整理完整报告的保存格式"],["post_save_validation","正在核对是否完整保存"]] as const){
      view.rerender(<ChartReadingWorkbench {...props} saveFeedback={{status:"working",stage}}/>);
      expect(header().getByRole("status").textContent).toContain(label);expect(header().getByRole("status").textContent).not.toContain("%");
    }
    const reportId="33333333-3333-4333-8333-333333333333";
    view.rerender(<ChartReadingWorkbench {...props} saveFeedback={{status:"saved",reportId}}/>);
    expect(header().getByRole("status").textContent).toContain("报告已保存并核对");
    expect(header().getByRole("link",{name:"打开已保存报告"}).getAttribute("href")).toBe(`/reports?case=${b.revision.caseId}&report=${reportId}`);
  });
  it("distinguishes a pre-write rejection from an unconfirmed write and keeps the real review action available", () => {
    const onSaveReading=vi.fn(),onCheckSave=vi.fn(),onExportReading=vi.fn(),onExportArchive=vi.fn();
    const props={revision:b.revision,caseName:"合成保存边界",assessment:b.assessment,briefReport:bBackground.brief,onSaveReading,onCheckSave,onExportReading,onExportArchive};
    const rejected:ReadingSaveFeedback={status:"not_saved",canExport:true,message:"完整报告内容已生成，可以先分别导出完整解读和完整依据留存。"};
    const view=render(<ChartReadingWorkbench {...props} saveFeedback={rejected}/>);
    const header=()=>within(view.container.querySelector<HTMLElement>(".reading-workbench-header")!);
    expect(header().getByRole("alert").textContent).toContain("本次没有保存，原来的命盘和报告没有改动");
    expect(view.container.querySelector<HTMLDetailsElement>(".reading-export-menu")!.open).toBe(false);
    fireEvent.click(header().getByText("更多"));
    fireEvent.click(header().getByRole("button",{name:"导出完整解读"}));fireEvent.click(header().getByRole("button",{name:"导出完整依据"}));
    expect(onExportReading).toHaveBeenCalledTimes(1);expect(onExportArchive).toHaveBeenCalledTimes(1);expect(onSaveReading).not.toHaveBeenCalled();
    view.rerender(<ChartReadingWorkbench {...props} saveFeedback={{status:"unconfirmed",message:"保存结果尚未确认，已暂停继续写入。"}}/>);
    expect(header().getByRole("alert").textContent).toContain("请勿重复保存");expect(header().getByRole("alert").textContent).not.toContain("本次没有保存");
    expect(header().getByRole("button",{name:"保存结果待核对"}).hasAttribute("disabled")).toBe(true);
    fireEvent.click(header().getByRole("button",{name:"保存结果待核对"}));expect(onSaveReading).not.toHaveBeenCalled();
    fireEvent.click(header().getByRole("button",{name:"核对保存记录"}));expect(onCheckSave).toHaveBeenCalledTimes(1);
  });
  it("keeps a confirmed report accessible when only the current page refresh failed", () => {
    render(<ChartReadingWorkbench revision={b.revision} caseName="合成刷新提示" assessment={b.assessment} briefReport={bBackground.brief}
      saveFeedback={{status:"saved",reportId:"33333333-3333-4333-8333-333333333333",refreshIssue:true}}/>);
    expect(screen.getByRole("link",{name:"打开已保存报告"})).toBeTruthy();
    expect(screen.getByText(/本页更新尚未完成/).textContent).toContain("报告已保存并核对");
  });
  it("keeps the explanation panel mounted across a transient missing brief report while a year changes", () => {
    const props = { revision: b.revision, caseName: "合成年份切换", assessment: b.assessment, annualOutlook: b.annual,
      priorities: b.priorities, annualEvents: b.events };
    const panel = <input aria-label="专题内部阅读状态" defaultValue="初始问题"/>;
    const view = render(<ChartReadingWorkbench {...props} briefReport={bBackground.brief} explanationPanel={panel}/>);
    const input = screen.getByLabelText("专题内部阅读状态");
    fireEvent.change(input, { target: { value: "已经选择的关系问题" } });
    view.rerender(<ChartReadingWorkbench {...props} briefReport={null} explanationPanel={panel} reportLoading/>);
    expect(screen.getByLabelText("专题内部阅读状态")).toBe(input); expect(input).toHaveProperty("value", "已经选择的关系问题");
    expect(screen.queryByText("展开完整本命阅读")).toBeNull();
    expect(view.container.querySelector(".reading-brief-background .reading-priority-years")).toBeNull();
    view.rerender(<ChartReadingWorkbench {...props} briefReport={bBackground.brief} explanationPanel={panel}/>);
    expect(screen.getByLabelText("专题内部阅读状态")).toBe(input); expect(input).toHaveProperty("value", "已经选择的关系问题");
    expect(screen.getByText("展开完整本命阅读")).toBeTruthy();
  });
  it("does not mount the large background while preparing or initially folded, then retains nested comparison state after reopening", async () => {
    const props = { revision: b.revision, caseName: "合成延迟阅读", assessment: b.assessment, annualOutlook: b.annual,
      priorities: b.priorities, annualEvents: b.events, synthesis: bBackground.synthesis, comprehensive: bBackground.comprehensive };
    const view = render(<ChartReadingWorkbench {...props} reportLoading/>);
    const outer = view.container.querySelector<HTMLDetailsElement>(".reading-brief-background")!;
    expect(outer.open).toBe(false); expect(outer.querySelector(".reading-priority-years")).toBeNull();
    expect(outer.querySelector(".reading-synthesis-sections")).toBeNull();
    view.rerender(<ChartReadingWorkbench {...props} briefReport={bBackground.brief} explanationPanel={<p>主报告可先阅读</p>}/>);
    expect(outer.open).toBe(false); expect(outer.querySelector(".reading-priority-years")).toBeNull();
    expect(screen.getByText("主报告可先阅读")).toBeTruthy();
    await userEvent.click(outer.querySelector("summary")!);
    await waitFor(() => expect(outer.querySelector(".reading-priority-years")).not.toBeNull());
    await userEvent.click(within(outer).getByText("展开重点年份的原判断与细分事项"));
    const comparison = within(outer).getByText(`并列比较两年 · ${b.priorities.branches[0]!.label}`).closest("details")!;
    await userEvent.click(comparison.querySelector("summary")!);
    const first = within(comparison).getByLabelText("比较年份一"), second = within(comparison).getByLabelText("比较年份二");
    await userEvent.selectOptions(first, "2030"); await userEvent.selectOptions(second, "2032");
    await userEvent.click(outer.querySelector("summary")!); expect(outer.open).toBe(false);
    expect(within(comparison).getByLabelText("比较年份一")).toBe(first);
    await userEvent.click(outer.querySelector("summary")!); expect(outer.open).toBe(true);
    expect(within(comparison).getByLabelText("比较年份一")).toBe(first); expect(first).toHaveProperty("value", "2030");
    expect(second).toHaveProperty("value", "2032"); expect(comparison.open).toBe(true);
  });
  it("resolves an existing synthesis hash after lazy mounting and reopens through the original full-report link", async () => {
    const oldUrl = window.location.pathname + window.location.search + window.location.hash;
    const section = bBackground.synthesis.sections[0]!, targetId = `reading-${section.id}`;
    try {
      window.history.replaceState(null, "", `#${targetId}`);
      const props = { revision: b.revision, caseName: "合成锚点阅读", assessment: b.assessment, annualOutlook: b.annual,
        priorities: b.priorities, annualEvents: b.events, synthesis: bBackground.synthesis, briefReport: bBackground.brief,
        explanationPanel: <p>合成主报告</p> };
      const view = render(<ChartReadingWorkbench {...props} reportLoading/>);
      expect(document.getElementById(targetId)?.dataset.readingLazyAnchor).toBe("true");
      view.rerender(<ChartReadingWorkbench {...props}/>);
      await waitFor(() => expect(document.getElementById(targetId)?.dataset.readingLazyAnchor).toBeUndefined());
      const target = document.getElementById(targetId)!;
      expect(target).not.toBeNull(); expect(target.closest("details:not([open])")).toBeNull();
      expect(target.textContent).toContain(section.title);
      const outer = view.container.querySelector<HTMLDetailsElement>(".reading-brief-background")!;
      await userEvent.click(outer.querySelector("summary")!); expect(outer.open).toBe(false);
      await userEvent.click(screen.getByRole("link", { name: "展开逐年判断与完整依据" }));
      await waitFor(() => expect(outer.open).toBe(true));
      expect(document.getElementById(targetId)).toBe(target);
    } finally { window.history.replaceState(null, "", oldUrl); }
  });
  it("keeps feedback targeting and typed experience independent of the unmounted background", async () => {
    const props = { revision: b.revision, caseName: "合成反馈定位", assessment: b.assessment, annualOutlook: b.annual,
      priorities: b.priorities, annualEvents: b.events, briefReport: bBackground.brief, onAddFeedback: vi.fn() };
    const view = render(<ChartReadingWorkbench {...props} feedbackTarget={{ id: "natal-overview", requestId: 1 }}/>);
    expect(revealReadingSection("reading-feedback")).toBe(screen.getByRole("region", { name: "本次反馈" }));
    fireEvent.change(screen.getByLabelText("实际情况"), { target: { value: "既有反馈草稿不应丢失" } });
    view.rerender(<ChartReadingWorkbench {...props} feedbackTarget={{ id: "annual-2030", requestId: 2 }}/>);
    await waitFor(() => expect(screen.getByLabelText("要反馈的原结论")).toHaveProperty("value", "annual-2030"));
    expect(screen.getByLabelText("实际情况")).toHaveProperty("value", "既有反馈草稿不应丢失");
    expect(view.container.querySelector(".reading-brief-background .reading-priority-years")).toBeNull();
  });
  it("shows B2030's trial and B2032's combined closeout before full domains through the workbench", async () => {
    const before = JSON.stringify(b);
    const year2030 = b.events.years.find((year) => year.year === 2030)!, year2032 = b.events.years.find((year) => year.year === 2032)!;
    const source2030 = year2030.branches[0]!.segments[0]!, source2032 = year2032.branches[0]!.segments[0]!;
    const trial = source2030.items.find((item) => item.id === "career-proposal")!;
    const closeout = composeAnnualEvents(year2032).branches[0]!.segments[0]!.items.find((item) => item.kind === "settlement")!;
    expect(trial).toBeDefined();
    if (closeout.kind !== "settlement") throw new Error("actual B2032 must compose");
    expect(trial.title).not.toBe(closeout.title);
    expect(trial.summary).not.toBe(closeout.members[0].summary);
    const projected = projectPriorityAnnualEvents(b.priorities, b.events);
    for (const [year, segment] of [[2030, source2030], [2032, source2032]] as const) {
      expect(projected.has(priorityEventKey(year, segment.branchId, segment.id))).toBe(true);
    }
    render(<ChartReadingWorkbench revision={b.revision} caseName="合成 B" assessment={b.assessment} annualOutlook={b.annual} priorities={b.priorities} annualEvents={b.events} />);
    const thirty = await card(2030), thirtyTwo = await card(2032);
    const trialNavigation = navigation(thirty).querySelector<HTMLElement>('[data-event-id="career-proposal"]')!;
    expect(within(trialNavigation).getByText(trial.title).closest("details:not([open])")).toBeNull();
    expect(within(navigation(thirty)).queryByText(trial.summary)).toBeNull();
    const group = navigation(thirtyTwo).querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    expect(group).toBeTruthy(); expect(group.closest("details:not([open])")).toBeNull();
    expect(within(group).getByText(closeout.title)).toBeTruthy();
    expect(within(group).queryByText(closeout.summary)).toBeNull();
    expect(thirty.querySelector('[data-event-id="settlement-closeout"]')).toBeNull();
    for (const [element, source] of [[thirty, source2030], [thirtyTwo, source2032]] as const) {
      expectPeriod(navigation(element), source);
      const full = await openFullYear(element);
      const mainEvents = full.querySelector(".reading-priority-main-events")!;
      expect(mainEvents).toBeTruthy();
      expect(mainEvents.querySelectorAll(":scope > article").length).toBeLessThanOrEqual(2);
      expectCompleteEvents(full, source);
      const domains = within(full).getByText("展开事业、财务与关系的完整解释").closest("details")!;
      expect(domains.open).toBe(false);
      await userEvent.click(domains.querySelector("summary")!);
      expect(domains.open).toBe(true);
      expect(domains.querySelectorAll(".reading-priority-domain")).toHaveLength(3);
      for (const domain of domains.querySelectorAll(".reading-priority-domain")) expect(domain.closest("details:not([open])")).toBeNull();
    }
    expect(JSON.stringify(b)).toBe(before);
  });

  it("keeps unknown2028's two directions and the actual two reverse segments separate", async () => {
    render(<ReadingPrioritiesPanel reading={unknown.priorities} annualEvents={unknown.events} />);
    const original = unknown.events.years[0]!;
    expect(original.branches.map((branch) => branch.segments.length).sort()).toEqual([1, 2]);
    for (const branch of original.branches) {
      const priorityBranch = unknown.priorities.branches.find((item) => item.id === branch.id)!;
      const element = await card(2028, screen.getByRole("region", { name: priorityBranch.label }));
      const previews = navigation(element).querySelectorAll<HTMLElement>("[data-navigation-segment]");
      expect(previews).toHaveLength(branch.segments.length);
      branch.segments.forEach((segment, index) => {
        const preview = previews[index]!;
        expect(preview.dataset.navigationSegment).toBe(segment.id);
        expectPeriod(preview, segment);
        for (const item of segment.items) {
          const itemNavigation = preview.querySelector<HTMLElement>(`[data-event-id="${item.id}"]`)!;
          expect(within(itemNavigation).getByText(item.title).closest("details:not([open])")).toBeNull();
        }
      });
      const full = await openFullYear(element);
      const segments = full.querySelectorAll<HTMLElement>(".reading-priority-segment");
      expect(segments).toHaveLength(branch.segments.length);
      branch.segments.forEach((segment, index) => {
        const rendered = segments[index]!;
        expectPeriod(rendered, segment);
        const study = segment.items.find((item) => item.id === "career-study");
        if (study) expect(within(rendered).getByText(study.summary).closest("details:not([open])")).toBeNull();
        expect(element.textContent).toContain(segment.judgmentCaption);
        expectCompleteEvents(rendered, segment);
      });
    }
    const reverse = original.branches.find((branch) => branch.id === "backward")!;
    expect(reverse.segments[0]!.endExclusiveInstant).toBe(reverse.segments[1]!.startInstant);
    expect(reverse.segments[1]!.startInstant).toBe("2028-12-20T20:58:00.000Z");
  });

  it("rejects mismatched source, year, branch, exact boundaries, target and background instead of borrowing", () => {
    const year = b.events.years.find((item) => item.year === 2032)!, segment = year.branches[0]!.segments[0]!;
    const key = priorityEventKey(2032, year.branches[0]!.id, segment.id);
    expect(projectPriorityAnnualEvents(b.priorities, b.events).has(key)).toBe(true);
    const edits: Array<(value: LocalReadingAnnualEvents) => void> = [
      (value) => { value.sourceBinding.revisionId = "other-revision"; },
      (value) => { value.sourceBinding.chartResultHash = "different-hash"; },
      (value) => { value.sourceBinding.includeHour = !value.sourceBinding.includeHour; },
      (value) => { value.years.push(structuredClone(value.years.find((item) => item.year === 2032)!)); },
      (value) => { value.years.find((item) => item.year === 2032)!.yearNodeRef!.startInstant = "2032-02-04T06:49:00.000Z"; },
      (value) => { value.years.find((item) => item.year === 2032)!.branches[0]!.id = "forward"; },
      (value) => { value.years.find((item) => item.year === 2032)!.branches[0]!.segments[0]!.id += "-changed"; },
      (value) => { value.years.find((item) => item.year === 2032)!.branches[0]!.segments[0]!.startInstant = "2032-02-04T06:49:00.000Z"; },
      (value) => { value.years.find((item) => item.year === 2032)!.branches[0]!.segments[0]!.backgroundRefs = []; },
      (value) => { value.years.find((item) => item.year === 2032)!.branches[0]!.segments[0]!.policyVersion = "wrong-version"; }
    ];
    for (const edit of edits) { const value = structuredClone(b.events); edit(value); const before = JSON.stringify(value);
      expect(projectPriorityAnnualEvents(b.priorities, value).has(key)).toBe(false); expect(JSON.stringify(value)).toBe(before); }
  });

  it("falls back to original domains for a foreign case or unbound event collection", async () => {
    const events = structuredClone(b.events); events.sourceBinding.caseId = "another-case";
    render(<ChartReadingWorkbench revision={b.revision} caseName="合成 B" assessment={b.assessment} annualOutlook={b.annual} priorities={b.priorities} annualEvents={events} />);
    const element = await card(2032);
    expect(element.querySelector(".reading-priority-main-events")).toBeNull();
    expect(navigation(element).querySelector("[data-event-id]")).toBeNull();
    const original = b.priorities.branches[0]!.years.find((year) => year.year === 2032)!.segments[0]!;
    for (const domain of original.domains) {
      expect(within(navigation(element)).getByText(`${domain.title}：${domain.headline}`).closest("details:not([open])")).toBeNull();
    }
    const full = await openFullYear(element);
    expect(full.querySelectorAll(".reading-priority-domain")).toHaveLength(3);
    for (const domain of full.querySelectorAll(".reading-priority-domain")) expect(domain.closest("details:not([open])")).toBeNull();
    for (const domain of original.domains) {
      expect(full.textContent).toContain(domain.summary);
      for (const text of [...domain.examples, ...domain.conditions, ...domain.evidence]) expect(full.textContent).toContain(text);
    }
  });

  it("keeps a settlement member's adopted text visible in its own scope, with the other side unchanged", async () => {
    const original = b.events.years.find((year) => year.year === 2032)!, composed = composeAnnualEvents(original);
    const branch = original.branches[0]!, segment = branch.segments[0]!, member = segment.items.find((item) => item.id === "career-settlement")!;
    const group = composed.branches[0]!.segments[0]!.items.find((item) => item.kind === "settlement")!;
    const own = "本人本年没有在职项目，主要在完成自己的课程。";
    render(<PersonalReadingProvider reading={personal(annualEventFeedbackSubjectId(2032, segment, member), annualEventFeedbackText(original, branch, segment, member), own)}>
      <ReadingPrioritiesPanel reading={b.priorities} annualEvents={b.events} /></PersonalReadingProvider>);
    const element = await card(2032), preview = navigation(element).querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    expect(within(preview).getByText(own).closest("details:not([open])")).toBeNull();
    expect(within(preview).getByText(member.summary).closest("details:not([open])")).not.toBeNull();
    const wealth = group.members.find((item) => item.domain === "wealth")!;
    expect(within(preview).queryByText(wealth.summary)).toBeNull();
    const full = await openFullYear(element), facets = full.querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    expect(within(facets).getByText(own).closest("details:not([open])")).toBeNull();
    expect(within(facets).getByText(member.summary).closest("details:not([open])")).not.toBeNull();
    expect(within(facets).getByText(wealth.summary).closest("details:not([open])")).toBeNull();
    expectCompleteEvents(full, segment);
  });

  it("keeps the whole settlement adoption separate from member adoptions and the original group", async () => {
    const original = b.events.years.find((year) => year.year === 2032)!, composed = composeAnnualEvents(original);
    const branch = composed.branches[0]!, segment = branch.segments[0]!, group = segment.items.find((item) => item.kind === "settlement")!;
    if (group.kind !== "settlement") throw new Error("actual B2032 must compose");
    const whole = "本人采用：今年先处理已有约定，不增加新的合作。";
    render(<PersonalReadingProvider reading={personal(annualEventCompositionSubjectId(2032, segment, group), annualEventCompositionFeedbackText(original, original.branches[0]!, original.branches[0]!.segments[0]!, group), whole)}>
      <ReadingPrioritiesPanel reading={b.priorities} annualEvents={b.events} /></PersonalReadingProvider>);
    const element = await card(2032), preview = navigation(element).querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    expect(within(preview).getByText(whole).closest("details:not([open])")).toBeNull();
    expect(within(preview).getByText(group.title).closest("details:not([open])")).not.toBeNull();
    const full = await openFullYear(element), article = full.querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    expect(within(article).getByText(whole).closest("details:not([open])")).toBeNull();
    const originalGroup = within(article).getByText(group.summary), comparison = originalGroup.closest("details")!;
    expect(comparison.open).toBe(false);
    expect(article.querySelectorAll(".reading-priority-event-facet")).toHaveLength(2);
    for (const facet of article.querySelectorAll<HTMLElement>(".reading-priority-event-facet")) expect(within(facet).queryByText(whole)).toBeNull();
    for (const member of group.members) expect(within(article).getByText(member.summary).closest("details:not([open])")).toBeNull();
    await userEvent.click(comparison.querySelector("summary")!);
    expect(originalGroup.closest("details:not([open])")).toBeNull();
    expectCompleteEvents(full, original.branches[0]!.segments[0]!);
  });

  it("retains the two-year same-branch comparison with distinct actual event summaries and exact periods", async () => {
    render(<ReadingPrioritiesPanel reading={b.priorities} annualEvents={b.events} />);
    const label = screen.getByText(`并列比较两年 · ${b.priorities.branches[0]!.label}`), comparison = label.closest("details")!;
    await userEvent.click(label);
    await userEvent.selectOptions(within(comparison).getByLabelText("比较年份一"), "2030");
    await userEvent.selectOptions(within(comparison).getByLabelText("比较年份二"), "2032");
    const left = within(comparison).getByRole("article", { name: `${b.priorities.branches[0]!.label} · 2030年比较` });
    const right = within(comparison).getByRole("article", { name: `${b.priorities.branches[0]!.label} · 2032年比较` });
    const trial = b.events.years.find((item) => item.year === 2030)!.branches[0]!.segments[0]!.items.find((item) => item.id === "career-proposal")!;
    const closeout = right.querySelector<HTMLElement>('[data-event-id="settlement-closeout"]')!;
    const trialArticle = left.querySelector<HTMLElement>('[data-event-id="career-proposal"]')!;
    expect(within(trialArticle).getByRole("heading", { name: trial.title, level: 5 }).closest("details:not([open])")).toBeNull();
    expect(within(trialArticle).getByText(trial.summary).closest("details:not([open])")).toBeNull();
    expect(closeout).toBeTruthy();
    expect(within(closeout).getByRole("heading", { level: 5 }).textContent).not.toBe(trial.title);
    for (const [element, year] of [[left, 2030], [right, 2032]] as const) {
      const source = b.events.years.find((item) => item.year === year)!.branches[0]!.segments[0]!;
      expectPeriod(element, source);
      expect(element.textContent).toContain(source.judgmentCaption);
      expectCompleteEvents(element, source);
    }
  });
});
