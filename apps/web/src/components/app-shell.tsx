import {
  BookOpenText,
  CircleHelp,
  Columns3,
  Database,
  HardDrive,
  LayoutDashboard,
  Plus,
  Settings,
  WifiOff
} from "lucide-react";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CANDIDATE_SET_ROUTE, CASE_REVISE_ROUTE, CASE_REVISION_ROUTE } from "../lib/app-route-patterns";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { useLocalAppSettings } from "../lib/local-app-settings";
import { AppLink } from "../lib/router";
import { useOnlineStatus } from "../lib/use-online-status";
import { PwaInstallBanner } from "./pwa-install-banner";
import "./app-shell-polish.css";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
};

const MAX_INTERNAL_ROUTE_PATH_LENGTH = 2_048;
type RoutePreloadPolicy = "enabled" | "offline" | "reduced_data";

function currentRoutePreloadPolicy(online: boolean): RoutePreloadPolicy {
  if (!online) return "offline";
  try {
    const connection = typeof navigator === "undefined"
      ? undefined
      : (navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
      return "reduced_data";
    }
    if (
      typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-data: reduce)").matches
    ) {
      return "reduced_data";
    }
  } catch {
    // Capability hints are advisory; a read failure does not disable ordinary navigation.
  }
  return "enabled";
}

function routePreloadFamily(pathname: string): string {
  if (CANDIDATE_SET_ROUTE.test(pathname)) return "/candidate-sets/:candidateSetId";
  if (CASE_REVISE_ROUTE.test(pathname)) return "/cases/:caseId/revisions/:revisionId/revise";
  if (CASE_REVISION_ROUTE.test(pathname)) return "/cases/:caseId/revisions/:revisionId";
  return pathname;
}

function isCaseWorkflowPath(pathname: string): boolean {
  return pathname === "/cases"
    || pathname === "/cases/research"
    || CANDIDATE_SET_ROUTE.test(pathname)
    || CASE_REVISION_ROUTE.test(pathname)
    || CASE_REVISE_ROUTE.test(pathname);
}

function isCompareWorkflowPath(pathname: string): boolean {
  return pathname === "/compare" || pathname === "/compare/pair";
}

function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "工作台",
    shortLabel: "工作台",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/"
  },
  {
    href: "/cases",
    label: "案例库",
    shortLabel: "案例",
    icon: Database,
    match: isCaseWorkflowPath
  },
  {
    href: "/compare",
    label: "对照台",
    shortLabel: "对照",
    icon: Columns3,
    match: isCompareWorkflowPath
  },
  {
    href: "/knowledge",
    label: "典籍与术语",
    shortLabel: "知识",
    icon: BookOpenText,
    match: (pathname) => pathname === "/knowledge"
  }
];

const createNavItem: NavItem = {
  href: "/new",
  label: "新建排盘",
  shortLabel: "排盘",
  icon: Plus,
  match: (pathname) => pathname === "/new"
};

const mobileNavItems: NavItem[] = [
  navItems[0]!,
  navItems[1]!,
  createNavItem,
  navItems[2]!,
  navItems[3]!
];

type RouteContext = {
  group: string;
  label: string;
};

function routeContextForLocation(pathname: string, search: string): RouteContext {
  const view = new URLSearchParams(search).get("view");
  if (pathname === "/") return { group: "研究工作流", label: "工作台" };
  if (pathname === "/new") return { group: "排盘工作流", label: "新建排盘" };
  if (pathname === "/cases/research") return { group: "案例工作流", label: "专业研究检索" };
  if (pathname === "/cases") return { group: "案例工作流", label: "案例库" };
  if (CANDIDATE_SET_ROUTE.test(pathname)) return { group: "案例工作流", label: "未知时辰候选组" };
  if (CASE_REVISE_ROUTE.test(pathname)) return { group: "案例工作流", label: "由历史修订派生新版" };
  if (CASE_REVISION_ROUTE.test(pathname)) {
    if (view === "overview") return { group: "案例工作流", label: "命盘概览" };
    if (view === "transit") return { group: "案例工作流", label: "命盘运限" };
    if (view === "research") return { group: "案例工作流", label: "命盘研读" };
    return { group: "案例工作流", label: "命盘结构" };
  }
  if (pathname === "/compare/pair") return { group: "核对工作流", label: "双案例结构研究" };
  if (pathname === "/compare") return { group: "核对工作流", label: "命盘结构对照台" };
  if (pathname === "/knowledge") {
    if (view === "rights") return { group: "知识工作流", label: "来源权利台账" };
    if (view === "coverage") return { group: "知识工作流", label: "依据覆盖审计" };
    return { group: "知识工作流", label: "个人典籍与引用" };
  }
  if (pathname === "/help") return { group: "支持", label: "帮助与安全边界" };
  if (pathname === "/settings/data") return { group: "支持", label: "数据管理与完整备份" };
  if (pathname === "/settings/calendar-divergence-audit") return { group: "支持", label: "连续历法差异审计" };
  if (pathname === "/settings/transit-review-inbox") return { group: "支持", label: "未核验审核收件箱" };
  if (pathname === "/settings") return { group: "支持", label: "设置与诊断" };
  return { group: "路径恢复", label: "页面未找到" };
}

function Brand() {
  return (
    <AppLink href="/" className="brand" aria-label="哈基米八字研究台首页">
      <img src="/brand-mark.svg" alt="" width="40" height="40" />
      <span>
        <strong>哈基米</strong>
        <small>八字研究台</small>
      </span>
    </AppLink>
  );
}

function DesktopSidebar({ pathname, context }: { pathname: string; context: RouteContext }) {
  const settingsActive = isSettingsPath(pathname);
  const helpActive = pathname === "/help";
  return (
    <aside className="desktop-sidebar" aria-label="研究台侧栏">
      <Brand />
      <AppLink
        href="/new"
        className={`primary-action sidebar-create ${pathname === "/new" ? "is-active" : ""}`}
        aria-label="新建排盘"
        aria-current={pathname === "/new" ? "page" : undefined}
        data-label="新建排盘"
      >
        <Plus aria-hidden="true" />
        <span>新建排盘</span>
      </AppLink>
      <p className="sidebar-nav-label" aria-hidden="true">研究工作流</p>
      <nav aria-label="主导航" className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <AppLink
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "is-active" : ""}`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              data-label={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </AppLink>
          );
        })}
      </nav>
      <div className="sidebar-route-context" aria-label={`当前位置：${context.group}，${context.label}`}>
        <small>{context.group}</small>
        <strong>{context.label}</strong>
        <span aria-hidden="true">LOCAL RESEARCH</span>
      </div>
      <div className="sidebar-footer">
        <div className="storage-status" title="数据保存在当前浏览器，不会自动云同步">
          <HardDrive aria-hidden="true" />
          <span>本地保存</span>
          <strong>未自动云同步</strong>
        </div>
        <AppLink
          href="/help"
          className={`nav-item ${helpActive ? "is-active" : ""}`}
          aria-label="帮助与安全边界"
          aria-current={helpActive ? "page" : undefined}
          data-label="帮助与安全边界"
        >
          <CircleHelp aria-hidden="true" />
          <span>帮助与安全边界</span>
        </AppLink>
        <AppLink
          href="/settings"
          className={`nav-item ${settingsActive ? "is-active" : ""}`}
          aria-label="设置与诊断"
          aria-current={settingsActive ? "page" : undefined}
          data-label="设置与诊断"
        >
          <Settings aria-hidden="true" />
          <span>设置与诊断</span>
        </AppLink>
      </div>
    </aside>
  );
}

function MobileTopBar({ pathname, context }: { pathname: string; context: RouteContext }) {
  const settingsActive = isSettingsPath(pathname);
  const helpActive = pathname === "/help";
  return (
    <header className="mobile-topbar">
      <Brand />
      <div className="mobile-route-context" aria-label={`当前位置：${context.group}，${context.label}`}>
        <small>{context.group}</small>
        <strong>{context.label}</strong>
      </div>
      <div className="mobile-topbar-actions">
        <AppLink
          href="/help"
          className={`icon-button ${helpActive ? "is-active" : ""}`}
          aria-label="帮助与安全边界"
          aria-current={helpActive ? "page" : undefined}
        >
          <CircleHelp aria-hidden="true" />
        </AppLink>
        <AppLink
          href="/settings"
          className={`icon-button ${settingsActive ? "is-active" : ""}`}
          aria-label="设置与诊断"
          aria-current={settingsActive ? "page" : undefined}
        >
          <Settings aria-hidden="true" />
        </AppLink>
      </div>
    </header>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="手机主导航">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <AppLink
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${item.href === createNavItem.href ? "mobile-nav-item--create" : ""} ${active ? "is-active" : ""}`}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </AppLink>
        );
      })}
    </nav>
  );
}

function CompactRouteContext({ context }: { context: RouteContext }) {
  return (
    <div className="compact-route-context" aria-label={`当前位置：${context.group}，${context.label}`}>
      <span>{context.group}</span>
      <strong>{context.label}</strong>
      <small aria-hidden="true">LOCAL RESEARCH</small>
    </div>
  );
}

function shortReleaseDigest(value: string | null): string {
  if (!value) return "未登记";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function ResearchPreviewBoundary() {
  const identity = CURRENT_RELEASE_ENGINEERING_IDENTITY;
  const evidenceId = identity.evidenceId || null;
  const evidenceState = !identity.evidenceBound
    ? "unbound"
    : evidenceId
      ? "bound"
      : "incomplete";
  const evidenceSummary = !identity.evidenceBound
    ? "工程证据未绑定"
    : evidenceId
      ? "工程证据标识已绑定"
      : "证据绑定声明不完整";
  return (
    <div
      className="preview-banner"
      role="note"
      aria-label="研究预览边界"
      data-db-generation={identity.dbGeneration}
      data-release-identity={identity.dbGeneration}
      data-release-family={identity.dbGeneration}
      data-schema-family={identity.dbGeneration}
      data-target-schema={identity.targetSchema}
      data-migration-id={identity.migrationId ?? "null"}
      data-engineering-evidence-state={evidenceState}
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-mutation-epoch-bypassed="false"
      data-public-release-authorized="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
    >
      <span className="preview-banner__level">
        <i aria-hidden="true" />
        本地研究预览
      </span>
      <p>这里仅展示登记的工程身份与证据标识；本页不校验当前源码或构建是否仍与证据包一致，也不代表专家真值或公开发布授权。</p>
      <AppLink href="/help" className="preview-banner__link">了解边界</AppLink>
      <details className="preview-banner__details">
        <summary>
          <span>登记工程身份</span>
          <strong><code>{identity.dbGeneration}</code> · Schema <code>{identity.targetSchema}</code> · migration <code>{identity.migrationId ?? "null"}</code></strong>
          <small data-evidence-state={evidenceState}>{evidenceSummary} · 当前构建未在此校验</small>
        </summary>
        <dl className="preview-banner__ledger" aria-label="当前工程发布身份详情">
          <div><dt>数据库代际</dt><dd><code>{identity.dbGeneration}</code></dd></div>
          <div><dt>目标 Schema</dt><dd><code>{identity.targetSchema}</code></dd></div>
          <div><dt>migrationId</dt><dd><code>{identity.migrationId ?? "null"}</code></dd></div>
          <div><dt>构建版本</dt><dd><code>{identity.buildVersion ?? "未登记"}</code></dd></div>
          <div><dt>存储清单摘要</dt><dd><code title={identity.manifestDigest ?? undefined}>{shortReleaseDigest(identity.manifestDigest)}</code></dd></div>
          <div data-evidence-state={evidenceState}>
            <dt>Release Evidence</dt>
            <dd>
              <span className="preview-banner__evidence-summary">{evidenceSummary}</span>
              {evidenceId ? <code className="preview-banner__evidence-id">{evidenceId}</code> : null}
            </dd>
          </div>
          <div className="preview-banner__authorization"><dt>验证与授权边界</dt><dd>登记的工程证据标识未在此校验当前工作树或构建；工程证据不等于专家真值，也不表示已获公开发布授权。</dd></div>
        </dl>
      </details>
    </div>
  );
}

const MemoizedDesktopSidebar = memo(DesktopSidebar);
const MemoizedMobileTopBar = memo(MobileTopBar);
const MemoizedMobileBottomNav = memo(MobileBottomNav);
const MemoizedCompactRouteContext = memo(CompactRouteContext);
const MemoizedResearchPreviewBoundary = memo(ResearchPreviewBoundary);

type AppShellProps = {
  pathname: string;
  search?: string;
  children: ReactNode;
  onPreloadRoute?: (pathname: string) => Promise<void>;
};

export function AppShell({ pathname, search = "", children, onPreloadRoute }: AppShellProps) {
  const releaseIdentity = CURRENT_RELEASE_ENGINEERING_IDENTITY;
  const online = useOnlineStatus();
  const { settings } = useLocalAppSettings();
  const routeContext = useMemo(() => routeContextForLocation(pathname, search), [pathname, search]);
  const currentRouteFamily = useMemo(() => routePreloadFamily(pathname), [pathname]);
  const preloadPolicy = currentRoutePreloadPolicy(online);
  const focusNavigationKey = `${pathname}\u0000${routeContext.group}\u0000${routeContext.label}`;
  const mainRef = useRef<HTMLElement>(null);
  const previousFocusNavigationKeyRef = useRef(focusNavigationKey);
  const preloadedRouteFamiliesRef = useRef(new Set<string>());
  const routePreloadEpochRef = useRef(0);

  const handleRoutePreloadIntent = ({ target }: { target: EventTarget | null }) => {
    if (currentRoutePreloadPolicy(online) !== "enabled" || !onPreloadRoute || !(target instanceof Element)) return;
    const link = target.closest("a[href]");
    const href = link?.getAttribute("href");
    if (
      !(link instanceof HTMLAnchorElement)
      || !href?.startsWith("/")
      || link.hasAttribute("download")
      || (link.target && link.target !== "_self")
    ) return;

    let routeUrl: URL;
    try {
      routeUrl = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (routeUrl.pathname.length > MAX_INTERNAL_ROUTE_PATH_LENGTH) return;
    const routeFamily = routePreloadFamily(routeUrl.pathname);
    if (
      routeUrl.origin !== window.location.origin
      || routeFamily === currentRouteFamily
      || preloadedRouteFamiliesRef.current.has(routeFamily)
    ) return;

    const preloadEpoch = routePreloadEpochRef.current;
    preloadedRouteFamiliesRef.current.add(routeFamily);
    try {
      void onPreloadRoute(routeUrl.pathname).catch(() => {
        if (routePreloadEpochRef.current === preloadEpoch) {
          preloadedRouteFamiliesRef.current.delete(routeFamily);
        }
      });
    } catch {
      if (routePreloadEpochRef.current === preloadEpoch) {
        preloadedRouteFamiliesRef.current.delete(routeFamily);
      }
    }
  };

  useEffect(() => {
    if (previousFocusNavigationKeyRef.current === focusNavigationKey) return;
    previousFocusNavigationKeyRef.current = focusNavigationKey;
    mainRef.current?.focus({ preventScroll: true });
  }, [focusNavigationKey]);

  useEffect(() => {
    routePreloadEpochRef.current += 1;
    preloadedRouteFamiliesRef.current.clear();
  }, [onPreloadRoute]);

  return (
    <div
      className="app-shell"
      data-density={settings.preferredDensity}
      data-route-group={routeContext.group}
      data-route-context={routeContext.label}
      data-online={online ? "true" : "false"}
      data-route-preload-policy={preloadPolicy}
      data-release-identity={releaseIdentity.dbGeneration}
      data-release-family={releaseIdentity.dbGeneration}
      data-schema-family={releaseIdentity.dbGeneration}
      data-db-generation={releaseIdentity.dbGeneration}
      data-target-schema={releaseIdentity.targetSchema}
      data-migration-id={releaseIdentity.migrationId ?? "null"}
      data-engineering-evidence-only="true"
      data-release-evidence-bound={releaseIdentity.evidenceBound ? "true" : "false"}
      data-current-build-evidence-verified="false"
      data-mutation-epoch-bypassed="false"
      data-public-release-authorized="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      onFocusCapture={handleRoutePreloadIntent}
      onPointerDownCapture={handleRoutePreloadIntent}
      onPointerOver={handleRoutePreloadIntent}
    >
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {online ? "浏览器报告当前在线。" : "浏览器报告当前离线；部分联网功能不可用。"}
      </span>
      <MemoizedDesktopSidebar pathname={pathname} context={routeContext} />
      <MemoizedMobileTopBar pathname={pathname} context={routeContext} />
      <div className="app-column">
        {!online ? (
          <div className="global-status" role="note" data-offline-cache-verified="false">
            <WifiOff aria-hidden="true" />
            <span>
              <strong>浏览器报告当前离线</strong>
              <small>当前已加载的本地功能可继续使用；这不证明全部页面或资源已缓存，在线地点搜索不可用。</small>
            </span>
          </div>
        ) : null}
        <PwaInstallBanner />
        <MemoizedResearchPreviewBoundary />
        <MemoizedCompactRouteContext context={routeContext} />
        <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1} aria-label={`${routeContext.label}主要内容`}>
          {children}
        </main>
      </div>
      <MemoizedMobileBottomNav pathname={pathname} />
    </div>
  );
}
