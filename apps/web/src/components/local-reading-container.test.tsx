import "fake-indexeddb/auto";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository, researchRepository } from "@hakimi/storage";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange, LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualOutlook } from "../lib/local-annual-outlook";
import { buildLocalReadingFeedback, LOCAL_READING_FEEDBACK_TAG } from "../lib/local-reading-record";
import { unpackReadingSnapshot as unpackStoredReading } from "../lib/local-reading-snapshot-codec";
import { decodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, parseReadingFeedback, LOCAL_READING_REVIEW_TAG, type ReadingFeedbackDraft } from "../lib/local-reading-feedback";
import { PersonalReadingScope } from "./personal-reading-note";
import { ContextualReadingScope } from "./contextual-reading-provider";
import { buildReadingContextRecord, parseReadingContext, LOCAL_READING_CONTEXT_TAG } from "../lib/local-reading-context";
import { LocalReadingContainer } from "./local-reading-container";
import { getResearchJournalMutationSnapshot, resetResearchJournalMutationCoordinatorForTests } from "./research-journal-mutation-coordinator";
import type { LocalReadingSynthesis } from "../lib/local-reading-synthesis";
import * as personalReadingModule from "../lib/local-personal-reading";
import * as readingFeedbackModule from "../lib/local-reading-feedback";
import * as detailedPanelModule from "./detailed-outlook-panel";
import * as snapshotCodecModule from "../lib/local-reading-snapshot-codec";
import * as readingEditionModule from "../lib/local-reading-edition";
import * as annualMonthStoryModule from "../lib/local-annual-month-story";
import { ANNUAL_MONTH_CONTEXT_VERSION } from "../lib/annual-month-context";
import { ANNUAL_EVENT_READING_VERSION } from "../lib/local-annual-event-reading";
import { MONTHLY_DOMAIN_READING_VERSION } from "../lib/local-monthly-domain-reading";
import * as monthlyDomainsModule from "../lib/local-monthly-domain-reading";
import * as detailedOutlookModule from "../lib/local-detailed-outlook";
import * as lifeStageStoryModule from "../lib/local-life-stage-story";
import * as annualLifeStoryModule from "../lib/annual-life-story";
import * as keyMonthSourceModule from "../lib/key-month-event-source";
import { annualEventFeedbackText, annualEventFeedbackSubjectId } from "../lib/local-annual-event-record";
import { annualLifeStoryFeedbackText, annualLifeStorySubjectId, annualLifeStoryFeedbackVersions } from "../lib/annual-life-story-record";

const workbenchAction = vi.hoisted(() => ({ pending: null as Promise<void> | null }));

vi.mock("../lib/local-annual-outlook", async () => ({
  ...await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook"), buildLocalAnnualOutlook: vi.fn(), buildLocalAnnualOutlookRange: vi.fn()
}));
// Persistence/async tests retain the real story builder, sources and callbacks.
// Full narrative rendering and navigation are exercised with the actual panel
// in detailed-outlook-panel.test.tsx, without repeating its long DOM here.
vi.mock("./annual-month-story-panel", () => ({
  AnnualMonthStoryPanel: ({ story, onSelectMonth }: {
    story: annualMonthStoryModule.LocalAnnualMonthStory; onSelectMonth?: (monthId: string) => void;
  }) => <section data-testid="rendered-month-story" data-year={story.year}>{story.months.map((month) =>
    <a key={month.monthId} href="#reading-monthly-detail" onClick={() => onSelectMonth?.(month.monthId)}>读这月</a>)}</section>
}));
vi.mock("./chart-reading-workbench", () => ({
  ChartReadingWorkbench: (props: {
    revision: RevisionRecord; annualOutlook: LocalAnnualOutlook | null;
    synthesis?: LocalReadingSynthesis | null;
    reportLoading?: boolean; selectedYear?: number; onSelectYear?: (year: number) => void;
    extraFeedbackChoices?: { id: string; label: string; originalConclusion: string; sourceVersions?: string[] }[];
    onSaveReading?: () => Promise<void>; onExportReading?: () => void; onAddFeedback?: (draft: ReadingFeedbackDraft) => Promise<void>;
  }) => {
    const [message, setMessage] = useState("");
    const run = (callback: (() => Promise<void>) | undefined) => {
      setMessage("");
      workbenchAction.pending = (async () => {
        try { await callback?.(); setMessage("测试保存成功"); }
        catch (reason) { setMessage(reason instanceof Error ? reason.message : "错误"); }
      })();
      return workbenchAction.pending;
    };
    return <div data-testid="mock-reading-workbench"><span data-testid="current-revision">{props.revision.id}</span>
      <span data-testid="annual-revision">{props.annualOutlook?.revisionId ?? "尚无年度"}</span>
      <span data-testid="annual-window">{props.annualOutlook ? `${props.annualOutlook.startYear}-${props.annualOutlook.endYear}` : ""}</span>
      <span data-testid="annual-year-values">{JSON.stringify(props.annualOutlook?.years.map((item) => item.year) ?? [])}</span>
      <span data-testid="selected-year">{props.selectedYear}</span>
      <button onClick={() => props.onSelectYear?.(2029)}>选择2029年</button>
      <button onClick={() => props.onSelectYear?.(2005)}>自由查询2005年</button>
      <span data-testid="report-loading">{String(props.reportLoading)}</span>
      <div data-testid="synthesis">{props.synthesis ? JSON.stringify(props.synthesis) : ""}</div>
      <span data-testid="event-feedback-choices">{props.extraFeedbackChoices?.filter((choice) => choice.id.startsWith("event-")).map((choice) => choice.label).join("；")}</span>
      <span data-testid="month-story-choices">{JSON.stringify(props.extraFeedbackChoices?.filter((choice) => choice.id.startsWith("annual-month-story-")).map(({ id, sourceVersions }) => ({ id, sourceVersions })) ?? [])}</span>
      <span data-testid="month-story-first-text">{props.extraFeedbackChoices?.find((choice) => choice.id.startsWith("annual-month-story-"))?.originalConclusion ?? ""}</span>
      <span data-testid="monthly-domain-source">{JSON.stringify(props.extraFeedbackChoices?.find((choice) => choice.id.startsWith("monthly-domain-"))?.sourceVersions ?? [])}</span>
      <span data-testid="life-stage-choices">{JSON.stringify(props.extraFeedbackChoices?.filter((choice) => (choice.id.startsWith("life-stage-story-") || choice.id.startsWith("life-stage-transition-"))).map(({ id, sourceVersions }) => ({ id, sourceVersions })) ?? [])}</span>
      <span data-testid="annual-life-story-choices">{JSON.stringify(props.extraFeedbackChoices?.filter((choice) => choice.id.startsWith("annual-life-story-")) ?? [])}</span>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith(`annual-life-story-${props.selectedYear}-`))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith(`annual-life-story-${props.selectedYear}-`))!;
        return props.onAddFeedback!({ subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
          sourceVersions: choice.sourceVersions, rating: "partial", aspect: "年度总评的参与安排", actualSituation: "合成总评反馈，不是实际经历。", requestedRevision: "合成个人年度总评：保留自己的参与节奏，原计算只作对照。" });
      })}>保存当前年度总评反馈</button>
      <span data-testid="life-stage-year-choices">{JSON.stringify(props.extraFeedbackChoices?.filter((choice) => choice.id.startsWith("life-stage-year-")).map(({ id, sourceVersions }) => ({ id, sourceVersions })) ?? [])}</span>
      <button disabled={!props.onSaveReading} onClick={() => void run(props.onSaveReading)}>保存测试快照</button>
      <button disabled={!props.onExportReading} onClick={() => props.onExportReading?.()}>导出测试报告</button>
      <button disabled={!props.onAddFeedback} onClick={() => void run(() => props.onAddFeedback!({ originalConclusion: "原结论：关系主题活跃", actualSituation: "实际：本年主要换工作" }))}>保存测试反馈</button>
      {(["life-stage-story-", "life-stage-transition-"] as const).map((prefix) => <button key={prefix} disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith(prefix))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith(prefix))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "合成人生阶段反馈，未报告真实经历。" });
      })}>{prefix === "life-stage-story-" ? "保存首个人生主线反馈" : "保存首个交运变化反馈"}</button>)}
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("event-"))} onClick={() => void run(() => props.onAddFeedback!({
        originalConclusion: props.extraFeedbackChoices!.find((choice) => choice.id.startsWith("event-"))!.originalConclusion, actualSituation: "合成情境反馈：实际主要调整了岗位职责。"
      }))}>保存首个情境反馈</button>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("useful-stem-"))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith("useful-stem-"))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "partial", aspect: "支持与牵制的先后", actualSituation: "合成反馈：这个用字的实际作用需要进一步对照。" });
      })}>保存首个用字反馈</button>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("timeline-stage-"))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith("timeline-stage-"))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "合成反馈：核对阶段前后变化，不是实际经历。" });
      })}>保存首个阶段反馈</button>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("annual-domain-"))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith("annual-domain-"))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "合成反馈：核对年度领域与阶段，不是实际经历。" });
      })}>保存首个年度领域反馈</button>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("monthly-domain-"))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith("monthly-domain-"))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "合成月度领域反馈，非实际经历。" });
      })}>保存首个月度领域反馈</button>
      <button disabled={!props.onAddFeedback || !props.extraFeedbackChoices?.some((choice) => choice.id.startsWith("annual-month-story-"))} onClick={() => void run(() => {
        const choice = props.extraFeedbackChoices!.find((item) => item.id.startsWith("annual-month-story-"))!;
        return props.onAddFeedback!({ originalConclusion: choice.originalConclusion, subjectId: choice.id, subjectLabel: choice.label,
          sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "合成年月衔接反馈，未声称事项已经发生。" });
      })}>保存首个年月衔接反馈</button>
      <div data-testid="personal-scope"><PersonalReadingScope subjectId="natal-overview"><p>测试用当前计算主文</p></PersonalReadingScope></div>
      <div data-testid="contextual-career"><ContextualReadingScope baseSubjectId="chapter-career"><p>原通用事业说明</p></ContextualReadingScope></div>
      <p data-testid="save-status">{message}</p></div>;
  }
}));

type Chart = Awaited<ReturnType<typeof calculateChart>>;
// Preserve all existing original-archive assertions when new records also
// carry the frozen reading edition; never compare a JSON-escaped envelope.
async function unpackReadingSnapshot(body: string) {
  const decoded = await unpackStoredReading(body);
  return (await decodeReadingReportBundle(decoded))?.archive ?? decoded;
}
let chartA: Chart;
let chartB: Chart;
let database: ResearchDatabase;
let repository: ResearchRepository;
let revisionA: RevisionRecord;
let revisionB: RevisionRecord;
let actualAnnualReady: Promise<LocalAnnualOutlook> | null = null;
const pendingKeyMonths = new Set<Promise<keyMonthSourceModule.PreparedKeyMonthYear>>();
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, deny) => { resolve = accept; reject = deny; });
  return { promise, resolve, reject };
}
function annualFor(revision: RevisionRecord): LocalAnnualOutlook {
  return { version: LOCAL_ANNUAL_OUTLOOK_VERSION, revisionId: revision.id,
    chartResultHash: revision.manifest.resultHash, startYear: 2026, endYear: 2035,
    yearBoundary: "合成异步状态夹具", summary: "年度绑定夹具", limitations: [], years: [] };
}
function propsFor(revision: RevisionRecord) {
  return { revision, caseName: "合成阅读", readOnly: false,
    onEditBirthData: vi.fn(), onOpenDetails: vi.fn(), onOpenTransit: vi.fn(), onOpenRecords: vi.fn() };
}
async function createNote(revision: RevisionRecord, body: string) {
  return repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    body, tags: [LOCAL_READING_FEEDBACK_TAG], sourceRefs: [], lifecycle: "active" });
}
// Query the actual operation area instead of repeatedly walking every hidden
// paragraph in the real detailed/report components. Assertions stay unchanged.
const workbench = () => within(screen.getByTestId("mock-reading-workbench"));
async function saveCompleteSnapshot(expected: string | RegExp = "测试保存成功") {
  fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
  const pending = workbenchAction.pending;
  expect(pending, "The UI must invoke the actual save callback").not.toBeNull();
  // Saving now prepares the unrequested years on demand. Await that real
  // callback (including source validation, codec and repository write) before
  // checking its UI acknowledgement; do not use the 1-second DOM poll as a
  // budget for ten years of preparation or accept a previous success message.
  await act(async () => { await pending; });
  await waitFor(() => {
    const status = screen.getByTestId("save-status").textContent;
    if (typeof expected === "string") expect(status).toBe(expected);
    else expect(status).toMatch(expected);
  });
}
const contextPanel = () => {
  const element = document.querySelector<HTMLElement>(".reading-context-panel");
  if (!element) throw new Error("Expected the real context panel");
  return within(element);
};
async function waitForPersonalReading() {
  // Deliver the actual calendar calculation before asserting its dependent
  // personal-reading publication; controlled pending fixtures stay separate.
  if (actualAnnualReady) await act(async () => { await actualAnnualReady; });
  // The complete report now waits for every real month-year preparation. Await
  // those operations rather than imposing waitFor's 1-second DOM polling budget
  // on ten years of calculations. No preparation or verification is mocked out.
  do {
    await act(async () => {
      // Records, contextual verification and personal replay can still be
      // running before the first month batch exists. Yield to those real
      // operations instead of assuming they finish within a 1-second poll.
      // The enclosing integration test retains its finite completion budget.
      if (!pendingKeyMonths.size) await new Promise<void>(resolve => setTimeout(resolve, 0));
      // Rejections are published by the real container and asserted by the
      // failure-path tests; the waiting helper must not throw them itself.
      while (pendingKeyMonths.size) await Promise.allSettled([...pendingKeyMonths]);
    });
    // A source change committed by act may schedule a new, current batch.
  } while (document.querySelector(".local-reading-document")?.getAttribute("aria-busy") === "true");
  expect(document.querySelector(".local-reading-document")?.getAttribute("aria-busy")).toBe("false");
}
async function useActualAnnual() {
  const actual = await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook");
  vi.mocked(buildLocalAnnualOutlook).mockImplementation((...args) => {
    actualAnnualReady = actual.buildLocalAnnualOutlook(...args); return actualAnnualReady;
  });
  return actual.buildLocalAnnualOutlook;
}

beforeAll(async () => {
  const birth = { schemaVersion: "1.0.0" as const, calendarType: "gregorian" as const, date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute" as const, timeZone: "Asia/Shanghai", sex: "male" as const, lunarLeapMonth: false,
    location: { label: "合成保存测试", latitude: null, longitude: null, precision: "unknown" as const }, sourceNote: "synthetic" };
  chartA = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
  chartB = await calculateChart({ ...birth, time: "10:26" }, WORKING_DEFAULT_RULE_PROFILE);
});
beforeEach(async () => {
  workbenchAction.pending = null;
  pendingKeyMonths.clear();
  const prepare = keyMonthSourceModule.prepareKeyMonthYear;
  vi.spyOn(keyMonthSourceModule, "prepareKeyMonthYear").mockImplementation((...args) => {
    const result = prepare(...args);
    pendingKeyMonths.add(result);
    void result.then(() => pendingKeyMonths.delete(result), () => pendingKeyMonths.delete(result));
    return result;
  });
  actualAnnualReady = null;
  resetResearchJournalMutationCoordinatorForTests();
  database = new ResearchDatabase(`reading-container-synthetic-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  const cases = new CaseRepository(database);
  repository = new ResearchRepository(database);
  revisionA = (await cases.createCase({ alias: "合成A", calculated: chartA })).revisions[0]!;
  revisionB = (await cases.createCase({ alias: "合成B", calculated: chartB })).revisions[0]!;
  vi.spyOn(researchRepository, "listResearchNotesByCase").mockImplementation((id, options) => repository.listResearchNotesByCase(id, options));
  vi.spyOn(researchRepository, "createResearchNote").mockImplementation((input) => repository.createResearchNote(input));
  vi.mocked(buildLocalAnnualOutlook).mockImplementation(async (revision) => annualFor(revision));
  const actual = await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook");
  vi.mocked(buildLocalAnnualOutlookRange).mockImplementation((...args) => {
    actualAnnualReady = actual.buildLocalAnnualOutlookRange(...args); return actualAnnualReady;
  });
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(buildLocalAnnualOutlook).mockReset();
  vi.mocked(buildLocalAnnualOutlookRange).mockReset();
  resetResearchJournalMutationCoordinatorForTests();
  await database?.delete();
});

describe("reading container persistence and asynchronous publication", () => {
  it("keeps annual and monthly publication pending until the actual personal adoption replay completes", async () => {
    await useActualAnnual();
    const assessment = buildBaziPreliminaryAssessment(revisionA);
    const proposed = "延迟回放的合成个人修订，必须先核对再显示。";
    const root = await createNote(revisionA, buildStructuredReadingFeedback(assessment, {
      subjectId: "natal-overview", subjectLabel: assessment.headline, originalConclusion: assessment.headline,
      sourceVersions: [assessment.version], rating: "unverified", actualSituation: "合成延迟回放。", requestedRevision: proposed
    }));
    await createNote(revisionA, await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment, [assessment.version]),
      { state: "revised", notes: "明确采用", revisedConclusion: proposed, occurredAt: "" }));
    const gate = deferred<void>();
    const actualBuild = personalReadingModule.buildLocalPersonalReading;
    vi.spyOn(personalReadingModule, "buildLocalPersonalReading").mockImplementation(async (...args) => {
      await gate.promise;
      return actualBuild(...args);
    });
    const detail = vi.spyOn(detailedPanelModule, "DetailedOutlookPanel");
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    if (actualAnnualReady) await act(async () => { await actualAnnualReady; });
    await waitFor(() => expect(detail.mock.calls.at(-1)![0].annualMonthStory).not.toBeNull());
    expect(detail.mock.calls.at(-1)![0].personalReadingReady).toBe(false);
    expect(detail.mock.calls.at(-1)![0].personalReading).toBeNull();
    expect(screen.getByTestId("report-loading").textContent).toBe("true");
    await act(async () => { gate.resolve(); });
    await waitForPersonalReading();
    expect(detail.mock.calls.at(-1)![0].personalReadingReady).toBe(true);
    expect(within(screen.getByTestId("personal-scope")).getByText(proposed)).toBeDefined();
  }, 60_000);

  it("binds every annual story choice, preserves adoption on its own segment and reuses the verified collection on note refresh", async () => {
    await useActualAnnual();
    const build = vi.spyOn(annualLifeStoryModule, "buildReadingAnnualLifeStories");
    const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect(build).toHaveBeenCalledTimes(1);
    const collection = build.mock.results[0]!.value as annualLifeStoryModule.LocalReadingAnnualLifeStories;
    const choices = JSON.parse(screen.getByTestId("annual-life-story-choices").textContent!) as { id: string; originalConclusion: string; sourceVersions: string[] }[];
    expect(collection.years).toHaveLength(10);
    expect(choices).toHaveLength(collection.years.flatMap((story) => story.branches.flatMap((branch) => branch.segments)).length);
    for (const story of collection.years) for (const branch of story.branches) for (const segment of branch.segments) {
      expect(choices.find((choice) => choice.id === annualLifeStorySubjectId(story, segment))).toEqual(expect.objectContaining({
        originalConclusion: annualLifeStoryFeedbackText(story, segment), sourceVersions: annualLifeStoryFeedbackVersions(story, segment)
      }));
    }
    fireEvent.click(workbench().getByRole("button", { name: "保存当前年度总评反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    await waitForPersonalReading();
    const summaries = () => [...view.container.querySelectorAll<HTMLElement>(".annual-life-summary")];
    const proposed = "合成个人年度总评：保留自己的参与节奏，原计算只作对照。";
    const initialOwn = summaries().find((node) => within(node).queryByRole("button", { name: "采用这段个人修订" }))!;
    expect(initialOwn).toBeDefined();
    const ownSegmentId = initialOwn.dataset.annualStorySegment;
    const own = () => summaries().find((node) => node.dataset.annualStorySegment === ownSegmentId)!;
    fireEvent.click(within(initialOwn).getByRole("button", { name: "采用这段个人修订" }));
    await waitFor(() => expect(within(own()).queryByText("已采用的个人修订")).not.toBeNull());
    await waitForPersonalReading();
    expect(within(own()).getByText(proposed)).toBeDefined();
    expect(build).toHaveBeenCalledTimes(1);
    fireEvent.click(workbench().getByRole("button", { name: "选择2029年" }));
    await waitForPersonalReading();
    expect(build).toHaveBeenCalledTimes(1);
    expect(summaries().length).toBeGreaterThan(0);
    expect(summaries().every((node) => !node.textContent?.includes(proposed))).toBe(true);
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"), { timeout: 15_000 });
    await waitFor(async () => expect((await repository.listResearchNotesByCase(revisionA.caseId)).some((note) => note.tags.includes("本地解读快照"))).toBe(true), { timeout: 15_000 });
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    const saved = records.find((note) => note.tags.includes("本地解读快照"))!;
    expect(saved).toBeDefined();
    const bundle = await decodeReadingReportBundle(await unpackStoredReading(saved.body));
    expect(bundle).not.toBeNull();
    expect(bundle!.reading).toContain(proposed);
    expect(bundle!.reading).not.toContain('"sourceBinding":');
    expect(saved.body.length).toBeLessThanOrEqual(200_000);
    const body = await unpackReadingSnapshot(saved.body);
    expect(body).toContain(proposed);
    for (const choice of choices) expect(body).toContain(choice.originalConclusion);
    expect(records.filter((note) => parseReadingFeedback(note.body).kind === "feedback")).toHaveLength(1);
  }, 60_000);

  it("folds a dependent yearly summary only for an exactly adopted original event in that year and segment", async () => {
    await useActualAnnual();
    const build = vi.spyOn(annualLifeStoryModule, "buildReadingAnnualLifeStories");
    const first = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    const input = build.mock.calls[0]![0];
    const collection = build.mock.results[0]!.value as annualLifeStoryModule.LocalReadingAnnualLifeStories;
    const story = collection.years.find((item) => item.year === 2029)!;
    const segment = story.branches[0]!.segments[0]!;
    const sourceYear = input.annualEvents.years.find((item) => item.year === story.year)!;
    const branch = sourceYear.branches.find((item) => item.id === segment.branchId)!;
    const sourceSegment = branch.segments.find((item) => item.id === segment.id)!;
    const dependencies = new Set([...segment.sourceSubjects, ...segment.paragraphs.flatMap((paragraph) => paragraph.sourceSubjects)]);
    const item = sourceSegment.items.find((candidate) => dependencies.has(annualEventFeedbackSubjectId(story.year, sourceSegment, candidate)))!;
    expect(item).toBeDefined();
    const id = annualEventFeedbackSubjectId(story.year, sourceSegment, item);
    const original = annualEventFeedbackText(sourceYear, branch, sourceSegment, item);
    const versions = [input.annualEvents.version, ...sourceYear.sourceVersions];
    const personal = "合成旧事项个人修订：本年实际安排以本人补充为准。";
    first.unmount();
    const root = await createNote(revisionA, buildStructuredReadingFeedback(input.assessment, { subjectId: id, subjectLabel: item.title,
      originalConclusion: original, sourceVersions: versions, rating: "unverified", actualSituation: "合成来源采用测试。", requestedRevision: personal }));
    await repository.createResearchNote({ caseId: revisionA.caseId, anchor: { kind: "revision", revisionId: revisionA.id },
      body: await buildReadingFeedbackReview(root, null, readingFeedbackSource(input.assessment, versions), { state: "revised", notes: "本人明确采用合成修订。", revisedConclusion: personal, occurredAt: "2029" }),
      tags: [LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_REVIEW_TAG], sourceRefs: [], lifecycle: "active" });
    const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect([...view.container.querySelectorAll(".annual-life-summary")].every((node) => !node.textContent?.includes(personal))).toBe(true);
    fireEvent.click(workbench().getByRole("button", { name: "选择2029年" }));
    await waitForPersonalReading();
    const summary = [...view.container.querySelectorAll<HTMLElement>(".annual-life-summary")].find((node) => node.dataset.annualStorySegment === segment.id)!;
    expect(within(summary).getByText(personal)).toBeDefined();
    expect(summary.textContent).toContain("这段总评的来源已有你采用的个人修订");
    const comparison = [...summary.querySelectorAll("details")].find((node) => node.querySelector("summary")?.textContent === "对照原自动年度总评")!;
    expect(comparison).toBeDefined(); expect(comparison.open).toBe(false);
    expect(comparison.textContent).toContain(segment.headline);
  }, 60_000);

  it("keeps original reading available but refuses saving a story collection from an incorrect annual window", async () => {
    await useActualAnnual();
    const realBuild = annualLifeStoryModule.buildReadingAnnualLifeStories;
    vi.spyOn(annualLifeStoryModule, "buildReadingAnnualLifeStories").mockImplementation((input) => ({ ...realBuild(input), endYear: input.annual.endYear - 1 }));
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect(screen.getByTestId("annual-window").textContent).toBe("2026-2035");
    expect(screen.getByTestId("annual-life-story-choices").textContent).toBe("[]");
    expect(screen.getAllByRole("alert").some((node) => node.textContent?.includes("年度生活总评与当前年份窗口"))).toBe(true);
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("年度生活总评与当前年份窗口"));
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toEqual([]);
  }, 60_000);

  it("loads every actual stage year, keeps within-window selection and saves all eleven years without replacing original feedback", async () => {
    await useActualAnnual();
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect(screen.getByTestId("annual-window").textContent).toBe("2026-2035");
    expect(buildLocalAnnualOutlookRange).not.toHaveBeenCalled();
    const select = screen.getByRole("combobox", { name: "选择人生阶段" }) as HTMLSelectElement;
    const next = [...select.options].find((option) => option.textContent?.includes("庚辰大运"))!;
    fireEvent.change(select, { target: { value: next.value } });
    expect(screen.getByTestId("annual-window").textContent).toBe("");
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("仍在整理"));
    await waitFor(() => expect(buildLocalAnnualOutlookRange).toHaveBeenCalledWith(revisionA, expect.anything(), 2028, 2038), { timeout: 15_000 });
    await waitForPersonalReading();
    expect(screen.getByTestId("annual-window").textContent).toBe("2028-2038");
    expect(JSON.parse(screen.getByTestId("annual-year-values").textContent!)).toEqual(Array.from({ length: 11 }, (_, index) => 2028 + index));
    expect(JSON.parse(screen.getByTestId("life-stage-year-choices").textContent!)).toHaveLength(11);
    const summaryChoices = JSON.parse(screen.getByTestId("annual-life-story-choices").textContent!) as { id: string }[];
    expect(new Set(summaryChoices.map((choice) => Number(choice.id.split("-")[3])))).toEqual(new Set(Array.from({ length: 11 }, (_, index) => 2028 + index)));
    const calls = vi.mocked(buildLocalAnnualOutlookRange).mock.calls.length;
    fireEvent.click(workbench().getByRole("button", { name: "选择2029年" }));
    await waitForPersonalReading();
    expect(screen.getByTestId("selected-year").textContent).toBe("2029");
    expect(screen.getByTestId("annual-window").textContent).toBe("2028-2038");
    expect(buildLocalAnnualOutlookRange).toHaveBeenCalledTimes(calls);
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"), { timeout: 15_000 });
    const notes = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(notes).toHaveLength(1);
    const text = await unpackReadingSnapshot(notes[0]!.body);
    for (const label of ["2028", "2038", "庚辰", "2029", "life-stage-year-"]) expect(text).toContain(label);
    fireEvent.click(workbench().getByRole("button", { name: "自由查询2005年" }));
    await waitForPersonalReading();
    expect(screen.getByTestId("annual-window").textContent).toBe("2005-2014");
    expect(select.value).toBe(next.value);
  }, 60_000);

  it("ignores a late complete-stage response after a newer year-window request", async () => {
    await useActualAnnual();
    const late = deferred<LocalAnnualOutlook>();
    vi.mocked(buildLocalAnnualOutlookRange).mockReturnValueOnce(late.promise);
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    const select = screen.getByRole("combobox", { name: "选择人生阶段" }) as HTMLSelectElement;
    const next = [...select.options].find((option) => option.textContent?.includes("庚辰大运"))!;
    fireEvent.change(select, { target: { value: next.value } });
    await waitFor(() => expect(buildLocalAnnualOutlookRange).toHaveBeenCalledTimes(1), { timeout: 15_000 });
    fireEvent.click(workbench().getByRole("button", { name: "自由查询2005年" }));
    await waitForPersonalReading();
    expect(screen.getByTestId("annual-window").textContent).toBe("2005-2014");
    await act(async () => { late.resolve({ ...annualFor(revisionA), startYear: 2028, endYear: 2038 }); await late.promise; });
    expect(screen.getByTestId("annual-window").textContent).toBe("2005-2014");
    expect(screen.getByTestId("selected-year").textContent).toBe("2005");
  }, 60_000);

  it("publishes and saves independent life-stage and transition feedback with exact current provenance", async () => {
    await useActualAnnual();
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    const choices = JSON.parse(screen.getByTestId("life-stage-choices").textContent!) as { id: string; sourceVersions: string[] }[];
    const stages = choices.filter((choice) => choice.id.startsWith("life-stage-story-")), transitions = choices.filter((choice) => choice.id.startsWith("life-stage-transition-"));
    expect(stages.length).toBeGreaterThan(1); expect(transitions).toHaveLength(stages.length - 1);
    for (const choice of choices) expect(choice.sourceVersions).toEqual([lifeStageStoryModule.LIFE_STAGE_STORY_VERSION, detailedOutlookModule.LOCAL_DETAILED_OUTLOOK_VERSION]);
    fireEvent.click(workbench().getByRole("button", { name: "保存首个人生主线反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    await waitForPersonalReading();
    fireEvent.click(workbench().getByRole("button", { name: "保存首个交运变化反馈" }));
    await waitFor(async () => expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(2));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    const documents = records.map((record) => { const parsed = parseReadingFeedback(record.body); if (parsed.kind !== "feedback") throw new Error("Expected stage feedback"); return parsed.value; });
    expect(documents.map((document) => document.subjectId)).toEqual(expect.arrayContaining([stages[0]!.id, transitions[0]!.id]));
    for (const document of documents) {
      expect(document.source.revisionId).toBe(revisionA.id);
      expect(document.source.chartResultHash).toBe(revisionA.manifest.resultHash);
      expect(document.source.readingVersions).toEqual([lifeStageStoryModule.LIFE_STAGE_STORY_VERSION, detailedOutlookModule.LOCAL_DETAILED_OUTLOOK_VERSION]);
      for (const text of ["完整来源版本：", "原判断依据引用：", "原节点：", revisionA.manifest.resultHash]) expect(document.originalConclusion).toContain(text);
    }
  }, 60_000);
  it("does not save a complete report when the life-stage story source cannot be verified", async () => {
    await useActualAnnual();
    vi.spyOn(lifeStageStoryModule, "buildLifeStageStory").mockImplementation(() => { throw new Error("合成人生阶段原判断校验失败。"); });
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect(screen.getByTestId("life-stage-choices").textContent).toBe("[]");
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("合成人生阶段原判断校验失败。"));
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toEqual([]);
  }, 60_000);
  it("saves year-to-month feedback with exact selected sources and all transitive versions in its original text", async () => {
    await useActualAnnual();
    const buildStory = vi.spyOn(annualMonthStoryModule, "buildAnnualMonthStory");
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    const selectedMonthlyInput = buildStory.mock.calls[0]![0].monthly;
    const selectedBuilds = () => buildStory.mock.calls.filter(([input]) => input.monthly === selectedMonthlyInput);
    expect(selectedBuilds()).toHaveLength(1);
    const choices = JSON.parse(screen.getByTestId("month-story-choices").textContent!) as { id: string; sourceVersions: string[] }[];
    const firstText = screen.getByTestId("month-story-first-text").textContent;
    expect(choices).toHaveLength(36);
    expect(choices[0]!.id).toMatch(new RegExp(`^annual-month-story-${new Date().getFullYear()}-`));
    fireEvent.click(workbench().getByRole("button", { name: "保存首个年月衔接反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(records).toHaveLength(1);
    const parsed = parseReadingFeedback(records[0]!.body);
    if (parsed.kind !== "feedback") throw new Error("Expected annual-month feedback");
    expect(parsed.value.subjectId).toBe(choices[0]!.id);
    expect(parsed.value.originalConclusion).toBe(firstText);
    expect(parsed.value.source.revisionId).toBe(revisionA.id);
    expect(parsed.value.source.readingVersions).toEqual([annualMonthStoryModule.LOCAL_ANNUAL_MONTH_STORY_VERSION,
      ANNUAL_MONTH_CONTEXT_VERSION, ANNUAL_EVENT_READING_VERSION, MONTHLY_DOMAIN_READING_VERSION]);
    for (const text of ["完整来源版本：", "年月原文引用：", "原始节点：", "（不含终点）", revisionA.manifest.resultHash]) expect(parsed.value.originalConclusion).toContain(text);
    await waitForPersonalReading();
    expect(selectedBuilds()).toHaveLength(1); // The selected monthly calculation remains cached; other years are independently prepared.
  }, 60_000);
  it("fails closed before a snapshot write when current year-to-month sources cannot be verified", async () => {
    await useActualAnnual();
    vi.spyOn(annualMonthStoryModule, "buildAnnualMonthStory").mockImplementation(() => { throw new Error("合成同源校验失败，保留原年度与流月。"); });
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    expect(screen.getByTestId("month-story-choices").textContent).toBe("[]");
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("合成同源校验失败，保留原年度与流月。"));
    fireEvent.click(workbench().getByRole("button", { name: "导出测试报告" }));
    expect(screen.getAllByText("合成同源校验失败，保留原年度与流月。").length).toBeGreaterThan(1);
    expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
    expect(getResearchJournalMutationSnapshot().status).toBe("idle");
  }, 60_000);
  it("does not publish a late earlier monthly result or its feedback choices after selecting another year", async () => {
    await useActualAnnual();
    const realMonthly = detailedOutlookModule.buildLocalMonthlyOutlook;
    const oldResult = await realMonthly(revisionA, buildBaziPreliminaryAssessment(revisionA), 2027);
    const late = deferred<detailedOutlookModule.LocalMonthlyOutlook>();
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    // Delay only the selected-month request, not every 2027 request made by
    // the full report's independently verified all-year month preparation.
    let delayed = false;
    vi.spyOn(detailedOutlookModule, "buildLocalMonthlyOutlook").mockImplementation((...args) => {
      if (args[2] === 2027 && !delayed) { delayed = true; return late.promise; }
      return realMonthly(...args);
    });
    const select = (year: number) => {
      fireEvent.change(screen.getByLabelText("查询年份"), { target: { value: String(year) } });
      fireEvent.click(screen.getByRole("button", { name: "查看这一年" }));
    };
    select(2027);
    expect(screen.getByTestId("report-loading").textContent).toBe("true");
    expect(screen.getByTestId("month-story-choices").textContent).toBe("[]");
    expect(screen.queryByRole("link", { name: "读这月" })).toBeNull();
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("完整解读仍在整理"));
    expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
    select(2028);
    await waitForPersonalReading();
    const current = screen.getByTestId("month-story-choices").textContent!;
    expect(JSON.parse(current).every((choice: { id: string }) => choice.id.startsWith("annual-month-story-2028-"))).toBe(true);
    expect(JSON.parse(current).length).toBeGreaterThan(36); // Actual December handover has two periods.
    await act(async () => { late.resolve(oldResult); await late.promise; });
    expect(screen.getByTestId("month-story-choices").textContent).toBe(current);
    expect(screen.getByRole("group", { name: "2028年节令月份" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "2027年节令月份" })).toBeNull();
  }, 60_000);
  it("saves the selected monthly domain with its exact source text and period", async () => {
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(workbench().getByRole("button", { name: "保存首个月度领域反馈" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(workbench().getByRole("button", { name: "保存首个月度领域反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(records).toHaveLength(1);
    const parsed = parseReadingFeedback(records[0]!.body);
    if (parsed.kind !== "feedback") throw new Error("Expected monthly domain feedback");
    expect(parsed.value.subjectId).toMatch(/^monthly-domain-.+-career$/);
    expect(parsed.value.source.revisionId).toBe(revisionA.id);
    expect(parsed.value.source.readingVersions).toContain(MONTHLY_DOMAIN_READING_VERSION);
    expect(parsed.value.source.readingVersions).toContain(detailedOutlookModule.LOCAL_DETAILED_OUTLOOK_VERSION);
    for (const text of ["（不含终点）", "原判断：", "可能情境：", "实际对照：", "背景："]) expect(parsed.value.originalConclusion).toContain(text);
    expect(parsed.value.originalConclusion.length).toBeLessThanOrEqual(30_000);
  }, 60_000);
  it("reads the latest structured background even if its display tag was removed", async () => {
    const year = new Date().getFullYear();
    const draft = { work: "seeking_work" as const, relationship: "unspecified" as const, fromYear: year, toYear: year, notes: "合成标签编辑测试。" };
    const first = await repository.createResearchNote({ caseId: revisionA.caseId, anchor: { kind: "revision", revisionId: revisionA.id },
      body: await buildReadingContextRecord(revisionA, null, draft), tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active" });
    const second = await repository.createResearchNote({ caseId: revisionA.caseId, anchor: { kind: "revision", revisionId: revisionA.id },
      body: await buildReadingContextRecord(revisionA, first, { ...draft, work: "employed" }), tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active" });
    await repository.updateResearchNote(second.id, { expectedEditVersion: second.editVersion, patch: { tags: [] } });
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.getByTestId("contextual-career").textContent).toContain("已任职"));
    expect(screen.getByTestId("contextual-career").textContent).not.toContain("求职阶段");
    expect(screen.getAllByText("阅读背景记录", { exact: true })).toHaveLength(2);
  }, 60_000);

  // Each test keeps the original 5s transaction budget. Preparation still
  // runs the real UI/storage flow; the unchanged complete chain is also timed
  // in the external evidence, separately from these operation-level tests.
  describe("saved life context transactions", () => {
    let first: ReturnType<typeof render>;
    let root: ResearchNoteRecord;
    let buildStory: MockInstance<typeof annualMonthStoryModule.buildAnnualMonthStory>;
    let buildMonthly: MockInstance<typeof monthlyDomainsModule.buildMonthlyDomainReadings>;
    let displayedStory: annualMonthStoryModule.LocalAnnualMonthStory;
    beforeEach(async () => {
      await useActualAnnual();
      buildStory = vi.spyOn(annualMonthStoryModule, "buildAnnualMonthStory");
      buildMonthly = vi.spyOn(monthlyDomainsModule, "buildMonthlyDomainReadings");
      const detailed = vi.spyOn(detailedPanelModule, "DetailedOutlookPanel");
      first = render(<LocalReadingContainer {...propsFor(revisionA)} />);
      await waitForPersonalReading();
      displayedStory = detailed.mock.calls.at(-1)![0].annualMonthStory!;
    });
    async function saveAndReopenContext() {
    expect(displayedStory).toBeDefined();
    expect(buildStory.mock.results.filter(result => result.type === "return" && result.value === displayedStory)).toHaveLength(1);
    expect(screen.getByTestId("contextual-career").textContent).toBe("原通用事业说明");
    fireEvent.click(contextPanel().getByText("补充当前生活背景", { exact: false }));
    fireEvent.change(contextPanel().getByLabelText("职业或主要日常状态"), { target: { value: "seeking_work" } });
    fireEvent.change(contextPanel().getByLabelText("关系背景"), { target: { value: "single" } });
    fireEvent.change(contextPanel().getByLabelText("补充自述（可选，不自动参与判断）"), { target: { value: "合成背景验证，不是实际用户经历。" } });
    fireEvent.click(contextPanel().getByRole("button", { name: "保存生活背景" }));
    await waitFor(() => expect(screen.getByTestId("contextual-career").textContent).toContain("求职"));
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).toContain("求职"));
    let notes = await repository.listResearchNotesByCase(revisionA.caseId, { includeArchived: true });
    expect(notes).toHaveLength(1);
    root = notes[0]!;
    expect(root.tags).toContain(LOCAL_READING_CONTEXT_TAG);
    const parsed = parseReadingContext(root.body);
    expect(parsed.kind).toBe("context");
    if (parsed.kind !== "context") throw new Error("Expected saved context");
    expect(parsed.value.context.work).toBe("seeking_work");
    expect(parsed.value.sourceBinding.revisionId).toBe(revisionA.id);
    expect(buildStory.mock.calls.some(([input]) => input.contextual?.contextSource.reference.noteId === root.id)).toBe(true);
    expect(buildMonthly.mock.calls.some(([input]) => input.contextual?.contextSource.reference.noteId === root.id)).toBe(true);
    await waitFor(() => expect(screen.getByTestId("monthly-domain-source").textContent).toContain(`context-record/${root.id}/${root.editVersion}/`));
    first.unmount();
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.getByTestId("contextual-career").textContent).toContain("求职"));
    }
    it("uses explicitly saved life context and persists the exact background after reopening", async () => {
      await saveAndReopenContext();
    });
    describe("after the background was saved and reopened through the real UI", () => {
      beforeEach(async () => { await saveAndReopenContext(); await waitForPersonalReading(); }, 60_000);
      it("saves the complete contextual snapshot and clears by appending without rewriting either prior record", async () => {
    await saveCompleteSnapshot();
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(2);
    let notes = await repository.listResearchNotesByCase(revisionA.caseId);
    const saved = notes.find((note) => note.tags.includes("本地解读快照"))!;
    const body = await unpackReadingSnapshot(saved.body);
    expect(body).toContain("## 结合现实背景的解读");
    expect(body).toContain(root.id);
    expect(body).toContain("合成背景验证，不是实际用户经历。");
    expect(body).toContain("月度阅读背景记录：");
    expect(body).toContain("求职");
    fireEvent.click(contextPanel().getByText("补充当前生活背景", { exact: false }));
    await waitForPersonalReading();
    fireEvent.click(contextPanel().getByRole("button", { name: "清空已保存的背景" }));
    await waitFor(() => expect(screen.getByTestId("contextual-career").textContent).toBe("原通用事业说明"));
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).not.toContain('"origin":"contextual"'));
    notes = await repository.listResearchNotesByCase(revisionA.caseId, { includeArchived: true });
    expect(notes).toHaveLength(3);
    expect(notes.find((note) => note.id === root.id)!.body).toBe(root.body);
    expect(notes.find((note) => note.id === saved.id)!.body).toBe(saved.body);
    const cleared = notes.find((note) => note.id !== root.id && note.id !== saved.id)!;
    const clearDocument = parseReadingContext(cleared.body);
    expect(clearDocument.kind).toBe("context");
    if (clearDocument.kind !== "context") throw new Error("Expected clear context");
    expect(clearDocument.value.previousRef?.noteId).toBe(root.id);
    expect(clearDocument.value.context.work).toBe("unspecified");
    expect(clearDocument.value.context.relationship).toBe("unspecified");
      }, 60_000);
    });
  }, 60_000);

  describe("explicit personal adoption transactions", () => {
    let assessment: ReturnType<typeof buildBaziPreliminaryAssessment>;
    let proposed: string, root: ResearchNoteRecord, adoption: ResearchNoteRecord;
    let first: ReturnType<typeof render>;
    const scope = () => within(screen.getByTestId("personal-scope"));
    beforeEach(async () => {
    await useActualAnnual();
    assessment = buildBaziPreliminaryAssessment(revisionA);
    proposed = "合成个人修订：先完成资质学习，再逐步承担项目。不是用户实际经历。";
    root = await createNote(revisionA, buildStructuredReadingFeedback(assessment, {
      subjectId: "natal-overview", subjectLabel: assessment.headline, originalConclusion: assessment.headline,
      sourceVersions: [assessment.version], rating: "unverified", actualSituation: "软件验证用补充。", requestedRevision: proposed
    }));
    first = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(scope().queryByText("尚未采用的个人修订建议")).not.toBeNull());
    expect(scope().getByText("测试用当前计算主文")).toBeDefined();
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(1);
    await waitForPersonalReading();
    });
    async function adoptAndReopen() {
    fireEvent.click(scope().getByRole("button", { name: "采用这段个人修订" }));
    await waitFor(() => expect(scope().queryByText("已采用的个人修订")).not.toBeNull());
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).toContain(proposed));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    adoption = records.find((record) => record.id !== root.id)!;
    expect(parseReadingFeedback(adoption.body).kind).toBe("review");
    expect(records.find((record) => record.id === root.id)!.body).toBe(root.body);
    first.unmount();
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(scope().queryByText("已采用的个人修订")).not.toBeNull());
    expect(scope().getByText(proposed)).toBeDefined();
    await waitForPersonalReading();
    }
    it("adopts only an explicit personal action and persists the same text after remount", async () => {
      await adoptAndReopen();
    });
    describe("after explicit adoption and reopening through the real UI", () => {
      beforeEach(adoptAndReopen);
      it("saves both original and adopted texts then restores by appending while preserving the snapshot", async () => {
    await saveCompleteSnapshot();
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(3);
    const withSnapshot = await repository.listResearchNotesByCase(revisionA.caseId);
    const snapshot = withSnapshot.find((record) => record.tags.includes("本地解读快照"))!;
    const body = await unpackReadingSnapshot(snapshot.body);
    expect(body).toContain(`#### 本次阅读正文\n\n${proposed}`);
    expect(body).toContain(assessment.headline);
    expect(body).toContain(adoption.id);
    // Restore through the real append callback, retaining all earlier records.
    // Saving refreshes notes; wait for their verified personal-reading replay
    // before opening an action whose source record is being reloaded.
    await waitForPersonalReading();
    // Opening the record mounts a separate verifier after the container has
    // finished its personal replay. Hold only its publication, not its real
    // hash/chain checks, to exercise this second asynchronous boundary.
    const readThread = readingFeedbackModule.readFeedbackThread;
    const publishThread = deferred<void>();
    const threadReads: {
      verified: ReturnType<typeof readThread>; published: ReturnType<typeof readThread>;
    }[] = [];
    vi.spyOn(readingFeedbackModule, "readFeedbackThread").mockImplementation((record, records) => {
      const verified = readThread(record, records);
      if (record.id !== root.id || !records.some((item) => item.id === snapshot.id)) return verified;
      const published = publishThread.promise.then(() => verified);
      threadReads.push({ verified, published });
      return published;
    });
    fireEvent.click(screen.getByText("反馈、个人修订与补充资料", { exact: true }));
    fireEvent.click(screen.getByText("用户反馈", { exact: true }));
    await waitFor(() => expect(threadReads).not.toHaveLength(0));
    const review = within(screen.getByRole("region", { name: "反馈复核与个人修订" }));
    expect(review.getByText("正在核对关联")).toBeDefined();
    expect(review.queryByRole("button", { name: "恢复原解读" })).toBeNull();
    // Await the actual verifier result instead of assigning its work the DOM
    // query's default one-second timeout. Never fabricate a successful thread.
    const pendingThread = threadReads.at(-1)!;
    const verifiedThread = await pendingThread.verified;
    expect(verifiedThread.issues).toEqual([]);
    expect(verifiedThread.canAppend).toBe(true);
    expect(verifiedThread.latest?.record.id).toBe(adoption.id);
    expect(verifiedThread.latest?.value.state).toBe("revised");
    expect(verifiedThread.latest?.value.revisedConclusion).toBe(proposed);
    await act(async () => { publishThread.resolve(); await pendingThread.published; });
    fireEvent.click(review.getByRole("button", { name: "恢复原解读" }));
    await waitFor(() => expect(scope().queryByText("当前保留原解读，个人反馈与修订历史仍在。")).not.toBeNull());
    expect(scope().queryByText("已采用的个人修订")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).not.toContain(proposed));
    const restored = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(restored).toHaveLength(4);
    expect(restored.find((record) => record.id === snapshot.id)!.body).toBe(snapshot.body);
    expect(restored.find((record) => record.id === adoption.id)!.body).toBe(adoption.body);
      }, 60_000);
    });
  }, 60_000);

  it("includes an archived latest action in the personal chain instead of reviving an older revision", async () => {
    const assessment = buildBaziPreliminaryAssessment(revisionA);
    const source = readingFeedbackSource(assessment, [assessment.version]);
    const root = await createNote(revisionA, buildStructuredReadingFeedback(assessment, {
      subjectId: "natal-overview", subjectLabel: assessment.headline, originalConclusion: assessment.headline,
      sourceVersions: [assessment.version], rating: "unverified", actualSituation: "合成归档测试。", requestedRevision: "旧个人文字"
    }));
    const adopted = await createNote(revisionA, await buildReadingFeedbackReview(root, null, source,
      { state: "revised", notes: "测试采用", revisedConclusion: "旧个人文字", occurredAt: "" }));
    const latest = await repository.createResearchNote({ caseId: revisionA.caseId, anchor: { kind: "revision", revisionId: revisionA.id },
      body: await buildReadingFeedbackReview(root, adopted, source, { state: "retained", notes: "测试恢复", revisedConclusion: "", occurredAt: "" }),
      tags: [LOCAL_READING_FEEDBACK_TAG], sourceRefs: [], lifecycle: "archived" });
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(within(screen.getByTestId("personal-scope")).queryByText("个人修订暂未用于当前阅读")).not.toBeNull());
    expect(within(screen.getByTestId("personal-scope")).queryByText("已采用的个人修订")).toBeNull();
    expect(researchRepository.listResearchNotesByCase).toHaveBeenCalledWith(revisionA.caseId, { includeArchived: true });
    expect(await repository.listResearchNotesByCase(revisionA.caseId, { includeArchived: true })).toHaveLength(3);
    expect(latest.lifecycle).toBe("archived");
  }, 60_000);

  it("retains the complete domain reading and exact branch period when recording annual feedback", async () => {
    const actual = await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook");
    vi.mocked(buildLocalAnnualOutlook).mockImplementation(actual.buildLocalAnnualOutlook);
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(workbench().getByRole("button", { name: "保存首个年度领域反馈" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(workbench().getByRole("button", { name: "保存首个年度领域反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(records).toHaveLength(1);
    const parsed = parseReadingFeedback(records[0]!.body);
    expect(parsed.kind).toBe("feedback");
    if (parsed.kind !== "feedback") throw new Error("Expected annual domain feedback");
    expect(parsed.value.subjectId).toMatch(/^annual-domain-\d{4}-.+-career$/);
    expect(parsed.value.source.revisionId).toBe(revisionA.id);
    expect(parsed.value.source.readingVersions).toContain("hakimi.local-annual-domain-reading/0.1.0");
    expect(parsed.value.source.readingVersions).toContain(LOCAL_ANNUAL_OUTLOOK_VERSION);
    expect(parsed.value.originalConclusion).toContain("（不含终点）");
    expect(parsed.value.originalConclusion).toContain("实际对照：");
    expect(parsed.value.originalConclusion).toContain("可能情境：");
    expect(parsed.value.originalConclusion.length).toBeLessThanOrEqual(30_000);
  }, 60_000);
  it("keeps the displayed stage interval and source versions when recording stage feedback", async () => {
    const actual = await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook");
    vi.mocked(buildLocalAnnualOutlook).mockImplementation(actual.buildLocalAnnualOutlook);
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(workbench().getByRole("button", { name: "保存首个阶段反馈" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(workbench().getByRole("button", { name: "保存首个阶段反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(records).toHaveLength(1);
    const parsed = parseReadingFeedback(records[0]!.body);
    expect(parsed.kind).toBe("feedback");
    if (parsed.kind !== "feedback") throw new Error("Expected structured stage feedback");
    expect(parsed.value.subjectId).toMatch(/^timeline-stage-stage:locked:/);
    expect(parsed.value.source.revisionId).toBe(revisionA.id);
    expect(parsed.value.source.readingVersions).toContain("hakimi.local-reading-timeline/0.3.0");
    expect(parsed.value.source.readingVersions).toContain(LOCAL_ANNUAL_OUTLOOK_VERSION);
    expect(parsed.value.originalConclusion).toContain("（不含终点）");
    expect(parsed.value.originalConclusion).toContain("按当前修订的起运方向");
    expect(parsed.value.originalConclusion.length).toBeLessThanOrEqual(30_000);
  }, 60_000);
  it("saves feedback against one concrete useful stem with its original conditions and both rule versions", async () => {
    const comprehensive = buildBaziComprehensiveReading(revisionA, buildBaziPreliminaryAssessment(revisionA));
    const guidance = comprehensive.usefulGuidance!, entry = guidance.entries[0]!;
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(workbench().getByRole("button", { name: "保存首个用字反馈" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(workbench().getByRole("button", { name: "保存首个用字反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const notes = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(notes).toHaveLength(1);
    const parsed = parseReadingFeedback(notes[0]!.body);
    expect(parsed.kind).toBe("feedback");
    if (parsed.kind !== "feedback") throw new Error("Expected structured feedback");
    expect(parsed.value.source.revisionId).toBe(revisionA.id);
    expect(parsed.value.source.readingVersions).toEqual([comprehensive.version, guidance.version]);
    expect(notes[0]!.body).toContain(entry.judgment);
    for (const condition of entry.conditions) expect(notes[0]!.body).toContain(condition);
    expect(notes[0]!.body).toContain(`useful-stem-${entry.id}`);
  }, 60_000);
  async function createStructuredFeedback() {
    return createNote(revisionA, buildStructuredReadingFeedback(buildBaziPreliminaryAssessment(revisionA), {
      subjectId: "natal-overview", subjectLabel: "命局总论", originalConclusion: "原版结论：更关注技能兑现。", actualSituation: "实际先学习，再工作。",
      rating: "partial", aspect: "先后顺序不同", occurredAt: "2024—2025", requestedRevision: "先写学习阶段。", sourceVersions: ["synthetic/original-version"]
    }));
  }
  async function openReviewForm() {
    await waitFor(() => expect(screen.getByText("用户反馈")).toBeDefined());
    fireEvent.click(screen.getByText("用户反馈").closest("summary")!);
    await waitFor(() => expect((screen.getByRole("button", { name: "追加复核或个人修订" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "追加复核或个人修订" }));
    fireEvent.change(screen.getByLabelText("本次复核状态"), { target: { value: "revised" } });
    fireEvent.change(screen.getByLabelText("复核说明与新增事实"), { target: { value: "补充确切阶段，原结论次序需调整。" } });
    fireEvent.change(screen.getByLabelText("希望保留的个人修订文本"), { target: { value: "先完成学习，再逐步承担项目。" } });
  }

  it("appends a real personal review, preserves the original note byte for byte, and reopens both the comparison and independent raw review", async () => {
    const original = await createStructuredFeedback(), originalBytes = JSON.stringify(original);
    const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await openReviewForm();
    fireEvent.click(screen.getByRole("button", { name: "保存追加复核" }));
    await waitFor(async () => expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(2));
    const notes = await repository.listResearchNotesByCase(revisionA.caseId), review = notes.find((note) => note.id !== original.id)!;
    expect(JSON.stringify(notes.find((note) => note.id === original.id))).toBe(originalBytes);
    expect(review.tags).toContain("解读反馈"); expect(review.tags).toContain(LOCAL_READING_REVIEW_TAG);
    const parsed = parseReadingFeedback(review.body);
    expect(parsed.kind).toBe("review"); if (parsed.kind !== "review") throw new Error();
    expect(parsed.value.root.noteId).toBe(original.id); expect(parsed.value.previous).toBeNull();
    expect(parsed.value.source.readingVersions).toEqual(["synthetic/original-version"]);
    await waitFor(() => expect(screen.getByText("当前个人修订")).toBeDefined());
    expect(screen.getAllByText("先完成学习，再逐步承担项目。").length).toBeGreaterThan(0);
    expect(screen.getByText("追加复核记录")).toBeDefined();
    view.unmount(); render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.getByText("用户反馈")).toBeDefined());
    fireEvent.click(screen.getByText("用户反馈").closest("summary")!);
    await waitFor(() => expect(screen.getByText("当前个人修订")).toBeDefined());
    expect(screen.getByText("追加复核记录")).toBeDefined();
  }, 60_000);

  it("rejects an edited original in the fresh preflight without creating a review or declaring an unknown write", async () => {
    const root = await createStructuredFeedback(); render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await openReviewForm();
    await repository.updateResearchNote(root.id, { expectedEditVersion: root.editVersion, patch: { body: root.body + "\n旧正文已被普通编辑修改" } });
    fireEvent.click(screen.getByRole("button", { name: "保存追加复核" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("原反馈正文或版本已经变化"));
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(1);
    expect(getResearchJournalMutationSnapshot().status).toBe("idle");
    expect((screen.getByLabelText("希望保留的个人修订文本") as HTMLTextAreaElement).value).toBe("先完成学习，再逐步承担项目。");
  }, 60_000);

  it("does not duplicate an appended review after the database committed but its acknowledgement was lost", async () => {
    await createStructuredFeedback(); render(<LocalReadingContainer {...propsFor(revisionA)} />); await openReviewForm();
    const write = vi.mocked(researchRepository.createResearchNote).mockImplementation(async (input) => {
      await repository.createResearchNote(input); throw new Error("Synthetic lost review acknowledgement");
    });
    fireEvent.click(screen.getByRole("button", { name: "保存追加复核" }));
    await waitFor(() => expect(screen.getAllByRole("alert").some(node => node.textContent?.includes("保存结果尚未确认"))).toBe(true));
    expect(getResearchJournalMutationSnapshot().status).toBe("call_unknown");
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "保存追加复核" }));
    await waitFor(() => expect(screen.getAllByRole("alert").some(node => node.textContent?.includes("等待核对"))).toBe(true));
    expect(write).toHaveBeenCalledTimes(1);
  }, 60_000);
  it("derives feedback choices for all actual ten years and saves both scenario feedback and the complete scenario snapshot", async () => {
    const actual = await vi.importActual<typeof import("../lib/local-annual-outlook")>("../lib/local-annual-outlook");
    vi.mocked(buildLocalAnnualOutlook).mockImplementation(actual.buildLocalAnnualOutlook);
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    const current = new Date().getFullYear();
    await waitFor(() => expect(screen.getByTestId("event-feedback-choices").textContent).toContain(`${current + 9}年情境`));
    for (let year = current; year < current + 10; year++) expect(screen.getByTestId("event-feedback-choices").textContent).toContain(`${year}年情境`);
    fireEvent.click(workbench().getByRole("button", { name: "保存首个情境反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    let notes = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.body).toContain("年度情境规则：hakimi.annual-event-scenarios/0.4.0");
    expect(notes[0]!.body).toContain("合成情境反馈：实际主要调整了岗位职责。");
    await waitForPersonalReading();
    await saveCompleteSnapshot();
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(2);
    notes = await repository.listResearchNotesByCase(revisionA.caseId);
    const snapshot = notes.find((note) => note.tags.includes("本地解读快照"))!;
    const text = await unpackReadingSnapshot(snapshot.body);
    for (let year = current; year < current + 10; year++) expect(text).toContain(`### ${year}`);
    expect(text).toContain("情境依据：源修订");
    expect(text).toContain("不补充或改写顺逆判断");
  }, 60_000);

  it("saves feedback to the real repository and shows it again after remount", async () => {
    const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.getByTestId("annual-revision").textContent).toBe(revisionA.id));
    fireEvent.click(workbench().getByRole("button", { name: "保存测试反馈" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toBe("测试保存成功"));
    const records = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(records).toHaveLength(1);
    expect(records[0]?.anchor).toEqual({ kind: "revision", revisionId: revisionA.id });
    expect(records[0]?.body).toContain("实际：本年主要换工作");
    expect(records[0]?.body).toContain(revisionA.manifest.resultHash);
    view.unmount();
    const reopened = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(reopened.container.querySelector("pre")?.textContent).toBe(records[0]?.body));
  }, 60_000);

  it("shows the end and newlines of valid feedback longer than 10000 characters", async () => {
    const body = buildLocalReadingFeedback(buildBaziPreliminaryAssessment(revisionA),
      `原结论\n${"甲".repeat(3800)}原结论尾`, `实际情况\n${"乙".repeat(7400)}实际情况末尾标记`);
    expect(body.length).toBeGreaterThan(10000);
    await createNote(revisionA, body);
    const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(view.container.querySelector("pre")?.textContent).toBe(body));
    expect(view.container.querySelector("pre")?.textContent).toContain("实际情况末尾标记");
    expect(view.container.querySelector("pre")?.textContent).toContain("\n\n");
  }, 60_000);

  it("refuses incomplete save and export callbacks until actual annual events and all report inputs are ready", async () => {
    const actual = await useActualAnnual(), late = deferred<LocalAnnualOutlook>();
    const computed = await actual(revisionA, buildBaziPreliminaryAssessment(revisionA), new Date().getFullYear());
    vi.mocked(buildLocalAnnualOutlook).mockImplementation(() => late.promise);
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    expect(screen.getByTestId("report-loading").textContent).toBe("true");
    // The mock intentionally calls through instead of disabling itself, so
    // this verifies the mutation boundary as well as the production UI prop.
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("完整解读仍在整理"));
    fireEvent.click(workbench().getByRole("button", { name: "导出测试报告" }));
    await waitFor(() => expect(screen.getAllByText("完整解读仍在整理，请完成后再保存或导出。").length).toBeGreaterThan(1));
    expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
    expect(getResearchJournalMutationSnapshot().status).toBe("idle");
    await act(async () => { late.resolve(computed); await late.promise; });
    await waitForPersonalReading();
    expect(screen.getByTestId("report-loading").textContent).toBe("false");
    await saveCompleteSnapshot();
    const notes = await repository.listResearchNotesByCase(revisionA.caseId);
    expect(notes).toHaveLength(1);
    const full = await unpackReadingSnapshot(notes[0]!.body);
    expect(full).toContain("## 年度应事情境先读");
    expect(full).toContain("## 年度主题与十二节令月");
    expect(full).toContain(annualMonthStoryModule.LOCAL_ANNUAL_MONTH_STORY_VERSION);
  }, 60_000);

  it("does not label an empty annual state fixture as a complete saved report", async () => {
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitForPersonalReading();
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("完整解读缺少年度"));
    expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
    expect(getResearchJournalMutationSnapshot().status).toBe("idle");
  }, 60_000);

  it("does not retry a write whose acknowledgement is lost after the real record was committed", async () => {
    await useActualAnnual();
    const buildReport = vi.spyOn(readingEditionModule, "buildLocalReadingReport");
    const pack = vi.spyOn(snapshotCodecModule, "packReadingSnapshot");
    const detail = vi.spyOn(detailedPanelModule, "DetailedOutlookPanel");
    const write = vi.mocked(researchRepository.createResearchNote).mockImplementation(async (input) => {
      await repository.createResearchNote(input);
      throw new Error("Synthetic acknowledgement lost after commit");
    });
    render(<LocalReadingContainer {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.getByTestId("annual-revision").textContent).toBe(revisionA.id));
    await waitForPersonalReading();
    await saveCompleteSnapshot(/保存结果尚未确认/);
    expect(getResearchJournalMutationSnapshot().status).toBe("call_unknown");
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(1);
    await waitForPersonalReading();
    fireEvent.click(workbench().getByRole("button", { name: "保存测试快照" }));
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toMatch(/正在保存|等待核对/));
    expect(write).toHaveBeenCalledTimes(1);
    expect(buildReport).toHaveBeenCalledTimes(1);
    expect(pack).toHaveBeenCalledTimes(1);
    expect(detail.mock.calls.at(-1)![0].personalReadingReady).toBe(true);
    expect(getResearchJournalMutationSnapshot().status).toBe("call_unknown");
  }, 60_000);

  it("does not publish old annual results or a late old-save refresh into a newly keyed revision", async () => {
    const lateAnnual = deferred<LocalAnnualOutlook>();
    const lateWrite = deferred<ResearchNoteRecord>();
    vi.mocked(buildLocalAnnualOutlook).mockImplementation((revision) => revision.id === revisionA.id ? lateAnnual.promise : Promise.resolve(annualFor(revision)));
    const write = vi.mocked(researchRepository.createResearchNote).mockImplementationOnce(() => lateWrite.promise);
    await createNote(revisionB, "只属于修订B的反馈");
    const view = render(<LocalReadingContainer key={revisionA.id} {...propsFor(revisionA)} />);
    await waitFor(() => expect(screen.queryByText("正在读取记录…")).toBeNull());
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).toContain(revisionA.id));
    // A complete snapshot is now blocked while annual data is pending. A
    // feedback write keeps the original late-save/late-annual isolation test.
    fireEvent.click(workbench().getByRole("button", { name: "保存测试反馈" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    const request = write.mock.calls[0]![0];
    expect(request.anchor).toEqual({ kind: "revision", revisionId: revisionA.id });
    view.rerender(<LocalReadingContainer key={revisionB.id} {...propsFor(revisionB)} />);
    await waitFor(() => expect(view.container.querySelector("pre")?.textContent).toBe("只属于修订B的反馈"));
    const persistedA = await repository.createResearchNote(request);
    await act(async () => { lateWrite.resolve(persistedA); lateAnnual.resolve(annualFor(revisionA)); await lateWrite.promise; });
    await waitFor(() => expect(screen.getByTestId("annual-revision").textContent).toBe(revisionB.id));
    await waitFor(() => expect(screen.getByTestId("synthesis").textContent).toContain(revisionB.id));
    expect(screen.getByTestId("synthesis").textContent).not.toContain(revisionA.id);
    expect(view.container.querySelector("pre")?.textContent).toBe("只属于修订B的反馈");
    expect(view.container.textContent).not.toContain(persistedA.body);
    expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(1);
  }, 60_000);
});
