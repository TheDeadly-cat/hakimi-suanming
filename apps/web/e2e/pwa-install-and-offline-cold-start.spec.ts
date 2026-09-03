import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Page, Response } from "@playwright/test";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol";
import { DEFAULT_V13_RELEASE_BROWSER_IDENTITY } from "../playwright.release-browser-matrix.ts";
import { pageReleaseEvidence } from "./cross-schema-upgrade-helpers";
import {
  MOBILE_VIEWPORT,
  collectConsoleProblems,
  createDemoCase,
  expectMobileNoOverflow,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";
import {
  launchReleasePersistentContext,
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context.ts";

type ServiceWorkerRuntimeObservation = {
  origin: string;
  controllerScriptUrl: string;
  controllerState: string;
  registrationScope: string;
  activeScriptUrl: string;
  activeState: string;
  waitingScriptUrl: string | null;
  installingScriptUrl: string | null;
  workerMessage: Record<string, unknown>;
};

async function observeServiceWorkerRuntime(
  page: Page
): Promise<ServiceWorkerRuntimeObservation> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const controller = navigator.serviceWorker.controller;
    const active = registration?.active ?? null;
    if (!registration || !controller || !active) {
      throw new Error("Service Worker registration, controller, and active worker must all exist.");
    }

    const workerMessage = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const channel = new MessageChannel();
      let settled = false;
      const cleanup = () => {
        window.clearTimeout(timeout);
        channel.port1.onmessage = null;
        channel.port1.onmessageerror = null;
        channel.port1.close();
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const timeout = window.setTimeout(() => {
        finish(() => reject(new Error("Service Worker build identity query timed out.")));
      }, 5_000);
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        finish(() => {
          if (
            event.data === null
            || typeof event.data !== "object"
            || Array.isArray(event.data)
          ) {
            reject(new Error("Service Worker build identity reply must be an object."));
            return;
          }
          resolve(event.data as Record<string, unknown>);
        });
      };
      channel.port1.onmessageerror = () => {
        finish(() => reject(new Error("Service Worker build identity reply could not be decoded.")));
      };
      try {
        controller.postMessage({ type: "GET_BUILD_VERSION" }, [channel.port2]);
      } catch (error) {
        finish(() => reject(error));
      }
    });

    return {
      origin: window.location.origin,
      controllerScriptUrl: controller.scriptURL,
      controllerState: controller.state,
      registrationScope: registration.scope,
      activeScriptUrl: active.scriptURL,
      activeState: active.state,
      waitingScriptUrl: registration.waiting?.scriptURL ?? null,
      installingScriptUrl: registration.installing?.scriptURL ?? null,
      workerMessage
    };
  });
}

function expectLockedServiceWorkerIdentity(
  observation: ServiceWorkerRuntimeObservation,
  baseURL: string,
  buildVersion: string
): void {
  const origin = new URL(baseURL).origin;
  expect(observation).toMatchObject({
    origin,
    controllerScriptUrl: `${origin}/sw.js`,
    controllerState: "activated",
    registrationScope: `${origin}/`,
    activeScriptUrl: `${origin}/sw.js`,
    activeState: "activated",
    waitingScriptUrl: null,
    installingScriptUrl: null
  });
  expect(observation.workerMessage).toEqual({
    type: "BUILD_VERSION",
    buildVersion,
    ...BRIDGE_RELEASE_DATABASE_DESCRIPTOR
  });
}

test("生产 PWA 通过可安装性检查，区分安装请求与完成，并可离线冷启动深链", async ({
  baseURL
}, testInfo) => {
  test.setTimeout(120_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  // Playwright 的默认隔离 context 会被 Chromium 固定判为 in-incognito，无法证明
  // 产品自身的安装资格。这里使用测试输出目录中的一次性持久 profile，仍不接触
  // 用户真实浏览器资料，同时让 Page.getInstallabilityErrors 审计产品本身。
  const context = await launchReleasePersistentContext({
    projectName: testInfo.project.name,
    userDataDir: testInfo.outputPath(`${testInfo.project.name}-pwa-profile`)
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.setViewportSize(MOBILE_VIEWPORT);
  const onlineProblems = collectConsoleProblems(page);
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expect(page).toHaveTitle("工作台 · 哈基米八字研究台");
    expect(testInfo.project.metadata.releaseIdentity).toEqual(
      DEFAULT_V13_RELEASE_BROWSER_IDENTITY
    );
    await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
      appBootReady: "true",
      dbGeneration: DEFAULT_V13_RELEASE_BROWSER_IDENTITY.dbGeneration,
      dbSchema: String(DEFAULT_V13_RELEASE_BROWSER_IDENTITY.targetSchema),
      evidenceId: process.env.HAKIMI_RELEASE_EVIDENCE_ID ?? "unbound-local-build",
      descriptor: BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    });
    const pageIdentity = await pageReleaseEvidence(page);
    const buildVersion = pageIdentity.buildVersion;
    if (
      typeof buildVersion !== "string"
      || !/^[a-f0-9]{12}$/u.test(buildVersion)
    ) {
      throw new Error("Locked release page buildVersion is missing or invalid.");
    }
    expectLockedServiceWorkerIdentity(
      await observeServiceWorkerRuntime(page),
      baseURL,
      buildVersion
    );

    const devtools = await context.newCDPSession(page);
    await devtools.send("Page.enable");
    const runtimeBrowserVersion = await devtools.send("Browser.getVersion");
    requireReleaseBrowserRuntimeProduct(
      testInfo.project.name,
      runtimeBrowserVersion.product
    );
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

    await createDemoCase(page);
    const revisionPath = new URL(page.url()).pathname;
    expect(revisionPath).toMatch(/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/iu);

    await devtools.send("Network.enable");
    await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
    await devtools.send("Network.clearBrowserCache");
    await context.setOffline(true);
    await page.close();

    const offlinePage = await context.newPage();
    const offlineProblems = collectConsoleProblems(offlinePage);
    await offlinePage.setViewportSize(MOBILE_VIEWPORT);
    const settingsResponse = await offlinePage.goto(`${baseURL}/settings/data`, {
      waitUntil: "domcontentloaded"
    });
    expect(settingsResponse, "离线 /settings/data 导航必须返回响应").not.toBeNull();
    expect(settingsResponse!.fromServiceWorker(), "离线 /settings/data 响应必须来自 Service Worker").toBe(true);
    await expect(offlinePage).toHaveTitle("数据管理与完整备份 · 哈基米八字研究台");
    await expect(offlinePage.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
    await waitForAppReady(offlinePage);
    await waitForServiceWorker(offlinePage);
    expectLockedServiceWorkerIdentity(
      await observeServiceWorkerRuntime(offlinePage),
      baseURL,
      buildVersion
    );
    await expect(offlinePage.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).toBeVisible();
    await expectMobileNoOverflow(offlinePage);
    await offlinePage.screenshot({
      path: testInfo.outputPath("pwa-offline-deep-link-390.png"),
      fullPage: false
    });
    expect(offlineProblems).toEqual([]);
    await offlinePage.close();

    const offlineRevisionPage = await context.newPage();
    const offlineRevisionProblems = collectConsoleProblems(offlineRevisionPage);
    await offlineRevisionPage.setViewportSize(MOBILE_VIEWPORT);
    const revisionResponse = await offlineRevisionPage.goto(`${baseURL}${revisionPath}`, {
      waitUntil: "domcontentloaded"
    });
    expect(revisionResponse, "离线精确 case/revision 导航必须返回响应").not.toBeNull();
    expect(
      revisionResponse!.fromServiceWorker(),
      "离线精确 case/revision 响应必须来自 Service Worker"
    ).toBe(true);
    await expect(offlineRevisionPage).toHaveURL(`${baseURL}${revisionPath}`);
    await expect(offlineRevisionPage.getByRole("heading", { name: "演示案例 · 辰时研究" })).toBeVisible();
    await waitForAppReady(offlineRevisionPage);
    await waitForServiceWorker(offlineRevisionPage);
    expectLockedServiceWorkerIdentity(
      await observeServiceWorkerRuntime(offlineRevisionPage),
      baseURL,
      buildVersion
    );
    await expect(
      offlineRevisionPage.getByRole("combobox", { name: "历史 Revision" })
    ).toBeVisible();
    await expectMobileNoOverflow(offlineRevisionPage);
    await offlineRevisionPage.screenshot({
      path: testInfo.outputPath("pwa-offline-case-revision-deep-link-390.png"),
      fullPage: false
    });
    expect(offlineRevisionProblems).toEqual([]);
    await offlineRevisionPage.close();

    const offlineHelpPage = await context.newPage();
    const offlineHelpProblems = collectConsoleProblems(offlineHelpPage);
    await offlineHelpPage.setViewportSize(MOBILE_VIEWPORT);

    const expectOfflineHelpReady = async (
      phase: "cold-start" | "reload",
      navigationResponse: Response | null
    ) => {
      expect(navigationResponse, `/help 离线 ${phase} 导航必须返回响应`).not.toBeNull();
      expect(
        navigationResponse!.fromServiceWorker(),
        `/help 离线 ${phase} 响应必须来自 Service Worker`
      ).toBe(true);
      await expect(offlineHelpPage).toHaveURL(`${baseURL}/help`);
      await expect(offlineHelpPage).toHaveTitle("帮助与安全边界 · 哈基米八字研究台");
      await expect(offlineHelpPage.getByRole("heading", { name: "帮助与安全边界", level: 1 })).toBeVisible();
      await waitForAppReady(offlineHelpPage);
      await waitForServiceWorker(offlineHelpPage);
      expectLockedServiceWorkerIdentity(
        await observeServiceWorkerRuntime(offlineHelpPage),
        baseURL,
        buildVersion
      );
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

    const helpColdStartResponse = await offlineHelpPage.goto(`${baseURL}/help`, {
      waitUntil: "domcontentloaded"
    });
    await expectOfflineHelpReady("cold-start", helpColdStartResponse);
    const helpReloadResponse = await offlineHelpPage.reload({ waitUntil: "domcontentloaded" });
    await expectOfflineHelpReady("reload", helpReloadResponse);
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
