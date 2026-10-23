import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportExportPort } from "@hakimi/platform";
import { PreparedFileDeliveryDialog, type PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { getPreparedFileDeliverySnapshot, resetPreparedFileDeliveryCoordinatorForTests } from "./prepared-file-delivery-coordinator";

const artifact: PreparedFileArtifact = {
  blob: new Blob(["# synthetic complete reading"], { type: "text/markdown;charset=utf-8" }),
  filename: "synthetic-reading.md", title: "完整命理解读",
  description: "本次命局解读、岁运说明与对应依据。", sharePolicy: "blocked_sensitive"
};
function port() {
  return {
    getCapabilities: () => ({ canDownloadFiles: true, canChooseSaveLocation: true, canShareFiles: true }),
    saveFile: vi.fn<ReportExportPort["saveFile"]>().mockResolvedValue({ status: "download_requested", filename: artifact.filename, method: "browser_download" }),
    shareFile: vi.fn<ReportExportPort["shareFile"]>(),
    saveFileToChosenLocation: vi.fn<ReportExportPort["saveFileToChosenLocation"]>().mockImplementation(async (blob, filename, requestId) => ({
      status: "saved", filename, requestedFilename: filename, requestId, bytesWritten: blob.size, method: "file_system_access"
    })),
    printReport: vi.fn<ReportExportPort["printReport"]>()
  } satisfies ReportExportPort;
}
beforeEach(() => resetPreparedFileDeliveryCoordinatorForTests());

describe("simple reading file presentation", () => {
  it("keeps the default detailed presentation available", () => {
    render(<PreparedFileDeliveryDialog artifact={artifact} exportPort={port()} onClose={vi.fn()} />);
    expect(screen.getByText("Blob 已准备")).toBeTruthy();
    expect(screen.getByText("legacy-v13 · schema 13 · migration null")).toBeTruthy();
  });

  it("shows the report and saving choices while retaining technical details in a closed disclosure", async () => {
    const delivery = port();
    render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "导出文件" })).toBeTruthy();
    expect(screen.getByText("包含内容")).toBeTruthy();
    expect((screen.getByRole("button", { name: "保存到指定位置" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "下载" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "关闭" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: /系统分享/ })).toBeNull();
    expect(screen.getByText("Blob 已准备").closest("details")?.open).toBe(false);
    expect(screen.getByText("legacy-v13 · schema 13 · migration null").closest("details")?.open).toBe(false);
    const details = screen.getByText("文件与保存详情").closest("details")!;
    expect(details.open).toBe(false);
    await userEvent.click(screen.getByText("文件与保存详情"));
    expect(details.open).toBe(true);
    expect(screen.getByText("Blob 已准备")).toBeTruthy();
    expect(delivery.saveFile).not.toHaveBeenCalled();
    expect(delivery.saveFileToChosenLocation).not.toHaveBeenCalled();
    expect(delivery.shareFile).not.toHaveBeenCalled();
  });

  it("preserves a requested download across close and remount without reporting it saved or retrying", async () => {
    const user = userEvent.setup(), delivery = port(), onClose = vi.fn(), onResolution = vi.fn();
    const first = render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={onClose} onDeliveryResolution={onResolution} />);
    await user.click(screen.getByRole("button", { name: "下载" }));
    await waitFor(() => expect(getPreparedFileDeliverySnapshot().status).toBe("manual_check_required"));
    const pending = getPreparedFileDeliverySnapshot();
    expect((screen.getByRole("button", { name: "下载" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/下载已发起，请到浏览器下载列表确认/)).toBeTruthy();
    expect(onResolution.mock.calls[0]![0].result.status).toBe("download_requested");
    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(getPreparedFileDeliverySnapshot()).toBe(pending);
    first.unmount();
    render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={onClose} onDeliveryResolution={onResolution} />);
    expect((screen.getByRole("button", { name: "下载" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "已核对文件并关闭" }));
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(delivery.saveFile).toHaveBeenCalledTimes(1);
    expect(onResolution).toHaveBeenCalledTimes(1);
    expect(delivery.shareFile).not.toHaveBeenCalled();
  });

  it("keeps unknown outcome locked until an explicit check, and that check does not start another download", async () => {
    const user = userEvent.setup(), delivery = port(), resolution = vi.fn();
    delivery.saveFile.mockRejectedValueOnce(new Error("synthetic adapter interruption"));
    render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={vi.fn()} onDeliveryResolution={resolution} />);
    await user.click(screen.getByRole("button", { name: "下载" }));
    await waitFor(() => expect(screen.getByText("无法确认上次是否已保存。请先检查下载列表或目标位置，避免重复保存。")).toBeTruthy());
    expect((screen.getByRole("button", { name: "下载" }) as HTMLButtonElement).disabled).toBe(true);
    expect(resolution).not.toHaveBeenCalled();
    const exit = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(exit)).toBe(false);
    await user.click(screen.getByRole("button", { name: "我已核对，允许再次保存" }));
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(delivery.saveFile).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "下载" }) as HTMLButtonElement).disabled).toBe(false);
    expect(resolution).not.toHaveBeenCalled();
  });

  it("uses the same chosen-location receipt validation and only reports a verified save", async () => {
    const delivery = port(), resolution = vi.fn();
    render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={vi.fn()} onDeliveryResolution={resolution} />);
    await userEvent.click(screen.getByRole("button", { name: "保存到指定位置" }));
    await waitFor(() => expect(resolution).toHaveBeenCalledTimes(1));
    expect(resolution.mock.calls[0]![0].result.status).toBe("saved");
    expect(screen.getByText("文件已保存，可到所选位置查看。")).toBeTruthy();
    expect(delivery.saveFileToChosenLocation).toHaveBeenCalledTimes(1);
    expect(delivery.saveFile).not.toHaveBeenCalled();
  });

  it("does not let the simple close button or Escape bypass an in-flight operation", async () => {
    const delivery = port(), onClose = vi.fn();
    delivery.saveFile.mockImplementationOnce(() => new Promise(() => {}));
    render(<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={delivery} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "下载" }));
    expect((screen.getByRole("button", { name: "关闭" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(delivery.saveFile).toHaveBeenCalledTimes(1);
  });
});
