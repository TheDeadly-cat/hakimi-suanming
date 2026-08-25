import {
  inspectPrebootRecoveryState,
  type PrebootRecoveryState
} from "./lib/preboot-database-inventory";

function boundedDiagnosticToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const token = value
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 96);
  return token || fallback;
}

function markPrebootState(state: PrebootRecoveryState | "checking" | "bootstrap_failure"): void {
  const dataset = document.documentElement.dataset;
  dataset.appBootReady = "false";
  dataset.swBootSignalSent = "false";
  dataset.engineeringEvidenceOnly = "true";
  dataset.publicReleaseAuthorized = "false";
  dataset.expertTruthClaimed = "false";
  dataset.mutationEpochBypassed = "false";
  dataset.prebootRecoveryMode = boundedDiagnosticToken(
    typeof state === "string" ? state : state.kind,
    "unknown"
  );
  delete dataset.prebootRecoveryReason;
  delete dataset.prebootRecoveryMounted;
  delete dataset.bootstrapFailureCode;
  if (typeof state !== "string") {
    dataset.prebootRecoveryReason = boundedDiagnosticToken(state.reasonCode, "UNAVAILABLE");
  }
}

function renderFailClosedBootstrapError(reason: unknown): void {
  markPrebootState("bootstrap_failure");
  const root = document.getElementById("root");
  if (!root) return;

  const failureCode = boundedDiagnosticToken(
    reason instanceof Error ? reason.name : reason,
    "UNKNOWN_BOOTSTRAP_FAILURE"
  );
  document.documentElement.dataset.bootstrapFailureCode = failureCode;
  document.title = "无法安全启动 · 哈基米八字研究台";
  document.body.style.margin = "0";
  document.body.style.background = "#eee6d7";
  root.style.cssText = [
    "box-sizing:border-box",
    "min-height:100vh",
    "min-height:100dvh",
    "padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))",
    "background:radial-gradient(circle at 14% 8%,rgba(164,59,47,.12),transparent 30rem),linear-gradient(145deg,#f6efe1,#fbf8ef 52%,#eee6d7)"
  ].join(";");

  const shell = document.createElement("main");
  shell.id = "main-content";
  shell.tabIndex = -1;
  shell.setAttribute("aria-labelledby", "bootstrap-failure-title");
  shell.setAttribute("aria-describedby", "bootstrap-failure-message bootstrap-failure-boundary");
  shell.style.cssText = [
    "box-sizing:border-box",
    "width:min(100%,760px)",
    "margin:clamp(24px,8vh,80px) auto",
    "padding:clamp(24px,6vw,52px)",
    "overflow:hidden",
    "border:1px solid rgba(59,70,66,.2)",
    "border-top:5px solid #a43b2f",
    "border-radius:8px 28px 8px 28px",
    "background:linear-gradient(115deg,rgba(255,252,244,.98),rgba(244,235,217,.96))",
    "box-shadow:0 28px 72px rgba(47,42,32,.16)",
    "font-family:'Noto Sans SC','Microsoft YaHei',sans-serif",
    "line-height:1.7",
    "color:#25302c"
  ].join(";");

  const kicker = document.createElement("p");
  kicker.textContent = "FAIL-CLOSED / PREBOOT";
  kicker.style.cssText = "margin:0 0 14px;color:#a43b2f;font:800 12px/1.3 'Cascadia Code',monospace;letter-spacing:.14em";
  const title = document.createElement("h1");
  title.id = "bootstrap-failure-title";
  title.textContent = "无法安全启动本地研究台";
  title.style.cssText = "max-width:12ch;margin:0;font-family:'Noto Serif SC','Songti SC',serif;font-size:clamp(32px,7vw,58px);font-weight:650;letter-spacing:-.04em;line-height:1.08";
  const message = document.createElement("p");
  message.id = "bootstrap-failure-message";
  message.setAttribute("role", "alert");
  message.textContent = "启动前的数据安全检查未完成。普通工作台、数据库迁移和 Service Worker 均未启动；请勿清除浏览器数据。";
  message.style.cssText = "max-width:62ch;margin:22px 0 0;color:#5d6561;font-size:16px;line-height:1.8";

  const boundary = document.createElement("div");
  boundary.id = "bootstrap-failure-boundary";
  boundary.style.cssText = "display:grid;gap:4px;margin-top:20px;padding:14px 16px;border:1px solid rgba(164,59,47,.28);border-left:4px solid #a43b2f;background:rgba(164,59,47,.06)";
  const boundaryTitle = document.createElement("strong");
  boundaryTitle.textContent = "当前保持零数据动作";
  boundaryTitle.style.color = "#7b3029";
  const boundaryCopy = document.createElement("span");
  boundaryCopy.textContent = "不会打开、迁移、恢复、删除或改写本地研究资料。重新载入也不会绕过正式启动检查。";
  boundaryCopy.style.cssText = "color:#626b66;font-size:14px";
  boundary.append(boundaryTitle, boundaryCopy);

  const diagnostic = document.createElement("div");
  diagnostic.style.cssText = "display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;margin-top:20px;padding-top:18px;border-top:1px solid rgba(59,70,66,.16)";
  const diagnosticLabel = document.createElement("span");
  diagnosticLabel.textContent = "诊断代码";
  diagnosticLabel.style.cssText = "color:#69716d;font-size:13px;font-weight:700";
  const diagnosticCode = document.createElement("code");
  diagnosticCode.textContent = failureCode;
  diagnosticCode.style.cssText = "min-width:0;padding:7px 9px;overflow-wrap:anywhere;background:rgba(75,113,129,.08);color:#315c6e;font:700 13px/1.5 'Cascadia Code',monospace";
  diagnostic.append(diagnosticLabel, diagnosticCode);

  const reload = document.createElement("button");
  reload.type = "button";
  reload.textContent = "正常重新载入";
  reload.style.cssText = "min-height:48px;margin-top:24px;padding:12px 18px;border:1px solid #25302c;border-radius:4px 12px 4px 12px;background:#25302c;color:#fffaf0;font:750 14px/1.3 'Noto Sans SC','Microsoft YaHei',sans-serif;cursor:pointer";
  reload.addEventListener("click", () => window.location.reload());

  const footnote = document.createElement("p");
  footnote.textContent = "如果重复出现，请保留当前浏览器资料和上方诊断代码，不要清除站点数据。";
  footnote.style.cssText = "margin:14px 0 0;color:#737b76;font-size:13px;line-height:1.65";

  shell.append(kicker, title, message, boundary, diagnostic, reload, footnote);
  root.replaceChildren(shell);
  shell.focus({ preventScroll: true });
}

export async function bootstrapApplication(): Promise<void> {
  markPrebootState("checking");

  // Keep the release descriptor behind the fail-closed boundary too: a malformed
  // production descriptor must not fall through to the ordinary application.
  const { CURRENT_RELEASE_DATABASE } = await import("./lib/current-release");
  const state = await inspectPrebootRecoveryState(CURRENT_RELEASE_DATABASE);
  markPrebootState(state);

  if (state.kind === "normal") {
    await import("./main");
    return;
  }

  const { mountPrebootRecovery } = await import("./recovery-main");
  mountPrebootRecovery(state, CURRENT_RELEASE_DATABASE);
}

void bootstrapApplication().catch(renderFailClosedBootstrapError);
