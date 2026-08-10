import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Isolated P2-05 release gate. The spec owns two immutable build generations,
 * one switch server and one persistent browser profile, so it must remain
 * serial. The root gate script pins Edge; Chrome stays listed for an explicit
 * follow-up run and must not be reported as passing until that run occurs.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "schema-v16-clean-start-capacity.spec.ts",
  outputDir: path.join(os.tmpdir(), "hakimi-bazi-schema-v16-clean-start-capacity-results"),
  timeout: 600_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
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
  ]
});
