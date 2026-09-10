import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, type CDPSession, type Page, type TestInfo } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import { canonicalStringify } from "@hakimi/integrity";
import { createDemoCase, waitForAppReady, waitForServiceWorker } from "./full-backup-helpers.ts";
import {
  captureStorageV13NativeReadonlySnapshot,
  STORAGE_V13_PHYSICAL_STORE_NAMES, type StorageV13NativeReadonlySnapshot
} from "./storage-v13-native-readonly.ts";
import { requireReleaseBrowserRuntimeProduct } from "./release-browser-persistent-context.ts";

import { artifactWorkspaceRoot as repository, verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact.ts";
import type { ReleaseArtifactIdentityLock } from "../../../scripts/release-artifact-identity-lib.mjs";
const origin = "http://127.0.0.1:4197";
const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)), contentType: "application/json"
  });
}

async function nativeSnapshot(page: Page, testInfo: TestInfo, phase: string) {
  const snapshot = await captureStorageV13NativeReadonlySnapshot(page, {
    captureId: testInfo.project.name + "-" + phase, operationId: "export", phase
  });
  await attachJson(testInfo, phase, snapshot);
  expect(snapshot.physicalVersion).toBe(130);
  expect(snapshot.dexieVersion).toBe(13);
  expect(snapshot.transactionMode).toBe("readonly");
  expect(snapshot.storeNames).toEqual([...STORAGE_V13_PHYSICAL_STORE_NAMES].sort());
  return snapshot;
}

function assertSourceUnchanged(before: StorageV13NativeReadonlySnapshot, after: StorageV13NativeReadonlySnapshot) {
  expect(after.databaseName).toBe(before.databaseName);
  expect(after.physicalVersion).toBe(before.physicalVersion);
  expect(after.dexieVersion).toBe(before.dexieVersion);
  expect(after.storeNames).toEqual(before.storeNames);
  expect(after.stores).toEqual(before.stores);
  expect(after.semanticWitness).toEqual(before.semanticWitness);
  expect(after.snapshotDigest).toBe(before.snapshotDigest);
}

async function assertArtifactBinding(page: Page, expected: LockedDefaultV13Artifact, ready: boolean) {
  const observed = await page.evaluate(() => {
    const meta = (name: string) => document.querySelector('meta[name="' + name + '"]')?.getAttribute("content");
    return {
      evidenceId: meta("hakimi-release-evidence-id"),
      buildVersion: meta("hakimi-build-version"),
      descriptor: JSON.parse(meta("hakimi-release-database") ?? "null"),
      generation: document.documentElement.dataset.dbGeneration,
      schema: document.documentElement.dataset.dbSchema,
      bootReady: document.documentElement.dataset.appBootReady
    };
  });
  expect(observed).toEqual({
    evidenceId: expected.evidenceId, buildVersion: expected.buildVersion,
    descriptor: expected.descriptor, generation: "legacy-v13", schema: "13",
    bootReady: String(ready)
  });
}

test("真实 UI 创建的 v13 案例在路由启动失败后经正式只读接口导出，全部原表和版本不变", async ({ page, context }, testInfo) => {
  const expectedArtifact = await verifyLockedDefaultV13Artifact();
  await attachJson(testInfo, "locked-artifact-before", expectedArtifact);
  const lockBytes = await readFile(path.join(repository, "tmp/release-artifact-identity.json"));
  expect(sha256(lockBytes)).toBe(expectedArtifact.lockFileSha256);
  const artifactLock = JSON.parse(lockBytes.toString("utf8")) as ReleaseArtifactIdentityLock;
  expect(artifactLock.evidenceId).toBe(expectedArtifact.evidenceId);
  const routeAssets = artifactLock.files.filter(file => /^assets\/research-query-page-[^/]+\.js$/.test(file.path));
  expect(routeAssets).toHaveLength(1);
  const routeAssetUrl = new URL(routeAssets[0].path, origin + "/").href;
  const observations: Array<Record<string, unknown>> = [];
  const unexpected: Array<Record<string, unknown>> = [];
  const abortedAssets = new Set<string>();
  let session: CDPSession | undefined;
  let phase = "seed";
  const matchesAbortedAsset = (text: string) => [...abortedAssets].some(url => text.includes(url));
  const record = (entry: Record<string, unknown>, isExpected: boolean) => {
    const observation = { phase, ...entry, expected: isExpected };
    observations.push(observation);
    if (!isExpected) unexpected.push(observation);
  };

  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin) {
      record({ kind: "external-request", url: url.href }, false);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("console", message => {
    if (message.type() !== "warning" && message.type() !== "error") return;
    const text = message.text();
    const location = message.location();
    const expectedAssetFailure = phase !== "seed" && (
      (abortedAssets.has(location.url) && /^Failed to load resource: net::ERR_FAILED$/.test(text))
      || (matchesAbortedAsset(text) && /Failed to fetch dynamically imported module|error loading dynamically imported module|应用启动自检失败/.test(text))
    );
    record({ kind: "console", level: message.type(), text, location }, expectedAssetFailure);
  });
  page.on("pageerror", error => {
    record({ kind: "pageerror", text: error.message, stack: error.stack },
      phase !== "seed" && matchesAbortedAsset(error.message)
      && /Failed to fetch dynamically imported module|error loading dynamically imported module/.test(error.message));
  });
  page.on("requestfailed", request => {
    const failure = request.failure()?.errorText ?? "unknown";
    record({ kind: "requestfailed", url: request.url(), failure },
      phase !== "seed" && abortedAssets.has(request.url()) && failure === "net::ERR_FAILED");
  });

  try {
    session = await context.newCDPSession(page);
    const version = await session.send("Browser.getVersion");
    const runtimeProduct = requireReleaseBrowserRuntimeProduct(testInfo.project.name, version.product);
    await attachJson(testInfo, "runtime-and-scope", {
      runtimeProduct, project: testInfo.project.name, artifact: expectedArtifact,
      flow: "UI create -> controlled route asset abort -> readonly ZIP -> byte/content verification",
      browserPath: "Repository Playwright CLI",
      serviceWorkers: "real-controlled-startup-then-CDP-network-bypass-for-route-fault",
      syntheticFailure: "Only the exact locked current-artifact route asset is aborted",
      routeAsset: { url: routeAssetUrl, ...routeAssets[0] },
      databaseRecordsSeededViaNativeIDB: false,
      wholeOriginWriteLockVerified: false,
      oldV13ArtifactVerified: false,
      crossSchemaNoBackwriteVerified: false,
      formalReleaseEvidenceReceipt: false
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await createDemoCase(page);
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    await assertArtifactBinding(page, expectedArtifact, true);
    const routeMatch = new URL(page.url()).pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
    expect(routeMatch).not.toBeNull();
    if (!routeMatch) throw new Error("The saved case did not expose its Case/Revision route.");
    const caseId = routeMatch[1];
    const revisionId = routeMatch[2];
    const before = await nativeSnapshot(page, testInfo, "before-recovery");
    expect(before.semanticWitness.cases).toHaveLength(1);
    expect(before.semanticWitness.revisions).toHaveLength(1);
    expect(before.semanticWitness.cases[0]).toMatchObject({
      caseIdDigest: sha256(caseId), latestRevisionIdDigest: sha256(revisionId),
      revisionCount: 1, lifecycleState: "active"
    });
    expect(before.semanticWitness.revisions[0]).toMatchObject({
      revisionIdDigest: sha256(revisionId), caseIdDigest: sha256(caseId), revisionNumber: 1
    });
    await page.screenshot({ path: testInfo.outputPath("created-case.png"), fullPage: false });
    expect(unexpected, "Seed phase must be clean").toEqual([]);

    phase = "route-fault";
    await session.send("Network.enable");
    await session.send("Network.setBypassServiceWorker", { bypass: true });
    observations.push({ phase, kind: "service-worker-network-bypass", bypass: true, expected: true });
    await page.route(url => url.href === routeAssetUrl, async route => {
      abortedAssets.add(route.request().url());
      observations.push({ phase, kind: "controlled-asset-abort", url: route.request().url(), expected: true });
      await route.abort("failed");
    });
    await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
    const alert = page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" });
    await expect(alert).toBeVisible();
    await alert.locator(".app-boot-failure__technical > summary").click();
    await expect(alert.locator(".app-boot-failure__technical")).toHaveAttribute("open", "");
    await expect(alert.getByText(/^故障阶段：route。/)).toBeVisible();
    await expect(page).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
    expect([...abortedAssets]).toEqual([routeAssetUrl]);
    await assertArtifactBinding(page, expectedArtifact, false);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swBootSignalSent ?? "unset")).not.toBe("true");
    await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    const recovery = page.locator(".page--boot-recovery");
    await expect(recovery).toHaveAttribute("data-storage-probe", "ready");
    await expect(recovery).toHaveAttribute("data-backup-capability", "read_only_available");

    // This is the real recovery navigation and real CaseRepository readonly export.
    // data-write-mode and related text are deliberately NOT treated as a global write lock assertion.
    await page.getByRole("link", { name: "只读安全备份", exact: true }).click();
    await expect(page).toHaveTitle("只读安全备份 · 哈基米八字研究台");
    const generate = page.getByRole("button", { name: "生成只读完整备份 ZIP", exact: true });
    await expect(generate).toBeEnabled();
    await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "永久删除全部数据", exact: true })).toHaveCount(0);
    const entered = await nativeSnapshot(page, testInfo, "recovery-entered");
    assertSourceUnchanged(before, entered);
    await page.screenshot({ path: testInfo.outputPath("readonly-recovery-ready.png"), fullPage: false });

    phase = "readonly-export";
    const observedDownloads: string[] = [];
    page.on("download", download => observedDownloads.push(download.suggestedFilename()));
    await generate.click();
    const delivery = page.locator('.prepared-delivery-dialog[role="dialog"]');
    await expect(delivery).toHaveAccessibleName("待交付文件已在本机生成");
    await expect(delivery).toHaveAttribute("data-share-policy", "blocked_sensitive");
    expect(observedDownloads).toEqual([]);
    const prepared = await nativeSnapshot(page, testInfo, "zip-prepared-before-delivery");
    assertSourceUnchanged(before, prepared);
    const downloadPromise = page.waitForEvent("download");
    await delivery.locator('[data-delivery-intent="download"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^hakimi-boot-failure-safety-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(await download.failure()).toBeNull();
    const zipPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(zipPath);
    const bytes = await readFile(zipPath);
    expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const checked = await preflightFullBackupFile(new Uint8Array(bytes));
    expect(checked.migratedFromFormatVersion).toBeNull();
    expect(checked.payload.cases).toHaveLength(1);
    expect(checked.payload.revisions).toHaveLength(1);
    expect(checked.payload.cases[0]).toMatchObject({ id: caseId, latestRevisionId: revisionId, revisionCount: 1 });
    expect(checked.payload.revisions[0]).toMatchObject({ id: revisionId, caseId, revisionNumber: 1 });
    expect(sha256(canonicalStringify(checked.payload.cases[0]))).toBe(before.semanticWitness.cases[0].recordDigest);
    expect(sha256(canonicalStringify(checked.payload.revisions[0]))).toBe(before.semanticWitness.revisions[0].recordDigest);
    for (const store of before.stores) {
      const rows = checked.payload[store.storeName as keyof typeof checked.payload];
      if (Array.isArray(rows)) expect(rows.length, store.storeName).toBe(store.count);
    }
    await expect(delivery).toHaveAttribute("data-delivery-outcome", "requested");
    await expect(page.getByText("只读安全备份已请求下载", { exact: true })).toBeVisible();
    const after = await nativeSnapshot(page, testInfo, "after-verified-zip-delivery");
    assertSourceUnchanged(before, after);
    await attachJson(testInfo, "verified-backup", {
      filename: download.suggestedFilename(), byteLength: bytes.length, zipSha256: sha256(bytes),
      payloadDigest: checked.digests.payload, counts: checked.manifest.counts,
      sourceSnapshotDigest: before.snapshotDigest, afterSnapshotDigest: after.snapshotDigest,
      caseId, revisionId, nativeVersion: after.physicalVersion,
      allPhysicalStoresUnchanged: true,
      sameLockedArtifact: true, wholeOriginWriteLockVerified: false,
      oldV13ArtifactVerified: false, crossSchemaNoBackwriteVerified: false
    });
    await testInfo.attach("readonly-backup.zip", { path: zipPath, contentType: "application/zip" });
    await page.screenshot({ path: testInfo.outputPath("readonly-backup-delivered.png"), fullPage: false });
    await assertArtifactBinding(page, expectedArtifact, false);
    expect(unexpected, "Only exact controlled route-asset failures are expected").toEqual([]);
  } finally {
    try {
      if (session) await session.detach();
    } finally {
      await attachJson(testInfo, "console-and-request-observations", { observations, unexpected });
      await attachJson(testInfo, "locked-artifact-after", await verifyLockedDefaultV13Artifact(expectedArtifact));
    }
  }
});
