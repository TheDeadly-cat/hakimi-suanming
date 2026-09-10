import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  relativePathWithin,
  releaseCommandInvocation,
  sha256,
  isReleaseLifecycleReceiptId,
  readStableRegularFileSnapshot,
  verifyReleaseLifecyclePhaseReportBinding
} from "./release-evidence-lib.mjs";
import {
  assertStrictReleaseBrowserResultSummary,
  isReleaseBrowserCompletionReceiptId,
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
const lifecycleReportRequired = isReleaseLifecycleReceiptId(id);
let lifecycleContext = null;
if (lifecycleReportRequired) {
  await mkdir(path.dirname(output), { recursive: true });
  const directory = await mkdtemp(path.join(path.dirname(output), `.lifecycle-${id}-`));
  lifecycleContext = { runId: randomUUID(), directory, reportOutput: path.join(directory, "terminal.json") };
}
const browserResultRequired = isReleaseBrowserCompletionReceiptId(id);
// Cross-Schema fixtures prove test completion using their own artifacts. Only
// the original four browser receipts consume the locked default-v13 dist.
const artifactIdentityRequired = isReleaseBrowserReceiptId(id);
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
if (artifactIdentityRequired) {
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
const result = artifactIdentityRequired && artifactIdentityBeforeCommand === null
  ? { exitCode: null, signal: null, launchError: artifactIdentityBindingFailure }
  : await (async () => {
  try {
    const child = spawn(invocation.executable, invocation.args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...(browserResultOutput ? {
          HAKIMI_RELEASE_BROWSER_RECEIPT_ID: id,
          HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT: browserResultOutput
        } : {}),
        // Never inherit a prior run's phase-output context, including when the
        // requested command belongs to a different kind of receipt.
        HAKIMI_RELEASE_LIFECYCLE_RUN_ID: lifecycleContext?.runId ?? "",
        HAKIMI_RELEASE_LIFECYCLE_RECEIPT_ID: lifecycleContext ? id : "",
        HAKIMI_RELEASE_LIFECYCLE_REPORT_OUTPUT: lifecycleContext?.reportOutput ?? ""
      },
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
if (artifactIdentityRequired && artifactIdentityBeforeCommand !== null) {
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
let lifecyclePhaseReport = null;
let lifecyclePhaseReportError = null;
let candidateProgramStarted = null;
if (lifecycleContext) {
  try {
    const snapshot = await readStableRegularFileSnapshot(lifecycleContext.reportOutput, {
      containmentRoot: lifecycleContext.directory,
      label: "Current npm lifecycle phase report"
    });
    const candidate = JSON.parse(snapshot.bytes.toString("utf8"));
    lifecyclePhaseReport = {
      path: relativePathWithin(process.cwd(), lifecycleContext.reportOutput, "Lifecycle phase report"),
      sha256: snapshot.sha256
    };
    // This value is only a candidate until the shared consumer checks the full
    // report, fixed plan, package identities and outer process result below.
    candidateProgramStarted = candidate.programStarted;
  } catch (error) {
    lifecyclePhaseReportError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }
}
let passed = result.exitCode === 0
  && result.launchError === null
  && (!browserResultRequired || browserResultSummary !== null)
  && (!artifactIdentityRequired || artifactIdentityBinding !== null);
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
  ...(lifecycleReportRequired ? {
    lifecycleRunId: lifecycleContext.runId,
    lifecyclePhaseReport,
    lifecyclePhaseReportError,
    programStarted: candidateProgramStarted
  } : {}),
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
if (lifecycleReportRequired) {
  try {
    if (lifecyclePhaseReportError !== null) throw new Error(lifecyclePhaseReportError);
    const verified = await verifyReleaseLifecyclePhaseReportBinding({
      cwd: process.cwd(), receiptsDirectory: path.dirname(output), receipt
    });
    if (verified === null) throw new Error("Required npm lifecycle phase report was not verified.");
  } catch (error) {
    passed = false;
    receipt.status = "failed";
    receipt.programStarted = null;
    receipt.lifecyclePhaseReportError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
if (!passed) process.exitCode = result.exitCode && result.exitCode !== 0 ? result.exitCode : 1;
