import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const DEMO_ALIAS = "演示案例 · 辰时研究";
const DEMO_LOCATION = "北京（演示值）";
const EXPECTED_PILLARS = ["乙亥", "甲申", "辛巳", "壬辰"] as const;

test("断网后精确修订仍可导出匿名 Markdown、2× PNG 并调用打印入口", async ({ context, page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    ready: document.documentElement.dataset.swReady,
    controlled: Boolean(navigator.serviceWorker.controller),
    bootSignalSent: document.documentElement.dataset.swBootSignalSent
  }))).toEqual({ ready: "true", controlled: true, bootSignalSent: "true" });

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);

  const chartUrl = new URL(page.url());
  const revisionRoute = chartUrl.pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  expect(revisionRoute).not.toBeNull();
  const [, caseId, revisionId] = revisionRoute!;
  const researchUrl = `${chartUrl.origin}${chartUrl.pathname}?view=research`;

  await page.goto(researchUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: DEMO_ALIAS })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出单盘 Markdown", exact: true })).toBeVisible();

  const cacheAudit = await page.evaluate(async () => {
    const shellCacheNames = (await caches.keys()).filter((name) => name.startsWith("hakimi-shell-"));
    const cachedPaths = new Set<string>();
    for (const cacheName of shellCacheNames) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) cachedPaths.add(new URL(request.url).pathname);
    }

    const researchChunk = [...cachedPaths].find((pathname) =>
      /^\/assets\/research-journal-[^/]+\.js$/.test(pathname)
    ) ?? null;
    let htmlToImageChunk: string | null = null;
    let htmlToImageSignaturePresent = false;
    if (researchChunk) {
      const response = await caches.match(new URL(researchChunk, location.origin).toString());
      const source = response ? await response.text() : "";
      const dependencies = [...source.matchAll(/import\("(\.\/[^\"]+\.js)"\)/g)]
        .map((match) => new URL(match[1], new URL(researchChunk, location.origin)).pathname);
      for (const dependency of dependencies) {
        const dependencyResponse = await caches.match(new URL(dependency, location.origin).toString());
        const dependencySource = dependencyResponse ? await dependencyResponse.text() : "";
        if (dependencySource.includes("foreignObject") && dependencySource.includes("toBlob")) {
          htmlToImageChunk = dependency;
          htmlToImageSignaturePresent = true;
          break;
        }
      }
    }

    return {
      shellCacheNames,
      cachedPaths: [...cachedPaths].sort(),
      researchChunk,
      htmlToImageChunk,
      htmlToImageSignaturePresent
    };
  });
  expect(cacheAudit.shellCacheNames).toHaveLength(1);
  expect(cacheAudit.researchChunk).toMatch(/^\/assets\/research-journal-[^/]+\.js$/);
  expect(cacheAudit.htmlToImageChunk).toMatch(/^\/assets\/[^/]+\.js$/);
  expect(cacheAudit.cachedPaths).toContain(cacheAudit.htmlToImageChunk!);
  expect(cacheAudit.htmlToImageSignaturePresent).toBe(true);

  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
  await devtools.send("Network.clearBrowserCache");
  await context.setOffline(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: DEMO_ALIAS })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "导出单盘 Markdown", exact: true })).toBeVisible();

  await page.evaluate(() => {
    const deliveryProbe = window as Window & {
      __e2eChosenFile?: { filename: string; type: string; text: string };
      __e2eSharedFile?: { filename: string; type: string; text: string; title: string | null };
    };
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: async (options?: { suggestedName?: string }) => ({
        kind: "file",
        name: options?.suggestedName ?? "report.md",
        async createWritable() {
          return {
            async write(blob: Blob) {
              deliveryProbe.__e2eChosenFile = {
                filename: options?.suggestedName ?? "report.md",
                type: blob.type,
                text: await blob.text()
              };
            },
            async close() {},
            async abort() {}
          };
        }
      })
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data: ShareData) => data.files?.length === 1
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        if (!file) throw new Error("E2E 分享探针没有收到文件");
        deliveryProbe.__e2eSharedFile = {
          filename: file.name,
          type: file.type,
          text: await file.text(),
          title: data.title ?? null
        };
      }
    });
  });

  await page.getByRole("button", { name: "导出单盘 Markdown", exact: true }).click();
  const deliveryDialog = page.getByRole("dialog", { name: "文件已在本机生成" });
  await expect(deliveryDialog).toBeVisible();
  const deliveryLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }));
  expect(deliveryLayout.documentWidth).toBeLessThanOrEqual(deliveryLayout.viewport);

  const markdownDownloadPromise = page.waitForEvent("download");
  await deliveryDialog.getByRole("button", { name: "下载文件", exact: true }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toBe("hakimi-chart-r1-anonymous.md");
  expect(await markdownDownload.failure()).toBeNull();
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).not.toBeNull();
  const markdown = await readFile(markdownPath!, "utf8");
  expect(markdown).toContain("# 八字单盘研究报告");
  expect(markdown).toContain("1995-08-18");
  expect(markdown).toContain("出生日期、出生时间和时区仍可能用于重新识别个人");
  for (const pillar of EXPECTED_PILLARS) expect(markdown).toContain(pillar);
  for (const sensitiveValue of [DEMO_ALIAS, DEMO_LOCATION, "39.9042", "116.4074", caseId, revisionId]) {
    expect(markdown).not.toContain(sensitiveValue);
  }

  await deliveryDialog.getByRole("button", { name: "保存到指定位置", exact: true }).click();
  await expect(deliveryDialog.getByRole("status")).toContainText("已由当前平台确认写入");
  expect(await page.evaluate(() => (
    window as Window & { __e2eChosenFile?: unknown }
  ).__e2eChosenFile)).toEqual({
    filename: "hakimi-chart-r1-anonymous.md",
    type: "text/markdown;charset=utf-8",
    text: markdown
  });

  await deliveryDialog.getByRole("button", { name: "系统分享", exact: true }).click();
  await expect(deliveryDialog.getByRole("status")).toContainText("已交给系统分享面板");
  expect(await page.evaluate(() => (
    window as Window & { __e2eSharedFile?: unknown }
  ).__e2eSharedFile)).toEqual({
    filename: "hakimi-chart-r1-anonymous.md",
    type: "text/markdown;charset=utf-8",
    text: markdown,
    title: "匿名单盘 Markdown"
  });
  await deliveryDialog.getByRole("button", { name: "关闭文件交付", exact: true }).click();

  await page.getByRole("button", { name: "预览 PNG / PDF", exact: true }).click();
  const reportDialog = page.getByRole("dialog", { name: "单盘报告预览 · 第 1 版 · 最新" });
  await expect(reportDialog).toBeVisible();

  const pngDownloadPromise = page.waitForEvent("download");
  await reportDialog.getByRole("button", { name: "下载摘要 PNG", exact: true }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("hakimi-chart-r1-anonymous-summary.png");
  expect(await pngDownload.failure()).toBeNull();
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
  const png = await readFile(pngPath!);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(2160);
  expect(png.readUInt32BE(20)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.e2ePrintCalled = "true";
    };
  });
  await reportDialog.getByRole("button", { name: "打印 / 保存 PDF", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-e2e-print-called", "true");
  await expect(page.getByText("已打开系统打印窗口；请选择“另存为 PDF”。", { exact: true })).toBeVisible();

  expect(consoleProblems).toEqual([]);
});
