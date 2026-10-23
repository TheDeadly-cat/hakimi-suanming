import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { annualHandoverPresentation, outlookDirectionCaption, summarizeAnnualJudgmentCaptions } from "./outlook-judgment-presentation";
import { DetailedOutlookPanel } from "../components/detailed-outlook-panel";
import { ChartReadingWorkbench } from "../components/chart-reading-workbench";
import { ReadingPeriodSummary } from "../components/reading-period-summary";
import { plainYearCaption, plainYearSummary } from "./plain-year-overview";
import { PersonalReadingProvider } from "../components/personal-reading-note";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "./local-personal-reading";

async function fixture(date: string, sex: "male" | "unspecified", start: number, end: number) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic handover presentation", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-19T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, annual: await buildLocalAnnualOutlookRange(revision, assessment, start, end) };
}
let b: Awaited<ReturnType<typeof fixture>>, unknown: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { [b, unknown] = await Promise.all([fixture("1995-05-18", "male", 2028, 2029), fixture("1995-08-18", "unspecified", 2027, 2027)]); });
afterEach(cleanup);
const base = { life: null, monthly: null, lifeLoading: false, monthlyLoading: false, lifeError: null, monthlyError: null };
const year = () => b.annual.years[1]!;

it("presents B2029's actual consecutive luck change without changing its stored aggregate", () => {
  const actual = year(), original = JSON.stringify(actual), archiveCaption = summarizeAnnualJudgmentCaptions(b.annual);
  expect(actual.judgmentSegments.map(segment => segment.judgment.axes.find(axis => axis.axis === "pattern")!.effect)).toEqual(["assists", "mixed"]);
  const result = annualHandoverPresentation(actual)!;
  expect(result.caption).toBe("交运前后分别看");
  expect(result.summary).toContain("2029-05-23 00:20");
  for (const segment of actual.judgmentSegments) expect(result.summary).toContain(outlookDirectionCaption(segment.judgment, segment.judgment.label));
  expect(JSON.stringify(actual)).toBe(original);
  expect(summarizeAnnualJudgmentCaptions(b.annual)).toBe(archiveCaption);
});

it("leaves a single-stage year unchanged", () => {
  expect(b.annual.years[0]!.judgmentSegments).toHaveLength(1);
  expect(annualHandoverPresentation(b.annual.years[0]!)).toBeNull();
});

it("does not mistake parallel unknown-direction branches for a handover", () => {
  const actual = unknown.annual.years[0]!;
  expect(actual.judgmentSegments).toHaveLength(2);
  expect(new Set(actual.judgmentSegments.map(segment => segment.branchId)).size).toBe(2);
  expect(annualHandoverPresentation(actual)).toBeNull();
});

it("uses the same handover caption in the annual card and selected detail", () => {
  const actual = year(), view = render(<DetailedOutlookPanel {...base} annualYear={actual} annualYears={b.annual.years} year={2029} onYearChange={vi.fn()} />);
  expect(view.container.querySelector('button[aria-pressed="true"] .outlook-year-direction')?.textContent).toBe(plainYearCaption(actual));
  expect(view.container.querySelector('.annual-full-reading .outlook-reading-title span')?.textContent).toBe(plainYearCaption(actual));
  expect(view.container.querySelector('.annual-full-reading .outlook-lead')?.textContent).toBe(plainYearSummary(actual));
});

it("uses the same scoped summary in both workbench first-screen entries", () => {
  const actual = year(), view = render(<ChartReadingWorkbench revision={b.revision} caseName="Synthetic B" assessment={b.assessment} annualOutlook={b.annual} selectedYear={2029} />);
  const summary = plainYearSummary(actual);
  expect([...view.container.querySelectorAll('p')].filter(p => p.textContent === summary)).toHaveLength(2);
  expect(view.container.querySelector('.reading-annual-summary')?.textContent).toBe(summary);
});

it("keeps yearly navigation and its callback aligned", () => {
  const onSelectYear = vi.fn(), view = render(<ReadingPeriodSummary annual={b.annual} life={null} onSelectYear={onSelectYear} />);
  const link = screen.getByRole("link", { name: "2029年 · 交运前后分别看", hidden: true });
  fireEvent.click(link); expect(onSelectYear).toHaveBeenCalledWith(2029);
  expect(view.container.querySelector('.reading-year-summary')?.textContent).toContain("2029年：交运前后分别看");
});

it("retains the existing annual personal-adoption scope around the new summary", () => {
  const actual = year(), personalText = "我的交运前后生活记录";
  const reading: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { ...b.assessment.sourceBinding, caseId: b.revision.caseId }, sourceVersions: [], issues: [], entries: [{
    subjectId: "annual-2029", subjectLabel: "2029年", originalConclusion: actual.summary, readingVersions: [], state: "adopted", personalText, effectiveConclusion: personalText,
    feedback: [], selectedReviewRefs: [], issues: [] }] };
  const view = render(<PersonalReadingProvider reading={reading}><ChartReadingWorkbench revision={b.revision} caseName="Synthetic B" assessment={b.assessment} annualOutlook={b.annual} selectedYear={2029} /></PersonalReadingProvider>);
  const summaries = [...view.container.querySelectorAll('p')].filter(p => p.textContent === plainYearSummary(actual));
  expect(summaries).toHaveLength(2);
  for (const summary of summaries) expect(summary.closest('details:not([open])')).toBeTruthy();
  expect(screen.getAllByText(personalText).some(node => !node.closest('details:not([open])'))).toBe(true);
});
