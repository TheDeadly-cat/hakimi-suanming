import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  SCHEMA_VERSION,
  type LocalAppSettingsRecord
} from "@hakimi/contracts";
import { AppShell } from "../components/app-shell";
import { LocalAppSettingsProvider } from "../lib/local-app-settings";
import { DataManagementPage } from "./data-management-page";

const mocks = vi.hoisted(() => ({
  readFullDataSnapshot: vi.fn(),
  readResearcherProfile: vi.fn(),
  readAppSettings: vi.fn(),
  listAttachments: vi.fn(),
  saveResearcherProfile: vi.fn(),
  saveAppSettings: vi.fn(),
  createAttachment: vi.fn(),
  readAttachmentBytes: vi.fn(),
  deleteAttachment: vi.fn(),
  clearAll: vi.fn(),
  applyVerifiedFullBackup: vi.fn(),
  preflightCoreBackup: vi.fn(),
  createFullBackupArtifactOffMainThread: vi.fn(),
  archiveFullBackupEnvelopeOffMainThread: vi.fn(),
  prepareFullBackupImportOffMainThread: vi.fn(),
  verifyPreparedFullBackupOffMainThread: vi.fn(),
  inspectFullBackupSnapshotOffMainThread: vi.fn(),
  assessStorageCapacity: vi.fn(),
  pickFile: vi.fn(),
  saveBlobFile: vi.fn(),
  clearControlledWindowResearchQueryDrafts: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: {
    readFullDataSnapshot: mocks.readFullDataSnapshot,
    readResearcherProfile: mocks.readResearcherProfile,
    readAppSettings: mocks.readAppSettings,
    listAttachments: mocks.listAttachments,
    saveResearcherProfile: mocks.saveResearcherProfile,
    saveAppSettings: mocks.saveAppSettings,
    createAttachment: mocks.createAttachment,
    readAttachmentBytes: mocks.readAttachmentBytes,
    deleteAttachment: mocks.deleteAttachment,
    clearAll: mocks.clearAll
  }
}));

vi.mock("@hakimi/backup", () => ({
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES: 120 * 1024 * 1024,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES: 160 * 1024 * 1024,
  applyVerifiedFullBackup: mocks.applyVerifiedFullBackup,
  preflightCoreBackup: mocks.preflightCoreBackup
}));

vi.mock("../lib/full-backup-worker-client", () => ({
  createFullBackupArtifactOffMainThread: mocks.createFullBackupArtifactOffMainThread,
  archiveFullBackupEnvelopeOffMainThread: mocks.archiveFullBackupEnvelopeOffMainThread,
  prepareFullBackupImportOffMainThread: mocks.prepareFullBackupImportOffMainThread,
  verifyPreparedFullBackupOffMainThread: mocks.verifyPreparedFullBackupOffMainThread,
  inspectFullBackupSnapshotOffMainThread: mocks.inspectFullBackupSnapshotOffMainThread
}));

vi.mock("../lib/storage-capacity-gate", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/storage-capacity-gate")>(),
  assessStorageCapacity: mocks.assessStorageCapacity
}));

vi.mock("@hakimi/platform", () => ({
  pickFile: mocks.pickFile,
  saveBlobFile: mocks.saveBlobFile,
  decodeUtf8Blob: async (blob: Blob) => blob.text()
}));

vi.mock("../lib/local-user-data-cleanup", () => ({
  clearControlledWindowResearchQueryDrafts: mocks.clearControlledWindowResearchQueryDrafts
}));

const partitionCounts = {
  cases: 1,
  revisions: 2,
  candidateSets: 3,
  researchNotes: 4,
  events: 5,
  savedViews: 6,
  knowledgeDocuments: 7,
  citations: 8,
  sourceRights: 9,
  researcherProfiles: 1,
  appSettings: 1,
  attachments: 2,
  ruleRegistry: 2,
  tzdbMigrationReceipts: 1,
  eventTimeMigrationReceipts: 2,
  revisionCalculationReceipts: 3
};

const snapshot = {
  cases: [{}],
  revisions: [{}, {}],
  candidateSets: [{}, {}, {}],
  researchNotes: [{}, {}, {}, {}],
  events: [{}, {}, {}, {}, {}],
  savedViews: [{}, {}, {}, {}, {}, {}],
  knowledgeDocuments: Array.from({ length: 7 }, () => ({})),
  citations: Array.from({ length: 8 }, () => ({})),
  sourceRights: Array.from({ length: 9 }, () => ({})),
  ruleRegistry: [{}, {}],
  tzdbMigrationReceipts: [{}],
  eventTimeMigrationReceipts: [{}, {}],
  revisionCalculationReceipts: [{}, {}, {}]
};

const comfortableSettingsRecord: LocalAppSettingsRecord = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
  recordType: "local_app_settings",
  id: LOCAL_APP_SETTINGS_ID,
  locale: "zh-CN",
  defaultTimeZone: "Asia/Shanghai",
  defaultCalendarType: "gregorian",
  preferredDensity: "comfortable",
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z"
};

const manifest = (counts = partitionCounts) => ({
  formatVersion: "1.2.0",
  appVersion: "0.2.0-p0",
  exportedAt: "2026-08-02T00:00:00.000Z",
  counts
});

const preparation = {
  incoming: {
    manifest: manifest({ ...partitionCounts, cases: 4, attachments: 3 }),
    migratedFromFormatVersion: "0.6.0"
  },
  currentSafetyBackup: {
    manifest: manifest(),
    payload: {},
    digests: { payload: "d".repeat(64) }
  }
};

const admittedPlan = {
  policyVersion: 1,
  operation: "full_restore",
  payloadDigest: "c".repeat(64),
  checkedAt: "2026-08-03T00:00:00.000Z",
  state: "admitted",
  reason: "CAPACITY_AVAILABLE",
  logicalPayloadBytes: 4096,
  estimatedPersistedPayloadBytes: 5120,
  rollbackReserveBytes: 5120,
  fixedHeadroomBytes: 32 * 1024 * 1024,
  usageBytes: 1024,
  quotaBytes: 1024 * 1024 * 1024,
  availableBytes: 1024 * 1024 * 1024 - 1024,
  requiredAdditionalBytes: 32 * 1024 * 1024 + 10240,
  admissionToken: "admitted"
} as const;

const insufficientPlan = {
  ...admittedPlan,
  state: "insufficient",
  reason: "CAPACITY_INSUFFICIENT",
  availableBytes: 1024,
  admissionToken: null
} as const;

const verifiedReplacement = {
  incoming: preparation.incoming,
  expectedCurrentPayloadDigest: preparation.currentSafetyBackup.digests.payload
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.saveBlobFile.mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  mocks.clearControlledWindowResearchQueryDrafts.mockResolvedValue({
    mode: "controlled_windows",
    complete: true,
    reason: "ALL_CONTROLLED_WINDOWS_CLEARED",
    requestedClientCount: 2,
    acknowledgedClientCount: 2,
    clearedClientCount: 2,
    matchedDraftCount: 3,
    removedDraftCount: 3,
    failedDraftCount: 0,
    failedClients: []
  });
  mocks.readFullDataSnapshot.mockResolvedValue(snapshot);
  mocks.readResearcherProfile.mockResolvedValue({
    displayName: "研究者甲",
    organization: "本地研究室",
    researchFocus: "子平法源流"
  });
  mocks.readAppSettings.mockResolvedValue({
    defaultTimeZone: "Asia/Shanghai",
    defaultCalendarType: "gregorian",
    preferredDensity: "comfortable"
  });
  mocks.listAttachments.mockResolvedValue([
    {
      id: "attachment-1",
      fileName: "原始材料.pdf",
      mediaType: "application/pdf",
      byteLength: 1024,
      description: "访谈材料",
      contentHash: "a".repeat(64),
      createdAt: "2026-08-02T00:00:00.000Z",
      link: null
    },
    {
      id: "attachment-2",
      fileName: "校时照片.png",
      mediaType: "image/png",
      byteLength: 2048,
      description: "",
      contentHash: "b".repeat(64),
      createdAt: "2026-08-02T00:00:00.000Z",
      link: null
    }
  ]);
  const artifact = {
    output: "zip",
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" }),
    outputByteLength: 3,
    canonicalJsonByteLength: 4096,
    payloadDigest: "c".repeat(64)
  };
  mocks.createFullBackupArtifactOffMainThread.mockResolvedValue(artifact);
  mocks.archiveFullBackupEnvelopeOffMainThread.mockResolvedValue(artifact);
  mocks.prepareFullBackupImportOffMainThread.mockResolvedValue({
    preparation,
    sourceContainer: "json",
    sourceByteLength: 4096,
    decodedJsonByteLength: 4096,
    canonicalJsonByteLength: 4096,
    payloadDigest: admittedPlan.payloadDigest
  });
  mocks.verifyPreparedFullBackupOffMainThread.mockResolvedValue({ verified: verifiedReplacement });
  mocks.applyVerifiedFullBackup.mockResolvedValue({
    manifest: manifest(),
    migratedFromFormatVersion: "0.6.0",
    payload: { appSettings: [comfortableSettingsRecord] }
  });
  mocks.inspectFullBackupSnapshotOffMainThread.mockResolvedValue({
    payloadDigest: preparation.currentSafetyBackup.digests.payload,
    canonicalJsonByteLength: 4096
  });
  mocks.assessStorageCapacity.mockResolvedValue(admittedPlan);
});

describe("DataManagementPage", () => {
  it("显示十六分区、未加密警告、资料偏好、附件和最后的完整危险区", async () => {
    render(<DataManagementPage />);

    expect(await screen.findByRole("heading", { name: "此浏览器中的十六个用户数据分区" })).toBeTruthy();
    for (const label of [
      "命盘案例", "命盘修订", "未知时辰候选组", "研究笔记", "事件", "保存视图",
      "用户文献", "结构化引用", "来源权利记录", "研究者资料", "应用设置", "附件", "规则包仓库", "候选组时区并列复算凭证", "事件时间迁移凭证", "Revision 计算收据"
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("备份是未加密的敏感明文")).toBeTruthy();
    expect(screen.getByRole("button", { name: "导出完整 ZIP" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "导出兼容 JSON" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "研究者资料" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "本机研究偏好" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "附件库" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "永久删除此浏览器中的全部十六分区数据" })).toBeTruthy();
    expect(screen.getByText(/规则包仓库、活动选择器、两类时间迁移凭证与 Revision 计算收据/)).toBeTruthy();
    expect(screen.getByText(/请求当前所有受控标签页删除本应用的临时检索草稿；没有返回确认的标签页会单独列出/)).toBeTruthy();
    expect(screen.getByText("旧版 core 备份兼容检查")).toBeTruthy();
  });

  it("全量恢复显示十六分区差异，重复安全下载会重置两个显式确认", async () => {
    mocks.readAppSettings
      .mockResolvedValueOnce(comfortableSettingsRecord)
      .mockResolvedValue({
        ...comfortableSettingsRecord,
        defaultTimeZone: "America/New_York",
        defaultCalendarType: "lunar",
        preferredDensity: "compact"
      });
    mocks.pickFile.mockResolvedValueOnce({
      name: "incoming.json",
      size: 4096,
      type: "application/json",
      blob: new Blob(["{}"], { type: "application/json" })
    });
    const view = render(
      <LocalAppSettingsProvider loadSettings={async () => comfortableSettingsRecord}>
        <AppShell pathname="/settings/data">
          <DataManagementPage />
        </AppShell>
      </LocalAppSettingsProvider>
    );
    await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    expect(await screen.findByRole(
      "heading",
      { name: "预检通过，尚未写入" },
      { timeout: 5_000 }
    )).toBeTruthy();
    expect(mocks.pickFile).toHaveBeenCalledWith(expect.objectContaining({
      maxBytes: 160 * 1024 * 1024
    }));
    expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenCalledWith(
      expect.any(Blob),
      snapshot,
      expect.objectContaining({ appVersion: expect.any(String) })
    );
    expect(screen.getAllByText("命盘案例").length).toBeGreaterThan(0);
    const restoreButton = screen.getByRole("button", { name: "确认替换并恢复" });
    expect(restoreButton).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    const safetyConfirmation = screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/);
    const replacementConfirmation = screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
    fireEvent.click(safetyConfirmation);
    fireEvent.click(replacementConfirmation);
    expect(restoreButton).toHaveProperty("disabled", false);

    fireEvent.click(screen.getByRole("button", { name: "重新下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(2));
    expect(safetyConfirmation).toHaveProperty("checked", false);
    expect(replacementConfirmation).toHaveProperty("checked", false);
    expect(restoreButton).toHaveProperty("disabled", true);

    fireEvent.click(safetyConfirmation);
    fireEvent.click(replacementConfirmation);
    fireEvent.click(restoreButton);
    const success = await screen.findByText("完整恢复成功");
    await waitFor(() => expect(success.parentElement).toBe(document.activeElement));
    expect(mocks.verifyPreparedFullBackupOffMainThread).toHaveBeenCalledWith(preparation);
    expect(mocks.applyVerifiedFullBackup).toHaveBeenCalledWith(expect.anything(), verifiedReplacement);
    await waitFor(() => expect(view.container.querySelector(".app-shell")?.getAttribute("data-density")).toBe("compact"));
    expect(screen.getByDisplayValue("America/New_York")).toBeTruthy();
  });

  it("安全备份取消时保持恢复锁定且不冒充已下载", async () => {
    mocks.pickFile.mockResolvedValueOnce({
      name: "incoming.json",
      size: 4096,
      type: "application/json",
      blob: new Blob(["{}"], { type: "application/json" })
    });
    mocks.saveBlobFile.mockResolvedValueOnce({
      status: "cancelled",
      filename: "hakimi-before-restore-2026-08-03.zip",
      operation: "save"
    });
    render(<DataManagementPage />);
    await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));

    expect(await screen.findByText("已取消安全备份导出")).toBeTruthy();
    expect(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/)).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/)).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "确认替换并恢复" })).toHaveProperty("disabled", true);
    expect(mocks.applyVerifiedFullBackup).not.toHaveBeenCalled();
  });

  it("容量初筛不足时保留只读差异但不解锁恢复写入", async () => {
    mocks.assessStorageCapacity.mockResolvedValue(insufficientPlan);
    mocks.pickFile.mockResolvedValueOnce({
      name: "too-large.zip",
      size: 4096,
      type: "application/zip",
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" })
    });
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" }));

    expect(await screen.findByText("容量准入未通过：可用空间不足")).toBeTruthy();
    expect(screen.getByText(/浏览器报告可用 1.0 KiB/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/)).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "确认替换并恢复" })).toHaveProperty("disabled", true);
    expect(mocks.verifyPreparedFullBackupOffMainThread).not.toHaveBeenCalled();
    expect(mocks.applyVerifiedFullBackup).not.toHaveBeenCalled();
  });

  it("提交前二次容量估值下降时零写入并撤销替换确认", async () => {
    mocks.assessStorageCapacity
      .mockResolvedValueOnce(admittedPlan)
      .mockResolvedValueOnce(insufficientPlan);
    mocks.pickFile.mockResolvedValueOnce({
      name: "capacity-race.json",
      size: 4096,
      type: "application/json",
      blob: new Blob(["{}"], { type: "application/json" })
    });
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
    const replacement = screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
    fireEvent.click(replacement);
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("提交前容量准入未通过")).toBeTruthy();
    expect(replacement).toHaveProperty("checked", false);
    expect(mocks.verifyPreparedFullBackupOffMainThread).not.toHaveBeenCalled();
    expect(mocks.applyVerifiedFullBackup).not.toHaveBeenCalled();
  });

  it("实际写入仍遇到 QuotaExceeded 时核对回滚摘要并保持待恢复状态", async () => {
    const quota = new DOMException("quota", "QuotaExceededError");
    mocks.applyVerifiedFullBackup.mockRejectedValueOnce({ inner: quota });
    mocks.pickFile.mockResolvedValueOnce({
      name: "quota-race.zip",
      size: 4096,
      type: "application/zip",
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" })
    });
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
    fireEvent.click(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/));
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("浏览器配额不足，恢复事务已中止")).toBeTruthy();
    expect(screen.getByText(/已重新核对当前十六分区摘要与安全备份一致/)).toBeTruthy();
    expect(mocks.inspectFullBackupSnapshotOffMainThread).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "预检通过，尚未写入" })).toBeTruthy();
    expect(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/)).toHaveProperty("checked", false);
  });

  it("保存研究者资料、本机偏好和 10 MiB 附件入口", async () => {
    mocks.saveAppSettings.mockImplementationOnce(async (settings: {
      defaultTimeZone: string;
      defaultCalendarType: "gregorian" | "lunar";
      preferredDensity: "comfortable" | "compact";
    }) => {
      mocks.readAppSettings.mockResolvedValue({ ...comfortableSettingsRecord, ...settings });
    });
    mocks.pickFile.mockResolvedValueOnce({
      name: "证据.txt",
      size: 4,
      type: "Text/Plain; Charset=UTF-8",
      blob: new Blob(["证据"], { type: "text/plain" })
    });
    const view = render(
      <LocalAppSettingsProvider loadSettings={async () => comfortableSettingsRecord}>
        <AppShell pathname="/settings/data">
          <DataManagementPage />
        </AppShell>
      </LocalAppSettingsProvider>
    );
    await screen.findByDisplayValue("研究者甲");
    expect(view.container.querySelector(".app-shell")?.getAttribute("data-density")).toBe("comfortable");

    fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: "研究者乙" } });
    fireEvent.click(screen.getByRole("button", { name: "保存研究者资料" }));
    await waitFor(() => expect(mocks.saveResearcherProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "研究者乙" })));

    fireEvent.change(screen.getByLabelText("信息密度"), { target: { value: "compact" } });
    fireEvent.click(screen.getByRole("button", { name: "保存本机偏好" }));
    await waitFor(() => expect(mocks.saveAppSettings).toHaveBeenCalledWith(expect.objectContaining({ preferredDensity: "compact" })));
    await waitFor(() => expect(view.container.querySelector(".app-shell")?.getAttribute("data-density")).toBe("compact"));

    fireEvent.change(screen.getByLabelText("本次附件说明（可选）"), { target: { value: "补充材料" } });
    fireEvent.click(screen.getByRole("button", { name: "选择并保存附件" }));
    await waitFor(() => expect(mocks.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "证据.txt",
      mediaType: "text/plain",
      description: "补充材料"
    })));
    expect(mocks.pickFile).toHaveBeenCalledWith({ maxBytes: 10 * 1024 * 1024 });
  });

  it("完整清空要求精确输入，并在十六分区与全部受控标签草稿清理后聚焦成功结果", async () => {
    render(<DataManagementPage />);
    const trigger = await screen.findByRole("button", { name: "开始完整清空" });
    trigger.focus();
    fireEvent.click(trigger);
    const confirmation = screen.getByLabelText("确认文字");
    await waitFor(() => expect(document.activeElement).toBe(confirmation));
    const deleteButton = screen.getByRole("button", { name: "永久删除全部数据" });
    expect(deleteButton).toHaveProperty("disabled", true);
    fireEvent.change(confirmation, { target: { value: "删除全部本地数据" } });
    expect(deleteButton).toHaveProperty("disabled", false);

    fireEvent.click(deleteButton);
    const success = await screen.findByText("十六个本地数据分区与临时检索草稿已全部清除");
    await waitFor(() => expect(document.activeElement).toBe(success.parentElement));
    expect(mocks.clearAll).toHaveBeenCalledTimes(1);
    expect(mocks.clearControlledWindowResearchQueryDrafts).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/已确认 2\/2 个受控标签页，共移除 3 条临时检索草稿/)).toBeTruthy();
  });

  it("数据库已删除但有标签页未 ACK 时显示精确部分完成且不谎称删除失败或全部完成", async () => {
    mocks.clearControlledWindowResearchQueryDrafts.mockResolvedValueOnce({
      mode: "controlled_windows",
      complete: false,
      reason: "CLIENTS_NOT_CONFIRMED",
      requestedClientCount: 3,
      acknowledgedClientCount: 2,
      clearedClientCount: 2,
      matchedDraftCount: 4,
      removedDraftCount: 4,
      failedDraftCount: 0,
      failedClients: [{ clientId: "client-timeout", reason: "CLIENT_TIMEOUT" }],
      currentWindowFallback: {
        matchedDraftCount: 1,
        removedDraftCount: 1,
        failedDraftCount: 0
      }
    });
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "开始完整清空" }));
    fireEvent.change(screen.getByLabelText("确认文字"), {
      target: { value: "删除全部本地数据" }
    });
    fireEvent.click(screen.getByRole("button", { name: "永久删除全部数据" }));

    expect(await screen.findByText("十六个本地数据分区已删除，部分临时草稿未确认")).toBeTruthy();
    expect(screen.getByText(/已确认 2\/3 个受控标签页/)).toBeTruthy();
    expect(screen.getByText(/发起标签页已额外直接核验并移除 1 条临时检索草稿/)).toBeTruthy();
    expect(screen.getByText(/client-timeout（CLIENT_TIMEOUT）/)).toBeTruthy();
    expect(mocks.clearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("完整清空未完成")).toBeNull();
    expect(screen.queryByText("十六个本地数据分区与临时检索草稿已全部清除")).toBeNull();
  });

  it("清空缺省应用设置后不继续显示已经删除的旧时区", async () => {
    mocks.readAppSettings
      .mockResolvedValueOnce({
        defaultTimeZone: "America/New_York",
        defaultCalendarType: "lunar",
        preferredDensity: "compact"
      })
      .mockResolvedValue(null);

    const view = render(
      <LocalAppSettingsProvider loadSettings={async () => comfortableSettingsRecord}>
        <AppShell pathname="/settings/data">
          <DataManagementPage />
        </AppShell>
      </LocalAppSettingsProvider>
    );
    expect(await screen.findByDisplayValue("America/New_York")).toBeTruthy();
    await waitFor(() => expect(view.container.querySelector(".app-shell")?.getAttribute("data-density")).toBe("compact"));

    fireEvent.click(screen.getByRole("button", { name: "开始完整清空" }));
    fireEvent.change(screen.getByLabelText("确认文字"), {
      target: { value: "删除全部本地数据" }
    });
    fireEvent.click(screen.getByRole("button", { name: "永久删除全部数据" }));

    await waitFor(() => expect(mocks.clearAll).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.queryByDisplayValue("America/New_York")).toBeNull();
    });
    await waitFor(() => expect(view.container.querySelector(".app-shell")?.getAttribute("data-density")).toBe("comfortable"));
    expect(screen.getByDisplayValue("Asia/Shanghai")).toBeTruthy();
  });

  it("浏览器容量估算失败时仍正常载入本地数据概览", async () => {
    const originalStorage = Object.getOwnPropertyDescriptor(navigator, "storage");
    const estimate = vi.fn().mockRejectedValue(new Error("estimate unavailable"));
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate }
    });
    const view = render(<DataManagementPage />);

    try {
      expect(await screen.findByRole("heading", { name: "此浏览器中的十六个用户数据分区" })).toBeTruthy();
      await waitFor(() => expect(estimate).toHaveBeenCalledTimes(1));
      expect(screen.queryByText("本地数据概览未能载入")).toBeNull();
    } finally {
      view.unmount();
      if (originalStorage) Object.defineProperty(navigator, "storage", originalStorage);
      else Reflect.deleteProperty(navigator, "storage");
    }
  });

  it("恢复事务已提交但后置读取失败时不误报恢复失败", async () => {
    mocks.readFullDataSnapshot
      .mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    mocks.pickFile.mockResolvedValueOnce({
      name: "incoming.zip",
      size: 4096,
      type: "application/zip",
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" })
    });
    render(<DataManagementPage />);
    await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    fireEvent.click(screen.getByRole("button", { name: "先下载当前安全备份" }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
    fireEvent.click(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/));
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("完整恢复已提交，概览刷新失败")).toBeTruthy();
    expect(mocks.applyVerifiedFullBackup).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("恢复未完成")).toBeNull();
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
  });

  it("清空事务已提交但后置读取失败时不误报删除失败", async () => {
    mocks.readFullDataSnapshot
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    render(<DataManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: "开始完整清空" }));
    fireEvent.change(screen.getByLabelText("确认文字"), {
      target: { value: "删除全部本地数据" }
    });
    fireEvent.click(screen.getByRole("button", { name: "永久删除全部数据" }));

    expect(await screen.findByText("十六分区与临时草稿已清，概览刷新失败")).toBeTruthy();
    expect(mocks.clearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("完整清空未完成")).toBeNull();
  });

  it("研究者资料已提交但后置读取失败时不误报未保存", async () => {
    mocks.readFullDataSnapshot
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    render(<DataManagementPage />);
    await screen.findByDisplayValue("研究者甲");

    fireEvent.click(screen.getByRole("button", { name: "保存研究者资料" }));

    expect(await screen.findByText("研究者资料已保存，概览刷新失败")).toBeTruthy();
    expect(mocks.saveResearcherProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("研究者资料未保存")).toBeNull();
  });

  it("附件已删除但后置读取失败时清除确认门且不误报未删除", async () => {
    mocks.readFullDataSnapshot
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    render(<DataManagementPage />);
    await screen.findByText("原始材料.pdf");
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    const confirmation = screen.getByRole("group", { name: "确认删除附件 原始材料.pdf" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText("附件已删除，列表刷新失败")).toBeTruthy();
    expect(mocks.deleteAttachment).toHaveBeenCalledWith("attachment-1");
    expect(screen.queryByText("附件未删除")).toBeNull();
    expect(screen.queryByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeNull();
  });

  it("开始备份预检会撤销已经展开的附件删除确认", async () => {
    mocks.pickFile.mockResolvedValueOnce(null);
    render(<DataManagementPage />);
    await screen.findByText("原始材料.pdf");
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    expect(screen.getByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));

    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeNull();
    });
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });
});
