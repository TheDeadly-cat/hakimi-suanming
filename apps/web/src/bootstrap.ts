import {
  inspectPrebootRecoveryState,
  type PrebootRecoveryState
} from "./lib/preboot-database-inventory";

function markPrebootState(state: PrebootRecoveryState | "checking" | "bootstrap_failure"): void {
  document.documentElement.dataset.appBootReady = "false";
  document.documentElement.dataset.prebootRecoveryMode = typeof state === "string"
    ? state
    : state.kind;
  if (typeof state !== "string") {
    document.documentElement.dataset.prebootRecoveryReason = state.reasonCode;
  }
}

function renderFailClosedBootstrapError(reason: unknown): void {
  markPrebootState("bootstrap_failure");
  const root = document.getElementById("root");
  if (!root) return;

  const shell = document.createElement("main");
  shell.setAttribute("role", "alert");
  shell.style.cssText = [
    "max-width:760px",
    "margin:10vh auto",
    "padding:24px",
    "font-family:system-ui,sans-serif",
    "line-height:1.7",
    "color:#2d2925"
  ].join(";");
  const title = document.createElement("h1");
  title.textContent = "无法安全启动本地研究台";
  const message = document.createElement("p");
  message.textContent = "启动前的数据安全检查未完成。普通工作台、数据库迁移和 Service Worker 均未启动；请勿清除浏览器数据。";
  const diagnostic = document.createElement("p");
  diagnostic.textContent = `诊断：${reason instanceof Error ? reason.name : "UNKNOWN_BOOTSTRAP_FAILURE"}`;
  shell.append(title, message, diagnostic);
  root.replaceChildren(shell);
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
