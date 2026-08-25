import { AlertTriangle, CheckCircle2, CircleDashed, CircleX, Download, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import "./system-surfaces.css";
import "./pwa-install-banner.css";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type InstallStatus = "manual" | "available" | "prompting" | "accepted" | "dismissed" | "failed" | "installed";

type InstallEvidenceTone = "idle" | "active" | "observed" | "caution";

type InstallFlowEvidenceItem = Readonly<{
  label: string;
  value: string;
  tone: InstallEvidenceTone;
}>;

const INSTALL_BANNER_SESSION_KEY = "hakimi:pwa-install-banner-dismissed:v1";

const INSTALL_COPY: Record<InstallStatus, string> = {
  manual: "当前浏览器没有提供网页内安装面板。可从浏览器的分享或更多菜单手动添加；不同浏览器的菜单名称可能略有不同。创建入口不会迁移、复制或同步资料。",
  available: "浏览器已提供可请求的系统安装面板。创建入口不会自动迁移、复制或同步资料；首次从新入口打开后请核对本地内容。",
  prompting: "浏览器安装面板已打开，请在系统界面中确认或取消。此步骤不会上传、备份或迁移本地资料。",
  accepted: "浏览器已接受本次安装选择；是否创建完成仍以系统入口或随后出现的安装完成事件为准。首次从新入口打开后仍需核对本地资料。",
  dismissed: "你取消了本次安装。可稍后使用浏览器菜单重试；本次没有请求迁移、复制或同步本地资料。",
  installed: "浏览器已发出安装完成事件。请从系统应用入口首次打开并核对本地资料；此事件不证明离线缓存完整、存储连续或资料已经备份。",
  failed: "浏览器安装流程没有返回可核对结果。系统面板可能未打开，也可能仍在处理；请先检查系统应用入口，再决定是否从浏览器菜单重试。本次没有请求迁移、复制或同步本地资料。"
};

const INSTALL_STATUS_LABEL: Record<InstallStatus, string> = {
  manual: "手动添加",
  available: "安装面板可请求",
  prompting: "等待系统确认",
  accepted: "选择已接受",
  dismissed: "本次已取消",
  failed: "结果未确认",
  installed: "安装事件已报告"
};

const INSTALL_TITLE: Record<InstallStatus, string> = {
  manual: "从浏览器菜单手动添加应用入口",
  available: "请求创建研究台应用入口",
  prompting: "等待浏览器安装确认",
  accepted: "安装请求已交给浏览器",
  dismissed: "本次安装已取消",
  failed: "安装结果尚未确认",
  installed: "系统已报告应用入口创建完成"
};

const INSTALL_ENTRY_STATE: Record<InstallStatus, string> = {
  manual: "需从浏览器菜单创建",
  available: "可请求系统创建",
  prompting: "等待系统选择",
  accepted: "选择已接受，创建结果待确认",
  dismissed: "本次未创建",
  failed: "创建结果未知 · 先核对系统入口",
  installed: "浏览器事件报告已创建"
};

const INSTALL_STORAGE_STATE: Record<InstallStatus, string> = {
  manual: "不会自动迁移 · 打开后核对",
  available: "不会自动迁移 · 打开后核对",
  prompting: "未请求迁移或同步",
  accepted: "连续性待新入口核对",
  dismissed: "本次未发生迁移",
  failed: "连续性仍需人工核对",
  installed: "仍需从新入口核对"
};

const INSTALL_FLOW_EVIDENCE: Record<InstallStatus, readonly InstallFlowEvidenceItem[]> = {
  manual: [
    { label: "系统面板", value: "浏览器未提供", tone: "idle" },
    { label: "用户选择", value: "未请求", tone: "idle" },
    { label: "完成事件", value: "未收到", tone: "idle" }
  ],
  available: [
    { label: "系统面板", value: "可请求", tone: "active" },
    { label: "用户选择", value: "未报告", tone: "idle" },
    { label: "完成事件", value: "未收到", tone: "idle" }
  ],
  prompting: [
    { label: "系统面板", value: "调用进行中", tone: "active" },
    { label: "用户选择", value: "等待返回", tone: "active" },
    { label: "完成事件", value: "未收到", tone: "idle" }
  ],
  accepted: [
    { label: "系统面板", value: "调用已返回", tone: "observed" },
    { label: "用户选择", value: "已接受", tone: "observed" },
    { label: "完成事件", value: "未收到", tone: "active" }
  ],
  dismissed: [
    { label: "系统面板", value: "调用已返回", tone: "observed" },
    { label: "用户选择", value: "已取消", tone: "caution" },
    { label: "完成事件", value: "未收到", tone: "idle" }
  ],
  failed: [
    { label: "系统面板", value: "结果未知", tone: "caution" },
    { label: "用户选择", value: "未确认", tone: "caution" },
    { label: "完成事件", value: "未收到", tone: "idle" }
  ],
  installed: [
    { label: "系统面板", value: "非完成依据", tone: "idle" },
    { label: "用户选择", value: "非完成依据", tone: "idle" },
    { label: "完成事件", value: "事件已收到", tone: "observed" }
  ]
};

function installChoiceOutcome(value: unknown): InstallChoice["outcome"] | null {
  if (!value || typeof value !== "object") return null;
  const outcome = (value as { outcome?: unknown }).outcome;
  return outcome === "accepted" || outcome === "dismissed" ? outcome : null;
}

function isBeforeInstallPromptEvent(value: Event): value is BeforeInstallPromptEvent {
  try {
    const candidate = value as Partial<BeforeInstallPromptEvent>;
    return typeof candidate.prompt === "function"
      && typeof candidate.userChoice?.then === "function";
  } catch {
    return false;
  }
}

function installStatusIcon(status: InstallStatus) {
  if (status === "prompting") return <LoaderCircle className="is-spinning" aria-hidden="true" />;
  if (status === "installed") return <CheckCircle2 aria-hidden="true" />;
  if (status === "accepted") return <CircleDashed aria-hidden="true" />;
  if (status === "dismissed") return <CircleX aria-hidden="true" />;
  if (status === "failed") return <AlertTriangle aria-hidden="true" />;
  return <Download aria-hidden="true" />;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true
    || (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
}

function isIosLikeBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const INSTALL_PROMPT_TIMEOUT_MS = 120_000;

function installBannerDismissedForSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(INSTALL_BANNER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markInstallBannerDismissedForSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, "1");
  } catch {
    // A denied sessionStorage write must not turn closing an optional prompt into an error.
  }
}

export function PwaInstallBanner() {
  const titleId = useId();
  const descriptionId = useId();
  const capabilitiesId = useId();
  const boundaryId = useId();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<InstallStatus>("available");
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const bannerRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const dismissFocusTimerRef = useRef<number | null>(null);
  const promptTimeoutRef = useRef<number | null>(null);
  const promptWaitRejectRef = useRef<(() => void) | null>(null);
  const shouldFocusResultRef = useRef(false);
  const mountedRef = useRef(false);
  const installedRef = useRef(false);
  const promptingRef = useRef(false);
  const requestEpochRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const standalone = isStandaloneDisplay();
    installedRef.current = standalone;
    if (!standalone && isIosLikeBrowser() && !installBannerDismissedForSession()) {
      setStatus("manual");
      setVisible(true);
    }
    const handleBeforeInstallPrompt = (event: Event) => {
      if (installedRef.current || isStandaloneDisplay() || !isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      if (installBannerDismissedForSession()) return;
      if (promptingRef.current) return;
      requestEpochRef.current += 1;
      promptEventRef.current = event;
      setStatus("available");
      setVisible(true);
    };
    const handleInstalled = () => {
      requestEpochRef.current += 1;
      if (promptTimeoutRef.current !== null) {
        window.clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
      const rejectPendingWait = promptWaitRejectRef.current;
      promptWaitRejectRef.current = null;
      rejectPendingWait?.();
      installedRef.current = true;
      promptingRef.current = false;
      promptEventRef.current = null;
      setStatus("installed");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      mountedRef.current = false;
      promptingRef.current = false;
      requestEpochRef.current += 1;
      promptEventRef.current = null;
      if (dismissFocusTimerRef.current !== null) {
        window.clearTimeout(dismissFocusTimerRef.current);
        dismissFocusTimerRef.current = null;
      }
      if (promptTimeoutRef.current !== null) {
        window.clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
      const rejectPendingWait = promptWaitRejectRef.current;
      promptWaitRejectRef.current = null;
      rejectPendingWait?.();
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!visible || !shouldFocusResultRef.current) return;
    if (status === "available" || status === "prompting") return;
    resultRef.current?.focus({ preventScroll: true });
    shouldFocusResultRef.current = false;
  }, [status, visible]);

  if (!visible) return null;

  const dismissLabel = status === "available" || status === "manual" ? "暂不安装" : "关闭提示";

  const requestInstall = async () => {
    const event = promptEventRef.current;
    if (!event || installedRef.current || promptingRef.current || status === "prompting") return;
    const requestEpoch = requestEpochRef.current + 1;
    requestEpochRef.current = requestEpoch;
    promptingRef.current = true;
    shouldFocusResultRef.current = true;
    setStatus("prompting");
    try {
      const choicePromise = event.userChoice;
      const timeoutPromise = new Promise<never>((_, reject) => {
        promptWaitRejectRef.current = () => reject(new Error("Install prompt wait cancelled"));
        promptTimeoutRef.current = window.setTimeout(() => {
          promptTimeoutRef.current = null;
          promptWaitRejectRef.current = null;
          reject(new Error("Install prompt timed out"));
        }, INSTALL_PROMPT_TIMEOUT_MS);
      });
      const promptAndChoice = Promise.resolve(event.prompt()).then(() => choicePromise);
      promptEventRef.current = null;
      const choice = await Promise.race([promptAndChoice, timeoutPromise]);
      if (!mountedRef.current || requestEpochRef.current !== requestEpoch) return;
      const outcome = installChoiceOutcome(choice);
      if (!outcome) throw new TypeError("Browser returned an unsupported install outcome");
      if (outcome === "dismissed") markInstallBannerDismissedForSession();
      setStatus((current) => current === "installed" ? current : outcome);
    } catch {
      promptEventRef.current = null;
      if (!mountedRef.current || requestEpochRef.current !== requestEpoch) return;
      setStatus((current) => current === "installed" ? current : "failed");
    } finally {
      if (promptTimeoutRef.current !== null) {
        window.clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
      promptWaitRejectRef.current = null;
      if (requestEpochRef.current === requestEpoch) promptingRef.current = false;
    }
  };

  const dismissBanner = () => {
    if (promptingRef.current || status === "prompting") return;
    const shouldRestoreMainFocus = bannerRef.current?.contains(document.activeElement) ?? false;
    if (dismissFocusTimerRef.current !== null) {
      window.clearTimeout(dismissFocusTimerRef.current);
      dismissFocusTimerRef.current = null;
    }
    markInstallBannerDismissedForSession();
    requestEpochRef.current += 1;
    promptEventRef.current = null;
    promptingRef.current = false;
    shouldFocusResultRef.current = false;
    setVisible(false);
    if (shouldRestoreMainFocus) {
      dismissFocusTimerRef.current = window.setTimeout(() => {
        dismissFocusTimerRef.current = null;
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }, 0);
    }
  };

  return (
    <section
      ref={bannerRef}
      className="pwa-install-banner"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${boundaryId}`}
      aria-busy={status === "prompting"}
      data-status={status}
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-install-call-state={status === "prompting" ? "in_flight" : status === "failed" ? "unknown" : status === "available" || status === "manual" ? "not_started" : "settled"}
      data-install-result-evidence={status === "installed" ? "browser_event_received" : status === "accepted" ? "user_choice_accepted" : status === "dismissed" ? "user_choice_dismissed" : status === "failed" ? "unknown" : "none"}
      data-offline-readiness-claimed="false"
      data-offline-cache-verified="false"
      data-cloud-sync-available="false"
      data-storage-continuity-claimed="false"
      data-data-backup-confirmed="false"
      data-install-entry-confirmed={status === "installed" ? "true" : "false"}
      data-install-completion-source={status === "installed" ? "browser-event" : "none"}
      data-mutation-epoch-bypassed="false"
      data-public-release-authorized="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      data-record-write-state="not_started"
    >
      <div className="pwa-install-icon-frame" aria-hidden="true">
        {installStatusIcon(status)}
      </div>
      <div className="pwa-install-copy">
        <p className="pwa-install-meta">
          <span>Local-first PWA</span>
          <em>{INSTALL_STATUS_LABEL[status]}</em>
        </p>
        <strong id={titleId}>{INSTALL_TITLE[status]}</strong>
        <p
          id={descriptionId}
          className="pwa-install-description"
          ref={resultRef}
          role={status === "failed" ? "alert" : "status"}
          aria-live={status === "failed" ? "assertive" : "polite"}
          aria-atomic="true"
          tabIndex={status === "available" || status === "manual" || status === "prompting" ? undefined : -1}
        >
          {INSTALL_COPY[status]}
        </p>
        <ol className="pwa-install-flow-evidence" aria-label="安装流程观测证据">
          {INSTALL_FLOW_EVIDENCE[status].map((item, index) => (
            <li key={item.label} data-tone={item.tone}>
              <span className="pwa-install-flow-step" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ol>
        {status === "manual" ? (
          <ol className="pwa-install-manual-steps" aria-label="手动添加应用入口步骤">
            <li><strong>01</strong><span>打开浏览器的分享或更多菜单</span></li>
            <li><strong>02</strong><span>选择“添加到主屏幕”或同类入口</span></li>
            <li><strong>03</strong><span>从新图标首次打开后核对案例与设置</span></li>
          </ol>
        ) : null}
        <dl id={capabilitiesId} className="pwa-install-capabilities" aria-label="安装能力边界">
          <div data-capability="entry"><dt>系统入口</dt><dd>{INSTALL_ENTRY_STATE[status]}</dd></div>
          <div data-capability="storage"><dt>本地数据库</dt><dd>{INSTALL_STORAGE_STATE[status]}</dd></div>
          <div data-capability="offline"><dt>离线缓存</dt><dd>此处未验证</dd></div>
          <div data-capability="sync"><dt>云同步</dt><dd>未提供</dd></div>
        </dl>
        <small id={boundaryId} className="pwa-install-boundary">
          本界面只请求系统创建应用入口，不证明离线缓存完整、存储连续、资料已备份或项目已获发布授权。
          <span className="pwa-install-baseline">legacy-v13 · schema 13 · migration null · install-entry only</span>
        </small>
      </div>
      <div className="pwa-install-actions">
        {status === "available" || status === "prompting" ? (
          <button
            type="button"
            className="primary-action"
            disabled={status === "prompting"}
            aria-describedby={`${descriptionId} ${capabilitiesId}`}
            onClick={() => void requestInstall()}
            aria-busy={status === "prompting"}
          >
            {status === "prompting"
              ? <LoaderCircle className="is-spinning" aria-hidden="true" />
              : <Download aria-hidden="true" />}
            {status === "prompting" ? "等待系统确认" : "打开系统安装面板"}
          </button>
        ) : null}
        <button type="button" className="secondary-action pwa-install-dismiss" aria-label={`${dismissLabel}：${INSTALL_TITLE[status]}`} disabled={status === "prompting"} onClick={dismissBanner}>
          <X aria-hidden="true" />
          <span>{dismissLabel}</span>
        </button>
      </div>
    </section>
  );
}
