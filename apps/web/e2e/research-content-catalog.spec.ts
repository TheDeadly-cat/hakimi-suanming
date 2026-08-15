import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .table-skeleton, .chart-loading")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "帮助与安全边界" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
}

test("跨术数内容总目录只开放八字入口，并保留来源与零批准边界", async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto("/help", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByText("Dexie 13", { exact: true })).toBeVisible();

  const catalog = page.getByRole("region", { name: "跨术数内容总目录" });
  await expect(catalog).toBeVisible();
  await expect(catalog).toHaveAttribute("data-catalog-profile", "hakimi.research.content_catalog/0.1.0");
  await expect(catalog).toHaveAttribute("data-source-mode", "active_bazi_live_isolated_drafts_static_audit");
  await expect(catalog).toHaveAttribute("data-runtime-import-policy", "isolated_draft_imports_forbidden");
  await expect(catalog).toHaveAttribute("data-navigation-policy", "no_draft_runtime_entry");
  await expect(catalog).toHaveAttribute("data-scoring-allowed", "false");
  await expect(catalog).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(catalog).toHaveAttribute("data-formal-activation-allowed", "false");
  await expect(catalog.getByText("3 体系 · 0 专家批准", { exact: true })).toBeVisible();

  const cards = catalog.locator(".research-content-catalog-card");
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((items) => items.map((item) => ({
    id: item.getAttribute("data-system-id"),
    state: item.getAttribute("data-catalog-state"),
    reachable: item.getAttribute("data-runtime-reachable"),
    entry: item.getAttribute("data-entry-href"),
    approved: item.getAttribute("data-expert-approved-count"),
    published: item.getAttribute("data-formal-published-count"),
    truth: item.getAttribute("data-expert-truth-claimed"),
    activation: item.getAttribute("data-formal-activation-allowed"),
    score: item.getAttribute("data-good-bad-score"),
    result: item.getAttribute("data-result")
  })))).toEqual([
    {
      id: "bazi", state: "live_active", reachable: "true", entry: "/",
      approved: "0", published: "0", truth: "false", activation: "false", score: "null", result: "null"
    },
    {
      id: "ziwei-doushu", state: "static_isolated_snapshot", reachable: "false", entry: "none",
      approved: "0", published: "0", truth: "false", activation: "false", score: "null", result: "null"
    },
    {
      id: "western-astrology", state: "static_isolated_snapshot", reachable: "false", entry: "none",
      approved: "0", published: "0", truth: "false", activation: "false", score: "null", result: "null"
    }
  ]);

  const bazi = catalog.locator('[data-system-id="bazi"]');
  await expect(bazi.getByText("69", { exact: true })).toBeVisible();
  await expect(bazi.getByText("10", { exact: true })).toBeVisible();
  await expect(bazi.getByRole("link", { name: "进入八字研究工作台" })).toHaveAttribute("href", "/");

  const ziwei = catalog.locator('[data-system-id="ziwei-doushu"]');
  await expect(ziwei.getByText("246", { exact: true })).toBeVisible();
  await expect(ziwei.getByText("11", { exact: true })).toBeVisible();
  await expect(ziwei.locator(".research-content-catalog-entry")).toHaveCount(0);
  await ziwei.getByText("查看证据文档路径", { exact: true }).click();
  await expect(ziwei.locator("details.research-content-catalog-evidence")).toHaveAttribute("open", "");
  await expect(ziwei.locator("details code")).toHaveCount(5);

  const western = catalog.locator('[data-system-id="western-astrology"]');
  await expect(western.getByText("43", { exact: true })).toBeVisible();
  await expect(western.getByText("31", { exact: true })).toBeVisible();
  await expect(western.locator(".research-content-catalog-entry")).toHaveCount(0);
  await expect(western.getByRole("link", { name: /Limits of Interpretation/ }))
    .toHaveAttribute("href", "https://www.astro.com/astrowiki/en/Limits_of_Interpretation");

  const sourceLinks = catalog.locator(".research-content-catalog-sources a");
  await expect(sourceLinks).toHaveCount(13);
  expect(await sourceLinks.evaluateAll((links) => links.every((link) => (
    link.getAttribute("href")?.startsWith("https://") && link.getAttribute("target") === "_blank"
  )))).toBe(true);
  expect(await catalog.locator("a").evaluateAll((links) => links.every((link) => (
    !/4218|4219/.test(link.getAttribute("href") ?? "")
  )))).toBe(true);
  await expectNoHorizontalOverflow(page);

  const projectSlug = testInfo.project.name.replace(/[^a-z0-9_-]/gi, "-");
  await catalog.screenshot({
    path: path.join(os.tmpdir(), `hakimi-v018-content-catalog-${projectSlug}-desktop.png`),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(catalog).toBeVisible();
  expect(await cards.evaluateAll((items) => items.every((item) => {
    const rect = item.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
  }))).toBe(true);
  await catalog.screenshot({
    path: path.join(os.tmpdir(), `hakimi-v018-content-catalog-${projectSlug}-mobile.png`),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});
