import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../../../apps/web/release-protocol.ts";

type StorageSnapshot = Readonly<{
  databaseNames: readonly string[];
  database: Readonly<{
    name: string;
    version: number;
    stores: Readonly<Record<string, Readonly<{ keys: readonly unknown[]; values: readonly unknown[] }>>>;
  }>;
  localStorage: readonly (readonly [string, string])[];
  sessionStorage: readonly (readonly [string, string])[];
  cacheKeys: readonly string[];
}>;

type ReviewTemplate = {
  profile: {
    formatVersion: string;
    templateVersion: string;
    reviewScope: string;
    directIdentifiersIncluded: boolean;
    inputFieldsIncluded: boolean;
    derivedChartFactsIncluded: boolean;
    staticCatalogDecisionInheritanceApplied: boolean;
  };
  projectionBinding: {
    sanfangRuleId: string;
    artifactFactsSha256: string;
    occurrenceProjectionSha256: string;
    reviewCount: number;
    itemCount: number;
    sourceCount: number;
  };
  sourceRegistry: unknown[];
  items: Array<{
    occurrenceId: string;
    reviewId: string;
    expertTruthClaimed: boolean;
    formalActivationAllowed: boolean;
    scoringAllowed: boolean;
    goodBadOrientation: unknown;
    eventOutcome: unknown;
    result: unknown;
  }>;
  declaredCounts: { total: number; unresolved: number };
  boundary: {
    derivedChartFactsRemainSensitive: boolean;
    sha256IsNotEncryption: boolean;
    identityVerified: boolean;
    digitalSignatureVerified: boolean;
    eligibleForFormalActivation: boolean;
    autoIntegrationAllowed: boolean;
    networkTransmissionPerformed: boolean;
    ruleArtifactOrStorageMutationPerformed: boolean;
    scoringAllowed: boolean;
    deterministicOutcomeEstablished: boolean;
    staticCatalogDecisionInheritanceApplied: boolean;
    goodBadOrientation: unknown;
    eventOutcome: unknown;
    result: unknown;
  };
};

async function waitForWorkspaceReady(page: Page): Promise<void> {
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "ready", {
    timeout: 30_000
  });
  await expect(page.locator("#revision-count")).not.toHaveText("—");
}

async function snapshotStorage(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(async () => {
    const databaseName = "hakimi-ziwei-browser-workspace-draft";
    const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
    const database = await requestResult(indexedDB.open(databaseName));
    try {
      const storeNames = [...database.objectStoreNames].sort();
      const transaction = database.transaction(storeNames, "readonly");
      const transactionDone = new Promise<void>((resolve, reject) => {
        transaction.addEventListener("complete", () => resolve(), { once: true });
        transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
        transaction.addEventListener("error", () => reject(transaction.error), { once: true });
      });
      const stores = Object.fromEntries(await Promise.all(storeNames.map(async (storeName) => {
        const store = transaction.objectStore(storeName);
        const [keys, values] = await Promise.all([
          requestResult(store.getAllKeys()),
          requestResult(store.getAll())
        ]);
        return [storeName, { keys, values }] as const;
      })));
      await transactionDone;
      const storageEntries = (storage: Storage): readonly (readonly [string, string])[] => (
        Array.from({ length: storage.length }, (_, index) => storage.key(index))
          .filter((key): key is string => key !== null)
          .sort()
          .map((key) => [key, storage.getItem(key) ?? ""] as const)
      );
      const databaseNames = typeof indexedDB.databases === "function"
        ? (await indexedDB.databases())
          .map((entry) => entry.name)
          .filter((name): name is string => Boolean(name))
          .sort()
        : [databaseName];
      return {
        databaseNames,
        database: { name: database.name, version: database.version, stores },
        localStorage: storageEntries(localStorage),
        sessionStorage: storageEntries(sessionStorage),
        cacheKeys: (await caches.keys()).sort()
      };
    } finally {
      database.close();
    }
  });
}

async function snapshotStaticReview(page: Page) {
  return page.locator("#review-feedback-panel").evaluate((element) => ({
    attributes: Array.from(element.attributes)
      .map((attribute) => [attribute.name, attribute.value] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
    total: element.querySelector("#review-feedback-total")?.textContent,
    resolved: element.querySelector("#review-feedback-resolved")?.textContent,
    unresolved: element.querySelector("#review-feedback-unresolved")?.textContent,
    reviewer: element.querySelector("#review-feedback-reviewer")?.textContent,
    message: element.querySelector("#review-feedback-message")?.textContent,
    renderedItems: element.querySelectorAll(".review-feedback-item").length
  }));
}

test("v0.13 当前盘核心十二辅煞独立跨浏览器门禁", async ({ page }, testInfo) => {
  expect(BRIDGE_RELEASE_DATABASE_DESCRIPTOR).toMatchObject({
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });

  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);

  const panel = page.locator("#core-minor-sanfang-review-panel");
  const storageBefore = await snapshotStorage(page);
  const staticReviewBefore = await snapshotStaticReview(page);
  await expect(panel).toHaveAttribute("data-packet-state", "unavailable");
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveAttribute("data-state", "verified", {
    timeout: 60_000
  });
  await expect(panel).toHaveAttribute("data-current-projection-bound", "true");
  await expect(panel).toHaveAttribute("data-packet-state", "unprepared");
  await expect(panel).toHaveAttribute("data-review-count", "12");
  await expect(panel).toHaveAttribute("data-occurrence-count", "48");
  await expect(panel).toHaveAttribute("data-identity-verified", "false");
  await expect(panel).toHaveAttribute("data-digital-signature-verified", "false");
  await expect(panel).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(panel).toHaveAttribute("data-eligible-for-formal-activation", "false");
  await expect(panel).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(panel).toHaveAttribute("data-catalog-decision-inheritance-allowed", "false");
  await expect(panel).toHaveAttribute("data-artifact-revision-or-storage-mutation-performed", "false");
  await expect(panel).toHaveAttribute("data-network-upload-performed", "false");
  await expect(panel).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(panel).toHaveAttribute("data-event-outcome", "null");
  await expect(panel).toHaveAttribute("data-result", "null");

  await page.locator("#core-minor-sanfang-review-prepare").click();
  await expect(panel).toHaveAttribute("data-packet-state", "ready", { timeout: 30_000 });
  const boundFactsSha256 = await panel.getAttribute("data-artifact-facts-sha256");
  expect(boundFactsSha256).toMatch(/^[a-f0-9]{64}$/u);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#core-minor-sanfang-review-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename())
    .toBe("hakimi-ziwei-current-chart-core-minor-sanfang-review-v013.json");
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("v0.13 审稿模板下载缺少本地路径");
  const rawTemplate = await readFile(downloadPath, "utf8");
  const template = JSON.parse(rawTemplate) as ReviewTemplate;

  expect(template.profile).toMatchObject({
    formatVersion: "hakimi.ziwei.core_minor_star_sanfang_review_feedback/0.1.0",
    templateVersion: "0.13.0",
    reviewScope: "current_chart_all_twelve_sanfang_groups",
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    staticCatalogDecisionInheritanceApplied: false
  });
  expect(template.projectionBinding).toMatchObject({
    sanfangRuleId: "ziwei.sanfang_geometry.iztro_docs.v1",
    artifactFactsSha256: boundFactsSha256,
    reviewCount: 12,
    itemCount: 48,
    sourceCount: 5
  });
  expect(template.sourceRegistry).toHaveLength(5);
  expect(template.items).toHaveLength(48);
  expect(new Set(template.items.map((item) => item.occurrenceId)).size).toBe(48);
  expect(new Set(template.items.map((item) => item.reviewId)).size).toBe(12);
  expect(template.declaredCounts).toMatchObject({ total: 48, unresolved: 48 });
  expect(template.items.every((item) => (
    !item.expertTruthClaimed
    && !item.formalActivationAllowed
    && !item.scoringAllowed
    && item.goodBadOrientation === null
    && item.eventOutcome === null
    && item.result === null
  ))).toBe(true);
  expect(template.boundary).toMatchObject({
    derivedChartFactsRemainSensitive: true,
    sha256IsNotEncryption: true,
    identityVerified: false,
    digitalSignatureVerified: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    networkTransmissionPerformed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    scoringAllowed: false,
    deterministicOutcomeEstablished: false,
    staticCatalogDecisionInheritanceApplied: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });

  await page.locator("#core-minor-sanfang-review-file").setInputFiles({
    name: "current-chart-v013.json",
    mimeType: "application/json",
    buffer: Buffer.from(rawTemplate, "utf8")
  });
  await expect(panel).toHaveAttribute("data-preflight-state", "valid");
  await expect(panel).toHaveAttribute("data-packet-state", "ready");
  await expect(page.locator("#core-minor-sanfang-review-message")).toHaveAttribute(
    "data-state",
    "success"
  );
  await expect(page.locator("#core-minor-sanfang-review-resolved")).toHaveText("0");

  const selectedTarget = await page.locator("#sanfang-focus").inputValue();
  const alternateTarget = await page.locator("#sanfang-focus option").evaluateAll(
    (options, excluded) => options
      .map((option) => (option as HTMLOptionElement).value)
      .find((value) => value !== excluded) ?? "",
    selectedTarget
  );
  expect(alternateTarget).not.toBe("");
  await page.locator("#sanfang-focus").selectOption(alternateTarget);
  await expect(panel).toHaveAttribute("data-display-target-earthly-branch-id", alternateTarget);
  await expect(panel).toHaveAttribute("data-packet-state", "ready");
  await expect(panel).toHaveAttribute("data-preflight-state", "valid");
  await expect(panel).toHaveAttribute("data-artifact-facts-sha256", boundFactsSha256!);

  await panel.screenshot({
    path: testInfo.outputPath("ziwei-core-minor-sanfang-review-v013-desktop.png"),
    animations: "disabled"
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  expect(await page.locator(".core-minor-sanfang-review-actions").evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length
  ))).toBe(1);
  await panel.screenshot({
    path: testInfo.outputPath("ziwei-core-minor-sanfang-review-v013-mobile.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  const tamperedTemplate = structuredClone(template);
  tamperedTemplate.projectionBinding.artifactFactsSha256 = "0".repeat(64);
  await page.locator("#core-minor-sanfang-review-file").setInputFiles({
    name: "tampered-current-chart-v013.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(tamperedTemplate), "utf8")
  });
  await expect(panel).toHaveAttribute("data-preflight-state", "invalid");
  await expect(panel).toHaveAttribute("data-packet-state", "ready");
  await expect(page.locator("#core-minor-sanfang-review-message")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#core-minor-sanfang-review-items")).toBeHidden();

  await page.locator("#birth-date").fill("1991-02-03");
  await expect(panel).toHaveAttribute("data-packet-state", "unavailable");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveAttribute("data-state", "verified", {
    timeout: 60_000
  });
  await expect(panel).toHaveAttribute("data-packet-state", "unprepared");
  await expect(panel).not.toHaveAttribute("data-artifact-facts-sha256", boundFactsSha256!);
  await page.locator("#core-minor-sanfang-review-file").setInputFiles({
    name: "old-current-chart-v013.json",
    mimeType: "application/json",
    buffer: Buffer.from(rawTemplate, "utf8")
  });
  await expect(panel).toHaveAttribute("data-preflight-state", "invalid");
  await expect(page.locator("#core-minor-sanfang-review-items")).toBeHidden();

  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");
  expect(await snapshotStorage(page)).toEqual(storageBefore);
  expect(await snapshotStaticReview(page)).toEqual(staticReviewBefore);
  expect(page.url()).toBe("http://127.0.0.1:4218/");
  expect(consoleProblems).toEqual([]);
});
