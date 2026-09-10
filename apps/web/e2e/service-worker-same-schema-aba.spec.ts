import { createServer, type Server } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  isCanonicalSwTwoGenerationArtifactPath,
  isSwTwoGenerationArtifactSetSnapshot,
  isSwTwoGenerationArtifactSnapshot,
  readSwTwoGenerationArtifactSnapshot,
  snapshotSwTwoGenerationArtifactSetDirectory,
  type SwTwoGenerationArtifactFileIdentity,
  type SwTwoGenerationArtifactSetSnapshot,
  type SwTwoGenerationArtifactSnapshot
} from "../sw-two-generation-artifact-identity";
import {
  launchReleasePersistentContext,
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context";
import {
  collectConsoleProblems,
  disableNetworkCacheAndGoOffline,
  expectMobileNoOverflow,
  MOBILE_VIEWPORT,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";
import {
  captureStorageV13NativeReadonlySnapshot,
  storageV13ChangedStores,
  storageV13SnapshotsEqual,
  type StorageV13NativeReadonlySnapshot
} from "./storage-v13-native-readonly";

// Isolated ABA diagnostics preserve the existing canonical three-scenario gate.
// These fixture helpers retain the previously verified server and script-gate
// behavior without importing the canonical spec and registering its tests.

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

type WorkerScriptGateObservation = {
  generation: string;
  heldRequests: number;
  effectiveReleaseCount: number;
};

type WorkerScriptGate = {
  generation: GenerationFixture;
  wait: Promise<void>;
  observation: WorkerScriptGateObservation;
  release: () => void;
};

type SwitchServer = {
  origin: string;
  requests: ServerRequest[];
  workerScriptGates: WorkerScriptGateObservation[];
  holdWorkerScript: (generation: GenerationFixture) => () => void;
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
  const workerScriptGates: WorkerScriptGateObservation[] = [];
  let workerScriptGate: WorkerScriptGate | null = null;
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
      const gate = workerScriptGate;
      if (pathname === "/sw.js" && gate?.generation === generation) {
        gate.observation.heldRequests += 1;
        await gate.wait;
        if (response.destroyed || response.writableEnded) return;
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
    workerScriptGates,
    holdWorkerScript(generation) {
      if (
        workerScriptGate !== null
        || !isSwTwoGenerationArtifactSnapshot(generation)
        || !artifactSet.generations.includes(generation)
        || generation === active.generation
      ) {
        throw new Error("SW fixture worker-script gate requires one different shared candidate generation.");
      }
      const observation: WorkerScriptGateObservation = {
        generation: generation.name,
        heldRequests: 0,
        effectiveReleaseCount: 0
      };
      let resolveGate!: () => void;
      const wait = new Promise<void>((resolve) => { resolveGate = resolve; });
      const gate: WorkerScriptGate = {
        generation,
        wait,
        observation,
        release: () => {
          if (observation.effectiveReleaseCount !== 0) return;
          observation.effectiveReleaseCount += 1;
          if (workerScriptGate === gate) workerScriptGate = null;
          resolveGate();
        }
      };
      workerScriptGate = gate;
      workerScriptGates.push(observation);
      return gate.release;
    },
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
      workerScriptGate?.release();
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

async function deployCandidateAndOpenNaturalNavigation(
  context: BrowserContext,
  fixture: GenerationFixture,
  candidate: GenerationFixture,
  failPaths: readonly string[] = []
) {
  // Establish the Given state before any asynchronous page creation: candidate
  // HTML is deployed while the current worker still serves its confirmed shell.
  // Only the candidate /sw.js response waits; HTML, assets and protocol messages
  // continue normally. All original current-shell assertions run before release.
  const releaseWorkerScript = switchServer.holdWorkerScript(candidate);
  try {
    switchServer.setGeneration(candidate, failPaths);
    return await openNaturalNavigation(context, fixture);
  } finally {
    releaseWorkerScript();
  }
}

async function initializeFixtureServer(artifactSet: SwTwoGenerationArtifactSetSnapshot) {
  [stableA, healthyB, brokenB] = artifactSet.generations;
  switchServer = await startSwitchServer(artifactSet);
  return { stableA, healthyB, brokenB, switchServer };
}

test("current source same-Schema worker A to B to A", async ({}, testInfo) => {
  const runRoot = process.env.HAKIMI_LOCAL_SW_QA_RUN_ROOT;
  if (!runRoot || !path.isAbsolute(runRoot)) throw new Error("The ABA runner must supply its absolute output root.");
  const artifactRoot = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT;
  const expectedArtifactSetSha256 = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256;
  if (!artifactRoot || !path.isAbsolute(artifactRoot) ||
    !/^[a-f0-9]{64}$/u.test(expectedArtifactSetSha256 ?? "")) {
    throw new Error("The ABA runner must bind one absolute shared artifact root and its SHA-256.");
  }
  const artifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);
  expect(artifactSet.identity.canonicalSha256).toBe(expectedArtifactSetSha256);
  const { stableA, healthyB, switchServer } = await initializeFixtureServer(artifactSet);
  expect(stableA.identity.releaseIdentity).toEqual({ dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null });
  expect(healthyB.identity.releaseIdentity).toEqual(stableA.identity.releaseIdentity);
  expect(stableA.version).not.toBe(healthyB.version);

  // The short, exclusive profile is retained and recorded for inspection.
  let profilePath: string;
  let context: BrowserContext;
  try {
    profilePath = await mkdtemp(path.join(tmpdir(), "hb-aba-"));
    context = await launchReleasePersistentContext({ projectName: testInfo.project.name, userDataDir: profilePath });
  } catch (error) {
    await switchServer.close();
    throw error;
  }
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  const observedPages: Array<{ label: string; problems: string[] }> = [];
  const snapshots: Record<string, StorageV13NativeReadonlySnapshot> = {};
  const observations: Array<Record<string, unknown>> = [];
  const watch = (page: Page, label: string) => observedPages.push({ label, problems: collectConsoleProblems(page) });
  const capture = async (page: Page, phase: string) => {
    const snapshot = await captureStorageV13NativeReadonlySnapshot(page, {
      captureId: `worker-aba-${testInfo.project.name}-${phase}`,
      operationId: "edit",
      phase
    });
    snapshots[phase] = snapshot;
    return snapshot;
  };
  let completed = false;
  try {
    const initialPage = context.pages()[0] ?? await context.newPage();
    const cdp = await context.newCDPSession(initialPage);
    const browserVersion = await cdp.send("Browser.getVersion");
    const runtimeProduct = requireReleaseBrowserRuntimeProduct(testInfo.project.name, browserVersion.product);
    await cdp.detach();
    observations.push({ stage: "fresh-profile", profilePath, retained: true, runtimeProduct });
    testInfo.annotations.push({ type: "runtimeProduct", description: runtimeProduct });
    testInfo.annotations.push({ type: "artifactSetSha256", description: artifactSet.identity.canonicalSha256 });

    const initial = await openStableA(context);
    observedPages.push({ label: "initial-a", problems: initial.problems });
    await createDemoCaseAtOrigin(initial.page);
    const caseUrl = new URL(initial.page.url());
    const caseId = caseUrl.pathname.split("/")[2];
    const revisionId = caseUrl.pathname.split("/")[4];
    expect(caseId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(revisionId).toMatch(/^[0-9a-f-]{36}$/i);
    const beforeUpgrade = await capture(initial.page, "a-before-upgrade");
    observations.push({ stage: "confirmed-a", page: await pageGeneration(initial.page), controller: await workerBuildVersion(initial.page, "controller"), caseId, revisionId });

    const intoB = await deployCandidateAndOpenNaturalNavigation(context, stableA, healthyB);
    observedPages.push({ label: "a-navigation-triggering-b", problems: intoB.problems });
    await expect.poll(() => workerBuildVersion(intoB.page, "controller")).toBe(healthyB.version);
    await expect.poll(() => registrationWorkerStates(intoB.page)).toEqual({ active: "activated", waiting: null, installing: null });
    const pageB = await context.newPage();
    watch(pageB, "confirmed-b-and-stale-b-after-rollback");
    await pageB.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(pageB);
    await waitForServiceWorker(pageB);
    await expectPageGeneration(pageB, healthyB);
    await expect.poll(() => workerBuildVersion(pageB, "controller")).toBe(healthyB.version);
    await expectConfirmed(pageB, healthyB);
    const beforeBWrite = await capture(pageB, "b-before-write");
    expect(storageV13SnapshotsEqual(beforeUpgrade, beforeBWrite)).toBe(true);
    await pageB.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究", exact: true }).click();
    await expect(pageB.getByRole("button", { name: "取消收藏案例 演示案例 · 辰时研究", exact: true })).toHaveAttribute("aria-pressed", "true");
    const afterBWrite = await capture(pageB, "b-after-write");
    expect(storageV13ChangedStores(beforeBWrite, afterBWrite)).toEqual(["cases"]);
    observations.push({ stage: "confirmed-b-write", page: await pageGeneration(pageB), controller: await workerBuildVersion(pageB, "controller") });
    await Promise.all(context.pages().filter(page => page !== pageB).map(page => page.close()));

    // Serve the exact original A snapshot. The normal page registration/update
    // path must install and activate A; no skipWaiting/message/cache shortcut.
    expect((await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot)).identity).toEqual(artifactSet.identity);
    const rollbackRequestStart = switchServer.requests.length;
    const intoA = await deployCandidateAndOpenNaturalNavigation(context, healthyB, stableA);
    observedPages.push({ label: "b-navigation-triggering-original-a", problems: intoA.problems });
    await expect.poll(() => workerBuildVersion(intoA.page, "active")).toBe(stableA.version);
    await expect.poll(() => workerBuildVersion(pageB, "controller")).toBe(stableA.version);
    await expect.poll(() => registrationWorkerStates(intoA.page)).toEqual({ active: "activated", waiting: null, installing: null });
    await expect.poll(() => pageGeneration(pageB)).toMatchObject({ version: healthyB.version, marker: healthyB.name });
    await expect(pageB.locator("html")).toHaveAttribute("data-db-controller-takeover-write-frozen", "true");
    await pageB.getByRole("button", { name: "取消收藏案例 演示案例 · 辰时研究", exact: true }).click();
    await expect(pageB.getByRole("alert")).toContainText("当前页面已进入版本接管写入锁定，本次案例写入未执行；请重新载入后再操作。");
    await expect(pageB.getByRole("button", { name: "重新读取并解除锁定" })).toHaveCount(0);
    const afterRejectedBWrite = await capture(pageB, "after-rejected-stale-b-write");
    expect(storageV13SnapshotsEqual(afterBWrite, afterRejectedBWrite)).toBe(true);
    expect(storageV13ChangedStores(afterBWrite, afterRejectedBWrite)).toEqual([]);
    observations.push({ stage: "stale-b-frozen-under-a-controller", page: await pageGeneration(pageB), controller: await workerBuildVersion(pageB, "controller") });

    const returnedA = await context.newPage();
    watch(returnedA, "returned-a");
    await returnedA.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(returnedA);
    await waitForServiceWorker(returnedA);
    await expectPageGeneration(returnedA, stableA);
    await expect.poll(() => workerBuildVersion(returnedA, "controller")).toBe(stableA.version);
    await expectConfirmed(returnedA, stableA);
    await expect(returnedA.getByRole("button", { name: "取消收藏案例 演示案例 · 辰时研究", exact: true })).toHaveAttribute("aria-pressed", "true");
    const beforeReturnedAWrite = await capture(returnedA, "returned-a-before-write");
    expect(storageV13SnapshotsEqual(afterBWrite, beforeReturnedAWrite)).toBe(true);
    await returnedA.getByRole("button", { name: "取消收藏案例 演示案例 · 辰时研究", exact: true }).click();
    await expect(returnedA.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究", exact: true })).toHaveAttribute("aria-pressed", "false");
    const afterReturnedAWrite = await capture(returnedA, "returned-a-after-write");
    expect(storageV13ChangedStores(beforeReturnedAWrite, afterReturnedAWrite)).toEqual(["cases"]);
    expect(switchServer.requests.slice(rollbackRequestStart).some(request => request.generation === "stable-a" && request.pathname === "/sw.js" && request.status === 200)).toBe(true);
    observations.push({ stage: "returned-a-confirmed-and-writable", page: await pageGeneration(returnedA), controller: await workerBuildVersion(returnedA, "controller"), rollbackRequestStart });

    await disableNetworkCacheAndGoOffline(context, returnedA);
    await Promise.all(context.pages().map(page => page.close()));
    const offlineA = await context.newPage();
    watch(offlineA, "returned-a-offline-cold-page");
    await offlineA.setViewportSize(MOBILE_VIEWPORT);
    await offlineA.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(offlineA);
    await waitForServiceWorker(offlineA);
    await expectPageGeneration(offlineA, stableA);
    await expect.poll(() => workerBuildVersion(offlineA, "controller")).toBe(stableA.version);
    await expect(offlineA.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究", exact: true })).toHaveAttribute("aria-pressed", "false");
    expect(storageV13SnapshotsEqual(afterReturnedAWrite, await capture(offlineA, "returned-a-offline"))).toBe(true);
    await expectMobileNoOverflow(offlineA);
    await offlineA.screenshot({ path: testInfo.outputPath("original-a-controller-offline-390.png"), fullPage: false });
    observations.push({ stage: "returned-a-offline", page: await pageGeneration(offlineA), controller: await workerBuildVersion(offlineA, "controller") });
    expect(externalRequests).toEqual([]);
    expect(observedPages.flatMap(entry => entry.problems.map(problem => `${entry.label}: ${problem}`))).toEqual([]);
    expect((await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot)).identity).toEqual(artifactSet.identity);
    completed = true;
  } finally {
    const report = { completed, browserProject: testInfo.project.name, evidenceScope: "local current-source same-Schema worker rollback supplement", profilePath, artifactSetIdentity: artifactSet.identity, observations, snapshots, serverRequests: switchServer.requests, workerScriptGates: switchServer.workerScriptGates, externalRequests, observedPageProblems: observedPages, doesNotEstablish: ["real deployed historical artifact compatibility", "public HTTPS deployment or rollback", "cross-Schema rollback or no-backwrite", "expert truth or release authorization"] };
    const reportPath = testInfo.outputPath("same-schema-worker-aba-observations.json");
    try {
      await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: "wx" });
      await testInfo.attach("same-schema-worker-aba-observations", { path: reportPath, contentType: "application/json" });
    } finally {
      try { await context.close(); } finally { await switchServer.close(); }
    }
  }
});
