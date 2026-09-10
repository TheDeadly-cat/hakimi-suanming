import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const strictReporter = fileURLToPath(new URL(
  "./playwright.release-browser-strict-reporter.ts",
  import.meta.url
));

/** Isolated direct v13 -> v16 natural-upgrade and failure-matrix release gate. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-cross-schema-v13-v16.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-cross-schema-v13-v16-results"),
  timeout: 300_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  workers: 1,
  reporter: [
    ["line"],
    [strictReporter, { receiptId: "cross-schema-v13-v16", expectedTestsPerProject: 13 }]
  ],
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
