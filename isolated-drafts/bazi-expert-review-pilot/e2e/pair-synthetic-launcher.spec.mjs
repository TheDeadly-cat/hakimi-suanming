import { expect, test } from "@playwright/test";

const SYNTHETIC_ORIGIN = "http://127.0.0.1:4180";
const ALLOWED_PATHS = new Set([
  "/",
  "/pair-compare-synthetic.html",
  "/pair-compare-synthetic.css",
  "/pair-compare-synthetic-icon.svg",
  "/pair-compare-synthetic.js",
  "/pair-comparison.js",
  "/contract.js",
  "/data/questions.js",
  "/data/scenarios.js"
]);

test("synthetic clean-profile entry exercises A/B comparison without any return-loading surface", async ({ page }) => {
  const unexpectedRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== SYNTHETIC_ORIGIN || !ALLOWED_PATHS.has(url.pathname)) unexpectedRequests.push(request.url());
  });
  await page.goto(`${SYNTHETIC_ORIGIN}/`);
  await expect(page).toHaveTitle("八字两席合成并列自检");
  await expect(page.getByRole("heading", { level: 1, name: "两席合成并列自检" })).toBeVisible();
  await expect(page.getByText("不接受任何文件、路径、粘贴内容或真人资料。", { exact: false })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator("input, textarea, [contenteditable=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "运行合成 A/B 自检" }).click();
  await expect(page.getByRole("heading", { name: "机械并列候选已生成" })).toBeVisible();
  await expect(page.locator("#result")).toBeFocused();
  await expect(page.getByText("比较字段").locator("..").getByText("58", { exact: true })).toBeVisible();
  await expect(page.getByText("未解决差异").locator("..").getByText("4", { exact: true })).toBeVisible();
  await expect(page.getByText("正式专家计数变化").locator("..").getByText("0", { exact: true })).toBeVisible();
  await expect(page.getByText("没有赢家、评分、投票、平均、自动合并或正式 reconciliation。", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.syntheticCheck)).toBe("passed");
  expect(unexpectedRequests).toEqual([]);
});

test("synthetic entry remains readable without horizontal overflow at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${SYNTHETIC_ORIGIN}/`);
  await page.getByRole("button", { name: "运行合成 A/B 自检" }).click();
  await expect(page.getByRole("heading", { name: "机械并列候选已生成" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});
