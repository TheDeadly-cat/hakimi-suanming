import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  relativePathWithin,
  releaseCommandInvocation,
  sha256
} from "./release-evidence-lib.mjs";
import {
  assertStrictReleaseBrowserResultSummary,
  isReleaseBrowserReceiptId
} from "../apps/web/playwright.release-browser-result.ts";
import {
  buildReleaseArtifactReceiptBinding,
  verifyReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";

const separator = process.argv.indexOf("--");
if (separator < 0) throw new Error("Expected -- before the command to execute.");
const options = process.argv.slice(2, separator);
const command = process.argv[separator + 1];
const commandArgs = process.argv.slice(separator + 2);
if (!command) throw new Error("Release evidence command is empty.");

function option(name) {
  const index = options.indexOf(name);
  if (index < 0 || !options[index + 1]) throw new Error(`Missing ${name}.`);
  return options[index + 1];
}

const id = option("--id");
if (!/^[a-z0-9][a-z0-9-]*$/u.test(id)) throw new Error("Receipt id is not canonical.");
const evidenceId = process.env.HAKIMI_RELEASE_EVIDENCE_ID ?? null;
if (evidenceId !== null && !/^hre1-[a-f0-9]{32}$/u.test(evidenceId)) {
  throw new Error("HAKIMI_RELEASE_EVIDENCE_ID is not canonical.");
}
const output = path.resolve(option("--output"));
relativePathWithin(process.cwd(), output, "Receipt output");
const browserResultRequired = isReleaseBrowserReceiptId(id);
const browserResultOutput = browserResultRequired
  ? path.join(
    path.dirname(output),
    "browser-results",
    `${id}-${process.pid}-${randomUUID()}.json`
  )
  : null;
if (browserResultOutput) {
  relativePathWithin(path.dirname(output), browserResultOutput, "Browser result output");
}
const startedAt = new Date();
const started = Date.now();
const invocation = releaseCommandInvocation(command, commandArgs);
let artifactIdentityBeforeCommand = null;
let artifactIdentityBinding = null;
let artifactIdentityBindingFailure = null;
if (browserResultRequired) {
  try {
    if (evidenceId === null) {
      throw new Error("Formal release browser receipts require HAKIMI_RELEASE_EVIDENCE_ID.");
    }
    artifactIdentityBeforeCommand = await verifyReleaseArtifactIdentityLock({
      cwd: process.cwd(),
      dist: path.resolve(process.cwd(), "dist/web"),
      lockPath: path.resolve(process.cwd(), "tmp/release-artifact-identity.json"),
      evidenceId
    });
  } catch (error) {
    artifactIdentityBindingFailure = error;
  }
}
const result = browserResultRequired && artifactIdentityBeforeCommand === null
  ? { exitCode: null, signal: null, launchError: artifactIdentityBindingFailure }
  : await (async () => {
  try {
    const child = spawn(invocation.executable, invocation.args, {
      cwd: process.cwd(),
      env: browserResultOutput
        ? {
          ...process.env,
          HAKIMI_RELEASE_BROWSER_RECEIPT_ID: id,
          HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT: browserResultOutput
        }
        : process.env,
      shell: false,
      stdio: "inherit",
      windowsHide: true
    });
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      child.once("error", (error) => finish({ exitCode: null, signal: null, launchError: error }));
      child.once("close", (exitCode, signal) => finish({ exitCode, signal, launchError: null }));
    });
  } catch (error) {
    return { exitCode: null, signal: null, launchError: error };
  }
})();
if (browserResultRequired && artifactIdentityBeforeCommand !== null) {
  try {
    const artifactIdentityAfterCommand = await verifyReleaseArtifactIdentityLock({
      cwd: process.cwd(),
      dist: path.resolve(process.cwd(), "dist/web"),
      lockPath: path.resolve(process.cwd(), "tmp/release-artifact-identity.json"),
      evidenceId
    });
    artifactIdentityBinding = buildReleaseArtifactReceiptBinding({
      beforeCommand: artifactIdentityBeforeCommand,
      afterCommand: artifactIdentityAfterCommand
    });
  } catch (error) {
    artifactIdentityBindingFailure = error;
  }
}
let browserResultSummary = null;
let browserResultSummaryError = null;
if (browserResultOutput) {
  try {
    const browserResultBytes = await readFile(browserResultOutput);
    const summary = JSON.parse(browserResultBytes.toString("utf8"));
    assertStrictReleaseBrowserResultSummary(summary, id);
    browserResultSummary = {
      path: relativePathWithin(process.cwd(), browserResultOutput, "Browser result output"),
      sha256: sha256(browserResultBytes),
      summary
    };
  } catch (error) {
    browserResultSummaryError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }
}
const passed = result.exitCode === 0
  && result.launchError === null
  && (!browserResultRequired
    || (browserResultSummary !== null && artifactIdentityBinding !== null));
const receipt = {
  schemaVersion: 1,
  receiptType: "release_test_command",
  id,
  evidenceId,
  command: [command, ...commandArgs],
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  durationMs: Date.now() - started,
  status: passed ? "passed" : "failed",
  exitCode: result.exitCode,
  signal: result.signal,
  launchErrorCode: result.launchError && typeof result.launchError === "object" && "code" in result.launchError
    ? String(result.launchError.code)
    : null,
  browserResultSummary,
  browserResultSummaryError,
  artifactIdentityBinding,
  artifactIdentityBindingError: artifactIdentityBindingFailure === null
    ? null
    : (artifactIdentityBindingFailure instanceof Error
      ? artifactIdentityBindingFailure.message
      : String(artifactIdentityBindingFailure)).slice(0, 500),
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    ci: process.env.CI === "true"
  }
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
if (!passed) process.exitCode = result.exitCode && result.exitCode !== 0 ? result.exitCode : 1;
