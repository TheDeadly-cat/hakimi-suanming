import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve(import.meta.dirname, "../public");

describe("PWA static contract", () => {
  it("先执行无副作用的数据清点，再按结果加载普通入口或独立只读救援入口", async () => {
    const html = await readFile(path.resolve(import.meta.dirname, "../index.html"), "utf8");
    const bootstrap = await readFile(path.resolve(import.meta.dirname, "bootstrap.ts"), "utf8");
    const recoveryEntry = await readFile(path.resolve(import.meta.dirname, "recovery-main.tsx"), "utf8");

    expect(html).toContain('src="/src/bootstrap.ts"');
    expect(html).not.toContain('src="/src/main.tsx"');
    expect(bootstrap).toContain("inspectPrebootRecoveryState");
    expect(bootstrap).toContain('state.kind === "normal"');
    expect(bootstrap).toContain('import("./main")');
    expect(bootstrap).toContain('import("./recovery-main")');
    expect(bootstrap.indexOf("inspectPrebootRecoveryState")).toBeLessThan(
      bootstrap.indexOf('import("./main")')
    );
    expect(recoveryEntry).toContain("captureOrphanedV13Backup");
    expect(recoveryEntry).not.toContain('register("/sw.js"');
    expect(recoveryEntry).not.toContain("ReleaseDatabaseCoordinator");
    expect(recoveryEntry).not.toContain('import "./main"');
  });

  it("manifest 声明 standalone 与两种标准图标", async () => {
    const manifest = JSON.parse(await readFile(path.join(publicDir, "manifest.webmanifest"), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("zh-CN");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("192x192");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("512x512");
  });

  it("Service Worker 为导航提供应用壳离线回退", async () => {
    const worker = await readFile(path.join(publicDir, "sw.js"), "utf8");
    expect(worker).toContain("const BUILD_ASSETS = [];");
    expect(worker).toContain("...BUILD_ASSETS");
    expect(worker).toContain("STATIC_PATHS");
    expect(worker).toContain("clientCacheNames");
    expect(worker).toContain("matchRetainedGenerationResource");
    expect(worker).toContain("ignoreVary: true");
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('!url.pathname.startsWith("/assets/")');
    expect(worker).toContain("return fetch(event.request)");
    const confirmedShellLookup = worker.indexOf('const currentShell = await matchCurrentCache("/")');
    const navigationNetworkFetch = worker.indexOf("const response = await fetch(request)", confirmedShellLookup);
    expect(confirmedShellLookup).toBeGreaterThan(-1);
    expect(navigationNetworkFetch).toBeGreaterThan(confirmedShellLookup);
  });

  it("页面与 worker 使用同一构建号完成显式启动确认", async () => {
    const worker = await readFile(path.join(publicDir, "sw.js"), "utf8");
    const entry = await readFile(path.resolve(import.meta.dirname, "main.tsx"), "utf8");
    const app = await readFile(path.resolve(import.meta.dirname, "app.tsx"), "utf8");
    const releaseCoordinator = await readFile(
      path.resolve(import.meta.dirname, "lib/release-database-coordinator.ts"),
      "utf8"
    );
    const viteConfig = await readFile(path.resolve(import.meta.dirname, "../vite.config.ts"), "utf8");
    const releaseProtocol = await readFile(path.resolve(import.meta.dirname, "../release-protocol.ts"), "utf8");
    const verifyStorageStart = entry.indexOf("async function verifyStorage");
    const verifyStorageEnd = entry.indexOf("const BOOT_SMOKE_INPUT", verifyStorageStart);

    expect(verifyStorageStart).toBeGreaterThan(-1);
    expect(verifyStorageEnd).toBeGreaterThan(verifyStorageStart);
    const verifyStorageSource = entry.slice(verifyStorageStart, verifyStorageEnd);

    expect(worker).toContain('message?.type !== "BOOT_OK"');
    expect(worker).toContain('message?.type === "GET_BUILD_VERSION"');
    expect(worker).toContain('type: "BUILD_VERSION"');
    expect(worker).toContain('message?.type === "SW_AB_RUNTIME_CHALLENGE_V1"');
    expect(worker).toContain('type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1"');
    expect(worker).toContain("sourceClientId");
    expect(worker).toContain('message?.type === "ACTIVATE_INSTALLED_GENERATION"');
    expect(worker).toContain('message?.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1"');
    expect(worker).toContain('message?.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"');
    expect(worker).toContain('type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1"');
    expect(worker).toContain("freezeAllControllerTakeoverClients");
    expect(worker).toContain("controllerTakeoverHoldingResponse");
    expect(worker).toContain("CONTROLLER_TAKEOVER_HOLD_URL");
    expect(worker).toContain("persistControllerTakeoverNavigationHold");
    expect(worker).toContain("finalizeControllerTakeoverSafeNavigation");
    expect(worker).toContain('"TAKEOVER_SESSION_BUSY"');
    expect(worker).toContain('"TAKEOVER_HOLD_PRESENT"');
    expect(worker).toContain('"TAKEOVER_HOLD_STATUS_UNKNOWN"');
    expect(worker).toContain('"TAKEOVER_HOLD_PERSIST_FAILED"');
    expect(worker).toContain("CONTROLLER_TAKEOVER_ACK_REASON_CODES");
    expect(worker).toContain("fixedControllerTakeoverFailureReason");
    expect(worker).not.toContain(
      'let failureReason = reason instanceof Error ? reason.message : "TAKEOVER_PREPARATION_FAILED"'
    );
    expect(worker).toContain('knownRejected.name = "WaitingCommitKnownRejectedError"');
    expect(worker).toContain("knownRejectedWaitingCommitErrors.add(knownRejected)");
    expect(worker).toContain("knownRejectedWaitingCommitErrors.has(reason)");
    expect(worker).toContain('type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1"');
    expect(worker).toContain("completedMigrationResolutionReceipt = {");
    expect(worker).toContain('nack("RESOLUTION_IN_PROGRESS")');
    expect(worker).toContain('reason: "CONTROL_STATE_UNVERIFIED"');
    expect(worker).toContain('reason: "REQUEST_ID_REUSED"');
    expect(worker).toContain('reason: "RESOLUTION_SUPERSEDED"');
    expect(worker).toContain("session.resolutionEpoch += 1");
    expect(worker).toContain("message.requestId.length <= 128");
    expect(worker).toContain("const CONTROLLER_TAKEOVER_CLIENT_TIMEOUT_MS = 15_000");
    expect(worker).toContain('session.holdPersistencePromise = persistControllerTakeoverNavigationHold(session)');
    expect(worker).toContain("await session.holdPersistencePromise;");
    expect(worker).toContain("pending?.resolveLifetime?.()");
    expect(worker).toContain("return pending.lifetimePromise;");
    expect(worker).toContain("event.waitUntil(prepareInstalledGenerationActivation(event, message))");
    expect(worker).not.toContain('reason.name === "WaitingCommitKnownRejectedError"');
    expect(worker).toContain("releaseControllerTakeoverHoldingDocuments");
    expect(worker).toContain("return descriptorsEqual(source, target);");
    expect(worker).toContain('matchAll({ type: "window", includeUncontrolled: true })');
    expect(worker).toContain("message.buildVersion === CACHE_VERSION");
    expect(worker).toContain("bindConfirmedPreviousClient");
    expect(entry).toContain('meta[name="hakimi-build-version"]');
    expect(entry).toContain("CURRENT_RELEASE_DATABASE");
    expect(entry).toContain("dbGeneration");
    expect(entry).toContain("dbSchemaVersion");
    expect(entry).toContain("migrationReceiptDigest");
    expect(entry).toContain('type: "BOOT_OK"');
    expect(entry).toContain('.register("/sw.js", { updateViaCache: "none" })');
    expect(entry).toContain('document.readyState === "complete"');
    expect(entry).toContain("startServiceWorkerLifecycle();");
    expect(entry).toContain('window.addEventListener("load", startServiceWorkerLifecycle, { once: true })');
    expect(entry).toContain("registration.update()");
    expect(entry).toContain("activationWindowDeadline");
    expect(entry).toContain("const promoteWaiting = () =>");
    expect(entry).toContain('installing.addEventListener("statechange", promoteWhenInstalled)');
    expect(entry).toContain('type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1"');
    expect(entry).toContain('message?.type === "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1"');
    expect(entry).toContain("drainControllerTakeoverWrites");
    expect(entry).toContain("controllerTakeoverWriteFence: releaseControllerTakeoverWriteLatch.facade");
    expect(entry).not.toContain('currentWaiting.postMessage({ type: "ACTIVATE_INSTALLED_GENERATION" })');
    const takeoverFreezeHandlerStart = entry.indexOf(
      'if (message?.type === "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1")'
    );
    const takeoverFreezeLatch = entry.indexOf(
      'releaseControllerTakeoverWriteLatch.latch("pre_activation_freeze")',
      takeoverFreezeHandlerStart
    );
    const takeoverFreezeParse = entry.indexOf(
      "parseExactReleaseDatabaseDescriptor(message.sourceRelease)",
      takeoverFreezeHandlerStart
    );
    const takeoverFreezeImport = entry.indexOf(
      'await import("@hakimi/storage")',
      takeoverFreezeHandlerStart
    );
    const takeoverCoordinatorFreeze = entry.indexOf(
      "await releaseDatabaseCoordinator.freezeForControllerTakeover()",
      takeoverFreezeHandlerStart
    );
    const takeoverFreezeDrain = entry.indexOf(
      "drainControllerTakeoverWrites()",
      takeoverFreezeHandlerStart
    );
    expect(takeoverFreezeLatch).toBeGreaterThan(takeoverFreezeHandlerStart);
    expect(takeoverFreezeParse).toBeGreaterThan(takeoverFreezeLatch);
    expect(takeoverCoordinatorFreeze).toBeGreaterThan(takeoverFreezeParse);
    expect(takeoverFreezeImport).toBeGreaterThan(takeoverFreezeLatch);
    expect(takeoverFreezeImport).toBeGreaterThan(takeoverCoordinatorFreeze);
    expect(takeoverFreezeDrain).toBeGreaterThan(takeoverFreezeImport);
    expect(entry).toContain("existing?.requestId === message.requestId");
    expect(entry).toContain("createControllerTakeoverScheduler<");
    expect(entry).toContain("takeoverScheduler.promoteWaiting()");
    expect(entry).toContain('takeoverScheduler.close(reasonCode)');
    expect(entry).toContain('closeControllerTakeoverPromotion?.("CONTROLLER_CHANGED_AFTER_DISPATCH")');
    expect(entry).not.toContain("activationAttemptStates = new WeakMap");
    expect(entry).not.toContain("activationRetryTimers = new WeakMap");
    expect(entry).not.toContain("activeActivationWorker");
    expect(entry).toContain("resolutionMatchesFrozenMigration");
    expect(entry).toContain("frozenMigration.requestId === message.requestId");
    expect(entry).toContain("frozenMigration.sourceController === sourceController");
    expect(entry).toContain("event.source === current.sourceController");
    expect(releaseCoordinator).toContain("SOURCE_RESOLUTION_MESSAGE_TIMEOUT_MS = 3_000");
    expect(releaseCoordinator).toContain('response.type !== "DATABASE_MIGRATION_RESOLUTION_ACK_V1"');
    expect(releaseCoordinator).toContain(
      "evidence.committedReceiptDigest !== this.committedState.receiptDigest"
    );
    expect(releaseCoordinator).toContain("() => this.acknowledgeServiceWorkerCommitOnce()");
    expect(releaseCoordinator).toContain("failureJournalTransitionPromise");
    const resolutionHandlerStart = worker.indexOf("async function broadcastMigrationResolution(event, message)");
    const resolutionReceipt = worker.indexOf(
      "completedMigrationResolutionReceipt = {",
      resolutionHandlerStart
    );
    const resolutionAckDispatch = worker.indexOf(
      "if (postMigrationResolutionAck(responsePort, acknowledgement))",
      resolutionReceipt
    );
    const resolutionSessionClear = worker.indexOf(
      "clearClientFreezeSession(session)",
      resolutionAckDispatch
    );
    expect(resolutionHandlerStart).toBeGreaterThan(-1);
    expect(resolutionReceipt).toBeGreaterThan(resolutionHandlerStart);
    expect(resolutionAckDispatch).toBeGreaterThan(resolutionReceipt);
    expect(resolutionSessionClear).toBeGreaterThan(resolutionAckDispatch);
    const resolutionBroadcastStart = worker.indexOf(
      "async function broadcastMigrationResolutionToClientIds"
    );
    const resolutionClientEnumeration = worker.indexOf(
      'self.clients.matchAll({ type: "window", includeUncontrolled: false })',
      resolutionBroadcastStart
    );
    const resolutionPointerRead = worker.indexOf(
      "const committed = await readCommittedReleaseState()",
      resolutionBroadcastStart
    );
    const resolutionDispatchLoop = worker.indexOf(
      "for (const client of matchedClients)",
      resolutionPointerRead
    );
    expect(resolutionClientEnumeration).toBeGreaterThan(resolutionBroadcastStart);
    expect(resolutionPointerRead).toBeGreaterThan(resolutionClientEnumeration);
    expect(resolutionDispatchLoop).toBeGreaterThan(resolutionPointerRead);
    const takeoverCoordinatorStart = worker.indexOf(
      "async function prepareControllerTakeoverAndActivateWaiting"
    );
    const firstClientFreeze = worker.indexOf(
      "await freezeAllControllerTakeoverClients(session)",
      takeoverCoordinatorStart
    );
    const persistentHold = worker.indexOf(
      "session.holdPersistencePromise = persistControllerTakeoverNavigationHold(session)",
      firstClientFreeze
    );
    const finalClientFreeze = worker.indexOf(
      "await freezeAllControllerTakeoverClients(session)",
      firstClientFreeze + 1
    );
    const waitingCommit = worker.indexOf(
      "const activation = commitWaitingActivation(waitingWorker, session)",
      finalClientFreeze
    );
    expect(firstClientFreeze).toBeGreaterThan(takeoverCoordinatorStart);
    expect(persistentHold).toBeGreaterThan(firstClientFreeze);
    expect(finalClientFreeze).toBeGreaterThan(persistentHold);
    expect(waitingCommit).toBeGreaterThan(finalClientFreeze);
    const takeoverHoldingStart = worker.indexOf("function controllerTakeoverHoldingResponse");
    const takeoverHoldingEnd = worker.indexOf(
      "async function currentBuildHasPersistentControllerTakeoverHold",
      takeoverHoldingStart
    );
    const takeoverHoldingSource = worker.slice(takeoverHoldingStart, takeoverHoldingEnd);
    expect(takeoverHoldingSource).toContain("event.source!==controller");
    expect(takeoverHoldingSource).toContain("exactRelease(message.sourceRelease)");
    expect(takeoverHoldingSource).toContain("exactRelease(message.targetRelease)");
    expect(takeoverHoldingSource).toContain("FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_ACK_V1");
    expect(takeoverHoldingSource).toContain("RELEASE_CONTROLLER_TAKEOVER_HOLDING_DOCUMENT_V1");
    expect(takeoverHoldingSource).toContain("controllerchange");
    expect(takeoverHoldingSource).not.toContain('http-equiv=\"refresh\"');
    const installStart = worker.indexOf('self.addEventListener("install"');
    const activateStart = worker.indexOf('self.addEventListener("activate"');
    const activateEnd = worker.indexOf("function cacheNameForVersion", activateStart);
    expect(worker.slice(installStart, activateStart)).toContain(
      "await cache.delete(CONTROLLER_TAKEOVER_HOLD_URL)"
    );
    expect(worker.slice(activateStart, activateEnd)).toContain(
      "cacheName !== CACHE_NAME"
    );
    expect(worker.slice(activateStart, activateEnd)).toContain(
      "await cache.delete(CONTROLLER_TAKEOVER_HOLD_URL)"
    );
    const controllerChangeStart = entry.indexOf('navigator.serviceWorker.addEventListener("controllerchange"');
    const controllerChangeClose = entry.indexOf(
      'closeControllerTakeoverPromotion?.("CONTROLLER_CHANGED_AFTER_DISPATCH")',
      controllerChangeStart
    );
    const controllerChangeLatch = entry.indexOf(
      'releaseControllerTakeoverWriteLatch.latch("controller_changed")',
      controllerChangeStart
    );
    const controllerChangeConfirmation = entry.indexOf(
      "void confirmActiveWorkerBoot()",
      controllerChangeStart
    );
    const promotionCloseStart = entry.indexOf("closeControllerTakeoverPromotion = (reasonCode: string) =>");
    const promotionWindowClear = entry.indexOf(
      "window.clearTimeout(activationWindowTimer)",
      promotionCloseStart
    );
    const promotionSchedulerClose = entry.indexOf(
      "takeoverScheduler.close(reasonCode)",
      promotionCloseStart
    );
    expect(controllerChangeClose).toBeGreaterThan(controllerChangeStart);
    expect(controllerChangeClose).toBeLessThan(controllerChangeLatch);
    expect(controllerChangeLatch).toBeGreaterThan(controllerChangeStart);
    expect(controllerChangeConfirmation).toBeGreaterThan(controllerChangeLatch);
    expect(promotionWindowClear).toBeGreaterThan(promotionCloseStart);
    expect(promotionSchedulerClose).toBeGreaterThan(promotionWindowClear);
    expect(entry).toContain("Date.now() + 10_000");
    expect(entry.indexOf("activationPromotionEnabled = true;")).toBeGreaterThan(
      entry.indexOf("await confirmActiveWorkerBoot();")
    );
    expect(entry).toContain("swUpdateChecked");
    expect(entry).toContain("runAppBootReadiness");
    expect(entry).toContain("verifyStorage");
    expect(entry).toContain("CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageTables");
    expect(entry).toContain("CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageIndexes");
    expect(releaseProtocol).toContain('"candidateSets"');
    expect(releaseProtocol).toContain('"knowledgeDocuments"');
    expect(releaseProtocol).toContain('"mutationState"');
    expect(
      verifyStorageSource.match(/knowledgeRepository\.verifyLocalKnowledgeIntegritySnapshot\(\)/gu) ?? []
    ).toHaveLength(1);
    expect(verifyStorageSource).not.toContain("knowledgeRepository.listDocuments()");
    expect(verifyStorageSource).not.toContain("knowledgeRepository.listSourceRights()");
    expect(verifyStorageSource).not.toContain("knowledgeRepository.listCitations()");
    const databaseOpen = verifyStorageSource.indexOf("await caseRepository.database.open();");
    const requiredTableChecks = verifyStorageSource.indexOf(
      "CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageTables"
    );
    const requiredIndexChecks = verifyStorageSource.indexOf(
      "CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageIndexes"
    );
    const knowledgeIntegrityProbe = verifyStorageSource.indexOf(
      "await knowledgeRepository.verifyLocalKnowledgeIntegritySnapshot();"
    );
    const migrationPhaseReady = verifyStorageSource.indexOf(
      "document.documentElement.dataset.dbMigrationPhase = shadowDatabaseRelease"
    );
    expect(databaseOpen).toBeGreaterThan(-1);
    expect(requiredTableChecks).toBeGreaterThan(databaseOpen);
    expect(requiredIndexChecks).toBeGreaterThan(requiredTableChecks);
    expect(knowledgeIntegrityProbe).toBeGreaterThan(requiredIndexChecks);
    expect(migrationPhaseReady).toBeGreaterThan(knowledgeIntegrityProbe);
    expect(entry).toContain("verifyCalculationCore");
    expect(entry).toContain("bootRouteKey");
    expect(entry).toContain("verifyResolvedRoute");
    expect(app).toContain("RouteReadySignal");
    expect(viteConfig).toContain('meta name="hakimi-build-version"');
    expect(viteConfig).toContain('meta name="hakimi-release-database"');
    expect(viteConfig).toContain('meta name="hakimi-release-storage-manifest"');
    expect(viteConfig).toContain('meta name="hakimi-release-storage-manifest-digest"');
    expect(viteConfig).toContain('meta name="hakimi-release-evidence-id"');
    expect(viteConfig).toContain("__RELEASE_DATABASE_DESCRIPTOR__");
    expect(viteConfig).toContain("__BRIDGE_RELEASE_DATABASE_DESCRIPTOR__");
    expect(viteConfig).toContain("computeOfflineCacheVersion");
    expect(viteConfig).toContain("htmlDocument: releaseAwareIndex");
    expect(viteConfig).toContain("auditBundledKnowledgeDirectory");
    expect(viteConfig).toContain("hakimi-bundled-knowledge-rights-gate");
  });
});
