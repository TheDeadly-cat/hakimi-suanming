import { AlertTriangle, Download } from "lucide-react";
import { useState } from "react";
import { saveBlobFile, saveTextFile } from "@hakimi/platform";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";

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
}>;

export type OrphanedV13RecoveryPageProps = Readonly<{
  state: OrphanedV13RecoveryState;
  captureBackup: () => Promise<OrphanedV13BackupCapture>;
}>;

type RecoveryFeedback = Readonly<{
  tone: "success" | "info" | "error";
  title: string;
  message: string;
}>;

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message.trim() ? reason.message : fallback;
}

function sanitizedInventory(state: OrphanedV13RecoveryState): OrphanedV13InventoryEntry[] {
  return state.inventory.map(({ name, version }) => ({ name, version }));
}

function diagnosticPayload(state: OrphanedV13RecoveryState) {
  return {
    format: "hakimi-orphaned-v13-recovery-diagnostic",
    formatVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    containsUserResearchData: false,
    recoveryState: state.kind,
    reasonCode: state.reasonCode,
    inventory: sanitizedInventory(state),
    source: state.kind === "orphaned_v13"
      ? { databaseName: state.sourceDatabaseName, nativeVersion: state.nativeVersion }
      : null,
    safetyBoundary: {
      readOnlyBackupAvailable: state.kind === "orphaned_v13",
      normalNavigationAvailable: false,
      importAvailable: false,
      restoreAvailable: false,
      editAvailable: false,
      deleteAvailable: false,
      upgradeAvailable: false
    }
  };
}

function assertBackupCapture(capture: OrphanedV13BackupCapture): void {
  if (!(capture.blob instanceof Blob) || capture.blob.size !== capture.outputByteLength) {
    throw new Error("备份文件长度与只读捕获结果不一致。");
  }
  if (!/^[0-9a-f]{64}$/u.test(capture.payloadDigest)) {
    throw new Error("只读捕获没有返回可核验的数据摘要。");
  }
  if (!Number.isSafeInteger(capture.canonicalJsonByteLength) || capture.canonicalJsonByteLength < 0) {
    throw new Error("只读捕获返回的规范数据长度无效。");
  }
  if (!capture.capturedAt || Number.isNaN(Date.parse(capture.capturedAt))) {
    throw new Error("只读捕获没有返回有效的捕获时间。");
  }
}

export function OrphanedV13RecoveryPage({ state, captureBackup }: OrphanedV13RecoveryPageProps) {
  const [busy, setBusy] = useState<"diagnostic" | "backup" | null>(null);
  const [feedback, setFeedback] = useState<RecoveryFeedback | null>(null);
  const canCaptureBackup = state.kind === "orphaned_v13";

  const exportDiagnostic = async () => {
    setBusy("diagnostic");
    setFeedback(null);
    try {
      const filename = `hakimi-v13-recovery-diagnostic-${dateStamp()}.json`;
      const payload = `${JSON.stringify(diagnosticPayload(state), null, 2)}\n`;
      const delivery = resolveFileDelivery(
        await saveTextFile(filename, payload, "application/json;charset=utf-8"),
        "v13 只读诊断导出"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setFeedback({
          tone: "info",
          title: "已取消诊断文件下载",
          message: delivery.message
        });
        return;
      }
      setFeedback({
        tone: "success",
        title: "诊断文件已交给保存流程",
        message: `${delivery.message} 文件只包含恢复状态、原因代码和数据库名称/版本清单，不包含案例、出生资料、笔记、事件、知识正文或记录数量。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "诊断文件未能下载",
        message: errorMessage(reason, "浏览器没有完成诊断文件下载。")
      });
    } finally {
      setBusy(null);
    }
  };

  const exportReadOnlyBackup = async () => {
    if (!canCaptureBackup) return;
    setBusy("backup");
    setFeedback(null);
    try {
      const capture = await captureBackup();
      assertBackupCapture(capture);
      const filename = `hakimi-v13-read-only-full-backup-${dateStamp()}.zip`;
      const delivery = resolveFileDelivery(
        await saveBlobFile(filename, capture.blob),
        "v13 只读完整备份下载"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setFeedback({
          tone: "info",
          title: "已取消只读完整备份下载",
          message: `${delivery.message} 数据库只完成了读取与验真，没有发生写入或删除。`
        });
        return;
      }
      setFeedback({
        tone: "success",
        title: "只读完整备份已交给保存流程",
        message: `${delivery.message} 捕获时间 ${capture.capturedAt}；ZIP ${capture.outputByteLength} 字节，规范 JSON ${capture.canonicalJsonByteLength} 字节；数据摘要 ${capture.payloadDigest}。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "只读完整备份未能生成或下载",
        message: `${errorMessage(reason, "本地 v13 数据没有完成只读捕获与验真。")} 页面没有写入、删除或升级数据库；请保留当前浏览器资料。`
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="boot-failure-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="boot-failure-header">
        <div className="boot-failure-brand">
          <img src="/brand-mark.svg" alt="" width="40" height="40" />
          <span><strong>哈基米</strong><small>八字研究台</small></span>
        </div>
        <strong>v13 数据救援模式</strong>
      </header>

      <main id="main-content" tabIndex={-1}>
        <div className="page page--boot-recovery">
          <section className="error-panel app-boot-failure" role="alert" aria-labelledby="orphaned-v13-title">
            <AlertTriangle aria-hidden="true" />
            <div>
              <p className="eyebrow">Read-only rescue</p>
              <h1 id="orphaned-v13-title">
                {canCaptureBackup ? "检测到未登记的 v13 本地数据库" : "本地数据库状态无法安全判定"}
              </h1>
              <p>{canCaptureBackup
                ? `已只读识别源数据库 ${state.sourceDatabaseName}（原生版本 ${state.nativeVersion}）。当前应用不会把它登记为已提交数据库，也不会启动迁移。`
                : "检测结果不能唯一证明哪个数据库是可信的 v13 源。为避免选错数据源，本页不会打开任何数据库来生成备份。"}</p>
              <p>原因代码：<code>{state.reasonCode}</code>。普通工作台和普通导航均未挂载。</p>
              <p><strong>请勿清除浏览器数据。</strong>本页不会导入、恢复、编辑或删除资料，也不会继续数据库升级。</p>
            </div>
          </section>

          <section className="boot-recovery-card" aria-labelledby="v13-diagnostic-title">
            <p className="eyebrow">Diagnostic only</p>
            <h2 id="v13-diagnostic-title">不含用户资料的最小诊断</h2>
            <p>诊断只记录恢复状态、原因代码，以及已清洗的数据库名称和版本；不枚举记录，也不包含案例、出生资料、笔记、事件或知识正文。</p>
            <div className="button-row">
              <button
                type="button"
                className="secondary-action"
                disabled={busy !== null}
                onClick={() => void exportDiagnostic()}
              >
                <Download aria-hidden="true" />
                {busy === "diagnostic" ? "正在生成诊断 JSON" : "下载不含用户资料的诊断 JSON"}
              </button>
            </div>
          </section>

          {canCaptureBackup ? (
            <section className="boot-recovery-card" style={{ marginTop: 18 }} aria-labelledby="v13-backup-title">
              <p className="eyebrow">Verified snapshot</p>
              <h2 id="v13-backup-title">只读捕获已识别的 v13 数据</h2>
              <p>备份从同一份只读快照生成并核验摘要；页面不会创建控制记录、目标数据库或迁移日志。</p>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-action"
                  disabled={busy !== null}
                  onClick={() => void exportReadOnlyBackup()}
                >
                  <Download aria-hidden="true" />
                  {busy === "backup" ? "正在只读验真并打包" : "生成并下载只读完整备份 ZIP"}
                </button>
              </div>
            </section>
          ) : null}

          {feedback ? (
            <div
              className={feedback.tone === "error" ? "inline-error" : "boot-recovery-success"}
              role={feedback.tone === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <strong>{feedback.title}</strong>
              <p>{feedback.message}</p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
