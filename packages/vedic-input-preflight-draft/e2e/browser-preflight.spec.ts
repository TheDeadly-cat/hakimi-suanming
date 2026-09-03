import { expect, test, type Page, type Request } from "@playwright/test";

const EXPECTED_CODES = [
  "SCHEMA_REQUIRED_PROPERTY_MISSING",
  "SCHEMA_PATTERN_MISMATCH",
  "DECLARED_DST_GAP_REJECTED",
  "INPUT_CONTRACT_NOT_ADMITTED"
] as const;

const EXPECTED_CSP = "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";

type StorageSnapshot = Readonly<{
  localStorage: number;
  sessionStorage: number;
  indexedDatabases: number;
  cacheKeys: number;
}>;

async function storageSnapshot(page: Page): Promise<StorageSnapshot> {
  return await page.evaluate(async () => ({
    localStorage: window.localStorage.length,
    sessionStorage: window.sessionStorage.length,
    indexedDatabases: typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).length
      : -1,
    cacheKeys: "caches" in window ? (await caches.keys()).length : -1
  }));
}

function isExternal(request: Request): boolean {
  return new URL(request.url()).origin !== "http://127.0.0.1:4221";
}

function observeRuntimeProblems(page: Page): Readonly<{
  consoleProblems: string[];
  pageErrors: string[];
}> {
  const consoleProblems: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleProblems, pageErrors };
}

test("four fixed probes reject identically in a fresh Worker without external network or persistence", async ({
  page,
  context
}) => {
  const { consoleProblems, pageErrors } = observeRuntimeProblems(page);
  const requests: Request[] = [];
  let workerCount = 0;
  page.on("request", (request) => requests.push(request));
  page.on("worker", () => { workerCount += 1; });

  await page.goto("/");
  await expect(page).toHaveTitle("吠陀输入结构预检 · 隔离草案");
  await expect(page.locator("h1")).toHaveText("吠陀输入结构预检");
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    "content",
    EXPECTED_CSP
  );
  await expect(page.locator("#run-status")).toHaveAttribute("data-state", "idle");
  const before = await storageSnapshot(page);

  await page.locator("#run-preflight").click();
  await expect(page.locator("#run-status")).toHaveAttribute("data-state", "complete");
  await expect(page.locator("#worker-state")).toHaveAttribute("data-state", "complete");
  await expect(page.locator("#accepted-count")).toHaveText("0");
  await expect(page.locator("#product-receipt-count")).toHaveText("0");
  await expect(page.locator("#admission-state")).toHaveText("false");
  await expect(page.locator(".probe-result")).toHaveCount(4);
  await expect(page.locator(".probe-code")).toHaveText([...EXPECTED_CODES]);
  const firstReceiptIds = await page.locator(".probe-result").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-receipt-id"))
  );
  expect(firstReceiptIds.every((value) => /^hakimi\.vedic\.structural-precheck-diagnostic\/[0-9a-f]{64}$/u.test(value ?? ""))).toBe(true);

  await page.locator("#run-preflight").click();
  await expect(page.locator("#run-status")).toHaveAttribute("data-state", "complete");
  const secondReceiptIds = await page.locator(".probe-result").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-receipt-id"))
  );
  expect(secondReceiptIds).toEqual(firstReceiptIds);
  expect(workerCount).toBe(2);

  const after = await storageSnapshot(page);
  expect(before).toEqual({ localStorage: 0, sessionStorage: 0, indexedDatabases: 0, cacheKeys: 0 });
  expect(after).toEqual(before);
  expect(await context.cookies()).toEqual([]);
  expect(requests.filter(isExternal)).toEqual([]);
  expect(requests.filter((request) => ["fetch", "xhr"].includes(request.resourceType()))).toEqual([]);
  expect(consoleProblems).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("a Worker load failure leaves every product and authority gate closed", async ({ page, context }) => {
  const { consoleProblems, pageErrors } = observeRuntimeProblems(page);
  const requests: Request[] = [];
  let abortedWorkerRequests = 0;
  page.on("request", (request) => requests.push(request));
  await page.goto("/");
  await page.route("**/assets/browser-worker-*.js", async (route) => {
    abortedWorkerRequests += 1;
    await route.abort("failed");
  });

  await page.locator("#run-preflight").click();
  await expect(page.locator("#run-status")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#worker-state")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#run-error")).toBeVisible();
  await expect(page.locator("#run-error")).toContainText("WORKER_CRASHED");
  await expect(page.locator("#accepted-count")).toHaveText("0");
  await expect(page.locator("#product-receipt-count")).toHaveText("0");
  await expect(page.locator("#admission-state")).toHaveText("false");
  await expect(page.locator(".probe-result")).toHaveCount(0);
  expect(await storageSnapshot(page)).toEqual({
    localStorage: 0,
    sessionStorage: 0,
    indexedDatabases: 0,
    cacheKeys: 0
  });
  expect(await context.cookies()).toEqual([]);
  expect(abortedWorkerRequests).toBe(1);
  expect(requests.filter(isExternal)).toEqual([]);
  expect(consoleProblems.every((message) =>
    message.includes("Failed to load resource") || message.includes("net::ERR_FAILED")
  )).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("390 by 844 renders all four fixed rejections without horizontal overflow", async ({ page }) => {
  const { consoleProblems, pageErrors } = observeRuntimeProblems(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#run-preflight").click();
  await expect(page.locator("#run-status")).toHaveAttribute("data-state", "complete");
  await expect(page.locator(".probe-result")).toHaveCount(4);
  await expect(page.locator(".probe-code")).toHaveText([...EXPECTED_CODES]);
  await expect(page.locator("#accepted-count")).toHaveText("0");
  await expect(page.locator("#product-receipt-count")).toHaveText("0");
  await expect(page.locator("#admission-state")).toHaveText("false");

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.clientWidth).toBe(390);
  expect(layout.scrollWidth).toBe(layout.clientWidth);
  expect(consoleProblems).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("the declared CSP blocks a same-origin fetch with no observed page request", async ({ page }) => {
  const target = "http://127.0.0.1:4221/__csp_connect_probe__";
  const observed: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => {
    if (request.url() === target) observed.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    "content",
    EXPECTED_CSP
  );
  const outcome = await page.evaluate(async (url) => {
    try {
      await fetch(url);
      return "resolved";
    } catch (cause) {
      return cause instanceof TypeError ? "blocked-type-error" : "blocked-other-error";
    }
  }, target);

  expect(outcome).toBe("blocked-type-error");
  expect(observed).toEqual([]);
  expect(pageErrors).toEqual([]);
});
