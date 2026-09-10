import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol";
import {
  controllerTakeoverFailureFromNack,
  createControllerTakeoverScheduler,
  type ControllerTakeoverFailure
} from "./lib/service-worker-takeover-retry";

const ORIGIN = "https://hakimi.test";
const CURRENT_VERSION = "current-build";
const CURRENT_CACHE = `hakimi-shell-${CURRENT_VERSION}`;
const CACHE_META_URL = `${ORIGIN}/__hakimi_cache_meta__`;
const CONTROLLER_TAKEOVER_HOLD_URL = `${ORIGIN}/__hakimi_controller_takeover_hold_v1__`;
const BRIDGE_DESCRIPTOR = {
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: [null],
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
} as const;
const TARGET_DESCRIPTOR = {
  protocolVersion: 1,
  dbGeneration: "research-v14-shadow",
  databaseName: "hakimi-bazi-research.generation.research-v14-shadow",
  targetSchema: 14,
  minReadableSchema: 14,
  maxReadableSchema: 14,
  migrationId: "v13-to-v14-shadow-v1",
  acceptedCommittedMigrationIds: ["v13-to-v14-shadow-v1"],
  sourceGeneration: "legacy-v13",
  sourceDatabaseName: "hakimi-bazi-research",
  sourceSchema: 13
} as const;
const REPUBLISHED_TARGET_DESCRIPTOR = {
  ...TARGET_DESCRIPTOR,
  migrationId: "v13-to-v14-shadow-v2",
  acceptedCommittedMigrationIds: [
    TARGET_DESCRIPTOR.migrationId,
    "v13-to-v14-shadow-v2"
  ]
} as const;

type ReleaseDescriptor =
  | typeof BRIDGE_DESCRIPTOR
  | typeof TARGET_DESCRIPTOR
  | typeof REPUBLISHED_TARGET_DESCRIPTOR
  | typeof PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;

type FakeWorkerEndpoint = {
  state: string;
  scriptURL: string;
  postMessage: (message: Record<string, unknown>, ports?: FakeMessagePort[]) => void;
};

const FORWARD_TARGET_VERSION = "forward-v16-build";
const FORWARD_REQUEST_ID = "takeover-00000000-0000-4000-8000-000000000091";

function encodedDescriptor(descriptor: ReleaseDescriptor) {
  return JSON.stringify(descriptor).replaceAll('"', '\\"');
}

class FakeResponse {
  readonly status: number;
  readonly type = "basic";

  constructor(
    readonly body = "",
    readonly init?: { status?: number; headers?: Record<string, string> }
  ) {
    this.status = init?.status ?? 200;
  }

  async json() {
    return JSON.parse(this.body) as unknown;
  }

  clone() {
    return new FakeResponse(this.body, this.init);
  }
}

function requestKey(request: string | { url: string }) {
  const value = typeof request === "string" ? request : request.url;
  return new URL(value, ORIGIN).toString();
}

class FakeCache {
  readonly entries = new Map<string, FakeResponse>();
  addedRequests: string[] = [];
  failAddAll = false;
  putEffect: ((
    key: string,
    response: FakeResponse,
    commit: () => void
  ) => void | Promise<void>) | null = null;
  matchEffect: ((
    key: string,
    read: () => FakeResponse | undefined
  ) => FakeResponse | undefined | Promise<FakeResponse | undefined>) | null = null;
  deleteEffect: ((
    key: string,
    remove: () => boolean
  ) => boolean | Promise<boolean>) | null = null;

  async addAll(requests: string[]) {
    if (this.failAddAll) throw new Error("synthetic precache failure");
    this.addedRequests = [...requests];
    for (const request of requests) this.entries.set(requestKey(request), new FakeResponse(request));
  }

  async put(request: string | { url: string }, response: FakeResponse) {
    const key = requestKey(request);
    const commit = () => {
      this.entries.set(key, response);
    };
    if (this.putEffect) {
      await this.putEffect(key, response, commit);
      return;
    }
    commit();
  }

  async match(request: string | { url: string }) {
    const key = requestKey(request);
    const read = () => this.entries.get(key);
    if (this.matchEffect) return this.matchEffect(key, read);
    return read();
  }

  async delete(request: string | { url: string }) {
    const key = requestKey(request);
    const remove = () => this.entries.delete(key);
    if (this.deleteEffect) return this.deleteEffect(key, remove);
    return remove();
  }
}

class FakeMessagePort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  peer: FakeMessagePort | null = null;
  closed = false;

  postMessage(message: unknown) {
    const target = this.peer;
    if (this.closed || !target || target.closed) return;
    queueMicrotask(() => {
      if (!target.closed) target.onmessage?.({ data: message });
    });
  }

  close() {
    this.closed = true;
  }
}

class FakeMessageChannel {
  readonly port1 = new FakeMessagePort();
  readonly port2 = new FakeMessagePort();

  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}

type FakeClientResponder = (
  message: Record<string, unknown>,
  responsePort: FakeMessagePort | undefined
) => void;

type FakeWindowClient = {
  id: string;
  messages: Array<Record<string, unknown>>;
  postMessage: ReturnType<typeof vi.fn>;
};

type WorkerEvent = {
  data?: unknown;
  ports?: Array<{ postMessage: (message: unknown) => void }>;
  request?: { method: string; mode: string; url: string };
  source?: {
    id?: string;
    scriptURL?: string;
    state?: string;
    postMessage?: (message: unknown, ports?: FakeMessagePort[]) => void;
  };
  clientId?: string;
  resultingClientId?: string;
  respondWith?: (promise: Promise<unknown>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
};

async function createWorkerHarness(
  descriptor: ReleaseDescriptor = BRIDGE_DESCRIPTOR,
  persistentState: {
    buildVersion?: string;
    cacheStore?: Map<string, FakeCache>;
    indexedDB?: IDBFactory;
  } = {}
) {
  const workerPath = path.resolve(import.meta.dirname, "../public/sw.js");
  const workerSource = (await readFile(workerPath, "utf8"))
    .replace("__CACHE_VERSION__", persistentState.buildVersion ?? CURRENT_VERSION)
    .replace("__RELEASE_DATABASE_DESCRIPTOR__", encodedDescriptor(descriptor))
    .replace("__BRIDGE_RELEASE_DATABASE_DESCRIPTOR__", encodedDescriptor(BRIDGE_DESCRIPTOR));
  const cacheStore = persistentState.cacheStore ?? new Map<string, FakeCache>();
  const indexedDB = persistentState.indexedDB ?? new IDBFactory();
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const windowClients = new Map<string, FakeWindowClient>();
  const timerTasks = new Set<Promise<unknown>>();
  const trackedSetTimeout = (
    callback: (...args: unknown[]) => unknown,
    delay?: number,
    ...args: unknown[]
  ) => setTimeout(() => {
    const result = callback(...args);
    const thenable = result as { then?: unknown } | null;
    if (!thenable || typeof thenable.then !== "function") return;
    const task = Promise.resolve(result);
    timerTasks.add(task);
    void task.then(
      () => timerTasks.delete(task),
      () => timerTasks.delete(task)
    );
  }, delay);
  const deleteCache = vi.fn(async (cacheName: string) => cacheStore.delete(cacheName));
  const claim = vi.fn(async () => undefined);
  const skipWaiting = vi.fn(async () => undefined);
  const matchAllClients = vi.fn(async () => [...windowClients.values()]);
  const fetchRequest = vi.fn(async (): Promise<FakeResponse> => {
    throw new Error("offline");
  });
  const registration: {
    waiting: FakeWorkerEndpoint | null;
    active: FakeWorkerEndpoint | null;
  } = { waiting: null, active: null };
  const caches = {
    async open(cacheName: string) {
      let cache = cacheStore.get(cacheName);
      if (!cache) {
        cache = new FakeCache();
        cacheStore.set(cacheName, cache);
      }
      return cache;
    },
    async keys() {
      return [...cacheStore.keys()];
    },
    delete: deleteCache,
    async match(request: string | { url: string }) {
      for (const cache of cacheStore.values()) {
        const response = await cache.match(request);
        if (response) return response;
      }
      return undefined;
    }
  };
  const workerSelf = {
    location: { origin: ORIGIN },
    crypto: webcrypto,
    indexedDB,
    clients: { claim, matchAll: matchAllClients },
    registration,
    skipWaiting,
    addEventListener(type: string, listener: (event: WorkerEvent) => void) {
      listeners.set(type, listener);
    }
  };

  runInNewContext(workerSource, {
    URL,
    Response: FakeResponse,
    TextEncoder,
    MessageChannel: FakeMessageChannel,
    clearTimeout,
    caches,
    fetch: fetchRequest,
    self: workerSelf,
    setTimeout: trackedSetTimeout
  });

  const flushTimerTasks = async () => {
    while (timerTasks.size > 0) await Promise.allSettled([...timerTasks]);
  };

  const dispatch = async (type: string, event: WorkerEvent = {}) => {
    const pending: Promise<unknown>[] = [];
    let response: Promise<unknown> | undefined;
    listeners.get(type)?.({
      ...event,
      respondWith(promise) {
        response = Promise.resolve(promise);
      },
      waitUntil(promise) {
        pending.push(Promise.resolve(promise));
      }
    });
    await Promise.all(pending);
    return response;
  };

  const seedGeneration = async (
    cacheName: string,
    installedAt: number,
    bootConfirmed: boolean,
    releaseDescriptor?: ReleaseDescriptor
  ) => {
    const cache = await caches.open(cacheName);
    await cache.put(
      CACHE_META_URL,
      new FakeResponse(
        JSON.stringify({
          cacheName,
          installedAt,
          bootAttempted: bootConfirmed,
          bootConfirmed,
          ...(releaseDescriptor ?? {})
        })
      )
    );
  };
  const seedShell = async (cacheName: string, body: string) => {
    const cache = await caches.open(cacheName);
    await cache.put("/", new FakeResponse(body));
  };
  const seedResource = async (cacheName: string, resourcePath: string, body: string) => {
    const cache = await caches.open(cacheName);
    await cache.put(resourcePath, new FakeResponse(body));
  };
  const seedRawMetadata = async (cacheName: string, body: string) => {
    const cache = await caches.open(cacheName);
    await cache.put(CACHE_META_URL, new FakeResponse(body));
  };
  const setCommittedState = async (record: Record<string, unknown>) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hakimi-bazi-release-control", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("releaseState", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("releaseState", "readwrite");
      transaction.objectStore("releaseState").put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  };
  const addWindowClient = (id: string, responder?: FakeClientResponder) => {
    const messages: Array<Record<string, unknown>> = [];
    const client: FakeWindowClient = {
      id,
      messages,
      postMessage: vi.fn((message: Record<string, unknown>, ports?: FakeMessagePort[]) => {
        messages.push(message);
        responder?.(message, ports?.[0]);
      })
    };
    windowClients.set(id, client);
    return client;
  };
  const setWaitingWorker = (waiting: typeof registration.waiting) => {
    registration.waiting = waiting;
  };
  const setActiveWorker = (active: typeof registration.active) => {
    registration.active = active;
  };

  return {
    cacheStore,
    caches,
    claim,
    addWindowClient,
    deleteCache,
    dispatch,
    fetchRequest,
    flushTimerTasks,
    indexedDB,
    matchAllClients,
    seedGeneration,
    seedRawMetadata,
    seedResource,
    seedShell,
    setCommittedState,
    setActiveWorker,
    setWaitingWorker,
    skipWaiting,
    windowClients
  };
}

function committedState(
  descriptor: ReleaseDescriptor,
  buildVersion: string,
  migrationId: string | null = descriptor.migrationId
) {
  const unsigned = {
    id: "current",
    protocolVersion: descriptor.protocolVersion,
    committedGeneration: descriptor.dbGeneration,
    committedDatabaseName: descriptor.databaseName,
    committedSchema: descriptor.targetSchema,
    committedBuild: buildVersion,
    migrationId,
    committedDigest: "a".repeat(64),
    committedAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z"
  };
  const payload = {
    kind: "hakimi-database-generation-commit-receipt@1",
    ...unsigned
  };
  const canonical = JSON.stringify(Object.fromEntries(
    Object.entries(payload).sort(([left], [right]) => left.localeCompare(right))
  ));
  return {
    ...unsigned,
    receiptDigest: createHash("sha256").update(canonical).digest("hex")
  };
}

function bootOkMessage(
  descriptor: ReleaseDescriptor,
  buildVersion: string,
  migrationReceiptDigest: string | null = committedState(descriptor, buildVersion).receiptDigest,
  committedMigrationId: string | null = descriptor.migrationId
) {
  return {
    type: "BOOT_OK",
    buildVersion,
    protocolVersion: descriptor.protocolVersion,
    dbGeneration: descriptor.dbGeneration,
    dbSchemaVersion: descriptor.targetSchema,
    migrationId: descriptor.migrationId,
    committedMigrationId,
    migrationReceiptDigest
  };
}

function prepareMigrationMessage(
  requestId = "freeze-request-1",
  overrides: Record<string, unknown> = {}
) {
  return {
    type: "PREPARE_DATABASE_MIGRATION",
    requestId,
    migrationId: TARGET_DESCRIPTOR.migrationId,
    sourceGeneration: TARGET_DESCRIPTOR.sourceGeneration,
    sourceDatabaseName: TARGET_DESCRIPTOR.sourceDatabaseName,
    sourceSchema: TARGET_DESCRIPTOR.sourceSchema,
    ...overrides
  };
}

function renewMigrationMessage(
  requestId = "freeze-request-1",
  migrationId: string | null = TARGET_DESCRIPTOR.migrationId
) {
  return {
    type: "RENEW_DATABASE_MIGRATION",
    requestId,
    migrationId
  };
}

function resolutionMigrationMessage(
  type: "ABORT_DATABASE_MIGRATION" | "FINISH_DATABASE_MIGRATION",
  requestId = "freeze-request-1",
  overrides: Record<string, unknown> = {}
) {
  return {
    type,
    resolutionProtocolVersion: 1,
    requestId,
    migrationId: TARGET_DESCRIPTOR.migrationId,
    sourceGeneration: TARGET_DESCRIPTOR.sourceGeneration,
    sourceDatabaseName: TARGET_DESCRIPTOR.sourceDatabaseName,
    sourceSchema: TARGET_DESCRIPTOR.sourceSchema,
    targetGeneration: TARGET_DESCRIPTOR.dbGeneration,
    targetDatabaseName: TARGET_DESCRIPTOR.databaseName,
    targetSchema: TARGET_DESCRIPTOR.targetSchema,
    ...overrides
  };
}

function freezeResponder(reason: "SOURCE_CLOSED" | "CLIENT_NOT_SOURCE") {
  return (message: Record<string, unknown>, responsePort: FakeMessagePort | undefined) => {
    if (message.type !== "FREEZE_DATABASE_WRITES") return;
    responsePort?.postMessage({
      type: "DATABASE_WRITES_FROZEN",
      requestId: message.requestId,
      accepted: true,
      reason
    });
  };
}

function rejectFreezeResponder(reason = "LOCK_FAILED") {
  return (message: Record<string, unknown>, responsePort: FakeMessagePort | undefined) => {
    if (message.type !== "FREEZE_DATABASE_WRITES") return;
    responsePort?.postMessage({
      type: "DATABASE_WRITES_FROZEN",
      requestId: message.requestId,
      accepted: false,
      reason
    });
  };
}

function controllerTakeoverFreezeResponder(
  accepted = true,
  reason = accepted ? "WRITES_DRAINED" : "LOCK_FAILED",
  onFreeze?: () => void
): FakeClientResponder {
  return (message, responsePort) => {
    if (message.type !== "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1") return;
    onFreeze?.();
    responsePort?.postMessage({
      type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_ACK_V1",
      requestId: message.requestId,
      sourceBuildVersion: message.sourceBuildVersion,
      targetBuildVersion: message.targetBuildVersion,
      accepted,
      reason
    });
  };
}

function createWaitingTakeoverResponder(
  order: string[] = [],
  targetBuildVersion = "next-build",
  targetRelease: ReleaseDescriptor = BRIDGE_DESCRIPTOR,
  commitReply: "success" | "rejected" | "known_rejected" = "success"
) {
  const messages: Array<Record<string, unknown>> = [];
  const worker = {
    state: "installed",
    scriptURL: `${ORIGIN}/sw.js`,
    postMessage: vi.fn((message: Record<string, unknown>, ports?: FakeMessagePort[]) => {
      messages.push(message);
      if (message.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1") {
        order.push("waiting:prepare");
        ports?.[0]?.postMessage({
          type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_ACK_V1",
          requestId: message.requestId,
          sourceBuildVersion: message.sourceBuildVersion,
          targetBuildVersion,
          targetRelease,
          accepted: true,
          reason: "CHALLENGE_ISSUED",
          challengeNonce: `challenge-${"a".repeat(64)}`
        });
      } else if (message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1") {
        order.push("waiting:commit");
        ports?.[0]?.postMessage({
          type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_ACK_V1",
          requestId: message.requestId,
          sourceBuildVersion: message.sourceBuildVersion,
          targetBuildVersion: message.targetBuildVersion,
          accepted: commitReply === "success",
          reason: commitReply === "success"
            ? "SKIP_WAITING_REQUESTED"
            : commitReply === "known_rejected"
              ? "SKIP_WAITING_FAILED"
              : "ACK_OUTCOME_UNKNOWN"
        });
      } else if (message.type === "ABORT_INSTALLED_GENERATION_ACTIVATION_V1") {
        order.push("waiting:abort");
      }
    })
  };
  return { messages, worker };
}

function draftCleanupResponder(options: {
  matchedDraftCount?: number;
  removedDraftCount?: number;
  failedDraftCount?: number;
  accepted?: boolean;
  reason?: string;
} = {}) {
  return (message: Record<string, unknown>, responsePort: FakeMessagePort | undefined) => {
    if (message.type !== "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS") return;
    const matchedDraftCount = options.matchedDraftCount ?? 0;
    const failedDraftCount = options.failedDraftCount ?? 0;
    responsePort?.postMessage({
      type: "RESEARCH_QUERY_SESSION_DRAFTS_CLEARED",
      requestId: message.requestId,
      accepted: options.accepted ?? failedDraftCount === 0,
      reason: options.reason ?? (failedDraftCount === 0 ? "DRAFTS_CLEARED" : "DRAFTS_PARTIALLY_CLEARED"),
      matchedDraftCount,
      removedDraftCount: options.removedDraftCount ?? matchedDraftCount - failedDraftCount,
      failedDraftCount
    });
  };
}

describe("Service Worker upgrade safety", () => {
  it("安装会预缓存应用壳并把当前代标记为尚未确认，但等待页面受控激活", async () => {
    const harness = await createWorkerHarness();

    await harness.dispatch("install");

    const current = harness.cacheStore.get(CURRENT_CACHE);
    expect(current?.addedRequests).toContain("/");
    expect(current?.addedRequests).toContain("/manifest.webmanifest");
    expect(await current?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      cacheName: CURRENT_CACHE,
      bootAttempted: false,
      bootConfirmed: false,
      ...BRIDGE_DESCRIPTOR
    });
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("预缓存失败会删除残缺本代且不 skipWaiting", async () => {
    const harness = await createWorkerHarness();
    const current = await harness.caches.open(CURRENT_CACHE);
    current.failAddAll = true;

    await expect(harness.dispatch("install")).rejects.toThrow("synthetic precache failure");

    expect(await harness.caches.keys()).not.toContain(CURRENT_CACHE);
    expect(harness.deleteCache).toHaveBeenCalledWith(CURRENT_CACHE);
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("activate 只接管客户端，不删除任何旧 cache", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration("hakimi-shell-stable", 100, true);
    await harness.seedGeneration("hakimi-shell-failed", 200, false);
    await harness.seedGeneration(CURRENT_CACHE, 300, false);

    await harness.dispatch("activate");

    expect(harness.claim).toHaveBeenCalledOnce();
    expect(harness.deleteCache).not.toHaveBeenCalled();
    expect(await harness.caches.keys()).toEqual([
      "hakimi-shell-stable",
      "hakimi-shell-failed",
      CURRENT_CACHE
    ]);
  });

  it("新代入口未发送 BOOT_OK 时，下一次深链导航自动回到最近确认代", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration("hakimi-shell-stable", 100, true);
    await harness.seedShell("hakimi-shell-stable", "stable-shell");
    await harness.seedGeneration(CURRENT_CACHE, 200, false);
    await harness.seedShell(CURRENT_CACHE, "failed-new-shell");
    const request = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/deep-link` };

    await harness.dispatch("activate");
    const firstAttempt = (await harness.dispatch("fetch", { request })) as FakeResponse;
    expect(firstAttempt.body).toBe("failed-new-shell");
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: true,
      bootConfirmed: false
    });

    // 模拟入口 JS 运行失败：两次导航之间没有 BOOT_OK。
    const rollback = (await harness.dispatch("fetch", { request })) as FakeResponse;
    expect(rollback.body).toBe("stable-shell");
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });

  it("旧稳定 shell 回退后，同一客户端继续命中该代的静态图、入口 JS 与 CSS", async () => {
    const harness = await createWorkerHarness();
    const stableCache = "hakimi-shell-stable";
    const clientId = "rolled-back-window";
    await harness.seedGeneration(stableCache, 100, true);
    await harness.seedShell(stableCache, "stable-shell");
    await harness.seedResource(stableCache, "/brand-mark.svg", "stable-brand");
    await harness.seedResource(stableCache, "/assets/app-oldhash.js", "stable-entry-js");
    await harness.seedResource(stableCache, "/assets/app-oldhash.css", "stable-entry-css");
    await harness.seedGeneration(CURRENT_CACHE, 200, false);
    await harness.seedShell(CURRENT_CACHE, "failed-new-shell");
    await harness.seedResource(CURRENT_CACHE, "/brand-mark.svg", "new-brand");

    const navigation = {
      method: "GET",
      mode: "navigate",
      url: `${ORIGIN}/cases/deep-link`
    };
    const firstAttempt = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: clientId
    })) as FakeResponse;
    expect(firstAttempt.body).toBe("failed-new-shell");
    const firstAttemptBrand = (await harness.dispatch("fetch", {
      clientId,
      request: { method: "GET", mode: "no-cors", url: `${ORIGIN}/brand-mark.svg` }
    })) as FakeResponse;
    expect(firstAttemptBrand.body).toBe("new-brand");

    const rollback = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: clientId
    })) as FakeResponse;
    expect(rollback.body).toBe("stable-shell");

    const resources = await Promise.all([
      harness.dispatch("fetch", {
        clientId,
        request: { method: "GET", mode: "no-cors", url: `${ORIGIN}/brand-mark.svg` }
      }),
      harness.dispatch("fetch", {
        clientId,
        request: { method: "GET", mode: "cors", url: `${ORIGIN}/assets/app-oldhash.js` }
      }),
      harness.dispatch("fetch", {
        clientId,
        request: { method: "GET", mode: "cors", url: `${ORIGIN}/assets/app-oldhash.css` }
      })
    ]) as FakeResponse[];

    expect(resources.map((response) => response.body)).toEqual([
      "stable-brand",
      "stable-entry-js",
      "stable-entry-css"
    ]);
    expect(harness.fetchRequest).not.toHaveBeenCalled();
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });

  it("N+1 将回退导航绑定到旧代后，断网也能加载该代懒 chunk", async () => {
    const harness = await createWorkerHarness();
    const stableCache = "hakimi-shell-stable";
    const oldClientId = "already-open-stable-window";
    const oldLazyChunk = "/assets/research-page-oldhash.js";
    await harness.seedGeneration(stableCache, 100, true);
    await harness.seedShell(stableCache, "stable-shell");
    await harness.seedResource(stableCache, oldLazyChunk, "stable-lazy-chunk");
    await harness.seedGeneration(CURRENT_CACHE, 200, false);
    await harness.seedShell(CURRENT_CACHE, "failed-new-shell");

    await harness.dispatch("activate");
    const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/rollback-bind` };
    await harness.dispatch("fetch", { request: navigation, resultingClientId: oldClientId });
    const rollback = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: oldClientId
    })) as FakeResponse;
    expect(rollback.body).toBe("stable-shell");
    await harness.dispatch("message", {
      data: { type: "BOOT_OK", buildVersion: "stable" },
      source: { id: oldClientId }
    });
    const lazyChunk = (await harness.dispatch("fetch", {
      clientId: oldClientId,
      request: { method: "GET", mode: "cors", url: `${ORIGIN}${oldLazyChunk}` }
    })) as FakeResponse;

    expect(harness.claim).toHaveBeenCalledOnce();
    expect(lazyChunk.body).toBe("stable-lazy-chunk");
    expect(harness.fetchRequest).not.toHaveBeenCalled();
    expect(harness.deleteCache).not.toHaveBeenCalled();
    expect(await harness.caches.keys()).toEqual([stableCache, CURRENT_CACHE]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: false
    });
  });

  it("已确认当前代即使在线也固定返回本代壳，避免旧 worker 混入新部署 HTML", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 200, true);
    await harness.seedShell(CURRENT_CACHE, "confirmed-current-shell");
    harness.fetchRequest.mockResolvedValueOnce(new FakeResponse("new-deployment-shell"));

    const response = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/online-deep-link` }
    })) as FakeResponse;

    expect(response.body).toBe("confirmed-current-shell");
    expect(harness.fetchRequest).not.toHaveBeenCalled();
  });

  it("不拦截也不缓存未列入应用壳的同源 GET", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");

    const response = await harness.dispatch("fetch", {
      request: { method: "GET", mode: "cors", url: `${ORIGIN}/api/private-research` }
    });

    expect(response).toBeUndefined();
    expect(harness.fetchRequest).not.toHaveBeenCalled();
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(`${ORIGIN}/api/private-research`)).toBeUndefined();
  });

  it("未知路径不写入任何代缓存，未知 assets 仅按网络请求返回", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    harness.fetchRequest.mockResolvedValueOnce(new FakeResponse("network-only-asset"));

    const unrelated = await harness.dispatch("fetch", {
      request: { method: "GET", mode: "cors", url: `${ORIGIN}/unknown-research-response` }
    });
    const unknownAsset = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "cors", url: `${ORIGIN}/assets/not-preloaded.js` }
    })) as FakeResponse;

    expect(unrelated).toBeUndefined();
    expect(unknownAsset.body).toBe("network-only-asset");
    expect(harness.fetchRequest).toHaveBeenCalledOnce();
    for (const cache of harness.cacheStore.values()) {
      expect(await cache.match(`${ORIGIN}/unknown-research-response`)).toBeUndefined();
      expect(await cache.match(`${ORIGIN}/assets/not-preloaded.js`)).toBeUndefined();
    }
  });

  it("只接受匹配构建号的 BOOT_OK，随后最多保留当前和一个已确认旧版本", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration("hakimi-shell-oldest", 100, true);
    await harness.seedGeneration("hakimi-shell-stable", 200, true);
    await harness.seedGeneration("hakimi-shell-failed-newer", 300, false);
    await harness.seedGeneration(CURRENT_CACHE, 400, false);
    await harness.caches.open("unrelated-runtime-cache");

    await harness.dispatch("message", { data: { type: "BOOT_OK", buildVersion: "wrong-build" } });
    expect(harness.deleteCache).not.toHaveBeenCalled();

    await harness.dispatch("message", { data: { type: "BOOT_OK", buildVersion: CURRENT_VERSION } });

    const shellCaches = (await harness.caches.keys()).filter((name) => name.startsWith("hakimi-shell-"));
    expect(shellCaches).toEqual(["hakimi-shell-stable", CURRENT_CACHE]);
    expect(await harness.caches.keys()).toContain("unrelated-runtime-cache");
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      cacheName: CURRENT_CACHE,
      bootConfirmed: true
    });
  });

  it("只读查询会返回当前 worker 构建号且不改变 cache 元数据", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 200, false);
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: { type: "GET_BUILD_VERSION" },
      ports: [{ postMessage: (message) => posted.push(message) }]
    });

    expect(posted).toEqual([{
      type: "BUILD_VERSION",
      buildVersion: CURRENT_VERSION,
      ...BRIDGE_DESCRIPTOR
    }]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: false,
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });

  it("PR6 只读 challenge 回显 nonce 与真实 event.source.id，且不改变 cache 元数据", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 200, false);
    const challengeNonce = `challenge-${"a".repeat(64)}`;
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: { type: "SW_AB_RUNTIME_CHALLENGE_V1", challengeNonce },
      source: { id: "window-client-from-worker-event" },
      ports: [{ postMessage: (message) => posted.push(message) }]
    });

    expect(posted).toEqual([{
      type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
      challengeNonce,
      sourceClientId: "window-client-from-worker-event",
      buildVersion: CURRENT_VERSION,
      ...BRIDGE_DESCRIPTOR
    }]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: false,
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("PR6 challenge 缺少合格 nonce、source client 或响应端口时静默拒绝", async () => {
    const harness = await createWorkerHarness();
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: { type: "SW_AB_RUNTIME_CHALLENGE_V1", challengeNonce: "challenge-short" },
      source: { id: "window-client" },
      ports: [{ postMessage: (message) => posted.push(message) }]
    });
    await harness.dispatch("message", {
      data: { type: "SW_AB_RUNTIME_CHALLENGE_V1", challengeNonce: `challenge-${"b".repeat(64)}` },
      ports: [{ postMessage: (message) => posted.push(message) }]
    });
    await harness.dispatch("message", {
      data: { type: "SW_AB_RUNTIME_CHALLENGE_V1", challengeNonce: `challenge-${"c".repeat(64)}` },
      source: { id: "window-client" }
    });

    expect(posted).toEqual([]);
    expect(harness.deleteCache).not.toHaveBeenCalled();
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("完整 BOOT_OK 只有在独立控制库提交记录与回执完全匹配后才返回 ACK", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, CURRENT_VERSION));
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, CURRENT_VERSION),
      source: { id: "verified-bridge-client" },
      ports: [{ postMessage: (message) => posted.push(message) }]
    });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      type: "BOOT_OK_ACK",
      accepted: true,
      reason: "CONFIRMED",
      buildVersion: CURRENT_VERSION,
      ...BRIDGE_DESCRIPTOR
    });
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: true,
      bootConfirmed: true
    });
  });

  it("BOOT_OK 的协议字段或迁移回执不匹配时失败关闭并返回拒绝 ACK", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, CURRENT_VERSION));
    const protocolAcks: unknown[] = [];
    const receiptAcks: unknown[] = [];

    await harness.dispatch("message", {
      data: { ...bootOkMessage(BRIDGE_DESCRIPTOR, CURRENT_VERSION), dbSchemaVersion: 14 },
      ports: [{ postMessage: (message) => protocolAcks.push(message) }]
    });
    await harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, CURRENT_VERSION, "sha256:wrong-receipt"),
      ports: [{ postMessage: (message) => receiptAcks.push(message) }]
    });

    expect(protocolAcks).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    })]);
    expect(receiptAcks).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: false,
      reason: "COMMIT_NOT_VERIFIED"
    })]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });

  it("跨 Schema BOOT_OK 强制使用 MessagePort，提交记录匹配后才确认目标代", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.dispatch("install");
    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const message = bootOkMessage(TARGET_DESCRIPTOR, CURRENT_VERSION);

    await harness.dispatch("message", { data: message, source: { id: "target-without-port" } });
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: false
    });

    const posted: unknown[] = [];
    await harness.dispatch("message", {
      data: message,
      source: { id: "target-with-port" },
      ports: [{ postMessage: (ack) => posted.push(ack) }]
    });

    expect(posted).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: true,
      reason: "CONFIRMED",
      dbGeneration: TARGET_DESCRIPTOR.dbGeneration,
      targetSchema: 14
    })]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: true,
      ...TARGET_DESCRIPTOR
    });
  });

  it("新 worker 接管旧页面时也校验旧代 BOOT_OK 回执，不用错误回执绑定旧 cache", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const stableCache = "hakimi-shell-stable";
    await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(stableCache, "stable-shell");
    await harness.seedResource(stableCache, "/assets/stable-lazy.js", "stable-lazy");
    await harness.seedGeneration(CURRENT_CACHE, 200, false, TARGET_DESCRIPTOR);
    await harness.seedShell(CURRENT_CACHE, "target-shell");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const posted: unknown[] = [];
    const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/bind-old-page` };
    await harness.dispatch("fetch", { request: navigation, resultingClientId: "old-page" });
    await harness.dispatch("fetch", { request: navigation, resultingClientId: "old-page" });

    await harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, "stable", "sha256:wrong-receipt"),
      source: { id: "old-page" },
      ports: [{ postMessage: (ack) => posted.push(ack) }]
    });

    expect(posted).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: false,
      reason: "GENERATION_NOT_COMPATIBLE"
    })]);
  });

  it("重发 shell 接受冻结 allowlist 中的旧 committed migrationId，并在 ACK 中保留原谱系", async () => {
    const harness = await createWorkerHarness(REPUBLISHED_TARGET_DESCRIPTOR);
    await harness.dispatch("install");
    const priorMigrationId = TARGET_DESCRIPTOR.migrationId;
    const priorState = committedState(
      REPUBLISHED_TARGET_DESCRIPTOR,
      CURRENT_VERSION,
      priorMigrationId
    );
    await harness.setCommittedState(priorState);
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: bootOkMessage(
        REPUBLISHED_TARGET_DESCRIPTOR,
        CURRENT_VERSION,
        priorState.receiptDigest,
        priorMigrationId
      ),
      source: { id: "already-committed-v1-client" },
      ports: [{ postMessage: (ack) => posted.push(ack) }]
    });

    expect(posted).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: true,
      reason: "CONFIRMED",
      migrationId: REPUBLISHED_TARGET_DESCRIPTOR.migrationId,
      committedMigrationId: priorMigrationId,
      acceptedCommittedMigrationIds: REPUBLISHED_TARGET_DESCRIPTOR.acceptedCommittedMigrationIds
    })]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json()))
      .toMatchObject({ bootAttempted: true, bootConfirmed: true });

    const rejectedHarness = await createWorkerHarness(REPUBLISHED_TARGET_DESCRIPTOR);
    await rejectedHarness.dispatch("install");
    const unknownState = committedState(
      REPUBLISHED_TARGET_DESCRIPTOR,
      CURRENT_VERSION,
      "unaccepted-v0"
    );
    await rejectedHarness.setCommittedState(unknownState);
    const rejected: unknown[] = [];
    await rejectedHarness.dispatch("message", {
      data: bootOkMessage(
        REPUBLISHED_TARGET_DESCRIPTOR,
        CURRENT_VERSION,
        unknownState.receiptDigest,
        "unaccepted-v0"
      ),
      ports: [{ postMessage: (ack) => rejected.push(ack) }]
    });
    expect(rejected).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    })]);
  });

  it("B worker 只对已由回退导航绑定的 A client 接受完整 A BOOT_OK，并返回 A descriptor ACK", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const stableCache = "hakimi-shell-stable";
    const rollbackClientId = "verified-rollback-a-client";
    await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(stableCache, "stable-a-shell");
    await harness.seedGeneration(CURRENT_CACHE, 200, false, TARGET_DESCRIPTOR);
    await harness.seedShell(CURRENT_CACHE, "failed-b-shell");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/rollback-a` };
    await harness.dispatch("fetch", { request: navigation, resultingClientId: rollbackClientId });
    const rollback = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: rollbackClientId
    })) as FakeResponse;
    expect(rollback.body).toBe("stable-a-shell");
    const posted: unknown[] = [];

    await harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, "stable"),
      source: { id: rollbackClientId },
      ports: [{ postMessage: (ack) => posted.push(ack) }]
    });

    expect(posted).toEqual([expect.objectContaining({
      type: "BOOT_OK_ACK",
      accepted: true,
      reason: "PREVIOUS_GENERATION_BOUND",
      buildVersion: "stable",
      ...BRIDGE_DESCRIPTOR
    })]);
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootConfirmed: false
    });
  });

  it("previous BOOT_OK 拒绝未绑定 client、伪造 descriptor 以及提交指针已不兼容的 A client", async () => {
    const createRollbackHarness = async (clientId: string) => {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      const stableCache = "hakimi-shell-stable";
      await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
      await harness.seedShell(stableCache, "stable-a-shell");
      await harness.seedGeneration(CURRENT_CACHE, 200, false, TARGET_DESCRIPTOR);
      await harness.seedShell(CURRENT_CACHE, "failed-b-shell");
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/rollback-guard` };
      return { harness, navigation, clientId };
    };

    const unbound = await createRollbackHarness("unbound-a-client");
    const unboundAcks: unknown[] = [];
    await unbound.harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, "stable"),
      source: { id: unbound.clientId },
      ports: [{ postMessage: (ack) => unboundAcks.push(ack) }]
    });
    expect(unboundAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "CLIENT_NOT_BOUND_TO_GENERATION"
    })]);

    const forged = await createRollbackHarness("forged-a-client");
    await forged.harness.dispatch("fetch", { request: forged.navigation, resultingClientId: forged.clientId });
    await forged.harness.dispatch("fetch", { request: forged.navigation, resultingClientId: forged.clientId });
    const forgedAcks: unknown[] = [];
    await forged.harness.dispatch("message", {
      data: { ...bootOkMessage(BRIDGE_DESCRIPTOR, "stable"), dbSchemaVersion: 12 },
      source: { id: forged.clientId },
      ports: [{ postMessage: (ack) => forgedAcks.push(ack) }]
    });
    expect(forgedAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    })]);

    const incompatible = await createRollbackHarness("incompatible-a-client");
    await incompatible.harness.dispatch("fetch", {
      request: incompatible.navigation,
      resultingClientId: incompatible.clientId
    });
    await incompatible.harness.dispatch("fetch", {
      request: incompatible.navigation,
      resultingClientId: incompatible.clientId
    });
    await incompatible.harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const incompatibleAcks: unknown[] = [];
    await incompatible.harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, "stable"),
      source: { id: incompatible.clientId },
      ports: [{ postMessage: (ack) => incompatibleAcks.push(ack) }]
    });
    expect(incompatibleAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "GENERATION_NOT_COMPATIBLE"
    })]);
  });

  it("目标壳仅在其 source 对应已提交代时试运行，提交切换后不再返回旧壳", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const stableCache = "hakimi-shell-stable";
    await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(stableCache, "stable-v13-shell");
    await harness.seedResource(stableCache, "/brand-mark.svg", "stable-v13-brand");
    await harness.dispatch("install");
    await harness.seedShell(CURRENT_CACHE, "target-v14-shell");
    await harness.seedResource(CURRENT_CACHE, "/brand-mark.svg", "target-v14-brand");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/schema-transition` };

    const trial = (await harness.dispatch("fetch", { request: navigation })) as FakeResponse;
    const rollback = (await harness.dispatch("fetch", { request: navigation })) as FakeResponse;
    expect(trial.body).toBe("target-v14-shell");
    expect(rollback.body).toBe("stable-v13-shell");

    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const committedNavigation = (await harness.dispatch("fetch", { request: navigation })) as FakeResponse;
    const resource = (await harness.dispatch("fetch", {
      clientId: "previously-stable-client",
      request: { method: "GET", mode: "no-cors", url: `${ORIGIN}/brand-mark.svg` }
    })) as FakeResponse;

    expect(committedNavigation.body).toBe("target-v14-shell");
    expect(resource.body).toBe("target-v14-brand");
    expect(resource.body).not.toBe("stable-v13-brand");
  });

  it("缺失、损坏或部分协议 metadata 的壳均失败关闭，旧完整 bridge metadata 仍兼容", async () => {
    for (const metadataBody of [
      undefined,
      "{not-json",
      JSON.stringify({
        cacheName: "hakimi-shell-orphan",
        installedAt: 100,
        bootAttempted: true,
        bootConfirmed: true,
        protocolVersion: 1
      })
    ]) {
      const harness = await createWorkerHarness();
      const orphan = "hakimi-shell-orphan";
      await harness.seedShell(orphan, "must-not-run");
      if (metadataBody !== undefined) await harness.seedRawMetadata(orphan, metadataBody);

      await expect(harness.dispatch("fetch", {
        request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/fail-closed` }
      })).rejects.toThrow("No compatible offline application shell");
      expect(harness.fetchRequest).not.toHaveBeenCalled();
    }

    const bridgeHarness = await createWorkerHarness();
    await bridgeHarness.seedGeneration("hakimi-shell-stable", 100, true);
    await bridgeHarness.seedShell("hakimi-shell-stable", "legacy-metadata-bridge-shell");
    const response = (await bridgeHarness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/bridge-compatible` }
    })) as FakeResponse;
    expect(response.body).toBe("legacy-metadata-bridge-shell");
  });

  it("控制库记录损坏时即使 cache metadata 完整也绝不返回该壳", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(CURRENT_CACHE, "bridge-shell");
    await harness.setCommittedState({
      ...committedState(BRIDGE_DESCRIPTOR, CURRENT_VERSION),
      committedDigest: "b".repeat(64)
    });

    await expect(harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/corrupt-control` }
    })).rejects.toThrow("No compatible offline application shell");
    expect(harness.fetchRequest).not.toHaveBeenCalled();
  });

  it("控制库已提交目标代而目标 cache 缺失时，不把确认过的源代旧壳冒充为可回退壳", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const stableCache = "hakimi-shell-stable";
    await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(stableCache, "incompatible-source-shell");
    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));

    await expect(harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/target-cache-missing` }
    })).rejects.toThrow("No compatible offline application shell");
    expect(harness.fetchRequest).not.toHaveBeenCalled();
  });

  it("完整清空会要求包括发起页在内的全部受控窗口清理临时检索草稿并汇总 ACK", async () => {
    const harness = await createWorkerHarness();
    const initiator = harness.addWindowClient("cleanup-initiator", draftCleanupResponder({
      matchedDraftCount: 2
    }));
    const peer = harness.addWindowClient("cleanup-peer", draftCleanupResponder({
      matchedDraftCount: 1
    }));
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: {
        type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS",
        requestId: "clear-drafts-1"
      },
      source: { id: "cleanup-initiator" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([{
      type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK",
      requestId: "clear-drafts-1",
      accepted: true,
      reason: "ALL_CONTROLLED_WINDOWS_CLEARED",
      requestedClientCount: 2,
      acknowledgedClientCount: 2,
      clearedClientCount: 2,
      matchedDraftCount: 3,
      removedDraftCount: 3,
      failedDraftCount: 0,
      failedClients: []
    }]);
    for (const client of [initiator, peer]) {
      expect(client.messages).toEqual([{
        type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS",
        requestId: "clear-drafts-1"
      }]);
    }
  });

  it("任一受控窗口未 ACK 时返回精确部分完成结果，且不把数据库删除误报为失败", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness();
      const cleared = harness.addWindowClient("cleanup-cleared", draftCleanupResponder({
        matchedDraftCount: 2
      }));
      const timedOut = harness.addWindowClient("cleanup-timeout");
      const acks: unknown[] = [];

      const pending = harness.dispatch("message", {
        data: {
          type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS",
          requestId: "clear-drafts-timeout"
        },
        source: { id: "cleanup-cleared" },
        ports: [{ postMessage: (message) => acks.push(message) }]
      });
      await vi.advanceTimersByTimeAsync(5_000);
      await pending;

      expect(acks).toEqual([{
        type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK",
        requestId: "clear-drafts-timeout",
        accepted: false,
        reason: "CLIENTS_NOT_CONFIRMED",
        requestedClientCount: 2,
        acknowledgedClientCount: 1,
        clearedClientCount: 1,
        matchedDraftCount: 2,
        removedDraftCount: 2,
        failedDraftCount: 0,
        failedClients: [{ clientId: "cleanup-timeout", reason: "CLIENT_TIMEOUT" }]
      }]);
      expect(cleared.messages).toHaveLength(1);
      expect(timedOut.messages).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("跨窗口草稿清理请求缺少来源或 requestId 时拒绝且不触达任何窗口", async () => {
    const harness = await createWorkerHarness();
    const peer = harness.addWindowClient("cleanup-peer", draftCleanupResponder());
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: { type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS", requestId: "" },
      source: { id: "cleanup-initiator" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([expect.objectContaining({
      type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK",
      accepted: false,
      reason: "PROTOCOL_MISMATCH",
      requestedClientCount: 0
    })]);
    expect(peer.messages).toEqual([]);
  });

  it("发起页不在受控窗口枚举中时关闭失败，不把零窗口误报为全部清理", async () => {
    const harness = await createWorkerHarness();
    const peer = harness.addWindowClient("cleanup-peer", draftCleanupResponder());
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: {
        type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS",
        requestId: "clear-drafts-source-missing"
      },
      source: { id: "cleanup-initiator-missing" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([{
      type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK",
      requestId: "clear-drafts-source-missing",
      accepted: false,
      reason: "SOURCE_CLIENT_NOT_ENUMERATED",
      requestedClientCount: 2,
      acknowledgedClientCount: 0,
      clearedClientCount: 0,
      matchedDraftCount: 0,
      removedDraftCount: 0,
      failedDraftCount: 0,
      failedClients: [
        { clientId: "cleanup-initiator-missing", reason: "SOURCE_CLIENT_NOT_ENUMERATED" },
        { clientId: "cleanup-peer", reason: "CLEANUP_NOT_STARTED" }
      ]
    }]);
    expect(peer.messages).toEqual([]);
  });

  it("PREPARE 只有在所有受控旧标签页完成 ACK 后才接受，并区分真正冻结的 source 数量", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const sourceOne = harness.addWindowClient("source-one", freezeResponder("SOURCE_CLOSED"));
    const sourceTwo = harness.addWindowClient("source-two", freezeResponder("SOURCE_CLOSED"));
    const targetPeer = harness.addWindowClient("target-peer", freezeResponder("CLIENT_NOT_SOURCE"));
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: prepareMigrationMessage(),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([expect.objectContaining({
      type: "PREPARE_DATABASE_MIGRATION_ACK",
      requestId: "freeze-request-1",
      migrationId: TARGET_DESCRIPTOR.migrationId,
      accepted: true,
      reason: "ALL_CLIENTS_FROZEN",
      clientCount: 3,
      acknowledgedClientCount: 3,
      frozenClientCount: 2,
      rejectedClientIds: []
    })]);
    for (const client of [sourceOne, sourceTwo, targetPeer]) {
      expect(client.messages).toEqual([expect.objectContaining({
        type: "FREEZE_DATABASE_WRITES",
        requestId: "freeze-request-1",
        migrationId: TARGET_DESCRIPTOR.migrationId,
        sourceGeneration: BRIDGE_DESCRIPTOR.dbGeneration,
        sourceDatabaseName: BRIDGE_DESCRIPTOR.databaseName,
        sourceSchema: 13,
        targetGeneration: TARGET_DESCRIPTOR.dbGeneration,
        targetDatabaseName: TARGET_DESCRIPTOR.databaseName,
        targetSchema: 14
      })]);
    }
  });

  it("冻结会话期间 control 仍指向 source 时，新导航只得到 no-store 503 holding page，不会重新载入 A 壳", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const stableCache = "hakimi-shell-stable";
    await harness.seedGeneration(stableCache, 100, true, BRIDGE_DESCRIPTOR);
    await harness.seedShell(stableCache, "stable-a-shell");
    await harness.seedGeneration(CURRENT_CACHE, 200, false, TARGET_DESCRIPTOR);
    await harness.seedShell(CURRENT_CACHE, "target-b-shell");
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const navigation = { method: "GET", mode: "navigate", url: `${ORIGIN}/cases/during-freeze` };
    const firstTrial = (await harness.dispatch("fetch", { request: navigation })) as FakeResponse;
    expect(firstTrial.body).toBe("target-b-shell");
    const prepareAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: prepareMigrationMessage("holding-navigation-freeze"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (ack) => prepareAcks.push(ack) }]
    });
    expect(prepareAcks[0]).toMatchObject({ accepted: true });

    const held = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: "new-navigation-during-freeze"
    })) as FakeResponse;
    expect(held.status).toBe(503);
    expect(held.body).toContain("正在安全升级本地研究库");
    expect(held.body).not.toContain("stable-a-shell");

    const forgedAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: bootOkMessage(BRIDGE_DESCRIPTOR, "stable"),
      source: { id: "new-navigation-during-freeze" },
      ports: [{ postMessage: (ack) => forgedAcks.push(ack) }]
    });
    expect(forgedAcks[0]).toMatchObject({
      accepted: false,
      reason: "CLIENT_NOT_BOUND_TO_GENERATION"
    });

    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const committed = (await harness.dispatch("fetch", {
      request: navigation,
      resultingClientId: "navigation-after-commit"
    })) as FakeResponse;
    expect(committed.body).toBe("target-b-shell");
  });

  it("任一 client 拒绝时先向所有已请求 peers 广播 abort，再返回失败 ACK", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const frozen = harness.addWindowClient("frozen-source", freezeResponder("SOURCE_CLOSED"));
    const rejected = harness.addWindowClient("rejected-source", rejectFreezeResponder());
    const nonSource = harness.addWindowClient("target-peer", freezeResponder("CLIENT_NOT_SOURCE"));
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: prepareMigrationMessage("freeze-with-rejection"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([expect.objectContaining({
      type: "PREPARE_DATABASE_MIGRATION_ACK",
      requestId: "freeze-with-rejection",
      accepted: false,
      reason: "CLIENT_NOT_FROZEN",
      clientCount: 3,
      acknowledgedClientCount: 2,
      frozenClientCount: 1,
      rejectedClientIds: ["rejected-source"]
    })]);
    for (const client of [frozen, rejected, nonSource]) {
      expect(client.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_ABORTED"
      ]);
      expect(client.messages[1]).toMatchObject({
        migrationId: TARGET_DESCRIPTOR.migrationId,
        targetGeneration: TARGET_DESCRIPTOR.dbGeneration,
        targetDatabaseName: TARGET_DESCRIPTOR.databaseName,
        targetSchema: 14
      });
    }
  });

  it("任一 client 超时同样失败关闭并释放所有可能已经冻结的 peers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const frozen = harness.addWindowClient("frozen-source", freezeResponder("SOURCE_CLOSED"));
      const timedOut = harness.addWindowClient("lost-ack-source");
      const acks: unknown[] = [];

      const pending = harness.dispatch("message", {
        data: prepareMigrationMessage("freeze-with-timeout"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => acks.push(message) }]
      });
      await vi.advanceTimersByTimeAsync(5_000);
      await pending;

      expect(acks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "CLIENT_NOT_FROZEN",
        acknowledgedClientCount: 1,
        frozenClientCount: 1,
        rejectedClientIds: ["lost-ack-source"]
      })]);
      for (const client of [frozen, timedOut]) {
        expect(client.messages.map((message) => message.type)).toEqual([
          "FREEZE_DATABASE_WRITES",
          "DATABASE_MIGRATION_ABORTED"
        ]);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("FINISH 与显式 ABORT 只广播给该次 freeze 快照中的 peers，拒绝错误 sender 或 migrationId", async () => {
    for (const resolution of [
      ["FINISH_DATABASE_MIGRATION", "DATABASE_MIGRATION_COMMITTED"],
      ["ABORT_DATABASE_MIGRATION", "DATABASE_MIGRATION_ABORTED"]
    ] as const) {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      const existingTarget = harness.addWindowClient("existing-target", freezeResponder("CLIENT_NOT_SOURCE"));
      const acks: unknown[] = [];
      await harness.dispatch("message", {
        data: prepareMigrationMessage(`freeze-for-${resolution[0]}`),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => acks.push(message) }]
      });
      expect(acks[0]).toMatchObject({ accepted: true });
      const lateClient = harness.addWindowClient("late-client");
      const requestId = `freeze-for-${resolution[0]}`;

      const wrongSenderAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: resolutionMigrationMessage(resolution[0], requestId),
        source: { id: "other-target-tab" },
        ports: [{ postMessage: (message) => wrongSenderAcks.push(message) }]
      });
      const wrongMigrationAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: resolutionMigrationMessage(resolution[0], requestId, {
          migrationId: "wrong-migration"
        }),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => wrongMigrationAcks.push(message) }]
      });
      expect(wrongSenderAcks).toEqual([expect.objectContaining({
        type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
        accepted: false,
        reason: "MIGRATION_SESSION_NOT_ACTIVE"
      })]);
      expect(wrongMigrationAcks).toEqual([expect.objectContaining({
        type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
        accepted: false,
        reason: "PROTOCOL_MISMATCH"
      })]);
      // Even an otherwise exact command cannot consume the session without a
      // private response port; the caller must be able to prove completion.
      await harness.dispatch("message", {
        data: resolutionMigrationMessage(resolution[0], requestId),
        source: { id: "migration-coordinator" }
      });
      expect(source.messages).toHaveLength(1);
      expect(existingTarget.messages).toHaveLength(1);

      if (resolution[0] === "FINISH_DATABASE_MIGRATION") {
        await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
      }
      const resolutionAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: resolutionMigrationMessage(resolution[0], requestId),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => resolutionAcks.push(message) }]
      });

      expect(resolutionAcks).toEqual([expect.objectContaining({
        type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
        resolutionProtocolVersion: 1,
        accepted: true,
        reason: "RESOLUTION_DISPATCHED",
        requestedCommand: resolution[0],
        effectiveResolution: resolution[1],
        sourceGeneration: TARGET_DESCRIPTOR.sourceGeneration,
        sourceDatabaseName: TARGET_DESCRIPTOR.sourceDatabaseName,
        sourceSchema: TARGET_DESCRIPTOR.sourceSchema,
        targetGeneration: TARGET_DESCRIPTOR.dbGeneration,
        targetDatabaseName: TARGET_DESCRIPTOR.databaseName,
        targetSchema: TARGET_DESCRIPTOR.targetSchema,
        peerClientCount: 2,
        matchedClientCount: 2,
        dispatchedClientCount: 2,
        failedClientIds: [],
        committedReceiptDigest: expect.stringMatching(/^[a-f0-9]{64}$/u)
      })]);

      for (const client of [source, existingTarget]) {
        expect(client.messages.map((message) => message.type)).toEqual([
          "FREEZE_DATABASE_WRITES",
          resolution[1]
        ]);
      }
      expect(lateClient.messages).toEqual([]);
    }
  });

  it("resolution ACK 发送失败后同一精确请求只重放 receipt，不重复广播", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    await harness.dispatch("message", {
      data: prepareMigrationMessage("resolution-ack-replay"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });
    const request = resolutionMigrationMessage(
      "ABORT_DATABASE_MIGRATION",
      "resolution-ack-replay"
    );

    await harness.dispatch("message", {
      data: request,
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => { throw new Error("synthetic resolution ACK loss"); } }]
    });
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_ABORTED"
    ]);

    for (let replay = 0; replay < 2; replay += 1) {
      const replayAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: request,
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => replayAcks.push(message) }]
      });
      expect(replayAcks).toEqual([expect.objectContaining({
        type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
        accepted: true,
        reason: "RESOLUTION_DISPATCHED",
        requestedCommand: "ABORT_DATABASE_MIGRATION",
        effectiveResolution: "DATABASE_MIGRATION_ABORTED"
      })]);
      expect(source.messages.filter(
        (message) => message.type === "DATABASE_MIGRATION_ABORTED"
      )).toHaveLength(1);
    }
  });

  it("terminal receipt 的 requestId 不能被新 PREPARE 会话复用", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    const requestId = "terminal-request-id-reuse";
    await harness.dispatch("message", {
      data: prepareMigrationMessage(requestId),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });
    await harness.dispatch("message", {
      data: resolutionMigrationMessage("ABORT_DATABASE_MIGRATION", requestId),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });

    const reusedPrepareAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: prepareMigrationMessage(requestId),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => reusedPrepareAcks.push(message) }]
    });

    expect(reusedPrepareAcks).toEqual([expect.objectContaining({
      type: "PREPARE_DATABASE_MIGRATION_ACK",
      accepted: false,
      reason: "REQUEST_ID_REUSED"
    })]);
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_ABORTED"
    ]);
  });

  it("source pointer 收到 FINISH 时如实回执 aborted，绝不伪造 committed", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    await harness.dispatch("message", {
      data: prepareMigrationMessage("finish-against-source"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });
    const acks: unknown[] = [];

    await harness.dispatch("message", {
      data: resolutionMigrationMessage("FINISH_DATABASE_MIGRATION", "finish-against-source"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([expect.objectContaining({
      accepted: true,
      requestedCommand: "FINISH_DATABASE_MIGRATION",
      effectiveResolution: "DATABASE_MIGRATION_ABORTED",
      committedGeneration: BRIDGE_DESCRIPTOR.dbGeneration,
      committedDatabaseName: BRIDGE_DESCRIPTOR.databaseName,
      committedSchema: BRIDGE_DESCRIPTOR.targetSchema,
      committedMigrationId: null
    })]);
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_ABORTED"
    ]);
    expect(source.messages.some(
      (message) => message.type === "DATABASE_MIGRATION_COMMITTED"
    )).toBe(false);
  });

  it("未验证 control receipt 时 NACK 并保留 session，修复后同一请求可重试", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const validSourceState = committedState(BRIDGE_DESCRIPTOR, "stable");
    await harness.setCommittedState(validSourceState);
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    await harness.dispatch("message", {
      data: prepareMigrationMessage("resolution-control-retry"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });
    await harness.setCommittedState({ ...validSourceState, receiptDigest: "0".repeat(64) });
    const request = resolutionMigrationMessage(
      "ABORT_DATABASE_MIGRATION",
      "resolution-control-retry"
    );
    const rejectedAcks: unknown[] = [];

    await harness.dispatch("message", {
      data: request,
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => rejectedAcks.push(message) }]
    });
    expect(rejectedAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "CONTROL_STATE_UNVERIFIED"
    })]);
    expect(source.messages.map((message) => message.type)).toEqual(["FREEZE_DATABASE_WRITES"]);

    await harness.setCommittedState(validSourceState);
    const retryAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: request,
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => retryAcks.push(message) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({
      accepted: true,
      effectiveResolution: "DATABASE_MIGRATION_ABORTED"
    })]);
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_ABORTED"
    ]);
  });

  it("协调页消失且未发送 resolution 时，SW 在冻结租约到期后自动 abort 并允许新会话", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      const firstAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: prepareMigrationMessage("orphaned-freeze"),
        source: { id: "crashed-coordinator" },
        ports: [{ postMessage: (message) => firstAcks.push(message) }]
      });
      expect(firstAcks[0]).toMatchObject({ accepted: true });

      await vi.advanceTimersByTimeAsync(30_000);
      await harness.flushTimerTasks();
      expect(source.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_ABORTED"
      ]);

      const secondAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: prepareMigrationMessage("retry-after-lease"),
        source: { id: "replacement-coordinator" },
        ports: [{ postMessage: (message) => secondAcks.push(message) }]
      });
      expect(secondAcks[0]).toMatchObject({ accepted: true, requestId: "retry-after-lease" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("租约到期会 supersede 卡住的旧 resolution，target commit 后绝不迟到广播 aborted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      const requestId = "resolution-lease-epoch-race";
      await harness.dispatch("message", {
        data: prepareMigrationMessage(requestId),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: () => undefined }]
      });

      let releaseOldEnumeration!: () => void;
      const oldEnumerationGate = new Promise<void>((resolve) => {
        releaseOldEnumeration = resolve;
      });
      harness.matchAllClients.mockImplementationOnce(async () => {
        await oldEnumerationGate;
        return [...harness.windowClients.values()];
      });
      const explicitAcks: unknown[] = [];
      const explicitResolution = harness.dispatch("message", {
        data: resolutionMigrationMessage("ABORT_DATABASE_MIGRATION", requestId),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (message) => explicitAcks.push(message) }]
      });
      await vi.waitFor(() => expect(harness.matchAllClients).toHaveBeenCalledTimes(2));

      await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
      await vi.advanceTimersByTimeAsync(30_000);
      await harness.flushTimerTasks();
      expect(source.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_COMMITTED"
      ]);
      expect(source.messages[1]).toMatchObject({
        requestId,
        migrationId: TARGET_DESCRIPTOR.migrationId,
        sourceGeneration: TARGET_DESCRIPTOR.sourceGeneration,
        sourceDatabaseName: TARGET_DESCRIPTOR.sourceDatabaseName,
        sourceSchema: TARGET_DESCRIPTOR.sourceSchema,
        targetGeneration: TARGET_DESCRIPTOR.dbGeneration,
        targetDatabaseName: TARGET_DESCRIPTOR.databaseName,
        targetSchema: TARGET_DESCRIPTOR.targetSchema
      });

      releaseOldEnumeration();
      await explicitResolution;
      expect(explicitAcks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "MIGRATION_SESSION_CANCELLED"
      })]);
      expect(source.messages.some(
        (message) => message.type === "DATABASE_MIGRATION_ABORTED"
      )).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("并发 PREPARE 在 client enumeration 后重新检查会话准入，只冻结一次", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    let releaseFirstEnumeration!: () => void;
    const firstEnumerationGate = new Promise<void>((resolve) => {
      releaseFirstEnumeration = resolve;
    });
    harness.matchAllClients.mockImplementationOnce(async () => {
      await firstEnumerationGate;
      return [...harness.windowClients.values()];
    });
    const firstAcks: unknown[] = [];
    const firstPrepare = harness.dispatch("message", {
      data: prepareMigrationMessage("concurrent-prepare-first"),
      source: { id: "first-coordinator" },
      ports: [{ postMessage: (message) => firstAcks.push(message) }]
    });
    await vi.waitFor(() => expect(harness.matchAllClients).toHaveBeenCalledOnce());

    const secondAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: prepareMigrationMessage("concurrent-prepare-second"),
      source: { id: "second-coordinator" },
      ports: [{ postMessage: (message) => secondAcks.push(message) }]
    });
    expect(secondAcks).toEqual([expect.objectContaining({
      accepted: true,
      requestId: "concurrent-prepare-second"
    })]);

    releaseFirstEnumeration();
    await firstPrepare;
    expect(firstAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "MIGRATION_SESSION_ACTIVE"
    })]);
    expect(source.messages).toHaveLength(1);
    expect(source.messages[0]).toMatchObject({
      type: "FREEZE_DATABASE_WRITES",
      requestId: "concurrent-prepare-second"
    });
  });

  it("同 initiator/requestId/migrationId 可连续续租；旧 deadline 不会终止新 lease，且新标签页也会被冻结", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      await harness.dispatch("message", {
        data: prepareMigrationMessage("renewable-freeze"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: () => undefined }]
      });

      await vi.advanceTimersByTimeAsync(20_000);
      const newlyControlledSource = harness.addWindowClient(
        "new-source-peer",
        freezeResponder("SOURCE_CLOSED")
      );
      const firstRenewAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: renewMigrationMessage("renewable-freeze"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (ack) => firstRenewAcks.push(ack) }]
      });
      expect(firstRenewAcks[0]).toMatchObject({
        type: "RENEW_DATABASE_MIGRATION_ACK",
        accepted: true,
        reason: "LEASE_RENEWED",
        clientCount: 2,
        acknowledgedClientCount: 2,
        frozenClientCount: 2
      });

      await vi.advanceTimersByTimeAsync(20_000);
      const secondRenewAcks: unknown[] = [];
      await harness.dispatch("message", {
        data: renewMigrationMessage("renewable-freeze"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: (ack) => secondRenewAcks.push(ack) }]
      });
      expect(secondRenewAcks[0]).toMatchObject({ accepted: true, reason: "LEASE_RENEWED" });

      await vi.advanceTimersByTimeAsync(10_000);
      expect(source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")).toBe(false);
      expect(newlyControlledSource.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")).toBe(false);

      await vi.advanceTimersByTimeAsync(20_000);
      await harness.flushTimerTasks();
      expect(source.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "FREEZE_DATABASE_WRITES",
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_ABORTED"
      ]);
      expect(newlyControlledSource.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_ABORTED"
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("错误 sender、requestId 或 migrationId 的续租被拒绝且绝不延长原 lease", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      await harness.dispatch("message", {
        data: prepareMigrationMessage("strict-renewal"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: () => undefined }]
      });
      await vi.advanceTimersByTimeAsync(20_000);

      for (const candidate of [
        { message: renewMigrationMessage("strict-renewal"), sourceId: "other-target-tab" },
        { message: renewMigrationMessage("wrong-request"), sourceId: "migration-coordinator" },
        {
          message: renewMigrationMessage("strict-renewal", "wrong-migration"),
          sourceId: "migration-coordinator"
        }
      ]) {
        const acks: unknown[] = [];
        await harness.dispatch("message", {
          data: candidate.message,
          source: { id: candidate.sourceId },
          ports: [{ postMessage: (ack) => acks.push(ack) }]
        });
        expect(acks[0]).toMatchObject({
          type: "RENEW_DATABASE_MIGRATION_ACK",
          accepted: false,
          reason: "PROTOCOL_MISMATCH"
        });
      }
      expect(source.messages.map((message) => message.type)).toEqual(["FREEZE_DATABASE_WRITES"]);

      await vi.advanceTimersByTimeAsync(10_000);
      await harness.flushTimerTasks();
      expect(source.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_ABORTED"
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("control 已提交 target 后续租失败只广播 committed，绝不回退为 aborted", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    let freezeRequestCount = 0;
    const source = harness.addWindowClient("source-peer", (message, responsePort) => {
      if (message.type !== "FREEZE_DATABASE_WRITES") return;
      freezeRequestCount += 1;
      responsePort?.postMessage({
        type: "DATABASE_WRITES_FROZEN",
        requestId: message.requestId,
        accepted: freezeRequestCount === 1,
        reason: freezeRequestCount === 1 ? "SOURCE_CLOSED" : "LOCK_FAILED"
      });
    });
    const prepareAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: prepareMigrationMessage("post-commit-renewal-failure"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => prepareAcks.push(message) }]
    });
    expect(prepareAcks[0]).toMatchObject({ accepted: true });

    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const renewalAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: renewMigrationMessage("post-commit-renewal-failure"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => renewalAcks.push(message) }]
    });

    expect(renewalAcks[0]).toMatchObject({
      type: "RENEW_DATABASE_MIGRATION_ACK",
      accepted: false,
      reason: "CLIENT_NOT_FROZEN"
    });
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_COMMITTED"
    ]);
    expect(source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")).toBe(false);
  });

  it("control 已提交 target 后租约到期只广播 committed，绝不回退为 aborted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
      await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
      const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
      await harness.dispatch("message", {
        data: prepareMigrationMessage("post-commit-lease-expiry"),
        source: { id: "migration-coordinator" },
        ports: [{ postMessage: () => undefined }]
      });

      await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
      await vi.advanceTimersByTimeAsync(30_000);
      await harness.flushTimerTasks();

      expect(source.messages.map((message) => message.type)).toEqual([
        "FREEZE_DATABASE_WRITES",
        "DATABASE_MIGRATION_COMMITTED"
      ]);
      expect(source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("control 已提交 target 后显式 ABORT 也解析为 committed，绝不解冻 source", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    await harness.setCommittedState(committedState(BRIDGE_DESCRIPTOR, "stable"));
    const source = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    await harness.dispatch("message", {
      data: prepareMigrationMessage("post-commit-explicit-abort"),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: () => undefined }]
    });

    await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
    const resolutionAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: resolutionMigrationMessage(
        "ABORT_DATABASE_MIGRATION",
        "post-commit-explicit-abort"
      ),
      source: { id: "migration-coordinator" },
      ports: [{ postMessage: (message) => resolutionAcks.push(message) }]
    });

    expect(resolutionAcks).toEqual([expect.objectContaining({
      type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
      accepted: true,
      requestedCommand: "ABORT_DATABASE_MIGRATION",
      effectiveResolution: "DATABASE_MIGRATION_COMMITTED",
      committedGeneration: TARGET_DESCRIPTOR.dbGeneration,
      committedDatabaseName: TARGET_DESCRIPTOR.databaseName,
      committedSchema: TARGET_DESCRIPTOR.targetSchema,
      committedMigrationId: TARGET_DESCRIPTOR.migrationId
    })]);
    expect(source.messages.map((message) => message.type)).toEqual([
      "FREEZE_DATABASE_WRITES",
      "DATABASE_MIGRATION_COMMITTED"
    ]);
    expect(source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")).toBe(false);
  });

  it("PREPARE descriptor、requestId 或调用 source 不完整时拒绝且不触达任何 peer", async () => {
    const harness = await createWorkerHarness(TARGET_DESCRIPTOR);
    const peer = harness.addWindowClient("source-peer", freezeResponder("SOURCE_CLOSED"));
    const cases = [
      { message: prepareMigrationMessage("", {}), source: { id: "migration-coordinator" } },
      { message: prepareMigrationMessage("x".repeat(129)), source: { id: "migration-coordinator" } },
      {
        message: prepareMigrationMessage("wrong-source-schema", { sourceSchema: 12 }),
        source: { id: "migration-coordinator" }
      },
      { message: prepareMigrationMessage("missing-event-source"), source: undefined }
    ];

    for (const candidate of cases) {
      const acks: unknown[] = [];
      await harness.dispatch("message", {
        data: candidate.message,
        source: candidate.source,
        ports: [{ postMessage: (message) => acks.push(message) }]
      });
      expect(acks).toEqual([expect.objectContaining({
        type: "PREPARE_DATABASE_MIGRATION_ACK",
        accepted: false,
        reason: "PROTOCOL_MISMATCH"
      })]);
    }
    expect(peer.messages).toEqual([]);
  });

  it("legacy 页面直发激活消息没有 skipWaiting 权限", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 200, false);

    await harness.dispatch("message", { data: { type: "ACTIVATE_INSTALLED_GENERATION" } });
    await harness.dispatch("message", { data: { type: "ACTIVATE_INSTALLED_GENERATION" } });

    expect(harness.skipWaiting).not.toHaveBeenCalled();
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: false,
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });

  it("waiting B 只接受同一 active worker 的一次性 challenge/commit 并拒绝重放", async () => {
    const harness = await createWorkerHarness();
    const requestId = "takeover-00000000-0000-4000-8000-000000000001";
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const preparationAcks: Array<Record<string, unknown>> = [];

    let preparationLifetimeSettled = false;
    const preparationLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => preparationAcks.push(message as Record<string, unknown>) }]
    }).then(() => {
      preparationLifetimeSettled = true;
    });
    await vi.waitFor(() => expect(preparationAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "CHALLENGE_ISSUED",
      targetBuildVersion: CURRENT_VERSION,
      targetRelease: BRIDGE_DESCRIPTOR
    })]));
    expect(preparationLifetimeSettled).toBe(false);
    const challengeNonce = preparationAcks[0]?.challengeNonce;
    expect(challengeNonce).toMatch(/^challenge-[a-f0-9]{64}$/u);

    const forgedAcks: unknown[] = [];
    await harness.dispatch("message", {
      data: {
        type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce
      },
      source: {
        scriptURL: `${ORIGIN}/sw.js`,
        state: "activated",
        postMessage: vi.fn()
      },
      ports: [{ postMessage: (message) => forgedAcks.push(message) }]
    });
    expect(forgedAcks).toEqual([expect.objectContaining({ accepted: false })]);
    expect(harness.skipWaiting).not.toHaveBeenCalled();

    const commitAcks: unknown[] = [];
    const commit = {
      type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
      requestId,
      sourceBuildVersion: "previous-build",
      targetBuildVersion: CURRENT_VERSION,
      challengeNonce
    };
    await harness.dispatch("message", {
      data: commit,
      source: activeWorker,
      ports: [{ postMessage: (message) => commitAcks.push(message) }]
    });
    await preparationLifetime;
    expect(preparationLifetimeSettled).toBe(true);
    await harness.dispatch("message", {
      data: commit,
      source: activeWorker,
      ports: [{ postMessage: (message) => commitAcks.push(message) }]
    });

    expect(harness.skipWaiting).toHaveBeenCalledOnce();
    expect(commitAcks).toEqual([
      expect.objectContaining({ accepted: true, reason: "SKIP_WAITING_REQUESTED" }),
      expect.objectContaining({ accepted: false, reason: "PROTOCOL_MISMATCH" })
    ]);
  });

  it("waiting B 的 PREPARE ACK 丢失后在 60 秒租约内拒绝第二项 PREPARE", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness();
      const activeWorker = {
        scriptURL: `${ORIGIN}/sw.js`,
        state: "activated",
        postMessage: vi.fn()
      };
      let firstLifetimeSettled = false;
      const firstLifetime = harness.dispatch("message", {
        data: {
          type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: "takeover-00000000-0000-4000-8000-000000000011",
          sourceBuildVersion: "previous-build",
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: activeWorker,
        // The waiting worker emits the challenge, but the active worker never
        // observes it. Its private pending slot must still remain occupied.
        ports: [{ postMessage: () => undefined }]
      }).then(() => {
        firstLifetimeSettled = true;
      });
      expect(firstLifetimeSettled).toBe(false);

      const retryAcks: Array<Record<string, unknown>> = [];
      await harness.dispatch("message", {
        data: {
          type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: "takeover-00000000-0000-4000-8000-000000000012",
          sourceBuildVersion: "previous-build",
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: activeWorker,
        ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
      });

      expect(retryAcks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "PROTOCOL_MISMATCH",
        challengeNonce: null
      })]);
      expect(harness.skipWaiting).not.toHaveBeenCalled();
      expect(firstLifetimeSettled).toBe(false);

      await vi.advanceTimersByTimeAsync(60_000);
      await firstLifetime;
      expect(firstLifetimeSettled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("waiting B 允许同一 active worker 在未观察 challenge 时认证取消并立即释放槽位", async () => {
    const harness = await createWorkerHarness();
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const lostRequestId = "takeover-00000000-0000-4000-8000-000000000019";
    let lostLifetimeSettled = false;
    const lostLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: lostRequestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: () => undefined }]
    }).then(() => {
      lostLifetimeSettled = true;
    });
    expect(lostLifetimeSettled).toBe(false);

    await harness.dispatch("message", {
      data: {
        type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: lostRequestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: null,
        challengeNonce: null,
        reason: "PREPARATION_ACK_NOT_OBSERVED"
      },
      source: activeWorker
    });
    await lostLifetime;
    expect(lostLifetimeSettled).toBe(true);

    const retryRequestId = "takeover-00000000-0000-4000-8000-000000000020";
    const retryAcks: Array<Record<string, unknown>> = [];
    const retryLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: retryRequestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "CHALLENGE_ISSUED"
    })]);
    await harness.dispatch("message", {
      data: {
        type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: retryRequestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: retryAcks[0]?.challengeNonce,
        reason: "PRECOMMIT_ABORT"
      },
      source: activeWorker
    });
    await retryLifetime;
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("页面调度器在 B 的首个 challenge ACK 真丢失后等待 A 超时、无 challenge 取消并重试同一 B", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const activeA = await createWorkerHarness();
      const waitingB = await createWorkerHarness(BRIDGE_DESCRIPTOR, {
        buildVersion: "next-build",
        cacheStore: activeA.cacheStore,
        indexedDB: activeA.indexedDB
      });
      await activeA.dispatch("install");
      await waitingB.dispatch("install");
      activeA.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());

      const activeAWorkerFacade = {
        scriptURL: `${ORIGIN}/sw.js`,
        state: "activated",
        postMessage: vi.fn()
      };
      const waitingMessages: Array<Record<string, unknown>> = [];
      const waitingDispatchTasks: Array<Promise<unknown>> = [];
      const droppedPreparationAcks: Array<Record<string, unknown>> = [];
      let firstPreparationLifetimeSettled = false;
      let dropFirstPreparationAck = true;

      const trackWaitingDispatch = (
        task: Promise<unknown>,
        message: Record<string, unknown>
      ) => {
        waitingDispatchTasks.push(task);
        if (
          message.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1" &&
          message.requestId === "takeover-00000000-0000-4000-8000-000000000031"
        ) {
          void task.then(() => { firstPreparationLifetimeSettled = true; });
        }
        void task.catch(() => undefined);
      };

      const waitingBFacade = {
        state: "installed" as const,
        scriptURL: `${ORIGIN}/sw.js`,
        postMessage: vi.fn((
          message: Record<string, unknown>,
          ports?: FakeMessagePort[]
        ) => {
          waitingMessages.push(message);
          const bridgedPorts = ports?.map((port) => ({
            postMessage(reply: unknown) {
              const acknowledgement = reply as Record<string, unknown>;
              if (
                dropFirstPreparationAck &&
                message.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1" &&
                acknowledgement.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_ACK_V1" &&
                acknowledgement.accepted === true
              ) {
                dropFirstPreparationAck = false;
                droppedPreparationAcks.push(acknowledgement);
                return;
              }
              port.postMessage(reply);
            }
          }));
          const task = waitingB.dispatch("message", {
            data: message,
            source: activeAWorkerFacade,
            ports: bridgedPorts
          });
          trackWaitingDispatch(task, message);
        })
      };
      activeA.setWaitingWorker(waitingBFacade);

      const pageControllerA = { id: "page-controller-a" };
      const requestIds = [
        "takeover-00000000-0000-4000-8000-000000000031",
        "takeover-00000000-0000-4000-8000-000000000032"
      ];
      const activeDispatchTasks: Array<Promise<unknown>> = [];
      const outerAcks: Array<Record<string, unknown>> = [];
      let requestCount = 0;
      const requestActivation = (
        controller: typeof pageControllerA,
        worker: typeof waitingBFacade
      ): Promise<void> => new Promise((resolve, reject) => {
        expect(controller).toBe(pageControllerA);
        expect(worker).toBe(waitingBFacade);
        const requestId = requestIds[requestCount];
        requestCount += 1;
        if (!requestId) {
          reject(Object.freeze({
            reasonCode: "UNEXPECTED_EXTRA_REQUEST",
            outcome: "commit_outcome_unknown" as const
          }));
          return;
        }
        const task = activeA.dispatch("message", {
          data: {
            type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
            requestId,
            sourceBuildVersion: CURRENT_VERSION,
            sourceRelease: BRIDGE_DESCRIPTOR
          },
          source: { id: "takeover-initiator" },
          ports: [{
            postMessage(reply: unknown) {
              const acknowledgement = reply as Record<string, unknown>;
              outerAcks.push(acknowledgement);
              if (
                acknowledgement.type !== "REQUEST_INSTALLED_GENERATION_ACTIVATION_ACK_V1" ||
                acknowledgement.requestId !== requestId ||
                acknowledgement.sourceBuildVersion !== CURRENT_VERSION
              ) {
                reject(Object.freeze({
                  reasonCode: "INVALID_ACK_IDENTITY",
                  outcome: "commit_outcome_unknown" as const
                }));
                return;
              }
              if (
                acknowledgement.accepted === true &&
                acknowledgement.reason === "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING"
              ) {
                resolve();
                return;
              }
              if (
                acknowledgement.accepted === false &&
                typeof acknowledgement.reason === "string"
              ) {
                reject(controllerTakeoverFailureFromNack(acknowledgement.reason));
                return;
              }
              reject(Object.freeze({
                reasonCode: "INVALID_ACCEPTED_ACK",
                outcome: "commit_outcome_unknown" as const
              }));
            }
          }]
        });
        activeDispatchTasks.push(task);
        void task.catch((reason: unknown) => reject(reason));
      });

      const transitionKinds: string[] = [];
      const scheduler = createControllerTakeoverScheduler({
        clock: {
          setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
          clearTimeout: (timer) => globalThis.clearTimeout(timer)
        },
        getWaitingWorker: () => waitingBFacade,
        getController: () => pageControllerA,
        isWaitingWorkerReady: (worker) => worker.state === "installed",
        requestActivation,
        classifyFailure: (reason): ControllerTakeoverFailure => {
          if (
            typeof reason === "object" &&
            reason !== null &&
            "reasonCode" in reason &&
            "outcome" in reason
          ) return reason as ControllerTakeoverFailure;
          return Object.freeze({
            reasonCode: "UNCLASSIFIED_REQUEST_FAILURE",
            outcome: "commit_outcome_unknown" as const
          });
        },
        onTransition: (transition) => transitionKinds.push(transition.kind)
      });

      scheduler.promoteWaiting();
      await vi.advanceTimersByTimeAsync(0);
      expect(requestCount).toBe(1);
      expect(droppedPreparationAcks).toEqual([expect.objectContaining({
        accepted: true,
        reason: "CHALLENGE_ISSUED",
        sourceBuildVersion: CURRENT_VERSION,
        targetBuildVersion: "next-build",
        challengeNonce: expect.stringMatching(/^challenge-[a-f0-9]{64}$/u)
      })]);
      expect(firstPreparationLifetimeSettled).toBe(false);

      await vi.advanceTimersByTimeAsync(4_999);
      expect(outerAcks).toEqual([]);
      expect(requestCount).toBe(1);
      await vi.advanceTimersByTimeAsync(1);

      expect(outerAcks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "WAITING_PREPARATION_TIMEOUT"
      })]);
      const firstAbort = waitingMessages.find((message) =>
        message.type === "ABORT_INSTALLED_GENERATION_ACTIVATION_V1" &&
        message.requestId === requestIds[0]
      );
      expect(firstAbort).toMatchObject({
        sourceBuildVersion: CURRENT_VERSION,
        targetBuildVersion: null,
        challengeNonce: null,
        reason: "PREPARATION_ACK_NOT_OBSERVED"
      });
      expect(firstPreparationLifetimeSettled).toBe(true);
      expect(waitingMessages.some((message) =>
        message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1" &&
        message.requestId === requestIds[0]
      )).toBe(false);
      expect(scheduler.pendingRetryCount()).toBe(1);

      await vi.advanceTimersByTimeAsync(999);
      expect(requestCount).toBe(1);
      await vi.advanceTimersByTimeAsync(1);

      expect(requestCount).toBe(2);
      expect(waitingMessages.map((message) => ({
        requestId: message.requestId,
        type: message.type
      }))).toEqual([
        { requestId: requestIds[0], type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1" },
        { requestId: requestIds[0], type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1" },
        { requestId: requestIds[1], type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1" },
        { requestId: requestIds[1], type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1" }
      ]);
      expect(waitingB.skipWaiting).toHaveBeenCalledOnce();
      expect(activeA.skipWaiting).not.toHaveBeenCalled();
      expect(outerAcks).toEqual([
        expect.objectContaining({
          accepted: false,
          reason: "WAITING_PREPARATION_TIMEOUT"
        }),
        expect.objectContaining({
          accepted: true,
          reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING",
          targetBuildVersion: "next-build"
        })
      ]);
      expect(scheduler.stateFor(waitingBFacade)).toMatchObject({
        phase: "succeeded",
        attemptsStarted: 2
      });
      expect(scheduler.isClosed()).toBe(true);
      expect(scheduler.pendingRetryCount()).toBe(0);
      expect(transitionKinds).toEqual([
        "attempt_started",
        "retry_scheduled",
        "attempt_started",
        "succeeded"
      ]);

      const waitingResults = await Promise.allSettled(waitingDispatchTasks);
      const activeResults = await Promise.allSettled(activeDispatchTasks);
      expect(waitingResults.every((result) => result.status === "fulfilled")).toBe(true);
      expect(activeResults.every((result) => result.status === "fulfilled")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("waiting B 在 PREPARE 租约到期后拒绝旧 nonce，并允许全新 PREPARE/COMMIT", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness();
      const activeWorker = {
        scriptURL: `${ORIGIN}/sw.js`,
        state: "activated",
        postMessage: vi.fn()
      };
      const expiredRequestId = "takeover-00000000-0000-4000-8000-000000000013";
      const expiredAcks: Array<Record<string, unknown>> = [];
      const expiredLifetime = harness.dispatch("message", {
        data: {
          type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: expiredRequestId,
          sourceBuildVersion: "previous-build",
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: activeWorker,
        ports: [{ postMessage: (message) => expiredAcks.push(message as Record<string, unknown>) }]
      });
      const expiredChallenge = expiredAcks[0]?.challengeNonce;
      expect(expiredChallenge).toMatch(/^challenge-[a-f0-9]{64}$/u);

      await vi.advanceTimersByTimeAsync(60_000);
      await expiredLifetime;
      const staleCommitAcks: Array<Record<string, unknown>> = [];
      await harness.dispatch("message", {
        data: {
          type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: expiredRequestId,
          sourceBuildVersion: "previous-build",
          targetBuildVersion: CURRENT_VERSION,
          challengeNonce: expiredChallenge
        },
        source: activeWorker,
        ports: [{ postMessage: (message) => staleCommitAcks.push(message as Record<string, unknown>) }]
      });
      expect(staleCommitAcks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "PROTOCOL_MISMATCH"
      })]);
      expect(harness.skipWaiting).not.toHaveBeenCalled();

      const freshRequestId = "takeover-00000000-0000-4000-8000-000000000014";
      const freshPreparationAcks: Array<Record<string, unknown>> = [];
      const freshLifetime = harness.dispatch("message", {
        data: {
          type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: freshRequestId,
          sourceBuildVersion: "previous-build",
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: activeWorker,
        ports: [{ postMessage: (message) => freshPreparationAcks.push(message as Record<string, unknown>) }]
      });
      const freshChallenge = freshPreparationAcks[0]?.challengeNonce;
      expect(freshChallenge).toMatch(/^challenge-[a-f0-9]{64}$/u);
      const freshCommitAcks: Array<Record<string, unknown>> = [];
      await harness.dispatch("message", {
        data: {
          type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: freshRequestId,
          sourceBuildVersion: "previous-build",
          targetBuildVersion: CURRENT_VERSION,
          challengeNonce: freshChallenge
        },
        source: activeWorker,
        ports: [{ postMessage: (message) => freshCommitAcks.push(message as Record<string, unknown>) }]
      });
      await freshLifetime;

      expect(harness.skipWaiting).toHaveBeenCalledOnce();
      expect(freshCommitAcks).toEqual([expect.objectContaining({
        accepted: true,
        reason: "SKIP_WAITING_REQUESTED"
      })]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("waiting B 只有认证 ABORT 能释放 pending，且旧 COMMIT 不能迟到激活", async () => {
    const harness = await createWorkerHarness();
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const requestId = "takeover-00000000-0000-4000-8000-000000000015";
    const preparationAcks: Array<Record<string, unknown>> = [];
    let preparationLifetimeSettled = false;
    const preparationLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => preparationAcks.push(message as Record<string, unknown>) }]
    }).then(() => {
      preparationLifetimeSettled = true;
    });
    const challengeNonce = preparationAcks[0]?.challengeNonce;
    expect(challengeNonce).toMatch(/^challenge-[a-f0-9]{64}$/u);

    const abort = {
      type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1",
      requestId,
      sourceBuildVersion: "previous-build",
      targetBuildVersion: CURRENT_VERSION,
      challengeNonce
    };
    await harness.dispatch("message", {
      data: abort,
      source: {
        scriptURL: `${ORIGIN}/sw.js`,
        state: "activated",
        postMessage: vi.fn()
      }
    });
    expect(preparationLifetimeSettled).toBe(false);

    await harness.dispatch("message", { data: abort, source: activeWorker });
    await preparationLifetime;
    expect(preparationLifetimeSettled).toBe(true);

    const lateCommitAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: { ...abort, type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1" },
      source: activeWorker,
      ports: [{ postMessage: (message) => lateCommitAcks.push(message as Record<string, unknown>) }]
    });
    expect(lateCommitAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    })]);
    expect(harness.skipWaiting).not.toHaveBeenCalled();

    const retryAcks: Array<Record<string, unknown>> = [];
    const retryLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000016",
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({ accepted: true })]);
    await harness.dispatch("message", {
      data: {
        type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000016",
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: retryAcks[0]?.challengeNonce
      },
      source: activeWorker
    });
    await retryLifetime;
  });

  it("waiting B 的 skipWaiting 请求 Promise 未完成时 COMMIT 与 PREPARE 生命周期仍结束", async () => {
    const harness = await createWorkerHarness();
    harness.skipWaiting.mockReturnValueOnce(new Promise<undefined>(() => undefined));
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const requestId = "takeover-00000000-0000-4000-8000-000000000023";
    const preparationAcks: Array<Record<string, unknown>> = [];
    const preparationLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => preparationAcks.push(message as Record<string, unknown>) }]
    });
    const commitAcks: Array<Record<string, unknown>> = [];
    const commitLifetime = harness.dispatch("message", {
      data: {
        type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: preparationAcks[0]?.challengeNonce
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => commitAcks.push(message as Record<string, unknown>) }]
    });
    await Promise.all([preparationLifetime, commitLifetime]);
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
    expect(commitAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "SKIP_WAITING_REQUESTED"
    })]);
    expect(harness.claim).not.toHaveBeenCalled();
    expect(harness.cacheStore.size).toBe(0);
  });

  it("waiting B 的 skipWaiting 同步抛错会复位 activationStarted 并允许全新请求", async () => {
    const harness = await createWorkerHarness();
    harness.skipWaiting.mockImplementationOnce(() => {
      throw new Error("synthetic synchronous skipWaiting failure");
    });
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const firstRequestId = "takeover-00000000-0000-4000-8000-000000000017";
    const firstPreparationAcks: Array<Record<string, unknown>> = [];
    const firstLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: firstRequestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => firstPreparationAcks.push(message as Record<string, unknown>) }]
    });
    const firstCommitAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: firstRequestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: firstPreparationAcks[0]?.challengeNonce
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => firstCommitAcks.push(message as Record<string, unknown>) }]
    });
    await firstLifetime;
    expect(firstCommitAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "SKIP_WAITING_FAILED"
    })]);

    const retryRequestId = "takeover-00000000-0000-4000-8000-000000000018";
    const retryPreparationAcks: Array<Record<string, unknown>> = [];
    const retryLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: retryRequestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryPreparationAcks.push(message as Record<string, unknown>) }]
    });
    const retryCommitAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: retryRequestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: retryPreparationAcks[0]?.challengeNonce
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryCommitAcks.push(message as Record<string, unknown>) }]
    });
    await retryLifetime;

    expect(harness.skipWaiting).toHaveBeenCalledTimes(2);
    expect(retryCommitAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "SKIP_WAITING_REQUESTED"
    })]);
  });

  it("waiting B 的 skipWaiting 异步拒绝不复位、不补发 NACK 且不重复请求", async () => {
    const harness = await createWorkerHarness();
    let rejectActivation!: (reason: Error) => void;
    harness.skipWaiting.mockReturnValueOnce(new Promise<undefined>((_resolve, reject) => {
      rejectActivation = reject;
    }));
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const requestId = "takeover-00000000-0000-4000-8000-000000000024";
    const preparationAcks: Array<Record<string, unknown>> = [];
    const preparationLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => preparationAcks.push(message as Record<string, unknown>) }]
    });
    const commitAcks: Array<Record<string, unknown>> = [];
    const commit = {
      type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
      requestId,
      sourceBuildVersion: "previous-build",
      targetBuildVersion: CURRENT_VERSION,
      challengeNonce: preparationAcks[0]?.challengeNonce
    };
    await harness.dispatch("message", {
      data: commit,
      source: activeWorker,
      ports: [{ postMessage: (message) => commitAcks.push(message as Record<string, unknown>) }]
    });
    await preparationLifetime;
    rejectActivation(new Error("synthetic asynchronous skipWaiting rejection"));
    await Promise.resolve();
    expect(commitAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "SKIP_WAITING_REQUESTED"
    })]);
    const retryAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: { ...commit, type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1", sourceRelease: BRIDGE_DESCRIPTOR },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    await harness.dispatch("message", {
      data: commit,
      source: activeWorker,
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toHaveLength(2);
    expect(retryAcks.every((ack) => ack.accepted === false && ack.reason === "PROTOCOL_MISMATCH")).toBe(true);
    expect(commitAcks).toHaveLength(1);
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
    expect(harness.claim).not.toHaveBeenCalled();
    expect(harness.cacheStore.size).toBe(0);
  });

  it("waiting B 的 skipWaiting 返回后即使 ACK 发送失败也绝不复位或伪造 known rejection", async () => {
    const harness = await createWorkerHarness();
    const activeWorker = {
      scriptURL: `${ORIGIN}/sw.js`,
      state: "activated",
      postMessage: vi.fn()
    };
    const requestId = "takeover-00000000-0000-4000-8000-000000000021";
    const preparationAcks: Array<Record<string, unknown>> = [];
    const preparationLifetime = harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => preparationAcks.push(message as Record<string, unknown>) }]
    });
    const acknowledgementFailure = new Error("synthetic success ACK transport failure");
    await expect(harness.dispatch("message", {
      data: {
        type: "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId,
        sourceBuildVersion: "previous-build",
        targetBuildVersion: CURRENT_VERSION,
        challengeNonce: preparationAcks[0]?.challengeNonce
      },
      source: activeWorker,
      ports: [{ postMessage: () => { throw acknowledgementFailure; } }]
    })).resolves.toBeUndefined();
    await preparationLifetime;
    expect(harness.skipWaiting).toHaveBeenCalledOnce();

    const retryAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000022",
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: activeWorker,
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "PROTOCOL_MISMATCH",
      challengeNonce: null
    })]);
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
  });

  it("页面伪造 waiting preparation 即使字段完整也不能取得 challenge", async () => {
    const harness = await createWorkerHarness();
    const acks: unknown[] = [];
    await harness.dispatch("message", {
      data: {
        type: "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000002",
        sourceBuildVersion: "previous-build",
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "forged-window-client" },
      ports: [{ postMessage: (message) => acks.push(message) }]
    });

    expect(acks).toEqual([expect.objectContaining({
      accepted: false,
      challengeNonce: null
    })]);
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("active A 在全部 client 排空后才把一次性 commit 发给 waiting B，并在期间阻止新导航", async () => {
    const harness = await createWorkerHarness();
    const order: string[] = [];
    const initiator = harness.addWindowClient(
      "takeover-initiator",
      controllerTakeoverFreezeResponder(true, "WRITES_DRAINED", () => order.push("freeze:initiator"))
    );
    harness.addWindowClient(
      "takeover-peer",
      controllerTakeoverFreezeResponder(true, "WRITES_DRAINED", () => order.push("freeze:peer"))
    );
    const waiting = createWaitingTakeoverResponder(order);
    harness.setWaitingWorker(waiting.worker);
    const acks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000003",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: initiator.id },
      ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
    });

    expect(order).toEqual([
      "waiting:prepare",
      "freeze:initiator",
      "freeze:peer",
      "waiting:commit"
    ]);
    expect(acks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING",
      clientCount: 2,
      frozenClientCount: 2,
      rejectedClientIds: []
    })]);
    expect(initiator.messages[0]).toMatchObject({
      type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1",
      sourceBuildVersion: CURRENT_VERSION,
      targetBuildVersion: "next-build",
      sourceRelease: BRIDGE_DESCRIPTOR,
      targetRelease: BRIDGE_DESCRIPTOR
    });
    expect(harness.matchAllClients).toHaveBeenCalledWith({
      type: "window",
      includeUncontrolled: true
    });
    const heldNavigation = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "new-navigation"
    })) as FakeResponse;
    expect(heldNavigation.status).toBe(503);
    expect(heldNavigation.body).toContain("正在安全切换离线版本");
    expect(heldNavigation.body).toContain("FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_ACK_V1");
    expect(heldNavigation.body).toContain("event.source!==controller");
    expect(heldNavigation.body).not.toContain('http-equiv="refresh"');
    const holdingScript = heldNavigation.body.match(/<script>([\s\S]+)<\/script>/u)?.[1];
    expect(holdingScript).toBeTruthy();
    const holdingController = {};
    const holdingListeners = new Map<string, (...args: unknown[]) => void>();
    const reloadHoldingDocument = vi.fn();
    const scheduleHoldingFallback = vi.fn();
    runInNewContext(holdingScript ?? "", {
      navigator: {
        serviceWorker: {
          controller: holdingController,
          addEventListener: (type: string, listener: (...args: unknown[]) => void) => {
            holdingListeners.set(type, listener);
          }
        }
      },
      window: {
        location: { reload: reloadHoldingDocument },
        setTimeout: scheduleHoldingFallback
      }
    });
    const holdingMessage = holdingListeners.get("message");
    expect(holdingMessage).toBeTypeOf("function");
    const holdingAck = vi.fn();
    const exactFreezeMessage = {
      type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1",
      requestId: "takeover-00000000-0000-4000-8000-000000000003",
      sourceBuildVersion: CURRENT_VERSION,
      targetBuildVersion: "next-build",
      sourceRelease: BRIDGE_DESCRIPTOR,
      targetRelease: BRIDGE_DESCRIPTOR
    };
    holdingMessage?.({ data: exactFreezeMessage, source: {}, ports: [{ postMessage: holdingAck }] });
    expect(holdingAck).not.toHaveBeenCalled();
    holdingMessage?.({
      data: exactFreezeMessage,
      source: holdingController,
      ports: [{ postMessage: holdingAck }]
    });
    expect(holdingAck).toHaveBeenCalledWith({
      type: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_ACK_V1",
      requestId: exactFreezeMessage.requestId,
      sourceBuildVersion: CURRENT_VERSION,
      targetBuildVersion: "next-build",
      accepted: true,
      reason: "WRITES_DRAINED"
    });
    holdingMessage?.({
      data: {
        type: "RELEASE_CONTROLLER_TAKEOVER_HOLDING_DOCUMENT_V1",
        requestId: exactFreezeMessage.requestId,
        sourceBuildVersion: CURRENT_VERSION
      },
      source: holdingController,
      ports: []
    });
    expect(reloadHoldingDocument).toHaveBeenCalledOnce();
    expect(scheduleHoldingFallback).toHaveBeenCalledWith(expect.any(Function), 65_000);
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("client 集合在冻结中增长时继续冻结新 client，稳定前不 commit", async () => {
    const harness = await createWorkerHarness();
    const order: string[] = [];
    let lateAdded = false;
    harness.addWindowClient(
      "takeover-initiator",
      controllerTakeoverFreezeResponder(true, "WRITES_DRAINED", () => {
        order.push("freeze:initiator");
        if (!lateAdded) {
          lateAdded = true;
          harness.addWindowClient(
            "late-controlled-client",
            controllerTakeoverFreezeResponder(true, "WRITES_DRAINED", () => order.push("freeze:late"))
          );
        }
      })
    );
    const waiting = createWaitingTakeoverResponder(order);
    harness.setWaitingWorker(waiting.worker);
    const acks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000004",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
    });

    expect(order).toEqual([
      "waiting:prepare",
      "freeze:initiator",
      "freeze:late",
      "waiting:commit"
    ]);
    expect(acks).toEqual([expect.objectContaining({
      accepted: true,
      clientCount: 2,
      frozenClientCount: 2
    })]);
  });

  it("任一 client NACK 时不 commit、不 skipWaiting，并清除导航 holding", async () => {
    const harness = await createWorkerHarness();
    const order: string[] = [];
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    harness.addWindowClient("rejecting-peer", controllerTakeoverFreezeResponder(false, "LOCK_FAILED"));
    const holdingDocument = harness.addWindowClient(
      "takeover-holding-document",
      controllerTakeoverFreezeResponder()
    );
    const waiting = createWaitingTakeoverResponder(order);
    harness.setWaitingWorker(waiting.worker);
    const acks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000005",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
    });

    expect(order).toEqual(["waiting:prepare", "waiting:abort"]);
    expect(waiting.messages.some((message) =>
      message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"
    )).toBe(false);
    expect(acks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "CLIENT_NOT_FROZEN",
      frozenClientCount: 2,
      rejectedClientIds: ["rejecting-peer"]
    })]);
    expect(holdingDocument.messages).toContainEqual(expect.objectContaining({
      type: "RELEASE_CONTROLLER_TAKEOVER_HOLDING_DOCUMENT_V1",
      requestId: "takeover-00000000-0000-4000-8000-000000000005",
      sourceBuildVersion: CURRENT_VERSION
    }));
    expect(harness.skipWaiting).not.toHaveBeenCalled();
    harness.fetchRequest.mockResolvedValueOnce(new FakeResponse("network after safe abort"));
    const navigationAfterAbort = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "navigation-after-safe-abort"
    })) as FakeResponse;
    expect(navigationAfterAbort.status).toBe(200);
    expect(navigationAfterAbort.body).toBe("network after safe abort");
    harness.windowClients.delete("rejecting-peer");
    const retryAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000009",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({
      accepted: true,
      reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING"
    })]);
    expect(order).toEqual([
      "waiting:prepare",
      "waiting:abort",
      "waiting:prepare",
      "waiting:commit"
    ]);
  });

  it("同 schema takeover 拒绝借 source 指针绕入跨 schema migration descriptor", async () => {
    const harness = await createWorkerHarness();
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const order: string[] = [];
    const waiting = createWaitingTakeoverResponder(order, "next-build", TARGET_DESCRIPTOR);
    harness.setWaitingWorker(waiting.worker);
    const acks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000006",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
    });

    expect(order).toEqual(["waiting:prepare", "waiting:abort"]);
    expect(waiting.messages).toContainEqual(expect.objectContaining({
      type: "ABORT_INSTALLED_GENERATION_ACTIVATION_V1",
      targetBuildVersion: null,
      challengeNonce: null,
      reason: "PREPARATION_ACK_NOT_OBSERVED"
    }));
    expect(acks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "WAITING_PREPARATION_REJECTED",
      frozenClientCount: 0
    })]);
    expect(waiting.messages.some((message) =>
      message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"
    )).toBe(false);
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it("commit 已发出但 ACK 不可信时永久保持 A 导航 holding，不回到旧壳", async () => {
    const harness = await createWorkerHarness();
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const order: string[] = [];
    const waiting = createWaitingTakeoverResponder(
      order,
      "next-build",
      BRIDGE_DESCRIPTOR,
      "rejected"
    );
    harness.setWaitingWorker(waiting.worker);
    const acks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000007",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
    });

    expect(order).toEqual(["waiting:prepare", "waiting:commit"]);
    expect(acks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "WAITING_COMMIT_OUTCOME_UNKNOWN"
    })]);
    const heldNavigation = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "post-commit-uncertain-navigation"
    })) as FakeResponse;
    expect(heldNavigation.status).toBe(503);
    expect(heldNavigation.body).toContain("正在安全切换离线版本");
    expect(waiting.messages.filter((message) =>
      message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"
    )).toHaveLength(1);
    const restartedA = await createWorkerHarness(BRIDGE_DESCRIPTOR, {
      cacheStore: harness.cacheStore
    });
    const heldAfterWorkerRestart = (await restartedA.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "post-restart-uncertain-navigation"
    })) as FakeResponse;
    expect(heldAfterWorkerRestart.status).toBe(503);
    expect(restartedA.fetchRequest).not.toHaveBeenCalled();

    await restartedA.dispatch("install");
    expect(
      await restartedA.cacheStore.get(CURRENT_CACHE)?.match(CONTROLLER_TAKEOVER_HOLD_URL)
    ).toBeUndefined();
    const exactARollbackNavigation = (await restartedA.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "exact-a-rollback-navigation"
    })) as FakeResponse;
    expect(exactARollbackNavigation.status).toBe(200);
    expect(exactARollbackNavigation.body).not.toContain("正在安全切换离线版本");
  });

  it("waiting commit 成功后页面 success ACK 发送失败只能降级为 outcome unknown", async () => {
    const harness = await createWorkerHarness();
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const order: string[] = [];
    const waiting = createWaitingTakeoverResponder(order);
    harness.setWaitingWorker(waiting.worker);
    const deliveredAcks: Array<Record<string, unknown>> = [];
    let ackPostAttempts = 0;

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000017",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{
        postMessage: (message) => {
          ackPostAttempts += 1;
          if (ackPostAttempts === 1) {
            const spoofedKnownRejection = new Error("synthetic outer success ACK transport failure");
            spoofedKnownRejection.name = "WaitingCommitKnownRejectedError";
            throw spoofedKnownRejection;
          }
          deliveredAcks.push(message as Record<string, unknown>);
        }
      }]
    });

    expect(order).toEqual(["waiting:prepare", "waiting:commit"]);
    expect(ackPostAttempts).toBe(2);
    expect(deliveredAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "WAITING_COMMIT_OUTCOME_UNKNOWN"
    })]);
    const heldNavigation = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "success-ack-transport-failed-navigation"
    })) as FakeResponse;
    expect(heldNavigation.status).toBe(503);
    expect(heldNavigation.body).toContain("正在安全切换离线版本");
  });

  it("waiting B 明确证明 commit 未启动时清除 holding，并允许新的精确请求重试", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const order: string[] = [];
    harness.setWaitingWorker(createWaitingTakeoverResponder(
      order,
      "next-build",
      BRIDGE_DESCRIPTOR,
      "known_rejected"
    ).worker);
    const firstAcks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000009",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => firstAcks.push(message as Record<string, unknown>) }]
    });

    expect(firstAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED"
    })]);
    expect(order).toEqual(["waiting:prepare", "waiting:commit", "waiting:abort"]);
    expect(
      await harness.cacheStore.get(CURRENT_CACHE)?.match(CONTROLLER_TAKEOVER_HOLD_URL)
    ).toBeUndefined();
    const navigationAfterKnownRejection = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/cases` },
      resultingClientId: "known-rejection-navigation"
    })) as FakeResponse;
    expect(navigationAfterKnownRejection.status).toBe(200);
    expect(navigationAfterKnownRejection.body).not.toContain("正在安全切换离线版本");

    const retryOrder: string[] = [];
    harness.setWaitingWorker(createWaitingTakeoverResponder(retryOrder).worker);
    const retryAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000010",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryOrder).toEqual(["waiting:prepare", "waiting:commit"]);
    expect(retryAcks).toEqual([expect.objectContaining({ accepted: true })]);
  });

  it("两个合法 REQUEST 同时等待 CacheStorage admission 时只允许一项进入，另一项固定返回 busy", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const order: string[] = [];
    harness.setWaitingWorker(createWaitingTakeoverResponder(order).worker);

    const originalKeys = harness.caches.keys.bind(harness.caches);
    let releaseLookup!: () => void;
    const lookupGate = new Promise<void>((resolve) => {
      releaseLookup = resolve;
    });
    const keysSpy = vi.spyOn(harness.caches, "keys").mockImplementation(async () => {
      await lookupGate;
      return originalKeys();
    });
    const firstAcks: Array<Record<string, unknown>> = [];
    const secondAcks: Array<Record<string, unknown>> = [];
    const firstRequest = harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000020",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => firstAcks.push(message as Record<string, unknown>) }]
    });
    const secondRequest = harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000021",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => secondAcks.push(message as Record<string, unknown>) }]
    });

    await vi.waitFor(() => expect(keysSpy).toHaveBeenCalledTimes(2));
    expect(firstAcks).toEqual([]);
    expect(secondAcks).toEqual([]);
    releaseLookup();
    await Promise.all([firstRequest, secondRequest]);

    const allAcks = [...firstAcks, ...secondAcks];
    expect(allAcks).toHaveLength(2);
    expect(allAcks.filter((ack) => ack.accepted === true)).toEqual([
      expect.objectContaining({ reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING" })
    ]);
    expect(allAcks.filter((ack) => ack.accepted === false)).toEqual([
      expect.objectContaining({ reason: "TAKEOVER_SESSION_BUSY" })
    ]);
    expect(order).toEqual(["waiting:prepare", "waiting:commit"]);
  });

  it.each(["keys", "open", "match"] as const)(
    "CacheStorage %s admission 状态未知时使用固定 NACK，并保持导航 503",
    async (failurePoint) => {
      const harness = await createWorkerHarness();
      await harness.dispatch("install");
      const currentCache = await harness.caches.open(CURRENT_CACHE);
      harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
      const waiting = createWaitingTakeoverResponder();
      harness.setWaitingWorker(waiting.worker);
      const rawFailure = `synthetic private ${failurePoint} failure detail`;

      if (failurePoint === "keys") {
        vi.spyOn(harness.caches, "keys").mockRejectedValue(new Error(rawFailure));
      } else if (failurePoint === "open") {
        vi.spyOn(harness.caches, "open").mockRejectedValue(new Error(rawFailure));
      } else {
        currentCache.matchEffect = (key, read) => {
          if (key === CONTROLLER_TAKEOVER_HOLD_URL) throw new Error(rawFailure);
          return read();
        };
      }

      const acks: Array<Record<string, unknown>> = [];
      await harness.dispatch("message", {
        data: {
          type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: `takeover-00000000-0000-4000-8000-00000000002${failurePoint.length}`,
          sourceBuildVersion: CURRENT_VERSION,
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: { id: "takeover-initiator" },
        ports: [{ postMessage: (message) => acks.push(message as Record<string, unknown>) }]
      });

      expect(acks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "TAKEOVER_HOLD_STATUS_UNKNOWN"
      })]);
      expect(JSON.stringify(acks)).not.toContain(rawFailure);
      expect(waiting.messages).toEqual([]);

      const heldNavigation = (await harness.dispatch("fetch", {
        request: { method: "GET", mode: "navigate", url: `${ORIGIN}/hold-status-unknown-${failurePoint}` },
        resultingClientId: `hold-status-unknown-${failurePoint}`
      })) as FakeResponse;
      expect(heldNavigation.status).toBe(503);
      expect(heldNavigation.body).toContain("正在安全切换离线版本");
      expect(harness.fetchRequest).not.toHaveBeenCalled();
    }
  );

  it("持久 hold 的 put 跨过 preparation timeout 时，abort 等待写入结束并验证清除后才恢复", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const harness = await createWorkerHarness();
      await harness.dispatch("install");
      const currentCache = await harness.caches.open(CURRENT_CACHE);
      const order: string[] = [];
      harness.addWindowClient(
        "takeover-initiator",
        controllerTakeoverFreezeResponder(true, "WRITES_DRAINED", () => order.push("freeze:initiator"))
      );
      const waiting = createWaitingTakeoverResponder(order);
      harness.setWaitingWorker(waiting.worker);

      let notifyHoldPutStarted: (() => void) | undefined;
      const holdPutStarted = new Promise<void>((resolve) => {
        notifyHoldPutStarted = resolve;
      });
      let releaseHoldPut: (() => void) | undefined;
      currentCache.putEffect = (key, _response, commit) => {
        if (key !== CONTROLLER_TAKEOVER_HOLD_URL) {
          commit();
          return;
        }
        order.push("hold:put_started");
        notifyHoldPutStarted?.();
        return new Promise<void>((resolve) => {
          releaseHoldPut = () => {
            order.push("hold:put_committed");
            commit();
            resolve();
          };
        });
      };
      currentCache.deleteEffect = (key, remove) => {
        if (key === CONTROLLER_TAKEOVER_HOLD_URL) order.push("hold:delete");
        return remove();
      };
      const firstAcks: Array<Record<string, unknown>> = [];
      const firstRequest = harness.dispatch("message", {
        data: {
          type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: "takeover-00000000-0000-4000-8000-000000000011",
          sourceBuildVersion: CURRENT_VERSION,
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: { id: "takeover-initiator" },
        ports: [{ postMessage: (message) => firstAcks.push(message as Record<string, unknown>) }]
      });

      await holdPutStarted;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(order).toEqual([
        "waiting:prepare",
        "freeze:initiator",
        "hold:put_started",
        "waiting:abort"
      ]);
      expect(firstAcks).toEqual([]);
      expect(currentCache.entries.has(CONTROLLER_TAKEOVER_HOLD_URL)).toBe(false);

      const heldDuringAbort = (await harness.dispatch("fetch", {
        request: { method: "GET", mode: "navigate", url: `${ORIGIN}/during-delayed-hold-put` },
        resultingClientId: "navigation-during-delayed-hold-put"
      })) as FakeResponse;
      expect(heldDuringAbort.status).toBe(503);
      expect(harness.fetchRequest).not.toHaveBeenCalled();

      const prematureRetryAcks: Array<Record<string, unknown>> = [];
      await harness.dispatch("message", {
        data: {
          type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: "takeover-00000000-0000-4000-8000-000000000012",
          sourceBuildVersion: CURRENT_VERSION,
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: { id: "takeover-initiator" },
        ports: [{ postMessage: (message) => prematureRetryAcks.push(message as Record<string, unknown>) }]
      });
      expect(prematureRetryAcks).toEqual([expect.objectContaining({
        accepted: false,
        reason: "TAKEOVER_SESSION_BUSY"
      })]);
      expect(order).not.toContain("hold:delete");

      currentCache.putEffect = null;
      releaseHoldPut?.();
      await firstRequest;
      expect(order).toEqual([
        "waiting:prepare",
        "freeze:initiator",
        "hold:put_started",
        "waiting:abort",
        "hold:put_committed",
        "hold:delete"
      ]);
      expect(firstAcks).toEqual([expect.objectContaining({ accepted: false })]);
      expect(await currentCache.match(CONTROLLER_TAKEOVER_HOLD_URL)).toBeUndefined();

      currentCache.deleteEffect = null;
      const navigationAfterCleanup = (await harness.dispatch("fetch", {
        request: { method: "GET", mode: "navigate", url: `${ORIGIN}/after-delayed-hold-cleanup` },
        resultingClientId: "navigation-after-delayed-hold-cleanup"
      })) as FakeResponse;
      expect(navigationAfterCleanup.status).toBe(200);
      expect(navigationAfterCleanup.body).not.toContain("正在安全切换离线版本");

      const retryAcks: Array<Record<string, unknown>> = [];
      harness.setWaitingWorker(createWaitingTakeoverResponder().worker);
      await harness.dispatch("message", {
        data: {
          type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
          requestId: "takeover-00000000-0000-4000-8000-000000000013",
          sourceBuildVersion: CURRENT_VERSION,
          sourceRelease: BRIDGE_DESCRIPTOR
        },
        source: { id: "takeover-initiator" },
        ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
      });
      expect(retryAcks).toEqual([expect.objectContaining({
        accepted: true,
        reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING"
      })]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("持久 hold 的 put 已落盘后抛错时，abort 删除并验证 absence 后才恢复和允许重试", async () => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    const currentCache = await harness.caches.open(CURRENT_CACHE);
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const waiting = createWaitingTakeoverResponder();
    harness.setWaitingWorker(waiting.worker);
    currentCache.putEffect = (key, _response, commit) => {
      commit();
      if (key === CONTROLLER_TAKEOVER_HOLD_URL) {
        throw new Error("synthetic hold put outcome unknown");
      }
    };
    const firstAcks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000014",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => firstAcks.push(message as Record<string, unknown>) }]
    });

    expect(firstAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "TAKEOVER_HOLD_PERSIST_FAILED"
    })]);
    expect(JSON.stringify(firstAcks)).not.toContain("synthetic hold put outcome unknown");
    expect(waiting.messages.some((message) =>
      message.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"
    )).toBe(false);
    expect(await currentCache.match(CONTROLLER_TAKEOVER_HOLD_URL)).toBeUndefined();

    currentCache.putEffect = null;
    const navigationAfterCleanup = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/after-ambiguous-put-cleanup` },
      resultingClientId: "navigation-after-ambiguous-put-cleanup"
    })) as FakeResponse;
    expect(navigationAfterCleanup.status).toBe(200);
    expect(navigationAfterCleanup.body).not.toContain("正在安全切换离线版本");

    const retryAcks: Array<Record<string, unknown>> = [];
    harness.setWaitingWorker(createWaitingTakeoverResponder().worker);
    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000015",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => retryAcks.push(message as Record<string, unknown>) }]
    });
    expect(retryAcks).toEqual([expect.objectContaining({ accepted: true })]);
  });

  it.each([
    {
      failure: "delete 抛错",
      restartReason: "TAKEOVER_HOLD_PRESENT",
      configure(cache: FakeCache) {
        cache.deleteEffect = (key, remove) => {
          if (key === CONTROLLER_TAKEOVER_HOLD_URL) throw new Error("synthetic hold delete failure");
          return remove();
        };
      }
    },
    {
      failure: "delete 返回但 marker 残留",
      restartReason: "TAKEOVER_HOLD_PRESENT",
      configure(cache: FakeCache) {
        cache.deleteEffect = (key, remove) =>
          key === CONTROLLER_TAKEOVER_HOLD_URL ? false : remove();
      }
    },
    {
      failure: "cleanup match 抛错",
      restartReason: "TAKEOVER_HOLD_STATUS_UNKNOWN",
      configure(cache: FakeCache) {
        let cleanupDeleteCompleted = false;
        cache.deleteEffect = (key, remove) => {
          const removed = remove();
          if (key === CONTROLLER_TAKEOVER_HOLD_URL) cleanupDeleteCompleted = true;
          return removed;
        };
        cache.matchEffect = (key, read) => {
          if (key === CONTROLLER_TAKEOVER_HOLD_URL && cleanupDeleteCompleted) {
            throw new Error("synthetic hold absence verification failure");
          }
          return read();
        };
      }
    }
  ])("$failure 时保持导航 fail-closed，并在 worker 重启后拒绝 fresh takeover", async ({
    configure,
    restartReason
  }) => {
    const harness = await createWorkerHarness();
    await harness.dispatch("install");
    const currentCache = await harness.caches.open(CURRENT_CACHE);
    configure(currentCache);
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    harness.setWaitingWorker(createWaitingTakeoverResponder(
      [],
      "next-build",
      BRIDGE_DESCRIPTOR,
      "known_rejected"
    ).worker);
    const firstAcks: Array<Record<string, unknown>> = [];

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000016",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => firstAcks.push(message as Record<string, unknown>) }]
    });
    expect(firstAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "TAKEOVER_HOLD_CLEAR_FAILED"
    })]);

    const heldByFailedCleanup = (await harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/after-hold-cleanup-failure` },
      resultingClientId: "navigation-after-hold-cleanup-failure"
    })) as FakeResponse;
    expect(heldByFailedCleanup.status).toBe(503);
    expect(harness.fetchRequest).not.toHaveBeenCalled();

    const sameWorkerRetryAcks: Array<Record<string, unknown>> = [];
    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000017",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => sameWorkerRetryAcks.push(message as Record<string, unknown>) }]
    });
    expect(sameWorkerRetryAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: "TAKEOVER_SESSION_BUSY"
    })]);

    const restartedA = await createWorkerHarness(BRIDGE_DESCRIPTOR, { cacheStore: harness.cacheStore });
    restartedA.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const restartedWaiting = createWaitingTakeoverResponder();
    restartedA.setWaitingWorker(restartedWaiting.worker);
    const heldAfterRestart = (await restartedA.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/after-hold-cleanup-worker-restart` },
      resultingClientId: "navigation-after-hold-cleanup-worker-restart"
    })) as FakeResponse;
    expect(heldAfterRestart.status).toBe(503);
    expect(restartedA.fetchRequest).not.toHaveBeenCalled();

    const restartedRetryAcks: Array<Record<string, unknown>> = [];
    await restartedA.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000018",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => restartedRetryAcks.push(message as Record<string, unknown>) }]
    });
    expect(restartedRetryAcks).toEqual([expect.objectContaining({
      accepted: false,
      reason: restartReason
    })]);
    expect(restartedWaiting.messages).toEqual([]);

    currentCache.putEffect = null;
    currentCache.deleteEffect = null;
    currentCache.matchEffect = null;
    await restartedA.dispatch("install");
    expect(await currentCache.match(CONTROLLER_TAKEOVER_HOLD_URL)).toBeUndefined();

    const recoveredRetryAcks: Array<Record<string, unknown>> = [];
    await restartedA.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000019",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: (message) => recoveredRetryAcks.push(message as Record<string, unknown>) }]
    });
    expect(recoveredRetryAcks).toEqual([expect.objectContaining({ accepted: true })]);
  });

  it("takeover 前已开始但尚未 materialize 的导航在返回 A 壳前再次被 holding 截断", async () => {
    const harness = await createWorkerHarness();
    harness.addWindowClient("takeover-initiator", controllerTakeoverFreezeResponder());
    const waiting = createWaitingTakeoverResponder();
    harness.setWaitingWorker(waiting.worker);
    let releaseNetworkResponse: ((response: FakeResponse) => void) | undefined;
    harness.fetchRequest.mockImplementationOnce(() => new Promise<FakeResponse>((resolve) => {
      releaseNetworkResponse = resolve;
    }));

    const pendingNavigation = harness.dispatch("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/slow-preboot` },
      resultingClientId: "reserved-navigation-not-yet-enumerable"
    }) as Promise<FakeResponse>;
    await vi.waitFor(() => expect(harness.fetchRequest).toHaveBeenCalledOnce());

    await harness.dispatch("message", {
      data: {
        type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1",
        requestId: "takeover-00000000-0000-4000-8000-000000000008",
        sourceBuildVersion: CURRENT_VERSION,
        sourceRelease: BRIDGE_DESCRIPTOR
      },
      source: { id: "takeover-initiator" },
      ports: [{ postMessage: () => undefined }]
    });
    releaseNetworkResponse?.(new FakeResponse("late A network shell"));

    const response = await pendingNavigation;
    expect(response.status).toBe(503);
    expect(response.body).toContain("正在安全切换离线版本");
    expect(response.body).not.toContain("late A network shell");
  });
});

async function connectedForwardMigrationWorkers(options: {
  committed?: boolean;
  secondClientAccepts?: boolean;
  target?: ReleaseDescriptor;
} = {}) {
  const targetDescriptor = options.target ?? PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;
  const source = await createWorkerHarness(BRIDGE_DESCRIPTOR);
  const target = await createWorkerHarness(targetDescriptor, {
    buildVersion: FORWARD_TARGET_VERSION,
    cacheStore: source.cacheStore,
    indexedDB: source.indexedDB
  });
  const deliveries: Promise<unknown>[] = [];
  const activeWorker = {
    state: "activated",
    scriptURL: `${ORIGIN}/sw.js`,
    postMessage: vi.fn<(message: unknown, ports?: FakeMessagePort[]) => void>()
  };
  const waitingWorker: FakeWorkerEndpoint = {
    state: "installed",
    scriptURL: `${ORIGIN}/sw.js`,
    postMessage: (data, ports) => {
      const delivery = target.dispatch("message", { data, ports, source: activeWorker });
      deliveries.push(delivery);
      void delivery.catch(() => undefined);
    }
  };
  source.setActiveWorker(activeWorker);
  source.setWaitingWorker(waitingWorker);
  target.setActiveWorker(activeWorker);
  target.setWaitingWorker(waitingWorker);
  const freezeTypes: string[] = [];
  for (const id of ["forward-source-one", "forward-source-two"]) {
    source.addWindowClient(id, (message, port) => {
      if (message.type !== "FREEZE_RELEASE_FORWARD_MIGRATION_ACTIVATION_WRITES_V1") return;
      freezeTypes.push(String(message.type));
      const accepted = id !== "forward-source-two" || options.secondClientAccepts !== false;
      port?.postMessage({
        type: "FREEZE_RELEASE_FORWARD_MIGRATION_ACTIVATION_WRITES_ACK_V1",
        requestId: message.requestId,
        sourceBuildVersion: message.sourceBuildVersion,
        targetBuildVersion: message.targetBuildVersion,
        accepted,
        reason: accepted ? "WRITES_DRAINED" : "WRITE_DRAIN_FAILED"
      });
    });
  }
  if (options.committed !== false) await source.setCommittedState(committedState(BRIDGE_DESCRIPTOR, CURRENT_VERSION));
  const request = {
    type: "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_V1",
    requestId: FORWARD_REQUEST_ID,
    sourceBuildVersion: CURRENT_VERSION,
    sourceRelease: BRIDGE_DESCRIPTOR,
    targetBuildVersion: FORWARD_TARGET_VERSION,
    targetRelease: targetDescriptor
  };
  return { source, target, request, deliveries, freezeTypes };
}

describe("forward migration activation ordinary contracts", () => {
  it("reads waiting release identity without activating or changing storage", async () => {
    const harness = await createWorkerHarness(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR, {
      buildVersion: FORWARD_TARGET_VERSION
    });
    const replies: unknown[] = [];
    await harness.dispatch("message", {
      data: { type: "GET_INSTALLED_GENERATION_RELEASE_IDENTITY_V1", requestId: FORWARD_REQUEST_ID },
      source: { id: "ordinary-page" },
      ports: [{ postMessage: value => replies.push(value) }]
    });
    expect(replies).toEqual([{
      type: "GET_INSTALLED_GENERATION_RELEASE_IDENTITY_ACK_V1",
      requestId: FORWARD_REQUEST_ID,
      buildVersion: FORWARD_TARGET_VERSION,
      release: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
    }]);
    expect(harness.skipWaiting).not.toHaveBeenCalled();
    expect(harness.claim).not.toHaveBeenCalled();
    expect(harness.cacheStore.size).toBe(0);
  });

  it("activates a distinct v16 worker only after committed v13 and both source write drains", async () => {
    const connected = await connectedForwardMigrationWorkers();
    const replies: Array<Record<string, unknown>> = [];
    await connected.source.dispatch("message", {
      data: connected.request,
      source: { id: "forward-source-one" },
      ports: [{ postMessage: value => replies.push(value as Record<string, unknown>) }]
    });
    await Promise.all(connected.deliveries);
    expect(replies).toEqual([expect.objectContaining({
      type: "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_ACK_V1",
      accepted: true,
      reason: "ALL_CLIENTS_DRAINED_BEFORE_SKIP_WAITING",
      targetBuildVersion: FORWARD_TARGET_VERSION,
      targetRelease: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
      clientCount: 2,
      frozenClientCount: 2
    })]);
    // An acknowledged page stays write-frozen. A later census discovers new
    // pages without requiring the existing pages to repeat that same drain.
    expect(connected.freezeTypes).toHaveLength(2);
    expect(connected.source.matchAllClients.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(connected.target.skipWaiting).toHaveBeenCalledOnce();
    expect(connected.source.skipWaiting).not.toHaveBeenCalled();
  });

  it("keeps the same-descriptor namespace closed to a v13 to v16 transition", async () => {
    const connected = await connectedForwardMigrationWorkers();
    const replies: Array<Record<string, unknown>> = [];
    await connected.source.dispatch("message", {
      data: { ...connected.request, type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1" },
      source: { id: "forward-source-one" },
      ports: [{ postMessage: value => replies.push(value as Record<string, unknown>) }]
    });
    await Promise.all(connected.deliveries);
    expect(replies).toEqual([expect.objectContaining({
      type: "REQUEST_INSTALLED_GENERATION_ACTIVATION_ACK_V1",
      accepted: false
    })]);
    expect(connected.freezeTypes).toEqual([]);
    expect(connected.target.skipWaiting).not.toHaveBeenCalled();
  });

  it("requires the actual source commit before requesting any forward client freeze", async () => {
    const connected = await connectedForwardMigrationWorkers({ committed: false });
    const replies: Array<Record<string, unknown>> = [];
    await connected.source.dispatch("message", {
      data: connected.request,
      source: { id: "forward-source-one" },
      ports: [{ postMessage: value => replies.push(value as Record<string, unknown>) }]
    });
    await Promise.all(connected.deliveries);
    expect(replies).toEqual([expect.objectContaining({ accepted: false })]);
    expect(connected.freezeTypes).toEqual([]);
    expect(connected.target.skipWaiting).not.toHaveBeenCalled();
  });

  it("retains waiting v16 when one source page cannot drain its writes", async () => {
    const connected = await connectedForwardMigrationWorkers({ secondClientAccepts: false });
    const replies: Array<Record<string, unknown>> = [];
    await connected.source.dispatch("message", {
      data: connected.request,
      source: { id: "forward-source-one" },
      ports: [{ postMessage: value => replies.push(value as Record<string, unknown>) }]
    });
    await Promise.all(connected.deliveries);
    expect(replies).toEqual([expect.objectContaining({ accepted: false })]);
    expect(connected.freezeTypes.length).toBeGreaterThanOrEqual(2);
    expect(connected.target.skipWaiting).not.toHaveBeenCalled();
  });

  it("does not admit a schema14 target through the explicit v16 forward route", async () => {
    const connected = await connectedForwardMigrationWorkers({ target: TARGET_DESCRIPTOR });
    const replies: Array<Record<string, unknown>> = [];
    await connected.source.dispatch("message", {
      data: connected.request,
      source: { id: "forward-source-one" },
      ports: [{ postMessage: value => replies.push(value as Record<string, unknown>) }]
    });
    await Promise.all(connected.deliveries);
    expect(replies).toEqual([expect.objectContaining({ accepted: false })]);
    expect(connected.freezeTypes).toEqual([]);
    expect(connected.target.skipWaiting).not.toHaveBeenCalled();
  });
});
