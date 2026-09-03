import os from "node:os";
import path from "node:path";
import { lstatSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requiredTemporaryRoot(): string {
  const raw = process.env.HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT must be an absolute path");
  }
  const resolved = path.resolve(raw);
  if (!/^hakimi-ziwei-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))) {
    throw new Error("evidence temp root must use the runner-owned UUID leaf");
  }
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("evidence temp root must be a real directory strictly below system temp");
  }
  return real;
}

const evidenceTempRoot = requiredTemporaryRoot();

function requiredTemporaryDirectory(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string" || raw.length === 0 || !path.isAbsolute(raw)) {
    throw new Error(`${name} must be an absolute system-temporary path`);
  }
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const relative = path.relative(evidenceTempRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${name} must be a real directory strictly below the runner-owned temp root`);
  }
  return real;
}

function requiredTemporaryOutputFile(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string" || raw.length === 0 || !path.isAbsolute(raw)) {
    throw new Error(`${name} must be an absolute path`);
  }
  const resolved = path.resolve(raw);
  const parent = path.dirname(resolved);
  const stat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const relative = path.relative(evidenceTempRoot, realParent);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${name} parent must be a real directory below the runner-owned temp root`);
  }
  return path.join(realParent, path.basename(resolved));
}

const baseURL = process.env.HAKIMI_ZIWEI_EVIDENCE_BASE_URL;
if (typeof baseURL !== "string" || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/u.test(baseURL)) {
  throw new Error("HAKIMI_ZIWEI_EVIDENCE_BASE_URL must be an exact loopback HTTP origin");
}

const summaryPath = requiredTemporaryOutputFile("HAKIMI_ZIWEI_EVIDENCE_SUMMARY_PATH");
const outputDir = requiredTemporaryDirectory("HAKIMI_ZIWEI_EVIDENCE_PLAYWRIGHT_OUT_DIR");
const configDir = path.dirname(fileURLToPath(import.meta.url));
const configProbe = process.env.HAKIMI_ZIWEI_EVIDENCE_CONFIG_PROBE === "1";

export default defineConfig({
  testDir: path.join(configDir, "e2e"),
  testMatch: "workspace-browser-gate.spec.ts",
  outputDir,
  globalTimeout: 45 * 60_000,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [[path.join(configDir, "e2e", "same-artifact-summary-reporter.ts"), {
    summaryPath,
    configProbe
  }]],
  use: {
    baseURL,
    acceptDownloads: true,
    trace: "off",
    screenshot: "off",
    video: "off"
  },
  projects: [
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        extraHTTPHeaders: { "x-hakimi-ziwei-evidence-project": "msedge" }
      }
    },
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        extraHTTPHeaders: { "x-hakimi-ziwei-evidence-project": "chrome" }
      }
    }
  ]
});
