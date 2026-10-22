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
  it("空库直接引导建盘，不显示工程检索入口", async () => {
    render(<ReadingReportsPage />);
    expect(await screen.findByRole("heading", { name: "还没有命盘" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "排我的命盘" }).getAttribute("href")).toBe("/new");
    expect(screen.queryByText("专业研究检索")).toBeNull();
  });
});
