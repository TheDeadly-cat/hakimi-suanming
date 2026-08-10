import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

async function waitForReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .chart-loading, .research-loading, .transit-loading")).toHaveCount(0);
}

async function createDemoCase(page: Page): Promise<string> {
  await page.goto("/new?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "新建排盘" })).toBeVisible();
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

async function chooseMinutePrecision(page: Page) {
  await page.getByLabel("日期精度").selectOption("minute");
}

async function fillMinuteEvent(page: Page, input: {
  title: string;
  localDateTime: string;
  timeZone: string;
  feedback?: "unreviewed" | "supports" | "contradicts" | "mixed";
  tags?: string;
}) {
  await chooseMinutePrecision(page);
  await page.getByLabel(/事件标题/).fill(input.title);
  await page.getByLabel(/事件时区/).fill(input.timeZone);
  await page.getByLabel("起始民用分钟").fill(input.localDateTime);
  if (input.feedback) await page.getByRole("combobox", { name: "反馈", exact: true }).selectOption(input.feedback);
  if (input.tags) await page.getByLabel("标签", { exact: true }).last().fill(input.tags);
}

test("事件时间语义、节点双向深链、筛选与安卓宽度在同一会话中保持可复算", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  const chartPath = await createDemoCase(page);
  await page.goto(`${chartPath}?view=transit&at=2026-08-01T12%3A00%3A00Z`, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  const yearTrack = page.getByRole("list", { name: "流年节点" });
  await yearTrack.getByRole("button").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("node")).toMatch(/^year:/);
  await page.getByRole("button", { name: "到研读页记录事件" }).click();
  await expect(page.getByRole("heading", { name: "记录真实事件" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /绑定所选year节点/ })).toBeChecked();

  await fillMinuteEvent(page, {
    title: "上海节点分钟事件",
    localDateTime: "2026-08-01T12:30",
    timeZone: "Asia/Shanghai",
    feedback: "supports",
    tags: "事业"
  });
  await expect(page.getByText("UTC 偏移 +08:00")).toBeVisible();
  await expect(page.getByText("标准 UTC 2026-08-01T04:30:00Z")).toBeVisible();
  await page.getByRole("button", { name: "添加事件" }).click();
  await expect(page.getByText("事件已链接到当前案例、修订与运限节点。")).toBeVisible();
  const shanghaiCard = page.getByRole("article", { name: "事件 上海节点分钟事件" });
  await expect(shanghaiCard).toBeVisible();
  await expect(shanghaiCard).toContainText("UTC 2026-08-01T04:30:00Z");
  const shanghaiEventId = new URL(page.url()).searchParams.get("event");
  expect(shanghaiEventId).toMatch(/^[0-9a-f-]{36}$/);

  const backToNode = shanghaiCard.getByRole("link", { name: /返回绑定运限节点/ });
  await backToNode.click();
  await expect(page.getByRole("heading", { name: "所选节点" })).toBeVisible();
  const exactEventLink = page.getByRole("link", { name: "打开事件 上海节点分钟事件" });
  await expect(exactEventLink).toBeVisible();
  await expect(exactEventLink).toHaveAttribute("href", new RegExp(`event=${shanghaiEventId}`));
  await exactEventLink.click();
  await expect(shanghaiCard).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect(page.getByRole("article", { name: "事件 上海节点分钟事件" })).toBeFocused();
  const editShanghai = page.getByRole("article", { name: "事件 上海节点分钟事件" }).getByRole("button", { name: "编辑事件" });
  await editShanghai.click();
  await expect(page.getByLabel(/事件标题/)).toBeFocused();
  await page.getByRole("button", { name: "取消编辑" }).click();
  await expect(editShanghai).toBeFocused();

  await fillMinuteEvent(page, {
    title: "纽约 overlap earlier",
    localDateTime: "2025-11-02T01:30",
    timeZone: "America/New_York",
    feedback: "contradicts",
    tags: "DST"
  });
  await expect(page.getByText(/尚未选择 earlier \/ later/)).toBeVisible();
  await expect(page.getByRole("button", { name: "添加事件" })).toBeDisabled();
  await page.getByRole("radio", { name: /较早瞬时点/ }).check();
  await page.getByRole("button", { name: "添加事件" }).click();
  const earlierCard = page.getByRole("article", { name: "事件 纽约 overlap earlier" });
  await expect(earlierCard).toContainText("UTC 2025-11-02T05:30:00Z · earlier");

  await fillMinuteEvent(page, {
    title: "纽约 overlap later",
    localDateTime: "2025-11-02T01:45",
    timeZone: "America/New_York",
    feedback: "mixed",
    tags: "DST"
  });
  await page.getByRole("radio", { name: /较晚瞬时点/ }).check();
  await page.getByRole("button", { name: "添加事件" }).click();
  const laterCard = page.getByRole("article", { name: "事件 纽约 overlap later" });
  await expect(laterCard).toContainText("UTC 2025-11-02T06:45:00Z · later");

  await fillMinuteEvent(page, {
    title: "纽约 gap 不可保存",
    localDateTime: "2025-03-09T02:30",
    timeZone: "America/New_York"
  });
  await expect(page.getByText("起始时间落在 DST 空档")).toBeVisible();
  await expect(page.getByText(/不能保存，也不会自动平移/)).toBeVisible();
  await expect(page.getByRole("button", { name: "添加事件" })).toBeDisabled();
  await expect(page.getByRole("article", { name: "事件 纽约 gap 不可保存" })).toHaveCount(0);

  await page.getByLabel("搜索事件").fill("上海节点");
  await page.getByLabel("反馈筛选").selectOption("supports");
  await page.getByLabel("绑定范围").selectOption("current_node");
  await page.getByLabel("事件标签").selectOption("事业");
  await expect(page.getByText("显示 1 / 3 条事件")).toBeVisible();
  await expect(page.getByRole("article", { name: "事件 上海节点分钟事件" })).toBeVisible();
  await expect(earlierCard).toHaveCount(0);
  await page.getByRole("button", { name: "清空筛选" }).click();
  await expect(page.getByText("显示 3 / 3 条事件")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(page);
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
  const axe = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();
  expect(axe.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.flatMap((node) => node.target) }))).toEqual([]);
  expect(consoleProblems).toEqual([]);
});
