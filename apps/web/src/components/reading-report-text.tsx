import { createElement, memo, useId, useMemo, useRef, type ReactNode } from "react";
import "./reading-report-text.css";

type ReportBlock = { kind: "prose" | "literal"; text: string };
type ReportSection = { title: string | null; level: number; blocks: ReportBlock[] };
const chapterTitles = new Set(["一、整盘主线", "二、命局九章详读", "三、人生阶段与交运变化", "四、已读年份与具体生活事项",
  "五、十二节令月与年度衔接", "六、其余已采用的个人修订", "适用条件注释", "原文与来源", "主报告", "年份、月份与可能发生的事", "已采用的个人修订原文", "完整详细阅读（按需展开）"]);
const foldedChapters = new Set(["适用条件注释", "原文与来源", "已采用的个人修订原文", "完整详细阅读（按需展开）"]);
function parseSections(text: string): ReportSection[] {
  const sections: ReportSection[] = [{ title: null, level: 2, blocks: [] }];
  let prose = "", literal = "", fence: string | null = null;
  const flush = () => { if (prose) sections.at(-1)!.blocks.push({ kind: "prose", text: prose }); prose = ""; };
  for (const match of text.matchAll(/[^\n]*(?:\n|$)/gu)) {
    if (!match[0]) continue;
    const line = match[0], content = line.replace(/\r?\n$/u, "");
    if (fence !== null) {
      if (content === fence) {
        sections.at(-1)!.blocks.push({ kind: "literal", text: literal.endsWith("\n") ? literal.slice(0, -1) : literal });
        fence = null; literal = "";
      } else literal += line;
      continue;
    }
    const opening = /^(`{3,})text$/u.exec(content);
    if (opening) { flush(); fence = opening[1]!; continue; }
    const heading = /^(#{1,6}) (.*)$/u.exec(content);
    if (heading) { flush(); sections.push({ title: heading[2]!, level: Math.min(6, heading[1]!.length + 1), blocks: [] }); }
    else prose += line;
  }
  if (fence !== null) sections.at(-1)!.blocks.push({ kind: "literal", text: `${fence}text\n${literal}` });
  flush(); return sections;
}

/** Headings, lists and local condition anchors; HTML, scripts and external links stay literal. */
export const ReadingReportText = memo(function ReadingReportText({ text }: { text: string }) {
  const prefix = useId();
  const readerRef = useRef<HTMLElement>(null);
  const sections = useMemo(() => parseSections(text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ")), [text]);
  const chapters = useMemo(() => sections.flatMap((section, index) => section.level === 3 && section.title !== null && chapterTitles.has(section.title)
    ? [{ title: section.title, index }] : []), [sections]);
  const noteAnchors = useMemo(() => {
    const anchors = new Map<string, number>();
    let start = -1;
    for (let index = sections.length - 1; index >= 0; index--) {
      const section = sections[index]!;
      if (section.level >= 3 && section.title === "适用条件注释"
        && section.blocks[0]?.kind === "prose" && section.blocks[0].text.trimStart().startsWith("以下条件均保留原文，同一句只记录一次")) { start = index; break; }
    }
    if (start < 0) return anchors;
    const noteChapterLevel = sections[start]!.level;
    for (let index = start + 1; index < sections.length; index++) {
      const section = sections[index]!;
      if (section.level <= noteChapterLevel && section.title !== null) break;
      const note = section.level === noteChapterLevel + 1 && /^注([1-9]\d*)$/u.exec(section.title ?? "");
      if (note && !anchors.has(`reading-condition-${note[1]}`)) anchors.set(`reading-condition-${note[1]}`, index);
    }
    return anchors;
  }, [sections]);
  const sectionIds = useMemo(() => new Map([
    ...chapters.map(({ index }) => [index, `${prefix}-chapter-${index}`] as const),
    ...[...noteAnchors].map(([anchor, index]) => [index, `${prefix}-${anchor}`] as const)
  ]), [chapters, noteAnchors, prefix]);
  const focusSection = (id: string) => {
    const target = document.getElementById(id), reader = readerRef.current;
    if (!target || !reader || !reader.contains(target)) return;
    let ancestor = target.parentElement;
    while (ancestor && ancestor !== reader) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
    const top = Math.max(0, reader.scrollTop + target.getBoundingClientRect().top
      - reader.getBoundingClientRect().top - reader.clientTop - 16);
    if (typeof reader.scrollTo === "function") reader.scrollTo({ top });
    else reader.scrollTop = top;
    target.focus({ preventScroll: true });
  };
  const inline = (value: string): ReactNode[] => {
    const parts: ReactNode[] = []; let offset = 0;
    const emphasis = (text: string, start: number): ReactNode[] => {
      const result: ReactNode[] = []; let position = 0;
      for (const match of text.matchAll(/\*\*([^*\r\n]+)\*\*/gu)) {
        result.push(text.slice(position, match.index), <strong key={`strong-${start + match.index}`}>{match[1]}</strong>);
        position = match.index + match[0].length;
      }
      result.push(text.slice(position)); return result;
    };
    for (const match of value.matchAll(/\[([^\]\r\n]+)\]\(#(reading-condition-[1-9]\d*)\)/gu)) {
      const anchor = match[2]!;
      if (!noteAnchors.has(anchor)) continue;
      parts.push(...emphasis(value.slice(offset, match.index), offset));
      const id = `${prefix}-${anchor}`;
      parts.push(<a key={match.index} href={`#${id}`} onClick={event => {
        event.preventDefault(); focusSection(id);
      }}>{match[1]}</a>);
      offset = match.index + match[0].length;
    }
    parts.push(...emphasis(value.slice(offset), offset)); return parts;
  };
  const body = (value: string): ReactNode[] => {
    const blocks: { kind: "p" | "ul" | "ol"; lines: string[] }[] = [];
    for (const line of value.split(/\r?\n/u)) {
      if (!line.trim()) { if (blocks.at(-1)?.lines.length) blocks.push({ kind: "p", lines: [] }); continue; }
      const item = /^(?:([-*]) |(\d+)\. )(.*)$/u.exec(line);
      const kind = item ? item[1] ? "ul" : "ol" : "p";
      if (blocks.at(-1)?.kind !== kind) blocks.push({ kind, lines: [] });
      blocks.at(-1)!.lines.push(item ? item[3]! : line);
    }
    return blocks.filter(block => block.lines.length).map((block, index) => {
      if (block.kind !== "p") return createElement(block.kind, { key: index }, block.lines.map((line, item) => <li key={item}>{inline(line)}</li>));
      const paragraph = block.lines.join("\n");
      const generated = /^本段适用条件：((?:\[注[1-9]\d*\]\(#reading-condition-[1-9]\d*\))(?:、\[注[1-9]\d*\]\(#reading-condition-[1-9]\d*\))*)（原文见文末条件注释）。$/u.exec(paragraph);
      const notes = generated ? [...generated[1]!.matchAll(/\[注([1-9]\d*)\]\(#(reading-condition-([1-9]\d*))\)/gu)] : [];
      if (notes.length && notes.every(note => note[1] === note[3] && noteAnchors.has(note[2]!))) return <details key={index} className="reading-report-conditions">
        <summary>本段适用条件（{notes.length}条注释）</summary><p>{inline(paragraph)}</p>
      </details>;
      return <p key={index}>{inline(paragraph)}</p>;
    });
  };
  const renderSection = (section: ReportSection, index: number) => <section key={index}>
    {section.title !== null ? createElement(`h${section.level}`, { id: sectionIds.get(index), tabIndex: -1 }, section.title) : null}
    {section.blocks.map((block, blockIndex) => block.kind === "literal"
      ? <pre key={blockIndex} className="reading-report-verbatim" aria-label="已采用个人原文">{block.text}</pre>
      : <div key={blockIndex} className="reading-report-text-body">{body(block.text)}</div>)}
  </section>;
  const rendered: ReactNode[] = [];
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index]!;
    if (section.level === 3 && section.title !== null && foldedChapters.has(section.title)) {
      let end = index + 1;
      while (end < sections.length && !(sections[end]!.title !== null && sections[end]!.level <= 3)) end++;
      rendered.push(<details className="reading-report-conditions" key={index}><summary>展开{section.title}</summary>{sections.slice(index, end).map((child, offset) => renderSection(child, index + offset))}</details>);
      index = end - 1;
    } else rendered.push(renderSection(section, index));
  }
  return <div className="reading-report-view">
    {chapters.length ? <nav className="reading-report-navigation" aria-label="通读报告章节">
      {chapters.map(chapter => <a key={chapter.index} href={`#${sectionIds.get(chapter.index)}`} onClick={event => {
        event.preventDefault(); focusSection(sectionIds.get(chapter.index)!);
      }}>{chapter.title}</a>)}
    </nav> : null}
    <article ref={readerRef} className="reading-report-text" aria-label="已保存的通读报告" tabIndex={0}>
    {rendered}
  </article></div>;
});
