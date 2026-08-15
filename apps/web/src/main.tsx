import type { BirthInput } from "@hakimi/contracts";
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App, preloadAppRoute } from "./app";
import {
  type AppBootFailure,
  type AppBootFailureSource
} from "./lib/app-boot-failure";
import { AppBootFailureLatch, type LatchedAppBootFailure } from "./lib/app-boot-failure-latch";
import { runAppBootReadiness, type AppBootReadinessResult } from "./lib/app-boot-readiness";
import { CURRENT_RELEASE_DATABASE } from "./lib/current-release";
import {
  ReleaseDatabaseCoordinator,
  type ReleaseBootConfirmation
} from "./lib/release-database-coordinator";
import { installControlledWindowDraftCleanupHandler } from "./lib/local-user-data-cleanup";
import { setAppBootReadyState } from "./lib/app-boot-ready";
import {
  bootAcknowledgementMatchesPageIdentity,
  shouldReloadUnboundPreviousGeneration,
  type ServiceWorkerBootAcknowledgement
} from "./lib/service-worker-boot-ack";
import { isShadowDatabaseRelease } from "../release-protocol";
import "./styles.css";

const pageBuildVersion = document.querySelector<HTMLMetaElement>('meta[name="hakimi-build-version"]')?.content;
const shadowDatabaseRelease = isShadowDatabaseRelease(CURRENT_RELEASE_DATABASE);
globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
  databaseName: CURRENT_RELEASE_DATABASE.databaseName,
  targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
  releaseWritesLocked: shadowDatabaseRelease
};
document.documentElement.dataset.dbGeneration = CURRENT_RELEASE_DATABASE.dbGeneration;
document.documentElement.dataset.dbSchema = String(CURRENT_RELEASE_DATABASE.targetSchema);
document.documentElement.dataset.dbMigrationPhase = shadowDatabaseRelease ? "pending" : "bridge";
// Pages may canonicalize shareable URLs after they mount. Mark the whole
// readiness window explicitly so those effects cannot change the route that
// the production boot verifier is still proving.
setAppBootReadyState(false);
const releaseDatabaseCoordinator = new ReleaseDatabaseCoordinator(
  CURRENT_RELEASE_DATABASE,
  pageBuildVersion ?? "development"
);
let releaseBootConfirmation: ReleaseBootConfirmation | null = null;
let resolveReleaseInteraction: (() => void) | undefined;
let rejectReleaseInteraction: ((reason?: unknown) => void) | undefined;
const releaseInteractionReady = new Promise<void>((resolve, reject) => {
  resolveReleaseInteraction = resolve;
  rejectReleaseInteraction = reject;
});
void releaseInteractionReady.catch(() => undefined);
const bootRoutePathname = window.location.pathname;
const bootRouteKey = `${window.location.pathname}${window.location.search}`;
let bootFailed = false;
let appBootConfirmed = false;
let bootConfirmationSent = false;
const bootFailureLatch = new AppBootFailureLatch();
const runtimeFailureLatch = new AppBootFailureLatch();
let resolveRouteReady: ((routeKey: string) => void) | undefined;
let rejectRouteReady: ((reason?: unknown) => void) | undefined;
let routeReadySettled = false;
const resolvedRouteReady = new Promise<string>((resolve, reject) => {
  resolveRouteReady = resolve;
  rejectRouteReady = reject;
});
void resolvedRouteReady.catch(() => undefined);
let resolveBootPreflightReady: (() => void) | undefined;
const bootPreflightReady = new Promise<void>((resolve) => {
  resolveBootPreflightReady = resolve;
});

function markRouteReady(routeKey: string) {
  if (routeReadySettled) return;
  routeReadySettled = true;
  resolveRouteReady?.(routeKey);
}

function failRouteReady(reason: unknown) {
  if (routeReadySettled) return;
  routeReadySettled = true;
  rejectRouteReady?.(reason);
}

function markBootPreflightReady() {
  assertBootRouteUnchanged();
  resolveBootPreflightReady?.();
}

function assertBootRouteUnchanged() {
  const currentRouteKey = `${window.location.pathname}${window.location.search}`;
  if (currentRouteKey !== bootRouteKey) {
    throw new Error("启动检查期间地址已变化；必须重新载入并按同一路由重新完成检查。");
  }
}

function reportBootFailure(source: AppBootFailureSource, reason: unknown): LatchedAppBootFailure {
  bootFailed = true;
  appBootConfirmed = false;
  setAppBootReadyState(false);
  const failure = bootFailureLatch.report(source, reason);
  failRouteReady(failure.error);
  return failure;
}

window.addEventListener("error", (event) => {
  const reason = event.error ?? new Error(event.message || "window error");
  if (bootConfirmationSent) runtimeFailureLatch.report("window_error", reason);
  else reportBootFailure("window_error", reason);
});
window.addEventListener("unhandledrejection", (event) => {
  if (bootConfirmationSent) runtimeFailureLatch.report("unhandled_rejection", event.reason);
  else reportBootFailure("unhandled_rejection", event.reason);
});

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function verifyStorage(): Promise<void> {
  try {
    await releaseDatabaseCoordinator.prepareStorage();
    const { caseRepository, knowledgeRepository } = await import("@hakimi/storage");
    await caseRepository.database.open();
    if (
      caseRepository.database.name !== CURRENT_RELEASE_DATABASE.databaseName ||
      caseRepository.database.verno !== CURRENT_RELEASE_DATABASE.targetSchema
    ) {
      throw new Error(
        `本地数据库代际不匹配：期望 ${CURRENT_RELEASE_DATABASE.databaseName}@${CURRENT_RELEASE_DATABASE.targetSchema}。`
      );
    }
    const requiredStorageTables = [
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "savedViews",
      "knowledgeDocuments",
      "sourceRights",
      "citations",
      "attachments",
      "researcherProfiles",
      "appSettings",
      "ruleRegistry",
      "tzdbMigrationReceipts",
      "eventTimeMigrationReceipts",
      "birthFingerprints"
    ];
    if (CURRENT_RELEASE_DATABASE.targetSchema >= 15) {
      requiredStorageTables.push("revisionCalculationReceipts");
    }
    if (CURRENT_RELEASE_DATABASE.targetSchema >= 16) {
      requiredStorageTables.push("mutationState");
    }
    await Promise.all(requiredStorageTables.map(
      (tableName) => caseRepository.database.table(tableName).limit(1).primaryKeys()
    ));
    if (CURRENT_RELEASE_DATABASE.targetSchema >= 14) {
      for (const tableName of ["researchNotes", "events"] as const) {
        const index = caseRepository.database
          .table(tableName)
          .schema.indexes.find((candidate) => candidate.name === "[caseId+updatedAt]");
        if (
          !index ||
          !index.compound ||
          index.unique ||
          index.multi ||
          !Array.isArray(index.keyPath) ||
          index.keyPath.join("\u0000") !== "caseId\u0000updatedAt"
        ) {
          throw new Error(`Dexie v14 缺少 ${tableName} 的 [caseId+updatedAt] 案例活动流索引。`);
        }
      }
    }
    await Promise.all([
      knowledgeRepository.listSourceRights(),
      knowledgeRepository.listCitations()
    ]);
    document.documentElement.dataset.dbMigrationPhase = shadowDatabaseRelease ? "verified" : "bridge_ready";
  } catch (cause) {
    await releaseDatabaseCoordinator.failPreparedMigration(cause).catch(() => undefined);
    throw cause;
  }
}

const BOOT_SMOKE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "2000-01-01",
  time: "12:00",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "unspecified",
  lunarLeapMonth: false,
  location: { label: "启动自检", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "仅验证本地计算模块可执行，不保存为案例。"
};

const EXPECTED_BOOT_RESULT_HASH = "fc1f9b02322e72cbae2b6bab21d295aadff45ae820ac49575c0e323016f2c6b1";
const EXPECTED_TZDB_DATA_SHA256 = "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81";
// The shadow boot budget must cover a first-time v13→v16 materialization plus
// full audit of a 10,000-case library (documented at 35-43 s on the fixed
// workstation) and the bounded wait for a peer page that is already running
// the same migration. 300 s is still a fail-closed cap, not an open loop.
const SHADOW_DATABASE_BOOT_TIMEOUT_MS = 300_000;

async function verifyCalculationCore(): Promise<void> {
  const [{ calculateChart }, { WORKING_DEFAULT_RULE_PROFILE }, { RUNTIME_TIME_ZONE_DATABASE }] = await Promise.all([
    import("@hakimi/bazi-core"),
    import("@hakimi/rule-profiles"),
    import("@hakimi/time-core")
  ]);
  const chart = await calculateChart(BOOT_SMOKE_INPUT, WORKING_DEFAULT_RULE_PROFILE);
  if (
    chart.manifest.resultHash !== EXPECTED_BOOT_RESULT_HASH ||
    chart.manifest.tzdbVersion !== RUNTIME_TIME_ZONE_DATABASE.snapshotId ||
    RUNTIME_TIME_ZONE_DATABASE.ianaVersion !== "2026c" ||
    RUNTIME_TIME_ZONE_DATABASE.dataSha256 !== EXPECTED_TZDB_DATA_SHA256 ||
    !chart.facts.pillars.hour.ganZhi
  ) {
    throw new Error("启动自检的命盘摘要或固定 tzdb 身份与发布基线不一致。" );
  }
}

const baseAppBootReadinessResult = runAppBootReadiness({
  preloadResolvedRoute: () => preloadAppRoute(bootRoutePathname),
  waitForResolvedRoute: async () => {
    const resolvedRouteKey = await resolvedRouteReady;
    assertBootRouteUnchanged();
    if (resolvedRouteKey !== bootRouteKey) {
      throw new Error("完成渲染的路由与启动检查绑定的路由不一致。");
    }
  },
  verifyStorage,
  verifyCalculationCore,
  notifyPreflightReady: markBootPreflightReady,
  notifyFailure: (failure) => {
    reportBootFailure(failure.source, failure.error);
  },
  waitForPaint,
  verifyResolvedRoute: async () => assertBootRouteUnchanged(),
  timeoutMs: shadowDatabaseRelease ? SHADOW_DATABASE_BOOT_TIMEOUT_MS : undefined
});

const appBootReadinessResult = baseAppBootReadinessResult.then(async (result): Promise<AppBootReadinessResult> => {
  if (!result.ready) {
    releaseDatabaseCoordinator.cancelPreparation(result.error);
    return result;
  }
  try {
    // Cache Storage and IndexedDB cannot share one browser transaction. Persist
    // the verified DB pointer first; the worker will independently re-read it
    // before acknowledging and confirming this application shell.
    releaseBootConfirmation = await releaseDatabaseCoordinator.commitForBoot();
    return result;
  } catch (reason) {
    await releaseDatabaseCoordinator.failPreparedMigration(reason).catch(() => undefined);
    return {
      ready: false,
      source: "storage",
      storageReady: true,
      error: reason instanceof Error ? reason : new Error("数据库代际提交失败。")
    };
  }
});

const appBootReadiness = appBootReadinessResult.then((result) => {
  if (!result.ready) {
    reportBootFailure(result.source, result.error);
    console.error("应用启动自检失败", result.error);
  }
  appBootConfirmed = result.ready && !bootFailed;
  setAppBootReadyState(appBootConfirmed);
  return appBootConfirmed;
});

function RootApp({
  preflightReady,
  readiness,
  releaseConfirmationReady
}: {
  preflightReady: Promise<void>;
  readiness: Promise<AppBootReadinessResult>;
  releaseConfirmationReady?: Promise<void>;
}) {
  const [routeMountAllowed, setRouteMountAllowed] = useState(false);
  const [bootPending, setBootPending] = useState(true);
  const [bootFailure, setBootFailure] = useState<AppBootFailure | null>(null);
  const [runtimeFailure, setRuntimeFailure] = useState<LatchedAppBootFailure | null>(null);
  const storageReadyRef = useRef(false);
  useEffect(() => bootFailureLatch.subscribe((failure) => {
    setRouteMountAllowed(false);
    setBootPending(false);
    setBootFailure((current) => ({
      storageReady: current?.storageReady || storageReadyRef.current,
      source: current?.source ?? failure.source,
      error: current?.error ?? failure.error
    }));
  }), []);
  useEffect(() => runtimeFailureLatch.subscribe((failure) => {
    setRuntimeFailure((current) => current ?? failure);
  }), []);
  useEffect(() => {
    let active = true;
    void preflightReady.then(() => {
      if (!active) return;
      if (bootFailureLatch.current) return;
      storageReadyRef.current = true;
      setRouteMountAllowed(true);
    });
    return () => { active = false; };
  }, [preflightReady]);
  useEffect(() => {
    let active = true;
    void readiness.then(async (result) => {
      if (!active) return;
      storageReadyRef.current = result.storageReady;
      if (!result.ready) {
        setBootPending(false);
        const failure = reportBootFailure(result.source, result.error);
        setBootFailure((current) => ({
          storageReady: current?.storageReady || result.storageReady,
          source: current?.source ?? failure.source,
          error: current?.error ?? failure.error
        }));
        return;
      }
      if (releaseConfirmationReady) {
        try {
          await releaseConfirmationReady;
        } catch (reason) {
          if (!active) return;
          const failure = reportBootFailure(
            "storage",
            reason instanceof Error ? reason : new Error("离线版本未确认数据库代际。")
          );
          setBootPending(false);
          setBootFailure({ storageReady: true, source: failure.source, error: failure.error });
          return;
        }
      }
      if (!active) return;
      setBootPending(false);
      const latchedFailure = bootFailureLatch.current;
      if (latchedFailure) {
        setBootFailure((current) => ({
          storageReady: true,
          source: current?.source ?? latchedFailure.source,
          error: current?.error ?? latchedFailure.error
        }));
      }
    });
    return () => { active = false; };
  }, [readiness]);
  const handleRouteFailure = useCallback((error: Error): "boot" | "runtime" => {
    if (bootConfirmationSent) {
      runtimeFailureLatch.report("route", error);
      return "runtime";
    }
    reportBootFailure("route", error);
    return "boot";
  }, []);
  return <App
    onRouteReady={markRouteReady}
    routeMountAllowed={routeMountAllowed}
    bootPending={bootPending}
    bootFailure={bootFailure}
    runtimeFailure={runtimeFailure}
    onRouteFailure={handleRouteFailure}
  />;
}

const root = document.getElementById("root");
if (!root) throw new Error("缺少应用根节点");

createRoot(root).render(
  <StrictMode>
    <RootApp
      preflightReady={bootPreflightReady}
      readiness={appBootReadinessResult}
      releaseConfirmationReady={shadowDatabaseRelease ? releaseInteractionReady : undefined}
    />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  installControlledWindowDraftCleanupHandler();
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  let frozenMigration: {
    migrationId: string;
    targetGeneration: string;
    targetDatabaseName: string;
    targetSchema: number;
    timer: number | null;
  } | null = null;

  const reopenSourceDatabase = async () => {
    const { caseRepository } = await import("@hakimi/storage");
    caseRepository.database.unlockReleaseWrites();
    if (!caseRepository.database.isOpen()) await caseRepository.database.open();
    document.documentElement.dataset.dbSourceWriteFrozen = "false";
  };

  const scheduleFrozenMigrationRecovery = () => {
    if (!frozenMigration) return;
    if (frozenMigration.timer !== null) window.clearTimeout(frozenMigration.timer);
    frozenMigration.timer = window.setTimeout(async () => {
      const current = frozenMigration;
      if (!current) return;
      try {
        const { DatabaseGenerationController } = await import("@hakimi/storage");
        const controller = new DatabaseGenerationController();
        try {
          const [state, journal] = await Promise.all([
            controller.readCommittedGeneration(),
            controller.readMigration(current.migrationId)
          ]);
          if (
            state?.committedGeneration === current.targetGeneration &&
            state.committedDatabaseName === current.targetDatabaseName &&
            state.committedSchema === current.targetSchema
          ) {
            window.location.reload();
            return;
          }
          const journalAge = journal ? Date.now() - Date.parse(journal.updatedAt) : Number.POSITIVE_INFINITY;
          if (
            journal &&
            !["failed", "committed"].includes(journal.phase) &&
            Number.isFinite(journalAge) &&
            journalAge < 5 * 60_000
          ) {
            scheduleFrozenMigrationRecovery();
            return;
          }
        } finally {
          controller.close();
        }
        frozenMigration = null;
        await reopenSourceDatabase();
      } catch {
        scheduleFrozenMigrationRecovery();
      }
    }, 30_000);
  };

  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{
    type?: unknown;
    requestId?: unknown;
    migrationId?: unknown;
    sourceGeneration?: unknown;
    sourceDatabaseName?: unknown;
    sourceSchema?: unknown;
    targetGeneration?: unknown;
    targetDatabaseName?: unknown;
    targetSchema?: unknown;
  }>) => {
    const message = event.data;
    if (message?.type === "FREEZE_DATABASE_WRITES") {
      const responsePort = event.ports[0];
      void (async () => {
        const isSource =
          message.sourceGeneration === CURRENT_RELEASE_DATABASE.dbGeneration &&
          message.sourceDatabaseName === CURRENT_RELEASE_DATABASE.databaseName &&
          message.sourceSchema === CURRENT_RELEASE_DATABASE.targetSchema;
        if (!isSource) {
          responsePort?.postMessage({
            type: "DATABASE_WRITES_FROZEN",
            requestId: message.requestId,
            accepted: true,
            reason: "CLIENT_NOT_SOURCE"
          });
          return;
        }
        try {
          if (
            typeof message.migrationId !== "string" ||
            typeof message.targetGeneration !== "string" ||
            typeof message.targetDatabaseName !== "string" ||
            !Number.isSafeInteger(message.targetSchema)
          ) {
            throw new Error("旧标签页收到的迁移冻结消息无效。");
          }
          const { caseRepository } = await import("@hakimi/storage");
          caseRepository.database.lockReleaseWrites();
          // Close the current connection to create a clean snapshot boundary,
          // but keep Dexie's auto-open path enabled. Any later repository write
          // reaches the DBCore release lock and fails with the explicit
          // ReleaseDatabaseWriteLockedError instead of a generic closed-DB error.
          caseRepository.database.close({ disableAutoOpen: false });
          frozenMigration = {
            migrationId: message.migrationId,
            targetGeneration: message.targetGeneration,
            targetDatabaseName: message.targetDatabaseName,
            targetSchema: Number(message.targetSchema),
            timer: null
          };
          document.documentElement.dataset.dbSourceWriteFrozen = "true";
          scheduleFrozenMigrationRecovery();
          responsePort?.postMessage({
            type: "DATABASE_WRITES_FROZEN",
            requestId: message.requestId,
            accepted: true,
            reason: "SOURCE_CLOSED"
          });
        } catch (reason) {
          responsePort?.postMessage({
            type: "DATABASE_WRITES_FROZEN",
            requestId: message.requestId,
            accepted: false,
            reason: reason instanceof Error ? reason.name : "FREEZE_FAILED"
          });
        }
      })();
      return;
    }
    if (
      message?.type === "DATABASE_MIGRATION_ABORTED" &&
      typeof message.migrationId === "string" &&
      frozenMigration?.migrationId === message.migrationId
    ) {
      if (frozenMigration.timer !== null) window.clearTimeout(frozenMigration.timer);
      frozenMigration = null;
      void reopenSourceDatabase().catch(() => window.location.reload());
      return;
    }
    if (
      message?.type === "DATABASE_MIGRATION_COMMITTED" &&
      typeof message.migrationId === "string" &&
      frozenMigration?.migrationId === message.migrationId
    ) {
      if (frozenMigration.timer !== null) window.clearTimeout(frozenMigration.timer);
      window.location.reload();
    }
  });

  const startServiceWorkerLifecycle = () => {
    const updateControlState = () => {
      document.documentElement.dataset.swControlled = String(Boolean(navigator.serviceWorker.controller));
    };

    let activeBootConfirmation: Promise<void> | null = null;
    const postBootConfirmation = (
      controller: ServiceWorker,
      confirmation: ReleaseBootConfirmation
    ): Promise<void> => new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        reject(new Error("Service Worker 数据库代际确认超时，请重新载入当前页面。"));
      }, 12_000);
      channel.port1.onmessage = (event: MessageEvent<ServiceWorkerBootAcknowledgement>) => {
        const acknowledgement = event.data;
        window.clearTimeout(timeout);
        channel.port1.close();
        if (
          shouldReloadUnboundPreviousGeneration(
            acknowledgement,
            CURRENT_RELEASE_DATABASE,
            pageBuildVersion,
            confirmation.state.migrationId
          )
        ) {
          document.documentElement.dataset.swGenerationConvergence = "reload";
          reportBootFailure(
            "storage",
            new Error("Service Worker 已接管新数据库代际；当前旧页面将重新载入并安全收敛。")
          );
          window.location.reload();
          return;
        }
        if (
          !bootAcknowledgementMatchesPageIdentity(
            acknowledgement,
            CURRENT_RELEASE_DATABASE,
            pageBuildVersion,
            confirmation.state.migrationId
          ) ||
          acknowledgement.accepted !== true ||
          acknowledgement.reason === "CLIENT_NOT_BOUND_TO_GENERATION"
        ) {
          reject(new Error(`Service Worker 拒绝数据库代际确认：${String(acknowledgement?.reason ?? "INVALID_ACK")}`));
          return;
        }
        resolve();
      };
      document.documentElement.dataset.swBootSignalSent = "true";
      controller.postMessage({
        type: "BOOT_OK",
        buildVersion: pageBuildVersion,
        protocolVersion: CURRENT_RELEASE_DATABASE.protocolVersion,
        dbGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
        dbSchemaVersion: CURRENT_RELEASE_DATABASE.targetSchema,
        migrationId: CURRENT_RELEASE_DATABASE.migrationId,
        committedMigrationId: confirmation.state.migrationId,
        migrationReceiptDigest: confirmation.migrationReceiptDigest
      }, [channel.port2]);
    });

    const confirmActiveWorkerBoot = (): Promise<void> => {
      updateControlState();
      if (bootFailed || !appBootConfirmed || !pageBuildVersion || !releaseBootConfirmation) {
        return Promise.resolve();
      }
      if (bootConfirmationSent) return Promise.resolve();
      if (activeBootConfirmation) return activeBootConfirmation;
      const controller = navigator.serviceWorker.controller;
      if (!controller) return Promise.resolve();
      activeBootConfirmation = postBootConfirmation(controller, releaseBootConfirmation)
        .then(async () => {
          bootConfirmationSent = true;
          await releaseDatabaseCoordinator.acknowledgeServiceWorkerCommit();
          resolveReleaseInteraction?.();
        })
        .catch((reason: unknown) => {
          rejectReleaseInteraction?.(reason);
          reportBootFailure("storage", reason);
          throw reason;
        })
        .finally(() => {
          activeBootConfirmation = null;
        });
      return activeBootConfirmation;
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      void confirmActiveWorkerBoot().catch(() => undefined);
    });
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        document.documentElement.dataset.swRegistered = "true";
        const activationRequested = new WeakSet<ServiceWorker>();
        const observedInstallers = new WeakSet<ServiceWorker>();
        let activationPromotionEnabled = false;
        let activationWindowDeadline = 0;
        let activationWindowTimer: number | null = null;
        const promoteWaiting = () => {
          if (!activationPromotionEnabled) return;
          const currentWaiting = registration.waiting;
          if (currentWaiting?.state !== "installed" || activationRequested.has(currentWaiting)) return;
          activationRequested.add(currentWaiting);
          currentWaiting.postMessage({ type: "ACTIVATE_INSTALLED_GENERATION" });
        };
        const observeInstalling = () => {
          const installing = registration.installing;
          if (!installing || observedInstallers.has(installing)) return;
          observedInstallers.add(installing);
          const promoteWhenInstalled = () => {
            if (installing.state === "installed") promoteWaiting();
          };
          installing.addEventListener("statechange", promoteWhenInstalled);
          promoteWhenInstalled();
        };
        const runActivationWindow = () => {
          observeInstalling();
          if (registration.installing) {
            // 预缓存可能受网络与设备速度影响；安装尚未结束时持续顺延，
            // 让 10 秒宽限从 installing 真正结束后才开始消耗。
            activationWindowDeadline = Math.max(activationWindowDeadline, Date.now() + 10_000);
          }
          promoteWaiting();
          if (Date.now() < activationWindowDeadline) {
            activationWindowTimer = window.setTimeout(runActivationWindow, 50);
          } else {
            activationWindowTimer = null;
          }
        };
        const startActivationWindow = () => {
          if (!activationPromotionEnabled) return;
          // updatefound 与 update() 完成之间可能短暂看不到 installing/waiting。
          // 固定观察窗口不会把这个空档误判成“没有候选代”。
          activationWindowDeadline = Math.max(activationWindowDeadline, Date.now() + 10_000);
          if (activationWindowTimer === null) runActivationWindow();
        };
        const reconcileGenerationCandidates = () => {
          observeInstalling();
          promoteWaiting();
          if (registration.installing || registration.waiting) startActivationWindow();
        };
        registration.addEventListener("updatefound", () => {
          observeInstalling();
          startActivationWindow();
        });
        // Observe an install that began during register(), but do not promote it
        // until this page has passed its own app and BOOT_OK gates.
        observeInstalling();
        const [, bootReady] = await Promise.all([navigator.serviceWorker.ready, appBootReadiness]);
        document.documentElement.dataset.swReady = "true";
        if (!bootReady) return;
        try {
          await confirmActiveWorkerBoot();
        } catch {
          return;
        }
        activationPromotionEnabled = true;
        reconcileGenerationCandidates();

        // Only a page that has confirmed its own build may promote a candidate
        // worker. The new shell then enters its independent one-shot trial boot.
        // 已确认 worker 的导航固定返回本代缓存壳；新 HTML 只能在新 worker
        // install/activate 并接管后进入一次性试运行，避免部署切换窗口混代。
        void registration.update().then(
          () => {
            observeInstalling();
            promoteWaiting();
            startActivationWindow();
            document.documentElement.dataset.swUpdateChecked = "true";
          },
          () => {
            // 离线启动时更新检查失败是预期降级，不影响本代缓存壳继续运行。
            reconcileGenerationCandidates();
            document.documentElement.dataset.swUpdateChecked = "false";
          }
        );

        const cacheNames = await window.caches.keys();
        const cachedRequests = (
          await Promise.all(cacheNames.map(async (cacheName) => window.caches.open(cacheName).then((cache) => cache.keys())))
        ).flat();
        const cachedPaths = cachedRequests.map((request) => new URL(request.url).pathname);
        document.documentElement.dataset.swCacheCount = String(cachedPaths.length);
        document.documentElement.dataset.swHasNewChart = String(cachedPaths.some((pathname) => pathname.includes("/assets/new-chart-page-")));
        document.documentElement.dataset.swHasChart = String(cachedPaths.some((pathname) => pathname.includes("/assets/chart-page-")));
      })
      .catch((error: unknown) => {
        document.documentElement.dataset.swRegistered = "false";
        console.error("Service Worker 注册失败", error);
      });
  };

  // bootstrap.ts performs an asynchronous inventory check before importing
  // this module. The browser load event may therefore have fired already.
  if (document.readyState === "complete") {
    startServiceWorkerLifecycle();
  } else {
    window.addEventListener("load", startServiceWorkerLifecycle, { once: true });
  }
}
