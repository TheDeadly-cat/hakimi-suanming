import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "../lib/local-annual-outlook";
import { buildLocalLifeOutlook } from "../lib/local-detailed-outlook";
import { buildLifeStageStory } from "../lib/local-life-stage-story";
import { buildReadingSynthesis } from "../lib/local-reading-synthesis";
import { buildReadingTimeline } from "../lib/local-reading-timeline";
import { buildReadingPriorities } from "../lib/local-reading-priorities";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { annualDomainFeedbackText } from "../lib/local-annual-domain-record";
import { buildReadingAnnualEvents } from "../lib/local-annual-event-record";
import { buildReadingAnnualLifeStories } from "../lib/annual-life-story";
import { buildBriefAnnualReading } from "../lib/brief-annual-reading";
import { buildBriefReadingReport } from "../lib/brief-reading-report";
import { buildLocalReadingReport } from "../lib/local-reading-edition";
import { buildLocalReadingSnapshot } from "../lib/local-reading-record";
import { prepareKeyMonthYear, type KeyMonthEventSources } from "../lib/key-month-event-source";
import { buildKeyMonthReadingChoices, selectKeyMonthEvents } from "../lib/key-month-event-tendencies";
import { buildReadingContextRecord, resolveReadingContext } from "../lib/local-reading-context";
import { buildContextualReadingBundle } from "../lib/local-contextual-reading-record";
import { buildLocalPersonalReading } from "../lib/local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, buildReadingFeedbackChoices, readingFeedbackSource, type ReadingFeedbackChoice } from "../lib/local-reading-feedback";
import { BriefReadingReportPanel } from "./brief-reading-report-panel";
import { ChartReadingWorkbench } from "./chart-reading-workbench";

async function fixture(date: string, sex: "male" | "female" | "unspecified", time = "08:26", from = 2026, to = 2035, reference = 2029) {
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic brief report entry", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...calculated, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-20T00:00:00.000Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const [annual, life] = await Promise.all([buildLocalAnnualOutlookRange(revision, assessment, from, to), buildLocalLifeOutlook(revision, assessment, reference)]);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
    startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents });
  const lifeStageStory = buildLifeStageStory({ revision, assessment, life }), timeline = buildReadingTimeline({ revision, annual, life });
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life, annual, timeline });
  const priorities = buildReadingPriorities({ revision, annual, life, timeline, annualDomains });
  const extras = { sourceRevision: revision, comprehensive, life, lifeStageStory, timeline, synthesis, priorities, annualDomains, annualEvents, annualLifeStories };
  return { revision, assessment, annual, extras, report: buildBriefReadingReport(assessment, annual, extras)! };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
let b: Fixture, unknown: Fixture, child: Fixture, official: Fixture;
beforeAll(async () => {
  [b, unknown, child, official] = await Promise.all([
    fixture("1995-05-18", "male"), fixture("1995-08-18", "unspecified"), fixture("2019-12-22", "female", "11:23", 2025, 2025, 2025),
    fixture("1971-04-09", "male", "14:26")
  ]);
}, 60_000);
const chineseCount = (text: string) => [...text.matchAll(/\p{Script=Han}/gu)].length;
function visibleText(root: Node): string {
  if (root.nodeType === Node.TEXT_NODE) return root.textContent ?? "";
  if (root instanceof HTMLDetailsElement && !root.open) return root.querySelector(":scope > summary")?.textContent ?? "";
  return [...root.childNodes].map(visibleText).join(" ");
}
function note(input: Fixture, body: string, minute: number, review = false): ResearchNoteRecord {
  const instant = new Date(Date.UTC(2026, 9, 20, 0, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId, anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body,
    tags: ["解读反馈", ...(review ? ["解读反馈复核"] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
async function personalFor(choices: ReadingFeedbackChoice[], text: string, state: "revised" | "retained" = "revised") {
  const records: ResearchNoteRecord[] = [];
  for (const choice of choices) {
    const root = note(b, buildStructuredReadingFeedback(b.assessment, { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
      sourceVersions: choice.sourceVersions, rating: "partial", aspect: "主报告原文保留", actualSituation: "合成验证，不是实际用户经历。", requestedRevision: text }), 1);
    const adopted = note(b, await buildReadingFeedbackReview(root, null, readingFeedbackSource(b.assessment, choice.sourceVersions), {
      state: "revised", notes: "明确采用合成个人文字", revisedConclusion: text, occurredAt: "合成对照"
    }), 2, true);
    records.push(root, adopted);
    if (state === "retained") records.push(note(b, await buildReadingFeedbackReview(root, adopted, readingFeedbackSource(b.assessment, choice.sourceVersions), {
      state: "retained", notes: "明确恢复当前原结论", revisedConclusion: "", occurredAt: "合成对照"
    }), 3, true));
  }
  return buildLocalPersonalReading({ revision: b.revision, assessment: b.assessment, choices, records });
}
function chapterChoice(id: string): ReadingFeedbackChoice {
  const chapter = b.extras.comprehensive.chapters.find(item => item.id === id)!;
  return { id: `chapter-${id}`, label: chapter.title, sourceVersions: [b.extras.comprehensive.version],
    originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${b.extras.comprehensive.version}` };
}
function monthSource(input: Fixture): KeyMonthEventSources {
  return { revision: input.revision, assessment: input.assessment, annual: input.annual,
    annualDomains: input.extras.annualDomains, annualEvents: input.extras.annualEvents,
    annualLifeStories: input.extras.annualLifeStories };
}

describe("brief reading as a readable, source-bound entry", () => {
  it("shows career, money and relationships in every complete yearly segment, including quiet relationship years", () => {
    const view = render(<BriefReadingReportPanel report={b.report} variant="years" />);
    for (const input of [b, unknown, child]) {
      view.rerender(<BriefReadingReportPanel report={input.report} variant="years" />);
      const expected = input.report.plainReading!.outlook.branches.flatMap(branch => branch.years.flatMap(year => year.segments));
      const displayed = [...view.container.querySelectorAll<HTMLElement>("[data-plain-segment]")];
      expect(displayed).toHaveLength(expected.length);
      for (const [index, segment] of expected.entries()) {
        const node = displayed[index]!;
        expect(node.closest("details:not([open])")).toBeNull();
        expect([...node.querySelectorAll<HTMLElement>("[data-plain-year-domain]")].map(item => item.dataset.plainYearDomain))
          .toEqual(["career", "wealth", "relationship"]);
        for (const domain of segment.domains) expect(node.textContent).toContain(domain.text);
      }
    }
  });

  it("states the adopted natal task separately from climate and keeps the full adopted personal conclusion in the entry and export", async () => {
    const natal = b.report.natalConclusion!;
    expect(natal.original.firstChoice.targets.map(target => target.value)).toEqual(["辛"]);
    expect(natal.original.firstChoice.decision).toMatch(/泄秀.*制约.*七杀/);
    expect(natal.original.scoreBasis.supportWeight).toBe(11);
    expect(natal.original.scoreBasis.demandWeight).toBe(12);
    expect(natal.original.axes.seasonal.decision).toMatch(/癸水.*为先.*丙火.*配合/);
    expect(natal.original.secondChoices.find(choice => choice.id === "seasonal")!.targets
      .map(target => [target.value, target.presence])).toEqual([["癸", "hidden_only"], ["丙", "hidden_only"]]);
    expect(child.report.natalConclusion!.original.firstChoice.targets.map(target => target.value)).toEqual(["丙"]);
    expect(child.report.natalConclusion!.original.axes.pattern.decision).toContain("财");
    const text = "这是本人采用的完整取用修订。\n\n辛与调候的任务分别保留，不由默认短句替换。\n最后一行也保留。";
    const personalReading = await personalFor([chapterChoice("useful_elements")], text);
    const synthesis = buildReadingSynthesis({ revision: b.revision, assessment: b.assessment, comprehensive: b.extras.comprehensive,
      life: b.extras.life, annual: b.annual, timeline: b.extras.timeline, personal: personalReading });
    const extras = { ...b.extras, synthesis, personalReading };
    const report = buildBriefReadingReport(b.assessment, b.annual, extras)!;
    expect(report.natalConclusion!.firstChoice.origin).toBe("personal");
    expect(report.natalConclusion!.firstChoice.text).not.toContain(natal.original.firstChoice.decision);
    expect(report.personalTexts.map(item => item.text)).toContain(text);
    const view = render(<BriefReadingReportPanel report={report} />);
    const section = screen.getByLabelText("格局与喜用采用结论");
    const first = section.querySelector<HTMLElement>('[data-natal-conclusion="adopted-first"]')!;
    expect(first.dataset.conclusionOrigin).toBe("personal");
    expect(visibleText(section)).not.toContain(natal.original.firstChoice.decision);
    expect(visibleText(view.container)).not.toContain(text);
    const details = first.querySelector<HTMLDetailsElement>("details")!;
    await userEvent.click(details.querySelector("summary")!);
    expect(details.querySelector("section p")!.textContent).toBe(text);
    const exported = buildLocalReadingReport(b.assessment, b.annual, extras);
    expect(exported.reading).toContain(text);
    expect(exported.reading.split("## 已采用的个人修订原文")[0]).not.toContain(natal.original.firstChoice.decision);
    expect(exported.archive).toBe(buildLocalReadingSnapshot(b.assessment, b.annual, extras));
  });

  it("shows actual B2032 money months, rejects altered sources, and lets a monthly adoption replace only that month's answer", async () => {
    const source = monthSource(b), prepared = await prepareKeyMonthYear(source, 2032, []);
    const before = JSON.stringify(source);
    const extras = { ...b.extras, keyMonthYears: [prepared] };
    const report = buildBriefReadingReport(b.assessment, b.annual, extras)!;
    const annual = report.eventOutlook.find(event => event.category === "money_inflow")!.branches
      .flatMap(branch => branch.items).find(item => item.year === 2032)!;
    expect(annual.keyMonthsLoaded).toBe(true);
    expect(annual.keyMonths).toHaveLength(1);
    const month = annual.keyMonths![0]!;
    expect(month.monthGanZhi).toBe("壬寅");
    expect(month.text).toMatch(/原约定|结算|应收/);
    expect(month.original.direction).toBe("mixed");
    expect(month.text).toContain("仍有牵制");
    expect(month.branchId).toBe(annual.branchId);
    expect(month.startInstant >= annual.startInstant && month.endExclusiveInstant <= annual.endExclusiveInstant).toBe(true);
    expect(month.evidence.some(evidence => evidence.origin === "month" && evidence.kind === "actor")).toBe(true);
    expect(b.report.eventOutlook.flatMap(event => event.branches.flatMap(branch => branch.items))
      .every(item => !item.keyMonthsLoaded)).toBe(true);
    const wrongYear = structuredClone(prepared); wrongYear.year = 2031;
    expect(() => buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, keyMonthYears: [wrongYear] })).toThrow(/年份|月份/);
    const altered = structuredClone(prepared);
    altered.reading.branches[0]!.periods[0]!.events[0]!.text += "无来源的新增结论";
    expect(() => buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, keyMonthYears: [altered] })).toThrow(/变化/);
    const choices = buildKeyMonthReadingChoices({ revision: b.revision, assessment: b.assessment, annual: b.annual,
      year: b.annual.years.find(year => year.year === 2032)!,
      annualDomains: b.extras.annualDomains.years.find(year => year.year === 2032)!,
      annualEvents: b.extras.annualEvents.years.find(year => year.year === 2032)!,
      annualLifeStory: b.extras.annualLifeStories.years.find(year => year.year === 2032)!,
      monthly: prepared.monthly, monthlyDomains: prepared.monthlyDomains, annualMonthStory: prepared.annualMonthStory });
    const choice = choices.find(item => item.id === `monthly-domain-${month.original.scope.monthId}-${month.original.scope.segmentId}-wealth`)!;
    expect(choice).toBeDefined();
    const text = "本人已采用这段财务原文。\n只适用于壬寅月，不替代全年或感情判断。";
    const root = note(b, buildStructuredReadingFeedback(b.assessment, { subjectId: choice.id, subjectLabel: choice.label,
      originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial",
      aspect: "只替代本月财务", actualSituation: "合成范围验证", requestedRevision: text }), 4);
    const review = note(b, await buildReadingFeedbackReview(root, null, readingFeedbackSource(b.assessment, choice.sourceVersions),
      { state: "revised", notes: "明确采用", revisedConclusion: text, occurredAt: "合成" }), 5, true);
    const adopted = await prepareKeyMonthYear(source, 2032, [root, review]);
    const personalReport = buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, keyMonthYears: [adopted] })!;
    const personalYear = personalReport.eventOutlook.find(event => event.category === "money_inflow")!.branches
      .flatMap(branch => branch.items).find(item => item.year === 2032)!;
    expect(personalYear.origin).toBe(annual.origin);
    expect(personalYear.text).toBe(annual.text);
    const personalMonth = personalYear.keyMonths!.find(item => item.original.scope.monthId === month.original.scope.monthId)!;
    expect(personalMonth.origin).toBe("personal");
    expect(personalMonth.text).not.toBe(month.text);
    expect(personalMonth.personalTextIds.map(id => personalReport.personalTexts.find(item => item.id === id)!.text)).toContain(text);
    expect(personalReport.eventOutlook.find(event => event.category === "romance")).toEqual(report.eventOutlook.find(event => event.category === "romance"));
    render(<BriefReadingReportPanel report={personalReport} />);
    const moneySection = screen.getByLabelText("具体事件与对应年份").querySelector<HTMLElement>('[data-event-category="money_inflow"]')!;
    const entry = within(moneySection).getByLabelText(`${personalYear.label}的关键月份`).querySelector<HTMLElement>('[data-key-month-origin="personal"]')!;
    expect(visibleText(entry)).not.toContain(month.text);
    const details = entry.querySelector<HTMLDetailsElement>("details")!;
    await userEvent.click(details.querySelector("summary")!);
    expect(details.querySelector("section p")!.textContent).toBe(text);
    const exported = buildLocalReadingReport(b.assessment, b.annual, { ...b.extras, keyMonthYears: [adopted] });
    expect(exported.reading).toContain(text);
    expect(exported.reading).toContain(month.original.scope.startInstant);
    expect(exported.archive).toBe(buildLocalReadingSnapshot(b.assessment, b.annual, b.extras));
    expect(JSON.stringify(source)).toBe(before);
  }, 30_000);

  it("keeps key months within their actual unknown-direction, handover and eighteenth-birthday intervals", async () => {
    const [a, handover, young] = await Promise.all([
      prepareKeyMonthYear(monthSource(unknown), 2028, []), prepareKeyMonthYear(monthSource(b), 2029, []),
      prepareKeyMonthYear(monthSource(child), 2025, [])
    ]);
    const originalYear = unknown.annual.years.find(year => year.year === 2028)!;
    expect(a.reading.branches.map(branch => branch.id)).toEqual(["forward", "backward"]);
    // A year need not be selected for the compact homepage. Check selections
    // against each real annual segment instead of inventing a featured item.
    for (const segment of originalYear.judgmentSegments) {
      const picks = selectKeyMonthEvents(a.reading, { category: "romance", branchId: segment.branchId,
        startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
      for (const month of picks) {
        expect(month.scope.branchId).toBe(segment.branchId);
        expect(month.scope.startInstant >= segment.startInstant && month.scope.endExclusiveInstant <= segment.endExclusiveInstant).toBe(true);
        const evidence = a.reading.evidence.filter(row => month.evidenceIds.includes(row.id));
        expect(month.supportEvidenceIds.every(id => evidence.some(row => row.id === id))).toBe(true);
        expect(evidence.some(row => row.origin === "month" && ["palace_relation", "star_entry", "star_relation"].includes(row.kind))).toBe(true);
      }
    }
    expect(a.reading.branches.every(branch => branch.periods.some(period => period.events.some(item => item.category === "romance" && item.level === "weak")))).toBe(true);
    const allPeriods = handover.reading.branches[0]!.periods;
    const split = allPeriods.filter(period => allPeriods.filter(other => other.monthId === period.monthId).length === 2);
    expect(split).toHaveLength(2);
    expect(split[0]!.endExclusiveInstant).toBe(split[1]!.startInstant);
    expect(split[0]!.events[0]!.scope.backgroundRefs).not.toEqual(split[1]!.events[0]!.scope.backgroundRefs);
    expect(young.reading.branches.flatMap(branch => branch.periods.flatMap(period => period.events))
      .every(item => item.level === "not_applicable" && !item.applicableIntervals.length)).toBe(true);
    // Reuse the same stored child revision: only the original annual/month
    // producer window changes, with no invented adult age or source nodes.
    const annual = await buildLocalAnnualOutlookRange(child.revision, child.assessment, 2037, 2037);
    const annualDomains = { ...child.extras.annualDomains, startYear: 2037, endYear: 2037,
      years: annual.years.map(year => buildAnnualDomainReading({ revision: child.revision, assessment: child.assessment, year })) };
    const annualEvents = buildReadingAnnualEvents({ revision: child.revision, assessment: child.assessment, annual, annualDomains });
    const annualLifeStories = buildReadingAnnualLifeStories({ revision: child.revision, assessment: child.assessment, annual, annualDomains, annualEvents });
    const adult = await prepareKeyMonthYear({ revision: child.revision, assessment: child.assessment, annual, annualDomains, annualEvents, annualLifeStories }, 2037, []);
    const boundary = "2037-12-22T03:23:00.000Z", year = annual.years[0]!;
    const selected = ["money_loss", "romance", "commitment"].flatMap(category => selectKeyMonthEvents(adult.reading,
      { category: category as "money_loss" | "romance" | "commitment", branchId: "locked", startInstant: year.startInstant!, endExclusiveInstant: year.endExclusiveInstant! }));
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every(item => item.scope.startInstant >= boundary && item.applicableIntervals.every(interval => interval.startInstant >= boundary))).toBe(true);
  }, 30_000);

  it("fits the automatic B main report budget and gives each domain one distinct answer without duplicating its label", () => {
    const before = JSON.stringify(b.extras), count = chineseCount(b.report.bodyText);
    expect(count).toBeLessThanOrEqual(2000);
    expect(b.report.metrics.chineseCharacters).toBe(count);
    expect(b.report.metrics.withinTarget).toBe(true);
    expect(b.report.years).toHaveLength(b.annual.years.length);
    render(<BriefReadingReportPanel report={b.report} />);
    const visible = visibleText(screen.getByLabelText("主报告重点年份"));
    for (const year of b.report.years) {
      const element = screen.getByRole("article", { name: `${year.year}年简明判断`, hidden: true });
      // All original years remain available; the new event entry comes first.
      expect(Boolean(element.closest("details:not([open])"))).toBe(true);
      for (const branch of year.branches) for (const segment of branch.segments) {
        const scope = [...element.querySelectorAll<HTMLElement>("[data-segment-id]")].find(item => item.dataset.segmentId === segment.id)!;
        for (const domain of segment.domains) {
          const field = scope.querySelector<HTMLElement>(`[data-brief-domain="${domain.domain}"]`);
          if (!domain.showInBrief) {
            expect(domain.domain).toBe("relationship");
            expect(domain.personalTextIds).toEqual([]);
            expect(field).toBeNull();
            expect(b.report.relationshipScopeText).toMatch(/不表示没有(?:关系)?变化/);
            continue;
          }
          expect(field, `${year.year}/${segment.id}/${domain.domain}`).not.toBeNull();
          expect(field!.querySelector("dt")?.textContent).toBe(domain.title);
          expect(field!.querySelector("dd > p")?.textContent).toBe(domain.text);
          expect(domain.text).not.toMatch(new RegExp(`^${domain.title}[：:]`));
        }
        const career = segment.domains.find(item => item.domain === "career")!, wealth = segment.domains.find(item => item.domain === "wealth")!;
        expect(career.text).not.toBe(wealth.text);
      }
    }
    expect(visible).not.toContain("完整原解释");
    expect(JSON.stringify(b.extras)).toBe(before);
  });

  it("gives seven evidence-bound event categories without converting output support or financial burden into promotion or income", () => {
    const categories = ["promotion", "job_change", "money_inflow", "money_loss", "romance", "commitment", "separation"];
    expect(b.report.eventOutlook.map(item => item.category)).toEqual(categories);
    const period = (source: Fixture, year: number) => source.report.years.find(item => item.year === year)!.branches[0]!.segments[0]!;
    const event = (source: Fixture, year: number, category: string) => period(source, year).eventTendencies.find(item => item.category === category)!;
    // Same real B chart: output support, monthly-pillar disturbance, cash-return
    // support and day-palace clash are four different source mechanisms.
    expect(event(b, 2029, "promotion").level).toBe("none");
    expect(b.report.years.find(item => item.year === 2029)!.branches[0]!.segments
      .every(segment => segment.eventTendencies.find(item => item.category === "job_change")!.level === "none")).toBe(true);
    expect(["possible", "weak"]).toContain(event(b, 2031, "job_change").level);
    expect(event(b, 2031, "job_change").original.evidence.length).toBeGreaterThan(0);
    expect(["clear", "possible"]).toContain(event(b, 2032, "money_inflow").level);
    expect(event(b, 2032, "money_inflow").text).toMatch(/报酬|结算|款项|到账/);
    expect(event(official, 2029, "money_inflow").level).toBe("none");
    expect(event(official, 2029, "money_loss").level).not.toBe("none");
    expect(event(b, 2035, "separation").level).toBe("weak");
    expect(event(b, 2035, "separation").original.evidence.some(item =>
      item.kind === "relationship_signal" && item.origin === "year" && item.signalId?.includes("palace"))).toBe(true);
    render(<BriefReadingReportPanel report={b.report} />);
    const entry = screen.getByLabelText("具体事件与对应年份");
    expect(entry.querySelectorAll("[data-event-category]")).toHaveLength(7);
    expect(entry.querySelectorAll("[data-event-year]").length).toBeGreaterThan(0);
    expect(visibleText(entry)).not.toMatch(/百分之|\d+%/);
    expect(b.report.eventSupportNote).toContain("不是发生概率");
    expect(screen.getByText("展开 10 年的逐年判断").parentElement).toHaveProperty("open", false);
  });

  it("keeps every event in its own branch, adult interval and active relationship lens", () => {
    for (const source of [b, unknown, official]) {
      for (const row of source.report.years) for (const branch of row.branches) for (const segment of branch.segments) {
        expect(segment.eventTendencies).toHaveLength(7);
        for (const item of segment.eventTendencies) {
          expect(item.original.scope).toEqual({ year: row.year, branchId: branch.id, segmentId: segment.id,
            startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
          for (const interval of item.original.applicableIntervals) {
            expect(Date.parse(interval.startInstant)).toBeGreaterThanOrEqual(Date.parse(segment.startInstant));
            expect(Date.parse(interval.endExclusiveInstant)).toBeLessThanOrEqual(Date.parse(segment.endExclusiveInstant));
          }
        }
      }
      for (const event of source.report.eventOutlook) for (const branch of event.branches) for (const item of branch.items) {
        expect(item.branchId).toBe(branch.branchId);
        const original = source.report.years.find(year => year.year === item.year)!.branches
          .find(candidate => candidate.id === branch.branchId)!.segments.find(segment => segment.id === item.segmentId)!;
        expect(original.eventTendencies.some(value => value.original.id === item.original.id)).toBe(true);
      }
    }
    const backward = unknown.report.years.find(year => year.year === 2026)!.branches.find(branch => branch.id === "backward")!.segments[0]!;
    const romance = backward.eventTendencies.find(item => item.category === "romance")!;
    expect(romance.original.lensIds).toEqual(["authority"]);
    expect(romance.original.evidence.every(item => item.lensId !== "wealth")).toBe(true);
    expect(backward.eventTendencies.find(item => item.category === "separation")!.level).toBe("none");
    const a2028 = unknown.report.years.find(year => year.year === 2028)!.branches.find(branch => branch.id === "backward")!;
    for (const segment of a2028.segments) for (const category of ["romance", "commitment"]) {
      const item = segment.eventTendencies.find(item => item.category === category)!;
      expect(new Set(item.original.lensIds)).toEqual(new Set(["wealth", "authority"]));
      expect(new Set(item.original.evidence.filter(evidence => evidence.use === "counter").map(evidence => evidence.lensId))).toEqual(new Set(["wealth"]));
      expect(item.text).toMatch(/其中一种|其中一个/);
    }
    for (const branch of unknown.report.years.find(year => year.year === 2031)!.branches) {
      const item = branch.segments[0]!.eventTendencies.find(event => event.category === "separation")!;
      expect(item.level).toBe("possible");
      expect(item.original.evidence.some(evidence => evidence.signalId?.includes("star-contact"))).toBe(true);
      expect(item.original.evidence.some(evidence => evidence.signalId?.includes("palace"))).toBe(true);
      expect(item.text).not.toMatch(/单一.*较弱/);
    }
    for (const item of child.report.years[0]!.branches[0]!.segments[0]!.eventTendencies) {
      expect(item.level).toBe("not_applicable");
      expect(item.original.applicableIntervals).toEqual([]);
    }
    expect(child.report.eventOutlook.every(item => item.branches.every(branch => !branch.items.length))).toBe(true);
  });

  it("preserves B2029 handover dates and all A2028 direction periods even when other years are folded", async () => {
    const b2029 = b.report.years.find(year => year.year === 2029)!;
    expect(b2029.branches[0]!.segments).toHaveLength(2);
    expect(b2029.branches[0]!.segments.every(segment => !segment.sharedNarrativeWith)).toBe(true);
    expect(b2029.branches[0]!.segments[0]!.endExclusiveInstant).toBe("2029-05-22T16:20:00.000Z");
    expect(b2029.branches[0]!.segments[0]!.caption).not.toBe(b2029.branches[0]!.segments[1]!.caption);
    const original = unknown.annual.years.find(year => year.year === 2028)!, row = unknown.report.years.find(year => year.year === 2028)!;
    expect(row.branches.map(branch => branch.segments.length).sort()).toEqual([1, 2]);
    expect(row.branches.flatMap(branch => branch.segments).map(segment => [segment.id, segment.branchId, segment.startInstant, segment.endExclusiveInstant]))
      .toEqual(original.judgmentSegments.map(segment => [segment.id, segment.branchId, segment.startInstant, segment.endExclusiveInstant]));
    render(<BriefReadingReportPanel report={unknown.report} variant="years" />);
    const article = screen.getByRole("article", { name: "2028年简明判断", hidden: true });
    const folded = article.closest<HTMLDetailsElement>("details:not([open])");
    if (folded) await userEvent.click(folded.querySelector("summary")!);
    expect(article.querySelectorAll("[data-branch-id]")).toHaveLength(2);
    expect(article.querySelectorAll("[data-segment-id]")).toHaveLength(3);
    for (const branch of row.branches) expect(within(article).getByRole("heading", { name: branch.label })).toBeTruthy();
    const backward = row.branches.find(branch => branch.id === "backward")!;
    expect(backward.segments[1]!.sharedNarrativeWith).toBe(backward.segments[0]!.id);
    const repeated = [...article.querySelectorAll<HTMLElement>("[data-segment-id]")].find(item => item.dataset.segmentId === backward.segments[1]!.id)!;
    expect(repeated.querySelector<HTMLDetailsElement>("details")!.open).toBe(false);
    expect(visibleText(repeated)).toContain("本段判断与上一时段相同");
    expect(repeated.querySelector("time")!.dateTime).toBe(backward.segments[1]!.startInstant);
    for (const domain of backward.segments[1]!.domains.filter(domain => domain.showInBrief)) {
      expect(repeated.querySelector(`[data-brief-domain="${domain.domain}"] p`)!.textContent).toBe(domain.text);
    }
    expect(article.textContent).toContain("2029/02/03");
    if (chineseCount(unknown.report.bodyText) > 2000) {
      expect(unknown.report.metrics.withinTarget).toBe(false);
      expect(unknown.report.metrics.exceptions.length).toBeGreaterThan(0);
    }
  });

  it("retains independent relationship evidence and never borrows B2030's practical support as a relationship trigger", () => {
    const input = (source: Fixture, year: number) => ({ revision: source.revision, assessment: source.assessment,
      year: source.annual.years.find(item => item.year === year)!, events: source.extras.annualEvents.years.find(item => item.year === year)!, story: source.extras.annualLifeStories.years.find(item => item.year === year)! });
    const thirty = buildBriefAnnualReading(input(b, 2030)).branches[0]!.segments[0]!;
    const thirtyTwo = buildBriefAnnualReading(input(b, 2032)).branches[0]!.segments[0]!;
    expect(thirty.domains.find(domain => domain.domain === "relationship")!.relationshipSignalIds).toEqual([]);
    expect(thirtyTwo.domains.find(domain => domain.domain === "relationship")!.relationshipSignalIds.length).toBeGreaterThan(0);
    const thirtyFive = buildBriefAnnualReading(input(b, 2035)).branches[0]!.segments[0]!;
    expect(thirty.domains.find(domain => domain.domain === "relationship")!.verdict.relationshipChange).toBe("insufficient");
    expect(thirtyTwo.domains.find(domain => domain.domain === "relationship")!.verdict.relationshipChange).toBe("progression");
    expect(thirtyFive.domains.find(domain => domain.domain === "relationship")!.verdict.relationshipChange).toBe("adjustment");
    const a = buildBriefAnnualReading(input(unknown, 2028));
    const forward = a.branches.find(branch => branch.id === "forward")!.segments[0]!.domains.find(domain => domain.domain === "relationship")!;
    const backward = a.branches.find(branch => branch.id === "backward")!.segments[0]!.domains.find(domain => domain.domain === "relationship")!;
    expect(forward.text).not.toBe(backward.text);
    expect(forward.text).toMatch(/调整|磨合/);
    expect(forward.relationshipBackgroundSignalIds.length).toBeGreaterThan(0);
    expect(backward.relationshipBackgroundSignalIds.length).toBeGreaterThan(0);
    // The 2026 annual star triggers only the authority lens. A separate wealth
    // lens has a background clash but no annual trigger; it cannot change this
    // year's authority-lens conclusion into relationship friction.
    const oneLens = buildBriefAnnualReading(input(unknown, 2026));
    const oneLensBackward = oneLens.branches.find(branch => branch.id === "backward")!.segments[0]!.domains.find(domain => domain.domain === "relationship")!;
    const oldTiming = unknown.extras.annualEvents.years.find(year => year.year === 2026)!.branches.find(branch => branch.id === "backward")!
      .segments[0]!.items.find(item => item.relationshipTiming)!.relationshipTiming!;
    expect(oldTiming.lenses.filter(lens => lens.triggerSignalIds.length).map(lens => lens.id)).toEqual(["authority"]);
    expect(oldTiming.lenses.find(lens => lens.id === "authority")!.backgroundSignalIds).toEqual([]);
    expect(oldTiming.lenses.find(lens => lens.id === "wealth")!.backgroundSignalIds.length).toBeGreaterThan(0);
    expect(oneLensBackward.verdict.lensIds).toEqual(["authority"]);
    expect(oneLensBackward.verdict.relationshipChange).toBe("progression");
  });

  it("classifies exact periods from their real pattern/background instead of the annual label or visible actor alone", () => {
    for (const [source, year] of [[b, 2029], [official, 2032]] as const) {
      const original = source.annual.years.find(item => item.year === year)!;
      const row = source.report.years.find(item => item.year === year)!;
      const periods = row.branches[0]!.segments;
      expect(periods).toHaveLength(2);
      const patterns = original.judgmentSegments.map(item => item.judgment.axes.find(axis => axis.axis === "pattern")!);
      const actors = patterns.map(pattern => pattern.stemActions!.items.map(action => [action.visibility, action.tenGod, action.effect]));
      expect(actors[0]).toEqual(actors[1]);
      expect(patterns.map(pattern => pattern.effect)).toEqual(source === b ? ["assists", "mixed"] : ["mixed", "assists"]);
      const expected = source === b ? ["favorable", "mixed"] : ["mixed", "favorable"];
      expect(periods.map(segment => segment.domains.find(domain => domain.domain === "career")!.verdict.direction)).toEqual(expected);
      const overview = source.report.yearOverview.find(domain => domain.domain === "career")!;
      for (let index = 0; index < periods.length; index++) {
        const period = periods[index]!;
        const group = overview.groups.find(item => item.id === expected[index])!;
        const item = group.items.find(item => item.year === year && item.segmentId === period.id)!;
        expect([item.branchId, item.startInstant, item.endExclusiveInstant]).toEqual([period.branchId, period.startInstant, period.endExclusiveInstant]);
        const startDate = new Date(Date.parse(period.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10).replaceAll("-", "/");
        const endDate = new Date(Date.parse(period.endExclusiveInstant) + 8 * 3_600_000).toISOString().slice(0, 10).replaceAll("-", "/");
        expect(item.label).toContain(startDate.slice(5));
        expect(item.label).toContain(endDate.startsWith(String(year)) ? endDate.slice(5) : endDate);
        expect(item.label).toContain("前");
      }
      expect(periods[0]!.domains.find(domain => domain.domain === "career")!.text)
        .not.toBe(periods[0]!.domains.find(domain => domain.domain === "wealth")!.text);
    }
    const forward = unknown.report.years.find(year => year.year === 2028)!.branches.find(branch => branch.id === "forward")!;
    const backward = unknown.report.years.find(year => year.year === 2028)!.branches.find(branch => branch.id === "backward")!;
    expect(forward.segments[0]!.domains.find(domain => domain.domain === "career")!.verdict.direction).toBe("favorable");
    expect(backward.segments.every(segment => segment.domains.find(domain => domain.domain === "career")!.verdict.direction === "pressured")).toBe(true);
    const officialWealth = official.report.years.find(year => year.year === 2029)!.branches[0]!.segments[0]!.domains.find(domain => domain.domain === "wealth")!;
    expect(officialWealth.verdict.direction).toBe("mixed");
    expect(officialWealth.verdict.focus).toBe("support_use");
    expect(officialWealth.verdict.label).not.toMatch(/回报|收益/);
    // A genuinely different existing task may still describe agreed returns.
    expect(b.report.years.find(year => year.year === 2032)!.branches[0]!.segments[0]!.domains.find(domain => domain.domain === "wealth")!.verdict.focus).toBe("returns");
  });

  it("uses child and unknown-hour source scopes instead of adult career and income assumptions", () => {
    const row = child.report.years[0]!, segment = row.branches[0]!.segments[0]!;
    expect(segment.ageLabel).toContain("5—6");
    expect(segment.domains.map(domain => domain.text).join(" ")).not.toMatch(/工资|报酬|结算|结婚|恋爱|岗位/);
    expect(segment.domains.find(domain => domain.domain === "relationship")!.title).toBe("相处");
    expect(segment.domains.find(domain => domain.domain === "wealth")!.title).toBe("时间与用品");
    // Explicit compatibility projection excluding an old cached hour, not a
    // new calculateChart unknown-hour single-chart result.
    const revision = structuredClone(b.revision); revision.input = { ...revision.input, time: null, timePrecision: "unknown_hour" };
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive });
    const report = buildBriefReadingReport(assessment, null, { sourceRevision: revision, comprehensive, synthesis })!;
    expect(report.sourceBinding.includeHour).toBe(false);
    expect(report.currentStages).toEqual([]); expect(report.years).toEqual([]);
    expect(report.domainCards.map(card => card.headline).join(" ")).not.toContain("靠专业本领积累");
  });

  it("keeps a long explicitly adopted original behind a clear entry and suppresses conflicting automatic answers", async () => {
    const longText = `这是已采用的完整个人原文。\n\n${"每段的限定都需要保留，不用自动结论替代。\n".repeat(90)}最后一段也必须完整。`;
    const yearChoice = buildReadingFeedbackChoices(b.assessment, b.annual, []).find(choice => choice.id === "annual-2029")!;
    const choices = [chapterChoice("career"), yearChoice], personalReading = await personalFor(choices, longText);
    const synthesis = buildReadingSynthesis({ revision: b.revision, assessment: b.assessment, comprehensive: b.extras.comprehensive, life: b.extras.life, annual: b.annual, timeline: b.extras.timeline, personal: personalReading });
    const report = buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, synthesis, personalReading })!;
    expect(report.bodyText).not.toContain(longText);
    expect(chineseCount(report.bodyText)).toBeLessThanOrEqual(2000);
    expect(report.personalTexts.map(item => item.text)).toEqual([longText, longText]);
    expect(report.domainCards.find(card => card.id === "career")!.origin).toBe("personal");
    const year = report.years.find(item => item.year === 2029)!;
    for (const segment of year.branches.flatMap(branch => branch.segments)) {
      expect(segment.caption).toContain("个人修订");
      expect(segment.domains.every(domain => domain.origin === "personal")).toBe(true);
    }
    for (const overview of report.yearOverview) {
      expect(overview.groups.flatMap(group => group.items).some(item => item.year === 2029)).toBe(false);
      expect(overview.personalPeriods.filter(item => item.year === 2029)).toHaveLength(2);
    }
    for (const event of report.eventOutlook) {
      expect(event.branches.flatMap(branch => branch.items).some(item => item.year === 2029)).toBe(false);
      expect(event.personalPeriods.filter(item => item.year === 2029)).toHaveLength(2);
    }
    expect(report.years.find(item => item.year === 2032)!.branches).toEqual(b.report.years.find(item => item.year === 2032)!.branches);
    const view = render(<BriefReadingReportPanel report={report} />);
    expect(visibleText(view.container)).not.toContain(longText);
    const career = screen.getByLabelText("事业财运感情完整白话解读").querySelector<HTMLElement>('[data-plain-domain="career"]')!;
    expect(career.textContent).not.toContain(b.report.domainCards.find(card => card.id === "career")!.text);
    const details = career.querySelector<HTMLDetailsElement>("details")!;
    expect(details.open).toBe(false);
    await userEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(true);
    expect(details.querySelector("section p")!.textContent).toBe(longText);
    const retained = await personalFor(choices, longText, "retained");
    const originalSynthesis = buildReadingSynthesis({ revision: b.revision, assessment: b.assessment, comprehensive: b.extras.comprehensive, life: b.extras.life, annual: b.annual, timeline: b.extras.timeline, personal: retained });
    const restored = buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, synthesis: originalSynthesis, personalReading: retained })!;
    expect(restored.personalTexts).toEqual([]);
    expect(restored.domainCards.find(card => card.id === "career")!.text).toBe(b.report.domainCards.find(card => card.id === "career")!.text);
    expect(restored.eventOutlook).toEqual(b.report.eventOutlook);
  });

  it("removes only the adopted wealth period from automatic year classifications while keeping other domains and original text", async () => {
    const reading = b.extras.annualDomains.years.find(item => item.year === 2032)!, branch = reading.branches[0]!, segment = branch.segments[0]!;
    const domain = segment.domains.find(item => item.id === "wealth")!, text = "只替代这一段财务判断。\n原来的个人限制完整保留，不自动改成财运较好。";
    const choice = { id: `annual-domain-${reading.year}-${segment.id}-${domain.id}`, label: `${reading.year}年财务`,
      originalConclusion: annualDomainFeedbackText(reading, branch, segment, domain), sourceVersions: [reading.version, ...reading.sourceVersions] };
    const personalReading = await personalFor([choice], text);
    const report = buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, personalReading })!;
    const wealth = report.yearOverview.find(item => item.domain === "wealth")!;
    expect(wealth.groups.flatMap(group => group.items).some(item => item.year === 2032 && item.segmentId === segment.id)).toBe(false);
    expect(wealth.personalPeriods.map(item => [item.year, item.segmentId])).toEqual([[2032, segment.id]]);
    for (const domain of ["career", "relationship"] as const) {
      expect(report.yearOverview.find(item => item.domain === domain)).toEqual(b.report.yearOverview.find(item => item.domain === domain));
    }
    for (const category of ["money_inflow", "money_loss"]) {
      const event = report.eventOutlook.find(item => item.category === category)!;
      expect(event.branches.flatMap(branch => branch.items).some(item => item.year === 2032 && item.segmentId === segment.id)).toBe(false);
      expect(event.personalPeriods.map(item => [item.year, item.segmentId])).toEqual([[2032, segment.id]]);
      expect(event.personalPeriods[0]!.personalTextIds.map(id => report.personalTexts.find(item => item.id === id)!.text)).toContain(text);
    }
    for (const category of ["promotion", "job_change", "romance", "commitment", "separation"]) {
      expect(report.eventOutlook.find(item => item.category === category)).toEqual(b.report.eventOutlook.find(item => item.category === category));
    }
    render(<BriefReadingReportPanel report={report} />);
    const overview = screen.getByLabelText("事业财运感情年份总判").querySelector<HTMLElement>('[data-year-overview-domain="wealth"]')!;
    expect([...overview.querySelectorAll("a")].some(link => link.textContent?.includes("2032年"))).toBe(false);
    expect(overview.textContent).toContain("已采用个人修订");
    const annual = screen.getByRole("article", { name: "2032年简明判断", hidden: true });
    const personal = annual.querySelector<HTMLElement>('[data-brief-domain="wealth"]')!;
    const details = personal.querySelector<HTMLDetailsElement>("details")!;
    expect(details.open).toBe(false);
    expect(visibleText(personal)).not.toContain(text);
    await userEvent.click(details.querySelector("summary")!);
    expect(details.querySelector("section p")?.textContent).toBe(text);
  });

  it("opens every enclosing detail and selects the linked real year", async () => {
    const selected = vi.fn();
    render(<><BriefReadingReportPanel report={b.report} onSelectYear={selected} />
      <details data-testid="outer"><summary>详细阅读</summary><details data-testid="inner"><summary>原年度</summary><section id="reading-yearly">所选年份的完整判断</section></details></details></>);
    await userEvent.click(screen.getByText("按事件查看年份与原判断"));
    const event = b.report.eventOutlook.find(item => item.category === "money_inflow")!.branches.flatMap(branch => branch.items)[0]!;
    const eventEntry = screen.getByLabelText("具体事件与对应年份").querySelector<HTMLElement>('[data-event-category="money_inflow"]')!;
    await userEvent.click(within(eventEntry).getByRole("link", { name: `${event.label}的${event.headline}判断依据` }));
    expect(selected).toHaveBeenLastCalledWith(event.year);
    expect((screen.getByTestId("outer") as HTMLDetailsElement).open).toBe(true);
    expect((screen.getByTestId("inner") as HTMLDetailsElement).open).toBe(true);
    const overviewItem = b.report.yearOverview.find(item => item.domain === "career")!.groups[0]!.items[0]!;
    const overview = screen.getByLabelText("事业财运感情年份总判").querySelector<HTMLElement>('[data-year-overview-domain="career"]')!;
    await userEvent.click(within(overview).getByRole("link", { name: `${overviewItem.label}的事业判断依据` }));
    expect(selected).toHaveBeenLastCalledWith(overviewItem.year);
    expect((screen.getByTestId("outer") as HTMLDetailsElement).open).toBe(true);
    expect((screen.getByTestId("inner") as HTMLDetailsElement).open).toBe(true);
    (screen.getByTestId("outer") as HTMLDetailsElement).open = false;
    (screen.getByTestId("inner") as HTMLDetailsElement).open = false;
    const first = b.report.years.find(year => year.featured)!;
    await userEvent.click(screen.getByText("展开 10 年的逐年判断"));
    const article = screen.getByRole("article", { name: `${first.year}年简明判断` });
    await userEvent.click(within(article).getByRole("link", { name: "展开本年依据" }));
    expect(selected).toHaveBeenLastCalledWith(first.year);
    expect((screen.getByTestId("outer") as HTMLDetailsElement).open).toBe(true);
    expect((screen.getByTestId("inner") as HTMLDetailsElement).open).toBe(true);
  });

  it("does not show a brief belonging to a different chart, hour scope or annual window", () => {
    const props = { revision: b.revision, caseName: "合成简明入口", assessment: b.assessment, comprehensive: b.extras.comprehensive, synthesis: b.extras.synthesis,
      lifeOutlook: b.extras.life, annualOutlook: b.annual };
    const view = render(<ChartReadingWorkbench {...props} briefReport={b.report} />);
    expect(screen.getByLabelText("事业财运感情完整白话解读")).toBeTruthy();
    const edits = [
      (report: typeof b.report) => { report.sourceBinding.caseId = crypto.randomUUID(); },
      (report: typeof b.report) => { report.sourceBinding.revisionId = crypto.randomUUID(); },
      (report: typeof b.report) => { report.sourceBinding.chartResultHash = "0".repeat(64); },
      (report: typeof b.report) => { report.sourceBinding.includeHour = false; },
      (report: typeof b.report) => { report.coverage.toYear = (report.coverage.toYear ?? 2035) + 1; }
    ];
    for (const edit of edits) {
      const foreign = structuredClone(b.report); edit(foreign); foreign.domainCards[0]!.text = "外来源专用句，不应出现。";
      view.rerender(<ChartReadingWorkbench {...props} briefReport={foreign} />);
      expect(screen.queryByLabelText("事业财运感情完整白话解读")).toBeNull();
      expect(view.container.textContent).not.toContain("外来源专用句，不应出现。");
    }
  });

  it("keeps retired and separated contexts in their actual scope instead of silently restoring generic income or romantic progression", async () => {
    const withContext = async (work: "retired" | "unspecified", relationship: "separated" | "unspecified") => {
      const body = await buildReadingContextRecord(b.revision, null, { work, relationship, fromYear: 2026, toYear: 2035, notes: "合成背景" });
      const contextRecord = { ...note(b, body, 0), tags: ["阅读背景"] };
      const context = (await resolveReadingContext({ revision: b.revision, records: [contextRecord] })).latest;
      const contextual = buildContextualReadingBundle({ revision: b.revision, assessment: b.assessment, comprehensive: b.extras.comprehensive, context,
        referenceYear: 2029, annualDomains: b.extras.annualDomains })!;
      const events = buildReadingAnnualEvents({ revision: b.revision, assessment: b.assessment, annual: b.annual, annualDomains: b.extras.annualDomains, contextual });
      const stories = buildReadingAnnualLifeStories({ revision: b.revision, assessment: b.assessment, annual: b.annual, annualDomains: b.extras.annualDomains, annualEvents: events, contextual });
      return { contextual, events, stories, input: { revision: b.revision, assessment: b.assessment, year: b.annual.years.find(year => year.year === 2032)!,
        events: events.years.find(year => year.year === 2032)!, story: stories.years.find(year => year.year === 2032)!, contextual } };
    };
    const { input } = await withContext("retired", "unspecified");
    const brief = buildBriefAnnualReading(input), retired = brief.branches[0]!.segments[0]!, wealth = retired.domains.find(domain => domain.domain === "wealth")!;
    expect(wealth.title).toBe("日常收支");
    expect(wealth.text).not.toMatch(/报酬|工资|结算|客户/);
    expect(retired.eventTendencies.filter(item => ["promotion", "job_change"].includes(item.category)).every(item => item.level === "not_applicable")).toBe(true);
    expect(retired.eventTendencies.find(item => item.category === "money_inflow")!.text).not.toMatch(/工资|客户|任命|入职/);
    expect(() => buildBriefAnnualReading({ ...input, contextual: undefined })).toThrow(/背景/);
    const separated = await withContext("unspecified", "separated");
    const relationship = buildBriefAnnualReading(separated.input).branches[0]!.segments[0]!.domains.find(domain => domain.domain === "relationship")!;
    expect(relationship.verdict.label).toMatch(/旧|事项|交接|界限/);
    expect(relationship.verdict.label).not.toMatch(/^感情.*推进/);
    expect(buildBriefAnnualReading(separated.input).branches[0]!.segments[0]!.eventTendencies
      .find(item => item.category === "commitment")!.level).toBe("not_applicable");
    const synthesis = buildReadingSynthesis({ revision: b.revision, assessment: b.assessment, comprehensive: b.extras.comprehensive,
      life: b.extras.life, annual: b.annual, timeline: b.extras.timeline, contextual: separated.contextual });
    const report = buildBriefReadingReport(b.assessment, b.annual, { ...b.extras, synthesis, contextual: separated.contextual,
      annualEvents: separated.events, annualLifeStories: separated.stories })!;
    const overview = report.yearOverview.find(item => item.domain === "relationship")!;
    const group = overview.groups.find(item => item.items.some(period => period.year === 2032))!;
    expect(group.label).toMatch(/旧|事项|交接|界限/);
    expect(group.label).not.toMatch(/^感情.*推进/);
  });
});
