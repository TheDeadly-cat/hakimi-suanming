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
 * Formal default-v13 backup evidence. Four project-fixture scenarios run once
 * in each branded project against the same locked dist/web artifact. The
 * historical Chrome-to-Edge transfer test launches browsers outside the
 * project fixture and therefore remains in the generic/nightly backup suite.
 */
export default defineConfig({
  ...baseConfig,
  testMatch: [
    "database-v9-v10-upgrade.spec.ts",
    "database-v10-v11-upgrade.spec.ts",
    "offline-full-backup.spec.ts",
    "full-backup-worker-capacity.spec.ts"
  ],
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-backup-cross-browser-results"),
  timeout: 180_000,
  reporter: [
    ["line"],
    [strictReporter, { receiptId: "backup", expectedTestsPerProject: 4 }]
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
