import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  ACTIVE_CAPACITY_CASES as ACTIVE_CASES,
  ACTIVE_CAPACITY_FAVORITES as ACTIVE_FAVORITES,
  COMMON_CAPACITY_QUERY as COMMON_QUERY,
  EXPECTED_CAPACITY_SEED_STATS,
  LEGACY_V13_CAPACITY_DATABASE_NAME as DATABASE_NAME,
  MAX_RENDERED_CAPACITY_CASE_ROWS as MAX_RENDERED_CASE_ROWS,
  RARE_CAPACITY_ALIAS as RARE_ALIAS,
  RARE_CAPACITY_INDEX as RARE_INDEX,
  RARE_CAPACITY_QUERY as RARE_QUERY,
  TOTAL_CAPACITY_CASES as TOTAL_CASES,
  TRASHED_CAPACITY_CASES as TRASHED_CASES,
  deterministicCapacityCaseId as deterministicCaseId,
  deterministicCapacityRevisionId as deterministicRevisionId,
  readLegalCapacityCaseFixture as readLegalCaseFixture,
  seedLegacyV13CapacityCases as seedCapacityCases
} from "./case-library-capacity-helpers";
import {
  collectConsoleProblems,
  waitForAppReady
} from "./full-backup-helpers";

const CONTENT_RENDER_BUDGET_MS = 5_000;
const TARGET_INTERACTION_READY_BUDGET_MS = 5_000;
const READY_BUDGET_MS = 45_000;
const SEARCH_BUDGET_MS = 45_000;
const OPEN_BUDGET_MS = 20_000;

type CapacityMetrics = {
  seedMs?: number;
  readyMs?: number;
  contentRenderedMs?: number;
  interactionReadyMs?: number;
  interactionReadyWithinTarget?: boolean;
  contentWasInertBeforeBoot?: boolean;
  integrityBootReadyMs?: number;
  navigationMs?: number;
  mainVisibleMs?: number;
  skeletonGoneMs?: number;
  bootReadyMs?: number;
  navigationTiming?: {
    responseEnd: number;
    domInteractive: number;
    domContentLoadedEventEnd: number;
    loadEventEnd: number;
  } | null;
  commonSearchMs?: number;
  openMs?: number;
  initialRows?: number;
  commonSearchRows?: number;
  favoriteRows?: number;
  trashRows?: number;
  rareRows?: number;
};

async function expectRootNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: page.viewportSize()?.width, documentWidth: page.viewportSize()?.width });
}

async function waitForCapacityContentRendered(page: Page, timeout: number, startedAt: number) {
  await expect(page.locator("#main-content")).toBeVisible({ timeout });
  const mainVisibleMs = Date.now() - startedAt;
  await expect(page.locator(
    ".route-loading, .table-skeleton, .chart-loading, .research-loading, .transit-loading"
  )).toHaveCount(0, { timeout });
  const skeletonGoneMs = Date.now() - startedAt;
  return {
    mainVisibleMs,
    skeletonGoneMs
  };
}

async function waitForCapacityIntegrityBoot(page: Page, timeout: number) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.appBootReady),
    { timeout }
  ).toBe("true");
}

function caseRows(page: Page) {
  return page.locator("table.case-table tbody > tr");
}

async function expectToolbarCount(page: Page, count: number, timeout = SEARCH_BUDGET_MS) {
  const escapedCount = String(count).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  await expect(page.locator(".library-toolbar .status-pill")).toContainText(
    new RegExp(`(?:^|\\D)${escapedCount}(?:\\D|$)`, "u"),
    { timeout }
  );
}

async function expectBoundedRows(page: Page): Promise<number> {
  const count = await caseRows(page).count();
  expect(count, `案例库单页最多只能挂载 ${MAX_RENDERED_CASE_ROWS} 条数据行`).toBeLessThanOrEqual(
    MAX_RENDERED_CASE_ROWS
  );
  return count;
}

async function armSearchCycle(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.capacitySearchCycle = "waiting";
    const toolbar = document.querySelector(".library-toolbar");
    if (!toolbar) throw new Error("找不到案例库检索工具栏");
    const update = () => {
      const text = toolbar.textContent ?? "";
      const state = document.documentElement.dataset.capacitySearchCycle;
      if (text.includes("检索中")) {
        document.documentElement.dataset.capacitySearchCycle = "searching";
      } else if (state === "searching") {
        document.documentElement.dataset.capacitySearchCycle = "done";
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(update);
    observer.observe(toolbar, { childList: true, characterData: true, subtree: true });
    update();
  });
}

async function waitForSearchCycle(page: Page, timeout: number) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.capacitySearchCycle),
    { timeout }
  ).toBe("done");
}

async function attachMetrics(testInfo: TestInfo, metrics: CapacityMetrics) {
  const content = JSON.stringify(metrics, null, 2);
  await testInfo.attach("case-library-capacity-metrics.json", {
    body: Buffer.from(`${content}\n`, "utf8"),
    contentType: "application/json"
  });
  console.info(`[case-library-capacity] ${JSON.stringify(metrics)}`);
}

test("10,000 条正式案例保持查询、渲染与打开路径有界", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const consoleProblems = collectConsoleProblems(page);
  const metrics: CapacityMetrics = {};

  try {
    const fixture = await readLegalCaseFixture(page);
    const seedStartedAt = Date.now();
    const seed = await seedCapacityCases(page, fixture);
    metrics.seedMs = Date.now() - seedStartedAt;
    expect(seed).toEqual(EXPECTED_CAPACITY_SEED_STATS);

    await page.setViewportSize({ width: 1280, height: 820 });
    const readyStartedAt = Date.now();
    await page.goto("/cases", { waitUntil: "domcontentloaded" });
    metrics.navigationMs = Date.now() - readyStartedAt;
    Object.assign(metrics, await waitForCapacityContentRendered(
      page,
      CONTENT_RENDER_BUDGET_MS,
      readyStartedAt
    ));
    metrics.contentRenderedMs = metrics.skeletonGoneMs;
    expect(metrics.contentRenderedMs).toBeLessThanOrEqual(CONTENT_RENDER_BUDGET_MS);
    metrics.contentWasInertBeforeBoot = await page.evaluate(() => {
      const mainContent = document.querySelector("#main-content");
      return mainContent !== null && mainContent.closest("[inert]") !== null;
    });
    expect(metrics.contentWasInertBeforeBoot).toBe(true);
    await expectToolbarCount(page, ACTIVE_CASES, CONTENT_RENDER_BUDGET_MS);
    await expect(page.locator("table.case-table")).toBeVisible({ timeout: CONTENT_RENDER_BUDGET_MS });
    metrics.initialRows = await caseRows(page).count();
    expect(metrics.initialRows, `案例库单页最多只能挂载 ${MAX_RENDERED_CASE_ROWS} 条数据行`).toBeLessThanOrEqual(
      MAX_RENDERED_CASE_ROWS
    );
    expect(metrics.initialRows).toBeGreaterThan(0);
    await expectRootNoOverflow(page);

    await waitForCapacityIntegrityBoot(page, READY_BUDGET_MS);
    metrics.integrityBootReadyMs = Date.now() - readyStartedAt;
    metrics.bootReadyMs = metrics.integrityBootReadyMs;
    await expect.poll(() => page.evaluate(() => {
      const mainContent = document.querySelector("#main-content");
      return mainContent !== null && mainContent.closest("[inert]") === null;
    })).toBe(true);
    metrics.interactionReadyMs = Date.now() - readyStartedAt;
    metrics.interactionReadyWithinTarget =
      metrics.interactionReadyMs <= TARGET_INTERACTION_READY_BUDGET_MS;
    metrics.navigationTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return navigation ? {
        responseEnd: Math.round(navigation.responseEnd),
        domInteractive: Math.round(navigation.domInteractive),
        domContentLoadedEventEnd: Math.round(navigation.domContentLoadedEventEnd),
        loadEventEnd: Math.round(navigation.loadEventEnd)
      } : null;
    });
    metrics.readyMs = Date.now() - readyStartedAt;
    expect(metrics.readyMs).toBeLessThanOrEqual(READY_BUDGET_MS);

    const search = page.getByLabel("搜索案例与研究笔记");
    await armSearchCycle(page);
    const commonSearchStartedAt = Date.now();
    await search.fill(COMMON_QUERY);
    await waitForSearchCycle(page, SEARCH_BUDGET_MS);
    await expectToolbarCount(page, ACTIVE_CASES);
    metrics.commonSearchRows = await expectBoundedRows(page);
    metrics.commonSearchMs = Date.now() - commonSearchStartedAt;
    expect(metrics.commonSearchRows).toBeGreaterThan(0);
    expect(metrics.commonSearchMs).toBeLessThanOrEqual(SEARCH_BUDGET_MS);

    await page.getByRole("button", { name: "收藏", exact: true }).click();
    await expectToolbarCount(page, ACTIVE_FAVORITES);
    metrics.favoriteRows = await expectBoundedRows(page);
    expect(metrics.favoriteRows).toBeGreaterThan(0);

    await page.getByRole("button", { name: "回收站", exact: true }).click();
    await expectToolbarCount(page, TRASHED_CASES);
    metrics.trashRows = await expectBoundedRows(page);
    expect(metrics.trashRows).toBeGreaterThan(0);

    await page.getByRole("button", { name: "全部", exact: true }).click();
    await expectToolbarCount(page, ACTIVE_CASES);
    await armSearchCycle(page);
    await search.fill(RARE_QUERY);
    await waitForSearchCycle(page, SEARCH_BUDGET_MS);
    const rareRow = caseRows(page).filter({ hasText: RARE_ALIAS });
    await expect(rareRow).toHaveCount(1);
    metrics.rareRows = await caseRows(page).count();
    expect(metrics.rareRows).toBe(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectRootNoOverflow(page);
    await expect(rareRow).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 820 });
    await expectRootNoOverflow(page);

    const rareCaseId = deterministicCaseId(RARE_INDEX);
    const rareRevisionId = deterministicRevisionId(RARE_INDEX);
    const openStartedAt = Date.now();
    await rareRow.getByRole("link", { name: `打开 ${RARE_ALIAS}`, exact: true }).click();
    await page.waitForURL(`/cases/${rareCaseId}/revisions/${rareRevisionId}`, {
      timeout: OPEN_BUDGET_MS
    });
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: RARE_ALIAS, level: 1 })).toBeVisible();
    metrics.openMs = Date.now() - openStartedAt;
    expect(metrics.openMs).toBeLessThanOrEqual(OPEN_BUDGET_MS);
    expect(consoleProblems).toEqual([]);
  } finally {
    await attachMetrics(testInfo, metrics);
  }
});


