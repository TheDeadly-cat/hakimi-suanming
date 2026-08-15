import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";

async function defaultPayload(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const raw = (document.getElementById("payload-json") as HTMLTextAreaElement).value;
    return JSON.parse(raw) as unknown;
  });
}

async function verifyAndExpectOk(page: Page): Promise<void> {
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("并列核对通过", {
    timeout: 15_000
  });
  await expect(page.locator("#result-section")).toBeVisible();
  await expect(page.locator("#system-results section")).toHaveCount(2);
  await expect(page.locator("#boundary-note")).toContainText("productionEligible=false");
}

test("跨体系只读并列预览验证默认八字+紫微摘要并零持久化", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("跨体系只读并列 · 隔离草案");
  await expect(page.locator("#workspace-status")).toHaveText("等待一次并列核对；页面不保存任何资料。");

  await verifyAndExpectOk(page);
  await expect(page.locator("#system-results section").first()).toContainText("八字修订摘要");
  await expect(page.locator("#system-results section").nth(1)).toContainText("紫微修订摘要");
  await expect(page.locator("#result-meta")).toContainText("c62140c222e985a756161a73efad9e651af4bb59c03aa49657174ca79d9f1502");

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

test("跨体系只读并列预览对摘要失配失败关闭", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const payload = await defaultPayload(page);
  const tampered = {
    ...(payload as Record<string, unknown>),
    systems: [
      {
        ...((payload as { systems: Array<Record<string, unknown>> }).systems[0]),
        frozenFacts: [{ field: "pillars.day.ganZhi", value: "乙丑" }]
      },
      ...(payload as { systems: Array<Record<string, unknown>> }).systems.slice(1)
    ]
  };
  await page.locator("#payload-json").fill(JSON.stringify(tampered, null, 2));
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("失败关闭");
  await expect(page.locator("#reasons-list")).toContainText("contentSha256 does not match canonical payload");
  await expect(page.locator("#result-section")).toBeHidden();
  expect(consoleProblems).toEqual([]);
});

test("跨体系只读并列预览对边界提权失败关闭", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const payload = await defaultPayload(page);
  const escalated = {
    ...(payload as Record<string, unknown>),
    systems: (payload as { systems: Array<Record<string, unknown>> }).systems.map((system) => ({
      ...system,
      boundary: { productionEligible: true, expertTruthClaimed: false, successReceiptIssued: false }
    }))
  };
  await page.locator("#payload-json").fill(JSON.stringify(escalated, null, 2));
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("失败关闭");
  await expect(page.locator("#reasons-list")).toContainText("boundary must keep productionEligible/expertTruthClaimed/successReceiptIssued false");
  await expect(page.locator("#result-section")).toBeHidden();
  expect(consoleProblems).toEqual([]);
});
