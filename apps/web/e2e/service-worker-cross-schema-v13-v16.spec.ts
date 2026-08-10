import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import {
  EXPECTED_CAPACITY_SEED_STATS,
  readCapacitySeedStats,
  readLegalCapacityCaseFixture,
  seedLegacyV13CapacityCases
} from "./case-library-capacity-helpers";
import {
  attemptRepositoryWrite,
  buildGeneration,
  cacheGeneration,
  collectExternalRequests,
  createDemoCase,
  expectPageFixture,
  holdDatabaseUpgradeOpen,
  installOneShotBootOkInterruption,
  openBridgeNavigationAfterSwitch,
  openStableBridge,
  pageReleaseEvidence,
  readNativeDatabase,
  readReleaseControl,
  releaseDatabaseUpgradeBlocker,
  startSwitchServer,
  workerBuildVersion,
  type CrossSchemaFault,
  type GenerationFixture,
  type NativeDatabaseSnapshot,
  type SwitchServer
} from "./cross-schema-upgrade-helpers";
import {
  collectConsoleProblems,
  openDataManagement,
  portableFixture,
  seedActiveRulePack,
  seedPortableData,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const sourceDescriptor: ReleaseDatabaseDescriptor = BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
const targetDescriptor: ReleaseDatabaseDescriptor =
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;
const republishedTargetDescriptor = Object.freeze({
  ...targetDescriptor,
  migrationId: "v13-to-v16-mutation-state-v2-republish-e2e",
  acceptedCommittedMigrationIds: Object.freeze([
    targetDescriptor.migrationId,
    "v13-to-v16-mutation-state-v2-republish-e2e"
  ])
} satisfies ReleaseDatabaseDescriptor);
const SOURCE_DATABASE = sourceDescriptor.databaseName;
const TARGET_DATABASE = targetDescriptor.databaseName;
const INTERMEDIATE_V14_DATABASE = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const INTERMEDIATE_V15_DATABASE = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const SOURCE_NATIVE_VERSION = 130;
const TARGET_NATIVE_VERSION = 160;
const RECEIPT_STORE = "revisionCalculationReceipts";
const MUTATION_STATE_STORE = "mutationState";
const V14_ACTIVITY_INDEX = {
  name: "[caseId+updatedAt]",
  keyPath: ["caseId", "updatedAt"],
  unique: false,
  multiEntry: false
} as const;
const EXPECTED_TARGET_DELETE_CONNECTION_WARNING =
  `warning: Another connection wants to delete database '${TARGET_DATABASE}'. Closing db now to resume the delete request.`;
const ACTIVATION_TIMEOUT_MS = 90_000;
const CONVERGENCE_TIMEOUT_MS = 180_000;

let fixtureRoot = "";
let sourceV13: GenerationFixture;
let healthyV16: GenerationFixture;
let migrationFailedV16: GenerationFixture;
let validationFailedV16: GenerationFixture;
let digestMismatchV16: GenerationFixture;
let sameMigrationIdRepublishV16: GenerationFixture;
let newMigrationIdRepublishV16: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) throw new Error(`Unsupported v13→v16 browser project: ${projectName}`);

  const profilePath = await mkdtemp(path.join(os.tmpdir(), "hb-v13-v16-profile-"));
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

async function installAuditReleaseAfterWorkerTakeover(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const originalPostMessage = Worker.prototype.postMessage;
    let blockedAudit = false;
    Worker.prototype.postMessage = function (
      message: unknown,
      transferOrOptions?: Transferable[] | StructuredSerializeOptions
    ): void {
      const request = message as { type?: unknown } | null;
      const rawDescriptor = document.querySelector<HTMLMetaElement>(
        'meta[name="hakimi-release-database"]'
      )?.content;
      const descriptor = rawDescriptor
        ? JSON.parse(rawDescriptor) as { targetSchema?: unknown }
        : null;
      if (
        !blockedAudit &&
        descriptor?.targetSchema === 13 &&
        request?.type === "inspect_snapshot"
      ) {
        blockedAudit = true;
        document.documentElement.dataset.e2eV13AuditStarted = "true";
        const targetWorker = this;
        const originalOnMessage = targetWorker.onmessage;
        let controllerChanged = false;
        let pendingResult: MessageEvent<unknown> | null = null;
        targetWorker.onmessage = (event: MessageEvent<unknown>) => {
          const response = event.data as { type?: unknown } | null;
          if (response?.type === "snapshot_verified") {
            document.documentElement.dataset.e2eV13AuditCompleted = "true";
            if (!controllerChanged) {
              pendingResult = event;
              document.documentElement.dataset.e2eV13AuditResultHeld = "true";
              return;
            }
          }
          originalOnMessage?.call(targetWorker, event);
        };
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          controllerChanged = true;
          window.setTimeout(() => {
            document.documentElement.dataset.e2eV13AuditReleased = "true";
            if (pendingResult) {
              originalOnMessage?.call(targetWorker, pendingResult);
              pendingResult = null;
            }
          }, 500);
        }, { once: true });
      }
      if (transferOrOptions === undefined) {
        Reflect.apply(originalPostMessage, this, [message]);
      } else {
        Reflect.apply(originalPostMessage, this, [message, transferOrOptions]);
      }
    };
  });
}

async function installV16AuditResultGate(
  page: Page,
  storageKey: string
): Promise<void> {
  await page.addInitScript((gateKey) => {
    const originalPostMessage = Worker.prototype.postMessage;
    let intercepted = false;
    Worker.prototype.postMessage = function (
      message: unknown,
      transferOrOptions?: Transferable[] | StructuredSerializeOptions
    ): void {
      const request = message as { type?: unknown } | null;
      const rawDescriptor = document.querySelector<HTMLMetaElement>(
        'meta[name="hakimi-release-database"]'
      )?.content;
      const descriptor = rawDescriptor
        ? JSON.parse(rawDescriptor) as { targetSchema?: unknown }
        : null;
      if (
        !intercepted &&
        descriptor?.targetSchema === 16 &&
        request?.type === "inspect_snapshot" &&
        localStorage.getItem(gateKey) !== "released"
      ) {
        intercepted = true;
        document.documentElement.dataset.e2eV16AuditStarted = "true";
        const targetWorker = this;
        const originalOnMessage = targetWorker.onmessage;
        let pendingResult: MessageEvent<unknown> | null = null;
        const release = () => {
          if (!pendingResult) return;
          document.documentElement.dataset.e2eV16AuditReleased = "true";
          originalOnMessage?.call(targetWorker, pendingResult);
          pendingResult = null;
        };
        targetWorker.onmessage = (event: MessageEvent<unknown>) => {
          const response = event.data as { type?: unknown } | null;
          if (
            response?.type === "snapshot_verified" &&
            localStorage.getItem(gateKey) !== "released"
          ) {
            pendingResult = event;
            document.documentElement.dataset.e2eV16AuditResultHeld = "true";
            return;
          }
          originalOnMessage?.call(targetWorker, event);
        };
        window.addEventListener("storage", (event) => {
          if (event.key === gateKey && event.newValue === "released") release();
        });
      }
      if (transferOrOptions === undefined) {
        Reflect.apply(originalPostMessage, this, [message]);
      } else {
        Reflect.apply(originalPostMessage, this, [message, transferOrOptions]);
      }
    };
  }, storageKey);
}

async function activateTargetGeneration(
  readySourcePage: Page,
  target: GenerationFixture = healthyV16
): Promise<void> {
  switchServer.setGeneration(target);
  await readySourcePage.bringToFront();
  await readySourcePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("The ready v13 page has no Service Worker registration.");
    await registration.update();
  });
  await expect.poll(
    () => cacheGeneration(readySourcePage, target),
    { timeout: ACTIVATION_TIMEOUT_MS }
  ).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    dbGeneration: target.descriptor.dbGeneration,
    databaseName: target.descriptor.databaseName,
    targetSchema: target.descriptor.targetSchema,
    migrationId: target.descriptor.migrationId
  });

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
  ).toBe(target.version);
}

async function switchToTargetAndWaitForActivation(
  context: BrowserContext,
  target: GenerationFixture
): Promise<{ bridgePage: Page; problems: string[] }> {
  switchServer.setGeneration(target);
  const natural = await openBridgeNavigationAfterSwitch(
    context,
    switchServer,
    sourceV13
  );
  await expect.poll(() => cacheGeneration(natural.page, target), {
    timeout: ACTIVATION_TIMEOUT_MS
  }).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    dbGeneration: target.descriptor.dbGeneration,
    databaseName: target.descriptor.databaseName,
    targetSchema: target.descriptor.targetSchema,
    migrationId: target.descriptor.migrationId
  });
  await expect.poll(
    () => workerBuildVersion(natural.page, "active"),
    { timeout: ACTIVATION_TIMEOUT_MS }
  ).toBe(target.version);
  return { bridgePage: natural.page, problems: natural.problems };
}

async function openTargetTrial(
  context: BrowserContext,
  target: GenerationFixture
): Promise<{ page: Page; problems: string[] }> {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  const response = await page.goto(`${switchServer.origin}/cases`, {
    waitUntil: "domcontentloaded"
  });
  expect(response?.fromServiceWorker()).toBe(true);
  await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
    fixture: target.name,
    buildVersion: target.version,
    dbGeneration: target.descriptor.dbGeneration,
    dbSchema: String(target.descriptor.targetSchema),
    descriptor: target.descriptor
  });
  return { page, problems };
}

async function openRecoveredSource(
  context: BrowserContext
): Promise<{ page: Page; problems: string[] }> {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await expectPageFixture(page, sourceV13);
  return { page, problems };
}

async function readNativeDatabaseShape(page: Page, databaseName: string): Promise<{
  nativeVersion: number;
  stores: string[];
} | null> {
  return page.evaluate(async (name) => {
    const databases = await indexedDB.databases();
    if (!databases.some((entry) => entry.name === name)) return null;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Cannot open ${name}`));
      request.onupgradeneeded = () => reject(new Error(`Opening ${name} unexpectedly upgraded it`));
    });
    const shape = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort()
    };
    database.close();
    return shape;
  }, databaseName);
}

async function readMutationState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(async (databaseName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Cannot open Schema 16 database"));
      request.onupgradeneeded = () => reject(new Error("Reading mutationState unexpectedly upgraded the database"));
    });
    const state = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction("mutationState", "readonly")
        .objectStore("mutationState").get("current");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Cannot read mutationState"));
    });
    database.close();
    return state as Record<string, unknown> | null;
  }, targetDescriptor.databaseName);
}

async function expectCommittedTarget(
  page: Page,
  target: GenerationFixture = healthyV16
): Promise<void> {
  await expect.poll(() => readReleaseControl(page), { timeout: CONVERGENCE_TIMEOUT_MS })
    .toMatchObject({
      state: {
        id: "current",
        protocolVersion: 1,
        committedGeneration: target.descriptor.dbGeneration,
        committedDatabaseName: target.descriptor.databaseName,
        committedSchema: target.descriptor.targetSchema,
        committedBuild: target.version,
        migrationId: target.descriptor.migrationId
      }
    });
}

function migrationJournal(
  control: Awaited<ReturnType<typeof readReleaseControl>>,
  migrationId = targetDescriptor.migrationId
): Record<string, unknown> | null {
  return control?.journals.find((journal) => journal.id === migrationId) ?? null;
}

async function expectFailedMigrationJournal(
  page: Page,
  fault: CrossSchemaFault | "blocked",
  migrationId = targetDescriptor.migrationId
): Promise<void> {
  await expect.poll(async () => {
    const journal = migrationJournal(await readReleaseControl(page), migrationId);
    return journal && {
      phase: journal.phase,
      error: String(journal.error ?? journal.failureReason ?? journal.failure ?? "")
    };
  }, { timeout: CONVERGENCE_TIMEOUT_MS }).toMatchObject({ phase: "failed" });
  const journal = migrationJournal(await readReleaseControl(page), migrationId);
  expect(journal).not.toBeNull();
  const serialized = JSON.stringify(journal);
  if (fault === "migration") {
    expect(serialized).toContain("synthetic v16 migration transaction failure");
  } else if (fault === "validation") {
    expect(serialized).toContain("synthetic v16 target validation failure");
  } else if (fault === "digest") {
    expect(serialized).toContain("影子数据库物化后摘要发生变化");
  } else {
    expect(serialized.toLowerCase()).toMatch(/blocked|timeout|占用|阻塞/u);
  }
}

function expectSourceUnchanged(
  before: NativeDatabaseSnapshot,
  after: NativeDatabaseSnapshot | null
): void {
  expect(after).toEqual(before);
  expect(after?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
}

function expectDirectV16ExtendsV13WithoutRewriting(
  source: NativeDatabaseSnapshot,
  target: NativeDatabaseSnapshot | null
): asserts target is NativeDatabaseSnapshot {
  expect(source.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
  expect(source.stores).not.toContain(RECEIPT_STORE);
  expect(source.stores).not.toContain(MUTATION_STATE_STORE);
  expect(target).not.toBeNull();
  if (!target) throw new Error("Expected the direct-hop Schema 16 shadow database to exist.");

  expect(target.nativeVersion).toBe(TARGET_NATIVE_VERSION);
  expect(target.stores).toEqual([
    ...source.stores,
    RECEIPT_STORE,
    MUTATION_STATE_STORE
  ].sort());
  for (const storeName of source.stores) {
    expect(target.rows[storeName], `direct v16 must preserve every v13 row in ${storeName}`)
      .toEqual(source.rows[storeName]);
    if (storeName !== "researchNotes" && storeName !== "events") {
      expect(target.storeMetadata[storeName], `direct v16 metadata for ${storeName}`)
        .toEqual(source.storeMetadata[storeName]);
    }
  }
  for (const storeName of ["researchNotes", "events"] as const) {
    const sourceMetadata = source.storeMetadata[storeName];
    const targetMetadata = target.storeMetadata[storeName];
    expect(sourceMetadata).toBeDefined();
    expect(targetMetadata).toBeDefined();
    if (!sourceMetadata || !targetMetadata) throw new Error(`Missing metadata for ${storeName}.`);
    expect(sourceMetadata.indexes).not.toContainEqual(V14_ACTIVITY_INDEX);
    expect(targetMetadata.indexes).toContainEqual(V14_ACTIVITY_INDEX);
    expect({
      keyPath: targetMetadata.keyPath,
      autoIncrement: targetMetadata.autoIncrement,
      indexes: targetMetadata.indexes.filter((index) => index.name !== V14_ACTIVITY_INDEX.name)
    }).toEqual(sourceMetadata);
  }
  expect(target.rows[RECEIPT_STORE]).toEqual([]);
  expect(target.rows[MUTATION_STATE_STORE]).toHaveLength(1);
  expect(target.rows[MUTATION_STATE_STORE][0]).toMatchObject({
    id: "current",
    epoch: 1,
    verifiedEpoch: 1,
    verifiedPayloadDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
    verifiedContractVersion: expect.any(String)
  });
  expect(target.storeMetadata[MUTATION_STATE_STORE]).toEqual({
    keyPath: "id",
    autoIncrement: false,
    indexes: []
  });
}

async function expectCommittedMigrationReceipt(
  page: Page,
  migrationId = targetDescriptor.migrationId
): Promise<void> {
  await expect.poll(async () => {
    const control = await readReleaseControl(page);
    return control?.leases.every((lease) =>
      typeof lease.expiresAt === "number" && lease.expiresAt <= Date.now()
    ) ?? false;
  }, { timeout: 35_000 }).toBe(true);
  const control = await readReleaseControl(page);
  const journal = migrationJournal(control, migrationId);
  expect(journal).toMatchObject({
    id: migrationId,
    phase: "committed",
    failure: null,
    source: {
      generation: sourceDescriptor.dbGeneration,
      databaseName: sourceDescriptor.databaseName,
      schemaVersion: sourceDescriptor.targetSchema
    },
    target: {
      generation: targetDescriptor.dbGeneration,
      databaseName: targetDescriptor.databaseName,
      schemaVersion: targetDescriptor.targetSchema
    }
  });
  const source = journal?.source as { digest?: unknown } | undefined;
  expect(source?.digest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/u));
  expect(journal?.targetDigest).toBe(source?.digest);
  expect(journal?.verifiedDigest).toBe(source?.digest);
  expect(journal?.receiptDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/u));
  expect(control?.state?.receiptDigest).toBe(journal?.receiptDigest);
  expect(control?.leases).toHaveLength(1);
  expect(Number(control?.leases[0]?.expiresAt)).toBeLessThanOrEqual(Date.now());
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-schema-v13-v16-generations-"));
  [
    sourceV13,
    healthyV16,
    migrationFailedV16,
    validationFailedV16,
    digestMismatchV16,
    sameMigrationIdRepublishV16,
    newMigrationIdRepublishV16
  ] = await Promise.all([
    buildGeneration(fixtureRoot, "source-a-v13", sourceDescriptor),
    buildGeneration(fixtureRoot, "healthy-d-v16-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "migration-failed-d-v16-direct", targetDescriptor, "migration"),
    buildGeneration(fixtureRoot, "validation-failed-d-v16-direct", targetDescriptor, "validation"),
    buildGeneration(fixtureRoot, "digest-mismatch-d-v16-direct", targetDescriptor, "digest"),
    buildGeneration(fixtureRoot, "same-id-republish-d-v16-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "new-id-republish-d-v16-direct", republishedTargetDescriptor)
  ]);
  expect(new Set([
    sourceV13.version,
    healthyV16.version,
    migrationFailedV16.version,
    validationFailedV16.version,
    digestMismatchV16.version,
    sameMigrationIdRepublishV16.version,
    newMigrationIdRepublishV16.version
  ]).size).toBe(7);
  expect(sourceV13.entryPath).not.toBe(healthyV16.entryPath);
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

test("双旧 v13 页中一页已确认、另一页仍在万条慢审计时，新 v16 worker 接管后自动收敛", async () => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const fixture = await readLegalCapacityCaseFixture(stable.page, sourceDescriptor.databaseName);
    expect(await seedLegacyV13CapacityCases(
      stable.page,
      fixture,
      sourceDescriptor.databaseName
    )).toEqual(EXPECTED_CAPACITY_SEED_STATS);
    const sourceShape = await readNativeDatabaseShape(stable.page, sourceDescriptor.databaseName);
    expect(sourceShape?.nativeVersion).toBe(130);

    await installAuditReleaseAfterWorkerTakeover(context);
    const slowPage = await context.newPage();
    const slowProblems = collectConsoleProblems(slowPage);
    const response = await slowPage.goto(`${switchServer.origin}/cases`, {
      waitUntil: "domcontentloaded"
    });
    expect(response?.fromServiceWorker()).toBe(true);
    await expect.poll(() => pageReleaseEvidence(slowPage)).toMatchObject({
      fixture: sourceV13.name,
      appBootReady: "false",
      dbGeneration: sourceDescriptor.dbGeneration,
      dbSchema: String(sourceDescriptor.targetSchema)
    });
    await expect.poll(() => slowPage.evaluate(() =>
      document.documentElement.dataset.e2eV13AuditStarted ?? null
    )).toBe("true");

    await activateTargetGeneration(stable.page);
    await expect.poll(
      () => workerBuildVersion(slowPage, "controller"),
      { timeout: ACTIVATION_TIMEOUT_MS }
    ).toBe(healthyV16.version);
    await expect.poll(async () => ({
      evidence: await pageReleaseEvidence(slowPage),
      controller: await workerBuildVersion(slowPage, "controller"),
      state: await slowPage.evaluate(() => ({
        auditStarted: document.documentElement.dataset.e2eV13AuditStarted ?? null,
        appBootReady: document.documentElement.dataset.appBootReady ?? null,
        swBootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null,
        inert: document.querySelector("#main-content")?.closest("[inert]") !== null
      }))
    }), { timeout: ACTIVATION_TIMEOUT_MS }).toMatchObject({
      evidence: {
        fixture: sourceV13.name,
        dbGeneration: sourceDescriptor.dbGeneration
      },
      controller: healthyV16.version,
      state: {
        auditStarted: "true",
        appBootReady: "false",
        swBootSignalSent: null,
        inert: true
      }
    });

    await expect.poll(
      async () => {
        try {
          return await pageReleaseEvidence(slowPage);
        } catch (error) {
          if (
            error instanceof Error &&
            /execution context was destroyed|most likely because of a navigation/iu.test(error.message)
          ) {
            return null;
          }
          throw error;
        }
      },
      { timeout: CONVERGENCE_TIMEOUT_MS, intervals: [100, 250, 500, 1_000] }
    ).toMatchObject({
      fixture: healthyV16.name,
      appBootReady: "true",
      swBootAck: "true",
      dbGeneration: targetDescriptor.dbGeneration,
      dbSchema: String(targetDescriptor.targetSchema),
      dbMigrationPhase: "committed"
    });
    await waitForAppReady(slowPage);
    await waitForServiceWorker(slowPage);
    await expectPageFixture(slowPage, healthyV16);
    await expectCommittedTarget(slowPage);
    await expect.poll(() => cacheGeneration(slowPage, healthyV16)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
    expect(await readCapacitySeedStats(slowPage, targetDescriptor.databaseName))
      .toEqual(EXPECTED_CAPACITY_SEED_STATS);
    expect(await readCapacitySeedStats(slowPage, sourceDescriptor.databaseName))
      .toEqual(EXPECTED_CAPACITY_SEED_STATS);
    const targetShape = await readNativeDatabaseShape(slowPage, targetDescriptor.databaseName);
    expect(targetShape?.nativeVersion).toBe(TARGET_NATIVE_VERSION);
    expect(targetShape?.stores).toContain("mutationState");
    expect(await readNativeDatabaseShape(slowPage, sourceDescriptor.databaseName)).toEqual(sourceShape);
    expect(await readMutationState(slowPage)).toMatchObject({
      id: "current",
      epoch: 1,
      verifiedEpoch: 1,
      verifiedPayloadDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
      verifiedContractVersion: expect.any(String)
    });
    const control = await readReleaseControl(slowPage);
    const journal = control?.journals.find((entry) => entry.id === targetDescriptor.migrationId);
    const source = journal?.source as { digest?: unknown } | undefined;
    expect(journal).toMatchObject({ phase: "committed", failure: null });
    expect(journal?.targetDigest).toBe(source?.digest);
    expect(journal?.verifiedDigest).toBe(source?.digest);
    expect(control?.state?.receiptDigest).toBe(journal?.receiptDigest);
    expect(await slowPage.evaluate(() =>
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type
    )).toBe("reload");
    expect(slowProblems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("全新浏览器直接安装 v16 时从空 v13 建立完整目标并确认 clean epoch", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    switchServer.setGeneration(healthyV16);
    const page = context.pages()[0] ?? await context.newPage();
    const problems = collectConsoleProblems(page);
    await page.goto(`${switchServer.origin}/`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expectPageFixture(page, healthyV16);
    await expectCommittedTarget(page);
    await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    const source = await readNativeDatabase(page, SOURCE_DATABASE);
    if (!source) throw new Error("Fresh v16 install did not create its empty v13 source boundary.");
    expectDirectV16ExtendsV13WithoutRewriting(
      source,
      await readNativeDatabase(page, TARGET_DATABASE)
    );
    await expectCommittedMigrationReceipt(page);
    expect(await readNativeDatabase(page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(page, INTERMEDIATE_V15_DATABASE)).toBeNull();
    expect(problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("富 v13 数据直升 v16 后，业务写入变 dirty、全审计恢复 clean、再次启动命中 cache", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    await openDataManagement(stable.page);
    await seedPortableData(stable.page, portableFixture("v13→v16 rich"));
    await seedActiveRulePack(stable.page, { source: "generated" });
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The rich v13 source database was not created.");
    expect(sourceBefore.rows.attachments.length).toBeGreaterThan(0);
    expect(sourceBefore.rows.ruleRegistry.length).toBeGreaterThan(0);

    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const trial = await openTargetTrial(context, healthyV16);
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expectPageFixture(trial.page, healthyV16);
    await expectCommittedTarget(trial.page);
    await expectCommittedMigrationReceipt(trial.page);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    expectDirectV16ExtendsV13WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(trial.page, TARGET_DATABASE)
    );
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(trial.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(trial.page, INTERMEDIATE_V15_DATABASE)).toBeNull();

    expect(await attemptRepositoryWrite(trial.page, caseId)).toMatchObject({ ok: true });
    expect(await readMutationState(trial.page)).toMatchObject({
      epoch: 2,
      verifiedEpoch: 1
    });
    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      appBootReady: "true",
      swBootAck: "true"
    });
    await expect.poll(() => trial.page.evaluate(() =>
      document.documentElement.dataset.dbIntegrityVerification ?? null
    )).toBe("full_audit");
    expect(await readMutationState(trial.page)).toMatchObject({
      epoch: 2,
      verifiedEpoch: 2
    });

    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expect.poll(() => trial.page.evaluate(() =>
      document.documentElement.dataset.dbIntegrityVerification ?? null
    )).toBe("cache_hit");
    expect(await readMutationState(trial.page)).toMatchObject({
      epoch: 2,
      verifiedEpoch: 2
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v16 冻结多个 v13 页的真实写入，提交后旧页只收敛到 v16", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 write-lock source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);
    const trial = await openTargetTrial(context, healthyV16);
    for (const sourcePage of [stable.page, natural.bridgePage]) {
      await expect.poll(() => sourcePage.evaluate(() =>
        document.documentElement.dataset.dbSourceWriteFrozen ?? null
      )).toBe("true");
      expect(await attemptRepositoryWrite(sourcePage, caseId)).toMatchObject({
        ok: false,
        errorName: "ReleaseDatabaseWriteLockedError"
      });
    }
    await expect.poll(() => stable.page.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked ?? null
    )).toBe("true");
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expectPageFixture(trial.page, healthyV16);
    await expectPageFixture(stable.page, healthyV16);
    await expectPageFixture(natural.bridgePage, healthyV16);
    await expectCommittedTarget(trial.page);
    expectDirectV16ExtendsV13WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(trial.page, TARGET_DATABASE)
    );
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(trial.problems.filter((problem) =>
      !problem.includes("blocked by other connection holding version 13")
    )).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const blockerPage = context.pages()[0];
    if (blockerPage && !blockerPage.isClosed()) {
      await releaseDatabaseUpgradeBlocker(blockerPage).catch(() => undefined);
    }
    await context.close();
  }
});

test("v16 影子容量不足时保留 v13、目标零创建且不发送 BOOT_OK", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 quota source database was not created.");
    await context.addInitScript(() => {
      Object.defineProperty(navigator.storage, "estimate", {
        configurable: true,
        value: async () => ({ usage: 1023, quota: 1024 })
      });
    });

    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const failed = await openTargetTrial(context, healthyV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      dbStorageAdmission: "insufficient",
      swBootAck: null,
      swBootSignalSent: null
    });
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page)))
      .toMatchObject({
        phase: "failed",
        failure: {
          code: "STORAGE_CAPACITY_INSUFFICIENT",
          targetIsolation: "not_requested"
        }
      });
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V15_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(await attemptRepositoryWrite(recovered.page,
      String((sourceBefore.rows.cases[0] as { id?: unknown }).id))).toMatchObject({ ok: true });
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v16 目标启动校验失败时隔离影子库并保持 v13 可恢复", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 validation source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, validationFailedV16);
    const failed = await openTargetTrial(context, validationFailedV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expectFailedMigrationJournal(failed.page, "validation");
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page)))
      .toMatchObject({ phase: "failed", failure: { targetIsolation: "complete" } });
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !problem.includes("synthetic v16 target validation failure")
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v16 目标完整审计摘要不符时删除目标并保留 v13", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 digest source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, digestMismatchV16);
    const failed = await openTargetTrial(context, digestMismatchV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expectFailedMigrationJournal(failed.page, "digest");
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page)))
      .toMatchObject({ phase: "failed", failure: { targetIsolation: "complete" } });
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !problem.includes("影子数据库物化后摘要发生变化")
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v16 Dexie 迁移事务中止时回滚 shadow、mutationState 不留下半代", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 transaction source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);
    await releaseDatabaseUpgradeBlocker(stable.page);
    const targetBefore = await readNativeDatabase(stable.page, TARGET_DATABASE);
    expect(targetBefore?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);

    const natural = await switchToTargetAndWaitForActivation(context, migrationFailedV16);
    const failed = await openTargetTrial(context, migrationFailedV16);
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expectFailedMigrationJournal(failed.page, "migration");
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    const targetAfter = await readNativeDatabase(failed.page, TARGET_DATABASE);
    expect(targetAfter === null || targetAfter.nativeVersion === SOURCE_NATIVE_VERSION).toBe(true);
    if (targetAfter) {
      expect(targetAfter).toEqual(targetBefore);
      expect(targetAfter.stores).not.toContain(MUTATION_STATE_STORE);
    }

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !problem.includes("synthetic v16 migration transaction failure")
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const blockerPage = context.pages()[0];
    if (blockerPage && !blockerPage.isClosed()) {
      await releaseDatabaseUpgradeBlocker(blockerPage).catch(() => undefined);
    }
    await context.close();
  }
});

test("v16 control 已提交但 BOOT_OK 中断时保持写锁，刷新后 clean 收敛", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    await installOneShotBootOkInterruption(context, targetDescriptor.dbGeneration);
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 BOOT_OK source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const trial = await openTargetTrial(context, healthyV16);
    await waitForAppReady(trial.page);
    await expect.poll(() => trial.page.evaluate(() =>
      document.documentElement.dataset.e2eBootOkWithheld ?? null
    )).toBe("true");
    await expectCommittedTarget(trial.page);
    await expect.poll(() => cacheGeneration(trial.page, healthyV16)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: null
    });
    expect(await attemptRepositoryWrite(trial.page, caseId)).toMatchObject({
      ok: false,
      errorName: "ReleaseDatabaseWriteLockedError"
    });
    expect(await readMutationState(trial.page)).toMatchObject({ epoch: 1, verifiedEpoch: 1 });

    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expectPageFixture(trial.page, healthyV16);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    await expect.poll(() => trial.page.evaluate(() =>
      document.documentElement.dataset.dbIntegrityVerification ?? null
    )).toBe("cache_hit");
    expect(await attemptRepositoryWrite(trial.page, caseId)).toMatchObject({ ok: true });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("陈旧页面持有 v16 target versionchange 时超时失败关闭且不提交目标", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 stale-target source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);

    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const failed = await openTargetTrial(context, healthyV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 35_000 });
    await expect.poll(() => stable.page.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked ?? null
    )).toBe("true");
    await expectFailedMigrationJournal(failed.page, "blocked");
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !/blocked|timeout|占用|阻塞/iu.test(problem) &&
      problem !== EXPECTED_TARGET_DELETE_CONNECTION_WARNING
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const blockerPage = context.pages()[0];
    if (blockerPage && !blockerPage.isClosed()) {
      await releaseDatabaseUpgradeBlocker(blockerPage).catch(() => undefined);
    }
    await context.close();
  }
});

test("dirty v16 全审计期间并发受支持写入使 CAS 失败，随后全审计恢复并命中 clean cache", async () => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const natural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const writer = await openTargetTrial(context, healthyV16);
    await waitForAppReady(writer.page);
    await waitForServiceWorker(writer.page);
    await expectCommittedTarget(writer.page);
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 1, verifiedEpoch: 1 });
    // The CAS case has exactly two participants: one verifier and one writer.
    // Retire the historical v13 pages so their automatic convergence audits
    // cannot independently bless epoch 2 while this verifier is held.
    await natural.bridgePage.close();
    await stable.page.close();

    expect(await attemptRepositoryWrite(writer.page, caseId)).toMatchObject({ ok: true });
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 2, verifiedEpoch: 1 });

    const gateKey = `hakimi-e2e-v16-cas-gate:${crypto.randomUUID()}`;
    const contender = await context.newPage();
    await installV16AuditResultGate(contender, gateKey);
    const contenderProblems = collectConsoleProblems(contender);
    await contender.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => contender.evaluate(() => ({
      auditStarted: document.documentElement.dataset.e2eV16AuditStarted ?? null,
      resultHeld: document.documentElement.dataset.e2eV16AuditResultHeld ?? null,
      appBootReady: document.documentElement.dataset.appBootReady ?? null,
      swBootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null
    })), { timeout: CONVERGENCE_TIMEOUT_MS }).toEqual({
      auditStarted: "true",
      resultHeld: "true",
      appBootReady: "false",
      swBootSignalSent: null
    });

    expect(await attemptRepositoryWrite(writer.page, caseId)).toMatchObject({ ok: true });
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 3, verifiedEpoch: 1 });
    await writer.page.evaluate((key) => localStorage.setItem(key, "released"), gateKey);

    await expect(contender.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(contender)).toMatchObject({
      appBootReady: "false",
      swBootAck: null,
      swBootSignalSent: null
    });
    await expect.poll(() => readReleaseControl(contender)).toMatchObject({
      state: {
        committedGeneration: targetDescriptor.dbGeneration,
        committedDatabaseName: targetDescriptor.databaseName,
        committedSchema: targetDescriptor.targetSchema
      }
    });
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 3, verifiedEpoch: 1 });
    expect(await attemptRepositoryWrite(contender, caseId)).toMatchObject({
      ok: false,
      errorName: "ReleaseDatabaseWriteLockedError"
    });
    await contender.close();

    const recovered = await context.newPage();
    const recoveredProblems = collectConsoleProblems(recovered);
    await recovered.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(recovered);
    await waitForServiceWorker(recovered);
    await expect.poll(() => recovered.evaluate(() =>
      document.documentElement.dataset.dbIntegrityVerification ?? null
    )).toBe("full_audit");
    expect(await readMutationState(recovered)).toMatchObject({ epoch: 3, verifiedEpoch: 3 });

    await recovered.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(recovered);
    await waitForServiceWorker(recovered);
    await expect.poll(() => recovered.evaluate(() =>
      document.documentElement.dataset.dbIntegrityVerification ?? null
    )).toBe("cache_hit");
    expect(await readMutationState(recovered)).toMatchObject({ epoch: 3, verifiedEpoch: 3 });
    expect(contenderProblems.some((problem) =>
      /Mutation epoch changed|CAS_CONFLICT/iu.test(problem)
    )).toBe(true);
    expect(contenderProblems.filter((problem) =>
      !/Mutation epoch changed|CAS_CONFLICT/iu.test(problem)
    )).toEqual([]);
    expect(recoveredProblems).toEqual([]);
    expect(writer.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v16 隔离受阻后同 migrationId 只清理不续跑，新 migrationId 可长期重发", async () => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 republish source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);

    const firstNatural = await switchToTargetAndWaitForActivation(context, healthyV16);
    const firstFailure = await openTargetTrial(context, healthyV16);
    await expect(firstFailure.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 35_000 });
    await expectFailedMigrationJournal(firstFailure.page, "blocked");
    await expect.poll(async () => migrationJournal(await readReleaseControl(firstFailure.page)))
      .toMatchObject({
        phase: "failed",
        failure: { targetIsolation: "failed" }
      });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(firstFailure.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await firstFailure.page.close();
    await firstNatural.bridgePage.close();
    await stable.page.close();

    const sameIdNatural = await switchToTargetAndWaitForActivation(
      context,
      sameMigrationIdRepublishV16
    );
    const sameIdFailure = await openTargetTrial(context, sameMigrationIdRepublishV16);
    await expect(sameIdFailure.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 35_000 });
    await expect.poll(async () => migrationJournal(await readReleaseControl(sameIdFailure.page)), {
      timeout: 35_000
    }).toMatchObject({
      phase: "failed",
      failure: {
        targetIsolation: "complete",
        isolationError: null
      }
    });
    expect(await readNativeDatabase(sameIdFailure.page, TARGET_DATABASE)).toBeNull();
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(sameIdFailure.page, SOURCE_DATABASE));
    await sameIdFailure.page.close();
    await sameIdNatural.bridgePage.close();

    const recovered = await openRecoveredSource(context);
    await activateTargetGeneration(recovered.page, newMigrationIdRepublishV16);
    const republished = await openTargetTrial(context, newMigrationIdRepublishV16);
    await waitForAppReady(republished.page);
    await waitForServiceWorker(republished.page);
    await expectPageFixture(republished.page, newMigrationIdRepublishV16);
    await expectCommittedTarget(republished.page, newMigrationIdRepublishV16);
    await expect.poll(() => cacheGeneration(republished.page, newMigrationIdRepublishV16))
      .toMatchObject({
        bootAttempted: true,
        bootConfirmed: true,
        migrationId: republishedTargetDescriptor.migrationId
      });

    const control = await readReleaseControl(republished.page);
    expect(migrationJournal(control)).toMatchObject({
      phase: "failed",
      failure: { targetIsolation: "complete", isolationError: null }
    });
    const republishedJournal = migrationJournal(
      control,
      republishedTargetDescriptor.migrationId
    );
    expect(republishedJournal).toMatchObject({
      phase: "committed",
      failure: null,
      source: {
        generation: sourceDescriptor.dbGeneration,
        databaseName: sourceDescriptor.databaseName,
        schemaVersion: sourceDescriptor.targetSchema
      },
      target: {
        generation: targetDescriptor.dbGeneration,
        databaseName: targetDescriptor.databaseName,
        schemaVersion: targetDescriptor.targetSchema
      }
    });
    const source = republishedJournal?.source as { digest?: unknown } | undefined;
    expect(republishedJournal?.targetDigest).toBe(source?.digest);
    expect(republishedJournal?.verifiedDigest).toBe(source?.digest);
    expect(control?.state?.receiptDigest).toBe(republishedJournal?.receiptDigest);
    expectDirectV16ExtendsV13WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(republished.page, TARGET_DATABASE)
    );
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(republished.page, SOURCE_DATABASE));
    expect(await attemptRepositoryWrite(republished.page, caseId)).toMatchObject({ ok: true });

    expect(firstFailure.problems.filter((problem) =>
      !/blocked|timeout|占用|阻塞/iu.test(problem) &&
      problem !== EXPECTED_TARGET_DELETE_CONNECTION_WARNING
    )).toEqual([]);
    expect(sameIdFailure.problems.filter((problem) =>
      !/migrationId.*失败终态|失败终态/iu.test(problem)
    )).toEqual([]);
    expect(firstNatural.problems).toEqual([]);
    expect(sameIdNatural.problems).toEqual([]);
    expect(republished.problems).toEqual([]);
    expect(recovered.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const blockerPage = context.pages()[0];
    if (blockerPage && !blockerPage.isClosed()) {
      await releaseDatabaseUpgradeBlocker(blockerPage).catch(() => undefined);
    }
    await context.close();
  }
});
