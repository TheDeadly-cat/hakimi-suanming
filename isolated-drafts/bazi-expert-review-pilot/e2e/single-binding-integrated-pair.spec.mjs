import { expect, test } from "@playwright/test";

import {
  createSingleBindingIntegratedDraft,
  finalizeSingleBindingIntegratedSubmission,
  prepareSingleBindingIntegratedReadback
} from "../single-binding-integrated-contract.js";
import {
  createSingleBindingIntegratedHandoffArtifacts
} from "../single-binding-integrated-handoff.js";
import {
  createSingleBindingIntegratedSourceTreeDemoSessionBinding
} from "../single-binding-integrated-server.mjs";

const PAIR_ORIGIN = "http://127.0.0.1:4193";
const ALLOWED_PATHS = new Set([
  "/",
  "/single-binding-integrated-pair.html",
  "/single-binding-integrated-pair.css",
  "/single-binding-integrated-pair.js",
  "/single-binding-integrated-contract.js",
  "/single-binding-integrated-handoff.js",
  "/single-binding-integrated-json.js",
  "/single-binding-rehearsal-contract.js"
]);

async function completedArtifacts(seatId) {
  const draft = createSingleBindingIntegratedDraft(
    createSingleBindingIntegratedSourceTreeDemoSessionBinding(seatId)
  );
  const inner = draft.innerDraft;
  inner.startAcknowledgement.syntheticOnly = true;
  inner.reviewResponse.position = seatId === "A" ? "conditional" : "cannot_decide";
  inner.reviewResponse.cannotDecideReason = seatId === "A" ? null : "materials_insufficient";
  inner.reviewResponse.rationale = seatId === "A"
    ? "A 席认为需要先限定适用口径。"
    : "B 席认为现有合成材料不足以作出判断。";
  inner.reviewResponse.applicabilityConditions = `${seatId} 席要求冻结流派口径。`;
  inner.reviewResponse.counterexamplesOrNeededEvidence = `${seatId} 席要求补充独立来源和临界反例。`;
  inner.reviewResponse.highRiskDisposition = "defer";
  inner.reviewResponse.revisionSuggestion = `${seatId} 席建议并列材料缺口。`;
  inner.captureContext.entryMethod = seatId === "A"
    ? "coordinator_verbatim_transcription"
    : "expert_self_entered";
  inner.captureContext.coordinatorVerbatimNoSummarySelfDeclared = seatId === "A";
  inner.captureContext.assistanceCategories = seatId === "A"
    ? ["books_or_source_materials"]
    : ["none_declared"];
  const readback = await prepareSingleBindingIntegratedReadback(draft);
  for (const key of Object.keys(inner.finalConfirmations)) inner.finalConfirmations[key] = true;
  const submission = await finalizeSingleBindingIntegratedSubmission(draft, readback);
  return createSingleBindingIntegratedHandoffArtifacts(submission);
}

function completeFile(artifacts) {
  return {
    name: artifacts.completeReturnFilename,
    mimeType: "application/json",
    buffer: Buffer.from(artifacts.completeReturnText, "utf8")
  };
}

function sidecarFile(artifacts, rawSha = artifacts.completeReturnRawSha256) {
  return {
    name: `${artifacts.completeReturnFilename}.sha256.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`${rawSha}  ${artifacts.completeReturnFilename}\n`, "utf8")
  };
}

function browserCollisionFilename(filename, ordinal = 1) {
  const extensionIndex = filename.lastIndexOf(".");
  return `${filename.slice(0, extensionIndex)} (${ordinal})${filename.slice(extensionIndex)}`;
}

async function loadFourFiles(page, a, b, bRawSha) {
  await page.locator("#seat-a-return").setInputFiles(completeFile(a));
  await page.locator("#seat-a-pin").setInputFiles(sidecarFile(a));
  await page.locator("#seat-b-return").setInputFiles(completeFile(b));
  await page.locator("#seat-b-pin").setInputFiles(sidecarFile(b, bRawSha));
}

test("coordinator validates two complete returns and keeps all professional differences unresolved", async ({ page }) => {
  const [a, b] = await Promise.all([completedArtifacts("A"), completedArtifacts("B")]);
  const unexpectedRequests = [];
  const failedRequests = [];
  const consoleProblems = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== PAIR_ORIGIN || !ALLOWED_PATHS.has(url.pathname)) unexpectedRequests.push(request.url());
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => {
    if (new Set(["warning", "error"]).has(message.type())) consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => consoleProblems.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PAIR_ORIGIN}/`);
  await expect(page).toHaveTitle("单条规则 A/B 回件校验与差异并列");
  await expect(page.getByRole("heading", { level: 1, name: "单条规则 A/B 回件校验与差异并列" })).toBeVisible();
  await expect(page.getByText("不选赢家 · 不计入正式审定", { exact: true })).toBeVisible();
  await expect(page.getByText(/不得多数表决、平均或由生成模型自动选赢家/u)).toBeVisible();

  await loadFourFiles(page, a, b);
  await page.getByRole("button", { name: "校验并并列 A/B" }).click();
  const result = page.locator("#result");
  await expect(result.getByRole("heading", { name: "A/B 已按固定 7 个专业字段并列" })).toBeVisible();
  await expect(result).toBeFocused();
  await expect(result.locator("tbody tr")).toHaveCount(7);
  await expect(result.getByText("不同 · 未解决", { exact: true })).toHaveCount(6);
  await expect(result.getByText(/所有差异都保持未解决/u)).toBeVisible();
  await expect(result.getByText("0 / 2", { exact: true })).toBeVisible();
  await expect(result.getByText("0 / 12", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.pairState)).toBe("compared");

  const mobile390 = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(mobile390.documentWidth).toBeLessThanOrEqual(mobile390.width);
  expect(mobile390.bodyWidth).toBeLessThanOrEqual(mobile390.width);
  await page.setViewportSize({ width: 320, height: 568 });
  const mobile320 = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(mobile320.documentWidth).toBeLessThanOrEqual(mobile320.width);
  expect(mobile320.bodyWidth).toBeLessThanOrEqual(mobile320.width);

  await page.locator("#seat-a-return").setInputFiles(completeFile(a));
  await expect(result).toBeHidden();
  await expect(result.locator("tbody tr")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.pairState)).toBe("initial");
  expect(unexpectedRequests).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("coordinator accepts browser collision suffixes but still validates the original logical filenames", async ({ page }) => {
  const [a, b] = await Promise.all([completedArtifacts("A"), completedArtifacts("B")]);
  await page.goto(`${PAIR_ORIGIN}/`);
  const aComplete = completeFile(a);
  const aSidecar = sidecarFile(a);
  const bComplete = completeFile(b);
  const bSidecar = sidecarFile(b);
  aComplete.name = browserCollisionFilename(aComplete.name, 1);
  aSidecar.name = browserCollisionFilename(aSidecar.name, 2);
  bComplete.name = browserCollisionFilename(bComplete.name, 3);
  bSidecar.name = browserCollisionFilename(bSidecar.name, 4);
  await page.locator("#seat-a-return").setInputFiles(aComplete);
  await page.locator("#seat-a-pin").setInputFiles(aSidecar);
  await page.locator("#seat-b-return").setInputFiles(bComplete);
  await page.locator("#seat-b-pin").setInputFiles(bSidecar);
  await page.getByRole("button", { name: "校验并并列 A/B" }).click();
  await expect(page.getByRole("heading", { name: "A/B 已按固定 7 个专业字段并列" })).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.pairState)).toBe("compared");
});

test("a selection-change event during checking prevents the stale comparison from rendering", async ({ page }) => {
  const [a, b] = await Promise.all([completedArtifacts("A"), completedArtifacts("B")]);
  await page.goto(`${PAIR_ORIGIN}/`);
  await loadFourFiles(page, a, b);
  await page.evaluate(() => {
    const nativeArrayBuffer = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function delayedArrayBuffer() {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return Reflect.apply(nativeArrayBuffer, this, []);
    };
  });
  await page.getByRole("button", { name: "校验并并列 A/B" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-pair-state", "checking");
  await page.locator("#seat-a-return").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(250);
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#comparison-rows tr")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "校验并并列 A/B" })).toBeEnabled();
  expect(await page.evaluate(() => document.body.dataset.pairState)).toBe("initial");
});

test("coordinator page blocks a mismatched package-external return pin", async ({ page }) => {
  const [a, b] = await Promise.all([completedArtifacts("A"), completedArtifacts("B")]);
  await page.goto(`${PAIR_ORIGIN}/`);
  await loadFourFiles(page, a, b, "9".repeat(64));
  await page.getByRole("button", { name: "校验并并列 A/B" }).click();
  await expect(page.getByRole("heading", { name: "未通过机械校验" })).toBeVisible();
  await expect(page.locator("#error-summary")).toContainText("COMPLETE_RETURN_RAW_SHA256_MISMATCH");
  await expect(page.locator("#result")).toBeHidden();
  expect(await page.evaluate(() => document.body.dataset.pairState)).toBe("error");
});
