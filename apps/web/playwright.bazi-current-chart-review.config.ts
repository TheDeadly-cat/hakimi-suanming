import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4197";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "bazi-current-chart-review.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-v018-current-chart-review-playwright-results"),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    { name: "msedge", use: { channel: "msedge" } },
    { name: "chrome", use: { channel: "chrome" } }
  ],
  webServer: {
    command: "npm run serve:e2e --workspace @hakimi/web",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
