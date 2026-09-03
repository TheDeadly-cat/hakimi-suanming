import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function openSection(page, label) {
  await page.getByRole("navigation", { name: "试填步骤" }).getByRole("button", { name: new RegExp(label) }).click();
}

const SCENARIO_LABELS = Object.freeze({
  P01: "极弱规则测试",
  P02: "极强与特殊结构",
  P03: "月令主气去重",
  P04: "时柱不确定影响",
  P05: "分档临界值测试"
});

async function fillIntro(page) {
  const acknowledgements = page.getByRole("group", { name: "开始前确认" }).getByRole("checkbox");
  for (let index = 0; index < await acknowledgements.count(); index += 1) {
    await acknowledgements.nth(index).check();
  }
  await page.getByLabel("自述流派 / 传统").fill("子平旺衰，只用于本次工程试审。合成说明。" );
  await page.getByLabel("本次可复核范围").fill("可复核工程权重、条件、反例与风险边界。" );
}

async function fillScenario(page, id) {
  await openSection(page, SCENARIO_LABELS[id]);
  const response = page.locator(".response-card");
  await response.getByRole("group", { name: "1. 命盘事实是否正确" }).getByLabel("信息不足，无法判断").check();
  await response.getByRole("group", { name: "2. 对当前规则的意见" }).getByLabel("满足条件时可采用").check();
  await response.getByLabel("理由（请说明判断依据）").fill(`${id} 专家原文：需要结合流派边界判断。`);
  await response.getByLabel("成立条件").fill("仅在页面所示 synthetic ledger 内成立。" );
  await response.getByLabel("反例").fill("特殊结构成立时可能推翻。" );
  await response.getByRole("group", { name: "可能使结论失效的结构" }).getByLabel("无法判断").check();
  await response.getByLabel("这类结论应怎样呈现").selectOption("defer");
  await response.getByLabel("修改建议").fill("继续保留工程候选标签。" );
}

async function fillOverall(page) {
  await openSection(page, "四个总体问题");
  const questions = page.locator(".overall-question");
  for (let index = 0; index < 4; index += 1) {
    const question = questions.nth(index);
    await question.getByRole("group", { name: "总体意见" }).getByLabel("满足条件时可采用").check();
    await question.getByLabel("专家原文").fill(`总体问题 ${index + 1} 的专家逐字原文。`);
    await question.getByLabel("理由").fill("当前五场景只支持条件化判断。" );
    await question.getByLabel("不确定点").fill("仍缺正式案例集与来源闭合。" );
  }
}

async function fillUsability(page) {
  await openSection(page, "使用感受");
  await page.getByRole("group", { name: "整体易懂程度" }).getByLabel(/^4/u).check();
  await page.getByLabel("最难理解的词或页面").fill("压力工程账需要更直白说明。" );
  await page.getByLabel("流程建议").fill("保留逐页进度。" );
}

async function completePilot(page) {
  await fillIntro(page);
  for (const id of ["P01", "P02", "P03", "P04", "P05"]) await fillScenario(page, id);
  await fillOverall(page);
  await fillUsability(page);
  await openSection(page, "核对并保存");
  await page.getByRole("checkbox", { name: /截至现在，我未查看另一份独立答卷/u }).check();
  await page.getByRole("checkbox", { name: /我已核对上述文字/u }).check();
  await page.getByRole("button", { name: "检查并锁定答卷" }).click();
  await expect(page.getByRole("heading", { name: "答卷填写完成，请交给协调人保存" })).toBeVisible();
}

test("A entry freezes its scenario order and cannot serve the opposite seat", async ({ page }) => {
  await page.goto("/seat-a.html");
  const aLabels = (await page.locator(".left-rail [data-nav-index]").allTextContents()).map((label) => label.trim());
  await expect(page.getByText("这里只检查题目是否清楚，不作为正式专家审定意见")).toBeVisible();
  await expect(page.getByText("独立填写", { exact: true })).toBeVisible();
  await openSection(page, "核对并保存");
  await expect(page.getByText("截至现在，我未查看另一份独立答卷的状态或意见；若情况已经改变，我不会锁定本答卷。", { exact: true })).toBeVisible();
  expect(aLabels.slice(1, 6)).toEqual(["极弱规则测试", "月令主气去重", "分档临界值测试", "极强与特殊结构", "时柱不确定影响"]);
  const oppositeSeat = await page.goto("/seat-b.html");
  expect(oppositeSeat?.status()).toBe(404);
});

test("supports semantic keyboard-accessible fields and reports missing required content", async ({ page }) => {
  await page.goto("/seat-a.html");
  await expect(page.getByRole("heading", { level: 1, name: "八字规则复核试填" })).toBeVisible();
  await expect(page.getByRole("group", { name: "开始前确认" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await openSection(page, "核对并保存");
  await page.getByRole("button", { name: "检查并锁定答卷" }).click();
  const summary = page.getByRole("alert");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("请先处理以下项目");
});

test("plain-language flow separates expert judgment from coordinator file handling", async ({ page }) => {
  await page.goto("/seat-a.html");
  await expect(page).toHaveTitle("八字规则复核试填");
  await expect(page.getByText("不需要懂 AI 或代码。")).toBeVisible();
  await expect(page.getByText("合成场景 0 / 5")).toBeVisible();
  await expect(page.getByText("总体问题 0 / 4")).toBeVisible();
  await expect(page.getByText("使用感受 待填写")).toBeVisible();
  await openSection(page, "极弱规则测试");
  await expect(page.locator("details.ledger-card")).not.toHaveAttribute("open", "");
  const desktopLayout = await page.evaluate(() => {
    const host = document.querySelector(".scenario-workspace").getBoundingClientRect();
    const ledger = document.querySelector(".ledger-card").getBoundingClientRect();
    const response = document.querySelector(".response-card").getBoundingClientRect();
    return { hostRight: host.right, ledgerRight: ledger.right, responseRight: response.right };
  });
  expect(desktopLayout.ledgerRight).toBeLessThanOrEqual(desktopLayout.hostRight + 1);
  expect(desktopLayout.responseRight).toBeLessThanOrEqual(desktopLayout.hostRight + 1);
  await page.getByRole("button", { name: "本场景没有补充内容：将空白文字栏填为“无”" }).click();
  await expect(page.getByLabel("理由（请说明判断依据）")).toHaveValue("无");
  await expect(page.getByRole("group", { name: "1. 命盘事实是否正确" }).getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByText("选择项仍需您亲自判断。")).toBeVisible();
});

test("privacy preflight blocks personal-like text and requires fresh export confirmation", async ({ page }) => {
  let downloads = 0;
  page.on("download", () => { downloads += 1; });
  await page.goto("/seat-a.html");
  await openSection(page, "极弱规则测试");
  await page.getByLabel("理由（请说明判断依据）").fill("姓名：测试甲，1990年1月2日 08:30，手机13800138000。");
  await openSection(page, "核对并保存");
  const privacyConfirmation = page.getByRole("checkbox", { name: /我已核对上述文字/u });
  await privacyConfirmation.check();
  await page.getByText("协调人：暂停并保存草稿", { exact: true }).click();
  await page.getByRole("button", { name: "保存全部草稿备份" }).click();
  await expect(page.getByRole("alert")).toContainText("检测到显式姓名或联系人字段");
  expect(downloads).toBe(0);
  await page.getByRole("alert").getByRole("button").click();
  await expect(page.getByLabel("理由（请说明判断依据）")).toBeFocused();
  await page.getByLabel("理由（请说明判断依据）").fill("只讨论当前人工构造场景的规则边界，不引用现实人物。");
  await openSection(page, "核对并保存");
  await expect(privacyConfirmation).not.toBeChecked();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("continues locally after transport is disabled and emits no non-loopback request", async ({ page, context }) => {
  const remoteRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") remoteRequests.push(request.url());
  });
  await page.goto("/seat-a.html");
  await context.setOffline(true);
  await fillIntro(page);
  await openSection(page, "极弱规则测试");
  await expect(page.getByRole("heading", { name: "极弱规则测试" })).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test("390x844 layout has no page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seat-a.html");
  await expect(page.getByRole("button", { name: /说明 \/ 5 个合成场景/u })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await page.getByRole("button", { name: /下一页 极弱规则测试/u }).click();
  await expect(page.locator(".mobile-actions")).toBeVisible();
  const scenarioDimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(scenarioDimensions.scrollWidth).toBeLessThanOrEqual(scenarioDimensions.width);
});

test("sealing locks inputs, downloads exact JSON, and exposes print-only human projection", async ({ page }) => {
  await page.goto("/seat-a.html");
  await completePilot(page);
  await openSection(page, "极弱规则测试");
  await expect(page.getByLabel("理由（请说明判断依据）")).toBeDisabled();
  await openSection(page, "核对并保存");
  await page.getByText("协调人：保存答卷文件", { exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存完整提交资料（一个文件）" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/complete-submission\.json$/u);
  await expect(page.getByRole("heading", { name: "答卷已锁定，协调人已发起保存" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-projection")).toBeVisible();
  await expect(page.locator(".workspace-grid")).toBeHidden();
  await expect(page.locator(".print-projection")).toContainText("不作为正式专家审定意见");
  await expect(page.locator(".print-projection")).toContainText("满足条件时可采用");
  await expect(page.locator(".print-projection")).toContainText("总体问题 1 的专家逐字原文");
});

test("physical URL context binds cycle, seat, and package manifest into the downloaded submission", async ({ page }) => {
  const reviewCycleId = `pilot-review-cycle.${"9".repeat(64)}`;
  const packageManifestRawSha256 = "8".repeat(64);
  await page.goto(`/seat-a.html?reviewCycleId=${reviewCycleId}&packageManifestRawSha256=${packageManifestRawSha256}`);
  await page.getByText("协调人信息（专家无需处理）", { exact: true }).click();
  await expect(page.getByText(/本轮交接号 …9999999999/u)).toBeVisible();
  await completePilot(page);
  await page.getByText("协调人：保存答卷文件", { exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存完整提交资料（一个文件）" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const submission = JSON.parse(await readFile(downloadPath, "utf8"));
  expect(submission.seatId).toBe("A");
  expect(submission.sessionBinding.bindingMode).toBe("physical_seat_package");
  expect(submission.sessionBinding.reviewCycleId).toBe(reviewCycleId);
  expect(submission.sessionBinding.packageManifestRawSha256).toBe(packageManifestRawSha256);
  expect(submission.authorityBoundary.countsTowardFormal2of2).toBe(false);
  expect(submission.authorityBoundary.countsTowardExpertGate).toBe(false);
});
