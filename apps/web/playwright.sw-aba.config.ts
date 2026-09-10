import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { RELEASE_BROWSER_MATRIX, releaseBrowserNativeDeviceOptions } from "./playwright.release-browser-matrix";

const runRoot = process.env.HAKIMI_LOCAL_SW_QA_RUN_ROOT ?? path.join(os.tmpdir(), "h6aba-list-only");
export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-same-schema-aba.spec.ts",
  outputDir: path.join(runRoot, "aba-results"),
  timeout: 360_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reporter: [["line"], ["json", { outputFile: path.join(runRoot, "aba-playwright-report.json") }]],
  use: { serviceWorkers: "allow", trace: "on", screenshot: "only-on-failure", video: "off" },
  projects: RELEASE_BROWSER_MATRIX.map(browser => ({
    name: browser.projectName,
    metadata: { evidenceClass: "local_current_source_supplement_only", formalReleaseEvidence: false },
    use: { ...releaseBrowserNativeDeviceOptions(browser), channel: browser.channel }
  }))
});
