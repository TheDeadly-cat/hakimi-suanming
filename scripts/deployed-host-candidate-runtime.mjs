import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  unlink
} from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  createUntrustedDeployedHostCandidatePlan,
  loadDeployedHostExpectation,
  validateDeployedHostPolicyBinding,
  validateResolvedPublicAddresses
} from "./deployed-security-headers-lib.mjs";
import {
  assertDeployedPwaCandidateArtifactIdentityStable,
  loadVerifiedDeployedPwaCandidateArtifact,
  revalidateDeployedPwaCandidateArtifactIdentity
} from "./deployed-pwa-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS = Object.freeze({
  origin: "HAKIMI_DEPLOYED_HOST_CANDIDATE_ORIGIN",
  platform: "HAKIMI_DEPLOYED_HOST_CANDIDATE_PLATFORM",
  bindingRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_BINDING_ROOT",
  outputRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_OUTPUT_ROOT",
  artifactRoot: "HAKIMI_DEPLOYED_HOST_CANDIDATE_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_DEPLOYED_HOST_CANDIDATE_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_DEPLOYED_HOST_CANDIDATE_RELEASE_EVIDENCE_ID",
  runId: "HAKIMI_DEPLOYED_HOST_CANDIDATE_RUN_ID"
});

export const DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES = Object.freeze([
  "artifact-initial",
  "http-observations",
  "artifact-final"
]);

const ATTACHMENT_FILE_NAMES = Object.freeze({
  "artifact-initial": "artifact-initial.json",
  "http-observations": "http-observations.json",
  "artifact-final": "artifact-final.json"
});
const RECEIPT_FILE_NAME = "host-receipt.json";
export const DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME =
  ".host-receipt-publication-pending";
export const DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME =
  "host-receipt-publication-commit.sha256";
const PREPARED_OUTPUT_FILE_NAMES = Object.freeze([
  ...Object.values(ATTACHMENT_FILE_NAMES),
  RECEIPT_FILE_NAME,
  DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME
].sort());
const TERMINAL_COMMIT_MARKER_BYTES = 65;
const POLICY_PATH = "docs/security/hosting-security-policy.json";
const ARTIFACT_PATH_PATTERN = /^(?!\/)(?!\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\/\.{1,2}(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const RELEASE_EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const PLATFORM_PATTERN = /^(?!unselected$)[a-z0-9][a-z0-9._-]{0,63}$/u;
const RESPONSE_BODY_LIMIT_BYTES = 64 * 1024 * 1024;
const AUXILIARY_BODY_LIMIT_BYTES = 1024 * 1024;
const RESPONSE_TIMEOUT_MS = 20_000;
const DNS_TIMEOUT_MS = 10_000;
const REAL_NETWORK_HTTP_OBSERVATION_DOCUMENTS = new WeakSet();

function fail(code, message, cause) {
  throw new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
}

function isErrno(error, code) {
  return error !== null && typeof error === "object" && Reflect.get(error, "code") === code;
}

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
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

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("DEPLOYED_HOST_CANDIDATE_ENV_MISSING", `${key} must be explicit and free of surrounding whitespace.`);
  }
  return value;
}

function requireAbsoluteCanonicalPath(value, label) {
  if (!path.isAbsolute(value)) fail("DEPLOYED_HOST_CANDIDATE_PATH_NOT_ABSOLUTE", `${label} must be absolute.`);
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("DEPLOYED_HOST_CANDIDATE_PATH_DOT_SEGMENT", `${label} must not contain dot segments.`);
  }
  return path.resolve(value);
}

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(root, candidate);
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) fail("DEPLOYED_HOST_CANDIDATE_PATH_OUTSIDE_ROOT", `${label} is outside its binding root.`);
  if (relative === "" && allowEqual) return "";
  const normalized = relative.split(path.sep).join("/");
  if (!ARTIFACT_PATH_PATTERN.test(normalized)) {
    fail("DEPLOYED_HOST_CANDIDATE_BOUND_PATH_INVALID", `${label} is not a canonical bound path.`);
  }
  return normalized;
}

function rootsOverlap(left, right) {
  const contained = (relative) => relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
  return contained(path.relative(left, right)) || contained(path.relative(right, left));
}

function requireRootIsolation(outputRoot, artifactRoot, code) {
  if (rootsOverlap(outputRoot, artifactRoot)) {
    fail(code, "Candidate output and artifact roots must be disjoint in both directions.");
  }
}

function requirePublicDnsHttpsOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("DEPLOYED_HOST_CANDIDATE_ORIGIN_INVALID", "Candidate origin must be an absolute URL.");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.port !== ""
    || url.pathname !== "/"
    || url.search !== ""
    || url.hash !== ""
    || url.origin !== value
    || isIP(hostname) !== 0
    || !hostname.includes(".")
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
  ) fail("DEPLOYED_HOST_CANDIDATE_ORIGIN_INVALID", "Candidate origin must be a canonical public-DNS HTTPS origin.");
  return url.origin;
}

export function parseDeployedHostCandidateEnvironment(environment) {
  if (environment === null || typeof environment !== "object" || Array.isArray(environment)) {
    fail("DEPLOYED_HOST_CANDIDATE_ENV_INVALID", "Environment must be an object.");
  }
  const origin = requirePublicDnsHttpsOrigin(requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.origin));
  const platform = requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.platform);
  if (!PLATFORM_PATTERN.test(platform)) {
    fail("DEPLOYED_HOST_CANDIDATE_PLATFORM_INVALID", "Candidate platform must be explicit, canonical, and distinct from unselected.");
  }
  const bindingRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.bindingRoot), "Binding root");
  const outputRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.outputRoot), "Output root");
  const artifactRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.artifactRoot), "Artifact root");
  const artifactLock = requireAbsoluteCanonicalPath(requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.artifactLock), "Artifact lock");
  relativeBoundPath(bindingRoot, outputRoot, "Output root");
  relativeBoundPath(bindingRoot, artifactRoot, "Artifact root");
  relativeBoundPath(bindingRoot, artifactLock, "Artifact lock");
  requireRootIsolation(outputRoot, artifactRoot, "DEPLOYED_HOST_CANDIDATE_ROOTS_OVERLAP");
  if (rootsOverlap(artifactRoot, artifactLock)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOCK_INSIDE_ARTIFACT", "Artifact lock must remain outside the artifact root.");
  }
  const releaseEvidenceId = requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.releaseEvidenceId);
  if (!RELEASE_EVIDENCE_ID_PATTERN.test(releaseEvidenceId)) {
    fail("DEPLOYED_HOST_CANDIDATE_EVIDENCE_ID_INVALID", "Release Evidence id is not canonical.");
  }
  const runId = requireEnvironmentString(environment, DEPLOYED_HOST_CANDIDATE_ENVIRONMENT_KEYS.runId);
  if (!RUN_ID_PATTERN.test(runId)) fail("DEPLOYED_HOST_CANDIDATE_RUN_ID_INVALID", "Run id is not canonical.");
  return Object.freeze({ origin, platform, bindingRoot, outputRoot, artifactRoot, artifactLock, releaseEvidenceId, runId });
}

function filesystemIdentity(metadata, resolved) {
  return Object.freeze({ realPath: resolved, dev: metadata.dev, ino: metadata.ino, birthtimeMs: metadata.birthtimeMs });
}

function sameFilesystemIdentity(left, right) {
  return left.realPath === right.realPath
    && left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeMs === right.birthtimeMs;
}

async function assertPlainDirectory(directory, label) {
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail("DEPLOYED_HOST_CANDIDATE_DIRECTORY_UNSAFE", `${label} must be a physical non-symlink directory.`);
  }
  return filesystemIdentity(metadata, await realpath(directory));
}

async function projectRealPathBeforeCreation(target, label) {
  let current = target;
  const missing = [];
  while (true) {
    try {
      const existing = await assertPlainDirectory(current, `${label} nearest existing ancestor`);
      return path.resolve(existing.realPath, ...missing.reverse());
    } catch (error) {
      if (!isErrno(error, "ENOENT")) throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

async function ensureDirectoryTree(bindingRoot, target) {
  const bindingIdentity = await assertPlainDirectory(bindingRoot, "Binding root before output creation");
  const relative = relativeBoundPath(bindingRoot, target, "Output root");
  let current = bindingRoot;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    try {
      await mkdir(current, { recursive: false });
    } catch (error) {
      if (!isErrno(error, "EEXIST")) throw error;
    }
    const identity = await assertPlainDirectory(current, `Output directory ${segment}`);
    relativeBoundPath(bindingIdentity.realPath, identity.realPath, `Resolved output directory ${segment}`);
  }
  return Object.freeze({ bindingIdentity, outputIdentity: await assertPlainDirectory(target, "Output root") });
}

export async function prepareDeployedHostCandidateOutput({ bindingRoot, outputRoot, artifactRoot }) {
  const bindingBefore = await assertPlainDirectory(bindingRoot, "Binding root");
  const artifactIdentity = await assertPlainDirectory(artifactRoot, "Artifact root");
  const projectedOutputReal = await projectRealPathBeforeCreation(outputRoot, "Output root");
  relativeBoundPath(bindingBefore.realPath, projectedOutputReal, "Projected output root");
  requireRootIsolation(projectedOutputReal, artifactIdentity.realPath, "DEPLOYED_HOST_CANDIDATE_ROOTS_REBOUND");
  const roots = await ensureDirectoryTree(bindingRoot, outputRoot);
  relativeBoundPath(roots.bindingIdentity.realPath, roots.outputIdentity.realPath, "Resolved output root");
  relativeBoundPath(roots.bindingIdentity.realPath, artifactIdentity.realPath, "Resolved artifact root");
  requireRootIsolation(roots.outputIdentity.realPath, artifactIdentity.realPath, "DEPLOYED_HOST_CANDIDATE_ROOTS_REBOUND");
  if ((await readdir(outputRoot)).length !== 0) {
    fail("DEPLOYED_HOST_CANDIDATE_OUTPUT_NOT_EMPTY", "Output root must be new or empty and is never resumed.");
  }
  return Object.freeze({
    bindingRoot,
    bindingIdentity: roots.bindingIdentity,
    outputRoot,
    outputIdentity: roots.outputIdentity,
    artifactRoot,
    artifactIdentity
  });
}

async function assertOutputLock(prepared) {
  const [bindingIdentity, outputIdentity, artifactIdentity] = await Promise.all([
    assertPlainDirectory(prepared.bindingRoot, "Binding root"),
    assertPlainDirectory(prepared.outputRoot, "Output root"),
    assertPlainDirectory(prepared.artifactRoot, "Artifact root")
  ]);
  if (
    !sameFilesystemIdentity(bindingIdentity, prepared.bindingIdentity)
    || !sameFilesystemIdentity(outputIdentity, prepared.outputIdentity)
    || !sameFilesystemIdentity(artifactIdentity, prepared.artifactIdentity)
  ) fail("DEPLOYED_HOST_CANDIDATE_ROOT_REBOUND", "Candidate binding, output, or artifact root changed during collection.");
  requireRootIsolation(outputIdentity.realPath, artifactIdentity.realPath, "DEPLOYED_HOST_CANDIDATE_ROOTS_REBOUND");
}

async function bindWrittenFile(prepared, filePath) {
  const handle = await open(filePath, "r");
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([handle.stat(), lstat(filePath), realpath(filePath)]);
    if (
      !before.isFile() || !pathBefore.isFile() || pathBefore.isSymbolicLink()
      || before.nlink !== 1 || pathBefore.nlink !== 1 || before.size <= 0
      || before.dev !== pathBefore.dev || before.ino !== pathBefore.ino
    ) fail("DEPLOYED_HOST_CANDIDATE_FILE_UNSAFE", "Candidate file is not a single-link regular file.");
    relativeBoundPath(prepared.outputIdentity.realPath, resolvedBefore, "Candidate output file");
    const bytes = await handle.readFile();
    const [after, pathAfter, resolvedAfter] = await Promise.all([handle.stat(), lstat(filePath), realpath(filePath)]);
    if (
      after.dev !== before.dev || after.ino !== before.ino || after.birthtimeMs !== before.birthtimeMs
      || after.size !== before.size || after.nlink !== 1
      || pathAfter.dev !== before.dev || pathAfter.ino !== before.ino || pathAfter.size !== before.size
      || pathAfter.nlink !== 1 || pathAfter.isSymbolicLink() || resolvedAfter !== resolvedBefore
      || bytes.byteLength !== before.size
    ) fail("DEPLOYED_HOST_CANDIDATE_FILE_REBOUND", "Candidate file changed while it was bound.");
    return Object.freeze({
      path: relativeBoundPath(prepared.bindingRoot, filePath, "Candidate file binding"),
      size: bytes.byteLength,
      sha256: sha256(bytes)
    });
  } finally {
    await handle.close();
  }
}

async function atomicWriteExclusive(prepared, fileName, bytes) {
  if (
    typeof fileName !== "string" || !/^[A-Za-z0-9._-]+$/u.test(fileName)
    || !Buffer.isBuffer(bytes) || bytes.byteLength === 0
  ) fail("DEPLOYED_HOST_CANDIDATE_WRITE_INPUT_INVALID", "Candidate write input is invalid.");
  await assertOutputLock(prepared);
  const destination = path.join(prepared.outputRoot, fileName);
  const expectedBinding = Object.freeze({
    path: relativeBoundPath(prepared.bindingRoot, destination, "Candidate file binding"),
    size: bytes.byteLength,
    sha256: sha256(bytes)
  });
  try {
    await lstat(destination);
    fail("DEPLOYED_HOST_CANDIDATE_OVERWRITE_REFUSED", `Candidate output exists: ${fileName}.`);
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
  const temporary = path.join(prepared.outputRoot, `.candidate-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await assertOutputLock(prepared);
    await link(temporary, destination);
    await unlink(temporary);
    await assertOutputLock(prepared);
    const binding = await bindWrittenFile(prepared, destination);
    if (canonicalJson(binding) !== canonicalJson(expectedBinding)) {
      fail(
        "DEPLOYED_HOST_CANDIDATE_OUTPUT_BINDING_MISMATCH",
        "Published candidate file does not match its intended path, size, and SHA-256 binding."
      );
    }
    return Object.freeze({ filePath: destination, binding });
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function terminalCommitMarkerBytes(receiptBytes) {
  const bytes = Buffer.from(`${sha256(receiptBytes)}\n`, "utf8");
  if (bytes.byteLength !== TERMINAL_COMMIT_MARKER_BYTES) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_BYTES_INVALID",
      "Terminal commit marker must be one lowercase SHA-256 plus LF."
    );
  }
  return bytes;
}

async function assertExactPreparedOutputNames(preparedOutput) {
  await assertOutputLock(preparedOutput);
  const names = (await readdir(preparedOutput.outputRoot)).sort();
  if (canonicalJson(names) !== canonicalJson(PREPARED_OUTPUT_FILE_NAMES)) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_OUTPUT_SET_REBOUND",
      "Prepared candidate output must contain exactly three attachments, the receipt, and the pending terminal marker."
    );
  }
}

async function rebindDeployedHostCandidatePreparedOutput({
  preparedOutput,
  attachments,
  writtenReceipt,
  writtenPendingCommit
}) {
  // Every prepared output is rebound through one held read before commit.
  // This is endpoint revalidation, not a continuous multi-file handle epoch.
  await assertExactPreparedOutputNames(preparedOutput);
  for (const role of DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES) {
    const expected = attachments.find((entry) => entry.role === role);
    if (!expected) {
      fail("DEPLOYED_HOST_CANDIDATE_ATTACHMENT_BINDING_MISMATCH", `Missing expected ${role} attachment.`);
    }
    const rebound = await bindWrittenFile(
      preparedOutput,
      path.join(preparedOutput.outputRoot, ATTACHMENT_FILE_NAMES[role])
    );
    if (canonicalJson({ role, ...rebound }) !== canonicalJson(expected)) {
      fail(
        "DEPLOYED_HOST_CANDIDATE_ATTACHMENT_BINDING_MISMATCH",
        `${role} output changed after receipt publication.`
      );
    }
  }
  const reboundReceipt = await bindWrittenFile(preparedOutput, writtenReceipt.filePath);
  if (canonicalJson(reboundReceipt) !== canonicalJson(writtenReceipt.binding)) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_RECEIPT_BINDING_MISMATCH",
      "Host receipt output changed after receipt publication."
    );
  }
  const reboundPendingCommit = await bindWrittenFile(preparedOutput, writtenPendingCommit.filePath);
  if (canonicalJson(reboundPendingCommit) !== canonicalJson(writtenPendingCommit.binding)) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_BINDING_MISMATCH",
      "Pending terminal commit marker changed before publication."
    );
  }
  await assertExactPreparedOutputNames(preparedOutput);
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

function sameRealPath(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length === 0 || right.length === 0) return false;
  const normalize = (value) => {
    const normalized = path.normalize(value);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return normalize(left) === normalize(right);
}

function exactFilesystemIdentity(value) {
  return exactKeys(value, ["realPath", "dev", "ino", "birthtimeMs"])
    && typeof value.realPath === "string"
    && value.realPath.length > 0
    && [value.dev, value.ino, value.birthtimeMs].every((item) => typeof item === "number" && Number.isFinite(item));
}

function exactArtifactEntry(value) {
  return exactKeys(value, ["path", "size", "sha256"])
    && typeof value.path === "string"
    && ARTIFACT_PATH_PATTERN.test(value.path)
    && Number.isSafeInteger(value.size)
    && value.size > 0
    && SHA256_PATTERN.test(value.sha256 ?? "");
}

function assertArtifactIdentityLockBinding(verifiedArtifact, expectation) {
  const binding = expectation?.artifactIdentityLockBinding;
  const verification = verifiedArtifact?.verificationSnapshot;
  const verifiedLock = verification?.lock;
  const expectedArtifacts = expectation?.artifacts;
  const expectedServiceWorkers = Array.isArray(expectedArtifacts)
    ? expectedArtifacts.filter((entry) => entry?.path === "sw.js")
    : [];
  const expectedServiceWorker = expectedServiceWorkers.length === 1 ? expectedServiceWorkers[0] : null;
  const expectedPwaManifests = Array.isArray(expectedArtifacts)
    ? expectedArtifacts.filter((entry) => entry?.path === "manifest.webmanifest")
    : [];
  const expectedPwaManifest = expectedPwaManifests.length === 1 ? expectedPwaManifests[0] : null;
  let lockArtifactRoot = null;
  try {
    if (exactFilesystemIdentity(verification?.bindingRoot) && exactFilesystemIdentity(verification?.artifactRoot)) {
      lockArtifactRoot = relativeBoundPath(
        verification.bindingRoot.realPath,
        verification.artifactRoot.realPath,
        "Snapshotted artifact root"
      );
    }
  } catch {
    // The stable mismatch below is sufficient and does not expose attacker-controlled paths.
  }
  const lockKeys = [
    "schemaVersion", "recordType", "channel", "evidenceId", "createdAt", "artifactRoot",
    "descriptor", "manifestDigest", "buildVersion", "fileCount", "artifactSetDigest", "files", "lockDigest"
  ];
  let locallyRecomputedLockDigest = null;
  if (exactKeys(verifiedLock, lockKeys)) {
    const { lockDigest: _lockDigest, ...unsignedLock } = verifiedLock;
    locallyRecomputedLockDigest = sha256(canonicalJson(unsignedLock));
  }
  if (
    !exactKeys(verifiedArtifact, [
      "releaseEvidenceId", "descriptor", "buildVersion", "artifactSetDigest",
      "pwaManifest", "serviceWorker", "lockDigest", "verificationSnapshot"
    ])
    || !exactKeys(verification, [
      "bindingRoot", "artifactRoot", "lockFile", "verifierLockFileSha256", "lock"
    ])
    || !exactFilesystemIdentity(verification?.bindingRoot)
    || !exactFilesystemIdentity(verification?.artifactRoot)
    || !exactKeys(verification?.lockFile, ["realPath", "dev", "ino", "birthtimeMs", "size", "nlink", "sha256"])
    || !exactFilesystemIdentity({
      realPath: verification?.lockFile?.realPath,
      dev: verification?.lockFile?.dev,
      ino: verification?.lockFile?.ino,
      birthtimeMs: verification?.lockFile?.birthtimeMs
    })
    || !Number.isSafeInteger(verification?.lockFile?.size)
    || verification.lockFile.size <= 0
    || verification?.lockFile?.nlink !== 1
    || !SHA256_PATTERN.test(verification?.lockFile?.sha256 ?? "")
    || !exactKeys(verifiedLock, lockKeys)
    || verifiedLock.schemaVersion !== 1
    || verifiedLock.recordType !== "release_artifact_identity_lock"
    || verifiedLock.channel !== "default-v13"
    || typeof verifiedLock.createdAt !== "string"
    || !Number.isFinite(Date.parse(verifiedLock.createdAt))
    || verifiedLock.artifactRoot !== lockArtifactRoot
    || canonicalJson(verifiedLock.descriptor) !== canonicalJson(expectation?.descriptor)
    || verifiedLock.manifestDigest !== expectation?.releaseIdentity?.manifestDigest
    || verifiedLock.buildVersion !== expectation?.releaseIdentity?.buildVersion
    || verifiedLock.evidenceId !== expectation?.evidenceId
    || !Array.isArray(expectedArtifacts)
    || expectedArtifacts.length === 0
    || expectedArtifacts.some((entry) => !exactArtifactEntry(entry))
    || new Set(expectedArtifacts.map((entry) => entry.path)).size !== expectedArtifacts.length
    || expectation?.artifactSetDigest !== sha256(canonicalJson(expectedArtifacts))
    || verifiedLock.fileCount !== expectedArtifacts.length
    || canonicalJson(verifiedLock.files) !== canonicalJson(expectedArtifacts)
    || verifiedLock.artifactSetDigest !== expectation?.artifactSetDigest
    || verifiedLock.lockDigest !== locallyRecomputedLockDigest
    || expectedServiceWorker === null
    || !exactArtifactEntry(verifiedArtifact?.serviceWorker)
    || canonicalJson(verifiedArtifact.serviceWorker) !== canonicalJson(expectedServiceWorker)
    || expectedPwaManifest === null
    || !exactArtifactEntry(verifiedArtifact?.pwaManifest)
    || canonicalJson(verifiedArtifact.pwaManifest) !== canonicalJson(expectedPwaManifest)
    || !exactKeys(binding, ["path", "realPath", "sha256", "lockDigest", "artifactSetDigest"])
    || typeof binding.path !== "string"
    || !ARTIFACT_PATH_PATTERN.test(binding.path)
    || typeof binding.realPath !== "string"
    || binding.realPath.length === 0
    || !SHA256_PATTERN.test(binding.sha256 ?? "")
    || !SHA256_PATTERN.test(binding.lockDigest ?? "")
    || !SHA256_PATTERN.test(binding.artifactSetDigest ?? "")
    || !sameRealPath(verification?.lockFile?.realPath, binding.realPath)
    || verification?.lockFile?.sha256 !== binding.sha256
    || verification?.verifierLockFileSha256 !== binding.sha256
    || verifiedArtifact?.lockDigest !== binding.lockDigest
    || verifiedLock?.lockDigest !== binding.lockDigest
    || verifiedArtifact?.artifactSetDigest !== binding.artifactSetDigest
    || verifiedLock?.artifactSetDigest !== binding.artifactSetDigest
    || expectation?.artifactSetDigest !== binding.artifactSetDigest
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_ARTIFACT_IDENTITY_LOCK_MISMATCH",
      "Supplied candidate artifact lock is not the exact Release Evidence identity lock."
    );
  }
  return binding;
}

function snapshotCore(verifiedArtifact, expectation) {
  assertArtifactIdentityLockBinding(verifiedArtifact, expectation);
  if (
    verifiedArtifact.releaseEvidenceId !== expectation.evidenceId
    || verifiedArtifact.artifactSetDigest !== expectation.artifactSetDigest
    || canonicalJson(verifiedArtifact.descriptor) !== canonicalJson(expectation.descriptor)
    || verifiedArtifact.buildVersion !== expectation.releaseIdentity.buildVersion
    || verifiedArtifact.pwaManifest.sha256 !== sha256(expectation.manifestBytes)
    || verifiedArtifact.serviceWorker.sha256 !== sha256(expectation.serviceWorkerBytes)
  ) fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_EXPECTATION_MISMATCH", "Artifact lock and deployed-host expectation disagree.");
  return {
    verifiedArtifact: structuredClone(verifiedArtifact),
    deployedHostExpectation: expectationProjection(expectation)
  };
}

function artifactSnapshotDocument({ phase, capturedAt, verifiedArtifact, expectation }) {
  const core = snapshotCore(verifiedArtifact, expectation);
  return Object.freeze({
    schemaVersion: 1,
    recordType: "deployed_host_candidate_artifact_snapshot_v1",
    phase,
    capturedAt,
    snapshotDigest: sha256(canonicalJson(core)),
    ...core
  });
}

async function loadInitialArtifactState({ cwd, candidate, policy }) {
  const verifiedArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const expectation = await loadDeployedHostExpectation({
    cwd,
    artifactRoot: candidate.artifactRoot,
    evidencePath: path.join(candidate.artifactRoot, policy.releaseEvidencePath.slice(1)),
    policy,
    policyPath: POLICY_PATH
  });
  const capturedAt = new Date().toISOString();
  return Object.freeze({
    verifiedArtifact,
    expectation,
    document: artifactSnapshotDocument({ phase: "initial", capturedAt, verifiedArtifact, expectation })
  });
}

async function loadFinalArtifactState({ cwd, candidate, policy, initial }) {
  let verifiedArtifact;
  let expectation;
  try {
    verifiedArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(candidate, initial.verifiedArtifact);
    expectation = await loadDeployedHostExpectation({
      cwd,
      artifactRoot: candidate.artifactRoot,
      evidencePath: path.join(candidate.artifactRoot, policy.releaseEvidencePath.slice(1)),
      policy,
      policyPath: POLICY_PATH
    });
    assertDeployedPwaCandidateArtifactIdentityStable(initial.verifiedArtifact, verifiedArtifact);
    if (canonicalJson(expectationProjection(initial.expectation)) !== canonicalJson(expectationProjection(expectation))) {
      fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_REBOUND", "Deployed-host artifact expectation changed during collection.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DEPLOYED_HOST_CANDIDATE_ARTIFACT_REBOUND:")) throw error;
    fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_REBOUND", `Final artifact verification failed closed: ${error instanceof Error ? error.message : String(error)}.`);
  }
  const capturedAt = new Date().toISOString();
  return Object.freeze({
    verifiedArtifact,
    expectation,
    document: artifactSnapshotDocument({ phase: "final", capturedAt, verifiedArtifact, expectation })
  });
}

async function revalidateDeployedHostCandidateSourcesAfterReceipt({
  cwd,
  candidate,
  policy,
  initialCore,
  finalCore,
  policyBinding,
  preparedOutput,
  attachments,
  writtenReceipt,
  writtenPendingCommit
}) {
  // This is a complete post-publication endpoint revalidation. Schema 13 has
  // no mutation-epoch capability, so this does not exclude an interval ABA.
  const postPublicationArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(
    candidate,
    finalCore.verifiedArtifact
  );
  const postPublicationExpectation = await loadDeployedHostExpectation({
    cwd,
    artifactRoot: candidate.artifactRoot,
    evidencePath: path.join(candidate.artifactRoot, policy.releaseEvidencePath.slice(1)),
    policy,
    policyPath: POLICY_PATH
  });
  const postPublicationPolicyBinding = validateDeployedHostPolicyBinding({
    policy,
    expectation: postPublicationExpectation
  });
  const postPublicationCore = snapshotCore(postPublicationArtifact, postPublicationExpectation);
  if (
    canonicalJson(postPublicationCore) !== canonicalJson(initialCore)
    || canonicalJson(postPublicationCore) !== canonicalJson(finalCore)
    || canonicalJson(postPublicationPolicyBinding) !== canonicalJson(policyBinding)
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_ARTIFACT_REBOUND",
      "Artifact, Release Evidence, identity lock, or checked policy changed after receipt publication."
    );
  }
  await assertOutputLock(preparedOutput);
  await rebindDeployedHostCandidatePreparedOutput({
    preparedOutput,
    attachments,
    writtenReceipt,
    writtenPendingCommit
  });
}

function canonicalTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("DEPLOYED_HOST_CANDIDATE_TIME_INVALID", `${label} must be a canonical UTC timestamp.`);
  }
  return parsed;
}

export async function resolvePublicCandidateDns({ origin, lookupImpl = lookup }) {
  origin = requirePublicDnsHttpsOrigin(origin);
  if (typeof lookupImpl !== "function") fail("DEPLOYED_HOST_CANDIDATE_DNS_INPUT_INVALID", "DNS lookup implementation is invalid.");
  const hostname = new URL(origin).hostname;
  let timer;
  try {
    const records = await Promise.race([
      lookupImpl(hostname, { all: true, verbatim: true }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("DNS_TIMEOUT")), DNS_TIMEOUT_MS);
        timer.unref?.();
      })
    ]);
    const exactRecords = Array.isArray(records)
      ? records.map((record) => ({ address: record?.address, family: record?.family }))
      : records;
    validateResolvedPublicAddresses(exactRecords);
    const normalized = exactRecords
      .map((record) => ({ address: record.address.toLowerCase(), family: record.family }))
      .sort((left, right) => left.family - right.family || left.address.localeCompare(right.address));
    return Object.freeze({
      schemaVersion: 1,
      recordType: "deployed_host_candidate_dns_observation_v1",
      hostname,
      observedAt: new Date().toISOString(),
      allResolvedAddressesPublic: true,
      records: Object.freeze(normalized),
      pinnedAddress: Object.freeze({ ...normalized[0] }),
      connectionPolicy: "all_records_validated_single_address_pinned_per_request"
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DNS_TIMEOUT") {
      fail("DEPLOYED_HOST_CANDIDATE_DNS_TIMEOUT", "Public DNS preflight timed out.");
    }
    if (error instanceof Error && error.message.startsWith("DEPLOYED_HOST_CANDIDATE_")) throw error;
    fail("DEPLOYED_HOST_CANDIDATE_DNS_REJECTED", `Public DNS preflight failed: ${error instanceof Error ? error.message : String(error)}.`);
  } finally {
    clearTimeout(timer);
  }
}

function rawHeaderPairs(rawHeaders, label) {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    fail("DEPLOYED_HOST_CANDIDATE_RAW_HEADERS_INVALID", `${label} must contain alternating raw name/value strings.`);
  }
  const pairs = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (
      typeof name !== "string" || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(name)
      || typeof value !== "string" || /[\r\n\u0000]/u.test(value)
    ) fail("DEPLOYED_HOST_CANDIDATE_RAW_HEADERS_INVALID", `${label} contains a malformed header pair.`);
    pairs.push(Object.freeze({ name, value }));
  }
  return Object.freeze(pairs);
}

function samePinnedAddress(remoteAddress, pinnedAddress) {
  const family = isIP(remoteAddress);
  if (family !== pinnedAddress.family) return false;
  const type = family === 4 ? "ipv4" : "ipv6";
  const block = new BlockList();
  block.addAddress(pinnedAddress.address, type);
  return block.check(remoteAddress, type);
}

function socketObservation(socket, url, pinnedAddress) {
  const remoteAddress = socket.remoteAddress;
  if (typeof remoteAddress !== "string" || !samePinnedAddress(remoteAddress, pinnedAddress)) {
    fail("DEPLOYED_HOST_CANDIDATE_PINNED_ADDRESS_MISMATCH", "Connected socket does not use the DNS-preflighted pinned address.");
  }
  const tls = url.protocol === "https:";
  if (tls && socket.authorized !== true) {
    fail("DEPLOYED_HOST_CANDIDATE_TLS_UNAUTHORIZED", "HTTPS socket did not complete authorized certificate validation.");
  }
  const certificate = tls ? socket.getPeerCertificate?.() : null;
  return Object.freeze({
    remoteAddress,
    remoteFamily: socket.remoteFamily ?? null,
    pinnedAddress: structuredClone(pinnedAddress),
    tls,
    tlsAuthorized: tls ? socket.authorized === true : null,
    tlsProtocol: tls ? (socket.getProtocol?.() ?? null) : null,
    alpnProtocol: tls && typeof socket.alpnProtocol === "string" && socket.alpnProtocol.length > 0
      ? socket.alpnProtocol
      : null,
    peerCertificateFingerprint256: tls && typeof certificate?.fingerprint256 === "string"
      ? certificate.fingerprint256
      : null
  });
}

function pinnedLookup(expectedHostname, pinnedAddress) {
  return (hostname, options, callback) => {
    if (hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
      callback(new Error("PINNED_LOOKUP_HOSTNAME_REBOUND"));
      return;
    }
    if (options?.all === true) {
      callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
      return;
    }
    callback(null, pinnedAddress.address, pinnedAddress.family);
  };
}

function probeRequestUrl(plan, probe) {
  if (probe.probeClass === "redirect") return probe.from;
  if (probe.probeClass === "non-public") return probe.url;
  if (probe.probeClass === "content") return new URL(probe.path, `${plan.candidateScope.origin}/`).href;
  fail("DEPLOYED_HOST_CANDIDATE_PROBE_CLASS_INVALID", "Probe class is not one of the closed candidate classes.");
}

export async function requestPinnedHttpObservation({ plan, probe, pinnedAddress, sequence }) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    fail("DEPLOYED_HOST_CANDIDATE_REQUEST_SEQUENCE_INVALID", "Request sequence must be a non-negative integer.");
  }
  const requestUrl = probeRequestUrl(plan, probe);
  const url = new URL(requestUrl);
  const client = url.protocol === "https:" ? https : url.protocol === "http:" ? http : null;
  if (client === null) fail("DEPLOYED_HOST_CANDIDATE_REQUEST_PROTOCOL_INVALID", "Only HTTP and HTTPS probes are supported.");
  const maximumBodyBytes = probe.probeClass === "content" ? probe.size : AUXILIARY_BODY_LIMIT_BYTES;
  if (!Number.isSafeInteger(maximumBodyBytes) || maximumBodyBytes <= 0 || maximumBodyBytes > RESPONSE_BODY_LIMIT_BYTES) {
    fail("DEPLOYED_HOST_CANDIDATE_BODY_LIMIT_INVALID", "Probe body limit is invalid.");
  }
  const startedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const settleReject = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const requestHeaders = {
      "Accept-Encoding": "identity",
      "User-Agent": "hakimi-deployed-host-candidate/1"
    };
    const request = client.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: requestHeaders,
      agent: false,
      maxHeaderSize: 64 * 1024,
      rejectUnauthorized: true,
      servername: url.protocol === "https:" ? url.hostname : undefined,
      lookup: pinnedLookup(url.hostname, pinnedAddress)
    }, (response) => {
      const hasher = createHash("sha256");
      let size = 0;
      response.on("data", (chunk) => {
        if (settled) return;
        if (!(chunk instanceof Uint8Array)) {
          request.destroy();
          settleReject(new Error("DEPLOYED_HOST_CANDIDATE_BODY_READ_FAILED: response chunk is not bytes."));
          return;
        }
        size += chunk.byteLength;
        if (size > maximumBodyBytes) {
          request.destroy();
          settleReject(new Error("DEPLOYED_HOST_CANDIDATE_BODY_TOO_LARGE: response exceeded its bounded capture size."));
          return;
        }
        hasher.update(chunk);
      });
      response.on("error", (error) => settleReject(error));
      response.on("aborted", () => {
        settleReject(new Error("DEPLOYED_HOST_CANDIDATE_RESPONSE_ABORTED: response ended before the HTTP message completed."));
      });
      response.on("close", () => {
        if (!settled && response.complete !== true) {
          settleReject(new Error("DEPLOYED_HOST_CANDIDATE_RESPONSE_INCOMPLETE: response socket closed before message completion."));
        }
      });
      response.on("end", () => {
        if (settled) return;
        try {
          if (response.complete !== true) {
            fail("DEPLOYED_HOST_CANDIDATE_RESPONSE_INCOMPLETE", "Response ended without a complete HTTP message.");
          }
          const completedAt = new Date().toISOString();
          const document = Object.freeze({
            schemaVersion: 1,
            recordType: "deployed_host_http_response_observation_v1",
            probeId: probe.id,
            probeKind: probe.probeClass,
            sequence,
            request: Object.freeze({
              method: "GET",
              url: requestUrl,
              headers: Object.freeze([
                Object.freeze({ name: "Accept-Encoding", value: "identity" }),
                Object.freeze({ name: "User-Agent", value: requestHeaders["User-Agent"] })
              ]),
              redirectMode: "manual_no_follow",
              startedAt
            }),
            response: Object.freeze({
              status: response.statusCode ?? null,
              statusMessage: response.statusMessage ?? "",
              httpVersion: response.httpVersion,
              messageComplete: true,
              rawHeaders: rawHeaderPairs(response.rawHeaders, `${probe.id} response headers`),
              rawTrailers: rawHeaderPairs(response.rawTrailers, `${probe.id} response trailers`),
              body: Object.freeze({ size, sha256: hasher.digest("hex") }),
              socket: socketObservation(response.socket, url, pinnedAddress),
              completedAt
            })
          });
          settled = true;
          clearTimeout(timer);
          resolve(document);
        } catch (error) {
          settleReject(error);
        }
      });
    });
    request.on("error", (error) => settleReject(error));
    timer = setTimeout(() => {
      request.destroy();
      settleReject(new Error("DEPLOYED_HOST_CANDIDATE_REQUEST_TIMEOUT: HTTP observation timed out."));
    }, RESPONSE_TIMEOUT_MS);
    timer.unref?.();
    request.end();
  });
}

function normalizedHeaderValue(value) {
  return value.trim().replace(/[ \t]+/gu, " ");
}

function headerMap(pairs) {
  const map = new Map();
  for (const pair of pairs) {
    if (!exactKeys(pair, ["name", "value"])
      || typeof pair.name !== "string" || typeof pair.value !== "string"
      || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(pair.name)
      || /[\r\n\u0000]/u.test(pair.value)) {
      fail("DEPLOYED_HOST_CANDIDATE_RAW_HEADERS_INVALID", "Observation contains an invalid raw header pair.");
    }
    const name = pair.name.toLowerCase();
    const values = map.get(name) ?? [];
    values.push(pair.value);
    map.set(name, values);
  }
  return map;
}

function contentTypeMatches(value, allowedEssences) {
  const segments = value.split(";").map((segment) => segment.trim());
  const essence = segments.shift()?.toLowerCase() ?? "";
  if (!allowedEssences.includes(essence) || segments.some((segment) => segment.length === 0)) return false;
  const textual = essence.startsWith("text/") || essence.endsWith("+json") || essence.endsWith("+xml")
    || ["application/javascript", "application/json", "application/manifest+json", "image/svg+xml"].includes(essence);
  return segments.length === 0
    || (textual && segments.length === 1 && /^charset\s*=\s*(?:utf-8|"utf-8")$/iu.test(segments[0]));
}

function headerValues(map, name) {
  return Object.freeze([...(map.get(name.toLowerCase()) ?? [])]);
}

function exactSingleNormalizedHeader(map, name, expected) {
  const values = headerValues(map, name);
  return values.length === 1 && normalizedHeaderValue(values[0]) === normalizedHeaderValue(expected);
}

function encodingIsIdentity(map) {
  const values = headerValues(map, "content-encoding");
  return values.length === 0 || (values.length === 1 && values[0].trim().toLowerCase() === "identity");
}

function contentLengthMatches(map, size) {
  const values = headerValues(map, "content-length");
  return values.length === 0
    || (values.length === 1 && /^(0|[1-9][0-9]*)$/u.test(values[0]) && Number(values[0]) === size);
}

function baseObservationErrors({ plan, observation, probe, dns }) {
  if (!exactKeys(observation, ["schemaVersion", "recordType", "probeId", "probeKind", "sequence", "request", "response"])
    || observation.schemaVersion !== 1
    || observation.recordType !== "deployed_host_http_response_observation_v1"
    || observation.probeId !== probe.id
    || observation.probeKind !== probe.probeClass
    || !Number.isSafeInteger(observation.sequence)
    || !exactKeys(observation.request, ["method", "url", "headers", "redirectMode", "startedAt"])
    || observation.request.method !== "GET"
    || observation.request?.url !== probeRequestUrl(plan, probe)
    || canonicalJson(observation.request.headers) !== canonicalJson([
      { name: "Accept-Encoding", value: "identity" },
      { name: "User-Agent", value: "hakimi-deployed-host-candidate/1" }
    ])
    || observation.request?.redirectMode !== "manual_no_follow"
    || !exactKeys(observation.response, [
      "status", "statusMessage", "httpVersion", "messageComplete", "rawHeaders",
      "rawTrailers", "body", "socket", "completedAt"
    ])
    || !Number.isSafeInteger(observation.response.status)
    || observation.response.status < 100
    || observation.response.status > 599
    || typeof observation.response.statusMessage !== "string"
    || /[\r\n\u0000]/u.test(observation.response.statusMessage)
    || !["1.0", "1.1"].includes(observation.response.httpVersion)
    || observation.response.messageComplete !== true
    || !exactKeys(observation.response.body, ["size", "sha256"])
    || !SHA256_PATTERN.test(observation.response?.body?.sha256 ?? "")
    || !Number.isSafeInteger(observation.response?.body?.size)
    || observation.response.body.size < 0
    || !exactKeys(observation.response.socket, [
      "remoteAddress", "remoteFamily", "pinnedAddress", "tls", "tlsAuthorized",
      "tlsProtocol", "alpnProtocol", "peerCertificateFingerprint256"
    ])
    || canonicalJson(observation.response?.socket?.pinnedAddress) !== canonicalJson(dns.pinnedAddress)) {
    fail("DEPLOYED_HOST_CANDIDATE_OBSERVATION_INVALID", `${probe.id} observation shape or binding is invalid.`);
  }
  canonicalTimestamp(observation.request.startedAt, `${probe.id} request startedAt`);
  canonicalTimestamp(observation.response.completedAt, `${probe.id} response completedAt`);
  if (Date.parse(observation.request.startedAt) > Date.parse(observation.response.completedAt)) {
    fail("DEPLOYED_HOST_CANDIDATE_OBSERVATION_TIME_INVALID", `${probe.id} response precedes its request.`);
  }
  if (!Array.isArray(observation.response.rawHeaders) || !Array.isArray(observation.response.rawTrailers)) {
    fail("DEPLOYED_HOST_CANDIDATE_RAW_HEADERS_INVALID", `${probe.id} raw header arrays are missing.`);
  }
  const headers = headerMap(observation.response.rawHeaders);
  headerMap(observation.response.rawTrailers);
  const errors = [];
  const requestIsTls = new URL(observation.request.url).protocol === "https:";
  const socket = observation.response.socket;
  const expectedRemoteFamily = dns.pinnedAddress.family === 4 ? "IPv4" : "IPv6";
  if (
    typeof socket.remoteAddress !== "string"
    || !samePinnedAddress(socket.remoteAddress, dns.pinnedAddress)
    || socket.remoteFamily !== expectedRemoteFamily
    || socket.tls !== requestIsTls
    || (requestIsTls && (
      socket.tlsAuthorized !== true
      || typeof socket.tlsProtocol !== "string"
      || !/^TLSv1\.[23]$/u.test(socket.tlsProtocol)
      || (socket.alpnProtocol !== null && typeof socket.alpnProtocol !== "string")
      || typeof socket.peerCertificateFingerprint256 !== "string"
      || !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/u.test(socket.peerCertificateFingerprint256)
    ))
    || (!requestIsTls && (
      socket.tlsAuthorized !== null
      || socket.tlsProtocol !== null
      || socket.alpnProtocol !== null
      || socket.peerCertificateFingerprint256 !== null
    ))
  ) errors.push("PINNED_TRANSPORT_OR_TLS_MISMATCH");
  if (observation.response.rawTrailers.length !== 0) errors.push("UNEXPECTED_RESPONSE_TRAILERS");
  if (headerValues(headers, "transfer-encoding").length > 0 && headerValues(headers, "content-length").length > 0) {
    errors.push("TRANSFER_ENCODING_CONTENT_LENGTH_AMBIGUITY");
  }
  if (!encodingIsIdentity(headers)) errors.push("CONTENT_ENCODING_MISMATCH");
  if (!contentLengthMatches(headers, observation.response.body.size)) errors.push("CONTENT_LENGTH_MISMATCH");
  return { headers, errors };
}

function forbiddenHeadersAbsent(plan, headers) {
  return plan.forbiddenBehaviorResponseHeaders.every((name) => !headers.has(name.toLowerCase()));
}

function contentProbeResult({ plan, probe, observation, dns }) {
  const { headers, errors } = baseObservationErrors({ plan, probe, observation, dns });
  if (observation.response.status !== 200) errors.push("STATUS_MISMATCH");
  if (headers.has("location")) errors.push("UNEXPECTED_REDIRECT_LOCATION");
  if (!Object.entries(plan.securityHeaders).every(([name, value]) => exactSingleNormalizedHeader(headers, name, value))) {
    errors.push("SECURITY_HEADERS_MISMATCH");
  }
  if (headers.has(plan.forbiddenCspHeader)) errors.push("FORBIDDEN_CSP_HEADER");
  if (!forbiddenHeadersAbsent(plan, headers)) errors.push("FORBIDDEN_BEHAVIOR_HEADER");
  if (!exactSingleNormalizedHeader(headers, "cache-control", probe.cacheControl)) errors.push("CACHE_CONTROL_MISMATCH");
  const contentTypes = headerValues(headers, "content-type");
  if (contentTypes.length !== 1 || !contentTypeMatches(contentTypes[0], probe.contentTypes)) {
    errors.push("CONTENT_TYPE_MISMATCH");
  }
  if (observation.response.body.size !== probe.size || observation.response.body.sha256 !== probe.sha256) {
    errors.push("BODY_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    probeId: probe.id,
    probeClass: "content",
    contentKind: probe.kind,
    path: probe.path,
    url: observation.request.url,
    status: observation.response.status,
    bodySize: observation.response.body.size,
    bodySha256: observation.response.body.sha256,
    rawHeaderCount: observation.response.rawHeaders.length,
    cacheControlValues: headerValues(headers, "cache-control"),
    contentTypeValues: contentTypes,
    contentEncodingValues: headerValues(headers, "content-encoding"),
    contentLengthValues: headerValues(headers, "content-length"),
    locationValues: headerValues(headers, "location"),
    passed: errors.length === 0,
    errorCodes: Object.freeze(errors)
  });
}

function redirectProbeResult({ plan, probe, observation, dns }) {
  const { headers, errors } = baseObservationErrors({ plan, probe, observation, dns });
  const locations = headerValues(headers, "location");
  let resolvedLocation = null;
  try {
    if (locations.length === 1) resolvedLocation = new URL(locations[0], probe.from).href;
  } catch {
    // The stable mismatch code below is sufficient and does not echo malformed input.
  }
  if (!probe.allowedStatuses.includes(observation.response.status)) errors.push("REDIRECT_STATUS_MISMATCH");
  if (locations.length !== 1 || resolvedLocation !== probe.to) errors.push("REDIRECT_LOCATION_MISMATCH");
  if (!forbiddenHeadersAbsent(plan, headers)) errors.push("FORBIDDEN_BEHAVIOR_HEADER");
  return Object.freeze({
    probeId: probe.id,
    probeClass: "redirect",
    path: probe.path,
    from: probe.from,
    to: probe.to,
    status: observation.response.status,
    bodySize: observation.response.body.size,
    bodySha256: observation.response.body.sha256,
    rawHeaderCount: observation.response.rawHeaders.length,
    cacheControlValues: headerValues(headers, "cache-control"),
    contentTypeValues: headerValues(headers, "content-type"),
    contentEncodingValues: headerValues(headers, "content-encoding"),
    contentLengthValues: headerValues(headers, "content-length"),
    locationValues: locations,
    resolvedLocation,
    passed: errors.length === 0,
    errorCodes: Object.freeze(errors)
  });
}

function nonPublicProbeResult({ plan, probe, observation, dns }) {
  const { headers, errors } = baseObservationErrors({ plan, probe, observation, dns });
  if (!probe.allowedStatuses.includes(observation.response.status)) errors.push("NON_PUBLIC_ARTIFACT_EXPOSED");
  if (headers.has("location")) errors.push("UNEXPECTED_REDIRECT_LOCATION");
  if (!forbiddenHeadersAbsent(plan, headers)) errors.push("FORBIDDEN_BEHAVIOR_HEADER");
  return Object.freeze({
    probeId: probe.id,
    probeClass: "non-public",
    path: probe.path,
    url: probe.url,
    status: observation.response.status,
    bodySize: observation.response.body.size,
    bodySha256: observation.response.body.sha256,
    rawHeaderCount: observation.response.rawHeaders.length,
    cacheControlValues: headerValues(headers, "cache-control"),
    contentTypeValues: headerValues(headers, "content-type"),
    contentEncodingValues: headerValues(headers, "content-encoding"),
    contentLengthValues: headerValues(headers, "content-length"),
    locationValues: headerValues(headers, "location"),
    passed: errors.length === 0,
    errorCodes: Object.freeze(errors)
  });
}

export function evaluateDeployedHostCandidateObservations({ plan, dns, observations }) {
  if (
    plan?.trustClass !== "untrusted_candidate"
    || plan?.admissionStatus !== "not_admitted"
    || plan?.checkedPolicy?.deploymentPlatform !== "unselected"
    || plan?.checkedPolicy?.canonicalOrigin !== null
    || dns?.allResolvedAddressesPublic !== true
    || !Array.isArray(plan?.contentProbes)
    || !Array.isArray(plan?.redirectProbes)
    || !Array.isArray(plan?.nonPublicProbes)
    || !Array.isArray(observations)
  ) fail("DEPLOYED_HOST_CANDIDATE_EVALUATION_INPUT_INVALID", "Candidate plan, DNS, or observation input is not closed and exact.");
  for (const [probesForClass, expectedClass] of [
    [plan.contentProbes, "content"],
    [plan.redirectProbes, "redirect"],
    [plan.nonPublicProbes, "non-public"]
  ]) {
    if (probesForClass.some((probe) => probe?.probeClass !== expectedClass)) {
      fail("DEPLOYED_HOST_CANDIDATE_PROBE_CLASS_INVALID", "Probe class does not match its closed candidate matrix.");
    }
  }
  const probes = [...plan.contentProbes, ...plan.redirectProbes, ...plan.nonPublicProbes];
  if (observations.length !== probes.length) {
    fail("DEPLOYED_HOST_CANDIDATE_OBSERVATION_SET_INCOMPLETE", "Observation count does not match the exact candidate probe plan.");
  }
  const results = probes.map((probe, index) => {
    const observation = observations[index];
    if (probe.probeClass === "content") return contentProbeResult({ plan, probe, observation, dns });
    if (probe.probeClass === "redirect") return redirectProbeResult({ plan, probe, observation, dns });
    if (probe.probeClass === "non-public") return nonPublicProbeResult({ plan, probe, observation, dns });
    fail("DEPLOYED_HOST_CANDIDATE_PROBE_CLASS_INVALID", "Probe class is not one of the closed candidate classes.");
  });
  for (const [index, observation] of observations.entries()) {
    if (observation.sequence !== index) {
      fail("DEPLOYED_HOST_CANDIDATE_OBSERVATION_ORDER_INVALID", "Observation sequence does not match the exact plan order.");
    }
    if (index > 0 && Date.parse(observation.request.startedAt) < Date.parse(observations[index - 1].response.completedAt)) {
      fail("DEPLOYED_HOST_CANDIDATE_OBSERVATION_ORDER_INVALID", "HTTP observations overlap or run out of order.");
    }
  }
  const contentResults = results.filter((result) => result.probeClass === "content");
  const redirectResults = results.filter((result) => result.probeClass === "redirect");
  const nonPublicResults = results.filter((result) => result.probeClass === "non-public");
  const allPassed = (values) => values.length > 0 && values.every((result) => result.passed);
  const gates = Object.freeze({
    checkedPolicyRemainedUnselected: true,
    publicDnsAddressSetObserved: true,
    pinnedLookupObserved: results.every((result) => !result.errorCodes.includes("PINNED_TRANSPORT_OR_TLS_MISMATCH")),
    rawMultiValueHeadersRecorded: observations.every((observation) => Array.isArray(observation.response.rawHeaders)),
    networkMatrixCompleted: true,
    contentMatrixCandidateMatched: allPassed(contentResults),
    redirectMatrixCandidateMatched: allPassed(redirectResults),
    nonPublicControlsHiddenCandidateMatched: allPassed(nonPublicResults),
    candidateContractObserved: results.every((result) => result.passed)
  });
  return Object.freeze({
    schemaVersion: 1,
    resultType: "deployed_host_http_candidate_evaluation_v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    observationMatrixCompleted: true,
    candidateScope: structuredClone(plan.candidateScope),
    results: Object.freeze(results),
    gates,
    claims: Object.freeze({
      realHostVerified: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    })
  });
}

export async function captureDeployedHostCandidateObservations({
  plan,
  dns,
  requestImpl = requestPinnedHttpObservation,
  observationSource = "node_http_pinned_real_network_v1"
}) {
  if (typeof requestImpl !== "function") fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_INVALID", "Candidate request implementation is invalid.");
  if (requestImpl !== requestPinnedHttpObservation && observationSource !== "synthetic_injected_test_fixture") {
    fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_LABEL_INVALID", "Injected transport must remain explicitly synthetic.");
  }
  const probes = [...plan.contentProbes, ...plan.redirectProbes, ...plan.nonPublicProbes];
  const observations = [];
  for (const [sequence, probe] of probes.entries()) {
    observations.push(await requestImpl({ plan, probe, pinnedAddress: dns.pinnedAddress, sequence }));
  }
  return Object.freeze({
    observationSource,
    observations: Object.freeze(observations),
    evaluation: evaluateDeployedHostCandidateObservations({ plan, dns, observations })
  });
}

function validateWriterCandidate(candidate, preparedOutput) {
  const candidateKeys = [
    "origin", "platform", "bindingRoot", "outputRoot", "artifactRoot", "artifactLock",
    "releaseEvidenceId", "runId"
  ];
  if (!exactKeys(candidate, candidateKeys)) {
    fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", "Writer candidate input is not exact.");
  }
  const origin = requirePublicDnsHttpsOrigin(candidate.origin);
  if (origin !== candidate.origin || !PLATFORM_PATTERN.test(candidate.platform ?? "")) {
    fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", "Writer candidate origin or platform is invalid.");
  }
  if (!RUN_ID_PATTERN.test(candidate.runId ?? "") || !RELEASE_EVIDENCE_ID_PATTERN.test(candidate.releaseEvidenceId ?? "")) {
    fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", "Writer candidate run or Release Evidence identity is invalid.");
  }
  const bindingRoot = requireAbsoluteCanonicalPath(candidate.bindingRoot, "Writer candidate binding root");
  const outputRoot = requireAbsoluteCanonicalPath(candidate.outputRoot, "Writer candidate output root");
  const artifactRoot = requireAbsoluteCanonicalPath(candidate.artifactRoot, "Writer candidate artifact root");
  const artifactLock = requireAbsoluteCanonicalPath(candidate.artifactLock, "Writer candidate artifact lock");
  relativeBoundPath(bindingRoot, outputRoot, "Writer candidate output root");
  relativeBoundPath(bindingRoot, artifactRoot, "Writer candidate artifact root");
  relativeBoundPath(bindingRoot, artifactLock, "Writer candidate artifact lock");
  requireRootIsolation(outputRoot, artifactRoot, "DEPLOYED_HOST_CANDIDATE_ROOTS_REBOUND");
  if (rootsOverlap(artifactRoot, artifactLock)) {
    fail("DEPLOYED_HOST_CANDIDATE_LOCK_INSIDE_ARTIFACT", "Writer candidate lock must remain outside the artifact root.");
  }
  if (
    bindingRoot !== preparedOutput.bindingRoot
    || outputRoot !== preparedOutput.outputRoot
    || artifactRoot !== preparedOutput.artifactRoot
  ) fail("DEPLOYED_HOST_CANDIDATE_ROOT_REBOUND", "Writer candidate paths do not match the prepared output lock.");
  return Object.freeze({ origin, bindingRoot, outputRoot, artifactRoot, artifactLock });
}

async function validatePreparedOutputForWriter(preparedOutput) {
  if (!exactKeys(preparedOutput, [
    "bindingRoot", "bindingIdentity", "outputRoot", "outputIdentity", "artifactRoot", "artifactIdentity"
  ])) fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", "Prepared writer output is not exact.");
  for (const [identity, label] of [
    [preparedOutput.bindingIdentity, "binding"],
    [preparedOutput.outputIdentity, "output"],
    [preparedOutput.artifactIdentity, "artifact"]
  ]) {
    if (!exactKeys(identity, ["realPath", "dev", "ino", "birthtimeMs"]) || typeof identity.realPath !== "string") {
      fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", `Prepared ${label} filesystem identity is invalid.`);
    }
  }
  for (const [value, label] of [
    [preparedOutput.bindingRoot, "binding root"],
    [preparedOutput.outputRoot, "output root"],
    [preparedOutput.artifactRoot, "artifact root"]
  ]) {
    if (requireAbsoluteCanonicalPath(value, `Prepared ${label}`) !== value) {
      fail("DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID", `Prepared ${label} is not canonical.`);
    }
  }
  relativeBoundPath(preparedOutput.bindingRoot, preparedOutput.outputRoot, "Prepared output root");
  relativeBoundPath(preparedOutput.bindingRoot, preparedOutput.artifactRoot, "Prepared artifact root");
  requireRootIsolation(preparedOutput.outputRoot, preparedOutput.artifactRoot, "DEPLOYED_HOST_CANDIDATE_ROOTS_REBOUND");
  await assertOutputLock(preparedOutput);
  if ((await readdir(preparedOutput.outputRoot)).length !== 0) {
    fail("DEPLOYED_HOST_CANDIDATE_OUTPUT_NOT_EMPTY", "Writer requires a fresh empty output root.");
  }
}

function snapshotDocumentCore(document) {
  if (
    !exactKeys(document, [
      "schemaVersion", "recordType", "phase", "capturedAt", "snapshotDigest",
      "verifiedArtifact", "deployedHostExpectation"
    ])
    || document.schemaVersion !== 1
    || document.recordType !== "deployed_host_candidate_artifact_snapshot_v1"
    || !SHA256_PATTERN.test(document.snapshotDigest ?? "")
  ) fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_SNAPSHOT_INVALID", "Artifact snapshot document is invalid.");
  const core = {
    verifiedArtifact: document.verifiedArtifact,
    deployedHostExpectation: document.deployedHostExpectation
  };
  if (document.snapshotDigest !== sha256(canonicalJson(core))) {
    fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_SNAPSHOT_INVALID", "Artifact snapshot digest is invalid.");
  }
  canonicalTimestamp(document.capturedAt, `${document.phase} artifact capturedAt`);
  return core;
}

function validateDnsObservation(dns, candidateOrigin) {
  if (
    !exactKeys(dns, [
      "schemaVersion", "recordType", "hostname", "observedAt", "allResolvedAddressesPublic",
      "records", "pinnedAddress", "connectionPolicy"
    ])
    || dns.schemaVersion !== 1
    || dns.recordType !== "deployed_host_candidate_dns_observation_v1"
    || dns.hostname !== new URL(candidateOrigin).hostname
    || dns.allResolvedAddressesPublic !== true
    || dns.connectionPolicy !== "all_records_validated_single_address_pinned_per_request"
    || !Array.isArray(dns.records)
    || !exactKeys(dns.pinnedAddress, ["address", "family"])
  ) fail("DEPLOYED_HOST_CANDIDATE_DNS_DOCUMENT_INVALID", "DNS observation document is not exact.");
  canonicalTimestamp(dns.observedAt, "DNS observedAt");
  validateResolvedPublicAddresses(dns.records);
  if (!dns.records.some((record) => canonicalJson(record) === canonicalJson(dns.pinnedAddress))) {
    fail("DEPLOYED_HOST_CANDIDATE_DNS_DOCUMENT_INVALID", "Pinned address is not a member of the validated DNS record set.");
  }
  return dns;
}

async function writeDeployedHostCandidateReceiptImplementation({
  cwd,
  preparedOutput,
  candidate,
  policy,
  expectation,
  initialArtifact,
  httpObservations,
  finalArtifact,
  observationSource
}, testOnlyTerminalCommitFault) {
  if (typeof cwd !== "string" || !path.isAbsolute(cwd) || path.resolve(cwd) !== cwd) {
    fail("DEPLOYED_HOST_CANDIDATE_CWD_INVALID", "Writer cwd must be an explicit canonical absolute path.");
  }
  if (
    testOnlyTerminalCommitFault !== undefined
    && testOnlyTerminalCommitFault !== "create_target_directory_collision"
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_TEST_FAULT_INVALID",
      "The restricted terminal-commit test fault is invalid."
    );
  }
  await validatePreparedOutputForWriter(preparedOutput);
  const validatedCandidate = validateWriterCandidate(candidate, preparedOutput);
  const policyBinding = validateDeployedHostPolicyBinding({ policy, expectation });
  const initialCore = snapshotDocumentCore(initialArtifact);
  const finalCore = snapshotDocumentCore(finalArtifact);
  const locallyRebuiltInitialCore = snapshotCore(initialCore.verifiedArtifact, expectation);
  const locallyRebuiltFinalCore = snapshotCore(finalCore.verifiedArtifact, expectation);
  if (
    canonicalJson(initialCore) !== canonicalJson(locallyRebuiltInitialCore)
    || canonicalJson(finalCore) !== canonicalJson(locallyRebuiltFinalCore)
  ) fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_EXPECTATION_MISMATCH", "Artifact snapshot does not exactly match the locally verified expectation.");
  if (
    initialArtifact.phase !== "initial"
    || finalArtifact.phase !== "final"
    || canonicalJson(initialCore) !== canonicalJson(finalCore)
    || Date.parse(initialArtifact.capturedAt) > Date.parse(finalArtifact.capturedAt)
  ) fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_REBOUND", "Initial and final complete artifact snapshots differ.");
  if (
    !exactKeys(httpObservations, [
      "schemaVersion", "recordType", "trustClass", "admissionStatus", "observationSource",
      "candidateScope", "checkedPolicy", "dns", "plan", "planDigest", "observations", "evaluation"
    ])
    || httpObservations.schemaVersion !== 1
    || httpObservations.recordType !== "deployed_host_http_observation_set_v1"
    || httpObservations?.trustClass !== "untrusted_candidate"
    || httpObservations?.admissionStatus !== "not_admitted"
    || !exactKeys(httpObservations?.candidateScope, ["platform", "origin"])
    || httpObservations?.candidateScope?.origin !== candidate.origin
    || httpObservations?.candidateScope?.platform !== candidate.platform
    || !SHA256_PATTERN.test(httpObservations?.planDigest ?? "")
    || !Array.isArray(httpObservations?.observations)
    || httpObservations?.evaluation?.claims?.realHostVerified !== false
    || httpObservations?.evaluation?.claims?.publicDeploymentAuthorized !== false
  ) fail("DEPLOYED_HOST_CANDIDATE_HTTP_DOCUMENT_INVALID", "HTTP observation attachment is not an exact closed candidate document.");
  if (!["node_http_pinned_real_network_v1", "synthetic_injected_test_fixture"].includes(observationSource)) {
    fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_LABEL_INVALID", "Observation source is invalid.");
  }
  if (httpObservations.observationSource !== observationSource) {
    fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_LABEL_INVALID", "HTTP document and writer observation sources disagree.");
  }
  validateDnsObservation(httpObservations.dns, candidate.origin);
  const recomputedPlan = createUntrustedDeployedHostCandidatePlan({
    baseUrl: candidate.origin,
    candidatePlatform: candidate.platform,
    policy,
    expectation
  });
  if (canonicalJson(httpObservations.plan) !== canonicalJson(recomputedPlan)) {
    fail("DEPLOYED_HOST_CANDIDATE_HTTP_DOCUMENT_INVALID", "Caller plan does not match the locally recomputed candidate plan.");
  }
  const recomputedPlanDigest = sha256(canonicalJson(recomputedPlan));
  const recomputedEvaluation = evaluateDeployedHostCandidateObservations({
    plan: recomputedPlan,
    dns: httpObservations.dns,
    observations: httpObservations.observations
  });
  if (
    canonicalJson(expectationProjection(expectation)) !== canonicalJson(initialCore.deployedHostExpectation)
    || httpObservations.planDigest !== recomputedPlanDigest
    || canonicalJson(httpObservations.evaluation) !== canonicalJson(recomputedEvaluation)
    || !exactKeys(httpObservations.checkedPolicy, [
      "policyId", "deploymentPlatform", "canonicalOrigin", "byteSha256", "canonicalSha256"
    ])
    || httpObservations.checkedPolicy.policyId !== policyBinding.policyId
    || httpObservations.checkedPolicy.deploymentPlatform !== "unselected"
    || httpObservations.checkedPolicy.canonicalOrigin !== null
    || httpObservations.checkedPolicy.byteSha256 !== policyBinding.sha256
    || httpObservations.checkedPolicy.canonicalSha256 !== policyBinding.canonicalSha256
    || httpObservations.plan.checkedPolicy.policyId !== policyBinding.policyId
    || httpObservations.plan.checkedPolicy.deploymentPlatform !== "unselected"
    || httpObservations.plan.checkedPolicy.canonicalOrigin !== null
    || httpObservations.plan.expectedIdentity.evidenceId !== initialCore.verifiedArtifact.releaseEvidenceId
    || httpObservations.plan.expectedIdentity.artifactSetDigest !== initialCore.verifiedArtifact.artifactSetDigest
  ) fail("DEPLOYED_HOST_CANDIDATE_HTTP_DOCUMENT_INVALID", "HTTP plan, evaluation, policy bytes, or artifact identity binding is inconsistent.");
  if (
    candidate.releaseEvidenceId !== initialCore.verifiedArtifact.releaseEvidenceId
    || !sameRealPath(validatedCandidate.artifactLock, initialCore.verifiedArtifact.verificationSnapshot.lockFile.realPath)
  ) fail("DEPLOYED_HOST_CANDIDATE_ARTIFACT_IDENTITY_LOCK_MISMATCH", "Writer candidate does not name the snapshotted artifact identity lock.");
  const brandedRealNetworkObservation = REAL_NETWORK_HTTP_OBSERVATION_DOCUMENTS.has(httpObservations);
  if (
    brandedRealNetworkObservation !== (observationSource === "node_http_pinned_real_network_v1")
    || (brandedRealNetworkObservation && (
      expectation.expectationKind !== "schema-validated-release-evidence-expectation-v1"
      || initialCore.deployedHostExpectation.expectationKind !== "schema-validated-release-evidence-expectation-v1"
    ))
  ) fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_PROVENANCE_INVALID", "Real-network classification requires the private collector provenance brand and a schema-validated expectation.");
  const observationTimes = httpObservations.observations.flatMap((observation) => [
    Date.parse(observation.request.startedAt),
    Date.parse(observation.response.completedAt)
  ]);
  if (
    Date.parse(initialArtifact.capturedAt) > Date.parse(httpObservations.dns.observedAt)
    || observationTimes.length === 0
    || Date.parse(httpObservations.dns.observedAt) > observationTimes[0]
    || observationTimes.at(-1) > Date.parse(finalArtifact.capturedAt)
  ) fail("DEPLOYED_HOST_CANDIDATE_TIME_CHAIN_INVALID", "Artifact, DNS, HTTP, and final snapshot timestamps are not ordered.");
  const attachmentInputs = new Map([
    ["artifact-initial", jsonBytes(initialArtifact)],
    ["http-observations", jsonBytes(httpObservations)],
    ["artifact-final", jsonBytes(finalArtifact)]
  ]);
  const attachments = [];
  for (const role of DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES) {
    const written = await atomicWriteExclusive(preparedOutput, ATTACHMENT_FILE_NAMES[role], attachmentInputs.get(role));
    attachments.push(Object.freeze({ role, ...written.binding }));
  }
  const receiptId = `${candidate.runId}-host`;
  const identity = initialCore.verifiedArtifact;
  const realNetworkObservation = brandedRealNetworkObservation;
  const document = {
    schemaVersion: 1,
    receiptType: "deployed_host_http_receipt_candidate_v1",
    receiptId,
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    verificationKind: realNetworkObservation
      ? "real-network-candidate-observation"
      : "synthetic-offline-candidate-contract",
    observationSource,
    candidatePlatform: candidate.platform,
    targetOrigin: candidate.origin,
    checkedPolicy: {
      policyId: httpObservations.checkedPolicy.policyId,
      deploymentPlatform: "unselected",
      canonicalOrigin: null,
      byteSha256: httpObservations.checkedPolicy.byteSha256,
      canonicalSha256: httpObservations.checkedPolicy.canonicalSha256
    },
    releaseEvidenceId: identity.releaseEvidenceId,
    artifactSetDigest: identity.artifactSetDigest,
    buildVersion: identity.buildVersion,
    descriptor: structuredClone(identity.descriptor),
    networkCompleted: realNetworkObservation && recomputedEvaluation.observationMatrixCompleted,
    candidateContractObserved: realNetworkObservation && recomputedEvaluation.gates.candidateContractObserved,
    syntheticContractMatched: !realNetworkObservation && recomputedEvaluation.gates.candidateContractObserved,
    artifactSnapshotStable: true,
    attachments,
    rawAttachmentSetDigest: sha256(canonicalJson(attachments)),
    authorizationBoundary: {
      externalDeploymentExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    },
    claims: {
      realHostVerified: false,
      deploymentOperationObserved: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    },
    receiptDigest: "0".repeat(64),
    startedAt: initialArtifact.capturedAt,
    completedAt: finalArtifact.capturedAt
  };
  document.receiptDigest = receiptDigest(document);
  const receiptBytes = jsonBytes(document);
  const terminalCommitBytes = terminalCommitMarkerBytes(receiptBytes);
  const writtenReceipt = await atomicWriteExclusive(
    preparedOutput,
    RECEIPT_FILE_NAME,
    receiptBytes
  );
  const writtenPendingCommit = await atomicWriteExclusive(
    preparedOutput,
    DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME,
    terminalCommitBytes
  );
  await revalidateDeployedHostCandidateSourcesAfterReceipt({
    cwd,
    candidate,
    policy,
    initialCore,
    finalCore,
    policyBinding,
    preparedOutput,
    attachments,
    writtenReceipt,
    writtenPendingCommit
  });
  const pendingCommitPath = writtenPendingCommit.filePath;
  const terminalCommitPath = path.join(
    preparedOutput.outputRoot,
    DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME
  );
  const result = Object.freeze({
    receiptPath: writtenReceipt.filePath,
    receiptBinding: writtenReceipt.binding,
    terminalGateBinding: Object.freeze({
      path: relativeBoundPath(
        preparedOutput.bindingRoot,
        terminalCommitPath,
        "Host receipt terminal commit marker binding"
      ),
      size: terminalCommitBytes.byteLength,
      sha256: sha256(terminalCommitBytes),
      commitsReceiptSha256: writtenReceipt.binding.sha256
    }),
    document: immutableJsonSnapshot(document)
  });
  if (testOnlyTerminalCommitFault === "create_target_directory_collision") {
    // This restricted test seam cannot execute caller code or perform a commit.
    await mkdir(terminalCommitPath, { recursive: false });
  }
  // This native same-directory rename is the terminal fallible operation.
  // PREPARED roots remain loader-rejected; nothing after COMMITTED may throw.
  await rename(pendingCommitPath, terminalCommitPath);
  return result;
}

const HOST_RECEIPT_WRITER_INPUT_KEYS = Object.freeze([
  "cwd", "preparedOutput", "candidate", "policy", "expectation", "initialArtifact",
  "httpObservations", "finalArtifact", "observationSource"
]);

export async function writeDeployedHostCandidateReceipt(input) {
  if (!exactKeys(input, HOST_RECEIPT_WRITER_INPUT_KEYS)) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID",
      "Host receipt writer accepts only its exact public input shape."
    );
  }
  return writeDeployedHostCandidateReceiptImplementation(input, undefined);
}

export async function testOnlyWriteDeployedHostCandidateReceiptWithTerminalCommitFault(input) {
  if (
    !exactKeys(input, [...HOST_RECEIPT_WRITER_INPUT_KEYS, "terminalCommitFault"])
    || input.terminalCommitFault !== "create_target_directory_collision"
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_TEST_FAULT_INVALID",
      "Test-only writer accepts only the fixed target-directory collision fault."
    );
  }
  const { terminalCommitFault, ...writerInput } = input;
  return writeDeployedHostCandidateReceiptImplementation(writerInput, terminalCommitFault);
}

export async function collectDeployedHostCandidate(options = {}) {
  if (
    options === null
    || typeof options !== "object"
    || Array.isArray(options)
    || Object.keys(options).some((key) => !["environment", "cwd"].includes(key))
  ) {
    fail(
      "DEPLOYED_HOST_CANDIDATE_COLLECTOR_INPUT_INVALID",
      "Host collector accepts only optional environment and cwd inputs."
    );
  }
  const {
    environment = process.env,
    cwd = process.cwd()
  } = options;
  const candidate = parseDeployedHostCandidateEnvironment(environment);
  const policyBytes = await readFile(path.resolve(cwd, POLICY_PATH));
  let policy;
  try {
    policy = JSON.parse(policyBytes.toString("utf8"));
  } catch {
    fail("DEPLOYED_HOST_CANDIDATE_POLICY_INVALID", "Checked hosting policy is not valid JSON.");
  }
  const preparedOutput = await prepareDeployedHostCandidateOutput(candidate);
  const initial = await loadInitialArtifactState({ cwd, candidate, policy });
  const plan = createUntrustedDeployedHostCandidatePlan({
    baseUrl: candidate.origin,
    candidatePlatform: candidate.platform,
    policy,
    expectation: initial.expectation
  });
  const dns = await resolvePublicCandidateDns({ origin: candidate.origin });
  const captured = await captureDeployedHostCandidateObservations({ plan, dns });
  const final = await loadFinalArtifactState({ cwd, candidate, policy, initial });
  const httpObservations = Object.freeze({
    schemaVersion: 1,
    recordType: "deployed_host_http_observation_set_v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    observationSource: captured.observationSource,
    candidateScope: structuredClone(plan.candidateScope),
    checkedPolicy: Object.freeze({
      policyId: policy.policyId,
      deploymentPlatform: policy.deploymentPlatform,
      canonicalOrigin: policy.canonicalOrigin,
      byteSha256: initial.expectation.policyBinding.sha256,
      canonicalSha256: initial.expectation.policyBinding.canonicalSha256
    }),
    dns,
    plan,
    planDigest: sha256(canonicalJson(plan)),
    observations: captured.observations,
    evaluation: captured.evaluation
  });
  if (captured.observationSource !== "node_http_pinned_real_network_v1") {
    fail("DEPLOYED_HOST_CANDIDATE_TRANSPORT_PROVENANCE_INVALID", "Collector default transport provenance was not preserved.");
  }
  REAL_NETWORK_HTTP_OBSERVATION_DOCUMENTS.add(httpObservations);
  return writeDeployedHostCandidateReceipt({
    cwd: path.resolve(cwd),
    preparedOutput,
    candidate,
    policy,
    expectation: initial.expectation,
    initialArtifact: initial.document,
    httpObservations,
    finalArtifact: final.document,
    observationSource: captured.observationSource
  });
}

async function runCli() {
  let result;
  try {
    result = await collectDeployedHostCandidate();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "not_admitted",
      usableReceiptWritten: false,
      outputDiscardRequired: true,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const successLine = `${JSON.stringify({
    status: result.document.status,
    trustClass: result.document.trustClass,
    receiptPath: result.receiptPath,
    receiptDigest: result.document.receiptDigest,
    terminalCommitMarkerVerified: true,
    terminalGateBinding: result.terminalGateBinding,
    candidateContractObserved: result.document.candidateContractObserved,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  }, null, 2)}\n`;
  try {
    process.stdout.write(successLine);
  } catch {
    // The terminal rename already committed the disk package. A broken output
    // stream must not reclassify it as an uncommitted candidate root.
    process.exitCode = 1;
  }
  if (!result.document.candidateContractObserved) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
