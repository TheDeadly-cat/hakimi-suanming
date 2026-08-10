import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FileShareResult, ReportExportPort } from "@hakimi/platform";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";

type ShareErrorResult = Extract<FileShareResult, { status: "failed" | "unsupported" }>;

const artifact: PreparedFileArtifact = {
  blob: new Blob(["same-file"], { type: "text/markdown;charset=utf-8" }),
  filename: "pair-study.md",
  title: "匿名双案例研究",
  description: "交付同一份已冻结的本地文件。",
  sharePolicy: "allowed"
};

function createExportPort(
  capabilities = {
    canDownloadFiles: true,
    canChooseSaveLocation: true,
    canShareFiles: true
  }
) {
  const saveFile = vi.fn<ReportExportPort["saveFile"]>();
  const saveFileToChosenLocation = vi.fn<ReportExportPort["saveFileToChosenLocation"]>();
  const shareFile = vi.fn<ReportExportPort["shareFile"]>();
  saveFile.mockResolvedValue({
    status: "download_requested",
    filename: artifact.filename,
    method: "browser_download"
  });
  saveFileToChosenLocation.mockResolvedValue({
    status: "saved",
    filename: artifact.filename,
    method: "file_system_access",
    bytesWritten: artifact.blob.size
  });
  shareFile.mockResolvedValue({
    status: "shared",
    filename: artifact.filename,
    method: "web_share"
  });
  const port: ReportExportPort = {
    getCapabilities: vi.fn(() => capabilities),
    printReport: vi.fn(async () => undefined),
    saveFile,
    saveFileToChosenLocation,
    shareFile
  };
  return { port, saveFile, saveFileToChosenLocation, shareFile };
}

describe("PreparedFileDeliveryDialog", () => {
  it("按运行时能力显示交付入口，并把同一份 Blob 交给指定保存、下载和分享", async () => {
    const user = userEvent.setup();
    const { port, saveFile, saveFileToChosenLocation, shareFile } = createExportPort();

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "文件已在本机生成" });
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByText(artifact.filename)).toBeTruthy();
    expect(screen.getByText("9 B")).toBeTruthy();
    expect(screen.getByRole("button", { name: "保存到指定位置" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "下载文件" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "系统分享" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "保存到指定位置" }));
    await waitFor(() => expect(saveFileToChosenLocation).toHaveBeenCalledWith(artifact.blob, artifact.filename));
    expect(screen.getByRole("status").textContent).toContain("已由当前平台确认写入");

    await user.click(screen.getByRole("button", { name: "下载文件" }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(artifact.blob, artifact.filename));
    expect(screen.getByRole("status").textContent).toContain("已请求浏览器下载");

    await user.click(screen.getByRole("button", { name: "系统分享" }));
    await waitFor(() => expect(shareFile).toHaveBeenCalledWith(artifact.blob, artifact.filename, artifact.title));
    expect(screen.getByRole("status").textContent).toContain("已交给系统分享面板");

    expect(saveFileToChosenLocation.mock.calls[0]?.[0]).toBe(artifact.blob);
    expect(saveFile.mock.calls[0]?.[0]).toBe(artifact.blob);
    expect(shareFile.mock.calls[0]?.[0]).toBe(artifact.blob);
  });

  it("取消指定位置保存后保留对话框并允许用同一份文件重试", async () => {
    const user = userEvent.setup();
    const { port, saveFileToChosenLocation } = createExportPort();
    saveFileToChosenLocation
      .mockResolvedValueOnce({
        status: "cancelled",
        filename: artifact.filename,
        operation: "save",
        reason: "未选择保存位置。"
      })
      .mockResolvedValueOnce({
        status: "saved",
        filename: artifact.filename,
        method: "file_system_access",
        bytesWritten: artifact.blob.size
      });

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    const saveButton = screen.getByRole("button", { name: "保存到指定位置" });
    await user.click(saveButton);
    expect((await screen.findByRole("status")).textContent).toContain("未选择保存位置");
    expect(screen.getByRole("dialog", { name: "文件已在本机生成" })).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(saveButton);
    await waitFor(() => expect(saveFileToChosenLocation).toHaveBeenCalledTimes(2));
    expect(saveFileToChosenLocation.mock.calls.every(([blob]) => blob === artifact.blob)).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("已由当前平台确认写入");
  });

  it("取消系统分享后不报错、不下载，并可继续分享同一份文件", async () => {
    const user = userEvent.setup();
    const { port, saveFile, saveFileToChosenLocation, shareFile } = createExportPort();
    shareFile
      .mockResolvedValueOnce({
        status: "cancelled",
        filename: artifact.filename,
        operation: "share"
      })
      .mockResolvedValueOnce({
        status: "shared",
        filename: artifact.filename,
        method: "web_share"
      });

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    const shareButton = screen.getByRole("button", { name: "系统分享" });
    await user.click(shareButton);
    expect((await screen.findByRole("status")).textContent).toContain("已取消匿名双案例研究分享操作");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();

    await user.click(shareButton);
    await waitFor(() => expect(shareFile).toHaveBeenCalledTimes(2));
    expect(shareFile.mock.calls.every(([blob]) => blob === artifact.blob)).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("已交给系统分享面板");
  });

  it.each<[string, ShareErrorResult]>([
    ["失败", {
      status: "failed",
      filename: artifact.filename,
      operation: "share",
      stage: "share",
      reason: "系统分享面板启动失败"
    }],
    ["不支持", {
      status: "unsupported",
      filename: artifact.filename,
      operation: "share",
      reason: "当前环境不能分享文件"
    }]
  ])("分享%s时显示错误且不静默改为下载", async (_label, result) => {
    const user = userEvent.setup();
    const { port, saveFile, saveFileToChosenLocation, shareFile } = createExportPort();
    shareFile.mockResolvedValueOnce(result);

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "系统分享" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(result.reason);
    expect(shareFile).toHaveBeenCalledWith(artifact.blob, artifact.filename, artifact.title);
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();
  });

  it("Escape 关闭后恢复触发器焦点和页面原有滚动状态", async () => {
    const { port } = createExportPort();
    document.body.style.overflow = "clip";

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>生成文件</button>
          {open ? (
            <PreparedFileDeliveryDialog
              artifact={artifact}
              exportPort={port}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }

    const { unmount } = render(<Harness />);
    const trigger = screen.getByRole("button", { name: "生成文件" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "文件已在本机生成" }));
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("clip");
    unmount();
    document.body.style.overflow = "";
  });

  it("运行时能力不支持时隐藏指定保存和分享，只保留普通下载", () => {
    const { port } = createExportPort({
      canDownloadFiles: true,
      canChooseSaveLocation: false,
      canShareFiles: false
    });

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "保存到指定位置" })).toBeNull();
    expect(screen.queryByRole("button", { name: "系统分享" })).toBeNull();
    expect(screen.getByRole("button", { name: "下载文件" })).toBeTruthy();
    expect(screen.getByText(/当前浏览器不支持文件系统分享/)).toBeTruthy();
  });

  it("工件冻结为敏感策略时即使平台支持也不展示分享入口", () => {
    const { port } = createExportPort();
    const sensitiveArtifact: PreparedFileArtifact = {
      ...artifact,
      title: "完整单盘 Markdown",
      sharePolicy: "blocked_sensitive"
    };

    render(
      <PreparedFileDeliveryDialog
        artifact={sensitiveArtifact}
        exportPort={port}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "系统分享" })).toBeNull();
    expect(screen.queryByText(/不支持文件系统分享/)).toBeNull();
    expect(screen.getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
  });
});
