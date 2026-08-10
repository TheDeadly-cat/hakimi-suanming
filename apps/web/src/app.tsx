import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AppShell } from "./components/app-shell";
import type { AppBootFailure } from "./lib/app-boot-failure";
import { LocalAppSettingsProvider } from "./lib/local-app-settings";
import { useAppLocation } from "./lib/router";
import { BootFailureRecoveryPage, type BootFailureRecoveryView } from "./pages/boot-failure-recovery-page";

const loadDashboardPage = () => import("./pages/dashboard-page");
const loadNewChartPage = () => import("./pages/new-chart-page");
const loadCaseLibraryPage = () => import("./pages/case-library-page");
const loadResearchQueryPage = () => import("./pages/research-query-page");
const loadCandidateSetPage = () => import("./pages/candidate-set-page");
const loadChartPage = () => import("./pages/chart-page");
const loadComparePage = () => import("./pages/compare-page");
const loadPairResearchPage = () => import("./pages/pair-research-page");
const loadKnowledgePage = () => import("./pages/knowledge-page");
const loadDataManagementPage = () => import("./pages/data-management-page");
const loadSettingsPage = () => import("./pages/settings-page");
const loadHelpPage = () => import("./pages/help-page");
const loadCalendarDivergenceAuditPage = () => import("./pages/calendar-divergence-audit-page");
const loadTransitReviewInboxPage = () => import("./pages/transit-review-inbox-page");
const loadNotFoundPage = () => import("./pages/not-found-page");

const DashboardPage = lazy(() => loadDashboardPage().then((module) => ({ default: module.DashboardPage })));
const NewChartPage = lazy(() => loadNewChartPage().then((module) => ({ default: module.NewChartPage })));
const CaseLibraryPage = lazy(() => loadCaseLibraryPage().then((module) => ({ default: module.CaseLibraryPage })));
const ResearchQueryPage = lazy(() => loadResearchQueryPage().then((module) => ({ default: module.ResearchQueryPage })));
const CandidateSetPage = lazy(() => loadCandidateSetPage().then((module) => ({ default: module.CandidateSetPage })));
const ChartPage = lazy(() => loadChartPage().then((module) => ({ default: module.ChartPage })));
const ComparePage = lazy(() => loadComparePage().then((module) => ({ default: module.ComparePage })));
const PairResearchPage = lazy(() => loadPairResearchPage().then((module) => ({ default: module.PairResearchPage })));
const KnowledgePage = lazy(() => loadKnowledgePage().then((module) => ({ default: module.KnowledgePage })));
const DataManagementPage = lazy(() => loadDataManagementPage().then((module) => ({ default: module.DataManagementPage })));
const SettingsPage = lazy(() => loadSettingsPage().then((module) => ({ default: module.SettingsPage })));
const HelpPage = lazy(() => loadHelpPage().then((module) => ({ default: module.HelpPage })));
const CalendarDivergenceAuditPage = lazy(() => loadCalendarDivergenceAuditPage().then((module) => ({ default: module.CalendarDivergenceAuditPage })));
const TransitReviewInboxPage = lazy(() => loadTransitReviewInboxPage().then((module) => ({ default: module.TransitReviewInboxPage })));
const NotFoundPage = lazy(() => loadNotFoundPage().then((module) => ({ default: module.NotFoundPage })));

function loaderForPath(pathname: string): () => Promise<unknown> {
  if (pathname === "/") return loadDashboardPage;
  if (pathname === "/new") return loadNewChartPage;
  if (pathname === "/cases/research") return loadResearchQueryPage;
  if (pathname === "/cases") return loadCaseLibraryPage;
  if (pathname === "/compare/pair") return loadPairResearchPage;
  if (pathname === "/compare") return loadComparePage;
  if (pathname === "/knowledge") return loadKnowledgePage;
  if (pathname === "/help") return loadHelpPage;
  if (pathname === "/settings/data") return loadDataManagementPage;
  if (pathname === "/settings/calendar-divergence-audit") return loadCalendarDivergenceAuditPage;
  if (pathname === "/settings/transit-review-inbox") return loadTransitReviewInboxPage;
  if (pathname === "/settings") return loadSettingsPage;
  if (/^\/candidate-sets\/[0-9a-f-]+$/i.test(pathname)) return loadCandidateSetPage;
  if (/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+\/revise$/i.test(pathname)) return loadNewChartPage;
  if (/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i.test(pathname)) return loadChartPage;
  return loadNotFoundPage;
}

export async function preloadAppRoute(pathname: string): Promise<void> {
  await loaderForPath(pathname)();
}

function resolvePage(pathname: string) {
  if (pathname === "/") return <DashboardPage />;
  if (pathname === "/new") return <NewChartPage />;
  if (pathname === "/cases/research") return <ResearchQueryPage />;
  if (pathname === "/cases") return <CaseLibraryPage />;
  if (pathname === "/compare/pair") return <PairResearchPage />;
  if (pathname === "/compare") return <ComparePage />;
  if (pathname === "/knowledge") return <KnowledgePage />;
  if (pathname === "/help") return <HelpPage />;
  if (pathname === "/settings/data") return <DataManagementPage />;
  if (pathname === "/settings/calendar-divergence-audit") return <CalendarDivergenceAuditPage />;
  if (pathname === "/settings/transit-review-inbox") return <TransitReviewInboxPage />;
  if (pathname === "/settings") return <SettingsPage />;

  const candidateSetMatch = pathname.match(/^\/candidate-sets\/([0-9a-f-]+)$/i);
  if (candidateSetMatch) return <CandidateSetPage candidateSetId={candidateSetMatch[1]} />;

  const reviseMatch = pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)\/revise$/i);
  if (reviseMatch) return <NewChartPage caseId={reviseMatch[1]} revisionId={reviseMatch[2]} />;

  const chartMatch = pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  if (chartMatch) return <ChartPage caseId={chartMatch[1]} revisionId={chartMatch[2]} />;
  return <NotFoundPage />;
}

function resolvePageTitle(pathname: string, search: string): string {
  if (pathname === "/") return "工作台";
  if (pathname === "/new") return "新建排盘";
  if (pathname === "/cases/research") return "专业研究检索";
  if (pathname === "/cases") return "案例库";
  if (pathname === "/compare/pair") return "双案例结构研究";
  if (pathname === "/compare") return "正式命盘对照台";
  if (pathname === "/help") return "帮助与安全边界";
  if (pathname === "/settings/data") return "数据管理与完整备份";
  if (pathname === "/settings/calendar-divergence-audit") return "连续历法差异审计";
  if (pathname === "/settings/transit-review-inbox") return "未核验审核收件箱";
  if (pathname === "/settings") return "设置与诊断";
  if (pathname === "/knowledge") {
    const view = new URLSearchParams(search).get("view");
    if (view === "rights") return "来源权利台账";
    if (view === "coverage") return "依据覆盖审计";
    return "个人典籍与引用";
  }
  if (/^\/candidate-sets\/[0-9a-f-]+$/i.test(pathname)) return "未知时辰候选组";
  if (/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+\/revise$/i.test(pathname)) return "由历史修订派生新版";
  if (/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i.test(pathname)) {
    const view = new URLSearchParams(search).get("view");
    if (view === "overview") return "命盘概览";
    if (view === "transit") return "命盘运限";
    if (view === "research") return "命盘研读";
    return "命盘结构";
  }
  return "页面未找到";
}

function RouteReadySignal({ onReady, routeKey }: { onReady?: (routeKey: string) => void; routeKey: string }) {
  useEffect(() => {
    onReady?.(routeKey);
  }, [onReady, routeKey]);
  return null;
}

class RouteIntegrityBoundary extends Component<{
  children: ReactNode;
  onFailure: (error: Error) => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onFailure(error);
  }

  render() {
    return this.state.failed
      ? <div className="route-loading" role="status">正在切换到只读恢复模式…</div>
      : this.props.children;
  }
}

function BootFailureShell({
  failure,
  view
}: {
  failure: AppBootFailure;
  view: BootFailureRecoveryView;
}) {
  return (
    <div className="boot-failure-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="boot-failure-header">
        <div className="boot-failure-brand">
          <img src="/brand-mark.svg" alt="" width="40" height="40" />
          <span><strong>哈基米</strong><small>八字研究台</small></span>
        </div>
        <strong>只读恢复模式</strong>
      </header>
      <main id="main-content" tabIndex={-1}>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">已打开：{view === "backup" ? "只读安全备份" : "启动恢复诊断"}</p>
        <BootFailureRecoveryPage failure={failure} view={view} />
      </main>
    </div>
  );
}

function BootVerificationNotice({ routeMountAllowed }: { routeMountAllowed: boolean }) {
  return (
    <div className="app-boot-verification" role="status" aria-live="polite" aria-atomic="true">
      <div>
        <span className="button-busy-dot" aria-hidden="true" />
        <strong>{routeMountAllowed ? "正在确认当前页面可安全打开" : "正在检查本地数据与计算核心"}</strong>
        <p>{routeMountAllowed
          ? "当前页面已在不可操作状态下加载；完成渲染与一帧检查前，不会确认新的离线缓存版本。"
          : "普通研究路由尚未挂载；数据库与固定计算烟测通过后，才会加载当前页面。"}</p>
      </div>
    </div>
  );
}

function RuntimeFailureShell({ failure }: { failure: Pick<AppBootFailure, "source" | "error"> }) {
  return (
    <div className="boot-failure-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="boot-failure-header">
        <div className="boot-failure-brand">
          <img src="/brand-mark.svg" alt="" width="40" height="40" />
          <span><strong>哈基米</strong><small>八字研究台</small></span>
        </div>
        <strong>运行时故障</strong>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="page page--boot-recovery">
          <section className="error-panel app-boot-failure" role="alert" aria-labelledby="runtime-failure-title">
            <div>
              <p className="eyebrow">Runtime failure</p>
              <h1 id="runtime-failure-title">当前页面运行失败</h1>
              <p>本次启动与离线版本确认已经完成；这个后续运行错误不会被误报为启动失败，也不会改写 Service Worker 的启动确认。</p>
              <p>故障阶段：<code>{failure.source}</code>。为保护本地研究资料，这里不显示原始异常正文或调用栈。</p>
              <p><strong>请重新载入当前页面。</strong>如果重复出现，请先保留浏览器资料，再从一次正常启动的设置页导出完整备份。</p>
              <button type="button" className="primary-action" onClick={() => window.location.reload()}>重新载入当前页</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function App({
  onRouteReady,
  routeMountAllowed = true,
  bootPending = false,
  bootFailure = null,
  runtimeFailure = null,
  onRouteFailure
}: {
  onRouteReady?: (routeKey: string) => void;
  routeMountAllowed?: boolean;
  bootPending?: boolean;
  bootFailure?: AppBootFailure | null;
  runtimeFailure?: Pick<AppBootFailure, "source" | "error"> | null;
  onRouteFailure?: (error: Error) => "boot" | "runtime";
} = {}) {
  const location = useAppLocation();
  const [routeFailure, setRouteFailure] = useState<AppBootFailure | null>(null);
  const [routeRuntimeFailure, setRouteRuntimeFailure] = useState<Pick<AppBootFailure, "source" | "error"> | null>(null);
  const effectiveBootFailure = bootFailure ?? routeFailure;
  const effectiveRuntimeFailure = runtimeFailure ?? routeRuntimeFailure;
  const recoveryView: BootFailureRecoveryView = location.pathname === "/settings/data" ? "backup" : "diagnostic";
  const pageTitle = effectiveBootFailure
    ? recoveryView === "backup" ? "只读安全备份" : "启动恢复诊断"
    : effectiveRuntimeFailure ? "页面运行故障"
    : !routeMountAllowed ? "启动完整性检查"
    : resolvePageTitle(location.pathname, location.search);

  useEffect(() => {
    document.title = `${pageTitle} · 哈基米八字研究台`;
  }, [pageTitle]);

  if (effectiveBootFailure) {
    return <BootFailureShell failure={effectiveBootFailure} view={recoveryView} />;
  }

  if (effectiveRuntimeFailure) {
    return <RuntimeFailureShell failure={effectiveRuntimeFailure} />;
  }

  if (!routeMountAllowed) {
    return <div className="app-boot-preflight-shell"><BootVerificationNotice routeMountAllowed={false} /></div>;
  }

  return (
    <>
      {bootPending ? <BootVerificationNotice routeMountAllowed /> : null}
      <div className={bootPending ? "app-boot-pending-content" : undefined} inert={bootPending ? true : undefined} aria-hidden={bootPending ? true : undefined}>
        <LocalAppSettingsProvider>
          <AppShell pathname={location.pathname}>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">已打开：{pageTitle}</p>
            <RouteIntegrityBoundary onFailure={(error) => {
              const phase = onRouteFailure?.(error) ?? (bootPending ? "boot" : "runtime");
              if (phase === "boot") {
                setRouteFailure({ storageReady: true, source: "route", error });
              } else {
                setRouteRuntimeFailure({ source: "route", error });
              }
            }}>
              <Suspense fallback={<div className="route-loading" role="status" aria-label="正在打开研究页面"><span /><span /></div>}>
                {resolvePage(location.pathname)}
                <RouteReadySignal onReady={onRouteReady} routeKey={`${location.pathname}${location.search}`} />
              </Suspense>
            </RouteIntegrityBoundary>
          </AppShell>
        </LocalAppSettingsProvider>
      </div>
    </>
  );
}
