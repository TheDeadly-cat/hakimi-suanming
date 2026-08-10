import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppBootFailure } from "../lib/app-boot-failure";
import { BootFailureRecoveryPage } from "./boot-failure-recovery-page";

const mocks = vi.hoisted(() => ({
  caseRepository: { kind: "case-repository" },
  createFullBackup: vi.fn(),
  createFullBackupArchive: vi.fn(),
  saveBlobFile: vi.fn(),
  saveTextFile: vi.fn()
}));

vi.mock("@hakimi/backup", () => ({
  createFullBackup: mocks.createFullBackup,
  createFullBackupArchive: mocks.createFullBackupArchive
}));

vi.mock("@hakimi/platform", () => ({
  saveBlobFile: mocks.saveBlobFile,
  saveTextFile: mocks.saveTextFile
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: mocks.caseRepository
}));

function bootFailure(storageReady: boolean): AppBootFailure {
  return {
    storageReady,
    source: "calculation",
    error: new TypeError("calculation failed")
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.saveBlobFile.mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  mocks.saveTextFile.mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  mocks.createFullBackup.mockResolvedValue({ manifest: { formatVersion: "1.0.0" } });
  mocks.createFullBackupArchive.mockReturnValue(new Uint8Array([80, 75, 3, 4]));
  delete document.documentElement.dataset.appBootReady;
  delete document.documentElement.dataset.swBootSignalSent;
});

describe("BootFailureRecoveryPage", () => {
  it("诊断出口只下载最小环境信息，不读取研究数据库", async () => {
    render(<BootFailureRecoveryPage failure={bootFailure(true)} view="diagnostic" />);

    fireEvent.click(screen.getByRole("button", { name: "导出启动诊断 JSON" }));

    await waitFor(() => expect(mocks.saveTextFile).toHaveBeenCalledTimes(1));
    expect(mocks.createFullBackup).not.toHaveBeenCalled();
    const [filename, raw, mediaType] = mocks.saveTextFile.mock.calls[0] as [string, string, string];
    expect(filename).toMatch(/^hakimi-boot-failure-diagnostic-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    const diagnostic = JSON.parse(raw);
    expect(diagnostic).toMatchObject({
      format: "hakimi-boot-failure-diagnostic",
      formatVersion: "1.0.0",
      containsUserResearchData: false,
      readiness: { storageReadinessConfirmed: true },
      failure: {
        source: "calculation",
        errorName: "TypeError",
        messageCode: "HAKIMI_BOOT_CALCULATION",
        message: "The deterministic calculation smoke test did not pass."
      }
    });
    expect(diagnostic).not.toHaveProperty("records");
    expect(diagnostic).not.toHaveProperty("recordCounts");
    expect(raw).not.toContain("caseId");
    expect(raw).not.toContain("calculation failed");
  });

  it("存储探针未通过时不允许再次打开数据库生成备份", () => {
    render(<BootFailureRecoveryPage failure={bootFailure(false)} view="backup" />);

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "导出只读完整备份 ZIP" });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mocks.createFullBackup).not.toHaveBeenCalled();
  });

  it("存储探针已通过时只调用完整备份读取与下载端口", async () => {
    render(<BootFailureRecoveryPage failure={bootFailure(true)} view="backup" />);

    fireEvent.click(screen.getByRole("button", { name: "导出只读完整备份 ZIP" }));

    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    expect(mocks.createFullBackup).toHaveBeenCalledTimes(1);
    expect(mocks.createFullBackup.mock.calls[0]?.[0]).toBe(mocks.caseRepository);
    expect(mocks.createFullBackupArchive).toHaveBeenCalledTimes(1);
    const [filename, blob] = mocks.saveBlobFile.mock.calls[0] as [string, Blob];
    expect(filename).toMatch(/^hakimi-boot-failure-safety-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(blob.type).toBe("application/zip");
  });

  it("用户取消只读备份保存时不显示成功", async () => {
    mocks.saveBlobFile.mockResolvedValueOnce({
      status: "cancelled",
      filename: "hakimi-boot-failure-safety-backup-2026-08-03.zip",
      operation: "save"
    });
    render(<BootFailureRecoveryPage failure={bootFailure(true)} view="backup" />);

    fireEvent.click(screen.getByRole("button", { name: "导出只读完整备份 ZIP" }));

    expect(await screen.findByText("已取消只读安全备份导出")).toBeTruthy();
    expect(screen.queryByText("只读安全备份已交付")).toBeNull();
  });
});
