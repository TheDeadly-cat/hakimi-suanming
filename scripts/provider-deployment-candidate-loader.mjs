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

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH =
  "docs/release/provider-deployment-receipt-candidate-v1.schema.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_ID =
  "https://hakimi.invalid/schemas/provider-deployment-receipt-candidate-v1.json";
export const PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_ENVIRONMENT_KEYS = Object.freeze({
  bindingRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_VERIFY_BINDING_ROOT",
  outputRoot: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_VERIFY_OUTPUT_ROOT",
  receiptPath: "HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_VERIFY_RECEIPT"
});

const RECEIPT_FILE_NAME = "provider-deployment-candidate-receipt.json";
const PENDING_TERMINAL_COMMIT_FILE_NAME =
  ".provider-deployment-candidate-receipt-publication-pending";
const TERMINAL_COMMIT_FILE_NAME = "provider-deployment-candidate-receipt-commit.sha256";
const TERMINAL_COMMIT_MARKER_BYTES = 65;
const ATTACHMENT_FILE_NAMES = Object.freeze({
  "raw-action-response": "raw-action-response.json",
  "raw-final-readback": "raw-final-readback.json",
  "synthetic-normalized-projection": "synthetic-normalized-projection.json",
  "artifact-initial": "artifact-initial.json",
  "artifact-final": "artifact-final.json"
});
const ATTACHMENT_ROLES = Object.freeze(Object.keys(ATTACHMENT_FILE_NAMES));
const HOSTING_POLICY_RECORDED_PATH = "docs/security/hosting-security-policy.json";
const HOSTING_POLICY_ID = "hakimi-web-public-hosting-baseline-v2";
const EXPECTED_OUTPUT_NAMES = Object.freeze([
  ...Object.values(ATTACHMENT_FILE_NAMES),
  RECEIPT_FILE_NAME,
  TERMINAL_COMMIT_FILE_NAME
].sort());
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
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/u;
const CANONICAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CREDENTIAL_KEYS = new Set([
  "authorization", "proxyauthorization", "cookie", "setcookie", "xapikey", "apikey", "apitoken",
  "accesstoken", "refreshtoken", "idtoken", "oauth", "oauthtoken", "token", "password", "passwd",
  "secret", "clientsecret", "privatekey", "accesskey", "accesskeyid", "secretkey", "secretaccesskey",
  "signingkey", "sessionkey", "accountkey", "subscriptionkey", "serviceaccountkey", "credential", "credentials"
]);
const CREDENTIAL_KEY_SUFFIXES = Object.freeze([
  "authorization", "cookie", "apikey", "apitoken", "accesstoken", "refreshtoken", "idtoken", "oauth",
  "oauthtoken", "token", "password", "passwd", "secret", "clientsecret", "privatekey", "accesskey",
  "accesskeyid", "secretkey", "secretaccesskey", "signingkey", "sessionkey", "accountkey", "subscriptionkey",
  "serviceaccountkey", "credential", "credentials"
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

function requireAbsoluteCanonicalPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || !path.isAbsolute(value)) {
    fail("PROVIDER_CANDIDATE_LOADER_PATH_INVALID", `${label} must be an explicit absolute path.`);
  }
  if (value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === "..")) {
    fail("PROVIDER_CANDIDATE_LOADER_PATH_INVALID", `${label} must not contain dot segments.`);
  }
  const resolved = path.resolve(value);
  if (value !== resolved) {
    fail("PROVIDER_CANDIDATE_LOADER_PATH_INVALID", `${label} must use its exact resolved filesystem spelling.`);
  }
  return resolved;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail("PROVIDER_CANDIDATE_LOADER_ENV_MISSING", `${key} must be explicit and free of surrounding whitespace.`);
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
  ) fail("PROVIDER_CANDIDATE_LOADER_PATH_OUTSIDE_ROOT", `${label} must be a strict descendant of its root.`);
  return relative.split(path.sep).join("/");
}

function pathIsWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function resolveRecordedPath(bindingRoot, recordedPath, label) {
  if (
    typeof recordedPath !== "string"
    || recordedPath.length === 0
    || recordedPath.startsWith("/")
    || recordedPath.includes("\\")
    || recordedPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) fail("PROVIDER_CANDIDATE_LOADER_RECORDED_PATH_INVALID", `${label} is not a canonical relative binding path.`);
  const resolved = path.resolve(bindingRoot, ...recordedPath.split("/"));
  relativeBoundPath(bindingRoot, resolved, label);
  return resolved;
}

export function parseProviderDeploymentCandidateLoaderInput(input) {
  if (!isRecord(input)) fail("PROVIDER_CANDIDATE_LOADER_INPUT_INVALID", "Loader input must be an object.");
  const bindingRoot = requireAbsoluteCanonicalPath(input.bindingRoot, "Binding root");
  const outputRoot = requireAbsoluteCanonicalPath(input.outputRoot, "Output root");
  const receiptPath = requireAbsoluteCanonicalPath(input.receiptPath, "Receipt path");
  relativeBoundPath(bindingRoot, outputRoot, "Output root");
  relativeBoundPath(outputRoot, receiptPath, "Receipt path");
  const fixedReceiptPath = path.join(outputRoot, RECEIPT_FILE_NAME);
  if (comparablePath(receiptPath) !== comparablePath(fixedReceiptPath)) {
    fail("PROVIDER_CANDIDATE_LOADER_RECEIPT_PATH_INVALID", `Receipt path must be the fixed ${RECEIPT_FILE_NAME}.`);
  }
  return Object.freeze({ bindingRoot, outputRoot, receiptPath });
}

export function parseProviderDeploymentCandidateLoaderEnvironment(environment = process.env) {
  if (!isRecord(environment)) fail("PROVIDER_CANDIDATE_LOADER_ENV_INVALID", "Environment must be an object.");
  return parseProviderDeploymentCandidateLoaderInput({
    bindingRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_ENVIRONMENT_KEYS.bindingRoot),
    outputRoot: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_ENVIRONMENT_KEYS.outputRoot),
    receiptPath: requireEnvironmentString(environment, PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_ENVIRONMENT_KEYS.receiptPath)
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

export function parseProviderDeploymentCandidateLoaderJsonBytes(bytes, label = "Candidate JSON") {
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0 || buffer.length > MAX_JSON_BYTES) {
    fail("PROVIDER_CANDIDATE_LOADER_JSON_SIZE_INVALID", `${label} must be 1-${MAX_JSON_BYTES} bytes.`);
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail("PROVIDER_CANDIDATE_LOADER_JSON_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM.`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_LOADER_JSON_UTF8_INVALID", `${label} is not strict UTF-8.`, error);
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
    fail("PROVIDER_CANDIDATE_LOADER_JSON_SYNTAX_INVALID", `${label} cannot be inspected as strict JSON.`, error);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (
        property.type !== "ObjectProperty"
        || property.computed !== false
        || property.key?.type !== "StringLiteral"
      ) fail("PROVIDER_CANDIDATE_LOADER_JSON_PROPERTY_INVALID", `${label} contains a non-JSON object property.`);
      if (keys.has(property.key.value)) {
        fail("PROVIDER_CANDIDATE_LOADER_JSON_DUPLICATE_KEY", `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`);
      }
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_LOADER_JSON_INVALID", `${label} is not valid JSON.`, error);
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
        fail("PROVIDER_CANDIDATE_LOADER_CREDENTIAL_PRESENT", `${label} contains a structured credential-bearing name.`);
      }
      stack.push(...current);
      continue;
    }
    if (isRecord(current)) {
      for (const [key, child] of Object.entries(current)) {
        if (isCredentialKey(key)) {
          fail("PROVIDER_CANDIDATE_LOADER_CREDENTIAL_PRESENT", `${label} contains credential-bearing key ${JSON.stringify(key)}.`);
        }
        stack.push(child);
      }
      for (const [key, child] of Object.entries(current)) {
        if (STRUCTURED_CREDENTIAL_NAME_FIELDS.has(normalizedCredentialKey(key))
          && typeof child === "string"
          && isCredentialKey(child)) {
          fail("PROVIDER_CANDIDATE_LOADER_CREDENTIAL_PRESENT", `${label} contains a structured credential-bearing name.`);
        }
      }
      continue;
    }
    if (typeof current === "string"
      && (CREDENTIAL_VALUE_PATTERN.test(current)
        || containsCredentialLabeledValue(current)
        || containsCredentialUrl(current))) {
      fail("PROVIDER_CANDIDATE_LOADER_CREDENTIAL_PRESENT", `${label} contains credential-like material.`);
    }
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
    fail("PROVIDER_CANDIDATE_LOADER_ROOT_LOCK_FAILED", `${label} could not be locked.`, error);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.ino === 0n) {
    fail("PROVIDER_CANDIDATE_LOADER_ROOT_LOCK_INVALID", `${label} must be a real directory with filesystem identity.`);
  }
  if (comparablePath(resolved) !== comparablePath(directoryPath)) {
    fail("PROVIDER_CANDIDATE_LOADER_PATH_ALIAS", `${label} must not resolve through an aliased parent path.`);
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
    fail("PROVIDER_CANDIDATE_LOADER_ROOT_REBOUND", `${label} changed during verification.`);
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
      fail("PROVIDER_CANDIDATE_LOADER_PATH_UNREADABLE", `${label} cannot be inspected.`, error);
    }
    if (metadata.isSymbolicLink()) {
      fail("PROVIDER_CANDIDATE_LOADER_PATH_ALIAS", `${label} cannot traverse a symlink or junction.`);
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

async function stableOutputFileSnapshot({ input, filePath, label, bindingLock, outputLock }) {
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(input.outputRoot, outputLock, "Output root")
  ]);
  await assertNoAliases(input.bindingRoot, filePath, label);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    fail("PROVIDER_CANDIDATE_LOADER_FILE_OPEN_FAILED", `${label} could not be opened.`, error);
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
    ) fail("PROVIDER_CANDIDATE_LOADER_FILE_UNSAFE", `${label} must be a bounded single-link regular file.`);
    relativeBoundPath(outputLock.realPath, resolvedBefore, `${label} resolved output path`);
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const [after, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    await Promise.all([
      assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
      assertDirectoryLock(input.outputRoot, outputLock, "Output root")
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
    ) fail("PROVIDER_CANDIDATE_LOADER_FILE_REBOUND", `${label} changed during its stable opened-file read.`);
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

async function stableBindingRootFileSnapshot({ input, filePath, label, bindingLock }) {
  return stableOutputFileSnapshot({
    input: { bindingRoot: input.bindingRoot, outputRoot: input.bindingRoot },
    filePath,
    label,
    bindingLock,
    outputLock: bindingLock
  });
}

function stableFileProjection(snapshot) {
  return { binding: snapshot?.binding, identity: snapshot?.identity };
}

function assertStableFile(initial, final, label) {
  if (canonicalJson(stableFileProjection(initial)) !== canonicalJson(stableFileProjection(final))) {
    fail("PROVIDER_CANDIDATE_LOADER_FILE_REBOUND", `${label} changed across verification.`);
  }
}

function requireSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail("PROVIDER_CANDIDATE_LOADER_DIGEST_INVALID", `${label} must be SHA-256.`);
  }
  return value;
}

function requireTimestamp(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail("PROVIDER_CANDIDATE_LOADER_TIME_INVALID", `${label} must be a canonical ISO timestamp.`);
  }
  return value;
}

function requireCanonicalId(value, label) {
  if (typeof value !== "string" || !CANONICAL_ID_PATTERN.test(value)) {
    fail("PROVIDER_CANDIDATE_LOADER_ID_INVALID", `${label} is not canonical.`);
  }
  return value;
}

function requireCanonicalOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("PROVIDER_CANDIDATE_LOADER_ORIGIN_INVALID", `${label} must be a canonical public HTTPS origin.`, error);
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
  ) fail("PROVIDER_CANDIDATE_LOADER_ORIGIN_INVALID", `${label} must be a canonical public HTTPS origin.`);
  return value;
}

function assertDefaultDescriptor(value, label) {
  if (canonicalJson(value) !== canonicalJson(DEFAULT_DESCRIPTOR)) {
    fail("PROVIDER_CANDIDATE_LOADER_DESCRIPTOR_INVALID", `${label} is not the exact frozen default-v13 descriptor.`);
  }
}

function validateProjection(value) {
  const commonKeys = ["provider", "action", "operationId", "accountId", "projectId", "environment", "origin"];
  if (
    !exactKeys(value, ["schemaVersion", "recordType", "provider", "action", "actionResponse", "finalReadback"])
    || value.schemaVersion !== 1
    || value.recordType !== "synthetic_provider_deployment_projection_v1"
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
  ) fail("PROVIDER_CANDIDATE_LOADER_PROJECTION_INVALID", "Synthetic projection has an invalid exact shape.");
  const action = value.actionResponse;
  const readback = value.finalReadback;
  for (const [candidate, label] of [
    [action.operationId, "Action operation id"],
    [action.accountId, "Action account id"],
    [action.projectId, "Action project id"],
    [action.environment, "Action environment"],
    [readback.operationId, "Readback operation id"],
    [readback.accountId, "Readback account id"],
    [readback.projectId, "Readback project id"],
    [readback.environment, "Readback environment"],
    [readback.providerStatus, "Readback provider status"]
  ]) requireCanonicalId(candidate, label);
  for (const [candidate, label] of [
    [action.origin, "Action origin"],
    [readback.origin, "Readback origin"],
    [action.immutableDeploymentUrl, "Action immutable deployment URL"],
    [readback.immutableDeploymentUrl, "Readback immutable deployment URL"]
  ]) requireCanonicalOrigin(candidate, label);
  if (
    value.provider !== action.provider
    || value.provider !== readback.provider
    || value.action !== action.action
    || value.action !== readback.action
    || action.operationId !== readback.operationId
    || action.accountId !== readback.accountId
    || action.projectId !== readback.projectId
    || action.environment !== readback.environment
    || action.origin !== readback.origin
    || action.resultActiveDeploymentId !== readback.activeDeploymentId
    || action.immutableDeploymentUrl !== readback.immutableDeploymentUrl
  ) fail("PROVIDER_CANDIDATE_LOADER_PROJECTION_MISMATCH", "Action and readback projection identities disagree.");
  if (action.credentialMaterialEmbedded !== false || readback.credentialMaterialEmbedded !== false) {
    fail("PROVIDER_CANDIDATE_LOADER_CREDENTIAL_PRESENT", "Projection does not preserve the no-credential boundary.");
  }
  const startedAt = requireTimestamp(action.startedAt, "Operation startedAt");
  const acceptedAt = requireTimestamp(action.acceptedAt, "Operation acceptedAt");
  const completedAt = requireTimestamp(action.completedAt, "Operation completedAt");
  const observedAt = requireTimestamp(readback.observedAt, "Readback observedAt");
  if (
    readback.terminal !== true
    || readback.successful !== true
    || Date.parse(startedAt) > Date.parse(acceptedAt)
    || Date.parse(acceptedAt) > Date.parse(completedAt)
    || Date.parse(completedAt) > Date.parse(observedAt)
  ) fail("PROVIDER_CANDIDATE_LOADER_OPERATION_INVALID", "Projection terminal state or chronology is invalid.");
  for (const [candidate, label, nullable] of [
    [action.beforeActiveDeploymentId, "Before deployment id", true],
    [action.requestedTargetDeploymentId, "Requested deployment id", true],
    [action.resultActiveDeploymentId, "Result deployment id", false],
    [action.derivedFromDeploymentId, "Derived-from deployment id", true],
    [readback.activeDeploymentId, "Readback deployment id", false]
  ]) {
    if (candidate === null && nullable) continue;
    requireCanonicalId(candidate, label);
  }
  const before = action.beforeActiveDeploymentId;
  const requested = action.requestedTargetDeploymentId;
  const result = action.resultActiveDeploymentId;
  const derivedFrom = action.derivedFromDeploymentId;
  if (!["activated_requested", "provider_created_from_requested", "provider_assigned_new"].includes(action.resultDerivation)) {
    fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "Projection result derivation is invalid.");
  }
  if (value.action === "deploy_candidate") {
    if ((before === null) !== (action.sequenceEligible === false) || (before !== null && result === before)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "Deploy candidate identity relation is invalid.");
    }
    if (action.resultDerivation === "activated_requested"
      && !(requested !== null && result === requested && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "activated_requested deploy relation is invalid.");
    }
    if (action.resultDerivation === "provider_assigned_new"
      && !(requested === null && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "provider_assigned_new deploy relation is invalid.");
    }
    if (action.resultDerivation === "provider_created_from_requested"
      && !(requested !== null && result !== requested && derivedFrom === requested)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "provider_created_from_requested deploy relation is invalid.");
    }
  } else if (value.action === "restore_baseline") {
    if (
      before === null
      || requested === null
      || before === requested
      || result === before
      || action.sequenceEligible !== true
      || action.resultDerivation === "provider_assigned_new"
    ) fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "Restore candidate identity relation is invalid.");
    if (action.resultDerivation === "activated_requested" && !(result === requested && derivedFrom === null)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "activated_requested restore relation is invalid.");
    }
    if (action.resultDerivation === "provider_created_from_requested"
      && !(result !== requested && derivedFrom === requested)) {
      fail("PROVIDER_CANDIDATE_LOADER_DERIVATION_INVALID", "provider_created_from_requested restore relation is invalid.");
    }
  } else {
    fail("PROVIDER_CANDIDATE_LOADER_ACTION_INVALID", "Projection action is invalid.");
  }
  return value;
}

function validateArtifactEntry(entry, label) {
  if (!exactKeys(entry, ["path", "size", "sha256"])) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} has an invalid exact shape.`);
  }
  if (typeof entry.path !== "string" || entry.path.length === 0 || !Number.isSafeInteger(entry.size) || entry.size <= 0) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} has invalid path or size.`);
  }
  requireSha256(entry.sha256, `${label} sha256`);
}

function validateCurrentClosedHostingPolicy(policy, label) {
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
    || !isRecord(policy.headers)
    || typeof policy.headers["Content-Security-Policy-Report-Only"] !== "string"
    || Object.hasOwn(policy.headers, "Content-Security-Policy")
    || !isRecord(policy.cacheRules)
    || !Array.isArray(policy.documentRoutes)
    || policy.releaseEvidencePath !== "/release-evidence.json"
    || !Array.isArray(policy.nonPublicArtifactPaths)
    || !policy.nonPublicArtifactPaths.includes("_headers")
    || !policy.nonPublicArtifactPaths.includes("release-evidence.json.sha256")
    || !isRecord(policy.contentTypes)
    || !Array.isArray(policy.redirectRules)
    || !exactKeys(policy.publicReleaseGate, [
      "httpsRequired", "realHostHeadersVerified", "cspBlockingModeVerified", "unnecessaryThirdPartyScriptsAllowed"
    ])
    || policy.publicReleaseGate.httpsRequired !== true
    || policy.publicReleaseGate.realHostHeadersVerified !== false
    || policy.publicReleaseGate.cspBlockingModeVerified !== false
    || policy.publicReleaseGate.unnecessaryThirdPartyScriptsAllowed !== false) {
    fail("PROVIDER_CANDIDATE_LOADER_POLICY_NOT_CLOSED", `${label} is not the closed v2 hosting policy.`);
  }
  return policy;
}

function validateExpectation(expectation, label, checkedPolicy) {
  if (!exactKeys(expectation, [
    "expectationKind", "evidenceId", "artifactSetDigest", "descriptor", "releaseIdentity", "policyBinding",
    "artifactIdentityLockBinding", "releaseEvidence", "artifacts", "lockedBytes"
  ])) fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} expectation shape is invalid.`);
  if (expectation.expectationKind !== "schema-validated-release-evidence-expectation-v1"
    || !EVIDENCE_ID_PATTERN.test(expectation.evidenceId ?? "")) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} expectation identity is invalid.`);
  }
  assertDefaultDescriptor(expectation.descriptor, `${label} expectation descriptor`);
  if (!Array.isArray(expectation.artifacts) || expectation.artifacts.length === 0) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} artifact inventory is empty.`);
  }
  for (const [index, entry] of expectation.artifacts.entries()) validateArtifactEntry(entry, `${label} artifact ${index}`);
  const artifactPaths = expectation.artifacts.map((entry) => entry.path);
  for (const artifactPath of artifactPaths) {
    if (artifactPath.startsWith("/") || artifactPath.includes("\\")
      || artifactPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
      fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} artifact path is not canonical.`);
    }
  }
  if (new Set(artifactPaths).size !== expectation.artifacts.length
    || canonicalJson(artifactPaths) !== canonicalJson([...artifactPaths].sort())
    || expectation.artifactSetDigest !== sha256(canonicalJson(expectation.artifacts))) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} artifact inventory digest is invalid.`);
  }
  if (!exactKeys(expectation.releaseIdentity, ["descriptor", "manifestVersion", "manifestDigest", "buildVersion", "evidenceId"])
    || expectation.releaseIdentity.manifestVersion !== 1
    || expectation.releaseIdentity.evidenceId !== expectation.evidenceId
    || !BUILD_VERSION_PATTERN.test(expectation.releaseIdentity.buildVersion ?? "")) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} release identity is invalid.`);
  }
  assertDefaultDescriptor(expectation.releaseIdentity.descriptor, `${label} release identity descriptor`);
  requireSha256(expectation.releaseIdentity.manifestDigest, `${label} manifest digest`);
  if (!exactKeys(expectation.policyBinding, ["path", "policyId", "sha256", "canonicalSha256", "canonicalPolicy"])
    || typeof expectation.policyBinding.path !== "string"
    || typeof expectation.policyBinding.canonicalPolicy !== "string") {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} policy binding is invalid.`);
  }
  requireCanonicalId(expectation.policyBinding.policyId, `${label} policy id`);
  requireSha256(expectation.policyBinding.sha256, `${label} policy sha256`);
  requireSha256(expectation.policyBinding.canonicalSha256, `${label} canonical policy sha256`);
  const canonicalPolicy = parseProviderDeploymentCandidateLoaderJsonBytes(
    Buffer.from(expectation.policyBinding.canonicalPolicy, "utf8"),
    `${label} canonical policy`
  );
  if (canonicalJson(canonicalPolicy) !== expectation.policyBinding.canonicalPolicy
    || sha256(expectation.policyBinding.canonicalPolicy) !== expectation.policyBinding.canonicalSha256) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} canonical policy binding is invalid.`);
  }
  validateCurrentClosedHostingPolicy(canonicalPolicy, `${label} canonical hosting policy`);
  if (
    expectation.policyBinding.path !== HOSTING_POLICY_RECORDED_PATH
    || expectation.policyBinding.policyId !== checkedPolicy.policyId
    || expectation.policyBinding.sha256 !== checkedPolicy.rawSha256
    || expectation.policyBinding.canonicalSha256 !== checkedPolicy.canonicalSha256
    || expectation.policyBinding.canonicalPolicy !== checkedPolicy.canonicalPolicy
  ) fail("PROVIDER_CANDIDATE_LOADER_POLICY_SOURCE_MISMATCH", `${label} policy binding does not match the current checked source bytes.`);
  if (!exactKeys(expectation.artifactIdentityLockBinding, ["path", "sha256", "lockDigest", "artifactSetDigest"])) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} identity-lock binding is invalid.`);
  }
  for (const [candidate, digestLabel] of [
    [expectation.artifactIdentityLockBinding.sha256, "identity-lock sha256"],
    [expectation.artifactIdentityLockBinding.lockDigest, "identity-lock digest"],
    [expectation.artifactIdentityLockBinding.artifactSetDigest, "identity-lock artifact digest"]
  ]) requireSha256(candidate, `${label} ${digestLabel}`);
  if (!exactKeys(expectation.releaseEvidence, ["size", "sha256"])
    || !Number.isSafeInteger(expectation.releaseEvidence.size)
    || expectation.releaseEvidence.size <= 0) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} Release Evidence binding is invalid.`);
  }
  requireSha256(expectation.releaseEvidence.sha256, `${label} Release Evidence sha256`);
  if (!exactKeys(expectation.lockedBytes, ["indexHtmlSha256", "manifestSha256", "serviceWorkerSha256"])) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} locked bytes shape is invalid.`);
  }
  for (const [candidate, digestLabel] of [
    [expectation.lockedBytes.indexHtmlSha256, "index sha256"],
    [expectation.lockedBytes.manifestSha256, "manifest sha256"],
    [expectation.lockedBytes.serviceWorkerSha256, "Service Worker sha256"]
  ]) requireSha256(candidate, `${label} ${digestLabel}`);
  const byPath = new Map(expectation.artifacts.map((entry) => [entry.path, entry]));
  if (
    !byPath.has("_headers")
    || byPath.get("index.html")?.sha256 !== expectation.lockedBytes.indexHtmlSha256
    || byPath.get("manifest.webmanifest")?.sha256 !== expectation.lockedBytes.manifestSha256
    || byPath.get("sw.js")?.sha256 !== expectation.lockedBytes.serviceWorkerSha256
  ) fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${label} locked bytes do not match the inventory.`);
  return expectation;
}

function validateArtifactSnapshot(snapshot, phase, receipt, checkedPolicy) {
  if (!exactKeys(snapshot, [
    "schemaVersion", "recordType", "phase", "capturedAt", "releaseEvidenceId", "descriptor", "buildVersion",
    "artifactSetDigest", "releaseEvidenceExpectationDigest", "releaseEvidenceExpectation", "artifactLock"
  ])
    || snapshot.schemaVersion !== 1
    || snapshot.recordType !== "provider_deployment_candidate_artifact_snapshot_v1"
    || snapshot.phase !== phase
    || !EVIDENCE_ID_PATTERN.test(snapshot.releaseEvidenceId ?? "")
    || !BUILD_VERSION_PATTERN.test(snapshot.buildVersion ?? "")) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${phase} artifact snapshot shape or identity is invalid.`);
  }
  requireTimestamp(snapshot.capturedAt, `${phase} artifact capturedAt`);
  assertDefaultDescriptor(snapshot.descriptor, `${phase} artifact descriptor`);
  requireSha256(snapshot.artifactSetDigest, `${phase} artifact-set digest`);
  requireSha256(snapshot.releaseEvidenceExpectationDigest, `${phase} expectation digest`);
  if (!exactKeys(snapshot.artifactLock, ["path", "sha256", "lockDigest"])) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${phase} artifact lock shape is invalid.`);
  }
  requireSha256(snapshot.artifactLock.sha256, `${phase} artifact lock sha256`);
  requireSha256(snapshot.artifactLock.lockDigest, `${phase} artifact lock digest`);
  const expectation = validateExpectation(snapshot.releaseEvidenceExpectation, phase, checkedPolicy);
  if (snapshot.releaseEvidenceExpectationDigest !== sha256(canonicalJson(expectation))) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_INVALID", `${phase} expectation digest is invalid.`);
  }
  const identity = receipt.artifactIdentity;
  if (
    snapshot.releaseEvidenceId !== identity.releaseEvidenceId
    || canonicalJson(snapshot.descriptor) !== canonicalJson(identity.descriptor)
    || snapshot.buildVersion !== identity.buildVersion
    || snapshot.artifactSetDigest !== identity.artifactSetDigest
    || snapshot.releaseEvidenceExpectationDigest !== identity.expectationDigest
    || snapshot.artifactLock.path !== identity.identityLock.path
    || snapshot.artifactLock.sha256 !== identity.identityLock.sha256
    || snapshot.artifactLock.lockDigest !== identity.identityLock.lockDigest
    || expectation.evidenceId !== identity.releaseEvidenceId
    || expectation.artifactSetDigest !== identity.artifactSetDigest
    || canonicalJson(expectation.descriptor) !== canonicalJson(identity.descriptor)
    || expectation.releaseIdentity.evidenceId !== identity.releaseEvidenceId
    || expectation.releaseIdentity.buildVersion !== identity.buildVersion
    || expectation.artifactIdentityLockBinding.path !== identity.identityLock.path
    || expectation.artifactIdentityLockBinding.sha256 !== identity.identityLock.sha256
    || expectation.artifactIdentityLockBinding.lockDigest !== identity.identityLock.lockDigest
    || expectation.artifactIdentityLockBinding.artifactSetDigest !== identity.artifactSetDigest
    || expectation.releaseEvidence.size !== identity.releaseEvidence.size
    || expectation.releaseEvidence.sha256 !== identity.releaseEvidence.sha256
    || expectation.policyBinding.path !== identity.hostingPolicy.path
    || expectation.policyBinding.policyId !== identity.hostingPolicy.policyId
    || expectation.policyBinding.sha256 !== identity.hostingPolicy.sha256
    || expectation.policyBinding.canonicalSha256 !== identity.hostingPolicy.canonicalSha256
  ) fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_CROSS_BINDING_INVALID", `${phase} artifact snapshot does not match the receipt.`);
  return snapshot;
}

function withoutSnapshotPhase(value) {
  const { phase: _phase, capturedAt: _capturedAt, ...stable } = value;
  return stable;
}

function receiptDigest(document) {
  const { receiptDigest: _receiptDigest, ...unsigned } = document;
  return sha256(canonicalJson(unsigned));
}

function assertReceiptProjectionCrossBinding(receipt, projection) {
  const action = projection.actionResponse;
  const readback = projection.finalReadback;
  const expectedScope = {
    provider: projection.provider,
    action: projection.action,
    accountId: action.accountId,
    projectId: action.projectId,
    environment: action.environment,
    origin: action.origin,
    immutableDeploymentUrl: action.immutableDeploymentUrl
  };
  const expectedOperation = {
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
  };
  if (canonicalJson(receipt.candidateScope) !== canonicalJson(expectedScope)
    || canonicalJson(receipt.operation) !== canonicalJson(expectedOperation)) {
    fail("PROVIDER_CANDIDATE_LOADER_PROJECTION_CROSS_BINDING_INVALID", "Receipt scope or operation does not match the projection.");
  }
  const actionSuffix = projection.action === "deploy_candidate" ? "-deploy-candidate" : "-restore-baseline";
  const runId = receipt.receiptId.endsWith(actionSuffix)
    ? receipt.receiptId.slice(0, -actionSuffix.length)
    : "";
  if (!RUN_ID_PATTERN.test(runId)) {
    fail("PROVIDER_CANDIDATE_LOADER_RECEIPT_ID_INVALID", "Receipt id is not bound to its action and canonical run id.");
  }
  const receiptStartedAt = requireTimestamp(receipt.startedAt, "Receipt startedAt");
  const receiptCompletedAt = requireTimestamp(receipt.completedAt, "Receipt completedAt");
  if (Date.parse(readback.observedAt) > Date.parse(receiptStartedAt)
    || Date.parse(receiptStartedAt) > Date.parse(receiptCompletedAt)) {
    fail("PROVIDER_CANDIDATE_LOADER_TIME_INVALID", "Operation and offline receipt chronology is invalid.");
  }
}

function assertSourceBindingOutsideOutput(input, binding, label) {
  const source = resolveRecordedPath(input.bindingRoot, binding.path, label);
  if (pathIsWithin(input.outputRoot, source)) {
    fail("PROVIDER_CANDIDATE_LOADER_SOURCE_PATH_INVALID", `${label} cannot point into the candidate output root.`);
  }
}

async function loadSchemaValidator(cwd) {
  const schemaPath = path.resolve(cwd, PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileEvidenceSchemaForId(schema, PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_ID);
}

async function assertExactOutputNames(outputRoot) {
  const names = (await readdir(outputRoot)).sort();
  if (canonicalJson(names) !== canonicalJson(EXPECTED_OUTPUT_NAMES)) {
    const pendingState = names.includes(PENDING_TERMINAL_COMMIT_FILE_NAME);
    fail(
      "PROVIDER_CANDIDATE_LOADER_OUTPUT_SET_INVALID",
      pendingState
        ? "Prepared candidate output is not committed and must not be loaded."
        : "Committed candidate output must contain exactly five attachments, the final receipt, and the terminal commit marker."
    );
  }
}

function validateTerminalCommitMarker(markerSnapshot, receiptSnapshot) {
  const markerBytes = markerSnapshot.bytes;
  const expectedBytes = Buffer.from(`${sha256(receiptSnapshot.bytes)}\n`, "utf8");
  if (
    markerBytes.length !== TERMINAL_COMMIT_MARKER_BYTES
    || expectedBytes.length !== TERMINAL_COMMIT_MARKER_BYTES
    || !/^[a-f0-9]{64}\n$/u.test(markerBytes.toString("ascii"))
    || !markerBytes.equals(expectedBytes)
  ) {
    fail(
      "PROVIDER_CANDIDATE_LOADER_TERMINAL_COMMIT_MARKER_INVALID",
      "Terminal commit marker must contain the exact raw receipt SHA-256 followed by one LF byte."
    );
  }
  return Object.freeze({
    path: markerSnapshot.binding.path,
    size: markerSnapshot.binding.size,
    sha256: markerSnapshot.binding.sha256,
    commitsReceiptSha256: receiptSnapshot.binding.sha256
  });
}

function outputFileLabel(role, { final = false } = {}) {
  const suffix = final ? " after verification" : "";
  if (role === "receipt") return `Candidate receipt${suffix}`;
  if (role === "terminal-gate") return `Candidate terminal commit marker${suffix}`;
  return `Candidate attachment ${role}${suffix}`;
}

function assertDistinctPhysicalFiles(snapshots) {
  const identities = [...snapshots.values()].map((snapshot) => `${snapshot.identity.dev}:${snapshot.identity.ino}`);
  const realPaths = [...snapshots.values()].map((snapshot) => snapshot.identity.realPath);
  if (new Set(identities).size !== identities.length || new Set(realPaths).size !== realPaths.length) {
    fail("PROVIDER_CANDIDATE_LOADER_FILE_IDENTITY_REUSED", "Candidate output files must have distinct physical identities.");
  }
}

export async function loadVerifiedProviderDeploymentCandidateOutput({
  bindingRoot,
  outputRoot,
  receiptPath,
  cwd = process.cwd()
}) {
  const input = parseProviderDeploymentCandidateLoaderInput({ bindingRoot, outputRoot, receiptPath });
  if (comparablePath(input.bindingRoot) !== comparablePath(path.resolve(cwd))) {
    fail(
      "PROVIDER_CANDIDATE_LOADER_BINDING_ROOT_CWD_MISMATCH",
      "Binding root must exactly equal cwd so every recorded path has one unambiguous base."
    );
  }
  const [schemaValidator, bindingLock, outputLock] = await Promise.all([
    loadSchemaValidator(cwd),
    captureDirectoryLock(input.bindingRoot, "Binding root"),
    captureDirectoryLock(input.outputRoot, "Output root")
  ]);
  if (bindingLock.realPath !== comparablePath(await realpath(cwd))) {
    fail("PROVIDER_CANDIDATE_LOADER_BINDING_ROOT_CWD_MISMATCH", "Binding root and cwd do not share one physical directory identity.");
  }
  relativeBoundPath(bindingLock.realPath, outputLock.realPath, "Resolved output root");
  await assertNoAliases(input.bindingRoot, input.outputRoot, "Output root");
  const policySourcePath = path.join(input.bindingRoot, ...HOSTING_POLICY_RECORDED_PATH.split("/"));
  const initialPolicySnapshot = await stableBindingRootFileSnapshot({
    input,
    filePath: policySourcePath,
    label: "Current hosting policy",
    bindingLock
  });
  const currentPolicyDocument = validateCurrentClosedHostingPolicy(
    parseProviderDeploymentCandidateLoaderJsonBytes(initialPolicySnapshot.bytes, "Current hosting policy"),
    "Current hosting policy"
  );
  const checkedPolicyCanonical = canonicalJson(currentPolicyDocument);
  const checkedPolicy = Object.freeze({
    policyId: currentPolicyDocument.policyId,
    rawSha256: initialPolicySnapshot.binding.sha256,
    canonicalSha256: sha256(checkedPolicyCanonical),
    canonicalPolicy: checkedPolicyCanonical
  });
  await assertExactOutputNames(input.outputRoot);

  const filePaths = new Map([
    ["receipt", input.receiptPath],
    ...ATTACHMENT_ROLES.map((role) => [role, path.join(input.outputRoot, ATTACHMENT_FILE_NAMES[role])]),
    ["terminal-gate", path.join(input.outputRoot, TERMINAL_COMMIT_FILE_NAME)]
  ]);
  const initialSnapshots = new Map();
  for (const [role, filePath] of filePaths) {
    initialSnapshots.set(role, await stableOutputFileSnapshot({
      input,
      filePath,
      label: outputFileLabel(role),
      bindingLock,
      outputLock
    }));
  }
  assertDistinctPhysicalFiles(initialSnapshots);

  const receipt = parseProviderDeploymentCandidateLoaderJsonBytes(
    initialSnapshots.get("receipt").bytes,
    "Candidate receipt"
  );
  const terminalGateBinding = validateTerminalCommitMarker(
    initialSnapshots.get("terminal-gate"),
    initialSnapshots.get("receipt")
  );
  schemaValidator.assert(receipt);
  if (receipt.receiptDigest !== receiptDigest(receipt)) {
    fail("PROVIDER_CANDIDATE_LOADER_RECEIPT_DIGEST_MISMATCH", "Candidate receipt digest does not match its canonical document.");
  }
  if (receipt.attachmentSetDigest !== sha256(canonicalJson(receipt.attachments))) {
    fail("PROVIDER_CANDIDATE_LOADER_ATTACHMENT_SET_DIGEST_MISMATCH", "Candidate attachment-set digest is invalid.");
  }

  for (const role of ATTACHMENT_ROLES) {
    const expectedPath = relativeBoundPath(
      input.bindingRoot,
      path.join(input.outputRoot, ATTACHMENT_FILE_NAMES[role]),
      `${role} fixed binding`
    );
    const recorded = receipt.attachments[role];
    const actual = initialSnapshots.get(role).binding;
    if (recorded.path !== expectedPath
      || recorded.size !== actual.size
      || recorded.sha256 !== actual.sha256
      || recorded.mediaType !== "application/json") {
      fail("PROVIDER_CANDIDATE_LOADER_ATTACHMENT_BINDING_MISMATCH", `${role} does not match its fixed output bytes.`);
    }
  }

  const rawAction = parseProviderDeploymentCandidateLoaderJsonBytes(
    initialSnapshots.get("raw-action-response").bytes,
    "Copied raw action response"
  );
  const rawReadback = parseProviderDeploymentCandidateLoaderJsonBytes(
    initialSnapshots.get("raw-final-readback").bytes,
    "Copied raw final readback"
  );
  assertCredentialMaterialAbsent(rawAction, "Copied raw action response");
  assertCredentialMaterialAbsent(rawReadback, "Copied raw final readback");
  if (
    receipt.rawInputs.actionResponse.size !== initialSnapshots.get("raw-action-response").binding.size
    || receipt.rawInputs.actionResponse.sha256 !== initialSnapshots.get("raw-action-response").binding.sha256
    || receipt.rawInputs.finalReadback.size !== initialSnapshots.get("raw-final-readback").binding.size
    || receipt.rawInputs.finalReadback.sha256 !== initialSnapshots.get("raw-final-readback").binding.sha256
    || receipt.rawInputs.actionResponse.path === receipt.rawInputs.finalReadback.path
    || receipt.rawInputs.actionResponse.path === receipt.attachments["raw-action-response"].path
    || receipt.rawInputs.finalReadback.path === receipt.attachments["raw-final-readback"].path
  ) fail("PROVIDER_CANDIDATE_LOADER_RAW_BINDING_MISMATCH", "Copied raw bytes do not match their private-source bindings.");
  assertSourceBindingOutsideOutput(input, receipt.rawInputs.actionResponse, "Raw action source binding");
  assertSourceBindingOutsideOutput(input, receipt.rawInputs.finalReadback, "Raw readback source binding");

  const projection = validateProjection(parseProviderDeploymentCandidateLoaderJsonBytes(
    initialSnapshots.get("synthetic-normalized-projection").bytes,
    "Synthetic normalized projection"
  ));
  assertReceiptProjectionCrossBinding(receipt, projection);

  const initialArtifact = validateArtifactSnapshot(
    parseProviderDeploymentCandidateLoaderJsonBytes(initialSnapshots.get("artifact-initial").bytes, "Initial artifact snapshot"),
    "initial",
    receipt,
    checkedPolicy
  );
  const finalArtifact = validateArtifactSnapshot(
    parseProviderDeploymentCandidateLoaderJsonBytes(initialSnapshots.get("artifact-final").bytes, "Final artifact snapshot"),
    "final",
    receipt,
    checkedPolicy
  );
  if (canonicalJson(withoutSnapshotPhase(initialArtifact)) !== canonicalJson(withoutSnapshotPhase(finalArtifact))) {
    fail("PROVIDER_CANDIDATE_LOADER_ARTIFACT_SNAPSHOT_REBOUND", "Initial and final artifact snapshots are not canonically stable.");
  }
  if (
    Date.parse(receipt.startedAt) > Date.parse(initialArtifact.capturedAt)
    || Date.parse(initialArtifact.capturedAt) > Date.parse(finalArtifact.capturedAt)
    || Date.parse(finalArtifact.capturedAt) > Date.parse(receipt.completedAt)
  ) fail("PROVIDER_CANDIDATE_LOADER_TIME_INVALID", "Receipt and artifact snapshot chronology is invalid.");
  assertDefaultDescriptor(receipt.artifactIdentity.descriptor, "Receipt artifact descriptor");
  assertSourceBindingOutsideOutput(input, receipt.artifactIdentity.releaseEvidence, "Release Evidence binding");
  assertSourceBindingOutsideOutput(input, receipt.artifactIdentity.identityLock, "Artifact identity-lock binding");
  assertSourceBindingOutsideOutput(input, receipt.artifactIdentity.hostingPolicy, "Hosting policy binding");

  await assertExactOutputNames(input.outputRoot);
  const finalSnapshots = new Map();
  for (const [role, filePath] of filePaths) {
    finalSnapshots.set(role, await stableOutputFileSnapshot({
      input,
      filePath,
      label: outputFileLabel(role, { final: true }),
      bindingLock,
      outputLock
    }));
    assertStableFile(initialSnapshots.get(role), finalSnapshots.get(role), role);
  }
  assertDistinctPhysicalFiles(finalSnapshots);
  await assertExactOutputNames(input.outputRoot);
  const finalPolicySnapshot = await stableBindingRootFileSnapshot({
    input,
    filePath: policySourcePath,
    label: "Current hosting policy after verification",
    bindingLock
  });
  assertStableFile(initialPolicySnapshot, finalPolicySnapshot, "Current hosting policy");
  await Promise.all([
    assertDirectoryLock(input.bindingRoot, bindingLock, "Binding root"),
    assertDirectoryLock(input.outputRoot, outputLock, "Output root")
  ]);

  return Object.freeze({
    verificationKind: "offline-independent-provider-deployment-candidate-output-v1",
    candidateOutputIntegrityVerified: true,
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    receiptId: receipt.receiptId,
    receiptDigest: receipt.receiptDigest,
    artifactSetDigest: receipt.artifactIdentity.artifactSetDigest,
    releaseEvidenceId: receipt.artifactIdentity.releaseEvidenceId,
    recordedArtifactProjection: immutableJsonSnapshot(initialArtifact.releaseEvidenceExpectation),
    terminalGateBinding,
    gates: Object.freeze({
      schemaValidated: true,
      receiptDigestRecomputed: true,
      attachmentSetDigestRecomputed: true,
      fixedOutputSetBound: true,
      physicalFileIdentityBound: true,
      terminalCommitMarkerVerified: true,
      rawCredentialScanPassed: true,
      projectionCrossBindingVerified: true,
      artifactSnapshotCrossBindingVerified: true,
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false
    }),
    attempts: Object.freeze({
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false
    }),
    authorizationBoundary: Object.freeze({
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    }),
    claims: Object.freeze({
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
    }),
    document: immutableJsonSnapshot(receipt)
  });
}

async function runCli() {
  try {
    const input = parseProviderDeploymentCandidateLoaderEnvironment(process.env);
    const result = await loadVerifiedProviderDeploymentCandidateOutput(input);
    process.stdout.write(`${JSON.stringify({
      verificationKind: result.verificationKind,
      candidateOutputIntegrityVerified: true,
      trustClass: result.trustClass,
      admissionStatus: result.admissionStatus,
      receiptId: result.receiptId,
      receiptDigest: result.receiptDigest,
      terminalGateBinding: result.terminalGateBinding,
      terminalCommitMarkerVerified: true,
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false,
      networkObserved: false,
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verificationKind: "offline-independent-provider-deployment-candidate-output-v1",
      candidateOutputIntegrityVerified: false,
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      usableForAdmission: false,
      terminalCommitMarkerVerified: false,
      rawProjectionDerivationVerified: false,
      providerAuthenticatedReceiptVerified: false,
      networkObserved: false,
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
