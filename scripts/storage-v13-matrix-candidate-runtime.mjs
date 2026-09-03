import { lstat, mkdir, open, readFile, readdir, realpath, rename } from "node:fs/promises";
import path from "node:path";

import {
  assertDeployedPwaCandidateArtifactIdentityStable as assertBaseArtifactIdentityStable,
  loadVerifiedDeployedPwaCandidateArtifact as loadBaseVerifiedArtifact,
  parseDeployedPwaCandidateEnvironment,
  revalidateDeployedPwaCandidateArtifactIdentity as revalidateBaseArtifactIdentity
} from "./deployed-pwa-candidate-runtime.mjs";
import {
  canonicalJson,
  relativePathWithin,
  sha256
} from "./release-evidence-lib.mjs";

export const STORAGE_V13_MATRIX_POLICY_PATH =
  "docs/release/storage-v13-matrix-candidate-policy.v2.json";
export const STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH =
  "docs/release/web-v1-release-decisions.json";

export const STORAGE_V13_MATRIX_ENVIRONMENT_KEYS = Object.freeze({
  origin: "HAKIMI_STORAGE_V13_MATRIX_ORIGIN",
  outputRoot: "HAKIMI_STORAGE_V13_MATRIX_OUTPUT_ROOT",
  bindingRoot: "HAKIMI_STORAGE_V13_MATRIX_BINDING_ROOT",
  artifactRoot: "HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_STORAGE_V13_MATRIX_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_STORAGE_V13_MATRIX_RELEASE_EVIDENCE_ID",
  runId: "HAKIMI_STORAGE_V13_MATRIX_RUN_ID",
  attemptId: "HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID"
});

export const STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME =
  ".storage-v13-matrix-attempt-marker.json";
export const STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME =
  ".candidate-run-summary.pending.json";
export const STORAGE_V13_MATRIX_SUMMARY_FILE_NAME = "candidate-run-summary.json";
export const STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME =
  ".candidate-run-summary-commit.pending";
export const STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME =
  "candidate-run-summary-commit.sha256";
const STORAGE_V13_MATRIX_MAX_SUMMARY_BYTES = 16 * 1024 * 1024;
const STORAGE_V13_MATRIX_TERMINAL_COMMIT_BYTES = 65;

export const STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS = Object.freeze([
  "create",
  "edit",
  "delete",
  "export",
  "restore",
  "cancel"
]);

export const STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_IDS = Object.freeze([
  "two-tab",
  "transaction-failure",
  "read-only-recovery",
  "cross-schema-no-backwrite"
]);

export const STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES = Object.freeze([
  "appSettings",
  "attachments",
  "birthFingerprints",
  "candidateSets",
  "cases",
  "citations",
  "eventTimeMigrationReceipts",
  "events",
  "knowledgeDocuments",
  "researchNotes",
  "researcherProfiles",
  "revisions",
  "ruleRegistry",
  "savedViews",
  "sourceRights",
  "tzdbMigrationReceipts"
]);

export const STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES = Object.freeze([
  "appSettings",
  "attachments",
  "candidateSets",
  "cases",
  "citations",
  "eventTimeMigrationReceipts",
  "events",
  "knowledgeDocuments",
  "researchNotes",
  "researcherProfiles",
  "revisionCalculationReceipts",
  "revisions",
  "ruleRegistry",
  "savedViews",
  "sourceRights",
  "tzdbMigrationReceipts"
]);

export const STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES = Object.freeze(
  STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES.filter(
    (partitionName) => partitionName !== "revisionCalculationReceipts"
  )
);

export const STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES = 4096;

export const STORAGE_V13_MATRIX_CAPABILITIES = Object.freeze({
  calculationReceiptCapability: "absent_schema13",
  mutationEpochCapability: "absent_schema13",
  epoch: null
});

export const STORAGE_V13_MATRIX_AUTHORITY = Object.freeze({
  defaultV13ReceiptAllowlistMember: false,
  formalStorageBoundaryVerified: false,
  oldV13ArtifactVerified: false,
  crossTabCoordinationVerified: false,
  transactionRollbackVerified: false,
  readOnlyRecoveryVerified: false,
  crossSchemaNoBackwriteVerified: false,
  deploymentRollbackVerified: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false,
  schemaPromotionAuthorized: false
});

export const STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES = 120 * 1024 * 1024;

const STORAGE_V13_MATRIX_OBSERVED_OPERATION_POLICY = Object.freeze([
  Object.freeze({
    operationId: "create",
    uiPath: "new-demo-save",
    capturePhases: Object.freeze(["before_ui_write", "after_ui_write"]),
    exactChangedStores: Object.freeze(["birthFingerprints", "cases", "revisions"]),
    countDeltas: Object.freeze({ birthFingerprints: 1, cases: 1, revisions: 1 }),
    relationship: "one_case_revision_and_revision_fingerprint_created_with_exact_latest_binding"
  }),
  Object.freeze({
    operationId: "edit",
    uiPath: "derive-revision-save",
    capturePhases: Object.freeze(["before_ui_write", "after_ui_write"]),
    exactChangedStores: Object.freeze(["birthFingerprints", "cases", "revisions"]),
    countDeltas: Object.freeze({ birthFingerprints: 1, cases: 0, revisions: 1 }),
    relationship: "one_revision_appended_old_revisions_immutable_and_case_latest_advanced"
  }),
  Object.freeze({
    operationId: "delete",
    uiPath: "cases-trash-permanent-delete",
    capturePhases: Object.freeze([
      "before_trash",
      "after_trash_before_permanent_delete",
      "after_permanent_delete"
    ]),
    exactChangedStores: Object.freeze(["birthFingerprints", "cases", "revisions"]),
    countDeltas: Object.freeze({ birthFingerprints: -2, cases: -1, revisions: -2 }),
    relationship: "active_case_first_becomes_trashed_then_exact_case_revision_graph_is_removed"
  }),
  Object.freeze({
    operationId: "export",
    uiPath: "settings-data-full-zip",
    capturePhases: Object.freeze(["before_ui_read", "after_ui_read"]),
    exactChangedStores: Object.freeze([]),
    countDeltas: Object.freeze({}),
    relationship: "logical_backup_shared_counts_and_content_digests_equal_after_ui_read_snapshot"
  }),
  Object.freeze({
    operationId: "restore",
    uiPath: "settings-data-preflight-safety-gate-restore",
    capturePhases: Object.freeze([
      "backup_baseline",
      "before_preflight",
      "after_preflight",
      "before_commit",
      "after_commit"
    ]),
    relationship: "preflight_unchanged_commit_equals_backup_baseline_and_safety_backup_content_bound"
  }),
  Object.freeze({
    operationId: "cancel",
    uiPath: "settings-data-restore-preflight-cancel",
    capturePhases: Object.freeze(["before_cancel", "after_cancel"]),
    exactChangedStores: Object.freeze([]),
    countDeltas: Object.freeze({}),
    downloadEventCount: 0
  })
]);

const STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_POLICY = Object.freeze([
  Object.freeze({
    boundaryId: "two-tab",
    status: "deferred_not_executed",
    satisfied: false,
    evidence: null,
    reasonCode: "DEDICATED_MULTI_TAB_WRITE_COORDINATION_MATRIX_REQUIRED"
  }),
  Object.freeze({
    boundaryId: "transaction-failure",
    status: "deferred_not_executed",
    satisfied: false,
    evidence: null,
    reasonCode: "STORAGE_TRANSACTION_ABORT_RUNTIME_MATRIX_REQUIRED"
  }),
  Object.freeze({
    boundaryId: "read-only-recovery",
    status: "deferred_not_executed",
    satisfied: false,
    evidence: null,
    reasonCode: "REAL_OLD_V13_ARTIFACT_RECOVERY_REQUIRED"
  }),
  Object.freeze({
    boundaryId: "cross-schema-no-backwrite",
    status: "deferred_not_executed",
    satisfied: false,
    evidence: null,
    reasonCode: "V13_TO_V16_SHADOW_AND_NO_REVERSE_MIGRATION_RUNTIME_MATRIX_REQUIRED"
  })
]);

const FORMAL_RECEIPT_IDS = Object.freeze([
  "backup",
  "artifact-stability",
  "boot",
  "build",
  "built-contract",
  "cross-schema-v13-v16",
  "evidence-tooling",
  "governance",
  "orphaned-v13-recovery",
  "pwa",
  "typecheck",
  "unit",
  "web-v1-flow"
]);
const PROJECT_NAMES = Object.freeze(["msedge", "chrome"]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CANONICAL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const ATTEMPT_MARKER_MAX_BYTES = 64 * 1024;
const DOWNLOAD_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/u;
const DOWNLOAD_FILENAME_PATTERNS_BY_OPERATION = Object.freeze({
  export: /^hakimi-full-backup-\d{4}-\d{2}-\d{2}\.zip$/u,
  restore: /^hakimi-before-restore-\d{4}-\d{2}-\d{2}\.zip$/u
});
const SNAPSHOT_KEYS = Object.freeze([
  "schemaVersion",
  "recordType",
  "captureId",
  "operationId",
  "phase",
  "capturedAt",
  "databaseName",
  "physicalVersion",
  "dexieVersion",
  "transactionMode",
  "storeNames",
  "stores",
  "semanticWitness",
  "snapshotDigest"
]);
const SNAPSHOT_STORE_KEYS = Object.freeze([
  "storeName",
  "count",
  "recordsDigest",
  "logicalContentDigest"
]);
const SEMANTIC_WITNESS_KEYS = Object.freeze([
  "witnessType",
  "maximumEntriesPerCollection",
  "cases",
  "revisions",
  "revisionFingerprints",
  "candidateSetFingerprintInventory",
  "witnessDigest"
]);
const SEMANTIC_CASE_KEYS = Object.freeze([
  "caseIdDigest",
  "latestRevisionIdDigest",
  "revisionCount",
  "lifecycleState",
  "lifecycleIndependentRecordDigest",
  "editStableRecordDigest",
  "recordDigest"
]);
const SEMANTIC_REVISION_KEYS = Object.freeze([
  "revisionIdDigest",
  "caseIdDigest",
  "revisionNumber",
  "recordDigest"
]);
const SEMANTIC_FINGERPRINT_KEYS = Object.freeze([
  "sourceIdDigest",
  "subjectIdDigest",
  "recordDigest"
]);
const SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_KEYS = Object.freeze([
  "count",
  "logicalContentDigest"
]);
const OPERATION_KEYS = Object.freeze([
  "operationId",
  "status",
  "uiPath",
  "observationMethod",
  "captures",
  "download",
  "backup",
  "safetyBackup"
]);
const DOWNLOAD_KEYS = Object.freeze([
  "observed",
  "eventCount",
  "size",
  "sha256",
  "suggestedFilename"
]);
const DEFERRED_KEYS = Object.freeze([
  "boundaryId",
  "status",
  "satisfied",
  "evidence",
  "reasonCode"
]);

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isErrno(error, code) {
  return isRecord(error) && error.code === code;
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function compareCanonicalText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function requireCondition(condition, code, message) {
  if (!condition) fail(code, message);
}

function sameExactFilesystemIdentity(left, right) {
  return isRecord(left)
    && isRecord(right)
    && left.realPath === right.realPath
    && left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function captureExactFilesystemIdentity(target, expectedKind, label) {
  const [metadata, resolved] = await Promise.all([
    lstat(target, { bigint: true }),
    realpath(target)
  ]);
  requireCondition(
    (expectedKind === "directory" ? metadata.isDirectory() : metadata.isFile())
      && !metadata.isSymbolicLink()
      && metadata.ino !== 0n
      && comparablePath(resolved) === comparablePath(target),
    "STORAGE_V13_MATRIX_EXACT_FILESYSTEM_IDENTITY_INVALID",
    `${label} must be one exact non-link filesystem object.`
  );
  return Object.freeze({
    realPath: path.resolve(resolved),
    dev: metadata.dev.toString(10),
    ino: metadata.ino.toString(10),
    birthtimeNs: metadata.birthtimeNs.toString(10)
  });
}

async function captureExactArtifactFilesystemIdentity(candidate) {
  return Object.freeze({
    artifactRoot: await captureExactFilesystemIdentity(
      candidate.artifactRoot,
      "directory",
      "Candidate artifact root"
    ),
    identityLock: await captureExactFilesystemIdentity(
      candidate.artifactLock,
      "file",
      "Candidate artifact identity lock"
    )
  });
}

function assertExactArtifactIdentityStable(initial, final) {
  const stable = assertBaseArtifactIdentityStable(initial, final);
  requireCondition(
    exactJson(
      initial?.storageV13ExactFilesystemIdentity,
      final?.storageV13ExactFilesystemIdentity
    ),
    "STORAGE_V13_MATRIX_ARTIFACT_EXACT_IDENTITY_REBOUND",
    "Artifact root or identity lock exact filesystem identity changed during candidate collection."
  );
  return stable;
}

export async function loadVerifiedDeployedPwaCandidateArtifact(candidate) {
  const artifact = await loadBaseVerifiedArtifact(candidate);
  return Object.freeze({
    ...artifact,
    storageV13ExactFilesystemIdentity: await captureExactArtifactFilesystemIdentity(candidate)
  });
}

export async function revalidateDeployedPwaCandidateArtifactIdentity(candidate, initial) {
  const artifact = await revalidateBaseArtifactIdentity(candidate, initial);
  const exactArtifact = Object.freeze({
    ...artifact,
    storageV13ExactFilesystemIdentity: await captureExactArtifactFilesystemIdentity(candidate)
  });
  assertExactArtifactIdentityStable(initial, exactArtifact);
  return exactArtifact;
}

export async function prepareCandidateProjectOutput(input) {
  const { candidateEnvironment, bindingRoot, outputRoot, artifactRoot, projectName } = input ?? {};
  const candidate = parseWriterCandidateEnvironment(candidateEnvironment);
  requireCondition(
    PROJECT_NAMES.includes(projectName)
      && typeof bindingRoot === "string"
      && path.isAbsolute(bindingRoot)
      && typeof outputRoot === "string"
      && path.isAbsolute(outputRoot)
      && typeof artifactRoot === "string"
      && path.isAbsolute(artifactRoot)
      && comparablePath(bindingRoot) === comparablePath(candidate.bindingRoot)
      && comparablePath(outputRoot) === comparablePath(candidate.outputRoot)
      && comparablePath(artifactRoot) === comparablePath(candidate.artifactRoot),
    "STORAGE_V13_MATRIX_OUTPUT_INPUT_INVALID",
    "Storage-v13 candidate output preparation requires exact absolute roots and a fixed browser project."
  );
  relativeBindingPath(bindingRoot, outputRoot, "Candidate output root");
  relativeBindingPath(bindingRoot, artifactRoot, "Candidate artifact root");
  const [bindingIdentity, outputIdentity, artifactIdentity] = await Promise.all([
    captureExactFilesystemIdentity(bindingRoot, "directory", "Candidate binding root"),
    captureExactFilesystemIdentity(outputRoot, "directory", "Candidate output root"),
    captureExactFilesystemIdentity(artifactRoot, "directory", "Candidate artifact root")
  ]);
  const outputToArtifact = path.relative(outputIdentity.realPath, artifactIdentity.realPath);
  const artifactToOutput = path.relative(artifactIdentity.realPath, outputIdentity.realPath);
  requireCondition(
    outputToArtifact !== ""
      && artifactToOutput !== ""
      && (path.isAbsolute(outputToArtifact) || outputToArtifact === ".." || outputToArtifact.startsWith(`..${path.sep}`))
      && (path.isAbsolute(artifactToOutput) || artifactToOutput === ".." || artifactToOutput.startsWith(`..${path.sep}`)),
    "STORAGE_V13_MATRIX_OUTPUT_ARTIFACT_OVERLAP",
    "Candidate output root and locked artifact root must remain disjoint."
  );
  const outputEntries = await readdir(outputRoot, { withFileTypes: true });
  const expectedOutputNames = [
    ...PROJECT_NAMES,
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME
  ].sort();
  requireCondition(
    exactJson(outputEntries.map((entry) => entry.name).sort(), expectedOutputNames)
      && outputEntries.every((entry) => entry.name === STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME
        ? entry.isFile() && !entry.isSymbolicLink()
        : entry.isDirectory() && !entry.isSymbolicLink()),
    "STORAGE_V13_MATRIX_OUTPUT_NOT_ISOLATED",
    "Candidate output root must contain only the exact browser directories and one attempt marker."
  );
  const attemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
  const projectRoot = path.join(outputRoot, projectName);
  const projectIdentity = await captureExactFilesystemIdentity(
    projectRoot,
    "directory",
    `${projectName} candidate project root`
  );
  requireCondition(
    (await readdir(projectRoot)).length === 0,
    "STORAGE_V13_MATRIX_PROJECT_NOT_EMPTY",
    `${projectName} candidate project directory must remain empty before its writer starts.`
  );
  const prepared = Object.freeze({
    bindingRoot,
    bindingReal: bindingIdentity.realPath,
    outputRoot,
    outputReal: outputIdentity.realPath,
    projectName,
    projectRoot,
    projectReal: projectIdentity.realPath,
    attemptMarker
  });
  return Object.freeze({
    ...prepared,
    exactDirectoryIdentities: Object.freeze({
      bindingRoot: await captureExactFilesystemIdentity(
        prepared.bindingRoot,
        "directory",
        "Candidate binding root"
      ),
      outputRoot: await captureExactFilesystemIdentity(
        prepared.outputRoot,
        "directory",
        "Candidate output root"
      ),
      projectRoot: await captureExactFilesystemIdentity(
        prepared.projectRoot,
        "directory",
        "Candidate project root"
      )
    })
  });
}

export async function prepareFreshStorageV13MatrixCandidateRun(
  candidateEnvironment,
  { cwd = process.cwd() } = {}
) {
  const candidate = parseWriterCandidateEnvironment(candidateEnvironment);
  requireCondition(
    typeof cwd === "string"
      && path.isAbsolute(cwd)
      && comparablePath(cwd) === comparablePath(candidate.bindingRoot),
    "STORAGE_V13_MATRIX_FRESH_RUN_CWD_INVALID",
    "Fresh candidate run preparation must execute from the exact binding root."
  );
  const bindingBefore = await captureExactFilesystemIdentity(
    candidate.bindingRoot,
    "directory",
    "Candidate binding root before fresh run creation"
  );
  const parentSegments = ["tmp", "storage-v13-matrix-candidate"];
  let verifiedParentPath = candidate.bindingRoot;
  let verifiedParentIdentity = bindingBefore;
  for (const segment of parentSegments) {
    const nextPath = path.join(verifiedParentPath, segment);
    requireCondition(
      comparablePath(path.dirname(nextPath)) === comparablePath(verifiedParentPath),
      "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_PATH_INVALID",
      "Fresh candidate parent segments must remain direct descendants of the verified binding root."
    );
    const parentBeforeStep = await captureExactFilesystemIdentity(
      verifiedParentPath,
      "directory",
      `Candidate parent before ${segment}`
    );
    requireCondition(
      sameExactFilesystemIdentity(parentBeforeStep, verifiedParentIdentity),
      "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_REBOUND",
      "Fresh candidate ancestor changed before the next non-recursive directory step."
    );
    let nextIdentity;
    try {
      nextIdentity = await captureExactFilesystemIdentity(
        nextPath,
        "directory",
        `Existing candidate ancestor ${segment}`
      );
    } catch (error) {
      if (!isErrno(error, "ENOENT")) throw error;
      const parentImmediatelyBeforeCreate = await captureExactFilesystemIdentity(
        verifiedParentPath,
        "directory",
        `Candidate parent immediately before creating ${segment}`
      );
      requireCondition(
        sameExactFilesystemIdentity(parentImmediatelyBeforeCreate, verifiedParentIdentity),
        "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_REBOUND",
        "Fresh candidate ancestor changed before non-recursive directory creation."
      );
      await mkdir(nextPath, { recursive: false });
      nextIdentity = await captureExactFilesystemIdentity(
        nextPath,
        "directory",
        `New candidate ancestor ${segment}`
      );
    }
    const [bindingAfterStep, parentAfterStep, nextAfterStep] = await Promise.all([
      captureExactFilesystemIdentity(
        candidate.bindingRoot,
        "directory",
        `Candidate binding root after ${segment}`
      ),
      captureExactFilesystemIdentity(
        verifiedParentPath,
        "directory",
        `Candidate parent after ${segment}`
      ),
      captureExactFilesystemIdentity(
        nextPath,
        "directory",
        `Candidate ancestor after ${segment}`
      )
    ]);
    requireCondition(
      sameExactFilesystemIdentity(bindingAfterStep, bindingBefore)
        && sameExactFilesystemIdentity(parentAfterStep, verifiedParentIdentity)
        && sameExactFilesystemIdentity(nextAfterStep, nextIdentity)
        && comparablePath(nextIdentity.realPath) === comparablePath(nextPath),
      "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_REBOUND",
      "Fresh candidate ancestor or binding root changed during non-recursive directory preparation."
    );
    verifiedParentPath = nextPath;
    verifiedParentIdentity = nextIdentity;
  }
  const runParent = verifiedParentPath;
  const [bindingAfterParent, parentIdentity] = await Promise.all([
    captureExactFilesystemIdentity(
      candidate.bindingRoot,
      "directory",
      "Candidate binding root after fresh run parent creation"
    ),
    captureExactFilesystemIdentity(
      runParent,
      "directory",
      "Candidate fresh run parent"
    )
  ]);
  requireCondition(
    sameExactFilesystemIdentity(bindingBefore, bindingAfterParent)
      && sameExactFilesystemIdentity(verifiedParentIdentity, parentIdentity)
      && comparablePath(parentIdentity.realPath) === comparablePath(runParent),
    "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_REBOUND",
    "Fresh candidate run parent or binding root changed before atomic run creation."
  );
  try {
    const parentImmediatelyBeforeRun = await captureExactFilesystemIdentity(
      runParent,
      "directory",
      "Candidate fresh run parent immediately before run creation"
    );
    requireCondition(
      sameExactFilesystemIdentity(parentImmediatelyBeforeRun, parentIdentity),
      "STORAGE_V13_MATRIX_FRESH_RUN_PARENT_REBOUND",
      "Candidate fresh run parent changed before atomic run creation."
    );
    await mkdir(candidate.outputRoot, { recursive: false });
  } catch (error) {
    if (isErrno(error, "EEXIST")) {
      fail(
        "STORAGE_V13_MATRIX_RUN_ROOT_NOT_FRESH",
        "Candidate run id is single-use; its output root already exists, so no new attempt was started."
      );
    }
    throw error;
  }
  const outputIdentity = await captureExactFilesystemIdentity(
    candidate.outputRoot,
    "directory",
    "Fresh candidate run output root"
  );
  const projectRoots = {};
  for (const projectName of PROJECT_NAMES) {
    const projectRoot = path.join(candidate.outputRoot, projectName);
    const [bindingBeforeProject, parentBeforeProject, outputBeforeProject] = await Promise.all([
      captureExactFilesystemIdentity(
        candidate.bindingRoot,
        "directory",
        `Candidate binding root before ${projectName} creation`
      ),
      captureExactFilesystemIdentity(
        runParent,
        "directory",
        `Candidate fresh run parent before ${projectName} creation`
      ),
      captureExactFilesystemIdentity(
        candidate.outputRoot,
        "directory",
        `Candidate output root before ${projectName} creation`
      )
    ]);
    requireCondition(
      sameExactFilesystemIdentity(bindingBefore, bindingBeforeProject)
        && sameExactFilesystemIdentity(parentIdentity, parentBeforeProject)
        && sameExactFilesystemIdentity(outputIdentity, outputBeforeProject),
      "STORAGE_V13_MATRIX_FRESH_RUN_CREATION_REBOUND",
      `Candidate run directories changed before ${projectName} non-recursive creation.`
    );
    await mkdir(projectRoot, { recursive: false });
    projectRoots[projectName] = await captureExactFilesystemIdentity(
      projectRoot,
      "directory",
      `${projectName} fresh candidate project root`
    );
    const [
      bindingAfterProject,
      parentAfterProject,
      outputAfterProject,
      projectAfterProject
    ] = await Promise.all([
      captureExactFilesystemIdentity(
        candidate.bindingRoot,
        "directory",
        `Candidate binding root after ${projectName} creation`
      ),
      captureExactFilesystemIdentity(
        runParent,
        "directory",
        `Candidate fresh run parent after ${projectName} creation`
      ),
      captureExactFilesystemIdentity(
        candidate.outputRoot,
        "directory",
        `Candidate output root after ${projectName} creation`
      ),
      captureExactFilesystemIdentity(
        projectRoot,
        "directory",
        `${projectName} project root after creation`
      )
    ]);
    requireCondition(
      sameExactFilesystemIdentity(bindingBefore, bindingAfterProject)
        && sameExactFilesystemIdentity(parentIdentity, parentAfterProject)
        && sameExactFilesystemIdentity(outputIdentity, outputAfterProject)
        && sameExactFilesystemIdentity(projectRoots[projectName], projectAfterProject),
      "STORAGE_V13_MATRIX_FRESH_RUN_CREATION_REBOUND",
      `Candidate run directories changed during ${projectName} non-recursive creation.`
    );
  }
  const entries = await readdir(candidate.outputRoot, { withFileTypes: true });
  requireCondition(
    exactJson(entries.map((entry) => entry.name).sort(), [...PROJECT_NAMES].sort())
      && entries.every((entry) => entry.isDirectory() && !entry.isSymbolicLink()),
    "STORAGE_V13_MATRIX_FRESH_RUN_ENTRIES_INVALID",
    "Fresh candidate run root must contain only the exact empty Edge and Chrome directories."
  );
  const [bindingFinal, parentFinal, outputFinal, msedgeFinal, chromeFinal] = await Promise.all([
    captureExactFilesystemIdentity(candidate.bindingRoot, "directory", "Candidate binding root after fresh run creation"),
    captureExactFilesystemIdentity(runParent, "directory", "Candidate fresh run parent after creation"),
    captureExactFilesystemIdentity(candidate.outputRoot, "directory", "Candidate fresh run output root after creation"),
    captureExactFilesystemIdentity(
      path.join(candidate.outputRoot, "msedge"),
      "directory",
      "Candidate msedge project root after fresh run creation"
    ),
    captureExactFilesystemIdentity(
      path.join(candidate.outputRoot, "chrome"),
      "directory",
      "Candidate chrome project root after fresh run creation"
    )
  ]);
  requireCondition(
    sameExactFilesystemIdentity(bindingBefore, bindingFinal)
      && sameExactFilesystemIdentity(parentIdentity, parentFinal)
      && sameExactFilesystemIdentity(outputIdentity, outputFinal)
      && sameExactFilesystemIdentity(projectRoots.msedge, msedgeFinal)
      && sameExactFilesystemIdentity(projectRoots.chrome, chromeFinal),
    "STORAGE_V13_MATRIX_FRESH_RUN_CREATION_REBOUND",
    "Candidate run directories changed while the fresh single-use root was created."
  );
  return Object.freeze({
    runId: candidate.runId,
    outputRoot: candidate.outputRoot,
    outputIdentity,
    projectRoots: Object.freeze(projectRoots)
  });
}

function attemptMarkerDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.markerDigest;
  return sha256(canonicalJson(unsigned));
}

function validateAttemptMarkerDocument(candidate, document) {
  const expectedOutputRoot = relativeBindingPath(
    candidate.bindingRoot,
    candidate.outputRoot,
    "Candidate attempt marker output root"
  );
  requireCondition(
    exactKeys(document, [
      "schemaVersion",
      "markerType",
      "trustClass",
      "status",
      "executionAdmission",
      "runId",
      "attemptId",
      "outputRoot",
      "authority",
      "createdAt",
      "markerDigest"
    ])
      && document.schemaVersion === 1
      && document.markerType === "storage_v13_matrix_candidate_attempt_marker_v1"
      && document.trustClass === "untrusted_candidate"
      && document.status === "not_admitted"
      && document.executionAdmission === "closed_deferred_boundaries"
      && document.runId === candidate.runId
      && document.attemptId === candidate.attemptId
      && ATTEMPT_ID_PATTERN.test(document.attemptId)
      && document.outputRoot === expectedOutputRoot
      && exactJson(document.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && Number.isFinite(Date.parse(document.createdAt))
      && new Date(Date.parse(document.createdAt)).toISOString() === document.createdAt
      && SHA256_PATTERN.test(document.markerDigest)
      && document.markerDigest === attemptMarkerDigest(document),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_INVALID",
    "Candidate attempt marker must bind the exact fresh run, high-entropy attempt id, closed authority, and digest."
  );
  return document;
}

function sameStableFileMetadata(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function readAttemptMarker(candidate) {
  const markerPath = path.join(candidate.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME);
  const markerRelativePath = relativeBindingPath(
    candidate.bindingRoot,
    markerPath,
    "Candidate attempt marker"
  );
  const handle = await open(markerPath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(markerPath, { bigint: true }),
      realpath(markerPath)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.ino !== 0n
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && handleBefore.size > 0n
        && handleBefore.size <= BigInt(ATTEMPT_MARKER_MAX_BYTES)
        && sameStableFileMetadata(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(markerPath),
      "STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_INVALID",
      "Candidate attempt marker must be one bounded single-link regular file."
    );
    const bytes = await readOpenedFileAtZero(handle, Number(handleBefore.size));
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(markerPath, { bigint: true }),
      realpath(markerPath)
    ]);
    requireCondition(
      bytes.byteLength === Number(handleBefore.size)
        && sameStableFileMetadata(handleBefore, handleAfter)
        && sameStableFileMetadata(handleAfter, pathAfter)
        && handleAfter.size === pathAfter.size
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter),
      "STORAGE_V13_MATRIX_ATTEMPT_MARKER_REBOUND",
      "Candidate attempt marker changed while its exact bytes were read."
    );
    let document;
    try {
      document = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      fail(
        "STORAGE_V13_MATRIX_ATTEMPT_MARKER_JSON_INVALID",
        `Candidate attempt marker is not JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    validateAttemptMarkerDocument(candidate, document);
    return Object.freeze({
      document: immutableJsonSnapshot(document),
      binding: Object.freeze({
        attemptId: candidate.attemptId,
        path: markerRelativePath,
        size: bytes.byteLength,
        sha256: sha256(bytes),
        markerDigest: document.markerDigest
      }),
      exactFilesystemIdentity: Object.freeze({
        realPath: path.resolve(resolvedAfter),
        dev: handleAfter.dev.toString(10),
        ino: handleAfter.ino.toString(10),
        birthtimeNs: handleAfter.birthtimeNs.toString(10),
        mtimeNs: handleAfter.mtimeNs.toString(10),
        ctimeNs: handleAfter.ctimeNs.toString(10)
      })
    });
  } finally {
    await handle.close();
  }
}

export async function createStorageV13MatrixCandidateAttemptMarker(
  candidateEnvironment,
  { cwd = process.cwd(), createdAt = new Date().toISOString() } = {}
) {
  const candidate = parseWriterCandidateEnvironment(candidateEnvironment);
  requireCondition(
    typeof cwd === "string"
      && path.isAbsolute(cwd)
      && comparablePath(cwd) === comparablePath(candidate.bindingRoot),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_CWD_INVALID",
    "Candidate attempt marker creation must execute from the exact binding root."
  );
  requireCanonicalTimestamp(createdAt, "attempt marker createdAt");
  const outputIdentity = await captureExactFilesystemIdentity(
    candidate.outputRoot,
    "directory",
    "Fresh candidate output root before attempt marker creation"
  );
  const entriesBefore = await readdir(candidate.outputRoot, { withFileTypes: true });
  requireCondition(
    exactJson(entriesBefore.map((entry) => entry.name).sort(), [...PROJECT_NAMES].sort())
      && entriesBefore.every((entry) => entry.isDirectory() && !entry.isSymbolicLink()),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_ROOT_NOT_FRESH",
    "Attempt marker may only be created once in the exact fresh two-project run root."
  );
  for (const projectName of PROJECT_NAMES) {
    requireCondition(
      (await readdir(path.join(candidate.outputRoot, projectName))).length === 0,
      "STORAGE_V13_MATRIX_ATTEMPT_MARKER_PROJECT_NOT_EMPTY",
      "Attempt marker must precede every browser project output write."
    );
  }
  const document = {
    schemaVersion: 1,
    markerType: "storage_v13_matrix_candidate_attempt_marker_v1",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    runId: candidate.runId,
    attemptId: candidate.attemptId,
    outputRoot: relativeBindingPath(
      candidate.bindingRoot,
      candidate.outputRoot,
      "Candidate attempt marker output root"
    ),
    authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
    createdAt,
    markerDigest: "0".repeat(64)
  };
  document.markerDigest = attemptMarkerDigest(document);
  const bytes = jsonBytes(document);
  const markerPath = path.join(candidate.outputRoot, STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME);
  const handle = await open(markerPath, "wx+");
  let createdIdentity;
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(markerPath, { bigint: true }),
      realpath(markerPath)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.ino !== 0n
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && handleBefore.size === 0n
        && sameStableFileMetadata(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(markerPath),
      "STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_INVALID",
      "New attempt marker is not bound to the exclusive single-link regular file."
    );
    await handle.writeFile(bytes);
    await handle.sync();
    const persisted = await readOpenedFileAtZero(handle, bytes.byteLength);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(markerPath, { bigint: true }),
      realpath(markerPath)
    ]);
    requireCondition(
      persisted.byteLength === bytes.byteLength
        && persisted.equals(bytes)
        && sameBigIntFileIdentity(handleBefore, handleAfter)
        && sameBigIntFileIdentity(handleAfter, pathAfter)
        && handleAfter.size === BigInt(bytes.byteLength)
        && pathAfter.size === handleAfter.size
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter),
      "STORAGE_V13_MATRIX_ATTEMPT_MARKER_WRITE_INVALID",
      "Attempt marker bytes did not persist exactly."
    );
    createdIdentity = Object.freeze({
      realPath: path.resolve(resolvedAfter),
      dev: handleAfter.dev.toString(10),
      ino: handleAfter.ino.toString(10),
      birthtimeNs: handleAfter.birthtimeNs.toString(10),
      mtimeNs: handleAfter.mtimeNs.toString(10),
      ctimeNs: handleAfter.ctimeNs.toString(10)
    });
  } finally {
    await handle.close();
  }
  const outputAfter = await captureExactFilesystemIdentity(
    candidate.outputRoot,
    "directory",
    "Fresh candidate output root after attempt marker creation"
  );
  requireCondition(
    sameExactFilesystemIdentity(outputIdentity, outputAfter),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_ROOT_REBOUND",
    "Candidate output root changed while its one-time attempt marker was created."
  );
  const reopened = await readAttemptMarker(candidate);
  requireCondition(
    exactJson(createdIdentity, reopened.exactFilesystemIdentity),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_REBOUND",
    "Attempt marker changed between exclusive creation and first validated reopen."
  );
  return reopened;
}

export async function loadStorageV13MatrixCandidateAttemptMarker(candidateEnvironment) {
  return readAttemptMarker(parseWriterCandidateEnvironment(candidateEnvironment));
}

export function assertStorageV13MatrixCandidateAttemptMarkerStable(initial, final) {
  requireCondition(
    exactJson(initial?.binding, final?.binding)
      && exactJson(initial?.exactFilesystemIdentity, final?.exactFilesystemIdentity),
    "STORAGE_V13_MATRIX_ATTEMPT_MARKER_REBOUND",
    "Candidate attempt marker identity or bytes changed during collection."
  );
  return final;
}

function canonicalIdentityPart(value, label) {
  const canonical = typeof value === "bigint" ? value.toString(10) : value;
  requireCondition(
    typeof canonical === "string"
      && /^(?:0|[1-9][0-9]*)$/u.test(canonical),
    "STORAGE_V13_MATRIX_SUMMARY_DIRECTORY_LOCK_INVALID",
    `${label} must be one exact decimal filesystem identity component.`
  );
  return canonical;
}

function sameExternalExactFilesystemIdentity(current, expected, label) {
  requireCondition(
    isRecord(expected)
      && typeof expected.realPath === "string"
      && path.isAbsolute(expected.realPath),
    "STORAGE_V13_MATRIX_SUMMARY_DIRECTORY_LOCK_INVALID",
    `${label} must carry one absolute real path and exact filesystem identity.`
  );
  return comparablePath(current.realPath) === comparablePath(expected.realPath)
    && current.dev === canonicalIdentityPart(expected.dev, `${label} dev`)
    && current.ino === canonicalIdentityPart(expected.ino, `${label} ino`)
    && current.birthtimeNs === canonicalIdentityPart(
      expected.birthtimeNs,
      `${label} birthtimeNs`
    );
}

async function assertStorageV13MatrixCandidatePublicationLocksStable(candidate, locks) {
  requireCondition(
    isRecord(locks)
      && isRecord(locks.bindingRoot)
      && isRecord(locks.outputRoot)
      && isRecord(locks.projectRoots)
      && isRecord(locks.projectEntryNames)
      && exactKeys(locks.projectRoots, PROJECT_NAMES)
      && exactKeys(locks.projectEntryNames, PROJECT_NAMES),
    "STORAGE_V13_MATRIX_SUMMARY_DIRECTORY_LOCK_INVALID",
    "Candidate summary publication requires exact binding, output, and browser-project locks."
  );
  const current = Object.freeze({
    bindingRoot: await captureExactFilesystemIdentity(
      candidate.bindingRoot,
      "directory",
      "Candidate summary binding root"
    ),
    outputRoot: await captureExactFilesystemIdentity(
      candidate.outputRoot,
      "directory",
      "Candidate summary output root"
    ),
    projectRoots: Object.freeze({
      msedge: await captureExactFilesystemIdentity(
        path.join(candidate.outputRoot, "msedge"),
        "directory",
        "Candidate summary msedge project root"
      ),
      chrome: await captureExactFilesystemIdentity(
        path.join(candidate.outputRoot, "chrome"),
        "directory",
        "Candidate summary chrome project root"
      )
    })
  });
  requireCondition(
    sameExternalExactFilesystemIdentity(
      current.bindingRoot,
      locks.bindingRoot,
      "Candidate summary binding root"
    )
      && sameExternalExactFilesystemIdentity(
        current.outputRoot,
        locks.outputRoot,
        "Candidate summary output root"
      )
      && PROJECT_NAMES.every((projectName) =>
        sameExternalExactFilesystemIdentity(
          current.projectRoots[projectName],
          locks.projectRoots[projectName],
          `Candidate summary ${projectName} project root`
        )
      ),
    "STORAGE_V13_MATRIX_SUMMARY_DIRECTORY_REBOUND",
    "Candidate summary binding, output, or project directory changed during terminal publication."
  );
  for (const projectName of PROJECT_NAMES) {
    const expectedNames = locks.projectEntryNames[projectName];
    requireCondition(
      Array.isArray(expectedNames)
        && expectedNames.every((entry) => typeof entry === "string")
        && exactJson([...expectedNames].sort(), expectedNames),
      "STORAGE_V13_MATRIX_SUMMARY_DIRECTORY_LOCK_INVALID",
      `Candidate summary ${projectName} entry lock must be a sorted string array.`
    );
    requireCondition(
      exactJson(
        (await readdir(path.join(candidate.outputRoot, projectName))).sort(),
        expectedNames
      ),
      "STORAGE_V13_MATRIX_SUMMARY_PROJECT_ENTRIES_REBOUND",
      `Candidate summary ${projectName} project entries changed during terminal publication.`
    );
  }
  return current;
}

async function assertStorageV13MatrixCandidateSummaryRootEntries(
  candidate,
  summaryFileNames
) {
  const entries = await readdir(candidate.outputRoot, { withFileTypes: true });
  const expectedNames = [
    ...PROJECT_NAMES,
    STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME,
    ...summaryFileNames
  ].sort();
  requireCondition(
    exactJson(entries.map((entry) => entry.name).sort(), expectedNames)
      && entries.every((entry) => PROJECT_NAMES.includes(entry.name)
        ? entry.isDirectory() && !entry.isSymbolicLink()
        : entry.isFile() && !entry.isSymbolicLink()),
    "STORAGE_V13_MATRIX_SUMMARY_ROOT_ENTRIES_INVALID",
    "Candidate output root must contain only both browser projects, the attempt marker, and the exact prepared or committed summary state."
  );
}

function storageV13MatrixCandidateSummaryDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.summaryDigest;
  return sha256(canonicalJson(unsigned));
}

function validateStorageV13MatrixCandidateSummaryForPublication(
  candidate,
  expectedAttemptMarker,
  bytes
) {
  requireCondition(
    Buffer.isBuffer(bytes)
      && bytes.byteLength > 0
      && bytes.byteLength <= STORAGE_V13_MATRIX_MAX_SUMMARY_BYTES,
    "STORAGE_V13_MATRIX_SUMMARY_BYTES_INVALID",
    "Candidate summary publication requires one bounded, non-empty exact byte buffer."
  );
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(
      "STORAGE_V13_MATRIX_SUMMARY_JSON_INVALID",
      `Candidate summary is not JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  requireCondition(
    isRecord(document)
      && document.schemaVersion === 2
      && document.summaryType === "storage_v13_matrix_playwright_candidate_summary_v2"
      && document.trustClass === "untrusted_candidate"
      && document.status === "not_admitted"
      && document.executionAdmission === "closed_deferred_boundaries"
      && document.matrixComplete === false
      && document.strictGatePassed === false
      && document.runId === candidate.runId
      && exactJson(document.attemptMarker, expectedAttemptMarker?.binding)
      && exactJson(document.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && SHA256_PATTERN.test(document.summaryDigest ?? "")
      && document.summaryDigest === storageV13MatrixCandidateSummaryDigest(document),
    "STORAGE_V13_MATRIX_SUMMARY_DOCUMENT_INVALID",
    "Candidate summary must retain the closed contract, exact run and attempt marker, and valid digest."
  );
  return document;
}

async function openHeldStorageV13MatrixCandidateSummary(filePath, expectedBytes, label) {
  const handle = await open(filePath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.ino !== 0n
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && handleBefore.size === BigInt(expectedBytes.byteLength)
        && pathBefore.size === handleBefore.size
        && sameStableFileMetadata(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(filePath),
      "STORAGE_V13_MATRIX_SUMMARY_FILE_INVALID",
      `${label} is not the exact bounded single-link regular file.`
    );
    const persisted = await readOpenedFileAtZero(handle, expectedBytes.byteLength);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      persisted.byteLength === expectedBytes.byteLength
        && persisted.equals(expectedBytes)
        && sameStableFileMetadata(handleBefore, handleAfter)
        && sameStableFileMetadata(handleAfter, pathAfter)
        && handleAfter.size === BigInt(expectedBytes.byteLength)
        && pathAfter.size === handleAfter.size
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter)
        && comparablePath(resolvedAfter) === comparablePath(filePath),
      "STORAGE_V13_MATRIX_SUMMARY_FILE_REBOUND",
      `${label} changed while its exact bytes and identity were held.`
    );
    return Object.freeze({
      handle,
      metadata: handleAfter,
      bytes: persisted,
      realPath: path.resolve(resolvedAfter)
    });
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function assertDetachedHeldSummaryStable(held, expectedBytes, label) {
  const before = await held.handle.stat({ bigint: true });
  const persisted = await readOpenedFileAtZero(held.handle, expectedBytes.byteLength);
  const after = await held.handle.stat({ bigint: true });
  requireCondition(
    before.isFile()
      && before.nlink === 1n
      && before.size === BigInt(expectedBytes.byteLength)
      && persisted.byteLength === expectedBytes.byteLength
      && persisted.equals(expectedBytes)
      && sameBigIntFileIdentity(held.metadata, before)
      && held.metadata.mtimeNs === before.mtimeNs
      && sameStableFileMetadata(before, after)
      && after.nlink === 1n
      && after.size === BigInt(expectedBytes.byteLength),
    "STORAGE_V13_MATRIX_SUMMARY_HELD_FILE_REBOUND",
    `${label} changed while its handle crossed terminal rename.`
  );
  return after;
}

async function requireStorageV13MatrixCandidatePathAbsent(target, label) {
  try {
    await lstat(target);
  } catch (error) {
    if (isErrno(error, "ENOENT")) return;
    throw error;
  }
  fail(
    "STORAGE_V13_MATRIX_SUMMARY_TARGET_EXISTS",
    `${label} must not exist before terminal publication.`
  );
}

function storageV13MatrixTerminalCommitBytes(summaryBytes) {
  const bytes = Buffer.from(`${sha256(summaryBytes)}\n`, "utf8");
  requireCondition(
    bytes.byteLength === STORAGE_V13_MATRIX_TERMINAL_COMMIT_BYTES,
    "STORAGE_V13_MATRIX_TERMINAL_COMMIT_BYTES_INVALID",
    "Candidate terminal commit marker must be one lowercase SHA-256 plus LF."
  );
  return bytes;
}

async function createHeldStorageV13MatrixTerminalCommitMarker(filePath, expectedBytes) {
  const handle = await open(filePath, "wx+");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.ino !== 0n
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && handleBefore.size === 0n
        && sameStableFileMetadata(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(filePath),
      "STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_INVALID",
      "Candidate pending terminal commit marker is not one exclusive regular file."
    );
    await handle.writeFile(expectedBytes);
    await handle.sync();
    const persisted = await readOpenedFileAtZero(handle, expectedBytes.byteLength);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      persisted.byteLength === expectedBytes.byteLength
        && persisted.equals(expectedBytes)
        && sameBigIntFileIdentity(handleBefore, handleAfter)
        && sameStableFileMetadata(handleAfter, pathAfter)
        && handleAfter.size === BigInt(expectedBytes.byteLength)
        && pathAfter.size === handleAfter.size
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter)
        && comparablePath(resolvedAfter) === comparablePath(filePath),
      "STORAGE_V13_MATRIX_TERMINAL_COMMIT_WRITE_INVALID",
      "Candidate pending terminal commit marker did not persist as exact bytes."
    );
    return Object.freeze({
      handle,
      metadata: handleAfter,
      bytes: persisted,
      realPath: path.resolve(resolvedAfter)
    });
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldStorageV13MatrixTerminalCommitMarkerStable(held, expectedBytes) {
  const before = await held.handle.stat({ bigint: true });
  const persisted = await readOpenedFileAtZero(held.handle, expectedBytes.byteLength);
  const after = await held.handle.stat({ bigint: true });
  requireCondition(
    before.isFile()
      && before.nlink === 1n
      && before.size === BigInt(expectedBytes.byteLength)
      && persisted.byteLength === expectedBytes.byteLength
      && persisted.equals(expectedBytes)
      && sameBigIntFileIdentity(held.metadata, before)
      && held.metadata.mtimeNs === before.mtimeNs
      && sameStableFileMetadata(before, after)
      && after.nlink === 1n
      && after.size === BigInt(expectedBytes.byteLength),
    "STORAGE_V13_MATRIX_TERMINAL_COMMIT_HELD_FILE_REBOUND",
    "Candidate pending terminal commit marker changed before its terminal rename."
  );
  return after;
}

async function closeStorageV13MatrixHandleBestEffort(handle) {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    // Terminal publication state is authoritative after the native rename.
  }
}

async function publishStorageV13MatrixCandidateSummaryImplementation({
  candidateEnvironment,
  expectedAttemptMarker,
  expectedBytes,
  directoryLocks
}, testOnlyTerminalCommitFault) {
  const candidate = parseWriterCandidateEnvironment(candidateEnvironment);
  requireCondition(
    expectedBytes instanceof Uint8Array,
    "STORAGE_V13_MATRIX_SUMMARY_BYTES_INVALID",
    "Candidate summary publication requires exact Uint8Array bytes."
  );
  const summaryBytes = Buffer.from(expectedBytes);
  const terminalCommitBytes = storageV13MatrixTerminalCommitBytes(summaryBytes);
  const document = validateStorageV13MatrixCandidateSummaryForPublication(
    candidate,
    expectedAttemptMarker,
    summaryBytes
  );
  await assertStorageV13MatrixCandidatePublicationLocksStable(candidate, directoryLocks);
  const markerBefore = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
  assertStorageV13MatrixCandidateAttemptMarkerStable(expectedAttemptMarker, markerBefore);
  await assertStorageV13MatrixCandidateSummaryRootEntries(
    candidate,
    [STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME]
  );
  const pendingSummaryPath = path.join(
    candidate.outputRoot,
    STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME
  );
  const finalSummaryPath = path.join(candidate.outputRoot, STORAGE_V13_MATRIX_SUMMARY_FILE_NAME);
  const pendingTerminalCommitPath = path.join(
    candidate.outputRoot,
    STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME
  );
  const terminalCommitPath = path.join(
    candidate.outputRoot,
    STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME
  );
  await Promise.all([
    requireStorageV13MatrixCandidatePathAbsent(finalSummaryPath, "Candidate final summary"),
    requireStorageV13MatrixCandidatePathAbsent(
      pendingTerminalCommitPath,
      "Candidate pending terminal commit marker"
    ),
    requireStorageV13MatrixCandidatePathAbsent(
      terminalCommitPath,
      "Candidate terminal commit marker"
    )
  ]);
  const heldPending = await openHeldStorageV13MatrixCandidateSummary(
    pendingSummaryPath,
    summaryBytes,
    "Candidate pending summary"
  );
  let heldPendingTerminalCommit;
  let heldFinal;
  try {
    heldPendingTerminalCommit = await createHeldStorageV13MatrixTerminalCommitMarker(
      pendingTerminalCommitPath,
      terminalCommitBytes
    );
    await assertStorageV13MatrixCandidatePublicationLocksStable(candidate, directoryLocks);
    const markerBeforeSummaryRename =
      await loadStorageV13MatrixCandidateAttemptMarker(candidate);
    assertStorageV13MatrixCandidateAttemptMarkerStable(
      markerBefore,
      markerBeforeSummaryRename
    );
    await assertStorageV13MatrixCandidateSummaryRootEntries(
      candidate,
      [
        STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME,
        STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME
      ]
    );
    await Promise.all([
      requireStorageV13MatrixCandidatePathAbsent(finalSummaryPath, "Candidate final summary"),
      requireStorageV13MatrixCandidatePathAbsent(
        terminalCommitPath,
        "Candidate terminal commit marker"
      )
    ]);
    await assertDetachedHeldSummaryStable(
      heldPending,
      summaryBytes,
      "Candidate pending summary"
    );
    await assertHeldStorageV13MatrixTerminalCommitMarkerStable(
      heldPendingTerminalCommit,
      terminalCommitBytes
    );
    await rename(pendingSummaryPath, finalSummaryPath);
    const pendingAfterRename = await assertDetachedHeldSummaryStable(
      heldPending,
      summaryBytes,
      "Candidate renamed summary"
    );
    await requireStorageV13MatrixCandidatePathAbsent(
      pendingSummaryPath,
      "Candidate pending summary after rename"
    );
    heldFinal = await openHeldStorageV13MatrixCandidateSummary(
      finalSummaryPath,
      summaryBytes,
      "Candidate final summary"
    );
    requireCondition(
      sameStableFileMetadata(pendingAfterRename, heldFinal.metadata)
        && comparablePath(heldFinal.realPath) === comparablePath(finalSummaryPath),
      "STORAGE_V13_MATRIX_SUMMARY_FINAL_IDENTITY_INVALID",
      "Candidate final summary is not the exact held pending file in the prepared state."
    );
    validateStorageV13MatrixCandidateSummaryForPublication(
      candidate,
      expectedAttemptMarker,
      heldFinal.bytes
    );
    const markerReady = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
    assertStorageV13MatrixCandidateAttemptMarkerStable(markerBefore, markerReady);
    await assertStorageV13MatrixCandidatePublicationLocksStable(candidate, directoryLocks);
    await assertStorageV13MatrixCandidateSummaryRootEntries(
      candidate,
      [
        STORAGE_V13_MATRIX_SUMMARY_FILE_NAME,
        STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME
      ]
    );
    await assertDetachedHeldSummaryStable(
      heldPending,
      summaryBytes,
      "Candidate renamed summary"
    );
    const finalVerification = await openHeldStorageV13MatrixCandidateSummary(
      finalSummaryPath,
      summaryBytes,
      "Candidate prepared final summary verification"
    );
    try {
      requireCondition(
        sameStableFileMetadata(pendingAfterRename, finalVerification.metadata)
          && sameStableFileMetadata(heldFinal.metadata, finalVerification.metadata),
        "STORAGE_V13_MATRIX_SUMMARY_FINAL_IDENTITY_INVALID",
        "Candidate final summary identity changed before publication completion."
      );
      validateStorageV13MatrixCandidateSummaryForPublication(
        candidate,
        expectedAttemptMarker,
        finalVerification.bytes
      );
    } finally {
      await finalVerification.handle.close().catch(() => undefined);
    }
    await assertHeldStorageV13MatrixTerminalCommitMarkerStable(
      heldPendingTerminalCommit,
      terminalCommitBytes
    );
    await requireStorageV13MatrixCandidatePathAbsent(
      terminalCommitPath,
      "Candidate terminal commit marker"
    );
    const publication = Object.freeze({
      published: true,
      path: relativeBindingPath(
        candidate.bindingRoot,
        finalSummaryPath,
        "Candidate final summary"
      ),
      size: summaryBytes.byteLength,
      sha256: sha256(summaryBytes),
      summaryDigest: document.summaryDigest,
      markerDigest: markerReady.binding.markerDigest,
      attemptId: markerReady.binding.attemptId,
      terminalGateBinding: Object.freeze({
        path: relativeBindingPath(
          candidate.bindingRoot,
          terminalCommitPath,
          "Candidate terminal commit marker"
        ),
        size: terminalCommitBytes.byteLength,
        sha256: sha256(terminalCommitBytes),
        commitsSummarySha256: sha256(summaryBytes)
      })
    });
    // Windows cannot reliably rename an open marker file. Closing it is still
    // part of PREPARED validation and must fail before the terminal commit.
    await heldPendingTerminalCommit.handle.close();
    heldPendingTerminalCommit = undefined;
    if (testOnlyTerminalCommitFault === "create_target_directory_collision") {
      // This restricted test seam can only force the native rename to reject
      // before COMMITTED. It cannot execute caller code or perform the commit.
      await mkdir(terminalCommitPath, { recursive: false });
    }
    // This native same-directory rename is the terminal fallible operation.
    // A missing terminal marker leaves every earlier state uncommitted. Nothing
    // after it may reclassify a committed attempt as failed.
    await rename(pendingTerminalCommitPath, terminalCommitPath);
    return publication;
  } finally {
    await Promise.allSettled([
      closeStorageV13MatrixHandleBestEffort(heldFinal?.handle),
      closeStorageV13MatrixHandleBestEffort(heldPendingTerminalCommit?.handle),
      closeStorageV13MatrixHandleBestEffort(heldPending.handle)
    ]);
  }
}

export async function publishStorageV13MatrixCandidateSummary(input) {
  requireCondition(
    exactKeys(input, [
      "candidateEnvironment",
      "expectedAttemptMarker",
      "expectedBytes",
      "directoryLocks"
    ]),
    "STORAGE_V13_MATRIX_SUMMARY_PUBLICATION_INPUT_INVALID",
    "Candidate summary publication accepts only the exact public input shape."
  );
  return publishStorageV13MatrixCandidateSummaryImplementation(input, undefined);
}

export async function testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault(input) {
  requireCondition(
    exactKeys(input, [
      "candidateEnvironment",
      "expectedAttemptMarker",
      "expectedBytes",
      "directoryLocks",
      "terminalCommitFault"
    ]) && input.terminalCommitFault === "create_target_directory_collision",
    "STORAGE_V13_MATRIX_SUMMARY_TEST_FAULT_INVALID",
    "Test-only publication accepts only the fixed target-directory collision fault."
  );
  const {
    terminalCommitFault,
    ...publicationInput
  } = input;
  return publishStorageV13MatrixCandidateSummaryImplementation(
    publicationInput,
    terminalCommitFault
  );
}

function requireCanonicalTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  requireCondition(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    "STORAGE_V13_MATRIX_TIMESTAMP_INVALID",
    `${label} must be a canonical UTC ISO instant.`
  );
  return parsed;
}

function relativeBindingPath(root, target, label) {
  const relative = relativePathWithin(root, target, label).split(path.sep).join("/");
  requireCondition(
    relative.length > 0 && !relative.startsWith("/") && !relative.includes("\\"),
    "STORAGE_V13_MATRIX_BINDING_PATH_INVALID",
    `${label} must be a canonical relative binding path.`
  );
  return relative;
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function receiptDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
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

function semanticWitnessProjection(witness) {
  return {
    witnessType: witness.witnessType,
    maximumEntriesPerCollection: witness.maximumEntriesPerCollection,
    cases: witness.cases,
    revisions: witness.revisions,
    revisionFingerprints: witness.revisionFingerprints,
    candidateSetFingerprintInventory: witness.candidateSetFingerprintInventory
  };
}

function requireUniqueDigests(values, label) {
  requireCondition(
    new Set(values).size === values.length,
    "STORAGE_V13_MATRIX_SEMANTIC_WITNESS_DUPLICATE",
    `${label} must not contain duplicate digests.`
  );
}

function assertSemanticWitness(witness, label) {
  requireCondition(
    exactKeys(witness, SEMANTIC_WITNESS_KEYS)
      && witness.witnessType === "bounded_hashed_case_revision_relationships_v1"
      && witness.maximumEntriesPerCollection === STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && Array.isArray(witness.cases)
      && Array.isArray(witness.revisions)
      && Array.isArray(witness.revisionFingerprints)
      && isRecord(witness.candidateSetFingerprintInventory)
      && witness.cases.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && witness.revisions.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES
      && witness.revisionFingerprints.length <= STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES,
    "STORAGE_V13_MATRIX_SEMANTIC_WITNESS_INVALID",
    `${label} semantic witness shape or bound is invalid.`
  );
  for (const entry of witness.cases) {
    requireCondition(
      exactKeys(entry, SEMANTIC_CASE_KEYS)
        && SHA256_PATTERN.test(entry.caseIdDigest ?? "")
        && SHA256_PATTERN.test(entry.latestRevisionIdDigest ?? "")
        && Number.isSafeInteger(entry.revisionCount)
        && entry.revisionCount > 0
        && (entry.lifecycleState === "active" || entry.lifecycleState === "trashed")
        && SHA256_PATTERN.test(entry.lifecycleIndependentRecordDigest ?? "")
        && SHA256_PATTERN.test(entry.editStableRecordDigest ?? "")
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_SEMANTIC_CASE_INVALID",
      `${label} contains an invalid hashed Case witness.`
    );
  }
  for (const entry of witness.revisions) {
    requireCondition(
      exactKeys(entry, SEMANTIC_REVISION_KEYS)
        && SHA256_PATTERN.test(entry.revisionIdDigest ?? "")
        && SHA256_PATTERN.test(entry.caseIdDigest ?? "")
        && Number.isSafeInteger(entry.revisionNumber)
        && entry.revisionNumber > 0
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_SEMANTIC_REVISION_INVALID",
      `${label} contains an invalid hashed Revision witness.`
    );
  }
  for (const entry of witness.revisionFingerprints) {
    requireCondition(
      exactKeys(entry, SEMANTIC_FINGERPRINT_KEYS)
        && SHA256_PATTERN.test(entry.sourceIdDigest ?? "")
        && SHA256_PATTERN.test(entry.subjectIdDigest ?? "")
        && SHA256_PATTERN.test(entry.recordDigest ?? ""),
      "STORAGE_V13_MATRIX_SEMANTIC_FINGERPRINT_INVALID",
      `${label} contains an invalid hashed revision fingerprint witness.`
    );
  }
  requireCondition(
    exactKeys(
      witness.candidateSetFingerprintInventory,
      SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_KEYS
    )
      && Number.isSafeInteger(witness.candidateSetFingerprintInventory.count)
      && witness.candidateSetFingerprintInventory.count >= 0
      && SHA256_PATTERN.test(
        witness.candidateSetFingerprintInventory.logicalContentDigest ?? ""
      ),
    "STORAGE_V13_MATRIX_SEMANTIC_CANDIDATE_SET_FINGERPRINT_INVENTORY_INVALID",
    `${label} candidate-set fingerprint aggregate is invalid.`
  );
  requireUniqueDigests(witness.cases.map((entry) => entry.caseIdDigest), `${label} Case ids`);
  requireUniqueDigests(witness.cases.map((entry) => entry.recordDigest), `${label} Case records`);
  requireUniqueDigests(witness.revisions.map((entry) => entry.revisionIdDigest), `${label} Revision ids`);
  requireUniqueDigests(witness.revisions.map((entry) => entry.recordDigest), `${label} Revision records`);
  requireUniqueDigests(
    witness.revisionFingerprints.map((entry) => entry.sourceIdDigest),
    `${label} revision fingerprint source ids`
  );
  requireUniqueDigests(
    witness.revisionFingerprints.map((entry) => entry.recordDigest),
    `${label} revision fingerprint records`
  );
  requireCondition(
    exactJson(witness.cases, [...witness.cases].sort((left, right) =>
      compareCanonicalText(left.caseIdDigest, right.caseIdDigest)))
      && exactJson(witness.revisions, [...witness.revisions].sort((left, right) =>
        compareCanonicalText(left.caseIdDigest, right.caseIdDigest)
          || left.revisionNumber - right.revisionNumber
          || compareCanonicalText(left.revisionIdDigest, right.revisionIdDigest)))
      && exactJson(witness.revisionFingerprints, [...witness.revisionFingerprints].sort((left, right) =>
        compareCanonicalText(left.subjectIdDigest, right.subjectIdDigest)
          || compareCanonicalText(left.sourceIdDigest, right.sourceIdDigest))),
    "STORAGE_V13_MATRIX_SEMANTIC_WITNESS_ORDER_INVALID",
    `${label} semantic witness collections are not canonically ordered.`
  );
  const caseMap = new Map(witness.cases.map((entry) => [entry.caseIdDigest, entry]));
  const revisionsByCase = new Map(witness.cases.map((entry) => [entry.caseIdDigest, []]));
  for (const revision of witness.revisions) {
    requireCondition(
      caseMap.has(revision.caseIdDigest),
      "STORAGE_V13_MATRIX_SEMANTIC_ORPHAN_REVISION",
      `${label} contains a Revision outside the complete Case inventory.`
    );
    revisionsByCase.get(revision.caseIdDigest).push(revision);
  }
  for (const caseEntry of witness.cases) {
    const revisions = revisionsByCase.get(caseEntry.caseIdDigest);
    requireCondition(
      revisions.length === caseEntry.revisionCount
        && revisions.every((revision, index) => revision.revisionNumber === index + 1)
        && revisions.at(-1)?.revisionIdDigest === caseEntry.latestRevisionIdDigest,
      "STORAGE_V13_MATRIX_SEMANTIC_CASE_REVISION_MISMATCH",
      `${label} Case latestRevisionId/revisionCount is not bound to its complete Revision inventory.`
    );
  }
  const revisionMap = new Map(witness.revisions.map((entry) => [entry.revisionIdDigest, entry]));
  requireCondition(
    witness.revisionFingerprints.length === witness.revisions.length
      && witness.revisionFingerprints.every((entry) => {
        const revision = revisionMap.get(entry.sourceIdDigest);
        return revision?.caseIdDigest === entry.subjectIdDigest;
      }),
    "STORAGE_V13_MATRIX_SEMANTIC_FINGERPRINT_RELATION_INVALID",
    `${label} revision fingerprints do not exactly cover the Revision inventory.`
  );
  requireCondition(
    SHA256_PATTERN.test(witness.witnessDigest ?? "")
      && witness.witnessDigest === sha256(canonicalJson(semanticWitnessProjection(witness))),
    "STORAGE_V13_MATRIX_SEMANTIC_WITNESS_DIGEST_INVALID",
    `${label} semantic witness digest is invalid.`
  );
  return witness;
}

function assertSnapshot(snapshot, expectedOperationId, expectedPhase) {
  requireCondition(
    exactKeys(snapshot, SNAPSHOT_KEYS),
    "STORAGE_V13_MATRIX_SNAPSHOT_SHAPE_INVALID",
    `${expectedOperationId}/${expectedPhase} snapshot has an invalid shape.`
  );
  requireCondition(
    snapshot.schemaVersion === 2
      && snapshot.recordType === "storage_v13_native_readonly_snapshot_v2"
      && typeof snapshot.captureId === "string"
      && CANONICAL_ID_PATTERN.test(snapshot.captureId)
      && snapshot.operationId === expectedOperationId
      && snapshot.phase === expectedPhase
      && snapshot.databaseName === "hakimi-bazi-research"
      && snapshot.physicalVersion === 130
      && snapshot.dexieVersion === 13
      && snapshot.transactionMode === "readonly"
      && exactJson(snapshot.storeNames, STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES)
      && Array.isArray(snapshot.stores)
      && snapshot.stores.length === STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.length,
    "STORAGE_V13_MATRIX_SNAPSHOT_IDENTITY_INVALID",
    `${expectedOperationId}/${expectedPhase} is not an exact native readonly v13 snapshot.`
  );
  requireCanonicalTimestamp(snapshot.capturedAt, `${expectedOperationId}/${expectedPhase} capturedAt`);
  for (let index = 0; index < snapshot.stores.length; index += 1) {
    const store = snapshot.stores[index];
    requireCondition(
      exactKeys(store, SNAPSHOT_STORE_KEYS)
        && store.storeName === STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES[index]
        && Number.isSafeInteger(store.count)
        && store.count >= 0
        && SHA256_PATTERN.test(store.recordsDigest ?? "")
        && (store.storeName === "birthFingerprints"
          ? store.logicalContentDigest === null
          : SHA256_PATTERN.test(store.logicalContentDigest ?? "")),
      "STORAGE_V13_MATRIX_STORE_SNAPSHOT_INVALID",
      `${expectedOperationId}/${expectedPhase} store projection is invalid.`
    );
  }
  assertSemanticWitness(snapshot.semanticWitness, `${expectedOperationId}/${expectedPhase}`);
  const storeMap = new Map(snapshot.stores.map((store) => [store.storeName, store]));
  requireCondition(
    snapshot.semanticWitness.cases.length === storeMap.get("cases")?.count
      && snapshot.semanticWitness.revisions.length === storeMap.get("revisions")?.count
      && snapshot.semanticWitness.revisionFingerprints.length
        + snapshot.semanticWitness.candidateSetFingerprintInventory.count
        === storeMap.get("birthFingerprints")?.count,
    "STORAGE_V13_MATRIX_SEMANTIC_WITNESS_CARDINALITY_MISMATCH",
    `${expectedOperationId}/${expectedPhase} semantic inventory does not cover the Case, Revision, and typed birth-fingerprint store cardinalities.`
  );
  requireCondition(
    SHA256_PATTERN.test(snapshot.snapshotDigest ?? "")
      && snapshot.snapshotDigest === sha256(canonicalJson(snapshotProjection(snapshot))),
    "STORAGE_V13_MATRIX_SNAPSHOT_DIGEST_INVALID",
    `${expectedOperationId}/${expectedPhase} snapshot digest is invalid.`
  );
  return snapshot;
}

function storesByName(snapshot) {
  return new Map(snapshot.stores.map((store) => [store.storeName, store]));
}

function changedStores(before, after) {
  const left = storesByName(before);
  const right = storesByName(after);
  return STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES.filter((storeName) => {
    const beforeStore = left.get(storeName);
    const afterStore = right.get(storeName);
    const semanticChanged = storeName === "cases"
      ? !exactJson(before.semanticWitness.cases, after.semanticWitness.cases)
      : storeName === "revisions"
        ? !exactJson(before.semanticWitness.revisions, after.semanticWitness.revisions)
        : storeName === "birthFingerprints"
          ? !exactJson({
            revisionFingerprints: before.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              before.semanticWitness.candidateSetFingerprintInventory
          }, {
            revisionFingerprints: after.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              after.semanticWitness.candidateSetFingerprintInventory
          })
          : false;
    return beforeStore.count !== afterStore.count
      || beforeStore.recordsDigest !== afterStore.recordsDigest
      || beforeStore.logicalContentDigest !== afterStore.logicalContentDigest
      || semanticChanged;
  });
}

function countDelta(before, after, storeName) {
  return storesByName(after).get(storeName).count - storesByName(before).get(storeName).count;
}

function requireSameSnapshot(left, right, label) {
  requireCondition(
    left.snapshotDigest === right.snapshotDigest,
    "STORAGE_V13_MATRIX_UNEXPECTED_MUTATION",
    `${label} must preserve the exact native readonly snapshot digest.`
  );
}

function validateDownload(download, operationId) {
  requireCondition(
    exactKeys(download, DOWNLOAD_KEYS)
      && typeof download.observed === "boolean"
      && Number.isSafeInteger(download.eventCount)
      && download.eventCount >= 0,
    "STORAGE_V13_MATRIX_DOWNLOAD_SHAPE_INVALID",
    `${operationId} download observation is invalid.`
  );
  const operationFilenamePattern = DOWNLOAD_FILENAME_PATTERNS_BY_OPERATION[operationId];
  const expectedDownload = operationFilenamePattern !== undefined;
  if (expectedDownload) {
    requireCondition(
      download.observed === true
        && download.eventCount === 1
        && Number.isSafeInteger(download.size)
        && download.size > 0
        && download.size <= STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES
        && SHA256_PATTERN.test(download.sha256 ?? "")
        && typeof download.suggestedFilename === "string"
        && DOWNLOAD_FILENAME_PATTERN.test(download.suggestedFilename)
        && operationFilenamePattern.test(download.suggestedFilename),
      "STORAGE_V13_MATRIX_DOWNLOAD_EVIDENCE_INVALID",
      `${operationId} requires one exact downloaded artifact observation.`
    );
  } else {
    requireCondition(
      download.observed === false
        && download.eventCount === 0
        && download.size === null
        && download.sha256 === null
        && download.suggestedFilename === null,
      "STORAGE_V13_MATRIX_UNEXPECTED_DOWNLOAD",
      `${operationId} must not report a download.`
    );
  }
  return download;
}

function validateBackupProjection(backup, operationId) {
  const expected = operationId === "export" || operationId === "restore";
  if (!expected) {
    requireCondition(
      backup === null,
      "STORAGE_V13_MATRIX_UNEXPECTED_BACKUP_PROJECTION",
      `${operationId} must not carry a logical backup projection.`
    );
    return null;
  }
  requireCondition(
    exactKeys(backup, [
      "formatVersion",
      "payloadDigest",
      "logicalPartitionNames",
      "counts",
      "sharedPartitionContentDigests"
    ])
      && typeof backup.formatVersion === "string"
      && backup.formatVersion === "1.2.0"
      && SHA256_PATTERN.test(backup.payloadDigest ?? "")
      && exactJson(backup.logicalPartitionNames, STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES)
      && isRecord(backup.counts)
      && exactJson(Object.keys(backup.counts).sort(), [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES].sort())
      && Object.values(backup.counts).every((count) => Number.isSafeInteger(count) && count >= 0)
      && backup.counts.revisionCalculationReceipts === 0
      && !("birthFingerprints" in backup.counts)
      && isRecord(backup.sharedPartitionContentDigests)
      && exactJson(
        Object.keys(backup.sharedPartitionContentDigests).sort(),
        [...STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES].sort()
      )
      && Object.values(backup.sharedPartitionContentDigests)
        .every((digest) => SHA256_PATTERN.test(digest)),
    "STORAGE_V13_MATRIX_BACKUP_PROJECTION_INVALID",
    `${operationId} logical-16 backup projection is invalid or mixed with the physical-16 set.`
  );
  return backup;
}

function validateSafetyBackupProjection(safetyBackup, operationId) {
  if (operationId !== "restore") {
    requireCondition(
      safetyBackup === null,
      "STORAGE_V13_MATRIX_UNEXPECTED_SAFETY_BACKUP_PROJECTION",
      `${operationId} must not carry a restore safety-backup projection.`
    );
    return null;
  }
  requireCondition(
    exactKeys(safetyBackup, [
      "formatVersion",
      "payloadDigest",
      "logicalPartitionNames",
      "counts",
      "sharedPartitionContentDigests"
    ])
      && safetyBackup.formatVersion === "1.2.0"
      && SHA256_PATTERN.test(safetyBackup.payloadDigest ?? "")
      && exactJson(
        safetyBackup.logicalPartitionNames,
        STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES
      )
      && isRecord(safetyBackup.counts)
      && exactJson(
        Object.keys(safetyBackup.counts).sort(),
        [...STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES].sort()
      )
      && Object.values(safetyBackup.counts).every(
        (count) => Number.isSafeInteger(count) && count >= 0
      )
      && safetyBackup.counts.revisionCalculationReceipts === 0
      && !("birthFingerprints" in safetyBackup.counts)
      && isRecord(safetyBackup.sharedPartitionContentDigests)
      && exactJson(
        Object.keys(safetyBackup.sharedPartitionContentDigests).sort(),
        [...STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES].sort()
      )
      && Object.values(safetyBackup.sharedPartitionContentDigests)
        .every((digest) => SHA256_PATTERN.test(digest)),
    "STORAGE_V13_MATRIX_SAFETY_BACKUP_PROJECTION_INVALID",
    "restore safety backup must be the exact logical-16 projection without a physical birthFingerprints partition."
  );
  return safetyBackup;
}

function requireSafetyBackupContentMatchSnapshot(safetyBackup, snapshot) {
  const snapshotStores = storesByName(snapshot);
  requireCondition(
    STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.length === 15
      && STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.every(
        (partitionName) => safetyBackup.counts[partitionName] === snapshotStores.get(partitionName).count
          && safetyBackup.sharedPartitionContentDigests[partitionName]
            === snapshotStores.get(partitionName).logicalContentDigest
      ),
    "STORAGE_V13_MATRIX_SAFETY_BACKUP_CONTENT_MISMATCH",
    "Restore safety-backup counts and canonical-multiset content digests must equal the before_commit snapshot for all 15 shared partitions."
  );
}

function requireExportBackupContentMatchSnapshot(backup, snapshot) {
  const snapshotStores = storesByName(snapshot);
  requireCondition(
    STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.length === 15
      && STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES.every(
        (partitionName) => backup.counts[partitionName] === snapshotStores.get(partitionName).count
          && backup.sharedPartitionContentDigests[partitionName]
            === snapshotStores.get(partitionName).logicalContentDigest
      ),
    "STORAGE_V13_MATRIX_EXPORT_BACKUP_CONTENT_MISMATCH",
    "Export backup counts and canonical-multiset content digests must equal the after_ui_read snapshot for all 15 shared partitions."
  );
}

function semanticDiff(beforeEntries, afterEntries, keyName) {
  const before = new Map(beforeEntries.map((entry) => [entry[keyName], entry]));
  const after = new Map(afterEntries.map((entry) => [entry[keyName], entry]));
  return Object.freeze({
    added: Object.freeze([...after.entries()].filter(([key]) => !before.has(key)).map(([, value]) => value)),
    removed: Object.freeze([...before.entries()].filter(([key]) => !after.has(key)).map(([, value]) => value)),
    changed: Object.freeze([...before.entries()].filter(([key, value]) =>
      after.has(key) && !exactJson(value, after.get(key))).map(([key, value]) =>
      Object.freeze({ before: value, after: after.get(key) }))),
    unchanged: Object.freeze([...before.entries()].filter(([key, value]) =>
      after.has(key) && exactJson(value, after.get(key))).map(([, value]) => value))
  });
}

function requireCreateSemanticRelationship(beforeSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const cases = semanticDiff(before.cases, after.cases, "caseIdDigest");
  const revisions = semanticDiff(before.revisions, after.revisions, "revisionIdDigest");
  const fingerprints = semanticDiff(
    before.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const createdCase = cases.added[0];
  const createdRevision = revisions.added[0];
  const createdFingerprint = fingerprints.added[0];
  requireCondition(
    cases.added.length === 1 && cases.removed.length === 0 && cases.changed.length === 0
      && revisions.added.length === 1 && revisions.removed.length === 0 && revisions.changed.length === 0
      && fingerprints.added.length === 1
      && fingerprints.removed.length === 0
      && fingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      )
      && createdCase.lifecycleState === "active"
      && createdCase.revisionCount === 1
      && createdCase.latestRevisionIdDigest === createdRevision.revisionIdDigest
      && createdRevision.caseIdDigest === createdCase.caseIdDigest
      && createdRevision.revisionNumber === 1
      && createdFingerprint.sourceIdDigest === createdRevision.revisionIdDigest
      && createdFingerprint.subjectIdDigest === createdCase.caseIdDigest,
    "STORAGE_V13_MATRIX_CREATE_SEMANTIC_RELATION_INVALID",
    "Create must append exactly one Case, its first Revision, and the matching revision fingerprint without rewriting prior records."
  );
}

function requireEditSemanticRelationship(beforeSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const cases = semanticDiff(before.cases, after.cases, "caseIdDigest");
  const revisions = semanticDiff(before.revisions, after.revisions, "revisionIdDigest");
  const fingerprints = semanticDiff(
    before.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const changedCase = cases.changed[0];
  const newRevision = revisions.added[0];
  const newFingerprint = fingerprints.added[0];
  requireCondition(
    cases.added.length === 0 && cases.removed.length === 0 && cases.changed.length === 1
      && revisions.added.length === 1 && revisions.removed.length === 0 && revisions.changed.length === 0
      && fingerprints.added.length === 1
      && fingerprints.removed.length === 0
      && fingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      )
      && changedCase.before.lifecycleState === "active"
      && changedCase.after.lifecycleState === "active"
      && changedCase.before.editStableRecordDigest === changedCase.after.editStableRecordDigest
      && changedCase.after.revisionCount === changedCase.before.revisionCount + 1
      && newRevision.caseIdDigest === changedCase.after.caseIdDigest
      && newRevision.revisionNumber === changedCase.after.revisionCount
      && changedCase.after.latestRevisionIdDigest === newRevision.revisionIdDigest
      && before.revisions.some((entry) =>
        entry.revisionIdDigest === changedCase.before.latestRevisionIdDigest)
      && newFingerprint.sourceIdDigest === newRevision.revisionIdDigest
      && newFingerprint.subjectIdDigest === changedCase.after.caseIdDigest,
    "STORAGE_V13_MATRIX_EDIT_SEMANTIC_RELATION_INVALID",
    "Edit must append one Revision, preserve every old Revision byte digest, and advance only the owning Case latest pointer/count."
  );
}

function requireDeleteSemanticRelationship(beforeSnapshot, trashedSnapshot, afterSnapshot) {
  const before = beforeSnapshot.semanticWitness;
  const trashed = trashedSnapshot.semanticWitness;
  const after = afterSnapshot.semanticWitness;
  const trashCases = semanticDiff(before.cases, trashed.cases, "caseIdDigest");
  const trashRevisions = semanticDiff(before.revisions, trashed.revisions, "revisionIdDigest");
  const trashFingerprints = semanticDiff(
    before.revisionFingerprints,
    trashed.revisionFingerprints,
    "sourceIdDigest"
  );
  const lifecycleChange = trashCases.changed[0];
  requireCondition(
    trashCases.added.length === 0 && trashCases.removed.length === 0 && trashCases.changed.length === 1
      && trashRevisions.added.length === 0
      && trashRevisions.removed.length === 0
      && trashRevisions.changed.length === 0
      && trashFingerprints.added.length === 0
      && trashFingerprints.removed.length === 0
      && trashFingerprints.changed.length === 0
      && exactJson(
        before.candidateSetFingerprintInventory,
        trashed.candidateSetFingerprintInventory
      )
      && lifecycleChange.before.lifecycleState === "active"
      && lifecycleChange.after.lifecycleState === "trashed"
      && lifecycleChange.before.caseIdDigest === lifecycleChange.after.caseIdDigest
      && lifecycleChange.before.latestRevisionIdDigest === lifecycleChange.after.latestRevisionIdDigest
      && lifecycleChange.before.revisionCount === lifecycleChange.after.revisionCount
      && lifecycleChange.before.lifecycleIndependentRecordDigest
        === lifecycleChange.after.lifecycleIndependentRecordDigest
      && lifecycleChange.before.recordDigest !== lifecycleChange.after.recordDigest,
    "STORAGE_V13_MATRIX_DELETE_TRASH_PRECONDITION_INVALID",
    "Delete must first observe one active Case becoming trashed while every Revision and revision fingerprint remains unchanged."
  );

  const deletedCases = semanticDiff(trashed.cases, after.cases, "caseIdDigest");
  const deletedRevisions = semanticDiff(trashed.revisions, after.revisions, "revisionIdDigest");
  const deletedFingerprints = semanticDiff(
    trashed.revisionFingerprints,
    after.revisionFingerprints,
    "sourceIdDigest"
  );
  const targetCase = lifecycleChange.after;
  const targetRevisions = trashed.revisions.filter(
    (entry) => entry.caseIdDigest === targetCase.caseIdDigest
  );
  const targetRevisionIds = new Set(targetRevisions.map((entry) => entry.revisionIdDigest));
  requireCondition(
    deletedCases.added.length === 0
      && deletedCases.removed.length === 1
      && deletedCases.removed[0].caseIdDigest === targetCase.caseIdDigest
      && deletedCases.changed.length === 0
      && deletedRevisions.added.length === 0
      && deletedRevisions.changed.length === 0
      && deletedRevisions.removed.length === targetCase.revisionCount
      && deletedRevisions.removed.every((entry) => targetRevisionIds.has(entry.revisionIdDigest))
      && deletedFingerprints.added.length === 0
      && deletedFingerprints.changed.length === 0
      && deletedFingerprints.removed.length === targetRevisionIds.size
      && deletedFingerprints.removed.every((entry) =>
        targetRevisionIds.has(entry.sourceIdDigest)
          && entry.subjectIdDigest === targetCase.caseIdDigest)
      && exactJson(
        trashed.candidateSetFingerprintInventory,
        after.candidateSetFingerprintInventory
      ),
    "STORAGE_V13_MATRIX_DELETE_SEMANTIC_RELATION_INVALID",
    "Permanent delete must remove only the already-trashed Case and its exact Revision/fingerprint graph."
  );
}

function validateObservedOperations(operations, policy) {
  requireCondition(
    Array.isArray(operations)
      && operations.length === STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS.length,
    "STORAGE_V13_MATRIX_OPERATION_SET_INVALID",
    "Candidate must contain the exact six locally observable operations."
  );
  const validated = operations.map((operation, index) => {
    const operationId = STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS[index];
    const operationPolicy = policy.observedOperations[index];
    requireCondition(
      exactKeys(operation, OPERATION_KEYS)
        && operation.operationId === operationId
        && operationPolicy.operationId === operationId
        && operation.status === "observed_pass"
        && operation.uiPath === operationPolicy.uiPath
        && operation.observationMethod === "native_indexeddb_readonly_v2"
        && Array.isArray(operation.captures)
        && operation.captures.length === operationPolicy.capturePhases.length,
      "STORAGE_V13_MATRIX_OPERATION_INVALID",
      `${operationId} observation is incomplete or out of order.`
    );
    const captures = operationPolicy.capturePhases.map((phase, captureIndex) =>
      assertSnapshot(operation.captures[captureIndex], operationId, phase)
    );
    validateDownload(operation.download, operationId);
    validateBackupProjection(operation.backup, operationId);
    validateSafetyBackupProjection(operation.safetyBackup, operationId);
    if (["create", "edit", "delete", "export"].includes(operationId)) {
      const before = captures[0];
      const after = captures.at(-1);
      requireCondition(
        exactJson(changedStores(before, after), operationPolicy.exactChangedStores),
        "STORAGE_V13_MATRIX_STORE_DIFF_INVALID",
        `${operationId} changed an unexpected physical store set.`
      );
      for (const [storeName, expectedDelta] of Object.entries(operationPolicy.countDeltas)) {
        requireCondition(
          countDelta(before, after, storeName) === expectedDelta,
          "STORAGE_V13_MATRIX_COUNT_DELTA_INVALID",
          `${operationId} count delta for ${storeName} is invalid.`
        );
      }
    }
    if (operationId === "create") requireCreateSemanticRelationship(captures[0], captures[1]);
    if (operationId === "edit") requireEditSemanticRelationship(captures[0], captures[1]);
    if (operationId === "delete") {
      requireCondition(
        exactJson(changedStores(captures[0], captures[1]), ["cases"])
          && countDelta(captures[0], captures[1], "cases") === 0,
        "STORAGE_V13_MATRIX_DELETE_TRASH_STORE_DIFF_INVALID",
        "The trash transition may change only the Case store without changing its count."
      );
      requireDeleteSemanticRelationship(captures[0], captures[1], captures[2]);
    }
    if (operationId === "cancel") requireSameSnapshot(captures[0], captures[1], "cancel");
    return Object.freeze({ ...operation, captures: Object.freeze(captures) });
  });

  const [create, edit, deletion, exported, restore, cancel] = validated;
  requireSameSnapshot(create.captures[1], edit.captures[0], "create/edit adjacency");
  requireSameSnapshot(edit.captures[1], deletion.captures[0], "edit/delete adjacency");
  requireSameSnapshot(create.captures[0], deletion.captures[2], "create/edit/delete round trip");
  requireSameSnapshot(exported.captures[1], restore.captures[0], "export backup baseline");
  requireCondition(
    exactJson(exported.backup, restore.backup),
    "STORAGE_V13_MATRIX_BACKUP_BINDING_MISMATCH",
    "Restore must bind the exact logical backup projection produced by export."
  );
  requireExportBackupContentMatchSnapshot(exported.backup, exported.captures[1]);
  requireCondition(
    restore.safetyBackup.payloadDigest !== restore.backup.payloadDigest,
    "STORAGE_V13_MATRIX_SAFETY_BACKUP_TARGET_COLLISION",
    "Restore safety-backup payload must differ from the restore target backup payload."
  );
  requireSafetyBackupContentMatchSnapshot(restore.safetyBackup, restore.captures[3]);
  requireSameSnapshot(restore.captures[1], restore.captures[2], "restore preflight");
  requireSameSnapshot(restore.captures[2], restore.captures[3], "restore pre-commit state");
  requireSameSnapshot(restore.captures[0], restore.captures[4], "restore committed state");
  requireSameSnapshot(restore.captures[4], cancel.captures[0], "cancel precondition");
  requireSameSnapshot(cancel.captures[0], cancel.captures[1], "cancel result");
  requireCondition(
    restore.captures[0].snapshotDigest !== restore.captures[1].snapshotDigest,
    "STORAGE_V13_MATRIX_RESTORE_NO_MUTATION_FIXTURE",
    "Restore must replace a genuinely changed current state with the backup baseline."
  );
  return Object.freeze(validated);
}

function validateDeferredBoundaries(boundaries, policy) {
  requireCondition(
    Array.isArray(boundaries)
      && boundaries.length === STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_IDS.length,
    "STORAGE_V13_MATRIX_DEFERRED_SET_INVALID",
    "Candidate must retain the exact four deferred boundaries."
  );
  boundaries.forEach((boundary, index) => {
    const expected = policy.deferredBoundaries[index];
    requireCondition(
      exactKeys(boundary, DEFERRED_KEYS)
        && boundary.boundaryId === STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_IDS[index]
        && exactJson(boundary, expected),
      "STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_INVALID",
      `Deferred boundary ${String(boundary?.boundaryId)} is invalid.`
    );
  });
  return Object.freeze(boundaries.map((boundary) => Object.freeze({ ...boundary })));
}

function validatePolicy(policy) {
  requireCondition(
    isRecord(policy)
      && policy.schemaVersion === 2
      && policy.policyId === "storage-v13-matrix-candidate-policy-v2"
      && policy.evidenceClass === "untrusted_locked_artifact_browser_candidate"
      && policy.formalReleaseEvidenceReceipt === false
      && exactJson(policy.releaseIdentity, {
        channel: "default-v13",
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      })
      && exactJson(policy.physicalDatabase, {
        databaseName: "hakimi-bazi-research",
        dexieVersion: 13,
        nativeVersion: 130,
        storeNames: STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES
      })
      && exactJson(policy.logicalBackup, {
        formatVersion: "1.2.0",
        partitionNames: STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES,
        sharedPhysicalPartitionNames: STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES,
        sharedPartitionContentDigestAlgorithm: "sha256_canonical_json_multiset_v1",
        requiredAbsentPhysicalStore: "revisionCalculationReceipts",
        requiredInternalPhysicalStoreExcluded: "birthFingerprints"
      })
      && exactJson(policy.semanticWitness, {
        witnessType: "bounded_hashed_case_revision_relationships_v1",
        maximumEntriesPerCollection: STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES,
        inventoryScope: "all_cases_revisions_and_revision_fingerprints",
        identifierDisclosure: "sha256_only",
        recordDisclosure: "sha256_only"
      })
      && exactJson(policy.capabilities, STORAGE_V13_MATRIX_CAPABILITIES)
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_candidate",
        status: "not_admitted",
        executionAdmission: "closed_deferred_boundaries",
        matrixComplete: false,
        strictGatePassed: false
      })
      && exactJson(policy.authority, STORAGE_V13_MATRIX_AUTHORITY)
      && exactJson(policy.observedOperations, STORAGE_V13_MATRIX_OBSERVED_OPERATION_POLICY)
      && exactJson(policy.deferredBoundaries, STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_POLICY),
    "STORAGE_V13_MATRIX_POLICY_INVALID",
    "Storage v13 candidate policy does not preserve the frozen closed boundary."
  );
  return policy;
}

export async function loadStorageV13MatrixCandidatePolicy(cwd = process.cwd()) {
  const absolutePath = path.resolve(cwd, STORAGE_V13_MATRIX_POLICY_PATH);
  const bytes = await readFile(absolutePath);
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("STORAGE_V13_MATRIX_POLICY_JSON_INVALID", error instanceof Error ? error.message : String(error));
  }
  validatePolicy(document);
  return Object.freeze({
    path: STORAGE_V13_MATRIX_POLICY_PATH,
    size: bytes.byteLength,
    sha256: sha256(bytes),
    canonicalSha256: sha256(canonicalJson(document)),
    document: Object.freeze(document)
  });
}

export async function loadStorageV13MatrixGovernanceBindings(cwd = process.cwd()) {
  const policy = await loadStorageV13MatrixCandidatePolicy(cwd);
  const decisionsPath = path.resolve(cwd, STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH);
  const decisionsBytes = await readFile(decisionsPath);
  const decisions = JSON.parse(decisionsBytes.toString("utf8"));
  const commands = decisions?.releaseEvidence?.defaultV13RequiredReceiptCommands;
  requireCondition(
    isRecord(commands)
      && exactJson(Object.keys(commands), FORMAL_RECEIPT_IDS)
      && !canonicalJson(commands).includes("storage-v13-matrix"),
    "STORAGE_V13_MATRIX_FORMAL_ALLOWLIST_REBOUND",
    "Formal default-v13 receipt commands must remain the exact 13-item set without this candidate."
  );
  return Object.freeze({
    policy,
    releaseDecisions: Object.freeze({
      path: STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH,
      size: decisionsBytes.byteLength,
      sha256: sha256(decisionsBytes),
      canonicalSha256: sha256(canonicalJson(decisions))
    })
  });
}

export function parseStorageV13MatrixCandidateEnvironment(environment) {
  const mapped = {
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ORIGIN: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.origin],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.outputRoot],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_BINDING_ROOT: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.bindingRoot],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_ROOT: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactRoot],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_LOCK: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactLock],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_RELEASE_EVIDENCE_ID: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.releaseEvidenceId],
    HAKIMI_DEPLOYED_PWA_CANDIDATE_RUN_ID: environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.runId]
  };
  const parsed = parseDeployedPwaCandidateEnvironment(mapped);
  const attemptId = environment?.[STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.attemptId];
  requireCondition(
    typeof attemptId === "string"
      && attemptId.trim() === attemptId
      && ATTEMPT_ID_PATTERN.test(attemptId),
    "STORAGE_V13_MATRIX_ATTEMPT_ID_INVALID",
    "Candidate attempt id must be an explicit wrapper-generated 256-bit lowercase hexadecimal id."
  );
  const comparable = (value) => process.platform === "win32"
    ? path.resolve(value).toLowerCase()
    : path.resolve(value);
  requireCondition(
    comparable(parsed.outputRoot) === comparable(path.join(
      parsed.bindingRoot,
      "tmp",
      "storage-v13-matrix-candidate",
      parsed.runId
    )),
    "STORAGE_V13_MATRIX_OUTPUT_SCOPE_INVALID",
    "Candidate output root must be tmp/storage-v13-matrix-candidate/<runId> under the workspace."
  );
  return Object.freeze({ ...parsed, attemptId });
}

async function assertPreparedOutputStable(preparedOutput) {
  const directories = [
    [preparedOutput.bindingRoot, preparedOutput.exactDirectoryIdentities?.bindingRoot, "binding root"],
    [preparedOutput.outputRoot, preparedOutput.exactDirectoryIdentities?.outputRoot, "output root"],
    [preparedOutput.projectRoot, preparedOutput.exactDirectoryIdentities?.projectRoot, "project root"]
  ];
  for (const [directory, expectedIdentity, label] of directories) {
    const currentIdentity = await captureExactFilesystemIdentity(directory, "directory", `Candidate ${label}`);
    requireCondition(
      sameExactFilesystemIdentity(currentIdentity, expectedIdentity),
      "STORAGE_V13_MATRIX_OUTPUT_REBOUND",
      `Candidate ${label} changed during browser capture.`
    );
  }
}

async function readOpenedFileAtZero(handle, expectedSize) {
  const buffer = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return buffer.subarray(0, offset);
}

function sameBigIntFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function writeExclusive(preparedOutput, fileName, bytes) {
  await assertPreparedOutputStable(preparedOutput);
  const target = path.join(preparedOutput.projectRoot, fileName);
  relativeBindingPath(preparedOutput.projectRoot, target, "Candidate output file");
  let handle;
  let persistedBytes;
  try {
    handle = await open(target, "wx+");
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(target, { bigint: true }),
      realpath(target)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && sameBigIntFileIdentity(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(target),
      "STORAGE_V13_MATRIX_OUTPUT_FILE_INVALID",
      `Candidate output ${fileName} is not bound to the newly opened regular file.`
    );
    await assertPreparedOutputStable(preparedOutput);
    await handle.writeFile(bytes);
    await handle.sync();
    persistedBytes = await readOpenedFileAtZero(handle, bytes.byteLength);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(target, { bigint: true }),
      realpath(target)
    ]);
    requireCondition(
      sameBigIntFileIdentity(handleBefore, handleAfter)
        && sameBigIntFileIdentity(handleAfter, pathAfter)
        && handleAfter.size === BigInt(bytes.byteLength)
        && pathAfter.size === handleAfter.size
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedAfter) === comparablePath(target)
        && persistedBytes.byteLength === bytes.byteLength
        && persistedBytes.equals(bytes),
      "STORAGE_V13_MATRIX_OUTPUT_FILE_REBOUND",
      `Candidate output ${fileName} changed while it was written and read back.`
    );
    await assertPreparedOutputStable(preparedOutput);
  } finally {
    await handle?.close();
  }
  await assertPreparedOutputStable(preparedOutput);
  return Object.freeze({
    path: relativeBindingPath(preparedOutput.bindingRoot, target, "Candidate attachment"),
    size: persistedBytes.byteLength,
    sha256: sha256(persistedBytes)
  });
}

async function exactFilesystemBinding(identity, target, label, expectedKind, bindingRoot) {
  const [metadata, resolved] = await Promise.all([
    lstat(target, { bigint: true }),
    realpath(target)
  ]);
  requireCondition(
    (expectedKind === "directory" ? metadata.isDirectory() : metadata.isFile())
      && !metadata.isSymbolicLink()
      && metadata.ino !== 0n
      && comparablePath(resolved) === comparablePath(target)
      && sameExactFilesystemIdentity({
        realPath: path.resolve(resolved),
        dev: metadata.dev.toString(10),
        ino: metadata.ino.toString(10),
        birthtimeNs: metadata.birthtimeNs.toString(10)
      }, identity),
    "STORAGE_V13_MATRIX_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
    `${label} exact filesystem identity changed after the verified candidate snapshot.`
  );
  return Object.freeze({
    path: relativeBindingPath(bindingRoot, target, label),
    dev: metadata.dev.toString(10),
    ino: metadata.ino.toString(10),
    birthtimeNs: metadata.birthtimeNs.toString(10),
    metadata
  });
}

async function artifactIdentity(stableArtifact, preparedOutput) {
  const lock = stableArtifact.verificationSnapshot?.lock;
  const lockFile = stableArtifact.verificationSnapshot?.lockFile;
  const artifactRoot = stableArtifact.verificationSnapshot?.artifactRoot;
  const exactFilesystemIdentity = stableArtifact.storageV13ExactFilesystemIdentity;
  requireCondition(
    isRecord(lock)
      && isRecord(lockFile)
      && isRecord(artifactRoot)
      && isRecord(exactFilesystemIdentity)
      && isRecord(exactFilesystemIdentity.artifactRoot)
      && isRecord(exactFilesystemIdentity.identityLock)
      && SHA256_PATTERN.test(lock.manifestDigest ?? "")
      && SHA256_PATTERN.test(stableArtifact.artifactSetDigest ?? "")
      && SHA256_PATTERN.test(stableArtifact.lockDigest ?? "")
      && SHA256_PATTERN.test(lockFile.sha256 ?? "")
      && lock.artifactSetDigest === stableArtifact.artifactSetDigest
      && lock.lockDigest === stableArtifact.lockDigest
      && lock.buildVersion === stableArtifact.buildVersion
      && exactJson(lock.descriptor, stableArtifact.descriptor)
      && Number.isSafeInteger(lock.fileCount)
      && lock.fileCount > 0
      && Array.isArray(lock.files)
      && lock.files.length === lock.fileCount
      && sha256(canonicalJson(lock.files)) === stableArtifact.artifactSetDigest
      && isRecord(stableArtifact.pwaManifest)
      && isRecord(stableArtifact.serviceWorker)
      && Number.isSafeInteger(lockFile.size)
      && lockFile.size > 0
      && lockFile.nlink === 1,
    "STORAGE_V13_MATRIX_ARTIFACT_IDENTITY_INVALID",
    "Verified locked artifact projection is incomplete."
  );
  for (const [identity, label] of [[artifactRoot, "Artifact root"], [lockFile, "Artifact identity lock"]]) {
    requireCondition(
      typeof identity.realPath === "string",
      "STORAGE_V13_MATRIX_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
      `${label} filesystem identity is incomplete.`
    );
  }
  const artifactRootBinding = await exactFilesystemBinding(
    exactFilesystemIdentity.artifactRoot,
    artifactRoot.realPath,
    "Artifact root",
    "directory",
    preparedOutput.bindingRoot
  );
  const identityLockBinding = await exactFilesystemBinding(
    exactFilesystemIdentity.identityLock,
    lockFile.realPath,
    "Artifact identity lock",
    "file",
    preparedOutput.bindingRoot
  );
  requireCondition(
    identityLockBinding.metadata.nlink === 1n
      && identityLockBinding.metadata.size === BigInt(lockFile.size),
    "STORAGE_V13_MATRIX_ARTIFACT_FILESYSTEM_IDENTITY_INVALID",
    "Artifact identity lock link count or size changed."
  );
  const stripMetadata = ({ metadata: ignored, ...binding }) => binding;
  return Object.freeze({
    releaseEvidenceId: stableArtifact.releaseEvidenceId,
    buildVersion: stableArtifact.buildVersion,
    manifestDigest: lock.manifestDigest,
    artifactSetDigest: stableArtifact.artifactSetDigest,
    lockDigest: stableArtifact.lockDigest,
    descriptor: Object.freeze({ ...stableArtifact.descriptor }),
    pwaManifest: Object.freeze({ ...stableArtifact.pwaManifest }),
    serviceWorker: Object.freeze({ ...stableArtifact.serviceWorker }),
    fileCount: lock.fileCount,
    files: Object.freeze(lock.files.map((entry) => Object.freeze({ ...entry }))),
    artifactRoot: Object.freeze(stripMetadata(artifactRootBinding)),
    identityLock: Object.freeze({
      ...stripMetadata(identityLockBinding),
      nlink: lockFile.nlink,
      size: lockFile.size,
      sha256: lockFile.sha256
    })
  });
}

function artifactVerificationProjection(value) {
  return {
    releaseEvidenceId: value?.releaseEvidenceId,
    descriptor: value?.descriptor,
    buildVersion: value?.buildVersion,
    artifactSetDigest: value?.artifactSetDigest,
    pwaManifest: value?.pwaManifest,
    serviceWorker: value?.serviceWorker,
    lockDigest: value?.lockDigest,
    verificationSnapshot: value?.verificationSnapshot,
    storageV13ExactFilesystemIdentity: value?.storageV13ExactFilesystemIdentity
  };
}

function validatePageIdentity(pageIdentity, artifact) {
  requireCondition(
    isRecord(pageIdentity)
      && pageIdentity.appBootReady === "true"
      && pageIdentity.dbGeneration === "legacy-v13"
      && pageIdentity.dbSchema === "13"
      && pageIdentity.evidenceId === artifact.releaseEvidenceId
      && pageIdentity.buildVersion === artifact.buildVersion
      && exactJson(pageIdentity.descriptor, artifact.descriptor),
    "STORAGE_V13_MATRIX_PAGE_IDENTITY_INVALID",
    "Browser page identity does not match the verified locked default-v13 artifact."
  );
  return Object.freeze({
    appBootReady: pageIdentity.appBootReady,
    dbGeneration: pageIdentity.dbGeneration,
    dbSchema: pageIdentity.dbSchema,
    evidenceId: pageIdentity.evidenceId,
    buildVersion: pageIdentity.buildVersion,
    descriptor: Object.freeze({ ...pageIdentity.descriptor })
  });
}

function parseWriterCandidateEnvironment(candidateEnvironment) {
  const keys = [
    "origin",
    "outputRoot",
    "bindingRoot",
    "artifactRoot",
    "artifactLock",
    "releaseEvidenceId",
    "runId",
    "attemptId"
  ];
  requireCondition(
    exactKeys(candidateEnvironment, keys),
    "STORAGE_V13_MATRIX_WRITER_ENVIRONMENT_INVALID",
    "Writer candidate environment must contain the exact eight parsed fields."
  );
  return parseStorageV13MatrixCandidateEnvironment({
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.origin]: candidateEnvironment.origin,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.outputRoot]: candidateEnvironment.outputRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.bindingRoot]: candidateEnvironment.bindingRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactRoot]: candidateEnvironment.artifactRoot,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.artifactLock]: candidateEnvironment.artifactLock,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.releaseEvidenceId]: candidateEnvironment.releaseEvidenceId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.runId]: candidateEnvironment.runId,
    [STORAGE_V13_MATRIX_ENVIRONMENT_KEYS.attemptId]: candidateEnvironment.attemptId
  });
}

function assertWriterScope({
  cwd,
  preparedOutput,
  candidate,
  runId,
  projectName,
  initialArtifact,
  initialAttemptMarker
}) {
  const expectedOutputRoot = path.join(
    candidate.bindingRoot,
    "tmp",
    "storage-v13-matrix-candidate",
    candidate.runId
  );
  const expectedProjectRoot = path.join(expectedOutputRoot, projectName);
  requireCondition(
    comparablePath(cwd) === comparablePath(candidate.bindingRoot)
      && candidate.runId === runId
      && comparablePath(candidate.outputRoot) === comparablePath(expectedOutputRoot)
      && comparablePath(preparedOutput.bindingRoot) === comparablePath(candidate.bindingRoot)
      && comparablePath(preparedOutput.outputRoot) === comparablePath(candidate.outputRoot)
      && comparablePath(preparedOutput.projectRoot) === comparablePath(expectedProjectRoot)
      && comparablePath(preparedOutput.projectReal) === comparablePath(expectedProjectRoot)
      && exactJson(preparedOutput.attemptMarker, initialAttemptMarker)
      && initialArtifact?.releaseEvidenceId === candidate.releaseEvidenceId
      && comparablePath(initialArtifact?.verificationSnapshot?.artifactRoot?.realPath ?? "")
        === comparablePath(candidate.artifactRoot)
      && comparablePath(initialArtifact?.verificationSnapshot?.lockFile?.realPath ?? "")
        === comparablePath(candidate.artifactLock),
    "STORAGE_V13_MATRIX_WRITER_SCOPE_INVALID",
    "Writer cwd, run id, output root, project root, artifact, and identity lock must bind one parsed candidate environment."
  );
}

export async function writeStorageV13MatrixBrowserCandidate({
  cwd = process.cwd(),
  candidateEnvironment,
  preparedOutput,
  runId,
  targetOrigin,
  initialArtifact,
  finalArtifact,
  projectName,
  browserChannel,
  actualProduct,
  pageIdentity,
  operationObservations,
  deferredBoundaries,
  unexpectedExternalRequestCount,
  startedAt,
  completedAt
}) {
  const candidate = parseWriterCandidateEnvironment(immutableJsonSnapshot(candidateEnvironment));
  const frozenInitialArtifact = immutableJsonSnapshot(initialArtifact);
  const frozenFinalArtifact = immutableJsonSnapshot(finalArtifact);
  const frozenPageInput = immutableJsonSnapshot(pageIdentity);
  const frozenOperationInput = immutableJsonSnapshot(operationObservations);
  const frozenDeferredInput = immutableJsonSnapshot(deferredBoundaries);
  const initialAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
  requireCondition(
    PROJECT_NAMES.includes(projectName)
      && preparedOutput?.projectName === projectName
      && browserChannel === projectName
      && (projectName === "msedge"
        ? /^Edg\/\d+(?:\.\d+)+$/u.test(actualProduct ?? "")
        : /^Chrome\/\d+(?:\.\d+)+$/u.test(actualProduct ?? ""))
      && typeof runId === "string"
      && CANONICAL_ID_PATTERN.test(runId),
    "STORAGE_V13_MATRIX_BROWSER_TUPLE_INVALID",
    "Browser project, channel, product, output, or run id is invalid."
  );
  assertWriterScope({
    cwd: path.resolve(cwd),
    preparedOutput,
    candidate,
    runId,
    projectName,
    initialArtifact: frozenInitialArtifact,
    initialAttemptMarker
  });
  const parsedOrigin = new URL(targetOrigin);
  requireCondition(
    parsedOrigin.protocol === "https:"
      && parsedOrigin.origin === targetOrigin
      && parsedOrigin.username === ""
      && parsedOrigin.password === ""
      && parsedOrigin.port === ""
      && parsedOrigin.pathname === "/"
      && parsedOrigin.search === ""
      && parsedOrigin.hash === ""
      && /^[A-Za-z0-9.-]+$/u.test(parsedOrigin.hostname)
      && candidate.origin === targetOrigin,
    "STORAGE_V13_MATRIX_ORIGIN_INVALID",
    "Candidate target origin must remain a canonical HTTPS origin."
  );
  requireCondition(
    unexpectedExternalRequestCount === 0,
    "STORAGE_V13_MATRIX_EXTERNAL_REQUEST_OBSERVED",
    "Candidate browser matrix observed an unexpected external request."
  );
  const started = requireCanonicalTimestamp(startedAt, "startedAt");
  const completed = requireCanonicalTimestamp(completedAt, "completedAt");
  requireCondition(started <= completed, "STORAGE_V13_MATRIX_INTERVAL_INVALID", "Run interval is reversed.");

  const governance = await loadStorageV13MatrixGovernanceBindings(candidate.bindingRoot);
  const suppliedStableArtifact = assertExactArtifactIdentityStable(
    frozenInitialArtifact,
    frozenFinalArtifact
  );
  const preWriteArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(
    candidate,
    frozenInitialArtifact
  );
  assertExactArtifactIdentityStable(suppliedStableArtifact, preWriteArtifact);
  const initialVerificationDigest = sha256(
    canonicalJson(artifactVerificationProjection(frozenInitialArtifact))
  );
  const frozenArtifact = await artifactIdentity(preWriteArtifact, preparedOutput);
  const frozenPageIdentity = validatePageIdentity(frozenPageInput, preWriteArtifact);
  const operations = validateObservedOperations(frozenOperationInput, governance.policy.document);
  const deferred = validateDeferredBoundaries(frozenDeferredInput, governance.policy.document);
  const preWriteVerificationDigest = sha256(
    canonicalJson(artifactVerificationProjection(preWriteArtifact))
  );
  requireCondition(
    initialVerificationDigest === preWriteVerificationDigest,
    "STORAGE_V13_MATRIX_ARTIFACT_IDENTITY_REBOUND",
    "Initial and pre-write complete artifact verification projections differ."
  );

  const orderedCaptures = operations.flatMap((operation) => operation.captures);
  requireCondition(
    orderedCaptures.length === 16,
    "STORAGE_V13_MATRIX_CAPTURE_SET_INVALID",
    "Candidate must contain the exact 16 native readonly v2 captures."
  );
  const captureIds = new Set();
  let previousCapturedAt = started;
  orderedCaptures.forEach((capture, index) => {
    const expectedCaptureId = `${runId}-${projectName}-${String(index + 1).padStart(2, "0")}`;
    requireCondition(
      capture.captureId === expectedCaptureId && !captureIds.has(capture.captureId),
      "STORAGE_V13_MATRIX_CAPTURE_REUSED",
      `Capture id ${capture.captureId} is reused or does not match ${expectedCaptureId}.`
    );
    captureIds.add(capture.captureId);
    const capturedAt = requireCanonicalTimestamp(capture.capturedAt, `${capture.captureId} capturedAt`);
    requireCondition(
      capturedAt >= previousCapturedAt && capturedAt <= completed,
      "STORAGE_V13_MATRIX_CAPTURE_INTERVAL_INVALID",
      `Capture ${capture.captureId} is outside the ordered run interval.`
    );
    previousCapturedAt = capturedAt;
  });

  const publishedOperations = [];
  for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
    const operation = operations[operationIndex];
    const captureBindings = [];
    for (let captureIndex = 0; captureIndex < operation.captures.length; captureIndex += 1) {
      const capture = operation.captures[captureIndex];
      const fileName = `${String(operationIndex + 1).padStart(2, "0")}-${operation.operationId}-${String(captureIndex + 1).padStart(2, "0")}-${capture.phase}.json`;
      const binding = await writeExclusive(preparedOutput, fileName, jsonBytes(capture));
      captureBindings.push(Object.freeze({
        phase: capture.phase,
        captureId: capture.captureId,
        snapshotDigest: capture.snapshotDigest,
        ...binding
      }));
    }
    publishedOperations.push(Object.freeze({
      operationId: operation.operationId,
      status: operation.status,
      uiPath: operation.uiPath,
      observationMethod: operation.observationMethod,
      captures: Object.freeze(captureBindings),
      download: Object.freeze({ ...operation.download }),
      backup: operation.backup === null
        ? null
        : Object.freeze({
            ...operation.backup,
            logicalPartitionNames: Object.freeze([...operation.backup.logicalPartitionNames]),
            counts: Object.freeze({ ...operation.backup.counts }),
            sharedPartitionContentDigests: Object.freeze({
              ...operation.backup.sharedPartitionContentDigests
            })
          }),
      safetyBackup: operation.safetyBackup === null
        ? null
        : Object.freeze({
            ...operation.safetyBackup,
            logicalPartitionNames: Object.freeze([...operation.safetyBackup.logicalPartitionNames]),
            counts: Object.freeze({ ...operation.safetyBackup.counts }),
            sharedPartitionContentDigests: Object.freeze({
              ...operation.safetyBackup.sharedPartitionContentDigests
            })
          })
    }));
  }

  const postWriteArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(
    candidate,
    preWriteArtifact
  );
  const postWriteFrozenArtifact = await artifactIdentity(postWriteArtifact, preparedOutput);
  requireCondition(
    exactJson(postWriteFrozenArtifact, frozenArtifact),
    "STORAGE_V13_MATRIX_ARTIFACT_IDENTITY_REBOUND",
    "Locked artifact filesystem identity changed while candidate attachments were written."
  );
  const finalAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
  assertStorageV13MatrixCandidateAttemptMarkerStable(initialAttemptMarker, finalAttemptMarker);
  const finalVerificationDigest = sha256(
    canonicalJson(artifactVerificationProjection(postWriteArtifact))
  );
  requireCondition(
    initialVerificationDigest === finalVerificationDigest,
    "STORAGE_V13_MATRIX_ARTIFACT_IDENTITY_REBOUND",
    "Initial and post-write complete artifact verification projections differ."
  );

  const receiptId = `${runId}-${projectName}`;
  requireCondition(
    CANONICAL_ID_PATTERN.test(receiptId),
    "STORAGE_V13_MATRIX_RECEIPT_ID_INVALID",
    "Derived candidate receipt id is invalid."
  );
  const document = {
    schemaVersion: 2,
    receiptType: "storage_v13_browser_matrix_receipt_candidate_v2",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    matrixComplete: false,
    strictGatePassed: false,
    receiptId,
    projectName,
    browserChannel,
    actualProduct,
    targetOrigin,
    attemptMarker: { ...finalAttemptMarker.binding },
    releaseIdentity: {
      channel: "default-v13",
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    capabilities: { ...STORAGE_V13_MATRIX_CAPABILITIES },
    policyBindings: [
      {
        role: "storage-v13-matrix-candidate-policy",
        path: governance.policy.path,
        size: governance.policy.size,
        sha256: governance.policy.sha256,
        canonicalSha256: governance.policy.canonicalSha256
      },
      {
        role: "formal-release-decisions-id-exclusion",
        ...governance.releaseDecisions
      }
    ],
    artifactIdentity: frozenArtifact,
    artifactStability: {
      initialVerificationDigest,
      finalVerificationDigest,
      stable: true
    },
    pageIdentity: frozenPageIdentity,
    operationObservations: Object.freeze(publishedOperations),
    deferredBoundaries: deferred,
    unexpectedExternalRequestCount: 0,
    authority: { ...STORAGE_V13_MATRIX_AUTHORITY },
    receiptDigest: "0".repeat(64),
    startedAt,
    completedAt
  };
  document.receiptDigest = receiptDigest(document);
  const receiptBytes = jsonBytes(document);
  const receiptBinding = await writeExclusive(preparedOutput, "browser-receipt.json", receiptBytes);
  const terminalAttemptMarker = await loadStorageV13MatrixCandidateAttemptMarker(candidate);
  assertStorageV13MatrixCandidateAttemptMarkerStable(finalAttemptMarker, terminalAttemptMarker);
  return Object.freeze({
    receiptPath: path.join(preparedOutput.projectRoot, "browser-receipt.json"),
    receiptBinding,
    document: Object.freeze(document)
  });
}
