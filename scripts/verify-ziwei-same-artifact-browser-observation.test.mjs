import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ZIWEI_SAME_ARTIFACT_CANDIDATE_PATH,
  ZiweiSameArtifactObservationError,
  canonicalStringify,
  loadZiweiSameArtifactCandidate,
  verifyZiweiSameArtifactCandidateObject,
  ziweiSameArtifactObservationTestOnly
} from "./ziwei-same-artifact-browser-observation-lib.mjs";
import { runZiweiSameArtifactCandidateRenderer } from
  "./render-ziwei-same-artifact-browser-observation-candidate.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const verifierPath = path.join(scriptDir, "verify-ziwei-same-artifact-browser-observation.mjs");
const rendererPath = path.join(scriptDir, "render-ziwei-same-artifact-browser-observation-candidate.mjs");

function loadRawCandidate() {
  return JSON.parse(readFileSync(
    path.join(workspaceRoot, ...ZIWEI_SAME_ARTIFACT_CANDIDATE_PATH.split("/")),
    "utf8"
  ));
}

function withRecomputedDigest(candidate) {
  candidate.observationDigest = ziweiSameArtifactObservationTestOnly.computeCandidateDigest(candidate);
  return candidate;
}

function assertCandidateCode(candidate, code) {
  assert.throws(
    () => verifyZiweiSameArtifactCandidateObject(withRecomputedDigest(candidate)),
    (error) => error instanceof ZiweiSameArtifactObservationError && error.code === code
  );
}

function createOwnedTestTemporaryRoot() {
  const temporaryRoot = realpathSync.native(os.tmpdir());
  const root = path.join(temporaryRoot, `hakimi-ziwei-renderer-test-${randomUUID()}`);
  mkdirSync(root, { recursive: false });
  const identity = lstatSync(root, { bigint: true });
  assert.equal(identity.isDirectory(), true);
  assert.equal(identity.isSymbolicLink(), false);
  assert.equal(realpathSync.native(root).toLowerCase(), root.toLowerCase());
  return { root, identity };
}

function cleanupOwnedTestTemporaryRoot(temporary) {
  if (!existsSync(temporary.root)) return;
  const current = lstatSync(temporary.root, { bigint: true });
  assert.equal(current.isDirectory(), true);
  assert.equal(current.isSymbolicLink(), false);
  assert.equal(current.dev, temporary.identity.dev);
  assert.equal(current.ino, temporary.identity.ino);
  assert.equal(realpathSync.native(temporary.root).toLowerCase(), temporary.root.toLowerCase());
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else assert.equal(entry.isFile(), true);
    }
  };
  visit(temporary.root);
  rmSync(temporary.root, { recursive: true, force: false });
}

test("current candidate binds the current source, tooling, formal context, and exact 28 outcomes", () => {
  const result = loadZiweiSameArtifactCandidate(workspaceRoot);
  const candidate = result.candidate;
  assert.match(result.rawSha256, /^[a-f0-9]{64}$/u);
  assert.equal(candidate.status, "isolated_engineering_browser_observation_only_not_admitted");
  assert.equal(candidate.buildSourceSnapshot.fileCount, 50);
  assert.deepEqual(
    candidate.buildSourceSnapshot.files
      .map((entry) => entry.path)
      .filter((entry) => entry.endsWith("tsconfig.json") || entry === "tsconfig.base.json"),
    [
      "tsconfig.base.json",
      "packages/ziwei-doushu-contracts-draft/tsconfig.json",
      "packages/ziwei-iztro-adapter-draft/tsconfig.json",
      "packages/ziwei-workspace-artifact-draft/tsconfig.json"
    ]
  );
  assert.equal(candidate.runtimeObservation.buildExecutionCount, 1);
  assert.equal(candidate.runtimeObservation.playwrightSummary.passedOutcomeCount, 28);
  assert.deepEqual(
    candidate.runtimeObservation.browserProbes.map((entry) => entry.projectName),
    ["chrome", "msedge"]
  );
  assert.equal(candidate.runtimeObservation.server.servedArtifactsByProject.length, 2);
  assert.deepEqual(
    candidate.runtimeObservation.server.servedArtifactsByProject[0].servedArtifacts,
    candidate.runtimeObservation.server.servedArtifactsByProject[1].servedArtifacts
  );
  assert.equal(candidate.storageBackupRecoveryBoundary.fullStorageSnapshotComparisonScenariosPerBrowser, 2);
  assert.equal(candidate.storageBackupRecoveryBoundary.visibleOrScenarioSpecificAssertionsPerBrowser, 12);
  assert.equal(candidate.storageBackupRecoveryBoundary.completeStorageValueCoverageAcrossAllScenarios, false);
  assert.equal(candidate.authorityBoundary.releaseReady, false);
  assert.equal(candidate.authorityBoundary.publicDeploymentAuthorized, false);
  assert.equal(candidate.authorityBoundary.publicReleaseAuthorized, false);
  assert.equal(candidate.authorityBoundary.expertClaimsAuthorized, false);
  assert.ok(Object.values(candidate.formalReceiptCounts).every((value) => value === 0));
});

test("normalized Playwright summary is idempotent and keeps exact fixed registry order", () => {
  const summary = loadRawCandidate().runtimeObservation.playwrightSummary;
  const normalized = ziweiSameArtifactObservationTestOnly.normalizePlaywrightSummary(summary);
  assert.equal(canonicalStringify(normalized), canonicalStringify(summary));
  assert.equal(normalized.outcomes.length, 28);
});

test("candidate excludes raw fixture markers and fixes its data-handling boundary", () => {
  const candidate = loadRawCandidate();
  const serialized = JSON.stringify(candidate);
  for (const marker of [
    "1991-02-14",
    "浏览器示例审稿人",
    "正反并见，取决于条件",
    "filled-ziwei-review.json",
    "hakimi-ziwei-workspace-backup.json",
    "ziwei-natal-transformation-desktop.png",
    "损坏备份样本",
    "此人必然死亡。"
  ]) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.deepEqual(candidate.runtimeObservation.dataHandling, {
    syntheticInputsOnly: true,
    actualPersonDataEntered: false,
    candidateAnonymous: false,
    rawBirthInputIncluded: false,
    derivedChartDigestIncluded: false,
    feedbackNarrativeIncluded: false,
    backupBodyOrDigestIncluded: false,
    revisionOrStudyIdentifiersIncluded: false,
    screenshotTraceVideoOrDownloadIncluded: false,
    rawPlaywrightReportIncluded: false,
    safeToLog: false,
    safeToPublish: false
  });
});

test("candidate verifier rejects authority, receipt, storage, outcome, and browser-ledger promotion", () => {
  const authority = structuredClone(loadRawCandidate());
  authority.authorityBoundary.publicReleaseAuthorized = true;
  assertCandidateCode(authority, "AUTHORITY_PROMOTION");

  const receipt = structuredClone(loadRawCandidate());
  receipt.formalReceiptCounts.productionBrowserReceipts = 1;
  assertCandidateCode(receipt, "AUTHORITY_PROMOTION");

  const storage = structuredClone(loadRawCandidate());
  storage.storageBackupRecoveryBoundary.completeStorageValueCoverageAcrossAllScenarios = true;
  assertCandidateCode(storage, "BOUNDARY_PROMOTION");

  const outcome = structuredClone(loadRawCandidate());
  outcome.runtimeObservation.playwrightSummary.outcomes[1] = structuredClone(
    outcome.runtimeObservation.playwrightSummary.outcomes[0]
  );
  assertCandidateCode(outcome, "PLAYWRIGHT_OUTCOME_DUPLICATE");

  const ledger = structuredClone(loadRawCandidate());
  ledger.runtimeObservation.server.servedArtifactsByProject[0].servedArtifacts.pop();
  assertCandidateCode(ledger, "SERVED_PROJECT_LEDGER_INVALID");
});

test("frozen renderer rebuilds the exact candidate from sanitized runtime evidence in system temp", (context) => {
  const candidate = loadRawCandidate();
  const temporary = createOwnedTestTemporaryRoot();
  context.after(() => cleanupOwnedTestTemporaryRoot(temporary));
  const runtimePath = path.join(
    temporary.root,
    `hakimi-ziwei-same-artifact-runtime-${randomUUID()}.json`
  );
  const outputPath = path.join(
    temporary.root,
    `hakimi-ziwei-same-artifact-candidate-${randomUUID()}.json`
  );
  writeFileSync(runtimePath, `${JSON.stringify(candidate.runtimeObservation)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  let stdoutText = "";
  let stderrText = "";
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const code = runZiweiSameArtifactCandidateRenderer({
    argv: [process.execPath, rendererPath, "--runtime", runtimePath, "--candidate-out", outputPath],
    env: cleanEnv,
    stdout: { write: (value) => { stdoutText += value; } },
    stderr: { write: (value) => { stderrText += value; } }
  });
  assert.equal(code, 0, stderrText);
  assert.equal(JSON.parse(stdoutText).authorityRaised, false);
  assert.equal(
    canonicalStringify(JSON.parse(readFileSync(outputPath, "utf8"))),
    canonicalStringify(candidate)
  );
});

test("verifier CLI accepts zero operands and rejects operands plus loader-injection variables", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [verifierPath], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000
  });
  assert.equal(success.status, 0, success.stderr);
  const summary = JSON.parse(success.stdout);
  assert.equal(summary.passedOutcomeCount, 28);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicReleaseAuthorized, false);

  const operand = spawnSync(process.execPath, [verifierPath, "extra"], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(operand.status, 2);
  assert.match(operand.stderr, /OPERANDS_FORBIDDEN/u);

  for (const variable of ["NODE_OPTIONS", "NODE_PATH"]) {
    const rejected = spawnSync(process.execPath, [verifierPath], {
      cwd: workspaceRoot,
      env: { ...cleanEnv, [variable]: "" },
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(rejected.status, 2, variable);
    assert.match(rejected.stderr, /NODE_ENV_FORBIDDEN/u);
  }
});
