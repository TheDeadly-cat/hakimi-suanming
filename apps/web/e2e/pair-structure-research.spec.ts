import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;
const TARGET_INSTANT = "2026-08-02T09:15:00.000Z";

type ExactCase = {
  alias: string;
  caseId: string;
  revisionId: string;
};

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(
    ".route-loading, .dashboard-skeleton, .table-skeleton, .chart-loading, .center-loading"
  )).toHaveCount(0);
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

async function createExactCase(
  page: Page,
  input: { alias: string; date: string; time: string }
): Promise<ExactCase> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "先给案例一个研究标识" })).toBeVisible();
  await page.getByLabel(/案例别名/).fill(input.alias);

  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "录入出生资料" })).toBeVisible();
  await page.getByLabel(/出生日期/).fill(input.date);
  await page.getByLabel(/民用时间/).fill(input.time);

  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "确认时间基准与换日规则" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();

  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await expect(page.getByRole("heading", { name: input.alias })).toBeVisible();

  const [, , caseId, , revisionId] = new URL(page.url()).pathname.split("/");
  expect(caseId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(revisionId).toMatch(/^[0-9a-f-]{36}$/i);
  return { alias: input.alias, caseId, revisionId };
}

function exactItem(record: ExactCase): string {
  return `revision:${record.caseId}:${record.revisionId}`;
}

async function expectExactPairUrl(
  page: Page,
  expected: readonly [ExactCase, ExactCase]
) {
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      items: url.searchParams.getAll("item"),
      at: url.searchParams.get("at"),
      keys: [...new Set(url.searchParams.keys())].sort()
    };
  }).toEqual({
    pathname: "/compare/pair",
    items: expected.map(exactItem),
    at: TARGET_INSTANT,
    keys: ["at", "item"]
  });

  const serialized = page.url();
  for (const record of expected) {
    expect(serialized).not.toContain(encodeURIComponent(record.alias));
    expect(serialized).not.toContain(record.alias);
  }
}

async function expectCompletePairProjection(page: Page) {
  const matrix = page.getByRole("region", { name: "双案例事实字段并列表" });
  await expect(matrix).toBeVisible();
  await expect(matrix.locator("tbody tr[data-field-id]")).toHaveCount(96);
  await expect(matrix.locator("thead th")).toHaveCount(3);
  await expect.poll(() => matrix.locator("tbody tr[data-field-id]").evaluateAll((rows) =>
    rows.every((row) => row.querySelectorAll("td").length === 2)
  )).toBe(true);

  const transit = page.getByRole("region", { name: "双案例同一瞬时点六层运限并列表" });
  await expect(transit).toBeVisible();
  await expect(transit.locator("tbody tr[data-field-id]")).toHaveCount(7);
  await expect.poll(() => transit.locator("tbody tr[data-field-id]").evaluateAll((rows) =>
    rows.every((row) => row.querySelectorAll("td").length === 2)
  )).toBe(true);
}

test("P1-07 双案例事实研究锁定两个不同 Revision、同瞬时点与安卓宽度边界", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const subjectA = await createExactCase(page, {
    alias: "P1-07 双案例甲",
    date: "1995-08-18",
    time: "23:30"
  });
  const subjectB = await createExactCase(page, {
    alias: "P1-07 双案例乙",
    date: "1996-03-09",
    time: "09:26"
  });
  expect(subjectA.caseId).not.toBe(subjectB.caseId);
  expect(subjectA.revisionId).not.toBe(subjectB.revisionId);

  await page.goto("/compare/pair", { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "双案例结构研究 · 事实层" })).toBeVisible();
  const boundary = page.getByRole("complementary", { name: "事实层硬边界" });
  await expect(boundary).toContainText("不生成跨盘干支推导、吉凶、因果、缘分、婚配结论或任何评分");
  await expect(boundary).toContainText("对象甲只是字段差异的技术锚点");

  const caseA = page.getByRole("combobox", { name: "对象甲案例" });
  const revisionA = page.getByRole("combobox", { name: "对象甲修订" });
  const caseB = page.getByRole("combobox", { name: "对象乙案例" });
  const revisionB = page.getByRole("combobox", { name: "对象乙修订" });
  await expect(caseB).toBeDisabled();

  await caseA.selectOption(subjectA.caseId);
  await expect(revisionA).toBeEnabled();
  await revisionA.selectOption(subjectA.revisionId);
  await expect(caseB).toBeEnabled();
  await expect(caseB.locator(`option[value="${subjectA.caseId}"]`)).toHaveAttribute("disabled", "");
  await caseB.selectOption(subjectB.caseId);
  await expect(revisionB).toBeEnabled();
  await revisionB.selectOption(subjectB.revisionId);

  await expectCompletePairProjection(page);
  const exportRegion = page.getByRole("region", { name: "导出确切双案例研究工件" });
  const sensitiveDetails = exportRegion.locator("details.pair-export-sensitive");
  await expect(exportRegion).toBeVisible();
  await expect(exportRegion.getByRole("button", { name: "导出匿名双案例 Markdown" })).toBeEnabled();
  await expect(sensitiveDetails).not.toHaveAttribute("open", "");
  await exportRegion.getByText("完整审计 JSON（敏感）", { exact: true }).click();
  await expect(exportRegion.getByRole("button", { name: "导出完整审计 JSON" })).toBeDisabled();
  const fullAuditConfirmation = exportRegion.getByRole("checkbox", {
    name: /我确认这是包含两位对象可识别资料的完整审计文件/
  });
  await fullAuditConfirmation.check();
  await expect(exportRegion.getByRole("button", { name: "导出完整审计 JSON" })).toBeEnabled();
  await page.getByLabel("目标瞬时点（UTC）").fill("2026-08-02T09:15");
  await page.getByRole("button", { name: "同步两方运限", exact: true }).click();
  await expect(page.getByText(TARGET_INSTANT, { exact: true })).toBeVisible();
  await expectExactPairUrl(page, [subjectA, subjectB]);
  await expectCompletePairProjection(page);
  await expect(sensitiveDetails).not.toHaveAttribute("open", "");
  await exportRegion.getByText("完整审计 JSON（敏感）", { exact: true }).click();
  await expect(exportRegion.getByRole("button", { name: "导出完整审计 JSON" })).toBeDisabled();
  await auditCurrentPage(page, "桌面双案例事实投影");

  const exactUrl = page.url();
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page).toHaveURL(exactUrl);
  await expect(caseA).toHaveValue(subjectA.caseId);
  await expect(revisionA).toHaveValue(subjectA.revisionId);
  await expect(caseB).toHaveValue(subjectB.caseId);
  await expect(revisionB).toHaveValue(subjectB.revisionId);
  await expectExactPairUrl(page, [subjectA, subjectB]);
  await expectCompletePairProjection(page);

  await page.getByRole("button", { name: "交换甲乙", exact: true }).click();
  await expect(page.locator(".settings-message[role='status']"))
    .toContainText("只改变显示顺序和机械差异锚点");
  await expectExactPairUrl(page, [subjectB, subjectA]);
  await expect(caseA).toHaveValue(subjectB.caseId);
  await expect(revisionA).toHaveValue(subjectB.revisionId);
  await expect(caseB).toHaveValue(subjectA.caseId);
  await expect(revisionB).toHaveValue(subjectA.revisionId);
  await expectCompletePairProjection(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }))).toEqual({ viewport: 390, documentWidth: 390 });
  await expectCompletePairProjection(page);
  await expect(exportRegion).toBeVisible();
  await exportRegion.getByText("完整审计 JSON（敏感）", { exact: true }).click();
  await expect(exportRegion.locator(".pair-export-sensitive-body")).toBeVisible();
  await auditCurrentPage(page, "390×844 双案例事实投影");
  expect(consoleProblems).toEqual([]);
});
