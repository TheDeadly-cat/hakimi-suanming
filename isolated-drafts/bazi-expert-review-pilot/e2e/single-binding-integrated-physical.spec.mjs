import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  buildSingleBindingIntegratedPhysicalPairCandidate,
  createSingleBindingIntegratedPhysicalIds
} from "../single-binding-integrated-package-builder.mjs";
import {
  closeSingleBindingIntegratedPhysicalSeatInMemoryServer,
  consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer,
  prepareSingleBindingIntegratedPhysicalSeatPackage,
  releaseSingleBindingIntegratedPhysicalCapturedReturnCapability,
  startSingleBindingIntegratedPhysicalSeatInMemoryServer
} from "../single-binding-integrated-physical-package.mjs";

let ownedRoot;
let build;
let serverCapability;

function requestForSeatA(candidate) {
  return {
    pairRoot: candidate.outputDirectory,
    expectedPairPrecommitRawSha256: candidate.pairPrecommitRawSha256,
    expectedPairManifestRawSha256: candidate.pairManifestRawSha256,
    expectedSeatPackageManifestRawSha256: candidate.seatA.manifestRawSha256,
    expectedReviewCycleId: candidate.reviewCycleId,
    expectedPairRunId: candidate.pairRunId,
    expectedSeatId: "A",
    expectedSeatSessionNonce: candidate.runtimeSessionBindings.A.seatSessionNonce
  };
}

test.beforeAll(async () => {
  const canonicalTemp = await realpath(tmpdir());
  ownedRoot = await mkdtemp(join(canonicalTemp, "hakimi-physical-expert-browser-"));
  const canonicalOwned = await realpath(ownedRoot);
  expect(dirname(canonicalOwned).toLowerCase()).toBe(canonicalTemp.toLowerCase());
  expect(basename(canonicalOwned)).toMatch(/^hakimi-physical-expert-browser-/u);
  const ids = createSingleBindingIntegratedPhysicalIds();
  build = await buildSingleBindingIntegratedPhysicalPairCandidate({
    ...ids,
    outputDirectory: join(canonicalOwned, "pair")
  });
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestForSeatA(build));
  const serverPayload = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  serverCapability = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(serverPayload);
});

test.afterAll(async () => {
  if (serverCapability) {
    const closed = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(serverCapability);
    expect(closed.returnCaptured).toBe(true);
    expect(closed.returnCaptureCapability?.seatId).toBe("A");
    expect(closed.returnCaptureCapability?.completeReturnRawSha256).toMatch(/^[a-f0-9]{64}$/u);
    const released = releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(
      closed.returnCaptureCapability
    );
    expect(released.externalReturnWritten).toBe(false);
    expect(released.physicalErasureEstablished).toBe(false);
  }
  if (ownedRoot) {
    const canonicalTemp = await realpath(tmpdir());
    const canonicalOwned = await realpath(ownedRoot);
    const metadata = await lstat(canonicalOwned);
    expect(metadata.isDirectory()).toBe(true);
    expect(metadata.isSymbolicLink()).toBe(false);
    expect(dirname(canonicalOwned).toLowerCase()).toBe(canonicalTemp.toLowerCase());
    expect(basename(canonicalOwned)).toMatch(/^hakimi-physical-expert-browser-/u);
    await rm(canonicalOwned, { recursive: true, force: false });
  }
});

test("physical mode shows a no-code expert flow and never exposes coordinator controls", async ({ page }) => {
  const unexpectedRequests = [];
  const failedRequests = [];
  const consoleProblems = [];
  const allowedPaths = new Set([
    "/",
    "/single-binding-integrated-a.html",
    "/__complete-return",
    "/single-binding-integrated-contract.js",
    "/single-binding-integrated-handoff.js",
    "/single-binding-integrated-json.js",
    "/single-binding-integrated.css",
    "/single-binding-integrated.js",
    "/single-binding-rehearsal-contract.js"
  ]);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== serverCapability.origin || !allowedPaths.has(url.pathname)) {
      unexpectedRequests.push(request.url());
    }
  });
  page.on("requestfailed", (request) => failedRequests.push({
    url: request.url(),
    errorText: request.failure()?.errorText ?? "unknown"
  }));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => consoleProblems.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(serverCapability.entryUrl);
  await expect(page).toHaveTitle("八字单题独立复核演练");
  await expect(page.getByRole("heading", { level: 1, name: "八字单题独立复核演练" })).toBeVisible();
  await expect(page.getByText("独立复核 A · 单题练习", { exact: true })).toBeVisible();
  await expect(page.getByText("练习材料 · 不计入正式复核", { exact: true })).toBeVisible();
  await expect(page.getByText("本次只练习复核流程", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("ready");

  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(/\bAI\b|JSON|SHA-256|\bBinding\b|\bsession\b|\bhash\b|代码|下载|0\s*\/\s*(?:2|12)|\bfalse\b/iu);
  await expect(page.locator(".technical-details")).toHaveCount(0);
  await expect(page.locator('[data-download-role]')).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator("#download-status")).toHaveCount(0);

  await page.getByRole("radio", { name: "专家本人输入" }).check();
  await page.getByRole("checkbox", { name: "使用了聊天机器人、排盘软件或其他软件工具" }).check();
  await page.getByRole("checkbox", { name: /固定练习题，不是任何真人资料/u }).check();
  await page.getByRole("radio", { name: "目前无法判断" }).check();
  await page.getByLabel("目前无法判断的主要原因").selectOption("materials_insufficient");
  await page.getByLabel("理由").fill("AI 比专家更准。");
  await page.getByLabel("成立条件").fill("需要先说明采用的流派口径，并补足可靠案例。");
  await page.getByLabel("反例或仍需补充的证据").fill("需要覆盖临界值两侧的反例和原始依据。");
  await page.getByLabel("面向用户应怎样处理").selectOption("defer");
  await page.getByLabel("建议怎样改写或补充").fill("先写明材料不足，再列出待补条件。");

  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  await expect(page.locator("#readback-panel")).toBeHidden();
  await expect(page.locator("#error-summary")).toContainText("人与电脑工具比较内容");
  expect(await page.locator("#error-summary").innerText()).not.toMatch(/\bAI\b|JSON|SHA-256|\bBinding\b|\bsession\b|\bhash\b|代码|下载|\bfalse\b/iu);
  await page.getByLabel("理由").fill("现有材料不足以确认这组分界是否成立。");
  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  await expect(page.locator("#readback-panel")).toBeVisible();
  await expect(page.locator("#readback-panel")).toContainText("本次编号");
  await expect(page.locator("#readback-panel")).toContainText("复核席位");
  await expect(page.locator("#readback-panel")).toContainText("使用了聊天机器人、排盘软件或其他软件工具");
  await expect(page.locator("#readback-panel")).toContainText("现有材料不足以确认这组分界是否成立");
  await page.getByRole("checkbox", { name: /这些文字准确表达我的意见/u }).check();
  await page.getByRole("checkbox", { name: /没有查看另一席/u }).check();
  await page.getByRole("checkbox", { name: /不是人与电脑工具的准确度研究/u }).check();
  await page.getByRole("checkbox", { name: /固定练习材料/u }).check();
  await expect(page.getByRole("button", { name: "确认并完成本席" })).toBeEnabled();

  await page.getByLabel("理由").fill("修改后旧核对稿必须失效；仍然无法判断。");
  await expect(page.locator("#readback-panel")).toBeHidden();
  await expect(page.getByRole("button", { name: "确认并完成本席" })).toBeDisabled();
  await page.getByRole("button", { name: "生成逐字核对稿" }).click();
  await expect(page.locator("#readback-panel")).toContainText("修改后旧核对稿必须失效");
  await page.getByRole("checkbox", { name: /这些文字准确表达我的意见/u }).check();
  await page.getByRole("checkbox", { name: /没有查看另一席/u }).check();
  await page.getByRole("checkbox", { name: /不是人与电脑工具的准确度研究/u }).check();
  await page.getByRole("checkbox", { name: /固定练习材料/u }).check();
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    let dropFirstAcknowledgement = true;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (dropFirstAcknowledgement && String(args[0]) === "/__complete-return") {
        dropFirstAcknowledgement = false;
        throw new TypeError("synthetic acknowledgement loss");
      }
      return response;
    };
  });
  await page.getByRole("button", { name: "确认并完成本席" }).click();
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#error-summary")).toContainText("请把设备交回协调人");
  await expect(page.getByRole("button", { name: "重试完成本席" })).toBeEnabled();
  await page.getByRole("button", { name: "重试完成本席" }).click();

  const result = page.locator("#result");
  await expect(result).toBeFocused();
  await expect(result.getByRole("heading", { name: "本席复核练习已完成" })).toBeVisible();
  await expect(result).toContainText("本席操作已经结束，请把设备交回协调人");
  await expect(result).toContainText("不投票、不平均，也不自动选出一方");
  expect(await page.locator("body").innerText()).not.toMatch(/\bAI\b|JSON|SHA-256|\bBinding\b|\bsession\b|\bhash\b|代码|下载|0\s*\/\s*(?:2|12)|\bfalse\b/iu);
  expect(await page.evaluate(() => document.body.dataset.integratedState)).toBe("finalized");
  const layout = await page.evaluate(() => ({
    innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.innerWidth);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.innerWidth);
  expect(unexpectedRequests).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleProblems).toEqual([]);
});
