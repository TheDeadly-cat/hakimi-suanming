import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.local-data-boundaries.config";

const outputDir = path.join(os.tmpdir(), "hakimi-bazi-persistent-file-delivery",
  new Date().toISOString().replace(/[:.]/gu, "-") + "-" + process.pid);

export default defineConfig({
  ...baseConfig,
  testMatch: ["persistent-file-delivery.spec.ts", "chosen-location-delivery.spec.ts"],
  outputDir,
  timeout: 360_000,
  expect: { timeout: 30_000 },
  reporter: [
    ["line"], ["json", { outputFile: path.join(outputDir, "results.json") }],
    [fileURLToPath(new URL("./playwright.persistent-file-delivery-reporter.ts", import.meta.url)),
      { outputFile: path.join(outputDir, "completion.json") }]
  ],
  projects: baseConfig.projects!.flatMap(project => [true, false].map(headless => ({
    ...project,
    name: project.name + (headless ? "-headless" : "-headed"),
    metadata: { ...project.metadata, releaseBrowserProject: project.name,
      scope: "local-locked-v13-persistent-file-delivery", formalReleaseEvidenceReceipt: false },
    use: { ...project.use, headless, viewport: { width: 1280, height: 800 } }
  })))
});
