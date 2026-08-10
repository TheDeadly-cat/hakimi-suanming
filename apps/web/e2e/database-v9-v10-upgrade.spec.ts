import { expect, test, type Page } from "@playwright/test";

const DATABASE_NAME = "hakimi-bazi-research";
const NATIVE_V9_VERSION = 90;
const NATIVE_V13_VERSION = 130;

const V9_USER_PARTITIONS = [
  "cases",
  "revisions",
  "candidateSets",
  "researchNotes",
  "events",
  "savedViews",
  "knowledgeDocuments",
  "citations",
  "sourceRights"
] as const;

const CURRENT_NEW_PARTITIONS = ["appSettings", "attachments", "eventTimeMigrationReceipts", "researcherProfiles", "ruleRegistry", "tzdbMigrationReceipts"] as const;

const existingRows: Record<(typeof V9_USER_PARTITIONS)[number], Record<string, unknown>> = {
  cases: { id: "10000000-0000-4000-8000-000000000001", sentinel: "cases", nested: { ordinal: 1 }, values: [1, null, "甲"] },
  revisions: { id: "10000000-0000-4000-8000-000000000002", sentinel: "revisions", nested: { ordinal: 2 }, values: [2, null, "乙"] },
  candidateSets: { id: "10000000-0000-4000-8000-000000000003", sentinel: "candidateSets", nested: { ordinal: 3 }, values: [3, null, "丙"] },
  researchNotes: { id: "10000000-0000-4000-8000-000000000004", sentinel: "researchNotes", nested: { ordinal: 4 }, values: [4, null, "丁"] },
  events: { id: "10000000-0000-4000-8000-000000000005", sentinel: "events", nested: { ordinal: 5 }, values: [5, null, "戊"] },
  savedViews: { id: "10000000-0000-4000-8000-000000000006", sentinel: "savedViews", nested: { ordinal: 6 }, values: [6, null, "己"] },
  knowledgeDocuments: { id: "10000000-0000-4000-8000-000000000007", sentinel: "knowledgeDocuments", nested: { ordinal: 7 }, values: [7, null, "庚"] },
  citations: { id: "10000000-0000-4000-8000-000000000008", sentinel: "citations", nested: { ordinal: 8 }, values: [8, null, "辛"] },
  sourceRights: {
    documentId: "10000000-0000-4000-8000-000000000007",
    sentinel: "sourceRights",
    nested: { ordinal: 9 },
    values: [9, null, "壬"]
  }
};

const existingBirthFingerprint = {
  key: "revision:10000000-0000-4000-8000-000000000002",
  sentinel: "birthFingerprints",
  nested: { ordinal: 10 },
  values: [10, null, "derived"]
};

async function openSeedDocument(page: Page) {
  await page.route("**/__e2e__/indexeddb-v9-seed", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"zh-CN\"><title>IndexedDB v9 seed</title><body>seed</body></html>"
    });
  });
  await page.goto("/__e2e__/indexeddb-v9-seed", { waitUntil: "domcontentloaded" });
}

async function seedNativeV9Database(page: Page) {
  await openSeedDocument(page);
  await page.evaluate(async ({ databaseName, nativeVersion, rows, fingerprint }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
      request.onblocked = () => reject(new Error("IndexedDB delete was blocked"));
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, nativeVersion);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB v9 open failed"));
      request.onblocked = () => reject(new Error("IndexedDB v9 open was blocked"));
      request.onupgradeneeded = () => {
        const db = request.result;
        const createStore = (
          name: string,
          keyPath: string,
          indexes: Array<{ name: string; keyPath: string | string[]; multiEntry?: boolean }>
        ) => {
          const store = db.createObjectStore(name, { keyPath });
          for (const index of indexes) {
            store.createIndex(index.name, index.keyPath, { multiEntry: index.multiEntry ?? false });
          }
        };

        createStore("cases", "id", [
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "deletedAt", keyPath: "deletedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true },
          { name: "latestRevisionId", keyPath: "latestRevisionId" }
        ]);
        createStore("revisions", "id", [
          { name: "caseId", keyPath: "caseId" },
          { name: "[caseId+revisionNumber]", keyPath: ["caseId", "revisionNumber"] },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "manifest.resultHash", keyPath: "manifest.resultHash" }
        ]);
        createStore("candidateSets", "id", [
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "deletedAt", keyPath: "deletedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true },
          { name: "candidateSet.resultHash", keyPath: "candidateSet.resultHash" }
        ]);
        createStore("researchNotes", "id", [
          { name: "caseId", keyPath: "caseId" },
          { name: "[caseId+lifecycle]", keyPath: ["caseId", "lifecycle"] },
          { name: "anchor.kind", keyPath: "anchor.kind" },
          { name: "anchor.revisionId", keyPath: "anchor.revisionId" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true }
        ]);
        createStore("events", "id", [
          { name: "caseId", keyPath: "caseId" },
          { name: "revisionId", keyPath: "revisionId" },
          { name: "datePrecision", keyPath: "datePrecision" },
          { name: "startDate", keyPath: "startDate" },
          { name: "timeContext.kind", keyPath: "timeContext.kind" },
          { name: "timeContext.start.canonicalUtc", keyPath: "timeContext.start.canonicalUtc" },
          { name: "deletedAt", keyPath: "deletedAt" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true }
        ]);
        createStore("savedViews", "id", [
          { name: "state", keyPath: "state" },
          { name: "recordVersion", keyPath: "recordVersion" },
          { name: "name", keyPath: "name" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" }
        ]);
        createStore("knowledgeDocuments", "id", [
          { name: "contentHash", keyPath: "contentHash" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "format", keyPath: "format" },
          { name: "fileName", keyPath: "fileName" }
        ]);
        createStore("citations", "id", [
          { name: "documentId", keyPath: "documentId" },
          { name: "documentContentHash", keyPath: "documentContentHash" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "status", keyPath: "status" },
          { name: "targetKeys", keyPath: "targetKeys", multiEntry: true }
        ]);
        createStore("sourceRights", "documentId", [
          { name: "documentContentHash", keyPath: "documentContentHash" },
          { name: "origin", keyPath: "origin" },
          { name: "rights.status", keyPath: "rights.status" },
          { name: "rights.distributionPolicy", keyPath: "rights.distributionPolicy" },
          { name: "review.status", keyPath: "review.status" },
          { name: "updatedAt", keyPath: "updatedAt" }
        ]);
        createStore("birthFingerprints", "key", [
          { name: "fingerprint", keyPath: "fingerprint" },
          { name: "sourceId", keyPath: "sourceId" },
          { name: "subjectId", keyPath: "subjectId" },
          { name: "recordType", keyPath: "recordType" }
        ]);
      };
      request.onsuccess = () => resolve(request.result);
    });

    const tableNames = Object.keys(rows) as Array<keyof typeof rows>;
    const transaction = database.transaction([...tableNames, "birthFingerprints"], "readwrite");
    for (const tableName of tableNames) transaction.objectStore(tableName).put(rows[tableName]);
    transaction.objectStore("birthFingerprints").put(fingerprint);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB seed transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB seed transaction aborted"));
    });

    database.close();
  }, {
    databaseName: DATABASE_NAME,
    nativeVersion: NATIVE_V9_VERSION,
    rows: existingRows,
    fingerprint: existingBirthFingerprint
  });
  await page.unroute("**/__e2e__/indexeddb-v9-seed");
}

async function inspectDatabase(page: Page, includeNewPartitions = true) {
  return page.evaluate(async ({ databaseName, userPartitions, newPartitions, includeNew }) => {
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
    const tableNames = [
      ...userPartitions,
      "birthFingerprints",
      ...(includeNew ? newPartitions : [])
    ];
    const transaction = database.transaction(tableNames, "readonly");
    const rows = Object.fromEntries(await Promise.all(userPartitions.map(async (tableName) => [
      tableName,
      await requestResult(transaction.objectStore(tableName).getAll())
    ])));
    const birthFingerprints = await requestResult(transaction.objectStore("birthFingerprints").getAll());
    const newPartitionCounts = Object.fromEntries(await Promise.all((includeNew ? newPartitions : []).map(async (tableName) => [
      tableName,
      await requestResult(transaction.objectStore(tableName).count())
    ])));
    const newPartitionIndexes = Object.fromEntries((includeNew ? newPartitions : []).map((tableName) => [
      tableName,
      [...transaction.objectStore(tableName).indexNames].sort()
    ]));
    const result = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort(),
      rows,
      birthFingerprints,
      newPartitionCounts,
      newPartitionIndexes
    };
    database.close();
    return result;
  }, {
    databaseName: DATABASE_NAME,
    userPartitions: V9_USER_PARTITIONS,
    newPartitions: CURRENT_NEW_PARTITIONS,
    includeNew: includeNewPartitions
  });
}

test("真实浏览器将 v9 九个用户分区原文保留，并新增六个空的 v10/v11/v12/v13 分区", async ({ page }) => {
  await seedNativeV9Database(page);
  const before = await inspectDatabase(page, false);
  expect(before.nativeVersion).toBe(NATIVE_V9_VERSION);

  // Loading the real production app imports ResearchDatabase and opens it at
  // Dexie v13. The sentinel rows are intentionally schema-minimal because this
  // migration must be a byte-for-byte structural upgrade, not a record rewrite.
  await page.goto("/__e2e__/trigger-v11-upgrade", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await inspectDatabase(page)).nativeVersion).toBe(NATIVE_V13_VERSION);

  const after = await inspectDatabase(page);
  expect(after.stores).toEqual([
    "appSettings",
    "attachments",
    "birthFingerprints",
    "candidateSets",
    "cases",
    "citations",
    "eventTimeMigrationReceipts",
    "events",
    "knowledgeDocuments",
    "researchNotes",
    "researcherProfiles",
    "revisions",
    "ruleRegistry",
    "savedViews",
    "sourceRights",
    "tzdbMigrationReceipts"
  ]);
  for (const tableName of V9_USER_PARTITIONS) {
    expect(after.rows[tableName]).toEqual([existingRows[tableName]]);
  }
  expect(after.birthFingerprints).toEqual([existingBirthFingerprint]);
  expect(after.newPartitionCounts).toEqual({
    appSettings: 0,
    attachments: 0,
    eventTimeMigrationReceipts: 0,
    researcherProfiles: 0,
    ruleRegistry: 0,
    tzdbMigrationReceipts: 0
  });
  expect(after.newPartitionIndexes).toEqual({
    appSettings: ["updatedAt"],
    attachments: [
      "createdAt",
      "link.caseId",
      "link.documentId",
      "link.eventId",
      "link.kind",
      "link.noteId",
      "link.revisionId",
      "link.subjectId",
      "mediaType",
      "updatedAt"
    ],
    eventTimeMigrationReceipts: [
      "createdAt",
      "operation",
      "source.recordId",
      "source.snapshotDigest",
      "target.recordId",
      "target.snapshotDigest"
    ],
    researcherProfiles: ["updatedAt"],
    ruleRegistry: [
      "[packId+profileVersion]",
      "importedAt",
      "packId",
      "profileDigest",
      "recordType"
    ],
    tzdbMigrationReceipts: ["createdAt", "operation", "source.recordId", "target.recordId"]
  });
});
