import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.pwa-cross-browser.config.ts";

/** Local diagnostics against an existing lock; not a formal Release Evidence receipt. */
export default defineConfig({
  ...baseConfig,
  testMatch: [
    "local-data-recovery-boundaries.spec.ts",
    "local-data-readonly-recovery.spec.ts",
    "local-product-flows.spec.ts",
    "local-ai-source-resilience.spec.ts",
    "full-backup-worker-capacity.spec.ts"
  ],
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-local-data-boundaries-results"),
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reporter: "line",
  use: { ...baseConfig.use, trace: "on" },
  projects: baseConfig.projects?.map(project => ({
    ...project,
    metadata: {
      ...project.metadata,
      scope: "local-locked-v13-data-boundaries",
      formalReleaseEvidenceReceipt: false,
      oldV13ArtifactVerified: false
    }
  })),
  webServer: {
    command: "npm run preview:release-artifact --workspace @hakimi/web",
    url: "http://127.0.0.1:4197/",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
