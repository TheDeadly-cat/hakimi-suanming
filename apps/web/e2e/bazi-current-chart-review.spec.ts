import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

type IndexedDbStoreSnapshot = Readonly<{
  name: string;
  count: number;
  keysSha256: string;
  valuesSha256: string;
  keyValueSha256: string;
}>;

type IndexedDbSnapshot = Readonly<{
  name: string;
  version: number;
  stores: readonly IndexedDbStoreSnapshot[];
}>;

type CacheEntrySnapshot = Readonly<{
  url: string;
  method: string;
  requestHeaders: readonly (readonly [string, string])[];
  responseStatus: number;
  responseStatusText: string;
  responseType: ResponseType;
  responseHeaders: readonly (readonly [string, string])[];
  bodyBytes: number;
  bodySha256: string;
}>;

type BrowserStorageSnapshot = Readonly<{
  indexedDb: readonly IndexedDbSnapshot[];
  localStorage: readonly (readonly [string, string])[];
  sessionStorage: readonly (readonly [string, string])[];
  caches: readonly Readonly<{
    name: string;
    entries: readonly CacheEntrySnapshot[];
  }>[];
}>;

type EditableCurrentChartReview = {
  profile: Record<string, unknown>;
  packet: {
    bindings: Record<string, unknown>;
    strengthSnapshot: {
      evidenceNarrative: {
        bindings: Record<string, unknown>;
        counts: {
          sourceBindings: number;
          claims: number;
        };
        boundary: Record<string, unknown>;
      };
    };
    counts: {
      strengthMethod: number;
      tenGodOccurrences: number;
      shenshaOccurrences: number;
      total: number;
    };
    items: Array<{
      reviewItemId: string;
      category: string;
      candidateSnapshot: Record<string, unknown>;
    }>;
    boundary: Record<string, unknown>;
  };
  packetSha256: string;
  reviewer: {
    reviewerId: string;
    displayName: string;
    affiliation: string;
    expertiseStatement: string;
    identityEvidenceReference: string;
    identityVerified: boolean;
  };
  reviewSession: {
    reviewedAt: string;
    methodology: string;
    generalNotes: string;
  };
  decisions: Array<{
    reviewItemId: string;
    decision: string;
    orientationProposal: string;
    selectedTradition: string;
    decisionReason: string;
    applicabilityConditions: string;
    counterexamples: string;
    revisionRequest: string;
    additionalSourceUrls: string[];
    expertTruthClaimed: boolean;
    scientificValidityClaimed: boolean;
    formalActivationAllowed: boolean;
    goodBadOrientation: null;
    eventOutcome: null;
    result: null;
  }>;
  declaredCounts: {
    total: number;
    unresolved: number;
    approve: number;
    revise: number;
    reject: number;
  };
  boundary: Record<string, unknown>;
};

async function waitForReady(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-app-boot-ready", "true");
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .table-skeleton, .chart-loading")).toHaveCount(0);
}

async function createFirstRevision(page: Page): Promise<{
  caseId: string;
  revisionId: string;
  pathname: string;
}> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/iu);
  await waitForReady(page);
  const match = new URL(page.url()).pathname.match(
    /^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/iu
  );
  if (!match) throw new Error(`R1 URL 不符合精确 Revision 路由：${page.url()}`);
  return { caseId: match[1]!, revisionId: match[2]!, pathname: new URL(page.url()).pathname };
}

async function deriveSecondRevisionAt0926(page: Page): Promise<{
  caseId: string;
  revisionId: string;
  pathname: string;
}> {
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "录入出生资料" })).toBeVisible();
  const civilTime = page.getByLabel(/^民用时间/u);
  await civilTime.fill("09:26");
  await expect(civilTime).toHaveValue("09:26");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "确认时间基准与换日规则" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存为新修订并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/iu);
  await waitForReady(page);
  const match = new URL(page.url()).pathname.match(
    /^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/iu
  );
  if (!match) throw new Error(`R2 URL 不符合精确 Revision 路由：${page.url()}`);
  return { caseId: match[1]!, revisionId: match[2]!, pathname: new URL(page.url()).pathname };
}

async function snapshotAllBrowserStorage(page: Page): Promise<BrowserStorageSnapshot> {
  return page.evaluate(async () => {
    const sha256Bytes = async (bytes: ArrayBuffer): Promise<string> => {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    };
    const sha256Text = (value: string): Promise<string> => (
      sha256Bytes(new TextEncoder().encode(value).buffer)
    );
    const sha256Json = (value: unknown): Promise<string> => (
      sha256Text(JSON.stringify(value) ?? "undefined")
    );
    const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
    const storageEntries = (storage: Storage): readonly (readonly [string, string])[] => (
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => key !== null)
        .sort()
        .map((key) => [key, storage.getItem(key) ?? ""] as const)
    );
    const headerEntries = (headers: Headers): readonly (readonly [string, string])[] => (
      [...headers.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => [name, value] as const)
    );

    if (typeof indexedDB.databases !== "function") {
      throw new Error("浏览器不支持 indexedDB.databases()，无法证明全部数据库名称未变化");
    }
    const databaseNames = [...new Set(
      (await indexedDB.databases())
        .map((database) => database.name)
        .filter((name): name is string => Boolean(name))
    )].sort();
    const indexedDb = [];
    for (const name of databaseNames) {
      const database = await requestResult(indexedDB.open(name));
      try {
        const storeNames = [...database.objectStoreNames].sort();
        const transaction = database.transaction(storeNames, "readonly");
        const transactionDone = new Promise<void>((resolve, reject) => {
          transaction.addEventListener("complete", () => resolve(), { once: true });
          transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
          transaction.addEventListener("error", () => reject(transaction.error), { once: true });
        });
        const storeValues = await Promise.all(storeNames.map(async (storeName) => {
          const store = transaction.objectStore(storeName);
          const [keys, values] = await Promise.all([
            requestResult(store.getAllKeys()),
            requestResult(store.getAll())
          ]);
          return { name: storeName, keys, values };
        }));
        await transactionDone;
        const stores = await Promise.all(storeValues.map(async ({ name: storeName, keys, values }) => ({
          name: storeName,
          count: values.length,
          keysSha256: await sha256Json(keys),
          valuesSha256: await sha256Json(values),
          keyValueSha256: await sha256Json({ keys, values })
        })));
        indexedDb.push({ name: database.name, version: database.version, stores });
      } finally {
        database.close();
      }
    }

    const cacheSnapshots = [];
    for (const cacheName of (await caches.keys()).sort()) {
      const cache = await caches.open(cacheName);
      const requests = [...await cache.keys()].sort((left, right) => (
        `${left.method}\u0000${left.url}`.localeCompare(`${right.method}\u0000${right.url}`)
      ));
      const entries = [];
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) throw new Error(`缓存 ${cacheName} 的请求在完整快照时消失：${request.url}`);
        const body = await response.clone().arrayBuffer();
        entries.push({
          url: request.url,
          method: request.method,
          requestHeaders: headerEntries(request.headers),
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseType: response.type,
          responseHeaders: headerEntries(response.headers),
          bodyBytes: body.byteLength,
          bodySha256: await sha256Bytes(body)
        });
      }
      cacheSnapshots.push({ name: cacheName, entries });
    }

    return {
      indexedDb,
      localStorage: storageEntries(localStorage),
      sessionStorage: storageEntries(sessionStorage),
      caches: cacheSnapshots
    };
  });
}

async function stableBrowserStorageSnapshot(page: Page): Promise<BrowserStorageSnapshot> {
  let previous = await snapshotAllBrowserStorage(page);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForTimeout(100);
    const current = await snapshotAllBrowserStorage(page);
    if (JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
  }
  throw new Error("浏览器存储在 1 秒观察窗内没有形成连续两次相同的只读快照");
}

function revisionsCount(snapshot: BrowserStorageSnapshot): number | null {
  const database = snapshot.indexedDb.find((entry) => entry.name === "hakimi-bazi-research");
  return database?.stores.find((store) => store.name === "revisions")?.count ?? null;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
}

async function chooseJsonFile(page: Page, buttonName: string, filePath: string): Promise<void> {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);
}

test("v0.18 旺衰证据账与本盘命中复核包跨 Revision 失败关闭且全浏览器存储保持不变", async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const r1 = await createFirstRevision(page);
  const r2 = await deriveSecondRevisionAt0926(page);
  expect(r2.caseId).toBe(r1.caseId);
  expect(r2.revisionId).not.toBe(r1.revisionId);

  await page.getByRole("link", { name: "打开完整八字解读与研究预览", exact: true }).click();
  await page.waitForURL(`${r2.pathname}?view=overview`);
  await waitForReady(page);
  const r2OverviewUrl = page.url();

  await expect(page.locator("html")).toHaveAttribute("data-db-generation", "legacy-v13");
  await expect(page.locator("html")).toHaveAttribute("data-db-schema", "13");
  await expect(page.locator("html")).toHaveAttribute("data-db-migration-phase", "committed");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swCacheCount ?? null))
    .toMatch(/^\d+$/u);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swUpdateChecked ?? null))
    .toMatch(/^(?:true|false)$/u);

  const revisionHistory = page.getByRole("combobox", { name: "历史 Revision" });
  await expect(revisionHistory.locator("option")).toHaveText([/R1/u, /R2/u]);
  const storageBefore = await stableBrowserStorageSnapshot(page);
  expect(storageBefore.indexedDb.find((entry) => entry.name === "hakimi-bazi-research"))
    .toMatchObject({ version: 130 });
  expect(revisionsCount(storageBefore)).toBe(2);
  expect(storageBefore.indexedDb
    .find((entry) => entry.name === "hakimi-bazi-research")
    ?.stores.some((store) => store.name === "mutationState"))
    .toBe(false);

  const workbench = page.locator(".bazi-current-chart-review-workbench");
  const strengthLedger = page.locator(".bazi-strength-evidence-ledger");
  const shenshaGate = page.locator(".shensha-research-gate");
  await expect(workbench).toBeVisible();
  await expect(workbench).toHaveAttribute("data-packet-version", "hakimi.bazi.current_chart_hit_review/0.2.0");
  await expect(workbench).toHaveAttribute("data-content-version", "0.18.0");
  await expect(workbench).toHaveAttribute("data-strength-policy-version", "hakimi.bazi.strength_policy/0.1.0");
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "unprepared");
  await expect(workbench).toHaveAttribute("data-packet-sha256", "null");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "false");
  await expect(workbench).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(workbench).toHaveAttribute("data-scientific-validity-claimed", "false");
  await expect(workbench).toHaveAttribute("data-formal-activation-allowed", "false");
  await expect(workbench).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(workbench).toHaveAttribute("data-catalog-decision-inheritance-applied", "false");
  await expect(workbench).toHaveAttribute("data-network-transmission-performed", "false");
  await expect(workbench).toHaveAttribute("data-chart-or-storage-mutation-performed", "false");
  await expect(workbench).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(workbench).toHaveAttribute("data-event-outcome", "null");
  await expect(workbench).toHaveAttribute("data-result", "null");

  // v0.18 的旺衰证据账自动从当前盘只读派生；不依赖当前盘包，也不打开神煞研究预览。
  await expect(strengthLedger).toBeVisible();
  await expect(strengthLedger).toHaveAttribute("data-projection-version", "hakimi.bazi.strength_evidence_narrative/0.1.0");
  await expect(strengthLedger).toHaveAttribute("data-content-version", "0.18.0");
  await expect(strengthLedger).toHaveAttribute("data-binding-state", "ready");
  await expect(strengthLedger).toHaveAttribute("aria-busy", "false");
  await expect(strengthLedger).toHaveAttribute("data-include-hour", "true");
  await expect(strengthLedger).toHaveAttribute("data-claim-count", "12");
  await expect(strengthLedger).toHaveAttribute("data-withheld-position-count", "0");
  await expect(strengthLedger).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(strengthLedger).toHaveAttribute("data-scientific-validity-claimed", "false");
  await expect(strengthLedger).toHaveAttribute("data-formal-activation-allowed", "false");
  await expect(strengthLedger).toHaveAttribute("data-chart-or-storage-mutation-performed", "false");
  await expect(strengthLedger).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(strengthLedger).toHaveAttribute("data-event-outcome", "null");
  await expect(strengthLedger).toHaveAttribute("data-result", "null");
  await expect(workbench).toHaveAttribute("data-preflight-state", "unprepared");
  await expect(shenshaGate.getByRole("button", { name: "打开只读研究预览", exact: true }))
    .toHaveAttribute("aria-expanded", "false");
  await expect(shenshaGate.locator("#shensha-research-result")).toHaveCount(0);

  const monthCommandEvidence = strengthLedger.locator(
    '[data-month-main-duplicate-role="month_command"][data-category="month_command"][data-position="month"]'
  );
  const monthFirstHiddenEvidence = strengthLedger.locator(
    '[data-month-main-duplicate-role="first_hidden_stem"][data-category="first_hidden_stem"][data-position="month"]'
  );
  await expect(monthCommandEvidence).toHaveCount(1);
  await expect(monthCommandEvidence).toHaveAttribute("data-weight", "4");
  await expect(monthCommandEvidence).toHaveAttribute("data-factor-id", /^(?!null$).+/u);
  await expect(monthFirstHiddenEvidence).toHaveCount(1);
  await expect(monthFirstHiddenEvidence).toHaveAttribute("data-weight", "2");
  await expect(monthFirstHiddenEvidence).toHaveAttribute("data-factor-id", /^(?!null$).+/u);
  await expect(strengthLedger.locator(".bazi-strength-month-duplicate")).toContainText("月主气重复计权：6");

  const claimLedger = strengthLedger.locator("details.bazi-strength-claim-ledger");
  await expect(claimLedger).not.toHaveAttribute("open", "");
  await claimLedger.locator(":scope > summary").click();
  await expect(claimLedger).toHaveAttribute("open", "");
  const claimCards = claimLedger.locator(".bazi-strength-claim-card");
  const sourceBindings = claimLedger.locator(".bazi-strength-source-bindings > li");
  await expect(claimCards).toHaveCount(12);
  await expect(claimLedger.locator('.bazi-strength-claim-card[data-expert-truth-claimed="false"][data-scientific-validity-claimed="false"][data-formal-activation-allowed="false"][data-result="null"]'))
    .toHaveCount(12);
  const sourceBindingAudit = await sourceBindings.evaluateAll((items) => items.map((item) => {
    if (!(item instanceof HTMLElement)) return { bindingId: "", locatorVerified: false };
    const locator = [...item.querySelectorAll("p")].find((entry) => entry.textContent?.startsWith("定位："));
    return {
      bindingId: item.dataset.bindingId ?? "",
      locatorVerified: Boolean(
        item.dataset.locatorVerification
        && locator
        && locator.textContent?.replace(/^定位：/u, "").trim()
      )
    };
  }));
  expect(sourceBindingAudit.length).toBeGreaterThanOrEqual(12);
  expect(new Set(sourceBindingAudit.map((item) => item.bindingId)).size).toBe(12);
  expect(sourceBindingAudit.every((item) => item.locatorVerified)).toBe(true);

  const sharedDigestAttributes = [
    "data-facts-sha256",
    "data-strength-policy-sha256",
    "data-strength-assessment-sha256",
    "data-strength-sensitivity-sha256"
  ] as const;
  const r2LedgerSharedDigests = await Promise.all(
    sharedDigestAttributes.map((attribute) => strengthLedger.getAttribute(attribute))
  );
  expect(r2LedgerSharedDigests.every((digest) => digest !== null && /^[a-f0-9]{64}$/u.test(digest))).toBe(true);

  await workbench.getByRole("button", { name: "准备当前盘复核包", exact: true }).click();
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "ready");
  await expect(workbench).toHaveAttribute("data-strength-question-count", "4");
  const r2PacketSha256 = await workbench.getAttribute("data-packet-sha256");
  const r2FactsSha256 = await workbench.getAttribute("data-facts-sha256");
  const r2PolicySha256 = await workbench.getAttribute("data-strength-policy-sha256");
  const r2OrderedIdsSha256 = await workbench.getAttribute("data-ordered-item-ids-sha256");
  for (const digest of [r2PacketSha256, r2FactsSha256, r2PolicySha256, r2OrderedIdsSha256]) {
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
  }
  const r2PacketSharedDigests = await Promise.all(
    sharedDigestAttributes.map((attribute) => workbench.getAttribute(attribute))
  );
  expect(r2PacketSharedDigests).toEqual(r2LedgerSharedDigests);
  await expect(workbench).toHaveAttribute("data-strength-evidence-narrative-sha256", /^[a-f0-9]{64}$/u);
  await expect(workbench).toHaveAttribute("data-strength-claim-registry-sha256", /^[a-f0-9]{64}$/u);
  expect(page.url()).toBe(r2OverviewUrl);

  const downloadPromise = page.waitForEvent("download");
  await workbench.getByRole("button", { name: "导出本盘反馈模板", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hakimi-bazi-current-chart-hit-review-v018.json");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const rawTemplate = await readFile(downloadedPath!, "utf8");
  const template = JSON.parse(rawTemplate) as EditableCurrentChartReview;
  expect(template.profile).toMatchObject({
    formatVersion: "hakimi.bazi.current_chart_hit_review/0.2.0",
    contentVersion: "0.18.0",
    scope: "current_chart_semantic_instances_only",
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    autoIntegrationAllowed: false
  });
  expect(template.packet.counts.strengthMethod).toBe(4);
  expect(template.packet.counts.total).toBe(
    4 + template.packet.counts.tenGodOccurrences + template.packet.counts.shenshaOccurrences
  );
  expect(template.packet.items).toHaveLength(template.packet.counts.total);
  expect(template.packet.items[0]?.category).toBe("strength_method");
  expect(template.packet.bindings.factsProjectionSha256).toBe(r2FactsSha256);
  expect(template.packet.bindings.strengthPolicySha256).toBe(r2PolicySha256);
  expect(template.packet.bindings.orderedReviewItemIdsSha256).toBe(r2OrderedIdsSha256);
  expect(template.packet.bindings).toMatchObject({
    packetProjectionVersion: "hakimi.bazi.current_chart_hit_packet/0.2.0",
    strengthAssessmentSha256: r2LedgerSharedDigests[2],
    strengthSensitivitySha256: r2LedgerSharedDigests[3],
    strengthEvidenceNarrativeProjectionVersion: "hakimi.bazi.strength_evidence_narrative/0.1.0",
    strengthClaimRegistryVersion: "hakimi.bazi.strength_claim_registry/0.1.0"
  });
  expect(template.packet.strengthSnapshot.evidenceNarrative.counts).toMatchObject({
    sourceBindings: 12,
    claims: 12
  });
  expect(template.packet.strengthSnapshot.evidenceNarrative.bindings).toMatchObject({
    factsProjectionSha256: r2LedgerSharedDigests[0],
    strengthPolicySha256: r2LedgerSharedDigests[1],
    strengthAssessmentSha256: r2LedgerSharedDigests[2],
    strengthSensitivitySha256: r2LedgerSharedDigests[3]
  });
  expect(template.packet.strengthSnapshot.evidenceNarrative.boundary).toMatchObject({
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    reviewDecisionInheritanceApplied: false,
    chartOrStorageMutationPerformed: false,
    networkTransmissionPerformed: false,
    overallGoodBad: null,
    usefulGod: null,
    structureVerdict: null,
    eventOutcome: null,
    result: null
  });
  expect(template.packetSha256).toBe(r2PacketSha256);
  expect(template.boundary).toMatchObject({
    identityVerified: false,
    digitalSignatureVerified: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    catalogDecisionInheritanceApplied: false,
    networkTransmissionPerformed: false,
    chartOrStorageMutationPerformed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
  expect(rawTemplate).not.toContain(r2.caseId);
  expect(rawTemplate).not.toContain(r2.revisionId);
  expect(rawTemplate).not.toContain("09:26");
  expect(page.url()).toBe(r2OverviewUrl);

  Object.assign(template.reviewer, {
    reviewerId: "reviewer-current-chart-e2e-001",
    displayName: "本盘条件化审稿人",
    affiliation: "独立研究",
    expertiseStatement: "仅对当前盘候选提出具名条件化意见，现实身份与专业资质仍待线下核验。"
  });
  Object.assign(template.reviewSession, {
    reviewedAt: "2026-08-13T16:20:00+08:00",
    methodology: "逐项核对当前盘事实绑定、旺衰政策、成立条件与反例。",
    generalNotes: "本意见不继承为全量目录决定。"
  });
  Object.assign(template.decisions[0]!, {
    decision: "approve",
    orientationProposal: "mixed_conditional",
    selectedTradition: "子平法基础旺衰候选",
    decisionReason: "该表达可保留为待复核候选，但不能脱离格局、调候与合化条件。",
    applicabilityConditions: "仅在基础旺衰政策适用且未触发从格、专旺或化气改写时讨论。",
    counterexamples: "若月令重复计权应去重，或格局与调候改写基础分档，则此方向不成立。",
    additionalSourceUrls: ["https://example.org/hakimi-bazi-v018-review-note"]
  });
  Object.assign(template.declaredCounts, {
    total: template.decisions.length,
    unresolved: template.decisions.length - 1,
    approve: 1,
    revise: 0,
    reject: 0
  });

  const filledPath = testInfo.outputPath("r2-current-chart-review-valid.json");
  const tamperedPath = testInfo.outputPath("r2-current-chart-review-tampered.json");
  await mkdir(path.dirname(filledPath), { recursive: true });
  await writeFile(filledPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  const tampered = structuredClone(template);
  tampered.packetSha256 = "0".repeat(64);
  await writeFile(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

  await chooseJsonFile(page, "预检本盘反馈 JSON", filledPath);
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "valid");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "true");
  await expect(workbench).toHaveAttribute("data-reviewer-attribution-complete", "true");
  await expect(workbench).toHaveAttribute("data-chart-or-storage-mutation-performed", "false");
  await expect(workbench.locator(".bazi-current-chart-review-result")).toContainText("1 已裁决");
  await expect(workbench.locator(".bazi-current-chart-review-result"))
    .toContainText("本盘条件化审稿人 · reviewer-current-chart-e2e-001");
  expect(page.url()).toBe(r2OverviewUrl);

  await chooseJsonFile(page, "预检本盘反馈 JSON", tamperedPath);
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "invalid");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "false");
  await expect(workbench.locator(".bazi-current-chart-review-result")).toHaveCount(0);
  await expect(workbench.locator('.bazi-current-chart-review-message[data-tone="error"]'))
    .toContainText("复核文件没有绑定当前内存命盘");
  expect(page.url()).toBe(r2OverviewUrl);

  await chooseJsonFile(page, "预检本盘反馈 JSON", filledPath);
  await expect(workbench).toHaveAttribute("data-preflight-state", "valid");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "true");
  await expect(workbench.locator(".bazi-current-chart-review-result")).toContainText("1 已裁决");
  expect(page.url()).toBe(r2OverviewUrl);
  await workbench.screenshot({
    path: testInfo.outputPath(`bazi-v018-${testInfo.project.name}-r2-valid-desktop.png`),
    animations: "disabled"
  });

  const r1OverviewUrl = `${new URL(r2OverviewUrl).origin}${r1.pathname}?view=overview`;
  await revisionHistory.selectOption(r1.revisionId);
  await page.waitForURL(r1OverviewUrl);
  await waitForReady(page);
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "unprepared");
  await expect(workbench).toHaveAttribute("data-packet-sha256", "null");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "false");
  await expect(workbench).toHaveAttribute("data-reviewer-attribution-complete", "false");
  await expect(workbench.locator(".bazi-current-chart-review-result")).toHaveCount(0);
  await expect(workbench.locator(".bazi-current-chart-review-message")).toHaveCount(0);
  await expect(revisionHistory.locator("option")).toHaveCount(2);

  // 自动账随 Revision 重建；旧盘摘要和原生 details 展开态都不能跨盘残留。
  await expect(strengthLedger).toHaveAttribute("data-binding-state", "ready");
  await expect.poll(() => strengthLedger.getAttribute("data-facts-sha256"))
    .not.toBe(r2LedgerSharedDigests[0]);
  const r1LedgerSharedDigests = await Promise.all(
    sharedDigestAttributes.map((attribute) => strengthLedger.getAttribute(attribute))
  );
  expect(r1LedgerSharedDigests.every((digest) => digest !== null && /^[a-f0-9]{64}$/u.test(digest))).toBe(true);
  expect(r1LedgerSharedDigests[0]).not.toBe(r2LedgerSharedDigests[0]);
  expect(r1LedgerSharedDigests[1]).toBe(r2LedgerSharedDigests[1]);
  expect(r1LedgerSharedDigests[2]).not.toBe(r2LedgerSharedDigests[2]);
  expect(r1LedgerSharedDigests[3]).not.toBe(r2LedgerSharedDigests[3]);
  await expect(claimLedger).not.toHaveAttribute("open", "");
  await expect(strengthLedger).not.toHaveAttribute("data-facts-sha256", r2LedgerSharedDigests[0]!);
  await expect(strengthLedger).toHaveAttribute("data-claim-count", "12");
  await expect(shenshaGate.getByRole("button", { name: "打开只读研究预览", exact: true }))
    .toHaveAttribute("aria-expanded", "false");
  await expect(shenshaGate.locator("#shensha-research-result")).toHaveCount(0);

  await workbench.getByRole("button", { name: "准备当前盘复核包", exact: true }).click();
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "ready");
  const r1PacketSharedDigests = await Promise.all(
    sharedDigestAttributes.map((attribute) => workbench.getAttribute(attribute))
  );
  expect(r1PacketSharedDigests).toEqual(r1LedgerSharedDigests);
  const r1PacketSha256 = await workbench.getAttribute("data-packet-sha256");
  expect(r1PacketSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(r1PacketSha256).not.toBe(r2PacketSha256);
  expect(page.url()).toBe(r1OverviewUrl);

  await chooseJsonFile(page, "预检本盘反馈 JSON", filledPath);
  await expect(workbench).toHaveAttribute("data-operation-state", "idle");
  await expect(workbench).toHaveAttribute("data-preflight-state", "invalid");
  await expect(workbench).toHaveAttribute("data-current-chart-bound", "false");
  await expect(workbench.locator(".bazi-current-chart-review-result")).toHaveCount(0);
  await expect(workbench.locator('.bazi-current-chart-review-message[data-tone="error"]'))
    .toContainText("复核文件没有绑定当前内存命盘");
  await expect(workbench).toHaveAttribute("data-packet-sha256", r1PacketSha256!);
  expect(page.url()).toBe(r1OverviewUrl);

  const storageAfter = await stableBrowserStorageSnapshot(page);
  expect(revisionsCount(storageAfter)).toBe(2);
  expect(storageAfter).toEqual(storageBefore);
  await expect(revisionHistory.locator("option")).toHaveText([/R1/u, /R2/u]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(workbench).toBeVisible();
  await workbench.screenshot({
    path: testInfo.outputPath(`bazi-v018-${testInfo.project.name}-r1-cross-chart-failed-mobile.png`),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});
