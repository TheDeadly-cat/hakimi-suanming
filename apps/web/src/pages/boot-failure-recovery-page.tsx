import { AlertTriangle, Download, FileJson, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  diagnosticBootErrorName,
  diagnosticBootFailureMessage,
  type AppBootFailure
} from "../lib/app-boot-failure";
import { APP_VERSION } from "../lib/app-version";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { AppLink } from "../lib/router";

export type BootFailureRecoveryView = "diagnostic" | "backup";

export type BootFailureRecoveryProps = {
  failure: AppBootFailure;
  view: BootFailureRecoveryView;
};

type RecoveryFeedback = {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
};

function failureMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BootFailureRecoveryPage({ failure, view }: BootFailureRecoveryProps) {
  const [busy, setBusy] = useState<"diagnostic" | "backup" | null>(null);
  const [feedback, setFeedback] = useState<RecoveryFeedback | null>(null);

  const exportDiagnostic = async () => {
    setBusy("diagnostic");
    setFeedback(null);
    try {
      const { saveTextFile } = await import("@hakimi/platform");
      const payload = {
        format: "hakimi-boot-failure-diagnostic",
        formatVersion: "1.0.0",
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        containsUserResearchData: false,
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
          userAgent: navigator.userAgent
        },
        boundary: "No birth data, case aliases, notes, events, knowledge text or local record counts are included."
      };
      const filename = `hakimi-boot-failure-diagnostic-${dateStamp()}.json`;
      const delivery = resolveFileDelivery(
        await saveTextFile(filename, `${JSON.stringify(payload, null, 2)}\n`, "application/json;charset=utf-8"),
        "启动诊断导出"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setFeedback({ tone: "info", title: "已取消启动诊断导出", message: delivery.message });
        return;
      }
      setFeedback({
        tone: "success",
        title: "启动诊断已交付",
        message: `${delivery.message} 文件不含出生资料、案例别名、笔记、事件或知识正文。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "启动诊断未能导出",
        message: failureMessage(reason, "浏览器没有完成诊断文件下载。")
      });
    } finally {
      setBusy(null);
    }
  };

  const exportReadOnlyBackup = async () => {
    if (!failure.storageReady) return;
    setBusy("backup");
    setFeedback(null);
    try {
      const [{ createFullBackup, createFullBackupArchive }, { saveBlobFile }, { caseRepository }] = await Promise.all([
        import("@hakimi/backup"),
        import("@hakimi/platform"),
        import("@hakimi/storage")
      ]);
      const envelope = await createFullBackup(caseRepository, { appVersion: APP_VERSION });
      const archive = await createFullBackupArchive(envelope);
      const filename = `hakimi-boot-failure-safety-backup-${dateStamp()}.zip`;
      const delivery = resolveFileDelivery(
        await saveBlobFile(filename, new Blob([Uint8Array.from(archive)], { type: "application/zip" })),
        "只读安全备份导出"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setFeedback({ tone: "info", title: "已取消只读安全备份导出", message: delivery.message });
        return;
      }
      setFeedback({
        tone: "success",
        title: "只读安全备份已交付",
        message: `${delivery.message} 这是当前十六分区完整备份；本操作只读取并验真现有记录，不导入、不恢复、不删除，也不修改本机设置。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "只读安全备份未能生成",
        message: `${failureMessage(reason, "本地数据未能通过只读备份检查。")} 应用没有改写或删除记录；请保留当前浏览器资料。`
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page page--boot-recovery">
      <section className="error-panel app-boot-failure" role="alert" aria-labelledby="app-boot-failure-title">
        <AlertTriangle aria-hidden="true" />
        <div>
          <p className="eyebrow">Fail-closed recovery</p>
          <h1 id="app-boot-failure-title">启动完整性检查未通过</h1>
          <p>应用没有确认当前页面、本地数据库与计算核心可安全协同。普通工作台、排盘、案例、事件、运限、知识导入、规则激活、恢复和删除入口均已停止渲染。</p>
          <p>故障阶段：<code>{failure.source}</code>。诊断文件只记录阶段、允许列表错误类型和通用说明，不写入原始异常正文或调用栈。</p>
          <p><strong>请勿清除浏览器数据，也不要反复尝试写入。</strong>先导出不含研究资料的诊断；只有数据库读取探针已经通过时，才会开放只读完整备份。</p>
        </div>
      </section>

      <nav className="boot-recovery-nav" aria-label="启动恢复导航">
        <AppLink href="/settings" className={view === "diagnostic" ? "is-active" : ""} aria-current={view === "diagnostic" ? "page" : undefined}>
          <FileJson aria-hidden="true" />启动诊断
        </AppLink>
        <AppLink href="/settings/data" className={view === "backup" ? "is-active" : ""} aria-current={view === "backup" ? "page" : undefined}>
          <ShieldCheck aria-hidden="true" />只读安全备份
        </AppLink>
      </nav>

      {view === "diagnostic" ? (
        <section className="boot-recovery-card" aria-labelledby="boot-diagnostic-title">
          <p className="eyebrow">Diagnostic only</p>
          <h2 id="boot-diagnostic-title">导出最小启动诊断</h2>
          <p>文件只记录应用版本、启动确认状态、数据库读取探针是否通过、网络状态、浏览器标识和通用错误分类；不会枚举本地记录，也不会写入原始异常正文、出生资料、别名、笔记、事件或知识正文。</p>
          <button type="button" className="primary-action" disabled={busy !== null} onClick={() => void exportDiagnostic()}>
            <Download aria-hidden="true" />{busy === "diagnostic" ? "正在生成诊断" : "导出启动诊断 JSON"}
          </button>
        </section>
      ) : (
        <section className="boot-recovery-card" aria-labelledby="boot-backup-title">
          <p className="eyebrow">Read-only rescue</p>
          <h2 id="boot-backup-title">导出当前完整安全备份</h2>
          <p>{failure.storageReady
            ? "数据库读取探针已通过。这里仅允许读取、验真和下载当前十六分区；恢复、导入、编辑、删除与清空操作全部不可用。"
            : "数据库读取探针未通过或未完成。为避免再次触发升级或写入，本次启动不会重新打开数据库，也不会开放备份按钮。请关闭其他研究台标签页后重新载入；仍失败时保留当前浏览器资料。"}</p>
          <button type="button" className="primary-action" disabled={!failure.storageReady || busy !== null} onClick={() => void exportReadOnlyBackup()}>
            <Download aria-hidden="true" />{busy === "backup" ? "正在只读验真并打包" : "导出只读完整备份 ZIP"}
          </button>
        </section>
      )}

      {feedback ? (
        <div className={feedback.tone === "error" ? "inline-error" : "boot-recovery-success"} role={feedback.tone === "error" ? "alert" : "status"}>
          <strong>{feedback.title}</strong>
          <p>{feedback.message}</p>
        </div>
      ) : null}
    </div>
  );
}
