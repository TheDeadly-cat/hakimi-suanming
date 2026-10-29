import { ArrowLeft, BookOpenText, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { caseRepository } from "@hakimi/storage";
import { filterLearningEntries, LEARNING_ENTRIES, LEARNING_GROUPS, readLearningReportLocator, type LearningGroup } from "../lib/reading-learning";
import { AppLink } from "../lib/router";
import "./reading-learning-home.css";

type ReturnState = { status: "none" | "checking" | "unavailable" } | { status: "ready"; href: string };

export function ReadingLearningHome() {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<LearningGroup | "all">("all");
  const [returnState, setReturnState] = useState<ReturnState>({ status: "checking" });
  useEffect(() => {
    let current = true;
    const locator = readLearningReportLocator();
    if (locator.status !== "candidate") { setReturnState(locator); return; }
    void caseRepository.getCase(locator.caseId).then(bundle => {
      if (!current) return;
      const revision = bundle?.revisions.find(item => item.id === locator.revisionId && item.caseId === locator.caseId);
      const available = bundle?.caseRecord.id === locator.caseId && bundle.caseRecord.deletedAt === null && revision
        && revision.manifest.resultHash === locator.resultHash && revision.manifest.ruleProfileDigest === locator.ruleProfileDigest;
      setReturnState(available ? { status: "ready", href: locator.href } : { status: "unavailable" });
    }).catch(() => { if (current) setReturnState({ status: "unavailable" }); });
    return () => { current = false; };
  }, []);
  const entries = filterLearningEntries(query, group);
  const searched = Boolean(query.trim());
  return <section className="page reading-learning-home" aria-label="初学者学习">
    <header className="reading-learning-heading">
      <p className="reading-learning-eyebrow">学习 · 从一个词开始</p>
      <h1>读懂报告里的词</h1>
      <p>这里的 {LEARNING_ENTRIES.length} 个词条与报告中的就地说明相同。先看释义，再用一个短例子理解读法。</p>
      <nav className="reading-learning-actions" aria-label="学习页面去向">
        {returnState.status === "ready" ? <AppLink className="reading-learning-return" href={returnState.href}><ArrowLeft aria-hidden="true" />返回刚才报告</AppLink>
          : returnState.status === "checking" ? <span role="status">正在确认返回位置…</span>
            : <AppLink href="/reports">{returnState.status === "unavailable" ? "到档案重新选择报告" : "到档案看报告"}</AppLink>}
        <AppLink href="/knowledge?view=library"><BookOpenText aria-hidden="true" />资料管理与导入</AppLink>
      </nav>
      {returnState.status === "unavailable" ? <p className="reading-learning-return-note" role="status">刚才的报告已不可用，或本机暂时无法核对。词条仍可继续阅读。</p> : null}
    </header>
    <div className="reading-learning-search">
      <label htmlFor={searchId}>搜索术语</label>
      <div><Search aria-hidden="true" /><input id={searchId} ref={searchRef} type="search" value={query} maxLength={80} placeholder="例如：偏弱、财、流年"
        onChange={event => setQuery(event.target.value)} aria-describedby={`${searchId}-help`} />
        {query ? <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="清除搜索"><X aria-hidden="true" /></button> : null}</div>
      <p id={`${searchId}-help`}>可搜索词名、释义或例子；无需先导入资料。</p>
    </div>
    <div className="reading-learning-filters" role="group" aria-label="按主题浏览词条">
      <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")}>全部 {LEARNING_ENTRIES.length}</button>
      {LEARNING_GROUPS.map(item => <button type="button" key={item.id} aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.label}</button>)}
    </div>
    <p className="reading-learning-count" role="status" aria-atomic="true">{searched ? `找到 ${entries.length} 个相关词条` : `共 ${entries.length} 个词条，点开查看释义和例子。`}</p>
    {entries.length ? <div className="reading-learning-entries">{entries.map(entry => <details key={entry.id} data-learning-term={entry.id} open={searched || undefined}>
      <summary><span>{entry.term}</span><small>{LEARNING_GROUPS.find(item => item.id === entry.group)?.label}</small></summary>
      <div className="reading-learning-definition"><p>{entry.explanation}</p><p className="reading-learning-example"><strong>阅读例子</strong>{entry.example}</p></div>
    </details>)}</div> : <div className="reading-learning-empty"><h2>没有找到这个词</h2><p>可换一个短词，或查看全部现有词条。</p>
      <button type="button" onClick={() => { setQuery(""); setGroup("all"); searchRef.current?.focus(); }}>查看全部词条</button></div>}
    <p className="reading-learning-boundary">例子帮助理解术语，不是在断言你的经历。本盘是否采用、为何采用，仍以报告中这条结论的条件与依据为准。</p>
  </section>;
}
