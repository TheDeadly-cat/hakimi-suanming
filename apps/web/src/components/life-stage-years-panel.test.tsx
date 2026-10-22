import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "../lib/local-detailed-outlook";
import { buildLifeStageStory } from "../lib/local-life-stage-story";
import { buildLocalAnnualOutlookRange } from "../lib/local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { buildReadingAnnualEvents } from "../lib/local-annual-event-record";
import { buildLifeStageYears, type BuildLifeStageYearsInput } from "../lib/local-life-stage-years";
import { lifeStageYearSubjectId } from "../lib/local-life-stage-years-record";
import { resolveLifeStageAnnualRange } from "../lib/local-annual-range";
import { LifeStageYearsPanel } from "./life-stage-years-panel";
import { DetailedOutlookPanel } from "./detailed-outlook-panel";

let input: BuildLifeStageYearsInput;
let bridge: ReturnType<typeof buildLifeStageYears>;
let range: Awaited<ReturnType<typeof resolveLifeStageAnnualRange>>;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic stage-year UI", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, 2026);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2029, 2039);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  input = { revision, assessment, life, lifeStageStory: buildLifeStageStory({ revision, assessment, life }), annual, annualDomains,
    annualEvents: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }), selectedDecadeId: life.decades.find((stage) => stage.ganZhi === "丁丑")!.id };
  bridge = buildLifeStageYears(input);
  range = await resolveLifeStageAnnualRange({ ...input, decadeId: input.selectedDecadeId });
}, 60_000);
afterEach(cleanup);

it("shows every original year, separates the handover boundary, and opens the requested annual reading and feedback", () => {
  const onYearChange = vi.fn(), onFeedback = vi.fn();
  const view = render(<LifeStageYearsPanel bridge={bridge} range={range} onYearChange={onYearChange} onFeedback={onFeedback} />);
  expect(view.container.querySelectorAll("[data-stage-year]")).toHaveLength(11);
  expect(view.container.querySelectorAll(".life-stage-years > [data-stage-year]")).toHaveLength(4);
  const rest = view.container.querySelector<HTMLDetailsElement>(".life-stage-years-rest")!;
  expect(rest.open).toBe(false);
  const firstYear = view.container.querySelector('[data-stage-year="2029"]')!;
  expect(firstYear.textContent).toContain("2029/05/23");
  expect(firstYear.textContent).not.toContain("2029/02/03");
  for (const year of bridge.years) {
    const region = view.container.querySelector(`[data-stage-year="${year.year}"]`)!;
    for (const segment of year.segments) for (const paragraph of segment.paragraphs) expect(region.textContent).toContain(paragraph);
  }
  fireEvent.click(within(firstYear as HTMLElement).getByRole("link", { name: "读 2029 年的完整解读与月份 →" }));
  expect(onYearChange).toHaveBeenCalledWith(2029);
  fireEvent.click(within(firstYear as HTMLElement).getByRole("link", { name: "反馈这段年份说明" }));
  expect(onFeedback).toHaveBeenCalledWith(lifeStageYearSubjectId(bridge, bridge.years[0]!));
});

it("offers full-stage loading for the initial partial window, hides stale prose while loading, and keeps unavailable stages honest", () => {
  const onLoadAll = vi.fn();
  const view = render(<LifeStageYearsPanel bridge={bridge} onLoadAll={onLoadAll} onYearChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "读取这步大运的全部年份" }));
  expect(onLoadAll).toHaveBeenCalledTimes(1);
  view.rerender(<LifeStageYearsPanel bridge={bridge} loading onYearChange={vi.fn()} />);
  expect(view.container.querySelector("[data-stage-year]")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("正在整理");
  view.rerender(<LifeStageYearsPanel bridge={null} range={{ ...range, status: "unavailable", startYear: null, endYear: null,
    gaps: [{ startInstant: range.startInstant, endExclusiveInstant: range.endExclusiveInstant, message: "测试支持范围外" }] }} onLoadAll={onLoadAll} onYearChange={vi.fn()} />);
  expect(screen.getByText("这步大运的年度超出当前支持范围，阶段说明仍可阅读。")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "读取这步大运的全部年份" })).toBeNull();
  expect(view.container.querySelector("[data-stage-year]")).toBeNull();
});

it("keeps controlled decade selection, rejects another stage's bridge, and never relabels eleven years as ten", () => {
  const onSelectDecade = vi.fn();
  const props = { life: input.life, lifeStageStory: input.lifeStageStory, selectedDecadeId: input.selectedDecadeId, onSelectDecade,
    monthly: null, lifeLoading: false, monthlyLoading: false, lifeError: null, monthlyError: null, year: 2029, onYearChange: vi.fn(),
    lifeStageYears: bridge, stageAnnualRange: range, annualYears: input.annual.years };
  const view = render(<DetailedOutlookPanel {...props} />);
  expect(screen.getByRole("group", { name: /^流年总览$/u })).toBeTruthy();
  expect(view.container.querySelectorAll("[data-stage-year]")).toHaveLength(11);
  const next = input.life.decades.find((stage) => stage.ganZhi === "丙子")!;
  fireEvent.change(screen.getByLabelText("选择人生阶段"), { target: { value: next.id } });
  expect(onSelectDecade).toHaveBeenCalledWith(next.id);
  view.rerender(<DetailedOutlookPanel {...props} selectedDecadeId={next.id} />);
  expect(view.container.querySelector("[data-stage-year]")).toBeNull();
  expect(view.container.querySelector("[data-stage-story]")!.getAttribute("data-stage-story")).toBe(next.id);
  fireEvent.click(screen.getByRole("button", { name: "读取这步大运的全部年份" }));
  expect(onSelectDecade).toHaveBeenLastCalledWith(next.id);
});
