import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

const A_ORIGIN = "http://127.0.0.1:4191";
const B_ORIGIN = "http://127.0.0.1:4192";
const COMMON_PATHS = new Set([
  "/",
  "/single-binding-integrated-a.html",
  "/single-binding-integrated-b.html",
  "/single-binding-integrated-contract.js",
  "/single-binding-integrated-handoff.js",
  "/single-binding-integrated-json.js",
  "/single-binding-integrated.css",
  "/single-binding-integrated.js",
  "/single-binding-rehearsal-contract.js"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function observePageHealth(page, expectedOrigin) {
  const unexpectedRequests = [];
  const failedRequests = [];
  const consoleProblems = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== expectedOrigin || !COMMON_PATHS.has(url.pathname)) {
      unexpectedRequests.push(request.url());
    }
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => {
    if (new Set(["warning", "error"]).has(message.type())) consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => consoleProblems.push(error.message));
  return { unexpectedRequests, failedRequests, consoleProblems };
}

async function fillProfessionalResponse(page, suffix = "") {
  await page.getByRole("checkbox", { name: /题面和材料全是合成的/u }).check();
  await page.getByRole("radio", { name: "目前无法判断" }).check();
  await page.getByLabel("目前无法判断的主要原因").selectOption("materials_insufficient");
  await page.getByLabel("理由").fill(`本页只有合成临界例子，材料不足以建立阈值有效性。${suffix}`);
  await page.getByLabel("成立条件").fill("需要冻结流派口径并补足可靠案例集。");
  await page.getByLabel("反例或仍需补充的证据").fill("需要覆盖临界值两侧的合成反例和独立来源依据。");
  await page.getByLabel("面向用户应怎样处理").selectOption("defer");
  await page.getByLabel("建议怎样改写或补充").fill("同时展示候选分界和材料缺口。");
}

async function checkFinalConfirmations(page) {
  await page.getByRole("checkbox", { name: /这些文字准确表达我的意见/u }).check();
  await page.getByRole("checkbox", { name: /没有查看另一席/u }).check();
  await page.getByRole("checkbox", { name: /不是专家与 AI 的准确度研究/u }).check();
  await page.getByRole("checkbox", { name: /固定题面是合成的、自由文本仍未评估/u }).check();
}

test("A seat supports verbatim transcription, exact readback, and two byte-exact coordinator downloads", async ({ page }) => {
  const health = observePageHealth(page, A_ORIGIN);
  await page.goto(`${A_ORIGIN}/?seatId=B&session=ignored`);

  await expect(page).toHaveTitle("八字单题独立复核演练");
  await expect(page.getByRole("heading", { level: 1, name: "八字单题独立复核演练" })).toBeVisible();
  await expect(page.getByText("独立复核 A · 单题练习", { exact: true })).toBeVisible();
  await expect(page.getByText("独立复核 B · 单题练习", { exact: true })).toHaveCount(0);
  await expect(page.getByText("练习材料 · 不计入正式复核", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "发起下载完整回件" })).toBeHidden();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("ready");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到审阅题面" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  await page.getByRole("radio", { name: "专家口述，协调人逐字代录" }).check();
  await expect(page.getByText(/不得概括、润色、改成项目术语/u)).toBeVisible();
  await expect(page.getByRole("radio", { name: "专家口述，协调人逐字代录" }))
    .toHaveAttribute("aria-expanded", "true");
  await page.getByRole("checkbox", { name: /协调人自述：只逐字录入/u }).check();
  await page.getByRole("checkbox", { name: "查阅了书籍或其他资料" }).check();
  await page.getByRole("checkbox", { name: "使用了 AI 或其他软件工具" }).check();
  await fillProfessionalResponse(page, "A 席合成演练。");

  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  const readback = page.locator("#readback-panel");
  await expect(readback.getByRole("heading", { name: "请专家逐字通读或听取以下核对稿" })).toBeVisible();
  await expect(readback).toBeFocused();
  await expect(readback.getByText("专家口述，协调人逐字代录", { exact: true })).toBeVisible();
  await expect(readback.getByText("查阅了书籍或其他资料；使用了 AI 或其他软件工具", { exact: true })).toBeVisible();
  await expect(readback.getByText("A 席合成演练。", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "核对稿已生成" })).toBeDisabled();
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("readback_ready");

  await checkFinalConfirmations(page);
  await expect(page.getByRole("button", { name: "确认并生成完整回件" })).toBeEnabled();
  await page.getByRole("button", { name: "确认并生成完整回件" }).click();
  const result = page.locator("#result");
  await expect(result.getByRole("heading", { name: "本席合成演练回件已在内存生成" })).toBeVisible();
  await expect(result).toBeFocused();
  await expect(result.getByText(/请把设备交回协调人/u)).toBeVisible();
  await expect(result.getByText(/本页不声称任何文件已经保存/u)).toBeVisible();
  await expect(result.getByText(/没有赢家、投票、平均、自动合并或模型裁决/u)).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("finalized");

  const expectedCompleteFilename = await page.locator("#complete-return-filename").textContent();
  const expectedCompleteSha = await page.locator("#complete-return-sha").textContent();
  const [completeDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "发起下载完整回件" }).click()
  ]);
  expect(completeDownload.suggestedFilename()).toBe(expectedCompleteFilename);
  const completePath = await completeDownload.path();
  expect(completePath).not.toBeNull();
  const completeBytes = await readFile(completePath);
  expect(sha256(completeBytes)).toBe(expectedCompleteSha);
  const completeValue = JSON.parse(completeBytes.toString("utf8"));
  expect(completeValue.seatId).toBe("A");
  expect(completeValue.embeddedArtifacts.map((entry) => entry.role)).toEqual([
    "session_submission_original",
    "independent_file_seal_receipt",
    "session_submission_checksum_text"
  ]);

  const sidecarFilename = `${expectedCompleteFilename}.sha256.txt`;
  const [sidecarDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "发起下载包外 SHA-256 校验值" }).click()
  ]);
  expect(sidecarDownload.suggestedFilename()).toBe(sidecarFilename);
  const sidecarPath = await sidecarDownload.path();
  expect(sidecarPath).not.toBeNull();
  const sidecarBytes = await readFile(sidecarPath);
  expect(sidecarBytes.toString("utf8")).toBe(`${expectedCompleteSha}  ${expectedCompleteFilename}\n`);
  await expect(page.locator("#download-status")).toContainText("已发起包外 SHA-256 校验值的浏览器下载请求");
  await expect(page.locator("#download-status")).toContainText("不证明文件已保存");
  expect(await page.evaluate(() => document.body.dataset.downloadState)).toBe("requested");

  expect(health.unexpectedRequests).toEqual([]);
  expect(health.failedRequests).toEqual([]);
  expect(health.consoleProblems).toEqual([]);
});

test("B seat supports self-entry and any post-readback edit invalidates the old readback", async ({ page }) => {
  const health = observePageHealth(page, B_ORIGIN);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${B_ORIGIN}/`);

  await expect(page.getByText("独立复核 B · 单题练习", { exact: true })).toBeVisible();
  await expect(page.getByText("独立复核 A · 单题练习", { exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "专家本人输入" }).check();
  await expect(page.getByText(/协调人只能逐字代录/u)).toBeHidden();
  await page.getByRole("checkbox", { name: "未使用其他协助" }).check();
  await fillProfessionalResponse(page, "B 席第一稿。");

  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  await expect(page.locator("#readback-panel")).toBeVisible();
  await expect(page.locator("#readback-panel").getByText("专家本人输入", { exact: true })).toBeVisible();
  await checkFinalConfirmations(page);
  await expect(page.getByRole("button", { name: "确认并生成完整回件" })).toBeEnabled();

  await page.getByLabel("理由").fill("本页只有合成材料；修改后必须重新读回。B 席第二稿。");
  await expect(page.locator("#readback-panel")).toBeHidden();
  await expect(page.getByRole("checkbox", { name: /这些文字准确表达我的意见/u })).toBeDisabled();
  await expect(page.getByRole("button", { name: "确认并生成完整回件" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "生成逐字核对稿" })).toBeEnabled();
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("ready");

  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  await expect(page.locator("#readback-panel").getByText(/修改后必须重新读回/u)).toBeVisible();
  await checkFinalConfirmations(page);
  await page.getByRole("button", { name: "确认并生成完整回件" }).click();
  await expect(page.locator("#result")).toBeFocused();
  await expect(page.locator("#complete-return-filename")).toContainText("seat-b-cycle-");
  await expect(page.locator("#complete-return-filename")).toContainText("-pair-");
  await expect(page.locator("#complete-return-filename")).toContainText("-session-");
  await expect(page.locator("#complete-return-filename")).toContainText("-complete-return.json");

  const mobile390 = await page.evaluate(() => ({
    innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(mobile390.documentWidth).toBeLessThanOrEqual(mobile390.innerWidth);
  expect(mobile390.bodyWidth).toBeLessThanOrEqual(mobile390.innerWidth);

  await page.setViewportSize({ width: 320, height: 568 });
  const mobile320 = await page.evaluate(() => ({
    innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(mobile320.documentWidth).toBeLessThanOrEqual(mobile320.innerWidth);
  expect(mobile320.bodyWidth).toBeLessThanOrEqual(mobile320.innerWidth);
  await expect(page.getByRole("button", { name: "发起下载完整回件" })).toBeVisible();

  expect(health.unexpectedRequests).toEqual([]);
  expect(health.failedRequests).toEqual([]);
  expect(health.consoleProblems).toEqual([]);
});
