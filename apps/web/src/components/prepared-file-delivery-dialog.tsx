import { Download, LoaderCircle, Save, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReportExportPort } from "@hakimi/platform";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";

export type PreparedFileArtifact = {
  blob: Blob;
  filename: string;
  title: string;
  description: string;
  sharePolicy: "allowed" | "blocked_sensitive";
};

type DeliveryIntent = "chosen_location" | "download" | "share";

type PreparedFileDeliveryDialogProps = {
  artifact: PreparedFileArtifact;
  exportPort: ReportExportPort;
  onClose(): void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function PreparedFileDeliveryDialog({
  artifact,
  exportPort,
  onClose
}: PreparedFileDeliveryDialogProps) {
  const [activeIntent, setActiveIntent] = useState<DeliveryIntent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(false);
  closeRef.current = onClose;
  const capabilities = exportPort.getCapabilities();
  const allowShare = artifact.sharePolicy === "allowed";
  const busy = activeIntent !== null;
  busyRef.current = busy;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const focusableElements = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
        element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden")
      ))
      : [];

    document.body.style.overflow = "hidden";
    dialog?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const deliver = async (intent: DeliveryIntent) => {
    setActiveIntent(intent);
    setMessage(null);
    setError(null);
    try {
      const result = intent === "chosen_location"
        ? await exportPort.saveFileToChosenLocation(artifact.blob, artifact.filename)
        : intent === "share"
          ? await exportPort.shareFile(artifact.blob, artifact.filename, artifact.title)
          : await exportPort.saveFile(artifact.blob, artifact.filename);
      const resolution = resolveFileDelivery(
        result,
        intent === "share" ? `${artifact.title}分享` : `${artifact.title}保存`
      );
      if (resolution.kind === "error") {
        setError(resolution.message);
        return;
      }
      setMessage(resolution.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文件交付未完成。");
    } finally {
      setActiveIntent(null);
    }
  };

  return (
    <div className="prepared-delivery-modal" role="presentation">
      <div
        ref={dialogRef}
        className="prepared-delivery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prepared-delivery-title"
        aria-describedby="prepared-delivery-description"
        tabIndex={-1}
      >
        <header>
          <div>
            <p className="eyebrow">Prepared locally</p>
            <h2 id="prepared-delivery-title">文件已在本机生成</h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭文件交付" disabled={busy} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="prepared-delivery-artifact" id="prepared-delivery-description">
          <strong>{artifact.title}</strong>
          <code>{artifact.filename}</code>
          <span>{formatBytes(artifact.blob.size)}</span>
          <p>{artifact.description}</p>
        </div>

        {capabilities.canChooseSaveLocation ? (
          <p className="prepared-delivery-warning">“保存到指定位置”会覆盖你在系统面板中选中的同名已有文件。</p>
        ) : null}
        {!allowShare ? (
          <p className="prepared-delivery-warning">这份工件包含敏感资料，系统分享已关闭；请只保存到可信位置。</p>
        ) : null}
        {!capabilities.canShareFiles && allowShare ? (
          <p className="muted-copy">当前浏览器不支持文件系统分享；仍可下载这份已生成文件。</p>
        ) : null}
        {error ? <div className="inline-error" role="alert"><strong>文件未交付</strong><p>{error}</p></div> : null}
        {message ? <p className="success-message" role="status" aria-live="polite">{message}</p> : null}

        <div className="prepared-delivery-actions">
          {capabilities.canChooseSaveLocation ? (
            <button type="button" className="primary-action" disabled={busy} onClick={() => void deliver("chosen_location")}>
              {activeIntent === "chosen_location" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Save aria-hidden="true" />}
              保存到指定位置
            </button>
          ) : null}
          {capabilities.canDownloadFiles ? (
            <button type="button" className={capabilities.canChooseSaveLocation ? "secondary-action" : "primary-action"} disabled={busy} onClick={() => void deliver("download")}>
              {activeIntent === "download" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Download aria-hidden="true" />}
              下载文件
            </button>
          ) : null}
          {allowShare && capabilities.canShareFiles ? (
            <button type="button" className="secondary-action" disabled={busy} onClick={() => void deliver("share")}>
              {activeIntent === "share" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              系统分享
            </button>
          ) : null}
          <button type="button" className="text-action" disabled={busy} onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
