import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  MOBILE_VIEWPORT,
  clearAllLocalData,
  collectConsoleProblems,
  completeRestoreSafetyGate,
  disableNetworkCacheAndGoOffline,
  expectMobileNoOverflow,
  expectPartitionCount,
  expectPortableData,
  exportFullBackupZip,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedPortableData,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";

test("390px 首次打开数据页时可全程离线导出、清空并恢复完整 ZIP", async ({ context, page }) => {
  test.setTimeout(180_000);
  const consoleProblems = collectConsoleProblems(page);
  const fixture = portableFixture("离线首用");
  await page.setViewportSize(MOBILE_VIEWPORT);

  // Install and activate the complete PWA shell without visiting the lazy data
  // management route first. This proves the first route execution is offline.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  const cacheAudit = await page.evaluate(async () => {
    const resourcePaths = performance.getEntriesByType("resource")
      .map((entry) => new URL(entry.name).pathname);
    const cachedPaths = new Set<string>();
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith("hakimi-shell-")) continue;
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) cachedPaths.add(new URL(request.url).pathname);
    }
    return {
      dataPageExecuted: resourcePaths.some((pathname) => /\/data-management-page-[^/]+\.js$/.test(pathname)),
      dataPageCached: [...cachedPaths].some((pathname) => /\/data-management-page-[^/]+\.js$/.test(pathname)),
      fullBackupWorkerCached: [...cachedPaths].some((pathname) => /\/full-backup\.worker-[^/]+\.js$/.test(pathname)),
      shellCacheCount: (await caches.keys()).filter((name) => name.startsWith("hakimi-shell-")).length
    };
  });
  expect(cacheAudit).toEqual({
    dataPageExecuted: false,
    dataPageCached: true,
    fullBackupWorkerCached: true,
    shellCacheCount: 1
  });

  await disableNetworkCacheAndGoOffline(context, page);
  await openDataManagement(page);
  // The browser context remains network-offline across the service-worker
  // navigation, but Edge can create the new document with navigator.onLine
  // reset to true. Bind the new renderer's navigator state to the already
  // enforced offline transport before asserting or exercising the UI.
  const documentDevtools = await context.newCDPSession(page);
  await documentDevtools.send("Network.enable");
  await documentDevtools.send("Network.overrideNetworkState", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  // CDP offline emulation does not consistently re-emit the browser `offline`
  // event after a service-worker navigation. Dispatch the real event only after
  // proving navigator.onLine is false, so the UI hook observes the verified state.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText(/当前离线/)).toBeVisible();
  await expectMobileNoOverflow(page);

  await seedPortableData(page, fixture);
  await expectPortableData(page, fixture);
  const [exportWorker, { bytes }] = await Promise.all([
    page.waitForEvent("worker"),
    exportFullBackupZip(page)
  ]);
  expect(new URL(exportWorker.url()).pathname).toMatch(/\/full-backup\.worker-[^/]+\.js$/u);

  await clearAllLocalData(page);
  await expectPartitionCount(page, "研究者资料", 0);
  await expectPartitionCount(page, "应用设置", 0);
  await expectPartitionCount(page, "附件", 0);
  await expectPartitionCount(page, "规则包仓库", 0);

  const [preflightWorker] = await Promise.all([
    page.waitForEvent("worker"),
    preflightBackupZip(page, bytes, "offline-first-use-full-backup.zip")
  ]);
  expect(new URL(preflightWorker.url()).pathname).toMatch(/\/full-backup\.worker-[^/]+\.js$/u);
  await expectMobileNoOverflow(page);
  await completeRestoreSafetyGate(page);
  await expectPortableData(page, fixture);
  await expectMobileNoOverflow(page);

  const attachmentRegion = page.getByRole("region", { name: "附件库" });
  const attachmentDownloadPromise = page.waitForEvent("download");
  await attachmentRegion.getByRole("button", { name: "下载", exact: true }).click();
  const attachmentDownload = await attachmentDownloadPromise;
  expect(attachmentDownload.suggestedFilename()).toBe(fixture.attachmentName);
  expect(await attachmentDownload.failure()).toBeNull();
  const attachmentPath = await attachmentDownload.path();
  if (!attachmentPath) throw new Error("恢复后的附件下载路径不可用");
  expect(await readFile(attachmentPath)).toEqual(fixture.attachmentBytes);

  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(consoleProblems).toEqual([]);
});
