import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function waitForReady(page: import("@playwright/test").Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "未核验审核收件箱" })).toBeVisible();
}

test("运限审核原件可导出、幂等导入、刷新重检并按摘要安全删除", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/settings/transit-review-inbox", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByText("还没有审核工件")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前 18 条候选", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("审核包下载没有可读取的本地路径");
  const rawBundle = await readFile(downloadPath);
  expect(rawBundle.byteLength).toBeGreaterThan(100_000);

  const chooseFirst = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入审核工件", exact: true }).click();
  await (await chooseFirst).setFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: rawBundle
  });
  await expect(page.getByRole("status").filter({ hasText: "审核原件已保存" })).toBeVisible();
  await expect(page.locator(".review-inbox-candidate-list > li")).toHaveCount(18);
  await expect(page.locator(".review-inbox-artifact-list > li")).toHaveCount(1);
  await expect(page.getByText("专家金标增量").locator("..")).toContainText("0");

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.locator(".review-inbox-candidate-list > li")).toHaveCount(18);
  await expect(page.locator(".review-inbox-artifact-list > li")).toHaveCount(1);

  const chooseDuplicate = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入审核工件", exact: true }).click();
  await (await chooseDuplicate).setFiles({
    name: "same-bytes-different-name.json",
    mimeType: "application/json",
    buffer: rawBundle
  });
  await expect(page.getByRole("status").filter({ hasText: "相同原件已存在" })).toBeVisible();
  await expect(page.locator(".review-inbox-artifact-list > li")).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }))).toEqual({ client: 390, scroll: 390 });

  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByRole("group", { name: /确认删除审核原件/ })).toBeVisible();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "审核原件已永久删除" })).toBeVisible();
  await expect(page.getByText("还没有审核工件")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByText("还没有审核工件")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
