import { defineConfig } from "@playwright/test";

const browserExecutable = process.env.HAKIMI_PILOT_BROWSER_EXECUTABLE?.trim();

export default defineConfig({
  testDir: "./e2e",
  testMatch: "single-binding-integrated-physical.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    browserName: "chromium",
    ...(browserExecutable ? { launchOptions: { executablePath: browserExecutable } } : {}),
    colorScheme: "light",
    locale: "zh-CN",
    serviceWorkers: "block",
    trace: "retain-on-failure"
  }
});
