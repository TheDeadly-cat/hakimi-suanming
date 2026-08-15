import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .table-skeleton, .chart-loading")).toHaveCount(0);
}

async function createDemoChart(page: Page) {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForReady(page);
  await page.getByRole("link", { name: "打开完整八字解读与研究预览", exact: true }).click();
  await page.waitForURL(/\?view=overview$/);
  await waitForReady(page);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
}

async function readDatabaseFingerprint(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hakimi-bazi-research");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      const storeNames = [...database.objectStoreNames];
      const transaction = database.transaction(storeNames, "readonly");
      const completion = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("readonly transaction aborted"));
      });
      const stores = await Promise.all(storeNames.map(async (storeName) => {
        const store = transaction.objectStore(storeName);
        const [keys, values] = await Promise.all([
          new Promise<IDBValidKey[]>((resolve, reject) => {
            const request = store.getAllKeys();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          }),
          new Promise<unknown[]>((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          })
        ]);
        return { storeName, keys, values };
      }));
      await completion;
      const snapshot = JSON.stringify({ version: database.version, stores });
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
      return {
        databaseVersion: database.version,
        stores: stores.map((store) => ({ name: store.storeName, count: store.values.length })),
        sha256: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
      };
    } finally {
      database.close();
    }
  });
}

test("69 项反馈模板可离线填写并只读预检，篡改文件失败关闭且不写库", async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await createDemoChart(page);
  const currentUrl = page.url();
  const workbench = page.locator(".bazi-content-review-feedback-workbench");
  await expect(workbench).toBeVisible();
  await expect(workbench).toHaveAttribute("data-feedback-format", "hakimi.bazi.content_review_feedback/0.1.0");
  await expect(workbench).toHaveAttribute("data-workflow-mode", "human_attributed_read_only_preflight");
  await expect(workbench).toHaveAttribute("data-preflight-state", "not_loaded");
  await expect(workbench).toHaveAttribute("data-resolved-count", "0");
  await expect(workbench).toHaveAttribute("data-unresolved-count", "69");
  await expect(workbench).toHaveAttribute("data-identity-verified", "false");
  await expect(workbench).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(workbench).toHaveAttribute("data-chart-or-storage-mutation-performed", "false");
  await expect(workbench).toHaveAttribute("data-result", "null");

  const databaseBefore = await readDatabaseFingerprint(page);
  // Dexie exposes logical schema 13 while IndexedDB stores Dexie's physical version as 13 * 10.
  expect(databaseBefore.databaseVersion).toBe(130);

  const downloadPromise = page.waitForEvent("download");
  await workbench.getByRole("button", { name: "导出 69 项反馈模板", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hakimi-bazi-content-review-feedback-v017.json");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const template = JSON.parse(await readFile(downloadedPath!, "utf8")) as {
    profile: Record<string, unknown>;
    queueBinding: Record<string, unknown>;
    reviewer: Record<string, string | boolean>;
    reviewSession: Record<string, string>;
    items: Array<Record<string, unknown>>;
    declaredCounts: Record<string, number>;
    boundary: Record<string, unknown>;
  };
  expect(template.profile).toMatchObject({
    formatVersion: "hakimi.bazi.content_review_feedback/0.1.0",
    expectedItemCount: 69,
    expertTruthClaimed: false,
    formalActivationAllowed: false,
    autoIntegrationAllowed: false
  });
  expect(template.queueBinding.queueSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(template.queueBinding.orderedItemIdsSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(template.items).toHaveLength(69);
  expect(template.boundary).toMatchObject({
    identityVerified: false,
    digitalSignatureVerified: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    chartOrStorageMutationPerformed: false,
    result: null
  });

  Object.assign(template.reviewer, {
    reviewerId: "reviewer-e2e-001",
    displayName: "浏览器审稿人",
    affiliation: "独立研究",
    expertiseStatement: "此为具名结构测试意见，现实身份与专业资质仍待线下核验。"
  });
  Object.assign(template.reviewSession, {
    reviewedAt: "2026-08-12T14:00:00+08:00",
    methodology: "逐条核对候选摘要、审稿问题和来源引用。"
  });
  Object.assign(template.items[0]!, {
    decision: "approve",
    decisionReason: "同意保留为未正式激活的候选表述。"
  });
  Object.assign(template.declaredCounts, { total: 69, unresolved: 68, approve: 1, revise: 0, reject: 0 });

  const filledPath = testInfo.outputPath("filled-feedback.json");
  await mkdir(path.dirname(filledPath), { recursive: true });
  await writeFile(filledPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  const validChooserPromise = page.waitForEvent("filechooser");
  await workbench.getByRole("button", { name: "预检已填写反馈 JSON", exact: true }).click();
  const validChooser = await validChooserPromise;
  await validChooser.setFiles(filledPath);

  await expect(workbench).toHaveAttribute("data-preflight-state", "valid");
  await expect(workbench).toHaveAttribute("data-resolved-count", "1");
  await expect(workbench).toHaveAttribute("data-unresolved-count", "68");
  await expect(workbench).toHaveAttribute("data-reviewer-attribution-complete", "true");
  await expect(workbench).toHaveAttribute("data-identity-verified", "false");
  await expect(workbench).toHaveAttribute("data-digital-signature-verified", "false");
  await expect(workbench).toHaveAttribute("data-eligible-for-formal-activation", "false");
  await expect(workbench).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(workbench).toHaveAttribute("data-chart-or-storage-mutation-performed", "false");
  await expect(workbench).toHaveAttribute("data-result", "null");
  await expect(workbench.getByText(/只读预检通过：filled-feedback\.json · 已裁决 1\/69/)).toBeVisible();
  await expect(workbench.getByText("1 已裁决 · 68 未决", { exact: true })).toBeVisible();
  await expect(workbench.getByText("浏览器审稿人 · reviewer-e2e-001", { exact: true })).toBeVisible();
  expect(page.url()).toBe(currentUrl);

  const tamperedPath = testInfo.outputPath("tampered-feedback.json");
  const tampered = structuredClone(template);
  tampered.queueBinding.queueSha256 = "0".repeat(64);
  await writeFile(tamperedPath, JSON.stringify(tampered), "utf8");
  const invalidChooserPromise = page.waitForEvent("filechooser");
  await workbench.getByRole("button", { name: "预检已填写反馈 JSON", exact: true }).click();
  const invalidChooser = await invalidChooserPromise;
  await invalidChooser.setFiles(tamperedPath);

  await expect(workbench).toHaveAttribute("data-preflight-state", "invalid");
  await expect(workbench).toHaveAttribute("data-resolved-count", "0");
  await expect(workbench).toHaveAttribute("data-unresolved-count", "69");
  await expect(workbench).toHaveAttribute("data-reviewer-attribution-complete", "false");
  await expect(workbench.getByRole("alert")).toContainText("没有绑定当前 69 项内容清单");
  await expect(workbench.getByText("1 已裁决 · 68 未决", { exact: true })).toHaveCount(0);
  expect(page.url()).toBe(currentUrl);

  const databaseAfter = await readDatabaseFingerprint(page);
  expect(databaseAfter).toEqual(databaseBefore);
  await expectNoHorizontalOverflow(page);

  const projectSlug = testInfo.project.name.replace(/[^a-z0-9_-]/gi, "-");
  await workbench.screenshot({
    path: testInfo.outputPath(`hakimi-bazi-v016-feedback-${projectSlug}-desktop.png`),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(workbench).toBeVisible();
  await workbench.screenshot({
    path: testInfo.outputPath(`hakimi-bazi-v016-feedback-${projectSlug}-mobile.png`),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});
