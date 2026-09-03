import { createHash, createHmac } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const PROJECT_HEADER = "x-hakimi-western-evidence-project";
const TOKEN_HEADER = "x-hakimi-western-evidence-run-token";
const TOKEN_DOMAIN = "hakimi.western.same-artifact.project-token.v1\0";

function samePath(left: string, right: string): boolean {
  const a = path.normalize(left);
  const b = path.normalize(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function requiredTemporaryRoot(): string {
  const raw = process.env.HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) throw new Error("evidence temp root missing");
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!/^hakimi-western-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))
      || !stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || (!samePath(real, systemTemp)
        && (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)))) {
    throw new Error("evidence temp root identity invalid");
  }
  return real;
}

const evidenceTempRoot = requiredTemporaryRoot();

function requiredChildDirectory(environmentName: string): string {
  const raw = process.env[environmentName];
  if (typeof raw !== "string" || !path.isAbsolute(raw)) throw new Error(`${environmentName} missing`);
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const relative = path.relative(evidenceTempRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${environmentName} identity invalid`);
  }
  return real;
}

function requiredOutputFile(environmentName: string): string {
  const raw = process.env[environmentName];
  if (typeof raw !== "string" || !path.isAbsolute(raw)) throw new Error(`${environmentName} missing`);
  const resolved = path.resolve(raw);
  const parent = realpathSync.native(path.dirname(resolved));
  const relative = path.relative(evidenceTempRoot, parent);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${environmentName} parent invalid`);
  }
  return path.join(parent, path.basename(resolved));
}

const rawNonce = process.env.HAKIMI_WESTERN_EVIDENCE_RUN_NONCE;
if (typeof rawNonce !== "string" || !/^[a-f0-9]{64}$/u.test(rawNonce)) {
  throw new Error("run nonce must be exactly 256 random bits encoded as lowercase hex");
}
const nonceCommitment = createHash("sha256").update(Buffer.from(rawNonce, "hex")).digest("hex");
if (process.env.HAKIMI_WESTERN_EVIDENCE_RUN_NONCE_COMMITMENT !== nonceCommitment) {
  throw new Error("run nonce commitment mismatch");
}
function token(projectName: "chrome" | "msedge"): string {
  return createHmac("sha256", Buffer.from(rawNonce, "hex"))
    .update(`${TOKEN_DOMAIN}${projectName}`, "utf8").digest("hex");
}

const baseURL = process.env.HAKIMI_WESTERN_EVIDENCE_BASE_URL;
if (typeof baseURL !== "string" || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/u.test(baseURL)) {
  throw new Error("base URL must be exact loopback origin");
}
const outputTreeDigest = process.env.HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256;
if (typeof outputTreeDigest !== "string" || !/^[a-f0-9]{64}$/u.test(outputTreeDigest)) {
  throw new Error("output tree digest missing");
}
const ianaEvidencePath = process.env.HAKIMI_WESTERN_EVIDENCE_IANA_PATH;
if (typeof ianaEvidencePath !== "string"
    || !/^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u.test(ianaEvidencePath)) {
  throw new Error("retained IANA evidence path missing");
}

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const summaryPath = requiredOutputFile("HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH");
const outputDir = requiredChildDirectory("HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR");
const configProbe = process.env.HAKIMI_WESTERN_EVIDENCE_CONFIG_PROBE === "1";

export default defineConfig({
  testDir: path.join(configDirectory, "e2e"),
  testMatch: "civil-time-browser-gate-v1-1.spec.ts",
  outputDir,
  globalTimeout: 20 * 60_000,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [[path.join(configDirectory, "e2e", "same-artifact-summary-reporter-v1-1.ts"), {
    summaryPath,
    nonceCommitment,
    configProbe
  }]],
  use: { baseURL, acceptDownloads: false, trace: "off", screenshot: "off", video: "off" },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        extraHTTPHeaders: { [PROJECT_HEADER]: "chrome", [TOKEN_HEADER]: token("chrome") }
      }
    },
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        extraHTTPHeaders: { [PROJECT_HEADER]: "msedge", [TOKEN_HEADER]: token("msedge") }
      }
    }
  ]
});
