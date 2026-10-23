import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { FEEDBACK_RATINGS, FEEDBACK_REVIEW_STATES, parseReadingFeedback, readFeedbackThread,
  type ReadingFeedbackReviewDraft, type ReadingFeedbackThread, type FeedbackReviewState } from "../lib/local-reading-feedback";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import { formatDateTime } from "../lib/format";

export interface AppendReadingReview { (draft: ReadingFeedbackReviewDraft, expectedLatestId: string | null): Promise<void> }
export function ReadingFeedbackReview({ record, records, onAppendReview, onExportThread }: {
  record: ResearchNoteRecord; records: readonly ResearchNoteRecord[]; onAppendReview?: AppendReadingReview; onExportThread: (text: string) => void;
}) {
  const id = useId(), parsed = parseReadingFeedback(record.body);
  const [thread, setThread] = useState<ReadingFeedbackThread | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<FeedbackReviewState>("needs_more");
  const [notes, setNotes] = useState(""), [revised, setRevised] = useState(""), [occurredAt, setOccurredAt] = useState("");
  const [message, setMessage] = useState(""), [failed, setFailed] = useState(false), [pending, setPending] = useState(false);
  const busy = useRef(false), active = useRef(true);
  const recordIdentity = `${record.id}:${record.editVersion}:${record.body}`;
  const currentIdentity = useRef(recordIdentity);
  currentIdentity.current = recordIdentity;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setThread(null); setError("");
    void readFeedbackThread(record, records).then((value) => { if (current) setThread(value); })
      .catch((reason) => { if (current) setError(safeVisibleErrorMessage(reason, "关联记录暂未确认，原文仍保留。")); });
    return () => { current = false; };
  }, [record, records]);
  useEffect(() => { setEditing(false); setNotes(""); setRevised(""); setOccurredAt(""); setMessage(""); }, [record.id, record.editVersion, record.body]);
  if (parsed.kind === "invalid" || parsed.kind === "review") return <p role="alert">此记录的关联暂未确认，保留原文查看与导出。</p>;
  const feedback = parsed.kind === "feedback" ? parsed.value : null;
  const status = error || thread?.issues.length ? "关联待核对" : thread?.latest ? FEEDBACK_REVIEW_STATES[thread.latest.value.state] : thread ? "待复核" : "正在核对关联";
  const original = feedback?.originalConclusion ?? "历史反馈没有结构化的原结论字段，请以保存原文为准。";
  const currentRevision = thread?.latest?.value.state === "revised" ? thread.latest.value.revisedConclusion : null;
  const unlinked = records.filter((item) => {
    const parsed = parseReadingFeedback(item.body);
    return parsed.kind === "review" && parsed.value.root.noteId === record.id && !thread?.reviews.some((review) => review.record.id === item.id);
  });
  async function append(draft: ReadingFeedbackReviewDraft, successMessage: string) {
    if (busy.current || !onAppendReview || !thread?.canAppend) return;
    const actionIdentity = recordIdentity;
    busy.current = true; setPending(true); setMessage(""); setFailed(false);
    try {
      await onAppendReview(draft, thread.latest?.record.id ?? null);
      if (active.current && currentIdentity.current === actionIdentity) { setNotes(""); setRevised(""); setOccurredAt(""); setEditing(false); setMessage(successMessage); }
    } catch (reason) { if (active.current && currentIdentity.current === actionIdentity) { setFailed(true); setMessage(safeVisibleErrorMessage(reason, "复核保存结果未确认，请先重新读取记录核对；输入已保留。")); } }
    finally { busy.current = false; if (active.current) setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await append({ state, notes, revisedConclusion: state === "revised" ? revised : "", occurredAt }, "复核已追加保存，原反馈与此前记录保持原样。");
  }
  return <section className="reading-feedback-review" aria-label="反馈复核与个人修订">
    <div className="reading-feedback-status"><strong>{feedback ? FEEDBACK_RATINGS[feedback.rating] : "历史纯文本反馈"}</strong><span>{status}</span></div>
    {feedback ? <dl className="reading-feedback-facts"><dt>反馈内容</dt><dd>{feedback.subjectLabel}</dd><dt>具体方面</dt><dd>{feedback.aspect || "未补充"}</dd>
      <dt>对应时间</dt><dd>{feedback.occurredAt || "未填写具体时期"}</dd><dt>真实经历或当前情况</dt><dd>{feedback.actualSituation || "暂未验证"}</dd>
      <dt>希望如何修订</dt><dd>{feedback.requestedRevision || "尚未提出修订文本"}</dd></dl> : <p>这条旧反馈原文保持完整。可以追加复核，原解读版本以历史正文为准。</p>}
    <div className="reading-feedback-comparison"><article><h4>原结论 · 保留不变</h4><p>{original}</p></article>
      <article><h4>{currentRevision ? "当前个人修订" : "当前复核结果"}</h4><p>{currentRevision ?? (thread?.issues.length ? "关联存在差异，未自动选择修订。" : thread?.latest?.value.state === "retained" ? "本次个人复核保留原结论。" : thread?.latest?.value.state === "needs_more" ? "仍待补充事实，尚未形成新的个人结论。" : "尚未追加复核记录。")}</p></article></div>
    <p className="reading-feedback-scope">复核和修订由你填写，用于个人对照；不代表系统已认定、自动训练 GPT 或修改通用规则。</p>
    {error ? <p role="alert">{error}</p> : null}
    {thread?.issues.map((issue) => <p role="alert" key={issue}>{issue}</p>)}
    {thread?.reviews.length ? <ol className="reading-review-history" aria-label="追加复核时间线">{thread.reviews.map(({ record: review, value }) => <li key={review.id}>
      <h4>{FEEDBACK_REVIEW_STATES[value.state]} <small>用户个人复核 · {formatDateTime(review.createdAt)}</small></h4>
      <p>{value.notes}</p>{value.occurredAt ? <p>对应时间：{value.occurredAt}</p> : null}{value.revisedConclusion ? <blockquote>{value.revisedConclusion}</blockquote> : null}
      <small>接续{value.previous ? "上一条复核" : "原反馈"}，记录 {review.id.slice(0, 8)}</small>
    </li>)}</ol> : null}
    {thread && unlinked.length ? <details><summary>未纳入当前修订的追加原文（{unlinked.length}）</summary>{unlinked.map((item) => <pre key={item.id} tabIndex={0}>{item.body}</pre>)}</details> : null}
    <div className="reading-review-actions">
      {onAppendReview && feedback?.requestedRevision.trim() && thread?.canAppend && !thread.latest ? <button type="button" className="text-button" disabled={pending} onClick={() => { void append({
        state: "revised", notes: "本人选择将原反馈中提出的修订用于本项个人解读；实际情况与具体方面保留在原反馈。",
        revisedConclusion: feedback.requestedRevision, occurredAt: feedback.occurredAt
      }, "已采用这段个人修订，原反馈与计算解读仍完整保留。"); }}>采用这段个人修订</button> : null}
      {onAppendReview && thread?.canAppend && thread.latest?.value.state === "revised" ? <button type="button" className="text-button" disabled={pending} onClick={() => { void append({
        state: "retained", notes: "本人选择恢复本项原计算解读，保留此前个人修订供对照。", revisedConclusion: "", occurredAt: thread.latest?.value.occurredAt ?? feedback?.occurredAt ?? ""
      }, "已追加恢复原解读的记录，此前个人修订仍完整保留。"); }}>恢复原解读</button> : null}
      {onAppendReview ? <button type="button" className="text-button" disabled={!thread?.canAppend || pending} onClick={() => setEditing(!editing)}>{editing ? "收起复核表单" : "追加复核或个人修订"}</button> : null}
      {thread?.reviews.length ? <button type="button" className="text-button" onClick={() => onExportThread(["# 反馈与追加复核记录", `原反馈记录：${record.id}`, record.body,
        ...thread.reviews.flatMap((review) => [`## 追加记录 ${review.record.id} · ${review.record.createdAt}`, review.record.body])].join("\n\n"))}>导出反馈与复核</button> : null}
    </div>
    {editing && onAppendReview ? <form className="reading-review-form" onSubmit={(event) => { void submit(event); }}>
      <label htmlFor={`${id}-state`}>本次复核状态</label><select id={`${id}-state`} value={state} disabled={pending} onChange={(event) => setState(event.target.value as FeedbackReviewState)}>
        {Object.entries(FEEDBACK_REVIEW_STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label htmlFor={`${id}-time`}>对应时间（可填年份、月份或阶段）</label><input id={`${id}-time`} value={occurredAt} maxLength={300} disabled={pending} onChange={(event) => setOccurredAt(event.target.value)} placeholder="如 2026 年上半年，或毕业后两年" />
      <label htmlFor={`${id}-notes`}>复核说明与新增事实</label><textarea id={`${id}-notes`} value={notes} rows={3} maxLength={8000} required disabled={pending} onChange={(event) => setNotes(event.target.value)} placeholder="新增了哪些经历？为什么继续待核、修订或保留原结论？" />
      {state === "revised" ? <><label htmlFor={`${id}-revised`}>希望保留的个人修订文本</label><textarea id={`${id}-revised`} value={revised} rows={4} maxLength={12000} required disabled={pending} onChange={(event) => setRevised(event.target.value)} placeholder="写下更符合你实际情况的表述；这会作为个人修订单独保存。" /></> : null}
      <button className="reading-button reading-button--secondary" type="submit" disabled={pending || !thread?.canAppend || !notes.trim() || (state === "revised" && !revised.trim())}>{pending ? "正在保存" : "保存追加复核"}</button>
    </form> : null}
    {message ? <p role={failed ? "alert" : "status"}>{message}</p> : null}
  </section>;
}
