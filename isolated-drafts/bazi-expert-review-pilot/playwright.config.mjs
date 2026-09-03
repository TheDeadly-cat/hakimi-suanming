import { defineConfig } from "@playwright/test";

const browserExecutable = process.env.HAKIMI_PILOT_BROWSER_EXECUTABLE?.trim();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4178",
    browserName: "chromium",
    ...(browserExecutable ? { launchOptions: { executablePath: browserExecutable } } : {}),
    colorScheme: "light",
    locale: "zh-CN",
    serviceWorkers: "block",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "node server.mjs --entry seat-a.html --port 4178",
      url: "http://127.0.0.1:4178/seat-a.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node pair-compare-server.mjs --port 4179",
      url: "http://127.0.0.1:4179/pair-compare.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node pair-compare-synthetic-server.mjs --port 4180",
      url: "http://127.0.0.1:4180/pair-compare-synthetic.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node single-binding-rehearsal-server.mjs --seat A --port 4181",
      url: "http://127.0.0.1:4181/single-binding-rehearsal-a.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node single-binding-rehearsal-server.mjs --seat B --port 4182",
      url: "http://127.0.0.1:4182/single-binding-rehearsal-b.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node single-binding-integrated-server.mjs --seat A --port 4191 --source-tree-demo",
      url: "http://127.0.0.1:4191/single-binding-integrated-a.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node single-binding-integrated-server.mjs --seat B --port 4192 --source-tree-demo",
      url: "http://127.0.0.1:4192/single-binding-integrated-b.html",
      reuseExistingServer: false,
      timeout: 20_000
    },
    {
      command: "node single-binding-integrated-pair-server.mjs --port 4193 --source-tree-demo",
      url: "http://127.0.0.1:4193/single-binding-integrated-pair.html",
      reuseExistingServer: false,
      timeout: 20_000
    }
  ]
});
