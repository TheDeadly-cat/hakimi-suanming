import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import type { FullBackupWorkerRequest, FullBackupWorkerResponse } from "../lib/full-backup-worker-protocol";
import { FullBackupError } from "@hakimi/backup";
import {
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  SCHEMA_VERSION,
  type LocalAppSettingsRecord
} from "@hakimi/contracts";
import { AppShell } from "../components/app-shell";
import { resetPreparedFileDeliveryCoordinatorForTests } from "../components/prepared-file-delivery-coordinator";
import { LocalAppSettingsProvider } from "../lib/local-app-settings";
import { DataManagementPage } from "./data-management-page";

const mocks = vi.hoisted(() => ({
  readFullDataSnapshot: vi.fn(),
  readLocalDataOverview: vi.fn(),
  readResearcherProfile: vi.fn(),
  readAppSettings: vi.fn(),
  listAttachments: vi.fn(),
  readAttachmentMetadataPage: vi.fn(),
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

const lifecycleAttachmentBoundary = vi.hoisted(() => ({
  mediaType: "application/vnd.hakimi.bazi-citation-applicability-observation-pair-lifecycle+json",
  description: "hakimi.bazi.citation-applicability-observation-pair-lifecycle.local-sensitive/1"
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: {
    readFullDataSnapshot: mocks.readFullDataSnapshot,
    readLocalDataOverview: mocks.readLocalDataOverview,
    readResearcherProfile: mocks.readResearcherProfile,
    readAppSettings: mocks.readAppSettings,
    listAttachments: mocks.listAttachments,
    readAttachmentMetadataPage: mocks.readAttachmentMetadataPage,
    saveResearcherProfile: mocks.saveResearcherProfile,
    saveAppSettings: mocks.saveAppSettings,
    createAttachment: mocks.createAttachment,
    readAttachmentBytes: mocks.readAttachmentBytes,
    deleteAttachment: mocks.deleteAttachment,
    clearAll: mocks.clearAll
  }
}));

vi.mock("@hakimi/backup", async (importOriginal) => ({
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES: 120 * 1024 * 1024,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES: 160 * 1024 * 1024,
  FullBackupError: (await importOriginal<typeof import("@hakimi/backup")>()).FullBackupError,
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

vi.mock("@hakimi/platform", async (importOriginal) => ({
  ...await importOriginal<typeof import("@hakimi/platform")>(),
  pickFile: mocks.pickFile,
  saveBlobFile: mocks.saveBlobFile,
  decodeUtf8Blob: async (blob: Blob) => blob.text(),
  webReportExportPort: {
    getCapabilities: () => ({
      canDownloadFiles: true,
      canChooseSaveLocation: false,
      canShareFiles: false
    }),
    printReport: vi.fn(),
    saveFile: async (blob: Blob, filename: string) => mocks.saveBlobFile(filename, blob)
  }
}));

vi.mock("../lib/local-user-data-cleanup", () => ({
  clearControlledWindowResearchQueryDrafts: mocks.clearControlledWindowResearchQueryDrafts
}));

vi.mock("../lib/bazi-citation-observation-lifecycle-store", () => ({
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE:
    lifecycleAttachmentBoundary.mediaType,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION:
    lifecycleAttachmentBoundary.description
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

const attachmentMetadata = [
  {
    id: "attachment-1",
    fileName: "原始材料.pdf",
    mediaType: "application/pdf",
    byteLength: 1024,
    description: "访谈材料",
    contentHash: "a".repeat(64),
    createdAt: "2026-08-02T00:00:00.000Z",
    link: null,
    contentIntegrity: "unchecked"
  },
  {
    id: "attachment-2",
    fileName: "校时照片.png",
    mediaType: "image/png",
    byteLength: 2048,
    description: "",
    contentHash: "b".repeat(64),
    createdAt: "2026-08-02T00:00:00.000Z",
    link: null,
    contentIntegrity: "unchecked"
  }
] as const;

const attachmentMetadataPage = {
  totalCount: 2,
  offset: 0,
  items: attachmentMetadata,
  nextOffset: null,
  scannedEncodedCharacters: 4096,
  contentIntegrityVerified: false
} as const;

const seventeenAttachmentCounts = {
  ...partitionCounts,
  attachments: 17
};

const firstSixteenAttachmentMetadata = Array.from({ length: 16 }, (_, index) => ({
  ...attachmentMetadata[0],
  id: `bounded-attachment-${index + 1}`,
  fileName: `有界附件-${String(index + 1).padStart(2, "0")}.pdf`,
  byteLength: 1024,
  description: "",
  contentHash: (index + 1).toString(16).padStart(64, "0")
}));

const seventeenAttachmentMetadataPage = {
  totalCount: 17,
  offset: 0,
  items: firstSixteenAttachmentMetadata,
  nextOffset: 16,
  scannedEncodedCharacters: 32 * 1024,
  contentIntegrityVerified: false
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
  fixedHeadroomBytes: 53_687_092,
  usageBytes: 1024,
  quotaBytes: 1024 * 1024 * 1024,
  availableBytes: 1024 * 1024 * 1024 - 1024,
  requiredAdditionalBytes: 53_697_332,
  admissionToken: `1:full_restore:${"c".repeat(64)}:1024:1073741824:53697332:2026-08-03T00:00:00.000Z`
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

const pickedBackup = (name = "incoming.json") => ({
  name, size: 4096, type: "application/json", blob: new Blob(["{}"], { type: "application/json" })
});
const preparedImport = () => ({
  preparation, sourceContainer: "json", sourceByteLength: 4096, decodedJsonByteLength: 4096,
  canonicalJsonByteLength: 4096, payloadDigest: admittedPlan.payloadDigest
});
function expectNoPreflightWrites() {
  for (const write of [mocks.applyVerifiedFullBackup, mocks.clearAll, mocks.saveResearcherProfile,
    mocks.saveAppSettings, mocks.createAttachment, mocks.deleteAttachment, mocks.saveBlobFile]) {
    expect(write).not.toHaveBeenCalled();
  }
  expect(window.localStorage.getItem("hakimi:backup-health:v1:lastFullBackupExportedAt")).toBeNull();
}

beforeEach(() => {
  vi.resetAllMocks();
  resetPreparedFileDeliveryCoordinatorForTests();
  window.localStorage.clear();
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
  mocks.readLocalDataOverview.mockResolvedValue({ counts: partitionCounts });
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
  mocks.listAttachments.mockResolvedValue(attachmentMetadata);
  mocks.readAttachmentMetadataPage.mockResolvedValue(attachmentMetadataPage);
  mocks.readAttachmentBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
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

async function deliverPreparedFile(): Promise<void> {
  const previousCalls = mocks.saveBlobFile.mock.calls.length;
  const dialog = await screen.findByRole("dialog", { name: "待交付文件已在本机生成" });
  expect(dialog.dataset.sharePolicy).toBe("blocked_sensitive");
  expect(mocks.saveBlobFile).toHaveBeenCalledTimes(previousCalls);
  fireEvent.click(within(dialog).getByRole("button", { name: /^下载文件/ }));
  await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledTimes(previousCalls + 1));
  await waitFor(() => {
    expect(["completed", "requested", "cancelled"]).toContain(dialog.dataset.deliveryOutcome);
  });
  if (dialog.dataset.deliveryOutcome === "requested") {
    fireEvent.click(within(dialog).getByRole("button", { name: "已核对，允许再次下载" }));
  }
  fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

async function openDeleteAllConfirmation(
  decision: "verified_backup" | "accept_without_backup" = "accept_without_backup"
): Promise<HTMLInputElement> {
  const trigger = screen.getByRole("button", { name: "开始完整清空" });
  await waitFor(() => expect(trigger).toHaveProperty("disabled", false));
  fireEvent.click(trigger);
  const choice = await screen.findByLabelText(decision === "verified_backup"
    ? /我已人工核对一份可用的完整 ZIP/
    : /我明确接受没有可恢复副本仍继续/);
  fireEvent.click(choice);
  const confirmation = screen.getByLabelText(/确认文字：输入/);
  await waitFor(() => expect(confirmation).toHaveProperty("disabled", false));
  return confirmation as HTMLInputElement;
}

async function submitConfirmedRestore(): Promise<void> {
  mocks.pickFile.mockResolvedValue({
    name: "incoming.json",
    size: 4096,
    type: "application/json",
    blob: new Blob(["{}"], { type: "application/json" })
  });
  const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
  await waitFor(() => expect(choose).toHaveProperty("disabled", false));
  fireEvent.click(choose);
  await screen.findByRole("heading", { name: "预检通过，尚未写入" });
  fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
  await deliverPreparedFile();
  fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
  fireEvent.click(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/));
  const restore = screen.getByRole("button", { name: "确认替换并恢复" });
  await waitFor(() => expect(restore).toHaveProperty("disabled", false));
  fireEvent.click(restore);
}

async function enterDeleteAllText(confirmation: HTMLInputElement): Promise<HTMLButtonElement> {
  fireEvent.change(confirmation, { target: { value: "删除全部本地数据" } });
  const deleteButton = screen.getByRole<HTMLButtonElement>("button", { name: "永久删除全部数据" });
  await waitFor(() => expect(deleteButton).toHaveProperty("disabled", false));
  return deleteButton;
}

describe("DataManagementPage", () => {
  it("显示十六分区、未加密警告、资料偏好、附件和最后的完整危险区", async () => {
    render(<DataManagementPage />);

    expect(await screen.findByRole("heading", { name: "此浏览器中的十六个用户数据分区" })).toBeTruthy();
    await waitFor(() => {
      expect(mocks.readLocalDataOverview).toHaveBeenCalledTimes(1);
      expect(mocks.readAttachmentMetadataPage).toHaveBeenCalledTimes(1);
    });
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.listAttachments).not.toHaveBeenCalled();
    for (const label of [
      "命盘案例", "命盘修订", "未知时辰候选组", "研究笔记", "事件", "保存视图",
      "用户文献", "结构化引用", "来源权利记录", "研究者资料", "应用设置", "附件", "规则包仓库", "候选组时区并列复算凭证", "事件时间迁移凭证", "Revision 计算收据"
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("备份是未加密的敏感明文")).toBeTruthy();
    expect(screen.getByRole("button", { name: "准备完整 ZIP" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "准备兼容 JSON" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "研究者资料" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "本机研究偏好" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "附件库" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "永久删除此浏览器中的全部十六分区数据" })).toBeTruthy();
    expect(screen.getByText(/规则包仓库、活动选择器、两类时间迁移凭证与 Revision 计算收据/)).toBeTruthy();
    expect(screen.getByText(/请求当前所有受控标签页删除本应用的临时检索草稿；没有返回确认的标签页会单独列出/)).toBeTruthy();
    expect(screen.getByText("旧版 core 备份兼容检查")).toBeTruthy();
  });

  it("概览读取失败后的重试仍只使用轻量概览与附件元数据分页 API", async () => {
    mocks.readLocalDataOverview
      .mockRejectedValueOnce(new Error("overview temporarily unavailable"))
      .mockResolvedValueOnce({ counts: partitionCounts });
    render(<DataManagementPage />);

    expect(await screen.findByText("本机数据清单不可用")).toBeTruthy();
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.listAttachments).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "重新读取本地概览" }));

    expect(await screen.findByRole("heading", { name: "此浏览器中的十六个用户数据分区" })).toBeTruthy();
    await waitFor(() => {
      expect(mocks.readLocalDataOverview).toHaveBeenCalledTimes(2);
      expect(mocks.readAttachmentMetadataPage).toHaveBeenCalledTimes(2);
    });
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.listAttachments).not.toHaveBeenCalled();
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
      expect.objectContaining({ appVersion: expect.any(String) }),
      expect.any(AbortSignal)
    );
    expect(mocks.readFullDataSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.listAttachments).not.toHaveBeenCalled();
    expect(screen.getAllByText("命盘案例").length).toBeGreaterThan(0);
    const restoreButton = screen.getByRole("button", { name: "确认替换并恢复" });
    expect(restoreButton).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();
    const safetyConfirmation = screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/);
    const replacementConfirmation = screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
    fireEvent.click(safetyConfirmation);
    fireEvent.click(replacementConfirmation);
    expect(restoreButton).toHaveProperty("disabled", false);

    fireEvent.click(screen.getByRole("button", { name: "重新准备当前安全备份" }));
    await deliverPreparedFile();
    expect(safetyConfirmation).toHaveProperty("checked", false);
    expect(replacementConfirmation).toHaveProperty("checked", false);
    expect(restoreButton).toHaveProperty("disabled", true);

    const safetyConfirmationAfterRepeat = screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/);
    fireEvent.click(safetyConfirmationAfterRepeat);
    await waitFor(() => expect(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/)).toHaveProperty("disabled", false));
    fireEvent.click(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/));
    await waitFor(() => expect(screen.getByRole("button", { name: "确认替换并恢复" })).toHaveProperty("disabled", false));
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));
    await waitFor(() => expect(mocks.verifyPreparedFullBackupOffMainThread).toHaveBeenCalledTimes(1));
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
    mocks.saveBlobFile.mockImplementationOnce(async (filename: string) => ({
      status: "cancelled",
      filename,
      operation: "save"
    }));
    render(<DataManagementPage />);
    await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();

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
    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();
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
    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();
    fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
    const replacement = screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
    fireEvent.click(replacement);
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("提交前容量准入未通过")).toBeTruthy();
    expect(replacement).toHaveProperty("checked", false);
    expect(mocks.verifyPreparedFullBackupOffMainThread).not.toHaveBeenCalled();
    expect(mocks.applyVerifiedFullBackup).not.toHaveBeenCalled();
  });

  it("真实 CURRENT_DATA_CHANGED 冲突撤销旧预检与确认，重新准备使用变化后的当前数据", async () => {
    const changedSnapshot = { ...snapshot, cases: [{ id: "case-created-after-preflight" }] };
    mocks.applyVerifiedFullBackup.mockImplementationOnce(async () => {
      mocks.readFullDataSnapshot.mockResolvedValue(changedSnapshot);
      throw new FullBackupError("CURRENT_DATA_CHANGED", "Current data changed after preparation.");
    });
    const view = render(<DataManagementPage />);
    await submitConfirmedRestore();

    expect(await screen.findByText("恢复预检已过期")).toBeTruthy();
    expect(screen.getByText(/本次恢复未替换现有数据.*重新选择 ZIP \/ JSON 文件.*重新创建、保存和确认当前安全备份/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
    expect(screen.queryByRole("button", { name: "确认替换并恢复" })).toBeNull();
    expect(screen.queryByText("完整恢复成功")).toBeNull();
    expect(view.container.querySelector("[data-write-mode]")?.getAttribute("data-write-mode")).toBe("available");
    expect(screen.getByRole("button", { name: "开始完整清空" })).toHaveProperty("disabled", false);
    expect(mocks.inspectFullBackupSnapshotOffMainThread).not.toHaveBeenCalled();
    expect(mocks.clearAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenLastCalledWith(
      expect.any(Blob), changedSnapshot, expect.objectContaining({ appVersion: expect.any(String) }), expect.any(AbortSignal)
    );
    expect(screen.getByRole("button", { name: "先准备当前安全备份" })).toBeTruthy();
    expect(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/)).toHaveProperty("checked", false);
    expect(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/)).toHaveProperty("checked", false);
    expect(screen.getByRole("button", { name: "确认替换并恢复" })).toHaveProperty("disabled", true);
    expect(mocks.applyVerifiedFullBackup).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Error("Restore outcome unavailable"),
    Object.assign(new Error("Unclassified conflict"), { code: "CURRENT_DATA_CHANGED" })
  ])("未知恢复异常仍锁写和清空入口，只读导出及重新核对可用：%s", async (reason) => {
    mocks.applyVerifiedFullBackup.mockRejectedValueOnce(reason);
    const view = render(<DataManagementPage />);
    await submitConfirmedRestore();

    expect(await screen.findByRole("heading", { name: "恢复存储调用异常，提交结果未知" })).toBeTruthy();
    expect(view.container.querySelector("[data-write-mode]")?.getAttribute("data-write-mode")).toBe("reconciliation_required");
    expect(screen.queryByText("恢复预检已过期")).toBeNull();
    expect(screen.queryByText("完整恢复成功")).toBeNull();
    for (const name of ["保存研究者资料", "保存本机偏好", "选择并保存附件", "选择 ZIP / JSON 预检", "开始完整清空"]) {
      expect(screen.getByRole("button", { name })).toHaveProperty("disabled", true);
    }
    fireEvent.click(screen.getByRole("button", { name: "开始完整清空" }));
    expect(screen.queryByRole("group", { name: "先核对恢复保障，再输入确认文字" })).toBeNull();
    expect(screen.getByRole("button", { name: "重新打开并核对" })).toHaveProperty("disabled", false);
    const exportButton = screen.getByRole("button", { name: "准备完整 ZIP" });
    expect(exportButton).toHaveProperty("disabled", false);
    fireEvent.click(exportButton);
    await deliverPreparedFile();
    expect(mocks.createFullBackupArtifactOffMainThread).toHaveBeenCalledTimes(1);
    expect(mocks.applyVerifiedFullBackup).toHaveBeenCalledTimes(1);
    expect(mocks.clearAll).not.toHaveBeenCalled();
    expect(view.container.querySelector("[data-write-mode]")?.getAttribute("data-write-mode")).toBe("reconciliation_required");
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
    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();
    const safetyConfirmation = screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/);
    fireEvent.click(safetyConfirmation);
    const replacementConfirmation = screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
    await waitFor(() => expect(replacementConfirmation).toHaveProperty("disabled", false));
    fireEvent.click(replacementConfirmation);
    const restoreButton = screen.getByRole("button", { name: "确认替换并恢复" });
    await waitFor(() => expect(restoreButton).toHaveProperty("disabled", false));
    fireEvent.click(restoreButton);

    expect(await screen.findByText("浏览器配额不足，恢复事务已回滚")).toBeTruthy();
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

    const overviewCallsBeforeUpload = mocks.readLocalDataOverview.mock.calls.length;
    const metadataCallsBeforeUpload = mocks.readAttachmentMetadataPage.mock.calls.length;
    fireEvent.change(screen.getByLabelText("本次附件说明（可选）"), { target: { value: "补充材料" } });
    fireEvent.click(screen.getByRole("button", { name: "选择并保存附件" }));
    await waitFor(() => expect(mocks.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "证据.txt",
      mediaType: "text/plain",
      description: "补充材料"
    })));
    expect(await screen.findByText("附件已保存")).toBeTruthy();
    await waitFor(() => {
      expect(mocks.readLocalDataOverview).toHaveBeenCalledTimes(overviewCallsBeforeUpload + 1);
      expect(mocks.readAttachmentMetadataPage).toHaveBeenCalledTimes(metadataCallsBeforeUpload + 1);
    });
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.listAttachments).not.toHaveBeenCalled();
    expect(mocks.pickFile).toHaveBeenCalledWith({ maxBytes: 10 * 1024 * 1024 });
  });

  it("拒绝通过通用附件入口保存保留的 lifecycle MIME", async () => {
    mocks.pickFile.mockResolvedValueOnce({
      name: "forged-lifecycle.json",
      size: 4,
      type: `${lifecycleAttachmentBoundary.mediaType.toUpperCase()}; Charset=UTF-8`,
      blob: new Blob(["test"], { type: lifecycleAttachmentBoundary.mediaType })
    });
    render(<DataManagementPage />);
    await screen.findByText("原始材料.pdf");

    fireEvent.click(screen.getByRole("button", { name: "选择并保存附件" }));

    expect(await screen.findByText("请使用专用 lifecycle 审阅库")).toBeTruthy();
    expect(screen.getByText(/通用附件入口不会创建、覆盖或降级处理它/u)).toBeTruthy();
    expect(mocks.createAttachment).not.toHaveBeenCalled();
  });

  it("从通用下载和删除路径隔离精确 purpose 与 purpose 不匹配的保留 lifecycle MIME", async () => {
    const protectedAttachment = {
      ...attachmentMetadata[0],
      id: "protected-lifecycle",
      fileName: "protected-lifecycle.json",
      mediaType: lifecycleAttachmentBoundary.mediaType,
      description: lifecycleAttachmentBoundary.description,
      contentHash: "c".repeat(64)
    };
    const mismatchedPurposeAttachment = {
      ...attachmentMetadata[0],
      id: "mismatched-lifecycle",
      fileName: "mismatched-lifecycle.json",
      mediaType: lifecycleAttachmentBoundary.mediaType,
      description: "not-the-reserved-purpose",
      contentHash: "d".repeat(64)
    };
    mocks.readLocalDataOverview.mockResolvedValue({
      counts: { ...partitionCounts, attachments: 3 }
    });
    mocks.readAttachmentMetadataPage.mockResolvedValue({
      ...attachmentMetadataPage,
      totalCount: 3,
      items: [attachmentMetadata[0], protectedAttachment, mismatchedPurposeAttachment]
    });
    render(<DataManagementPage />);

    const protectedName = await screen.findByText("protected-lifecycle.json");
    const protectedRow = protectedName.closest("li");
    if (!protectedRow) throw new Error("protected attachment row missing");
    expect(within(protectedRow).getByText("受保护的 lifecycle 审阅库工件")).toBeTruthy();
    expect(within(protectedRow).queryByRole("button", { name: "下载" })).toBeNull();
    expect(within(protectedRow).queryByRole("button", { name: "删除" })).toBeNull();
    expect(within(protectedRow).queryByText(/永久删除此附件/u)).toBeNull();

    const mismatchedName = screen.getByText("mismatched-lifecycle.json");
    const mismatchedRow = mismatchedName.closest("li");
    if (!mismatchedRow) throw new Error("mismatched attachment row missing");
    expect(within(mismatchedRow).getByText("保留 lifecycle MIME 的 purpose 不匹配")).toBeTruthy();
    expect(within(mismatchedRow).queryByText("受保护的 lifecycle 审阅库工件")).toBeNull();
    expect(within(mismatchedRow).queryByRole("button", { name: "下载" })).toBeNull();
    expect(within(mismatchedRow).queryByRole("button", { name: "删除" })).toBeNull();
    expect(within(mismatchedRow).queryByText(/永久删除此附件/u)).toBeNull();

    expect(mocks.readAttachmentBytes).not.toHaveBeenCalled();
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it("分页加载附件元数据，并以绑定内容摘要读取下载字节", async () => {
    mocks.readAttachmentMetadataPage
      .mockResolvedValueOnce({
        totalCount: 2,
        offset: 0,
        items: [attachmentMetadata[0]],
        nextOffset: 1,
        scannedEncodedCharacters: 2048,
        contentIntegrityVerified: false
      })
      .mockResolvedValueOnce({
        totalCount: 2,
        offset: 1,
        items: [attachmentMetadata[1]],
        nextOffset: null,
        scannedEncodedCharacters: 2048,
        contentIntegrityVerified: false
      });
    render(<DataManagementPage />);

    expect(await screen.findByText("原始材料.pdf")).toBeTruthy();
    expect(screen.queryByText("校时照片.png")).toBeNull();
    expect(mocks.readAttachmentMetadataPage).toHaveBeenNthCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "加载更多附件元数据" }));

    expect(await screen.findByText("校时照片.png")).toBeTruthy();
    expect(mocks.readAttachmentMetadataPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ offset: 1 })
    );
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.listAttachments).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "下载" })[0]!);
    await waitFor(() => expect(mocks.readAttachmentBytes).toHaveBeenCalledWith(
      "attachment-1",
      { expectedContentHash: "a".repeat(64) }
    ));
  });

  it("重新读取同一附件的新摘要时关闭旧删除确认", async () => {
    const refreshedContentHash = "c".repeat(64);
    const refreshedAttachmentPage = {
      ...attachmentMetadataPage,
      items: [
        { ...attachmentMetadata[0], contentHash: refreshedContentHash },
        attachmentMetadata[1]
      ]
    };
    mocks.readLocalDataOverview
      .mockResolvedValueOnce({ counts: partitionCounts })
      .mockRejectedValueOnce(new Error("post-write reread failed"))
      .mockResolvedValueOnce({ counts: partitionCounts });
    mocks.readAttachmentMetadataPage
      .mockResolvedValueOnce(attachmentMetadataPage)
      .mockResolvedValueOnce(refreshedAttachmentPage)
      .mockResolvedValueOnce(refreshedAttachmentPage);
    render(<DataManagementPage />);

    await screen.findByText("原始材料.pdf");
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    expect(screen.getByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存研究者资料" }));
    expect(await screen.findByText("研究者资料已保存，概览刷新失败")).toBeTruthy();
    await waitFor(() => expect(mocks.readAttachmentMetadataPage).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeNull();

    const retry = screen.getByRole<HTMLButtonElement>("button", { name: "重新读取本地概览" });
    await waitFor(() => expect(retry).toHaveProperty("disabled", false));
    fireEvent.click(retry);

    expect(await screen.findByTitle(refreshedContentHash)).toBeTruthy();
    await waitFor(() => expect(mocks.readAttachmentMetadataPage).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("group", { name: "确认删除附件 原始材料.pdf" })).toBeNull();
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it("直接确认删除在无关重渲染后仍使用展开时的旧摘要", async () => {
    render(<DataManagementPage />);

    await screen.findByText("原始材料.pdf");
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    fireEvent.change(screen.getByLabelText("本次附件说明（可选）"), { target: { value: "触发无关重渲染" } });
    expect(screen.getByDisplayValue("触发无关重渲染")).toBeTruthy();

    const confirmation = screen.getByRole("group", { name: "确认删除附件 原始材料.pdf" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(mocks.deleteAttachment).toHaveBeenCalledWith(
      "attachment-1",
      { expectedContentHash: "a".repeat(64) }
    ));
  });

  it("完整清空要求精确输入，并在十六分区与全部受控标签草稿清理后聚焦成功结果", async () => {
    render(<DataManagementPage />);
    const trigger = await screen.findByRole("button", { name: "开始完整清空" });
    await waitFor(() => expect(trigger).toHaveProperty("disabled", false));
    trigger.focus();
    fireEvent.click(trigger);
    const initialChoice = await screen.findByLabelText(/我已人工核对一份可用的完整 ZIP/);
    await waitFor(() => expect(document.activeElement).toBe(initialChoice));
    fireEvent.click(screen.getByLabelText(/我明确接受没有可恢复副本仍继续/));
    const confirmation = screen.getByLabelText<HTMLInputElement>(/确认文字：输入/);
    await waitFor(() => expect(confirmation).toHaveProperty("disabled", false));
    const deleteButton = screen.getByRole("button", { name: "永久删除全部数据" });
    expect(deleteButton).toHaveProperty("disabled", true);
    expect(await enterDeleteAllText(confirmation)).toBe(deleteButton);

    fireEvent.click(deleteButton);
    const success = await screen.findByText("十六个本地数据分区与临时检索草稿已全部清除");
    await waitFor(() => expect(document.activeElement).toBe(success.parentElement));
    expect(mocks.clearAll).toHaveBeenCalledTimes(1);
    expect(mocks.clearControlledWindowResearchQueryDrafts).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/已确认 2\/2 个受控标签页，共移除 3 条临时检索草稿/)).toBeTruthy();
  });

  it("完整备份只有下载请求时保留 requested 收据且不写入备份健康标记", async () => {
    render(<DataManagementPage />);
    const exportButton = await screen.findByRole("button", { name: "准备完整 ZIP" });
    await waitFor(() => expect(exportButton).toHaveProperty("disabled", false));

    fireEvent.click(exportButton);
    await waitFor(() => expect(mocks.readFullDataSnapshot).toHaveBeenCalledTimes(1));
    const exportSnapshotSignal = mocks.readFullDataSnapshot.mock.calls[0]?.[0]?.signal as AbortSignal | undefined;
    expect(exportSnapshotSignal).toBeDefined();
    expect(exportSnapshotSignal?.aborted).toBe(false);
    expect(mocks.readFullDataSnapshot).toHaveBeenCalledWith({ signal: exportSnapshotSignal });
    await deliverPreparedFile();

    const receipt = screen.getByRole("heading", { name: "最近一次完整备份工程回执" }).closest("section");
    expect(receipt?.getAttribute("data-delivery")).toBe("requested");
    expect(within(receipt as HTMLElement).getByText("仅已请求下载")).toBeTruthy();
    expect(within(receipt as HTMLElement).getByText("requested")).toBeTruthy();
    expect(window.localStorage.getItem("hakimi:backup-health:v1:lastFullBackupExportedAt")).toBeNull();
  });

  it("完整备份成功后写入备份健康标记，完整清空后清除该标记", async () => {
    mocks.saveBlobFile.mockImplementationOnce(async (filename: string, blob: Blob) => ({
      status: "saved",
      filename,
      method: "native",
      bytesWritten: blob.size
    }));
    render(<DataManagementPage />);
    const exportButton = await screen.findByRole("button", { name: "准备完整 ZIP" });
    await waitFor(() => expect(exportButton).toHaveProperty("disabled", false));

    fireEvent.click(exportButton);
    await deliverPreparedFile();
    expect(window.localStorage.getItem("hakimi:backup-health:v1:lastFullBackupExportedAt")).not.toBeNull();

    const confirmation = await openDeleteAllConfirmation("verified_backup");
    fireEvent.click(await enterDeleteAllText(confirmation));
    await waitFor(() => expect(mocks.clearAll).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem("hakimi:backup-health:v1:lastFullBackupExportedAt")).toBeNull();
  });

  it("慢预检使用真实 Worker 客户端取消并终止，忽略迟到消息且可立即重试", async () => {
    const client = await vi.importActual<typeof import("../lib/full-backup-worker-client")>("../lib/full-backup-worker-client");
    const requests: FullBackupWorkerRequest[] = [];
    const worker = {
      onmessage: null as Worker["onmessage"], onerror: null as Worker["onerror"], onmessageerror: null as Worker["onmessageerror"],
      postMessage: vi.fn((message: FullBackupWorkerRequest) => { requests.push(message); }), terminate: vi.fn()
    };
    mocks.pickFile.mockResolvedValue(pickedBackup());
    mocks.prepareFullBackupImportOffMainThread.mockImplementationOnce((blob, current, options, signal) =>
      client.prepareFullBackupImportOffMainThread(blob, current, options, signal, {
        forceWorker: true, createWorker: () => worker, createJobId: () => "cancel-preflight-test"
      }));
    render(<DataManagementPage />);
    const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
    await waitFor(() => expect(choose).toHaveProperty("disabled", false));
    fireEvent.click(choose);
    await waitFor(() => expect(requests[0]?.type).toBe("prepare_import"));
    const lateMessage = worker.onmessage;
    fireEvent.click(screen.getByRole("button", { name: "取消预检" }));
    await screen.findByText("已取消备份预检");
    expect(requests.map((request) => request.type)).toEqual(["prepare_import", "cancel"]);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" })).toHaveProperty("disabled", false));
    await act(async () => {
      lateMessage?.call(worker as unknown as Worker, new MessageEvent("message", { data: {
        ...requests[0], ...preparedImport(), type: "preparation_ready", sourceByteLength: 2
      } as FullBackupWorkerResponse }));
    });
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
    expect(mocks.assessStorageCapacity).not.toHaveBeenCalled();
    expectNoPreflightWrites();
    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenCalledTimes(2);
    expectNoPreflightWrites();
  });

  it("取消任务的迟到完成不能发布结果或释放下一次预检的 busy", async () => {
    const oldJob = deferred<ReturnType<typeof preparedImport>>();
    const newJob = deferred<ReturnType<typeof preparedImport>>();
    mocks.pickFile.mockResolvedValueOnce(pickedBackup("cancelled.json")).mockResolvedValueOnce(pickedBackup("retry.json"));
    mocks.prepareFullBackupImportOffMainThread.mockReturnValueOnce(oldJob.promise).mockReturnValueOnce(newJob.promise);
    render(<DataManagementPage />);
    const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
    await waitFor(() => expect(choose).toHaveProperty("disabled", false));
    fireEvent.click(choose);
    await waitFor(() => expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenCalledTimes(1));
    const oldSignal = mocks.prepareFullBackupImportOffMainThread.mock.calls[0]![3] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "取消预检" }));
    expect(oldSignal.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" }));
    await waitFor(() => expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenCalledTimes(2));
    await act(async () => { oldJob.resolve(preparedImport()); await oldJob.promise; });
    expect(screen.getByRole("button", { name: "正在预检" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
    expect(mocks.assessStorageCapacity).not.toHaveBeenCalled();
    await act(async () => { newJob.resolve(preparedImport()); await newJob.promise; });
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    expect(screen.getByText(/retry\.json/)).toBeTruthy();
    expect(screen.queryByText(/cancelled\.json/)).toBeNull();
    expectNoPreflightWrites();
  });

  it.each(["picker", "snapshot", "capacity"] as const)("%s 等待期间取消后不再推进只读预检", async (phase) => {
    const gate = deferred<unknown>();
    mocks.pickFile.mockResolvedValue(pickedBackup());
    if (phase === "picker") mocks.pickFile.mockReturnValueOnce(gate.promise);
    if (phase === "snapshot") mocks.readFullDataSnapshot.mockReturnValueOnce(gate.promise);
    if (phase === "capacity") mocks.assessStorageCapacity.mockReturnValueOnce(gate.promise);
    render(<DataManagementPage />);
    const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
    await waitFor(() => expect(choose).toHaveProperty("disabled", false));
    fireEvent.click(choose);
    const expectedCall = phase === "picker" ? mocks.pickFile : phase === "snapshot" ? mocks.readFullDataSnapshot : mocks.assessStorageCapacity;
    await waitFor(() => expect(expectedCall).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "取消预检" }));
    await act(async () => {
      gate.resolve(phase === "picker" ? pickedBackup() : phase === "snapshot" ? snapshot : admittedPlan);
      await gate.promise;
    });
    expect(screen.getByRole("button", { name: "选择 ZIP / JSON 预检" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
    if (phase !== "capacity") expect(mocks.prepareFullBackupImportOffMainThread).not.toHaveBeenCalled();
    if (phase === "snapshot") expect(mocks.readFullDataSnapshot.mock.calls[0]![0].signal.aborted).toBe(true);
    expectNoPreflightWrites();
  });

  it("卸载取消预检信号，迟到结果不会进入容量检查或写入", async () => {
    const job = deferred<ReturnType<typeof preparedImport>>();
    mocks.pickFile.mockResolvedValue(pickedBackup());
    mocks.prepareFullBackupImportOffMainThread.mockReturnValueOnce(job.promise);
    const view = render(<DataManagementPage />);
    const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
    await waitFor(() => expect(choose).toHaveProperty("disabled", false));
    fireEvent.click(choose);
    await waitFor(() => expect(mocks.prepareFullBackupImportOffMainThread).toHaveBeenCalledTimes(1));
    const signal = mocks.prepareFullBackupImportOffMainThread.mock.calls[0]![3] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { job.resolve(preparedImport()); await job.promise; });
    expect(mocks.assessStorageCapacity).not.toHaveBeenCalled();
    expectNoPreflightWrites();
  });

  it("取消接线保留 160 MiB 文件选择上限及正常预检入口", async () => {
    // The real byte-limit parser is exercised separately in the Worker entry
    // test; this fixture checks that the page does not narrow its picker gate.
    mocks.pickFile.mockResolvedValue({ ...pickedBackup(), size: 160 * 1024 * 1024 });
    render(<DataManagementPage />);
    const choose = await screen.findByRole("button", { name: "选择 ZIP / JSON 预检" });
    await waitFor(() => expect(choose).toHaveProperty("disabled", false));
    fireEvent.click(choose);
    await screen.findByRole("heading", { name: "预检通过，尚未写入" });
    expect(mocks.pickFile).toHaveBeenCalledWith({ accept: ".zip,.json,application/zip,application/json", maxBytes: 160 * 1024 * 1024 });
    expect(mocks.prepareFullBackupImportOffMainThread.mock.calls[0]![3]).toBeInstanceOf(AbortSignal);
    expectNoPreflightWrites();
  });

  it("完整备份只读快照事务中可取消，且不启动 Worker、下载或备份健康标记", async () => {
    let snapshotSignal: AbortSignal | undefined;
    let releaseAbortedSnapshot: (() => void) | undefined;
    mocks.readFullDataSnapshot.mockImplementationOnce(async (options?: { signal?: AbortSignal }) => {
      if (!options?.signal) throw new Error("expected snapshot abort signal");
      snapshotSignal = options.signal;
      await new Promise<void>((resolve) => {
        if (options.signal?.aborted) resolve();
        else options.signal?.addEventListener("abort", () => resolve(), { once: true });
      });
      await new Promise<void>((resolve) => {
        releaseAbortedSnapshot = resolve;
      });
      throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    });
    render(<DataManagementPage />);
    const exportButton = await screen.findByRole("button", { name: "准备完整 ZIP" });
    await waitFor(() => expect(exportButton).toHaveProperty("disabled", false));

    fireEvent.click(exportButton);
    const cancel = await screen.findByRole("button", { name: "取消生成" });
    await waitFor(() => expect(snapshotSignal).toBeDefined());
    expect(mocks.readFullDataSnapshot).toHaveBeenCalledWith({ signal: snapshotSignal });
    expect(mocks.createFullBackupArtifactOffMainThread).not.toHaveBeenCalled();
    fireEvent.click(cancel);

    await waitFor(() => expect(snapshotSignal?.aborted).toBe(true));
    expect(screen.getByText(/只读数据库事务或 Worker 会在当前不可中断步骤结束后尽快停止/)).toBeTruthy();
    await waitFor(() => expect(releaseAbortedSnapshot).toBeTypeOf("function"));
    releaseAbortedSnapshot?.();
    expect(await screen.findByText("已取消完整 ZIP 生成")).toBeTruthy();
    expect(mocks.createFullBackupArtifactOffMainThread).not.toHaveBeenCalled();
    expect(mocks.saveBlobFile).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("hakimi:backup-health:v1:lastFullBackupExportedAt")).toBeNull();
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
    const confirmation = await openDeleteAllConfirmation();
    fireEvent.click(await enterDeleteAllText(confirmation));

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

    const confirmation = await openDeleteAllConfirmation();
    fireEvent.click(await enterDeleteAllText(confirmation));

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
    mocks.readLocalDataOverview
      .mockResolvedValueOnce({ counts: partitionCounts })
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
    fireEvent.click(screen.getByRole("button", { name: "先准备当前安全备份" }));
    await deliverPreparedFile();
    fireEvent.click(screen.getByLabelText(/我已确认安全备份文件保存成功并可以打开/));
    fireEvent.click(screen.getByLabelText(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/));
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("完整恢复已提交，概览刷新失败")).toBeTruthy();
    expect(mocks.applyVerifiedFullBackup).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("恢复未完成")).toBeNull();
    expect(screen.queryByRole("heading", { name: "预检通过，尚未写入" })).toBeNull();
  });

  it.each([
    ["returned", "完整清空已提交，空状态尚未核对"],
    ["unknown", "完整清空调用异常，提交结果未知"]
  ] as const)("仅列首 16 个附件时，完整清空 %s 回执保留 17 个附件总数", async (outcome, receiptTitle) => {
    mocks.readLocalDataOverview.mockResolvedValue({ counts: seventeenAttachmentCounts });
    mocks.readAttachmentMetadataPage.mockResolvedValue(seventeenAttachmentMetadataPage);
    if (outcome === "returned") {
      mocks.readLocalDataOverview
        .mockResolvedValueOnce({ counts: seventeenAttachmentCounts })
        .mockRejectedValueOnce(new Error("post-commit refresh failed"));
      mocks.clearAll.mockResolvedValueOnce(undefined);
    } else {
      mocks.clearAll.mockRejectedValueOnce(new Error("delete outcome unavailable"));
    }
    render(<DataManagementPage />);

    await screen.findByText("有界附件-01.pdf");
    expect(screen.getByText("17 个附件 · 已列 16")).toBeTruthy();
    expect(screen.getByText("16/17 个已列")).toBeTruthy();
    expect(screen.getByText(/本次分页已列 16\/17 个附件元数据/)).toBeTruthy();

    const confirmation = await openDeleteAllConfirmation();
    const impactSummary = screen.getByLabelText("本次完整清空影响摘要");
    expect(within(impactSummary).getByText("17 个；已列元数据声明 16 KiB")).toBeTruthy();
    expect(within(impactSummary).getByText("总字节未全量读取；删除事务覆盖全部附件")).toBeTruthy();
    fireEvent.click(await enterDeleteAllText(confirmation));

    const receiptHeading = await screen.findByRole("heading", { name: receiptTitle });
    const receipt = receiptHeading.closest("section");
    expect(receipt).not.toBeNull();
    expect(within(receipt as HTMLElement).getByText("72 条 · 17 个附件（已列 16 条元数据）")).toBeTruthy();
    expect(mocks.clearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("完整清空未完成")).toBeNull();
    const trigger = screen.getByRole("button", { name: "开始完整清空" });
    expect(trigger).toHaveProperty("disabled", true);
    fireEvent.click(trigger);
    expect(screen.queryByRole("group", { name: "先核对恢复保障，再输入确认文字" })).toBeNull();
  });

  it("研究者资料已提交但后置读取失败时不误报未保存", async () => {
    mocks.readLocalDataOverview
      .mockResolvedValueOnce({ counts: partitionCounts })
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    render(<DataManagementPage />);
    await screen.findByDisplayValue("研究者甲");

    fireEvent.click(screen.getByRole("button", { name: "保存研究者资料" }));

    expect(await screen.findByText("研究者资料已保存，概览刷新失败")).toBeTruthy();
    expect(mocks.saveResearcherProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("研究者资料未保存")).toBeNull();
  });

  it("附件已删除但后置读取失败时清除确认门且不误报未删除", async () => {
    mocks.readLocalDataOverview
      .mockResolvedValueOnce({ counts: partitionCounts })
      .mockRejectedValueOnce(new Error("post-commit refresh failed"));
    render(<DataManagementPage />);
    await screen.findByText("原始材料.pdf");
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    const confirmation = screen.getByRole("group", { name: "确认删除附件 原始材料.pdf" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText("附件已删除，列表刷新失败")).toBeTruthy();
    expect(mocks.deleteAttachment).toHaveBeenCalledWith(
      "attachment-1",
      { expectedContentHash: "a".repeat(64) }
    );
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
