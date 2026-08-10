import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OrphanedV13RecoveryPage,
  type OrphanedV13BackupCapture,
  type OrphanedV13RecoveryState
} from "./orphaned-v13-recovery-page";

const mocks = vi.hoisted(() => ({
  saveBlobFile: vi.fn(),
  saveTextFile: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  saveBlobFile: mocks.saveBlobFile,
  saveTextFile: mocks.saveTextFile
}));

const orphanedState: OrphanedV13RecoveryState = {
  kind: "orphaned_v13",
  reasonCode: "ORPHANED_V13_WITHOUT_CONTROL",
  sourceDatabaseName: "hakimi-bazi-research-v13",
  nativeVersion: 130,
  inventory: [
    { name: "hakimi-bazi-research-v13", version: 130 }
  ]
};

const ambiguousState: OrphanedV13RecoveryState = {
  kind: "ambiguous",
  reasonCode: "AMBIGUOUS_DATABASE_LINEAGE",
  inventory: [
    { name: "hakimi-bazi-research-v13", version: 130 },
    { name: "hakimi-bazi-research-v15", version: 150 }
  ]
};

function backupCapture(): OrphanedV13BackupCapture {
  const blob = new Blob([new Uint8Array([80, 75, 3, 4])], { type: "application/zip" });
  return {
    blob,
    payloadDigest: "8b7e41c6c8f70b3db8fbc39173a6ca15299b980809ac3230f60b8f2d52a9751d",
    outputByteLength: blob.size,
    canonicalJsonByteLength: 2048,
    capturedAt: "2026-08-03T08:30:00.000Z"
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
});

describe("OrphanedV13RecoveryPage", () => {
  it("提供可访问的独立救援壳，且没有普通导航或危险操作入口", () => {
    render(<OrphanedV13RecoveryPage state={orphanedState} captureBackup={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "检测到未登记的 v13 本地数据库" })).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
    const links = screen.getAllByRole<HTMLAnchorElement>("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("#main-content");
    expect(screen.queryByRole("navigation")).toBeNull();

    expect(screen.getByRole("button", { name: "下载不含用户资料的诊断 JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成并下载只读完整备份 ZIP" })).toBeTruthy();
    for (const forbiddenLabel of ["导入", "恢复", "编辑", "删除", "继续升级", "进入工作台"]) {
      expect(screen.queryByRole("button", { name: new RegExp(forbiddenLabel) })).toBeNull();
      expect(screen.queryByRole("link", { name: new RegExp(forbiddenLabel) })).toBeNull();
    }
  });

  it("状态有歧义时只开放不含用户资料的诊断", () => {
    const captureBackup = vi.fn();
    render(<OrphanedV13RecoveryPage state={ambiguousState} captureBackup={captureBackup} />);

    expect(screen.getByRole("heading", { level: 1, name: "本地数据库状态无法安全判定" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "下载不含用户资料的诊断 JSON" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /完整备份 ZIP/ })).toBeNull();
    expect(captureBackup).not.toHaveBeenCalled();
  });

  it("诊断 JSON 只写入允许的清洗字段，不泄漏运行时附加资料", async () => {
    const stateWithUnexpectedRuntimeFields = ({
      ...orphanedState,
      inventory: [{
        name: "hakimi-bazi-research-v13",
        version: 130,
        caseAlias: "不应进入诊断",
        recordCount: 42
      }]
    } as unknown) as OrphanedV13RecoveryState;
    render(<OrphanedV13RecoveryPage state={stateWithUnexpectedRuntimeFields} captureBackup={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "下载不含用户资料的诊断 JSON" }));

    await waitFor(() => expect(mocks.saveTextFile).toHaveBeenCalledTimes(1));
    const [filename, raw, mediaType] = mocks.saveTextFile.mock.calls[0] as [string, string, string];
    expect(filename).toMatch(/^hakimi-v13-recovery-diagnostic-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    const diagnostic = JSON.parse(raw);
    expect(diagnostic).toMatchObject({
      format: "hakimi-orphaned-v13-recovery-diagnostic",
      formatVersion: "1.0.0",
      containsUserResearchData: false,
      recoveryState: "orphaned_v13",
      reasonCode: "ORPHANED_V13_WITHOUT_CONTROL",
      inventory: [{ name: "hakimi-bazi-research-v13", version: 130 }],
      source: { databaseName: "hakimi-bazi-research-v13", nativeVersion: 130 },
      safetyBoundary: {
        readOnlyBackupAvailable: true,
        normalNavigationAvailable: false,
        importAvailable: false,
        restoreAvailable: false,
        editAvailable: false,
        deleteAvailable: false,
        upgradeAvailable: false
      }
    });
    expect(raw).not.toContain("不应进入诊断");
    expect(raw).not.toContain("caseAlias");
    expect(raw).not.toContain("recordCount");
  });

  it("从同一个只读捕获结果下载 ZIP 并展示核验元数据", async () => {
    const capture = backupCapture();
    const captureBackup = vi.fn().mockResolvedValue(capture);
    render(<OrphanedV13RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成并下载只读完整备份 ZIP" }));

    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    expect(captureBackup).toHaveBeenCalledTimes(1);
    const [filename, blob] = mocks.saveBlobFile.mock.calls[0] as [string, Blob];
    expect(filename).toMatch(/^hakimi-v13-read-only-full-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(blob).toBe(capture.blob);
    expect(await screen.findByText("只读完整备份已交给保存流程")).toBeTruthy();
    expect(screen.getByText(/8b7e41c6c8f70b3db8fbc39173a6ca15299b980809ac3230f60b8f2d52a9751d/)).toBeTruthy();
    expect(screen.getByText(/ZIP 4 字节，规范 JSON 2048 字节/)).toBeTruthy();
  });

  it("用户取消保存时不声称备份成功", async () => {
    mocks.saveBlobFile.mockResolvedValueOnce({
      status: "cancelled",
      filename: "hakimi-v13-read-only-full-backup-2026-08-03.zip",
      operation: "save"
    });
    render(
      <OrphanedV13RecoveryPage
        state={orphanedState}
        captureBackup={vi.fn().mockResolvedValue(backupCapture())}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成并下载只读完整备份 ZIP" }));

    expect(await screen.findByText("已取消只读完整备份下载")).toBeTruthy();
    expect(screen.queryByText("只读完整备份已交给保存流程")).toBeNull();
  });

  it("只读捕获失败时显示错误且不会调用下载端口", async () => {
    const captureBackup = vi.fn().mockRejectedValue(new Error("v13 只读快照验真失败"));
    render(<OrphanedV13RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成并下载只读完整备份 ZIP" }));

    expect(await screen.findByText("只读完整备份未能生成或下载")).toBeTruthy();
    expect(screen.getByText(/v13 只读快照验真失败/)).toBeTruthy();
    expect(mocks.saveBlobFile).not.toHaveBeenCalled();
  });

  it("下载端口返回失败时显示错误且不会显示成功状态", async () => {
    mocks.saveTextFile.mockResolvedValueOnce({
      status: "failed",
      filename: "hakimi-v13-recovery-diagnostic-2026-08-03.json",
      operation: "save",
      reason: "浏览器拒绝了文件下载"
    });
    render(<OrphanedV13RecoveryPage state={ambiguousState} captureBackup={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "下载不含用户资料的诊断 JSON" }));

    expect(await screen.findByText("诊断文件未能下载")).toBeTruthy();
    expect(screen.getByText("浏览器拒绝了文件下载")).toBeTruthy();
    expect(screen.queryByText("诊断文件已交给保存流程")).toBeNull();
  });
});
