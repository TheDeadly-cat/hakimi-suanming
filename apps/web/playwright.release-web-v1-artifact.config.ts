import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.web-v1-cross-browser.config.ts";

export default defineConfig({
  ...baseConfig,
  webServer: {
    command: "npm run preview:release-artifact --workspace @hakimi/web",
    url: "http://127.0.0.1:4197/",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
