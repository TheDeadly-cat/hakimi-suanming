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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { webReportExportPort } from "@hakimi/platform";
import { PageHeading } from "../components/page-heading";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact,
} from "../components/prepared-file-delivery-dialog";
import { ResearchQueryForm } from "../components/research-query-form";
import { StatusPill } from "../components/status-pill";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { formatDateTime, shortHash as formatShortHash } from "../lib/format";
import { buildKnowledgeSearch } from "../lib/knowledge-route";
import {
  createResearchSavedView,
  executeWebResearchQuery,
  getResearchSavedView,
  listResearchSavedViews,
  prepareResearchQueryExecutionExport,
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
import { safeVisibleErrorMessage as errorMessage, safeVisibleText } from "../lib/visible-text";
import "./research-query-page.css";

const RESULT_BATCH_SIZE = 24;

function shortHash(value: unknown): string {
  return formatShortHash(safeVisibleText(value, "摘要不可用", 180));
}

type ResearchViewCommitIssue = {
  certainty: "call_unknown" | "returned_unreconciled";
  operationLabel: string;
  routeKey: string;
  viewId: string | null;
  viewName: string;
  message: string;
};

type ResearchWorkspaceSection = "saved" | "form" | "results";

function currentResearchRouteKey(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.pathname}${window.location.search}`;
}

function focusResearchRegion(target: HTMLElement | null): void {
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    block: "start",
    behavior: typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

const scopeLabels: Record<ResearchQuery["scope"], string> = {
  cases: "正式命盘",
  candidate_sets: "候选组",
  events: "事件记录",
  knowledge: "知识资料",
};

const emptyScopeCopy: Record<ResearchQuery["scope"], { title: string; description: string }> = {
  cases: {
    title: "还没有正式命盘",
    description: "先建立正式命盘，再按冻结 Revision、规则摘要与研究记录执行组合检索。",
  },
  candidate_sets: {
    title: "还没有候选组",
    description: "先从时间不确定的排盘流程保存候选组；研究查询不会把候选记录当成正式命盘。",
  },
  events: {
    title: "还没有事件记录",
    description: "先在案例的确切 Revision 下记录事件；没有 Revision 绑定的记录不会被近似替代。",
  },
  knowledge: {
    title: "还没有知识资料",
    description: "先在知识库导入或登记资料，并保留来源与版本信息，再执行全文检索。",
  },
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
  const phase = progress.phase === "verify" ? "正在核验本地数据结构" : progress.phase === "filter" ? "正在执行组合筛选" : "正在固定结果摘要";
  return `${phase} · ${progress.completed} / ${progress.total}`;
}

function researchQueriesEqual(left: ResearchQuery, right: ResearchQuery): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertResearchExecutionBinding(requestedQuery: ResearchQuery, execution: ResearchQueryExecution): void {
  if (!Number.isSafeInteger(execution.total) || execution.total < 0) {
    throw new Error("查询执行返回了无效结果总数，已拒绝展示结果。");
  }
  if (!researchQueriesEqual(requestedQuery, execution.query)) {
    throw new Error("查询执行返回了未请求的 ResearchQuery，已拒绝展示结果。");
  }
  if (execution.total !== execution.results.length) {
    throw new Error("查询执行声明的结果总数与实际结果不一致，已拒绝展示结果。");
  }
  if (execution.results.some((result) => result.scope !== requestedQuery.scope)) {
    throw new Error("查询执行返回了其他 scope 的记录，已拒绝展示结果。");
  }
  const evidenceTokens = [execution.queryDigest, execution.dataEpoch, execution.resultDigest];
  if (evidenceTokens.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    throw new Error("查询执行缺少查询摘要、数据世代或结果摘要，已拒绝展示结果。");
  }
  const resultKeys = execution.results.map((result) => result.key);
  if (resultKeys.some((key) => typeof key !== "string" || key.trim().length === 0)) {
    throw new Error("查询执行返回了空结果键，无法建立精确深链接，已拒绝展示结果。");
  }
  if (new Set(resultKeys).size !== execution.results.length) {
    throw new Error("查询执行返回了重复结果键，无法建立唯一深链接，已拒绝展示结果。");
  }
  if (execution.results.some((result) => !Number.isFinite(result.relevanceScore))) {
    throw new Error("查询执行返回了非有限检索匹配分，已拒绝展示结果。");
  }
}

function assertSavedViewIndexIntegrity(views: readonly SavedViewRecord[]): void {
  if (new Set(views.map((view) => view.id)).size !== views.length) {
    throw new Error("保存视图索引包含重复 ID，已拒绝建立可执行列表。");
  }
  const invalidIdentity = views.find((view) => !view.id.trim() || !view.name.trim());
  if (invalidIdentity) {
    throw new Error("保存视图索引包含空 ID 或空名称，已拒绝建立可执行列表。");
  }
  const invalidTimestamp = views.find((view) => !Number.isFinite(Date.parse(view.updatedAt)));
  if (invalidTimestamp) {
    throw new Error(`保存视图“${invalidTimestamp.name}”的更新时间无法解析。`);
  }
  const invalidReadyView = views.find((view) => view.state === "ready" && (
    !Number.isSafeInteger(view.editVersion) || view.editVersion < 1
  ));
  if (invalidReadyView) {
    throw new Error(`保存视图“${invalidReadyView.name}”包含无效编辑版本。`);
  }
}

function savedViewReadbackIssue(
  returned: ReadySavedViewRecord,
  refreshed: readonly SavedViewRecord[] | null,
): string | null {
  if (!refreshed) return "保存视图索引刷新没有返回可核对列表。";
  const persisted = refreshed.find((view) => view.id === returned.id);
  if (!persisted) return "刷新后的索引没有返回同一视图 ID。";
  if (persisted.state !== "ready") return "刷新后的同一视图仍处于迁移阻断状态。";
  if (
    persisted.name !== returned.name
    || persisted.editVersion !== returned.editVersion
    || !researchQueriesEqual(persisted.query, returned.query)
  ) {
    return "刷新后的同一视图名称、编辑版本或严格查询与写入返回值不一致。";
  }
  return null;
}

function exactEventHref(event: ResearchQuerySnapshot["events"][number]): string | null {
  if (!event.revisionId) return null;
  const ref = event.transitNodeRef?.namespace === "hakimi-transit-node" ? event.transitNodeRef : null;
  return `/cases/${encodeURIComponent(event.caseId)}/revisions/${encodeURIComponent(event.revisionId)}${buildChartSearch(
    "research",
    ref ? {
      atInstant: ref.startInstant,
      selection: { nodeType: ref.nodeType, nodeId: ref.nodeId },
      manualDirection: ref.manualDirection,
    } : undefined,
    { eventId: event.id },
  )}`;
}

function caseRevisionHref(result: ResearchCaseResult, revisionId: string): string {
  return `/cases/${encodeURIComponent(result.caseId)}/revisions/${encodeURIComponent(revisionId)}`;
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
        <span><Database aria-hidden="true" /><strong>计算来源：{label}</strong><code>{safeVisibleText(source.source, "来源未识别", 80)}</code></span>
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
          <div><dt>捕获类型</dt><dd><code>{safeVisibleText(source.captureKind, "未识别", 80)}</code></dd></div>
          <div><dt>复演结论</dt><dd>{calculationStatusLabels[source.comparisonStatus]}</dd></div>
          <div><dt>历史输出已比较</dt><dd>{source.storedHistoricalOutputCompared ? "是" : "否"}</dd></div>
          <div><dt>投影方案</dt><dd><code>{safeVisibleText(source.profileId, "未识别方案", 140)}</code></dd></div>
          <div><dt>请求指纹</dt><dd><code>{safeVisibleText(source.requestFingerprint, "指纹不可用", 180)}</code></dd></div>
          <div><dt>投影摘要</dt><dd><code>{safeVisibleText(source.projectionDigest, "摘要不可用", 180)}</code></dd></div>
          {source.receipt ? <>
            <div><dt>收据 ID</dt><dd><code>{safeVisibleText(source.receipt.id, "未知收据", 160)}</code></dd></div>
            <div><dt>收据摘要</dt><dd><code>{safeVisibleText(source.receipt.receiptDigest, "摘要不可用", 180)}</code></dd></div>
            <div><dt>保存时间</dt><dd>{safeVisibleText(formatDateTime(source.receipt.createdAt), "时间未识别", 80)}</dd></div>
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
  let total = 0;
  let stored = 0;
  let explicit = 0;
  let schemaUnavailable = 0;
  for (const result of execution.results) {
    if (result.scope !== "cases") continue;
    for (const revision of result.revisions) {
      const source = revision.calculationSource;
      if (!source) continue;
      total += 1;
      if (source.source === "stored_receipt") stored += 1;
      if (source.source === "explicit_projection") explicit += 1;
      if (source.ledgerStatus === "schema_unavailable") schemaUnavailable += 1;
    }
  }
  return { total, stored, explicit, schemaUnavailable };
}

function ResultProvenance({ result, query, eventHrefs }: {
  result: ResearchQueryResult;
  query: ResearchQuery;
  eventHrefs: ReadonlyMap<string, string | null>;
}) {
  if (result.scope === "cases") {
    return (
      <div className="research-result-revisions" aria-label="确切命中修订">
        {result.revisions.map((revision) => (
          <section key={revision.revisionId}>
            <div>
              <strong>R{revision.revisionNumber}</strong>
              <span>日主 {safeVisibleText(revision.dayMaster, "未识别", 20)} · 月令 {safeVisibleText(revision.monthBranch, "未识别", 20)}</span>
              <small>规则 {shortHash(revision.ruleProfileDigest)} · 结果 {shortHash(revision.resultHash)}</small>
            </div>
            <div className="research-result-actions">
              <AppLink className="text-link" href={caseRevisionHref(result, revision.revisionId)}>打开确切修订</AppLink>
              <AppLink className="text-link" href={`/compare?item=${encodeURIComponent(`revision:${result.caseId}:${revision.revisionId}`)}${query.scope === "cases" && query.transit ? `&at=${encodeURIComponent(query.transit.atInstant)}` : ""}`}><GitCompareArrows aria-hidden="true" />加入对照</AppLink>
            </div>
            {revision.transitMatches.length ? (
              <ul className="research-transit-matches">
                {revision.transitMatches.map((match) => {
                  const href = `/cases/${encodeURIComponent(result.caseId)}/revisions/${encodeURIComponent(revision.revisionId)}${buildChartSearch("transit", {
                    atInstant: query.scope === "cases" && query.transit ? query.transit.atInstant : match.startInstant,
                    selection: { nodeType: match.nodeType, nodeId: match.nodeId },
                    manualDirection: query.scope === "cases" && query.transit ? query.transit.manualDirection : null,
                  })}`;
                  return <li key={`${match.revisionId}:${match.nodeId}`}><AppLink href={href}><CalendarClock aria-hidden="true" /><span>{safeVisibleText(match.nodeType, "节点未识别", 60)} · {safeVisibleText(match.ganZhi, "未识别", 30)} · {safeVisibleText(match.stemTenGod, "未识别", 40)}</span><small>{safeVisibleText(match.startInstant, "时间未识别", 100)}</small></AppLink></li>;
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
    return <div className="research-result-primary-action"><AppLink className="secondary-action" href={`/candidate-sets/${encodeURIComponent(result.candidateSetId)}`}><Layers3 aria-hidden="true" />打开确切候选组</AppLink><code title={safeVisibleText(result.snapshotDigest, "摘要不可用", 180)}>快照 {shortHash(result.snapshotDigest)}</code></div>;
  }
  if (result.scope === "events") {
    const href = eventHrefs.get(result.eventId) ?? null;
    return <div className="research-result-primary-action">{href ? <AppLink className="secondary-action" href={href}><NotebookPen aria-hidden="true" />打开确切事件</AppLink> : <span className="research-result-unavailable">仅案例事件没有确切 Revision，不会改用最新修订。</span>}<code>事件 {safeVisibleText(result.eventId, "未知事件", 160)}</code></div>;
  }
  return <div className="research-result-primary-action"><AppLink className="secondary-action" href={`/knowledge${buildKnowledgeSearch({ documentId: result.documentId })}`}><BookOpenText aria-hidden="true" />打开确切资料</AppLink><code>资料 {safeVisibleText(result.documentId, "未知资料", 160)}</code></div>;
}

const ResearchResultCard = memo(function ResearchResultCard({
  result,
  query,
  eventHrefs,
  selected,
  focusHref,
  position,
  total,
  register,
}: {
  result: ResearchQueryResult;
  query: ResearchQuery;
  eventHrefs: ReadonlyMap<string, string | null>;
  selected: boolean;
  focusHref: string;
  position: number;
  total: number;
  register: (resultKey: string, node: HTMLElement | null) => void;
}) {
  const eventLinks = useMemo(
    () => result.matchingEventIds.map((eventId) => ({ eventId, href: eventHrefs.get(eventId) ?? null })),
    [eventHrefs, result.matchingEventIds],
  );
  return (
    <article
      ref={(node) => register(result.key, node)}
      className={`research-result-card${selected ? " is-selected" : ""}`}
      data-order-semantics="stable-query-order"
      tabIndex={selected ? -1 : undefined}
      aria-current={selected ? "location" : undefined}
      aria-label={`研究结果 ${position}/${total}：${safeVisibleText(result.title, "未命名结果", 180)}；序号为稳定检索顺序，不是概率排名`}
    >
      <header>
        <div>
          <div className="research-result-title-line"><span className="research-result-order" aria-hidden="true">{String(position).padStart(2, "0")}</span><StatusPill tone={result.scope === "candidate_sets" ? "warning" : "info"}>{scopeLabels[result.scope]}</StatusPill><h3>{safeVisibleText(result.title, "未命名结果", 180)}</h3></div>
          <small>{safeVisibleText(formatDateTime(result.updatedAt), "时间未识别", 80)} · 检索匹配分 {Number.isFinite(result.relevanceScore) ? result.relevanceScore : "不可用"} · 非命理置信度</small>
        </div>
        <AppLink className="text-link research-result-focus-link" href={focusHref} navigationOptions={{ scroll: false }}>固定此结果</AppLink>
      </header>

      <div className="research-match-reasons" aria-label="命中理由">
        {result.matchReasons.map((reason) => <span key={reason}>{reasonLabels[reason] ?? safeVisibleText(reason, "未识别命中条件", 120)}</span>)}
      </div>

      <ResultProvenance result={result} query={query} eventHrefs={eventHrefs} />

      {result.matchingNoteIds.length || eventLinks.length ? (
        <div className="research-result-evidence">
          {result.matchingNoteIds.length ? <p><strong>匹配笔记 {result.matchingNoteIds.length} 条</strong><span>{result.matchingNoteIds.map((noteId) => <code key={noteId}>{safeVisibleText(noteId, "未知笔记", 160).slice(0, 8)}</code>)}</span></p> : null}
          {eventLinks.length ? <p><strong>匹配事件 {eventLinks.length} 条</strong><span>{eventLinks.map(({ eventId, href }) => href ? <AppLink key={eventId} href={href}>{safeVisibleText(eventId, "未知事件", 160).slice(0, 8)}</AppLink> : <code key={eventId} title="仅案例事件没有确切 Revision">{safeVisibleText(eventId, "未知事件", 160).slice(0, 8)}</code>)}</span></p> : null}
        </div>
      ) : null}
    </article>
  );
});

function ResearchScopeEmptyState({ scope }: { scope: ResearchQuery["scope"] }) {
  const copy = emptyScopeCopy[scope];
  const canCreateFromChart = scope === "cases" || scope === "candidate_sets";
  const destination = scope === "knowledge" ? "/knowledge" : "/cases";
  const destinationLabel = scope === "knowledge" ? "打开知识库" : "打开案例库";
  return (
    <div className="research-query-empty">
      <FileSearch aria-hidden="true" />
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <div className="button-row">
        {canCreateFromChart ? <AppLink href="/new" className="primary-action">新建排盘</AppLink> : null}
        <AppLink href={destination} className={canCreateFromChart ? "secondary-action" : "primary-action"}>{destinationLabel}</AppLink>
      </div>
    </div>
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
  const [savedViewsLoading, setSavedViewsLoading] = useState(true);
  const [savedViewsIssue, setSavedViewsIssue] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ReadySavedViewRecord | null>(null);
  const [migrationReview, setMigrationReview] = useState<MigrationRequiredSavedViewRecord | null>(null);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const [migrationName, setMigrationName] = useState("");
  const [viewName, setViewName] = useState("");
  const [queryBusy, setQueryBusy] = useState(false);
  const [viewBusy, setViewBusy] = useState(false);
  const [viewCommitIssue, setViewCommitIssue] =
    useState<ResearchViewCommitIssue | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const [visibleResultCount, setVisibleResultCount] = useState(RESULT_BATCH_SIZE);
  const [progress, setProgress] = useState<ResearchQueryProgress | null>(null);
  const [routeIssue, setRouteIssue] = useState<string | null>(null);
  const [formIssue, setFormIssue] = useState<string | null>(null);
  const [operationIssue, setOperationIssue] = useState<string | null>(null);
  const [deepLinkIssue, setDeepLinkIssue] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<"summary" | string | null>(null);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<ResearchWorkspaceSection>("saved");
  const resultSummaryRef = useRef<HTMLElement>(null);
  const savedWorkspaceRef = useRef<HTMLElement>(null);
  const queryFormRegionRef = useRef<HTMLDivElement>(null);
  const migrationReviewRef = useRef<HTMLElement>(null);
  const resultCardRefs = useRef(new Map<string, HTMLElement>());
  const abortRef = useRef<AbortController | null>(null);
  const focusOnNextRouteRef = useRef(false);
  const pendingRouteMessageRef = useRef<string | null>(null);
  const formSubmitRef = useRef(false);
  const viewOperationRef = useRef(false);
  const committedViewRouteKeysRef = useRef<Set<string>>(new Set());
  const exportOperationRef = useRef(false);
  const exportRequestVersionRef = useRef(0);
  const savedViewsRequestVersionRef = useRef(0);

  const activeResearchRouteKey = currentResearchRouteKey();
  const hasCommittedViewWrite =
    committedViewRouteKeysRef.current.has(activeResearchRouteKey);
  const queryFormBusyReason: "query" | "view" | "commit" | null = queryBusy
    ? "query"
    : hasCommittedViewWrite
      ? "commit"
      : viewBusy
        ? "view"
        : null;
  const activeViewCommitIssue =
    viewCommitIssue?.routeKey === activeResearchRouteKey
      ? viewCommitIssue
      : null;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const workspaceByNode = new Map<HTMLElement, ResearchWorkspaceSection>();
    if (savedWorkspaceRef.current) workspaceByNode.set(savedWorkspaceRef.current, "saved");
    if (queryFormRegionRef.current) workspaceByNode.set(queryFormRegionRef.current, "form");
    if (resultSummaryRef.current) workspaceByNode.set(resultSummaryRef.current, "results");
    const sections = [...workspaceByNode.keys()];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const nearestVisible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top - 140) - Math.abs(right.boundingClientRect.top - 140))[0];
      const section = nearestVisible ? workspaceByNode.get(nearestVisible.target as HTMLElement) : undefined;
      if (section) setActiveWorkspaceSection(section);
    }, { rootMargin: "-126px 0px -58% 0px", threshold: [0, 0.08, 0.35] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [execution, migrationReview, routeIssue]);

  const registerResultCard = useCallback((resultKey: string, node: HTMLElement | null) => {
    if (node) resultCardRefs.current.set(resultKey, node);
    else resultCardRefs.current.delete(resultKey);
  }, []);

  const parsedRoute = useMemo(() => parseResearchQueryRoute(location.search), [location.search]);
  const routeState = parsedRoute.state;
  const parsedForm = useMemo(() => researchQueryFromFormState(formState), [formState]);
  const formMatchesAppliedQuery = useMemo(() => Boolean(
    parsedForm.query
      && appliedQuery
      && researchQueriesEqual(parsedForm.query, appliedQuery)
  ), [appliedQuery, parsedForm.query]);
  const hasBoundExecution = Boolean(execution && snapshot && appliedQuery);
  const hasUnappliedFormChanges = hasBoundExecution && !formMatchesAppliedQuery;
  const canPersistAppliedQuery = hasBoundExecution && formMatchesAppliedQuery && !queryBusy;
  const canPersistView = (canPersistAppliedQuery && !savedViewsLoading && !savedViewsIssue) && !hasCommittedViewWrite;
  const persistViewLockReason = hasCommittedViewWrite ? "当前查询路由已有一次保存写入返回；为避免重复写入，请先打开返回视图或切换查询。" : savedViewsLoading
    ? "正在核对保存视图索引"
    : savedViewsIssue
      ? "保存视图索引不可用，重新读取成功前保持写入关闭"
      : !canPersistAppliedQuery
        ? "先应用当前表单并完成查询"
        : undefined;

  const refreshSavedViews = useCallback(async (): Promise<SavedViewRecord[] | null> => {
    const requestVersion = savedViewsRequestVersionRef.current + 1;
    savedViewsRequestVersionRef.current = requestVersion;
    setSavedViewsLoading(true);
    setSavedViewsIssue(null);
    try {
      const records = await listResearchSavedViews();
      if (requestVersion !== savedViewsRequestVersionRef.current) return null;
      assertSavedViewIndexIntegrity(records);
      const ordered = [...records].sort((left, right) => (
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.id.localeCompare(right.id)
      ));
      setSavedViews(ordered);
      return ordered;
    } catch (reason) {
      if (requestVersion === savedViewsRequestVersionRef.current) {
        setSavedViewsIssue(errorMessage(reason, "无法读取保存视图。"));
      }
      return null;
    } finally {
      if (requestVersion === savedViewsRequestVersionRef.current) setSavedViewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSavedViews();
    return () => { savedViewsRequestVersionRef.current += 1; };
  }, [refreshSavedViews]);

  const runQuery = useCallback(async (query: ResearchQuery, resultKey: string | null, focusSummary: boolean) => {
    abortRef.current?.abort();
    exportRequestVersionRef.current += 1;
    exportOperationRef.current = false;
    setExportBusy(false);
    setPreparedDelivery(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setQueryBusy(true);
    setProgress(null);
    setMessage(null);
    setOperationIssue(null);
    setAppliedQuery(null);
    setExecution(null);
    setSnapshot(null);
    setRuleProfiles([]);
    setVisibleResultCount(RESULT_BATCH_SIZE);
    setDeepLinkIssue(null);
    setPendingFocus(null);
    resultCardRefs.current.clear();
    try {
      const next = await executeWebResearchQuery(query, {
        signal: controller.signal,
        onProgress: (value) => { if (!controller.signal.aborted) setProgress(value); },
      });
      if (controller.signal.aborted) return;
      assertResearchExecutionBinding(query, next.execution);
      setAppliedQuery(next.execution.query);
      setExecution(next.execution);
      setSnapshot(next.snapshot);
      setRuleProfiles(ruleProfileOptionsFromSnapshot(next.snapshot));
      if (resultKey) {
        const resultIndex = next.execution.results.findIndex((result) => result.key === resultKey);
        if (resultIndex >= 0) {
          setVisibleResultCount(Math.max(RESULT_BATCH_SIZE, resultIndex + 1));
          setPendingFocus(resultKey);
        } else setDeepLinkIssue(`结果引用 ${resultKey} 不属于当前查询结果；不会定位到近似记录。`);
      } else if (focusSummary) {
        setPendingFocus("summary");
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      setOperationIssue(errorMessage(reason, "研究查询执行失败。"));
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
      formSubmitRef.current = false;
      setViewBusy(
        viewOperationRef.current
        || committedViewRouteKeysRef.current.has(currentResearchRouteKey())
      );
      exportRequestVersionRef.current += 1;
      exportOperationRef.current = false;
      setExportBusy(false);
      setPreparedDelivery(null);
      const routeMessage = pendingRouteMessageRef.current;
      pendingRouteMessageRef.current = null;
      const shouldFocus = focusOnNextRouteRef.current;
      focusOnNextRouteRef.current = false;
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
      setPendingFocus(null);
      resultCardRefs.current.clear();
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
      await runQuery(query, parsedRoute.state.resultKey, shouldFocus);
      if (active && routeMessage) setMessage(routeMessage);
    };
    void hydrate().catch((reason) => {
      if (!active) return;
      setQueryBusy(false);
      setRouteIssue(errorMessage(reason, "研究检索引用读取失败；未执行任何回退。"));
    });
    return () => {
      active = false;
      abortRef.current?.abort();
      exportRequestVersionRef.current += 1;
      exportOperationRef.current = false;
    };
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
      target.scrollIntoView?.({
        block: "center",
        behavior: typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth"
      });
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
    if (
      formSubmitRef.current
      || queryBusy
      || abortRef.current
      || viewOperationRef.current
      || committedViewRouteKeysRef.current.has(currentResearchRouteKey())
    ) return;
    formSubmitRef.current = true;
    setFormIssue(null);
    setOperationIssue(null);
    setMessage(null);
    const parsed = parsedForm;
    if (parsed.issue || !parsed.query) {
      formSubmitRef.current = false;
      setFormIssue(parsed.issue ?? "查询条件没有通过严格契约。");
      return;
    }
    focusOnNextRouteRef.current = true;
    if (parsed.query.scope === "cases" && JSON.stringify(parsed.query) === JSON.stringify(defaultResearchQuery("cases"))) {
      setFormState(researchQueryToFormState(parsed.query));
      if (!location.search) {
        void runQuery(parsed.query, null, true).finally(() => {
          formSubmitRef.current = false;
        });
        return;
      }
      navigate("/cases/research");
      return;
    }
    try {
      const draft = createResearchQueryDraft(parsed.query, activeView?.id ?? null);
      navigate(`/cases/research${buildResearchQuerySearch({ source: "draft", referenceId: draft.id, resultKey: null })}`);
    } catch (reason) {
      formSubmitRef.current = false;
      setFormIssue(errorMessage(reason, "无法在当前会话保存研究查询草稿。"));
    }
  };

  const resetForm = () => {
    setFormState(researchQueryToFormState(defaultResearchQuery(formState.scope)));
    setFormIssue(null);
    setMessage("已恢复此范围的默认条件；点击“应用筛选”后才会执行。");
  };

  const focusQueryForm = () => {
    focusResearchRegion(queryFormRegionRef.current);
  };

  const focusSavedWorkspace = () => {
    focusResearchRegion(savedWorkspaceRef.current);
  };

  const focusResultSummary = () => {
    focusResearchRegion(resultSummaryRef.current);
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
    if (
      !migrationReview
      || !migrationConfirmed
      || viewOperationRef.current
      || committedViewRouteKeysRef.current.has(currentResearchRouteKey())
      || savedViewsLoading
      || savedViewsIssue
    ) return;
    setFormIssue(null);
    setOperationIssue(null);
    const parsed = parsedForm;
    if (parsed.issue || !parsed.query) {
      setFormIssue(parsed.issue ?? "迁移目标条件没有通过严格查询契约。");
      return;
    }
    const operationRouteKey = currentResearchRouteKey();
    let returnedView: { id: string; name: string } | null = null;
    let mutationInvoked = false;
    viewOperationRef.current = true;
    setViewBusy(true);
    try {
      mutationInvoked = true;
      const saved = await resolveResearchSavedViewMigration(
        migrationReview,
        parsed.query,
        migrationName.trim() || migrationReview.name,
      );
      returnedView = { id: saved.id, name: saved.name };
      committedViewRouteKeysRef.current.add(operationRouteKey);
      if (currentResearchRouteKey() !== operationRouteKey) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel: "保存视图迁移",
          routeKey: operationRouteKey,
          viewId: saved.id,
          viewName: saved.name,
          message: "迁移写入调用已返回，但页面已离开原查询路由，因此没有执行自动跳转。返回原路由时请通过回执打开结果，不要重复确认迁移。",
        });
        return;
      }
      const refreshedViews = await refreshSavedViews();
      const readbackIssue = savedViewReadbackIssue(saved, refreshedViews);
      if (readbackIssue) throw new Error(readbackIssue);
      if (currentResearchRouteKey() !== operationRouteKey) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel: "保存视图迁移",
          routeKey: operationRouteKey,
          viewId: saved.id,
          viewName: saved.name,
          message: "迁移写入调用已返回，但索引刷新期间页面路由发生变化，因此没有覆盖当前页面。返回原路由时请通过回执打开结果。",
        });
        return;
      }
      setMigrationReview(null);
      setMigrationConfirmed(false);
      pendingRouteMessageRef.current = `已按你确认的当前表单条件迁移视图“${saved.name}”。旧 filters 与 sort 未被自动解释。`;
      focusOnNextRouteRef.current = true;
      navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: saved.id, resultKey: null })}`, { replace: routeState?.source === "view" && routeState.referenceId === saved.id });
      committedViewRouteKeysRef.current.delete(operationRouteKey);
      setViewCommitIssue((current) => current?.routeKey === operationRouteKey ? null : current);
    } catch (reason) {
      const failureMessage = errorMessage(reason, "保存视图迁移失败；旧视图仍保持不可执行。");
      if (returnedView) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel: "保存视图迁移",
          routeKey: operationRouteKey,
          viewId: returnedView.id,
          viewName: returnedView.name,
          message: `${failureMessage} 迁移写入调用已返回，但页面未完成后续索引绑定或导航。当前路由已锁定重复提交，请通过返回视图核对结果。`,
        });
        return;
      }
      if (mutationInvoked) {
        committedViewRouteKeysRef.current.add(operationRouteKey);
        setViewCommitIssue({
          certainty: "call_unknown",
          operationLabel: "保存视图迁移",
          routeKey: operationRouteKey,
          viewId: null,
          viewName: migrationName.trim() || migrationReview.name,
          message: `${failureMessage} 仓储调用没有返回可信视图 ID，无法证明迁移未发生；请先只读刷新索引，不要原路重试。`,
        });
        return;
      }
      setOperationIssue(failureMessage);
      const latest = await getResearchSavedView(migrationReview.id).catch(() => null);
      if (latest?.state === "migration_required") setMigrationReview(latest);
      await refreshSavedViews();
    } finally {
      viewOperationRef.current = false;
      setViewBusy(committedViewRouteKeysRef.current.has(currentResearchRouteKey()));
    }
  };

  const defaultViewName = appliedQuery ? `${scopeLabels[appliedQuery.scope]} · ${appliedQuery.text || "默认条件"}` : "研究查询";

  const saveView = async (mode: "new" | "update" | "copy") => {
    if (viewOperationRef.current || committedViewRouteKeysRef.current.has(currentResearchRouteKey())) return;
    if (savedViewsLoading || savedViewsIssue) {
      setOperationIssue(persistViewLockReason ?? "保存视图索引尚未通过核对。");
      return;
    }
    if (!appliedQuery || !canPersistAppliedQuery) {
      setOperationIssue("当前表单尚未完成执行并绑定到结果摘要；不会把上一次查询保存成当前视图。");
      return;
    }
    const operationRouteKey = currentResearchRouteKey();
    const operationLabel = mode === "update"
      ? "更新保存视图"
      : mode === "copy"
        ? "另存保存视图副本"
        : "新建保存视图";
    const explicitName = viewName.trim();
    const sourceName = activeView?.name || defaultViewName;
    const attemptedViewName = mode === "update"
      ? explicitName || sourceName
      : mode === "copy"
        ? explicitName && explicitName !== sourceName ? explicitName : `${sourceName} 副本`
        : explicitName || defaultViewName;
    let returnedView: { id: string; name: string } | null = null;
    let mutationInvoked = false;
    viewOperationRef.current = true;
    setViewBusy(true);
    setOperationIssue(null);
    setMessage(null);
    try {
      let saved: ReadySavedViewRecord;
      if (mode === "update") {
        if (!activeView) throw new Error("当前查询没有可更新的保存视图。");
        mutationInvoked = true;
        saved = await updateResearchSavedView(activeView, appliedQuery, viewName.trim() || activeView.name);
      } else {
        mutationInvoked = true;
        saved = await createResearchSavedView(attemptedViewName.slice(0, 80), appliedQuery);
      }
      returnedView = { id: saved.id, name: saved.name };
      committedViewRouteKeysRef.current.add(operationRouteKey);
      if (currentResearchRouteKey() !== operationRouteKey) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel,
          routeKey: operationRouteKey,
          viewId: saved.id,
          viewName: saved.name,
          message: "保存写入调用已返回，但页面已离开原查询路由，因此没有执行自动跳转。返回原路由时请通过回执打开结果，不要重复保存。",
        });
        return;
      }
      const refreshedViews = await refreshSavedViews();
      const readbackIssue = savedViewReadbackIssue(saved, refreshedViews);
      if (readbackIssue) throw new Error(readbackIssue);
      if (currentResearchRouteKey() !== operationRouteKey) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel,
          routeKey: operationRouteKey,
          viewId: saved.id,
          viewName: saved.name,
          message: "保存写入调用已返回，但索引刷新期间页面路由发生变化，因此没有覆盖当前页面。返回原路由时请通过回执打开结果。",
        });
        return;
      }
      setActiveView(saved);
      setViewName(saved.name);
      pendingRouteMessageRef.current = mode === "update" ? `已更新保存视图“${saved.name}”。` : mode === "copy" ? `已另存副本“${saved.name}”。` : `已保存视图“${saved.name}”。`;
      focusOnNextRouteRef.current = true;
      navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: saved.id, resultKey: null })}`, { replace: mode === "update" });
      committedViewRouteKeysRef.current.delete(operationRouteKey);
      setViewCommitIssue((current) => current?.routeKey === operationRouteKey ? null : current);
    } catch (reason) {
      const failureMessage = errorMessage(reason, "无法保存研究视图。");
      if (returnedView) {
        setViewCommitIssue({
          certainty: "returned_unreconciled",
          operationLabel,
          routeKey: operationRouteKey,
          viewId: returnedView.id,
          viewName: returnedView.name,
          message: `${failureMessage} 保存写入调用已返回，但页面未完成后续索引绑定或导航。当前路由已锁定重复提交，请通过返回视图核对结果。`,
        });
        return;
      }
      if (mutationInvoked) {
        committedViewRouteKeysRef.current.add(operationRouteKey);
        setViewCommitIssue({
          certainty: "call_unknown",
          operationLabel,
          routeKey: operationRouteKey,
          viewId: mode === "update" ? activeView?.id ?? null : null,
          viewName: attemptedViewName.slice(0, 80),
          message: `${failureMessage} 仓储调用没有返回可核对结果，无法证明视图未写入；请先只读刷新索引，不要原路重试。`,
        });
        return;
      }
      setOperationIssue(failureMessage);
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
      viewOperationRef.current = false;
      setViewBusy(committedViewRouteKeysRef.current.has(currentResearchRouteKey()));
    }
  };

  const exportExecution = async () => {
    if (!execution || exportOperationRef.current) return;
    const requestVersion = exportRequestVersionRef.current + 1;
    exportRequestVersionRef.current = requestVersion;
    exportOperationRef.current = true;
    setExportBusy(true);
    setOperationIssue(null);
    setMessage(null);
    try {
      const prepared = await prepareResearchQueryExecutionExport(execution);
      if (requestVersion !== exportRequestVersionRef.current) return;
      const normalizedMediaType = prepared.mediaType.toLowerCase().replace(/\s+/gu, "");
      const frozenBlob = new Blob([prepared.content], { type: prepared.mediaType });
      if (
        !prepared.filename.trim().toLowerCase().endsWith(".json")
        || !/^application\/json(?:;charset=utf-8)?$/u.test(normalizedMediaType)
        || !Number.isSafeInteger(frozenBlob.size)
        || frozenBlob.size <= 0
      ) {
        throw new Error("冻结查询快照必须是非空 JSON 文件，且媒体类型与文件扩展名必须一致。");
      }
      setPreparedDelivery({
        blob: frozenBlob,
        filename: prepared.filename,
        title: `研究查询冻结快照 · ${shortHash(execution.queryDigest)}`,
        sharePolicy: "blocked_sensitive",
        description: `文件绑定查询摘要 ${execution.queryDigest}、数据世代与结果摘要，可能包含检索词、别名、事件命中和本地 ID；只能下载或保存到可信位置，不能进入系统分享。`,
      });
      setMessage("研究查询快照已冻结并准备交付；同一份内容将用于下载或指定位置保存，目前尚未发生交付，系统分享保持关闭。");
    } catch (reason) {
      if (requestVersion !== exportRequestVersionRef.current) return;
      setOperationIssue(errorMessage(reason, "查询快照未通过冻结与摘要校验。"));
    } finally {
      if (requestVersion === exportRequestVersionRef.current) {
        exportOperationRef.current = false;
        setExportBusy(false);
      }
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
  const sourceCounts = useMemo(
    () => execution ? calculationSourceCounts(execution) : null,
    [execution],
  );
  const exactEventHrefs = useMemo(() => {
    const index = new Map<string, string | null>();
    if (snapshot) {
      for (const event of snapshot.events) index.set(event.id, exactEventHref(event));
    }
    return index;
  }, [snapshot]);
  const visibleResults = useMemo(
    () => execution?.results.slice(0, visibleResultCount) ?? [],
    [execution, visibleResultCount],
  );
  const remainingResultCount = execution
    ? Math.max(0, execution.results.length - visibleResults.length)
    : 0;
  const derivedCalculationRequested = appliedQuery?.scope === "cases"
    && (appliedQuery.relationTypes.length > 0 || appliedQuery.transit !== null);
  const queryStage = queryBusy
    ? "running"
    : routeIssue || parsedForm.issue
      ? "invalid"
      : hasUnappliedFormChanges
        ? "draft"
        : execution
          ? "complete"
          : "editing";
  const viewSourceLabel = migrationReview
    ? "迁移审核"
    : activeView?.name
      ?? (routeState?.source === "draft" ? "会话草稿" : "默认查询");
  const queryStageLabel = queryStage === "running"
    ? "Executing"
    : queryStage === "invalid"
      ? "Contract blocked"
      : queryStage === "draft"
        ? "Draft changes"
        : queryStage === "complete"
          ? "Bound result"
          : "Query editing";

  return (
    <div
      className="page page--research-query"
      aria-busy={queryBusy || viewBusy || exportBusy}
      data-query-stage={queryStage}
      data-active-workspace={activeWorkspaceSection}
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-db-generation={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.engineeringEvidenceOnly)}
      data-evidence-authority="engineering-only"
      data-query-result-authority="deterministic-local-research"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-view-write-mode={activeViewCommitIssue ? "reconciliation-only" : viewBusy ? "locked" : "available"}
      data-mutation-mode="epoch-guarded"
      data-mutation-epoch-bypassed="false"
      data-prepared-delivery={preparedDelivery ? "ready" : "none"}
      data-file-delivery-certainty={preparedDelivery ? "prepared-not-delivered" : "none"}
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
        if (
          !viewBusy
          || !link
          || link.dataset.reconciliationNavigation === "allowed"
        ) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <div className="research-query-masthead">
        <PageHeading
          eyebrow="Research query"
          title="专业研究检索"
          description="用严格、版本化的 ResearchQuery 组合检索正式命盘、候选组、事件与知识资料。查询在本地执行；地址栏只保存随机引用，不写入关键词、事件正文或完整条件。"
          actions={<AppLink href="/cases" className="secondary-action"><Database aria-hidden="true" />返回案例库</AppLink>}
        />
        <dl className="research-query-status-strip" aria-label="当前研究查询摘要">
          <div><dt>表单范围</dt><dd>{scopeLabels[formState.scope]}</dd></div>
          <div><dt>视图来源</dt><dd title={safeVisibleText(viewSourceLabel, "来源未识别", 160)}>{safeVisibleText(viewSourceLabel, "来源未识别", 160)}</dd></div>
          <div><dt>执行状态</dt><dd>{queryBusy ? "执行中" : execution ? formMatchesAppliedQuery ? `${execution.total} 条 · 已绑定` : `${execution.total} 条旧结果 · 待应用` : routeIssue ? "链接未接受" : "等待应用"}</dd></div>
          <div><dt>证据权威</dt><dd>工程检索</dd></div>
        </dl>
      </div>

      <nav className="research-query-command-bar" data-state={queryStage} aria-label="研究查询工作台快捷定位">
        <div className="research-query-command-state">
          <small>{queryStageLabel}</small>
          <strong>{scopeLabels[formState.scope]}</strong>
          <span title={safeVisibleText(viewSourceLabel, "来源未识别", 160)}>{safeVisibleText(viewSourceLabel, "来源未识别", 160)}</span>
        </div>
        <div className="research-query-command-actions">
          <button type="button" aria-current={activeWorkspaceSection === "saved" ? "location" : undefined} onClick={() => { setActiveWorkspaceSection("saved"); focusSavedWorkspace(); }}>
            <span aria-hidden="true">01</span><strong>保存视图</strong><small>{savedViewsLoading ? "正在核对索引" : savedViewsIssue ? "索引暂不可用" : `${savedViews.length} 个本地视图`}</small>
          </button>
          <button type="button" aria-current={activeWorkspaceSection === "form" ? "location" : undefined} disabled={Boolean(routeIssue) && !migrationReview} onClick={() => { setActiveWorkspaceSection("form"); focusQueryForm(); }}>
            <span aria-hidden="true">02</span><strong>编辑筛选</strong><small>{parsedForm.issue ? "查询契约待修正" : hasUnappliedFormChanges ? "存在未应用改动" : "严格查询表单"}</small>
          </button>
          <button type="button" aria-current={activeWorkspaceSection === "results" ? "location" : undefined} disabled={!hasBoundExecution} onClick={() => { setActiveWorkspaceSection("results"); focusResultSummary(); }}>
            <span aria-hidden="true">03</span><strong>查看结果</strong><small>{execution ? `${execution.total} 条绑定结果` : "尚无已执行结果"}</small>
          </button>
        </div>
        <div className="research-query-command-boundary">
          <ShieldCheck aria-hidden="true" />
          <span><strong>Local evidence</strong><small>工程检索，不授予专家真值或发布权限</small></span>
        </div>
      </nav>

      {routeIssue ? <div className="error-panel research-query-route-error" role="alert" tabIndex={-1}><strong>无法恢复研究查询</strong><p>{safeVisibleText(routeIssue, "研究查询引用不可用。")}</p><button type="button" className="secondary-action" onClick={() => navigate("/cases/research")}>由我明确打开默认查询</button></div> : null}

      <section ref={savedWorkspaceRef} className="research-saved-workspace" data-research-workspace="saved" tabIndex={-1} aria-labelledby="research-saved-title" aria-busy={savedViewsLoading || viewBusy}>
        <header><div><h2 id="research-saved-title">保存的研究查询</h2><p>保存、恢复、更新或另存副本；旧版任意 filters 只提示迁移，绝不自动解释。</p></div><StatusPill tone={savedViewsIssue ? "cinnabar" : savedViewsLoading ? "warning" : "info"}>{savedViewsIssue ? "索引不可用" : savedViewsLoading ? "正在核对" : "本地 IndexedDB"}</StatusPill></header>
        <div className="research-saved-list">
          {savedViewsLoading ? (
            <div className="research-saved-status" role="status"><LoaderCircle className="spin" aria-hidden="true" /><div><strong>正在读取保存视图索引</strong><small>完成前不显示空列表结论，也不开放保存、更新或迁移写入。</small></div></div>
          ) : savedViewsIssue ? (
            <div className="research-saved-status is-error" role="alert"><Database aria-hidden="true" /><div><strong>保存视图索引暂不可用</strong><small>{safeVisibleText(savedViewsIssue, "保存视图索引不可用。")}；已保留上次成功读取的内存列表，但不作为当前可写依据。</small></div><button type="button" className="secondary-action" disabled={viewBusy} onClick={() => void refreshSavedViews()}>重新读取</button></div>
          ) : <>{savedViews.map((view) => view.state === "ready" ? (
            <button key={view.id} type="button" disabled={viewBusy && !activeViewCommitIssue} className={activeView?.id === view.id ? "is-active" : ""} aria-pressed={activeView?.id === view.id} title={activeViewCommitIssue ? "只读打开此视图，核对上一笔结果未知或待绑定的写入" : undefined} onClick={() => { focusOnNextRouteRef.current = true; navigate(`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: view.id, resultKey: null })}`); }}>
              <span><strong>{safeVisibleText(view.name, "未命名研究视图", 120)}</strong><small>{scopeLabels[view.query.scope]} · v{view.query.version} · 编辑 {view.editVersion}</small></span>
            </button>
          ) : (
            <div className="migration-required" key={view.id} role="note"><span><strong>{safeVisibleText(view.name, "未命名旧视图", 120)}</strong><small>旧版视图 · 待人工审核迁移</small></span><StatusPill tone="warning">不可执行</StatusPill><button type="button" className="text-link" disabled={viewBusy} onClick={() => beginMigrationReview(view)}>开始审核</button></div>
          ))}
          {!savedViews.length ? <p>还没有专业研究查询视图。</p> : null}</>}
        </div>
        <div className="research-saved-actions">
          <label className="field"><span>视图名称</span><input value={viewName} maxLength={80} disabled={savedViewsLoading || Boolean(savedViewsIssue) || viewBusy} onChange={(event) => setViewName(event.target.value)} placeholder={safeVisibleText(defaultViewName, "未命名研究视图", 80)} /></label>
          <p className="research-saved-binding" data-state={canPersistView ? "ready" : "locked"}>
            <ShieldCheck aria-hidden="true" />
            <span>{savedViewsLoading
              ? "正在核对保存视图索引；完成前不会创建、更新或迁移视图。"
              : savedViewsIssue
                ? "保存视图索引不可用；重新读取成功前不会把当前查询写入不确定索引。"
                : canPersistAppliedQuery && execution
              ? <>保存目标已绑定查询摘要 <code>{shortHash(execution.queryDigest)}</code></>
              : queryBusy
                ? "查询执行完成并固定摘要前，保存入口保持锁定。"
                : hasUnappliedFormChanges
                  ? "当前表单有未应用改动；不会把下方旧结果保存成当前视图。"
                  : "先应用当前表单并完成本地查询，才能保存或更新视图。"}</span>
          </p>
          <div>
            <button type="button" className="secondary-action" disabled={!canPersistView || viewBusy} title={persistViewLockReason} onClick={() => void saveView("new")}><BookmarkPlus aria-hidden="true" />保存当前查询</button>
            {activeView ? <button type="button" className="secondary-action" disabled={!canPersistView || viewBusy} title={persistViewLockReason} onClick={() => void saveView("update")}><Save aria-hidden="true" />更新当前视图</button> : null}
            {activeView ? <button type="button" className="secondary-action" disabled={!canPersistView || viewBusy} title={persistViewLockReason} onClick={() => void saveView("copy")}><Copy aria-hidden="true" />另存副本</button> : null}
          </div>
        </div>
      </section>

      {migrationReview ? (
        <section ref={migrationReviewRef} className="research-migration-review" tabIndex={-1} aria-labelledby="migration-review-title">
          <header><div><p className="eyebrow">Explicit migration review</p><h2 id="migration-review-title">审核旧视图“{safeVisibleText(migrationReview.name, "未命名旧视图", 120)}”</h2></div><StatusPill tone="warning">尚不可执行</StatusPill></header>
          <p className="research-migration-boundary" role="alert">以下 query、filters、sort 是旧版内容的安全可见预览，没有既定 ResearchQuery 语义。系统不会据此选择范围、生命周期或任何命理条件，也不会自动执行。</p>
          <div className="research-legacy-record">
            <section><h3>旧 query 安全预览</h3><pre>{safeVisibleText(migrationReview.legacyRecord.query, "（空）", 10_000)}</pre></section>
            <section><h3>旧 filters 安全预览</h3><pre>{safeVisibleText(JSON.stringify(migrationReview.legacyRecord.filters, null, 2), "（空）", 10_000)}</pre></section>
            <section><h3>旧 sort 安全预览</h3><pre>{safeVisibleText(JSON.stringify(migrationReview.legacyRecord.sort, null, 2), "（空）", 10_000)}</pre></section>
          </div>
          <div className="research-migration-actions">
            <label className="field"><span>迁移后的视图名称</span><input value={migrationName} maxLength={80} onChange={(event) => setMigrationName(event.target.value)} /></label>
            <button type="button" className="secondary-action" disabled={viewBusy} onClick={copyLegacyKeyword}>仅复制旧关键词到草稿</button>
            <label className="research-migration-confirm"><input type="checkbox" checked={migrationConfirmed} onChange={(event) => setMigrationConfirmed(event.target.checked)} /><span>我已在下方表单逐项选择新的 scope、生命周期与条件，并确认不解释旧 filters / sort。</span></label>
            <button type="button" className="primary-action" disabled={!migrationConfirmed || viewBusy || hasCommittedViewWrite || queryBusy || savedViewsLoading || Boolean(savedViewsIssue)} aria-busy={viewBusy} onClick={() => void confirmMigration()}>{viewBusy ? "正在迁移" : "确认迁移为当前表单条件"}</button>
          </div>
        </section>
      ) : null}

      {message ? <p className="success-message" role="status" aria-atomic="true">{safeVisibleText(message, "操作已完成。")}</p> : null}
      {operationIssue ? <div className="inline-error" role="alert"><strong>研究工作台未接受本次操作</strong><p>{safeVisibleText(operationIssue, "操作未被接受。")}</p></div> : null}
      {activeViewCommitIssue ? (
        <section className="research-view-commit-issue" role="alert" aria-labelledby="research-view-commit-title" data-certainty={activeViewCommitIssue.certainty} data-mutation-outcome={activeViewCommitIssue.certainty === "call_unknown" ? "call_unknown" : "returned_followup_unverified"} data-retry-policy="blocked">
          <div className="research-view-commit-heading">
            <ShieldCheck aria-hidden="true" />
            <div>
              <p className="research-view-commit-kicker">{activeViewCommitIssue.certainty === "call_unknown" ? "Call unknown" : "写入回执待核对"}</p>
              <h2 id="research-view-commit-title">{safeVisibleText(activeViewCommitIssue.operationLabel, "视图写入", 80)}{activeViewCommitIssue.certainty === "call_unknown" ? "结果未知" : "已返回"}，禁止原路重试</h2>
            </div>
          </div>
          <p>{safeVisibleText(activeViewCommitIssue.message, "视图写入结果无法核对。")}</p>
          <p>{activeViewCommitIssue.certainty === "call_unknown"
            ? "先只读刷新索引；若列表出现预期视图，可从上方保存视图列表打开核对。列表开放只读导航，不会解除原查询路由的重复写入锁。"
            : "可打开已返回的视图核对同一 ID、名称与严格查询；离开原查询路由不会解除其重复写入锁。"}</p>
          <dl className="research-view-commit-facts">
            <div><dt>返回视图</dt><dd>{safeVisibleText(activeViewCommitIssue.viewName, "未命名研究视图", 120)}</dd></div>
            <div><dt>视图 ID</dt><dd>{safeVisibleText(activeViewCommitIssue.viewId, "调用未返回可信 ID", 160)}</dd></div>
            <div><dt>重试策略</dt><dd>已锁定 · 先只读核对</dd></div>
          </dl>
          <div className="research-view-commit-actions">
            {activeViewCommitIssue.viewId ? <AppLink className="research-view-commit-primary" data-reconciliation-navigation="allowed" href={`/cases/research${buildResearchQuerySearch({ source: "view", referenceId: activeViewCommitIssue.viewId, resultKey: null })}`}>{activeViewCommitIssue.certainty === "call_unknown" ? "打开已知视图核对" : "打开返回视图"}</AppLink> : <span className="research-view-commit-unavailable">刷新索引后，从上方列表只读核对候选视图</span>}
            <button type="button" className="research-view-commit-secondary" disabled={savedViewsLoading} onClick={() => void refreshSavedViews()}>{savedViewsLoading ? "正在刷新索引…" : "只读刷新视图索引"}</button>
          </div>
        </section>
      ) : null}

      {!routeIssue || migrationReview ? (
        <section className="research-query-contract-rail" aria-label="研究查询定义、执行与验证状态">
          <div data-state={parsedForm.issue ? "blocked" : "ready"}>
            <span aria-hidden="true">01</span>
            <div><small>Define</small><strong>{parsedForm.issue ? "表单契约待修正" : `${scopeLabels[formState.scope]}条件已定义`}</strong><p>{parsedForm.issue ? safeVisibleText(parsedForm.issue, "表单契约不可用。") : "当前字段可生成严格、版本化的 ResearchQuery。"}</p></div>
            <StatusPill tone={parsedForm.issue ? "cinnabar" : "info"}>{parsedForm.issue ? "未接受" : "已定义"}</StatusPill>
          </div>
          <div data-state={queryBusy ? "running" : formMatchesAppliedQuery && execution ? "ready" : "waiting"}>
            <span aria-hidden="true">02</span>
            <div><small>Execute</small><strong>{queryBusy ? "正在执行当前查询" : formMatchesAppliedQuery && execution ? `${execution.total} 条结果已绑定` : hasUnappliedFormChanges ? "当前表单尚未应用" : "等待应用筛选"}</strong><p>{queryBusy ? progressLabel(progress) : "执行只读取本地冻结快照，不改写研究记录。"}</p></div>
            <StatusPill tone={queryBusy ? "warning" : formMatchesAppliedQuery && execution ? "info" : "neutral"}>{queryBusy ? "执行中" : formMatchesAppliedQuery && execution ? "已执行" : "等待"}</StatusPill>
          </div>
          <div data-state={formMatchesAppliedQuery && execution && snapshot ? "ready" : hasBoundExecution ? "stale" : "waiting"}>
            <span aria-hidden="true">03</span>
            <div><small>Verify</small><strong>{formMatchesAppliedQuery && execution && snapshot ? "结构与摘要已固定" : hasBoundExecution ? "仅上次绑定结果保留" : "尚无可固定结果"}</strong><p>{hasBoundExecution ? "结果仍受查询摘要、数据世代与结果摘要共同约束。" : "完成执行后才会展示摘要和稳定排序证据。"}</p></div>
            <StatusPill tone={formMatchesAppliedQuery && execution && snapshot ? "info" : hasBoundExecution ? "warning" : "neutral"}>{formMatchesAppliedQuery && execution && snapshot ? "已固定" : hasBoundExecution ? "旧结果" : "等待"}</StatusPill>
          </div>
        </section>
      ) : null}

      {!routeIssue || migrationReview ? <div ref={queryFormRegionRef} className="research-query-form-region" data-research-workspace="form" tabIndex={-1} aria-label="研究查询筛选区"><ResearchQueryForm state={formState} setState={(next) => { setMigrationConfirmed(false); setFormIssue(null); setMessage(null); setFormState(next); }} availableRuleProfiles={ruleProfileOptions} busy={queryFormBusyReason !== null} busyReason={queryFormBusyReason} onSubmit={applyForm} onReset={resetForm} /></div> : null}
      {formIssue ? <div className="inline-error" role="alert"><strong>查询条件没有通过严格契约</strong><p>{safeVisibleText(formIssue, "查询条件不可用。")}</p></div> : null}

      {queryBusy ? <div className="research-query-loading" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><span>{progressLabel(progress)}</span><button type="button" className="secondary-action" onClick={cancelQuery}>取消查询</button></div> : null}
      {deepLinkIssue ? <div className="inline-error" role="alert"><strong>无法定位精确结果</strong><p>{safeVisibleText(deepLinkIssue, "结果引用不可用。")}</p></div> : null}
      {hasUnappliedFormChanges ? (
        <aside className="research-query-stale-result" role="status" aria-live="polite">
          <ShieldCheck aria-hidden="true" />
          <div><strong>下方仍是上一次已执行结果</strong><p>当前表单改动尚未应用。旧结果继续绑定原查询摘要且保持只读；保存视图入口已锁定，文件准备也会明确标记为上次执行快照。</p></div>
        </aside>
      ) : null}

      {execution && snapshot && appliedQuery ? (
        <>
          <section ref={resultSummaryRef} className="research-result-summary" data-research-workspace="results" tabIndex={-1} aria-labelledby="research-results-title">
            <div><p className="eyebrow">Deterministic result set</p><h2 id="research-results-title">{scopeLabels[appliedQuery.scope]} · {execution.total} 条结果</h2><p role="status" aria-live="polite" aria-atomic="true">已按 ResearchQuery v{appliedQuery.version} 完成结构、摘要复算与稳定排序。</p>{derivedCalculationRequested && sourceCounts ? <p className="research-calculation-source-summary"><strong>下游计算来源</strong>{sourceCounts.total > 0 ? <>已保存收据 {sourceCounts.stored} · 当前即时投影 {sourceCounts.explicit}{sourceCounts.schemaUnavailable ? ` · 其中 ${sourceCounts.schemaUnavailable} 条所在发布代无收据账本` : ""}</> : <>没有可展示的命中来源；不可计算或未通过所需组件复演的记录已排除，并列入边界说明。</>}</p> : null}{appliedQuery.scope === "cases" && appliedQuery.transit ? <p className="research-domain-evidence-boundary">运限条件仍是工程计算：当前专家验证案例为 0，本次命中不代表运限命理真值已经确认。</p> : null}</div>
            <dl><div><dt>查询摘要</dt><dd><code title={safeVisibleText(execution.queryDigest, "摘要不可用", 180)}>{shortHash(execution.queryDigest)}</code></dd></div><div><dt>数据世代</dt><dd><code title={safeVisibleText(execution.dataEpoch, "世代不可用", 180)}>{shortHash(execution.dataEpoch)}</code></dd></div><div><dt>结果摘要</dt><dd><code title={safeVisibleText(execution.resultDigest, "摘要不可用", 180)}>{shortHash(execution.resultDigest)}</code></dd></div></dl>
          </section>

          <p className="research-query-print-boundary">当前打印只包含已经渲染的 {visibleResults.length} / {execution.total} 条结果；完整冻结结果集合以查询快照 JSON 为准。工程摘要不构成专家真值、科学验证或公开发布授权。</p>

          <aside className="research-query-export-warning" aria-label="查询快照冻结交付说明" aria-busy={exportBusy} data-state={exportBusy ? "preparing" : "ready"} data-share-policy="blocked_sensitive">
            <div className="research-query-export-warning__copy">
              <div className="research-query-export-warning__heading">
                <span aria-hidden="true"><ShieldCheck /></span>
                <div><p className="eyebrow">Private frozen snapshot</p><strong>查询快照含可识别的本地研究线索</strong></div>
              </div>
              <p>文件包含检索词、标签、别名、事件命中及精确本地 ID，请仅保存到可信位置。只会冻结当前已执行并通过摘要复算的结果，不包含尚未应用的草稿。</p>
              <div className="research-query-export-warning__facts" aria-label="查询快照交付边界">
                <span>同一冻结内容</span><span>系统分享关闭</span><span>公开授权为否</span><span>{exportBusy ? "正在固定执行代" : "尚未发生交付"}</span>
              </div>
            </div>
            <button type="button" className="secondary-action" disabled={exportBusy} aria-busy={exportBusy} onClick={() => void exportExecution()}>{exportBusy ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileDown aria-hidden="true" />}{exportBusy ? "正在冻结并校验" : hasUnappliedFormChanges ? "准备上次执行快照" : "准备查询快照"}</button>
          </aside>

          {execution.diagnostics.length ? <details className="research-query-diagnostics"><summary><ShieldCheck aria-hidden="true" />查看 {execution.diagnostics.length} 条边界说明</summary><ul>{execution.diagnostics.map((diagnostic) => <li key={`${diagnostic.kind}:${diagnostic.code}:${diagnostic.subjectId}:${diagnostic.revisionId}`}><StatusPill tone={diagnostic.kind === "warning" ? "warning" : "info"}>{diagnostic.kind}</StatusPill><span>{safeVisibleText(diagnostic.message, "未说明的查询边界。")}</span></li>)}</ul></details> : null}

          {execution.results.length ? (
            <>
              <section className="research-result-window" aria-labelledby="research-result-window-title">
                <div><p className="eyebrow">Progressive result window</p><h3 id="research-result-window-title" role="status" aria-live="polite" aria-atomic="true">正在展示 {visibleResults.length} / {execution.total} 条</h3><small>渐进展示只减少当前 DOM 负担；查询摘要、稳定排序和冻结文件仍覆盖全部 {execution.total} 条结果。</small><p className="research-result-order-boundary">序号与检索匹配分只用于复现当前查询的稳定顺序，不代表概率、优先级、主盘候选或命理结论。</p></div>
                <progress max={execution.total} value={visibleResults.length} aria-label={`已展示 ${visibleResults.length} 条，共 ${execution.total} 条`} />
              </section>
              <div id="research-result-list" className="research-result-list">
                {visibleResults.map((result, index) => <ResearchResultCard key={result.key} result={result} query={appliedQuery} eventHrefs={exactEventHrefs} selected={routeState?.resultKey === result.key} focusHref={routeForResult(result.key)} position={index + 1} total={execution.total} register={registerResultCard} />)}
              </div>
              {remainingResultCount > 0 ? (
                <div className="research-result-load-more">
                  <span aria-hidden="true" />
                  <button type="button" className="secondary-action" aria-controls="research-result-list" onClick={() => setVisibleResultCount((current) => Math.min(execution.total, current + RESULT_BATCH_SIZE))}>继续显示 {Math.min(RESULT_BATCH_SIZE, remainingResultCount)} 条</button>
                  <small>尚有 {remainingResultCount} 条已绑定结果未渲染</small>
                </div>
              ) : null}
            </>
          ) : relevantDataCount === 0 ? (
            <ResearchScopeEmptyState scope={appliedQuery.scope} />
          ) : (
            <div className="research-query-empty"><SearchX aria-hidden="true" /><h2>没有记录同时满足全部条件</h2><p>条件仍完整保留。可回到筛选区放宽一个条件，或恢复此范围默认条件后再次应用。</p><button type="button" className="secondary-action" onClick={() => { resetForm(); focusQueryForm(); }}>放宽条件</button></div>
          )}
        </>
      ) : null}
    </div>
  );
}
