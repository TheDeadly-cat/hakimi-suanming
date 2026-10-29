import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { CaseBundle, ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { PageHeading } from "../components/page-heading";
import { ReadingSavedRecord } from "../components/reading-saved-record";
import { CASE_PROFILE_ROUTE } from "../lib/app-route-patterns";
import { formatDateTime } from "../lib/format";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./person-profile-page.css";

type ProfileState = {
  caseId: string;
  status: "loading" | "ready" | "missing" | "trashed" | "error";
  bundle: CaseBundle | null;
  records: ResearchNoteRecord[];
  reports: ResearchNoteRecord[];
  reportsError: string | null;
  error: string | null;
};

function emptyState(caseId: string, status: ProfileState["status"] = "loading"): ProfileState {
  return { caseId, status, bundle: null, records: [], reports: [], reportsError: null, error: null };
}

function checkBundle(bundle: CaseBundle, caseId: string): void {
  if (bundle.caseRecord.id !== caseId || !Array.isArray(bundle.revisions)
    || bundle.revisions.length === 0
    || bundle.revisions.length !== bundle.caseRecord.revisionCount
    || bundle.revisions.some(revision => revision.caseId !== caseId)
    || new Set(bundle.revisions.map(revision => revision.id)).size !== bundle.revisions.length
    || !bundle.revisions.some(revision => revision.id === bundle.caseRecord.latestRevisionId)) {
    throw new Error("档案与修订的归属不一致，暂未显示。请到全部资料管理核对。");
  }
}

function revisionHref(caseId: string, revisionId: string): string {
  return `/cases/${encodeURIComponent(caseId)}/revisions/${encodeURIComponent(revisionId)}`;
}

function birthCaption(revision: RevisionRecord): string {
  const input = revision.input;
  const calendar = input.calendarType === "lunar" ? `农历${input.lunarLeapMonth ? "闰月" : ""}` : "公历";
  const time = input.timePrecision === "unknown_hour" || input.time === null ? "时辰未确定" : input.time;
  return `${calendar} ${input.date} · ${time}`;
}

export function PersonProfilePage({ caseId }: { caseId: string }) {
  const [retry, setRetry] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [revisionLimit, setRevisionLimit] = useState(20);
  const [state, setState] = useState<ProfileState>(() => emptyState(caseId));
  useEffect(() => {
    let current = true;
    setState(emptyState(caseId));
    setHistoryOpen(false);
    setHistoryLimit(20);
    setRevisionLimit(20);
    if (!CASE_PROFILE_ROUTE.test(`/cases/${caseId}`)) {
      setState({ ...emptyState(caseId, "error"), error: "档案地址无效，请从档案列表重新打开。" });
      return;
    }
    void (async () => {
      const [loaded, notes] = await Promise.allSettled([
        caseRepository.getCase(caseId), researchRepository.listResearchNotesByCase(caseId)
      ]);
      if (!current) return;
      if (loaded.status === "rejected") throw loaded.reason;
      const bundle = loaded.value;
      if (!bundle) { setState(emptyState(caseId, "missing")); return; }
      checkBundle(bundle, caseId);
      if (bundle.caseRecord.deletedAt !== null) { setState(emptyState(caseId, "trashed")); return; }
      const revisionIds = new Set(bundle.revisions.map(revision => revision.id));
      const records = notes.status === "fulfilled" ? notes.value.filter(record => record.caseId === caseId && record.lifecycle === "active") : [];
      const candidates = notes.status === "fulfilled" ? notes.value.filter(record => record.lifecycle === "active" && record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)) : [];
      const reports = candidates.filter(record => record.caseId === caseId && record.anchor.kind === "revision" && revisionIds.has(record.anchor.revisionId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
      const duplicateReports = new Set(reports.map(record => record.id)).size !== reports.length;
      const reportsError = notes.status === "rejected"
        ? safeVisibleErrorMessage(notes.reason, "已保存报告暂未读到，请重新读取。")
        : duplicateReports ? "报告列表出现重复记录，暂未显示，请重新读取。"
          : reports.length !== candidates.length ? "有报告与这份档案或修订不一致，已暂时隐藏；其余报告仍可查看。" : null;
      setState({ caseId, status: "ready", bundle, records, reports: duplicateReports ? [] : reports, reportsError, error: null });
    })().catch(reason => {
      if (current) setState({ ...emptyState(caseId, "error"), error: safeVisibleErrorMessage(reason, "个人档案暂未读到，请重新读取。") });
    });
    return () => { current = false; };
  }, [caseId, retry]);

  const active = state.caseId === caseId ? state : emptyState(caseId);
  const bundle = active.status === "ready" ? active.bundle : null;
  const latestRevision = bundle?.revisions.find(revision => revision.id === bundle.caseRecord.latestRevisionId);
  const revisions = bundle ? [...bundle.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber) : [];
  const alias = bundle ? safeVisibleText(bundle.caseRecord.alias, "我的命盘", 80) : "个人档案";
  const olderReports = active.reports.slice(1);
  return <div className="page page--person-profile">
    <PageHeading eyebrow="个人档案" title={bundle ? `${alias}的档案` : "个人档案"}
      description="查看资料、每次修订，以及当时保存的解读。"
      actions={<><AppLink href="/reports" className="secondary-action"><ArrowLeft aria-hidden="true" />返回档案列表</AppLink>
        <AppLink href="/cases" className="secondary-action">全部资料管理</AppLink>
        <button type="button" className="secondary-action" disabled={active.status === "loading"} onClick={() => setRetry(value => value + 1)}><RefreshCw aria-hidden="true" />重新读取</button></>} />
    {active.status === "loading" ? <p role="status">正在读取这份档案…</p> : null}
    {active.status === "missing" ? <p role="alert">这份档案不存在或已从当前浏览器删除，请到全部资料管理核对。</p> : null}
    {active.status === "trashed" ? <p role="alert">这份档案已移入回收站。请在全部资料管理的回收站恢复后再打开。<AppLink href="/cases" className="secondary-action">前往资料管理</AppLink></p> : null}
    {active.error ? <p role="alert" className="inline-error">{active.error}</p> : null}
    {bundle && latestRevision ? <>
      <section className="person-profile-section" aria-labelledby="person-profile-current">
        <header><div><p className="eyebrow">最近一次资料 · 第 {latestRevision.revisionNumber} 次修订</p><h2 id="person-profile-current">当前资料与阅读</h2></div>
          <AppLink className="primary-action" href={revisionHref(caseId, latestRevision.id)}>继续当前阅读<ArrowRight aria-hidden="true" /></AppLink></header>
        <p className="person-profile-help">按当前资料打开解读；已保存报告中的原文保留在下方。</p>
        <dl className="person-profile-facts">
          <div><dt>出生记录</dt><dd>{birthCaption(latestRevision)}</dd></div>
          <div><dt>采用时区</dt><dd>{safeVisibleText(latestRevision.input.timeZone, "未记录", 120)}</dd></div>
          <div><dt>城市记录</dt><dd>{safeVisibleText(latestRevision.input.location.label, "未填写", 160)}</dd></div>
          <div><dt>资料更新时间</dt><dd>{formatDateTime(bundle.caseRecord.updatedAt)}</dd></div>
        </dl>
        {bundle.caseRecord.tags.length ? <p className="person-profile-tags">标签：{bundle.caseRecord.tags.map(tag => safeVisibleText(tag, "", 80)).join("、")}</p> : null}
        {bundle.caseRecord.notes ? <details><summary>档案备注</summary><p className="person-profile-notes">{safeVisibleText(bundle.caseRecord.notes, "", 20_000)}</p></details> : null}
      </section>
      <section className="person-profile-section" aria-labelledby="person-profile-saved">
        <header><div><p className="eyebrow">保存时的内容</p><h2 id="person-profile-saved">已保存的报告</h2></div><span>{active.reports.length} 份可查看</span></header>
        <p className="person-profile-help">打开保存时原文，保留当时的文字、范围和依据；不会用当前阅读覆盖旧报告。</p>
        {active.reportsError ? <p role="alert" className="inline-error">{active.reportsError}</p> : null}
        {active.reports[0] ? <ReadingSavedRecord key={active.reports[0].id} record={active.reports[0]} relatedRecords={active.records} reportLabel="打开保存时原文 · 最新报告" /> : !active.reportsError ? <p>还没有保存报告。继续当前阅读后，可保存需要的解读。</p> : null}
        {olderReports.length ? <details className="person-profile-history" open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}>
          <summary>更早的 {olderReports.length} 份保存报告</summary>
          {historyOpen ? <>{olderReports.slice(0, historyLimit).map(record => <ReadingSavedRecord key={record.id} record={record} relatedRecords={active.records} reportLabel="打开保存时原文 · 历史报告" />)}
            {olderReports.length > historyLimit ? <button type="button" className="secondary-action" onClick={() => setHistoryLimit(value => value + 20)}>再显示 {Math.min(20, olderReports.length - historyLimit)} 份报告</button> : null}</> : null}
        </details> : null}
      </section>
      <section className="person-profile-section" aria-labelledby="person-profile-revisions">
        <header><div><p className="eyebrow">资料变化</p><h2 id="person-profile-revisions">修订记录</h2></div><span>{revisions.length} 次修订</span></header>
        <p className="person-profile-help">查看某次资料的当前解读时，仍使用那次修订的出生记录。保存过的原文请在上方打开。</p>
        <ol className="person-profile-revisions">{revisions.slice(0, revisionLimit).map(revision => <li key={revision.id}>
          <div><h3>第 {revision.revisionNumber} 次修订{revision.id === latestRevision.id ? " · 当前资料" : ""}</h3><p>{birthCaption(revision)}</p><time dateTime={revision.createdAt}>{formatDateTime(revision.createdAt)}</time></div>
          <AppLink className="secondary-action" href={revisionHref(caseId, revision.id)}>按第 {revision.revisionNumber} 次资料阅读<ArrowRight aria-hidden="true" /></AppLink>
        </li>)}</ol>
        {revisions.length > revisionLimit ? <button type="button" className="secondary-action" onClick={() => setRevisionLimit(value => value + 20)}>继续查看更早的资料修订</button> : null}
      </section>
    </> : null}
  </div>;
}
