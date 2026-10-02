import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.local-data-boundaries.config.ts";

const outputDir = path.join(os.tmpdir(), "hakimi-bazi-journal-tag-artifact",
  new Date().toISOString().replace(/[:.]/gu, "-") + "-" + process.pid);

// A scoped local regression. The existing persistent-delivery matrix supplies
// its own strict completeness report; this is not a formal release receipt.
export default defineConfig({
  ...baseConfig,
  testMatch: "journal-tag-artifact.spec.ts",
  outputDir,
  timeout: 300_000,
  reporter: [["line"], ["json", { outputFile: path.join(outputDir, "results.json") }]],
  projects: baseConfig.projects?.map(project => ({
    ...project, metadata: { ...project.metadata, scope: "local-journal-tag-artifact" }
  }))
});
