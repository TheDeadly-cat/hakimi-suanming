import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileDeliveryResult, FileShareResult, ReportExportPort } from "@hakimi/platform";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact,
  type PreparedFileDeliveryResolution
} from "./prepared-file-delivery-dialog";
import {
  getPreparedFileDeliverySnapshot,
  resetPreparedFileDeliveryCoordinatorForTests
} from "./prepared-file-delivery-coordinator";

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
  beforeEach(() => {
    resetPreparedFileDeliveryCoordinatorForTests();
  });

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

    const dialog = screen.getByRole("dialog", { name: /待交付文件已在本机生成/ });
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByText(artifact.filename)).toBeTruthy();
    expect(screen.getByText("9 B")).toBeTruthy();
    expect(screen.getByText("Blob 已准备")).toBeTruthy();
    expect(screen.getByRole("button", { name: /保存到指定位置/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /下载文件/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /系统分享/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /保存到指定位置/ }));
    await waitFor(() => expect(saveFileToChosenLocation).toHaveBeenCalledWith(artifact.blob, artifact.filename));
    expect(await screen.findByText(/已由当前平台确认写入/, { selector: ".success-message" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(artifact.blob, artifact.filename));
    expect(await screen.findByText(/已请求浏览器下载/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.getByText(/请先核对下载列表和本机文件/)).toBeTruthy();
    expect(screen.queryByText(/请先在目标应用核对文件已接收/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "已核对，允许再次下载" }));

    await user.click(screen.getByRole("button", { name: /系统分享/ }));
    await waitFor(() => expect(shareFile).toHaveBeenCalledWith(artifact.blob, artifact.filename, artifact.title));
    expect(await screen.findByText(/已交给系统分享面板/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.getByText(/请先在目标应用核对文件已接收并可以打开/)).toBeTruthy();
    expect(screen.queryByText(/请先核对下载列表和本机文件/)).toBeNull();
    expect(screen.getByRole("button", { name: "已核对，允许再次分享" })).toBeTruthy();
    expect(screen.getByRole("dialog").getAttribute("data-retry-gate")).toBe("manual_file_check_required");

    expect(saveFileToChosenLocation.mock.calls[0]?.[0]).toBe(artifact.blob);
    expect(saveFile.mock.calls[0]?.[0]).toBe(artifact.blob);
    expect(shareFile.mock.calls[0]?.[0]).toBe(artifact.blob);
  });

  it.each<{
    label: string;
    intent: "chosen_location" | "download" | "share";
    buttonName: RegExp;
    result: FileDeliveryResult;
    expectedKind: PreparedFileDeliveryResolution["resolution"]["kind"];
  }>([
    {
      label: "completed",
      intent: "chosen_location",
      buttonName: /保存到指定位置/,
      result: {
        status: "saved",
        filename: artifact.filename,
        method: "file_system_access",
        bytesWritten: artifact.blob.size
      },
      expectedKind: "completed"
    },
    {
      label: "requested",
      intent: "download",
      buttonName: /下载文件/,
      result: {
        status: "download_requested",
        filename: artifact.filename,
        method: "browser_download"
      },
      expectedKind: "requested"
    },
    {
      label: "cancelled",
      intent: "share",
      buttonName: /系统分享/,
      result: {
        status: "cancelled",
        filename: artifact.filename,
        operation: "share"
      },
      expectedKind: "cancelled"
    }
  ])("只在 $label 回执完成状态门转换后回调一次精确工件和原始回执", async ({
    intent,
    buttonName,
    result,
    expectedKind
  }) => {
    const user = userEvent.setup();
    const delivery = createExportPort();
    if (intent === "chosen_location") {
      delivery.saveFileToChosenLocation.mockResolvedValueOnce(result as never);
    } else if (intent === "share") {
      delivery.shareFile.mockResolvedValueOnce(result as never);
    } else {
      delivery.saveFile.mockResolvedValueOnce(result as never);
    }
    const snapshots: Array<ReturnType<typeof getPreparedFileDeliverySnapshot>> = [];
    const onDeliveryResolution = vi.fn((event: PreparedFileDeliveryResolution) => {
      snapshots.push(getPreparedFileDeliverySnapshot());
      expect(event.artifact).toBe(artifact);
      expect(event.intent).toBe(intent);
      expect(event.result).toBe(result);
      expect(event.resolution.kind).toBe(expectedKind);
      expect(event.resolution.message).toContain(artifact.filename);
    });

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={delivery.port}
        onClose={vi.fn()}
        onDeliveryResolution={onDeliveryResolution}
      />
    );
    await user.click(screen.getByRole("button", { name: buttonName }));
    await waitFor(() => expect(onDeliveryResolution).toHaveBeenCalledTimes(1));

    const callbackSnapshot = snapshots[0];
    if (expectedKind === "requested") {
      expect(callbackSnapshot?.status).toBe("manual_check_required");
      if (callbackSnapshot?.status !== "manual_check_required") {
        throw new Error("requested 回调前未进入人工核对门禁");
      }
      expect(callbackSnapshot.issue.kind).toBe("requested");
      expect(callbackSnapshot.issue.operation.intent).toBe(intent);
      expect(callbackSnapshot.issue.operation.filename).toBe(artifact.filename);
      expect(callbackSnapshot.issue.operation.bytes).toBe(artifact.blob.size);
    } else {
      expect(callbackSnapshot?.status).toBe("idle");
    }
  });

  it("failed、unsupported、throw 及 filename/bytes/intent/malformed 校验失败均不触发结果回调", async () => {
    const cases: Array<{
      label: string;
      intent: "chosen_location" | "download" | "share";
      arrange(delivery: ReturnType<typeof createExportPort>): void;
    }> = [
      {
        label: "failed",
        intent: "share",
        arrange: ({ shareFile }) => shareFile.mockResolvedValueOnce({
          status: "failed",
          filename: artifact.filename,
          operation: "share",
          stage: "share",
          reason: "分享失败"
        })
      },
      {
        label: "unsupported",
        intent: "share",
        arrange: ({ shareFile }) => shareFile.mockResolvedValueOnce({
          status: "unsupported",
          filename: artifact.filename,
          operation: "share",
          reason: "分享不受支持"
        })
      },
      {
        label: "throw",
        intent: "download",
        arrange: ({ saveFile }) => saveFile.mockRejectedValueOnce(new Error("下载调用中断"))
      },
      {
        label: "filename mismatch",
        intent: "download",
        arrange: ({ saveFile }) => saveFile.mockResolvedValueOnce({
          status: "download_requested",
          filename: "other-file.md",
          method: "browser_download"
        })
      },
      {
        label: "bytes mismatch",
        intent: "chosen_location",
        arrange: ({ saveFileToChosenLocation }) => saveFileToChosenLocation.mockResolvedValueOnce({
          status: "saved",
          filename: artifact.filename,
          method: "file_system_access",
          bytesWritten: artifact.blob.size + 1
        })
      },
      {
        label: "intent mismatch",
        intent: "download",
        arrange: ({ saveFile }) => saveFile.mockResolvedValueOnce({
          status: "shared",
          filename: artifact.filename,
          method: "web_share"
        } as never)
      },
      {
        label: "malformed",
        intent: "download",
        arrange: ({ saveFile }) => saveFile.mockResolvedValueOnce(null as never)
      }
    ];

    for (const testCase of cases) {
      const user = userEvent.setup();
      const delivery = createExportPort();
      testCase.arrange(delivery);
      const onDeliveryResolution = vi.fn();
      const view = render(
        <PreparedFileDeliveryDialog
          artifact={artifact}
          exportPort={delivery.port}
          onClose={vi.fn()}
          onDeliveryResolution={onDeliveryResolution}
        />
      );
      const buttonName = testCase.intent === "chosen_location"
        ? /保存到指定位置/
        : testCase.intent === "share"
          ? /系统分享/
          : /下载文件/;
      const operationMock = testCase.intent === "chosen_location"
        ? delivery.saveFileToChosenLocation
        : testCase.intent === "share"
          ? delivery.shareFile
          : delivery.saveFile;
      await user.click(screen.getByRole("button", { name: buttonName }));
      await waitFor(() => expect(operationMock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getPreparedFileDeliverySnapshot().status).not.toBe("in_flight"));
      expect(onDeliveryResolution, testCase.label).not.toHaveBeenCalled();
      view.unmount();
      resetPreparedFileDeliveryCoordinatorForTests();
    }
  });

  it("回调抛错不会把 completed 或 requested 的已确认回执改写为外部交付不确定", async () => {
    const user = userEvent.setup();
    const delivery = createExportPort();
    const onDeliveryResolution = vi.fn(() => {
      throw new Error("consumer callback failure");
    });
    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={delivery.port}
        onClose={vi.fn()}
        onDeliveryResolution={onDeliveryResolution}
      />
    );

    await user.click(screen.getByRole("button", { name: /保存到指定位置/ }));
    expect(await screen.findByText(/已由当前平台确认写入/, { selector: ".success-message" })).toBeTruthy();
    expect(onDeliveryResolution).toHaveBeenCalledTimes(1);
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(screen.queryByText("不要直接重复交付")).toBeNull();

    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    expect(await screen.findByText(/已请求浏览器下载/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(onDeliveryResolution).toHaveBeenCalledTimes(2);
    const requestedSnapshot = getPreparedFileDeliverySnapshot();
    expect(requestedSnapshot.status).toBe("manual_check_required");
    if (requestedSnapshot.status !== "manual_check_required") {
      throw new Error("requested 回执未保留人工核对门禁");
    }
    expect(requestedSnapshot.issue.kind).toBe("requested");
    expect(screen.queryByText("不要直接重复交付")).toBeNull();
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

    const saveButton = screen.getByRole("button", { name: /保存到指定位置/ });
    await user.click(saveButton);
    expect(await screen.findByText(/未选择保存位置/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /本次交付已取消/ })).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(saveButton);
    await waitFor(() => expect(saveFileToChosenLocation).toHaveBeenCalledTimes(2));
    expect(saveFileToChosenLocation.mock.calls.every(([blob]) => blob === artifact.blob)).toBe(true);
    expect(await screen.findByText(/已由当前平台确认写入/, { selector: ".success-message" })).toBeTruthy();
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

    const shareButton = screen.getByRole("button", { name: /系统分享/ });
    await user.click(shareButton);
    expect(await screen.findByText(/已取消匿名双案例研究分享；/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();

    await user.click(shareButton);
    await waitFor(() => expect(shareFile).toHaveBeenCalledTimes(2));
    expect(shareFile.mock.calls.every(([blob]) => blob === artifact.blob)).toBe(true);
    expect(await screen.findByText(/已交给系统分享面板/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.getByText(/请先在目标应用核对文件已接收并可以打开/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "已核对，允许再次分享" })).toBeTruthy();
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

    await user.click(screen.getByRole("button", { name: /系统分享/ }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(result.reason);
    expect(shareFile).toHaveBeenCalledWith(artifact.blob, artifact.filename, artifact.title);
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();
  });

  it("畸形交付回执进入未知状态并阻止直接重试", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { port, saveFile } = createExportPort();
    saveFile.mockResolvedValueOnce({
      status: "download_requested",
      filename: "different-file.md",
      method: "browser_download"
    });

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={onClose}
      />
    );

    const downloadButton = screen.getByRole("button", { name: /下载文件/ });
    await user.click(downloadButton);

    expect(await screen.findByText("不要直接重复交付")).toBeTruthy();
    expect(screen.getByText(/回执的文件名与当前冻结工件不一致/)).toBeTruthy();
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("dialog").getAttribute("data-close-gate")).toBe("manual_check_required");
    expect((screen.getByRole("button", { name: "核对后关闭" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "我已核对，允许再次交付" }));
    expect((downloadButton as HTMLButtonElement).disabled).toBe(false);
    expect(saveFile).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("交付调用进行中消费 Escape，但不关闭对话框或解锁重复交付", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { port, saveFile } = createExportPort();
    let resolveDownload!: (result: Awaited<ReturnType<ReportExportPort["saveFile"]>>) => void;
    saveFile.mockReturnValueOnce(new Promise((resolve) => {
      resolveDownload = resolve;
    }));

    render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={port}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    });

    expect(document.dispatchEvent(escape)).toBe(false);
    expect(escape.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /正在交付本机文件/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /正在请求下载/ }) as HTMLButtonElement).disabled).toBe(true);

    resolveDownload({
      status: "download_requested",
      filename: artifact.filename,
      method: "browser_download"
    });
    expect(await screen.findByText(/已请求浏览器下载/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(screen.getByRole("dialog").getAttribute("data-close-gate")).toBe("manual_check_required");
    expect((screen.getByRole("button", { name: "核对后关闭" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "已核对，允许再次下载" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("路由卸载后保留旧交付门禁，并由迟到回执转入人工核对", async () => {
    const user = userEvent.setup();
    const oldClose = vi.fn();
    const nextClose = vi.fn();
    const oldResolution = vi.fn();
    const nextResolution = vi.fn();
    const oldPort = createExportPort();
    const nextPort = createExportPort();
    let resolveOldDownload!: (result: Awaited<ReturnType<ReportExportPort["saveFile"]>>) => void;
    oldPort.saveFile.mockReturnValueOnce(new Promise((resolve) => {
      resolveOldDownload = resolve;
    }));
    const nextArtifact: PreparedFileArtifact = {
      ...artifact,
      // Same metadata and byte length, but a different frozen Blob/content.
      blob: new Blob(["next-file"], { type: artifact.blob.type })
    };

    const firstView = render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={oldPort.port}
        onClose={oldClose}
        onDeliveryResolution={oldResolution}
      />
    );

    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(oldPort.saveFile).toHaveBeenCalledTimes(1));
    firstView.unmount();
    const inFlightExit = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(inFlightExit)).toBe(false);
    expect(inFlightExit.defaultPrevented).toBe(true);

    render(
      <PreparedFileDeliveryDialog
        artifact={nextArtifact}
        exportPort={nextPort.port}
        onClose={nextClose}
        onDeliveryResolution={nextResolution}
      />
    );

    const remountedDialog = screen.getByRole("dialog", { name: /上一份本机文件仍在交付中/ });
    const nextDownloadButton = screen.getByRole("button", { name: /正在请求下载/ });
    expect(remountedDialog.getAttribute("data-delivery-coordinator")).toBe("page-runtime-shared");
    expect(remountedDialog.getAttribute("data-delivery-scope")).toBe("previous_artifact");
    expect(remountedDialog.getAttribute("data-close-gate")).toBe("delivery_in_flight");
    expect((nextDownloadButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/当前门禁来自上一份本机工件/).textContent).toContain(artifact.filename);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nextClose).not.toHaveBeenCalled();
    expect(nextPort.saveFile).not.toHaveBeenCalled();

    resolveOldDownload({
      status: "download_requested",
      filename: artifact.filename,
      method: "browser_download"
    });

    expect(await screen.findByText(/已请求浏览器下载/, { selector: ".prepared-delivery-feedback" })).toBeTruthy();
    expect(remountedDialog.getAttribute("data-retry-gate")).toBe("manual_file_check_required");
    expect(remountedDialog.getAttribute("data-close-gate")).toBe("manual_check_required");
    expect(remountedDialog.getAttribute("data-delivery-scope")).toBe("previous_artifact");
    expect((screen.getByRole("button", { name: "已核对，允许再次下载" }) as HTMLButtonElement).disabled).toBe(false);
    expect(oldResolution).not.toHaveBeenCalled();
    expect(nextResolution).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nextClose).not.toHaveBeenCalled();
    const manualCheckExit = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(manualCheckExit)).toBe(false);
    expect(manualCheckExit.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "已核对，允许再次下载" }));
    expect(remountedDialog.getAttribute("data-retry-gate")).toBe("open");
    expect(remountedDialog.getAttribute("data-close-gate")).toBe("open");
    expect((screen.getByRole("button", { name: /下载文件/ }) as HTMLButtonElement).disabled).toBe(false);
    const reconciledExit = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(reconciledExit)).toBe(true);
    expect(reconciledExit.defaultPrevented).toBe(false);
  });

  it("同一视图切换到新 artifact generation 后不向当前回调发布旧工件的迟到完成回执", async () => {
    const user = userEvent.setup();
    const delivery = createExportPort();
    const onDeliveryResolution = vi.fn();
    let resolveOldSave!: (result: Awaited<ReturnType<ReportExportPort["saveFileToChosenLocation"]>>) => void;
    delivery.saveFileToChosenLocation.mockReturnValueOnce(new Promise((resolve) => {
      resolveOldSave = resolve;
    }));
    const nextArtifact: PreparedFileArtifact = {
      ...artifact,
      blob: new Blob(["next-generation"], { type: artifact.blob.type }),
      filename: "pair-study-next.md"
    };
    const view = render(
      <PreparedFileDeliveryDialog
        artifact={artifact}
        exportPort={delivery.port}
        onClose={vi.fn()}
        onDeliveryResolution={onDeliveryResolution}
      />
    );

    await user.click(screen.getByRole("button", { name: /保存到指定位置/ }));
    await waitFor(() => expect(delivery.saveFileToChosenLocation).toHaveBeenCalledTimes(1));
    view.rerender(
      <PreparedFileDeliveryDialog
        artifact={nextArtifact}
        exportPort={delivery.port}
        onClose={vi.fn()}
        onDeliveryResolution={onDeliveryResolution}
      />
    );
    resolveOldSave({
      status: "saved",
      filename: artifact.filename,
      method: "file_system_access",
      bytesWritten: artifact.blob.size
    });

    await waitFor(() => expect(getPreparedFileDeliverySnapshot().status).toBe("idle"));
    expect(onDeliveryResolution).not.toHaveBeenCalled();
    expect(screen.getByText(nextArtifact.filename)).toBeTruthy();
    expect(screen.queryByText(/已由当前平台确认写入/, { selector: ".success-message" })).toBeNull();
  });

  it("路由卸载后的迟到异常仍进入全局未知门禁", async () => {
    const user = userEvent.setup();
    const oldPort = createExportPort();
    const nextPort = createExportPort();
    let rejectOldDownload!: (reason?: unknown) => void;
    oldPort.saveFile.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectOldDownload = reject;
    }));
    const nextArtifact: PreparedFileArtifact = {
      ...artifact,
      blob: new Blob(["next-file"], { type: artifact.blob.type })
    };

    const firstView = render(
      <PreparedFileDeliveryDialog artifact={artifact} exportPort={oldPort.port} onClose={vi.fn()} />
    );
    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(oldPort.saveFile).toHaveBeenCalledTimes(1));
    firstView.unmount();
    render(
      <PreparedFileDeliveryDialog artifact={nextArtifact} exportPort={nextPort.port} onClose={vi.fn()} />
    );

    rejectOldDownload(new Error("系统交付通道中断"));

    expect(await screen.findByText("不要直接重复交付")).toBeTruthy();
    expect(screen.getByText(/系统交付通道中断/)).toBeTruthy();
    const remountedDialog = screen.getByRole("dialog");
    expect(remountedDialog.getAttribute("data-delivery-scope")).toBe("previous_artifact");
    expect(remountedDialog.getAttribute("data-retry-gate")).toBe("uncertain_delivery_acknowledgement_required");
    expect(remountedDialog.getAttribute("data-close-gate")).toBe("manual_check_required");
    expect(nextPort.saveFile).not.toHaveBeenCalled();
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
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: /待交付文件已在本机生成/ }));
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

    expect(screen.queryByRole("button", { name: /保存到指定位置/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /系统分享/ })).toBeNull();
    expect(screen.getByRole("button", { name: /下载文件/ })).toBeTruthy();
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

    expect(screen.queryByRole("button", { name: /系统分享/ })).toBeNull();
    expect(screen.queryByText(/不支持文件系统分享/)).toBeNull();
    expect(screen.getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
  });
});
