import { expect, test, type Page } from "@playwright/test";

const DATABASE_NAME = "hakimi-bazi-research";
const NATIVE_V10_VERSION = 100;
const NATIVE_V13_VERSION = 130;

type StoreDefinition = {
  keyPath: string;
  indexes: Array<{
    name: string;
    keyPath: string | string[];
    multiEntry?: boolean;
    unique?: boolean;
  }>;
};

const v10StoreDefinitions: Record<string, StoreDefinition> = {
  cases: {
    keyPath: "id",
    indexes: [
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "deletedAt", keyPath: "deletedAt" },
      { name: "tags", keyPath: "tags", multiEntry: true },
      { name: "latestRevisionId", keyPath: "latestRevisionId" }
    ]
  },
  revisions: {
    keyPath: "id",
    indexes: [
      { name: "caseId", keyPath: "caseId" },
      { name: "[caseId+revisionNumber]", keyPath: ["caseId", "revisionNumber"] },
      { name: "createdAt", keyPath: "createdAt" },
      { name: "manifest.resultHash", keyPath: "manifest.resultHash" }
    ]
  },
  candidateSets: {
    keyPath: "id",
    indexes: [
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "deletedAt", keyPath: "deletedAt" },
      { name: "tags", keyPath: "tags", multiEntry: true },
      { name: "candidateSet.resultHash", keyPath: "candidateSet.resultHash" }
    ]
  },
  researchNotes: {
    keyPath: "id",
    indexes: [
      { name: "caseId", keyPath: "caseId" },
      { name: "[caseId+lifecycle]", keyPath: ["caseId", "lifecycle"] },
      { name: "anchor.kind", keyPath: "anchor.kind" },
      { name: "anchor.revisionId", keyPath: "anchor.revisionId" },
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "tags", keyPath: "tags", multiEntry: true }
    ]
  },
  events: {
    keyPath: "id",
    indexes: [
      { name: "caseId", keyPath: "caseId" },
      { name: "revisionId", keyPath: "revisionId" },
      { name: "datePrecision", keyPath: "datePrecision" },
      { name: "startDate", keyPath: "startDate" },
      { name: "timeContext.kind", keyPath: "timeContext.kind" },
      { name: "timeContext.start.canonicalUtc", keyPath: "timeContext.start.canonicalUtc" },
      { name: "deletedAt", keyPath: "deletedAt" },
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "tags", keyPath: "tags", multiEntry: true }
    ]
  },
  savedViews: {
    keyPath: "id",
    indexes: [
      { name: "state", keyPath: "state" },
      { name: "recordVersion", keyPath: "recordVersion" },
      { name: "name", keyPath: "name" },
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "createdAt", keyPath: "createdAt" }
    ]
  },
  knowledgeDocuments: {
    keyPath: "id",
    indexes: [
      { name: "contentHash", keyPath: "contentHash" },
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "createdAt", keyPath: "createdAt" },
      { name: "format", keyPath: "format" },
      { name: "fileName", keyPath: "fileName" }
    ]
  },
  citations: {
    keyPath: "id",
    indexes: [
      { name: "documentId", keyPath: "documentId" },
      { name: "documentContentHash", keyPath: "documentContentHash" },
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "createdAt", keyPath: "createdAt" },
      { name: "status", keyPath: "status" },
      { name: "targetKeys", keyPath: "targetKeys", multiEntry: true }
    ]
  },
  sourceRights: {
    keyPath: "documentId",
    indexes: [
      { name: "documentContentHash", keyPath: "documentContentHash" },
      { name: "origin", keyPath: "origin" },
      { name: "rights.status", keyPath: "rights.status" },
      { name: "rights.distributionPolicy", keyPath: "rights.distributionPolicy" },
      { name: "review.status", keyPath: "review.status" },
      { name: "updatedAt", keyPath: "updatedAt" }
    ]
  },
  attachments: {
    keyPath: "id",
    indexes: [
      { name: "updatedAt", keyPath: "updatedAt" },
      { name: "createdAt", keyPath: "createdAt" },
      { name: "mediaType", keyPath: "mediaType" },
      { name: "link.kind", keyPath: "link.kind" },
      { name: "link.subjectId", keyPath: "link.subjectId" },
      { name: "link.caseId", keyPath: "link.caseId" },
      { name: "link.revisionId", keyPath: "link.revisionId" },
      { name: "link.noteId", keyPath: "link.noteId" },
      { name: "link.eventId", keyPath: "link.eventId" },
      { name: "link.documentId", keyPath: "link.documentId" }
    ]
  },
  researcherProfiles: {
    keyPath: "id",
    indexes: [{ name: "updatedAt", keyPath: "updatedAt" }]
  },
  appSettings: {
    keyPath: "id",
    indexes: [{ name: "updatedAt", keyPath: "updatedAt" }]
  },
  birthFingerprints: {
    keyPath: "key",
    indexes: [
      { name: "fingerprint", keyPath: "fingerprint" },
      { name: "sourceId", keyPath: "sourceId" },
      { name: "subjectId", keyPath: "subjectId" },
      { name: "recordType", keyPath: "recordType" }
    ]
  }
};

const v10Rows: Record<string, Record<string, unknown>> = {
  cases: { id: "10000000-0000-4000-8000-000000000001", sentinel: "cases", nested: { ordinal: 1 } },
  revisions: { id: "10000000-0000-4000-8000-000000000002", sentinel: "revisions", nested: { ordinal: 2 } },
  candidateSets: { id: "10000000-0000-4000-8000-000000000003", sentinel: "candidateSets", nested: { ordinal: 3 } },
  researchNotes: { id: "10000000-0000-4000-8000-000000000004", sentinel: "researchNotes", nested: { ordinal: 4 } },
  events: { id: "10000000-0000-4000-8000-000000000005", sentinel: "events", nested: { ordinal: 5 } },
  savedViews: { id: "10000000-0000-4000-8000-000000000006", sentinel: "savedViews", nested: { ordinal: 6 } },
  knowledgeDocuments: { id: "10000000-0000-4000-8000-000000000007", sentinel: "knowledgeDocuments", nested: { ordinal: 7 } },
  citations: { id: "10000000-0000-4000-8000-000000000008", sentinel: "citations", nested: { ordinal: 8 } },
  sourceRights: { documentId: "10000000-0000-4000-8000-000000000007", sentinel: "sourceRights", nested: { ordinal: 9 } },
  attachments: { id: "10000000-0000-4000-8000-000000000010", sentinel: "attachments", nested: { ordinal: 10 } },
  researcherProfiles: { id: "local-researcher-profile", sentinel: "researcherProfiles", nested: { ordinal: 11 } },
  appSettings: { id: "local-app-settings", sentinel: "appSettings", nested: { ordinal: 12 } },
  birthFingerprints: { key: "revision:10000000-0000-4000-8000-000000000002", sentinel: "birthFingerprints", nested: { ordinal: 13 } }
};

const expectedV10Stores = Object.keys(v10StoreDefinitions).sort();
const expectedV13Stores = [...expectedV10Stores, "ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts"].sort();

async function seedNativeV10Database(page: Page) {
  await page.route("**/__e2e__/indexeddb-v10-seed", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"zh-CN\"><title>IndexedDB v10 seed</title><body>seed</body></html>"
    });
  });
  await page.goto("/__e2e__/indexeddb-v10-seed", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ databaseName, nativeVersion, definitions, rows }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
      request.onblocked = () => reject(new Error("IndexedDB delete was blocked"));
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, nativeVersion);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB v10 open failed"));
      request.onblocked = () => reject(new Error("IndexedDB v10 open was blocked"));
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [name, definition] of Object.entries(definitions)) {
          const store = db.createObjectStore(name, { keyPath: definition.keyPath });
          for (const index of definition.indexes) {
            store.createIndex(index.name, index.keyPath, {
              multiEntry: index.multiEntry ?? false,
              unique: index.unique ?? false
            });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

    const tableNames = Object.keys(rows);
    const transaction = database.transaction(tableNames, "readwrite");
    for (const tableName of tableNames) transaction.objectStore(tableName).put(rows[tableName]);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB seed transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB seed transaction aborted"));
    });
    database.close();
  }, {
    databaseName: DATABASE_NAME,
    nativeVersion: NATIVE_V10_VERSION,
    definitions: v10StoreDefinitions,
    rows: v10Rows
  });
  await page.unroute("**/__e2e__/indexeddb-v10-seed");
}

async function inspectDatabase(page: Page, includeCurrentStores: boolean) {
  return page.evaluate(async ({ databaseName, rows, includeCurrent }) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB inspection open failed"));
      request.onblocked = () => reject(new Error("IndexedDB inspection was blocked"));
    });
    const oldTableNames = Object.keys(rows);
    const transaction = database.transaction([
      ...oldTableNames,
      ...(includeCurrent ? ["ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts"] : [])
    ], "readonly");
    const storedRows = Object.fromEntries(await Promise.all(oldTableNames.map(async (tableName) => [
      tableName,
      await requestResult(transaction.objectStore(tableName).getAll())
    ])));

    let ruleRegistry: null | {
      count: number;
      keyPath: string | string[] | null;
      indexes: Array<{
        name: string;
        keyPath: string | string[];
        multiEntry: boolean;
        unique: boolean;
      }>;
    } = null;
    if (includeCurrent) {
      const store = transaction.objectStore("ruleRegistry");
      ruleRegistry = {
        count: await requestResult(store.count()),
        keyPath: Array.isArray(store.keyPath) ? [...store.keyPath] : store.keyPath,
        indexes: [...store.indexNames].sort().map((name) => {
          const index = store.index(name);
          return {
            name,
            keyPath: Array.isArray(index.keyPath) ? [...index.keyPath] : index.keyPath,
            multiEntry: index.multiEntry,
            unique: index.unique
          };
        })
      };
    }

    let tzdbMigrationReceipts: typeof ruleRegistry = null;
    if (includeCurrent) {
      const store = transaction.objectStore("tzdbMigrationReceipts");
      tzdbMigrationReceipts = {
        count: await requestResult(store.count()),
        keyPath: Array.isArray(store.keyPath) ? [...store.keyPath] : store.keyPath,
        indexes: [...store.indexNames].sort().map((name) => {
          const index = store.index(name);
          return {
            name,
            keyPath: Array.isArray(index.keyPath) ? [...index.keyPath] : index.keyPath,
            multiEntry: index.multiEntry,
            unique: index.unique
          };
        })
      };
    }

    let eventTimeMigrationReceipts: typeof ruleRegistry = null;
    if (includeCurrent) {
      const store = transaction.objectStore("eventTimeMigrationReceipts");
      eventTimeMigrationReceipts = {
        count: await requestResult(store.count()),
        keyPath: Array.isArray(store.keyPath) ? [...store.keyPath] : store.keyPath,
        indexes: [...store.indexNames].sort().map((name) => {
          const index = store.index(name);
          return {
            name,
            keyPath: Array.isArray(index.keyPath) ? [...index.keyPath] : index.keyPath,
            multiEntry: index.multiEntry,
            unique: index.unique
          };
        })
      };
    }

    const result = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort(),
      rows: storedRows,
      ruleRegistry,
      tzdbMigrationReceipts,
      eventTimeMigrationReceipts
    };
    database.close();
    return result;
  }, { databaseName: DATABASE_NAME, rows: v10Rows, includeCurrent: includeCurrentStores });
}

test("真实浏览器将 v10 原数据逐字保留，并新增空的 v11 规则仓库、v12 候选组凭证与 v13 事件凭证", async ({ page }) => {
  await seedNativeV10Database(page);
  expect(await inspectDatabase(page, false)).toEqual({
    nativeVersion: NATIVE_V10_VERSION,
    stores: expectedV10Stores,
    rows: Object.fromEntries(Object.entries(v10Rows).map(([name, row]) => [name, [row]])),
    ruleRegistry: null,
    tzdbMigrationReceipts: null,
    eventTimeMigrationReceipts: null
  });

  await page.goto("/__e2e__/trigger-v11-upgrade", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(async (databaseName) => {
    const metadata = await indexedDB.databases();
    return metadata.find((entry) => entry.name === databaseName)?.version ?? null;
  }, DATABASE_NAME)).toBe(NATIVE_V13_VERSION);

  expect(await inspectDatabase(page, true)).toEqual({
    nativeVersion: NATIVE_V13_VERSION,
    stores: expectedV13Stores,
    rows: Object.fromEntries(Object.entries(v10Rows).map(([name, row]) => [name, [row]])),
    ruleRegistry: {
      count: 0,
      keyPath: "id",
      indexes: [
        {
          name: "[packId+profileVersion]",
          keyPath: ["packId", "profileVersion"],
          multiEntry: false,
          unique: true
        },
        { name: "importedAt", keyPath: "importedAt", multiEntry: false, unique: false },
        { name: "packId", keyPath: "packId", multiEntry: false, unique: false },
        { name: "profileDigest", keyPath: "profileDigest", multiEntry: false, unique: false },
        { name: "recordType", keyPath: "recordType", multiEntry: false, unique: false }
      ]
    },
    tzdbMigrationReceipts: {
      count: 0,
      keyPath: "id",
      indexes: [
        { name: "createdAt", keyPath: "createdAt", multiEntry: false, unique: false },
        { name: "operation", keyPath: "operation", multiEntry: false, unique: false },
        { name: "source.recordId", keyPath: "source.recordId", multiEntry: false, unique: false },
        { name: "target.recordId", keyPath: "target.recordId", multiEntry: false, unique: false }
      ]
    },
    eventTimeMigrationReceipts: {
      count: 0,
      keyPath: "id",
      indexes: [
        { name: "createdAt", keyPath: "createdAt", multiEntry: false, unique: false },
        { name: "operation", keyPath: "operation", multiEntry: false, unique: false },
        { name: "source.recordId", keyPath: "source.recordId", multiEntry: false, unique: false },
        { name: "source.snapshotDigest", keyPath: "source.snapshotDigest", multiEntry: false, unique: false },
        { name: "target.recordId", keyPath: "target.recordId", multiEntry: false, unique: false },
        { name: "target.snapshotDigest", keyPath: "target.snapshotDigest", multiEntry: false, unique: false }
      ]
    }
  });
});
