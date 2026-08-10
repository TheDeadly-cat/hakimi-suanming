import { chromium, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  MOBILE_VIEWPORT,
  collectConsoleProblems,
  expectMobileNoOverflow,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

test("生产 PWA 通过可安装性检查，区分安装请求与完成，并可离线冷启动深链", async ({
  baseURL
}, testInfo) => {
  test.setTimeout(120_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  // Playwright 的默认隔离 context 会被 Chromium 固定判为 in-incognito，无法证明
  // 产品自身的安装资格。这里使用测试输出目录中的一次性持久 profile，仍不接触
  // 用户真实浏览器资料，同时让 Page.getInstallabilityErrors 审计产品本身。
  const context = await chromium.launchPersistentContext(testInfo.outputPath("edge-pwa-profile"), {
    channel: "msedge",
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow",
    viewport: MOBILE_VIEWPORT
  });
  const page = context.pages()[0] ?? await context.newPage();
  const onlineProblems = collectConsoleProblems(page);
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expect(page).toHaveTitle("工作台 · 哈基米八字研究台");

    const devtools = await context.newCDPSession(page);
    await devtools.send("Page.enable");
    const [installability, appManifest] = await Promise.all([
      devtools.send("Page.getInstallabilityErrors"),
      devtools.send("Page.getAppManifest")
    ]);
    expect(installability.installabilityErrors).toEqual([]);
    expect(new URL(appManifest.url).pathname).toBe("/manifest.webmanifest");
    expect(appManifest.errors).toEqual([]);

    const manifestAudit = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest", { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    const manifest = await response.json() as {
      id?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };
    const icons = await Promise.all((manifest.icons ?? []).map(async (icon) => {
      const iconResponse = await fetch(icon.src, { cache: "no-store" });
      if (!iconResponse.ok) throw new Error(`${icon.src} HTTP ${iconResponse.status}`);
      const blob = await iconResponse.blob();
      const bitmap = await createImageBitmap(blob);
      const result = {
        ...icon,
        contentType: iconResponse.headers.get("content-type"),
        width: bitmap.width,
        height: bitmap.height
      };
      bitmap.close();
      return result;
    }));
    return { manifest, icons };
    });
    expect(manifestAudit.manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone"
    });
    expect(manifestAudit.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192", contentType: "image/png", width: 192, height: 192 }),
    expect.objectContaining({ sizes: "512x512", contentType: "image/png", width: 512, height: 512 }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable", width: 512, height: 512 })
    ]));

    const defaultPrevented = await page.evaluate(() => {
    document.documentElement.dataset.e2eInstallPromptCount = "0";
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: async () => {
          const root = document.documentElement;
          root.dataset.e2eInstallPromptCount = String(Number(root.dataset.e2eInstallPromptCount ?? "0") + 1);
        }
      },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" })
      }
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
    });
    expect(defaultPrevented).toBe(true);

    const installBanner = page.locator(".pwa-install-banner");
    await expect(installBanner).toContainText("把研究台安装为 Web 应用");
    await expect(installBanner).toContainText("不会把数据同步到其他设备");
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
      .analyze();
    expect(axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target)
    })), "390×844 PWA 安装提示存在 WCAG A/AA 错误").toEqual([]);
    await installBanner.getByRole("button", { name: "安装 Web 应用", exact: true }).click();
    await expect.poll(() => page.locator("html").getAttribute("data-e2e-install-prompt-count")).toBe("1");
    await expect(installBanner).toContainText("浏览器已接受安装请求；是否完成以系统安装结果为准");
    await expect(installBanner).not.toContainText("浏览器已报告安装完成");
    await expect(installBanner.getByRole("status")).toBeFocused();

    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(installBanner).toContainText("Web 应用安装完成");
    await expect(installBanner).toContainText("浏览器已报告安装完成");
    await expectMobileNoOverflow(page);
    await installBanner.getByRole("button", { name: "关闭安装提示", exact: true }).click();
    await expect(installBanner).toHaveCount(0);

    await devtools.send("Network.enable");
    await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
    await devtools.send("Network.clearBrowserCache");
    await context.setOffline(true);
    await page.close();

    const offlinePage = await context.newPage();
    const offlineProblems = collectConsoleProblems(offlinePage);
    await offlinePage.setViewportSize(MOBILE_VIEWPORT);
    await offlinePage.goto(`${baseURL}/settings/data`, { waitUntil: "domcontentloaded" });
    await expect(offlinePage).toHaveTitle("数据管理与完整备份 · 哈基米八字研究台");
    await expect(offlinePage.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
    await waitForAppReady(offlinePage);
    await waitForServiceWorker(offlinePage);
    await expect(offlinePage.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).toBeVisible();
    await expectMobileNoOverflow(offlinePage);
    await offlinePage.screenshot({
      path: testInfo.outputPath("pwa-offline-deep-link-390.png"),
      fullPage: false
    });
    expect(offlineProblems).toEqual([]);
    await offlinePage.close();

    const offlineHelpPage = await context.newPage();
    const offlineHelpProblems = collectConsoleProblems(offlineHelpPage);
    await offlineHelpPage.setViewportSize(MOBILE_VIEWPORT);

    const expectOfflineHelpReady = async (phase: "cold-start" | "reload") => {
      await expect(offlineHelpPage).toHaveURL(`${baseURL}/help`);
      await expect(offlineHelpPage).toHaveTitle("帮助与安全边界 · 哈基米八字研究台");
      await expect(offlineHelpPage.getByRole("heading", { name: "帮助与安全边界", level: 1 })).toBeVisible();
      await waitForAppReady(offlineHelpPage);
      await waitForServiceWorker(offlineHelpPage);
      await expectMobileNoOverflow(offlineHelpPage);

      const backupCta = offlineHelpPage.getByRole("link", { name: "检查完整备份", exact: true });
      const demoCta = offlineHelpPage.getByRole("link", { name: "打开演示排盘", exact: true });
      const mobileHelpEntry = offlineHelpPage.locator(".mobile-topbar")
        .getByRole("link", { name: "帮助与安全边界", exact: true });
      await expect(backupCta).toBeVisible();
      await expect(backupCta).toHaveAttribute("href", "/settings/data");
      await expect(demoCta).toBeVisible();
      await expect(demoCta).toHaveAttribute("href", "/new?demo=1");
      await expect(mobileHelpEntry).toBeVisible();
      await expect(mobileHelpEntry).toHaveAttribute("aria-current", "page");

      for (const [label, target] of [
        ["完整备份 CTA", backupCta],
        ["演示排盘 CTA", demoCta],
        ["手机 Help 入口", mobileHelpEntry]
      ] as const) {
        const box = await target.boundingBox();
        expect(box, `${phase} ${label} 必须可测量`).not.toBeNull();
        expect(box!.width, `${phase} ${label} 宽度应不小于 44px`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${phase} ${label} 高度应不小于 44px`).toBeGreaterThanOrEqual(44);
      }

      const axe = await new AxeBuilder({ page: offlineHelpPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
        .analyze();
      expect(axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.flatMap((node) => node.target)
      })), `390×844 /help 离线 ${phase} 存在 WCAG A/AA 错误`).toEqual([]);
      expect(offlineHelpProblems, `/help 离线 ${phase} 不应有 console error/warning`).toEqual([]);
    };

    await offlineHelpPage.goto(`${baseURL}/help`, { waitUntil: "domcontentloaded" });
    await expectOfflineHelpReady("cold-start");
    await offlineHelpPage.reload({ waitUntil: "domcontentloaded" });
    await expectOfflineHelpReady("reload");
    await offlineHelpPage.screenshot({
      path: testInfo.outputPath("pwa-offline-help-reload-390.png"),
      fullPage: false
    });
    expect(offlineHelpProblems).toEqual([]);
  } finally {
    if (context.pages().length > 0) await context.setOffline(false);
    await context.close();
  }

  expect(onlineProblems).toEqual([]);
});
