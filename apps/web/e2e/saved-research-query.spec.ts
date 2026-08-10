import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .dashboard-skeleton, .table-skeleton, .chart-loading, .research-query-loading")).toHaveCount(0);
}

async function createDemoCase(page: Page): Promise<{ caseId: string; revisionId: string }> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "下一步", exact: true }).click();
  }
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  const [, , caseId, , revisionId] = new URL(page.url()).pathname.split("/");
  if (!caseId || !revisionId) throw new Error("demo Case route did not expose exact IDs");
  return { caseId, revisionId };
}

async function waitForResearchResult(page: Page, count = 1) {
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: new RegExp(`正式命盘 · ${count} 条结果`) })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /已按 ResearchQuery v1/ })).toBeVisible();
}

test("版本化 ResearchQuery、保存视图、隐私路由与安卓宽度形成可恢复闭环", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const { caseId, revisionId } = await createDemoCase(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /专业研究检索/ }).click();
  await page.waitForURL(/\/cases\/research$/);
  await waitForResearchResult(page);

  const search = page.getByRole("searchbox", { name: /检索别名、标签与研究正文/ });
  await search.fill("演示   案例");
  await page.getByRole("group", { name: "日主" }).getByLabel("辛", { exact: true }).check();
  const ruleProfileGroup = page.getByRole("group", { name: "规则配置快照" });
  await ruleProfileGroup.getByRole("checkbox").first().check();
  await page.getByLabel("启用运限组合条件", { exact: true }).check();
  await page.getByLabel(/目标瞬时点（UTC）/).fill("2024-02-04T08:28");
  await page.getByLabel("流年", { exact: true }).check();
  await page.getByLabel("流年干支", { exact: true }).fill("甲辰");
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?draft=[0-9a-f-]{36}$/i);
  await waitForResearchResult(page);

  const draftUrl = new URL(page.url());
  expect([...draftUrl.searchParams.keys()]).toEqual(["draft"]);
  expect(draftUrl.href).not.toContain("演示");
  expect(draftUrl.href).not.toContain("%E6%BC%94%E7%A4%BA");
  const resultCard = page.getByRole("article", { name: "研究结果 演示案例 · 辰时研究" });
  await expect(resultCard).toContainText("日主 辛");
  await expect(resultCard).toContainText("year · 甲辰");
  await expect(page.getByText(/当前专家验证案例为 0，本次命中不代表运限命理真值已经确认/)).toBeVisible();
  await expect(resultCard.getByLabel("计算来源：当前版本即时投影")).toContainText("explicit_projection");
  await expect(page.getByText(/已保存收据 0 · 当前即时投影 1/)).toBeVisible();
  await expect(resultCard.getByRole("link", { name: "打开确切修订" })).toHaveAttribute(
    "href",
    `/cases/${caseId}/revisions/${revisionId}`,
  );
  await expect(resultCard.getByRole("link", { name: /加入对照/ })).toHaveAttribute(
    "href",
    new RegExp(`item=revision:${caseId}:${revisionId}`),
  );

  await page.getByLabel("视图名称").fill("辛日主演示研究");
  await page.getByRole("button", { name: "保存当前查询", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?view=[0-9a-f-]{36}$/i);
  await expect(page.getByText("已保存视图“辛日主演示研究”。", { exact: true })).toBeVisible();
  const originalViewUrl = page.url();

  await page.getByLabel("排序方向").selectOption("asc");
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?draft=[0-9a-f-]{36}$/i);
  await waitForResearchResult(page);
  await page.getByRole("button", { name: "更新当前视图", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?view=[0-9a-f-]{36}$/i);
  await expect(page.getByText("已更新保存视图“辛日主演示研究”。", { exact: true })).toBeVisible();

  await page.getByLabel("视图名称").fill("辛日主演示研究 副本");
  await page.getByRole("button", { name: "另存副本", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?view=[0-9a-f-]{36}$/i);
  await expect(page.getByText("已另存副本“辛日主演示研究 副本”。", { exact: true })).toBeVisible();
  const copiedViewUrl = page.url();
  expect(copiedViewUrl).not.toBe(originalViewUrl);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForResearchResult(page);
  await expect(page.getByLabel("排序方向")).toHaveValue("asc");
  await expect(resultCard).toBeVisible();

  await resultCard.getByRole("link", { name: "固定此结果" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("result")).toBe(`case:${caseId}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForResearchResult(page);
  await expect(resultCard).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出查询快照", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hakimi-research-query-.+\.json$/);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("query export download path unavailable");
  const exported = JSON.parse(await readFile(downloadPath, "utf8")) as Record<string, unknown>;
  expect(exported).toMatchObject({
    manifest: {
      format: "hakimi-research-query-export",
      formatVersion: "1.1.0",
      privacy: "full_local_research",
      total: 1,
    },
    payload: {
      total: 1,
      results: [{
        revisions: [{ calculationSource: { source: "explicit_projection", comparisonStatus: "not_applicable" } }],
      }],
    },
  });
  const exportFeedback = page.getByText(/已请求浏览器下载；请在下载列表确认文件已保存并可以打开。.*经过摘要复算的查询快照/);
  await expect(exportFeedback).toBeVisible();

  await page.goto("/cases/research?q=%E6%B3%84%E9%9C%B2%E8%AF%8D", { waitUntil: "domcontentloaded" });
  const routeAlert = page.getByRole("alert");
  await expect(routeAlert).toContainText("包含未知参数");
  await expect(routeAlert).toContainText("未执行任何回退");
  await expect(page.getByRole("heading", { name: /正式命盘 ·/ })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(copiedViewUrl, { waitUntil: "domcontentloaded" });
  await waitForResearchResult(page);
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
  const axe = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  expect(axe.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.flatMap((node) => node.target),
  }))).toEqual([]);
  expect(consoleProblems).toEqual([]);
});
