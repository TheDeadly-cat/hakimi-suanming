import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange } from "../lib/local-annual-outlook";
import type { LocalOutlookJudgment } from "../lib/local-outlook-judgment";
import { buildReadingPriorities, LOCAL_READING_PRIORITIES_VERSION, type LocalReadingPriorities, type ReadingPriorityYear } from "../lib/local-reading-priorities";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { annualEventFeedbackSubjectId, annualEventFeedbackText, buildReadingAnnualEvents, type LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import { composeAnnualEvents, annualEventCompositionSubjectId } from "../lib/local-annual-event-composition";
import { annualEventCompositionFeedbackText } from "../lib/local-annual-event-composition-record";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading, type LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { PersonalReadingProvider } from "./personal-reading-note";
import { ReadingPrioritiesPanel } from "./reading-priorities-panel";
import { buildReadingAnnualLifeStories } from "../lib/annual-life-story";
import { annualAnswerForYear, annualAnswerYearTitle } from "../lib/annual-answer-navigation";

let seed: LocalOutlookJudgment;
let sourceRevision: RevisionRecord, actualB: Awaited<ReturnType<typeof actual>>, actualUnknown: Awaited<ReturnType<typeof actual>>;
async function actual(date: string, sex: "male" | "unspecified", queryYear: number) {
  const chart = await calculateChart({ ...sourceRevision.input, date, sex }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: sourceRevision.createdAt });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, queryYear, queryYear);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  const events = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  return { priorities: buildReadingPriorities({ revision, annual, annualDomains }), events, annual,
    stories: buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents: events }) };
}
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic priority display", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  seed = (await buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2028)).years[0]!.judgment!;
  sourceRevision = revision;
  [actualB, actualUnknown] = await Promise.all([actual("1995-05-18", "male", 2032), actual("1995-08-18", "unspecified", 2028)]);
});

// Display fixtures deliberately exercise contrasting captions and two branches;
// the source engine's rule accuracy is covered by its own real-case tests.
function year(branchId: "forward" | "backward", yearNumber: number): ReadingPriorityYear {
  const start = `${yearNumber}-02-04T08:00:00.000Z`, middle = `${yearNumber}-08-10T03:25:00.000Z`, end = `${yearNumber + 1}-02-04T08:00:00.000Z`;
  const segments = (yearNumber === 2028 ? [[start, middle], [middle, end]] : [[start, end]]).map(([from, to], index) => ({
    id: `${branchId}-${yearNumber}-${index}`, branchId, startInstant: from!, endExclusiveInstant: to!, judgment: { ...seed, interval: { startInstant: from!, endExclusiveInstant: to! }, summary: `${branchId} ${yearNumber} 第${index + 1}段原判断`, conditions: ["原判断条件不能省略。"], conflicts: ["扶抑与结构存在取舍。"], coverageGaps: ["尚未覆盖的判断保留。"] },
    caption: index === 0 ? "结构较顺（仍有未解条件）" : "结构有压力（交运后）", category: index === 0 ? "conditional" as const : "pressure" as const, primaryAxis: "pattern" as const, primaryEffect: index === 0 ? "assists" as const : "obstructs" as const,
    personalStartInstant: from!, ageStage: "adult" as const, ageLabel: "成年阶段",
    domains: ([ ["career", "事业与任务", "事业"], ["wealth", "资源与兑现", "资源"], ["relationship", "关系与共同安排", "关系"] ] as const).map(([id, title, name]) => ({
      id, title, headline: `${branchId} ${yearNumber} ${name}重点`, summary: `${branchId} ${yearNumber} ${name}完整主题`,
      paragraphs: [`${branchId} ${yearNumber} 第${index + 1}段${name}完整正文`],
      examples: [1, 2, 3].map((n) => `${branchId} ${yearNumber} 第${index + 1}段${name}具体情境${n}`),
      opportunities: [`${name}可发挥的条件，不代表已经发生`], obstacles: id === "relationship" ? [] : [`${branchId} ${yearNumber} 第${index + 1}段${name}主要阻力`, `${name}另一阻力`],
      watchPoints: [`${name}观察点`], conditions: [`${name}原始适用条件`], evidence: [`${name}原始依据`], sourceIds: [`synthetic-${id}-source`], sourceVersions: ["synthetic-domain/1"]
    })), conditions: ["该段的个别条件仍需保留。"]
  }));
  return { id: `${branchId}-${yearNumber}`, year: yearNumber, yearGanZhi: "合成干支", nodeRef: seed.targetRef, startInstant: start, endExclusiveInstant: end,
    caption: yearNumber === 2028 ? "年内两段结论不同，分别阅读" : "条件性 · 结构较顺，其他轴保留条件", summary: `${branchId} ${yearNumber} 年度完整摘要`, categories: ["conditional"], segments,
    selectionReasons: yearNumber === 2028 ? [{ kind: "handover", text: "交运前后，主判断与领域主题发生变化。", turningPointId: null, atInstant: middle, segmentIds: segments.map((segment) => segment.id) }] : [],
    turningPoints: [], gaps: yearNumber === 2029 ? [{ year: 2029, branchId, kind: "missing_background", startInstant: start, endExclusiveInstant: end, message: "缺口保留，不把邻年判断补入。", conditions: ["不外推未知背景。"] }] : [], conditions: ["全年原始限定完整保留。"] };
}
function reading(): LocalReadingPriorities {
  return { version: LOCAL_READING_PRIORITIES_VERSION, sourceBinding: seed.sourceBinding, sourceVersions: [LOCAL_READING_PRIORITIES_VERSION], startYear: 2028, endYear: 2030, lifeReferenceInstant: "2026-10-16T00:00:00.000Z", headline: "先读交运与判断变化所在的年份", summary: "入选理由来自原判断与时间变化，没有新增吉凶评分。",
    branches: (["forward", "backward"] as const).map((id) => ({ id, label: id === "forward" ? "若按顺行" : "若按逆行", priorityYearIds: [`${id}-2028`, `${id}-2030`], years: [year(id, 2028), year(id, 2029), year(id, 2030)], gaps: [], conditions: [`${id} 方向条件分别保留。`] })), limitations: ["先读顺序不是好坏排名。"] };
}

describe("key years and same-branch comparison", () => {
  it("states an identical whole-year caption once while retaining separate intervals and both original segment captions", () => {
    const value = reading(), year = value.branches[0]!.years[0]!;
    year.caption = year.segments[0]!.caption; year.segments[1]!.caption = year.caption;
    const before = JSON.stringify(value); render(<ReadingPrioritiesPanel reading={value} />);
    const card = within(screen.getByRole("region", { name: "若按顺行" })).getByRole("article", { name: "2028年先读" });
    const navigation = within(card).getByLabelText("年份导航摘要");
    expect(navigation.querySelectorAll("[data-navigation-segment]")).toHaveLength(2);
    expect(within(navigation).queryByText(year.caption)).toBeNull();
    expect([...card.querySelectorAll(".reading-priority-caption")].filter((item) => !item.closest("details:not([open])"))).toHaveLength(1);
    const full = within(card).getByText("展开本年完整内容与依据").closest("details")!;
    expect(within(full).getAllByText(year.caption)).toHaveLength(2);
    expect(JSON.stringify(value)).toBe(before);
  });
  it("uses original domain headlines as navigation and keeps full scenes and obstacles after one explicit expansion", async () => {
    render(<ReadingPrioritiesPanel reading={reading()} />);
    const branch = screen.getByRole("region", { name: "若按顺行" }), card = within(branch).getByRole("article", { name: "2030年先读" });
    const navigation = within(card).getByLabelText("年份导航摘要"), full = within(card).getByText("展开本年完整内容与依据").closest("details")!;
    expect(full.open).toBe(false);
    for (const name of ["事业", "资源", "关系"]) {
      expect(within(navigation).getByText(new RegExp(`forward 2030 ${name}重点`)).closest("details:not([open])")).toBeNull();
      expect(within(navigation).queryByText(`forward 2030 第1段${name}具体情境1`)).toBeNull();
    }
    await userEvent.click(within(card).getByText("展开本年完整内容与依据"));
    for (const [title, name] of [["事业与任务", "事业"], ["资源与兑现", "资源"], ["关系与共同安排", "关系"]]) {
      const domain = within(card).getByRole("region", { name: title });
      expect(within(domain).getByText(`forward 2030 ${name}重点`).closest("details:not([open])")).toBeNull();
      for (const n of [1, 2]) expect(within(domain).getByText(`forward 2030 第1段${name}具体情境${n}`).closest("details:not([open])")).toBeNull();
      expect(within(domain).getByText(`forward 2030 第1段${name}具体情境3`).closest("details:not([open])")).not.toBeNull();
      expect(within(domain).getByText(`forward 2030 ${name}完整主题`).closest("details:not([open])")).not.toBeNull();
      expect(within(domain).getByText(`${name}原始适用条件`).closest("details:not([open])")).not.toBeNull();
      if (name === "关系") {
        expect(within(domain).queryByText("主要阻力")).toBeNull();
        expect(domain.className).toBe("reading-priority-domain");
      } else expect(within(domain).getByText(`forward 2030 第1段${name}主要阻力`).closest("details:not([open])")).toBeNull();
    }
    expect(within(card).getByText("forward 2030 第1段原判断").closest("details:not([open])")).not.toBeNull();
  });

  it("keeps opposite branch and handover scenes in their own exact segments while folding selection reasons", async () => {
    const value = reading(), before = JSON.stringify(value); render(<ReadingPrioritiesPanel reading={value} />);
    for (const [label, id] of [["若按顺行", "forward"], ["若按逆行", "backward"]]) {
      const card = within(screen.getByRole("region", { name: label })).getByRole("article", { name: "2028年先读" });
      const navigation = within(card).getByLabelText("年份导航摘要"), previews = navigation.querySelectorAll<HTMLElement>("[data-navigation-segment]");
      expect(previews).toHaveLength(2);
      expect(previews[0]!.querySelectorAll("time")[1]!.dateTime).toBe("2028-08-10T03:25:00.000Z");
      expect(previews[1]!.querySelectorAll("time")[0]!.dateTime).toBe("2028-08-10T03:25:00.000Z");
      expect(within(previews[1]!).getByText("结构有压力（交运后）").closest("details:not([open])")).toBeNull();
      expect(navigation.textContent).not.toContain(id === "forward" ? "backward" : "forward");
      await userEvent.click(within(card).getByText("展开本年完整内容与依据"));
      const segments = within(card).getAllByRole("region", { name: /起的年度分段/ });
      expect(segments).toHaveLength(2);
      segments.forEach((segment, index) => {
        expect(within(segment).getByText(`${id} 2028 第${index + 1}段事业具体情境1`).closest("details:not([open])")).toBeNull();
        expect(within(segment).queryByText(`${id} 2028 第${2 - index}段事业具体情境1`)).toBeNull();
        expect(within(segment).queryByText(`${id === "forward" ? "backward" : "forward"} 2028 第${index + 1}段事业具体情境1`)).toBeNull();
      });
      expect(segments[0]!.querySelectorAll("time")[1]!.dateTime).toBe("2028-08-10T03:25:00.000Z");
      expect(segments[1]!.querySelectorAll("time")[0]!.dateTime).toBe("2028-08-10T03:25:00.000Z");
      expect(within(segments[1]!).getByText("结构有压力（交运后）").closest("details:not([open])")).toBeNull();
      const reason = within(card).getByText("交运前后，主判断与领域主题发生变化。");
      expect(reason.closest("details")!.open).toBe(false);
      await userEvent.click(within(card).getByText("为什么先读这一年")); expect(reason.closest("details")!.open).toBe(true);
      const career = within(segments[0]!).getByRole("region", { name: "事业与任务" });
      await userEvent.click(within(career).getByText("完整领域说明与依据"));
      expect(within(career).getByText("事业原始依据").closest("details:not([open])")).toBeNull();
      expect(within(career).getByText("来源条目：synthetic-career-source")).toBeTruthy();
      expect(within(career).getByText("事业可发挥的条件，不代表已经发生")).toBeTruthy();
    }
    expect(JSON.stringify(value)).toBe(before);
  });

  it("keeps the exact no-relationship-obstacle placeholder as reading scope without labelling it a main obstacle", async () => {
    const value = reading(), sentence = "尚无可单列的年度关系阻碍；其他领域的总体助阻不直接当作关系结果。";
    value.branches[0]!.years[2]!.segments[0]!.domains.find((domain) => domain.id === "relationship")!.obstacles = [sentence];
    const before = JSON.stringify(value); render(<ReadingPrioritiesPanel reading={value} />);
    const card = within(screen.getByRole("region", { name: "若按顺行" })).getByRole("article", { name: "2030年先读" });
    await userEvent.click(within(card).getByText("展开本年完整内容与依据"));
    const relationship = within(card).getByRole("region", { name: "关系与共同安排" });
    expect(within(relationship).queryByText("主要阻力")).toBeNull();
    expect(within(relationship).getByText(sentence).closest("details:not([open])")).not.toBeNull();
    await userEvent.click(within(relationship).getByText("完整领域说明与依据"));
    expect(within(relationship).getByText("阅读范围")).toBeTruthy();
    expect(within(relationship).getByText(sentence).closest("details:not([open])")).toBeNull();
    expect(JSON.stringify(value)).toBe(before);
  });

  it("keeps legacy thin domain text and missing domains readable without synthesizing candidate events", async () => {
    const value = reading(), segment = value.branches[0]!.years[0]!.segments[0]!, original = segment.domains[0]!;
    // Deliberately replay the older projection shape rather than fabricating
    // examples to satisfy the new complete-domain contract.
    segment.domains = [{ id: original.id, title: original.title, headline: original.headline, summary: original.summary, sourceVersions: original.sourceVersions } as typeof original];
    value.branches[0]!.years[0]!.segments[1]!.domains = [];
    render(<ReadingPrioritiesPanel reading={value} />);
    const card = within(screen.getByRole("region", { name: "若按顺行" })).getByRole("article", { name: "2028年先读" });
    await userEvent.click(within(card).getByText("展开本年完整内容与依据"));
    const segments = within(card).getAllByRole("region", { name: /起的年度分段/ });
    expect(within(segments[0]!).queryByText("可对照的情境")).toBeNull();
    expect(within(segments[0]!).getByText(original.summary)).toBeTruthy();
    expect(within(segments[1]!).getByText("forward 2028 第2段原判断").closest("details:not([open])")).toBeNull();
  });

  it("preserves selected reasons, opposite intra-year segments and every other year without rescoring", async () => {
    const value = reading(), before = JSON.stringify(value); render(<ReadingPrioritiesPanel reading={value} />);
    const forward = screen.getByRole("region", { name: "若按顺行" }), card = within(forward).getByRole("article", { name: "2028年先读" });
    expect(within(card).getByText("交运前后，主判断与领域主题发生变化。")).toBeTruthy();
    const split = within(card).getByLabelText("年内不同时间段");
    expect(within(split).getByText("结构较顺（仍有未解条件）")).toBeTruthy(); expect(within(split).getByText("结构有压力（交运后）")).toBeTruthy();
    expect(split.querySelectorAll("time")[1]!.getAttribute("dateTime")).toBe("2028-08-10T03:25:00.000Z");
    const others = within(forward).getByText("查看其余 1 年").closest("details")!; expect(others.open).toBe(false);
    await userEvent.click(within(forward).getByText("查看其余 1 年")); expect(within(others).getByRole("article", { name: "2029年先读" })).toBeTruthy();
    const otherCard = within(others).getByRole("article", { name: "2029年先读" });
    expect(within(within(otherCard).getByLabelText("年份导航摘要")).getByText("缺口保留，不把邻年判断补入。").closest("details:not([open])")).toBeNull(); expect(JSON.stringify(value)).toBe(before);
  });
  it("compares any two years within one branch, retaining domain text, exact intervals and all conditions", async () => {
    const onSelectYear = vi.fn(); render(<ReadingPrioritiesPanel reading={reading()} selectedYear={2030} onSelectYear={onSelectYear} />);
    const summary = screen.getByText("并列比较两年 · 若按顺行"), comparison = summary.closest("details")!;
    await userEvent.click(summary);
    expect((within(comparison).getByLabelText("比较年份一") as HTMLSelectElement).value).toBe("2030");
    await userEvent.selectOptions(within(comparison).getByLabelText("比较年份一"), "2028");
    await userEvent.selectOptions(within(comparison).getByLabelText("比较年份二"), "2029");
    expect(onSelectYear).not.toHaveBeenCalled();
    const left = within(comparison).getByRole("article", { name: "若按顺行 · 2028年比较" });
    expect(within(left).getAllByText("forward 2028 事业完整主题")).toHaveLength(2);
    expect(within(left).getAllByText("原判断条件不能省略。")).toHaveLength(2);
    expect(within(left).getAllByText("扶抑与结构存在取舍。")).toHaveLength(2);
    expect(within(left).getAllByText("尚未覆盖的判断保留。")).toHaveLength(2);
    expect(within(comparison).queryByText(/backward 2028/)).toBeNull();
    const right = within(comparison).getByRole("article", { name: "若按顺行 · 2029年比较" });
    expect(within(right).queryByText("forward 2029 年度完整摘要")).toBeNull();
    expect(within(right).getByText("forward 2029 第1段原判断")).toBeTruthy();
    expect(within(right).getAllByText("条件性 · 结构较顺，其他轴保留条件")).toHaveLength(1);
    expect(within(right).queryByText("结构较顺（仍有未解条件）")).toBeNull();
    expect(right.querySelectorAll(".reading-priority-segment > .reading-priority-period")).toHaveLength(1);
    expect(right.querySelector(".reading-priority-year-detail > .reading-priority-period")).toBeNull();
    const link = within(right).getByRole("link", { name: "阅读 2029 年完整解读 →" }); expect(link.getAttribute("href")).toBe("#reading-yearly");
    await userEvent.click(link); expect(onSelectYear).toHaveBeenCalledExactlyOnceWith(2029);
  });
  it("keeps branch comparison choices independent and prevents comparing the same year twice", async () => {
    render(<ReadingPrioritiesPanel reading={reading()} />);
    const forward = screen.getByText("并列比较两年 · 若按顺行").closest("details")!, backward = screen.getByText("并列比较两年 · 若按逆行").closest("details")!;
    await userEvent.click(within(forward).getByText("并列比较两年 · 若按顺行")); await userEvent.click(within(backward).getByText("并列比较两年 · 若按逆行"));
    await userEvent.selectOptions(within(forward).getByLabelText("比较年份一"), "2029");
    expect((within(backward).getByLabelText("比较年份一") as HTMLSelectElement).value).toBe("2028");
    const second = within(forward).getByLabelText("比较年份二") as HTMLSelectElement;
    expect(second.value).not.toBe("2029"); expect([...second.options].find((option) => option.value === "2029")!.disabled).toBe(true);
  });
  it("resets comparison selection when the bound source changes", async () => {
    const value = reading(), { rerender } = render(<ReadingPrioritiesPanel reading={value} />);
    const comparison = screen.getByText("并列比较两年 · 若按顺行").closest("details")!;
    await userEvent.click(within(comparison).getByText("并列比较两年 · 若按顺行")); await userEvent.selectOptions(within(comparison).getByLabelText("比较年份一"), "2029");
    rerender(<ReadingPrioritiesPanel reading={{ ...value, sourceBinding: { ...value.sourceBinding, revisionId: "another-source" } }} selectedYear={2030} />);
    const changed = screen.getByText("并列比较两年 · 若按顺行").closest("details")!; expect(changed.open).toBe(false);
    expect((within(changed).getByLabelText("比较年份一") as HTMLSelectElement).value).toBe("2030");
  });
  it("does not invent comparison controls or clickable year actions when data/callback is absent", () => {
    const { container, rerender } = render(<ReadingPrioritiesPanel reading={null} />); expect(container.innerHTML).toBe("");
    const value = reading(), first = value.branches[0]!;
    rerender(<ReadingPrioritiesPanel reading={{ ...value, branches: [{ ...first, years: [first.years[0]!], priorityYearIds: [first.years[0]!.id] }] }} />);
    expect(screen.queryByText(/并列比较两年/)).toBeNull(); expect(screen.queryByRole("link")).toBeNull();
  });
});

// The provider consumes already-validated exact-original entries. These view
// fixtures use the real current feedback formatters; persistence validation is
// covered by the personal-reading and record tests rather than mocked here.
function personalEntries(events: LocalReadingAnnualEvents, entries: Array<{ id: string; original: string; text: string }>): LocalPersonalReading {
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { ...events.sourceBinding }, sourceVersions: events.years[0]!.sourceVersions, issues: [],
    entries: entries.map(({ id, original, text }): LocalPersonalReadingEntry => ({ subjectId: id, subjectLabel: id, originalConclusion: original,
      readingVersions: events.years[0]!.sourceVersions, state: "adopted", personalText: text, effectiveConclusion: text, feedback: [], selectedReviewRefs: [], issues: [] })) };
}

describe("compact navigation preserves actual event and personal scopes", () => {
  it("puts the full reading's actual answer in priority navigation without changing the original event details", () => {
    const before = JSON.stringify(actualB), story = actualB.stories.years[0]!, segment = story.branches[0]!.segments[0]!;
    render(<ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} annualLifeStories={actualB.stories} />);
    const navigation = within(screen.getByRole("article", { name: "2032年先读" })).getByLabelText("年份导航摘要");
    expect(within(navigation).getByLabelText("这段年份的主结论").textContent).toBe(segment.headline);
    expect(annualAnswerForYear(actualB.annual.years[0]!, actualB.stories)).toEqual(story);
    expect(annualAnswerYearTitle(story)).toBe(segment.headline);
    expect(JSON.stringify(actualB)).toBe(before);
  });

  it("keeps unknown-direction and handover answers in their own three actual scopes", () => {
    render(<ReadingPrioritiesPanel reading={actualUnknown.priorities} annualEvents={actualUnknown.events} annualLifeStories={actualUnknown.stories} />);
    const story = actualUnknown.stories.years[0]!;
    expect(story.branches.flatMap((branch) => branch.segments)).toHaveLength(3);
    for (const branch of story.branches) {
      const section = screen.getByRole("region", { name: branch.label });
      const answers = within(section).getAllByLabelText("这段年份的主结论");
      expect(answers.map((entry) => entry.textContent)).toEqual(branch.segments.map((segment) => segment.headline));
    }
    expect(annualAnswerYearTitle(story)).toContain("顺行：");
    expect(annualAnswerYearTitle(story)).toContain("逆行：交运前后：");
  });

  it("does not borrow navigation answers from another source or shifted segment", () => {
    const foreign = structuredClone(actualB.stories); foreign.sourceBinding.revisionId = "another-revision";
    const view = render(<ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} annualLifeStories={foreign} />);
    expect(screen.queryByLabelText("这段年份的主结论")).toBeNull();
    expect(annualAnswerForYear(actualB.annual.years[0]!, foreign)).toBeNull();
    const shifted = structuredClone(actualB.stories); shifted.years[0]!.branches[0]!.segments[0]!.startInstant = "2032-03-01T00:00:00Z";
    view.rerender(<ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} annualLifeStories={shifted} />);
    expect(screen.queryByLabelText("这段年份的主结论")).toBeNull();
    expect(annualAnswerForYear(actualB.annual.years[0]!, shifted)).toBeNull();
    expect(screen.getByLabelText("年份导航摘要").textContent).toContain("已有成果");
  });

  it("points to an adopted personal answer instead of covering it with the automatic title", () => {
    const story = actualB.stories.years[0]!, segment = story.branches[0]!.segments[0]!;
    const entry = personalEntries(actualB.events, [{ id: "validated-own-answer", original: "source", text: "个人原文保留在完整阅读" }]).entries[0]!;
    const checkedSources = { [`${story.year}:${segment.id}`]: [entry] };
    render(<ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} annualLifeStories={actualB.stories} annualLifeStoryPersonalSources={checkedSources} />);
    expect(screen.getByLabelText("这段年份的主结论").textContent).toBe("已有个人修订，展开查看");
    expect(annualAnswerYearTitle(story, checkedSources)).toBe("已有个人修订，展开查看");
    expect(annualAnswerYearTitle(story, { [`${story.year + 1}:${segment.id}`]: [entry] })).toBe(segment.headline);
  });

  it("shows B2032's actual settlement and independent relationship titles, retaining all original prose in the full disclosure", async () => {
    const before = JSON.stringify(actualB), events = actualB.events.years[0]!, composed = composeAnnualEvents(events), segment = composed.branches[0]!.segments[0]!;
    const onSelectYear = vi.fn(); render(<ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} onSelectYear={onSelectYear} />);
    const card = screen.getByRole("article", { name: "2032年先读" }), navigation = within(card).getByLabelText("年份导航摘要");
    expect(segment.items.some((item) => item.kind === "settlement")).toBe(true);
    expect(segment.items.some((item) => item.kind === "single" && item.members[0].domain === "relationship")).toBe(true);
    expect(navigation.querySelectorAll("[data-event-id]")).toHaveLength(segment.items.length);
    for (const item of segment.items) {
      const title = item.kind === "settlement" ? item.title : item.members[0].title;
      expect(within(navigation).getByText(title).closest("details:not([open])")).toBeNull();
      for (const member of item.members) expect(navigation.textContent).not.toContain(member.summary);
    }
    const full = within(card).getByText("展开本年完整内容与依据").closest("details")!;
    expect(full.open).toBe(false);
    for (const item of segment.items) for (const member of item.members) {
      expect(full.textContent).toContain(member.summary);
      for (const text of [...member.examples, ...member.why, ...member.applicability, ...member.notApplicableWhen, ...member.conditions, ...member.evidence]) expect(full.textContent).toContain(text);
    }
    await userEvent.click(within(card).getByText("展开本年完整内容与依据")); expect(full.open).toBe(true);
    await userEvent.click(within(card).getByRole("link", { name: "阅读 2032 年完整解读 →" })); expect(onSelectYear).toHaveBeenCalledExactlyOnceWith(2032);
    expect(JSON.stringify(actualB)).toBe(before);
  });

  it("keeps group, member and independent relationship personal text visible, and restores retained or pending originals without stale adoption", () => {
    const reading = actualB.events.years[0]!, branch = reading.branches[0]!, originalSegment = branch.segments[0]!;
    const composition = composeAnnualEvents(reading), segment = composition.branches[0]!.segments[0]!, group = segment.items.find((item) => item.kind === "settlement")!;
    if (group.kind !== "settlement") throw new Error("Real B2032 settlement fixture is required");
    const member = group.members[0], relation = originalSegment.items.find((item) => item.domain === "relationship")!;
    const groupText = "本人采用的整件说明：按实际进度安排。\n第二行完整保留。", memberText = "本人采用的单侧说明：此侧已改为学习用途。", relationText = "本人采用的关系说明：本年按共同安排对照。";
    const entries = [
      { id: annualEventCompositionSubjectId(reading.year, segment, group), original: annualEventCompositionFeedbackText(reading, branch, originalSegment, group), text: groupText },
      { id: annualEventFeedbackSubjectId(reading.year, originalSegment, member), original: annualEventFeedbackText(reading, branch, originalSegment, member), text: memberText },
      { id: annualEventFeedbackSubjectId(reading.year, originalSegment, relation), original: annualEventFeedbackText(reading, branch, originalSegment, relation), text: relationText }
    ];
    const model = personalEntries(actualB.events, entries.slice(1));
    const view = render(<PersonalReadingProvider reading={model}><ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} /></PersonalReadingProvider>);
    const navigation = () => within(screen.getByRole("article", { name: "2032年先读" })).getByLabelText("年份导航摘要");
    expect(within(navigation()).getByText(group.title).closest("details:not([open])")).toBeNull();
    for (const text of [memberText, relationText]) expect(within(navigation()).getByText(text).closest("details:not([open])")).toBeNull();
    view.rerender(<PersonalReadingProvider reading={personalEntries(actualB.events, entries)}><ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} /></PersonalReadingProvider>);
    for (const text of [groupText, memberText, relationText]) expect(within(navigation()).getByText(text, { normalizer: (value) => value }).closest("details:not([open])")).toBeNull();
    expect(within(navigation()).getByText(group.title).closest("details:not([open])")).not.toBeNull();
    const restored = personalEntries(actualB.events, entries);
    restored.entries.forEach((entry, index) => { entry.state = index === 1 ? "needs_more" : "retained"; entry.personalText = null; entry.effectiveConclusion = entry.originalConclusion; });
    view.rerender(<PersonalReadingProvider reading={restored}><ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} /></PersonalReadingProvider>);
    for (const text of [groupText, memberText, relationText]) expect(within(navigation()).queryByText(text, { normalizer: (value) => value })).toBeNull();
    expect(within(navigation()).getByText(group.title).closest("details:not([open])")).toBeNull();
    expect(within(navigation()).getByText(member.summary).closest("details:not([open])")).toBeNull();
    // Matching a subject label alone must not import another chart's personal
    // text into either the compact view or the original/compare disclosures.
    for (const mismatch of [{ caseId: "foreign-case" }, { revisionId: "foreign-revision" }, { chartResultHash: "foreign-hash" }, { includeHour: false }]) {
      const foreign = personalEntries(actualB.events, entries); foreign.sourceBinding = { ...foreign.sourceBinding, ...mismatch };
      view.rerender(<PersonalReadingProvider reading={foreign}><ReadingPrioritiesPanel reading={actualB.priorities} annualEvents={actualB.events} /></PersonalReadingProvider>);
      for (const text of [groupText, memberText, relationText]) expect(view.container.textContent).not.toContain(text);
      expect(within(navigation()).getByText(group.title).closest("details:not([open])")).toBeNull();
      expect(navigation().querySelector(".reading-priority-personal-member")).toBeNull();
    }
  });

  it("retains the unknown direction's one forward and two backward periods and keeps a personal change in its actual period", async () => {
    const reading = actualUnknown.events.years[0]!, backward = reading.branches.find((branch) => branch.id === "backward")!, target = backward.segments[1]!, item = target.items[0]!;
    const personalText = "只用于逆行交运后这一段的本人修订。";
    const personal = personalEntries(actualUnknown.events, [{ id: annualEventFeedbackSubjectId(reading.year, target, item), original: annualEventFeedbackText(reading, backward, target, item), text: personalText }]);
    const before = JSON.stringify(actualUnknown);
    render(<PersonalReadingProvider reading={personal}><ReadingPrioritiesPanel reading={actualUnknown.priorities} annualEvents={actualUnknown.events} /></PersonalReadingProvider>);
    for (const branch of actualUnknown.priorities.branches) {
      const card = within(screen.getByRole("region", { name: branch.label })).getByRole("article", { name: "2028年先读" });
      const navigation = within(card).getByLabelText("年份导航摘要"), previews = navigation.querySelectorAll<HTMLElement>("[data-navigation-segment]");
      expect(previews).toHaveLength(branch.id === "forward" ? 1 : 2);
      branch.years[0]!.segments.forEach((segment, index) => {
        expect([...previews[index]!.querySelectorAll("time")].map((time) => time.dateTime)).toEqual([segment.startInstant, segment.endExclusiveInstant]);
        if (previews.length > 1 && segment.caption !== branch.years[0]!.caption) expect(within(previews[index]!).getByText(segment.caption)).toBeTruthy();
        if (segment.id === target.id) expect(within(previews[index]!).getByText(personalText).closest("details:not([open])")).toBeNull();
        else expect(within(previews[index]!).queryByText(personalText)).toBeNull();
      });
      await userEvent.click(within(card).getByText("展开本年完整内容与依据"));
      expect(within(card).getAllByRole("region", { name: /起的年度分段/ })).toHaveLength(previews.length);
    }
    expect(JSON.stringify(actualUnknown)).toBe(before);
  });
});
