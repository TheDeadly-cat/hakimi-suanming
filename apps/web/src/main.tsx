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
import {
  CURRENT_RELEASE_DATABASE,
  CURRENT_RELEASE_STORAGE_MANIFEST,
  CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST
} from "./lib/current-release";
import {
  ReleaseDatabaseCoordinator,
  ReleaseForwardMigrationActivationFrozenError,
  type ReleaseBootConfirmation
} from "./lib/release-database-coordinator";
import { installControlledWindowDraftCleanupHandler } from "./lib/local-user-data-cleanup";
import { setAppBootReadyState } from "./lib/app-boot-ready";
import {
  bootAcknowledgementMatchesPageIdentity,
  shouldReloadUnboundPreviousGeneration,
  type ServiceWorkerBootAcknowledgement
} from "./lib/service-worker-boot-ack";
import {
  isShadowDatabaseRelease,
  parseReleaseDatabaseDescriptor,
  serializeReleaseStorageManifest,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import {
  createFirstControllerClaimHandoff,
  registerServiceWorkerAfterBootCommit,
  ReleaseControllerTakeoverWriteLatch
} from "./lib/release-controller-takeover-write-fence";
import {
  controllerTakeoverFailureFromNack,
  createControllerTakeoverScheduler,
  type ControllerTakeoverFailure,
  type ControllerTakeoverFailureOutcome
} from "./lib/service-worker-takeover-retry";
import "./styles.css";

const pageBuildVersion = document.querySelector<HTMLMetaElement>('meta[name="hakimi-build-version"]')?.content;
const shadowDatabaseRelease = isShadowDatabaseRelease(CURRENT_RELEASE_DATABASE);
const defaultLegacyDatabaseRelease = CURRENT_RELEASE_DATABASE.dbGeneration === "legacy-v13"
  && CURRENT_RELEASE_DATABASE.targetSchema === 13
  && CURRENT_RELEASE_DATABASE.migrationId === null;
const releaseControllerTakeoverWriteLatch = new ReleaseControllerTakeoverWriteLatch();
globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
  databaseName: CURRENT_RELEASE_DATABASE.databaseName,
  targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
  releaseWritesLocked: shadowDatabaseRelease,
  controllerTakeoverWriteFence: releaseControllerTakeoverWriteLatch.facade
};
document.documentElement.dataset.dbGeneration = CURRENT_RELEASE_DATABASE.dbGeneration;
document.documentElement.dataset.dbSchema = String(CURRENT_RELEASE_DATABASE.targetSchema);
document.documentElement.dataset.dbManifestDigest = CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST ?? "development";
document.documentElement.dataset.dbMigrationPhase = shadowDatabaseRelease ? "pending" : "bridge";
document.documentElement.dataset.dbControllerTakeoverWriteFrozen = "false";
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
type ForwardMigrationActivationFreeze = {
  requestId: string;
  sourceBuildVersion: string;
  targetBuildVersion: string;
  sourceController: ServiceWorker;
  targetRelease: ReleaseDatabaseDescriptor;
  wasBootConfirmed: boolean;
  drain: Promise<void>;
  failed: boolean;
  navigation: Promise<void> | null;
};
let activeForwardMigrationActivationFreeze: ForwardMigrationActivationFreeze | null = null;
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
    if (CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST) {
      const { sha256Hex } = await import("@hakimi/integrity");
      const actualManifestDigest = await sha256Hex(
        serializeReleaseStorageManifest(CURRENT_RELEASE_STORAGE_MANIFEST)
      );
      if (actualManifestDigest !== CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST) {
        throw new Error("发布存储清单摘要与构建注入值不一致。");
      }
    }
    if (
      caseRepository.database.name !== CURRENT_RELEASE_DATABASE.databaseName ||
      caseRepository.database.verno !== CURRENT_RELEASE_DATABASE.targetSchema
    ) {
      throw new Error(
        `本地数据库代际不匹配：期望 ${CURRENT_RELEASE_DATABASE.databaseName}@${CURRENT_RELEASE_DATABASE.targetSchema}。`
      );
    }
    await Promise.all(CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageTables.map(
      (tableName) => caseRepository.database.table(tableName).limit(1).primaryKeys()
    ));
    for (const requirement of CURRENT_RELEASE_STORAGE_MANIFEST.requiredStorageIndexes) {
      const index = caseRepository.database
        .table(requirement.tableName)
        .schema.indexes.find((candidate) => candidate.name === requirement.indexName);
      if (
        !index ||
        index.compound !== requirement.compound ||
        index.unique !== requirement.unique ||
        index.multi !== requirement.multi ||
        !Array.isArray(index.keyPath) ||
        index.keyPath.join("\u0000") !== requirement.keyPath.join("\u0000")
      ) {
        throw new Error(
          `Dexie ${requirement.tableName} 缺少发布清单要求的 ${requirement.indexName} 索引。`
        );
      }
    }
    await knowledgeRepository.verifyLocalKnowledgeIntegritySnapshot();
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

function isBoundedProtocolString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim();
}

function releaseDatabaseDescriptorsEqual(
  left: ReleaseDatabaseDescriptor,
  right: ReleaseDatabaseDescriptor
): boolean {
  return (
    left.protocolVersion === right.protocolVersion &&
    left.dbGeneration === right.dbGeneration &&
    left.databaseName === right.databaseName &&
    left.targetSchema === right.targetSchema &&
    left.minReadableSchema === right.minReadableSchema &&
    left.maxReadableSchema === right.maxReadableSchema &&
    left.migrationId === right.migrationId &&
    left.sourceGeneration === right.sourceGeneration &&
    left.sourceDatabaseName === right.sourceDatabaseName &&
    left.sourceSchema === right.sourceSchema &&
    left.acceptedCommittedMigrationIds.length === right.acceptedCommittedMigrationIds.length &&
    left.acceptedCommittedMigrationIds.every(
      (migrationId, index) => migrationId === right.acceptedCommittedMigrationIds[index]
    )
  );
}

function releaseControllerTakeoverMatchesCurrentPage(target: ReleaseDatabaseDescriptor): boolean {
  // This protocol is only for a new build over the same database descriptor.
  // Cross-Schema releases must keep using the separately governed migration
  // protocol; accepting its source pointer here would bypass that boundary.
  return releaseDatabaseDescriptorsEqual(target, CURRENT_RELEASE_DATABASE);
}

function forwardMigrationActivationMatchesCurrentPage(target: ReleaseDatabaseDescriptor): boolean {
  return defaultLegacyDatabaseRelease
    && isShadowDatabaseRelease(target)
    && target.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion
    && target.targetSchema === 16
    && target.minReadableSchema === 16
    && target.maxReadableSchema === 16
    && target.sourceGeneration === CURRENT_RELEASE_DATABASE.dbGeneration
    && target.sourceDatabaseName === CURRENT_RELEASE_DATABASE.databaseName
    && target.sourceSchema === CURRENT_RELEASE_DATABASE.targetSchema
    && target.dbGeneration !== CURRENT_RELEASE_DATABASE.dbGeneration
    && target.databaseName !== CURRENT_RELEASE_DATABASE.databaseName;
}

function isExpectedForwardMigrationBootStop(reason: unknown): boolean {
  return reason instanceof ReleaseForwardMigrationActivationFrozenError
    && activeForwardMigrationActivationFreeze !== null
    && !activeForwardMigrationActivationFreeze.failed
    && releaseControllerTakeoverWriteLatch.locked;
}

class InstalledGenerationIdentityQueryTimeoutError extends Error {
  constructor() { super("Service Worker 代际身份查询超时。"); }
}

type InstalledGenerationIdentityQueryKind = "installed_identity_v1" | "legacy_same_descriptor";

async function readInstalledGenerationReleaseIdentity(
  worker: ServiceWorker,
  allowLegacySameDescriptorFallback = false
): Promise<{
  buildVersion: string;
  release: ReleaseDatabaseDescriptor;
  queryKind: InstalledGenerationIdentityQueryKind;
}> {
  const query = (queryKind: InstalledGenerationIdentityQueryKind): Promise<{
    buildVersion: string;
    release: ReleaseDatabaseDescriptor;
    queryKind: InstalledGenerationIdentityQueryKind;
  }> => new Promise((resolve, reject) => {
    const requestId = `takeover-${crypto.randomUUID()}`;
    const channel = new MessageChannel();
    const fail = (reason: unknown) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      reject(reason);
    };
    const timeout = window.setTimeout(() => {
      fail(new InstalledGenerationIdentityQueryTimeoutError());
    }, 5_000);
    channel.port1.onmessageerror = () => fail(new Error("Service Worker 代际身份回执无法解码。"));
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      try {
        if (event.data === null || typeof event.data !== "object" || Array.isArray(event.data)) {
          throw new Error("Service Worker 代际身份查询回执无效。");
        }
        const response = event.data as Record<string, unknown>;
        if (
          !isBoundedProtocolString(response.buildVersion, 256)
          || (queryKind === "installed_identity_v1"
            ? response.type !== "GET_INSTALLED_GENERATION_RELEASE_IDENTITY_ACK_V1"
              || response.requestId !== requestId
            : response.type !== "BUILD_VERSION")
        ) throw new Error("Service Worker 代际身份查询回执无效。");
        let release: ReleaseDatabaseDescriptor;
        if (queryKind === "legacy_same_descriptor") {
          // Old workers return the complete descriptor as flattened fields.
          // Every remaining key is checked; missing or extra fields are rejected.
          const { type: _type, buildVersion: _buildVersion, ...descriptor } = response;
          release = parseExactReleaseDatabaseDescriptor(descriptor);
          if (!releaseControllerTakeoverMatchesCurrentPage(release)) {
            throw new Error("旧版身份查询仅能确认完全相同的数据库描述符。");
          }
        } else {
          release = parseExactReleaseDatabaseDescriptor(response.release);
        }
        window.clearTimeout(timeout);
        channel.port1.close();
        channel.port2.close();
        resolve({ buildVersion: response.buildVersion, release, queryKind });
      } catch (reason) { fail(reason); }
    };
    try {
      worker.postMessage(queryKind === "legacy_same_descriptor"
        ? { type: "GET_BUILD_VERSION" }
        : { type: "GET_INSTALLED_GENERATION_RELEASE_IDENTITY_V1", requestId }, [channel.port2]);
    } catch (reason) { fail(reason); }
  });
  try { return await query("installed_identity_v1"); }
  catch (reason) {
    // A malformed response or transport failure never enables compatibility.
    // The fresh channel remains bound to the same captured worker object.
    if (!allowLegacySameDescriptorFallback || !(reason instanceof InstalledGenerationIdentityQueryTimeoutError)) {
      throw reason;
    }
    return query("legacy_same_descriptor");
  }
}

function scheduleForwardMigrationActivationNavigation(
  session: ForwardMigrationActivationFreeze,
  controller: ServiceWorker
): void {
  if (session.wasBootConfirmed || session.navigation !== null || session.failed) return;
  const assertCurrent = () => {
    if (
      activeForwardMigrationActivationFreeze !== session
      || session.failed
      || navigator.serviceWorker.controller !== controller
      || !releaseControllerTakeoverWriteLatch.locked
      || !forwardMigrationActivationMatchesCurrentPage(session.targetRelease)
    ) throw new Error("前向迁移导航的控制器或冻结身份已经变化；旧页保持锁定。");
  };
  session.navigation = (async () => {
    await session.drain;
    // Preserve the real read-only audit's lifetime. The source must never mark
    // its cancelled boot as successful merely to start the target's trial.
    const result = await appBootReadinessResult;
    assertCurrent();
    if (!result.ready && !isExpectedForwardMigrationBootStop(result.error)) throw result.error;
    const identity = await readInstalledGenerationReleaseIdentity(controller);
    assertCurrent();
    if (
      identity.buildVersion !== session.targetBuildVersion
      || !releaseDatabaseDescriptorsEqual(identity.release, session.targetRelease)
    ) throw new Error("前向迁移导航的实际目标 Service Worker 身份不匹配。");
    await releaseDatabaseCoordinator.verifyForwardMigrationActivationNavigationState(
      session.targetRelease, session.targetBuildVersion
    );
    assertCurrent();
    document.documentElement.dataset.swGenerationConvergence = "forward_migration_reload";
    window.location.reload();
  })().catch((reason: unknown) => {
    session.failed = true;
    document.documentElement.dataset.dbForwardMigrationActivation = "navigation_failed_closed";
    reportBootFailure("storage", reason);
  });
}

function isControllerTakeoverRequestId(value: unknown): value is string {
  return typeof value === "string" &&
    /^takeover-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);
}

class ControllerTakeoverRequestError extends Error {
  readonly failure: ControllerTakeoverFailure;

  constructor(reasonCode: string, outcome: ControllerTakeoverFailureOutcome) {
    super(`Service Worker 接管激活请求失败：${reasonCode}`);
    this.name = "ControllerTakeoverRequestError";
    this.failure = Object.freeze({ reasonCode, outcome });
  }
}

function controllerTakeoverFailure(reason: unknown): ControllerTakeoverFailure {
  if (reason instanceof ControllerTakeoverRequestError) return reason.failure;
  return Object.freeze({
    reasonCode: "UNCLASSIFIED_REQUEST_FAILURE",
    outcome: "commit_outcome_unknown" as const
  });
}

const RELEASE_DATABASE_DESCRIPTOR_KEYS = [
  "acceptedCommittedMigrationIds",
  "databaseName",
  "dbGeneration",
  "maxReadableSchema",
  "migrationId",
  "minReadableSchema",
  "protocolVersion",
  "sourceDatabaseName",
  "sourceGeneration",
  "sourceSchema",
  "targetSchema"
] as const;

function parseExactReleaseDatabaseDescriptor(input: unknown): ReleaseDatabaseDescriptor {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join(",") !== RELEASE_DATABASE_DESCRIPTOR_KEYS.join(",")
  ) {
    throw new Error("Service Worker 接管发布描述符形状无效。");
  }
  return parseReleaseDatabaseDescriptor(input);
}

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

const firstControllerClaimHandoff = createFirstControllerClaimHandoff<ServiceWorker>({
  getController: () => navigator.serviceWorker.controller,
  drainDatabaseWrites: async () => {
    const { caseRepository } = await import("@hakimi/storage");
    await caseRepository.database.drainControllerTakeoverWrites();
  },
  waitForBootPreflight: async () => {
    const result = await baseAppBootReadinessResult;
    if (!result.ready) throw result.error;
  },
  verifyCommittedNavigationState: () => releaseDatabaseCoordinator.verifyFirstControllerClaimNavigationState(),
  assertNavigationAllowed: () => {
    if (bootFailureLatch.current) throw bootFailureLatch.current.error;
  },
  reload: () => {
    document.documentElement.dataset.swGenerationConvergence = "first_control_reload";
    window.location.reload();
  },
  onFailure: (reason) => { reportBootFailure("storage", reason); }
});

const appBootReadinessResult = baseAppBootReadinessResult.then(async (result): Promise<AppBootReadinessResult> => {
  if (!result.ready) {
    if (isExpectedForwardMigrationBootStop(result.error)) return result;
    firstControllerClaimHandoff.cancel(result.error);
    if (!firstControllerClaimHandoff.started) releaseDatabaseCoordinator.cancelPreparation(result.error);
    return result;
  }
  try {
    // Cache Storage and IndexedDB cannot share one browser transaction. Persist
    // the verified DB pointer first; the worker will independently re-read it
    // before acknowledging and confirming this application shell.
    releaseBootConfirmation = await firstControllerClaimHandoff.runBootCommit(
      () => releaseDatabaseCoordinator.commitForBoot()
    );
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
  if (!result.ready && isExpectedForwardMigrationBootStop(result.error)) {
    appBootConfirmed = false;
    setAppBootReadyState(false);
    return false;
  }
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
        if (isExpectedForwardMigrationBootStop(result.error)) return;
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
  }, [readiness, releaseConfirmationReady]);
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

if (shadowDatabaseRelease && (!import.meta.env.PROD || !("serviceWorker" in navigator))) {
  rejectReleaseInteraction?.(new Error("候选数据库代际必须在支持 Service Worker 的生产环境中完成交互确认。"));
}

if ("serviceWorker" in navigator) {
  installControlledWindowDraftCleanupHandler();
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  type SourceMigrationFreeze = {
    requestId: string;
    migrationId: string;
    sourceGeneration: string;
    sourceDatabaseName: string;
    sourceSchema: number;
    targetGeneration: string;
    targetDatabaseName: string;
    targetSchema: number;
    sourceController: ServiceWorker;
    phase: "pending" | "closed" | "resolving" | "committed";
    closePromise: Promise<void>;
    resolutionPromise: Promise<void> | null;
    sourceWritesLocked: boolean;
    timer: number | null;
    recoveryEpoch: number;
  };
  let frozenMigration: SourceMigrationFreeze | null = null;

  const ownsFrozenMigration = (session: SourceMigrationFreeze) =>
    frozenMigration === session && navigator.serviceWorker.controller === session.sourceController;

  const stopFrozenMigrationRecovery = (session: SourceMigrationFreeze) => {
    session.recoveryEpoch += 1;
    if (session.timer !== null) window.clearTimeout(session.timer);
    session.timer = null;
  };

  const reopenSourceDatabase = async (session: SourceMigrationFreeze) => {
    if (!ownsFrozenMigration(session) || session.phase !== "resolving") return;
    const { caseRepository } = await import("@hakimi/storage");
    if (!ownsFrozenMigration(session) || session.phase !== "resolving" || !session.sourceWritesLocked) return;
    // Reopen while the release lock is still closed. A COMMIT or controller
    // change during open must not be followed by an old asynchronous unlock.
    if (!caseRepository.database.isOpen()) await caseRepository.database.open();
    if (!ownsFrozenMigration(session) || session.phase !== "resolving") return;
    caseRepository.database.unlockReleaseWrites();
    session.sourceWritesLocked = false;
    document.documentElement.dataset.dbSourceWriteFrozen = "false";
  };

  const commitFrozenMigration = (session: SourceMigrationFreeze) => {
    if (!ownsFrozenMigration(session) || session.phase === "committed") return;
    session.phase = "committed";
    stopFrozenMigrationRecovery(session);
    // Retain the terminal slot and every write fence until the document leaves.
    // An older ABORT/open continuation cannot reopen this committed source.
    window.location.reload();
  };

  const abortFrozenMigration = (session: SourceMigrationFreeze): Promise<void> => {
    if (!ownsFrozenMigration(session) || session.phase === "committed") return Promise.resolve();
    if (session.resolutionPromise) return session.resolutionPromise;
    session.phase = "resolving";
    stopFrozenMigrationRecovery(session);
    const resolution = (async () => {
      await session.closePromise.catch(() => undefined);
      if (!ownsFrozenMigration(session) || session.phase !== "resolving") return;
      if (session.sourceWritesLocked) await reopenSourceDatabase(session);
      if (!ownsFrozenMigration(session) || session.phase !== "resolving" || session.sourceWritesLocked) return;
      // Keep ownership through the entire unlock/open sequence. A new request
      // can enter only after this exact cancellation has finished.
      frozenMigration = null;
    })();
    session.resolutionPromise = resolution;
    void resolution.catch(() => {
      if (!ownsFrozenMigration(session) || session.phase !== "resolving") return;
      session.resolutionPromise = null;
      scheduleFrozenMigrationRecovery(session);
    });
    return resolution;
  };

  const scheduleFrozenMigrationRecovery = (current: SourceMigrationFreeze) => {
    if (!ownsFrozenMigration(current) || current.phase === "pending" || current.phase === "committed") return;
    stopFrozenMigrationRecovery(current);
    const recoveryEpoch = current.recoveryEpoch;
    const recoveryIsCurrent = () => ownsFrozenMigration(current)
      && current.recoveryEpoch === recoveryEpoch
      && current.phase !== "pending" && current.phase !== "committed";
    current.timer = window.setTimeout(async () => {
      if (!recoveryIsCurrent()) return;
      current.timer = null;
      try {
        const { DatabaseGenerationController } = await import("@hakimi/storage");
        if (!recoveryIsCurrent()) return;
        const controller = new DatabaseGenerationController();
        let verifiedAbort = false;
        try {
          const [state, journal] = await Promise.all([
            controller.readCommittedGeneration(),
            controller.readMigration(current.migrationId)
          ]);
          if (!recoveryIsCurrent()) return;
          if (
            state?.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion &&
            state.committedGeneration === current.targetGeneration &&
            state.committedDatabaseName === current.targetDatabaseName &&
            state.committedSchema === current.targetSchema &&
            state.migrationId === current.migrationId
          ) {
            commitFrozenMigration(current);
            return;
          }
          const sourceStillCommitted = state?.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion
            && state.committedGeneration === current.sourceGeneration
            && state.committedDatabaseName === current.sourceDatabaseName
            && state.committedSchema === current.sourceSchema
            && CURRENT_RELEASE_DATABASE.acceptedCommittedMigrationIds.includes(state.migrationId);
          // Elapsed time or an unknown/in-progress journal cannot prove ABORT.
          // The formal reader must still identify the source, with no active
          // journal or an explicit failed journal, before any release unlock.
          if (!sourceStillCommitted || (journal !== null && journal.phase !== "failed")) {
            scheduleFrozenMigrationRecovery(current);
            return;
          }
          verifiedAbort = true;
        } finally {
          controller.close();
        }
        if (verifiedAbort && recoveryIsCurrent()) await abortFrozenMigration(current);
      } catch {
        if (recoveryIsCurrent()) scheduleFrozenMigrationRecovery(current);
      }
    }, 30_000);
  };

  let activeControllerTakeoverFreeze: {
    requestId: string;
    sourceBuildVersion: string;
    targetBuildVersion: string;
    sourceController: ServiceWorker;
    drain: Promise<void>;
  } | null = null;

  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{
    type?: unknown;
    requestId?: unknown;
    sourceBuildVersion?: unknown;
    targetBuildVersion?: unknown;
    sourceRelease?: unknown;
    targetRelease?: unknown;
    migrationId?: unknown;
    sourceGeneration?: unknown;
    sourceDatabaseName?: unknown;
    sourceSchema?: unknown;
    targetGeneration?: unknown;
    targetDatabaseName?: unknown;
    targetSchema?: unknown;
  }>) => {
    const message = event.data;
    if (message?.type === "FREEZE_RELEASE_FORWARD_MIGRATION_ACTIVATION_WRITES_V1") {
      const wasBootConfirmed = bootConfirmationSent && appBootConfirmed;
      releaseControllerTakeoverWriteLatch.latch("pre_activation_freeze");
      document.getElementById("root")?.setAttribute("inert", "");
      appBootConfirmed = false;
      setAppBootReadyState(false);
      document.documentElement.dataset.dbControllerTakeoverWriteFrozen = "true";
      document.documentElement.dataset.dbForwardMigrationActivation = "draining";
      const responsePort = event.ports[0];
      if (!responsePort) return;
      const respond = (accepted: boolean, reason: string) => {
        try {
          responsePort.postMessage({
            type: "FREEZE_RELEASE_FORWARD_MIGRATION_ACTIVATION_WRITES_ACK_V1",
            requestId: message.requestId,
            sourceBuildVersion: message.sourceBuildVersion,
            targetBuildVersion: message.targetBuildVersion,
            accepted, reason
          });
        } catch { /* The active source worker retains its fail-closed timeout. */ }
      };
      void (async () => {
        let requestedSession: ForwardMigrationActivationFreeze | null = null;
        try {
          const sourceController = navigator.serviceWorker.controller;
          if (
            sourceController === null || event.source !== sourceController
            || !isControllerTakeoverRequestId(message.requestId)
            || !isBoundedProtocolString(pageBuildVersion, 256)
            || message.sourceBuildVersion !== pageBuildVersion
            || !isBoundedProtocolString(message.targetBuildVersion, 256)
            || message.targetBuildVersion === pageBuildVersion
          ) throw new Error("前向迁移激活冻结消息身份无效。");
          const sourceRelease = parseExactReleaseDatabaseDescriptor(message.sourceRelease);
          const targetRelease = parseExactReleaseDatabaseDescriptor(message.targetRelease);
          if (
            !releaseDatabaseDescriptorsEqual(sourceRelease, CURRENT_RELEASE_DATABASE)
            || !forwardMigrationActivationMatchesCurrentPage(targetRelease)
          ) throw new Error("前向迁移激活冻结的源与目标谱系不匹配。");
          const existing = activeForwardMigrationActivationFreeze;
          if (existing && (
            existing.failed
            || existing.sourceController !== sourceController
            || existing.sourceBuildVersion !== pageBuildVersion
            || existing.targetBuildVersion !== message.targetBuildVersion
            || !releaseDatabaseDescriptorsEqual(existing.targetRelease, targetRelease)
          )) throw new Error("旧页已绑定另一项前向迁移激活身份。");
          if (firstControllerClaimHandoff.started) {
            throw new Error("首次控制器接管尚未结束，不能开始前向迁移激活。");
          }
          const session: ForwardMigrationActivationFreeze = existing?.requestId === message.requestId
            ? existing
            : {
              requestId: message.requestId,
              sourceBuildVersion: pageBuildVersion,
              targetBuildVersion: message.targetBuildVersion,
              sourceController, targetRelease,
              wasBootConfirmed: existing?.wasBootConfirmed ?? wasBootConfirmed,
              drain: Promise.resolve(), failed: false, navigation: null
            };
          requestedSession = session;
          if (session !== existing) {
            activeForwardMigrationActivationFreeze = session;
            session.drain = (async () => {
              await releaseDatabaseCoordinator.freezeForForwardMigrationActivation(targetRelease);
              const { caseRepository } = await import("@hakimi/storage");
              await caseRepository.database.drainControllerTakeoverWrites();
            })();
          }
          await session.drain;
          if (
            activeForwardMigrationActivationFreeze !== session || session.failed
            || navigator.serviceWorker.controller !== sourceController
            || session.sourceBuildVersion !== pageBuildVersion
            || session.targetBuildVersion !== message.targetBuildVersion
            || !releaseDatabaseDescriptorsEqual(session.targetRelease, targetRelease)
            || !releaseDatabaseDescriptorsEqual(sourceRelease, CURRENT_RELEASE_DATABASE)
            || !releaseControllerTakeoverWriteLatch.locked
          ) throw new Error("前向迁移激活排空期间身份已变化；旧页保持锁定。");
          document.documentElement.dataset.dbForwardMigrationActivation = "drained";
          respond(true, "WRITES_DRAINED");
        } catch (reason) {
          if (requestedSession) requestedSession.failed = true;
          document.documentElement.dataset.dbForwardMigrationActivation = "freeze_failed_closed";
          respond(false, reason instanceof Error ? reason.name : "FREEZE_FAILED");
        }
      })();
      return;
    }
    if (message?.type === "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1") {
      // This is deliberately the first state mutation in the handler. Parsing,
      // dynamic imports and transaction draining may all yield; the page must
      // already be unable to start another production write before they do.
      releaseControllerTakeoverWriteLatch.latch("pre_activation_freeze");
      if (firstControllerClaimHandoff.started) {
        firstControllerClaimHandoff.cancel(new Error("首次 Service Worker 接管期间收到代际接管冻结；旧页保持写入锁定。"));
      }
      document.documentElement.dataset.dbControllerTakeoverWriteFrozen = "true";
      document.documentElement.dataset.dbControllerTakeoverWriteFreezePhase = "draining";
      const responsePort = event.ports[0];
      if (!responsePort) return;
      const respond = (accepted: boolean, reason: string) => {
        try {
          responsePort.postMessage({
            type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_ACK_V1",
            requestId: message.requestId,
            sourceBuildVersion: message.sourceBuildVersion,
            targetBuildVersion: message.targetBuildVersion,
            accepted,
            reason
          });
        } catch {
          // The active A worker owns timeout and fails activation closed.
        }
      };
      void (async () => {
        try {
          const messageSource = event.source;
          if (
            messageSource === null ||
            messageSource !== navigator.serviceWorker.controller ||
            !isControllerTakeoverRequestId(message.requestId) ||
            !isBoundedProtocolString(pageBuildVersion, 256) ||
            message.sourceBuildVersion !== pageBuildVersion ||
            !isBoundedProtocolString(message.targetBuildVersion, 256) ||
            message.targetBuildVersion === pageBuildVersion
          ) {
            throw new Error("Service Worker 接管冻结消息身份无效。");
          }
          const sourceController = messageSource as ServiceWorker;
          const sourceRelease = parseExactReleaseDatabaseDescriptor(message.sourceRelease);
          const targetRelease = parseExactReleaseDatabaseDescriptor(message.targetRelease);
          if (
            !releaseDatabaseDescriptorsEqual(sourceRelease, CURRENT_RELEASE_DATABASE) ||
            !releaseControllerTakeoverMatchesCurrentPage(targetRelease)
          ) {
            throw new Error("Service Worker 接管冻结消息发布代际不匹配。");
          }
          const existing = activeControllerTakeoverFreeze;
          if (existing?.requestId === message.requestId) {
            if (
              existing.sourceBuildVersion !== message.sourceBuildVersion ||
              existing.targetBuildVersion !== message.targetBuildVersion ||
              existing.sourceController !== sourceController
            ) {
              throw new Error("当前页面已锁存另一项 Service Worker 接管冻结请求。");
            }
            await existing.drain;
            respond(true, "WRITES_DRAINED");
            return;
          }
          // A failed pre-commit session never unlocks this document. A later
          // exact request from the same current controller may rebind the
          // already-closed latch and establish a fresh ordering barrier.
          const session = {
            requestId: message.requestId,
            sourceBuildVersion: pageBuildVersion,
            targetBuildVersion: message.targetBuildVersion,
            sourceController,
            drain: Promise.resolve()
          };
          session.drain = (async () => {
            await releaseDatabaseCoordinator.freezeForControllerTakeover();
            const { caseRepository } = await import("@hakimi/storage");
            await caseRepository.database.drainControllerTakeoverWrites();
            if (
              activeControllerTakeoverFreeze !== session ||
              navigator.serviceWorker.controller !== sourceController ||
              !releaseControllerTakeoverWriteLatch.locked
            ) {
              throw new Error("Service Worker 接管冻结排空期间控制器身份已变化。");
            }
          })();
          activeControllerTakeoverFreeze = session;
          await session.drain;
          document.documentElement.dataset.dbControllerTakeoverWriteFreezePhase = "drained";
          respond(true, "WRITES_DRAINED");
        } catch (reason) {
          document.documentElement.dataset.dbControllerTakeoverWriteFreezePhase = "failed";
          respond(false, reason instanceof Error ? reason.name : "FREEZE_FAILED");
        }
      })();
      return;
    }
    if (message?.type === "FREEZE_DATABASE_WRITES") {
      const responsePort = event.ports[0];
      if (!responsePort) return;
      const sourceController = navigator.serviceWorker.controller;
      const respond = (payload: Record<string, unknown>) => {
        try {
          responsePort.postMessage(payload);
        } catch {
          // The migration coordinator owns timeout and retry if its port closes.
        }
      };
      void (async () => {
        let requestedSession: SourceMigrationFreeze | null = null;
        try {
          if (
            sourceController === null ||
            event.source !== sourceController ||
            !isBoundedProtocolString(message.requestId, 128) ||
            !isBoundedProtocolString(message.migrationId, 128) ||
            !isBoundedProtocolString(message.sourceGeneration, 128) ||
            !isBoundedProtocolString(message.sourceDatabaseName, 512) ||
            !Number.isSafeInteger(message.sourceSchema) ||
            Number(message.sourceSchema) <= 0 ||
            !isBoundedProtocolString(message.targetGeneration, 128) ||
            !isBoundedProtocolString(message.targetDatabaseName, 512) ||
            !Number.isSafeInteger(message.targetSchema) ||
            Number(message.targetSchema) <= 0
          ) {
            throw new Error("旧标签页收到的迁移冻结消息无效。");
          }
          const isSource =
            message.sourceGeneration === CURRENT_RELEASE_DATABASE.dbGeneration &&
            message.sourceDatabaseName === CURRENT_RELEASE_DATABASE.databaseName &&
            message.sourceSchema === CURRENT_RELEASE_DATABASE.targetSchema;
          if (!isSource) {
            respond({
              type: "DATABASE_WRITES_FROZEN",
              requestId: message.requestId,
              accepted: true,
              reason: "CLIENT_NOT_SOURCE"
            });
            return;
          }
          if (firstControllerClaimHandoff.started) {
            firstControllerClaimHandoff.cancel(new Error("首次 Service Worker 接管期间收到数据库迁移冻结；旧页保持写入锁定。"));
          }
          if (frozenMigration) {
            const matchesExistingFreeze =
              frozenMigration.sourceController === sourceController &&
              frozenMigration.requestId === message.requestId &&
              frozenMigration.migrationId === message.migrationId &&
              frozenMigration.sourceGeneration === message.sourceGeneration &&
              frozenMigration.sourceDatabaseName === message.sourceDatabaseName &&
              frozenMigration.sourceSchema === message.sourceSchema &&
              frozenMigration.targetGeneration === message.targetGeneration &&
              frozenMigration.targetDatabaseName === message.targetDatabaseName &&
              frozenMigration.targetSchema === message.targetSchema;
            if (!matchesExistingFreeze) {
              throw new Error("旧标签页已绑定另一项数据库迁移冻结请求。");
            }
            if (frozenMigration.phase !== "pending" && frozenMigration.phase !== "closed") {
              throw new Error("这项迁移冻结请求已经进入精确收尾，不能再次确认冻结。");
            }
            requestedSession = frozenMigration;
          } else {
            const session: SourceMigrationFreeze = {
              requestId: message.requestId,
              migrationId: message.migrationId,
              sourceGeneration: message.sourceGeneration,
              sourceDatabaseName: message.sourceDatabaseName,
              sourceSchema: Number(message.sourceSchema),
              targetGeneration: message.targetGeneration,
              targetDatabaseName: message.targetDatabaseName,
              targetSchema: Number(message.targetSchema),
              sourceController,
              phase: "pending",
              closePromise: Promise.resolve(),
              resolutionPromise: null,
              sourceWritesLocked: false,
              timer: null,
              recoveryEpoch: 0
            };
            // Publish exact ownership before import yields. A queued matching
            // ABORT/COMMIT can now cancel this preparation before it closes DB.
            frozenMigration = session;
            requestedSession = session;
            session.closePromise = (async () => {
              const { caseRepository } = await import("@hakimi/storage");
              if (!ownsFrozenMigration(session) || session.phase !== "pending") {
                throw new Error("迁移冻结准备已被精确取消；不能迟到地关闭来源数据库。");
              }
              session.sourceWritesLocked = true;
              caseRepository.database.lockReleaseWrites();
              // Preserve auto-open so repository writes still fail at the
              // explicit release lock, not merely a closed-connection error.
              caseRepository.database.close({ disableAutoOpen: false });
              session.phase = "closed";
              document.documentElement.dataset.dbSourceWriteFrozen = "true";
            })();
          }
          const session = requestedSession;
          await session.closePromise;
          if (!ownsFrozenMigration(session) || session.phase !== "closed" || !session.sourceWritesLocked) {
            throw new Error("迁移冻结已取消或归属已变化；不能发送迟到的 SOURCE_CLOSED。");
          }
          scheduleFrozenMigrationRecovery(session);
          respond({
            type: "DATABASE_WRITES_FROZEN",
            requestId: message.requestId,
            accepted: true,
            reason: "SOURCE_CLOSED"
          });
        } catch (reason) {
          // A rejected or delayed FREEZE is not an ABORT receipt. Only the
          // exact worker resolution (or verified recovery) can release its slot.
          // In particular, this catch must never unlock a newer request.
          respond({
            type: "DATABASE_WRITES_FROZEN",
            requestId: message.requestId,
            accepted: false,
            reason: reason instanceof Error ? reason.name : "FREEZE_FAILED"
          });
        }
      })();
      return;
    }
    const resolutionMatchesFrozenMigration = (() => {
      const current = frozenMigration;
      return current !== null &&
        navigator.serviceWorker.controller === current.sourceController &&
        event.source === current.sourceController &&
        message?.requestId === current.requestId &&
        message?.migrationId === current.migrationId &&
        message?.sourceGeneration === current.sourceGeneration &&
        message?.sourceDatabaseName === current.sourceDatabaseName &&
        message?.sourceSchema === current.sourceSchema &&
        message?.targetGeneration === current.targetGeneration &&
        message?.targetDatabaseName === current.targetDatabaseName &&
        message?.targetSchema === current.targetSchema;
    })();
    if (
      message?.type === "DATABASE_MIGRATION_ABORTED" &&
      resolutionMatchesFrozenMigration &&
      frozenMigration !== null
    ) {
      void abortFrozenMigration(frozenMigration).catch(() => undefined);
      return;
    }
    if (
      message?.type === "DATABASE_MIGRATION_COMMITTED" &&
      resolutionMatchesFrozenMigration &&
      frozenMigration !== null
    ) {
      commitFrozenMigration(frozenMigration);
    }
  });

  const startServiceWorkerLifecycle = () => {
    const controllerPresentAtLifecycleStart = Boolean(navigator.serviceWorker.controller);
    // A fresh shadow install can commit its empty source without a worker.
    // Delay registration so first claim cannot freeze that admitted commit.
    // The coordinator still independently checks source absence and admission.
    const initialCommitBeforeRegistration = defaultLegacyDatabaseRelease
      || (shadowDatabaseRelease
        && !controllerPresentAtLifecycleStart
        && document.documentElement.dataset.prebootRecoveryReason === "FRESH_INSTALL");
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
          const convergenceError = new Error("Service Worker 已接管新数据库代际；当前旧页面将重新载入并安全收敛。");
          reportBootFailure(
            "storage",
            convergenceError
          );
          reject(convergenceError);
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
      try {
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
        document.documentElement.dataset.swBootSignalSent = "true";
      } catch (reason) {
        window.clearTimeout(timeout);
        channel.port1.close();
        channel.port2.close();
        reject(reason);
      }
    });

    const confirmActiveWorkerBoot = (): Promise<void> => {
      updateControlState();
      if (activeForwardMigrationActivationFreeze !== null) return Promise.resolve();
      // The uncontrolled first document only hands off by navigation. It must
      // never race its controllerchange event by acknowledging on a frozen writer.
      if (initialCommitBeforeRegistration && !controllerPresentAtLifecycleStart) {
        return Promise.resolve();
      }
      if (bootFailed || !appBootConfirmed || !pageBuildVersion || !releaseBootConfirmation) {
        return Promise.resolve();
      }
      if (bootConfirmationSent) return Promise.resolve();
      if (activeBootConfirmation) return activeBootConfirmation;
      const controller = navigator.serviceWorker.controller;
      if (!controller) return Promise.resolve();
      activeBootConfirmation = postBootConfirmation(controller, releaseBootConfirmation)
        .then(async () => {
          if (activeForwardMigrationActivationFreeze !== null) {
            throw new ReleaseForwardMigrationActivationFrozenError();
          }
          bootConfirmationSent = true;
          await releaseDatabaseCoordinator.acknowledgeServiceWorkerCommit();
          resolveReleaseInteraction?.();
        })
        .catch((reason: unknown) => {
          if (isExpectedForwardMigrationBootStop(reason)) {
            appBootConfirmed = false;
            setAppBootReadyState(false);
            return;
          }
          rejectReleaseInteraction?.(reason);
          reportBootFailure("storage", reason);
          throw reason;
        })
        .finally(() => {
          activeBootConfirmation = null;
        });
      return activeBootConfirmation;
    };

    const requestInstalledGenerationActivation = async (
      controller: ServiceWorker,
      waitingWorker: ServiceWorker,
      registration: ServiceWorkerRegistration
    ): Promise<void> => {
      const sourceAndWaitingStillMatch = () => Boolean(
        pageBuildVersion
        && navigator.serviceWorker.controller === controller
        && registration.waiting === waitingWorker
        && waitingWorker.state === "installed"
      );
      if (!sourceAndWaitingStillMatch()) {
        throw new ControllerTakeoverRequestError("SOURCE_CONTROLLER_CHANGED", "known_not_committed");
      }
      let identity: Awaited<ReturnType<typeof readInstalledGenerationReleaseIdentity>>;
      try { identity = await readInstalledGenerationReleaseIdentity(waitingWorker, true); }
      catch {
        throw new ControllerTakeoverRequestError("WAITING_IDENTITY_QUERY_FAILED", "known_not_committed");
      }
      const sameDescriptor = releaseControllerTakeoverMatchesCurrentPage(identity.release);
      const forwardMigration = identity.queryKind === "installed_identity_v1"
        && !sameDescriptor && forwardMigrationActivationMatchesCurrentPage(identity.release);
      if ((!sameDescriptor && !forwardMigration) || identity.buildVersion === pageBuildVersion) {
        throw new ControllerTakeoverRequestError("TARGET_RELEASE_MISMATCH", "known_not_committed");
      }
      const requestType = forwardMigration
        ? "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_V1"
        : "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1";
      const acknowledgementType = forwardMigration
        ? "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_ACK_V1"
        : "REQUEST_INSTALLED_GENERATION_ACTIVATION_ACK_V1";
      return new Promise((resolve, reject) => {
        // The identity query is read-only. Recheck both real browser objects
        // immediately before dispatching the request that may activate B.
        if (!sourceAndWaitingStillMatch()) {
          reject(new ControllerTakeoverRequestError(
            "SOURCE_CONTROLLER_CHANGED",
            "known_not_committed"
          ));
          return;
        }
        const requestId = `takeover-${crypto.randomUUID()}`;
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => {
          channel.port1.close();
          // The active worker can enter commit before this outer acknowledgement
          // arrives. A timeout therefore cannot prove that commit did not happen.
          reject(new ControllerTakeoverRequestError(
            "REQUEST_ACK_TIMEOUT",
            "commit_outcome_unknown"
          ));
          // The active worker owns a 60 s fail-closed preparation lease and may
          // need a 15 s client drain plus its bounded commit handshake.
        }, 70_000);
        channel.port1.onmessage = (event: MessageEvent<{
          type?: unknown;
          requestId?: unknown;
          sourceBuildVersion?: unknown;
          targetBuildVersion?: unknown;
          targetRelease?: unknown;
          accepted?: unknown;
          reason?: unknown;
        }>) => {
          window.clearTimeout(timeout);
          channel.port1.close();
          try {
            const acknowledgement = event.data;
            if (
              acknowledgement?.type !== acknowledgementType ||
              acknowledgement.requestId !== requestId ||
              acknowledgement.sourceBuildVersion !== pageBuildVersion
            ) {
              throw new ControllerTakeoverRequestError(
                "INVALID_ACK_IDENTITY",
                "commit_outcome_unknown"
              );
            }
            if (acknowledgement.accepted === false) {
              if (!isBoundedProtocolString(acknowledgement.reason, 256)) {
                throw new ControllerTakeoverRequestError(
                  "INVALID_NACK_REASON",
                  "commit_outcome_unknown"
                );
              }
              throw new ControllerTakeoverRequestError(
                acknowledgement.reason,
                controllerTakeoverFailureFromNack(acknowledgement.reason).outcome
              );
            }
            if (
              acknowledgement.accepted !== true ||
              acknowledgement.reason !== "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING" ||
              !isBoundedProtocolString(acknowledgement.targetBuildVersion, 256) ||
              acknowledgement.targetBuildVersion === pageBuildVersion
            ) {
              throw new ControllerTakeoverRequestError(
                "INVALID_ACCEPTED_ACK",
                "commit_outcome_unknown"
              );
            }
            const targetRelease = parseExactReleaseDatabaseDescriptor(acknowledgement.targetRelease);
            if (
              acknowledgement.targetBuildVersion !== identity.buildVersion
              || !releaseDatabaseDescriptorsEqual(targetRelease, identity.release)
              || (forwardMigration
                ? !forwardMigrationActivationMatchesCurrentPage(targetRelease)
                : !releaseControllerTakeoverMatchesCurrentPage(targetRelease))
            ) {
              throw new ControllerTakeoverRequestError(
                "TARGET_RELEASE_MISMATCH",
                "commit_outcome_unknown"
              );
            }
            document.documentElement.dataset.swTakeoverTargetBuild = acknowledgement.targetBuildVersion;
            resolve();
          } catch (reason) {
            reject(reason instanceof ControllerTakeoverRequestError
              ? reason
              : new ControllerTakeoverRequestError(
                "INVALID_ACCEPTED_ACK",
                "commit_outcome_unknown"
              ));
          }
        };
        try {
          controller.postMessage({
            type: requestType,
            requestId,
            sourceBuildVersion: pageBuildVersion,
            sourceRelease: CURRENT_RELEASE_DATABASE,
            ...(forwardMigration ? {
              targetBuildVersion: identity.buildVersion,
              targetRelease: identity.release
            } : {})
          }, [channel.port2]);
        } catch {
          window.clearTimeout(timeout);
          channel.port1.close();
          channel.port2.close();
          reject(new ControllerTakeoverRequestError(
            "REQUEST_POST_FAILED",
            "known_not_committed"
          ));
          return;
        }
        // Once postMessage returns, the active worker may already have entered
        // commit. A diagnostic DOM write is not part of that transport and must
        // never reclassify the request as known-not-dispatched or authorize a
        // retry if a host object setter happens to throw.
        try {
          document.documentElement.dataset.swTakeoverPreparation = "requested";
        } catch {
          // Telemetry is best-effort; request certainty stays outcome-unknown
          // until the authenticated acknowledgement settles it.
        }
      });
    };

    let controllerTakeoverPromotionClosed = false;
    let closeControllerTakeoverPromotion: ((reasonCode: string) => void) | null = null;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      const claimedController = navigator.serviceWorker.controller;
      const firstCommittedClaim = initialCommitBeforeRegistration
        && !controllerPresentAtLifecycleStart
        && !controllerTakeoverPromotionClosed
        && !releaseControllerTakeoverWriteLatch.locked
        && frozenMigration === null
        && claimedController !== null;
      // This document belongs to the controller epoch that just ended. It may
      // confirm the new worker only through the normal navigation/boot path;
      // it must never promote another waiting worker in place.
      controllerTakeoverPromotionClosed = true;
      closeControllerTakeoverPromotion?.("CONTROLLER_CHANGED_AFTER_DISPATCH");
      releaseControllerTakeoverWriteLatch.latch("controller_changed");
      const forwardSession = activeForwardMigrationActivationFreeze;
      const coordinatorDrained = forwardSession?.drain
        ?? releaseDatabaseCoordinator.freezeForControllerTakeover();
      void coordinatorDrained.catch(() => undefined);
      document.documentElement.dataset.dbControllerTakeoverWriteFrozen = "true";
      document.documentElement.dataset.dbControllerTakeoverWriteFreezePhase = "controller_changed";
      if (forwardSession) {
        document.getElementById("root")?.setAttribute("inert", "");
        setAppBootReadyState(false);
        if (claimedController === null) {
          forwardSession.failed = true;
          document.documentElement.dataset.dbForwardMigrationActivation = "controller_missing";
          return;
        }
        document.documentElement.dataset.dbForwardMigrationActivation = "controller_changed";
        // Confirmed source pages must remain present for B's actual migration
        // freeze and commit resolution. Only an unfinished old boot navigates
        // after its real read-only audit settles and B's identity is verified.
        scheduleForwardMigrationActivationNavigation(forwardSession, claimedController);
        return;
      }
      if (firstControllerClaimHandoff.started) {
        firstControllerClaimHandoff.cancel(new Error("首次 Service Worker 接管期间再次发生控制器变化；旧页保持写入锁定。"));
        return;
      }
      if (firstCommittedClaim) {
        // This old document cannot commit after its writer is frozen. Drain it,
        // re-verify its completed commit, then navigate. An early peer claim
        // without that normal commit remains in read-only recovery.
        appBootConfirmed = false;
        setAppBootReadyState(false);
        firstControllerClaimHandoff.schedule(claimedController, coordinatorDrained);
        return;
      }
      void confirmActiveWorkerBoot().catch(() => undefined);
    });
    void registerServiceWorkerAfterBootCommit({
      waitForDocumentLoad: () => document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true })),
      waitForBootCommit: initialCommitBeforeRegistration ? async () => {
        const result = await appBootReadinessResult;
        if (!result.ready) throw result.error;
        if (!releaseBootConfirmation) throw new Error("本页数据库尚无正常提交回执，不能注册 Service Worker。");
      } : undefined,
      assertRegistrationAllowed: () => {
        if (initialCommitBeforeRegistration) {
          if (bootFailureLatch.current) throw bootFailureLatch.current.error;
          if (releaseControllerTakeoverWriteLatch.locked || controllerTakeoverPromotionClosed) {
            throw new Error("当前页面已发生 Service Worker 接管冻结，不能再注册或初始化控制器。");
          }
        }
      },
      register: () => navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
    })
      .then(async (registration) => {
        document.documentElement.dataset.swRegistered = "true";
        const observedInstallers = new WeakSet<ServiceWorker>();
        let activationPromotionEnabled = false;
        let activationWindowDeadline = 0;
        let activationWindowTimer: number | null = null;
        const takeoverScheduler = createControllerTakeoverScheduler<
          ServiceWorker,
          ServiceWorker,
          number
        >({
          clock: {
            setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
            clearTimeout: (timer) => window.clearTimeout(timer)
          },
          getWaitingWorker: () => registration.waiting,
          getController: () => navigator.serviceWorker.controller,
          isWaitingWorkerReady: (worker) => worker.state === "installed",
          requestActivation: (controller, worker) => requestInstalledGenerationActivation(controller, worker, registration),
          classifyFailure: controllerTakeoverFailure,
          onTransition: (transition) => {
            document.documentElement.dataset.swTakeoverPreparation =
              transition.kind === "succeeded"
                ? "activation_dispatched"
                : transition.kind === "retry_scheduled"
                  ? "retry_scheduled"
                  : transition.kind === "commit_outcome_unknown"
                    ? "commit_outcome_unknown"
                    : transition.kind === "exhausted"
                      ? "retry_exhausted"
                      : transition.kind === "terminal"
                        ? "failed_closed_terminal"
                        : document.documentElement.dataset.swTakeoverPreparation;
          }
        });
        closeControllerTakeoverPromotion = (reasonCode: string) => {
          activationPromotionEnabled = false;
          activationWindowDeadline = 0;
          if (activationWindowTimer !== null) {
            window.clearTimeout(activationWindowTimer);
            activationWindowTimer = null;
          }
          takeoverScheduler.close(reasonCode);
        };
        if (controllerTakeoverPromotionClosed) {
          closeControllerTakeoverPromotion("CONTROLLER_CHANGED_BEFORE_SCHEDULER_READY");
        }
        const promoteWaiting = () => {
          if (!activationPromotionEnabled) return;
          takeoverScheduler.promoteWaiting();
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
          if (!activationPromotionEnabled) {
            activationWindowTimer = null;
            return;
          }
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
        if (
          shadowDatabaseRelease &&
          !controllerPresentAtLifecycleStart &&
          releaseControllerTakeoverWriteLatch.reason === "controller_changed"
        ) {
          // The first claim also latches this document before any asynchronous
          // identity check. After its exact BOOT_OK succeeds, a full navigation
          // creates the first writable controlled page; the old document is
          // never unlocked in place.
          document.documentElement.dataset.swGenerationConvergence = "first_control_reload";
          window.location.reload();
          return;
        }
        if (controllerTakeoverPromotionClosed) return;
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
        if (isExpectedForwardMigrationBootStop(error)) return;
        document.documentElement.dataset.swRegistered = "false";
        if (shadowDatabaseRelease) {
          rejectReleaseInteraction?.(
            error instanceof Error ? error : new Error("Service Worker 生命周期未能完成数据库代际确认。")
          );
        }
        console.error("Service Worker 注册失败", error);
      });
  };

  // Install controllerchange before yielding to load or the boot commit. A peer
  // can claim this page independently of this document's registration promise.
  // Registration itself still waits for load, including late bootstrap imports.
  startServiceWorkerLifecycle();
}
