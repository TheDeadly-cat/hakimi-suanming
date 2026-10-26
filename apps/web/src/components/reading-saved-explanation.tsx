import { useId, useMemo, useState } from "react";
import { queryReadingExplanation, readingExplanationSearchQuery, type ReadingExplanationIndex, type ReadingExplanationQuery, type ReadingExplanationTopic } from "../lib/reading-explanation-index";
import { formatDateTime } from "../lib/format";
import { ReadingConclusionEvidence, readingMonthOptionLabel } from "./reading-explanation-workbench";
import { ReadingBranchGuide } from "./reading-branch-guide";

const topics: { id: ReadingExplanationTopic; label: string }[] = [
  { id: "summary", label: "摘要与格局喜用" }, { id: "career", label: "事业发展" }, { id: "wealth", label: "收入与开支" },
  { id: "relationship", label: "感情与婚姻" }, { id: "year_comparison", label: "年份对照" },
  { id: "month", label: "关键月份" }, { id: "uncertainty", label: "当时的时间不确定性" }
];
/** A saved index is the only input. No current revision or calculation callback
 * is accepted, so opening an old report cannot regenerate its conclusions. */
export function ReadingSavedExplanation({ index }: { index: ReadingExplanationIndex }) {
  const id = useId(), [query, setQuery] = useState<ReadingExplanationQuery>({ topic: "summary" });
  const [question, setQuestion] = useState("");
  const years = useMemo(() => [...new Set(index.conclusions.flatMap(item => item.scope.year === null ? [] : [item.scope.year]))].sort((a, b) => a - b), [index]);
  const branches = useMemo(() => [...new Set(index.conclusions.flatMap(item => item.scope.branchId ? [item.scope.branchId] : []))], [index]);
  const answer = useMemo(() => queryReadingExplanation(index, query), [index, query]);
  const months = index.conclusions.filter(item => item.scope.level === "month" && item.scope.year === query.year
    && (!query.branchId || item.scope.branchId === query.branchId));
  const choose = (topic: ReadingExplanationTopic) => setQuery({ topic, branchId: query.branchId,
    ...(topic === "month" || topic === "year_comparison" ? { year: years[0], comparisonYear: years[1] } : {}) });
  return <section className="reading-explanation-workbench" aria-label="已保存报告的专题与依据">
    <p>以下只读取 {formatDateTime(index.generatedAt)} 生成时保存的结论与依据。没有保存的内容不会用当前版本补齐。</p>
    <div className="reading-explanation-topics" aria-label="已保存解读专题">{topics.slice(0, 4).map(topic => <button type="button" key={topic.id}
      aria-pressed={answer.topic === topic.id} onClick={() => choose(topic.id)}>{topic.label}</button>)}</div>
    <details open={topics.slice(4).some(topic => topic.id === answer.topic) || undefined}>
      <summary>年份、月份与更多查看</summary>
      <div className="reading-explanation-topics">{topics.slice(4).map(topic => <button type="button" key={topic.id}
        aria-pressed={answer.topic === topic.id} onClick={() => choose(topic.id)}>{topic.label}</button>)}</div>
    </details>
    <form className="reading-explanation-question" onSubmit={event => { event.preventDefault(); setQuery(readingExplanationSearchQuery(question, query.branchId)); }}>
      <label htmlFor={id + "-question"}>在这份报告中查找</label><div><input id={id + "-question"} value={question} maxLength={500}
        onChange={event => setQuestion(event.target.value)} placeholder={`例如：${years[0] ?? "某"}年收入、对照两个年份、关键月份`}
        aria-describedby={id + "-search-help"}/><button type="submit">查找报告</button></div>
      <p id={id + "-search-help"}>只查找当时保存的结论，不是通用聊天；可直接选择事业、收入或感情专题。</p>
    </form>
    {!["summary", "uncertainty"].includes(answer.topic) ? <ReadingBranchGuide index={index} branches={branches} selected={query.branchId}
      needed={answer.status === "needs_selection" && !["summary", "uncertainty"].includes(answer.topic)}
      onChange={branchId => setQuery({ ...query, branchId, monthId: undefined })}/> : null}
    {!["summary", "uncertainty"].includes(answer.topic) ? <div className="reading-explanation-selectors">
      <label htmlFor={id + "-year"}>保存范围内的年份</label><select id={id + "-year"} value={query.year ?? ""}
        onChange={event => setQuery({ ...query, question: undefined, topic: answer.topic, year: event.target.value ? Number(event.target.value) : undefined, monthId: undefined })}>
        <option value="">本命整体</option>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select>
      {answer.topic === "year_comparison" ? <><label htmlFor={id + "-compare"}>保存范围内的对照年份</label><select id={id + "-compare"} value={query.comparisonYear ?? ""}
        onChange={event => setQuery({ ...query, question: undefined, topic: answer.topic, comparisonYear: event.target.value ? Number(event.target.value) : undefined })}>
        <option value="">请选择年份</option>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></> : null}
      {answer.topic === "month" ? <><label htmlFor={id + "-month"}>已保存的月份与领域</label><select id={id + "-month"} value={query.monthId ?? ""}
        onChange={event => setQuery({ ...query, monthId: event.target.value || undefined })}>
        <option value="">该年已保存的月份</option>{months.map(month => <option key={month.stableId} value={month.stableId}>{readingMonthOptionLabel(month)}</option>)}</select></> : null}
    </div> : null}
    <p role="status">{answer.summary}</p>{answer.scopeNotes.map((line, n) => <p key={n} className="reading-explanation-limit">{line}</p>)}
    {answer.topic === "uncertainty" ? <p>这里只保留当时记录的检查结果，打开本报告不会重新计算出生时间或替换原结论。</p> : null}
    <div className="reading-explanation-results">{answer.conclusions.map(conclusion => <article key={conclusion.stableId} data-saved-reading-conclusion={conclusion.stableId}>
      <h3>{conclusion.label}</h3><p className="reading-explanation-original">{conclusion.text}</p>
      <ReadingConclusionEvidence index={index} conclusion={conclusion}/>
    </article>)}</div>
  </section>;
}
