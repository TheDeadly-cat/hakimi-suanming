import { expect, test } from "@playwright/test";
import { seedActiveRulePack } from "./full-backup-helpers";

test("settings stays within the Android-width viewport", async ({ page }) => {
  await seedActiveRulePack(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".route-loading, .settings-loading")).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
    settingsGridScrollWidth: document.querySelector<HTMLElement>(".settings-grid")?.scrollWidth ?? null,
    settingsGridClientWidth: document.querySelector<HTMLElement>(".settings-grid")?.clientWidth ?? null
  }));

  expect(layout.rootScrollWidth).toBeLessThanOrEqual(layout.rootClientWidth);
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.rootClientWidth);
  expect(layout.settingsGridScrollWidth).toBe(layout.settingsGridClientWidth);
});
