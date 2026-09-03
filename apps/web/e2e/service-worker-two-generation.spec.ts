import { createServer, type Server } from "node:http";
import { stat } from "node:fs/promises";
import path from "node:path";
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo
} from "@playwright/test";
import {
  releasePersistentContextOptionsForProject,
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context.ts";
import {
  SW_TWO_GENERATION_FIXTURE_ANNOTATIONS,
  SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS
} from "../playwright.sw-two-generation-fixture-result.ts";
import {
  isCanonicalSwTwoGenerationArtifactPath,
  isSwTwoGenerationArtifactSetSnapshot,
  isSwTwoGenerationArtifactSnapshot,
  readSwTwoGenerationArtifactSnapshot,
  snapshotSwTwoGenerationArtifactSetDirectory,
  type SwTwoGenerationArtifactFileIdentity,
  type SwTwoGenerationArtifactSetSnapshot,
  type SwTwoGenerationArtifactSnapshot
} from "../sw-two-generation-artifact-identity.ts";
import {
  MOBILE_VIEWPORT,
  collectConsoleProblems,
  disableNetworkCacheAndGoOffline,
  expectMobileNoOverflow,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";
import {
  captureStorageV13NativeReadonlySnapshot,
  storageV13ChangedStores,
  storageV13SnapshotsEqual
} from "./storage-v13-native-readonly";

const shellCachePrefix = "hakimi-shell-";
const cacheMetaPath = "/__hakimi_cache_meta__";

type GenerationFixture = SwTwoGenerationArtifactSnapshot;

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
  artifactPath?: string;
  artifactSize?: number;
  artifactSha256?: string;
  artifactSetSha256: string;
};

type SwitchServer = {
  origin: string;
  requests: ServerRequest[];
  setGeneration: (generation: GenerationFixture, failPaths?: readonly string[]) => void;
  close: () => Promise<void>;
};

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

function artifactPathForRequest(pathname: string): string | null {
  if (pathname.includes("%")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded === "/") return "index.html";
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  const artifactPath = decoded.slice(1);
  return isCanonicalSwTwoGenerationArtifactPath(artifactPath) ? artifactPath : null;
}

function artifactFileIdentity(
  generation: GenerationFixture,
  artifactPath: string
): SwTwoGenerationArtifactFileIdentity | null {
  return generation.identity.files.find((file) => file.path === artifactPath) ?? null;
}

async function startSwitchServer(
  artifactSet: SwTwoGenerationArtifactSetSnapshot
): Promise<SwitchServer> {
  if (!isSwTwoGenerationArtifactSetSnapshot(artifactSet)) {
    throw new Error("SW fixture server rejected an unregistered shared artifact set.");
  }
  const initialGeneration = artifactSet.generations[0];
  if (!initialGeneration) {
    throw new Error("SW fixture shared artifact set did not contain stable A.");
  }
  let active = {
    generation: initialGeneration,
    failPaths: new Set<string>()
  };
  const requests: ServerRequest[] = [];
  const server: Server = createServer(async (request, response) => {
    const selected = active;
    const generation = selected.generation;
    const artifactSetSha256 = artifactSet.identity.canonicalSha256;
    const method = request.method ?? "GET";
    let pathname = "/";
    try {
      pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (method !== "GET" && method !== "HEAD") {
        requests.push({ generation: generation.name, method, pathname, status: 405, artifactSetSha256 });
        response.writeHead(405, { "cache-control": "no-store" });
        response.end(method === "HEAD" ? undefined : "Method Not Allowed");
        return;
      }
      let artifactPath = artifactPathForRequest(pathname);
      if (artifactPath === null) {
        requests.push({ generation: generation.name, method, pathname, status: 400, artifactSetSha256 });
        response.writeHead(400, { "cache-control": "no-store" });
        response.end(method === "HEAD" ? undefined : "Bad Request");
        return;
      }
      if (selected.failPaths.has(artifactPath)) {
        const artifact = artifactFileIdentity(generation, artifactPath);
        requests.push({
          generation: generation.name,
          method,
          pathname,
          status: 404,
          artifactPath,
          artifactSize: artifact?.size,
          artifactSha256: artifact?.sha256,
          artifactSetSha256
        });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end(method === "HEAD" ? undefined : "Synthetic missing precache resource");
        return;
      }

      let bytes = readSwTwoGenerationArtifactSnapshot(generation, artifactPath);
      if (bytes === null && (request.headers.accept ?? "").includes("text/html")) {
        artifactPath = "index.html";
        bytes = readSwTwoGenerationArtifactSnapshot(generation, artifactPath);
      }
      if (bytes === null) {
        requests.push({ generation: generation.name, method, pathname, status: 404, artifactSetSha256 });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end(method === "HEAD" ? undefined : "Not Found");
        return;
      }
      const artifact = artifactFileIdentity(generation, artifactPath);
      if (artifact === null || artifact.size !== bytes.byteLength) {
        throw new Error(`SW fixture snapshot metadata mismatch: ${artifactPath}.`);
      }

      const headers: Record<string, string> = {
        "cache-control": "no-store, max-age=0",
        "content-length": String(bytes.byteLength),
        "content-type": contentType(artifactPath),
        "x-content-type-options": "nosniff"
      };
      if (artifactPath === "sw.js") headers["service-worker-allowed"] = "/";
      requests.push({
        generation: generation.name,
        method,
        pathname,
        status: 200,
        artifactPath,
        artifactSize: artifact.size,
        artifactSha256: artifact.sha256,
        artifactSetSha256
      });
      response.writeHead(200, headers);
      response.end(method === "HEAD" ? undefined : bytes);
    } catch (error) {
      requests.push({ generation: generation.name, method, pathname, status: 500, artifactSetSha256 });
      response.writeHead(500, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
      response.end(method === "HEAD"
        ? undefined
        : error instanceof Error ? error.message : "Fixture server error");
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
      if (
        !isSwTwoGenerationArtifactSnapshot(generation)
        || !artifactSet.generations.includes(generation)
      ) {
        throw new Error("SW fixture server rejected a generation outside the shared artifact set.");
      }
      const canonicalFailPaths = failPaths.map((failPath) => artifactPathForRequest(failPath));
      if (
        canonicalFailPaths.some((failPath) => failPath === null)
        || canonicalFailPaths.some((failPath) =>
          failPath === null || readSwTwoGenerationArtifactSnapshot(generation, failPath) === null
        )
      ) {
        throw new Error("SW fixture server rejected a non-canonical or unknown failure path.");
      }
      active = {
        generation,
        failPaths: new Set(canonicalFailPaths as string[])
      };
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

async function requireFixtureProfileAbsent(profilePath: string) {
  try {
    await stat(profilePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(`SW two-generation fixture profile must not pre-exist: ${profilePath}`);
}

async function requireFixtureBrowserRuntime(
  context: BrowserContext,
  projectName: string
) {
  const page = context.pages()[0] ?? await context.newPage();
  const session = await context.newCDPSession(page);
  try {
    const version = await session.send("Browser.getVersion");
    return requireReleaseBrowserRuntimeProduct(projectName, version.product);
  } finally {
    await session.detach();
  }
}

async function launchFixtureContext(testInfo: TestInfo, profileName: string) {
  const projectName = testInfo.project.name;
  const profilePath = testInfo.outputPath(`${projectName}-${profileName}`);
  await requireFixtureProfileAbsent(profilePath);
  const context = await chromium.launchPersistentContext(
    profilePath,
    releasePersistentContextOptionsForProject(projectName)
  );
  try {
    const runtimeProduct = await requireFixtureBrowserRuntime(context, projectName);
    testInfo.annotations.push({
      type: SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.runtimeProduct,
      description: runtimeProduct
    });
    testInfo.annotations.push({
      type: SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.freshProfileVerified,
      description: "true"
    });
    return context;
  } catch (error) {
    await context.close();
    throw error;
  }
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
  const artifactRoot = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT;
  const expectedArtifactSetSha256 = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256;
  if (!artifactRoot || !path.isAbsolute(artifactRoot) || !expectedArtifactSetSha256) {
    throw new Error("Canonical fixture runner did not provide the shared artifact set.");
  }
  const artifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);
  if (artifactSet.identity.canonicalSha256 !== expectedArtifactSetSha256) {
    throw new Error("Shared SW fixture artifact identity does not match the runner binding.");
  }
  const [sharedStableA, sharedHealthyB, sharedBrokenB] = artifactSet.generations;
  if (!sharedStableA || !sharedHealthyB || !sharedBrokenB) {
    throw new Error("Shared SW fixture artifact set is incomplete.");
  }
  stableA = sharedStableA;
  healthyB = sharedHealthyB;
  brokenB = sharedBrokenB;
  switchServer = await startSwitchServer(artifactSet);
});

test.afterAll(async () => {
  await switchServer?.close();
});

test("已确认 A 不混入新 HTML，健康 B 受控接管并可离线冷启动", {
  annotation: {
    type: SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.scenarioId,
    description: SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS[0]
  }
}, async ({}, testInfo) => {
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

    const staleWriter = await context.newPage();
    const staleWriterProblems = collectConsoleProblems(staleWriter);
    await staleWriter.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(staleWriter);
    await waitForServiceWorker(staleWriter);
    await expectPageGeneration(staleWriter, stableA);
    await expect(staleWriter.getByText("演示案例 · 辰时研究", { exact: true }).first()).toBeVisible();
    const beforeTakeoverWrite = await captureStorageV13NativeReadonlySnapshot(staleWriter, {
      captureId: "same-schema-takeover-before-stale-write",
      operationId: "edit",
      phase: "before_stale_a_write"
    });

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

    await expect.poll(() => pageGeneration(staleWriter)).toMatchObject({
      version: stableA.version,
      marker: stableA.name
    });
    await expect.poll(() => workerBuildVersion(staleWriter, "controller")).toBe(healthyB.version);
    await expect.poll(() => staleWriter.evaluate(() => ({
      frozen: document.documentElement.dataset.dbControllerTakeoverWriteFrozen ?? null,
      phase: document.documentElement.dataset.dbControllerTakeoverWriteFreezePhase ?? null
    }))).toMatchObject({ frozen: "true" });
    await staleWriter.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究" }).click();
    await expect(staleWriter.getByRole("alert")).toContainText(
      "当前页面已进入版本接管写入锁定，本次案例写入未执行；请重新载入后再操作。"
    );
    await expect(staleWriter.getByRole("button", { name: "重新读取并解除锁定" })).toHaveCount(0);
    const afterRejectedStaleWrite = await captureStorageV13NativeReadonlySnapshot(staleWriter, {
      captureId: "same-schema-takeover-after-stale-write",
      operationId: "edit",
      phase: "after_rejected_stale_a_write"
    });
    expect(storageV13SnapshotsEqual(beforeTakeoverWrite, afterRejectedStaleWrite)).toBe(true);
    expect(storageV13ChangedStores(beforeTakeoverWrite, afterRejectedStaleWrite)).toEqual([]);
    expect(staleWriterProblems).toEqual([]);

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
    await pageB.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究" }).click();
    await expect(pageB.getByRole("status")).toContainText("已收藏案例“演示案例 · 辰时研究”");
    const afterWritableB = await captureStorageV13NativeReadonlySnapshot(pageB, {
      captureId: "same-schema-takeover-after-writable-b",
      operationId: "edit",
      phase: "after_new_b_write"
    });
    expect(storageV13SnapshotsEqual(afterRejectedStaleWrite, afterWritableB)).toBe(false);
    expect(storageV13ChangedStores(afterRejectedStaleWrite, afterWritableB)).toEqual(["cases"]);
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

test("B 已安装但研究路由启动失败时，第二次断网冷启动使用已确认 A 壳缓存（controller 仍为 B，非 worker 回滚）", {
  annotation: {
    type: SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.scenarioId,
    description: SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS[1]
  }
}, async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "old-shell-cache-fallback-profile");
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
    await recoveredPage.screenshot({ path: testInfo.outputPath("broken-b-old-shell-cache-fallback-390.png"), fullPage: false });
    expect(recoveredProblems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    if (context.pages().length > 0) await context.setOffline(false);
    await context.close();
  }
  expect(baselineProblems).toEqual([]);
});

test("B 预缓存资源缺失时安装失败并清除残缺 cache，A 仍可离线冷启动", {
  annotation: {
    type: SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.scenarioId,
    description: SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS[2]
  }
}, async ({}, testInfo) => {
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
