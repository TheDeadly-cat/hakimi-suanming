import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import type { FullBackupEnvelope } from "@hakimi/contracts";
import { preflightFullBackupFile, decodeFullBackupFile, recomputeFullBackupDigests } from "@hakimi/backup";
import {
  createDemoCase, openDataManagement, exportFullBackupZip, preflightBackupZip,
  seedPortableData, portableFixture, waitForAppReady, waitForServiceWorker,
  downloadPreparedBackupZip, expectPortableData
} from "./full-backup-helpers.ts";
import {
  captureStorageV13NativeReadonlySnapshot, type StorageV13NativeReadonlySnapshot
} from "./storage-v13-native-readonly.ts";
import {
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context.ts";

import { verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact.ts";

type RevisionRoute = { caseId: string; revisionId: string; path: string };
type ConsoleObservation = { type: string; text: string; location: { url: string; lineNumber: number; columnNumber: number } };
type EstimateProof = {
  calls: number; held: boolean; nativeResolved: boolean; released: boolean;
  methodRestored: boolean; returnedSameObject: boolean; cleaned: boolean;
  rawUsage: number | null | undefined; rawQuota: number | null | undefined;
};
type RestoreEstimateControl = { proof: EstimateProof; release(): void; cleanup(): EstimateProof };
type BackupWithMutableFormat = Omit<FullBackupEnvelope, "manifest"> & {
  manifest: Omit<FullBackupEnvelope["manifest"], "format"> & { format: string };
};
declare global { interface Window { __t7RestoreEstimate?: RestoreEstimateControl } }
const artifacts = new WeakMap<BrowserContext, LockedDefaultV13Artifact>();
const origin = "http://127.0.0.1:4197";
const pageErrors = new WeakMap<BrowserContext, string[]>();
const consoleObservations = new WeakMap<BrowserContext, ConsoleObservation[]>();
const externalRequests = new WeakMap<BrowserContext, string[]>();
const digest = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");

function revisionRoute(page: Page): RevisionRoute {
  const match = new URL(page.url()).pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  if (!match) throw new Error("Expected an exact saved Case/Revision route.");
  return { caseId: match[1], revisionId: match[2], path: new URL(page.url()).pathname };
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: "application/json"
  });
}

async function snapshot(page: Page, testInfo: TestInfo, phase: string) {
  const result = await captureStorageV13NativeReadonlySnapshot(page, {
    captureId: testInfo.project.name + "-" + phase,
    operationId: "restore",
    phase
  });
  expect(result.physicalVersion).toBe(130);
  expect(result.dexieVersion).toBe(13);
  expect(result.transactionMode).toBe("readonly");
  expect(result.storeNames).toHaveLength(16);
  await attachJson(testInfo, phase, result);
  return result;
}

async function assertPageBound(page: Page) {
  const expected = artifacts.get(page.context());
  if (!expected) throw new Error("The current test has no verified locked-artifact baseline.");
  await waitForAppReady(page);
  const observed = await page.evaluate(() => {
    const meta = (name: string) => document.querySelector('meta[name="' + name + '"]')?.getAttribute("content");
    return {
      evidenceId: meta("hakimi-release-evidence-id"),
      buildVersion: meta("hakimi-build-version"),
      descriptor: JSON.parse(meta("hakimi-release-database") ?? "null"),
      generation: document.documentElement.dataset.dbGeneration,
      schema: document.documentElement.dataset.dbSchema
    };
  });
  expect(observed).toEqual({
    evidenceId: expected.evidenceId,
    buildVersion: expected.buildVersion,
    descriptor: expected.descriptor,
    generation: "legacy-v13",
    schema: "13"
  });
}

async function deriveSecondRevision(page: Page, first: RevisionRoute, civilTime = "23:20") {
  await page.goto(first.path, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "录入出生资料" })).toBeVisible();
  await page.getByLabel(/^民用时间/).fill(civilTime);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "确认时间基准与换日规则" })).toBeVisible();
  await page.getByRole("radio", { name: /00:00 午夜换日/ }).check();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存为新修订并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
  const second = revisionRoute(page);
  expect(second.caseId).toBe(first.caseId);
  expect(second.revisionId).not.toBe(first.revisionId);
  return second;
}

async function prepareConfirmation(page: Page, testInfo: TestInfo, filename: string) {
  await page.getByRole("button", { name: "先准备当前安全备份", exact: true }).click();
  const { download } = await downloadPreparedBackupZip(page);
  expect(await download.failure()).toBeNull();
  const destination = testInfo.outputPath(filename);
  await download.saveAs(destination);
  const bytes = await readFile(destination);
  const checked = await preflightFullBackupFile(new Uint8Array(bytes));
  expect(checked.digests.payload).toMatch(/^[a-f0-9]{64}$/);
  await attachJson(testInfo, filename + "-verified", {
    filename, bytes: bytes.length, payloadDigest: checked.digests.payload, counts: checked.manifest.counts
  });
  await page.getByRole("checkbox", { name: /我已确认安全备份文件保存成功并可以打开/ }).check();
  await page.getByRole("checkbox", { name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/ }).check();
  await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toBeEnabled();
}

test.beforeEach(async ({ context, page }, testInfo) => {
  const artifact = await verifyLockedDefaultV13Artifact();
  artifacts.set(context, artifact);
  await attachJson(testInfo, "locked-artifact-before", artifact);
  const errors: string[] = [];
  const external: string[] = [];
  pageErrors.set(context, errors);
  const consoleMessages: ConsoleObservation[] = [];
  consoleObservations.set(context, consoleMessages);
  context.on("console", message => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
    }
  });
  externalRequests.set(context, external);
  context.on("page", item => item.on("pageerror", error => errors.push(error.message)));
  page.on("pageerror", error => errors.push(error.message));
  await context.route("**/*", async route => {
    const target = new URL(route.request().url());
    if (["http:", "https:", "ws:", "wss:"].includes(target.protocol) && target.origin !== origin) {
      external.push(target.origin + target.pathname);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await assertPageBound(page);
  await waitForServiceWorker(page);
  const cdp = await context.newCDPSession(page);
  const version = await cdp.send("Browser.getVersion");
  await cdp.detach();
  const product = requireReleaseBrowserRuntimeProduct(testInfo.project.name, version.product);
  await attachJson(testInfo, "environment", {
    product, origin, temporaryContext: true, defaultStorageStateUsed: false,
    browserPath: "Repository Playwright CLI",
    scope: "local-locked-v13-empty-invalid-backup-repeat-restore",
    oldV13ArtifactVerified: false, crossSchemaNoBackwriteVerified: false,
    formalReleaseEvidenceReceipt: false, publicDeploymentAuthorized: false
  });
});

test.afterEach(async ({ context, page }, testInfo) => {
  await attachJson(testInfo, "page-errors", pageErrors.get(context) ?? []);
  await attachJson(testInfo, "console-observations", consoleObservations.get(context) ?? []);
  await attachJson(testInfo, "blocked-external-requests", externalRequests.get(context) ?? []);
  if (!page.isClosed()) {
    await testInfo.attach("final-ui", {
      body: await page.screenshot({ fullPage: false }), contentType: "image/png"
    });
  }
  expect.soft(pageErrors.get(context) ?? [], "Unexpected uncaught page errors").toEqual([]);
  expect.soft(consoleObservations.get(context) ?? [], "Unexpected console errors or warnings").toEqual([]);
  expect.soft(externalRequests.get(context) ?? [], "No external provider or origin is part of this test").toEqual([]);
  const artifact = artifacts.get(context);
  if (artifact) await attachJson(testInfo, "locked-artifact-after", await verifyLockedDefaultV13Artifact(artifact));
});

function unchanged(before: StorageV13NativeReadonlySnapshot, after: StorageV13NativeReadonlySnapshot) {
  expect(after.databaseName).toBe(before.databaseName);
  expect(after.physicalVersion).toBe(before.physicalVersion);
  expect(after.dexieVersion).toBe(before.dexieVersion);
  expect(after.storeNames).toEqual(before.storeNames);
  expect(after.stores).toEqual(before.stores);
  expect(after.semanticWitness).toEqual(before.semanticWitness);
  expect(after.snapshotDigest).toBe(before.snapshotDigest);
}

async function captureUi(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: false }), contentType: "image/png" });
  await attachJson(testInfo, name + "-dom", { url: page.url(), title: await page.title(), ariaSnapshot: await page.locator("body").ariaSnapshot() });
}

async function chooseInvalidBackup(page: Page, bytes: Buffer, filename: string) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true }).click();
  await (await chooserPromise).setFiles({ name: filename, mimeType: "application/json", buffer: bytes });
  const feedback = page.locator('.data-feedback[role="alert"]').filter({ hasText: "备份预检未通过" });
  await expect(feedback).toBeVisible();
  await expect(page.getByRole("heading", { name: "预检通过，尚未写入", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true })).toBeEnabled();
  return feedback;
}

// Only delay delivery of the first real estimate result after the explicit final
// restore click. No forged quota/admission, app API, Worker message, or IDB write.
async function holdNextRealEstimate(page: Page) {
  await page.evaluate(() => {
    const storage = navigator.storage;
    const original = storage.estimate;
    if (typeof original !== "function") throw new Error("Real storage.estimate is unavailable.");
    const priorOwn = Object.getOwnPropertyDescriptor(storage, "estimate");
    const proof: EstimateProof = { calls: 0, held: false, nativeResolved: false, released: false, methodRestored: false, returnedSameObject: false, cleaned: false, rawUsage: null, rawQuota: null };
    let resolveGate!: () => void;
    const gate = new Promise<void>(resolve => { resolveGate = resolve; });
    const wrapped = function (...args: Parameters<StorageManager["estimate"]>): ReturnType<StorageManager["estimate"]> {
      proof.calls += 1;
      // Call the original method with its original receiver before introducing
      // any delay. Every call retains its real native success/failure result.
      const nativeResult: Promise<StorageEstimate> = Reflect.apply(original, storage, args);
      if (proof.calls !== 1) return nativeResult;
      proof.held = true;
      return Promise.resolve(nativeResult).then(async value => {
        proof.nativeResolved = true;
        proof.rawUsage = value.usage;
        proof.rawQuota = value.quota;
        await gate;
        proof.returnedSameObject = true;
        return value;
      });
    };
    Object.defineProperty(storage, "estimate", { value: wrapped, writable: true, configurable: true });
    const restoreMethod = () => {
      if (proof.methodRestored) return;
      if (storage.estimate !== wrapped) throw new Error("The owned estimate wrapper was unexpectedly replaced.");
      if (priorOwn) Object.defineProperty(storage, "estimate", priorOwn);
      else delete (storage as Partial<StorageManager>).estimate;
      if (storage.estimate !== original) throw new Error("The real estimate method was not restored.");
      proof.methodRestored = true;
    };
    window.__t7RestoreEstimate = {
      proof,
      release() {
        // Close observation at this exact restoring window, before the real
        // result is delivered; later overview estimates use the native method.
        if (!proof.released) { restoreMethod(); proof.released = true; resolveGate(); }
      },
      cleanup() {
        this.release();
        if (storage.estimate !== original) throw new Error("The real estimate method was not restored.");
        proof.cleaned = true;
        const result = { ...proof };
        delete window.__t7RestoreEstimate;
        return result;
      }
    };
  });
}

test("an empty v13 space exposes ordinary page entry points without generating user records", async ({ page }, testInfo) => {
  const baseline = await snapshot(page, testInfo, "empty-startup");
  expect(baseline.storeNames).toHaveLength(16);
  expect(baseline.stores.every(store => store.count === 0)).toBe(true);
  const pages = [
    { path: "/", title: "工作台", heading: "先建立第一张可复算的研究样本", link: "从空白开始", href: "/new" },
    { path: "/cases", title: "案例库", heading: "案例库还是空的" },
    { path: "/cases/research", title: "专业研究检索", heading: "还没有正式命盘" },
    { path: "/compare", title: "正式命盘对照台", heading: "先保存一张正式命盘", link: "新建正式案例", href: "/new" },
    { path: "/compare/pair", title: "双案例结构研究", heading: "先保存两个不同正式案例", link: "新建正式案例", href: "/new" },
    { path: "/knowledge", title: "个人典籍与引用", heading: "选择一份资料开始阅读", text: "还没有资料，可先导入 Markdown 或 TXT。" },
    { path: "/settings", title: "设置与诊断", heading: "设置与诊断" },
    { path: "/settings/data", title: "数据管理与完整备份", heading: "数据管理与完整备份" },
    { path: "/new", title: "新建排盘", heading: "新建排盘" }
  ];
  for (const [index, item] of pages.entries()) {
    await page.goto(item.path, { waitUntil: "domcontentloaded" });
    await assertPageBound(page);
    expect(new URL(page.url()).origin).toBe(origin);
    expect(new URL(page.url()).pathname).toBe(item.path);
    await expect(page).toHaveTitle(item.title + " · 哈基米八字研究台");
    if (item.path === "/cases/research") {
      await page.getByRole("button", { name: "应用筛选", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: item.heading, exact: true })).toBeVisible();
    if (item.text) await expect(page.getByText(item.text, { exact: true })).toBeVisible();
    if (item.link) await expect(page.getByRole("link", { name: item.link, exact: true })).toHaveAttribute("href", item.href);
    if (item.path === "/settings/data") {
      await expect(page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).not.toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: "准备完整 ZIP", exact: true })).toBeEnabled();
    }
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    unchanged(baseline, await snapshot(page, testInfo, "empty-page-" + index));
    await captureUi(page, testInfo, "empty-page-" + index);
  }
  // Open the ordinary creation form only; generating/saving requires an explicit
  // action and is deliberately left to the separate real business-flow tests.
  await expect(page.getByRole("button", { name: "下一步", exact: true })).toBeEnabled();
});

test("format, digest and Case-Revision relationship errors are refused by real file preflight without writes", async ({ page }, testInfo) => {
  await createDemoCase(page);
  const first = revisionRoute(page);
  const second = await deriveSecondRevision(page, first);
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("非法备份保留"));
  const { bytes } = await exportFullBackupZip(page);
  const verified = await preflightFullBackupFile(new Uint8Array(bytes));
  const envelope = JSON.parse(decodeFullBackupFile(new Uint8Array(bytes)).json) as FullBackupEnvelope;
  const baseline = await snapshot(page, testInfo, "invalid-source-r1-r2");
  expect(verified.payload.revisions).toHaveLength(2);
  expect(verified.payload.attachments).toHaveLength(1);
  expect(baseline.semanticWitness.revisions.map(item => item.revisionNumber)).toEqual([1, 2]);

  const invalidFormat = structuredClone(envelope) as BackupWithMutableFormat;
  invalidFormat.manifest.format = "ordinary-corrupt-backup-format";
  const invalidDigest = structuredClone(envelope);
  invalidDigest.digests.cases = envelope.digests.cases === "0".repeat(64) ? "1".repeat(64) : "0".repeat(64);
  const invalidRelationship = structuredClone(envelope);
  invalidRelationship.payload.cases[0].id = randomUUID();
  invalidRelationship.digests = await recomputeFullBackupDigests(invalidRelationship);
  const fixtures = [
    { name: "format", value: invalidFormat, code: "UNSUPPORTED_FORMAT", text: /Unsupported full-backup format/ },
    { name: "digest", value: invalidDigest, code: "DIGEST_MISMATCH", text: /cases digest does not match/ },
    { name: "relationship", value: invalidRelationship, code: "ORPHAN_REVISION", text: /引用了不存在的 Case/ }
  ];
  for (const fixture of fixtures) {
    const input = Buffer.from(JSON.stringify(fixture.value), "utf8");
    await expect(preflightFullBackupFile(new Uint8Array(input))).rejects.toMatchObject({ code: fixture.code });
    await testInfo.attach("invalid-" + fixture.name + "-input", { body: input, contentType: "application/json" });
    const feedback = await chooseInvalidBackup(page, input, "ordinary-" + fixture.name + "-error.json");
    await expect(feedback).toContainText(fixture.text);
    unchanged(baseline, await snapshot(page, testInfo, "invalid-" + fixture.name + "-refused"));
    await captureUi(page, testInfo, "invalid-" + fixture.name + "-ui");
  }
  await attachJson(testInfo, "invalid-input-provenance", { first, second, realExportSha256: digest(bytes), onlyExternalCopiesAltered: true, originalArchiveBytesChanged: false });
});

test("an in-progress second click stays locked and a completed backup can be restored again only after fresh safety preflight", async ({ page }, testInfo) => {
  await createDemoCase(page);
  const first = revisionRoute(page);
  const second = await deriveSecondRevision(page, first);
  await openDataManagement(page);
  const fixture = portableFixture("重复恢复来源");
  await seedPortableData(page, fixture);
  const { bytes } = await exportFullBackupZip(page);
  const incoming = await preflightFullBackupFile(new Uint8Array(bytes));
  const original = await snapshot(page, testInfo, "repeat-original-r1-r2");
  expect(incoming.payload.revisions).toHaveLength(2);
  expect(incoming.payload.attachments).toHaveLength(1);

  const third = await deriveSecondRevision(page, second, "23:21");
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("重复恢复当前"));
  const current = await snapshot(page, testInfo, "repeat-current-r1-r2-r3");
  expect(current.snapshotDigest).not.toBe(original.snapshotDigest);
  expect(current.semanticWitness.revisions.map(item => item.revisionNumber)).toEqual([1, 2, 3]);
  const currentAttachments = current.stores.find(store => store.storeName === "attachments");
  if (!currentAttachments) throw new Error("The native snapshot is missing the attachments partition.");
  expect(currentAttachments.count).toBe(2);
  await preflightBackupZip(page, bytes, "repeat-incoming-r1-r2.zip");
  await prepareConfirmation(page, testInfo, "repeat-first-safety-r3.zip");
  unchanged(current, await snapshot(page, testInfo, "repeat-before-submit"));
  await holdNextRealEstimate(page);
  let cleanedProof: EstimateProof | null;
  try {
    await page.getByRole("button", { name: "确认替换并恢复", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__t7RestoreEstimate!.proof.nativeResolved)).toBe(true);
    const restoring = page.getByRole("button", { name: "正在事务恢复", exact: true });
    await expect(restoring).toBeDisabled();
    await expect(restoring).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "取消恢复", exact: true })).toBeDisabled();
    await expect(page.locator(".data-feedback").filter({ hasText: "正在事务恢复" })).toContainText("请保持本页打开");
    const box = await restoring.boundingBox();
    if (!box) throw new Error("The real disabled restore button has no visible bounds.");
    // Real mouse input against the disabled visible control; no force click or
    // synthetic DOM dispatch that could bypass ordinary browser semantics.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(restoring).toBeDisabled();
    const heldProof = await page.evaluate(() => ({ ...window.__t7RestoreEstimate!.proof }));
    expect(heldProof).toMatchObject({ calls: 1, held: true, nativeResolved: true, released: false });
    unchanged(current, await snapshot(page, testInfo, "repeat-second-click-while-held"));
    await attachJson(testInfo, "real-estimate-restoring-window", heldProof);
    await captureUi(page, testInfo, "repeat-restoring-locked");
    await page.evaluate(() => window.__t7RestoreEstimate!.release());
    await expect(page.locator(".data-feedback").filter({ hasText: "完整恢复成功" })).toBeVisible();
  } finally {
    cleanedProof = await page.evaluate(() => window.__t7RestoreEstimate ? window.__t7RestoreEstimate.cleanup() : null);
    await attachJson(testInfo, "real-estimate-cleanup", cleanedProof);
  }
  expect(cleanedProof).toMatchObject({ calls: 1, released: true, methodRestored: true, nativeResolved: true, returnedSameObject: true, cleaned: true });
  unchanged(original, await snapshot(page, testInfo, "repeat-first-complete"));
  await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true })).toBeEnabled();

  await preflightBackupZip(page, bytes, "same-exact-backup-fresh-preflight.zip");
  const safety = page.getByRole("checkbox", { name: /我已确认安全备份文件保存成功并可以打开/ });
  const replacement = page.getByRole("checkbox", { name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/ });
  await expect(safety).not.toBeChecked();
  await expect(safety).toBeDisabled();
  await expect(replacement).not.toBeChecked();
  await expect(replacement).toBeDisabled();
  await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toBeDisabled();
  unchanged(original, await snapshot(page, testInfo, "repeat-fresh-preflight-no-write"));
  await captureUi(page, testInfo, "repeat-fresh-confirmations-required");
  await prepareConfirmation(page, testInfo, "repeat-second-safety-r1-r2.zip");
  await page.getByRole("button", { name: "确认替换并恢复", exact: true }).click();
  await expect(page.locator(".data-feedback").filter({ hasText: "完整恢复成功" })).toBeVisible();
  unchanged(original, await snapshot(page, testInfo, "repeat-second-complete"));
  await expectPortableData(page, fixture);
  for (const saved of [first, second]) {
    await page.goto(saved.path, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    expect(revisionRoute(page)).toEqual(saved);
    await expect(page.getByRole("link", { name: "由此修订派生新版", exact: true })).toBeVisible();
  }
  await openDataManagement(page);
  unchanged(original, await snapshot(page, testInfo, "repeat-reopened-final"));
  await attachJson(testInfo, "repeated-restore-result", { first, second, removedThird: third, archiveSha256: digest(bytes), originalDigest: original.snapshotDigest, freshPreflightAndSafetyRequiredTwice: true, normalRestoreCompletions: 2, inProgressSecondClick: "disabled-ui-no-second-estimate-entry", rawIndexedDbWritesByTest: false });
  await captureUi(page, testInfo, "repeat-final-ui");
});
