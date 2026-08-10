import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR
} from "../release-protocol";
import {
  CACHE_PREFIX,
  RELEASE_CONTROL_DATABASE,
  buildGeneration,
  collectExternalRequests,
  createDemoCase,
  openStableBridge,
  readNativeDatabase,
  startSwitchServer,
  type GenerationFixture,
  type NativeDatabaseSnapshot,
  type SwitchServer
} from "./cross-schema-upgrade-helpers";
import {
  collectConsoleProblems,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedActiveRulePack,
  seedPortableData
} from "./full-backup-helpers";

const SOURCE_DATABASE = BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const TARGET_DATABASE = PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const INTERMEDIATE_V14_DATABASE = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const SOURCE_NATIVE_VERSION = 130;

type SanitizedDatabaseInventory = Array<{
  name: string;
  version: number;
}>;

let fixtureRoot = "";
let sourceV13: GenerationFixture;
let targetV15: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(label: string): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) throw new Error(`Unsupported orphaned-v13 browser project: ${projectName}`);

  const profilePath = await mkdtemp(path.join(os.tmpdir(), `hb-orphaned-v13-${label}-`));
  browserProfilePaths.add(profilePath);
  const context = await chromium.launchPersistentContext(profilePath, {
    channel,
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow",
    baseURL: switchServer.origin,
    viewport: { width: 1280, height: 820 }
  });
  test.info().annotations.push({
    type: "browser-version",
    description: `${channel} ${context.browser()?.version() ?? "unknown"}`
  });
  return context;
}

async function databaseInventory(page: Page): Promise<SanitizedDatabaseInventory> {
  return page.evaluate(async () => (await indexedDB.databases())
    .filter((entry): entry is IDBDatabaseInfo & { name: string; version: number } => (
      typeof entry.name === "string" && typeof entry.version === "number"
    ))
    .map(({ name, version }) => ({ name, version }))
    .sort((left, right) => left.name.localeCompare(right.name)));
}

async function cacheInventory(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await caches.keys()).sort());
}

async function removeControlWorkerAndShell(page: Page): Promise<void> {
  await page.evaluate(async ({ controlDatabase, cachePrefix }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(controlDatabase);
      const timeout = window.setTimeout(
        () => reject(new Error("Release-control deletion timed out")),
        10_000
      );
      request.onsuccess = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      request.onerror = () => {
        window.clearTimeout(timeout);
        reject(request.error ?? new Error("Release-control deletion failed"));
      };
      request.onblocked = () => {
        window.clearTimeout(timeout);
        reject(new Error("Release-control deletion was blocked by a stale connection"));
      };
    });

    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregistered = await Promise.all(registrations.map((registration) => registration.unregister()));
    if (unregistered.some((result) => !result)) {
      throw new Error("A v13 Service Worker registration refused to unregister.");
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((cacheName) => cacheName.startsWith(cachePrefix))
      .map((cacheName) => caches.delete(cacheName)));
  }, { controlDatabase: RELEASE_CONTROL_DATABASE, cachePrefix: CACHE_PREFIX });

  await expect.poll(() => page.evaluate(async () => ({
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    shellCaches: (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX))
  }))).toEqual({ registrations: 0, shellCaches: [] });
}

function expectRichV13Source(snapshot: NativeDatabaseSnapshot): void {
  expect(snapshot.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
  expect(snapshot.stores).toHaveLength(16);
  for (const storeName of [
    "cases",
    "revisions",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry"
  ]) {
    expect(snapshot.rows[storeName]?.length, `expected seeded v13 rows in ${storeName}`)
      .toBeGreaterThan(0);
  }
}

async function expectNoReleaseSideEffects(
  page: Page,
  sourceBefore: NativeDatabaseSnapshot,
  cacheBefore: readonly string[]
): Promise<void> {
  expect(await databaseInventory(page)).toEqual([
    { name: SOURCE_DATABASE, version: SOURCE_NATIVE_VERSION }
  ]);
  expect(await readNativeDatabase(page, SOURCE_DATABASE)).toEqual(sourceBefore);
  expect(await readNativeDatabase(page, RELEASE_CONTROL_DATABASE)).toBeNull();
  expect(await readNativeDatabase(page, INTERMEDIATE_V14_DATABASE)).toBeNull();
  expect(await readNativeDatabase(page, TARGET_DATABASE)).toBeNull();
  expect(await cacheInventory(page)).toEqual(cacheBefore);
  expect(await page.evaluate(async () => ({
    controller: Boolean(navigator.serviceWorker.controller),
    registrations: (await navigator.serviceWorker.getRegistrations()).length
  }))).toEqual({ controller: false, registrations: 0 });
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-orphaned-v13-generations-"));
  [sourceV13, targetV15] = await Promise.all([
    buildGeneration(
      fixtureRoot,
      "orphaned-source-v13",
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    ),
    buildGeneration(
      fixtureRoot,
      "orphaned-target-v15",
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
    )
  ]);
  expect(sourceV13.version).not.toBe(targetV15.version);
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

test("仅遗留精确 v13 数据库且无旧壳时，v15 只读救援并导出可预检 ZIP", async () => {
  const context = await launchFixtureContext("rescue");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  let verificationContext: BrowserContext | null = null;
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    await openDataManagement(stable.page);
    await seedPortableData(stable.page, portableFixture("R0 orphaned v13"));
    await seedActiveRulePack(stable.page);

    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The rich v13 source database was not created.");
    expectRichV13Source(sourceBefore);
    expect(await readNativeDatabase(stable.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(stable.page, TARGET_DATABASE)).toBeNull();

    await removeControlWorkerAndShell(stable.page);
    const cacheBefore = await cacheInventory(stable.page);
    expect(cacheBefore.filter((name) => name.startsWith(CACHE_PREFIX))).toEqual([]);
    expect(await databaseInventory(stable.page)).toEqual([
      { name: SOURCE_DATABASE, version: SOURCE_NATIVE_VERSION }
    ]);
    expect(await readNativeDatabase(stable.page, SOURCE_DATABASE)).toEqual(sourceBefore);

    for (const page of context.pages()) await page.close();
    switchServer.requests.length = 0;
    switchServer.setGeneration(targetV15);

    const targetPage = await context.newPage();
    const targetProblems = collectConsoleProblems(targetPage);
    const targetRequestPaths: string[] = [];
    targetPage.on("request", (request) => targetRequestPaths.push(new URL(request.url()).pathname));
    const response = await targetPage.goto(`${switchServer.origin}/`, { waitUntil: "domcontentloaded" });
    expect(response?.fromServiceWorker()).toBe(false);

    await expect(targetPage.locator("#orphaned-v13-title")).toBeVisible();
    await expect(targetPage.getByRole("heading", {
      name: "检测到未登记的 v13 本地数据库"
    })).toBeVisible();
    await expect.poll(() => targetPage.evaluate(() => ({
      recoveryMode: document.documentElement.dataset.prebootRecoveryMode ?? null,
      appBootReady: document.documentElement.dataset.appBootReady ?? null,
      swRegistered: document.documentElement.dataset.swRegistered ?? null,
      swReady: document.documentElement.dataset.swReady ?? null,
      swBootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null
    }))).toEqual({
      recoveryMode: "orphaned_v13",
      appBootReady: "false",
      swRegistered: null,
      swReady: null,
      swBootSignalSent: null
    });
    await expectNoReleaseSideEffects(targetPage, sourceBefore, cacheBefore);

    expect(targetRequestPaths).not.toContain("/sw.js");
    expect(switchServer.requests.filter((request) => (
      request.generation === targetV15.name && request.pathname === "/sw.js"
    ))).toEqual([]);
    expect(externalRequests).toEqual([]);

    await targetPage.screenshot({
      path: test.info().outputPath("orphaned-v13-recovery-desktop.png"),
      fullPage: true
    });
    await targetPage.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => targetPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
    await targetPage.screenshot({
      path: test.info().outputPath("orphaned-v13-recovery-mobile.png"),
      fullPage: true
    });

    const downloadPromise = targetPage.waitForEvent("download");
    await targetPage.getByRole("button", {
      name: "生成并下载只读完整备份 ZIP",
      exact: true
    }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^hakimi-v13-read-only-full-backup-\d{4}-\d{2}-\d{2}\.zip$/u
    );
    expect(await download.failure()).toBeNull();
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error("The orphaned-v13 backup download path is unavailable.");
    const backupBytes = await readFile(downloadPath);
    expect([...backupBytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    await expect(targetPage.getByRole("status")).toBeVisible();

    await expectNoReleaseSideEffects(targetPage, sourceBefore, cacheBefore);
    expect(targetRequestPaths).not.toContain("/sw.js");
    expect(switchServer.requests.filter((request) => (
      request.generation === targetV15.name && request.pathname === "/sw.js"
    ))).toEqual([]);
    expect(targetProblems).toEqual([]);

    // Validate the rescue artifact through the product's existing full-backup
    // preflight UI in an isolated browser profile. This verifier is allowed to
    // create its own v13 control records; the rescued profile above remains
    // unchanged and is asserted before this server switch.
    switchServer.setGeneration(sourceV13);
    verificationContext = await launchFixtureContext("preflight");
    const verifier = await openStableBridge(verificationContext, switchServer, sourceV13);
    await openDataManagement(verifier.page);
    await preflightBackupZip(verifier.page, backupBytes, download.suggestedFilename());
    expect(verifier.problems).toEqual([]);

    expect(stable.problems.filter((problem) => !problem.includes(
      `Another connection wants to delete database '${RELEASE_CONTROL_DATABASE}'. Closing db now to resume the delete request.`
    ))).toEqual([]);
  } finally {
    await verificationContext?.close();
    await context.close();
  }
});
