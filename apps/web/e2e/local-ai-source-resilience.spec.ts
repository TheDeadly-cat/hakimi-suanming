import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect, chromium, type BrowserContext, type Page, type Request, type TestInfo } from "@playwright/test";
import type { BaziInterpretationAiAssertionDraftV2, BaziInterpretationAiAssertionDraftItem, BaziInterpretationEvidenceEnvelopeV2, BaziInterpretationEvidenceFact } from "@hakimi/bazi-interpretation";
import { preflightFullBackupFile } from "@hakimi/backup";
import { canonicalStringify } from "@hakimi/integrity";
import {
  createDemoCase, openDataManagement, exportFullBackupZip, preflightBackupZip,
  waitForAppReady, waitForServiceWorker
} from "./full-backup-helpers.ts";
import {
  releasePersistentContextOptionsForProject, requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context.ts";
import {
  captureStorageV13NativeReadonlySnapshot, STORAGE_V13_PHYSICAL_STORE_NAMES, type StorageV13NativeReadonlySnapshot
} from "./storage-v13-native-readonly.ts";
import { verifyLockedDefaultV13Artifact, type LockedDefaultV13Artifact } from "./locked-default-v13-artifact.ts";

// Preserve the original two-scenario diagnostic timeout when sharing the local config.
test.setTimeout(300_000);
// These two persistent-context flows save their own trace in withProfile.
test.use({ trace: "off" });

type RevisionRoute = { caseId: string; revisionId: string; pathname: string };
type Observations = Record<"requests" | "responses" | "requestFailures" | "console" | "pageErrors" | "unexpected" | "sourceNavigations", Array<Record<string, unknown>>>;
type ProfileFlow = (input: { page: Page; context: BrowserContext; observations: Observations; armSourceFailure(): void }) => Promise<void>;
type UiContextPacket = {
  binding: Pick<BaziInterpretationEvidenceEnvelopeV2["binding"], "revisionId" | "revisionNumber" | "revisionResultHash"> & {
    system: "bazi"; envelopeV2PayloadSha256: string;
  };
  envelope: BaziInterpretationEvidenceEnvelopeV2;
};
type MutableDraft = Omit<BaziInterpretationAiAssertionDraftV2, "legacyDraft"> & {
  legacyDraft: Omit<BaziInterpretationAiAssertionDraftV2["legacyDraft"], "assertions"> & {
    assertions: BaziInterpretationAiAssertionDraftItem[];
  };
};
type PreparedAi = { packet: UiContextPacket; positiveText: string; fact: BaziInterpretationEvidenceFact & { value: string } };
const artifacts = new WeakMap<BrowserContext, LockedDefaultV13Artifact>();

const origin = "http://127.0.0.1:4197";
const sourceUrl = "https://source-outage.invalid/t7/source";
const sourceTitle = "T7 合成私有来源故障样本";
const sourceFilename = "t7-private-source.md";
const sourceContent = "# T7 合成私有来源故障样本\n这是仅用于本机 UI 验证的自写样本，不构成任何专家或来源资格。\n";
const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, { body: Buffer.from(JSON.stringify(value, null, 2)), contentType: "application/json" });
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const destination = testInfo.outputPath(name + ".png");
  await page.screenshot({ path: destination, fullPage: false });
  await testInfo.attach(name, { path: destination, contentType: "image/png" });
}

async function assertArtifact(page: Page) {
  const expected = artifacts.get(page.context());
  if (!expected) throw new Error("The current test has no verified locked-artifact baseline.");
  await waitForAppReady(page);
  const actual = await page.evaluate(() => {
    const meta = (name: string) => document.querySelector('meta[name="' + name + '"]')?.getAttribute("content");
    return {
      evidenceId: meta("hakimi-release-evidence-id"), buildVersion: meta("hakimi-build-version"),
      descriptor: JSON.parse(meta("hakimi-release-database") ?? "null"),
      generation: document.documentElement.dataset.dbGeneration,
      schema: document.documentElement.dataset.dbSchema
    };
  });
  expect(actual).toEqual({
    evidenceId: expected.evidenceId, buildVersion: expected.buildVersion,
    descriptor: expected.descriptor, generation: "legacy-v13", schema: "13"
  });
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
}

async function snapshot(page: Page, testInfo: TestInfo, phase: string) {
  const value = await captureStorageV13NativeReadonlySnapshot(page, {
    captureId: testInfo.project.name + "-" + phase, operationId: "export", phase
  });
  expect(value.physicalVersion).toBe(130);
  expect(value.dexieVersion).toBe(13);
  expect(value.transactionMode).toBe("readonly");
  expect(value.storeNames).toEqual([...STORAGE_V13_PHYSICAL_STORE_NAMES].sort());
  await attachJson(testInfo, phase, value);
  return value;
}

function unchanged(before: StorageV13NativeReadonlySnapshot, after: StorageV13NativeReadonlySnapshot) {
  expect(after.databaseName).toBe(before.databaseName);
  expect(after.physicalVersion).toBe(before.physicalVersion);
  expect(after.dexieVersion).toBe(before.dexieVersion);
  expect(after.storeNames).toEqual(before.storeNames);
  expect(after.stores).toEqual(before.stores);
  expect(after.semanticWitness).toEqual(before.semanticWitness);
  expect(after.snapshotDigest).toBe(before.snapshotDigest);
}

function revisionRoute(page: Page): RevisionRoute {
  const match = new URL(page.url()).pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  if (!match) throw new Error("The UI did not open an exact saved Case/Revision route.");
  return { caseId: match[1], revisionId: match[2], pathname: new URL(page.url()).pathname };
}

async function withProfile(testInfo: TestInfo, allowSourceFailure: boolean, flow: ProfileFlow) {
  const artifact = await verifyLockedDefaultV13Artifact();
  await attachJson(testInfo, "locked-artifact-before", artifact);
  const profile = await mkdtemp(path.join(os.tmpdir(), "hakimi-local-ai-source-"));
  const context = await chromium.launchPersistentContext(profile, {
    ...releasePersistentContextOptionsForProject(testInfo.project.name), baseURL: origin
  });
  artifacts.set(context, artifact);
  const observations: Observations = { requests: [], responses: [], requestFailures: [], console: [], pageErrors: [], unexpected: [], sourceNavigations: [] };
  const requestIds = new WeakMap<Request, number>();
  let requestSequence = 0;
  let sourceFailureArmed = false;
  let mainPage: Page | undefined;
  let tracingStarted = false;
  const recordUnexpected = (kind: string, detail: Record<string, unknown>) => observations.unexpected.push({ kind, ...detail });
  const observePage = (page: Page) => {
    page.on("pageerror", error => {
      const entry = { url: page.url(), message: error.message, stack: error.stack };
      observations.pageErrors.push(entry);
      recordUnexpected("pageerror", entry);
    });
    page.on("websocket", socket => recordUnexpected("websocket", { url: socket.url() }));
  };
  context.on("page", observePage);
  context.pages().forEach(observePage);
  context.on("request", request => {
    const id = ++requestSequence;
    requestIds.set(request, id);
    const data = request.postDataBuffer();
    observations.requests.push({
      id, url: request.url(), method: request.method(), resourceType: request.resourceType(),
      navigation: request.isNavigationRequest(), postDataBytes: data?.length ?? 0,
      postDataSha256: data ? sha256(data) : null
    });
  });
  context.on("response", response => {
    const request = response.request();
    const entry = { requestId: requestIds.get(request), url: response.url(), status: response.status(), fromServiceWorker: response.fromServiceWorker() };
    observations.responses.push(entry);
    if (response.status() >= 400 && !(sourceFailureArmed && response.url() === sourceUrl && response.status() === 503)) {
      recordUnexpected("http-response", entry);
    }
  });
  context.on("requestfailed", request => {
    const entry = { requestId: requestIds.get(request), url: request.url(), failure: request.failure()?.errorText ?? "unknown" };
    observations.requestFailures.push(entry);
    recordUnexpected("requestfailed", entry);
  });
  context.on("console", message => {
    const entry = { type: message.type(), text: message.text(), location: message.location(), pageUrl: message.page()?.url() ?? null };
    const expected = sourceFailureArmed && entry.location.url === sourceUrl
      && entry.type === "error" && /Failed to load resource:.*503/.test(entry.text);
    observations.console.push({ ...entry, expected });
    if ((entry.type === "error" || entry.type === "warning") && !expected) recordUnexpected("console", entry);
  });
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (allowSourceFailure && sourceFailureArmed && url.href === sourceUrl) {
        const entry = { url: url.href, method: request.method(), navigation: request.isNavigationRequest(), resourceType: request.resourceType(), actualExternalForwarding: false, suppliedStatus: 503 };
        observations.sourceNavigations.push(entry);
        if (!entry.navigation || entry.method !== "GET" || entry.resourceType !== "document") recordUnexpected("unexpected-source-request-shape", entry);
        await route.fulfill({
          status: 503, contentType: "text/html; charset=utf-8",
          headers: { "cache-control": "no-store" },
          body: '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>T7 受控来源不可用</title></head><body><h1>来源页面暂不可用</h1><p>HTTP 503 · 本地测试拦截器返回的合成故障；没有转发至外网。</p></body></html>'
        });
        return;
      }
      if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
        recordUnexpected("blocked-external-request", { url: url.href });
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    mainPage = context.pages()[0] ?? await context.newPage();
    mainPage.setDefaultTimeout(20000);
    const cdp = await context.newCDPSession(mainPage);
    const version = await cdp.send("Browser.getVersion");
    await cdp.detach();
    const runtime = requireReleaseBrowserRuntimeProduct(testInfo.project.name, version.product);
    await attachJson(testInfo, "runtime-and-scope", {
      runtime, profile, sourceFailureAllowed: allowSourceFailure,
      isolation: "new short persistent profile, no imported user storage state",
      artifact,
      providerFailureVerified: false, actualExternalCallsAuthorized: false,
      realExternalAvailabilityVerified: false, formalReleaseEvidenceReceipt: false,
      publicReleaseAuthorized: false, rawIDBRecordWritesByTest: false
    });
    await mainPage.goto(origin + "/", { waitUntil: "domcontentloaded" });
    await waitForAppReady(mainPage);
    await waitForServiceWorker(mainPage);
    await assertArtifact(mainPage);
    const initial = await snapshot(mainPage, testInfo, "fresh-profile-empty");
    expect(initial.semanticWitness.cases).toHaveLength(0);
    expect(initial.semanticWitness.revisions).toHaveLength(0);
    expect(observations.unexpected, "Startup must be clean").toEqual([]);
    await flow({ page: mainPage, context, observations, armSourceFailure: () => { sourceFailureArmed = true; } });
    await assertArtifact(mainPage);
  } finally {
    if (mainPage && !mainPage.isClosed()) {
      try { await screenshot(mainPage, testInfo, "final-main-page"); }
      catch (error) { await attachJson(testInfo, "screenshot-error", { message: String(error) }); }
      try { await attachJson(testInfo, "final-main-page-accessibility", { snapshot: await mainPage.locator("body").ariaSnapshot() }); }
      catch (error) { await attachJson(testInfo, "accessibility-capture-error", { message: String(error) }); }
    }
    await attachJson(testInfo, "all-network-console-observations", observations);
    await attachJson(testInfo, "preserved-profile", { profile, preserved: true });
    try {
      if (tracingStarted) {
        const tracePath = testInfo.outputPath("trace.zip");
        await context.tracing.stop({ path: tracePath });
        await testInfo.attach("trace", { path: tracePath, contentType: "application/zip" });
      }
    } finally {
      try { await context.close(); }
      finally { await attachJson(testInfo, "locked-artifact-after", await verifyLockedDefaultV13Artifact(artifact)); }
    }
    expect.soft(observations.unexpected, "Only the exact requested synthetic source 503 may be expected").toEqual([]);
  }
}

function aiPanel(page: Page) {
  return page.getByRole("region", { name: "本机 AI 断言草稿验证器", exact: true });
}

async function assertAiEmpty(page: Page) {
  const panel = aiPanel(page);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-provider-call-capability", "absent");
  await expect(panel).toHaveAttribute("data-provider-outbound", "blocked");
  await expect(panel).toHaveAttribute("data-local-write-performed", "false");
  await expect(panel.getByLabel("本机 AI 验证上下文 JSON", { exact: true })).toHaveCount(0);
  const draft = panel.getByLabel(/^AI assertion draft JSON/u);
  await expect(draft).toHaveValue("");
  await expect(draft).toBeDisabled();
  await expect(panel.getByRole("region", { name: "结构化草稿验证结果", exact: true })).toHaveCount(0);
}

async function prepareAi(page: Page, expectedRevision: RevisionRoute, expectedNumber: number, testInfo: TestInfo, label: string): Promise<PreparedAi> {
  const panel = aiPanel(page);
  await panel.getByRole("button", { name: "准备本机验证上下文", exact: true }).click();
  const area = panel.getByLabel("本机 AI 验证上下文 JSON", { exact: true });
  await expect(area).toBeVisible({ timeout: 60000 });
  const packetText = await area.inputValue();
  const packet = JSON.parse(packetText) as UiContextPacket;
  const draftText = await panel.getByLabel(/^AI assertion draft JSON/u).inputValue();
  const draft = JSON.parse(draftText) as MutableDraft;
  expect(packet.binding).toMatchObject({ system: "bazi", revisionId: expectedRevision.revisionId, revisionNumber: expectedNumber });
  expect(packet.binding.revisionResultHash).toMatch(/^[0-9a-f]{64}$/);
  expect(packet.binding.envelopeV2PayloadSha256).toBe(packet.envelope.integrity.payloadSha256);
  expect(packet.envelope.binding.revisionId).toBe(expectedRevision.revisionId);
  expect(draft.envelopeV2PayloadSha256).toBe(packet.envelope.integrity.payloadSha256);
  expect(draft.legacyDraft.envelopePayloadSha256).toBe(packet.envelope.legacyEnvelope.integrity.payloadSha256);
  expect(draft.legacyDraft.assertions).toEqual([]);
  expect(draft.timeAssertions).toEqual([]);
  const fact = packet.envelope.legacyEnvelope.facts.find((item): item is BaziInterpretationEvidenceFact & { value: string } => item.status === "confirmed" && typeof item.value === "string" && item.value.length > 0);
  if (!fact) throw new Error("Real UI packet has no confirmed nonempty fact for the positive control.");
  draft.legacyDraft.assertions.push({ assertionId: "t7-fact-1", order: 1, family: "fact_quote", subjectId: fact.factId, content: fact.value });
  const positiveText = JSON.stringify(draft, null, 2);
  await attachJson(testInfo, label + "-packet-and-draft", { packet, packetTextSha256: sha256(packetText), draft, positiveTextSha256: sha256(positiveText) });
  return { packet, positiveText, fact };
}

async function validatePositive(page: Page, prepared: PreparedAi) {
  const panel = aiPanel(page);
  await panel.getByLabel(/^AI assertion draft JSON/u).fill(prepared.positiveText);
  await panel.getByRole("button", { name: "验证结构化草稿", exact: true }).click();
  const result = panel.getByRole("region", { name: "结构化草稿验证结果", exact: true });
  await expect(result).toBeVisible({ timeout: 60000 });
  await expect(result).toHaveAttribute("data-visible-assertions", "1");
  await expect(result).toHaveAttribute("data-withheld-assertions", "0");
  const assertions = result.getByRole("list", { name: "允许显示的结构化断言", exact: true });
  await expect(assertions.getByRole("listitem")).toHaveCount(1);
  await expect(assertions.getByRole("listitem").locator("p")).toHaveText(prepared.fact.value);
  await expect(assertions.getByText("逐字匹配", { exact: true })).toBeVisible();
  await expect(result).toHaveAttribute("data-persisted", "false");
  await expect(result).toHaveAttribute("data-expert-truth-claimed", "false");
}

async function verifyAiGateLayout(page: Page, testInfo: TestInfo, state: string) {
  const originalViewport = page.viewportSize();
  const layouts: Array<Record<string, unknown>> = [];
  try {
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1280 ? 800 : 844 });
      const gate = aiPanel(page).locator(".deepseek-submit-readiness");
      await gate.scrollIntoViewIfNeeded();
      await expect(gate).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
        .toBeLessThanOrEqual(1);
      const layout = await gate.evaluate(element => {
        const box = (node: Element) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            tag: node.tagName.toLowerCase(), text: node.textContent,
            x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
            width: rect.width, height: rect.height,
            clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
            textAlign: style.textAlign, fontSize: style.fontSize, lineHeight: style.lineHeight,
            writingMode: style.writingMode
          };
        };
        const cjkLines = (node: Element) => {
          type Character = { character: string; x: number; y: number; width: number; height: number };
          const characters: Character[] = [];
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
            const text = textNode.textContent ?? "";
            for (let index = 0; index < text.length; index += 1) {
              if (!/[\u3400-\u9fff]/u.test(text[index])) continue;
              const range = document.createRange();
              range.setStart(textNode, index);
              range.setEnd(textNode, index + 1);
              const rect = range.getBoundingClientRect();
              characters.push({ character: text[index], x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            }
          }
          const lines: Array<{ y: number; characters: Character[] }> = [];
          for (const character of characters) {
            let line = lines.find(candidate => Math.abs(candidate.y - character.y) < 2);
            if (!line) { line = { y: character.y, characters: [] }; lines.push(line); }
            line.characters.push(character);
          }
          return { characterCount: characters.length, lineCount: lines.length, counts: lines.map(line => line.characters.length), lines };
        };
        const children = [...element.children];
        return {
          viewport: { width: innerWidth, height: innerHeight },
          document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
          gate: box(element), children: children.map(box),
          strongCjk: cjkLines(children[1]), smallCjk: cjkLines(children[2])
        };
      });
      layouts.push({ state, width, ...layout });
      expect(layout.children.map(child => child.tag)).toEqual(["span", "strong", "small"]);
      expect(layout.children[0].text).toBe("LOCAL VALIDATION GATE");
      expect(layout.children[1].text).toBe("当前草稿将绑定已重建 Envelope");
      expect(layout.children[2].text).toBe("零 Provider 外发 · 零持久化 · 仅白名单逐字匹配项可见");
      expect(layout.gate.scrollWidth - layout.gate.clientWidth).toBeLessThanOrEqual(1);
      for (const child of layout.children) {
        expect(child.width).toBeGreaterThan(100);
        expect(child.height).toBeGreaterThan(0);
        expect(child.scrollWidth - child.clientWidth).toBeLessThanOrEqual(1);
        expect(child.x).toBeGreaterThanOrEqual(layout.gate.x);
        expect(child.right).toBeLessThanOrEqual(layout.gate.right + 1);
        expect(child.writingMode).toBe("horizontal-tb");
      }
      expect(layout.children[1].y).toBeGreaterThanOrEqual(layout.children[0].bottom - 1);
      expect(layout.children[2].y).toBeGreaterThanOrEqual(layout.children[1].bottom - 1);
      expect(Math.abs(layout.children[0].x - layout.children[1].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.children[1].x - layout.children[2].x)).toBeLessThanOrEqual(1);
      expect(layout.children[2].textAlign).toBe("left");
      for (const text of [layout.strongCjk, layout.smallCjk]) {
        expect(text.characterCount).toBeGreaterThanOrEqual(8);
        expect(Math.max(...text.counts)).toBeGreaterThanOrEqual(4);
        expect(text.lineCount).toBeLessThanOrEqual(Math.ceil(text.characterCount / 4));
      }
      await attachJson(testInfo, `${state}-gate-layout-${width}`, layout);
      const barPath = testInfo.outputPath(`${state}-gate-${width}.png`);
      await gate.screenshot({ path: barPath });
      await testInfo.attach(`${state}-gate-${width}`, { path: barPath, contentType: "image/png" });
      await screenshot(page, testInfo, `${state}-viewport-${width}`);
    }
  } finally {
    await attachJson(testInfo, state + "-responsive-layouts", layouts);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}

async function deriveR2(page: Page, first: RevisionRoute) {
  await page.goto(origin + first.pathname, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByLabel(/^民用时间/u).fill("23:20");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("radio", { name: /00:00 午夜换日/u }).check();
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

test("old complete R1 AI draft is refused by the real R2 context between two successful current-context controls", async ({}, testInfo) => {
  await withProfile(testInfo, false, async ({ page, observations }) => {
    await createDemoCase(page);
    const first = revisionRoute(page);
    await page.goto(origin + first.pathname + "?view=research", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await assertAiEmpty(page);
    const beforeR1 = await snapshot(page, testInfo, "r1-before-ai");
    const r1 = await prepareAi(page, first, 1, testInfo, "r1");
    await validatePositive(page, r1);
    await verifyAiGateLayout(page, testInfo, "r1-supported");
    const afterR1 = await snapshot(page, testInfo, "r1-after-positive-ai");
    unchanged(beforeR1, afterR1);
    await screenshot(page, testInfo, "r1-current-draft-supported");

    const second = await deriveR2(page, first);
    const afterDerive = await snapshot(page, testInfo, "r2-after-real-ui-derive");
    expect(afterDerive.semanticWitness.cases).toHaveLength(1);
    expect(afterDerive.semanticWitness.revisions).toHaveLength(2);
    expect(afterDerive.semanticWitness.cases[0]).toMatchObject({ caseIdDigest: sha256(first.caseId), latestRevisionIdDigest: sha256(second.revisionId), revisionCount: 2, lifecycleState: "active" });
    expect(afterDerive.semanticWitness.revisions.find(item => item.revisionIdDigest === sha256(first.revisionId))).toEqual(beforeR1.semanticWitness.revisions[0]);
    expect(afterDerive.semanticWitness.revisions.find(item => item.revisionIdDigest === sha256(second.revisionId))).toMatchObject({ caseIdDigest: sha256(first.caseId), revisionNumber: 2 });

    await page.goto(origin + first.pathname + "?view=research", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await assertAiEmpty(page);
    const r1Again = await prepareAi(page, first, 1, testInfo, "r1-before-ui-selection");
    expect(r1Again.packet.binding).toEqual(r1.packet.binding);
    await validatePositive(page, r1Again);
    await page.getByRole("combobox", { name: "历史 Revision", exact: true }).selectOption(second.revisionId);
    await page.waitForURL(url => url.pathname === second.pathname && url.searchParams.get("view") === "research");
    await waitForAppReady(page);
    await assertAiEmpty(page);
    await screenshot(page, testInfo, "r2-keyed-context-reset");
    const r2 = await prepareAi(page, second, 2, testInfo, "r2");
    expect(r2.packet.binding.revisionResultHash).not.toBe(r1.packet.binding.revisionResultHash);
    expect(r2.packet.envelope.integrity.payloadSha256).not.toBe(r1.packet.envelope.integrity.payloadSha256);
    expect(r2.packet.envelope.legacyEnvelope.integrity.payloadSha256).not.toBe(r1.packet.envelope.legacyEnvelope.integrity.payloadSha256);
    const panel = aiPanel(page);
    await panel.getByLabel(/^AI assertion draft JSON/u).fill(r1.positiveText);
    await panel.getByRole("button", { name: "验证结构化草稿", exact: true }).click();
    await expect(panel).toHaveAttribute("data-state", "failed", { timeout: 60000 });
    await expect(panel.getByRole("alert")).toContainText("本机验证保持关闭");
    await expect(panel.getByRole("alert")).toContainText("没有形成等式闭包");
    await expect(panel.getByRole("region", { name: "结构化草稿验证结果", exact: true })).toHaveCount(0);
    await expect(panel.getByRole("list", { name: "允许显示的结构化断言", exact: true })).toHaveCount(0);
    await verifyAiGateLayout(page, testInfo, "r2-stale-refused");
    const afterRefusal = await snapshot(page, testInfo, "r2-after-stale-r1-draft-refusal");
    unchanged(afterDerive, afterRefusal);
    await panel.getByRole("alert").scrollIntoViewIfNeeded();
    await screenshot(page, testInfo, "r2-old-envelope-explicitly-refused");
    await validatePositive(page, r2);
    await verifyAiGateLayout(page, testInfo, "r2-supported");
    const afterR2 = await snapshot(page, testInfo, "r2-after-current-positive-control");
    unchanged(afterDerive, afterR2);
    await screenshot(page, testInfo, "r2-current-draft-supported");
    expect(observations.sourceNavigations).toHaveLength(0);
    await attachJson(testInfo, "ai-context-transition-result", {
      first, second, r1Binding: r1.packet.binding, r2Binding: r2.packet.binding,
      oldDraftTextSha256: sha256(r1.positiveText), oldDraftWasNotRewritten: true,
      oldDraftRejected: true, r1PositiveVisibleAssertions: 1, r2PositiveVisibleAssertions: 1,
      allSixteenStoresUnchangedDuringAiActions: true, providerCallCapability: "absent",
      providerFailureVerified: false, expertTruthEstablished: false
    });
  });
});

test("a real source-link navigation receiving a controlled 503 leaves local creation and ZIP restore preflight usable", async ({}, testInfo) => {
  await withProfile(testInfo, true, async ({ page, context, observations, armSourceFailure }) => {
    await page.goto(origin + "/knowledge", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await page.getByRole("button", { name: "导入资料", exact: true }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "选择资料文件", exact: true }).click();
    await (await chooserPromise).setFiles({ name: sourceFilename, mimeType: "text/markdown", buffer: Buffer.from(sourceContent) });
    await page.getByLabel("资料标题", { exact: false }).fill(sourceTitle);
    await page.getByLabel("作者", { exact: true }).fill("T7 本机合成样本");
    await page.getByRole("textbox", { name: /^来源网址/u }).fill(sourceUrl);
    await page.getByLabel("来源备注", { exact: true }).fill("仅为受控 503 导航测试登记的合成网址；不是已核验来源。");
    await page.getByRole("checkbox", { name: /^确认私有使用边界/u }).check();
    await page.getByRole("button", { name: "确认导入", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("document")).toMatch(/^[0-9a-f-]{36}$/i);
    const documentId = new URL(page.url()).searchParams.get("document");
    await page.getByRole("navigation", { name: "知识与来源审计", exact: true }).getByRole("link", { name: /^来源台账/u }).click();
    await waitForAppReady(page);
    const record = page.locator(".rights-record-list article").filter({ has: page.getByRole("heading", { name: sourceTitle, exact: true }) });
    await expect(record).toHaveCount(1);
    await expect(record).toContainText("用户提供 · 未核验");
    await expect(record).toContainText("仅本机私有研究");
    await expect(record).toContainText("未复核");
    const sourceLink = record.getByRole("link", { name: `打开“${sourceTitle}”的 HTTPS 来源页面（新窗口）`, exact: true });
    await expect(sourceLink).toHaveAttribute("href", sourceUrl);
    await expect(sourceLink).toHaveAttribute("target", "_blank");
    await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(sourceLink).toHaveAttribute("referrerpolicy", "no-referrer");
    const before503 = await snapshot(page, testInfo, "before-source-503");
    const appUrl = page.url();
    armSourceFailure();
    const popupPromise = context.waitForEvent("page");
    const responsePromise = context.waitForEvent("response", response => response.url() === sourceUrl && response.request().isNavigationRequest());
    await sourceLink.click();
    const popup = await popupPromise;
    const response = await responsePromise;
    expect(response.status()).toBe(503);
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(sourceUrl);
    await expect(popup).toHaveTitle("T7 受控来源不可用");
    await expect(popup.getByRole("heading", { name: "来源页面暂不可用", exact: true })).toBeVisible();
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    expect(observations.sourceNavigations).toEqual([{ url: sourceUrl, method: "GET", navigation: true, resourceType: "document", actualExternalForwarding: false, suppliedStatus: 503 }]);
    await screenshot(popup, testInfo, "actual-source-navigation-503");
    await popup.close();
    expect(page.url()).toBe(appUrl);
    await assertArtifact(page);
    await expect(record).toContainText("用户提供 · 未核验");
    await expect(record).toContainText("仅本机私有研究");
    const after503 = await snapshot(page, testInfo, "after-source-503");
    unchanged(before503, after503);
    await screenshot(page, testInfo, "local-source-ledger-after-503");

    await createDemoCase(page);
    const created = revisionRoute(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    expect(revisionRoute(page)).toEqual(created);
    const afterCreate = await snapshot(page, testInfo, "local-case-created-after-source-503");
    expect(afterCreate.semanticWitness.cases).toHaveLength(1);
    expect(afterCreate.semanticWitness.revisions).toHaveLength(1);
    expect(afterCreate.semanticWitness.cases[0]).toMatchObject({ caseIdDigest: sha256(created.caseId), latestRevisionIdDigest: sha256(created.revisionId), revisionCount: 1, lifecycleState: "active" });
    expect(afterCreate.semanticWitness.revisions[0]).toMatchObject({ caseIdDigest: sha256(created.caseId), revisionIdDigest: sha256(created.revisionId), revisionNumber: 1 });
    for (const name of ["knowledgeDocuments", "sourceRights"]) {
      expect(afterCreate.stores.find(store => store.storeName === name)).toEqual(after503.stores.find(store => store.storeName === name));
    }
    await screenshot(page, testInfo, "local-chart-saved-after-source-503");
    await openDataManagement(page);
    const beforeZip = await snapshot(page, testInfo, "before-post-503-zip");
    const exported = await exportFullBackupZip(page);
    const destination = testInfo.outputPath(exported.download.suggestedFilename());
    await exported.download.saveAs(destination);
    const bytes = await readFile(destination);
    expect(bytes).toEqual(exported.bytes);
    const checked = await preflightFullBackupFile(new Uint8Array(bytes));
    expect(checked.migratedFromFormatVersion).toBeNull();
    expect(checked.payload.cases).toHaveLength(1);
    expect(checked.payload.revisions).toHaveLength(1);
    expect(checked.payload.cases[0]).toMatchObject({ id: created.caseId, latestRevisionId: created.revisionId, revisionCount: 1 });
    expect(checked.payload.revisions[0]).toMatchObject({ id: created.revisionId, caseId: created.caseId, revisionNumber: 1 });
    expect(sha256(canonicalStringify(checked.payload.cases[0]))).toBe(beforeZip.semanticWitness.cases[0].recordDigest);
    expect(sha256(canonicalStringify(checked.payload.revisions[0]))).toBe(beforeZip.semanticWitness.revisions[0].recordDigest);
    expect(checked.payload.knowledgeDocuments).toHaveLength(1);
    const document = checked.payload.knowledgeDocuments[0];
    expect(document).toMatchObject({ id: documentId, title: sourceTitle, fileName: sourceFilename, format: "markdown", content: sourceContent });
    expect(checked.payload.sourceRights).toHaveLength(1);
    expect(checked.payload.sourceRights[0]).toMatchObject({
      documentId, documentContentHash: document.contentHash,
      source: { sourceUrl },
      rights: { status: "user_unverified", workStatus: "unknown", editionStatus: "unknown", distributionPolicy: "local_private_only" },
      review: { status: "unreviewed" }
    });
    await preflightBackupZip(page, bytes, "t7-post-source-503-restore-preflight.zip");
    await expect(page.getByRole("button", { name: "确认替换并恢复", exact: true })).toBeDisabled();
    const afterPreflight = await snapshot(page, testInfo, "post-503-zip-restore-preflight-no-write");
    unchanged(beforeZip, afterPreflight);
    await screenshot(page, testInfo, "post-503-zip-restore-preflight-ready");
    await testInfo.attach("post-source-503-backup.zip", { path: destination, contentType: "application/zip" });
    await attachJson(testInfo, "source-outage-local-flow-result", {
      actualRequestedSource: sourceUrl, controlledResponseStatus: 503,
      sourceNavigationCount: observations.sourceNavigations.length,
      realExternalForwarding: false, realExternalAvailabilityVerified: false,
      providerFailureVerified: false, sourcePageFailureOnly: true,
      created, documentId, archiveBytes: bytes.length, archiveSha256: sha256(bytes),
      payloadDigest: checked.digests.payload, counts: checked.manifest.counts,
      beforeSourceFailureDigest: before503.snapshotDigest, afterSourceFailureDigest: after503.snapshotDigest,
      beforeZipDigest: beforeZip.snapshotDigest, afterRestorePreflightDigest: afterPreflight.snapshotDigest,
      sourceRightsElevated: false, restoreWasSubmitted: false
    });
  });
});
