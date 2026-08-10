import { readFile } from "node:fs/promises";
import { expect, type BrowserContext, type Download, type Page } from "@playwright/test";
import {
  createWorkingDefaultRulePackEnvelope,
  serializeRulePackEnvelope
} from "@hakimi/rule-packs";

export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export type PortableDataFixture = {
  displayName: string;
  organization: string;
  researchFocus: string;
  timeZone: string;
  calendarType: "gregorian" | "lunar";
  density: "comfortable" | "compact";
  attachmentName: string;
  attachmentDescription: string;
  attachmentBytes: Buffer;
};

export type ActiveRulePackFixture = {
  packDigest: string;
  packId: string;
  profileId: string;
  profileVersion: string;
  canonicalJson: string;
};

export type RuleRegistrySnapshot = {
  dexieVersion: number;
  records: Array<Record<string, unknown>>;
};

export function portableFixture(label: string): PortableDataFixture {
  return {
    displayName: `${label}研究者`,
    organization: `${label}命理研究组`,
    researchFocus: `${label}：古籍证据、案例复盘与规则差异`,
    timeZone: "Asia/Chongqing",
    calendarType: "lunar",
    density: "compact",
    attachmentName: `${label}-证据.bin`,
    attachmentDescription: `${label}二进制附件，含 NUL 与非 UTF-8 字节`,
    attachmentBytes: Buffer.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff, 0x42, 0x61, 0x7a, 0x69])
  };
}

export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

export async function waitForAppReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .table-skeleton, .chart-loading, .research-loading, .transit-loading")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
}

export async function waitForServiceWorker(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    ready: document.documentElement.dataset.swReady,
    controlled: Boolean(navigator.serviceWorker.controller),
    bootSignalSent: document.documentElement.dataset.swBootSignalSent
  }))).toEqual({ ready: "true", controlled: true, bootSignalSent: "true" });
}

export async function openDataManagement(page: Page) {
  await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("数据管理与完整备份 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
  await waitForAppReady(page);
  await expect(page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).not.toHaveAttribute("aria-busy", "true");
}

export async function createDemoCase(page: Page) {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
}

export async function seedPortableData(page: Page, fixture: PortableDataFixture) {
  const profileRegion = page.getByRole("region", { name: "研究者资料" });
  await profileRegion.getByLabel("显示名称").fill(fixture.displayName);
  await profileRegion.getByLabel("机构（可选）").fill(fixture.organization);
  await profileRegion.getByLabel("研究方向（可选）").fill(fixture.researchFocus);
  await profileRegion.getByRole("button", { name: "保存研究者资料", exact: true }).click();
  await expect(profileRegion.getByRole("status")).toContainText("研究者资料已保存");

  const settingsRegion = page.getByRole("region", { name: "本机研究偏好" });
  await settingsRegion.getByLabel("默认 IANA 时区").fill(fixture.timeZone);
  await settingsRegion.getByLabel("默认历法").selectOption(fixture.calendarType);
  await settingsRegion.getByLabel("信息密度").selectOption(fixture.density);
  await settingsRegion.getByRole("button", { name: "保存本机偏好", exact: true }).click();
  await expect(settingsRegion.getByRole("status")).toContainText("本机偏好已保存");

  const attachmentsRegion = page.getByRole("region", { name: "附件库" });
  await attachmentsRegion.getByLabel("本次附件说明（可选）").fill(fixture.attachmentDescription);
  const fileChooserPromise = page.waitForEvent("filechooser");
  await attachmentsRegion.getByRole("button", { name: "选择并保存附件", exact: true }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: fixture.attachmentName,
    mimeType: "application/octet-stream",
    buffer: fixture.attachmentBytes
  });
  await expect(attachmentsRegion.getByRole("status")).toContainText("附件已保存");
  await expect(attachmentsRegion.getByText(fixture.attachmentName, { exact: true })).toBeVisible();
}

/**
 * Exercise the real quarantine and activation UI instead of inserting a test-only
 * IndexedDB record. The exported built-in package is declarative and activatable,
 * while importing it still creates the same unverified-local record as any file.
 */
export async function seedActiveRulePack(
  page: Page,
  options: { source?: "ui-export" | "generated" } = {}
): Promise<ActiveRulePackFixture> {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "设置与诊断" })).toBeVisible();
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "规则包仓库与激活" })).toBeVisible();

  const suggestedFilename = "hakimi-rule-pack-working-default.json";
  let canonicalJson: string;
  if (options.source === "generated") {
    canonicalJson = await serializeRulePackEnvelope(
      await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" })
    );
  } else {
    const exportPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出内置规则包", exact: true }).click();
    const exported = await exportPromise;
    expect(exported.suggestedFilename()).toBe(suggestedFilename);
    expect(await exported.failure()).toBeNull();
    const exportPath = await exported.path();
    if (!exportPath) throw new Error("内置规则包下载路径不可用");
    canonicalJson = await readFile(exportPath, "utf8");
  }
  const parsed = JSON.parse(canonicalJson) as {
    digest?: { value?: unknown };
    metadata?: { packId?: unknown };
    profile?: { profileId?: unknown; profileVersion?: unknown };
  };
  expect(parsed.digest?.value).toMatch(/^[a-f0-9]{64}$/);
  expect(parsed.metadata?.packId).toBe("ziping-working-default");
  expect(parsed.profile?.profileId).toBe("ziping-working-default");
  expect(parsed.profile?.profileVersion).toMatch(/^\d+\.\d+\.\d+$/);
  const fixture: ActiveRulePackFixture = {
    packDigest: parsed.digest!.value as string,
    packId: parsed.metadata!.packId as string,
    profileId: parsed.profile!.profileId as string,
    profileVersion: parsed.profile!.profileVersion as string,
    canonicalJson
  };

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "选择规则包", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: suggestedFilename,
    mimeType: "application/json",
    buffer: Buffer.from(canonicalJson, "utf8")
  });
  const preflight = page.locator(".rule-pack-preview").filter({
    hasText: "声明式完整性预检通过，可保存到隔离库"
  });
  await expect(preflight).toContainText(fixture.packDigest);
  await expect(preflight).toContainText("当前可激活是");
  await preflight.getByRole("button", { name: "保存到本机隔离库", exact: true }).click();

  const installed = page.locator('[aria-label="已安装规则包"] article').filter({
    hasText: fixture.packDigest
  });
  await expect(installed).toHaveCount(1);
  await expect(installed).toContainText(`${fixture.profileId} ${fixture.profileVersion}`);
  await expect(installed).toContainText("导入未验证");
  await installed.getByRole("checkbox", { name: /我确认只在本机使用此精确摘要/ }).check();
  await installed.getByRole("button", { name: "按精确摘要激活", exact: true }).click();
  await expect(page.getByText("已激活一个本机导入规则包", { exact: true })).toBeVisible();
  await expect(page.getByText(`活动包 ${fixture.packDigest}；这是本机显式批准，不是身份认证。`, { exact: true })).toBeVisible();
  await expect(installed).toContainText("本机已批准激活");
  return fixture;
}

export async function readRuleRegistrySnapshot(page: Page): Promise<RuleRegistrySnapshot> {
  return page.evaluate(async () => new Promise<RuleRegistrySnapshot>((resolve, reject) => {
    const request = indexedDB.open("hakimi-bazi-research");
    request.onerror = () => reject(request.error ?? new Error("规则包仓库数据库打开失败"));
    request.onupgradeneeded = () => reject(new Error("规则包仓库数据库在读取时意外触发升级"));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("ruleRegistry")) {
        database.close();
        reject(new Error("当前数据库缺少 ruleRegistry 分区"));
        return;
      }
      const transaction = database.transaction("ruleRegistry", "readonly");
      const getAll = transaction.objectStore("ruleRegistry").getAll();
      getAll.onerror = () => reject(getAll.error ?? new Error("规则包仓库读取失败"));
      getAll.onsuccess = () => {
        const records = (getAll.result as Array<Record<string, unknown>>)
          .sort((left, right) => String(left.id).localeCompare(String(right.id)));
        // Dexie stores its semantic version multiplied by ten in native
        // IndexedDB (Dexie v13 is exposed as IDBDatabase.version 130).
        const dexieVersion = database.version / 10;
        database.close();
        resolve({ dexieVersion, records });
      };
    };
  }));
}

export async function expectPartitionCount(page: Page, partitionLabel: string, count: number) {
  const overview = page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" });
  const label = overview.getByText(partitionLabel, { exact: true });
  await expect(label).toHaveCount(1);
  const row = label.locator("..");
  await expect(row.locator("dd")).toHaveText(String(count));
}

export async function exportFullBackupZip(page: Page): Promise<{ download: Download; bytes: Buffer }> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整 ZIP", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hakimi-full-backup-\d{4}-\d{2}-\d{2}\.zip$/);
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("完整 ZIP 下载路径不可用");
  const bytes = await readFile(downloadPath);
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  await expect(page.getByRole("status").filter({ hasText: "完整 ZIP 已生成并请求下载" })).toBeVisible();
  return { download, bytes };
}

export async function clearAllLocalData(page: Page) {
  await page.getByRole("button", { name: "开始完整清空", exact: true }).click();
  const confirmation = page.getByRole("group", { name: /输入“删除全部本地数据”以解锁/ });
  await confirmation.getByLabel("确认文字").fill("删除全部本地数据");
  await confirmation.getByRole("button", { name: "永久删除全部数据", exact: true }).click();
  await expect(page.getByRole("status").filter({
    hasText: "十六个本地数据分区与临时检索草稿已全部清除"
  })).toBeVisible();
}

export async function preflightBackupZip(page: Page, bytes: Buffer, name = "portable-full-backup.zip") {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({ name, mimeType: "application/zip", buffer: bytes });
  await expect(page.getByRole("heading", { name: "预检通过，尚未写入" })).toBeVisible();
  await expect(page.getByRole("list", { name: "十六分区恢复差异" }).getByRole("listitem")).toHaveCount(16);
}

export async function completeRestoreSafetyGate(page: Page) {
  const safetyDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "先下载当前安全备份", exact: true }).click();
  const safetyDownload = await safetyDownloadPromise;
  expect(safetyDownload.suggestedFilename()).toMatch(/^hakimi-before-restore-\d{4}-\d{2}-\d{2}\.zip$/);
  expect(await safetyDownload.failure()).toBeNull();

  await page.getByRole("checkbox", { name: /我已确认安全备份文件保存成功并可以打开/ }).check();
  await page.getByRole("checkbox", { name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/ }).check();
  const restoreButton = page.getByRole("button", { name: "确认替换并恢复", exact: true });
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();
  await expect(page.getByRole("status").filter({ hasText: "完整恢复成功" })).toBeVisible();
}

export async function expectPortableData(
  page: Page,
  fixture: PortableDataFixture,
  rulePack?: ActiveRulePackFixture
) {
  const profileRegion = page.getByRole("region", { name: "研究者资料" });
  await expect(profileRegion.getByLabel("显示名称")).toHaveValue(fixture.displayName);
  await expect(profileRegion.getByLabel("机构（可选）")).toHaveValue(fixture.organization);
  await expect(profileRegion.getByLabel("研究方向（可选）")).toHaveValue(fixture.researchFocus);

  const settingsRegion = page.getByRole("region", { name: "本机研究偏好" });
  await expect(settingsRegion.getByLabel("默认 IANA 时区")).toHaveValue(fixture.timeZone);
  await expect(settingsRegion.getByLabel("默认历法")).toHaveValue(fixture.calendarType);
  await expect(settingsRegion.getByLabel("信息密度")).toHaveValue(fixture.density);

  const attachmentsRegion = page.getByRole("region", { name: "附件库" });
  await expect(attachmentsRegion.getByText(fixture.attachmentName, { exact: true })).toBeVisible();
  await expect(attachmentsRegion.getByText(fixture.attachmentDescription, { exact: true })).toBeVisible();
  await expectPartitionCount(page, "研究者资料", 1);
  await expectPartitionCount(page, "应用设置", 1);
  await expectPartitionCount(page, "附件", 1);
  await expectPartitionCount(page, "规则包仓库", rulePack ? 2 : 0);
}

export async function disableNetworkCacheAndGoOffline(context: BrowserContext, page: Page) {
  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
  await devtools.send("Network.clearBrowserCache");
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
}

export async function expectMobileNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: MOBILE_VIEWPORT.width, documentWidth: MOBILE_VIEWPORT.width });
}
