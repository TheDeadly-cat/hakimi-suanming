import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { withTimeRules } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { ReadingReportsPage } from "./reading-reports-page";

async function chart(alias: string) {
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false, location: { label: "", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "" },
  withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" }));
  return caseRepository.createCase({ alias, tags: [], calculated });
}
beforeEach(async () => { await caseRepository.clearAll(); window.history.replaceState({}, "", "/reports"); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await caseRepository.clearAll(); });

describe("我的报告", () => {
  it("从指定命盘直接打开保存原文，并排除反馈和其他命盘", async () => {
    const first = await chart("自己的命盘"), other = await chart("其他命盘");
    const record = await researchRepository.createResearchNote({ caseId: first.caseRecord.id,
      anchor: { kind: "revision", revisionId: first.revisions[0]!.id }, body: "旧版本保存的原文，保持这一句话。", tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    await researchRepository.createResearchNote({ caseId: first.caseRecord.id, anchor: { kind: "revision", revisionId: first.revisions[0]!.id }, body: "这条只是反馈", tags: [LOCAL_READING_FEEDBACK_TAG], sourceRefs: [], lifecycle: "active" });
    await researchRepository.createResearchNote({ caseId: other.caseRecord.id, anchor: { kind: "revision", revisionId: other.revisions[0]!.id }, body: "其他人的报告", tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    window.history.replaceState({}, "", `/reports?case=${first.caseRecord.id}&report=${record.id}`);
    render(<ReadingReportsPage />);
    expect(await screen.findByText("旧版本保存的原文，保持这一句话。")).toBeTruthy();
    expect(screen.queryByText("这条只是反馈")).toBeNull();
    expect(screen.queryByText("其他人的报告")).toBeNull();
    expect(screen.getByRole("link", { name: /查看当前解读/ }).getAttribute("href")).toContain(first.revisions[0]!.id);
  });
  it("读取失败显示错误而不是无报告，并可重试", async () => {
    await chart("报告读取核对");
    const read = vi.spyOn(researchRepository, "listResearchNotesByCase").mockRejectedValueOnce(new Error("本机读取暂时失败"));
    render(<ReadingReportsPage />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "本机读取暂时失败");
    expect(screen.queryByText(/这张命盘还没有保存报告/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/这张命盘还没有保存报告/)).toBeTruthy();
  });
  it("暂无正式命盘时仍提供时辰待考和回收站的管理入口", async () => {
    render(<ReadingReportsPage />);
    expect(await screen.findByRole("heading", { name: "暂无正式命盘" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "还没有命盘" })).toBeNull();
    expect(screen.getByRole("link", { name: "全部资料管理" }).getAttribute("href")).toBe("/cases");
    expect(screen.getByRole("link", { name: "查看时辰待考与回收站" }).getAttribute("href")).toBe("/cases");
    expect(screen.getByRole("link", { name: "排我的命盘" }).getAttribute("href")).toBe("/new");
    expect(screen.queryByText("专业研究检索")).toBeNull();
  });
  it("未保存报告的正式命盘仍列出可点击人名和当前解读", async () => {
    const empty = await chart("尚无报告的人"), saved = await chart("已有报告的人");
    await researchRepository.createResearchNote({ caseId: saved.caseRecord.id, anchor: { kind: "revision", revisionId: saved.revisions[0]!.id },
      body: "已保存原文继续保留。", tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    render(<ReadingReportsPage />);
    const link = await screen.findByRole("link", { name: "尚无报告的人的个人档案" });
    expect(link.getAttribute("href")).toBe(`/cases/${empty.caseRecord.id}`);
    expect(link.classList.contains("report-profile-link")).toBe(true);
    expect(screen.getByRole("link", { name: "已有报告的人的个人档案" }).getAttribute("href")).toBe(`/cases/${saved.caseRecord.id}`);
    expect(screen.getByText("0 份已保存报告")).toBeTruthy();
    expect(screen.getByText(/2 份正式档案 · 共 1 份报告/)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "查看当前解读" }).some(item => item.getAttribute("href")?.includes(empty.revisions[0]!.id))).toBe(true);
  });
  it("更早报告的query深链仍打开精确原文并保留分页入口", async () => {
    const person = await chart("历史报告人");
    const records = [];
    for (let index = 0; index < 5; index += 1) records.push(await researchRepository.createResearchNote({ caseId: person.caseRecord.id,
      anchor: { kind: "revision", revisionId: person.revisions[0]!.id }, body: `历史保存原文 ${index}`, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" }));
    const ordered = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    const old = ordered[4]!;
    window.history.replaceState({}, "", `/reports?case=${person.caseRecord.id}&report=${old.id}`);
    render(<ReadingReportsPage />);
    const body = await screen.findByText(old.body);
    expect((body.closest("details.reading-saved-record") as HTMLDetailsElement).open).toBe(true);
    expect((body.closest("details.report-library-older") as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText("查看更早的 2 份报告")).toBeTruthy();
    expect((await researchRepository.getResearchNote(old.id))?.body).toBe(old.body);
  });
  it("回收站中的指定命盘保留明确管理入口而不显示为空报告", async () => {
    const person = await chart("回收站核对人");
    await caseRepository.trashCase(person.caseRecord.id);
    window.history.replaceState({}, "", `/reports?case=${person.caseRecord.id}`);
    render(<ReadingReportsPage />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "这张正式命盘暂未找到或已移入回收站，请到全部资料管理核对。");
    expect(screen.getByRole("link", { name: "全部资料管理" }).getAttribute("href")).toBe("/cases");
    expect(screen.queryByText(/这张命盘还没有保存报告/)).toBeNull();
  });
});
