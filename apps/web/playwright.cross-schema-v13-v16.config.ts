import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** Isolated direct v13 -> v16 natural-upgrade and failure-matrix release gate. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-cross-schema-v13-v16.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-cross-schema-v13-v16-results"),
  timeout: 300_000,
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
