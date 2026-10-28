import type { ReadingConclusion, ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { buildPlainReadingSummary } from "../lib/reading-plain-summary";
import { ReadingGlossaryText } from "./reading-glossary-text";

export function ReadingPlainSummaryCard({ index, conclusion, onOpen }: {
  index: ReadingExplanationIndex; conclusion: ReadingConclusion; onOpen: (trigger: HTMLButtonElement) => void;
}) {
  const summary = buildPlainReadingSummary(index, conclusion);
  return <article data-reading-conclusion={conclusion.stableId} data-summary-state={summary.projectionState}>
    <h3>{summary.plainTitle}</h3>
    <ReadingGlossaryText text={summary.explanation} className="reading-summary-explanation" />
    <details className="reading-summary-conditions"><summary>条件与术语</summary>
      <ReadingGlossaryText text={conclusion.label} className="reading-summary-professional-label" />
      <p className="reading-explanation-limit">{summary.limitations[0]}</p>
      <h4>成立条件与原文限制</h4>
      {summary.conditions.length || summary.limitations.length > 1 ? <ul>{[...new Set([...summary.conditions, ...summary.limitations.slice(1)])].map((text, i) => <li key={i}>{text}</li>)}</ul>
        : <p>本条未单列更多条件，不能据此认为它没有限制；请核对原结论。</p>}
      <h4>尚未确定</h4>{summary.unknowns.length ? <ul>{summary.unknowns.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p>没有新增单列未定项；上述限制仍然适用。</p>}
      <h4>你可以核对什么</h4><p>{summary.observationQuestion}</p>
      <p className="reading-explanation-limit">白话表达为待审阅稿；不改变原结论、来源权限或专家状态。</p>
    </details>
    <button type="button" className="reading-text-button" onClick={event => onOpen(event.currentTarget)}>读完整结论</button>
  </article>;
}
