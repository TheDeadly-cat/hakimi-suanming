import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  collectConsoleProblems,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const RESEARCH_DATABASE = "hakimi-bazi-research";
const RELEASE_CONTROL_DATABASE = "hakimi-bazi-release-control";
const DRAFT_STORAGE_PREFIX = "hakimi:research-query-draft:v1:";
const USER_DATA_STORES = [
  "appSettings",
  "attachments",
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
] as const;
const EXPECTED_CLEARED_STORES = [...USER_DATA_STORES, "birthFingerprints"].sort();

type StoreAudit = {
  storeNames: string[];
  counts: Record<string, number>;
  serializedRows: string;
};

function collectExternalRequests(context: BrowserContext, origin: string): string[] {
  const requests: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin) {
      requests.push(request.url());
    }
  });
  return requests;
}

async function createLegalResearchDraft(page: Page, privateSentinel: string): Promise<string> {
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  await page.getByRole("searchbox", { name: /检索别名、标签与研究正文/ }).fill(privateSentinel);
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?draft=[0-9a-f-]{36}$/iu);
  const draftId = new URL(page.url()).searchParams.get("draft");
  if (!draftId) throw new Error("ResearchQuery did not create a session draft UUID.");
  const draftKey = `${DRAFT_STORAGE_PREFIX}${draftId}`;
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), draftKey);
  expect(stored).toContain('"contract":"hakimi-research-query-draft@1"');
  expect(stored).toContain(privateSentinel);
  return draftKey;
}

async function clearAllLocalDataFromUi(page: Page) {
  await page.getByRole("button", { name: "开始完整清空", exact: true }).click();
  const confirmation = page.getByRole("group", { name: /输入“删除全部本地数据”以解锁/ });
  await confirmation.getByLabel("确认文字").fill("删除全部本地数据");
  await confirmation.getByRole("button", { name: "永久删除全部数据", exact: true }).click();

  const success = page.getByRole("status").filter({
    hasText: /十六个本地数据分区与临时检索草稿已全部清除/
  });
  await expect(success).toBeVisible();
  await expect(success).toContainText("已确认 2/2 个受控标签页");
}

async function injectNativePrivateSentinels(page: Page, privateSentinel: string): Promise<StoreAudit> {
  return page.evaluate(async ({ databaseName, sentinel }) => {
    const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Cannot open ${databaseName}`));
      request.onblocked = () => reject(new Error(`Opening ${databaseName} was blocked`));
      request.onupgradeneeded = () => reject(new Error(`${databaseName} unexpectedly required an upgrade`));
    });
    const requestValue = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
    const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    });
    const setPath = (record: Record<string, unknown>, path: string, value: IDBValidKey) => {
      const segments = path.split(".");
      let target = record;
      for (const segment of segments.slice(0, -1)) {
        const nested: Record<string, unknown> = {};
        target[segment] = nested;
        target = nested;
      }
      target[segments.at(-1)!] = value;
    };

    const database = await openDatabase();
    const storeNames = [...database.objectStoreNames].sort();
    const transaction = database.transaction(storeNames, "readwrite");
    const completion = transactionDone(transaction);
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const record: Record<string, unknown> = {
        e2ePrivateSentinel: sentinel,
        e2eStoreName: storeName
      };
      const keyPath = store.keyPath;
      if (typeof keyPath === "string") {
        setPath(record, keyPath, `${sentinel}:${storeName}:key`);
        store.put(record);
      } else if (Array.isArray(keyPath)) {
        keyPath.forEach((path, index) => setPath(record, path, `${sentinel}:${storeName}:key:${index}`));
        store.put(record);
      } else {
        store.put(record, `${sentinel}:${storeName}:key`);
      }
    }
    await completion;

    const auditTransaction = database.transaction(storeNames, "readonly");
    const [countEntries, rowEntries] = await Promise.all([
      Promise.all(storeNames.map(async (storeName) => [
        storeName,
        await requestValue(auditTransaction.objectStore(storeName).count())
      ] as const)),
      Promise.all(storeNames.map(async (storeName) => [
        storeName,
        await requestValue(auditTransaction.objectStore(storeName).getAll())
      ] as const))
    ]);
    database.close();
    return {
      storeNames,
      counts: Object.fromEntries(countEntries),
      serializedRows: JSON.stringify(Object.fromEntries(rowEntries))
    };
  }, { databaseName: RESEARCH_DATABASE, sentinel: privateSentinel });
}

async function auditNativeResearchDatabase(page: Page): Promise<StoreAudit> {
  return page.evaluate(async (databaseName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Cannot open ${databaseName}`));
      request.onblocked = () => reject(new Error(`Opening ${databaseName} was blocked`));
    });
    const requestValue = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB audit request failed"));
    });
    const storeNames = [...database.objectStoreNames].sort();
    const transaction = database.transaction(storeNames, "readonly");
    const [countEntries, rowEntries] = await Promise.all([
      Promise.all(storeNames.map(async (storeName) => [
        storeName,
        await requestValue(transaction.objectStore(storeName).count())
      ] as const)),
      Promise.all(storeNames.map(async (storeName) => [
        storeName,
        await requestValue(transaction.objectStore(storeName).getAll())
      ] as const))
    ]);
    database.close();
    return {
      storeNames,
      counts: Object.fromEntries(countEntries),
      serializedRows: JSON.stringify(Object.fromEntries(rowEntries))
    };
  }, RESEARCH_DATABASE);
}

async function auditCachesAndReleaseControl(page: Page, privateSentinel: string) {
  return page.evaluate(async ({ controlDatabaseName, sentinel }) => {
    const cacheNames = await caches.keys();
    let cacheContainsPrivateSentinel = false;
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        if (request.url.includes(sentinel)) cacheContainsPrivateSentinel = true;
        const response = await cache.match(request);
        if (response && (await response.clone().text()).includes(sentinel)) {
          cacheContainsPrivateSentinel = true;
        }
      }
    }

    const databases = await indexedDB.databases();
    const controlDatabasePresent = databases.some((entry) => entry.name === controlDatabaseName);
    let controlContainsPrivateSentinel = false;
    let controlStoreNames: string[] = [];
    if (controlDatabasePresent) {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(controlDatabaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Cannot open release control database"));
      });
      const requestValue = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Release control audit failed"));
      });
      controlStoreNames = [...database.objectStoreNames].sort();
      const transaction = database.transaction(controlStoreNames, "readonly");
      const rows = await Promise.all(controlStoreNames.map((storeName) =>
        requestValue(transaction.objectStore(storeName).getAll())
      ));
      controlContainsPrivateSentinel = JSON.stringify(rows).includes(sentinel);
      database.close();
    }
    return {
      cacheNames,
      cacheContainsPrivateSentinel,
      controlDatabasePresent,
      controlStoreNames,
      controlContainsPrivateSentinel
    };
  }, { controlDatabaseName: RELEASE_CONTROL_DATABASE, sentinel: privateSentinel });
}

test("完整清空会跨受控标签页删除应用私密草稿，同时保留无关 sessionStorage", async ({
  baseURL,
  context,
  page
}, testInfo) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const origin = new URL(baseURL).origin;
  const externalRequests = collectExternalRequests(context, origin);
  const privateSentinel = `p2_06_private_${crypto.randomUUID()}`;
  const unrelatedKey = `unrelated-session:${crypto.randomUUID()}`;
  const unrelatedValues = [`peer-one:${crypto.randomUUID()}`, `peer-two:${crypto.randomUUID()}`];
  const firstProblems = collectConsoleProblems(page);
  const secondPage = await context.newPage();
  const secondProblems = collectConsoleProblems(secondPage);

  const firstDraftKey = await createLegalResearchDraft(page, `${privateSentinel}:tab-one`);
  const secondDraftKey = await createLegalResearchDraft(secondPage, `${privateSentinel}:tab-two`);
  await Promise.all([
    page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
      key: unrelatedKey,
      value: unrelatedValues[0]
    }),
    secondPage.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
      key: unrelatedKey,
      value: unrelatedValues[1]
    })
  ]);

  await Promise.all([
    page.goto("/cases", { waitUntil: "domcontentloaded" }),
    secondPage.goto("/settings", { waitUntil: "domcontentloaded" })
  ]);
  await Promise.all([waitForAppReady(page), waitForAppReady(secondPage)]);
  await expect.poll(() => Promise.all([
    page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    secondPage.evaluate(() => Boolean(navigator.serviceWorker.controller))
  ])).toEqual([true, true]);

  await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  const seeded = await injectNativePrivateSentinels(secondPage, privateSentinel);
  expect(seeded.storeNames).toEqual(EXPECTED_CLEARED_STORES);
  expect(Object.values(seeded.counts)).toEqual(EXPECTED_CLEARED_STORES.map(() => 1));
  expect(seeded.serializedRows).toContain(privateSentinel);

  await clearAllLocalDataFromUi(page);

  const cleared = await auditNativeResearchDatabase(page);
  expect(cleared.storeNames).toEqual(EXPECTED_CLEARED_STORES);
  expect(cleared.counts).toEqual(Object.fromEntries(EXPECTED_CLEARED_STORES.map((storeName) => [storeName, 0])));
  expect(cleared.serializedRows).not.toContain(privateSentinel);

  expect(await Promise.all([
    page.evaluate((key) => sessionStorage.getItem(key), unrelatedKey),
    secondPage.evaluate((key) => sessionStorage.getItem(key), unrelatedKey)
  ])).toEqual(unrelatedValues);

  const privacyAudit = await auditCachesAndReleaseControl(page, privateSentinel);
  expect(privacyAudit.cacheNames.length).toBeGreaterThan(0);
  expect(privacyAudit.cacheContainsPrivateSentinel).toBe(false);
  expect(privacyAudit.controlDatabasePresent).toBe(true);
  expect(privacyAudit.controlStoreNames).toEqual(["migrationJournals", "migrationLeases", "releaseState"]);
  expect(privacyAudit.controlContainsPrivateSentinel).toBe(false);
  expect(externalRequests).toEqual([]);
  expect(firstProblems).toEqual([]);
  expect(secondProblems).toEqual([]);

  await expect.poll(() => Promise.all([
    page.evaluate((key) => sessionStorage.getItem(key), firstDraftKey),
    secondPage.evaluate((key) => sessionStorage.getItem(key), secondDraftKey)
  ])).toEqual([null, null]);

  await page.screenshot({ path: testInfo.outputPath("privacy-clear-success.png"), fullPage: false });
});
