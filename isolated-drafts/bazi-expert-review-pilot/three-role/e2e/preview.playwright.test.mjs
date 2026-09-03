import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

import { startPreviewServer } from "../server.mjs";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DESKTOP_SCREENSHOT = join(tmpdir(), "hakimi-dtt-three-role-desktop.png");
const DOMAIN_SCREENSHOT = join(tmpdir(), "hakimi-dtt-three-role-domain-a.png");
const MOBILE_SCREENSHOT = join(tmpdir(), "hakimi-dtt-three-role-mobile.png");

async function stop(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("four same-page templates render with explicit non-access-control boundaries", {
  skip: !existsSync(EDGE_PATH)
}, async (t) => {
  const started = await startPreviewServer();
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  t.after(async () => {
    await browser.close();
    await stop(started.server);
  });

  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const consoleProblems = [];
  const pageErrors = [];
  const requestOrigins = new Set();

  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requestOrigins.add(new URL(request.url()).origin));

  const response = await page.goto(`${started.origin}/source-collation`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /来源／校勘/);
  assert.equal(await page.locator("body").getAttribute("data-view"), "source-collation");
  assert.equal(await page.locator("body").getAttribute("data-role-access-control-established"), "false");
  assert.equal(await page.locator("body").getAttribute("data-physical-seat-separation-established"), "false");
  assert.equal(await page.locator("#status-binding").textContent(), "0/12");
  assert.equal(await page.locator("#status-experts").textContent(), "0/2");
  assert.equal(await page.locator("#status-authorization").textContent(), "false");
  assert.equal(await page.locator("form, input, textarea, select, button").count(), 0);
  const sourceContent = await page.locator("#view-content").innerText();
  assert.ok(sourceContent.includes("来源／校勘"));
  assert.match(sourceContent, /dtt-chanwei-wikisource-r2600158-candidate-v2/);
  assert.match(sourceContent, /03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9/);
  assert.match(sourceContent, /d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803/);
  assert.match(sourceContent, /1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60/);
  assert.match(sourceContent, /协调员机器 packet basis/);
  assert.match(sourceContent, /252370b6a03e799321544948182351a96d42d148fe8e3039eacdb43385a4b5ca/);
  assert.match(sourceContent, /runtime private brand\s+false/);
  assert.match(sourceContent, /跨文件原子快照\s+false/);
  assert.ok(await page.locator("a[target='_blank'][rel='noopener noreferrer']").count() >= 3);
  assert.match(await page.locator("#view-content").innerText(), /点击将离开本地页面并联网/);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.equal(await page.evaluate(async () => (await indexedDB.databases()).length), 0);
  await page.screenshot({ path: DESKTOP_SCREENSHOT, fullPage: true });

  await Promise.all([
    page.waitForURL(`${started.origin}/domain-a`),
    page.getByRole("link", { name: "领域模板 A" }).click()
  ]);
  const domainAContent = await page.locator("#view-content").innerText();
  assert.match(domainAContent, /领域审阅模板 A/);
  assert.match(domainAContent, /同一人可以查看 A、B 两份模板/);
  assert.match(domainAContent, /独立物理包或独立会话/);
  assert.doesNotMatch(domainAContent, /Binding|evidenceSubject|revision|SHA-?256|digest|packet|hash|候选摘要/iu);
  assert.equal(await page.locator("#machine-status").isHidden(), true);
  assert.equal(await page.locator("#machine-footer").isHidden(), true);
  assert.equal(await page.locator("#view-content a[target='_blank']").count(), 0);
  assert.equal(await page.locator("#view-content form, #view-content input, #view-content textarea, #view-content button").count(), 0);
  await page.screenshot({ path: DOMAIN_SCREENSHOT, fullPage: true });

  await page.goto(`${started.origin}/domain-b`, { waitUntil: "networkidle" });
  const domainBContent = await page.locator("#view-content").innerText();
  assert.match(domainBContent, /领域审阅模板 B/);
  assert.doesNotMatch(domainBContent, /Binding|evidenceSubject|revision|SHA-?256|digest|packet|hash|候选摘要/iu);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${started.origin}/rights`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("body").getAttribute("data-view"), "rights");
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width };
      })
      .filter((item) => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
      .slice(0, 8)
  }));
  assert.equal(overflow.scrollWidth <= overflow.clientWidth, true, JSON.stringify(overflow));
  await page.screenshot({ path: MOBILE_SCREENSHOT, fullPage: true });

  assert.deepEqual([...requestOrigins], [started.origin]);
  assert.deepEqual(consoleProblems, []);
  assert.deepEqual(pageErrors, []);
  console.log(`desktop screenshot: ${DESKTOP_SCREENSHOT}`);
  console.log(`domain A screenshot: ${DOMAIN_SCREENSHOT}`);
  console.log(`mobile screenshot: ${MOBILE_SCREENSHOT}`);
});
