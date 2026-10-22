import type { LocalOutlookJudgment, LocalOutlookJudgmentSegment } from "../lib/local-outlook-judgment";
import type { PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment-sources";
import { safeVisibleText } from "../lib/visible-text";

const AXES = { balance: "旺衰与承接", pattern: "格局主线", seasonal: "调候条件" };
const EFFECTS = { assists: "形成助力", obstructs: "增加阻力", mixed: "助力与阻力并存", neutral: "未见明显改变", unresolved: "按条件判断" };
const clean = (value: string) => safeVisibleText(value, "", 12_000);
const dateLabel = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
function sourceUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

export function OutlookJudgmentPanel({ judgment, segments = [], sources = [] }: {
  judgment: LocalOutlookJudgment | null | undefined;
  segments?: LocalOutlookJudgmentSegment[];
  sources?: readonly PreliminarySource[];
}) {
  if (!judgment) return null;
  const references = sources.filter((source) => judgment.sourceIds.includes(source.id));
  const visibleAxes = [...new Map(judgment.axes.map((axis) => [`${axis.axis}:${axis.effect}:${axis.summary}`, axis])).values()];
  return <section className="outlook-judgment" aria-label="综合判断的依据">
    <h4>{clean(judgment.headline)}</h4>
    <div className="outlook-axis-overview">{visibleAxes.map((axis) => <article key={axis.id}>
      <h5>{AXES[axis.axis]}<span>{EFFECTS[axis.effect]}</span></h5>
      <p>{clean(axis.summary)}</p>
    </article>)}</div>
    {judgment.conflicts.length ? <div className="outlook-judgment-conflicts"><strong>这些条件需要一起看</strong>{judgment.conflicts.map((item, index) => <p key={index}>{clean(item)}</p>)}</div> : null}
    {segments.length > 1 ? <div className="outlook-judgment-segments"><h5>分阶段来看</h5>{segments.map((segment) => <article key={segment.id}>
      <strong>{segment.branchLabel} · {dateLabel(segment.startInstant)}—{dateLabel(segment.endExclusiveInstant)}前 · {segment.judgment.label}</strong>
      <p>{clean(segment.judgment.summary)}</p>
    </article>)}</div> : null}
    <details className="outlook-evidence"><summary>为什么这样判断</summary>
      {judgment.axes.map((axis) => <div key={axis.id} className="outlook-axis-evidence"><h5>{AXES[axis.axis]} · {EFFECTS[axis.effect]}</h5>
        <ul>{[...axis.evidence, ...axis.satisfiedConditions.map((item) => `已满足：${item}`), ...axis.blockers.map((item) => `阻碍：${item}`),
          ...axis.rescues.map((item) => `调节条件：${item}`), ...axis.unresolvedConditions.map((item) => `仍需结合：${item}`)].map((item, index) => <li key={index}>{clean(item)}</li>)}</ul>
      </div>)}
      <ul>{[...judgment.conditions, ...judgment.coverageGaps].map((item, index) => <li key={index}>{clean(item)}</li>)}</ul>
      {references.map((source) => <div className="outlook-source" key={source.id}><strong>{clean(source.title)}</strong><p>{clean(source.locator)}</p>
        {source.excerpt ? <blockquote>{clean(source.excerpt)}</blockquote> : null}<p>{clean(source.interpretation)}</p>
        {sourceUrl(source.url) ? <a href={sourceUrl(source.url)} target="_blank" rel="noopener noreferrer">查看原文</a> : null}
        {source.provenance ? <p>{clean(source.provenance.rightsNote)} {sourceUrl(source.provenance.licenseUrl) ? <a href={sourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">来源许可说明</a> : null}</p> : null}</div>)}
      <p className="outlook-period">解读规则 {clean(judgment.version)} · {clean(judgment.policyVersion)}</p>
    </details>
  </section>;
}
