import {
  AlertTriangle,
  ArrowLeft,
  Database,
  Download,
  FileArchive,
  FileText,
  HardDrive,
  Paperclip,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES,
  applyVerifiedFullBackup,
  preflightCoreBackup,
  type FullBackupImportPreparation
} from "@hakimi/backup";
import { decodeUtf8Blob, pickFile, saveBlobFile } from "@hakimi/platform";
import { caseRepository } from "@hakimi/storage";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { APP_VERSION } from "../lib/app-version";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import {
  archiveFullBackupEnvelopeOffMainThread,
  createFullBackupArtifactOffMainThread,
  inspectFullBackupSnapshotOffMainThread,
  prepareFullBackupImportOffMainThread,
  verifyPreparedFullBackupOffMainThread
} from "../lib/full-backup-worker-client";
import {
  clearControlledWindowResearchQueryDrafts,
  type ControlledWindowDraftCleanupResult
} from "../lib/local-user-data-cleanup";
import {
  FALLBACK_LOCAL_APP_SETTINGS,
  useUpdateLocalAppSettings
} from "../lib/local-app-settings";
import { AppLink } from "../lib/router";
import {
  assessStorageCapacity,
  isStorageQuotaExceededError,
  requireStorageAdmission,
  StorageAdmissionError,
  type StorageAdmissionPlan
} from "../lib/storage-capacity-gate";

const MAX_BACKUP_BYTES = DEFAULT_MAX_FULL_BACKUP_JSON_BYTES;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DELETE_CONFIRMATION = "删除全部本地数据";

const PARTITIONS = [
  { key: "cases", label: "命盘案例" },
  { key: "revisions", label: "命盘修订" },
  { key: "candidateSets", label: "未知时辰候选组" },
  { key: "researchNotes", label: "研究笔记" },
  { key: "events", label: "事件" },
  { key: "savedViews", label: "保存视图" },
  { key: "knowledgeDocuments", label: "用户文献" },
  { key: "citations", label: "结构化引用" },
  { key: "sourceRights", label: "来源权利记录" },
  { key: "researcherProfiles", label: "研究者资料" },
  { key: "appSettings", label: "应用设置" },
  { key: "attachments", label: "附件" },
  { key: "ruleRegistry", label: "规则包仓库" },
  { key: "tzdbMigrationReceipts", label: "候选组时区并列复算凭证" },
  { key: "eventTimeMigrationReceipts", label: "事件时间迁移凭证" },
  { key: "revisionCalculationReceipts", label: "Revision 计算收据" }
] as const;

type PartitionKey = typeof PARTITIONS[number]["key"];
type PartitionCounts = Record<PartitionKey, number>;

type Operation =
  | "loading"
  | "export_zip"
  | "export_json"
  | "preflight"
  | "capacity_check"
  | "safety_backup"
  | "restore"
  | "profile"
  | "settings"
  | "attachment_upload"
  | "attachment_download"
  | "attachment_delete"
  | "core_preflight"
  | "delete_all";

type Feedback = {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
};

type PendingRestore = {
  fileName: string;
  fileSize: number;
  preparation: FullBackupImportPreparation;
  logicalPayloadBytes: number;
  payloadDigest: string;
  admission: StorageAdmissionPlan;
  safetyDownloadRequested: boolean;
  safetyFileConfirmed: boolean;
  replacementConfirmed: boolean;
};

type ProfileForm = {
  displayName: string;
  organization: string;
  researchFocus: string;
};

type SettingsForm = {
  defaultTimeZone: string;
  defaultCalendarType: "gregorian" | "lunar";
  preferredDensity: "comfortable" | "compact";
};

type AttachmentView = {
  id: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  description: string;
  contentHash: string;
  createdAt: string;
  linked: boolean;
};

type CorePreflightView = {
  fileName: string;
  cases: number;
  revisions: number;
  formatVersion: string;
};

function defaultSettingsForm(): SettingsForm {
  return { ...FALLBACK_LOCAL_APP_SETTINGS };
}

function settingsFormFromRecord(record: SettingsForm | null | undefined): SettingsForm {
  return record
    ? {
        defaultTimeZone: record.defaultTimeZone,
        defaultCalendarType: record.defaultCalendarType,
        preferredDensity: record.preferredDensity
      }
    : defaultSettingsForm();
}

const EMPTY_COUNTS = Object.fromEntries(PARTITIONS.map((item) => [item.key, 0])) as PartitionCounts;

function normalizeCounts(raw: unknown): PartitionCounts {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return Object.fromEntries(PARTITIONS.map((item) => [
    item.key,
    typeof value[item.key] === "number" ? value[item.key] : 0
  ])) as PartitionCounts;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"];
  const order = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** order;
  return `${value >= 10 || order === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[order]}`;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function canonicalFileMediaType(value: string): string {
  return value.split(";", 1)[0]!.trim().toLowerCase() || "application/octet-stream";
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function bytesToBlob(bytes: Uint8Array, mediaType: string): Blob {
  return new Blob([Uint8Array.from(bytes).buffer], { type: mediaType });
}

function attachmentView(record: unknown): AttachmentView {
  const value = record as Record<string, unknown>;
  return {
    id: String(value.id ?? ""),
    fileName: String(value.fileName ?? "未命名附件"),
    mediaType: String(value.mediaType ?? "application/octet-stream"),
    byteLength: Number(value.byteLength ?? value.size ?? 0),
    description: typeof value.description === "string" ? value.description : "",
    contentHash: String(value.contentHash ?? value.sha256 ?? ""),
    createdAt: String(value.createdAt ?? ""),
    linked: value.link !== null && value.link !== undefined
  };
}

function migrationNotice(preparation: FullBackupImportPreparation): string | null {
  const sourceVersion = preparation.incoming.migratedFromFormatVersion;
  if (!sourceVersion) return null;
  return `来源 v${sourceVersion} 已先按该版本兼容契约完成格式、摘要与内部关联一致性检查，再显式迁移为 v${preparation.incoming.manifest.formatVersion}。旧包没有的新分区只按版本化迁移规则补为空分区，不会从当前设备推断或补猜旧数据语义。`;
}

function draftCleanupSummary(result: ControlledWindowDraftCleanupResult | null, error: string | null): string {
  if (!result) {
    return `跨标签页临时草稿清理未能完成协调：${error ?? "未知错误"}`;
  }
  if (result.mode === "current_window_only") {
    const localOutcome = result.clearedClientCount === 1
      ? `当前标签页已移除 ${result.removedDraftCount} 条临时检索草稿`
      : "当前标签页的临时检索草稿也未能确认清除";
    return `${localOutcome}；页面未受 Service Worker 控制，无法核对其他标签页。`;
  }
  if (result.complete) {
    return `已确认 ${result.clearedClientCount}/${result.requestedClientCount} 个受控标签页，共移除 ${result.removedDraftCount} 条临时检索草稿。`;
  }
  const failed = result.failedClients.length > 0
    ? result.failedClients.map((client) => `${client.clientId}（${client.reason}）`).join("、")
    : "Service Worker 协调结果未完整确认";
  const currentWindowFallback = result.currentWindowFallback
    ? result.currentWindowFallback.failedDraftCount === 0
      ? `发起标签页已额外直接核验并移除 ${result.currentWindowFallback.removedDraftCount} 条临时检索草稿`
      : `发起标签页额外直接清理时移除 ${result.currentWindowFallback.removedDraftCount} 条，仍有 ${result.currentWindowFallback.failedDraftCount} 条未能删除`
    : null;
  return `已确认 ${result.clearedClientCount}/${result.requestedClientCount} 个受控标签页，共移除 ${result.removedDraftCount} 条临时检索草稿${currentWindowFallback ? `；${currentWindowFallback}` : ""}；未确认标签页：${failed}。`;
}

function FeedbackMessage({ feedback, focusRef }: {
  feedback: Feedback | null;
  focusRef?: React.RefObject<HTMLDivElement | null>;
}) {
  if (!feedback) return null;
  if (feedback.tone === "error") {
    return (
      <div ref={focusRef} className="inline-error data-feedback" role="alert" tabIndex={-1}>
        <strong>{feedback.title}</strong>
        <p>{feedback.message}</p>
      </div>
    );
  }
  return (
    <div
      ref={focusRef}
      className={`data-feedback data-feedback--${feedback.tone}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
    >
      <strong>{feedback.title}</strong>
      <p>{feedback.message}</p>
    </div>
  );
}

export function DataManagementPage() {
  const updateLocalAppSettings = useUpdateLocalAppSettings();
  const [activeOperation, setActiveOperation] = useState<Operation | null>("loading");
  const [counts, setCounts] = useState<PartitionCounts>(EMPTY_COUNTS);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({ displayName: "", organization: "", researchFocus: "" });
  const [settings, setSettings] = useState<SettingsForm>(defaultSettingsForm);
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachmentDeleteId, setAttachmentDeleteId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [corePreview, setCorePreview] = useState<CorePreflightView | null>(null);
  const [backupFeedback, setBackupFeedback] = useState<Feedback | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback | null>(null);
  const [attachmentFeedback, setAttachmentFeedback] = useState<Feedback | null>(null);
  const [coreFeedback, setCoreFeedback] = useState<Feedback | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState("");

  const preflightRef = useRef<HTMLDivElement>(null);
  const backupFeedbackRef = useRef<HTMLDivElement>(null);
  const deleteFeedbackRef = useRef<HTMLDivElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const busy = activeOperation !== null;
  const dataMutationLocked = busy || deleteAllOpen || pendingRestore !== null;
  const totalCount = useMemo(
    () => PARTITIONS.reduce((sum, item) => sum + counts[item.key], 0),
    [counts]
  );

  const refreshLocalState = useCallback(async () => {
    const [snapshot, researcherProfile, appSettings, rawAttachments] = await Promise.all([
      caseRepository.readFullDataSnapshot(),
      caseRepository.readResearcherProfile(),
      caseRepository.readAppSettings(),
      caseRepository.listAttachments()
    ]);
    const modeled = snapshot as unknown as Record<string, unknown>;
    setCounts(normalizeCounts({
      ...modeled,
      cases: Array.isArray(modeled.cases) ? modeled.cases.length : 0,
      revisions: Array.isArray(modeled.revisions) ? modeled.revisions.length : 0,
      candidateSets: Array.isArray(modeled.candidateSets) ? modeled.candidateSets.length : 0,
      researchNotes: Array.isArray(modeled.researchNotes) ? modeled.researchNotes.length : 0,
      events: Array.isArray(modeled.events) ? modeled.events.length : 0,
      savedViews: Array.isArray(modeled.savedViews) ? modeled.savedViews.length : 0,
      knowledgeDocuments: Array.isArray(modeled.knowledgeDocuments) ? modeled.knowledgeDocuments.length : 0,
      citations: Array.isArray(modeled.citations) ? modeled.citations.length : 0,
      sourceRights: Array.isArray(modeled.sourceRights) ? modeled.sourceRights.length : 0,
      researcherProfiles: researcherProfile ? 1 : 0,
      appSettings: appSettings ? 1 : 0,
      attachments: rawAttachments.length,
      ruleRegistry: Array.isArray(modeled.ruleRegistry) ? modeled.ruleRegistry.length : 0,
      tzdbMigrationReceipts: Array.isArray(modeled.tzdbMigrationReceipts) ? modeled.tzdbMigrationReceipts.length : 0,
      eventTimeMigrationReceipts: Array.isArray(modeled.eventTimeMigrationReceipts)
        ? modeled.eventTimeMigrationReceipts.length
        : 0,
      revisionCalculationReceipts: Array.isArray(modeled.revisionCalculationReceipts)
        ? modeled.revisionCalculationReceipts.length
        : 0
    }));
    if (researcherProfile) {
      setProfile({
        displayName: researcherProfile.displayName,
        organization: researcherProfile.organization ?? "",
        researchFocus: researcherProfile.researchFocus ?? ""
      });
    } else {
      setProfile({ displayName: "", organization: "", researchFocus: "" });
    }
    const nextSettings = appSettings
      ? settingsFormFromRecord(appSettings)
      // A restore from an older backup or a full clear can remove the singleton.
      // Do not leave the deleted device preferences active in the app shell or
      // visible in this form.
      : defaultSettingsForm();
    setSettings(nextSettings);
    updateLocalAppSettings(nextSettings);
    setAttachments(rawAttachments.map(attachmentView));
    try {
      const estimate = await navigator.storage?.estimate?.();
      setStorageUsage(estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null);
    } catch {
      // Storage estimates are optional browser telemetry. They must never turn a
      // successful database read or committed mutation into a reported failure.
      setStorageUsage(null);
    }
  }, [updateLocalAppSettings]);

  useEffect(() => {
    let active = true;
    void refreshLocalState()
      .catch((reason) => {
        if (!active) return;
        setBackupFeedback({
          tone: "error",
          title: "本地数据概览未能载入",
          message: errorMessage(reason, "无法读取本地数据。请不要清除浏览器数据，并重新打开本页。")
        });
      })
      .finally(() => {
        if (active) setActiveOperation(null);
      });
    return () => {
      active = false;
    };
  }, [refreshLocalState]);

  useEffect(() => {
    if (pendingRestore) preflightRef.current?.focus();
  }, [pendingRestore?.fileName]);

  useEffect(() => {
    if (!deleteAllOpen) return;
    deleteInputRef.current?.focus();
  }, [deleteAllOpen]);

  const finishFeedback = (ref: React.RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => ref.current?.focus(), 0);
  };

  const exportZip = async () => {
    setActiveOperation("export_zip");
    setBackupFeedback(null);
    try {
      const snapshot = await caseRepository.readFullDataSnapshot();
      const artifact = await createFullBackupArtifactOffMainThread(
        snapshot,
        { appVersion: APP_VERSION },
        "zip"
      );
      const fileName = `hakimi-full-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      const result = await saveBlobFile(fileName, artifact.blob);
      const delivery = resolveFileDelivery(result, "完整 ZIP 导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setBackupFeedback({ tone: "info", title: "已取消完整 ZIP 导出", message: delivery.message });
        return;
      }
      setBackupFeedback({
        tone: "success",
        title: result.status === "download_requested" ? "完整 ZIP 已生成并请求下载" : "完整 ZIP 已保存",
        message: `${delivery.message} 文件包含十六个用户数据分区及附件字节。`
      });
    } catch (reason) {
      setBackupFeedback({ tone: "error", title: "ZIP 备份未完成", message: errorMessage(reason, "无法生成完整 ZIP 备份。") });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const exportJson = async () => {
    setActiveOperation("export_json");
    setBackupFeedback(null);
    try {
      const snapshot = await caseRepository.readFullDataSnapshot();
      const artifact = await createFullBackupArtifactOffMainThread(
        snapshot,
        { appVersion: APP_VERSION },
        "json"
      );
      const fileName = `hakimi-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const result = await saveBlobFile(fileName, artifact.blob);
      const delivery = resolveFileDelivery(result, "兼容 JSON 导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setBackupFeedback({ tone: "info", title: "已取消兼容 JSON 导出", message: delivery.message });
        return;
      }
      setBackupFeedback({
        tone: "success",
        title: result.status === "download_requested" ? "兼容 JSON 已生成并请求下载" : "兼容 JSON 已保存",
        message: `${delivery.message} 该格式适合旧工具互操作，但附件会以内嵌编码增大体积。`
      });
    } catch (reason) {
      setBackupFeedback({ tone: "error", title: "JSON 备份未完成", message: errorMessage(reason, "无法生成兼容 JSON 备份。") });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const chooseBackup = async () => {
    // A confirmation must never survive a backup preflight/restore boundary and
    // later target a different attachment record that happens to reuse the ID.
    setAttachmentDeleteId(null);
    setActiveOperation("preflight");
    setBackupFeedback({ tone: "info", title: "正在预检备份", message: "正在校验格式、版本、十六分区摘要、附件字节和关联；通过前不会写入本地数据库。" });
    try {
      const file = await pickFile({
        accept: ".zip,.json,application/zip,application/json",
        maxBytes: MAX_BACKUP_BYTES
      });
      if (!file) {
        setBackupFeedback(null);
        return;
      }
      // The immutable Blob is cloned directly into the Worker. The main thread
      // never reads, inflates, decodes or JSON-parses the selected backup.
      const currentSnapshot = await caseRepository.readFullDataSnapshot();
      const prepared = await prepareFullBackupImportOffMainThread(
        file.blob,
        currentSnapshot,
        { appVersion: APP_VERSION }
      );
      const admission = await assessStorageCapacity({
        operation: "full_restore",
        logicalPayloadBytes: prepared.canonicalJsonByteLength,
        payloadDigest: prepared.payloadDigest
      });
      setPendingRestore({
        fileName: file.name,
        fileSize: file.size,
        preparation: prepared.preparation,
        logicalPayloadBytes: prepared.canonicalJsonByteLength,
        payloadDigest: prepared.payloadDigest,
        admission,
        safetyDownloadRequested: false,
        safetyFileConfirmed: false,
        replacementConfirmed: false
      });
      setBackupFeedback({
        tone: "success",
        title: "预检通过，尚未写入",
        message: admission.state === "admitted"
          ? "备份已在 Worker 中完成只读结构与内部一致性检查，浏览器容量初筛也已通过；提交前仍会重新估算。请核对十六分区差异，并先下载当前数据安全备份。"
          : "备份结构预检通过，但浏览器容量准入未通过；当前不会写库。请释放空间或改用可提供可靠容量估算的浏览器后重新检查。"
      });
    } catch (reason) {
      setPendingRestore(null);
      setBackupFeedback({ tone: "error", title: "备份预检未通过", message: errorMessage(reason, "文件未通过完整性预检；当前数据未被改动。") });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const downloadSafetyBackup = async () => {
    if (!pendingRestore) return;
    setActiveOperation("safety_backup");
    setBackupFeedback(null);
    setPendingRestore((current) => current ? {
      ...current,
      safetyDownloadRequested: false,
      safetyFileConfirmed: false,
      replacementConfirmed: false
    } : current);
    try {
      const artifact = await archiveFullBackupEnvelopeOffMainThread(
        pendingRestore.preparation.currentSafetyBackup
      );
      const fileName = `hakimi-before-restore-${new Date().toISOString().slice(0, 10)}.zip`;
      const result = await saveBlobFile(fileName, artifact.blob);
      const delivery = resolveFileDelivery(result, "恢复前安全备份导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setBackupFeedback({
          tone: "info",
          title: "已取消安全备份导出",
          message: `${delivery.message} 恢复仍保持锁定。`
        });
        return;
      }
      setPendingRestore((current) => current ? {
        ...current,
        safetyDownloadRequested: true,
        safetyFileConfirmed: false,
        replacementConfirmed: false
      } : current);
      setBackupFeedback({
        tone: "success",
        title: result.status === "download_requested" ? "安全备份已生成并请求下载" : "安全备份已保存",
        message: `${delivery.message} 仍请人工确认文件可以打开；每次重新导出都会重置两个恢复确认。`
      });
    } catch (reason) {
      setBackupFeedback({ tone: "error", title: "安全备份未完成", message: errorMessage(reason, "无法生成恢复前安全备份；恢复仍保持锁定。") });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const recheckPendingCapacity = async () => {
    if (!pendingRestore) return;
    setActiveOperation("capacity_check");
    setBackupFeedback(null);
    try {
      const admission = await assessStorageCapacity({
        operation: "full_restore",
        logicalPayloadBytes: pendingRestore.logicalPayloadBytes,
        payloadDigest: pendingRestore.payloadDigest
      });
      setPendingRestore((current) => current ? {
        ...current,
        admission,
        ...(admission.state === "admitted" ? {} : { replacementConfirmed: false })
      } : current);
      setBackupFeedback(admission.state === "admitted" ? {
        tone: "success",
        title: "容量准入已通过",
        message: "浏览器当前报告的可用空间满足保守写入预算；真正提交前仍会再检查一次，实际配额错误也会使事务回滚。"
      } : {
        tone: "error",
        title: "容量准入未通过",
        message: admission.state === "insufficient"
          ? "浏览器报告的可用空间不足以容纳新数据、事务回滚余量和安全余量；当前不会写库。"
          : "浏览器没有提供有效的站点容量估算；为避免写到一半耗尽空间，当前不会写库。"
      });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const restoreBackup = async () => {
    if (
      !pendingRestore?.safetyDownloadRequested ||
      !pendingRestore.safetyFileConfirmed ||
      !pendingRestore.replacementConfirmed ||
      pendingRestore.admission.state !== "admitted"
    ) return;
    setActiveOperation("restore");
    setBackupFeedback({ tone: "info", title: "正在事务恢复", message: "正在重新估算容量、由 Worker 复核结构与摘要，然后以单一事务替换十六个用户数据分区。请保持本页打开。" });
    try {
      const admission = await assessStorageCapacity({
        operation: "full_restore",
        logicalPayloadBytes: pendingRestore.logicalPayloadBytes,
        payloadDigest: pendingRestore.payloadDigest
      });
      setPendingRestore((current) => current ? { ...current, admission } : current);
      requireStorageAdmission(admission);
      const workerVerification = await verifyPreparedFullBackupOffMainThread(
        pendingRestore.preparation
      );
      const restored = await applyVerifiedFullBackup(caseRepository, workerVerification.verified);
      const restoredSettings = settingsFormFromRecord(restored.payload.appSettings[0]);
      setSettings(restoredSettings);
      updateLocalAppSettings(restoredSettings);
      setPendingRestore(null);
      const migration = restored.migratedFromFormatVersion
        ? `；来源 v${restored.migratedFromFormatVersion} 已迁移到 v${restored.manifest.formatVersion}`
        : "";
      try {
        await refreshLocalState();
      } catch (reason) {
        setBackupFeedback({
          tone: "info",
          title: "完整恢复已提交，概览刷新失败",
          message: `十六个用户数据分区的事务替换已经完成${migration}。${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页，核对最近案例和附件；不要重复恢复同一文件。`
        });
        return;
      }
      setBackupFeedback({
        tone: "success",
        title: "完整恢复成功",
        message: `十六个用户数据分区已完成事务替换并重新读取${migration}。建议重新打开工作台核对最近案例和附件。`
      });
    } catch (reason) {
      if (reason instanceof StorageAdmissionError) {
        setPendingRestore((current) => current ? {
          ...current,
          admission: reason.plan,
          replacementConfirmed: false
        } : current);
        setBackupFeedback({
          tone: "error",
          title: "提交前容量准入未通过",
          message: `${reason.message} 当前十六分区没有被写入；释放空间后请重新检查容量。`
        });
        return;
      }
      if (isStorageQuotaExceededError(reason)) {
        let rollbackConfirmed = false;
        try {
          const currentSnapshot = await caseRepository.readFullDataSnapshot();
          const current = await inspectFullBackupSnapshotOffMainThread(currentSnapshot, {
            appVersion: APP_VERSION
          });
          rollbackConfirmed = current.payloadDigest ===
            pendingRestore.preparation.currentSafetyBackup.digests.payload;
        } catch {
          // Do not claim rollback success when the read-only digest probe itself fails.
        }
        setPendingRestore((current) => current ? {
          ...current,
          replacementConfirmed: false
        } : current);
        setBackupFeedback({
          tone: "error",
          title: "浏览器配额不足，恢复事务已中止",
          message: rollbackConfirmed
            ? "写入时浏览器报告 QuotaExceededError；事务已回滚，并已重新核对当前十六分区摘要与安全备份一致。请释放设备或其他站点空间后重新预检。"
            : "写入时浏览器报告 QuotaExceededError；事务已中止，但当前页面未能完成回滚后摘要核对。请不要重复恢复，先重新打开数据页并核对现有案例与附件。"
        });
        return;
      }
      setBackupFeedback({
        tone: "error",
        title: "恢复未完成",
        message: `${errorMessage(reason, "事务恢复失败。")} 当前数据应保持原样；若页面提示数据已并发变化，请重新选择文件并生成新的安全备份。`
      });
    } finally {
      setActiveOperation(null);
      finishFeedback(backupFeedbackRef);
    }
  };

  const saveProfile = async () => {
    setActiveOperation("profile");
    setProfileFeedback(null);
    try {
      await caseRepository.saveResearcherProfile({
        displayName: profile.displayName.trim(),
        organization: optionalText(profile.organization),
        researchFocus: optionalText(profile.researchFocus)
      });
      try {
        await refreshLocalState();
      } catch (reason) {
        setProfileFeedback({
          tone: "info",
          title: "研究者资料已保存，概览刷新失败",
          message: `${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页确认显示；不要因本提示重复保存。`
        });
        return;
      }
      setProfileFeedback({ tone: "success", title: "研究者资料已保存", message: "资料仅保存在本机，并会进入完整 ZIP/JSON 备份。" });
    } catch (reason) {
      setProfileFeedback({ tone: "error", title: "研究者资料未保存", message: errorMessage(reason, "请检查姓名和字段长度。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const saveSettings = async () => {
    setActiveOperation("settings");
    setSettingsFeedback(null);
    try {
      await caseRepository.saveAppSettings(settings);
      updateLocalAppSettings(settings);
      try {
        await refreshLocalState();
      } catch (reason) {
        setSettingsFeedback({
          tone: "info",
          title: "本机偏好已保存，概览刷新失败",
          message: `${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页确认显示；不要因本提示重复保存。`
        });
        return;
      }
      setSettingsFeedback({ tone: "success", title: "本机偏好已保存", message: "默认时区、历法和信息密度会进入完整备份。" });
    } catch (reason) {
      setSettingsFeedback({ tone: "error", title: "本机偏好未保存", message: errorMessage(reason, "请检查 IANA 时区和选项。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const uploadAttachment = async () => {
    setActiveOperation("attachment_upload");
    setAttachmentFeedback(null);
    try {
      const file = await pickFile({ maxBytes: MAX_ATTACHMENT_BYTES });
      if (!file) return;
      await caseRepository.createAttachment({
        fileName: file.name,
        mediaType: canonicalFileMediaType(file.type),
        bytes: new Uint8Array(await file.blob.arrayBuffer()),
        description: optionalText(attachmentDescription)
      });
      setAttachmentDescription("");
      try {
        await refreshLocalState();
      } catch (reason) {
        setAttachmentFeedback({
          tone: "info",
          title: "附件已保存，列表刷新失败",
          message: `${file.name} 已经写入本机。${errorMessage(reason, "页面未能重新读取附件列表。")} 请重新打开本页确认；不要重复上传同一文件。`
        });
        return;
      }
      setAttachmentFeedback({ tone: "success", title: "附件已保存", message: `${file.name} 已校验并保存在本机，将进入完整备份。` });
    } catch (reason) {
      setAttachmentFeedback({ tone: "error", title: "附件未保存", message: errorMessage(reason, "附件读取或保存失败。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const downloadAttachment = async (attachment: AttachmentView) => {
    setActiveOperation("attachment_download");
    setAttachmentFeedback(null);
    try {
      const bytes = await caseRepository.readAttachmentBytes(attachment.id);
      if (!bytes) throw new Error("附件字节不存在；元数据与内容可能不一致。");
      const result = await saveBlobFile(attachment.fileName, bytesToBlob(bytes, attachment.mediaType));
      const delivery = resolveFileDelivery(result, "附件导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setAttachmentFeedback({ tone: "info", title: "已取消附件导出", message: delivery.message });
        return;
      }
      setAttachmentFeedback({
        tone: "success",
        title: result.status === "download_requested" ? "附件已请求下载" : "附件已保存",
        message: delivery.message
      });
    } catch (reason) {
      setAttachmentFeedback({ tone: "error", title: "附件下载未完成", message: errorMessage(reason, "无法读取附件字节。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const deleteAttachment = async (attachment: AttachmentView) => {
    setActiveOperation("attachment_delete");
    setAttachmentFeedback(null);
    try {
      await caseRepository.deleteAttachment(attachment.id);
      setAttachmentDeleteId(null);
      try {
        await refreshLocalState();
      } catch (reason) {
        setAttachmentFeedback({
          tone: "info",
          title: "附件已删除，列表刷新失败",
          message: `${attachment.fileName} 的元数据与字节已经删除。${errorMessage(reason, "页面未能重新读取附件列表。")} 请重新打开本页确认；不要重复执行删除。`
        });
        return;
      }
      setAttachmentFeedback({ tone: "success", title: "附件已永久删除", message: `${attachment.fileName} 的元数据与字节已从本机删除。` });
    } catch (reason) {
      setAttachmentFeedback({ tone: "error", title: "附件未删除", message: errorMessage(reason, "无法删除附件。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const chooseCoreBackup = async () => {
    setActiveOperation("core_preflight");
    setCoreFeedback(null);
    setCorePreview(null);
    try {
      const file = await pickFile({ accept: ".json,application/json", maxBytes: 50 * 1024 * 1024 });
      if (!file) return;
      const result = await preflightCoreBackup(await decodeUtf8Blob(file.blob));
      setCorePreview({
        fileName: file.name,
        cases: result.manifest.counts.cases,
        revisions: result.manifest.counts.revisions,
        formatVersion: result.manifest.formatVersion
      });
      setCoreFeedback({ tone: "success", title: "旧 core 文件预检通过", message: "这里只读验证格式、摘要和关联，不会显示或执行覆盖恢复。" });
    } catch (reason) {
      setCoreFeedback({ tone: "error", title: "旧 core 文件预检失败", message: errorMessage(reason, "文件不是受支持的 core 备份。") });
    } finally {
      setActiveOperation(null);
    }
  };

  const closeDeleteAll = () => {
    setDeleteAllOpen(false);
    setDeleteAllText("");
    window.setTimeout(() => deleteTriggerRef.current?.focus(), 0);
  };

  const deleteAllData = async () => {
    if (deleteAllText !== DELETE_CONFIRMATION) return;
    setActiveOperation("delete_all");
    setDeleteFeedback(null);
    try {
      await caseRepository.clearAll();
      const clearedSettings = defaultSettingsForm();
      setSettings(clearedSettings);
      updateLocalAppSettings(clearedSettings);
      let draftCleanup: ControlledWindowDraftCleanupResult | null = null;
      let draftCleanupError: string | null = null;
      try {
        draftCleanup = await clearControlledWindowResearchQueryDrafts();
      } catch (reason) {
        draftCleanupError = errorMessage(reason, "跨标签页临时草稿清理失败。");
      }
      const cleanupSummary = draftCleanupSummary(draftCleanup, draftCleanupError);
      const cleanupComplete = draftCleanup?.complete === true;
      setPendingRestore(null);
      setCorePreview(null);
      setDeleteAllOpen(false);
      setDeleteAllText("");
      try {
        await refreshLocalState();
      } catch (reason) {
        setDeleteFeedback({
          tone: "info",
          title: cleanupComplete
            ? "十六分区与临时草稿已清，概览刷新失败"
            : "十六分区已删除，临时草稿或概览未完整确认",
          message: `十六个本地数据分区的删除事务已经提交。${cleanupSummary}${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页确认空状态；下载目录中的备份文件不受影响。`
        });
        return;
      }
      setDeleteFeedback({
        tone: cleanupComplete ? "success" : "info",
        title: cleanupComplete
          ? "十六个本地数据分区与临时检索草稿已全部清除"
          : "十六个本地数据分区已删除，部分临时草稿未确认",
        message: `命盘案例、修订、候选组、笔记、事件、视图、文献、引用、来源权利、研究者资料、应用设置、附件字节、规则包仓库及活动选择器均已永久删除。${cleanupSummary}下载目录中的备份文件不受影响。`
      });
    } catch (reason) {
      setDeleteFeedback({ tone: "error", title: "完整清空未完成", message: errorMessage(reason, "删除事务失败；请重新读取本页确认数据状态。") });
    } finally {
      setActiveOperation(null);
      finishFeedback(deleteFeedbackRef);
    }
  };

  const incomingCounts = pendingRestore ? normalizeCounts(pendingRestore.preparation.incoming.manifest.counts) : null;
  const safetyCounts = pendingRestore ? normalizeCounts(pendingRestore.preparation.currentSafetyBackup.manifest.counts) : null;
  const sourceMigrationNotice = pendingRestore ? migrationNotice(pendingRestore.preparation) : null;

  return (
    <div className="page page--data-management">
      <PageHeading
        eyebrow="Local data control"
        title="数据管理与完整备份"
        description="十六个用户数据分区统一进入版本化备份。导入先做只读的结构与内部一致性检查；它不认证来源。恢复前必须下载当前安全备份并完成两项明确确认。"
        actions={<AppLink href="/settings" className="secondary-action"><ArrowLeft aria-hidden="true" />返回设置与诊断</AppLink>}
      />

      <section className="data-card data-overview" aria-labelledby="data-overview-title" aria-busy={activeOperation === "loading"}>
        <header className="data-card-heading">
          <div className="data-card-icon"><Database aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Data inventory</p>
            <h2 id="data-overview-title">此浏览器中的十六个用户数据分区</h2>
            <p>{totalCount} 条记录仅保存在当前浏览器；无账号、无云同步。</p>
          </div>
          <StatusPill tone="info">IndexedDB · 本机</StatusPill>
        </header>
        <dl className="partition-count-grid">
          {PARTITIONS.map((item) => (
            <div key={item.key}><dt>{item.label}</dt><dd>{counts[item.key]}</dd></div>
          ))}
        </dl>
        <div className="data-storage-note">
          <HardDrive aria-hidden="true" />
          <p>{storageUsage
            ? `浏览器已报告本站约使用 ${formatBytes(storageUsage.usage)} / 配额 ${formatBytes(storageUsage.quota)}。配额不是永久保留承诺。`
            : "浏览器未提供可靠的站点存储用量；卸载浏览器、清站点数据或设备故障仍可能造成丢失。"}</p>
        </div>
      </section>

      <section className="data-card" aria-labelledby="full-backup-title" aria-busy={activeOperation ? ["export_zip", "export_json", "preflight", "capacity_check", "safety_backup", "restore"].includes(activeOperation) : false}>
        <header className="data-card-heading">
          <div className="data-card-icon"><FileArchive aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Full backup v1.2</p>
            <h2 id="full-backup-title">完整 ZIP 导出与事务恢复</h2>
            <p>
              ZIP 是主格式，压缩文件上限 {Math.round(DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES / 1024 / 1024)} MiB；
              JSON 只用于兼容，上限 {Math.round(DEFAULT_MAX_FULL_BACKUP_JSON_BYTES / 1024 / 1024)} MiB。
              生成、解压、JSON 解析和完整性预检在独立 Worker 中完成；任何损坏、未知字段、摘要、关联或容量错误都会在写库前拒绝。
            </p>
          </div>
        </header>

        <div className="data-sensitive-warning" role="note">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>备份是未加密的敏感明文</strong>
            <p>包含出生资料、案例别名、研究笔记、事件、用户文献、研究者资料、应用设置及附件原始字节。任何拿到文件的人都可能读取内容；请只保存到你信任的位置。</p>
          </div>
        </div>

        <div className="data-action-row">
          <button type="button" className="primary-action" disabled={busy || deleteAllOpen} onClick={() => void exportZip()}>
            <FileArchive aria-hidden="true" />{activeOperation === "export_zip" ? "正在生成 ZIP" : "导出完整 ZIP"}
          </button>
          <button type="button" className="secondary-action" disabled={busy || deleteAllOpen} onClick={() => void exportJson()}>
            <FileText aria-hidden="true" />{activeOperation === "export_json" ? "正在生成 JSON" : "导出兼容 JSON"}
          </button>
          <button type="button" className="secondary-action" disabled={busy || deleteAllOpen} onClick={() => void chooseBackup()}>
            <Upload aria-hidden="true" />{activeOperation === "preflight" ? "正在预检" : "选择 ZIP / JSON 预检"}
          </button>
        </div>

        <FeedbackMessage feedback={backupFeedback} focusRef={backupFeedbackRef} />

        {pendingRestore && incomingCounts && safetyCounts ? (
          <div ref={preflightRef} className="restore-preflight" tabIndex={-1} aria-labelledby="restore-preflight-title">
            <header>
              <div>
                <p className="eyebrow">Structure checked · no write yet</p>
                <h3 id="restore-preflight-title">预检通过，尚未写入</h3>
                <p>{pendingRestore.fileName} · {formatBytes(pendingRestore.fileSize)}</p>
              </div>
              <StatusPill tone="warning">全量替换</StatusPill>
            </header>
            <p className="restore-migration-note"><strong>来源边界：</strong>预检只证明格式、摘要和内部关联一致，不证明文件来自谁或内容真实。只恢复你自己生成或明确可信来源的备份。</p>
            <dl className="restore-manifest-facts">
              <div><dt>来源格式</dt><dd>v{pendingRestore.preparation.incoming.manifest.formatVersion}</dd></div>
              <div><dt>来源应用</dt><dd>{pendingRestore.preparation.incoming.manifest.appVersion}</dd></div>
              <div><dt>导出时间</dt><dd>{pendingRestore.preparation.incoming.manifest.exportedAt}</dd></div>
              <div><dt>迁移</dt><dd>{pendingRestore.preparation.incoming.migratedFromFormatVersion ? `从 v${pendingRestore.preparation.incoming.migratedFromFormatVersion}` : "无需迁移"}</dd></div>
            </dl>
            {sourceMigrationNotice ? <p className="restore-migration-note"><strong>旧格式迁移：</strong>{sourceMigrationNotice}</p> : null}

            <div className="data-storage-note" role="note">
              <HardDrive aria-hidden="true" />
              <div>
                <p><strong>{pendingRestore.admission.state === "admitted"
                  ? "容量准入已通过"
                  : pendingRestore.admission.state === "insufficient"
                    ? "容量准入未通过：可用空间不足"
                    : "容量准入未通过：无法可靠估算"}</strong></p>
                <p>{pendingRestore.admission.availableBytes !== null && pendingRestore.admission.requiredAdditionalBytes !== null
                  ? `浏览器报告可用 ${formatBytes(pendingRestore.admission.availableBytes)}；保守写入预算需要 ${formatBytes(pendingRestore.admission.requiredAdditionalBytes)}。`
                  : "浏览器没有返回有效的站点用量与配额；失败关闭，不会尝试破坏性写入。"} 容量检查只是负向安全门，不是空间预留；提交前会再次检查。</p>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => void recheckPendingCapacity()}>
                  {activeOperation === "capacity_check" ? "正在重新检查容量" : "重新检查容量"}
                </button>
              </div>
            </div>

            <ul className="restore-count-list" aria-label="十六分区恢复差异">
              {PARTITIONS.map((item) => {
                const delta = incomingCounts[item.key] - safetyCounts[item.key];
                return (
                  <li key={item.key}>
                    <strong>{item.label}</strong>
                    <dl>
                      <div><dt>当前</dt><dd>{safetyCounts[item.key]}</dd></div>
                      <div><dt>导入</dt><dd>{incomingCounts[item.key]}</dd></div>
                      <div><dt>变化</dt><dd className={delta === 0 ? "is-neutral" : delta > 0 ? "is-positive" : "is-negative"}>{delta > 0 ? `+${delta}` : delta}</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div className="restore-confirmation" aria-labelledby="restore-confirmation-title">
              <h4 id="restore-confirmation-title">恢复前安全门</h4>
              <button type="button" className="secondary-action" disabled={busy} onClick={() => void downloadSafetyBackup()}>
                <Download aria-hidden="true" />{pendingRestore.safetyDownloadRequested ? "重新下载当前安全备份" : "先下载当前安全备份"}
              </button>
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  disabled={!pendingRestore.safetyDownloadRequested || pendingRestore.admission.state !== "admitted" || busy}
                  checked={pendingRestore.safetyFileConfirmed}
                  onChange={(event) => setPendingRestore((current) => current ? { ...current, safetyFileConfirmed: event.target.checked } : current)}
                />
                <span><strong>我已确认安全备份文件保存成功并可以打开</strong><small>仅触发浏览器下载不等于文件已落盘。</small></span>
              </label>
              <label className="privacy-toggle privacy-toggle--danger">
                <input
                  type="checkbox"
                  disabled={!pendingRestore.safetyDownloadRequested || pendingRestore.admission.state !== "admitted" || busy}
                  checked={pendingRestore.replacementConfirmed}
                  onChange={(event) => setPendingRestore((current) => current ? { ...current, replacementConfirmed: event.target.checked } : current)}
                />
                <span><strong>我理解恢复会替换此浏览器中的全部十六个用户数据分区</strong><small>这是整库替换，不是合并；完成后无法在应用内撤销。</small></span>
              </label>
              <div className="data-action-row">
                <button
                  type="button"
                  className="danger-action"
                  disabled={busy || pendingRestore.admission.state !== "admitted" || !pendingRestore.safetyDownloadRequested || !pendingRestore.safetyFileConfirmed || !pendingRestore.replacementConfirmed}
                  onClick={() => void restoreBackup()}
                >
                  <ShieldCheck aria-hidden="true" />{activeOperation === "restore" ? "正在事务恢复" : "确认替换并恢复"}
                </button>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => { setPendingRestore(null); setBackupFeedback(null); }}>
                  取消恢复
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="data-two-column">
        <section className="data-card" aria-labelledby="researcher-profile-title" aria-busy={activeOperation === "profile"}>
          <header className="data-card-heading data-card-heading--compact">
            <div className="data-card-icon"><UserRound aria-hidden="true" /></div>
            <div><p className="eyebrow">Researcher profile</p><h2 id="researcher-profile-title">研究者资料</h2></div>
          </header>
          <form className="data-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
            <label className="field"><span>显示名称</span><input required maxLength={80} value={profile.displayName} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
            <label className="field"><span>机构（可选）</span><input maxLength={120} value={profile.organization} onChange={(event) => setProfile((current) => ({ ...current, organization: event.target.value }))} /></label>
            <label className="field data-form-span"><span>研究方向（可选）</span><textarea maxLength={500} rows={3} value={profile.researchFocus} onChange={(event) => setProfile((current) => ({ ...current, researchFocus: event.target.value }))} /></label>
            <button type="submit" className="primary-action" disabled={dataMutationLocked || !profile.displayName.trim()}><Save aria-hidden="true" />{activeOperation === "profile" ? "正在保存" : "保存研究者资料"}</button>
          </form>
          <FeedbackMessage feedback={profileFeedback} />
        </section>

        <section className="data-card" aria-labelledby="app-settings-title" aria-busy={activeOperation === "settings"}>
          <header className="data-card-heading data-card-heading--compact">
            <div className="data-card-icon"><Settings2 aria-hidden="true" /></div>
            <div><p className="eyebrow">Local preferences</p><h2 id="app-settings-title">本机研究偏好</h2></div>
          </header>
          <form className="data-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
            <label className="field data-form-span"><span>默认 IANA 时区</span><input required maxLength={100} placeholder="Asia/Shanghai" value={settings.defaultTimeZone} onChange={(event) => setSettings((current) => ({ ...current, defaultTimeZone: event.target.value }))} /></label>
            <label className="field"><span>默认历法</span><select value={settings.defaultCalendarType} onChange={(event) => setSettings((current) => ({ ...current, defaultCalendarType: event.target.value as SettingsForm["defaultCalendarType"] }))}><option value="gregorian">公历</option><option value="lunar">农历</option></select></label>
            <label className="field"><span>信息密度</span><select value={settings.preferredDensity} onChange={(event) => setSettings((current) => ({ ...current, preferredDensity: event.target.value as SettingsForm["preferredDensity"] }))}><option value="comfortable">舒适</option><option value="compact">紧凑</option></select></label>
            <button type="submit" className="primary-action" disabled={dataMutationLocked || !settings.defaultTimeZone.trim()}><Save aria-hidden="true" />{activeOperation === "settings" ? "正在保存" : "保存本机偏好"}</button>
          </form>
          <FeedbackMessage feedback={settingsFeedback} />
        </section>
      </div>

      <section className="data-card" aria-labelledby="attachments-title" aria-busy={activeOperation ? activeOperation.startsWith("attachment_") : false}>
        <header className="data-card-heading">
          <div className="data-card-icon"><Paperclip aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Attachment library</p>
            <h2 id="attachments-title">附件库</h2>
            <p>单文件上限 10 MiB；文件名、媒体类型、描述、关联和原始字节都进入完整备份。</p>
          </div>
          <StatusPill tone="info">{attachments.length} 个</StatusPill>
        </header>
        <div className="attachment-upload-row">
          <label className="field"><span>本次附件说明（可选）</span><input maxLength={300} value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} /></label>
          <button type="button" className="primary-action" disabled={dataMutationLocked} onClick={() => void uploadAttachment()}><Upload aria-hidden="true" />{activeOperation === "attachment_upload" ? "正在保存附件" : "选择并保存附件"}</button>
        </div>
        <FeedbackMessage feedback={attachmentFeedback} />
        {attachments.length ? (
          <ul className="attachment-list">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <div className="attachment-main">
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{attachment.fileName}</strong>
                    <small>{formatBytes(attachment.byteLength)} · {attachment.mediaType}{attachment.linked ? " · 已关联研究对象" : " · 未关联"}</small>
                    {attachment.description ? <p>{attachment.description}</p> : null}
                    {attachment.contentHash ? <code title={attachment.contentHash}>{attachment.contentHash.slice(0, 16)}…</code> : null}
                  </div>
                </div>
                {attachmentDeleteId === attachment.id ? (
                  <div className="attachment-delete-confirm" role="group" aria-label={`确认删除附件 ${attachment.fileName}`}>
                    <strong>永久删除此附件及字节？</strong>
                    <button type="button" className="danger-action" disabled={dataMutationLocked} onClick={() => void deleteAttachment(attachment)}>确认删除</button>
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => setAttachmentDeleteId(null)}>取消</button>
                  </div>
                ) : (
                  <div className="attachment-actions">
                    <button type="button" className="secondary-action" disabled={busy || deleteAllOpen} onClick={() => void downloadAttachment(attachment)}><Download aria-hidden="true" />下载</button>
                    <button type="button" className="secondary-action" disabled={dataMutationLocked} onClick={() => setAttachmentDeleteId(attachment.id)}><Trash2 aria-hidden="true" />删除</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="data-empty-state">尚无附件。保存的附件会按内容摘要检查内部一致性，并随完整备份跨设备迁移；摘要不认证文件来源。</p>}
      </section>

      <details className="data-card legacy-backup-tools">
        <summary><FileText aria-hidden="true" /><span><strong>旧版 core 备份兼容检查</strong><small>只读预检，不提供直接覆盖入口</small></span></summary>
        <div className="legacy-backup-body" aria-busy={activeOperation === "core_preflight"}>
          <p>core 文件只含 Case/Revision，不是完整备份。这里仅验证冻结格式、摘要和关联；为避免绕过十六分区安全门，本页不会直接写入旧 core 文件。</p>
          <button type="button" className="secondary-action" disabled={dataMutationLocked} onClick={() => void chooseCoreBackup()}><Upload aria-hidden="true" />{activeOperation === "core_preflight" ? "正在只读预检" : "选择旧 core JSON 预检"}</button>
          <FeedbackMessage feedback={coreFeedback} />
          {corePreview ? <dl className="restore-manifest-facts"><div><dt>文件</dt><dd>{corePreview.fileName}</dd></div><div><dt>格式</dt><dd>core v{corePreview.formatVersion}</dd></div><div><dt>案例</dt><dd>{corePreview.cases}</dd></div><div><dt>修订</dt><dd>{corePreview.revisions}</dd></div></dl> : null}
        </div>
      </details>

      <section className="data-card data-danger-zone" aria-labelledby="delete-all-title" aria-busy={activeOperation === "delete_all"}>
        <header className="data-card-heading">
          <div className="data-card-icon"><AlertTriangle aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Danger zone</p>
            <h2 id="delete-all-title">永久删除此浏览器中的全部十六分区数据</h2>
            <p id="delete-all-description">会删除命盘案例、命盘修订、未知时辰候选组、研究笔记、事件、保存视图、用户文献、结构化引用、来源权利记录、研究者资料、应用设置、附件原始字节、规则包仓库、活动选择器、两类时间迁移凭证与 Revision 计算收据。还会请求当前所有受控标签页删除本应用的临时检索草稿；没有返回确认的标签页会单独列出，不会被视为清理成功。此操作无法撤销。</p>
          </div>
        </header>
        {!deleteAllOpen ? (
          <button ref={deleteTriggerRef} type="button" className="danger-action" disabled={busy || pendingRestore !== null} onClick={() => { setDeleteFeedback(null); setDeleteAllOpen(true); }}>
            <Trash2 aria-hidden="true" />开始完整清空
          </button>
        ) : (
          <div className="delete-all-confirm" role="group" aria-labelledby="delete-confirm-title" aria-describedby="delete-all-description" onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.preventDefault(); closeDeleteAll(); } }}>
            <strong id="delete-confirm-title">输入“{DELETE_CONFIRMATION}”以解锁</strong>
            <label className="field"><span>确认文字</span><input ref={deleteInputRef} autoComplete="off" value={deleteAllText} onChange={(event) => setDeleteAllText(event.target.value)} /></label>
            <div className="data-action-row">
              <button type="button" className="danger-action" disabled={busy || deleteAllText !== DELETE_CONFIRMATION} onClick={() => void deleteAllData()}>{activeOperation === "delete_all" ? "正在删除十六分区" : "永久删除全部数据"}</button>
              <button type="button" className="secondary-action" disabled={busy} onClick={closeDeleteAll}>取消</button>
            </div>
          </div>
        )}
        <FeedbackMessage feedback={deleteFeedback} focusRef={deleteFeedbackRef} />
      </section>
    </div>
  );
}
