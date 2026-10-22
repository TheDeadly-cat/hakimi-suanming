import { useEffect, useState } from "react";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { webReportExportPort } from "@hakimi/platform";
import { formatDateTime } from "../lib/format";
import { LOCAL_READING_FEEDBACK_TAG } from "../lib/local-reading-record";
import { isPackedReadingSnapshot, unpackReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { decodeReadingReportBundle, isReadingReportBundle, type ReadingReportBundle } from "../lib/local-reading-report-bundle";
import { parseReadingFeedback, LOCAL_READING_REVIEW_TAG } from "../lib/local-reading-feedback";
import { LOCAL_READING_CONTEXT_TAG, parseReadingContext } from "../lib/local-reading-context";
import { ReadingFeedbackReview, type AppendReadingReview } from "./reading-feedback-review";
import { PreparedFileDeliveryDialog, type PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { ReadingReportText } from "./reading-report-text";
import "./reading-saved-record.css";

const EMPTY_RECORDS: readonly ResearchNoteRecord[] = [];
export function ReadingSavedRecord({ record, relatedRecords = EMPTY_RECORDS, onAppendReview, defaultOpen = false, reportLabel }: {
  record: ResearchNoteRecord; relatedRecords?: readonly ResearchNoteRecord[]; onAppendReview?: AppendReadingReview;
  defaultOpen?: boolean; reportLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [archiveOpen, setArchiveOpen] = useState<{ body: string; open: boolean } | null>(null);
  const [savedArtifact, setSavedArtifact] = useState<{ id: string; body: string; editVersion: number; value: PreparedFileArtifact } | null>(null);
  const artifact = savedArtifact?.id === record.id && savedArtifact.body === record.body && savedArtifact.editVersion === record.editVersion
    ? savedArtifact.value : null;
  const setArtifact = (value: PreparedFileArtifact | null) => setSavedArtifact(value
    ? { id: record.id, body: record.body, editVersion: record.editVersion, value } : null);
  const [decoded, setDecoded] = useState<{ body: string; text: string; bundle: ReadingReportBundle | null } | null>(null);
  const [decodeError, setDecodeError] = useState<{ body: string; message: string } | null>(null);
  const error = decodeError?.body === record.body ? decodeError.message : "";
  const packed = isPackedReadingSnapshot(record.body);
  const feedback = record.tags.includes(LOCAL_READING_FEEDBACK_TAG);
  const context = record.tags.includes(LOCAL_READING_CONTEXT_TAG) || parseReadingContext(record.body).kind !== "legacy";
  const parsedFeedback = feedback ? parseReadingFeedback(record.body) : null;
  const reviewRecord = record.tags.includes(LOCAL_READING_REVIEW_TAG) || parsedFeedback?.kind === "review";
  const allowBundle = !feedback && !context && !reviewRecord;
  const requiresDecode = packed || (allowBundle && isReadingReportBundle(record.body));
  const text = requiresDecode ? decoded?.body === record.body ? decoded.text : null : record.body;
  const bundle = allowBundle && decoded?.body === record.body ? decoded.bundle : null;
  useEffect(() => {
    if (!open || !requiresDecode || text !== null) return;
    let current = true;
    setDecodeError(null);
    const read = async () => {
      const value = packed ? await unpackReadingSnapshot(record.body) : record.body;
      const report = allowBundle ? await decodeReadingReportBundle(value) : null;
      if (current) setDecoded({ body: record.body, text: value, bundle: report });
    };
    void read()
      .catch((reason) => { if (current) setDecodeError({ body: record.body, message: reason instanceof Error ? reason.message : "解读暂未打开，原记录仍保留。" }); });
    return () => { current = false; };
  }, [open, packed, requiresDecode, allowBundle, record.body, text]);
  return <><details className="reading-saved-record" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary>
    <strong>{context ? "阅读背景记录" : reviewRecord ? "追加复核记录" : feedback ? "用户反馈" : reportLabel ?? "解读快照"}</strong>
    <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time></summary>
    {open && text === null && !error ? <p role="status">正在打开完整解读…</p> : null}
    {open && error ? <p role="alert">{error}</p> : null}
    {open && bundle ? <div className="reading-report-export-actions">
      <button type="button" className="text-button" onClick={() => setArtifact({
        blob: new Blob([bundle.reading], { type: "text/markdown;charset=utf-8" }), filename: `hakimi-saved-report-${record.id}-v${record.editVersion}.md`,
        title: "已保存的通读报告", description: `${formatDateTime(record.createdAt)}保存的阅读稿，使用当时的结论与版本。`, sharePolicy: "blocked_sensitive"
      })}>导出这份通读报告</button>
      <button type="button" className="text-button" onClick={() => setArtifact({
        blob: new Blob([bundle.archive], { type: "text/markdown;charset=utf-8" }), filename: `hakimi-saved-reading-${record.id}-v${record.editVersion}.md`,
        title: "已保存的完整档案", description: "包含当时完整原文、条件、来源与版本，按保存时的文字导出。", sharePolicy: "blocked_sensitive"
      })}>导出这份完整档案</button>
    </div> : open && text !== null ? <button type="button" className="text-button" onClick={() => setArtifact({
      blob: new Blob([text], { type: "text/markdown;charset=utf-8" }),
      filename: `hakimi-saved-reading-${record.id}-v${record.editVersion}.md`,
      title: context ? "已保存的阅读背景" : reviewRecord ? "已保存的追加复核" : feedback ? "已保存的用户反馈" : "已保存的原始解读",
      description: `${formatDateTime(record.createdAt)}保存的原文，使用当时的结论与版本。`, sharePolicy: "blocked_sensitive"
    })}>导出这份原始记录</button> : null}
    {open && reviewRecord && parsedFeedback?.kind !== "review" ? <p role="alert">复核记录格式已变化，关联暂未确认；原始正文仍可查看与导出。</p> : null}
    {open && feedback && !reviewRecord ? <ReadingFeedbackReview record={record} records={relatedRecords} onAppendReview={onAppendReview}
      onExportThread={(body) => setArtifact({ blob: new Blob([body], { type: "text/markdown;charset=utf-8" }), filename: `hakimi-feedback-review-${record.id}.md`,
        title: "反馈与追加复核", description: "包含原反馈及按顺序追加的个人复核原文。", sharePolicy: "blocked_sensitive" })} /> : null}
    {open && bundle ? <>
      <ReadingReportText text={bundle.reading} />
      <details open={archiveOpen?.body === record.body && archiveOpen.open} className="reading-feedback-original" onToggle={(event) => setArchiveOpen({ body: record.body, open: event.currentTarget.open })}>
        <summary>查看已保存的完整档案</summary>
        {archiveOpen?.body === record.body && archiveOpen.open ? <pre tabIndex={0} aria-label="已保存完整档案全文">{bundle.archive.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ")}</pre> : null}
      </details>
    </> : text !== null && !bundle ? parsedFeedback?.kind === "feedback" || parsedFeedback?.kind === "review"
      ? <details className="reading-feedback-original"><summary>查看保存原文与来源</summary><pre tabIndex={0} aria-label="已保存记录全文">{text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ")}</pre></details>
      : <pre tabIndex={0} aria-label="已保存记录全文">{text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ")}</pre> : null}
  </details>{artifact ? <PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={webReportExportPort} onClose={() => setArtifact(null)} /> : null}</>;
}
