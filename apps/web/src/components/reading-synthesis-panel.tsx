import type { LocalReadingSynthesis } from "../lib/local-reading-synthesis";
import type { ReactNode } from "react";
import type { PlainNatalCard } from "../lib/plain-natal-summary";
import { formatDateTime } from "../lib/format";
import "./reading-synthesis-panel.css";

function sourceUrl(value: string): string | undefined {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

export interface ReadingSynthesisPanelProps {
  reading: LocalReadingSynthesis | null;
  loading?: boolean;
  error?: string | null;
  variant?: "full" | "summary" | "sections";
  plainCards?: PlainNatalCard[];
}

function SummaryDetails({ fold, children }: { fold: boolean; children: ReactNode }) {
  return fold ? <details className="reading-synthesis-evidence"><summary>展开格局、喜用与完整命局说明</summary>{children}</details> : <>{children}</>;
}
function revealSection(id: string) {
  let ancestor = document.getElementById(id)?.parentElement;
  while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
}

export function ReadingSynthesisPanel({ reading, loading = false, error, variant = "full", plainCards }: ReadingSynthesisPanelProps) {
  if (!reading && !loading && !error) return null;
  const showSummary = variant !== "sections", showSections = variant !== "summary";
  const primaryDetail = reading?.sections.find((section) => section.id.startsWith("natal-detail-"));
  return <section className={`reading-synthesis-panel reading-synthesis-panel--${variant}`} aria-label={variant === "summary" ? "主线结论摘要" : variant === "sections" ? "主线详细解读" : "主线总评"} aria-busy={loading}>
    {loading ? <p className="reading-synthesis-status" role="status">正在整理主线总评…</p> : null}
    {error ? <p className="reading-synthesis-error" role="alert">{error}</p> : null}
    {reading ? <>
      {showSummary ? <>
      {plainCards?.length ? <div className="reading-plain-domains" aria-label="事业财运感情先读">{plainCards.map(card => <section className="reading-plain-domain" key={card.id} aria-label={card.title}>
        <h3>{card.title}</h3><div><strong>{card.headline}</strong><p>{card.summary}</p>
          <a href={`#reading-${card.sectionIds[0]}`} onClick={() => revealSection(`reading-${card.sectionIds[0]}`)}>展开解读与依据</a></div>
      </section>)}</div> : null}
      <SummaryDetails fold={Boolean(plainCards?.length)}>
      <header className="reading-synthesis-heading"><span>先读主线</span><h2>{reading.headline}</h2></header>
      {!reading.keyPoints?.length || reading.personalRefs.length ? <p className="reading-synthesis-lead">{reading.summary}</p> : null}
      {reading.keyPoints?.length ? <dl className="reading-synthesis-key-points" aria-label="本盘结论摘要">
        {reading.keyPoints.map((point) => <div key={point.id}><dt>{point.label}</dt><dd>{point.text}</dd></div>)}
      </dl> : null}
      {primaryDetail && variant === "summary" ? <div className="reading-synthesis-section">
        <h3>{primaryDetail.title}</h3>
        {primaryDetail.origin === "personal" ? <p>此项已有明确采用的个人修订，正文优先保留你的原文。</p>
          : <p className="reading-synthesis-answer">{primaryDetail.answer}</p>}
        <a href={`#reading-${primaryDetail.id}`}>{primaryDetail.origin === "personal" ? "查看已采用原文与补断对照" : "查看本命补断的完整依据"}</a>
      </div> : null}
      </SummaryDetails>
      </> : <header className="reading-synthesis-heading"><span>从结论展开</span><h2>这张命盘的生活主线</h2></header>}
      {showSections ? <>
      <div className="reading-synthesis-sections">{reading.sections.map((section) => {
        const answers = section.answer?.split(/\n\n+/u).filter(Boolean) ?? [];
        const explanations = section.paragraphs.filter((paragraph) => !answers.includes(paragraph));
        const calculationRefs = section.id.startsWith("natal-detail-") ? section.evidence.filter((item) => item.startsWith("本命补断依据：")) : [];
        const readableEvidence = section.evidence.filter((item) => !calculationRefs.includes(item));
        return <section id={`reading-${section.id}`} className={`reading-synthesis-section reading-synthesis-section--${section.origin}`} key={section.id} aria-label={section.title}>
        <h3>{section.title}</h3>
        {section.origin === "personal" ? <p className="reading-synthesis-origin">你已采用的个人表述 · 保留原文</p> : section.origin === "contextual" ? <p className="reading-synthesis-origin">结合已保存的生活背景</p> : null}
        {section.answer && section.origin !== "personal" ? <>
          {answers.map((answer, index) => <p className="reading-synthesis-answer" key={index}>{answer}</p>)}
          {explanations.length ? <details className="reading-synthesis-explanation"><summary>{section.lifeAdapted ? "查看关系原判断与背景对照" : section.ageAdapted ? "家庭原判断（未按年龄转写）" : section.id === "mechanism" ? "查看格局与取用的完整判断" : "展开这段解读"}</summary>
            {explanations.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </details> : null}
        </> : section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {section.conditions.length || section.evidence.length ? <details className="reading-synthesis-evidence"><summary>这一段的依据与条件</summary>
          <ul>{[...section.conditions, ...readableEvidence].map((item, index) => <li key={index}>{item}</li>)}</ul>
          {section.sourceIds?.map((id) => reading.sources?.find((source) => source.id === id)).filter((source) => source !== undefined).map((source) => <div key={source.id}>
            <p>{sourceUrl(source.url) ? <a href={sourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title} · {source.locator}</p>
            {source.excerpt ? <p>原文短引：{source.excerpt}</p> : null}
            <p>{source.interpretation}</p>
            {source.provenance && sourceUrl(source.provenance.licenseUrl) ? <p><a href={sourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">来源与权利说明</a></p> : null}
          </div>)}
          {calculationRefs.length ? <details><summary>查看计算记录</summary><ul>{calculationRefs.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
        </details> : null}
      </section>; })}</div>
      {reading.conditions.length || reading.evidence.length || reading.sourceVersions.length || reading.personalRefs.length ? <details className="reading-synthesis-evidence reading-synthesis-sources"><summary>总评的范围与来源</summary>
        <ul>{[...reading.conditions, ...reading.evidence].map((item, index) => <li key={index}>{item}</li>)}</ul>
        {reading.personalRefs.length ? <p>采用的个人复核：{reading.personalRefs.map((ref) => `${formatDateTime(ref.createdAt)}（记录 ${ref.noteId.slice(0, 8)}）`).join("；")}。</p> : null}
        {reading.sourceVersions.length ? <p className="reading-synthesis-version">来源版本：{reading.sourceVersions.join("、")}</p> : null}
      </details> : null}
      </> : null}
    </> : null}
  </section>;
}
