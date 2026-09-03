#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightCli = path.join(workspaceRoot, "node_modules", "playwright", "cli.js");
const candidateConfig = path.join(
  workspaceRoot,
  "apps",
  "web",
  "playwright.storage-v13-matrix-candidate.config.ts"
);
const ATTEMPT_ENVIRONMENT_KEY = "HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID";

if (process.argv.length !== 2) {
  process.stderr.write(
    "STORAGE_V13_MATRIX_CAPTURE_ARGUMENTS_FORBIDDEN: capture wrapper accepts no CLI arguments.\n"
  );
  process.exitCode = 64;
} else if (path.resolve(process.cwd()) !== workspaceRoot) {
  process.stderr.write(
    "STORAGE_V13_MATRIX_CAPTURE_CWD_INVALID: capture wrapper must run from its exact workspace root.\n"
  );
  process.exitCode = 64;
} else {
  const attemptId = `attempt-${randomBytes(32).toString("hex")}`;
  const exactArguments = [playwrightCli, "test", "--config", candidateConfig];
  const child = spawn(process.execPath, exactArguments, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      [ATTEMPT_ENVIRONMENT_KEY]: attemptId
    },
    shell: false,
    stdio: "inherit",
    windowsHide: true
  });
  const outcome = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  if (outcome.signal !== null) {
    process.stderr.write(
      `STORAGE_V13_MATRIX_CAPTURE_CHILD_SIGNAL: Playwright exited via ${outcome.signal}.\n`
    );
    process.exitCode = 1;
  } else {
    process.exitCode = outcome.code ?? 1;
  }
}
