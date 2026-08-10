import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .dashboard-skeleton, .table-skeleton, .chart-loading, .research-loading, .transit-loading")).toHaveCount(0);
}

async function auditCurrentPage(page: Page, label: string) {
  await waitForReady(page);
  const result = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.flatMap((node) => node.target).slice(0, 8),
    summary: violation.nodes[0]?.failureSummary ?? ""
  }));
  expect(violations, `${label} 存在 WCAG A/AA 自动审计错误`).toEqual([]);
}

async function openPage(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))).toEqual({ bodyOverflow: 0, rootOverflow: 0 });
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
  await expectNoHorizontalOverflow(page);

  await focusByKeyboard(page, mobileHelp);
  await expect(mobileHelp).toBeFocused();
}

async function createDemoCase(page: Page): Promise<string> {
  await openPage(page, "/new?demo=1", "新建排盘");
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await expect(page.getByRole("heading", { name: "演示案例 · 辰时研究" })).toBeVisible();
  return new URL(page.url()).pathname;
}

test("桌面与安卓宽度的核心研究闭环满足 WCAG A/AA 自动门并保留键盘焦点", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await openPage(page, "/", /今天从哪一张盘继续/);
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "跳到主要内容" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await auditCurrentPage(page, "桌面工作台");

  const desktopNavigation = page.getByRole("navigation", { name: "主导航" });
  await desktopNavigation.getByRole("link", { name: "典籍与术语" }).click();
  await expect(page.getByRole("heading", { name: "个人典籍与引用" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await auditCurrentPage(page, "桌面知识库");

  await openPage(page, "/cases", "案例库");
  await auditCurrentPage(page, "桌面案例库");
  await openPage(page, "/compare", "正式命盘对照台");
  await auditCurrentPage(page, "桌面对照台空状态");
  await openPage(page, "/compare/pair", "双案例结构研究 · 事实层");
  await auditCurrentPage(page, "桌面双案例结构研究空状态");
  await openPage(page, "/settings", "设置与诊断");
  await auditCurrentPage(page, "桌面设置页");
  await openPage(page, "/settings/data", "数据管理与完整备份");
  await auditCurrentPage(page, "桌面数据管理页");
  await openPage(page, "/settings/transit-review-inbox", "未核验审核收件箱");
  await auditCurrentPage(page, "桌面未核验审核收件箱");
  await openPage(page, "/help", "帮助与安全边界");
  await expectNoHorizontalOverflow(page);
  await auditCurrentPage(page, "桌面帮助与安全边界");
  const firstHelpTopic = page.getByRole("navigation", { name: "帮助主题" }).getByRole("link", { name: "本地数据", exact: true });
  await focusByKeyboard(page, firstHelpTopic);
  await expect(firstHelpTopic).toBeFocused();
  await firstHelpTopic.press("Enter");
  await expect(page).toHaveURL(/\/help#local-data$/);
  await expect(page.getByRole("heading", { name: "本地数据与备份" })).toBeVisible();
  await openPage(page, "/new?demo=1", "新建排盘");
  await auditCurrentPage(page, "桌面新建排盘");

  const chartPath = await createDemoCase(page);
  await page.goto(`${chartPath}?view=structure`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "四柱结构矩阵" })).toBeVisible();
  await auditCurrentPage(page, "桌面结构页");

  await page.goto(`${chartPath}?view=transit`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "同一瞬时点的六层运限切片" })).toBeVisible();
  await auditCurrentPage(page, "桌面运限页");
  const yearTrack = page.getByRole("list", { name: "流年节点" });
  const yearButtons = yearTrack.getByRole("button");
  const yearTabStop = yearTrack.locator("button[tabindex='0']");
  await expect(yearTabStop).toHaveCount(1);
  await yearTabStop.focus();
  await page.keyboard.press("Home");
  await expect(yearButtons.first()).toBeFocused();
  await expect(yearButtons.first()).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowRight");
  await expect(yearButtons.nth(1)).toBeFocused();
  await expect(yearButtons.nth(1)).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("End");
  await expect(yearButtons.last()).toBeFocused();
  await expect(yearButtons.last()).toHaveAttribute("tabindex", "0");

  await page.goto(`${chartPath}?view=research`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "导出确切单盘研究报告" })).toBeVisible();
  await auditCurrentPage(page, "桌面研读页");

  const previewButton = page.getByRole("button", { name: "预览 PNG / PDF", exact: true });
  await previewButton.focus();
  await previewButton.click();
  const reportDialog = page.getByRole("dialog", { name: /单盘报告预览/ });
  await expect(reportDialog).toBeVisible();
  await expect(reportDialog).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await auditCurrentPage(page, "桌面单盘报告弹窗");
  await page.keyboard.press("Escape");
  await expect(reportDialog).toBeHidden();
  await expect(previewButton).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, "/", /今天从哪一张盘继续/);
  await auditCurrentPage(page, "安卓宽度工作台");
  await openPage(page, "/new?demo=1", "新建排盘");
  await auditCurrentPage(page, "安卓宽度新建排盘");
  await openPage(page, "/settings/data", "数据管理与完整备份");
  await auditCurrentPage(page, "安卓宽度数据管理页");
  await openPage(page, "/settings/transit-review-inbox", "未核验审核收件箱");
  await auditCurrentPage(page, "安卓宽度未核验审核收件箱");
  await openPage(page, "/help", "帮助与安全边界");
  await verifyMobileHelpChrome(page);
  await auditCurrentPage(page, "安卓宽度帮助与安全边界");

  await page.goto(`${chartPath}?view=structure`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "四柱结构矩阵" })).toBeVisible();
  const selectedField = page.getByRole("button", { name: "日柱天干：辛" });
  await selectedField.click();
  const evidenceDialog = page.getByRole("dialog", { name: "日柱 · 天干" });
  await expect(evidenceDialog).toBeVisible();
  await expect(evidenceDialog).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await auditCurrentPage(page, "安卓宽度字段依据抽屉");
  await page.keyboard.press("Escape");
  await expect(evidenceDialog).toBeHidden();
  await expect(selectedField).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

  expect(consoleProblems).toEqual([]);
});
