import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(
    ".route-loading, .dashboard-skeleton, .table-skeleton, .chart-loading, .research-loading, .transit-loading"
  )).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
}

async function openPage(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

async function expectDocumentReflow(page: Page, expectedWidth: number) {
  await expect.poll(() => page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth
  }))).toEqual({
    bodyClientWidth: expectedWidth,
    bodyScrollWidth: expectedWidth,
    rootClientWidth: expectedWidth,
    rootScrollWidth: expectedWidth
  });
}

async function auditCurrentPage(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.flatMap((node) => node.target).slice(0, 8)
  }));
  expect(violations, `${label} 存在 WCAG A/AA 自动审计错误`).toEqual([]);
}

async function focusByKeyboard(page: Page, target: Locator) {
  for (let index = 0; index < 80; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("键盘 Tab 顺序没有到达目标控件");
}

async function verifyMobileHelpChrome(page: Page) {
  const mobileHelp = page.locator(".mobile-topbar").getByRole("link", { name: "帮助与安全边界" });
  await expect(mobileHelp).toBeVisible();
  await expect(mobileHelp).toHaveAttribute("aria-current", "page");
  const helpBox = await mobileHelp.boundingBox();
  expect(helpBox).not.toBeNull();
  expect(helpBox!.width).toBeGreaterThanOrEqual(44);
  expect(helpBox!.height).toBeGreaterThanOrEqual(44);

  const mobileNavigation = page.getByRole("navigation", { name: "手机主导航" });
  await expect(mobileNavigation.getByRole("link")).toHaveCount(5);
  await expect(mobileNavigation.locator("[aria-current]")).toHaveCount(0);

  await focusByKeyboard(page, mobileHelp);
  await expect(mobileHelp).toBeFocused();
}

async function createDemoCase(page: Page): Promise<string> {
  await openPage(page, "/new?demo=1", "新建排盘");
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForReady(page);
  return new URL(page.url()).pathname;
}

test("200% 与 400% 等效 CSS 视口下核心流程重排且操作仍可达", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  // WCAG 1.4.10 evaluates a 1280 CSS-pixel desktop viewport at 200%/400%
  // as 640/320 CSS pixels. Browser chrome zoom is not required to prove reflow.
  await page.setViewportSize({ width: 640, height: 800 });
  await openPage(page, "/", /今天从哪一张盘继续/);
  await expectDocumentReflow(page, 640);
  await auditCurrentPage(page, "200% 等效工作台");

  await page.setViewportSize({ width: 320, height: 720 });
  await openPage(page, "/", /今天从哪一张盘继续/);
  await expectDocumentReflow(page, 320);
  const mobileNavigation = page.getByRole("navigation", { name: "手机主导航" });
  await expect(mobileNavigation.getByRole("link")).toHaveCount(5);
  await auditCurrentPage(page, "400% 等效工作台");

  await openPage(page, "/help", "帮助与安全边界");
  await expectDocumentReflow(page, 320);
  await verifyMobileHelpChrome(page);
  await auditCurrentPage(page, "400% 等效帮助与安全边界");
  const firstHelpTopic = page.getByRole("navigation", { name: "帮助主题" }).getByRole("link", { name: "本地数据", exact: true });
  await focusByKeyboard(page, firstHelpTopic);
  await expect(firstHelpTopic).toBeFocused();
  await firstHelpTopic.press("Enter");
  await expect(page).toHaveURL(/\/help#local-data$/);
  await expectDocumentReflow(page, 320);
  await expect(page.getByRole("heading", { name: "本地数据与备份" })).toBeVisible();

  const chartPath = await createDemoCase(page);
  await expectDocumentReflow(page, 320);
  await page.goto(`${chartPath}?view=structure`, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "四柱结构矩阵" })).toBeVisible();
  await expectDocumentReflow(page, 320);
  await auditCurrentPage(page, "400% 等效命盘结构");

  await openPage(page, "/settings/data", "数据管理与完整备份");
  await expectDocumentReflow(page, 320);
  const deleteTrigger = page.getByRole("button", { name: "开始完整清空", exact: true });
  await deleteTrigger.click();
  const confirmation = page.getByRole("group", { name: /输入“删除全部本地数据”以解锁/ });
  await expect(confirmation).toBeVisible();
  await expectDocumentReflow(page, 320);
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(deleteTrigger).toBeFocused();
  await auditCurrentPage(page, "400% 等效数据管理");

  await openPage(page, "/settings/transit-review-inbox", "未核验审核收件箱");
  await expectDocumentReflow(page, 320);
  await auditCurrentPage(page, "400% 等效未核验审核收件箱");

  expect(consoleProblems).toEqual([]);
});

test("强制色彩模式保留页面身份、状态语义、焦点与主要操作", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page, "/", /今天从哪一张盘继续/);

  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "跳到主要内容" });
  await expect(skipLink).toBeFocused();
  const focusAppearance = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusAppearance.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusAppearance.outlineWidth)).toBeGreaterThanOrEqual(1);
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await auditCurrentPage(page, "强制色彩工作台");

  await openPage(page, "/help", "帮助与安全边界");
  await auditCurrentPage(page, "强制色彩帮助与安全边界");
  const firstHelpTopic = page.getByRole("navigation", { name: "帮助主题" }).getByRole("link", { name: "本地数据", exact: true });
  await focusByKeyboard(page, firstHelpTopic);
  const helpTopicFocus = await firstHelpTopic.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(helpTopicFocus.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(helpTopicFocus.outlineWidth)).toBeGreaterThanOrEqual(1);
  await firstHelpTopic.press("Enter");
  await expect(page).toHaveURL(/\/help#local-data$/);

  await page.getByRole("link", { name: "设置与诊断" }).first().click();
  await expect(page.getByRole("heading", { name: "设置与诊断" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("link", { name: "设置与诊断" }).first()).toHaveAttribute("aria-current", "page");
  await auditCurrentPage(page, "强制色彩设置页");

  const dataLink = page.getByRole("link", { name: /打开数据管理/ });
  await focusByKeyboard(page, dataLink);
  const dataLinkFocus = await dataLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(dataLinkFocus.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(dataLinkFocus.outlineWidth)).toBeGreaterThanOrEqual(1);
  await dataLink.click();
  await expect(page.getByRole("heading", { name: "数据管理与完整备份" })).toBeVisible();
  await auditCurrentPage(page, "强制色彩数据管理页");

  expect(consoleProblems).toEqual([]);
});
