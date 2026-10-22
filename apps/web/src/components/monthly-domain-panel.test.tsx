import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { AnnualDomainReading } from "../lib/local-annual-domain-reading";
import type { LocalMonthlyDomainReading } from "../lib/local-monthly-domain-reading";
import { buildLocalMonthlyOutlook } from "../lib/local-detailed-outlook";
import { outlookDirectionCaption } from "../lib/outlook-judgment-presentation";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { readingFeedbackSource } from "../lib/local-reading-feedback";
import { PersonalReadingProvider } from "./personal-reading-note";
import { MonthlyDomainPanel } from "./monthly-domain-panel";
import { buildMonthlyDomainReadings } from "../lib/local-monthly-domain-reading";
import { plainMonthlyPresentation } from "../lib/plain-monthly-presentation";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, reading: LocalMonthlyDomainReading;
let fullMonthly: Awaited<ReturnType<typeof buildLocalMonthlyOutlook>>;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic monthly UI", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  const monthly = await buildLocalMonthlyOutlook(revision, assessment, 2028);
  fullMonthly = monthly;
  const month = monthly.months.find((item) => item.judgmentSegments.filter((segment) => segment.branchId === "backward").length > 1);
  if (!month) throw new Error("Expected the real 2028 within-month handover for this synthetic chart");
  // Time boundaries, refs and branch assignment are actual calculation results.
  // Domain phrases are explicit UI fixtures; this test does not establish rule accuracy.
  reading = { monthId: month.id, label: month.label, ganZhi: month.ganZhi, nodeRef: month.nodeRef, startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant,
    status: "ready", headline: "本月分别看任务推进、资源安排与关系协作", summary: "同月交运前后保留原判断，顺逆各自阅读。",
    branches: month.branches.map((branch) => ({ id: branch.id, label: branch.label, conditions: [`${branch.id} 分支条件原样保留。`], gaps: [],
      segments: branch.judgmentSegments.map((segment, index) => ({ id: segment.id, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
        personalStartInstant: segment.startInstant, backgroundRefs: segment.judgment.backgroundRefs,
        backgroundLabels: segment.judgment.backgroundRefs.map((ref) => ref.nodeType === "year" ? `${monthly.yearGanZhi}流年` : `${branch.segments.find((item) => item.nodeRef.nodeId === ref.nodeId)?.ganZhi ?? "未知"}大运`),
        judgmentVersion: segment.judgment.version, policyVersion: segment.judgment.policyVersion, judgmentCaption: outlookDirectionCaption(segment.judgment, null),
        ageStage: "adult" as const, ageLabel: "33 周岁 · 合成显示样例", conditions: [`${branch.id} 第${index + 1}段原条件`],
        domains: (["career", "wealth", "relationship"] as const).map((id): AnnualDomainReading => ({ id, title: { career: "事业与任务", wealth: "资源与兑现", relationship: "关系与共同安排" }[id],
          headline: `${branch.id} ${index + 1} ${id} 主结论`, summary: `${branch.id} ${index + 1} ${id} 具体结论`, paragraphs: [`${branch.id} ${index + 1} ${id} 完整生活解释`],
          examples: [`${id} 现实对照例子`], opportunities: [`${id} 可发挥部分`], obstacles: [`${id} 需要留意的阻力`], watchPoints: [`${id} 后续观察点`],
          conditions: [`${id} 必须保留的条件`], evidence: [`${id} 实际依据`], sourceIds: ["synthetic-monthly-source"] })) })) })) };
});

function personal(subjectId: string, adopted: boolean): LocalPersonalReading {
  const proposal = "本人明确采用的本月事业修订，不替换其他分段。";
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true }, sourceVersions: [LOCAL_PERSONAL_READING_VERSION], issues: [],
    entries: [{ subjectId, subjectLabel: "本月事业", originalConclusion: "保存的原月度解读", readingVersions: ["synthetic-monthly/1"], state: adopted ? "adopted" : "feedback_only", personalText: adopted ? proposal : null, effectiveConclusion: adopted ? proposal : "保存的原月度解读", issues: [], selectedReviewRefs: [],
      feedback: [{ rootRef: { noteId: "33333333-3333-4333-8333-333333333333", editVersion: 1, bodySha256: "a".repeat(64), createdAt: "2026-10-16T01:00:00.000Z" }, latestReviewRef: adopted ? { noteId: "44444444-4444-4444-8444-444444444444", editVersion: 1, bodySha256: "b".repeat(64), createdAt: "2026-10-16T02:00:00.000Z" } : null,
        rating: "partial", aspect: "任务安排", occurredAt: "2028 年十二月", actualSituation: "此为合成反馈。", requestedRevision: proposal, reviewState: adopted ? "revised" : null, reviewNotes: adopted ? "本人已采用" : null, revisedConclusion: adopted ? proposal : null,
        source: readingFeedbackSource(assessment), canReview: true, chainIssues: [] }] }] };
}

describe("monthly domain reading display", () => {
  it("shows a bound plain answer and one concrete situation while keeping all original text and independent relationship wording", () => {
    const collection=buildMonthlyDomainReadings({revision,assessment,monthly:fullMonthly});
    const actual=collection.months.find(item=>item.monthId===reading.monthId)!,segment=actual.branches[0]!.segments[0]!,domain=segment.domains[0]!;
    const month=fullMonthly.months.find(item=>item.id===actual.monthId)!;
    const plain=plainMonthlyPresentation({collection,reading:actual,segment,domain,month,revision})!;
    const before=JSON.stringify(collection),view=render(<MonthlyDomainPanel collection={collection} reading={actual} month={month} revision={revision}/>);
    const period=view.container.querySelector(`[data-segment-id="${segment.id}"]`)!;
    const card=within(period as HTMLElement).getByRole("article",{name:domain.title});
    expect(within(card).getByText(plain.summary).closest("details")).toBeNull();
    const original=within(card).getByText("完整原解释与判断依据").closest("details")!;
    expect(original.open).toBe(false);expect(original.textContent).toContain(domain.summary);
    for(const example of domain.examples)expect(original.textContent).toContain(example);
    const relation=segment.domains.find(item=>item.id==="relationship")!;
    expect(within(period as HTMLElement).getByText(relation.summary).closest("details")).toBeNull();
    expect(JSON.stringify(collection)).toBe(before);
  });
  it("returns nothing without a month and keeps a calendar-only month free of personal domain claims", () => {
    const { container, rerender } = render(<MonthlyDomainPanel reading={null} />); expect(container.innerHTML).toBe("");
    rerender(<MonthlyDomainPanel reading={{ ...reading, status: "before_birth", headline: "出生前只保留节令月事实", summary: "不作个人方向或生活主题判断。", branches: [] }} onFeedbackDomain={vi.fn()} />);
    expect(screen.getByText("不作个人方向或生活主题判断。")).toBeTruthy(); expect(screen.queryByRole("article")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull(); expect(container.querySelectorAll("time")).toHaveLength(2);
  });
  it("preserves real within-month handover boundaries and all domains independently in both branches", () => {
    const before = JSON.stringify(reading); render(<MonthlyDomainPanel reading={reading} />);
    const forwardData = reading.branches.find((branch) => branch.id === "forward")!, backwardData = reading.branches.find((branch) => branch.id === "backward")!;
    expect(forwardData.segments).toHaveLength(1); expect(backwardData.segments).toHaveLength(2);
    const forward = screen.getByRole("region", { name: forwardData.label }), backward = screen.getByRole("region", { name: backwardData.label });
    expect(within(forward).getAllByRole("article")).toHaveLength(3); expect(within(backward).getAllByRole("article")).toHaveLength(6);
    const segments = backward.querySelectorAll<HTMLElement>("[data-segment-id]");
    expect(segments).toHaveLength(2); expect(segments[0]!.querySelectorAll("time")[1]!.getAttribute("dateTime")).toBe(backwardData.segments[0]!.endExclusiveInstant);
    expect(segments[1]!.querySelectorAll("time")[0]!.getAttribute("dateTime")).toBe(backwardData.segments[1]!.startInstant);
    expect(backwardData.segments[0]!.endExclusiveInstant).toBe(backwardData.segments[1]!.startInstant);
    for (const segment of backwardData.segments) { const card = [...segments].find((item) => item.getAttribute("data-segment-id") === segment.id)!;
      expect(within(card).getByText(segment.judgmentCaption)).toBeTruthy(); expect(within(card).getByText(segment.backgroundLabels.join(" · "))).toBeTruthy();
      expect(within(card).getByText(segment.conditions[0]!)).toBeTruthy(); }
    expect(within(forward).queryByText("backward 2 career 具体结论")).toBeNull(); expect(JSON.stringify(reading)).toBe(before);
  });
  it("puts concrete examples early and folds the complete domain evidence without exposing source IDs", async () => {
    const { container } = render(<MonthlyDomainPanel reading={reading} />);
    const branch = screen.getByRole("region", { name: reading.branches[0]!.label }), domain = within(branch).getAllByRole("article", { name: "事业与任务" })[0]!;
    expect(domain.textContent!.indexOf("career 现实对照例子")).toBeLessThan(domain.textContent!.indexOf("career 完整生活解释"));
    expect(within(domain).getByText("career 可发挥部分")).toBeTruthy(); expect(within(domain).getByText("career 需要留意的阻力")).toBeTruthy(); expect(within(domain).getByText("career 后续观察点")).toBeTruthy();
    const details = within(domain).getByText("这项月度解读的条件与依据").closest("details")!; expect(details.open).toBe(false);
    await userEvent.click(within(domain).getByText("这项月度解读的条件与依据")); expect(details.open).toBe(true);
    expect(within(details).getByText("career 必须保留的条件")).toBeTruthy(); expect(container.textContent).not.toContain("synthetic-monthly-source");
  });
  it("routes feedback to the exact month, original segment and domain with a working anchor", async () => {
    const callback = vi.fn(); render(<MonthlyDomainPanel reading={reading} onFeedbackDomain={callback} />);
    const branch = reading.branches.find((item) => item.id === "backward")!, segment = branch.segments[1]!;
    const region = screen.getByRole("region", { name: branch.label }), second = [...region.querySelectorAll<HTMLElement>("[data-segment-id]")].find((item) => item.getAttribute("data-segment-id") === segment.id)!;
    const domain = within(second).getByRole("article", { name: "资源与兑现" }), link = within(domain).getByRole("link", { name: "反馈这项解读" });
    expect(link.getAttribute("href")).toBe("#reading-feedback"); await userEvent.click(link);
    expect(callback).toHaveBeenCalledExactlyOnceWith(`monthly-domain-${reading.monthId}-${segment.id}-wealth`);
  });
  it("uses adopted personal text only for the exact scoped domain and leaves feedback accessible", async () => {
    const branch = reading.branches.find((item) => item.id === "backward")!, segment = branch.segments[1]!, subjectId = `monthly-domain-${reading.monthId}-${segment.id}-career`;
    const callback = vi.fn(); render(<PersonalReadingProvider reading={personal(subjectId, true)}><MonthlyDomainPanel reading={reading} onFeedbackDomain={callback} /></PersonalReadingProvider>);
    expect(screen.getAllByText("已采用的个人修订")).toHaveLength(1);
    const revised = screen.getByRole("region", { name: "本月事业 · 个人阅读" });
    const original = within(revised).getByText("对照原计算解读").closest("details")!; expect(original.open).toBe(false);
    expect(within(original).getByText("backward 2 career 具体结论")).toBeTruthy(); expect(screen.getByText("forward 1 career 具体结论")).toBeTruthy();
    const article = revised.closest("article")!, feedback = within(article).getByRole("link", { name: "反馈这项解读" }); expect(original.contains(feedback)).toBe(false);
    await userEvent.click(feedback); expect(callback).toHaveBeenCalledExactlyOnceWith(subjectId);
  });
  it("does not silently adopt an unreviewed proposal or fabricate a feedback action", () => {
    const segment = reading.branches[0]!.segments[0]!, subjectId = `monthly-domain-${reading.monthId}-${segment.id}-relationship`;
    render(<PersonalReadingProvider reading={personal(subjectId, false)}><MonthlyDomainPanel reading={reading} /></PersonalReadingProvider>);
    expect(screen.queryByText("已采用的个人修订")).toBeNull(); expect(screen.getByText("尚未采用的个人修订建议")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "反馈这项解读" })).toBeNull();
  });
  it("shows a year-only background and an explicit coverage gap without supplying a fictional decade", () => {
    const copy = structuredClone(reading), branch = copy.branches[0]!, segment = branch.segments[0]!;
    copy.branches = [branch]; branch.segments = [segment]; segment.backgroundRefs = segment.backgroundRefs.filter((ref) => ref.nodeType === "year"); segment.backgroundLabels = ["戊申流年"];
    branch.gaps = [{ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, message: "合成缺口说明：这段背景未覆盖，未借相邻大运补齐。" }];
    render(<MonthlyDomainPanel reading={copy} />); expect(screen.getByText("戊申流年 · 尚无大运背景")).toBeTruthy();
    expect(screen.getByText(branch.gaps[0]!.message)).toBeTruthy();
  });
});
