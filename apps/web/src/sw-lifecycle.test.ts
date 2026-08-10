import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "https://hakimi.test";
const CURRENT_VERSION = "current-build";
const CURRENT_CACHE = `hakimi-shell-${CURRENT_VERSION}`;
const CACHE_META_URL = `${ORIGIN}/__hakimi_cache_meta__`;
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
  | typeof REPUBLISHED_TARGET_DESCRIPTOR;

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

  async addAll(requests: string[]) {
    if (this.failAddAll) throw new Error("synthetic precache failure");
    this.addedRequests = [...requests];
    for (const request of requests) this.entries.set(requestKey(request), new FakeResponse(request));
  }

  async put(request: string | { url: string }, response: FakeResponse) {
    this.entries.set(requestKey(request), response);
  }

  async match(request: string | { url: string }) {
    return this.entries.get(requestKey(request));
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
  source?: { id: string; postMessage?: (message: unknown) => void };
  clientId?: string;
  resultingClientId?: string;
  respondWith?: (promise: Promise<unknown>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
};

async function createWorkerHarness(descriptor: ReleaseDescriptor = BRIDGE_DESCRIPTOR) {
  const workerPath = path.resolve(import.meta.dirname, "../public/sw.js");
  const workerSource = (await readFile(workerPath, "utf8"))
    .replace("__CACHE_VERSION__", CURRENT_VERSION)
    .replace("__RELEASE_DATABASE_DESCRIPTOR__", encodedDescriptor(descriptor));
  const cacheStore = new Map<string, FakeCache>();
  const indexedDB = new IDBFactory();
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const windowClients = new Map<string, FakeWindowClient>();
  const deleteCache = vi.fn(async (cacheName: string) => cacheStore.delete(cacheName));
  const claim = vi.fn(async () => undefined);
  const skipWaiting = vi.fn(async () => undefined);
  const matchAllClients = vi.fn(async () => [...windowClients.values()]);
  const fetchRequest = vi.fn(async (): Promise<FakeResponse> => {
    throw new Error("offline");
  });
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
    setTimeout
  });

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

  return {
    cacheStore,
    caches,
    claim,
    addWindowClient,
    deleteCache,
    dispatch,
    fetchRequest,
    indexedDB,
    matchAllClients,
    seedGeneration,
    seedRawMetadata,
    seedResource,
    seedShell,
    setCommittedState,
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

async function waitForCondition(predicate: () => boolean) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(predicate()).toBe(true);
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

      await harness.dispatch("message", {
        data: { type: resolution[0], requestId, migrationId: TARGET_DESCRIPTOR.migrationId },
        source: { id: "other-target-tab" }
      });
      await harness.dispatch("message", {
        data: { type: resolution[0], requestId, migrationId: "wrong-migration" },
        source: { id: "migration-coordinator" }
      });
      expect(source.messages).toHaveLength(1);
      expect(existingTarget.messages).toHaveLength(1);

      if (resolution[0] === "FINISH_DATABASE_MIGRATION") {
        await harness.setCommittedState(committedState(TARGET_DESCRIPTOR, CURRENT_VERSION));
      }
      await harness.dispatch("message", {
        data: { type: resolution[0], requestId, migrationId: TARGET_DESCRIPTOR.migrationId },
        source: { id: "migration-coordinator" }
      });

      for (const client of [source, existingTarget]) {
        expect(client.messages.map((message) => message.type)).toEqual([
          "FREEZE_DATABASE_WRITES",
          resolution[1]
        ]);
      }
      expect(lateClient.messages).toEqual([]);
    }
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
      await waitForCondition(() =>
        source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")
      );
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
      await waitForCondition(() =>
        source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")
      );
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
      await waitForCondition(() =>
        source.messages.some((message) => message.type === "DATABASE_MIGRATION_ABORTED")
      );
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
      await waitForCondition(() =>
        source.messages.some((message) => message.type === "DATABASE_MIGRATION_COMMITTED")
      );

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
    await harness.dispatch("message", {
      data: {
        type: "ABORT_DATABASE_MIGRATION",
        requestId: "post-commit-explicit-abort",
        migrationId: TARGET_DESCRIPTOR.migrationId
      },
      source: { id: "migration-coordinator" }
    });

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

  it("waiting 代激活消息只调用 skipWaiting，不确认或清理 cache", async () => {
    const harness = await createWorkerHarness();
    await harness.seedGeneration(CURRENT_CACHE, 200, false);

    await harness.dispatch("message", { data: { type: "ACTIVATE_INSTALLED_GENERATION" } });
    await harness.dispatch("message", { data: { type: "ACTIVATE_INSTALLED_GENERATION" } });

    expect(harness.skipWaiting).toHaveBeenCalledOnce();
    expect(await harness.cacheStore.get(CURRENT_CACHE)?.match(CACHE_META_URL).then((response) => response?.json())).toMatchObject({
      bootAttempted: false,
      bootConfirmed: false
    });
    expect(harness.deleteCache).not.toHaveBeenCalled();
  });
});
