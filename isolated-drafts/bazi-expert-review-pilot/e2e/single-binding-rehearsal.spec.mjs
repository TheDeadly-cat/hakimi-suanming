import { expect, test } from "@playwright/test";

const A_ORIGIN = "http://127.0.0.1:4181";
const B_ORIGIN = "http://127.0.0.1:4182";
const COMMON_PATHS = new Set([
  "/",
  "/single-binding-rehearsal-contract.js",
  "/single-binding-rehearsal.css",
  "/single-binding-rehearsal.js"
]);

async function fillCommonResponse(page) {
  await page.getByRole("checkbox", { name: /固定题面和材料都是合成的/u }).check();
  await page.getByRole("radio", { name: "目前无法判断" }).check();
  await page.getByLabel("目前无法判断的主要原因").selectOption("materials_insufficient");
  await page.getByLabel("理由").fill("本页只有合成临界例子，材料不足以建立阈值有效性。");
  await page.getByLabel("成立条件").fill("需要冻结流派口径并补足可靠案例集。");
  await page.getByLabel("反例或仍需补充的证据").fill("需要覆盖临界值两侧的合成反例和独立来源依据。");
  await page.getByLabel("面向用户应怎样处理").selectOption("defer");
  await page.getByLabel("建议怎样改写或补充").fill("同时展示候选分界和材料缺口。");
}

async function completeFinalConfirmations(page) {
  await page.getByRole("checkbox", { name: /这些文字准确表达我的意见/u }).check();
  await page.getByRole("checkbox", { name: /没有查看另一席/u }).check();
  await page.getByRole("checkbox", { name: /不是专家与 AI 的准确度研究/u }).check();
  await page.getByRole("checkbox", { name: /固定题面是合成的、自由文本仍未评估/u }).check();
}

test("coordinator can facilitate a synthetic single-binding readback without code or formal admission", async ({ page }) => {
  const unexpectedRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const allowed = new Set([...COMMON_PATHS, "/single-binding-rehearsal-a.html"]);
    if (url.origin !== A_ORIGIN || !allowed.has(url.pathname)) unexpectedRequests.push(request.url());
  });

  await page.goto(`${A_ORIGIN}/`);
  await expect(page).toHaveTitle("八字规则单题审阅演练");
  await expect(page.getByRole("heading", { level: 1, name: "八字规则单题审阅演练" })).toBeVisible();
  await expect(page.getByText("独立席位 A · 合成题面演练", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "这次只审什么" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "这次明确不审什么" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本页已有材料" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "仍然缺少的材料" })).toBeVisible();
  await expect(page.getByText("可靠且带结果标签的案例集", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /赢家|投票|平均|准确度/u })).toHaveCount(0);

  await fillCommonResponse(page);
  await page.getByRole("radio", { name: "专家口述，协调人逐字代录" }).check();
  await expect(page.getByText(/不得概括、润色、改成项目术语/u)).toBeVisible();
  await page.getByRole("checkbox", { name: /协调人自述：只逐字录入/u }).check();
  await page.getByRole("checkbox", { name: "查阅了书籍或其他资料" }).check();
  await page.getByRole("checkbox", { name: "使用了 AI 或其他软件工具" }).check();

  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  const readback = page.locator("#readback-panel");
  await expect(readback.getByRole("heading", { name: "请逐字通读或听取以下核对稿" })).toBeVisible();
  await expect(readback.getByText("专家口述，协调人逐字代录", { exact: true })).toBeVisible();
  await expect(readback.getByText("查阅了书籍或其他资料；使用了 AI 或其他软件工具", { exact: true })).toBeVisible();
  await expect(readback.getByText(/本流程未执行；禁止录入此类材料/u)).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.rehearsalState)).toBe("readback_ready");

  await completeFinalConfirmations(page);
  await page.getByRole("button", { name: "确认并完成演练" }).click();
  await expect(page.getByRole("heading", { name: "合成题面演练候选已生成" })).toBeVisible();
  await expect(page.locator("#result")).toBeFocused();
  await expect(page.getByText("0 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText("0 / 12", { exact: true })).toBeVisible();
  await expect(page.getByText("没有另一席意见、赢家、投票、平均、自动合并或模型裁决。", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.rehearsalState)).toBe("completed");
  expect(unexpectedRequests).toEqual([]);
});

test("B seat remains a separate surface and mobile layout has no page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${B_ORIGIN}/`);
  await expect(page.getByText("独立席位 B · 合成题面演练", { exact: true })).toBeVisible();
  await expect(page.getByText("独立席位 A · 合成题面演练", { exact: true })).toHaveCount(0);
  await page.getByText("协调人信息（专家无需处理）", { exact: true }).click();
  await expect(page.getByText(/本页不提供另一席入口、状态或意见/u)).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});
