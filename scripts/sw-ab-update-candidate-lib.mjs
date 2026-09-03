import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

import { parseExpression } from "@babel/parser";

import {
  canonicalJson,
  computeEvidenceId,
  RELEASE_POLICY_PATHS,
  sha256
} from "./release-evidence-lib.mjs";
import {
  compileReleaseEvidenceSchema,
  RELEASE_EVIDENCE_SCHEMA_PATH
} from "./release-evidence-schema.mjs";
import { isReleaseBrowserReceiptId } from
  "../apps/web/playwright.release-browser-result.ts";
import {
  compileSwAbUpdateCandidateSchema,
  SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH
} from "./sw-ab-update-candidate-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_POLICY_PATH =
  "docs/release/sw-ab-update-candidate-policy.v1.json";
export const SW_AB_UPDATE_CANDIDATE_RELEASE_DECISIONS_PATH =
  "docs/release/web-v1-release-decisions.json";
export const SW_AB_UPDATE_CANDIDATE_RELEASE_HISTORY_PATH =
  "docs/release/release-generation-history.json";
export const SW_AB_UPDATE_CANDIDATE_HOSTING_SECURITY_POLICY_PATH =
  "docs/security/hosting-security-policy.json";

export const SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS = Object.freeze([
  "msedge",
  "chrome"
]);

export const SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES = Object.freeze([
  "artifact-a-identity-lock",
  "artifact-a-release-evidence",
  "artifact-a-remote-artifact-capture",
  "artifact-b-identity-lock",
  "artifact-b-release-evidence",
  "artifact-b-remote-artifact-capture"
]);

export const SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES = Object.freeze([
  "browser-version",
  "fresh-persistent-profile-preflight",
  "initial-two-client-census",
  "post-claim-two-client-census",
  "artifact-a-controller-source",
  "artifact-b-controller-source",
  "sw-controller-install-wait-activation-timeline",
  "update-network-interruption",
  "process-and-profile-reopen",
  "offline-root-result",
  "offline-deep-link-result",
  "offline-uncached-canary",
  "artifact-b-cache-inventory",
  "v13-data-before",
  "v13-data-after",
  "stale-a-write-rejection"
]);

export const SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS = Object.freeze([
  Object.freeze({
    role: "release-decisions",
    path: SW_AB_UPDATE_CANDIDATE_RELEASE_DECISIONS_PATH
  }),
  Object.freeze({
    role: "release-generation-history",
    path: SW_AB_UPDATE_CANDIDATE_RELEASE_HISTORY_PATH
  }),
  Object.freeze({
    role: "hosting-security-policy",
    path: SW_AB_UPDATE_CANDIDATE_HOSTING_SECURITY_POLICY_PATH
  }),
  Object.freeze({
    role: "release-evidence-schema",
    path: RELEASE_EVIDENCE_SCHEMA_PATH
  }),
  Object.freeze({
    role: "sw-ab-update-policy",
    path: SW_AB_UPDATE_CANDIDATE_POLICY_PATH
  }),
  Object.freeze({
    role: "sw-ab-update-schema",
    path: SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH
  })
]);

export const SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY = Object.freeze({
  channel: "default-v13",
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
});

export const SW_AB_UPDATE_CANDIDATE_CAPABILITIES = Object.freeze({
  mutationEpochCapability: "absent_schema13",
  epoch: null
});

export const SW_AB_UPDATE_CANDIDATE_AUTHORITY = Object.freeze({
  defaultV13ReceiptAllowlistMember: false,
  formalReleaseEvidenceReceipt: false,
  trustedProviderVerified: false,
  trustedHostVerified: false,
  trustedBrowserRuntimeVerified: false,
  deploymentReady: false,
  releaseReady: false,
  externalDeploymentExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false,
  schemaPromotionAuthorized: false
});

export const SW_AB_UPDATE_CANDIDATE_TIMELINE = Object.freeze([
  Object.freeze({
    eventId: "fresh_profile_started_online",
    documentTags: Object.freeze([]),
    controllerTags: Object.freeze([]),
    installingTag: null,
    waitingTag: null,
    activeTag: null,
    networkState: "online",
    pageCount: 0,
    processState: "running"
  }),
  Object.freeze({
    eventId: "two_artifact_a_clients_controlled",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["A", "A"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "A",
    networkState: "online",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "artifact_b_update_requested",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["A", "A"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "A",
    networkState: "online",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "artifact_b_installing_observed",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["A", "A"]),
    installingTag: "B",
    waitingTag: null,
    activeTag: "A",
    networkState: "online",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "artifact_b_waiting_observed",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["A", "A"]),
    installingTag: null,
    waitingTag: "B",
    activeTag: "A",
    networkState: "online",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "network_interrupted_during_update",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["A", "A"]),
    installingTag: null,
    waitingTag: "B",
    activeTag: "A",
    networkState: "offline",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "artifact_b_activation_and_claim_observed",
    documentTags: Object.freeze(["A", "A"]),
    controllerTags: Object.freeze(["B", "B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "one_a_document_reloaded_to_b",
    documentTags: Object.freeze(["A", "B"]),
    controllerTags: Object.freeze(["B", "B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "stale_a_production_write_rejected",
    documentTags: Object.freeze(["A", "B"]),
    controllerTags: Object.freeze(["B", "B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 2,
    processState: "running"
  }),
  Object.freeze({
    eventId: "all_pages_closed",
    documentTags: Object.freeze([]),
    controllerTags: Object.freeze([]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 0,
    processState: "running"
  }),
  Object.freeze({
    eventId: "browser_process_closed",
    documentTags: Object.freeze([]),
    controllerTags: Object.freeze([]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 0,
    processState: "stopped"
  }),
  Object.freeze({
    eventId: "persistent_profile_process_reopened_offline",
    documentTags: Object.freeze([]),
    controllerTags: Object.freeze([]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 0,
    processState: "running"
  }),
  Object.freeze({
    eventId: "offline_root_opened",
    documentTags: Object.freeze(["B"]),
    controllerTags: Object.freeze(["B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 1,
    processState: "running"
  }),
  Object.freeze({
    eventId: "offline_deep_link_opened",
    documentTags: Object.freeze(["B"]),
    controllerTags: Object.freeze(["B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 1,
    processState: "running"
  }),
  Object.freeze({
    eventId: "final_v13_snapshot_recorded",
    documentTags: Object.freeze(["B"]),
    controllerTags: Object.freeze(["B"]),
    installingTag: null,
    waitingTag: null,
    activeTag: "B",
    networkState: "offline",
    pageCount: 1,
    processState: "running"
  })
]);

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TERMINAL_CODE = "SW_AB_UPDATE_CANDIDATE_INTERNALLY_CONSISTENT_NOT_ADMITTED";
const TERMINAL_MESSAGE =
  "SW A to B update candidate bytes are internally consistent, but the future HTTPS origin and all trusted deployment, release, content, expert, and rights authority remain absent.";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
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

export class SwAbUpdateCandidateVerificationError extends Error {
  constructor(stage, code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "SwAbUpdateCandidateVerificationError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new SwAbUpdateCandidateVerificationError(stage, code, message, cause);
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
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

function decodeStrictUtf8(bytes, label) {
  requireCondition(
    !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    "json",
    "SW_AB_UPDATE_JSON_BOM_FORBIDDEN",
    `${label} must not contain a UTF-8 BOM.`
  );
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail("json", "SW_AB_UPDATE_JSON_UTF8_INVALID", `${label} is not strict UTF-8.`, error);
  }
}

export function parseSwAbUpdateCandidateJsonBytes(bytes, label = "SW A to B JSON") {
  const source = decodeStrictUtf8(Buffer.from(bytes), label);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: label,
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (error) {
    fail("json", "SW_AB_UPDATE_JSON_SYNTAX_INVALID", `${label} is not strict JSON.`, error);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      requireCondition(
        property.type === "ObjectProperty"
          && property.computed === false
          && property.key?.type === "StringLiteral",
        "json",
        "SW_AB_UPDATE_JSON_PROPERTY_INVALID",
        `${label} contains a non-JSON object property.`
      );
      requireCondition(
        !keys.has(property.key.value),
        "json",
        "SW_AB_UPDATE_JSON_DUPLICATE_KEY",
        `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`
      );
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("json", "SW_AB_UPDATE_JSON_INVALID", `${label} is not valid JSON.`, error);
  }
}

function parseCanonicalTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  requireCondition(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    "semantic",
    "SW_AB_UPDATE_TIMESTAMP_NONCANONICAL",
    `${label} must be a canonical UTC ISO timestamp.`
  );
  return parsed;
}

function normalizedPath(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function pathIsWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function pathsOverlap(left, right) {
  return normalizedPath(left) === normalizedPath(right)
    || pathIsWithin(left, right)
    || pathIsWithin(right, left);
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
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
    fail("filesystem", "SW_AB_UPDATE_ROOT_UNREADABLE", `${label} root is unreadable.`, error);
  }
  requireCondition(
    stat.isDirectory() && !stat.isSymbolicLink() && stat.ino !== 0n,
    "filesystem",
    "SW_AB_UPDATE_ROOT_INVALID",
    `${label} root must be a real directory.`
  );
  return Object.freeze({
    dev: stat.dev,
    ino: stat.ino,
    birthtimeNs: stat.birthtimeNs,
    realPath: normalizedPath(path.resolve(resolved))
  });
}

async function assertDirectoryLock(directory, lock, label) {
  let stat;
  let resolved;
  try {
    stat = await lstat(directory, { bigint: true });
    resolved = await realpath(directory);
  } catch (error) {
    fail("filesystem", "SW_AB_UPDATE_ROOT_REBOUND", `${label} root changed.`, error);
  }
  requireCondition(
    stat.isDirectory()
      && !stat.isSymbolicLink()
      && sameIdentity(lock, stat)
      && lock.realPath === normalizedPath(path.resolve(resolved)),
    "filesystem",
    "SW_AB_UPDATE_ROOT_REBOUND",
    `${label} root no longer has its preflight identity.`
  );
}

async function assertNoAliasSegments(workspace, candidate, label) {
  const relative = path.relative(workspace, candidate);
  let current = workspace;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await lstat(current, { bigint: true });
    } catch (error) {
      fail("filesystem", "SW_AB_UPDATE_PATH_UNREADABLE", `${label} cannot be inspected.`, error);
    }
    requireCondition(
      !stat.isSymbolicLink(),
      "filesystem",
      "SW_AB_UPDATE_PATH_ALIAS",
      `${label} cannot traverse a symlink or junction.`
    );
  }
}

async function lockRoots({
  workspace,
  inputPath,
  attachmentsRoot,
  privateRoot,
  artifactARoot,
  artifactBRoot
}) {
  const workspacePath = path.resolve(workspace);
  const attachmentsPath = path.resolve(attachmentsRoot);
  const privatePath = path.resolve(privateRoot);
  const artifactAPath = path.resolve(artifactARoot);
  const artifactBPath = path.resolve(artifactBRoot);
  const input = path.resolve(inputPath);
  const sidecar = `${input}.sha256`;
  const marker = path.join(privatePath, ".sw-ab-update-attempt-marker.json");
  const workspaceLock = await captureDirectoryLock(workspacePath, "workspace");
  requireCondition(
    [attachmentsPath, privatePath, artifactAPath, artifactBPath]
      .every((candidate) => pathIsWithin(workspacePath, candidate)),
    "filesystem",
    "SW_AB_UPDATE_ROOT_ESCAPES_WORKSPACE",
    "Attachments, private, and both artifact roots must be strict descendants of the workspace."
  );
  const isolatedRoots = [attachmentsPath, privatePath, artifactAPath, artifactBPath];
  for (let left = 0; left < isolatedRoots.length; left += 1) {
    for (let right = left + 1; right < isolatedRoots.length; right += 1) {
      requireCondition(
        !pathsOverlap(isolatedRoots[left], isolatedRoots[right]),
        "filesystem",
        "SW_AB_UPDATE_ROOTS_OVERLAP",
        "Attachments, private, and A/B artifact roots must be physically distinct and non-nested."
      );
    }
  }
  requireCondition(
    pathIsWithin(privatePath, input) && pathIsWithin(privatePath, sidecar),
    "filesystem",
    "SW_AB_UPDATE_INPUT_OUTSIDE_PRIVATE_ROOT",
    "Input and sidecar must be strict descendants of the private root."
  );
  await assertNoAliasSegments(workspacePath, attachmentsPath, "attachments root");
  await assertNoAliasSegments(workspacePath, privatePath, "private root");
  await assertNoAliasSegments(workspacePath, artifactAPath, "artifact A root");
  await assertNoAliasSegments(workspacePath, artifactBPath, "artifact B root");
  const attachmentsLock = await captureDirectoryLock(attachmentsPath, "attachments");
  const privateLock = await captureDirectoryLock(privatePath, "private");
  const artifactALock = await captureDirectoryLock(artifactAPath, "artifact A");
  const artifactBLock = await captureDirectoryLock(artifactBPath, "artifact B");
  await assertDirectoryLock(workspacePath, workspaceLock, "workspace");
  return Object.freeze({
    workspace: workspacePath,
    workspaceLock,
    attachmentsRoot: attachmentsPath,
    attachmentsLock,
    privateRoot: privatePath,
    privateLock,
    artifactARoot: artifactAPath,
    artifactALock,
    artifactBRoot: artifactBPath,
    artifactBLock,
    inputPath: input,
    sidecarPath: sidecar,
    markerPath: marker
  });
}

async function assertRootsLocked(roots) {
  await assertDirectoryLock(roots.workspace, roots.workspaceLock, "workspace");
  await assertDirectoryLock(roots.attachmentsRoot, roots.attachmentsLock, "attachments");
  await assertDirectoryLock(roots.privateRoot, roots.privateLock, "private");
  await assertDirectoryLock(roots.artifactARoot, roots.artifactALock, "artifact A");
  await assertDirectoryLock(roots.artifactBRoot, roots.artifactBLock, "artifact B");
}

async function readHeldFile({
  root,
  filePath,
  label,
  maximum = MAX_FILE_BYTES,
  heldFiles = null
}) {
  const absoluteRoot = path.resolve(root);
  const absoluteFile = path.resolve(filePath);
  requireCondition(
    pathIsWithin(absoluteRoot, absoluteFile),
    "filesystem",
    "SW_AB_UPDATE_FILE_ESCAPES_ROOT",
    `${label} escapes its required root.`
  );
  await assertNoAliasSegments(absoluteRoot, absoluteFile, label);
  let handle;
  try {
    handle = await open(absoluteFile, "r");
    const before = await handle.stat({ bigint: true });
    requireCondition(
      before.isFile()
        && before.ino !== 0n
        && before.nlink === 1n
        && before.size > 0n
        && before.size <= BigInt(maximum),
      "filesystem",
      "SW_AB_UPDATE_FILE_IDENTITY_INVALID",
      `${label} must be a bounded single-link regular file.`
    );
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.byteLength) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
      requireCondition(
        bytesRead > 0,
        "filesystem",
        "SW_AB_UPDATE_FILE_SHORT_READ",
        `${label} ended before its held size.`
      );
      offset += bytesRead;
    }
    const probe = Buffer.alloc(1);
    const { bytesRead: extra } = await handle.read(probe, 0, 1, offset);
    const after = await handle.stat({ bigint: true });
    const pathStat = await lstat(absoluteFile, { bigint: true });
    const resolvedRoot = normalizedPath(path.resolve(await realpath(absoluteRoot)));
    const resolvedFile = normalizedPath(path.resolve(await realpath(absoluteFile)));
    requireCondition(
      extra === 0
        && sameIdentity(before, after)
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && sameIdentity(before, pathStat)
        && pathStat.nlink === 1n
        && pathIsWithin(resolvedRoot, resolvedFile),
      "filesystem",
      "SW_AB_UPDATE_FILE_REBOUND",
      `${label} changed or escaped while being read.`
    );
    const held = Object.freeze({
      path: absoluteFile,
      bytes,
      size: bytes.byteLength,
      sha256: sha256(bytes),
      handle,
      root: absoluteRoot,
      label,
      identity: Object.freeze({
        dev: before.dev,
        ino: before.ino,
        birthtimeNs: before.birthtimeNs,
        mtimeNs: before.mtimeNs,
        ctimeNs: before.ctimeNs
      })
    });
    if (Array.isArray(heldFiles)) heldFiles.push(held);
    handle = null;
    return held;
  } catch (error) {
    if (error instanceof SwAbUpdateCandidateVerificationError) throw error;
    fail("filesystem", "SW_AB_UPDATE_FILE_READ_FAILED", `${label} could not be read.`, error);
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function revalidateHeldFile(held) {
  const current = await held.handle.stat({ bigint: true });
  const pathStat = await lstat(held.path, { bigint: true });
  const resolvedRoot = normalizedPath(path.resolve(await realpath(held.root)));
  const resolvedFile = normalizedPath(path.resolve(await realpath(held.path)));
  requireCondition(
    current.isFile()
      && current.nlink === 1n
      && current.size === BigInt(held.size)
      && current.dev === held.identity.dev
      && current.ino === held.identity.ino
      && current.birthtimeNs === held.identity.birthtimeNs
      && current.mtimeNs === held.identity.mtimeNs
      && current.ctimeNs === held.identity.ctimeNs
      && sameIdentity(current, pathStat)
      && pathStat.nlink === 1n
      && pathIsWithin(resolvedRoot, resolvedFile),
    "filesystem",
    "SW_AB_UPDATE_HELD_FILE_REBOUND",
    `${held.label} changed before terminal verification.`
  );
  const bytes = Buffer.alloc(held.size);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const { bytesRead } = await held.handle.read(bytes, offset, bytes.byteLength - offset, offset);
    requireCondition(
      bytesRead > 0,
      "filesystem",
      "SW_AB_UPDATE_HELD_FILE_SHORT_READ",
      `${held.label} could not be re-read through its held handle.`
    );
    offset += bytesRead;
  }
  const probe = Buffer.alloc(1);
  const { bytesRead: extra } = await held.handle.read(probe, 0, 1, offset);
  requireCondition(
    extra === 0 && sha256(bytes) === held.sha256,
    "filesystem",
    "SW_AB_UPDATE_HELD_FILE_BYTES_CHANGED",
    `${held.label} bytes changed before terminal verification.`
  );
}

async function closeHeldFiles(heldFiles) {
  await Promise.allSettled(heldFiles.map((held) => held.handle.close()));
}

async function enumerateTree(root, label) {
  const results = [];
  const visit = async (directory, prefix) => {
    let names;
    try {
      names = await readdir(directory);
    } catch (error) {
      fail("filesystem", "SW_AB_UPDATE_TREE_UNREADABLE", `${label} cannot be enumerated.`, error);
    }
    names.sort();
    for (const name of names) {
      const absolute = path.join(directory, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = await lstat(absolute, { bigint: true });
      requireCondition(
        !stat.isSymbolicLink(),
        "filesystem",
        "SW_AB_UPDATE_TREE_ALIAS",
        `${label} contains a symlink or junction.`
      );
      if (stat.isDirectory()) {
        await visit(absolute, relative);
      } else {
        requireCondition(
          stat.isFile() && stat.nlink === 1n,
          "filesystem",
          "SW_AB_UPDATE_TREE_NON_REGULAR",
          `${label} must contain only real directories and single-link regular files.`
        );
        results.push(relative.replaceAll("\\", "/"));
      }
    }
  };
  await visit(path.resolve(root), "");
  return Object.freeze(results);
}

function canonicalWorkspaceRelativePath(workspace, candidate, label) {
  const absoluteWorkspace = path.resolve(workspace);
  const absoluteCandidate = path.resolve(candidate);
  requireCondition(
    pathIsWithin(absoluteWorkspace, absoluteCandidate),
    "filesystem",
    "SW_AB_UPDATE_CANONICAL_PATH_OUTSIDE_WORKSPACE",
    `${label} must be inside the workspace.`
  );
  const relative = path.relative(absoluteWorkspace, absoluteCandidate).replaceAll("\\", "/");
  requireCondition(
    relative.length > 0
      && !relative.split("/").some((segment) => segment === "." || segment === ".." || segment === "")
      && path.resolve(absoluteWorkspace, ...relative.split("/")) === absoluteCandidate,
    "filesystem",
    "SW_AB_UPDATE_CANONICAL_PATH_INVALID",
    `${label} is not a canonical workspace-relative path.`
  );
  return relative;
}

export function computeSwAbUpdateCandidateArtifactIdentityDigest(artifact) {
  const projection = structuredClone(artifact);
  delete projection.artifactIdentityDigest;
  return sha256(canonicalJson(projection));
}

async function validateArtifactRoot({
  label,
  artifact,
  root,
  rootLock,
  workspace,
  heldFiles
}) {
  const canonicalRootPath = canonicalWorkspaceRelativePath(workspace, root, `Artifact ${label} root`);
  const rootRealPath = normalizedPath(path.resolve(await realpath(root)));
  requireCondition(
    artifact.artifactRoot.path === canonicalRootPath
      && artifact.artifactRoot.dev === rootLock.dev.toString(10)
      && artifact.artifactRoot.ino === rootLock.ino.toString(10)
      && artifact.artifactRoot.birthtimeNs === rootLock.birthtimeNs.toString(10)
      && artifact.artifactRoot.realPathDigest === sha256(rootRealPath)
      && artifact.artifactRoot.immutableSnapshot === true,
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_ROOT_IDENTITY_INVALID",
    `Artifact ${label} root identity is not bound to the held physical root.`
  );
  const expectedPaths = artifact.files.map((entry) => entry.path);
  requireCondition(
    exactJson(expectedPaths, [...expectedPaths].sort())
      && new Set(expectedPaths).size === expectedPaths.length
      && artifact.files.every((entry) =>
        entry.path === path.posix.normalize(entry.path)
          && !entry.path.startsWith("/")
          && !entry.path.split("/").some((segment) => segment === "." || segment === ".." || segment === "")
      ),
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_FILE_PATHS_INVALID",
    `Artifact ${label} file paths must be unique, sorted, canonical, and relative.`
  );
  const treeBefore = await enumerateTree(root, `Artifact ${label} tree`);
  requireCondition(
    exactJson(treeBefore, expectedPaths),
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_TREE_NOT_CLOSED",
    `Artifact ${label} root must contain exactly its bound file inventory.`
  );
  for (const entry of artifact.files) {
    const expectedUrlPath = entry.path === "index.html" ? "/" : `/${entry.path}`;
    requireCondition(
      entry.urlPath === expectedUrlPath,
      "artifact",
      "SW_AB_UPDATE_ARTIFACT_URL_PATH_INVALID",
      `Artifact ${label} URL mapping is not canonical for ${entry.path}.`
    );
    const held = await readHeldFile({
      root,
      filePath: path.resolve(root, entry.path),
      label: `Artifact ${label} file ${entry.path}`,
      heldFiles
    });
    requireCondition(
      held.size === entry.size && held.sha256 === entry.sha256,
      "artifact",
      "SW_AB_UPDATE_ARTIFACT_FILE_MISMATCH",
      `Artifact ${label} file ${entry.path} does not match its bound bytes.`
    );
  }
  const minimalFiles = ["index.html", "manifest.webmanifest", "sw.js"];
  requireCondition(
    minimalFiles.every((required) => expectedPaths.includes(required)),
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_CORE_FILE_MISSING",
    `Artifact ${label} must include index.html, manifest.webmanifest, and sw.js.`
  );
  const canonicalArtifactEntries = artifact.files.map(({ path: filePath, size, sha256: digest }) => ({
    path: filePath,
    size,
    sha256: digest
  }));
  const artifactSetDigest = sha256(canonicalJson(canonicalArtifactEntries));
  const inventoryDigest = sha256(canonicalJson(artifact.files));
  const swEntry = artifact.files.find((entry) => entry.path === "sw.js");
  requireCondition(
    artifact.artifactRoot.fileCount === artifact.files.length
      && artifact.artifactRoot.inventoryDigest === inventoryDigest
      && artifact.artifactSetDigest === artifactSetDigest
      && artifact.serviceWorkerSha256 === swEntry.sha256
      && artifact.artifactIdentityDigest
        === computeSwAbUpdateCandidateArtifactIdentityDigest(artifact),
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_IDENTITY_INVALID",
    `Artifact ${label} inventory, Service Worker, or identity digest is invalid.`
  );
  const treeAfter = await enumerateTree(root, `Artifact ${label} tree final`);
  requireCondition(
    exactJson(treeAfter, treeBefore),
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_TREE_CHANGED",
    `Artifact ${label} tree changed during verification.`
  );
  await assertDirectoryLock(root, rootLock, `artifact ${label}`);
  return Object.freeze({ artifactSetDigest, inventoryDigest });
}

function attachmentProjection(attachment) {
  const copy = structuredClone(attachment);
  delete copy.digest;
  return copy;
}

export function computeSwAbUpdateCandidateAttachmentDigest(attachment) {
  return sha256(canonicalJson(attachmentProjection(attachment)));
}

function parseAttachmentEnvelope(file, attachment) {
  const envelope = parseSwAbUpdateCandidateJsonBytes(
    file.bytes,
    `Attachment envelope ${attachment.path}`
  );
  requireCondition(
    exactKeys(envelope, [
      "schemaVersion",
      "attachmentType",
      "role",
      "browserProject",
      "runId",
      "attemptId",
      "payload",
      "payloadDigest"
    ])
      && envelope.schemaVersion === 1
      && envelope.attachmentType === "sw_ab_update_candidate_attachment_v1"
      && envelope.role === attachment.role
      && envelope.browserProject === attachment.browserProject
      && envelope.runId === attachment.runId
      && envelope.attemptId === attachment.attemptId
      && isRecord(envelope.payload)
      && envelope.payloadDigest === sha256(canonicalJson(envelope.payload)),
    "attachment",
    "SW_AB_UPDATE_ATTACHMENT_ENVELOPE_INVALID",
    `Attachment ${attachment.path} envelope or payload digest is invalid.`
  );
  return Object.freeze(envelope);
}

function decodeCanonicalBase64(value, label) {
  requireCondition(
    typeof value === "string" && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/u.test(value),
    "attachment",
    "SW_AB_UPDATE_BASE64_INVALID",
    `${label} must use canonical non-empty base64.`
  );
  const bytes = Buffer.from(value, "base64");
  requireCondition(
    bytes.toString("base64") === value,
    "attachment",
    "SW_AB_UPDATE_BASE64_NONCANONICAL",
    `${label} is not canonical base64.`
  );
  return bytes;
}

function browserReceiptProjection(receipt) {
  const copy = structuredClone(receipt);
  delete copy.receiptDigest;
  return copy;
}

export function computeSwAbUpdateCandidateBrowserReceiptDigest(receipt) {
  return sha256(canonicalJson(browserReceiptProjection(receipt)));
}

function evidenceProjection(evidence) {
  const copy = structuredClone(evidence);
  delete copy.evidenceDigest;
  return copy;
}

export function computeSwAbUpdateCandidateEvidenceDigest(evidence) {
  return sha256(canonicalJson(evidenceProjection(evidence)));
}

export function computeSwAbUpdateCandidateAttemptMarkerDigest(marker) {
  const copy = structuredClone(marker);
  delete copy.markerDigest;
  return sha256(canonicalJson(copy));
}

export const SW_AB_UPDATE_CANDIDATE_DEPLOYMENT_EVENT_IDS = Object.freeze([
  "attempt_marker_created",
  "artifact_a_host_stable",
  "edge_two_a_clients_ready",
  "chrome_two_a_clients_ready",
  "artifact_b_provider_switch_started",
  "artifact_b_host_stable",
  "both_browsers_b_installing_observed",
  "both_browsers_b_waiting_observed",
  "network_interrupted_during_update",
  "both_browsers_b_activated_and_claimed",
  "both_old_a_writes_rejected",
  "all_pages_and_initial_processes_closed",
  "both_profiles_reopened_offline",
  "both_b_offline_routes_verified"
]);

export function computeSwAbUpdateCandidateDeploymentLedgerDigest(ledger) {
  const copy = structuredClone(ledger);
  delete copy.ledgerDigest;
  return sha256(canonicalJson(copy));
}

export function computeSwAbUpdateCandidateClientChallengeResponseDigest({
  evidence,
  projectName,
  phase,
  client
}) {
  return sha256(canonicalJson({
    namespace: "hakimi-sw-ab-client-challenge-v1",
    runId: evidence.runId,
    attemptId: evidence.attemptId,
    projectName,
    phase,
    slot: client.slot,
    documentTag: client.documentTag,
    controllerTag: client.controllerTag,
    clientId: client.clientId,
    cdpTargetId: client.cdpTargetId,
    challengeNonce: client.challengeNonce
  }));
}

export function computeSwAbUpdateCandidateProviderDeploymentDigest({ evidence, label }) {
  const artifact = evidence.artifacts[label];
  return sha256(canonicalJson({
    namespace: "hakimi-sw-ab-provider-deployment-binding-v1",
    label,
    runId: evidence.runId,
    attemptId: evidence.attemptId,
    origin: evidence.deploymentCandidate.canonicalHttpsOrigin,
    platformId: evidence.deploymentCandidate.provider.platformId,
    accountBindingDigest: evidence.deploymentCandidate.provider.accountBindingDigest,
    projectBindingDigest: evidence.deploymentCandidate.provider.projectBindingDigest,
    artifactIdentityDigest: artifact.artifactIdentityDigest,
    artifactSetDigest: artifact.artifactSetDigest,
    remoteArtifactCaptureDigest: artifact.remoteArtifactCapture.digest
  }));
}

function attachmentReference(attachment) {
  return Object.freeze({
    role: attachment.role,
    path: attachment.path,
    size: attachment.size,
    sha256: attachment.sha256,
    digest: attachment.digest
  });
}

function artifactReference(artifact) {
  return Object.freeze({
    label: artifact.label,
    releaseEvidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    artifactIdentityDigest: artifact.artifactIdentityDigest,
    artifactSetDigest: artifact.artifactSetDigest,
    artifactRootInventoryDigest: artifact.artifactRoot.inventoryDigest,
    identityLockDigest: artifact.identityLock.digest,
    releaseEvidenceDigest: artifact.releaseEvidence.digest,
    remoteArtifactCaptureDigest: artifact.remoteArtifactCapture.digest,
    serviceWorkerSha256: artifact.serviceWorkerSha256
  });
}

function compositionArtifactBinding(artifact) {
  return Object.freeze({
    label: artifact.label,
    releaseEvidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    serviceWorkerSha256: artifact.serviceWorkerSha256,
    artifactSetDigest: artifact.artifactSetDigest
  });
}

function observedEventAt(events, eventId) {
  return events.find((event) => event.eventId === eventId)?.observedAt;
}

function buildSwAbUpdateCandidateCompositionProjection(evidence) {
  return immutableJsonSnapshot({
    projectionType: "sw_ab_update_candidate_composition_projection_v1",
    runId: evidence.runId,
    attemptId: evidence.attemptId,
    canonicalHttpsOrigin: evidence.deploymentCandidate.canonicalHttpsOrigin,
    releaseIdentity: evidence.releaseIdentity,
    capabilities: evidence.capabilities,
    artifactBindings: {
      A: compositionArtifactBinding(evidence.artifacts.A),
      B: compositionArtifactBinding(evidence.artifacts.B)
    },
    deploymentChronology: {
      edgeTwoAClientsReadyAt: observedEventAt(
        evidence.deploymentEventLedger.events,
        "edge_two_a_clients_ready"
      ),
      chromeTwoAClientsReadyAt: observedEventAt(
        evidence.deploymentEventLedger.events,
        "chrome_two_a_clients_ready"
      ),
      artifactBProviderSwitchStartedAt: observedEventAt(
        evidence.deploymentEventLedger.events,
        "artifact_b_provider_switch_started"
      ),
      bothBrowsersBActivatedAndClaimedAt: observedEventAt(
        evidence.deploymentEventLedger.events,
        "both_browsers_b_activated_and_claimed"
      ),
      bothOldAWritesRejectedAt: observedEventAt(
        evidence.deploymentEventLedger.events,
        "both_old_a_writes_rejected"
      )
    },
    browserReceipts: evidence.browserReceipts.map((receipt) => ({
      projectName: receipt.projectName,
      capturedAt: receipt.capturedAt,
      initialAClients: receipt.clientProofs.initialAClients,
      postClaimClients: receipt.clientProofs.postClaimClients,
      timeline: {
        twoArtifactAClientsControlledAt: observedEventAt(
          receipt.timeline,
          "two_artifact_a_clients_controlled"
        ),
        artifactBActivationAndClaimObservedAt: observedEventAt(
          receipt.timeline,
          "artifact_b_activation_and_claim_observed"
        ),
        oneADocumentReloadedToBAt: observedEventAt(
          receipt.timeline,
          "one_a_document_reloaded_to_b"
        ),
        staleAProductionWriteRejectedAt: observedEventAt(
          receipt.timeline,
          "stale_a_production_write_rejected"
        )
      }
    })),
    capturedAt: evidence.capturedAt,
    evidenceDigest: evidence.evidenceDigest
  });
}

function expectedAttachmentTuples() {
  return Object.freeze([
    ...SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES.map((role) =>
      Object.freeze({ browserProject: null, role })
    ),
    ...SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS.flatMap((browserProject) =>
      SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES.map((role) =>
        Object.freeze({ browserProject, role })
      )
    )
  ]);
}

function validateCanonicalOrigin(candidate) {
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    fail("semantic", "SW_AB_UPDATE_ORIGIN_INVALID", "Candidate origin is not a URL.", error);
  }
  const hostname = parsed.hostname;
  requireCondition(
    parsed.protocol === "https:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.port === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.origin === candidate
      && hostname === hostname.toLowerCase()
      && hostname.includes(".")
      && isIP(hostname) === 0
      && !["localhost", "invalid", "test", "example"].includes(hostname.split(".").at(-1)),
    "semantic",
    "SW_AB_UPDATE_ORIGIN_NONCANONICAL",
    "Candidate origin must be a canonical future public-DNS HTTPS origin without credentials, port, path, query, or fragment."
  );
  return parsed;
}

export function validateSwAbUpdateCandidatePolicy(policy) {
  requireCondition(
    isRecord(policy)
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.sw-ab-update-candidate/v1"
      && policy.evidenceClass === "untrusted_future_https_sw_ab_update_candidate"
      && policy.formalReleaseEvidenceReceipt === false
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(policy.requiredBrowserProjects, SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS)
      && exactJson(policy.artifactLabels, ["A", "B"])
      && exactJson(policy.executionShape, {
        deploymentMode: "one_global_a_to_b_switch_both_browsers_already_on_a",
        clientsPerBrowser: 2,
        initialDocumentTag: "A",
        initialControllerTag: "A",
        postClaimControllerTag: "B",
        retainedOldDocumentTag: "A",
        reloadedDocumentTag: "B",
        controllerChangeCountPerClient: 1,
        offlineBeforeFirstReopenedNavigation: true,
        uncachedCanaryMustFail: true,
        remoteBodiesMustBeRetained: true,
        offlineResponseBodiesMustBeRetained: true,
        offlineBundleReplayResistanceVerified: false,
        staleWriteRuntimeFactsMustBeRetained: true,
        remoteResponseStatus: 200,
        remoteRedirectCount: 0,
        remoteContentEncoding: "identity",
        intervalNoMutationVerified: false,
        abaResistance: "absent_schema13"
      })
      && exactJson(policy.requiredTimeline, SW_AB_UPDATE_CANDIDATE_TIMELINE)
      && exactJson(policy.requiredOfflineRoutes, [
        { routeId: "offline-root", path: "/" },
        { routeId: "offline-deep-link", path: "/help" }
      ])
      && exactJson(
        policy.requiredSharedAttachmentRoles,
        SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES
      )
      && exactJson(
        policy.requiredPerBrowserAttachmentRoles,
        SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES
      )
      && exactJson(policy.requiredGovernanceBindings, SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS)
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_candidate",
        status: "not_admitted",
        executionAdmission: "closed_missing_https_origin",
        strictGatePassed: false,
        cliExitCode: 1
      })
      && exactJson(policy.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY)
      && exactJson(policy.executionAdmission, {
        status: "closed_missing_https_origin",
        canonicalHttpsOriginConfigured: false,
        providerBindingTrusted: false,
        hostBindingTrusted: false,
        artifactADeploymentObserved: false,
        artifactBDeploymentObserved: false,
        realBrowserExecutionObserved: false
      }),
    "policy",
    "SW_AB_UPDATE_POLICY_DRIFTED",
    "SW A to B candidate policy drifted from the exact closed v1 contract."
  );
  return policy;
}

async function loadGovernanceFiles(roots, heldFiles) {
  const result = new Map();
  for (const binding of SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS) {
    const held = await readHeldFile({
      root: roots.workspace,
      filePath: path.resolve(roots.workspace, binding.path),
      label: `Governance binding ${binding.role}`,
      heldFiles
    });
    const document = parseSwAbUpdateCandidateJsonBytes(held.bytes, binding.role);
    result.set(binding.role, Object.freeze({ binding, held, document }));
  }
  validateSwAbUpdateCandidatePolicy(result.get("sw-ab-update-policy").document);
  const decisions = result.get("release-decisions").document;
  requireCondition(
    exactJson(decisions.defaultRelease, {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      schema16PromotionAuthorized: false
    }),
    "policy",
    "SW_AB_UPDATE_DEFAULT_RELEASE_DRIFTED",
    "Release decisions no longer preserve the exact default v13 identity."
  );
  const schema = result.get("sw-ab-update-schema").document;
  let schemaValidator;
  let releaseEvidenceSchemaValidator;
  try {
    schemaValidator = compileSwAbUpdateCandidateSchema(schema);
    releaseEvidenceSchemaValidator = compileReleaseEvidenceSchema(
      result.get("release-evidence-schema").document
    );
  } catch (error) {
    fail(
      "schema",
      "SW_AB_UPDATE_SCHEMA_INVALID",
      "Candidate or Release Evidence Schema did not compile.",
      error
    );
  }
  return Object.freeze({ result, schemaValidator, releaseEvidenceSchemaValidator });
}

function validateGovernanceBindings(evidence, governance) {
  requireCondition(
    exactJson(
      evidence.governanceBindings.map(({ role, path }) => ({ role, path })),
      SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS
    ),
    "binding",
    "SW_AB_UPDATE_GOVERNANCE_BINDING_SET_INVALID",
    "Governance binding roles and paths must match the exact candidate set."
  );
  for (const binding of evidence.governanceBindings) {
    const current = governance.result.get(binding.role);
    requireCondition(
      current
        && binding.path === current.binding.path
        && binding.size === current.held.size
        && binding.sha256 === current.held.sha256
        && binding.canonicalSha256 === sha256(canonicalJson(current.document)),
      "binding",
      "SW_AB_UPDATE_GOVERNANCE_BINDING_MISMATCH",
      `Governance binding ${binding.role} does not match current bytes.`
    );
  }
}

function validateAttemptMarker(evidence, marker, roots) {
  requireCondition(
    exactJson(marker, evidence.attemptMarker)
      && marker.markerType === "sw_ab_update_candidate_attempt_marker_v1"
      && marker.trustClass === "untrusted_candidate"
      && marker.status === "not_admitted"
      && marker.executionAdmission === "closed_missing_https_origin"
      && marker.runId === evidence.runId
      && marker.attemptId === evidence.attemptId
      && marker.createdFresh === true
      && marker.preexistingEntryCount === 0
      && marker.privateRootPath
        === canonicalWorkspaceRelativePath(roots.workspace, roots.privateRoot, "Private root")
      && marker.attachmentsRootPath
        === canonicalWorkspaceRelativePath(roots.workspace, roots.attachmentsRoot, "Attachments root")
      && marker.artifactARootPath
        === canonicalWorkspaceRelativePath(roots.workspace, roots.artifactARoot, "Artifact A root")
      && marker.artifactBRootPath
        === canonicalWorkspaceRelativePath(roots.workspace, roots.artifactBRoot, "Artifact B root")
      && marker.markerDigest === computeSwAbUpdateCandidateAttemptMarkerDigest(marker),
    "binding",
    "SW_AB_UPDATE_ATTEMPT_MARKER_INVALID",
    "Attempt marker does not bind the fresh run, attempt, and exact isolated roots."
  );
  parseCanonicalTimestamp(marker.createdAt, "Attempt marker createdAt");
}

function validateDeploymentEventLedger(evidence) {
  const ledger = evidence.deploymentEventLedger;
  requireCondition(
    ledger.runId === evidence.runId
      && ledger.attemptId === evidence.attemptId
      && ledger.deploymentMode
        === "one_global_a_to_b_switch_both_browsers_already_on_a"
      && exactJson(ledger.events.map((event) => event.eventId),
        SW_AB_UPDATE_CANDIDATE_DEPLOYMENT_EVENT_IDS)
      && ledger.ledgerDigest === computeSwAbUpdateCandidateDeploymentLedgerDigest(ledger)
      && evidence.deploymentCandidate.deploymentEventLedgerDigest === ledger.ledgerDigest,
    "semantic",
    "SW_AB_UPDATE_DEPLOYMENT_LEDGER_INVALID",
    "The one shared A to B provider switch ledger is missing, reordered, or unbound."
  );
  let previous = Number.NEGATIVE_INFINITY;
  const timestamps = [];
  for (let index = 0; index < ledger.events.length; index += 1) {
    const event = ledger.events[index];
    const timestamp = parseCanonicalTimestamp(event.observedAt, `Deployment event ${index + 1}`);
    requireCondition(
      event.sequence === index + 1 && timestamp > previous,
      "semantic",
      "SW_AB_UPDATE_DEPLOYMENT_LEDGER_ORDER_INVALID",
      "Deployment event ledger sequence or timestamp order is invalid."
    );
    previous = timestamp;
    timestamps.push(timestamp);
  }
  return Object.freeze(timestamps);
}

function validateDeploymentReceiptProjection(evidence, envelopesByTuple, ledgerTimes) {
  const receiptTimes = (receipt) => new Map(receipt.timeline.map((event) => [
    event.eventId,
    parseCanonicalTimestamp(event.observedAt, `${receipt.projectName} ${event.eventId}`)
  ]));
  const edgeTimes = receiptTimes(evidence.browserReceipts[0]);
  const chromeTimes = receiptTimes(evidence.browserReceipts[1]);
  const both = (eventId, reducer) => reducer(
    edgeTimes.get(eventId),
    chromeTimes.get(eventId)
  );
  const barrier = (previousEventId, nextEventId) =>
    both(previousEventId, Math.max) < both(nextEventId, Math.min);
  const artifactACapture = envelopesByTuple
    .get("shared\0artifact-a-remote-artifact-capture")?.payload;
  const artifactBCapture = envelopesByTuple
    .get("shared\0artifact-b-remote-artifact-capture")?.payload;
  requireCondition(
    ledgerTimes[0] === parseCanonicalTimestamp(evidence.attemptMarker.createdAt, "Attempt marker")
      && ledgerTimes[1] === parseCanonicalTimestamp(
        artifactACapture?.capturedAt,
        "Artifact A remote capture"
      )
      && ledgerTimes[1] <= both("fresh_profile_started_online", Math.min)
      && ledgerTimes[2] === edgeTimes.get("two_artifact_a_clients_controlled")
      && ledgerTimes[3] === chromeTimes.get("two_artifact_a_clients_controlled")
      && ledgerTimes[4] > Math.max(ledgerTimes[2], ledgerTimes[3])
      && ledgerTimes[4] < both("artifact_b_update_requested", Math.min)
      && ledgerTimes[5] === parseCanonicalTimestamp(
        artifactBCapture?.capturedAt,
        "Artifact B remote capture"
      )
      && ledgerTimes[5] > ledgerTimes[4]
      && ledgerTimes[5] > both("artifact_b_update_requested", Math.max)
      && ledgerTimes[5] < both("artifact_b_installing_observed", Math.min)
      && barrier("artifact_b_update_requested", "artifact_b_installing_observed")
      && barrier("artifact_b_installing_observed", "artifact_b_waiting_observed")
      && barrier("artifact_b_waiting_observed", "network_interrupted_during_update")
      && barrier("network_interrupted_during_update", "artifact_b_activation_and_claim_observed")
      && barrier("artifact_b_activation_and_claim_observed", "one_a_document_reloaded_to_b")
      && barrier("one_a_document_reloaded_to_b", "stale_a_production_write_rejected")
      && barrier("stale_a_production_write_rejected", "all_pages_closed")
      && barrier("all_pages_closed", "browser_process_closed")
      && barrier("browser_process_closed", "persistent_profile_process_reopened_offline")
      && barrier("persistent_profile_process_reopened_offline", "offline_root_opened")
      && barrier("offline_root_opened", "offline_deep_link_opened")
      && barrier("offline_deep_link_opened", "final_v13_snapshot_recorded")
      && ledgerTimes[6] === both("artifact_b_installing_observed", Math.max)
      && ledgerTimes[7] === both("artifact_b_waiting_observed", Math.max)
      && ledgerTimes[8] === both("network_interrupted_during_update", Math.max)
      && ledgerTimes[9] === both("artifact_b_activation_and_claim_observed", Math.max)
      && ledgerTimes[10] === both("stale_a_production_write_rejected", Math.max)
      && ledgerTimes[11] === both("browser_process_closed", Math.max)
      && ledgerTimes[12] === both("persistent_profile_process_reopened_offline", Math.max)
      && ledgerTimes[13] === both("offline_deep_link_opened", Math.max),
    "semantic",
    "SW_AB_UPDATE_DEPLOYMENT_RECEIPT_PROJECTION_INVALID",
    "Shared deployment events are not an acyclic temporal projection of both browser receipts and A/B remote captures."
  );
}

function validateArtifactDistinctness(evidence, attachmentsByTuple) {
  const artifactA = evidence.artifacts.A;
  const artifactB = evidence.artifacts.B;
  requireCondition(
    artifactA.label === "A"
      && artifactB.label === "B"
      && exactJson(artifactA.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(artifactB.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    "semantic",
    "SW_AB_UPDATE_ARTIFACT_LABEL_OR_RELEASE_INVALID",
    "Artifacts A and B must both bind the fixed default v13 identity under distinct labels."
  );
  for (const key of [
    "releaseEvidenceId",
    "buildVersion",
    "artifactIdentityDigest",
    "artifactSetDigest",
    "serviceWorkerSha256"
  ]) {
    requireCondition(
      artifactA[key] !== artifactB[key],
      "semantic",
      "SW_AB_UPDATE_ARTIFACTS_NOT_DISTINCT",
      `Artifacts A and B must have distinct ${key}.`
    );
  }
  for (const [label, artifact] of [["A", artifactA], ["B", artifactB]]) {
    const prefix = label.toLowerCase();
    const lock = attachmentsByTuple.get(`shared\0artifact-${prefix}-identity-lock`);
    const release = attachmentsByTuple.get(`shared\0artifact-${prefix}-release-evidence`);
    const remote = attachmentsByTuple.get(`shared\0artifact-${prefix}-remote-artifact-capture`);
    requireCondition(
      lock
        && release
        && remote
        && exactJson(artifact.identityLock, attachmentReference(lock))
        && exactJson(artifact.releaseEvidence, attachmentReference(release))
        && exactJson(artifact.remoteArtifactCapture, attachmentReference(remote)),
      "binding",
      "SW_AB_UPDATE_ARTIFACT_ATTACHMENT_BINDING_MISMATCH",
      `Artifact ${label} does not bind its exact identity lock and Release Evidence attachments.`
    );
  }
  requireCondition(
    artifactA.identityLock.path !== artifactB.identityLock.path
      && artifactA.releaseEvidence.path !== artifactB.releaseEvidence.path
      && artifactA.artifactRoot.path !== artifactB.artifactRoot.path
      && artifactA.artifactRoot.ino !== artifactB.artifactRoot.ino
      && artifactA.artifactRoot.realPathDigest !== artifactB.artifactRoot.realPathDigest
      && artifactA.identityLock.sha256 !== artifactB.identityLock.sha256
      && artifactA.releaseEvidence.sha256 !== artifactB.releaseEvidence.sha256
      && artifactA.identityLock.digest !== artifactB.identityLock.digest
      && artifactA.releaseEvidence.digest !== artifactB.releaseEvidence.digest,
    "semantic",
    "SW_AB_UPDATE_ARTIFACT_LOCK_OR_EVIDENCE_ALIAS",
    "Artifacts A and B cannot alias lock or Release Evidence bytes, paths, or digests."
  );
}

function assertDefaultV13Descriptor(descriptor, label) {
  requireCondition(
    isRecord(descriptor)
      && descriptor.dbGeneration === "legacy-v13"
      && descriptor.targetSchema === 13
      && descriptor.migrationId === null,
    "artifact",
    "SW_AB_UPDATE_ARTIFACT_DESCRIPTOR_INVALID",
    `${label} does not preserve legacy-v13 / Schema 13 / migrationId null.`
  );
}

function validateSharedArtifactPayloads(
  evidence,
  envelopesByTuple,
  releaseEvidenceSchemaValidator,
  governance
) {
  const releaseDecisions = governance.result.get("release-decisions").document;
  const governanceByPath = new Map([...governance.result.values()].map((entry) => [
    entry.binding.path,
    entry
  ]));
  const expectedPolicyFiles = RELEASE_POLICY_PATHS.map((policyPath) => ({
    path: policyPath,
    sha256: governanceByPath.get(policyPath)?.held.sha256
  }));
  const policyReceiptCommands = releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands;
  const policyReceiptIds = Object.keys(policyReceiptCommands).sort();
  for (const label of ["A", "B"]) {
    const lower = label.toLowerCase();
    const artifact = evidence.artifacts[label];
    const lockEnvelope = envelopesByTuple.get(`shared\0artifact-${lower}-identity-lock`);
    const releaseEnvelope = envelopesByTuple.get(`shared\0artifact-${lower}-release-evidence`);
    const remoteEnvelope = envelopesByTuple.get(`shared\0artifact-${lower}-remote-artifact-capture`);
    requireCondition(
      exactKeys(lockEnvelope?.payload, ["document"])
        && exactKeys(releaseEnvelope?.payload, ["document"])
        && isRecord(lockEnvelope.payload.document)
        && isRecord(releaseEnvelope.payload.document),
      "attachment",
      "SW_AB_UPDATE_ARTIFACT_DOCUMENT_ATTACHMENT_INVALID",
      `Artifact ${label} lock or Release Evidence attachment payload is invalid.`
    );
    const lock = lockEnvelope.payload.document;
    const unsignedLock = structuredClone(lock);
    delete unsignedLock.lockDigest;
    assertDefaultV13Descriptor(lock.descriptor, `Artifact ${label} identity lock`);
    requireCondition(
      lock.schemaVersion === 1
        && lock.recordType === "release_artifact_identity_lock"
        && lock.channel === "default-v13"
        && lock.evidenceId === artifact.releaseEvidenceId
        && lock.buildVersion === artifact.buildVersion
        && lock.artifactRoot === artifact.artifactRoot.path
        && lock.artifactSetDigest === artifact.artifactSetDigest
        && lock.fileCount === artifact.files.length
        && exactJson(lock.files, artifact.files.map(({ path: filePath, size, sha256: digest }) => ({
          path: filePath,
          size,
          sha256: digest
        })))
        && lock.lockDigest === sha256(canonicalJson(unsignedLock)),
      "attachment",
      "SW_AB_UPDATE_ARTIFACT_LOCK_DOCUMENT_INVALID",
      `Artifact ${label} identity lock bytes do not bind the immutable root.`
    );
    const release = releaseEnvelope.payload.document;
    try {
      releaseEvidenceSchemaValidator.assert(release);
    } catch (error) {
      fail(
        "attachment",
        "SW_AB_UPDATE_RELEASE_EVIDENCE_SCHEMA_INVALID",
        `Artifact ${label} Release Evidence does not satisfy the checked formal Schema.`,
        error
      );
    }
    assertDefaultV13Descriptor(release.release?.descriptor, `Artifact ${label} Release Evidence`);
    const releaseReceiptIds = release.testReceipts.map((receipt) => receipt.id);
    const receiptCommandsMatch = release.testReceipts.every((receipt) =>
      receipt.evidenceId === release.evidenceId
        && receipt.status === "passed"
        && receipt.exitCode === 0
        && exactJson(receipt.command, policyReceiptCommands[receipt.id])
        && !receipt.id.includes("sw-ab")
        && !receipt.command.some((token) => token.includes("sw-ab-update"))
        && (isReleaseBrowserReceiptId(receipt.id)
          ? receipt.browserResultSummary?.summary?.receiptId === receipt.id
          : receipt.browserResultSummary === null)
    );
    const lockedFile = (filePath) => lock.files.find((entry) => entry.path === filePath);
    requireCondition(
      release.schemaVersion === 1
        && release.evidenceType === "engineering_release_evidence"
        && release.evidenceId === artifact.releaseEvidenceId
        && release.evidenceId === computeEvidenceId({
          gitCommit: release.source.commit,
          sourceTreeDigest: release.source.sourceTreeDigest,
          lockfileDigest: release.source.packageLockSha256,
          channel: release.release.channel
        })
        && release.release?.channel === "default-v13"
        && release.release?.buildVersion === artifact.buildVersion
        && release.release?.manifestDigest === lock.manifestDigest
        && release.release?.builtEvidenceId === release.evidenceId
        && release.release?.evidenceIdBound === true
        && exactJson(release.release?.requiredReceiptIds, policyReceiptIds)
        && exactJson(releaseReceiptIds, policyReceiptIds)
        && receiptCommandsMatch
        && exactJson(release.policyFiles, expectedPolicyFiles)
        && release.artifacts?.root === artifact.artifactRoot.path
        && release.artifacts?.count === artifact.files.length
        && release.artifacts?.artifactSetDigest === artifact.artifactSetDigest
        && exactJson(release.artifacts?.files, lock.files)
        && exactJson(release.artifacts?.components, {
          applicationShell: lockedFile("index.html"),
          pwaManifest: lockedFile("manifest.webmanifest"),
          serviceWorker: lockedFile("sw.js"),
          hostingHeaders: lockedFile("_headers")
        })
        && release.artifacts?.identityLock?.path === artifact.identityLock.path
        && release.artifacts?.identityLock?.sha256 === artifact.identityLock.sha256
        && release.artifacts?.identityLock?.lockDigest === lock.lockDigest
        && release.artifacts?.identityLock?.artifactSetDigest === artifact.artifactSetDigest
        && release.artifacts?.identityLock?.verified === true
        && release.source?.dirty === false
        && release.source?.untrackedSourceFileCount === 0
        && exactJson(release.gates, {
          sourceTreeClean: true,
          evidenceIdBound: true,
          defaultReleaseDescriptorMatched: true,
          requiredReceiptsPresent: true,
          allRecordedReceiptsPassed: true,
          policyReceiptSetMatched: true,
          recordedReceiptSetMatched: true,
          policyReceiptCommandsMatched: true,
          browserResultSummariesMatched: true,
          artifactIdentityStable: true,
          requiredArtifactComponentsPresent: true,
          engineeringGatePassed: true,
          releaseHistoryOwnerConfirmed: false,
          hostingSecurityVerified: releaseDecisions.hosting.securityHeadersVerified,
          publicDeploymentAuthorized: releaseDecisions.hosting.publicDeploymentAuthorized,
          licenseOwnerSelectionRecorded: releaseDecisions.licensing.ownerFinalSelectionRecorded,
          expertClaimsAuthorized: releaseDecisions.domainClaims.expertValidatedClaimAuthorized
        })
        && exactJson(release.claims, {
          engineeringEvidenceOnly: true,
          codeSignature: false,
          expertSignature: false,
          contentRightsGrant: false,
          publicReleaseAuthorized: false
        }),
      "attachment",
      "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID",
      `Artifact ${label} Release Evidence bytes do not bind its lock and artifact inventory.`
    );
    const capture = remoteEnvelope?.payload;
    requireCondition(
      exactKeys(capture, [
        "label",
        "origin",
        "artifactSetDigest",
        "capturedAt",
        "entries",
        "captureDigest"
      ])
        && capture.label === label
        && capture.origin === evidence.deploymentCandidate.canonicalHttpsOrigin
        && capture.artifactSetDigest === artifact.artifactSetDigest
        && Number.isFinite(parseCanonicalTimestamp(
          capture.capturedAt,
          `Artifact ${label} remote capture time`
        ))
        && Array.isArray(capture.entries)
        && capture.captureDigest === sha256(canonicalJson({
          label: capture.label,
          origin: capture.origin,
          artifactSetDigest: capture.artifactSetDigest,
          capturedAt: capture.capturedAt,
          entries: capture.entries
        }))
        && capture.entries.length === artifact.files.length,
      "attachment",
      "SW_AB_UPDATE_REMOTE_CAPTURE_INVALID",
      `Artifact ${label} remote capture header or inventory is invalid.`
    );
    const entryPaths = [];
    for (let index = 0; index < artifact.files.length; index += 1) {
      const local = artifact.files[index];
      const remote = capture.entries[index];
      const bytes = decodeCanonicalBase64(remote?.bodyBase64, `Artifact ${label} remote ${local.path}`);
      requireCondition(
        exactKeys(remote, [
          "path",
          "url",
          "status",
          "redirectCount",
          "contentEncoding",
          "size",
          "sha256",
          "bodyBase64"
        ])
          && remote.path === local.path
          && remote.url === `${capture.origin}${local.urlPath}`
          && remote.status === 200
          && remote.redirectCount === 0
          && remote.contentEncoding === "identity"
          && remote.size === local.size
          && remote.sha256 === local.sha256
          && bytes.byteLength === local.size
          && sha256(bytes) === local.sha256,
        "attachment",
        "SW_AB_UPDATE_REMOTE_BODY_MISMATCH",
        `Artifact ${label} remote raw body ${local.path} does not match the local locked artifact.`
      );
      entryPaths.push(remote.path);
    }
    requireCondition(
      new Set(entryPaths).size === entryPaths.length,
      "attachment",
      "SW_AB_UPDATE_REMOTE_BODY_DUPLICATE",
      `Artifact ${label} remote capture contains duplicate paths.`
    );
    const providerDigestKey = `artifact${label}DeploymentDigest`;
    const hostDigestKey = `artifact${label}ResponseSetDigest`;
    requireCondition(
      evidence.deploymentCandidate.provider[providerDigestKey]
        === computeSwAbUpdateCandidateProviderDeploymentDigest({ evidence, label })
        && evidence.deploymentCandidate.host[hostDigestKey] === capture.captureDigest,
      "binding",
      "SW_AB_UPDATE_PROVIDER_REMOTE_BINDING_MISMATCH",
      `Artifact ${label} provider and host bindings do not match the raw remote capture.`
    );
  }
}

function validateTimeline(receipt) {
  requireCondition(
    receipt.timeline.length === SW_AB_UPDATE_CANDIDATE_TIMELINE.length,
    "semantic",
    "SW_AB_UPDATE_TIMELINE_LENGTH_INVALID",
    "Browser timeline must contain the exact fifteen events."
  );
  let previousTime = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < SW_AB_UPDATE_CANDIDATE_TIMELINE.length; index += 1) {
    const event = receipt.timeline[index];
    const expected = SW_AB_UPDATE_CANDIDATE_TIMELINE[index];
    const observedAt = parseCanonicalTimestamp(event.observedAt, `${receipt.projectName} event ${index + 1}`);
    requireCondition(
      event.sequence === index + 1
        && exactJson({
          eventId: event.eventId,
          documentTags: event.documentTags,
          controllerTags: event.controllerTags,
          installingTag: event.installingTag,
          waitingTag: event.waitingTag,
          activeTag: event.activeTag,
          networkState: event.networkState,
          pageCount: event.pageCount,
          processState: event.processState
        }, expected)
        && observedAt > previousTime,
      "semantic",
      "SW_AB_UPDATE_TIMELINE_INVALID",
      `${receipt.projectName} timeline is out of order or has an invalid A/B controller/install/wait/activation state.`
    );
    previousTime = observedAt;
  }
  requireCondition(
    parseCanonicalTimestamp(receipt.capturedAt, `${receipt.projectName} capturedAt`) >= previousTime,
    "semantic",
    "SW_AB_UPDATE_RECEIPT_TIME_INVALID",
    "Browser receipt capture time must follow its complete timeline."
  );
}

function validateBrowserReceipt(receipt, evidence, attachmentsByTuple) {
  const expectedProduct = receipt.projectName === "msedge" ? "Microsoft Edge" : "Google Chrome";
  requireCondition(
    receipt.runId === evidence.runId
      && receipt.attemptId === evidence.attemptId
      && receipt.receiptType === "sw_ab_update_browser_receipt_candidate_v1"
      && receipt.evidenceClass === "untrusted_candidate"
      && receipt.actualProduct === expectedProduct
      && receipt.attempts === 1
      && receipt.passed === 1
      && receipt.failed === 0
      && receipt.skipped === 0
      && receipt.flaky === 0
      && receipt.attemptMarkerDigest === evidence.attemptMarker.markerDigest
      && receipt.deploymentEventLedgerDigest === evidence.deploymentEventLedger.ledgerDigest
      && exactJson(receipt.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(receipt.artifactBindings, {
        A: artifactReference(evidence.artifacts.A),
        B: artifactReference(evidence.artifacts.B)
      }),
    "binding",
    "SW_AB_UPDATE_BROWSER_BINDING_MISMATCH",
    `${receipt.projectName} receipt is not bound to this run, attempt, release, and A/B artifacts.`
  );
  requireCondition(
    receipt.profile.freshProfile === true
      && receipt.profile.persistentProfile === true
      && receipt.profile.preflightEntryCount === 0
      && receipt.profile.allPagesClosedBeforeRestart === true
      && receipt.profile.browserProcessClosed === true
      && receipt.profile.oldProcessExitObserved === true
      && receipt.profile.differentProcessIdentity === true
      && receipt.profile.samePhysicalProfileRoot === true
      && receipt.profile.persistentProfileReopened === true
      && receipt.profile.reopenedOffline === true
      && receipt.profile.offlineBeforeFirstNavigation === true
      && receipt.profile.attempts === 1
      && receipt.profile.initialProcess.processIdDigest
        !== receipt.profile.reopenedProcess.processIdDigest,
    "semantic",
    "SW_AB_UPDATE_PROFILE_INVALID",
    `${receipt.projectName} did not prove one fresh persistent profile with a real close and offline reopen.`
  );
  const initialProcessAt = parseCanonicalTimestamp(
    receipt.profile.initialProcess.createdAt,
    `${receipt.projectName} initial process creation`
  );
  const reopenedProcessAt = parseCanonicalTimestamp(
    receipt.profile.reopenedProcess.createdAt,
    `${receipt.projectName} reopened process creation`
  );
  const firstNavigationAt = parseCanonicalTimestamp(
    receipt.profile.firstNavigationAfterReopenAt,
    `${receipt.projectName} first reopened navigation`
  );
  const timelineTime = (eventId) => parseCanonicalTimestamp(
    receipt.timeline.find((event) => event.eventId === eventId)?.observedAt,
    `${receipt.projectName} ${eventId}`
  );
  requireCondition(
    initialProcessAt <= timelineTime("fresh_profile_started_online")
      && timelineTime("browser_process_closed") < reopenedProcessAt
      && reopenedProcessAt <= timelineTime("persistent_profile_process_reopened_offline")
      && timelineTime("persistent_profile_process_reopened_offline") < firstNavigationAt
      && firstNavigationAt === timelineTime("offline_root_opened"),
    "semantic",
    "SW_AB_UPDATE_PROCESS_RESTART_ORDER_INVALID",
    `${receipt.projectName} did not prove old-process exit and a different process before the first offline navigation.`
  );
  const initialClients = receipt.clientProofs.initialAClients;
  const postClients = receipt.clientProofs.postClaimClients;
  requireCondition(
    exactJson(initialClients.map((client) => client.slot), ["retained-old-a", "reload-to-b"])
      && exactJson(postClients.map((client) => client.slot), ["retained-old-a", "reload-to-b"])
      && initialClients.every((client) =>
        client.documentTag === "A"
          && client.controllerTag === "A"
          && client.controllerChangeCount === 0
      )
      && postClients[0].documentTag === "A"
      && postClients[1].documentTag === "B"
      && postClients.every((client) =>
        client.controllerTag === "B" && client.controllerChangeCount === 1
      )
      && new Set(initialClients.map((client) => client.clientId)).size === 2
      && new Set(postClients.map((client) => client.clientId)).size === 2
      && new Set(initialClients.map((client) => client.cdpTargetId)).size === 2
      && new Set(postClients.map((client) => client.cdpTargetId)).size === 2
      && initialClients.every((client, index) =>
        client.cdpTargetId === postClients[index].cdpTargetId
      )
      && initialClients[0].clientId === postClients[0].clientId
      && initialClients[1].clientId !== postClients[1].clientId
      && new Set([...initialClients, ...postClients].map((client) => client.challengeNonce)).size === 4,
    "semantic",
    "SW_AB_UPDATE_CLIENT_PROOFS_INVALID",
    `${receipt.projectName} did not prove two distinct A clients and exact B claim/reload convergence.`
  );
  for (const [phase, clients] of [["initial-a", initialClients], ["post-claim", postClients]]) {
    for (const client of clients) {
      requireCondition(
        client.challengeResponseDigest
          === computeSwAbUpdateCandidateClientChallengeResponseDigest({
            evidence,
            projectName: receipt.projectName,
            phase,
            client
          }),
        "semantic",
        "SW_AB_UPDATE_CLIENT_CHALLENGE_INVALID",
        `${receipt.projectName} ${phase} client challenge is invalid.`
      );
    }
  }
  validateTimeline(receipt);
  requireCondition(
    exactJson(receipt.networkInterruption, {
      observed: true,
      duringUpdate: true,
      afterBInstallStarted: true,
      afterBWaitingObserved: true,
      beforeBActivation: true,
      unexpectedOnlineRequestCount: 0
    }),
    "semantic",
    "SW_AB_UPDATE_NETWORK_INTERRUPTION_INVALID",
    `${receipt.projectName} did not prove the required update-time network interruption.`
  );
  requireCondition(
    exactJson(receipt.offlineRoutes.map(({ routeId, path }) => ({ routeId, path })), [
      { routeId: "offline-root", path: "/" },
      { routeId: "offline-deep-link", path: "/help" }
    ])
      && receipt.offlineRoutes.every((route) =>
        route.networkState === "offline"
          && route.controllerTag === "B"
          && route.servedArtifactTag === "B"
          && route.loadSucceeded === true
          && route.fromServiceWorker === true
          && route.networkForwarded === false
          && route.requestUrl
            === `${evidence.deploymentCandidate.canonicalHttpsOrigin}${route.path}`
          && route.matchedCacheEntryUrl.startsWith(
            `${evidence.deploymentCandidate.canonicalHttpsOrigin}/`
          )
          && route.cacheName === `hakimi-shell-${evidence.artifacts.B.buildVersion}`
          && route.cacheBodySha256 === route.responseDigest
          && SHA256_PATTERN.test(route.responseDigest)
      ),
    "semantic",
    "SW_AB_UPDATE_OFFLINE_ROUTES_INVALID",
    `${receipt.projectName} did not prove B-controlled offline root and deep-link success.`
  );
  requireCondition(
    receipt.offlineUncachedCanary.offlineBeforeRequest === true
      && receipt.offlineUncachedCanary.cacheMatch === false
      && receipt.offlineUncachedCanary.responseReceived === false
      && receipt.offlineUncachedCanary.loadFailed === true
      && receipt.cacheProof.artifactTag === "B"
      && receipt.cacheProof.serviceWorkerSha256 === evidence.artifacts.B.serviceWorkerSha256
      && receipt.cacheProof.rootBodySha256 === receipt.offlineRoutes[0].responseDigest
      && receipt.cacheProof.deepLinkBodySha256 === receipt.offlineRoutes[1].responseDigest,
    "semantic",
    "SW_AB_UPDATE_OFFLINE_CACHE_OR_CANARY_INVALID",
    `${receipt.projectName} did not bind offline B cache bodies and an uncached failure canary.`
  );
  requireCondition(
    receipt.dataIntegrity.endpointFingerprintsEqual === true
      && receipt.dataIntegrity.intervalNoMutationVerified === false
      && receipt.dataIntegrity.abaResistance === "absent_schema13"
      && exactJson(receipt.dataIntegrity.before, receipt.dataIntegrity.after)
      && exactJson({
        dbGeneration: receipt.dataIntegrity.before.dbGeneration,
        targetSchema: receipt.dataIntegrity.before.targetSchema,
        migrationId: receipt.dataIntegrity.before.migrationId
      }, {
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      })
      && receipt.dataIntegrity.before.mutationEpochCapability === "absent_schema13"
      && receipt.dataIntegrity.before.epoch === null,
    "semantic",
    "SW_AB_UPDATE_V13_FINGERPRINT_CHANGED",
    `${receipt.projectName} v13 data fingerprint changed across the A to B update.`
  );
  const snapshotDigest = sha256(canonicalJson(receipt.dataIntegrity.before));
  requireCondition(
    exactJson(receipt.staleAWrite, {
      attempted: true,
      productionWritePath: true,
      repositoryLayer: "production_repository_dbcore",
      pageControllerTag: "B",
      pageDocumentTag: "A",
      targetActiveTag: "B",
      rejected: true,
      reasonCode: "STALE_CONTROLLER_PRODUCTION_WRITE_REJECTED",
      typedErrorName: "ReleaseDatabaseWriteLockedError",
      errorInstanceOf: true,
      databaseAreReleaseWritesLocked: true,
      productionWriteCommitted: false,
      transactionCommitCount: 0,
      beforeSnapshotDigest: snapshotDigest,
      afterAttemptSnapshotDigest: snapshotDigest,
      finalSnapshotDigest: snapshotDigest,
      finalSnapshotUnchanged: true
    }),
    "semantic",
    "SW_AB_UPDATE_STALE_A_WRITE_INVALID",
    `${receipt.projectName} stale A production write rejection or unchanged final snapshot is not exact.`
  );
  requireCondition(
    exactJson(receipt.attachmentRoles, SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES),
    "binding",
    "SW_AB_UPDATE_BROWSER_ATTACHMENT_ROLES_INVALID",
    `${receipt.projectName} attachment role list is not exact.`
  );
  for (const role of SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES) {
    requireCondition(
      attachmentsByTuple.has(`${receipt.projectName}\0${role}`),
      "binding",
      "SW_AB_UPDATE_BROWSER_ATTACHMENT_MISSING",
      `${receipt.projectName} attachment ${role} is missing.`
    );
  }
  requireCondition(
    receipt.receiptDigest === computeSwAbUpdateCandidateBrowserReceiptDigest(receipt),
    "digest",
    "SW_AB_UPDATE_BROWSER_RECEIPT_DIGEST_INVALID",
    `${receipt.projectName} receipt digest is invalid.`
  );
}

function validateBrowserAttachmentPayloads(receipt, evidence, envelopesByTuple) {
  const payload = (role) => envelopesByTuple.get(`${receipt.projectName}\0${role}`)?.payload;
  const browserVersion = payload("browser-version");
  requireCondition(
    exactKeys(browserVersion, ["actualProduct", "version", "executableSha256"])
      && browserVersion.actualProduct === receipt.actualProduct
      && typeof browserVersion.version === "string"
      && /^[1-9][0-9]{1,2}(?:\.[0-9]{1,6}){3}$/u.test(browserVersion.version)
      && SHA256_PATTERN.test(browserVersion.executableSha256),
    "attachment",
    "SW_AB_UPDATE_BROWSER_VERSION_ATTACHMENT_INVALID",
    `${receipt.projectName} browser-version attachment is invalid.`
  );
  requireCondition(
    exactJson(payload("fresh-persistent-profile-preflight"), { profile: receipt.profile })
      && exactJson(payload("process-and-profile-reopen"), { profile: receipt.profile }),
    "attachment",
    "SW_AB_UPDATE_PROFILE_ATTACHMENT_MISMATCH",
    `${receipt.projectName} profile/preflight/restart attachments do not match the receipt.`
  );
  requireCondition(
    exactJson(payload("initial-two-client-census"), {
      contextId: receipt.profile.initialContextId,
      clients: receipt.clientProofs.initialAClients
    })
      && exactJson(payload("post-claim-two-client-census"), {
        contextId: receipt.profile.initialContextId,
        clients: receipt.clientProofs.postClaimClients
      }),
    "attachment",
    "SW_AB_UPDATE_CLIENT_CENSUS_ATTACHMENT_MISMATCH",
    `${receipt.projectName} client census attachments do not match client challenge receipts.`
  );
  for (const label of ["A", "B"]) {
    const role = `artifact-${label.toLowerCase()}-controller-source`;
    const controller = payload(role);
    const sourceBytes = decodeCanonicalBase64(
      controller?.sourceBase64,
      `${receipt.projectName} controller source ${label}`
    );
    requireCondition(
      exactKeys(controller, ["label", "scriptUrl", "sourceBase64", "sourceSha256"])
        && controller.label === label
        && controller.scriptUrl === `${evidence.deploymentCandidate.canonicalHttpsOrigin}/sw.js`
        && controller.sourceSha256 === evidence.artifacts[label].serviceWorkerSha256
        && sourceBytes.byteLength > 0
        && sha256(sourceBytes) === controller.sourceSha256,
      "attachment",
      "SW_AB_UPDATE_CONTROLLER_SOURCE_ATTACHMENT_INVALID",
      `${receipt.projectName} controller source ${label} does not match local/remote locked sw.js.`
    );
    const remoteCapture = envelopesByTuple
      .get(`shared\0artifact-${label.toLowerCase()}-remote-artifact-capture`)?.payload;
    const remoteSw = remoteCapture?.entries?.find((entry) => entry.path === "sw.js");
    requireCondition(
      remoteSw?.sha256 === controller.sourceSha256
        && remoteSw.bodyBase64 === controller.sourceBase64,
      "attachment",
      "SW_AB_UPDATE_CONTROLLER_REMOTE_LOCAL_MISMATCH",
      `${receipt.projectName} controller ${label}, remote sw.js, and local locked sw.js are not byte-identical.`
    );
  }
  requireCondition(
    exactJson(payload("sw-controller-install-wait-activation-timeline"), {
      timeline: receipt.timeline
    })
      && exactJson(payload("update-network-interruption"), {
        networkInterruption: receipt.networkInterruption
      }),
    "attachment",
    "SW_AB_UPDATE_TIMELINE_ATTACHMENT_MISMATCH",
    `${receipt.projectName} timeline/network attachments do not match the receipt.`
  );
  const offlineResponseBodies = [];
  for (let index = 0; index < 2; index += 1) {
    const role = index === 0 ? "offline-root-result" : "offline-deep-link-result";
    const result = payload(role);
    const responseBytes = decodeCanonicalBase64(
      result?.responseBodyBase64,
      `${receipt.projectName} ${role} response body`
    );
    requireCondition(
      exactKeys(result, ["route", "responseBodyBase64"])
        && exactJson(result.route, receipt.offlineRoutes[index])
        && responseBytes.byteLength > 0
        && sha256(responseBytes) === receipt.offlineRoutes[index].responseDigest,
      "attachment",
      "SW_AB_UPDATE_OFFLINE_RESPONSE_BODY_MISMATCH",
      `${receipt.projectName} ${role} does not retain the exact response body bound to the receipt.`
    );
    offlineResponseBodies.push(responseBytes);
  }
  requireCondition(
    exactJson(payload("offline-uncached-canary"), {
      canary: receipt.offlineUncachedCanary
    }),
    "attachment",
    "SW_AB_UPDATE_OFFLINE_ATTACHMENT_MISMATCH",
    `${receipt.projectName} offline canary attachment does not match the receipt.`
  );
  const cachePayload = payload("artifact-b-cache-inventory");
  requireCondition(
    exactKeys(cachePayload, ["proof", "metadata", "entries"])
      && exactJson(cachePayload.proof, receipt.cacheProof)
      && Array.isArray(cachePayload.entries)
      && cachePayload.entries.length >= 1
      && cachePayload.entries.length <= evidence.artifacts.B.files.length,
    "attachment",
    "SW_AB_UPDATE_CACHE_ATTACHMENT_INVALID",
    `${receipt.projectName} B cache attachment is invalid.`
  );
  const expectedCacheName = `hakimi-shell-${evidence.artifacts.B.buildVersion}`;
  const metadataBytes = decodeCanonicalBase64(
    cachePayload.metadata?.bodyBase64,
    `${receipt.projectName} B cache metadata`
  );
  const metadataDocument = parseSwAbUpdateCandidateJsonBytes(
    metadataBytes,
    `${receipt.projectName} B cache metadata document`
  );
  const installingAt = parseCanonicalTimestamp(
    receipt.timeline.find((event) => event.eventId === "artifact_b_installing_observed")?.observedAt,
    `${receipt.projectName} B installing time`
  );
  const waitingAt = parseCanonicalTimestamp(
    receipt.timeline.find((event) => event.eventId === "artifact_b_waiting_observed")?.observedAt,
    `${receipt.projectName} B waiting time`
  );
  requireCondition(
    exactKeys(cachePayload.metadata, ["url", "cacheName", "size", "sha256", "bodyBase64"])
      && cachePayload.metadata.url
        === `${evidence.deploymentCandidate.canonicalHttpsOrigin}/__hakimi_cache_meta__`
      && cachePayload.metadata.cacheName === expectedCacheName
      && cachePayload.metadata.size === metadataBytes.byteLength
      && cachePayload.metadata.sha256 === sha256(metadataBytes)
      && receipt.cacheProof.cacheMetadataSha256 === cachePayload.metadata.sha256
      && exactKeys(metadataDocument, [
        "cacheName",
        "installedAt",
        "bootAttempted",
        "bootConfirmed",
        "protocolVersion",
        "dbGeneration",
        "databaseName",
        "targetSchema",
        "minReadableSchema",
        "maxReadableSchema",
        "migrationId",
        "acceptedCommittedMigrationIds",
        "sourceGeneration",
        "sourceDatabaseName",
        "sourceSchema"
      ])
      && metadataDocument.cacheName === expectedCacheName
      && Number.isSafeInteger(metadataDocument.installedAt)
      && metadataDocument.installedAt > installingAt
      && metadataDocument.installedAt < waitingAt
      && metadataDocument.bootAttempted === false
      && metadataDocument.bootConfirmed === false
      && exactJson({
        protocolVersion: metadataDocument.protocolVersion,
        dbGeneration: metadataDocument.dbGeneration,
        databaseName: metadataDocument.databaseName,
        targetSchema: metadataDocument.targetSchema,
        minReadableSchema: metadataDocument.minReadableSchema,
        maxReadableSchema: metadataDocument.maxReadableSchema,
        migrationId: metadataDocument.migrationId,
        acceptedCommittedMigrationIds: metadataDocument.acceptedCommittedMigrationIds,
        sourceGeneration: metadataDocument.sourceGeneration,
        sourceDatabaseName: metadataDocument.sourceDatabaseName,
        sourceSchema: metadataDocument.sourceSchema
      }, {
        protocolVersion: 1,
        dbGeneration: "legacy-v13",
        databaseName: "hakimi-bazi-research",
        targetSchema: 13,
        minReadableSchema: 13,
        maxReadableSchema: 13,
        migrationId: null,
        acceptedCommittedMigrationIds: [null],
        sourceGeneration: null,
        sourceDatabaseName: null,
        sourceSchema: null
      }),
    "attachment",
    "SW_AB_UPDATE_CACHE_METADATA_INVALID",
    `${receipt.projectName} B cache metadata does not bind the B build and default-v13 descriptor.`
  );
  const cacheEntryProjection = [];
  const cacheEntriesByUrl = new Map();
  for (let index = 0; index < cachePayload.entries.length; index += 1) {
    const entry = cachePayload.entries[index];
    const bytes = decodeCanonicalBase64(entry?.bodyBase64, `${receipt.projectName} cache entry ${index + 1}`);
    const artifactFile = evidence.artifacts.B.files.find((candidate) =>
      `${evidence.deploymentCandidate.canonicalHttpsOrigin}${candidate.urlPath}` === entry?.url
    );
    requireCondition(
      exactKeys(entry, ["url", "cacheName", "size", "sha256", "bodyBase64"])
        && artifactFile !== undefined
        && entry.cacheName === expectedCacheName
        && entry.size === bytes.byteLength
        && entry.sha256 === sha256(bytes)
        && entry.size === artifactFile.size
        && entry.sha256 === artifactFile.sha256
        && !cacheEntriesByUrl.has(entry.url),
      "attachment",
      "SW_AB_UPDATE_CACHE_BODY_MISMATCH",
      `${receipt.projectName} cache body ${index + 1} does not match a unique locked B artifact.`
    );
    cacheEntriesByUrl.set(entry.url, { entry, bytes });
    cacheEntryProjection.push(entry);
  }
  requireCondition(
    exactJson(
      cacheEntryProjection.map((entry) => entry.url),
      cacheEntryProjection.map((entry) => entry.url).sort()
    )
      && receipt.cacheProof.cacheInventoryDigest === sha256(canonicalJson({
        metadata: cachePayload.metadata,
        entries: cacheEntryProjection
      })),
    "attachment",
    "SW_AB_UPDATE_CACHE_INVENTORY_DIGEST_INVALID",
    `${receipt.projectName} cache inventory digest is invalid.`
  );
  for (let index = 0; index < receipt.offlineRoutes.length; index += 1) {
    const route = receipt.offlineRoutes[index];
    const matched = cacheEntriesByUrl.get(route.matchedCacheEntryUrl);
    requireCondition(
      matched
        && matched.entry.cacheName === route.cacheName
        && matched.entry.sha256 === route.cacheBodySha256
        && matched.bytes.equals(offlineResponseBodies[index]),
      "attachment",
      "SW_AB_UPDATE_OFFLINE_CACHE_RESPONSE_MISMATCH",
      `${receipt.projectName} offline response ${route.routeId} does not equal its raw matched B cache body.`
    );
  }
  const stalePayload = payload("stale-a-write-rejection");
  const staleSnapshots = stalePayload?.snapshots;
  const staleInvocation = stalePayload?.invocation;
  const staleError = stalePayload?.error;
  const staleTransaction = stalePayload?.transaction;
  const staleSentinel = stalePayload?.sentinel;
  requireCondition(
    exactJson(payload("v13-data-before"), { snapshot: receipt.dataIntegrity.before })
      && exactJson(payload("v13-data-after"), { snapshot: receipt.dataIntegrity.after })
      && exactKeys(stalePayload, [
        "staleAWrite",
        "invocation",
        "error",
        "transaction",
        "snapshots",
        "sentinel"
      ])
      && exactJson(stalePayload.staleAWrite, receipt.staleAWrite)
      && exactKeys(staleInvocation, [
        "invocationId",
        "repositoryLayer",
        "productionWritePath",
        "pageDocumentTag",
        "pageControllerTag",
        "targetActiveTag",
        "sentinelKey",
        "intendedValueDigest"
      ])
      && /^write-[a-f0-9]{64}$/u.test(staleInvocation.invocationId)
      && staleInvocation.repositoryLayer === receipt.staleAWrite.repositoryLayer
      && staleInvocation.productionWritePath === true
      && staleInvocation.pageDocumentTag === receipt.staleAWrite.pageDocumentTag
      && staleInvocation.pageControllerTag === receipt.staleAWrite.pageControllerTag
      && staleInvocation.targetActiveTag === receipt.staleAWrite.targetActiveTag
      && /^sentinel-[a-f0-9]{64}$/u.test(staleInvocation.sentinelKey)
      && SHA256_PATTERN.test(staleInvocation.intendedValueDigest)
      && exactJson(staleError, {
        name: "ReleaseDatabaseWriteLockedError",
        constructorName: "ReleaseDatabaseWriteLockedError",
        prototypeChain: ["ReleaseDatabaseWriteLockedError", "Error", "Object"],
        instanceOfReleaseDatabaseWriteLockedError: true,
        reasonCode: "STALE_CONTROLLER_PRODUCTION_WRITE_REJECTED",
        databaseAreReleaseWritesLocked: true
      })
      && exactJson(staleTransaction, {
        writeInvocationReachedProductionRepository: true,
        dbcoreWriteAttempted: true,
        commitObserved: false,
        transactionCommitCount: 0
      })
      && exactJson(staleSnapshots, {
        before: receipt.dataIntegrity.before,
        afterAttempt: receipt.dataIntegrity.after,
        final: receipt.dataIntegrity.after
      })
      && exactJson(staleSentinel, {
        key: staleInvocation.sentinelKey,
        presentBefore: false,
        presentAfterAttempt: false,
        presentFinal: false,
        queryCount: 3
      })
      && sha256(canonicalJson(staleSnapshots.before))
        === receipt.staleAWrite.beforeSnapshotDigest
      && sha256(canonicalJson(staleSnapshots.afterAttempt))
        === receipt.staleAWrite.afterAttemptSnapshotDigest
      && sha256(canonicalJson(staleSnapshots.final))
        === receipt.staleAWrite.finalSnapshotDigest,
    "attachment",
    "SW_AB_UPDATE_V13_OR_STALE_ATTACHMENT_MISMATCH",
    `${receipt.projectName} v13 snapshot or raw stale-write runtime facts do not match the receipt.`
  );
}

async function validateAttachments(evidence, roots, heldFiles) {
  const expectedTuples = expectedAttachmentTuples();
  requireCondition(
    exactJson(
      evidence.attachments.map(({ browserProject, role }) => ({ browserProject, role })),
      expectedTuples
    ),
    "binding",
    "SW_AB_UPDATE_ATTACHMENT_ROLE_SET_INVALID",
    "Attachment role and browser tuple set must be exact and canonical."
  );
  const paths = evidence.attachments.map((attachment) => attachment.path);
  requireCondition(
    new Set(paths).size === paths.length,
    "binding",
    "SW_AB_UPDATE_ATTACHMENT_PATH_DUPLICATE",
    "Every attachment must have a globally unique path."
  );
  const treeBefore = await enumerateTree(roots.attachmentsRoot, "attachments tree");
  requireCondition(
    exactJson(treeBefore, [...paths].sort()),
    "filesystem",
    "SW_AB_UPDATE_ATTACHMENT_TREE_NOT_CLOSED",
    "Attachments root must contain exactly the bound attachment paths and no extras."
  );
  const byTuple = new Map();
  const envelopesByTuple = new Map();
  const held = [];
  for (const attachment of evidence.attachments) {
    const canonicalAttachmentPath = path.relative(
      roots.attachmentsRoot,
      path.resolve(roots.attachmentsRoot, attachment.path)
    ).replaceAll("\\", "/");
    requireCondition(
      attachment.runId === evidence.runId
        && attachment.attemptId === evidence.attemptId
        && attachment.path === canonicalAttachmentPath
        && path.posix.normalize(attachment.path) === attachment.path
        && !attachment.path.split("/").some((segment) =>
          segment === "." || segment === ".." || segment === ""
        )
        && attachment.digest === computeSwAbUpdateCandidateAttachmentDigest(attachment),
      "binding",
      "SW_AB_UPDATE_ATTACHMENT_ATTEMPT_OR_DIGEST_INVALID",
      `Attachment ${attachment.path} is not bound to this run and attempt.`
    );
    const file = await readHeldFile({
      root: roots.attachmentsRoot,
      filePath: path.resolve(roots.attachmentsRoot, attachment.path),
      label: `Attachment ${attachment.path}`,
      heldFiles
    });
    requireCondition(
      file.size === attachment.size && file.sha256 === attachment.sha256,
      "binding",
      "SW_AB_UPDATE_ATTACHMENT_BYTES_MISMATCH",
      `Attachment ${attachment.path} size or SHA-256 does not match.`
    );
    const tupleKey = `${attachment.browserProject ?? "shared"}\0${attachment.role}`;
    requireCondition(
      !byTuple.has(tupleKey),
      "binding",
      "SW_AB_UPDATE_ATTACHMENT_TUPLE_DUPLICATE",
      `Attachment tuple ${tupleKey} is duplicated.`
    );
    byTuple.set(tupleKey, attachment);
    envelopesByTuple.set(tupleKey, parseAttachmentEnvelope(file, attachment));
    held.push(file);
  }
  const identityKeys = held.map((file) =>
    `${file.identity.dev.toString(10)}:${file.identity.ino.toString(10)}:${file.identity.birthtimeNs.toString(10)}`
  );
  requireCondition(
    new Set(identityKeys).size === identityKeys.length,
    "filesystem",
    "SW_AB_UPDATE_ATTACHMENT_FILESYSTEM_ALIAS",
    "Attachments cannot share a filesystem identity across roles, phases, or browsers."
  );
  const treeAfter = await enumerateTree(roots.attachmentsRoot, "attachments tree final");
  requireCondition(
    exactJson(treeAfter, treeBefore),
    "filesystem",
    "SW_AB_UPDATE_ATTACHMENT_TREE_CHANGED",
    "Attachments tree changed during verification."
  );
  return Object.freeze({
    byTuple,
    envelopesByTuple,
    held: Object.freeze(held)
  });
}

export async function verifySwAbUpdateCandidate({
  cwd = process.cwd(),
  inputPath,
  attachmentsRoot,
  privateRoot,
  artifactARoot,
  artifactBRoot
}) {
  const heldFiles = [];
  try {
    const roots = await lockRoots({
      workspace: cwd,
      inputPath,
      attachmentsRoot,
      privateRoot,
      artifactARoot,
      artifactBRoot
    });
    const privateTree = await enumerateTree(roots.privateRoot, "private tree");
    const expectedPrivateTree = [
      path.relative(roots.privateRoot, roots.inputPath).replaceAll("\\", "/"),
      path.relative(roots.privateRoot, roots.sidecarPath).replaceAll("\\", "/"),
      path.relative(roots.privateRoot, roots.markerPath).replaceAll("\\", "/")
    ].sort();
    requireCondition(
      exactJson(privateTree, expectedPrivateTree),
      "filesystem",
      "SW_AB_UPDATE_PRIVATE_TREE_NOT_CLOSED",
      "Private root must contain exactly the attempt marker, evidence input, and sidecar."
    );
    const governance = await loadGovernanceFiles(roots, heldFiles);
    const input = await readHeldFile({
      root: roots.privateRoot,
      filePath: roots.inputPath,
      label: "SW A to B evidence input",
      heldFiles
    });
    const sidecar = await readHeldFile({
      root: roots.privateRoot,
      filePath: roots.sidecarPath,
      label: "SW A to B evidence sidecar",
      maximum: 512,
      heldFiles
    });
    const markerFile = await readHeldFile({
      root: roots.privateRoot,
      filePath: roots.markerPath,
      label: "SW A to B attempt marker",
      maximum: 64 * 1024,
      heldFiles
    });
    const expectedSidecar = `${input.sha256}  ${path.basename(roots.inputPath)}\n`;
    requireCondition(
      sidecar.bytes.toString("ascii") === expectedSidecar,
      "digest",
      "SW_AB_UPDATE_INPUT_SIDECAR_INVALID",
      "Evidence sidecar does not match the exact input bytes and basename."
    );
    const evidence = parseSwAbUpdateCandidateJsonBytes(input.bytes, "SW A to B Evidence");
    const marker = parseSwAbUpdateCandidateJsonBytes(markerFile.bytes, "SW A to B attempt marker");
    try {
      governance.schemaValidator.assert(evidence);
    } catch (error) {
      fail("schema", "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID", "Evidence does not match the candidate Schema.", error);
    }
    requireCondition(
      exactJson(evidence.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
        && exactJson(evidence.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
        && exactJson(evidence.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY)
        && evidence.trustClass === "untrusted_candidate"
        && evidence.status === "not_admitted"
        && evidence.executionAdmission === "closed_missing_https_origin"
        && evidence.strictGatePassed === false,
      "semantic",
      "SW_AB_UPDATE_TERMINAL_BOUNDARY_INVALID",
      "Candidate terminal, v13 capability, or authority boundary was promoted."
    );
    const evidenceCapturedAt = parseCanonicalTimestamp(evidence.capturedAt, "Evidence capturedAt");
    validateGovernanceBindings(evidence, governance);
    validateAttemptMarker(evidence, marker, roots);
    const deploymentEventTimes = validateDeploymentEventLedger(evidence);
    const origin = validateCanonicalOrigin(evidence.deploymentCandidate.canonicalHttpsOrigin);
    requireCondition(
      evidence.deploymentCandidate.host.hostname === origin.hostname
        && evidence.deploymentCandidate.provider.bindingTrust === "untrusted_candidate"
        && evidence.deploymentCandidate.host.bindingTrust === "untrusted_candidate"
        && evidence.deploymentCandidate.provider.artifactADeploymentDigest
          !== evidence.deploymentCandidate.provider.artifactBDeploymentDigest
        && evidence.deploymentCandidate.host.artifactAResponseSetDigest
          !== evidence.deploymentCandidate.host.artifactBResponseSetDigest,
      "semantic",
      "SW_AB_UPDATE_PROVIDER_HOST_BINDING_INVALID",
      "Provider and host candidate bindings must match the future origin and keep A/B distinct."
    );
    await validateArtifactRoot({
      label: "A",
      artifact: evidence.artifacts.A,
      root: roots.artifactARoot,
      rootLock: roots.artifactALock,
      workspace: roots.workspace,
      heldFiles
    });
    await validateArtifactRoot({
      label: "B",
      artifact: evidence.artifacts.B,
      root: roots.artifactBRoot,
      rootLock: roots.artifactBLock,
      workspace: roots.workspace,
      heldFiles
    });
    const attachments = await validateAttachments(evidence, roots, heldFiles);
    validateArtifactDistinctness(evidence, attachments.byTuple);
    validateSharedArtifactPayloads(
      evidence,
      attachments.envelopesByTuple,
      governance.releaseEvidenceSchemaValidator,
      governance
    );
    requireCondition(
      exactJson(
        evidence.browserReceipts.map((receipt) => receipt.projectName),
        SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS
      ),
      "semantic",
      "SW_AB_UPDATE_BROWSER_MATRIX_INVALID",
      "Evidence must contain exactly one Edge receipt followed by one Chrome receipt."
    );
    for (const receipt of evidence.browserReceipts) {
      validateBrowserReceipt(receipt, evidence, attachments.byTuple);
      validateBrowserAttachmentPayloads(receipt, evidence, attachments.envelopesByTuple);
    }
    validateDeploymentReceiptProjection(
      evidence,
      attachments.envelopesByTuple,
      deploymentEventTimes
    );
    const edgeProfile = evidence.browserReceipts[0].profile;
    const chromeProfile = evidence.browserReceipts[1].profile;
    const browserIdentityValues = (receipt, key) => new Set([
      ...receipt.clientProofs.initialAClients.map((client) => client[key]),
      ...receipt.clientProofs.postClaimClients.map((client) => client[key])
    ]);
    const setsOverlap = (left, right) => [...left].some((value) => right.has(value));
    const edgeClientIds = browserIdentityValues(evidence.browserReceipts[0], "clientId");
    const chromeClientIds = browserIdentityValues(evidence.browserReceipts[1], "clientId");
    const edgeTargetIds = browserIdentityValues(evidence.browserReceipts[0], "cdpTargetId");
    const chromeTargetIds = browserIdentityValues(evidence.browserReceipts[1], "cdpTargetId");
    const edgeChallenges = browserIdentityValues(evidence.browserReceipts[0], "challengeNonce");
    const chromeChallenges = browserIdentityValues(evidence.browserReceipts[1], "challengeNonce");
    requireCondition(
      edgeProfile.profileInstanceId !== chromeProfile.profileInstanceId
        && edgeProfile.physicalProfileRootDigest !== chromeProfile.physicalProfileRootDigest
        && edgeProfile.initialContextId !== chromeProfile.initialContextId
        && edgeProfile.initialProcess.processIdDigest !== chromeProfile.initialProcess.processIdDigest
        && edgeProfile.reopenedProcess.processIdDigest !== chromeProfile.reopenedProcess.processIdDigest,
      "semantic",
      "SW_AB_UPDATE_PROFILE_ALIAS",
      "Edge and Chrome must use distinct fresh persistent profiles, contexts, and processes."
    );
    requireCondition(
      !setsOverlap(edgeClientIds, chromeClientIds)
        && !setsOverlap(edgeTargetIds, chromeTargetIds)
        && !setsOverlap(edgeChallenges, chromeChallenges),
      "semantic",
      "SW_AB_UPDATE_CROSS_BROWSER_CLIENT_IDENTITY_ALIAS",
      "Edge and Chrome cannot reuse WindowClient IDs, CDP target IDs, or challenge nonces."
    );
    const latestReceiptTime = Math.max(...evidence.browserReceipts.map((receipt) =>
      parseCanonicalTimestamp(receipt.capturedAt, `${receipt.projectName} capturedAt final`)
    ));
    requireCondition(
      evidenceCapturedAt >= latestReceiptTime,
      "semantic",
      "SW_AB_UPDATE_EVIDENCE_TIME_INVALID",
      "Terminal evidence capture must follow both browser receipts."
    );
    requireCondition(
      evidence.evidenceDigest === computeSwAbUpdateCandidateEvidenceDigest(evidence),
      "digest",
      "SW_AB_UPDATE_EVIDENCE_DIGEST_INVALID",
      "Evidence digest does not match canonical terminal bytes."
    );
    await assertRootsLocked(roots);
    for (const held of heldFiles) await revalidateHeldFile(held);
    const artifactATreeAfter = await enumerateTree(roots.artifactARoot, "artifact A tree terminal");
    const artifactBTreeAfter = await enumerateTree(roots.artifactBRoot, "artifact B tree terminal");
    const attachmentsTreeAfter = await enumerateTree(
      roots.attachmentsRoot,
      "attachments tree terminal"
    );
    requireCondition(
      exactJson(artifactATreeAfter, evidence.artifacts.A.files.map((entry) => entry.path))
        && exactJson(artifactBTreeAfter, evidence.artifacts.B.files.map((entry) => entry.path))
        && exactJson(
          attachmentsTreeAfter,
          evidence.attachments.map((attachment) => attachment.path).sort()
        ),
      "filesystem",
      "SW_AB_UPDATE_TERMINAL_TREES_CHANGED",
      "Artifact or attachment closed trees changed before terminal verification."
    );
    const privateTreeAfter = await enumerateTree(roots.privateRoot, "private tree final");
    requireCondition(
      exactJson(privateTreeAfter, expectedPrivateTree),
      "filesystem",
      "SW_AB_UPDATE_PRIVATE_TREE_CHANGED",
      "Private evidence tree changed during verification."
    );
    return Object.freeze({
      schemaVersion: 1,
      resultType: "sw_ab_update_candidate_offline_verification_v1",
      verificationKind: "offline_no_git_no_network_no_browser_no_deployment",
      internalConsistencyVerified: true,
      trustClass: "untrusted_candidate",
      status: "not_admitted",
      executionAdmission: "closed_missing_https_origin",
      strictGatePassed: false,
      usableForAdmission: false,
      formalReleaseEvidenceReceipt: false,
      attemptFreshnessExternallyVerified: false,
      bundleReplayResistanceVerified: false,
      runtimeCollectorProvenanceVerified: false,
      osProcessRestartProvenanceVerified: false,
      twoClientRuntimeProvenanceVerified: false,
      serviceWorkerResponseProvenanceVerified: false,
      cacheApiProvenanceVerified: false,
      concurrentFilesystemMutationResistanceVerified: false,
      runId: evidence.runId,
      attemptId: evidence.attemptId,
      evidenceDigest: evidence.evidenceDigest,
      compositionProjection: buildSwAbUpdateCandidateCompositionProjection(evidence),
      browserProjects: SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS,
      authority: SW_AB_UPDATE_CANDIDATE_AUTHORITY,
      verifierNetworkAttempted: false,
      verifierBrowserAttempted: false,
      verifierDeploymentAttempted: false,
      code: TERMINAL_CODE,
      messageDigest: sha256(TERMINAL_MESSAGE)
    });
  } finally {
    await closeHeldFiles(heldFiles);
  }
}

export function buildSwAbUpdateCandidateFailure(error) {
  const message = error instanceof Error ? error.message : "Unknown verification failure.";
  return Object.freeze({
    schemaVersion: 1,
    resultType: "sw_ab_update_candidate_offline_verification_v1",
    verificationKind: "offline_no_git_no_network_no_browser_no_deployment",
    internalConsistencyVerified: false,
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    attemptFreshnessExternallyVerified: false,
    bundleReplayResistanceVerified: false,
    runtimeCollectorProvenanceVerified: false,
    osProcessRestartProvenanceVerified: false,
    twoClientRuntimeProvenanceVerified: false,
    serviceWorkerResponseProvenanceVerified: false,
    cacheApiProvenanceVerified: false,
    concurrentFilesystemMutationResistanceVerified: false,
    authority: SW_AB_UPDATE_CANDIDATE_AUTHORITY,
    verifierNetworkAttempted: false,
    verifierBrowserAttempted: false,
    verifierDeploymentAttempted: false,
    failure: Object.freeze({
      stage: error instanceof SwAbUpdateCandidateVerificationError ? error.stage : "internal",
      code: error instanceof SwAbUpdateCandidateVerificationError
        ? error.code
        : "SW_AB_UPDATE_VERIFIER_INTERNAL_ERROR",
      messageDigest: sha256(message)
    })
  });
}
