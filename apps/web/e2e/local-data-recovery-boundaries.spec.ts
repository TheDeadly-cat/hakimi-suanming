import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  createDemoCase, openDataManagement, exportFullBackupZip, preflightBackupZip,
  seedPortableData, portableFixture, waitForAppReady, waitForServiceWorker,
  downloadPreparedBackupZip
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
type NativeAbortProof = {
  armed: boolean; targetStore: string; attempted: number; successfulClearEvents: number;
  nativeAbortCalls: number; nativeAbortEvents: number; nativeCompleteEvents: number;
  transactionStores: string[]; abortCallError: string | null; injectedUserRecords: number;
};
declare global { interface Window { __hakimiLocalAbortProof?: NativeAbortProof } }
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

async function deriveSecondRevision(page: Page, first: RevisionRoute) {
  await page.goto(first.path, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "录入出生资料" })).toBeVisible();
  await page.getByLabel(/^民用时间/).fill("23:20");
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

function assertRevisionRelationship(state: StorageV13NativeReadonlySnapshot, first: RevisionRoute, second: RevisionRoute, original: StorageV13NativeReadonlySnapshot) {
  const caseWitness = state.semanticWitness.cases.find(item => item.caseIdDigest === digest(first.caseId));
  expect(caseWitness).toMatchObject({
    latestRevisionIdDigest: digest(second.revisionId), revisionCount: 2, lifecycleState: "active"
  });
  const revisions = state.semanticWitness.revisions.filter(item => item.caseIdDigest === digest(first.caseId));
  expect(revisions.map(item => [item.revisionIdDigest, item.revisionNumber])).toEqual([
    [digest(first.revisionId), 1], [digest(second.revisionId), 2]
  ]);
  expect(revisions[0].recordDigest).toBe(
    original.semanticWitness.revisions.find(item => item.revisionIdDigest === digest(first.revisionId))!.recordDigest
  );
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

async function waitRecoveryOutcome(page: Page) {
  const messages = page.locator('.data-feedback, [data-result="reconciliation-required"]');
  await expect.poll(async () => (await messages.allTextContents()).join("\n"), { timeout: 30000 })
    .toMatch(/恢复未完成|恢复结果未知|恢复.*(?:中止|回滚)|Current data changed|CURRENT_DATA_CHANGED|预检.*(?:失效|过期)|完整恢复成功/);
  return (await messages.allTextContents()).join("\n");
}

async function assertUnknownRestoreGate(page: Page, outcomeText: string, testInfo: TestInfo) {
  const receipt = page.locator('[data-result="reconciliation-required"][data-operation="restore"]');
  await expect.soft(receipt).toBeVisible();
  await expect.soft(page.locator(".page--data-management"))
    .toHaveAttribute("data-write-mode", "reconciliation_required");
  await expect.soft(page.locator(".page--data-management"))
    .toHaveAttribute("data-write-reconciliation-required", "true");
  expect.soft(outcomeText).toMatch(/不要.*(?:再次提交|重复恢复)|(?:禁止|关闭).*重复恢复/);
  expect.soft(outcomeText).toMatch(/重新打开.*核对/);
  await expect.soft(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toHaveCount(0);
  await expect.soft(page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true })).toBeDisabled();
  const writeButtons = ["保存研究者资料", "保存本机偏好", "选择并保存附件"];
  const disabledWrites: Record<string, boolean> = {};
  for (const name of writeButtons) {
    const button = page.getByRole("button", { name, exact: true });
    await expect.soft(button, `Unknown restore must keep ${name} locked`).toBeDisabled();
    disabledWrites[name] = await button.isDisabled();
  }
  const deleteAttachments = page.getByRole("button", { name: "删除", exact: true });
  await expect.soft(deleteAttachments).toHaveCount(2);
  for (const button of await deleteAttachments.all()) await expect.soft(button).toBeDisabled();
  await expect.soft(page.getByRole("button", { name: "开始完整清空", exact: true })).toBeDisabled();
  await expect.soft(page.getByRole("button", { name: "准备完整 ZIP", exact: true })).toBeEnabled();
  const reopen = receipt.getByRole("button", { name: "重新打开并核对", exact: true });
  await expect.soft(reopen).toBeVisible();
  await expect.soft(reopen).toBeEnabled();
  await attachJson(testInfo, "unknown-restore-write-gate", {
    disabledWrites,
    repeatedRestoreButtonCount: await page.getByRole("button", { name: "确认替换并恢复", exact: true }).count(),
    newPreflightDisabled: await page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true }).isDisabled(),
    clearAllEntryEnabled: await page.getByRole("button", { name: "开始完整清空", exact: true }).isEnabled(),
    clearAllEntryNote: "Verified disabled; this test does not open or submit full deletion while reconciling restore.",
    uiCanConfirmNativeAbort: false
  });
  return reopen;
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
    scope: "local-current-v13-two-tab-and-restore-abort-only",
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
  expect.soft(externalRequests.get(context) ?? [], "No external provider or origin is part of this test").toEqual([]);
  const artifact = artifacts.get(context);
  if (artifact) await attachJson(testInfo, "locked-artifact-after", await verifyLockedDefaultV13Artifact(artifact));
});

test("second tab creates R2 through UI; stale restore preflight preserves R2 and both tabs refresh consistently", async ({ page, context }, testInfo) => {
  await createDemoCase(page);
  const first = revisionRoute(page);
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("双页恢复前"));
  const { bytes } = await exportFullBackupZip(page);
  const incoming = await preflightFullBackupFile(new Uint8Array(bytes));
  const original = await snapshot(page, testInfo, "two-tab-before-preflight");
  await preflightBackupZip(page, bytes, "two-tab-incoming-r1.zip");
  await prepareConfirmation(page, testInfo, "two-tab-safety-r1.zip");

  const secondPage = await context.newPage();
  const second = await deriveSecondRevision(secondPage, first);
  const afterSecondWrite = await snapshot(secondPage, testInfo, "two-tab-after-r2");
  assertRevisionRelationship(afterSecondWrite, first, second, original);
  expect(afterSecondWrite.snapshotDigest).not.toBe(original.snapshotDigest);

  await page.getByRole("button", { name: "确认替换并恢复", exact: true }).click();
  const outcomeText = await waitRecoveryOutcome(page);
  const afterStaleRestore = await snapshot(page, testInfo, "two-tab-after-stale-restore");
  await attachJson(testInfo, "two-tab-restore-outcome", {
    outcomeText, incomingPayloadDigest: incoming.digests.payload,
    competingRevisionIdDigest: digest(second.revisionId),
    dataPreserved: afterStaleRestore.snapshotDigest === afterSecondWrite.snapshotDigest
  });
  await testInfo.attach("stale-restore-ui", { body: await page.screenshot(), contentType: "image/png" });
  expect(afterStaleRestore.snapshotDigest).toBe(afterSecondWrite.snapshotDigest);
  assertRevisionRelationship(afterStaleRestore, first, second, original);
  expect.soft(outcomeText).toMatch(/Current data changed|CURRENT_DATA_CHANGED|数据.*(?:变化|变更)|预检.*(?:失效|过期)/);
  expect.soft(outcomeText, "A known stale-preflight rejection should not be described as an unknown commit").not.toContain("提交结果未知");
  expect.soft(outcomeText).not.toContain("恢复结果未知");
  expect.soft(outcomeText).not.toContain("完整恢复成功");
  expect.soft(outcomeText, "A stale preflight needs an explicit new preparation path")
    .toMatch(/重新.*(?:预检|选择)|(?:新|fresh).*安全备份|fresh safety backup/);
  const obsoleteRestore = page.getByRole("button", { name: "确认替换并恢复", exact: true });
  if (await obsoleteRestore.count()) {
    await expect.soft(obsoleteRestore, "The stale confirmation must not remain reusable").toBeDisabled();
  }
  const chooseAgain = page.getByRole("button", { name: "选择 ZIP / JSON 预检", exact: true });
  await expect.soft(chooseAgain).toBeEnabled();
  if (await chooseAgain.isEnabled()) {
    await preflightBackupZip(page, bytes, "two-tab-recheck-after-r2.zip");
    await expect.soft(page.getByRole("checkbox", { name: /我已确认安全备份文件保存成功并可以打开/ })).not.toBeChecked();
    await expect.soft(page.getByRole("checkbox", { name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/ })).not.toBeChecked();
    await expect.soft(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toBeDisabled();
    const afterNewPreflight = await snapshot(page, testInfo, "two-tab-after-fresh-preflight");
    expect(afterNewPreflight.snapshotDigest).toBe(afterSecondWrite.snapshotDigest);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertPageBound(page);
  await secondPage.reload({ waitUntil: "domcontentloaded" });
  await assertPageBound(secondPage);
  const refreshedA = await snapshot(page, testInfo, "two-tab-a-refreshed");
  const refreshedB = await snapshot(secondPage, testInfo, "two-tab-b-refreshed");
  expect(refreshedA.snapshotDigest).toBe(afterSecondWrite.snapshotDigest);
  expect(refreshedB.snapshotDigest).toBe(afterSecondWrite.snapshotDigest);
  await page.goto(first.path);
  await waitForAppReady(page);
  await expect(page.getByRole("link", { name: "由此修订派生新版", exact: true })).toBeVisible();
  await page.goto(second.path);
  await waitForAppReady(page);
  await expect(page.getByRole("link", { name: "由此修订派生新版", exact: true })).toBeVisible();
});

test("a native abort after a nonempty attachment clear rolls back the real UI restore transaction", async ({ page }, testInfo) => {
  await createDemoCase(page);
  const first = revisionRoute(page);
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("事务导入源"));
  const { bytes } = await exportFullBackupZip(page);
  const incoming = await preflightFullBackupFile(new Uint8Array(bytes));
  const original = await snapshot(page, testInfo, "abort-source-r1");
  const second = await deriveSecondRevision(page, first);
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("事务当前保留"));
  const beforeRestore = await snapshot(page, testInfo, "abort-current-before-preflight");
  assertRevisionRelationship(beforeRestore, first, second, original);
  expect(beforeRestore.stores.find(item => item.storeName === "attachments")?.count).toBe(2);
  expect(incoming.payload.revisions).toHaveLength(1);
  expect(incoming.payload.attachments).toHaveLength(1);
  await preflightBackupZip(page, bytes, "abort-incoming-r1.zip");
  await prepareConfirmation(page, testInfo, "abort-safety-current-r2.zip");

  await page.evaluate((expectedStores) => {
    const prototype = IDBObjectStore.prototype;
    const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, "clear");
    if (!originalDescriptor || typeof originalDescriptor.value !== "function") throw new Error("Native IDB clear is unavailable.");
    const originalClear = originalDescriptor.value as IDBObjectStore["clear"];
    const proof: NativeAbortProof = {
      armed: true, targetStore: "attachments", attempted: 0, successfulClearEvents: 0,
      nativeAbortCalls: 0, nativeAbortEvents: 0, nativeCompleteEvents: 0,
      transactionStores: [], abortCallError: null, injectedUserRecords: 0
    };
    Object.defineProperty(window, "__hakimiLocalAbortProof", { value: proof, configurable: true });
    Object.defineProperty(prototype, "clear", {
      ...originalDescriptor,
      value: function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["clear"]>) {
        const transaction = this.transaction;
        const stores = Array.from(transaction.objectStoreNames).sort();
        const isTarget = proof.armed && this.name === "attachments"
          && transaction.db.name === "hakimi-bazi-research"
          && transaction.mode === "readwrite"
          && JSON.stringify(stores) === JSON.stringify([...expectedStores].sort());
        const request = Reflect.apply(originalClear, this, args);
        if (isTarget) {
          proof.armed = false;
          proof.attempted += 1;
          proof.transactionStores = stores;
          transaction.addEventListener("abort", () => { proof.nativeAbortEvents += 1; }, { once: true });
          transaction.addEventListener("complete", () => { proof.nativeCompleteEvents += 1; }, { once: true });
          request.addEventListener("success", () => {
            proof.successfulClearEvents += 1;
            try {
              transaction.abort();
              proof.nativeAbortCalls += 1;
            } catch (error) {
              proof.abortCallError = String(error);
            } finally {
              Object.defineProperty(prototype, "clear", originalDescriptor);
            }
          }, { once: true });
        }
        return request;
      }
    });
  }, beforeRestore.storeNames);

  await page.getByRole("button", { name: "确认替换并恢复", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__hakimiLocalAbortProof?.nativeAbortEvents ?? 0), { timeout: 30000 }).toBe(1);
  const outcomeText = await waitRecoveryOutcome(page);
  const proof = await page.evaluate(() => ({ ...window.__hakimiLocalAbortProof }));
  const afterAbort = await snapshot(page, testInfo, "abort-after-native-rollback");
  await attachJson(testInfo, "native-abort-proof", {
    ...proof, outcomeText,
    currentBeforeDigest: beforeRestore.snapshotDigest, afterAbortDigest: afterAbort.snapshotDigest,
    incomingPayloadDigest: incoming.digests.payload,
    faultInjection: "native IDBTransaction.abort after the application's own nonempty attachment clear succeeds",
    rawUserDataWritesByTest: false
  });
  await testInfo.attach("abort-ui", { body: await page.screenshot(), contentType: "image/png" });
  expect(proof).toMatchObject({
    attempted: 1, successfulClearEvents: 1, nativeAbortCalls: 1,
    nativeAbortEvents: 1, nativeCompleteEvents: 0, abortCallError: null, injectedUserRecords: 0
  });
  expect(afterAbort.snapshotDigest).toBe(beforeRestore.snapshotDigest);
  assertRevisionRelationship(afterAbort, first, second, original);
  expect.soft(outcomeText).not.toContain("完整恢复成功");
  const unknownOutcome = /提交结果未知|恢复结果未知/.test(outcomeText);
  expect.soft(outcomeText, "UI may report a confirmed failure or a locked unknown result")
    .toMatch(/恢复未完成|恢复事务已中止|事务已回滚|事务恢复失败|恢复已取消|提交结果未知|恢复结果未知/);
  let reopenedThroughUi = false;
  if (unknownOutcome) {
    const reopen = await assertUnknownRestoreGate(page, outcomeText, testInfo);
    if (await reopen.isVisible() && await reopen.isEnabled()) {
      await Promise.all([
        page.waitForEvent("domcontentloaded"),
        reopen.click()
      ]);
      reopenedThroughUi = true;
    } else {
      // Preserve independent data evidence after the failed UI-path assertion.
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    expect.soft(reopenedThroughUi, "Unknown outcome must provide a working UI reconciliation route").toBe(true);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await assertPageBound(page);
  const afterReopen = await snapshot(page, testInfo, "abort-after-reopen");
  expect(afterReopen.snapshotDigest).toBe(beforeRestore.snapshotDigest);
  assertRevisionRelationship(afterReopen, first, second, original);
  await openDataManagement(page);
  const exported = await exportFullBackupZip(page);
  const verified = await preflightFullBackupFile(new Uint8Array(exported.bytes));
  expect(verified.payload.revisions).toHaveLength(2);
  expect(verified.payload.attachments).toHaveLength(2);
  await attachJson(testInfo, "after-abort-export", {
    payloadDigest: verified.digests.payload, counts: verified.manifest.counts,
    uiOutcome: unknownOutcome ? "unknown_reconciliation_required" : "explicit_failure",
    reopenedThroughUi,
    semanticState: "complete_pre_restore_state_preserved_after_native_abort"
  });
});
