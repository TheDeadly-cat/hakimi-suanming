import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { ReleaseDatabaseDescriptor } from "../release-protocol";
import {
  captureOrphanedV13Backup,
  type OrphanedV13Disposition
} from "./lib/orphaned-v13-rescue";
import type { PrebootRecoveryState } from "./lib/preboot-database-inventory";
import {
  OrphanedV13RecoveryPage,
  type OrphanedV13RecoveryState
} from "./pages/orphaned-v13-recovery-page";
import "./styles.css";

type RecoveryDisposition = Exclude<PrebootRecoveryState, { kind: "normal" }>;

type RecoveryRenderBoundaryProps = {
  children: ReactNode;
};

type RecoveryRenderBoundaryState = {
  failed: boolean;
  failureCode: string;
};

function boundedRecoveryToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const token = value
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 96);
  return token || fallback;
}

function recoveryFailureCode(reason: unknown): string {
  try {
    return boundedRecoveryToken(reason instanceof Error ? reason.name : reason, "RECOVERY_RENDER_FAILURE");
  } catch {
    return "RECOVERY_RENDER_FAILURE";
  }
}

function requireRecoveryRoot(): HTMLElement {
  const existing = document.getElementById("root");
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  document.documentElement.dataset.prebootRecoveryRootRecreated = "true";
  return root;
}

function assertRecoveryInputs(
  disposition: RecoveryDisposition,
  descriptor: ReleaseDatabaseDescriptor
): void {
  if (disposition.kind !== "orphaned_v13" && disposition.kind !== "ambiguous") {
    throw new TypeError("预启动恢复状态不受支持。");
  }
  if (
    descriptor.dbGeneration !== "legacy-v13"
    || descriptor.targetSchema !== 13
    || descriptor.migrationId !== null
  ) {
    throw new Error("只读恢复入口拒绝了不匹配的发布数据库描述符。");
  }
}

class RecoveryRenderBoundary extends Component<
  RecoveryRenderBoundaryProps,
  RecoveryRenderBoundaryState
> {
  state: RecoveryRenderBoundaryState = {
    failed: false,
    failureCode: "RECOVERY_RENDER_FAILURE"
  };

  static getDerivedStateFromError(reason: unknown): RecoveryRenderBoundaryState {
    return { failed: true, failureCode: recoveryFailureCode(reason) };
  }

  componentDidMount(): void {
    if (!this.state.failed) document.documentElement.dataset.prebootRecoveryMounted = "true";
  }

  componentDidCatch(reason: unknown): void {
    const dataset = document.documentElement.dataset;
    dataset.appBootReady = "false";
    dataset.prebootRecoveryMounted = "false";
    dataset.recoveryRenderFailed = "true";
    dataset.recoveryFailureCode = recoveryFailureCode(reason);
    dataset.publicReleaseAuthorized = "false";
    dataset.expertTruthClaimed = "false";
    dataset.mutationEpochBypassed = "false";
    window.requestAnimationFrame(() => {
      document.getElementById("recovery-render-failure")?.focus({ preventScroll: true });
    });
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        id="recovery-render-failure"
        tabIndex={-1}
        aria-labelledby="recovery-render-failure-title"
        aria-describedby="recovery-render-failure-copy recovery-render-failure-boundary"
        style={{
          boxSizing: "border-box",
          display: "grid",
          minHeight: "100vh",
          placeItems: "center",
          padding: "max(20px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))",
          background: "radial-gradient(circle at 12% 10%, rgba(165,66,51,.13), transparent 28rem), linear-gradient(145deg, #f1e8d8, #fbf7ed)",
          color: "#24312d",
          fontFamily: "'Noto Sans SC', 'Microsoft YaHei UI', sans-serif"
        }}
      >
        <section style={{
          width: "min(100%, 740px)",
          padding: "clamp(28px, 6vw, 54px)",
          border: "1px solid rgba(48,61,56,.2)",
          borderTop: "5px solid #a54233",
          borderRadius: "8px 30px 8px 30px",
          background: "rgba(255,253,247,.97)",
          boxShadow: "0 28px 76px rgba(52,46,34,.16)"
        }}>
          <p style={{
            margin: "0 0 14px",
            color: "#a54233",
            font: "800 11px/1.4 'Cascadia Code', monospace",
            letterSpacing: ".14em"
          }}>FAIL-CLOSED / RECOVERY UI</p>
          <h1
            id="recovery-render-failure-title"
            style={{
              maxWidth: "12ch",
              margin: 0,
              fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif",
              fontSize: "clamp(34px, 7vw, 58px)",
              fontWeight: 650,
              letterSpacing: "-.045em",
              lineHeight: 1.08
            }}
          >只读恢复界面未能完成渲染</h1>
          <p
            id="recovery-render-failure-copy"
            role="alert"
            style={{ margin: "22px 0 0", color: "#626c67", lineHeight: 1.8 }}
          >普通工作台、数据库迁移和恢复写入均未启动。请保留当前浏览器资料，不要清除站点数据。</p>
          <div
            id="recovery-render-failure-boundary"
            style={{
              display: "grid",
              gap: "6px",
              marginTop: "22px",
              padding: "15px 17px",
              border: "1px solid rgba(165,66,51,.28)",
              borderLeft: "4px solid #a54233",
              background: "rgba(165,66,51,.06)"
            }}
          >
            <strong style={{ color: "#7e332a" }}>当前保持零数据动作</strong>
            <span style={{ color: "#626c67", fontSize: "14px", lineHeight: 1.7 }}>此错误只证明恢复界面渲染失败，不证明本地资料损坏，也不提供任何发布或专家结论。</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "12px", alignItems: "center", marginTop: "20px" }}>
            <span style={{ color: "#6b746f", fontSize: "13px", fontWeight: 700 }}>诊断代码</span>
            <code style={{ padding: "7px 9px", overflowWrap: "anywhere", background: "rgba(49,95,112,.08)", color: "#315f70", font: "700 13px/1.5 'Cascadia Code', monospace" }}>{this.state.failureCode}</code>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: "48px",
              marginTop: "24px",
              padding: "12px 18px",
              border: "1px solid #24312d",
              borderRadius: "4px 12px 4px 12px",
              background: "#24312d",
              color: "#fffaf0",
              font: "750 14px/1.3 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif",
              cursor: "pointer"
            }}
          >正常重新载入</button>
        </section>
      </main>
    );
  }
}

function pageState(disposition: RecoveryDisposition): OrphanedV13RecoveryState {
  if (disposition.kind === "orphaned_v13") {
    return {
      kind: disposition.kind,
      reasonCode: disposition.reasonCode,
      inventory: disposition.inventory,
      sourceDatabaseName: disposition.sourceDatabaseName,
      nativeVersion: disposition.sourceNativeVersion
    };
  }
  return {
    kind: disposition.kind,
    reasonCode: disposition.reasonCode,
    inventory: disposition.inventory
  };
}

export function mountPrebootRecovery(
  disposition: RecoveryDisposition,
  descriptor: ReleaseDatabaseDescriptor
): void {
  const root = requireRecoveryRoot();
  assertRecoveryInputs(disposition, descriptor);

  document.title = disposition.kind === "orphaned_v13"
    ? "v13 数据救援 · 哈基米八字研究台"
    : "数据库来源待确认 · 哈基米八字研究台";
  const dataset = document.documentElement.dataset;
  dataset.appBootReady = "false";
  dataset.swBootSignalSent = "false";
  dataset.releaseContract = descriptor.dbGeneration;
  dataset.targetSchema = String(descriptor.targetSchema);
  dataset.migrationId = "null";
  dataset.engineeringEvidenceOnly = "true";
  dataset.publicReleaseAuthorized = "false";
  dataset.expertTruthClaimed = "false";
  dataset.formalValidationClaimed = "false";
  dataset.scientificValidationClaimed = "false";
  dataset.mutationEpochBypassed = "false";
  dataset.prebootRecoveryMounted = "pending";
  dataset.recoveryRenderFailed = "false";
  root.dataset.recoveryKind = disposition.kind;

  const captureBackup = disposition.kind === "orphaned_v13"
    ? () => captureOrphanedV13Backup(
      disposition as OrphanedV13Disposition,
      descriptor
    )
    : async () => {
      throw new Error("当前本地数据库布局不满足只读备份条件。");
    };

  createRoot(root).render(
    <StrictMode>
      <RecoveryRenderBoundary>
        <OrphanedV13RecoveryPage
          state={pageState(disposition)}
          captureBackup={captureBackup}
          requireVerifiedCaptureBinding
        />
      </RecoveryRenderBoundary>
    </StrictMode>
  );
}
