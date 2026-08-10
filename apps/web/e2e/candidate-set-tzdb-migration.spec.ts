import { expect, test, type Page } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  type CandidateSetRecord,
  type TzdbMigrationReceipt
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  collectConsoleProblems,
  completeRestoreSafetyGate,
  expectPartitionCount,
  exportFullBackupZip,
  openDataManagement,
  preflightBackupZip,
  waitForAppReady
} from "./full-backup-helpers";

type CandidateMigrationSnapshot = {
  candidateSets: CandidateSetRecord[];
  receipts: TzdbMigrationReceipt[];
};

async function readCandidateMigrationSnapshot(page: Page): Promise<CandidateMigrationSnapshot> {
  return page.evaluate(async () => new Promise<CandidateMigrationSnapshot>((resolve, reject) => {
    const request = indexedDB.open("hakimi-bazi-research");
    request.onerror = () => reject(request.error ?? new Error("无法打开研究数据库"));
    request.onupgradeneeded = () => reject(new Error("只读迁移审计意外触发数据库升级"));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["candidateSets", "tzdbMigrationReceipts"], "readonly");
      const candidateSetsRequest = transaction.objectStore("candidateSets").getAll();
      const receiptsRequest = transaction.objectStore("tzdbMigrationReceipts").getAll();
      transaction.onerror = () => reject(transaction.error ?? new Error("读取迁移快照失败"));
      transaction.oncomplete = () => {
        database.close();
        resolve({
          candidateSets: candidateSetsRequest.result as CandidateSetRecord[],
          receipts: receiptsRequest.result as TzdbMigrationReceipt[]
        });
      };
    };
  }));
}

async function createCandidateSetThroughUi(page: Page): Promise<string> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  await waitForAppReady(page);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("combobox", { name: /时间精度/ }).selectOption("unknown_hour");
  await page.getByLabel("出生日期").fill("2026-10-01");
  await page.getByLabel("IANA 时区").fill("Africa/Casablanca");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "生成 13 个候选", exact: true }).click();
  await expect(page.getByRole("heading", { name: "13 个代表性候选" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开候选组", exact: true }).click();
  await page.waitForURL(/\/candidate-sets\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test("Casablanca CandidateSet 以新 ID 完成 2026c→2025b 并列复算并在全新 Edge 恢复", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  const consoleProblems = collectConsoleProblems(page);
  const sourceId = await createCandidateSetThroughUi(page);
  const initialSnapshot = await readCandidateMigrationSnapshot(page);
  expect(initialSnapshot.candidateSets).toHaveLength(1);
  expect(initialSnapshot.receipts).toEqual([]);

  const currentRecord = initialSnapshot.candidateSets[0];
  expect(currentRecord.id).toBe(sourceId);
  expect(currentRecord.candidateSet).toMatchObject({
    tzdbVersion: RUNTIME_TZDB_VERSION,
    timeZoneDatabase: { ianaVersion: "2026c" },
    input: { date: "2026-10-01", timeZone: "Africa/Casablanca", timePrecision: "unknown_hour", time: null }
  });
  const sourceStoredBefore = structuredClone(currentRecord);
  const sourceCanonicalDigestBefore = await sha256Hex(sourceStoredBefore);

  await page.goto(`/candidate-sets/${sourceId}`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "时区快照并列复算" })).toBeVisible();
  await expect(page.getByText(RETAINED_TIME_ZONE_DATABASE_2025B.dataSha256, { exact: true })).toBeVisible();
  const deriveButton = page.getByRole("button", { name: "按 IANA 2025b 并列复算", exact: true });
  await expect(deriveButton).toBeDisabled();
  await page.getByRole("checkbox", { name: /按目标快照生成并列候选组/ }).check();
  await expect(deriveButton).toBeEnabled();
  await deriveButton.click();

  await expect(page.getByRole("status").filter({ hasText: "并列候选组和可核验凭证已生成，基准记录未改写" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "时区并列复算凭证" })).toBeVisible();
  await expect(page.getByRole("table", { name: "候选组 tzdb 并列复算 13 探针行为与摘要分类" }).getByRole("row")).toHaveCount(14);
  await expect(page.getByText("行为改变 13", { exact: true })).toBeVisible();
  await expect(page.getByText("仅摘要改变 0", { exact: true })).toBeVisible();

  const migratedSnapshot = await readCandidateMigrationSnapshot(page);
  expect(migratedSnapshot.candidateSets).toHaveLength(2);
  expect(migratedSnapshot.receipts).toHaveLength(1);
  const sourceAfter = migratedSnapshot.candidateSets.find((record) => record.id === sourceId);
  expect(sourceAfter).toEqual(sourceStoredBefore);
  expect(sourceAfter?.updatedAt).toBe(sourceStoredBefore.updatedAt);
  expect(await sha256Hex(sourceAfter)).toBe(sourceCanonicalDigestBefore);
  const target = migratedSnapshot.candidateSets.find((record) => record.id !== sourceId)!;
  const receipt = migratedSnapshot.receipts[0];
  expect(target.id).not.toBe(sourceId);
  expect(target.candidateSet).toMatchObject({
    tzdbVersion: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
    timeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B
  });
  for (const probe of target.candidateSet.candidates) {
    for (const variant of probe.variants) {
      expect(variant.chart.manifest.tzdbVersion).toBe(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
      expect(variant.chart.manifest.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    }
  }
  expect(receipt).toMatchObject({
    operation: "candidate_set_tzdb_recalculation",
    source: {
      recordId: sourceId,
      snapshotDigest: currentRecord.snapshotDigest,
      tzdbVersion: RUNTIME_TZDB_VERSION
    },
    target: {
      recordId: target.id,
      snapshotDigest: target.snapshotDigest,
      tzdbVersion: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId
    },
    comparison: { behaviorChangedCount: 13, hashOnlyChangedCount: 0, unchangedCount: 0 }
  });
  expect(receipt.comparisonDigest).toBe(await sha256Hex(receipt.comparison));

  await page.getByRole("link", { name: /打开并列候选组/ }).click();
  await page.waitForURL(`/candidate-sets/${target.id}`);
  await expect(page.getByText("当前记录已经是并列复算结果")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(sourceId) })).toBeVisible();

  await openDataManagement(page);
  await expectPartitionCount(page, "未知时辰候选组", 2);
  await expectPartitionCount(page, "候选组时区并列复算凭证", 1);
  const { bytes } = await exportFullBackupZip(page);
  const exported = await preflightFullBackupFile(bytes);
  expect(exported.manifest.formatVersion).toBe("1.2.0");
  expect(exported.migratedFromFormatVersion).toBeNull();
  expect(exported.manifest.counts).toMatchObject({ candidateSets: 2, tzdbMigrationReceipts: 1 });
  expect(exported.payload.tzdbMigrationReceipts).toEqual([receipt]);

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
    await expectPartitionCount(restorePage, "未知时辰候选组", 0);
    await expectPartitionCount(restorePage, "候选组时区并列复算凭证", 0);
    await preflightBackupZip(restorePage, bytes, "candidate-set-tzdb-migration.zip");
    await completeRestoreSafetyGate(restorePage);
    await expectPartitionCount(restorePage, "未知时辰候选组", 2);
    await expectPartitionCount(restorePage, "候选组时区并列复算凭证", 1);

    const restoredSnapshot = await readCandidateMigrationSnapshot(restorePage);
    expect(restoredSnapshot).toEqual(migratedSnapshot);
    await restorePage.goto(`/candidate-sets/${sourceId}`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    await expect(restorePage.getByRole("link", { name: new RegExp(target.id) })).toBeVisible();
    expect(restoreProblems).toEqual([]);
  } finally {
    await restoreContext.close();
  }
  expect(consoleProblems).toEqual([]);
});
