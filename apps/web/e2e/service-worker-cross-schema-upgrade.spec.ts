import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import {
  SOURCE_DATABASE,
  SOURCE_NATIVE_VERSION,
  TARGET_DATABASE,
  TARGET_NATIVE_VERSION,
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
  serviceWorkerLifecycleSnapshot,
  startSwitchServer,
  workerBuildVersion,
  type CrossSchemaFault,
  type GenerationFixture,
  type NativeDatabaseSnapshot,
  type ReleaseControlSnapshot,
  type SwitchServer
} from "./cross-schema-upgrade-helpers";
import { collectConsoleProblems, waitForAppReady, waitForServiceWorker } from "./full-backup-helpers";

const bridgeDescriptor: ReleaseDatabaseDescriptor = BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
const shadowDescriptor: ReleaseDatabaseDescriptor = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR;

let fixtureRoot = "";
let stableA: GenerationFixture;
let healthyB: GenerationFixture;
let migrationFailedB: GenerationFixture;
let validationFailedB: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(_testInfo: unknown, _profileName: string) {
  // Keep Chromium's LevelDB path below the legacy Windows MAX_PATH boundary.
  // Playwright's result folder includes the (Chinese) test title; nesting the
  // persistent profile there makes IndexedDB fail with a misleading UnknownError.
  const profilePath = await mkdtemp(path.join(os.tmpdir(), "hb-cross-profile-"));
  browserProfilePaths.add(profilePath);
  return chromium.launchPersistentContext(profilePath, {
    channel: "msedge",
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow",
    viewport: { width: 1280, height: 820 }
  });
}

function migrationJournal(control: ReleaseControlSnapshot | null): Record<string, unknown> | null {
  return control?.journals.find((journal) => journal.id === shadowDescriptor.migrationId) ?? null;
}

async function expectCommittedControl(page: Page, fixture: GenerationFixture): Promise<void> {
  await expect.poll(() => readReleaseControl(page)).toMatchObject({
    state: {
      id: "current",
      protocolVersion: 1,
      committedGeneration: fixture.descriptor.dbGeneration,
      committedDatabaseName: fixture.descriptor.databaseName,
      committedSchema: fixture.descriptor.targetSchema,
      committedBuild: fixture.version,
      migrationId: fixture.descriptor.migrationId
    }
  });
}

async function expectFailedMigrationJournal(page: Page, fault: CrossSchemaFault | "blocked"): Promise<void> {
  await expect.poll(async () => {
    const journal = migrationJournal(await readReleaseControl(page));
    return journal && {
      phase: journal.phase,
      error: String(journal.error ?? journal.failureReason ?? journal.failure ?? "")
    };
  }).toMatchObject({ phase: "failed" });
  const journal = migrationJournal(await readReleaseControl(page));
  expect(journal).not.toBeNull();
  if (fault === "migration") {
    expect(JSON.stringify(journal)).toContain("synthetic v14 migration transaction failure");
  } else if (fault === "validation") {
    expect(JSON.stringify(journal)).toContain("synthetic v14 target validation failure");
  } else {
    expect(JSON.stringify(journal).toLowerCase()).toMatch(/blocked|timeout|占用|阻塞/u);
  }
}

function expectSourceUnchanged(before: NativeDatabaseSnapshot, after: NativeDatabaseSnapshot | null): void {
  expect(after).toEqual(before);
  expect(after?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
}

const V14_ACTIVITY_INDEX = {
  name: "[caseId+updatedAt]",
  keyPath: ["caseId", "updatedAt"],
  unique: false,
  multiEntry: false
} as const;

function expectRealV14ActivityIndexes(
  source: NativeDatabaseSnapshot,
  target: NativeDatabaseSnapshot
): void {
  for (const tableName of ["researchNotes", "events"] as const) {
    const sourceMetadata = source.storeMetadata[tableName];
    const targetMetadata = target.storeMetadata[tableName];
    expect(sourceMetadata, `v13 source metadata for ${tableName}`).toBeDefined();
    expect(targetMetadata, `v14 target metadata for ${tableName}`).toBeDefined();
    if (!sourceMetadata || !targetMetadata) throw new Error(`Missing native metadata for ${tableName}.`);

    expect(sourceMetadata.indexes, `v13 ${tableName} must not already contain the v14 index`)
      .not.toContainEqual(V14_ACTIVITY_INDEX);
    expect(targetMetadata.indexes, `v14 ${tableName} compound activity index`)
      .toContainEqual(V14_ACTIVITY_INDEX);
    expect({
      keyPath: targetMetadata.keyPath,
      autoIncrement: targetMetadata.autoIncrement,
      indexes: targetMetadata.indexes.filter((index) => index.name !== V14_ACTIVITY_INDEX.name)
    }).toEqual(sourceMetadata);
  }
}

function expectShadowContainsSource(
  source: NativeDatabaseSnapshot,
  target: NativeDatabaseSnapshot | null
): asserts target is NativeDatabaseSnapshot {
  expect(target).not.toBeNull();
  if (!target) throw new Error("Expected the shadow database to exist.");
  expect(target.nativeVersion).toBe(TARGET_NATIVE_VERSION);
  expect(target.stores).toEqual(source.stores);
  expect(target.stores).not.toContain("releaseSchemaMarkers");
  for (const storeName of source.stores) {
    expect(target.rows[storeName], `shadow store ${storeName}`).toEqual(source.rows[storeName]);
    if (storeName !== "researchNotes" && storeName !== "events") {
      expect(target.storeMetadata[storeName], `shadow metadata ${storeName}`)
        .toEqual(source.storeMetadata[storeName]);
    }
  }
  expectRealV14ActivityIndexes(source, target);
}

async function switchToTargetAndWaitForActivation(
  context: BrowserContext,
  target: GenerationFixture
): Promise<{ bridgePage: Page; problems: string[] }> {
  switchServer.setGeneration(target);
  const natural = await openBridgeNavigationAfterSwitch(context, switchServer, stableA);
  await expect.poll(() => cacheGeneration(natural.page, target)).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    dbGeneration: target.descriptor.dbGeneration,
    databaseName: target.descriptor.databaseName,
    targetSchema: target.descriptor.targetSchema,
    migrationId: target.descriptor.migrationId
  });
  try {
    await expect.poll(() => workerBuildVersion(natural.page, "active"), { timeout: 30_000 }).toBe(target.version);
  } catch (error) {
    const lifecycle = await serviceWorkerLifecycleSnapshot(natural.page);
    throw new Error(`Target Service Worker did not activate. Lifecycle: ${JSON.stringify(lifecycle)}`, { cause: error });
  }
  return { bridgePage: natural.page, problems: natural.problems };
}

async function openTargetTrial(context: BrowserContext, target: GenerationFixture, route = "/cases") {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}${route}`, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
    fixture: target.name,
    buildVersion: target.version,
    dbGeneration: target.descriptor.dbGeneration,
    dbSchema: String(target.descriptor.targetSchema),
    descriptor: target.descriptor
  });
  return { page, problems };
}

async function openRecoveredBridge(context: BrowserContext) {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await expectPageFixture(page, stableA);
  return { page, problems };
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-schema-generations-"));
  [stableA, healthyB, migrationFailedB, validationFailedB] = await Promise.all([
    buildGeneration(fixtureRoot, "stable-a-v13-bridge", bridgeDescriptor),
    buildGeneration(fixtureRoot, "healthy-b-v14-shadow", shadowDescriptor),
    buildGeneration(fixtureRoot, "migration-failed-b-v14-shadow", shadowDescriptor, "migration"),
    buildGeneration(fixtureRoot, "validation-failed-b-v14-shadow", shadowDescriptor, "validation")
  ]);
  expect(new Set([stableA.version, healthyB.version, migrationFailedB.version, validationFailedB.version]).size).toBe(4);
  expect(stableA.entryPath).not.toBe(healthyB.entryPath);
  switchServer = await startSwitchServer(stableA);
});

test.afterAll(async () => {
  await switchServer?.close();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
  await Promise.all([...browserProfilePaths].map((profilePath) => rm(profilePath, { recursive: true, force: true })));
  browserProfilePaths.clear();
});

test("全新浏览器直接安装 v14 时从空 v13 源代构建真实活动流索引并完成确认", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "fresh-v14-install-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  switchServer.setGeneration(healthyB);
  try {
    const page = await context.newPage();
    const problems = collectConsoleProblems(page);
    await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expectPageFixture(page, healthyB);
    await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
      dbMigrationPhase: "committed",
      dbStorageAdmission: "admitted",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(page, healthyB);

    const source = await readNativeDatabase(page, SOURCE_DATABASE);
    const target = await readNativeDatabase(page, TARGET_DATABASE);
    expect(source).not.toBeNull();
    if (!source) throw new Error("Fresh v14 installation did not create its empty v13 bridge source.");
    expect(Object.values(source.rows).every((rows) => rows.length === 0)).toBe(true);
    expectShadowContainsSource(source, target);
    expect(migrationJournal(await readReleaseControl(page))).toMatchObject({ phase: "committed" });
    expect(problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("A(v13 bridge) 物化并校验独立 B(v14 shadow)，收到 ACK 后才提交并开放写入", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "cross-schema-success-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, stableA);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    expect(sourceBefore).not.toBeNull();
    if (!sourceBefore) throw new Error("The v13 source database was not created.");
    expect(sourceBefore.rows.cases).toEqual(expect.arrayContaining([expect.objectContaining({ id: caseId })]));
    await expectCommittedControl(stable.page, stableA);

    const natural = await switchToTargetAndWaitForActivation(context, healthyB);
    expect(natural.problems).toEqual([]);
    const trial = await openTargetTrial(context, healthyB);
    await waitForAppReady(trial.page);
    await expectPageFixture(trial.page, healthyB);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      dbStorageAdmission: "admitted",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(trial.page, healthyB);
    await expect.poll(() => cacheGeneration(trial.page, healthyB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true,
      dbGeneration: shadowDescriptor.dbGeneration,
      targetSchema: shadowDescriptor.targetSchema
    });

    const control = await readReleaseControl(trial.page);
    expect(control?.state?.receiptDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect(migrationJournal(control)).toMatchObject({ phase: "committed" });
    const target = await readNativeDatabase(trial.page, TARGET_DATABASE);
    expectShadowContainsSource(sourceBefore, target);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(trial.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("B 冻结多标签 A 的真实写入，提交后旧页自动重载到 B", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "multi-tab-source-write-freeze-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, stableA);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyB);
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE);
    const trial = await openTargetTrial(context, healthyB);

    await expect.poll(() => stable.page.evaluate(() => document.documentElement.dataset.dbSourceWriteFrozen))
      .toBe("true");
    await expect.poll(() => stable.page.evaluate(() => document.documentElement.dataset.e2eDatabaseUpgradeBlocked))
      .toBe("true");
    expect(await attemptRepositoryWrite(stable.page, caseId)).toMatchObject({
      ok: false,
      errorName: "ReleaseDatabaseWriteLockedError"
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await waitForAppReady(trial.page);
    await expectPageFixture(trial.page, healthyB);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    await expectPageFixture(stable.page, healthyB);
    await expectCommittedControl(stable.page, healthyB);
    expectShadowContainsSource(sourceBefore, await readNativeDatabase(stable.page, TARGET_DATABASE));
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));
    expect(trial.problems).toContainEqual(
      expect.stringContaining("blocked by other connection holding version 13")
    );
    expect(trial.problems.filter((problem) => !problem.includes("blocked by other connection holding version 13")))
      .toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("影子物化容量不足时 source pointer 不动、B 不创建且不发送 BOOT_OK", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "cross-schema-capacity-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, stableA);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 source database was not created.");

    await context.addInitScript(() => {
      Object.defineProperty(navigator.storage, "estimate", {
        configurable: true,
        value: async () => ({ usage: 1023, quota: 1024 })
      });
    });
    const natural = await switchToTargetAndWaitForActivation(context, healthyB);
    const failed = await openTargetTrial(context, healthyB);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" })).toBeVisible({
      timeout: 25_000
    });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      dbStorageAdmission: "insufficient",
      swBootAck: null
    });
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page))).toMatchObject({
      phase: "failed",
      failure: {
        code: "STORAGE_CAPACITY_INSUFFICIENT",
        targetIsolation: "not_requested"
      }
    });
    await expectCommittedControl(failed.page, stableA);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    await expect.poll(() => cacheGeneration(failed.page, healthyB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });

    await failed.page.close();
    const recovered = await openRecoveredBridge(context);
    await expectCommittedControl(recovered.page, stableA);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

for (const scenario of [
  { name: "target Dexie 迁移事务中止", fault: "migration" as const, fixture: () => migrationFailedB },
  { name: "target 启动校验失败", fault: "validation" as const, fixture: () => validationFailedB }
]) {
  test(`${scenario.name} 时回到 A，source 数据库逐字不变且 B 不会被确认`, async ({}, testInfo) => {
    const context = await launchFixtureContext(testInfo, `${scenario.fault}-failure-profile`);
    const externalRequests = collectExternalRequests(context, switchServer.origin);
    try {
      const stable = await openStableBridge(context, switchServer, stableA);
      await createDemoCase(stable.page, switchServer.origin);
      const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
      if (!sourceBefore) throw new Error("The v13 source database was not created.");

      const target = scenario.fixture();
      if (scenario.fault === "migration") {
        // Dexie does not execute version.upgrade() when creating a database from
        // scratch. Seed and close a physical v13 target so this scenario proves
        // a real 13 -> 14 upgrade transaction abort instead of a create failure.
        await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE);
        await releaseDatabaseUpgradeBlocker(stable.page);
        expect((await readNativeDatabase(stable.page, TARGET_DATABASE))?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
      }
      const natural = await switchToTargetAndWaitForActivation(context, target);
      const failed = await openTargetTrial(context, target);
      await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" })).toBeVisible({
        timeout: 25_000
      });
      await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
        appBootReady: "false",
        swBootAck: null
      });
      await expectFailedMigrationJournal(failed.page, scenario.fault);
      await expectCommittedControl(failed.page, stableA);
      await expect.poll(() => cacheGeneration(failed.page, target)).toMatchObject({
        bootAttempted: true,
        bootConfirmed: false
      });
      expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
      const targetAfterFailure = await readNativeDatabase(failed.page, TARGET_DATABASE);
      if (scenario.fault === "migration") {
        expect(targetAfterFailure === null || targetAfterFailure.nativeVersion === SOURCE_NATIVE_VERSION).toBe(true);
      } else {
        expect(targetAfterFailure).toBeNull();
      }

      await failed.page.close();
      const recovered = await openRecoveredBridge(context);
      await expectCommittedControl(recovered.page, stableA);
      expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
      expect(recovered.problems).toEqual([]);
      expect(natural.problems).toEqual([]);
      expect(failed.problems.filter((problem) => !problem.includes("synthetic v14"))).toEqual([]);
      expect(stable.problems).toEqual([]);
      expect(externalRequests).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("control 已提交但 BOOT_OK 尚未送达时刷新，下一次导航仍从 journal 收敛到 B", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "commit-before-boot-ok-refresh-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    await installOneShotBootOkInterruption(context, shadowDescriptor.dbGeneration);
    const stable = await openStableBridge(context, switchServer, stableA);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyB);
    const trial = await openTargetTrial(context, healthyB);
    await waitForAppReady(trial.page);
    await expect.poll(() => trial.page.evaluate(() => document.documentElement.dataset.e2eBootOkWithheld)).toBe("true");
    await expectCommittedControl(trial.page, healthyB);
    await expect.poll(() => cacheGeneration(trial.page, healthyB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: null
    });

    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expectPageFixture(trial.page, healthyB);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    await expect.poll(() => cacheGeneration(trial.page, healthyB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
    expectShadowContainsSource(sourceBefore, await readNativeDatabase(trial.page, TARGET_DATABASE));
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(trial.page, SOURCE_DATABASE));
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("旧标签页持有 target versionchange 时迁移超时失败关闭，不提交 B 也不改 source", async ({}, testInfo) => {
  const context = await launchFixtureContext(testInfo, "blocked-old-tab-profile");
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, stableA);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE);

    const natural = await switchToTargetAndWaitForActivation(context, healthyB);
    const failed = await openTargetTrial(context, healthyB);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" })).toBeVisible({
      timeout: 30_000
    });
    await expect.poll(() => stable.page.evaluate(() => document.documentElement.dataset.e2eDatabaseUpgradeBlocked))
      .toBe("true");
    await expectFailedMigrationJournal(failed.page, "blocked");
    await expectCommittedControl(failed.page, stableA);
    await expect.poll(() => cacheGeneration(failed.page, healthyB)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await failed.page.close();
    const recovered = await openRecoveredBridge(context);
    await expectCommittedControl(recovered.page, stableA);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) => !/blocked|timeout|占用|阻塞/iu.test(problem))).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    const blockerPage = context.pages()[0];
    if (blockerPage && !blockerPage.isClosed()) await releaseDatabaseUpgradeBlocker(blockerPage).catch(() => undefined);
    await context.close();
  }
});
