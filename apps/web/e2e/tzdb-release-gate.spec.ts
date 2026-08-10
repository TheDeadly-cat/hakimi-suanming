import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  collectConsoleProblems,
  createDemoCase,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

const TZDB_SHA256 = "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81";

test("production Edge binds charts and diagnostics to the bundled IANA 2026c artifact", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  await expect(page.getByText("IANA 2026c · 随应用锁定")).toBeVisible();
  await expect(page.getByText("IANA 2025b · 随当前应用构建保留")).toBeVisible();
  await expect(page.getByText(TZDB_SHA256, { exact: true })).toBeVisible();

  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "加载并检查历史时区数据" }).click();
  await expect(page.getByText(/历史时区数据 1\/1 已载入且行为哨兵通过，可在离线状态按该快照复核/)).toBeVisible();
  await page.context().setOffline(false);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出诊断 JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hakimi-diagnostic-\d{4}-\d{2}-\d{2}\.json$/);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("diagnostic download has no readable path");
  const diagnostic = JSON.parse(await readFile(downloadPath, "utf8"));
  expect(diagnostic.timeZoneDatabase).toMatchObject({
    source: "bundled_iana_tzdb",
    ianaVersion: "2026c",
    artifactSha256: TZDB_SHA256,
    versionIdentified: true,
    hostIntlUsedForCalculation: false,
    hostIntlVersionExposed: false,
    artifactRegistryPolicy: "append_only_offline_bundled",
    retainedArtifacts: [
      { ianaVersion: "2026c", active: true },
      { ianaVersion: "2025b", active: false }
    ]
  });
  expect(diagnostic.timeZoneDatabase.snapshotId).toContain(`iana-tzdb@2026c/sha256:${TZDB_SHA256}`);

  const desktopViewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, html: 0 });
  if (desktopViewport) await page.setViewportSize(desktopViewport);

  await createDemoCase(page);
  const chartPath = new URL(page.url()).pathname;
  await page.goto(`${chartPath}?view=research&at=2025-08-18T00%3A00%3A00Z`, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "复算元数据" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本命盘只读复演" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "显式版本派生投影" })).toBeVisible();
  await expect(page.getByText("不冒充旧输出", { exact: true })).toBeVisible();
  await expect(page.getByText("IANA 2026c · 固定工件")).toBeVisible();
  await expect(page.getByText(TZDB_SHA256, { exact: true })).toBeVisible();
  await expect(page.getByText(/hash 2\.0\.0/)).toBeVisible();
  await page.getByRole("button", { name: "运行本命盘只读复演", exact: true }).click();
  await expect(page.getByText("冻结结果与精确执行器复演一致", { exact: true })).toBeVisible();
  await expect(page.getByText(/源 Revision 未改写/)).toBeVisible();

  const revisionOptionCount = await page.getByRole("combobox", { name: "历史 Revision" }).locator("option").count();
  await page.getByRole("button", { name: "生成显式版本派生投影", exact: true }).click();
  await expect(page.getByText("投影完整", { exact: true })).toBeVisible();
  await expect(page.getByText("投影完成，源 Revision 未改写", { exact: true })).toBeVisible();
  await expect(page.getByText(/条关系事实/)).toBeVisible();
  await expect(page.getByText(/10 柱/)).toBeVisible();
  await expect(page.getByText(/6 层已解析/)).toBeVisible();
  await expect(page.getByText(/explicit-derived-replay:relations-0\.1\.0_luck-0\.1\.0_transit-1\.2\.0/)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "历史 Revision" }).locator("option")).toHaveCount(revisionOptionCount);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, html: 0 });

  expect(consoleProblems).toEqual([]);
});
