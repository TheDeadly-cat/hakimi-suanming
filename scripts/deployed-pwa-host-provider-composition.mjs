#!/usr/bin/env node

import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_PATH,
  loadVerifiedDeployedHostCandidateOutput
} from "./deployed-host-candidate-loader.mjs";
import {
  DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_HOSTING_POLICY_PATH,
  DEPLOYED_PWA_EVIDENCE_V3_POLICY_PATH,
  DEPLOYED_PWA_EVIDENCE_V3_RELEASE_DECISIONS_PATH,
  DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
  computeDeployedPwaEvidenceV3Identity,
  parseDeployedPwaEvidenceV3JsonBytes,
  verifyDeployedPwaEvidenceV3
} from "./deployed-pwa-evidence-v3-lib.mjs";
import {
  DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_PATH
} from "./deployed-pwa-evidence-v3-schema.mjs";
import {
  PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH,
  loadVerifiedProviderDeploymentCandidateOutput
} from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  RELEASE_EVIDENCE_SCHEMA_PATH,
  compileEvidenceSchemaForId
} from "./release-evidence-schema.mjs";

export const DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_PATH =
  "docs/release/deployed-pwa-host-provider-composition-candidate-v1.schema.json";
export const DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_ID =
  "https://hakimi.invalid/schemas/deployed-pwa-host-provider-composition-candidate-v1.json";
export const DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_ENVIRONMENT_KEYS = Object.freeze({
  bindingRoot: "HAKIMI_DEPLOYED_COMPOSITION_BINDING_ROOT",
  artifactRoot: "HAKIMI_DEPLOYED_COMPOSITION_ARTIFACT_ROOT",
  artifactLock: "HAKIMI_DEPLOYED_COMPOSITION_ARTIFACT_LOCK",
  releaseEvidenceId: "HAKIMI_DEPLOYED_COMPOSITION_RELEASE_EVIDENCE_ID",
  hostOutputRoot: "HAKIMI_DEPLOYED_COMPOSITION_HOST_OUTPUT_ROOT",
  hostReceiptPath: "HAKIMI_DEPLOYED_COMPOSITION_HOST_RECEIPT",
  providerOutputRoot: "HAKIMI_DEPLOYED_COMPOSITION_PROVIDER_OUTPUT_ROOT",
  providerReceiptPath: "HAKIMI_DEPLOYED_COMPOSITION_PROVIDER_RECEIPT",
  pwaInputPath: "HAKIMI_DEPLOYED_COMPOSITION_PWA_INPUT",
  pwaReceiptsRoot: "HAKIMI_DEPLOYED_COMPOSITION_PWA_RECEIPTS_ROOT",
  pwaPrivateRoot: "HAKIMI_DEPLOYED_COMPOSITION_PWA_PRIVATE_ROOT"
});

const INPUT_KEYS = Object.freeze(Object.keys(DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_ENVIRONMENT_KEYS));
const RELEASE_EVIDENCE_ID_PATTERN = /^hre1-[a-f0-9]{32}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_BOUND_FILE_BYTES = 128 * 1024 * 1024;
const MAX_PWA_BOUND_FILE_BYTES = 32 * 1024 * 1024;
const MAX_FIXED_PACKAGE_BYTES = 64 * 1024 * 1024;
const MAX_CHECKED_SOURCE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_CHECKED_SOURCE_SET_BYTES = 32 * 1024 * 1024;
const MAX_PWA_RECEIPT_SET_BYTES = 128 * 1024 * 1024;
const MAX_SIDECAR_BYTES = 1024;
const HOST_RECEIPT_FILE_NAME = "host-receipt.json";
const HOST_LOADER_RESULT_KEYS = Object.freeze([
  "verificationKind", "candidateOutputIntegrityVerified", "trustClass", "admissionStatus",
  "usableForAdmission", "receiptId", "receiptDigest", "releaseEvidenceId", "artifactSetDigest",
  "observationLabel", "terminalGateBinding", "gates", "mutationBoundary", "attempts", "authorizationBoundary", "claims",
  "recomputedCandidateContractMatched", "currentArtifactProjection", "document"
]);
const PROVIDER_LOADER_RESULT_KEYS = Object.freeze([
  "verificationKind", "candidateOutputIntegrityVerified", "trustClass", "admissionStatus",
  "receiptId", "receiptDigest", "artifactSetDigest", "releaseEvidenceId", "recordedArtifactProjection",
  "terminalGateBinding", "gates", "attempts", "authorizationBoundary", "claims", "document"
]);
const PWA_VERIFIER_RESULT_KEYS = Object.freeze([
  "schemaVersion", "summaryType", "verificationKind", "receiptTrustClass", "status",
  "executionAdmission", "semanticConsistencyVerified", "strictGatePassed",
  "deployedPwaEngineeringVerified", "artifactMutationBoundary", "receiptSetMutationBoundary",
  "gates", "claims", "attempts", "errors"
]);
const PROVIDER_RECEIPT_FILE_NAME = "provider-deployment-candidate-receipt.json";
const HOST_OUTPUT_FILE_NAMES = Object.freeze([
  "artifact-final.json",
  "artifact-initial.json",
  "host-receipt.json",
  "host-receipt-publication-commit.sha256",
  "http-observations.json"
]);
const PROVIDER_OUTPUT_FILE_NAMES = Object.freeze([
  "artifact-final.json",
  "artifact-initial.json",
  "provider-deployment-candidate-receipt.json",
  "provider-deployment-candidate-receipt-commit.sha256",
  "raw-action-response.json",
  "raw-final-readback.json",
  "synthetic-normalized-projection.json"
]);
const SOURCE_BINDING_SPECS = Object.freeze([
  Object.freeze({ role: "composition-schema", path: DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_PATH }),
  Object.freeze({ role: "host-receipt-schema", path: DEPLOYED_HOST_CANDIDATE_LOADER_SCHEMA_PATH }),
  Object.freeze({ role: "provider-receipt-schema", path: PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SCHEMA_PATH }),
  Object.freeze({ role: "pwa-v3-schema", path: DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_PATH }),
  Object.freeze({ role: "pwa-v3-policy", path: DEPLOYED_PWA_EVIDENCE_V3_POLICY_PATH }),
  Object.freeze({ role: "hosting-policy", path: DEPLOYED_PWA_EVIDENCE_V3_HOSTING_POLICY_PATH }),
  Object.freeze({ role: "release-decisions", path: DEPLOYED_PWA_EVIDENCE_V3_RELEASE_DECISIONS_PATH }),
  Object.freeze({ role: "release-evidence-schema", path: RELEASE_EVIDENCE_SCHEMA_PATH })
]);
const CLOSED_CLAIMS = Object.freeze({
  networkObserved: false,
  realHostVerified: false,
  providerAuthenticated: false,
  deploymentOperationObserved: false,
  pwaBrowserRuntimeVerified: false,
  deployedPwaEngineeringVerified: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false
});

export class DeployedPwaHostProviderCompositionError extends Error {
  constructor(stage, code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "DeployedPwaHostProviderCompositionError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new DeployedPwaHostProviderCompositionError(stage, code, message, cause);
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function compareCanonicalText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactKeys(value, keys) {
  return isRecord(value) && exactJson(Object.keys(value).sort(), [...keys].sort());
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
  requireCondition(
    typeof value === "string"
      && value.length > 0
      && value.trim() === value
      && path.isAbsolute(value),
    "arguments",
    "DEPLOYED_COMPOSITION_PATH_INVALID",
    `${label} must be an explicit absolute path.`
  );
  requireCondition(
    !value.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === ".."),
    "arguments",
    "DEPLOYED_COMPOSITION_PATH_INVALID",
    `${label} must not contain dot segments.`
  );
  const resolved = path.resolve(value);
  requireCondition(
    resolved === value,
    "arguments",
    "DEPLOYED_COMPOSITION_PATH_INVALID",
    `${label} must use its exact resolved filesystem spelling.`
  );
  return resolved;
}

function relativeWithin(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  requireCondition(
    (allowEqual || relative !== "")
      && !path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`),
    "filesystem",
    "DEPLOYED_COMPOSITION_PATH_OUTSIDE_ROOT",
    `${label} is outside its required root.`
  );
  return relative.split(path.sep).join("/");
}

function pathIsWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function requireRootsDisjoint(left, right, label) {
  requireCondition(
    !pathIsWithin(left, right) && !pathIsWithin(right, left),
    "arguments",
    "DEPLOYED_COMPOSITION_ROOTS_OVERLAP",
    `${label} must remain disjoint and non-nested.`
  );
}

function canonicalUtcTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  requireCondition(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    "binding",
    "DEPLOYED_COMPOSITION_TIME_INVALID",
    `${label} must be a canonical UTC timestamp.`
  );
  return parsed;
}

function requireCanonicalPublicHttpsOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("binding", "DEPLOYED_COMPOSITION_ORIGIN_INVALID", `${label} is not a URL.`, error);
  }
  const hostname = parsed.hostname.toLowerCase();
  requireCondition(
    parsed.protocol === "https:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.port === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.origin === value
      && isIP(hostname) === 0
      && hostname.includes(".")
      && hostname !== "localhost"
      && !hostname.endsWith(".localhost")
      && !hostname.endsWith(".local"),
    "binding",
    "DEPLOYED_COMPOSITION_ORIGIN_INVALID",
    `${label} must be a canonical public DNS HTTPS origin.`
  );
  return value;
}

function requireEnvironmentString(environment, key) {
  const value = environment[key];
  requireCondition(
    typeof value === "string" && value.length > 0 && value.trim() === value,
    "arguments",
    "DEPLOYED_COMPOSITION_ENVIRONMENT_MISSING",
    `${key} must be explicit and free of surrounding whitespace.`
  );
  return value;
}

export function parseDeployedPwaHostProviderCompositionInput(input) {
  requireCondition(
    exactKeys(input, INPUT_KEYS),
    "arguments",
    "DEPLOYED_COMPOSITION_INPUT_INVALID",
    "Composition input must contain exactly the eleven explicit bindings."
  );
  const parsed = {
    bindingRoot: requireAbsoluteCanonicalPath(input.bindingRoot, "Binding root"),
    artifactRoot: requireAbsoluteCanonicalPath(input.artifactRoot, "Artifact root"),
    artifactLock: requireAbsoluteCanonicalPath(input.artifactLock, "Artifact identity lock"),
    releaseEvidenceId: input.releaseEvidenceId,
    hostOutputRoot: requireAbsoluteCanonicalPath(input.hostOutputRoot, "Host output root"),
    hostReceiptPath: requireAbsoluteCanonicalPath(input.hostReceiptPath, "Host receipt"),
    providerOutputRoot: requireAbsoluteCanonicalPath(input.providerOutputRoot, "Provider output root"),
    providerReceiptPath: requireAbsoluteCanonicalPath(input.providerReceiptPath, "Provider receipt"),
    pwaInputPath: requireAbsoluteCanonicalPath(input.pwaInputPath, "PWA v3 input"),
    pwaReceiptsRoot: requireAbsoluteCanonicalPath(input.pwaReceiptsRoot, "PWA receipts root"),
    pwaPrivateRoot: requireAbsoluteCanonicalPath(input.pwaPrivateRoot, "PWA private root")
  };
  requireCondition(
    RELEASE_EVIDENCE_ID_PATTERN.test(parsed.releaseEvidenceId ?? ""),
    "arguments",
    "DEPLOYED_COMPOSITION_RELEASE_EVIDENCE_ID_INVALID",
    "Release Evidence id is not canonical."
  );
  for (const [key, candidate] of Object.entries(parsed)) {
    if (key !== "bindingRoot" && key !== "releaseEvidenceId") {
      relativeWithin(parsed.bindingRoot, candidate, key);
    }
  }
  requireCondition(
    comparablePath(parsed.hostReceiptPath) === comparablePath(path.join(parsed.hostOutputRoot, HOST_RECEIPT_FILE_NAME)),
    "arguments",
    "DEPLOYED_COMPOSITION_HOST_RECEIPT_PATH_INVALID",
    `Host receipt must be the fixed ${HOST_RECEIPT_FILE_NAME}.`
  );
  requireCondition(
    comparablePath(parsed.providerReceiptPath)
      === comparablePath(path.join(parsed.providerOutputRoot, PROVIDER_RECEIPT_FILE_NAME)),
    "arguments",
    "DEPLOYED_COMPOSITION_PROVIDER_RECEIPT_PATH_INVALID",
    `Provider receipt must be the fixed ${PROVIDER_RECEIPT_FILE_NAME}.`
  );
  relativeWithin(parsed.pwaPrivateRoot, parsed.pwaInputPath, "PWA v3 input");
  relativeWithin(parsed.pwaPrivateRoot, `${parsed.pwaInputPath}.sha256`, "PWA v3 sidecar");
  relativeWithin(parsed.pwaReceiptsRoot, parsed.artifactLock, "Artifact identity lock");
  const roots = [
    ["artifact", parsed.artifactRoot],
    ["host-output", parsed.hostOutputRoot],
    ["provider-output", parsed.providerOutputRoot],
    ["pwa-receipts", parsed.pwaReceiptsRoot],
    ["pwa-private", parsed.pwaPrivateRoot]
  ];
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      requireRootsDisjoint(roots[left][1], roots[right][1], `${roots[left][0]} and ${roots[right][0]} roots`);
    }
  }
  return Object.freeze(parsed);
}

export function parseDeployedPwaHostProviderCompositionEnvironment(environment = process.env) {
  requireCondition(
    isRecord(environment),
    "arguments",
    "DEPLOYED_COMPOSITION_ENVIRONMENT_INVALID",
    "Composition environment must be an object."
  );
  return parseDeployedPwaHostProviderCompositionInput(Object.fromEntries(
    Object.entries(DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_ENVIRONMENT_KEYS)
      .map(([key, environmentKey]) => [key, requireEnvironmentString(environment, environmentKey)])
  ));
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function captureDirectoryLock(directory, label) {
  let stat;
  let resolved;
  try {
    stat = await lstat(directory, { bigint: true });
    resolved = await realpath(directory);
  } catch (error) {
    fail("filesystem", "DEPLOYED_COMPOSITION_DIRECTORY_UNREADABLE", `${label} is unreadable.`, error);
  }
  requireCondition(
    stat.isDirectory() && !stat.isSymbolicLink(),
    "filesystem",
    "DEPLOYED_COMPOSITION_DIRECTORY_INVALID",
    `${label} must be a real directory, not a symlink or junction.`
  );
  requireCondition(
    comparablePath(resolved) === comparablePath(directory),
    "filesystem",
    "DEPLOYED_COMPOSITION_DIRECTORY_ALIAS",
    `${label} must use its physical filesystem path.`
  );
  return Object.freeze({
    path: path.resolve(directory),
    realPath: path.resolve(resolved),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs)
  });
}

async function assertDirectoryStillLocked(lock, label) {
  const current = await captureDirectoryLock(lock.path, label);
  requireCondition(
    current.realPath === lock.realPath
      && current.dev === lock.dev
      && current.ino === lock.ino
      && current.birthtimeNs === lock.birthtimeNs,
    "filesystem",
    "DEPLOYED_COMPOSITION_DIRECTORY_REBOUND",
    `${label} changed identity during composition.`
  );
}

async function captureRootTopology(input, cwd) {
  requireCondition(
    comparablePath(input.bindingRoot) === comparablePath(path.resolve(cwd)),
    "arguments",
    "DEPLOYED_COMPOSITION_BINDING_ROOT_CWD_MISMATCH",
    "Binding root must exactly equal cwd."
  );
  const entries = [
    ["binding", input.bindingRoot],
    ["artifact", input.artifactRoot],
    ["host-output", input.hostOutputRoot],
    ["provider-output", input.providerOutputRoot],
    ["pwa-receipts", input.pwaReceiptsRoot],
    ["pwa-private", input.pwaPrivateRoot]
  ];
  const locks = new Map();
  for (const [role, root] of entries) locks.set(role, await captureDirectoryLock(root, `${role} root`));
  const binding = locks.get("binding");
  for (const [role, lock] of locks) {
    if (role !== "binding") relativeWithin(binding.realPath, lock.realPath, `${role} physical root`);
  }
  const childLocks = entries.slice(1).map(([role]) => [role, locks.get(role)]);
  for (let left = 0; left < childLocks.length; left += 1) {
    for (let right = left + 1; right < childLocks.length; right += 1) {
      requireRootsDisjoint(
        childLocks[left][1].realPath,
        childLocks[right][1].realPath,
        `${childLocks[left][0]} and ${childLocks[right][0]} physical roots`
      );
    }
  }
  return locks;
}

async function assertRootTopologyStillLocked(locks) {
  for (const [role, lock] of locks) await assertDirectoryStillLocked(lock, `${role} root`);
}

async function readOpenedFileBounded(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function readStableFile({ bindingRoot, requiredRoot, rootLock, filePath, label, maximumSize = MAX_BOUND_FILE_BYTES }) {
  const absolute = path.resolve(filePath);
  const bindingPath = relativeWithin(bindingRoot, absolute, `${label} binding`);
  relativeWithin(requiredRoot, absolute, label);
  await assertDirectoryStillLocked(rootLock, `${label} root`);
  let pathStat;
  let resolvedFile;
  try {
    pathStat = await lstat(absolute, { bigint: true });
    resolvedFile = await realpath(absolute);
  } catch (error) {
    fail("filesystem", "DEPLOYED_COMPOSITION_FILE_UNREADABLE", `${label} is unreadable.`, error);
  }
  requireCondition(
    pathStat.isFile() && !pathStat.isSymbolicLink() && pathStat.nlink === 1n,
    "filesystem",
    "DEPLOYED_COMPOSITION_FILE_NOT_REGULAR",
    `${label} must be a single-link regular file.`
  );
  relativeWithin(rootLock.realPath, resolvedFile, `${label} physical path`);
  let handle;
  try {
    handle = await open(absolute, "r");
  } catch (error) {
    fail("filesystem", "DEPLOYED_COMPOSITION_FILE_OPEN_FAILED", `${label} could not be opened.`, error);
  }
  try {
    const before = await handle.stat({ bigint: true });
    requireCondition(
      before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(maximumSize),
      "filesystem",
      "DEPLOYED_COMPOSITION_FILE_SIZE_INVALID",
      `${label} size is outside its bounded read contract.`
    );
    requireCondition(
      sameIdentity(before, pathStat),
      "filesystem",
      "DEPLOYED_COMPOSITION_FILE_REBOUND",
      `${label} path does not identify the opened file.`
    );
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(absolute, { bigint: true });
    const resolvedAfter = await realpath(absolute);
    await assertDirectoryStillLocked(rootLock, `${label} root`);
    requireCondition(
      sameIdentity(before, after)
        && sameIdentity(after, pathAfter)
        && after.isFile()
        && pathAfter.isFile()
        && !pathAfter.isSymbolicLink()
        && after.nlink === 1n
        && pathAfter.nlink === 1n
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && bytes.length === Number(before.size)
        && comparablePath(resolvedFile) === comparablePath(resolvedAfter),
      "filesystem",
      "DEPLOYED_COMPOSITION_FILE_CHANGED_DURING_READ",
      `${label} changed during its stable opened-file read.`
    );
    relativeWithin(rootLock.realPath, resolvedAfter, `${label} rebound physical path`);
    return Object.freeze({
      bytes,
      binding: Object.freeze({ path: bindingPath, size: bytes.length, sha256: sha256(bytes) }),
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

function snapshotFingerprint(snapshot) {
  return { binding: snapshot.binding, identity: snapshot.identity };
}

function snapshotMetadata(snapshot) {
  return Object.freeze({ binding: snapshot.binding, identity: snapshot.identity });
}

function assertSnapshotMatched(initial, terminal, label) {
  requireCondition(
    exactJson(snapshotFingerprint(initial), snapshotFingerprint(terminal)),
    "mutation",
    "DEPLOYED_COMPOSITION_ENDPOINT_SNAPSHOT_CHANGED",
    `${label} changed between endpoint snapshots.`
  );
}

async function enumerateRegularFiles(bindingRoot, root, rootLock, label) {
  await assertDirectoryStillLocked(rootLock, label);
  const paths = [];
  async function walk(directory) {
    const names = (await readdir(directory)).sort();
    for (const name of names) {
      const absolute = path.join(directory, name);
      const stat = await lstat(absolute);
      requireCondition(
        !stat.isSymbolicLink(),
        "filesystem",
        "DEPLOYED_COMPOSITION_TREE_ALIAS",
        `${label} cannot contain symlinks or junctions.`
      );
      if (stat.isDirectory()) {
        await walk(absolute);
      } else {
        requireCondition(
          stat.isFile() && stat.nlink === 1,
          "filesystem",
          "DEPLOYED_COMPOSITION_TREE_NON_REGULAR",
          `${label} can contain only single-link regular files.`
        );
        paths.push(relativeWithin(bindingRoot, absolute, `${label} file`));
      }
    }
  }
  await walk(root);
  await assertDirectoryStillLocked(rootLock, label);
  return Object.freeze(paths.sort());
}

async function assertExactFileSet({ bindingRoot, root, rootLock, expectedPaths, label }) {
  const actual = await enumerateRegularFiles(bindingRoot, root, rootLock, label);
  const expected = [...expectedPaths].sort();
  requireCondition(
    new Set(expected).size === expected.length && exactJson(actual, expected),
    "filesystem",
    "DEPLOYED_COMPOSITION_FILE_SET_INVALID",
    `${label} does not contain exactly the bound regular-file set.`
  );
  return actual;
}

async function snapshotFixedOutputPackage({ input, root, rootLock, fileNames, label }) {
  const expectedPaths = fileNames.map((name) => relativeWithin(input.bindingRoot, path.join(root, name), `${label} file`));
  await assertExactFileSet({
    bindingRoot: input.bindingRoot,
    root,
    rootLock,
    expectedPaths,
    label
  });
  const snapshots = [];
  let totalBytes = 0;
  for (const name of fileNames) {
    const remainingBytes = MAX_FIXED_PACKAGE_BYTES - totalBytes;
    requireCondition(
      remainingBytes > 0,
      "filesystem",
      "DEPLOYED_COMPOSITION_PACKAGE_SIZE_INVALID",
      `${label} exceeds its aggregate byte limit.`
    );
    const snapshot = await readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: root,
      rootLock,
      filePath: path.join(root, name),
      label: `${label} ${name}`,
      maximumSize: Math.min(MAX_BOUND_FILE_BYTES, remainingBytes)
    });
    totalBytes += snapshot.binding.size;
    snapshots.push(snapshotMetadata(snapshot));
  }
  await assertExactFileSet({ bindingRoot: input.bindingRoot, root, rootLock, expectedPaths, label });
  return Object.freeze(snapshots);
}

function packageSnapshotFingerprint(snapshots) {
  return snapshots.map(snapshotFingerprint);
}

function packageFileBindingProjection(snapshots) {
  return snapshots.map((snapshot) => snapshot.binding).sort((left, right) => (
    compareCanonicalText(left.path, right.path)
  ));
}

async function readCheckedSources(input, bindingLock) {
  const snapshots = [];
  let totalBytes = 0;
  for (const spec of SOURCE_BINDING_SPECS) {
    const remainingBytes = MAX_CHECKED_SOURCE_SET_BYTES - totalBytes;
    requireCondition(
      remainingBytes > 0,
      "source",
      "DEPLOYED_COMPOSITION_SOURCE_SET_SIZE_INVALID",
      "Checked source set exceeds its aggregate byte limit."
    );
    const absolute = path.resolve(input.bindingRoot, ...spec.path.split("/"));
    const snapshot = await readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: input.bindingRoot,
      rootLock: bindingLock,
      filePath: absolute,
      label: spec.role,
      maximumSize: Math.min(MAX_CHECKED_SOURCE_FILE_BYTES, remainingBytes)
    });
    totalBytes += snapshot.binding.size;
    requireCondition(
      snapshot.binding.path === spec.path,
      "source",
      "DEPLOYED_COMPOSITION_SOURCE_PATH_INVALID",
      `${spec.role} path is not the frozen checked source path.`
    );
    const value = parseDeployedPwaEvidenceV3JsonBytes(snapshot.bytes, spec.role);
    snapshots.push(Object.freeze({
      spec,
      snapshot: snapshotMetadata(snapshot),
      value,
      canonicalSha256: sha256(canonicalJson(value))
    }));
  }
  const compositionSchema = snapshots[0].value;
  let schemaValidator;
  try {
    schemaValidator = compileEvidenceSchemaForId(
      compositionSchema,
      DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_ID
    );
  } catch (error) {
    fail("schema", "DEPLOYED_COMPOSITION_SCHEMA_INVALID", "Composition schema failed checked compilation.", error);
  }
  return Object.freeze({ snapshots: Object.freeze(snapshots), schemaValidator });
}

function sourceBindingProjection(sourceSet) {
  return Object.freeze(Object.fromEntries(sourceSet.snapshots.map(({ spec, snapshot, canonicalSha256 }) => [
    spec.role,
    Object.freeze({
      path: snapshot.binding.path,
      size: snapshot.binding.size,
      rawSha256: snapshot.binding.sha256,
      canonicalSha256
    })
  ])));
}

function assertSourceEndpointsMatched(initial, terminal) {
  requireCondition(
    initial.snapshots.length === terminal.snapshots.length,
    "mutation",
    "DEPLOYED_COMPOSITION_SOURCE_SET_CHANGED",
    "Checked source set length changed."
  );
  for (let index = 0; index < initial.snapshots.length; index += 1) {
    requireCondition(
      exactJson(initial.snapshots[index].spec, terminal.snapshots[index].spec),
      "mutation",
      "DEPLOYED_COMPOSITION_SOURCE_SET_CHANGED",
      "Checked source roles changed."
    );
    assertSnapshotMatched(
      initial.snapshots[index].snapshot,
      terminal.snapshots[index].snapshot,
      initial.snapshots[index].spec.role
    );
  }
}

function assertHostLoaderResult(result) {
  requireCondition(
    exactKeys(result, HOST_LOADER_RESULT_KEYS)
      && result.verificationKind === "offline-independent-deployed-host-candidate-output-v1"
      && result.candidateOutputIntegrityVerified === true
      && result.trustClass === "untrusted_candidate"
      && result.admissionStatus === "not_admitted"
      && result.usableForAdmission === false
      && exactJson(result.gates, {
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
      })
      && exactJson(result.mutationBoundary, {
        boundaryType: "deployed_host_candidate_loader_endpoint_snapshot_boundary_v1",
        verificationScope: "output_and_current_source_endpoint_snapshots_only_no_continuous_mutation_epoch",
        mutationEpochCapability: "absent_schema13",
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      })
      && exactJson(result.attempts, {
        dnsAttemptedByLoader: false,
        networkAttemptedByLoader: false,
        browserAttemptedByLoader: false,
        deploymentAttemptedByLoader: false,
        rollbackAttemptedByLoader: false
      })
      && exactJson(result.authorizationBoundary, {
        externalDeploymentExecutionAuthorized: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        authorizationMayNotBeDerivedFromCandidateEvidence: true
      })
      && exactJson(result.claims, {
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
      })
      && result.recomputedCandidateContractMatched === true
      && exactKeys(result.terminalGateBinding, ["path", "size", "sha256", "commitsReceiptSha256"])
      && result.terminalGateBinding.path.endsWith("/host-receipt-publication-commit.sha256")
      && result.terminalGateBinding.size === 65
      && SHA256_PATTERN.test(result.terminalGateBinding.sha256)
      && SHA256_PATTERN.test(result.terminalGateBinding.commitsReceiptSha256)
      && isRecord(result.currentArtifactProjection)
      && isRecord(result.document),
    "host",
    "DEPLOYED_COMPOSITION_HOST_RESULT_INVALID",
    "Host loader did not return its exact closed candidate boundary."
  );
}

function assertProviderLoaderResult(result) {
  requireCondition(
    exactKeys(result, PROVIDER_LOADER_RESULT_KEYS)
      && result.verificationKind === "offline-independent-provider-deployment-candidate-output-v1"
      && result.candidateOutputIntegrityVerified === true
      && result.trustClass === "untrusted_candidate"
      && result.admissionStatus === "not_admitted"
      && !Object.hasOwn(result, "currentArtifactProjection")
      && exactJson(result.gates, {
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
      })
      && exactJson(result.attempts, {
        networkAttempted: false,
        deploymentAttempted: false,
        rollbackAttempted: false
      })
      && exactJson(result.authorizationBoundary, {
        externalDeploymentExecutionAuthorized: false,
        rollbackExecutionAuthorized: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        authorizationMayNotBeDerivedFromCandidateEvidence: true
      })
      && exactJson(result.claims, {
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
      })
      && exactKeys(result.terminalGateBinding, ["path", "size", "sha256", "commitsReceiptSha256"])
      && result.terminalGateBinding.path.endsWith("/provider-deployment-candidate-receipt-commit.sha256")
      && result.terminalGateBinding.size === 65
      && SHA256_PATTERN.test(result.terminalGateBinding.sha256)
      && SHA256_PATTERN.test(result.terminalGateBinding.commitsReceiptSha256)
      && isRecord(result.recordedArtifactProjection)
      && isRecord(result.document),
    "provider",
    "DEPLOYED_COMPOSITION_PROVIDER_RESULT_INVALID",
    "Provider loader did not return its exact recorded-only closed candidate boundary."
  );
}

async function loadHostEndpoint(input, roots) {
  const before = await snapshotFixedOutputPackage({
    input,
    root: input.hostOutputRoot,
    rootLock: roots.get("host-output"),
    fileNames: HOST_OUTPUT_FILE_NAMES,
    label: "host candidate package"
  });
  const result = await loadVerifiedDeployedHostCandidateOutput({
    bindingRoot: input.bindingRoot,
    outputRoot: input.hostOutputRoot,
    receiptPath: input.hostReceiptPath,
    artifactRoot: input.artifactRoot,
    artifactLock: input.artifactLock,
    releaseEvidenceId: input.releaseEvidenceId,
    cwd: input.bindingRoot
  });
  assertHostLoaderResult(result);
  const after = await snapshotFixedOutputPackage({
    input,
    root: input.hostOutputRoot,
    rootLock: roots.get("host-output"),
    fileNames: HOST_OUTPUT_FILE_NAMES,
    label: "host candidate package after loader"
  });
  requireCondition(
    exactJson(packageSnapshotFingerprint(before), packageSnapshotFingerprint(after)),
    "mutation",
    "DEPLOYED_COMPOSITION_HOST_PACKAGE_CHANGED",
    "Host package changed across its authoritative loader execution."
  );
  const fileBindings = packageFileBindingProjection(after);
  const receiptBinding = fileBindings.find((binding) => binding.path.endsWith(`/${HOST_RECEIPT_FILE_NAME}`));
  requireCondition(
    isRecord(receiptBinding),
    "host",
    "DEPLOYED_COMPOSITION_HOST_RECEIPT_BINDING_MISSING",
    "Host exact package set does not contain its fixed receipt."
  );
  return Object.freeze({
    result,
    outputRoot: relativeWithin(input.bindingRoot, input.hostOutputRoot, "Host output root binding"),
    receiptBinding,
    exactFileCount: fileBindings.length,
    exactFileSetDigest: sha256(canonicalJson(fileBindings)),
    packageProjectionDigest: sha256(canonicalJson({
      result: {
        ...result,
        currentArtifactProjection: comparableArtifactProjection(result.currentArtifactProjection)
      },
      fileBindings
    })),
    endpointFingerprint: immutableJsonSnapshot({
      result,
      files: packageSnapshotFingerprint(after)
    })
  });
}

async function loadProviderEndpoint(input, roots) {
  const before = await snapshotFixedOutputPackage({
    input,
    root: input.providerOutputRoot,
    rootLock: roots.get("provider-output"),
    fileNames: PROVIDER_OUTPUT_FILE_NAMES,
    label: "provider candidate package"
  });
  const result = await loadVerifiedProviderDeploymentCandidateOutput({
    bindingRoot: input.bindingRoot,
    outputRoot: input.providerOutputRoot,
    receiptPath: input.providerReceiptPath,
    cwd: input.bindingRoot
  });
  assertProviderLoaderResult(result);
  const after = await snapshotFixedOutputPackage({
    input,
    root: input.providerOutputRoot,
    rootLock: roots.get("provider-output"),
    fileNames: PROVIDER_OUTPUT_FILE_NAMES,
    label: "provider candidate package after loader"
  });
  requireCondition(
    exactJson(packageSnapshotFingerprint(before), packageSnapshotFingerprint(after)),
    "mutation",
    "DEPLOYED_COMPOSITION_PROVIDER_PACKAGE_CHANGED",
    "Provider package changed across its authoritative loader execution."
  );
  const fileBindings = packageFileBindingProjection(after);
  const receiptBinding = fileBindings.find((binding) => binding.path.endsWith(`/${PROVIDER_RECEIPT_FILE_NAME}`));
  requireCondition(
    isRecord(receiptBinding),
    "provider",
    "DEPLOYED_COMPOSITION_PROVIDER_RECEIPT_BINDING_MISSING",
    "Provider exact package set does not contain its fixed receipt."
  );
  return Object.freeze({
    result,
    outputRoot: relativeWithin(input.bindingRoot, input.providerOutputRoot, "Provider output root binding"),
    receiptBinding,
    exactFileCount: fileBindings.length,
    exactFileSetDigest: sha256(canonicalJson(fileBindings)),
    packageProjectionDigest: sha256(canonicalJson({ result, fileBindings })),
    endpointFingerprint: immutableJsonSnapshot({
      result,
      files: packageSnapshotFingerprint(after)
    })
  });
}

function pwaReceiptBindings(evidence) {
  requireCondition(
    isRecord(evidence?.receipts?.deployment),
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_DEPLOYMENT_RECEIPT_REQUIRED",
    "Composition requires a non-null PWA v3 deployment receipt binding."
  );
  const bindings = [
    ["artifact-identity-lock", evidence.artifactIdentity?.identityLock],
    ["formal-release-receipt", evidence.artifactIdentity?.formalReceipt],
    ["host-receipt", evidence.receipts?.host],
    ["edge-browser-receipt", evidence.receipts?.edge?.receipt],
    ...DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES.map((role) => [
      `edge-${role}`,
      evidence.receipts?.edge?.receipt?.attachments?.find((entry) => entry.role === role)
    ]),
    ["chrome-browser-receipt", evidence.receipts?.chrome?.receipt],
    ...DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES.map((role) => [
      `chrome-${role}`,
      evidence.receipts?.chrome?.receipt?.attachments?.find((entry) => entry.role === role)
    ]),
    ["provider-deployment-receipt", evidence.receipts.deployment]
  ].map(([role, binding]) => {
    requireCondition(
      isRecord(binding)
        && typeof binding.path === "string"
        && Number.isSafeInteger(binding.size)
        && binding.size > 0
        && binding.size <= MAX_PWA_BOUND_FILE_BYTES
        && SHA256_PATTERN.test(binding.sha256 ?? ""),
      "pwa",
      "DEPLOYED_COMPOSITION_PWA_RECEIPT_BINDING_INVALID",
      `${role} binding is invalid.`
    );
    return Object.freeze({ role, path: binding.path, size: binding.size, sha256: binding.sha256 });
  });
  const paths = bindings.map((binding) => binding.path);
  requireCondition(
    new Set(paths).size === paths.length,
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_RECEIPT_PATH_REUSED",
    "Every PWA receipt role must bind a distinct path."
  );
  return Object.freeze(bindings.sort((left, right) => compareCanonicalText(left.path, right.path)));
}

function assertPwaVerifierResult(result, receiptBindings) {
  const receiptPaths = receiptBindings.map((binding) => binding.path).sort();
  const expectedPathSetDigest = sha256(canonicalJson(receiptPaths));
  requireCondition(
    exactKeys(result, PWA_VERIFIER_RESULT_KEYS)
      && result.schemaVersion === 3
      && result.summaryType === "deployed_pwa_evidence_v3_verification"
      && result.verificationKind === "offline-no-git-no-network-no-browser-no-deployment"
      && result.receiptTrustClass === "untrusted_candidate_envelopes"
      && result.status === "not_admitted"
      && result.executionAdmission === "closed_missing_https_origin"
      && result.semanticConsistencyVerified === true
      && result.strictGatePassed === false
      && result.deployedPwaEngineeringVerified === false
      && exactKeys(result.gates?.semantic, DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES)
      && DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES.every((name) => result.gates.semantic[name] === true)
      && exactKeys(result.gates?.admission, DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES)
      && DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES.every((name) => result.gates.admission[name] === false)
      && exactKeys(result.claims, DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES)
      && DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES.every((name) => result.claims[name] === false)
      && exactJson(result.attempts, {
        schemaReadAttempted: true,
        policyReadAttempted: true,
        rootPreflightAttempted: true,
        inputReadAttempted: true,
        artifactReadAttempted: true,
        receiptReadAttempted: true,
        formalVerifierAttempted: false,
        gitAttempted: false,
        networkAttempted: false,
        browserAttempted: false,
        deploymentAttempted: false
      })
      && exactJson(result.artifactMutationBoundary, {
        schemaVersion: 1,
        boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
        coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
        endpointSnapshotsMatched: true,
        verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
        mutationEpochCapability: "absent_schema13",
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      })
      && exactJson(result.receiptSetMutationBoundary, {
        schemaVersion: 1,
        boundaryType: "deployed_pwa_v3_receipt_set_endpoint_snapshot_boundary_v1",
        coveredReceiptPathCount: receiptBindings.length,
        receiptPathSetDigest: expectedPathSetDigest,
        endpointSnapshotsMatched: true,
        terminalReceiptFileSetEnumerated: true,
        receiptBytesTerminallyRevalidated: false,
        verificationScope: "canonical_receipt_file_path_set_endpoint_snapshots_only_no_interval_or_aba_exclusion",
        overlappingFileHandleEpochEstablished: false,
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      }),
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_RESULT_INVALID",
    "PWA v3 verifier did not return its exact closed semantic-only boundary."
  );
}

function assertBoundSnapshot(binding, snapshot, label) {
  requireCondition(
    binding.path === snapshot.binding.path
      && binding.size === snapshot.binding.size
      && binding.sha256 === snapshot.binding.sha256,
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_RECEIPT_BYTES_MISMATCH",
    `${label} bytes do not match their PWA v3 binding.`
  );
}

async function readPwaReceiptSnapshots(input, roots, bindings, label) {
  const expectedPaths = bindings.map((binding) => binding.path);
  const aggregateBytes = bindings.reduce((total, binding) => total + binding.size, 0);
  requireCondition(
    Number.isSafeInteger(aggregateBytes) && aggregateBytes <= MAX_PWA_RECEIPT_SET_BYTES,
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_RECEIPT_SET_SIZE_INVALID",
    "PWA receipt package exceeds its aggregate byte limit."
  );
  await assertExactFileSet({
    bindingRoot: input.bindingRoot,
    root: input.pwaReceiptsRoot,
    rootLock: roots.get("pwa-receipts"),
    expectedPaths,
    label
  });
  const snapshots = [];
  for (const binding of bindings) {
    const snapshot = await readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: input.pwaReceiptsRoot,
      rootLock: roots.get("pwa-receipts"),
      filePath: path.resolve(input.bindingRoot, ...binding.path.split("/")),
      label: `${label} ${binding.role}`,
      maximumSize: binding.size
    });
    assertBoundSnapshot(binding, snapshot, binding.role);
    snapshots.push(Object.freeze({ binding, snapshot: snapshotMetadata(snapshot) }));
  }
  await assertExactFileSet({
    bindingRoot: input.bindingRoot,
    root: input.pwaReceiptsRoot,
    rootLock: roots.get("pwa-receipts"),
    expectedPaths,
    label: `${label} terminal set`
  });
  return Object.freeze(snapshots);
}

async function readPwaPrivateSnapshots(input, roots, label) {
  const inputPath = relativeWithin(input.bindingRoot, input.pwaInputPath, "PWA v3 input binding");
  const sidecarPath = relativeWithin(input.bindingRoot, `${input.pwaInputPath}.sha256`, "PWA v3 sidecar binding");
  await assertExactFileSet({
    bindingRoot: input.bindingRoot,
    root: input.pwaPrivateRoot,
    rootLock: roots.get("pwa-private"),
    expectedPaths: [inputPath, sidecarPath],
    label
  });
  const [inputSnapshot, sidecarSnapshot] = await Promise.all([
    readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: input.pwaPrivateRoot,
      rootLock: roots.get("pwa-private"),
      filePath: input.pwaInputPath,
      label: `${label} input`,
      maximumSize: 32 * 1024 * 1024
    }),
    readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: input.pwaPrivateRoot,
      rootLock: roots.get("pwa-private"),
      filePath: `${input.pwaInputPath}.sha256`,
      label: `${label} sidecar`,
      maximumSize: MAX_SIDECAR_BYTES
    })
  ]);
  const expectedSidecar = `${inputSnapshot.binding.sha256}  ${path.basename(input.pwaInputPath)}\n`;
  requireCondition(
    sidecarSnapshot.bytes.equals(Buffer.from(expectedSidecar, "utf8")),
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_SIDECAR_MISMATCH",
    "PWA v3 sidecar does not exactly bind the raw input bytes and filename."
  );
  await assertExactFileSet({
    bindingRoot: input.bindingRoot,
    root: input.pwaPrivateRoot,
    rootLock: roots.get("pwa-private"),
    expectedPaths: [inputPath, sidecarPath],
    label: `${label} terminal set`
  });
  return Object.freeze({ inputSnapshot, sidecarSnapshot });
}

async function loadPwaEndpoint(input, roots) {
  const initialPrivate = await readPwaPrivateSnapshots(input, roots, "PWA private package");
  const evidence = parseDeployedPwaEvidenceV3JsonBytes(
    initialPrivate.inputSnapshot.bytes,
    "Composition PWA v3 Evidence"
  );
  const computedIdentity = computeDeployedPwaEvidenceV3Identity(evidence);
  requireCondition(
    evidence.evidenceId === computedIdentity.evidenceId
      && evidence.evidenceDigest === computedIdentity.evidenceDigest,
    "pwa",
    "DEPLOYED_COMPOSITION_PWA_EVIDENCE_IDENTITY_INVALID",
    "PWA v3 Evidence canonical identity is invalid."
  );
  const receiptBindings = pwaReceiptBindings(evidence);
  const initialReceipts = await readPwaReceiptSnapshots(
    input,
    roots,
    receiptBindings,
    "PWA receipt package"
  );
  const verifierResult = await verifyDeployedPwaEvidenceV3({
    cwd: input.bindingRoot,
    inputPath: input.pwaInputPath,
    artifactRoot: input.artifactRoot,
    receiptsRoot: input.pwaReceiptsRoot,
    privateRoot: input.pwaPrivateRoot
  });
  assertPwaVerifierResult(verifierResult, receiptBindings);
  const terminalPrivate = await readPwaPrivateSnapshots(input, roots, "PWA private package after verifier");
  assertSnapshotMatched(initialPrivate.inputSnapshot, terminalPrivate.inputSnapshot, "PWA v3 input");
  assertSnapshotMatched(initialPrivate.sidecarSnapshot, terminalPrivate.sidecarSnapshot, "PWA v3 sidecar");
  const terminalReceipts = await readPwaReceiptSnapshots(
    input,
    roots,
    receiptBindings,
    "PWA receipt package after verifier"
  );
  requireCondition(
    exactJson(
      initialReceipts.map(({ snapshot }) => snapshotFingerprint(snapshot)),
      terminalReceipts.map(({ snapshot }) => snapshotFingerprint(snapshot))
    ),
    "mutation",
    "DEPLOYED_COMPOSITION_PWA_RECEIPT_BYTES_CHANGED",
    "PWA receipt bytes or file identities changed across the v3 verifier execution."
  );
  const receiptBindingProjection = receiptBindings.map((binding) => ({
    role: binding.role,
    path: binding.path,
    size: binding.size,
    sha256: binding.sha256
  }));
  const receiptBindingSetDigest = sha256(canonicalJson(receiptBindingProjection));
  const packageProjection = {
    evidence,
    inputBinding: terminalPrivate.inputSnapshot.binding,
    sidecarBinding: terminalPrivate.sidecarSnapshot.binding,
    receiptBindings: receiptBindingProjection,
    receiptBindingSetDigest,
    verifierResult
  };
  return Object.freeze({
    evidence: immutableJsonSnapshot(evidence),
    verifierResult,
    inputBinding: terminalPrivate.inputSnapshot.binding,
    sidecarBinding: terminalPrivate.sidecarSnapshot.binding,
    receiptBindings: immutableJsonSnapshot(receiptBindingProjection),
    receiptBindingSetDigest,
    packageProjectionDigest: sha256(canonicalJson(packageProjection)),
    endpointFingerprint: immutableJsonSnapshot({
      packageProjection,
      inputIdentity: terminalPrivate.inputSnapshot.identity,
      sidecarIdentity: terminalPrivate.sidecarSnapshot.identity,
      receiptFiles: terminalReceipts.map(({ snapshot }) => snapshotFingerprint(snapshot))
    })
  });
}

function artifactComponentBindingsMatch(expectation, pwaIdentity) {
  const byPath = new Map(expectation.artifacts.map((entry) => [entry.path, entry]));
  const components = Object.values(pwaIdentity.components ?? {});
  return components.length === 4
    && components.every((component) => exactJson(byPath.get(component.path), component))
    && pwaIdentity.components.applicationShell.sha256 === expectation.lockedBytes.indexHtmlSha256
    && pwaIdentity.components.pwaManifest.sha256 === expectation.lockedBytes.manifestSha256
    && pwaIdentity.components.serviceWorker.sha256 === expectation.lockedBytes.serviceWorkerSha256;
}

function comparableArtifactProjection(value) {
  const candidate = structuredClone(value);
  if (isRecord(candidate.artifactIdentityLockBinding)) {
    delete candidate.artifactIdentityLockBinding.realPath;
  }
  return candidate;
}

function validateCompositionProjection({
  input,
  hostEndpoint,
  providerEndpoint,
  pwaEndpoint
}) {
  const host = hostEndpoint.result;
  const provider = providerEndpoint.result;
  const pwa = pwaEndpoint.evidence;
  assertHostLoaderResult(host);
  assertProviderLoaderResult(provider);
  assertPwaVerifierResult(pwaEndpoint.verifierResult, pwaEndpoint.receiptBindings);

  const hostDocument = host.document;
  const providerDocument = provider.document;
  const hostArtifact = host.currentArtifactProjection;
  const providerArtifact = provider.recordedArtifactProjection;
  const pwaArtifact = pwa.artifactIdentity;
  const deployment = pwa.receipts.deployment;
  const pwaHostingPolicy = pwa.policyBindings.find((binding) => binding.role === "hosting-security-policy");
  const artifactRootBinding = relativeWithin(input.bindingRoot, input.artifactRoot, "Artifact root binding");
  const artifactLockBinding = relativeWithin(input.bindingRoot, input.artifactLock, "Artifact lock binding");

  requireCondition(
    isRecord(deployment),
    "binding",
    "DEPLOYED_COMPOSITION_PWA_DEPLOYMENT_RECEIPT_REQUIRED",
    "Composition requires a non-null PWA v3 deployment projection."
  );

  requireCondition(
    exactJson(
      comparableArtifactProjection(hostArtifact),
      comparableArtifactProjection(providerArtifact)
    ),
    "binding",
    "DEPLOYED_COMPOSITION_HOST_PROVIDER_ARTIFACT_MISMATCH",
    "Host current artifact projection and provider recorded artifact projection differ."
  );
  requireCondition(
    hostArtifact.evidenceId === input.releaseEvidenceId
      && hostArtifact.evidenceId === host.releaseEvidenceId
      && hostArtifact.evidenceId === provider.releaseEvidenceId
      && hostArtifact.evidenceId === pwaArtifact.releaseEvidence.evidenceId
      && hostArtifact.evidenceId === pwaArtifact.formalReceipt.releaseEvidenceId
      && hostArtifact.evidenceId === pwaArtifact.identityLock.evidenceId
      && exactJson(hostArtifact.descriptor, pwaArtifact.descriptor)
      && exactJson(hostArtifact.releaseIdentity.descriptor, pwaArtifact.descriptor)
      && hostArtifact.releaseIdentity.manifestVersion === pwaArtifact.manifestVersion
      && hostArtifact.releaseIdentity.manifestDigest === pwaArtifact.manifestDigest
      && hostArtifact.releaseIdentity.buildVersion === pwaArtifact.buildVersion
      && hostArtifact.artifactSetDigest === pwaArtifact.artifactSetDigest
      && hostArtifact.artifactSetDigest === host.artifactSetDigest
      && hostArtifact.artifactSetDigest === provider.artifactSetDigest
      && hostArtifact.releaseEvidence.size === pwaArtifact.releaseEvidence.size
      && hostArtifact.releaseEvidence.sha256 === pwaArtifact.releaseEvidence.sha256
      && hostArtifact.artifactIdentityLockBinding.path === artifactLockBinding
      && hostArtifact.artifactIdentityLockBinding.path === pwaArtifact.identityLock.path
      && hostArtifact.artifactIdentityLockBinding.sha256 === pwaArtifact.identityLock.sha256
      && hostArtifact.artifactIdentityLockBinding.lockDigest === pwaArtifact.identityLock.lockDigest
      && hostArtifact.artifactIdentityLockBinding.artifactSetDigest === pwaArtifact.identityLock.artifactSetDigest
      && pwaArtifact.artifactRoot === artifactRootBinding
      && artifactComponentBindingsMatch(hostArtifact, pwaArtifact)
      && pwaHostingPolicy?.path === hostArtifact.policyBinding.path
      && pwaHostingPolicy?.sha256 === hostArtifact.policyBinding.sha256
      && hostDocument.checkedPolicy.byteSha256 === hostArtifact.policyBinding.sha256
      && providerDocument.artifactIdentity.hostingPolicy.sha256 === hostArtifact.policyBinding.sha256,
    "binding",
    "DEPLOYED_COMPOSITION_ARTIFACT_IDENTITY_MISMATCH",
    "Host, provider, and PWA artifact identities are not exactly cross-bound."
  );
  requireCondition(
    exactJson(pwa.scope.releaseIdentity, {
      channel: "default-v13",
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    })
      && hostArtifact.descriptor.dbGeneration === "legacy-v13"
      && hostArtifact.descriptor.targetSchema === 13
      && hostArtifact.descriptor.migrationId === null,
    "binding",
    "DEPLOYED_COMPOSITION_RELEASE_IDENTITY_MISMATCH",
    "Composition release identity is not the frozen legacy-v13 / schema 13 / null migration."
  );

  const platform = hostDocument.candidatePlatform;
  const origin = hostDocument.targetOrigin;
  requireCondition(
    typeof platform === "string" && platform.length > 0 && platform !== "unselected",
    "binding",
    "DEPLOYED_COMPOSITION_PLATFORM_INVALID",
    "Candidate platform must be explicit and cannot be unselected."
  );
  requireCanonicalPublicHttpsOrigin(origin, "Candidate canonical origin");
  requireCanonicalPublicHttpsOrigin(
    providerDocument.candidateScope.immutableDeploymentUrl,
    "Provider immutable deployment URL"
  );
  requireCondition(
    (host.observationLabel === "synthetic_injected_test_fixture"
      && hostDocument.verificationKind === "synthetic-offline-candidate-contract")
      || (host.observationLabel === "node_http_pinned_real_network_v1"
        && hostDocument.verificationKind === "real-network-candidate-observation"),
    "host",
    "DEPLOYED_COMPOSITION_HOST_PROVENANCE_LABEL_MISMATCH",
    "Host observation label and source verification kind are not a permitted pair."
  );
  requireCondition(
    platform === providerDocument.candidateScope.provider
      && platform === pwa.scope.candidateDeploymentPlatform
      && platform === pwa.receipts.host.deploymentPlatform
      && platform === deployment.provider
      && origin === providerDocument.candidateScope.origin
      && origin === pwa.scope.candidateCanonicalOrigin
      && origin === pwa.receipts.host.targetOrigin
      && origin === deployment.targetOrigin,
    "binding",
    "DEPLOYED_COMPOSITION_PLATFORM_ORIGIN_MISMATCH",
    "Candidate platform or canonical origin differs across packages."
  );
  requireCondition(
    providerDocument.candidateScope.action === "deploy_candidate"
      && deployment.action === "deploy_candidate"
      && deployment.deploymentId === providerDocument.operation.resultActiveDeploymentId
      && deployment.completedAt === providerDocument.operation.completedAt
      && deployment.releaseEvidenceId === hostArtifact.evidenceId
      && deployment.artifactSetDigest === hostArtifact.artifactSetDigest
      && pwa.receipts.host.releaseEvidenceId === hostArtifact.evidenceId
      && pwa.receipts.host.artifactSetDigest === hostArtifact.artifactSetDigest
      && pwa.receipts.host.completedAt === hostDocument.completedAt,
    "binding",
    "DEPLOYED_COMPOSITION_DEPLOYMENT_PROJECTION_MISMATCH",
    "Provider operation and PWA deployment/host projections are not exactly cross-bound."
  );

  const providerObservedAt = canonicalUtcTimestamp(
    providerDocument.operation.finalReadbackObservedAt,
    "Provider final readback"
  );
  const hostStartedAt = canonicalUtcTimestamp(hostDocument.startedAt, "Host receipt start");
  const hostCompletedAt = canonicalUtcTimestamp(hostDocument.completedAt, "Host receipt completion");
  const edgeStartedAt = canonicalUtcTimestamp(pwa.receipts.edge.receipt.startedAt, "Edge receipt start");
  const edgeCompletedAt = canonicalUtcTimestamp(pwa.receipts.edge.receipt.completedAt, "Edge receipt completion");
  const chromeStartedAt = canonicalUtcTimestamp(pwa.receipts.chrome.receipt.startedAt, "Chrome receipt start");
  const chromeCompletedAt = canonicalUtcTimestamp(pwa.receipts.chrome.receipt.completedAt, "Chrome receipt completion");
  const generatedAt = canonicalUtcTimestamp(pwa.generatedAt, "PWA Evidence generation");
  requireCondition(
    providerObservedAt <= hostStartedAt
      && hostStartedAt <= hostCompletedAt
      && hostCompletedAt <= edgeStartedAt
      && hostCompletedAt <= chromeStartedAt
      && edgeStartedAt <= edgeCompletedAt
      && chromeStartedAt <= chromeCompletedAt
      && edgeCompletedAt <= generatedAt
      && chromeCompletedAt <= generatedAt,
    "binding",
    "DEPLOYED_COMPOSITION_CANDIDATE_CHRONOLOGY_INVALID",
    "Candidate document chronology is inconsistent."
  );

  return immutableJsonSnapshot({
    scope: {
      releaseIdentity: {
        channel: "default-v13",
        descriptor: hostArtifact.descriptor,
        manifestVersion: hostArtifact.releaseIdentity.manifestVersion,
        manifestDigest: hostArtifact.releaseIdentity.manifestDigest,
        buildVersion: hostArtifact.releaseIdentity.buildVersion,
        releaseEvidenceId: hostArtifact.evidenceId,
        artifactSetDigest: hostArtifact.artifactSetDigest
      },
      candidatePlatform: platform,
      canonicalOrigin: origin,
      providerAccountId: providerDocument.candidateScope.accountId,
      providerProjectId: providerDocument.candidateScope.projectId,
      providerEnvironment: providerDocument.candidateScope.environment,
      providerDeploymentId: providerDocument.operation.resultActiveDeploymentId,
      providerImmutableDeploymentUrl: providerDocument.candidateScope.immutableDeploymentUrl
    },
    commonArtifactIdentity: {
      identityLock: {
        path: pwaArtifact.identityLock.path,
        sha256: pwaArtifact.identityLock.sha256,
        lockDigest: pwaArtifact.identityLock.lockDigest,
        artifactSetDigest: pwaArtifact.identityLock.artifactSetDigest
      },
      releaseEvidence: {
        path: pwaArtifact.releaseEvidence.path,
        size: pwaArtifact.releaseEvidence.size,
        sha256: pwaArtifact.releaseEvidence.sha256
      },
      components: pwaArtifact.components,
      hostingPolicy: {
        path: hostArtifact.policyBinding.path,
        rawSha256: hostArtifact.policyBinding.sha256,
        canonicalSha256: hostArtifact.policyBinding.canonicalSha256
      },
      artifactInventoryFileCount: hostArtifact.artifacts.length,
      artifactInventoryDigest: hostArtifact.artifactSetDigest
    },
    packageBindings: {
      host: {
        receiptId: host.receiptId,
        receiptDigest: host.receiptDigest,
        attachmentSetDigest: hostDocument.rawAttachmentSetDigest,
        outputRoot: hostEndpoint.outputRoot,
        receiptPath: hostEndpoint.receiptBinding.path,
        receiptSize: hostEndpoint.receiptBinding.size,
        receiptSha256: hostEndpoint.receiptBinding.sha256,
        terminalGateBinding: host.terminalGateBinding,
        exactFileCount: hostEndpoint.exactFileCount,
        exactFileSetDigest: hostEndpoint.exactFileSetDigest,
        packageProjectionDigest: hostEndpoint.packageProjectionDigest,
        observationLabel: host.observationLabel,
        sourceVerificationKind: hostDocument.verificationKind,
        startedAt: hostDocument.startedAt,
        completedAt: hostDocument.completedAt
      },
      provider: {
        receiptId: provider.receiptId,
        receiptDigest: provider.receiptDigest,
        attachmentSetDigest: providerDocument.attachmentSetDigest,
        outputRoot: providerEndpoint.outputRoot,
        receiptPath: providerEndpoint.receiptBinding.path,
        receiptSize: providerEndpoint.receiptBinding.size,
        receiptSha256: providerEndpoint.receiptBinding.sha256,
        terminalGateBinding: provider.terminalGateBinding,
        exactFileCount: providerEndpoint.exactFileCount,
        exactFileSetDigest: providerEndpoint.exactFileSetDigest,
        packageProjectionDigest: providerEndpoint.packageProjectionDigest,
        adapterId: providerDocument.adapter.adapterId,
        adapterVersion: providerDocument.adapter.adapterVersion,
        action: providerDocument.candidateScope.action,
        operationId: providerDocument.operation.operationId,
        resultDeploymentId: providerDocument.operation.resultActiveDeploymentId,
        immutableDeploymentUrl: providerDocument.candidateScope.immutableDeploymentUrl,
        finalReadbackObservedAt: providerDocument.operation.finalReadbackObservedAt,
        operationCompletedAt: providerDocument.operation.completedAt
      },
      pwaV3: {
        evidenceId: pwa.evidenceId,
        evidenceDigest: pwa.evidenceDigest,
        inputPath: pwaEndpoint.inputBinding.path,
        inputSize: pwaEndpoint.inputBinding.size,
        inputSha256: pwaEndpoint.inputBinding.sha256,
        sidecarPath: pwaEndpoint.sidecarBinding.path,
        sidecarSize: pwaEndpoint.sidecarBinding.size,
        sidecarSha256: pwaEndpoint.sidecarBinding.sha256,
        receiptPathSetDigest: pwaEndpoint.verifierResult.receiptSetMutationBoundary.receiptPathSetDigest,
        receiptFileCount: pwaEndpoint.receiptBindings.length,
        receiptBindingSetDigest: pwaEndpoint.receiptBindingSetDigest,
        packageProjectionDigest: pwaEndpoint.packageProjectionDigest,
        generatedAt: pwa.generatedAt
      }
    }
  });
}

function terminalIdentityFree(document) {
  const candidate = structuredClone(document);
  delete candidate.compositionId;
  delete candidate.compositionDigest;
  return candidate;
}

export function computeDeployedPwaHostProviderCompositionIdentity(document) {
  const compositionDigest = sha256(canonicalJson(terminalIdentityFree(document)));
  return Object.freeze({
    compositionDigest,
    compositionId: `hpcomp1-${compositionDigest.slice(0, 32)}`
  });
}

function buildCompositionDocument({ projection, sourceBindings }) {
  const unsigned = {
    schemaVersion: 1,
    recordType: "deployed_pwa_host_provider_composition_candidate_v1",
    verificationKind: "offline-three-independent-candidate-verifiers-v1",
    trustClass: "untrusted_candidate_composition",
    status: "not_admitted",
    usableForAdmission: false,
    scope: projection.scope,
    commonArtifactIdentity: projection.commonArtifactIdentity,
    packageBindings: projection.packageBindings,
    sourceBindings,
    sourceSetDigest: sha256(canonicalJson(sourceBindings)),
    mechanicalChecks: {
      hostCandidatePackageIntegrityVerified: true,
      providerCandidatePackageIntegrityVerified: true,
      pwaV3SemanticConsistencyVerified: true,
      commonReleaseIdentityMatched: true,
      commonArtifactIdentityMatched: true,
      platformAndOriginMatched: true,
      deploymentProjectionCrossBound: true,
      candidateChronologyMatched: true,
      exactPackageSetsVerified: true,
      checkedSourceSetVerified: true,
      authoritativeConsumersReexecuted: true,
      terminalEndpointSnapshotsMatched: true,
      compositionDigestVerified: true,
      semanticConsistencyVerified: true
    },
    limitations: {
      hostSemanticEvaluatorImplementationIndependent: false,
      realNetworkTransportProvenanceVerified: false,
      providerOriginalRawSourcesCurrentVerified: false,
      providerCurrentArtifactSourceReopenedByProviderLoader: false,
      providerAuthenticatedReceiptVerified: false,
      rawProjectionDerivationVerified: false,
      pwaBrowserRuntimeExternallyVerified: false,
      trustedClockOrderVerified: false,
      bundleReplayResistanceVerified: false,
      attemptFreshnessExternallyVerified: false
    },
    mutationBoundary: {
      boundaryType: "deployed_pwa_host_provider_composition_endpoint_snapshot_boundary_v1",
      verificationScope: "three_independent_loader_endpoint_snapshots_no_continuous_mutation_epoch",
      mutationEpochCapability: "absent_schema13",
      initialAndTerminalEndpointSnapshotsMatched: true,
      continuousMutationEpochVerified: false,
      intervalMutationExclusionClaimed: false,
      abaMutationExclusionClaimed: false,
      samePermissionMutationExcluded: false
    },
    attempts: {
      networkAttempted: false,
      browserAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      gitAttempted: false
    },
    admissionGates: {
      trustedHostParserVerified: false,
      trustedProviderParserVerified: false,
      compositionAdmissionPassed: false,
      deploymentAdmissionPassed: false,
      publicReleaseGatePassed: false
    },
    authorizationBoundary: {
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    },
    claims: CLOSED_CLAIMS
  };
  const identity = computeDeployedPwaHostProviderCompositionIdentity(unsigned);
  return immutableJsonSnapshot({
    ...unsigned,
    compositionId: identity.compositionId,
    compositionDigest: identity.compositionDigest
  });
}

function assertCompositionIdentity(document) {
  const identity = computeDeployedPwaHostProviderCompositionIdentity(document);
  requireCondition(
    document.compositionId === identity.compositionId
      && document.compositionDigest === identity.compositionDigest,
    "identity",
    "DEPLOYED_COMPOSITION_IDENTITY_INVALID",
    "Composition id or digest does not match its canonical document."
  );
}

function validateCompositionDocumentShapeAndIdentity(document, schemaValidator) {
  requireCondition(
    isRecord(schemaValidator) && typeof schemaValidator.assert === "function",
    "schema",
    "DEPLOYED_COMPOSITION_SCHEMA_VALIDATOR_REQUIRED",
    "A checked composition schema validator is required."
  );
  try {
    schemaValidator.assert(document);
  } catch (error) {
    fail("schema", "DEPLOYED_COMPOSITION_DOCUMENT_SCHEMA_INVALID", "Composition document failed its checked schema.", error);
  }
  requireCondition(
    document.sourceSetDigest === sha256(canonicalJson(document.sourceBindings)),
    "identity",
    "DEPLOYED_COMPOSITION_SOURCE_SET_DIGEST_INVALID",
    "Composition checked-source digest does not match its exact source bindings."
  );
  assertCompositionIdentity(document);
  return immutableJsonSnapshot(document);
}

// These pure helpers exist only for adversarial unit tests. They do not read package bytes,
// rerun an authoritative consumer, or establish mechanical evidence on their own.
export const deployedPwaHostProviderCompositionTestOnly = Object.freeze({
  validateProjection: validateCompositionProjection,
  validateDocumentShapeAndIdentity: validateCompositionDocumentShapeAndIdentity
});

export async function composeDeployedPwaHostProviderCandidate(
  rawInput,
  { cwd = process.cwd(), onBeforeTerminalEndpointSnapshotsForTest } = {}
) {
  requireCondition(
    onBeforeTerminalEndpointSnapshotsForTest === undefined
      || typeof onBeforeTerminalEndpointSnapshotsForTest === "function",
    "arguments",
    "DEPLOYED_COMPOSITION_TEST_CHECKPOINT_INVALID",
    "Composition test checkpoint must be a function when supplied."
  );
  const input = parseDeployedPwaHostProviderCompositionInput(rawInput);
  const roots = await captureRootTopology(input, cwd);
  const initialSources = await readCheckedSources(input, roots.get("binding"));
  const initialHost = await loadHostEndpoint(input, roots);
  const initialProvider = await loadProviderEndpoint(input, roots);
  const initialPwa = await loadPwaEndpoint(input, roots);
  const initialProjection = validateCompositionProjection({
    input,
    hostEndpoint: initialHost,
    providerEndpoint: initialProvider,
    pwaEndpoint: initialPwa
  });

  if (onBeforeTerminalEndpointSnapshotsForTest !== undefined) {
    try {
      await onBeforeTerminalEndpointSnapshotsForTest(Object.freeze({
        phase: "before_terminal_composition_endpoint_snapshots"
      }));
    } catch (error) {
      fail("mutation", "DEPLOYED_COMPOSITION_TEST_CHECKPOINT_FAILED", "Trusted test checkpoint failed.", error);
    }
  }

  const terminalHost = await loadHostEndpoint(input, roots);
  const terminalProvider = await loadProviderEndpoint(input, roots);
  const terminalPwa = await loadPwaEndpoint(input, roots);
  const terminalSources = await readCheckedSources(input, roots.get("binding"));
  const terminalProjection = validateCompositionProjection({
    input,
    hostEndpoint: terminalHost,
    providerEndpoint: terminalProvider,
    pwaEndpoint: terminalPwa
  });
  requireCondition(
    exactJson(initialHost.endpointFingerprint, terminalHost.endpointFingerprint),
    "mutation",
    "DEPLOYED_COMPOSITION_HOST_ENDPOINT_CHANGED",
    "Host endpoint snapshot changed between authoritative loader executions."
  );
  requireCondition(
    exactJson(initialProvider.endpointFingerprint, terminalProvider.endpointFingerprint),
    "mutation",
    "DEPLOYED_COMPOSITION_PROVIDER_ENDPOINT_CHANGED",
    "Provider endpoint snapshot changed between authoritative loader executions."
  );
  requireCondition(
    exactJson(initialPwa.endpointFingerprint, terminalPwa.endpointFingerprint),
    "mutation",
    "DEPLOYED_COMPOSITION_PWA_ENDPOINT_CHANGED",
    "PWA endpoint snapshot changed between authoritative verifier executions."
  );
  requireCondition(
    exactJson(initialProjection, terminalProjection),
    "mutation",
    "DEPLOYED_COMPOSITION_PROJECTION_CHANGED",
    "Cross-package projection changed between endpoint snapshots."
  );
  assertSourceEndpointsMatched(initialSources, terminalSources);
  await assertRootTopologyStillLocked(roots);

  const document = buildCompositionDocument({
    projection: terminalProjection,
    sourceBindings: sourceBindingProjection(terminalSources)
  });
  return validateCompositionDocumentShapeAndIdentity(
    document,
    terminalSources.schemaValidator
  );
}

export function buildDeployedPwaHostProviderCompositionFailure(error) {
  const stage = error instanceof DeployedPwaHostProviderCompositionError ? error.stage : "internal";
  const code = error instanceof DeployedPwaHostProviderCompositionError
    ? error.code
    : "DEPLOYED_COMPOSITION_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  return immutableJsonSnapshot({
    schemaVersion: 1,
    summaryType: "deployed_pwa_host_provider_composition_failure_v1",
    verificationKind: "offline-three-independent-candidate-verifiers-v1",
    trustClass: "untrusted_candidate_composition",
    status: "failed",
    usableForAdmission: false,
    semanticConsistencyVerified: false,
    attempts: {
      networkAttempted: false,
      browserAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      gitAttempted: false
    },
    authorizationBoundary: {
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    },
    claims: CLOSED_CLAIMS,
    error: {
      stage,
      code,
      messageDigest: sha256(message)
    }
  });
}

async function runCli() {
  try {
    const input = parseDeployedPwaHostProviderCompositionEnvironment(process.env);
    const result = await composeDeployedPwaHostProviderCandidate(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(buildDeployedPwaHostProviderCompositionFailure(error), null, 2)}\n`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
