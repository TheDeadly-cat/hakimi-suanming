import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
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
  serviceWorkerLifecycleSnapshot,
  startSwitchServer,
  workerBuildVersion,
  type CrossSchemaFault,
  type GenerationFixture,
  type NativeDatabaseSnapshot,
  type ReleaseControlSnapshot,
  type SwitchServer
} from "./cross-schema-upgrade-helpers";
import {
  completeRestoreSafetyGate,
  collectConsoleProblems,
  expectPartitionCount,
  exportFullBackupZip,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedActiveRulePack,
  seedPortableData,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const sourceDescriptor: ReleaseDatabaseDescriptor = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR;
const targetDescriptor: ReleaseDatabaseDescriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
const SOURCE_DATABASE = sourceDescriptor.databaseName;
const TARGET_DATABASE = targetDescriptor.databaseName;
const SOURCE_NATIVE_VERSION = 140;
const TARGET_NATIVE_VERSION = 150;
const RECEIPT_STORE = "revisionCalculationReceipts";

let fixtureRoot = "";
let sourceV14: GenerationFixture;
let healthyV15: GenerationFixture;
let migrationFailedV15: GenerationFixture;
let validationFailedV15: GenerationFixture;
let digestMismatchV15: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) {
    throw new Error(`Unsupported v14→v15 browser project: ${projectName}`);
  }
  const profilePath = await mkdtemp(path.join(os.tmpdir(), "hb-v14-v15-profile-"));
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

function migrationJournal(control: ReleaseControlSnapshot | null): Record<string, unknown> | null {
  return control?.journals.find((journal) => journal.id === targetDescriptor.migrationId) ?? null;
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

async function expectFailedMigrationJournal(
  page: Page,
  fault: CrossSchemaFault | "blocked"
): Promise<void> {
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
    expect(JSON.stringify(journal)).toContain("synthetic v15 migration transaction failure");
  } else if (fault === "validation") {
    expect(JSON.stringify(journal)).toContain("synthetic v15 target validation failure");
  } else if (fault === "digest") {
    expect(JSON.stringify(journal)).toContain("影子数据库物化后摘要发生变化");
  } else {
    expect(JSON.stringify(journal).toLowerCase()).toMatch(/blocked|timeout|占用|阻塞/u);
  }
}

function expectSourceUnchanged(
  before: NativeDatabaseSnapshot,
  after: NativeDatabaseSnapshot | null
): void {
  expect(after).toEqual(before);
  expect(after?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
}

function expectV15ExtendsV14WithoutRewriting(
  source: NativeDatabaseSnapshot,
  target: NativeDatabaseSnapshot | null
): asserts target is NativeDatabaseSnapshot {
  expect(source.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
  expect(source.stores).not.toContain(RECEIPT_STORE);
  expect(target).not.toBeNull();
  if (!target) throw new Error("Expected the Schema 15 shadow database to exist.");
  expect(target.nativeVersion).toBe(TARGET_NATIVE_VERSION);
  expect(target.stores).toEqual([...source.stores, RECEIPT_STORE].sort());
  for (const storeName of source.stores) {
    expect(target.rows[storeName], `v15 must preserve every v14 row in ${storeName}`)
      .toEqual(source.rows[storeName]);
    expect(target.storeMetadata[storeName], `v15 must preserve every v14 index in ${storeName}`)
      .toEqual(source.storeMetadata[storeName]);
  }
  expect(target.rows[RECEIPT_STORE]).toEqual([]);
  expect(target.storeMetadata[RECEIPT_STORE]).toEqual({
    keyPath: "id",
    autoIncrement: false,
    indexes: [
      { name: "captureKind", keyPath: "captureKind", unique: false, multiEntry: false },
      { name: "createdAt", keyPath: "createdAt", unique: false, multiEntry: false },
      {
        name: "projection.projectionDigest",
        keyPath: "projection.projectionDigest",
        unique: false,
        multiEntry: false
      },
      { name: "requestFingerprint", keyPath: "requestFingerprint", unique: true, multiEntry: false },
      {
        name: "sourceRevision.caseId",
        keyPath: "sourceRevision.caseId",
        unique: false,
        multiEntry: false
      },
      {
        name: "sourceRevision.revisionId",
        keyPath: "sourceRevision.revisionId",
        unique: false,
        multiEntry: false
      }
    ]
  });
}

async function switchToTargetAndWaitForActivation(
  context: BrowserContext,
  target: GenerationFixture
): Promise<{ bridgePage: Page; problems: string[] }> {
  switchServer.setGeneration(target);
  const natural = await openBridgeNavigationAfterSwitch(context, switchServer, sourceV14);
  await expect.poll(() => cacheGeneration(natural.page, target)).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    dbGeneration: target.descriptor.dbGeneration,
    databaseName: target.descriptor.databaseName,
    targetSchema: target.descriptor.targetSchema,
    migrationId: target.descriptor.migrationId
  });
  try {
    await expect.poll(() => workerBuildVersion(natural.page, "active"), { timeout: 30_000 })
      .toBe(target.version);
  } catch (error) {
    const lifecycle = await serviceWorkerLifecycleSnapshot(natural.page);
    throw new Error(`Schema 15 Service Worker did not activate: ${JSON.stringify(lifecycle)}`, {
      cause: error
    });
  }
  return { bridgePage: natural.page, problems: natural.problems };
}

async function openTargetTrial(context: BrowserContext, target: GenerationFixture) {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
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

async function openRecoveredSource(context: BrowserContext) {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await expectPageFixture(page, sourceV14);
  return { page, problems };
}

async function addRevisionThroughUi(
  page: Page,
  caseId: string,
  sourceRevisionId: string
): Promise<string> {
  await page.goto(`/cases/${caseId}/revisions/${sourceRevisionId}/revise`, {
    waitUntil: "domcontentloaded"
  });
  await waitForAppReady(page);
  const primaryAction = page.locator(".wizard-actions .primary-action");
  await expect(primaryAction).toHaveCount(1);
  for (let step = 0; step < 3; step += 1) {
    await expect(primaryAction).toBeEnabled();
    await primaryAction.click();
  }
  await primaryAction.click();
  await expect(page.locator(".calculation-preview")).toBeVisible();
  await expect(primaryAction).toBeEnabled();
  await primaryAction.click();
  await page.waitForURL((url) => {
    const match = url.pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/iu);
    return match?.[1] === caseId && match[2] !== sourceRevisionId;
  });
  await waitForAppReady(page);
  const revisionId = new URL(page.url()).pathname.split("/").at(-1);
  if (!revisionId) throw new Error("The v15 revision flow did not expose its new Revision id.");
  return revisionId;
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-schema-v14-v15-generations-"));
  [
    sourceV14,
    healthyV15,
    migrationFailedV15,
    validationFailedV15,
    digestMismatchV15
  ] = await Promise.all([
    buildGeneration(fixtureRoot, "source-a-v14", sourceDescriptor),
    buildGeneration(fixtureRoot, "healthy-b-v15", targetDescriptor),
    buildGeneration(fixtureRoot, "migration-failed-b-v15", targetDescriptor, "migration"),
    buildGeneration(fixtureRoot, "validation-failed-b-v15", targetDescriptor, "validation"),
    buildGeneration(fixtureRoot, "digest-mismatch-b-v15", targetDescriptor, "digest")
  ]);
  expect(new Set([
    sourceV14.version,
    healthyV15.version,
    migrationFailedV15.version,
    validationFailedV15.version,
    digestMismatchV15.version
  ]).size).toBe(5);
  expect(sourceV14.entryPath).not.toBe(healthyV15.entryPath);
  switchServer = await startSwitchServer(sourceV14);
});

test.afterAll(async () => {
  await switchServer?.close();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
  await Promise.all([...browserProfilePaths].map((profilePath) =>
    rm(profilePath, { recursive: true, force: true })
  ));
  browserProfilePaths.clear();
});

test("全新浏览器直接安装 v15 时建立空 v14 源代与空收据账本，并完成确认", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  switchServer.setGeneration(healthyV15);
  try {
    const page = await context.newPage();
    const problems = collectConsoleProblems(page);
    await page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expectPageFixture(page, healthyV15);
    await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
      dbMigrationPhase: "committed",
      dbStorageAdmission: "admitted",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(page, healthyV15);

    const source = await readNativeDatabase(page, SOURCE_DATABASE);
    const target = await readNativeDatabase(page, TARGET_DATABASE);
    expect(source).not.toBeNull();
    if (!source) throw new Error("Fresh v15 installation did not create its empty v14 source generation.");
    expect(Object.values(source.rows).every((rows) => rows.length === 0)).toBe(true);
    expectV15ExtendsV14WithoutRewriting(source, target);
    expect(migrationJournal(await readReleaseControl(page))).toMatchObject({ phase: "committed" });
    expect(problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("富 v14 数据无损迁移到 v15；新 Revision 同事务生成 baseline，重启仍 BOOT_OK", async () => {
  const context = await launchFixtureContext();
  let restoreContext: BrowserContext | null = null;
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceRevisionId = new URL(stable.page.url()).pathname.split("/").at(-1);
    if (!sourceRevisionId) throw new Error("The v14 demo case did not expose its Revision id.");

    await openDataManagement(stable.page);
    await seedPortableData(stable.page, portableFixture("v14→v15"));
    await seedActiveRulePack(stable.page);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The rich v14 source database was not created.");
    expect(sourceBefore.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
    expect(sourceBefore.stores.filter((store) => sourceBefore.rows[store]?.length > 0)).toEqual(
      expect.arrayContaining([
        "cases",
        "revisions",
        "birthFingerprints",
        "researcherProfiles",
        "appSettings",
        "attachments",
        "ruleRegistry"
      ])
    );
    expect(sourceBefore.rows.revisionCalculationReceipts).toBeUndefined();
    await expectCommittedControl(stable.page, sourceV14);

    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const trial = await openTargetTrial(context, healthyV15);
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      dbStorageAdmission: "admitted",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(trial.page, healthyV15);
    await expect.poll(() => cacheGeneration(trial.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true,
      dbGeneration: targetDescriptor.dbGeneration,
      targetSchema: targetDescriptor.targetSchema
    });

    const targetBeforeRevision = await readNativeDatabase(trial.page, TARGET_DATABASE);
    expectV15ExtendsV14WithoutRewriting(sourceBefore, targetBeforeRevision);
    expect(await readNativeDatabase(trial.page, SOURCE_DATABASE)).toEqual(sourceBefore);

    const revisionId = await addRevisionThroughUi(trial.page, caseId, sourceRevisionId);
    const targetAfterRevision = await readNativeDatabase(trial.page, TARGET_DATABASE);
    if (!targetAfterRevision) throw new Error("The v15 database disappeared after adding a Revision.");
    expect(targetAfterRevision.rows.cases).toHaveLength(targetBeforeRevision.rows.cases.length);
    expect(targetAfterRevision.rows.revisions).toHaveLength(targetBeforeRevision.rows.revisions.length + 1);
    expect(targetAfterRevision.rows.birthFingerprints)
      .toHaveLength(targetBeforeRevision.rows.birthFingerprints.length + 1);
    expect(targetAfterRevision.rows[RECEIPT_STORE]).toHaveLength(1);

    const revision = targetAfterRevision.rows.revisions.find((row) =>
      (row as { id?: unknown }).id === revisionId
    ) as Record<string, unknown> | undefined;
    const receipt = targetAfterRevision.rows[RECEIPT_STORE][0] as Record<string, unknown>;
    expect(revision).toMatchObject({ id: revisionId, caseId, revisionNumber: 2 });
    expect(receipt).toMatchObject({
      captureKind: "revision_creation_baseline",
      sourceRevision: {
        caseId,
        revisionId,
        revisionNumber: 2,
        natalResultHash: (revision?.manifest as { resultHash?: unknown })?.resultHash
      },
      projection: {
        request: { atInstant: null, manualDirection: null },
        transit: { status: "not_requested" }
      }
    });
    expect(receipt.requestFingerprint).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect(receipt.receiptDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect((receipt.projection as { projectionDigest?: unknown }).projectionDigest)
      .toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect(targetAfterRevision.rows[RECEIPT_STORE].filter((row) =>
      (row as { sourceRevision?: { revisionId?: unknown } }).sourceRevision?.revisionId === sourceRevisionId
    )).toEqual([]);

    await trial.page.goto(
      `/cases/${caseId}/revisions/${revisionId}?view=research&at=2026-08-03T06%3A19%3A20Z`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForAppReady(trial.page);
    await expect(trial.page.getByRole("heading", { name: "历史计算收据" })).toBeVisible();
    await expect(trial.page.getByText("1 条内容验真通过", { exact: true })).toBeVisible();
    await expect(trial.page.getByRole("checkbox", { name: /匿名导出/ })).toBeChecked();
    await trial.page.getByRole("button", { name: "预览 PNG / PDF", exact: true }).click();
    const reportDialog = trial.page.getByRole("dialog", { name: /单盘报告预览/ });
    await expect(reportDialog).toBeVisible();
    await expect(reportDialog).toContainText("匿名模式 · 格式 1.4.0");
    const sourceMarker = reportDialog.getByRole("group", {
      name: /下游计算来源：已保存计算收据；精确复演：精确复演一致；收据账本：收据账本可用/
    });
    await expect(sourceMarker).toHaveAttribute("data-source", "stored_receipt");
    await expect(sourceMarker).toHaveAttribute("data-ledger-status", "available");
    await expect(sourceMarker).toHaveAttribute("data-comparison-status", "matched");
    const sourceSection = reportDialog.getByRole("region", { name: "下游计算来源" });
    await expect(sourceSection).toContainText("收据账本可用（available）");
    await expect(sourceSection).toContainText("历史输出比对已比较");
    await expect(sourceSection).toContainText("匿名模式仅保留来源分类与核验状态");
    const privateReceiptValues = [
      receipt.id,
      receipt.requestFingerprint,
      receipt.receiptDigest,
      (receipt.projection as { projectionDigest?: unknown }).projectionDigest
    ];
    for (const value of privateReceiptValues) {
      if (typeof value !== "string") throw new Error("v15 基线收据缺少匿名断言所需字段");
      await expect(sourceSection).not.toContainText(value);
    }
    await reportDialog.getByRole("button", { name: "关闭单盘报告预览", exact: true }).click();
    await trial.page.getByRole("button", { name: "生成显式版本派生投影", exact: true }).click();
    const saveSnapshot = trial.page.getByRole("button", { name: "保存此计算快照", exact: true });
    await expect(saveSnapshot).toBeVisible();
    await saveSnapshot.click();
    await expect(trial.page.getByText("计算快照已追加到历史收据。", { exact: true })).toBeVisible();
    await expect(trial.page.getByText("2 条内容验真通过", { exact: true })).toBeVisible();

    const targetAfterExplicitReceipt = await readNativeDatabase(trial.page, TARGET_DATABASE);
    expect(targetAfterExplicitReceipt?.rows[RECEIPT_STORE]).toHaveLength(2);
    await openDataManagement(trial.page);
    await expectPartitionCount(trial.page, "Revision 计算收据", 2);
    const sourceBackup = await exportFullBackupZip(trial.page);
    const sourceEnvelope = await preflightFullBackupFile(sourceBackup.bytes);
    expect(sourceEnvelope.manifest.formatVersion).toBe("1.2.0");
    expect(sourceEnvelope.manifest.counts.revisionCalculationReceipts).toBe(2);

    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(trial.page, healthyV15);
    const restarted = await readNativeDatabase(trial.page, TARGET_DATABASE);
    expect(restarted?.rows[RECEIPT_STORE]).toEqual(targetAfterExplicitReceipt?.rows[RECEIPT_STORE]);
    expect(await readNativeDatabase(trial.page, SOURCE_DATABASE)).toEqual(sourceBefore);

    restoreContext = await launchFixtureContext();
    const restorePage = await restoreContext.newPage();
    const restoreProblems = collectConsoleProblems(restorePage);
    await restorePage.goto(`${switchServer.origin}/settings/data`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    await waitForServiceWorker(restorePage);
    await expectPartitionCount(restorePage, "Revision 计算收据", 0);
    await preflightBackupZip(restorePage, sourceBackup.bytes, "schema15-full-v1.2.zip");
    await completeRestoreSafetyGate(restorePage);
    await expectPartitionCount(restorePage, "Revision 计算收据", 2);
    const roundTripBackup = await exportFullBackupZip(restorePage);
    const roundTripEnvelope = await preflightFullBackupFile(roundTripBackup.bytes);
    expect(roundTripEnvelope.payload).toEqual(sourceEnvelope.payload);
    const { envelope: sourceEnvelopeDigest, ...sourceStableDigests } = sourceEnvelope.digests;
    const { envelope: roundTripEnvelopeDigest, ...roundTripStableDigests } = roundTripEnvelope.digests;
    expect(roundTripStableDigests).toEqual(sourceStableDigests);
    expect(sourceEnvelopeDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect(roundTripEnvelopeDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
    expect(restoreProblems).toEqual([]);
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await restoreContext?.close();
    await context.close();
  }
});

test("v15 冻结多标签 v14 的真实写入，提交后旧页自动收敛到 v15", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);
    const trial = await openTargetTrial(context, healthyV15);

    for (const sourcePage of [stable.page, natural.bridgePage]) {
      await expect.poll(() => sourcePage.evaluate(() =>
        document.documentElement.dataset.dbSourceWriteFrozen
      )).toBe("true");
    }
    await expect.poll(() => stable.page.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked
    )).toBe("true");
    for (const sourcePage of [stable.page, natural.bridgePage]) {
      expect(await attemptRepositoryWrite(sourcePage, caseId)).toMatchObject({
        ok: false,
        errorName: "ReleaseDatabaseWriteLockedError"
      });
    }
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await waitForAppReady(trial.page);
    await expectPageFixture(trial.page, healthyV15);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    await expectPageFixture(stable.page, healthyV15);
    await expectPageFixture(natural.bridgePage, healthyV15);
    await expectCommittedControl(stable.page, healthyV15);
    expectV15ExtendsV14WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(stable.page, TARGET_DATABASE)
    );
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));
    expect(trial.problems).toContainEqual(
      expect.stringContaining("blocked by other connection holding version 14")
    );
    expect(trial.problems.filter((problem) =>
      !problem.includes("blocked by other connection holding version 14")
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

test("v15 影子物化容量不足时保留 v14、目标零创建且不发送 BOOT_OK", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    await context.addInitScript(() => {
      Object.defineProperty(navigator.storage, "estimate", {
        configurable: true,
        value: async () => ({ usage: 1023, quota: 1024 })
      });
    });
    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const failed = await openTargetTrial(context, healthyV15);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 25_000 });
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
    await expectCommittedControl(failed.page, sourceV14);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    await expect.poll(() => cacheGeneration(failed.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV14);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v15 目标启动校验失败时清理影子库，并保持 v14 提交指针与源数据", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, validationFailedV15);
    const failed = await openTargetTrial(context, validationFailedV15);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 25_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expectFailedMigrationJournal(failed.page, "validation");
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page)))
      .toMatchObject({
        phase: "failed",
        failure: { targetIsolation: "complete" }
      });
    await expectCommittedControl(failed.page, sourceV14);
    await expect.poll(() => cacheGeneration(failed.page, validationFailedV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV14);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !problem.includes("synthetic v15 target validation failure")
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("v15 影子库物化后摘要不符时删除目标，并保持 v14 可恢复", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, digestMismatchV15);
    const failed = await openTargetTrial(context, digestMismatchV15);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 25_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expectFailedMigrationJournal(failed.page, "digest");
    expect(migrationJournal(await readReleaseControl(failed.page))).toMatchObject({
      phase: "failed",
      failure: { targetIsolation: "complete" }
    });
    await expectCommittedControl(failed.page, sourceV14);
    await expect.poll(() => cacheGeneration(failed.page, digestMismatchV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV14);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
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

test("v15 control 已提交但 BOOT_OK 中断时，刷新后继续收敛到 v15", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    await installOneShotBootOkInterruption(context, targetDescriptor.dbGeneration);
    const stable = await openStableBridge(context, switchServer, sourceV14);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const trial = await openTargetTrial(context, healthyV15);
    await waitForAppReady(trial.page);
    await expect.poll(() => trial.page.evaluate(() =>
      document.documentElement.dataset.e2eBootOkWithheld
    )).toBe("true");
    await expectCommittedControl(trial.page, healthyV15);
    await expect.poll(() => cacheGeneration(trial.page, healthyV15)).toMatchObject({
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

    await trial.page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(trial.page);
    await waitForServiceWorker(trial.page);
    await expectPageFixture(trial.page, healthyV15);
    await expect.poll(() => pageReleaseEvidence(trial.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    await expect.poll(() => cacheGeneration(trial.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
    expectV15ExtendsV14WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(trial.page, TARGET_DATABASE)
    );
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

test("旧页面持有 v15 target versionchange 时超时失败关闭，不提交目标也不改 v14", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);

    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const failed = await openTargetTrial(context, healthyV15);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => stable.page.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked
    )).toBe("true");
    await expectFailedMigrationJournal(failed.page, "blocked");
    await expectCommittedControl(failed.page, sourceV14);
    await expect.poll(() => cacheGeneration(failed.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV14);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !/blocked|timeout|占用|阻塞/iu.test(problem)
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

test("v15 Dexie 升级事务失败时回滚 shadow，并保持 v14 提交指针与源数据", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV14);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v14 source database was not created.");

    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);
    await releaseDatabaseUpgradeBlocker(stable.page);
    const targetBefore = await readNativeDatabase(stable.page, TARGET_DATABASE);
    expect(targetBefore?.nativeVersion).toBe(SOURCE_NATIVE_VERSION);

    const natural = await switchToTargetAndWaitForActivation(context, migrationFailedV15);
    const failed = await openTargetTrial(context, migrationFailedV15);
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      swBootAck: null
    });
    await expect.poll(async () => migrationJournal(await readReleaseControl(failed.page)))
      .toMatchObject({ phase: "failed" });
    expect(JSON.stringify(migrationJournal(await readReleaseControl(failed.page))))
      .toContain("synthetic v15 migration transaction failure");
    await expectCommittedControl(failed.page, sourceV14);
    await expect.poll(() => cacheGeneration(failed.page, migrationFailedV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expect(await readNativeDatabase(failed.page, SOURCE_DATABASE)).toEqual(sourceBefore);
    const targetAfter = await readNativeDatabase(failed.page, TARGET_DATABASE);
    expect(targetAfter === null || targetAfter.nativeVersion === SOURCE_NATIVE_VERSION).toBe(true);
    if (targetAfter) expect(targetAfter).toEqual(targetBefore);

    await failed.page.close();
    const recoveredPage = await context.newPage();
    const recoveredProblems = collectConsoleProblems(recoveredPage);
    await recoveredPage.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(recoveredPage);
    await waitForServiceWorker(recoveredPage);
    await expect.poll(() => pageReleaseEvidence(recoveredPage)).toMatchObject({
      fixture: sourceV14.name,
      appBootReady: "true",
      dbGeneration: sourceDescriptor.dbGeneration,
      dbSchema: String(sourceDescriptor.targetSchema),
      swBootAck: "true"
    });
    await expectCommittedControl(recoveredPage, sourceV14);
    expect(await readNativeDatabase(recoveredPage, SOURCE_DATABASE)).toEqual(sourceBefore);
    expect(recoveredProblems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !problem.includes("synthetic v15 migration transaction failure")
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
