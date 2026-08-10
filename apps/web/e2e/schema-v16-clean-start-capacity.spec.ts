import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
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
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import {
  ACTIVE_CAPACITY_CASES,
  ACTIVE_CAPACITY_FAVORITES,
  EXPECTED_CAPACITY_SEED_STATS,
  MAX_RENDERED_CAPACITY_CASE_ROWS,
  RARE_CAPACITY_ALIAS,
  RARE_CAPACITY_INDEX,
  RARE_CAPACITY_QUERY,
  TRASHED_CAPACITY_CASES,
  deterministicCapacityCaseId,
  deterministicCapacityRevisionId,
  readCapacitySeedStats,
  readLegalCapacityCaseFixture,
  seedLegacyV13CapacityCases,
  type CapacitySeedStats
} from "./case-library-capacity-helpers";
import {
  buildGeneration,
  cacheGeneration,
  collectExternalRequests,
  expectPageFixture,
  openStableBridge,
  pageReleaseEvidence,
  readReleaseControl,
  startSwitchServer,
  workerBuildVersion,
  type GenerationFixture,
  type SwitchServer
} from "./cross-schema-upgrade-helpers";
import {
  collectConsoleProblems,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const sourceDescriptor: ReleaseDatabaseDescriptor = BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
const targetDescriptor: ReleaseDatabaseDescriptor = PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;
const CLEAN_INTERACTION_READY_BUDGET_MS = 5_000;
const FIRST_MIGRATION_READY_TIMEOUT_MS = 180_000;
const ACTIVATION_TIMEOUT_MS = 90_000;
const UI_ACTION_TIMEOUT_MS = 45_000;

type IntegrityMode = "cache_hit" | "full_audit";

type V16MutationStateEvidence = {
  id: unknown;
  epoch: unknown;
  verifiedEpoch: unknown;
  verifiedContractVersion: unknown;
  verifiedPayloadDigest: unknown;
} | null;

type V16CapacityMetrics = {
  browser: string;
  sourceBuild: string;
  targetBuild: string;
  seedMs?: number;
  firstTargetNavigationMs?: number;
  firstMigrationFullAuditInteractionReadyMs?: number;
  firstIntegrityMode?: string | null;
  firstIntegrityModeHistory?: string[];
  firstCounts?: CapacitySeedStats;
  firstMutationState?: V16MutationStateEvidence;
  cleanNavigationMs?: number;
  cleanInteractionReadyMs?: number;
  cleanIntegrityMode?: string | null;
  cleanIntegrityModeHistory?: string[];
  cleanCounts?: CapacitySeedStats;
  cleanMutationState?: V16MutationStateEvidence;
  cleanInitialRows?: number;
  cleanFavoriteRows?: number;
  cleanTrashRows?: number;
  cleanRareRows?: number;
  cleanSearchMs?: number;
  cleanOpenMs?: number;
};

let fixtureRoot = "";
let sourceV13: GenerationFixture;
let targetV16: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) throw new Error(`Unsupported v13→v16 capacity browser project: ${projectName}`);

  const profilePath = await mkdtemp(path.join(os.tmpdir(), "hb-v13-v16-capacity-profile-"));
  browserProfilePaths.add(profilePath);
  const context = await chromium.launchPersistentContext(profilePath, {
    channel,
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow",
    baseURL: switchServer.origin,
    viewport: { width: 1280, height: 820 }
  });
  await context.addInitScript(() => {
    const scope = globalThis as typeof globalThis & {
      __hakimiIntegrityModeHistory?: string[];
    };
    scope.__hakimiIntegrityModeHistory = [];
    const install = (): boolean => {
      const root = document.documentElement;
      if (!root) return false;
      const capture = () => {
        const mode = root.dataset.dbIntegrityVerification;
        const history = scope.__hakimiIntegrityModeHistory;
        if (mode && history && history.at(-1) !== mode) history.push(mode);
      };
      new MutationObserver(capture).observe(root, {
        attributes: true,
        attributeFilter: ["data-db-integrity-verification"]
      });
      capture();
      return true;
    };
    if (!install()) {
      const documentObserver = new MutationObserver(() => {
        if (install()) documentObserver.disconnect();
      });
      documentObserver.observe(document, { childList: true, subtree: true });
    }
  });
  test.info().annotations.push({
    type: "browser-version",
    description: `${channel} ${context.browser()?.version() ?? "unknown"}`
  });
  return context;
}

async function activateTargetGeneration(
  readySourcePage: Page
): Promise<void> {
  switchServer.setGeneration(targetV16);
  await readySourcePage.bringToFront();
  await readySourcePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("The ready v13 page has no Service Worker registration.");
    await registration.update();
  });
  await expect.poll(
    () => cacheGeneration(readySourcePage, targetV16),
    { timeout: ACTIVATION_TIMEOUT_MS }
  ).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    dbGeneration: targetDescriptor.dbGeneration,
    databaseName: targetDescriptor.databaseName,
    targetSchema: targetDescriptor.targetSchema,
    migrationId: targetDescriptor.migrationId
  });

  const waitingVersion = await workerBuildVersion(readySourcePage, "waiting");
  if (waitingVersion !== null) {
    expect(waitingVersion).toBe(targetV16.version);
    await readySourcePage.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.waiting?.postMessage({ type: "ACTIVATE_INSTALLED_GENERATION" });
    });
    // The exact immutable worker has already been proven. CDP only asks Edge
    // to finish the same skip-waiting transition deterministically; database
    // preparation and migration remain untouched production code.
    const cdp = await readySourcePage.context().newCDPSession(readySourcePage);
    try {
      await cdp.send("ServiceWorker.enable");
      await cdp.send("ServiceWorker.skipWaiting", { scopeURL: `${switchServer.origin}/` });
    } finally {
      await cdp.detach();
    }
  }

  await readySourcePage.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(
      registration &&
      !registration.installing &&
      !registration.waiting &&
      registration.active?.state === "activated"
    );
  }, undefined, { timeout: ACTIVATION_TIMEOUT_MS });
  await expect.poll(
    () => workerBuildVersion(readySourcePage, "active"),
    { timeout: ACTIVATION_TIMEOUT_MS }
  ).toBe(targetV16.version);
}

async function waitForActualInteractionReady(page: Page, timeout: number): Promise<void> {
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector("#main-content");
    return {
      appBootReady: document.documentElement.dataset.appBootReady ?? null,
      mainVisible: main instanceof HTMLElement && main.getClientRects().length > 0,
      inert: main?.closest("[inert]") !== null
    };
  }), { timeout, intervals: [50, 100, 200, 500] }).toEqual({
    appBootReady: "true",
    mainVisible: true,
    inert: false
  });
}

async function integrityEvidence(page: Page): Promise<{
  mode: string | null;
  history: string[];
}> {
  return page.evaluate(() => {
    const scope = globalThis as typeof globalThis & {
      __hakimiIntegrityModeHistory?: string[];
    };
    return {
      mode: document.documentElement.dataset.dbIntegrityVerification ?? null,
      history: [...(scope.__hakimiIntegrityModeHistory ?? [])]
    };
  });
}

async function readMutationStateEvidence(page: Page): Promise<V16MutationStateEvidence> {
  return page.evaluate(async (databaseName) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("读取 mutationState 失败"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("无法打开 Schema 16 数据库"));
      request.onupgradeneeded = () => reject(new Error("读取 mutationState 时意外触发升级"));
    });
    if (database.version !== 160 || !database.objectStoreNames.contains("mutationState")) {
      const evidence = {
        version: database.version,
        stores: [...database.objectStoreNames]
      };
      database.close();
      throw new Error(`目标数据库不是物理 Schema 16：${JSON.stringify(evidence)}`);
    }
    const transaction = database.transaction("mutationState", "readonly");
    const state = await requestResult(transaction.objectStore("mutationState").get("current"));
    database.close();
    if (!state) return null;
    const record = state as Record<string, unknown>;
    return {
      id: record.id,
      epoch: record.epoch,
      verifiedEpoch: record.verifiedEpoch,
      verifiedContractVersion: record.verifiedContractVersion,
      verifiedPayloadDigest: record.verifiedPayloadDigest
    };
  }, targetDescriptor.databaseName);
}

async function expectCommittedTarget(page: Page): Promise<void> {
  await expect.poll(() => readReleaseControl(page)).toMatchObject({
    state: {
      id: "current",
      protocolVersion: 1,
      committedGeneration: targetDescriptor.dbGeneration,
      committedDatabaseName: targetDescriptor.databaseName,
      committedSchema: targetDescriptor.targetSchema,
      committedBuild: targetV16.version,
      migrationId: targetDescriptor.migrationId
    }
  });
}

function caseRows(page: Page) {
  return page.locator("table.case-table tbody > tr");
}

async function expectToolbarCount(page: Page, count: number): Promise<void> {
  const escapedCount = String(count).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  await expect(page.locator(".library-toolbar .status-pill")).toContainText(
    new RegExp(`(?:^|\\D)${escapedCount}(?:\\D|$)`, "u"),
    { timeout: UI_ACTION_TIMEOUT_MS }
  );
}

async function boundedRowCount(page: Page): Promise<number> {
  const count = await caseRows(page).count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(MAX_RENDERED_CAPACITY_CASE_ROWS);
  return count;
}

async function attachMetrics(testInfo: TestInfo, metrics: V16CapacityMetrics): Promise<void> {
  const content = `${JSON.stringify(metrics, null, 2)}\n`;
  await testInfo.attach("schema-v16-clean-start-capacity-metrics.json", {
    body: Buffer.from(content, "utf8"),
    contentType: "application/json"
  });
  console.info(`[schema-v16-clean-start-capacity] ${JSON.stringify(metrics)}`);
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-v13-v16-capacity-generations-"));
  [sourceV13, targetV16] = await Promise.all([
    buildGeneration(fixtureRoot, "capacity-source-v13", sourceDescriptor),
    buildGeneration(fixtureRoot, "capacity-target-v16", targetDescriptor)
  ]);
  expect(sourceV13.version).not.toBe(targetV16.version);
  expect(sourceV13.entryPath).not.toBe(targetV16.entryPath);
  switchServer = await startSwitchServer(sourceV13);
});

test.afterAll(async () => {
  await switchServer?.close();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
  await Promise.all([...browserProfilePaths].map((profilePath) =>
    rm(profilePath, { recursive: true, force: true })
  ));
  browserProfilePaths.clear();
});

test("v13 万条案例直升 v16 后，第二次 clean boot 在 5 秒内命中完整性缓存", async ({}, testInfo) => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  const problemBuckets: string[][] = [];
  const watchPage = (page: Page) => problemBuckets.push(collectConsoleProblems(page));
  for (const page of context.pages()) watchPage(page);
  context.on("page", watchPage);
  const metrics: V16CapacityMetrics = {
    browser: `${testInfo.project.name} ${context.browser()?.version() ?? "unknown"}`,
    sourceBuild: sourceV13.version,
    targetBuild: targetV16.version
  };

  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const fixture = await readLegalCapacityCaseFixture(stable.page, sourceDescriptor.databaseName);
    const seedStartedAt = Date.now();
    const seeded = await seedLegacyV13CapacityCases(
      stable.page,
      fixture,
      sourceDescriptor.databaseName
    );
    metrics.seedMs = Date.now() - seedStartedAt;
    expect(seeded).toEqual(EXPECTED_CAPACITY_SEED_STATS);

    await activateTargetGeneration(stable.page);
    const firstPage = await context.newPage();
    const firstStartedAt = Date.now();
    const firstResponse = await firstPage.goto(`${switchServer.origin}/cases`, {
      waitUntil: "domcontentloaded"
    });
    metrics.firstTargetNavigationMs = Date.now() - firstStartedAt;
    expect(firstResponse?.fromServiceWorker()).toBe(true);
    await firstPage.bringToFront();
    await waitForActualInteractionReady(firstPage, FIRST_MIGRATION_READY_TIMEOUT_MS);
    metrics.firstMigrationFullAuditInteractionReadyMs = Date.now() - firstStartedAt;
    await waitForServiceWorker(firstPage);
    await expectPageFixture(firstPage, targetV16);
    await expect.poll(() => workerBuildVersion(firstPage, "controller")).toBe(targetV16.version);
    await expect.poll(() => pageReleaseEvidence(firstPage)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expect.poll(() => cacheGeneration(firstPage, targetV16)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
    await expectCommittedTarget(firstPage);

    const firstIntegrity = await integrityEvidence(firstPage);
    metrics.firstIntegrityMode = firstIntegrity.mode;
    metrics.firstIntegrityModeHistory = firstIntegrity.history;
    expect(firstIntegrity.mode).toBe("full_audit" satisfies IntegrityMode);
    metrics.firstCounts = await readCapacitySeedStats(firstPage, targetDescriptor.databaseName);
    expect(metrics.firstCounts).toEqual(EXPECTED_CAPACITY_SEED_STATS);
    metrics.firstMutationState = await readMutationStateEvidence(firstPage);
    expect(metrics.firstMutationState).toMatchObject({
      id: "current"
    });
    expect(Number.isSafeInteger(metrics.firstMutationState?.epoch)).toBe(true);
    // This direct-hop fixture performs exactly one outer materialization
    // transaction, so DBCore must advance the epoch exactly once.
    expect(metrics.firstMutationState?.epoch).toBe(1);
    expect(metrics.firstMutationState?.verifiedEpoch).toBe(1);
    expect(metrics.firstMutationState?.verifiedContractVersion).toEqual(expect.any(String));
    expect(metrics.firstMutationState?.verifiedPayloadDigest).toMatch(/^[0-9a-f]{64}$/u);

    await Promise.all(context.pages().map((page) => page.close()));

    const cleanPage = await context.newPage();
    const cleanStartedAt = Date.now();
    const cleanResponse = await cleanPage.goto(`${switchServer.origin}/cases`, {
      waitUntil: "domcontentloaded"
    });
    metrics.cleanNavigationMs = Date.now() - cleanStartedAt;
    expect(cleanResponse?.fromServiceWorker()).toBe(true);
    await cleanPage.bringToFront();
    await waitForActualInteractionReady(cleanPage, CLEAN_INTERACTION_READY_BUDGET_MS);
    metrics.cleanInteractionReadyMs = Date.now() - cleanStartedAt;
    expect(metrics.cleanInteractionReadyMs).toBeLessThanOrEqual(CLEAN_INTERACTION_READY_BUDGET_MS);
    await expectPageFixture(cleanPage, targetV16);

    const cleanIntegrity = await integrityEvidence(cleanPage);
    metrics.cleanIntegrityMode = cleanIntegrity.mode;
    metrics.cleanIntegrityModeHistory = cleanIntegrity.history;
    expect(cleanIntegrity.mode).toBe("cache_hit" satisfies IntegrityMode);
    // Production recordIntegrityVerificationMode never overwrites full_audit
    // with cache_hit, so the final cache_hit value proves that this clean boot
    // never entered the full-audit branch. History remains diagnostic only.

    metrics.cleanCounts = await readCapacitySeedStats(cleanPage, targetDescriptor.databaseName);
    expect(metrics.cleanCounts).toEqual(EXPECTED_CAPACITY_SEED_STATS);
    metrics.cleanMutationState = await readMutationStateEvidence(cleanPage);
    expect(metrics.cleanMutationState).toEqual(metrics.firstMutationState);

    await expectToolbarCount(cleanPage, ACTIVE_CAPACITY_CASES);
    metrics.cleanInitialRows = await boundedRowCount(cleanPage);

    await cleanPage.getByRole("button", { name: "收藏", exact: true }).click();
    await expectToolbarCount(cleanPage, ACTIVE_CAPACITY_FAVORITES);
    metrics.cleanFavoriteRows = await boundedRowCount(cleanPage);

    await cleanPage.getByRole("button", { name: "回收站", exact: true }).click();
    await expectToolbarCount(cleanPage, TRASHED_CAPACITY_CASES);
    metrics.cleanTrashRows = await boundedRowCount(cleanPage);

    await cleanPage.getByRole("button", { name: "全部", exact: true }).click();
    await expectToolbarCount(cleanPage, ACTIVE_CAPACITY_CASES);
    const searchStartedAt = Date.now();
    await cleanPage.getByLabel("搜索案例与研究笔记").fill(RARE_CAPACITY_QUERY);
    await expectToolbarCount(cleanPage, 1);
    const rareRow = caseRows(cleanPage).filter({ hasText: RARE_CAPACITY_ALIAS });
    await expect(rareRow).toHaveCount(1, { timeout: UI_ACTION_TIMEOUT_MS });
    metrics.cleanRareRows = await caseRows(cleanPage).count();
    metrics.cleanSearchMs = Date.now() - searchStartedAt;
    expect(metrics.cleanRareRows).toBe(1);

    const rareCaseId = deterministicCapacityCaseId(RARE_CAPACITY_INDEX);
    const rareRevisionId = deterministicCapacityRevisionId(RARE_CAPACITY_INDEX);
    const openStartedAt = Date.now();
    await rareRow.getByRole("link", { name: `打开 ${RARE_CAPACITY_ALIAS}`, exact: true }).click();
    await cleanPage.waitForURL(`/cases/${rareCaseId}/revisions/${rareRevisionId}`, {
      timeout: UI_ACTION_TIMEOUT_MS
    });
    await waitForAppReady(cleanPage);
    await expect(cleanPage.getByRole("heading", {
      name: RARE_CAPACITY_ALIAS,
      level: 1
    })).toBeVisible();
    metrics.cleanOpenMs = Date.now() - openStartedAt;

    expect(problemBuckets.flat()).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const problems = problemBuckets.flat();
    if (problems.length > 0) {
      console.info(`[schema-v16-clean-start-capacity:console] ${JSON.stringify(problems)}`);
    }
    await attachMetrics(testInfo, metrics);
    await context.close();
  }
});
