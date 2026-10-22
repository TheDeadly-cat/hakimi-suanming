import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { webReportExportPort } from "@hakimi/platform";
import { packReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { LOCAL_READING_FEEDBACK_TAG } from "../lib/local-reading-record";
import { LOCAL_READING_REVIEW_TAG } from "../lib/local-reading-feedback";
import { LOCAL_READING_CONTEXT_TAG } from "../lib/local-reading-context";
import { ReadingSavedRecord } from "./reading-saved-record";
import { resetPreparedFileDeliveryCoordinatorForTests } from "./prepared-file-delivery-coordinator";

beforeEach(() => resetPreparedFileDeliveryCoordinatorForTests());
afterEach(() => { vi.restoreAllMocks(); resetPreparedFileDeliveryCoordinatorForTests(); });
const blobText = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob); });

describe("original saved reading export", () => {
  it.each([LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_REVIEW_TAG, LOCAL_READING_CONTEXT_TAG])("keeps the original export for a legacy %s record", async tag => {
    const original = "# 旧记录原文\r\n原选择与说明\u200b不重算。\n";
    const record: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
      anchor: { kind: "case" }, bodyFormat: "markdown", body: original, tags: [tag], sourceRefs: [], lifecycle: "active", editVersion: 2,
      createdAt: "2026-10-15T10:00:00Z", updatedAt: "2026-10-15T10:00:00Z" };
    const before = JSON.stringify(record);
    const save = vi.spyOn(webReportExportPort, "saveFile").mockImplementation(async (_blob, filename) => ({ status: "download_requested", filename, method: "browser_download" }));
    const view = render(<ReadingSavedRecord record={record} />);
    await userEvent.click(view.container.querySelector("summary")!);
    fireEvent.click(await screen.findByRole("button", { name: "导出这份原始记录" }));
    fireEvent.click(screen.getByRole("button", { name: /^下载$/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(await blobText(save.mock.calls[0]![0])).toBe(original);
    expect(JSON.stringify(record)).toBe(before);
  });
  it.each(["reading", "archive"] as const)("exports the saved bundle %s byte-for-byte, including invisible text, without regenerating", async kind => {
    const report = { reading: "# 原阅读稿\r\n\ufeff本人原文\u200b与结论🌿\n<script>literal</script>",
      archive: "# 原始完整档案\r\n旧判断、来源与版本。\u200b\n".repeat(9_000), version: "edition/old" };
    const record: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
      anchor: { kind: "case" }, bodyFormat: "markdown", body: await packReadingSnapshot(await encodeReadingReportBundle(report)), tags: ["本地解读快照"],
      sourceRefs: [], lifecycle: "active", editVersion: 4, createdAt: "2026-10-15T10:00:00Z", updatedAt: "2026-10-15T10:00:00Z" };
    const before = JSON.stringify(record);
    const save = vi.spyOn(webReportExportPort, "saveFile").mockImplementation(async (_blob, filename) => ({ status: "download_requested", filename, method: "browser_download" }));
    const view = render(<ReadingSavedRecord record={record} />);
    await userEvent.click(view.container.querySelector("summary")!);
    const button = await screen.findByRole("button", { name: kind === "reading" ? "导出这份通读报告" : "导出这份完整档案" });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: /^下载$/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![1]).toBe(`hakimi-saved-${kind === "reading" ? "report" : "reading"}-${record.id}-v4.md`);
    expect(await blobText(save.mock.calls[0]![0])).toBe(report[kind]);
    expect(screen.queryByRole("button", { name: /分享/ })).toBeNull();
    expect(JSON.stringify(record)).toBe(before);
  });
  it("exports the complete original text and version, without regenerating it or changing the stored snapshot", async () => {
    const original = "# 原始结论\n解读规则：旧版0.1\n" + "原文逐字保留。\n".repeat(25_000);
    const record: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
      anchor: { kind: "case" }, bodyFormat: "markdown", body: await packReadingSnapshot(original), tags: ["本地解读快照"],
      sourceRefs: [], lifecycle: "active", editVersion: 3, createdAt: "2026-10-15T10:00:00Z", updatedAt: "2026-10-15T10:00:00Z" };
    const before = JSON.stringify(record);
    const save = vi.spyOn(webReportExportPort, "saveFile").mockImplementation(async (_blob, filename) => ({ status: "download_requested", filename, method: "browser_download" }));
    const view = render(<ReadingSavedRecord record={record} />);
    await userEvent.click(view.container.querySelector("summary")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "导出这份原始记录" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "导出这份原始记录" }));
    expect(screen.getByRole("dialog").textContent).toContain("已保存的原始解读");
    fireEvent.click(screen.getByRole("button", { name: /^下载$/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![1]).toBe(`hakimi-saved-reading-${record.id}-v3.md`);
    expect(await blobText(save.mock.calls[0]![0])).toBe(original);
    expect(JSON.stringify(record)).toBe(before);
  });
});
