import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseJavaScript } from "@babel/parser";
import {
  assertReleaseArtifactMutationBoundary,
  verifyReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import { canonicalJson, collectArtifactEntries, relativePathWithin, sha256 } from "./release-evidence-lib.mjs";
import { loadReleaseEvidenceSchemaValidator } from "./release-evidence-schema.mjs";

const POLICY_KEYS = Object.freeze([
  "schemaVersion", "policyId", "deploymentPlatform", "canonicalOrigin",
  "cspEnforcementStatus", "headers", "cacheRules", "documentRoutes",
  "releaseEvidencePath", "nonPublicArtifactPaths", "contentTypes",
  "redirectRules", "publicReleaseGate"
]);
const PUBLIC_RELEASE_GATE_KEYS = Object.freeze([
  "httpsRequired", "realHostHeadersVerified", "cspBlockingModeVerified",
  "unnecessaryThirdPartyScriptsAllowed"
]);
const REQUIRED_SECURITY_HEADERS = Object.freeze([
  "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options",
  "Permissions-Policy", "Cross-Origin-Opener-Policy", "Strict-Transport-Security"
]);
const REQUIRED_CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; frame-src 'none'; upgrade-insecure-requests";
const REQUIRED_HEADER_VALUES = Object.freeze({
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000"
});
const NO_STORE_CACHE = "no-cache, no-store, must-revalidate";
const IMMUTABLE_ASSET_CACHE = "public, max-age=31536000, immutable";
const REQUIRED_CACHE_RULES = Object.freeze({
  "/*": NO_STORE_CACHE,
  "/index.html": NO_STORE_CACHE,
  "/sw.js": NO_STORE_CACHE,
  "/assets/*": IMMUTABLE_ASSET_CACHE
});
const REQUIRED_DOCUMENT_ROUTES = Object.freeze([
  "/", "/index.html", "/new", "/cases", "/cases/research", "/compare",
  "/compare/pair", "/knowledge", "/help", "/settings", "/settings/data",
  "/settings/calendar-divergence-audit", "/settings/transit-review-inbox",
  "/candidate-sets/00000000-0000-4000-8000-000000000000",
  "/cases/00000000-0000-4000-8000-000000000000/revisions/00000000-0000-4000-8000-000000000001",
  "/cases/00000000-0000-4000-8000-000000000000/revisions/00000000-0000-4000-8000-000000000001/revise"
]);
const REQUIRED_CONTENT_TYPES = Object.freeze({
  ".html": Object.freeze(["text/html"]),
  ".js": Object.freeze(["text/javascript", "application/javascript"]),
  ".css": Object.freeze(["text/css"]),
  ".webmanifest": Object.freeze(["application/manifest+json", "application/json"]),
  ".json": Object.freeze(["application/json"]),
  ".svg": Object.freeze(["image/svg+xml"]),
  ".png": Object.freeze(["image/png"]),
  ".woff2": Object.freeze(["font/woff2"]),
  ".wasm": Object.freeze(["application/wasm"]),
  ".map": Object.freeze(["application/json"]),
  ".txt": Object.freeze(["text/plain"])
});
const REQUIRED_NON_PUBLIC_ARTIFACT_PATHS = Object.freeze([
  "_headers",
  "release-evidence.json.sha256"
]);
const REAL_HOST_REDIRECT_CLASS_PATHS = Object.freeze([
  "/", "/sw.js", "/release-evidence.json", "/settings/data"
]);
const REQUIRED_DESCRIPTOR = Object.freeze({
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
const REQUIRED_STORAGE_TABLES = Object.freeze([
  "cases", "revisions", "candidateSets", "researchNotes", "events", "savedViews",
  "knowledgeDocuments", "sourceRights", "citations", "attachments", "researcherProfiles",
  "appSettings", "ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts",
  "birthFingerprints"
]);
const FORBIDDEN_BEHAVIOR_RESPONSE_HEADERS = Object.freeze([
  "clear-site-data", "content-disposition", "link", "nel", "refresh", "report-to",
  "reporting-endpoints", "set-cookie"
]);
const REQUIRED_ENGINEERING_GATES = Object.freeze([
  "sourceTreeClean", "evidenceIdBound", "defaultReleaseDescriptorMatched",
  "requiredReceiptsPresent", "allRecordedReceiptsPassed", "policyReceiptSetMatched",
  "recordedReceiptSetMatched", "policyReceiptCommandsMatched",
  "browserResultSummariesMatched", "artifactIdentityStable",
  "requiredArtifactComponentsPresent", "engineeringGatePassed"
]);
const RESPONSE_BODY_LIMIT_BYTES = 64 * 1024 * 1024;
const RESPONSE_TIMEOUT_MS = 20_000;
const DNS_TIMEOUT_MS = 10_000;
const REAL_NETWORK_FETCH = globalThis.fetch.bind(globalThis);
const realExpectations = new WeakSet();
const NON_PUBLIC_NETWORKS = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
]) NON_PUBLIC_NETWORKS.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 96], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48],
  ["100::", 64], ["2001::", 32], ["2001:2::", 48], ["2001:10::", 28], ["2001:20::", 28],
  ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20], ["fc00::", 7],
  ["fe80::", 10], ["fec0::", 10], ["ff00::", 8]
]) NON_PUBLIC_NETWORKS.addSubnet(network, prefix, "ipv6");
const IPV4_MAPPED_IPV6_NETWORKS = new BlockList();
IPV4_MAPPED_IPV6_NETWORKS.addSubnet("::ffff:0:0", 96, "ipv6");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function immutablePolicySnapshot(policy) {
  validateHostingSecurityPolicy(policy);
  const snapshot = JSON.parse(canonicalJson(policy));
  validateHostingSecurityPolicy(snapshot);
  return deepFreeze(snapshot);
}

function requireUniqueStrings(values, label, { minItems = 1 } = {}) {
  if (!Array.isArray(values) || values.length < minItems || !values.every(isNonEmptyString)) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique.`);
}

function requireAbsolutePathname(value, label, { allowWildcard = false } = {}) {
  if (
    !isNonEmptyString(value)
    || !value.startsWith("/")
    || value.startsWith("//")
    || /[%\\?#\u0000-\u001f\u007f]/u.test(value)
    || (!allowWildcard && value.includes("*"))
    || (allowWildcard && value.includes("*") && !value.endsWith("*"))
    || (allowWildcard && (value.match(/\*/gu)?.length ?? 0) > 1)
  ) throw new Error(`${label} must be a canonical absolute pathname.`);
  const pathWithoutWildcard = value.endsWith("*") ? value.slice(0, -1) : value;
  if (pathWithoutWildcard.split("/").some((segment) => segment === "." || segment === "..")
    || new URL(pathWithoutWildcard, "https://path.invalid").pathname !== pathWithoutWildcard) {
    throw new Error(`${label} must not contain dot segments or URL-normalizing aliases.`);
  }
  return value;
}

function requireArtifactPath(value, label) {
  if (
    !isNonEmptyString(value)
    || value.startsWith("/")
    || value.includes("\\")
    || value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    || /[?#\u0000-\u001f\u007f]/u.test(value)
  ) throw new Error(`${label} must be a canonical artifact-relative path.`);
  return value;
}

function normalizeHeaderValue(value) {
  return value.trim().replace(/[ \t]+/gu, " ");
}

function contentTypeMatches(value, allowedEssences) {
  const segments = value.split(";").map((segment) => segment.trim());
  const essence = segments.shift()?.toLowerCase() ?? "";
  if (!allowedEssences.includes(essence) || segments.some((segment) => segment.length === 0)) return false;
  const textual = essence.startsWith("text/")
    || essence.endsWith("+json") || essence.endsWith("+xml")
    || ["application/javascript", "application/json", "application/manifest+json", "image/svg+xml"].includes(essence);
  if (segments.length === 0) return true;
  return textual && segments.length === 1 && /^charset\s*=\s*(?:utf-8|"utf-8")$/iu.test(segments[0]);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.pathname !== "/"
    || url.search !== ""
    || url.hash !== ""
    || value !== url.origin
  ) throw new Error(`${label} must be a canonical HTTPS origin without credentials, path, query, or fragment.`);
  return url.origin;
}

function isPublicHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".test")
    || normalized.endsWith(".invalid")
    || [".corp", ".home", ".internal", ".lan", ".local", ".localdomain", ".onion", ".arpa"]
      .some((suffix) => normalized.endsWith(suffix))
    || ["example.com", "example.net", "example.org"].some((domain) =>
      normalized === domain || normalized.endsWith(`.${domain}`)
    )
    || normalized.endsWith(".example")
  ) return false;
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return !(a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0);
  }
  if (ipVersion === 6) {
    return normalized !== "::1" && normalized !== "::"
      && !normalized.startsWith("fc") && !normalized.startsWith("fd")
      && !normalized.startsWith("fe8") && !normalized.startsWith("fe9")
      && !normalized.startsWith("fea") && !normalized.startsWith("feb");
  }
  return normalized.includes(".");
}

function isSyntacticallyEligibleHttpsOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.port === "" && isPublicHostname(url.hostname);
  } catch {
    return false;
  }
}

export function validateResolvedPublicAddresses(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Canonical host DNS returned no addresses.");
  }
  const normalized = [];
  for (const record of records) {
    if (!exactKeys(record, ["address", "family"])
      || ![4, 6].includes(record.family)
      || isIP(record.address) !== record.family) {
      throw new Error("Canonical host DNS returned a malformed address record.");
    }
    const family = record.family === 4 ? "ipv4" : "ipv6";
    if ((record.family === 6 && (
      record.address.toLowerCase().startsWith("::ffff:")
      || IPV4_MAPPED_IPV6_NETWORKS.check(record.address, "ipv6")
    ))
      || NON_PUBLIC_NETWORKS.check(record.address, family)) {
      throw new Error("Canonical host DNS resolved to a non-public or reserved address.");
    }
    normalized.push(`${record.family}:${record.address.toLowerCase()}`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Canonical host DNS returned duplicate address records.");
  }
  return Object.freeze({ addressCount: normalized.length, families: Object.freeze([...new Set(records.map((record) => record.family))].sort()) });
}

async function resolvePublicAddressSet(origin) {
  const hostname = new URL(origin).hostname;
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Canonical host DNS resolution timed out.")), DNS_TIMEOUT_MS);
    timer.unref?.();
  });
  try {
    const records = await Promise.race([lookup(hostname, { all: true, verbatim: true }), timeout]);
    return validateResolvedPublicAddresses(records);
  } catch (error) {
    if (error instanceof Error && /Canonical host DNS/u.test(error.message)) throw error;
    throw new Error("Canonical host DNS resolution failed.");
  } finally {
    clearTimeout(timer);
  }
}

export function cacheRuleForPath(pathname, cacheRules) {
  requireAbsolutePathname(pathname, "Cache probe path");
  const matches = Object.entries(cacheRules).filter(([pattern]) =>
    pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern
  );
  if (matches.length === 0) throw new Error(`No cache rule covers ${pathname}.`);
  const longest = Math.max(...matches.map(([pattern]) => pattern.length));
  const winners = matches.filter(([pattern]) => pattern.length === longest);
  if (winners.length !== 1) throw new Error(`Cache rule match for ${pathname} is ambiguous.`);
  return Object.freeze({ pattern: winners[0][0], value: winners[0][1] });
}

export function validateHostingSecurityPolicy(policy) {
  if (!exactKeys(policy, POLICY_KEYS)) throw new Error("Hosting security policy keys are not exact.");
  if (policy.schemaVersion !== 2 || policy.policyId !== "hakimi-web-public-hosting-baseline-v2") {
    throw new Error("Hosting security policy identity is invalid.");
  }
  if (!isNonEmptyString(policy.deploymentPlatform)) throw new Error("Hosting deployment platform is missing.");
  if (policy.canonicalOrigin !== null) canonicalOrigin(policy.canonicalOrigin, "Hosting canonicalOrigin");
  if (policy.deploymentPlatform === "unselected" && policy.canonicalOrigin !== null) {
    throw new Error("An unselected hosting platform cannot declare a canonical origin.");
  }
  if (policy.deploymentPlatform !== "unselected" && policy.canonicalOrigin === null) {
    throw new Error("A selected hosting platform must declare a canonical origin.");
  }
  if (!isRecord(policy.headers) || Object.keys(policy.headers).length !== 7) {
    throw new Error("Hosting security headers are incomplete.");
  }
  for (const [name, value] of Object.entries(policy.headers)) {
    if (!/^[A-Za-z0-9-]+$/u.test(name) || !isNonEmptyString(value) || /[\r\n]/u.test(value)) {
      throw new Error(`Hosting header is malformed: ${name}.`);
    }
  }
  for (const name of REQUIRED_SECURITY_HEADERS) {
    if (!Object.hasOwn(policy.headers, name)) throw new Error(`Hosting policy is missing ${name}.`);
  }
  for (const [name, expected] of Object.entries(REQUIRED_HEADER_VALUES)) {
    if (normalizeHeaderValue(policy.headers[name] ?? "") !== normalizeHeaderValue(expected)) {
      throw new Error(`Hosting security baseline has drifted: ${name}.`);
    }
  }
  if (policy.cspEnforcementStatus === "report_only_until_real_host_validation") {
    if (policy.headers["Content-Security-Policy-Report-Only"] !== REQUIRED_CSP
      || Object.hasOwn(policy.headers, "Content-Security-Policy")) {
      throw new Error("Report-only CSP policy shape is invalid.");
    }
  } else if (policy.cspEnforcementStatus === "blocking_header_candidate") {
    if (policy.headers["Content-Security-Policy"] !== REQUIRED_CSP
      || Object.hasOwn(policy.headers, "Content-Security-Policy-Report-Only")) {
      throw new Error("Blocking CSP header policy shape is invalid.");
    }
  } else {
    throw new Error("Hosting CSP enforcement status is unsupported.");
  }
  if (!isRecord(policy.cacheRules) || Object.keys(policy.cacheRules).length === 0) {
    throw new Error("Hosting cache policy is missing.");
  }
  for (const [route, value] of Object.entries(policy.cacheRules)) {
    requireAbsolutePathname(route, `Cache route ${route}`, { allowWildcard: true });
    if (!isNonEmptyString(value) || /[\r\n]/u.test(value)) throw new Error(`Cache rule ${route} is invalid.`);
  }
  if (!exactJson(policy.cacheRules, REQUIRED_CACHE_RULES)) {
    throw new Error("Hosting cache policy must preserve the exact document/SW no-store and immutable asset baseline.");
  }
  requireUniqueStrings(policy.documentRoutes, "Hosting documentRoutes");
  for (const route of policy.documentRoutes) requireAbsolutePathname(route, `Document route ${route}`);
  if (!exactJson(policy.documentRoutes, REQUIRED_DOCUMENT_ROUTES)) {
    throw new Error("Hosting document route matrix has drifted from the v2 application contract.");
  }
  requireAbsolutePathname(policy.releaseEvidencePath, "Hosting releaseEvidencePath");
  if (!policy.releaseEvidencePath.endsWith(".json")) throw new Error("Release Evidence hosting path must be JSON.");
  requireUniqueStrings(policy.nonPublicArtifactPaths, "Hosting nonPublicArtifactPaths");
  for (const artifactPath of policy.nonPublicArtifactPaths) requireArtifactPath(artifactPath, "Non-public artifact path");
  const expectedNonPublicPaths = ["_headers", `${policy.releaseEvidencePath.slice(1)}.sha256`];
  if (!exactJson(policy.nonPublicArtifactPaths, expectedNonPublicPaths)
    || !exactJson(policy.nonPublicArtifactPaths, REQUIRED_NON_PUBLIC_ARTIFACT_PATHS)) {
    throw new Error("Hosting deployment control and Release Evidence sidecar must remain exactly non-public.");
  }
  if (!isRecord(policy.contentTypes) || Object.keys(policy.contentTypes).length === 0) {
    throw new Error("Hosting content-type policy is missing.");
  }
  for (const [extension, values] of Object.entries(policy.contentTypes)) {
    if (!/^\.[a-z0-9]+$/u.test(extension)) throw new Error(`Content-type extension is invalid: ${extension}.`);
    requireUniqueStrings(values, `Content types for ${extension}`);
    for (const value of values) {
      if (value !== value.toLowerCase() || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(value)) {
        throw new Error(`Content-type essence is invalid: ${value}.`);
      }
    }
  }
  if (!exactJson(policy.contentTypes, REQUIRED_CONTENT_TYPES)) {
    throw new Error("Hosting MIME baseline has drifted from the v2 application contract.");
  }
  if (!Array.isArray(policy.redirectRules)) throw new Error("Hosting redirectRules must be an array.");
  const redirectSources = new Set();
  for (const rule of policy.redirectRules) {
    if (!exactKeys(rule, ["from", "status", "to"])) throw new Error("Hosting redirect rule keys are not exact.");
    let from;
    let to;
    try {
      from = new URL(rule.from);
      to = new URL(rule.to);
    } catch {
      throw new Error("Hosting redirect rule URLs must be absolute.");
    }
    if (from.protocol !== "http:" || to.protocol !== "https:" || ![301, 308].includes(rule.status)) {
      throw new Error("Hosting redirect rules must be permanent HTTP-to-HTTPS redirects.");
    }
    if (from.username !== "" || from.password !== "" || to.username !== "" || to.password !== ""
      || from.hash !== "" || to.hash !== "" || from.pathname !== to.pathname || from.search !== to.search) {
      throw new Error("Hosting redirects must preserve the exact path/query without credentials or fragments.");
    }
    if (policy.canonicalOrigin !== null && to.origin !== policy.canonicalOrigin) {
      throw new Error("Hosting redirect target does not use the canonical origin.");
    }
    if (redirectSources.has(from.href)) throw new Error("Hosting redirect sources must be unique.");
    redirectSources.add(from.href);
  }
  if (!exactKeys(policy.publicReleaseGate, PUBLIC_RELEASE_GATE_KEYS)
    || !Object.values(policy.publicReleaseGate).every((value) => typeof value === "boolean")
    || policy.publicReleaseGate.httpsRequired !== true
    || policy.publicReleaseGate.unnecessaryThirdPartyScriptsAllowed !== false) {
    throw new Error("Hosting public release gate is invalid or weakened.");
  }
  for (const route of [...policy.documentRoutes, policy.releaseEvidencePath]) {
    cacheRuleForPath(route, policy.cacheRules);
  }
  return Object.freeze({ policyId: policy.policyId, schemaVersion: policy.schemaVersion });
}

function contentTypesForPath(pathname, policy) {
  const extension = path.posix.extname(pathname).toLowerCase();
  const values = policy.contentTypes[extension];
  if (!values) throw new Error(`No content-type policy covers ${pathname}.`);
  return values;
}

function normalizeArtifactEntry(entry, label) {
  if (!exactKeys(entry, ["path", "size", "sha256"])) throw new Error(`${label} keys are not exact.`);
  requireArtifactPath(entry.path, `${label} path`);
  if (!Number.isSafeInteger(entry.size) || entry.size <= 0 || entry.size > RESPONSE_BODY_LIMIT_BYTES
    || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
    throw new Error(`${label} identity is invalid.`);
  }
  return Object.freeze({ path: entry.path, size: entry.size, sha256: entry.sha256 });
}

function normalizeReleaseIdentity(identity) {
  if (!exactKeys(identity, ["descriptor", "manifestVersion", "manifestDigest", "buildVersion", "evidenceId"])
    || !exactJson(identity.descriptor, REQUIRED_DESCRIPTOR)
    || identity.manifestVersion !== 1
    || !/^[a-f0-9]{64}$/u.test(identity.manifestDigest)
    || !/^[a-f0-9]{12}$/u.test(identity.buildVersion)
    || !/^hre1-[a-f0-9]{32}$/u.test(identity.evidenceId)) {
    throw new Error("Expected deployed release identity is invalid or not default legacy-v13.");
  }
  return Object.freeze({
    descriptor: deepFreeze(structuredClone(identity.descriptor)),
    manifestVersion: identity.manifestVersion,
    manifestDigest: identity.manifestDigest,
    buildVersion: identity.buildVersion,
    evidenceId: identity.evidenceId
  });
}

function finalizeExpectation({
  kind,
  evidenceBytes,
  artifactEntries,
  indexBytes,
  manifestBytes,
  serviceWorkerBytes,
  releaseIdentity,
  policyBinding = null,
  artifactIdentityLockBinding = null
}) {
  const normalizedReleaseIdentity = normalizeReleaseIdentity(releaseIdentity);
  const lockedEvidenceBytes = Buffer.from(evidenceBytes ?? []);
  const lockedIndexBytes = Buffer.from(indexBytes ?? []);
  const lockedManifestBytes = Buffer.from(manifestBytes ?? []);
  const lockedServiceWorkerBytes = Buffer.from(serviceWorkerBytes ?? []);
  const normalizedArtifacts = artifactEntries.map((entry, index) => normalizeArtifactEntry(entry, `Artifact ${index}`));
  if (new Set(normalizedArtifacts.map((entry) => entry.path)).size !== normalizedArtifacts.length) {
    throw new Error("Artifact expectation paths must be unique.");
  }
  const byPath = new Map(normalizedArtifacts.map((entry) => [entry.path, entry]));
  for (const requiredPath of ["index.html", "manifest.webmanifest", "sw.js", "_headers"]) {
    if (!byPath.has(requiredPath)) throw new Error(`Artifact expectation is missing ${requiredPath}.`);
  }
  if (!Buffer.isBuffer(evidenceBytes) || lockedEvidenceBytes.byteLength === 0) throw new Error("Release Evidence bytes are missing.");
  if (lockedEvidenceBytes.byteLength > RESPONSE_BODY_LIMIT_BYTES) throw new Error("Release Evidence exceeds the deployed-host response limit.");
  if (!Buffer.isBuffer(indexBytes) || sha256Bytes(lockedIndexBytes) !== byPath.get("index.html").sha256) {
    throw new Error("Expected index bytes do not match the artifact inventory.");
  }
  if (!Buffer.isBuffer(manifestBytes) || sha256Bytes(lockedManifestBytes) !== byPath.get("manifest.webmanifest").sha256) {
    throw new Error("Expected manifest bytes do not match the artifact inventory.");
  }
  if (!Buffer.isBuffer(serviceWorkerBytes) || sha256Bytes(lockedServiceWorkerBytes) !== byPath.get("sw.js").sha256) {
    throw new Error("Expected Service Worker bytes do not match the artifact inventory.");
  }
  return Object.freeze({
    expectationKind: kind,
    evidenceId: normalizedReleaseIdentity.evidenceId,
    artifactSetDigest: sha256(canonicalJson(normalizedArtifacts)),
    descriptor: normalizedReleaseIdentity.descriptor,
    releaseIdentity: normalizedReleaseIdentity,
    policyBinding: policyBinding === null ? null : Object.freeze({ ...policyBinding }),
    artifactIdentityLockBinding: artifactIdentityLockBinding === null
      ? null
      : Object.freeze({ ...artifactIdentityLockBinding }),
    releaseEvidence: Object.freeze({ size: lockedEvidenceBytes.byteLength, sha256: sha256Bytes(lockedEvidenceBytes) }),
    artifacts: Object.freeze(normalizedArtifacts),
    indexBytes: lockedIndexBytes,
    manifestBytes: lockedManifestBytes,
    serviceWorkerBytes: lockedServiceWorkerBytes
  });
}

export function createMockedDeployedHostExpectation({
  files,
  releaseIdentity,
  evidenceBytes = Buffer.from("{}", "utf8")
}) {
  if (!isRecord(files)) throw new Error("Mocked artifact files must be an object.");
  const byteEntries = Object.entries(files).map(([filePath, value]) => {
    requireArtifactPath(filePath, "Mocked artifact path");
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (bytes.byteLength === 0) throw new Error(`Mocked artifact ${filePath} is empty.`);
    return { path: filePath, bytes, size: bytes.byteLength, sha256: sha256Bytes(bytes) };
  });
  const bytesByPath = new Map(byteEntries.map((entry) => [entry.path, entry.bytes]));
  return finalizeExpectation({
    kind: "mocked-artifact-expectation-v1",
    evidenceBytes: Buffer.isBuffer(evidenceBytes) ? evidenceBytes : Buffer.from(evidenceBytes),
    artifactEntries: byteEntries.map(({ path: artifactPath, size, sha256: digest }) => ({ path: artifactPath, size, sha256: digest })),
    indexBytes: bytesByPath.get("index.html"),
    manifestBytes: bytesByPath.get("manifest.webmanifest"),
    serviceWorkerBytes: bytesByPath.get("sw.js"),
    releaseIdentity
  });
}

export async function loadDeployedHostExpectation({
  cwd = process.cwd(),
  artifactRoot,
  evidencePath,
  policy,
  policyPath = "docs/security/hosting-security-policy.json"
}) {
  policy = immutablePolicySnapshot(policy);
  const absolutePolicyPath = path.resolve(cwd, policyPath);
  const canonicalPolicyPath = relativePathWithin(cwd, absolutePolicyPath, "Hosting policy input");
  const policyBytes = await readFile(absolutePolicyPath);
  let policyFromDisk;
  try {
    policyFromDisk = JSON.parse(policyBytes.toString("utf8"));
  } catch {
    throw new Error("Hosting policy input is not valid JSON.");
  }
  if (!exactJson(policyFromDisk, policy)) {
    throw new Error("In-memory hosting policy does not match the checked policy bytes.");
  }
  const root = path.resolve(cwd, artifactRoot);
  const evidenceFile = path.resolve(cwd, evidencePath);
  const evidenceRelativeToRoot = relativePathWithin(root, evidenceFile, "Release Evidence input");
  if (`/${evidenceRelativeToRoot}` !== policy.releaseEvidencePath) {
    throw new Error("Local Release Evidence path does not match hosting policy.");
  }
  const evidenceBytes = await readFile(evidenceFile);
  let evidence;
  try {
    evidence = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    throw new Error("Release Evidence input is not valid JSON.");
  }
  const schemaValidator = await loadReleaseEvidenceSchemaValidator(cwd);
  schemaValidator.assert(evidence);
  const evidenceSidecarPath = `${evidenceFile}.sha256`;
  const evidenceSidecarBytes = await readFile(evidenceSidecarPath);
  const expectedEvidenceSidecar = Buffer.from(
    `${sha256(evidenceBytes)}  ${path.basename(evidenceFile)}\n`,
    "utf8"
  );
  if (!evidenceSidecarBytes.equals(expectedEvidenceSidecar)) {
    throw new Error("Release Evidence sidecar does not exactly bind the Evidence bytes and filename.");
  }
  const matchingPolicyEntries = evidence.policyFiles.filter((entry) => entry.path === canonicalPolicyPath);
  if (matchingPolicyEntries.length !== 1 || matchingPolicyEntries[0].sha256 !== sha256(policyBytes)) {
    throw new Error("Release Evidence does not bind the exact hosting policy bytes.");
  }
  if (!exactJson(evidence.release.descriptor, REQUIRED_DESCRIPTOR)) {
    throw new Error("Deployed host verification is fixed to the complete legacy-v13 descriptor.");
  }
  if (evidence.release.channel !== "default-v13"
    || evidence.release.manifestVersion !== 1
    || evidence.release.evidenceIdBound !== true
    || evidence.release.builtEvidenceId !== evidence.evidenceId) {
    throw new Error("Release Evidence is not bound to the default-v13 built release identity.");
  }
  for (const gate of REQUIRED_ENGINEERING_GATES) {
    if (evidence.gates?.[gate] !== true) throw new Error(`Release Evidence engineering gate is not true: ${gate}.`);
  }
  assertReleaseArtifactMutationBoundary(evidence.artifacts?.mutationBoundary);
  if (evidence.claims?.engineeringEvidenceOnly !== true || evidence.claims?.publicReleaseAuthorized !== false) {
    throw new Error("Release Evidence claim boundary is invalid.");
  }
  const expectedRoot = relativePathWithin(cwd, root, "Artifact root");
  if (evidence.artifacts.root !== expectedRoot) throw new Error("Release Evidence artifact root does not match the supplied root.");
  const localArtifacts = await collectArtifactEntries(root, [evidenceRelativeToRoot, `${evidenceRelativeToRoot}.sha256`]);
  if (!exactJson(localArtifacts, evidence.artifacts.files)
    || evidence.artifacts.count !== localArtifacts.length
    || evidence.artifacts.artifactSetDigest !== sha256(canonicalJson(localArtifacts))) {
    throw new Error("Local artifact bytes do not match the Release Evidence inventory.");
  }
  const absoluteIdentityLockPath = path.resolve(cwd, evidence.artifacts.identityLock.path);
  const artifactIdentity = await verifyReleaseArtifactIdentityLock({
    cwd,
    dist: root,
    lockPath: absoluteIdentityLockPath,
    evidenceId: evidence.evidenceId
  });
  if (evidence.artifacts.identityLock.path !== artifactIdentity.lockPath
    || evidence.artifacts.identityLock.sha256 !== artifactIdentity.lockFileSha256
    || evidence.artifacts.identityLock.lockDigest !== artifactIdentity.lock.lockDigest
    || evidence.artifacts.identityLock.artifactSetDigest !== artifactIdentity.artifactSetDigest
    || evidence.artifacts.identityLock.verified !== true) {
    throw new Error("Release Evidence identity-lock binding does not match the verified local lock.");
  }
  if (!exactJson(evidence.release.descriptor, artifactIdentity.lock.descriptor)
    || evidence.release.manifestDigest !== artifactIdentity.lock.manifestDigest
    || evidence.release.buildVersion !== artifactIdentity.lock.buildVersion
    || evidence.evidenceId !== artifactIdentity.lock.evidenceId) {
    throw new Error("Release Evidence release fields do not match the verified artifact identity lock.");
  }
  const localNonPublicPaths = new Set(localArtifacts.map((entry) => entry.path));
  localNonPublicPaths.add(`${evidenceRelativeToRoot}.sha256`);
  for (const nonPublicPath of policy.nonPublicArtifactPaths) {
    if (!localNonPublicPaths.has(nonPublicPath)) {
      throw new Error(`Non-public deployment control artifact is missing: ${nonPublicPath}.`);
    }
  }
  const expectation = finalizeExpectation({
    kind: "schema-validated-release-evidence-expectation-v1",
    evidenceBytes,
    artifactEntries: localArtifacts,
    indexBytes: await readFile(path.join(root, "index.html")),
    manifestBytes: await readFile(path.join(root, "manifest.webmanifest")),
    serviceWorkerBytes: await readFile(path.join(root, "sw.js")),
    releaseIdentity: {
      descriptor: evidence.release.descriptor,
      manifestVersion: evidence.release.manifestVersion,
      manifestDigest: evidence.release.manifestDigest,
      buildVersion: evidence.release.buildVersion,
      evidenceId: evidence.evidenceId
    },
    policyBinding: {
      path: canonicalPolicyPath,
      policyId: policy.policyId,
      sha256: sha256(policyBytes),
      canonicalSha256: sha256(canonicalJson(policy)),
      canonicalPolicy: canonicalJson(policy)
    },
    artifactIdentityLockBinding: {
      path: artifactIdentity.lockPath,
      realPath: await realpath(absoluteIdentityLockPath),
      sha256: artifactIdentity.lockFileSha256,
      lockDigest: artifactIdentity.lock.lockDigest,
      artifactSetDigest: artifactIdentity.artifactSetDigest
    }
  });
  return expectation;
}

export async function loadFormallyVerifiedDeployedHostExpectation({
  cwd = process.cwd(),
  artifactRoot,
  evidencePath,
  receiptsPath,
  policy,
  policyPath = "docs/security/hosting-security-policy.json"
}) {
  policy = immutablePolicySnapshot(policy);
  const root = path.resolve(cwd);
  const absoluteEvidencePath = path.resolve(root, evidencePath);
  const absoluteReceiptsPath = path.resolve(root, receiptsPath);
  relativePathWithin(root, absoluteEvidencePath, "Formal Release Evidence input");
  relativePathWithin(root, absoluteReceiptsPath, "Formal Release Evidence receipts");
  const formalVerifier = spawnSync(process.execPath, [
    path.resolve(root, "scripts/verify-release-evidence.mjs"),
    "--input",
    absoluteEvidencePath,
    "--receipts",
    absoluteReceiptsPath
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (formalVerifier.status !== 0) {
    const error = new Error("Formal Release Evidence verification failed before deployed-host artifact loading.");
    error.formalReleaseEvidenceVerified = false;
    throw error;
  }
  let expectation;
  try {
    expectation = await loadDeployedHostExpectation({
      cwd: root,
      artifactRoot,
      evidencePath: absoluteEvidencePath,
      policy,
      policyPath
    });
  } catch (cause) {
    const error = new Error("Formally verified Release Evidence did not produce a valid deployed-host artifact expectation.", { cause });
    error.formalReleaseEvidenceVerified = true;
    throw error;
  }
  realExpectations.add(expectation);
  return expectation;
}

function strictRootRelativeUrl(rawValue, label, origin, allowedPaths) {
  if (!isNonEmptyString(rawValue) || !rawValue.startsWith("/") || rawValue.startsWith("//")
    || /[%\\?#&\u0000-\u001f\u007f]/u.test(rawValue)) {
    throw new Error(`${label} must use a literal root-relative path.`);
  }
  const resolved = new URL(rawValue, origin);
  if (resolved.protocol !== "https:" || resolved.origin !== origin
    || resolved.username !== "" || resolved.password !== "" || resolved.pathname !== rawValue) {
    throw new Error(`${label} escapes the canonical HTTPS origin.`);
  }
  if (allowedPaths && !allowedPaths.has(rawValue)) throw new Error(`${label} is not in the locked artifact or route set.`);
  return rawValue;
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not valid UTF-8.`);
  }
}

function assertExactObjectKeys(value, allowed, label) {
  if (!isRecord(value) || !exactKeys(value, allowed)) throw new Error(`${label} keys are not exact.`);
}

function uniqueMetaContent(document, name) {
  const matches = [...document.querySelectorAll("meta[name]")]
    .filter((meta) => meta.getAttribute("name") === name);
  if (matches.length !== 1 || !isNonEmptyString(matches[0].getAttribute("content"))) {
    throw new Error(`Locked index must contain exactly one ${name} meta value.`);
  }
  return matches[0].getAttribute("content");
}

function readIndexReleaseIdentity(document) {
  let descriptor;
  let manifest;
  const serializedManifest = uniqueMetaContent(document, "hakimi-release-storage-manifest");
  try {
    descriptor = JSON.parse(uniqueMetaContent(document, "hakimi-release-database"));
    manifest = JSON.parse(serializedManifest);
  } catch {
    throw new Error("Locked index release identity metadata is not valid JSON.");
  }
  if (!exactJson(descriptor, REQUIRED_DESCRIPTOR)) {
    throw new Error("Locked index release descriptor is not the frozen legacy-v13 descriptor.");
  }
  assertExactObjectKeys(
    manifest,
    ["manifestVersion", "database", "requiredStorageTables", "requiredStorageIndexes"],
    "Locked storage manifest"
  );
  if (manifest.manifestVersion !== 1
    || !exactJson(manifest.database, REQUIRED_DESCRIPTOR)
    || !exactJson(manifest.requiredStorageTables, REQUIRED_STORAGE_TABLES)
    || !exactJson(manifest.requiredStorageIndexes, [])) {
    throw new Error("Locked storage manifest is not the exact legacy-v13 storage contract.");
  }
  const manifestDigest = sha256Bytes(Buffer.from(serializedManifest, "utf8"));
  if (uniqueMetaContent(document, "hakimi-release-storage-manifest-digest") !== manifestDigest) {
    throw new Error("Locked index storage manifest digest does not match its exact serialized bytes.");
  }
  return normalizeReleaseIdentity({
    descriptor,
    manifestVersion: manifest.manifestVersion,
    manifestDigest,
    buildVersion: uniqueMetaContent(document, "hakimi-build-version"),
    evidenceId: uniqueMetaContent(document, "hakimi-release-evidence-id")
  });
}

function directMemberCall(node, objectName, propertyName) {
  return node?.type === "CallExpression"
    && node.callee?.type === "MemberExpression"
    && node.callee.computed === false
    && node.callee.object?.type === "Identifier"
    && node.callee.object.name === objectName
    && node.callee.property?.type === "Identifier"
    && node.callee.property.name === propertyName;
}

function topLevelConstInitializers(program, names) {
  const found = new Map([...names].map((name) => [name, []]));
  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type === "Identifier" && found.has(declaration.id.name)) {
        found.get(declaration.id.name).push(declaration.init);
      }
    }
  }
  for (const [name, values] of found) {
    if (values.length !== 1 || values[0] === null) {
      throw new Error(`Locked Service Worker must contain exactly one top-level const ${name}.`);
    }
  }
  return found;
}

function workerJsonConstant(initializer, constantName, { frozen = false } = {}) {
  let jsonCall = initializer;
  if (frozen) {
    if (!directMemberCall(initializer, "Object", "freeze") || initializer.arguments.length !== 1) {
      throw new Error(`Locked Service Worker ${constantName} must be frozen exactly once.`);
    }
    [jsonCall] = initializer.arguments;
  }
  if (!directMemberCall(jsonCall, "JSON", "parse")
    || jsonCall.arguments.length !== 1
    || jsonCall.arguments[0].type !== "StringLiteral") {
    throw new Error(`Locked Service Worker ${constantName} is not an exact JSON.parse string constant.`);
  }
  try {
    return JSON.parse(jsonCall.arguments[0].value);
  } catch {
    throw new Error(`Locked Service Worker ${constantName} is not valid embedded JSON.`);
  }
}

function readServiceWorkerReleaseIdentity(worker) {
  if (worker.includes("__CACHE_VERSION__")
    || worker.includes("__RELEASE_DATABASE_DESCRIPTOR__")
    || worker.includes("__BRIDGE_RELEASE_DATABASE_DESCRIPTOR__")) {
    throw new Error("Locked Service Worker retains a release identity placeholder.");
  }
  let program;
  try {
    program = parseJavaScript(worker, { sourceType: "script" }).program;
  } catch {
    throw new Error("Locked Service Worker is not valid JavaScript.");
  }
  const initializers = topLevelConstInitializers(
    program,
    ["CACHE_VERSION", "RELEASE_DATABASE", "LEGACY_BRIDGE_DATABASE"]
  );
  const versionInitializer = initializers.get("CACHE_VERSION")[0];
  if (versionInitializer.type !== "StringLiteral" || !/^[a-f0-9]{12}$/u.test(versionInitializer.value)) {
    throw new Error("Locked Service Worker cache generation is not canonical.");
  }
  const descriptor = workerJsonConstant(initializers.get("RELEASE_DATABASE")[0], "RELEASE_DATABASE");
  const bridgeDescriptor = workerJsonConstant(
    initializers.get("LEGACY_BRIDGE_DATABASE")[0],
    "LEGACY_BRIDGE_DATABASE",
    { frozen: true }
  );
  if (!exactJson(descriptor, REQUIRED_DESCRIPTOR) || !exactJson(bridgeDescriptor, REQUIRED_DESCRIPTOR)) {
    throw new Error("Locked Service Worker does not preserve the exact legacy-v13 descriptor.");
  }
  return Object.freeze({ buildVersion: versionInitializer.value, descriptor: Object.freeze({ ...descriptor }) });
}

function cssHasUntrackedLoadingSyntax(value) {
  if (value.includes("\\")) return true;
  const withoutComments = value.replace(/\/\*[\s\S]*?\*\//gu, "");
  if (withoutComments.includes("/*") || withoutComments.includes("*/")) return true;
  return /@import\b|(?:^|[^a-z0-9_-])(?:url|image|(?:-webkit-)?image-set|src)\s*\(|https?\s*:|(?:^|[\s'",(])\/\//iu.test(withoutComments);
}

function verifyManifest(manifestText, origin, artifactPaths, documentRoutes) {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("Locked PWA Manifest is not valid JSON.");
  }
  assertExactObjectKeys(manifest, [
    "name", "short_name", "description", "id", "lang", "start_url", "scope",
    "display", "orientation", "background_color", "theme_color", "categories",
    "prefer_related_applications", "icons", "shortcuts"
  ], "PWA Manifest");
  if (manifest.id !== "/" || manifest.start_url !== "/" || manifest.scope !== "/") {
    throw new Error("PWA Manifest id, start_url, and scope must remain /.");
  }
  for (const field of ["id", "start_url", "scope"]) {
    strictRootRelativeUrl(manifest[field], `PWA Manifest ${field}`, origin, documentRoutes);
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) throw new Error("PWA Manifest icons are missing.");
  const resourcePaths = new Set();
  for (const [index, icon] of manifest.icons.entries()) {
    assertExactObjectKeys(icon, ["src", "sizes", "type", "purpose"], `PWA Manifest icon ${index}`);
    resourcePaths.add(strictRootRelativeUrl(icon.src, `PWA Manifest icon ${index}`, origin, artifactPaths));
  }
  if (!Array.isArray(manifest.shortcuts)) throw new Error("PWA Manifest shortcuts must be an array.");
  for (const [index, shortcut] of manifest.shortcuts.entries()) {
    assertExactObjectKeys(shortcut, ["name", "short_name", "description", "url", "icons"], `PWA shortcut ${index}`);
    strictRootRelativeUrl(shortcut.url, `PWA shortcut ${index}`, origin, documentRoutes);
    if (!Array.isArray(shortcut.icons) || shortcut.icons.length === 0) throw new Error(`PWA shortcut ${index} icons are missing.`);
    for (const [iconIndex, icon] of shortcut.icons.entries()) {
      assertExactObjectKeys(icon, ["src", "sizes", "type"], `PWA shortcut ${index} icon ${iconIndex}`);
      resourcePaths.add(strictRootRelativeUrl(icon.src, `PWA shortcut ${index} icon ${iconIndex}`, origin, artifactPaths));
    }
  }
  return resourcePaths;
}

function verifyIndexHtml(html, origin, artifactPaths) {
  const dom = new JSDOM(html, { url: `${origin}/` });
  const { document } = dom.window;
  const releaseIdentity = readIndexReleaseIdentity(document);
  if (document.querySelector("base")) throw new Error("Locked index must not contain a base element.");
  if ([...document.querySelectorAll("meta")].some((meta) =>
    ["refresh", "content-security-policy"].includes((meta.getAttribute("http-equiv") ?? "").trim().toLowerCase())
  )) throw new Error("Locked index contains a forbidden http-equiv control.");
  if (document.querySelector("iframe, object, embed, source, track, audio, video, svg, math, template")) {
    throw new Error("Locked index contains an unapproved loading element.");
  }
  if (document.querySelector("[srcset], [srcdoc], [imagesrcset], [background], [ping], [attributionsrc]")) {
    throw new Error("Locked index contains an unapproved loading or reporting attribute.");
  }
  for (const element of document.querySelectorAll("*")) {
    if ([...element.attributes].some((attribute) => attribute.name.toLowerCase().startsWith("on"))) {
      throw new Error("Locked index contains an inline event-handler attribute.");
    }
  }
  for (const style of document.querySelectorAll("style, [style]")) {
    const value = style.tagName === "STYLE" ? style.textContent ?? "" : style.getAttribute("style") ?? "";
    if (cssHasUntrackedLoadingSyntax(value)) throw new Error("Locked index style contains untracked loading syntax.");
  }
  const resourcePaths = new Set();
  const scripts = [...document.querySelectorAll("script")];
  if (scripts.length === 0) throw new Error("Locked index has no module entrypoint.");
  for (const [index, script] of scripts.entries()) {
    if ((script.getAttribute("type") ?? "").trim().toLowerCase() !== "module"
      || !script.hasAttribute("src") || (script.textContent ?? "").trim().length > 0) {
      throw new Error(`Locked index script ${index} is not an external module entrypoint.`);
    }
    const unexpectedAttribute = [...script.attributes].find((attribute) =>
      !["type", "src", "crossorigin"].includes(attribute.name.toLowerCase())
    );
    if (unexpectedAttribute) throw new Error(`Locked index script ${index} has an unapproved attribute.`);
    resourcePaths.add(strictRootRelativeUrl(script.getAttribute("src"), `Locked index script ${index}`, origin, artifactPaths));
  }
  const manifestLinks = [];
  const allowedLinkAttributes = Object.freeze({
    icon: Object.freeze(["rel", "href", "type", "sizes"]),
    manifest: Object.freeze(["rel", "href"]),
    stylesheet: Object.freeze(["rel", "href", "crossorigin", "media"]),
    modulepreload: Object.freeze(["rel", "href", "crossorigin"]),
    preload: Object.freeze(["rel", "href", "as", "type", "crossorigin", "media", "fetchpriority"])
  });
  for (const [index, link] of [...document.querySelectorAll("link")].entries()) {
    const rel = (link.getAttribute("rel") ?? "").trim().toLowerCase();
    if (!Object.hasOwn(allowedLinkAttributes, rel)) {
      throw new Error(`Locked index link ${index} has an unapproved rel.`);
    }
    if ([...link.attributes].some((attribute) => !allowedLinkAttributes[rel].includes(attribute.name.toLowerCase()))) {
      throw new Error(`Locked index link ${index} has an unapproved attribute for rel=${rel}.`);
    }
    const resourcePath = strictRootRelativeUrl(link.getAttribute("href"), `Locked index link ${index}`, origin, artifactPaths);
    resourcePaths.add(resourcePath);
    if (rel === "manifest") manifestLinks.push(resourcePath);
  }
  if (!exactJson(manifestLinks, ["/manifest.webmanifest"])) {
    throw new Error("Locked index must reference exactly one canonical PWA Manifest.");
  }
  for (const [index, image] of [...document.querySelectorAll("img")].entries()) {
    const allowedImageAttributes = [
      "src", "alt", "width", "height", "loading", "decoding", "fetchpriority",
      "crossorigin", "referrerpolicy"
    ];
    if ([...image.attributes].some((attribute) => !allowedImageAttributes.includes(attribute.name.toLowerCase()))) {
      throw new Error(`Locked index image ${index} has an unapproved attribute.`);
    }
    resourcePaths.add(strictRootRelativeUrl(image.getAttribute("src"), `Locked index image ${index}`, origin, artifactPaths));
  }
  for (const element of document.querySelectorAll("[src]")) {
    if (!["SCRIPT", "IMG"].includes(element.tagName)) throw new Error("Locked index has an unapproved src-bearing element.");
  }
  for (const element of document.querySelectorAll("[href]")) {
    if (!["LINK", "A"].includes(element.tagName)) throw new Error("Locked index has an unapproved href-bearing element.");
    if (element.tagName === "A") {
      strictRootRelativeUrl(element.getAttribute("href"), "Locked index anchor", origin, null);
    }
  }
  for (const element of document.querySelectorAll("form[action], button[formaction], input[formaction]")) {
    strictRootRelativeUrl(
      element.getAttribute("action") ?? element.getAttribute("formaction"),
      "Locked index form destination",
      origin,
      null
    );
  }
  return Object.freeze({ resourcePaths, releaseIdentity });
}

function verifyStaticResourceDeclarations(expectation, policy, origin) {
  const lockedBytePaths = [
    ["index.html", expectation.indexBytes],
    ["manifest.webmanifest", expectation.manifestBytes],
    ["sw.js", expectation.serviceWorkerBytes]
  ];
  for (const [artifactPath, bytes] of lockedBytePaths) {
    const artifact = expectation.artifacts.find((entry) => entry.path === artifactPath);
    if (!Buffer.isBuffer(bytes) || artifact === undefined || sha256Bytes(bytes) !== artifact.sha256) {
      throw new Error(`Locked local bytes changed after expectation creation: ${artifactPath}.`);
    }
  }
  const publicArtifacts = expectation.artifacts.filter((entry) => !policy.nonPublicArtifactPaths.includes(entry.path));
  const artifactPaths = new Set(publicArtifacts.map((entry) => `/${entry.path}`));
  const documentRoutes = new Set(policy.documentRoutes);
  const html = verifyIndexHtml(decodeUtf8(expectation.indexBytes, "Locked index"), origin, artifactPaths);
  const manifestResources = verifyManifest(decodeUtf8(expectation.manifestBytes, "Locked PWA Manifest"), origin, artifactPaths, documentRoutes);
  const workerIdentity = readServiceWorkerReleaseIdentity(
    decodeUtf8(expectation.serviceWorkerBytes, "Locked Service Worker")
  );
  if (!exactJson(html.releaseIdentity, expectation.releaseIdentity)
    || !exactJson(workerIdentity.descriptor, expectation.releaseIdentity.descriptor)
    || workerIdentity.buildVersion !== expectation.releaseIdentity.buildVersion) {
    throw new Error("Locked index, Service Worker, and expected Release Evidence identity disagree.");
  }
  return Object.freeze({
    publicArtifacts: Object.freeze(publicArtifacts),
    declaredResourcePaths: Object.freeze([...new Set([...html.resourcePaths, ...manifestResources])].sort()),
    releaseIdentityVerified: true
  });
}

function expectedProbes(expectation, policy) {
  const probes = new Map();
  const add = (probe) => {
    const existing = probes.get(probe.path);
    if (existing && (existing.sha256 !== probe.sha256 || existing.size !== probe.size)) {
      throw new Error(`Probe path ${probe.path} has conflicting expected identities.`);
    }
    if (!existing) probes.set(probe.path, Object.freeze(probe));
  };
  const index = expectation.artifacts.find((entry) => entry.path === "index.html");
  for (const route of policy.documentRoutes) {
    add({ id: `document:${route}`, kind: "document", path: route, size: index.size, sha256: index.sha256, contentTypes: policy.contentTypes[".html"] });
  }
  for (const artifact of expectation.artifacts) {
    if (policy.nonPublicArtifactPaths.includes(artifact.path)) continue;
    const pathname = `/${artifact.path}`;
    add({ id: `artifact:${artifact.path}`, kind: "artifact", path: pathname, size: artifact.size, sha256: artifact.sha256, contentTypes: contentTypesForPath(pathname, policy) });
  }
  add({
    id: "release-evidence",
    kind: "release-evidence",
    path: policy.releaseEvidencePath,
    size: expectation.releaseEvidence.size,
    sha256: expectation.releaseEvidence.sha256,
    contentTypes: contentTypesForPath(policy.releaseEvidencePath, policy)
  });
  for (const probe of probes.values()) cacheRuleForPath(probe.path, policy.cacheRules);
  return Object.freeze([...probes.values()]);
}

/**
 * Builds the immutable HTTP observation matrix for an explicitly named public
 * candidate without selecting a hosting provider or opening the real-host
 * verifier. This is deliberately plan-only: it performs no DNS, HTTP, browser,
 * deployment, admission, or authorization action.
 */
export function createUntrustedDeployedHostCandidatePlan({
  baseUrl,
  candidatePlatform,
  policy,
  expectation
}) {
  policy = immutablePolicySnapshot(policy);
  if (
    policy.deploymentPlatform !== "unselected"
    || policy.canonicalOrigin !== null
    || policy.cspEnforcementStatus !== "report_only_until_real_host_validation"
    || policy.redirectRules.length !== 0
    || policy.publicReleaseGate.realHostHeadersVerified !== false
    || policy.publicReleaseGate.cspBlockingModeVerified !== false
  ) {
    throw new Error("Candidate host planning requires the checked hosting policy to remain unselected and closed.");
  }
  if (
    typeof candidatePlatform !== "string"
    || !/^(?!unselected$)[a-z0-9][a-z0-9._-]{0,63}$/u.test(candidatePlatform)
  ) {
    throw new Error("Candidate host planning requires an explicit canonical non-policy platform label.");
  }
  const origin = canonicalOrigin(baseUrl, "Candidate deployed-host baseUrl");
  const canonicalUrl = new URL(origin);
  if (
    canonicalUrl.port !== ""
    || isIP(canonicalUrl.hostname) !== 0
    || !isPublicHostname(canonicalUrl.hostname)
  ) {
    throw new Error("Candidate host planning requires a public DNS HTTPS origin on the default port.");
  }
  const declarations = verifyStaticResourceDeclarations(expectation, policy, origin);
  const contentProbes = expectedProbes(expectation, policy).map((probe) => ({
    ...probe,
    probeClass: "content",
    cacheControl: cacheRuleForPath(probe.path, policy.cacheRules).value
  }));
  const httpOrigin = `http://${canonicalUrl.hostname}`;
  const redirectProbes = REAL_HOST_REDIRECT_CLASS_PATHS.map((pathname, index) => ({
    id: `redirect:${index}`,
    kind: "redirect",
    probeClass: "redirect",
    path: pathname,
    from: new URL(pathname, `${httpOrigin}/`).href,
    to: new URL(pathname, `${origin}/`).href,
    allowedStatuses: [301, 308]
  }));
  const nonPublicProbes = policy.nonPublicArtifactPaths.map((artifactPath, index) => ({
    id: `non-public:${index}`,
    kind: "non-public",
    probeClass: "non-public",
    path: `/${artifactPath}`,
    url: new URL(`/${artifactPath}`, `${origin}/`).href,
    allowedStatuses: [404, 410]
  }));
  return deepFreeze({
    schemaVersion: 1,
    planType: "deployed_host_http_candidate_plan_v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    checkedPolicy: {
      policyId: policy.policyId,
      schemaVersion: policy.schemaVersion,
      deploymentPlatform: policy.deploymentPlatform,
      canonicalOrigin: policy.canonicalOrigin,
      cspEnforcementStatus: policy.cspEnforcementStatus,
      publicReleaseGate: structuredClone(policy.publicReleaseGate)
    },
    candidateScope: { platform: candidatePlatform, origin },
    securityHeaders: structuredClone(policy.headers),
    expectedCspHeader: "content-security-policy-report-only",
    forbiddenCspHeader: "content-security-policy",
    forbiddenBehaviorResponseHeaders: [...FORBIDDEN_BEHAVIOR_RESPONSE_HEADERS],
    contentProbes,
    redirectProbes,
    nonPublicProbes,
    declaredResourcePaths: [...declarations.declaredResourcePaths],
    expectedIdentity: {
      evidenceId: expectation.evidenceId,
      artifactSetDigest: expectation.artifactSetDigest,
      descriptor: structuredClone(expectation.descriptor),
      releaseIdentity: structuredClone(expectation.releaseIdentity),
      releaseEvidence: structuredClone(expectation.releaseEvidence),
      artifactCount: expectation.artifacts.length,
      publicArtifactCount: declarations.publicArtifacts.length
    },
    claims: {
      realHostVerified: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    }
  });
}

async function responseBytes(response, expectedSize) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > RESPONSE_BODY_LIMIT_BYTES) {
    throw new Error("BODY_TOO_LARGE");
  }
  const contentLength = response.headers.get("content-length");
  const contentEncoding = (response.headers.get("content-encoding") ?? "identity").trim().toLowerCase();
  if (contentLength !== null && (contentEncoding === "" || contentEncoding === "identity")) {
    if (!/^(0|[1-9][0-9]*)$/u.test(contentLength) || Number(contentLength) !== expectedSize) {
      throw new Error("CONTENT_LENGTH_MISMATCH");
    }
    if (Number(contentLength) > RESPONSE_BODY_LIMIT_BYTES) throw new Error("BODY_TOO_LARGE");
  }
  if (typeof response.body?.getReader === "function") {
    const reader = response.body.getReader();
    let timer;
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => {
        void reader.cancel().catch(() => {});
        reject(new Error("BODY_TIMEOUT"));
      }, RESPONSE_TIMEOUT_MS);
      timer.unref?.();
    });
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const result = await Promise.race([reader.read(), timeout]);
        if (result.done) break;
        if (!(result.value instanceof Uint8Array)) throw new Error("BODY_READ_FAILED");
        total += result.value.byteLength;
        if (total > RESPONSE_BODY_LIMIT_BYTES) {
          void reader.cancel().catch(() => {});
          throw new Error("BODY_TOO_LARGE");
        }
        if (total > expectedSize) {
          void reader.cancel().catch(() => {});
          throw new Error("BODY_IDENTITY_MISMATCH");
        }
        chunks.push(Buffer.from(result.value));
      }
    } finally {
      clearTimeout(timer);
      reader.releaseLock?.();
    }
    return Buffer.concat(chunks, total);
  }
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      void response.body?.cancel?.().catch?.(() => {});
      reject(new Error("BODY_TIMEOUT"));
    }, RESPONSE_TIMEOUT_MS);
    timer.unref?.();
  });
  let arrayBuffer;
  try {
    arrayBuffer = await Promise.race([response.arrayBuffer(), timeout]);
  } finally {
    clearTimeout(timer);
  }
  const bytes = Buffer.from(arrayBuffer);
  if (bytes.byteLength > RESPONSE_BODY_LIMIT_BYTES) throw new Error("BODY_TOO_LARGE");
  return bytes;
}

function probeFailure(probe, errors, partial = {}) {
  return Object.freeze({
    id: probe.id, kind: probe.kind, path: probe.path,
    status: partial.status ?? null,
    noUnexpectedRedirect: partial.noUnexpectedRedirect ?? false,
    securityHeadersVerified: partial.securityHeadersVerified ?? false,
    behaviorHeadersVerified: partial.behaviorHeadersVerified ?? false,
    cacheVerified: partial.cacheVerified ?? false,
    contentTypeVerified: partial.contentTypeVerified ?? false,
    contentEncodingVerified: partial.contentEncodingVerified ?? false,
    identityVerified: partial.identityVerified ?? false,
    passed: false,
    errorCodes: Object.freeze([...errors])
  });
}

async function fetchWithTimeout(fetchImpl, url, options) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("FETCH_TIMEOUT"));
    }, RESPONSE_TIMEOUT_MS);
  });
  timer.unref?.();
  try {
    return await Promise.race([
      fetchImpl(url, { ...options, signal: controller.signal }),
      timeout
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runContentProbe(fetchImpl, origin, policy, probe) {
  const requestedUrl = new URL(probe.path, `${origin}/`).href;
  let response;
  try {
    response = await fetchWithTimeout(fetchImpl, requestedUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "accept-encoding": "identity" }
    });
  } catch (error) {
    return probeFailure(probe, [error instanceof Error && error.message === "FETCH_TIMEOUT"
      ? "FETCH_TIMEOUT"
      : "FETCH_FAILED"]);
  }
  const partial = { status: response.status };
  const errors = [];
  partial.noUnexpectedRedirect = response.status === 200 && response.redirected !== true && response.url === requestedUrl;
  if (!partial.noUnexpectedRedirect) errors.push("STATUS_OR_REDIRECT_MISMATCH");
  partial.securityHeadersVerified = Object.entries(policy.headers).every(([name, expected]) =>
    normalizeHeaderValue(response.headers.get(name) ?? "") === normalizeHeaderValue(expected)
  );
  if (!partial.securityHeadersVerified) errors.push("SECURITY_HEADERS_MISMATCH");
  const expectedCspName = policy.cspEnforcementStatus === "blocking_header_candidate"
    ? "content-security-policy"
    : "content-security-policy-report-only";
  const unexpectedCspName = expectedCspName === "content-security-policy"
    ? "content-security-policy-report-only"
    : "content-security-policy";
  partial.behaviorHeadersVerified = FORBIDDEN_BEHAVIOR_RESPONSE_HEADERS.every((name) => !response.headers.has(name))
    && !response.headers.has(unexpectedCspName)
    && response.headers.has(expectedCspName);
  if (!partial.behaviorHeadersVerified) errors.push("FORBIDDEN_BEHAVIOR_HEADER");
  const expectedCache = cacheRuleForPath(probe.path, policy.cacheRules).value;
  partial.cacheVerified = normalizeHeaderValue(response.headers.get("cache-control") ?? "") === normalizeHeaderValue(expectedCache);
  if (!partial.cacheVerified) errors.push("CACHE_CONTROL_MISMATCH");
  partial.contentTypeVerified = contentTypeMatches(response.headers.get("content-type") ?? "", probe.contentTypes);
  if (!partial.contentTypeVerified) errors.push("CONTENT_TYPE_MISMATCH");
  const contentEncoding = response.headers.get("content-encoding");
  partial.contentEncodingVerified = contentEncoding === null || contentEncoding.trim().toLowerCase() === "identity";
  if (!partial.contentEncodingVerified) errors.push("CONTENT_ENCODING_MISMATCH");
  try {
    const bytes = await responseBytes(response, probe.size);
    partial.identityVerified = bytes.byteLength === probe.size && sha256Bytes(bytes) === probe.sha256;
    if (!partial.identityVerified) errors.push("BODY_IDENTITY_MISMATCH");
  } catch (error) {
    partial.identityVerified = false;
    errors.push(error instanceof Error && /^[A-Z_]+$/u.test(error.message) ? error.message : "BODY_READ_FAILED");
  }
  if (errors.length > 0) return probeFailure(probe, errors, partial);
  return Object.freeze({
    id: probe.id, kind: probe.kind, path: probe.path, status: response.status,
    noUnexpectedRedirect: true, securityHeadersVerified: true, cacheVerified: true,
    behaviorHeadersVerified: true, contentTypeVerified: true, contentEncodingVerified: true,
    identityVerified: true, passed: true,
    errorCodes: Object.freeze([])
  });
}

async function runRedirectProbe(fetchImpl, rule, index) {
  const id = `redirect:${index}`;
  let response;
  try {
    response = await fetchWithTimeout(fetchImpl, rule.from, {
      method: "GET",
      redirect: "manual",
      headers: { "accept-encoding": "identity" }
    });
  } catch (error) {
    const code = error instanceof Error && error.message === "FETCH_TIMEOUT" ? "FETCH_TIMEOUT" : "FETCH_FAILED";
    return Object.freeze({
      id, from: rule.from, status: null, behaviorHeadersVerified: false,
      passed: false, errorCodes: Object.freeze([code])
    });
  }
  const location = response.headers.get("location");
  let resolvedLocation = null;
  try {
    if (location !== null) resolvedLocation = new URL(location, rule.from).href;
  } catch {
    // Stable error code below is sufficient; do not echo the malformed value.
  }
  const behaviorHeadersVerified = FORBIDDEN_BEHAVIOR_RESPONSE_HEADERS.every((name) => !response.headers.has(name));
  const redirectMatched = response.status === rule.status && response.redirected !== true
    && response.url === rule.from && resolvedLocation === rule.to;
  const passed = redirectMatched && behaviorHeadersVerified;
  const errorCodes = [];
  if (!redirectMatched) errorCodes.push("REDIRECT_RULE_MISMATCH");
  if (!behaviorHeadersVerified) errorCodes.push("FORBIDDEN_BEHAVIOR_HEADER");
  return Object.freeze({
    id, from: rule.from, status: response.status, behaviorHeadersVerified, passed,
    errorCodes: Object.freeze(errorCodes)
  });
}

async function runNonPublicProbe(fetchImpl, origin, artifactPath, index) {
  const pathname = `/${artifactPath}`;
  const requestedUrl = new URL(pathname, `${origin}/`).href;
  const id = `non-public:${index}`;
  let response;
  try {
    response = await fetchWithTimeout(fetchImpl, requestedUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "accept-encoding": "identity" }
    });
  } catch (error) {
    const code = error instanceof Error && error.message === "FETCH_TIMEOUT" ? "FETCH_TIMEOUT" : "FETCH_FAILED";
    return Object.freeze({
      id, path: pathname, status: null, noUnexpectedRedirect: false,
      behaviorHeadersVerified: false, passed: false, errorCodes: Object.freeze([code])
    });
  }
  const noUnexpectedRedirect = response.redirected !== true && response.url === requestedUrl;
  const hidden = [404, 410].includes(response.status) && noUnexpectedRedirect;
  const behaviorHeadersVerified = FORBIDDEN_BEHAVIOR_RESPONSE_HEADERS.every((name) => !response.headers.has(name));
  const errorCodes = [];
  if (!hidden) errorCodes.push("NON_PUBLIC_ARTIFACT_EXPOSED");
  if (!behaviorHeadersVerified) errorCodes.push("FORBIDDEN_BEHAVIOR_HEADER");
  return Object.freeze({
    id, path: pathname, status: response.status, noUnexpectedRedirect,
    behaviorHeadersVerified, passed: hidden && behaviorHeadersVerified,
    errorCodes: Object.freeze(errorCodes)
  });
}

function aggregateProbeGate(probes, field) {
  return probes.length > 0 && probes.every((probe) => probe[field] === true);
}

function failedPreparationResult({
  verificationKind,
  policy,
  origin,
  startedAt,
  code,
  dnsResolutionAttempted = false,
  dnsPublicAddressSetVerified = false,
  networkAttempted = dnsResolutionAttempted
}) {
  const targetOriginSyntaxEligible = isSyntacticallyEligibleHttpsOrigin(origin);
  return Object.freeze({
    schemaVersion: 1,
    summaryType: "deployed_host_verification_v1",
    policyId: policy.policyId,
    verificationKind,
    targetOrigin: origin,
    deploymentPlatform: policy.deploymentPlatform,
    dnsResolutionAttempted,
    networkAttempted,
    networkCompleted: false,
    startedAt,
    completedAt: new Date().toISOString(),
    probes: Object.freeze([]),
    redirectProbes: Object.freeze([]),
    nonPublicProbes: Object.freeze([]),
    gates: Object.freeze({
      policyValidated: true, targetOriginSyntaxEligible, dnsPublicAddressSetVerified,
      publicHttpsVerified: false, pathMatrixVerified: false,
      redirectMatrixVerified: false, securityHeadersVerified: false,
      behaviorResponseHeadersAbsent: false, cacheRulesVerified: false,
      contentTypesVerified: false, contentEncodingsVerified: false,
      htmlManifestDeclaredResourcesVerified: false, releaseIdentityVerified: false,
      applicationIdentityVerified: false,
      publicArtifactSetVerified: false, nonPublicArtifactsHidden: false,
      hstsHeaderVerified: false, cspBlockingHeaderVerified: false,
      cspBrowserEnforcementVerified: false, inlineCssBrowserNetworkVerified: false,
      javascriptRuntimeNetworkVerified: false, serviceWorkerBrowserRuntimeVerified: false,
      mockedContractVerified: false,
      realHostVerified: false, publicReleaseGatePassed: false
    }),
    strictGatePassed: false,
    claims: Object.freeze({
      engineeringEvidenceOnly: true, realHostVerified: false,
      browserRuntimeVerified: false, publicDeploymentAuthorized: false, releaseReady: false
    }),
    errors: Object.freeze([{ code }])
  });
}

async function runVerification({
  fetchImpl,
  origin,
  policy,
  expectation,
  verificationKind,
  dnsPublicAddressSetVerified = false
}) {
  const startedAt = new Date().toISOString();
  validateHostingSecurityPolicy(policy);
  let declarations;
  let probes;
  try {
    declarations = verifyStaticResourceDeclarations(expectation, policy, origin);
    probes = expectedProbes(expectation, policy);
  } catch {
    return failedPreparationResult({
      verificationKind,
      policy,
      origin,
      startedAt,
      code: "LOCAL_ARTIFACT_POLICY_MISMATCH",
      dnsResolutionAttempted: verificationKind === "real-network",
      dnsPublicAddressSetVerified
    });
  }
  const probeResults = [];
  for (const probe of probes) probeResults.push(await runContentProbe(fetchImpl, origin, policy, probe));
  const redirectResults = [];
  for (const [index, rule] of policy.redirectRules.entries()) {
    redirectResults.push(await runRedirectProbe(fetchImpl, rule, index));
  }
  const nonPublicResults = [];
  for (const [index, artifactPath] of policy.nonPublicArtifactPaths.entries()) {
    nonPublicResults.push(await runNonPublicProbe(fetchImpl, origin, artifactPath, index));
  }
  const targetOriginSyntaxEligible = isSyntacticallyEligibleHttpsOrigin(origin);
  const networkAttempted = probeResults.length > 0 || redirectResults.length > 0 || nonPublicResults.length > 0;
  const incompleteNetworkCodes = new Set(["FETCH_FAILED", "FETCH_TIMEOUT", "BODY_TIMEOUT", "BODY_READ_FAILED"]);
  const networkCompleted = networkAttempted
    && [...probeResults, ...redirectResults, ...nonPublicResults].every((probe) =>
      probe.errorCodes.every((code) => !incompleteNetworkCodes.has(code))
    );
  const pathMatrixVerified = aggregateProbeGate(probeResults, "noUnexpectedRedirect");
  const publicHttpsVerified = verificationKind === "real-network"
    && targetOriginSyntaxEligible && dnsPublicAddressSetVerified
    && networkCompleted && pathMatrixVerified;
  const redirectMatrixVerified = redirectResults.length > 0 && redirectResults.every((probe) => probe.passed);
  const securityHeadersVerified = aggregateProbeGate(probeResults, "securityHeadersVerified");
  const behaviorResponseHeadersAbsent = aggregateProbeGate(probeResults, "behaviorHeadersVerified")
    && redirectResults.every((probe) => probe.behaviorHeadersVerified)
    && nonPublicResults.every((probe) => probe.behaviorHeadersVerified);
  const cacheRulesVerified = aggregateProbeGate(probeResults, "cacheVerified");
  const contentTypesVerified = aggregateProbeGate(probeResults, "contentTypeVerified");
  const contentEncodingsVerified = aggregateProbeGate(probeResults, "contentEncodingVerified");
  const identityVerified = aggregateProbeGate(probeResults, "identityVerified");
  const applicationPaths = new Set([...policy.documentRoutes, policy.releaseEvidencePath, "/manifest.webmanifest", "/sw.js"]);
  const applicationResults = probeResults.filter((probe) => applicationPaths.has(probe.path));
  const applicationIdentityVerified = applicationResults.length === applicationPaths.size
    && applicationResults.every((probe) => probe.identityVerified)
    && declarations.releaseIdentityVerified;
  const publicArtifactPaths = new Set(declarations.publicArtifacts.map((entry) => `/${entry.path}`));
  const publicArtifactResults = probeResults.filter((probe) => publicArtifactPaths.has(probe.path));
  const publicArtifactSetVerified = publicArtifactResults.length === publicArtifactPaths.size
    && publicArtifactResults.every((probe) => probe.identityVerified);
  const nonPublicArtifactsHidden = nonPublicResults.length === policy.nonPublicArtifactPaths.length
    && nonPublicResults.every((probe) => probe.passed);
  const declaredResourcePaths = new Set(["/index.html", ...declarations.declaredResourcePaths]);
  const declaredResourceResults = probeResults.filter((probe) => declaredResourcePaths.has(probe.path));
  const htmlManifestDeclaredResourcesVerified = declaredResourceResults.length === declaredResourcePaths.size
    && declaredResourceResults.every((probe) => probe.identityVerified && probe.noUnexpectedRedirect);
  const transportScopeVerified = verificationKind === "real-network" ? publicHttpsVerified : targetOriginSyntaxEligible;
  const contractChecksPassed = transportScopeVerified && pathMatrixVerified && redirectMatrixVerified
    && securityHeadersVerified && behaviorResponseHeadersAbsent
    && cacheRulesVerified && contentTypesVerified && contentEncodingsVerified
    && identityVerified && htmlManifestDeclaredResourcesVerified
    && declarations.releaseIdentityVerified
    && applicationIdentityVerified && publicArtifactSetVerified
    && nonPublicArtifactsHidden;
  const mockedContractVerified = verificationKind === "mocked-contract" && contractChecksPassed;
  const realHostVerified = verificationKind === "real-network"
    && policy.deploymentPlatform !== "unselected" && policy.canonicalOrigin === origin
    && contractChecksPassed;
  const cspBlockingHeaderVerified = policy.cspEnforcementStatus === "blocking_header_candidate"
    && securityHeadersVerified && behaviorResponseHeadersAbsent;
  const hstsHeaderVerified = securityHeadersVerified
    && policy.headers["Strict-Transport-Security"] === REQUIRED_HEADER_VALUES["Strict-Transport-Security"];
  const cspBrowserEnforcementVerified = false;
  const inlineCssBrowserNetworkVerified = false;
  const javascriptRuntimeNetworkVerified = false;
  const serviceWorkerBrowserRuntimeVerified = false;
  const publicReleaseGatePassed = realHostVerified && cspBlockingHeaderVerified
    && cspBrowserEnforcementVerified
    && policy.publicReleaseGate.realHostHeadersVerified === true
    && policy.publicReleaseGate.cspBlockingModeVerified === true;
  const errors = [
    ...probeResults.flatMap((probe) => probe.errorCodes.map((code) => ({ code, probeId: probe.id }))),
    ...redirectResults.flatMap((probe) => probe.errorCodes.map((code) => ({ code, probeId: probe.id }))),
    ...nonPublicResults.flatMap((probe) => probe.errorCodes.map((code) => ({ code, probeId: probe.id })))
  ];
  const gates = Object.freeze({
    policyValidated: true, targetOriginSyntaxEligible, dnsPublicAddressSetVerified,
    publicHttpsVerified, pathMatrixVerified,
    redirectMatrixVerified, securityHeadersVerified, cacheRulesVerified,
    behaviorResponseHeadersAbsent, contentTypesVerified, contentEncodingsVerified,
    htmlManifestDeclaredResourcesVerified,
    releaseIdentityVerified: declarations.releaseIdentityVerified,
    applicationIdentityVerified, publicArtifactSetVerified, nonPublicArtifactsHidden,
    hstsHeaderVerified, cspBlockingHeaderVerified, cspBrowserEnforcementVerified,
    inlineCssBrowserNetworkVerified, javascriptRuntimeNetworkVerified,
    serviceWorkerBrowserRuntimeVerified,
    mockedContractVerified, realHostVerified, publicReleaseGatePassed
  });
  return Object.freeze({
    schemaVersion: 1,
    summaryType: "deployed_host_verification_v1",
    policyId: policy.policyId,
    verificationKind,
    targetOrigin: origin,
    deploymentPlatform: policy.deploymentPlatform,
    dnsResolutionAttempted: verificationKind === "real-network",
    networkAttempted,
    networkCompleted,
    startedAt,
    completedAt: new Date().toISOString(),
    expectedIdentity: Object.freeze({
      evidenceId: expectation.evidenceId,
      artifactSetDigest: expectation.artifactSetDigest,
      descriptor: expectation.descriptor,
      manifestVersion: expectation.releaseIdentity.manifestVersion,
      manifestDigest: expectation.releaseIdentity.manifestDigest,
      buildVersion: expectation.releaseIdentity.buildVersion,
      releaseEvidenceSha256: expectation.releaseEvidence.sha256,
      artifactCount: expectation.artifacts.length,
      publicArtifactCount: declarations.publicArtifacts.length,
      policyBinding: expectation.policyBinding === null ? null : Object.freeze({
        path: expectation.policyBinding.path,
        policyId: expectation.policyBinding.policyId,
        sha256: expectation.policyBinding.sha256,
        canonicalSha256: expectation.policyBinding.canonicalSha256
      })
    }),
    declaredResourcePaths: declarations.declaredResourcePaths,
    probes: Object.freeze(probeResults),
    redirectProbes: Object.freeze(redirectResults),
    nonPublicProbes: Object.freeze(nonPublicResults),
    gates,
    strictGatePassed: verificationKind === "mocked-contract" ? mockedContractVerified : realHostVerified,
    claims: Object.freeze({
      engineeringEvidenceOnly: true, realHostVerified,
      browserRuntimeVerified: false, publicDeploymentAuthorized: false, releaseReady: false
    }),
    errors: Object.freeze(errors)
  });
}

export async function verifyDeployedHostContract({ fetchImpl, baseUrl, policy, expectation }) {
  if (typeof fetchImpl !== "function") throw new Error("Mocked deployed-host contract requires an injected fetch implementation.");
  policy = immutablePolicySnapshot(policy);
  const origin = canonicalOrigin(baseUrl, "Mocked deployed-host baseUrl");
  if (policy.canonicalOrigin !== null && policy.canonicalOrigin !== origin) {
    throw new Error("Mocked deployed-host baseUrl does not match policy canonicalOrigin.");
  }
  return runVerification({ fetchImpl, origin, policy, expectation, verificationKind: "mocked-contract" });
}

export function validateDeployedHostPolicyBinding({ policy, expectation }) {
  validateHostingSecurityPolicy(policy);
  const binding = expectation?.policyBinding;
  if (!exactKeys(binding, ["path", "policyId", "sha256", "canonicalSha256", "canonicalPolicy"])) {
    throw new Error("Deployed-host expectation is missing an exact hosting policy binding.");
  }
  requireArtifactPath(binding.path, "Bound hosting policy path");
  const expectedCanonicalPolicy = canonicalJson(policy);
  if (binding.policyId !== policy.policyId
    || !/^[a-f0-9]{64}$/u.test(binding.sha256)
    || binding.canonicalPolicy !== expectedCanonicalPolicy
    || binding.canonicalSha256 !== sha256(expectedCanonicalPolicy)
    || binding.canonicalSha256 !== sha256(binding.canonicalPolicy)) {
    throw new Error("Deployed-host expectation policy binding does not match the current policy.");
  }
  return Object.freeze({
    path: binding.path,
    policyId: binding.policyId,
    sha256: binding.sha256,
    canonicalSha256: binding.canonicalSha256
  });
}

export function validateRealDeployedHostPreflight({ baseUrl, policy }) {
  policy = immutablePolicySnapshot(policy);
  if (policy.deploymentPlatform === "unselected" || policy.canonicalOrigin === null) {
    throw new Error("Real deployed-host verification requires a selected platform and canonical origin.");
  }
  const origin = canonicalOrigin(baseUrl, "Real deployed-host baseUrl");
  if (origin !== policy.canonicalOrigin) throw new Error("Real deployed-host baseUrl does not match policy canonicalOrigin.");
  const url = new URL(origin);
  if (url.port !== "" || !isPublicHostname(url.hostname)) {
    throw new Error("Real deployed-host verification requires a public HTTPS origin on the default port.");
  }
  if (policy.redirectRules.length === 0) throw new Error("Real deployed-host verification requires an explicit redirect matrix.");
  const canonicalUrl = new URL(origin);
  const httpOrigin = `http://${canonicalUrl.hostname}`;
  const redirectClassPaths = REAL_HOST_REDIRECT_CLASS_PATHS;
  for (const pathname of redirectClassPaths) {
    const from = new URL(pathname, `${httpOrigin}/`).href;
    const to = new URL(pathname, `${origin}/`).href;
    if (!policy.redirectRules.some((rule) =>
      rule.from === from && rule.to === to && [301, 308].includes(rule.status)
    )) {
      throw new Error("Real deployed-host verification requires canonical HTTP redirects for root, Service Worker, Release Evidence, and a deep route.");
    }
  }
  return Object.freeze({ origin, deploymentPlatform: policy.deploymentPlatform, redirectClassPaths: Object.freeze(redirectClassPaths) });
}

export async function verifyRealDeployedHost({ baseUrl, policy, expectation }) {
  policy = immutablePolicySnapshot(policy);
  const { origin } = validateRealDeployedHostPreflight({ baseUrl, policy });
  if (!realExpectations.has(expectation)) {
    throw new Error("Real deployed-host verification requires a formally verified Release Evidence artifact expectation.");
  }
  validateDeployedHostPolicyBinding({ policy, expectation });
  const dnsStartedAt = new Date().toISOString();
  try {
    await resolvePublicAddressSet(origin);
  } catch {
    return failedPreparationResult({
      verificationKind: "real-network",
      policy,
      origin,
      startedAt: dnsStartedAt,
      code: "PUBLIC_DNS_PREFLIGHT_FAILED",
      dnsResolutionAttempted: true,
      dnsPublicAddressSetVerified: false,
      networkAttempted: true
    });
  }
  return runVerification({
    fetchImpl: REAL_NETWORK_FETCH,
    origin,
    policy,
    expectation,
    verificationKind: "real-network",
    dnsPublicAddressSetVerified: true
  });
}
