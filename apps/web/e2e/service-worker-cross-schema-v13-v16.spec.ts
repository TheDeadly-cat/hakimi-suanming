import { lstat, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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
  openConfirmedBridgeBeforeSwitch,
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

type FixtureDirectoryIdentity = {
  realPath: string;
  dev: bigint;
  ino: bigint;
  birthtimeNs: bigint;
};
const ownedFixtureDirectories = new Map<string, {
  parent: string;
  parentIdentity: FixtureDirectoryIdentity;
  directoryIdentity: FixtureDirectoryIdentity;
}>();

function normalizedDirectoryPath(value: string): string {
  const absolute = path.resolve(value);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

async function readFixtureDirectoryIdentity(directory: string): Promise<FixtureDirectoryIdentity> {
  const metadata = await lstat(directory, { bigint: true });
  const realPath = await realpath(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino <= 0n ||
    normalizedDirectoryPath(realPath) !== normalizedDirectoryPath(directory)) {
    throw new Error("Fixture temporary directory is not a verifiable plain directory: " + directory);
  }
  return { realPath, dev: metadata.dev, ino: metadata.ino, birthtimeNs: metadata.birthtimeNs };
}

function sameFixtureDirectory(left: FixtureDirectoryIdentity, right: FixtureDirectoryIdentity): boolean {
  return normalizedDirectoryPath(left.realPath) === normalizedDirectoryPath(right.realPath) &&
    left.dev === right.dev && left.ino === right.ino && left.birthtimeNs === right.birthtimeNs;
}

async function createFixtureTemporaryDirectory(
  prefix: "hakimi-cross-schema-v13-v16-generations-" | "hb-v13-v16-profile-"
): Promise<string> {
  const parent = path.resolve(os.tmpdir());
  const parentIdentity = await readFixtureDirectoryIdentity(parent);
  const directory = await mkdtemp(path.join(parent, prefix));
  if (normalizedDirectoryPath(path.dirname(directory)) !== normalizedDirectoryPath(parent) ||
    !path.basename(directory).startsWith(prefix) ||
    !/^[A-Za-z0-9]{6}$/u.test(path.basename(directory).slice(prefix.length))) {
    throw new Error("Created fixture temporary directory is outside its owned namespace.");
  }
  const directoryIdentity = await readFixtureDirectoryIdentity(directory);
  if (!sameFixtureDirectory(parentIdentity, await readFixtureDirectoryIdentity(parent))) {
    throw new Error("Fixture temporary parent changed during directory creation.");
  }
  ownedFixtureDirectories.set(directory, { parent, parentIdentity, directoryIdentity });
  return directory;
}

async function removeFixtureTemporaryDirectory(directory: string): Promise<void> {
  const owned = ownedFixtureDirectories.get(directory);
  if (!owned || !path.isAbsolute(directory) ||
    normalizedDirectoryPath(path.dirname(directory)) !== normalizedDirectoryPath(owned.parent) ||
    normalizedDirectoryPath(owned.parent) !== normalizedDirectoryPath(os.tmpdir())) {
    throw new Error("Unowned or displaced fixture temporary directory; cleanup refused.");
  }
  if (!sameFixtureDirectory(owned.parentIdentity, await readFixtureDirectoryIdentity(owned.parent)) ||
    !sameFixtureDirectory(owned.directoryIdentity, await readFixtureDirectoryIdentity(directory))) {
    throw new Error("Fixture temporary directory identity changed; cleanup refused.");
  }
  await rm(directory, { recursive: true, force: true });
  ownedFixtureDirectories.delete(directory);
}

async function launchFixtureContext(): Promise<BrowserContext> {
  const projectName = test.info().project.name;
  const channel = projectName === "msedge"
    ? "msedge"
    : projectName === "chrome"
      ? "chrome"
      : null;
  if (!channel) throw new Error(`Unsupported v13→v16 browser project: ${projectName}`);

  const profilePath = await createFixtureTemporaryDirectory("hb-v13-v16-profile-");
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

async function attachForwardMigrationFailureState(
  context: BrowserContext,
  attachmentName = "forward-migration-failure-control-state"
): Promise<void> {
  // Capture the real control journal before the isolated synthetic profiles
  // close. Startup recovery deliberately normalizes aggregate errors for UI.
  const observations = await Promise.all(context.pages().map(async (page) => {
    try {
      const control = await readReleaseControl(page);
      const journal = control?.journals.find((entry) => entry.id === targetDescriptor.migrationId);
      return {
        url: page.url(),
        evidence: await pageReleaseEvidence(page),
        journal: journal ? {
          id: journal.id, phase: journal.phase, failure: journal.failure,
          history: journal.history, attemptCount: journal.attemptCount
        } : null,
        leases: control?.leases ?? []
      };
    } catch (error) {
      return { url: page.url(), observationError: error instanceof Error ? error.message : String(error) };
    }
  }));
  await test.info().attach(attachmentName, {
    body: Buffer.from(JSON.stringify(observations, null, 2)),
    contentType: "application/json"
  });
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
  const natural = await openConfirmedBridgeBeforeSwitch(
    context,
    switchServer,
    sourceV13
  );
  switchServer.setGeneration(target);
  await natural.page.bringToFront();
  await natural.page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("The confirmed v13 page has no Service Worker registration.");
    await registration.update();
  });
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

/**
 * Isolated test orchestration: retire every A page before the browser's
 * normal waiting-worker activation. This does not exercise concurrent old-page
 * cross-Schema takeover and never sends an activation protocol command.
 */
async function installTargetAndRetireSourcePages(
  context: BrowserContext,
  target: GenerationFixture,
  source?: {
    readySource: { page: Page; problems: string[] };
    sourceFixture: GenerationFixture;
    currentWorker: GenerationFixture;
    observationName: string;
  }
): Promise<{ problems: string[] }> {
  const sourceFixture = source?.sourceFixture ?? sourceV13;
  const currentWorker = source?.currentWorker ?? sourceFixture;
  const observationName = source?.observationName ?? "source-retirement-activation";
  const natural = source?.readySource
    ?? await openConfirmedBridgeBeforeSwitch(context, switchServer, sourceFixture);
  if (source) {
    // A rollback v13 document can be served by a failed v16 worker. Reuse that
    // document directly; reopening the bridge would publish v13 sw.js again.
    expect(natural.page.context()).toBe(context);
    expect(natural.page.isClosed()).toBe(false);
    await expectPageFixture(natural.page, sourceFixture);
    await expect.poll(() => workerBuildVersion(natural.page, "active"), {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe(currentWorker.version);
    await expect.poll(() => workerBuildVersion(natural.page, "controller"), {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe(currentWorker.version);
    expect(observationName).toMatch(/^source-retirement-activation-[a-z0-9-]+$/u);
  }
  const observerPage = await context.newPage();
  const session = await context.newCDPSession(observerPage);
  const registrations = new Map<string, {
    registrationId: string; scopeURL: string; isDeleted: boolean;
  }>();
  const versions = new Map<string, {
    versionId: string; registrationId: string; scriptURL: string;
    status: string; controlledClients?: string[];
  }>();
  const observations: Array<{ at: string; event: string; payload: unknown }> = [];
  const record = (event: string, payload: unknown) => {
    observations.push({ at: new Date().toISOString(), event, payload });
  };
  let sourceVersionId: string | null = null;
  let targetVersionId: string | null = null;
  let sourceRetirementStarted = false;
  let sourceClientsAfterRetirement: {
    at: string; versionId: string; controlledClients: string[];
  } | null = null;
  const sourceClientCensus = (): {
    at: string; versionId: string; controlledClients: string[];
  } | null => sourceClientsAfterRetirement;
  let activationObserved = false;
  let failure: string | null = null;
  const cleanupErrors: string[] = [];
  const activationSchedulingHolds: Array<{
    page: Page;
    capture: () => Promise<unknown>;
    restore: () => Promise<void>;
  }> = [];
  const activationSchedulingSnapshots: unknown[] = [];
  session.on("ServiceWorker.workerRegistrationUpdated", (payload) => {
    for (const registration of payload.registrations) registrations.set(registration.registrationId, registration);
    record("ServiceWorker.workerRegistrationUpdated", payload);
  });
  session.on("ServiceWorker.workerVersionUpdated", (payload) => {
    for (const version of payload.versions) {
      versions.set(version.versionId, version);
      if (sourceRetirementStarted && version.versionId === sourceVersionId && Array.isArray(version.controlledClients)) {
        sourceClientsAfterRetirement = {
          at: new Date().toISOString(),
          versionId: version.versionId,
          controlledClients: [...version.controlledClients]
        };
      }
    }
    record("ServiceWorker.workerVersionUpdated", payload);
  });
  session.on("ServiceWorker.workerErrorReported", (payload) => {
    record("ServiceWorker.workerErrorReported", payload);
  });
  try {
    const observerState = await observerPage.evaluate(() => ({
      url: location.href,
      origin: location.origin,
      noOpener: window.opener === null,
      controlled: "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller)
    }));
    expect(observerState).toEqual({
      url: "about:blank", origin: "null", noOpener: true, controlled: false
    });
    record("observer-ready", observerState);
    await session.send("ServiceWorker.enable");
    const matchingRegistrations = () => [...registrations.values()].filter((registration) =>
      !registration.isDeleted && registration.scopeURL === switchServer.origin + "/"
    );
    await expect.poll(matchingRegistrations, { timeout: ACTIVATION_TIMEOUT_MS }).toHaveLength(1);
    const registration = matchingRegistrations()[0];
    if (!registration) throw new Error("No unique source registration was observed.");
    const scriptURL = new URL("/sw.js", switchServer.origin).href;
    const sourceVersions = () => [...versions.values()].filter((version) =>
      version.registrationId === registration.registrationId &&
      version.scriptURL === scriptURL && version.status === "activated"
    );
    await expect.poll(sourceVersions, { timeout: ACTIVATION_TIMEOUT_MS }).toHaveLength(1);
    const sourceVersion = sourceVersions()[0];
    if (!sourceVersion) throw new Error("No unique active A version was observed.");
    sourceVersionId = sourceVersion.versionId;
    await expect.poll(() => workerBuildVersion(natural.page, "controller"), {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe(currentWorker.version);

    // Exercise browser activation after retirement independently of the new
    // automatic hot-activation path. Hold only outgoing activation requests on
    // each existing page's captured controller; do not fabricate any response.
    for (const sourcePage of context.pages().filter((page) => page !== observerPage)) {
      if (new URL(sourcePage.url()).origin !== switchServer.origin) {
        record("natural-retirement-scheduling-outside-origin", { url: sourcePage.url() });
        continue;
      }
      const controlled = await sourcePage.evaluate(() =>
        "serviceWorker" in navigator && navigator.serviceWorker.controller !== null);
      if (!controlled) {
        record("natural-retirement-scheduling-uncontrolled-page", { url: sourcePage.url() });
        continue;
      }
      const handle = await sourcePage.evaluateHandle(() => {
        const controller = "serviceWorker" in navigator ? navigator.serviceWorker.controller : null;
        const original = controller === null ? null : ServiceWorker.prototype.postMessage;
        const held = {
          REQUEST_INSTALLED_GENERATION_ACTIVATION_V1: 0,
          REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_V1: 0
        };
        const holdActivationRequest = function (
          this: ServiceWorker,
          message: unknown,
          transferOrOptions?: Transferable[] | StructuredSerializeOptions
        ): void {
          const type = message !== null && typeof message === "object"
            ? (message as { type?: unknown }).type : undefined;
          if (this === controller && (
            type === "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1"
            || type === "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_V1"
          )) {
            held[type] += 1;
            // The real sender receives no ACK/NACK. Its page will retire;
            // neither this fixture nor cleanup ever replays the request.
            return;
          }
          if (original === null) throw new Error("No captured source transport exists.");
          Reflect.apply(original, this, transferOrOptions === undefined
            ? [message] : [message, transferOrOptions]);
        };
        if (controller !== null) ServiceWorker.prototype.postMessage = holdActivationRequest;
        return {
          capture: () => ({
            url: location.href,
            enabled: controller !== null,
            controllerScriptURL: controller?.scriptURL ?? null,
            controllerState: controller?.state ?? null,
            currentControllerStillCaptured: ("serviceWorker" in navigator ? navigator.serviceWorker.controller : null) === controller,
            heldByType: { ...held },
            heldRequestCount: Object.values(held).reduce((sum, count) => sum + count, 0),
            responseFabricated: false,
            requestsReplayed: false
          }),
          restore: () => {
            if (controller === null || original === null) return;
            if (ServiceWorker.prototype.postMessage !== holdActivationRequest) {
              throw new Error("Natural-retirement activation scheduling hook changed before cleanup.");
            }
            ServiceWorker.prototype.postMessage = original;
          }
        };
      });
      const hold = {
        page: sourcePage,
        capture: () => handle.evaluate((state) => state.capture()),
        restore: async () => {
          try {
            if (!sourcePage.isClosed()) await handle.evaluate((state) => state.restore());
          } finally { await handle.dispose(); }
        }
      };
      const initial = await hold.capture();
      if (!initial.enabled) {
        record("natural-retirement-scheduling-controller-absent", initial);
        await hold.restore();
        continue;
      }
      activationSchedulingHolds.push(hold);
      record("natural-retirement-activation-scheduling-installed", initial);
    }

    switchServer.setGeneration(target);
    await natural.page.bringToFront();
    await natural.page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("The confirmed A page has no registration.");
      await registration.update();
    });
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
    await expect.poll(() => workerBuildVersion(natural.page, "waiting"), {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe(target.version);
    const waitingVersions = () => [...versions.values()].filter((version) =>
      version.registrationId === registration.registrationId &&
      version.scriptURL === scriptURL && version.status === "installed"
    );
    await expect.poll(waitingVersions, { timeout: ACTIVATION_TIMEOUT_MS }).toHaveLength(1);
    const targetVersion = waitingVersions()[0];
    if (!targetVersion) throw new Error("No unique installed B version was observed.");
    targetVersionId = targetVersion.versionId;
    expect(targetVersionId).not.toBe(sourceVersionId);
    expect(versions.get(sourceVersionId)?.status).toBe("activated");
    await expect.poll(() => workerBuildVersion(natural.page, "controller"), {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe(currentWorker.version);
    record("waiting-target-bound-before-source-retirement", {
      registrationId: registration.registrationId, sourceVersionId, targetVersionId,
      sourceBuildVersion: currentWorker.version, targetBuildVersion: target.version,
      ...(source ? { sourceDocumentBuildVersion: sourceFixture.version } : {}),
      source: versions.get(sourceVersionId), target: versions.get(targetVersionId)
    });

    const sourcePages = context.pages().filter((page) => page !== observerPage);
    expect(sourcePages).toContain(natural.page);
    for (const hold of activationSchedulingHolds) {
      const snapshot = await hold.capture();
      activationSchedulingSnapshots.push(snapshot);
      record("activation-requests-held-before-source-retirement", snapshot);
    }
    sourceRetirementStarted = true;
    record("retiring-source-pages", sourcePages.map((page) => ({ url: page.url() })));
    await Promise.all(sourcePages.map((page) => page.close()));
    expect(sourcePages.every((page) => page.isClosed())).toBe(true);
    expect(context.pages()).toHaveLength(1);
    expect(context.pages()[0]).toBe(observerPage);
    record("source-pages-closed", { count: sourcePages.length, remainingUrl: observerPage.url() });
    // Retain the last explicit client census after retirement starts, including
    // a zero-client event followed by a status-only update. Omission is not zero.
    await expect.poll(() => sourceClientCensus()?.controlledClients ?? null, {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toEqual([]);
    record("source-controlled-clients-zero", sourceClientsAfterRetirement);
    await expect.poll(() => versions.get(targetVersion.versionId)?.status ?? null, {
      timeout: ACTIVATION_TIMEOUT_MS
    }).toBe("activated");
    expect(versions.get(targetVersion.versionId)?.registrationId).toBe(registration.registrationId);
    expect(versions.get(targetVersion.versionId)?.scriptURL).toBe(scriptURL);
    expect(sourceClientCensus()?.controlledClients).toEqual([]);
    expect(context.pages()).toHaveLength(1);
    expect(context.pages()[0]).toBe(observerPage);
    activationObserved = true;
    record("target-naturally-activated", versions.get(targetVersion.versionId));
    return { problems: natural.problems };
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    for (const hold of activationSchedulingHolds) {
      if (!hold.page.isClosed()) {
        try {
          const snapshot = await hold.capture();
          activationSchedulingSnapshots.push(snapshot);
          record("activation-scheduling-counts-before-cleanup", snapshot);
        } catch (error) { cleanupErrors.push(String(error)); }
      }
      try { await hold.restore(); } catch (error) { cleanupErrors.push(String(error)); }
    }
    try { await session.send("ServiceWorker.disable"); } catch (error) { cleanupErrors.push(String(error)); }
    try { await session.detach(); } catch (error) { cleanupErrors.push(String(error)); }
    if (!observerPage.isClosed()) {
      try { await observerPage.close(); } catch (error) { cleanupErrors.push(String(error)); }
    }
    const evidencePath = test.info().outputPath(`${observationName}.json`);
    await writeFile(evidencePath, JSON.stringify({
      scope: "local current-source cross-Schema activation after retiring all A pages",
      sourceVersionId, targetVersionId, sourceClientsAfterRetirement, sourceBuildVersion: currentWorker.version,
      targetBuildVersion: target.version, activationObserved, failure, cleanupErrors,
      ...(source ? { sourceDocumentBuildVersion: sourceFixture.version } : {}),
      simultaneousOldPageCrossSchemaTakeoverVerified: false,
      applicationBootAcceptedByThisObservation: false,
      forcedActivationIssuedByHarness: false,
      activationScheduling: {
        scope: "Only existing retiring pages hold automatic activation REQUEST messages to their captured controller; every other message uses the original transport.",
        sourcePagesRetired: sourceRetirementStarted && activationSchedulingHolds.every((hold) => hold.page.isClosed()),
        countScope: "Observed immediately before retirement, or during early-failure cleanup; not a post-close transport census.",
        capturedObservationCount: activationSchedulingSnapshots.length,
        noPersistentInitHook: true,
        responsesFabricated: false,
        requestsReplayed: false,
        observations: activationSchedulingSnapshots
      },
      observations
    }, null, 2), { flag: "wx" });
    await test.info().attach(observationName, { path: evidencePath, contentType: "application/json" });
    if (failure === null && cleanupErrors.length > 0) {
      throw new Error("Natural-activation observer cleanup failed: " + cleanupErrors.join("; "));
    }
  }
}

/** A native target connection owner; this document must never boot the app. */
async function openNativeTargetUpgradeBlocker(
  context: BrowserContext,
  target: GenerationFixture
): Promise<{ page: Page; problems: string[]; close: () => Promise<void> }> {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  const session = await context.newCDPSession(page);
  const holderUrl = `${switchServer.origin}/__e2e__/cross-schema-native-target-holder`;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (page.isClosed()) return;
    try {
      await releaseDatabaseUpgradeBlocker(page);
    } finally {
      try { await session.detach(); } finally { await page.close(); }
    }
  };
  try {
    // Both mechanisms already exist in repository browser tests. The bypass is
    // scoped to this page's CDP session; the real B trial uses a separate page.
    await session.send("Network.enable");
    await session.send("Network.setBypassServiceWorker", { bypass: true });
    await page.route(holderUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        headers: {
          "cache-control": "no-store",
          "content-security-policy": "default-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'"
        },
        body: "<!doctype html><html><meta charset=\"utf-8\"><title>Native target connection holder</title><body>native target holder</body></html>"
      });
    });
    const response = await page.goto(holderUrl, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    expect(response?.fromServiceWorker()).toBe(false);
    expect(await page.evaluate(() => ({
      origin: location.origin,
      path: location.pathname,
      controlled: Boolean(navigator.serviceWorker.controller),
      scriptCount: document.scripts.length,
      releaseMeta: document.querySelector('meta[name="hakimi-release-database"]')?.getAttribute("content") ?? null,
      appBootReady: document.documentElement.dataset.appBootReady ?? null,
      swBootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null
    }))).toEqual({
      origin: switchServer.origin,
      path: "/__e2e__/cross-schema-native-target-holder",
      controlled: false,
      scriptCount: 0,
      releaseMeta: null,
      appBootReady: null,
      swBootSignalSent: null
    });
    // A controlled static page would fail PREPARE_DATABASE_MIGRATION as an
    // unresponsive peer, which would not test native versionchange blocking.
    await expect.poll(() => workerBuildVersion(page, "active")).toBe(target.version);
    expect(await cacheGeneration(page, target)).toMatchObject({
      bootAttempted: false, bootConfirmed: false
    });
    await holdDatabaseUpgradeOpen(page, TARGET_DATABASE, SOURCE_NATIVE_VERSION);
    expect(await readNativeDatabaseShape(page, TARGET_DATABASE)).toEqual({
      nativeVersion: SOURCE_NATIVE_VERSION, stores: ["e2eBlocker"]
    });
    return { page, problems, close };
  } catch (error) {
    await close();
    throw error;
  }
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
  fixtureRoot = await createFixtureTemporaryDirectory("hakimi-cross-schema-v13-v16-generations-");
  const buildNames = [
    "source-a-v13", "healthy-d-v16-direct", "migration-failed-d-v16-direct",
    "validation-failed-d-v16-direct", "digest-mismatch-d-v16-direct",
    "same-id-republish-d-v16-direct", "new-id-republish-d-v16-direct"
  ];
  // Every child build must settle before afterAll can remove its owned root.
  const settledBuilds = await Promise.allSettled([
    buildGeneration(fixtureRoot, "source-a-v13", sourceDescriptor),
    buildGeneration(fixtureRoot, "healthy-d-v16-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "migration-failed-d-v16-direct", targetDescriptor, "migration"),
    buildGeneration(fixtureRoot, "validation-failed-d-v16-direct", targetDescriptor, "validation"),
    buildGeneration(fixtureRoot, "digest-mismatch-d-v16-direct", targetDescriptor, "digest"),
    buildGeneration(fixtureRoot, "same-id-republish-d-v16-direct", targetDescriptor),
    buildGeneration(fixtureRoot, "new-id-republish-d-v16-direct", republishedTargetDescriptor)
  ]);
  const failures = settledBuilds.flatMap((result, index) => result.status === "rejected"
    ? [new Error(`Fixture generation ${buildNames[index]} failed.`, { cause: result.reason })]
    : []);
  if (failures.length > 0) throw new AggregateError(failures, "Cross-Schema fixture builds failed.");
  const completedBuild = (index: number): GenerationFixture => {
    const result = settledBuilds[index];
    if (!result || result.status !== "fulfilled") throw new Error("Fixture build did not complete.");
    return result.value;
  };
  [
    sourceV13,
    healthyV16,
    migrationFailedV16,
    validationFailedV16,
    digestMismatchV16,
    sameMigrationIdRepublishV16,
    newMigrationIdRepublishV16
  ] = [
    completedBuild(0), completedBuild(1), completedBuild(2), completedBuild(3),
    completedBuild(4), completedBuild(5), completedBuild(6)
  ];
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
  if (fixtureRoot) await removeFixtureTemporaryDirectory(fixtureRoot);
  await Promise.all([...browserProfilePaths].map((profilePath) =>
    removeFixtureTemporaryDirectory(profilePath)
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
        swBootSignalSent: "false",
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
    // Read only after convergence assertions, so successful runs retain the
    // same journal/build observations without changing the takeover timing.
    await attachForwardMigrationFailureState(context, "forward-migration-success-control-state");
    const screenshotPath = test.info().outputPath("forward-v16-converged.png");
    await slowPage.screenshot({ path: screenshotPath, fullPage: false });
    await test.info().attach("Forward migration converged after the original slow audit", {
      path: screenshotPath,
      contentType: "image/png"
    });
  } catch (error) {
    await attachForwardMigrationFailureState(context);
    throw error;
  } finally {
    await context.close();
  }
});

test("首个 v16 试运行页在源冻结被慢旧页拖过时限后自动重试并完成收敛", async () => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 freeze-retry source database was not created.");

    await activateTargetGeneration(stable.page);

    // Freeze the already-confirmed v13 tab's main thread for 8 s so its
    // FREEZE_DATABASE_WRITES ACK arrives after the Service Worker's 5 s
    // per-client timeout. The v16 trial page must retry instead of dying.
    const busyPeer = stable.page.evaluate(() => {
      const deadline = performance.now() + 8_000;
      while (performance.now() < deadline) {
        // Intentional busy loop: delays this tab's freeze ACK under test.
      }
    });

    const trial = await context.newPage();
    const trialProblems = collectConsoleProblems(trial);
    const trialResponse = await trial.goto(`${switchServer.origin}/cases`, {
      waitUntil: "domcontentloaded"
    });
    expect(trialResponse?.fromServiceWorker()).toBe(true);
    await expect.poll(() => trial.evaluate(() =>
      document.documentElement.dataset.dbSourceFreezeRetry ?? null
    ), { timeout: CONVERGENCE_TIMEOUT_MS }).not.toBeNull();
    expect(await trial.evaluate(() =>
      document.querySelector('[role="alert"]') === null
    )).toBe(true);

    await busyPeer;
    await waitForAppReady(trial);
    await waitForServiceWorker(trial);
    await expectPageFixture(trial, healthyV16);
    await expectCommittedTarget(trial);
    await expect.poll(() => cacheGeneration(trial, healthyV16)).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
    expect(await readMutationState(trial)).toMatchObject({ epoch: 1, verifiedEpoch: 1 });
    expect(await attemptRepositoryWrite(trial, caseId)).toMatchObject({ ok: true });
    expect(await trial.evaluate(() =>
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type
    )).toBe("navigate");
    await expect.poll(() => pageReleaseEvidence(trial)).toMatchObject({
      appBootReady: "true",
      dbMigrationPhase: "committed",
      swBootAck: "true"
    });

    await expect.poll(() => pageReleaseEvidence(stable.page), { timeout: CONVERGENCE_TIMEOUT_MS })
      .toMatchObject({
        fixture: healthyV16.name,
        appBootReady: "true",
        swBootAck: "true",
        dbMigrationPhase: "committed"
      });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(stable.page, SOURCE_DATABASE));
    expect(await readNativeDatabase(stable.page, TARGET_DATABASE)).not.toBeNull();
    expect(trialProblems).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } catch (error) {
    await attachForwardMigrationFailureState(context);
    throw error;
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

    const natural = await installTargetAndRetireSourcePages(context, healthyV16);
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

    const natural = await installTargetAndRetireSourcePages(context, healthyV16);
    const failed = await openTargetTrial(context, healthyV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(failed.page)).toMatchObject({
      appBootReady: "false",
      dbStorageAdmission: "insufficient",
      swBootAck: null,
      swBootSignalSent: "false"
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

    const natural = await installTargetAndRetireSourcePages(context, validationFailedV16);
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

    const natural = await installTargetAndRetireSourcePages(context, digestMismatchV16);
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

    const natural = await installTargetAndRetireSourcePages(context, migrationFailedV16);
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

    const natural = await installTargetAndRetireSourcePages(context, healthyV16);
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
  let blocker: Awaited<ReturnType<typeof openNativeTargetUpgradeBlocker>> | null = null;
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 stale-target source database was not created.");
    const natural = await installTargetAndRetireSourcePages(context, healthyV16);
    blocker = await openNativeTargetUpgradeBlocker(context, healthyV16);
    const nativeHolderPage = blocker.page;
    const failed = await openTargetTrial(context, healthyV16);
    await expect(failed.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 35_000 });
    await expect.poll(() => nativeHolderPage.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked ?? null
    )).toBe("true");
    await expectFailedMigrationJournal(failed.page, "blocked");
    await expect.poll(() => readReleaseControl(failed.page)).toMatchObject({
      state: { committedGeneration: sourceDescriptor.dbGeneration }
    });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(failed.page, SOURCE_DATABASE));

    await blocker.close();
    await failed.page.close();
    const recovered = await openRecoveredSource(context);
    expect(recovered.problems).toEqual([]);
    expect(natural.problems).toEqual([]);
    expect(failed.problems.filter((problem) =>
      !/blocked|timeout|占用|阻塞/iu.test(problem) &&
      problem !== EXPECTED_TARGET_DELETE_CONNECTION_WARNING
    )).toEqual([]);
    expect(stable.problems).toEqual([]);
    expect(blocker.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    try { await blocker?.close(); } finally { await context.close(); }
  }
});

test("dirty v16 全审计期间并发受支持写入使 CAS 失败，随后全审计恢复并命中 clean cache", async () => {
  test.setTimeout(600_000);
  const context = await launchFixtureContext();
  const externalRequests = collectExternalRequests(context, switchServer.origin);
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const natural = await installTargetAndRetireSourcePages(context, healthyV16);
    const writer = await openTargetTrial(context, healthyV16);
    await waitForAppReady(writer.page);
    await waitForServiceWorker(writer.page);
    await expectCommittedTarget(writer.page);
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 1, verifiedEpoch: 1 });
    // The source pages were retired before natural target activation.
    // The CAS case still has exactly two participants: one verifier and one writer.

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
      swBootSignalSent: "false"
    });

    expect(await attemptRepositoryWrite(writer.page, caseId)).toMatchObject({ ok: true });
    expect(await readMutationState(writer.page)).toMatchObject({ epoch: 3, verifiedEpoch: 1 });
    await writer.page.evaluate((key) => localStorage.setItem(key, "released"), gateKey);

    await expect(contender.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 30_000 });
    await expect.poll(() => pageReleaseEvidence(contender)).toMatchObject({
      appBootReady: "false",
      swBootAck: null,
      swBootSignalSent: "false"
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
  let blocker: Awaited<ReturnType<typeof openNativeTargetUpgradeBlocker>> | null = null;
  try {
    const stable = await openStableBridge(context, switchServer, sourceV13);
    const caseId = await createDemoCase(stable.page, switchServer.origin);
    const sourceBefore = await readNativeDatabase(stable.page, SOURCE_DATABASE);
    if (!sourceBefore) throw new Error("The v13 republish source database was not created.");
    const firstNatural = await installTargetAndRetireSourcePages(context, healthyV16);
    blocker = await openNativeTargetUpgradeBlocker(context, healthyV16);
    const nativeHolderPage = blocker.page;
    const firstFailure = await openTargetTrial(context, healthyV16);
    await expect(firstFailure.page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" }))
      .toBeVisible({ timeout: 35_000 });
    await expect.poll(() => nativeHolderPage.evaluate(() =>
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked ?? null
    )).toBe("true");
    await expectFailedMigrationJournal(firstFailure.page, "blocked");
    await expect.poll(async () => migrationJournal(await readReleaseControl(firstFailure.page)))
      .toMatchObject({
        phase: "failed",
        failure: { targetIsolation: "failed" }
      });
    expectSourceUnchanged(sourceBefore, await readNativeDatabase(firstFailure.page, SOURCE_DATABASE));

    await blocker.close();
    await firstFailure.page.close();

    // The failed v16 worker is still active and must serve the committed v13
    // rollback shell. Confirm that page first; temporarily serving v13 sw.js
    // here would install an artificial downgrade candidate and mask the real
    // same-migrationId republish path.
    const sameIdRecovered = await openRecoveredSource(context);
    const sameIdNatural = await installTargetAndRetireSourcePages(context, sameMigrationIdRepublishV16, {
      readySource: sameIdRecovered,
      sourceFixture: sourceV13,
      currentWorker: healthyV16,
      observationName: "source-retirement-activation-same-id"
    });
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

    const recovered = await openRecoveredSource(context);
    const newIdNatural = await installTargetAndRetireSourcePages(context, newMigrationIdRepublishV16, {
      readySource: recovered,
      sourceFixture: sourceV13,
      currentWorker: sameMigrationIdRepublishV16,
      observationName: "source-retirement-activation-new-id"
    });
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
    expect(newIdNatural.problems).toEqual([]);
    expect(blocker.problems).toEqual([]);
    expect(republished.problems).toEqual([]);
    expect(recovered.problems).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    try { await blocker?.close(); } finally { await context.close(); }
  }
});
