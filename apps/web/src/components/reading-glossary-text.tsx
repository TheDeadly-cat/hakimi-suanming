import { useId, useRef, useState } from "react";
import { READING_GLOSSARY, readingGlossaryEntriesInText, type ReadingGlossaryEntry } from "../lib/reading-plain-summary";

const orderedTerms = [...READING_GLOSSARY].sort((a, b) => b.term.length - a.term.length);
const termPattern = new RegExp(`(${orderedTerms.map(item => item.term).join("|")})`, "gu");
const byTerm = new Map(READING_GLOSSARY.map(item => [item.term, item]));

/** Inline disclosure keeps the surrounding topic/year/branch mounted. */
export function ReadingGlossaryText({ text, className = "" }: { text: string; className?: string }) {
  const panelId = useId();
  const [opened, setOpened] = useState<ReadingGlossaryEntry | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => { setOpened(null); trigger.current?.focus(); };
  return <div className="reading-glossary" onKeyDown={event => {
    if (event.key === "Escape" && opened) { event.preventDefault(); close(); }
  }}>
    <p className={className}>{text.split(termPattern).map((part, i) => {
      const entry = byTerm.get(part);
      return entry ? <button key={i} className="reading-glossary-term" type="button" aria-label={`解释${entry.term}`}
        aria-expanded={opened?.id === entry.id} aria-controls={panelId} onClick={event => {
          trigger.current = event.currentTarget; setOpened(opened?.id === entry.id ? null : entry);
        }}>{part}</button> : part;
    })}</p>
    {opened ? <aside id={panelId} className="reading-glossary-note" aria-label={`${opened.term}的说明`}>
      <strong>{opened.term}是什么意思</strong><p>{opened.explanation}</p>
      <p className="reading-explanation-limit">这是术语解释；本盘是否采用及为何采用，仍以这条结论的依据为准。</p>
      <button type="button" onClick={close}>收起说明，继续阅读</button>
    </aside> : null}
  </div>;
}

export function ReadingGlossaryHelp({ text }: { text: string }) {
  const terms = readingGlossaryEntriesInText(text);
  return terms.length ? <details className="reading-summary-conditions"><summary>解释这条里的术语</summary>
    <ReadingGlossaryText text={terms.map(entry => entry.term).join(" · ")} />
  </details> : null;
}
