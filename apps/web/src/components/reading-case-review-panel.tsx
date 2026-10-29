import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { webReportExportPort } from "@hakimi/platform";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { READING_CONTEXT_WORK_LABELS, READING_CONTEXT_RELATIONSHIP_LABELS } from "../lib/local-reading-context";
import { parseReadingFeedback } from "../lib/local-reading-feedback";
import { appendReadingCaseReview, type AppendReadingCaseReviewInput } from "../lib/reading-case-review-storage";
import { CASE_REVIEW_EVALUATIONS, caseReviewTargetIdentity, emptyReadingCaseReviewDraft, exportReadingCaseReviewThread,
  loadReadingCaseReviewTargets, readReadingCaseReviewThread, type CaseReviewEvaluation, type ReadingCaseReviewDraft,
  type ReadingCaseReviewTarget, type ReadingCaseReviewThread } from "../lib/reading-case-review";
import { formatDateTime } from "../lib/format";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import { getResearchJournalMutationSnapshot, subscribeResearchJournalMutation } from "./research-journal-mutation-coordinator";
import { PreparedFileDeliveryDialog, type PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import "./reading-saved-record.css";

export interface ReadingCaseReviewPanelProps {
  caseId: string;
  records: readonly ResearchNoteRecord[];
  onReload?: () => Promise<void> | void;
  readOnly?: boolean;
  initialReportId?: string;
  initialConclusionId?: string;
  /** The default uses the real append-only journal service; tests may inject an isolated repository adapter. */
  onAppend?: (input: AppendReadingCaseReviewInput) => Promise<ResearchNoteRecord>;
}
const valueText=(value:unknown):string=>value===null||value===undefined?"未记录":typeof value === "string"?value:JSON.stringify(value);
const asObject=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
function backgroundText(value:unknown):string{
  const source=asObject(value),document=asObject(source?.document),context=asObject(document?.context)??source;
  if(!context)return "当时未填写现实背景。";
  const work=String(context.work??context.workState??""),relationship=String(context.relationship??"");
  const parts=[work in READING_CONTEXT_WORK_LABELS?`工作或学习：${READING_CONTEXT_WORK_LABELS[work as keyof typeof READING_CONTEXT_WORK_LABELS]}`:"",
    relationship in READING_CONTEXT_RELATIONSHIP_LABELS?`关系：${READING_CONTEXT_RELATIONSHIP_LABELS[relationship as keyof typeof READING_CONTEXT_RELATIONSHIP_LABELS]}`:"",
    typeof context.fromYear==="number"&&typeof context.toYear==="number"?`适用 ${context.fromYear}—${context.toYear} 年`:"",
    typeof context.notes==="string"&&context.notes?`当时自述：${context.notes}`:""];
  return parts.filter(Boolean).join("；")||"当时背景详见完整冻结信息；未自动转为已核实事实。";
}
const precisionText=(value:unknown)=>({exact_second:"精确到秒",exact_minute:"精确到分钟",approximate:"大致时间",unknown_hour:"时辰未填写",date_only:"仅日期",unknown:"未填写"} as Record<string,string>)[String(value)]??"见原始时间资料";
export function ReadingCaseReviewPanel({caseId,records,onReload,readOnly=false,initialReportId,initialConclusionId,onAppend=appendReadingCaseReview}:ReadingCaseReviewPanelProps){
  const id=useId(),busy=useRef(false),active=useRef(true);
  const mutation=useSyncExternalStore(subscribeResearchJournalMutation,getResearchJournalMutationSnapshot,getResearchJournalMutationSnapshot);
  const [localRecords,setLocalRecords]=useState<ResearchNoteRecord[]>([]);
  const allRecords=useMemo(()=>[...new Map([...localRecords,...records].filter(record=>record.caseId===caseId).map(record=>[record.id,record])).values()],[localRecords,records,caseId]);
  const reports=useMemo(()=>allRecords.filter(record=>record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)&&record.anchor.kind==="revision"&&record.lifecycle==="active")
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)),[allRecords]);
  const [reportId,setReportId]=useState(initialReportId??"");
  const report=reports.find(record=>record.id===reportId)??(!reportId?reports[0]:undefined);
  const reportKey=report?`${report.id}:${report.editVersion}:${report.body}`:"";
  const [options,setOptions]=useState<{key:string;targets:ReadingCaseReviewTarget[];error:string}|null>(null);
  const [conclusionId,setConclusionId]=useState(initialConclusionId??"");
  const available=options?.key===reportKey?options.targets:[];
  const target=available.find(item=>item.conclusion.stableId===conclusionId)??available[0]??null;
  const targetKey=target?caseReviewTargetIdentity(target):"";
  const currentTarget=useRef(targetKey);currentTarget.current=targetKey;
  const [threadResult,setThreadResult]=useState<{key:string;thread:ReadingCaseReviewThread;error:string}|null>(null);
  const thread=threadResult?.key===targetKey?threadResult.thread:null;
  const [draft,setDraft]=useState<ReadingCaseReviewDraft>(emptyReadingCaseReviewDraft);
  const [draftKey,setDraftKey]=useState("");
  const [pending,setPending]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [artifact,setArtifact]=useState<PreparedFileArtifact|null>(null);
  const hasDraft=Boolean(draft.fact.description||draft.fact.occurredAt||draft.evaluation.notes||draft.evaluation.category!=="not_evaluated"||draft.correctionOf||draft.relatedFeedbackIds.length);
  const staleDraft=hasDraft&&draftKey!==targetKey;
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    let current=true;
    if(!report)return;
    void loadReadingCaseReviewTargets(report).then(targets=>{if(current)setOptions({key:reportKey,targets,error:""});})
      .catch(reason=>{if(current)setOptions({key:reportKey,targets:[],error:safeVisibleErrorMessage(reason,"报告索引暂未核对。")});});
    return()=>{current=false;};
  },[reportKey]);
  useEffect(()=>{
    let current=true;if(!target)return;
    void readReadingCaseReviewThread(target,allRecords).then(value=>{if(current)setThreadResult({key:targetKey,thread:value,error:""});})
      .catch(reason=>{if(current)setThreadResult({key:targetKey,thread:{entries:[],latest:null,issues:[],canAppend:false},error:safeVisibleErrorMessage(reason,"复盘记录暂未核对。")});});
    return()=>{current=false;};
  },[target,targetKey,allRecords]);
  const oldFeedback=useMemo(()=>target?allRecords.filter(record=>{
    if(record.anchor.kind!=="revision"||record.anchor.revisionId!==target.sourceSnapshot.revisionId)return false;
    const parsed=parseReadingFeedback(record.body);
    return parsed.kind==="feedback"&&parsed.value.source.chartResultHash===target.sourceSnapshot.chartResultHash
      &&(target.conclusion.sourceSubjects.includes(parsed.value.subjectId)||parsed.value.subjectId===target.conclusion.stableId);
  }):[],[allRecords,target]);
  function change(update:(previous:ReadingCaseReviewDraft)=>ReadingCaseReviewDraft){
    if(!hasDraft)setDraftKey(targetKey);
    setDraft(update);setMessage("");setError("");
  }
  async function reload(){
    setError("");try{await onReload?.();}catch(reason){if(active.current)setError(safeVisibleErrorMessage(reason,"记录暂未重新读到，原草稿仍保留。"));}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!target||!thread?.canAppend||readOnly||staleDraft||busy.current||mutation.status!=="idle")return;
    const actionKey=targetKey;
    busy.current=true;setPending(true);setError("");setMessage("");
    try{
      const record=await onAppend({target,expectedLatest:thread.latest?.ref??null,draft:structuredClone(draft)});
      if(active.current){
        setLocalRecords(previous=>[...previous.filter(item=>item.id!==record.id),record]);
        if(currentTarget.current===actionKey){setDraft(emptyReadingCaseReviewDraft());setDraftKey(actionKey);setMessage("复盘已追加保存。原解释和此前记录保持原样。");}
      }
      try{await onReload?.();}catch(reason){if(active.current&&currentTarget.current===actionKey)setError(safeVisibleErrorMessage(reason,"本次已保存，但列表尚未刷新；请重新读取，不要重复提交。"));}
    }catch(reason){if(active.current&&currentTarget.current===actionKey)setError(safeVisibleErrorMessage(reason,"保存未确认，草稿仍保留。"));}
    finally{busy.current=false;if(active.current)setPending(false);}
  }
  const canSave=Boolean(target&&thread?.canAppend&&!readOnly&&!pending&&!staleDraft&&mutation.status==="idle"
    &&(draft.fact.description.trim()||draft.evaluation.category!=="not_evaluated"||draft.evaluation.notes.trim()||draft.correctionOf));
  const input=target?.sourceSnapshot.input;
  return <section className="reading-feedback-review" aria-label="具体结论案例复盘">
    <header><h3>围绕一条结论复盘</h3><p>先选当时保存的原结论，再分别记录后来发生的事实和你的评价。这里不计算准确率。</p></header>
    {!reports.length?<p>还没有可选的已保存报告。先保存一份报告，再围绕其中的具体结论复盘。</p>:<>
      <div className="reading-review-form">
        <label htmlFor={id+"-report"}>选择已保存报告</label><select id={id+"-report"} value={report?.id??""} disabled={pending} onChange={event=>{setReportId(event.target.value);setConclusionId("");setMessage("");}}>
          {reports.map(item=><option key={item.id} value={item.id}>{formatDateTime(item.createdAt)} 保存的报告</option>)}
        </select>
        {reportId&&!report?<p role="alert">原报告已不在当前可选列表中，草稿保留，请重新选择。</p>:null}
        {report&&options?.key!==reportKey?<p role="status">正在读取这份报告保存时的结论…</p>:null}
        {options?.key===reportKey&&options.error?<p role="alert">{options.error}</p>:null}
        {options?.key===reportKey&&!options.error&&!available.length?<p>这份旧报告没有保存具体结论索引或原解释生成时间。仍可阅读原文；这里不使用当前版本倒填当时信息。</p>:null}
        {available.length?<><label htmlFor={id+"-conclusion"}>选择要复盘的具体结论</label><select id={id+"-conclusion"} value={target?.conclusion.stableId??""} disabled={pending} onChange={event=>{setConclusionId(event.target.value);setMessage("");}}>
          {available.map(item=><option key={item.conclusion.stableId} value={item.conclusion.stableId}>{item.conclusion.label}</option>)}
        </select></>:null}
      </div>
      {target?<>
        <article><h4>原始解释 · 保留不变</h4><p>{target.conclusion.text}</p><p>原解释生成于 {formatDateTime(target.generatedAt)}；报告保存于 {formatDateTime(target.reportSavedAt)}。</p>
          <details><summary>当时使用的信息与版本</summary><dl>
            <dt>报告版本</dt><dd>{target.reportVersion}</dd><dt>出生日期与时间</dt><dd>{valueText(input?.date)} · {valueText(input?.time)}</dd>
            <dt>时间精度与时区</dt><dd>{precisionText(input?.timePrecision)} · {valueText(input?.timeZone)}</dd>
            <dt>已填写的现实背景</dt><dd>{backgroundText(target.sourceSnapshot.context)}</dd>
          </dl><p>{target.uncertainty.note}</p>{target.conclusion.evidence.unknowns.map((line,index)=><p key={index}>{line}</p>)}
          <details><summary>完整冻结信息</summary><pre tabIndex={0}>{JSON.stringify({sourceSnapshot:target.sourceSnapshot,scope:target.conclusion.scope,limits:target.indexLimitations},null,2)}</pre></details></details>
        </article>
        {!thread?<p role="status">正在核对这条结论的复盘记录…</p>:null}
        {threadResult?.key===targetKey&&threadResult.error?<p role="alert">{threadResult.error}</p>:null}
        {thread?.issues.map(issue=><p role="alert" key={issue}>{issue}</p>)}
        {thread&&!thread.entries.length?<p>尚无这条结论的后续事实或评价；未反馈不代表符合或不符合。</p>:null}
        {thread?.entries.length?<ol className="reading-review-history" aria-label="事实与评价追加历史">{thread.entries.map(entry=><li key={entry.record.id}>
          <h4>记录于 {formatDateTime(entry.record.createdAt)}</h4>
          {entry.value.correctionOf?<p>这是对 {formatDateTime(thread.entries.find(item=>item.record.id===entry.value.correctionOf!.noteId)!.record.createdAt)} 记录的追加更正：{entry.value.correctionReason}</p>:null}
          <dl><dt>事情发生时间</dt><dd>{entry.value.fact.occurredAt||"未填写"}</dd><dt>后续事实</dt><dd>{entry.value.fact.description||"尚未记录事实"}</dd>
            <dt>用户评价</dt><dd>{CASE_REVIEW_EVALUATIONS[entry.value.evaluation.category]}</dd><dt>评价说明</dt><dd>{entry.value.evaluation.notes||"未补充"}</dd></dl>
          {entry.value.relatedFeedback.length?<details><summary>当时显式关联的旧反馈原文</summary>{entry.value.relatedFeedback.map(item=><pre key={item.ref.noteId} tabIndex={0}>{item.body}</pre>)}</details>:null}
        </li>)}</ol>:null}
        {thread?<button type="button" className="text-button" onClick={()=>setArtifact({blob:new Blob([exportReadingCaseReviewThread(target,thread)],{type:"text/markdown;charset=utf-8"}),
          filename:`hakimi-case-review-${target.reportRef.noteId}.md`,title:"具体结论与复盘历史",description:"包含冻结的原解释、当时信息与逐条追加的事实和评价。",sharePolicy:"blocked_sensitive"})}>导出这条结论的复盘</button>:null}
        {readOnly?<p>当前为只读状态，可以查看和导出已有复盘。</p>:<form className="reading-review-form" onSubmit={event=>{void submit(event);}}>
          <h4>追加后续事实</h4><label htmlFor={id+"-occurred"}>事情发生时间（可填年份、月份或说明）</label>
          <input id={id+"-occurred"} value={draft.fact.occurredAt} maxLength={300} disabled={pending} onChange={event=>change(previous=>({...previous,fact:{...previous.fact,occurredAt:event.target.value}}))}/>
          <label htmlFor={id+"-fact"}>发生了什么（没有事实可以留空）</label><textarea id={id+"-fact"} value={draft.fact.description} maxLength={8000} rows={3} disabled={pending} onChange={event=>change(previous=>({...previous,fact:{...previous.fact,description:event.target.value}}))}/>
          <p>发生时间由你填写，记录时间由保存时另行保留；先知道结果再复盘，只作为事后案例分析。</p>
          <h4>用户评价</h4><label htmlFor={id+"-evaluation"}>本次主要评价</label><select id={id+"-evaluation"} value={draft.evaluation.category} disabled={pending} onChange={event=>change(previous=>({...previous,evaluation:{...previous.evaluation,category:event.target.value as CaseReviewEvaluation}}))}>
            {Object.entries(CASE_REVIEW_EVALUATIONS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor={id+"-notes"}>评价说明（与事实分开）</label><textarea id={id+"-notes"} value={draft.evaluation.notes} maxLength={8000} rows={3} disabled={pending} onChange={event=>change(previous=>({...previous,evaluation:{...previous.evaluation,notes:event.target.value}}))}/>
          {thread?.entries.length?<><label htmlFor={id+"-correction"}>是否更正此前记录</label><select id={id+"-correction"} value={draft.correctionOf?.noteId??""} disabled={pending} onChange={event=>change(previous=>({...previous,correctionOf:thread.entries.find(entry=>entry.record.id===event.target.value)?.ref??null,correctionReason:event.target.value?previous.correctionReason:""}))}>
            <option value="">新增记录，不更正旧内容</option>{thread.entries.map(entry=><option value={entry.record.id} key={entry.record.id}>{formatDateTime(entry.record.createdAt)} 的记录</option>)}</select>
            {draft.correctionOf?<><label htmlFor={id+"-reason"}>更正说明</label><textarea id={id+"-reason"} value={draft.correctionReason} maxLength={2000} required disabled={pending} onChange={event=>change(previous=>({...previous,correctionReason:event.target.value}))}/></>:null}
          </>:null}
          {oldFeedback.length?<details><summary>关联同主题的旧反馈（可选）</summary><p>旧反馈不自动转为事实或本次评价；选择后保留当时原文。</p>
            {oldFeedback.map(record=>{const parsed=parseReadingFeedback(record.body);return parsed.kind==="feedback"?<label key={record.id}><input type="checkbox" checked={draft.relatedFeedbackIds.includes(record.id)} disabled={pending} onChange={event=>change(previous=>({...previous,relatedFeedbackIds:event.target.checked?[...previous.relatedFeedbackIds,record.id]:previous.relatedFeedbackIds.filter(id=>id!==record.id)}))}/>{formatDateTime(record.createdAt)} · {parsed.value.subjectLabel}</label>:null;})}
          </details>:null}
          {staleDraft?<div role="alert"><p>所选报告或结论已经变化，草稿仍保留。确认对应关系后才能保存。</p><button type="button" className="text-button" onClick={()=>{setDraftKey(targetKey);setDraft(previous=>({...previous,correctionOf:null,correctionReason:"",relatedFeedbackIds:[]}));}}>将草稿用于所选结论</button></div>:null}
          <button type="submit" className="reading-button reading-button--secondary" disabled={!canSave}>{pending?"正在追加保存":"保存这次复盘"}</button>
        </form>}
      </>:null}
    </>}
    {mutation.status==="call_unknown"?<p role="alert">有一笔保存结果尚未确认，已停止重复写入；请到研究日志核对。</p>:null}
    {onReload?<button type="button" className="text-button" disabled={pending} onClick={()=>{void reload();}}>重新读取报告与复盘</button>:null}
    {message?<p role="status">{message}</p>:null}{error?<p role="alert">{error}</p>:null}
    {artifact?<PreparedFileDeliveryDialog presentation="reading" artifact={artifact} exportPort={webReportExportPort} onClose={()=>setArtifact(null)}/>:null}
  </section>;
}
