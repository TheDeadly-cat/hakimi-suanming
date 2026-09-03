import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  STORAGE_V13_MATRIX_AUTHORITY,
  STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
  STORAGE_V13_MATRIX_CAPABILITIES,
  STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES,
  STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES,
  STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME,
  STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES,
  STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES,
  STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
  createStorageV13MatrixCandidateAttemptMarker,
  loadVerifiedDeployedPwaCandidateArtifact,
  loadStorageV13MatrixCandidatePolicy,
  loadStorageV13MatrixGovernanceBindings,
  parseStorageV13MatrixCandidateEnvironment,
  prepareCandidateProjectOutput,
  prepareFreshStorageV13MatrixCandidateRun,
  publishStorageV13MatrixCandidateSummary,
  testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault,
  writeStorageV13MatrixBrowserCandidate
} from "./storage-v13-matrix-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(workspaceRoot, "docs", "release", "storage-v13-matrix-candidate-policy.v2.json");
const decisionsPath = path.join(workspaceRoot, "docs", "release", "web-v1-release-decisions.json");
const policyDocument = JSON.parse(await readFile(policyPath, "utf8"));
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const attemptId = `attempt-${"b".repeat(64)}`;
const captureWrapperPath = path.join(workspaceRoot, "scripts", "run-storage-v13-matrix-candidate.mjs");
const descriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

function clone(value) {
  return structuredClone(value);
}

async function exactDirectoryLock(directory) {
  const [metadata, resolved] = await Promise.all([
    lstat(directory, { bigint: true }),
    realpath(directory)
  ]);
  return Object.freeze({
    realPath: path.resolve(resolved),
    dev: metadata.dev.toString(10),
    ino: metadata.ino.toString(10),
    birthtimeNs: metadata.birthtimeNs.toString(10)
  });
}

function baselineState() {
  return {
    ...Object.fromEntries(STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.map((storeName) => [
    storeName,
    { count: 0, revision: "baseline-a" }
    ])),
    semanticWitness: semanticWitness({ cases: [], revisions: [], revisionFingerprints: [] })
  };
}

function stateWith(base, changes, witness = base.semanticWitness) {
  const next = clone(base);
  for (const [storeName, change] of Object.entries(changes)) next[storeName] = { ...next[storeName], ...change };
  next.semanticWitness = clone(witness);
  return next;
}

function semanticWitness({ cases, revisions, revisionFingerprints }) {
  const candidateSetFingerprintInventory = {
    count: 0,
    logicalContentDigest: sha256(canonicalJson([]))
  };
  const projection = {
    witnessType: "bounded_hashed_case_revision_relationships_v1",
    maximumEntriesPerCollection: 4096,
    cases: [...cases].sort((left, right) => left.caseIdDigest < right.caseIdDigest ? -1 : 1),
    revisions: [...revisions].sort((left, right) =>
      (left.caseIdDigest < right.caseIdDigest ? -1 : left.caseIdDigest > right.caseIdDigest ? 1 : 0)
        || left.revisionNumber - right.revisionNumber
        || (left.revisionIdDigest < right.revisionIdDigest ? -1 : 1)),
    revisionFingerprints: [...revisionFingerprints].sort((left, right) =>
      (left.subjectIdDigest < right.subjectIdDigest ? -1 : left.subjectIdDigest > right.subjectIdDigest ? 1 : 0)
        || (left.sourceIdDigest < right.sourceIdDigest ? -1 : 1)),
    candidateSetFingerprintInventory
  };
  return { ...projection, witnessDigest: sha256(canonicalJson(projection)) };
}

const CASE_ID_DIGEST = sha256("fixture-case-1");
const REVISION_1_ID_DIGEST = sha256("fixture-revision-1");
const REVISION_2_ID_DIGEST = sha256("fixture-revision-2");
const CASE_LIFECYCLE_INDEPENDENT_CREATE_DIGEST = sha256("fixture-case-create-stable");
const CASE_LIFECYCLE_INDEPENDENT_EDIT_DIGEST = sha256("fixture-case-edit-stable");
const CASE_EDIT_STABLE_ACTIVE_DIGEST = sha256("fixture-case-edit-stable-active-fields");
const CASE_EDIT_STABLE_TRASHED_DIGEST = sha256("fixture-case-edit-stable-trashed-fields");
const REVISION_1_RECORD_DIGEST = sha256("fixture-revision-1-record");
const REVISION_2_RECORD_DIGEST = sha256("fixture-revision-2-record");
const FINGERPRINT_1_RECORD_DIGEST = sha256("fixture-fingerprint-1-record");
const FINGERPRINT_2_RECORD_DIGEST = sha256("fixture-fingerprint-2-record");

const CREATE_WITNESS = semanticWitness({
  cases: [{
    caseIdDigest: CASE_ID_DIGEST,
    latestRevisionIdDigest: REVISION_1_ID_DIGEST,
    revisionCount: 1,
    lifecycleState: "active",
    lifecycleIndependentRecordDigest: CASE_LIFECYCLE_INDEPENDENT_CREATE_DIGEST,
    editStableRecordDigest: CASE_EDIT_STABLE_ACTIVE_DIGEST,
    recordDigest: sha256("fixture-case-create-record")
  }],
  revisions: [{
    revisionIdDigest: REVISION_1_ID_DIGEST,
    caseIdDigest: CASE_ID_DIGEST,
    revisionNumber: 1,
    recordDigest: REVISION_1_RECORD_DIGEST
  }],
  revisionFingerprints: [{
    sourceIdDigest: REVISION_1_ID_DIGEST,
    subjectIdDigest: CASE_ID_DIGEST,
    recordDigest: FINGERPRINT_1_RECORD_DIGEST
  }]
});

const EDIT_WITNESS = semanticWitness({
  cases: [{
    caseIdDigest: CASE_ID_DIGEST,
    latestRevisionIdDigest: REVISION_2_ID_DIGEST,
    revisionCount: 2,
    lifecycleState: "active",
    lifecycleIndependentRecordDigest: CASE_LIFECYCLE_INDEPENDENT_EDIT_DIGEST,
    editStableRecordDigest: CASE_EDIT_STABLE_ACTIVE_DIGEST,
    recordDigest: sha256("fixture-case-edit-record")
  }],
  revisions: [
    ...CREATE_WITNESS.revisions,
    {
      revisionIdDigest: REVISION_2_ID_DIGEST,
      caseIdDigest: CASE_ID_DIGEST,
      revisionNumber: 2,
      recordDigest: REVISION_2_RECORD_DIGEST
    }
  ],
  revisionFingerprints: [
    ...CREATE_WITNESS.revisionFingerprints,
    {
      sourceIdDigest: REVISION_2_ID_DIGEST,
      subjectIdDigest: CASE_ID_DIGEST,
      recordDigest: FINGERPRINT_2_RECORD_DIGEST
    }
  ]
});

const TRASHED_WITNESS = semanticWitness({
  cases: [{
    ...EDIT_WITNESS.cases[0],
    lifecycleState: "trashed",
    editStableRecordDigest: CASE_EDIT_STABLE_TRASHED_DIGEST,
    recordDigest: sha256("fixture-case-trashed-record")
  }],
  revisions: EDIT_WITNESS.revisions,
  revisionFingerprints: EDIT_WITNESS.revisionFingerprints
});

function fixtureLogicalContentDigest(state, storeName) {
  const canonicalEntry = canonicalJson({
    storeName,
    count: state[storeName].count,
    revision: state[storeName].revision
  });
  return sha256(canonicalJson([canonicalEntry]));
}

function snapshot(operationId, phase, state, ordinal, projectName) {
  const stores = STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.map((storeName) => ({
    storeName,
    count: state[storeName].count,
    recordsDigest: sha256(canonicalJson({
      storeName,
      count: state[storeName].count,
      revision: state[storeName].revision
    })),
    logicalContentDigest: storeName === "birthFingerprints"
      ? null
      : fixtureLogicalContentDigest(state, storeName)
  }));
  const projection = {
    databaseName: "hakimi-bazi-research",
    physicalVersion: 130,
    dexieVersion: 13,
    transactionMode: "readonly",
    storeNames: [...STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES],
    stores,
    semanticWitness: clone(state.semanticWitness)
  };
  return {
    schemaVersion: 2,
    recordType: "storage_v13_native_readonly_snapshot_v2",
    captureId: `matrix-run-0001-${projectName}-${String(ordinal).padStart(2, "0")}`,
    operationId,
    phase,
    capturedAt: new Date(Date.parse("2026-08-27T03:00:00.000Z") + ordinal * 1000).toISOString(),
    ...projection,
    snapshotDigest: sha256(canonicalJson(projection))
  };
}

function rewriteSnapshotStore(capture, storeName, change) {
  const store = capture.stores.find((candidate) => candidate.storeName === storeName);
  Object.assign(store, change);
  refreshSnapshotDigest(capture);
}

function refreshSnapshotDigest(capture) {
  capture.snapshotDigest = sha256(canonicalJson({
    databaseName: capture.databaseName,
    physicalVersion: capture.physicalVersion,
    dexieVersion: capture.dexieVersion,
    transactionMode: capture.transactionMode,
    storeNames: capture.storeNames,
    stores: capture.stores,
    semanticWitness: capture.semanticWitness
  }));
}

function rewriteSnapshotWitness(capture, mutate) {
  mutate(capture.semanticWitness);
  const witnessProjection = clone(capture.semanticWitness);
  delete witnessProjection.witnessDigest;
  capture.semanticWitness.witnessDigest = sha256(canonicalJson(witnessProjection));
  refreshSnapshotDigest(capture);
}

function emptyDownload() {
  return {
    observed: false,
    eventCount: 0,
    size: null,
    sha256: null,
    suggestedFilename: null
  };
}

function backupProjection(label, state) {
  const counts = Object.fromEntries(STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES.map((name) => [
    name,
    name === "revisionCalculationReceipts" ? 0 : state[name].count
  ]));
  return {
    formatVersion: "1.2.0",
    payloadDigest: sha256(`storage-v13-logical-backup-${label}`),
    logicalPartitionNames: [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES],
    counts,
    sharedPartitionContentDigests: Object.fromEntries(
      STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.map((name) => [
        name,
        fixtureLogicalContentDigest(state, name)
      ])
    )
  };
}

function observedDownload(operationId) {
  return {
    observed: true,
    eventCount: 1,
    size: 4096,
    sha256: sha256(`storage-v13-download-${operationId}`),
    suggestedFilename: operationId === "export"
      ? "hakimi-full-backup-2026-08-27.zip"
      : "hakimi-before-restore-2026-08-27.zip"
  };
}

function operation(
  operationId,
  captures,
  { backup = null, safetyBackup = null, download = emptyDownload() } = {}
) {
  const policy = policyDocument.observedOperations.find((candidate) => candidate.operationId === operationId);
  return {
    operationId,
    status: "observed_pass",
    uiPath: policy.uiPath,
    observationMethod: "native_indexeddb_readonly_v2",
    captures,
    download,
    backup,
    safetyBackup
  };
}

function validOperationObservations(projectName = "msedge") {
  const stateA = baselineState();
  const stateB = stateWith(stateA, {
    birthFingerprints: { count: 1, revision: "created-b" },
    cases: { count: 1, revision: "created-b" },
    revisions: { count: 1, revision: "created-b" }
  }, CREATE_WITNESS);
  const stateC = stateWith(stateB, {
    birthFingerprints: { count: 2, revision: "edited-c" },
    cases: { count: 1, revision: "edited-c" },
    revisions: { count: 2, revision: "edited-c" }
  }, EDIT_WITNESS);
  const stateCTrashed = stateWith(stateC, {
    cases: { count: 1, revision: "trashed-c" }
  }, TRASHED_WITNESS);
  const stateD = stateWith(stateA, {
    researchNotes: { count: 1, revision: "restore-preflight-d" }
  });
  const backup = backupProjection("target-a", stateA);
  const safetyBackup = backupProjection("safety-d", stateD);
  let ordinal = 0;
  const capture = (operationId, phase, state) =>
    snapshot(operationId, phase, state, ordinal += 1, projectName);
  return [
    operation("create", [
      capture("create", "before_ui_write", stateA),
      capture("create", "after_ui_write", stateB)
    ]),
    operation("edit", [
      capture("edit", "before_ui_write", stateB),
      capture("edit", "after_ui_write", stateC)
    ]),
    operation("delete", [
      capture("delete", "before_trash", stateC),
      capture("delete", "after_trash_before_permanent_delete", stateCTrashed),
      capture("delete", "after_permanent_delete", stateA)
    ]),
    operation("export", [
      capture("export", "before_ui_read", stateA),
      capture("export", "after_ui_read", stateA)
    ], { backup: clone(backup), download: observedDownload("export") }),
    operation("restore", [
      capture("restore", "backup_baseline", stateA),
      capture("restore", "before_preflight", stateD),
      capture("restore", "after_preflight", stateD),
      capture("restore", "before_commit", stateD),
      capture("restore", "after_commit", stateA)
    ], {
      backup: clone(backup),
      safetyBackup: clone(safetyBackup),
      download: observedDownload("restore")
    }),
    operation("cancel", [
      capture("cancel", "before_cancel", stateA),
      capture("cancel", "after_cancel", stateA)
    ])
  ];
}

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

async function writeLockedArtifact(root) {
  const artifactRoot = path.join(root, "dist", "web");
  const lockPath = path.join(root, "tmp", "private", "release-artifact-identity.json");
  await mkdir(artifactRoot, { recursive: true });
  const storageManifestText = JSON.stringify({ manifestVersion: 1, database: descriptor });
  const metadata = [
    `<meta name="hakimi-release-database" content="${htmlEscape(JSON.stringify(descriptor))}">`,
    `<meta name="hakimi-release-storage-manifest" content="${htmlEscape(storageManifestText)}">`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${sha256(storageManifestText)}">`,
    '<meta name="hakimi-build-version" content="abcdef123456">',
    `<meta name="hakimi-release-evidence-id" content="${releaseEvidenceId}">`
  ].join("");
  const files = {
    "index.html": `<!doctype html><html><head>${metadata}</head><body></body></html>`,
    "manifest.webmanifest": JSON.stringify({ name: "fixture", id: "/", start_url: "/" }),
    "sw.js": "self.addEventListener('fetch', () => undefined);\n",
    "_headers": "fixture deployment control\n"
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    await writeFile(path.join(artifactRoot, relativePath), contents, "utf8");
  }
  await writeReleaseArtifactIdentityLock({
    cwd: root,
    dist: artifactRoot,
    lockPath,
    channel: "default-v13",
    evidenceId: releaseEvidenceId,
    createdAt: "2026-08-27T00:00:00.000Z"
  });
  return { artifactRoot, lockPath };
}

async function copyGovernanceSources(root) {
  const releaseRoot = path.join(root, "docs", "release");
  await mkdir(releaseRoot, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(releaseRoot, "storage-v13-matrix-candidate-policy.v2.json"),
      await readFile(policyPath)
    ),
    writeFile(
      path.join(releaseRoot, "web-v1-release-decisions.json"),
      await readFile(decisionsPath)
    )
  ]);
}

async function writerFixture(t, projectName = "msedge") {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-matrix-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await copyGovernanceSources(root);
  const { artifactRoot, lockPath } = await writeLockedArtifact(root);
  const runId = "matrix-run-0001";
  const outputRoot = path.join(root, "tmp", "storage-v13-matrix-candidate", runId);
  const candidateEnvironment = parseStorageV13MatrixCandidateEnvironment({
    HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
    HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: outputRoot,
    HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: root,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: artifactRoot,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: lockPath,
    HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
    HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
  });
  const artifact = await loadVerifiedDeployedPwaCandidateArtifact(candidateEnvironment);
  await prepareFreshStorageV13MatrixCandidateRun(candidateEnvironment, { cwd: root });
  await createStorageV13MatrixCandidateAttemptMarker(candidateEnvironment, {
    cwd: root,
    createdAt: "2026-08-27T02:59:00.000Z"
  });
  const preparedOutput = await prepareCandidateProjectOutput({
    candidateEnvironment,
    bindingRoot: root,
    outputRoot,
    artifactRoot,
    projectName
  });
  return {
    root,
    outputRoot,
    preparedOutput,
    input: {
      cwd: root,
      candidateEnvironment,
      preparedOutput,
      runId,
      targetOrigin: "https://staging.example.com",
      initialArtifact: artifact,
      finalArtifact: clone(artifact),
      projectName,
      browserChannel: projectName,
      actualProduct: projectName === "msedge" ? "Edg/140.0.1.2" : "Chrome/140.0.1.2",
      pageIdentity: {
        appBootReady: "true",
        dbGeneration: "legacy-v13",
        dbSchema: "13",
        evidenceId: releaseEvidenceId,
        buildVersion: artifact.buildVersion,
        descriptor: clone(descriptor)
      },
      operationObservations: validOperationObservations(projectName),
      deferredBoundaries: clone(policyDocument.deferredBoundaries),
      unexpectedExternalRequestCount: 0,
      startedAt: "2026-08-27T03:00:00.000Z",
      completedAt: "2026-08-27T03:01:00.000Z"
    }
  };
}

async function writeGovernanceFixture(t, mutate) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-governance-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const releaseRoot = path.join(root, "docs", "release");
  await mkdir(releaseRoot, { recursive: true });
  const policy = clone(policyDocument);
  const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
  mutate({ policy, decisions });
  await writeFile(
    path.join(releaseRoot, "storage-v13-matrix-candidate-policy.v2.json"),
    `${JSON.stringify(policy, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(releaseRoot, "web-v1-release-decisions.json"),
    `${JSON.stringify(decisions, null, 2)}\n`,
    "utf8"
  );
  return root;
}

test("candidate policy remains outside the formal default-v13 receipt allowlist", async () => {
  const governance = await loadStorageV13MatrixGovernanceBindings(workspaceRoot);
  assert.equal(governance.policy.document.formalReleaseEvidenceReceipt, false);
  assert.equal(governance.policy.document.terminalState.matrixComplete, false);
  assert.equal(governance.policy.document.authority.defaultV13ReceiptAllowlistMember, false);
  const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
  const commands = decisions.releaseEvidence.defaultV13RequiredReceiptCommands;
  assert.equal(Object.keys(commands).length, 13);
  assert.doesNotMatch(canonicalJson(commands), /storage-v13-matrix/u);
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  assert.doesNotMatch(packageJson.scripts["test:release-evidence"], /storage-v13-matrix/u);
});

test("candidate environment binds its private output to tmp and the explicit run id", () => {
  const runId = "matrix-env-0001";
  const environment = {
    HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
    HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: path.join(
      workspaceRoot,
      "tmp",
      "storage-v13-matrix-candidate",
      runId
    ),
    HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: workspaceRoot,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(workspaceRoot, "dist", "web"),
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(
      workspaceRoot,
      "tmp",
      "release-artifact-identity.json"
    ),
    HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
    HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
  };
  const parsed = parseStorageV13MatrixCandidateEnvironment(environment);
  assert.equal(parsed.outputRoot, environment.HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT);
  assert.throws(
    () => parseStorageV13MatrixCandidateEnvironment({
      ...environment,
      HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: path.join(workspaceRoot, "tmp", "wrong-output")
    }),
    /STORAGE_V13_MATRIX_OUTPUT_SCOPE_INVALID/u
  );
});

test("candidate run id atomically creates one fresh root and cannot be reused", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-fresh-run-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runId = "matrix-fresh-run-0001";
  const outputRoot = path.join(root, "tmp", "storage-v13-matrix-candidate", runId);
  const candidate = parseStorageV13MatrixCandidateEnvironment({
    HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
    HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: outputRoot,
    HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: root,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(root, "dist", "web"),
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(root, "tmp", "release-artifact-identity.json"),
    HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
    HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
  });
  const prepared = await prepareFreshStorageV13MatrixCandidateRun(candidate, { cwd: root });
  assert.equal(prepared.runId, runId);
  assert.equal(prepared.outputRoot, outputRoot);
  assert.deepEqual((await readdir(outputRoot)).sort(), ["chrome", "msedge"]);
  const marker = await createStorageV13MatrixCandidateAttemptMarker(candidate, {
    cwd: root,
    createdAt: "2026-08-27T02:59:00.000Z"
  });
  assert.equal(marker.binding.attemptId, attemptId);
  assert.deepEqual((await readdir(outputRoot)).sort(), [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
  const markerBytesBeforeReuse = await readFile(path.join(
    outputRoot,
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME
  ));
  const reboundAttemptCandidate = parseStorageV13MatrixCandidateEnvironment({
      HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
      HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: outputRoot,
      HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: root,
      HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(root, "dist", "web"),
      HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(root, "tmp", "release-artifact-identity.json"),
      HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
      HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
      HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: `attempt-${"c".repeat(64)}`
  });
  await assert.rejects(
    prepareFreshStorageV13MatrixCandidateRun(reboundAttemptCandidate, { cwd: root }),
    /STORAGE_V13_MATRIX_RUN_ROOT_NOT_FRESH/u
  );
  assert.deepEqual(
    await readFile(path.join(outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME)),
    markerBytesBeforeReuse
  );
});

for (const aliasSegment of ["tmp", "storage-v13-matrix-candidate"]) {
  test(`fresh candidate run rejects a pre-existing ${aliasSegment} directory alias before any out-of-scope mkdir`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-alias-root-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-alias-outside-"));
    t.after(() => Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(outside, { recursive: true, force: true })
    ]));
    if (aliasSegment !== "tmp") await mkdir(path.join(root, "tmp"));
    const aliasPath = aliasSegment === "tmp"
      ? path.join(root, "tmp")
      : path.join(root, "tmp", "storage-v13-matrix-candidate");
    try {
      await symlink(outside, aliasPath, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (error && typeof error === "object" && ["EPERM", "EACCES"].includes(error.code)) {
        t.skip(`Directory alias creation is unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    const runId = `matrix-alias-${aliasSegment === "tmp" ? "tmp" : "parent"}-0001`;
    const candidate = parseStorageV13MatrixCandidateEnvironment({
      HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
      HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: path.join(
        root,
        "tmp",
        "storage-v13-matrix-candidate",
        runId
      ),
      HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: root,
      HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(root, "dist", "web"),
      HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(root, "tmp", "release-artifact-identity.json"),
      HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
      HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
      HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
    });
    await assert.rejects(
      prepareFreshStorageV13MatrixCandidateRun(candidate, { cwd: root }),
      /STORAGE_V13_MATRIX_EXACT_FILESYSTEM_IDENTITY_INVALID/u
    );
    assert.deepEqual(await readdir(outside), []);
  });
}

async function prepareSummaryPublicationFixture(t, fixtureName) {
  const root = await mkdtemp(path.join(os.tmpdir(), `hakimi-storage-v13-${fixtureName}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runId = `matrix-${fixtureName}-0001`;
  const outputRoot = path.join(root, "tmp", "storage-v13-matrix-candidate", runId);
  const candidate = parseStorageV13MatrixCandidateEnvironment({
    HAKIMI_STORAGE_V13_MATRIX_ORIGIN: "https://staging.example.com",
    HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT: outputRoot,
    HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT: root,
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT: path.join(root, "dist", "web"),
    HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK: path.join(root, "tmp", "release-artifact-identity.json"),
    HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_STORAGE_V13_MATRIX_RUN_ID: runId,
    HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID: attemptId
  });
  await prepareFreshStorageV13MatrixCandidateRun(candidate, { cwd: root });
  const marker = await createStorageV13MatrixCandidateAttemptMarker(candidate, {
    cwd: root,
    createdAt: "2026-08-27T02:59:00.000Z"
  });
  const summary = {
    schemaVersion: 2,
    summaryType: "storage_v13_matrix_playwright_candidate_summary_v2",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    candidateCaptureComplete: false,
    matrixComplete: false,
    strictGatePassed: false,
    runId,
    attemptMarker: { ...marker.binding },
    authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
    summaryDigest: "0".repeat(64)
  };
  const unsignedSummary = clone(summary);
  delete unsignedSummary.summaryDigest;
  summary.summaryDigest = sha256(canonicalJson(unsignedSummary));
  const summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const pendingPath = path.join(outputRoot, STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME);
  const finalPath = path.join(outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME);
  const pendingTerminalCommitPath = path.join(
    outputRoot,
    STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME
  );
  const terminalCommitPath = path.join(outputRoot, STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME);
  await writeFile(pendingPath, summaryBytes, { flag: "wx" });
  const directoryLocks = Object.freeze({
    bindingRoot: await exactDirectoryLock(root),
    outputRoot: await exactDirectoryLock(outputRoot),
    projectRoots: Object.freeze({
      msedge: await exactDirectoryLock(path.join(outputRoot, "msedge")),
      chrome: await exactDirectoryLock(path.join(outputRoot, "chrome"))
    }),
    projectEntryNames: Object.freeze({ msedge: Object.freeze([]), chrome: Object.freeze([]) })
  });
  return {
    candidate,
    directoryLocks,
    finalPath,
    marker,
    outputRoot,
    pendingPath,
    pendingTerminalCommitPath,
    summaryBytes,
    terminalCommitPath,
    root
  };
}

test("summary publication commits only after the fixed native terminal marker rename", async (t) => {
  const fixture = await prepareSummaryPublicationFixture(t, "publish-commit");
  const publication = await publishStorageV13MatrixCandidateSummary({
    candidateEnvironment: fixture.candidate,
    expectedAttemptMarker: fixture.marker,
    expectedBytes: fixture.summaryBytes,
    directoryLocks: fixture.directoryLocks
  });
  const terminalCommitBytes = Buffer.from(`${sha256(fixture.summaryBytes)}\n`, "utf8");
  assert.deepEqual(await readFile(fixture.finalPath), fixture.summaryBytes);
  assert.deepEqual(await readFile(fixture.terminalCommitPath), terminalCommitBytes);
  await assert.rejects(readFile(fixture.pendingPath), /ENOENT/u);
  await assert.rejects(readFile(fixture.pendingTerminalCommitPath), /ENOENT/u);
  assert.equal(publication.published, true);
  assert.equal(publication.sha256, sha256(fixture.summaryBytes));
  assert.deepEqual(publication.terminalGateBinding, {
    path: path.relative(fixture.root, fixture.terminalCommitPath)
      .split(path.sep).join("/"),
    size: 65,
    sha256: sha256(terminalCommitBytes),
    commitsSummarySha256: sha256(fixture.summaryBytes)
  });
  assert.deepEqual((await readdir(fixture.outputRoot)).sort(), [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
});

test("public summary publication rejects test seams and a native terminal rename failure stays uncommitted", async (t) => {
  const fixture = await prepareSummaryPublicationFixture(t, "publish-native-failure");
  await assert.rejects(
    publishStorageV13MatrixCandidateSummary({
      candidateEnvironment: fixture.candidate,
      expectedAttemptMarker: fixture.marker,
      expectedBytes: fixture.summaryBytes,
      directoryLocks: fixture.directoryLocks,
      beforeTerminalCommit: async () => undefined
    }),
    /STORAGE_V13_MATRIX_SUMMARY_PUBLICATION_INPUT_INVALID/u
  );
  for (const terminalCommitFault of [
    async () => undefined,
    "rename_then_throw"
  ]) {
    await assert.rejects(
      testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault({
        candidateEnvironment: fixture.candidate,
        expectedAttemptMarker: fixture.marker,
        expectedBytes: fixture.summaryBytes,
        directoryLocks: fixture.directoryLocks,
        terminalCommitFault
      }),
      /STORAGE_V13_MATRIX_SUMMARY_TEST_FAULT_INVALID/u
    );
  }
  await assert.rejects(
    testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault({
      candidateEnvironment: fixture.candidate,
      expectedAttemptMarker: fixture.marker,
      expectedBytes: fixture.summaryBytes,
      directoryLocks: fixture.directoryLocks,
      terminalCommitFault: "create_target_directory_collision"
    }),
    (error) => error && typeof error === "object"
      && ["EACCES", "EEXIST", "EISDIR", "ENOTEMPTY", "EPERM"].includes(error.code)
  );
  assert.deepEqual(await readFile(fixture.finalPath), fixture.summaryBytes);
  await assert.rejects(readFile(fixture.pendingPath), /ENOENT/u);
  assert.deepEqual(
    await readFile(fixture.pendingTerminalCommitPath),
    Buffer.from(`${sha256(fixture.summaryBytes)}\n`, "utf8")
  );
  assert.equal((await lstat(fixture.terminalCommitPath)).isDirectory(), true);
  assert.deepEqual((await readdir(fixture.outputRoot)).sort(), [
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME,
    STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
    "chrome",
    "msedge"
  ].sort());
});

test("capture wrapper rejects every appended CLI argument before Playwright or output mutation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-wrapper-args-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const forbiddenOutput = path.join(root, "must-not-exist");
  const result = spawnSync(process.execPath, [captureWrapperPath, "--output", forbiddenOutput], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /STORAGE_V13_MATRIX_CAPTURE_ARGUMENTS_FORBIDDEN/u);
  await assert.rejects(readFile(forbiddenOutput), /ENOENT/u);
});

test("policy rejects a promoted schema-13 capability", async (t) => {
  const cwd = await writeGovernanceFixture(t, ({ policy }) => {
    policy.capabilities.mutationEpochCapability = "present";
    policy.capabilities.epoch = 1;
  });
  await assert.rejects(
    loadStorageV13MatrixCandidatePolicy(cwd),
    /STORAGE_V13_MATRIX_POLICY_INVALID/u
  );
});

test("policy rejects observed-operation weakening and deferred-boundary promotion", async (t) => {
  const weakenedOperationCwd = await writeGovernanceFixture(t, ({ policy }) => {
    policy.observedOperations[1].countDeltas.cases = 1;
  });
  await assert.rejects(
    loadStorageV13MatrixCandidatePolicy(weakenedOperationCwd),
    /STORAGE_V13_MATRIX_POLICY_INVALID/u
  );

  const weakenedExportBindingCwd = await writeGovernanceFixture(t, ({ policy }) => {
    delete policy.observedOperations[3].relationship;
  });
  await assert.rejects(
    loadStorageV13MatrixCandidatePolicy(weakenedExportBindingCwd),
    /STORAGE_V13_MATRIX_POLICY_INVALID/u
  );

  const promotedBoundaryCwd = await writeGovernanceFixture(t, ({ policy }) => {
    Object.assign(policy.deferredBoundaries[3], {
      status: "observed_pass",
      satisfied: true,
      evidence: { receiptId: "invented" },
      reasonCode: "NONE"
    });
  });
  await assert.rejects(
    loadStorageV13MatrixCandidatePolicy(promotedBoundaryCwd),
    /STORAGE_V13_MATRIX_POLICY_INVALID/u
  );
});

test("governance rejects candidate insertion into the formal receipt allowlist", async (t) => {
  const cwd = await writeGovernanceFixture(t, ({ decisions }) => {
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands["storage-v13-matrix"] = [
      "npm",
      "run",
      "test:storage-v13-matrix-candidate"
    ];
  });
  await assert.rejects(
    loadStorageV13MatrixGovernanceBindings(cwd),
    /STORAGE_V13_MATRIX_FORMAL_ALLOWLIST_REBOUND/u
  );
});

for (const projectName of ["msedge", "chrome"]) {
  test(`${projectName} writes a closed candidate receipt from the exact six-operation matrix`, async (t) => {
    const fixture = await writerFixture(t, projectName);
    const result = await writeStorageV13MatrixBrowserCandidate(fixture.input);
    assert.equal(result.document.projectName, projectName);
    assert.equal(result.document.browserChannel, projectName);
    assert.equal(result.document.trustClass, "untrusted_candidate");
    assert.equal(result.document.status, "not_admitted");
    assert.equal(result.document.executionAdmission, "closed_deferred_boundaries");
    assert.equal(result.document.matrixComplete, false);
    assert.equal(result.document.strictGatePassed, false);
    assert.deepEqual(result.document.capabilities, STORAGE_V13_MATRIX_CAPABILITIES);
    assert.deepEqual(result.document.authority, STORAGE_V13_MATRIX_AUTHORITY);
    assert.match(
      fixture.preparedOutput.exactDirectoryIdentities.projectRoot.ino,
      /^[1-9][0-9]*$/u
    );
    assert.match(
      fixture.input.initialArtifact.storageV13ExactFilesystemIdentity.identityLock.ino,
      /^[1-9][0-9]*$/u
    );
    assert.equal(result.document.artifactIdentity.fileCount, 4);
    assert.equal(result.document.artifactIdentity.files.length, 4);
    assert.match(result.document.artifactIdentity.artifactRoot.dev, /^(?:0|[1-9][0-9]*)$/u);
    assert.match(result.document.artifactIdentity.artifactRoot.ino, /^[1-9][0-9]*$/u);
    assert.match(result.document.artifactIdentity.artifactRoot.birthtimeNs, /^(?:0|[1-9][0-9]*)$/u);
    assert.equal(result.document.artifactIdentity.identityLock.nlink, 1);
    assert.equal(result.document.artifactStability.stable, true);
    assert.equal(
      result.document.artifactStability.initialVerificationDigest,
      result.document.artifactStability.finalVerificationDigest
    );
    assert.equal(result.document.operationObservations.length, 6);
    assert.equal(result.document.operationObservations.flatMap((entry) => entry.captures).length, 16);
    assert.equal(
      result.document.operationObservations.filter((entry) => entry.safetyBackup !== null).length,
      1
    );
    assert.equal(
      result.document.operationObservations[4].safetyBackup.counts.researchNotes,
      1
    );
    assert.equal(result.document.deferredBoundaries.every((entry) => entry.satisfied === false), true);
    const unsigned = clone(result.document);
    delete unsigned.receiptDigest;
    assert.equal(result.document.receiptDigest, sha256(canonicalJson(unsigned)));
    const entries = await readdir(fixture.preparedOutput.projectRoot);
    assert.equal(entries.length, 17);
    assert.equal(entries.includes("browser-receipt.json"), true);
    for (const observed of result.document.operationObservations) {
      for (const capture of observed.captures) {
        const bytes = await readFile(path.join(fixture.root, capture.path));
        assert.equal(bytes.length, capture.size);
        assert.equal(sha256(bytes), capture.sha256);
      }
    }
  });
}

test("an extra physical store mutation fails closed", async (t) => {
  const fixture = await writerFixture(t);
  const createAfter = fixture.input.operationObservations[0].captures[1];
  rewriteSnapshotStore(createAfter, "appSettings", {
    count: 1,
    recordsDigest: sha256("unexpected-app-settings-write")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_STORE_DIFF_INVALID/u
  );
});

test("semantic witness rejects a Case latest pointer rebound to a non-added Revision", async (t) => {
  const fixture = await writerFixture(t);
  const editAfter = fixture.input.operationObservations[1].captures[1];
  rewriteSnapshotWitness(editAfter, (witness) => {
    witness.cases[0].latestRevisionIdDigest = REVISION_1_ID_DIGEST;
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_SEMANTIC_CASE_REVISION_MISMATCH/u
  );
});

test("edit semantic witness rejects an old R1 record rewrite after every inner digest is rebound", async (t) => {
  const fixture = await writerFixture(t);
  const editAfter = fixture.input.operationObservations[1].captures[1];
  rewriteSnapshotWitness(editAfter, (witness) => {
    witness.revisions[0].recordDigest = sha256("rewritten-existing-r1-record");
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("edit semantic witness rejects an unrelated Case-field rewrite after all capture digests are rebound", async (t) => {
  const fixture = await writerFixture(t);
  const editAfter = fixture.input.operationObservations[1].captures[1];
  rewriteSnapshotWitness(editAfter, (witness) => {
    witness.cases[0].editStableRecordDigest = sha256("rewritten-case-title-stable-record");
    witness.cases[0].recordDigest = sha256("rewritten-case-title-full-record");
  });
  rewriteSnapshotStore(editAfter, "cases", {
    recordsDigest: sha256("rewritten-case-title-native-records"),
    logicalContentDigest: sha256("rewritten-case-title-logical-content")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("edit rejects a candidate-set fingerprint aggregate rewrite after all capture digests are rebound", async (t) => {
  const fixture = await writerFixture(t);
  const editAfter = fixture.input.operationObservations[1].captures[1];
  rewriteSnapshotWitness(editAfter, (witness) => {
    witness.candidateSetFingerprintInventory.logicalContentDigest =
      sha256("rewritten-candidate-set-fingerprint-inventory");
  });
  rewriteSnapshotStore(editAfter, "birthFingerprints", {
    recordsDigest: sha256("rewritten-candidate-set-fingerprint-native-records")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("delete intermediate semantic witness rejects null lifecycle and an active-phase replay", async (t) => {
  const nullLifecycleFixture = await writerFixture(t);
  const nullLifecycle = nullLifecycleFixture.input.operationObservations[2].captures[1];
  rewriteSnapshotWitness(nullLifecycle, (witness) => {
    witness.cases[0].lifecycleState = null;
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(nullLifecycleFixture.input),
    /STORAGE_V13_MATRIX_SEMANTIC_CASE_INVALID/u
  );

  const replayFixture = await writerFixture(t);
  const replayedIntermediate = replayFixture.input.operationObservations[2].captures[1];
  rewriteSnapshotWitness(replayedIntermediate, (witness) => {
    witness.cases[0].lifecycleState = "active";
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(replayFixture.input),
    /STORAGE_V13_MATRIX_DELETE_TRASH_PRECONDITION_INVALID/u
  );
});

test("semantic witness rejects a revision fingerprint rebound to the wrong Case subject", async (t) => {
  const fixture = await writerFixture(t);
  const editAfter = fixture.input.operationObservations[1].captures[1];
  rewriteSnapshotWitness(editAfter, (witness) => {
    witness.revisionFingerprints[1].subjectIdDigest = sha256("wrong-case-subject");
    witness.revisionFingerprints.sort((left, right) =>
      (left.subjectIdDigest < right.subjectIdDigest ? -1 : left.subjectIdDigest > right.subjectIdDigest ? 1 : 0)
        || (left.sourceIdDigest < right.sourceIdDigest ? -1 : 1));
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_SEMANTIC_FINGERPRINT_RELATION_INVALID/u
  );
});

test("semantic witness rejects an inventory above the bound and duplicate identifier digests", async (t) => {
  const overBoundFixture = await writerFixture(t);
  const overBound = overBoundFixture.input.operationObservations[0].captures[1];
  rewriteSnapshotWitness(overBound, (witness) => {
    witness.cases = Array.from({ length: 4097 }, (_, index) => ({
      caseIdDigest: sha256(`over-bound-case-${index}`),
      latestRevisionIdDigest: sha256(`over-bound-revision-${index}`),
      revisionCount: 1,
      lifecycleState: "active",
      lifecycleIndependentRecordDigest: sha256(`over-bound-stable-${index}`),
      editStableRecordDigest: sha256(`over-bound-edit-stable-${index}`),
      recordDigest: sha256(`over-bound-record-${index}`)
    }));
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(overBoundFixture.input),
    /STORAGE_V13_MATRIX_SEMANTIC_WITNESS_INVALID/u
  );

  const duplicateFixture = await writerFixture(t);
  const duplicate = duplicateFixture.input.operationObservations[0].captures[1];
  rewriteSnapshotWitness(duplicate, (witness) => {
    witness.cases.push(clone(witness.cases[0]));
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(duplicateFixture.input),
    /STORAGE_V13_MATRIX_SEMANTIC_WITNESS_DUPLICATE/u
  );
});

test("restore preflight writes are rejected", async (t) => {
  const fixture = await writerFixture(t);
  const restoreAfterPreflight = fixture.input.operationObservations[4].captures[2];
  rewriteSnapshotStore(restoreAfterPreflight, "researchNotes", {
    count: 2,
    recordsDigest: sha256("preflight-write")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_UNEXPECTED_MUTATION/u
  );
});

test("restore must return to the exact exported baseline", async (t) => {
  const fixture = await writerFixture(t);
  const restoreAfterCommit = fixture.input.operationObservations[4].captures[4];
  rewriteSnapshotStore(restoreAfterCommit, "researchNotes", {
    count: 1,
    recordsDigest: sha256("restore-did-not-return-to-baseline")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_UNEXPECTED_MUTATION/u
  );
});

test("a deferred boundary cannot be promoted by browser input", async (t) => {
  const fixture = await writerFixture(t);
  Object.assign(fixture.input.deferredBoundaries[0], {
    status: "observed_pass",
    satisfied: true,
    evidence: { receiptId: "untrusted-browser-claim" },
    reasonCode: "NONE"
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_INVALID/u
  );
});

test("capture ids are globally unique across all six operations", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[1].captures[0].captureId =
    fixture.input.operationObservations[0].captures[0].captureId;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_CAPTURE_REUSED/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("capture timestamps must remain ordered inside the run interval before any write", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[0].captures[0].capturedAt = "2026-08-27T02:59:59.999Z";
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_CAPTURE_INTERVAL_INVALID/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer rebinds output scope to cwd and the exact run id", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.runId = "matrix-run-9999";
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_WRITER_SCOPE_INVALID/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer rejects an artifact lock changed after the browser snapshot", async (t) => {
  const fixture = await writerFixture(t);
  await writeFile(
    fixture.input.candidateEnvironment.artifactLock,
    '{"replaced":"after-browser-snapshot"}\n',
    "utf8"
  );
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer rejects a lossy or rebound exact BigInt artifact identity", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.finalArtifact.storageV13ExactFilesystemIdentity.identityLock.ino =
    (BigInt(fixture.input.finalArtifact.storageV13ExactFilesystemIdentity.identityLock.ino) + 1n)
      .toString(10);
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_ARTIFACT_EXACT_IDENTITY_REBOUND/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("create, edit, and delete captures must be adjacent", async (t) => {
  const fixture = await writerFixture(t);
  const editBefore = fixture.input.operationObservations[1].captures[0];
  rewriteSnapshotStore(editBefore, "birthFingerprints", {
    recordsDigest: sha256("unobserved-between-create-and-edit")
  });
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_UNEXPECTED_MUTATION/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer and schema share the production 120 MiB archive ceiling", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[3].download.size = STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES + 1;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_DOWNLOAD_EVIDENCE_INVALID/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer rejects a download filename that the frozen schema cannot encode", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[3].download.suggestedFilename = "含空格.zip";
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_DOWNLOAD_EVIDENCE_INVALID/u
  );
  assert.deepEqual(await readdir(fixture.preparedOutput.projectRoot), []);
});

test("writer rejects operation-swapped export and restore download filenames", async (t) => {
  const exportFixture = await writerFixture(t);
  exportFixture.input.operationObservations[3].download.suggestedFilename =
    "hakimi-before-restore-2026-08-27.zip";
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(exportFixture.input),
    /STORAGE_V13_MATRIX_DOWNLOAD_EVIDENCE_INVALID/u
  );

  const restoreFixture = await writerFixture(t);
  restoreFixture.input.operationObservations[4].download.suggestedFilename =
    "hakimi-full-backup-2026-08-27.zip";
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(restoreFixture.input),
    /STORAGE_V13_MATRIX_DOWNLOAD_EVIDENCE_INVALID/u
  );
});

test("only restore may carry the exact safety-backup projection key", async (t) => {
  const nonRestoreFixture = await writerFixture(t);
  nonRestoreFixture.input.operationObservations[3].safetyBackup = clone(
    nonRestoreFixture.input.operationObservations[4].safetyBackup
  );
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(nonRestoreFixture.input),
    /STORAGE_V13_MATRIX_UNEXPECTED_SAFETY_BACKUP_PROJECTION/u
  );

  const missingKeyFixture = await writerFixture(t);
  delete missingKeyFixture.input.operationObservations[0].safetyBackup;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(missingKeyFixture.input),
    /STORAGE_V13_MATRIX_OPERATION_INVALID/u
  );
});

test("restore safety backup must match before_commit shared counts", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[4].safetyBackup.counts.researchNotes = 0;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_SAFETY_BACKUP_CONTENT_MISMATCH/u
  );
});

test("export and restore cannot share a self-consistent backup count that disagrees with after_ui_read", async (t) => {
  const fixture = await writerFixture(t);
  const exported = fixture.input.operationObservations[3];
  const restore = fixture.input.operationObservations[4];
  const wrongCount = exported.backup.counts.researchNotes + 1;
  exported.backup.counts.researchNotes = wrongCount;
  restore.backup.counts.researchNotes = wrongCount;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_EXPORT_BACKUP_CONTENT_MISMATCH/u
  );
});

test("export and restore cannot both substitute native recordsDigest for the logical content digest", async (t) => {
  const fixture = await writerFixture(t);
  const exported = fixture.input.operationObservations[3];
  const restore = fixture.input.operationObservations[4];
  const nativeRecordsDigest = exported.captures[1].stores.find(
    (store) => store.storeName === "cases"
  ).recordsDigest;
  exported.backup.sharedPartitionContentDigests.cases = nativeRecordsDigest;
  restore.backup.sharedPartitionContentDigests.cases = nativeRecordsDigest;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_EXPORT_BACKUP_CONTENT_MISMATCH/u
  );
});

test("export rejects a self-consistent logical-content rebind across downstream attachments", async (t) => {
  const fixture = await writerFixture(t);
  const exported = fixture.input.operationObservations[3];
  const restore = fixture.input.operationObservations[4];
  const cancel = fixture.input.operationObservations[5];
  const rebound = sha256("self-consistent-logical-content-rebind");
  for (const capture of [
    exported.captures[1],
    restore.captures[0],
    restore.captures[4],
    cancel.captures[0],
    cancel.captures[1]
  ]) {
    rewriteSnapshotStore(capture, "cases", { logicalContentDigest: rebound });
  }
  exported.backup.sharedPartitionContentDigests.cases = rebound;
  restore.backup.sharedPartitionContentDigests.cases = rebound;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_STORE_DIFF_INVALID/u
  );
});

test("restore safety backup payload cannot equal the restore target", async (t) => {
  const fixture = await writerFixture(t);
  fixture.input.operationObservations[4].safetyBackup.payloadDigest =
    fixture.input.operationObservations[4].backup.payloadDigest;
  await assert.rejects(
    writeStorageV13MatrixBrowserCandidate(fixture.input),
    /STORAGE_V13_MATRIX_SAFETY_BACKUP_TARGET_COLLISION/u
  );
});

test("writer serializes its initial immutable browser-input snapshot", async (t) => {
  const fixture = await writerFixture(t);
  const original = clone(fixture.input.operationObservations[0].captures[0]);
  const pending = writeStorageV13MatrixBrowserCandidate(fixture.input);
  queueMicrotask(() => {
    rewriteSnapshotStore(
      fixture.input.operationObservations[0].captures[0],
      "appSettings",
      { recordsDigest: sha256("mutated-after-writer-entry") }
    );
  });
  const result = await pending;
  const firstBinding = result.document.operationObservations[0].captures[0];
  const persisted = JSON.parse(await readFile(path.join(fixture.root, firstBinding.path), "utf8"));
  assert.equal(persisted.snapshotDigest, original.snapshotDigest);
  assert.deepEqual(persisted.stores, original.stores);
});
