import { useEffect, useId, useMemo, useState } from "react";
import type { ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { buildReadingTimeUncertainty, queryReadingExplanation, readReadingExplanationIndex, readingExplanationSearchQuery,
  type ReadingConclusion, type ReadingExplanationIndex, type ReadingExplanationQuery, type ReadingExplanationTopic,
  type ReadingTimeUncertainty } from "../lib/reading-explanation-index";
import { decodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { isPackedReadingSnapshot, unpackReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import { ReadingBranchGuide } from "./reading-branch-guide";
import "./reading-explanation-workbench.css";

interface Props {
  index: ReadingExplanationIndex; revision: RevisionRecord; records: ResearchNoteRecord[];
  onTimeUncertaintyChange?: (value: ReadingTimeUncertainty) => void;
  onRequestYear?: (year: number) => void; monthsLoading?: boolean; loading?: boolean;
}
const topics: { id: ReadingExplanationTopic; label: string }[] = [
  { id: "summary", label: "一页摘要" }, { id: "career", label: "事业发展" }, { id: "wealth", label: "收入与开支" },
  { id: "relationship", label: "感情与婚姻" }, { id: "year_comparison", label: "年份对照" }, { id: "month", label: "关键月份" },
  { id: "uncertainty", label: "出生时间" }, { id: "report_comparison", label: "对照旧报告" }
];
const formatTime = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
export const readingMonthOptionLabel = (item: ReadingConclusion) => item.scope.startInstant && item.scope.endExclusiveInstant
  && Number.isFinite(Date.parse(item.scope.startInstant)) && Number.isFinite(Date.parse(item.scope.endExclusiveInstant))
  ? `${formatTime(item.scope.startInstant)}—${formatTime(item.scope.endExclusiveInstant)}前 · ${item.label}` : item.label;
const scopeText = (item: ReadingConclusion) => item.scope.level === "natal" ? "本命整体倾向，不对应某个确定事件"
  : !item.scope.startInstant || !item.scope.endExclusiveInstant || !Number.isFinite(Date.parse(item.scope.startInstant)) || !Number.isFinite(Date.parse(item.scope.endExclusiveInstant))
    ? "当时未记录完整起止范围，不能补猜日期。"
    : `${formatTime(item.scope.startInstant)}起至${formatTime(item.scope.endExclusiveInstant)}前（北京时间）；${item.scope.branchId === "forward" ? "顺行路径" : item.scope.branchId === "backward" ? "逆行路径" : "已确定路径"}`;
const list = (items: readonly string[], empty: string) => items.length ? <ul>{items.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p>{empty}</p>;
const excerpt = (text: string) => text.match(/[^。！？]+[。！？]?/u)?.[0] ?? text;
const logicalId = (id: string) => id.slice(id.indexOf("/") + 1);

function Evidence({ index, conclusion }: { index: ReadingExplanationIndex; conclusion: ReadingConclusion }) {
  const [open, setOpen] = useState(false);
  return <details className="reading-explanation-evidence" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>查看依据 · {conclusion.label}</summary>
    {open ? <div>
      <h4>本盘事实</h4>{list(conclusion.evidence.facts, "这一项没有额外列出计算事实；不从其他领域借用事实。")}
      <h4>采用规则</h4>{conclusion.evidence.ruleApplications.length ? conclusion.evidence.ruleApplications.map((rule, i) => <div key={`${rule.ruleId}-${i}`}>
        <strong>{rule.title}</strong><p>{rule.decision}</p>{list(rule.support, "此规则没有可单列的支持事实。")}
        {rule.limitations.length ? <><p>本项限制：</p>{list(rule.limitations, "")}</> : null}
      </div>) : <p>{conclusion.origin === "personal" ? "个人原文，不作自动规则背书。" : "未保存逐句的规则映射，不能把规则名称当作已经证明。"}</p>}
      <h4>支持与限制</h4>{list(conclusion.evidence.support, "未单列进一步支持。")}{list(conclusion.evidence.limits, "仍限于原报告所列条件。")}
      <h4>适用范围</h4><p>{scopeText(conclusion)}</p><p>{conclusion.origin === "personal" ? "已采用个人原文" : conclusion.origin === "contextual" ? "包含已确认生活背景" : "本地规则解释"}</p>
      <h4>尚未确定</h4>{list(conclusion.evidence.unknowns, "没有新增的未定项；上述条件和范围仍然适用，事件并非已证实。")}
      {conclusion.evidence.citations.length ? <><h4>相关原文</h4>{conclusion.evidence.citations.map(id => {
        const source = index.sources.find(item => item.id === id)!;
        return <blockquote key={id}><p>{source.excerpt}</p><cite>{/^https?:\/\//u.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title} · {source.locator}</cite><p>{source.interpretation}</p></blockquote>;
      })}<p>原文关联不等于它已经证明整句现代生活解释；不把“有引用”当成语义验证。</p></> : null}
      <details><summary>当时的版本与来源编号</summary><p>生成：{formatTime(index.generatedAt)}；报告：{index.sourceSnapshot.reportVersion}</p>
        {list(conclusion.sourceSubjects, "未单列来源编号。")}{list(conclusion.sourceVersions, "未单列版本。")}</details>
    </div> : null}
  </details>;
}
export { Evidence as ReadingConclusionEvidence };

export function ReadingExplanationWorkbench({ index, revision, records, onTimeUncertaintyChange, onRequestYear, monthsLoading, loading = false }: Props) {
  const componentId = useId();
  const [query, setQuery] = useState<ReadingExplanationQuery>({ topic: "summary" });
  const [question, setQuestion] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [oldId, setOldId] = useState("");
  const [oldResult, setOldResult] = useState<{ key: string; index: ReadingExplanationIndex | null; reading: string } | null>(null);
  const [oldError, setOldError] = useState("");
  const [timeState, setTimeState] = useState<"idle" | "busy">("idle");
  const [timeError, setTimeError] = useState("");
  const reports = records.filter(record => record.tags.includes(LOCAL_READING_SNAPSHOT_TAG));
  const oldRecord = reports.find(record => record.id === oldId);
  const oldKey = oldRecord ? `${oldRecord.id}:${oldRecord.editVersion}:${oldRecord.body}` : "";
  useEffect(() => {
    if (!oldRecord) return;
    let current = true;
    setOldError("");
    void (async () => {
      const text = isPackedReadingSnapshot(oldRecord.body) ? await unpackReadingSnapshot(oldRecord.body) : oldRecord.body;
      const bundle = await decodeReadingReportBundle(text);
      let savedIndex: ReadingExplanationIndex | null = null;
      try {
        savedIndex = bundle ? readReadingExplanationIndex(bundle.archive) : null;
        if (savedIndex && (oldRecord.anchor.kind !== "revision" || savedIndex.sourceSnapshot.caseId !== oldRecord.caseId
          || savedIndex.sourceSnapshot.revisionId !== oldRecord.anchor.revisionId || savedIndex.sourceSnapshot.reportVersion !== bundle!.version
          || Date.parse(savedIndex.generatedAt) > Date.parse(oldRecord.createdAt))) throw new Error("旧报告的案例、修订、版本或生成时间未能对应，未用于来源对照；原文仍保留。");
      } catch (reason) {
        savedIndex = null;
        if (current) setOldError(safeVisibleErrorMessage(reason, "旧报告依据索引未能对应，原文仍保留。"));
      }
      if (current) setOldResult({ key: oldKey, index: savedIndex, reading: bundle?.reading ?? text });
    })().catch(reason => { if (current) setOldError(safeVisibleErrorMessage(reason, "旧报告未能打开，原记录保留。")); });
    return () => { current = false; };
  }, [oldRecord, oldKey]);
  const previous = oldResult?.key === oldKey ? oldResult : null;
  const answer = useMemo(() => queryReadingExplanation(index, { ...query, previousIndex: previous?.index }), [index, query, previous]);
  const years = [...new Set(index.conclusions.flatMap(item => item.scope.year === null ? [] : [item.scope.year]))].sort((a, b) => a - b);
  const branches = [...new Set(index.conclusions.flatMap(item => item.scope.branchId ? [item.scope.branchId] : []))];
  const summaryItems = answer.topic === "summary" ? answer.conclusions.filter(item => item.domain !== "natal"
    || item.stableId.endsWith("/natal:pattern") || item.stableId === answer.conclusions.find(row => row.stableId.includes("/natal:use:"))?.stableId) : answer.conclusions;
  const selected = selectedId ? index.conclusions.find(item => item.stableId === selectedId) : null;
  const shown = selected ? [selected] : summaryItems;
  const compact = !selected && (answer.topic === "summary" || (answer.topic === "month" && !query.monthId));
  const choose = (topic: ReadingExplanationTopic) => { setSelectedId(null); setQuery({ topic, branchId: query.branchId,
    ...(topic === "month" || topic === "year_comparison" ? { year: years[0], comparisonYear: years[1] } : {}) });
    if (topic === "month" && years[0]) onRequestYear?.(years[0]); };
  const months = index.conclusions.filter(item => item.scope.level === "month" && item.scope.year === (query.year ?? years[0])
    && (!query.branchId || item.scope.branchId === query.branchId));
  if (loading) return <section className="reading-explanation-workbench" aria-label="按问题阅读与查看依据" aria-busy="true">
    <p role="status">正在核对所选年份与当前资料，完成后继续显示你刚才选择的专题。</p>
  </section>;
  return <section className="reading-explanation-workbench" aria-label="按问题阅读与查看依据">
    <p className="reading-explanation-intro">先看摘要，再选你关心的问题。每个专题都引用这份报告的原结论。</p>
    <div className="reading-explanation-topics" aria-label="解读专题">{topics.slice(0, 4).map(topic => <button type="button" key={topic.id}
      aria-pressed={answer.topic === topic.id && !selected} onClick={() => choose(topic.id)}>{topic.label}</button>)}</div>
    <details open={topics.slice(4).some(topic => topic.id === answer.topic) || undefined}>
      <summary>年份、月份与更多查看</summary>
      <div className="reading-explanation-topics" aria-label="更多解读专题">{topics.slice(4).map(topic => <button type="button" key={topic.id}
        aria-pressed={answer.topic === topic.id && !selected} onClick={() => choose(topic.id)}>{topic.label}</button>)}</div>
    </details>
    <form className="reading-explanation-question" onSubmit={event => {
      event.preventDefault(); setSelectedId(null);
      const next = readingExplanationSearchQuery(question, query.branchId); setQuery(next);
      if (next.year && queryReadingExplanation(index, next).topic === "month") onRequestYear?.(next.year);
    }}>
      <label htmlFor={`${componentId}-question`}>在这份报告中查找</label><div><input id={`${componentId}-question`} value={question} maxLength={500}
        onChange={event => setQuestion(event.target.value)} aria-describedby={`${componentId}-search-help`}
        placeholder={`例如：${years[0] ?? "某"}年收入、对照两个年份、关键月份`} /><button type="submit">查找报告</button></div>
      <p id={`${componentId}-search-help`}>查找已有结论，不是通用聊天。也可以直接点上方事业、收入或感情专题。</p>
    </form>
    {!["summary", "uncertainty", "report_comparison"].includes(answer.topic) ? <ReadingBranchGuide index={index} branches={branches} selected={query.branchId}
      needed={answer.status === "needs_selection" && !["summary", "uncertainty", "report_comparison"].includes(answer.topic)}
      onChange={branchId => { setSelectedId(null); setQuery({ ...query, branchId, monthId: undefined }); }} /> : null}
    {!["summary", "uncertainty", "report_comparison"].includes(answer.topic) ? <div className="reading-explanation-selectors">
      <label>年份<select value={query.year ?? ""} onChange={event => { const year = event.target.value ? Number(event.target.value) : undefined;
        setSelectedId(null); setQuery({ ...query, question: undefined, topic: answer.topic, year, monthId: undefined }); if (year && answer.topic === "month") onRequestYear?.(year); }}>
        <option value="">本命整体</option>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></label>
      {answer.topic === "year_comparison" ? <label>对照年份<select value={query.comparisonYear ?? ""} onChange={event => setQuery({ ...query, question: undefined, topic: answer.topic, comparisonYear: event.target.value ? Number(event.target.value) : undefined })}>
        <option value="">选择年份</option>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></label> : null}
      {answer.topic === "month" ? <label>月份与领域<select value={query.monthId ?? ""} onChange={event => { setSelectedId(null); setQuery({ ...query, topic: "month", year: query.year ?? years[0], monthId: event.target.value || undefined }); }}>
        <option value="">请选择一个月份</option>{months.map(month => <option key={month.stableId} value={month.stableId}>{readingMonthOptionLabel(month)}</option>)}</select></label> : null}
    </div> : null}
    {answer.topic === "report_comparison" ? <div className="reading-explanation-selectors"><label>选择旧报告<select value={oldId} onChange={event => setOldId(event.target.value)}>
      <option value="">选择已保存报告</option>{reports.map(record => <option key={record.id} value={record.id}>{formatTime(record.createdAt)} · 保存记录 {record.editVersion}</option>)}</select></label>
      {oldKey && !previous && !oldError ? <p role="status">正在按当时的版本读取旧报告…</p> : null}
      {oldError ? <p role="alert">{oldError}</p> : null}
      {previous && !previous.index ? <p>这份旧报告没有保存逐条依据索引，无法可靠归因输入、规则或文案变化；下面保留当时原文。</p> : null}
      {previous ? <details><summary>查看旧报告完整原文</summary><pre className="reading-explanation-original">{previous.reading}</pre></details> : null}
    </div> : null}
    {answer.topic === "uncertainty" ? <div className="reading-explanation-time">
      <dl><div><dt>输入来源</dt><dd>使用填写资料，未独立核验原始证明。</dd></div><div><dt>四柱边界</dt><dd>{index.uncertainty.note}</dd></div>
        <div><dt>整篇解释</dt><dd>尚未评估整体稳定性；四柱样本相同也不能替代这一项。</dd></div></dl>
      <button type="button" disabled={timeState === "busy" || index.uncertainty.pillarStatus === "unavailable"} onClick={() => { setTimeState("busy"); setTimeError("");
        void buildReadingTimeUncertainty(revision).then(value => onTimeUncertaintyChange?.(value))
          .catch(reason => setTimeError(safeVisibleErrorMessage(reason, "时间边界检查未完成，当前仍显示未评估。"))).finally(() => setTimeState("idle"));
      }}>{timeState === "busy" ? "正在检查七个时间样本…" : "检查出生时间前后的四柱变化"}</button>
      {index.uncertainty.offsetsMinutes.length ? <p>仅检查偏移分钟：{index.uncertainty.offsetsMinutes.join("、")}。变化柱位：{index.uncertainty.changedPillars.join("、") || "未见变化或仍有未完成样本"}。</p> : null}
      {timeError ? <p role="alert">{timeError}</p> : null}
    </div> : null}
    <p role="status">{selected ? "以下是所选结论的完整原文。" : answer.summary}</p>
    {monthsLoading && answer.topic === "month" ? <p role="status">正在按所选年份整理流月，已有本命与年度结论仍可阅读。</p> : null}
    {answer.scopeNotes.map((note, i) => <p className="reading-explanation-limit" key={i}>{note}</p>)}
    {answer.changes?.length ? <dl>{answer.changes.map((change, i) => <div key={i}><dt>{change.label}</dt><dd>{change.detail}</dd></div>)}</dl> : null}
    <div className={answer.topic === "summary" && !selected ? "reading-explanation-summary" : "reading-explanation-results"}>
      {shown.map(conclusion => <article key={conclusion.stableId} data-reading-conclusion={conclusion.stableId}>
        <h3>{conclusion.label}</h3>{conclusion.scope.level !== "natal" ? <p className="reading-explanation-scope">{scopeText(conclusion)}</p> : null}
        <p className="reading-explanation-original">{compact && !conclusion.stableId.endsWith("/natal:pattern") ? excerpt(conclusion.text) : conclusion.text}</p>
        {compact ? <><p className="reading-explanation-limit">{conclusion.evidence.limits[0] ?? "保持原报告的条件与范围，不推定事件已经发生。"}</p>
          <button type="button" className="reading-text-button" onClick={() => setSelectedId(conclusion.stableId)}>读完整结论</button></> : null}
        {answer.topic === "report_comparison" && previous?.index ? <details><summary>对照这条结论的旧原文</summary><p className="reading-explanation-original">
          {previous.index.conclusions.find(item => logicalId(item.stableId) === logicalId(conclusion.stableId))?.text ?? "旧报告没有同范围条目，不视为判断反转。"}</p></details> : null}
        <Evidence index={index} conclusion={conclusion} />
      </article>)}
    </div>
  </section>;
}
