import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadVerifiedProviderDeploymentCandidateOutput,
  parseProviderDeploymentCandidateLoaderJsonBytes,
  PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_ID,
  PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH
} from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_PATH =
  "docs/release/provider-deployment-candidate-sequence-v1.schema.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/provider-deployment-candidate-sequence-v1.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME =
  "provider-deployment-candidate-sequence-receipt.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS = Object.freeze({
  bindingRoot: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_BINDING_ROOT",
  deployOutputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_DEPLOY_OUTPUT_ROOT",
  deployReceiptPath: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_DEPLOY_RECEIPT",
  restoreOutputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_RESTORE_OUTPUT_ROOT",
  restoreReceiptPath: "HAKIMI_PROVIDER_DEPLOYMENT_SEQUENCE_RESTORE_RECEIPT"
});

const RECEIPT_FILE_NAME = "provider-deployment-candidate-receipt.json";
const FIXED_FILE_NAMES = Object.freeze({
  receipt: RECEIPT_FILE_NAME,
  "terminal-commit": "provider-deployment-candidate-receipt-commit.sha256",
  "raw-action-response": "raw-action-response.json",
  "raw-final-readback": "raw-final-readback.json",
  "synthetic-normalized-projection": "synthetic-normalized-projection.json",
  "artifact-initial": "artifact-initial.json",
  "artifact-final": "artifact-final.json"
});
const FIXED_FILE_ROLES = Object.freeze(Object.keys(FIXED_FILE_NAMES));
const EXPECTED_OUTPUT_NAMES = Object.freeze(Object.values(FIXED_FILE_NAMES).sort());
const HOSTING_POLICY_PATH = "docs/security/hosting-security-policy.json";
const HOSTING_POLICY_ID = "hakimi-web-public-hosting-baseline-v2";
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const DEFAULT_DESCRIPTOR = Object.freeze({
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
const EXPECTED_CANDIDATE_RESULT_KEYS = Object.freeze([
  "verificationKind", "candidateOutputIntegrityVerified", "trustClass", "admissionStatus",
  "receiptId", "receiptDigest", "artifactSetDigest", "releaseEvidenceId", "recordedArtifactProjection",
  "terminalGateBinding", "gates", "attempts", "authorizationBoundary", "claims", "document"
]);
const EXPECTED_CANDIDATE_GATES = Object.freeze({
  schemaValidated: true,
  receiptDigestRecomputed: true,
  attachmentSetDigestRecomputed: true,
  terminalCommitMarkerVerified: true,
  fixedOutputSetBound: true,
  physicalFileIdentityBound: true,
  rawCredentialScanPassed: true,
  projectionCrossBindingVerified: true,
  artifactSnapshotCrossBindingVerified: true,
  rawProjectionDerivationVerified: false,
  providerAuthenticatedReceiptVerified: false
});
const EXPECTED_CANDIDATE_ATTEMPTS = Object.freeze({
  networkAttempted: false,
  deploymentAttempted: false,
  rollbackAttempted: false
});
const EXPECTED_CANDIDATE_AUTHORIZATION = Object.freeze({
  externalDeploymentExecutionAuthorized: false,
  rollbackExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  authorizationMayNotBeDerivedFromCandidateEvidence: true
});
const EXPECTED_CANDIDATE_CLAIMS = Object.freeze({
  networkObserved: false,
  providerAuthenticated: false,
  deploymentOperationObserved: false,
  rollbackObserved: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false
});

function fail(code, message, cause) {
  throw new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
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

function requireAbsoluteCanonicalPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || !path.isAbsolute(value)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", `${label} must be an explicit absolute path.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", `${label} must use its exact resolved filesystem spelling.`);
  }
  return resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", `${key} must be explicit and free of surrounding whitespace.`);
  }
  return value;
}

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", `${label} must be a strict descendant of its root.`);
  return relative.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function assertFixedReceiptPath(outputRoot, receiptPath, label) {
  relativeBoundPath(outputRoot, receiptPath, label);
  if (comparablePath(receiptPath) !== comparablePath(path.join(outputRoot, RECEIPT_FILE_NAME))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_RECEIPT_PATH_INVALID", `${label} must be the fixed ${RECEIPT_FILE_NAME}.`);
  }
}

export function parseProviderDeploymentCandidateSequenceInput(input) {
  if (!exactKeys(input, [
    "bindingRoot", "deployOutputRoot", "deployReceiptPath", "restoreOutputRoot", "restoreReceiptPath"
  ])) fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", "Sequence input must have the exact five path fields.");
  const bindingRoot = requireAbsoluteCanonicalPath(input.bindingRoot, "Binding root");
  const deployOutputRoot = requireAbsoluteCanonicalPath(input.deployOutputRoot, "Deploy output root");
  const deployReceiptPath = requireAbsoluteCanonicalPath(input.deployReceiptPath, "Deploy receipt path");
  const restoreOutputRoot = requireAbsoluteCanonicalPath(input.restoreOutputRoot, "Restore output root");
  const restoreReceiptPath = requireAbsoluteCanonicalPath(input.restoreReceiptPath, "Restore receipt path");
  relativeBoundPath(bindingRoot, deployOutputRoot, "Deploy output root");
  relativeBoundPath(bindingRoot, restoreOutputRoot, "Restore output root");
  assertFixedReceiptPath(deployOutputRoot, deployReceiptPath, "Deploy receipt path");
  assertFixedReceiptPath(restoreOutputRoot, restoreReceiptPath, "Restore receipt path");
  if (pathsOverlap(deployOutputRoot, restoreOutputRoot) || pathsOverlap(restoreOutputRoot, deployOutputRoot)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_PACKAGE_ROOT_OVERLAP", "Deploy and restore output roots must be disjoint in both directions.");
  }
  return Object.freeze({ bindingRoot, deployOutputRoot, deployReceiptPath, restoreOutputRoot, restoreReceiptPath });
}

export function parseProviderDeploymentCandidateSequenceEnvironment(environment = process.env) {
  if (!isRecord(environment)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID", "Sequence environment must be an object.");
  }
  return parseProviderDeploymentCandidateSequenceInput({
    bindingRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS.bindingRoot),
    deployOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS.deployOutputRoot),
    deployReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS.deployReceiptPath),
    restoreOutputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS.restoreOutputRoot),
    restoreReceiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_ENVIRONMENT_KEYS.restoreReceiptPath)
  });
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.realPath === right.realPath;
}

async function captureDirectoryLock(directoryPath, label) {
  let metadata;
  let resolved;
  try {
    metadata = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ROOT_REBOUND", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_PATH_ALIAS", `${label} must be a real directory with filesystem identity.`);
  }
  if (comparablePath(resolved) !== comparablePath(directoryPath)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_PATH_ALIAS", `${label} must not resolve through an aliased parent path.`);
  }
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs,
    realPath: comparablePath(resolved)
  });
}

async function assertDirectoryLock(directoryPath, lock, label) {
  const current = await captureDirectoryLock(directoryPath, label);
  if (!sameDirectoryIdentity(lock, current)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ROOT_REBOUND", `${label} changed during sequence verification.`);
  }
}

async function assertNoAliases(bindingRoot, candidate, label) {
  const relative = relativeBoundPath(bindingRoot, candidate, label);
  let current = bindingRoot;
  for (const segment of relative.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_PATH_ALIAS", `${label} cannot be inspected.`, error);
    }
    if (metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_PATH_ALIAS", `${label} cannot traverse a symlink or junction.`);
    }
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function readOpenedFileBoundedAtZero(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.byteLength) {
    const { bytesRead } = await handle.read(target, offset, target.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function openHeldFile({
  input,
  filePath,
  label,
  bindingLock,
  scopePath,
  scopeLock
}) {
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(scopePath, scopeLock, `${label} scope root`)
  ]);
  await assertNoAliases(input.bindingRoot, filePath, label);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_UNSAFE", `${label} could not be opened.`, error);
  }
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    if (
      !before.isFile()
      || before.ino === 0n
      || before.nlink !== 1n
      || before.size <= 0n
      || before.size > BigInt(MAX_JSON_BYTES)
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.nlink !== 1n
      || !sameFileIdentity(before, pathBefore)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_UNSAFE", `${label} must be a bounded single-link regular file.`);
    relativeBoundPath(scopeLock.realPath, resolvedBefore, `${label} resolved path`);
    const bytes = await readOpenedFileBoundedAtZero(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    if (
      !sameFileIdentity(before, after)
      || !sameFileIdentity(after, pathAfter)
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || after.size !== pathAfter.size
      || after.mtimeNs !== pathAfter.mtimeNs
      || after.ctimeNs !== pathAfter.ctimeNs
      || after.nlink !== 1n
      || pathAfter.nlink !== 1n
      || pathAfter.isSymbolicLink()
      || comparablePath(resolvedBefore) !== comparablePath(resolvedAfter)
      || bytes.byteLength !== Number(before.size)
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND", `${label} changed during its initial held-file read.`);
    return {
      handle,
      filePath,
      label,
      scopePath,
      scopeLock,
      metadata: after,
      resolvedPath: comparablePath(resolvedAfter),
      bytes,
      binding: Object.freeze({
        path: relativeBoundPath(input.bindingRoot, filePath, `${label} binding`),
        size: bytes.byteLength,
        sha256: sha256(bytes)
      }),
      identity: Object.freeze({
        dev: String(after.dev),
        ino: String(after.ino),
        realPath: comparablePath(resolvedAfter)
      })
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldFileStable(input, bindingLock, held) {
  const bytes = await readOpenedFileBoundedAtZero(held.handle, Number(held.metadata.size));
  const [after, pathAfter, resolvedAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.filePath, { bigint: true }),
    realpath(held.filePath)
  ]);
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(held.scopePath, held.scopeLock, `${held.label} scope root`)
  ]);
  if (
    !sameFileIdentity(held.metadata, after)
    || !sameFileIdentity(after, pathAfter)
    || held.metadata.size !== after.size
    || held.metadata.mtimeNs !== after.mtimeNs
    || held.metadata.ctimeNs !== after.ctimeNs
    || after.size !== pathAfter.size
    || after.mtimeNs !== pathAfter.mtimeNs
    || after.ctimeNs !== pathAfter.ctimeNs
    || after.nlink !== 1n
    || pathAfter.nlink !== 1n
    || pathAfter.isSymbolicLink()
    || held.resolvedPath !== comparablePath(resolvedAfter)
    || bytes.byteLength !== held.bytes.byteLength
    || sha256(bytes) !== held.binding.sha256
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND", `${held.label} changed during the unified two-package epoch.`);
}

async function assertExactOutputNames(outputRoot, label) {
  const names = (await readdir(outputRoot)).sort();
  if (canonicalJson(names) !== canonicalJson(EXPECTED_OUTPUT_NAMES)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_OUTPUT_SET_INVALID", `${label} must contain exactly the seven fixed candidate files, including the terminal commit marker.`);
  }
}

function assertGloballyDistinctFiles(heldFiles) {
  const inodeIdentities = heldFiles.map((held) => `${held.identity.dev}:${held.identity.ino}`);
  const realPaths = heldFiles.map((held) => held.identity.realPath);
  if (new Set(inodeIdentities).size !== heldFiles.length || new Set(realPaths).size !== heldFiles.length) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_IDENTITY_REUSED", "Every package and checked-source file must have a distinct physical identity.");
  }
}

function assertDefaultDescriptor(value, label) {
  if (canonicalJson(value) !== canonicalJson(DEFAULT_DESCRIPTOR)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ARTIFACT_RELATION_INVALID", `${label} is not exact default-v13.`);
  }
}

function assertCurrentPolicy(policy) {
  if (!exactKeys(policy, [
    "schemaVersion", "policyId", "deploymentPlatform", "canonicalOrigin", "cspEnforcementStatus", "headers",
    "cacheRules", "documentRoutes", "releaseEvidencePath", "nonPublicArtifactPaths", "contentTypes",
    "redirectRules", "publicReleaseGate"
  ])
    || policy.schemaVersion !== 2
    || policy.policyId !== HOSTING_POLICY_ID
    || policy.deploymentPlatform !== "unselected"
    || policy.canonicalOrigin !== null
    || policy.cspEnforcementStatus !== "report_only_until_real_host_validation"
    || policy.publicReleaseGate?.httpsRequired !== true
    || policy.publicReleaseGate?.realHostHeadersVerified !== false
    || policy.publicReleaseGate?.cspBlockingModeVerified !== false
    || policy.publicReleaseGate?.unnecessaryThirdPartyScriptsAllowed !== false) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_POLICY_OR_SCHEMA_REBOUND", "Current hosting policy is not the closed v2 source.");
  }
}

function assertCandidateResultBoundary(result, role) {
  const projection = result?.recordedArtifactProjection;
  const identity = result?.document?.artifactIdentity;
  if (
    !exactKeys(result, EXPECTED_CANDIDATE_RESULT_KEYS)
    || result.verificationKind !== "offline-independent-provider-deployment-candidate-output-v1"
    || result.candidateOutputIntegrityVerified !== true
    || result?.trustClass !== "untrusted_candidate"
    || result?.admissionStatus !== "not_admitted"
    || canonicalJson(result.gates) !== canonicalJson(EXPECTED_CANDIDATE_GATES)
    || canonicalJson(result.attempts) !== canonicalJson(EXPECTED_CANDIDATE_ATTEMPTS)
    || canonicalJson(result.authorizationBoundary) !== canonicalJson(EXPECTED_CANDIDATE_AUTHORIZATION)
    || canonicalJson(result.claims) !== canonicalJson(EXPECTED_CANDIDATE_CLAIMS)
    || !exactKeys(result.terminalGateBinding, ["path", "size", "sha256", "commitsReceiptSha256"])
    || !result.terminalGateBinding.path.endsWith("/provider-deployment-candidate-receipt-commit.sha256")
    || result.terminalGateBinding.size !== 65
    || !/^[a-f0-9]{64}$/u.test(result.terminalGateBinding.sha256)
    || !/^[a-f0-9]{64}$/u.test(result.terminalGateBinding.commitsReceiptSha256)
    || !exactKeys(projection, [
      "expectationKind", "evidenceId", "artifactSetDigest", "descriptor", "releaseIdentity",
      "policyBinding", "artifactIdentityLockBinding", "releaseEvidence", "artifacts", "lockedBytes"
    ])
    || projection.expectationKind !== "schema-validated-release-evidence-expectation-v1"
    || projection.evidenceId !== result.releaseEvidenceId
    || projection.evidenceId !== identity?.releaseEvidenceId
    || projection.artifactSetDigest !== result.artifactSetDigest
    || projection.artifactSetDigest !== identity?.artifactSetDigest
    || canonicalJson(projection.descriptor) !== canonicalJson(identity?.descriptor)
    || projection.releaseIdentity?.evidenceId !== identity?.releaseEvidenceId
    || projection.releaseIdentity?.buildVersion !== identity?.buildVersion
    || projection.policyBinding?.path !== identity?.hostingPolicy?.path
    || projection.policyBinding?.policyId !== identity?.hostingPolicy?.policyId
    || projection.policyBinding?.sha256 !== identity?.hostingPolicy?.sha256
    || projection.policyBinding?.canonicalSha256 !== identity?.hostingPolicy?.canonicalSha256
    || projection.artifactIdentityLockBinding?.path !== identity?.identityLock?.path
    || projection.artifactIdentityLockBinding?.sha256 !== identity?.identityLock?.sha256
    || projection.artifactIdentityLockBinding?.lockDigest !== identity?.identityLock?.lockDigest
    || projection.artifactIdentityLockBinding?.artifactSetDigest !== identity?.artifactSetDigest
    || projection.releaseEvidence?.size !== identity?.releaseEvidence?.size
    || projection.releaseEvidence?.sha256 !== identity?.releaseEvidence?.sha256
    || sha256(canonicalJson(projection)) !== identity?.expectationDigest
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_AUTHORITY_BOUNDARY_INVALID", `${role} package promoted an untrusted candidate boundary.`);
}

function packageFromHeld({ role, input, heldByKey, result }) {
  const root = role === "deploy" ? input.deployOutputRoot : input.restoreOutputRoot;
  const heldFixedFiles = Object.fromEntries(FIXED_FILE_ROLES.map((fileRole) => [
    fileRole,
    heldByKey.get(`${role}:${fileRole}`).binding
  ]));
  const receipt = heldFixedFiles.receipt;
  const heldTerminalCommit = heldFixedFiles["terminal-commit"];
  if (
    canonicalJson(heldTerminalCommit) !== canonicalJson({
      path: result.terminalGateBinding.path,
      size: result.terminalGateBinding.size,
      sha256: result.terminalGateBinding.sha256
    })
    || result.terminalGateBinding.commitsReceiptSha256 !== receipt.sha256
  ) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_TERMINAL_GATE_BINDING_INVALID",
      `${role} terminal commit marker is not bound to the held raw receipt bytes.`
    );
  }
  const fixedFiles = Object.freeze({
    ...heldFixedFiles,
    "terminal-commit": Object.freeze({
      path: heldTerminalCommit.path,
      size: heldTerminalCommit.size,
      sha256: heldTerminalCommit.sha256,
      commitsReceiptSha256: receipt.sha256
    })
  });
  const unsigned = {
    role,
    action: result.document.candidateScope.action,
    rootPath: relativeBoundPath(input.bindingRoot, root, `${role} root binding`),
    receipt,
    receiptId: result.document.receiptId,
    receiptDigest: result.document.receiptDigest,
    attachmentSetDigest: result.document.attachmentSetDigest,
    operationId: result.document.operation.operationId,
    fixedFiles
  };
  return Object.freeze({ ...unsigned, packageDigest: sha256(canonicalJson(unsigned)) });
}

function artifactCandidate(document) {
  return Object.freeze({
    releaseEvidenceId: document.artifactIdentity.releaseEvidenceId,
    buildVersion: document.artifactIdentity.buildVersion,
    artifactSetDigest: document.artifactIdentity.artifactSetDigest,
    identityLockDigest: document.artifactIdentity.identityLock.lockDigest,
    expectationDigest: document.artifactIdentity.expectationDigest,
    releaseEvidenceSha256: document.artifactIdentity.releaseEvidence.sha256
  });
}

function assertPackageHeldBindings(role, heldByKey, result) {
  const receiptHeld = heldByKey.get(`${role}:receipt`);
  const receiptDocument = parseProviderDeploymentCandidateLoaderJsonBytes(receiptHeld.bytes, `${role} held receipt`);
  if (canonicalJson(receiptDocument) !== canonicalJson(result.document)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND", `${role} held receipt differs from the independently loaded document.`);
  }
  const terminalCommitHeld = heldByKey.get(`${role}:terminal-commit`);
  if (
    canonicalJson(terminalCommitHeld.binding) !== canonicalJson({
      path: result.terminalGateBinding.path,
      size: result.terminalGateBinding.size,
      sha256: result.terminalGateBinding.sha256
    })
    || result.terminalGateBinding.commitsReceiptSha256 !== receiptHeld.binding.sha256
  ) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND",
      `${role} terminal commit marker differs from the independently loaded binding.`
    );
  }
  for (const attachmentRole of FIXED_FILE_ROLES.filter(
    (fileRole) => !["receipt", "terminal-commit"].includes(fileRole)
  )) {
    const heldBinding = heldByKey.get(`${role}:${attachmentRole}`).binding;
    const recorded = result.document.attachments[attachmentRole];
    if (
      recorded.path !== heldBinding.path
      || recorded.size !== heldBinding.size
      || recorded.sha256 !== heldBinding.sha256
      || recorded.mediaType !== "application/json"
    ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND", `${role} ${attachmentRole} differs from the unified epoch binding.`);
  }
}

function buildSequenceDocument({ input, deployResult, restoreResult, heldByKey, checkedSources, currentPolicy }) {
  assertCandidateResultBoundary(deployResult, "Deploy");
  assertCandidateResultBoundary(restoreResult, "Restore");
  const deploy = deployResult.document;
  const restore = restoreResult.document;
  if (deploy.candidateScope.action !== "deploy_candidate" || restore.candidateScope.action !== "restore_baseline") {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ACTION_ORDER_INVALID", "Packages must be ordered deploy_candidate then restore_baseline.");
  }
  const scopeKeys = ["provider", "accountId", "projectId", "environment", "origin"];
  if (scopeKeys.some((key) => deploy.candidateScope[key] !== restore.candidateScope[key])) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_SCOPE_MISMATCH", "Deploy and restore provider scope must be exact.");
  }
  if (deploy.adapter.adapterId !== restore.adapter.adapterId
    || deploy.adapter.adapterVersion !== restore.adapter.adapterVersion) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ADAPTER_MISMATCH", "Deploy and restore must use one exact synthetic adapter identity.");
  }
  if (deploy.receiptId === restore.receiptId) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_DEPLOYMENT_CHAIN_INVALID", "Deploy and restore receipt ids must be distinct.");
  }
  if (deploy.operation.operationId === restore.operation.operationId) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_OPERATION_ID_REUSED", "Deploy and restore operation ids must be distinct.");
  }
  const baselineAId = deploy.operation.beforeActiveDeploymentId;
  const candidateBId = deploy.operation.resultActiveDeploymentId;
  if (
    baselineAId === null
    || deploy.operation.sequenceEligible !== true
    || baselineAId === candidateBId
    || restore.operation.beforeActiveDeploymentId !== candidateBId
    || restore.operation.requestedTargetDeploymentId !== baselineAId
    || restore.operation.resultActiveDeploymentId !== baselineAId
    || restore.operation.resultDerivation !== "activated_requested"
    || restore.operation.derivedFromDeploymentId !== null
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_DEPLOYMENT_CHAIN_INVALID", "Candidate deployment ids are not an exact synthetic A to B to A relation.");
  if (deploy.candidateScope.immutableDeploymentUrl === restore.candidateScope.immutableDeploymentUrl) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_IMMUTABLE_URL_CHAIN_INVALID", "A and B immutable deployment URLs must be distinct.");
  }
  if (Date.parse(deploy.operation.finalReadbackObservedAt) >= Date.parse(restore.operation.startedAt)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_TIME_ORDER_INVALID", "Deploy final readback must strictly predate restore operation start.");
  }
  assertDefaultDescriptor(deploy.artifactIdentity.descriptor, "Deploy descriptor");
  assertDefaultDescriptor(restore.artifactIdentity.descriptor, "Restore descriptor");
  if (canonicalJson(deploy.artifactIdentity.descriptor) !== canonicalJson(restore.artifactIdentity.descriptor)) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_ARTIFACT_RELATION_INVALID", "Deploy and restore descriptors differ.");
  }
  const deployArtifact = artifactCandidate(deploy);
  const restoreArtifact = artifactCandidate(restore);
  for (const key of Object.keys(deployArtifact)) {
    if (deployArtifact[key] === restoreArtifact[key]) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_ARTIFACT_RELATION_INVALID", `Deploy-target B and restore-target A reuse ${key}.`);
    }
  }
  const deployPolicy = deploy.artifactIdentity.hostingPolicy;
  const restorePolicy = restore.artifactIdentity.hostingPolicy;
  const currentCanonicalPolicy = canonicalJson(currentPolicy);
  if (
    canonicalJson(deployPolicy) !== canonicalJson(restorePolicy)
    || deployPolicy.path !== HOSTING_POLICY_PATH
    || deployPolicy.policyId !== HOSTING_POLICY_ID
    || deployPolicy.sha256 !== checkedSources.hostingPolicy.sha256
    || deployPolicy.canonicalSha256 !== sha256(currentCanonicalPolicy)
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_POLICY_BINDING_MISMATCH", "Both packages must bind the same current closed hosting policy source.");
  const rawSourcePaths = [
    deploy.rawInputs.actionResponse.path,
    deploy.rawInputs.finalReadback.path,
    restore.rawInputs.actionResponse.path,
    restore.rawInputs.finalReadback.path
  ];
  if (new Set(rawSourcePaths).size !== rawSourcePaths.length) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_IDENTITY_REUSED", "Deploy and restore must record four distinct private raw source paths.");
  }
  assertPackageHeldBindings("deploy", heldByKey, deployResult);
  assertPackageHeldBindings("restore", heldByKey, restoreResult);
  const packages = Object.freeze({
    deploy: packageFromHeld({ role: "deploy", input, heldByKey, result: deployResult }),
    restore: packageFromHeld({ role: "restore", input, heldByKey, result: restoreResult })
  });
  if (
    packages.deploy.receiptDigest === packages.restore.receiptDigest
    || packages.deploy.attachmentSetDigest === packages.restore.attachmentSetDigest
    || packages.deploy.packageDigest === packages.restore.packageDigest
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_IDENTITY_REUSED", "Deploy and restore package identities must be distinct.");
  const packageSetDigest = sha256(canonicalJson(packages));
  const sequenceId = `provider-sequence-${sha256(canonicalJson({
    deployReceiptDigest: packages.deploy.receiptDigest,
    restoreReceiptDigest: packages.restore.receiptDigest,
    packageSetDigest
  })).slice(0, 32)}`;
  const unsigned = {
    schemaVersion: 1,
    recordType: "provider_deployment_candidate_sequence_v1",
    verificationKind: "offline-independent-composition-of-two-untrusted-candidates-v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    sequenceKind: "synthetic_candidate_a_to_b_to_a_relation_only",
    sequenceId,
    descriptor: structuredClone(DEFAULT_DESCRIPTOR),
    scope: {
      provider: deploy.candidateScope.provider,
      accountId: deploy.candidateScope.accountId,
      projectId: deploy.candidateScope.projectId,
      environment: deploy.candidateScope.environment,
      origin: deploy.candidateScope.origin,
      adapterId: deploy.adapter.adapterId,
      adapterVersion: deploy.adapter.adapterVersion
    },
    deploymentIdRelation: {
      baselineAId,
      candidateBId,
      restoreBeforeDeploymentId: restore.operation.beforeActiveDeploymentId,
      restoreRequestedDeploymentId: restore.operation.requestedTargetDeploymentId,
      restoredActiveDeploymentId: restore.operation.resultActiveDeploymentId,
      restoreResultDerivation: restore.operation.resultDerivation,
      restoreDerivedFromDeploymentId: restore.operation.derivedFromDeploymentId,
      deployOperationId: deploy.operation.operationId,
      restoreOperationId: restore.operation.operationId,
      deployImmutableUrl: deploy.candidateScope.immutableDeploymentUrl,
      restoreImmutableUrl: restore.candidateScope.immutableDeploymentUrl,
      deployFinalReadbackObservedAt: deploy.operation.finalReadbackObservedAt,
      restoreOperationStartedAt: restore.operation.startedAt,
      roundTripMode: "reactivated_exact_baseline_deployment_id"
    },
    artifactCandidates: {
      deployTargetB: deployArtifact,
      restoreTargetA: restoreArtifact,
      artifactsDistinct: true
    },
    packages,
    checkedSources,
    mechanicalChecks: {
      twoPackageIntegrityVerified: true,
      twoPackageFilesystemEpochBound: true,
      packagePhysicalIdentityDistinct: true,
      scopeRelationSelfConsistent: true,
      deploymentIdChainSelfConsistent: true,
      artifactCandidateDistinctnessVerified: true,
      syntheticTimeRelationSelfConsistent: true,
      currentPolicyAndSchemasStable: true
    },
    limitations: {
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false,
      providerOperationAuthenticityVerified: false,
      initialBaselineArtifactCrossBound: false,
      deploymentIdArtifactAssociationVerified: false,
      liveHostBytesVerified: false,
      browserRuntimeVerified: false,
      dataRollbackVerified: false,
      applicationDataMutationEpochVerified: false,
      receiptHistoricalWriteOrderVerified: false,
      independentCorroborationVerified: false
    },
    attempts: {
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false
    },
    admissionGates: {
      trustedProviderParserVerified: false,
      providerAuthenticatedReceiptVerified: false,
      sequenceAdmissionPassed: false,
      deploymentAdmissionPassed: false,
      rollbackAdmissionPassed: false,
      publicReleaseGatePassed: false
    },
    authorizationBoundary: {
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    },
    claims: {
      networkObserved: false,
      providerAuthenticated: false,
      providerOperationObserved: false,
      realAtoBtoAObserved: false,
      rollbackObserved: false,
      artifactServedByDeploymentIds: false,
      liveHostBytesVerified: false,
      browserRuntimeVerified: false,
      dataRollbackVerified: false,
      applicationDataMutationEpochVerified: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    },
    packageSetDigest
  };
  return { ...unsigned, sequenceDigest: sha256(canonicalJson(unsigned)) };
}

function assertResultStable(initial, final, role) {
  if (
    initial.receiptDigest !== final.receiptDigest
    || initial.artifactSetDigest !== final.artifactSetDigest
    || canonicalJson(initial.document) !== canonicalJson(final.document)
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_FILE_REBOUND", `${role} package changed across sequence composition.`);
}

function assertAgainstHeldCandidateSchema(role, result, validator) {
  try {
    validator.assert(result.document);
  } catch (error) {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_HELD_SCHEMA_MISMATCH",
      `${role} package does not validate against the candidate schema held by the unified epoch.`,
      error
    );
  }
}

async function loadCandidateForRole(role, args) {
  try {
    return await loadVerifiedProviderDeploymentCandidateOutput(args);
  } catch (error) {
    fail(
      role === "deploy"
        ? "PROVIDER_CANDIDATE_SEQUENCE_DEPLOY_PACKAGE_INVALID"
        : "PROVIDER_CANDIDATE_SEQUENCE_RESTORE_PACKAGE_INVALID",
      `${role} package failed independent verification: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

function sequenceConsumerPayload(phase, document, heldFiles) {
  return immutableJsonSnapshot({
    phase,
    recomposedDocument: document,
    heldFileIdentities: heldFiles.map((held) => ({
      key: held.key,
      path: held.binding.path,
      dev: held.identity.dev,
      ino: held.identity.ino,
      realPath: held.identity.realPath
    }))
  });
}

export async function loadVerifiedProviderDeploymentCandidateSequence({
  bindingRoot,
  deployOutputRoot,
  deployReceiptPath,
  restoreOutputRoot,
  restoreReceiptPath,
  cwd = process.cwd(),
  onUnifiedEpochCheckpoint,
  onVerifiedSequenceConsumer
}) {
  if (onUnifiedEpochCheckpoint !== undefined && typeof onUnifiedEpochCheckpoint !== "function") {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID",
      "onUnifiedEpochCheckpoint must be a function when the deterministic mutation checkpoint is used."
    );
  }
  if (onVerifiedSequenceConsumer !== undefined && typeof onVerifiedSequenceConsumer !== "function") {
    fail(
      "PROVIDER_CANDIDATE_SEQUENCE_INPUT_INVALID",
      "onVerifiedSequenceConsumer must be a trusted function when the scoped verified consumer is used."
    );
  }
  const input = parseProviderDeploymentCandidateSequenceInput({
    bindingRoot,
    deployOutputRoot,
    deployReceiptPath,
    restoreOutputRoot,
    restoreReceiptPath
  });
  if (comparablePath(input.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_BINDING_ROOT_CWD_MISMATCH", "Binding root must exactly equal cwd.");
  }
  const [bindingLock, deployLock, restoreLock] = await Promise.all([
    captureDirectoryLock(input.bindingRoot, "Binding root"),
    captureDirectoryLock(input.deployOutputRoot, "Deploy output root"),
    captureDirectoryLock(input.restoreOutputRoot, "Restore output root")
  ]);
  if (bindingLock.realPath !== comparablePath(await realpath(cwd))) {
    fail("PROVIDER_CANDIDATE_SEQUENCE_BINDING_ROOT_CWD_MISMATCH", "Binding root and cwd do not share one physical identity.");
  }
  if (
    (deployLock.dev === restoreLock.dev && deployLock.ino === restoreLock.ino)
    || deployLock.realPath === restoreLock.realPath
  ) fail("PROVIDER_CANDIDATE_SEQUENCE_PACKAGE_ROOT_OVERLAP", "Deploy and restore roots share one physical directory identity.");
  relativeBoundPath(bindingLock.realPath, deployLock.realPath, "Resolved deploy output root");
  relativeBoundPath(bindingLock.realPath, restoreLock.realPath, "Resolved restore output root");
  await Promise.all([
    assertNoAliases(input.bindingRoot, input.deployOutputRoot, "Deploy output root"),
    assertNoAliases(input.bindingRoot, input.restoreOutputRoot, "Restore output root"),
    assertExactOutputNames(input.deployOutputRoot, "Deploy output root"),
    assertExactOutputNames(input.restoreOutputRoot, "Restore output root")
  ]);

  const heldFiles = [];
  const heldByKey = new Map();
  async function hold(key, options) {
    const held = await openHeldFile({ input, bindingLock, ...options });
    held.key = key;
    heldFiles.push(held);
    heldByKey.set(key, held);
    return held;
  }
  try {
    for (const [role, root, lock] of [
      ["deploy", input.deployOutputRoot, deployLock],
      ["restore", input.restoreOutputRoot, restoreLock]
    ]) {
      for (const fileRole of FIXED_FILE_ROLES) {
        await hold(`${role}:${fileRole}`, {
          filePath: path.join(root, FIXED_FILE_NAMES[fileRole]),
          label: `${role} ${fileRole}`,
          scopePath: root,
          scopeLock: lock
        });
      }
    }
    const sourceSpecs = [
      ["source:hostingPolicy", HOSTING_POLICY_PATH],
      ["source:candidateSchema", PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH],
      ["source:sequenceSchema", PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_PATH]
    ];
    for (const [key, recordedPath] of sourceSpecs) {
      await hold(key, {
        filePath: path.join(input.bindingRoot, ...recordedPath.split("/")),
        label: recordedPath,
        scopePath: input.bindingRoot,
        scopeLock: bindingLock
      });
    }
    assertGloballyDistinctFiles(heldFiles);

    const policyHeld = heldByKey.get("source:hostingPolicy");
    const candidateSchemaHeld = heldByKey.get("source:candidateSchema");
    const sequenceSchemaHeld = heldByKey.get("source:sequenceSchema");
    const currentPolicy = parseProviderDeploymentCandidateLoaderJsonBytes(policyHeld.bytes, "Current hosting policy");
    assertCurrentPolicy(currentPolicy);
    const candidateSchema = parseProviderDeploymentCandidateLoaderJsonBytes(candidateSchemaHeld.bytes, "Provider candidate schema");
    const candidateValidator = compileEvidenceSchemaForId(
      candidateSchema,
      PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_ID
    );
    const sequenceSchema = parseProviderDeploymentCandidateLoaderJsonBytes(sequenceSchemaHeld.bytes, "Provider candidate sequence schema");
    const sequenceValidator = compileEvidenceSchemaForId(sequenceSchema, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_ID);
    const checkedSources = Object.freeze({
      hostingPolicy: policyHeld.binding,
      candidateSchema: candidateSchemaHeld.binding,
      sequenceSchema: sequenceSchemaHeld.binding
    });

    const deployArgs = {
      bindingRoot: input.bindingRoot,
      outputRoot: input.deployOutputRoot,
      receiptPath: input.deployReceiptPath,
      cwd
    };
    const restoreArgs = {
      bindingRoot: input.bindingRoot,
      outputRoot: input.restoreOutputRoot,
      receiptPath: input.restoreReceiptPath,
      cwd
    };
    const deployInitial = await loadCandidateForRole("deploy", deployArgs);
    const restoreInitial = await loadCandidateForRole("restore", restoreArgs);
    assertAgainstHeldCandidateSchema("Deploy", deployInitial, candidateValidator);
    assertAgainstHeldCandidateSchema("Restore", restoreInitial, candidateValidator);
    const document = buildSequenceDocument({
      input,
      deployResult: deployInitial,
      restoreResult: restoreInitial,
      heldByKey,
      checkedSources,
      currentPolicy
    });
    if (document.packageSetDigest !== sha256(canonicalJson(document.packages))) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_PACKAGE_SET_DIGEST_MISMATCH", "Package-set digest is invalid.");
    }
    const { sequenceDigest: _sequenceDigest, ...unsigned } = document;
    if (document.sequenceDigest !== sha256(canonicalJson(unsigned))) {
      fail("PROVIDER_CANDIDATE_SEQUENCE_SEQUENCE_DIGEST_MISMATCH", "Sequence digest is invalid.");
    }
    sequenceValidator.assert(document);
    if (onUnifiedEpochCheckpoint !== undefined) {
      try {
        await onUnifiedEpochCheckpoint(sequenceConsumerPayload(
          "after_initial_sequence_validation",
          document,
          heldFiles
        ));
      } catch (error) {
        fail("PROVIDER_CANDIDATE_SEQUENCE_CHECKPOINT_FAILED", "Unified epoch checkpoint failed.", error);
      }
    }

    async function revalidateUnifiedEpoch() {
      const deployCurrent = await loadCandidateForRole("deploy", deployArgs);
      const restoreCurrent = await loadCandidateForRole("restore", restoreArgs);
      assertAgainstHeldCandidateSchema("Deploy", deployCurrent, candidateValidator);
      assertAgainstHeldCandidateSchema("Restore", restoreCurrent, candidateValidator);
      assertResultStable(deployInitial, deployCurrent, "Deploy");
      assertResultStable(restoreInitial, restoreCurrent, "Restore");
      for (const held of heldFiles) await assertHeldFileStable(input, bindingLock, held);
      await Promise.all([
        assertExactOutputNames(input.deployOutputRoot, "Deploy output root"),
        assertExactOutputNames(input.restoreOutputRoot, "Restore output root"),
        assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
        assertDirectoryLock(input.deployOutputRoot, deployLock, "Deploy output root"),
        assertDirectoryLock(input.restoreOutputRoot, restoreLock, "Restore output root")
      ]);
    }
    await revalidateUnifiedEpoch();
    if (onVerifiedSequenceConsumer !== undefined) {
      try {
        await onVerifiedSequenceConsumer(sequenceConsumerPayload(
          "after_final_sequence_validation",
          document,
          heldFiles
        ));
      } catch (error) {
        fail(
          "PROVIDER_CANDIDATE_SEQUENCE_VERIFIED_CONSUMER_FAILED",
          `Scoped verified consumer failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
      }
      await revalidateUnifiedEpoch();
    }
    return immutableJsonSnapshot(document);
  } finally {
    for (const held of heldFiles.reverse()) await held.handle.close().catch(() => undefined);
  }
}

async function runCli() {
  try {
    const input = parseProviderDeploymentCandidateSequenceEnvironment(process.env);
    const result = await loadVerifiedProviderDeploymentCandidateSequence(input);
    process.stdout.write(`${JSON.stringify({
      verificationKind: result.verificationKind,
      sequenceKind: result.sequenceKind,
      sequenceId: result.sequenceId,
      sequenceDigest: result.sequenceDigest,
      trustClass: result.trustClass,
      admissionStatus: result.admissionStatus,
      syntheticCandidateSequenceRelationSelfConsistent: true,
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false,
      realAtoBtoAObserved: false,
      rollbackObserved: false,
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verificationKind: "offline-independent-composition-of-two-untrusted-candidates-v1",
      sequenceKind: "synthetic_candidate_a_to_b_to_a_relation_only",
      usableSequenceResult: false,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      syntheticCandidateSequenceRelationSelfConsistent: false,
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false,
      realAtoBtoAObserved: false,
      rollbackObserved: false,
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
