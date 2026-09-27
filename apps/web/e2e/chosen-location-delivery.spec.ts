import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import { collectConsoleProblems, createDemoCase, openDataManagement, waitForAppReady, waitForServiceWorker, exportFullBackupZip } from "./full-backup-helpers";
import { captureStorageV13NativeReadonlySnapshot } from "./storage-v13-native-readonly";
import { verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact";

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
test("chosen-location receipt shows native handle rename, validates written ZIP, and treats cancellation separately", async ({ page }, info) => {
  const artifact = await verifyLockedDefaultV13Artifact();
  const problems = collectConsoleProblems(page);
  await createDemoCase(page);
  await bound(page, artifact);
  await openDataManagement(page);
  const baseline = await savedBackup(page, info, "chosen-location-baseline.zip");
  const before = await snapshot(page, "before-chosen-location");
  // The OS picker alone is substituted; createWritable/write/close/getFile use
  // real browser FileSystemFileHandles in this isolated origin's OPFS.
  await page.evaluate(() => {
    const state = { name: null as string | null, cancel: false, selected: [] as string[] };
    (window as any).__deliveryPickerTest = state;
    (window as any).showSaveFilePicker = async (options: { suggestedName: string }) => {
      if (state.cancel) throw new DOMException("Synthetic user cancellation", "AbortError");
      const name = state.name ?? options.suggestedName;
      const directory = await navigator.storage.getDirectory();
      const handle = await directory.getFileHandle(name, { create: true });
      state.selected.push(handle.name);
      return handle;
    };
  });
  for (const [index, name] of [null, "我的研究备份.zip"].entries()) {
    await page.evaluate(value => { (window as any).__deliveryPickerTest.name = value; }, name);
    await page.getByRole("button", { name: "准备完整 ZIP", exact: true }).click();
    const dialog = page.locator('.prepared-delivery-dialog[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /保存到指定位置/ }).click();
    await expect(dialog.locator(".success-message")).toBeVisible();
    const selected = await page.evaluate(() => (window as any).__deliveryPickerTest.selected.at(-1) as string);
    if (name) expect(selected).toBe(name);
    await expect(dialog.locator(".success-message")).toHaveText(selected + " 已由当前平台确认写入。");
    const bytes = Buffer.from(await page.evaluate(async filename => {
      const directory = await navigator.storage.getDirectory();
      const handle = await directory.getFileHandle(filename);
      return Array.from(new Uint8Array(await (await handle.getFile()).arrayBuffer()));
    }, selected));
    const checked = await preflightFullBackupFile(new Uint8Array(bytes));
    expect(checked.digests.payload).toBe(baseline.checked.digests.payload);
    await fs.writeFile(info.outputPath("chosen-location-" + index + ".zip"), bytes, { flag: "wx" });
    await attach(info, "chosen-location-" + index, { actualFilename: selected,
      payloadDigest: checked.digests.payload, bytes: bytes.length, nativeFileHandle: true,
      nativeOsPickerAutomated: false });
    await dialog.screenshot({ path: info.outputPath("chosen-location-" + index + ".png") });
    await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  }
  await page.evaluate(() => { (window as any).__deliveryPickerTest.cancel = true; });
  await page.getByRole("button", { name: "准备完整 ZIP", exact: true }).click();
  const dialog = page.locator('.prepared-delivery-dialog[role="dialog"]');
  await dialog.getByRole("button", { name: /保存到指定位置/ }).click();
  await expect(dialog).toHaveAttribute("data-delivery-outcome", "cancelled");
  await expect(dialog.locator(".success-message")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /保存到指定位置/ })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__deliveryPickerTest.selected.length)).toBe(2);
  expect((await snapshot(page, "after-chosen-location")).stores).toEqual(before.stores);
  expect(problems).toEqual([]);
  await verifyLockedDefaultV13Artifact(artifact);
});
