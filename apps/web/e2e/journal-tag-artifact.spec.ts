import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  collectConsoleProblems, waitForAppReady, waitForServiceWorker, seedPortableData,
  portableFixture, exportFullBackupZip, preflightBackupZip, completeRestoreSafetyGate
} from "./full-backup-helpers";
import { captureStorageV13NativeReadonlySnapshot } from "./storage-v13-native-readonly";
import { verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact";
import { createReusableReleaseBrowser } from "./reusable-release-browser";

const origin = "http://127.0.0.1:4197";
const tags = ["边界", "甲、乙专题", "待核验"];
const sources = ["合成书名甲、乙 / 第一章", "另一条合成来源"];
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
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
async function dataPage(page: Page) {
  await page.goto(origin + "/settings/data");
  await waitForAppReady(page);
  await expect(page.getByRole("region", { name: "此浏览器中的十六个用户数据分区" })).not.toHaveAttribute("aria-busy", "true");
}
async function savedBackup(page: Page, info: TestInfo, name: string) {
  const exported = await exportFullBackupZip(page);
  const destination = info.outputPath(name);
  await expect(fs.access(destination)).rejects.toThrow();
  await exported.download.saveAs(destination);
  const bytes = await fs.readFile(destination);
  expect(sha256(bytes)).toBe(sha256(exported.bytes));
  const checked = await preflightFullBackupFile(new Uint8Array(bytes));
  await attach(info, name + "-file-proof", { sha256: sha256(bytes), size: bytes.length, payloadDigest: checked.digests.payload });
  return { bytes, checked };
}
async function snapshot(page: Page, phase: string) {
  return captureStorageV13NativeReadonlySnapshot(page, { captureId: "journal-tags-" + phase, operationId: "export", phase });
}

test("locked v13 preserves journal tags through two edits, native reopen, actual ZIP and isolated restore", async ({}, info) => {
  const artifact = await verifyLockedDefaultV13Artifact();
  const lifecycle: unknown[] = [];
  const problems: string[][] = [];
  const source = await createReusableReleaseBrowser(info.project.name, { observe: event => lifecycle.push(event) });
  const target = await createReusableReleaseBrowser(info.project.name, { observe: event => lifecycle.push(event) });
  let session: Awaited<ReturnType<typeof source.launch>> | undefined;
  let operationError: unknown;
  try {
    session = await source.launch();
    session.context.setDefaultTimeout(15_000);
    let page = await session.context.newPage();
    problems.push(collectConsoleProblems(page));
    await page.goto(origin + "/new?demo=1");
    await bound(page, artifact);
    for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.getByRole("button", { name: "生成命盘", exact: true }).click();
    await page.getByRole("button", { name: "保存并打开", exact: true }).click();
    await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
    const researchURL = page.url() + "?view=research";
    await page.goto(researchURL);
    await waitForAppReady(page);
    const noteEditor = page.getByRole("region", { name: "添加可检索研究笔记", exact: true });
    await noteEditor.getByLabel("锚定位置").selectOption("revision");
    await noteEditor.getByLabel(/Markdown 笔记/).fill("合成笔记原正文");
    await noteEditor.getByLabel("标签", { exact: true }).fill(tags.join("，"));
    await noteEditor.getByLabel("来源引用", { exact: true }).fill(sources.join("；"));
    await noteEditor.getByRole("button", { name: "保存笔记", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "研究笔记已保存到本地案例" })).toBeVisible();
    const eventEditor = page.getByRole("region", { name: "记录研究事件", exact: true });
    await eventEditor.getByLabel(/事件标题/).fill("合成标签往返事件");
    await eventEditor.getByLabel("日期精度").selectOption("unknown");
    await eventEditor.getByLabel("标签", { exact: true }).fill(tags.join("，"));
    await eventEditor.getByLabel("来源引用", { exact: true }).fill(sources.join("；"));
    await eventEditor.getByLabel("事件笔记", { exact: true }).fill("合成事件原正文");
    await eventEditor.getByRole("button", { name: "添加事件", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "事件已链接到当前案例与修订" })).toBeVisible();
    await dataPage(page);
    await seedPortableData(page, portableFixture("标签隔离验收"));
    const initial = await savedBackup(page, info, "before-edits.zip");
    expect(initial.checked.payload.cases).toHaveLength(1);
    expect(initial.checked.payload.revisions).toHaveLength(1);
    expect(initial.checked.payload.researchNotes).toHaveLength(1);
    expect(initial.checked.payload.events).toHaveLength(1);
    const originalNote = initial.checked.payload.researchNotes[0]!;
    const originalEvent = initial.checked.payload.events[0]!;
    expect(originalNote).toMatchObject({ tags, sourceRefs: sources, editVersion: 1,
      anchor: { kind: "revision", revisionId: initial.checked.payload.revisions[0]!.id } });
    expect(originalEvent).toMatchObject({ tags, sourceRefs: sources, revisionId: initial.checked.payload.revisions[0]!.id });

    for (let round = 1; round <= 2; round++) {
      await page.goto(researchURL);
      await waitForAppReady(page);
      await page.getByRole("button", { name: "编辑笔记", exact: true }).click();
      const note = page.getByRole("region", { name: "编辑研究笔记", exact: true });
      await expect(note.getByLabel("标签", { exact: true })).toHaveValue(tags.join("，"));
      await note.getByLabel(/Markdown 笔记/).fill("合成笔记正文修订 " + round);
      await note.getByRole("button", { name: "保存新版本", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "研究笔记已生成新编辑版本" })).toBeVisible();
      await page.getByRole("button", { name: "编辑事件", exact: true }).click();
      const event = page.getByRole("region", { name: "编辑研究事件", exact: true });
      await expect(event.getByLabel("标签", { exact: true })).toHaveValue(tags.join("，"));
      await event.getByLabel("事件笔记").fill("合成事件正文修订 " + round);
      await event.getByRole("button", { name: "保存事件修改", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "事件记录已更新" })).toBeVisible();
      await session.close(); session = undefined;
      session = await source.launch();
      session.context.setDefaultTimeout(15_000);
      page = await session.context.newPage();
      problems.push(collectConsoleProblems(page));
      await page.goto(researchURL);
      await bound(page, artifact);
      await expect(page.getByText("合成笔记正文修订 " + round, { exact: true })).toBeVisible();
      await expect(page.getByText("合成事件正文修订 " + round, { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath("reopened-journal.png"), fullPage: false });
    await dataPage(page);
    const beforeExport = await snapshot(page, "source");
    const final = await savedBackup(page, info, "after-reopen.zip");
    // Allowed changes are fixed before execution: note body/editVersion/updatedAt,
    // event body/updatedAt; ZIP envelope export time is outside payload. No other
    // persisted field or partition is omitted from equality.
    const note = final.checked.payload.researchNotes[0]!;
    const event = final.checked.payload.events[0]!;
    expect(Date.parse(note.updatedAt)).toBeGreaterThanOrEqual(Date.parse(originalNote.updatedAt));
    expect(Date.parse(event.updatedAt)).toBeGreaterThanOrEqual(Date.parse(originalEvent.updatedAt));
    expect(final.checked.payload).toEqual({ ...initial.checked.payload,
      researchNotes: [{ ...originalNote, body: "合成笔记正文修订 2", editVersion: 3, updatedAt: note.updatedAt }],
      events: [{ ...originalEvent, body: "合成事件正文修订 2", updatedAt: event.updatedAt }]
    });
    await preflightBackupZip(page, final.bytes, "after-reopen.zip");
    expect((await snapshot(page, "after-preflight")).stores).toEqual(beforeExport.stores);
    await session.close(); session = undefined;

    session = await target.launch();
    session.context.setDefaultTimeout(15_000);
    page = await session.context.newPage();
    problems.push(collectConsoleProblems(page));
    await dataPage(page);
    await bound(page, artifact);
    expect((await snapshot(page, "fresh-target")).stores.every(store => store.count === 0)).toBe(true);
    await preflightBackupZip(page, final.bytes, "after-reopen.zip");
    await completeRestoreSafetyGate(page);
    const restored = await snapshot(page, "restored");
    expect(restored.stores).toEqual(beforeExport.stores);
    const restoredBackup = await savedBackup(page, info, "restored.zip");
    expect(restoredBackup.checked.payload).toEqual(final.checked.payload);
    expect(restoredBackup.checked.digests.payload).toBe(final.checked.digests.payload);
    await page.goto(researchURL);
    await bound(page, artifact);
    await expect(page.getByText("合成笔记正文修订 2", { exact: true })).toBeVisible();
    await expect(page.getByText("合成事件正文修订 2", { exact: true })).toBeVisible();
    expect(problems.flat()).toEqual([]);
    await session.close(); session = undefined;
    await verifyLockedDefaultV13Artifact(artifact);
    await attach(info, "same-artifact-proof", { artifact, sourceProfile: source.profileDirectory,
      targetProfile: target.profileDirectory, stores: beforeExport.stores, restored: restored.stores,
      payloadDigest: final.checked.digests.payload, noteId: note.id, eventId: event.id, tags, sources,
      nativeReopens: 2, formalReleaseEvidenceReceipt: false });
  } catch (error) {
    operationError = error;
    if (session) {
      for (const [index, page] of session.context.pages().entries()) {
        if (!page.url().startsWith(origin)) continue;
        await page.screenshot({ path: info.outputPath(`owned-page-failure-${index}.png`) });
        await attach(info, "owned-page-failure", { url: page.url(), problems,
          editors: await page.locator(".research-editor-section").allTextContents() });
      }
    }
    throw error;
  }
  finally {
    try { if (session) await session.close(); }
    catch (error) {
      if (operationError) throw new AggregateError([operationError, error], "Journal validation and browser cleanup failed.");
      throw error;
    } finally { await attach(info, "owned-browser-lifecycle", lifecycle); }
  }
});
