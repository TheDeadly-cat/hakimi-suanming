import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4197";

/**
 * P2-05 real-browser heavy dataset gate. The spec restores a Node-built
 * full v1.2 backup, runs deterministic research queries and cancels a 10k
 * full-backup export; it must stay serial because it owns one browser profile
 * and one dataset. The root gate script pins Edge; Chrome stays listed for an
 * explicit follow-up run and must not be reported as passing until that run
 * occurs.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "p2-05-heavy-browser-gate.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-p2-05-heavy-browser-results"),
  timeout: 600_000,
  expect: { timeout: 30_000 },
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
    command: "npm run serve:e2e --workspace @hakimi/web",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
