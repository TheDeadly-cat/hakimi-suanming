import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Download, type Page } from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";

import {
  STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES,
  STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES,
  STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES,
  loadVerifiedDeployedPwaCandidateArtifact,
  parseStorageV13MatrixCandidateEnvironment,
  prepareCandidateProjectOutput,
  revalidateDeployedPwaCandidateArtifactIdentity,
  writeStorageV13MatrixBrowserCandidate,
  type StorageV13MatrixDownloadObservation,
  type StorageV13MatrixOperationObservation
} from "../../../scripts/storage-v13-matrix-candidate-runtime.mjs";
import { pageReleaseEvidence } from "./cross-schema-upgrade-helpers.ts";
import {
  collectConsoleProblems,
  createDemoCase,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedPortableData,
  waitForAppReady
} from "./full-backup-helpers.ts";
import { requireReleaseBrowserRuntimeProduct } from "./release-browser-persistent-context.ts";
import {
  captureStorageV13NativeReadonlySnapshot,
  type StorageV13NativeReadonlySnapshot
} from "./storage-v13-native-readonly.ts";

type BrowserProjectName = "msedge" | "chrome";

const candidate = parseStorageV13MatrixCandidateEnvironment(process.env);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJsonValue(value: unknown, ancestors = new WeakSet<object>()): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Canonical multiset digest refuses non-finite numbers.");
  }
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (typeof value !== "object") {
    throw new Error(`Canonical multiset digest refuses ${typeof value} values.`);
  }
  if (ancestors.has(value)) throw new Error("Canonical multiset digest refuses cycles.");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const output = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new Error("Canonical multiset digest refuses sparse arrays.");
        }
        output.push(canonicalJsonValue(value[index], ancestors));
      }
      if (Object.keys(value).length !== value.length) {
        throw new Error("Canonical multiset digest refuses named array properties.");
      }
      return output;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error("Canonical multiset digest accepts only plain objects.");
    }
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new Error("Canonical multiset digest refuses accessors.");
      }
      if (descriptor.value !== undefined) {
        output[key] = canonicalJsonValue(descriptor.value, ancestors);
      }
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value));
}

function canonicalMultisetDigest(values: readonly unknown[]): string {
  const canonicalEntries = values.map((value) => canonicalJson(value)).sort();
  return sha256(new TextEncoder().encode(canonicalJson(canonicalEntries)));
}

function assertCanonicalMultisetConformance(): void {
  const values = [
    { z: 1, a: "alpha" },
    { b: 0, a: [3, { y: true, x: null }] }
  ];
  const expected = "21b981965002c9b2658e08a8b9906de26963d9409f63e26ad11e6f3c4b7e70a6";
  expect(canonicalMultisetDigest(values)).toBe(expected);
  expect(canonicalMultisetDigest([...values].reverse())).toBe(expected);

  const utf16OrdinalValues = ["\u{10000}", "\uE000"];
  const utf16OrdinalExpected =
    "899793e09b1db200cde7180f3e52dcb63aadfc97c090734c2b0bad6648e9b4e2";
  expect([...utf16OrdinalValues].sort()).toEqual(utf16OrdinalValues);
  expect(canonicalMultisetDigest(utf16OrdinalValues)).toBe(utf16OrdinalExpected);
  expect(canonicalMultisetDigest([...utf16OrdinalValues].reverse()))
    .toBe(utf16OrdinalExpected);
}

function comparablePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function sameBigIntIdentity(
  left: Readonly<{
    dev: bigint;
    ino: bigint;
    birthtimeNs: bigint;
    mtimeNs: bigint;
    ctimeNs: bigint;
  }>,
  right: Readonly<{
    dev: bigint;
    ino: bigint;
    birthtimeNs: bigint;
    mtimeNs: bigint;
    ctimeNs: bigint;
  }>
): boolean {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function noDownload(): StorageV13MatrixDownloadObservation {
  return Object.freeze({
    observed: false,
    eventCount: 0,
    size: null,
    sha256: null,
    suggestedFilename: null
  });
}

async function downloadedArtifact(download: Download): Promise<Readonly<{
  bytes: Buffer;
  observation: StorageV13MatrixDownloadObservation;
}>> {
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("STORAGE_V13_MATRIX_DOWNLOAD_PATH_MISSING");
  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/u);
  const handle = await open(downloadPath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(downloadPath, { bigint: true }),
      realpath(downloadPath)
    ]);
    expect(handleBefore.isFile()).toBe(true);
    expect(pathBefore.isFile()).toBe(true);
    expect(pathBefore.isSymbolicLink()).toBe(false);
    expect(handleBefore.nlink).toBe(1n);
    expect(pathBefore.nlink).toBe(1n);
    expect(sameBigIntIdentity(handleBefore, pathBefore)).toBe(true);
    expect(comparablePath(resolvedBefore)).toBe(comparablePath(downloadPath));
    expect(handleBefore.size > 0n).toBe(true);
    expect(handleBefore.size <= BigInt(STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES)).toBe(true);

    const expectedSize = Number(handleBefore.size);
    const bytes = Buffer.alloc(expectedSize);
    let offset = 0;
    while (offset < expectedSize) {
      const { bytesRead } = await handle.read(bytes, offset, expectedSize - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const overflowProbe = Buffer.alloc(1);
    const { bytesRead: overflowBytesRead } = await handle.read(overflowProbe, 0, 1, expectedSize);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(downloadPath, { bigint: true }),
      realpath(downloadPath)
    ]);
    expect(offset).toBe(expectedSize);
    expect(overflowBytesRead).toBe(0);
    expect(sameBigIntIdentity(handleBefore, handleAfter)).toBe(true);
    expect(sameBigIntIdentity(handleAfter, pathAfter)).toBe(true);
    expect(handleAfter.size).toBe(handleBefore.size);
    expect(pathAfter.size).toBe(handleBefore.size);
    expect(handleAfter.nlink).toBe(1n);
    expect(pathAfter.nlink).toBe(1n);
    expect(pathAfter.isSymbolicLink()).toBe(false);
    expect(comparablePath(resolvedAfter)).toBe(comparablePath(downloadPath));
    const firstDigest = sha256(bytes);
    const verificationHash = createHash("sha256");
    const verificationChunk = Buffer.alloc(1024 * 1024);
    let verificationOffset = 0;
    while (verificationOffset < expectedSize) {
      const requested = Math.min(verificationChunk.byteLength, expectedSize - verificationOffset);
      const { bytesRead } = await handle.read(
        verificationChunk,
        0,
        requested,
        verificationOffset
      );
      if (bytesRead === 0) break;
      verificationHash.update(verificationChunk.subarray(0, bytesRead));
      verificationOffset += bytesRead;
    }
    const secondOverflowProbe = Buffer.alloc(1);
    const { bytesRead: secondOverflowBytesRead } = await handle.read(
      secondOverflowProbe,
      0,
      1,
      expectedSize
    );
    const [handleFinal, pathFinal, resolvedFinal] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(downloadPath, { bigint: true }),
      realpath(downloadPath)
    ]);
    expect(verificationOffset).toBe(expectedSize);
    expect(secondOverflowBytesRead).toBe(0);
    expect(verificationHash.digest("hex")).toBe(firstDigest);
    expect(sameBigIntIdentity(handleBefore, handleFinal)).toBe(true);
    expect(sameBigIntIdentity(handleFinal, pathFinal)).toBe(true);
    expect(handleFinal.size).toBe(handleBefore.size);
    expect(pathFinal.size).toBe(handleBefore.size);
    expect(handleFinal.nlink).toBe(1n);
    expect(pathFinal.nlink).toBe(1n);
    expect(pathFinal.isSymbolicLink()).toBe(false);
    expect(comparablePath(resolvedFinal)).toBe(comparablePath(downloadPath));
    return Object.freeze({
      bytes,
      observation: Object.freeze({
        observed: true,
        eventCount: 1,
        size: bytes.byteLength,
        sha256: firstDigest,
        suggestedFilename
      })
    });
  } finally {
    await handle.close();
  }
}

async function deliverPreparedDownload(page: Page): Promise<Readonly<{
  bytes: Buffer;
  observation: StorageV13MatrixDownloadObservation;
}>> {
  const dialog = page.getByRole("dialog", { name: "待交付文件已在本机生成" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-share-policy", "blocked_sensitive");
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /^下载文件/u }).click();
  const result = await downloadedArtifact(await downloadPromise);
  await expect.poll(() => dialog.getAttribute("data-delivery-outcome"))
    .toMatch(/^(?:completed|requested)$/u);
  if (await dialog.getAttribute("data-delivery-outcome") === "requested") {
    await dialog.getByRole("button", { name: "已核对，允许再次下载" }).click();
  }
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return result;
}

async function exportCurrentFullBackup(page: Page) {
  await page.getByRole("button", { name: "准备完整 ZIP", exact: true }).click();
  const result = await deliverPreparedDownload(page);
  expect([...result.bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(result.observation.suggestedFilename).toMatch(
    /^hakimi-full-backup-\d{4}-\d{2}-\d{2}\.zip$/u
  );
  await expect(page.getByRole("status").filter({ hasText: "完整 ZIP 已生成并请求下载" }))
    .toBeVisible();
  return result;
}

async function prepareSafetyBackupAndRestore(
  page: Page,
  restoreTargetBackup: NonNullable<StorageV13MatrixOperationObservation["backup"]>
) {
  await page.getByRole("button", { name: "先准备当前安全备份", exact: true }).click();
  const safety = await deliverPreparedDownload(page);
  expect([...safety.bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(safety.observation.suggestedFilename).toMatch(
    /^hakimi-before-restore-\d{4}-\d{2}-\d{2}\.zip$/u
  );
  const safetyPreflight = await preflightFullBackupFile(new Uint8Array(safety.bytes));
  const safetyBackup = logicalBackupProjection(safetyPreflight);
  expect(safetyBackup.payloadDigest).not.toBe(restoreTargetBackup.payloadDigest);
  await page.getByRole("checkbox", {
    name: /我已确认安全备份文件保存成功并可以打开/u
  }).check();
  await page.getByRole("checkbox", {
    name: /我理解恢复会替换此浏览器中的全部十六个用户数据分区/u
  }).check();
  const restoreButton = page.getByRole("button", { name: "确认替换并恢复", exact: true });
  await expect(restoreButton).toBeEnabled();
  return { safety, safetyBackup, restoreButton };
}

async function deriveDemoRevision(page: Page) {
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存为新修订并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/iu);
  await waitForAppReady(page);
}

async function trashCase(page: Page, caseId: string) {
  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const row = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await row.getByRole("button", {
    name: "移入回收站案例 演示案例 · 辰时研究",
    exact: true
  }).click();
  await expect(page.getByText(/已将案例“演示案例 · 辰时研究”移入回收站/u)).toBeVisible();
}

async function permanentlyDeleteTrashedCase(page: Page, caseId: string) {
  const trashScope = page.getByRole("button", { name: "回收站", exact: true });
  await trashScope.click();
  const row = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await row.getByRole("button", {
    name: "永久删除案例 演示案例 · 辰时研究",
    exact: true
  }).click();
  const confirmation = page.getByRole("group", {
    name: "永久删除“演示案例 · 辰时研究”？"
  });
  await confirmation.getByRole("button", { name: "永久删除案例", exact: true }).click();
  await expect(page.getByText(/已永久删除案例“演示案例 · 辰时研究”/u)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: caseId.slice(0, 8) })).toHaveCount(0);
}

async function mutatePortableProfileAndSettings(page: Page) {
  const profile = page.getByRole("region", { name: "研究者资料" });
  await profile.getByLabel("显示名称").fill("仓储矩阵恢复前变更");
  await profile.getByLabel("机构（可选）").fill("仅用于锁定产物恢复差异");
  await profile.getByLabel("研究方向（可选）").fill("该变更必须被完整恢复替换");
  await profile.getByRole("button", { name: "保存研究者资料", exact: true }).click();
  await expect(profile.getByRole("status")).toContainText("研究者资料已保存");

  const settings = page.getByRole("region", { name: "本机研究偏好" });
  await settings.getByLabel("默认 IANA 时区").fill("Asia/Shanghai");
  await settings.getByLabel("默认历法").selectOption("gregorian");
  await settings.getByLabel("信息密度").selectOption("comfortable");
  await settings.getByRole("button", { name: "保存本机偏好", exact: true }).click();
  await expect(settings.getByRole("status")).toContainText("本机偏好已保存");
}

function logicalBackupProjection(preflight: Awaited<ReturnType<typeof preflightFullBackupFile>>) {
  const rawCounts = preflight.manifest.counts as unknown as Record<string, number>;
  const counts = Object.fromEntries(
    STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES.map((name) => [name, rawCounts[name]])
  );
  expect(Object.values(counts).every((count) => Number.isSafeInteger(count) && count >= 0)).toBe(true);
  expect(counts.revisionCalculationReceipts).toBe(0);
  expect(Object.hasOwn(counts, "birthFingerprints")).toBe(false);
  const payload = preflight.payload as unknown as Record<string, readonly unknown[]>;
  const sharedPartitionContentDigests = Object.fromEntries(
    STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.map((name) => {
      if (!Object.hasOwn(payload, name) || !Array.isArray(payload[name])) {
        throw new Error(`Preflight payload is missing shared partition ${name}.`);
      }
      return [name, canonicalMultisetDigest(payload[name])];
    })
  );
  return Object.freeze({
    formatVersion: String(preflight.manifest.formatVersion),
    payloadDigest: preflight.digests.payload,
    logicalPartitionNames: Object.freeze([...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES]),
    counts: Object.freeze(counts),
    sharedPartitionContentDigests: Object.freeze(sharedPartitionContentDigests)
  });
}

function observation(
  operationId: StorageV13MatrixOperationObservation["operationId"],
  uiPath: string,
  captures: readonly StorageV13NativeReadonlySnapshot[],
  download: StorageV13MatrixDownloadObservation = noDownload(),
  backup: StorageV13MatrixOperationObservation["backup"] = null,
  safetyBackup: StorageV13MatrixOperationObservation["safetyBackup"] = null
): StorageV13MatrixOperationObservation {
  return Object.freeze({
    operationId,
    status: "observed_pass",
    uiPath,
    observationMethod: "native_indexeddb_readonly_v2",
    captures: Object.freeze([...captures]),
    download,
    backup,
    safetyBackup
  });
}

test("锁定 default-v13 产物只生成关闭态正式仓储子集候选", async ({ page, context, baseURL }, testInfo) => {
  assertCanonicalMultisetConformance();
  test.setTimeout(300_000);
  expect(baseURL).toBe(candidate.origin);
  const projectName = testInfo.project.name as BrowserProjectName;
  expect(["msedge", "chrome"]).toContain(projectName);
  expect(testInfo.project.metadata).toMatchObject({
    evidenceClass: "untrusted_storage_v13_matrix_candidate_v2",
    formalReleaseEvidenceReceipt: false,
    releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null }
  });

  const artifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const preparedOutput = await prepareCandidateProjectOutput({
    candidateEnvironment: candidate,
    bindingRoot: candidate.bindingRoot,
    outputRoot: candidate.outputRoot,
    artifactRoot: candidate.artifactRoot,
    projectName
  });
  const startedAt = new Date().toISOString();
  const consoleProblems = collectConsoleProblems(page);
  const unexpectedExternalRequests = new Set<string>();
  context.on("request", (request) => {
    try {
      const target = new URL(request.url());
      if (["http:", "https:", "ws:", "wss:"].includes(target.protocol)) {
        const sameOrigin = target.protocol === "https:"
          ? target.origin === candidate.origin
          : target.protocol === "wss:" && `https://${target.host}` === candidate.origin;
        if (!sameOrigin) unexpectedExternalRequests.add(request.url());
      }
    } catch {
      unexpectedExternalRequests.add(request.url());
    }
  });
  const downloadEvents: Download[] = [];
  page.on("download", (download) => downloadEvents.push(download));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const pageIdentity = await pageReleaseEvidence(page);
  expect(pageIdentity).toMatchObject({
    appBootReady: "true",
    dbGeneration: "legacy-v13",
    dbSchema: "13",
    evidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    descriptor: artifact.descriptor
  });
  const productSession = await context.newCDPSession(page);
  const product = await productSession.send("Browser.getVersion");
  await productSession.detach();
  const actualProduct = requireReleaseBrowserRuntimeProduct(projectName, product.product);

  let captureSequence = 0;
  const capture = (
    operationId: StorageV13MatrixOperationObservation["operationId"],
    phase: string
  ) => captureStorageV13NativeReadonlySnapshot(page, {
    captureId: `${candidate.runId}-${projectName}-${String(++captureSequence).padStart(2, "0")}`,
    operationId,
    phase
  });

  const createBefore = await capture("create", "before_ui_write");
  await createDemoCase(page);
  const firstRevisionPath = new URL(page.url()).pathname;
  const caseId = firstRevisionPath.split("/")[2];
  expect(caseId).toMatch(/^[0-9a-f-]{36}$/u);
  const createAfter = await capture("create", "after_ui_write");

  const editBefore = await capture("edit", "before_ui_write");
  await deriveDemoRevision(page);
  const editAfter = await capture("edit", "after_ui_write");

  const deleteBefore = await capture("delete", "before_trash");
  await trashCase(page, caseId);
  const deleteTrashed = await capture("delete", "after_trash_before_permanent_delete");
  await permanentlyDeleteTrashedCase(page, caseId);
  const deleteAfter = await capture("delete", "after_permanent_delete");

  await createDemoCase(page);
  await openDataManagement(page);
  await seedPortableData(page, portableFixture("仓储矩阵"));
  const exportBefore = await capture("export", "before_ui_read");
  const downloadsBeforeExport = downloadEvents.length;
  const exportDownload = await exportCurrentFullBackup(page);
  expect(downloadEvents.length - downloadsBeforeExport).toBe(1);
  const exportPreflight = await preflightFullBackupFile(new Uint8Array(exportDownload.bytes));
  const backup = logicalBackupProjection(exportPreflight);
  const exportAfter = await capture("export", "after_ui_read");

  const restoreBaseline = await capture("restore", "backup_baseline");
  await mutatePortableProfileAndSettings(page);
  const restoreBeforePreflight = await capture("restore", "before_preflight");
  await preflightBackupZip(page, exportDownload.bytes, "storage-v13-matrix-candidate.zip");
  const restoreAfterPreflight = await capture("restore", "after_preflight");
  const downloadsBeforeSafetyBackup = downloadEvents.length;
  const { safety, safetyBackup, restoreButton } = await prepareSafetyBackupAndRestore(
    page,
    backup
  );
  expect(downloadEvents.length - downloadsBeforeSafetyBackup).toBe(1);
  const restoreBeforeCommit = await capture("restore", "before_commit");
  await restoreButton.click();
  await expect(page.getByRole("status").filter({ hasText: "完整恢复成功" })).toBeVisible();
  const restoreAfterCommit = await capture("restore", "after_commit");

  await preflightBackupZip(page, exportDownload.bytes, "storage-v13-matrix-cancel.zip");
  const cancelBefore = await capture("cancel", "before_cancel");
  const downloadsBeforeCancel = downloadEvents.length;
  await page.getByRole("button", { name: "取消恢复", exact: true }).click();
  await expect(page.getByRole("heading", { name: "预检通过，尚未写入" })).toHaveCount(0);
  await expect.poll(() => downloadEvents.length).toBe(downloadsBeforeCancel);
  const cancelAfter = await capture("cancel", "after_cancel");
  expect(downloadEvents.length).toBe(2);

  expect(consoleProblems).toEqual([]);
  expect([...unexpectedExternalRequests].sort()).toEqual([]);
  const stableArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(candidate, artifact);
  const completedAt = new Date().toISOString();
  await writeStorageV13MatrixBrowserCandidate({
    candidateEnvironment: candidate,
    preparedOutput,
    runId: candidate.runId,
    targetOrigin: candidate.origin,
    initialArtifact: artifact,
    finalArtifact: stableArtifact,
    projectName,
    browserChannel: projectName,
    actualProduct,
    pageIdentity,
    operationObservations: [
      observation("create", "new-demo-save", [createBefore, createAfter]),
      observation("edit", "derive-revision-save", [editBefore, editAfter]),
      observation(
        "delete",
        "cases-trash-permanent-delete",
        [deleteBefore, deleteTrashed, deleteAfter]
      ),
      observation(
        "export",
        "settings-data-full-zip",
        [exportBefore, exportAfter],
        exportDownload.observation,
        backup
      ),
      observation(
        "restore",
        "settings-data-preflight-safety-gate-restore",
        [
          restoreBaseline,
          restoreBeforePreflight,
          restoreAfterPreflight,
          restoreBeforeCommit,
          restoreAfterCommit
        ],
        safety.observation,
        backup,
        safetyBackup
      ),
      observation(
        "cancel",
        "settings-data-restore-preflight-cancel",
        [cancelBefore, cancelAfter]
      )
    ],
    deferredBoundaries: [
      {
        boundaryId: "two-tab",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "DEDICATED_MULTI_TAB_WRITE_COORDINATION_MATRIX_REQUIRED"
      },
      {
        boundaryId: "transaction-failure",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "STORAGE_TRANSACTION_ABORT_RUNTIME_MATRIX_REQUIRED"
      },
      {
        boundaryId: "read-only-recovery",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "REAL_OLD_V13_ARTIFACT_RECOVERY_REQUIRED"
      },
      {
        boundaryId: "cross-schema-no-backwrite",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "V13_TO_V16_SHADOW_AND_NO_REVERSE_MIGRATION_RUNTIME_MATRIX_REQUIRED"
      }
    ],
    unexpectedExternalRequestCount: unexpectedExternalRequests.size,
    startedAt,
    completedAt
  });
});
