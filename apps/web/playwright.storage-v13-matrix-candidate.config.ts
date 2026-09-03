import os from "node:os";
import path from "node:path";

import { defineConfig } from "@playwright/test";

import { parseStorageV13MatrixCandidateEnvironment } from "../../scripts/storage-v13-matrix-candidate-runtime.mjs";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "./playwright.release-browser-matrix.ts";

const candidate = parseStorageV13MatrixCandidateEnvironment(process.env);

/**
 * Locked-artifact candidate capture only. This configuration never starts a
 * server and never builds, promotes, deploys, or adds a formal Release Evidence
 * receipt. Missing explicit HTTPS/artifact inputs fail while the config loads.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "storage-v13-matrix-candidate.spec.ts",
  globalSetup: "./playwright.storage-v13-matrix-candidate-global-setup.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-storage-v13-matrix-candidate-results"),
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reporter: [
    ["line"],
    ["./playwright.storage-v13-matrix-candidate-reporter.ts"]
  ],
  use: {
    baseURL: candidate.origin,
    acceptDownloads: true,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: RELEASE_BROWSER_MATRIX.map((browser) => ({
    name: browser.projectName,
    metadata: {
      evidenceClass: "untrusted_storage_v13_matrix_candidate_v2",
      formalReleaseEvidenceReceipt: false,
      releaseBrowserId: browser.policyId,
      browserChannel: browser.channel,
      releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
      targetOrigin: candidate.origin,
      releaseEvidenceId: candidate.releaseEvidenceId,
      runId: candidate.runId,
      attemptId: candidate.attemptId
    },
    use: {
      ...releaseBrowserNativeDeviceOptions(browser),
      channel: browser.channel
    }
  }))
});
