import { useId, useState } from "react";
import { createAppFeedbackContext, FRIENDLY_READING_VERSION } from "../lib/app-feedback-context";

export function AppFeedbackDetails({ pathname, search }: { pathname: string; search: string }) {
  const feedbackId = useId();
  const text = createAppFeedbackContext(pathname, search);
  const [copyResult, setCopyResult] = useState<{ text: string; status: "copied" | "unavailable" } | null>(null);
  const [copying, setCopying] = useState(false);
  const copyStatus = copyResult?.text === text ? copyResult.status : null;

  const copy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopyResult({ text, status: "copied" });
    } catch {
      setCopyResult({ text, status: "unavailable" });
    } finally {
      setCopying(false);
    }
  };

  return (
    <details className="app-feedback-details">
      <summary>关于与反馈 <span>阅读 {FRIENDLY_READING_VERSION}</span></summary>
      <div className="app-feedback-details__body">
        <p>本地研究试用，资料保存在本机。复制的反馈只附带版本和页面类型，填写遇到的问题后再自行回传。</p>
        <label htmlFor={feedbackId}>反馈版本与页面</label>
        <textarea id={feedbackId} value={text} readOnly rows={9} spellCheck={false} />
        <button type="button" className="secondary-action" disabled={copying} onClick={() => { void copy(); }}>
          {copying ? "正在复制" : "复制反馈模板"}
        </button>
        <span role="status" aria-live="polite">
          {copyStatus === "copied" ? "已复制。请补充操作情况后回传。" : copyStatus === "unavailable" ? "未能自动复制，请选中上方文字手动复制。" : "模板不包含出生资料、档案编号或搜索内容。"}
        </span>
      </div>
    </details>
  );
}
