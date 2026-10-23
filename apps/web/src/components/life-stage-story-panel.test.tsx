import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "../lib/local-detailed-outlook";
import { buildLifeStageStory } from "../lib/local-life-stage-story";
import { lifeStageStoryFeedbackText, lifeStageStoryFeedbackVersions, lifeStageStorySubjectId, lifeStageStoryTransitionSubjectId } from "../lib/local-life-stage-story-record";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "../lib/local-reading-feedback";
import { buildLocalPersonalReading } from "../lib/local-personal-reading";
import { PersonalReadingProvider } from "./personal-reading-note";
import { DetailedOutlookPanel } from "./detailed-outlook-panel";
import { plainLifeStagePresentation } from "../lib/plain-life-stage-presentation";

async function fixture(date: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: { label: "Synthetic life stages", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, 2026);
  return { revision, assessment, life, story: buildLifeStageStory({ revision, assessment, life }) };
}
let b: Awaited<ReturnType<typeof fixture>>, unknown: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { [b, unknown] = await Promise.all([fixture("1995-05-18"), fixture("1995-08-18", "unspecified")]); });
afterEach(cleanup);
const base = { monthly: null, lifeLoading: false, monthlyLoading: false, lifeError: null, monthlyError: null, year: 2026, onYearChange: vi.fn() };

describe("life stages as connected readings", () => {
  it("shows the actual current story, keeps original evidence folded, and opens its exact next decade", () => {
    const branch = b.story.branches[0]!, stage = branch.stages.find((item) => item.decadeId === branch.currentDecadeId)!;
    const transition = branch.transitions.find((item) => item.fromDecadeId === stage.decadeId)!, next = branch.stages.find((item) => item.decadeId === transition.toDecadeId)!;
    const onFeedbackDomain = vi.fn();
    const view = render(<DetailedOutlookPanel {...base} life={b.life} lifeStageStory={b.story} onFeedbackDomain={onFeedbackDomain} />);
    const plain = plainLifeStagePresentation(b.story, stage, b.life)!;
    expect(screen.getByRole("heading", { name: plain.caption })).toBeTruthy();
    const stageOriginal = screen.getByText("完整阶段原文、可用配合与牵制").closest("details")!;
    expect(stageOriginal.open).toBe(false); expect(stageOriginal.textContent).toContain(stage.headline);
    const visibleNarrative = view.container.querySelector("[data-stage-story] .life-stage-narrative")!;
    for (const domain of plain.domains) expect(visibleNarrative.textContent).toContain(domain.summary);
    for (const paragraph of stage.paragraphs) expect(stageOriginal.textContent).toContain(paragraph);
    const relation=b.life.decades.find(item=>item.id===stage.decadeId)!.relationship;
    expect(screen.getAllByText(relation.text,{exact:true}).some(node=>!node.closest("details:not([open])"))).toBe(true);
    const original = view.container.querySelector<HTMLDetailsElement>(".life-stage-original")!;
    expect(original.open).toBe(false);
    for (const paragraph of b.life.decades.find((item) => item.id === stage.decadeId)!.paragraphs) expect(original.textContent).toContain(paragraph);
    expect(view.container.querySelector("[data-stage-transition]")!.textContent).toContain(transition.paragraphs[0]!);
    fireEvent.click(screen.getByRole("link", { name: "反馈这步大运的说明" }));
    expect(onFeedbackDomain).toHaveBeenCalledWith(lifeStageStorySubjectId(b.story, stage));
    fireEvent.click(screen.getByRole("link", { name: "反馈这次阶段变化" }));
    expect(onFeedbackDomain).toHaveBeenCalledWith(lifeStageStoryTransitionSubjectId(b.story, transition));
    fireEvent.click(screen.getByRole("link", { name: `读下一步：${next.ganZhi}大运 →` }));
    expect(screen.getByRole("heading", { name: plainLifeStagePresentation(b.story, next, b.life)!.caption })).toBeTruthy();
    expect(screen.getByText("完整阶段原文、可用配合与牵制").closest("details")!.textContent).toContain(next.headline);
    expect((screen.getByLabelText("选择人生阶段") as HTMLSelectElement).value).toBe(next.decadeId);
    expect(view.container.querySelector("#reading-life-stage")!.getAttribute("tabindex")).toBe("-1");
  });

  it("does not attach a foreign, stale or shifted story to the live decade", () => {
    const variants = [
      (story: typeof b.story) => { story.sourceBinding.chartResultHash = "foreign"; },
      (story: typeof b.story) => { story.referenceInstant = "2025-07-01T04:00:00.000Z"; },
      (story: typeof b.story) => { story.branches[0]!.stages[0]!.startInstant = "2000-01-01T00:00:00.000Z"; }
    ];
    const view = render(<DetailedOutlookPanel {...base} life={b.life} />);
    for (const alter of variants) {
      const story = structuredClone(b.story); alter(story);
      view.rerender(<DetailedOutlookPanel {...base} life={b.life} lifeStageStory={story} />);
      expect(view.container.querySelector("[data-stage-story]")).toBeNull();
      expect(view.container.querySelector(".outlook-period-reading")!.textContent).toContain(b.life.decades.find((item) => item.isCurrent)!.paragraphs[0]!);
    }
  });

  it("keeps forward and backward alternatives separate when following adjacent stages", () => {
    const branch = unknown.story.branches.find((item) => item.id === "forward")!;
    const stage = branch.stages.find((item) => item.decadeId === branch.currentDecadeId)!;
    const transition = branch.transitions.find((item) => item.fromDecadeId === stage.decadeId)!, next = branch.stages.find((item) => item.decadeId === transition.toDecadeId)!;
    const view = render(<DetailedOutlookPanel {...base} life={unknown.life} lifeStageStory={unknown.story} />);
    fireEvent.change(screen.getByLabelText("选择人生阶段"), { target: { value: stage.decadeId } });
    const storyRegion = view.container.querySelector("[data-stage-story]")!;
    expect(storyRegion.getAttribute("data-stage-story")).toBe(stage.decadeId);
    expect(storyRegion.textContent).toContain(branch.label);
    fireEvent.click(screen.getByRole("link", { name: `读下一步：${next.ganZhi}大运 →` }));
    expect(view.container.querySelector("[data-stage-story]")!.getAttribute("data-stage-story")).toBe(next.decadeId);
    expect(branch.stages.some((item) => item.decadeId === next.decadeId)).toBe(true);
  });

  it("shows an explicitly adopted stage first and folds the transition that depends on it", async () => {
    const branch = b.story.branches[0]!, stage = branch.stages.find((item) => item.decadeId === branch.currentDecadeId)!;
    const choice = { id: lifeStageStorySubjectId(b.story, stage), label: stage.headline,
      originalConclusion: lifeStageStoryFeedbackText(b.story, branch, stage), sourceVersions: lifeStageStoryFeedbackVersions(b.story) };
    const note = (body: string, minute: number): ResearchNoteRecord => ({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: b.revision.caseId,
      anchor: { kind: "revision", revisionId: b.revision.id }, bodyFormat: "markdown", body, tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1,
      createdAt: `2026-10-16T00:0${minute}:00.000Z`, updatedAt: `2026-10-16T00:0${minute}:00.000Z` });
    const root = note(buildStructuredReadingFeedback(b.assessment, { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
      sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成阶段反馈", occurredAt: "2026", actualSituation: "测试样例", requestedRevision: "我对这步大运有自己的解释。" }), 1);
    const review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(b.assessment, choice.sourceVersions), { state: "revised", notes: "明确采用合成文本", revisedConclusion: "个人阶段：这几年我在重新安排学习。", occurredAt: "2026" }), 2);
    const personal = await buildLocalPersonalReading({ ...b, choices: [choice], records: [root, review] });
    const view = render(<PersonalReadingProvider reading={personal}><DetailedOutlookPanel {...base} life={b.life} lifeStageStory={b.story} personalReading={personal} /></PersonalReadingProvider>);
    const adoptedComparison = view.container.querySelector<HTMLDetailsElement>("[data-stage-story] > .personal-reading-note--adopted > .personal-reading-computed")!;
    expect(adoptedComparison).not.toBeNull();
    expect(adoptedComparison.open).toBe(false);
    expect(adoptedComparison.textContent).toContain(stage.headline);
    expect(screen.getAllByText("个人阶段：这几年我在重新安排学习。", { exact: true }).length).toBeGreaterThan(0);
    const transitionRegion = view.container.querySelector<HTMLElement>("[data-stage-transition]")!;
    expect(within(transitionRegion).getByText("这段说明的来源已有你采用的个人修订")).toBeTruthy();
    expect(transitionRegion.querySelector<HTMLDetailsElement>("details")!.open).toBe(false);
  });
});
