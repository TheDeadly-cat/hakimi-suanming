import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { annualMonthStoryFixture } from "../lib/annual-month-story-test-fixture";
import { annualMonthStoryEntries, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions, annualMonthStorySubjectId } from "../lib/local-annual-month-story-record";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { AnnualMonthStoryPanel } from "./annual-month-story-panel";
import { PersonalReadingProvider } from "./personal-reading-note";
import { plainMonthlyPresentation } from "../lib/plain-monthly-presentation";

let known: Awaited<ReturnType<typeof annualMonthStoryFixture>>, unknown: typeof known;
beforeAll(async () => { [known, unknown] = await Promise.all([annualMonthStoryFixture(), annualMonthStoryFixture("unspecified")]); }, 60_000);
afterEach(cleanup);
function personalFor(subject?: string): LocalPersonalReading {
  const story = known.story, { month, branch, period, domain } = annualMonthStoryEntries(story)[0]!;
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: story.sourceBinding, sourceVersions: [], issues: [], entries: [{
    subjectId: subject ?? annualMonthStorySubjectId(story, month, period, domain), subjectLabel: "合成个人补充",
    originalConclusion: annualMonthStoryFeedbackText(story, month, branch, period, domain), readingVersions: annualMonthStoryFeedbackVersions(story),
    state: "adopted", personalText: "本人补充\n这年先完成学习", effectiveConclusion: "本人补充\n这年先完成学习", feedback: [], selectedReviewRefs: [], issues: [] }] };
}
describe("visible year-to-month reading", () => {
  it("uses the same plain monthly answer while keeping original explanations and all examples folded in the exact period", () => {
    const {source,story}=known,entry=annualMonthStoryEntries(story)[0]!;
    const reading=source.monthlyDomains.months.find(item=>item.monthId===entry.month.monthId)!;
    const segment=reading.branches.find(item=>item.id===entry.branch.id)!.segments.find(item=>item.id===entry.period.id)!;
    const domain=segment.domains.find(item=>item.id==="career")!,month=source.monthly.months.find(item=>item.id===reading.monthId)!;
    const plain=plainMonthlyPresentation({reading,segment,domain,month,revision:source.revision,collection:source.monthlyDomains})!;
    const before=JSON.stringify(source),view=render(<AnnualMonthStoryPanel story={story} monthly={source.monthly} monthlyDomains={source.monthlyDomains} revision={source.revision}/>);
    const card=view.container.querySelector(`[data-story-period="${entry.period.id}"]`)!;
    expect(within(card as HTMLElement).getByText(plain.summary).closest("details")).toBeNull();
    const details=within(card as HTMLElement).getByText("这一段的衔接依据与范围").closest("details")!;
    expect(details.open).toBe(false);expect(details.textContent).toContain(entry.domain.summary);
    for(const example of entry.domain.examples)expect(details.textContent).toContain(example);
    expect(JSON.stringify(source)).toBe(before);
  });
  it("shows twelve readable monthly answers, opens their exact month and feedback topic, and supports keyboard topic navigation", () => {
    const onSelectMonth = vi.fn(), onFeedback = vi.fn(), before = JSON.stringify(known.story);
    const { container } = render(<AnnualMonthStoryPanel story={known.story} onSelectMonth={onSelectMonth} onFeedback={onFeedback} />);
    expect(container.querySelectorAll("[data-story-month]").length).toBe(12);
    const links = screen.getAllByRole("link", { name: "读这月" });
    fireEvent.click(links[9]!); expect(onSelectMonth).toHaveBeenCalledWith(known.story.months[9]!.monthId);
    expect(links[9]!.getAttribute("href")).toBe("#reading-monthly-detail");
    const first = annualMonthStoryEntries(known.story)[0]!;
    fireEvent.click(screen.getAllByRole("link", { name: "反馈这段年月说明" })[0]!);
    expect(onFeedback).toHaveBeenCalledWith(annualMonthStorySubjectId(known.story, first.month, first.period, first.domain));
    const career = screen.getByRole("tab", { name: "事业与任务" });
    fireEvent.keyDown(career, { key: "End" });
    expect(screen.getByRole("tab", { name: "关系与相处" }).getAttribute("aria-selected")).toBe("true");
    const relationship = first.period.domains.find((item) => item.id === "relationship")!;
    expect(screen.getAllByText(relationship.summary).some((item) => !item.closest("details:not([open])"))).toBe(true);
    // The overall monthly pressure label must not masquerade as a relationship rating.
    expect(container.querySelector(".annual-month-story-caption")!.closest("details:not([open])")).not.toBeNull();
    fireEvent.keyDown(screen.getByRole("tab", { name: "关系与相处" }), { key: "Home" });
    expect(career.getAttribute("aria-selected")).toBe("true"); expect(JSON.stringify(known.story)).toBe(before);
  });
  it("keeps unknown directions separate and retains both actual periods of the handover month", () => {
    const { container } = render(<AnnualMonthStoryPanel story={unknown.story} />);
    expect(container.querySelectorAll("[data-story-month]").length).toBe(24);
    const month = unknown.story.months.find((item) => item.label === "大雪月")!;
    expect(month.branches.map((branch) => branch.periods.length).sort()).toEqual([1, 2]);
    for (const branch of month.branches) {
      const branchPanel = screen.getByRole("region", { name: `${branch.label}的年月衔接` });
      for (const period of branch.periods) {
        const domain = period.domains.find((item) => item.id === "career")!;
        const articles = within(branchPanel).getAllByRole("article", { name: `${month.label} · ${domain.title}` });
        const article = articles.find((item) => item.getAttribute("data-story-period") === period.id)!;
        expect(article).toBeTruthy(); expect(article.textContent).toContain(domain.summary);
        expect(article.querySelector(`time[datetime="${period.personalStartInstant}"]`)).not.toBeNull();
        expect(article.querySelector(`time[datetime="${period.endExclusiveInstant}"]`)).not.toBeNull();
      }
    }
  });
  it("puts an adopted own passage first while retaining the automatic answer for comparison", () => {
    const personal = personalFor(), first = annualMonthStoryEntries(known.story)[0]!;
    render(<PersonalReadingProvider reading={personal}><AnnualMonthStoryPanel story={known.story} personal={personal} /></PersonalReadingProvider>);
    const own = screen.getByRole("region", { name: "合成个人补充 · 个人阅读" });
    expect(within(own).getByText("本人补充\n这年先完成学习", { normalizer: (value) => value }).closest("details:not([open])")).toBeNull();
    expect(within(own).getByText(first.domain.summary).closest("details:not([open])")).not.toBeNull();
  });
  it("quotes adopted upstream text without converting it into a computed monthly event, and rejects a foreign provider", () => {
    const personal = personalFor(`annual-${known.story.year}`), view = render(<AnnualMonthStoryPanel story={known.story} personal={personal} />);
    expect(screen.getAllByText("这一段的年度或月度来源已有个人修订").length).toBeGreaterThan(0);
    expect(screen.getAllByText("本人补充\n这年先完成学习", { normalizer: (value) => value }).every((item) => item.tagName === "BLOCKQUOTE")).toBe(true);
    expect(screen.getAllByText(annualMonthStoryEntries(known.story)[0]!.domain.summary).every((item) => item.closest("details:not([open])"))).toBe(true);
    view.unmount();
    const foreign = personalFor(); foreign.sourceBinding = { ...foreign.sourceBinding, revisionId: crypto.randomUUID() };
    render(<PersonalReadingProvider reading={foreign}><AnnualMonthStoryPanel story={known.story} personal={foreign} /></PersonalReadingProvider>);
    expect(screen.queryByText("本人补充\n这年先完成学习", { normalizer: (value) => value })).toBeNull();
    expect(screen.queryByText("这一段的年度或月度来源已有个人修订")).toBeNull();
  });
});
