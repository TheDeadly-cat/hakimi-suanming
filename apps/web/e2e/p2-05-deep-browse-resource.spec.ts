import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  EXPECTED_CAPACITY_SEED_STATS,
  RARE_CAPACITY_INDEX,
  deterministicCapacityCaseId,
  deterministicCapacityRevisionId,
  readLegalCapacityCaseFixture,
  seedLegacyV13CapacityCases
} from "./case-library-capacity-helpers";
import { collectConsoleProblems } from "./full-backup-helpers";

type DeepBrowseStep = {
  step: string;
  url: string;
  longTasks: number;
  maxLongTaskMs: number | null;
};

type DeepBrowseResourceReport = {
  startedAt: string;
  seedMs: number;
  steps: DeepBrowseStep[];
  storage: { usageBytes: number | null; quotaBytes: number | null } | null;
  memory: { usedJSHeapSizeBytes: number | null; totalJSHeapSizeBytes: number | null } | null;
  longTaskTotal: number;
  longTaskMaxMs: number | null;
  consoleProblems: string[];
  completed: boolean;
};

async function installDeepBrowseProbe(page: Page) {
  await page.evaluate(() => {
    const probe = { longTasks: [] as Array<{ duration: number; attribution: string | null }> };
    const win = window as unknown as {
      __deepBrowseProbe: typeof probe;
      __deepBrowseObserver?: PerformanceObserver;
    };
    win.__deepBrowseProbe = probe;
    if (typeof PerformanceObserver !== "function") return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const raw = entry as unknown as {
            duration: number;
            attribution?: Array<{ name?: string }>;
          };
          probe.longTasks.push({
            duration: raw.duration,
            attribution: raw.attribution?.[0]?.name ?? null
          });
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
      win.__deepBrowseObserver = observer;
    } catch {
      // longtask observation unavailable; the report records zero samples.
    }
  });
}

async function readDeepBrowseProbe(page: Page): Promise<{
  longTasks: Array<{ duration: number; attribution: string | null }>;
  storage: { usageBytes: number | null; quotaBytes: number | null } | null;
  memory: { usedJSHeapSizeBytes: number | null; totalJSHeapSizeBytes: number | null } | null;
}> {
  return page.evaluate(async () => {
    const win = window as unknown as {
      __deepBrowseProbe?: { longTasks: Array<{ duration: number; attribution: string | null }> };
    };
    const longTasks = win.__deepBrowseProbe?.longTasks ?? [];
    let storage: { usageBytes: number | null; quotaBytes: number | null } | null = null;
    try {
      const estimate = await navigator.storage?.estimate?.();
      storage = {
        usageBytes: typeof estimate?.usage === "number" ? estimate.usage : null,
        quotaBytes: typeof estimate?.quota === "number" ? estimate.quota : null
      };
    } catch {
      // Storage estimate unavailable; record nulls.
    }
    const rawMemory = (performance as unknown as {
      memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
    }).memory;
    const memory = rawMemory && typeof rawMemory.usedJSHeapSize === "number" && typeof rawMemory.totalJSHeapSize === "number"
      ? { usedJSHeapSizeBytes: rawMemory.usedJSHeapSize, totalJSHeapSizeBytes: rawMemory.totalJSHeapSize }
      : null;
    return { longTasks, storage, memory };
  });
}

async function waitForDeepBrowseReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(
    ".route-loading, .table-skeleton, .chart-loading, .research-loading, .transit-loading"
  )).toHaveCount(0, { timeout: 60_000 });
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.appBootReady),
    { timeout: 60_000 }
  ).toBe("true");
}

async function deepBrowseStep(
  page: Page,
  label: string,
  goto: (page: Page) => Promise<unknown>,
  report: DeepBrowseResourceReport
) {
  await goto(page);
  await waitForDeepBrowseReady(page);
  const probe = await readDeepBrowseProbe(page);
  const durations = probe.longTasks.map((sample) => sample.duration);
  report.steps.push({
    step: label,
    url: page.url(),
    longTasks: durations.length,
    maxLongTaskMs: durations.length ? Math.max(...durations) : null
  });
  if (durations.length) {
    report.longTaskTotal += durations.length;
    report.longTaskMaxMs = Math.max(report.longTaskMaxMs ?? 0, ...durations);
  }
}

async function attachDeepBrowseReport(testInfo: TestInfo, report: DeepBrowseResourceReport) {
  const content = JSON.stringify(report, null, 2);
  await testInfo.attach("p2-05-deep-browse-resource.json", {
    body: Buffer.from(`${content}\n`, "utf8"),
    contentType: "application/json"
  });
  console.info(`[p2-05-deep-browse] ${JSON.stringify(report)}`);
}

test("10,000 条数据连续深翻时记录 long task 与资源探针", async ({ page }, testInfo) => {
  test.setTimeout(480_000);
  const consoleProblems = collectConsoleProblems(page);
  const report: DeepBrowseResourceReport = {
    startedAt: new Date().toISOString(),
    seedMs: 0,
    steps: [],
    storage: null,
    memory: null,
    longTaskTotal: 0,
    longTaskMaxMs: null,
    consoleProblems,
    completed: false
  };

  try {
    const fixture = await readLegalCapacityCaseFixture(page);
    const seedStartedAt = Date.now();
    const seed = await seedLegacyV13CapacityCases(page, fixture);
    report.seedMs = Date.now() - seedStartedAt;
    expect(seed).toEqual(EXPECTED_CAPACITY_SEED_STATS);

    await page.setViewportSize({ width: 1280, height: 820 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForDeepBrowseReady(page);
    await installDeepBrowseProbe(page);

    const commonCaseId = deterministicCapacityCaseId(0);
    const commonRevisionId = deterministicCapacityRevisionId(0);
    const rareCaseId = deterministicCapacityCaseId(RARE_CAPACITY_INDEX);
    const rareRevisionId = deterministicCapacityRevisionId(RARE_CAPACITY_INDEX);

    await deepBrowseStep(page, "工作台", (p) => p.goto("/", { waitUntil: "domcontentloaded" }), report);
    await deepBrowseStep(page, "案例库", (p) => p.goto("/cases", { waitUntil: "domcontentloaded" }), report);
    await deepBrowseStep(
      page,
      "打开常规案例",
      (p) => p.goto(`/cases/${commonCaseId}/revisions/${commonRevisionId}`, { waitUntil: "domcontentloaded" }),
      report
    );
    await deepBrowseStep(page, "返回案例库", (p) => p.goBack(), report);
    await deepBrowseStep(
      page,
      "打开稀有案例",
      (p) => p.goto(`/cases/${rareCaseId}/revisions/${rareRevisionId}`, { waitUntil: "domcontentloaded" }),
      report
    );
    await deepBrowseStep(page, "设置", (p) => p.goto("/settings", { waitUntil: "domcontentloaded" }), report);
    await deepBrowseStep(page, "数据管理", (p) => p.goto("/settings/data", { waitUntil: "domcontentloaded" }), report);
    await deepBrowseStep(page, "帮助", (p) => p.goto("/help", { waitUntil: "domcontentloaded" }), report);

    const finalProbe = await readDeepBrowseProbe(page);
    report.storage = finalProbe.storage;
    report.memory = finalProbe.memory;
    report.completed = true;

    expect(consoleProblems).toEqual([]);
    expect(report.steps.length).toBeGreaterThanOrEqual(8);
    expect(report.completed).toBe(true);
  } finally {
    await attachDeepBrowseReport(testInfo, report);
  }
});
