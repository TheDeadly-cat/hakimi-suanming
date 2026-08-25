import { AlertTriangle, Download, FileJson, ShieldCheck } from "lucide-react";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileArchive, RefreshCw } from "lucide-react";
import type { ReportExportPort } from "@hakimi/platform";
import type {
  PreparedFileArtifact,
  PreparedFileDeliveryResolution
} from "../components/prepared-file-delivery-dialog";
import {
  diagnosticBootErrorName,
  diagnosticBootFailureMessage,
  type AppBootFailure
} from "../lib/app-boot-failure";
import { APP_VERSION } from "../lib/app-version";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage as failureMessage, safeVisibleText } from "../lib/visible-text";
import "./recovery-page.css";
import "./boot-failure-recovery-page.css";

const PreparedFileDeliveryDialog = lazy(async () => {
  const module = await import("../components/prepared-file-delivery-dialog");
  return { default: module.PreparedFileDeliveryDialog };
});

export type BootFailureRecoveryView = "diagnostic" | "backup";

export type BootFailureRecoveryProps = {
  failure: AppBootFailure;
  view: BootFailureRecoveryView;
};

type RecoveryFeedback = {
  view: BootFailureRecoveryView;
  tone: "success" | "info" | "error";
  title: string;
  message: string;
};

type DiagnosticReceipt = Readonly<{
  fileName: string;
  deliveryStatus: "saved" | "requested";
  generatedAt: string;
  payloadByteLength: number;
}>;

type BootBackupReceipt = Readonly<{
  fileName: string;
  deliveryStatus: "saved" | "requested";
  generatedAt: string;
  archiveByteLength: number;
  canonicalJsonByteLength: number;
  payloadDigest: string;
}>;

type PreparedBootDelivery =
  | Readonly<{
    kind: "diagnostic";
    contextKey: string;
    artifact: PreparedFileArtifact;
    exportPort: ReportExportPort;
    generatedAt: string;
    payloadByteLength: number;
  }>
  | Readonly<{
    kind: "backup";
    contextKey: string;
    artifact: PreparedFileArtifact;
    exportPort: ReportExportPort;
    generatedAt: string;
    archiveByteLength: number;
    canonicalJsonByteLength: number;
    payloadDigest: string;
  }>;

type PreservationCheckpoint = Readonly<{
  state: "saved" | "requested" | "diagnostic_only";
  title: string;
  detail: string;
}>;

const numberFormatter = new Intl.NumberFormat("zh-CN");
const BOOT_DIAGNOSTIC_BYTE_LIMIT = 128 * 1024;

function getRecoveryReleaseIdentityIssue(): string | null {
  const identity = CURRENT_RELEASE_ENGINEERING_IDENTITY;

  if (
    identity.dbGeneration !== "legacy-v13" ||
    identity.targetSchema !== 13 ||
    identity.migrationId !== null
  ) {
    return "当前发布身份不再是 legacy-v13 / targetSchema 13 / migrationId null；完整备份入口已失败关闭。";
  }

  return null;
}

export function BootFailureRecoveryPage({ failure, view }: BootFailureRecoveryProps) {
  const [busy, setBusy] = useState<"diagnostic" | "backup" | null>(null);
  const [feedback, setFeedbackState] = useState<RecoveryFeedback | null>(null);
  const [diagnosticReceipt, setDiagnosticReceiptState] = useState<DiagnosticReceipt | null>(null);
  const [backupReceipt, setBackupReceiptState] = useState<BootBackupReceipt | null>(null);
  const [preparedDelivery, setPreparedDeliveryState] = useState<PreparedBootDelivery | null>(null);
  const busyRef = useRef<"diagnostic" | "backup" | null>(null);
  const preparedDeliveryRef = useRef<PreparedBootDelivery | null>(null);
  const mountedRef = useRef(true);
  const releaseIdentityIssue = getRecoveryReleaseIdentityIssue();
  const canExportBackup = failure.storageReady && releaseIdentityIssue === null;
  const releaseEvidenceLabel = CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound
    ? safeVisibleText(CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId, "证据绑定状态异常：缺少 evidenceId", 180)
    : "未绑定，仅为本地构建";
  const recoveryContextKey = JSON.stringify({
    source: failure.source,
    errorName: diagnosticBootErrorName(failure.error),
    storageReady: failure.storageReady,
    release: [
      CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.buildVersion,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId,
      CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound
    ]
  });
  const latestRecoveryContextKeyRef = useRef(recoveryContextKey);
  const stateRecoveryContextKeyRef = useRef(recoveryContextKey);
  const visiblePreparedDelivery = preparedDelivery?.contextKey === recoveryContextKey
    ? preparedDelivery
    : null;
  const preservationCheckpoint: PreservationCheckpoint | null = canExportBackup
    ? backupReceipt?.deliveryStatus === "saved"
      ? {
          state: "saved",
          title: "平台已确认只读完整备份保存",
          detail: `${backupReceipt.fileName} · ${backupReceipt.generatedAt}`
        }
      : backupReceipt
        ? {
            state: "requested",
            title: "只读完整备份已请求下载",
            detail: `${backupReceipt.fileName} · 仍需人工核对下载目录与 ZIP 可读性`
          }
        : diagnosticReceipt
          ? {
              state: "diagnostic_only",
              title: diagnosticReceipt.deliveryStatus === "saved"
                ? "最小启动诊断已保存，完整备份尚未生成"
                : "最小启动诊断已请求下载，完整备份尚未生成",
              detail: `${diagnosticReceipt.fileName} · 存储探针已通过，重试前仍建议完成只读完整备份`
            }
          : null
    : diagnosticReceipt?.deliveryStatus === "saved"
      ? {
          state: "saved",
          title: "平台已确认最小启动诊断保存",
          detail: `${diagnosticReceipt.fileName} · ${diagnosticReceipt.generatedAt}`
        }
      : diagnosticReceipt
        ? {
            state: "requested",
            title: "最小启动诊断已请求下载",
            detail: `${diagnosticReceipt.fileName} · 仍需人工核对文件是否落盘`
          }
        : null;
  const diagnosticStepState = busy === "diagnostic"
    ? "active"
    : diagnosticReceipt?.deliveryStatus === "saved"
      ? "complete"
      : diagnosticReceipt
        ? "attention"
        : visiblePreparedDelivery?.kind === "diagnostic"
          ? "attention"
          : "ready";
  const backupStepState = !canExportBackup
    ? "closed"
    : busy === "backup"
      ? "active"
      : backupReceipt?.deliveryStatus === "saved"
        ? "complete"
        : backupReceipt
          ? "attention"
          : visiblePreparedDelivery?.kind === "backup"
            ? "attention"
            : "ready";
  const retryStepState = busy !== null
    ? "waiting"
    : preservationCheckpoint?.state === "saved"
      ? "ready"
      : "attention";
  const recoverySurfaceLocked = busy !== null || visiblePreparedDelivery !== null;

  const setFeedback = (nextFeedback: RecoveryFeedback | null): void => {
    if (mountedRef.current) setFeedbackState(nextFeedback);
  };

  const setDiagnosticReceipt = (nextReceipt: DiagnosticReceipt | null): void => {
    if (mountedRef.current) setDiagnosticReceiptState(nextReceipt);
  };

  const setBackupReceipt = (nextReceipt: BootBackupReceipt | null): void => {
    if (mountedRef.current) setBackupReceiptState(nextReceipt);
  };

  const setPreparedDelivery = (nextDelivery: PreparedBootDelivery | null): void => {
    if (!mountedRef.current) return;
    preparedDeliveryRef.current = nextDelivery;
    setPreparedDeliveryState(nextDelivery);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      busyRef.current = null;
      preparedDeliveryRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    latestRecoveryContextKeyRef.current = recoveryContextKey;
    if (stateRecoveryContextKeyRef.current === recoveryContextKey) return;
    stateRecoveryContextKeyRef.current = recoveryContextKey;
    preparedDeliveryRef.current = null;
    setFeedbackState(null);
    setDiagnosticReceiptState(null);
    setBackupReceiptState(null);
    setPreparedDeliveryState(null);
  }, [recoveryContextKey]);

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

  const exportDiagnostic = async (): Promise<void> => {
    if (!beginOperation("diagnostic")) return;
    const operationContextKey = recoveryContextKey;
    setFeedback(null);
    setDiagnosticReceipt(null);
    setPreparedDelivery(null);
    try {
      const { webReportExportPort } = await import("@hakimi/platform");
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      const generatedAt = new Date().toISOString();
      const payload = {
        format: "hakimi-boot-failure-diagnostic",
        formatVersion: "1.0.0",
        appVersion: APP_VERSION,
        exportedAt: generatedAt,
        containsUserResearchData: false,
        containsLocalTechnicalFingerprint: true,
        sensitivity: "local_technical_fingerprint",
        release: CURRENT_RELEASE_ENGINEERING_IDENTITY,
        readiness: {
          appBootReady: document.documentElement.dataset.appBootReady === "true",
          storageReadinessConfirmed: failure.storageReady,
          serviceWorkerBootSignalSent: document.documentElement.dataset.swBootSignalSent === "true"
        },
        failure: {
          source: failure.source,
          errorName: diagnosticBootErrorName(failure.error),
          messageCode: `HAKIMI_BOOT_${failure.source.toUpperCase()}`,
          message: diagnosticBootFailureMessage(failure.source)
        },
        environment: {
          online: navigator.onLine,
          userAgent: safeVisibleText(navigator.userAgent, "浏览器标识不可用", 1024)
        },
        boundary: "No birth data, case aliases, notes, events, knowledge text or local record counts are included; browser and network identifiers remain sensitive."
      };
      const payloadText = `${JSON.stringify(payload, null, 2)}\n`;
      const diagnosticBlob = new Blob([payloadText], { type: "application/json;charset=utf-8" });
      const payloadByteLength = diagnosticBlob.size;
      if (
        !Number.isSafeInteger(payloadByteLength)
        || payloadByteLength <= 0
        || payloadByteLength > BOOT_DIAGNOSTIC_BYTE_LIMIT
      ) {
        throw new Error(`启动诊断 JSON 超出 ${numberFormatter.format(BOOT_DIAGNOSTIC_BYTE_LIMIT)} 字节安全预算。`);
      }
      const filename = `hakimi-boot-failure-diagnostic-${generatedAt.slice(0, 10)}.json`;
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      setPreparedDelivery({
        kind: "diagnostic",
        contextKey: operationContextKey,
        exportPort: webReportExportPort,
        generatedAt,
        payloadByteLength,
        artifact: {
          blob: diagnosticBlob,
          filename,
          title: "启动失败最小诊断 JSON",
          description: "诊断 JSON 已在本机内存中冻结，尚未保存或下载；它不含用户研究资料，但包含浏览器标识、网络状态与发布身份等敏感技术指纹。",
          sharePolicy: "blocked_sensitive"
        }
      });
      setFeedback({
        view: "diagnostic",
        tone: "info",
        title: "启动诊断已生成，等待人工交付",
        message: `不可变 JSON 已在本机内存中准备完成，共 ${numberFormatter.format(payloadByteLength)} 字节；生成阶段没有调用保存、下载或分享端口。`
      });
    } catch (reason) {
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      setFeedback({
        view: "diagnostic",
        tone: "error",
        title: "启动诊断未能生成",
        message: failureMessage(reason, "浏览器没有完成诊断工件生成。")
      });
    } finally {
      finishOperation("diagnostic");
    }
  };

  const exportReadOnlyBackup = async (): Promise<void> => {
    if (!canExportBackup || !beginOperation("backup")) return;
    const operationContextKey = recoveryContextKey;
    setFeedback(null);
    setBackupReceipt(null);
    setPreparedDelivery(null);
    try {
      const [{ createFullBackupArtifactOffMainThread }, { webReportExportPort }, { caseRepository }] = await Promise.all([
        import("../lib/full-backup-worker-client"),
        import("@hakimi/platform"),
        import("@hakimi/storage")
      ]);
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      const snapshot = await caseRepository.readFullDataSnapshot();
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      const backupArtifact = await createFullBackupArtifactOffMainThread(
        snapshot,
        { appVersion: APP_VERSION },
        "zip"
      );
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      const mediaType = backupArtifact.blob.type.split(";", 1)[0]?.trim().toLowerCase();
      if (
        !/^[0-9a-f]{64}$/u.test(backupArtifact.payloadDigest) ||
        !Number.isSafeInteger(backupArtifact.canonicalJsonByteLength) ||
        backupArtifact.canonicalJsonByteLength <= 0 ||
        !Number.isSafeInteger(backupArtifact.outputByteLength) ||
        backupArtifact.outputByteLength <= 0 ||
        backupArtifact.blob.size !== backupArtifact.outputByteLength ||
        mediaType !== "application/zip"
      ) {
        throw new Error("完整备份 Worker 返回的摘要或 ZIP 字节回执不一致。");
      }
      const generatedAt = new Date().toISOString();
      const filename = `hakimi-boot-failure-safety-backup-${generatedAt.slice(0, 10)}.zip`;
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      setPreparedDelivery({
        kind: "backup",
        contextKey: operationContextKey,
        exportPort: webReportExportPort,
        generatedAt,
        archiveByteLength: backupArtifact.outputByteLength,
        canonicalJsonByteLength: backupArtifact.canonicalJsonByteLength,
        payloadDigest: backupArtifact.payloadDigest,
        artifact: {
          blob: backupArtifact.blob,
          filename,
          title: "启动失败只读完整备份 ZIP",
          description: `包含当前十六个用户数据分区的高度敏感只读备份；ZIP ${numberFormatter.format(backupArtifact.outputByteLength)} 字节，规范 JSON ${numberFormatter.format(backupArtifact.canonicalJsonByteLength)} 字节，payload SHA-256 ${backupArtifact.payloadDigest}。工件已冻结但尚未保存或下载。`,
          sharePolicy: "blocked_sensitive"
        }
      });
      setFeedback({
        view: "backup",
        tone: "info",
        title: "只读安全备份已生成，等待人工交付",
        message: `不可变 ZIP 已在本机内存中准备完成，共 ${numberFormatter.format(backupArtifact.outputByteLength)} 字节；生成阶段只读取并校验当前十六分区，没有调用保存、下载或分享端口。`
      });
    } catch (reason) {
      if (!mountedRef.current || latestRecoveryContextKeyRef.current !== operationContextKey) return;
      setFeedback({
        view: "backup",
        tone: "error",
        title: "只读安全备份未能生成",
        message: `${failureMessage(reason, "本地数据未能通过只读备份检查。")} 应用没有改写或删除记录；请保留当前浏览器资料。`
      });
    } finally {
      finishOperation("backup");
    }
  };

  const handleDeliveryResolution = (event: PreparedFileDeliveryResolution): void => {
    const prepared = preparedDeliveryRef.current;
    if (
      !mountedRef.current
      || !prepared
      || event.artifact !== prepared.artifact
      || prepared.contextKey !== latestRecoveryContextKeyRef.current
      || event.result.filename !== prepared.artifact.filename
      || event.intent === "share"
    ) {
      return;
    }

    if (event.resolution.kind === "cancelled") {
      if (event.result.status !== "cancelled" || event.result.operation !== "save") return;
      setFeedback({
        view: prepared.kind,
        tone: "info",
        title: prepared.kind === "diagnostic" ? "已取消启动诊断交付" : "已取消只读安全备份交付",
        message: event.resolution.message
      });
      return;
    }

    if (event.resolution.kind === "requested") {
      if (event.intent !== "download" || event.result.status !== "download_requested") return;
    } else if (event.result.status !== "saved") {
      return;
    }

    const deliveryStatus = event.resolution.kind === "completed" ? "saved" : "requested";
    if (prepared.kind === "diagnostic") {
      setDiagnosticReceipt({
        fileName: prepared.artifact.filename,
        deliveryStatus,
        generatedAt: prepared.generatedAt,
        payloadByteLength: prepared.payloadByteLength
      });
      setFeedback({
        view: "diagnostic",
        tone: deliveryStatus === "saved" ? "success" : "info",
        title: deliveryStatus === "saved" ? "启动诊断已保存" : "启动诊断已请求下载",
        message: `${event.resolution.message} JSON ${numberFormatter.format(prepared.payloadByteLength)} 字节；不含出生资料、案例别名、笔记、事件或知识正文，但浏览器标识与网络状态仍按敏感技术指纹保管。`
      });
      return;
    }

    setBackupReceipt({
      fileName: prepared.artifact.filename,
      deliveryStatus,
      generatedAt: prepared.generatedAt,
      archiveByteLength: prepared.archiveByteLength,
      canonicalJsonByteLength: prepared.canonicalJsonByteLength,
      payloadDigest: prepared.payloadDigest
    });
    setFeedback({
      view: "backup",
      tone: deliveryStatus === "saved" ? "success" : "info",
      title: deliveryStatus === "saved" ? "只读安全备份已保存" : "只读安全备份已请求下载",
      message: `${event.resolution.message} ZIP ${numberFormatter.format(prepared.archiveByteLength)} 字节，规范 JSON ${numberFormatter.format(prepared.canonicalJsonByteLength)} 字节；本操作只读取并校验当前十六分区，不导入、不恢复、不删除，也不修改本机设置。`
    });
  };

  const closePreparedDelivery = (expected: PreparedBootDelivery): void => {
    if (
      preparedDeliveryRef.current !== expected
      || expected.contextKey !== latestRecoveryContextKeyRef.current
    ) {
      return;
    }
    setPreparedDelivery(null);
    setFeedback(null);
  };

  return (
    <div
      className="page page--boot-recovery"
      data-release-family="legacy"
      data-schema-version="13"
      data-db-schema-version="13"
      data-evidence-authority="engineering-only"
      data-formal-validation-complete="false"
      data-scientific-validation-complete="false"
      data-mutation-mode="writes-frozen-read-only-export-only"
      data-mutation-epoch-state="not_bypassed"
      data-write-mode="frozen"
      data-file-delivery-kind={view === "diagnostic" ? "diagnostic-json" : "full-backup-zip"}
      data-file-delivery-certainty={
        busy !== null
          ? "in_progress"
          : view === "diagnostic"
            ? diagnosticReceipt?.deliveryStatus
              ?? (visiblePreparedDelivery?.kind === "diagnostic" ? "prepared" : "none")
            : backupReceipt?.deliveryStatus
              ?? (visiblePreparedDelivery?.kind === "backup" ? "prepared" : "none")
      }
      data-storage-probe={failure.storageReady ? "ready" : "closed"}
      data-release-gate={releaseIdentityIssue === null ? "ready" : "closed"}
      data-operation={busy ?? "idle"}
      data-preservation-state={preservationCheckpoint?.state ?? "pending"}
      data-backup-capability={canExportBackup ? "read_only_available" : "closed"}
      data-recovery-view={view}
      data-delivery-mode="prepared-two-stage"
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-release-evidence-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound ? releaseEvidenceLabel : "none"}
      data-engineering-evidence-only="true"
      data-write-reconciliation-required="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-epoch-bypassed="false"
      aria-busy={busy !== null}
    >
      {visiblePreparedDelivery ? (
        <Suspense fallback={(
          <div className="recovery-operation-status" role="status" aria-live="polite" aria-atomic="true">
            <Download aria-hidden="true" />
            <div><strong>正在载入本机文件交付门禁</strong><p>冻结工件保持在内存中；尚未调用保存、下载或分享端口。</p></div>
          </div>
        )}>
          <PreparedFileDeliveryDialog
            artifact={visiblePreparedDelivery.artifact}
            exportPort={visiblePreparedDelivery.exportPort}
            onDeliveryResolution={handleDeliveryResolution}
            onClose={() => closePreparedDelivery(visiblePreparedDelivery)}
          />
        </Suspense>
      ) : null}

      <section className="error-panel app-boot-failure" role="alert" aria-labelledby="app-boot-failure-title">
        <AlertTriangle aria-hidden="true" />
        <div className="app-boot-failure__content">
          <p className="eyebrow">Fail-closed recovery</p>
          <h1 id="app-boot-failure-title">启动完整性检查未通过</h1>
          <p className="app-boot-failure__lead">应用没有确认当前页面、本地数据库与计算核心可安全协同。普通工作台、排盘、案例、事件、运限、知识导入、规则激活、恢复和删除入口均已停止渲染。</p>
          <div className="app-boot-failure__directive">
            <strong>请勿清除浏览器数据，也不要反复尝试写入。</strong>
            <span>先生成不含研究资料的诊断，再通过独立交付门禁保存或下载；只有数据库读取探针通过且发布身份仍严格匹配时，才会开放只读完整备份。</span>
          </div>
          <dl className="app-boot-failure__facts" aria-label="当前启动恢复即时状态">
            <div data-state="closed"><dt>写入模式</dt><dd>完全冻结</dd></div>
            <div data-state={failure.storageReady ? "ready" : "closed"}><dt>存储读取探针</dt><dd>{failure.storageReady ? "已通过" : "未通过"}</dd></div>
            <div data-state={canExportBackup ? "ready" : "closed"}><dt>完整备份门禁</dt><dd>{canExportBackup ? "只读入口可用" : "保持关闭"}</dd></div>
          </dl>
          <details className="app-boot-failure__technical">
            <summary>查看故障阶段与工程身份</summary>
            <div>
              <p>故障阶段：<code>{safeVisibleText(failure.source, "阶段未识别", 80)}</code>。诊断文件只记录阶段、允许列表错误类型和通用说明，不写入原始异常正文或调用栈。</p>
              <p>当前应用身份：<code>{CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration} / Schema {CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}</code>，migrationId <code>{CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}</code>；Release Evidence {CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound ? <code>{releaseEvidenceLabel}</code> : releaseEvidenceLabel}。</p>
              <p>该身份只用于工程恢复诊断，不把当前数据库判为已迁移，也不代表专家真值或内容授权。</p>
            </div>
          </details>
        </div>
      </section>

      <section
        className="recovery-runbook"
        aria-labelledby="boot-recovery-runbook-title"
        aria-busy={busy !== null}
      >
        <header className="recovery-runbook__heading">
          <div>
            <p className="recovery-runbook__kicker">Recovery runbook</p>
            <h2 id="boot-recovery-runbook-title">按只读顺序处理</h2>
          </div>
          <p>先保留浏览器中的原始资料，再生成可核对的最小诊断；只有存储读取探针通过后，才开放只读备份。</p>
        </header>

        <ol className="recovery-runbook__steps">
          <li data-state="complete">
            <span className="recovery-runbook__index">01</span>
            <div>
              <small>Freeze</small>
              <strong>停止一切写入</strong>
              <p>普通工作台已退出，当前页面不执行迁移或修复。</p>
            </div>
            <em>已执行</em>
          </li>
          <li data-state={diagnosticStepState} aria-current={busy === "diagnostic" ? "step" : undefined}>
            <span className="recovery-runbook__index">02</span>
            <div>
              <small>Diagnose</small>
              <strong>生成最小诊断</strong>
              <p>仅记录启动阶段、发布身份与存储探针，不读取用户资料。</p>
            </div>
            <em>{busy === "diagnostic" ? "正在生成" : diagnosticReceipt?.deliveryStatus === "saved" ? "已确认保存" : diagnosticReceipt ? "待核对落盘" : visiblePreparedDelivery?.kind === "diagnostic" ? "待人工交付" : "可生成"}</em>
          </li>
          <li data-state={backupStepState} aria-current={busy === "backup" ? "step" : undefined}>
            <span className="recovery-runbook__index">03</span>
            <div>
              <small>Preserve</small>
              <strong>生成只读备份</strong>
              <p>完整备份仅通过既有只读端口生成，并在交付前重新解析归档与核对摘要。</p>
            </div>
            <em>{canExportBackup ? busy === "backup" ? "正在捕获" : backupReceipt?.deliveryStatus === "saved" ? "已确认保存" : backupReceipt ? "待核对 ZIP" : visiblePreparedDelivery?.kind === "backup" ? "待人工交付" : "可生成" : "保持关闭"}</em>
          </li>
          <li data-state={retryStepState}>
            <span className="recovery-runbook__index">04</span>
            <div>
              <small>Retry</small>
              <strong>重新运行完整启动检查</strong>
              <p>{preservationCheckpoint?.state === "saved"
                ? "本次启动已有平台确认保存的交付收据；关闭其他标签页后，只通过正常重新载入重试。"
                : preservationCheckpoint?.state === "requested"
                  ? "浏览器只确认已请求下载；请先人工核对文件落盘和可读性，再关闭其他标签页并正常重新载入。"
                  : preservationCheckpoint?.state === "diagnostic_only"
                    ? "最小诊断已经留存，但当前存储探针允许生成只读完整备份；重试前仍建议先保留当前十六分区。"
                  : "重新载入始终可用，但建议先生成并交付最小诊断；可备份时再优先保留只读完整备份。"}</p>
            </div>
            <em>{busy !== null ? "等待生成" : preservationCheckpoint?.state === "saved" ? "已有保存收据" : preservationCheckpoint?.state === "requested" ? "待人工核对" : preservationCheckpoint?.state === "diagnostic_only" ? "仍建议完整备份" : "建议先留存"}</em>
          </li>
        </ol>

        <dl className="recovery-runbook__ledger">
          <div>
            <dt>故障阶段</dt>
            <dd>{safeVisibleText(failure.source, "阶段未识别", 80)}</dd>
          </div>
          <div>
            <dt>存储读取探针</dt>
            <dd>{failure.storageReady ? "已通过" : "未通过"}</dd>
          </div>
          <div>
            <dt>写入模式</dt>
            <dd>完全冻结</dd>
          </div>
          <div>
            <dt>可执行动作</dt>
            <dd>{canExportBackup ? "诊断与只读备份" : "仅最小诊断"}</dd>
          </div>
          <div>
            <dt>安全错误分类</dt>
            <dd>{safeVisibleText(diagnosticBootErrorName(failure.error), "错误类型未识别", 120)}</dd>
          </div>
          <div>
            <dt>发布工程身份</dt>
            <dd>
              {CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration} / targetSchema {CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema} / migrationId {CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="recovery-target-lock" data-state={canExportBackup ? "ready" : "closed"} aria-label="当前启动救援目标">
        <ShieldCheck aria-hidden="true" />
        <div>
          <small>Bound rescue scope</small>
          <strong>{canExportBackup ? "本次启动的只读存储上下文已锁定" : "没有建立可备份的数据目标"}</strong>
          <p>{canExportBackup
            ? "备份操作只读取已通过探针的当前上下文；不会改用其他数据库、启动迁移或写入控制记录。"
            : safeVisibleText(
                releaseIdentityIssue,
                "存储探针未通过，因此页面只允许生成不含研究资料的最小诊断。"
              )}</p>
        </div>
        <code>{safeVisibleText(failure.source, "阶段未识别", 80)} · {safeVisibleText(CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration, "代际未识别", 80)} / Schema {CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}</code>
      </section>

      <nav className="boot-recovery-nav" aria-label="启动恢复导航" aria-busy={busy !== null}>
        <AppLink
          href="/settings"
          className={view === "diagnostic" ? "is-active" : ""}
          aria-current={view === "diagnostic" ? "page" : undefined}
          aria-disabled={recoverySurfaceLocked ? true : undefined}
          onClick={recoverySurfaceLocked ? (event) => event.preventDefault() : undefined}
        >
          <FileJson aria-hidden="true" />启动诊断
        </AppLink>
        <AppLink
          href="/settings/data"
          className={view === "backup" ? "is-active" : ""}
          aria-current={view === "backup" ? "page" : undefined}
          aria-disabled={recoverySurfaceLocked ? true : undefined}
          onClick={recoverySurfaceLocked ? (event) => event.preventDefault() : undefined}
        >
          <ShieldCheck aria-hidden="true" />只读安全备份
        </AppLink>
      </nav>
      <p className="boot-recovery-nav-note">
        启动失败期间，<code>/settings</code> 与 <code>/settings/data</code> 只切换当前救援视图；不会渲染正常设置页，也不会开放恢复、导入或删除。
      </p>

      {busy ? (
        <div className="recovery-operation-status" role="status" aria-live="polite" aria-atomic="true">
          <Download aria-hidden="true" />
          <div><strong>{busy === "diagnostic" ? "正在生成最小启动诊断" : "正在只读校验并打包完整备份"}</strong><p>{busy === "diagnostic" ? "不会枚举或读取用户研究资料。" : "源数据库保持冻结；完成前不会开放其他恢复动作。"}</p></div>
        </div>
      ) : null}

      <aside className="recovery-direct-delivery-boundary" data-sensitivity={view === "backup" ? "full-research" : "limited-diagnostic"} aria-label="启动失败两阶段交付边界">
        <ShieldCheck aria-hidden="true" />
        <div>
          <small>Prepared two-stage delivery</small>
          <strong>{view === "backup" ? "完整备份包含全部本地研究资料" : "最小诊断只含有限技术指纹"}</strong>
          <p>{view === "backup"
            ? "启动失败时先只读生成并冻结唯一 ZIP，再由独立门禁人工选择保存或下载；它包含十六个用户数据分区，只能保存到可信位置。生成不等于保存，下载请求必须人工核对。"
            : "启动失败时先在内存中生成唯一诊断 JSON，再由独立门禁人工保存或下载；它不枚举用户记录，但仍包含浏览器标识、网络状态与发布身份。生成不证明文件已落盘。"}</p>
        </div>
        <span>{view === "backup" ? "高度敏感 · 禁止分享" : "有限诊断 · 谨慎交付"}</span>
      </aside>

      {view === "diagnostic" ? (
        <section className="boot-recovery-card" aria-labelledby="boot-diagnostic-title">
          <p className="eyebrow">Diagnostic only</p>
          <h2 id="boot-diagnostic-title">生成最小启动诊断</h2>
          <p>文件只记录应用版本、启动确认状态、数据库读取探针是否通过、网络状态、浏览器标识和通用错误分类；不会枚举本地记录，也不会写入原始异常正文、出生资料、别名、笔记、事件或知识正文。生成后再通过独立门禁人工交付同一份冻结文件。</p>
          <button type="button" className="primary-action" disabled={recoverySurfaceLocked} aria-busy={busy === "diagnostic"} onClick={() => void exportDiagnostic()}>
            <Download aria-hidden="true" />{busy === "diagnostic" ? "正在生成诊断" : "生成启动诊断 JSON"}
          </button>
        </section>
      ) : (
        <section className="boot-recovery-card" aria-labelledby="boot-backup-title">
          <p className="eyebrow">Read-only rescue</p>
          <h2 id="boot-backup-title">生成当前完整安全备份</h2>
          <p>{canExportBackup
            ? "数据库读取探针已通过。这里仅允许读取、校验并冻结当前十六分区，再由独立门禁人工保存或下载同一 ZIP；恢复、导入、编辑、删除与清空操作全部不可用。"
            : safeVisibleText(releaseIdentityIssue, "数据库读取探针未通过或未完成。为避免再次触发升级或写入，本次启动不会重新打开数据库，也不会开放备份按钮。请关闭其他研究台标签页后重新载入；仍失败时保留当前浏览器资料。")}</p>
          <button type="button" className="primary-action" disabled={!canExportBackup || recoverySurfaceLocked} aria-busy={busy === "backup"} onClick={() => void exportReadOnlyBackup()}>
            <Download aria-hidden="true" />{busy === "backup" ? "正在只读校验并打包" : "生成只读完整备份 ZIP"}
          </button>
        </section>
      )}

      {feedback?.view === view ? (
        <div
          className="boot-recovery-feedback"
          data-tone={feedback.tone}
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <strong>{safeVisibleText(feedback.title, "恢复操作状态", 120)}</strong>
          <p>{safeVisibleText(feedback.message, "恢复操作状态不可用。")}</p>
        </div>
      ) : null}

      {diagnosticReceipt && view === "diagnostic" ? (
        <section className="boot-recovery-receipt boot-recovery-receipt--diagnostic" data-delivery={diagnosticReceipt.deliveryStatus} aria-labelledby="boot-diagnostic-receipt-title">
          <header>
            <FileJson aria-hidden="true" />
            <div><p className="eyebrow">Diagnostic receipt</p><h2 id="boot-diagnostic-receipt-title">最小启动诊断收据</h2></div>
            <span>{diagnosticReceipt.deliveryStatus === "saved" ? "文件已保存" : "已请求下载 · 待人工核对"}</span>
          </header>
          <dl>
            <div><dt>交付文件</dt><dd>{safeVisibleText(diagnosticReceipt.fileName, "未命名诊断文件", 180)}</dd></div>
            <div><dt>生成时间 / JSON</dt><dd>{safeVisibleText(diagnosticReceipt.generatedAt, "时间未识别", 100)} · {numberFormatter.format(diagnosticReceipt.payloadByteLength)} 字节</dd></div>
            <div><dt>交付状态</dt><dd>{diagnosticReceipt.deliveryStatus === "saved" ? "浏览器确认保存" : "浏览器仅确认请求"}</dd></div>
            <div><dt>用户记录</dt><dd>未枚举 · 未读取</dd></div>
            <div><dt>错误内容</dt><dd>允许列表分类 · 无原始正文</dd></div>
            <div><dt>工程身份</dt><dd>{CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration} / Schema {CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}</dd></div>
          </dl>
          <p>{diagnosticReceipt.deliveryStatus === "saved"
            ? "浏览器已确认诊断文件保存完成。该收据只证明本次最小诊断交付，不证明启动故障已经解除。"
            : "浏览器只确认已发起下载；重新载入前请人工核对下载目录。该收据不证明文件已落盘，也不证明启动故障已经解除。"}</p>
        </section>
      ) : null}

      {backupReceipt && view === "backup" ? (
        <section className="boot-recovery-receipt" data-delivery={backupReceipt.deliveryStatus} aria-labelledby="boot-recovery-receipt-title">
          <header>
            <FileArchive aria-hidden="true" />
            <div><p className="eyebrow">Safety backup receipt</p><h2 id="boot-recovery-receipt-title">只读安全备份收据</h2></div>
            <span>{backupReceipt.deliveryStatus === "saved" ? "文件已保存" : "已请求下载 · 待人工核对"}</span>
          </header>
          <dl>
            <div><dt>交付文件</dt><dd>{safeVisibleText(backupReceipt.fileName, "未命名备份文件", 180)}</dd></div>
            <div><dt>打包完成时间</dt><dd>{safeVisibleText(backupReceipt.generatedAt, "时间未识别", 100)}</dd></div>
            <div><dt>ZIP / 规范 JSON 字节</dt><dd>{numberFormatter.format(backupReceipt.archiveByteLength)} / {numberFormatter.format(backupReceipt.canonicalJsonByteLength)}</dd></div>
            <div><dt>数据范围</dt><dd>当前十六个用户数据分区</dd></div>
            <div><dt>数据库动作</dt><dd>只读导出 · 未恢复 · 未迁移</dd></div>
            <div><dt>工程身份</dt><dd>{CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration} / Schema {CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}</dd></div>
            <div className="boot-recovery-receipt__digest"><dt>Payload SHA-256</dt><dd><code>{safeVisibleText(backupReceipt.payloadDigest, "摘要不可用", 180)}</code></dd></div>
          </dl>
          <p>{backupReceipt.deliveryStatus === "saved"
            ? "浏览器已确认保存完成；归档已在交付前通过 manifest 与 payload 摘要预检，仍建议人工打开 ZIP。该摘要仅是工程完整性证据。"
            : "归档已在交付前通过 manifest 与 payload 摘要预检，但浏览器只确认已发起下载，不能证明文件已经落盘；重试启动前请人工核对下载目录和 ZIP 可读性。"}</p>
        </section>
      ) : null}

      <section className="boot-recovery-retry" data-preservation-state={preservationCheckpoint?.state ?? "pending"} aria-labelledby="boot-retry-title">
        <div className="boot-recovery-retry__icon" aria-hidden="true">
          <RefreshCw />
        </div>
        <div className="boot-recovery-retry__copy">
          <p className="eyebrow">Normal boot retry</p>
          <h2 id="boot-retry-title">重新执行全部启动门禁</h2>
          <p>重试只执行浏览器的正常重新载入，由应用从头核对页面、存储与计算核心。它不会跳过 mutation epoch、强制迁移，也不会把本次失败改写成成功。</p>
          <div
            className="boot-recovery-retry__checkpoint"
            data-state={preservationCheckpoint?.state ?? "pending"}
            id="boot-recovery-preservation-state"
            role="status"
            aria-live="polite"
          >
            <span>Preservation checkpoint</span>
            <strong>{safeVisibleText(preservationCheckpoint?.title, "尚无本次启动的交付收据", 160)}</strong>
            <small>{safeVisibleText(preservationCheckpoint?.detail, "建议先生成并交付最小诊断；存储探针通过时，再优先生成只读完整备份。")}</small>
          </div>
        </div>
        <button
          type="button"
          className="boot-recovery-retry__action"
          disabled={recoverySurfaceLocked}
          aria-describedby="boot-recovery-preservation-state"
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden="true" />
          {busy !== null ? "请等待当前生成" : visiblePreparedDelivery ? "请先处理当前文件" : "正常重新载入"}
        </button>
      </section>

    </div>
  );
}
