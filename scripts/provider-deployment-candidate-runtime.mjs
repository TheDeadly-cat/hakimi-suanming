import { randomUUID } from "node:crypto";
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
import { isIP } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseExpression } from "@babel/parser";

import {
  assertDeployedPwaCandidateArtifactIdentityStable,
  loadVerifiedDeployedPwaCandidateArtifact
} from "./deployed-pwa-candidate-runtime.mjs";
import { loadDeployedHostExpectation } from "./deployed-security-headers-lib.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_PATH =
  "docs/release/provider-deployment-receipt-candidate-v1.schema.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/provider-deployment-receipt-candidate-v1.json";

export const PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS = Object.freeze({
  provider: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_PROVIDER",
  action: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ACTION",
  bindingRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_BINDING_ROOT",
  rawRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ROOT",
  outputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_OUTPUT_ROOT",
  rawActionResponse: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ACTION_RESPONSE",
  rawFinalReadback: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_FINAL_READBACK",
  artifactRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RELEASE_EVIDENCE_ID",
  runId: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RUN_ID"
});

export const PROVIDER_DEPLOYMENT_CANDIDATE_ACTIONS = Object.freeze([
  "deploy_candidate",
  "restore_baseline"
]);

export const PROVIDER_DEPLOYMENT_CANDIDATE_ATTACHMENT_ROLES = Object.freeze([
  "raw-action-response",
  "raw-final-readback",
  "synthetic-normalized-projection",
  "artifact-initial",
  "artifact-final"
]);

const ATTACHMENT_FILE_NAMES = Object.freeze({
  "raw-action-response": "raw-action-response.json",
  "raw-final-readback": "raw-final-readback.json",
  "synthetic-normalized-projection": "synthetic-normalized-projection.json",
  "artifact-initial": "artifact-initial.json",
  "artifact-final": "artifact-final.json"
});
const RECEIPT_FILE_NAME = "provider-deployment-candidate-receipt.json";
const PENDING_TERMINAL_COMMIT_FILE_NAME =
  ".provider-deployment-candidate-receipt-publication-pending";
const TERMINAL_COMMIT_FILE_NAME = "provider-deployment-candidate-receipt-commit.sha256";
const PREPARED_OUTPUT_FILE_NAMES = Object.freeze([
  ...Object.values(ATTACHMENT_FILE_NAMES),
  RECEIPT_FILE_NAME,
  PENDING_TERMINAL_COMMIT_FILE_NAME
].sort());
const COMMITTED_OUTPUT_FILE_NAMES = Object.freeze([
  ...Object.values(ATTACHMENT_FILE_NAMES),
  RECEIPT_FILE_NAME,
  TERMINAL_COMMIT_FILE_NAME
].sort());
const TERMINAL_COMMIT_MARKER_BYTES = 65;
const TEST_ONLY_TERMINAL_COMMIT_FAULT = "create_target_directory_collision";

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

const SYNTHETIC_ADAPTERS = new WeakSet();
const SYNTHETIC_PROJECTIONS = new WeakSet();
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/u;
const CANONICAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_RAW_BYTES = 16 * 1024 * 1024;
const FORBIDDEN_PROVIDER_NAMES = new Set(["none", "null", "unknown", "unselected"]);
const CREDENTIAL_KEYS = new Set([
  "authorization", "proxyauthorization", "cookie", "setcookie", "xapikey", "apikey", "apitoken",
  "accesstoken", "refreshtoken", "idtoken", "oauth", "oauthtoken", "token", "password", "passwd", "secret",
  "clientsecret", "privatekey", "accesskey", "accesskeyid", "secretkey", "secretaccesskey", "signingkey",
  "sessionkey", "accountkey", "subscriptionkey", "serviceaccountkey", "credential", "credentials"
]);
const CREDENTIAL_KEY_SUFFIXES = Object.freeze([
  "authorization", "cookie", "apikey", "apitoken", "accesstoken", "refreshtoken", "idtoken",
  "oauth", "oauthtoken", "token", "password", "passwd", "secret", "clientsecret", "privatekey",
  "accesskey", "accesskeyid", "secretkey", "secretaccesskey", "signingkey", "sessionkey", "accountkey",
  "subscriptionkey", "serviceaccountkey", "credential", "credentials"
]);
const STRUCTURED_CREDENTIAL_NAME_FIELDS = new Set([
  "name", "key", "header", "headername", "field", "parameter", "parametername", "param", "paramname"
]);
const CREDENTIAL_VALUE_PATTERN = /(?:\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+|https?:\/\/[^\s/@:]+:[^\s/@]+@|-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{4,}\.eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b)/iu;
const CREDENTIAL_LABELED_VALUE_PATTERN = /(?:^|[\s;,])([A-Za-z0-9._ -]{1,128})\s*(?::|=|%3d)\s*[^\s&;,]+/giu;
const CREDENTIAL_QUERY_VALUE_PATTERN = /[?&]([^?&#=\s]{1,256})(?:=|%3d)[^\s&;,]+/giu;
const URL_WITH_AUTHORITY_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/giu;

function fail(code, message, cause) {
  throw new Error(`${code}: ${message}`, cause === undefined ? undefined : { cause });
}

function isErrno(error, code) {
  return error !== null && typeof error === "object" && Reflect.get(error, "code") === code;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("PROVIDER_CANDIDATE_ENV_MISSING", `${key} must be explicit and free of surrounding whitespace.`);
  }
  return value;
}

function requireAbsoluteCanonicalPath(value, label) {
  if (!path.isAbsolute(value)) {
    fail("PROVIDER_CANDIDATE_PATH_NOT_ABSOLUTE", `${label} must be absolute.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("PROVIDER_CANDIDATE_PATH_DOT_SEGMENT", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("PROVIDER_CANDIDATE_PATH_NOT_CANONICAL", `${label} must use its exact resolved filesystem spelling.`);
  }
  return resolved;
}

function relativeBoundPath(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) fail("PROVIDER_CANDIDATE_PATH_OUTSIDE_BINDING", `${label} must be a strict descendant of the binding root.`);
  return relative.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(path.resolve(left), path.resolve(right));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requireDisjoint(left, right, label) {
  if (pathsOverlap(left, right) || pathsOverlap(right, left)) {
    fail("PROVIDER_CANDIDATE_ROOTS_OVERLAP", `${label} must be disjoint in both directions.`);
  }
}

function requireCanonicalOrigin(value, label = "Candidate origin") {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_ORIGIN_INVALID", `${label} must be a canonical public DNS HTTPS origin.`, error);
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
  ) fail("PROVIDER_CANDIDATE_ORIGIN_INVALID", `${label} must be a canonical public DNS HTTPS origin.`);
  return value;
}

function requireCanonicalId(value, label) {
  if (typeof value !== "string" || !CANONICAL_ID_PATTERN.test(value)) {
    fail("PROVIDER_CANDIDATE_ID_INVALID", `${label} is not canonical.`);
  }
  return value;
}

function requireTimestamp(value, label) {
  if (
    typeof value !== "string"
    || Number.isNaN(Date.parse(value))
    || new Date(value).toISOString() !== value
  ) fail("PROVIDER_CANDIDATE_TIME_INVALID", `${label} must be a canonical ISO timestamp.`);
  return value;
}

function requireExactDefaultDescriptor(value) {
  if (canonicalJson(value) !== canonicalJson(DEFAULT_DESCRIPTOR)) {
    fail("PROVIDER_CANDIDATE_ARTIFACT_IDENTITY_INVALID", "Artifact descriptor is not the exact frozen default-v13 descriptor.");
  }
  return value;
}

export function parseProviderDeploymentCandidateEnvironment(environment) {
  if (!isRecord(environment)) fail("PROVIDER_CANDIDATE_ENV_INVALID", "Environment must be an object.");
  const provider = requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.provider);
  if (!PROVIDER_PATTERN.test(provider) || FORBIDDEN_PROVIDER_NAMES.has(provider)) {
    fail("PROVIDER_CANDIDATE_PROVIDER_INVALID", "Provider must be an explicit candidate identifier, never unselected/unknown/null.");
  }
  const action = requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.action);
  if (!PROVIDER_DEPLOYMENT_CANDIDATE_ACTIONS.includes(action)) {
    fail("PROVIDER_CANDIDATE_ACTION_INVALID", "Action must be deploy_candidate or restore_baseline.");
  }
  const bindingRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.bindingRoot
  ), "Binding root");
  const outputRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.outputRoot
  ), "Output root");
  const rawRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.rawRoot
  ), "Raw input root");
  const rawActionResponse = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.rawActionResponse
  ), "Raw action response");
  const rawFinalReadback = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.rawFinalReadback
  ), "Raw final readback");
  const artifactRoot = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.artifactRoot
  ), "Artifact root");
  const artifactLock = requireAbsoluteCanonicalPath(requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.artifactLock
  ), "Artifact identity lock");
  for (const [candidate, label] of [
    [outputRoot, "Output root"],
    [rawRoot, "Raw input root"],
    [rawActionResponse, "Raw action response"],
    [rawFinalReadback, "Raw final readback"],
    [artifactRoot, "Artifact root"],
    [artifactLock, "Artifact identity lock"]
  ]) relativeBoundPath(bindingRoot, candidate, label);
  requireDisjoint(outputRoot, artifactRoot, "Output and artifact roots");
  requireDisjoint(rawRoot, artifactRoot, "Raw input and artifact roots");
  requireDisjoint(rawRoot, outputRoot, "Raw input and output roots");
  relativeBoundPath(rawRoot, rawActionResponse, "Raw action response within raw input root");
  relativeBoundPath(rawRoot, rawFinalReadback, "Raw final readback within raw input root");
  for (const [filePath, label] of [
    [rawActionResponse, "Raw action response"],
    [rawFinalReadback, "Raw final readback"],
    [artifactLock, "Artifact identity lock"]
  ]) {
    if (pathsOverlap(outputRoot, filePath) || pathsOverlap(artifactRoot, filePath)) {
      fail("PROVIDER_CANDIDATE_ROOTS_OVERLAP", `${label} must remain outside output and artifact roots.`);
    }
  }
  if (pathsOverlap(rawRoot, artifactLock)) {
    fail("PROVIDER_CANDIDATE_ROOTS_OVERLAP", "Artifact identity lock must remain outside the raw input root.");
  }
  const lexicalFiles = [rawActionResponse, rawFinalReadback, artifactLock].map(comparablePath);
  if (new Set(lexicalFiles).size !== lexicalFiles.length) {
    fail("PROVIDER_CANDIDATE_INPUT_PATH_DUPLICATE", "Raw inputs and artifact lock must use distinct paths.");
  }
  const releaseEvidenceId = requireEnvironmentString(
    environment,
    PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.releaseEvidenceId
  );
  if (!EVIDENCE_ID_PATTERN.test(releaseEvidenceId)) {
    fail("PROVIDER_CANDIDATE_EVIDENCE_ID_INVALID", "Release Evidence id is not canonical.");
  }
  const runId = requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS.runId);
  if (!RUN_ID_PATTERN.test(runId)) {
    fail("PROVIDER_CANDIDATE_RUN_ID_INVALID", "Run id must be 8-64 lowercase ASCII letters, digits, or hyphens.");
  }
  return Object.freeze({
    provider,
    action,
    bindingRoot,
    rawRoot,
    outputRoot,
    rawActionResponse,
    rawFinalReadback,
    artifactRoot,
    artifactLock,
    releaseEvidenceId,
    runId
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

export function parseProviderDeploymentRawJsonBytes(bytes, label = "Provider raw JSON") {
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0 || buffer.length > MAX_RAW_BYTES) {
    fail("PROVIDER_CANDIDATE_RAW_SIZE_INVALID", `${label} must be 1-${MAX_RAW_BYTES} bytes.`);
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail("PROVIDER_CANDIDATE_RAW_UTF8_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM.`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_RAW_UTF8_INVALID", `${label} is not strict UTF-8.`, error);
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
    fail("PROVIDER_CANDIDATE_RAW_JSON_SYNTAX_INVALID", `${label} cannot be inspected as strict JSON.`, error);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (
        property.type !== "ObjectProperty"
        || property.computed !== false
        || property.key?.type !== "StringLiteral"
      ) fail("PROVIDER_CANDIDATE_RAW_JSON_PROPERTY_INVALID", `${label} contains a non-JSON object property.`);
      if (keys.has(property.key.value)) {
        fail("PROVIDER_CANDIDATE_RAW_JSON_DUPLICATE_KEY", `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`);
      }
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_RAW_JSON_INVALID", `${label} is not valid JSON.`, error);
  }
}

function normalizedCredentialKey(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[-_.\s]/gu, "");
}

function isCredentialKey(value) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    decoded = value;
  }
  const normalized = normalizedCredentialKey(decoded);
  return CREDENTIAL_KEYS.has(normalized)
    || CREDENTIAL_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function containsCredentialLabeledValue(value) {
  for (const pattern of [CREDENTIAL_LABELED_VALUE_PATTERN, CREDENTIAL_QUERY_VALUE_PATTERN]) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      if (isCredentialKey(match[1])) return true;
    }
  }
  return false;
}

function containsCredentialFragment(parsedUrl) {
  const fragment = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  if (fragment.length === 0) return false;
  const candidates = new Set([fragment]);
  try {
    candidates.add(decodeURIComponent(fragment.replaceAll("+", " ")));
  } catch {
    // The raw fragment is still inspected fail-closed for recognizable credential labels.
  }
  for (const candidate of [...candidates]) {
    const queryIndex = candidate.indexOf("?");
    if (queryIndex >= 0 && queryIndex + 1 < candidate.length) candidates.add(candidate.slice(queryIndex + 1));
  }
  for (const candidate of candidates) {
    if (containsCredentialLabeledValue(candidate)) return true;
    const parameters = new URLSearchParams(candidate.replace(/^[/!?]+/u, ""));
    for (const key of parameters.keys()) {
      if (isCredentialKey(key)) return true;
    }
  }
  return false;
}

function containsCredentialUrl(value) {
  URL_WITH_AUTHORITY_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(URL_WITH_AUTHORITY_PATTERN)) {
    let parsed;
    try {
      parsed = new URL(match[0]);
    } catch {
      continue;
    }
    if (parsed.username !== "" || parsed.password !== "") return true;
    for (const key of parsed.searchParams.keys()) {
      if (isCredentialKey(key)) return true;
    }
    if (containsCredentialFragment(parsed)) return true;
  }
  return false;
}

function assertCredentialMaterialAbsent(value, label) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      if (current.some((item) => typeof item === "string" && isCredentialKey(item))) {
        fail("PROVIDER_CANDIDATE_CREDENTIAL_MATERIAL_PRESENT", `${label} contains a structured credential-bearing name.`);
      }
      stack.push(...current);
      continue;
    }
    if (isRecord(current)) {
      for (const [key, child] of Object.entries(current)) {
        if (isCredentialKey(key)) {
          fail("PROVIDER_CANDIDATE_CREDENTIAL_MATERIAL_PRESENT", `${label} contains forbidden credential-bearing key ${JSON.stringify(key)}.`);
        }
        stack.push(child);
      }
      for (const [key, child] of Object.entries(current)) {
        if (STRUCTURED_CREDENTIAL_NAME_FIELDS.has(normalizedCredentialKey(key))
          && typeof child === "string"
          && isCredentialKey(child)) {
          fail("PROVIDER_CANDIDATE_CREDENTIAL_MATERIAL_PRESENT", `${label} contains a structured credential-bearing name.`);
        }
      }
      continue;
    }
    if (typeof current === "string"
      && (CREDENTIAL_VALUE_PATTERN.test(current)
        || containsCredentialLabeledValue(current)
        || containsCredentialUrl(current))) {
      fail("PROVIDER_CANDIDATE_CREDENTIAL_MATERIAL_PRESENT", `${label} contains credential-like material.`);
    }
  }
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.realPath === right.realPath;
}

async function captureDirectoryLock(directoryPath, label) {
  let metadata;
  let resolved;
  try {
    metadata = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_ROOT_LOCK_FAILED", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("PROVIDER_CANDIDATE_ROOT_LOCK_INVALID", `${label} must be a real directory with filesystem identity.`);
  }
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    realPath: comparablePath(resolved)
  });
}

async function assertDirectoryLock(directoryPath, lock, label) {
  const current = await captureDirectoryLock(directoryPath, label);
  if (!sameDirectoryIdentity(lock, current)) {
    fail("PROVIDER_CANDIDATE_ROOT_REBOUND", `${label} changed after preflight.`);
  }
}

async function assertNoAliases(bindingRoot, candidate, label, { allowMissingTail = false } = {}) {
  const relative = relativeBoundPath(bindingRoot, candidate, label);
  let current = bindingRoot;
  let missing = false;
  for (const segment of relative.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    if (missing) continue;
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      if (allowMissingTail && isErrno(error, "ENOENT")) {
        missing = true;
        continue;
      }
      fail("PROVIDER_CANDIDATE_PATH_UNREADABLE", `${label} cannot be inspected.`, error);
    }
    if (metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_PATH_ALIAS", `${label} cannot traverse a symlink or junction.`);
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

async function stableJsonFileSnapshot({ candidate, filePath, label, bindingLock, rawRootLock }) {
  await assertDirectoryLock(candidate.bindingRoot, bindingLock, "Binding root");
  await assertDirectoryLock(candidate.rawRoot, rawRootLock, "Raw input root");
  await assertNoAliases(candidate.bindingRoot, filePath, label);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    fail("PROVIDER_CANDIDATE_RAW_OPEN_FAILED", `${label} could not be opened.`, error);
  }
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    if (
      !before.isFile()
      || before.nlink !== 1n
      || before.ino === 0n
      || before.size <= 0n
      || before.size > BigInt(MAX_RAW_BYTES)
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.nlink !== 1n
      || !sameFileIdentity(before, pathBefore)
    ) fail("PROVIDER_CANDIDATE_RAW_FILE_UNSAFE", `${label} must be a bounded single-link regular file.`);
    relativeBoundPath(bindingLock.realPath, resolvedBefore, `${label} resolved path`);
    relativeBoundPath(rawRootLock.realPath, resolvedBefore, `${label} resolved raw-root path`);
    if (
      pathsOverlap(candidate.outputRoot, resolvedBefore)
      || pathsOverlap(candidate.artifactRoot, resolvedBefore)
    ) fail("PROVIDER_CANDIDATE_ROOTS_REBOUND", `${label} physically overlaps output or artifact root.`);
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    await assertDirectoryLock(candidate.bindingRoot, bindingLock, "Binding root");
    await assertDirectoryLock(candidate.rawRoot, rawRootLock, "Raw input root");
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
    ) fail("PROVIDER_CANDIDATE_RAW_FILE_REBOUND", `${label} changed during its stable opened-file read.`);
    const json = parseProviderDeploymentRawJsonBytes(bytes, label);
    assertCredentialMaterialAbsent(json, label);
    return Object.freeze({
      bytes,
      json: structuredClone(json),
      binding: Object.freeze({
        path: relativeBoundPath(candidate.bindingRoot, filePath, `${label} binding`),
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

function stableRawProjection(snapshot) {
  return {
    binding: snapshot?.binding,
    identity: snapshot?.identity
  };
}

function assertRawSnapshotStable(initial, final, label) {
  if (canonicalJson(stableRawProjection(initial)) !== canonicalJson(stableRawProjection(final))) {
    fail("PROVIDER_CANDIDATE_RAW_FILE_REBOUND", `${label} changed during offline parsing.`);
  }
}

async function assertArtifactTreeSafe(root, label) {
  const names = (await readdir(root)).sort();
  for (const name of names) {
    const candidate = path.join(root, name);
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_ARTIFACT_ALIAS", `${label} cannot contain symlinks or junctions.`);
    }
    if (metadata.isDirectory()) {
      await assertArtifactTreeSafe(candidate, label);
    } else if (!metadata.isFile() || metadata.nlink !== 1) {
      fail("PROVIDER_CANDIDATE_ARTIFACT_FILE_UNSAFE", `${label} may contain only single-link regular files.`);
    }
  }
}

function validateSyntheticProjection(value, candidate) {
  const recordKeys = ["schemaVersion", "recordType", "provider", "action", "actionResponse", "finalReadback"];
  const commonKeys = [
    "provider", "action", "operationId", "accountId", "projectId", "environment", "origin"
  ];
  if (
    !exactKeys(value, recordKeys)
    || value.schemaVersion !== 1
    || value.recordType !== "synthetic_provider_deployment_projection_v1"
    || value.provider !== candidate.provider
    || value.action !== candidate.action
    || !exactKeys(value.actionResponse, [
      ...commonKeys,
      "beforeActiveDeploymentId", "requestedTargetDeploymentId", "resultActiveDeploymentId",
      "immutableDeploymentUrl", "resultDerivation", "derivedFromDeploymentId", "sequenceEligible",
      "startedAt", "acceptedAt", "completedAt", "credentialMaterialEmbedded"
    ])
    || !exactKeys(value.finalReadback, [
      ...commonKeys,
      "activeDeploymentId", "immutableDeploymentUrl", "providerStatus", "terminal", "successful",
      "observedAt", "credentialMaterialEmbedded"
    ])
  ) fail("PROVIDER_CANDIDATE_SYNTHETIC_PROJECTION_INVALID", "Synthetic adapter projection has an invalid exact shape or candidate scope.");
  const action = value.actionResponse;
  const readback = value.finalReadback;
  for (const [field, label] of [
    [action.operationId, "Action operation id"],
    [action.accountId, "Action account id"],
    [action.projectId, "Action project id"],
    [action.environment, "Action environment"],
    [readback.operationId, "Readback operation id"],
    [readback.accountId, "Readback account id"],
    [readback.projectId, "Readback project id"],
    [readback.environment, "Readback environment"],
    [readback.providerStatus, "Readback provider status"]
  ]) requireCanonicalId(field, label);
  requireCanonicalOrigin(action.origin, "Action origin");
  requireCanonicalOrigin(readback.origin, "Readback origin");
  requireCanonicalOrigin(action.immutableDeploymentUrl, "Action immutable deployment URL");
  requireCanonicalOrigin(readback.immutableDeploymentUrl, "Readback immutable deployment URL");
  if (
    action.provider !== candidate.provider
    || readback.provider !== candidate.provider
    || action.action !== candidate.action
    || readback.action !== candidate.action
    || action.operationId !== readback.operationId
    || action.accountId !== readback.accountId
    || action.projectId !== readback.projectId
    || action.environment !== readback.environment
    || action.origin !== readback.origin
    || action.resultActiveDeploymentId !== readback.activeDeploymentId
    || action.immutableDeploymentUrl !== readback.immutableDeploymentUrl
  ) fail("PROVIDER_CANDIDATE_PROVIDER_IDENTITY_MISMATCH", "Action response and final readback provider/operation/project/environment/origin identity disagree.");
  if (action.credentialMaterialEmbedded !== false || readback.credentialMaterialEmbedded !== false) {
    fail("PROVIDER_CANDIDATE_CREDENTIAL_MATERIAL_PRESENT", "Synthetic adapter must attest credentialMaterialEmbedded=false for both raw inputs.");
  }
  const startedAt = requireTimestamp(action.startedAt, "Operation startedAt");
  const acceptedAt = requireTimestamp(action.acceptedAt, "Action acceptedAt");
  const completedAt = requireTimestamp(action.completedAt, "Operation completedAt");
  const observedAt = requireTimestamp(readback.observedAt, "Final readback observedAt");
  if (
    readback.terminal !== true
    || readback.successful !== true
    || Date.parse(startedAt) > Date.parse(acceptedAt)
    || Date.parse(acceptedAt) > Date.parse(completedAt)
    || Date.parse(completedAt) > Date.parse(observedAt)
  ) fail("PROVIDER_CANDIDATE_OPERATION_NOT_TERMINAL", "Final readback must prove a successful terminal synthetic status with ordered timestamps.");
  for (const [valueId, label, nullable] of [
    [action.beforeActiveDeploymentId, "Before active deployment id", true],
    [action.requestedTargetDeploymentId, "Requested target deployment id", true],
    [action.resultActiveDeploymentId, "Result active deployment id", false],
    [action.derivedFromDeploymentId, "Derived-from deployment id", true],
    [readback.activeDeploymentId, "Readback active deployment id", false]
  ]) {
    if (valueId === null && nullable) continue;
    requireCanonicalId(valueId, label);
  }
  if (![
    "activated_requested",
    "provider_created_from_requested",
    "provider_assigned_new"
  ].includes(action.resultDerivation)) {
    fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "Action resultDerivation is invalid.");
  }
  const before = action.beforeActiveDeploymentId;
  const requested = action.requestedTargetDeploymentId;
  const result = action.resultActiveDeploymentId;
  const derivedFrom = action.derivedFromDeploymentId;
  if (candidate.action === "deploy_candidate") {
    if ((before === null) !== (action.sequenceEligible === false)
      || (before !== null && result === before)) {
      fail("PROVIDER_CANDIDATE_DEPLOYMENT_IDENTITY_INVALID", "Deploy candidate before/result identity or sequence eligibility is invalid.");
    }
    if (action.resultDerivation === "activated_requested"
      && !(requested !== null && result === requested && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "activated_requested deploy identity is inconsistent.");
    }
    if (action.resultDerivation === "provider_assigned_new"
      && !(requested === null && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "provider_assigned_new deploy identity is inconsistent.");
    }
    if (action.resultDerivation === "provider_created_from_requested"
      && !(requested !== null && result !== requested && derivedFrom === requested)) {
      fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "provider_created_from_requested deploy identity is inconsistent.");
    }
  } else {
    if (
      before === null
      || requested === null
      || before === requested
      || result === before
      || action.sequenceEligible !== true
      || action.resultDerivation === "provider_assigned_new"
    ) fail("PROVIDER_CANDIDATE_RESTORE_IDENTITY_INVALID", "Restore candidate requires distinct non-null before/requested/result identities and sequence eligibility.");
    if (action.resultDerivation === "activated_requested"
      && !(result === requested && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "activated_requested restore identity is inconsistent.");
    }
    if (action.resultDerivation === "provider_created_from_requested"
      && !(result !== requested && derivedFrom === requested)) {
      fail("PROVIDER_CANDIDATE_RESULT_DERIVATION_INVALID", "provider_created_from_requested restore identity is inconsistent.");
    }
  }
  return Object.freeze(structuredClone(value));
}

export function createSyntheticProviderDeploymentAdapter({ adapterId, adapterVersion, provider, parse }) {
  requireCanonicalId(adapterId, "Synthetic adapter id");
  requireCanonicalId(adapterVersion, "Synthetic adapter version");
  if (!PROVIDER_PATTERN.test(provider ?? "") || FORBIDDEN_PROVIDER_NAMES.has(provider)) {
    fail("PROVIDER_CANDIDATE_PROVIDER_INVALID", "Synthetic adapter provider is invalid.");
  }
  if (typeof parse !== "function") {
    fail("PROVIDER_CANDIDATE_ADAPTER_INVALID", "Synthetic adapter requires a parse function.");
  }
  const adapter = Object.freeze({
    adapterId,
    adapterVersion,
    provider,
    trustClass: "synthetic_contract_only",
    providerAuthenticated: false,
    parse
  });
  SYNTHETIC_ADAPTERS.add(adapter);
  return adapter;
}

async function runSyntheticAdapter({ adapter, candidate, actionResponse, finalReadback }) {
  if (!SYNTHETIC_ADAPTERS.has(adapter)
    || adapter.trustClass !== "synthetic_contract_only"
    || adapter.providerAuthenticated !== false
    || adapter.provider !== candidate.provider) {
    fail("PROVIDER_CANDIDATE_ADAPTER_PROVENANCE_INVALID", "Only a module-branded synthetic adapter for the explicit provider may parse this candidate.");
  }
  let parsedActionResponse;
  let parsedFinalReadback;
  try {
    parsedActionResponse = await adapter.parse(Object.freeze({
      role: "raw-action-response",
      provider: candidate.provider,
      action: candidate.action,
      rawBytes: Buffer.from(actionResponse.bytes),
      rawJson: structuredClone(actionResponse.json)
    }));
    parsedFinalReadback = await adapter.parse(Object.freeze({
      role: "raw-final-readback",
      provider: candidate.provider,
      action: candidate.action,
      rawBytes: Buffer.from(finalReadback.bytes),
      rawJson: structuredClone(finalReadback.json)
    }));
  } catch (error) {
    fail("PROVIDER_CANDIDATE_SYNTHETIC_PARSE_FAILED", "Synthetic adapter rejected the raw inputs.", error);
  }
  const projection = validateSyntheticProjection({
    schemaVersion: 1,
    recordType: "synthetic_provider_deployment_projection_v1",
    provider: candidate.provider,
    action: candidate.action,
    actionResponse: parsedActionResponse,
    finalReadback: parsedFinalReadback
  }, candidate);
  SYNTHETIC_PROJECTIONS.add(projection);
  return projection;
}

function artifactSnapshot(phase, capturedAt, artifact, expectation) {
  requireExactDefaultDescriptor(artifact.descriptor);
  if (
    !EVIDENCE_ID_PATTERN.test(artifact.releaseEvidenceId ?? "")
    || !BUILD_VERSION_PATTERN.test(artifact.buildVersion ?? "")
    || !SHA256_PATTERN.test(artifact.artifactSetDigest ?? "")
    || !SHA256_PATTERN.test(artifact.lockDigest ?? "")
    || !SHA256_PATTERN.test(artifact.verificationSnapshot?.lockFile?.sha256 ?? "")
  ) fail("PROVIDER_CANDIDATE_ARTIFACT_IDENTITY_INVALID", "Verified artifact identity is incomplete.");
  const expectationProjection = structuredClone(expectation);
  return Object.freeze({
    schemaVersion: 1,
    recordType: "provider_deployment_candidate_artifact_snapshot_v1",
    phase,
    capturedAt: requireTimestamp(capturedAt, `${phase} capturedAt`),
    releaseEvidenceId: artifact.releaseEvidenceId,
    descriptor: structuredClone(artifact.descriptor),
    buildVersion: artifact.buildVersion,
    artifactSetDigest: artifact.artifactSetDigest,
    releaseEvidenceExpectationDigest: sha256(canonicalJson(expectationProjection)),
    releaseEvidenceExpectation: expectationProjection,
    artifactLock: Object.freeze({
      path: expectation.artifactIdentityLockBinding.path,
      sha256: artifact.verificationSnapshot.lockFile.sha256,
      lockDigest: artifact.lockDigest
    })
  });
}

function deployedExpectationProjection(expectation) {
  return {
    expectationKind: expectation?.expectationKind,
    evidenceId: expectation?.evidenceId,
    artifactSetDigest: expectation?.artifactSetDigest,
    descriptor: expectation?.descriptor,
    releaseIdentity: expectation?.releaseIdentity,
    policyBinding: expectation?.policyBinding,
    artifactIdentityLockBinding: expectation?.artifactIdentityLockBinding === undefined
      ? undefined
      : {
          path: expectation.artifactIdentityLockBinding.path,
          sha256: expectation.artifactIdentityLockBinding.sha256,
          lockDigest: expectation.artifactIdentityLockBinding.lockDigest,
          artifactSetDigest: expectation.artifactIdentityLockBinding.artifactSetDigest
        },
    releaseEvidence: expectation?.releaseEvidence,
    artifacts: expectation?.artifacts,
    lockedBytes: {
      indexHtmlSha256: Buffer.isBuffer(expectation?.indexBytes) ? sha256(expectation.indexBytes) : null,
      manifestSha256: Buffer.isBuffer(expectation?.manifestBytes) ? sha256(expectation.manifestBytes) : null,
      serviceWorkerSha256: Buffer.isBuffer(expectation?.serviceWorkerBytes) ? sha256(expectation.serviceWorkerBytes) : null
    }
  };
}

function assertSchemaValidatedExpectation(candidate, artifact, expectation) {
  const projection = deployedExpectationProjection(expectation);
  if (
    projection.expectationKind !== "schema-validated-release-evidence-expectation-v1"
    || projection.evidenceId !== candidate.releaseEvidenceId
    || projection.evidenceId !== artifact.releaseEvidenceId
    || projection.artifactSetDigest !== artifact.artifactSetDigest
    || canonicalJson(projection.descriptor) !== canonicalJson(DEFAULT_DESCRIPTOR)
    || projection.artifactIdentityLockBinding?.sha256 !== artifact.verificationSnapshot.lockFile.sha256
    || projection.artifactIdentityLockBinding?.lockDigest !== artifact.lockDigest
    || projection.artifactIdentityLockBinding?.artifactSetDigest !== artifact.artifactSetDigest
    || comparablePath(expectation?.artifactIdentityLockBinding?.realPath ?? "") !== comparablePath(candidate.artifactLock)
  ) fail("PROVIDER_CANDIDATE_RELEASE_EVIDENCE_EXPECTATION_INVALID", "Artifact is not bound to a schema-validated Release Evidence expectation and exact identity lock.");
  return Object.freeze(structuredClone(projection));
}

function assertExpectationStable(initial, final) {
  if (canonicalJson(initial) !== canonicalJson(final)) {
    fail("PROVIDER_CANDIDATE_RELEASE_EVIDENCE_REBOUND", "Schema-validated Release Evidence expectation changed during offline parsing.");
  }
}

async function revalidateProviderCandidateSourcesBeforeTerminalCommit({
  candidate,
  cwd,
  checkedPolicy,
  bindingLock,
  rawRootLock,
  artifactRootLock,
  actionInitial,
  readbackInitial,
  finalArtifact,
  finalExpectation,
  prepared,
  plannedAttachments,
  writtenReceipt,
  writtenPendingTerminalCommit
}) {
  // This is a complete prepared-state endpoint revalidation. The prepared
  // package is intentionally not loader-acceptable until the terminal rename.
  const [actionPostPublication, readbackPostPublication] = await Promise.all([
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawActionResponse,
      label: "Raw action response after receipt publication",
      bindingLock,
      rawRootLock
    }),
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawFinalReadback,
      label: "Raw final readback after receipt publication",
      bindingLock,
      rawRootLock
    })
  ]);
  assertRawSnapshotStable(actionInitial, actionPostPublication, "Raw action response after receipt publication");
  assertRawSnapshotStable(readbackInitial, readbackPostPublication, "Raw final readback after receipt publication");

  await assertArtifactTreeSafe(candidate.artifactRoot, "Artifact root after receipt publication");
  const postPublicationArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  assertDeployedPwaCandidateArtifactIdentityStable(finalArtifact, postPublicationArtifact);
  const postPublicationExpectation = assertSchemaValidatedExpectation(
    candidate,
    postPublicationArtifact,
    await loadDeployedHostExpectation({
      cwd,
      artifactRoot: candidate.artifactRoot,
      evidencePath: path.join(candidate.artifactRoot, "release-evidence.json"),
      policy: checkedPolicy,
      policyPath: "docs/security/hosting-security-policy.json"
    })
  );
  assertExpectationStable(finalExpectation, postPublicationExpectation);

  await Promise.all([
    assertNoAliases(candidate.bindingRoot, candidate.rawRoot, "Raw input root after receipt publication"),
    assertNoAliases(candidate.bindingRoot, candidate.artifactRoot, "Artifact root after receipt publication"),
    assertNoAliases(candidate.bindingRoot, candidate.artifactLock, "Artifact identity lock after receipt publication"),
    assertDirectoryLock(candidate.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(candidate.rawRoot, rawRootLock, "Raw input root"),
    assertDirectoryLock(candidate.artifactRoot, artifactRootLock, "Artifact root"),
    assertOutputLocked(prepared)
  ]);
  await rebindPreparedProviderCandidateOutput({
    prepared,
    plannedAttachments,
    writtenReceipt,
    writtenPendingTerminalCommit
  });
}

async function loadSchemaValidator(cwd) {
  const schema = JSON.parse(await readFile(path.resolve(cwd, PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_PATH), "utf8"));
  return compileEvidenceSchemaForId(schema, PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_ID);
}

async function createOutputDirectory(candidate, bindingLock) {
  await assertDirectoryLock(candidate.bindingRoot, bindingLock, "Binding root");
  await assertNoAliases(candidate.bindingRoot, candidate.outputRoot, "Output root", { allowMissingTail: true });
  const relative = relativeBoundPath(candidate.bindingRoot, candidate.outputRoot, "Output root");
  let current = candidate.bindingRoot;
  const segments = relative.split("/").filter(Boolean);
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const isTarget = index === segments.length - 1;
    try {
      await mkdir(current, { recursive: false });
    } catch (error) {
      if (isTarget && isErrno(error, "EEXIST")) {
        fail("PROVIDER_CANDIDATE_OUTPUT_EXISTS", "Candidate output root must not already exist.");
      }
      if (!isTarget && isErrno(error, "EEXIST")) {
        const metadata = await lstat(current);
        if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
          fail("PROVIDER_CANDIDATE_PATH_ALIAS", "Output parent must be a real directory.");
        }
        continue;
      }
      throw error;
    }
  }
  const outputLock = await captureDirectoryLock(candidate.outputRoot, "Output root");
  relativeBoundPath(bindingLock.realPath, outputLock.realPath, "Resolved output root");
  requireDisjoint(outputLock.realPath, candidate.artifactRoot, "Resolved output and artifact roots");
  const rawRootReal = await realpath(candidate.rawRoot);
  requireDisjoint(outputLock.realPath, rawRootReal, "Resolved output and raw input roots");
  for (const filePath of [candidate.rawActionResponse, candidate.rawFinalReadback, candidate.artifactLock]) {
    if (pathsOverlap(outputLock.realPath, filePath)) {
      fail("PROVIDER_CANDIDATE_ROOTS_REBOUND", "Resolved output root overlaps a protected input.");
    }
  }
  if ((await readdir(candidate.outputRoot)).length !== 0) {
    fail("PROVIDER_CANDIDATE_OUTPUT_NOT_EMPTY", "Candidate output root must be empty.");
  }
  return Object.freeze({ candidate, bindingLock, outputLock });
}

async function assertOutputLocked(prepared) {
  await Promise.all([
    assertDirectoryLock(prepared.candidate.bindingRoot, prepared.bindingLock, "Binding root"),
    assertDirectoryLock(prepared.candidate.outputRoot, prepared.outputLock, "Output root")
  ]);
}

async function bindWrittenFile(prepared, filePath, expectedBinding) {
  if (
    !isRecord(expectedBinding)
    || typeof expectedBinding.path !== "string"
    || !Number.isSafeInteger(expectedBinding.size)
    || expectedBinding.size <= 0
    || !SHA256_PATTERN.test(expectedBinding.sha256 ?? "")
  ) fail("PROVIDER_CANDIDATE_OUTPUT_BINDING_INVALID", "Expected candidate output binding is invalid.");
  const handle = await open(filePath, "r");
  try {
    const [before, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    if (
      !before.isFile()
      || before.nlink !== 1n
      || !pathBefore.isFile()
      || pathBefore.isSymbolicLink()
      || pathBefore.nlink !== 1n
      || !sameFileIdentity(before, pathBefore)
      || before.size !== BigInt(expectedBinding.size)
    ) fail("PROVIDER_CANDIDATE_OUTPUT_FILE_UNSAFE", "Written candidate file is not a bound single-link regular file.");
    relativeBoundPath(prepared.outputLock.realPath, resolvedBefore, "Written candidate file resolved path");
    const bytes = await readOpenedFileBounded(handle, expectedBinding.size);
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
      || after.nlink !== 1n
      || comparablePath(resolvedBefore) !== comparablePath(resolvedAfter)
      || pathAfter.nlink !== 1n
      || bytes.byteLength !== Number(before.size)
    ) fail("PROVIDER_CANDIDATE_OUTPUT_FILE_REBOUND", "Written candidate file changed while it was bound.");
    const binding = Object.freeze({
      path: relativeBoundPath(prepared.candidate.bindingRoot, filePath, "Candidate attachment binding"),
      size: bytes.byteLength,
      sha256: sha256(bytes)
    });
    if (canonicalJson(binding) !== canonicalJson(expectedBinding)) {
      fail("PROVIDER_CANDIDATE_OUTPUT_BINDING_MISMATCH", "Written candidate file does not match its expected path, size, and SHA-256 binding.");
    }
    return binding;
  } finally {
    await handle.close();
  }
}

async function assertExactPreparedOutputNames(prepared) {
  await assertOutputLocked(prepared);
  const names = (await readdir(prepared.candidate.outputRoot)).sort();
  if (canonicalJson(names) !== canonicalJson(PREPARED_OUTPUT_FILE_NAMES)) {
    fail("PROVIDER_CANDIDATE_OUTPUT_SET_REBOUND", "Prepared candidate output must contain exactly five attachments, the final receipt, and the pending terminal-commit marker.");
  }
}

function assertExactTerminalCommitNameTransition() {
  const projectedCommittedNames = PREPARED_OUTPUT_FILE_NAMES
    .map((name) => name === PENDING_TERMINAL_COMMIT_FILE_NAME ? TERMINAL_COMMIT_FILE_NAME : name)
    .sort();
  if (
    PREPARED_OUTPUT_FILE_NAMES.length !== 7
    || COMMITTED_OUTPUT_FILE_NAMES.length !== 7
    || canonicalJson(projectedCommittedNames) !== canonicalJson(COMMITTED_OUTPUT_FILE_NAMES)
  ) {
    fail(
      "PROVIDER_CANDIDATE_TERMINAL_COMMIT_PLAN_INVALID",
      "The final rename must transform the exact seven-file prepared set into the exact seven-file committed set."
    );
  }
}

async function rebindPreparedProviderCandidateOutput({
  prepared,
  plannedAttachments,
  writtenReceipt,
  writtenPendingTerminalCommit
}) {
  // Each prepared file is rebound through one held, bounded read before the
  // terminal marker rename. This is endpoint revalidation, not a continuous
  // multi-file handle epoch.
  await assertExactPreparedOutputNames(prepared);
  for (const role of PROVIDER_DEPLOYMENT_CANDIDATE_ATTACHMENT_ROLES) {
    const expectedAttachment = plannedAttachments[role];
    const rebound = await bindWrittenFile(
      prepared,
      path.join(prepared.candidate.outputRoot, ATTACHMENT_FILE_NAMES[role]),
      {
        path: expectedAttachment.path,
        size: expectedAttachment.size,
        sha256: expectedAttachment.sha256
      }
    );
    if (canonicalJson({ ...rebound, mediaType: "application/json" }) !== canonicalJson(expectedAttachment)) {
      fail("PROVIDER_CANDIDATE_ATTACHMENT_BINDING_MISMATCH", `${role} output changed after receipt publication.`);
    }
  }
  await bindWrittenFile(
    prepared,
    writtenReceipt.filePath,
    writtenReceipt.binding
  );
  await bindWrittenFile(
    prepared,
    writtenPendingTerminalCommit.filePath,
    writtenPendingTerminalCommit.binding
  );
  await assertExactPreparedOutputNames(prepared);
}

async function atomicWriteExclusive(prepared, fileName, bytes) {
  if (!/^[A-Za-z0-9._-]+$/u.test(fileName) || !Buffer.isBuffer(bytes) || bytes.length === 0) {
    fail("PROVIDER_CANDIDATE_WRITE_INPUT_INVALID", "Candidate write input is invalid.");
  }
  await assertOutputLocked(prepared);
  const destination = path.join(prepared.candidate.outputRoot, fileName);
  const expectedBinding = Object.freeze({
    path: relativeBoundPath(prepared.candidate.bindingRoot, destination, "Candidate attachment binding"),
    size: bytes.length,
    sha256: sha256(bytes)
  });
  try {
    await lstat(destination);
    fail("PROVIDER_CANDIDATE_OVERWRITE_REFUSED", `Candidate output already exists: ${fileName}.`);
  } catch (error) {
    if (!isErrno(error, "ENOENT")) throw error;
  }
  const temporary = path.join(prepared.candidate.outputRoot, `.candidate-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await assertOutputLocked(prepared);
    await link(temporary, destination);
    await unlink(temporary);
    const binding = await bindWrittenFile(prepared, destination, expectedBinding);
    await assertOutputLocked(prepared);
    return Object.freeze({ filePath: destination, binding });
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function terminalCommitBytes(receiptBytes) {
  const bytes = Buffer.from(`${sha256(receiptBytes)}\n`, "utf8");
  if (bytes.length !== TERMINAL_COMMIT_MARKER_BYTES) {
    fail("PROVIDER_CANDIDATE_TERMINAL_COMMIT_INVALID", "Terminal commit marker must be the raw receipt SHA-256 plus one LF byte.");
  }
  return bytes;
}

function receiptDigest(document) {
  const { receiptDigest: _receiptDigest, ...unsigned } = document;
  return sha256(canonicalJson(unsigned));
}

function nextNow(label) {
  return requireTimestamp(new Date().toISOString(), label);
}

async function collectProviderDeploymentCandidateInternal({
  environment = process.env,
  adapter,
  cwd = process.cwd()
} = {}, { terminalCommitFault = null } = {}) {
  const candidate = parseProviderDeploymentCandidateEnvironment(environment);
  if (comparablePath(candidate.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail(
      "PROVIDER_CANDIDATE_BINDING_ROOT_CWD_MISMATCH",
      "Binding root must exactly equal cwd so every recorded path uses one unambiguous base."
    );
  }
  if (!SYNTHETIC_ADAPTERS.has(adapter)) {
    fail("PROVIDER_CANDIDATE_ADAPTER_UNAVAILABLE", "No module-branded synthetic adapter was explicitly injected; real/provider-authenticated parsing is unavailable.");
  }
  const schemaValidator = await loadSchemaValidator(cwd);
  const checkedPolicyPath = path.resolve(cwd, "docs/security/hosting-security-policy.json");
  let checkedPolicy;
  try {
    checkedPolicy = JSON.parse(await readFile(checkedPolicyPath, "utf8"));
  } catch (error) {
    fail("PROVIDER_CANDIDATE_POLICY_INVALID", "Checked hosting policy is unavailable or invalid JSON.", error);
  }
  if (
    checkedPolicy.deploymentPlatform !== "unselected"
    || checkedPolicy.canonicalOrigin !== null
    || checkedPolicy.publicReleaseGate?.realHostHeadersVerified !== false
    || checkedPolicy.publicReleaseGate?.cspBlockingModeVerified !== false
  ) fail("PROVIDER_CANDIDATE_POLICY_NOT_CLOSED", "Provider candidate parsing requires the checked hosting policy to remain unselected and closed.");
  const startedAt = nextNow("Offline parse startedAt");
  const bindingLock = await captureDirectoryLock(candidate.bindingRoot, "Binding root");
  if (bindingLock.realPath !== comparablePath(await realpath(cwd))) {
    fail("PROVIDER_CANDIDATE_BINDING_ROOT_CWD_MISMATCH", "Binding root and cwd do not share one physical directory identity.");
  }
  const rawRootLock = await captureDirectoryLock(candidate.rawRoot, "Raw input root");
  const artifactRootLock = await captureDirectoryLock(candidate.artifactRoot, "Artifact root");
  requireDisjoint(rawRootLock.realPath, artifactRootLock.realPath, "Resolved raw input and artifact roots");
  await Promise.all([
    assertNoAliases(candidate.bindingRoot, candidate.rawRoot, "Raw input root"),
    assertNoAliases(candidate.bindingRoot, candidate.artifactRoot, "Artifact root"),
    assertNoAliases(candidate.bindingRoot, candidate.artifactLock, "Artifact identity lock"),
    assertNoAliases(candidate.bindingRoot, candidate.rawActionResponse, "Raw action response"),
    assertNoAliases(candidate.bindingRoot, candidate.rawFinalReadback, "Raw final readback"),
    assertNoAliases(candidate.bindingRoot, candidate.outputRoot, "Output root", { allowMissingTail: true })
  ]);
  await assertArtifactTreeSafe(candidate.artifactRoot, "Artifact root");
  const initialArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  requireExactDefaultDescriptor(initialArtifact.descriptor);
  if (initialArtifact.releaseEvidenceId !== candidate.releaseEvidenceId) {
    fail("PROVIDER_CANDIDATE_ARTIFACT_BINDING_MISMATCH", "Artifact identity does not match the explicit Release Evidence id.");
  }
  const initialExpectation = assertSchemaValidatedExpectation(
    candidate,
    initialArtifact,
    await loadDeployedHostExpectation({
      cwd,
      artifactRoot: candidate.artifactRoot,
      evidencePath: path.join(candidate.artifactRoot, "release-evidence.json"),
      policy: checkedPolicy,
      policyPath: "docs/security/hosting-security-policy.json"
    })
  );
  const initialCapturedAt = nextNow("Initial artifact snapshot capturedAt");
  const [actionInitial, readbackInitial] = await Promise.all([
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawActionResponse,
      label: "Raw action response",
      bindingLock,
      rawRootLock
    }),
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawFinalReadback,
      label: "Raw final readback",
      bindingLock,
      rawRootLock
    })
  ]);
  if (
    actionInitial.identity.realPath === readbackInitial.identity.realPath
    || (actionInitial.identity.dev === readbackInitial.identity.dev
      && actionInitial.identity.ino === readbackInitial.identity.ino)
  ) {
    fail("PROVIDER_CANDIDATE_INPUT_PATH_DUPLICATE", "Raw action response and final readback resolve to the same file.");
  }
  const projection = await runSyntheticAdapter({
    adapter,
    candidate,
    actionResponse: actionInitial,
    finalReadback: readbackInitial
  });
  if (!SYNTHETIC_PROJECTIONS.has(projection)) {
    fail("PROVIDER_CANDIDATE_ADAPTER_PROVENANCE_INVALID", "Synthetic projection lost its private provenance brand.");
  }
  if (Date.parse(projection.finalReadback.observedAt) > Date.parse(startedAt)) {
    fail(
      "PROVIDER_CANDIDATE_TIME_ORDER_INVALID",
      "Final provider readback cannot postdate the start of an offline parse over already-existing raw files."
    );
  }
  const [actionFinal, readbackFinal] = await Promise.all([
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawActionResponse,
      label: "Raw action response after parsing",
      bindingLock,
      rawRootLock
    }),
    stableJsonFileSnapshot({
      candidate,
      filePath: candidate.rawFinalReadback,
      label: "Raw final readback after parsing",
      bindingLock,
      rawRootLock
    })
  ]);
  assertRawSnapshotStable(actionInitial, actionFinal, "Raw action response");
  assertRawSnapshotStable(readbackInitial, readbackFinal, "Raw final readback");
  await assertArtifactTreeSafe(candidate.artifactRoot, "Artifact root after parsing");
  const finalArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  assertDeployedPwaCandidateArtifactIdentityStable(initialArtifact, finalArtifact);
  const finalExpectation = assertSchemaValidatedExpectation(
    candidate,
    finalArtifact,
    await loadDeployedHostExpectation({
      cwd,
      artifactRoot: candidate.artifactRoot,
      evidencePath: path.join(candidate.artifactRoot, "release-evidence.json"),
      policy: checkedPolicy,
      policyPath: "docs/security/hosting-security-policy.json"
    })
  );
  assertExpectationStable(initialExpectation, finalExpectation);
  await assertDirectoryLock(candidate.bindingRoot, bindingLock, "Binding root");
  await assertDirectoryLock(candidate.rawRoot, rawRootLock, "Raw input root");
  await assertDirectoryLock(candidate.artifactRoot, artifactRootLock, "Artifact root");
  const finalCapturedAt = nextNow("Final artifact snapshot capturedAt");
  const completedAt = nextNow("Offline parse completedAt");
  if (
    Date.parse(startedAt) > Date.parse(initialCapturedAt)
    || Date.parse(initialCapturedAt) > Date.parse(finalCapturedAt)
    || Date.parse(finalCapturedAt) > Date.parse(completedAt)
  ) fail("PROVIDER_CANDIDATE_TIME_ORDER_INVALID", "Offline parse and artifact snapshot timestamps are not ordered.");
  const initialSnapshot = artifactSnapshot("initial", initialCapturedAt, initialArtifact, initialExpectation);
  const finalSnapshot = artifactSnapshot("final", finalCapturedAt, finalArtifact, finalExpectation);
  const attachmentBytes = new Map([
    ["raw-action-response", Buffer.from(actionInitial.bytes)],
    ["raw-final-readback", Buffer.from(readbackInitial.bytes)],
    ["synthetic-normalized-projection", jsonBytes(projection)],
    ["artifact-initial", jsonBytes(initialSnapshot)],
    ["artifact-final", jsonBytes(finalSnapshot)]
  ]);
  const plannedAttachments = Object.freeze(Object.fromEntries(PROVIDER_DEPLOYMENT_CANDIDATE_ATTACHMENT_ROLES.map((role) => {
    const bytes = attachmentBytes.get(role);
    return [role, Object.freeze({
      path: relativeBoundPath(candidate.bindingRoot, path.join(candidate.outputRoot, ATTACHMENT_FILE_NAMES[role]), `${role} output binding`),
      size: bytes.length,
      sha256: sha256(bytes),
      mediaType: "application/json"
    })];
  })));
  const action = projection.actionResponse;
  const readback = projection.finalReadback;
  const document = {
    schemaVersion: 1,
    receiptType: "provider_deployment_receipt_candidate_v1",
    receiptId: `${candidate.runId}-${candidate.action.replaceAll("_", "-")}`,
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    verificationKind: "synthetic-offline-adapter-contract-existing-sanitized-files",
    adapter: {
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      trustClass: "synthetic_contract_only",
      providerAuthenticated: false
    },
    candidateScope: {
      provider: candidate.provider,
      action: candidate.action,
      accountId: action.accountId,
      projectId: action.projectId,
      environment: action.environment,
      origin: action.origin,
      immutableDeploymentUrl: action.immutableDeploymentUrl
    },
    operation: {
      operationId: action.operationId,
      beforeActiveDeploymentId: action.beforeActiveDeploymentId,
      requestedTargetDeploymentId: action.requestedTargetDeploymentId,
      resultActiveDeploymentId: action.resultActiveDeploymentId,
      resultDerivation: action.resultDerivation,
      derivedFromDeploymentId: action.derivedFromDeploymentId,
      sequenceEligible: action.sequenceEligible,
      providerStatus: readback.providerStatus,
      terminal: true,
      successful: true,
      startedAt: action.startedAt,
      acceptedAt: action.acceptedAt,
      completedAt: action.completedAt,
      finalReadbackObservedAt: readback.observedAt
    },
    artifactIdentity: {
      channel: "default-v13",
      releaseEvidenceId: initialArtifact.releaseEvidenceId,
      descriptor: structuredClone(initialArtifact.descriptor),
      buildVersion: initialArtifact.buildVersion,
      artifactSetDigest: initialArtifact.artifactSetDigest,
      identityLock: {
        path: relativeBoundPath(candidate.bindingRoot, candidate.artifactLock, "Artifact identity lock binding"),
        sha256: initialArtifact.verificationSnapshot.lockFile.sha256,
        lockDigest: initialArtifact.lockDigest
      },
      releaseEvidence: {
        path: relativeBoundPath(candidate.bindingRoot, path.join(candidate.artifactRoot, "release-evidence.json"), "Release Evidence binding"),
        size: initialExpectation.releaseEvidence.size,
        sha256: initialExpectation.releaseEvidence.sha256
      },
      hostingPolicy: {
        path: initialExpectation.policyBinding.path,
        policyId: initialExpectation.policyBinding.policyId,
        sha256: initialExpectation.policyBinding.sha256,
        canonicalSha256: initialExpectation.policyBinding.canonicalSha256
      },
      expectationDigest: sha256(canonicalJson(initialExpectation))
    },
    rawInputs: {
      credentialMaterialEmbedded: false,
      actionResponse: actionInitial.binding,
      finalReadback: readbackInitial.binding
    },
    semanticGates: {
      rawFilesStable: true,
      artifactIdentityStableDuringOfflineParse: true,
      syntheticProjectionConsistent: true,
      operationTerminal: true,
      operationSuccessful: true,
      credentialMaterialAbsent: true
    },
    attempts: {
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false
    },
    admissionGates: {
      trustedProviderParserVerified: false,
      providerAuthenticatedReceiptVerified: false,
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
      deploymentOperationObserved: false,
      rollbackObserved: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    },
    attachments: plannedAttachments,
    attachmentSetDigest: sha256(canonicalJson(plannedAttachments)),
    startedAt,
    completedAt,
    receiptDigest: "0".repeat(64)
  };
  document.receiptDigest = receiptDigest(document);
  schemaValidator.assert(document);

  const prepared = await createOutputDirectory(candidate, bindingLock);
  for (const role of PROVIDER_DEPLOYMENT_CANDIDATE_ATTACHMENT_ROLES) {
    const attachment = plannedAttachments[role];
    const written = await atomicWriteExclusive(
      prepared,
      ATTACHMENT_FILE_NAMES[role],
      attachmentBytes.get(role)
    );
    if (canonicalJson({ ...written.binding, mediaType: "application/json" })
      !== canonicalJson(attachment)) {
      fail("PROVIDER_CANDIDATE_ATTACHMENT_BINDING_MISMATCH", `${role} output bytes do not match their prevalidated binding.`);
    }
  }
  const receiptBytes = jsonBytes(document);
  const writtenReceipt = await atomicWriteExclusive(
    prepared,
    RECEIPT_FILE_NAME,
    receiptBytes
  );
  const commitBytes = terminalCommitBytes(receiptBytes);
  const writtenPendingTerminalCommit = await atomicWriteExclusive(
    prepared,
    PENDING_TERMINAL_COMMIT_FILE_NAME,
    commitBytes
  );
  await revalidateProviderCandidateSourcesBeforeTerminalCommit({
    candidate,
    cwd,
    checkedPolicy,
    bindingLock,
    rawRootLock,
    artifactRootLock,
    actionInitial,
    readbackInitial,
    finalArtifact,
    finalExpectation,
    prepared,
    plannedAttachments,
    writtenReceipt,
    writtenPendingTerminalCommit
  });
  assertExactTerminalCommitNameTransition();

  const terminalCommitPath = path.join(candidate.outputRoot, TERMINAL_COMMIT_FILE_NAME);
  const terminalGateBinding = Object.freeze({
    path: relativeBoundPath(candidate.bindingRoot, terminalCommitPath, "Candidate terminal commit binding"),
    size: commitBytes.length,
    sha256: sha256(commitBytes),
    commitsReceiptSha256: writtenReceipt.binding.sha256
  });
  const completedResult = Object.freeze({
    receiptPath: writtenReceipt.filePath,
    receiptBinding: writtenReceipt.binding,
    terminalGateBinding,
    document: immutableJsonSnapshot(document)
  });
  if (terminalCommitFault === TEST_ONLY_TERMINAL_COMMIT_FAULT) {
    await mkdir(terminalCommitPath, { recursive: false });
  }
  await rename(writtenPendingTerminalCommit.filePath, terminalCommitPath);
  return completedResult;
}

function assertProviderCollectorOptions(options) {
  if (
    options === null
    || typeof options !== "object"
    || Array.isArray(options)
    || Object.keys(options).some((key) => !["environment", "adapter", "cwd"].includes(key))
  ) {
    fail(
      "PROVIDER_CANDIDATE_COLLECTOR_INPUT_INVALID",
      "Provider candidate collector accepts only environment, adapter, and cwd inputs."
    );
  }
}

export async function collectProviderDeploymentCandidate(options = {}) {
  assertProviderCollectorOptions(options);
  return collectProviderDeploymentCandidateInternal(options);
}

export async function collectProviderDeploymentCandidateForTest(options, testOnly) {
  assertProviderCollectorOptions(options);
  if (!exactKeys(testOnly, ["fault"]) || testOnly.fault !== TEST_ONLY_TERMINAL_COMMIT_FAULT) {
    fail(
      "PROVIDER_CANDIDATE_TEST_FAULT_INVALID",
      `The only supported test-only fault is ${TEST_ONLY_TERMINAL_COMMIT_FAULT}.`
    );
  }
  return collectProviderDeploymentCandidateInternal(options, {
    terminalCommitFault: testOnly.fault
  });
}

async function runCli() {
  try {
    parseProviderDeploymentCandidateEnvironment(process.env);
    fail(
      "PROVIDER_CANDIDATE_ADAPTER_UNAVAILABLE",
      "No provider-specific adapter registry exists. Invoke the programmatic API with an explicitly branded synthetic adapter; real/provider-authenticated parsing is intentionally unavailable."
    );
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      usableReceiptWritten: false,
      outputDiscardRequired: true,
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
