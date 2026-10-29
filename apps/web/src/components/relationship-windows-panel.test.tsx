import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "../lib/local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId } from "../lib/local-annual-event-record";
import { buildReadingPriorities } from "../lib/local-reading-priorities";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { PersonalReadingProvider } from "./personal-reading-note";
import { RelationshipWindowsPanel } from "./relationship-windows-panel";

async function fixture(date = "1995-08-18", sex: "male" | "unspecified" = "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic relationship windows", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: true, startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  return { events: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }), priorities: buildReadingPriorities({ revision, annual, annualDomains }) };
}
let data: Awaited<ReturnType<typeof fixture>>, male: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { [data, male] = await Promise.all([fixture(), fixture("1995-08-18", "male")]); });
afterEach(cleanup);

describe("relationship year index", () => {
  it("groups A's identical 2029 and 2030 answers but retains the different 2031 examples and each year link", () => {
    const items = [2029, 2030, 2031].map((year) => male.events.years.find((item) => item.year === year)!.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!);
    expect(items[0]!.summary).toBe(items[1]!.summary); expect(items[0]!.examples).toEqual(items[1]!.examples);
    expect(items[2]!.examples).not.toEqual(items[1]!.examples);
    const onSelectYear = vi.fn(), before = JSON.stringify(male);
    render(<RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} onSelectYear={onSelectYear} selectedYear={2030} />);
    const visible = screen.getAllByText((_text, element) => element?.tagName === "P" && element.textContent === items[0]!.summary).filter((element) => !element.closest("details:not([open])"));
    expect(visible).toHaveLength(2); // 2029–30 once; 2031 keeps different examples.
    expect(screen.getByText("2029—2030 年")).toBeTruthy();
    const group = screen.getByText("2029—2030 年").closest("li")!;
    expect(within(group).getAllByText((_text, element) => element?.tagName === "P" && element.textContent === items[0]!.summary).filter((element) => !element.closest("details:not([open])"))).toHaveLength(1);
    for (const year of [2029, 2030]) {
      const link = screen.getByRole("link", { name: `阅读 ${year} 年` }); fireEvent.click(link);
      expect(onSelectYear).toHaveBeenLastCalledWith(year); expect(link.getAttribute("href")).toBe("#reading-yearly");
      expect(link.getAttribute("aria-current")).toBe(year === 2030 ? "date" : null);
      const details = screen.getByText(`${year} 年原文、依据与适用条件`).closest("details")!;
      fireEvent.click(details.querySelector("summary")!); expect(details.open).toBe(true);
      const original = male.events.years.find((item) => item.year === year)!.branches[0]!.segments[0]!, item = original.items.find((item) => item.domain === "relationship")!;
      expect(details.textContent).toContain(item.summary);
      for (const line of [...item.examples, ...item.why, ...item.conditions, ...item.evidence]) expect(details.textContent).toContain(line);
      expect(document.querySelector(`time[datetime="${original.personalStartInstant}"]`)).not.toBeNull();
    }
    for (const example of items[2]!.examples) expect(screen.getAllByText(example).some((element) => !element.closest("details:not([open])"))).toBe(true);
    expect(JSON.stringify(male)).toBe(before);
  });
  it("keeps every actual period addressable and each original answer visible individually or in its continuous group", () => {
    const onSelectYear = vi.fn(), before = JSON.stringify(data);
    render(<RelationshipWindowsPanel reading={data.priorities} annualEvents={data.events} onSelectYear={onSelectYear} />);
    const panel = screen.getByRole("region", { name: "感情与共同生活的年份重点" });
    for (const year of data.events.years) for (const branch of year.branches) for (const segment of branch.segments) for (const item of segment.items.filter((item) => item.relationshipTiming?.triggered)) {
      const branchPanel = within(panel).getByRole("region", { name: `${branch.label}的关系年份` });
      expect(branchPanel.textContent).toContain(item.title); expect(branchPanel.textContent).toContain(item.summary);
      const answers = within(branchPanel).getAllByText((_text, element) => element?.tagName === "P" && element.textContent === item.summary);
      expect(answers.some((answer) => answer.closest("details:not([open])") === null)).toBe(true);
      for (const example of item.examples) expect(within(branchPanel).getAllByText(example).some((element) => element.closest("details:not([open])") === null)).toBe(true);
      expect(branchPanel.querySelector(`time[datetime="${segment.personalStartInstant}"]`)).not.toBeNull();
    }
    const link = within(panel).getAllByRole("link", { name: "阅读这一年" })[0]!;
    const year = Number(link.parentElement!.querySelector("strong")!.textContent!.match(/\d{4}/)![0]);
    fireEvent.click(link); expect(onSelectYear).toHaveBeenCalledWith(year); expect(link.getAttribute("href")).toBe("#reading-yearly");
    const summary = panel.querySelector("summary")!; fireEvent.click(summary); expect(summary.parentElement!.hasAttribute("open")).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
  it("does not turn background-only or borrowed-scope metadata into new annual windows", () => {
    for (const mode of ["background", "scope"] as const) {
      const events = structuredClone(data.events);
      for (const year of events.years) for (const branch of year.branches) for (const segment of branch.segments) for (const item of segment.items) if (item.relationshipTiming) {
        if (mode === "background") { item.relationshipTiming.triggered = false; for (const lens of item.relationshipTiming.lenses) lens.focus = "background_only"; }
        else item.relationshipTiming.scope.startInstant = "1900-01-01T00:00:00Z";
      }
      const view = render(<RelationshipWindowsPanel reading={data.priorities} annualEvents={events} />);
      expect(screen.queryByRole("region", { name: "感情与共同生活的年份重点" })).toBeNull(); view.unmount();
    }
  });
  it("uses family and peer language for children and keeps a single remaining conditional branch labelled", async () => {
    const child = await fixture("2019-12-22"), remaining = structuredClone(child.events);
    for (const year of remaining.years) for (const branch of year.branches.filter((branch) => branch.id === "backward")) for (const segment of branch.segments) for (const item of segment.items) if (item.relationshipTiming) item.relationshipTiming.triggered = false;
    render(<RelationshipWindowsPanel reading={child.priorities} annualEvents={remaining} />);
    const panel = screen.getByRole("region", { name: "家人、同伴与共同活动的年份重点" });
    expect(within(panel).getByRole("heading", { name: "若按顺行" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "感情与共同生活的年份重点" })).toBeNull();
  });
  it("keeps an adopted personal answer above the automatic window text", () => {
    const year = data.events.years.find((year) => year.branches.some((branch) => branch.segments.some((segment) => segment.items.some((item) => item.relationshipTiming?.triggered))))!;
    const branch = year.branches.find((branch) => branch.segments.some((segment) => segment.items.some((item) => item.relationshipTiming?.triggered)))!;
    const segment = branch.segments.find((segment) => segment.items.some((item) => item.relationshipTiming?.triggered))!, item = segment.items.find((item) => item.relationshipTiming?.triggered)!;
    const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: data.events.sourceBinding, sourceVersions: [], issues: [], entries: [{
      subjectId: annualEventFeedbackSubjectId(year.year, segment, item), subjectLabel: "合成关系修订", originalConclusion: item.summary, readingVersions: year.sourceVersions,
      state: "adopted", personalText: "本人采用的关系说明", effectiveConclusion: "本人采用的关系说明", feedback: [], selectedReviewRefs: [], issues: [] }] };
    render(<PersonalReadingProvider reading={personal}><RelationshipWindowsPanel reading={data.priorities} annualEvents={data.events} /></PersonalReadingProvider>);
    const note = screen.getByRole("region", { name: "合成关系修订 · 个人阅读" });
    expect(within(note).getByText("本人采用的关系说明").closest("details:not([open])")).toBeNull();
    const originalParagraph = within(note).getByText((_text, element) => element?.tagName === "P" && element.textContent === item.summary);
    expect(originalParagraph.closest("details:not([open])")).not.toBeNull();
  });
  it("splits a continuous group immediately when a member is adopted and restores it when personal feedback is removed", () => {
    const year = male.events.years.find((item) => item.year === 2029)!, segment = year.branches[0]!.segments[0]!, item = segment.items.find((item) => item.domain === "relationship")!;
    const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: male.events.sourceBinding, sourceVersions: [], issues: [], entries: [{
      subjectId: annualEventFeedbackSubjectId(2029, segment, item), subjectLabel: "2029关系个人修订", originalConclusion: item.summary, readingVersions: year.sourceVersions,
      state: "adopted", personalText: "2029年本人采用的完整说明\n第二段也保留。", effectiveConclusion: "2029年本人采用的完整说明\n第二段也保留。", feedback: [], selectedReviewRefs: [], issues: [] }] };
    const view = render(<PersonalReadingProvider reading={null}><RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} /></PersonalReadingProvider>);
    expect(screen.getByText("2029—2030 年")).toBeTruthy();
    view.rerender(<PersonalReadingProvider reading={personal}><RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} /></PersonalReadingProvider>);
    expect(screen.queryByText("2029—2030 年")).toBeNull();
    const note = screen.getByRole("region", { name: "2029关系个人修订 · 个人阅读" });
    expect(note.querySelector(".personal-reading-adopted p")!.textContent).toBe(personal.entries[0]!.personalText);
    expect(within(note).getByText((_text, element) => element?.tagName === "P" && element.textContent === item.summary).closest("details:not([open])")).not.toBeNull();
    expect(screen.getByText("2030 年").closest("li")!.querySelector(".relationship-window-answer")!.closest("details:not([open])")).toBeNull();
    view.rerender(<PersonalReadingProvider reading={null}><RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} /></PersonalReadingProvider>);
    expect(screen.getByText("2029—2030 年")).toBeTruthy();
  });
  it("keeps year/domain/event feedback scopes separate, ignores wrong-source feedback, and preserves differing applicability", () => {
    const year = male.events.years.find((item) => item.year === 2029)!, segment = year.branches[0]!.segments[0]!, item = segment.items.find((item) => item.domain === "relationship")!;
    const subjectIds = ["annual-2029", `annual-domain-2029-${segment.id}-relationship`, annualEventFeedbackSubjectId(2029, segment, item)];
    for (const subjectId of subjectIds) {
      const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: male.events.sourceBinding, sourceVersions: [], issues: [], entries: [{
        subjectId, subjectLabel: "单独保留反馈", originalConclusion: item.summary, readingVersions: year.sourceVersions, state: "feedback_only", personalText: null, effectiveConclusion: item.summary, feedback: [], selectedReviewRefs: [], issues: [] }] };
      const view = render(<PersonalReadingProvider reading={personal}><RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} /></PersonalReadingProvider>);
      expect(screen.queryByText("2029—2030 年")).toBeNull(); view.unmount();
    }
    const wrong: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { ...male.events.sourceBinding, chartResultHash: "f".repeat(64) }, sourceVersions: [], issues: [], entries: [{
      subjectId: subjectIds[2]!, subjectLabel: "其他来源", originalConclusion: item.summary, readingVersions: year.sourceVersions, state: "adopted", personalText: "不得显示的其他来源文本", effectiveConclusion: "不得显示的其他来源文本", feedback: [], selectedReviewRefs: [], issues: [] }] };
    const wrongView = render(<PersonalReadingProvider reading={wrong}><RelationshipWindowsPanel reading={male.priorities} annualEvents={male.events} /></PersonalReadingProvider>);
    expect(screen.getByText("2029—2030 年")).toBeTruthy(); expect(screen.queryByText("不得显示的其他来源文本")).toBeNull(); wrongView.unmount();
    const changed = structuredClone(male.events);
    changed.years.find((value) => value.year === 2030)!.branches[0]!.segments[0]!.items.find((value) => value.domain === "relationship")!.applicability.push("仅当这一年实际适用的附加条件");
    render(<RelationshipWindowsPanel reading={male.priorities} annualEvents={changed} />);
    expect(screen.queryByText("2029—2030 年")).toBeNull(); expect(screen.getByText("2029 年")).toBeTruthy(); expect(screen.getByText("2030 年")).toBeTruthy();
  });
  it("does not merge a handover year even if its two period texts match the next year", () => {
    const changed = structuredClone(male.events), next = changed.years.find((year) => year.year === 2029)!.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    const handover = changed.years.find((year) => year.year === 2028)!.branches[0]!;
    expect(handover.segments).toHaveLength(2);
    for (const segment of handover.segments) {
      const item = segment.items.find((item) => item.domain === "relationship")!;
      item.title = next.title; item.summary = next.summary; item.examples = [...next.examples]; item.applicability = [...next.applicability]; item.notApplicableWhen = [...next.notApplicableWhen];
    }
    render(<RelationshipWindowsPanel reading={male.priorities} annualEvents={changed} />);
    expect(screen.queryByText("2028—2029 年")).toBeNull(); expect(screen.queryByText("2028—2030 年")).toBeNull();
    const row = screen.getByText("2028 年").closest("li")!;
    expect(within(row).getByText("第 1 段")).toBeTruthy(); expect(within(row).getByText("第 2 段")).toBeTruthy();
    for (const segment of handover.segments) expect(row.querySelector(`time[datetime="${segment.personalStartInstant}"]`)).not.toBeNull();
  });
});
