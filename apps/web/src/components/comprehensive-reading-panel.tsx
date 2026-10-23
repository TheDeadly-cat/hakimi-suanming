import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import type { BaziComprehensiveReading, BaziComprehensiveChapter } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { NatalUsefulGuidance } from "../../../../packages/bazi-interpretation/src/natal-useful-guidance";
import type { ReadingSynthesisSection } from "../lib/local-reading-synthesis";
import { safeVisibleText } from "../lib/visible-text";
import { PersonalReadingScope } from "./personal-reading-note";
import { ContextualReadingScope } from "./contextual-reading-provider";
import "./comprehensive-reading-panel.css";

const GROUPS = [
  { id: "overview", label: "命局总论", chapters: ["overview", "personality"] },
  { id: "structure", label: "格局喜用", chapters: ["structure", "useful_elements"] },
  { id: "career", label: "事业财务", chapters: ["career", "wealth"] },
  { id: "relationships", label: "关系家庭", chapters: ["relationships", "family"] },
  { id: "development", label: "成长方向", chapters: ["development"] }
] as const;
const visible = (value: string) => safeVisibleText(value, "", 12_000);
function publicSourceUrl(value: string): string | undefined {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

function Points({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="deep-reading-points"><h4>{title}</h4><ul>{items.map((item, index) => <li key={index}>{visible(item)}</li>)}</ul></div>;
}

function UsefulStemRoles({ guidance }: { guidance: NatalUsefulGuidance }) {
  if (!guidance.entries.length) return null;
  return <section className="deep-reading-useful-roles" aria-label="本盘用字分工">
    <h4>本盘用字分工</h4>
    <dl>{guidance.entries.map((entry) => <div className="deep-reading-useful-entry" key={entry.id}>
      <dt><strong>{visible(entry.stem)}</strong><span>{visible(entry.tenGod)}</span><small>{visible(entry.roleLabel)}</small></dt>
      <dd>
        <PersonalReadingScope subjectId={`useful-stem-${entry.id}`}>
        <p className="deep-reading-useful-presence">{visible(entry.presenceText)}</p>
        <p>{visible(entry.judgment)}</p>
        {entry.conditions.length ? <details><summary>{visible(entry.stem)}的适用条件 <ChevronDown size={16} aria-hidden="true" /></summary>
          <ul>{entry.conditions.map((condition, index) => <li key={index}>{visible(condition)}</li>)}</ul>
        </details> : null}
        </PersonalReadingScope>
      </dd>
    </div>)}</dl>
  </section>;
}

function Chapter({ chapter, sources, usefulGuidance, familyReading, relationshipReading }: { chapter: BaziComprehensiveChapter; sources: PreliminarySource[]; usefulGuidance?: NatalUsefulGuidance; familyReading?: ReadingSynthesisSection; relationshipReading?: ReadingSynthesisSection }) {
  const references = sources.filter((source) => chapter.sourceIds.includes(source.id));
  const guidance = chapter.id === "useful_elements" ? usefulGuidance : undefined;
  const candidate = chapter.id === "family" && familyReading?.ageAdapted ? familyReading
    : chapter.id === "relationships" && relationshipReading?.lifeAdapted ? relationshipReading : undefined;
  const adapted = candidate && candidate.origin !== "personal" && candidate.sourceSubjects.includes(`chapter-${chapter.id}`) ? candidate : undefined;
  const original = <>
    <p className="deep-reading-verdict">{visible(chapter.verdict)}</p>
    {chapter.paragraphs.map((paragraph, index) => <p key={index}>{visible(paragraph)}</p>)}
    <div className="deep-reading-points-grid"><Points title="可以发挥的部分" items={chapter.strengths} /><Points title="容易遇到的阻力" items={chapter.cautions} /></div>
    <Points title="落到生活里的做法" items={chapter.suggestions} />
  </>;
  return <article className="deep-reading-chapter" aria-label={chapter.title}>
    <p className="deep-reading-kicker">{visible(chapter.title)}</p>
    <ContextualReadingScope baseSubjectId={`chapter-${chapter.id}`} projectedContext={adapted?.contextProjection}>
    <PersonalReadingScope subjectId={`chapter-${chapter.id}`}>
    <h3>{visible(adapted?.title ?? chapter.headline)}</h3>
    {adapted ? <>
      {adapted.answer?.split(/\n\n+/u).filter(Boolean).map((paragraph, index) => <p key={index}>{visible(paragraph)}</p>)}
      <details className="deep-reading-explanation"><summary>{chapter.id === "relationships" ? "查看星宫与相处的原判断" : "家庭原判断（未按年龄转写）"} <ChevronDown size={16} aria-hidden="true" /></summary>
        <h4>{visible(chapter.headline)}</h4>{original}
      </details>
      <details className="deep-reading-explanation"><summary>这段解读的适用范围 <ChevronDown size={16} aria-hidden="true" /></summary>
        <ul>{adapted.conditions.map((condition, index) => <li key={index}>{visible(condition)}</li>)}</ul>
      </details>
    </> : guidance ? <>
      <Points title="取用先后与分工" items={chapter.strengths} />
      <details className="deep-reading-explanation">
        <summary>展开取用判断过程与条件 <ChevronDown size={16} aria-hidden="true" /></summary>
        <p className="deep-reading-verdict">{visible(chapter.verdict)}</p>
        {guidance.paragraphs.map((paragraph, index) => <p key={index}>{visible(paragraph)}</p>)}
        <Points title="容易遇到的阻力" items={chapter.cautions} />
      </details>
      <UsefulStemRoles guidance={guidance} />
      <Points title="落到生活里的做法" items={chapter.suggestions} />
    </> : original}
    <details className="deep-reading-evidence"><summary>这一章的命盘依据与出处 <ChevronDown size={16} aria-hidden="true" /></summary>
      <ul>{chapter.evidence.map((item, index) => <li key={index}>{visible(item)}</li>)}</ul>
      {references.map((source) => <div className="deep-reading-source" key={source.id}>
        <strong>{visible(source.title)}</strong><p>{visible(source.locator)}</p>
        {source.excerpt ? <blockquote>{visible(source.excerpt)}</blockquote> : null}
        <p>{visible(source.interpretation)}</p>
        {publicSourceUrl(source.url) ? <a href={publicSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">查看原文</a> : null}
        {source.provenance && publicSourceUrl(source.provenance.licenseUrl) ? source.provenance.kind === "facsimile_page"
          ? <p>影印大字原文：国图藏本{source.provenance.facsimile ? <> · PDF 第 {source.provenance.facsimile.pdfPageOneBased} 页（书内{visible(source.provenance.facsimile.printedPage)}）</> : null} · <a href={publicSourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">影印来源与权利说明</a></p>
          : <p>原文转录：维基文库贡献者 · <a href={publicSourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>
          : null}
      </div>)}
    </details>
    </PersonalReadingScope>
    </ContextualReadingScope>
  </article>;
}

export function ComprehensiveReadingPanel({ reading, sources, familyReading, relationshipReading }: { reading: BaziComprehensiveReading; sources: PreliminarySource[]; familyReading?: ReadingSynthesisSection; relationshipReading?: ReadingSynthesisSection }) {
  const id = useId();
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("overview");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = GROUPS.find((item) => item.id === group)!;
  const chapters = reading.chapters.filter((chapter) => (selected.chapters as readonly string[]).includes(chapter.id));
  const chapterSources = [...new Map([...sources, ...(reading.sources ?? [])].map((source) => [source.id, source])).values()];
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % GROUPS.length
      : event.key === "ArrowLeft" ? (index + GROUPS.length - 1) % GROUPS.length
        : event.key === "Home" ? 0 : event.key === "End" ? GROUPS.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setGroup(GROUPS[next]!.id); refs.current[next]?.focus();
  }
  return <section className="deep-reading" aria-label="完整命局解读">
    <div className="deep-reading-intro"><p>{visible(reading.summary)}</p><span>从命局结构到生活主题 · {reading.chapters.length} 个解读章节</span></div>
    <div className="deep-reading-tabs" role="tablist" aria-label="完整解读主题">{GROUPS.map((item, index) => <button key={item.id} id={`${id}-${item.id}`} ref={(node) => { refs.current[index] = node; }}
      type="button" role="tab" aria-selected={group === item.id} aria-controls={`${id}-panel`} tabIndex={group === item.id ? 0 : -1}
      onClick={() => setGroup(item.id)} onKeyDown={(event) => move(event, index)}>{item.label}</button>)}</div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${group}`} tabIndex={0}>
      {chapters.map((chapter) => <Chapter key={chapter.id} chapter={chapter} sources={chapterSources} usefulGuidance={reading.usefulGuidance} familyReading={familyReading} relationshipReading={relationshipReading} />)}
    </div>
  </section>;
}
