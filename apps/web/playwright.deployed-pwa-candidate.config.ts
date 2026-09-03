import os from "node:os";
import path from "node:path";

import { defineConfig } from "@playwright/test";

import { parseDeployedPwaCandidateEnvironment } from "../../scripts/deployed-pwa-candidate-runtime.mjs";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "./playwright.release-browser-matrix.ts";

const candidate = parseDeployedPwaCandidateEnvironment(process.env);

/**
 * External-origin candidate capture only. This configuration never starts a
 * server, never builds an artifact, and never turns a candidate receipt into a
 * trusted deployed-PWA result. Missing or non-canonical environment input
 * throws while Playwright loads the configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "deployed-pwa-candidate.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-deployed-pwa-candidate-playwright-results"),
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: candidate.origin,
    acceptDownloads: false,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: RELEASE_BROWSER_MATRIX.map((browser) => ({
    name: browser.projectName,
    metadata: {
      evidenceClass: "untrusted_deployed_pwa_candidate_v3",
      releaseBrowserId: browser.policyId,
      browserChannel: browser.channel,
      releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
      targetOrigin: candidate.origin,
      releaseEvidenceId: candidate.releaseEvidenceId,
      runId: candidate.runId
    },
    use: {
      ...releaseBrowserNativeDeviceOptions(browser),
      channel: browser.channel
    }
  }))
});
