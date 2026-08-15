import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import { collectConsoleProblems } from "../../../apps/web/e2e/full-backup-helpers";
import { IndexedDbZiweiBrowserWorkspaceDraft } from "../src/browser-persistence.ts";

type SaveInput = Parameters<IndexedDbZiweiBrowserWorkspaceDraft["saveRevision"]>[0];

async function buildConflictingZiweiBackups(
  artifact: SaveInput["artifact"]
): Promise<{ first: Buffer; second: Buffer; revisionId: string }> {
  const revisionId = crypto.randomUUID();
  const makeBackup = async (title: string): Promise<Buffer> => {
    const repository = new IndexedDbZiweiBrowserWorkspaceDraft(new FDBFactory());
    await repository.saveRevision({
      studyId: crypto.randomUUID(),
      revisionId,
      parentRevisionId: null,
      createdAt: new Date().toISOString(),
      title,
      note: "",
      artifact
    }, 0);
    const exported = await repository.exportFullBackup();
    return Buffer.from(exported.bytes);
  };
  return {
    first: await makeBackup("冲突甲"),
    second: await makeBackup("冲突乙"),
    revisionId
  };
}

async function installFaultWorker(page: Page, mode: "crash" | "malformed"): Promise<void> {
  await page.addInitScript((faultMode) => {
    class FaultWorker {
      private listeners: Record<string, Array<(event: unknown) => void>> = {};

      constructor(_url: string | URL, _options?: unknown) {
        queueMicrotask(() => {
          const fire = (type: string, event: unknown) => {
            for (const listener of this.listeners[type] ?? []) listener(event);
          };
          if (faultMode === "crash") {
            fire("error", {
              message: "synthetic ziwei worker crash",
              preventDefault: () => undefined
            });
          } else {
            fire("message", {
              data: {
                protocolVersion: "wrong-ziwei-browser-probe-protocol",
                requestId: "00000000-0000-4000-8000-000000000000",
                ok: false,
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

async function expectCalculationFailClosed(page: Page): Promise<void> {
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "error", {
    timeout: 30_000
  });
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.locator("#artifact-badge")).toHaveText("尚未生成");
  await expect(page.locator("#save-form")).toBeHidden();
  await expect(page.locator("#revision-count")).toHaveText("0");
}

async function installAbortNextReadWrite(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const prototype = IDBDatabase.prototype;
    const original = prototype.transaction;
    prototype.transaction = function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase["transaction"]>
    ) {
      const transaction = original.apply(this, args);
      const win = window as unknown as { __abortNextReadWrite?: boolean };
      if (win.__abortNextReadWrite && args[1] === "readwrite") {
        win.__abortNextReadWrite = false;
        try {
          transaction.abort();
        } catch {
          // The transaction may already be inactive; requests below will fail
          // and the repository normalizes the failure as TRANSACTION_ABORTED.
        }
      }
      return transaction;
    };
  });
}

async function installQuotaFailureOnNextWrite(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const prototype = IDBObjectStore.prototype;
    const failNext = (method: "put" | "add") => {
      const original = prototype[method];
      prototype[method] = function (this: IDBObjectStore, ...args: unknown[]) {
        const win = window as unknown as { __failNextWriteWithQuota?: boolean };
        if (win.__failNextWriteWithQuota) {
          win.__failNextWriteWithQuota = false;
          throw new DOMException("Simulated device quota exceeded", "QuotaExceededError");
        }
        return Reflect.apply(original, this, args) as unknown;
      };
    };
    failNext("put");
    failNext("add");
  });
}

async function waitForWorkspaceReady(page: Page) {
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "ready", {
    timeout: 30_000
  });
  await expect(page.locator("#revision-count")).not.toHaveText("—");
}

type BrowserStorageSnapshot = Readonly<{
  databaseNames: readonly string[];
  database: Readonly<{
    name: string;
    version: number;
    stores: Readonly<Record<string, Readonly<{
      keys: readonly unknown[];
      values: readonly unknown[];
    }>>>;
  }>;
  localStorage: readonly (readonly [string, string])[];
  sessionStorage: readonly (readonly [string, string])[];
  cacheKeys: readonly string[];
}>;

async function snapshotWorkspaceStorage(page: Page): Promise<BrowserStorageSnapshot> {
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

async function selectDifferentTargetContainingStar(
  page: Page,
  starLabel: string,
  excludedTarget: string
): Promise<string> {
  const targets = await page.locator("#sanfang-focus option").evaluateAll((options) => (
    options.map((option) => (option as HTMLOptionElement).value)
  ));
  for (const target of targets) {
    if (target === excludedTarget) continue;
    await page.locator("#sanfang-focus").selectOption(target);
    const found = await page.locator(".sanfang-star-fact").evaluateAll(
      (facts, label) => facts.some((fact) => (fact as HTMLElement).dataset.starLabel === label),
      starLabel
    );
    if (found) return target;
  }
  throw new Error(`找不到包含 ${starLabel} 且不同于 ${excludedTarget} 的三方四正目标宫位`);
}

async function calculateAndSave(page: Page, date: string, title: string) {
  await page.locator("#birth-date").fill(date);
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await page.locator("#revision-title").fill(title);
  await page.locator("#save-button").click();
  await expect(page.locator("#workspace-status")).toContainText("已保存到独立紫微档案", {
    timeout: 30_000
  });
}

test("独立 4218 工作台完成计算、保存、重开、跨标签刷新与唯一清空", async ({ page, context }, testInfo) => {
  const consoleProblems = collectConsoleProblems(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await expect(page.locator("#revision-count")).toHaveText("0");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", { timeout: 60_000 });
  await expect(page.locator("#save-form")).toBeVisible();
  await expect(page.locator("#revision-title")).not.toHaveValue("");
  await expect(page.locator("#sanfang-panel")).toBeVisible();
  await expect(page.locator("#sanfang-focus option")).toHaveCount(12);
  await expect(page.locator("#sanfang-target-summary")).toContainText("命宫为本宫");
  await expect(page.locator("#palace-reading-review")).toBeVisible();
  await expect(page.locator(".palace-first-synthesis")).toHaveCount(1);
  await expect(page.locator(
    '.palace-first-synthesis[data-review-status="awaiting_expert_review"]'
      + '[data-evidence-class="derived_palace_first_projection"]'
      + '[data-result="null"][data-good-bad-orientation="null"][data-event-outcome="null"]'
      + '[data-target-main-star-state="present"]'
      + '[data-target-synthesis-count="1"][data-group-synthesis-count="5"]'
  )).toHaveCount(1);
  await expect(page.locator(".palace-first-heading strong")).toHaveText("命宫 · 逐宫直读复核包");
  await expect(page.locator(".palace-first-status")).toHaveText("结论待审");
  await expect(page.locator(".palace-first-domain")).toContainText("问题域候选");
  await expect(page.locator(".palace-first-direct")).toContainText("本宫戊寅主星见七杀〔庙〕");
  await expect(page.locator(".palace-first-member")).toHaveCount(4);
  await expect(page.locator('.palace-first-member[data-relation="self"]')).toHaveCount(1);
  await expect(page.locator(".palace-first-review-questions li")).toHaveCount(4);
  await expect(page.locator(".palace-first-sources a")).toHaveCount(7);
  await expect(page.locator(".palace-first-detail")).not.toHaveAttribute("open", "");
  await expect(page.locator(
    '.natal-transformation-review[data-review-status="awaiting_expert_review"]'
      + '[data-evidence-class="derived_natal_transformation_modifier_projection"]'
      + '[data-transformation-scope="natal_birth_year_only"][data-occurrence-count="1"]'
      + '[data-result="null"][data-good-bad-orientation="null"][data-event-outcome="null"]'
  )).toHaveCount(1);
  await expect(page.locator(".natal-transformation-heading strong"))
    .toHaveText("本命生年四化 · 三方四正落宫修正候选");
  await expect(page.locator(".natal-transformation-status")).toHaveText("候选待审");
  await expect(page.locator(".natal-transformation-occurrence")).toHaveCount(1);
  await expect(page.locator(
    '.natal-transformation-occurrence[data-relation="opposite_plus_6"]'
      + '[data-transformation="科"]'
      + '[data-palace-content-id="ziwei.content.natal_transformation_all_palaces.ke.travel.neutral.v0_1"]'
      + '[data-base-position-state="major_star_position_candidate_present"]'
      + '[data-result="null"][data-good-bad-orientation="null"][data-event-outcome="null"]'
  )).toHaveCount(1);
  await expect(page.locator(".natal-transformation-occurrence-heading strong")).toHaveText("紫微化科");
  await expect(page.locator(".natal-transformation-position")).toContainText("紫微落迁移宫");
  await expect(page.locator(".natal-transformation-modifier")).toContainText("呈现与调和");
  await expect(page.locator(".natal-transformation-palace-modifier"))
    .toContainText("生年化科星曜落迁移宫");
  await expect(page.locator(".natal-transformation-palace-modifier"))
    .toContainText("公开表达、外部评价与被识别");
  await expect(page.locator(".natal-transformation-review-questions li")).toHaveCount(4);
  await expect(page.locator(".natal-transformation-sources a")).toHaveCount(5);
  await expect(page.locator(".natal-transformation-detail")).not.toHaveAttribute("open", "");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await page.locator(".natal-transformation-review").screenshot({
    path: testInfo.outputPath("ziwei-natal-transformation-desktop.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  await page.locator(".natal-transformation-review").screenshot({
    path: testInfo.outputPath("ziwei-natal-transformation-mobile.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const initialPalaceReviewId = await page.locator(".palace-first-synthesis").getAttribute("data-review-id");
  const initialTransformationReviewId = await page.locator(".natal-transformation-review")
    .getAttribute("data-review-id");
  expect(initialPalaceReviewId).toBeTruthy();
  expect(initialTransformationReviewId).toBeTruthy();
  await expect(page.locator(".sanfang-card")).toHaveCount(4);
  await expect(page.locator(".palace-cell[data-sanfang-relation]")).toHaveCount(4);
  await expect(page.locator('.palace-cell[data-sanfang-relation="self"]')).toHaveCount(1);
  expect(await page.locator(".sanfang-relation").allTextContents()).toEqual([
    "本宫",
    "对宫（+6）",
    "三合位（+4）",
    "三合位（−4）"
  ]);
  await expect(page.locator("#sanfang-panel")).toContainText("主星");
  await expect(page.locator("#sanfang-panel")).toContainText("生年四化");
  await expect(page.locator(".major-content")).toHaveCount(5);
  await expect(page.locator('.major-content[data-review-status="awaiting_expert_review"]')).toHaveCount(5);
  await expect(page.locator(".major-content > header .content-status")).toHaveCount(5);
  await expect(page.locator(".major-content > header .content-status")).toHaveText([
    "待专家复核", "待专家复核", "待专家复核", "待专家复核", "待专家复核"
  ]);
  await expect(page.locator("#sanfang-panel")).toContainText("七杀 · 基础语义");
  await expect(page.locator("#sanfang-panel")).toContainText("决断");
  await expect(page.locator("#sanfang-panel")).toContainText("紫微 · 基础语义");
  await expect(page.locator("#sanfang-panel")).toContainText("天府 · 基础语义");
  await expect(page.locator(".candidate-sources a", { hasText: "古典篇目" })).toHaveCount(5);
  await expect(page.locator(".candidate-sources a", { hasText: "现代研习资料" })).toHaveCount(5);
  await expect(page.locator(".candidate-sources a").first()).toHaveAttribute(
    "href",
    "https://zh.wikisource.org/zh-hans/紫微斗數全書/卷一"
  );
  await expect(page.locator(".candidate-sources a").nth(1)).toHaveAttribute(
    "href",
    "https://docs.iztro.com/learn/major-star"
  );
  await expect(page.locator(".palace-candidate")).toHaveCount(5);
  await expect(page.locator('.palace-candidate[data-review-status="awaiting_expert_review"]')).toHaveCount(5);
  await expect(page.locator(".palace-candidate .content-status")).toHaveCount(5);
  await expect(page.locator("#sanfang-panel")).toContainText("七杀落命宫 · 位置化候选");
  await expect(page.locator("#sanfang-panel")).toContainText("紫微落迁移宫 · 位置化候选");
  await expect(page.locator("#sanfang-panel")).toContainText("天府落迁移宫 · 位置化候选");
  await expect(page.locator("#sanfang-panel")).toContainText("破军落官禄宫 · 位置化候选");
  await expect(page.locator("#sanfang-panel")).toContainText("贪狼落财帛宫 · 位置化候选");
  await expect(page.locator("#sanfang-panel")).toContainText("承压");
  await expect(page.locator("#sanfang-panel")).toContainText("资源整合");
  await expect(page.locator("#sanfang-panel")).toContainText("重构");
  await expect(page.locator(".palace-candidate-sources a", { hasText: "古典落宫篇目" })).toHaveCount(5);
  await expect(page.locator(".palace-candidate-sources a", { hasText: "现代宫位资料" })).toHaveCount(5);
  await expect(page.locator(".palace-candidate-sources a").first()).toHaveAttribute(
    "href",
    "https://zh.wikisource.org/wiki/紫微斗數全書/卷二"
  );
  await expect(page.locator(".palace-candidate-sources a").nth(1)).toHaveAttribute(
    "href",
    "https://docs.iztro.com/zh_TW/learn/palace"
  );
  await expect(page.locator(".combination-review")).toHaveCount(5);
  await expect(page.locator(
    '.combination-review[data-review-status="awaiting_expert_rule"][data-result="null"]'
  )).toHaveCount(5);
  await expect(page.locator(".combination-status")).toHaveText([
    "规则待审", "规则待审", "规则待审", "规则待审", "规则待审"
  ]);
  await expect(page.locator(".combination-review-questions li")).toHaveCount(20);
  await expect(page.locator(".combination-result")).toHaveCount(5);
  await expect(page.locator(".combination-result")).toContainText([
    "未生成（result:null）", "未生成（result:null）", "未生成（result:null）",
    "未生成（result:null）", "未生成（result:null）"
  ]);
  await expect(page.locator("#sanfang-panel")).toContainText(
    "七杀〔庙〕落命宫；同宫无其他主星，另有5颗辅／杂曜"
  );
  await expect(page.locator("#sanfang-panel")).toContainText(
    "对宫（+6）迁移见紫微〔旺·科〕、天府〔得〕"
  );
  await expect(page.locator("#sanfang-panel")).toContainText("仅本命生年四化；未混入宫干或运限四化");
  await expect(page.locator(".combination-sources a", { hasText: "亮度资料" })).toHaveCount(5);
  await expect(page.locator(".combination-sources a", { hasText: "四化资料" })).toHaveCount(5);
  await expect(page.locator(".combination-sources a", { hasText: "同宫／会照术语" })).toHaveCount(5);
  await expect(page.locator(".combination-sources a", { hasText: "古典合参顺序" })).toHaveCount(5);
  await expect(page.locator(".combination-sources a").nth(0)).toHaveAttribute(
    "href",
    "https://docs.iztro.com/zh_TW/learn/star"
  );
  await expect(page.locator(".combination-sources a").nth(1)).toHaveAttribute(
    "href",
    "https://docs.iztro.com/zh_TW/learn/mutagen"
  );
  await expect(page.locator(".combination-sources a").nth(2)).toHaveAttribute(
    "href",
    "https://docs.iztro.com/learn/basis"
  );
  await expect(page.locator(".combination-sources a").nth(3)).toHaveAttribute(
    "href",
    "https://zh.wikisource.org/wiki/紫微斗數全書/卷三"
  );
  await expect(page.locator(".combination-review").first()).toHaveAttribute(
    "data-rule-snapshot-sha256",
    /^[a-f0-9]{64}$/u
  );
  await expect(page.locator(".combination-review").first()).toHaveAttribute(
    "data-artifact-facts-sha256",
    /^[a-f0-9]{64}$/u
  );
  await expect(page.locator("#sanfang-panel")).toContainText("不能据此评分");
  await expect(page.locator(".same-star-synthesis")).toHaveCount(5);
  await expect(page.locator(
    '.same-star-synthesis[data-review-status="awaiting_expert_review"]'
      + '[data-evidence-class="derived_same_star_projection"]'
      + '[data-result="null"][data-good-bad-orientation="null"][data-event-outcome="null"]'
  )).toHaveCount(5);
  await expect(page.locator(".same-star-synthesis-status")).toHaveText([
    "结论待审", "结论待审", "结论待审", "结论待审", "结论待审"
  ]);
  await expect(page.locator(".same-star-synthesis-direct")).toHaveCount(5);
  await expect(page.locator("#sanfang-panel")).toContainText("七杀落命宫 · 逐星合参复核包");
  await expect(page.locator("#sanfang-panel")).toContainText(
    "阅读顺序：先看星落宫的位置主线，再核对本星亮度与生年四化"
  );
  await expect(page.locator("#sanfang-panel")).toContainText(
    "result / goodBadOrientation / eventOutcome 均为 null"
  );
  await expect(page.locator(".same-star-synthesis-detail")).toHaveCount(5);
  expect(await page.locator(".same-star-synthesis-detail").evaluateAll(
    (details) => details.every((detail) => !(detail as HTMLDetailsElement).open)
  )).toBe(true);
  await page.locator(".same-star-synthesis-detail > summary").first().click();
  await expect(page.locator(".same-star-synthesis-detail").first()).toHaveAttribute("open", "");
  await expect(page.locator(".same-star-synthesis-detail .combination-review").first()).toBeVisible();
  await expect(page.locator("#sanfang-rule-id")).toHaveText("ziwei.sanfang_geometry.iztro_docs.v1");
  await expect(page.locator("#sanfang-source-link")).toHaveAttribute(
    "href",
    "https://docs.iztro.com/learn/basis"
  );

  const alternateTarget = await page.locator("#sanfang-focus option").nth(1).getAttribute("value");
  if (!alternateTarget) throw new Error("三方四正宫位选择器缺少第二个目标值");
  await page.locator("#sanfang-focus").selectOption(alternateTarget);
  await expect(page.locator("#sanfang-focus")).toHaveValue(alternateTarget);
  await expect(page.locator(".palace-first-synthesis")).toHaveCount(1);
  await expect(page.locator(".palace-first-synthesis")).not.toHaveAttribute(
    "data-review-id",
    initialPalaceReviewId!
  );
  await expect(page.locator(".natal-transformation-review")).toHaveCount(1);
  await expect(page.locator(".natal-transformation-review")).not.toHaveAttribute(
    "data-review-id",
    initialTransformationReviewId!
  );
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator(".palace-first-member")).toHaveCount(4);
  await expect(page.locator(".sanfang-card")).toHaveCount(4);
  await expect(page.locator(".palace-cell[data-sanfang-relation]")).toHaveCount(4);
  const alternateMajorStarCount = await page.locator(".major-content").count();
  expect(alternateMajorStarCount).toBeGreaterThan(0);
  await expect(page.locator(".palace-candidate")).toHaveCount(alternateMajorStarCount);
  await expect(page.locator(".combination-review")).toHaveCount(alternateMajorStarCount);
  await expect(page.locator(".same-star-synthesis")).toHaveCount(alternateMajorStarCount);
  await expect(page.locator(
    '.same-star-synthesis[data-result="null"]'
      + '[data-good-bad-orientation="null"][data-event-outcome="null"]'
  )).toHaveCount(alternateMajorStarCount);
  await expect(page.locator(
    '.combination-review[data-review-status="awaiting_expert_rule"][data-result="null"]'
  )).toHaveCount(alternateMajorStarCount);

  await page.locator("#birth-date").fill("1991-02-14");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", { timeout: 60_000 });
  const emptyTarget = await page.locator(
    '#sanfang-focus option[data-target-main-star-state="empty_in_verified_facts"]'
  ).first().getAttribute("value");
  if (!emptyTarget) throw new Error("十二宫选择器缺少无主星目标宫位");
  await page.locator("#sanfang-focus").selectOption(emptyTarget);
  await expect(page.locator(".palace-first-synthesis")).toHaveAttribute(
    "data-target-main-star-state",
    "empty_in_verified_facts"
  );
  await expect(page.locator(".palace-first-synthesis")).toHaveAttribute(
    "data-target-synthesis-count",
    "0"
  );
  await expect(page.locator(".palace-first-direct")).toContainText(
    "不自动借用对宫或两组三合位主星"
  );
  await expect(page.locator(".natal-transformation-review")).toHaveCount(1);
  await expect(page.locator(".natal-transformation-review")).toHaveAttribute(
    "data-transformation-scope",
    "natal_birth_year_only"
  );
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await page.locator(".palace-first-detail > summary").click();
  await expect(page.locator(".palace-first-empty-boundary")).toContainText(
    "不自动借用对宫或两组三合位主星"
  );

  await page.locator("#save-button").click();
  await expect(page.locator("#workspace-status")).toContainText("已保存到独立紫微档案", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);

  const secondTab = await context.newPage();
  await secondTab.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(secondTab);
  await expect(secondTab.locator("#revision-count")).toHaveText("1");
  await expect(secondTab.locator(".archive-item")).toHaveCount(1);
  await secondTab.close();

  await page.locator("#refresh-button").click();
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#clear-accepted").check();
  await page.locator("#clear-button").click();
  await expect(page.locator("#safety-message")).toContainText("已清空", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("2");
  await expect(page.locator(".archive-item")).toHaveCount(0);
  await expect(page.locator("#archive-empty")).toBeVisible();

  expect(consoleProblems).toEqual([]);
});

test("当前盘四段式直读按宫切换、空宫失败关闭且零写入", async ({ page }, testInfo) => {
  const consoleProblems = collectConsoleProblems(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await expect(page.locator(".palace-four-part-synthesis")).toHaveCount(0);
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  const content = page.locator(".palace-four-part-synthesis");
  await expect(content).toHaveCount(1);
  await expect(content).toHaveAttribute(
    "data-content-version",
    "ziwei.palace_sanfang.four_part_synthesis_candidate/0.1"
  );
  await expect(content).toHaveAttribute("data-review-status", "awaiting_expert_review");
  await expect(content).toHaveAttribute("data-publication-status", "isolated_candidate_only");
  await expect(content).toHaveAttribute("data-selected-dominant-theme", "null");
  await expect(content).toHaveAttribute("data-resource-pressure-orientation", "null");
  await expect(content).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(content).toHaveAttribute("data-event-outcome", "null");
  await expect(content).toHaveAttribute("data-result", "null");
  await expect(content).toHaveAttribute("data-rule-snapshot-sha256", /^[a-f0-9]{64}$/u);
  await expect(content).toHaveAttribute("data-artifact-facts-sha256", /^[a-f0-9]{64}$/u);
  await expect(page.locator(".palace-four-part-heading strong"))
    .toHaveText("命宫 · 四段式直读候选");
  await expect(page.locator(".palace-four-part-status")).toHaveText("内容待审");
  await expect(page.locator(".palace-four-part-card")).toHaveCount(4);
  expect(await page.locator(".palace-four-part-card").evaluateAll((cards) => (
    cards.map((card) => card.getAttribute("data-section-id"))
  ))).toEqual([
    "palace_theme",
    "external_pull",
    "resource_pressure_observation",
    "contradiction_synthesis"
  ]);
  await expect(page.locator('.palace-four-part-card[data-section-id="palace_theme"]'))
    .toHaveAttribute("data-relation-count", "1");
  await expect(page.locator('.palace-four-part-card[data-section-id="palace_theme"]'))
    .toHaveAttribute("data-major-star-count", "1");
  await expect(page.locator('.palace-four-part-card[data-section-id="external_pull"]'))
    .toHaveAttribute("data-relation-count", "3");
  await expect(page.locator('.palace-four-part-card[data-section-id="external_pull"]'))
    .toHaveAttribute("data-major-star-count", "4");
  await expect(page.locator('.palace-four-part-card[data-section-id="resource_pressure_observation"]'))
    .toHaveAttribute("data-major-star-count", "5");
  await expect(page.locator('.palace-four-part-card[data-section-id="resource_pressure_observation"]'))
    .toHaveAttribute("data-transformation-count", "1");
  await expect(page.locator('.palace-four-part-card[data-section-id="palace_theme"] .palace-four-part-direct'))
    .toContainText("本宫已验真主星为本宫命宫七杀");
  await expect(page.locator('.palace-four-part-card[data-section-id="external_pull"] .palace-four-part-direct'))
    .toContainText("对宫（+6）迁移宫紫微");
  await expect(page.locator('.palace-four-part-card[data-section-id="external_pull"] .palace-four-part-direct'))
    .toContainText("三合位（+4）官禄宫破军");
  await expect(page.locator('.palace-four-part-card[data-section-id="external_pull"] .palace-four-part-direct'))
    .toContainText("三合位（−4）财帛宫贪狼");
  await expect(page.locator('.palace-four-part-card[data-section-id="resource_pressure_observation"] .palace-four-part-direct'))
    .toContainText("不判断哪一项是资源、哪一项是压力");
  await expect(page.locator('.palace-four-part-card[data-section-id="contradiction_synthesis"] .palace-four-part-direct'))
    .toContainText("共绑定 5 份逐星合参、1 条本命生年四化出现事实");
  await expect(page.locator(".palace-four-part-boundary"))
    .toContainText("其他 minor 与全部 auxiliary 仍只显示盘面事实");
  await expect(page.locator(".palace-four-part-evidence")).toHaveCount(4);
  expect(await page.locator(".palace-four-part-evidence").evaluateAll((details) => (
    details.every((detail) => !(detail as HTMLDetailsElement).open)
  ))).toBe(true);
  expect(await page.locator(".palace-four-part-sources a").count()).toBeGreaterThan(0);

  const initialContentId = await content.getAttribute("data-content-id");
  if (!initialContentId) throw new Error("默认命宫四段式候选缺少 content ID");
  const alternateTarget = await page.locator("#sanfang-focus option").nth(1).getAttribute("value");
  if (!alternateTarget) throw new Error("十二宫选择器缺少第二个目标值");
  await page.locator("#sanfang-focus").selectOption(alternateTarget);
  await expect(content).toHaveCount(1);
  await expect(content).not.toHaveAttribute("data-content-id", initialContentId);
  await expect(page.locator(".palace-four-part-card")).toHaveCount(4);
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  await page.locator("#birth-date").fill("1991-02-14");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  const emptyTarget = await page.locator(
    '#sanfang-focus option[data-target-main-star-state="empty_in_verified_facts"]'
  ).first().getAttribute("value");
  if (!emptyTarget) throw new Error("十二宫选择器缺少真实无主星目标宫位");
  await page.locator("#sanfang-focus").selectOption(emptyTarget);
  await expect(content).toHaveCount(1);
  await expect(content).toHaveAttribute("data-target-main-star-state", "empty_in_verified_facts");
  await expect(page.locator('.palace-four-part-card[data-section-id="palace_theme"]'))
    .toHaveAttribute("data-major-star-count", "0");
  await expect(page.locator('.palace-four-part-card[data-section-id="palace_theme"] .palace-four-part-direct'))
    .toContainText("不借用对宫或两组三合位主星");

  const noTransformationTarget = await page.locator(
    '#sanfang-focus option[data-natal-transformation-count="0"]'
  ).first().getAttribute("value");
  if (!noTransformationTarget) throw new Error("十二宫选择器缺少本命生年四化空集合目标宫位");
  await page.locator("#sanfang-focus").selectOption(noTransformationTarget);
  await expect(page.locator('.palace-four-part-card[data-section-id="resource_pressure_observation"]'))
    .toHaveAttribute("data-transformation-count", "0");
  await expect(page.locator('.palace-four-part-card[data-section-id="resource_pressure_observation"] .palace-four-part-direct'))
    .toContainText("四化观察项保持空集合");
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  await page.locator(".palace-four-part-synthesis").screenshot({
    path: testInfo.outputPath("ziwei-four-part-desktop.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  await page.locator(".palace-four-part-synthesis").screenshot({
    path: testInfo.outputPath("ziwei-four-part-mobile.png"),
    animations: "disabled"
  });

  expect(consoleProblems).toEqual([]);
});

test("核心十二辅星候选只投影精确命中并保持非核心星失败关闭", async ({ page }, testInfo) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");
  const storageBefore = await snapshotWorkspaceStorage(page);
  expect(storageBefore.databaseNames).toContain("hakimi-ziwei-browser-workspace-draft");
  expect(Object.keys(storageBefore.database.stores).sort()).toEqual(["mutationState", "revisions"]);

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });

  const panel = page.locator("#sanfang-panel");
  await expect(panel).toHaveAttribute("data-core-minor-catalog-count", "12");
  await expect(panel).toHaveAttribute("data-core-minor-palace-catalog-count", "144");
  await expect(panel).toHaveAttribute("data-core-minor-source-count", "2");
  await expect(panel).toHaveAttribute("data-target-earthly-branch-id", "yin");
  await expect(panel).toHaveAttribute("data-target-palace-role-id", "life");

  const selfCard = page.locator('.sanfang-card[data-relation="self"]');
  const tuoluo = selfCard.locator(
    '.core-minor-content[data-star-id="ziwei.star.iztro.tuoluo-min"]'
  );
  await expect(tuoluo).toHaveCount(1);
  await expect(tuoluo).toHaveAttribute("data-star-label", "陀罗");
  await expect(tuoluo).toHaveAttribute("data-fact-category", "minor");
  await expect(tuoluo).toHaveAttribute(
    "data-base-content-id",
    "ziwei.content.core_minor_star.tuoluo-min.neutral.v0_1"
  );
  await expect(tuoluo).toHaveAttribute(
    "data-palace-content-id",
    "ziwei.content.core_minor_star_all_palaces.tuoluo-min.life.neutral.v0_1"
  );
  await expect(tuoluo).toHaveAttribute("data-palace-role-id", "life");
  await expect(tuoluo).toHaveAttribute("data-traditional-cluster", "challenging_six");
  await expect(tuoluo).toHaveAttribute("data-traditional-cluster-is-outcome", "false");
  await expect(tuoluo).toHaveAttribute("data-review-status", "awaiting_expert_review");
  await expect(tuoluo).toHaveAttribute("data-publication-status", "isolated_candidate_only");
  await expect(tuoluo).toHaveAttribute("data-requires-combination-review", "true");
  await expect(tuoluo).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(tuoluo).toHaveAttribute("data-event-outcome", "null");
  await expect(tuoluo).toHaveAttribute("data-result", "null");
  await expect(tuoluo).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(tuoluo).toHaveAttribute("data-direct-outcome-allowed", "false");
  await expect(tuoluo).toHaveAttribute("data-scoring-allowed", "false");
  await expect(tuoluo).toHaveAttribute("data-brightness-can-appear", "true");
  await expect(tuoluo).toHaveAttribute("data-natal-transformation-rule-count", "0");
  await expect(tuoluo.locator(".core-minor-cluster"))
    .toHaveText("传统六煞组 · 只作传统分组，不是吉凶结果");
  await expect(tuoluo.locator(".core-minor-theme-list")).toContainText("反复推敲");
  await expect(tuoluo.locator(".core-minor-theme-list")).toContainText("持续钻研");
  await expect(tuoluo.locator(".core-minor-theme-list")).toContainText("渐进推进");
  await expect(tuoluo.locator(".core-minor-position")).toContainText("陀罗落命宫");
  await expect(tuoluo.locator(".core-minor-counterweight")).toContainText("反面制衡");
  await expect(tuoluo.locator(".core-minor-sources a")).toHaveCount(4);
  await expect(tuoluo.locator(".core-minor-detail")).not.toHaveAttribute("open", "");

  await expect(page.locator(
    '.palace-first-member[data-relation="self"] '
      + '.palace-first-core-minor-item[data-star-id="ziwei.star.iztro.tuoluo-min"]'
  )).toHaveCount(1);
  const supplement = page.locator(".palace-four-part-core-minor-supplement");
  await expect(supplement).toHaveCount(1);
  await expect(supplement).toHaveAttribute(
    "data-content-version",
    "ziwei.core_minor_star_all_palaces.neutral_candidate/0.1"
  );
  await expect(supplement).toHaveAttribute("data-target-earthly-branch-id", "yin");
  await expect(supplement).toHaveAttribute("data-target-palace-role-id", "life");
  await expect(supplement).toHaveAttribute("data-traditional-cluster-is-outcome", "false");
  await expect(supplement).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(supplement).toHaveAttribute("data-event-outcome", "null");
  await expect(supplement).toHaveAttribute("data-result", "null");
  await expect(supplement.locator(
    '.palace-four-part-core-minor-item[data-relation="self"]'
      + '[data-star-id="ziwei.star.iztro.tuoluo-min"]'
  )).toHaveCount(1);
  await expect(page.locator(".palace-four-part-card")).toHaveCount(4);
  expect(await page.locator(".palace-four-part-card").evaluateAll((cards) => (
    cards.map((card) => card.getAttribute("data-section-id"))
  ))).toEqual([
    "palace_theme",
    "external_pull",
    "resource_pressure_observation",
    "contradiction_synthesis"
  ]);

  const lifeCell = page.locator('.palace-cell[data-life="true"]');
  const tuoluoBoardFact = lifeCell.locator(
    '.star-list li[data-star-id="ziwei.star.iztro.tuoluo-min"]'
  );
  await expect(tuoluoBoardFact).toHaveAttribute("data-fact-category", "minor");
  await expect(tuoluoBoardFact).not.toHaveAttribute("data-core-minor-base-content-id", "null");
  await expect(tuoluoBoardFact).not.toHaveAttribute("data-core-minor-palace-content-id", "null");
  for (const auxiliaryLabel of ["解神", "天巫", "孤辰", "阴煞"]) {
    const auxiliary = lifeCell.locator(
      `.star-list li[data-star-label="${auxiliaryLabel}"]`
    );
    await expect(auxiliary).toHaveCount(1);
    await expect(auxiliary).toHaveAttribute("data-fact-category", "auxiliary");
    await expect(auxiliary).toHaveAttribute("data-core-minor-base-content-id", "null");
    await expect(auxiliary).toHaveAttribute("data-core-minor-palace-content-id", "null");
    await expect(page.locator(
      `.core-minor-content[data-star-label="${auxiliaryLabel}"]`
    )).toHaveCount(0);
  }
  await expect(page.locator('.core-minor-content[data-fact-category="auxiliary"]')).toHaveCount(0);

  const lifeTarget = await panel.getAttribute("data-target-earthly-branch-id");
  if (!lifeTarget) throw new Error("默认命宫缺少目标地支");
  let selectedTarget = lifeTarget;
  let previousFourPartId = await page.locator(".palace-four-part-synthesis")
    .getAttribute("data-content-id");
  if (!previousFourPartId) throw new Error("默认命宫缺少四段式 content ID");
  for (const nonCoreMinorLabel of ["禄存", "天马"]) {
    const nextTarget = await selectDifferentTargetContainingStar(
      page,
      nonCoreMinorLabel,
      selectedTarget
    );
    expect(nextTarget).not.toBe(selectedTarget);
    await expect(panel).toHaveAttribute("data-target-earthly-branch-id", nextTarget);
    const fact = page.locator(
      `.sanfang-star-fact[data-star-label="${nonCoreMinorLabel}"]`
    ).first();
    await expect(fact).toHaveAttribute("data-fact-category", "minor");
    await expect(fact).toHaveAttribute("data-core-minor-base-content-id", "null");
    await expect(fact).toHaveAttribute("data-core-minor-palace-content-id", "null");
    await expect(page.locator(
      `.core-minor-content[data-star-label="${nonCoreMinorLabel}"]`
    )).toHaveCount(0);
    await expect(page.locator(".palace-first-synthesis")).toHaveCount(1);
    await expect(page.locator(".palace-four-part-synthesis")).toHaveCount(1);
    await expect(page.locator(".palace-four-part-card")).toHaveCount(4);
    await expect(supplement).toHaveCount(1);
    await expect(supplement).toHaveAttribute("data-target-earthly-branch-id", nextTarget);
    const nextFourPartId = await page.locator(".palace-four-part-synthesis")
      .getAttribute("data-content-id");
    if (!nextFourPartId) throw new Error(`${nonCoreMinorLabel}切宫后缺少四段式 content ID`);
    expect(nextFourPartId).not.toBe(previousFourPartId);
    previousFourPartId = nextFourPartId;
    selectedTarget = nextTarget;
  }

  await page.locator("#sanfang-focus").selectOption(lifeTarget);
  await expect(panel).toHaveAttribute("data-target-earthly-branch-id", lifeTarget);
  await expect(tuoluo).toHaveCount(1);
  await expect(page.locator(".palace-first-synthesis")).toHaveCount(1);
  await expect(page.locator(".palace-four-part-synthesis")).toHaveCount(1);
  await expect(page.locator(".palace-four-part-card")).toHaveCount(4);

  await tuoluo.screenshot({
    path: testInfo.outputPath("ziwei-core-minor-desktop.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  const mobileSupplementColumns = await page.locator(".palace-four-part-core-minor-grid")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length);
  expect(mobileSupplementColumns).toBe(1);
  expect(await tuoluo.evaluate((element) => (
    element.getBoundingClientRect().right <= document.documentElement.clientWidth
  ))).toBe(true);
  await supplement.screenshot({
    path: testInfo.outputPath("ziwei-core-minor-mobile.png"),
    animations: "disabled"
  });

  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");
  expect(await snapshotWorkspaceStorage(page)).toEqual(storageBefore);
  expect(page.url()).toBe("http://127.0.0.1:4218/");
  expect(consoleProblems).toEqual([]);
});

test("四化十二宫审稿模板可下载、只读预检且篡改失败后零写入", async ({ page }, testInfo) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(page);
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  const panel = page.locator("#review-feedback-panel");
  await expect(panel).toHaveAttribute("data-identity-verified", "false");
  await expect(panel).toHaveAttribute("data-digital-signature-verified", "false");
  await expect(panel).toHaveAttribute("data-eligible-for-formal-activation", "false");
  await expect(panel).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(panel).toHaveAttribute(
    "data-artifact-revision-or-storage-mutation-performed",
    "false"
  );
  await expect(panel).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(panel).toHaveAttribute("data-event-outcome", "null");
  await expect(panel).toHaveAttribute("data-result", "null");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#review-feedback-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename())
    .toBe("hakimi-ziwei-four-transformations-twelve-palaces-review-v010.json");
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("审稿模板下载没有本地路径");
  const rawTemplate = await readFile(downloadPath, "utf8");
  const template = JSON.parse(rawTemplate) as {
    profile: { formatVersion: string; templateVersion: string };
    matrixBinding: {
      matrixSha256: string;
      orderedContentIdsSha256: string;
      sourceRegistrySha256: string;
      itemCount: number;
      sourceCount: number;
    };
    sourceRegistry: unknown[];
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
      schoolScope: string;
      generalNotes: string;
    };
    items: Array<{
      contentId: string;
      decision: string;
      orientationProposal: string;
      selectedSchool: string;
      decisionReason: string;
      applicabilityConditions: string;
      counterexamples: string;
      revisionRequest: string;
      additionalSourceUrls: string[];
      goodBadOrientation: unknown;
      eventOutcome: unknown;
      result: unknown;
    }>;
    declaredCounts: {
      total: number;
      unresolved: number;
      approve: number;
      revise: number;
      reject: number;
    };
    declaredOrientationProposalCounts: {
      total: number;
      unresolved: number;
      potentiallySupportive: number;
      potentiallyChallenging: number;
      mixedConditional: number;
      notAssessable: number;
    };
    boundary: {
      goodBadOrientation: unknown;
      eventOutcome: unknown;
      result: unknown;
    };
  };

  expect(template.profile).toMatchObject({
    formatVersion: "hakimi.ziwei.natal_transformation_palace_review_feedback/0.1.0",
    templateVersion: "0.10.0"
  });
  expect(template.matrixBinding.itemCount).toBe(48);
  expect(template.matrixBinding.sourceCount).toBe(5);
  expect(template.matrixBinding.matrixSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(template.matrixBinding.orderedContentIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(template.matrixBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(template.sourceRegistry).toHaveLength(5);
  expect(template.items).toHaveLength(48);
  expect(template.declaredCounts).toEqual({
    total: 48,
    unresolved: 48,
    approve: 0,
    revise: 0,
    reject: 0
  });
  expect(template.boundary.goodBadOrientation).toBeNull();
  expect(template.boundary.eventOutcome).toBeNull();
  expect(template.boundary.result).toBeNull();

  template.reviewer.reviewerId = "playwright-reviewer-001";
  template.reviewer.displayName = "浏览器示例审稿人";
  template.reviewer.affiliation = "独立研究者";
  template.reviewer.expertiseStatement = "自述研习紫微斗数；未进行身份核验。";
  template.reviewSession.reviewedAt = "2026-08-12T15:00:00+08:00";
  template.reviewSession.methodology = "逐条核对文本、来源、成立条件与反例。";
  template.reviewSession.schoolScope = "示例流派口径，不代表正式采用。";
  const first = template.items[0]!;
  first.decision = "approve";
  first.orientationProposal = "mixed_conditional";
  first.selectedSchool = "示例流派";
  first.decisionReason = "建议保留为待进一步专家复核的条件化候选。";
  first.applicabilityConditions = "须结合星曜本体、亮度、同宫会照及运限层级。";
  first.counterexamples = "煞曜、吉曜或宫位主轴形成相反结构时，方向可能改变。";
  first.additionalSourceUrls = ["https://example.org/ziwei-review-note"];
  template.declaredCounts = { total: 48, unresolved: 47, approve: 1, revise: 0, reject: 0 };
  template.declaredOrientationProposalCounts = {
    total: 48,
    unresolved: 47,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 1,
    notAssessable: 0
  };

  await page.locator("#review-feedback-file").setInputFiles({
    name: "filled-ziwei-review.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(template), "utf8")
  });
  await expect(page.locator("#review-feedback-message")).toHaveAttribute("data-state", "success");
  await expect(page.locator("#review-feedback-message")).toContainText("预检通过");
  await expect(page.locator("#review-feedback-total")).toHaveText("48");
  await expect(page.locator("#review-feedback-resolved")).toHaveText("1");
  await expect(page.locator("#review-feedback-unresolved")).toHaveText("47");
  await expect(page.locator("#review-feedback-reviewer")).toHaveText("浏览器示例审稿人（自述，未核验）");
  await expect(page.locator(".review-feedback-item")).toHaveCount(1);
  await expect(page.locator(".review-feedback-item")).toHaveAttribute("data-decision", "approve");
  await expect(page.locator(".review-feedback-item")).toHaveAttribute(
    "data-orientation-proposal",
    "mixed_conditional"
  );
  await expect(page.locator(".review-feedback-item")).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(page.locator(".review-feedback-item-details")).toContainText("正反并见，取决于条件");
  await expect(page.locator(".review-feedback-item-details")).toContainText("成立条件");
  await expect(page.locator(".review-feedback-item-details")).toContainText("反例提醒");
  await expect(page.locator(".review-feedback-item-details a")).toHaveCount(1);
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  await panel.screenshot({
    path: testInfo.outputPath("ziwei-review-feedback-desktop.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  await panel.screenshot({
    path: testInfo.outputPath("ziwei-review-feedback-mobile.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  template.matrixBinding.matrixSha256 = "0".repeat(64);
  await page.locator("#review-feedback-file").setInputFiles({
    name: "tampered-ziwei-review.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(template), "utf8")
  });
  await expect(page.locator("#review-feedback-message")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#review-feedback-message")).toContainText("预检失败");
  await expect(page.locator("#review-feedback-resolved")).toHaveText("0");
  await expect(page.locator("#review-feedback-unresolved")).toHaveText("48");
  await expect(page.locator("#review-feedback-items")).toBeHidden();
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");
  expect(consoleProblems).toEqual([]);
});

test("v0.13 当前盘核心十二辅煞三方四正审稿包保持只读、整盘绑定与切宫稳定", async ({ page }, testInfo) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(page);

  const panel = page.locator("#core-minor-sanfang-review-panel");
  const staticReviewPanel = page.locator("#review-feedback-panel");
  await expect(panel).toBeHidden();
  await expect(panel).toHaveAttribute("data-packet-state", "unavailable");
  await expect(panel).toHaveAttribute("data-current-projection-bound", "false");
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");

  const storageBefore = await snapshotWorkspaceStorage(page);
  const staticReviewBefore = await staticReviewPanel.evaluate((element) => ({
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

  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-current-projection-bound", "true");
  await expect(panel).toHaveAttribute("data-packet-state", "unprepared");
  await expect(panel).toHaveAttribute("data-preflight-state", "idle");
  await expect(panel).toHaveAttribute("data-review-count", "12");
  await expect(panel).toHaveAttribute("data-occurrence-count", "48");
  await expect(page.locator("#core-minor-sanfang-review-review-count")).toHaveText("12");
  await expect(page.locator("#core-minor-sanfang-review-occurrence-count")).toHaveText("48");
  await expect(panel).toHaveAttribute("data-identity-verified", "false");
  await expect(panel).toHaveAttribute("data-digital-signature-verified", "false");
  await expect(panel).toHaveAttribute("data-expert-truth-claimed", "false");
  await expect(panel).toHaveAttribute("data-eligible-for-formal-activation", "false");
  await expect(panel).toHaveAttribute("data-auto-integration-allowed", "false");
  await expect(panel).toHaveAttribute("data-catalog-decision-inheritance-allowed", "false");
  await expect(panel).toHaveAttribute(
    "data-artifact-revision-or-storage-mutation-performed",
    "false"
  );
  await expect(panel).toHaveAttribute("data-network-upload-performed", "false");
  await expect(panel).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(panel).toHaveAttribute("data-event-outcome", "null");
  await expect(panel).toHaveAttribute("data-result", "null");

  const visibleOccurrences = page.locator(".core-minor-sanfang-review-occurrence");
  expect(await visibleOccurrences.count()).toBeGreaterThan(0);
  const firstOccurrence = visibleOccurrences.first();
  await expect(firstOccurrence).toHaveAttribute("data-occurrence-id", /.+/u);
  await expect(firstOccurrence).toHaveAttribute("data-base-candidate-content-id", /.+/u);
  await expect(firstOccurrence).toHaveAttribute("data-palace-candidate-content-id", /.+/u);
  await expect(firstOccurrence).toHaveAttribute("data-good-bad-orientation", "null");
  await expect(firstOccurrence).toHaveAttribute("data-event-outcome", "null");
  await expect(firstOccurrence).toHaveAttribute("data-result", "null");
  await firstOccurrence.locator("details").click();
  const firstOccurrenceSources = firstOccurrence.locator(
    ".core-minor-sanfang-review-source-list li"
  );
  expect(await firstOccurrenceSources.count()).toBeGreaterThan(0);
  await expect(firstOccurrenceSources.first()).toHaveAttribute("data-locator", /.+/u);
  await expect(firstOccurrenceSources.first()).toHaveAttribute("data-binding-target", /.+/u);
  await expect(firstOccurrenceSources.first()).toHaveAttribute(
    "data-semantic-candidate-support",
    /^(?:true|false)$/u
  );
  await expect(firstOccurrenceSources.first().locator("a")).toHaveAttribute("target", "_blank");
  await expect(firstOccurrenceSources.first().locator("a")).toHaveAttribute(
    "rel",
    /(?:^|\s)noreferrer(?:\s|$)/u
  );

  await page.locator("#core-minor-sanfang-review-prepare").click();
  await expect(panel).toHaveAttribute("data-packet-state", "ready", { timeout: 30_000 });
  await expect(page.locator("#core-minor-sanfang-review-download")).toBeEnabled();
  const boundFactsSha256 = await panel.getAttribute("data-artifact-facts-sha256");
  if (!boundFactsSha256) throw new Error("v0.13 面板缺少当前盘事实摘要");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#core-minor-sanfang-review-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename())
    .toBe("hakimi-ziwei-current-chart-core-minor-sanfang-review-v013.json");
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("v0.13 当前盘审稿模板下载没有本地路径");
  const rawTemplate = await readFile(downloadPath, "utf8");
  const template = JSON.parse(rawTemplate) as {
    profile: {
      formatVersion: string;
      templateVersion: string;
      reviewScope: string;
      directIdentifiersIncluded: boolean;
      inputFieldsIncluded: boolean;
      derivedChartFactsIncluded: boolean;
      externalSharingRequiresUserDecision: boolean;
      staticCatalogDecisionInheritanceApplied: boolean;
    };
    projectionBinding: {
      reviewVersion: string;
      sanfangRuleId: string;
      sanfangRuleMethod: string;
      sanfangRuleSourceUrl: string;
      ruleSnapshotSha256: string;
      artifactFactsSha256: string;
      occurrenceProjectionSha256: string;
      orderedReviewIdsSha256: string;
      orderedOccurrenceIdsSha256: string;
      orderedSourceIdsSha256: string;
      sourceRegistrySha256: string;
      reviewCount: number;
      itemCount: number;
      sourceCount: number;
    };
    sourceRegistry: Array<{
      sourceId: string;
      sourceUrl: string;
      semanticCandidateSupport: boolean;
      expertTruthClaimed: boolean;
    }>;
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
      traditionScope: string;
      generalNotes: string;
    };
    items: Array<{
      occurrenceId: string;
      order: number;
      reviewId: string;
      reviewOrder: number;
      occurrenceOrder: number;
      decision: string;
      orientationProposal: string;
      selectedTradition: string;
      decisionReason: string;
      applicabilityConditions: string;
      counterexamples: string;
      revisionRequest: string;
      additionalSourceUrls: string[];
      expertTruthClaimed: boolean;
      formalActivationAllowed: boolean;
      scoringAllowed: boolean;
      goodBadOrientation: unknown;
      eventOutcome: unknown;
      result: unknown;
    }>;
    declaredCounts: {
      total: number;
      unresolved: number;
      approve: number;
      revise: number;
      reject: number;
    };
    declaredOrientationProposalCounts: {
      total: number;
      unresolved: number;
      potentiallySupportive: number;
      potentiallyChallenging: number;
      mixedConditional: number;
      notAssessable: number;
    };
    boundary: {
      directIdentifiersIncluded: boolean;
      inputFieldsIncluded: boolean;
      derivedChartFactsIncluded: boolean;
      externalSharingRequiresUserDecision: boolean;
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

  expect(template.profile).toMatchObject({
    formatVersion: "hakimi.ziwei.core_minor_star_sanfang_review_feedback/0.1.0",
    templateVersion: "0.13.0",
    reviewScope: "current_chart_all_twelve_sanfang_groups",
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    externalSharingRequiresUserDecision: true,
    staticCatalogDecisionInheritanceApplied: false
  });
  expect(template.projectionBinding).toMatchObject({
    sanfangRuleId: "ziwei.sanfang_geometry.iztro_docs.v1",
    sanfangRuleMethod: "target_index_self_plus_minus_4_and_plus_6",
    sanfangRuleSourceUrl: "https://docs.iztro.com/learn/basis",
    artifactFactsSha256: boundFactsSha256,
    reviewCount: 12,
    itemCount: 48,
    sourceCount: 5
  });
  for (const digest of [
    template.projectionBinding.ruleSnapshotSha256,
    template.projectionBinding.artifactFactsSha256,
    template.projectionBinding.occurrenceProjectionSha256,
    template.projectionBinding.orderedReviewIdsSha256,
    template.projectionBinding.orderedOccurrenceIdsSha256,
    template.projectionBinding.orderedSourceIdsSha256,
    template.projectionBinding.sourceRegistrySha256
  ]) {
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
  }
  expect(template.sourceRegistry).toHaveLength(5);
  expect(template.items).toHaveLength(48);
  expect(new Set(template.items.map((item) => item.occurrenceId))).toHaveProperty("size", 48);
  expect(new Set(template.items.map((item) => item.reviewId))).toHaveProperty("size", 12);
  expect(template.items.map((item) => item.order)).toEqual(
    Array.from({ length: 48 }, (_, index) => index + 1)
  );
  expect(template.declaredCounts).toEqual({
    total: 48,
    unresolved: 48,
    approve: 0,
    revise: 0,
    reject: 0
  });
  expect(template.items.every((item) => (
    !item.expertTruthClaimed
    && !item.formalActivationAllowed
    && !item.scoringAllowed
    && item.goodBadOrientation === null
    && item.eventOutcome === null
    && item.result === null
  ))).toBe(true);
  expect(template.boundary).toMatchObject({
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    externalSharingRequiresUserDecision: true,
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
  const exportedKeys = new Set<string>();
  const collectKeys = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collectKeys);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    for (const [key, nested] of Object.entries(value)) {
      exportedKeys.add(key);
      collectKeys(nested);
    }
  };
  collectKeys(template);
  for (const forbiddenKey of [
    "birthDate", "birthTime", "shichen", "sex", "gender", "displaySummary",
    "requestId", "studyId", "revisionId", "parentRevisionId", "revisionTitle",
    "revisionNote", "localPath", "workerRequest"
  ]) {
    expect(exportedKeys.has(forbiddenKey), `导出模板不得包含 ${forbiddenKey}`).toBe(false);
  }

  template.reviewer.reviewerId = "playwright-v013-reviewer-001";
  template.reviewer.displayName = "浏览器具名示例审稿人";
  template.reviewer.affiliation = "独立研究者";
  template.reviewer.expertiseStatement = "自述紫微斗数研究经历；身份与专业资历均未核验。";
  template.reviewer.identityEvidenceReference = "self-declared-playwright-fixture";
  template.reviewSession.reviewedAt = "2026-08-14T15:00:00+08:00";
  template.reviewSession.methodology = "逐 occurrence 核对事实、条件、反例与来源绑定。";
  template.reviewSession.traditionScope = "示例传统口径；不代表正式采用。";
  template.reviewSession.generalNotes = "仅供只读预检。";
  const first = template.items[0]!;
  first.decision = "approve";
  first.orientationProposal = "mixed_conditional";
  first.selectedTradition = "示例传统口径";
  first.decisionReason = "该条只可作为条件化候选，不能直接推导吉凶。";
  first.applicabilityConditions = "必须结合目标宫、关系宫、亮度、四化及其他星曜共同复核。";
  first.counterexamples = "同一星曜在结构与会照不同的命盘中可能呈现相反倾向。";
  first.additionalSourceUrls = ["https://docs.iztro.com/learn/minor-star"];
  template.declaredCounts = { total: 48, unresolved: 47, approve: 1, revise: 0, reject: 0 };
  template.declaredOrientationProposalCounts = {
    total: 48,
    unresolved: 47,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 1,
    notAssessable: 0
  };
  const validFilledTemplate = JSON.stringify(template);

  await page.locator("#core-minor-sanfang-review-file").setInputFiles({
    name: "filled-current-chart-v013.json",
    mimeType: "application/json",
    buffer: Buffer.from(validFilledTemplate, "utf8")
  });
  await expect(panel).toHaveAttribute("data-preflight-state", "valid");
  await expect(page.locator("#core-minor-sanfang-review-message"))
    .toHaveAttribute("data-state", "success");
  await expect(page.locator("#core-minor-sanfang-review-resolved")).toHaveText("1");
  await expect(page.locator("#core-minor-sanfang-review-reviewer"))
    .toHaveText("浏览器具名示例审稿人（自述，未核验）");
  await expect(page.locator(".core-minor-sanfang-review-item")).toHaveCount(1);
  await expect(page.locator(".core-minor-sanfang-review-item"))
    .toHaveAttribute("data-decision", "approve");
  await expect(page.locator(".core-minor-sanfang-review-item"))
    .toHaveAttribute("data-orientation-proposal", "mixed_conditional");
  await expect(page.locator(".core-minor-sanfang-review-item"))
    .toHaveAttribute("data-good-bad-orientation", "null");
  await expect(page.locator(".core-minor-sanfang-review-item dl")).toContainText("成立条件");
  await expect(page.locator(".core-minor-sanfang-review-item dl")).toContainText("反例提醒");
  await expect(page.locator(".core-minor-sanfang-review-item a")).toHaveCount(1);

  const preparedOccurrenceProjectionSha256 =
    template.projectionBinding.occurrenceProjectionSha256;
  const selectedTargetBefore = await page.locator("#sanfang-focus").inputValue();
  const alternateTarget = await page.locator("#sanfang-focus option").evaluateAll(
    (options, excluded) => options
      .map((option) => (option as HTMLOptionElement).value)
      .find((value) => value !== excluded) ?? "",
    selectedTargetBefore
  );
  expect(alternateTarget).not.toBe("");
  await page.locator("#sanfang-focus").selectOption(alternateTarget);
  await expect(panel).toHaveAttribute("data-display-target-earthly-branch-id", alternateTarget);
  await expect(panel).toHaveAttribute("data-packet-state", "ready");
  await expect(panel).toHaveAttribute("data-preflight-state", "valid");
  await expect(panel).toHaveAttribute("data-artifact-facts-sha256", boundFactsSha256);
  expect(template.projectionBinding.occurrenceProjectionSha256)
    .toBe(preparedOccurrenceProjectionSha256);
  await expect(page.locator("#core-minor-sanfang-review-resolved")).toHaveText("1");

  await panel.screenshot({
    path: testInfo.outputPath("ziwei-core-minor-sanfang-review-v013-desktop.png"),
    animations: "disabled"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  const mobileColumns = await page.locator(".core-minor-sanfang-review-actions")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length);
  expect(mobileColumns).toBe(1);
  const itemColumns = await page.locator("#core-minor-sanfang-review-items")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length);
  expect(itemColumns).toBe(1);
  for (const control of [
    "#core-minor-sanfang-review-prepare",
    "#core-minor-sanfang-review-download",
    ".core-minor-sanfang-review-actions .file-action"
  ]) {
    expect(await page.locator(control).evaluate((element) => (
      element.getBoundingClientRect().height
    ))).toBeGreaterThanOrEqual(44);
  }
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
  await expect(page.locator("#core-minor-sanfang-review-message"))
    .toHaveAttribute("data-state", "error");
  await expect(page.locator("#core-minor-sanfang-review-resolved")).toHaveText("0");
  await expect(page.locator("#core-minor-sanfang-review-items")).toBeHidden();
  await expect(panel).toHaveAttribute("data-packet-state", "ready");

  await page.locator("#birth-date").fill("1991-02-03");
  await expect(panel).toHaveAttribute("data-packet-state", "unavailable");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await expect(panel).toHaveAttribute("data-current-projection-bound", "true");
  await expect(panel).toHaveAttribute("data-packet-state", "unprepared");
  await expect(panel).toHaveAttribute("data-preflight-state", "idle");
  await expect(panel).not.toHaveAttribute("data-artifact-facts-sha256", boundFactsSha256);
  await page.locator("#core-minor-sanfang-review-file").setInputFiles({
    name: "old-current-chart-v013.json",
    mimeType: "application/json",
    buffer: Buffer.from(validFilledTemplate, "utf8")
  });
  await expect(panel).toHaveAttribute("data-preflight-state", "invalid");
  await expect(page.locator("#core-minor-sanfang-review-message"))
    .toHaveAttribute("data-state", "error");
  await expect(page.locator("#core-minor-sanfang-review-resolved")).toHaveText("0");
  await expect(page.locator("#core-minor-sanfang-review-items")).toBeHidden();

  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("0");
  await expect(page.locator("#total-bytes")).toHaveText("0 B");
  expect(await snapshotWorkspaceStorage(page)).toEqual(storageBefore);
  expect(await staticReviewPanel.evaluate((element) => ({
    attributes: Array.from(element.attributes)
      .map((attribute) => [attribute.name, attribute.value] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
    total: element.querySelector("#review-feedback-total")?.textContent,
    resolved: element.querySelector("#review-feedback-resolved")?.textContent,
    unresolved: element.querySelector("#review-feedback-unresolved")?.textContent,
    reviewer: element.querySelector("#review-feedback-reviewer")?.textContent,
    message: element.querySelector("#review-feedback-message")?.textContent,
    renderedItems: element.querySelectorAll(".review-feedback-item").length
  }))).toEqual(staticReviewBefore);
  expect(page.url()).toBe("http://127.0.0.1:4218/");
  expect(consoleProblems).toEqual([]);
});

test("独立紫微档案 8 条完整备份导出、清空与原子恢复", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await expect(page.locator("#revision-count")).toHaveText("0");

  const dates = [
    "1995-08-18",
    "1995-09-03",
    "1995-10-12",
    "1995-11-27",
    "1995-12-05",
    "1996-01-15",
    "1996-02-19",
    "1996-03-08"
  ];
  for (let index = 0; index < dates.length; index += 1) {
    await calculateAndSave(page, dates[index], `容量 ${index + 1}`);
  }
  await expect(page.locator("#revision-count")).toHaveText("8");
  await expect(page.locator("#mutation-epoch")).toHaveText("8");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#backup-button").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("紫微完整备份下载路径不可用");
  const bytes = await readFile(downloadPath);
  expect(bytes.byteLength).toBeGreaterThan(10_000);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#clear-accepted").check();
  await page.locator("#clear-button").click();
  await expect(page.locator("#safety-message")).toContainText("已清空", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("0");
  await expect(page.locator("#mutation-epoch")).toHaveText("9");

  await page.locator("#restore-file").setInputFiles({
    name: "hakimi-ziwei-workspace-backup.json",
    mimeType: "application/json",
    buffer: bytes
  });
  await expect(page.locator("#restore-button")).toBeEnabled({ timeout: 30_000 });
  await page.locator("#restore-button").click();
  await expect(page.locator("#safety-message")).toContainText("已恢复 8 个新 Revision", {
    timeout: 30_000
  });
  await expect(page.locator("#revision-count")).toHaveText("8");
  await expect(page.locator("#mutation-epoch")).toHaveText("10");
  await expect(page.locator("#archive-list")).toContainText("容量 1");
  await expect(page.locator("#archive-list")).toContainText("容量 8");

  expect(consoleProblems).toEqual([]);
});

test("多标签陈旧写入在真实浏览器失败关闭且不产生部分写入", async ({ context }) => {
  const first = await context.newPage();
  await first.addInitScript(() => {
    (window as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
  });
  const firstProblems = collectConsoleProblems(first);
  await first.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(first);
  await expect(first.locator("#revision-count")).toHaveText("0");
  await calculateAndSave(first, "1995-08-18", "多标签甲");
  await expect(first.locator("#revision-count")).toHaveText("1");
  await expect(first.locator("#mutation-epoch")).toHaveText("1");

  const second = await context.newPage();
  const secondProblems = collectConsoleProblems(second);
  await second.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(second);
  await expect(second.locator("#revision-count")).toHaveText("1");
  await expect(second.locator("#mutation-epoch")).toHaveText("1");
  await calculateAndSave(second, "1996-01-15", "多标签乙");
  await expect(second.locator("#revision-count")).toHaveText("2");
  await expect(second.locator("#mutation-epoch")).toHaveText("2");

  await first.locator("#birth-date").fill("1997-02-20");
  await first.locator("#calculate-button").click();
  await expect(first.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await first.locator("#revision-title").fill("多标签陈旧写入");
  await first.locator("#save-button").click();
  await expect(first.locator("#workspace-status")).toContainText("资料库已在另一个页面更新", {
    timeout: 30_000
  });
  await expect(first.locator("#workspace-status")).toHaveAttribute("data-state", "error");
  await expect(first.locator("#revision-count")).toHaveText("2");
  await expect(first.locator("#mutation-epoch")).toHaveText("2");
  await expect(first.locator(".archive-item")).toHaveCount(2);
  await expect(second.locator("#revision-count")).toHaveText("2");
  await expect(second.locator("#mutation-epoch")).toHaveText("2");

  expect(firstProblems).toEqual([]);
  expect(secondProblems).toEqual([]);
});

test("紫微计算 Worker 崩溃时失败关闭且不出现保存表单", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installFaultWorker(page, "crash");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await page.locator("#calculate-button").click();
  await expectCalculationFailClosed(page);
  expect(consoleProblems).toEqual([]);
});

test("紫微计算 Worker 畸形回执时失败关闭且不出现保存表单", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installFaultWorker(page, "malformed");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await page.locator("#calculate-button").click();
  await expectCalculationFailClosed(page);
  expect(consoleProblems).toEqual([]);
});

test("损坏的紫微完整备份预检失败关闭且零写入", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await calculateAndSave(page, "1995-08-18", "损坏备份样本");
  await expect(page.locator("#revision-count")).toHaveText("1");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#backup-button").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("紫微完整备份下载路径不可用");
  const original = await readFile(downloadPath);
  const text = original.toString("utf8");
  const tampered = text.replace("损坏备份样本", "损坏备份样本X");
  if (tampered === text) throw new Error("测试未能在备份 JSON 中找到可篡改的标题字节。");
  const bytes = Buffer.from(tampered, "utf8");

  await page.locator("#restore-file").setInputFiles({
    name: "tampered-ziwei-workspace-backup.json",
    mimeType: "application/json",
    buffer: bytes
  });
  await expect(page.locator("#safety-message")).toContainText("内容与摘要不一致，操作已停止。", {
    timeout: 30_000
  });
  await expect(page.locator("#restore-button")).toBeDisabled();
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");
  expect(consoleProblems).toEqual([]);
});

test("紫微完整备份内容冲突恢复预检失败关闭且零写入", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await calculateAndSave(page, "1995-08-18", "内容冲突样本");
  await expect(page.locator("#revision-count")).toHaveText("1");

  const exportPromise = page.waitForEvent("download");
  await page.locator(".archive-item").first().getByRole("button", { name: "导出此 Revision" }).click();
  const exported = await exportPromise;
  const exportPath = await exported.path();
  if (!exportPath) throw new Error("紫微单 Revision 导出路径不可用");
  const exportedRevision = JSON.parse((await readFile(exportPath)).toString("utf8")) as {
    artifact?: unknown;
  };
  if (!exportedRevision.artifact) throw new Error("单 Revision 导出缺少内层工件。");

  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("#clear-accepted").check();
  await page.locator("#clear-button").click();
  await expect(page.locator("#safety-message")).toContainText("已清空", { timeout: 30_000 });
  await expect(page.locator("#revision-count")).toHaveText("0");

  const { first, second, revisionId } = await buildConflictingZiweiBackups(
    exportedRevision.artifact as SaveInput["artifact"]
  );

  await page.locator("#restore-file").setInputFiles({
    name: "ziwei-conflict-first.json",
    mimeType: "application/json",
    buffer: first
  });
  await expect(page.locator("#restore-button")).toBeEnabled({ timeout: 30_000 });
  await page.locator("#restore-button").click();
  await expect(page.locator("#safety-message")).toContainText("已恢复 1 个新 Revision", {
    timeout: 30_000
  });
  await expect(page.locator("#revision-count")).toHaveText("1");

  await page.locator("#restore-file").setInputFiles({
    name: "ziwei-conflict-second.json",
    mimeType: "application/json",
    buffer: second
  });
  await expect(page.locator("#safety-message")).toContainText(
    "发现 1 个不可变身份冲突，不会覆盖任何资料。",
    { timeout: 30_000 }
  );
  await expect(page.locator("#restore-button")).toBeDisabled();
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("3");
  expect(revisionId).toMatch(/^[0-9a-f-]{36}$/u);
  expect(consoleProblems).toEqual([]);
});

test("紫微保存事务中止时失败关闭且不产生部分写入", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installAbortNextReadWrite(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await calculateAndSave(page, "1995-08-18", "事务中止样本");
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");

  await page.evaluate(() => {
    (window as unknown as { __abortNextReadWrite: boolean }).__abortNextReadWrite = true;
  });
  await page.locator("#birth-date").fill("1996-01-15");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await page.locator("#revision-title").fill("事务中止失败写入");
  await page.locator("#save-button").click();
  await expect(page.locator("#workspace-status")).toContainText("事务中止", {
    timeout: 30_000
  });
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);
  expect(consoleProblems).toEqual([]);
});

test("紫微保存遇到设备配额不足时失败关闭且不产生部分写入", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await installQuotaFailureOnNextWrite(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("紫微本地研究档案 · 隔离草案");
  await waitForWorkspaceReady(page);
  await calculateAndSave(page, "1995-08-18", "配额不足样本");
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");

  await page.evaluate(() => {
    (window as unknown as { __failNextWriteWithQuota: boolean }).__failNextWriteWithQuota = true;
  });
  await page.locator("#birth-date").fill("1996-01-15");
  await page.locator("#calculate-button").click();
  await expect(page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
    timeout: 60_000
  });
  await page.locator("#revision-title").fill("配额不足失败写入");
  await page.locator("#save-button").click();
  await expect(page.locator("#workspace-status")).toContainText("容量不足", {
    timeout: 30_000
  });
  await expect(page.locator("#workspace-status")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#revision-count")).toHaveText("1");
  await expect(page.locator("#mutation-epoch")).toHaveText("1");
  await expect(page.locator(".archive-item")).toHaveCount(1);
  expect(consoleProblems).toEqual([]);
});

test("三方并发下两个陈旧标签页的保存均失败关闭且不产生部分写入", async ({ context }) => {
  const makeStalePage = async () => {
    const page = await context.newPage();
    await page.addInitScript(() => {
      (window as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
    });
    const problems = collectConsoleProblems(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForWorkspaceReady(page);
    return { page, problems };
  };

  const first = await makeStalePage();
  await calculateAndSave(first.page, "1995-08-18", "三方甲");
  await expect(first.page.locator("#revision-count")).toHaveText("1");

  const third = await makeStalePage();
  await expect(third.page.locator("#revision-count")).toHaveText("1");

  const second = await context.newPage();
  const secondProblems = collectConsoleProblems(second);
  await second.goto("/", { waitUntil: "domcontentloaded" });
  await waitForWorkspaceReady(second);
  await expect(second.locator("#revision-count")).toHaveText("1");
  await calculateAndSave(second, "1996-01-15", "三方乙");
  await expect(second.locator("#revision-count")).toHaveText("2");
  await expect(second.locator("#mutation-epoch")).toHaveText("2");

  for (const stale of [first, third]) {
    await stale.page.locator("#birth-date").fill("1997-02-20");
    await stale.page.locator("#calculate-button").click();
    await expect(stale.page.locator("#artifact-badge")).toHaveText("核对通过 · 尚未保存", {
      timeout: 60_000
    });
    await stale.page.locator("#revision-title").fill("三方陈旧写入");
    await stale.page.locator("#save-button").click();
    await expect(stale.page.locator("#workspace-status")).toContainText(
      "资料库已在另一个页面更新",
      { timeout: 30_000 }
    );
    await expect(stale.page.locator("#workspace-status")).toHaveAttribute("data-state", "error");
    await expect(stale.page.locator("#revision-count")).toHaveText("2");
    await expect(stale.page.locator("#mutation-epoch")).toHaveText("2");
    await expect(stale.page.locator(".archive-item")).toHaveCount(2);
  }

  await expect(second.locator("#revision-count")).toHaveText("2");
  await expect(second.locator("#mutation-epoch")).toHaveText("2");
  expect(first.problems).toEqual([]);
  expect(third.problems).toEqual([]);
  expect(secondProblems).toEqual([]);
});
