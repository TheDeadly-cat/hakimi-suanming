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

test("四柱透干与藏干十神逐项可读，重复来源不合并计分", async ({ page }, testInfo) => {
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
  const occurrenceGroups = panel.locator(".ten-god-occurrence-review");
  const occurrenceItems = panel.locator(".ten-god-occurrence-item");

  await expect(occurrenceGroups).toHaveCount(4);
  await expect(occurrenceItems).toHaveCount(14);
  expect(await occurrenceGroups.evaluateAll((groups) => groups.map((group) => ({
    position: group.getAttribute("data-position"),
    count: group.getAttribute("data-occurrence-count"),
    overall: group.getAttribute("data-overall-good-bad"),
    open: (group as HTMLDetailsElement).open
  })))).toEqual([
    { position: "year", count: "3", overall: "null", open: false },
    { position: "month", count: "4", overall: "null", open: false },
    { position: "day", count: "3", overall: "null", open: false },
    { position: "hour", count: "4", overall: "null", open: false }
  ]);
  expect(await occurrenceItems.evaluateAll((items) => items.every((item) => (
    item.getAttribute("data-result") === "null"
    && item.getAttribute("data-overall-good-bad") === "null"
    && ["visible_stem", "hidden_stem_main", "hidden_stem_secondary"].includes(item.getAttribute("data-source") ?? "")
    && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.getAttribute("data-baseline-balance-direction") ?? "")
    && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.getAttribute("data-balance-direction") ?? "")
    && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(item.getAttribute("data-direction-stability") ?? "")
    && (item.getAttribute("data-direction-stability") !== "direction_sensitive" || item.getAttribute("data-balance-direction") === "conditional")
  )))).toBe(true);

  const yearGroup = occurrenceGroups.nth(0);
  await expect(yearGroup.locator("summary")).toContainText("查看本柱全部 3 项十神");
  await yearGroup.locator("summary").click();
  await expect(yearGroup).toHaveAttribute("open", "");
  const yearItems = yearGroup.locator(".ten-god-occurrence-item");
  await expect(yearItems).toHaveCount(3);
  await expect(yearItems.nth(0)).toContainText("乙透干 · 首屏焦点");
  await expect(yearItems.nth(0)).toContainText("偏财");
  await expect(yearItems.nth(1)).toContainText("亥藏壬（首位藏干） · 补充出现项");
  await expect(yearItems.nth(2)).toContainText("亥藏甲（第2藏干） · 补充出现项");
  await expect(yearItems.getByText(/result:null · overall:null/)).toHaveCount(3);

  const monthGroup = occurrenceGroups.nth(1);
  await expect(monthGroup.locator("summary")).toContainText("查看本柱全部 4 项十神");
  await monthGroup.locator("summary").click();
  await expect(monthGroup).toHaveAttribute("open", "");
  await expect(monthGroup.locator(".ten-god-occurrence-item")).toHaveCount(4);
  await expect(monthGroup.getByText(/旺衰账权重 6（工程候选）/)).toHaveCount(1);
  await expect(yearGroup.locator(":scope > p")).toContainText("首屏焦点只用于快速阅读，不代表必然最强");
  await expect(monthGroup.locator(":scope > p")).toContainText("首屏焦点只用于快速阅读，不代表必然最强");

  await page.getByText("查看规则版本、来源和未关闭边界", { exact: true }).click();
  await expect(page.getByRole("link", { name: "《渊海子平》· 天干地支暗藏总诀与地支藏遁歌" }))
    .toHaveAttribute("href", "https://ctext.org/wiki.pl?chapter=296619&if=gb&remap=gb");
  await expect(page.getByText("全柱出现项", { exact: true })).toBeVisible();
  await expect(page.getByText(/14 项/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const projectSlug = testInfo.project.name.replace(/[^a-z0-9_-]/gi, "-");
  await panel.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v011-occurrence-${projectSlug}-desktop.png`),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(yearItems.nth(0)).toBeVisible();
  await expect(monthGroup.locator(".ten-god-occurrence-item").nth(3)).toBeVisible();
  await panel.screenshot({
    path: path.join(os.tmpdir(), `hakimi-bazi-v011-occurrence-${projectSlug}-mobile.png`),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});
