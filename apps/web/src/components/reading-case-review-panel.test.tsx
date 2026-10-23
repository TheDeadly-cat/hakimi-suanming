import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingCaseReviewPanel } from "./reading-case-review-panel";
import { appendReadingCaseReview, type AppendReadingCaseReviewInput } from "../lib/reading-case-review-storage";
import { loadReadingCaseReviewTargets, parseReadingCaseReview } from "../lib/reading-case-review";
import { syntheticIndexedReport, syntheticReviewNote } from "../test/reading-case-review-fixture";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { resetResearchJournalMutationCoordinatorForTests } from "./research-journal-mutation-coordinator";

afterEach(() => resetResearchJournalMutationCoordinatorForTests());
async function formReady() {
  await screen.findByRole("heading", { name: "原始解释 · 保留不变" });
  await waitFor(() => expect(screen.queryByText("正在核对这条结论的复盘记录…")).toBeNull());
}
describe("case review user workflow", () => {
  it("appends separated facts and evaluation, then shows an append-only correction beside the earlier record", async () => {
    const report = await syntheticIndexedReport(), records = [report];
    let timestamp = "2026-10-24T03:00:00.000Z";
    const onAppend = vi.fn(async (input: AppendReadingCaseReviewInput) => appendReadingCaseReview(input, {
      listResearchNotesByCase: async () => records,
      createResearchNote: async value => { const note = syntheticReviewNote(value.body, { createdAt: timestamp, updatedAt: timestamp }); records.push(note); return note; }
    }));
    render(<ReadingCaseReviewPanel caseId={report.caseId} records={[report]} onAppend={onAppend}/>); await formReady();
    fireEvent.change(screen.getByLabelText("事情发生时间（可填年份、月份或说明）"), { target: { value: "2027 年 9 月" } });
    fireEvent.change(screen.getByLabelText("发生了什么（没有事实可以留空）"), { target: { value: "任务接下了，但验收延后。" } });
    fireEvent.change(screen.getByLabelText("本次主要评价"), { target: { value: "evidence_insufficient" } });
    fireEvent.change(screen.getByLabelText("评价说明（与事实分开）"), { target: { value: "不能仅看接到任务就判断兑现。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存这次复盘" }));
    await screen.findByText("复盘已追加保存。原解释和此前记录保持原样。");
    const history = await screen.findByRole("list", { name: "事实与评价追加历史" });
    expect(within(history).getByText("2027 年 9 月")).not.toBeNull();
    expect(within(history).getByText("任务接下了，但验收延后。")).not.toBeNull();
    expect(within(history).getByText("依据不足")).not.toBeNull();
    const original = records[1]!.body;
    timestamp = "2026-10-24T04:00:00.000Z";
    fireEvent.change(screen.getByLabelText("是否更正此前记录"), { target: { value: records[1]!.id } });
    fireEvent.change(screen.getByLabelText("更正说明"), { target: { value: "核对记录后更正月份" } });
    fireEvent.change(screen.getByLabelText("事情发生时间（可填年份、月份或说明）"), { target: { value: "2027 年 10 月" } });
    fireEvent.change(screen.getByLabelText("发生了什么（没有事实可以留空）"), { target: { value: "任务实际在十月接下。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存这次复盘" }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "事实与评价追加历史" })).getAllByRole("listitem")).toHaveLength(2));
    expect(records[1]!.body).toBe(original); expect(records[0]).toEqual(report);
    const correction = parseReadingCaseReview(records[2]!.body); expect(correction.kind).toBe("entry");
    if (correction.kind === "entry") expect(correction.value.correctionOf?.noteId).toBe(records[1]!.id);
    expect(onAppend).toHaveBeenCalledTimes(2);
  });
  it("keeps a draft but stops saving after the selected conclusion changes until the user explicitly rebinds it", async () => {
    const report = await syntheticIndexedReport(), targets = await loadReadingCaseReviewTargets(report), onAppend = vi.fn().mockRejectedValue(new Error("测试中停止保存"));
    render(<ReadingCaseReviewPanel caseId={report.caseId} records={[report]} onAppend={onAppend}/>); await formReady();
    fireEvent.change(screen.getByLabelText("发生了什么（没有事实可以留空）"), { target: { value: "属于第一条结论的草稿" } });
    fireEvent.change(screen.getByLabelText("选择要复盘的具体结论"), { target: { value: targets[1]!.conclusion.stableId } });
    await screen.findByText("所选报告或结论已经变化，草稿仍保留。确认对应关系后才能保存。");
    expect(screen.getByRole("button", { name: "保存这次复盘" })).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("发生了什么（没有事实可以留空）")).toHaveProperty("value", "属于第一条结论的草稿");
    fireEvent.click(screen.getByRole("button", { name: "将草稿用于所选结论" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存这次复盘" })).toHaveProperty("disabled", false));
    fireEvent.click(screen.getByRole("button", { name: "保存这次复盘" }));
    await screen.findByText("测试中停止保存");
    expect(onAppend.mock.calls[0]![0].target.conclusion.stableId).toBe(targets[1]!.conclusion.stableId);
    expect(screen.getByLabelText("发生了什么（没有事实可以留空）")).toHaveProperty("value", "属于第一条结论的草稿");
  });
  it("keeps unconfirmed-write input visible and prevents a second save", async () => {
    const report = await syntheticIndexedReport(), create = vi.fn().mockRejectedValue(new Error("unknown commit outcome"));
    const onAppend = vi.fn((input: AppendReadingCaseReviewInput) => appendReadingCaseReview(input, { listResearchNotesByCase: async () => [report], createResearchNote: create }));
    render(<ReadingCaseReviewPanel caseId={report.caseId} records={[report]} onAppend={onAppend}/>); await formReady();
    fireEvent.change(screen.getByLabelText("本次主要评价"), { target: { value: "not_yet_due" } });
    fireEvent.change(screen.getByLabelText("评价说明（与事实分开）"), { target: { value: "尚未到验证时间，不算成功或失败" } });
    fireEvent.click(screen.getByRole("button", { name: "保存这次复盘" }));
    await screen.findByText("有一笔保存结果尚未确认，已停止重复写入；请到研究日志核对。");
    expect(screen.getByLabelText("评价说明（与事实分开）")).toHaveProperty("value", "尚未到验证时间，不算成功或失败");
    expect(screen.getByRole("button", { name: "保存这次复盘" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "保存这次复盘" })); expect(create).toHaveBeenCalledTimes(1);
  });
  it("keeps legacy reports readable without fabricating indexed conclusions or a review form", async () => {
    const report = syntheticReviewNote(await encodeReadingReportBundle({ reading: "旧阅读稿", archive: "旧档案", version: "hakimi.local-reading-edition/0.21.1" }), { tags: [LOCAL_READING_SNAPSHOT_TAG] });
    render(<ReadingCaseReviewPanel caseId={report.caseId} records={[report]}/>);
    await screen.findByText(/这份旧报告没有保存具体结论索引或原解释生成时间/);
    expect(screen.queryByLabelText("发生了什么（没有事实可以留空）")).toBeNull();
    expect(screen.queryByRole("button", { name: "保存这次复盘" })).toBeNull();
  });
  it("exposes original report and export in read-only mode while suppressing all edits", async () => {
    const report = await syntheticIndexedReport();
    render(<ReadingCaseReviewPanel caseId={report.caseId} records={[report]} readOnly/>); await formReady();
    expect(screen.getByText("当前为只读状态，可以查看和导出已有复盘。")).not.toBeNull();
    expect(screen.getByRole("button", { name: "导出这条结论的复盘" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: "保存这次复盘" })).toBeNull();
  });
});
