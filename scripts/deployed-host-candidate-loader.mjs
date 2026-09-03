import {
  lstat,
  open,
  readFile,
  readdir,
  realpath
} from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseExpression } from "@babel/parser";

import {
  createUntrustedDeployedHostCandidatePlan,
  loadDeployedHostExpectation,
  validateDeployedHostPolicyBinding,
  validateResolvedPublicAddresses
} from "./deployed-security-headers-lib.mjs";
import { evaluateDeployedHostCandidateObservations } from "./deployed-host-candidate-runtime.mjs";
import { loadVerifiedDeployedPwaCandidateArtifact } from "./deployed-pwa-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_PATH =
  "docs/release/deployed-host-http-receipt-candidate-v1.schema.json";
export const DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_ID =
  "https://hakimi.invalid/schemas/deployed-host-http-receipt-candidate-v1.json";
export const DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS = Object.freeze({
  bindingRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_BINDING_ROOT",
  outputRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_OUTPUT_ROOT",
  receiptPath: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_RECEIPT",
  artifactRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_DEPLOYED_HOST_CANDIDATE_VERIFY_RELEASE_EVIDENCE_ID"
});

const RECEIPT_FILE_NAME = "host-receipt.json";
export const DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_MARKER_FILE_NAME =
  "host-receipt-publication-commit.sha256";
const ATTACHMENT_FILE_NAMES = Object.freeze({
  "artifact-initial": "artifact-initial.json",
  "http-observations": "http-observations.json",
  "artifact-final": "artifact-final.json"
});
const ATTACHMENT_ROLES = Object.freeze(Object.keys(ATTACHMENT_FILE_NAMES));
const EXPECTED_OUTPUT_NAMES = Object.freeze([
  ...Object.values(ATTACHMENT_FILE_NAMES),
  RECEIPT_FILE_NAME,
  DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_MARKER_FILE_NAME
].sort());
const HOSTING_POLICY_RECORDED_PATH = "docs/security/hosting-security-policy.json";
const RELEASE_EVIDENCE_FILE_NAME = "release-evidence.json";
const MAX_JSON_BYTES = 128 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TERMINAL_COMMIT_MARKER_BYTES = 65;
const EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "receiptType", "receiptId", "trustClass", "status", "verificationKind",
  "observationSource", "candidatePlatform", "targetOrigin", "checkedPolicy", "releaseEvidenceId",
  "artifactSetDigest", "buildVersion", "descriptor", "networkCompleted", "candidateContractObserved",
  "syntheticContractMatched", "artifactSnapshotStable", "attachments", "rawAttachmentSetDigest",
  "authorizationBoundary", "claims", "receiptDigest", "startedAt", "completedAt"
]);
const CLOSED_AUTHORIZATION_BOUNDARY = Object.freeze({
  externalDeploymentExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  authorizationMayNotBeDerivedFromCandidateEvidence: true
});
const CLOSED_CLAIMS = Object.freeze({
  realHostVerified: false,
  deploymentOperationObserved: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false
});
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

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function requireAbsoluteCanonicalPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || !path.isAbsolute(value)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_INVALID", `${label} must be an explicit absolute path.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_INVALID", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_INVALID", `${label} must use its exact resolved filesystem spelling.`);
  }
  return resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ENV_MISSING", `${key} must be explicit and free of surrounding whitespace.`);
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
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_OUTSIDE_ROOT", `${label} is outside its required root.`);
  return relative.split(path.sep).join("/");
}

function pathIsWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requireRootsDisjoint(left, right, label) {
  if (pathIsWithin(left, right) || pathIsWithin(right, left)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ROOTS_OVERLAP", `${label} must be physically disjoint in both directions.`);
  }
}

function requireCanonicalOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ORIGIN_INVALID", `${label} must be a canonical public HTTPS origin.`, error);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== "https:"
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.port !== ""
    || parsed.pathname !== "/"
    || parsed.search !== ""
    || parsed.hash !== ""
    || parsed.origin !== value
    || isIP(hostname) !== 0
    || !hostname.includes(".")
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ORIGIN_INVALID", `${label} must be a canonical public HTTPS origin.`);
  return value;
}

export function parseDeployedHostCandidateLoaderInput(input) {
  const inputKeys = [
    "bindingRoot", "outputRoot", "receiptPath", "artifactRoot", "artifactLock", "releaseEvidenceId"
  ];
  if (!exactKeys(input, inputKeys)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_INPUT_INVALID", "Loader input must contain exactly the six explicit bindings.");
  }
  const bindingRoot = requireAbsoluteCanonicalPath(input.bindingRoot, "Binding root");
  const outputRoot = requireAbsoluteCanonicalPath(input.outputRoot, "Output root");
  const receiptPath = requireAbsoluteCanonicalPath(input.receiptPath, "Receipt path");
  const artifactRoot = requireAbsoluteCanonicalPath(input.artifactRoot, "Artifact root");
  const artifactLock = requireAbsoluteCanonicalPath(input.artifactLock, "Artifact identity lock");
  if (!EVIDENCE_ID_PATTERN.test(input.releaseEvidenceId ?? "")) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_EVIDENCE_ID_INVALID", "Release Evidence id is not canonical.");
  }
  relativeBoundPath(bindingRoot, outputRoot, "Output root");
  relativeBoundPath(bindingRoot, artifactRoot, "Artifact root");
  relativeBoundPath(bindingRoot, artifactLock, "Artifact identity lock");
  relativeBoundPath(outputRoot, receiptPath, "Receipt path");
  if (comparablePath(receiptPath) !== comparablePath(path.join(outputRoot, RECEIPT_FILE_NAME))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_RECEIPT_PATH_INVALID", `Receipt path must be the fixed ${RECEIPT_FILE_NAME}.`);
  }
  requireRootsDisjoint(outputRoot, artifactRoot, "Output root and artifact root");
  if (pathIsWithin(artifactRoot, artifactLock) || pathIsWithin(outputRoot, artifactLock)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_LOCK_ROOT_INVALID", "Artifact identity lock must remain outside artifact and output roots.");
  }
  return Object.freeze({
    bindingRoot,
    outputRoot,
    receiptPath,
    artifactRoot,
    artifactLock,
    releaseEvidenceId: input.releaseEvidenceId
  });
}

export function parseDeployedHostCandidateLoaderEnvironment(environment = process.env) {
  if (!isRecord(environment)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ENV_INVALID", "Loader environment must be an object.");
  }
  return parseDeployedHostCandidateLoaderInput({
    bindingRoot: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.bindingRoot),
    outputRoot: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.outputRoot),
    receiptPath: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.receiptPath),
    artifactRoot: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.artifactRoot),
    artifactLock: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.artifactLock),
    releaseEvidenceId: requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_LOADER_ENVIRONMENT_KEYS.releaseEvidenceId)
  });
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit);
    } else if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

export function parseDeployedHostCandidateLoaderJsonBytes(bytes, label = "Candidate JSON") {
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0 || buffer.length > MAX_JSON_BYTES) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_SIZE_INVALID", `${label} must be 1-${MAX_JSON_BYTES} bytes.`);
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM.`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (error) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_UTF8_INVALID", `${label} is not strict UTF-8.`, error);
  }
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: label,
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (error) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_SYNTAX_INVALID", `${label} cannot be inspected as strict JSON.`, error);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (
        property.type !== "ObjectProperty"
        || property.computed !== false
        || property.key?.type !== "StringLiteral"
      ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_PROPERTY_INVALID", `${label} contains a non-JSON object property.`);
      if (keys.has(property.key.value)) {
        fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_DUPLICATE_KEY", `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`);
      }
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_JSON_INVALID", `${label} is not valid JSON.`, error);
  }
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
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ROOT_LOCK_FAILED", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ROOT_LOCK_INVALID", `${label} must be a real directory with filesystem identity.`);
  }
  if (comparablePath(resolved) !== comparablePath(directoryPath)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_ALIAS", `${label} must not resolve through an aliased parent path.`);
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
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ROOT_REBOUND", `${label} changed during verification.`);
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
      fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_UNREADABLE", `${label} cannot be inspected.`, error);
    }
    if (metadata.isSymbolicLink()) {
      fail("DEPLOYED_HOST_CANDIDATE_LOADER_PATH_ALIAS", `${label} cannot traverse a symlink or junction.`);
    }
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function readOpenedFileBounded(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.byteLength) {
    const { bytesRead } = await handle.read(target, offset, target.byteLength - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function stableFileSnapshot({
  input,
  filePath,
  label,
  bindingLock,
  containmentRoot,
  containmentLock
}) {
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(containmentRoot, containmentLock, `${label} containment root`)
  ]);
  await assertNoAliases(input.bindingRoot, filePath, label);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_FILE_OPEN_FAILED", `${label} could not be opened.`, error);
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
    ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_FILE_UNSAFE", `${label} must be a bounded single-link regular file.`);
    relativeBoundPath(containmentLock.realPath, resolvedBefore, `${label} resolved path`);
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    await Promise.all([
      assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
      assertDirectoryLock(containmentRoot, containmentLock, `${label} containment root`)
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
    ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_FILE_REBOUND", `${label} changed during its stable opened-file read.`);
    return Object.freeze({
      bytes,
      binding: Object.freeze({
        path: relativeBoundPath(input.bindingRoot, filePath, `${label} binding`),
        size: bytes.byteLength,
        sha256: sha256(bytes)
      }),
      identity: Object.freeze({
        realPath: comparablePath(resolvedAfter),
        dev: String(after.dev),
        ino: String(after.ino),
        birthtimeNs: String(after.birthtimeNs),
        mtimeNs: String(after.mtimeNs),
        ctimeNs: String(after.ctimeNs),
        size: Number(after.size),
        nlink: Number(after.nlink)
      })
    });
  } finally {
    await handle.close();
  }
}

function stableFileProjection(snapshot) {
  return { binding: snapshot?.binding, identity: snapshot?.identity };
}

function assertStableFile(initial, final, label) {
  if (canonicalJson(stableFileProjection(initial)) !== canonicalJson(stableFileProjection(final))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_FILE_REBOUND", `${label} changed across verification.`);
  }
}

function assertDistinctPhysicalFiles(snapshots) {
  const identities = [...snapshots.values()].map((snapshot) => `${snapshot.identity.dev}:${snapshot.identity.ino}`);
  const realPaths = [...snapshots.values()].map((snapshot) => snapshot.identity.realPath);
  if (new Set(identities).size !== identities.length || new Set(realPaths).size !== realPaths.length) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_FILE_IDENTITY_REUSED", "Candidate output files must have distinct physical identities.");
  }
}

async function assertExactOutputNames(outputRoot) {
  const names = (await readdir(outputRoot)).sort();
  if (canonicalJson(names) !== canonicalJson(EXPECTED_OUTPUT_NAMES)) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_LOADER_OUTPUT_SET_INVALID",
      "Committed candidate output must contain exactly three attachments, the final receipt, and its terminal commit marker."
    );
  }
}

function validateTerminalCommitMarker(markerSnapshot, receiptSnapshot) {
  const expectedBytes = Buffer.from(`${receiptSnapshot.binding.sha256}\n`, "utf8");
  if (
    expectedBytes.byteLength !== TERMINAL_COMMIT_MARKER_BYTES
    || markerSnapshot.bytes.byteLength !== TERMINAL_COMMIT_MARKER_BYTES
    || !markerSnapshot.bytes.equals(expectedBytes)
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_INVALID",
      "Terminal commit marker must be the lowercase SHA-256 of the raw receipt bytes plus LF."
    );
  }
  return Object.freeze({
    path: markerSnapshot.binding.path,
    size: markerSnapshot.binding.size,
    sha256: markerSnapshot.binding.sha256,
    commitsReceiptSha256: receiptSnapshot.binding.sha256
  });
}

function canonicalTimestamp(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_TIME_INVALID", `${label} must be a canonical UTC timestamp.`);
  }
  return value;
}

function receiptDigest(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

function expectationProjection(expectation) {
  return {
    expectationKind: expectation.expectationKind,
    evidenceId: expectation.evidenceId,
    artifactSetDigest: expectation.artifactSetDigest,
    descriptor: structuredClone(expectation.descriptor),
    releaseIdentity: structuredClone(expectation.releaseIdentity),
    policyBinding: structuredClone(expectation.policyBinding),
    artifactIdentityLockBinding: structuredClone(expectation.artifactIdentityLockBinding),
    releaseEvidence: structuredClone(expectation.releaseEvidence),
    artifacts: structuredClone(expectation.artifacts),
    lockedBytes: {
      indexHtmlSha256: sha256(expectation.indexBytes),
      manifestSha256: sha256(expectation.manifestBytes),
      serviceWorkerSha256: sha256(expectation.serviceWorkerBytes)
    }
  };
}

function currentArtifactCore(verifiedArtifact, expectation) {
  if (
    verifiedArtifact.releaseEvidenceId !== expectation.evidenceId
    || verifiedArtifact.artifactSetDigest !== expectation.artifactSetDigest
    || canonicalJson(verifiedArtifact.descriptor) !== canonicalJson(expectation.descriptor)
    || verifiedArtifact.buildVersion !== expectation.releaseIdentity.buildVersion
    || verifiedArtifact.pwaManifest.sha256 !== sha256(expectation.manifestBytes)
    || verifiedArtifact.serviceWorker.sha256 !== sha256(expectation.serviceWorkerBytes)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ARTIFACT_EXPECTATION_MISMATCH", "Current artifact lock and Release Evidence expectation disagree.");
  return {
    verifiedArtifact: structuredClone(verifiedArtifact),
    deployedHostExpectation: expectationProjection(expectation)
  };
}

function validateArtifactSnapshot(document, phase, expectedCore) {
  if (
    !exactKeys(document, [
      "schemaVersion", "recordType", "phase", "capturedAt", "snapshotDigest",
      "verifiedArtifact", "deployedHostExpectation"
    ])
    || document.schemaVersion !== 1
    || document.recordType !== "deployed_host_candidate_artifact_snapshot_v1"
    || document.phase !== phase
    || !SHA256_PATTERN.test(document.snapshotDigest ?? "")
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${phase} artifact snapshot has an invalid exact shape.`);
  canonicalTimestamp(document.capturedAt, `${phase} capturedAt`);
  const core = {
    verifiedArtifact: document.verifiedArtifact,
    deployedHostExpectation: document.deployedHostExpectation
  };
  if (
    document.snapshotDigest !== sha256(canonicalJson(core))
    || canonicalJson(core) !== canonicalJson(expectedCore)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_MISMATCH", `${phase} artifact snapshot does not match current verified sources.`);
  return document;
}

function validateDnsDocument(dns, targetOrigin) {
  if (
    !exactKeys(dns, [
      "schemaVersion", "recordType", "hostname", "observedAt", "allResolvedAddressesPublic",
      "records", "pinnedAddress", "connectionPolicy"
    ])
    || dns.schemaVersion !== 1
    || dns.recordType !== "deployed_host_candidate_dns_observation_v1"
    || dns.hostname !== new URL(targetOrigin).hostname
    || dns.allResolvedAddressesPublic !== true
    || dns.connectionPolicy !== "all_records_validated_single_address_pinned_per_request"
    || !Array.isArray(dns.records)
    || !exactKeys(dns.pinnedAddress, ["address", "family"])
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_DNS_INVALID", "DNS attachment is not an exact public-address candidate document.");
  canonicalTimestamp(dns.observedAt, "DNS observedAt");
  validateResolvedPublicAddresses(dns.records);
  if (!dns.records.some((record) => canonicalJson(record) === canonicalJson(dns.pinnedAddress))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_DNS_INVALID", "Pinned address is not in the validated DNS set.");
  }
}

function validateHttpObservationDocument({
  document,
  receipt,
  policy,
  expectation,
  initialSnapshot,
  finalSnapshot,
  policyBinding
}) {
  if (
    !exactKeys(document, [
      "schemaVersion", "recordType", "trustClass", "admissionStatus", "observationSource",
      "candidateScope", "checkedPolicy", "dns", "plan", "planDigest", "observations", "evaluation"
    ])
    || document.schemaVersion !== 1
    || document.recordType !== "deployed_host_http_observation_set_v1"
    || document.trustClass !== "untrusted_candidate"
    || document.admissionStatus !== "not_admitted"
    || document.observationSource !== receipt.observationSource
    || !exactKeys(document.candidateScope, ["platform", "origin"])
    || document.candidateScope.platform !== receipt.candidatePlatform
    || document.candidateScope.origin !== receipt.targetOrigin
    || !Array.isArray(document.observations)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_HTTP_DOCUMENT_INVALID", "HTTP observation attachment has an invalid exact envelope.");
  validateDnsDocument(document.dns, receipt.targetOrigin);
  const recomputedPlan = createUntrustedDeployedHostCandidatePlan({
    baseUrl: receipt.targetOrigin,
    candidatePlatform: receipt.candidatePlatform,
    policy,
    expectation
  });
  const recomputedEvaluation = evaluateDeployedHostCandidateObservations({
    plan: recomputedPlan,
    dns: document.dns,
    observations: document.observations
  });
  const recomputedPlanDigest = sha256(canonicalJson(recomputedPlan));
  const expectedCheckedPolicy = {
    policyId: policyBinding.policyId,
    deploymentPlatform: "unselected",
    canonicalOrigin: null,
    byteSha256: policyBinding.sha256,
    canonicalSha256: policyBinding.canonicalSha256
  };
  if (
    canonicalJson(document.checkedPolicy) !== canonicalJson(expectedCheckedPolicy)
    || canonicalJson(receipt.checkedPolicy) !== canonicalJson(expectedCheckedPolicy)
    || document.planDigest !== recomputedPlanDigest
    || canonicalJson(document.plan) !== canonicalJson(recomputedPlan)
    || canonicalJson(document.evaluation) !== canonicalJson(recomputedEvaluation)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_HTTP_RECOMPUTATION_MISMATCH", "HTTP plan, policy, or evaluation does not independently recompute.");

  const realLabel = receipt.observationSource === "node_http_pinned_real_network_v1";
  if (
    realLabel !== (receipt.verificationKind === "real-network-candidate-observation")
    || (!realLabel && receipt.verificationKind !== "synthetic-offline-candidate-contract")
    || receipt.networkCompleted !== (realLabel && recomputedEvaluation.observationMatrixCompleted)
    || receipt.candidateContractObserved !== (realLabel && recomputedEvaluation.gates.candidateContractObserved)
    || receipt.syntheticContractMatched !== (!realLabel && recomputedEvaluation.gates.candidateContractObserved)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_TRANSPORT_LABEL_MISMATCH", "Receipt network flags do not match the recomputed observation label and evaluation.");

  const observationTimes = document.observations.flatMap((observation) => [
    Date.parse(observation.request.startedAt),
    Date.parse(observation.response.completedAt)
  ]);
  if (
    Date.parse(initialSnapshot.capturedAt) > Date.parse(document.dns.observedAt)
    || observationTimes.length === 0
    || Date.parse(document.dns.observedAt) > observationTimes[0]
    || observationTimes.at(-1) > Date.parse(finalSnapshot.capturedAt)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_TIME_INVALID", "Artifact, DNS, HTTP, and final snapshot chronology is invalid.");
  return { recomputedPlan, recomputedEvaluation, realLabel };
}

async function loadCurrentArtifactState(input, policy) {
  const verifiedArtifact = await loadVerifiedDeployedPwaCandidateArtifact(input);
  const expectation = await loadDeployedHostExpectation({
    cwd: input.bindingRoot,
    artifactRoot: input.artifactRoot,
    evidencePath: path.join(input.artifactRoot, RELEASE_EVIDENCE_FILE_NAME),
    policy,
    policyPath: HOSTING_POLICY_RECORDED_PATH
  });
  const policyBinding = validateDeployedHostPolicyBinding({ policy, expectation });
  return Object.freeze({
    verifiedArtifact,
    expectation,
    policyBinding,
    core: currentArtifactCore(verifiedArtifact, expectation)
  });
}

export async function loadVerifiedDeployedHostCandidateOutput({
  bindingRoot,
  outputRoot,
  receiptPath,
  artifactRoot,
  artifactLock,
  releaseEvidenceId,
  cwd = process.cwd()
}) {
  const input = parseDeployedHostCandidateLoaderInput({
    bindingRoot,
    outputRoot,
    receiptPath,
    artifactRoot,
    artifactLock,
    releaseEvidenceId
  });
  if (comparablePath(input.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_BINDING_ROOT_CWD_MISMATCH", "Binding root must exactly equal cwd so all recorded paths share one base.");
  }
  const [bindingLock, outputLock] = await Promise.all([
    captureDirectoryLock(input.bindingRoot, "Binding root"),
    captureDirectoryLock(input.outputRoot, "Output root")
  ]);
  if (bindingLock.realPath !== comparablePath(await realpath(cwd))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_BINDING_ROOT_CWD_MISMATCH", "Binding root and cwd do not share one physical identity.");
  }
  relativeBoundPath(bindingLock.realPath, outputLock.realPath, "Resolved output root");
  await assertNoAliases(input.bindingRoot, input.outputRoot, "Output root");

  const sourceFilePaths = Object.freeze({
    schema: path.join(input.bindingRoot, ...DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_PATH.split("/")),
    policy: path.join(input.bindingRoot, ...HOSTING_POLICY_RECORDED_PATH.split("/"))
  });
  const initialSourceSnapshots = new Map();
  for (const [role, filePath] of Object.entries(sourceFilePaths)) {
    initialSourceSnapshots.set(role, await stableFileSnapshot({
      input,
      filePath,
      label: `Current ${role}`,
      bindingLock,
      containmentRoot: input.bindingRoot,
      containmentLock: bindingLock
    }));
  }
  const schema = parseDeployedHostCandidateLoaderJsonBytes(initialSourceSnapshots.get("schema").bytes, "Host candidate receipt Schema");
  const schemaValidator = compileEvidenceSchemaForId(schema, DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_ID);
  const policy = parseDeployedHostCandidateLoaderJsonBytes(initialSourceSnapshots.get("policy").bytes, "Current hosting policy");

  await assertExactOutputNames(input.outputRoot);
  const outputPaths = new Map([
    ["receipt", input.receiptPath],
    [
      "terminal-commit",
      path.join(input.outputRoot, DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_MARKER_FILE_NAME)
    ],
    ...ATTACHMENT_ROLES.map((role) => [role, path.join(input.outputRoot, ATTACHMENT_FILE_NAMES[role])])
  ]);
  const initialOutputSnapshots = new Map();
  for (const [role, filePath] of outputPaths) {
    initialOutputSnapshots.set(role, await stableFileSnapshot({
      input,
      filePath,
      label: role === "receipt"
        ? "Host candidate receipt"
        : role === "terminal-commit"
          ? "Host candidate terminal commit marker"
          : `Host candidate attachment ${role}`,
      bindingLock,
      containmentRoot: input.outputRoot,
      containmentLock: outputLock
    }));
  }
  assertDistinctPhysicalFiles(initialOutputSnapshots);
  const terminalGateBinding = validateTerminalCommitMarker(
    initialOutputSnapshots.get("terminal-commit"),
    initialOutputSnapshots.get("receipt")
  );

  const receipt = parseDeployedHostCandidateLoaderJsonBytes(initialOutputSnapshots.get("receipt").bytes, "Host candidate receipt");
  schemaValidator.assert(receipt);
  if (
    !exactKeys(receipt, RECEIPT_KEYS)
    || receipt.schemaVersion !== 1
    || receipt.receiptType !== "deployed_host_http_receipt_candidate_v1"
    || receipt.trustClass !== "untrusted_candidate"
    || receipt.status !== "not_admitted"
    || receipt.artifactSnapshotStable !== true
    || canonicalJson(receipt.authorizationBoundary) !== canonicalJson(CLOSED_AUTHORIZATION_BOUNDARY)
    || canonicalJson(receipt.claims) !== canonicalJson(CLOSED_CLAIMS)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_RECEIPT_CLOSURE_INVALID", "Receipt cannot alter its closed trust, admission, authorization, or claim boundary.");
  requireCanonicalOrigin(receipt.targetOrigin, "Receipt target origin");
  if (receipt.receiptDigest !== receiptDigest(receipt)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_RECEIPT_DIGEST_MISMATCH", "Host candidate receipt digest is invalid.");
  }
  if (receipt.rawAttachmentSetDigest !== sha256(canonicalJson(receipt.attachments))) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_ATTACHMENT_SET_DIGEST_MISMATCH", "Host candidate attachment-set digest is invalid.");
  }
  if (canonicalJson(receipt.descriptor) !== canonicalJson(DEFAULT_DESCRIPTOR)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_DESCRIPTOR_INVALID", "Host candidate receipt is not bound to the exact default-v13 descriptor.");
  }
  if (receipt.releaseEvidenceId !== input.releaseEvidenceId) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_EVIDENCE_ID_MISMATCH", "Explicit and recorded Release Evidence ids differ.");
  }
  for (const [index, role] of ATTACHMENT_ROLES.entries()) {
    const recorded = receipt.attachments[index];
    const actual = initialOutputSnapshots.get(role).binding;
    const expectedPath = relativeBoundPath(input.bindingRoot, outputPaths.get(role), `${role} fixed binding`);
    if (
      recorded.role !== role
      || recorded.path !== expectedPath
      || recorded.size !== actual.size
      || recorded.sha256 !== actual.sha256
    ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ATTACHMENT_BINDING_MISMATCH", `${role} does not match its fixed output bytes.`);
  }

  const currentState = await loadCurrentArtifactState(input, policy);
  const initialArtifact = validateArtifactSnapshot(
    parseDeployedHostCandidateLoaderJsonBytes(initialOutputSnapshots.get("artifact-initial").bytes, "Initial artifact snapshot"),
    "initial",
    currentState.core
  );
  const finalArtifact = validateArtifactSnapshot(
    parseDeployedHostCandidateLoaderJsonBytes(initialOutputSnapshots.get("artifact-final").bytes, "Final artifact snapshot"),
    "final",
    currentState.core
  );
  canonicalTimestamp(receipt.startedAt, "Receipt startedAt");
  canonicalTimestamp(receipt.completedAt, "Receipt completedAt");
  if (
    receipt.startedAt !== initialArtifact.capturedAt
    || receipt.completedAt !== finalArtifact.capturedAt
    || Date.parse(receipt.startedAt) > Date.parse(receipt.completedAt)
    || receipt.artifactSetDigest !== currentState.verifiedArtifact.artifactSetDigest
    || receipt.buildVersion !== currentState.verifiedArtifact.buildVersion
    || canonicalJson(receipt.descriptor) !== canonicalJson(currentState.verifiedArtifact.descriptor)
  ) fail("DEPLOYED_HOST_CANDIDATE_LOADER_ARTIFACT_CROSS_BINDING_MISMATCH", "Receipt and current artifact snapshots disagree.");

  const httpDocument = parseDeployedHostCandidateLoaderJsonBytes(
    initialOutputSnapshots.get("http-observations").bytes,
    "HTTP observation attachment"
  );
  const httpVerification = validateHttpObservationDocument({
    document: httpDocument,
    receipt,
    policy,
    expectation: currentState.expectation,
    initialSnapshot: initialArtifact,
    finalSnapshot: finalArtifact,
    policyBinding: currentState.policyBinding
  });

  await assertExactOutputNames(input.outputRoot);
  const finalState = await loadCurrentArtifactState(input, policy);
  if (canonicalJson(finalState.core) !== canonicalJson(currentState.core)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOADER_CURRENT_SOURCE_REBOUND", "Current artifact or Release Evidence changed across loader verification.");
  }
  const finalOutputSnapshots = new Map();
  for (const [role, filePath] of outputPaths) {
    finalOutputSnapshots.set(role, await stableFileSnapshot({
      input,
      filePath,
      label: role === "receipt"
        ? "Host candidate receipt after verification"
        : role === "terminal-commit"
          ? "Host candidate terminal commit marker after verification"
          : `Host candidate attachment ${role} after verification`,
      bindingLock,
      containmentRoot: input.outputRoot,
      containmentLock: outputLock
    }));
    assertStableFile(initialOutputSnapshots.get(role), finalOutputSnapshots.get(role), role);
  }
  assertDistinctPhysicalFiles(finalOutputSnapshots);
  if (
    canonicalJson(validateTerminalCommitMarker(
      finalOutputSnapshots.get("terminal-commit"),
      finalOutputSnapshots.get("receipt")
    )) !== canonicalJson(terminalGateBinding)
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_REBOUND",
      "Terminal commit marker binding changed across verification."
    );
  }
  await assertExactOutputNames(input.outputRoot);
  const finalSourceSnapshots = new Map();
  for (const [role, filePath] of Object.entries(sourceFilePaths)) {
    finalSourceSnapshots.set(role, await stableFileSnapshot({
      input,
      filePath,
      label: `Current ${role} after verification`,
      bindingLock,
      containmentRoot: input.bindingRoot,
      containmentLock: bindingLock
    }));
    assertStableFile(initialSourceSnapshots.get(role), finalSourceSnapshots.get(role), role);
  }
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(input.outputRoot, outputLock, "Output root")
  ]);

  return Object.freeze({
    verificationKind: "offline-independent-deployed-host-candidate-output-v1",
    candidateOutputIntegrityVerified: true,
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    usableForAdmission: false,
    receiptId: receipt.receiptId,
    receiptDigest: receipt.receiptDigest,
    releaseEvidenceId: receipt.releaseEvidenceId,
    artifactSetDigest: receipt.artifactSetDigest,
    observationLabel: receipt.observationSource,
    terminalGateBinding,
    gates: Object.freeze({
      schemaValidated: true,
      receiptDigestRecomputed: true,
      attachmentSetDigestRecomputed: true,
      terminalCommitMarkerVerified: true,
      fixedOutputSetBound: true,
      physicalFileIdentityBound: true,
      currentArtifactAndPolicyBound: true,
      artifactEndpointSnapshotsMatched: true,
      httpPlanAndEvaluationRecomputed: true,
      semanticEvaluatorImplementationIndependent: false,
      realNetworkTransportProvenanceVerified: false
    }),
    mutationBoundary: Object.freeze({
      boundaryType: "deployed_host_candidate_loader_endpoint_snapshot_boundary_v1",
      verificationScope: "output_and_current_source_endpoint_snapshots_only_no_continuous_mutation_epoch",
      mutationEpochCapability: "absent_schema13",
      intervalMutationExclusionClaimed: false,
      abaMutationExclusionClaimed: false
    }),
    attempts: Object.freeze({
      dnsAttemptedByLoader: false,
      networkAttemptedByLoader: false,
      browserAttemptedByLoader: false,
      deploymentAttemptedByLoader: false,
      rollbackAttemptedByLoader: false
    }),
    authorizationBoundary: Object.freeze({
      externalDeploymentExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    }),
    claims: Object.freeze({
      networkObserved: false,
      realHostVerified: false,
      browserRuntimeVerified: false,
      deploymentOperationObserved: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    }),
    recomputedCandidateContractMatched: httpVerification.recomputedEvaluation.gates.candidateContractObserved,
    currentArtifactProjection: immutableJsonSnapshot(currentState.core.deployedHostExpectation),
    document: immutableJsonSnapshot(receipt)
  });
}

async function runCli() {
  try {
    const input = parseDeployedHostCandidateLoaderEnvironment(process.env);
    const result = await loadVerifiedDeployedHostCandidateOutput(input);
    process.stdout.write(`${JSON.stringify({
      verificationKind: result.verificationKind,
      candidateOutputIntegrityVerified: true,
      trustClass: result.trustClass,
      admissionStatus: result.admissionStatus,
      receiptId: result.receiptId,
      receiptDigest: result.receiptDigest,
      terminalCommitMarkerVerified: true,
      terminalGateBinding: result.terminalGateBinding,
      observationLabel: result.observationLabel,
      realNetworkTransportProvenanceVerified: false,
      realHostVerified: false,
      networkAttemptedByLoader: false,
      browserAttemptedByLoader: false,
      deploymentAttemptedByLoader: false,
      rollbackAttemptedByLoader: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verificationKind: "offline-independent-deployed-host-candidate-output-v1",
      candidateOutputIntegrityVerified: false,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      usableForAdmission: false,
      realNetworkTransportProvenanceVerified: false,
      realHostVerified: false,
      networkAttemptedByLoader: false,
      browserAttemptedByLoader: false,
      deploymentAttemptedByLoader: false,
      rollbackAttemptedByLoader: false,
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
