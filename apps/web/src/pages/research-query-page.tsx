import {
  BookOpenText,
  BookmarkPlus,
  CalendarClock,
  Copy,
  Database,
  FileDown,
  FileSearch,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  NotebookPen,
  Save,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeResearchQueryText,
  type MigrationRequiredSavedViewRecord,
  type ReadySavedViewRecord,
  type ResearchQuery,
  type SavedViewRecord,
} from "@hakimi/contracts";
import type {
  ResearchCaseResult,
  ResearchMatchedRevision,
  ResearchQueryExecution,
  ResearchQueryProgress,
  ResearchQueryResult,
  ResearchQuerySnapshot,
} from "@hakimi/research-query";
import { PageHeading } from "../components/page-heading";
import { ResearchQueryForm } from "../components/research-query-form";
import { StatusPill } from "../components/status-pill";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { formatDateTime, shortHash } from "../lib/format";
import { buildKnowledgeSearch } from "../lib/knowledge-route";
import {
  createResearchSavedView,
  downloadResearchQueryExecution,
  executeWebResearchQuery,
  getResearchSavedView,
  listResearchSavedViews,
  resolveResearchSavedViewMigration,
  ruleProfileOptionsFromSnapshot,
  updateResearchSavedView,
} from "../lib/research-query-adapter";
import {
  defaultResearchQuery,
  researchQueryFromFormState,
  researchQueryToFormState,
  type ResearchQueryFormState,
  type ResearchRuleProfileOption,
} from "../lib/research-query-form";
import { buildResearchQuerySearch, parseResearchQueryRoute, type ResearchQueryRouteState } from "../lib/research-query-route";
import { createResearchQueryDraft, readResearchQueryDraft } from "../lib/research-query-session";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import { buildChartSearch } from "../lib/transit-route";

const scopeLabels: Record<ResearchQuery["scope"], string> = {
  cases: "正式命盘",
  candidate_sets: "候选组",
  events: "真实事件",
  knowledge: "知识资料",
};

const reasonLabels: Record<string, string> = {
  "text:subject.alias": "记录别名",
  "text:subject.tags": "记录标签",
  "text:subject.notes": "记录说明",
  "text:note.body": "研究笔记正文",
  "text:note.tags": "研究笔记标签",
  "text:note.sources": "研究笔记来源",
  "text:event.title": "事件标题",
  "text:event.body": "事件正文",
  "text:event.tags": "事件标签文本",
  "text:event.sources": "事件来源",
  "text:knowledge.title": "资料标题",
  "text:knowledge.author": "资料作者",
  "text:knowledge.edition": "资料版本",
  "text:knowledge.source_note": "资料来源说明",
  "text:knowledge.file_name": "资料文件名",
  "text:knowledge.content": "资料正文",
  "event:tags": "事件标签",
  "event:feedback": "事件反馈",
  "event:binding": "事件绑定",
  "event:same_record_clause": "同一事件组合",
  "chart:day_master": "日主",
  "chart:month_branch": "月令",
  "chart:rule_profile_digest": "规则配置快照",
  "chart:pillar_relation": "确定性干支关系",
  "transit:active_node": "指定瞬时点运限",
  "knowledge:record_type": "资料类型",
};

function progressLabel(progress: ResearchQueryProgress | null): string {
  if (!progress) return "正在准备本地数据快照";
  const phase = progress.phase === "verify" ? "正在验真本地数据" : progress.phase === "filter" ? "正在执行组合筛选" : "正在固定结果摘要";
  return `${phase} · ${progress.completed} / ${progress.total}`;
}

function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

function exactEventHref(snapshot: ResearchQuerySnapshot, eventId: string): string | null {
  const event = snapshot.events.find((record) => record.id === eventId);
  if (!event?.revisionId) return null;
  const ref = event.transitNodeRef?.namespace === "hakimi-transit-node" ? event.transitNodeRef : null;
  return `/cases/${event.caseId}/revisions/${event.revisionId}${buildChartSearch(
    "research",
    ref ? {
      atInstant: ref.startInstant,
      selection: { nodeType: ref.nodeType, nodeId: ref.nodeId },
      manualDirection: ref.manualDirection,
    } : undefined,
    { eventId },
  )}`;
}

function caseRevisionHref(result: ResearchCaseResult, revisionId: string): string {
  return `/cases/${result.caseId}/revisions/${revisionId}`;
}

type RevisionCalculationSource = NonNullable<ResearchMatchedRevision["calculationSource"]>;
type RevisionCalculationComponentKey = keyof RevisionCalculationSource["componentStatuses"];

const calculationComponentLabels: Record<RevisionCalculationComponentKey, string> = {
  relations: "四柱关系",
  luckCycle: "起运",
  transit: "Transit",
};

const calculationStatusLabels = {
  projected: "已生成",
  unavailable: "不可计算",
  not_requested: "未请求",
  matched: "精确复演一致",
  mismatch: "精确复演有差异",
  exact_executor_unavailable: "精确执行器未保留",
  not_applicable: "不适用",
} as const;

function calculationSourceLabel(source: RevisionCalculationSource): string {
  return source.source === "stored_receipt"
    ? "已保存计算收据"
    : "当前版本即时投影";
}

function CalculationSourceMarker({ source }: { source: RevisionCalculationSource }) {
  const label = calculationSourceLabel(source);
  const comparisonIsWarning = source.comparisonStatus === "mismatch"
    || source.comparisonStatus === "exact_executor_unavailable";
  return (
    <section
      className={`research-calculation-source is-${source.source}${comparisonIsWarning ? " has-warning" : ""}`}
      aria-label={`计算来源：${label}`}
    >
      <div className="research-calculation-source-heading">
        <span><Database aria-hidden="true" /><strong>计算来源：{label}</strong><code>{source.source}</code></span>
        <small>{source.source === "stored_receipt"
          ? source.comparisonStatus === "matched"
            ? "本地收据内容与源 Revision 已校验，且列明执行器精确复演一致；不等于专家金标。"
            : "结果保留自已校验来源绑定的本地收据；复演状态另列，绝不回退为当前算法结果。"
          : "本次按冻结 Revision 与列明执行器生成；未读取匹配历史输出，也没有因此写入新收据。"}</small>
      </div>
      <details>
        <summary>查看来源与逐组件状态</summary>
        <dl>
          <div><dt>收据账本</dt><dd>{source.ledgerStatus === "available" ? "当前发布代可用" : "当前发布代不支持"}</dd></div>
          <div><dt>捕获类型</dt><dd><code>{source.captureKind}</code></dd></div>
          <div><dt>复演结论</dt><dd>{calculationStatusLabels[source.comparisonStatus]}</dd></div>
          <div><dt>历史输出已比较</dt><dd>{source.storedHistoricalOutputCompared ? "是" : "否"}</dd></div>
          <div><dt>投影方案</dt><dd><code>{source.profileId}</code></dd></div>
          <div><dt>请求指纹</dt><dd><code>{source.requestFingerprint}</code></dd></div>
          <div><dt>投影摘要</dt><dd><code>{source.projectionDigest}</code></dd></div>
          {source.receipt ? <>
            <div><dt>收据 ID</dt><dd><code>{source.receipt.id}</code></dd></div>
            <div><dt>收据摘要</dt><dd><code>{source.receipt.receiptDigest}</code></dd></div>
            <div><dt>保存时间</dt><dd>{formatDateTime(source.receipt.createdAt)}</dd></div>
          </> : null}
        </dl>
        <ul aria-label="逐组件计算来源状态">
          {(Object.keys(calculationComponentLabels) as RevisionCalculationComponentKey[]).map((key) => {
            const component = source.componentStatuses[key];
            return (
              <li key={key}>
                <strong>{calculationComponentLabels[key]}</strong>
                <span>{calculationStatusLabels[component.projectionStatus]}</span>
                <small>{calculationStatusLabels[component.comparisonStatus]}</small>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}

function calculationSourceCounts(execution: ResearchQueryExecution) {
  const sources = execution.results.flatMap((result) => result.scope === "cases"
    ? result.revisions.flatMap((revision) => revision.calculationSource ? [revision.calculationSource] : [])
    : []);
  return {
    total: sources.length,
    stored: sources.filter((source) => source.source === "stored_receipt").length,
    explicit: sources.filter((source) => source.source === "explicit_projection").length,
    schemaUnavailable: sources.filter((source) => source.ledgerStatus === "schema_unavailable").length,
  };
}

function ResultProvenance({ result, query, snapshot }: {
  result: ResearchQueryResult;
  query: ResearchQuery;
  snapshot: ResearchQuerySnapshot;
}) {
  if (result.scope === "cases") {
    return (
      <div className="research-result-revisions" aria-label="确切命中修订">
        {result.revisions.map((revision) => (
          <section key={revision.revisionId}>
            <div>
              <strong>R{revision.revisionNumber}</strong>
              <span>日主 {revision.dayMaster} · 月令 {revision.monthBranch}</span>
              <small>规则 {shortHash(revision.ruleProfileDigest)} · 结果 {shortHash(revision.resultHash)}</small>
            </div>
            <div className="research-result-actions">
              <AppLink className="text-link" href={caseRevisionHref(result, revision.revisionId)}>打开确切修订</AppLink>
              <AppLink className="text-link" href={`/compare?item=revision:${result.caseId}:${revision.revisionId}${query.scope === "cases" && query.transit ? `&at=${encodeURIComponent(query.transit.atInstant)}` : ""}`}><GitCompareArrows aria-hidden="true" />加入对照</AppLink>
            </div>
            {revision.transitMatches.length ? (
              <ul className="research-transit-matches">
                {revision.transitMatches.map((match) => {
                  const href = `/cases/${result.caseId}/revisions/${revision.revisionId}${buildChartSearch("transit", {
                    atInstant: query.scope === "cases" && query.transit ? query.transit.atInstant : match.startInstant,
                    selection: { nodeType: match.nodeType, nodeId: match.nodeId },
                    manualDirection: query.scope === "cases" && query.transit ? query.transit.manualDirection : null,
                  })}`;
                  return <li key={`${match.revisionId}:${match.nodeId}`}><AppLink href={href}><CalendarClock aria-hidden="true" /><span>{match.nodeType} · {match.ganZhi} · {match.stemTenGod}</span><small>{match.startInstant}</small></AppLink></li>;
                })}
              </ul>
            ) : null}
            {revision.calculationSource ? <CalculationSourceMarker source={revision.calculationSource} /> : null}
          </section>
        ))}
      </div>
    );
  }
  if (result.scope === "candidate_sets") {
    return <div className="research-result-primary-action"><AppLink className="secondary-action" href={`/candidate-sets/${result.candidateSetId}`}><Layers3 aria-hidden="true" />打开确切候选组</AppLink><code title={result.snapshotDigest}>快照 {shortHash(result.snapshotDigest)}</code></div>;
  }
  if (result.scope === "events") {
    const href = exactEventHref(snapshot, result.eventId);
    return <div className="research-result-primary-action">{href ? <AppLink className="secondary-action" href={href}><NotebookPen aria-hidden="true" />打开确切事件</AppLink> : <span className="research-result-unavailable">仅案例事件没有确切 Revision，不会改用最新修订。</span>}<code>事件 {result.eventId}</code></div>;
  }
  return <div className="research-result-primary-action"><AppLink className="secondary-action" href={`/knowledge${buildKnowledgeSearch({ documentId: result.documentId })}`}><BookOpenText aria-hidden="true" />打开确切资料</AppLink><code>资料 {result.documentId}</code></div>;
}

function ResearchResultCard({
  result,
  query,
  snapshot,
  selected,
  focusHref,
  register,
}: {
  result: ResearchQueryResult;
  query: ResearchQuery;
  snapshot: ResearchQuerySnapshot;
  selected: boolean;
  focusHref: string;
  register: (node: HTMLElement | null) => void;
}) {
  const eventLinks = result.matchingEventIds.map((eventId) => ({ eventId, href: exactEventHref(snapshot, eventId) }));
  return (
    <article
      ref={register}
      className={`research-result-card${selected ? " is-selected" : ""}`}
      tabIndex={selected ? -1 : undefined}
      aria-current={selected ? "location" : undefined}
      aria-label={`研究结果 ${result.title}`}
    >
      <header>
        <div>
          <div className="research-result-title-line"><StatusPill tone={result.scope === "candidate_sets" ? "warning" : result.scope === "events" ? "info" : "jade"}>{scopeLabels[result.scope]}</StatusPill><h3>{result.title}</h3></div>
          <small>{formatDateTime(result.updatedAt)} · 相关度 {result.relevanceScore}</small>
        </div>
        <AppLink className="text-link research-result-focus-link" href={focusHref} navigationOptions={{ scroll: false }}>固定此结果</AppLink>
      </header>

      <div className="research-match-reasons" aria-label="命中理由">
        {result.matchReasons.map((reason) => <span key={reason}>{reasonLabels[reason] ?? reason}</span>)}
      </div>

      <ResultProvenance result={result} query={query} snapshot={snapshot} />

      {result.matchingNoteIds.length || eventLinks.length ? (
        <div className="research-result-evidence">
          {result.matchingNoteIds.length ? <p><strong>匹配笔记 {result.matchingNoteIds.length} 条</strong><span>{result.matchingNoteIds.map((noteId) => <code key={noteId}>{noteId.slice(0, 8)}</code>)}</span></p> : null}
          {eventLinks.length ? <p><strong>匹配事件 {eventLinks.length} 条</strong><span>{eventLinks.map(({ eventId, href }) => href ? <AppLink key={eventId} href={href}>{eventId.slice(0, 8)}</AppLink> : <code key={eventId} title="仅案例事件没有确切 Revision">{eventId.slice(0, 8)}</code>)}</span></p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function ResearchQueryPage() {
  const location = useAppLocation();
  const [formState, setFormState] = useState<ResearchQueryFormState>(() => researchQueryToFormState(defaultResearchQuery("cases")));
  const [appliedQuery, setAppliedQuery] = useState<ResearchQuery | null>(null);
  const [execution, setExecution] = useState<ResearchQueryExecution | null>(null);
  const [snapshot, setSnapshot] = useState<ResearchQuerySnapshot | null>(null);
  const [ruleProfiles, setRuleProfiles] = useState<ResearchRuleProfileOption[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [activeView, setActiveView] = useState<ReadySavedViewRecord | null>(null);
  const [migrationReview, setMigrationReview] = useState<MigrationRequiredSavedViewRecord | null>(null);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const [migrationName, setMigrationName] = useState("");
  const [viewName, setViewName] = useState("");
  const [queryBusy, setQueryBusy] = useState(false);
  const [viewBusy, setViewBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [progress, setProgress] = useState<ResearchQueryProgress | null>(null);
  const [routeIssue, setRouteIssue] = useState<string | null>(null);
  const [formIssue, setFormIssue] = useState<string | null>(null);
  const [operationIssue, setOperationIssue] = useState<string | null>(null);
  const [deepLinkIssue, setDeepLinkIssue] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<"summary" | string | null>(null);
  const resultSummaryRef = useRef<HTMLElement>(null);
  const migrationReviewRef = useRef<HTMLElement>(null);
  const resultCardRefs = useRef(new Map<string, HTMLElement>());
  const abortRef = useRef<AbortController | null>(null);
  const focusOnNextRouteRef = useRef(false);
  const pendingRouteMessageRef = useRef<string | null>(null);

  const parsedRoute = useMemo(() => parseResearchQueryRoute(location.search), [location.search]);
  const routeState = parsedRoute.state;

  const refreshSavedViews = useCallback(async () => {
    try {
      setSavedViews(await listResearchSavedViews());
    } catch (reason) {
      setOperationIssue(errorMessage(reason, "无法读取保存视图。"));
    }
  }, []);

  useEffect(() => { void refreshSavedViews(); }, [refreshSavedViews]);

  const runQuery = useCallback(async (query: ResearchQuery, resultKey: string | null, focusSummary: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setQueryBusy(true);
    setProgress(null);
    setMessage(null);
    setExecution(null);
    setSnapshot(null);
    setDeepLinkIssue(null);
    try {
      const next = await executeWebResearchQuery(query, {
        signal: controller.signal,
        onProgress: (value) => { if (!controller.signal.aborted) setProgress(value); },
      });
      if (controller.signal.aborted) return;
      setAppliedQuery(next.execution.query);
      setExecution(next.execution);
      setSnapshot(next.snapshot);
      setRuleProfiles(ruleProfileOptionsFromSnapshot(next.snapshot));
      if (resultKey) {
        if (next.execution.results.some((result) => result.key === resultKey)) setPendingFocus(resultKey);
        else setDeepLinkIssue(`结果引用 ${resultKey} 不属于当前查询结果；不会定位到近似记录。`);
      } else if (focusSummary) {
        setPendingFocus("summary");
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      setOperationIssue(errorMessage(reason, "研究查询执行失败。"));
      setAppliedQuery(query);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setQueryBusy(false);
        setProgress(null);
      }
    }
  }, []);

  const cancelQuery = useCallback(() => {
    const controller = abortRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    abortRef.current = null;
    setQueryBusy(false);
    setProgress(null);
    setOperationIssue(null);
    setMessage("已取消本次研究查询；没有保存结果或改写视图。");
  }, []);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const routeMessage = pendingRouteMessageRef.current;
      pendingRouteMessageRef.current = null;
      abortRef.current?.abort();
      setQueryBusy(false);
      setProgress(null);
      setRouteIssue(null);
      setOperationIssue(null);
      setFormIssue(null);
      setMessage(null);
      setExecution(null);
      setSnapshot(null);
      setAppliedQuery(null);
      setActiveView(null);
      setMigrationReview(null);
      setMigrationConfirmed(false);
      if (parsedRoute.issue || !parsedRoute.state) {
        setRouteIssue(parsedRoute.issue ?? "研究检索链接无法解析；未执行任何回退。");
        return;
      }

      let query: ResearchQuery;
      let sourceView: ReadySavedViewRecord | null = null;
      if (parsedRoute.state.source === "default") {
        query = defaultResearchQuery("cases");
        setViewName("");
      } else if (parsedRoute.state.source === "draft") {
        const stored = readResearchQueryDraft(parsedRoute.state.referenceId!);
        if (stored.issue || !stored.draft) {
          setRouteIssue(stored.issue ?? "研究检索草稿无法读取；未执行任何回退。");
          return;
        }
        query = stored.draft.query;
        if (stored.draft.sourceViewId) {
          const linked = await getResearchSavedView(stored.draft.sourceViewId);
          if (!active) return;
          if (linked?.state === "ready") sourceView = linked;
          else setOperationIssue("草稿来源视图已缺失或等待迁移；草稿仍按自身严格契约执行，但不能更新原视图。");
        }
      } else {
        const view = await getResearchSavedView(parsedRoute.state.referenceId!);
        if (!active) return;
        if (!view) {
          setRouteIssue("保存视图引用不存在；未执行任何回退。");
          return;
        }
        if (view.state === "migration_required") {
          setMigrationReview(view);
          setMigrationName(view.name);
          setFormState(researchQueryToFormState(defaultResearchQuery("cases")));
          setRouteIssue(`保存视图“${view.name}”来自旧版任意过滤器，必须人工审核迁移后才能执行；未解释任何旧条件。`);
          return;
        }
        sourceView = view;
        query = view.query;
      }
      if (!active) return;
      setActiveView(sourceView);
      setViewName(sourceView?.name ?? "");
      setFormState(researchQueryToFormState(query));
      const shouldFocus = focusOnNextRouteRef.current;
      focusOnNextRouteRef.current = false;
      await runQuery(query, parsedRoute.state.resultKey, shouldFocus);
      if (active && routeMessage) setMessage(routeMessage);
    };
    void hydrate().catch((reason) => {
      if (!active) return;
      setQueryBusy(false);
      setRouteIssue(errorMessage(reason, "研究检索引用读取失败；未执行任何回退。"));
    });
    return () => { active = false; abortRef.current?.abort(); };
  }, [parsedRoute, runQuery]);

  useEffect(() => {
    if (!pendingFocus || queryBusy) return;
    let frame: number | null = null;
    let inertObserver: MutationObserver | null = null;
    const focusTarget = () => {
      const target = pendingFocus === "summary" ? resultSummaryRef.current : resultCardRefs.current.get(pendingFocus);
      if (!target) return;
      const inertAncestor = target.closest("[inert]");
      if (inertAncestor) {
        inertObserver = new MutationObserver(() => {
          if (target.closest("[inert]")) return;
          inertObserver?.disconnect();
          inertObserver = null;
          frame = window.requestAnimationFrame(focusTarget);
        });
        inertObserver.observe(inertAncestor, { attributes: true, attributeFilter: ["inert"] });
        return;
      }
      target?.focus({ preventScroll: true });
      if (document.activeElement !== target) return;
      target.scrollIntoView?.({ block: "center", behavior: "smooth" });
      setPendingFocus(null);
    };
    frame = window.requestAnimationFrame(focusTarget);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      inertObserver?.disconnect();
    };
  }, [pendingFocus, queryBusy, execution]);

  const routeForResult = (resultKey: string): string => {
    const base: ResearchQueryRouteState = routeState ?? { source: "default", referenceId: null, resultKey: null };
    return `/cases/research${buildResearchQuerySearch({ ...base, resultKey })}`;
  };

  const applyForm = () => {
    setFormIssue(null);
    setOperationIssue(null);
    setMessage(null);
    const parsed = researchQueryFromFormState(formState);
    if (parsed.issue || !parsed.query) {
      setFormIssue(parsed.issue ?? "查询条件没有通过严格契约。");
      return;
    }
    focusOnNextRouteRef.current = true;
    if (parsed.query.scope === "cases" && JSON.stringify(parsed.query) === JSON.stringify(defaultResearchQuery("cases"))) {
      setFormState(researchQueryToFormState(parsed.query));
      if (!location.search) {
        void runQuery(parsed.query, null, true);
        return;
      }
      navigate("/cases/research");
      return;
    }
    try {
      const draft = createResearchQueryDraft(parsed.query, activeView?.id ?? null);
      navigate(`/cases/research${buildResearchQuerySearch({ source: "draft", referenceId: draft.id, resultKey: null })}`);
    } catch (reason) {
      setFormIssue(errorMessage(reason, "无法在当前会话保存研究查询草稿。"));
    }
  };

  const resetForm = () => {
    setFormState(researchQueryToFormState(defaultResearchQuery(formState.scope)));
    setFormIssue(null);
    setMessage("已恢复此范围的默认条件；点击“应用筛选”后才会执行。");
  };

  const beginMigrationReview = (view: MigrationRequiredSavedViewRecord) => {
    setMigrationReview(view);
    setMigrationConfirmed(false);
    setMigrationName(view.name);
    setOperationIssue(null);
    setMessage("已进入人工审核；旧关键词、filters 与 sort 仅作为无语义原文展示，尚未复制或执行。 ");
    window.requestAnimationFrame(() => migrationReviewRef.current?.focus({ preventScroll: true }));
  };

  const copyLegacyKeyword = () => {
    if (!migrationReview) return;
    const normalized = normalizeResearchQueryText(migrationReview.legacyRecord.query);
    setFormState((current) => ({ ...current, text: normalized }));
    setMigrationConfirmed(false);
    setMessage("仅旧关键词已由你明确复制并规范化到当前表单；旧 filters 与 sort 仍未解释。请继续逐项审核。 ");
  };

  const confirmMigration = async () => {
    if (!migrationReview || !migrationConfirmed) return;
    setFormIssue(null);
    setOperationIssue(null);
    const parsed = researchQueryFromFormState(formState);
    if (parsed.issue || !parsed.query) {
      setFormIssue(parsed.issue ?? "迁移目标条件没有通过严格查询契约。");
      return;
    }
    setViewBusy(true);
    try {
      const saved = await resolveResearchSavedViewMigration(
        migrationReview,
        parsed.query,
        migrationName.trim() || migrationReview.name,
      );
      await refreshSavedViews();
      setMigrationReview(null);
      setMigrationConfirmed(false);
      pendingRouteMessageRef.current = `已按你确认的当前表单条件迁移视图“${saved.name}”。旧 filters 与 sort 未被自动解释。`;
      focusOnNextRouteRef.current = true;
      navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: saved.id, resultKey: null })}`, { replace: routeState?.source === "view" && routeState.referenceId === saved.id });
    } catch (reason) {
      setOperationIssue(errorMessage(reason, "保存视图迁移失败；旧视图仍保持不可执行。"));
      const latest = await getResearchSavedView(migrationReview.id).catch(() => null);
      if (latest?.state === "migration_required") setMigrationReview(latest);
      await refreshSavedViews();
    } finally {
      setViewBusy(false);
    }
  };

  const defaultViewName = appliedQuery ? `${scopeLabels[appliedQuery.scope]} · ${appliedQuery.text || "默认条件"}` : "研究查询";

  const saveView = async (mode: "new" | "update" | "copy") => {
    if (!appliedQuery) return;
    setViewBusy(true);
    setOperationIssue(null);
    setMessage(null);
    try {
      let saved: ReadySavedViewRecord;
      if (mode === "update") {
        if (!activeView) throw new Error("当前查询没有可更新的保存视图。");
        saved = await updateResearchSavedView(activeView, appliedQuery, viewName.trim() || activeView.name);
      } else {
        const explicitName = viewName.trim();
        const sourceName = activeView?.name || defaultViewName;
        const proposed = mode === "copy"
          ? explicitName && explicitName !== sourceName ? explicitName : `${sourceName} 副本`
          : explicitName || defaultViewName;
        saved = await createResearchSavedView(proposed.slice(0, 80), appliedQuery);
      }
      await refreshSavedViews();
      setActiveView(saved);
      setViewName(saved.name);
      pendingRouteMessageRef.current = mode === "update" ? `已更新保存视图“${saved.name}”。` : mode === "copy" ? `已另存副本“${saved.name}”。` : `已保存视图“${saved.name}”。`;
      focusOnNextRouteRef.current = true;
      navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: saved.id, resultKey: null })}`, { replace: mode === "update" });
    } catch (reason) {
      setOperationIssue(errorMessage(reason, "无法保存研究视图。"));
      if (mode === "update" && activeView) {
        const latest = await getResearchSavedView(activeView.id).catch(() => null);
        if (latest?.state === "ready") {
          setActiveView(latest);
          setViewName(latest.name);
        } else {
          setActiveView(null);
        }
        await refreshSavedViews();
      }
    } finally {
      setViewBusy(false);
    }
  };

  const exportExecution = async () => {
    if (!execution) return;
    setExportBusy(true);
    setOperationIssue(null);
    setMessage(null);
    try {
      const delivery = resolveFileDelivery(
        await downloadResearchQueryExecution(execution),
        "研究查询快照导出"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      setMessage(delivery.kind === "cancelled"
        ? delivery.message
        : `${delivery.message} 文件是经过摘要复算的查询快照。`);
    } catch (reason) {
      setOperationIssue(errorMessage(reason, "查询快照未通过导出校验。"));
    } finally {
      setExportBusy(false);
    }
  };

  const ruleProfileOptions = useMemo(() => {
    const options = new Map(ruleProfiles.map((profile) => [profile.digest, profile]));
    for (const digest of formState.ruleProfileDigests) {
      if (!options.has(digest)) options.set(digest, { digest, label: "当前查询中的历史规则", version: "未在本地 Revision 中找到" });
    }
    return [...options.values()];
  }, [formState.ruleProfileDigests, ruleProfiles]);

  const relevantDataCount = snapshot
    ? appliedQuery?.scope === "cases" ? snapshot.cases.length
      : appliedQuery?.scope === "candidate_sets" ? snapshot.candidateSets.length
        : appliedQuery?.scope === "events" ? snapshot.events.length
          : snapshot.knowledgeDocuments.length
    : 0;
  const sourceCounts = execution ? calculationSourceCounts(execution) : null;
  const derivedCalculationRequested = appliedQuery?.scope === "cases"
    && (appliedQuery.relationTypes.length > 0 || appliedQuery.transit !== null);

  return (
    <div className="page page--research-query">
      <PageHeading
        eyebrow="Research query"
        title="专业研究检索"
        description="用严格、版本化的 ResearchQuery 组合检索正式命盘、候选组、事件与知识资料。查询在本地执行；地址栏只保存随机引用，不写入关键词、事件正文或完整条件。"
        actions={<AppLink href="/cases" className="secondary-action"><Database aria-hidden="true" />返回案例库</AppLink>}
      />

      {routeIssue ? <div className="error-panel research-query-route-error" role="alert" tabIndex={-1}><strong>无法恢复研究查询</strong><p>{routeIssue}</p><button type="button" className="secondary-action" onClick={() => navigate("/cases/research")}>由我明确打开默认查询</button></div> : null}

      <section className="research-saved-workspace" aria-labelledby="research-saved-title">
        <header><div><h2 id="research-saved-title">保存的研究查询</h2><p>保存、恢复、更新或另存副本；旧版任意 filters 只提示迁移，绝不自动解释。</p></div><StatusPill tone="info">本地 IndexedDB</StatusPill></header>
        <div className="research-saved-list">
          {savedViews.map((view) => view.state === "ready" ? (
            <button key={view.id} type="button" className={activeView?.id === view.id ? "is-active" : ""} aria-pressed={activeView?.id === view.id} onClick={() => { focusOnNextRouteRef.current = true; navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: view.id, resultKey: null })}`); }}>
              <span><strong>{view.name}</strong><small>{scopeLabels[view.query.scope]} · v{view.query.version} · 编辑 {view.editVersion}</small></span>
            </button>
          ) : (
            <div className="migration-required" key={view.id} role="note"><span><strong>{view.name}</strong><small>旧版视图 · 待人工审核迁移</small></span><StatusPill tone="warning">不可执行</StatusPill><button type="button" className="text-link" onClick={() => beginMigrationReview(view)}>开始审核</button></div>
          ))}
          {!savedViews.length ? <p>还没有专业研究查询视图。</p> : null}
        </div>
        <div className="research-saved-actions">
          <label className="field"><span>视图名称</span><input value={viewName} maxLength={80} onChange={(event) => setViewName(event.target.value)} placeholder={defaultViewName} /></label>
          <div>
            <button type="button" className="secondary-action" disabled={!appliedQuery || viewBusy} onClick={() => void saveView("new")}><BookmarkPlus aria-hidden="true" />保存当前查询</button>
            {activeView ? <button type="button" className="secondary-action" disabled={!appliedQuery || viewBusy} onClick={() => void saveView("update")}><Save aria-hidden="true" />更新当前视图</button> : null}
            {activeView ? <button type="button" className="secondary-action" disabled={!appliedQuery || viewBusy} onClick={() => void saveView("copy")}><Copy aria-hidden="true" />另存副本</button> : null}
          </div>
        </div>
      </section>

      {migrationReview ? (
        <section ref={migrationReviewRef} className="research-migration-review" tabIndex={-1} aria-labelledby="migration-review-title">
          <header><div><p className="eyebrow">Explicit migration review</p><h2 id="migration-review-title">审核旧视图“{migrationReview.name}”</h2></div><StatusPill tone="warning">尚不可执行</StatusPill></header>
          <p className="research-migration-boundary" role="alert">以下 query、filters、sort 是旧版原文，没有既定 ResearchQuery 语义。系统不会据此选择范围、生命周期或任何命理条件，也不会自动执行。</p>
          <div className="research-legacy-record">
            <section><h3>旧 query 原文</h3><pre>{migrationReview.legacyRecord.query || "（空）"}</pre></section>
            <section><h3>旧 filters 原文</h3><pre>{JSON.stringify(migrationReview.legacyRecord.filters, null, 2)}</pre></section>
            <section><h3>旧 sort 原文</h3><pre>{JSON.stringify(migrationReview.legacyRecord.sort, null, 2)}</pre></section>
          </div>
          <div className="research-migration-actions">
            <label className="field"><span>迁移后的视图名称</span><input value={migrationName} maxLength={80} onChange={(event) => setMigrationName(event.target.value)} /></label>
            <button type="button" className="secondary-action" onClick={copyLegacyKeyword}>仅复制旧关键词到草稿</button>
            <label className="research-migration-confirm"><input type="checkbox" checked={migrationConfirmed} onChange={(event) => setMigrationConfirmed(event.target.checked)} /><span>我已在下方表单逐项选择新的 scope、生命周期与条件，并确认不解释旧 filters / sort。</span></label>
            <button type="button" className="primary-action" disabled={!migrationConfirmed || viewBusy} onClick={() => void confirmMigration()}>{viewBusy ? "正在迁移" : "确认迁移为当前表单条件"}</button>
          </div>
        </section>
      ) : null}

      {message ? <p className="success-message" role="status" aria-atomic="true">{message}</p> : null}
      {operationIssue ? <div className="inline-error" role="alert"><strong>研究工作台未接受本次操作</strong><p>{operationIssue}</p></div> : null}

      {!routeIssue || migrationReview ? <ResearchQueryForm state={formState} setState={(next) => { setMigrationConfirmed(false); setFormState(next); }} availableRuleProfiles={ruleProfileOptions} busy={queryBusy} onSubmit={applyForm} onReset={resetForm} /> : null}
      {formIssue ? <div className="inline-error" role="alert"><strong>查询条件没有通过严格契约</strong><p>{formIssue}</p></div> : null}

      {queryBusy ? <div className="research-query-loading" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><span>{progressLabel(progress)}</span><button type="button" className="secondary-action" onClick={cancelQuery}>取消查询</button></div> : null}
      {deepLinkIssue ? <div className="inline-error" role="alert"><strong>无法定位精确结果</strong><p>{deepLinkIssue}</p></div> : null}

      {execution && snapshot && appliedQuery ? (
        <>
          <section ref={resultSummaryRef} className="research-result-summary" tabIndex={-1} aria-labelledby="research-results-title">
            <div><p className="eyebrow">Deterministic result set</p><h2 id="research-results-title">{scopeLabels[appliedQuery.scope]} · {execution.total} 条结果</h2><p role="status" aria-live="polite" aria-atomic="true">已按 ResearchQuery v{appliedQuery.version} 完成结构、摘要复算与稳定排序。</p>{derivedCalculationRequested && sourceCounts ? <p className="research-calculation-source-summary"><strong>下游计算来源</strong>{sourceCounts.total > 0 ? <>已保存收据 {sourceCounts.stored} · 当前即时投影 {sourceCounts.explicit}{sourceCounts.schemaUnavailable ? ` · 其中 ${sourceCounts.schemaUnavailable} 条所在发布代无收据账本` : ""}</> : <>没有可展示的命中来源；不可计算或未通过所需组件复演的记录已排除，并列入边界说明。</>}</p> : null}{appliedQuery.scope === "cases" && appliedQuery.transit ? <p className="research-domain-evidence-boundary">运限条件仍是工程计算：当前专家验证案例为 0，本次命中不代表运限命理真值已经确认。</p> : null}</div>
            <dl><div><dt>查询摘要</dt><dd><code>{shortHash(execution.queryDigest)}</code></dd></div><div><dt>数据世代</dt><dd><code>{shortHash(execution.dataEpoch)}</code></dd></div><div><dt>结果摘要</dt><dd><code>{shortHash(execution.resultDigest)}</code></dd></div></dl>
          </section>

          <aside className="research-query-export-warning" aria-label="查询快照导出说明">
            <div><strong>导出文件含可识别的本地研究线索</strong><p>文件包含检索词、标签、别名、事件命中及精确本地 ID，请仅保存到可信位置。只会导出当前已执行并通过摘要复算的结果，不会导出尚未应用的草稿。</p></div>
            <button type="button" className="secondary-action" disabled={exportBusy} onClick={() => void exportExecution()}><FileDown aria-hidden="true" />{exportBusy ? "正在校验" : "导出查询快照"}</button>
          </aside>

          {execution.diagnostics.length ? <details className="research-query-diagnostics"><summary><ShieldCheck aria-hidden="true" />查看 {execution.diagnostics.length} 条边界说明</summary><ul>{execution.diagnostics.map((diagnostic) => <li key={`${diagnostic.kind}:${diagnostic.code}:${diagnostic.subjectId}:${diagnostic.revisionId}`}><StatusPill tone={diagnostic.kind === "warning" ? "warning" : "info"}>{diagnostic.kind}</StatusPill><span>{diagnostic.message}</span></li>)}</ul></details> : null}

          {execution.results.length ? (
            <div className="research-result-list">
              {execution.results.map((result) => <ResearchResultCard key={result.key} result={result} query={appliedQuery} snapshot={snapshot} selected={routeState?.resultKey === result.key} focusHref={routeForResult(result.key)} register={(node) => { if (node) resultCardRefs.current.set(result.key, node); else resultCardRefs.current.delete(result.key); }} />)}
            </div>
          ) : relevantDataCount === 0 ? (
            <div className="research-query-empty"><FileSearch aria-hidden="true" /><h2>这个范围还没有本地资料</h2><p>先建立正式命盘、候选组、事件或导入知识资料，再执行研究查询。</p><div className="button-row"><AppLink href="/new" className="primary-action">新建排盘</AppLink><AppLink href="/cases" className="secondary-action">打开案例库与 CSV 导入</AppLink></div></div>
          ) : (
            <div className="research-query-empty"><SearchX aria-hidden="true" /><h2>没有记录同时满足全部条件</h2><p>条件仍完整保留。可回到筛选区放宽一个条件，或恢复此范围默认条件后再次应用。</p><button type="button" className="secondary-action" onClick={() => { resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>放宽条件</button></div>
          )}
        </>
      ) : null}
    </div>
  );
}
