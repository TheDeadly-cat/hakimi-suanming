import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import {
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "./playwright.release-browser-matrix.ts";
import {
  SW_TWO_GENERATION_FIXTURE_CONTRACT_ID
} from "./playwright.sw-two-generation-fixture-result.ts";

const fixtureReporter = fileURLToPath(new URL(
  "./playwright.sw-two-generation-fixture-reporter.ts",
  import.meta.url
));

export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-worker-two-generation.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-sw-upgrade-results"),
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reporter: [
    ["line"],
    [fixtureReporter, {}]
  ],
  use: {
    serviceWorkers: "allow",
    video: "off"
  },
  projects: RELEASE_BROWSER_MATRIX.map((browser) => ({
    name: browser.projectName,
    metadata: {
      fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
      evidenceClass: "local_synthetic_fixture_only",
      artifactBinding: "shared_runner_owned_artifact_set_v1",
      browserChannel: browser.channel
    },
    use: {
      ...releaseBrowserNativeDeviceOptions(browser),
      channel: browser.channel
    }
  }))
});
