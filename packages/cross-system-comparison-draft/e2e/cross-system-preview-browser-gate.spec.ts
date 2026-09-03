import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";
import {
  calculateCrossSystemComparisonSha256Draft,
  type CrossSystemComparisonPayload,
  type CrossSystemReadonlyComparisonDraft
} from "../src/index";

async function defaultPayload(page: Page): Promise<unknown> {
  await expect(page.locator("#verify-button")).toBeEnabled();
  return page.evaluate(() => {
    const raw = (document.getElementById("payload-json") as HTMLTextAreaElement).value;
    return JSON.parse(raw) as unknown;
  });
}

async function verifyAndExpectOk(page: Page): Promise<void> {
  await expect(page.locator("#verify-button")).toBeEnabled();
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("并列核对通过", {
    timeout: 15_000
  });
  await expect(page.locator("#result-section")).toBeVisible();
  await expect(page.locator("#system-results section")).toHaveCount(2);
  await expect(page.locator("#observation-results .observation-partition")).toHaveCount(7);
  await expect(page.locator("#boundary-note")).toContainText("productionEligible=false");
}

test("跨体系只读并列预览验证默认紫微+西洋工程回执摘要并零持久化", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("跨体系只读并列 · 隔离草案");
  await expect(page.locator("#workspace-status")).toHaveText("等待一次并列核对；页面不保存任何资料。");

  await verifyAndExpectOk(page);
  await expect(page.locator("#system-results section").first()).toContainText("紫微离线工程重放投影");
  await expect(page.locator("#system-results section").nth(1)).toContainText("西洋离线工程重放投影");
  await expect(page.locator("#result-meta")).toContainText(/^[\s\S]*[a-f0-9]{64}[\s\S]*$/u);
  await expect(page.locator("#observation-results")).toContainText("财帛宫与第二宫不得自动等价");
  await expect(page.locator("#observation-results")).toContainText("输入时间边界是否可比较仍未解决");
  await expect(page.locator("#observation-results")).toContainText("空数组不表示体系一致");
  await expect(page.locator("body")).not.toContainText("综合命运得分");

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

test("跨体系只读并列预览拒绝重算内容摘要后的伪造工程事实", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const payload = await defaultPayload(page) as CrossSystemReadonlyComparisonDraft;
  const { contentSha256: _oldDigest, ...payloadWithoutDigest } = payload;
  const firstSystem = payload.systems[0]!;
  const forgedPayload = {
    ...payloadWithoutDigest,
    systems: [
      {
        ...firstSystem,
        frozenFacts: firstSystem.frozenFacts.map((fact, index) =>
          index === 0 ? { ...fact, value: "fabricated-but-resigned" } : fact
        )
      },
      ...payload.systems.slice(1)
    ]
  };
  const contentSha256 = await calculateCrossSystemComparisonSha256Draft(
    forgedPayload as CrossSystemComparisonPayload
  );

  await page.locator("#payload-json").fill(JSON.stringify({ ...forgedPayload, contentSha256 }, null, 2));
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("失败关闭");
  await expect(page.locator("#reasons-list")).toContainText(
    "ziwei-doushu frozenFacts do not match the registry-bound projector output"
  );
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

test("跨体系只读并列预览拒绝带有效新摘要的伪造加权字段", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const payload = await defaultPayload(page) as CrossSystemReadonlyComparisonDraft;
  const { contentSha256: _oldDigest, ...payloadWithoutDigest } = payload;
  const forgedPayload = { ...payloadWithoutDigest, weightedScore: 100 };
  const contentSha256 = await calculateCrossSystemComparisonSha256Draft(
    forgedPayload as unknown as CrossSystemComparisonPayload
  );

  await page.locator("#payload-json").fill(JSON.stringify({ ...forgedPayload, contentSha256 }, null, 2));
  await page.locator("#verify-button").click();
  await expect(page.locator("#workspace-status")).toContainText("失败关闭");
  await expect(page.locator("#reasons-list")).toContainText("comparison must contain only the exact contract fields");
  await expect(page.locator("#result-section")).toBeHidden();
  expect(consoleProblems).toEqual([]);
});
