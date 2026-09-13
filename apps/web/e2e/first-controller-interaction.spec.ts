import { createServer, request as httpRequest } from "node:http";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { requireReleaseBrowserRuntimeProduct } from "./release-browser-persistent-context";

// Delay or reject only the first worker request. All successful response bytes
// come from the already-built application; no fake worker or controller is used.
async function workerProxy(upstream: string) {
  const target = new URL(upstream);
  if (target.protocol !== "http:" || target.hostname !== "127.0.0.1" || target.port === "5188") {
    throw new Error("First-claim QA requires an explicit isolated loopback artifact server.");
  }
  let release!: () => void;
  let observe!: () => void;
  let mode: "held" | "pass" | "fail" = "held";
  const held = new Promise<void>((resolve) => { release = resolve; });
  const seen = new Promise<void>((resolve) => { observe = resolve; });
  const server = createServer(async (request, response) => {
    if (!request.url?.startsWith("/") || request.url.startsWith("//")) {
      response.writeHead(400).end();
      return;
    }
    const url = new URL(request.url, target);
    if (url.pathname === "/sw.js") {
      observe();
      await held;
      if (mode === "fail") {
        response.writeHead(503, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("QA worker unavailable");
        return;
      }
    }
    const forwarded = httpRequest(url, {
      method: request.method,
      headers: { ...request.headers, host: target.host }
    }, (result) => {
      response.writeHead(result.statusCode ?? 502, result.headers);
      result.pipe(response);
    });
    forwarded.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.pipe(forwarded);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("QA listener has no TCP address.");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    seen,
    pass() { mode = "pass"; release(); },
    fail() { mode = "fail"; release(); },
    async close() {
      mode = "pass";
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}

async function annotateBrowser(page: Page, info: TestInfo) {
  const runtime = await (await page.context().newCDPSession(page)).send("Browser.getVersion");
  const product = requireReleaseBrowserRuntimeProduct(info.project.name, runtime.product);
  info.annotations.push({ type: "browser-version", description: product });
}

async function capture(page: Page, info: TestInfo, name: string) {
  const directory = process.env.HAKIMI_QA_SCREENSHOT_DIR;
  if (directory) await page.screenshot({ path: path.join(directory, `${info.project.name}-${name}.png`), animations: "disabled" });
}

async function waitForControlledInteraction(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.appBootReady === "true"
    && navigator.serviceWorker.controller !== null);
  await expect.poll(() => page.getByLabel(/^案例别名/).evaluate((input) => input.closest("[inert]") === null)).toBe(true);
}

test("first worker confirmation keeps input inert, then enables the new controlled document", async ({ page, baseURL }, info) => {
  if (!baseURL) throw new Error("A built artifact baseURL is required.");
  const proxy = await workerProxy(baseURL);
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  try {
    await annotateBrowser(page, info);
    await page.goto(`${proxy.origin}/new`, { waitUntil: "domcontentloaded" });
    await proxy.seen;
    const beforeDocument = await page.evaluate(() => performance.timeOrigin);
    expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
    await expect(page.locator(".app-boot-pending-content[inert]")).toBeVisible();
    const alias = page.getByLabel(/^案例别名/);
    await page.keyboard.press("Tab");
    await page.keyboard.insertText("must-not-enter-before-confirmation");
    await expect(alias).toHaveValue("");
    await capture(page, info, "first-claim-pending");

    proxy.pass();
    await page.waitForFunction((before) => performance.timeOrigin !== before, beforeDocument);
    await waitForControlledInteraction(page);
    await alias.click();
    await page.keyboard.insertText("确认后输入的匿名研究案例");
    const note = page.getByLabel(/^资料来源说明/);
    await note.click();
    await page.keyboard.insertText("合成核验资料；输入发生在首次接管完成之后。");
    const controlledDocument = await page.evaluate(() => performance.timeOrigin);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await expect(alias).toHaveValue("确认后输入的匿名研究案例");
    await expect(note).toHaveValue("合成核验资料；输入发生在首次接管完成之后。");
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(controlledDocument);
    await expect(page).toHaveTitle("新建排盘 · 哈基米八字研究台");
    await capture(page, info, "first-claim-ready");
    expect(problems).toEqual([]);
  } finally { await proxy.close(); }
});

test("a rejected first worker exposes recovery and a normal reload can retry", async ({ page, baseURL }, info) => {
  if (!baseURL) throw new Error("A built artifact baseURL is required.");
  const proxy = await workerProxy(baseURL);
  const pageErrors: string[] = [];
  const faultMessages: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") faultMessages.push(message.text()); });
  try {
    await annotateBrowser(page, info);
    await page.goto(`${proxy.origin}/new`, { waitUntil: "domcontentloaded" });
    await proxy.seen;
    proxy.fail();
    await expect(page.locator(".boot-failure-shell")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-app-boot-ready", "false");
    await expect(page.getByLabel(/^案例别名/)).toHaveCount(0);
    await expect(page).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
    await capture(page, info, "first-claim-registration-failed");
    await info.attach("expected-registration-failure", { body: JSON.stringify(faultMessages), contentType: "application/json" });
    expect(faultMessages.some((message) => message.includes("Service Worker 注册失败"))).toBe(true);
    faultMessages.length = 0;

    proxy.pass();
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForControlledInteraction(page);
    const alias = page.getByLabel(/^案例别名/);
    await alias.click();
    await page.keyboard.insertText("重试确认后的匿名研究案例");
    await expect(alias).toHaveValue("重试确认后的匿名研究案例");
    await capture(page, info, "first-claim-retry-ready");
    expect(pageErrors).toEqual([]);
    expect(faultMessages).toEqual([]);
  } finally { await proxy.close(); }
});
