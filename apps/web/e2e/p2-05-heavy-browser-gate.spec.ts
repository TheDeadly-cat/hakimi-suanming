import "fake-indexeddb/auto";

import { createFullBackupArchive, createFullBackupFromSnapshot } from "@hakimi/backup";
import type { ResearchCaseQuery } from "@hakimi/contracts";
import { executeResearchQuery, type ResearchQuerySnapshot } from "@hakimi/research-query";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  EXPECTED_CAPACITY_SEED_STATS,
  readLegalCapacityCaseFixture,
  seedLegacyV13CapacityCases
} from "./case-library-capacity-helpers";
import {
  collectConsoleProblems,
  expectPartitionCount,
  preflightBackupZip,
} from "./full-backup-helpers";
import {
  P2_05_CANDIDATE_COUNT,
  P2_05_LONG_NOTE_COUNT,
  P2_05_ADVANCED_AT_INSTANT,
  seedP205AdvancedPositiveCase,
  seedP205HeavyDataset
} from "../../../packages/storage/src/heavy-dataset-evidence.fixture.ts";

type HeavyResourceProbe = {
  storage: { usageBytes: number | null; quotaBytes: number | null } | null;
  memory: { usedJSHeapSizeBytes: number | null; totalJSHeapSizeBytes: number | null } | null;
  maxUsedJSHeapSizeBytes: number | null;
  longTasks: Array<{ durationMs: number; attribution: string | null }>;
};

async function installHeavyResourceProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as unknown as {
      __p205HeavyProbe?: HeavyResourceProbe & {
        observer?: PerformanceObserver;
      };
    };
    if (win.__p205HeavyProbe) return;
    const probe: HeavyResourceProbe & { observer?: PerformanceObserver } = {
      storage: null,
      memory: null,
      maxUsedJSHeapSizeBytes: null,
      longTasks: []
    };
    win.__p205HeavyProbe = probe;
    if (typeof PerformanceObserver !== "function") return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const raw = entry as unknown as {
            duration: number;
            attribution?: Array<{ name?: string }>;
          };
          probe.longTasks.push({
            durationMs: raw.duration,
            attribution: raw.attribution?.[0]?.name ?? null
          });
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
      probe.observer = observer;
    } catch {
      // longtask observation unavailable; keep the empty sample list.
    }
  });
}

async function refreshHeavyResourceProbe(page: Page): Promise<HeavyResourceProbe> {
  return page.evaluate(async () => {
    const win = window as unknown as {
      __p205HeavyProbe?: HeavyResourceProbe & { observer?: PerformanceObserver };
    };
    const probe = win.__p205HeavyProbe ?? {
      storage: null,
      memory: null,
      maxUsedJSHeapSizeBytes: null,
      longTasks: []
    };
    let storage: HeavyResourceProbe["storage"] = null;
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
    if (memory && typeof probe.maxUsedJSHeapSizeBytes === "number") {
      probe.maxUsedJSHeapSizeBytes = Math.max(probe.maxUsedJSHeapSizeBytes, memory.usedJSHeapSizeBytes);
    } else if (memory) {
      probe.maxUsedJSHeapSizeBytes = memory.usedJSHeapSizeBytes;
    }
    probe.storage = storage;
    probe.memory = memory;
    win.__p205HeavyProbe = probe;
    return {
      storage,
      memory,
      maxUsedJSHeapSizeBytes: probe.maxUsedJSHeapSizeBytes,
      longTasks: probe.longTasks
    };
  });
}

async function attachHeavyReport(
  testInfo: TestInfo,
  report: Record<string, unknown>
): Promise<void> {
  const content = JSON.stringify(report, null, 2);
  await testInfo.attach("p2-05-heavy-browser-gate.json", {
    body: Buffer.from(`${content}\n`, "utf8"),
    contentType: "application/json"
  });
  console.info(`[p2-05-heavy-browser-gate] ${JSON.stringify(report)}`);
}

async function buildHeavyBackupBytes(): Promise<Buffer> {
  const database = new ResearchDatabase(`p2-05-heavy-source-${crypto.randomUUID()}`, {
    targetSchema: 13,
    releaseWritesLocked: false
  });
  try {
    const cases = new CaseRepository(database);
    const research = new ResearchRepository(database);
    await seedP205HeavyDataset(cases, research);
    const payload = await cases.readFullDataSnapshot();
    const envelope = await createFullBackupFromSnapshot(payload, {
      appVersion: "0.2.0-p0"
    });
    return Buffer.from(createFullBackupArchive(envelope));
  } finally {
    database.close();
    await database.delete().catch(() => undefined);
  }
}

async function buildAdvancedPositiveBackupBytes(): Promise<{
  bytes: Buffer;
  caseId: string;
  ruleProfileDigest: string;
}> {
  const database = new ResearchDatabase(`p2-05-positive-source-${crypto.randomUUID()}`, {
    targetSchema: 13,
    releaseWritesLocked: false
  });
  try {
    const cases = new CaseRepository(database);
    const research = new ResearchRepository(database);
    const seeded = await seedP205AdvancedPositiveCase(cases, research);

    const full = await cases.readFullDataSnapshot();
    const snapshot: ResearchQuerySnapshot = {
      cases: full.cases,
      revisions: full.revisions,
      candidateSets: full.candidateSets,
      researchNotes: full.researchNotes,
      events: full.events,
      knowledgeDocuments: full.knowledgeDocuments,
      revisionCalculationReceiptLedgerStatus: "schema_unavailable",
      revisionCalculationReceipts: full.revisionCalculationReceipts
    };
    const query: ResearchCaseQuery = {
      version: 1,
      scope: "cases",
      text: "",
      lifecycle: "active",
      favorites: "any",
      revisionScope: "latest",
      caseTags: [],
      dayMasters: [],
      monthBranches: ["申"],
      relationTypes: ["branch_three_harmony"],
      ruleProfileDigests: [seeded.ruleProfileDigest],
      transit: {
        atInstant: P2_05_ADVANCED_AT_INSTANT,
        manualDirection: null,
        matches: [{ nodeType: "year", ganZhi: "乙巳", stemTenGod: "伤官" }]
      },
      events: {
        text: "",
        tags: ["事业"],
        feedbacks: ["supports"],
        lifecycle: "active",
        binding: "transit_node"
      },
      sort: { field: "updatedAt", direction: "desc" }
    };
    const execution = await executeResearchQuery(query, snapshot, {
      now: () => "2026-08-10T00:00:00.000Z"
    });
    if (execution.total !== 1) {
      throw new Error(`正向组合夹具存储级断言失败：预期 1 条命中，实际 ${execution.total}。`);
    }
    const matched = execution.results.some((result) => (
      result.scope === "cases" && result.caseId === seeded.caseId
    ));
    if (!matched) {
      throw new Error("正向组合夹具存储级断言失败：命中的不是预期案例。");
    }

    const envelope = await createFullBackupFromSnapshot(full, {
      appVersion: "0.2.0-p0"
    });
    return {
      bytes: Buffer.from(createFullBackupArchive(envelope)),
      caseId: seeded.caseId,
      ruleProfileDigest: seeded.ruleProfileDigest
    };
  } finally {
    database.close();
    await database.delete().catch(() => undefined);
  }
}

function buildLargeCsv(): Buffer {
  const headers = [
    "案例名",
    "历法",
    "出生日期",
    "出生时间",
    "时间精度",
    "IANA时区",
    "性别",
    "闰月",
    "地点",
    "纬度",
    "经度",
    "地点精度",
    "标签",
    "来源备注"
  ];
  const rows = Array.from({ length: 5_000 }, (_, index) => [
    `CSV取消案例${String(index + 1).padStart(4, "0")}`,
    "gregorian",
    "1990-01-01",
    "08:30",
    "exact_minute",
    "Asia/Shanghai",
    "未知",
    "false",
    "测试地点",
    "",
    "",
    "city",
    "",
    `取消预检负载备注 ${index + 1}：${"x".repeat(800)}`
  ]);
  const escape = (value: string): string => (
    /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value
  );
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return Buffer.from(`\ufeff${lines.join("\r\n")}`, "utf8");
}

async function openResearchQuery(page: Page): Promise<void> {
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await waitForHeavyReady(page);
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toBeVisible();
}

async function waitForHeavyReady(page: Page): Promise<void> {
  await expect(page.locator("#main-content")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(
    ".route-loading, .table-skeleton, .chart-loading, .research-loading, .transit-loading"
  )).toHaveCount(0, { timeout: 90_000 });
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.appBootReady),
    { timeout: 90_000 }
  ).toBe("true");
}

async function completeHeavyRestoreSafetyGate(page: Page): Promise<void> {
  const safetyDownload = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "先下载当前安全备份", exact: true }).click();
  const download = await safetyDownload;
  expect(download.suggestedFilename()).toMatch(/^hakimi-before-restore-\d{4}-\d{2}-\d{2}\.zip$/);
  await page.getByRole("checkbox", { name: /我已确认安全备份文件保存成功并可以打开/ })
    .check();
  await page.getByRole("checkbox", { name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/ })
    .check();
  const restoreButton = page.getByRole("button", { name: "确认替换并恢复", exact: true });
  await expect(restoreButton).toBeEnabled({ timeout: 30_000 });
  await restoreButton.click();
  await expect(page.getByRole("status").filter({ hasText: "完整恢复成功" }))
    .toBeVisible({ timeout: 120_000 });
}

async function runCandidateSetTextQuery(page: Page, text: string, expectedTotal: number): Promise<string> {
  await page.getByRole("radio", { name: /候选组/ }).check();
  await page.getByPlaceholder("输入简体中文关键词；空格分隔的词全部满足").fill(text);
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await expect(page.getByRole("heading", {
    name: `候选组 · ${expectedTotal} 条结果`
  })).toBeVisible({ timeout: 60_000 });
  const digest = await page.locator(".research-result-summary dl dd code").nth(2).textContent();
  if (!digest) throw new Error("研究查询结果摘要不可读。");
  return digest.trim();
}

async function runAdvancedCaseQuery(
  page: Page,
  expectedTotal: number
): Promise<{ total: number; digest: string }> {
  await page.getByRole("radio", { name: /正式命盘/ }).check();
  await page.getByPlaceholder("输入简体中文关键词；空格分隔的词全部满足").fill("");
  const advanced = page.locator("details.research-query-advanced");
  if (await advanced.getAttribute("open") === null) {
    await advanced.locator("summary").click();
  }

  await page.getByRole("checkbox", { name: "申", exact: true }).check();
  await page.getByRole("checkbox", { name: "地支三合", exact: true }).check();
  await page.getByRole("checkbox", { name: /传统子平工作默认/ }).check();

  await page.getByRole("checkbox", { name: "启用运限组合条件" }).check();
  await page.getByLabel("目标瞬时点（UTC）").fill("2025-03-12T04:00");
  await page.getByRole("checkbox", { name: "流年", exact: true }).check();
  await page.getByLabel("流年干支").fill("乙巳");
  await page.getByLabel("流年天干十神").fill("伤官");

  await page.getByRole("checkbox", { name: "要求同一条事件满足以下条件" }).check();
  await page.getByLabel("事件标签").fill("事业");
  await page.getByRole("checkbox", { name: "支持", exact: true }).check();
  await page.getByLabel("绑定范围").selectOption("transit_node");

  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  const heading = page.getByRole("heading", {
    name: `正式命盘 · ${expectedTotal} 条结果`
  });
  await expect(heading).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("运限条件仍是工程计算：当前专家验证案例为 0", { exact: false }))
    .toBeVisible({ timeout: 30_000 });
  const total = Number((await heading.textContent())?.match(/\d+/u)?.[0] ?? "0");
  const digest = await page.locator(".research-result-summary dl dd code").nth(2).textContent();
  if (!digest) throw new Error("组合条件研究查询结果摘要不可读。");
  return { total, digest: digest.trim() };
}

test("真实浏览器恢复 CandidateSet-heavy + 长备注数据后完成复杂查询并记录资源探针", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const consoleProblems = collectConsoleProblems(page);
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    candidateCount: P2_05_CANDIDATE_COUNT,
    longNoteCount: P2_05_LONG_NOTE_COUNT,
    completed: false
  };
  try {
    const bytes = await buildHeavyBackupBytes();
    report.backupBytes = bytes.byteLength;

    await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
    await waitForHeavyReady(page);
    await installHeavyResourceProbe(page);
    await preflightBackupZip(page, bytes, "p2-05-heavy.zip");
    const list = page.getByRole("list", { name: "十六分区恢复差异" });
    await expect(list.getByRole("listitem").filter({ hasText: "未知时辰候选组" }))
      .toContainText(String(P2_05_CANDIDATE_COUNT));
    await completeHeavyRestoreSafetyGate(page);
    await expectPartitionCount(page, "未知时辰候选组", P2_05_CANDIDATE_COUNT);
    await expectPartitionCount(page, "研究笔记", P2_05_LONG_NOTE_COUNT);
    await expectPartitionCount(page, "命盘案例", 1);

    await openResearchQuery(page);
    const firstDigest = await runCandidateSetTextQuery(page, "候选组", P2_05_CANDIDATE_COUNT);
    const secondDigest = await runCandidateSetTextQuery(page, "候选组", P2_05_CANDIDATE_COUNT);
    expect(secondDigest).toBe(firstDigest);
    report.candidateQueryDigest = firstDigest;

    const multiKeywordFirst = await runCandidateSetTextQuery(page, "候选组 重载", P2_05_CANDIDATE_COUNT);
    const multiKeywordSecond = await runCandidateSetTextQuery(page, "候选组 重载", P2_05_CANDIDATE_COUNT);
    expect(multiKeywordSecond).toBe(multiKeywordFirst);
    report.multiKeywordQueryDigest = multiKeywordFirst;

    await runCandidateSetTextQuery(page, "候选组 不存在词", 0);
    report.negativeKeywordQuery = "0";

    await page.getByRole("radio", { name: /正式命盘/ }).check();
    await page.getByPlaceholder("输入简体中文关键词；空格分隔的词全部满足").fill("长备注案例");
    await page.getByRole("button", { name: "应用筛选", exact: true }).click();
    await expect(page.getByRole("heading", { name: "正式命盘 · 1 条结果" }))
      .toBeVisible({ timeout: 60_000 });
    const caseDigest = await page.locator(".research-result-summary dl dd code").nth(2).textContent();
    report.caseQueryDigest = caseDigest?.trim() ?? null;

    const advancedFirst = await runAdvancedCaseQuery(page, 0);
    const advancedSecond = await runAdvancedCaseQuery(page, 0);
    expect(advancedSecond.digest).toBe(advancedFirst.digest);
    expect(advancedSecond.total).toBe(advancedFirst.total);
    report.advancedQueryDigest = advancedFirst.digest;
    report.advancedQueryTotal = advancedFirst.total;

    const probe = await refreshHeavyResourceProbe(page);
    report.probe = probe;
    report.longTaskCount = probe.longTasks.length;
    report.maxLongTaskMs = probe.longTasks.length
      ? Math.max(...probe.longTasks.map((sample) => sample.durationMs))
      : null;
    report.completed = true;

    expect(consoleProblems).toEqual([]);
    expect(report.completed).toBe(true);
  } finally {
    await attachHeavyReport(testInfo, report);
  }
});

test("10,000 条数据真实浏览器导出完整 ZIP 时可取消且不写入任何结果", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const consoleProblems = collectConsoleProblems(page);
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    completed: false
  };
  try {
    const fixture = await readLegalCapacityCaseFixture(page);
    const seedStartedAt = Date.now();
    const seed = await seedLegacyV13CapacityCases(page, fixture);
    report.seedMs = Date.now() - seedStartedAt;
    expect(seed).toEqual(EXPECTED_CAPACITY_SEED_STATS);

    await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
    await waitForHeavyReady(page);
    await installHeavyResourceProbe(page);
    const downloadPromise = page.waitForEvent("download", { timeout: 8_000 })
      .then(() => "download" as const, () => "none" as const);
    await page.getByRole("button", { name: "导出完整 ZIP", exact: true }).click();
    await page.getByRole("button", { name: "取消生成", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "已取消完整备份生成" }))
      .toBeVisible({ timeout: 30_000 });
    expect(await downloadPromise).toBe("none");

    await expectPartitionCount(page, "命盘案例", 10_000);
    await expectPartitionCount(page, "命盘修订", 10_000);
    const probe = await refreshHeavyResourceProbe(page);
    report.probe = probe;
    report.longTaskCount = probe.longTasks.length;
    report.maxLongTaskMs = probe.longTasks.length
      ? Math.max(...probe.longTasks.map((sample) => sample.durationMs))
      : null;
    report.completed = true;

    expect(consoleProblems).toEqual([]);
    expect(report.completed).toBe(true);
  } finally {
    await attachHeavyReport(testInfo, report);
  }
});

test("5,000 行 CSV 预检可在真实浏览器取消且零写入", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const consoleProblems = collectConsoleProblems(page);
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    completed: false
  };
  try {
    const csv = buildLargeCsv();
    report.csvBytes = csv.byteLength;

    await page.goto("/cases", { waitUntil: "domcontentloaded" });
    await waitForHeavyReady(page);
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "选择 CSV", exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "p2-05-cancel-preflight.csv",
      mimeType: "text/csv",
      buffer: csv
    });

    const preflightButton = page.getByRole("button", { name: "按此映射预检", exact: true });
    await expect(preflightButton).toBeEnabled({ timeout: 60_000 });
    await preflightButton.click();
    const cancelStartedAt = Date.now();
    await page.getByRole("button", { name: "取消预检", exact: true }).click({ timeout: 30_000 });
    report.cancelClickMs = Date.now() - cancelStartedAt;

    await expect(page.getByRole("status").filter({ hasText: "已取消预检；没有写入任何案例。" }))
      .toBeVisible({ timeout: 30_000 });

    await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
    await waitForHeavyReady(page);
    await expectPartitionCount(page, "命盘案例", 0);
    await expectPartitionCount(page, "未知时辰候选组", 0);
    report.completed = true;

    expect(consoleProblems).toEqual([]);
    expect(report.completed).toBe(true);
  } finally {
    await attachHeavyReport(testInfo, report);
  }
});

test("正向命中：组合条件浏览器查询精确命中构造案例且摘要稳定", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const consoleProblems = collectConsoleProblems(page);
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    completed: false
  };
  try {
    const { bytes, caseId, ruleProfileDigest } = await buildAdvancedPositiveBackupBytes();
    report.backupBytes = bytes.byteLength;
    report.ruleProfileDigest = ruleProfileDigest;

    await page.goto("/settings/data", { waitUntil: "domcontentloaded" });
    await waitForHeavyReady(page);
    await installHeavyResourceProbe(page);
    await preflightBackupZip(page, bytes, "p2-05-positive.zip");
    await completeHeavyRestoreSafetyGate(page);
    await expectPartitionCount(page, "命盘案例", 1);
    await expectPartitionCount(page, "事件", 1);

    await openResearchQuery(page);
    const first = await runAdvancedCaseQuery(page, 1);
    const second = await runAdvancedCaseQuery(page, 1);
    expect(second.digest).toBe(first.digest);
    expect(first.total).toBe(1);
    report.positiveQueryDigest = first.digest;
    report.positiveQueryTotal = first.total;

    const probe = await refreshHeavyResourceProbe(page);
    report.probe = probe;
    report.longTaskCount = probe.longTasks.length;
    report.maxLongTaskMs = probe.longTasks.length
      ? Math.max(...probe.longTasks.map((sample) => sample.durationMs))
      : null;
    report.completed = true;

    expect(caseId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(consoleProblems).toEqual([]);
    expect(report.completed).toBe(true);
  } finally {
    await attachHeavyReport(testInfo, report);
  }
});
