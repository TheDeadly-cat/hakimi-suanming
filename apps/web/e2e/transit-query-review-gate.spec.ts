import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] as const;

test("运限候选审核包在桌面与安卓宽度下保持只读双审门禁", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "设置与诊断" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "运限查询专家审核" })).toBeVisible();
  const reviewA = page.getByRole("button", { name: "预检独立审核 A" });
  const reviewB = page.getByRole("button", { name: "预检独立审核 B" });
  const adjudication = page.getByRole("button", { name: "预检运限最终裁决" });
  await expect(reviewA).toBeDisabled();
  await expect(reviewB).toBeDisabled();
  await expect(adjudication).toBeDisabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出运限查询审核包" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^hakimi-transit-query-review-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  if (!path) throw new Error("transit query review bundle download path unavailable");
  const envelope = JSON.parse(await readFile(path, "utf8")) as {
    format: string;
    digest: string;
    payload: {
      dataset: { verifiedCandidateCount: number };
      reviewPolicy: { verifiedCountingEnabled: boolean };
      candidates: Array<{ candidateDigest: string }>;
    };
  };
  expect(envelope.format).toBe("hakimi-transit-query-review-bundle");
  expect(envelope.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(envelope.payload.candidates).toHaveLength(18);
  expect(envelope.payload.dataset.verifiedCandidateCount).toBe(0);
  expect(envelope.payload.reviewPolicy.verifiedCountingEnabled).toBe(false);
  await expect(page.getByText("运限审核包已绑定到当前页面", { exact: true })).toBeVisible();
  await expect(reviewA).toBeEnabled();
  await expect(reviewB).toBeEnabled();
  await expect(adjudication).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "运限查询专家审核" })).toBeVisible();
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
