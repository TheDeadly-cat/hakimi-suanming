import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4197";

export default defineConfig({
  testDir: "./e2e",
  // Retained historical assertions describe the former activation policy.
  // Current legacy boundaries run through the three dedicated migration configs.
  testIgnore: [
    "**/service-worker-cross-schema-upgrade.spec.ts",
    "**/service-worker-cross-schema-v13-v15.spec.ts",
    "**/service-worker-cross-schema-v14-v15.spec.ts"
  ],
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-playwright-results"),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    acceptDownloads: true,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge"
      }
    }
  ],
  webServer: {
    command: "npm run serve:e2e --workspace @hakimi/web",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
