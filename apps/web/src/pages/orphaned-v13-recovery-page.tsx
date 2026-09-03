import { AlertTriangle, CheckCircle2, Database, Download } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES
} from "@hakimi/backup";
import { webReportExportPort } from "@hakimi/platform";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact,
  type PreparedFileDeliveryResolution
} from "../components/prepared-file-delivery-dialog";
import { APP_VERSION } from "../lib/app-version";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import {
  assertSupportedOrphanedV13RecoveryShellDescriptor,
  orphanedV13ReadOnlyBackupFilename
} from "../lib/orphaned-v13-rescue";
import { LEGACY_V13_NATIVE_VERSION } from "../lib/preboot-database-inventory";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./recovery-page.css";
import "./orphaned-v13-recovery-page.css";

export type OrphanedV13InventoryEntry = Readonly<{
  name: string;
  version: number | null;
}>;

type OrphanedV13RecoveryStateBase = Readonly<{
  reasonCode: string;
  inventory: readonly OrphanedV13InventoryEntry[];
}>;

export type OrphanedV13RecoveryState =
  | (OrphanedV13RecoveryStateBase & Readonly<{
    kind: "orphaned_v13";
    sourceDatabaseName: string;
    nativeVersion: number;
  }>)
  | (OrphanedV13RecoveryStateBase & Readonly<{
    kind: "ambiguous";
  }>);

export type OrphanedV13BackupCapture = Readonly<{
  blob: Blob;
  payloadDigest: string;
  outputByteLength: number;
  canonicalJsonByteLength: number;
  capturedAt: string;
  filename?: string;
  sourceDatabaseName?: string;
  sourceNativeVersion?: number;
}>;

export type OrphanedV13RecoveryPageProps = Readonly<{
  state: OrphanedV13RecoveryState;
  captureBackup: () => Promise<OrphanedV13BackupCapture>;
  recoveryShellDescriptor: ReleaseDatabaseDescriptor;
}>;

type RecoveryFeedback = Readonly<{
  tone: "success" | "info" | "error";
  title: string;
  message: string;
}>;

type DiagnosticReceipt = Readonly<{
  fileName: string;
  deliveryStatus: "saved" | "requested";
  generatedAt: string;
  payloadByteLength: number;
}>;

type BackupCaptureReceipt = Readonly<{
  fileName: string;
  deliveryStatus: "saved" | "requested";
  sourceDatabaseName: string;
  sourceNativeVersion: number;
  capturedAt: string;
  outputByteLength: number;
  canonicalJsonByteLength: number;
  payloadDigest: string;
}>;

type PreparedRecoveryDeliveryBase = Readonly<{
  artifact: PreparedFileArtifact;
  recoveryContextKey: string;
  sourceBindingKey: string | null;
}>;

type PreparedRecoveryDelivery =
  | (PreparedRecoveryDeliveryBase & Readonly<{
      kind: "diagnostic";
      generatedAt: string;
      payloadByteLength: number;
    }>)
  | (PreparedRecoveryDeliveryBase & Readonly<{
      kind: "backup";
      sourceDatabaseName: string;
      sourceNativeVersion: number;
      capturedAt: string;
      outputByteLength: number;
      canonicalJsonByteLength: number;
      payloadDigest: string;
    }>);

type PreservationCheckpoint = Readonly<{
  state: "saved" | "requested" | "diagnostic_only";
  title: string;
  detail: string;
}>;

const BACKUP_CAPTURE_CLOCK_TOLERANCE_MS = 5 * 1000;
const ORPHANED_V13_INVENTORY_LIMIT = 128;
const ORPHANED_V13_DIAGNOSTIC_BYTE_LIMIT = 256 * 1024;
const UNSAFE_LOCAL_IDENTIFIER_PATTERN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/u;
const numberFormatter = new Intl.NumberFormat("zh-CN");
const ORPHANED_V13_SOURCE_RELEASE_IDENTITY = Object.freeze({
  dbGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
  databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
  targetSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
  migrationId: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.migrationId,
  nativeVersion: LEGACY_V13_NATIVE_VERSION,
  engineeringEvidenceOnly: true as const
});

function errorMessage(reason: unknown, fallback: string): string {
  return safeVisibleErrorMessage(reason, fallback);
}

function sanitizedInventory(state: OrphanedV13RecoveryState): OrphanedV13InventoryEntry[] {
  const inventory = Array.isArray(state.inventory)
    ? state.inventory.slice(0, ORPHANED_V13_INVENTORY_LIMIT)
    : [];
  return inventory
    .map((entry) => {
      const name = entry && typeof entry === "object" && typeof entry.name === "string"
        ? safeVisibleText(entry.name, "invalid_database_name", 512)
        : "invalid_database_name";
      const version = entry && typeof entry === "object" ? entry.version : null;
      return {
        name,
        version: version !== null && Number.isSafeInteger(version) && version > 0 ? version : null
      };
    })
    .sort((left, right) => {
      if (left.name !== right.name) return left.name < right.name ? -1 : 1;
      return (left.version ?? -1) - (right.version ?? -1);
    });
}

function recoveryShellIdentityIssue(descriptor: ReleaseDatabaseDescriptor): string | null {
  try {
    assertSupportedOrphanedV13RecoveryShellDescriptor(descriptor);
  } catch {
    return "恢复执行壳不是精确绑定 legacy-v13 源的受支持 v15/v16 影子发布，只读 v13 捕获保持关闭。";
  }
  return null;
}

function recoveryStateIntegrityIssue(
  state: OrphanedV13RecoveryState,
  recoveryShellDescriptor: ReleaseDatabaseDescriptor
): string | null {
  if (state.kind !== "orphaned_v13" && state.kind !== "ambiguous") {
    return "恢复状态没有提供受支持的状态种类。";
  }
  if (
    typeof state.reasonCode !== "string"
    || !state.reasonCode.trim()
    || state.reasonCode.length > 160
    || UNSAFE_LOCAL_IDENTIFIER_PATTERN.test(state.reasonCode)
  ) {
    return "恢复状态没有提供有效的原因代码。";
  }
  if (!Array.isArray(state.inventory)) {
    return "数据库来源清单不是可读取的数组。";
  }
  if (state.inventory.length > ORPHANED_V13_INVENTORY_LIMIT) {
    return `数据库来源清单包含 ${state.inventory.length} 项，超过 ${ORPHANED_V13_INVENTORY_LIMIT} 项安全处理上限。`;
  }
  if (state.inventory.some((entry) => (
    !entry
    || typeof entry !== "object"
    || typeof entry.name !== "string"
    || !entry.name.trim()
    || entry.name.length > 512
    || UNSAFE_LOCAL_IDENTIFIER_PATTERN.test(entry.name)
    || (entry.version !== null && (!Number.isSafeInteger(entry.version) || entry.version <= 0))
  ))) {
    return "数据库来源清单包含无效名称或原生版本。";
  }
  const inventoryKeys = state.inventory.map((entry) => JSON.stringify([entry.name, entry.version]));
  if (new Set(inventoryKeys).size !== inventoryKeys.length) {
    return "数据库来源清单包含重复名称与版本组合。";
  }
  if (state.kind === "orphaned_v13") {
    if (
      typeof state.sourceDatabaseName !== "string" ||
      !state.sourceDatabaseName.trim() ||
      state.sourceDatabaseName.length > 512 ||
      UNSAFE_LOCAL_IDENTIFIER_PATTERN.test(state.sourceDatabaseName) ||
      !Number.isSafeInteger(state.nativeVersion) ||
      state.nativeVersion <= 0
    ) {
      return "已识别源库没有有效的数据库名称或原生版本。";
    }
    if (
      state.sourceDatabaseName !== recoveryShellDescriptor.sourceDatabaseName ||
      state.nativeVersion !== LEGACY_V13_NATIVE_VERSION
    ) {
      return "已识别源库没有与恢复执行壳声明的 legacy-v13 数据库和原生版本精确绑定。";
    }
    const onlyInventoryEntry = state.inventory.length === 1 ? state.inventory[0] : undefined;
    if (
      onlyInventoryEntry?.name !== state.sourceDatabaseName ||
      onlyInventoryEntry.version !== state.nativeVersion
    ) {
      return "已识别源库无法与来源清单中的唯一名称和版本精确绑定。";
    }
  }
  return null;
}

function diagnosticPayload(
  state: OrphanedV13RecoveryState,
  stateIntegrityIssue: string | null,
  exportedAt: string,
  recoveryShellDescriptor: ReleaseDatabaseDescriptor
) {
  const inventory = sanitizedInventory(state);
  const inventoryTotal = Array.isArray(state.inventory) ? state.inventory.length : 0;
  return {
    format: "hakimi-orphaned-v13-recovery-diagnostic",
    formatVersion: "1.0.0",
    appVersion: APP_VERSION,
    exportedAt,
    containsUserResearchData: false,
    containsLocalDatabaseIdentifiers: true,
    sensitivity: "local_technical_identifiers",
    release: ORPHANED_V13_SOURCE_RELEASE_IDENTITY,
    recoveryShell: {
      protocolVersion: recoveryShellDescriptor.protocolVersion,
      dbGeneration: recoveryShellDescriptor.dbGeneration,
      databaseName: recoveryShellDescriptor.databaseName,
      targetSchema: recoveryShellDescriptor.targetSchema,
      minReadableSchema: recoveryShellDescriptor.minReadableSchema,
      maxReadableSchema: recoveryShellDescriptor.maxReadableSchema,
      migrationId: recoveryShellDescriptor.migrationId,
      acceptedCommittedMigrationIds: [...recoveryShellDescriptor.acceptedCommittedMigrationIds],
      sourceGeneration: recoveryShellDescriptor.sourceGeneration,
      sourceDatabaseName: recoveryShellDescriptor.sourceDatabaseName,
      sourceSchema: recoveryShellDescriptor.sourceSchema,
      buildVersion: CURRENT_RELEASE_ENGINEERING_IDENTITY.buildVersion,
      manifestDigest: CURRENT_RELEASE_ENGINEERING_IDENTITY.manifestDigest,
      evidenceId: CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId,
      evidenceBound: CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound,
      engineeringEvidenceOnly: true
    },
    recoveryState: state.kind,
    reasonCode: safeVisibleText(state.reasonCode, "invalid_reason_code", 160),
    stateIntegrityIssue,
    inventoryTotal,
    inventoryIncluded: inventory.length,
    inventoryTruncated: inventoryTotal > inventory.length,
    inventory,
    source: state.kind === "orphaned_v13"
      ? { databaseName: safeVisibleText(state.sourceDatabaseName, "数据库名称不可显示", 512), nativeVersion: state.nativeVersion }
      : null,
    safetyBoundary: {
      readOnlyBackupAvailable: state.kind === "orphaned_v13" && stateIntegrityIssue === null,
      normalNavigationAvailable: false,
      importAvailable: false,
      restoreAvailable: false,
      editAvailable: false,
      deleteAvailable: false,
      upgradeAvailable: false
    }
  };
}

function assertBackupCapture(
  capture: OrphanedV13BackupCapture,
  captureStartedAt: number,
  expectedSourceDatabaseName: string,
  expectedSourceNativeVersion: number
): void {
  if (
    !(capture.blob instanceof Blob) ||
    !Number.isSafeInteger(capture.outputByteLength) ||
    capture.outputByteLength <= 0 ||
    capture.outputByteLength > DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES ||
    capture.blob.size !== capture.outputByteLength
  ) {
    throw new Error("备份文件长度与只读捕获结果不一致，或超过 ZIP 安全预算。");
  }
  const mediaType = capture.blob.type.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/zip") {
    throw new Error("只读捕获返回的文件类型不是 ZIP。");
  }
  if (!/^[0-9a-f]{64}$/u.test(capture.payloadDigest)) {
    throw new Error("只读捕获没有返回可核验的数据摘要。");
  }
  if (
    !Number.isSafeInteger(capture.canonicalJsonByteLength)
    || capture.canonicalJsonByteLength <= 0
    || capture.canonicalJsonByteLength > DEFAULT_MAX_FULL_BACKUP_JSON_BYTES
  ) {
    throw new Error("只读捕获返回的规范数据长度无效，或超过 JSON 安全预算。");
  }
  const hasSourceDatabaseName = typeof capture.sourceDatabaseName === "string";
  const hasSourceNativeVersion = capture.sourceNativeVersion !== undefined;
  if (
    !hasSourceDatabaseName ||
    !hasSourceNativeVersion ||
    hasSourceDatabaseName !== hasSourceNativeVersion ||
    (hasSourceDatabaseName && (
      capture.sourceDatabaseName !== expectedSourceDatabaseName ||
      capture.sourceNativeVersion !== expectedSourceNativeVersion
    ))
  ) {
    throw new Error("只读捕获返回的源库名称或原生版本与当前救援目标不一致。");
  }
  const capturedAt = Date.parse(capture.capturedAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(capture.capturedAt) ||
    !Number.isFinite(capturedAt) ||
    new Date(capturedAt).toISOString() !== capture.capturedAt ||
    capturedAt < captureStartedAt - BACKUP_CAPTURE_CLOCK_TOLERANCE_MS ||
    capturedAt > Date.now() + BACKUP_CAPTURE_CLOCK_TOLERANCE_MS
  ) {
    throw new Error("只读捕获没有返回有效的捕获时间。");
  }
  const expectedFilename = orphanedV13ReadOnlyBackupFilename(capture.capturedAt);
  if (
    capture.filename === undefined ||
    (capture.filename !== undefined && capture.filename !== expectedFilename)
  ) {
    throw new Error("只读捕获返回的文件名没有与捕获日期精确绑定。");
  }
}

export function OrphanedV13RecoveryPage({
  state,
  captureBackup,
  recoveryShellDescriptor
}: OrphanedV13RecoveryPageProps) {
  const [busy, setBusy] = useState<"diagnostic" | "backup" | null>(null);
  const [feedback, setFeedback] = useState<RecoveryFeedback | null>(null);
  const [diagnosticReceipt, setDiagnosticReceipt] = useState<DiagnosticReceipt | null>(null);
  const [backupReceipt, setBackupReceipt] = useState<BackupCaptureReceipt | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedRecoveryDelivery | null>(null);
  const busyRef = useRef<"diagnostic" | "backup" | null>(null);
  const mountedRef = useRef(true);
  const preparedDeliveryRef = useRef<PreparedRecoveryDelivery | null>(null);
  const stateIntegrityIssue = recoveryShellIdentityIssue(recoveryShellDescriptor) ??
    recoveryStateIntegrityIssue(state, recoveryShellDescriptor);
  const canCaptureBackup = state.kind === "orphaned_v13" && stateIntegrityIssue === null;
  const displayReasonCode = safeVisibleText(state.reasonCode, "invalid_reason_code", 160);
  const displayInventory = sanitizedInventory(state);
  const inventoryEntryCount = Array.isArray(state.inventory) ? state.inventory.length : 0;
  const inventoryTruncated = inventoryEntryCount > displayInventory.length;
  const displaySourceDatabaseName = state.kind === "orphaned_v13"
    ? safeVisibleText(state.sourceDatabaseName, "数据库名称不可显示", 512)
    : null;
  const releaseEvidenceLabel = CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound
    ? safeVisibleText(CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId, "证据绑定状态异常：缺少 evidenceId", 180)
    : "未绑定 · 仅本地构建";
  const captureClosedReason = stateIntegrityIssue ?? (
    displayInventory.length === 0
      ? "来源识别没有返回候选数据库，无法绑定只读捕获目标。"
      : displayInventory.length === 1
        ? "清单中的单一候选尚未被来源识别器确认为可信 v13 源。"
        : "多个候选来源无法安全消歧，不能自动选择其中任何一个。"
  );
  const recoveryContextKey = JSON.stringify({
    kind: state.kind,
    reasonCode: displayReasonCode,
    stateIntegrityIssue,
    inventoryEntryCount,
    inventory: displayInventory,
    source: state.kind === "orphaned_v13"
      ? [displaySourceDatabaseName ?? "数据库名称不可显示", state.nativeVersion]
      : null,
    sourceRelease: [
      ORPHANED_V13_SOURCE_RELEASE_IDENTITY.dbGeneration,
      ORPHANED_V13_SOURCE_RELEASE_IDENTITY.targetSchema,
      ORPHANED_V13_SOURCE_RELEASE_IDENTITY.migrationId,
      ORPHANED_V13_SOURCE_RELEASE_IDENTITY.nativeVersion
    ],
    recoveryShell: [
      recoveryShellDescriptor.dbGeneration,
      recoveryShellDescriptor.databaseName,
      recoveryShellDescriptor.targetSchema,
      recoveryShellDescriptor.migrationId,
      recoveryShellDescriptor.sourceGeneration,
      recoveryShellDescriptor.sourceDatabaseName,
      recoveryShellDescriptor.sourceSchema,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.buildVersion,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId
    ],
    requireVerifiedCaptureBinding: true
  });
  const sourceBindingKey = state.kind === "orphaned_v13"
    ? JSON.stringify([state.sourceDatabaseName, state.nativeVersion])
    : null;
  const recoveryContextKeyRef = useRef(recoveryContextKey);
  const sourceBindingKeyRef = useRef(sourceBindingKey);
  const currentPreparedDelivery = preparedDelivery?.recoveryContextKey === recoveryContextKey
    && preparedDelivery.sourceBindingKey === sourceBindingKey
    ? preparedDelivery
    : null;
  const deliveryOpen = currentPreparedDelivery !== null;
  const operationLocked = busy !== null || deliveryOpen;
  const preservationCheckpoint: PreservationCheckpoint | null = canCaptureBackup
    ? backupReceipt?.deliveryStatus === "saved"
      ? {
          state: "saved",
          title: "平台已确认只读 v13 完整备份保存",
          detail: `${backupReceipt.fileName} · ${backupReceipt.capturedAt}`
        }
      : backupReceipt
        ? {
            state: "requested",
            title: "只读 v13 完整备份已请求下载",
            detail: `${backupReceipt.fileName} · 仍需人工核对下载目录与 ZIP 可读性`
          }
        : diagnosticReceipt
          ? {
              state: "diagnostic_only",
              title: diagnosticReceipt.deliveryStatus === "saved"
                ? "v13 最小诊断已保存，完整捕获尚未完成"
                : "v13 最小诊断已请求下载，完整捕获尚未完成",
              detail: `${diagnosticReceipt.fileName} · 唯一源库已绑定，重检前仍建议完成只读完整备份`
            }
          : null
    : diagnosticReceipt?.deliveryStatus === "saved"
      ? {
          state: "saved",
          title: "平台已确认 v13 最小诊断保存",
          detail: `${diagnosticReceipt.fileName} · ${diagnosticReceipt.generatedAt}`
        }
      : diagnosticReceipt
        ? {
            state: "requested",
            title: "v13 最小诊断已请求下载",
            detail: `${diagnosticReceipt.fileName} · 仍需人工核对文件是否落盘`
          }
        : null;
  const diagnosticStepState = busy === "diagnostic" || currentPreparedDelivery?.kind === "diagnostic"
    ? "active"
    : diagnosticReceipt?.deliveryStatus === "saved"
      ? "complete"
      : diagnosticReceipt
        ? "attention"
        : "ready";
  const backupStepState = !canCaptureBackup
    ? "closed"
    : busy === "backup" || currentPreparedDelivery?.kind === "backup"
      ? "active"
      : backupReceipt?.deliveryStatus === "saved"
        ? "complete"
        : backupReceipt
          ? "attention"
          : "ready";
  const recheckStepState = operationLocked
    ? "locked"
    : preservationCheckpoint?.state === "saved"
      ? "ready"
      : "attention";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      busyRef.current = null;
      preparedDeliveryRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const contextChanged = recoveryContextKeyRef.current !== recoveryContextKey;
    const sourceBindingChanged = sourceBindingKeyRef.current !== sourceBindingKey;
    recoveryContextKeyRef.current = recoveryContextKey;
    sourceBindingKeyRef.current = sourceBindingKey;
    if (!contextChanged && !sourceBindingChanged) return;
    preparedDeliveryRef.current = null;
    setPreparedDelivery(null);
    setFeedback(null);
    setDiagnosticReceipt(null);
    setBackupReceipt(null);
  }, [recoveryContextKey, sourceBindingKey]);

  const beginOperation = (operation: "diagnostic" | "backup"): boolean => {
    if (
      !mountedRef.current
      || busyRef.current !== null
      || preparedDeliveryRef.current !== null
    ) return false;
    busyRef.current = operation;
    setBusy(operation);
    return true;
  };

  const finishOperation = (operation: "diagnostic" | "backup") => {
    if (busyRef.current !== operation) return;
    busyRef.current = null;
    if (mountedRef.current) setBusy(null);
  };

  const installPreparedDelivery = (delivery: PreparedRecoveryDelivery) => {
    preparedDeliveryRef.current = delivery;
    setPreparedDelivery(delivery);
  };

  const closePreparedDelivery = () => {
    const delivery = preparedDeliveryRef.current;
    if (!delivery) return;
    preparedDeliveryRef.current = null;
    setPreparedDelivery((current) => current === delivery ? null : current);
  };

  const prepareDiagnostic = () => {
    if (!beginOperation("diagnostic")) return;
    const operationContextKey = recoveryContextKey;
    const operationSourceBindingKey = sourceBindingKey;
    setFeedback(null);
    try {
      const generatedAt = new Date().toISOString();
      const filename = `hakimi-v13-recovery-diagnostic-${generatedAt.slice(0, 10)}.json`;
      const payload = `${JSON.stringify(diagnosticPayload(
        state,
        stateIntegrityIssue,
        generatedAt,
        recoveryShellDescriptor
      ), null, 2)}\n`;
      const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
      const payloadByteLength = blob.size;
      if (
        !Number.isSafeInteger(payloadByteLength)
        || payloadByteLength <= 0
        || payloadByteLength > ORPHANED_V13_DIAGNOSTIC_BYTE_LIMIT
      ) {
        throw new Error(`v13 最小诊断超出 ${numberFormatter.format(ORPHANED_V13_DIAGNOSTIC_BYTE_LIMIT)} 字节安全预算。`);
      }
      if (!mountedRef.current || recoveryContextKeyRef.current !== operationContextKey) return;
      const artifact: PreparedFileArtifact = Object.freeze({
        blob,
        filename,
        title: "v13 最小技术诊断",
        description: "已冻结的只读救援诊断；只含恢复状态、工程身份与经清洗的本地数据库名称/版本。数据库标识仍是敏感技术指纹。",
        sharePolicy: "blocked_sensitive"
      });
      installPreparedDelivery(Object.freeze({
        kind: "diagnostic",
        artifact,
        recoveryContextKey: operationContextKey,
        sourceBindingKey: operationSourceBindingKey,
        generatedAt,
        payloadByteLength
      }));
      setFeedback({
        tone: "info",
        title: "诊断文件已生成，尚未交付",
        message: `JSON ${numberFormatter.format(payloadByteLength)} 字节已冻结；当前尚未调用文件端口。请在独立交付对话框中选择保存方式。`
      });
    } catch (reason) {
      if (!mountedRef.current || recoveryContextKeyRef.current !== operationContextKey) return;
      setFeedback({
        tone: "error",
        title: "诊断文件未能生成",
        message: errorMessage(reason, "浏览器没有完成诊断文件生成。")
      });
    } finally {
      finishOperation("diagnostic");
    }
  };

  const prepareReadOnlyBackup = async () => {
    if (state.kind !== "orphaned_v13" || stateIntegrityIssue !== null || !beginOperation("backup")) return;
    const operationContextKey = recoveryContextKey;
    const operationSourceBindingKey = sourceBindingKey;
    const sourceDatabaseName = state.sourceDatabaseName;
    const sourceNativeVersion = state.nativeVersion;
    setFeedback(null);
    try {
      const captureStartedAt = Date.now();
      const capture = await captureBackup();
      if (!mountedRef.current || recoveryContextKeyRef.current !== operationContextKey) return;
      assertBackupCapture(
        capture,
        captureStartedAt,
        sourceDatabaseName,
        sourceNativeVersion
      );
      const filename = capture.filename ?? orphanedV13ReadOnlyBackupFilename(capture.capturedAt);
      const captureSourceDatabaseName = capture.sourceDatabaseName ?? sourceDatabaseName;
      const captureSourceNativeVersion = capture.sourceNativeVersion ?? sourceNativeVersion;
      const artifact: PreparedFileArtifact = Object.freeze({
        blob: capture.blob,
        filename,
        title: "只读 v13 完整备份",
        description: `已从唯一绑定源库 ${captureSourceDatabaseName}（native v${captureSourceNativeVersion}）只读捕获并完成工程完整性核验；包含全部孤立用户资料。`,
        sharePolicy: "blocked_sensitive"
      });
      installPreparedDelivery(Object.freeze({
        kind: "backup",
        artifact,
        recoveryContextKey: operationContextKey,
        sourceBindingKey: operationSourceBindingKey,
        sourceDatabaseName: captureSourceDatabaseName,
        sourceNativeVersion: captureSourceNativeVersion,
        capturedAt: capture.capturedAt,
        outputByteLength: capture.outputByteLength,
        canonicalJsonByteLength: capture.canonicalJsonByteLength,
        payloadDigest: capture.payloadDigest
      }));
      setFeedback({
        tone: "info",
        title: "只读完整备份已捕获，尚未交付",
        message: `捕获时间 ${capture.capturedAt}；ZIP ${numberFormatter.format(capture.outputByteLength)} 字节，规范 JSON ${numberFormatter.format(capture.canonicalJsonByteLength)} 字节；数据摘要 ${capture.payloadDigest}。当前尚未调用文件端口。`
      });
    } catch (reason) {
      if (!mountedRef.current || recoveryContextKeyRef.current !== operationContextKey) return;
      setFeedback({
        tone: "error",
        title: "只读完整备份未能生成",
        message: `${errorMessage(reason, "本地 v13 数据没有完成只读捕获与工程完整性核验。")} 页面没有写入、删除或升级数据库；请保留当前浏览器资料。`
      });
    } finally {
      finishOperation("backup");
    }
  };

  const handleDeliveryResolution = (event: PreparedFileDeliveryResolution) => {
    const prepared = preparedDeliveryRef.current;
    if (
      !mountedRef.current
      || !prepared
      || event.artifact !== prepared.artifact
      || event.result.filename !== prepared.artifact.filename
      || event.intent === "share"
      || prepared.recoveryContextKey !== recoveryContextKeyRef.current
      || prepared.sourceBindingKey !== sourceBindingKeyRef.current
    ) return;

    const validatedSaveOutcome = event.resolution.kind === "completed"
      ? event.result.status === "saved"
      : event.resolution.kind === "requested"
        ? event.intent === "download" && event.result.status === "download_requested"
        : event.resolution.kind === "cancelled"
          && event.result.status === "cancelled"
          && event.result.operation === "save";
    if (!validatedSaveOutcome) return;

    const { resolution } = event;
    if (resolution.kind === "cancelled") {
      setFeedback({
        tone: "info",
        title: prepared.kind === "diagnostic" ? "已取消诊断文件交付" : "已取消只读完整备份交付",
        message: prepared.kind === "diagnostic"
          ? resolution.message
          : `${resolution.message} 数据库只完成了读取与工程完整性核验，没有发生写入或删除。`
      });
      return;
    }

    const deliveryStatus = resolution.kind === "completed" ? "saved" : "requested";
    if (prepared.kind === "diagnostic") {
      setDiagnosticReceipt({
        fileName: prepared.artifact.filename,
        deliveryStatus,
        generatedAt: prepared.generatedAt,
        payloadByteLength: prepared.payloadByteLength
      });
      setFeedback({
        tone: deliveryStatus === "saved" ? "success" : "info",
        title: deliveryStatus === "saved" ? "诊断文件已保存" : "诊断文件已请求下载",
        message: `${resolution.message} JSON ${numberFormatter.format(prepared.payloadByteLength)} 字节；只包含恢复状态、原因代码和数据库名称/版本清单，不包含案例、出生资料、笔记、事件、知识正文或记录数量。数据库标识仍按敏感技术指纹保管。`
      });
      return;
    }

    const exactPreparedSourceBinding = JSON.stringify([
      prepared.sourceDatabaseName,
      prepared.sourceNativeVersion
    ]);
    if (prepared.sourceBindingKey !== exactPreparedSourceBinding) return;
    setBackupReceipt({
      fileName: prepared.artifact.filename,
      deliveryStatus,
      sourceDatabaseName: prepared.sourceDatabaseName,
      sourceNativeVersion: prepared.sourceNativeVersion,
      capturedAt: prepared.capturedAt,
      outputByteLength: prepared.outputByteLength,
      canonicalJsonByteLength: prepared.canonicalJsonByteLength,
      payloadDigest: prepared.payloadDigest
    });
    setFeedback({
      tone: deliveryStatus === "saved" ? "success" : "info",
      title: deliveryStatus === "saved" ? "只读完整备份已保存" : "只读完整备份已请求下载",
      message: `${resolution.message} 捕获时间 ${prepared.capturedAt}；ZIP ${numberFormatter.format(prepared.outputByteLength)} 字节，规范 JSON ${numberFormatter.format(prepared.canonicalJsonByteLength)} 字节；数据摘要 ${prepared.payloadDigest}。`
    });
  };

  return (
    <div
      className="boot-failure-shell orphaned-v13-shell"
      data-release-family="legacy"
      data-schema-version="13"
      data-db-schema-version="13"
      data-evidence-authority="engineering-only"
      data-formal-validation-complete="false"
      data-scientific-validation-complete="false"
      data-mutation-mode="writes-frozen-read-only-export-only"
      data-mutation-epoch-state="not_bypassed"
      data-write-mode="frozen"
      data-file-delivery-certainty={
        busy !== null
          ? "preparing"
          : currentPreparedDelivery
            ? "prepared"
            : backupReceipt?.deliveryStatus ?? diagnosticReceipt?.deliveryStatus ?? "none"
      }
      data-file-delivery-scope={currentPreparedDelivery?.kind === "backup"
        ? "full-backup"
        : currentPreparedDelivery?.kind ?? (backupReceipt ? "full-backup" : diagnosticReceipt ? "diagnostic" : "none")}
      data-recovery-kind={state.kind}
      data-operation={busy ?? (currentPreparedDelivery ? `${currentPreparedDelivery.kind}_prepared` : "idle")}
      data-preservation-state={preservationCheckpoint?.state ?? "pending"}
      data-capture-capability={canCaptureBackup ? "bound_read_only" : "closed"}
      data-inventory-count={String(inventoryEntryCount)}
      data-inventory-truncated={String(inventoryTruncated)}
      data-delivery-mode="prepared-file-dialog"
      data-delivery-open={String(deliveryOpen)}
      data-release-identity={ORPHANED_V13_SOURCE_RELEASE_IDENTITY.dbGeneration}
      data-target-schema={String(ORPHANED_V13_SOURCE_RELEASE_IDENTITY.targetSchema)}
      data-migration-id="null"
      data-recovery-shell-release-identity={recoveryShellDescriptor.dbGeneration}
      data-recovery-shell-database-name={recoveryShellDescriptor.databaseName}
      data-recovery-shell-target-schema={String(recoveryShellDescriptor.targetSchema)}
      data-recovery-shell-migration-id={recoveryShellDescriptor.migrationId ?? "null"}
      data-recovery-shell-source-generation={recoveryShellDescriptor.sourceGeneration ?? "null"}
      data-recovery-shell-source-database-name={recoveryShellDescriptor.sourceDatabaseName ?? "null"}
      data-recovery-shell-source-schema={recoveryShellDescriptor.sourceSchema === null
        ? "null"
        : String(recoveryShellDescriptor.sourceSchema)}
      data-engineering-evidence-only="true"
      data-source-capture-binding="required"
      data-write-reconciliation-required="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-epoch-bypassed="false"
      aria-busy={busy !== null}
    >
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="boot-failure-header">
        <div className="boot-failure-brand">
          <img src="/brand-mark.svg" alt="" width="40" height="40" />
          <span><strong>哈基米</strong><small>八字研究台</small></span>
        </div>
        <strong>v13 数据救援模式</strong>
      </header>

      <main id="main-content" tabIndex={-1}>
        <div className="page page--boot-recovery page--orphaned-v13">
          <section className="error-panel app-boot-failure" role="alert" aria-labelledby="orphaned-v13-title">
            <AlertTriangle aria-hidden="true" />
            <div>
              <p className="eyebrow">Read-only rescue</p>
              <h1 id="orphaned-v13-title">
                {canCaptureBackup ? "检测到未登记的 v13 本地数据库" : "本地数据库状态无法安全判定"}
              </h1>
              <p>{canCaptureBackup
                ? `已只读识别源数据库 ${displaySourceDatabaseName}（原生版本 ${state.nativeVersion}）。当前应用不会把它登记为已提交数据库，也不会启动迁移。`
                : stateIntegrityIssue
                  ? `救援边界完整性未通过：${stateIntegrityIssue} 为避免绑定错误数据源，本页不会打开任何数据库来生成备份。`
                  : "检测结果不能唯一证明哪个数据库是可信的 v13 源。为避免选错数据源，本页不会打开任何数据库来生成备份。"}</p>
              <p>原因代码：<code>{displayReasonCode}</code>。普通工作台和普通导航均未挂载。</p>
              <p><strong>请勿清除浏览器数据。</strong>本页不会导入、恢复、编辑或删除资料，也不会继续数据库升级。</p>
            </div>
          </section>

          <section className="orphaned-v13-context-guard" data-state={canCaptureBackup ? "bound" : "closed"} aria-labelledby="orphaned-v13-context-title">
            {canCaptureBackup ? <Database aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
            <div className="orphaned-v13-context-guard__copy">
              <small>{canCaptureBackup ? "Bound rescue context" : "Closed rescue context"}</small>
              <strong id="orphaned-v13-context-title">{canCaptureBackup ? `${displaySourceDatabaseName} · native v${state.nativeVersion}` : "当前救援上下文失败关闭"}</strong>
              <p>页面只接纳仍属于此来源识别上下文的异步结果；来源、原因或工程身份变化时，旧准备工件、反馈与页面收据会撤下，但不会重置全局文件交付门禁。</p>
            </div>
            <dl>
              <div><dt>恢复种类</dt><dd>{state.kind}</dd></div>
              <div><dt>原因代码</dt><dd>{displayReasonCode}</dd></div>
              <div><dt>来源条目</dt><dd>{inventoryTruncated ? `${displayInventory.length} / ${inventoryEntryCount}` : displayInventory.length}</dd></div>
            </dl>
          </section>

          <section
            className="recovery-runbook"
            aria-labelledby="orphaned-recovery-runbook-title"
            aria-busy={busy !== null}
          >
            <header className="recovery-runbook__heading">
              <div>
                <p className="recovery-runbook__kicker">Recovery runbook</p>
                <h2 id="orphaned-recovery-runbook-title">先生成并交付证据，再决定去向</h2>
              </div>
              <p>源库保持只读。诊断用于确认本地环境；只有唯一旧版来源已识别时，才允许捕获完整备份。</p>
            </header>

            <ol className="recovery-runbook__steps">
              <li data-state="complete">
                <span className="recovery-runbook__index">01</span>
                <div>
                  <small>Isolate</small>
                  <strong>隔离旧版源库</strong>
                  <p>不迁移、不删除，也不把孤立资料接入当前工作台。</p>
                </div>
                <em>已执行</em>
              </li>
              <li data-state={diagnosticStepState} aria-current={busy === "diagnostic" || currentPreparedDelivery?.kind === "diagnostic" ? "step" : undefined}>
                <span className="recovery-runbook__index">02</span>
                <div>
                  <small>Diagnose</small>
                  <strong>生成最小诊断</strong>
                  <p>只包含经清洗的来源清单、恢复状态与发布身份；数据库标识仍是敏感技术指纹。</p>
                </div>
                <em>{busy === "diagnostic" ? "正在生成" : currentPreparedDelivery?.kind === "diagnostic" ? "已生成待交付" : diagnosticReceipt?.deliveryStatus === "saved" ? "已确认保存" : diagnosticReceipt ? "待核对落盘" : "可生成"}</em>
              </li>
              <li data-state={backupStepState} aria-current={busy === "backup" || currentPreparedDelivery?.kind === "backup" ? "step" : undefined}>
                <span className="recovery-runbook__index">03</span>
                <div>
                  <small>Capture</small>
                  <strong>捕获完整备份</strong>
                  <p>交付前校验字节数、摘要和规范化内容，不触碰源数据。</p>
                </div>
                <em>{canCaptureBackup ? busy === "backup" ? "正在捕获" : currentPreparedDelivery?.kind === "backup" ? "已冻结待交付" : backupReceipt?.deliveryStatus === "saved" ? "已确认保存" : backupReceipt ? "待核对 ZIP" : "可执行" : "来源待确认"}</em>
              </li>
              <li data-state={recheckStepState}>
                <span className="recovery-runbook__index">04</span>
                <div>
                  <small>Recheck</small>
                  <strong>重新运行来源识别</strong>
                  <p>{preservationCheckpoint?.state === "saved"
                    ? "本次救援已有平台确认保存的交付收据；关闭其他标签页后，只通过正常重新载入重检。"
                    : preservationCheckpoint?.state === "requested"
                      ? "浏览器只确认已请求下载；请先人工核对文件落盘和可读性，再关闭其他标签页并正常重新载入。"
                      : preservationCheckpoint?.state === "diagnostic_only"
                        ? "最小诊断已经留存，但唯一源库仍可只读捕获；重检前建议先完成当前 v13 全量备份。"
                      : "重新载入始终可用，但建议先导出最小诊断；来源唯一时再优先捕获只读完整备份。"}</p>
                </div>
                <em>{operationLocked ? "等待当前生成或交付" : preservationCheckpoint?.state === "saved" ? "已有保存收据" : preservationCheckpoint?.state === "requested" ? "待人工核对" : preservationCheckpoint?.state === "diagnostic_only" ? "仍建议完整捕获" : "建议先留存"}</em>
              </li>
            </ol>

            <dl className="recovery-runbook__ledger">
              <div>
                <dt>恢复判定</dt>
                <dd>{stateIntegrityIssue ? "救援边界未通过" : state.kind === "orphaned_v13" ? "唯一旧版来源" : "多来源歧义"}</dd>
              </div>
              <div>
                <dt>来源清单</dt>
                <dd>{inventoryTruncated ? `展示 ${displayInventory.length} / 原始 ${inventoryEntryCount} 个条目` : `${displayInventory.length} 个本地库条目`}</dd>
              </div>
              <div>
                <dt>写入模式</dt>
                <dd>完全冻结 · 捕获来源绑定强制</dd>
              </div>
              <div>
                <dt>可执行动作</dt>
                <dd>{canCaptureBackup ? "诊断与备份捕获" : "仅最小诊断"}</dd>
              </div>
              <div>
                <dt>原因代码</dt>
                <dd>{displayReasonCode}</dd>
              </div>
              <div>
                <dt>源救援身份</dt>
                <dd>{ORPHANED_V13_SOURCE_RELEASE_IDENTITY.dbGeneration} / targetSchema {ORPHANED_V13_SOURCE_RELEASE_IDENTITY.targetSchema} / migrationId null</dd>
              </div>
              <div>
                <dt>恢复执行壳</dt>
                <dd>{recoveryShellDescriptor.dbGeneration} / targetSchema {recoveryShellDescriptor.targetSchema} / migrationId {recoveryShellDescriptor.migrationId ?? "null"}</dd>
              </div>
            </dl>
          </section>

          <section className="recovery-target-lock" data-state={canCaptureBackup ? "ready" : "closed"} aria-label="当前 v13 救援目标">
            {canCaptureBackup ? <Download aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
            <div>
              <small>Bound rescue scope</small>
              <strong>{canCaptureBackup ? "唯一 v13 源库已只读锁定" : "没有唯一可信的备份目标"}</strong>
              <p>{canCaptureBackup
                ? "捕获函数只能针对已识别源库生成同一份只读快照；不会创建目标库、迁移日志或登记记录。"
                : captureClosedReason}</p>
            </div>
            <code>{canCaptureBackup ? `${displaySourceDatabaseName} · native v${state.nativeVersion}` : `${inventoryEntryCount} candidates · ${displayReasonCode}`}</code>
          </section>

          <section className="orphaned-v13-inventory" aria-labelledby="orphaned-v13-inventory-title">
            <header className="orphaned-v13-inventory__heading">
              <div>
                <p className="eyebrow">Local source register</p>
                <h2 id="orphaned-v13-inventory-title">本次识别看到的数据库来源</h2>
              </div>
              <span data-state={canCaptureBackup ? "bound" : "ambiguous"}>{canCaptureBackup ? "唯一来源已锁定" : stateIntegrityIssue ? "来源清单未通过" : "没有唯一来源"}</span>
            </header>
            {displayInventory.length ? <ol className="orphaned-v13-inventory__list">
              {displayInventory.map((entry, index) => {
                const isBoundSource = canCaptureBackup && state.kind === "orphaned_v13" &&
                  entry.name === state.sourceDatabaseName && entry.version === state.nativeVersion;
                return (
                  <li data-state={isBoundSource ? "bound" : "candidate"} key={`${entry.name}:${entry.version ?? "unknown"}:${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><small>{isBoundSource ? "Bound read-only source" : "Observed candidate"}</small><code title={safeVisibleText(entry.name, "数据库名称不可显示", 512)}>{safeVisibleText(entry.name, "数据库名称不可显示", 512)}</code></div>
                    <strong>{entry.version === null ? "原生版本未报告" : `native v${entry.version}`}</strong>
                  </li>
                );
              })}
            </ol> : <p className="orphaned-v13-inventory__empty" role="status">来源识别没有返回可展示的数据库条目；完整捕获保持关闭，仅允许导出最小诊断。</p>}
            {inventoryTruncated ? <p className="orphaned-v13-inventory__truncation" role="alert">来源清单超过安全预算，本页仅展示前 {displayInventory.length} / {inventoryEntryCount} 项并关闭完整捕获；诊断文件会明确记录截断状态。</p> : null}
            <p>清单只呈现数据库名称与浏览器报告的原生版本，不枚举对象仓、记录数量或用户研究资料；名称相同但版本不同仍视为不同候选来源。</p>
          </section>

          {busy ? (
            <div className="recovery-operation-status" role="status" aria-live="polite" aria-atomic="true">
              <Download aria-hidden="true" />
              <div><strong>{busy === "diagnostic" ? "正在生成 v13 最小诊断" : "正在捕获并核验只读 v13 备份"}</strong><p>{busy === "diagnostic" ? "不会打开源库或枚举用户记录。" : "源库保持隔离；摘要、字节长度和捕获时间通过后才生成待交付的冻结工件。"}</p></div>
            </div>
          ) : null}

          <aside className="orphaned-v13-direct-delivery-boundary" data-backup={canCaptureBackup ? "available" : "closed"} aria-label="v13 救援准备文件交付边界">
            <Download aria-hidden="true" />
            <div>
              <p className="eyebrow">Emergency prepared delivery</p>
              <strong>先冻结救援工件，再显式选择文件交付通道</strong>
              <p>启动来源识别失败时，本页先生成并冻结不依赖普通工作台的救援工件；生成阶段绝不调用文件端口。诊断包含经清洗的数据库名称和版本，完整 ZIP 包含已识别源库的全部孤立用户资料；两者均禁止系统分享。平台仅确认保存或请求下载，后者必须人工核对。</p>
            </div>
            <div className="orphaned-v13-direct-delivery-boundary__facts" aria-label="v13 救援文件敏感度"><span>诊断 · 本地技术标识</span><span data-sensitive="true">备份 · 全量用户资料</span><span>{canCaptureBackup ? "唯一来源已绑定" : "完整捕获关闭"}</span></div>
          </aside>

          <section className="boot-recovery-card" aria-labelledby="v13-diagnostic-title">
            <p className="eyebrow">Diagnostic only</p>
            <h2 id="v13-diagnostic-title">不含研究记录正文的最小诊断</h2>
              <p>诊断只记录恢复状态、原因代码，以及已清洗的数据库名称和版本；不枚举记录，也不包含案例、出生资料、笔记、事件或知识正文，但数据库标识仍属于敏感技术指纹。</p>
              <dl>
                <div><dt>源救援身份</dt><dd className="mono">{ORPHANED_V13_SOURCE_RELEASE_IDENTITY.dbGeneration} / Schema {ORPHANED_V13_SOURCE_RELEASE_IDENTITY.targetSchema} / migrationId null</dd></div>
                <div><dt>恢复执行壳</dt><dd className="mono">{recoveryShellDescriptor.dbGeneration} / Schema {recoveryShellDescriptor.targetSchema} / migrationId {recoveryShellDescriptor.migrationId ?? "null"}</dd></div>
                <div><dt>应用壳 / SW 缓存代</dt><dd className="mono">{CURRENT_RELEASE_ENGINEERING_IDENTITY.buildVersion ?? "开发模式"}</dd></div>
                <div><dt>Release Evidence</dt><dd className="mono">{releaseEvidenceLabel}</dd></div>
              </dl>
              <p>这些字段只标识当前工程构建，不证明源数据库已迁移，也不代表专家真值或内容授权。</p>
            <div className="button-row">
              <button
                type="button"
                className="secondary-action"
                disabled={operationLocked}
                aria-busy={busy === "diagnostic"}
                onClick={prepareDiagnostic}
              >
                <Download aria-hidden="true" />
                {busy === "diagnostic" ? "正在生成诊断 JSON" : "生成最小技术诊断 JSON"}
              </button>
            </div>
          </section>

          {canCaptureBackup ? (
            <section className="boot-recovery-card boot-recovery-card--spaced" aria-labelledby="v13-backup-title">
              <p className="eyebrow">Bound read-only snapshot</p>
              <h2 id="v13-backup-title">只读捕获已识别的 v13 数据</h2>
              <p>备份从同一份只读快照生成并核验摘要；页面不会创建控制记录、目标数据库或迁移日志。ZIP 上限 {Math.round(DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES / 1024 / 1024)} MiB，规范 JSON 上限 {Math.round(DEFAULT_MAX_FULL_BACKUP_JSON_BYTES / 1024 / 1024)} MiB。</p>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-action"
                  disabled={operationLocked}
                  aria-busy={busy === "backup"}
                  onClick={() => void prepareReadOnlyBackup()}
                >
                  <Download aria-hidden="true" />
                  {busy === "backup" ? "正在只读核验并打包" : "生成只读完整备份 ZIP"}
                </button>
              </div>
            </section>
          ) : null}

          {feedback ? (
            <div
              className="boot-recovery-feedback"
              data-tone={feedback.tone}
              role={feedback.tone === "error" ? "alert" : "status"}
              aria-live={feedback.tone === "error" ? "assertive" : "polite"}
              aria-atomic="true"
            >
              <strong>{safeVisibleText(feedback.title, "v13 救援状态", 180)}</strong>
              <p>{safeVisibleText(feedback.message, "v13 救援状态不可显示。", 1200)}</p>
            </div>
          ) : null}

          {diagnosticReceipt ? (
            <section className="orphaned-v13-receipt orphaned-v13-receipt--diagnostic" data-delivery={diagnosticReceipt.deliveryStatus} aria-labelledby="orphaned-v13-diagnostic-receipt-title">
              <header>
                {diagnosticReceipt.deliveryStatus === "saved" ? <CheckCircle2 aria-hidden="true" /> : <Download aria-hidden="true" />}
                <div><p className="eyebrow">Diagnostic receipt</p><h2 id="orphaned-v13-diagnostic-receipt-title">v13 最小诊断收据</h2></div>
                <span>{diagnosticReceipt.deliveryStatus === "saved" ? "文件已保存" : "已请求下载 · 待人工核对"}</span>
              </header>
              <dl>
                <div><dt>交付文件</dt><dd>{safeVisibleText(diagnosticReceipt.fileName, "未命名诊断文件", 240)}</dd></div>
                <div><dt>生成时间 / JSON</dt><dd>{safeVisibleText(diagnosticReceipt.generatedAt, "未知时间", 120)} · {numberFormatter.format(diagnosticReceipt.payloadByteLength)} 字节</dd></div>
                <div><dt>交付状态</dt><dd>{diagnosticReceipt.deliveryStatus === "saved" ? "平台确认保存" : "浏览器仅确认请求"}</dd></div>
                <div><dt>用户记录</dt><dd>未枚举 · 未读取</dd></div>
                <div><dt>数据库动作</dt><dd>未打开源库 · 未迁移 · 未登记</dd></div>
                <div><dt>源救援身份</dt><dd>{ORPHANED_V13_SOURCE_RELEASE_IDENTITY.dbGeneration} / Schema {ORPHANED_V13_SOURCE_RELEASE_IDENTITY.targetSchema}</dd></div>
                <div><dt>恢复执行壳</dt><dd>{recoveryShellDescriptor.dbGeneration} / Schema {recoveryShellDescriptor.targetSchema}</dd></div>
              </dl>
              <p>{diagnosticReceipt.deliveryStatus === "saved"
                ? "当前平台已确认诊断文件保存完成。该收据只证明最小环境诊断已交付，不证明来源歧义或孤立状态已经解除。"
                : "浏览器只确认已发起下载；重新载入前请人工核对下载目录。该收据不证明文件已落盘，也不证明来源状态已经解除。"}</p>
            </section>
          ) : null}

          {backupReceipt ? (
            <section className="orphaned-v13-receipt" data-delivery={backupReceipt.deliveryStatus} aria-labelledby="orphaned-v13-receipt-title">
              <header>
                {backupReceipt.deliveryStatus === "saved" ? <CheckCircle2 aria-hidden="true" /> : <Download aria-hidden="true" />}
                <div><p className="eyebrow">Read-only capture receipt</p><h2 id="orphaned-v13-receipt-title">只读捕获收据</h2></div>
                <span>{backupReceipt.deliveryStatus === "saved" ? "文件已保存" : "已请求下载 · 待人工核对"}</span>
              </header>
              <dl>
                <div><dt>交付文件</dt><dd>{safeVisibleText(backupReceipt.fileName, "未命名备份文件", 240)}</dd></div>
                <div><dt>捕获时间</dt><dd>{safeVisibleText(backupReceipt.capturedAt, "未知时间", 120)}</dd></div>
                <div><dt>只读来源</dt><dd>{safeVisibleText(backupReceipt.sourceDatabaseName, "数据库名称不可显示", 512)} · native v{backupReceipt.sourceNativeVersion}</dd></div>
                <div><dt>ZIP 字节</dt><dd>{numberFormatter.format(backupReceipt.outputByteLength)}</dd></div>
                <div><dt>规范 JSON 字节</dt><dd>{numberFormatter.format(backupReceipt.canonicalJsonByteLength)}</dd></div>
                <div><dt>数据库动作</dt><dd>只读捕获 · 未迁移 · 未登记</dd></div>
                <div className="orphaned-v13-receipt__digest"><dt>数据摘要</dt><dd><code>{safeVisibleText(backupReceipt.payloadDigest, "摘要不可显示", 160)}</code></dd></div>
              </dl>
              <p>{backupReceipt.deliveryStatus === "saved"
                ? "当前平台已确认文件保存完成；仍建议人工打开 ZIP 并保留此摘要用于后续核对。"
                : "浏览器只确认已发起下载，不能证明文件已经落盘；关闭页面前请人工核对下载目录与 ZIP 可读性。"}</p>
            </section>
          ) : null}

          <section className="orphaned-v13-recheck" data-preservation-state={preservationCheckpoint?.state ?? "pending"} aria-labelledby="orphaned-v13-recheck-title">
            <div>
              <p className="eyebrow">Normal discovery retry</p>
              <h2 id="orphaned-v13-recheck-title">重新执行完整来源识别</h2>
              <p>先保存所需文件并关闭其他哈基米标签页。正常重新载入会从头运行启动与来源识别，不会跳过 mutation epoch、强制登记旧库或把当前状态改写为已迁移。</p>
              <div
                className="orphaned-v13-recheck__checkpoint"
                data-state={preservationCheckpoint?.state ?? "pending"}
                id="orphaned-v13-preservation-state"
                role="status"
                aria-live="polite"
              >
                <span>Preservation checkpoint</span>
                <strong>{safeVisibleText(preservationCheckpoint?.title, "尚无本次救援的交付收据", 240)}</strong>
                <small>{safeVisibleText(preservationCheckpoint?.detail, "建议先导出最小诊断；识别到唯一来源时，再优先捕获只读完整备份。", 700)}</small>
              </div>
            </div>
            <button type="button" className="secondary-action" disabled={operationLocked} aria-describedby="orphaned-v13-preservation-state" onClick={() => window.location.reload()}>
              {operationLocked ? "请等待当前生成或交付" : "正常重新载入并重检"}
            </button>
          </section>

        </div>
      </main>
      {currentPreparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={currentPreparedDelivery.artifact}
          exportPort={webReportExportPort}
          onClose={closePreparedDelivery}
          onDeliveryResolution={handleDeliveryResolution}
        />
      ) : null}
    </div>
  );
}
