import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
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
  const summary = page.locator(".interpretation-entry-summary");
  await expect(summary).toHaveAttribute("data-first-read-version", "hakimi.bazi.first_read_review/0.1.0");
  await expect(summary).toHaveAttribute("data-selected-primary-theme", "null");
  await expect(summary).toHaveAttribute("data-overall-good-bad", "null");
  await expect(summary).toHaveAttribute("data-result", "null");
  await expect(summary.locator(":scope > .bazi-first-read-steps > li")).toHaveCount(4);
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

test("主题索引钻取既有证据并导出 69 项未裁决审稿清单", async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await createDemoChart(page);
  await expect(page.getByRole("heading", { name: "旺衰与十神解读" })).toBeVisible();
  expect(await page.evaluate(() => typeof indexedDB)).toBe("object");

  const panel = page.locator(".bazi-interpretation-panel");
  const firstRead = panel.locator(".bazi-first-read-review");
  await expect(firstRead).toHaveAttribute("data-first-read-version", "hakimi.bazi.first_read_review/0.1.0");
  await expect(firstRead).toHaveAttribute("data-order-policy", "fixed_not_ranked");
  await expect(firstRead).toHaveAttribute("data-selected-primary-theme", "null");
  await expect(firstRead).toHaveAttribute("data-expert-first-read-verdict", "null");
  await expect(firstRead).toHaveAttribute("data-overall-good-bad", "null");
  await expect(firstRead).toHaveAttribute("data-result", "null");
  const firstReadSteps = firstRead.locator(":scope > .bazi-first-read-steps > li");
  await expect(firstReadSteps).toHaveCount(4);
  expect(await firstReadSteps.evaluateAll((steps) => steps.map((step) => ({
    order: step.getAttribute("data-order"),
    id: step.getAttribute("data-step-id"),
    availability: step.getAttribute("data-availability"),
    primary: step.getAttribute("data-selected-primary-theme"),
    overall: step.getAttribute("data-overall-good-bad"),
    result: step.getAttribute("data-result")
  })))).toEqual([
    { order: "1", id: "strength_confidence", availability: "available", primary: "null", overall: "null", result: "null" },
    { order: "2", id: "pillar_ten_gods", availability: "available", primary: "null", overall: "null", result: "null" },
    { order: "3", id: "repeated_ten_gods", availability: "available", primary: "null", overall: "null", result: "null" },
    { order: "4", id: "shensha_gate", availability: "not_requested", primary: "null", overall: "null", result: "null" }
  ]);
  await expect(firstRead.getByText("默认关闭 · 待主动打开", { exact: true })).toBeVisible();
  await expect(firstRead.getByText(/selected primary:null · expert verdict:null · overall:null · result:null/)).toBeVisible();
  const themeIndex = panel.getByRole("navigation", { name: "按柱位钻取现有内容" });
  await expect(themeIndex).toHaveAttribute("data-theme-index-version", "hakimi.bazi.theme_index_review/0.1.0");
  await expect(themeIndex).toHaveAttribute("data-filter-policy", "temporary_client_side_visibility_only");
  await expect(themeIndex).toHaveAttribute("data-ordering-policy", "fixed_pillar_order_not_ranked");
  await expect(themeIndex).toHaveAttribute("data-active-filter", "all");
  await expect(themeIndex).toHaveAttribute("data-visible-theme-count", "5");
  await expect(themeIndex).toHaveAttribute("data-selected-primary-theme", "null");
  await expect(themeIndex).toHaveAttribute("data-expert-theme-verdict", "null");
  await expect(themeIndex).toHaveAttribute("data-ranking", "null");
  await expect(themeIndex).toHaveAttribute("data-overall-good-bad", "null");
  await expect(themeIndex).toHaveAttribute("data-result", "null");
  const themeCards = themeIndex.locator(":scope > .bazi-theme-index-list > li");
  await expect(themeCards).toHaveCount(5);
  expect(await themeCards.evaluateAll((items) => items.map((item) => ({
    order: item.getAttribute("data-order"),
    id: item.getAttribute("data-theme-id"),
    availability: item.getAttribute("data-availability"),
    primary: item.getAttribute("data-selected-primary-theme"),
    rank: item.getAttribute("data-rank"),
    score: item.getAttribute("data-score"),
    overall: item.getAttribute("data-overall-good-bad"),
    result: item.getAttribute("data-result")
  })))).toEqual([
    { order: "1", id: "year", availability: "available", primary: "null", rank: "null", score: "null", overall: "null", result: "null" },
    { order: "2", id: "month", availability: "available", primary: "null", rank: "null", score: "null", overall: "null", result: "null" },
    { order: "3", id: "day", availability: "available", primary: "null", rank: "null", score: "null", overall: "null", result: "null" },
    { order: "4", id: "hour", availability: "available", primary: "null", rank: "null", score: "null", overall: "null", result: "null" },
    { order: "5", id: "shensha", availability: "not_requested", primary: "null", rank: "null", score: "null", overall: "null", result: "null" }
  ]);
  await expect(themeIndex.getByRole("link", { name: "先看旺衰因素账" })).toHaveAttribute("href", "#bazi-strength-ledger");
  const allFilter = themeIndex.getByRole("button", { name: "全部", exact: true });
  const monthFilter = themeIndex.getByRole("button", { name: "月柱", exact: true });
  const shenshaFilter = themeIndex.getByRole("button", { name: "神煞", exact: true });
  await expect(allFilter).toHaveAttribute("aria-pressed", "true");
  await monthFilter.click();
  await expect(monthFilter).toHaveAttribute("aria-pressed", "true");
  await expect(themeIndex).toHaveAttribute("data-active-filter", "month");
  await expect(themeIndex).toHaveAttribute("data-visible-theme-count", "1");
  await expect(themeCards).toHaveCount(1);
  await expect(themeCards).toHaveAttribute("data-theme-id", "month");
  await themeIndex.getByRole("link", { name: "查看月柱证据", exact: true }).click();
  await page.waitForURL(/#bazi-ten-god-month$/);
  await expect(page.locator("#bazi-ten-god-month")).toBeInViewport();
  await shenshaFilter.click();
  await expect(themeIndex).toHaveAttribute("data-active-filter", "shensha");
  await expect(themeCards).toHaveCount(1);
  await expect(themeCards).toHaveAttribute("data-availability", "not_requested");
  await themeIndex.getByRole("link", { name: "前往显式入口", exact: true }).click();
  await page.waitForURL(/#bazi-shensha-gate$/);
  await expect(page.getByRole("button", { name: "打开只读研究预览", exact: true })).toBeInViewport();
  await expect(page.getByRole("heading", { name: "本盘神煞命中事实" })).toHaveCount(0);
  await allFilter.click();
  await expect(themeIndex).toHaveAttribute("data-active-filter", "all");
  await expect(themeCards).toHaveCount(5);
  const readings = page.getByRole("list", { name: "四柱十神位置解读" });
  const cards = readings.locator(":scope > article");
  const cardHeaderDirections = readings.locator(":scope > article > header .status-pill");
  await expect(cards).toHaveCount(4);
  await expect(readings.locator(':scope > article[data-overall-good-bad="null"]')).toHaveCount(4);
  await expect(cardHeaderDirections.filter({ hasText: /六场景分歧：条件性/ })).toHaveCount(4);
  await expect(cardHeaderDirections.filter({ hasText: /当前取向：(?:偏有利|需警惕)/ })).toHaveCount(0);
  expect(await cards.evaluateAll((items) => items.every((item) => (
    ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.getAttribute("data-baseline-balance-direction") ?? "")
    && item.getAttribute("data-balance-direction") === "conditional"
    && item.getAttribute("data-direction-stability") === "direction_sensitive"
    && item.getAttribute("data-overall-good-bad") === "null"
  )))).toBe(true);

  const firstReview = cards.first().locator(".ten-god-orientation-review");
  await firstReview.getByText("查看 4 道喜忌复核门", { exact: true }).click();
  await expect(firstReview).toHaveAttribute("open", "");
  for (const label of ["格局与救应", "寒暖燥湿", "合化与生克链", "运限引动"]) {
    await expect(firstReview.getByText(`${label} · 未评估`, { exact: true })).toBeVisible();
  }
  await expect(firstReview.getByText("综合喜忌：null · 事件结果：null · 不评分", { exact: true })).toBeVisible();

  const sensitivity = panel.locator(".strength-sensitivity-review");
  await expect(sensitivity).toHaveAttribute("data-expert-verdict", "null");
  await expect(sensitivity).toHaveAttribute("data-selected-official-scenario", "null");
  await expect(sensitivity).toHaveAttribute("data-overall-good-bad", "null");
  await sensitivity.getByText("查看旺衰判定敏感性", { exact: true }).click();
  await expect(sensitivity).toHaveAttribute("open", "");
  await expect(sensitivity.getByText("月令主气重复计权已检出", { exact: true })).toBeVisible();
  const scenarios = sensitivity.locator(".strength-scenario-grid > article");
  await expect(scenarios).toHaveCount(6);
  await expect(sensitivity.locator('[data-official-rule-candidate="false"][data-overall-good-bad="null"]')).toHaveCount(6);
  const tenGodSensitivityItems = sensitivity.locator(".ten-god-sensitivity-matrix li");
  expect(await tenGodSensitivityItems.count()).toBeGreaterThan(0);
  expect(await tenGodSensitivityItems.evaluateAll((items) => items.every((item) => (
    item.getAttribute("data-direction-stability") === "direction_sensitive"
    && item.getAttribute("data-effective-balance-direction") === "conditional"
    && item.getAttribute("data-selected-official-scenario") === "null"
    && item.getAttribute("data-overall-good-bad") === "null"
  )))).toBe(true);
  await expect(sensitivity.getByText(/selected official:null · expert orientation:null · overall:null · result:null/)).toBeVisible();
  await expect(sensitivity.getByRole("heading", { name: "需要命理专家裁决的 4 个问题" })).toBeVisible();
  await expect(sensitivity.locator(".strength-expert-review-questions li")).toHaveCount(4);
  await expect(sensitivity.getByText(/official:null · expert verdict:null · overall:null · result:null/)).toBeVisible();

  const reviewQueue = panel.locator(".bazi-content-review-queue");
  await expect(reviewQueue).toHaveAttribute("data-review-queue-version", "hakimi.bazi.content_review_queue/0.1.0");
  await expect(reviewQueue).toHaveAttribute("data-workflow-mode", "read_only_export_only");
  await expect(reviewQueue).toHaveAttribute("data-total-count", "69");
  await expect(reviewQueue).toHaveAttribute("data-unresolved-count", "69");
  await expect(reviewQueue).toHaveAttribute("data-approved-count", "0");
  await expect(reviewQueue).toHaveAttribute("data-revised-count", "0");
  await expect(reviewQueue).toHaveAttribute("data-rejected-count", "0");
  await expect(reviewQueue).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(reviewQueue).toHaveAttribute("data-formal-activation-allowed", "false");
  await expect(reviewQueue.getByRole("heading", { name: "内容质量审稿台" })).toBeVisible();
  await expect(reviewQueue.locator(".bazi-content-review-summary > article")).toHaveCount(4);
  expect(await reviewQueue.locator(".bazi-content-review-summary > article").evaluateAll((items) => (
    items.map((item) => [item.getAttribute("data-category"), item.querySelector("span")?.textContent])
  ))).toEqual([
    ["strength_method", "4 未裁决 · 0 已批准"],
    ["ten_god_position", "40 未裁决 · 0 已批准"],
    ["shensha_rule", "5 未裁决 · 0 已批准"],
    ["shensha_position", "20 未裁决 · 0 已批准"]
  ]);
  const reviewGroups = reviewQueue.locator(".bazi-content-review-groups > details");
  await expect(reviewGroups).toHaveCount(4);
  const strengthGroup = reviewGroups.filter({ has: page.locator('summary strong:text-is("旺衰方法")') });
  await strengthGroup.locator(":scope > summary").click();
  await expect(strengthGroup).toHaveAttribute("open", "");
  const strengthReviewItems = strengthGroup.locator(":scope > ol > li");
  await expect(strengthReviewItems).toHaveCount(4);
  expect(await strengthReviewItems.evaluateAll((items) => items.every((item) => (
    item.getAttribute("data-decision") === "unresolved"
    && item.getAttribute("data-reviewer") === "null"
    && item.getAttribute("data-reviewed-at") === "null"
    && item.getAttribute("data-result") === "null"
    && item.getAttribute("data-expert-truth-claimed") === "false"
    && item.getAttribute("data-formal-activation-allowed") === "false"
  )))).toBe(true);

  const downloadPromise = page.waitForEvent("download");
  await reviewQueue.getByRole("button", { name: "导出 69 项审稿清单 JSON", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hakimi-bazi-content-review-queue-v017.json");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const exportedQueue = JSON.parse(await readFile(downloadedPath!, "utf8"));
  expect(exportedQueue.profile).toMatchObject({
    projectionVersion: "hakimi.bazi.content_review_queue/0.1.0",
    formalActivationAllowed: false,
    expertTruthClaimed: false
  });
  expect(exportedQueue.counts).toEqual({ total: 69, unresolved: 69, approve: 0, revise: 0, reject: 0 });
  expect(exportedQueue.items).toHaveLength(69);
  expect(exportedQueue.items.every((item: Record<string, unknown>) => (
    item.decision === "unresolved"
    && item.reviewer === null
    && item.reviewedAt === null
    && item.result === null
  ))).toBe(true);
  await expect(reviewQueue.getByText(/已请求浏览器下载.*只读未裁决快照/)).toBeVisible();

  await page.getByText("查看规则版本、来源和未关闭边界", { exact: true }).click();
  const reviewSource = page.getByRole("link", { name: "《子平真诠评注》· 用神成败救应与气候" });
  await expect(reviewSource).toHaveAttribute("href", "https://ctext.org/wiki.pl?chapter=974137&if=gb");
  await expectNoHorizontalOverflow(page);

  const projectSlug = testInfo.project.name.replace(/[^a-z0-9_-]/gi, "-");
  await panel.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v014-${projectSlug}-desktop.png`),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(cards).toHaveCount(4);
  await expect(cardHeaderDirections.first()).toBeVisible();
  await expect(reviewQueue.locator(".bazi-content-review-summary > article").first()).toBeVisible();
  await panel.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v014-${projectSlug}-mobile.png`),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});
