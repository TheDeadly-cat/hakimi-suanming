import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4200";

/**
 * Runs the complete Web v1 flow against the isolated direct v13-to-v16
 * candidate without sharing the stable or Schema 15 preview processes.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "web-v1-continuous-flow.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-web-v1-v13-to-v16-cross-browser-results"),
  timeout: 540_000,
  expect: { timeout: 15_000 },
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
        channel: "msedge",
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: "chrome",
      use: {
        channel: "chrome",
        viewport: { width: 1280, height: 720 }
      }
    }
  ],
  webServer: {
    command: "npm run serve:e2e:v13-to-v16 --workspace @hakimi/web",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
