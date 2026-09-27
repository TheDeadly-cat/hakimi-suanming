import { createHash } from "node:crypto";
import fs from "node:fs/promises";
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
    const resources = [...new Set(performance.getEntriesByType("resource").map(item => item.name))]
      .filter(url => new URL(url).origin === location.origin && /\/assets\/index-[^/]+\.js$/.test(new URL(url).pathname));
    let Repository: any;
    let Database: any;
    for (const url of resources) {
      const namespace = await import(/* @vite-ignore */ url);
      for (const value of Object.values(namespace)) {
        if (typeof value !== "function" || !value.prototype) continue;
        if (typeof value.prototype.prepareFullDataSnapshotReplacement === "function") Repository = value;
        if (typeof value.prototype.withReleaseMigrationWriteAccess === "function") Database = value;
      }
    }
    if (!Repository || !Database) throw new Error("Observed artifact did not expose its storage classes.");
    const database = new Database("hakimi-bazi-research", { targetSchema: 13 });
    try {
      const repository = new Repository(database);
      const payload = await repository.readFullDataSnapshot();
      const caseRecord = payload.cases[0], revision = payload.revisions[0];
      if (!caseRecord || !revision) throw new Error("Synthetic UI case is missing.");
      payload.cases = [];
      payload.revisions = [];
      for (let index = 0; index < 1_000; index++) {
        const suffix = String(index).padStart(12, "0");
        const caseId = "40000000-0000-4000-8000-" + suffix;
        const revisionId = "50000000-0000-4000-8000-" + suffix;
        payload.cases.push({ ...structuredClone(caseRecord), id: caseId, latestRevisionId: revisionId,
          alias: "隔离下载验收-" + String(index).padStart(4, "0") });
        payload.revisions.push({ ...structuredClone(revision), id: revisionId, caseId });
      }
      const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
      await repository.replaceFullDataSnapshot(payload);
      return { cases: 1_000, revisions: 1_000, payloadBytes };
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
  try {
    for (let round = 0; round < 2; round++) {
      const pipeContext = pipeProfile ? await chromium.launchPersistentContext(pipeProfile, {
        channel: browserId, headless, acceptDownloads: true
      }) : null;
      const session = pipeContext ? { context: pipeContext, close: () => pipeContext.close() } : await owner.launch();
      try {
        const page = await session.context.newPage();
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.setContent('<title>Isolated ZIP delivery</title><button id="download">Download synthetic ZIP</button>');
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
      } finally { await session.close(); }
    }
  } finally { await attach(info, "minimal-lifecycle", lifecycle); }
});

test("locked v13 thousand-case backup survives full browser reopen and repeated verified delivery", async ({ page }, info) => {
  const artifact = await verifyLockedDefaultV13Artifact();
  const sourceProblems = collectConsoleProblems(page);
  const lifecycle: unknown[] = [];
  const browserId = info.project.metadata.releaseBrowserProject as string;
  const headless = info.project.use.headless !== false;
  const owner = await createReusableReleaseBrowser(browserId, { headless, observe: event => lifecycle.push(event) });
  let session: Awaited<ReturnType<typeof owner.launch>> | undefined;
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
    await openDataManagement(target, origin);
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
    await openDataManagement(target, origin);
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
    expect(await target.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await target.screenshot({ path: info.outputPath("reopened-case-mobile.png"), fullPage: false });
    await target.setViewportSize({ width: 1280, height: 800 });
    await openDataManagement(target, origin);
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
  } finally {
    await attach(info, "lifecycle-before-final-cleanup", lifecycle);
    if (session) await session.close();
    await attach(info, "lifecycle-after-final-cleanup", lifecycle);
  }
});
