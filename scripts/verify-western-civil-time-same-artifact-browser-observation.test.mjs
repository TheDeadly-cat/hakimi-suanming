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
  WESTERN_E2E_ASSERTION_CONTRACT_BINDINGS,
  WESTERN_SAME_ARTIFACT_CANDIDATE_PATH,
  WesternSameArtifactObservationError,
  loadWesternSameArtifactCandidate,
  serializeWesternSameArtifactCandidate,
  westernSameArtifactTestOnly,
  verifyWesternSameArtifactCandidateObject
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";
import { runWesternSameArtifactCandidateRenderer } from
  "./render-western-civil-time-same-artifact-browser-observation-candidate.mjs";
import { runWesternSameArtifactBrowserObservationVerifier } from
  "./verify-western-civil-time-same-artifact-browser-observation.mjs";
import {
  classifyControlledRequestTarget,
  normalizeServedBodyLedgerDiagnostic,
  parseFixedMatrixFailureSummaryBytes
} from
  "./run-western-civil-time-same-artifact-browser-observation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDirectory, ".."));
const verifierPath = path.join(scriptDirectory, "verify-western-civil-time-same-artifact-browser-observation.mjs");
const rendererPath = path.join(
  scriptDirectory,
  "render-western-civil-time-same-artifact-browser-observation-candidate.mjs"
);

function loadRawCandidate() {
  return JSON.parse(readFileSync(
    path.join(workspaceRoot, ...WESTERN_SAME_ARTIFACT_CANDIDATE_PATH.split("/")),
    "utf8"
  ));
}

function createOwnedTestTemporaryRoot() {
  const root = path.join(
    realpathSync.native(os.tmpdir()),
    `hakimi-western-renderer-test-${randomUUID()}`
  );
  mkdirSync(root, { recursive: false });
  return { root, identity: lstatSync(root, { bigint: true }) };
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

test("current candidate rebuild binds exact 24 source, 17 base inputs, 20 tools, 12 outputs, and 10 outcomes", () => {
  const candidate = loadWesternSameArtifactCandidate(workspaceRoot);
  assert.equal(candidate.expectedAuthoredBuildInputClosure.fileCount, 24);
  assert.equal(candidate.lockedBuildInputSnapshot.inputCount, 17);
  assert.equal(candidate.evidenceToolingSnapshot.fileCount, 20);
  assert.equal(candidate.runtimeObservation.outputTreeAfter.fileCount, 12);
  assert.equal(candidate.runtimeObservation.playwrightSummary.outcomeCount, 10);
  assert.deepEqual(candidate.runtimeObservation.playwrightSummary.configuredProjectNames, ["chrome", "msedge"]);
  assert.equal(candidate.e2eAssertionContract.exactFileInspection.bindingCount, 3);
  assert.equal(candidate.observationBoundary.viteMainAndWorkerModuleLoadTelemetryEstablished, false);
  assert.equal(candidate.observationBoundary.completeSourceToBuildAttestationEstablished, false);
});

test("served-body ledgers split four natural runtime bodies from one marked retained-chunk probe", () => {
  const server = loadWesternSameArtifactCandidate(workspaceRoot).runtimeObservation.server;
  assert.equal(server.requiredRuntimePaths.length, 4);
  assert.equal(server.scenarioRuntimePaths.length, 4);
  assert.equal(server.evidenceOnlyOutputBodyProbePaths.length, 1);
  assert.equal(server.retained2025bChunkScenarioRuntimeRequested, false);
  assert.equal(server.retained2025bChunkEvidenceOnlyBodyProbeObserved, true);
  assert.equal(server.unmarkedRetainedChunkResponseCount, 0);
  assert.equal(server.unexpectedResponseCount, 0);
  assert.equal(server.unattributedResponseCount, 0);
  assert.equal(server.bodyMismatchResponseCount, 0);
  assert.deepEqual(server.browserDefaultFaviconControl, {
    requestMethod: "GET",
    canonicalPath: "/favicon.ico",
    query: "",
    responseStatus: 204,
    noBody: true,
    cacheControl: "no-store",
    contentSecurityPolicy: "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
    xContentTypeOptions: "nosniff",
    outputTreeResponseHeaderIncluded: false,
    excludedFromOutputTree: true,
    excludedFromServedBodyLedger: true,
    responsesByProject: [
      { projectName: "chrome", responseCount: 6 },
      { projectName: "msedge", responseCount: 6 }
    ],
    aggregateResponseCount: 12
  });
  assert.equal(
    server.servedResponseCount,
    server.servedArtifactsByProject.reduce((sum, entry) => sum + entry.servedResponseCount, 0)
  );
  assert.equal(server.totalControlledHttpResponseCount, server.servedResponseCount + 12);
  for (const project of server.servedArtifactsByProject) {
    assert.equal(project.scenarioRuntimeArtifactCount, 4);
    assert.equal(project.evidenceOnlyProbeArtifactCount, 1);
    assert.equal(project.evidenceOnlyProbeArtifacts[0].responseCount, 1);
  }
});

test("candidate keeps privacy, mutation, authority, seven-account, and receipt ceilings explicit", () => {
  const candidate = loadRawCandidate();
  const serialized = JSON.stringify(candidate);
  for (const marker of [
    "1900-01-01", "2021-03-14", "2021-11-07", "Asia/Shanghai", "America/New_York",
    "2021-11-07T05:30:00.000Z", "UTC−04:00", "C:\\Users\\Administrator", "playwright-report"
  ]) assert.equal(serialized.includes(marker), false, marker);
  assert.equal(candidate.dataHandling.candidateAnonymous, false);
  assert.equal(candidate.dataHandling.safeToLog, false);
  assert.equal(candidate.dataHandling.safeToPersist, false);
  assert.equal(candidate.dataHandling.safeToPublish, false);
  assert.equal(candidate.storageBackupRecoveryBoundary.mutationEpochAvailable, false);
  assert.equal(candidate.storageBackupRecoveryBoundary.mutationEpochReceipt, null);
  assert.equal(candidate.evidenceAccounts.length, 7);
  assert.ok(Object.values(candidate.authorityBoundary).every((value) => value === false));
  assert.ok(Object.values(candidate.formalReceiptCounts).every((value) => value === 0));
  assert.deepEqual(candidate.gateSummary, {
    bindingRequired: 28,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    requirementsUniverseClosed: false
  });
});

test("exact E2E file inspection rejects assertion weakening", () => {
  const weakenedBindings = structuredClone(WESTERN_E2E_ASSERTION_CONTRACT_BINDINGS);
  weakenedBindings[1].sha256 = "0".repeat(64);
  assert.throws(
    () => westernSameArtifactTestOnly.verifyWesternE2EAssertionContractBindings(weakenedBindings),
    (error) => error instanceof WesternSameArtifactObservationError
      && error.code === "E2E_ASSERTION_CONTRACT_INVALID"
  );
});

test("fixed matrix failure parser excludes free text and accepts only registered identifiers", () => {
  const fixed = {
    schemaVersion: "hakimi.western.same-artifact-playwright-summary/1",
    overallStatus: "failed",
    configuredProjectNames: ["chrome", "msedge"],
    outcomeCount: 1,
    outcomes: [{
      projectName: "chrome",
      scenarioId: "unique",
      status: "failed_stage_unique_run_resolved",
      retry: 0
    }]
  };
  assert.deepEqual(
    parseFixedMatrixFailureSummaryBytes(Buffer.from(JSON.stringify(fixed), "utf8")),
    fixed.outcomes[0]
  );
  for (const status of [
    "failed_stage_after_each_problem_check_console_warning",
    "failed_stage_after_each_problem_check_console_error",
    "failed_stage_after_each_problem_check_pageerror",
    "failed_stage_after_each_problem_check_requestfailed"
  ]) {
    const categorized = structuredClone(fixed);
    categorized.outcomes[0].status = status;
    assert.deepEqual(
      parseFixedMatrixFailureSummaryBytes(Buffer.from(JSON.stringify(categorized), "utf8")),
      categorized.outcomes[0]
    );
  }
  const genericAfterEach = structuredClone(fixed);
  genericAfterEach.outcomes[0].status = "failed_stage_after_each_problem_check";
  assert.throws(() => parseFixedMatrixFailureSummaryBytes(
    Buffer.from(JSON.stringify(genericAfterEach), "utf8")
  ));
  const withError = structuredClone(fixed);
  withError.outcomes[0].error = "forbidden free text";
  assert.throws(() => parseFixedMatrixFailureSummaryBytes(Buffer.from(JSON.stringify(withError), "utf8")));
  const freeStatus = structuredClone(fixed);
  freeStatus.outcomes[0].status = "arbitrary failure detail";
  assert.throws(() => parseFixedMatrixFailureSummaryBytes(Buffer.from(JSON.stringify(freeStatus), "utf8")));
});

test("served-body ledger diagnostic accepts only fixed reasons, projects, and integer counts", () => {
  const base = {
    failureReason: "unexpected_response",
    projectName: null,
    expectedCount: 0,
    actualCount: 2,
    unattributedResponseCount: 0,
    unexpectedResponseCount: 2,
    bodyMismatchResponseCount: 0,
    browserDefaultFaviconControlledResponseCount: 0,
    unmarkedProbeResponseCount: 0
  };
  const perBrowserReasons = new Set([
    "per_browser_runtime_path_set",
    "per_browser_probe_path_set",
    "per_browser_probe_response_count",
    "per_browser_count_inconsistent",
    "per_browser_default_favicon_response_count"
  ]);
  for (const failureReason of [
    ...perBrowserReasons,
    "cross_browser_manifest_mismatch",
    "aggregate_default_favicon_response_count",
    "unattributed_response",
    "unexpected_response",
    "body_mismatch",
    "unmarked_probe"
  ]) {
    const diagnostic = {
      ...base,
      failureReason,
      projectName: perBrowserReasons.has(failureReason) ? "chrome" : null
    };
    assert.deepEqual(normalizeServedBodyLedgerDiagnostic(diagnostic), diagnostic);
  }
  for (const invalid of [
    { ...base, rawUrl: "forbidden" },
    { ...base, failureReason: "free text" },
    { ...base, projectName: "free text" },
    { ...base, actualCount: -1 },
    { ...base, expectedCount: 0.5 },
    { ...base, browserDefaultFaviconControlledResponseCount: -1 },
    { ...base, failureReason: "per_browser_runtime_path_set", projectName: null },
    { ...base, failureReason: "unexpected_response", projectName: "chrome" }
  ]) {
    assert.throws(() => normalizeServedBodyLedgerDiagnostic(invalid));
  }
});

test("raw origin-form request classifier rejects normalized aliases and query drift", () => {
  const runtimePaths = [
    "index.html",
    "assets/index-AbCd.js",
    "assets/index-AbCd.css",
    "assets/civil-worker-AbCd.js"
  ];
  const ianaPath = "assets/iana-2025b-AbCd.js";
  const classify = (method, rawTarget) => classifyControlledRequestTarget(
    method,
    rawTarget,
    runtimePaths,
    ianaPath
  );
  assert.deepEqual(classify("GET", "/"), { kind: "scenario_runtime", relativePath: "index.html" });
  for (const relativePath of runtimePaths.slice(1)) {
    assert.deepEqual(classify("GET", `/${relativePath}`), { kind: "scenario_runtime", relativePath });
  }
  assert.deepEqual(classify(
    "GET",
    `/${ianaPath}?hakimi-western-evidence-only=1`
  ), { kind: "evidence_only_probe", relativePath: ianaPath });
  assert.deepEqual(classify("GET", "/favicon.ico"), { kind: "browser_default_favicon" });

  for (const rawTarget of [
    "/x/../favicon.ico",
    "/favicon%2Eico",
    "/favicon.ico?",
    "//favicon.ico",
    "http://127.0.0.1/favicon.ico",
    "/index.html",
    "/assets/index-AbCd.js?",
    "/assets/index-AbCd.js?x=1",
    "/assets/index-AbCd%2Ejs",
    "/x/../assets/index-AbCd.js",
    "//assets/index-AbCd.js",
    "http://127.0.0.1/assets/index-AbCd.js",
    "/assets%2Findex-AbCd.js",
    "/x/../assets/iana-2025b-AbCd.js?hakimi-western-evidence-only=1",
    "/assets/iana-2025b-AbCd%2Ejs?hakimi-western-evidence-only=1",
    "//assets/iana-2025b-AbCd.js?hakimi-western-evidence-only=1",
    "http://127.0.0.1/assets/iana-2025b-AbCd.js?hakimi-western-evidence-only=1"
  ]) {
    assert.deepEqual(classify("GET", rawTarget), { kind: "unexpected" }, rawTarget);
  }
  for (const rawTarget of [
    `/${ianaPath}`,
    `/${ianaPath}?`,
    `/${ianaPath}?hakimi-western-evidence-only=0`,
    `/${ianaPath}?hakimi-western-evidence-only=1&extra=1`
  ]) {
    assert.deepEqual(classify("GET", rawTarget), { kind: "unmarked_probe" }, rawTarget);
  }
  assert.deepEqual(classify("POST", "/favicon.ico"), { kind: "unexpected" });
  assert.deepEqual(classify("GET", undefined), { kind: "unexpected" });
});

test("current rebuild rejects authority promotion", () => {
  const promoted = loadRawCandidate();
  promoted.authorityBoundary.publicReleaseAuthorized = true;
  assert.throws(
    () => verifyWesternSameArtifactCandidateObject(workspaceRoot, promoted),
    (error) => error instanceof WesternSameArtifactObservationError
      && error.code === "CANDIDATE_CURRENT_REBUILD_MISMATCH"
  );
});

test("frozen renderer rebuilds the exact candidate from sanitized runtime evidence in system temp", (context) => {
  const candidate = loadRawCandidate();
  const temporary = createOwnedTestTemporaryRoot();
  context.after(() => cleanupOwnedTestTemporaryRoot(temporary));
  const runtimePath = path.join(
    temporary.root,
    `hakimi-western-same-artifact-runtime-${randomUUID()}.json`
  );
  const outputPath = path.join(
    temporary.root,
    `hakimi-western-same-artifact-candidate-${randomUUID()}.json`
  );
  writeFileSync(runtimePath, `${JSON.stringify(candidate.runtimeObservation)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  let stdoutText = "";
  let stderrText = "";
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.NODE_OPTIONS;
  delete cleanEnvironment.NODE_PATH;
  const code = runWesternSameArtifactCandidateRenderer({
    argv: [process.execPath, rendererPath, "--runtime", runtimePath, "--candidate-out", outputPath],
    execArgv: [],
    env: cleanEnvironment,
    stdout: { write: (value) => { stdoutText += value; } },
    stderr: { write: (value) => { stderrText += value; } }
  });
  assert.equal(code, 0, stderrText);
  assert.equal(JSON.parse(stdoutText).authorityRaised, false);
  assert.equal(
    westernSameArtifactTestOnly.canonicalCompact(JSON.parse(readFileSync(outputPath, "utf8"))),
    westernSameArtifactTestOnly.canonicalCompact(candidate)
  );
});

test("verifier CLI accepts zero operands and rejects operands plus loader injection variables", () => {
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.NODE_OPTIONS;
  delete cleanEnvironment.NODE_PATH;
  const success = spawnSync(process.execPath, [verifierPath], {
    cwd: workspaceRoot,
    env: cleanEnvironment,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000
  });
  assert.equal(success.status, 0, success.stderr);
  const summary = JSON.parse(success.stdout);
  assert.equal(summary.passedOutcomeCount, 10);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicReleaseAuthorized, false);

  const operand = spawnSync(process.execPath, [verifierPath, "extra"], {
    cwd: workspaceRoot,
    env: cleanEnvironment,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(operand.status, 2);
  assert.match(operand.stderr, /OPERANDS_FORBIDDEN/u);

  for (const variable of ["NODE_OPTIONS", "NODE_PATH"]) {
    const rejected = spawnSync(process.execPath, [verifierPath], {
      cwd: workspaceRoot,
      env: { ...cleanEnvironment, [variable]: "" },
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(rejected.status, 2, variable);
    assert.match(rejected.stderr, /NODE_ENV_FORBIDDEN/u);
  }

  let injectedStderr = "";
  const injectedCode = runWesternSameArtifactBrowserObservationVerifier({
    argv: [process.execPath, verifierPath],
    execArgv: ["--require", "forbidden-loader.js"],
    env: cleanEnvironment,
    stdout: { write: () => undefined },
    stderr: { write: (value) => { injectedStderr += value; } }
  });
  assert.equal(injectedCode, 2);
  assert.match(injectedStderr, /NODE_ENV_FORBIDDEN/u);
});
