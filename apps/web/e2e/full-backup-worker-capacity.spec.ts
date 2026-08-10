import { expect, test, type Page } from "@playwright/test";
import {
  collectConsoleProblems,
  expectPortableData,
  exportFullBackupZip,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedPortableData,
  waitForAppReady
} from "./full-backup-helpers";

async function installStorageEstimate(page: Page, usage: number, quota: number): Promise<void> {
  await page.evaluate(({ usage, quota }) => {
    Object.defineProperty(navigator.storage, "estimate", {
      configurable: true,
      value: async () => ({ usage, quota })
    });
  }, { usage, quota });
}

test("真实 Worker 预检后容量不足零写入，提交前估值下降也失败关闭", async ({ page }) => {
  test.setTimeout(180_000);
  const problems = collectConsoleProblems(page);
  const fixture = portableFixture("容量门");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await openDataManagement(page);
  await seedPortableData(page, fixture);
  const { bytes } = await exportFullBackupZip(page);

  await installStorageEstimate(page, 1023, 1024);
  const [preflightWorker] = await Promise.all([
    page.waitForEvent("worker"),
    preflightBackupZip(page, bytes, "capacity-gate.zip")
  ]);
  expect(new URL(preflightWorker.url()).pathname).toMatch(/\/full-backup\.worker-[^/]+\.js$/u);
  await expect(page.getByText("容量准入未通过：可用空间不足")).toBeVisible();
  await expect(page.getByRole("button", { name: "确认替换并恢复" })).toBeDisabled();
  await expectPortableData(page, fixture);

  await installStorageEstimate(page, 0, 2 * 1024 * 1024 * 1024);
  await page.getByRole("button", { name: "重新检查容量" }).click();
  await expect(page.getByText("容量准入已通过", { exact: true }).last()).toBeVisible();

  const safetyDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "先下载当前安全备份" }).click();
  const safetyDownload = await safetyDownloadPromise;
  expect(await safetyDownload.failure()).toBeNull();
  await page.getByLabel(/我已确认安全备份文件保存成功并可以打开/).check();
  const replacement = page.getByLabel(/我理解恢复会替换此浏览器中的全部十六个用户数据分区/);
  await replacement.check();

  // The first admission is not a reservation. Shrink the estimate immediately
  // before commit and prove the second gate refuses to call the write path.
  await installStorageEstimate(page, 1023, 1024);
  await page.getByRole("button", { name: "确认替换并恢复" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "提交前容量准入未通过" })).toBeVisible();
  await expect(replacement).not.toBeChecked();
  await expect(page.getByRole("heading", { name: "预检通过，尚未写入" })).toBeVisible();
  await expectPortableData(page, fixture);
  expect(problems).toEqual([]);
});

