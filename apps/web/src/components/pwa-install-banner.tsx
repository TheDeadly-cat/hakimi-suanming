import { Download, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type InstallStatus = "available" | "prompting" | "accepted" | "dismissed" | "failed" | "installed";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true
    || (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<InstallStatus>("available");
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const shouldFocusResultRef = useRef(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (isStandaloneDisplay()) return;
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;
      setStatus("available");
      setVisible(true);
    };
    const handleInstalled = () => {
      promptEventRef.current = null;
      setStatus("installed");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!visible || !shouldFocusResultRef.current) return;
    if (status === "available" || status === "prompting") return;
    resultRef.current?.focus();
    shouldFocusResultRef.current = false;
  }, [status, visible]);

  if (!visible) return null;

  const requestInstall = async () => {
    const event = promptEventRef.current;
    if (!event || status === "prompting") return;
    shouldFocusResultRef.current = true;
    setStatus("prompting");
    try {
      const choicePromise = event.userChoice;
      const promptPromise = event.prompt();
      promptEventRef.current = null;
      await promptPromise;
      const choice = await choicePromise;
      setStatus((current) => current === "installed" ? current : choice.outcome);
    } catch {
      promptEventRef.current = null;
      setStatus((current) => current === "installed" ? current : "failed");
    }
  };

  const copy = status === "available"
    ? "安装后可从桌面或主屏幕打开；它仍使用当前浏览器资料中的本地数据库，不会把数据同步到其他设备。"
    : status === "prompting"
      ? "浏览器安装面板已打开，请在系统界面中确认或取消。"
      : status === "accepted"
        ? "浏览器已接受安装请求；是否完成以系统安装结果为准。"
        : status === "dismissed"
          ? "你取消了本次安装。可稍后使用浏览器菜单重试；现有本地数据不会变化。"
          : status === "installed"
            ? "浏览器已报告安装完成。现在可从系统应用入口打开；本地数据仍只在当前浏览器资料中。"
            : "未能打开浏览器安装面板。没有安装任何内容，本地数据也没有变化。";

  return (
    <section className="pwa-install-banner" aria-labelledby="pwa-install-title">
      <Download className="pwa-install-icon" aria-hidden="true" />
      <div className="pwa-install-copy">
        <strong id="pwa-install-title">
          {status === "installed" ? "Web 应用安装完成" : "把研究台安装为 Web 应用"}
        </strong>
        <p
          ref={resultRef}
          role={status === "failed" ? "alert" : status === "available" ? undefined : "status"}
          aria-live={status === "failed" ? "assertive" : "polite"}
          tabIndex={status === "available" || status === "prompting" ? undefined : -1}
        >
          {copy}
        </p>
      </div>
      <div className="pwa-install-actions">
        {status === "available" || status === "prompting" ? (
          <button
            type="button"
            className="primary-action"
            disabled={status === "prompting"}
            onClick={() => void requestInstall()}
          >
            {status === "prompting"
              ? <LoaderCircle className="is-spinning" aria-hidden="true" />
              : <Download aria-hidden="true" />}
            安装 Web 应用
          </button>
        ) : null}
        <button type="button" className="icon-button" aria-label="关闭安装提示" onClick={() => setVisible(false)}>
          <X aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
