import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import StorageV13MatrixCandidateReporter from
  "../apps/web/playwright.storage-v13-matrix-candidate-reporter.ts";
import {
  STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
  STORAGE_V13_MATRIX_AUTHORITY,
  STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME,
  STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
  createStorageV13MatrixCandidateAttemptMarker,
  parseStorageV13MatrixCandidateEnvironment,
  prepareFreshStorageV13MatrixCandidateRun
} from "./storage-v13-matrix-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

function digestDocument(document, digestKey) {
  const unsigned = structuredClone(document);
  delete unsigned[digestKey];
  return sha256(canonicalJson(unsigned));
}

function browserReceipt(projectName, runId, attemptMarker) {
  const captureCounts = [2, 2, 3, 2, 5, 2];
  const document = {
    receiptType: "storage_v13_browser_matrix_receipt_candidate_v2",
    receiptId: `${runId}-${projectName}`,
    projectName,
    browserChannel: projectName,
    attemptMarker,
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    matrixComplete: false,
    strictGatePassed: false,
    operationObservations: captureCounts.map((count) => ({
      captures: Array.from({ length: count }, () => ({}))
    })),
    deferredBoundaries: Array.from({ length: 4 }, () => ({})),
    authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
    receiptDigest: "0".repeat(64)
  };
  document.receiptDigest = digestDocument(document, "receiptDigest");
  return document;
}

function fakeTest(projectName, { expectedStatus = "passed", outcome = "expected", statuses = ["passed"] } = {}) {
  return {
    parent: { project: () => ({ name: projectName }) },
    expectedStatus,
    outcome: () => outcome,
    results: statuses.map((status) => ({ status }))
  };
}

async function reporterFixture(t, runId) {
  const bindingRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-reporter-"));
  const outputRoot = path.join(bindingRoot, "tmp", "storage-v13-matrix-candidate", runId);
  t.after(() => rm(bindingRoot, { recursive: true, force: true }));
  const attemptId = `attempt-${"b".repeat(64)}`;
  const environment = {
    HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
    HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: outputRoot,
    HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: bindingRoot,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(bindingRoot, "dist", "web"),
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(bindingRoot, "tmp", "artifact-lock.json"),
    HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: `hre1-${"a".repeat(32)}`,
    HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
    HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
  };
  const candidate = parseStorageV13MatrixCandidateEnvironment(environment);
  await prepareFreshStorageV13MatrixCandidateRun(candidate, { cwd: bindingRoot });
  const marker = await createStorageV13MatrixCandidateAttemptMarker(candidate, {
    cwd: bindingRoot,
    createdAt: "2026-08-27T00:00:00.000Z"
  });
  for (const projectName of ["msedge", "chrome"]) {
    const projectRoot = path.join(outputRoot, projectName);
    await writeFile(
      path.join(projectRoot, "browser-receipt.json"),
      `${JSON.stringify(browserReceipt(projectName, runId, marker.binding), null, 2)}\n`,
      "utf8"
    );
  }
  return { bindingRoot, outputRoot, environment, marker };
}

async function runReporter(t, tests, runId, mutateFixture = async () => undefined) {
  const fixture = await reporterFixture(t, runId);
  const { outputRoot, environment } = fixture;
  await mutateFixture(fixture);
  const originals = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]])
  );
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const reporter = new StorageV13MatrixCandidateReporter();
  reporter.onBegin({}, { allTests: () => tests });
  const result = await reporter.onEnd({ status: "passed" });
  let summary = null;
  let summaryBytes = null;
  try {
    summaryBytes = await readFile(path.join(outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME));
    summary = JSON.parse(summaryBytes.toString("utf8"));
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
  }
  let terminalCommitBytes = null;
  try {
    terminalCommitBytes = await readFile(path.join(
      outputRoot,
      STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME
    ));
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
  }
  return {
    result,
    summary,
    summaryBytes,
    terminalCommitBytes,
    rootEntries: (await readdir(outputRoot)).sort(),
    fixture
  };
}

test("candidate reporter requires one exact Edge and Chrome pass while remaining not admitted", async (t) => {
  const { result, summary, summaryBytes, terminalCommitBytes, rootEntries } = await runReporter(t, [
    fakeTest("msedge"),
    fakeTest("chrome")
  ], "matrix-reporter-pass-0001");
  assert.equal(result.status, "passed");
  assert.ok(summary);
  assert.equal(summary.candidateCaptureComplete, true);
  assert.equal(summary.status, "not_admitted");
  assert.equal(summary.matrixComplete, false);
  assert.equal(summary.strictGatePassed, false);
  assert.deepEqual(summary.errors, []);
  assert.equal(summary.summaryDigest, digestDocument(summary, "summaryDigest"));
  assert.deepEqual(rootEntries, [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
  assert.deepEqual(terminalCommitBytes, Buffer.from(`${sha256(summaryBytes)}\n`, "utf8"));
  assert.equal(summary.attemptMarker.attemptId, `attempt-${"b".repeat(64)}`);
  assert.deepEqual(summary.projects.map((project) => project.receipt.receiptId), [
    "matrix-reporter-pass-0001-msedge",
    "matrix-reporter-pass-0001-chrome"
  ]);
});

test("candidate reporter does not revoke a committed summary when stdout throws", async (t) => {
  const originalWrite = process.stdout.write;
  let outcome;
  process.stdout.write = function (chunk, ...args) {
    if (String(chunk).startsWith("HAKIMI_STORAGE_V13_MATRIX_RESULT ")) {
      throw new Error("test-only stdout failure after terminal commit");
    }
    return originalWrite.call(this, chunk, ...args);
  };
  try {
    outcome = await runReporter(t, [
      fakeTest("msedge"),
      fakeTest("chrome")
    ], "matrix-reporter-stdout-failure-0001");
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.equal(outcome.result.status, "passed");
  assert.ok(outcome.summaryBytes);
  assert.deepEqual(
    outcome.terminalCommitBytes,
    Buffer.from(`${sha256(outcome.summaryBytes)}\n`, "utf8")
  );
  assert.deepEqual(outcome.rootEntries, [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
});

test("candidate reporter fails a skipped browser without promoting the closed summary", async (t) => {
  const { result, summary, summaryBytes, terminalCommitBytes, rootEntries } = await runReporter(t, [
    fakeTest("msedge", { expectedStatus: "skipped", outcome: "skipped", statuses: ["skipped"] }),
    fakeTest("chrome")
  ], "matrix-reporter-skip-0001");
  assert.equal(result.status, "failed");
  assert.ok(summary);
  assert.equal(summary.candidateCaptureComplete, false);
  assert.equal(summary.status, "not_admitted");
  assert.equal(summary.strictGatePassed, false);
  assert.match(summary.errors.join("\n"), /msedge must contain exactly one single-attempt passing test/u);
  assert.equal(summary.summaryDigest, digestDocument(summary, "summaryDigest"));
  assert.deepEqual(rootEntries, [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
  assert.deepEqual(terminalCommitBytes, Buffer.from(`${sha256(summaryBytes)}\n`, "utf8"));
});

test("candidate reporter never writes pending or terminal summary without this attempt marker", async (t) => {
  const missing = await runReporter(t, [fakeTest("msedge"), fakeTest("chrome")],
    "matrix-reporter-marker-missing-0001", async ({ outputRoot }) => {
      await rm(path.join(outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME));
    });
  assert.equal(missing.result.status, "failed");
  assert.equal(missing.summary, null);
  assert.equal(missing.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME), false);
  assert.equal(missing.rootEntries.includes(STORAGE_V13_MATRIX_SUMMARY_FILE_NAME), false);
  assert.equal(missing.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME), false);
  assert.equal(missing.rootEntries.includes(STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME), false);

  const wrong = await runReporter(t, [fakeTest("msedge"), fakeTest("chrome")],
    "matrix-reporter-marker-wrong-0001", async ({ outputRoot }) => {
      const markerPath = path.join(outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME);
      const marker = JSON.parse(await readFile(markerPath, "utf8"));
      marker.attemptId = `attempt-${"c".repeat(64)}`;
      marker.markerDigest = digestDocument(marker, "markerDigest");
      await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
    });
  assert.equal(wrong.result.status, "failed");
  assert.equal(wrong.summary, null);
  assert.equal(wrong.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME), false);
  assert.equal(wrong.rootEntries.includes(STORAGE_V13_MATRIX_SUMMARY_FILE_NAME), false);
  assert.equal(wrong.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME), false);
  assert.equal(wrong.rootEntries.includes(STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME), false);
});

test("candidate reporter preserves a pre-existing final file and never writes pending", async (t) => {
  const sentinelBytes = Buffer.from('{"sentinel":"pre-existing-final"}\n', "utf8");
  const outcome = await runReporter(
    t,
    [fakeTest("msedge"), fakeTest("chrome")],
    "matrix-reporter-final-exists-0001",
    async ({ outputRoot }) => {
      await writeFile(path.join(outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME), sentinelBytes);
    }
  );
  assert.equal(outcome.result.status, "failed");
  assert.deepEqual(outcome.summary, { sentinel: "pre-existing-final" });
  assert.deepEqual(
    await readFile(path.join(outcome.fixture.outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME)),
    sentinelBytes
  );
  assert.equal(outcome.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME), false);
  assert.equal(outcome.rootEntries.includes(STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME), false);
  assert.equal(outcome.rootEntries.includes(STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME), false);
});
