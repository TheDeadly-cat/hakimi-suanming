import { expect, test, type Page } from "@playwright/test";

const recoveryAlert = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "启动完整性检查未通过" });

test("当前路由模块预加载失败时不挂载业务页，也不确认离线版本", async ({ page }) => {
  await page.route(/\/assets\/research-query-page-[^/]+\.js(?:\?.*)?$/, (route) => route.abort("failed"));

  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });

  const alert = recoveryAlert(page);
  await expect(alert).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle("启动恢复诊断 · 哈基米八字研究台");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
  await expect(alert).toContainText("故障阶段：route");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("false");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swBootSignalSent ?? "unset")).not.toBe("true");
});

test("启动预检期间地址发生变化时拒绝用旧路由替新路由确认", async ({ page }) => {
  let releaseRoute!: () => void;
  const routeGate = new Promise<void>((resolve) => {
    releaseRoute = resolve;
  });
  await page.route(/\/assets\/research-query-page-[^/]+\.js(?:\?.*)?$/, async (route) => {
    await routeGate;
    await route.continue();
  });

  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/普通研究路由尚未挂载/)).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, "", "/settings");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  releaseRoute();

  const alert = recoveryAlert(page);
  await expect(alert).toBeVisible({ timeout: 20_000 });
  await expect(alert).toContainText("故障阶段：route");
  await expect(page.getByRole("heading", { name: "设置与诊断" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("false");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swBootSignalSent ?? "unset")).not.toBe("true");
});

test("BOOT_OK 后的未捕获错误进入独立运行故障态，不篡改已完成的启动确认", async ({ page }) => {
  page.on("pageerror", () => undefined);
  await page.goto("/cases/research", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.swBootSignalSent)).toBe("true");
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toBeVisible();

  await page.evaluate(() => {
    window.setTimeout(() => {
      throw new Error("synthetic late runtime failure");
    }, 0);
  });

  await expect(page.getByRole("heading", { name: "当前页面运行失败" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("alert")).toContainText("故障阶段：window_error");
  await expect(recoveryAlert(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "专业研究检索" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.appBootReady)).toBe("true");
  await expect.poll(() => page.evaluate(async () => {
    const buildVersion = document.querySelector<HTMLMetaElement>('meta[name="hakimi-build-version"]')?.content;
    if (!buildVersion) return null;
    const cache = await caches.open(`hakimi-shell-${buildVersion}`);
    const response = await cache.match(new URL("/__hakimi_cache_meta__", window.location.origin).toString());
    if (!response) return null;
    return (await response.json() as { bootConfirmed?: boolean }).bootConfirmed ?? null;
  })).toBe(true);
});
