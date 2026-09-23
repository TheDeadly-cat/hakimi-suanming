import { defineConfig, devices } from "@playwright/test";
import { migrationDiagnosticOutput } from "./playwright.migration-diagnostics.ts";

const diagnostics = migrationDiagnosticOutput("cross-schema-upgrade");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-cross-schema-upgrade.spec.ts",
  outputDir: diagnostics.testResults,
  timeout: 300_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  failOnFlakyTests: true,
  reporter: [["line"], ["json", { outputFile: diagnostics.jsonReport }]],
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
    }
  ]
});
