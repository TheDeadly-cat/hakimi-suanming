import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { migrationDiagnosticOutput } from "./playwright.migration-diagnostics.ts";

const diagnostics = migrationDiagnosticOutput("cross-schema-v13-v16");

const strictReporter = fileURLToPath(new URL(
  "./playwright.release-browser-strict-reporter.ts",
  import.meta.url
));

/** Isolated direct v13 -> v16 natural-upgrade and failure-matrix release gate. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-cross-schema-v13-v16.spec.ts",
  outputDir: diagnostics.testResults,
  timeout: 300_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  workers: 1,
  reporter: [
    ["line"],
    [strictReporter, { receiptId: "cross-schema-v13-v16", expectedTestsPerProject: 13 }],
    ["json", { outputFile: diagnostics.jsonReport }]
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
