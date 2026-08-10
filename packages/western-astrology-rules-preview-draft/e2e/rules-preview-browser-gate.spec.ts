import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";

test("4219 规则层预览在双浏览器完成计算且零持久化", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await expect(page.locator("#workspace-status")).toHaveText("等待一次计算。");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator("#bodies-list > li")).toHaveCount(10);
  await expect(page.locator("#houses-list > li")).toHaveCount(12);
  await expect(page.locator("#angles-list > div")).toHaveCount(4);
  await expect(page.locator("#wheel-placeholder")).toHaveCount(0);

  await page.locator("#sidereal-mode").check();
  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });

  const storage = await page.evaluate(async () => {
    const databases = typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((entry) => entry.name)
      : null;
    return {
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
      indexedDbNames: databases
    };
  });
  expect(storage.localStorageKeys).toEqual([]);
  expect(storage.sessionStorageKeys).toEqual([]);
  expect(storage.indexedDbNames ?? []).toEqual([]);
  expect(consoleProblems).toEqual([]);
});
