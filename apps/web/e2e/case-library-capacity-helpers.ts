import type { Page } from "@playwright/test";
import { createDemoCase } from "./full-backup-helpers";

export const LEGACY_V13_CAPACITY_DATABASE_NAME = "hakimi-bazi-research";
export const LEGACY_V13_NATIVE_VERSION = 130;
export const TOTAL_CAPACITY_CASES = 10_000;
export const CAPACITY_TRASH_INTERVAL = 113;
export const CAPACITY_FAVORITE_INTERVAL = 97;
export const CAPACITY_CHUNK_SIZE = 250;
export const MAX_RENDERED_CAPACITY_CASE_ROWS = 100;
export const ACTIVE_CAPACITY_CASES = 9_912;
export const TRASHED_CAPACITY_CASES = 88;
export const ACTIVE_CAPACITY_FAVORITES = 104;
export const RARE_CAPACITY_INDEX = 5_432;
export const COMMON_CAPACITY_QUERY = "容量基准";
export const RARE_CAPACITY_QUERY = "唯一检索钥匙-05432";
export const RARE_CAPACITY_ALIAS = "容量基准 · 稀有命中 05432";

export type LegalCapacityCaseFixture = {
  caseId: string;
  revisionId: string;
  caseRecord: Record<string, unknown>;
  revisionRecord: Record<string, unknown>;
  birthFingerprints: Array<Record<string, unknown>>;
};

export type CapacitySeedStats = {
  cases: number;
  revisions: number;
  fingerprints: number;
  candidateSets: number;
  active: number;
  trashed: number;
  activeFavorites: number;
  trashedFavorites: number;
  targetRelationshipValid: boolean;
  rareRelationshipValid: boolean;
};

export const EXPECTED_CAPACITY_SEED_STATS: CapacitySeedStats = Object.freeze({
  cases: TOTAL_CAPACITY_CASES,
  revisions: TOTAL_CAPACITY_CASES,
  fingerprints: TOTAL_CAPACITY_CASES,
  candidateSets: 0,
  active: ACTIVE_CAPACITY_CASES,
  trashed: TRASHED_CAPACITY_CASES,
  activeFavorites: ACTIVE_CAPACITY_FAVORITES,
  trashedFavorites: 0,
  targetRelationshipValid: true,
  rareRelationshipValid: true
});

export function deterministicCapacityCaseId(index: number): string {
  return `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export function deterministicCapacityRevisionId(index: number): string {
  return `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export async function readLegalCapacityCaseFixture(
  page: Page,
  databaseName = LEGACY_V13_CAPACITY_DATABASE_NAME
): Promise<LegalCapacityCaseFixture> {
  await createDemoCase(page);
  const match = new URL(page.url()).pathname.match(/^\/cases\/([^/]+)\/revisions\/([^/]+)$/u);
  if (!match) throw new Error(`演示案例 URL 不符合预期：${page.url()}`);
  const [, caseId, revisionId] = match;

  return page.evaluate(async ({ databaseName: selectedDatabaseName, caseId: selectedCaseId, revisionId: selectedRevisionId }) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("读取合法案例夹具失败"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(selectedDatabaseName);
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
  }, { databaseName, caseId, revisionId });
}

/**
 * Seeds only the frozen physical v13 source. Raw IndexedDB fixture writes are
 * deliberately forbidden against v16 because they would bypass its DBCore
 * mutation epoch. The production shadow protocol is the only path that may
 * carry this fixture into a Schema 16 database.
 */
export async function seedLegacyV13CapacityCases(
  page: Page,
  fixture: LegalCapacityCaseFixture,
  databaseName = LEGACY_V13_CAPACITY_DATABASE_NAME
): Promise<CapacitySeedStats> {
  await page.evaluate(async ({
    databaseName: selectedDatabaseName,
    fixture: selectedFixture,
    totalCases,
    trashInterval,
    favoriteInterval,
    chunkSize,
    rareIndex,
    commonQuery,
    rareQuery,
    rareAlias,
    expectedNativeVersion
  }) => {
    const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB 事务失败"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB 事务已中止"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(selectedDatabaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
      request.onupgradeneeded = () => reject(new Error("容量种子写入时意外触发升级"));
    });
    if (database.version !== expectedNativeVersion) {
      const actualVersion = database.version;
      database.close();
      throw new Error(
        `容量种子只允许写入物理 v13（${expectedNativeVersion}），实际为 ${actualVersion}。`
      );
    }
    const fingerprintTemplate = selectedFixture.birthFingerprints.find((record) =>
      record.recordType === "revision" && record.sourceId === selectedFixture.revisionId
    );
    if (!fingerprintTemplate) {
      database.close();
      throw new Error("演示案例缺少 Revision 出生指纹记录");
    }

    const clearTransaction = database.transaction(
      ["cases", "revisions", "birthFingerprints"],
      "readwrite"
    );
    const clearDone = transactionDone(clearTransaction);
    clearTransaction.objectStore("cases").clear();
    clearTransaction.objectStore("revisions").clear();
    clearTransaction.objectStore("birthFingerprints").clear();
    await clearDone;

    const baseEpoch = Date.parse("2026-08-04T04:00:00.000Z");
    for (let start = 0; start < totalCases; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalCases);
      const transaction = database.transaction(
        ["cases", "revisions", "birthFingerprints"],
        "readwrite"
      );
      const done = transactionDone(transaction);
      const caseStore = transaction.objectStore("cases");
      const revisionStore = transaction.objectStore("revisions");
      const fingerprintStore = transaction.objectStore("birthFingerprints");

      for (let index = start; index < end; index += 1) {
        const caseId = `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
        const revisionId = `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
        const timestamp = new Date(baseEpoch - index * 1_000).toISOString();
        const trashed = index > 0 && index % trashInterval === 0;
        const alias = index === rareIndex
          ? rareAlias
          : index === 0
            ? `${commonQuery} · 打开目标 00000`
            : `${commonQuery} · 案例 ${String(index).padStart(5, "0")}`;

        caseStore.put({
          ...selectedFixture.caseRecord,
          id: caseId,
          alias,
          tags: [commonQuery, `组${String(index % 100).padStart(2, "0")}`],
          notes: index === rareIndex ? rareQuery : "十万级之前的固定读取与渲染容量样本。",
          favorite: index % favoriteInterval === 0,
          deletedAt: trashed ? timestamp : null,
          createdAt: timestamp,
          updatedAt: timestamp,
          latestRevisionId: revisionId,
          revisionCount: 1
        });
        revisionStore.put({
          ...selectedFixture.revisionRecord,
          id: revisionId,
          caseId,
          revisionNumber: 1,
          createdAt: timestamp
        });
        fingerprintStore.put({
          ...fingerprintTemplate,
          key: `revision:${revisionId}`,
          sourceId: revisionId,
          subjectId: caseId,
          recordType: "revision"
        });
      }
      await done;
    }
    database.close();
  }, {
    databaseName,
    fixture,
    totalCases: TOTAL_CAPACITY_CASES,
    trashInterval: CAPACITY_TRASH_INTERVAL,
    favoriteInterval: CAPACITY_FAVORITE_INTERVAL,
    chunkSize: CAPACITY_CHUNK_SIZE,
    rareIndex: RARE_CAPACITY_INDEX,
    commonQuery: COMMON_CAPACITY_QUERY,
    rareQuery: RARE_CAPACITY_QUERY,
    rareAlias: RARE_CAPACITY_ALIAS,
    expectedNativeVersion: LEGACY_V13_NATIVE_VERSION
  });

  return readCapacitySeedStats(page, databaseName);
}

export async function readCapacitySeedStats(
  page: Page,
  databaseName: string
): Promise<CapacitySeedStats> {
  return page.evaluate(async ({ databaseName: selectedDatabaseName, rareIndex }) => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB 请求失败"));
    });
    const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB 事务失败"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB 事务已中止"));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(selectedDatabaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
      request.onupgradeneeded = () => reject(new Error("读取容量统计时意外触发升级"));
    });
    const countTransaction = database.transaction(
      ["cases", "revisions", "birthFingerprints", "candidateSets"],
      "readonly"
    );
    const countDone = transactionDone(countTransaction);
    const caseStore = countTransaction.objectStore("cases");
    const revisionStore = countTransaction.objectStore("revisions");
    const fingerprintStore = countTransaction.objectStore("birthFingerprints");
    const candidateStore = countTransaction.objectStore("candidateSets");
    const targetCaseId = `20000000-0000-4000-8000-${String(0).padStart(12, "0")}`;
    const targetRevisionId = `30000000-0000-4000-8000-${String(0).padStart(12, "0")}`;
    const rareCaseId = `20000000-0000-4000-8000-${String(rareIndex).padStart(12, "0")}`;
    const rareRevisionId = `30000000-0000-4000-8000-${String(rareIndex).padStart(12, "0")}`;
    const [
      cases,
      revisions,
      fingerprints,
      candidateSets,
      allCases,
      targetCase,
      targetRevision,
      targetFingerprint,
      rareCase,
      rareRevision,
      rareFingerprint
    ] = await Promise.all([
      requestResult(caseStore.count()),
      requestResult(revisionStore.count()),
      requestResult(fingerprintStore.count()),
      requestResult(candidateStore.count()),
      requestResult(caseStore.getAll()),
      requestResult(caseStore.get(targetCaseId)),
      requestResult(revisionStore.get(targetRevisionId)),
      requestResult(fingerprintStore.get(`revision:${targetRevisionId}`)),
      requestResult(caseStore.get(rareCaseId)),
      requestResult(revisionStore.get(rareRevisionId)),
      requestResult(fingerprintStore.get(`revision:${rareRevisionId}`))
    ]);
    await countDone;
    database.close();

    const records = allCases as Array<Record<string, unknown>>;
    const active = records.filter((record) => record.deletedAt === null).length;
    const trashed = records.filter((record) => typeof record.deletedAt === "string").length;
    const activeFavorites = records.filter((record) => record.deletedAt === null && record.favorite === true).length;
    const trashedFavorites = records.filter((record) => typeof record.deletedAt === "string" && record.favorite === true).length;
    const relationshipValid = (
      caseRecord: Record<string, unknown> | undefined,
      revisionRecord: Record<string, unknown> | undefined,
      fingerprintRecord: Record<string, unknown> | undefined,
      caseId: string,
      revisionId: string
    ) => Boolean(
      caseRecord?.id === caseId &&
      caseRecord.latestRevisionId === revisionId &&
      caseRecord.revisionCount === 1 &&
      revisionRecord?.id === revisionId &&
      revisionRecord.caseId === caseId &&
      revisionRecord.revisionNumber === 1 &&
      fingerprintRecord?.key === `revision:${revisionId}` &&
      fingerprintRecord.sourceId === revisionId &&
      fingerprintRecord.subjectId === caseId &&
      fingerprintRecord.recordType === "revision"
    );

    return {
      cases,
      revisions,
      fingerprints,
      candidateSets,
      active,
      trashed,
      activeFavorites,
      trashedFavorites,
      targetRelationshipValid: relationshipValid(
        targetCase as Record<string, unknown> | undefined,
        targetRevision as Record<string, unknown> | undefined,
        targetFingerprint as Record<string, unknown> | undefined,
        targetCaseId,
        targetRevisionId
      ),
      rareRelationshipValid: relationshipValid(
        rareCase as Record<string, unknown> | undefined,
        rareRevision as Record<string, unknown> | undefined,
        rareFingerprint as Record<string, unknown> | undefined,
        rareCaseId,
        rareRevisionId
      )
    };
  }, { databaseName, rareIndex: RARE_CAPACITY_INDEX });
}
