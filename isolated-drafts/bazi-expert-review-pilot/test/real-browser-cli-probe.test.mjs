import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SOURCE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WRAPPER_PATH = resolve(SOURCE_ROOT, "pair-compare-session-launcher-candidate.ps1");
const POWERSHELL = resolve(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);

function runWrapper(args) {
  return spawnSync(POWERSHELL, [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    WRAPPER_PATH,
    ...args
  ], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
}

function exactDigest(stdout, label) {
  const matches = [...stdout.matchAll(new RegExp(`^${label} ([a-f0-9]{64})$`, "gmu"))];
  assert.equal(matches.length, 1, `${label} must occur exactly once`);
  return matches[0][1];
}

for (const browserFamily of ["chrome", "edge"]) {
  test(`real ${browserFamily} clean-profile CLI produces only a post-cleanup final observation`, () => {
    const observed = runWrapper(["--observe", "--browser-family", browserFamily]);
    assert.equal(observed.status, 0, observed.stderr || observed.stdout);
    assert.equal(observed.stderr, "");
    const sourceDigest = exactDigest(observed.stdout, "PAIR_COMPARE_VIEWER_SOURCE_SHA256");
    const browserDigest = exactDigest(observed.stdout, "PAIR_COMPARE_BROWSER_EXECUTABLE_SHA256");
    assert.match(observed.stdout, /^PAIR_COMPARE_OBSERVATION_AUTHORITY none$/mu);

    const probed = runWrapper([
      "--probe",
      "--owner-decision",
      "synthetic_fixture_visual_qa_only_approved",
      "--viewer-source-sha256",
      sourceDigest,
      "--browser-family",
      browserFamily,
      "--browser-executable-sha256",
      browserDigest
    ]);
    assert.equal(probed.status, 0, probed.stderr || probed.stdout);
    assert.equal(probed.stderr, "");
    const lines = probed.stdout.trim().split(/\r?\n/u);
    assert.equal(lines[0], "PAIR_COMPARE_SYNTHETIC_SESSION_STARTED");
    assert.equal(lines.at(-1), "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSED");
    const runtimeLines = lines.filter((line) => line.startsWith("PAIR_COMPARE_SYNTHETIC_RUNTIME_PROBE "));
    assert.equal(runtimeLines.length, 1);
    assert.doesNotMatch(probed.stdout, /cdp_precleanup_probe_candidate/u);

    const finalObservation = JSON.parse(runtimeLines[0].slice("PAIR_COMPARE_SYNTHETIC_RUNTIME_PROBE ".length));
    assert.equal(finalObservation.recordType, "bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1");
    assert.equal(finalObservation.viewerSourceBundleSha256, sourceDigest);
    assert.equal(finalObservation.browserInstallCandidateFamily, browserFamily);
    assert.equal(finalObservation.browserExecutableRawSha256, browserDigest);
    assert.equal(finalObservation.testAdapterUsed, false);
    assert.equal(finalObservation.cleanupObserved, true);
    assert.equal(finalObservation.checks.syntheticSelfCheckPassed, true);
    assert.equal(finalObservation.checks.spawnedBrowserProcessHandleZeroExitObserved, true);
    assert.equal(finalObservation.checks.gracefulBrowserCloseCommandDispatchedObserved, true);
    assert.equal(finalObservation.checks.zeroExitObservedAfterGracefulBrowserCloseDispatch, true);
    assert.equal(finalObservation.checks.forcedTerminationFallbackUsed, false);
    assert.equal(finalObservation.checks.initialEndpointIdentityMatchedBeforeRemovalAttemptObserved, true);
    assert.equal(finalObservation.checks.boundedRepeatedPathAbsenceAfterRemovalAttemptObserved, true);
    assert.equal(finalObservation.boundary.browserProcessTreeClosureEstablished, false);
    assert.equal(finalObservation.boundary.expertTruthEstablished, false);
    assert.equal(finalObservation.boundary.publicReleaseAuthorized, false);
  });
}
