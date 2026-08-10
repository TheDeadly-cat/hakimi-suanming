import { readFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page
} from "@playwright/test";
import { preflightFullBackupFile } from "@hakimi/backup";
import {
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR
} from "../release-protocol";
import { pageReleaseEvidence } from "./cross-schema-upgrade-helpers";
import {
  clearAllLocalData,
  collectConsoleProblems,
  completeRestoreSafetyGate,
  disableNetworkCacheAndGoOffline,
  expectPortableData,
  expectPartitionCount,
  exportFullBackupZip,
  openDataManagement,
  portableFixture,
  preflightBackupZip,
  seedActiveRulePack,
  seedPortableData,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers";
import { seedMixedMigrationReceipts } from "./mixed-migration-receipt-helpers";

const EXACT_ALIAS = "连续闭环 · 精确案例";
const UNKNOWN_ALIAS = "连续闭环 · 时辰待考";
const COMPARISON_ALIASES = [
  "连续闭环 · 比较案例 B",
  "连续闭环 · 比较案例 C",
  "连续闭环 · 比较案例 D"
] as const;
const EVENT_TITLE = "连续闭环 · 事业节点复核";
const SAVED_VIEW_NAME = "连续闭环 · 事件检索";
const NOTE_BODY = "连续闭环 · 日柱证据仍需绑定可追溯原文。";
const NOTE_TAG = "证据链";
const KNOWLEDGE_FILE_NAME = "web-v1-evidence-chain.md";
const KNOWLEDGE_TITLE = "连续闭环 · 私有证据摘录";
const KNOWLEDGE_QUOTE = "日柱研究必须保留原文、版本与引用目标。";
const KNOWLEDGE_ANNOTATION = "用于证明研究笔记与精确原文之间的独立候选引用。";
const CHART_FIELD_QUOTE = "用户导入不等于公版核验。";
const CHART_FIELD_ANNOTATION = "绑定日柱干支字段，但仍保持用户候选与本机私有边界。";
const DAY_GANZHI_SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const EVIDENCE_SUBJECT_ANNOTATION = "提升主题级结构化链接覆盖，但不冒充双人核验或可分发来源。";
const KNOWLEDGE_CONTENT = [
  "# 连续闭环证据",
  KNOWLEDGE_QUOTE,
  "",
  "## 权利边界",
  "用户导入不等于公版核验。"
].join("\n");

const PARTITIONS = [
  ["cases", "命盘案例"],
  ["revisions", "命盘修订"],
  ["candidateSets", "未知时辰候选组"],
  ["researchNotes", "研究笔记"],
  ["events", "事件"],
  ["savedViews", "保存视图"],
  ["knowledgeDocuments", "用户文献"],
  ["citations", "结构化引用"],
  ["sourceRights", "来源权利记录"],
  ["researcherProfiles", "研究者资料"],
  ["appSettings", "应用设置"],
  ["attachments", "附件"],
  ["ruleRegistry", "规则包仓库"],
  ["tzdbMigrationReceipts", "候选组时区并列复算凭证"],
  ["eventTimeMigrationReceipts", "事件时间迁移凭证"],
  ["revisionCalculationReceipts", "Revision 计算收据"]
] as const;

const BASE_EXPECTED_COUNTS = {
  cases: 4,
  revisions: 7,
  candidateSets: 1,
  researchNotes: 1,
  events: 1,
  savedViews: 1,
  knowledgeDocuments: 1,
  citations: 3,
  sourceRights: 1,
  researcherProfiles: 0,
  appSettings: 0,
  attachments: 0,
  ruleRegistry: 0,
  tzdbMigrationReceipts: 0,
  eventTimeMigrationReceipts: 0,
  revisionCalculationReceipts: 0
} as const;

const ALL_NONEMPTY_V15_EXPECTED_COUNTS = {
  ...BASE_EXPECTED_COUNTS,
  candidateSets: 3,
  events: 3,
  researcherProfiles: 1,
  appSettings: 1,
  attachments: 1,
  ruleRegistry: 2,
  tzdbMigrationReceipts: 1,
  eventTimeMigrationReceipts: 1,
  revisionCalculationReceipts: BASE_EXPECTED_COUNTS.revisions
} as const;

function expectedCountsForSchema(schema: number) {
  return schema >= 15 ? ALL_NONEMPTY_V15_EXPECTED_COUNTS : BASE_EXPECTED_COUNTS;
}

function calculationComponentStatus(component: unknown): string {
  if (!component || typeof component !== "object" || !("status" in component)) {
    throw new Error("Revision 计算收据组件缺少状态");
  }
  const status = (component as { status: unknown }).status;
  if (typeof status !== "string") throw new Error("Revision 计算收据组件状态不是字符串");
  return status;
}

const CSV_HEADERS = [
  "案例名",
  "历法",
  "出生日期",
  "出生时间",
  "时间精度",
  "IANA时区",
  "性别",
  "闰月",
  "地点",
  "纬度",
  "经度",
  "地点精度",
  "标签",
  "来源备注"
] as const;

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvLine(values: readonly string[]): string {
  return values.map(csvCell).join(",");
}

function mixedCaseCsv(): Buffer {
  const exact = [
    EXACT_ALIAS,
    "公历",
    "1995-08-18",
    "14:30",
    "精确到分钟",
    "Asia/Shanghai",
    "男",
    "否",
    "上海",
    "31.2304",
    "121.4737",
    "坐标",
    "连续闭环|CSV",
    "连续 Web v1 验收"
  ];
  const unknown = [
    UNKNOWN_ALIAS,
    "公历",
    "2001-02-03",
    "",
    "未知时辰",
    "Asia/Shanghai",
    "未指定",
    "否",
    "成都",
    "",
    "",
    "城市",
    "连续闭环|时辰待考",
    "只保留 unknown_hour，不指定主盘"
  ];
  const comparisonRows = [
    [
      COMPARISON_ALIASES[0],
      "公历",
      "1988-06-12",
      "06:45",
      "精确到分钟",
      "Asia/Shanghai",
      "女",
      "否",
      "北京",
      "39.9042",
      "116.4074",
      "坐标",
      "连续闭环|四盘对照",
      "正式四盘对照 B"
    ],
    [
      COMPARISON_ALIASES[1],
      "公历",
      "1992-11-07",
      "21:10",
      "精确到分钟",
      "Asia/Shanghai",
      "男",
      "否",
      "广州",
      "23.1291",
      "113.2644",
      "坐标",
      "连续闭环|四盘对照",
      "正式四盘对照 C"
    ],
    [
      COMPARISON_ALIASES[2],
      "公历",
      "2000-01-15",
      "10:05",
      "精确到分钟",
      "Asia/Shanghai",
      "女",
      "否",
      "杭州",
      "30.2741",
      "120.1551",
      "坐标",
      "连续闭环|四盘对照",
      "正式四盘对照 D"
    ]
  ];
  const invalid = [
    "连续闭环-错误时区",
    "公历",
    "1994-04-05",
    "08:20",
    "精确到分钟",
    "China/Nowhere",
    "女",
    "否",
    "南京",
    "32.0603",
    "118.7969",
    "坐标",
    "连续闭环|错误样本",
    "此行应被预检拒绝，且不阻断其他记录"
  ];
  const duplicate = [
    "连续闭环-重复输入",
    ...exact.slice(1, 12),
    "连续闭环|重复样本",
    "出生输入与首条相同，应在预检中跳过"
  ];
  return Buffer.from(
    `\ufeff${[CSV_HEADERS, exact, unknown, ...comparisonRows, invalid, duplicate].map(csvLine).join("\r\n")}`,
    "utf8"
  );
}

function exactRevisionRoute(url: string): { caseId: string; revisionId: string; pathname: string } {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/cases\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i);
  if (!match) throw new Error(`命盘修订 URL 不符合精确路由契约：${url}`);
  return { caseId: match[1], revisionId: match[2], pathname: parsed.pathname };
}

type FormalComparisonItem = ReturnType<typeof exactRevisionRoute> & {
  alias: string;
  revisionNumber: number;
};

function exactComparisonItems(url: string): string[] {
  return new URL(url).searchParams.getAll("item");
}

async function expectFourChartProjection(page: Page, items: readonly FormalComparisonItem[]): Promise<string> {
  await expect(page.getByRole("heading", { name: "正式命盘对照台" })).toBeVisible();
  await expect(page.getByText("4 盘 · A 基准", { exact: true })).toBeVisible();

  const matrix = page.getByRole("region", { name: "正式命盘字段对照表" });
  await expect(matrix).toBeVisible();
  await expect(matrix.getByRole("columnheader")).toHaveCount(5);
  const rows = matrix.locator("tbody tr[data-field-id]");
  await expect(rows).toHaveCount(96);
  expect(await rows.evaluateAll((elements) => elements.every((row) => row.querySelectorAll("td").length === 4)))
    .toBe(true);
  for (const [index, item] of items.entries()) {
    await expect(matrix.getByRole("columnheader").nth(index + 1)).toContainText(item.alias);
  }

  const transit = page.getByRole("region", { name: "同一瞬时点六层运限对照" });
  await expect(transit).toBeVisible();
  await expect(transit.locator("tbody tr[data-field-id]")).toHaveCount(7);
  expect(await transit.locator("tbody tr[data-field-id]").evaluateAll(
    (elements) => elements.every((row) => row.querySelectorAll("td").length === 4)
  )).toBe(true);

  const resultHash = await page.locator(".comparison-evidence-footer code").textContent();
  expect(resultHash).toMatch(/^[a-f0-9]{64}$/);
  return resultHash!;
}

async function createFourChartComparison(
  page: Page,
  items: readonly FormalComparisonItem[]
): Promise<{ path: string; resultHash: string }> {
  expect(items).toHaveLength(4);
  await page.goto("/compare", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  for (const [index, item] of items.entries()) {
    if (index > 0) await page.getByRole("button", { name: /^添加比较盘/ }).click();
    const slot = ["A", "B", "C", "D"][index];
    await page.getByRole("combobox", { name: `对照位 ${slot} 案例` }).selectOption(item.caseId);
    const revisionSelect = page.getByRole("combobox", { name: `对照位 ${slot} 修订` });
    await expect(revisionSelect).toBeEnabled();
    if (await revisionSelect.inputValue() !== item.revisionId) await revisionSelect.selectOption(item.revisionId);
    await expect(revisionSelect).toHaveValue(item.revisionId);
  }

  const initialResultHash = await expectFourChartProjection(page, items);
  for (const [index, item] of items.entries()) {
    const slot = ["A", "B", "C", "D"][index];
    await expect(page.getByRole("link", {
      name: `研读对照位 ${slot}：${item.alias} · Revision ${item.revisionNumber}`
    })).toHaveAttribute("href", `${item.pathname}?view=research`);
  }
  await expect.poll(() => exactComparisonItems(page.url())).toEqual(
    items.map((item) => `revision:${item.caseId}:${item.revisionId}`)
  );
  expect([...new URL(page.url()).searchParams.keys()]).toEqual(["item", "item", "item", "item", "at"]);
  for (const item of items) expect(page.url()).not.toContain(encodeURIComponent(item.alias));

  const matrix = page.getByRole("region", { name: "正式命盘字段对照表" });
  const allRowCount = await matrix.locator("tbody tr[data-field-id]").count();
  const differencesOnly = page.getByRole("checkbox", { name: "只看任一比较盘相对 A 变化的字段" });
  await differencesOnly.check();
  await expect.poll(() => matrix.locator("tbody tr[data-field-id]").count()).toBeLessThan(allRowCount);
  expect(await matrix.locator("tbody tr[data-field-id]").count()).toBeGreaterThan(0);
  expect(await matrix.locator("tbody tr[data-field-id]").evaluateAll(
    (elements) => elements.every((row) => row.classList.contains("is-different"))
  )).toBe(true);
  await differencesOnly.uncheck();
  await expect(matrix.locator("tbody tr[data-field-id]")).toHaveCount(allRowCount);

  await page.setViewportSize({ width: 1100, height: 844 });
  await expect(matrix).toHaveAttribute("data-difference-scope", "global");
  await expect(page.getByRole("group", { name: "选择当前比较盘" })).toBeHidden();
  await page.setViewportSize({ width: 1099, height: 844 });
  await expect(matrix).toHaveAttribute("data-difference-scope", "active_pair");
  await expect(page.getByRole("group", { name: "选择当前比较盘" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const switcher = page.getByRole("group", { name: "选择当前比较盘" });
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText(
    `A · ${items[0].alias} · R${items[0].revisionNumber} ↔ 当前 B · ${items[1].alias} · R${items[1].revisionNumber}`
  );
  const cButton = switcher.getByRole("button", { name: `C · ${items[2].alias}`, exact: true });
  await cButton.click();
  await expect(cButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("focus")).toBe("C");
  await expect(switcher).toContainText(
    `A · ${items[0].alias} · R${items[0].revisionNumber} ↔ 当前 C · ${items[2].alias} · R${items[2].revisionNumber}`
  );
  const compareLocationBeforeResearch = `${new URL(page.url()).pathname}${new URL(page.url()).search}${new URL(page.url()).hash}`;
  const currentResearchLink = switcher.getByRole("link", {
    name: `从当前身份区研读 C：${items[2].alias} · Revision ${items[2].revisionNumber}`
  });
  const baselineResearchLink = switcher.getByRole("link", {
    name: `从当前身份区研读 A：${items[0].alias} · Revision ${items[0].revisionNumber}`
  });
  await expect(currentResearchLink).toHaveAttribute("href", `${items[2].pathname}?view=research`);
  for (const researchLink of [baselineResearchLink, currentResearchLink]) {
    const box = await researchLink.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await currentResearchLink.click();
  await waitForAppReady(page);
  await expect.poll(() => {
    const url = new URL(page.url());
    return `${url.pathname}${url.search}${url.hash}`;
  }).toBe(`${items[2].pathname}?view=research`);
  await expect(page.getByRole("heading", { name: items[2].alias, exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "历史 Revision" })).toHaveValue(items[2].revisionId);
  await expect(page.getByRole("button", { name: "导出单盘 Markdown", exact: true })).toBeVisible();
  await page.goBack();
  await waitForAppReady(page);
  await expect.poll(() => {
    const url = new URL(page.url());
    return `${url.pathname}${url.search}${url.hash}`;
  }).toBe(compareLocationBeforeResearch);
  await expect(cButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator(".comparison-evidence-footer code").textContent()).toBe(initialResultHash);
  await expect(page.getByRole("heading", { name: /^A ↔ C：\d+ 个字段不同$/ })).toBeVisible();
  const sexRow = matrix.locator('[data-field-id="input.sex"]');
  await expect(sexRow.locator("th")).toContainText("相同");
  expect(await sexRow.locator(".comparison-cell-value:visible").allTextContents()).toEqual(["男", "男"]);
  const mobileDifferencesOnly = page.getByRole("checkbox", { name: "只看当前 A–C 变化的字段" });
  await mobileDifferencesOnly.check();
  await expect(sexRow).toHaveCount(0);
  await mobileDifferencesOnly.uncheck();
  await expect(matrix.locator('[data-field-id="input.sex"]')).toHaveCount(1);
  expect(await page.locator(".comparison-evidence-footer code").textContent()).toBe(initialResultHash);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(cButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("focus")).toBe("C");
  await expect(matrix).toHaveAttribute("data-difference-scope", "active_pair");
  expect(await matrix.locator("table").evaluate((element) => getComputedStyle(element).display)).toBe("table");
  expect(await matrix.locator("thead").evaluate((element) => getComputedStyle(element).display)).toBe("table-header-group");
  expect(await matrix.locator("tbody").first().evaluate((element) => getComputedStyle(element).display)).toBe("table-row-group");
  expect(await matrix.locator("tbody tr[data-field-id]").first().evaluate((element) => getComputedStyle(element).display)).toBe("table-row");
  expect(await matrix.locator("tbody tr[data-field-id] th").first().evaluate((element) => getComputedStyle(element).display)).toBe("table-cell");
  expect(await matrix.locator("tbody tr[data-field-id] td").first().evaluate((element) => getComputedStyle(element).display)).toBe("table-cell");
  const visibleColumnFill = await matrix.locator("tbody tr[data-field-id]").first().evaluate((row) => {
    const table = row.closest("table");
    const visibleWidth = [...row.children]
      .filter((cell) => getComputedStyle(cell).display !== "none")
      .reduce((total, cell) => total + cell.getBoundingClientRect().width, 0);
    return { tableWidth: table?.getBoundingClientRect().width ?? 0, visibleWidth };
  });
  expect(Math.abs(visibleColumnFill.tableWidth - visibleColumnFill.visibleWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => matrix.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  expect(await matrix.locator("tbody td:visible").evaluateAll((cells) => cells.flatMap((cell) => {
    const headers = cell.getAttribute("headers")?.split(/\s+/).filter(Boolean) ?? [];
    return headers.filter((id) => {
      const header = cell.ownerDocument.getElementById(id);
      return !header || getComputedStyle(header).display === "none";
    }).map((id) => `${cell.parentElement?.getAttribute("data-field-id") ?? "unknown"}:${id}`);
  }))).toEqual([]);
  await expect(matrix.locator("tbody")).toHaveCount(6);
  await expect(matrix.locator('[data-field-id="input.sex"] td').nth(2)).toHaveAttribute(
    "headers",
    /formal-comparison-section-input formal-comparison-row-input\.sex formal-comparison-column-2/
  );
  await matrix.locator("tbody tr[data-field-id]").last().scrollIntoViewIfNeeded();
  expect(await switcher.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
  const switcherTop = await switcher.evaluate((element) => element.getBoundingClientRect().top);
  expect(switcherTop).toBeGreaterThanOrEqual(56);
  expect(switcherTop).toBeLessThanOrEqual(59);
  const dButton = switcher.getByRole("button", { name: `D · ${items[3].alias}`, exact: true });
  await cButton.focus();
  await page.keyboard.press("Tab");
  await expect(dButton).toBeFocused();
  await dButton.click();
  await expect(dButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("focus")).toBe("D");
  await expect(matrix.locator('[data-field-id="input.sex"] th')).toContainText("变化");
  await expect(matrix.getByRole("columnheader").filter({ hasText: items[0].alias })).toBeVisible();
  await expect(matrix.getByRole("columnheader").filter({ hasText: items[3].alias })).toBeVisible();
  await expect(matrix.getByRole("columnheader").filter({ hasText: items[1].alias })).toBeHidden();
  const mobileAccessibility = await new AxeBuilder({ page })
    .include(".formal-comparison-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(mobileAccessibility.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target).slice(0, 8)
  })), "安卓宽度正式四盘存在 WCAG A/AA 自动审计错误").toEqual([]);
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
  await expect.poll(() => matrix.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);

  const pillarDifferenceLink = page.getByRole("link", { name: /四柱/ });
  await pillarDifferenceLink.click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#compare-section-pillar_fact");
  const historyLengthAtPillar = await page.evaluate(() => window.history.length);
  await pillarDifferenceLink.click();
  expect(await page.evaluate(() => window.history.length)).toBe(historyLengthAtPillar);
  const pillarSection = matrix.locator("#compare-section-pillar_fact");
  await expect(pillarSection).toBeInViewport();
  const anchorGeometry = await page.evaluate(() => {
    const target = document.querySelector("#compare-section-pillar_fact")!.getBoundingClientRect();
    const sticky = document.querySelector(".comparison-mobile-switcher")!.getBoundingClientRect();
    return { targetTop: target.top, stickyBottom: sticky.bottom };
  });
  expect(anchorGeometry.targetTop).toBeGreaterThanOrEqual(anchorGeometry.stickyBottom - 1);
  if (process.env.HAKIMI_QA_SCREENSHOT_DIR) {
    await page.screenshot({
      path: path.join(
        process.env.HAKIMI_QA_SCREENSHOT_DIR,
        `formal-comparison-mobile-${test.info().project.name}.png`
      ),
      fullPage: false
    });
  }

  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ forcedColors: "active" });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
  expect(await dButton.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  const forcedColorsAccessibility = await new AxeBuilder({ page })
    .include(".formal-comparison-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(forcedColorsAccessibility.violations.map((violation) => violation.id), "320px 强制色彩四盘存在 WCAG A/AA 错误").toEqual([]);
  await page.emulateMedia({ forcedColors: "none" });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByLabel(/^目标瞬时点（UTC）/).fill("2030-01-02T03:04");
  await page.getByRole("button", { name: "同步运限", exact: true }).click();
  await expect(page.getByText("2030-01-02T03:04:00.000Z", { exact: true })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("at")).toBe("2030-01-02T03:04:00.000Z");
  await expect.poll(() => page.locator(".comparison-evidence-footer code").textContent())
    .not.toBe(initialResultHash);
  await expect.poll(() => new URL(page.url()).hash).toBe("#compare-section-pillar_fact");
  const transit = page.getByRole("region", { name: "同一瞬时点六层运限对照" });
  await expect(transit.locator('[data-field-id="transit.day"] td:visible')).toHaveCount(2);
  await expect(transit.getByRole("columnheader").filter({ hasText: items[3].alias })).toBeVisible();
  await expect(transit.getByRole("columnheader").filter({ hasText: items[1].alias })).toBeHidden();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
  await expect.poll(() => transit.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);

  const canonicalPath = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
  const resultHash = await page.locator(".comparison-evidence-footer code").textContent();
  expect(resultHash).toMatch(/^[a-f0-9]{64}$/);
  await page.setViewportSize({ width: 1280, height: 720 });
  return { path: canonicalPath, resultHash: resultHash! };
}

async function verifyTransitViewControls(
  page: Page,
  item: FormalComparisonItem
): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto(`${item.pathname}?view=transit&at=2030-01-02T03%3A04%3A00Z`, {
    waitUntil: "domcontentloaded"
  });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "同一瞬时点的六层运限切片" })).toBeVisible();
  const controls = page.locator(".transit-view-controls");
  const tracks = page.getByRole("region", { name: "六层运限时间线" });
  await expect(controls).toHaveAttribute("data-snapshot-hash", /^[a-f0-9]{64}$/);
  await expect(tracks.getByRole("list")).toHaveCount(6);
  if (process.env.HAKIMI_QA_SCREENSHOT_DIR) {
    await controls.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(
        process.env.HAKIMI_QA_SCREENSHOT_DIR,
        `transit-view-controls-desktop-${test.info().project.name}.png`
      ),
      fullPage: false
    });
  }

  const hourTrack = tracks.getByRole("list", { name: "流时节点" });
  await hourTrack.getByRole("button").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("node")?.startsWith("hour:"))
    .toBe(true);
  await expect(page.locator(".transit-loading")).toHaveCount(0);
  const selectedNode = new URL(page.url()).searchParams.get("node");
  const selectedNodeLocation = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
  const selectedSnapshotHash = await controls.getAttribute("data-snapshot-hash");
  expect(selectedSnapshotHash).toMatch(/^[a-f0-9]{64}$/);

  await page.getByRole("button", { name: /^日尺度/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("scale")).toBe("day");
  expect(new URL(page.url()).searchParams.getAll("track")).toEqual([]);
  expect(new URL(page.url()).searchParams.get("node")).toBe(selectedNode);
  await expect(controls).toHaveAttribute("data-snapshot-hash", selectedSnapshotHash!);
  await expect(tracks.getByRole("list")).toHaveCount(2);
  await expect(tracks.getByRole("list", { name: "流月节点" })).toBeVisible();
  await expect(tracks.getByRole("list", { name: "流日节点" })).toBeVisible();
  await expect(tracks.getByRole("list", { name: "流时节点" })).toHaveCount(0);
  await expect(page.getByText("所选流时节点仍保留", { exact: true })).toBeVisible();

  const dayScaleLocation = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect.poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`)
    .toBe(dayScaleLocation);
  await expect(controls).toHaveAttribute("data-snapshot-hash", selectedSnapshotHash!);
  await expect(page.getByRole("button", { name: /^日尺度/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("所选流时节点仍保留", { exact: true })).toBeVisible();

  const historyLengthBeforeFilter = await page.evaluate(() => window.history.length);
  await page.getByRole("checkbox", { name: /^流月/ }).uncheck();
  await expect.poll(() => new URL(page.url()).searchParams.getAll("track")).toEqual(["day"]);
  expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBeforeFilter);
  expect(new URL(page.url()).searchParams.get("node")).toBe(selectedNode);
  await expect(controls).toHaveAttribute("data-snapshot-hash", selectedSnapshotHash!);
  const filteredLocation = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;

  await page.goBack();
  await waitForAppReady(page);
  await expect.poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`)
    .toBe(selectedNodeLocation);
  await expect(page.getByRole("button", { name: /^全景/ })).toHaveAttribute("aria-pressed", "true");
  await expect(tracks.getByRole("list")).toHaveCount(6);
  await expect(page.getByText("所选流时节点仍保留", { exact: true })).toHaveCount(0);

  await page.goForward();
  await waitForAppReady(page);
  await expect.poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`)
    .toBe(filteredLocation);
  await expect(page.getByRole("checkbox", { name: /^流月/ })).not.toBeChecked();
  await expect(tracks.getByRole("list")).toHaveCount(1);
  await expect(page.getByText("所选流时节点仍保留", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
    for (const locator of [
      controls.locator(".transit-scale-control button"),
      controls.locator(".transit-track-filter label")
    ]) {
      const boxes = await locator.evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }));
      expect(boxes.length).toBeGreaterThan(0);
      expect(boxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
    }
  }

  const mobileAccessibility = await new AxeBuilder({ page })
    .include(".transit-workbench")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(mobileAccessibility.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target).slice(0, 8)
  })), "320px 运限视图控件存在 WCAG A/AA 自动审计错误").toEqual([]);
  if (process.env.HAKIMI_QA_SCREENSHOT_DIR) {
    await controls.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(
        process.env.HAKIMI_QA_SCREENSHOT_DIR,
        `transit-view-controls-mobile-${test.info().project.name}.png`
      ),
      fullPage: false
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

type SameCaseComparisonItem = FormalComparisonItem;

async function expectSameCaseRevisionOrder(
  page: Page,
  items: readonly SameCaseComparisonItem[]
): Promise<string> {
  const resultHash = await expectFourChartProjection(page, items);
  const headers = page.getByRole("region", { name: "正式命盘字段对照表" }).getByRole("columnheader");
  for (const [index, item] of items.entries()) {
    await expect(headers.nth(index + 1)).toContainText(`Revision ${item.revisionNumber}`);
  }
  return resultHash;
}

async function createSameCaseFourRevisionComparison(
  page: Page,
  items: readonly SameCaseComparisonItem[]
): Promise<{ path: string; resultHash: string; orderedItems: SameCaseComparisonItem[] }> {
  expect(items).toHaveLength(4);
  expect(new Set(items.map((item) => item.caseId)).size).toBe(1);
  expect(new Set(items.map((item) => item.revisionId)).size).toBe(4);

  await page.goto("/compare", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  for (const [index, item] of items.entries()) {
    if (index > 0) await page.getByRole("button", { name: /^添加比较盘/ }).click();
    const slot = ["A", "B", "C", "D"][index];
    await page.getByRole("combobox", { name: `对照位 ${slot} 案例` }).selectOption(item.caseId);
    const revisionSelect = page.getByRole("combobox", { name: `对照位 ${slot} 修订` });
    await expect(revisionSelect).toBeEnabled();
    if (await revisionSelect.inputValue() !== item.revisionId) await revisionSelect.selectOption(item.revisionId);
    await expect(revisionSelect).toHaveValue(item.revisionId);
  }

  await expectSameCaseRevisionOrder(page, items);
  await page.getByLabel(/^目标瞬时点（UTC）/).fill("2031-05-06T07:08");
  await page.getByRole("button", { name: "同步运限", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("at")).toBe("2031-05-06T07:08:00.000Z");
  const beforeReorderHash = await page.locator(".comparison-evidence-footer code").textContent();
  expect(beforeReorderHash).toMatch(/^[a-f0-9]{64}$/);

  const cards = page.getByRole("group", { name: "正式命盘对照位" }).locator("article.comparison-slot-card");
  await cards.nth(2).getByRole("button", { name: "设为 A 基准", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已将所选修订设为 A 基准盘" })).toBeVisible();
  const orderedItems = [items[2], items[0], items[1], items[3]];
  await expect.poll(() => exactComparisonItems(page.url())).toEqual(
    orderedItems.map((item) => `revision:${item.caseId}:${item.revisionId}`)
  );
  const resultHash = await expectSameCaseRevisionOrder(page, orderedItems);
  expect(resultHash).not.toBe(beforeReorderHash);
  expect([...new URL(page.url()).searchParams.keys()]).toEqual(["item", "item", "item", "item", "at"]);
  expect(new URL(page.url()).searchParams.get("at")).toBe("2031-05-06T07:08:00.000Z");

  const path = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(path);
  expect(await expectSameCaseRevisionOrder(page, orderedItems)).toBe(resultHash);
  expect(exactComparisonItems(page.url())).toEqual(
    orderedItems.map((item) => `revision:${item.caseId}:${item.revisionId}`)
  );
  return { path, resultHash, orderedItems };
}

async function expectMalformedFormalComparisonFailsClosed(page: Page, item: FormalComparisonItem) {
  const requestedPath = `/compare?item=${encodeURIComponent(`revision:${item.caseId}:${item.revisionId}`)}` +
    "&item=broken&at=2031-05-06T07%3A08%3A00.000Z";
  await page.goto(requestedPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("alert")).toContainText("第 2 个 item 不是确切");
  await expect(page.getByRole("region", { name: "正式命盘字段对照表" })).toHaveCount(0);
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(requestedPath);
}

function collectUnexpectedExternalRequests(context: BrowserContext, baseURL: string): string[] {
  const localOrigin = new URL(baseURL).origin;
  const unexpected: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== localOrigin) {
      unexpected.push(url.href);
    }
  });
  return unexpected;
}

async function expectPartitionCounts(
  page: Page,
  counts: Readonly<Record<(typeof PARTITIONS)[number][0], number>>
) {
  for (const [key, label] of PARTITIONS) await expectPartitionCount(page, label, counts[key]);
}

async function importMixedCsv(page: Page) {
  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "选择 CSV", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "web-v1-continuous-flow.csv",
    mimeType: "text/csv",
    buffer: mixedCaseCsv()
  });
  await expect(page.getByText("web-v1-continuous-flow.csv", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "按此映射预检", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "预检完成：7 行中，5 行通过格式校验" })).toBeVisible();
  const stats = page.getByRole("group", { name: "CSV 预检统计" });
  await expect(stats).toContainText("精确时间可写入");
  await expect(stats).toContainText("未知时辰候选组");
  await expect(stats.getByText("格式错误", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
  await expect(stats.getByText("重复跳过", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
  const problems = page.getByText("查看错误与重复行（2）", { exact: true }).locator("..");
  await expect(problems).toContainText("[INVALID_TIME_ZONE]");
  await expect(problems).toContainText("与 CSV 中较早的记录重复");
  await page.getByRole("button", { name: "导入 5 条记录", exact: true }).click();
  await expect(page.getByRole("status").filter({
    hasText: "本轮完成：成功写入 5 行，提交时跳过重复 0 行，失败 0 行"
  })).toBeVisible();
  const caseTable = page.locator("table.case-table");
  await expect(caseTable.getByRole("row").filter({ hasText: EXACT_ALIAS })).toContainText("正式命盘");
  await expect(caseTable.getByRole("row").filter({ hasText: UNKNOWN_ALIAS })).toContainText("13 个候选");
  for (const alias of COMPARISON_ALIASES) {
    await expect(caseTable.getByRole("row").filter({ hasText: alias })).toContainText("正式命盘");
  }
}

async function deriveRevision(
  page: Page,
  href: string,
  options: { civilTime: string; dayBoundary: "zi_start_23" | "midnight" }
): Promise<ReturnType<typeof exactRevisionRoute>> {
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("link", { name: "由此修订派生新版", exact: true }).click();
  await expect(page.getByRole("heading", { name: "由历史修订派生新版" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "录入出生资料" })).toBeVisible();
  await page.getByLabel(/^民用时间/).fill(options.civilTime);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "确认时间基准与换日规则" })).toBeVisible();
  await page.getByRole("radio", {
    name: options.dayBoundary === "midnight" ? /00:00 午夜换日/ : /23:00 子初换日/
  }).check();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("heading", { name: "检查、生成并保存" })).toBeVisible();
  await page.getByRole("button", { name: "生成命盘", exact: true }).click();
  await expect(page.getByRole("heading", { name: "四柱候选结果" })).toBeVisible();
  await page.getByRole("button", { name: "保存为新修订并打开", exact: true }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/i);
  await waitForAppReady(page);
  return exactRevisionRoute(page.url());
}

async function trashAndRestoreExactCase(page: Page) {
  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const caseTable = page.locator("table.case-table");
  let row = caseTable.getByRole("row").filter({ hasText: EXACT_ALIAS });
  await row.getByRole("button", { name: `移入回收站案例 ${EXACT_ALIAS}`, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: `已将案例“${EXACT_ALIAS}”移入回收站` })).toBeVisible();
  await page.getByRole("button", { name: "回收站", exact: true }).click();
  row = caseTable.getByRole("row").filter({ hasText: EXACT_ALIAS });
  await expect(row).toContainText("回收站");
  await row.getByRole("button", { name: `恢复案例 ${EXACT_ALIAS}`, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: `已恢复案例“${EXACT_ALIAS}”` })).toBeVisible();
  await page.getByRole("button", { name: "全部", exact: true }).click();
  await expect(caseTable.getByRole("row").filter({ hasText: EXACT_ALIAS })).toContainText("4 次修订");
}

async function createRevisionEvent(page: Page, researchPath: string): Promise<string> {
  await page.goto(researchPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("button", { name: "导出单盘 Markdown", exact: true })).toBeVisible();
  const editor = page.locator("section.research-editor-section").filter({
    has: page.getByRole("heading", { name: "记录真实事件" })
  });
  await expect(editor).toHaveCount(1);
  await editor.getByLabel(/事件标题/).fill(EVENT_TITLE);
  await editor.getByLabel("起始日期", { exact: true }).fill("2024-02-04");
  await editor.getByLabel("标签", { exact: true }).fill("事业,连续闭环");
  await editor.getByLabel("来源引用", { exact: true }).fill("当事人复盘");
  await editor.getByLabel("事件笔记", { exact: true }).fill("仅记录真实事件，用于检索与恢复核对。");
  await editor.getByRole("button", { name: "添加事件", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "事件已链接到当前案例与修订" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("event")).toMatch(/^[0-9a-f-]{36}$/i);
  const eventId = new URL(page.url()).searchParams.get("event");
  if (!eventId) throw new Error("事件保存后没有生成精确 event 深链");
  await expect(page.locator(`[data-event-id="${eventId}"]`)).toContainText(EVENT_TITLE);
  return eventId;
}

async function createResearchEvidenceChain(page: Page, researchPath: string): Promise<{
  noteId: string;
  documentId: string;
  noteCitationId: string;
  chartCitationId: string;
  subjectCitationId: string;
}> {
  await page.goto(researchPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  const noteEditor = page.locator("section.research-editor-section").filter({
    has: page.getByRole("heading", { name: "添加可检索研究笔记" })
  });
  await noteEditor.getByLabel("Markdown 笔记", { exact: false }).fill(NOTE_BODY);
  await noteEditor.getByLabel("标签", { exact: true }).fill(NOTE_TAG);
  await noteEditor.getByRole("button", { name: "保存笔记", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "研究笔记已保存到本地案例" })).toBeVisible();

  const noteCard = page.locator(".journal-list article").filter({ hasText: NOTE_BODY });
  await expect(noteCard).toHaveCount(1);
  const citationEntry = noteCard.getByRole("link", { name: "为笔记添加知识引用", exact: true });
  const citationEntryHref = await citationEntry.getAttribute("href");
  if (!citationEntryHref) throw new Error("研究笔记没有生成知识引用入口");
  const noteId = new URL(citationEntryHref, page.url()).searchParams.get("note");
  if (!noteId || !/^[0-9a-f-]{36}$/i.test(noteId)) throw new Error("研究笔记引用入口缺少精确 note UUID");
  await citationEntry.click();
  await page.waitForURL(/\/knowledge\?.*target=research_note.*note=[0-9a-f-]{36}/i);
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "个人典籍与引用" })).toBeVisible();
  await expect(page.getByText(/正在为研究笔记/)).toBeVisible();

  await page.getByRole("button", { name: "导入资料", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "选择资料文件", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: KNOWLEDGE_FILE_NAME,
    mimeType: "text/markdown",
    buffer: Buffer.from(KNOWLEDGE_CONTENT, "utf8")
  });
  await expect(page.getByText(/Markdown · .* · 5 行 · 2 个标题/)).toBeVisible();
  await page.getByLabel("资料标题", { exact: false }).fill(KNOWLEDGE_TITLE);
  await page.getByLabel("作者", { exact: true }).fill("连续闭环研究者");
  await page.getByLabel("版本 / 版次", { exact: true }).fill("本机研究摘录 v1");
  await page.getByLabel("来源备注", { exact: true }).fill("仅用于本机研究闭环验收");
  await page.getByLabel("出版者", { exact: true }).fill("个人整理");
  await page.getByLabel("出版年份", { exact: true }).fill("2026");
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("document")).toMatch(/^[0-9a-f-]{36}$/i);
  const documentId = new URL(page.url()).searchParams.get("document");
  if (!documentId) throw new Error("资料导入后没有生成精确 document UUID");
  await expect(page.getByRole("heading", { name: KNOWLEDGE_TITLE })).toBeVisible();

  await page.getByRole("button", { name: "引用第 2 行", exact: true }).click();
  await page.getByLabel("批注（可选）", { exact: true }).fill(KNOWLEDGE_ANNOTATION);
  await page.getByRole("button", { name: "建立候选引用", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("citation")).toMatch(/^[0-9a-f-]{36}$/i);
  const noteCitationId = new URL(page.url()).searchParams.get("citation");
  if (!noteCitationId) throw new Error("研究笔记候选引用建立后没有生成精确 citation UUID");
  await expect(page.getByRole("heading", { name: "1 条引用" })).toBeVisible();
  await expect(page.getByRole("blockquote").filter({ hasText: KNOWLEDGE_QUOTE })).toBeVisible();

  await page.getByRole("link", { name: "来源台账", exact: true }).click();
  await waitForAppReady(page);
  const rightsRecord = page.locator(".rights-record-list article").filter({ hasText: KNOWLEDGE_TITLE });
  await expect(rightsRecord).toHaveCount(1);
  await expect(rightsRecord).toContainText("用户提供 · 未核验");
  await expect(rightsRecord).toContainText("仅本机私有研究");
  await expect(rightsRecord).toContainText("未复核");
  await expect(rightsRecord).toContainText("个人整理 · 2026");

  await page.goto(researchPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const linkedNote = page.locator(".journal-list article").filter({ hasText: NOTE_BODY });
  await expect(linkedNote).toContainText("知识引用 · 1");
  await expect(linkedNote.getByRole("blockquote")).toContainText(KNOWLEDGE_QUOTE);

  const chartPath = new URL(researchPath, "https://hakimi.local").pathname;
  await page.goto(chartPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("button", { name: /^日柱天干：/ }).click();
  let evidencePanel = page.locator(".evidence-panel.is-open");
  await expect(evidencePanel).toContainText("pillars.day.ganZhi");
  await evidencePanel.getByRole("link", { name: "去知识库添加来源", exact: true }).click();
  await page.waitForURL((url) => (
    url.pathname === "/knowledge"
    && url.searchParams.get("target") === "chart_field"
    && url.searchParams.get("case") !== null
    && url.searchParams.get("revision") !== null
    && url.searchParams.get("field") === "pillars.day.ganZhi"
  ));
  await waitForAppReady(page);

  const documentLink = page.locator(".knowledge-index nav a").filter({ hasText: KNOWLEDGE_TITLE });
  await expect(documentLink).toHaveCount(1);
  await documentLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("document")).toBe(documentId);
  await page.locator(".knowledge-section-nav").getByRole("link", { name: "权利边界", exact: true }).click();
  await page.getByRole("button", { name: "引用第 5 行", exact: true }).click();
  await page.getByLabel("批注（可选）", { exact: true }).fill(CHART_FIELD_ANNOTATION);
  await page.getByRole("button", { name: "建立候选引用", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("citation")).toMatch(/^[0-9a-f-]{36}$/i);
  const chartCitationId = new URL(page.url()).searchParams.get("citation");
  if (!chartCitationId) throw new Error("命盘字段候选引用建立后没有生成精确 citation UUID");
  expect(chartCitationId).not.toBe(noteCitationId);
  await expect(page.getByRole("heading", { name: "2 条引用" })).toBeVisible();

  await page.getByRole("link", { name: "返回当前命盘", exact: true }).click();
  await page.waitForURL((url) => url.pathname === chartPath);
  await waitForAppReady(page);
  await page.getByRole("button", { name: /^日柱天干：/ }).click();
  evidencePanel = page.locator(".evidence-panel.is-open");
  await expect(evidencePanel.getByRole("blockquote")).toContainText(CHART_FIELD_QUOTE);

  await expectCandidateOnlyCoverage(page, 0);
  const subjectRow = page.locator(".coverage-row-list article").filter({ hasText: DAY_GANZHI_SUBJECT_ID });
  await expect(subjectRow).toHaveCount(1);
  await subjectRow.getByRole("link", { name: "去资料库添加主题来源", exact: true }).click();
  await page.waitForURL((url) => (
    url.pathname === "/knowledge"
    && url.searchParams.get("target") === "evidence_subject"
    && url.searchParams.get("subject") === DAY_GANZHI_SUBJECT_ID
  ));
  await waitForAppReady(page);
  const subjectDocumentLink = page.locator(".knowledge-index nav a").filter({ hasText: KNOWLEDGE_TITLE });
  await expect(subjectDocumentLink).toHaveCount(1);
  await subjectDocumentLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("document")).toBe(documentId);
  await page.getByRole("button", { name: "引用第 2 行", exact: true }).click();
  await page.getByLabel("批注（可选）", { exact: true }).fill(EVIDENCE_SUBJECT_ANNOTATION);
  await page.getByRole("button", { name: "建立候选引用", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("citation")).toMatch(/^[0-9a-f-]{36}$/i);
  const subjectCitationId = new URL(page.url()).searchParams.get("citation");
  if (!subjectCitationId) throw new Error("证据主题候选引用建立后没有生成精确 citation UUID");
  expect(new Set([noteCitationId, chartCitationId, subjectCitationId]).size).toBe(3);
  await expect(page.getByRole("heading", { name: "3 条引用" })).toBeVisible();

  await expectCandidateOnlyCoverage(page, 1);

  return { noteId, documentId, noteCitationId, chartCitationId, subjectCitationId };
}

async function expectCandidateOnlyCoverage(page: Page, structuredLinkCount: 0 | 1) {
  await page.goto("/knowledge?view=coverage", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { name: "依据覆盖审计" })).toBeVisible();
  const coverage = page.getByRole("group", { name: "依据覆盖率" });
  await expect(coverage).toContainText(`结构化链接 · ${structuredLinkCount}/36`);
  await expect(coverage).toContainText("双人核验 · 0/36");
  await expect(coverage).toContainText("可分发来源 · 0/36");
}

async function saveEventResearchQuery(page: Page, eventId: string): Promise<string> {
  const eventCard = page.locator(`[data-event-id="${eventId}"]`);
  await expect(eventCard).toHaveCount(1);
  await eventCard.getByRole("button", { name: `按此事件条件检索：${EVENT_TITLE}`, exact: true }).click();
  await page.waitForURL(/\/cases\/research\?draft=[0-9a-f-]{36}$/i);
  expect([...new URL(page.url()).searchParams.keys()]).toEqual(["draft"]);
  await expect(page.getByRole("heading", { name: "真实事件 · 1 条结果" })).toBeVisible();
  await expect(page.getByRole("article", { name: `研究结果 ${EVENT_TITLE}` })).toBeVisible();
  if (process.env.HAKIMI_QA_SCREENSHOT_DIR) {
    await page.screenshot({
      path: path.join(
        process.env.HAKIMI_QA_SCREENSHOT_DIR,
        `event-to-research-query-${test.info().project.name}.png`
      ),
      fullPage: false
    });
  }
  await page.getByLabel("视图名称", { exact: true }).fill(SAVED_VIEW_NAME);
  await page.getByRole("button", { name: "保存当前查询", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?view=[0-9a-f-]{36}$/i);
  await expect(page.getByRole("status").filter({ hasText: `已保存视图“${SAVED_VIEW_NAME}”` })).toBeVisible();
  const savedViewId = new URL(page.url()).searchParams.get("view");
  if (!savedViewId) throw new Error("保存研究查询后没有生成 view UUID");
  return savedViewId;
}

async function verifyBaselineReceiptResearchQuery(page: Page, releaseSchema: number): Promise<void> {
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByRole("searchbox", { name: /检索别名、标签与研究正文/ }).fill(EXACT_ALIAS);
  await page.getByRole("group", { name: "确定性干支关系" })
    .getByLabel("地支六冲", { exact: true })
    .check();
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await page.waitForURL(/\/cases\/research\?draft=[0-9a-f-]{36}$/i);
  await expect(page.getByRole("heading", { name: "正式命盘 · 1 条结果" })).toBeVisible();

  const result = page.getByRole("article", { name: `研究结果 ${EXACT_ALIAS}` });
  const storedReceiptExpected = releaseSchema >= 15;
  const sourceLabel = storedReceiptExpected ? "已保存计算收据" : "当前版本即时投影";
  const source = result.getByLabel(`计算来源：${sourceLabel}`);
  await expect(source).toContainText(storedReceiptExpected ? "stored_receipt" : "explicit_projection");
  const sourceSummary = page.locator(".research-calculation-source-summary");
  await expect(sourceSummary).toContainText(
    storedReceiptExpected
      ? "已保存收据 1 · 当前即时投影 0"
      : "已保存收据 0 · 当前即时投影 1"
  );
  await expect(sourceSummary).toContainText(
    storedReceiptExpected ? "下游计算来源" : "其中 1 条所在发布代无收据账本"
  );
  if (storedReceiptExpected) {
    await expect(source).toContainText("列明执行器精确复演一致");
    await source.getByText("查看来源与逐组件状态", { exact: true }).click();
    await expect(source.getByText("精确复演一致", { exact: true }).first()).toBeVisible();
    await expect(source.getByText("当前发布代可用", { exact: true })).toBeVisible();
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出查询快照", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("连续流程查询快照下载路径不可用");
  const exported = JSON.parse(await readFile(downloadPath, "utf8")) as {
    manifest: { format: string; formatVersion: string };
    payload: { results: Array<{ revisions?: Array<{ calculationSource?: { source: string; comparisonStatus: string } }> }> };
  };
  expect(exported.manifest).toMatchObject({
    format: "hakimi-research-query-export",
    formatVersion: "1.1.0"
  });
  expect(exported.payload.results[0]?.revisions?.[0]?.calculationSource).toMatchObject({
    source: storedReceiptExpected ? "stored_receipt" : "explicit_projection",
    comparisonStatus: storedReceiptExpected ? "matched" : "not_applicable"
  });
}

async function bindCurrentRendererToOffline(context: BrowserContext, page: Page) {
  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.overrideNetworkState", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
}

async function exportAnonymousMarkdownOffline(page: Page, caseId: string, revisionId: string) {
  await expect(page.getByText(/当前离线/)).toBeVisible();
  const anonymous = page.getByRole("checkbox", { name: /匿名导出/ });
  await expect(anonymous).toBeChecked();
  await page.getByRole("button", { name: "导出单盘 Markdown", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "文件已在本机生成" });
  await expect(dialog).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "下载文件", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hakimi-chart-r2-anonymous.md");
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  if (!path) throw new Error("匿名 Markdown 下载路径不可用");
  const markdown = await readFile(path, "utf8");
  expect(markdown).toContain("# 八字单盘研究报告");
  expect(markdown).toContain("出生日期、出生时间和时区仍可能用于重新识别个人");
  for (const sensitive of [EXACT_ALIAS, EVENT_TITLE, caseId, revisionId]) {
    expect(markdown).not.toContain(sensitive);
  }
  await dialog.getByRole("button", { name: "关闭文件交付", exact: true }).click();
}

test("同一批 CSV 数据连续贯穿修订、正式四盘对照、证据链、生命周期、事件、检索、离线导出与 v1.2 十六分区恢复", async ({
  baseURL,
  browser,
  context,
  page
}) => {
  test.setTimeout(480_000);
  if (!baseURL) throw new Error("Playwright baseURL 未配置");
  test.info().annotations.push({
    type: "browser-version",
    description: `${test.info().project.name} ${browser.version()}`
  });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);

  const sourceProblems = collectConsoleProblems(page);
  const sourceExternalRequests = collectUnexpectedExternalRequests(context, baseURL);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await waitForServiceWorker(page);
  const releaseSchema = await page.evaluate(() => Number(document.documentElement.dataset.dbSchema));
  expect([13, 15, 16]).toContain(releaseSchema);
  if (releaseSchema >= 15) {
    const initialReleaseEvidence = await pageReleaseEvidence(page);
    const expectedReleaseDescriptor = [
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
      PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR
    ].find((descriptor) => descriptor.migrationId === initialReleaseEvidence.descriptor?.migrationId);
    expect(expectedReleaseDescriptor, "continuous gate must use one frozen production descriptor")
      .toBeDefined();
    if (!expectedReleaseDescriptor) throw new Error("Continuous gate release descriptor is not frozen.");
    await expect.poll(() => pageReleaseEvidence(page)).toMatchObject({
      appBootReady: "true",
      swBootSignalSent: "true",
      swBootAck: "true",
      dbGeneration: expectedReleaseDescriptor.dbGeneration,
      dbSchema: String(expectedReleaseDescriptor.targetSchema),
      dbMigrationPhase: "committed",
      descriptor: expectedReleaseDescriptor
    });
  }
  const expectedCounts = expectedCountsForSchema(releaseSchema);
  test.info().annotations.push({
    type: "release-schema",
    description: String(releaseSchema)
  });
  await importMixedCsv(page);

  const caseTable = page.locator("table.case-table");
  const exactRow = caseTable.getByRole("row").filter({ hasText: EXACT_ALIAS });
  const candidateRow = caseTable.getByRole("row").filter({ hasText: UNKNOWN_ALIAS });
  const r1Href = await exactRow.getByRole("link", { name: `打开 ${EXACT_ALIAS}` }).getAttribute("href");
  const candidateHref = await candidateRow.getByRole("link", { name: `打开 ${UNKNOWN_ALIAS}` }).getAttribute("href");
  if (!r1Href || !candidateHref) throw new Error("CSV 导入后的精确案例或候选组没有可恢复的详情链接");
  const r1 = exactRevisionRoute(new URL(r1Href, baseURL).href);
  const comparisonItems: FormalComparisonItem[] = [];
  for (const alias of COMPARISON_ALIASES) {
    const href = await caseTable.getByRole("row").filter({ hasText: alias })
      .getByRole("link", { name: `打开 ${alias}` }).getAttribute("href");
    if (!href) throw new Error(`CSV 导入后的比较案例没有可恢复的详情链接：${alias}`);
    comparisonItems.push({ alias, revisionNumber: 1, ...exactRevisionRoute(new URL(href, baseURL).href) });
  }
  const candidateMatch = candidateHref.match(/^\/candidate-sets\/([0-9a-f-]+)$/i);
  if (!candidateMatch) throw new Error(`候选组 URL 不符合精确路由契约：${candidateHref}`);
  const candidateSetId = candidateMatch[1];

  const r2 = await deriveRevision(page, r1Href, { civilTime: "23:30", dayBoundary: "zi_start_23" });
  expect(r2.caseId).toBe(r1.caseId);
  expect(r2.revisionId).not.toBe(r1.revisionId);
  const r3 = await deriveRevision(page, r1Href, { civilTime: "23:30", dayBoundary: "midnight" });
  const r4 = await deriveRevision(page, r1Href, { civilTime: "15:30", dayBoundary: "zi_start_23" });
  expect(new Set([r1.revisionId, r2.revisionId, r3.revisionId, r4.revisionId]).size).toBe(4);
  await expect(page.getByRole("combobox", { name: "历史 Revision" }).locator("option")).toHaveText([/R1/, /R2/, /R3/, /R4/]);
  await trashAndRestoreExactCase(page);

  const formalComparisonItems: FormalComparisonItem[] = [
    { alias: EXACT_ALIAS, revisionNumber: 2, ...r2 },
    ...comparisonItems
  ];
  const formalComparison = await createFourChartComparison(page, formalComparisonItems);
  const sameCaseComparisonItems: SameCaseComparisonItem[] = [
    { alias: EXACT_ALIAS, ...r1, revisionNumber: 1 },
    { alias: EXACT_ALIAS, ...r2, revisionNumber: 2 },
    { alias: EXACT_ALIAS, ...r3, revisionNumber: 3 },
    { alias: EXACT_ALIAS, ...r4, revisionNumber: 4 }
  ];
  const sameCaseComparison = await createSameCaseFourRevisionComparison(page, sameCaseComparisonItems);
  await expectMalformedFormalComparisonFailsClosed(page, sameCaseComparisonItems[0]);
  await verifyTransitViewControls(page, formalComparisonItems[0]);

  const researchPath = `${r2.pathname}?view=research`;
  const evidenceChain = await createResearchEvidenceChain(page, researchPath);
  const eventId = await createRevisionEvent(page, researchPath);
  const savedViewId = await saveEventResearchQuery(page, eventId);
  await verifyBaselineReceiptResearchQuery(page, releaseSchema);

  const portableData = releaseSchema >= 15 ? portableFixture(`精确 v${releaseSchema} 连续闭环`) : null;
  const mixedMigration = releaseSchema >= 15
    ? await seedMixedMigrationReceipts(page, r2.caseId, r2.revisionId)
    : null;
  const rulePack = releaseSchema >= 15 ? await seedActiveRulePack(page) : null;
  if (portableData) {
    await openDataManagement(page);
    await seedPortableData(page, portableData);
    await expectPortableData(page, portableData, rulePack ?? undefined);
  }

  await page.goto(researchPath, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await disableNetworkCacheAndGoOffline(context, page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await bindCurrentRendererToOffline(context, page);
  await waitForAppReady(page);
  await exportAnonymousMarkdownOffline(page, r2.caseId, r2.revisionId);

  await openDataManagement(page);
  await bindCurrentRendererToOffline(context, page);
  await expect(page.getByText(/当前离线/)).toBeVisible();
  await expectPartitionCounts(page, expectedCounts);
  const { bytes: backupBytes } = await exportFullBackupZip(page);
  const sourceBackup = await preflightFullBackupFile(backupBytes);

  expect(sourceBackup.migratedFromFormatVersion).toBeNull();
  expect(sourceBackup.manifest).toMatchObject({
    format: "hakimi-bazi-full-backup",
    formatVersion: "1.2.0",
    schemaVersion: "1.0.0",
    scope: "current-modeled-data",
    counts: expectedCounts
  });
  expect(Object.keys(sourceBackup.manifest.counts).sort()).toEqual(PARTITIONS.map(([key]) => key).sort());
  expect(sourceBackup.digests.payload).toMatch(/^[a-f0-9]{64}$/);
  for (const [key] of PARTITIONS) expect(sourceBackup.digests[key]).toMatch(/^[a-f0-9]{64}$/);
  if (releaseSchema >= 15) {
    for (const [key] of PARTITIONS) {
      expect(sourceBackup.manifest.counts[key], `${key} must be non-empty in the Schema ${releaseSchema} release gate`)
        .toBeGreaterThan(0);
      expect(sourceBackup.payload[key], `${key} payload must be non-empty in the Schema ${releaseSchema} release gate`)
        .not.toHaveLength(0);
    }
  }

  const backedUpCase = sourceBackup.payload.cases.find((record) => record.id === r2.caseId);
  expect(backedUpCase).toMatchObject({
    alias: EXACT_ALIAS,
    latestRevisionId: r4.revisionId,
    revisionCount: 4,
    deletedAt: null
  });
  const backedUpRevisions = sourceBackup.payload.revisions
    .filter((record) => record.caseId === r2.caseId)
    .sort((left, right) => left.revisionNumber - right.revisionNumber);
  expect(backedUpRevisions.map((record) => [record.id, record.revisionNumber])).toEqual([
    [r1.revisionId, 1],
    [r2.revisionId, 2],
    [r3.revisionId, 3],
    [r4.revisionId, 4]
  ]);
  for (const revision of backedUpRevisions) expect(revision.manifest.resultHash).toMatch(/^[a-f0-9]{64}$/);
  expect(new Set(backedUpRevisions.map((revision) => revision.manifest.resultHash)).size).toBe(4);
  const receiptRevisionIds = sourceBackup.payload.revisionCalculationReceipts
    .map((receipt) => receipt.sourceRevision.revisionId)
    .sort();
  if (releaseSchema >= 15) {
    expect(receiptRevisionIds).toEqual(sourceBackup.payload.revisions.map((revision) => revision.id).sort());
    expect(sourceBackup.payload.revisionCalculationReceipts.every((receipt) => (
      receipt.captureKind === "revision_creation_baseline"
      && calculationComponentStatus(receipt.projection.relations) === "projected"
      && calculationComponentStatus(receipt.projection.luckCycle) === "projected"
      && calculationComponentStatus(receipt.projection.transit) === "not_requested"
    ))).toBe(true);
    expect(new Set(sourceBackup.payload.revisionCalculationReceipts.map((receipt) => receipt.requestFingerprint)).size)
      .toBe(expectedCounts.revisionCalculationReceipts);
  } else {
    expect(receiptRevisionIds).toEqual([]);
  }
  const backedUpCandidate = sourceBackup.payload.candidateSets.find((record) => record.id === candidateSetId);
  expect(backedUpCandidate).toMatchObject({
    alias: UNKNOWN_ALIAS,
    favorite: false,
    deletedAt: null,
    candidateSet: {
      input: { time: null, timePrecision: "unknown_hour" },
      probeCount: 13
    }
  });
  expect(backedUpCandidate?.snapshotDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(backedUpCandidate?.candidateSet.resultHash).toMatch(/^[a-f0-9]{64}$/);
  expect(sourceBackup.payload.events.find((record) => record.id === eventId)).toMatchObject({
    caseId: r2.caseId,
    revisionId: r2.revisionId,
    title: EVENT_TITLE,
    deletedAt: null,
    timeContext: { kind: "calendar_date" }
  });
  expect(sourceBackup.payload.savedViews.find((record) => record.id === savedViewId)).toMatchObject({
    state: "ready",
    name: SAVED_VIEW_NAME,
    query: { scope: "events", text: EVENT_TITLE }
  });
  expect(sourceBackup.payload.researchNotes.find((record) => record.id === evidenceChain.noteId)).toMatchObject({
    caseId: r2.caseId,
    anchor: { kind: "chart_field", revisionId: r2.revisionId },
    body: NOTE_BODY,
    tags: [NOTE_TAG],
    lifecycle: "active"
  });
  const backedUpDocument = sourceBackup.payload.knowledgeDocuments.find(
    (record) => record.id === evidenceChain.documentId
  );
  expect(backedUpDocument).toMatchObject({
    title: KNOWLEDGE_TITLE,
    author: "连续闭环研究者",
    edition: "本机研究摘录 v1",
    sourceNote: "仅用于本机研究闭环验收",
    fileName: KNOWLEDGE_FILE_NAME,
    format: "markdown",
    content: KNOWLEDGE_CONTENT
  });
  expect(backedUpDocument?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  expect(sourceBackup.payload.sourceRights.find(
    (record) => record.documentId === evidenceChain.documentId
  )).toMatchObject({
    documentContentHash: backedUpDocument?.contentHash,
    rights: {
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      distributionPolicy: "local_private_only"
    },
    source: { publisher: "个人整理", publicationYear: 2026 },
    review: { status: "unreviewed" }
  });
  expect(sourceBackup.payload.citations.find((record) => record.id === evidenceChain.noteCitationId)).toMatchObject({
    documentId: evidenceChain.documentId,
    documentContentHash: backedUpDocument?.contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: KNOWLEDGE_QUOTE,
    annotation: KNOWLEDGE_ANNOTATION,
    targets: [{ kind: "research_note", noteId: evidenceChain.noteId }],
    status: "user_candidate"
  });
  expect(sourceBackup.payload.citations.find((record) => record.id === evidenceChain.chartCitationId)).toMatchObject({
    documentId: evidenceChain.documentId,
    documentContentHash: backedUpDocument?.contentHash,
    locator: { sectionId: "section-4", startLine: 5, endLine: 5 },
    quote: CHART_FIELD_QUOTE,
    annotation: CHART_FIELD_ANNOTATION,
    targets: [{
      kind: "chart_field",
      caseId: r2.caseId,
      revisionId: r2.revisionId,
      field: "pillars.day.ganZhi"
    }],
    status: "user_candidate"
  });
  expect(sourceBackup.payload.citations.find((record) => record.id === evidenceChain.subjectCitationId)).toMatchObject({
    documentId: evidenceChain.documentId,
    documentContentHash: backedUpDocument?.contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: KNOWLEDGE_QUOTE,
    annotation: EVIDENCE_SUBJECT_ANNOTATION,
    targets: [{ kind: "evidence_subject", subjectId: DAY_GANZHI_SUBJECT_ID }],
    status: "user_candidate"
  });

  if (portableData && rulePack && mixedMigration) {
    expect(sourceBackup.payload.researcherProfiles).toHaveLength(1);
    expect(sourceBackup.payload.researcherProfiles[0]).toMatchObject({
      displayName: portableData.displayName,
      organization: portableData.organization,
      researchFocus: portableData.researchFocus
    });
    expect(sourceBackup.payload.appSettings).toHaveLength(1);
    expect(sourceBackup.payload.appSettings[0]).toMatchObject({
      locale: "zh-CN",
      defaultTimeZone: portableData.timeZone,
      defaultCalendarType: portableData.calendarType,
      preferredDensity: portableData.density
    });
    expect(sourceBackup.payload.attachments).toHaveLength(1);
    expect(sourceBackup.payload.attachments[0]).toMatchObject({
      fileName: portableData.attachmentName,
      mediaType: "application/octet-stream",
      byteLength: portableData.attachmentBytes.byteLength,
      description: portableData.attachmentDescription,
      link: null
    });
    expect(Buffer.from(sourceBackup.payload.attachments[0].contentBase64, "base64"))
      .toEqual(portableData.attachmentBytes);
    expect(sourceBackup.payload.attachments[0].contentHash).toMatch(/^[a-f0-9]{64}$/);

    expect(sourceBackup.payload.ruleRegistry).toHaveLength(2);
    expect(sourceBackup.payload.ruleRegistry).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: rulePack.packDigest,
        recordType: "installed_rule_pack",
        packDigest: rulePack.packDigest,
        packId: rulePack.packId,
        profileId: rulePack.profileId,
        profileVersion: rulePack.profileVersion,
        canonicalJson: rulePack.canonicalJson,
        localTrust: "unverified_local_import"
      }),
      expect.objectContaining({
        id: "active-rule-pack",
        recordType: "active_rule_pack",
        activeDigest: rulePack.packDigest,
        approval: expect.objectContaining({
          status: "locally_approved_for_activation",
          acknowledgementVersion: "rule-pack-local-approval@1",
          appVersion: "0.2.0-p0"
        })
      })
    ]));
    expect(sourceBackup.payload.candidateSets).toEqual(mixedMigration.snapshot.candidateSets);
    expect(sourceBackup.payload.tzdbMigrationReceipts).toEqual(
      mixedMigration.snapshot.tzdbMigrationReceipts
    );
    expect(sourceBackup.payload.events).toEqual(mixedMigration.snapshot.events);
    expect(sourceBackup.payload.eventTimeMigrationReceipts).toEqual(
      mixedMigration.snapshot.eventTimeMigrationReceipts
    );
  }

  await clearAllLocalData(page);
  await expectPartitionCounts(page, Object.fromEntries(PARTITIONS.map(([key]) => [key, 0])) as Record<(typeof PARTITIONS)[number][0], number>);

  const restoreContext = await browser.newContext({
    baseURL,
    acceptDownloads: true,
    serviceWorkers: "allow",
    viewport: { width: 1280, height: 800 }
  });
  try {
    const restorePage = await restoreContext.newPage();
    restorePage.setDefaultTimeout(15_000);
    restorePage.setDefaultNavigationTimeout(30_000);
    const restoreProblems = collectConsoleProblems(restorePage);
    const restoreExternalRequests = collectUnexpectedExternalRequests(restoreContext, baseURL);

    await openDataManagement(restorePage);
    await waitForServiceWorker(restorePage);
    await expectPartitionCounts(
      restorePage,
      Object.fromEntries(PARTITIONS.map(([key]) => [key, 0])) as Record<(typeof PARTITIONS)[number][0], number>
    );
    await preflightBackupZip(restorePage, backupBytes, "web-v1-continuous-flow-v1.2.zip");
    const restoreDiff = restorePage.getByRole("list", { name: "十六分区恢复差异" });
    await expect(restoreDiff.getByRole("listitem")).toHaveCount(16);
    for (const [key, label] of PARTITIONS) {
      await expect(restoreDiff.getByRole("listitem").filter({ hasText: label }).locator("dd").nth(1))
        .toHaveText(String(expectedCounts[key]));
    }
    await completeRestoreSafetyGate(restorePage);
    await expectPartitionCounts(restorePage, expectedCounts);

    await restorePage.goto("/cases", { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredCaseTable = restorePage.locator("table.case-table");
    const restoredCase = restoredCaseTable.getByRole("row").filter({ hasText: EXACT_ALIAS });
    const restoredCandidate = restoredCaseTable.getByRole("row").filter({ hasText: UNKNOWN_ALIAS });
    await expect(restoredCase).toContainText("4 次修订");
    await expect(restoredCase).toContainText("正式命盘");
    await expect(restoredCandidate).toContainText("13 个候选");
    await expect(restoredCase.getByRole("link", { name: `打开 ${EXACT_ALIAS}` })).toHaveAttribute("href", r4.pathname);
    await expect(restoredCandidate.getByRole("link", { name: `打开 ${UNKNOWN_ALIAS}` })).toHaveAttribute("href", candidateHref);
    for (const item of comparisonItems) {
      await expect(restoredCaseTable.getByRole("row").filter({ hasText: item.alias })
        .getByRole("link", { name: `打开 ${item.alias}` })).toHaveAttribute("href", item.pathname);
    }

    await restorePage.goto(formalComparison.path, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredComparisonHash = await expectFourChartProjection(restorePage, formalComparisonItems);
    expect(restoredComparisonHash).toBe(formalComparison.resultHash);
    expect(exactComparisonItems(restorePage.url())).toEqual(
      formalComparisonItems.map((item) => `revision:${item.caseId}:${item.revisionId}`)
    );
    expect(new URL(restorePage.url()).searchParams.get("at")).toBe("2030-01-02T03:04:00.000Z");
    expect(new URL(restorePage.url()).searchParams.get("focus")).toBe("D");
    await restorePage.setViewportSize({ width: 390, height: 844 });
    const restoredSwitcher = restorePage.getByRole("group", { name: "选择当前比较盘" });
    await expect(restoredSwitcher.getByRole("button", { name: `D · ${formalComparisonItems[3].alias}`, exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    await expect(restoredSwitcher).toContainText(
      `A · ${formalComparisonItems[0].alias} · R${formalComparisonItems[0].revisionNumber}`
        + ` ↔ 当前 D · ${formalComparisonItems[3].alias} · R${formalComparisonItems[3].revisionNumber}`
    );
    await restorePage.setViewportSize({ width: 1280, height: 800 });

    await restorePage.goto(sameCaseComparison.path, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    expect(await expectSameCaseRevisionOrder(restorePage, sameCaseComparison.orderedItems))
      .toBe(sameCaseComparison.resultHash);
    expect(exactComparisonItems(restorePage.url())).toEqual(
      sameCaseComparison.orderedItems.map((item) => `revision:${item.caseId}:${item.revisionId}`)
    );
    expect(new URL(restorePage.url()).searchParams.get("at")).toBe("2031-05-06T07:08:00.000Z");

    await restorePage.goto(r2.pathname, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    await expect(restorePage.getByRole("heading", { name: EXACT_ALIAS })).toBeVisible();
    await expect(restorePage.getByRole("combobox", { name: "历史 Revision" }).locator("option")).toHaveText([/R1/, /R2/, /R3/, /R4/]);
    await expect(restorePage.getByText("案例已在回收站", { exact: true })).toHaveCount(0);
    await expect(restorePage.getByRole("link", { name: "由此修订派生新版", exact: true })).toBeVisible();
    await restorePage.getByRole("button", { name: /^日柱天干：/ }).click();
    const restoredEvidencePanel = restorePage.locator(".evidence-panel.is-open");
    await expect(restoredEvidencePanel.getByRole("blockquote").filter({ hasText: CHART_FIELD_QUOTE })).toBeVisible();
    await expect(restoredEvidencePanel.getByRole("blockquote").filter({ hasText: KNOWLEDGE_QUOTE })).toBeVisible();

    await restorePage.goto(`${researchPath}&event=${eventId}`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredNote = restorePage.locator(".journal-list article").filter({ hasText: NOTE_BODY });
    await expect(restoredNote).toContainText("知识引用 · 1");
    await expect(restoredNote.getByRole("blockquote")).toContainText(KNOWLEDGE_QUOTE);
    const restoredEvent = restorePage.locator(`[data-event-id="${eventId}"]`);
    await expect(restoredEvent).toContainText(EVENT_TITLE);
    await expect(restoredEvent).toContainText("2024-02-04");

    await restorePage.goto(`/cases/research?view=${savedViewId}`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    await expect(restorePage.getByRole("heading", { name: "真实事件 · 1 条结果" })).toBeVisible();
    await expect(restorePage.getByRole("article", { name: `研究结果 ${EVENT_TITLE}` })).toBeVisible();

    await restorePage.goto(
      `/knowledge?citation=${evidenceChain.noteCitationId}&target=research_note&note=${evidenceChain.noteId}`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForAppReady(restorePage);
    await expect(restorePage.getByRole("heading", { name: KNOWLEDGE_TITLE })).toBeVisible();
    await expect(restorePage.getByRole("heading", { name: "3 条引用" })).toBeVisible();
    const selectedRestoredCitation = restorePage.locator(".knowledge-citation-list article.is-active");
    await expect(selectedRestoredCitation.getByRole("blockquote")).toContainText(KNOWLEDGE_QUOTE);
    await expect(selectedRestoredCitation).toContainText(KNOWLEDGE_ANNOTATION);

    await restorePage.goto("/knowledge?view=rights", { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    const restoredRights = restorePage.locator(".rights-record-list article").filter({ hasText: KNOWLEDGE_TITLE });
    await expect(restoredRights).toContainText("用户提供 · 未核验");
    await expect(restoredRights).toContainText("仅本机私有研究");

    await expectCandidateOnlyCoverage(restorePage, 1);

    await restorePage.goto(candidateHref, { waitUntil: "domcontentloaded" });
    await waitForAppReady(restorePage);
    await expect(restorePage.getByRole("heading", { name: UNKNOWN_ALIAS })).toBeVisible();
    await expect(restorePage.getByRole("list", { name: "13 个未知时辰代表性探针" }).locator(":scope > li")).toHaveCount(13);
    await expect(restorePage.getByText(/本页不选择、不推荐，也不允许设置任何主盘/)).toBeVisible();

    if (mixedMigration) {
      await restorePage.goto(`/candidate-sets/${mixedMigration.candidateSourceId}`, {
        waitUntil: "domcontentloaded"
      });
      await waitForAppReady(restorePage);
      await expect(restorePage.getByRole("link", {
        name: new RegExp(mixedMigration.candidateTargetId)
      })).toBeVisible();

      await restorePage.goto(
        `/cases/${r2.caseId}/revisions/${r2.revisionId}?view=research&event=${mixedMigration.eventSourceId}`,
        { waitUntil: "domcontentloaded" }
      );
      await waitForAppReady(restorePage);
      const restoredMigrationEvent = restorePage.locator(
        `[data-event-id="${mixedMigration.eventSourceId}"]`
      );
      await expect(restoredMigrationEvent).toContainText("时间迁移关系 · 1 条凭证");
      await expect(restoredMigrationEvent.getByRole("link", {
        name: `打开派生事件 ${mixedMigration.eventTargetId}`
      })).toBeVisible();
    }

    if (rulePack) {
      await restorePage.goto("/settings", { waitUntil: "domcontentloaded" });
      await waitForAppReady(restorePage);
      await expect(restorePage.getByText("已激活一个本机导入规则包", { exact: true })).toBeVisible();
      await expect(restorePage.getByText(
        `活动包 ${rulePack.packDigest}；这是本机显式批准，不是身份认证。`,
        { exact: true }
      )).toBeVisible();
    }

    await openDataManagement(restorePage);
    if (portableData) {
      await expectPortableData(restorePage, portableData, rulePack ?? undefined);
      const attachmentRegion = restorePage.getByRole("region", { name: "附件库" });
      const attachmentDownloadPromise = restorePage.waitForEvent("download");
      await attachmentRegion.getByRole("button", { name: "下载", exact: true }).click();
      const attachmentDownload = await attachmentDownloadPromise;
      expect(attachmentDownload.suggestedFilename()).toBe(portableData.attachmentName);
      expect(await attachmentDownload.failure()).toBeNull();
      const attachmentPath = await attachmentDownload.path();
      if (!attachmentPath) throw new Error("恢复后的附件下载路径不可用");
      expect(await readFile(attachmentPath)).toEqual(portableData.attachmentBytes);
      const screenshotPath = process.env.HAKIMI_E2E_SCREENSHOT_PATH;
      if (screenshotPath) {
        await restorePage.screenshot({ path: screenshotPath, fullPage: false });
      }
      await test.info().attach(`schema-${releaseSchema}-all-sixteen-partitions-${test.info().project.name}`, {
        body: await restorePage.screenshot({ fullPage: false }),
        contentType: "image/png"
      });
    }
    const { bytes: roundTripBytes } = await exportFullBackupZip(restorePage);
    const roundTrip = await preflightFullBackupFile(roundTripBytes);
    expect(roundTrip.manifest.counts).toEqual(sourceBackup.manifest.counts);
    expect(roundTrip.digests.payload).toBe(sourceBackup.digests.payload);
    for (const [key] of PARTITIONS) expect(roundTrip.digests[key]).toBe(sourceBackup.digests[key]);
    expect(roundTrip.payload).toEqual(sourceBackup.payload);
    expect(restoreExternalRequests).toEqual([]);
    expect(restoreProblems).toEqual([]);
  } finally {
    await restoreContext.close();
  }

  expect(sourceExternalRequests).toEqual([]);
  expect(sourceProblems).toEqual([]);
});
