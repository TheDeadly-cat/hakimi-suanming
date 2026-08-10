import { expect, type Page } from "@playwright/test";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload,
  migrateLegacyEventRecordV1,
  type CandidateSetRecord,
  type EventRecord,
  type EventTimeMigrationReceipt,
  type TzdbMigrationReceipt,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { RUNTIME_TIME_ZONE_DATABASE, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { waitForAppReady } from "./full-backup-helpers";

const EVENT_SOURCE_ID = "71000000-0000-4000-8000-000000000001";
const EVENT_TITLE = "跨浏览器混合回执 · 纽约 DST 重叠";
const FIXTURE_CREATED_AT = "2026-08-01T00:00:00.000Z";

export type MixedMigrationSnapshot = {
  candidateSets: CandidateSetRecord[];
  tzdbMigrationReceipts: TzdbMigrationReceipt[];
  events: EventRecord[];
  eventTimeMigrationReceipts: EventTimeMigrationReceipt[];
};

export type MixedMigrationFixture = {
  snapshot: MixedMigrationSnapshot;
  candidateSourceId: string;
  candidateTargetId: string;
  eventSourceId: string;
  eventTargetId: string;
};

export type MixedMigrationSeedOptions = {
  candidateSourceId?: string;
};

function sortById<T extends { id: string }>(records: T[]): T[] {
  return records.sort((left, right) => left.id.localeCompare(right.id));
}

async function activeDatabaseName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = document.querySelector<HTMLMetaElement>(
      'meta[name="hakimi-release-database"]'
    )?.content;
    if (!raw) throw new Error("当前页面缺少发布数据库描述符");
    const descriptor = JSON.parse(raw) as { databaseName?: unknown };
    if (typeof descriptor.databaseName !== "string" || descriptor.databaseName.length === 0) {
      throw new Error("当前页面的发布数据库描述符缺少 databaseName");
    }
    return descriptor.databaseName;
  });
}

export async function readMixedMigrationSnapshot(page: Page): Promise<MixedMigrationSnapshot> {
  const databaseName = await activeDatabaseName(page);
  return page.evaluate(async (databaseName) => new Promise<MixedMigrationSnapshot>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
    request.onupgradeneeded = () => reject(new Error("只读混合迁移审计意外触发数据库升级"));
    request.onsuccess = () => {
      const database = request.result;
      const storeNames = [
        "candidateSets",
        "tzdbMigrationReceipts",
        "events",
        "eventTimeMigrationReceipts"
      ];
      const transaction = database.transaction(storeNames, "readonly");
      const candidateSetsRequest = transaction.objectStore("candidateSets").getAll();
      const tzdbReceiptsRequest = transaction.objectStore("tzdbMigrationReceipts").getAll();
      const eventsRequest = transaction.objectStore("events").getAll();
      const eventReceiptsRequest = transaction.objectStore("eventTimeMigrationReceipts").getAll();
      transaction.onerror = () => reject(transaction.error ?? new Error("读取混合迁移快照失败"));
      transaction.oncomplete = () => {
        database.close();
        resolve({
          candidateSets: (candidateSetsRequest.result as CandidateSetRecord[])
            .sort((left, right) => left.id.localeCompare(right.id)),
          tzdbMigrationReceipts: (tzdbReceiptsRequest.result as TzdbMigrationReceipt[])
            .sort((left, right) => left.id.localeCompare(right.id)),
          events: (eventsRequest.result as EventRecord[])
            .sort((left, right) => left.id.localeCompare(right.id)),
          eventTimeMigrationReceipts: (eventReceiptsRequest.result as EventTimeMigrationReceipt[])
            .sort((left, right) => left.id.localeCompare(right.id))
        });
      };
    };
  }), databaseName);
}

async function asLegacyUnidentifiedCandidateSet(
  current: UnknownHourCandidateResult
): Promise<UnknownHourCandidateResult> {
  const legacy = structuredClone(current);
  legacy.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
  legacy.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
  delete legacy.timeZoneDatabase;
  for (const candidate of legacy.candidates) {
    for (const variant of candidate.variants) {
      variant.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      variant.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete variant.chart.manifest.timeZoneDatabase;
      variant.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(variant.chart));
      variant.chartResultHash = variant.chart.manifest.resultHash;
    }
    if (candidate.chart) {
      candidate.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      candidate.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete candidate.chart.manifest.timeZoneDatabase;
      candidate.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(candidate.chart));
    }
  }
  legacy.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(legacy));
  return legacy;
}

async function replaceCandidateSetRecord(page: Page, record: CandidateSetRecord): Promise<void> {
  const databaseName = await activeDatabaseName(page);
  await page.evaluate(async ({ databaseName, replacement }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
    request.onupgradeneeded = () => reject(new Error("CandidateSet 夹具写入意外触发数据库升级"));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("candidateSets", "readwrite");
      transaction.objectStore("candidateSets").put(replacement);
      transaction.onerror = () => reject(transaction.error ?? new Error("写入旧 CandidateSet 夹具失败"));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
    };
  }), { databaseName, replacement: record });
}

async function createCandidateSetThroughUi(page: Page): Promise<string> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  await waitForAppReady(page);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("combobox", { name: /时间精度/ }).selectOption("unknown_hour");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "生成 13 个候选", exact: true }).click();
  await expect(page.getByRole("heading", { name: "13 个代表性候选" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开候选组", exact: true }).click();
  await page.waitForURL(/\/candidate-sets\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

async function deriveCandidateReceipt(
  page: Page,
  candidateSourceId?: string
): Promise<{ sourceId: string; targetId: string }> {
  const sourceId = candidateSourceId ?? await createCandidateSetThroughUi(page);
  const initial = await readMixedMigrationSnapshot(page);
  const initialReceiptIds = new Set(initial.tzdbMigrationReceipts.map((receipt) => receipt.id));
  const currentRecord = initial.candidateSets.find((record) => record.id === sourceId);
  if (!currentRecord) throw new Error(`找不到 CandidateSet 迁移源 ${sourceId}`);
  const legacyCandidateSet = await asLegacyUnidentifiedCandidateSet(currentRecord.candidateSet);
  const legacyRecord: CandidateSetRecord = {
    ...currentRecord,
    candidateSet: legacyCandidateSet,
    snapshotDigest: await sha256Hex(legacyCandidateSet)
  };
  await replaceCandidateSetRecord(page, legacyRecord);

  await page.goto(`/candidate-sets/${sourceId}`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "时区快照并列复算" })).toBeVisible();
  await page.getByRole("checkbox", { name: /按目标快照生成并列候选组/ }).check();
  await page.getByRole("button", { name: "按 IANA 2026c 并列复算", exact: true }).click();
  await expect(page.getByRole("status").filter({
    hasText: "并列候选组和可核验凭证已生成，基准记录未改写"
  })).toBeVisible();

  const migrated = await readMixedMigrationSnapshot(page);
  expect(migrated.candidateSets).toHaveLength(initial.candidateSets.length + 1);
  expect(migrated.tzdbMigrationReceipts).toHaveLength(initial.tzdbMigrationReceipts.length + 1);
  const receipt = migrated.tzdbMigrationReceipts.find((record) => !initialReceiptIds.has(record.id));
  if (!receipt) throw new Error("CandidateSet 迁移没有生成新的可核验凭证");
  const target = migrated.candidateSets.find((record) => record.id === receipt.target.recordId);
  if (!target) throw new Error("CandidateSet 迁移没有生成并列目标");
  expect(target.candidateSet).toMatchObject({
    tzdbVersion: RUNTIME_TZDB_VERSION,
    timeZoneDatabase: { ianaVersion: "2026c" }
  });
  expect(receipt).toMatchObject({
    source: { recordId: sourceId },
    target: { recordId: target.id },
    comparison: { behaviorChangedCount: 0, hashOnlyChangedCount: 13, unchangedCount: 0 }
  });
  return { sourceId, targetId: target.id };
}

async function insertLegacyEvent(page: Page, caseId: string, revisionId: string): Promise<EventRecord> {
  const event = migrateLegacyEventRecordV1({
    schemaVersion: "1.0.0",
    id: EVENT_SOURCE_ID,
    caseId,
    revisionId,
    transitNodeRef: null,
    datePrecision: "minute",
    startDate: "2025-11-02T01:30",
    endDate: null,
    title: EVENT_TITLE,
    body: "跨浏览器门要求研究者明确选择 DST overlap 的 earlier 或 later。",
    tags: ["迁移", "跨浏览器"],
    sourceRefs: ["E2E Chrome→Edge mixed receipt fixture"],
    feedback: "unreviewed",
    bodyFormat: "markdown",
    deletedAt: null,
    createdAt: FIXTURE_CREATED_AT,
    updatedAt: FIXTURE_CREATED_AT
  });
  const databaseName = await activeDatabaseName(page);
  await page.evaluate(async ({ databaseName, event }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
    request.onupgradeneeded = () => reject(new Error("Event 夹具写入意外触发数据库升级"));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("events", "readwrite");
      transaction.objectStore("events").add(event);
      transaction.onerror = () => reject(transaction.error ?? new Error("写入 legacy_floating Event 失败"));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
    };
  }), { databaseName, event });
  return event;
}

async function deriveEventReceipt(
  page: Page,
  caseId: string,
  revisionId: string
): Promise<{ sourceId: string; targetId: string }> {
  const initial = await readMixedMigrationSnapshot(page);
  const initialReceiptIds = new Set(initial.eventTimeMigrationReceipts.map((receipt) => receipt.id));
  const source = await insertLegacyEvent(page, caseId, revisionId);
  await page.goto(
    `/cases/${caseId}/revisions/${revisionId}?view=research&event=${source.id}`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForAppReady(page);
  const sourceCard = page.locator(`[data-event-id="${source.id}"]`);
  await expect(sourceCard).toHaveCount(1);
  await sourceCard.getByRole("button", { name: "解释时间并创建并列事件" }).click();
  const panel = sourceCard.locator(".event-time-migration-panel");
  await panel.getByLabel(/事件发生地时区/).fill("America/New_York");
  await expect(panel.getByRole("group", { name: /起始时间出现 DST 重叠/ })).toBeVisible();
  await panel.getByRole("radio", { name: /较早瞬时点/ }).check();
  await panel.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }).check();
  await panel.getByRole("button", { name: "生成并列事件" }).click();
  await expect(panel.locator(".event-time-migration-success")).toContainText(
    "新事件和时间迁移凭证已生成，旧事件未改写"
  );

  const migrated = await readMixedMigrationSnapshot(page);
  expect(migrated.events).toHaveLength(initial.events.length + 2);
  expect(migrated.eventTimeMigrationReceipts).toHaveLength(
    initial.eventTimeMigrationReceipts.length + 1
  );
  const receipt = migrated.eventTimeMigrationReceipts.find(
    (record) => !initialReceiptIds.has(record.id)
  );
  if (!receipt) throw new Error("Event 时间迁移没有生成新的可核验凭证");
  const target = migrated.events.find((event) => event.id === receipt.target.recordId);
  if (!target) throw new Error("Event 时间迁移没有生成并列目标");
  expect(target).toMatchObject({
    caseId,
    revisionId,
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
      start: { canonicalUtc: "2025-11-02T05:30:00Z" }
    }
  });
  expect(receipt).toMatchObject({
    source: { recordId: source.id },
    target: { recordId: target.id },
    interpretation: {
      kind: "zoned_minute",
      timeZone: "America/New_York",
      startDisambiguation: "earlier"
    }
  });
  return { sourceId: source.id, targetId: target.id };
}

export async function seedMixedMigrationReceipts(
  page: Page,
  caseId: string,
  revisionId: string,
  options: MixedMigrationSeedOptions = {}
): Promise<MixedMigrationFixture> {
  const candidate = await deriveCandidateReceipt(page, options.candidateSourceId);
  const event = await deriveEventReceipt(page, caseId, revisionId);
  const snapshot = await readMixedMigrationSnapshot(page);
  expect(snapshot.candidateSets.some((record) => record.id === candidate.sourceId)).toBe(true);
  expect(snapshot.candidateSets.some((record) => record.id === candidate.targetId)).toBe(true);
  expect(snapshot.tzdbMigrationReceipts.some((receipt) => (
    receipt.source.recordId === candidate.sourceId && receipt.target.recordId === candidate.targetId
  ))).toBe(true);
  expect(snapshot.events.some((record) => record.id === event.sourceId)).toBe(true);
  expect(snapshot.events.some((record) => record.id === event.targetId)).toBe(true);
  expect(snapshot.eventTimeMigrationReceipts.some((receipt) => (
    receipt.source.recordId === event.sourceId && receipt.target.recordId === event.targetId
  ))).toBe(true);
  return {
    snapshot: {
      candidateSets: sortById(snapshot.candidateSets),
      tzdbMigrationReceipts: sortById(snapshot.tzdbMigrationReceipts),
      events: sortById(snapshot.events),
      eventTimeMigrationReceipts: sortById(snapshot.eventTimeMigrationReceipts)
    },
    candidateSourceId: candidate.sourceId,
    candidateTargetId: candidate.targetId,
    eventSourceId: event.sourceId,
    eventTargetId: event.targetId
  };
}
