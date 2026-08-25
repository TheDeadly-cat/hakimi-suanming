import type { ReleaseDatabaseDescriptor } from "../../release-protocol";

export const RELEASE_CONTROL_DATABASE_NAME = "hakimi-bazi-release-control";
export const LEGACY_V13_NATIVE_VERSION = 130;
export const RESEARCH_GENERATION_DATABASE_PREFIX = "hakimi-bazi-research.generation.";
const MAX_DATABASE_NAME_CHARACTERS = 512;
const PREBOOT_PROBE_TIMEOUT_MS = 5_000;

/**
 * Frozen physical Dexie v13 contract. This module intentionally does not import
 * @hakimi/storage or Dexie: it runs before the ordinary application entry and
 * must not construct a repository, controller, target database or control DB.
 */
export const LEGACY_V13_STORE_SCHEMA = Object.freeze({
  cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
  revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
  candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
  researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
  events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
  savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
  knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
  citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
  sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
  attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
  researcherProfiles: "id, updatedAt",
  appSettings: "id, updatedAt",
  ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
  tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
  eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
  birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
} as const);

export type SanitizedDatabaseInventoryEntry = {
  name: string;
  version: number | null;
};

type PrebootStateBase = {
  inventory: readonly SanitizedDatabaseInventoryEntry[];
  reasonCode: string;
};

export type PrebootRecoveryState =
  | (PrebootStateBase & { kind: "normal" })
  | (PrebootStateBase & {
    kind: "orphaned_v13";
    sourceDatabaseName: string;
    sourceNativeVersion: typeof LEGACY_V13_NATIVE_VERSION;
  })
  | (PrebootStateBase & { kind: "ambiguous" });

export type PrebootIndexedDB = Pick<IDBFactory, "open"> & {
  databases?: () => Promise<IDBDatabaseInfo[]>;
};

export type PrebootServiceWorkerContainer = {
  controller: unknown;
  getRegistrations?: () => Promise<readonly unknown[]>;
};

export type PrebootInventoryRuntime = {
  indexedDB?: PrebootIndexedDB | null;
  serviceWorker?: PrebootServiceWorkerContainer | null;
};

export type VerifiedV13NativeDatabase = {
  database: IDBDatabase;
  sourceDatabaseName: string;
  sourceNativeVersion: typeof LEGACY_V13_NATIVE_VERSION;
};

type NativeIndexContract = {
  name: string;
  keyPath: string | readonly string[];
  unique: boolean;
  multiEntry: boolean;
};

type NativeStoreContract = {
  keyPath: string | readonly string[];
  autoIncrement: boolean;
  indexes: readonly NativeIndexContract[];
};

export class PrebootDatabaseInventoryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "PrebootDatabaseInventoryError";
  }
}

function canonicalDatabaseName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    Array.from(value).length <= MAX_DATABASE_NAME_CHARACTERS &&
    !/[\p{Cc}\p{Cf}]/u.test(value);
}

function requireCanonicalDatabaseName(value: unknown): string {
  if (!canonicalDatabaseName(value)) {
    throw new PrebootDatabaseInventoryError(
      "SOURCE_NAME_INVALID",
      "The v13 source database name is not a bounded canonical string."
    );
  }
  return value;
}

function withPrebootProbeTimeout<Value>(
  operation: Promise<Value>,
  code: string,
  message: string
): Promise<Value> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      reject(new PrebootDatabaseInventoryError(code, message));
    }, PREBOOT_PROBE_TIMEOUT_MS);
    operation.then(
      (value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      (reason) => {
        globalThis.clearTimeout(timeout);
        reject(reason);
      }
    );
  });
}

function normalizeKeyPath(keyPath: string | string[] | null): string | readonly string[] | null {
  return Array.isArray(keyPath) ? [...keyPath] : keyPath;
}

function compoundKeyPath(token: string): readonly string[] | null {
  return token.startsWith("[") && token.endsWith("]")
    ? token.slice(1, -1).split("+")
    : null;
}

function parseIndexToken(rawToken: string): NativeIndexContract {
  let token = rawToken;
  let unique = false;
  let multiEntry = false;
  while (token.startsWith("&") || token.startsWith("*")) {
    if (token[0] === "&") unique = true;
    if (token[0] === "*") multiEntry = true;
    token = token.slice(1);
  }
  const compound = compoundKeyPath(token);
  return {
    name: token,
    keyPath: compound ?? token,
    unique,
    multiEntry
  };
}

function parseStoreContract(schema: string): NativeStoreContract {
  const tokens = schema.split(",").map((token) => token.trim()).filter(Boolean);
  const primaryToken = tokens.shift();
  if (!primaryToken) throw new Error("Legacy v13 store contract is missing its primary key.");
  const autoIncrement = primaryToken.startsWith("++");
  const normalizedPrimary = autoIncrement ? primaryToken.slice(2) : primaryToken.replace(/^&/u, "");
  return {
    keyPath: compoundKeyPath(normalizedPrimary) ?? normalizedPrimary,
    autoIncrement,
    indexes: tokens.map(parseIndexToken).sort((left, right) => left.name.localeCompare(right.name))
  };
}

const LEGACY_V13_NATIVE_CONTRACT = Object.freeze(Object.fromEntries(
  Object.entries(LEGACY_V13_STORE_SCHEMA).map(([name, schema]) => [name, parseStoreContract(schema)])
) as Record<keyof typeof LEGACY_V13_STORE_SCHEMA, NativeStoreContract>);

function keyPathsEqual(
  left: string | readonly string[] | null,
  right: string | readonly string[] | null
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((entry, index) => entry === right[index]);
  }
  return left === right;
}

function assertLegacyV13NativeSchema(database: IDBDatabase): void {
  if (database.version !== LEGACY_V13_NATIVE_VERSION) {
    throw new PrebootDatabaseInventoryError(
      "SOURCE_VERSION_INVALID",
      "The orphaned source is not the frozen physical v13 database."
    );
  }
  const expectedStoreNames = Object.keys(LEGACY_V13_NATIVE_CONTRACT).sort();
  const actualStoreNames = Array.from(database.objectStoreNames).sort();
  if (
    actualStoreNames.length !== expectedStoreNames.length ||
    actualStoreNames.some((name, index) => name !== expectedStoreNames[index])
  ) {
    throw new PrebootDatabaseInventoryError(
      "SOURCE_SCHEMA_INVALID",
      "The orphaned source store set does not match frozen v13."
    );
  }

  const transaction = database.transaction(expectedStoreNames, "readonly");
  for (const storeName of expectedStoreNames) {
    const expected = LEGACY_V13_NATIVE_CONTRACT[storeName as keyof typeof LEGACY_V13_NATIVE_CONTRACT];
    const store = transaction.objectStore(storeName);
    if (
      store.autoIncrement !== expected.autoIncrement ||
      !keyPathsEqual(normalizeKeyPath(store.keyPath), expected.keyPath)
    ) {
      throw new PrebootDatabaseInventoryError(
        "SOURCE_SCHEMA_INVALID",
        `The orphaned source store ${storeName} has an unexpected primary key.`
      );
    }
    const actualIndexes = Array.from(store.indexNames).sort().map((indexName) => {
      const index = store.index(indexName);
      return {
        name: index.name,
        keyPath: normalizeKeyPath(index.keyPath),
        unique: index.unique,
        multiEntry: index.multiEntry
      };
    });
    if (actualIndexes.length !== expected.indexes.length) {
      throw new PrebootDatabaseInventoryError(
        "SOURCE_SCHEMA_INVALID",
        `The orphaned source store ${storeName} has an unexpected index count.`
      );
    }
    for (let index = 0; index < expected.indexes.length; index += 1) {
      const actual = actualIndexes[index];
      const expectedIndex = expected.indexes[index];
      if (
        actual.name !== expectedIndex.name ||
        actual.unique !== expectedIndex.unique ||
        actual.multiEntry !== expectedIndex.multiEntry ||
        !keyPathsEqual(actual.keyPath, expectedIndex.keyPath)
      ) {
        throw new PrebootDatabaseInventoryError(
          "SOURCE_SCHEMA_INVALID",
          `The orphaned source store ${storeName} has an unexpected index contract.`
        );
      }
    }
  }
}

function browserIndexedDB(runtime: PrebootInventoryRuntime): PrebootIndexedDB | null {
  if (runtime.indexedDB !== undefined) return runtime.indexedDB;
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function browserServiceWorker(runtime: PrebootInventoryRuntime): PrebootServiceWorkerContainer | null {
  if (runtime.serviceWorker !== undefined) return runtime.serviceWorker;
  return typeof navigator === "undefined" || !("serviceWorker" in navigator)
    ? null
    : navigator.serviceWorker;
}

function sanitizedRelevantInventory(
  databases: readonly IDBDatabaseInfo[],
  descriptor: ReleaseDatabaseDescriptor
): readonly SanitizedDatabaseInventoryEntry[] {
  const sourceName = descriptor.sourceDatabaseName;
  return databases.flatMap((database) => {
    const name = database.name;
    if (
      typeof name !== "string" ||
      !(
        name === RELEASE_CONTROL_DATABASE_NAME ||
        name === sourceName ||
        name === descriptor.databaseName ||
        name.startsWith(RESEARCH_GENERATION_DATABASE_PREFIX)
      )
    ) return [];
    if (!canonicalDatabaseName(name)) {
      throw new PrebootDatabaseInventoryError(
        "INVENTORY_NAME_INVALID",
        "A related database has an unsafe or non-canonical name."
      );
    }
    return [{
      name,
      version: typeof database.version === "number" &&
        Number.isSafeInteger(database.version) &&
        database.version > 0
        ? database.version
        : null
    }];
  }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

function inventoryHasDuplicateNames(inventory: readonly SanitizedDatabaseInventoryEntry[]): boolean {
  const names = new Set<string>();
  for (const database of inventory) {
    if (names.has(database.name)) return true;
    names.add(database.name);
  }
  return false;
}

export async function openVerifiedExistingV13Database(
  sourceDatabaseName: string,
  runtime: PrebootInventoryRuntime = {}
): Promise<VerifiedV13NativeDatabase> {
  const canonicalSourceDatabaseName = requireCanonicalDatabaseName(sourceDatabaseName);
  const factory = browserIndexedDB(runtime);
  if (!factory) {
    throw new PrebootDatabaseInventoryError(
      "INVENTORY_UNAVAILABLE",
      "IndexedDB is unavailable for the read-only rescue probe."
    );
  }
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(canonicalSourceDatabaseName);
    } catch {
      reject(new PrebootDatabaseInventoryError(
        "SOURCE_OPEN_FAILED",
        "The v13 source could not be opened for a read-only structure probe."
      ));
      return;
    }
    let settled = false;
    const timeout = globalThis.setTimeout(() => {
      fail(new PrebootDatabaseInventoryError(
        "SOURCE_OPEN_TIMEOUT",
        "The v13 source did not complete its read-only structure probe in time."
      ));
    }, PREBOOT_PROBE_TIMEOUT_MS);
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      reject(error);
    };
    request.onupgradeneeded = () => {
      try {
        request.transaction?.abort();
      } catch {
        // The failure below remains authoritative even if the request already aborted.
      }
      fail(new PrebootDatabaseInventoryError(
        "SOURCE_DISAPPEARED",
        "The v13 source disappeared after inventory; an empty replacement was not created."
      ));
    };
    request.onerror = () => fail(new PrebootDatabaseInventoryError(
      "SOURCE_OPEN_FAILED",
      "The v13 source could not be opened for a read-only structure probe."
    ));
    request.onblocked = () => fail(new PrebootDatabaseInventoryError(
      "SOURCE_OPEN_BLOCKED",
      "Another page blocked the v13 read-only structure probe."
    ));
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      try {
        assertLegacyV13NativeSchema(database);
      } catch (reason) {
        database.close();
        fail(reason instanceof Error ? reason : new Error("The v13 source schema is invalid."));
        return;
      }
      settled = true;
      globalThis.clearTimeout(timeout);
      resolve({
        database,
        sourceDatabaseName: canonicalSourceDatabaseName,
        sourceNativeVersion: LEGACY_V13_NATIVE_VERSION
      });
    };
  });
}

export async function inspectPrebootRecoveryState(
  descriptor: ReleaseDatabaseDescriptor,
  runtime: PrebootInventoryRuntime = {}
): Promise<PrebootRecoveryState> {
  if (descriptor.migrationId === null) {
    return { kind: "normal", reasonCode: "BRIDGE_RELEASE", inventory: [] };
  }
  const factory = browserIndexedDB(runtime);
  if (!factory || typeof factory.databases !== "function") {
    return { kind: "ambiguous", reasonCode: "INVENTORY_UNAVAILABLE", inventory: [] };
  }

  let inventory: readonly SanitizedDatabaseInventoryEntry[];
  try {
    inventory = sanitizedRelevantInventory(await withPrebootProbeTimeout(
      factory.databases(),
      "INVENTORY_TIMEOUT",
      "IndexedDB inventory did not complete in time."
    ), descriptor);
  } catch (reason) {
    return {
      kind: "ambiguous",
      reasonCode: reason instanceof PrebootDatabaseInventoryError
        ? reason.code
        : "INVENTORY_UNAVAILABLE",
      inventory: []
    };
  }
  if (inventoryHasDuplicateNames(inventory)) {
    return { kind: "ambiguous", reasonCode: "INVENTORY_DUPLICATE_NAMES", inventory };
  }
  if (inventory.some((database) => database.name === RELEASE_CONTROL_DATABASE_NAME)) {
    return { kind: "normal", reasonCode: "CONTROL_PRESENT", inventory };
  }
  if (inventory.length === 0) {
    return { kind: "normal", reasonCode: "FRESH_INSTALL", inventory };
  }

  const sourceName = descriptor.sourceDatabaseName;
  const source = sourceName === null
    ? undefined
    : inventory.find((database) => database.name === sourceName);
  const generationDatabases = inventory.filter((database) =>
    database.name.startsWith(RESEARCH_GENERATION_DATABASE_PREFIX) ||
    database.name === descriptor.databaseName
  );
  if (
    sourceName === null ||
    descriptor.sourceSchema !== 13 ||
    !source ||
    source.version !== LEGACY_V13_NATIVE_VERSION ||
    generationDatabases.length > 0 ||
    inventory.length !== 1
  ) {
    return { kind: "ambiguous", reasonCode: "RELATED_DATABASE_LAYOUT_UNSAFE", inventory };
  }

  const serviceWorker = browserServiceWorker(runtime);
  if (serviceWorker?.controller) {
    return { kind: "ambiguous", reasonCode: "SERVICE_WORKER_PRESENT", inventory };
  }
  if (serviceWorker && typeof serviceWorker.getRegistrations !== "function") {
    return { kind: "ambiguous", reasonCode: "SERVICE_WORKER_STATE_UNAVAILABLE", inventory };
  }
  if (serviceWorker) {
    try {
      if ((await withPrebootProbeTimeout(
        serviceWorker.getRegistrations!(),
        "SERVICE_WORKER_STATE_TIMEOUT",
        "Service Worker registration inventory did not complete in time."
      )).length > 0) {
        return { kind: "ambiguous", reasonCode: "SERVICE_WORKER_PRESENT", inventory };
      }
    } catch (reason) {
      return {
        kind: "ambiguous",
        reasonCode: reason instanceof PrebootDatabaseInventoryError
          ? reason.code
          : "SERVICE_WORKER_STATE_UNAVAILABLE",
        inventory
      };
    }
  }

  try {
    const verified = await openVerifiedExistingV13Database(sourceName, runtime);
    verified.database.close();
  } catch (reason) {
    return {
      kind: "ambiguous",
      reasonCode: reason instanceof PrebootDatabaseInventoryError
        ? reason.code
        : "SOURCE_SCHEMA_INVALID",
      inventory
    };
  }
  return {
    kind: "orphaned_v13",
    reasonCode: "ORPHANED_V13_VERIFIED",
    inventory,
    sourceDatabaseName: sourceName,
    sourceNativeVersion: LEGACY_V13_NATIVE_VERSION
  };
}
