import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";
import { chromium, expect, test, type Page, type TestInfo } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  collectConsoleProblems, createDemoCase, openDataManagement, waitForAppReady,
  waitForServiceWorker, seedPortableData, portableFixture, exportFullBackupZip,
  preflightBackupZip, completeRestoreSafetyGate, expectPartitionCount
} from "./full-backup-helpers";
import { captureStorageV13NativeReadonlySnapshot } from "./storage-v13-native-readonly";
import { verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact";
import { createReusableReleaseBrowser } from "./reusable-release-browser";

const origin = "http://127.0.0.1:4197";
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
// CDP's default context has no baseURL. Keep its absolute navigation local to
// this regression instead of changing the historical shared fixture's bytes.
async function openOwnedDataManagement(page: Page) {
  await page.goto(origin + "/settings/data", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("数据管理与完整备份 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
  await waitForAppReady(page);
  await expect(page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).not.toHaveAttribute("aria-busy", "true");
}
async function attach(info: TestInfo, name: string, value: unknown) {
  await info.attach(name, { body: Buffer.from(JSON.stringify(value, null, 2)), contentType: "application/json" });
}
async function bound(page: Page, artifact: LockedDefaultV13Artifact) {
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  expect(await page.evaluate(() => ({
    build: document.querySelector('meta[name="hakimi-build-version"]')?.getAttribute("content"),
    evidence: document.querySelector('meta[name="hakimi-release-evidence-id"]')?.getAttribute("content"),
    schema: document.documentElement.dataset.dbSchema
  }))).toEqual({ build: artifact.buildVersion, evidence: artifact.evidenceId, schema: "13" });
}
async function snapshot(page: Page, phase: string) {
  return captureStorageV13NativeReadonlySnapshot(page, {
    captureId: "persistent-delivery-" + phase, operationId: "export", phase
  });
}
async function savedBackup(page: Page, info: TestInfo, filename: string, expectedPayload?: string) {
  const exported = await exportFullBackupZip(page);
  const destination = info.outputPath(filename);
  await expect(fs.access(destination)).rejects.toThrow();
  await exported.download.saveAs(destination);
  const bytes = await fs.readFile(destination);
  expect(bytes.length).toBeGreaterThan(4);
  expect(digest(bytes)).toBe(digest(exported.bytes));
  const checked = await preflightFullBackupFile(new Uint8Array(bytes));
  if (expectedPayload) expect(checked.digests.payload).toBe(expectedPayload);
  await attach(info, filename + "-verified", {
    filename, bytes: bytes.length, sha256: digest(bytes), payloadDigest: checked.digests.payload
  });
  // A completed file must not hide the previously observed delayed native exit.
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 3_000)));
  await expect(page.locator("html")).toHaveAttribute("data-app-boot-ready", "true");
  return { bytes, checked };
}
async function seedThousandCases(page: Page) {
  return page.evaluate(async () => {
    const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Fixture read failed."));
    });
    const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error("Fixture transaction failed."));
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hakimi-bazi-research");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Fixture database open failed."));
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        reject(new Error("Fixture setup must not create or upgrade a database."));
      };
    });
    try {
      // Test-only setup on a fresh physical v13 profile; never bypass v16 mutation epochs.
      if (database.version !== 130) throw new Error("Synthetic fixture requires physical v13 (130).");
      const stores = ["cases", "revisions", "birthFingerprints"];
      const read = database.transaction(stores, "readonly");
      const readDone = transactionDone(read);
      const [cases, revisions, fingerprints] = await Promise.all(stores.map(name =>
        requestResult(read.objectStore(name).getAll())
      ));
      await readDone;
      const caseRecord = cases[0], revision = revisions[0];
      const fingerprint = fingerprints.find(record => record.recordType === "revision" && record.sourceId === revision?.id);
      if (cases.length !== 1 || revisions.length !== 1 || !fingerprint ||
          revision.caseId !== caseRecord.id || caseRecord.latestRevisionId !== revision.id) {
        throw new Error("Synthetic UI case, revision, and fingerprint must form one valid fixture.");
      }
      const seededCases = [], seededRevisions = [], seededFingerprints = [];
      for (let index = 0; index < 1_000; index++) {
        const suffix = String(index).padStart(12, "0");
        const caseId = "40000000-0000-4000-8000-" + suffix;
        const revisionId = "50000000-0000-4000-8000-" + suffix;
        seededCases.push({ ...structuredClone(caseRecord), id: caseId, latestRevisionId: revisionId,
          alias: "隔离下载验收-" + String(index).padStart(4, "0") });
        seededRevisions.push({ ...structuredClone(revision), id: revisionId, caseId });
        seededFingerprints.push({ ...structuredClone(fingerprint), key: "revision:" + revisionId,
          sourceId: revisionId, subjectId: caseId, recordType: "revision" });
      }
      const coreFixtureBytes = new TextEncoder().encode(JSON.stringify({
        cases: seededCases, revisions: seededRevisions
      })).byteLength;
      const write = database.transaction(stores, "readwrite");
      const writeDone = transactionDone(write);
      for (const [offset, records] of [seededCases, seededRevisions, seededFingerprints].entries()) {
        const store = write.objectStore(stores[offset]!);
        store.clear();
        for (const record of records) store.put(record);
      }
      await writeDone;
      return { cases: seededCases.length, revisions: seededRevisions.length,
        fingerprints: seededFingerprints.length, coreFixtureBytes, setup: "native-idb-v13-synthetic-only" };
    } finally { database.close(); }
  });
}

test("minimal fixed ZIP download verifies completion and survival across profile reuse", async ({}, info) => {
  const browserId = info.project.metadata.releaseBrowserProject as string;
  const headless = info.project.use.headless !== false;
  const pipeDiagnostic = process.env.HAKIMI_DOWNLOAD_REPRO_PIPE === "1";
  const lifecycle: unknown[] = [];
  const owner = await createReusableReleaseBrowser(browserId, { headless, observe: event => lifecycle.push(event) });
  const pipeProfile = pipeDiagnostic ? await fs.mkdtemp(path.join(os.tmpdir(), "hbd-pipe-diagnostic-")) : null;
  const payload = Uint8Array.from({ length: 256 * 1_024 }, (_, index) => (index * 31 + (index >> 8)) & 255);
  const zip = zipSync({ "synthetic.bin": payload });
  // Match the application's real loopback origin. about:blank/setContent is a
  // separate browser download edge case, retained in the diagnostic record.
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end('<title>Isolated ZIP delivery</title><button id="download">Download synthetic ZIP</button>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Synthetic server has no loopback port.");
  try {
    for (let round = 0; round < 2; round++) {
      const pipeContext = pipeProfile ? await chromium.launchPersistentContext(pipeProfile, {
        channel: browserId, headless, acceptDownloads: true
      }) : null;
      const session = pipeContext ? { context: pipeContext, close: () => pipeContext.close() } : await owner.launch();
      let operationError: unknown;
      try {
        const page = await session.context.newPage();
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("http://127.0.0.1:" + address.port);
        await page.evaluate(bytes => {
          const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });
          document.getElementById("download")!.onclick = () => {
            const url = URL.createObjectURL(blob), anchor = document.createElement("a");
            anchor.href = url; anchor.download = "synthetic.zip"; document.body.append(anchor);
            anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
          };
        }, [...zip]);
        const promised = page.waitForEvent("download");
        await page.locator("#download").click();
        const download = await promised;
        expect(await download.failure()).toBeNull();
        const saved = info.outputPath("minimal-" + round + ".zip");
        await download.saveAs(saved);
        const bytes = new Uint8Array(await fs.readFile(saved));
        expect(digest(bytes)).toBe(digest(zip));
        expect(digest(unzipSync(bytes)["synthetic.bin"]!)).toBe(digest(payload));
        await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 3_000)));
        await expect(page.locator("#download")).toBeEnabled();
        await attach(info, "minimal-delivery-" + round, { round, bytes: bytes.length,
          sha256: digest(bytes), transport: pipeDiagnostic ? "pipe-diagnostic" : "loopback-cdp-port" });
      } catch (error) {
        operationError = error;
        await attach(info, "minimal-operation-error-" + round, { error: String(error) });
        throw error;
      } finally {
        try { await session.close(); }
        catch (cleanupError) {
          if (operationError) throw new AggregateError([operationError, cleanupError], "Download operation and cleanup both failed.");
          throw cleanupError;
        }
      }
    }
  } finally {
    await attach(info, "minimal-lifecycle", lifecycle);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("locked v13 thousand-case backup survives full browser reopen and repeated verified delivery", async ({ page }, info) => {
  const artifact = await verifyLockedDefaultV13Artifact();
  const sourceProblems = collectConsoleProblems(page);
  const lifecycle: unknown[] = [];
  const browserId = info.project.metadata.releaseBrowserProject as string;
  const headless = info.project.use.headless !== false;
  const owner = await createReusableReleaseBrowser(browserId, { headless, observe: event => lifecycle.push(event) });
  let session: Awaited<ReturnType<typeof owner.launch>> | undefined;
  let operationError: unknown;
  const targetProblems: string[] = [];
  try {
    await createDemoCase(page);
    await bound(page, artifact);
    await openDataManagement(page);
    await seedPortableData(page, portableFixture("持久重开交付"));
    const capacity = await seedThousandCases(page);
    await page.reload();
    await bound(page, artifact);
    await expectPartitionCount(page, "命盘案例", 1_000);
    const source = await snapshot(page, "source");
    const backup = await savedBackup(page, info, "source.zip");
    await attach(info, "source-identity", { artifact, capacity, stores: source.stores });

    session = await owner.launch();
    await expect(owner.launch()).rejects.toThrow("Profile is active");
    let target = await session.context.newPage();
    await target.setViewportSize({ width: 1280, height: 800 });
    const firstProblems = collectConsoleProblems(target);
    await openOwnedDataManagement(target);
    await bound(target, artifact);
    await preflightBackupZip(target, backup.bytes, "synthetic-thousand.zip");
    await completeRestoreSafetyGate(target);
    const restored = await snapshot(target, "restored");
    expect(restored.stores).toEqual(source.stores);
    await savedBackup(target, info, "restored.zip", backup.checked.digests.payload);
    targetProblems.push(...firstProblems);
    await session.close();
    session = undefined;

    session = await owner.launch();
    target = await session.context.newPage();
    await target.setViewportSize({ width: 1280, height: 800 });
    const reopenedProblems = collectConsoleProblems(target);
    await openOwnedDataManagement(target);
    await bound(target, artifact);
    const reopened = await snapshot(target, "reopened-before-export");
    expect(reopened.stores).toEqual(source.stores);
    await savedBackup(target, info, "reopened-first.zip", backup.checked.digests.payload);
    await savedBackup(target, info, "reopened-second.zip", backup.checked.digests.payload);
    await target.goto(origin + "/cases/40000000-0000-4000-8000-000000000000/revisions/50000000-0000-4000-8000-000000000000");
    await waitForAppReady(target);
    await expect(target.getByRole("heading", { name: "隔离下载验收-0000", exact: true })).toBeVisible();
    await target.screenshot({ path: info.outputPath("reopened-case-desktop.png"), fullPage: false });
    await target.setViewportSize({ width: 390, height: 844 });
    const mobileWidth = await target.evaluate(() => ({
      viewport: innerWidth, content: document.documentElement.scrollWidth,
      available: document.documentElement.clientWidth
    }));
    expect(mobileWidth.viewport).toBe(390);
    expect(mobileWidth.content).toBe(mobileWidth.available);
    await target.screenshot({ path: info.outputPath("reopened-case-mobile.png"), fullPage: false });
    await target.setViewportSize({ width: 1280, height: 800 });
    await openOwnedDataManagement(target);
    const after = await snapshot(target, "after-repeated-export");
    expect(after.stores).toEqual(source.stores);
    await target.screenshot({ path: info.outputPath("reopened-delivery.png"), fullPage: false });
    targetProblems.push(...reopenedProblems);
    expect(sourceProblems).toEqual([]);
    expect(targetProblems).toEqual([]);
    await attach(info, "completed-data-proof", {
      profile: owner.profileDirectory, headless, browserId, artifact,
      source: source.stores, restored: restored.stores, reopened: reopened.stores, after: after.stores,
      payloadDigest: backup.checked.digests.payload, sourceProblems, targetProblems
    });
    await session.close();
    session = undefined;
    await verifyLockedDefaultV13Artifact(artifact);
  } catch (error) {
    operationError = error;
    await attach(info, "application-operation-error", { error: String(error) });
    throw error;
  } finally {
    await attach(info, "lifecycle-before-final-cleanup", lifecycle);
    try { if (session) await session.close(); }
    catch (cleanupError) {
      if (operationError) throw new AggregateError([operationError, cleanupError], "Application operation and cleanup both failed.");
      throw cleanupError;
    } finally { await attach(info, "lifecycle-after-final-cleanup", lifecycle); }
  }
});
