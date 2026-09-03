import { randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  stat,
  unlink
} from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

import { parseExpression } from "@babel/parser";

import {
  canonicalJson,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";
import { verifyReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";

export const DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS = Object.freeze({
  origin: "HAKIMI_DEPLOYED_PWA_CANDIDATE_ORIGIN",
  outputRoot: "HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT",
  bindingRoot: "HAKIMI_DEPLOYED_PWA_CANDIDATE_BINDING_ROOT",
  artifactRoot: "HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_DEPLOYED_PWA_CANDIDATE_RELEASE_EVIDENCE_ID",
  runId: "HAKIMI_DEPLOYED_PWA_CANDIDATE_RUN_ID"
});

export const DEPLOYED_PWA_CANDIDATE_ATTACHMENT_ROLES = Object.freeze([
  "browser-version",
  "profile-preflight",
  "browser-manifest-audit",
  "remote-pwa-manifest-body",
  "network-events",
  "controller-script-meta",
  "controller-source",
  "remote-service-worker-body",
  "case-revision-before",
  "case-revision-after"
]);

export const DEPLOYED_PWA_CANDIDATE_ROUTE_IDS = Object.freeze([
  "online-root",
  "offline-settings-data",
  "offline-case-revision",
  "offline-help-cold-start",
  "offline-help-reload"
]);

export const DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR = Object.freeze({
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

const ARTIFACT_PATH_PATTERN = /^(?!\/)(?!\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\/\.{1,2}(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const CANONICAL_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/u;
const CAPTURE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RELEASE_EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;
const CASE_REVISION_PATH_PATTERN = /^\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/revisions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/u;
const PROJECTS = Object.freeze(["msedge", "chrome"]);
const ATTACHMENT_FILE_NAMES = Object.freeze({
  "browser-version": "browser-version.json",
  "profile-preflight": "profile-preflight.json",
  "browser-manifest-audit": "browser-manifest-audit.json",
  "remote-pwa-manifest-body": "remote-pwa-manifest-body.webmanifest",
  "network-events": "network-events.json",
  "controller-script-meta": "controller-script-meta.json",
  "controller-source": "controller-source.js",
  "remote-service-worker-body": "remote-service-worker-body.js",
  "case-revision-before": "case-revision-before.json",
  "case-revision-after": "case-revision-after.json"
});
const PWA_MANIFEST_ARTIFACT_PATH = "manifest.webmanifest";
const INSTALLABILITY_EVIDENCE_METHOD = "cdp_page_get_installability_errors_v1";
const PROCESSED_MANIFEST_EVIDENCE_METHOD = "cdp_page_get_app_manifest_v1";
const REMOTE_MANIFEST_EVIDENCE_METHOD = "browser_context_request_identity_v1";

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function isErrno(error, code) {
  return error !== null
    && typeof error === "object"
    && Reflect.get(error, "code") === code;
}

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKnownKeys(value, requiredKeys, optionalKeys = []) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  return requiredKeys.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => allowed.has(key));
}

function walkJsonAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) walkJsonAst(child, visit);
    } else if (value && typeof value === "object") {
      walkJsonAst(value, visit);
    }
  }
}

function parseStrictJsonBytes(bytes, label) {
  if (!Buffer.isBuffer(bytes)) {
    fail("DEPLOYED_PWA_CANDIDATE_MANIFEST_BYTES_INVALID", `${label} must be bytes.`);
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("DEPLOYED_PWA_CANDIDATE_MANIFEST_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM.`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_UTF8_INVALID",
      `${label} is not strict UTF-8: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceType: "script",
      sourceFilename: label,
      errorRecovery: false,
      attachComment: false
    });
  } catch (error) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_JSON_INVALID",
      `${label} cannot be inspected as strict JSON: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
  walkJsonAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (
        property.type !== "ObjectProperty"
        || property.computed !== false
        || property.key?.type !== "StringLiteral"
      ) {
        fail("DEPLOYED_PWA_CANDIDATE_MANIFEST_JSON_INVALID", `${label} contains a non-JSON object property.`);
      }
      if (keys.has(property.key.value)) {
        fail(
          "DEPLOYED_PWA_CANDIDATE_MANIFEST_JSON_DUPLICATE_KEY",
          `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`
        );
      }
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_JSON_INVALID",
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("DEPLOYED_PWA_CANDIDATE_ENV_MISSING", `${key} must be an explicit non-empty value without surrounding whitespace.`);
  }
  return value;
}

function requireAbsoluteCanonicalPath(value, label) {
  if (!path.isAbsolute(value)) {
    fail("DEPLOYED_PWA_CANDIDATE_PATH_NOT_ABSOLUTE", `${label} must be absolute.`);
  }
  const segments = value.replaceAll("\\", "/").split("/");
  if (segments.includes(".") || segments.includes("..")) {
    fail("DEPLOYED_PWA_CANDIDATE_PATH_DOT_SEGMENT", `${label} must not contain dot segments.`);
  }
  return path.resolve(value);
}

function relativeArtifactPath(root, candidate, label, allowEqual = false) {
  const relative = path.relative(root, candidate);
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_PATH_OUTSIDE_ROOT", `${label} must be a strict descendant of the binding root.`);
  }
  if (relative === "" && allowEqual) return "";
  const normalized = relative.split(path.sep).join("/");
  if (!ARTIFACT_PATH_PATTERN.test(normalized)) {
    fail("DEPLOYED_PWA_CANDIDATE_ARTIFACT_PATH_INVALID", `${label} must map to a canonical v3 ArtifactPath.`);
  }
  return normalized;
}

function rootsOverlap(left, right) {
  const leftToRight = path.relative(left, right);
  const rightToLeft = path.relative(right, left);
  const isEqualOrDescendant = (relative) => (
    relative === ""
    || (!path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`))
  );
  return isEqualOrDescendant(leftToRight) || isEqualOrDescendant(rightToLeft);
}

function requireArtifactOutputIsolation(outputRoot, artifactRoot, code) {
  if (rootsOverlap(outputRoot, artifactRoot)) {
    fail(code, "Candidate output root and artifact root must be physically disjoint, not equal or nested in either direction.");
  }
}

function requirePublicHttpsOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("DEPLOYED_PWA_CANDIDATE_ORIGIN_INVALID", "Candidate origin must be an absolute HTTPS origin.");
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
    || value.length > 256
    || isIP(hostname) !== 0
    || !hostname.includes(".")
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_ORIGIN_INVALID",
      "Candidate origin must be a canonical public DNS HTTPS origin without credentials, port, path, query, or fragment."
    );
  }
  return parsed.origin;
}

export function parseDeployedPwaCandidateEnvironment(environment) {
  if (environment === null || typeof environment !== "object" || Array.isArray(environment)) {
    fail("DEPLOYED_PWA_CANDIDATE_ENV_INVALID", "Environment must be an object.");
  }
  const origin = requirePublicHttpsOrigin(requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.origin
  ));
  const bindingRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.bindingRoot
  ), "Candidate binding root");
  const outputRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.outputRoot
  ), "Candidate output root");
  const artifactRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.artifactRoot
  ), "Candidate artifact root");
  const artifactLock = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.artifactLock
  ), "Candidate artifact identity lock");
  relativeArtifactPath(bindingRoot, outputRoot, "Candidate output root");
  relativeArtifactPath(bindingRoot, artifactRoot, "Candidate artifact root");
  relativeArtifactPath(bindingRoot, artifactLock, "Candidate artifact identity lock");
  requireArtifactOutputIsolation(
    outputRoot,
    artifactRoot,
    "DEPLOYED_PWA_CANDIDATE_ROOTS_OVERLAP"
  );
  const lockWithinArtifact = path.relative(artifactRoot, artifactLock);
  if (
    lockWithinArtifact === ""
    || (!path.isAbsolute(lockWithinArtifact)
      && lockWithinArtifact !== ".."
      && !lockWithinArtifact.startsWith(`..${path.sep}`))
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_LOCK_INSIDE_ARTIFACT", "Artifact identity lock must remain outside the artifact root.");
  }
  const releaseEvidenceId = requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.releaseEvidenceId
  );
  if (!RELEASE_EVIDENCE_ID_PATTERN.test(releaseEvidenceId)) {
    fail("DEPLOYED_PWA_CANDIDATE_EVIDENCE_ID_INVALID", "Release Evidence id is not canonical.");
  }
  const runId = requireEnvironmentString(
    environment,
    DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS.runId
  );
  if (!RUN_ID_PATTERN.test(runId)) {
    fail("DEPLOYED_PWA_CANDIDATE_RUN_ID_INVALID", "Candidate run id must use only lowercase ASCII letters, digits, and hyphens and be 8-64 characters long.");
  }
  return Object.freeze({
    origin,
    outputRoot,
    bindingRoot,
    artifactRoot,
    artifactLock,
    releaseEvidenceId,
    runId
  });
}

export async function loadVerifiedDeployedPwaCandidateArtifact(candidate) {
  if (
    candidate === null
    || typeof candidate !== "object"
    || typeof candidate.bindingRoot !== "string"
    || typeof candidate.outputRoot !== "string"
    || typeof candidate.artifactRoot !== "string"
    || typeof candidate.artifactLock !== "string"
    || typeof candidate.releaseEvidenceId !== "string"
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_ARTIFACT_INPUT_INVALID", "Candidate artifact input is incomplete.");
  }
  const bindingBefore = await assertPlainDirectory(candidate.bindingRoot, "Candidate binding root");
  const artifactBefore = await assertPlainDirectory(candidate.artifactRoot, "Candidate artifact root");
  const outputBefore = await optionalPlainDirectory(candidate.outputRoot, "Candidate output root");
  const lockBefore = await stableRegularFileSnapshot(
    candidate.artifactLock,
    "Candidate artifact identity lock"
  );
  relativeArtifactPath(
    bindingBefore.realPath,
    artifactBefore.realPath,
    "Resolved candidate artifact root"
  );
  if (outputBefore) {
    relativeArtifactPath(
      bindingBefore.realPath,
      outputBefore.realPath,
      "Resolved candidate output root"
    );
    requireArtifactOutputIsolation(
      outputBefore.realPath,
      artifactBefore.realPath,
      "DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND"
    );
  }
  relativeArtifactPath(
    bindingBefore.realPath,
    lockBefore.realPath,
    "Resolved candidate artifact identity lock"
  );
  const verified = await verifyReleaseArtifactIdentityLock({
    cwd: candidate.bindingRoot,
    dist: candidate.artifactRoot,
    lockPath: candidate.artifactLock,
    evidenceId: candidate.releaseEvidenceId
  });
  const lock = verified.lock;
  const [bindingAfter, artifactAfter, outputAfter, lockAfter] = await Promise.all([
    assertPlainDirectory(candidate.bindingRoot, "Candidate binding root after artifact verification"),
    assertPlainDirectory(candidate.artifactRoot, "Candidate artifact root after verification"),
    optionalPlainDirectory(candidate.outputRoot, "Candidate output root after artifact verification"),
    stableRegularFileSnapshot(
      candidate.artifactLock,
      "Candidate artifact identity lock after artifact verification"
    )
  ]);
  if (
    !sameFilesystemIdentity(bindingBefore, bindingAfter)
    || !sameFilesystemIdentity(artifactBefore, artifactAfter)
    || (outputBefore === null) !== (outputAfter === null)
    || (outputBefore !== null && outputAfter !== null && !sameFilesystemIdentity(outputBefore, outputAfter))
    || !sameFilesystemIdentity(lockBefore, lockAfter)
    || lockAfter.size !== lockBefore.size
    || lockAfter.sha256 !== lockBefore.sha256
    || verified.lockFileSha256 !== lockBefore.sha256
    || verified.lockFileSha256 !== lockAfter.sha256
    || lockAfter.nlink !== 1
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_ARTIFACT_ROOT_REBOUND",
      "Artifact root or identity lock changed during verification."
    );
  }
  if (outputAfter) {
    relativeArtifactPath(
      bindingAfter.realPath,
      outputAfter.realPath,
      "Resolved candidate output root after artifact verification"
    );
    requireArtifactOutputIsolation(
      outputAfter.realPath,
      artifactAfter.realPath,
      "DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND"
    );
  }
  const descriptor = requireExactDefaultDescriptor(lock.descriptor);
  if (
    lock.evidenceId !== candidate.releaseEvidenceId
    || !BUILD_VERSION_PATTERN.test(lock.buildVersion ?? "")
    || !SHA256_PATTERN.test(lock.artifactSetDigest ?? "")
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_INVALID",
      "Verified artifact identity is not the exact default-v13 candidate input."
    );
  }
  const components = releaseArtifactComponents(lock.files);
  return Object.freeze({
    releaseEvidenceId: lock.evidenceId,
    descriptor: Object.freeze(descriptor),
    buildVersion: lock.buildVersion,
    artifactSetDigest: lock.artifactSetDigest,
    pwaManifest: components.pwaManifest,
    serviceWorker: components.serviceWorker,
    lockDigest: lock.lockDigest,
    verificationSnapshot: Object.freeze({
      bindingRoot: bindingAfter,
      artifactRoot: artifactAfter,
      lockFile: lockAfter,
      verifierLockFileSha256: verified.lockFileSha256,
      lock: structuredClone(lock)
    })
  });
}

export function assertDeployedPwaCandidateArtifactIdentityStable(initial, final) {
  const projection = (value) => ({
    releaseEvidenceId: value?.releaseEvidenceId,
    descriptor: value?.descriptor,
    buildVersion: value?.buildVersion,
    artifactSetDigest: value?.artifactSetDigest,
    pwaManifest: value?.pwaManifest,
    serviceWorker: value?.serviceWorker,
    lockDigest: value?.lockDigest,
    verificationSnapshot: value?.verificationSnapshot
  });
  if (
    initial === null
    || typeof initial !== "object"
    || final === null
    || typeof final !== "object"
    || canonicalJson(projection(initial)) !== canonicalJson(projection(final))
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND",
      "Release Evidence, build, artifact set, PWA manifest, Service Worker, descriptor, or identity lock changed during collection."
    );
  }
  return final;
}

export async function revalidateDeployedPwaCandidateArtifactIdentity(candidate, initial) {
  try {
    const final = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
    return assertDeployedPwaCandidateArtifactIdentityStable(initial, final);
  } catch (error) {
    if (
      error instanceof Error
      && error.message.startsWith("DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND:")
    ) {
      throw error;
    }
    fail(
      "DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND",
      `Final artifact identity verification failed closed: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
}

function filesystemIdentity(metadata, realPath) {
  return Object.freeze({
    realPath,
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeMs: metadata.birthtimeMs
  });
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
    fail("DEPLOYED_PWA_CANDIDATE_DIRECTORY_UNSAFE", `${label} must be a real directory, not a symlink or junction.`);
  }
  return filesystemIdentity(metadata, await realpath(directory));
}

async function optionalPlainDirectory(directory, label) {
  try {
    return await assertPlainDirectory(directory, label);
  } catch (error) {
    if (isErrno(error, "ENOENT")) return null;
    throw error;
  }
}

async function stableRegularFileSnapshot(filePath, label) {
  const handle = await open(filePath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat(),
      lstat(filePath),
      realpath(filePath)
    ]);
    if (
      !handleBefore.isFile()
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || handleBefore.nlink !== 1
      || pathBefore.nlink !== 1
      || handleBefore.dev !== pathBefore.dev
      || handleBefore.ino !== pathBefore.ino
      || handleBefore.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_ARTIFACT_LOCK_UNSAFE", `${label} must be a regular single-link file bound to one opened handle.`);
    }
    const bytes = await handle.readFile();
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat(),
      lstat(filePath),
      realpath(filePath)
    ]);
    if (
      !sameFilesystemIdentity(
        filesystemIdentity(handleBefore, resolvedBefore),
        filesystemIdentity(handleAfter, resolvedAfter)
      )
      || handleAfter.size !== handleBefore.size
      || handleAfter.nlink !== 1
      || pathAfter.dev !== handleBefore.dev
      || pathAfter.ino !== handleBefore.ino
      || pathAfter.birthtimeMs !== handleBefore.birthtimeMs
      || pathAfter.size !== handleBefore.size
      || pathAfter.nlink !== 1
      || pathAfter.isSymbolicLink()
      || resolvedAfter !== resolvedBefore
      || bytes.byteLength !== handleBefore.size
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_ARTIFACT_LOCK_REBOUND", `${label} changed while its bytes were read.`);
    }
    return Object.freeze({
      ...filesystemIdentity(handleAfter, resolvedAfter),
      size: handleAfter.size,
      nlink: handleAfter.nlink,
      sha256: sha256(bytes)
    });
  } finally {
    await handle.close();
  }
}

async function ensureDirectoryTree(bindingRoot, target) {
  const bindingIdentity = await assertPlainDirectory(bindingRoot, "Candidate binding root");
  const relative = relativeArtifactPath(bindingRoot, target, "Candidate output root");
  let current = bindingRoot;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    try {
      await mkdir(current, { recursive: false });
    } catch (error) {
      if (!isErrno(error, "EEXIST")) throw error;
    }
    const currentIdentity = await assertPlainDirectory(current, `Candidate output directory ${segment}`);
    relativeArtifactPath(
      bindingIdentity.realPath,
      currentIdentity.realPath,
      `Resolved candidate output directory ${segment}`
    );
  }
  return Object.freeze({
    bindingIdentity,
    outputIdentity: await assertPlainDirectory(target, "Candidate output root")
  });
}

async function projectRealPathBeforeCreation(target, label) {
  let current = target;
  const missingSegments = [];
  while (true) {
    try {
      const existing = await assertPlainDirectory(current, `${label} nearest existing ancestor`);
      return path.resolve(existing.realPath, ...missingSegments.reverse());
    } catch (error) {
      if (!isErrno(error, "ENOENT")) throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missingSegments.push(path.basename(current));
      current = parent;
    }
  }
}

export async function prepareCandidateProjectOutput({
  bindingRoot,
  outputRoot,
  artifactRoot,
  projectName
}) {
  if (!PROJECTS.includes(projectName)) {
    fail("DEPLOYED_PWA_CANDIDATE_PROJECT_INVALID", `Unsupported browser project: ${String(projectName)}.`);
  }
  if (typeof artifactRoot !== "string" || !path.isAbsolute(artifactRoot)) {
    fail("DEPLOYED_PWA_CANDIDATE_ARTIFACT_INPUT_INVALID", "Candidate artifact root must be an absolute path.");
  }
  const bindingIdentityBeforeCreation = await assertPlainDirectory(
    bindingRoot,
    "Candidate binding root before output creation"
  );
  const artifactIdentity = await assertPlainDirectory(artifactRoot, "Candidate artifact root during output preparation");
  const projectedOutputReal = await projectRealPathBeforeCreation(outputRoot, "Candidate output root");
  relativeArtifactPath(
    bindingIdentityBeforeCreation.realPath,
    projectedOutputReal,
    "Projected candidate output root before creation"
  );
  requireArtifactOutputIsolation(
    projectedOutputReal,
    artifactIdentity.realPath,
    "DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND"
  );
  const roots = await ensureDirectoryTree(bindingRoot, outputRoot);
  relativeArtifactPath(
    roots.bindingIdentity.realPath,
    roots.outputIdentity.realPath,
    "Resolved candidate output root"
  );
  relativeArtifactPath(
    roots.bindingIdentity.realPath,
    artifactIdentity.realPath,
    "Resolved candidate artifact root during output preparation"
  );
  requireArtifactOutputIsolation(
    roots.outputIdentity.realPath,
    artifactIdentity.realPath,
    "DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND"
  );
  const outputEntries = await readdir(outputRoot, { withFileTypes: true });
  for (const entry of outputEntries) {
    if (!PROJECTS.includes(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) {
      fail(
        "DEPLOYED_PWA_CANDIDATE_OUTPUT_NOT_ISOLATED",
        "Candidate output root may contain only the exact msedge and chrome project directories."
      );
    }
  }
  const projectRoot = path.join(outputRoot, projectName);
  try {
    await mkdir(projectRoot, { recursive: false });
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
  }
  const projectIdentity = await assertPlainDirectory(projectRoot, `${projectName} candidate project directory`);
  relativeArtifactPath(
    roots.outputIdentity.realPath,
    projectIdentity.realPath,
    `${projectName} resolved project directory`
  );
  const entries = await readdir(projectRoot);
  if (entries.length !== 0) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_PROJECT_NOT_EMPTY",
      `${projectName} candidate project directory must be new or empty; existing files are never overwritten.`
    );
  }
  return Object.freeze({
    bindingRoot,
    bindingReal: roots.bindingIdentity.realPath,
    bindingIdentity: roots.bindingIdentity,
    outputRoot,
    outputReal: roots.outputIdentity.realPath,
    outputIdentity: roots.outputIdentity,
    projectName,
    projectRoot,
    projectReal: projectIdentity.realPath,
    projectIdentity
  });
}

export async function assertFreshProfileDirectory(userDataDir) {
  if (typeof userDataDir !== "string" || !path.isAbsolute(userDataDir)) {
    fail("DEPLOYED_PWA_CANDIDATE_PROFILE_PATH_INVALID", "Persistent profile path must be absolute.");
  }
  try {
    await lstat(userDataDir);
  } catch (error) {
    if (isErrno(error, "ENOENT")) return;
    throw error;
  }
  fail(
    "DEPLOYED_PWA_CANDIDATE_PROFILE_NOT_FRESH",
    "Persistent profile directory already exists; candidate collection requires a fresh profile."
  );
}

export function deployedPwaCandidateProfileBindingDigest({ projectName, userDataDir }) {
  if (!PROJECTS.includes(projectName) || typeof userDataDir !== "string" || !path.isAbsolute(userDataDir)) {
    fail("DEPLOYED_PWA_CANDIDATE_PROFILE_BINDING_INVALID", "Profile binding input is invalid.");
  }
  return sha256(canonicalJson({
    namespace: "hakimi-deployed-pwa-candidate-profile-path-v2",
    userDataDir: path.resolve(userDataDir)
  }));
}

async function assertProjectRootLock(prepared) {
  const [bindingIdentity, outputIdentity, projectIdentity] = await Promise.all([
    assertPlainDirectory(prepared.bindingRoot, "Candidate binding root"),
    assertPlainDirectory(prepared.outputRoot, "Candidate output root"),
    assertPlainDirectory(prepared.projectRoot, `${prepared.projectName} candidate project root`)
  ]);
  if (
    !sameFilesystemIdentity(bindingIdentity, prepared.bindingIdentity)
    || !sameFilesystemIdentity(outputIdentity, prepared.outputIdentity)
    || !sameFilesystemIdentity(projectIdentity, prepared.projectIdentity)
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_ROOT_REBOUND", "Candidate output directory identity changed during collection.");
  }
}

async function fileBinding(bindingRoot, projectRoot, filePath) {
  const handle = await open(filePath, "r");
  try {
    const [handleBefore, pathBefore, resolvedBefore, projectIdentity] = await Promise.all([
      handle.stat(),
      lstat(filePath),
      realpath(filePath),
      assertPlainDirectory(projectRoot, "Candidate project root during file binding")
    ]);
    if (
      !handleBefore.isFile()
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || handleBefore.nlink !== 1
      || pathBefore.nlink !== 1
      || handleBefore.size <= 0
      || handleBefore.dev !== pathBefore.dev
      || handleBefore.ino !== pathBefore.ino
      || handleBefore.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_FILE_UNSAFE", "Candidate file must be a non-empty regular single-link file bound to the opened handle.");
    }
    relativeArtifactPath(projectIdentity.realPath, resolvedBefore, "Candidate file resolved path");
    const bytes = await handle.readFile();
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat(),
      lstat(filePath),
      realpath(filePath)
    ]);
    if (
      handleAfter.dev !== handleBefore.dev
      || handleAfter.ino !== handleBefore.ino
      || handleAfter.birthtimeMs !== handleBefore.birthtimeMs
      || handleAfter.size !== handleBefore.size
      || handleAfter.nlink !== 1
      || pathAfter.dev !== handleBefore.dev
      || pathAfter.ino !== handleBefore.ino
      || pathAfter.birthtimeMs !== handleBefore.birthtimeMs
      || pathAfter.size !== handleBefore.size
      || pathAfter.nlink !== 1
      || pathAfter.isSymbolicLink()
      || resolvedAfter !== resolvedBefore
      || bytes.byteLength !== handleBefore.size
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_FILE_REBOUND", "Candidate file identity changed while its digest was read.");
    }
    return Object.freeze({
      path: relativeArtifactPath(bindingRoot, filePath, "Candidate file binding"),
      size: bytes.byteLength,
      sha256: sha256(bytes)
    });
  } finally {
    await handle.close();
  }
}

async function removePublishedDestinationIfOwned(destination, publishedIdentity) {
  try {
    const current = await lstat(destination);
    if (
      current.isFile()
      && !current.isSymbolicLink()
      && current.dev === publishedIdentity.dev
      && current.ino === publishedIdentity.ino
      && current.birthtimeMs === publishedIdentity.birthtimeMs
    ) {
      await unlink(destination);
    }
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
}

async function atomicWriteExclusive(prepared, fileName, bytes, options = {}) {
  if (
    typeof fileName !== "string"
    || fileName.includes("/")
    || fileName.includes("\\")
    || !/^[A-Za-z0-9._-]+$/u.test(fileName)
    || !Buffer.isBuffer(bytes)
    || bytes.byteLength === 0
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_WRITE_INPUT_INVALID", "Candidate write input is invalid.");
  }
  await assertProjectRootLock(prepared);
  const destination = path.join(prepared.projectRoot, fileName);
  try {
    await lstat(destination);
    fail("DEPLOYED_PWA_CANDIDATE_OVERWRITE_REFUSED", `Candidate output already exists: ${fileName}.`);
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
  const temporary = path.join(prepared.projectRoot, `.candidate-${randomUUID()}.tmp`);
  let handle;
  let published = false;
  let completed = false;
  let publishedIdentity;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    const temporaryMetadata = await lstat(temporary);
    if (
      !temporaryMetadata.isFile()
      || temporaryMetadata.isSymbolicLink()
      || temporaryMetadata.nlink !== 1
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_TEMPORARY_REBOUND", "Candidate temporary file changed before publication.");
    }
    publishedIdentity = Object.freeze({
      dev: temporaryMetadata.dev,
      ino: temporaryMetadata.ino,
      birthtimeMs: temporaryMetadata.birthtimeMs
    });
    await assertProjectRootLock(prepared);
    await link(temporary, destination);
    published = true;
    if (options.afterPublishForTest !== undefined) {
      if (typeof options.afterPublishForTest !== "function") {
        fail("DEPLOYED_PWA_CANDIDATE_TEST_HOOK_INVALID", "Publication test hook must be a function.");
      }
      await options.afterPublishForTest();
    }
    await unlink(temporary);
    await assertProjectRootLock(prepared);
    const binding = await fileBinding(prepared.bindingRoot, prepared.projectRoot, destination);
    await assertProjectRootLock(prepared);
    const result = Object.freeze({
      filePath: destination,
      binding
    });
    completed = true;
    return result;
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    if (!completed && published && publishedIdentity) {
      await removePublishedDestinationIfOwned(destination, publishedIdentity);
    }
    await unlink(temporary).catch(() => undefined);
  }
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requireSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail("DEPLOYED_PWA_CANDIDATE_SHA_INVALID", `${label} must be a SHA-256 digest.`);
  }
  return value;
}

function requireTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (
    !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== value
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_TIME_INVALID", `${label} must be a canonical UTC ISO date-time.`);
  }
  return parsed;
}

function requireExactDefaultDescriptor(value) {
  if (canonicalJson(value) !== canonicalJson(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR)) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_RELEASE_IDENTITY_MISMATCH",
      "Candidate collection is fixed to legacy-v13 / targetSchema 13 / migrationId null."
    );
  }
  return structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR);
}

function validateRouteObservations(routeObservations, caseRevisionPath) {
  const expected = [
    ["online-root", "/", "online", false, false],
    ["offline-settings-data", "/settings/data", "cold-start", true, true],
    ["offline-case-revision", caseRevisionPath, "cold-start", true, true],
    ["offline-help-cold-start", "/help", "cold-start", true, true],
    ["offline-help-reload", "/help", "reload", true, true]
  ];
  if (!Array.isArray(routeObservations) || routeObservations.length !== expected.length) {
    fail("DEPLOYED_PWA_CANDIDATE_ROUTE_SET_INVALID", "Exactly five route observations are required.");
  }
  const validated = routeObservations.map((observation, index) => {
    const [routeId, routePath, navigationKind, offline, fromWorker] = expected[index];
    if (
      !exactKeys(observation, [
        "routeId",
        "path",
        "navigationKind",
        "offline",
        "playwrightFromServiceWorkerRecorded",
        "cdpFromServiceWorkerRecorded",
        "cdpRequestId",
        "observedAt"
      ])
      || observation.routeId !== routeId
      || observation.path !== routePath
      || observation.navigationKind !== navigationKind
      || observation.offline !== offline
      || observation.playwrightFromServiceWorkerRecorded !== fromWorker
      || observation.cdpFromServiceWorkerRecorded !== fromWorker
      || typeof observation.cdpRequestId !== "string"
      || !CANONICAL_ID_PATTERN.test(observation.cdpRequestId)
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_ROUTE_INVALID", `${routeId} did not satisfy the exact Playwright+CDP route contract.`);
    }
    requireTimestamp(observation.observedAt, `${routeId} observedAt`);
    return structuredClone(observation);
  });
  if (
    new Set(validated.map((observation) => observation.cdpRequestId)).size !== validated.length
    || validated.some((observation, index) => (
      index > 0
      && Date.parse(observation.observedAt) <= Date.parse(validated[index - 1].observedAt)
    ))
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_ROUTE_ORDER_INVALID",
      "CDP request ids must be unique and route timestamps must be strictly increasing."
    );
  }
  return validated;
}

function validateCaseCapture(capture, projectName, capturePhase, pathMatch) {
  if (
    !exactKeys(capture, [
      "schemaVersion",
      "recordType",
      "projectName",
      "captureId",
      "capturePhase",
      "capturedAt",
      "projection"
    ])
    || capture.schemaVersion !== 1
    || capture.recordType !== "deployed-pwa-case-revision-observation-v1"
    || capture.projectName !== projectName
    || typeof capture.captureId !== "string"
    || !CAPTURE_ID_PATTERN.test(capture.captureId)
    || capture.capturePhase !== capturePhase
    || !exactKeys(capture.projection, [
      "databaseName",
      "dbGeneration",
      "targetSchema",
      "migrationId",
      "caseId",
      "revisionId",
      "caseRecordSha256",
      "revisionRecordSha256"
    ])
    || capture.projection.databaseName !== DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR.databaseName
    || capture.projection.dbGeneration !== "legacy-v13"
    || capture.projection.targetSchema !== 13
    || capture.projection.migrationId !== null
    || capture.projection.caseId !== pathMatch[1]
    || capture.projection.revisionId !== pathMatch[2]
    || !SHA256_PATTERN.test(capture.projection.caseRecordSha256 ?? "")
    || !SHA256_PATTERN.test(capture.projection.revisionRecordSha256 ?? "")
    || capture.projection.caseRecordSha256 === capture.projection.revisionRecordSha256
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_CASE_CAPTURE_INVALID", `${projectName} ${capturePhase} fingerprint is invalid.`);
  }
  return Object.freeze({
    document: structuredClone(capture),
    capturedAt: requireTimestamp(capture.capturedAt, `${capturePhase} capturedAt`),
    projectionDigest: sha256(canonicalJson(capture.projection))
  });
}

function bindingWithoutRole(binding) {
  return Object.freeze({ path: binding.path, size: binding.size, sha256: binding.sha256 });
}

function digestReceipt(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

function validateBrowserManifestCandidate({
  targetOrigin,
  projectName,
  browserChannel,
  actualProduct,
  lockedManifest,
  initialInstallabilityResponse,
  finalInstallabilityResponse,
  initialAppManifestResponse,
  finalAppManifestResponse,
  initialRemoteManifestBytes,
  finalRemoteManifestBytes
}) {
  const expectedManifestUrl = `${targetOrigin}/${PWA_MANIFEST_ARTIFACT_PATH}`;
  const validateInstallability = (value, phase) => {
    if (
      !exactKeys(value, ["installabilityErrors"])
      || !Array.isArray(value.installabilityErrors)
      || value.installabilityErrors.length !== 0
    ) {
      fail(
        "DEPLOYED_PWA_CANDIDATE_INSTALLABILITY_INVALID",
        `${projectName} ${phase} Page.getInstallabilityErrors response must contain the exact empty error list.`
      );
    }
    return Object.freeze({ installabilityErrors: Object.freeze([]) });
  };
  const validateAppManifest = (value, phase) => {
    if (
      !hasOnlyKnownKeys(value, ["url", "errors", "data", "manifest"], ["parsed"])
      || value.url !== expectedManifestUrl
      || !Array.isArray(value.errors)
      || value.errors.length !== 0
      || typeof value.data !== "string"
      || value.data.length === 0
      || !isRecord(value.manifest)
      || (Object.hasOwn(value, "parsed") && !isRecord(value.parsed))
    ) {
      fail(
        "DEPLOYED_PWA_CANDIDATE_APP_MANIFEST_INVALID",
        `${projectName} ${phase} Page.getAppManifest response is incomplete, contains parse errors, or identifies another manifest.`
      );
    }
    return Object.freeze({
      url: value.url,
      errors: Object.freeze([]),
      data: value.data,
      manifest: Object.freeze(structuredClone(value.manifest))
    });
  };
  const initialInstallability = validateInstallability(initialInstallabilityResponse, "initial");
  const finalInstallability = validateInstallability(finalInstallabilityResponse, "final");
  const initialProcessedManifest = validateAppManifest(initialAppManifestResponse, "initial");
  const finalProcessedManifest = validateAppManifest(finalAppManifestResponse, "final");
  if (
    canonicalJson(initialInstallability) !== canonicalJson(finalInstallability)
    || canonicalJson(initialProcessedManifest) !== canonicalJson(finalProcessedManifest)
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_REBOUND",
      "Browser installability or processed manifest observations changed during collection."
    );
  }
  if (!Buffer.isBuffer(initialRemoteManifestBytes) || !Buffer.isBuffer(finalRemoteManifestBytes)) {
    fail("DEPLOYED_PWA_CANDIDATE_MANIFEST_BYTES_INVALID", "Initial and final remote PWA manifest bytes are required.");
  }
  if (!initialRemoteManifestBytes.equals(finalRemoteManifestBytes)) {
    fail("DEPLOYED_PWA_CANDIDATE_MANIFEST_REBOUND", "Remote PWA manifest bytes changed during collection.");
  }
  if (
    !isRecord(lockedManifest)
    || lockedManifest.path !== PWA_MANIFEST_ARTIFACT_PATH
    || !Number.isSafeInteger(lockedManifest.size)
    || lockedManifest.size <= 0
    || !SHA256_PATTERN.test(lockedManifest.sha256 ?? "")
    || finalRemoteManifestBytes.byteLength !== lockedManifest.size
    || sha256(finalRemoteManifestBytes) !== lockedManifest.sha256
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_BYTES_MISMATCH",
      "Remote manifest bytes do not exactly match the locked release artifact manifest."
    );
  }
  const rawManifest = parseStrictJsonBytes(finalRemoteManifestBytes, "Remote locked PWA manifest");
  const browserManifestContentBytes = Buffer.from(finalProcessedManifest.data, "utf8");
  const browserManifestDocument = parseStrictJsonBytes(
    browserManifestContentBytes,
    "Browser-reported PWA manifest content"
  );
  if (
    !isRecord(rawManifest)
    || !isRecord(browserManifestDocument)
    || canonicalJson(browserManifestDocument) !== canonicalJson(rawManifest)
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_SEMANTICS_MISMATCH",
      "Browser-reported manifest content and remote locked manifest bytes are not canonically equivalent JSON documents."
    );
  }
  const rawSemanticProjection = {
    id: rawManifest.id,
    start_url: rawManifest.start_url,
    scope: rawManifest.scope,
    display: rawManifest.display
  };
  if (canonicalJson(rawSemanticProjection) !== canonicalJson({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone"
  })) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_MANIFEST_SEMANTICS_MISMATCH",
      "The locked raw manifest does not preserve the exact default-v13 root application identity."
    );
  }
  const manifestSemanticProjection = Object.freeze({
    id: `${targetOrigin}/`,
    startUrl: `${targetOrigin}/`,
    scope: `${targetOrigin}/`,
    display: "standalone"
  });
  const browserProjection = {
    id: finalProcessedManifest.manifest.id,
    startUrl: finalProcessedManifest.manifest.startUrl,
    scope: finalProcessedManifest.manifest.scope,
    display: finalProcessedManifest.manifest.display
  };
  if (canonicalJson(browserProjection) !== canonicalJson(manifestSemanticProjection)) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_PROCESSED_MANIFEST_MISMATCH",
      "The browser-processed manifest does not preserve the exact resolved root application identity."
    );
  }
  const browserManifestContentSha256 = sha256(browserManifestContentBytes);
  const manifestSemanticProjectionSha256 = sha256(canonicalJson(manifestSemanticProjection));
  const remoteManifestSha256 = sha256(finalRemoteManifestBytes);
  return Object.freeze({
    audit: Object.freeze({
      schemaVersion: 1,
      recordType: "deployed_pwa_browser_manifest_audit_v1",
      projectName,
      browserChannel,
      actualProduct,
      installability: Object.freeze({
        method: INSTALLABILITY_EVIDENCE_METHOD,
        installabilityErrors: Object.freeze([])
      }),
      processedManifest: Object.freeze({
        method: PROCESSED_MANIFEST_EVIDENCE_METHOD,
        ...finalProcessedManifest
      })
    }),
    receiptManifest: Object.freeze({
      manifestUrl: expectedManifestUrl,
      installabilityEvidenceMethod: INSTALLABILITY_EVIDENCE_METHOD,
      processedManifestEvidenceMethod: PROCESSED_MANIFEST_EVIDENCE_METHOD,
      remoteManifestEvidenceMethod: REMOTE_MANIFEST_EVIDENCE_METHOD,
      installabilityErrorCount: 0,
      manifestParseErrorCount: 0,
      browserManifestContentSha256,
      manifestSemanticProjectionSha256,
      remoteManifestSha256
    }),
    remoteManifestBytes: finalRemoteManifestBytes
  });
}

export async function writeDeployedPwaBrowserCandidate({
  preparedOutput,
  runId,
  targetOrigin,
  initialArtifact,
  finalArtifact,
  projectName,
  browserChannel,
  actualProduct,
  profileBindingDigest,
  initialControllerRuntime,
  finalControllerRuntime,
  routeObservations,
  caseRevisionPath,
  beforeCapture,
  afterCapture,
  initialControllerSourceBytes,
  finalControllerSourceBytes,
  initialRemoteServiceWorkerBytes,
  finalRemoteServiceWorkerBytes,
  initialInstallabilityResponse,
  finalInstallabilityResponse,
  initialAppManifestResponse,
  finalAppManifestResponse,
  initialRemoteManifestBytes,
  finalRemoteManifestBytes,
  startedAt,
  completedAt,
  unexpectedExternalRequestCount,
  afterReceiptPublishForTest
}) {
  if (
    !PROJECTS.includes(projectName)
    || preparedOutput?.projectName !== projectName
    || browserChannel !== projectName
    || (projectName === "msedge"
      ? !/^Edg\/\d+(?:\.\d+)+$/u.test(actualProduct ?? "")
      : !/^Chrome\/\d+(?:\.\d+)+$/u.test(actualProduct ?? ""))
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_BROWSER_TUPLE_INVALID", "Browser project/channel/product tuple is invalid.");
  }
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    fail("DEPLOYED_PWA_CANDIDATE_RUN_ID_INVALID", "Candidate run id is invalid.");
  }
  if (!Number.isSafeInteger(unexpectedExternalRequestCount) || !Object.is(unexpectedExternalRequestCount, 0)) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_EXTERNAL_REQUEST_COUNT_INVALID",
      "Unexpected external request count must be the exact non-negative integer zero derived from the closed network ledger."
    );
  }
  const stableArtifact = assertDeployedPwaCandidateArtifactIdentityStable(initialArtifact, finalArtifact);
  const releaseEvidenceId = stableArtifact.releaseEvidenceId;
  const artifactSetDigest = stableArtifact.artifactSetDigest;
  const descriptor = stableArtifact.descriptor;
  const buildVersion = stableArtifact.buildVersion;
  requirePublicHttpsOrigin(targetOrigin);
  if (!RELEASE_EVIDENCE_ID_PATTERN.test(releaseEvidenceId ?? "")) {
    fail("DEPLOYED_PWA_CANDIDATE_EVIDENCE_ID_INVALID", "Release Evidence id is invalid.");
  }
  requireSha256(artifactSetDigest, "artifactSetDigest");
  requireSha256(profileBindingDigest, "profileBindingDigest");
  const expectedWorkerSha256 = requireSha256(
    stableArtifact.serviceWorker?.sha256,
    "finalArtifact.serviceWorker.sha256"
  );
  const frozenDescriptor = requireExactDefaultDescriptor(descriptor);
  if (!BUILD_VERSION_PATTERN.test(buildVersion ?? "")) {
    fail("DEPLOYED_PWA_CANDIDATE_BUILD_VERSION_INVALID", "buildVersion is invalid.");
  }
  const manifestCandidate = validateBrowserManifestCandidate({
    targetOrigin,
    projectName,
    browserChannel,
    actualProduct,
    lockedManifest: stableArtifact.pwaManifest,
    initialInstallabilityResponse,
    finalInstallabilityResponse,
    initialAppManifestResponse,
    finalAppManifestResponse,
    initialRemoteManifestBytes,
    finalRemoteManifestBytes
  });
  const expectedWorkerUrl = `${targetOrigin}/sw.js`;
  const expectedWorkerMessage = {
    type: "BUILD_VERSION",
    buildVersion,
    ...frozenDescriptor
  };
  const controllerRuntimeIsExact = (controllerRuntime) => (
    exactKeys(controllerRuntime, [
      "registrationScope",
      "controllerScriptUrl",
      "controllerState",
      "activeScriptUrl",
      "activeState",
      "waitingScriptUrl",
      "installingScriptUrl",
      "workerMessage"
    ])
    && controllerRuntime.registrationScope === `${targetOrigin}/`
    && controllerRuntime.controllerScriptUrl === expectedWorkerUrl
    && controllerRuntime.controllerState === "activated"
    && controllerRuntime.activeScriptUrl === expectedWorkerUrl
    && controllerRuntime.activeState === "activated"
    && controllerRuntime.waitingScriptUrl === null
    && controllerRuntime.installingScriptUrl === null
    && canonicalJson(controllerRuntime.workerMessage) === canonicalJson(expectedWorkerMessage)
  );
  if (!controllerRuntimeIsExact(initialControllerRuntime) || !controllerRuntimeIsExact(finalControllerRuntime)) {
    fail("DEPLOYED_PWA_CANDIDATE_CONTROLLER_META_INVALID", "Service Worker controller metadata is not exact.");
  }
  if (canonicalJson(initialControllerRuntime) !== canonicalJson(finalControllerRuntime)) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_SERVICE_WORKER_REBOUND",
      "Service Worker registration, controller, active worker, or build message changed after the offline route matrix."
    );
  }
  if (
    !Buffer.isBuffer(initialControllerSourceBytes)
    || !Buffer.isBuffer(finalControllerSourceBytes)
    || !Buffer.isBuffer(initialRemoteServiceWorkerBytes)
    || !Buffer.isBuffer(finalRemoteServiceWorkerBytes)
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_CONTROLLER_SOURCE_MISSING", "Initial and final controller and remote Service Worker bytes are required.");
  }
  if (
    !initialControllerSourceBytes.equals(finalControllerSourceBytes)
    || !initialRemoteServiceWorkerBytes.equals(finalRemoteServiceWorkerBytes)
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_SERVICE_WORKER_REBOUND",
      "Controller source or remote Service Worker bytes changed during collection."
    );
  }
  const controllerSourceSha256 = sha256(finalControllerSourceBytes);
  const remoteServiceWorkerSha256 = sha256(finalRemoteServiceWorkerBytes);
  if (
    finalControllerSourceBytes.byteLength === 0
    || !finalControllerSourceBytes.equals(finalRemoteServiceWorkerBytes)
    || controllerSourceSha256 !== expectedWorkerSha256
    || remoteServiceWorkerSha256 !== expectedWorkerSha256
  ) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_SERVICE_WORKER_BYTES_MISMATCH",
      "CDP controller source, remote /sw.js bytes, and locked artifact Service Worker must match exactly."
    );
  }
  const pathMatch = caseRevisionPath?.match(CASE_REVISION_PATH_PATTERN);
  if (!pathMatch) {
    fail("DEPLOYED_PWA_CANDIDATE_CASE_PATH_INVALID", "Case/revision deep link is not canonical.");
  }
  const routes = validateRouteObservations(routeObservations, caseRevisionPath);
  const before = validateCaseCapture(
    beforeCapture,
    projectName,
    "before_offline_cold_start",
    pathMatch
  );
  const after = validateCaseCapture(
    afterCapture,
    projectName,
    "after_offline_cold_start",
    pathMatch
  );
  const started = requireTimestamp(startedAt, "startedAt");
  const completed = requireTimestamp(completedAt, "completedAt");
  const caseObservedAt = requireTimestamp(routes[2].observedAt, "offline-case-revision observedAt");
  if (
    started > completed
    || before.capturedAt < started
    || before.capturedAt >= caseObservedAt
    || caseObservedAt >= after.capturedAt
    || after.capturedAt > completed
    || routes.some((route) => {
      const observed = Date.parse(route.observedAt);
      return observed < started || observed > completed;
    })
    || before.document.captureId === after.document.captureId
    || before.projectionDigest !== after.projectionDigest
    || canonicalJson(before.document.projection) !== canonicalJson(after.document.projection)
  ) {
    fail("DEPLOYED_PWA_CANDIDATE_OBSERVATION_INCONSISTENT", "Candidate timestamps, case projection, or external request count are inconsistent.");
  }
  const controller = Object.freeze({
    registrationScope: finalControllerRuntime.registrationScope,
    controllerScriptUrl: finalControllerRuntime.controllerScriptUrl,
    controllerState: finalControllerRuntime.controllerState,
    activeScriptUrl: finalControllerRuntime.activeScriptUrl,
    activeState: finalControllerRuntime.activeState,
    waitingScriptUrl: null,
    installingScriptUrl: null,
    buildVersion,
    descriptor: frozenDescriptor,
    remoteServiceWorkerSha256,
    controllerSourceSha256,
    controllerSourceEvidenceMethod: "cdp_debugger_get_script_source_v1"
  });
  const attachmentInputs = new Map([
    ["browser-version", jsonBytes({ schemaVersion: 1, projectName, browserChannel, actualProduct })],
    ["profile-preflight", jsonBytes({
      schemaVersion: 1,
      projectName,
      profileBindingDigest,
      directoryExistedBeforeRun: false,
      createdByRunner: true
    })],
    ["browser-manifest-audit", jsonBytes(manifestCandidate.audit)],
    ["remote-pwa-manifest-body", manifestCandidate.remoteManifestBytes],
    ["network-events", jsonBytes({
      schemaVersion: 1,
      recordType: "deployed_pwa_cdp_network_events_v1",
      projectName,
      routeObservations: routes
    })],
    ["controller-script-meta", jsonBytes({ schemaVersion: 1, projectName, controller })],
    ["controller-source", finalControllerSourceBytes],
    ["remote-service-worker-body", finalRemoteServiceWorkerBytes],
    ["case-revision-before", jsonBytes(before.document)],
    ["case-revision-after", jsonBytes(after.document)]
  ]);
  const attachments = [];
  for (const role of DEPLOYED_PWA_CANDIDATE_ATTACHMENT_ROLES) {
    const written = await atomicWriteExclusive(
      preparedOutput,
      ATTACHMENT_FILE_NAMES[role],
      attachmentInputs.get(role)
    );
    attachments.push(Object.freeze({ role, ...written.binding }));
  }
  const beforeBinding = attachments.find((entry) => entry.role === "case-revision-before");
  const afterBinding = attachments.find((entry) => entry.role === "case-revision-after");
  const receiptId = `${runId}-${projectName}`;
  if (!CANONICAL_ID_PATTERN.test(receiptId)) {
    fail("DEPLOYED_PWA_CANDIDATE_RECEIPT_ID_INVALID", "Derived browser receipt id is not canonical.");
  }
  const document = {
    schemaVersion: 3,
    receiptType: "deployed_pwa_browser_runtime_receipt_candidate_v3",
    projectName,
    browserChannel,
    actualProduct,
    receiptId,
    targetOrigin,
    releaseEvidenceId,
    artifactSetDigest,
    profileBindingDigest,
    profileDirectoryExistedBeforeRun: false,
    profileCreatedByRunner: true,
    controller,
    manifest: manifestCandidate.receiptManifest,
    attemptCount: 1,
    retryCount: 0,
    skippedCount: 0,
    flakyCount: 0,
    routeObservations: routes,
    caseRevision: {
      path: caseRevisionPath,
      projectionVersion: "deployed-pwa-case-revision-observation-v1",
      before: bindingWithoutRole(beforeBinding),
      after: bindingWithoutRole(afterBinding),
      beforeDigest: before.projectionDigest,
      afterDigest: after.projectionDigest
    },
    unexpectedExternalRequestCount,
    attachments,
    rawAttachmentSetDigest: sha256(canonicalJson(attachments)),
    receiptDigest: "0".repeat(64),
    startedAt,
    completedAt
  };
  document.receiptDigest = digestReceipt(document);
  const receiptBytes = jsonBytes(document);
  const receiptPath = path.join(preparedOutput.projectRoot, "browser-receipt.json");
  const receiptBinding = Object.freeze({
    path: relativeArtifactPath(preparedOutput.bindingRoot, receiptPath, "Candidate browser receipt binding"),
    size: receiptBytes.byteLength,
    sha256: sha256(receiptBytes)
  });
  const receiptCore = structuredClone(document);
  delete receiptCore.schemaVersion;
  delete receiptCore.receiptType;
  delete receiptCore.projectName;
  delete receiptCore.browserChannel;
  delete receiptCore.actualProduct;
  const result = Object.freeze({
    receiptPath,
    receiptBinding,
    document: Object.freeze(document),
    envelope: Object.freeze({
      projectName,
      browserChannel,
      actualProduct,
      receipt: Object.freeze({ ...receiptBinding, ...receiptCore })
    })
  });
  await atomicWriteExclusive(preparedOutput, "browser-receipt.json", receiptBytes, {
    afterPublishForTest: afterReceiptPublishForTest
  });
  return result;
}
