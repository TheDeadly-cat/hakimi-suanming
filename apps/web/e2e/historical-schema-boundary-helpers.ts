import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createWorkingDefaultRulePackEnvelope, serializeRulePackEnvelope } from "@hakimi/rule-packs";
import type { ReleaseDatabaseDescriptor } from "../release-protocol";
import {
  buildGeneration, cacheGeneration, collectExternalRequests, createDemoCase,
  expectPageFixture, openStableBridge, pageReleaseEvidence, readNativeDatabase,
  readReleaseControl, startSwitchServer, workerBuildVersion,
  type GenerationFixture, type NativeDatabaseSnapshot, type SwitchServer
} from "./cross-schema-upgrade-helpers";
import {
  collectConsoleProblems, portableFixture,
  seedPortableData, waitForAppReady, waitForServiceWorker
} from "./full-backup-helpers";
import { createReleasePersistentProfile, launchReleasePersistentContext } from "./release-browser-persistent-context";

/** Three explicit historical paths share these boundary checks; no activation policy is overridden. */
export function defineHistoricalSchemaBoundaryTests(
  label: string,
  sourceDescriptor: ReleaseDatabaseDescriptor,
  targetDescriptor: ReleaseDatabaseDescriptor
): void {
  let root: string;
  let temporaryParent: string;
  let source: GenerationFixture;
  let target: GenerationFixture;
  let server: SwitchServer;
  const sourceName = sourceDescriptor.databaseName;
  const targetName = targetDescriptor.databaseName;

  // The shared full-backup helper belongs to the frozen same-schema harness.
  // This scenario uses absolute navigation without changing that harness identity.
  async function seedHistoricalRulePack(page: Page): Promise<void> {
    await page.goto(`${server.origin}/settings`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "规则包仓库与激活" })).toBeVisible();
    const canonicalJson = await serializeRulePackEnvelope(
      await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" })
    );
    const envelope = JSON.parse(canonicalJson);
    const digest = envelope.digest.value as string;
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "选择规则包", exact: true }).click();
    await (await chooser).setFiles({ name: "historical-rule-pack.json", mimeType: "application/json", buffer: Buffer.from(canonicalJson) });
    const preflight = page.locator(".rule-pack-preview").filter({ hasText: "声明式完整性预检通过，可保存到隔离库" });
    await expect(preflight).toContainText(digest);
    await preflight.getByRole("button", { name: "保存到本机隔离库", exact: true }).click();
    const installed = page.locator('[aria-label="已安装规则包"] article').filter({ hasText: digest });
    await expect(installed).toHaveCount(1);
    await expect(installed).toContainText("导入未验证");
    await installed.getByRole("checkbox", { name: /我确认只在本机使用此精确摘要/ }).check();
    await installed.getByRole("button", { name: "按精确摘要激活", exact: true }).click();
    await expect(page.getByText("已激活一个本机导入规则包", { exact: true })).toBeVisible();
    await expect(page.getByText(`活动包 ${digest}；这是本机显式批准，不是身份认证。`, { exact: true })).toBeVisible();
    await expect(installed).toContainText("本机已批准激活");
  }

  async function context(): Promise<BrowserContext> {
    return launchReleasePersistentContext({
      projectName: test.info().project.name,
      userDataDir: await createReleasePersistentProfile()
    });
  }

  async function openTarget(browser: BrowserContext, existingPage?: Page): Promise<Page> {
    const page = existingPage ?? await browser.newPage();
    await page.goto(`${server.origin}/cases`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await expectPageFixture(page, target);
    await expect.poll(() => readReleaseControl(page)).toMatchObject({ state: {
      committedGeneration: targetDescriptor.dbGeneration,
      committedDatabaseName: targetName,
      committedSchema: targetDescriptor.targetSchema,
      migrationId: targetDescriptor.migrationId,
      committedBuild: target.version
    } });
    return page;
  }

  function expectHistoricalMaterialization(before: NativeDatabaseSnapshot, after: NativeDatabaseSnapshot | null): void {
    expect(after?.nativeVersion).toBe(targetDescriptor.targetSchema * 10);
    expect(after?.stores).toEqual(expect.arrayContaining(before.stores));
    for (const store of before.stores) expect(after?.rows[store], store).toEqual(before.rows[store]);
    for (const store of ["researchNotes", "events"]) {
      expect(after?.storeMetadata[store]?.indexes).toEqual(expect.arrayContaining([{
        name: "[caseId+updatedAt]", keyPath: ["caseId", "updatedAt"], unique: false, multiEntry: false
      }]));
    }
    if (targetDescriptor.targetSchema === 15) expect(after?.rows.revisionCalculationReceipts).toEqual([]);
  }

  test.beforeAll(async () => {
    temporaryParent = await realpath(os.tmpdir());
    root = await mkdtemp(path.join(temporaryParent, `hakimi-historical-${label}-`));
    const builds = await Promise.allSettled([
      buildGeneration(root, `${label}-source`, sourceDescriptor),
      buildGeneration(root, `${label}-target`, targetDescriptor)
    ]);
    const failures = builds.flatMap(r => r.status === "rejected" ? [r.reason] : []);
    if (failures.length) throw new AggregateError(failures, "Historical boundary fixture builds failed.");
    source = (builds[0] as PromiseFulfilledResult<GenerationFixture>).value;
    target = (builds[1] as PromiseFulfilledResult<GenerationFixture>).value;
    server = await startSwitchServer(source);
  });

  test.afterAll(async () => {
    await server?.close();
    if (root) {
      if (path.dirname(root) !== temporaryParent || await realpath(root) !== root
        || !path.basename(root).startsWith(`hakimi-historical-${label}-`)) {
        throw new Error("Historical fixture cleanup escaped its owned temporary directory.");
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  test(`${label} 当前旧页明确拒绝自动前向接管，源数据与控制记录不变`, async () => {
    const browser = await context();
    const external = collectExternalRequests(browser, server.origin);
    try {
      const stable = await openStableBridge(browser, server, source);
      await createDemoCase(stable.page, server.origin);
      const before = await readNativeDatabase(stable.page, sourceName);
      const controlBefore = await readReleaseControl(stable.page);
      expect(before?.rows.cases.length).toBeGreaterThan(0);
      server.setGeneration(target);
      await stable.page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
      await expect.poll(() => workerBuildVersion(stable.page, "waiting")).toBe(target.version);
      const acknowledgement = await stable.page.evaluate(({ sourceVersion, sourceRelease, targetVersion, targetRelease }) =>
        new Promise<Record<string, unknown>>((resolve, reject) => {
          const channel = new MessageChannel();
          const requestId = `takeover-${crypto.randomUUID()}`;
          const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error("Forward rejection acknowledgement timed out.")); }, 10_000);
          channel.port1.onmessage = event => { window.clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
          navigator.serviceWorker.controller!.postMessage({
            type: "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_V1", requestId,
            sourceBuildVersion: sourceVersion, sourceRelease,
            targetBuildVersion: targetVersion, targetRelease
          }, [channel.port2]);
        }), { sourceVersion: source.version, sourceRelease: sourceDescriptor, targetVersion: target.version, targetRelease: targetDescriptor });
      expect(acknowledgement).toMatchObject({
        type: "REQUEST_INSTALLED_FORWARD_MIGRATION_ACTIVATION_ACK_V1",
        accepted: false, reason: "PROTOCOL_MISMATCH", clientCount: 0, frozenClientCount: 0
      });
      expect(await workerBuildVersion(stable.page, "active")).toBe(source.version);
      expect(await workerBuildVersion(stable.page, "controller")).toBe(source.version);
      expect(await readNativeDatabase(stable.page, sourceName)).toEqual(before);
      expect(await readNativeDatabase(stable.page, targetName)).toBeNull();
      expect(await readReleaseControl(stable.page)).toEqual(controlBefore);
      expect(await cacheGeneration(stable.page, target)).toMatchObject({ bootAttempted: false, bootConfirmed: false });
      expect(stable.problems).toEqual([]);
      expect(external).toEqual([]);
    } finally { await browser.close(); }
  });

  test(`${label} 所有旧页关闭后由浏览器自然激活，历史格式物化且源库不变`, async () => {
    const browser = await context();
    const external = collectExternalRequests(browser, server.origin);
    try {
      const stable = await openStableBridge(browser, server, source);
      await createDemoCase(stable.page, server.origin);
      await stable.page.goto(`${server.origin}/settings/data`, { waitUntil: "domcontentloaded" });
      await expect(stable.page.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
      await waitForAppReady(stable.page);
      await seedPortableData(stable.page, portableFixture(`historical ${label}`));
      await seedHistoricalRulePack(stable.page);
      const before = await readNativeDatabase(stable.page, sourceName);
      if (!before) throw new Error("Historical source database was not created.");
      expect(before.rows.attachments.length).toBeGreaterThan(0);
      server.setGeneration(target);
      await stable.page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
      await expect.poll(() => workerBuildVersion(stable.page, "waiting")).toBe(target.version);
      for (const page of browser.pages()) await page.close();
      // Observe the real worker after client retirement. No activation command is sent.
      await expect.poll(async () => Promise.all(browser.serviceWorkers().map(worker => worker.evaluate(
        "({buildVersion:CACHE_VERSION, waiting:Boolean(self.registration.waiting), installing:Boolean(self.registration.installing), active:self.registration.active?.state})"
      ).catch(() => null)))).toEqual(expect.arrayContaining([{
        buildVersion: target.version, waiting: false, installing: false, active: "activated"
      }]));
      const page = await openTarget(browser);
      expectHistoricalMaterialization(before, await readNativeDatabase(page, targetName));
      expect(await readNativeDatabase(page, sourceName)).toEqual(before);
      if (targetDescriptor.targetSchema === 15) {
        await createDemoCase(page, server.origin);
        const afterWrite = await readNativeDatabase(page, targetName);
        expect(afterWrite?.rows.revisionCalculationReceipts).toHaveLength(1);
        expect(afterWrite?.rows.revisionCalculationReceipts[0]).toMatchObject({ captureKind: "revision_creation_baseline" });
      }
      expect(stable.problems).toEqual([]);
      expect(external).toEqual([]);
    } finally { await browser.close(); }
  });

  test(`${label} 新页面直接启动验证真实容量准入、索引和持久提交`, async () => {
    const browser = await context();
    const external = collectExternalRequests(browser, server.origin);
    try {
      await browser.addInitScript(() => {
        const observe = () => {
          if (document.documentElement?.dataset.dbStorageAdmission === "admitted") {
            sessionStorage.setItem("e2e-historical-capacity-admitted", "true");
          }
        };
        new MutationObserver(observe).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-db-storage-admission"] });
        observe();
      });
      server.setGeneration(target);
      const page = await browser.newPage();
      const problems = collectConsoleProblems(page);
      await openTarget(browser, page);
      expect(await page.evaluate(() => sessionStorage.getItem("e2e-historical-capacity-admitted"))).toBe("true");
      expect(await pageReleaseEvidence(page)).toMatchObject({ dbMigrationPhase: "committed", swBootAck: "true" });
      const before = await readNativeDatabase(page, sourceName);
      if (!before) throw new Error("Fresh historical target did not materialize its empty source.");
      expect(Object.values(before.rows).every(rows => rows.length === 0)).toBe(true);
      expectHistoricalMaterialization(before, await readNativeDatabase(page, targetName));
      await createDemoCase(page, server.origin);
      expect((await readNativeDatabase(page, targetName))?.rows.cases).toHaveLength(1);
      expect(await readNativeDatabase(page, sourceName)).toEqual(before);
      expect(problems).toEqual([]);
      expect(external).toEqual([]);
    } finally { await browser.close(); }
  });
}
