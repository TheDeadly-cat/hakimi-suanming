import os from "node:os";
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

test("神煞候选命中按四柱逐项直读，正式层与吉凶仍保持关闭", async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await createDemoChart(page);
  expect(await page.evaluate(() => typeof indexedDB)).toBe("object");
  const panel = page.locator(".bazi-interpretation-panel");
  const gate = panel.locator(".shensha-research-gate");

  await expect(gate).toContainText("当前修订的正式神煞层仍为关闭");
  await expect(gate.locator(".shensha-pillar-grid")).toHaveCount(0);
  await gate.getByRole("button", { name: "打开只读研究预览", exact: true }).click();

  await expect(gate.getByRole("heading", { name: "按四柱查看神煞命中" })).toBeVisible();
  const pillarGroups = gate.locator(".shensha-pillar-grid > article");
  const occurrenceItems = gate.locator(".shensha-pillar-hit");
  await expect(pillarGroups).toHaveCount(4);
  await expect(occurrenceItems).toHaveCount(2);
  expect(await pillarGroups.evaluateAll((groups) => groups.map((group) => ({
    position: group.getAttribute("data-position"),
    count: group.getAttribute("data-occurrence-count"),
    availability: group.getAttribute("data-availability"),
    overall: group.getAttribute("data-overall-good-bad"),
    result: group.getAttribute("data-result")
  })))).toEqual([
    { position: "year", count: "0", availability: "available", overall: "null", result: "null" },
    { position: "month", count: "1", availability: "available", overall: "null", result: "null" },
    { position: "day", count: "1", availability: "available", overall: "null", result: "null" },
    { position: "hour", count: "0", availability: "available", overall: "null", result: "null" }
  ]);
  expect(await occurrenceItems.evaluateAll((items) => items.every((item) => (
    item.getAttribute("data-review-status") === "candidate_pending_expert_review"
    && item.getAttribute("data-shensha-orientation") === "null"
    && item.getAttribute("data-overall-good-bad") === "null"
    && item.getAttribute("data-result") === "null"
  )))).toBe(true);

  const monthGroup = pillarGroups.nth(1);
  const dayGroup = pillarGroups.nth(2);
  const monthHit = monthGroup.locator(".shensha-pillar-hit");
  const dayHit = dayGroup.locator(".shensha-pillar-hit");
  await expect(monthHit).toContainText("天乙贵人");
  await expect(monthHit).toContainText("以年干乙取子、申；月柱甲申的地支申命中。");
  await expect(dayHit).toContainText("驿马");
  await expect(dayHit).toContainText("以年支亥取巳；日柱辛巳的地支巳命中。");
  await monthHit.locator(":scope > details > summary").click();
  await expect(monthHit.getByText(/导师、专业协助、程序资源和求助路径/)).toBeVisible();
  await expect(monthHit.getByText(/合参门：/)).toBeVisible();
  await expect(gate.getByText(/按柱投影 hakimi\.bazi\.shensha_occurrence_review\/0\.1\.0 · 2 项/)).toBeVisible();

  await expect(gate.locator(".shensha-hit-list > li")).toHaveCount(2);
  const synthesisReviews = gate.locator(".bazi-position-synthesis-review");
  await expect(synthesisReviews).toHaveCount(2);
  expect(await synthesisReviews.evaluateAll((reviews) => reviews.every((review) => (
    review.getAttribute("data-shensha-orientation") === "null"
    && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(review.getAttribute("data-ten-god-baseline-balance-direction") ?? "")
    && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(review.getAttribute("data-ten-god-balance-direction") ?? "")
    && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(review.getAttribute("data-ten-god-direction-stability") ?? "")
    && (review.getAttribute("data-ten-god-direction-stability") !== "direction_sensitive" || review.getAttribute("data-ten-god-balance-direction") === "conditional")
    && review.getAttribute("data-overall-result") === "null"
  )))).toBe(true);
  await expect(gate).toContainText("当前修订的正式神煞层仍为关闭");
  await expectNoHorizontalOverflow(page);

  const projectSlug = testInfo.project.name.replace(/[^a-z0-9_-]/gi, "-");
  await gate.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v011-synthesis-${projectSlug}-desktop.png`),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(monthHit).toBeVisible();
  await expect(dayHit).toBeVisible();
  await gate.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v011-synthesis-${projectSlug}-mobile.png`),
    animations: "disabled",
    style: ".mobile-topbar, .mobile-bottom-nav, .skip-link { visibility: hidden !important; }"
  });

  expect(consoleProblems).toEqual([]);
});
