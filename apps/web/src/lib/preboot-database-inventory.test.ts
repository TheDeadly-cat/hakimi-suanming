import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
} from "../../release-protocol";
import {
  LEGACY_V13_NATIVE_VERSION,
  LEGACY_V13_STORE_SCHEMA,
  RELEASE_CONTROL_DATABASE_NAME,
  inspectPrebootRecoveryState,
  openVerifiedExistingV13Database,
  type PrebootInventoryRuntime
} from "./preboot-database-inventory";

function parseKey(token: string): string | string[] {
  const normalized = token.replace(/^[&*]/u, "");
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1).split("+")
    : normalized;
}

async function createNativeDatabase(
  factory: IDBFactory,
  name: string,
  version: number,
  options: { omitStore?: string; addUnexpectedStore?: boolean } = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const [storeName, schema] of Object.entries(LEGACY_V13_STORE_SCHEMA)) {
        if (storeName === options.omitStore) continue;
        const tokens = schema.split(",").map((token) => token.trim());
        const primary = tokens.shift()!;
        const store = database.createObjectStore(storeName, {
          keyPath: parseKey(primary),
          autoIncrement: primary.startsWith("++")
        });
        for (const rawIndex of tokens) {
          const unique = rawIndex.startsWith("&");
          const multiEntry = rawIndex.startsWith("*");
          const name = rawIndex.replace(/^[&*]/u, "");
          store.createIndex(name, parseKey(rawIndex), { unique, multiEntry });
        }
      }
      if (options.addUnexpectedStore) database.createObjectStore("unexpected", { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
  });
}

function runtime(factory: IDBFactory): PrebootInventoryRuntime {
  return {
    indexedDB: factory,
    serviceWorker: { controller: null, getRegistrations: async () => [] }
  };
}

describe("preboot database inventory", () => {
  it("keeps non-shadow bridge releases on the ordinary application path without inventory", async () => {
    const databases = vi.fn(async () => []);
    await expect(inspectPrebootRecoveryState(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, {
      indexedDB: { open: vi.fn() as unknown as IDBFactory["open"], databases }
    })).resolves.toMatchObject({ kind: "normal", reasonCode: "BRIDGE_RELEASE" });
    expect(databases).not.toHaveBeenCalled();
  });

  it("keeps a fresh shadow install normal and does not create a database", async () => {
    const factory = new IDBFactory();
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime(factory)
    )).resolves.toMatchObject({ kind: "normal", reasonCode: "FRESH_INSTALL", inventory: [] });
    expect(await factory.databases()).toEqual([]);
  });

  it("classifies an exact unregistered physical v13 source as orphaned", async () => {
    const factory = new IDBFactory();
    await createNativeDatabase(
      factory,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName!,
      LEGACY_V13_NATIVE_VERSION
    );
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime(factory)
    )).resolves.toMatchObject({
      kind: "orphaned_v13",
      sourceDatabaseName: PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName,
      sourceNativeVersion: LEGACY_V13_NATIVE_VERSION
    });
  });

  it("returns to the ordinary protocol when release-control already exists", async () => {
    const factory = new IDBFactory();
    await createNativeDatabase(factory, RELEASE_CONTROL_DATABASE_NAME, 1, { omitStore: "cases" });
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime(factory)
    )).resolves.toMatchObject({ kind: "normal", reasonCode: "CONTROL_PRESENT" });
  });

  it.each([
    ["wrong native version", 129, {}],
    ["missing store", LEGACY_V13_NATIVE_VERSION, { omitStore: "events" }],
    ["extra store", LEGACY_V13_NATIVE_VERSION, { addUnexpectedStore: true }]
  ])("fails closed for %s", async (_label, version, options) => {
    const factory = new IDBFactory();
    await createNativeDatabase(
      factory,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName!,
      version as number,
      options as { omitStore?: string; addUnexpectedStore?: boolean }
    );
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime(factory)
    )).resolves.toMatchObject({ kind: "ambiguous" });
  });

  it("fails closed when any target generation already exists", async () => {
    const factory = new IDBFactory();
    await createNativeDatabase(
      factory,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName!,
      LEGACY_V13_NATIVE_VERSION
    );
    await createNativeDatabase(
      factory,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      150,
      { omitStore: "cases" }
    );
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime(factory)
    )).resolves.toMatchObject({
      kind: "ambiguous",
      reasonCode: "RELATED_DATABASE_LAYOUT_UNSAFE"
    });
  });

  it("does not fall back to open when databases() is unavailable", async () => {
    const open = vi.fn() as unknown as IDBFactory["open"];
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { indexedDB: { open }, serviceWorker: null }
    )).resolves.toMatchObject({ kind: "ambiguous", reasonCode: "INVENTORY_UNAVAILABLE" });
    expect(open).not.toHaveBeenCalled();
  });

  it("aborts a missing-source creation race without leaving an empty database", async () => {
    const factory = new IDBFactory();
    await expect(openVerifiedExistingV13Database("missing-v13", runtime(factory)))
      .rejects.toMatchObject({ code: "SOURCE_DISAPPEARED" });
    expect(await factory.databases()).toEqual([]);
  });

  it("rejects a controller or dormant registration instead of trusting an arbitrary old shell", async () => {
    const factory = new IDBFactory();
    await createNativeDatabase(
      factory,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName!,
      LEGACY_V13_NATIVE_VERSION
    );
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { indexedDB: factory, serviceWorker: { controller: {}, getRegistrations: async () => [] } }
    )).resolves.toMatchObject({ kind: "ambiguous", reasonCode: "SERVICE_WORKER_PRESENT" });
    await expect(inspectPrebootRecoveryState(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { indexedDB: factory, serviceWorker: { controller: null, getRegistrations: async () => [{}] } }
    )).resolves.toMatchObject({ kind: "ambiguous", reasonCode: "SERVICE_WORKER_PRESENT" });
  });
});
