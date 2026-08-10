import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import {
  RELEASE_CONTROL_DATABASE,
  attemptRepositoryWrite,
  buildGeneration,
  cacheGeneration,
  cacheGenerations,
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
  waitForForegroundAppReady,
  workerBuildVersion,
  type CrossSchemaFault,
  type GenerationFixture,
  type NativeDatabaseSnapshot,
  type ReleaseControlSnapshot,
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
const targetDescriptor: ReleaseDatabaseDescriptor = PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR;
const republishedTargetDescriptor = Object.freeze({
  ...targetDescriptor,
  migrationId: "v13-to-v15-revision-calculation-receipts-v2-republish-e2e",
  acceptedCommittedMigrationIds: Object.freeze([
    targetDescriptor.migrationId,
    "v13-to-v15-revision-calculation-receipts-v2-republish-e2e"
  ])
} satisfies ReleaseDatabaseDescriptor);
const SOURCE_DATABASE = sourceDescriptor.databaseName;
const TARGET_DATABASE = targetDescriptor.databaseName;
const INTERMEDIATE_V14_DATABASE = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const EXPECTED_TARGET_DELETE_CONNECTION_WARNING =
  `warning: Another connection wants to delete database '${TARGET_DATABASE}'. Closing db now to resume the delete request.`;
const SOURCE_NATIVE_VERSION = 130;
const TARGET_NATIVE_VERSION = 150;
const RECEIPT_STORE = "revisionCalculationReceipts";
const V14_ACTIVITY_INDEX = {
  name: "[caseId+updatedAt]",
  keyPath: ["caseId", "updatedAt"],
  unique: false,
  multiEntry: false
} as const;

let fixtureRoot = "";
let sourceV13: GenerationFixture;
let healthyV15: GenerationFixture;
let migrationFailedV15: GenerationFixture;
let validationFailedV15: GenerationFixture;
let digestMismatchV15: GenerationFixture;
let sameMigrationIdRepublishV15: GenerationFixture;
let newMigrationIdRepublishV15: GenerationFixture;
let switchServer: SwitchServer;
const browserProfilePaths = new Set<string>();

async function launchFixtureContext(): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) throw new Error(`Unsupported v13→v15 browser project: ${projectName}`);

  const profilePath = await mkdtemp(path.join(os.tmpdir(), "hb-v13-v15-profile-"));
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

function migrationJournal(
  control: ReleaseControlSnapshot | null,
  migrationId = targetDescriptor.migrationId
): Record<string, unknown> | null {
  return control?.journals.find((journal) => journal.id === migrationId) ?? null;
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

function expectDirectV15ExtendsV13WithoutRewriting(
  source: NativeDatabaseSnapshot,
  target: NativeDatabaseSnapshot | null
): asserts target is NativeDatabaseSnapshot {
  expect(source.nativeVersion).toBe(SOURCE_NATIVE_VERSION);
  expect(source.stores).not.toContain(RECEIPT_STORE);
  expect(target).not.toBeNull();
  if (!target) throw new Error("Expected the direct-hop Schema 15 shadow database to exist.");

  expect(target.nativeVersion).toBe(TARGET_NATIVE_VERSION);
  expect(target.stores).toEqual([...source.stores, RECEIPT_STORE].sort());
  for (const storeName of source.stores) {
    expect(target.rows[storeName], `direct v15 must preserve every v13 row in ${storeName}`)
      .toEqual(source.rows[storeName]);
    if (storeName !== "researchNotes" && storeName !== "events") {
      expect(target.storeMetadata[storeName], `direct v15 metadata for ${storeName}`)
        .toEqual(source.storeMetadata[storeName]);
    }
  }

  for (const storeName of ["researchNotes", "events"] as const) {
    const sourceMetadata = source.storeMetadata[storeName];
    const targetMetadata = target.storeMetadata[storeName];
    expect(sourceMetadata, `v13 source metadata for ${storeName}`).toBeDefined();
    expect(targetMetadata, `v15 target metadata for ${storeName}`).toBeDefined();
    if (!sourceMetadata || !targetMetadata) throw new Error(`Missing native metadata for ${storeName}.`);
    expect(sourceMetadata.indexes).not.toContainEqual(V14_ACTIVITY_INDEX);
    expect(targetMetadata.indexes).toContainEqual(V14_ACTIVITY_INDEX);
    expect({
      keyPath: targetMetadata.keyPath,
      autoIncrement: targetMetadata.autoIncrement,
      indexes: targetMetadata.indexes.filter((index) => index.name !== V14_ACTIVITY_INDEX.name)
    }).toEqual(sourceMetadata);
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
  target: GenerationFixture,
  confirmedFixture: GenerationFixture = sourceV13
): Promise<{ page: Page; problems: string[] }> {
  switchServer.setGeneration(target);
  const natural = await openBridgeNavigationAfterSwitch(context, switchServer, confirmedFixture);
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
    throw new Error(`Direct v15 Service Worker did not activate: ${JSON.stringify(lifecycle)}`, {
      cause: error
    });
  }
  return { page: natural.page, problems: natural.problems };
}

async function activateTargetFromReadyPage(
  page: Page,
  target: GenerationFixture
): Promise<void> {
  switchServer.setGeneration(target);
  await page.bringToFront();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("The ready page has no Service Worker registration.");
    await registration.update();
  });
  try {
    // Wait for installation without messaging the incumbent worker. Repeated
    // GET_BUILD_VERSION events can themselves delay Chromium's Try Activate
    // algorithm, which requires the old active worker to have no pending work.
    await expect.poll(() => cacheGeneration(page, target), { timeout: 90_000 }).toMatchObject({
      bootAttempted: false,
      bootConfirmed: false,
      migrationId: target.descriptor.migrationId
    });
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(
        registration &&
        !registration.installing &&
        (registration.waiting?.state === "installed" ||
          (!registration.waiting && registration.active?.state === "activated"))
      );
    }), { timeout: 90_000 }).toBe(true);

    const waitingVersion = await workerBuildVersion(page, "waiting");
    if (waitingVersion !== null) {
      expect(waitingVersion).toBe(target.version);
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.waiting?.postMessage({ type: "ACTIVATE_INSTALLED_GENERATION" });
      });

      // This helper publishes after the app's normal one-shot activation
      // window has deliberately expired. Once the exact waiting build has
      // been proven, make Chromium perform the same skip-waiting transition
      // deterministically; unit tests separately own the message handler.
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send("ServiceWorker.enable");
        await cdp.send("ServiceWorker.skipWaiting", { scopeURL: `${switchServer.origin}/` });
      } finally {
        await cdp.detach();
      }
    }

    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(
        registration &&
        !registration.installing &&
        !registration.waiting &&
        registration.active?.state === "activated"
      );
    }, undefined, { timeout: 45_000 });
    expect(await workerBuildVersion(page, "active")).toBe(target.version);
  } catch (error) {
    const lifecycle = await serviceWorkerLifecycleSnapshot(page);
    const generations = await cacheGenerations(page);
    throw new Error(
      `Republished Service Worker did not activate: ${JSON.stringify({ lifecycle, generations })}`,
      { cause: error }
    );
  }
  await expect.poll(() => cacheGeneration(page, target)).toMatchObject({
    bootAttempted: false,
    bootConfirmed: false,
    migrationId: target.descriptor.migrationId,
    acceptedCommittedMigrationIds: target.descriptor.acceptedCommittedMigrationIds
  });
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
  await expectPageFixture(page, sourceV13);
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
  if (!revisionId) throw new Error("The direct v15 revision flow did not expose its new Revision id.");
  return revisionId;
}

async function seedResearchNoteAndEvent(
  page: Page,
  caseId: string,
  revisionId: string,
  label: string
): Promise<void> {
  await page.goto(`/cases/${caseId}/revisions/${revisionId}?view=research`, {
    waitUntil: "domcontentloaded"
  });
  await waitForAppReady(page);

  const noteEditor = page.locator("section.research-editor-section").filter({
    has: page.getByRole("heading", { name: "添加可检索研究笔记" })
  });
  await noteEditor.getByLabel("Markdown 笔记", { exact: false }).fill(`${label}：直升迁移研究笔记`);
  await noteEditor.getByLabel("标签", { exact: true }).fill("直升迁移,数据保全");
  await noteEditor.getByRole("button", { name: "保存笔记", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "研究笔记已保存到本地案例" })).toBeVisible();

  const eventEditor = page.locator("section.research-editor-section").filter({
    has: page.getByRole("heading", { name: "记录真实事件" })
  });
  await eventEditor.getByLabel(/事件标题/).fill(`${label}直升迁移事件`);
  await eventEditor.getByLabel("起始日期", { exact: true }).fill("2024-02-04");
  await eventEditor.getByLabel("标签", { exact: true }).fill("直升迁移,事件保全");
  await eventEditor.getByLabel("来源引用", { exact: true }).fill("E2E 本地合成来源");
  await eventEditor.getByLabel("事件笔记", { exact: true }).fill("用于证明 v13 事件行直接迁移到 v15。 ");
  await eventEditor.getByRole("button", { name: "添加事件", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "事件已链接到当前案例与修订" })).toBeVisible();
}

async function deleteLegacyReleaseControl(page: Page): Promise<void> {
  await page.evaluate(async (databaseName) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      const timeout = window.setTimeout(() => reject(new Error("Release-control deletion timed out")), 10_000);
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
  }, RELEASE_CONTROL_DATABASE);
  await expect.poll(() => readReleaseControl(page)).toBeNull();
}

async function expectCommittedDirectMigration(page: Page): Promise<void> {
  await expect.poll(async () => {
    const control = await readReleaseControl(page);
    return control?.leases.every((lease) => (
      typeof lease.expiresAt === "number" && lease.expiresAt <= Date.now()
    )) ?? false;
  }, { timeout: 35_000 }).toBe(true);

  const control = await readReleaseControl(page);
  const journal = migrationJournal(control);
  expect(journal).toMatchObject({
    id: targetDescriptor.migrationId,
    protocolVersion: 1,
    source: {
      generation: sourceDescriptor.dbGeneration,
      databaseName: sourceDescriptor.databaseName,
      schemaVersion: sourceDescriptor.targetSchema
    },
    target: {
      generation: targetDescriptor.dbGeneration,
      databaseName: targetDescriptor.databaseName,
      schemaVersion: targetDescriptor.targetSchema
    },
    phase: "committed",
    failure: null
  });
  const source = journal?.source as { digest?: unknown } | undefined;
  expect(source?.digest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
  expect(journal?.targetDigest).toBe(source?.digest);
  expect(journal?.verifiedDigest).toBe(source?.digest);
  expect(journal?.receiptDigest).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/iu));
  expect(control?.state?.receiptDigest).toBe(journal?.receiptDigest);
  // Released leases intentionally retain one expired row so the fencing token
  // can never reset after a clean migration.
  expect(control?.leases).toHaveLength(1);
  expect(control?.leases[0]).toMatchObject({
    name: "database-generation-migration"
  });
  expect(Number(control?.leases[0]?.expiresAt)).toBeLessThanOrEqual(Date.now());
}

async function verifyDirectUpgradeAndNewReceipt(
  context: BrowserContext,
  sourceBefore: NativeDatabaseSnapshot,
  caseId: string,
  sourceRevisionId: string,
  expectRecoveredSourceControl = false
) {
  const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
  if (expectRecoveredSourceControl) {
    await expectCommittedControl(natural.page, sourceV13);
    const recoveredControl = await readReleaseControl(natural.page);
    expect(recoveredControl).toMatchObject({
      state: { migrationId: null },
      journals: [],
      leases: []
    });
    expect(await readNativeDatabase(natural.page, SOURCE_DATABASE)).toEqual(sourceBefore);
  }
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
    targetSchema: targetDescriptor.targetSchema,
    migrationId: targetDescriptor.migrationId
  });
  await expectCommittedDirectMigration(trial.page);

  const targetBeforeRevision = await readNativeDatabase(trial.page, TARGET_DATABASE);
  expectDirectV15ExtendsV13WithoutRewriting(sourceBefore, targetBeforeRevision);
  expect(await readNativeDatabase(trial.page, SOURCE_DATABASE)).toEqual(sourceBefore);
  expect(await readNativeDatabase(trial.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

  const revisionId = await addRevisionThroughUi(trial.page, caseId, sourceRevisionId);
  const targetAfterRevision = await readNativeDatabase(trial.page, TARGET_DATABASE);
  if (!targetAfterRevision) throw new Error("The direct v15 database disappeared after adding a Revision.");
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
  expect(await readNativeDatabase(trial.page, SOURCE_DATABASE)).toEqual(sourceBefore);

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
  expect((await readNativeDatabase(trial.page, TARGET_DATABASE))?.rows[RECEIPT_STORE])
    .toEqual(targetAfterRevision.rows[RECEIPT_STORE]);
  expect(await readNativeDatabase(trial.page, SOURCE_DATABASE)).toEqual(sourceBefore);
  return { natural, trial };
}

test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-schema-v13-v15-generations-"));
  [
    sourceV13,
    healthyV15,
    migrationFailedV15,
    validationFailedV15,
    digestMismatchV15,
    sameMigrationIdRepublishV15,
    newMigrationIdRepublishV15
  ] = await Promise.all([
    buildGeneration(fixtureRoot, "source-a-v13", sourceDescriptor),
    buildGeneration(fixtureRoot, "healthy-c-v15-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "migration-failed-c-v15-direct", targetDescriptor, "migration"),
    buildGeneration(fixtureRoot, "validation-failed-c-v15-direct", targetDescriptor, "validation"),
    buildGeneration(fixtureRoot, "digest-mismatch-c-v15-direct", targetDescriptor, "digest"),
    buildGeneration(fixtureRoot, "same-id-republish-c-v15-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "new-id-republish-c-v15-direct", republishedTargetDescriptor)
  ]);
  expect(new Set([
    sourceV13.version,
    healthyV15.version,
    migrationFailedV15.version,
    validationFailedV15.version,
    digestMismatchV15.version,
    sameMigrationIdRepublishV15.version,
    newMigrationIdRepublishV15.version
  ]).size).toBe(7);
  expect(sourceV13.entryPath).not.toBe(healthyV15.entryPath);
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

test("已提交控制记录的富 v13 数据直升 v15，跨过 v14 索引并只为新 Revision 生成收据", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceRevisionId = new URL(stable.page.url()).pathname.split("/").at(-1);
    if (!sourceRevisionId) throw new Error("The v13 demo case did not expose its Revision id.");
    await seedResearchNoteAndEvent(stable.page, caseId, sourceRevisionId, "受控");
    await openDataManagement(stable.page);
    await seedPortableData(stable.page, portableFixture("v13→v15 direct"));
    // Keep this release-protocol scenario free of Chromium's internal Downloads
    // surface. The UI import/quarantine/approval path remains real; only the
    // deterministic built-in JSON source is generated directly in the runner.
    await seedActiveRulePack(stable.page, { source: "generated" });
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The rich v13 source database was not created.");
    expect(sourceBefore.rows.researchNotes.length).toBeGreaterThan(0);
    expect(sourceBefore.rows.events.length).toBeGreaterThan(0);
    expect(sourceBefore.rows.attachments.length).toBeGreaterThan(0);
    expect(await readNativeDatabase(stable.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(stable.page, TARGET_DATABASE)).toBeNull();
    await expectCommittedControl(stable.page, sourceV13);

    const { natural, trial } = await verifyDirectUpgradeAndNewReceipt(
      context,
      sourceBefore,
      caseId,
      sourceRevisionId
    );
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("已确认 v13 壳在 release-control 缺失时先重建控制记录，再无损直升 v15", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceRevisionId = new URL(stable.page.url()).pathname.split("/").at(-1);
    if (!sourceRevisionId) throw new Error("The legacy v13 case did not expose its Revision id.");
    await seedResearchNoteAndEvent(stable.page, caseId, sourceRevisionId, "控制库缺失");
    await openDataManagement(stable.page);
    await seedPortableData(stable.page, portableFixture("v13 physical only"));
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The physical v13 source database was not created.");
    expect(sourceBefore.rows.researchNotes.length).toBeGreaterThan(0);
    expect(sourceBefore.rows.events.length).toBeGreaterThan(0);
    expect(sourceBefore.rows.attachments.length).toBeGreaterThan(0);
    expect(await readNativeDatabase(stable.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    expect(await readNativeDatabase(stable.page, TARGET_DATABASE)).toBeNull();
    await expectCommittedControl(stable.page, sourceV13);

    await deleteLegacyReleaseControl(stable.page);
    expect(await readReleaseControl(stable.page)).toBeNull();
    expect(await readNativeDatabase(stable.page, SOURCE_DATABASE)).toEqual(sourceBefore);
    await stable.page.close();

    const { natural, trial } = await verifyDirectUpgradeAndNewReceipt(
      context,
      sourceBefore,
      caseId,
      sourceRevisionId,
      true
    );
    expect(trial.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems.filter((problem) => !problem.includes(
      `Another connection wants to delete database '${RELEASE_CONTROL_DATABASE}'. Closing db now to resume the delete request.`
    ))).toEqual([]);
    expect(stable.problems.filter((problem) => problem.includes(
      `Another connection wants to delete database '${RELEASE_CONTROL_DATABASE}'. Closing db now to resume the delete request.`
    ))).toHaveLength(1);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("direct v15 影子物化容量不足时保留 v13、目标零创建且不发送 BOOT_OK", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");

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
    await expectCommittedControl(failed.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
    await expect.poll(() => cacheGeneration(failed.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("direct v15 目标启动校验失败时隔离影子库，并保持 v13 指针与源数据", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");

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
      .toMatchObject({ phase: "failed", failure: { targetIsolation: "complete" } });
    await expectCommittedControl(failed.page, sourceV13);
    await expect.poll(() => cacheGeneration(failed.page, validationFailedV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
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

test("direct v15 物化后摘要不符时删除目标，并保持 v13 可恢复", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");

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
    await expectCommittedControl(failed.page, sourceV13);
    await expect.poll(() => cacheGeneration(failed.page, digestMismatchV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, TARGET_DATABASE)).toBeNull();
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
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

test("direct v15 control 已提交但 BOOT_OK 中断时，刷新后继续收敛到 v15", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    await installOneShotBootOkInterruption(context, targetDescriptor.dbGeneration);
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");

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
    expectDirectV15ExtendsV13WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(trial.page, TARGET_DATABASE)
    );
    expect(await readNativeDatabase(trial.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
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

test("旧页面持有 direct v15 target versionchange 时超时失败关闭，不提交目标也不改 v13", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);

    const natural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const failed = await openTargetTrial(context, healthyV15);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => stable.page.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked
    )).toBe("true");
    await expectFailedMigrationJournal(failed.page, "blocked");
    await expectCommittedControl(failed.page, sourceV13);
    await expect.poll(() => cacheGeneration(failed.page, healthyV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

    await releaseDatabaseUpgradeBlocker(stable.page);
    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
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

test("direct v15 Dexie 迁移事务失败时回滚 shadow，并保持 v13 指针与源数据", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The direct-hop v13 source database was not created.");

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
    await expectFailedMigrationJournal(failed.page, "migration");
    await expectCommittedControl(failed.page, sourceV13);
    await expect.poll(() => cacheGeneration(failed.page, migrationFailedV15)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));
    const targetAfter = await readNativeDatabase(failed.page, TARGET_DATABASE);
    expect(targetAfter === null || targetAfter.nativeVersion === SOURCE_NATIVE_VERSION).toBe(true);
    if (targetAfter) expect(targetAfter).toEqual(targetBefore);
    expect(await readNativeDatabase(failed.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));
    expect(recovered.problems).toEqual([]);
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

test("direct v15 隔离受阻后同 migrationId 只清理不续跑，新 migrationId 可从干净 v13 长期重发", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The long-term republish fixture did not create its v13 source.");
    await holdDatabaseUpgradeOpen(stable.page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);

    const firstNatural = await switchToTargetAndWaitForActivation(context, healthyV15);
    const firstFailure = await openTargetTrial(context, healthyV15);
    await expect(firstFailure.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expectFailedMigrationJournal(firstFailure.page, "blocked");
    await expect.poll(async () => migrationJournal(await readReleaseControl(firstFailure.page)))
      .toMatchObject({
        phase: "failed",
        failure: { targetIsolation: "failed" }
      });
    await expectCommittedControl(firstFailure.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(firstFailure.page, SOURCE_DATABASE));

    await releaseDatabaseUpgradeBlocker(stable.page);
    await firstFailure.page.close();
    await firstNatural.page.close();
    await stable.page.close();

    const sameIdNatural = await switchToTargetAndWaitForActivation(context, sameMigrationIdRepublishV15);
    const sameIdFailure = await openTargetTrial(context, sameMigrationIdRepublishV15);
    await expect(sameIdFailure.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => migrationJournal(await readReleaseControl(sameIdFailure.page)), {
      timeout: 30_000
    }).toMatchObject({
      phase: "failed",
      failure: {
        targetIsolation: "complete",
        isolationError: null
      }
    });
    await expectCommittedControl(sameIdFailure.page, sourceV13);
    expect(await readNativeDatabase(sameIdFailure.page, TARGET_DATABASE)).toBeNull();
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(sameIdFailure.page, SOURCE_DATABASE));
    await expect.poll(() => cacheGeneration(sameIdFailure.page, sameMigrationIdRepublishV15))
      .toMatchObject({ bootAttempted: true, bootConfirmed: false });
    await sameIdFailure.page.close();
    await sameIdNatural.page.close();

    const recovered = await openRecoveredSource(context);
    await expectCommittedControl(recovered.page, sourceV13);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(recovered.page, SOURCE_DATABASE));

    for (const historicalPage of [stable.page, firstNatural.page, sameIdNatural.page]) {
      if (!historicalPage.isClosed()) {
        await waitForForegroundAppReady(historicalPage);
        await historicalPage.close();
      }
    }

    // Reuse the already-confirmed rollback page to install the long-term
    // republish. Opening a navigation after exposing v2 would race Chromium's
    // soft update and could consume v2's one-shot trial on the helper page.
    await activateTargetFromReadyPage(recovered.page, newMigrationIdRepublishV15);
    const republishNatural = recovered;
    const republished = await openTargetTrial(context, newMigrationIdRepublishV15);
    await waitForAppReady(republished.page);
    await waitForServiceWorker(republished.page);
    await expect.poll(() => pageReleaseEvidence(republished.page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      dbStorageAdmission: "admitted",
      swBootAck: "true",
      swBootSignalSent: "true"
    });
    await expectCommittedControl(republished.page, newMigrationIdRepublishV15);
    await expect.poll(() => cacheGeneration(republished.page, newMigrationIdRepublishV15))
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
    const republishedJournal = migrationJournal(control, republishedTargetDescriptor.migrationId);
    expect(republishedJournal).toMatchObject({
      phase: "committed",
      source: {
        generation: sourceDescriptor.dbGeneration,
        databaseName: sourceDescriptor.databaseName,
        schemaVersion: sourceDescriptor.targetSchema
      },
      target: {
        generation: republishedTargetDescriptor.dbGeneration,
        databaseName: republishedTargetDescriptor.databaseName,
        schemaVersion: republishedTargetDescriptor.targetSchema
      },
      failure: null
    });
    const republishedSource = republishedJournal?.source as { digest?: unknown } | undefined;
    expect(republishedJournal?.targetDigest).toBe(republishedSource?.digest);
    expect(republishedJournal?.verifiedDigest).toBe(republishedSource?.digest);
    expect(control?.state?.receiptDigest).toBe(republishedJournal?.receiptDigest);

    expectDirectV15ExtendsV13WithoutRewriting(
      sourceBefore,
      await readNativeDatabase(republished.page, TARGET_DATABASE)
    );
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(republished.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(republished.page, INTERMEDIATE_V14_DATABASE)).toBeNull();
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
    expect(republishNatural.problems).toEqual([]);
    expect(republished.problems).toEqual([]);
    expect(recovered.problems).toEqual([]);
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

test("direct v15 已成功用户部署新 migrationId shell 时保留旧提交谱系且无需二次迁移", async () => {
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceRevisionId = new URL(stable.page.url()).pathname.split("/").at(-1);
    if (!sourceRevisionId) throw new Error("The successful-v1 republish fixture has no source Revision.");
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The successful-v1 republish fixture has no v13 source.");
    await waitForForegroundAppReady(stable.page);
    await stable.page.close();

    const initialUpgrade = await verifyDirectUpgradeAndNewReceipt(
      context,
      sourceBefore,
      caseId,
      sourceRevisionId
    );
    const targetBeforeRepublish = await readNativeDatabase(initialUpgrade.trial.page, TARGET_DATABASE);
    if (!targetBeforeRepublish) throw new Error("The first v15 release did not create its committed target.");
    const controlBeforeRepublish = await readReleaseControl(initialUpgrade.trial.page);
    expect(controlBeforeRepublish?.state).toMatchObject({
      migrationId: targetDescriptor.migrationId,
      committedBuild: healthyV15.version
    });

    for (const historicalPage of [initialUpgrade.natural.page]) {
      if (!historicalPage.isClosed()) {
        await waitForForegroundAppReady(historicalPage);
        await historicalPage.close();
      }
    }

    await activateTargetFromReadyPage(initialUpgrade.trial.page, newMigrationIdRepublishV15);
    await expect(initialUpgrade.trial.page.locator("#main-content")).toBeVisible();
    const republished = await openTargetTrial(context, newMigrationIdRepublishV15);
    await waitForAppReady(republished.page);
    await waitForServiceWorker(republished.page);
    await expect.poll(() => pageReleaseEvidence(republished.page)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true",
      swBootSignalSent: "true",
      descriptor: republishedTargetDescriptor
    });
    await expect.poll(() => cacheGeneration(republished.page, newMigrationIdRepublishV15))
      .toMatchObject({
        bootAttempted: true,
        bootConfirmed: true,
        migrationId: republishedTargetDescriptor.migrationId,
        acceptedCommittedMigrationIds: republishedTargetDescriptor.acceptedCommittedMigrationIds
      });

    const controlAfterRepublish = await readReleaseControl(republished.page);
    expect(controlAfterRepublish?.state).toMatchObject({
      committedGeneration: republishedTargetDescriptor.dbGeneration,
      committedDatabaseName: republishedTargetDescriptor.databaseName,
      committedSchema: republishedTargetDescriptor.targetSchema,
      committedBuild: newMigrationIdRepublishV15.version,
      migrationId: targetDescriptor.migrationId
    });
    expect(migrationJournal(controlAfterRepublish)).toMatchObject({
      phase: "committed",
      id: targetDescriptor.migrationId
    });
    expect(migrationJournal(
      controlAfterRepublish,
      republishedTargetDescriptor.migrationId
    )).toBeNull();
    expect(controlAfterRepublish?.journals).toHaveLength(1);
    expect(await readNativeDatabase(republished.page, TARGET_DATABASE)).toEqual(targetBeforeRepublish);
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(republished.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(republished.page, INTERMEDIATE_V14_DATABASE)).toBeNull();

    for (const page of context.pages()) {
      if (page !== republished.page && !page.isClosed()) {
        if (page.url().startsWith(switchServer.origin)) {
          await waitForForegroundAppReady(page);
        }
        await page.close();
      }
    }
    await context.setOffline(true);
    await republished.page.goto(`${switchServer.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(republished.page);
    await waitForServiceWorker(republished.page);
    await expectPageFixture(republished.page, newMigrationIdRepublishV15);
    await expect.poll(() => pageReleaseEvidence(republished.page)).toMatchObject({
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });
    expect(await attemptRepositoryWrite(republished.page, caseId)).toMatchObject({ ok: true });
    const offlineControl = await readReleaseControl(republished.page);
    expect(offlineControl?.state).toMatchObject({
      committedBuild: newMigrationIdRepublishV15.version,
      migrationId: targetDescriptor.migrationId
    });
    expect(migrationJournal(offlineControl, republishedTargetDescriptor.migrationId)).toBeNull();

    expect(initialUpgrade.natural.problems).toEqual([]);
    expect(initialUpgrade.trial.problems).toEqual([]);
    expect(republished.problems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.setOffline(false).catch(() => undefined);
    await context.close();
  }
});
