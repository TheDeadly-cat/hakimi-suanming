import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";

async function installFaultWorker(page: Page, mode: "crash" | "malformed"): Promise<void> {
  await page.addInitScript((faultMode) => {
    class FaultWorker {
      private listeners: Record<string, Array<(event: unknown) => void>> = {};

      constructor(_url: string | URL) {
        queueMicrotask(() => {
          const fire = (type: string, event: unknown) => {
            for (const listener of this.listeners[type] ?? []) listener(event);
          };
          if (faultMode === "crash") {
            fire("error", {
              message: "synthetic western worker crash",
              preventDefault: () => undefined
            });
          } else {
            fire("message", {
              data: {
                protocolVersion: "western-astronomy-browser-parity/0.1-draft",
                ok: false,
                requestId: "00000000-0000-4000-8000-000000000000",
                error: "synthetic malformed response"
              }
            });
          }
        });
      }

      addEventListener(type: string, callback: (event: unknown) => void): void {
        (this.listeners[type] ??= []).push(callback);
      }

      removeEventListener(): void {}
      postMessage(): void {}
      terminate(): void {}
    }
    (window as unknown as { Worker: unknown }).Worker = FaultWorker;
  }, mode);
}

async function expectFailClosed(page: Page, alertText: RegExp): Promise<void> {
  await expect(page.locator("#workspace-status")).toHaveText("本次计算失败关闭，没有保存任何资料。", {
    timeout: 30_000
  });
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.locator("#form-error")).toContainText(alertText);
  await expect(page.locator("#bodies-list")).toBeHidden();
  await expect(page.locator("#houses-list")).toBeHidden();
  await expect(page.locator("#angles-list")).toBeHidden();
  await expect(page.locator("#wheel-placeholder")).toBeVisible();
  await expect(page.locator("#first-read-content")).toBeHidden();
  await expect(page.locator("#body-synthesis-content-list")).toBeHidden();
  await expect(page.locator("#chart-ruler-content")).toBeHidden();
  await expect(page.locator("#dispositor-content-list")).toBeHidden();
  await expect(page.locator("#angle-proximity-content")).toBeHidden();
  await expect(page.locator("#angle-content-list")).toBeHidden();
  await expect(page.locator("#distribution-content")).toBeHidden();
  await expect(page.locator("#house-ruler-content-list")).toBeHidden();
  await expect(page.locator("#placement-content-list")).toBeHidden();
  await expect(page.locator("#aspect-content-list")).toBeHidden();
  await expect(page.locator("#content-facts-hash")).toHaveText("尚未生成");
  await expect(page.locator("#dynamic-review-feedback-download")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-file")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-total")).toHaveText("—");
  await expect(page.locator("#dynamic-review-feedback-items")).toBeHidden();
}

test("4219 规则层预览在双浏览器完成计算且零持久化", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await expect(page.locator("#workspace-status")).toHaveText("等待一次计算。");
  await expect(page.locator("#first-read-content")).toBeHidden();

  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator("#workspace-status")).toContainText("已生成日月上升首读、逐星综合、命主星、定位星链、四轴距离账、结构分布与落位相位候选");
  await expect(page.locator("#bodies-list > li")).toHaveCount(10);
  await expect(page.locator("#houses-list > li")).toHaveCount(12);
  await expect(page.locator("#angles-list > div")).toHaveCount(4);
  await expect(page.locator("#wheel-placeholder")).toHaveCount(0);
  await expect(page.locator("#first-read-content > article")).toHaveCount(1);
  await expect(page.locator("#body-synthesis-content-list > li")).toHaveCount(10);
  await expect(page.locator("#chart-ruler-content > article")).toHaveCount(1);
  await expect(page.locator("#dispositor-content-list > li")).toHaveCount(10);
  await expect(page.locator("#angle-proximity-content > article")).toHaveCount(1);
  await expect(page.locator("#angle-proximity-content [data-body-id]")).toHaveCount(10);
  await expect(page.locator("#angle-content-list > li")).toHaveCount(4);
  await expect(page.locator("#distribution-content > article")).toHaveCount(1);
  await expect(page.locator("#house-ruler-content-list > li")).toHaveCount(12);
  await expect(page.locator("#placement-content-list > li")).toHaveCount(10);
  await expect(page.locator("#aspect-content-list > li")).toHaveCount(23);
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);
  await expect(page.locator(".content-candidate-card[data-review-result='null']")).toHaveCount(73);
  const firstRead = page.locator("#first-read-content > article");
  await expect(firstRead).toHaveAttribute("data-evidence-class", "derived_reading_order_projection");
  await expect(firstRead).toHaveAttribute("data-available-count", "4");
  await expect(firstRead).toHaveAttribute("data-missing-keys", "none");
  await expect(firstRead).toHaveAttribute("data-selected-primary-factor", "null");
  await expect(firstRead).toHaveAttribute("data-overall-result", "null");
  await expect(firstRead).toHaveAttribute("data-good-bad-orientation", "null");
  const firstReadEntries = firstRead.locator(".first-read-entry-list > li");
  await expect(firstReadEntries).toHaveCount(4);
  expect(await firstReadEntries.evaluateAll((entries) => entries.map((entry) => ({
    key: (entry as HTMLElement).dataset.firstReadKey,
    sequence: (entry as HTMLElement).dataset.sequence,
    availability: (entry as HTMLElement).dataset.availability
  })))).toEqual([
    { key: "sun", sequence: "1", availability: "available" },
    { key: "moon", sequence: "2", availability: "available" },
    { key: "ascendant", sequence: "3", availability: "available" },
    { key: "chart_ruler", sequence: "4", availability: "available" }
  ]);
  await expect(firstRead).toContainText("固定导航顺序，不是主导力量排名");
  await expect(firstRead).toContainText("太阳 · 自我表达入口");
  await expect(firstRead).toContainText("月亮 · 需要与反应入口");
  await expect(firstRead).toContainText("上升 · 外在进入方式");
  await expect(firstRead).toContainText("命主星 · 上升主题去向");
  await expect(firstRead).toContainText("主项选择：null；综合方向：null；吉凶方向：null");
  await firstRead.screenshot({
    path: path.join(os.tmpdir(), `hakimi-western-content-v05-first-read-${test.info().project.name}-desktop.png`),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
  await expect(firstReadEntries).toHaveCount(4);
  await firstRead.screenshot({
    path: path.join(os.tmpdir(), `hakimi-western-content-v05-first-read-${test.info().project.name}-mobile.png`),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator("#body-synthesis-content-list > li[data-overall-result='null']"))
    .toHaveCount(10);
  await expect(page.locator("#body-synthesis-content-list > li[data-good-bad-orientation='null']"))
    .toHaveCount(10);
  await expect(page.locator("#body-synthesis-content-list > li[data-evidence-class='derived_same_body_projection']"))
    .toHaveCount(10);
  await expect(page.locator("#content-sources > li")).toHaveCount(31);
  await expect(page.locator("#content-sources > li[data-source-role='scientific_boundary']"))
    .toHaveCount(1);
  await expect(page.locator("#content-boundary"))
    .toHaveAttribute("data-content-version", "western-astrology-neutral-content/0.5-draft");
  await expect(page.locator("#content-boundary")).toContainText("不是经科学验证的因果结论");
  await expect(page.locator("#content-boundary")).toContainText("首读是导航而非主导排名");
  await expect(page.locator("#content-boundary")).toContainText("逐星综合不生成主导排序");
  await expect(page.locator("#content-boundary")).toContainText("不预设统一 orb 或强弱评分");
  await expect(page.locator("#content-facts-hash")).toHaveText(/^[a-f0-9]{64}$/);
  await expect(page.locator("#placement-content-list > li").first()).toContainText("太阳关注");
  await expect(page.locator("#placement-content-list > li").first()).toContainText("可用的一端");
  await expect(page.locator("#placement-content-list > li").first()).toContainText("需要留意的一端");
  await expect(page.locator("#placement-content-list > li").first()).toContainText("专家结论：未生成（result:null）");
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='sun']"))
    .toContainText("太阳综合阅读包");
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='sun']"))
    .toContainText("出现矛盾时保留矛盾");
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='sun']"))
    .toContainText("综合方向：null；吉凶方向：null");
  await expect(page.locator("#body-synthesis-content-list details.body-synthesis-detail"))
    .toHaveCount(10);
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='sun'] details.body-synthesis-detail"))
    .not.toHaveAttribute("open", "");
  await page.locator("#body-synthesis-content-list > li[data-body-id='sun'] details.body-synthesis-detail > summary").click();
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='sun'] details.body-synthesis-detail"))
    .toHaveAttribute("open", "");
  const aspectLinkCount = await page.locator("#body-synthesis-content-list [data-aspect-id]").count();
  expect(aspectLinkCount).toBe(46);
  await expect(page.locator("#body-synthesis-content-list > li[data-body-id='saturn']"))
    .toHaveAttribute("data-slow-body-house-first", "true");
  await expect(page.locator("#angle-content-list > li").first()).toContainText("上升（ASC）");
  await expect(page.locator("#chart-ruler-content [data-ruler-profile='traditional']"))
    .toHaveAttribute("data-ruler-body-id", /.+/);
  await expect(page.locator("#chart-ruler-content [data-ruler-profile='modern']"))
    .toHaveAttribute("data-ruler-body-id", /.+/);
  await expect(page.locator("#dispositor-content-list [data-chain-profile='traditional']"))
    .toHaveCount(10);
  await expect(page.locator("#dispositor-content-list [data-chain-profile='modern']"))
    .toHaveCount(10);
  await expect(page.locator("#angle-proximity-content")).toContainText("不设统一 orb");
  const proximityDistances = await page.locator("#angle-proximity-content [data-body-id]")
    .evaluateAll((rows) => rows.map((row) => Number((row as HTMLElement).dataset.separationDeg)));
  expect(proximityDistances).toHaveLength(10);
  expect(proximityDistances).toEqual([...proximityDistances].sort((left, right) => left - right));
  expect(proximityDistances.every(Number.isFinite)).toBe(true);
  expect(await page.locator("#angle-proximity-content [data-is-angular]").count()).toBe(0);
  await expect(page.locator("#distribution-content [data-distribution-scope='all_bodies']"))
    .toContainText("全部已计算天体（10）");
  await expect(page.locator("#distribution-content [data-distribution-scope='core_five']"))
    .toContainText("核心五体");
  await expect(page.locator("#house-ruler-content-list [data-cusp-sign-id='scorpio']"))
    .toHaveCount(1);
  await expect(page.locator("#house-ruler-content-list [data-cusp-sign-id='scorpio'] [data-ruler-profile='traditional']"))
    .toHaveAttribute("data-ruler-body-id", "mars");
  await expect(page.locator("#house-ruler-content-list [data-cusp-sign-id='scorpio'] [data-ruler-profile='modern']"))
    .toHaveAttribute("data-ruler-body-id", "pluto");
  await expect(page.locator("a[data-source-id='astrodienst.planet.sun']").first())
    .toHaveAttribute("href", "https://www.astro.com/astrowiki/en/Sun");
  const tropicalFactsHash = await page.locator("#content-facts-hash").textContent();

  await page.locator("#sidereal-mode").check();
  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator("#chart-ruler-content > article")).toHaveCount(1);
  await expect(page.locator("#first-read-content > article")).toHaveCount(1);
  await expect(page.locator("#body-synthesis-content-list > li")).toHaveCount(10);
  await expect(page.locator("#dispositor-content-list > li")).toHaveCount(10);
  await expect(page.locator("#angle-proximity-content [data-body-id]")).toHaveCount(10);
  await expect(page.locator("#angle-content-list > li")).toHaveCount(4);
  await expect(page.locator("#distribution-content > article")).toHaveCount(1);
  await expect(page.locator("#house-ruler-content-list > li")).toHaveCount(12);
  await expect(page.locator("#placement-content-list > li")).toHaveCount(10);
  await expect(page.locator("#aspect-content-list > li")).toHaveCount(23);
  await expect(page.locator("#content-facts-hash")).toHaveText(/^[a-f0-9]{64}$/);
  expect(await page.locator("#content-facts-hash").textContent()).not.toBe(tropicalFactsHash);

  await page.locator("#utc-instant").fill("2025-03-20 09:01:00.000Z");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status"))
    .toHaveText("输入未通过校验；未启动 Worker，也未保留旧结果。");
  await expect(page.locator("#bodies-list")).toBeHidden();
  await expect(page.locator("#houses-list")).toBeHidden();
  await expect(page.locator("#aspects-list")).toBeHidden();
  await expect(page.locator("#wheel-placeholder")).toBeVisible();
  await expect(page.locator("#first-read-content")).toBeHidden();
  await expect(page.locator("#body-synthesis-content-list")).toBeHidden();
  await expect(page.locator("#chart-ruler-content")).toBeHidden();
  await expect(page.locator("#dispositor-content-list")).toBeHidden();
  await expect(page.locator("#angle-proximity-content")).toBeHidden();
  await expect(page.locator("#angle-content-list")).toBeHidden();
  await expect(page.locator("#distribution-content")).toBeHidden();
  await expect(page.locator("#house-ruler-content-list")).toBeHidden();
  await expect(page.locator("#placement-content-list")).toBeHidden();
  await expect(page.locator("#aspect-content-list")).toBeHidden();
  await expect(page.locator("#content-facts-hash")).toHaveText("尚未生成");

  const storage = await page.evaluate(async () => {
    const databases = typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((entry) => entry.name)
      : null;
    return {
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
      indexedDbNames: databases
    };
  });
  expect(storage.localStorageKeys).toEqual([]);
  expect(storage.sessionStorageKeys).toEqual([]);
  expect(storage.indexedDbNames ?? []).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("4219 西洋 43 项基础内容审稿模板可下载、只读预检且篡改后清空", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  const projectName = test.info().project.name;
  const downloadedPath = path.join(
    os.tmpdir(),
    `hakimi-western-content-review-v006-template-${projectName}.json`
  );
  const validPath = path.join(
    os.tmpdir(),
    `hakimi-western-content-review-v006-valid-${projectName}.json`
  );
  const tamperedPath = path.join(
    os.tmpdir(),
    `hakimi-western-content-review-v006-tampered-${projectName}.json`
  );

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#review-feedback-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "hakimi-western-content-primitives-review-v006.json"
  );
  await download.saveAs(downloadedPath);
  const rawTemplate = await fs.readFile(downloadedPath, "utf8");
  expect(rawTemplate.endsWith("\n")).toBe(true);
  const feedback = JSON.parse(rawTemplate) as Record<string, any>;
  expect(feedback.profile).toMatchObject({
    formatVersion: "hakimi.western.content_review_feedback/0.1.0",
    templateVersion: "0.6.0",
    expectedItemCount: 43,
    expectedSourceCount: 31,
    catalogScope: "fixed_43_primitive_content_only",
    dynamicCompositionCoverage: "not_included_requires_separate_review"
  });
  expect(feedback.items).toHaveLength(43);
  expect(feedback.sourceRegistry).toHaveLength(31);
  expect(feedback.catalogBinding.catalogSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(feedback.catalogBinding.orderedContentIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(feedback.catalogBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(Object.fromEntries(["planet", "sign", "house", "aspect", "angle"].map((category) => [
    category,
    feedback.items.filter((item: Record<string, unknown>) => item.category === category).length
  ]))).toEqual({ planet: 10, sign: 12, house: 12, aspect: 5, angle: 4 });
  expect(feedback.boundary).toMatchObject({
    identityVerified: false,
    digitalSignatureVerified: false,
    scientificValidityEstablished: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    dynamicCompositionReviewed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });

  feedback.reviewer = {
    reviewerId: "reviewer-browser-001",
    displayName: "浏览器审稿样例",
    affiliation: "独立研究者",
    expertiseStatement: "研究传统与现代西洋占星解释方法",
    identityEvidenceReference: "self-declared://reviewer-browser-001",
    identityVerified: false
  };
  feedback.reviewSession = {
    reviewedAt: "2026-08-12T19:00:00+08:00",
    methodology: "逐项检查语义、条件、反例和来源边界",
    traditionScope: "传统占星与现代心理占星并列",
    generalNotes: "只读预检样例"
  };
  Object.assign(feedback.items[0], {
    decision: "approve",
    orientationProposal: "mixed_conditional",
    selectedTradition: "传统占星与现代心理占星并列",
    decisionReason: "可保留为待组合的基础候选，不应单独作结论。",
    applicabilityConditions: "出生资料可靠，并与宫位、相位和尊贵状态合参。",
    counterexamples: "强相位、守护链或现实经历与标准表达冲突时需要修正。",
    revisionRequest: "",
    additionalSourceUrls: ["https://example.org/western-review-note"]
  });
  feedback.declaredCounts = {
    total: 43, unresolved: 42, approve: 1, revise: 0, reject: 0
  };
  feedback.declaredOrientationProposalCounts = {
    total: 43,
    unresolved: 42,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 1,
    notAssessable: 0
  };
  await fs.writeFile(validPath, `${JSON.stringify(feedback, null, 2)}\n`, "utf8");

  await page.locator("#review-feedback-file").setInputFiles(validPath);
  await expect(page.locator("#review-feedback-message")).toHaveAttribute("data-state", "success");
  await expect(page.locator("#review-feedback-message")).toContainText("覆盖 43 项基础内容");
  await expect(page.locator("#review-feedback-message")).toContainText("不覆盖数量随命盘变化的动态组合卡");
  await expect(page.locator("#review-feedback-total")).toHaveText("43");
  await expect(page.locator("#review-feedback-resolved")).toHaveText("1");
  await expect(page.locator("#review-feedback-unresolved")).toHaveText("42");
  await expect(page.locator("#review-feedback-reviewer"))
    .toHaveText("浏览器审稿样例（自述，未核验）");
  await expect(page.locator("#review-feedback-items > li")).toHaveCount(1);
  const renderedReview = page.locator("#review-feedback-items > li").first();
  await expect(renderedReview).toHaveAttribute("data-category", "planet");
  await expect(renderedReview).toHaveAttribute("data-decision", "approve");
  await expect(renderedReview).toHaveAttribute("data-orientation-proposal", "mixed_conditional");
  await expect(renderedReview).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(renderedReview).toHaveAttribute("data-scientific-validity-claimed", "false");
  await expect(renderedReview).toHaveAttribute("data-formal-activation-allowed", "false");
  await expect(renderedReview).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(renderedReview).toHaveAttribute("data-event-outcome", "null");
  await expect(renderedReview).toHaveAttribute("data-result", "null");
  await expect(renderedReview).toContainText("正反并见，取决于条件");
  await expect(renderedReview).toContainText("传统占星与现代心理占星并列");
  await expect(page.locator("#review-feedback-panel"))
    .toHaveAttribute("data-scientific-validity-established", "false");
  await expect(page.locator("#review-feedback-panel"))
    .toHaveAttribute("data-rule-artifact-or-storage-mutation-performed", "false");
  await expect(page.locator("#review-feedback-panel"))
    .toHaveAttribute("data-dynamic-composition-reviewed", "false");
  await expect(page.locator("#review-feedback-panel"))
    .toHaveAttribute("data-good-bad-orientation", "null");
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);

  await page.locator("#review-feedback-panel").screenshot({
    path: path.join(
      os.tmpdir(),
      `hakimi-western-content-review-v006-${projectName}-desktop.png`
    ),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
  await page.locator("#review-feedback-panel").screenshot({
    path: path.join(
      os.tmpdir(),
      `hakimi-western-content-review-v006-${projectName}-mobile.png`
    ),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  const tampered = JSON.parse(JSON.stringify(feedback)) as Record<string, any>;
  tampered.catalogBinding.catalogSha256 = "0".repeat(64);
  await fs.writeFile(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");
  await page.locator("#review-feedback-file").setInputFiles(tamperedPath);
  await expect(page.locator("#review-feedback-message")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#review-feedback-message")).toContainText("预检失败");
  await expect(page.locator("#review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#review-feedback-unresolved")).toHaveText("43");
  await expect(page.locator("#review-feedback-reviewer")).toHaveText("尚未提供");
  await expect(page.locator("#review-feedback-items")).toBeHidden();
  await expect(page.locator("#review-feedback-panel"))
    .toHaveAttribute("data-dynamic-composition-reviewed", "false");
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);

  const storage = await page.evaluate(async () => {
    const databases = typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((entry) => entry.name)
      : null;
    return {
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
      indexedDbNames: databases
    };
  });
  expect(storage.localStorageKeys).toEqual([]);
  expect(storage.sessionStorageKeys).toEqual([]);
  expect(storage.indexedDbNames ?? []).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("4219 西洋当前盘动态候选可下载去直接标识模板、只读预检并随重算失效", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  const projectName = test.info().project.name;
  const downloadedPath = path.join(
    os.tmpdir(),
    `hakimi-western-dynamic-review-v007-template-${projectName}.json`
  );
  const validPath = path.join(
    os.tmpdir(),
    `hakimi-western-dynamic-review-v007-valid-${projectName}.json`
  );
  const tamperedPath = path.join(
    os.tmpdir(),
    `hakimi-western-dynamic-review-v007-tampered-${projectName}.json`
  );

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await expect(page.locator("#dynamic-review-feedback-download")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-file")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-total")).toHaveText("—");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);
  await expect(page.locator("#dynamic-review-feedback-download")).toBeEnabled();
  await expect(page.locator("#dynamic-review-feedback-file")).toBeEnabled();
  await expect(page.locator("#dynamic-review-feedback-total")).toHaveText("73");
  await expect(page.locator("#dynamic-review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#dynamic-review-feedback-unresolved")).toHaveText("73");
  const factsSha256 = await page.locator("#content-facts-hash").textContent();
  expect(factsSha256).toMatch(/^[a-f0-9]{64}$/u);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#dynamic-review-feedback-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hakimi-western-current-chart-review-v007.json");
  await download.saveAs(downloadedPath);
  const rawTemplate = await fs.readFile(downloadedPath, "utf8");
  expect(rawTemplate.endsWith("\n")).toBe(true);
  expect(rawTemplate).not.toContain("utcInstant");
  expect(rawTemplate).not.toContain("inputLabel");
  expect(rawTemplate).not.toContain("geographicLatitudeDeg");
  expect(rawTemplate).not.toContain("ramcDeg");
  expect(rawTemplate).not.toContain("obliquityTrueOfDateDeg");
  expect(rawTemplate).not.toContain("ayanamshaDeg");
  const feedback = JSON.parse(rawTemplate) as Record<string, any>;
  expect(feedback.profile).toMatchObject({
    formatVersion: "hakimi.western.dynamic_content_review_feedback/0.1.0",
    templateVersion: "0.7.0",
    reviewScope: "current_projection_dynamic_candidates_only",
    privacyScope: "direct_identifiers_removed_derived_chart_facts",
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    externalSharingRequiresUserDecision: true,
    primitiveCatalogReviewApplied: false
  });
  expect(feedback.projectionBinding).toMatchObject({
    factsSha256,
    itemCount: 73,
    sourceCount: 31
  });
  expect(feedback.projectionBinding.projectionSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(feedback.projectionBinding.orderedCandidateIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(feedback.projectionBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(feedback.items).toHaveLength(73);
  expect(feedback.sourceRegistry).toHaveLength(31);
  expect(Object.fromEntries([
    "first_read", "body_synthesis", "chart_ruler", "dispositor_chain",
    "angle_proximity", "angle", "distribution", "house_ruler", "placement", "aspect"
  ].map((category) => [
    category,
    feedback.items.filter((item: Record<string, unknown>) => item.category === category).length
  ]))).toEqual({
    first_read: 1,
    body_synthesis: 10,
    chart_ruler: 1,
    dispositor_chain: 10,
    angle_proximity: 1,
    angle: 4,
    distribution: 1,
    house_ruler: 12,
    placement: 10,
    aspect: 23
  });
  expect(feedback.boundary).toMatchObject({
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    externalSharingRequiresUserDecision: true,
    identityVerified: false,
    digitalSignatureVerified: false,
    scientificValidityEstablished: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    networkTransmissionPerformed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    primitiveCatalogReviewApplied: false,
    deterministicOutcomeEstablished: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });

  feedback.reviewer = {
    reviewerId: "reviewer-browser-dynamic-001",
    displayName: "当前盘审稿样例",
    affiliation: "独立研究者",
    expertiseStatement: "研究传统与现代西洋占星整盘解释方法",
    identityEvidenceReference: "self-declared://reviewer-browser-dynamic-001",
    identityVerified: false
  };
  feedback.reviewSession = {
    reviewedAt: "2026-08-12T21:00:00+08:00",
    methodology: "逐卡检查结构事实、条件、反例和来源边界",
    traditionScope: "传统占星与现代心理占星并列",
    generalNotes: "只读预检样例"
  };
  Object.assign(feedback.items[0], {
    decision: "approve",
    orientationProposal: "mixed_conditional",
    selectedTradition: "传统占星与现代心理占星并列",
    decisionReason: "可保留为当前盘的条件化候选，不应单独作结论。",
    applicabilityConditions: "盘面派生事实可靠，并与落位、相位、守护链和现实语境合参。",
    counterexamples: "资料误差、其他紧密结构或现实经历冲突时需要修正。",
    revisionRequest: "",
    additionalSourceUrls: ["https://example.org/western-current-chart-review-note"]
  });
  feedback.declaredCounts = {
    total: 73, unresolved: 72, approve: 1, revise: 0, reject: 0
  };
  feedback.declaredOrientationProposalCounts = {
    total: 73,
    unresolved: 72,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 1,
    notAssessable: 0
  };
  await fs.writeFile(validPath, `${JSON.stringify(feedback, null, 2)}\n`, "utf8");

  await page.locator("#dynamic-review-feedback-file").setInputFiles(validPath);
  await expect(page.locator("#dynamic-review-feedback-message")).toHaveAttribute("data-state", "success");
  await expect(page.locator("#dynamic-review-feedback-message")).toContainText("严格绑定当前命盘的 73 张动态候选卡");
  await expect(page.locator("#dynamic-review-feedback-total")).toHaveText("73");
  await expect(page.locator("#dynamic-review-feedback-resolved")).toHaveText("1");
  await expect(page.locator("#dynamic-review-feedback-unresolved")).toHaveText("72");
  await expect(page.locator("#dynamic-review-feedback-reviewer"))
    .toHaveText("当前盘审稿样例（自述，未核验）");
  await expect(page.locator("#dynamic-review-feedback-items > li")).toHaveCount(1);
  const renderedReview = page.locator("#dynamic-review-feedback-items > li").first();
  await expect(renderedReview).toHaveAttribute("data-category", "first_read");
  await expect(renderedReview).toHaveAttribute("data-decision", "approve");
  await expect(renderedReview).toHaveAttribute("data-orientation-proposal", "mixed_conditional");
  await expect(renderedReview).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(renderedReview).toHaveAttribute("data-result", "null");
  await expect(page.locator("#dynamic-review-feedback-panel"))
    .toHaveAttribute("data-current-projection-bound", "true");
  await expect(page.locator("#dynamic-review-feedback-panel"))
    .toHaveAttribute("data-scientific-validity-established", "false");
  await expect(page.locator("#dynamic-review-feedback-panel"))
    .toHaveAttribute("data-network-transmission-performed", "false");
  await expect(page.locator("#dynamic-review-feedback-panel"))
    .toHaveAttribute("data-rule-artifact-or-storage-mutation-performed", "false");
  await expect(page.locator("#dynamic-review-feedback-panel"))
    .toHaveAttribute("data-primitive-catalog-review-applied", "false");
  await expect(page.locator("#review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#review-feedback-unresolved")).toHaveText("43");
  await expect(page.locator(".content-candidate-card[data-review-status='awaiting_expert_review']"))
    .toHaveCount(73);
  await expect(page.locator(".content-candidate-card[data-review-result='null']")).toHaveCount(73);

  await page.locator("#dynamic-review-feedback-panel").screenshot({
    path: path.join(os.tmpdir(), `hakimi-western-dynamic-review-v007-${projectName}-desktop.png`),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ body: 0, root: 0 });
  await page.locator("#dynamic-review-feedback-panel").screenshot({
    path: path.join(os.tmpdir(), `hakimi-western-dynamic-review-v007-${projectName}-mobile.png`),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  const tampered = JSON.parse(JSON.stringify(feedback)) as Record<string, any>;
  tampered.items[0].contextLines[0] += " changed";
  await fs.writeFile(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");
  await page.locator("#dynamic-review-feedback-file").setInputFiles(tamperedPath);
  await expect(page.locator("#dynamic-review-feedback-message")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#dynamic-review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#dynamic-review-feedback-unresolved")).toHaveText("73");
  await expect(page.locator("#dynamic-review-feedback-items")).toBeHidden();

  await page.locator("#utc-instant").fill("2025-03-21T09:01:00.000Z");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#workspace-status")).toContainText("计算完成并通过工程核对（10 天体）", {
    timeout: 60_000
  });
  await expect(page.locator("#dynamic-review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#dynamic-review-feedback-items")).toBeHidden();
  await page.locator("#dynamic-review-feedback-file").setInputFiles(validPath);
  await expect(page.locator("#dynamic-review-feedback-message")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#dynamic-review-feedback-message")).toContainText("没有绑定当前已显示命盘");
  await expect(page.locator("#dynamic-review-feedback-items")).toBeHidden();

  await page.locator("#utc-instant").fill("invalid");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#dynamic-review-feedback-download")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-file")).toBeDisabled();
  await expect(page.locator("#dynamic-review-feedback-total")).toHaveText("—");
  await expect(page.locator("#dynamic-review-feedback-items")).toBeHidden();

  const storage = await page.evaluate(async () => {
    const databases = typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((entry) => entry.name)
      : null;
    const cacheKeys = "caches" in window ? await caches.keys() : [];
    return {
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
      indexedDbNames: databases,
      cacheKeys
    };
  });
  expect(storage.localStorageKeys).toEqual([]);
  expect(storage.sessionStorageKeys).toEqual([]);
  expect(storage.indexedDbNames ?? []).toEqual([]);
  expect(storage.cacheKeys).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("4219 Worker 崩溃时失败关闭且不渲染任何结果", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installFaultWorker(page, "crash");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await page.locator("#calculate-button").click();
  await expectFailClosed(page, /synthetic western worker crash/);
  expect(consoleProblems).toEqual([]);
});

test("4219 畸形 Worker 回执时失败关闭且不渲染任何结果", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installFaultWorker(page, "malformed");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");
  await page.locator("#calculate-button").click();
  await expectFailClosed(page, /protocol or outcome is invalid/);
  expect(consoleProblems).toEqual([]);
});

test("4219 表单级参数错误在启动 Worker 前失败关闭", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("西洋星盘规则层预览 · 隔离草案");

  await page.locator("#utc-instant").fill("2025-03-20 09:01:00.000Z");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.locator("#form-error")).toContainText("UTC 瞬时必须使用规范毫秒 Z 形式");
  await expect(page.locator("#workspace-status"))
    .toHaveText("输入未通过校验；未启动 Worker，也未保留旧结果。");

  await page.locator("#utc-instant").fill("2025-03-20T09:01:00.000Z");
  await page.locator("#latitude-deg").fill("61");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.locator("#form-error")).toContainText("纬度暂限 ±60°");
  await expect(page.locator("#workspace-status"))
    .toHaveText("输入未通过校验；未启动 Worker，也未保留旧结果。");
  expect(consoleProblems).toEqual([]);
});
