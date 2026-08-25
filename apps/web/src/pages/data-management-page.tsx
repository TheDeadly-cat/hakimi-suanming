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
import { decodeUtf8Blob, pickFile, saveBlobFile, webReportExportPort } from "@hakimi/platform";
import { caseRepository } from "@hakimi/storage";
import { PageHeading } from "../components/page-heading";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact,
  type PreparedFileDeliveryResolution
} from "../components/prepared-file-delivery-dialog";
import { StatusPill } from "../components/status-pill";
import { APP_VERSION } from "../lib/app-version";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
} from "../lib/bazi-citation-observation-lifecycle-attachment-purpose";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { formatDateTime } from "../lib/format";
import {
  clearFullBackupExportMarker,
  markFullBackupExportedAt,
  readLastFullBackupExportedAt
} from "../lib/backup-health";
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
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import {
  assessStorageCapacity,
  isStorageQuotaExceededError,
  requireStorageAdmission,
  StorageAdmissionError,
  type StorageAdmissionPlan
} from "../lib/storage-capacity-gate";
import "./data-management-page.css";

const MAX_BACKUP_BYTES = Math.max(
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES
);
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
  | "attachment_page"
  | "attachment_download"
  | "attachment_delete"
  | "core_preflight"
  | "delete_all";

const BACKUP_OPERATIONS: ReadonlySet<Operation> = new Set([
  "export_zip",
  "export_json",
  "preflight",
  "capacity_check",
  "safety_backup",
  "restore"
]);

const POST_COMMIT_BLOCKED_OPERATIONS: ReadonlySet<Operation> = new Set([
  "restore",
  "profile",
  "settings",
  "attachment_upload",
  "attachment_delete",
  "delete_all"
]);

const OPERATION_LABELS: Record<Operation, string> = {
  loading: "正在核对本机数据",
  export_zip: "正在生成完整 ZIP",
  export_json: "正在生成兼容 JSON",
  preflight: "正在只读预检备份",
  capacity_check: "正在重新检查恢复容量",
  safety_backup: "正在生成恢复前安全备份",
  restore: "正在执行事务恢复",
  profile: "正在保存研究者资料",
  settings: "正在保存本机偏好",
  attachment_upload: "正在保存附件",
  attachment_page: "正在读取下一页附件元数据",
  attachment_download: "正在交付附件",
  attachment_delete: "正在永久删除附件",
  core_preflight: "正在只读检查旧 core 文件",
  delete_all: "正在永久清空本机数据"
};

type Feedback = {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
};

type DestructiveCommitIssue = {
  operation: "restore" | "delete_all";
  title: string;
  message: string;
  referenceLabel: string;
  referenceValue: string;
};

type BackupExportReceipt = Readonly<{
  format: "ZIP" | "JSON";
  fileName: string;
  deliveryStatus: "saved" | "requested";
  receiptCreatedAt: string;
  payloadDigest: string;
  canonicalJsonByteLength: number;
  outputByteLength: number;
}>;

type GeneratedBackupArtifact = Readonly<{
  blob: Blob;
  payloadDigest: string;
  canonicalJsonByteLength: number;
  outputByteLength: number;
}>;

type PreparedDataDelivery =
  | Readonly<{
      kind: "full_backup";
      artifact: PreparedFileArtifact;
      format: "ZIP" | "JSON";
      payloadDigest: string;
      canonicalJsonByteLength: number;
      outputByteLength: number;
    }>
  | Readonly<{
      kind: "safety_backup";
      artifact: PreparedFileArtifact;
      restoreTarget: PendingRestore;
    }>;

type DeleteBackupDecision = "verified_backup" | "accept_without_backup";

type PendingRestore = {
  fileName: string;
  fileSize: number;
  preparation: FullBackupImportPreparation;
  logicalPayloadBytes: number;
  payloadDigest: string;
  admission: StorageAdmissionPlan;
  capacityCheckFailed: boolean;
  safetyDownloadRequested: boolean;
  safetyFileConfirmed: boolean;
  replacementConfirmed: boolean;
};

function isSameRestoreTarget(current: PendingRestore | null, target: PendingRestore): current is PendingRestore {
  return current?.payloadDigest === target.payloadDigest &&
    current.preparation.currentSafetyBackup.digests.payload ===
      target.preparation.currentSafetyBackup.digests.payload;
}

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

type AttachmentDeleteTarget = Pick<
  AttachmentView,
  "id" | "fileName" | "mediaType" | "description" | "contentHash"
>;

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

function isReservedLifecycleAttachmentMediaType(attachment: Pick<AttachmentView, "mediaType">): boolean {
  return attachment.mediaType === BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE;
}

function isProtectedLifecycleAttachment(
  attachment: Pick<AttachmentView, "mediaType" | "description">
): boolean {
  return isReservedLifecycleAttachmentMediaType(attachment)
    && attachment.description === BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION;
}

function errorMessage(reason: unknown, fallback: string): string {
  return safeVisibleErrorMessage(reason, fallback);
}

function bytesToBlob(bytes: Uint8Array, mediaType: string): Blob {
  return new Blob([Uint8Array.from(bytes).buffer], { type: mediaType });
}

function assertGeneratedBackupArtifact(
  artifact: GeneratedBackupArtifact,
  expectedMediaType: "application/zip" | "application/json",
  maxOutputBytes: number
): void {
  const mediaType = artifact.blob.type.split(";", 1)[0]?.trim().toLowerCase();
  if (
    !/^[0-9a-f]{64}$/u.test(artifact.payloadDigest) ||
    !Number.isSafeInteger(artifact.canonicalJsonByteLength) ||
    artifact.canonicalJsonByteLength <= 0 ||
    artifact.canonicalJsonByteLength > DEFAULT_MAX_FULL_BACKUP_JSON_BYTES ||
    !Number.isSafeInteger(artifact.outputByteLength) ||
    artifact.outputByteLength <= 0 ||
    artifact.outputByteLength > maxOutputBytes ||
    artifact.blob.size !== artifact.outputByteLength ||
    mediaType !== expectedMediaType
  ) {
    throw new Error("完整备份 Worker 返回的摘要、字节上限或 MIME 工程回执不一致。");
  }
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
        <strong>{safeVisibleText(feedback.title, "数据操作状态", 160)}</strong>
        <p>{safeVisibleText(feedback.message, "本机数据操作状态不可用。", 1200)}</p>
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
      <strong>{safeVisibleText(feedback.title, "数据操作状态", 160)}</strong>
      <p>{safeVisibleText(feedback.message, "本机数据操作状态不可用。", 1200)}</p>
    </div>
  );
}

const DATA_MANAGEMENT_SECTION_IDS = [
  "data-overview-title",
  "full-backup-title",
  "researcher-profile-title",
  "attachments-title",
  "delete-all-title"
] as const;

type DataManagementSectionId = typeof DATA_MANAGEMENT_SECTION_IDS[number];

export function DataManagementPage() {
  const updateLocalAppSettings = useUpdateLocalAppSettings();
  const [activeOperation, setActiveOperation] = useState<Operation | null>("loading");
  const [localStateStatus, setLocalStateStatus] = useState<"loading" | "ready" | "error">("loading");
  const [localStateError, setLocalStateError] = useState<string | null>(null);
  const [counts, setCounts] = useState<PartitionCounts>(EMPTY_COUNTS);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [lastFullBackupExportedAt, setLastFullBackupExportedAt] = useState<string | null>(() =>
    readLastFullBackupExportedAt(window.localStorage)
  );
  const [profile, setProfile] = useState<ProfileForm>({ displayName: "", organization: "", researchFocus: "" });
  const [settings, setSettings] = useState<SettingsForm>(defaultSettingsForm);
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [attachmentTotalCount, setAttachmentTotalCount] = useState(0);
  const [attachmentNextOffset, setAttachmentNextOffset] = useState<number | null>(null);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState<AttachmentDeleteTarget | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [corePreview, setCorePreview] = useState<CorePreflightView | null>(null);
  const [backupFeedback, setBackupFeedback] = useState<Feedback | null>(null);
  const [backupExportReceipt, setBackupExportReceipt] = useState<BackupExportReceipt | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedDataDelivery | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback | null>(null);
  const [attachmentFeedback, setAttachmentFeedback] = useState<Feedback | null>(null);
  const [coreFeedback, setCoreFeedback] = useState<Feedback | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback | null>(null);
  const [destructiveCommitIssue, setDestructiveCommitIssue] = useState<DestructiveCommitIssue | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState("");
  const [deleteBackupDecision, setDeleteBackupDecision] = useState<DeleteBackupDecision | null>(null);
  const [activeDataSection, setActiveDataSection] = useState<DataManagementSectionId>("data-overview-title");

  const preflightRef = useRef<HTMLDivElement>(null);
  const backupFeedbackRef = useRef<HTMLDivElement>(null);
  const deleteFeedbackRef = useRef<HTMLDivElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteBackupChoiceRef = useRef<HTMLInputElement>(null);
  const backupAbortRef = useRef<AbortController | null>(null);
  const restoreSubmissionRef = useRef(false);
  const destructiveWriteReturnedRef = useRef(false);
  const operationLockRef = useRef<Operation | null>("loading");
  const preparedDeliveryRef = useRef<PreparedDataDelivery | null>(null);
  const mountedRef = useRef(true);
  const refreshEpochRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      preparedDeliveryRef.current = null;
      refreshEpochRef.current += 1;
      backupAbortRef.current?.abort();
      backupAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== "function") return;

    const sectionIdByTarget = new Map<Element, DataManagementSectionId>();
    for (const sectionId of DATA_MANAGEMENT_SECTION_IDS) {
      const heading = document.getElementById(sectionId);
      if (!heading) continue;
      sectionIdByTarget.set(heading.closest("section") ?? heading, sectionId);
    }
    if (!sectionIdByTarget.size) return;

    const observer = new window.IntersectionObserver((entries) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      if (!visibleEntries.length) return;
      const readingLine = Math.max(96, window.innerHeight * 0.16);
      visibleEntries.sort((left, right) => (
        Math.abs(left.boundingClientRect.top - readingLine) - Math.abs(right.boundingClientRect.top - readingLine)
      ));
      const nextSection = sectionIdByTarget.get(visibleEntries[0]!.target);
      if (nextSection) setActiveDataSection(nextSection);
    }, {
      rootMargin: "-88px 0px -55% 0px",
      threshold: [0, 0.01, 0.25]
    });

    for (const target of sectionIdByTarget.keys()) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const beginOperation = useCallback((operation: Operation): boolean => {
    if (
      !mountedRef.current
      || operationLockRef.current !== null
      || preparedDeliveryRef.current !== null
      || (destructiveWriteReturnedRef.current && POST_COMMIT_BLOCKED_OPERATIONS.has(operation))
    ) return false;
    operationLockRef.current = operation;
    setActiveOperation(operation);
    return true;
  }, []);

  const finishOperation = useCallback((operation: Operation) => {
    if (operationLockRef.current !== operation) return;
    operationLockRef.current = null;
    if (mountedRef.current) setActiveOperation(null);
  }, []);

  const localStateReadable = localStateStatus === "ready";
  const deliveryOpen = preparedDelivery !== null;
  const busy = activeOperation !== null || deliveryOpen;
  const dataMutationLocked = busy
    || !localStateReadable
    || deleteAllOpen
    || pendingRestore !== null
    || destructiveCommitIssue !== null;
  const totalCount = useMemo(
    () => PARTITIONS.reduce((sum, item) => sum + counts[item.key], 0),
    [counts]
  );
  const attachmentBytes = useMemo(
    () => attachments.reduce((sum, attachment) => sum + attachment.byteLength, 0),
    [attachments]
  );
  const storageUsageRatio = storageUsage && storageUsage.quota > 0
    ? Math.min(1, storageUsage.usage / storageUsage.quota)
    : null;

  const refreshLocalState = useCallback(async () => {
    const refreshEpoch = ++refreshEpochRef.current;
    const refreshIsCurrent = (): boolean =>
      mountedRef.current && refreshEpochRef.current === refreshEpoch;
    setLocalStateStatus("loading");
    setLocalStateError(null);
    setCounts(EMPTY_COUNTS);
    setStorageUsage(null);
    setProfile({ displayName: "", organization: "", researchFocus: "" });
    setSettings(defaultSettingsForm());
    setAttachments([]);
    setAttachmentDeleteTarget(null);
    setAttachmentTotalCount(0);
    setAttachmentNextOffset(null);
    try {
      const [overview, researcherProfile, appSettings, attachmentPage] = await Promise.all([
        caseRepository.readLocalDataOverview(),
        caseRepository.readResearcherProfile(),
        caseRepository.readAppSettings(),
        caseRepository.readAttachmentMetadataPage()
      ]);
      if (!refreshIsCurrent()) return;
      const nextCounts = normalizeCounts(overview.counts);
      if (nextCounts.attachments !== attachmentPage.totalCount) {
        throw new Error("附件总数在概览与分页读取之间发生变化；请重新读取本页。");
      }
      setCounts(nextCounts);
      if (researcherProfile) {
        setProfile({
          displayName: researcherProfile.displayName,
          organization: researcherProfile.organization ?? "",
          researchFocus: researcherProfile.researchFocus ?? ""
        });
      }
      const nextSettings = appSettings
        ? settingsFormFromRecord(appSettings)
        // A restore from an older backup or a full clear can remove the singleton.
        // Do not leave the deleted device preferences active in the app shell or
        // visible in this form.
        : defaultSettingsForm();
      setSettings(nextSettings);
      updateLocalAppSettings(nextSettings);
      setAttachments(attachmentPage.items.map(attachmentView));
      setAttachmentTotalCount(attachmentPage.totalCount);
      setAttachmentNextOffset(attachmentPage.nextOffset);
      try {
        const estimate = await navigator.storage?.estimate?.();
        if (!refreshIsCurrent()) return;
        setStorageUsage(estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null);
      } catch {
        // Storage estimates are optional browser telemetry. They must never turn a
        // successful database read or committed mutation into a reported failure.
        if (!refreshIsCurrent()) return;
        setStorageUsage(null);
      }
      setLocalStateStatus("ready");
    } catch (reason) {
      if (!refreshIsCurrent()) return;
      setLocalStateError(errorMessage(reason, "无法读取本地数据。请不要清除浏览器数据，并重新读取本页。"));
      setLocalStateStatus("error");
      throw reason;
    }
  }, [updateLocalAppSettings]);

  useEffect(() => {
    let active = true;
    void refreshLocalState()
      .catch(() => undefined)
      .finally(() => {
        if (active) finishOperation("loading");
      });
    return () => {
      active = false;
    };
  }, [finishOperation, refreshLocalState]);

  const retryLocalState = () => {
    if (!beginOperation("loading")) return;
    void refreshLocalState()
      .catch(() => undefined)
      .finally(() => finishOperation("loading"));
  };

  const loadMoreAttachmentMetadata = async () => {
    if (attachmentNextOffset === null || !beginOperation("attachment_page")) return;
    setAttachmentFeedback(null);
    const expectedOffset = attachmentNextOffset;
    const expectedRefreshEpoch = refreshEpochRef.current;
    const loadIsCurrent = (): boolean =>
      mountedRef.current && refreshEpochRef.current === expectedRefreshEpoch;
    try {
      const page = await caseRepository.readAttachmentMetadataPage({ offset: expectedOffset });
      if (!loadIsCurrent()) return;
      if (page.offset !== expectedOffset || page.totalCount !== attachmentTotalCount) {
        throw new Error("附件列表在分页读取期间发生变化；请重新读取本页后再继续。");
      }
      const existingIds = new Set(attachments.map((attachment) => attachment.id));
      const nextItems = page.items.map(attachmentView);
      if (nextItems.some((attachment) => existingIds.has(attachment.id))) {
        throw new Error("附件分页顺序在读取期间发生变化；请重新读取本页后再继续。");
      }
      setAttachments((current) => [...current, ...nextItems]);
      setAttachmentNextOffset(page.nextOffset);
      setAttachmentFeedback({
        tone: "info",
        title: page.nextOffset === null ? "本次附件分页已到末页" : "已读取下一页附件元数据",
        message: "分页不是跨窗口原子快照，也没有解码或校验全部附件正文；发生其他窗口变更时请重新读取本页，下载仍按所选附件摘要逐件核验。"
      });
    } catch (reason) {
      if (!loadIsCurrent()) return;
      setAttachmentFeedback({
        tone: "error",
        title: "下一页附件元数据未载入",
        message: errorMessage(reason, "请重新读取本页；当前列表不会冒充完整附件清单。")
      });
    } finally {
      finishOperation("attachment_page");
    }
  };

  useEffect(() => {
    if (pendingRestore) preflightRef.current?.focus();
  }, [pendingRestore?.fileName]);

  useEffect(() => {
    if (!deleteAllOpen) return;
    deleteBackupChoiceRef.current?.focus();
  }, [deleteAllOpen]);

  const finishFeedback = (ref: React.RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => {
      if (mountedRef.current) ref.current?.focus();
    }, 0);
  };

  const showPreparedDelivery = (delivery: PreparedDataDelivery) => {
    preparedDeliveryRef.current = delivery;
    setPreparedDelivery(delivery);
  };

  const closePreparedDelivery = () => {
    preparedDeliveryRef.current = null;
    setPreparedDelivery(null);
  };

  const recordFullBackupHealth = (exportedAt: string): boolean => {
    try {
      markFullBackupExportedAt(window.localStorage, exportedAt);
      setLastFullBackupExportedAt(exportedAt);
      return true;
    } catch {
      // File delivery has already completed. A secondary reminder marker must
      // not turn that completed delivery into a false export failure.
      setLastFullBackupExportedAt(null);
      return false;
    }
  };

  const invalidateFullBackupHealth = (): boolean => {
    let persistedMarkerCleared = true;
    try {
      clearFullBackupExportMarker(window.localStorage);
    } catch {
      persistedMarkerCleared = false;
    }
    // A marker for the replaced/deleted dataset is invalid in this mounted
    // page even if browser policy prevents removing its persisted copy.
    setLastFullBackupExportedAt(null);
    setBackupExportReceipt(null);
    return persistedMarkerCleared;
  };

  const handlePreparedDeliveryResolution = (event: PreparedFileDeliveryResolution) => {
    const delivery = preparedDeliveryRef.current;
    if (!delivery || delivery.artifact !== event.artifact) return;

    if (delivery.kind === "full_backup") {
      const formatLabel = delivery.format === "ZIP" ? "完整 ZIP" : "兼容 JSON";
      if (event.resolution.kind === "cancelled") {
        setBackupFeedback({
          tone: "info",
          title: `已取消${formatLabel}导出`,
          message: event.resolution.message
        });
        return;
      }
      const receiptCreatedAt = new Date().toISOString();
      const markerRecorded = event.resolution.kind === "completed"
        ? recordFullBackupHealth(receiptCreatedAt)
        : null;
      setBackupExportReceipt({
        format: delivery.format,
        fileName: delivery.artifact.filename,
        deliveryStatus: event.resolution.kind === "completed" ? "saved" : "requested",
        receiptCreatedAt,
        payloadDigest: delivery.payloadDigest,
        canonicalJsonByteLength: delivery.canonicalJsonByteLength,
        outputByteLength: delivery.outputByteLength
      });
      setBackupFeedback({
        tone: event.resolution.kind === "completed" && markerRecorded ? "success" : "info",
        title: event.resolution.kind === "completed"
          ? `${formatLabel}已保存`
          : `${formatLabel}已生成并请求下载`,
        message: `${event.resolution.message} ${delivery.format === "ZIP" ? "文件包含十六个用户数据分区及附件字节。" : "该格式适合旧工具互操作，但附件会以内嵌编码增大体积。"}${markerRecorded === false ? " 文件交付已经完成，但浏览器拒绝写入本机备份提醒时间；当前页不会把该提醒标记当作文件证据。" : ""}`
      });
      return;
    }

    if (event.resolution.kind === "cancelled") {
      setBackupFeedback({
        tone: "info",
        title: "已取消安全备份导出",
        message: `${event.resolution.message} 恢复仍保持锁定。`
      });
      return;
    }
    setPendingRestore((current) => isSameRestoreTarget(current, delivery.restoreTarget) ? {
      ...current,
      safetyDownloadRequested: true,
      safetyFileConfirmed: false,
      replacementConfirmed: false
    } : current);
    setBackupFeedback({
      tone: event.resolution.kind === "completed" ? "success" : "info",
      title: event.resolution.kind === "completed" ? "安全备份已保存" : "安全备份已生成并请求下载",
      message: `${event.resolution.message} 仍请人工确认文件可以打开；每次重新导出都会重置两个恢复确认。`
    });
  };

  const exportFullBackup = async (format: "zip" | "json") => {
    const isZip = format === "zip";
    const operation: Operation = isZip ? "export_zip" : "export_json";
    const formatLabel = isZip ? "完整 ZIP" : "兼容 JSON";
    if (!beginOperation(operation)) return;
    backupAbortRef.current?.abort();
    const controller = new AbortController();
    backupAbortRef.current = controller;
    setBackupFeedback(null);
    let deliveryPrepared = false;
    try {
      const snapshot = await caseRepository.readFullDataSnapshot({ signal: controller.signal });
      const artifact = await createFullBackupArtifactOffMainThread(
        snapshot,
        { appVersion: APP_VERSION },
        format,
        controller.signal
      );
      assertGeneratedBackupArtifact(
        artifact,
        isZip ? "application/zip" : "application/json",
        isZip ? DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES : DEFAULT_MAX_FULL_BACKUP_JSON_BYTES
      );
      const fileName = `hakimi-full-backup-${new Date().toISOString().slice(0, 10)}.${format}`;
      const preparedArtifact: PreparedFileArtifact = {
        blob: artifact.blob,
        filename: fileName,
        title: `${formatLabel}本机备份`,
        description: "含本机十六个用户数据分区与附件原始字节的未加密敏感快照；工程摘要不认证内容、来源、专家真值或公开发布授权。",
        sharePolicy: "blocked_sensitive"
      };
      showPreparedDelivery({
        kind: "full_backup",
        artifact: preparedArtifact,
        format: isZip ? "ZIP" : "JSON",
        payloadDigest: artifact.payloadDigest,
        canonicalJsonByteLength: artifact.canonicalJsonByteLength,
        outputByteLength: artifact.outputByteLength
      });
      deliveryPrepared = true;
      setBackupFeedback({
        tone: "info",
        title: `${formatLabel}已在内存中准备`,
        message: "尚未调用任何外部文件通道；请在文件交付窗口再次明确选择保存或下载，并以经校验回执及人工文件核对为准。"
      });
    } catch (reason) {
      if (
        controller.signal.aborted ||
        (typeof reason === "object" && reason !== null && (
          (reason as { code?: string }).code === "BACKUP_WORKER_CANCELLED" ||
          (reason as { name?: string }).name === "AbortError"
        ))
      ) {
        setBackupFeedback({ tone: "info", title: isZip ? "已取消完整 ZIP 生成" : "已取消兼容 JSON 生成", message: "没有写入任何备份标记或文件；可稍后重新导出。" });
        return;
      }
      setBackupFeedback({ tone: "error", title: `${isZip ? "ZIP" : "JSON"} 备份未完成`, message: errorMessage(reason, `无法生成${formatLabel}备份。`) });
    } finally {
      if (backupAbortRef.current === controller) backupAbortRef.current = null;
      finishOperation(operation);
      if (!deliveryPrepared) finishFeedback(backupFeedbackRef);
    }
  };

  const exportZip = () => exportFullBackup("zip");
  const exportJson = () => exportFullBackup("json");

  const cancelBackupExport = () => {
    const controller = backupAbortRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    backupAbortRef.current = null;
    setBackupFeedback({ tone: "info", title: "正在取消完整备份生成", message: "只读数据库事务或 Worker 会在当前不可中断步骤结束后尽快停止；当前不会写入数据库或备份标记。" });
  };

  const chooseBackup = async () => {
    if (!beginOperation("preflight")) return;
    // A confirmation must never survive a backup preflight/restore boundary and
    // later target a different attachment record that happens to reuse the ID.
    setAttachmentDeleteTarget(null);
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
        capacityCheckFailed: false,
        safetyDownloadRequested: false,
        safetyFileConfirmed: false,
        replacementConfirmed: false
      });
      setBackupFeedback({
        tone: admission.state === "admitted" ? "success" : "error",
        title: admission.state === "admitted"
          ? "结构预检与容量准入已通过，尚未写入"
          : "结构预检通过，容量准入未通过",
        message: admission.state === "admitted"
          ? "备份已在 Worker 中完成只读结构与内部一致性检查，浏览器容量初筛也已通过；提交前仍会重新估算。请核对十六分区差异，并先下载当前数据安全备份。"
          : "备份结构预检通过，但浏览器容量准入未通过；当前不会写库。请释放空间或改用可提供可靠容量估算的浏览器后重新检查。"
      });
    } catch (reason) {
      setPendingRestore(null);
      setBackupFeedback({ tone: "error", title: "备份预检未通过", message: errorMessage(reason, "文件未通过完整性预检；当前数据未被改动。") });
    } finally {
      finishOperation("preflight");
      finishFeedback(backupFeedbackRef);
    }
  };

  const downloadSafetyBackup = async () => {
    if (!pendingRestore) return;
    const restoreTarget = pendingRestore;
    if (!beginOperation("safety_backup")) return;
    setBackupFeedback(null);
    setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
      ...current,
      safetyDownloadRequested: false,
      safetyFileConfirmed: false,
      replacementConfirmed: false
    } : current);
    let deliveryPrepared = false;
    try {
      const artifact = await archiveFullBackupEnvelopeOffMainThread(
        restoreTarget.preparation.currentSafetyBackup
      );
      assertGeneratedBackupArtifact(
        artifact,
        "application/zip",
        DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES
      );
      const fileName = `hakimi-before-restore-${new Date().toISOString().slice(0, 10)}.zip`;
      const preparedArtifact: PreparedFileArtifact = {
        blob: artifact.blob,
        filename: fileName,
        title: "恢复前本机安全备份",
        description: "与当前恢复目标绑定的整库安全快照；文件未确认保存并可打开前，恢复门禁继续关闭。",
        sharePolicy: "blocked_sensitive"
      };
      showPreparedDelivery({
        kind: "safety_backup",
        artifact: preparedArtifact,
        restoreTarget
      });
      deliveryPrepared = true;
      setBackupFeedback({
        tone: "info",
        title: "安全备份已在内存中准备",
        message: "尚未调用外部文件通道；请在交付窗口再次选择保存或下载。收到经校验回执后仍需人工确认文件可打开，恢复门禁才会继续推进。"
      });
    } catch (reason) {
      setBackupFeedback({ tone: "error", title: "安全备份未完成", message: errorMessage(reason, "无法生成恢复前安全备份；恢复仍保持锁定。") });
    } finally {
      finishOperation("safety_backup");
      if (!deliveryPrepared) finishFeedback(backupFeedbackRef);
    }
  };

  const recheckPendingCapacity = async () => {
    if (!pendingRestore) return;
    const restoreTarget = pendingRestore;
    if (!beginOperation("capacity_check")) return;
    setBackupFeedback(null);
    try {
      const admission = await assessStorageCapacity({
        operation: "full_restore",
        logicalPayloadBytes: restoreTarget.logicalPayloadBytes,
        payloadDigest: restoreTarget.payloadDigest
      });
      setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
        ...current,
        admission,
        capacityCheckFailed: false,
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
    } catch (reason) {
      setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
        ...current,
        capacityCheckFailed: true,
        replacementConfirmed: false
      } : current);
      setBackupFeedback({
        tone: "error",
        title: "容量重新检查失败",
        message: `${errorMessage(reason, "浏览器未能完成站点容量估算。")} 旧准入结果已失效，恢复保持锁定；请稍后再次检查。`
      });
    } finally {
      finishOperation("capacity_check");
      finishFeedback(backupFeedbackRef);
    }
  };

  const restoreBackup = async () => {
    const restoreTarget = pendingRestore;
    let committedRestore: DestructiveCommitIssue | null = null;
    let restoreStorageCallStarted = false;
    if (
      !restoreTarget?.safetyDownloadRequested ||
      !restoreTarget.safetyFileConfirmed ||
      !restoreTarget.replacementConfirmed ||
      restoreTarget.capacityCheckFailed ||
      restoreTarget.admission.state !== "admitted"
    ) return;
    if (!beginOperation("restore")) return;
    setBackupFeedback({ tone: "info", title: "正在事务恢复", message: "正在重新估算容量、由 Worker 复核结构与摘要，然后以单一事务替换十六个用户数据分区。请保持本页打开。" });
    try {
      const admission = await assessStorageCapacity({
        operation: "full_restore",
        logicalPayloadBytes: restoreTarget.logicalPayloadBytes,
        payloadDigest: restoreTarget.payloadDigest
      });
      setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
        ...current,
        admission,
        capacityCheckFailed: false
      } : current);
      requireStorageAdmission(admission);
      const workerVerification = await verifyPreparedFullBackupOffMainThread(
        restoreTarget.preparation
      );
      restoreStorageCallStarted = true;
      const restored = await applyVerifiedFullBackup(caseRepository, workerVerification.verified);
      committedRestore = {
        operation: "restore",
        title: "完整恢复事务已返回，正在核对后处理",
        message: "十六个用户数据分区的替换调用已经返回。完成概览重读前，本页不会开放新的数据写入或重复恢复。",
        referenceLabel: "导入 payload 摘要",
        referenceValue: restoreTarget.payloadDigest
      };
      restoreStorageCallStarted = false;
      destructiveWriteReturnedRef.current = true;
      setDestructiveCommitIssue(committedRestore);
      const backupMarkerCleared = invalidateFullBackupHealth();
      const markerNotice = backupMarkerCleared
        ? ""
        : " 旧数据集的本机备份提醒标记未能从浏览器存储删除；当前页已将它失效，但重新打开后仍可能显示旧时间。";
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
        setDestructiveCommitIssue({
          ...committedRestore,
          title: "完整恢复已提交，概览尚未核对",
          message: `事务替换已经完成，但页面未能重新读取本地概览：${errorMessage(reason, "未知刷新错误")}。请重新打开本页核对，不要重复恢复同一文件。`
        });
        setBackupFeedback({
          tone: "info",
          title: "完整恢复已提交，概览刷新失败",
          message: `十六个用户数据分区的事务替换已经完成${migration}。${markerNotice}${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页，核对最近案例和附件；不要重复恢复同一文件。`
        });
        return;
      }
      setBackupFeedback({
        tone: "success",
        title: "完整恢复成功",
        message: `十六个用户数据分区已完成事务替换并重新读取${migration}。${markerNotice}建议重新打开工作台核对最近案例和附件。`
      });
      destructiveWriteReturnedRef.current = false;
      setDestructiveCommitIssue(null);
    } catch (reason) {
      if (committedRestore) {
        setPendingRestore(null);
        setDestructiveCommitIssue({
          ...committedRestore,
          title: "完整恢复已提交，页面后处理未完成",
          message: `${errorMessage(reason, "恢复后的页面状态同步失败。")} 仓库调用已经返回；请重新打开本页核对，不要重复恢复同一文件。`
        });
        setBackupFeedback({
          tone: "info",
          title: "完整恢复已提交，等待重新核对",
          message: "页面已锁定新的数据写入。完整备份导出等只读交付仍可使用。"
        });
        return;
      }
      if (reason instanceof StorageAdmissionError) {
        setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
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
            restoreTarget.preparation.currentSafetyBackup.digests.payload;
        } catch {
          // Do not claim rollback success when the read-only digest probe itself fails.
        }
        if (rollbackConfirmed) {
          setPendingRestore((current) => isSameRestoreTarget(current, restoreTarget) ? {
            ...current,
            replacementConfirmed: false
          } : current);
        } else {
          destructiveWriteReturnedRef.current = true;
          setPendingRestore(null);
          invalidateFullBackupHealth();
          setDestructiveCommitIssue({
            operation: "restore",
            title: "恢复事务已中止，回滚摘要尚未核对",
            message: "浏览器报告 QuotaExceededError，但只读摘要探针未能确认当前十六分区仍等于恢复前快照。页面已关闭新的数据写入和重复恢复；请重新打开本页核对案例、附件与分区清单。",
            referenceLabel: "应保留的恢复前摘要",
            referenceValue: restoreTarget.preparation.currentSafetyBackup.digests.payload
          });
        }
        setBackupFeedback({
          tone: "error",
          title: rollbackConfirmed
            ? "浏览器配额不足，恢复事务已回滚"
            : "浏览器配额不足，回滚摘要尚未核对",
          message: rollbackConfirmed
            ? "写入时浏览器报告 QuotaExceededError；事务已回滚，并已重新核对当前十六分区摘要与安全备份一致。请释放设备或其他站点空间后重新预检。"
            : "写入时浏览器报告 QuotaExceededError；事务已中止，但当前页面未能完成回滚后摘要核对。旧数据集的备份提醒已失效，新的数据写入保持锁定；请重新打开数据页核对现有案例与附件。"
        });
        return;
      }
      if (restoreStorageCallStarted) {
        const detail = errorMessage(reason, "恢复存储调用没有返回可确认结果。");
        destructiveWriteReturnedRef.current = true;
        setPendingRestore(null);
        invalidateFullBackupHealth();
        setDestructiveCommitIssue({
          operation: "restore",
          title: "恢复存储调用异常，提交结果未知",
          message: `恢复事务已经发往本地仓库，但页面没有收到可证明提交或回滚的结果：${detail}。当前页已关闭新的数据写入和重复恢复；请重新打开本页核对案例、附件与十六分区清单。`,
          referenceLabel: "目标 payload 摘要",
          referenceValue: restoreTarget.payloadDigest
        });
        setBackupFeedback({
          tone: "info",
          title: "恢复结果未知，等待重新核对",
          message: "这不是恢复失败结论，也不是恢复成功结论。旧数据集的备份提醒已失效；不要再次提交同一备份。"
        });
        return;
      }
      setBackupFeedback({
        tone: "error",
        title: "恢复未完成",
        message: `${errorMessage(reason, "事务恢复失败。")} 当前数据应保持原样；若页面提示数据已并发变化，请重新选择文件并生成新的安全备份。`
      });
    } finally {
      finishOperation("restore");
      finishFeedback(backupFeedbackRef);
    }
  };

  const submitRestore = () => {
    if (restoreSubmissionRef.current) return;
    restoreSubmissionRef.current = true;
    void restoreBackup().finally(() => {
      restoreSubmissionRef.current = false;
    });
  };

  const saveProfile = async () => {
    if (!beginOperation("profile")) return;
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
      finishOperation("profile");
    }
  };

  const saveSettings = async () => {
    if (!beginOperation("settings")) return;
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
      finishOperation("settings");
    }
  };

  const uploadAttachment = async () => {
    if (!beginOperation("attachment_upload")) return;
    setAttachmentFeedback(null);
    try {
      const file = await pickFile({ maxBytes: MAX_ATTACHMENT_BYTES });
      if (!file) return;
      const mediaType = canonicalFileMediaType(file.type);
      if (mediaType === BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE) {
        setAttachmentFeedback({
          tone: "error",
          title: "请使用专用 lifecycle 审阅库",
          message: "该 MIME 已保留给引用适用性 lifecycle 敏感工件；通用附件入口不会创建、覆盖或降级处理它。请回到引用适用性 lifecycle 专用 workbench 完成验真与明确保存。"
        });
        return;
      }
      await caseRepository.createAttachment({
        fileName: file.name,
        mediaType,
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
      finishOperation("attachment_upload");
    }
  };

  const downloadAttachment = async (attachment: AttachmentView) => {
    if (isReservedLifecycleAttachmentMediaType(attachment)) {
      setAttachmentFeedback({
        tone: "error",
        title: "受保护 lifecycle 工件未通过通用路径处理",
        message: "保留 lifecycle MIME 只能在专用审阅库中按 purpose、摘要与 canonical sidecar 重新验真后导出。"
      });
      return;
    }
    if (!beginOperation("attachment_download")) return;
    setAttachmentFeedback(null);
    try {
      const bytes = await caseRepository.readAttachmentBytes(attachment.id, {
        expectedContentHash: attachment.contentHash
      });
      if (!bytes) throw new Error("附件字节不存在；元数据与内容可能不一致。");
      const result = await saveBlobFile(attachment.fileName, bytesToBlob(bytes, attachment.mediaType));
      const delivery = resolveFileDelivery(result, "附件导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setAttachmentFeedback({ tone: "info", title: "已取消附件导出", message: delivery.message });
        return;
      }
      setAttachmentFeedback({
        tone: delivery.kind === "completed" ? "success" : "info",
        title: delivery.kind === "completed" ? "附件已保存" : "附件已请求下载",
        message: delivery.message
      });
    } catch (reason) {
      setAttachmentFeedback({ tone: "error", title: "附件下载未完成", message: errorMessage(reason, "无法读取附件字节。") });
    } finally {
      finishOperation("attachment_download");
    }
  };

  const deleteAttachment = async (attachment: AttachmentDeleteTarget) => {
    if (isReservedLifecycleAttachmentMediaType(attachment)) {
      setAttachmentDeleteTarget(null);
      setAttachmentFeedback({
        tone: "error",
        title: "受保护 lifecycle 工件未通过通用路径删除",
        message: "保留 lifecycle MIME 只能在专用审阅库中完成 purpose 核对、两步确认与摘要 CAS 删除。"
      });
      return;
    }
    if (!beginOperation("attachment_delete")) return;
    setAttachmentFeedback(null);
    try {
      await caseRepository.deleteAttachment(attachment.id, {
        expectedContentHash: attachment.contentHash
      });
      setAttachmentDeleteTarget(null);
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
      finishOperation("attachment_delete");
    }
  };

  const chooseCoreBackup = async () => {
    if (!beginOperation("core_preflight")) return;
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
      finishOperation("core_preflight");
    }
  };

  const closeDeleteAll = () => {
    setDeleteAllOpen(false);
    setDeleteAllText("");
    setDeleteBackupDecision(null);
    window.setTimeout(() => {
      if (mountedRef.current) deleteTriggerRef.current?.focus();
    }, 0);
  };

  const deleteAllData = async () => {
    if (deleteAllText !== DELETE_CONFIRMATION || deleteBackupDecision === null) return;
    if (!beginOperation("delete_all")) return;
    setDeleteFeedback(null);
    let committedDelete: DestructiveCommitIssue | null = null;
    let deleteStorageCallStarted = false;
    try {
      deleteStorageCallStarted = true;
      await caseRepository.clearAll();
      committedDelete = {
        operation: "delete_all",
        title: "完整清空事务已返回，正在核对后处理",
        message: "十六个用户数据分区的删除调用已经返回。完成临时草稿协调与空状态重读前，本页不会开放新的数据写入。",
        referenceLabel: "删除前本地记录",
        referenceValue: `${totalCount} 条 · ${counts.attachments} 个附件（已列 ${attachments.length} 条元数据）`
      };
      deleteStorageCallStarted = false;
      destructiveWriteReturnedRef.current = true;
      setDestructiveCommitIssue(committedDelete);
      const backupMarkerCleared = invalidateFullBackupHealth();
      const markerNotice = backupMarkerCleared
        ? ""
        : "旧数据集的本机备份提醒标记未能从浏览器存储删除；当前页已将它失效，但重新打开后仍可能显示旧时间。";
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
      setDeleteBackupDecision(null);
      try {
        await refreshLocalState();
      } catch (reason) {
        setDestructiveCommitIssue({
          ...committedDelete,
          title: "完整清空已提交，空状态尚未核对",
          message: `十六分区删除事务已经提交，但页面未能重新读取空状态：${errorMessage(reason, "未知刷新错误")}。请重新打开本页确认，不要重复执行删除。`
        });
        setDeleteFeedback({
          tone: "info",
          title: cleanupComplete
            ? "十六分区与临时草稿已清，概览刷新失败"
            : "十六分区已删除，临时草稿或概览未完整确认",
          message: `十六个本地数据分区的删除事务已经提交。${cleanupSummary}${markerNotice}${errorMessage(reason, "页面未能重新读取本地概览。")} 请重新打开本页确认空状态；下载目录中的备份文件不受影响。`
        });
        return;
      }
      setDeleteFeedback({
        tone: cleanupComplete ? "success" : "info",
        title: cleanupComplete
          ? "十六个本地数据分区与临时检索草稿已全部清除"
          : "十六个本地数据分区已删除，部分临时草稿未确认",
        message: `命盘案例、修订、候选组、笔记、事件、视图、文献、引用、来源权利、研究者资料、应用设置、附件字节、规则包仓库及活动选择器均已永久删除。${cleanupSummary}${markerNotice}下载目录中的备份文件不受影响。`
      });
      destructiveWriteReturnedRef.current = false;
      setDestructiveCommitIssue(null);
    } catch (reason) {
      if (committedDelete) {
        setDeleteAllOpen(false);
        setDeleteAllText("");
        setDeleteBackupDecision(null);
        setDestructiveCommitIssue({
          ...committedDelete,
          title: "完整清空已提交，页面后处理未完成",
          message: `${errorMessage(reason, "删除后的页面状态同步失败。")} 仓库调用已经返回；请重新打开本页核对，不要重复执行完整清空。`
        });
        setDeleteFeedback({
          tone: "info",
          title: "完整清空已提交，等待重新核对",
          message: "页面已锁定新的数据写入；下载目录中的备份文件不受影响。"
        });
        return;
      }
      if (deleteStorageCallStarted) {
        const detail = errorMessage(reason, "完整清空存储调用没有返回可确认结果。");
        destructiveWriteReturnedRef.current = true;
        setDeleteAllOpen(false);
        setDeleteAllText("");
        setDeleteBackupDecision(null);
        invalidateFullBackupHealth();
        setDestructiveCommitIssue({
          operation: "delete_all",
          title: "完整清空调用异常，提交结果未知",
          message: `删除事务已经发往本地仓库，但页面没有收到可证明提交或回滚的结果：${detail}。当前页已关闭新的数据写入和重复清空；请重新打开本页核对十六分区与附件清单。`,
          referenceLabel: "调用前本地记录",
          referenceValue: `${totalCount} 条 · ${counts.attachments} 个附件（已列 ${attachments.length} 条元数据）`
        });
        setDeleteFeedback({
          tone: "info",
          title: "完整清空结果未知，等待重新核对",
          message: "这不是删除失败结论，也不是清空成功结论。旧数据集的备份提醒已失效；不要再次执行完整清空。"
        });
        return;
      }
      setDeleteFeedback({ tone: "error", title: "完整清空未完成", message: errorMessage(reason, "删除事务失败；请重新读取本页确认数据状态。") });
    } finally {
      finishOperation("delete_all");
      finishFeedback(deleteFeedbackRef);
    }
  };

  const incomingCounts = pendingRestore ? normalizeCounts(pendingRestore.preparation.incoming.manifest.counts) : null;
  const safetyCounts = pendingRestore ? normalizeCounts(pendingRestore.preparation.currentSafetyBackup.manifest.counts) : null;
  const sourceMigrationNotice = pendingRestore ? migrationNotice(pendingRestore.preparation) : null;
  const backupHealthState = localStateStatus === "loading"
    ? "checking"
    : localStateStatus === "error"
      ? "unavailable"
      : lastFullBackupExportedAt
        ? "recorded"
        : totalCount > 0
          ? "attention"
          : "empty";
  const operationStatusState = destructiveCommitIssue
    ? "attention"
    : activeOperation
    ? "busy"
    : localStateStatus === "error"
      ? "error"
      : localStateStatus === "ready"
        ? "ready"
        : "checking";
  const operationStatusLabel = destructiveCommitIssue
    ? "破坏性事务结果等待重新核对"
    : activeOperation
    ? OPERATION_LABELS[activeOperation]
      : localStateStatus === "error"
        ? "本机清单不可用，写操作已锁定"
        : localStateStatus === "ready"
        ? "本机数据清单已读取，当前无操作"
        : "等待本机数据状态";
  const backupHealthLabel = backupHealthState === "recorded"
    ? "存在导出提醒"
    : backupHealthState === "attention"
      ? "有数据，建议先备份"
      : backupHealthState === "empty"
        ? "暂无资料"
        : "等待核对";
  const restoreGateStep = !pendingRestore
    ? null
    : !pendingRestore.safetyDownloadRequested
      ? 1
      : !pendingRestore.safetyFileConfirmed
        ? 2
        : !pendingRestore.replacementConfirmed
          ? 3
          : 4;

  return (
    <div
      className="page page--data-management"
      aria-busy={busy}
      data-release-family="legacy"
      data-schema-version="13"
      data-db-schema-version="13"
      data-evidence-authority="engineering-only"
      data-formal-validation-complete="false"
      data-scientific-validation-complete="false"
      data-mutation-mode="epoch-guarded"
      data-mutation-epoch-state={destructiveCommitIssue ? "reconciliation_required" : "not_bypassed"}
      data-write-mode={destructiveCommitIssue ? "reconciliation_required" : dataMutationLocked ? "locked" : "available"}
      data-operation={activeOperation ?? "idle"}
      data-backup-delivery-certainty={backupExportReceipt?.deliveryStatus ?? "none"}
      data-restore-gate-step={restoreGateStep ?? "none"}
      data-backup-health={backupHealthState}
      data-local-state={localStateStatus}
      data-release-identity="legacy-v13"
      data-target-schema="13"
      data-migration-id="null"
      data-mutation-epoch-bypassed="false"
      data-write-reconciliation-required={Boolean(destructiveCommitIssue)}
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-active-section={activeDataSection}
      data-delivery-open={deliveryOpen}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery.artifact}
          exportPort={webReportExportPort}
          onDeliveryResolution={handlePreparedDeliveryResolution}
          onClose={closePreparedDelivery}
        />
      ) : null}
      <div className="data-management-masthead">
        <PageHeading
          eyebrow="Local data control"
          title="数据管理与完整备份"
          description="十六个用户数据分区统一进入版本化备份。导入先做只读的结构与内部一致性检查；它不认证来源。恢复前必须下载当前安全备份并完成两项明确确认。"
          actions={(
            <AppLink
              href="/settings"
              className="secondary-action data-management-back-link"
              aria-disabled={busy ? true : undefined}
              title={activeOperation ? `请等待：${OPERATION_LABELS[activeOperation]}` : undefined}
              onClick={busy ? (event) => event.preventDefault() : undefined}
            >
              <ArrowLeft aria-hidden="true" />返回设置与诊断
            </AppLink>
          )}
        />
        <dl className="data-health-strip" aria-label="当前本机数据状态摘要">
          <div><dt>本地记录</dt><dd>{localStateStatus === "loading" ? "读取中" : localStateStatus === "error" ? "不可用" : totalCount}</dd></div>
          <div><dt>站点用量</dt><dd>{storageUsage ? formatBytes(storageUsage.usage) : "未报告"}</dd></div>
          <div data-state={backupHealthState}><dt>完整导出提醒</dt><dd title={lastFullBackupExportedAt ?? undefined}>{lastFullBackupExportedAt ? formatDateTime(lastFullBackupExportedAt) : !localStateReadable ? "待核对" : totalCount > 0 ? "待导出" : "暂无资料"}</dd></div>
        </dl>
      </div>

      <nav className="data-section-rail" aria-label="数据管理页内导航">
        <div className="data-section-rail-status" data-state={operationStatusState} role="status" aria-live="polite" aria-atomic="true">
          <span className="data-section-status-dot" aria-hidden="true" />
          <span><small>CONTROL STATUS</small><strong>{operationStatusLabel}</strong></span>
        </div>
        <div className="data-section-rail-links">
          <a href="#data-overview-title" aria-current={activeDataSection === "data-overview-title" ? "location" : undefined} onClick={() => setActiveDataSection("data-overview-title")}><span>01</span><strong>本地清单</strong><small>{localStateReadable ? `${totalCount} 条记录` : "尚未确认"}</small></a>
          <a href="#full-backup-title" data-state={backupHealthState} aria-current={activeDataSection === "full-backup-title" ? "location" : undefined} onClick={() => setActiveDataSection("full-backup-title")}><span>02</span><strong>完整备份</strong><small>{backupHealthLabel}</small></a>
          <a href="#researcher-profile-title" aria-current={activeDataSection === "researcher-profile-title" ? "location" : undefined} onClick={() => setActiveDataSection("researcher-profile-title")}><span>03</span><strong>资料与偏好</strong><small>本机设置</small></a>
          <a href="#attachments-title" aria-current={activeDataSection === "attachments-title" ? "location" : undefined} onClick={() => setActiveDataSection("attachments-title")}><span>04</span><strong>附件库</strong><small>{localStateReadable ? `${attachmentTotalCount} 个附件 · 已列 ${attachments.length}` : "尚未确认"}</small></a>
          <a href="#delete-all-title" data-state="danger" aria-current={activeDataSection === "delete-all-title" ? "location" : undefined} onClick={() => setActiveDataSection("delete-all-title")}><span>05</span><strong>完整清空</strong><small>不可撤销</small></a>
        </div>
      </nav>

      <section className="data-card data-overview" aria-labelledby="data-overview-title" aria-busy={localStateStatus === "loading"}>
        <header className="data-card-heading">
          <div className="data-card-icon"><Database aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Data inventory</p>
            <h2 id="data-overview-title">此浏览器中的十六个用户数据分区</h2>
            <p>{localStateReadable ? `${totalCount} 条记录仅保存在当前浏览器；无账号、无云同步。` : "正在确认当前浏览器的本地清单；未成功读取前不报告零记录。"}</p>
          </div>
          <StatusPill tone="info">IndexedDB · 本机</StatusPill>
        </header>
        {localStateStatus === "loading" ? <div className="data-overview-loading" role="status">正在核对十六个本地数据分区</div> : null}
        {localStateStatus === "error" ? (
          <div className="data-overview-unavailable" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div><strong>本机数据清单不可用</strong><p>{localStateError ?? "无法读取本地数据。"}</p><small>导出、恢复、资料写入、附件操作和完整清空均保持锁定；这不是空数据库结论。</small></div>
            <button type="button" className="secondary-action" disabled={busy} onClick={retryLocalState}>重新读取本地概览</button>
          </div>
        ) : null}
        <dl className="partition-count-grid">
          {PARTITIONS.map((item) => (
            <div key={item.key}><dt>{item.label}</dt><dd>{localStateReadable ? counts[item.key] : "—"}</dd></div>
          ))}
        </dl>
        <div className="data-storage-note">
          <HardDrive aria-hidden="true" />
          <div className="data-storage-copy">
            <p>{!localStateReadable
              ? "本地数据清单尚未成功读取；站点用量与配额暂不作为可用证据。"
              : storageUsage
              ? `浏览器已报告本站约使用 ${formatBytes(storageUsage.usage)} / 配额 ${formatBytes(storageUsage.quota)}。配额不是永久保留承诺。`
              : "浏览器未提供可靠的站点存储用量；卸载浏览器、清站点数据或设备故障仍可能造成丢失。"}</p>
            {storageUsageRatio !== null ? <div className="data-storage-meter"><meter min={0} max={1} value={storageUsageRatio} aria-label="浏览器报告的站点存储用量比例" /><small>{(storageUsageRatio * 100).toFixed(storageUsageRatio < 0.1 ? 1 : 0)}% · 仅为浏览器估算</small></div> : null}
          </div>
        </div>
      </section>

      {destructiveCommitIssue ? (
        <section
          className="data-destructive-commit-receipt"
          data-operation={destructiveCommitIssue.operation}
          data-result="reconciliation-required"
          role="alert"
          aria-labelledby="data-destructive-commit-title"
        >
          <header>
            <AlertTriangle aria-hidden="true" />
            <div><p className="eyebrow">Mutation epoch hold</p><h2 id="data-destructive-commit-title">{destructiveCommitIssue.title}</h2></div>
            <StatusPill tone="warning">结果待核对</StatusPill>
          </header>
          <p>{destructiveCommitIssue.message}</p>
          <dl><div><dt>事务</dt><dd>{destructiveCommitIssue.operation === "restore" ? "十六分区完整恢复" : "十六分区完整清空"}</dd></div><div><dt>{destructiveCommitIssue.referenceLabel}</dt><dd>{destructiveCommitIssue.referenceValue}</dd></div></dl>
          <div className="data-destructive-commit-actions">
            <button type="button" className="primary-action" onClick={() => window.location.reload()}>重新打开并核对</button>
            <AppLink href="/cases" className="secondary-action">打开案例库</AppLink>
          </div>
          <small>当前页持续保留写入协调锁。该回执只记录仓库调用边界，不把工程返回值冒充专家真值、备份文件证据或公开发布授权。</small>
        </section>
      ) : null}

      <section className="data-card data-backup-card" aria-labelledby="full-backup-title" aria-busy={activeOperation ? BACKUP_OPERATIONS.has(activeOperation) : false}>
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
          {activeOperation === "export_zip" || activeOperation === "export_json" ? (
            <button type="button" className="secondary-action" onClick={cancelBackupExport}>
              取消生成
            </button>
          ) : null}
          <button type="button" className="primary-action" disabled={busy || !localStateReadable || deleteAllOpen} aria-busy={activeOperation === "export_zip"} onClick={() => void exportZip()}>
            <FileArchive aria-hidden="true" />{activeOperation === "export_zip" ? "正在生成 ZIP" : "准备完整 ZIP"}
          </button>
          <button type="button" className="secondary-action" disabled={busy || !localStateReadable || deleteAllOpen} aria-busy={activeOperation === "export_json"} onClick={() => void exportJson()}>
            <FileText aria-hidden="true" />{activeOperation === "export_json" ? "正在生成 JSON" : "准备兼容 JSON"}
          </button>
          <button type="button" className="secondary-action" disabled={busy || !localStateReadable || deleteAllOpen || destructiveCommitIssue !== null} aria-busy={activeOperation === "preflight"} onClick={() => void chooseBackup()}>
            <Upload aria-hidden="true" />{activeOperation === "preflight" ? "正在预检" : "选择 ZIP / JSON 预检"}
          </button>
        </div>

        <FeedbackMessage feedback={backupFeedback} focusRef={backupFeedbackRef} />

        {backupExportReceipt ? (
          <section
            className="data-backup-receipt"
            data-delivery={backupExportReceipt.deliveryStatus}
            aria-labelledby="data-backup-receipt-title"
          >
            <header>
              <div>
                <p className="eyebrow">Generated artifact receipt</p>
                <h3 id="data-backup-receipt-title">最近一次完整备份工程回执</h3>
              </div>
              <span>{backupExportReceipt.deliveryStatus === "saved" ? "浏览器已确认保存" : "仅已请求下载"}</span>
            </header>
            <dl>
              <div><dt>格式</dt><dd>{backupExportReceipt.format}</dd></div>
              <div><dt>回执时间</dt><dd>{formatDateTime(backupExportReceipt.receiptCreatedAt)}</dd></div>
              <div><dt>交付状态</dt><dd>{backupExportReceipt.deliveryStatus === "saved" ? "saved" : "requested"}</dd></div>
              <div className="data-backup-receipt__file"><dt>文件名</dt><dd>{safeVisibleText(backupExportReceipt.fileName, "未命名备份", 240)}</dd></div>
              <div><dt>交付字节</dt><dd>{formatBytes(backupExportReceipt.outputByteLength)}</dd></div>
              <div><dt>规范 JSON</dt><dd>{formatBytes(backupExportReceipt.canonicalJsonByteLength)}</dd></div>
              <div className="data-backup-receipt__digest"><dt>Payload SHA-256</dt><dd><code>{safeVisibleText(backupExportReceipt.payloadDigest, "摘要不可显示", 160)}</code></dd></div>
            </dl>
            <p>{backupExportReceipt.deliveryStatus === "saved"
              ? "Worker 回执与交付 Blob 字节长度一致，浏览器也确认保存完成。该摘要只证明生成阶段的工程完整性，不认证研究内容或来源真值。"
              : "Worker 回执与交付 Blob 字节长度一致，但浏览器只接受了下载请求；这不能证明文件已经落盘，请人工核对下载目录和文件可读性。"}</p>
          </section>
        ) : null}

        {pendingRestore && incomingCounts && safetyCounts ? (
          <div ref={preflightRef} className="restore-preflight" tabIndex={-1} aria-labelledby="restore-preflight-title">
            <header>
              <div>
                <p className="eyebrow">Structure checked · no write yet</p>
                <h3 id="restore-preflight-title">预检通过，尚未写入</h3>
                <p>{safeVisibleText(pendingRestore.fileName, "未命名备份", 240)} · {formatBytes(pendingRestore.fileSize)}</p>
              </div>
              <StatusPill tone="warning">全量替换</StatusPill>
            </header>
            <p className="restore-migration-note"><strong>来源边界：</strong>预检只证明格式、摘要和内部关联一致，不证明文件来自谁或内容真实。只恢复你自己生成或明确可信来源的备份。</p>
            <dl className="restore-manifest-facts">
              <div><dt>来源格式</dt><dd>v{pendingRestore.preparation.incoming.manifest.formatVersion}</dd></div>
              <div><dt>来源应用</dt><dd>{safeVisibleText(pendingRestore.preparation.incoming.manifest.appVersion, "未知版本", 120)}</dd></div>
              <div><dt>导出时间</dt><dd>{safeVisibleText(pendingRestore.preparation.incoming.manifest.exportedAt, "未知时间", 120)}</dd></div>
              <div><dt>迁移</dt><dd>{pendingRestore.preparation.incoming.migratedFromFormatVersion ? `从 v${pendingRestore.preparation.incoming.migratedFromFormatVersion}` : "无需迁移"}</dd></div>
              <div><dt>导入摘要</dt><dd><code title={safeVisibleText(pendingRestore.payloadDigest, "摘要不可显示", 160)}>{safeVisibleText(pendingRestore.payloadDigest, "摘要不可显示", 16)}...</code></dd></div>
              <div><dt>当前摘要</dt><dd><code title={safeVisibleText(pendingRestore.preparation.currentSafetyBackup.digests.payload, "摘要不可显示", 160)}>{safeVisibleText(pendingRestore.preparation.currentSafetyBackup.digests.payload, "摘要不可显示", 16)}...</code></dd></div>
            </dl>
            {sourceMigrationNotice ? <p className="restore-migration-note"><strong>旧格式迁移：</strong>{safeVisibleText(sourceMigrationNotice, "迁移说明不可显示。", 800)}</p> : null}

            <div className="data-storage-note" role="note">
              <HardDrive aria-hidden="true" />
              <div>
                <p><strong>{pendingRestore.capacityCheckFailed
                  ? "容量重新检查失败"
                  : pendingRestore.admission.state === "admitted"
                  ? "容量准入已通过"
                  : pendingRestore.admission.state === "insufficient"
                    ? "容量准入未通过：可用空间不足"
                    : "容量准入未通过：无法可靠估算"}</strong></p>
                <p>{pendingRestore.capacityCheckFailed
                  ? "最近一次容量重新检查没有完成，现有准入结果不再用于解锁恢复。请再次检查；当前不会写库。"
                  : `${pendingRestore.admission.availableBytes !== null && pendingRestore.admission.requiredAdditionalBytes !== null
                    ? `浏览器报告可用 ${formatBytes(pendingRestore.admission.availableBytes)}；保守写入预算需要 ${formatBytes(pendingRestore.admission.requiredAdditionalBytes)}。`
                    : "浏览器没有返回有效的站点用量与配额；失败关闭，不会尝试破坏性写入。"} 容量检查只是负向安全门，不是空间预留；提交前会再次检查。`}</p>
                <button type="button" className="secondary-action" disabled={busy} aria-busy={activeOperation === "capacity_check"} onClick={() => void recheckPendingCapacity()}>
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
                      <div><dt>变化</dt><dd className={delta === 0 ? "is-neutral" : "is-changed"}>{delta > 0 ? `+${delta}` : delta}</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div className="restore-confirmation" aria-labelledby="restore-confirmation-title">
              <h4 id="restore-confirmation-title">恢复前安全门</h4>
              <ol className="restore-gate-progress" aria-label="恢复安全门进度">
                <li data-state={pendingRestore.safetyDownloadRequested ? "complete" : "current"} aria-current={restoreGateStep === 1 ? "step" : undefined}>
                  <span aria-hidden="true">1</span><div><strong>导出安全备份</strong><small>{pendingRestore.safetyDownloadRequested ? "已保存或已请求下载" : "尚未发起"}</small></div>
                </li>
                <li data-state={pendingRestore.safetyFileConfirmed ? "complete" : pendingRestore.safetyDownloadRequested ? "current" : "locked"} aria-current={restoreGateStep === 2 ? "step" : undefined}>
                  <span aria-hidden="true">2</span><div><strong>核验安全文件</strong><small>{pendingRestore.safetyFileConfirmed ? "已人工确认可打开" : pendingRestore.safetyDownloadRequested ? "等待人工核验" : "先完成安全备份导出"}</small></div>
                </li>
                <li data-state={pendingRestore.replacementConfirmed ? "complete" : pendingRestore.safetyFileConfirmed ? "current" : "locked"} aria-current={restoreGateStep === 3 ? "step" : undefined}>
                  <span aria-hidden="true">3</span><div><strong>确认整库替换</strong><small>{pendingRestore.replacementConfirmed ? "已明确确认" : pendingRestore.safetyFileConfirmed ? "等待明确确认" : "先核验安全文件"}</small></div>
                </li>
                <li data-state={pendingRestore.replacementConfirmed ? "current" : "locked"} aria-current={restoreGateStep === 4 ? "step" : undefined}>
                  <span aria-hidden="true">4</span><div><strong>提交恢复事务</strong><small>{activeOperation === "restore" ? "事务执行中" : pendingRestore.replacementConfirmed ? "等待最终提交" : "完成前三项后开放"}</small></div>
                </li>
              </ol>
              <button type="button" className="secondary-action" disabled={busy} onClick={() => void downloadSafetyBackup()}>
                <Download aria-hidden="true" />{pendingRestore.safetyDownloadRequested ? "重新准备当前安全备份" : "先准备当前安全备份"}
              </button>
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  disabled={!pendingRestore.safetyDownloadRequested || pendingRestore.capacityCheckFailed || pendingRestore.admission.state !== "admitted" || busy}
                  checked={pendingRestore.safetyFileConfirmed}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPendingRestore((current) => current ? {
                      ...current,
                      safetyFileConfirmed: checked,
                      ...(checked ? {} : { replacementConfirmed: false })
                    } : current);
                  }}
                />
                <span><strong>我已确认安全备份文件保存成功并可以打开</strong><small>仅触发浏览器下载不等于文件已落盘。</small></span>
              </label>
              <label className="privacy-toggle privacy-toggle--danger">
                <input
                  type="checkbox"
                  disabled={!pendingRestore.safetyDownloadRequested || !pendingRestore.safetyFileConfirmed || pendingRestore.capacityCheckFailed || pendingRestore.admission.state !== "admitted" || busy}
                  checked={pendingRestore.replacementConfirmed}
                  onChange={(event) => setPendingRestore((current) => current ? { ...current, replacementConfirmed: event.target.checked } : current)}
                />
                <span><strong>我理解恢复会替换此浏览器中的全部十六个用户数据分区</strong><small>这是整库替换，不是合并；完成后无法在应用内撤销。</small></span>
              </label>
              <div className="data-action-row">
                <button
                  type="button"
                  className="danger-action"
                  disabled={busy || pendingRestore.capacityCheckFailed || pendingRestore.admission.state !== "admitted" || !pendingRestore.safetyDownloadRequested || !pendingRestore.safetyFileConfirmed || !pendingRestore.replacementConfirmed}
                  aria-busy={activeOperation === "restore"}
                  onClick={submitRestore}
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
        <section className="data-card data-profile-card" aria-labelledby="researcher-profile-title" aria-busy={activeOperation === "profile"}>
          <header className="data-card-heading data-card-heading--compact">
            <div className="data-card-icon"><UserRound aria-hidden="true" /></div>
            <div><p className="eyebrow">Researcher profile</p><h2 id="researcher-profile-title">研究者资料</h2></div>
          </header>
          <form className="data-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
            <label className="field"><span>显示名称</span><input required maxLength={80} disabled={dataMutationLocked} value={profile.displayName} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
            <label className="field"><span>机构（可选）</span><input maxLength={120} disabled={dataMutationLocked} value={profile.organization} onChange={(event) => setProfile((current) => ({ ...current, organization: event.target.value }))} /></label>
            <label className="field data-form-span"><span>研究方向（可选）</span><textarea maxLength={500} rows={3} disabled={dataMutationLocked} value={profile.researchFocus} onChange={(event) => setProfile((current) => ({ ...current, researchFocus: event.target.value }))} /></label>
            <button type="submit" className="primary-action" disabled={dataMutationLocked || !profile.displayName.trim()} aria-busy={activeOperation === "profile"}><Save aria-hidden="true" />{activeOperation === "profile" ? "正在保存" : "保存研究者资料"}</button>
          </form>
          <FeedbackMessage feedback={profileFeedback} />
        </section>

        <section className="data-card data-preferences-card" aria-labelledby="app-settings-title" aria-busy={activeOperation === "settings"}>
          <header className="data-card-heading data-card-heading--compact">
            <div className="data-card-icon"><Settings2 aria-hidden="true" /></div>
            <div><p className="eyebrow">Local preferences</p><h2 id="app-settings-title">本机研究偏好</h2></div>
          </header>
          <form className="data-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
            <label className="field data-form-span"><span>默认 IANA 时区</span><input required maxLength={100} disabled={dataMutationLocked} placeholder="Asia/Shanghai" value={settings.defaultTimeZone} onChange={(event) => setSettings((current) => ({ ...current, defaultTimeZone: event.target.value }))} /></label>
            <label className="field"><span>默认历法</span><select value={settings.defaultCalendarType} disabled={dataMutationLocked} onChange={(event) => setSettings((current) => ({ ...current, defaultCalendarType: event.target.value as SettingsForm["defaultCalendarType"] }))}><option value="gregorian">公历</option><option value="lunar">农历</option></select></label>
            <label className="field"><span>信息密度</span><select value={settings.preferredDensity} disabled={dataMutationLocked} onChange={(event) => setSettings((current) => ({ ...current, preferredDensity: event.target.value as SettingsForm["preferredDensity"] }))}><option value="comfortable">舒适</option><option value="compact">紧凑</option></select></label>
            <button type="submit" className="primary-action" disabled={dataMutationLocked || !settings.defaultTimeZone.trim()} aria-busy={activeOperation === "settings"}><Save aria-hidden="true" />{activeOperation === "settings" ? "正在保存" : "保存本机偏好"}</button>
          </form>
          <FeedbackMessage feedback={settingsFeedback} />
        </section>
      </div>

      <section className="data-card data-attachments-card" aria-labelledby="attachments-title" aria-busy={activeOperation ? activeOperation.startsWith("attachment_") : false}>
        <header className="data-card-heading">
          <div className="data-card-icon"><Paperclip aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Attachment library</p>
            <h2 id="attachments-title">附件库</h2>
            <p>单文件上限 10 MiB；自动概览按页读取元数据，不会批量解码或哈希正文。下载时会按所选附件摘要逐件核验；完整备份仍包含原始字节。</p>
          </div>
          <StatusPill tone="info">{attachmentTotalCount === 0
            ? "0 个"
            : `${attachments.length}/${attachmentTotalCount} 个已列`}</StatusPill>
        </header>
        <div className="attachment-upload-row">
          <label className="field"><span>本次附件说明（可选）</span><input maxLength={300} disabled={dataMutationLocked} value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} /></label>
          <button type="button" className="primary-action" disabled={dataMutationLocked} aria-busy={activeOperation === "attachment_upload"} onClick={() => void uploadAttachment()}><Upload aria-hidden="true" />{activeOperation === "attachment_upload" ? "正在保存附件" : "选择并保存附件"}</button>
        </div>
        <FeedbackMessage feedback={attachmentFeedback} />
        {attachments.length ? (
          <>
            <ul className="attachment-list">
              {attachments.map((attachment) => (
              <li key={attachment.id}>
                <div className="attachment-main">
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{safeVisibleText(attachment.fileName, "未命名附件", 240)}</strong>
                    <small>{formatBytes(attachment.byteLength)} · {safeVisibleText(attachment.mediaType, "application/octet-stream", 200)}{attachment.linked ? " · 已关联研究对象" : " · 未关联"}</small>
                    {attachment.description ? <p>{safeVisibleText(attachment.description, "附件说明不可显示。", 600)}</p> : null}
                    {attachment.contentHash ? <code title={safeVisibleText(attachment.contentHash, "摘要不可显示", 160)}>{safeVisibleText(attachment.contentHash, "摘要不可显示", 16)}…</code> : null}
                  </div>
                </div>
                {isProtectedLifecycleAttachment(attachment) ? (
                  <div className="attachment-actions" role="note">
                    <p><strong>受保护的 lifecycle 审阅库工件</strong><br />通用下载与“永久删除”路径已关闭；请回到引用适用性 lifecycle 专用 workbench 进行验真、原字节导出或摘要 CAS 删除。</p>
                  </div>
                ) : isReservedLifecycleAttachmentMediaType(attachment) ? (
                  <div className="attachment-actions" role="alert">
                    <p><strong>保留 lifecycle MIME 的 purpose 不匹配</strong><br />为防止伪装或降级，通用下载与删除已失败关闭；请在专用 workbench 核对该本机记录。</p>
                  </div>
                ) : attachmentDeleteTarget?.id === attachment.id ? (
                    <div className="attachment-delete-confirm" role="group" aria-label={`确认删除附件 ${safeVisibleText(attachment.fileName, "未命名附件", 240)}`}>
                    <strong>永久删除此附件及字节？</strong>
                    <button type="button" className="danger-action" disabled={dataMutationLocked} onClick={() => {
                      const target = attachmentDeleteTarget;
                      if (target) void deleteAttachment(target);
                    }}>确认删除</button>
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => setAttachmentDeleteTarget(null)}>取消</button>
                  </div>
                ) : (
                  <div className="attachment-actions">
                    <button type="button" className="secondary-action" disabled={busy || deleteAllOpen} onClick={() => void downloadAttachment(attachment)}><Download aria-hidden="true" />下载</button>
                    <button type="button" className="secondary-action" disabled={dataMutationLocked} onClick={() => setAttachmentDeleteTarget({
                      id: attachment.id,
                      fileName: attachment.fileName,
                      mediaType: attachment.mediaType,
                      description: attachment.description,
                      contentHash: attachment.contentHash
                    })}><Trash2 aria-hidden="true" />删除</button>
                  </div>
                )}
              </li>
              ))}
            </ul>
            <div className="data-action-row">
              <p>本次分页已列 {attachments.length}/{attachmentTotalCount} 个附件元数据；每页是独立只读事务，跨窗口变化后需重新读取。总数来自最近概览，总原始字节没有在自动概览中全量读取。</p>
              {attachmentNextOffset !== null ? (
                <button
                  type="button"
                  className="secondary-action"
                  disabled={busy || deleteAllOpen}
                  aria-busy={activeOperation === "attachment_page"}
                  onClick={() => void loadMoreAttachmentMetadata()}
                >{activeOperation === "attachment_page" ? "正在读取附件元数据" : "加载更多附件元数据"}</button>
              ) : null}
            </div>
          </>
        ) : <p className="data-empty-state">{localStateReadable
          ? attachmentTotalCount === 0
            ? "尚无附件。新增附件会随完整备份迁移；摘要只检查本地内容一致性，不认证文件来源。"
            : "本机存在附件，但当前有界元数据页没有可显示条目；请重新读取本页。"
          : "附件索引尚未确认；当前不显示空附件结论，也不开放上传或删除。"}</p>}
      </section>

      <details className="data-card legacy-backup-tools">
        <summary><FileText aria-hidden="true" /><span><strong>旧版 core 备份兼容检查</strong><small>只读预检，不提供直接覆盖入口</small></span></summary>
        <div className="legacy-backup-body" aria-busy={activeOperation === "core_preflight"}>
          <p>core 文件只含 Case/Revision，不是完整备份。这里仅验证冻结格式、摘要和关联；为避免绕过十六分区安全门，本页不会直接写入旧 core 文件。</p>
          <button type="button" className="secondary-action" disabled={dataMutationLocked} aria-busy={activeOperation === "core_preflight"} onClick={() => void chooseCoreBackup()}><Upload aria-hidden="true" />{activeOperation === "core_preflight" ? "正在只读预检" : "选择旧 core JSON 预检"}</button>
          <FeedbackMessage feedback={coreFeedback} />
          {corePreview ? <dl className="restore-manifest-facts"><div><dt>文件</dt><dd>{safeVisibleText(corePreview.fileName, "未命名 core 文件", 240)}</dd></div><div><dt>格式</dt><dd>core v{corePreview.formatVersion}</dd></div><div><dt>案例</dt><dd>{corePreview.cases}</dd></div><div><dt>修订</dt><dd>{corePreview.revisions}</dd></div></dl> : null}
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
          <button ref={deleteTriggerRef} type="button" className="danger-action" disabled={busy || !localStateReadable || pendingRestore !== null} onClick={() => { setAttachmentDeleteTarget(null); setDeleteFeedback(null); setDeleteAllText(""); setDeleteBackupDecision(null); setDeleteAllOpen(true); }}>
            <Trash2 aria-hidden="true" />开始完整清空
          </button>
        ) : (
          <div className="delete-all-confirm" role="group" aria-labelledby="delete-confirm-title" aria-describedby="delete-all-description" onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.preventDefault(); closeDeleteAll(); } }}>
            <div className="delete-confirm-heading">
              <strong id="delete-confirm-title">先核对恢复保障，再输入确认文字</strong>
              <StatusPill tone={lastFullBackupExportedAt ? "info" : "warning"}>{lastFullBackupExportedAt ? "存在导出提醒" : "无导出提醒"}</StatusPill>
            </div>
            <dl className="delete-all-facts" aria-label="本次完整清空影响摘要">
              <div><dt>用户数据分区</dt><dd><span>16 个</span><small>整库事务删除</small></dd></div>
              <div><dt>当前本地记录</dt><dd><span>{totalCount} 条</span><small>以本页最近读取为准</small></dd></div>
              <div><dt>附件原始字节</dt><dd><span>{counts.attachments} 个；已列元数据声明 {formatBytes(attachmentBytes)}</span><small>总字节未全量读取；删除事务覆盖全部附件</small></dd></div>
              <div data-state={lastFullBackupExportedAt ? "recorded" : "missing"}><dt>完整导出提醒</dt><dd><span title={lastFullBackupExportedAt ?? undefined}>{lastFullBackupExportedAt ? formatDateTime(lastFullBackupExportedAt) : "未记录"}</span><small>提醒标记，不是文件证据</small></dd></div>
            </dl>
            <fieldset className="delete-backup-choice" disabled={busy}>
              <legend>选择一项恢复保障声明</legend>
              <label data-state={deleteBackupDecision === "verified_backup" ? "selected" : "idle"}>
                <input ref={deleteBackupChoiceRef} type="radio" name="delete-backup-decision" checked={deleteBackupDecision === "verified_backup"} onChange={() => setDeleteBackupDecision("verified_backup")} />
                <span><strong>我已人工核对一份可用的完整 ZIP</strong><small>文件已保存且可以打开；页面上的导出时间不能代替这项人工核对。</small></span>
              </label>
              <label className="is-danger" data-state={deleteBackupDecision === "accept_without_backup" ? "selected" : "idle"}>
                <input type="radio" name="delete-backup-decision" checked={deleteBackupDecision === "accept_without_backup"} onChange={() => setDeleteBackupDecision("accept_without_backup")} />
                <span><strong>我明确接受没有可恢复副本仍继续</strong><small>清空后应用内无法撤销，也没有账号或云同步可找回数据。</small></span>
              </label>
            </fieldset>
            {deleteBackupDecision === "accept_without_backup" ? <div className="delete-no-backup-warning" role="alert"><AlertTriangle aria-hidden="true" /><p><strong>已选择无备份继续</strong><span>确认文字只证明本次操作是明确选择，不会降低数据丢失后果。</span></p></div> : null}
            <label className="field"><span>确认文字：输入“{DELETE_CONFIRMATION}”</span><input autoComplete="off" disabled={busy || deleteBackupDecision === null} value={deleteAllText} onChange={(event) => setDeleteAllText(event.target.value)} /></label>
            <div className="data-action-row">
              <button type="button" className="danger-action" disabled={busy || deleteBackupDecision === null || deleteAllText !== DELETE_CONFIRMATION} aria-busy={activeOperation === "delete_all"} onClick={() => void deleteAllData()}>{activeOperation === "delete_all" ? "正在删除十六分区" : "永久删除全部数据"}</button>
              <button type="button" className="secondary-action" disabled={busy} onClick={closeDeleteAll}>取消</button>
            </div>
          </div>
        )}
        <FeedbackMessage feedback={deleteFeedback} focusRef={deleteFeedbackRef} />
      </section>
    </div>
  );
}
