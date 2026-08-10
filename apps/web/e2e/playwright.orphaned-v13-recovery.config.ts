import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "orphaned-v13-recovery.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-orphaned-v13-recovery-results"),
  timeout: 420_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge"
      }
    },
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome"
      }
    }
  ]
});
