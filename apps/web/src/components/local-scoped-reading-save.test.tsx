import "fake-indexeddb/auto";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository, researchRepository } from "@hakimi/storage";
import { LocalReadingContainer } from "./local-reading-container";
import { getResearchJournalMutationSnapshot, resetResearchJournalMutationCoordinatorForTests } from "./research-journal-mutation-coordinator";
import * as preparationModule from "../lib/reading-month-preparation";
import * as scopedModule from "../lib/scoped-reading-report";
import { unpackReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { READING_NAVIGATION_STORAGE_KEY } from "../lib/reading-navigation-context";
import { queryReadingExplanation } from "../lib/reading-explanation-index";

// Only replace the large surrounding narrative layout. Actual topic controls,
// scope confirmation, container, producers, codec and repository remain real.
vi.mock("./chart-reading-workbench", () => ({
  ChartReadingWorkbench: ({ revision, explanationPanel, saveScopeAction }: {
    revision: RevisionRecord; explanationPanel?: ReactNode; saveScopeAction?: ReactNode;
  }) => <div data-testid="scoped-save-workbench"><span data-testid="current-revision">{revision.id}</span>{saveScopeAction}{explanationPanel}</div>
}));

type Chart = Awaited<ReturnType<typeof calculateChart>>;
let chartA: Chart, chartB: Chart;
let database: ResearchDatabase, repository: ResearchRepository, revisionA: RevisionRecord, revisionB: RevisionRecord;
const preparations: ReturnType<typeof preparationModule.createReadingMonthPreparation>[] = [];
const pendingMonths = new Set<Promise<unknown>>();
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}
const propsFor = (revision: RevisionRecord) => ({ revision, caseName: "合成范围保存保护", readOnly: false,
  onEditBirthData: vi.fn(), onOpenDetails: vi.fn(), onOpenTransit: vi.fn(), onOpenRecords: vi.fn() });
const scopeButton = () => document.querySelector<HTMLButtonElement>(".reading-scoped-save > button")!;
async function waitForReady() {
  await waitFor(() => expect(scopeButton()?.disabled).toBe(false), { timeout: 30_000 });
  // Initial on-demand month completion can replace the current evidence index.
  // Await that real publication before beginning a stable-input save attempt.
  while (pendingMonths.size) await act(async () => { await Promise.allSettled([...pendingMonths]); });
  await waitFor(() => expect(scopeButton()?.disabled).toBe(false), { timeout: 30_000 });
}
async function beginConfirmation() {
  await waitForReady();
  fireEvent.click(scopeButton());
  expect(screen.getByRole("heading", { name: "确认保存范围" })).toBeTruthy();
}
function confirm() { fireEvent.click(screen.getByRole("button", { name: "确认保存这个范围" })); }
const expectNoFullPreparation = () => {
  expect(preparations.length).toBeGreaterThan(0);
  for (const preparation of preparations) expect(preparation.all).not.toHaveBeenCalled();
};

beforeAll(async () => {
  const input = { schemaVersion: "1.0.0" as const, calendarType: "gregorian" as const, date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute" as const, timeZone: "Asia/Shanghai", sex: "male" as const, lunarLeapMonth: false,
    location: { label: "合成范围保存保护", latitude: null, longitude: null, precision: "unknown" as const }, sourceNote: "synthetic" };
  chartA = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  chartB = await calculateChart({ ...input, time: "10:26" }, WORKING_DEFAULT_RULE_PROFILE);
});
beforeEach(async () => {
  resetResearchJournalMutationCoordinatorForTests();
  window.sessionStorage.removeItem(READING_NAVIGATION_STORAGE_KEY);
  preparations.length = 0;
  pendingMonths.clear();
  const factory = preparationModule.createReadingMonthPreparation;
  vi.spyOn(preparationModule, "createReadingMonthPreparation").mockImplementation((...args) => {
    const original = factory(...args);
    const preparation = { ...original, all: vi.fn(original.all), read: (year: number) => {
      const pending = original.read(year);
      pendingMonths.add(pending);
      void pending.then(() => pendingMonths.delete(pending), () => pendingMonths.delete(pending));
      return pending;
    } };
    preparations.push(preparation);
    return preparation;
  });
  database = new ResearchDatabase(`scoped-save-ui-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  const cases = new CaseRepository(database);
  repository = new ResearchRepository(database);
  revisionA = (await cases.createCase({ alias: "合成范围A", calculated: chartA })).revisions[0]!;
  revisionB = (await cases.createCase({ alias: "合成范围B", calculated: chartB })).revisions[0]!;
  vi.spyOn(researchRepository, "listResearchNotesByCase").mockImplementation((id, options) => repository.listResearchNotesByCase(id, options));
  vi.spyOn(researchRepository, "createResearchNote").mockImplementation(input => repository.createResearchNote(input));
});
afterEach(async () => {
  cleanup();
  await Promise.allSettled([...pendingMonths]);
  vi.restoreAllMocks();
  resetResearchJournalMutationCoordinatorForTests();
  await database?.delete();
});

it("saves the actually selected year/domain through real controls and codec without preparing every year's months", async () => {
  const build = scopedModule.buildScopedReadingReport;
  vi.spyOn(scopedModule, "buildScopedReadingReport").mockImplementation(async input => {
    const available = new Set(input.index.sources.map(source => source.id));
    const missing = queryReadingExplanation(input.index, input.query).conclusions.flatMap(item => item.evidence.ruleApplications
      .flatMap(rule => rule.sourceIds.filter(id => !available.has(id)).map(id => ({ conclusion: item.label, ruleId: rule.ruleId, sourceId: id }))));
    if (missing.length) process.stdout.write(JSON.stringify({ probe: "scoped-save-missing-source-closure", missing }) + "\n");
    return build(input);
  });
  render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await waitForReady();
  fireEvent.click(screen.getByRole("button", { name: "收入与开支" }));
  fireEvent.change(screen.getByLabelText("年份"), { target: { value: "2030" } });
  await beginConfirmation();
  expect(document.querySelector(".reading-scope-confirmation")?.textContent).toContain("2030");
  confirm();
  await waitFor(() => expect(getResearchJournalMutationSnapshot().status).not.toBe("writing"), { timeout: 30_000 });
  expect(document.querySelector(".reading-scoped-save")?.textContent ?? "").not.toContain("本次没有保存");
  await screen.findByRole("link", { name: "打开这份范围报告" }, { timeout: 30_000 });
  expect(researchRepository.createResearchNote).toHaveBeenCalledTimes(1);
  const records = await repository.listResearchNotesByCase(revisionA.caseId);
  expect(records).toHaveLength(1);
  const report = await scopedModule.decodeScopedReadingReport(await unpackReadingSnapshot(records[0]!.body));
  expect(report!.scope.selection).toMatchObject({ kind: "domain", domain: "wealth", year: 2030 });
  expect(report!.index.conclusions.every(item => item.domain === "wealth" && item.scope.level === "year" && item.scope.year === 2030)).toBe(true);
  expect(report!.scope.excludedScopeLabels.join(" ")).toContain("不是完整十年报告");
  expectNoFullPreparation();
  expect(getResearchJournalMutationSnapshot().status).toBe("idle");
}, 60_000);

it("cancels before confirmation without building or writing a report", async () => {
  const build = vi.spyOn(scopedModule, "buildScopedReadingReport");
  render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await beginConfirmation();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.queryByRole("heading", { name: "确认保存范围" })).toBeNull();
  expect(screen.getByText(/已取消，本次未保存/)).toBeTruthy();
  expect(build).not.toHaveBeenCalled();
  expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
  expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(0);
  expectNoFullPreparation();
}, 60_000);

it("saves only the opened month's exact conclusion through the real detail action, without preparing other years", async () => {
  render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await waitForReady();
  fireEvent.click(screen.getByRole("button", { name: "关键月份" }));
  fireEvent.change(screen.getByLabelText("年份"), { target: { value: "2030" } });
  await waitFor(() => expect(document.querySelectorAll(".reading-explanation-results article").length).toBeGreaterThan(0), { timeout: 30_000 });
  const article = document.querySelector<HTMLElement>(".reading-explanation-results article")!;
  const conclusionId = article.dataset.readingConclusion;
  fireEvent.click(article.querySelector<HTMLButtonElement>(".reading-text-button")!);
  expect((screen.getByLabelText("月份与领域") as HTMLSelectElement).value).toBe("");
  await beginConfirmation(); confirm();
  await waitFor(() => expect(getResearchJournalMutationSnapshot().status).not.toBe("writing"), { timeout: 30_000 });
  expect(document.querySelector(".reading-scoped-save")?.textContent ?? "").not.toContain("本次没有保存");
  await screen.findByRole("link", { name: "打开这份范围报告" }, { timeout: 30_000 });
  const records = await repository.listResearchNotesByCase(revisionA.caseId);
  expect(records).toHaveLength(1);
  const report = await scopedModule.decodeScopedReadingReport(await unpackReadingSnapshot(records[0]!.body));
  expect(report!.scope.selection).toMatchObject({ kind: "month", year: 2030, conclusionId });
  expect(report!.index.conclusions).toHaveLength(1);
  expect(report!.index.conclusions[0]!.stableId).toBe(conclusionId);
  expect(report!.presentations[0]!.kind).toBe("month_preview");
  expectNoFullPreparation();
}, 60_000);

it.each(["year", "topic", "revision", "cancel"] as const)("does not write when %s changes while real scope generation is pending", async action => {
  const entered = deferred(), gate = deferred(), original = scopedModule.buildScopedReadingReport;
  vi.spyOn(scopedModule, "buildScopedReadingReport").mockImplementation(async (...args) => {
    entered.resolve(); await gate.promise; return original(...args);
  });
  const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await beginConfirmation(); confirm();
  await act(async () => { await entered.promise; });
  if (action === "year") fireEvent.change(screen.getByLabelText("年份"), { target: { value: "2030" } });
  if (action === "topic") fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  if (action === "revision") view.rerender(<LocalReadingContainer {...propsFor(revisionB)} />);
  if (action === "cancel") fireEvent.click(screen.getByRole("button", { name: "取消尚未写入的保存" }));
  await act(async () => { gate.resolve(); });
  await waitFor(() => expect(getResearchJournalMutationSnapshot().status).toBe("idle"), { timeout: 30_000 });
  expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
  expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(0);
  expect(await repository.listResearchNotesByCase(revisionB.caseId)).toHaveLength(0);
  if (action === "cancel") expect(screen.getByText(/已取消，本次未保存/)).toBeTruthy();
  expectNoFullPreparation();
}, 60_000);

it.each(["year", "topic", "revision", "cancel"] as const)("does not write when %s changes while the actual report is awaiting encoding", async action => {
  const entered = deferred(), gate = deferred(), original = scopedModule.encodeScopedReadingReport;
  vi.spyOn(scopedModule, "encodeScopedReadingReport").mockImplementation(async (...args) => {
    entered.resolve(); await gate.promise; return original(...args);
  });
  const view = render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await beginConfirmation(); confirm();
  await act(async () => { await entered.promise; });
  if (action === "year") fireEvent.change(screen.getByLabelText("年份"), { target: { value: "2030" } });
  if (action === "topic") fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  if (action === "revision") view.rerender(<LocalReadingContainer {...propsFor(revisionB)} />);
  if (action === "cancel") fireEvent.click(screen.getByRole("button", { name: "取消尚未写入的保存" }));
  await act(async () => { gate.resolve(); });
  await waitFor(() => expect(getResearchJournalMutationSnapshot().status).toBe("idle"), { timeout: 30_000 });
  expect(researchRepository.createResearchNote).not.toHaveBeenCalled();
  expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(0);
  expect(await repository.listResearchNotesByCase(revisionB.caseId)).toHaveLength(0);
  expectNoFullPreparation();
}, 60_000);

it.each(["write-then-throw", "different-readback"] as const)("locks an uncertain %s outcome and prevents a duplicate save", async scenario => {
  let wrote = false;
  vi.mocked(researchRepository.createResearchNote).mockImplementation(async input => {
    const record = await repository.createResearchNote(input); wrote = true;
    if (scenario === "write-then-throw") throw new Error("synthetic lost write response");
    return record;
  });
  if (scenario === "different-readback") vi.mocked(researchRepository.listResearchNotesByCase).mockImplementation(async (id, options) => {
    const notes = await repository.listResearchNotesByCase(id, options);
    return wrote ? notes.map(note => ({ ...note, body: "synthetic different returned body" })) : notes;
  });
  render(<LocalReadingContainer {...propsFor(revisionA)} />);
  await beginConfirmation(); confirm();
  await waitFor(() => expect(getResearchJournalMutationSnapshot().status).toBe("call_unknown"), { timeout: 30_000 });
  expect(await repository.listResearchNotesByCase(revisionA.caseId)).toHaveLength(1);
  await waitFor(() => expect(scopeButton()?.disabled).toBe(true), { timeout: 30_000 });
  expect(scopeButton().textContent).toBe("保存结果待核对");
  fireEvent.click(scopeButton());
  fireEvent.click(screen.getByRole("button", { name: "确认保存这个范围" }));
  expect(researchRepository.createResearchNote).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("link", { name: "打开这份范围报告" })).toBeNull();
  expect(getResearchJournalMutationSnapshot().issue?.phase).toBe(scenario === "write-then-throw" ? "call_unknown" : "returned_unreconciled");
  expectNoFullPreparation();
}, 60_000);
