import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  MOBILE_VIEWPORT,
  collectConsoleProblems,
  disableNetworkCacheAndGoOffline,
  expectMobileNoOverflow,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const viteBin = path.resolve(workspaceRoot, "node_modules/vite/bin/vite.js");
const fixtureConfig = path.resolve(workspaceRoot, "apps/web/vite.sw-upgrade.config.ts");
const shellCachePrefix = "hakimi-shell-";
const cacheMetaPath = "/__hakimi_cache_meta__";

type FixtureFault = "none" | "research-route";

type GenerationFixture = {
  name: string;
  directory: string;
  version: string;
  entryPath: string;
  markerPath: string;
  researchRoutePath: string;
};

type CacheGeneration = {
  cacheName: string;
  installedAt: number;
  bootAttempted: boolean;
  bootConfirmed: boolean;
};

type ServerRequest = {
  generation: string;
  method: string;
  pathname: string;
  status: number;
};

type SwitchServer = {
  origin: string;
  requests: ServerRequest[];
  setGeneration: (generation: GenerationFixture, failPaths?: readonly string[]) => void;
  close: () => Promise<void>;
};

let fixtureRoot = "";
let stableA: GenerationFixture;
let healthyB: GenerationFixture;
let brokenB: GenerationFixture;
let switchServer: SwitchServer;

function contentType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".webmanifest": return "application/manifest+json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

async function buildGeneration(name: string, fault: FixtureFault): Promise<GenerationFixture> {
  const directory = path.join(fixtureRoot, name);
  const result = await execFileAsync(process.execPath, [viteBin, "build", "--config", fixtureConfig], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      HAKIMI_SW_UPGRADE_GENERATION: name,
      HAKIMI_SW_UPGRADE_OUT_DIR: directory,
      HAKIMI_SW_UPGRADE_FAULT: fault
    },
    maxBuffer: 50 * 1024 * 1024,
    windowsHide: true
  });
  if (result.stderr && !result.stderr.includes("Some chunks are larger than")) {
    throw new Error(`构建 ${name} 输出了未预期 stderr：\n${result.stderr}`);
  }

  const index = await readFile(path.join(directory, "index.html"), "utf8");
  const version = index.match(/<meta name="hakimi-build-version" content="([^"]+)"/u)?.[1];
  const entryPath = index.match(/<script[^>]+src="([^"]+\.js)"/u)?.[1];
  const assetNames = await readdir(path.join(directory, "assets"));
  const researchRouteName = assetNames.find((fileName) => /^research-query-page-.*\.js$/u.test(fileName));
  if (!version || !entryPath || !researchRouteName) {
    throw new Error(`构建 ${name} 缺少版本、入口或研究检索路由资源`);
  }
  return {
    name,
    directory,
    version,
    entryPath,
    markerPath: `/e2e-sw-generation-${name}.txt`,
    researchRoutePath: `/assets/${researchRouteName}`
  };
}

async function startSwitchServer(initialGeneration: GenerationFixture): Promise<SwitchServer> {
  let active = {
    generation: initialGeneration,
    failPaths: new Set<string>()
  };
  const requests: ServerRequest[] = [];
  const server: Server = createServer(async (request, response) => {
    const generation = active.generation;
    const method = request.method ?? "GET";
    let pathname = "/";
    try {
      pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (method !== "GET" && method !== "HEAD") {
        requests.push({ generation: generation.name, method, pathname, status: 405 });
        response.writeHead(405, { "cache-control": "no-store" });
        response.end("Method Not Allowed");
        return;
      }
      if (active.failPaths.has(pathname)) {
        requests.push({ generation: generation.name, method, pathname, status: 404 });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end("Synthetic missing precache resource");
        return;
      }

      const decoded = decodeURIComponent(pathname);
      const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
      let filePath = path.resolve(generation.directory, relative);
      const rootWithSeparator = `${path.resolve(generation.directory)}${path.sep}`;
      if (filePath !== path.resolve(generation.directory) && !filePath.startsWith(rootWithSeparator)) {
        requests.push({ generation: generation.name, method, pathname, status: 400 });
        response.writeHead(400, { "cache-control": "no-store" });
        response.end("Bad Request");
        return;
      }

      let fileExists = false;
      try {
        fileExists = (await stat(filePath)).isFile();
      } catch {
        fileExists = false;
      }
      if (!fileExists && (request.headers.accept ?? "").includes("text/html")) {
        filePath = path.join(generation.directory, "index.html");
        fileExists = true;
      }
      if (!fileExists) {
        requests.push({ generation: generation.name, method, pathname, status: 404 });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      const bytes = await readFile(filePath);
      const headers: Record<string, string> = {
        "cache-control": "no-store, max-age=0",
        "content-type": contentType(filePath),
        "x-content-type-options": "nosniff"
      };
      if (pathname === "/sw.js") headers["service-worker-allowed"] = "/";
      requests.push({ generation: generation.name, method, pathname, status: 200 });
      response.writeHead(200, headers);
      response.end(method === "HEAD" ? undefined : bytes);
    } catch (error) {
      requests.push({ generation: generation.name, method, pathname, status: 500 });
      response.writeHead(500, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Fixture server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("SW 夹具服务器未取得 TCP 地址");

  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    setGeneration(generation, failPaths = []) {
      active = { generation, failPaths: new Set(failPaths) };
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

async function pageGeneration(page: Page) {
  return page.evaluate(() => ({
    version: document.querySelector<HTMLMetaElement>('meta[name="hakimi-build-version"]')?.content ?? null,
    marker: document.documentElement.dataset.e2eSwGeneration ?? null,
    bootReady: document.documentElement.dataset.appBootReady ?? null,
    bootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null,
    updateChecked: document.documentElement.dataset.swUpdateChecked ?? null
  }));
}

async function cacheGenerations(page: Page): Promise<CacheGeneration[]> {
  return page.evaluate(async ({ prefix, metaPath }) => {
    const cacheNames = (await caches.keys()).filter((cacheName) => cacheName.startsWith(prefix));
    return Promise.all(cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const response = await cache.match(new URL(metaPath, location.origin).toString());
      if (!response) {
        return { cacheName, installedAt: -1, bootAttempted: false, bootConfirmed: false };
      }
      const metadata = await response.json() as {
        installedAt?: number;
        bootAttempted?: boolean;
        bootConfirmed?: boolean;
      };
      return {
        cacheName,
        installedAt: metadata.installedAt ?? -1,
        bootAttempted: metadata.bootAttempted === true,
        bootConfirmed: metadata.bootConfirmed === true
      };
    }));
  }, { prefix: shellCachePrefix, metaPath: cacheMetaPath });
}

async function cacheGeneration(page: Page, fixture: GenerationFixture): Promise<CacheGeneration | null> {
  const cacheName = `${shellCachePrefix}${fixture.version}`;
  return (await cacheGenerations(page)).find((generation) => generation.cacheName === cacheName) ?? null;
}

async function workerBuildVersion(
  page: Page,
  source: "controller" | "active" | "waiting" | "installing"
): Promise<string | null> {
  return page.evaluate(async (workerSource) => {
    const registration = workerSource !== "controller"
      ? await navigator.serviceWorker.getRegistration()
      : null;
    const worker = workerSource === "controller"
      ? navigator.serviceWorker.controller
      : registration?.[workerSource] ?? null;
    if (!worker) return null;
    return new Promise<string | null>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => resolve(null), 2_000);
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        window.clearTimeout(timeout);
        const message = event.data as { type?: unknown; buildVersion?: unknown };
        resolve(message.type === "BUILD_VERSION" && typeof message.buildVersion === "string"
          ? message.buildVersion
          : null);
      };
      worker.postMessage({ type: "GET_BUILD_VERSION" }, [channel.port2]);
    });
  }, source);
}

async function registrationBuildVersions(page: Page) {
  const [active, waiting, installing] = await Promise.all([
    workerBuildVersion(page, "active"),
    workerBuildVersion(page, "waiting"),
    workerBuildVersion(page, "installing")
  ]);
  return { active, waiting, installing };
}

async function controllerChangeCount(page: Page) {
  return page.evaluate(() => {
    const scope = globalThis as typeof globalThis & { __hakimiE2eControllerChanges?: number };
    return scope.__hakimiE2eControllerChanges ?? 0;
  });
}

async function startControllerChangeObserver(page: Page) {
  await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & {
      __hakimiE2eControllerChanges?: number;
      __hakimiE2eControllerObserverInstalled?: boolean;
    };
    scope.__hakimiE2eControllerChanges = 0;
    if (scope.__hakimiE2eControllerObserverInstalled) return;
    scope.__hakimiE2eControllerObserverInstalled = true;
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      scope.__hakimiE2eControllerChanges = (scope.__hakimiE2eControllerChanges ?? 0) + 1;
    });
  });
}

async function registrationWorkerStates(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      active: registration?.active?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      installing: registration?.installing?.state ?? null
    };
  });
}

async function expectPageGeneration(page: Page, fixture: GenerationFixture) {
  await expect.poll(() => pageGeneration(page)).toMatchObject({
    version: fixture.version,
    marker: fixture.name,
    bootReady: "true"
  });
}

async function expectConfirmed(page: Page, fixture: GenerationFixture) {
  await expect.poll(() => cacheGeneration(page, fixture)).toMatchObject({
    cacheName: `${shellCachePrefix}${fixture.version}`,
    bootAttempted: true,
    bootConfirmed: true
  });
}

async function expectInstalledUnconfirmed(page: Page, fixture: GenerationFixture) {
  await expect.poll(() => cacheGeneration(page, fixture)).toMatchObject({
    cacheName: `${shellCachePrefix}${fixture.version}`,
    bootAttempted: false,
    bootConfirmed: false
  });
}

async function launchFixtureContext(testInfo: { outputPath: (name: string) => string }, profileName: string) {
  return chromium.launchPersistentContext(testInfo.outputPath(profileName), {
    channel: "msedge",
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow",
    viewport: { width: 1280, height: 820 }
  });
}

async function openStableA(context: BrowserContext) {
  switchServer.setGeneration(stableA);
  const page = context.pages()[0] ?? await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}/`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await expectPageGeneration(page, stableA);
  await expectConfirmed(page, stableA);
  return { page, problems };
}

async function createDemoCaseAtOrigin(page: Page) {
  await page.goto(`${switchServer.origin}/new?demo=1`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
}

function collectExternalRequests(context: BrowserContext, origin: string) {
  const external: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin) {
      external.push(request.url());
    }
  });
  return external;
}

async function openNaturalNavigation(context: BrowserContext, fixture: GenerationFixture) {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  const response = await page.goto(`${switchServer.origin}/settings`, { waitUntil: "domcontentloaded" });
  expect(response?.fromServiceWorker()).toBe(true);
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "设置与诊断" })).toBeVisible();
  await expectPageGeneration(page, fixture);
  return { page, problems };
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-sw-generations-"));
  stableA = await buildGeneration("stable-a", "none");
  healthyB = await buildGeneration("healthy-b", "none");
  brokenB = await buildGeneration("broken-b", "research-route");
  expect(new Set([stableA.version, healthyB.version, brokenB.version]).size).toBe(3);
  expect(stableA.entryPath).not.toBe(healthyB.entryPath);
  expect(stableA.entryPath).not.toBe(brokenB.entryPath);
  expect(stableA.researchRoutePath).not.toBe(brokenB.researchRoutePath);
  switchServer = await startSwitchServer(stableA);
});

test.afterAll(async () => {
  await switchServer?.close();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

test("已确认 A 不混入新 HTML，健康 B 受控接管并可离线冷启动", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "healthy-upgrade-profile");
  let baselineProblems: string[] = [];
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableA(context);
    const pageA = stable.page;
    baselineProblems = stable.problems;
    await createDemoCaseAtOrigin(pageA);
    const caseUrl = new URL(pageA.url());
    const caseId = caseUrl.pathname.split("/")[2];
    expect(caseId).toMatch(/^[0-9a-f-]{36}$/i);

    await startControllerChangeObserver(pageA);
    switchServer.setGeneration(healthyB);
    const natural = await openNaturalNavigation(context, stableA);
    const resources = await natural.page.evaluate(() => performance.getEntriesByType("resource").map((entry) => new URL(entry.name).pathname));
    expect(resources).toContain(stableA.entryPath);
    expect(resources).not.toContain(healthyB.entryPath);
    await expectInstalledUnconfirmed(natural.page, healthyB);
    await expect.poll(() => pageGeneration(natural.page)).toMatchObject({ updateChecked: "true" });
    await expect.poll(() => controllerChangeCount(pageA)).toBeGreaterThan(0);
    await expect.poll(() => registrationWorkerStates(natural.page)).toEqual({
      active: "activated",
      waiting: null,
      installing: null
    });
    await expect.poll(() => workerBuildVersion(natural.page, "active")).toBe(healthyB.version);
    expect(natural.problems).toEqual([]);

    const pageB = await context.newPage();
    const pageBProblems = collectConsoleProblems(pageB);
    await pageB.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(pageB);
    await waitForServiceWorker(pageB);
    await expectPageGeneration(pageB, healthyB);
    await expect.poll(() => workerBuildVersion(pageB, "controller")).toBe(healthyB.version);
    await expect(pageB.getByText("演示案例 · 辰时研究", { exact: true }).first()).toBeVisible();
    await expectConfirmed(pageB, healthyB);
    await expectConfirmed(pageB, stableA);
    await expect.poll(() => cacheGenerations(pageB).then((items) => items.length)).toBe(2);
    expect(pageBProblems).toEqual([]);

    await disableNetworkCacheAndGoOffline(context, pageB);
    await Promise.all(context.pages().map((page) => page.close()));
    const offlinePage = await context.newPage();
    const offlineProblems = collectConsoleProblems(offlinePage);
    await offlinePage.setViewportSize(MOBILE_VIEWPORT);
    await offlinePage.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(offlinePage);
    await waitForServiceWorker(offlinePage);
    await expectPageGeneration(offlinePage, healthyB);
    await expect.poll(() => workerBuildVersion(offlinePage, "controller")).toBe(healthyB.version);
    await expect(offlinePage.getByText("演示案例 · 辰时研究", { exact: true }).first()).toBeVisible();
    await expectMobileNoOverflow(offlinePage);
    await offlinePage.screenshot({ path: testInfo.outputPath("healthy-b-offline-390.png"), fullPage: false });
    expect(offlineProblems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    if (context.pages().length > 0) await context.setOffline(false);
    await context.close();
  }
  expect(baselineProblems).toEqual([]);
});

test("B 已安装但研究路由启动失败时，第二次断网冷启动回到已确认 A", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "runtime-rollback-profile");
  let baselineProblems: string[] = [];
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableA(context);
    const pageA = stable.page;
    baselineProblems = stable.problems;
    await createDemoCaseAtOrigin(pageA);

    await startControllerChangeObserver(pageA);
    switchServer.setGeneration(brokenB);
    const natural = await openNaturalNavigation(context, stableA);
    await expectInstalledUnconfirmed(natural.page, brokenB);
    await expect.poll(() => controllerChangeCount(pageA)).toBeGreaterThan(0);
    await expect.poll(() => registrationWorkerStates(natural.page)).toEqual({
      active: "activated",
      waiting: null,
      installing: null
    });
    await expect.poll(() => workerBuildVersion(natural.page, "active")).toBe(brokenB.version);
    expect(natural.problems).toEqual([]);

    const failedPage = await context.newPage();
    const failedProblems = collectConsoleProblems(failedPage);
    await failedPage.goto(`${switchServer.origin}/cases/research`, { waitUntil: "domcontentloaded" });
    await expect(failedPage.getByRole("alert").filter({ hasText: "启动完整性检查未通过" })).toBeVisible();
    await expect(failedPage).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
    await expect(failedPage.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
    await expect.poll(() => pageGeneration(failedPage)).toMatchObject({
      version: brokenB.version,
      marker: "broken-b",
      bootReady: "false"
    });
    await expect.poll(() => workerBuildVersion(failedPage, "controller")).toBe(brokenB.version);
    await expect.poll(() => pageGeneration(failedPage).then((value) => value.bootSignalSent ?? "unset")).not.toBe("true");
    await expect.poll(() => cacheGeneration(failedPage, brokenB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    await expectConfirmed(failedPage, stableA);
    expect(failedProblems.filter((problem) => !problem.includes("synthetic broken-b research route boot failure"))).toEqual([]);

    await disableNetworkCacheAndGoOffline(context, failedPage);
    await Promise.all(context.pages().map((page) => page.close()));
    const recoveredPage = await context.newPage();
    const recoveredProblems = collectConsoleProblems(recoveredPage);
    await recoveredPage.setViewportSize(MOBILE_VIEWPORT);
    await recoveredPage.goto(`${switchServer.origin}/cases/research`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(recoveredPage);
    await waitForServiceWorker(recoveredPage);
    await expectPageGeneration(recoveredPage, stableA);
    await expect.poll(() => workerBuildVersion(recoveredPage, "controller")).toBe(brokenB.version);
    await expect(recoveredPage.getByRole("heading", { name: "专业研究检索" })).toBeVisible();
    await recoveredPage.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(recoveredPage);
    await expect(recoveredPage.getByText("演示案例 · 辰时研究", { exact: true }).first()).toBeVisible();
    await expectMobileNoOverflow(recoveredPage);
    await expect.poll(() => cacheGeneration(recoveredPage, brokenB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    await expectConfirmed(recoveredPage, stableA);
    await expect.poll(() => cacheGenerations(recoveredPage).then((items) => items.length)).toBe(2);
    await recoveredPage.screenshot({ path: testInfo.outputPath("broken-b-rollback-a-390.png"), fullPage: false });
    expect(recoveredProblems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    if (context.pages().length > 0) await context.setOffline(false);
    await context.close();
  }
  expect(baselineProblems).toEqual([]);
});

test("B 预缓存资源缺失时安装失败并清除残缺 cache，A 仍可离线冷启动", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "install-failure-profile");
  let baselineProblems: string[] = [];
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableA(context);
    const pageA = stable.page;
    baselineProblems = stable.problems;
    switchServer.setGeneration(healthyB, [healthyB.markerPath]);
    const natural = await openNaturalNavigation(context, stableA);

    await expect.poll(() => switchServer.requests.filter((request) => (
      request.generation === healthyB.name
      && request.pathname === healthyB.markerPath
      && request.status === 404
    )).length).toBeGreaterThan(0);
    await expect.poll(() => cacheGeneration(natural.page, healthyB)).toBeNull();
    await expect.poll(() => natural.page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        installing: registration?.installing?.state ?? null,
        waiting: registration?.waiting?.state ?? null,
        active: registration?.active?.state ?? null
      };
    })).toEqual({ installing: null, waiting: null, active: "activated" });
    await expect.poll(() => workerBuildVersion(natural.page, "active")).toBe(stableA.version);
    await expect.poll(() => workerBuildVersion(natural.page, "controller")).toBe(stableA.version);
    await expectConfirmed(natural.page, stableA);
    expect(natural.problems).toEqual([]);

    await disableNetworkCacheAndGoOffline(context, natural.page);
    await Promise.all(context.pages().map((page) => page.close()));
    const recoveredPage = await context.newPage();
    const recoveredProblems = collectConsoleProblems(recoveredPage);
    await recoveredPage.setViewportSize(MOBILE_VIEWPORT);
    await recoveredPage.goto(`${switchServer.origin}/settings/data`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(recoveredPage);
    await waitForServiceWorker(recoveredPage);
    await expectPageGeneration(recoveredPage, stableA);
    await expect.poll(() => workerBuildVersion(recoveredPage, "controller")).toBe(stableA.version);
    await expect(recoveredPage.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
    await expectMobileNoOverflow(recoveredPage);
    await expect.poll(() => cacheGeneration(recoveredPage, healthyB)).toBeNull();
    await recoveredPage.screenshot({ path: testInfo.outputPath("install-failure-stable-a-390.png"), fullPage: false });
    expect(recoveredProblems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    if (context.pages().length > 0) await context.setOffline(false);
    await context.close();
  }
  expect(baselineProblems).toEqual([]);
});
