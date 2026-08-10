import { expect, test, type Page } from "@playwright/test";

const DATABASE_NAME = "hakimi-bazi-research";
const NATIVE_V8_VERSION = 80;
const NATIVE_V13_VERSION = 130;
const LEGACY_CREATED_AT = "2026-08-01T00:00:00.000Z";
const VALID_VIEW_ID = "88888888-8888-4888-8888-888888888888";
const INVALID_VIEW_ID = "99999999-9999-4999-8999-999999999999";
const FINGERPRINT_SOURCE_ID = "77777777-7777-4777-8777-777777777777";

type LegacySavedView = {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  sort?: { field: "relevance" | "updatedAt" | "createdAt" | "alias"; direction: "asc" | "desc" };
  createdAt: string;
  updatedAt: string;
};

const validLegacyView: LegacySavedView = {
  schemaVersion: "1.0.0",
  id: VALID_VIEW_ID,
  name: "旧版事业流年检索",
  query: "事业 流年",
  filters: {
    nested: { tags: ["事业"], includeArchived: true },
    threshold: 3,
  },
  sort: { field: "updatedAt", direction: "desc" },
  createdAt: LEGACY_CREATED_AT,
  updatedAt: LEGACY_CREATED_AT,
};

const invalidLegacyView: LegacySavedView = {
  schemaVersion: "1.0.0",
  id: INVALID_VIEW_ID,
  name: "缺少排序的损坏记录",
  query: "事业",
  filters: {},
  createdAt: LEGACY_CREATED_AT,
  updatedAt: LEGACY_CREATED_AT,
};

const fingerprintSentinel = {
  key: `revision:${FINGERPRINT_SOURCE_ID}`,
  sourceId: FINGERPRINT_SOURCE_ID,
  fingerprint: `hakimi-birth-fingerprint@1:${"7".repeat(64)}`,
  subjectId: "66666666-6666-4666-8666-666666666666",
  recordType: "revision",
};

const expectedV8Stores = [
  "birthFingerprints",
  "candidateSets",
  "cases",
  "citations",
  "events",
  "knowledgeDocuments",
  "researchNotes",
  "revisions",
  "savedViews",
  "sourceRights",
];

const expectedV13Stores = [
  "appSettings",
  "attachments",
  ...expectedV8Stores,
  "researcherProfiles",
  "ruleRegistry",
  "tzdbMigrationReceipts",
  "eventTimeMigrationReceipts",
].sort();

async function openSeedDocument(page: Page) {
  await page.route("**/__e2e__/indexeddb-seed", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"zh-CN\"><title>IndexedDB seed</title><body>seed</body></html>",
    });
  });
  await page.goto("/__e2e__/indexeddb-seed", { waitUntil: "domcontentloaded" });
}

async function seedNativeV8Database(page: Page, savedViews: LegacySavedView[], keepConnectionOpen = false) {
  await openSeedDocument(page);
  await page.evaluate(async ({ databaseName, nativeVersion, records, sentinel, keepOpen }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
      request.onblocked = () => reject(new Error("IndexedDB delete was blocked"));
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, nativeVersion);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB v8 open failed"));
      request.onblocked = () => reject(new Error("IndexedDB v8 open was blocked"));
      request.onupgradeneeded = () => {
        const db = request.result;
        const createStore = (
          name: string,
          keyPath: string,
          indexes: Array<{ name: string; keyPath: string | string[]; multiEntry?: boolean }>,
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
          { name: "latestRevisionId", keyPath: "latestRevisionId" },
        ]);
        createStore("revisions", "id", [
          { name: "caseId", keyPath: "caseId" },
          { name: "[caseId+revisionNumber]", keyPath: ["caseId", "revisionNumber"] },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "manifest.resultHash", keyPath: "manifest.resultHash" },
        ]);
        createStore("candidateSets", "id", [
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "deletedAt", keyPath: "deletedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true },
          { name: "candidateSet.resultHash", keyPath: "candidateSet.resultHash" },
        ]);
        createStore("researchNotes", "id", [
          { name: "caseId", keyPath: "caseId" },
          { name: "[caseId+lifecycle]", keyPath: ["caseId", "lifecycle"] },
          { name: "anchor.kind", keyPath: "anchor.kind" },
          { name: "anchor.revisionId", keyPath: "anchor.revisionId" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true },
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
          { name: "tags", keyPath: "tags", multiEntry: true },
        ]);
        createStore("savedViews", "id", [
          { name: "name", keyPath: "name" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" },
        ]);
        createStore("knowledgeDocuments", "id", [
          { name: "contentHash", keyPath: "contentHash" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "format", keyPath: "format" },
          { name: "fileName", keyPath: "fileName" },
        ]);
        createStore("citations", "id", [
          { name: "documentId", keyPath: "documentId" },
          { name: "documentContentHash", keyPath: "documentContentHash" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "createdAt", keyPath: "createdAt" },
          { name: "status", keyPath: "status" },
          { name: "targetKeys", keyPath: "targetKeys", multiEntry: true },
        ]);
        createStore("sourceRights", "documentId", [
          { name: "documentContentHash", keyPath: "documentContentHash" },
          { name: "origin", keyPath: "origin" },
          { name: "rights.status", keyPath: "rights.status" },
          { name: "rights.distributionPolicy", keyPath: "rights.distributionPolicy" },
          { name: "review.status", keyPath: "review.status" },
          { name: "updatedAt", keyPath: "updatedAt" },
        ]);
        createStore("birthFingerprints", "key", [
          { name: "fingerprint", keyPath: "fingerprint" },
          { name: "sourceId", keyPath: "sourceId" },
          { name: "subjectId", keyPath: "subjectId" },
          { name: "recordType", keyPath: "recordType" },
        ]);
      };
      request.onsuccess = () => resolve(request.result);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["savedViews", "birthFingerprints"], "readwrite");
      const store = transaction.objectStore("savedViews");
      for (const record of records) store.put(record);
      transaction.objectStore("birthFingerprints").put(sentinel);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB seed transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB seed transaction aborted"));
    });
    if (keepOpen) {
      database.onversionchange = () => undefined;
      (globalThis as typeof globalThis & { __hakimiHeldV8?: IDBDatabase }).__hakimiHeldV8 = database;
    } else {
      database.close();
    }
  }, {
    databaseName: DATABASE_NAME,
    nativeVersion: NATIVE_V8_VERSION,
    records: savedViews,
    sentinel: fingerprintSentinel,
    keepOpen: keepConnectionOpen,
  });
  await page.unroute("**/__e2e__/indexeddb-seed");
}

async function closeHeldV8Connection(page: Page) {
  await page.evaluate(() => {
    const holder = globalThis as typeof globalThis & { __hakimiHeldV8?: IDBDatabase };
    holder.__hakimiHeldV8?.close();
    delete holder.__hakimiHeldV8;
  });
}

async function inspectDatabase(page: Page, recordIds: string[]) {
  return page.evaluate(async ({ databaseName, ids }) => {
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
    const transaction = database.transaction(["savedViews", "birthFingerprints"], "readonly");
    const store = transaction.objectStore("savedViews");
    const recordRequests = ids.map((id) => requestResult(store.get(id)));
    const fingerprintRequest = requestResult(transaction.objectStore("birthFingerprints").getAll());
    const [records, fingerprintRecords] = await Promise.all([Promise.all(recordRequests), fingerprintRequest]);
    const result = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort(),
      savedViewIndexes: [...store.indexNames].sort(),
      records,
      fingerprintRecords,
    };
    database.close();
    return result;
  }, { databaseName: DATABASE_NAME, ids: recordIds });
}

function expectedV8Inspection(records: LegacySavedView[]) {
  return {
    nativeVersion: NATIVE_V8_VERSION,
    stores: expectedV8Stores,
    savedViewIndexes: ["createdAt", "name", "updatedAt"],
    records,
    fingerprintRecords: [fingerprintSentinel],
  };
}

test("真实浏览器将合法 Dexie v8 SavedView 原文无损升级为 v13 中的人工审核态", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await seedNativeV8Database(page, [validLegacyView]);
  expect(await inspectDatabase(page, [VALID_VIEW_ID])).toEqual(expectedV8Inspection([validLegacyView]));
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("专业研究检索 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
  await expect(page.getByText("旧版视图 · 待人工审核迁移", { exact: true })).toBeVisible();
  await expect(page.getByText("不可执行", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "开始审核", exact: true }).click();
  await expect(page.getByRole("heading", { name: `审核旧视图“${validLegacyView.name}”` })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("系统不会据此选择范围、生命周期或任何命理条件，也不会自动执行");
  await expect(page.getByText(validLegacyView.query, { exact: true })).toBeVisible();
  await expect(page.getByText(/"includeArchived": true/)).toBeVisible();

  const inspection = await inspectDatabase(page, [VALID_VIEW_ID]);
  expect(inspection).toEqual({
    nativeVersion: NATIVE_V13_VERSION,
    stores: expectedV13Stores,
    savedViewIndexes: ["createdAt", "name", "recordVersion", "state", "updatedAt"],
    records: [{
      schemaVersion: "1.0.0",
      recordVersion: 2,
      state: "migration_required",
      id: VALID_VIEW_ID,
      name: validLegacyView.name,
      legacyRecord: validLegacyView,
      migrationReason: "legacy_untyped_filters_require_manual_review",
      editVersion: 1,
      createdAt: LEGACY_CREATED_AT,
      updatedAt: LEGACY_CREATED_AT,
    }],
    fingerprintRecords: [fingerprintSentinel],
  });
  expect(consoleProblems).toEqual([]);
});

test("真实浏览器遇到损坏 v8 SavedView 时回滚整个 v9 事务并保留原库", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await seedNativeV8Database(page, [validLegacyView, invalidLegacyView]);
  const beforeUpgrade = await inspectDatabase(page, [VALID_VIEW_ID, INVALID_VIEW_ID]);
  expect(beforeUpgrade).toEqual(expectedV8Inspection([validLegacyView, invalidLegacyView]));
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  const recoveryAlert = page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" });
  await expect(recoveryAlert).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
  await expect(recoveryAlert).toContainText("普通工作台、排盘、案例、事件、运限、知识导入、规则激活、恢复和删除入口均已停止渲染");
  await expect(recoveryAlert).toContainText("故障阶段：storage");
  await expect(recoveryAlert).toContainText("请勿清除浏览器数据");
  const recoveryNav = page.getByRole("navigation", { name: "启动恢复导航" });
  await expect(recoveryNav.getByRole("link", { name: "启动诊断" })).toHaveAttribute("href", "/settings");
  await expect(recoveryNav.getByRole("link", { name: "只读安全备份" })).toHaveAttribute("href", "/settings/data");
  await expect(page.getByRole("button", { name: "导出启动诊断 JSON" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("false");
  await expect(page.locator("vite-error-overlay, #vite-error-overlay")).toHaveCount(0);

  await recoveryNav.getByRole("link", { name: "只读安全备份" }).click();
  await expect(page).toHaveTitle("只读安全备份 · 哈基米八字研究台");
  await expect(page.getByRole("button", { name: "导出只读完整备份 ZIP" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);

  const inspection = await inspectDatabase(page, [VALID_VIEW_ID, INVALID_VIEW_ID]);
  expect(inspection).toEqual(beforeUpgrade);
  expect(inspection.records.every((record) => !("state" in record) && !("recordVersion" in record))).toBe(true);
  expect(consoleProblems.some((problem) => problem.includes("应用启动自检失败"))).toBe(true);
  expect(consoleProblems.filter((problem) => problem.startsWith("pageerror:"))).toEqual([]);
});

test("真实浏览器提示旧 v8 标签页占用，并在关闭旧连接后重新载入完成升级", async ({ context, page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const holderPage = await context.newPage();
  await seedNativeV8Database(holderPage, [validLegacyView], true);
  expect(await inspectDatabase(holderPage, [VALID_VIEW_ID])).toEqual(expectedV8Inspection([validLegacyView]));

  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  const recoveryAlert = page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" });
  await expect(recoveryAlert).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
  await expect(recoveryAlert).toContainText("普通工作台、排盘、案例、事件、运限、知识导入、规则激活、恢复和删除入口均已停止渲染");
  await expect(recoveryAlert).toContainText("故障阶段：timeout");
  await expect(recoveryAlert).toContainText("请勿清除浏览器数据");
  await expect(page.getByRole("navigation", { name: "启动恢复导航" }).getByRole("link", { name: "启动诊断" })).toHaveAttribute("href", "/settings");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady), { timeout: 20_000 }).toBe("false");

  await closeHeldV8Connection(holderPage);
  await holderPage.close();
  await expect.poll(() => page.evaluate(async (databaseName) => {
    const metadata = await indexedDB.databases();
    return metadata.find((entry) => entry.name === databaseName)?.version ?? null;
  }, DATABASE_NAME), { timeout: 15_000 }).toBe(NATIVE_V13_VERSION);
  await expect(recoveryAlert).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("false");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
  await expect(page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" })).toHaveCount(0);
  await expect(page).toHaveTitle("专业研究检索 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toBeVisible();
  await expect(page.getByText("旧版视图 · 待人工审核迁移", { exact: true })).toBeVisible();
  expect(await inspectDatabase(page, [VALID_VIEW_ID])).toEqual({
    nativeVersion: NATIVE_V13_VERSION,
    stores: expectedV13Stores,
    savedViewIndexes: ["createdAt", "name", "recordVersion", "state", "updatedAt"],
    records: [{
      schemaVersion: "1.0.0",
      recordVersion: 2,
      state: "migration_required",
      id: VALID_VIEW_ID,
      name: validLegacyView.name,
      legacyRecord: validLegacyView,
      migrationReason: "legacy_untyped_filters_require_manual_review",
      editVersion: 1,
      createdAt: LEGACY_CREATED_AT,
      updatedAt: LEGACY_CREATED_AT,
    }],
    fingerprintRecords: [fingerprintSentinel],
  });
  expect(consoleProblems.some((problem) => problem.includes("应用启动自检失败"))).toBe(true);
  expect(consoleProblems.filter((problem) => problem.startsWith("pageerror:"))).toEqual([]);
});
