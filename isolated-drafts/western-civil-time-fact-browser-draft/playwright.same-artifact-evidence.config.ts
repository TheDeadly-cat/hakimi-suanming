import { lstatSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
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
  const raw = process.env.HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT must be absolute");
  }
  const resolved = path.resolve(raw);
  if (!/^hakimi-western-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))) {
    throw new Error("Western evidence temp root must use the runner-owned UUID leaf");
  }
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || (!samePath(real, systemTemp)
        && (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)))) {
    throw new Error("Western evidence temp root must be the isolated process temp or its real child");
  }
  return real;
}

const evidenceTempRoot = requiredTemporaryRoot();

function requiredChildDirectory(environmentName: string): string {
  const raw = process.env[environmentName];
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error(`${environmentName} must be absolute`);
  }
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const relative = path.relative(evidenceTempRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${environmentName} must be a real child of the evidence temp root`);
  }
  return real;
}

function requiredOutputFile(environmentName: string): string {
  const raw = process.env[environmentName];
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error(`${environmentName} must be absolute`);
  }
  const resolved = path.resolve(raw);
  const parent = path.dirname(resolved);
  const stat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const relative = path.relative(evidenceTempRoot, realParent);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${environmentName} parent must be a real child of the evidence temp root`);
  }
  return path.join(realParent, path.basename(resolved));
}

const baseURL = process.env.HAKIMI_WESTERN_EVIDENCE_BASE_URL;
if (typeof baseURL !== "string" || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/u.test(baseURL)) {
  throw new Error("HAKIMI_WESTERN_EVIDENCE_BASE_URL must be an exact loopback HTTP origin");
}
const outputTreeDigest = process.env.HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256;
if (typeof outputTreeDigest !== "string" || !/^[a-f0-9]{64}$/u.test(outputTreeDigest)) {
  throw new Error("HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256 must be SHA-256");
}
const ianaEvidencePath = process.env.HAKIMI_WESTERN_EVIDENCE_IANA_PATH;
if (typeof ianaEvidencePath !== "string"
    || !/^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u.test(ianaEvidencePath)) {
  throw new Error("HAKIMI_WESTERN_EVIDENCE_IANA_PATH must be one exact retained-output path");
}

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const summaryPath = requiredOutputFile("HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH");
const outputDir = requiredChildDirectory("HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR");
const configProbe = process.env.HAKIMI_WESTERN_EVIDENCE_CONFIG_PROBE === "1";

export default defineConfig({
  testDir: path.join(configDirectory, "e2e"),
  testMatch: "civil-time-browser-gate.spec.ts",
  outputDir,
  globalTimeout: 20 * 60_000,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [[path.join(configDirectory, "e2e", "same-artifact-summary-reporter.ts"), {
    summaryPath,
    configProbe
  }]],
  use: {
    baseURL,
    acceptDownloads: false,
    trace: "off",
    screenshot: "off",
    video: "off"
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        extraHTTPHeaders: { "x-hakimi-western-evidence-project": "chrome" }
      }
    },
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        extraHTTPHeaders: { "x-hakimi-western-evidence-project": "msedge" }
      }
    }
  ]
});
