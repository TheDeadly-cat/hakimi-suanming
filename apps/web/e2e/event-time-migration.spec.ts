import { readFile, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  type EventRecord,
  type EventTimeMigrationReceipt,
  type LegacyEventRecordV1
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { RUNTIME_TIME_ZONE_DATABASE, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import {
  collectConsoleProblems,
  completeRestoreSafetyGate,
  createDemoCase,
  expectMobileNoOverflow,
  expectPartitionCount,
  exportFullBackupZip,
  openDataManagement,
  preflightBackupZip,
  waitForAppReady
} from "./full-backup-helpers";

const DATABASE_NAME = "hakimi-bazi-research";
const NATIVE_DEXIE_V7_VERSION = 70;
const NATIVE_DEXIE_V13_VERSION = 130;
const MINUTE_EVENT_ID = "70000000-0000-4000-8000-000000000001";
const DAY_EVENT_ID = "70000000-0000-4000-8000-000000000002";
const MINUTE_EVENT_TITLE = "合法合成 v7 · 纽约 DST 重叠";
const DAY_EVENT_TITLE = "合法合成 v7 · 日历日事件";
const LEGACY_CREATED_AT = "2026-08-01T00:00:00.000Z";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

type LegalCaseFixture = {
  caseId: string;
  revisionId: string;
  caseRecord: Record<string, unknown>;
  revisionRecord: Record<string, unknown>;
  birthFingerprints: Array<Record<string, unknown>>;
};

type EventMigrationSnapshot = {
  nativeVersion: number;
  stores: string[];
  events: EventRecord[];
  receipts: EventTimeMigrationReceipt[];
};

const V7_STORES = [
  "birthFingerprints",
  "candidateSets",
  "cases",
  "citations",
  "events",
  "knowledgeDocuments",
  "researchNotes",
  "revisions",
  "savedViews",
  "sourceRights"
].sort();

const V13_STORES = [
  "appSettings",
  "attachments",
  ...V7_STORES,
  "eventTimeMigrationReceipts",
  "researcherProfiles",
  "ruleRegistry",
  "tzdbMigrationReceipts"
].sort();

function legacyEvents(caseId: string, revisionId: string): LegacyEventRecordV1[] {
  const common = {
    schemaVersion: "1.0.0" as const,
    caseId,
    revisionId,
    transitNodeRef: null,
    tags: ["迁移", "合法合成夹具"],
    sourceRefs: ["E2E 合法合成 Dexie v7 Event v1"],
    feedback: "unreviewed" as const,
    bodyFormat: "markdown" as const,
    deletedAt: null,
    createdAt: LEGACY_CREATED_AT,
    updatedAt: LEGACY_CREATED_AT
  };
  return [
    {
      ...common,
      id: MINUTE_EVENT_ID,
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      endDate: null,
      title: MINUTE_EVENT_TITLE,
      body: "v7 没有保存 IANA 时区；必须由研究者明确选择 DST overlap 的 earlier 或 later。"
    },
    {
      ...common,
      id: DAY_EVENT_ID,
      datePrecision: "day",
      startDate: "2022-06-18",
      endDate: null,
      title: DAY_EVENT_TITLE,
      body: "日精度旧记录只能显式派生为 calendar_date，不引入时区或 UTC。"
    }
  ];
}

async function readLegalCaseFixture(page: Page): Promise<LegalCaseFixture> {
  await createDemoCase(page);
  const match = new URL(page.url()).pathname.match(/^\/cases\/([^/]+)\/revisions\/([^/]+)$/);
  if (!match) throw new Error(`演示案例 URL 不符合预期：${page.url()}`);
  const [, caseId, revisionId] = match;
  return page.evaluate(async ({ databaseName, caseId: selectedCaseId, revisionId: selectedRevisionId }) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("读取合法案例夹具失败"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
      request.onupgradeneeded = () => reject(new Error("读取案例夹具时意外触发升级"));
    });
    const transaction = database.transaction(["cases", "revisions", "birthFingerprints"], "readonly");
    const [caseRecord, revisionRecord, birthFingerprints] = await Promise.all([
      requestResult(transaction.objectStore("cases").get(selectedCaseId)),
      requestResult(transaction.objectStore("revisions").get(selectedRevisionId)),
      requestResult(transaction.objectStore("birthFingerprints").getAll())
    ]);
    database.close();
    if (!caseRecord || !revisionRecord) throw new Error("演示案例缺少案例或修订记录");
    return {
      caseId: selectedCaseId,
      revisionId: selectedRevisionId,
      caseRecord: caseRecord as Record<string, unknown>,
      revisionRecord: revisionRecord as Record<string, unknown>,
      birthFingerprints: birthFingerprints as Array<Record<string, unknown>>
    };
  }, { databaseName: DATABASE_NAME, caseId, revisionId });
}

async function openSeedDocument(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
  await page.goto("about:blank");
  await page.route("**/__e2e__/event-time-migration-v7-seed", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"zh-CN\"><title>Event v7 seed</title><body>seed</body></html>"
    });
  });
  await page.goto("/__e2e__/event-time-migration-v7-seed", { waitUntil: "domcontentloaded" });
}

async function seedNativeV7Database(page: Page, fixture: LegalCaseFixture): Promise<void> {
  await openSeedDocument(page);
  const events = legacyEvents(fixture.caseId, fixture.revisionId);
  await page.evaluate(async ({ databaseName, nativeVersion, fixture, events }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("删除当前 IndexedDB 失败"));
      request.onblocked = () => reject(new Error("删除当前 IndexedDB 被旧连接阻塞"));
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, nativeVersion);
      request.onerror = () => reject(request.error ?? new Error("创建 native Dexie v7 数据库失败"));
      request.onblocked = () => reject(new Error("创建 native Dexie v7 数据库被阻塞"));
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
          { name: "deletedAt", keyPath: "deletedAt" },
          { name: "updatedAt", keyPath: "updatedAt" },
          { name: "tags", keyPath: "tags", multiEntry: true }
        ]);
        createStore("savedViews", "id", [
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

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["cases", "revisions", "events", "birthFingerprints"], "readwrite");
      transaction.objectStore("cases").put(fixture.caseRecord);
      transaction.objectStore("revisions").put(fixture.revisionRecord);
      for (const event of events) transaction.objectStore("events").put(event);
      for (const fingerprint of fixture.birthFingerprints) {
        transaction.objectStore("birthFingerprints").put(fingerprint);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("写入 native Dexie v7 夹具失败"));
      transaction.onabort = () => reject(transaction.error ?? new Error("native Dexie v7 夹具事务中止"));
    });
    database.close();
  }, {
    databaseName: DATABASE_NAME,
    nativeVersion: NATIVE_DEXIE_V7_VERSION,
    fixture,
    events
  });

  const inspection = await inspectLegacyV7Database(page);
  expect(inspection.nativeVersion).toBe(NATIVE_DEXIE_V7_VERSION);
  expect(inspection.stores).toEqual(V7_STORES);
  expect(inspection.eventIndexes).toEqual([
    "caseId",
    "datePrecision",
    "deletedAt",
    "revisionId",
    "startDate",
    "tags",
    "updatedAt"
  ]);
  expect(inspection.events).toEqual(events);
  expect(inspection.events.every((event) => !("recordVersion" in event) && !("timeContext" in event))).toBe(true);
  await page.unroute("**/__e2e__/event-time-migration-v7-seed");
}

async function inspectLegacyV7Database(page: Page) {
  return page.evaluate(async (databaseName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("读取 native Dexie v7 失败"));
      request.onupgradeneeded = () => reject(new Error("只读 v7 审计意外触发升级"));
    });
    const transaction = database.transaction("events", "readonly");
    const store = transaction.objectStore("events");
    const events = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Array<Record<string, unknown>>);
      request.onerror = () => reject(request.error ?? new Error("读取 v7 Event 失败"));
    });
    const result = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort(),
      eventIndexes: [...store.indexNames].sort(),
      events: events.sort((left, right) => String(left.id).localeCompare(String(right.id)))
    };
    database.close();
    return result;
  }, DATABASE_NAME);
}

async function readEventMigrationSnapshot(page: Page): Promise<EventMigrationSnapshot> {
  return page.evaluate(async (databaseName) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("读取事件迁移快照失败"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("无法打开事件迁移数据库"));
      request.onupgradeneeded = () => reject(new Error("只读事件迁移审计意外触发升级"));
    });
    const transaction = database.transaction(["events", "eventTimeMigrationReceipts"], "readonly");
    const [events, receipts] = await Promise.all([
      requestResult(transaction.objectStore("events").getAll()),
      requestResult(transaction.objectStore("eventTimeMigrationReceipts").getAll())
    ]);
    const result = {
      nativeVersion: database.version,
      stores: [...database.objectStoreNames].sort(),
      events: (events as EventRecord[]).sort((left, right) => left.id.localeCompare(right.id)),
      receipts: (receipts as EventTimeMigrationReceipt[]).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
      )
    };
    database.close();
    return result;
  }, DATABASE_NAME);
}

function eventResearchPath(fixture: LegalCaseFixture, eventId: string): string {
  return `/cases/${fixture.caseId}/revisions/${fixture.revisionId}?view=research&event=${eventId}`;
}

function eventCard(page: Page, eventId: string) {
  return page.locator(`[data-event-id="${eventId}"]`);
}

async function expectExactPartitionCount(page: Page, partitionLabel: string, count: number): Promise<void> {
  const overview = page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" });
  const label = overview.locator("dt").getByText(partitionLabel, { exact: true });
  await expect(label).toHaveCount(1);
  await expect(label.locator("..").locator("dd")).toHaveText(String(count));
}

async function assertMobileAccessibility(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
  const axe = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  expect(axe.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target)
  })), "390×844 事件时间迁移界面存在 WCAG A/AA 错误").toEqual([]);
}

test("合法合成 native Dexie v7 Event v1 在真实 Edge 显式派生新 ID，并以 v1.1 备份恢复时间谱系", async ({ context, page, baseURL }) => {
  test.setTimeout(240_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  const consoleProblems = collectConsoleProblems(page);

  // 先通过真实 UI 取得一组完整且可验证的 case/revision，再将它们连同严格 Event v1
  // 记录写入 native IDB version 70。这样夹具既合法，又不会用测试代码伪造命盘摘要。
  const fixture = await readLegalCaseFixture(page);
  await seedNativeV7Database(page, fixture);

  await page.goto(eventResearchPath(fixture, MINUTE_EVENT_ID), { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "记录真实事件" })).toBeVisible();

  const upgraded = await readEventMigrationSnapshot(page);
  expect(upgraded.nativeVersion).toBe(NATIVE_DEXIE_V13_VERSION);
  expect(upgraded.stores).toEqual(V13_STORES);
  expect(upgraded.receipts).toEqual([]);
  expect(upgraded.events).toHaveLength(2);
  for (const event of upgraded.events) {
    expect(event).toMatchObject({ recordVersion: 2, timeContext: { kind: "legacy_floating" } });
    expect(event.timeContext).not.toHaveProperty("timeZone");
    expect(event.timeContext).not.toHaveProperty("start.canonicalUtc");
  }

  const minuteSourceBefore = upgraded.events.find((event) => event.id === MINUTE_EVENT_ID)!;
  const daySourceBefore = upgraded.events.find((event) => event.id === DAY_EVENT_ID)!;
  const minuteSourceDigestBefore = await sha256Hex(minuteSourceBefore);
  const daySourceDigestBefore = await sha256Hex(daySourceBefore);

  const minuteSourceCard = eventCard(page, MINUTE_EVENT_ID);
  await expect(minuteSourceCard).toHaveAttribute("aria-label", `事件 ${MINUTE_EVENT_TITLE}`);
  await expect(minuteSourceCard).toContainText("旧版悬空时间");
  await minuteSourceCard.getByRole("button", { name: "解释时间并创建并列事件" }).click();
  const minutePanel = minuteSourceCard.locator(".event-time-migration-panel");
  await expect(minutePanel.getByRole("heading", { name: "解释旧事件时间" })).toBeFocused();
  const timeZoneInput = minutePanel.getByLabel(/事件发生地时区/);
  await timeZoneInput.fill("America/New_York");
  await expect(minutePanel.getByRole("group", { name: /起始时间出现 DST 重叠/ })).toBeVisible();
  await expect(minutePanel.getByText("2025-11-02T05:30:00Z", { exact: false })).toBeVisible();
  await expect(minutePanel.getByText("2025-11-02T06:30:00Z", { exact: false })).toBeVisible();

  const confirmation = minutePanel.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ });
  const deriveButton = minutePanel.getByRole("button", { name: "生成并列事件" });
  await expect(confirmation).toBeDisabled();
  await minutePanel.getByRole("radio", { name: /较早瞬时点/ }).check();
  await expect(confirmation).toBeEnabled();
  await confirmation.check();
  await expect(confirmation).toBeChecked();
  await minutePanel.getByRole("radio", { name: /较晚瞬时点/ }).check();
  await expect(confirmation).not.toBeChecked();
  await expect(deriveButton).toBeDisabled();
  await minutePanel.getByRole("radio", { name: /较早瞬时点/ }).check();
  await confirmation.check();
  await deriveButton.click();
  const minuteSuccess = minutePanel.locator(".event-time-migration-success");
  await expect(minuteSuccess).toContainText("新事件和时间迁移凭证已生成，旧事件未改写");
  await expect(minuteSuccess).toBeFocused();

  const afterMinute = await readEventMigrationSnapshot(page);
  expect(afterMinute.events).toHaveLength(3);
  expect(afterMinute.receipts).toHaveLength(1);
  const minuteSourceAfter = afterMinute.events.find((event) => event.id === MINUTE_EVENT_ID)!;
  const minuteTarget = afterMinute.events.find((event) =>
    event.id !== MINUTE_EVENT_ID && event.title === MINUTE_EVENT_TITLE
  )!;
  const minuteReceipt = afterMinute.receipts[0];
  expect(minuteSourceAfter).toEqual(minuteSourceBefore);
  expect(minuteSourceAfter.updatedAt).toBe(LEGACY_CREATED_AT);
  expect(await sha256Hex(minuteSourceAfter)).toBe(minuteSourceDigestBefore);
  expect(minuteTarget.id).not.toBe(MINUTE_EVENT_ID);
  expect(minuteTarget).toMatchObject({
    caseId: fixture.caseId,
    revisionId: fixture.revisionId,
    transitNodeRef: null,
    datePrecision: "minute",
    startDate: "2025-11-02T01:30",
    timeContext: {
      kind: "zoned_minute",
      timeZone: "America/New_York",
      tzdbVersion: RUNTIME_TZDB_VERSION,
      timeZoneDatabase: {
        ianaVersion: "2026c",
        snapshotId: RUNTIME_TIME_ZONE_DATABASE.snapshotId,
        dataSha256: RUNTIME_TIME_ZONE_DATABASE.dataSha256
      },
      start: {
        localDateTime: "2025-11-02T01:30",
        canonicalUtc: "2025-11-02T05:30:00Z",
        resolution: {
          kind: "overlap",
          policy: "earlier",
          status: "resolved_overlap_earlier",
          selectedCandidate: { choice: "earlier", utcOffset: "-04:00" }
        }
      },
      end: null
    }
  });
  expect(minuteTarget.createdAt).toBe(minuteTarget.updatedAt);
  expect(minuteReceipt).toMatchObject({
    operation: "event_time_semantic_derivation",
    authorization: { kind: "explicit_local_user_confirmation" },
    source: {
      kind: "event",
      recordId: MINUTE_EVENT_ID,
      snapshot: {
        caseId: fixture.caseId,
        revisionId: fixture.revisionId,
        transitNodeRef: null,
        datePrecision: "minute",
        startDate: "2025-11-02T01:30",
        timeContext: { kind: "legacy_floating" }
      }
    },
    target: {
      kind: "event",
      recordId: minuteTarget.id,
      snapshot: {
        caseId: fixture.caseId,
        revisionId: fixture.revisionId,
        transitNodeRef: null,
        datePrecision: "minute",
        startDate: "2025-11-02T01:30",
        timeContext: { kind: "zoned_minute", timeZone: "America/New_York" }
      }
    },
    interpretation: {
      kind: "zoned_minute",
      timeZone: "America/New_York",
      startDisambiguation: "earlier",
      endDisambiguation: null
    },
    createdAt: minuteTarget.createdAt
  });
  expect(minuteReceipt.source.snapshotDigest).toBe(await sha256Hex(minuteReceipt.source.snapshot));
  expect(minuteReceipt.target.snapshotDigest).toBe(await sha256Hex(minuteReceipt.target.snapshot));
  expect(minuteReceipt.source.snapshotDigest).not.toBe(minuteReceipt.target.snapshotDigest);

  // 成功态包含最长的 IANA/UTC/谱系文本，正适合做安卓宽度和自动无障碍审计。
  await assertMobileAccessibility(page);
  await page.setViewportSize({ width: 1280, height: 820 });

  const daySourceCard = eventCard(page, DAY_EVENT_ID);
  await expect(daySourceCard).toHaveAttribute("aria-label", `事件 ${DAY_EVENT_TITLE}`);
  await daySourceCard.getByRole("button", { name: "解释时间并创建并列事件" }).click();
  const dayPanel = daySourceCard.locator(".event-time-migration-panel");
  await expect(dayPanel.getByText(/日历日期不适用 IANA 时区、DST、UTC 偏移或标准 UTC/)).toBeVisible();
  await expect(dayPanel.getByLabel(/事件发生地时区/)).toHaveCount(0);
  await dayPanel.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }).check();
  await dayPanel.getByRole("button", { name: "生成并列事件" }).click();
  await expect(dayPanel.locator(".event-time-migration-success")).toContainText("旧事件未改写");

  const migrated = await readEventMigrationSnapshot(page);
  expect(migrated.events).toHaveLength(4);
  expect(migrated.receipts).toHaveLength(2);
  const finalMinuteSource = migrated.events.find((event) => event.id === MINUTE_EVENT_ID)!;
  const finalDaySource = migrated.events.find((event) => event.id === DAY_EVENT_ID)!;
  const dayTarget = migrated.events.find((event) =>
    event.id !== DAY_EVENT_ID && event.title === DAY_EVENT_TITLE
  )!;
  const dayReceipt = migrated.receipts.find((receipt) => receipt.source.recordId === DAY_EVENT_ID)!;
  expect(finalMinuteSource).toEqual(minuteSourceBefore);
  expect(await sha256Hex(finalMinuteSource)).toBe(minuteSourceDigestBefore);
  expect(finalDaySource).toEqual(daySourceBefore);
  expect(finalDaySource.updatedAt).toBe(LEGACY_CREATED_AT);
  expect(await sha256Hex(finalDaySource)).toBe(daySourceDigestBefore);
  expect(dayTarget.id).not.toBe(DAY_EVENT_ID);
  expect(dayTarget).toMatchObject({
    caseId: fixture.caseId,
    revisionId: fixture.revisionId,
    transitNodeRef: null,
    datePrecision: "day",
    startDate: "2022-06-18",
    timeContext: { kind: "calendar_date" }
  });
  expect(dayReceipt).toMatchObject({
    operation: "event_time_semantic_derivation",
    source: { recordId: DAY_EVENT_ID, snapshot: { timeContext: { kind: "legacy_floating" } } },
    target: { recordId: dayTarget.id, snapshot: { timeContext: { kind: "calendar_date" } } },
    interpretation: { kind: "calendar_date" },
    createdAt: dayTarget.createdAt
  });
  expect(dayReceipt.source.snapshotDigest).toBe(await sha256Hex(dayReceipt.source.snapshot));
  expect(dayReceipt.target.snapshotDigest).toBe(await sha256Hex(dayReceipt.target.snapshot));

  const reportPath = `/cases/${fixture.caseId}/revisions/${fixture.revisionId}?view=research`;
  await page.goto(reportPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const anonymizedToggle = page.getByRole("checkbox", { name: /匿名导出/ });
  await expect(anonymizedToggle).toBeChecked();
  await anonymizedToggle.uncheck();
  await page.getByRole("button", { name: "预览 PNG / PDF", exact: true }).click();
  let reportDialog = page.getByRole("dialog", { name: /单盘报告预览/ });
  await expect(reportDialog).toBeVisible();
  await expect(reportDialog).toContainText("完整资料模式 · 格式 1.4.0");
  const calculationSourceMarker = reportDialog.getByRole("group", {
    name: /下游计算来源：当前版本即时投影；精确复演：不适用；收据账本：当前发布代无收据账本/
  });
  await expect(calculationSourceMarker).toHaveAttribute("data-source", "explicit_projection");
  await expect(calculationSourceMarker).toHaveAttribute("data-ledger-status", "schema_unavailable");
  await expect(calculationSourceMarker).toHaveAttribute("data-comparison-status", "not_applicable");
  const calculationSourceSection = reportDialog.getByRole("region", { name: "下游计算来源" });
  await expect(calculationSourceSection).toContainText("当前发布代无收据账本（schema_unavailable）");
  await expect(calculationSourceSection).toContainText("历史输出比对未比较");
  const pillarFacts = reportDialog.getByRole("region", { name: "完整四柱事实" });
  await expect(pillarFacts.locator(".single-chart-pillar-facts-grid > article")).toHaveCount(4);
  await expect(pillarFacts).toContainText("支十神");
  await expect(pillarFacts).toContainText("五行");
  await expect(pillarFacts).toContainText("长生");
  await expect(reportDialog).toContainText("事件时间迁移血缘");
  for (const receipt of migrated.receipts) {
    await expect(reportDialog).toContainText(receipt.id);
    await expect(reportDialog).toContainText(receipt.source.recordId);
    await expect(reportDialog).toContainText(receipt.target.recordId);
    await expect(reportDialog).toContainText(receipt.source.snapshotDigest);
    await expect(reportDialog).toContainText(receipt.target.snapshotDigest);
  }
  await expect(reportDialog).toContainText("America/New_York");
  await expect(reportDialog).toContainText("2025-11-02T05:30:00Z");
  await expect(reportDialog).toContainText("calendar_date");
  await reportDialog.getByRole("button", { name: "关闭单盘报告预览", exact: true }).click();

  await expect.poll(() => page.evaluate(() => ({
    ready: document.documentElement.dataset.swReady,
    controlled: Boolean(navigator.serviceWorker.controller),
    bootSignalSent: document.documentElement.dataset.swBootSignalSent
  }))).toEqual({ ready: "true", controlled: true, bootSignalSent: "true" });
  const offlineDevtools = await context.newCDPSession(page);
  await offlineDevtools.send("Network.enable");
  await offlineDevtools.send("Network.setCacheDisabled", { cacheDisabled: true });
  await offlineDevtools.send("Network.clearBrowserCache");
  await context.setOffline(true);
  let documentDevtools: CDPSession | null = null;
  try {
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(new RegExp(`/cases/${fixture.caseId}/revisions/${fixture.revisionId}\\?view=research$`));
    // Edge 的 service-worker 导航会保留 context 级断网传输，却可能把新 renderer
    // 的 navigator.onLine 重置成 true。把新文档显式绑定到同一断网状态，再派发
    // offline 事件，让 useOnlineStatus 观察到已经证实的浏览器状态。
    documentDevtools = await context.newCDPSession(page);
    await documentDevtools.send("Network.enable");
    await documentDevtools.send("Network.overrideNetworkState", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText(/当前离线/)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectMobileNoOverflow(page);

    const offlineAnonymizedToggle = page.getByRole("checkbox", { name: /匿名导出/ });
    await expect(offlineAnonymizedToggle).toBeChecked();
    await offlineAnonymizedToggle.uncheck();

    await page.getByRole("button", { name: "导出单盘 Markdown", exact: true }).click();
    const deliveryDialog = page.getByRole("dialog", { name: "文件已在本机生成" });
    await expect(deliveryDialog).toBeVisible();
    await expect(deliveryDialog.getByRole("button", { name: "系统分享", exact: true })).toHaveCount(0);
    await expect(deliveryDialog).toContainText("这份工件包含敏感资料，系统分享已关闭");
    const markdownDownloadPromise = page.waitForEvent("download");
    await deliveryDialog.getByRole("button", { name: "下载文件", exact: true }).click();
    const markdownDownload = await markdownDownloadPromise;
    expect(markdownDownload.suggestedFilename()).toBe("hakimi-chart-r1-full.md");
    expect(await markdownDownload.failure()).toBeNull();
    const markdownPath = await markdownDownload.path();
    if (!markdownPath) throw new Error("完整单盘 Markdown 下载路径不可用");
    const markdown = await readFile(markdownPath, "utf8");
    const markdownSemanticText = markdown.replaceAll("\\_", "_");
    expect(markdown.startsWith([
      "---",
      "schemaVersion: \"1.0.0\"",
      "formatVersion: \"1.4.0\"",
      "kind: \"single_chart_research_report\"",
      "format: \"markdown\"",
      "anonymized: false",
      "---"
    ].join("\n"))).toBe(true);
    expect(markdownSemanticText).toContain("- 下游来源：当前显式版本投影（explicit_projection）");
    expect(markdownSemanticText).toContain("- 收据账本：schema_unavailable");
    expect(markdownSemanticText).toContain("- 历史输出已比较：否");
    expect(markdownSemanticText).toContain("## 事件时间迁移血缘");
    for (const event of migrated.events) expect(markdownSemanticText).toContain(`- Event ID：${event.id}`);
    expect(markdownSemanticText).toContain("旧来源字符串：E2E 合法合成 Dexie v7 Event v1");
    for (const receipt of migrated.receipts) {
      expect(markdownSemanticText).toContain(receipt.id);
      expect(markdownSemanticText).toContain(receipt.source.recordId);
      expect(markdownSemanticText).toContain(receipt.target.recordId);
      expect(markdownSemanticText).toContain(receipt.source.snapshotDigest);
      expect(markdownSemanticText).toContain(receipt.target.snapshotDigest);
    }
    expect(markdownSemanticText).toContain("America/New_York");
    expect(markdownSemanticText).toContain("2025-11-02T05:30:00Z");
    expect(markdownSemanticText).toContain("calendar_date");

    await deliveryDialog.getByRole("button", { name: "关闭文件交付", exact: true }).click();
    await expect(deliveryDialog).toBeHidden();

    await page.getByRole("button", { name: "预览 PNG / PDF", exact: true }).click();
    reportDialog = page.getByRole("dialog", { name: /单盘报告预览/ });
    await expect(reportDialog).toBeVisible();
    await expect(reportDialog).toContainText("完整资料模式 · 格式 1.4.0");
    for (const receipt of migrated.receipts) await expect(reportDialog).toContainText(receipt.id);
    await expect.poll(() => reportDialog.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
    await expectMobileNoOverflow(page);

    const pngDownloadPromise = page.waitForEvent("download");
    await reportDialog.getByRole("button", { name: "下载摘要 PNG", exact: true }).click();
    const pngDownload = await pngDownloadPromise;
    expect(pngDownload.suggestedFilename()).toBe("hakimi-chart-r1-full-summary.png");
    expect(await pngDownload.failure()).toBeNull();
    const pngPath = await pngDownload.path();
    if (!pngPath) throw new Error("完整单盘摘要 PNG 下载路径不可用");
    const png = await readFile(pngPath);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBe(2160);
    expect(png.readUInt32BE(20)).toBeGreaterThan(0);

    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(50_000);
    const pdfAuditPath = process.env.HAKIMI_PDF_AUDIT_PATH?.trim();
    if (pdfAuditPath) await writeFile(pdfAuditPath, pdf);

    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.e2ePrintCalled = "true";
      };
    });
    await reportDialog.getByRole("button", { name: "打印 / 保存 PDF", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-e2e-print-called", "true");
    await expect(page.getByText("已打开系统打印窗口；请选择“另存为 PDF”。", { exact: true })).toBeVisible();
    expect(consoleProblems).toEqual([]);
  } finally {
    if (documentDevtools) {
      await documentDevtools.send("Network.overrideNetworkState", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1
      });
      await documentDevtools.detach();
    }
    await context.setOffline(false);
    await offlineDevtools.send("Network.setCacheDisabled", { cacheDisabled: false });
    await offlineDevtools.detach();
  }
  await page.setViewportSize({ width: 1280, height: 820 });
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);

  await openDataManagement(page);
  await expectExactPartitionCount(page, "事件", 4);
  await expectPartitionCount(page, "事件时间迁移凭证", 2);
  const { bytes } = await exportFullBackupZip(page);
  const exported = await preflightFullBackupFile(bytes);
  expect(exported.migratedFromFormatVersion).toBeNull();
  expect(exported.manifest.formatVersion).toBe("1.2.0");
  expect(Object.keys(exported.manifest.counts)).toHaveLength(16);
  expect(exported.manifest.counts).toMatchObject({
    cases: 1,
    revisions: 1,
    events: 4,
    eventTimeMigrationReceipts: 2,
    revisionCalculationReceipts: 0
  });
  expect(exported.payload.events).toEqual(migrated.events);
  expect(exported.payload.eventTimeMigrationReceipts).toEqual(migrated.receipts);

  const browser = page.context().browser();
  if (!browser) throw new Error("无法创建全新 Edge 恢复上下文");
  const restoreContext = await browser.newContext({
    baseURL,
    acceptDownloads: true,
    serviceWorkers: "allow"
  });
  try {
    const restorePage = await restoreContext.newPage();
    const restoreProblems = collectConsoleProblems(restorePage);
    await openDataManagement(restorePage);
    await expectExactPartitionCount(restorePage, "事件", 0);
    await expectPartitionCount(restorePage, "事件时间迁移凭证", 0);
    await expectPartitionCount(restorePage, "Revision 计算收据", 0);
    await preflightBackupZip(restorePage, bytes, "event-time-migration-v1.1.zip");
    await completeRestoreSafetyGate(restorePage);
    await expectExactPartitionCount(restorePage, "事件", 4);
    await expectPartitionCount(restorePage, "事件时间迁移凭证", 2);

    const restored = await readEventMigrationSnapshot(restorePage);
    expect(restored.nativeVersion).toBe(NATIVE_DEXIE_V13_VERSION);
    expect(restored.stores).toEqual(V13_STORES);
    expect(restored.events).toEqual(migrated.events);
    expect(restored.receipts).toEqual(migrated.receipts);

    await restorePage.goto(eventResearchPath(fixture, MINUTE_EVENT_ID), { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredMinuteSource = eventCard(restorePage, MINUTE_EVENT_ID);
    await expect(restoredMinuteSource).toContainText("时间迁移关系 · 1 条凭证");
    const minuteTargetLink = restoredMinuteSource.getByRole("link", {
      name: `打开派生事件 ${minuteTarget.id}`
    });
    await expect(minuteTargetLink).toBeVisible();
    await minuteTargetLink.click();
    await expect.poll(() => new URL(restorePage.url()).searchParams.get("event")).toBe(minuteTarget.id);
    await expect(eventCard(restorePage, minuteTarget.id)).toBeVisible();

    await restorePage.goto(eventResearchPath(fixture, DAY_EVENT_ID), { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredDaySource = eventCard(restorePage, DAY_EVENT_ID);
    await expect(restoredDaySource).toContainText("时间迁移关系 · 1 条凭证");
    await expect(restoredDaySource.getByRole("link", {
      name: `打开派生事件 ${dayTarget.id}`
    })).toBeVisible();
    expect(restoreProblems).toEqual([]);
  } finally {
    await restoreContext.close();
  }

  expect(consoleProblems).toEqual([]);
});
