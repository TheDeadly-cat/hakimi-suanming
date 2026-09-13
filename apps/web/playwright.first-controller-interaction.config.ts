import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.release-pwa-artifact.config.ts";

export default defineConfig({
  ...baseConfig,
  testMatch: "first-controller-interaction.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-first-controller-interaction-results"),
  retries: 0,
  failOnFlakyTests: true,
  reporter: [
    ["line"],
    [fileURLToPath(new URL("./playwright.release-browser-strict-reporter.ts", import.meta.url)), {
      receiptId: "first-controller-interaction", expectedTestsPerProject: 2
    }],
    ["json", { outputFile: path.join(os.tmpdir(), "hakimi-first-controller-interaction-results.json") }]
  ]
});
