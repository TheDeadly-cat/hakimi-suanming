import { useId, useRef } from "react";
import type { ScopedReadingScope } from "../lib/scoped-reading-report";
import type { ReadingSaveFeedback } from "./chart-reading-workbench";
import { AppLink } from "../lib/router";
import "./reading-scoped-save.css";

export function ReadingScopedSave({ caseId, scope, unavailable, confirmation, confirmationStale, feedback, notice,
  onPrepare, onConfirm, onCancel, canCancel }: {
  caseId: string; scope: ScopedReadingScope | null; unavailable: string;
  confirmation: ScopedReadingScope | null; confirmationStale: boolean;
  feedback: ReadingSaveFeedback; notice: string;
  onPrepare: () => void; onConfirm: () => void; onCancel: () => void; canCancel: boolean;
}) {
  const heading = useId();
  const prepareButton = useRef<HTMLButtonElement>(null);
  const busy = feedback.status === "working";
  const unknown = feedback.status === "unconfirmed";
  return <div className="reading-scoped-save">
    <button ref={prepareButton} type="button" className="reading-button reading-button--primary"
      disabled={!scope || !!unavailable || busy || unknown} onClick={onPrepare}>
      {busy ? "正在保存所选范围" : unknown ? "保存结果待核对" : "保存当前阅读范围"}
    </button>
    <p>{unavailable || (scope ? `本次可保存：${scope.title}。保存前会再确认范围。` : "请选择一个专题和明确的时间范围后保存。")}</p>
    {confirmation ? <section className="reading-scope-confirmation" aria-labelledby={heading}>
      <h4 id={heading}>确认保存范围</h4>
      <p><strong>{confirmation.title}</strong> · {confirmation.conclusionIds.length} 条原结论</p>
      <p>同时保留当时的白话、原文、条件、限制和依据。只保存在本机。</p>
      <p>本次未包含的内容与适用边界：</p>
      <ul>{confirmation.excludedScopeLabels.map(label => <li key={label}>{label}</li>)}</ul>
      {confirmationStale ? <p role="alert">当前选择或资料已变化，这次确认已失效。请取消后按当前范围重新保存。</p> : null}
      <div className="reading-scope-actions">
        <button type="button" className="reading-button reading-button--primary" disabled={busy || unknown || confirmationStale} onClick={onConfirm}>确认保存这个范围</button>
        <button type="button" className="reading-button" disabled={!canCancel || unknown} onClick={() => { onCancel(); prepareButton.current?.focus(); }}>
          {busy ? "取消尚未写入的保存" : "取消"}
        </button>
      </div>
    </section> : null}
    {busy ? <p role="status">{feedback.stage === "repository_write" ? "正在写入本机。" : feedback.stage === "post_save_validation" || feedback.stage === "page_refresh"
      ? "正在读回核对这份报告。" : "正在整理所选范围与保存时的文字。"}无需重复点击。</p> : null}
    {feedback.status === "not_saved" ? <p role="alert">本次没有保存。{feedback.message}</p> : null}
    {unknown ? <p role="alert">{feedback.message}<AppLink href={`/reports?case=${encodeURIComponent(caseId)}`}>核对已有报告</AppLink></p> : null}
    {feedback.status === "saved" ? <p role="status">范围报告已保存并核对。{feedback.refreshIssue ? "本页刷新尚未完成，保存事实已确认。" : ""}
      <AppLink href={`/reports?case=${encodeURIComponent(caseId)}&report=${encodeURIComponent(feedback.reportId)}`}>打开这份范围报告</AppLink></p> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </div>;
}
