import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.pwa-cross-browser.config.ts";

const strictReporter = fileURLToPath(new URL(
  "./playwright.release-browser-strict-reporter.ts",
  import.meta.url
));

/**
 * Formal default-v13 boot evidence. The preview command verifies and serves
 * the already locked dist/web artifact; it never performs another build.
 */
export default defineConfig({
  ...baseConfig,
  testMatch: [
    "boot-fail-closed.spec.ts",
    "database-v8-v9-upgrade.spec.ts"
  ],
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-boot-cross-browser-results"),
  reporter: [
    ["line"],
    [strictReporter, { receiptId: "boot", expectedTestsPerProject: 6 }]
  ],
  webServer: {
    command: "npm run preview:release-artifact --workspace @hakimi/web",
    url: "http://127.0.0.1:4197/",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
