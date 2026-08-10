import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const TARGET_INSTANT = "2026-08-02T09:15:00.000Z";

type ExactCase = {
  alias: string;
  sourceNote: string;
  location: string;
  latitude: string;
  longitude: string;
  caseId: string;
  revisionId: string;
};

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(
    ".route-loading, .dashboard-skeleton, .table-skeleton, .chart-loading, .center-loading"
  )).toHaveCount(0);
}

async function waitForServiceWorker(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    ready: document.documentElement.dataset.swReady,
    controlled: Boolean(navigator.serviceWorker.controller),
    bootSignalSent: document.documentElement.dataset.swBootSignalSent
  }))).toEqual({ ready: "true", controlled: true, bootSignalSent: "true" });
}

async function createExactCase(
  page: Page,
  input: Omit<ExactCase, "caseId" | "revisionId"> & { date: string; time: string }
): Promise<ExactCase> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await waitForServiceWorker(page);

  await page.getByLabel(/案例别名/).fill(input.alias);
  await page.getByLabel("资料来源说明").fill(input.sourceNote);
  await page.getByRole("button", { name: "下一步", exact: true }).click();

  await page.getByLabel(/出生日期/).fill(input.date);
  await page.getByLabel(/民用时间/).fill(input.time);
  await page.getByLabel("地点标签").fill(input.location);
  await page.getByLabel("纬度").fill(input.latitude);
  await page.getByLabel("经度").fill(input.longitude);
  await page.getByRole("button", { name: "下一步", exact: true }).click();

  await expect(page.getByRole("heading", { name: "确认时间基准与换日规则" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);

  const route = new URL(page.url()).pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  expect(route).not.toBeNull();
  return { ...input, caseId: route![1], revisionId: route![2] };
}

function exactPairPath(subjectA: ExactCase, subjectB: ExactCase): string {
  const params = new URLSearchParams();
  params.append("item", `revision:${subjectA.caseId}:${subjectA.revisionId}`);
  params.append("item", `revision:${subjectB.caseId}:${subjectB.revisionId}`);
  params.set("at", TARGET_INSTANT);
  return `/compare/pair?${params.toString()}`;
}

async function expectCompletePairProjection(page: Page) {
  const matrix = page.getByRole("region", { name: "双案例事实字段并列表" });
  await expect(matrix).toBeVisible();
  await expect(matrix.locator("tbody tr[data-field-id]")).toHaveCount(96);
  const transit = page.getByRole("region", { name: "双案例同一瞬时点六层运限并列表" });
  await expect(transit).toBeVisible();
  await expect(transit.locator("tbody tr[data-field-id]")).toHaveCount(7);
}

test("断网后精确双案例仍可首次生成匿名报告与显式完整审计 JSON", async ({ context, page }) => {
  test.setTimeout(180_000);
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const subjectA = await createExactCase(page, {
    alias: "离线双案例甲-ALIAS-SENTINEL",
    sourceNote: "离线双案例甲-SOURCE-NOTE-SENTINEL",
    location: "离线双案例甲-LOCATION-SENTINEL",
    latitude: "31.2304",
    longitude: "121.4737",
    date: "1995-08-18",
    time: "23:30"
  });
  const subjectB = await createExactCase(page, {
    alias: "离线双案例乙-ALIAS-SENTINEL",
    sourceNote: "离线双案例乙-SOURCE-NOTE-SENTINEL",
    location: "离线双案例乙-LOCATION-SENTINEL",
    latitude: "35.6762",
    longitude: "139.6503",
    date: "1996-03-09",
    time: "09:26"
  });

  const exactPath = exactPairPath(subjectA, subjectB);
  await page.goto(exactPath, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await waitForServiceWorker(page);
  await expectCompletePairProjection(page);
  await expect(page.getByText(TARGET_INSTANT, { exact: true })).toBeVisible();
  const exportRegion = page.getByRole("region", { name: "导出确切双案例研究工件" });
  await expect(exportRegion.getByRole("button", { name: "导出匿名双案例 Markdown" })).toBeVisible();

  const projectionHash = (await page.locator(".pair-evidence-footer code").first().textContent())?.trim();
  expect(projectionHash).toMatch(/^[a-f0-9]{64}$/);

  const cacheAudit = await page.evaluate(async () => {
    const shellCacheNames = (await caches.keys()).filter((name) => name.startsWith("hakimi-shell-"));
    const javascriptEntries: Array<{ path: string; source: string }> = [];
    for (const cacheName of shellCacheNames) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const path = new URL(request.url).pathname;
        if (!path.endsWith(".js")) continue;
        const response = await cache.match(request);
        javascriptEntries.push({ path, source: response ? await response.text() : "" });
      }
    }
    return {
      shellCacheNames,
      pairPageChunk: javascriptEntries.find((entry) => /pair-research-page-[^/]+\.js$/.test(entry.path))?.path ?? null,
      exportChunk: javascriptEntries.find((entry) =>
        entry.source.includes("pair_structure_anonymous_markdown") &&
        entry.source.includes("pair_structure_full_audit_json")
      )?.path ?? null
    };
  });
  expect(cacheAudit.shellCacheNames).toHaveLength(1);
  expect(cacheAudit.pairPageChunk).toMatch(/^\/assets\/pair-research-page-[^/]+\.js$/);
  expect(cacheAudit.exportChunk).toMatch(/^\/assets\/[^/]+\.js$/);

  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
  await devtools.send("Network.clearBrowserCache");
  await context.setOffline(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page).toHaveURL(new RegExp(`${exactPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  // Edge can create the service-worker-served document with navigator.onLine
  // reset to true even though the browser context still blocks all transport.
  // Rebind the new renderer to the already-enforced offline state, then emit
  // the browser event so the product hook observes that verified state.
  const documentDevtools = await context.newCDPSession(page);
  await documentDevtools.send("Network.enable");
  await documentDevtools.send("Network.overrideNetworkState", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText(/当前离线/)).toBeVisible();
  await expectCompletePairProjection(page);
  await expect(page.getByRole("combobox", { name: "对象甲案例" })).toHaveValue(subjectA.caseId);
  await expect(page.getByRole("combobox", { name: "对象甲修订" })).toHaveValue(subjectA.revisionId);
  await expect(page.getByRole("combobox", { name: "对象乙案例" })).toHaveValue(subjectB.caseId);
  await expect(page.getByRole("combobox", { name: "对象乙修订" })).toHaveValue(subjectB.revisionId);
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: 390, documentWidth: 390 });

  await exportRegion.getByRole("button", { name: "导出匿名双案例 Markdown" }).click();
  const deliveryDialog = page.getByRole("dialog", { name: "文件已在本机生成" });
  await expect(deliveryDialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: 390, documentWidth: 390 });
  const markdownDownloadPromise = page.waitForEvent("download");
  await deliveryDialog.getByRole("button", { name: "下载文件", exact: true }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toBe(
    "hakimi-pair-a-r1-b-r1-at-20260802t091500z-anonymous.md"
  );
  expect(await markdownDownload.failure()).toBeNull();
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).not.toBeNull();
  const markdown = await readFile(markdownPath!, "utf8");
  for (const retained of [
    "# 双案例结构研究匿名报告",
    "## 对象甲 · R1",
    "## 对象乙 · R1",
    TARGET_INSTANT,
    "participant_facts_only",
    "pillar.year.ganZhi",
    "pillar.hour.ganZhi",
    "仍可能指向具体个人"
  ]) expect(markdown).toContain(retained);
  for (const sensitive of [
    subjectA.alias,
    subjectB.alias,
    subjectA.sourceNote,
    subjectB.sourceNote,
    subjectA.location,
    subjectB.location,
    subjectA.latitude,
    subjectA.longitude,
    subjectB.latitude,
    subjectB.longitude,
    subjectA.caseId,
    subjectB.caseId,
    subjectA.revisionId,
    subjectB.revisionId,
    projectionHash!,
    "传统子平工作默认",
    "nodeId",
    "resultHash",
    "differenceCount"
  ]) expect(markdown).not.toContain(sensitive);

  await deliveryDialog.getByRole("button", { name: "关闭文件交付", exact: true }).click();
  await expect(deliveryDialog).toBeHidden();

  await exportRegion.getByText("完整审计 JSON（敏感）", { exact: true }).click();
  const fullButton = exportRegion.getByRole("button", { name: "导出完整审计 JSON" });
  await expect(fullButton).toBeDisabled();
  const confirmation = exportRegion.getByRole("checkbox", {
    name: /我确认这是包含两位对象可识别资料的完整审计文件/
  });
  await confirmation.check();
  await expect(fullButton).toBeEnabled();
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: 390, documentWidth: 390 });

  const fullDownloadPromise = page.waitForEvent("download");
  await fullButton.click();
  const fullDownload = await fullDownloadPromise;
  expect(fullDownload.suggestedFilename()).toBe(
    `hakimi-pair-a-r1-b-r1-${projectionHash!.slice(0, 12)}-full-audit.json`
  );
  expect(await fullDownload.failure()).toBeNull();
  const fullPath = await fullDownload.path();
  expect(fullPath).not.toBeNull();
  const fullEnvelope = JSON.parse(await readFile(fullPath!, "utf8"));
  expect(fullEnvelope.kind).toBe("pair_structure_full_audit_envelope");
  expect(fullEnvelope.privacy).toBe("full_sensitive");
  expect(fullEnvelope.sensitiveDataIncluded).toBe(true);
  expect(fullEnvelope.projectionResultHash).toBe(projectionHash);
  expect(fullEnvelope.privacyWarning).toContain("完整审计 JSON 包含两个案例");
  const fullProjection = fullEnvelope.projection;
  expect(fullProjection.kind).toBe("pair_structure_research_projection");
  expect(fullProjection.targetInstant).toBe(TARGET_INSTANT);
  expect(fullProjection.manifest.resultHash).toBe(projectionHash);
  expect(fullProjection.manifest.semanticBoundary).toBe("participant_facts_only");
  expect(fullProjection.manifest.scoreIncluded).toBe(false);
  expect(fullProjection.manifest.compatibilityIncluded).toBe(false);
  expect(fullProjection.manifest.crossChartDerivationIncluded).toBe(false);
  expect(fullProjection.participants.map((participant: Record<string, any>) => ({
    role: participant.role,
    caseId: participant.item.caseId,
    revisionId: participant.item.revision.id,
    alias: participant.item.caseAlias,
    sourceNote: participant.item.revision.input.sourceNote,
    location: participant.item.revision.input.location.label,
    observationCount: participant.observations.length,
    transitStatus: participant.transit.status
  }))).toEqual([
    {
      role: "A",
      caseId: subjectA.caseId,
      revisionId: subjectA.revisionId,
      alias: subjectA.alias,
      sourceNote: subjectA.sourceNote,
      location: subjectA.location,
      observationCount: 96,
      transitStatus: "resolved"
    },
    {
      role: "B",
      caseId: subjectB.caseId,
      revisionId: subjectB.revisionId,
      alias: subjectB.alias,
      sourceNote: subjectB.sourceNote,
      location: subjectB.location,
      observationCount: 96,
      transitStatus: "resolved"
    }
  ]);
  await expect(confirmation).not.toBeChecked();
  await expect(fullButton).toBeDisabled();
  await expect(exportRegion.getByRole("status")).toContainText("再次导出前需要重新确认");
  expect(consoleProblems).toEqual([]);
});
