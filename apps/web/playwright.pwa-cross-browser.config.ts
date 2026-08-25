import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "./playwright.release-browser-matrix.ts";

const baseURL = "http://127.0.0.1:4197";
const strictReporter = fileURLToPath(new URL(
  "./playwright.release-browser-strict-reporter.ts",
  import.meta.url
));

export default defineConfig({
  testDir: "./e2e",
  testMatch: "pwa-install-and-offline-cold-start.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-pwa-cross-browser-results"),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  reporter: [
    ["line"],
    [strictReporter, { receiptId: "pwa", expectedTestsPerProject: 1 }]
  ],
  use: {
    baseURL,
    acceptDownloads: true,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: RELEASE_BROWSER_MATRIX.map((browser) => ({
    name: browser.projectName,
    metadata: {
      releaseBrowserId: browser.policyId,
      browserChannel: browser.channel,
      releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY
    },
    use: {
      ...releaseBrowserNativeDeviceOptions(browser),
      channel: browser.channel
    }
  })),
  webServer: {
    command: "npm run serve:e2e --workspace @hakimi/web",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
