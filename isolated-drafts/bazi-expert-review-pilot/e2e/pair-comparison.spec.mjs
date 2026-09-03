import { expect, test } from "@playwright/test";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { buildFinalArtifacts, createPilotDraft } = await import("../contract.js");

const CYCLE = `pilot-review-cycle.${"c".repeat(64)}`;
const PIN_A = "a".repeat(64);
const PIN_B = "b".repeat(64);

function completeDraft(draft, seat, { seatBReason = "B 席认为 P01 需要重核。" } = {}) {
  draft.acknowledgements.pilotOnly = true;
  draft.acknowledgements.syntheticOnly = true;
  draft.acknowledgements.noCrossOpinionAccess = true;
  draft.acknowledgements.privateOffRepositoryHandling = true;
  draft.reviewerSelfDescription.selfDescribedTradition = seat === "A" ? "A 席：子平旺衰。" : "B 席：子平旺衰。";
  draft.reviewerSelfDescription.selfDescribedScope = "仅复核合成题面。";
  for (const response of Object.values(draft.caseResponses)) {
    response.factAssessment = "insufficient_information";
    response.rulePosition = "conditional";
    response.reason = "需结合流派边界判断。";
    response.applicabilityConditions = "仅在题面内成立。";
    response.counterexamples = "特殊结构成立时可能失效。";
    response.invalidationStructures = ["无法判断"];
    response.highRiskDisposition = "defer";
    response.revisionSuggestion = "保留候选标签。";
  }
  if (seat === "B") {
    draft.caseResponses.P01.factAssessment = "not_established";
    draft.caseResponses.P01.rulePosition = "oppose";
    draft.caseResponses.P01.reason = seatBReason;
  }
  for (const response of Object.values(draft.overallResponses)) {
    response.position = "conditional";
    response.expertOriginalText = "仅支持条件化判断。";
    response.rationale = "合成场景不能替代正式案例。";
    response.uncertainties = "来源和现实身份未闭合。";
  }
  draft.usabilityFeedback.clarityRating = "4";
  draft.usabilityFeedback.difficultTerms = "无";
  draft.usabilityFeedback.workflowComments = "保留逐页结构。";
  return draft;
}

async function makeUploads(options = {}) {
  const draftA = completeDraft(await createPilotDraft("A", {
    reviewCycleId: CYCLE,
    packageManifestRawSha256: PIN_A
  }), "A");
  const draftB = completeDraft(await createPilotDraft("B", {
    reviewCycleId: CYCLE,
    packageManifestRawSha256: PIN_B
  }), "B", options);
  const [a, b] = await Promise.all([
    buildFinalArtifacts(draftA, new Date("2030-01-02T03:04:05.000Z")),
    buildFinalArtifacts(draftB, new Date("2030-01-02T03:05:05.000Z"))
  ]);
  return {
    a: { name: "seat-a-complete-submission.json", mimeType: "application/json", buffer: Buffer.from(a.completePackageText, "utf8") },
    b: { name: "seat-b-complete-submission.json", mimeType: "application/json", buffer: Buffer.from(b.completePackageText, "utf8") }
  };
}

async function comparePair(page) {
  const uploads = await makeUploads();
  await page.getByLabel("本轮交接号").fill(CYCLE);
  await page.getByLabel("A 席 manifest pin").fill(PIN_A);
  await page.getByLabel("B 席 manifest pin").fill(PIN_B);
  await page.getByLabel("A 席完整回件").setInputFiles(uploads.a);
  await page.getByLabel("B 席完整回件").setInputFiles(uploads.b);
  await page.getByRole("button", { name: "校验并逐项并列" }).click();
}

test("coordinator can compare same-cycle A/B returns without JSON editing or machine adjudication", async ({ page }) => {
  const unexpectedRequests = [];
  const allowedPaths = new Set([
    "/", "/pair-compare.html", "/pair-compare.css", "/pair-compare.js", "/pair-comparison.js",
    "/contract.js", "/data/questions.js", "/data/scenarios.js"
  ]);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4179" || !allowedPaths.has(url.pathname)) {
      unexpectedRequests.push(request.url());
    }
  });
  await page.goto("http://127.0.0.1:4179/");
  await expect(page).toHaveTitle("八字两席试填差异并列");
  await expect(page.getByRole("heading", { level: 1, name: "两席试填差异并列" })).toBeVisible();
  await expect(page.getByText("不投票、不平均、不自动选择赢家。", { exact: false })).toBeVisible();
  await comparePair(page);
  await expect(page.getByRole("heading", { name: "机械并列完成" })).toBeVisible();
  await expect(page.locator("#result")).toBeFocused();
  await expect(page.getByText("未解决差异").locator("..").getByText("4", { exact: true })).toBeVisible();
  await expect(page.getByText("正式专家计数变化").locator("..").getByText("0", { exact: true })).toBeVisible();
  const differenceRows = page.locator('[data-classification="difference"]');
  await expect(differenceRows).toHaveCount(4);
  const p01Reason = page.locator(".comparison-group").filter({ has: page.getByRole("heading", { name: "P01 · 极弱规则测试" }) })
    .locator(".comparison-row").filter({ hasText: "判断理由" });
  await expect(p01Reason).toContainText("B 席认为 P01 需要重核。");
  await expect(p01Reason).toContainText("未解决：本工具不会替人选择、合并或评分。");
  await expect(page.getByRole("button", { name: /赢家|采用|批准/u })).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
});

test("rejects an oversized file before its arrayBuffer is called", async ({ page }) => {
  await page.goto("http://127.0.0.1:4179/");
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    window.__oversizedArrayBufferCalled = false;
    File.prototype.arrayBuffer = function patchedArrayBuffer() {
      if (this.name === "oversized.json") window.__oversizedArrayBufferCalled = true;
      return original.call(this);
    };
  });
  await page.getByLabel("A 席完整回件").setInputFiles({
    name: "oversized.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0x20)
  });
  await page.getByRole("button", { name: "校验并逐项并列" }).click();
  await expect(page.getByRole("alert")).toContainText("FILE_SIZE_INVALID");
  expect(await page.evaluate(() => window.__oversizedArrayBufferCalled)).toBe(false);
  await expect(page.locator("#result")).toBeHidden();
});

test("a cleared operation cannot be repopulated by a late comparison", async ({ page }) => {
  const uploads = await makeUploads();
  await page.goto("http://127.0.0.1:4179/");
  await page.getByLabel("本轮交接号").fill(CYCLE);
  await page.getByLabel("A 席 manifest pin").fill(PIN_A);
  await page.getByLabel("B 席 manifest pin").fill(PIN_B);
  await page.getByLabel("A 席完整回件").setInputFiles(uploads.a);
  await page.getByLabel("B 席完整回件").setInputFiles(uploads.b);
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function delayedArrayBuffer() {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return original.call(this);
    };
  });
  await page.getByRole("button", { name: "校验并逐项并列" }).click({ noWaitAfter: true });
  await expect(page.getByRole("button", { name: "清除本页内容" })).toBeDisabled();
  await expect(page.getByLabel("本轮交接号")).toBeDisabled();
  await expect(page.getByLabel("A 席完整回件")).toBeDisabled();
  await page.evaluate(() => {
    document.querySelector("#clear")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.getByLabel("本轮交接号")).toHaveValue("");
  await expect(page.getByRole("button", { name: "校验并逐项并列" })).toBeEnabled();
});

test("changing any binding input withdraws the previously rendered result", async ({ page }) => {
  await page.goto("http://127.0.0.1:4179/");
  await comparePair(page);
  await expect(page.locator("#result")).toBeVisible();
  await page.getByLabel("A 席 manifest pin").fill("d".repeat(64));
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.getByRole("heading", { name: "机械并列完成" })).toHaveCount(0);
  await expect(page.locator("#status")).toHaveText("");
});

test("renders hostile-looking opinion text literally instead of creating markup", async ({ page }) => {
  const sentinel = '</pre><img src="x" onerror="document.body.dataset.xss=1">';
  const uploads = await makeUploads({ seatBReason: sentinel });
  await page.goto("http://127.0.0.1:4179/");
  await page.getByLabel("本轮交接号").fill(CYCLE);
  await page.getByLabel("A 席 manifest pin").fill(PIN_A);
  await page.getByLabel("B 席 manifest pin").fill(PIN_B);
  await page.getByLabel("A 席完整回件").setInputFiles(uploads.a);
  await page.getByLabel("B 席完整回件").setInputFiles(uploads.b);
  await page.getByRole("button", { name: "校验并逐项并列" }).click();
  await expect(page.locator("pre").filter({ hasText: sentinel })).toHaveCount(1);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.xss ?? null)).toBeNull();
});

test("390x844 comparison flow has no page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4179/");
  await comparePair(page);
  await expect(page.getByRole("heading", { name: "机械并列完成" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  const firstDifference = page.locator('[data-classification="difference"]').first();
  await expect(firstDifference).toBeVisible();
  const boxes = await firstDifference.locator(".seat-value").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  }));
  expect(boxes.every((box) => box.left >= 0 && box.right <= 390)).toBe(true);
});
