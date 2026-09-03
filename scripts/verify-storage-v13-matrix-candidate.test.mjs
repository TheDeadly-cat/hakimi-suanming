import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  link,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR } from "./deployed-pwa-candidate-runtime.mjs";
import {
  canonicalJson,
  sha256
} from "./release-evidence-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";
import {
  STORAGE_V13_MATRIX_AUTHORITY,
  STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
  STORAGE_V13_MATRIX_CAPABILITIES,
  STORAGE_V13_MATRIX_ENVIRONMENT_KEYS,
  STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES,
  STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME,
  STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES,
  STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES,
  STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
  STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME,
  createStorageV13MatrixCandidateAttemptMarker,
  loadStorageV13MatrixCandidatePolicy,
  loadVerifiedDeployedPwaCandidateArtifact,
  parseStorageV13MatrixCandidateEnvironment,
  prepareCandidateProjectOutput,
  prepareFreshStorageV13MatrixCandidateRun,
  writeStorageV13MatrixBrowserCandidate
} from "./storage-v13-matrix-candidate-runtime.mjs";
import {
  STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256,
  STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID,
  STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH,
  buildStorageV13MatrixCandidateVerificationFailure,
  parseStorageV13MatrixCandidateVerifierEnvironment,
  verifyStorageV13MatrixCandidate
} from "./verify-storage-v13-matrix-candidate.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifierPath = path.join(workspaceRoot, "scripts", "verify-storage-v13-matrix-candidate.mjs");
const origin = "https://staging.example.com";
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const runId = "storage-matrix-run-0001";
const attemptId = `attempt-${"b".repeat(64)}`;
const startedAt = "2026-08-27T00:00:00.000Z";
const completedAt = "2026-08-27T00:00:30.000Z";

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function snapshotProjection(snapshot) {
  return {
    databaseName: snapshot.databaseName,
    physicalVersion: snapshot.physicalVersion,
    dexieVersion: snapshot.dexieVersion,
    transactionMode: snapshot.transactionMode,
    storeNames: snapshot.storeNames,
    stores: snapshot.stores,
    semanticWitness: snapshot.semanticWitness
  };
}

function semanticWitness({ cases, revisions, revisionFingerprints }) {
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  const candidateSetFingerprintInventory = {
    count: 0,
    logicalContentDigest: sha256(canonicalJson([]))
  };
  const projection = {
    witnessType: "bounded_hashed_case_revision_relationships_v1",
    maximumEntriesPerCollection: 4096,
    cases: [...cases].sort((left, right) => compare(left.caseIdDigest, right.caseIdDigest)),
    revisions: [...revisions].sort((left, right) =>
      compare(left.caseIdDigest, right.caseIdDigest)
        || left.revisionNumber - right.revisionNumber
        || compare(left.revisionIdDigest, right.revisionIdDigest)),
    revisionFingerprints: [...revisionFingerprints].sort((left, right) =>
      compare(left.subjectIdDigest, right.subjectIdDigest)
        || compare(left.sourceIdDigest, right.sourceIdDigest)),
    candidateSetFingerprintInventory
  };
  return { ...projection, witnessDigest: sha256(canonicalJson(projection)) };
}

const CASE_ID_DIGEST = sha256("verifier-case-1");
const REVISION_1_ID_DIGEST = sha256("verifier-revision-1");
const REVISION_2_ID_DIGEST = sha256("verifier-revision-2");
const CASE_CREATE_STABLE_DIGEST = sha256("verifier-case-create-stable");
const CASE_EDIT_STABLE_DIGEST = sha256("verifier-case-edit-stable");
const CASE_EDIT_STABLE_ACTIVE_DIGEST = sha256("verifier-case-edit-stable-active-fields");
const CASE_EDIT_STABLE_TRASHED_DIGEST = sha256("verifier-case-edit-stable-trashed-fields");
const REVISION_1_RECORD_DIGEST = sha256("verifier-revision-1-record");
const REVISION_2_RECORD_DIGEST = sha256("verifier-revision-2-record");
const FINGERPRINT_1_RECORD_DIGEST = sha256("verifier-fingerprint-1-record");
const FINGERPRINT_2_RECORD_DIGEST = sha256("verifier-fingerprint-2-record");
const EMPTY_WITNESS = semanticWitness({ cases: [], revisions: [], revisionFingerprints: [] });
const CREATE_WITNESS = semanticWitness({
  cases: [{
    caseIdDigest: CASE_ID_DIGEST,
    latestRevisionIdDigest: REVISION_1_ID_DIGEST,
    revisionCount: 1,
    lifecycleState: "active",
    lifecycleIndependentRecordDigest: CASE_CREATE_STABLE_DIGEST,
    editStableRecordDigest: CASE_EDIT_STABLE_ACTIVE_DIGEST,
    recordDigest: sha256("verifier-case-create-record")
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
    lifecycleIndependentRecordDigest: CASE_EDIT_STABLE_DIGEST,
    editStableRecordDigest: CASE_EDIT_STABLE_ACTIVE_DIGEST,
    recordDigest: sha256("verifier-case-edit-record")
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
    recordDigest: sha256("verifier-case-trashed-record")
  }],
  revisions: EDIT_WITNESS.revisions,
  revisionFingerprints: EDIT_WITNESS.revisionFingerprints
});

function baselineState(projectName) {
  return {
    ...Object.fromEntries(STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.map((storeName) => [
      storeName,
      {
        count: 0,
        recordsDigest: sha256(`${projectName}:baseline:records:${storeName}`),
        logicalContentDigest: storeName === "birthFingerprints"
          ? null
          : sha256(`${projectName}:baseline:logical:${storeName}`)
      }
    ])),
    semanticWitness: structuredClone(EMPTY_WITNESS)
  };
}

function deriveState(previous, projectName, label, changes, witness = previous.semanticWitness) {
  const next = structuredClone(previous);
  for (const [storeName, count] of Object.entries(changes)) {
    next[storeName] = {
      count,
      recordsDigest: sha256(`${projectName}:${label}:records:${storeName}:${count}`),
      logicalContentDigest: storeName === "birthFingerprints"
        ? null
        : sha256(`${projectName}:${label}:logical:${storeName}:${count}`)
    };
  }
  next.semanticWitness = structuredClone(witness);
  return next;
}

function snapshot({ projectName, operationId, phase, state, sequence }) {
  const value = {
    schemaVersion: 2,
    recordType: "storage_v13_native_readonly_snapshot_v2",
    captureId: `${runId}-${projectName}-${String(sequence).padStart(2, "0")}`,
    operationId,
    phase,
    capturedAt: `2026-08-27T00:00:${String(sequence).padStart(2, "0")}.000Z`,
    databaseName: "hakimi-bazi-research",
    physicalVersion: 130,
    dexieVersion: 13,
    transactionMode: "readonly",
    storeNames: [...STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES],
    stores: STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.map((storeName) => ({
      storeName,
      ...state[storeName]
    })),
    semanticWitness: structuredClone(state.semanticWitness),
    snapshotDigest: "0".repeat(64)
  };
  value.snapshotDigest = sha256(canonicalJson(snapshotProjection(value)));
  return value;
}

function noDownload() {
  return {
    observed: false,
    eventCount: 0,
    size: null,
    sha256: null,
    suggestedFilename: null
  };
}

function observedDownload(projectName, operationId) {
  return {
    observed: true,
    eventCount: 1,
    size: 512,
    sha256: sha256(`${projectName}:${operationId}:download`),
    suggestedFilename: operationId === "export"
      ? "hakimi-full-backup-2026-08-27.zip"
      : "hakimi-before-restore-2026-08-27.zip"
  };
}

function backupProjection(projectName, label, state) {
  return {
    formatVersion: "1.2.0",
    payloadDigest: sha256(`${projectName}:logical-backup:${label}`),
    logicalPartitionNames: [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES],
    counts: Object.fromEntries(
      STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES.map((partitionName) => [
        partitionName,
        partitionName === "revisionCalculationReceipts" ? 0 : state[partitionName].count
      ])
    ),
    sharedPartitionContentDigests: Object.fromEntries(
      STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.map((partitionName) => [
        partitionName,
        state[partitionName].logicalContentDigest
      ])
    )
  };
}

function operationObservations(projectName, policy) {
  const baseline = baselineState(projectName);
  const afterCreate = deriveState(baseline, projectName, "after-create", {
    birthFingerprints: 1,
    cases: 1,
    revisions: 1
  }, CREATE_WITNESS);
  const afterEdit = deriveState(afterCreate, projectName, "after-edit", {
    birthFingerprints: 2,
    cases: 1,
    revisions: 2
  }, EDIT_WITNESS);
  const afterTrash = deriveState(afterEdit, projectName, "after-trash", {
    cases: 1
  }, TRASHED_WITNESS);
  const changedBeforeRestore = deriveState(baseline, projectName, "changed-before-restore", {
    birthFingerprints: 1,
    cases: 1,
    revisions: 1
  }, CREATE_WITNESS);
  const statesByOperation = {
    create: [baseline, afterCreate],
    edit: [afterCreate, afterEdit],
    delete: [afterEdit, afterTrash, baseline],
    export: [baseline, baseline],
    restore: [baseline, changedBeforeRestore, changedBeforeRestore, changedBeforeRestore, baseline],
    cancel: [baseline, baseline]
  };
  const backup = backupProjection(projectName, "target", baseline);
  const safetyBackup = backupProjection(
    projectName,
    "safety-before-commit",
    changedBeforeRestore
  );
  let sequence = 0;
  return policy.observedOperations.map((operationPolicy) => {
    const operationId = operationPolicy.operationId;
    const captures = operationPolicy.capturePhases.map((phase, index) => {
      sequence += 1;
      return snapshot({
        projectName,
        operationId,
        phase,
        state: statesByOperation[operationId][index],
        sequence
      });
    });
    const carriesBackup = operationId === "export" || operationId === "restore";
    return {
      operationId,
      status: "observed_pass",
      uiPath: operationPolicy.uiPath,
      observationMethod: "native_indexeddb_readonly_v2",
      captures,
      download: carriesBackup ? observedDownload(projectName, operationId) : noDownload(),
      backup: carriesBackup ? structuredClone(backup) : null,
      safetyBackup: operationId === "restore" ? structuredClone(safetyBackup) : null
    };
  });
}

function pageIdentity(artifact) {
  return {
    appBootReady: "true",
    dbGeneration: "legacy-v13",
    dbSchema: "13",
    evidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    descriptor: structuredClone(artifact.descriptor)
  };
}

async function copyCheckedSources(bindingRoot) {
  const releaseRoot = path.join(bindingRoot, "docs", "release");
  await mkdir(releaseRoot, { recursive: true });
  for (const relativePath of [
    STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH,
    "docs/release/storage-v13-matrix-candidate-policy.v2.json",
    "docs/release/web-v1-release-decisions.json"
  ]) {
    const destination = path.join(bindingRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(path.join(workspaceRoot, ...relativePath.split("/"))));
  }
}

async function writeLockedArtifact(bindingRoot) {
  const artifactRoot = path.join(bindingRoot, "dist", "web");
  const artifactLock = path.join(bindingRoot, "tmp", "private", "release-artifact-identity.json");
  await Promise.all([
    mkdir(artifactRoot, { recursive: true }),
    mkdir(path.dirname(artifactLock), { recursive: true })
  ]);
  const descriptor = structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR);
  const storageManifestText = JSON.stringify({ manifestVersion: 1, database: descriptor });
  const manifestDigest = sha256(storageManifestText);
  const buildVersion = "abcdef123456";
  const metadata = [
    `<meta name="hakimi-release-database" content="${htmlEscape(JSON.stringify(descriptor))}">`,
    `<meta name="hakimi-release-storage-manifest" content="${htmlEscape(storageManifestText)}">`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${manifestDigest}">`,
    `<meta name="hakimi-build-version" content="${buildVersion}">`,
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
    cwd: bindingRoot,
    dist: artifactRoot,
    lockPath: artifactLock,
    channel: "default-v13",
    evidenceId: releaseEvidenceId,
    createdAt: "2026-08-27T00:00:00.000Z"
  });
  return { artifactRoot, artifactLock };
}

function summaryDigest(summary) {
  const unsigned = structuredClone(summary);
  delete unsigned.summaryDigest;
  return sha256(canonicalJson(unsigned));
}

function receiptDigest(receipt) {
  const unsigned = structuredClone(receipt);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

async function writeRunSummaryAndTerminalCommit(summaryPath, summary) {
  const bytes = jsonBytes(summary);
  await writeFile(summaryPath, bytes);
  const terminalCommitPath = path.join(
    path.dirname(summaryPath),
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME
  );
  await writeFile(terminalCommitPath, `${sha256(bytes)}\n`, "utf8");
  return { bytes, terminalCommitPath };
}

async function rewriteProjectReceiptAndSummary(fixture, projectName, mutate) {
  const receiptPath = path.join(fixture.outputRoot, projectName, "browser-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  mutate(receipt);
  receipt.receiptDigest = receiptDigest(receipt);
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);

  const summaryPath = fixture.runSummary.summaryPath;
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const project = summary.projects.find((candidate) => candidate.projectName === projectName);
  assert.ok(project?.receipt);
  project.receipt.size = receiptBytes.byteLength;
  project.receipt.sha256 = sha256(receiptBytes);
  project.receipt.receiptDigest = receipt.receiptDigest;
  summary.summaryDigest = summaryDigest(summary);
  await writeRunSummaryAndTerminalCommit(summaryPath, summary);
}

async function rewriteProjectSnapshotsAndBindings(fixture, projectName, fileNames, stateLabel) {
  const projectRoot = path.join(fixture.outputRoot, projectName);
  const receiptPath = path.join(projectRoot, "browser-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const captureBindings = receipt.operationObservations.flatMap((operation) => operation.captures);
  for (const fileName of fileNames) {
    const attachmentPath = path.join(projectRoot, fileName);
    const snapshotDocument = JSON.parse(await readFile(attachmentPath, "utf8"));
    const cases = snapshotDocument.stores.find((store) => store.storeName === "cases");
    assert.ok(cases);
    cases.recordsDigest = sha256(`${projectName}:${stateLabel}:cases`);
    snapshotDocument.snapshotDigest = sha256(canonicalJson(snapshotProjection(snapshotDocument)));
    const attachmentBytes = jsonBytes(snapshotDocument);
    await writeFile(attachmentPath, attachmentBytes);
    const binding = captureBindings.find((candidate) => candidate.path.endsWith(`/${fileName}`));
    assert.ok(binding);
    binding.snapshotDigest = snapshotDocument.snapshotDigest;
    binding.size = attachmentBytes.byteLength;
    binding.sha256 = sha256(attachmentBytes);
  }
  receipt.receiptDigest = receiptDigest(receipt);
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);

  const summaryPath = fixture.runSummary.summaryPath;
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const project = summary.projects.find((candidate) => candidate.projectName === projectName);
  assert.ok(project?.receipt);
  project.receipt.size = receiptBytes.byteLength;
  project.receipt.sha256 = sha256(receiptBytes);
  project.receipt.receiptDigest = receipt.receiptDigest;
  summary.summaryDigest = summaryDigest(summary);
  await writeRunSummaryAndTerminalCommit(summaryPath, summary);
}

async function rewriteProjectSemanticSnapshotAndBindings(
  fixture,
  projectName,
  fileName,
  mutate,
  mutateSnapshot = () => undefined
) {
  const projectRoot = path.join(fixture.outputRoot, projectName);
  const receiptPath = path.join(projectRoot, "browser-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const attachmentPath = path.join(projectRoot, fileName);
  const snapshotDocument = JSON.parse(await readFile(attachmentPath, "utf8"));
  mutate(snapshotDocument.semanticWitness);
  mutateSnapshot(snapshotDocument);
  const witnessProjection = structuredClone(snapshotDocument.semanticWitness);
  delete witnessProjection.witnessDigest;
  snapshotDocument.semanticWitness.witnessDigest = sha256(canonicalJson(witnessProjection));
  snapshotDocument.snapshotDigest = sha256(canonicalJson(snapshotProjection(snapshotDocument)));
  const attachmentBytes = jsonBytes(snapshotDocument);
  await writeFile(attachmentPath, attachmentBytes);

  const binding = receipt.operationObservations
    .flatMap((operation) => operation.captures)
    .find((candidate) => candidate.path.endsWith(`/${fileName}`));
  assert.ok(binding);
  binding.snapshotDigest = snapshotDocument.snapshotDigest;
  binding.size = attachmentBytes.byteLength;
  binding.sha256 = sha256(attachmentBytes);
  receipt.receiptDigest = receiptDigest(receipt);
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);

  const summaryPath = fixture.runSummary.summaryPath;
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const project = summary.projects.find((candidate) => candidate.projectName === projectName);
  assert.ok(project?.receipt);
  project.receipt.size = receiptBytes.byteLength;
  project.receipt.sha256 = sha256(receiptBytes);
  project.receipt.receiptDigest = receipt.receiptDigest;
  summary.summaryDigest = summaryDigest(summary);
  await writeRunSummaryAndTerminalCommit(summaryPath, summary);
}

async function rewriteProjectLogicalContentSnapshotsAndBindings(
  fixture,
  projectName,
  fileNames,
  storeName,
  logicalContentDigest,
  mutateReceipt
) {
  const projectRoot = path.join(fixture.outputRoot, projectName);
  const receiptPath = path.join(projectRoot, "browser-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const captureBindings = receipt.operationObservations.flatMap((operation) => operation.captures);
  for (const fileName of fileNames) {
    const attachmentPath = path.join(projectRoot, fileName);
    const snapshotDocument = JSON.parse(await readFile(attachmentPath, "utf8"));
    const store = snapshotDocument.stores.find((candidate) => candidate.storeName === storeName);
    assert.ok(store);
    store.logicalContentDigest = logicalContentDigest;
    snapshotDocument.snapshotDigest = sha256(canonicalJson(snapshotProjection(snapshotDocument)));
    const attachmentBytes = jsonBytes(snapshotDocument);
    await writeFile(attachmentPath, attachmentBytes);
    const binding = captureBindings.find((candidate) => candidate.path.endsWith(`/${fileName}`));
    assert.ok(binding);
    binding.snapshotDigest = snapshotDocument.snapshotDigest;
    binding.size = attachmentBytes.byteLength;
    binding.sha256 = sha256(attachmentBytes);
  }
  mutateReceipt(receipt);
  receipt.receiptDigest = receiptDigest(receipt);
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);

  const summaryPath = fixture.runSummary.summaryPath;
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const project = summary.projects.find((candidate) => candidate.projectName === projectName);
  assert.ok(project?.receipt);
  project.receipt.size = receiptBytes.byteLength;
  project.receipt.sha256 = sha256(receiptBytes);
  project.receipt.receiptDigest = receipt.receiptDigest;
  summary.summaryDigest = summaryDigest(summary);
  await writeRunSummaryAndTerminalCommit(summaryPath, summary);
}

async function writeRunSummary(outputRoot, receipts) {
  const projects = [];
  for (const projectName of ["msedge", "chrome"]) {
    const receipt = receipts[projectName];
    const bytes = await readFile(receipt.receiptPath);
    projects.push({
      projectName,
      discovered: 1,
      expectedStatus: "passed",
      outcome: "expected",
      attempts: 1,
      resultStatuses: ["passed"],
      receipt: {
        path: `${projectName}/browser-receipt.json`,
        size: bytes.byteLength,
        sha256: sha256(bytes),
        receiptId: receipt.document.receiptId,
        receiptDigest: receipt.document.receiptDigest
      }
    });
  }
  const summary = {
    schemaVersion: 2,
    summaryType: "storage_v13_matrix_playwright_candidate_summary_v2",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    candidateCaptureComplete: true,
    matrixComplete: false,
    strictGatePassed: false,
    runId,
    attemptMarker: structuredClone(receipts.msedge.document.attemptMarker),
    expectedProjectNames: ["msedge", "chrome"],
    fullResultStatus: "passed",
    unexpectedProjectNames: [],
    errors: [],
    projects,
    authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
    completedAt: "2026-08-27T00:00:31.000Z",
    summaryDigest: "0".repeat(64)
  };
  summary.summaryDigest = summaryDigest(summary);
  const summaryPath = path.join(outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME);
  const { terminalCommitPath } = await writeRunSummaryAndTerminalCommit(summaryPath, summary);
  return { summary, summaryPath, terminalCommitPath };
}

async function createFixture(t) {
  const bindingRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-v13-verifier-"));
  t.after(() => rm(bindingRoot, { recursive: true, force: true }));
  await copyCheckedSources(bindingRoot);
  const { artifactRoot, artifactLock } = await writeLockedArtifact(bindingRoot);
  const outputRoot = path.join(
    bindingRoot,
    "tmp",
    "storage-v13-matrix-candidate",
    runId
  );
  const environment = {
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.origin]: origin,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.outputRoot]: outputRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.bindingRoot]: bindingRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactRoot]: artifactRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactLock]: artifactLock,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.releaseEvidenceId]: releaseEvidenceId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.runId]: runId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.attemptId]: attemptId
  };
  const candidate = parseStorageV13MatrixCandidateEnvironment(environment);
  const artifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const policy = (await loadStorageV13MatrixCandidatePolicy(bindingRoot)).document;
  await prepareFreshStorageV13MatrixCandidateRun(candidate, { cwd: bindingRoot });
  await createStorageV13MatrixCandidateAttemptMarker(candidate, {
    cwd: bindingRoot,
    createdAt: "2026-08-26T23:59:59.000Z"
  });
  const receipts = {};
  for (const projectName of ["msedge", "chrome"]) {
    const preparedOutput = await prepareCandidateProjectOutput({
      candidateEnvironment: candidate,
      bindingRoot,
      outputRoot,
      artifactRoot,
      projectName
    });
    receipts[projectName] = await writeStorageV13MatrixBrowserCandidate({
      cwd: bindingRoot,
      candidateEnvironment: candidate,
      preparedOutput,
      runId,
      targetOrigin: origin,
      initialArtifact: artifact,
      finalArtifact: artifact,
      projectName,
      browserChannel: projectName,
      actualProduct: projectName === "msedge" ? "Edg/140.0.1.2" : "Chrome/140.0.1.2",
      pageIdentity: pageIdentity(artifact),
      operationObservations: operationObservations(projectName, policy),
      deferredBoundaries: structuredClone(policy.deferredBoundaries),
      unexpectedExternalRequestCount: 0,
      startedAt,
      completedAt
    });
  }
  const runSummary = await writeRunSummary(outputRoot, receipts);
  return {
    bindingRoot,
    outputRoot,
    artifactRoot,
    artifactLock,
    environment,
    candidate,
    artifact,
    policy,
    receipts,
    runSummary
  };
}

function verifierOptions(fixture, overrides = {}) {
  return {
    ...fixture.candidate,
    cwd: fixture.bindingRoot,
    ...overrides
  };
}

test("candidate schema audits and the independent two-browser verifier remains closed", async (t) => {
  const fixture = await createFixture(t);
  const schema = JSON.parse(await readFile(
    path.join(fixture.bindingRoot, ...STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH.split("/")),
    "utf8"
  ));
  assert.equal(
    sha256(canonicalJson(schema)),
    STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256
  );
  assert.equal(schema.$defs.DownloadObservation.properties.size.maximum, 125829120);
  assert.equal(schema.$defs.AttemptMarkerBinding.properties.attemptId.pattern, "^attempt-[a-f0-9]{64}$");
  const validator = compileEvidenceSchemaForId(schema, STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID);
  for (const projectName of ["msedge", "chrome"]) {
    assert.doesNotThrow(() => validator.assert(fixture.receipts[projectName].document));
  }
  const missingSafetyBackupKey = structuredClone(fixture.receipts.msedge.document);
  delete missingSafetyBackupKey.operationObservations[0].safetyBackup;
  assert.throws(() => validator.assert(missingSafetyBackupKey), /Schema validation failed/u);
  const physicalPartitionLeak = structuredClone(fixture.receipts.msedge.document);
  physicalPartitionLeak.operationObservations[4].safetyBackup.logicalPartitionNames[10] =
    "birthFingerprints";
  assert.throws(() => validator.assert(physicalPartitionLeak), /Schema validation failed/u);
  const extraSafetyCount = structuredClone(fixture.receipts.msedge.document);
  extraSafetyCount.operationObservations[4].safetyBackup.counts.birthFingerprints = 1;
  assert.throws(() => validator.assert(extraSafetyCount), /Schema validation failed/u);

  const result = await verifyStorageV13MatrixCandidate(verifierOptions(fixture));
  assert.equal(result.verificationScope, "offline_candidate_envelopes_and_local_artifact_only");
  assert.equal(result.candidateEnvelopeIntegrityVerified, true);
  assert.equal(result.schemaValidated, true);
  assert.equal(result.browserReceiptEnvelopesVerified, true);
  assert.equal(result.attemptMarkerVerified, true);
  assert.equal(result.terminalCommitMarkerVerified, true);
  assert.equal(result.attemptMarkerBinding.attemptId, attemptId);
  const summaryBytes = await readFile(fixture.runSummary.summaryPath);
  const terminalCommitBytes = Buffer.from(`${sha256(summaryBytes)}\n`, "utf8");
  assert.deepEqual(result.terminalGateBinding, {
    path: path.relative(fixture.bindingRoot, fixture.runSummary.terminalCommitPath)
      .split(path.sep).join("/"),
    size: 65,
    sha256: sha256(terminalCommitBytes),
    commitsSummarySha256: sha256(summaryBytes)
  });
  assert.equal(result.candidateCaptureComplete, true);
  assert.equal(result.attachmentsVerifiedPerProject, 16);
  assert.equal(result.totalAttachmentsVerified, 32);
  assert.equal(result.lockedLocalArtifactIdentityVerified, true);
  assert.equal(result.remoteServedArtifactBytesVerified, false);
  assert.equal(result.downloadBodiesRetainedForOfflineVerification, false);
  assert.equal(result.verifierNetworkAttempted, false);
  assert.equal(result.formalReceiptDecisionIdsExcluded, true);
  assert.deepEqual(result.schemaBinding, {
    path: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH,
    schemaId: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID,
    canonicalSha256: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256
  });
  assert.match(result.artifactIdentity.artifactRoot.dev, /^(?:0|[1-9][0-9]*)$/u);
  assert.match(result.artifactIdentity.artifactRoot.ino, /^[1-9][0-9]*$/u);
  assert.match(result.artifactIdentity.artifactRoot.birthtimeNs, /^(?:0|[1-9][0-9]*)$/u);
  assert.match(result.artifactIdentity.identityLock.dev, /^(?:0|[1-9][0-9]*)$/u);
  assert.match(result.artifactIdentity.identityLock.ino, /^[1-9][0-9]*$/u);
  assert.match(result.artifactIdentity.identityLock.birthtimeNs, /^(?:0|[1-9][0-9]*)$/u);
  assert.equal(result.admissionStatus, "not_admitted");
  assert.equal(result.matrixComplete, false);
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.usableForAdmission, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

test("official verifier rejects a missing or wrong attempt marker", async (t) => {
  const missing = await createFixture(t);
  await rm(path.join(missing.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(missing)),
    /OUTPUT_SET_INVALID|ATTEMPT_MARKER/u
  );

  const wrong = await createFixture(t);
  const markerPath = path.join(wrong.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME);
  const marker = JSON.parse(await readFile(markerPath, "utf8"));
  marker.attemptId = `attempt-${"c".repeat(64)}`;
  marker.markerDigest = "0".repeat(64);
  await writeFile(markerPath, jsonBytes(marker));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(wrong)),
    /ATTEMPT_MARKER_INVALID/u
  );
});

test("official verifier rejects every missing, pending, malformed, or legacy terminal state", async (t) => {
  const missing = await createFixture(t);
  await rm(missing.runSummary.terminalCommitPath);
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(missing)),
    /STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SET_INVALID/u
  );

  const pending = await createFixture(t);
  await rename(
    pending.runSummary.terminalCommitPath,
    path.join(pending.outputRoot, STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME)
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(pending)),
    /STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SET_INVALID/u
  );

  const wrongDigest = await createFixture(t);
  await writeFile(
    wrongDigest.runSummary.terminalCommitPath,
    `${"0".repeat(64)}\n`,
    "utf8"
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(wrongDigest)),
    /STORAGE_V13_MATRIX_VERIFIER_TERMINAL_COMMIT_INVALID/u
  );

  const wrongLength = await createFixture(t);
  const wrongLengthSummaryBytes = await readFile(wrongLength.runSummary.summaryPath);
  await writeFile(
    wrongLength.runSummary.terminalCommitPath,
    `${sha256(wrongLengthSummaryBytes)}\r\n`,
    "utf8"
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(wrongLength)),
    /STORAGE_V13_MATRIX_VERIFIER_TERMINAL_COMMIT_INVALID/u
  );

  const uppercaseDigest = await createFixture(t);
  const uppercaseSummaryBytes = await readFile(uppercaseDigest.runSummary.summaryPath);
  await writeFile(
    uppercaseDigest.runSummary.terminalCommitPath,
    `${sha256(uppercaseSummaryBytes).toUpperCase()}\n`,
    "utf8"
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(uppercaseDigest)),
    /STORAGE_V13_MATRIX_VERIFIER_TERMINAL_COMMIT_INVALID/u
  );

  const fixture = await createFixture(t);
  await writeFile(
    path.join(fixture.outputRoot, ".candidate-run-summary-publication.invalid.json"),
    '{"status":"publication-invalid"}\n',
    { flag: "wx" }
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_OUTPUT_SET_INVALID/u
  );
});

test("official verifier rejects a terminal marker with non-single-link physical identity", async (t) => {
  const fixture = await createFixture(t);
  const aliasPath = path.join(fixture.bindingRoot, "terminal-commit-hardlink-alias.sha256");
  try {
    await link(fixture.runSummary.terminalCommitPath, aliasPath);
  } catch (error) {
    if (error && typeof error === "object" && ["EACCES", "ENOSYS", "EPERM"].includes(error.code)) {
      t.skip(`Hard links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_FILE_UNSAFE/u
  );
});

test("verifier rejects same-id candidate schema canonical drift before compilation", async (t) => {
  const fixture = await createFixture(t);
  const schemaPath = path.join(
    fixture.bindingRoot,
    ...STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH.split("/")
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  assert.equal(schema.$id, STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID);
  schema.title = `${schema.title} drift`;
  await writeFile(schemaPath, jsonBytes(schema));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /SCHEMA_BINDING_REBOUND/u
  );

  const failure = buildStorageV13MatrixCandidateVerificationFailure(new Error("schema drift"));
  assert.deepEqual(failure.schemaBinding, {
    path: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH,
    schemaId: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID,
    canonicalSha256: STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256
  });
  assert.equal(failure.formalReceiptDecisionIdsExcluded, false);
});

test("verifier independently rejects create-to-edit and edit-to-delete discontinuities", async (t) => {
  const createToEdit = await createFixture(t);
  await rewriteProjectSnapshotsAndBindings(createToEdit, "msedge", [
    "02-edit-01-before_ui_write.json"
  ], "detached-edit-before-state");
  await rewriteProjectSnapshotsAndBindings(createToEdit, "msedge", [
    "02-edit-02-after_ui_write.json",
    "03-delete-01-before_trash.json"
  ], "detached-edit-after-state");
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(createToEdit)),
    /OPERATION_ADJACENCY_INVALID/u
  );

  const editToDelete = await createFixture(t);
  await rewriteProjectSnapshotsAndBindings(editToDelete, "chrome", [
    "03-delete-01-before_trash.json"
  ], "detached-delete-state");
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(editToDelete)),
    /OPERATION_ADJACENCY_INVALID/u
  );
});

test("verifier independently rejects an old R1 rewrite after attachment receipt and summary rebinding", async (t) => {
  const fixture = await createFixture(t);
  await rewriteProjectSemanticSnapshotAndBindings(
    fixture,
    "msedge",
    "02-edit-02-after_ui_write.json",
    (witness) => {
      witness.revisions[0].recordDigest = sha256("verifier-rewritten-existing-r1-record");
    }
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("verifier independently rejects an unrelated Case-field rewrite after every outer binding is rebound", async (t) => {
  const fixture = await createFixture(t);
  await rewriteProjectSemanticSnapshotAndBindings(
    fixture,
    "msedge",
    "02-edit-02-after_ui_write.json",
    (witness) => {
      witness.cases[0].editStableRecordDigest = sha256("verifier-rewritten-case-title-stable");
      witness.cases[0].recordDigest = sha256("verifier-rewritten-case-title-record");
    },
    (snapshot) => {
      const cases = snapshot.stores.find((store) => store.storeName === "cases");
      assert.ok(cases);
      cases.recordsDigest = sha256("verifier-rewritten-case-title-native-records");
      cases.logicalContentDigest = sha256("verifier-rewritten-case-title-logical-content");
    }
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("verifier independently rejects a candidate-set fingerprint aggregate rewrite after rebinding", async (t) => {
  const fixture = await createFixture(t);
  await rewriteProjectSemanticSnapshotAndBindings(
    fixture,
    "chrome",
    "02-edit-02-after_ui_write.json",
    (witness) => {
      witness.candidateSetFingerprintInventory.logicalContentDigest =
        sha256("verifier-rewritten-candidate-set-fingerprint-inventory");
    },
    (snapshot) => {
      const fingerprints = snapshot.stores.find(
        (store) => store.storeName === "birthFingerprints"
      );
      assert.ok(fingerprints);
      fingerprints.recordsDigest =
        sha256("verifier-rewritten-candidate-set-fingerprint-native-records");
    }
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_EDIT_SEMANTIC_RELATION_INVALID/u
  );
});

test("verifier independently rejects operation-swapped archive filenames", async (t) => {
  const exportFixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(exportFixture, "msedge", (receipt) => {
    receipt.operationObservations[3].download.suggestedFilename =
      "hakimi-before-restore-2026-08-27.zip";
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(exportFixture)),
    /STORAGE_V13_MATRIX_VERIFIER_DOWNLOAD_INVALID/u
  );

  const restoreFixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(restoreFixture, "chrome", (receipt) => {
    receipt.operationObservations[4].download.suggestedFilename =
      "hakimi-full-backup-2026-08-27.zip";
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(restoreFixture)),
    /STORAGE_V13_MATRIX_VERIFIER_DOWNLOAD_INVALID/u
  );
});

test("verifier independently enforces the restore-only safety-backup projection", async (t) => {
  const nonRestoreFixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(nonRestoreFixture, "msedge", (receipt) => {
    receipt.operationObservations[3].safetyBackup = structuredClone(
      receipt.operationObservations[4].safetyBackup
    );
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(nonRestoreFixture)),
    /STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_INVALID/u
  );

  const countFixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(countFixture, "chrome", (receipt) => {
    receipt.operationObservations[4].safetyBackup.counts.cases = 0;
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(countFixture)),
    /STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_CONTENT_MISMATCH/u
  );

  const collisionFixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(collisionFixture, "msedge", (receipt) => {
    receipt.operationObservations[4].safetyBackup.payloadDigest =
      receipt.operationObservations[4].backup.payloadDigest;
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(collisionFixture)),
    /STORAGE_V13_MATRIX_VERIFIER_SAFETY_BACKUP_TARGET_COLLISION/u
  );
});

test("verifier rejects equal export and restore backup counts that disagree with the export snapshot", async (t) => {
  const fixture = await createFixture(t);
  await rewriteProjectReceiptAndSummary(fixture, "chrome", (receipt) => {
    const exported = receipt.operationObservations[3];
    const restore = receipt.operationObservations[4];
    const wrongCount = exported.backup.counts.researchNotes + 1;
    exported.backup.counts.researchNotes = wrongCount;
    restore.backup.counts.researchNotes = wrongCount;
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_EXPORT_BACKUP_CONTENT_MISMATCH/u
  );
});

test("verifier rejects export and restore content digests rebound together to native recordsDigest", async (t) => {
  const fixture = await createFixture(t);
  const exportSnapshotPath = path.join(
    fixture.outputRoot,
    "chrome",
    "04-export-02-after_ui_read.json"
  );
  const exportSnapshot = JSON.parse(await readFile(exportSnapshotPath, "utf8"));
  const nativeRecordsDigest = exportSnapshot.stores.find(
    (store) => store.storeName === "cases"
  ).recordsDigest;
  await rewriteProjectReceiptAndSummary(fixture, "chrome", (receipt) => {
    receipt.operationObservations[3].backup.sharedPartitionContentDigests.cases =
      nativeRecordsDigest;
    receipt.operationObservations[4].backup.sharedPartitionContentDigests.cases =
      nativeRecordsDigest;
  });
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_EXPORT_BACKUP_CONTENT_MISMATCH/u
  );
});

test("verifier rejects a self-consistent logical-content rebind across all downstream bindings", async (t) => {
  const fixture = await createFixture(t);
  const rebound = sha256("verifier-self-consistent-logical-content-rebind");
  await rewriteProjectLogicalContentSnapshotsAndBindings(
    fixture,
    "chrome",
    [
      "04-export-02-after_ui_read.json",
      "05-restore-01-backup_baseline.json",
      "05-restore-05-after_commit.json",
      "06-cancel-01-before_cancel.json",
      "06-cancel-02-after_cancel.json"
    ],
    "cases",
    rebound,
    (receipt) => {
      receipt.operationObservations[3].backup.sharedPartitionContentDigests.cases = rebound;
      receipt.operationObservations[4].backup.sharedPartitionContentDigests.cases = rebound;
    }
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture)),
    /STORAGE_V13_MATRIX_VERIFIER_STORE_DIFF_INVALID/u
  );
});

test("verifier rejects missing and extra project attachments", async (t) => {
  const missing = await createFixture(t);
  await rm(path.join(missing.outputRoot, "msedge", "01-create-01-before_ui_write.json"));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(missing)),
    /PROJECT_OUTPUT_SET_INVALID/u
  );

  const extra = await createFixture(t);
  await writeFile(path.join(extra.outputRoot, "chrome", "unexpected.json"), "{}\n", "utf8");
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(extra)),
    /PROJECT_OUTPUT_SET_INVALID/u
  );
});

test("verifier rejects rebound attachment bytes and a semantically false run summary", async (t) => {
  const rebound = await createFixture(t);
  const attachmentPath = path.join(rebound.outputRoot, "msedge", "01-create-01-before_ui_write.json");
  const attachment = JSON.parse(await readFile(attachmentPath, "utf8"));
  attachment.stores[0].count = 99;
  await writeFile(attachmentPath, jsonBytes(attachment));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(rebound)),
    /ATTACHMENT_BINDING_INVALID|SNAPSHOT_DIGEST_INVALID/u
  );

  const falseSummary = await createFixture(t);
  const summary = JSON.parse(await readFile(falseSummary.runSummary.summaryPath, "utf8"));
  summary.candidateCaptureComplete = false;
  summary.summaryDigest = summaryDigest(summary);
  await writeRunSummaryAndTerminalCommit(falseSummary.runSummary.summaryPath, summary);
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(falseSummary)),
    /RUN_SUMMARY_INVALID/u
  );
});

test("verifier rejects locked artifact mutation and formal receipt decision id rebound", async (t) => {
  const artifactMutation = await createFixture(t);
  await writeFile(
    path.join(artifactMutation.artifactRoot, "sw.js"),
    "self.addEventListener('fetch', () => 'mutated');\n",
    "utf8"
  );
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(artifactMutation)),
    /ARTIFACT|identity lock|artifact bytes/iu
  );

  const decisionIdMutation = await createFixture(t);
  const decisionsPath = path.join(
    decisionIdMutation.bindingRoot,
    "docs",
    "release",
    "web-v1-release-decisions.json"
  );
  const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
  decisions.releaseEvidence.defaultV13RequiredReceiptCommands["storage-v13-matrix"] = [
    "node",
    "scripts/verify-storage-v13-matrix-candidate.mjs"
  ];
  await writeFile(decisionsPath, jsonBytes(decisions));
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(decisionIdMutation)),
    /FORMAL_RECEIPT_DECISION_IDS_REBOUND/u
  );
});

test("overlapping verification epoch rejects a held attachment mutation", async (t) => {
  const fixture = await createFixture(t);
  const attachmentPath = path.join(fixture.outputRoot, "chrome", "06-cancel-02-after_cancel.json");
  await assert.rejects(
    verifyStorageV13MatrixCandidate(verifierOptions(fixture, {
      onVerificationCheckpoint: async (phase) => {
        assert.equal(phase, "after_candidate_validation_before_final_revalidation");
        await writeFile(attachmentPath, "{\"mutated\":true}\n", "utf8");
      }
    })),
    /FILE_REBOUND/u
  );
});

test("CLI reports verified candidate envelopes but always exits nonzero because they are not admitted", async (t) => {
  const fixture = await createFixture(t);
  const parsed = parseStorageV13MatrixCandidateVerifierEnvironment(fixture.environment);
  assert.equal(parsed.outputRoot, fixture.outputRoot);
  const cli = spawnSync(process.execPath, [verifierPath], {
    cwd: fixture.bindingRoot,
    env: { ...process.env, ...fixture.environment },
    encoding: "utf8"
  });
  assert.equal(cli.status, 1);
  assert.equal(cli.stderr, "");
  const result = JSON.parse(cli.stdout);
  assert.equal(result.candidateEnvelopeIntegrityVerified, true);
  assert.equal(result.verificationScope, "offline_candidate_envelopes_and_local_artifact_only");
  assert.equal(result.candidateCaptureComplete, true);
  assert.equal(result.terminalCommitMarkerVerified, true);
  assert.deepEqual(result.terminalGateBinding, {
    path: path.relative(fixture.bindingRoot, fixture.runSummary.terminalCommitPath)
      .split(path.sep).join("/"),
    size: 65,
    sha256: sha256(await readFile(fixture.runSummary.terminalCommitPath)),
    commitsSummarySha256: sha256(await readFile(fixture.runSummary.summaryPath))
  });
  assert.equal(
    result.schemaBinding.canonicalSha256,
    STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256
  );
  assert.equal(result.formalReceiptDecisionIdsExcluded, true);
  assert.equal(result.remoteServedArtifactBytesVerified, false);
  assert.equal(result.downloadBodiesRetainedForOfflineVerification, false);
  assert.equal(result.verifierNetworkAttempted, false);
  assert.equal(result.admissionStatus, "not_admitted");
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.usableForAdmission, false);
  assert.equal(result.publicReleaseAuthorized, false);
});
