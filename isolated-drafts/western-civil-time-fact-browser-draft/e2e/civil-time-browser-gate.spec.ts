import { expect, test, type Page } from "@playwright/test";

const outputTreeDigest = process.env.HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256;
if (typeof outputTreeDigest !== "string" || !/^[a-f0-9]{64}$/u.test(outputTreeDigest)) {
  throw new Error("missing exact output-tree digest");
}
const ianaEvidencePath = process.env.HAKIMI_WESTERN_EVIDENCE_IANA_PATH;
if (typeof ianaEvidencePath !== "string"
    || !/^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u.test(ianaEvidencePath)) {
  throw new Error("missing exact retained-output evidence path");
}

const PAGE_PROBLEM_TYPES = Object.freeze([
  "console_warning",
  "console_error",
  "pageerror",
  "requestfailed"
] as const);
type PageProblemType = typeof PAGE_PROBLEM_TYPES[number];
const pageProblems = new WeakMap<Page, PageProblemType[]>();
const FACT_VALUE_IDS = Object.freeze([
  "declared-civil-time",
  "utc-instant",
  "utc-offset",
  "dst-decision",
  "tzdb-identity",
  "round-trip",
  "supported-range",
  "adapter-version",
  "data-handling",
  "chain-digest"
]);

async function fixedStage<T>(stageId: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch {
    throw new Error(`WESTERN_FIXED_STAGE:${stageId}`);
  }
}

test.beforeEach(async ({ page }) => {
  await fixedStage("bootstrap", async () => {
    const problems: PageProblemType[] = [];
    pageProblems.set(page, problems);
    page.on("console", (message) => {
      if (message.type() === "warning") problems.push("console_warning");
      if (message.type() === "error") problems.push("console_error");
    });
    page.on("pageerror", () => problems.push("pageerror"));
    page.on("requestfailed", () => problems.push("requestfailed"));

    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-hakimi-western-output-tree-sha256"]).toBe(outputTreeDigest);
    await expect(page).toHaveTitle("西洋民用时工程事实 · 隔离草案");
    await expect(page.getByRole("heading", { name: "民用时 → UTC 工程事实" })).toBeVisible();
    await expect(page.locator("input[name], select[name], button[name]")).toHaveCount(0);
    await expect(page.locator("button:not([type='button'])")).toHaveCount(0);
    await expect(page.locator("#fact-results")).toBeHidden();
  });
});

test.afterEach(async ({ page }) => {
  const problems = pageProblems.get(page) ?? [];
  const firstProblemType = PAGE_PROBLEM_TYPES.find((problemType) => problems.includes(problemType));
  if (firstProblemType !== undefined) {
    throw new Error(`WESTERN_FIXED_STAGE:after_each_problem_check_${firstProblemType}`);
  }
  expect(problems).toEqual([]);
});

async function setCivilInput(page: Page, value: Readonly<{
  date: string;
  time: string;
  precision?: "exact_minute" | "exact_second";
  zone: string;
  policy: "reject" | "earlier" | "later";
  latitude?: string;
  longitude?: string;
}>): Promise<void> {
  await page.locator("#date").fill(value.date);
  await page.locator("#time-precision").selectOption(value.precision ?? "exact_minute");
  await page.locator("#time").fill(value.time);
  await page.locator("#time-zone").fill(value.zone);
  await page.locator("#dst-policy").selectOption(value.policy);
  await page.locator("#latitude").fill(value.latitude ?? "40.7128");
  await page.locator("#longitude").fill(value.longitude ?? "-74.006");
}

async function setCivilInputWithoutEvents(page: Page, value: Readonly<{
  date: string;
  time: string;
  zone: string;
  policy: "reject";
}>): Promise<void> {
  await page.evaluate((next) => {
    const setValue = (id: string, value: string): void => {
      const element = document.getElementById(id);
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
        throw new Error("synthetic DOM setup target missing");
      }
      element.value = value;
    };
    setValue("date", next.date);
    setValue("time-precision", "exact_minute");
    setValue("time", next.time);
    setValue("time-zone", next.zone);
    setValue("dst-policy", next.policy);
    setValue("latitude", "40.7128");
    setValue("longitude", "-74.006");
  }, value);
}

async function run(page: Page): Promise<void> {
  await page.locator("#run-chain").click();
  await expect(page.locator("#chain-status")).not.toHaveAttribute("data-state", "running");
}

async function expectResolvedUi(page: Page): Promise<void> {
  await expect(page.locator("#chain-status")).toHaveAttribute("data-state", "passed");
  await expect(page.locator("#fact-results")).toBeVisible();
  await expect(page.locator("#error-box")).toBeHidden();
  for (const id of FACT_VALUE_IDS) await expect(page.locator(`#${id}`)).not.toHaveText("");
}

async function primeUniqueProjection(page: Page): Promise<void> {
  await setCivilInput(page, {
    date: "2000-01-01",
    time: "20:00",
    zone: "Asia/Shanghai",
    policy: "reject",
    latitude: "31.2304",
    longitude: "121.4737"
  });
  await run(page);
  await expectResolvedUi(page);
}

async function expectPriorProjectionStillVisible(page: Page): Promise<void> {
  await expect(page.locator("#fact-results")).toBeVisible();
  for (const id of FACT_VALUE_IDS) await expect(page.locator(`#${id}`)).not.toHaveText("");
}

async function probeRetainedOutputBodyWithoutExecutionClaim(page: Page): Promise<void> {
  const response = await page.goto(`/${ianaEvidencePath}?hakimi-western-evidence-only=1`);
  expect(response).not.toBeNull();
  expect(response?.status()).toBe(200);
  const headers = response?.headers() ?? {};
  expect(headers["content-type"]).toBe("text/plain; charset=utf-8");
  expect(headers["content-disposition"]).toBe("inline");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-hakimi-western-output-tree-sha256"]).toBe(outputTreeDigest);
  const body = await response?.body();
  expect(body?.byteLength ?? 0).toBeGreaterThan(0);
}

async function expectFailedClosed(page: Page, code: string): Promise<void> {
  await expect(page.locator("#chain-status")).toHaveAttribute("data-state", "failed");
  await expect(page.locator("#chain-status")).toHaveText("未生成任何事实");
  await expect(page.locator("#error-box")).toBeVisible();
  await expect(page.locator("#error-box")).toHaveText(`失败关闭：${code}`);
  await expect(page.locator("#fact-results")).toBeHidden();
  for (const id of FACT_VALUE_IDS) await expect(page.locator(`#${id}`)).toHaveText("");
}

test("历史秒级偏移唯一民用时只生成工程事实", async ({ page }) => {
  await fixedStage("unique_input", async () => {
    await setCivilInput(page, {
      date: "1900-01-01",
      time: "20:00:00",
      precision: "exact_second",
      zone: "Asia/Shanghai",
      policy: "reject",
      latitude: "31.2304",
      longitude: "121.4737"
    });
  });
  await fixedStage("unique_run_resolved", async () => {
    await run(page);
    await expectResolvedUi(page);
  });
  await fixedStage("unique_exact_facts", async () => {
    await expect(page.locator("#utc-instant")).toHaveText("1900-01-01T11:54:17.000Z");
    await expect(page.locator("#utc-offset")).toHaveText("UTC+08:05:43");
    await expect(page.locator("#dst-decision")).toHaveText("unique / unique");
    await expect(page.locator("#chain-digest")).toHaveText(/^[a-f0-9]{64}$/u);
  });
  await fixedStage("unique_input_clear", async () => {
    await page.locator("#date").fill("1900-01-02");
    await expect(page.locator("#fact-results")).toBeHidden();
    for (const id of FACT_VALUE_IDS) await expect(page.locator(`#${id}`)).toHaveText("");
    await expect(page.locator("#chain-status")).toHaveText("输入已改变；请重新生成");
  });
  await fixedStage("unique_iana_navigation", async () => {
    await probeRetainedOutputBodyWithoutExecutionClaim(page);
  });
});

test("本地墙时空档失败关闭且无部分事实", async ({ page }) => {
  await primeUniqueProjection(page);
  await setCivilInputWithoutEvents(page, {
    date: "2021-03-14",
    time: "02:30",
    zone: "America/New_York",
    policy: "reject"
  });
  await expectPriorProjectionStillVisible(page);
  await run(page);
  await expectFailedClosed(page, "DST_GAP_REJECTED");
});

test("本地墙时重叠默认拒绝并失败关闭", async ({ page }) => {
  await primeUniqueProjection(page);
  await setCivilInputWithoutEvents(page, {
    date: "2021-11-07",
    time: "01:30",
    zone: "America/New_York",
    policy: "reject"
  });
  await expectPriorProjectionStillVisible(page);
  await run(page);
  await expectFailedClosed(page, "DST_OVERLAP_REJECTED");
});

test("本地墙时重叠显式选择较早瞬时点", async ({ page }) => {
  await setCivilInput(page, {
    date: "2021-11-07",
    time: "01:30",
    zone: "America/New_York",
    policy: "earlier"
  });
  await run(page);
  await expectResolvedUi(page);
  await expect(page.locator("#utc-instant")).toHaveText("2021-11-07T05:30:00.000Z");
  await expect(page.locator("#utc-offset")).toHaveText("UTC−04:00");
  await expect(page.locator("#dst-decision")).toHaveText("overlap / earlier");
});

test("本地墙时重叠显式选择较晚瞬时点", async ({ page }) => {
  await setCivilInput(page, {
    date: "2021-11-07",
    time: "01:30",
    zone: "America/New_York",
    policy: "later"
  });
  await run(page);
  await expectResolvedUi(page);
  await expect(page.locator("#utc-instant")).toHaveText("2021-11-07T06:30:00.000Z");
  await expect(page.locator("#utc-offset")).toHaveText("UTC−05:00");
  await expect(page.locator("#dst-decision")).toHaveText("overlap / later");
});
