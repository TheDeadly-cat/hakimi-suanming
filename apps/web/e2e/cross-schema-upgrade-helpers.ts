import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import { collectConsoleProblems, waitForAppReady, waitForServiceWorker } from "./full-backup-helpers";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const viteBin = path.resolve(workspaceRoot, "node_modules/vite/bin/vite.js");
const fixtureConfig = path.resolve(workspaceRoot, "apps/web/vite.cross-schema-upgrade.config.ts");

export const RELEASE_CONTROL_DATABASE = "hakimi-bazi-release-control";
export const SOURCE_DATABASE = BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName;
export const TARGET_DATABASE = PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName;
export const SOURCE_NATIVE_VERSION = 130;
export const TARGET_NATIVE_VERSION = 140;
export const CACHE_PREFIX = "hakimi-shell-";
export const CACHE_META_PATH = "/__hakimi_cache_meta__";

export type CrossSchemaFault = "none" | "migration" | "validation" | "digest";

export type GenerationFixture = {
  name: string;
  directory: string;
  version: string;
  entryPath: string;
  markerPath: string;
  descriptor: ReleaseDatabaseDescriptor;
  fault: CrossSchemaFault;
};

export type ServerRequest = {
  generation: string;
  method: string;
  pathname: string;
  status: number;
};

export type SwitchServer = {
  origin: string;
  requests: ServerRequest[];
  setGeneration: (generation: GenerationFixture, failPaths?: readonly string[]) => void;
  close: () => Promise<void>;
};

export type NativeDatabaseSnapshot = {
  name: string;
  nativeVersion: number;
  stores: string[];
  storeMetadata: Record<string, {
    keyPath: string | string[] | null;
    autoIncrement: boolean;
    indexes: Array<{
      name: string;
      keyPath: string | string[];
      unique: boolean;
      multiEntry: boolean;
    }>;
  }>;
  rows: Record<string, unknown[]>;
};

export type ReleaseControlSnapshot = {
  state: Record<string, unknown> | null;
  journals: Array<Record<string, unknown>>;
  leases: Array<Record<string, unknown>>;
};

export type CacheGeneration = {
  cacheName: string;
  installedAt: number;
  bootAttempted: boolean;
  bootConfirmed: boolean;
  dbGeneration: string | null;
  databaseName: string | null;
  targetSchema: number | null;
  migrationId: string | null;
  acceptedCommittedMigrationIds: Array<string | null> | null;
};

export type RepositoryWriteProbe = {
  ok: boolean;
  errorName: string | null;
  errorMessage: string | null;
};

function descriptorEnvironment(descriptor: ReleaseDatabaseDescriptor): Record<string, string> {
  const environment: Record<string, string> = {
    HAKIMI_DB_GENERATION: descriptor.dbGeneration,
    HAKIMI_DB_NAME: descriptor.databaseName,
    HAKIMI_DB_TARGET_SCHEMA: String(descriptor.targetSchema),
    HAKIMI_DB_MIN_READABLE_SCHEMA: String(descriptor.minReadableSchema),
    HAKIMI_DB_MAX_READABLE_SCHEMA: String(descriptor.maxReadableSchema)
  };
  environment.HAKIMI_DB_ACCEPTED_COMMITTED_MIGRATION_IDS = JSON.stringify(
    descriptor.acceptedCommittedMigrationIds
  );
  if (descriptor.migrationId !== null) environment.HAKIMI_DB_MIGRATION_ID = descriptor.migrationId;
  if (descriptor.sourceGeneration !== null) environment.HAKIMI_DB_SOURCE_GENERATION = descriptor.sourceGeneration;
  if (descriptor.sourceDatabaseName !== null) environment.HAKIMI_DB_SOURCE_NAME = descriptor.sourceDatabaseName;
  if (descriptor.sourceSchema !== null) environment.HAKIMI_DB_SOURCE_SCHEMA = String(descriptor.sourceSchema);
  return environment;
}

function parseReleaseMeta(index: string): ReleaseDatabaseDescriptor {
  const match = index.match(/<meta\s+name=["']hakimi-release-database["']\s+content=(['"])(.*?)\1\s*\/?>/iu);
  if (!match?.[2]) throw new Error("Cross-Schema fixture index is missing release metadata.");
  const decoded = match[2]
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
  return JSON.parse(decoded) as ReleaseDatabaseDescriptor;
}

export async function buildGeneration(
  fixtureRoot: string,
  name: string,
  descriptor: ReleaseDatabaseDescriptor,
  fault: CrossSchemaFault = "none"
): Promise<GenerationFixture> {
  const directory = path.join(fixtureRoot, name);
  const result = await execFileAsync(process.execPath, [viteBin, "build", "--config", fixtureConfig], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...descriptorEnvironment(descriptor),
      HAKIMI_CROSS_SCHEMA_FIXTURE: name,
      HAKIMI_CROSS_SCHEMA_OUT_DIR: directory,
      HAKIMI_CROSS_SCHEMA_FAULT: fault
    },
    maxBuffer: 50 * 1024 * 1024,
    windowsHide: true
  });
  if (result.stderr && !result.stderr.includes("Some chunks are larger than")) {
    throw new Error(`Build ${name} emitted unexpected stderr:\n${result.stderr}`);
  }

  const [index, worker] = await Promise.all([
    readFile(path.join(directory, "index.html"), "utf8"),
    readFile(path.join(directory, "sw.js"), "utf8")
  ]);
  const version = index.match(/<meta name="hakimi-build-version" content="([^"]+)"/u)?.[1];
  const entryPath = index.match(/<script[^>]+src="([^"]+\.js)"/u)?.[1];
  const emittedDescriptor = parseReleaseMeta(index);
  if (!version || !entryPath) throw new Error(`Build ${name} is missing its build version or entry script.`);
  if (JSON.stringify(emittedDescriptor) !== JSON.stringify(descriptor)) {
    throw new Error(`Build ${name} emitted a release descriptor different from its requested descriptor.`);
  }
  if (!worker.includes(descriptor.dbGeneration) || !worker.includes(String(descriptor.targetSchema))) {
    throw new Error(`Build ${name} did not embed its database generation descriptor in sw.js.`);
  }
  if (worker.includes("__RELEASE_DATABASE_DESCRIPTOR__")) {
    throw new Error(`Build ${name} left the Service Worker release descriptor placeholder unresolved.`);
  }

  return {
    name,
    directory,
    version,
    entryPath,
    markerPath: `/e2e-cross-schema-${name}.json`,
    descriptor,
    fault
  };
}

function contentType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".webmanifest": return "application/manifest+json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

export async function startSwitchServer(initialGeneration: GenerationFixture): Promise<SwitchServer> {
  let active = { generation: initialGeneration, failPaths: new Set<string>() };
  const requests: ServerRequest[] = [];
  const server: Server = createServer(async (request, response) => {
    const generation = active.generation;
    const method = request.method ?? "GET";
    let pathname = "/";
    try {
      pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (method !== "GET" && method !== "HEAD") {
        requests.push({ generation: generation.name, method, pathname, status: 405 });
        response.writeHead(405, { "cache-control": "no-store" });
        response.end("Method Not Allowed");
        return;
      }
      if (active.failPaths.has(pathname)) {
        requests.push({ generation: generation.name, method, pathname, status: 404 });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end("Synthetic missing resource");
        return;
      }

      const decoded = decodeURIComponent(pathname);
      const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
      let filePath = path.resolve(generation.directory, relative);
      const generationRoot = path.resolve(generation.directory);
      if (filePath !== generationRoot && !filePath.startsWith(`${generationRoot}${path.sep}`)) {
        requests.push({ generation: generation.name, method, pathname, status: 400 });
        response.writeHead(400, { "cache-control": "no-store" });
        response.end("Bad Request");
        return;
      }

      let exists = false;
      try {
        exists = (await stat(filePath)).isFile();
      } catch {
        exists = false;
      }
      if (!exists && (request.headers.accept ?? "").includes("text/html")) {
        filePath = path.join(generation.directory, "index.html");
        exists = true;
      }
      if (!exists) {
        requests.push({ generation: generation.name, method, pathname, status: 404 });
        response.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      const bytes = await readFile(filePath);
      const headers: Record<string, string> = {
        "cache-control": "no-store, max-age=0",
        "content-type": contentType(filePath),
        "x-content-type-options": "nosniff"
      };
      if (pathname === "/sw.js") headers["service-worker-allowed"] = "/";
      requests.push({ generation: generation.name, method, pathname, status: 200 });
      response.writeHead(200, headers);
      response.end(method === "HEAD" ? undefined : bytes);
    } catch (error) {
      requests.push({ generation: generation.name, method, pathname, status: 500 });
      response.writeHead(500, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Fixture server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Cross-Schema fixture server has no TCP address.");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    setGeneration(generation, failPaths = []) {
      active = { generation, failPaths: new Set(failPaths) };
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

export async function pageReleaseEvidence(page: Page) {
  return page.evaluate(() => {
    const rawDescriptor = document.querySelector<HTMLMetaElement>('meta[name="hakimi-release-database"]')?.content;
    return {
      fixture: document.documentElement.dataset.e2eCrossSchemaFixture ?? null,
      fault: document.documentElement.dataset.e2eCrossSchemaFault ?? null,
      appBootReady: document.documentElement.dataset.appBootReady ?? null,
      swBootSignalSent: document.documentElement.dataset.swBootSignalSent ?? null,
      swBootAck: document.documentElement.dataset.swBootAck ?? null,
      dbGeneration: document.documentElement.dataset.dbGeneration ?? null,
      dbSchema: document.documentElement.dataset.dbSchema ?? null,
      dbMigrationPhase: document.documentElement.dataset.dbMigrationPhase ?? null,
      dbStorageAdmission: document.documentElement.dataset.dbStorageAdmission ?? null,
      buildVersion: document.querySelector<HTMLMetaElement>('meta[name="hakimi-build-version"]')?.content ?? null,
      descriptor: rawDescriptor ? JSON.parse(rawDescriptor) as ReleaseDatabaseDescriptor : null
    };
  });
}

export async function expectPageFixture(page: Page, fixture: GenerationFixture): Promise<void> {
  await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
    fixture: fixture.name,
    appBootReady: "true",
    dbGeneration: fixture.descriptor.dbGeneration,
    dbSchema: String(fixture.descriptor.targetSchema),
    buildVersion: fixture.version,
    descriptor: fixture.descriptor
  });
}

export async function cacheGenerations(page: Page): Promise<CacheGeneration[]> {
  return page.evaluate(async ({ prefix, metaPath }) => {
    const cacheNames = (await caches.keys()).filter((name) => name.startsWith(prefix));
    return Promise.all(cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const response = await cache.match(new URL(metaPath, location.origin).toString());
      const metadata = response ? await response.json() as Record<string, unknown> : {};
      return {
        cacheName,
        installedAt: typeof metadata.installedAt === "number" ? metadata.installedAt : -1,
        bootAttempted: metadata.bootAttempted === true,
        bootConfirmed: metadata.bootConfirmed === true,
        dbGeneration: typeof metadata.dbGeneration === "string" ? metadata.dbGeneration : null,
        databaseName: typeof metadata.databaseName === "string" ? metadata.databaseName : null,
        targetSchema: typeof metadata.targetSchema === "number" ? metadata.targetSchema : null,
        migrationId: typeof metadata.migrationId === "string" ? metadata.migrationId : null,
        acceptedCommittedMigrationIds: Array.isArray(metadata.acceptedCommittedMigrationIds) &&
          metadata.acceptedCommittedMigrationIds.every((entry) => entry === null || typeof entry === "string")
          ? metadata.acceptedCommittedMigrationIds as Array<string | null>
          : null
      };
    }));
  }, { prefix: CACHE_PREFIX, metaPath: CACHE_META_PATH });
}

export async function cacheGeneration(page: Page, fixture: GenerationFixture): Promise<CacheGeneration | null> {
  return (await cacheGenerations(page)).find((item) => item.cacheName === `${CACHE_PREFIX}${fixture.version}`) ?? null;
}

export async function workerBuildVersion(
  page: Page,
  source: "controller" | "active" | "waiting" | "installing"
): Promise<string | null> {
  return page.evaluate(async (workerSource) => {
    const registration = workerSource === "controller" ? null : await navigator.serviceWorker.getRegistration();
    const worker = workerSource === "controller"
      ? navigator.serviceWorker.controller
      : registration?.[workerSource] ?? null;
    if (!worker) return null;
    return new Promise<string | null>((resolve, reject) => {
      const channel = new MessageChannel();
      let settled = false;
      let timeout: number | undefined;
      const cleanup = () => {
        if (timeout !== undefined) window.clearTimeout(timeout);
        channel.port1.onmessage = null;
        channel.port1.close();
      };
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      timeout = window.setTimeout(() => finish(null), 2_000);
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as { type?: unknown; buildVersion?: unknown };
        finish(message.type === "BUILD_VERSION" && typeof message.buildVersion === "string"
          ? message.buildVersion
          : null);
      };
      try {
        worker.postMessage({ type: "GET_BUILD_VERSION" }, [channel.port2]);
      } catch (error) {
        fail(error);
      }
    });
  }, source);
}

export async function serviceWorkerLifecycleSnapshot(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const readWorker = async (worker: ServiceWorker | null | undefined) => {
      if (!worker) return null;
      const buildVersion = await new Promise<string | null>((resolve, reject) => {
        const channel = new MessageChannel();
        let settled = false;
        let timeout: number | undefined;
        const cleanup = () => {
          if (timeout !== undefined) window.clearTimeout(timeout);
          channel.port1.onmessage = null;
          channel.port1.close();
        };
        const finish = (value: string | null) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(value);
        };
        const fail = (error: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };
        timeout = window.setTimeout(() => finish(null), 2_000);
        channel.port1.onmessage = (event: MessageEvent<unknown>) => {
          const message = event.data as { type?: unknown; buildVersion?: unknown };
          finish(message.type === "BUILD_VERSION" && typeof message.buildVersion === "string"
            ? message.buildVersion
            : null);
        };
        try {
          worker.postMessage({ type: "GET_BUILD_VERSION" }, [channel.port2]);
        } catch (error) {
          fail(error);
        }
      });
      return { state: worker.state, scriptURL: worker.scriptURL, buildVersion };
    };
    return {
      controller: await readWorker(navigator.serviceWorker.controller),
      active: await readWorker(registration?.active),
      waiting: await readWorker(registration?.waiting),
      installing: await readWorker(registration?.installing),
      datasets: {
        swRegistered: document.documentElement.dataset.swRegistered ?? null,
        swReady: document.documentElement.dataset.swReady ?? null,
        swUpdateChecked: document.documentElement.dataset.swUpdateChecked ?? null,
        appBootReady: document.documentElement.dataset.appBootReady ?? null,
        fixture: document.documentElement.dataset.e2eCrossSchemaFixture ?? null
      }
    };
  });
}

export async function readNativeDatabase(page: Page, name: string): Promise<NativeDatabaseSnapshot | null> {
  return page.evaluate(async (databaseName) => {
    const metadata = await indexedDB.databases();
    if (!metadata.some((entry) => entry.name === databaseName)) return null;
    const requestValue = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Cannot open ${databaseName}`));
      request.onblocked = () => reject(new Error(`Opening ${databaseName} was blocked`));
    });
    const stores = [...database.objectStoreNames].sort();
    if (stores.length === 0) {
      const snapshot = {
        name: databaseName,
        nativeVersion: database.version,
        stores,
        storeMetadata: {},
        rows: {}
      };
      database.close();
      return snapshot;
    }
    const transaction = database.transaction(stores, "readonly");
    const entries = await Promise.all(stores.map(async (storeName) => {
      const store = transaction.objectStore(storeName);
      const indexes = [...store.indexNames]
        .sort()
        .map((indexName) => {
          const index = store.index(indexName);
          return {
            name: index.name,
            keyPath: Array.isArray(index.keyPath) ? [...index.keyPath] : index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry
          };
        });
      return {
        storeName,
        rows: await requestValue(store.getAll()),
        metadata: {
          keyPath: Array.isArray(store.keyPath) ? [...store.keyPath] : store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes
        }
      };
    }));
    const rows = Object.fromEntries(entries.map((entry) => [entry.storeName, entry.rows]));
    const storeMetadata = Object.fromEntries(entries.map((entry) => [entry.storeName, entry.metadata]));
    const snapshot = {
      name: databaseName,
      nativeVersion: database.version,
      stores,
      storeMetadata,
      rows
    };
    database.close();
    return snapshot;
  }, name);
}

export async function readReleaseControl(page: Page): Promise<ReleaseControlSnapshot | null> {
  return page.evaluate(async (databaseName) => {
    const metadata = await indexedDB.databases();
    if (!metadata.some((entry) => entry.name === databaseName)) return null;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Cannot open release control database"));
    });
    const requestValue = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Release control request failed"));
    });
    const readAll = async (storeName: string): Promise<Array<Record<string, unknown>>> => {
      if (!database.objectStoreNames.contains(storeName)) return [];
      const transaction = database.transaction(storeName, "readonly");
      return requestValue(transaction.objectStore(storeName).getAll()) as Promise<Array<Record<string, unknown>>>;
    };
    let state: Record<string, unknown> | null = null;
    if (database.objectStoreNames.contains("releaseState")) {
      const transaction = database.transaction("releaseState", "readonly");
      state = await requestValue(transaction.objectStore("releaseState").get("current")) as Record<string, unknown> | null;
    }
    const [journals, leases] = await Promise.all([readAll("migrationJournals"), readAll("migrationLeases")]);
    database.close();
    return { state: state ?? null, journals, leases };
  }, RELEASE_CONTROL_DATABASE);
}

export async function holdDatabaseUpgradeOpen(page: Page, name: string, nativeVersion = SOURCE_NATIVE_VERSION): Promise<void> {
  await page.evaluate(async ({ databaseName, version }) => {
    const scope = globalThis as typeof globalThis & { __hakimiCrossSchemaBlocker?: IDBDatabase };
    scope.__hakimiCrossSchemaBlocker?.close();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, version);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("e2eBlocker")) {
          request.result.createObjectStore("e2eBlocker", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Cannot open blocker database"));
    });
    database.onversionchange = () => {
      document.documentElement.dataset.e2eDatabaseUpgradeBlocked = "true";
      // Deliberately remain open. A real stale tab or third-party connection can
      // do the same; the migration coordinator must time out and fail closed.
    };
    scope.__hakimiCrossSchemaBlocker = database;
  }, { databaseName: name, version: nativeVersion });
}

export async function releaseDatabaseUpgradeBlocker(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & { __hakimiCrossSchemaBlocker?: IDBDatabase };
    scope.__hakimiCrossSchemaBlocker?.close();
    delete scope.__hakimiCrossSchemaBlocker;
  });
}

export async function attemptRepositoryWrite(page: Page, caseId: string): Promise<RepositoryWriteProbe> {
  return page.evaluate(async (targetCaseId) => {
    const scope = globalThis as typeof globalThis & {
      __hakimiE2eAttemptRepositoryWrite?: (caseId: string) => Promise<RepositoryWriteProbe>;
    };
    if (!scope.__hakimiE2eAttemptRepositoryWrite) {
      throw new Error("The Cross-Schema repository write probe is not installed.");
    }
    return scope.__hakimiE2eAttemptRepositoryWrite(targetCaseId);
  }, caseId);
}

export async function installOneShotBootOkInterruption(
  context: BrowserContext,
  targetGeneration: string
): Promise<void> {
  await context.addInitScript((generation) => {
    const storageKey = `hakimi-e2e-withheld-boot-ok:${generation}`;
    const original = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function (
      message: unknown,
      transferOrOptions?: Transferable[] | StructuredSerializeOptions
    ): void {
      const candidate = message as { type?: unknown; dbGeneration?: unknown } | null;
      if (
        candidate?.type === "BOOT_OK"
        && candidate.dbGeneration === generation
        && localStorage.getItem(storageKey) !== "withheld"
      ) {
        localStorage.setItem(storageKey, "withheld");
        document.documentElement.dataset.e2eBootOkWithheld = "true";
        return;
      }
      if (transferOrOptions === undefined) {
        Reflect.apply(original, this, [message]);
      } else {
        Reflect.apply(original, this, [message, transferOrOptions]);
      }
    };
  }, targetGeneration);
}

export async function openStableBridge(
  context: BrowserContext,
  server: SwitchServer,
  fixture: GenerationFixture
): Promise<{ page: Page; problems: string[] }> {
  server.setGeneration(fixture);
  const page = context.pages()[0] ?? await context.newPage();
  const problems = collectConsoleProblems(page);
  await page.goto(`${server.origin}/`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await expectPageFixture(page, fixture);
  await expect.poll(() => cacheGeneration(page, fixture)).toMatchObject({
    bootConfirmed: true,
    dbGeneration: fixture.descriptor.dbGeneration,
    targetSchema: fixture.descriptor.targetSchema
  });
  return { page, problems };
}

export async function openBridgeNavigationAfterSwitch(
  context: BrowserContext,
  server: SwitchServer,
  stableFixture: GenerationFixture
): Promise<{ page: Page; problems: string[] }> {
  const page = await context.newPage();
  const problems = collectConsoleProblems(page);
  // The boot gate deliberately waits for a rendered animation frame before it
  // confirms a cache generation. Keep the trial tab foregrounded so Chromium
  // does not indefinitely throttle that safety frame when several historical
  // generation tabs remain open for rollback assertions.
  await page.bringToFront();
  const response = await page.goto(`${server.origin}/settings`, { waitUntil: "domcontentloaded" });
  // A preceding download can move Chromium focus to its internal downloads
  // surface after newPage(). Re-assert foreground state after navigation so
  // the application's deliberate requestAnimationFrame boot proof can run.
  await page.bringToFront();
  await page.evaluate(() => window.focus());
  expect(response?.fromServiceWorker()).toBe(true);
  await waitForForegroundAppReady(page);
  await expectPageFixture(page, stableFixture);
  return { page, problems };
}

/**
 * Edge can move focus to its internal downloads surface after an application
 * export. The production boot gate intentionally requires a real animation
 * frame, so keep reasserting this app page as foreground until that proof has
 * completed instead of weakening the product gate for a browser-test quirk.
 */
export async function waitForForegroundAppReady(page: Page): Promise<void> {
  await expect.poll(async () => {
    for (const candidate of page.context().pages()) {
      if (
        candidate !== page &&
        /^(?:edge|chrome):\/\/downloads(?:\/|$)/u.test(candidate.url())
      ) {
        await candidate.close();
      }
    }
    await page.bringToFront();
    return page.evaluate(() => {
      window.focus();
      return document.documentElement.dataset.appBootReady ?? null;
    });
  }, { timeout: 45_000, intervals: [100, 200, 500, 1_000] }).toBe("true");
  await waitForAppReady(page);
}

export async function createDemoCase(page: Page, origin: string): Promise<string> {
  await page.goto(`${origin}/new?demo=1`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/iu);
  await waitForAppReady(page);
  const caseId = new URL(page.url()).pathname.split("/")[2];
  if (!caseId || !/^[0-9a-f-]{36}$/iu.test(caseId)) throw new Error("Demo case did not produce a UUID case id.");
  return caseId;
}

export async function listAssetNames(fixture: GenerationFixture): Promise<string[]> {
  return readdir(path.join(fixture.directory, "assets"));
}

export function collectExternalRequests(context: BrowserContext, origin: string): string[] {
  const requests: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin) {
      requests.push(request.url());
    }
  });
  return requests;
}
