import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";

async function waitForWorkspaceReady(page: Page) {
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "ready", {
    timeout: 30_000
  });
  await expect(page.locator("#revision-count")).not.toHaveText("—");
}

test("独立 4218 工作台完成计算、保存、重开、跨标签刷新与唯一清空", async ({ page, context }) => {
  const consoleProblems = collectConsoleProblems(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await expect(page.locator("#revision-count")).toHaveText("0");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", { timeout: 60_000 });
  await expect(page.locator("#save-form")).toBeVisible();
  await expect(page.locator("#revision-title")).not.toHaveValue("");

  await page.locator("#save-button").click();
  await expect(page.locator("#workspace-status")).toContainText("已保存到独立紫微档案", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);

  const secondTab = await context.newPage();
  await secondTab.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(secondTab);
  await expect(secondTab.locator("#revision-count")).toHaveText("1");
  await expect(secondTab.locator(".archive-item")).toHaveCount(1);
  await secondTab.close();

  await page.locator("#refresh-button").click();
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#clear-accepted").check();
  await page.locator("#clear-button").click();
  await expect(page.locator("#safety-message")).toContainText("已清空", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("2");
  await expect(page.locator(".archive-item")).toHaveCount(0);
  await expect(page.locator("#archive-empty")).toBeVisible();

  expect(consoleProblems).toEqual([]);
});
