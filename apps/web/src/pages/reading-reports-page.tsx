import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search } from "lucide-react";
import type { CaseRecord, ResearchNoteRecord } from "@hakimi/contracts";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { PageHeading } from "../components/page-heading";
import { ReadingSavedRecord } from "../components/reading-saved-record";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { AppLink, useAppLocation } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./reading-reports-page.css";

type ReportGroup = { chart: CaseRecord; reports: ResearchNoteRecord[]; error: string | null };

export function ReadingReportsPage() {
  const location = useAppLocation();
  const requestedCase = new URLSearchParams(location.search).get("case");
  const requestedReport = new URLSearchParams(location.search).get("report");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ groups: ReportGroup[]; loading: boolean; error: string | null }>({ groups: [], loading: true, error: null });
  useEffect(() => {
    let current = true;
    setState({ groups: [], loading: true, error: null });
    void (async () => {
      const cases = await caseRepository.listCases({ lifecycle: "active" });
      const selected = requestedCase ? cases.filter((chart) => chart.id === requestedCase) : cases;
      if (requestedCase && !selected.length) throw new Error("这张命盘暂未找到或已移入回收站，请从我的命盘重新打开。");
      const groups: ReportGroup[] = [];
      // Bound concurrent reads; decode large saved reports only after the user opens one.
      for (let start = 0; start < selected.length; start += 4) {
        const batch = await Promise.all(selected.slice(start, start + 4).map(async (chart): Promise<ReportGroup> => {
          try {
            const records = await researchRepository.listResearchNotesByCase(chart.id);
            return { chart, error: null, reports: records.filter((record) => record.caseId === chart.id
              && record.lifecycle === "active" && record.anchor.kind === "revision" && record.tags.includes(LOCAL_READING_SNAPSHOT_TAG))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)) };
          } catch (reason) {
            return { chart, reports: [], error: safeVisibleErrorMessage(reason, "这张命盘的报告暂未读到，请重试。") };
          }
        }));
        if (!current) return;
        groups.push(...batch);
      }
      groups.sort((a, b) => (b.reports[0]?.createdAt ?? "").localeCompare(a.reports[0]?.createdAt ?? "") || b.chart.updatedAt.localeCompare(a.chart.updatedAt));
      if (current) setState({ groups, loading: false, error: null });
    })().catch((reason) => {
      if (current) setState({ groups: [], loading: false, error: safeVisibleErrorMessage(reason, "报告列表暂未读到，请重试。") });
    });
    return () => { current = false; };
  }, [requestedCase, retry]);
  const groups = useMemo(() => state.groups.filter((group) => !query.trim()
    || group.chart.alias.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [state.groups, query]);
  const total = state.groups.reduce((sum, group) => sum + group.reports.length, 0);
  return <div className="page page--reading-reports">
    <PageHeading eyebrow="保存在本机" title="我的报告" description="按命盘找到完整报告或范围报告。这里保留保存时的文字与实际范围，可以随时阅读或下载。"
      actions={<><AppLink className="secondary-action" href="/cases">我的命盘</AppLink><AppLink className="primary-action" href="/new">新建排盘</AppLink></>} />
    <div className="report-library-tools">
      <label className="field"><span>查找命盘</span><span className="report-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入名字或昵称" /></span></label>
      <button className="secondary-action" type="button" disabled={state.loading} onClick={() => setRetry((value) => value + 1)}><RefreshCw aria-hidden="true" />重新读取</button>
      {requestedCase ? <AppLink href="/reports" className="text-link">查看全部报告</AppLink> : null}
    </div>
    {state.loading ? <p role="status">正在读取本机报告…</p> : state.error ? <p className="inline-error" role="alert">{state.error}</p> : <>
      <p className="report-library-note">共 {total} 份报告 · 仅保存在当前浏览器；下载报告可另存一份。</p>
      {requestedReport && !state.groups.some((group) => group.reports.some((record) => record.id === requestedReport)) ? <p role="alert">指定的报告未在当前列表中找到，请核对命盘和保存时间。</p> : null}
      {!state.groups.length ? <section className="report-library-empty"><h2>还没有命盘</h2><p>先填写出生资料。在解读页保存当前阅读范围或完整报告后，就能从这里找回。</p><AppLink href="/new" className="primary-action">排我的命盘<ArrowRight aria-hidden="true" /></AppLink></section> : null}
      {state.groups.length && !groups.length ? <p role="status">没有找到这个名字，请换一个关键词。</p> : null}
      {groups.map(({ chart, reports, error }) => <section key={chart.id} className="report-library-group" aria-label={`${chart.alias}的报告`}>
        <header><div><h2>{safeVisibleText(chart.alias, "我的命盘", 80)}</h2><p>{reports.length} 份已保存报告</p></div>
          {chart.latestRevisionId ? <AppLink className="text-link" href={`/cases/${encodeURIComponent(chart.id)}/revisions/${encodeURIComponent(chart.latestRevisionId)}`}>查看当前解读<ArrowRight aria-hidden="true" /></AppLink> : null}</header>
        {error ? <p role="alert">{error}</p> : reports.length ? <>
          {reports.slice(0, 3).map((record) => <ReadingSavedRecord key={`${record.id}:${requestedReport ?? ""}`} record={record} defaultOpen={record.id === requestedReport} reportLabel={`${chart.alias} · 阅读报告`} />)}
          {reports.length > 3 ? <details className="report-library-older" open={reports.slice(3).some((record) => record.id === requestedReport)}><summary>查看更早的 {reports.length - 3} 份报告</summary>
            {reports.slice(3).map((record) => <ReadingSavedRecord key={`${record.id}:${requestedReport ?? ""}`} record={record} defaultOpen={record.id === requestedReport} reportLabel={`${chart.alias} · 阅读报告`} />)}
          </details> : null}
        </>
          : <p>这张命盘还没有保存报告。打开当前解读后，可以保存所选范围或完整报告。</p>}
      </section>)}
    </>}
  </div>;
}
