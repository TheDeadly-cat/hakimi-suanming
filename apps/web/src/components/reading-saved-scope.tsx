import type { ScopedReadingReport } from "../lib/scoped-reading-report";
import { formatDateTime } from "../lib/format";
import { ReadingGlossaryText } from "./reading-glossary-text";
import { ReadingConclusionEvidence, readingConclusionScopeText } from "./reading-explanation-workbench";
import { frozenPlainConditionText, supportsFrozenPlainConditions } from "../lib/plain-reading-condition";

/** Uses the saved literals only. Opening a report never rebuilds its prose. */
export function ReadingSavedScope({ report }: { report: ScopedReadingReport }) {
  return <section className="reading-explanation-workbench" aria-label="保存时的范围报告">
    <h3>{report.scope.title}</h3>
    <p>{formatDateTime(report.createdAt)} 保存 · {report.scope.conclusionIds.length} 条原结论</p>
    <p>白话、原文、条件和依据均为当时保存的内容。带点线词语的弹出说明属于当前辅助，不改动保存文字。</p>
    <p>本次未包含的内容与适用边界：</p>
    <ul>{report.scope.excludedScopeLabels.map(label => <li key={label}>{label}</li>)}</ul>
    <div className="reading-explanation-results">{report.presentations.map(presentation => {
      const conclusion = report.index.conclusions.find(item => item.stableId === presentation.conclusionId)!;
      return <article key={presentation.conclusionId} data-saved-scoped-conclusion={presentation.conclusionId}>
        <h3>{presentation.kind === "plain_summary" ? presentation.literal.plainTitle : conclusion.label}</h3>
        <p className="reading-explanation-scope">{readingConclusionScopeText(conclusion)}</p>
        <p className="reading-original-state">{presentation.literal.projectionState === "original_required" ? "保存时按原文阅读" : "保存时的白话"}</p>
        {presentation.kind === "plain_summary" ? <>
          <ReadingGlossaryText text={presentation.literal.explanation} className="reading-summary-explanation" />
          <details><summary>保存时的条件与限制</summary>
            {presentation.literal.conditions.map((text, i) => <p key={`c${i}`}>
              {presentation.contentVersion === "hakimi.plain-summary/0.1.2" && supportsFrozenPlainConditions(conclusion.sourceVersions)
                && supportsFrozenPlainConditions(report.index.sourceSnapshot.sourceVersions)
                && conclusion.evidence.ruleApplications.some(rule => rule.limitations.includes(text) && frozenPlainConditionText(rule.ruleId, text) !== text)
                ? <strong>当前辅助标注：禁止据此推断（下为保存原句）。 </strong> : null}{text}</p>)}
            {presentation.literal.limitations.map((text, i) => <p key={`l${i}`}>{text}</p>)}
            {presentation.literal.unknowns.map((text, i) => <p key={`u${i}`}>{text}</p>)}
            <p>{presentation.literal.observationQuestion}</p>
          </details>
        </> : <>
          <p>{presentation.literal.domainLabel} · {presentation.literal.scopeLabel}</p>
          <ReadingGlossaryText text={presentation.literal.meaning} className="reading-summary-explanation" />
          <p>条件与限制：{presentation.literal.condition}</p>
        </>}
        <details><summary>查看保存时的完整原文</summary>
          <ReadingGlossaryText text={conclusion.text} className="reading-explanation-original" />
        </details>
        <ReadingConclusionEvidence index={report.index} conclusion={conclusion} />
      </article>;
    })}</div>
    <details><summary>本报告的版本与范围记录</summary>
      <p>报告版本：{report.source.reportVersion}；白话版本：{report.source.presentationVersion}。</p>
      <p>修订：{report.source.revisionId}；范围报告：{report.reportId}。</p>
      <p>保存成功不改变当时的来源权限或专家审阅状态。</p>
    </details>
  </section>;
}
