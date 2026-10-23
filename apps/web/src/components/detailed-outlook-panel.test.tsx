import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { NATAL_WEALTH_RESOURCE_SOURCES } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-sources";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { buildAnnualEventScenarios } from "../lib/annual-event-scenarios";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading, type LocalAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { buildReadingAnnualEvents } from "../lib/local-annual-event-record";
import { buildAnnualLifeStory, buildReadingAnnualLifeStories } from "../lib/annual-life-story";
import { buildAnnualReaderAnswer } from "../lib/annual-reader-answer";
import { annualAnswerYearTitle } from "../lib/annual-answer-navigation";
import { outlookDirectionCaption } from "../lib/outlook-judgment-presentation";
import { plainYearCaption, plainYearSummary, plainYearTopic } from "../lib/plain-year-overview";
import { DetailedOutlookPanel } from "./detailed-outlook-panel";
import { buildLocalMonthlyOutlook, type LocalMonthlyOutlook } from "../lib/local-detailed-outlook";
import { buildMonthlyDomainReadings, type LocalMonthlyDomainReadings } from "../lib/local-monthly-domain-reading";
import { buildAnnualEventReading } from "../lib/local-annual-event-reading";
import { buildAnnualMonthStory, type LocalAnnualMonthStory } from "../lib/local-annual-month-story";
import { annualMonthStoryEntries, annualMonthStorySubjectId } from "../lib/local-annual-month-story-record";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";

let revision: RevisionRecord, outlook: LocalAnnualOutlook, past: LocalAnnualOutlook;
let firstOutlook: LocalAnnualOutlook, unknownOutlook: LocalAnnualOutlook;
let reading2028: LocalAnnualDomainReading, beforeBirthReading: LocalAnnualDomainReading, firstReading: LocalAnnualDomainReading, unknownReading: LocalAnnualDomainReading;
let monthly2028: LocalMonthlyOutlook, monthlyDomains2028: LocalMonthlyDomainReadings;
let story2028: LocalAnnualMonthStory;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false, location: {label: "Synthetic annual detail", latitude: null, longitude: null, precision: "unknown"}, sourceNote: "synthetic"}, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z"});
  const assessment = buildBaziPreliminaryAssessment(revision);
  monthly2028 = await buildLocalMonthlyOutlook(revision, assessment, 2028);
  monthlyDomains2028 = buildMonthlyDomainReadings({ revision, assessment, monthly: monthly2028 });
  [outlook, past, firstOutlook] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2026), buildLocalAnnualOutlook(revision, assessment, 1990), buildLocalAnnualOutlook(revision, assessment, 1998)]);
  reading2028 = buildAnnualDomainReading({ revision, assessment, year: outlook.years.find((item) => item.year === 2028)! });
  const year = outlook.years.find((item) => item.year === 2028)!;
  story2028 = buildAnnualMonthStory({ revision, assessment, year, annualDomains: reading2028,
    annualEvents: buildAnnualEventReading({ revision, assessment, year, domains: reading2028 }),
    monthly: monthly2028, monthlyDomains: monthlyDomains2028 });
  beforeBirthReading = buildAnnualDomainReading({ revision, assessment, year: past.years[0]! });
  firstReading = buildAnnualDomainReading({ revision, assessment, year: firstOutlook.years[0]! });
  const unknownChart = await calculateChart({ ...revision.input, sex: "unspecified" }, WORKING_DEFAULT_RULE_PROFILE);
  const unknown = storedRevisionRecordSchema.parse({ ...revision, ...unknownChart, id: "33333333-3333-4333-8333-333333333333" });
  const unknownAssessment = buildBaziPreliminaryAssessment(unknown);
  unknownOutlook = await buildLocalAnnualOutlook(unknown, unknownAssessment, 2028);
  unknownReading = buildAnnualDomainReading({ revision: unknown, assessment: unknownAssessment, year: unknownOutlook.years[0]! });
});
afterEach(cleanup);
const base = {life: null, monthly: null, lifeLoading: false, monthlyLoading: false, lifeError: null, monthlyError: null, annualLoading: false};
function forYear(year: number) {
  const annualYear = [...outlook.years, ...past.years].find((item) => item.year === year)!;
  return {annualYear, annualScenarios: buildAnnualEventScenarios(revision, buildBaziPreliminaryAssessment(revision), annualYear)};
}
describe("full-width selected annual detail", () => {
  it.each([
    ["1944-08-09", "04:26", "natal-zq-official-wealth-resource-separated"],
    ["1957-09-13", "00:26", "natal-zq-hurting-wealth-heavy"],
    ["1982-10-02", "10:26", "natal-zq-hurting-resource-heavy"]
  ])("shows the actual financial/resource source once per annual evidence panel: %s", async (date, time, sourceId) => {
    const chart = await calculateChart({ ...revision.input, date, time }, WORKING_DEFAULT_RULE_PROFILE);
    const actual = storedRevisionRecordSchema.parse({ ...revision, ...chart, id: crypto.randomUUID() });
    const assessment = buildBaziPreliminaryAssessment(actual);
    const annual = await buildLocalAnnualOutlook(actual, assessment, 2028);
    const year = annual.years[0]!;
    const source = NATAL_WEALTH_RESOURCE_SOURCES.find((item) => item.id === sourceId)!;
    expect(year.judgment!.sourceIds).toContain(source.id);
    const view = render(<DetailedOutlookPanel {...base} annualYear={year} year={2028} onYearChange={vi.fn()} sources={assessment.sources} />);
    const evidence = screen.getByRole("region", { name: "综合判断的依据" });
    const references = [...evidence.querySelectorAll<HTMLElement>(".outlook-source")];
    const titles = references.map((item) => item.querySelector("strong")!.textContent);
    expect(titles).toContain(source.title);
    expect(new Set(titles).size).toBe(titles.length);
    const added = references.find((item) => item.querySelector("strong")!.textContent === source.title)!;
    expect(added.textContent).toContain(source.locator);
    expect(added.querySelector<HTMLAnchorElement>('a')!.href).toBe(source.url);
    const domains = buildAnnualDomainReading({ revision: actual, assessment, year });
    const events = buildAnnualEventReading({ revision: actual, assessment, year, domains });
    const story = buildAnnualLifeStory({ revision: actual, assessment, year, domains, events });
    view.rerender(<DetailedOutlookPanel {...base} annualYear={year} year={2028} onYearChange={vi.fn()} sources={assessment.sources}
      revision={actual} assessment={assessment} annualDomainReading={domains} annualEventReading={events} annualLifeStory={story} />);
    for (const branch of story.branches) for (const segment of branch.segments) {
      const answer = buildAnnualReaderAnswer({ revision: actual, assessment, year, story, events, branchId: branch.id, segmentId: segment.id })!;
      const panel = [...view.container.querySelectorAll<HTMLElement>("[data-annual-story-segment]")].find(item => item.dataset.annualStorySegment === segment.id)!;
      expect([...panel.querySelectorAll<HTMLElement>("[data-annual-reader-kind]")].map(item => item.textContent)).toEqual([...answer.paragraphs.filter(item => !item.detailsOnly), ...answer.paragraphs.filter(item => item.detailsOnly)].map(item => item.text));
    }
    view.unmount();
  });
  function storyProps() {
    const annual = forYear(2028);
    return { ...base, ...annual, year: 2028, onYearChange: vi.fn(), monthly: monthly2028, monthlyDomains: monthlyDomains2028,
      annualDomainReading: reading2028, annualMonthStory: story2028,
      annualEventReading: buildAnnualEventReading({ revision, assessment: buildBaziPreliminaryAssessment(revision), year: annual.annualYear, domains: reading2028 }) };
  }
  it("keeps automatic annual and monthly prose out of view until personal revisions have finished resolving", () => {
    const props = storyProps(), view = render(<DetailedOutlookPanel {...props} personalReadingReady={false} />);
    expect(screen.getByRole("status").textContent).toContain("个人修订尚未核对完成");
    expect(view.container.querySelector(".month-reading-rhythm")).toBeNull();
    expect(view.container.querySelector(".annual-month-story")).toBeNull();
    expect(view.container.querySelector(".monthly-domain-panel")).toBeNull();
    expect(view.container.querySelector(".annual-event-reading")).toBeNull();
    expect(screen.getByRole("button", { name: "查看这一年" })).toBeTruthy();
    view.rerender(<DetailedOutlookPanel {...props} personalReadingReady />);
    expect(screen.getByRole("region", { name: "这一年的月份节奏" })).toBeTruthy();
    view.rerender(<DetailedOutlookPanel {...props} personalReadingReady={false} />);
    expect(view.container.querySelector(".month-reading-rhythm")).toBeNull();
    expect(view.container.querySelector(".annual-month-story")).toBeNull();
  });
  it("opens the exact month from the concise rhythm and keeps the complete story and feedback accessible", () => {
    const onFeedbackDomain = vi.fn(), view = render(<DetailedOutlookPanel {...storyProps()} onFeedbackDomain={onFeedbackDomain} />);
    const rhythm = screen.getByRole("region", { name: "这一年的月份节奏" });
    const fullStory = screen.getByRole("heading", { name: "这一年的主题，怎样落到各个月份" }).closest("details")!;
    expect(fullStory.open).toBe(false);
    const links = within(rhythm).getAllByRole("link");
    expect(links).toHaveLength(13); // The handover month retains both exact periods.
    expect(links[10]!.getAttribute("href")).toBe("#reading-monthly-detail");
    fireEvent.click(links[10]!);
    const detail = view.container.querySelector<HTMLElement>("#reading-monthly-detail")!;
    expect(detail.tabIndex).toBe(-1);
    expect(detail.textContent).toContain(monthlyDomains2028.months[10]!.headline);
    expect(within(screen.getByRole("group", { name: "2028年节令月份" })).getAllByRole("button")[10]!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("展开逐月事项与完整解释"));
    expect(fullStory.open).toBe(true);
    expect(screen.getByRole("heading", { name: "这一年的主题，怎样落到各个月份" })).toBeTruthy();
    const first = annualMonthStoryEntries(story2028)[0]!;
    fireEvent.click(screen.getAllByRole("link", { name: "反馈这段年月说明" })[0]!);
    expect(onFeedbackDomain).toHaveBeenCalledWith(annualMonthStorySubjectId(story2028, first.month, first.period, first.domain));
  });
  it("hides a stale year, foreign source, or shifted month period instead of attaching it to current details", () => {
    const props = storyProps(), view = render(<DetailedOutlookPanel {...props} />);
    expect(within(screen.getByRole("region", { name: "这一年的月份节奏" })).getAllByRole("link")).toHaveLength(13);
    view.rerender(<DetailedOutlookPanel {...props} year={2027} annualLoading />);
    expect(screen.queryByRole("region", { name: "这一年的月份节奏" })).toBeNull();
    expect(screen.queryByRole("link", { name: "读这月" })).toBeNull();
    const foreign = structuredClone(story2028); foreign.sourceBinding.revisionId = crypto.randomUUID();
    view.rerender(<DetailedOutlookPanel {...props} annualMonthStory={foreign} />);
    expect(screen.queryByRole("region", { name: "这一年的月份节奏" })).toBeNull();
    expect(screen.queryByRole("link", { name: "读这月" })).toBeNull();
    const shifted = structuredClone(story2028);
    shifted.months[0]!.branches[0]!.periods[0]!.startInstant = shifted.months[1]!.startInstant;
    view.rerender(<DetailedOutlookPanel {...props} annualMonthStory={shifted} />);
    expect(screen.queryByRole("region", { name: "这一年的月份节奏" })).toBeNull();
    expect(screen.queryByRole("link", { name: "读这月" })).toBeNull();
    expect(screen.getByRole("group", { name: "2028年节令月份" })).toBeTruthy();
  });
  it("passes adopted annual text to the story without treating it as a newly calculated monthly event", () => {
    const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: story2028.sourceBinding,
      sourceVersions: [], issues: [], entries: [{ subjectId: "annual-2028", subjectLabel: "本人年度补充", originalConclusion: "原年度全文",
        readingVersions: [], state: "adopted", personalText: "本人实际安排：这年以学习为主。", effectiveConclusion: "本人实际安排：这年以学习为主。",
        feedback: [], selectedReviewRefs: [], issues: [] }] };
    render(<DetailedOutlookPanel {...storyProps()} personalReading={personal} />);
    const rhythm = screen.getByRole("region", { name: "这一年的月份节奏" });
    expect(within(rhythm).getAllByText("本人实际安排：这年以学习为主。").every(item => item.tagName === "BLOCKQUOTE")).toBe(true);
    expect(within(rhythm).getAllByText("此时段已有个人修订").length).toBeGreaterThan(0);
    expect(screen.getAllByText("这一段的年度或月度来源已有个人修订").length).toBeGreaterThan(0);
    expect(screen.getAllByText("本人实际安排：这年以学习为主。").every((item) => item.tagName === "BLOCKQUOTE")).toBe(true);
    const original = annualMonthStoryEntries(story2028)[0]!.domain.summary;
    expect(screen.getAllByText(original).every((item) => item.closest("details:not([open])"))).toBe(true);
  });
  it("puts the matching year's events before complete domains and excludes crossed segment times", () => {
    const props = forYear(2028);
    const events = buildAnnualEventReading({ revision, assessment: buildBaziPreliminaryAssessment(revision), year: props.annualYear, domains: reading2028 });
    const view = render(<DetailedOutlookPanel {...base} {...props} annualDomainReading={reading2028} annualEventReading={events} year={2028} onYearChange={vi.fn()} />);
    expect(screen.getByRole("region", { name: "2028年应事情境先读" })).toBeTruthy();
    const fullDomains = screen.getByText("完整事业、财务与关系解释").closest("details")!;
    expect(fullDomains.open).toBe(false);
    expect(fullDomains.textContent).toContain(reading2028.branches[0]!.segments[0]!.domains[0]!.summary);
    const crossed = structuredClone(events); crossed.branches[0]!.segments[0]!.startInstant = "1900-01-01T00:00:00Z";
    view.rerender(<DetailedOutlookPanel {...base} {...props} annualDomainReading={reading2028} annualEventReading={crossed} year={2028} onYearChange={vi.fn()} />);
    expect(screen.queryByRole("region", { name: "2028年应事情境先读" })).toBeNull();
    expect(screen.queryByText("完整事业、财务与关系解释")).toBeNull();
  });
  it("changes monthly domain prose with the selected month and excludes a mismatched source", () => {
    const view = render(<DetailedOutlookPanel {...base} monthly={monthly2028} monthlyDomains={monthlyDomains2028} year={2028} onYearChange={vi.fn()} />);
    const months = screen.getByRole("group", { name: "2028年节令月份" });
    const first = monthlyDomains2028.months[0]!, next = monthlyDomains2028.months[1]!;
    fireEvent.click(within(months).getAllByRole("button")[0]!);
    expect(view.container.querySelector(".monthly-domain-panel")?.textContent).toContain(first.headline);
    const original = screen.getByText("原流月判断与完整专业依据").closest("details")!;
    expect(original.open).toBe(false);
    fireEvent.click(within(months).getAllByRole("button")[1]!);
    expect(view.container.querySelector(".monthly-domain-panel")?.textContent).toContain(next.headline);
    expect(view.container.querySelector(".monthly-domain-panel")?.textContent).not.toContain(first.headline);
    const crossed = structuredClone(monthlyDomains2028); crossed.sourceBinding.revisionId = crypto.randomUUID();
    view.rerender(<DetailedOutlookPanel {...base} monthly={monthly2028} monthlyDomains={crossed} year={2028} onYearChange={vi.fn()} />);
    expect(view.container.querySelector(".monthly-domain-panel")).toBeNull();
    expect(screen.queryByText("原流月判断与完整专业依据")).toBeNull();
  });
  it("lets readers compare ten years and inspect the actual combined judgment", () => {
    const props = forYear(2028);
    const onYearChange = vi.fn();
    render(<DetailedOutlookPanel {...base} {...props} annualYears={outlook.years} year={2028} onYearChange={onYearChange} />);
    const overview = screen.getByRole("group", { name: "十年流年总览" });
    expect(within(overview).getAllByRole("button")).toHaveLength(10);
    expect(within(overview).getByRole("button", { name: /2028/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(overview).getByRole("button", { name: /2027/ }));
    expect(onYearChange).toHaveBeenCalledWith(2027);
    expect(props.annualYear.judgment).toBeTruthy();
    const judgment = screen.getByRole("region", { name: "综合判断的依据" });
    for (const axis of props.annualYear.judgment!.axes) expect(within(judgment).getByText(axis.summary, { selector: ".outlook-axis-overview p" })).toBeTruthy();
    const details = judgment.querySelector("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(within(judgment).getByText("为什么这样判断"));
    expect(details.open).toBe(true);
    expect(details.textContent).toContain(props.annualYear.judgment!.policyVersion);
  });
  it("shows each real year's reading conclusion on its card and removes stale answers while loading", () => {
    const assessment = buildBaziPreliminaryAssessment(revision);
    const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
      includeHour: assessment.sourceBinding.includeHour, startYear: outlook.startYear, endYear: outlook.endYear,
      years: outlook.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
    const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual: outlook, annualDomains });
    const stories = buildReadingAnnualLifeStories({ revision, assessment, annual: outlook, annualDomains, annualEvents });
    const props = { ...base, ...forYear(2028), annualYears: outlook.years, annualLifeStories: stories, year: 2028, onYearChange: vi.fn() };
    const view = render(<DetailedOutlookPanel {...props} />);
    const overview = screen.getByRole("group", { name: "十年流年总览" });
    for (const story of stories.years) {
      const button = within(overview).getByRole("button", { name: new RegExp(String(story.year)) });
      expect(button.querySelector(".outlook-year-answer")?.textContent).toBe(plainYearTopic(outlook.years.find(year => year.year === story.year)!));
      const original = outlook.years.find((year) => year.year === story.year)!;
      expect(button.textContent).toContain(plainYearCaption(original));
    }
    fireEvent.click(within(overview).getByRole("button", { name: /2027/ }));
    expect(props.onYearChange).toHaveBeenCalledWith(2027);
    view.rerender(<DetailedOutlookPanel {...props} annualLoading />);
    expect(overview.querySelector(".outlook-year-answer")).toBeNull();
    const foreign = structuredClone(stories); foreign.sourceBinding.chartResultHash = "foreign-chart";
    view.rerender(<DetailedOutlookPanel {...props} annualLifeStories={foreign} />);
    expect(overview.querySelector(".outlook-year-answer")).toBeNull();
  });
  it("shows the complete year, every event example, and expandable conditions/evidence", () => {
    const props = forYear(2028);
    const view = render(<DetailedOutlookPanel {...base} {...props} year={2028} onYearChange={vi.fn()} />);
    expect(screen.getByRole("heading", {name: "2028 年度详解 · 戊申"})).toBeTruthy();
    expect(screen.getByText(plainYearSummary(props.annualYear), { selector: "p.outlook-lead" })).toBeTruthy();
    expect(screen.getByText(props.annualYear.yearInfluence.summary)).toBeTruthy();
    for (const scenario of props.annualScenarios) {
      const article = screen.getByRole("heading", {name: scenario.title}).closest("article")!;
      expect(within(article).getByText(scenario.summary)).toBeTruthy();
      for (const example of scenario.examples) expect(within(article).getByText(example)).toBeTruthy();
      const details = article.querySelector("details")!;
      expect(details.open).toBe(false);
      fireEvent.click(within(article).getByText("这条情境的条件与依据"));
      expect(details.open).toBe(true);
      for (const text of [...scenario.conditions, ...scenario.evidence]) expect(within(details).getByText(text)).toBeTruthy();
    }
    expect(view.container.querySelector(".annual-full-reading .annual-event-scenarios")).toBeTruthy();
  });
  it("changes the selected year and hides old details while the next year is unavailable", () => {
    const onYearChange = vi.fn();
    const oldProps = forYear(2028);
    const view = render(<DetailedOutlookPanel {...base} {...oldProps} year={2028} onYearChange={onYearChange} />);
    fireEvent.change(screen.getByLabelText("查询年份"), {target: {value: "2027"}});
    fireEvent.click(screen.getByRole("button", {name: "查看这一年"}));
    expect(onYearChange).toHaveBeenCalledWith(2027);
    view.rerender(<DetailedOutlookPanel {...base} {...oldProps} year={2027} annualLoading onYearChange={onYearChange} />);
    expect(screen.queryByText(oldProps.annualYear.summary)).toBeNull();
    expect(screen.queryByText("交运前后的任务与生活安排")).toBeNull();
    view.rerender(<DetailedOutlookPanel {...base} {...forYear(2027)} year={2027} onYearChange={onYearChange} />);
    expect(screen.getByRole("heading", {name: "2027 年度详解 · 丁未"})).toBeTruthy();
    expect(screen.queryByRole("heading", {name: "关系约定与共同安排调整"})).toBeNull();
  });
  it("keeps a pre-birth year empty of personal event scenarios", () => {
    const props = forYear(1990);
    expect(props.annualScenarios).toEqual([]);
    render(<DetailedOutlookPanel {...base} {...props} year={1990} onYearChange={vi.fn()} />);
    expect(screen.getByText(plainYearSummary(props.annualYear), { selector: "p.outlook-lead" })).toBeTruthy();
    expect(screen.queryByRole("heading", {name: "这一年可能对应的生活情境"})).toBeNull();
    expect(screen.getByText("本年没有可生成的个人情境，保留上方年度事实与说明。")).toBeTruthy();
  });

  it("puts every domain's complete explanation first and retains original professional evidence in a disclosure", () => {
    const props = forYear(2028), feedback = vi.fn();
    const view = render(<DetailedOutlookPanel {...base} {...props} annualDomainReading={reading2028} onFeedbackDomain={feedback} year={2028} onYearChange={vi.fn()} />);
    const region = screen.getByRole("region", { name: "2028年分领域详读" });
    expect(within(region).getByText(reading2028.headline)).toBeTruthy();
    expect(within(region).getByText(reading2028.summary)).toBeTruthy();
    expect(view.container.querySelector(".annual-event-scenarios")).toBeNull();
    expect(view.container.querySelector(".annual-full-reading > .outlook-theme-grid")).toBeNull();
    const segments = reading2028.branches.flatMap((branch) => branch.segments);
    expect(segments.length).toBeGreaterThan(1);
    expect(region.querySelectorAll(".annual-domain-segment")).toHaveLength(segments.length);
    for (const segment of segments) {
      const element = Array.from(region.querySelectorAll(".annual-domain-segment")).find((item) => item.getAttribute("data-segment-id") === segment.id)!;
      expect(element.querySelector(`time[datetime="${segment.startInstant}"]`)).toBeTruthy();
      expect(element.querySelector(`time[datetime="${segment.endExclusiveInstant}"]`)).toBeTruthy();
      expect(element.textContent).toContain(segment.judgmentCaption);
      for (const domain of segment.domains) {
        const article = within(element as HTMLElement).getByRole("article", { name: domain.title });
        for (const text of [domain.headline, domain.summary, ...domain.paragraphs, ...domain.opportunities, ...domain.obstacles, ...domain.examples, ...domain.watchPoints]) expect(article.textContent).toContain(text);
        const details = article.querySelector("details")!;
        expect(details.open).toBe(false);
        fireEvent.click(within(article).getByText("这项解读的条件与依据"));
        expect(details.open).toBe(true);
        for (const text of [...domain.conditions, ...domain.evidence]) expect(details.textContent).toContain(text);
      }
    }
    const first = segments[0]!, domain = first.domains[0]!;
    const firstSegment = Array.from(region.querySelectorAll(".annual-domain-segment")).find((item) => item.getAttribute("data-segment-id") === first.id)!;
    const link = within(within(firstSegment as HTMLElement).getByRole("article", { name: domain.title })).getByRole("link", { name: "反馈这项解读" });
    expect(link.getAttribute("href")).toBe("#reading-feedback");
    fireEvent.click(link);
    expect(feedback).toHaveBeenCalledWith(`annual-domain-2028-${first.id}-${domain.id}`);
    const original = view.container.querySelector<HTMLDetailsElement>(".annual-original-evidence")!;
    expect(original.open).toBe(false);
    expect(original.textContent).toContain(props.annualYear.summary);
    fireEvent.click(screen.getByText("原年度判断与完整专业依据"));
    expect(original.open).toBe(true);
    for (const axis of props.annualYear.judgment!.axes) expect(original.textContent).toContain(axis.summary);
    const annualHeader = screen.getByRole("heading", { name: "2028 年度详解 · 戊申" }).parentElement!;
    expect(annualHeader.textContent).toContain(plainYearCaption(props.annualYear));
  });

  it("keeps parallel direction branches and their real decade backgrounds separate", () => {
    const annualYear = unknownOutlook.years[0]!;
    const view = render(<DetailedOutlookPanel {...base} annualYear={annualYear} annualDomainReading={unknownReading} year={2028} onYearChange={vi.fn()} />);
    expect(unknownReading.branches).toHaveLength(2);
    for (const branch of unknownReading.branches) {
      const region = screen.getByRole("region", { name: branch.label });
      expect(Array.from(region.querySelectorAll(".annual-domain-segment")).map((item) => item.getAttribute("data-segment-id"))).toEqual(branch.segments.map((segment) => segment.id));
      for (const segment of branch.segments) for (const ref of segment.backgroundRefs) {
        const actual = annualYear.dayunSegments.find((item) => item.direction === branch.id && item.nodeRef.nodeId === ref.nodeId)!;
        expect(actual).toBeDefined();
        expect(region.textContent).toContain(`${actual.ganZhi}大运`);
      }
    }
    expect(view.container.querySelectorAll(".annual-domain-branch")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "反馈这项解读" })).toBeNull();
  });

  it("shows the known no-relationship-obstacle sentence only as scope and keeps actual career obstacles visible", () => {
    const value = structuredClone(reading2028), segment = value.branches[0]!.segments[0]!;
    const relationship = segment.domains.find((domain) => domain.id === "relationship")!;
    const career = segment.domains.find((domain) => domain.id === "career")!;
    const sentence = "尚无可单列的年度关系阻碍；其他领域的总体助阻不直接当作关系结果。";
    relationship.obstacles = [sentence];
    expect(career.obstacles.length).toBeGreaterThan(0);
    const before = JSON.stringify(value);
    const view = render(<DetailedOutlookPanel {...base} {...forYear(2028)} annualDomainReading={value} year={2028} onYearChange={vi.fn()} />);
    const element = Array.from(view.container.querySelectorAll<HTMLElement>(".annual-domain-segment")).find((item) => item.dataset.segmentId === segment.id)!;
    const relationshipArticle = within(element).getByRole("article", { name: relationship.title });
    expect(within(relationshipArticle).queryByText("需要留意的阻力")).toBeNull();
    expect(within(relationshipArticle).getByText(sentence).closest("details:not([open])")).not.toBeNull();
    fireEvent.click(within(relationshipArticle).getByText("这项解读的条件与依据"));
    expect(within(relationshipArticle).getByText("阅读范围")).toBeTruthy();
    expect(within(relationshipArticle).getByText(sentence).closest("details:not([open])")).toBeNull();
    const careerArticle = within(element).getByRole("article", { name: career.title });
    expect(within(careerArticle).getByText("需要留意的阻力").closest("details:not([open])")).toBeNull();
    expect(within(careerArticle).getByText(career.obstacles[0]!).closest("details:not([open])")).toBeNull();
    expect(JSON.stringify(value)).toBe(before);
  });

  it("does not turn a missing early-year decade background or a pre-birth status into a full personal year", () => {
    const view = render(<DetailedOutlookPanel {...base} annualYear={firstOutlook.years[0]} annualDomainReading={firstReading} year={1998} onYearChange={vi.fn()} />);
    const missing = firstReading.branches.flatMap((branch) => branch.segments).filter((segment) => !segment.backgroundRefs.length);
    expect(missing.length).toBeGreaterThan(0);
    expect(view.container.textContent).toContain("尚无大运背景 · 本段按流年本身解读");
    for (const gap of firstReading.branches.flatMap((branch) => branch.gaps)) expect(view.container.textContent).toContain(gap.message);
    view.rerender(<DetailedOutlookPanel {...base} {...forYear(1990)} annualDomainReading={beforeBirthReading} year={1990} onYearChange={vi.fn()} />);
    expect(beforeBirthReading.status).toBe("before_birth");
    expect(view.container.querySelectorAll(".annual-domain")).toHaveLength(0);
    expect(view.container.textContent).toContain(beforeBirthReading.summary);
    expect(screen.queryByRole("heading", { name: "这一年可能对应的生活情境" })).toBeNull();
  });

  it("rejects foreign identity, hour scope, exact node identity and stale selected-year domain text", () => {
    const props = forYear(2028), change = vi.fn();
    const view = render(<DetailedOutlookPanel {...base} {...props} annualDomainReading={reading2028} year={2028} onYearChange={change} />);
    expect(screen.getByRole("region", { name: "2028年分领域详读" })).toBeTruthy();
    const wrongSource = structuredClone(reading2028); wrongSource.sourceBinding.chartResultHash += "x";
    const wrongScope = structuredClone(reading2028); wrongScope.sourceBinding.includeHour = !wrongScope.sourceBinding.includeHour;
    const wrongRef = structuredClone(reading2028); wrongRef.yearNodeRef!.ruleProfileDigest = "f".repeat(64);
    const wrongInterval = structuredClone(reading2028); wrongInterval.endExclusiveInstant = "2030-02-04T00:00:00Z";
    for (const value of [wrongSource, wrongScope, wrongRef, wrongInterval]) {
      view.rerender(<DetailedOutlookPanel {...base} {...props} annualDomainReading={value} year={2028} onYearChange={change} />);
      expect(screen.queryByRole("region", { name: "2028年分领域详读" })).toBeNull();
      expect(screen.getByText(plainYearSummary(props.annualYear), { selector: "p.outlook-lead" })).toBeTruthy();
    }
    view.rerender(<DetailedOutlookPanel {...base} {...props} annualDomainReading={reading2028} year={2027} annualLoading onYearChange={change} />);
    expect(screen.queryByRole("region", { name: "2028年分领域详读" })).toBeNull();
    expect(screen.queryByText(reading2028.summary)).toBeNull();
  });
});
