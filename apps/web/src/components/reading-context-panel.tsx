import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { READING_CONTEXT_NOTES_MAX, READING_CONTEXT_RELATIONSHIP_LABELS, READING_CONTEXT_WORK_LABELS, READING_CONTEXT_YEAR_MAX, READING_CONTEXT_YEAR_MIN, type ReadingContextDraft } from "../lib/local-reading-context";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import "./reading-context-panel.css";

export interface ReadingContextPanelProps {
  contextKey: string;
  context: ReadingContextDraft | null;
  defaultYear: number;
  loading?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  error?: string | null;
  onSave?: (draft: ReadingContextDraft) => Promise<void>;
  onClear?: () => Promise<void>;
  onReload?: () => void | Promise<void>;
}
type Values = Omit<ReadingContextDraft, "fromYear" | "toYear"> & { fromYear: string; toYear: string };
const emptyContext = (year: number): ReadingContextDraft => ({ work: "unspecified", relationship: "unspecified", fromYear: year, toYear: year, notes: "" });
const valuesOf = (value: ReadingContextDraft): Values => ({ ...value, fromYear: String(value.fromYear), toYear: String(value.toYear) });

export function ReadingContextPanel(props: ReadingContextPanelProps) {
  return <BoundReadingContextPanel key={props.contextKey} {...props} />;
}

function BoundReadingContextPanel({ context, defaultYear, loading = false, saving = false, readOnly = false, error, onSave, onClear, onReload }: ReadingContextPanelProps) {
  const id = useId();
  const [values, setValues] = useState<Values>(() => valuesOf(context ?? emptyContext(defaultYear)));
  const [pending, setPending] = useState<"save" | "clear" | "reload" | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const dirty = useRef(false), busy = useRef(false), active = useRef(true);
  const currentContext = useRef(context); currentContext.current = context;
  const incoming = JSON.stringify(context ?? emptyContext(defaultYear));
  const previousIncoming = useRef(incoming);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (loading) return;
    if (dirty.current) {
      if (previousIncoming.current !== incoming) setRemoteChanged(true);
    } else {
      setValues(valuesOf(JSON.parse(incoming) as ReadingContextDraft)); setRemoteChanged(false);
    }
    previousIncoming.current = incoming;
  }, [incoming, loading]);
  const disabled = readOnly || saving || pending !== null;
  const writeUnavailable = disabled || loading || Boolean(error);
  const savedHasContext = Boolean(context && (context.work !== "unspecified" || context.relationship !== "unspecified" || context.notes.trim()));
  function edit<K extends keyof Values>(key: K, value: Values[K]) {
    dirty.current = true; setHasDraft(true); setValues((current) => ({ ...current, [key]: value })); setMessage("");
  }
  function draft(): ReadingContextDraft | null {
    if (!/^\d{4}$/u.test(values.fromYear) || !/^\d{4}$/u.test(values.toYear)
      || Number(values.fromYear) < READING_CONTEXT_YEAR_MIN || Number(values.toYear) > READING_CONTEXT_YEAR_MAX || Number(values.fromYear) > Number(values.toYear)) {
      setFailed(true); setMessage(`请填写 ${READING_CONTEXT_YEAR_MIN}—${READING_CONTEXT_YEAR_MAX} 之间的适用年份，结束年份不能早于开始年份。`); return null;
    }
    return { ...values, fromYear: Number(values.fromYear), toYear: Number(values.toYear) };
  }
  async function perform(kind: "save" | "clear" | "reload", value?: ReadingContextDraft) {
    if (busy.current || saving || (kind !== "reload" && writeUnavailable)) return;
    if ((kind === "save" && (!onSave || !value)) || (kind === "clear" && !onClear) || (kind === "reload" && !onReload)) return;
    busy.current = true; setPending(kind); setMessage(""); setFailed(false);
    try {
      if (kind === "save") await onSave!(value!);
      else if (kind === "clear") await onClear!();
      else await onReload!();
      if (!active.current) return;
      if (kind !== "reload") {
        dirty.current = false; setHasDraft(false); setRemoteChanged(false);
        if (kind === "clear") {
          const base = currentContext.current ?? emptyContext(defaultYear);
          setValues(valuesOf({ ...base, work: "unspecified", relationship: "unspecified", notes: "" }));
        }
      }
      setMessage(kind === "save" ? "生活背景已保存，仅在适用年份内用于个人阅读。" : kind === "clear" ? "已追加清空背景记录，之后按未填写背景阅读；此前记录仍保留。" : "已重新读取背景记录，已编辑的内容仍保留。");
    } catch (reason) {
      if (active.current) { setFailed(true); setMessage(safeVisibleErrorMessage(reason, "本次结果尚未确认，输入已保留，请先重新读取记录核对。")); }
    } finally { busy.current = false; if (active.current) setPending(null); }
  }
  function submit(event: FormEvent) { event.preventDefault(); const value = draft(); if (value) void perform("save", value); }
  const savedLabel = context ? `${context.fromYear}—${context.toYear} 年 · ${READING_CONTEXT_WORK_LABELS[context.work]} · ${READING_CONTEXT_RELATIONSHIP_LABELS[context.relationship]}` : "未填写背景，仍可完整阅读";
  return <details className="reading-context-panel">
    <summary><span>补充当前生活背景 <small>可选</small></span><span className="reading-context-summary">{loading ? "正在读取背景" : error ? "背景读取待核对" : savedLabel}</span></summary>
    <div className="reading-context-body">
      <p>把职业和关系背景带入适用年份的生活解释。不填写也能阅读；自述内容只作补充呈现，不自动推断身份或经历。</p>
      {loading ? <p role="status">正在读取已保存的生活背景…</p> : null}
      {error ? <p className="reading-context-error" role="alert">{error}</p> : null}
      {readOnly ? <p className="reading-context-note">当前为只读模式，可以查看已保存的背景。</p> : null}
      {remoteChanged ? <p className="reading-context-note">已保存的背景有变化；你的输入保留，请核对后再保存。</p> : null}
      <form onSubmit={submit} noValidate>
        <div className="reading-context-grid">
          <label htmlFor={`${id}-work`}>职业或主要日常状态<select id={`${id}-work`} value={values.work} disabled={disabled} onChange={(event) => edit("work", event.target.value as ReadingContextDraft["work"])}>{Object.entries(READING_CONTEXT_WORK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label htmlFor={`${id}-relationship`}>关系背景<select id={`${id}-relationship`} value={values.relationship} disabled={disabled} onChange={(event) => edit("relationship", event.target.value as ReadingContextDraft["relationship"])}>{Object.entries(READING_CONTEXT_RELATIONSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <fieldset className="reading-context-years" disabled={disabled}><legend>仅在这些年份内适用</legend>
          <label htmlFor={`${id}-from`}>开始年份<input id={`${id}-from`} type="number" inputMode="numeric" min={READING_CONTEXT_YEAR_MIN} max={READING_CONTEXT_YEAR_MAX} value={values.fromYear} onChange={(event) => edit("fromYear", event.target.value)} /></label>
          <label htmlFor={`${id}-to`}>结束年份<input id={`${id}-to`} type="number" inputMode="numeric" min={READING_CONTEXT_YEAR_MIN} max={READING_CONTEXT_YEAR_MAX} value={values.toYear} onChange={(event) => edit("toYear", event.target.value)} /></label>
        </fieldset>
        <label className="reading-context-notes" htmlFor={`${id}-notes`}>补充自述（可选，不自动参与判断）<textarea id={`${id}-notes`} rows={3} maxLength={READING_CONTEXT_NOTES_MAX} value={values.notes} disabled={disabled} onChange={(event) => edit("notes", event.target.value)} placeholder="如目前照顾家人，或希望把事业说明理解为学业安排。" /></label>
        <div className="reading-context-actions">
          {onSave && !readOnly ? <button className="reading-button reading-button--secondary" type="submit" disabled={writeUnavailable}>{pending === "save" || saving ? "正在保存" : "保存生活背景"}</button> : null}
          {onClear && !readOnly ? <button className="text-button" type="button" disabled={writeUnavailable || (!savedHasContext && !hasDraft)} onClick={() => { void perform("clear"); }}>{pending === "clear" ? "正在清空" : "清空已保存的背景"}</button> : null}
          {onReload ? <button className="text-button" type="button" disabled={saving || pending !== null || loading} onClick={() => { void perform("reload"); }}>{pending === "reload" ? "正在重新读取" : "重新读取背景"}</button> : null}
        </div>
      </form>
      <p className="reading-context-note">保存或清空都会追加一条记录。清空不删除历史，也不改动原命盘与计算结果。</p>
      {message ? <p className={failed ? "reading-context-error" : "reading-context-message"} role={failed ? "alert" : "status"}>{message}</p> : null}
    </div>
  </details>;
}
