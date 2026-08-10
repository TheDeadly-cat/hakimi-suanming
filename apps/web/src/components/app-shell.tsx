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
import { type ReactNode, useEffect, useRef } from "react";
import { useLocalAppSettings } from "../lib/local-app-settings";
import { AppLink } from "../lib/router";
import { useOnlineStatus } from "../lib/use-online-status";
import { PwaInstallBanner } from "./pwa-install-banner";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
};

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
    match: (pathname) => pathname.startsWith("/cases") || pathname.startsWith("/candidate-sets/")
  },
  {
    href: "/compare",
    label: "对照台",
    shortLabel: "对照",
    icon: Columns3,
    match: (pathname) => pathname.startsWith("/compare")
  },
  {
    href: "/knowledge",
    label: "典籍与术语",
    shortLabel: "知识",
    icon: BookOpenText,
    match: (pathname) => pathname.startsWith("/knowledge")
  }
];

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

function DesktopSidebar({ pathname }: { pathname: string }) {
  const settingsActive = pathname.startsWith("/settings");
  const helpActive = pathname === "/help";
  return (
    <aside className="desktop-sidebar" aria-label="研究台侧栏">
      <Brand />
      <AppLink
        href="/new"
        className={`primary-action sidebar-create ${pathname === "/new" ? "is-active" : ""}`}
        aria-current={pathname === "/new" ? "page" : undefined}
      >
        <Plus aria-hidden="true" />
        <span>新建排盘</span>
      </AppLink>
      <nav aria-label="主导航" className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <AppLink key={item.href} href={item.href} className={`nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </AppLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="storage-status">
          <HardDrive aria-hidden="true" />
          <span>本地保存</span>
          <strong>仅此浏览器</strong>
        </div>
        <AppLink
          href="/help"
          className={`nav-item ${helpActive ? "is-active" : ""}`}
          aria-current={helpActive ? "page" : undefined}
        >
          <CircleHelp aria-hidden="true" />
          <span>帮助与安全边界</span>
        </AppLink>
        <AppLink
          href="/settings"
          className={`nav-item ${settingsActive ? "is-active" : ""}`}
          aria-current={settingsActive ? "page" : undefined}
        >
          <Settings aria-hidden="true" />
          <span>设置与诊断</span>
        </AppLink>
      </div>
    </aside>
  );
}

function MobileTopBar({ pathname }: { pathname: string }) {
  const settingsActive = pathname.startsWith("/settings");
  const helpActive = pathname === "/help";
  return (
    <header className="mobile-topbar">
      <Brand />
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
  const items = [
    navItems[0],
    navItems[1],
    {
      href: "/new",
      label: "新建排盘",
      shortLabel: "排盘",
      icon: Plus,
      match: (value: string) => value === "/new"
    },
    navItems[2],
    navItems[3]
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="手机主导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <AppLink key={item.href} href={item.href} className={`mobile-nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </AppLink>
        );
      })}
    </nav>
  );
}

export function AppShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const online = useOnlineStatus();
  const { settings } = useLocalAppSettings();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="app-shell" data-density={settings.preferredDensity}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <DesktopSidebar pathname={pathname} />
      <MobileTopBar pathname={pathname} />
      <div className="app-column">
        {!online ? (
          <div className="global-status" role="status">
            <WifiOff aria-hidden="true" />
            <span>当前离线 · 已保存案例与基础排盘仍可用，在线地点搜索尚未开放</span>
          </div>
        ) : null}
        <PwaInstallBanner />
        <div className="preview-banner" role="note">
          <span>P0 研究预览</span>
          <p>真实计算、真实本地存储；尚未通过 360 例金标准，不能作为 v1 稳定结果。</p>
        </div>
        <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}
