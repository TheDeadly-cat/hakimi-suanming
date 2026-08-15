import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4218";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "core-minor-sanfang-review-v013.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-ziwei-v013-playwright-results"),
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    acceptDownloads: true,
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
    },
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome"
      }
    }
  ],
  webServer: {
    command:
      "node ../../apps/web/node_modules/vite/bin/vite.js preview"
      + " --config vite.browser-app.config.mjs --configLoader runner"
      + " --host 127.0.0.1 --port 4218 --strictPort",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
