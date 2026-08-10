import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .table-skeleton, .chart-loading")).toHaveCount(0);
}

async function auditCurrentPage(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target).slice(0, 8),
    summary: violation.nodes[0]?.failureSummary ?? ""
  }));
  expect(violations, `${label} 存在 WCAG A/AA 自动审计错误`).toEqual([]);
}

async function advanceAndSaveChart(page: Page, saveButtonName: "保存并打开" | "保存为新修订并打开") {
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: saveButtonName, exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
}

test("案例生命周期与历史 Revision 派生形成连续可恢复闭环", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await advanceAndSaveChart(page, "保存并打开");
  const r1Url = page.url();
  const r1Path = new URL(r1Url).pathname;
  const [, , caseId, , r1Id] = r1Path.split("/");

  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await advanceAndSaveChart(page, "保存为新修订并打开");
  const r2Url = page.url();
  expect(r2Url).not.toBe(r1Url);

  const revisionHistory = page.getByRole("combobox", { name: "历史 Revision" });
  await revisionHistory.selectOption(r1Id);
  await page.waitForURL(r1Url);
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByText(/来源 R1/)).toBeVisible();
  await advanceAndSaveChart(page, "保存为新修订并打开");
  const r3Url = page.url();
  expect(r3Url).not.toBe(r1Url);
  expect(r3Url).not.toBe(r2Url);
  await expect(page.getByRole("combobox", { name: "历史 Revision" }).locator("option"))
    .toHaveText([/R1/, /R2/, /R3/]);

  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  let caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await expect(caseRow).toContainText("3 次修订");
  await caseRow.getByRole("button", { name: "收藏案例 演示案例 · 辰时研究", exact: true }).click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await expect(caseRow).toContainText("已收藏");

  await caseRow.getByRole("button", { name: "编辑案例 演示案例 · 辰时研究", exact: true }).click();
  const editor = page.getByRole("region", { name: "编辑“演示案例 · 辰时研究”" });
  await auditCurrentPage(page, "桌面案例元数据编辑区");
  await editor.getByLabel(/案例别名/).fill("P1-03 生命周期实测");
  await editor.getByLabel("标签").fill("P1-03，Edge 复验");
  await editor.getByLabel("案例备注").fill("连续验证历史修订、收藏、回收站恢复与永久删除。");
  await editor.getByRole("button", { name: "保存资料", exact: true }).click();
  await expect(page.getByText(/已更新案例“P1-03 生命周期实测”/)).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑案例 P1-03 生命周期实测" })).toBeFocused();

  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await caseRow.getByRole("button", { name: "移入回收站案例 P1-03 生命周期实测", exact: true }).click();
  await expect(page.getByText(/已将案例“P1-03 生命周期实测”移入回收站/)).toBeVisible();
  await expect(page.getByRole("button", { name: "收藏", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "回收站", exact: true }).click();
  await page.getByLabel("搜索案例与研究笔记").fill("Edge 复验");
  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await expect(caseRow).toContainText("P1-03 生命周期实测");

  await page.goto(r3Url, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("案例已在回收站", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "由此修订派生新版", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "历史 Revision" }).locator("option"))
    .toHaveText([/R1/, /R2/, /R3/]);

  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  const trashScope = page.getByRole("button", { name: "回收站", exact: true });
  await trashScope.click();
  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await caseRow.getByRole("button", { name: "恢复案例 P1-03 生命周期实测", exact: true }).click();
  await expect(page.getByText(/已恢复案例“P1-03 生命周期实测”/)).toBeVisible();
  await expect(trashScope).toBeFocused();
  await page.getByRole("button", { name: "全部", exact: true }).click();
  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await expect(caseRow).toContainText("P1-03、Edge 复验");
  await expect(caseRow).toContainText("已收藏");
  await expect(caseRow).toContainText("3 次修订");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await caseRow.getByRole("button", { name: "移入回收站案例 P1-03 生命周期实测", exact: true }).click();
  await trashScope.click();
  caseRow = page.getByRole("row").filter({ hasText: caseId.slice(0, 8) });
  await caseRow.getByRole("button", { name: "永久删除案例 P1-03 生命周期实测", exact: true }).click();
  const confirmation = page.getByRole("group", { name: "永久删除“P1-03 生命周期实测”？" });
  await expect(confirmation).toContainText("此操作不可恢复");
  await expect(confirmation.getByRole("button", { name: "永久删除案例", exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await auditCurrentPage(page, "390px 回收站永久删除确认");
  await confirmation.getByRole("button", { name: "永久删除案例", exact: true }).click();
  await expect(page.getByText(/已永久删除案例“P1-03 生命周期实测”/)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: caseId.slice(0, 8) })).toHaveCount(0);
  await expect(trashScope).toBeFocused();

  await page.goto(r3Url, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("案例不存在或已经从此浏览器删除");
  expect(consoleProblems).toEqual([]);
});
