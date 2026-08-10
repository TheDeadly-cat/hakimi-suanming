import { readFile } from "node:fs/promises";
import { chromium, expect, test } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  collectConsoleProblems,
  completeRestoreSafetyGate,
  createDemoCase,
  expectPartitionCount,
  expectPortableData,
  exportFullBackupZip,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  readRuleRegistrySnapshot,
  seedActiveRulePack,
  seedPortableData,
  waitForAppReady
} from "./full-backup-helpers";
import {
  readMixedMigrationSnapshot,
  seedMixedMigrationReceipts
} from "./mixed-migration-receipt-helpers";

test("Chrome 导出的 v1.2 十六分区完整 ZIP 可在全新 Edge 中无损恢复两类非空迁移凭证", async ({ baseURL }) => {
  test.setTimeout(240_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  const fixture = portableFixture("Chrome到Edge");

  const chrome = await chromium.launch({ channel: "chrome", headless: true });
  test.info().annotations.push({ type: "source-browser", description: `Chrome ${chrome.version()}` });
  let backupBytes: Buffer;
  let chromeProblems: string[];
  let sourceRuleRegistry: Awaited<ReturnType<typeof readRuleRegistrySnapshot>>;
  let rulePack: Awaited<ReturnType<typeof seedActiveRulePack>>;
  let sourceMigration: Awaited<ReturnType<typeof seedMixedMigrationReceipts>>;
  let sourceBackup: Awaited<ReturnType<typeof preflightFullBackupFile>>;
  let caseId: string;
  let revisionId: string;
  try {
    const chromeContext = await chrome.newContext({
      baseURL,
      acceptDownloads: true,
      serviceWorkers: "allow"
    });
    const chromePage = await chromeContext.newPage();
    chromeProblems = collectConsoleProblems(chromePage);
    await createDemoCase(chromePage);
    const caseRoute = new URL(chromePage.url()).pathname.match(
      /^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i
    );
    if (!caseRoute) throw new Error(`演示案例 URL 不符合预期：${chromePage.url()}`);
    [, caseId, revisionId] = caseRoute;
    rulePack = await seedActiveRulePack(chromePage);
    sourceRuleRegistry = await readRuleRegistrySnapshot(chromePage);
    expect(sourceRuleRegistry.dexieVersion).toBe(13);
    expect(sourceRuleRegistry.records).toHaveLength(2);
    expect(sourceRuleRegistry.records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: rulePack.packDigest,
        recordType: "installed_rule_pack",
        packDigest: rulePack.packDigest,
        packId: rulePack.packId,
        profileId: rulePack.profileId,
        profileVersion: rulePack.profileVersion,
        canonicalJson: rulePack.canonicalJson,
        localTrust: "unverified_local_import"
      }),
      expect.objectContaining({
        id: "active-rule-pack",
        recordType: "active_rule_pack",
        activeDigest: rulePack.packDigest,
        approval: expect.objectContaining({
          status: "locally_approved_for_activation",
          acknowledgementVersion: "rule-pack-local-approval@1",
          appVersion: "0.2.0-p0"
        })
      })
    ]));
    sourceMigration = await seedMixedMigrationReceipts(chromePage, caseId, revisionId);
    await openDataManagement(chromePage);
    await seedPortableData(chromePage, fixture);
    await expectPartitionCount(chromePage, "命盘案例", 1);
    await expectPartitionCount(chromePage, "命盘修订", 1);
    await expectPartitionCount(chromePage, "未知时辰候选组", 2);
    await expectPartitionCount(chromePage, "事件", 2);
    await expectPartitionCount(chromePage, "候选组时区并列复算凭证", 1);
    await expectPartitionCount(chromePage, "事件时间迁移凭证", 1);
    await expectPortableData(chromePage, fixture, rulePack);
    ({ bytes: backupBytes } = await exportFullBackupZip(chromePage));

    sourceBackup = await preflightFullBackupFile(backupBytes);
    expect(sourceBackup.migratedFromFormatVersion).toBeNull();
    expect(sourceBackup.manifest).toMatchObject({
      format: "hakimi-bazi-full-backup",
      formatVersion: "1.2.0",
      schemaVersion: "1.0.0",
      scope: "current-modeled-data",
      counts: {
        cases: 1,
        revisions: 1,
        candidateSets: 2,
        researchNotes: 0,
        events: 2,
        savedViews: 0,
        knowledgeDocuments: 0,
        citations: 0,
        sourceRights: 0,
        researcherProfiles: 1,
        appSettings: 1,
        attachments: 1,
        ruleRegistry: 2,
        tzdbMigrationReceipts: 1,
        eventTimeMigrationReceipts: 1,
        revisionCalculationReceipts: 0
      }
    });
    expect(Object.keys(sourceBackup.manifest.counts)).toHaveLength(16);
    expect(sourceBackup.payload.ruleRegistry).toEqual(sourceRuleRegistry.records);
    expect(sourceBackup.payload.candidateSets).toEqual(sourceMigration.snapshot.candidateSets);
    expect(sourceBackup.payload.tzdbMigrationReceipts).toEqual(
      sourceMigration.snapshot.tzdbMigrationReceipts
    );
    expect(sourceBackup.payload.events).toEqual(sourceMigration.snapshot.events);
    expect(sourceBackup.payload.eventTimeMigrationReceipts).toEqual(
      sourceMigration.snapshot.eventTimeMigrationReceipts
    );
    expect(chromeProblems).toEqual([]);
    await chromeContext.close();
  } finally {
    await chrome.close();
  }

  const edge = await chromium.launch({ channel: "msedge", headless: true });
  test.info().annotations.push({ type: "target-browser", description: `Edge ${edge.version()}` });
  try {
    const edgeContext = await edge.newContext({
      baseURL,
      acceptDownloads: true,
      serviceWorkers: "allow"
    });
    const edgePage = await edgeContext.newPage();
    const edgeProblems = collectConsoleProblems(edgePage);
    await openDataManagement(edgePage);
    await expectPartitionCount(edgePage, "命盘案例", 0);
    await expectPartitionCount(edgePage, "命盘修订", 0);
    await expectPartitionCount(edgePage, "研究者资料", 0);
    await expectPartitionCount(edgePage, "应用设置", 0);
    await expectPartitionCount(edgePage, "附件", 0);
    await expectPartitionCount(edgePage, "规则包仓库", 0);
    await expectPartitionCount(edgePage, "未知时辰候选组", 0);
    await expectPartitionCount(edgePage, "事件", 0);
    await expectPartitionCount(edgePage, "候选组时区并列复算凭证", 0);
    await expectPartitionCount(edgePage, "事件时间迁移凭证", 0);
    await expectPartitionCount(edgePage, "Revision 计算收据", 0);

    await preflightBackupZip(edgePage, backupBytes!, "chrome-full-backup.zip");
    const restoreList = edgePage.getByRole("list", { name: "十六分区恢复差异" });
    for (const partitionLabel of ["命盘案例", "命盘修订", "研究者资料", "应用设置", "附件"]) {
      const row = restoreList.getByRole("listitem").filter({ hasText: partitionLabel });
      await expect(row.locator("dd").nth(1)).toHaveText("1");
    }
    await expect(
      restoreList.getByRole("listitem").filter({ hasText: "规则包仓库" }).locator("dd").nth(1)
    ).toHaveText("2");
    for (const [partitionLabel, count] of [
      ["未知时辰候选组", "2"],
      ["事件", "2"],
      ["候选组时区并列复算凭证", "1"],
      ["事件时间迁移凭证", "1"]
    ] as const) {
      const row = restoreList.getByRole("listitem").filter({ hasText: partitionLabel });
      await expect(row.locator("dd").nth(1)).toHaveText(count);
    }

    await completeRestoreSafetyGate(edgePage);
    await expectPartitionCount(edgePage, "命盘案例", 1);
    await expectPartitionCount(edgePage, "命盘修订", 1);
    await expectPartitionCount(edgePage, "未知时辰候选组", 2);
    await expectPartitionCount(edgePage, "事件", 2);
    await expectPartitionCount(edgePage, "候选组时区并列复算凭证", 1);
    await expectPartitionCount(edgePage, "事件时间迁移凭证", 1);
    await expectPortableData(edgePage, fixture, rulePack);
    const targetRuleRegistry = await readRuleRegistrySnapshot(edgePage);
    expect(targetRuleRegistry).toEqual(sourceRuleRegistry);
    expect(await readMixedMigrationSnapshot(edgePage)).toEqual(sourceMigration.snapshot);

    await edgePage.goto(`/candidate-sets/${sourceMigration.candidateSourceId}`, {
      waitUntil: "domcontentloaded"
    });
    await waitForAppReady(edgePage);
    await expect(edgePage.getByRole("link", {
      name: new RegExp(sourceMigration.candidateTargetId)
    })).toBeVisible();

    await edgePage.goto(
      `/cases/${caseId}/revisions/${revisionId}?view=research&event=${sourceMigration.eventSourceId}`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForAppReady(edgePage);
    const restoredEventSource = edgePage.locator(
      `[data-event-id="${sourceMigration.eventSourceId}"]`
    );
    await expect(restoredEventSource).toContainText("时间迁移关系 · 1 条凭证");
    await expect(restoredEventSource.getByRole("link", {
      name: `打开派生事件 ${sourceMigration.eventTargetId}`
    })).toBeVisible();

    await edgePage.goto("/settings", { waitUntil: "domcontentloaded" });
    await waitForAppReady(edgePage);
    await expect(edgePage.getByText("已激活一个本机导入规则包", { exact: true })).toBeVisible();
    await expect(edgePage.getByText(
      `活动包 ${rulePack.packDigest}；这是本机显式批准，不是身份认证。`,
      { exact: true }
    )).toBeVisible();
    const restoredRuleArticle = edgePage.locator('[aria-label="已安装规则包"] article').filter({
      hasText: rulePack.packDigest
    });
    await expect(restoredRuleArticle).toHaveCount(1);
    await expect(restoredRuleArticle).toContainText("导入未验证 · 本机已批准激活");

    await openDataManagement(edgePage);

    const attachmentRegion = edgePage.getByRole("region", { name: "附件库" });
    const attachmentDownloadPromise = edgePage.waitForEvent("download");
    await attachmentRegion.getByRole("button", { name: "下载", exact: true }).click();
    const attachmentDownload = await attachmentDownloadPromise;
    expect(attachmentDownload.suggestedFilename()).toBe(fixture.attachmentName);
    expect(await attachmentDownload.failure()).toBeNull();
    const attachmentPath = await attachmentDownload.path();
    if (!attachmentPath) throw new Error("Edge 恢复后的附件下载路径不可用");
    expect(await readFile(attachmentPath)).toEqual(fixture.attachmentBytes);

    await edgePage.goto("/cases", { waitUntil: "domcontentloaded" });
    await waitForAppReady(edgePage);
    const restoredFormalCase = edgePage.getByRole("row").filter({
      hasText: "演示案例 · 辰时研究"
    }).filter({ hasText: "正式命盘" });
    await expect(restoredFormalCase).toHaveCount(1);

    await openDataManagement(edgePage);
    const { bytes: roundTripBytes } = await exportFullBackupZip(edgePage);
    const roundTripBackup = await preflightFullBackupFile(roundTripBytes);
    expect(roundTripBackup.migratedFromFormatVersion).toBeNull();
    expect(roundTripBackup.manifest.counts).toEqual(sourceBackup.manifest.counts);
    expect(roundTripBackup.digests.payload).toBe(sourceBackup.digests.payload);
    for (const partition of Object.keys(sourceBackup.manifest.counts) as Array<
      keyof typeof sourceBackup.manifest.counts
    >) {
      expect(roundTripBackup.digests[partition]).toBe(sourceBackup.digests[partition]);
    }
    expect(roundTripBackup.payload).toEqual(sourceBackup.payload);
    expect(edgeProblems).toEqual([]);
    await edgeContext.close();
  } finally {
    await edge.close();
  }
});
