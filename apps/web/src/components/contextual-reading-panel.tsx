import type { ContextualDomainReading } from "../lib/local-contextual-reading";
import "./contextual-reading-panel.css";

export function ContextualReadingPanel({ reading }: { reading: ContextualDomainReading | null }) {
  if (!reading) return null;
  return <section className="contextual-reading-panel" aria-label={`${reading.title} · 背景适配解读`}>
    <p className="contextual-reading-context">{reading.contextLabel}</p>
    <h3>{reading.headline}</h3>
    <p className="contextual-reading-verdict">{reading.summary}</p>
    {reading.examples.length ? <div className="contextual-reading-examples"><h4>放到你的生活里</h4><ul>{reading.examples.map((example, index) => <li key={index}>{example}</li>)}</ul></div> : null}
    {reading.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {reading.focus.length ? <div className="contextual-reading-focus"><h4>当前重点</h4><ul>{reading.focus.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
    {reading.basis.length || reading.sourceVersions.length ? <details className="contextual-reading-basis"><summary>这份适配的依据与范围</summary>
      <ul>{reading.basis.map((item, index) => <li key={index}>{item}</li>)}</ul>
      {reading.sourceVersions.length ? <p className="contextual-reading-version">来源版本：{reading.sourceVersions.join("、")}</p> : null}
    </details> : null}
  </section>;
}
