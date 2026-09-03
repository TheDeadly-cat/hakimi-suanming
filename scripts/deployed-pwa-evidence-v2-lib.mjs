import { lstat, open, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { parseExpression } from "@babel/parser";

import {
  validateHostingSecurityPolicy
} from "./deployed-security-headers-lib.mjs";
import {
  compileDeployedPwaEvidenceV2Schema,
  DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_PATH
} from "./deployed-pwa-evidence-v2-schema.mjs";
import {
  canonicalJson,
  relativePathWithin,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";
import {
  compileReleaseEvidenceSchema
} from "./release-evidence-schema.mjs";
import {
  assertReleaseArtifactMutationBoundary
} from "./release-artifact-identity-lib.mjs";

export const DEPLOYED_PWA_EVIDENCE_V2_POLICY_PATH =
  "docs/release/deployed-pwa-evidence-policy.v2.json";
export const DEPLOYED_PWA_EVIDENCE_V2_HOSTING_POLICY_PATH =
  "docs/security/hosting-security-policy.json";
export const DEPLOYED_PWA_EVIDENCE_V2_RELEASE_DECISIONS_PATH =
  "docs/release/web-v1-release-decisions.json";

export const DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS = Object.freeze([
  Object.freeze({
    role: "release-decisions",
    path: DEPLOYED_PWA_EVIDENCE_V2_RELEASE_DECISIONS_PATH
  }),
  Object.freeze({
    role: "hosting-security-policy",
    path: DEPLOYED_PWA_EVIDENCE_V2_HOSTING_POLICY_PATH
  }),
  Object.freeze({
    role: "release-evidence-schema",
    path: "docs/release/release-evidence.schema.json"
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-schema",
    path: DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_PATH
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-policy",
    path: DEPLOYED_PWA_EVIDENCE_V2_POLICY_PATH
  })
]);

export const DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES = Object.freeze([
  "policyBindingsVerified",
  "releaseIdentityVerified",
  "artifactIdentityVerified",
  "untrustedFormalReceiptEnvelopeConsistent",
  "untrustedHostReceiptEnvelopeConsistent",
  "untrustedEdgeBrowserEnvelopeConsistent",
  "untrustedChromeBrowserEnvelopeConsistent",
  "serviceWorkerCandidateBytesConsistent",
  "routeAndCaseRevisionCandidateBytesConsistent",
  "evidenceDigestVerified",
  "semanticConsistencyVerified"
]);

export const DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES = Object.freeze([
  "auditedHostingPlatformSelected",
  "canonicalHttpsOriginConfigured",
  "formalArtifactIdentityPackageAvailable",
  "trustedRealHostReceiptWriterVerified",
  "trustedRealHostReceiptParserVerified",
  "trustedPwaRuntimeReceiptWriterVerified",
  "trustedPwaRuntimeReceiptParserVerified",
  "trustedProviderDeploymentReceiptParserVerified",
  "externalDeploymentExecutionAuthorized",
  "executionAdmissionOpen",
  "deployedPwaEngineeringVerified",
  "strictGatePassed"
]);

export const DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES = Object.freeze([
  "sourceAndArtifactCurrentVerified",
  "realHostVerified",
  "pwaBrowserRuntimeVerified",
  "deploymentOperationObserved",
  "externalDeploymentExecutionAuthorized",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "releaseReady",
  "contentTruthAuthorized",
  "expertClaimsAuthorized",
  "rightsLegalConclusionAuthorized"
]);

export const DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES = Object.freeze([
  "browser-version",
  "profile-preflight",
  "network-events",
  "controller-script-meta",
  "controller-source",
  "remote-service-worker-body",
  "case-revision-before",
  "case-revision-after"
]);

export const DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS = Object.freeze([
  "online-root",
  "offline-settings-data",
  "offline-case-revision",
  "offline-help-cold-start",
  "offline-help-reload"
]);

const DEFAULT_RELEASE_IDENTITY = Object.freeze({
  channel: "default-v13",
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
});

const DEFAULT_RELEASE_DESCRIPTOR = Object.freeze({
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

const EMPTY_ADMISSION_GATES = Object.freeze(Object.fromEntries(
  DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES.map((name) => [name, false])
));
const EMPTY_CLAIMS = Object.freeze(Object.fromEntries(
  DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES.map((name) => [name, false])
));
const MAX_BOUND_FILE_BYTES = 32 * 1024 * 1024;
const TERMINAL_CODE = "DEPLOYED_PWA_V2_SEMANTICALLY_CONSISTENT_NOT_ADMITTED";
const TERMINAL_MESSAGE =
  "Deployed-PWA v2 bytes are internally consistent, but trusted producers, real execution admission, and all public authorization remain absent.";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactArtifactMutationBoundary(left, right) {
  try {
    assertReleaseArtifactMutationBoundary(left);
    assertReleaseArtifactMutationBoundary(right);
    return exactJson(left, right);
  } catch {
    return false;
  }
}

function freezeArtifactMutationBoundary(value) {
  return Object.freeze({
    ...value,
    coveredReceiptIds: Object.freeze([...value.coveredReceiptIds])
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

export class DeployedPwaEvidenceV2VerificationError extends Error {
  constructor(stage, code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "DeployedPwaEvidenceV2VerificationError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new DeployedPwaEvidenceV2VerificationError(stage, code, message, cause);
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function decodeStrictUtf8(bytes, label) {
  requireCondition(
    !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    "schema",
    "DEPLOYED_PWA_V2_UTF8_BOM_FORBIDDEN",
    `${label} must not contain a UTF-8 BOM.`
  );
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail("schema", "DEPLOYED_PWA_V2_UTF8_INVALID", `${label} is not strict UTF-8.`, error);
  }
}

export function parseDeployedPwaEvidenceV2JsonBytes(bytes, label = "JSON document") {
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
    fail(
      "schema",
      "DEPLOYED_PWA_V2_JSON_SYNTAX_INVALID",
      `${label} cannot be inspected as strict JSON.`,
      error
    );
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      requireCondition(
        property.type === "ObjectProperty"
          && property.computed === false
          && property.key?.type === "StringLiteral",
        "schema",
        "DEPLOYED_PWA_V2_JSON_PROPERTY_INVALID",
        `${label} contains a non-JSON object property.`
      );
      requireCondition(
        !keys.has(property.key.value),
        "schema",
        "DEPLOYED_PWA_V2_JSON_DUPLICATE_KEY",
        `${label} contains a duplicate JSON key: ${property.key.value}.`
      );
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("schema", "DEPLOYED_PWA_V2_JSON_INVALID", `${label} is not valid JSON.`, error);
  }
}

function pathsOverlap(left, right) {
  const relative = path.relative(left, right);
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function comparableRealPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

async function captureDirectoryLock(directoryPath, label) {
  let stat;
  let resolved;
  try {
    stat = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_ROOT_LOCK_FAILED", `${label} root lock could not be captured.`, error);
  }
  requireCondition(
    stat.isDirectory() && !stat.isSymbolicLink() && stat.ino !== 0n,
    "filesystem",
    "DEPLOYED_PWA_V2_ROOT_LOCK_INVALID",
    `${label} root lock requires a real directory identity.`
  );
  return Object.freeze({
    dev: stat.dev,
    ino: stat.ino,
    birthtimeNs: stat.birthtimeNs,
    realPath: comparableRealPath(resolved)
  });
}

async function assertDirectoryLock(directoryPath, lock, label) {
  let stat;
  let resolved;
  try {
    stat = await lstat(directoryPath, { bigint: true });
    resolved = await realpath(directoryPath);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_ROOT_REBOUND", `${label} root changed after preflight.`, error);
  }
  requireCondition(
    stat.isDirectory()
      && !stat.isSymbolicLink()
      && sameFileIdentity(lock, stat)
      && lock.realPath === comparableRealPath(resolved),
    "filesystem",
    "DEPLOYED_PWA_V2_ROOT_REBOUND",
    `${label} root no longer identifies the preflight directory.`
  );
}

async function assertNoRootAliases(workspace, rootPath, label) {
  const relative = path.relative(path.resolve(workspace), path.resolve(rootPath));
  let current = path.resolve(workspace);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      fail("filesystem", "DEPLOYED_PWA_V2_ROOT_UNREADABLE", `${label} root cannot be inspected.`, error);
    }
    requireCondition(
      !stat.isSymbolicLink(),
      "filesystem",
      "DEPLOYED_PWA_V2_ROOT_ALIAS",
      `${label} root cannot traverse a symlink or junction.`
    );
  }
}

async function assertTreePreflight(directoryPath, label) {
  let names;
  try {
    names = await readdir(directoryPath);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_TREE_UNREADABLE", `${label} tree cannot be enumerated.`, error);
  }
  names.sort();
  for (const name of names) {
    const entryPath = path.join(directoryPath, name);
    let stat;
    try {
      stat = await lstat(entryPath);
    } catch (error) {
      fail("filesystem", "DEPLOYED_PWA_V2_TREE_ENTRY_UNREADABLE", `${label} tree entry cannot be inspected.`, error);
    }
    requireCondition(
      !stat.isSymbolicLink(),
      "filesystem",
      "DEPLOYED_PWA_V2_TREE_ALIAS",
      `${label} tree cannot contain a symlink or junction.`
    );
    if (stat.isDirectory()) {
      await assertTreePreflight(entryPath, label);
      continue;
    }
    requireCondition(
      stat.isFile(),
      "filesystem",
      "DEPLOYED_PWA_V2_TREE_NON_REGULAR",
      `${label} tree can contain only real directories and regular files.`
    );
    requireCondition(
      stat.nlink === 1,
      "filesystem",
      "DEPLOYED_PWA_V2_TREE_HARDLINK",
      `${label} tree cannot contain hard-linked files.`
    );
  }
}

export async function assertIsolatedDeployedPwaEvidenceV2Roots({
  workspace,
  workspaceLock = null,
  inputPath,
  artifactRoot,
  receiptsRoot,
  privateRoot
}) {
  const root = path.resolve(workspace);
  const effectiveWorkspaceLock = workspaceLock ?? await captureDirectoryLock(root, "workspace");
  await assertDirectoryLock(root, effectiveWorkspaceLock, "workspace");
  let resolvedWorkspace;
  try {
    resolvedWorkspace = await realpath(root);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_WORKSPACE_REALPATH_FAILED", "Workspace cannot be resolved.", error);
  }
  const workspaceStat = await lstat(root);
  requireCondition(
    workspaceStat.isDirectory() && !workspaceStat.isSymbolicLink(),
    "filesystem",
    "DEPLOYED_PWA_V2_WORKSPACE_INVALID",
    "Workspace must be a real non-symlink directory."
  );
  const roots = [
    ["artifact", path.resolve(artifactRoot)],
    ["receipts", path.resolve(receiptsRoot)],
    ["private", path.resolve(privateRoot)]
  ];
  const resolvedRoots = [];
  for (const [label, candidate] of roots) {
    try {
      relativePathWithin(root, candidate, `${label} root`);
    } catch (error) {
      fail("filesystem", "DEPLOYED_PWA_V2_ROOT_ESCAPES_WORKSPACE", `${label} root escapes workspace.`, error);
    }
    await assertNoRootAliases(root, candidate, label);
    const stat = await lstat(candidate, { bigint: true });
    requireCondition(
      stat.isDirectory() && !stat.isSymbolicLink(),
      "filesystem",
      "DEPLOYED_PWA_V2_ROOT_INVALID",
      `${label} root must be a real directory.`
    );
    const resolved = await realpath(candidate);
    try {
      relativePathWithin(resolvedWorkspace, resolved, `${label} real root`);
    } catch (error) {
      fail("filesystem", "DEPLOYED_PWA_V2_REAL_ROOT_ESCAPES_WORKSPACE", `${label} real root escapes workspace.`, error);
    }
    const lock = await captureDirectoryLock(candidate, label);
    resolvedRoots.push([label, resolved, lock]);
  }
  for (let left = 0; left < resolvedRoots.length; left += 1) {
    for (let right = left + 1; right < resolvedRoots.length; right += 1) {
      requireCondition(
        !pathsOverlap(resolvedRoots[left][1], resolvedRoots[right][1])
          && !pathsOverlap(resolvedRoots[right][1], resolvedRoots[left][1]),
        "filesystem",
        "DEPLOYED_PWA_V2_ROOTS_OVERLAP",
        `${resolvedRoots[left][0]} and ${resolvedRoots[right][0]} roots must not overlap.`
      );
    }
  }
  for (const [label, resolved, lock] of resolvedRoots) {
    await assertDirectoryLock(resolved, lock, label);
    await assertTreePreflight(resolved, label);
    await assertDirectoryLock(resolved, lock, label);
  }
  await assertRegularFileWithin(path.resolve(privateRoot), path.resolve(inputPath), "Evidence input");
  await assertRegularFileWithin(path.resolve(privateRoot), `${path.resolve(inputPath)}.sha256`, "Evidence sidecar");
  await assertDirectoryLock(resolvedRoots[2][1], resolvedRoots[2][2], "private");
  await assertDirectoryLock(root, effectiveWorkspaceLock, "workspace");
  return Object.freeze({
    workspace: resolvedWorkspace,
    workspaceLock: effectiveWorkspaceLock,
    artifactRoot: resolvedRoots[0][1],
    receiptsRoot: resolvedRoots[1][1],
    privateRoot: resolvedRoots[2][1],
    artifactRootLock: resolvedRoots[0][2],
    receiptsRootLock: resolvedRoots[1][2],
    privateRootLock: resolvedRoots[2][2]
  });
}

export async function assertDeployedPwaEvidenceV2RootsStillLocked(roots) {
  await Promise.all([
    assertDirectoryLock(roots.workspace, roots.workspaceLock, "workspace"),
    assertDirectoryLock(roots.artifactRoot, roots.artifactRootLock, "artifact"),
    assertDirectoryLock(roots.receiptsRoot, roots.receiptsRootLock, "receipts"),
    assertDirectoryLock(roots.privateRoot, roots.privateRootLock, "private")
  ]);
  return roots;
}

async function assertRegularFileWithin(root, filePath, label) {
  try {
    relativePathWithin(root, filePath, label);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_FILE_ESCAPES_ROOT", `${label} escapes its required root.`, error);
  }
  const stat = await lstat(filePath);
  requireCondition(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    "filesystem",
    "DEPLOYED_PWA_V2_FILE_NOT_REGULAR",
    `${label} must be a single-link regular file.`
  );
  const resolvedRoot = await realpath(root);
  const resolvedFile = await realpath(filePath);
  try {
    relativePathWithin(resolvedRoot, resolvedFile, `${label} real path`);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_FILE_REALPATH_ESCAPE", `${label} real path escapes its root.`, error);
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino !== 0n
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function assertOpenedFileStillBound({ root, filePath, openedStat, label }) {
  let pathStat;
  try {
    pathStat = await lstat(filePath, { bigint: true });
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_FILE_REBIND_UNREADABLE", `${label} path changed during verification.`, error);
  }
  requireCondition(
    openedStat.isFile()
      && openedStat.nlink === 1n
      && pathStat.isFile()
      && !pathStat.isSymbolicLink()
      && pathStat.nlink === 1n
      && sameFileIdentity(openedStat, pathStat),
    "filesystem",
    "DEPLOYED_PWA_V2_FILE_REBOUND",
    `${label} path no longer identifies the opened single-link regular file.`
  );
  const resolvedRoot = await realpath(root);
  const resolvedFile = await realpath(filePath);
  try {
    relativePathWithin(resolvedRoot, resolvedFile, `${label} rebound real path`);
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_FILE_REBOUND_ESCAPE", `${label} rebound path escapes its root.`, error);
  }
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

async function readStableFileWithin({ requiredRoot, rootLock = null, filePath, label, maximumSize }) {
  const absolute = path.resolve(filePath);
  const effectiveRootLock = rootLock ?? await captureDirectoryLock(requiredRoot, label);
  await assertDirectoryLock(requiredRoot, effectiveRootLock, label);
  await assertNoRootAliases(requiredRoot, absolute, label);
  await assertRegularFileWithin(requiredRoot, absolute, label);
  let handle;
  try {
    handle = await open(absolute, "r");
  } catch (error) {
    fail("filesystem", "DEPLOYED_PWA_V2_FILE_OPEN_FAILED", `${label} could not be opened.`, error);
  }
  try {
    const before = await handle.stat({ bigint: true });
    requireCondition(
      before.size > 0n && before.size <= BigInt(maximumSize),
      "filesystem",
      "DEPLOYED_PWA_V2_FILE_SIZE_INVALID",
      `${label} size is outside its bounded read contract.`
    );
    await assertOpenedFileStillBound({
      root: requiredRoot,
      filePath: absolute,
      openedStat: before,
      label
    });
    await assertDirectoryLock(requiredRoot, effectiveRootLock, label);
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    await assertOpenedFileStillBound({
      root: requiredRoot,
      filePath: absolute,
      openedStat: after,
      label
    });
    await assertDirectoryLock(requiredRoot, effectiveRootLock, label);
    requireCondition(
      sameFileIdentity(before, after)
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && bytes.byteLength === Number(before.size),
      "filesystem",
      "DEPLOYED_PWA_V2_FILE_CHANGED_DURING_READ",
      `${label} changed during its stable opened-file read.`
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

async function readBoundFile({
  workspace,
  requiredRoot,
  rootLock = null,
  binding,
  label,
  pathBase = workspace
}) {
  requireCondition(
    isRecord(binding)
      && typeof binding.path === "string"
      && Number.isInteger(binding.size)
      && binding.size > 0
      && binding.size <= MAX_BOUND_FILE_BYTES
      && /^[a-f0-9]{64}$/u.test(binding.sha256 ?? ""),
    "binding",
    "DEPLOYED_PWA_V2_FILE_BINDING_INVALID",
    `${label} file binding is invalid.`
  );
  const absolutePath = path.resolve(pathBase, binding.path);
  let canonicalBindingPath;
  try {
    canonicalBindingPath = relativePathWithin(pathBase, absolutePath, `${label} canonical path`);
  } catch (error) {
    fail("binding", "DEPLOYED_PWA_V2_FILE_BINDING_PATH_INVALID", `${label} path is not contained.`, error);
  }
  requireCondition(
    binding.path === canonicalBindingPath,
    "binding",
    "DEPLOYED_PWA_V2_FILE_BINDING_PATH_NON_CANONICAL",
    `${label} path is not the canonical relative spelling.`
  );
  const bytes = await readStableFileWithin({
    requiredRoot,
    rootLock,
    filePath: absolutePath,
    label,
    maximumSize: binding.size
  });
  requireCondition(
    bytes.byteLength === binding.size && sha256(bytes) === binding.sha256,
    "binding",
    "DEPLOYED_PWA_V2_FILE_BINDING_MISMATCH",
    `${label} bytes do not match their binding.`
  );
  return bytes;
}

async function collectStableArtifactEntries(root, rootLock, excludedPaths = []) {
  await assertDirectoryLock(root, rootLock, "artifact");
  const excluded = new Set(excludedPaths);
  const paths = [];
  async function walk(directory) {
    const names = await readdir(directory);
    names.sort();
    for (const name of names) {
      const absolute = path.join(directory, name);
      const stat = await lstat(absolute);
      requireCondition(
        !stat.isSymbolicLink(),
        "artifact",
        "DEPLOYED_PWA_V2_ARTIFACT_ALIAS",
        "Artifact inventory cannot traverse a symlink or junction."
      );
      if (stat.isDirectory()) {
        await walk(absolute);
      } else {
        requireCondition(
          stat.isFile() && stat.nlink === 1,
          "artifact",
          "DEPLOYED_PWA_V2_ARTIFACT_NON_REGULAR",
          "Artifact inventory can contain only single-link regular files."
        );
        paths.push(relativePathWithin(root, absolute, "Artifact inventory file"));
      }
    }
  }
  await walk(root);
  const entries = [];
  for (const relative of paths.filter((candidate) => !excluded.has(candidate))) {
    const bytes = await readStableFileWithin({
      requiredRoot: root,
      rootLock,
      filePath: path.resolve(root, relative),
      label: `Artifact ${relative}`,
      maximumSize: MAX_BOUND_FILE_BYTES
    });
    entries.push({ path: relative, size: bytes.byteLength, sha256: sha256(bytes) });
  }
  await assertDirectoryLock(root, rootLock, "artifact");
  return entries;
}

function withoutTerminalIdentity(evidence) {
  const candidate = structuredClone(evidence);
  delete candidate.evidenceId;
  delete candidate.evidenceDigest;
  return candidate;
}

export function computeDeployedPwaEvidenceV2Identity(evidence) {
  const evidenceDigest = sha256(canonicalJson(withoutTerminalIdentity(evidence)));
  return Object.freeze({
    evidenceDigest,
    evidenceId: `hpwa2-${evidenceDigest.slice(0, 32)}`
  });
}

function terminalFailureRecord() {
  return Object.freeze({
    code: TERMINAL_CODE,
    category: "execution_admission",
    messageDigest: sha256(TERMINAL_MESSAGE),
    detailBinding: null
  });
}

function requireSidecar(sidecarBytes, targetBytes, targetPath, label) {
  const expected = `${sha256(targetBytes)}  ${path.basename(targetPath)}\n`;
  requireCondition(
    Buffer.from(sidecarBytes).equals(Buffer.from(expected, "utf8")),
    "binding",
    "DEPLOYED_PWA_V2_SIDECAR_MISMATCH",
    `${label} sidecar does not exactly bind bytes and filename.`
  );
}

const EXPECTED_V2_POLICY = Object.freeze({
  schemaVersion: 2,
  policyId: "hakimi.web-v1.deployed-pwa-evidence/v2",
  status: "offline_semantic_verifier_only_not_admitted",
  executionAdmission: Object.freeze({
    status: "closed_missing_https_origin",
    auditedHostingPlatformSelected: false,
    canonicalHttpsOriginConfigured: false,
    formalArtifactIdentityPackageAvailable: false,
    trustedRealHostReceiptWriterVerified: false,
    trustedRealHostReceiptParserVerified: false,
    trustedPwaRuntimeReceiptWriterVerified: false,
    trustedPwaRuntimeReceiptParserVerified: false,
    trustedProviderDeploymentReceiptParserVerified: false
  }),
  semanticVerification: Object.freeze({
    enabled: true,
    verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
    resultClass: "candidate_internal_consistency_only",
    receiptTrustClass: "untrusted_candidate_envelopes",
    canOpenExecutionAdmission: false,
    canEstablishSourceAndArtifactCurrent: false,
    canEstablishRealHost: false,
    canEstablishBrowserRuntime: false,
    canEstablishDeploymentOperation: false,
    canEstablishPublicAuthorization: false
  }),
  blockingReasons: Object.freeze([
    "hosting_platform_unselected",
    "canonical_https_origin_null",
    "current_formal_artifact_absent",
    "trusted_real_host_receipt_writer_absent",
    "trusted_real_host_receipt_parser_absent",
    "trusted_pwa_runtime_receipt_writer_absent",
    "trusted_pwa_runtime_receipt_parser_absent",
    "trusted_provider_deployment_receipt_parser_absent",
    "external_deployment_execution_authorization_absent"
  ]),
  releaseIdentity: DEFAULT_RELEASE_IDENTITY,
  requiredBrowserProjects: Object.freeze(["msedge", "chrome"]),
  requiredHostVerificationKind: "real-network",
  requiredOfflineRouteIds: DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS,
  requiredBrowserAttachmentRoles: DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES,
  requiredPolicyBindings: DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS,
  rootIsolation: Object.freeze({
    requiredCliRoots: Object.freeze(["artifact-root", "receipts-root", "private-root"]),
    inputAndSidecarMustBeInsidePrivateRoot: true,
    rootsMustBeWorkspaceContained: true,
    rootsMustBeRealpathDistinct: true,
    rootsMustBeNonNested: true,
    symlinkOrJunctionRootsAllowed: false,
    bindingFilesMustBeRegularNonSymlinkFiles: true,
    bindingFilesMustHaveSingleLink: true
  }),
  authorizationBoundary: Object.freeze({
    externalDeploymentExecutionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    authorizationMayNotBeDerivedFromEngineeringEvidence: true
  }),
  terminalBoundary: Object.freeze({
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    deployedPwaEngineeringVerified: false,
    cliExitCode: 1,
    futureOpeningRequiresNewPolicyVersion: true
  })
});

export function validateDeployedPwaEvidenceV2Policy(policy) {
  requireCondition(
    exactJson(policy, EXPECTED_V2_POLICY),
    "policy",
    "DEPLOYED_PWA_V2_POLICY_INVALID",
    "Deployed-PWA v2 policy is not the exact offline-only, not-admitted contract."
  );
  return policy;
}

export function validateDeployedPwaEvidenceV2GovernanceState({ policy, hostingPolicy, decisions }) {
  validateDeployedPwaEvidenceV2Policy(policy);
  try {
    validateHostingSecurityPolicy(hostingPolicy);
  } catch (error) {
    fail("policy", "DEPLOYED_PWA_V2_HOSTING_POLICY_INVALID", "Hosting policy is invalid.", error);
  }
  requireCondition(
    exactJson(decisions?.defaultRelease, {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      schema16PromotionAuthorized: false
    })
      && exactKeys(decisions?.hosting, [
        "platform",
        "publicDeploymentAuthorized",
        "securityHeadersVerified"
      ])
      && decisions.hosting.platform === "unselected"
      && decisions.hosting.publicDeploymentAuthorized === false
      && decisions.hosting.securityHeadersVerified === false
      && decisions.domainClaims?.expertValidatedClaimAuthorized === false
      && hostingPolicy.deploymentPlatform === "unselected"
      && hostingPolicy.canonicalOrigin === null
      && hostingPolicy.cspEnforcementStatus === "report_only_until_real_host_validation"
      && hostingPolicy.publicReleaseGate?.realHostHeadersVerified === false
      && hostingPolicy.publicReleaseGate?.cspBlockingModeVerified === false,
    "policy",
    "DEPLOYED_PWA_V2_GOVERNANCE_DIVERGENCE",
    "Deployed-PWA v2, hosting, release identity, and authorization ledgers have diverged."
  );
  return Object.freeze({ policy, hostingPolicy, decisions });
}

async function readCheckedWorkspaceJson(workspace, workspaceLock, relativePath, label) {
  const absolute = path.resolve(workspace, relativePath);
  await assertNoRootAliases(workspace, absolute, label);
  const bytes = await readStableFileWithin({
    requiredRoot: workspace,
    rootLock: workspaceLock,
    filePath: absolute,
    label,
    maximumSize: MAX_BOUND_FILE_BYTES
  });
  return Object.freeze({
    path: relativePath,
    bytes,
    value: parseDeployedPwaEvidenceV2JsonBytes(bytes, label)
  });
}

async function readInputAndSidecar(inputPath, privateRoot, privateRootLock) {
  const input = path.resolve(inputPath);
  const sidecar = `${input}.sha256`;
  const [inputBytes, sidecarBytes] = await Promise.all([
    readStableFileWithin({
      requiredRoot: privateRoot,
      rootLock: privateRootLock,
      filePath: input,
      label: "Evidence input",
      maximumSize: MAX_BOUND_FILE_BYTES
    }),
    readStableFileWithin({
      requiredRoot: privateRoot,
      rootLock: privateRootLock,
      filePath: sidecar,
      label: "Evidence sidecar",
      maximumSize: 1024
    })
  ]);
  requireSidecar(sidecarBytes, inputBytes, input, "Evidence input");
  return Object.freeze({
    input,
    inputBytes,
    sidecarBytes,
    evidence: parseDeployedPwaEvidenceV2JsonBytes(inputBytes, "Deployed-PWA v2 Evidence")
  });
}

async function verifyPolicyBindings({ evidence, policySnapshots }) {
  requireCondition(
    Array.isArray(evidence.policyBindings)
      && evidence.policyBindings.length === DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS.length,
    "binding",
    "DEPLOYED_PWA_V2_POLICY_BINDING_SET_INVALID",
    "Policy binding set is incomplete."
  );
  for (let index = 0; index < DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS.length; index += 1) {
    const expected = DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS[index];
    const actual = evidence.policyBindings[index];
    requireCondition(
      actual?.role === expected.role && actual?.path === expected.path,
      "binding",
      "DEPLOYED_PWA_V2_POLICY_BINDING_IDENTITY_MISMATCH",
      `Policy binding ${index} role/path does not match the checked contract.`
    );
    const snapshot = policySnapshots.get(expected.path);
    requireCondition(
      snapshot?.path === expected.path
        && actual.size === snapshot.bytes.byteLength
        && actual.sha256 === sha256(snapshot.bytes),
      "binding",
      "DEPLOYED_PWA_V2_POLICY_BINDING_SNAPSHOT_MISMATCH",
      `Policy binding ${expected.role} does not bind the bytes used by this verification.`
    );
  }
}

function requireReleaseIdentityAndScope(evidence) {
  requireCondition(
    exactJson(evidence.scope?.releaseIdentity, DEFAULT_RELEASE_IDENTITY)
      && exactJson(evidence.scope?.browserProjects, ["msedge", "chrome"])
      && evidence.scope?.hostVerificationKind === "real-network",
    "binding",
    "DEPLOYED_PWA_V2_RELEASE_IDENTITY_MISMATCH",
    "Candidate scope is not the frozen default-v13 release identity."
  );
  const origin = evidence.scope.candidateCanonicalOrigin;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch (error) {
    fail("binding", "DEPLOYED_PWA_V2_ORIGIN_INVALID", "Candidate origin is invalid.", error);
  }
  requireCondition(
    parsed.protocol === "https:"
      && parsed.origin === origin
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.username === ""
      && parsed.password === "",
    "binding",
    "DEPLOYED_PWA_V2_ORIGIN_INVALID",
    "Candidate origin must be a canonical HTTPS origin."
  );
  return origin;
}

function parseBoundJson(bytes, label) {
  return parseDeployedPwaEvidenceV2JsonBytes(bytes, label);
}

async function verifyArtifactIdentity({ workspace, roots, evidence, releaseValidator }) {
  const identity = evidence.artifactIdentity;
  requireCondition(
    identity.artifactRoot === relativePathWithin(workspace, roots.artifactRoot, "Artifact root")
      && exactJson(identity.descriptor, DEFAULT_RELEASE_DESCRIPTOR),
    "artifact",
    "DEPLOYED_PWA_V2_ARTIFACT_ROOT_OR_DESCRIPTOR_MISMATCH",
    "Artifact root or descriptor does not match the v13 candidate."
  );
  const releaseBinding = identity.releaseEvidence;
  const expectedReleaseEvidencePath = path.posix.join(
    identity.artifactRoot,
    "release-evidence.json"
  );
  requireCondition(
    releaseBinding.path === expectedReleaseEvidencePath
      && releaseBinding.sidecarPath === `${releaseBinding.path}.sha256`,
    "artifact",
    "DEPLOYED_PWA_V2_RELEASE_EVIDENCE_PATH_INVALID",
    "Release Evidence and sidecar paths are not canonical."
  );
  const releaseBytes = await readBoundFile({
    workspace,
    requiredRoot: roots.artifactRoot,
    rootLock: roots.artifactRootLock,
    binding: releaseBinding,
    label: "Release Evidence"
  });
  const releaseSidecarBinding = {
    path: releaseBinding.sidecarPath,
    size: releaseBinding.sidecarSize,
    sha256: releaseBinding.sidecarSha256
  };
  const releaseSidecarBytes = await readBoundFile({
    workspace,
    requiredRoot: roots.artifactRoot,
    rootLock: roots.artifactRootLock,
    binding: releaseSidecarBinding,
    label: "Release Evidence sidecar"
  });
  requireSidecar(releaseSidecarBytes, releaseBytes, releaseBinding.path, "Release Evidence");
  const releaseEvidence = parseBoundJson(releaseBytes, "Bound Release Evidence");
  try {
    releaseValidator.assert(releaseEvidence);
  } catch (error) {
    fail("artifact", "DEPLOYED_PWA_V2_RELEASE_EVIDENCE_SCHEMA_INVALID", "Bound Release Evidence is invalid.", error);
  }
  const releaseRelativeToArtifact = relativePathWithin(
    roots.artifactRoot,
    path.resolve(workspace, releaseBinding.path),
    "Release Evidence artifact path"
  );
  const sidecarRelativeToArtifact = relativePathWithin(
    roots.artifactRoot,
    path.resolve(workspace, releaseBinding.sidecarPath),
    "Release Evidence sidecar artifact path"
  );
  const artifactEntries = await collectStableArtifactEntries(
    roots.artifactRoot,
    roots.artifactRootLock,
    [releaseRelativeToArtifact, sidecarRelativeToArtifact]
  );
  const artifactSetDigest = sha256(canonicalJson(artifactEntries));
  const components = releaseArtifactComponents(artifactEntries);
  requireCondition(
    releaseEvidence.evidenceId === releaseBinding.evidenceId
      && releaseEvidence.generatedAt === releaseBinding.generatedAt
      && releaseEvidence.schemaVersion === releaseBinding.schemaVersion
      && releaseEvidence.evidenceType === releaseBinding.evidenceType
      && releaseEvidence.release?.channel === "default-v13"
      && exactJson(releaseEvidence.release?.descriptor, identity.descriptor)
      && releaseEvidence.release?.manifestVersion === identity.manifestVersion
      && releaseEvidence.release?.manifestDigest === identity.manifestDigest
      && releaseEvidence.release?.buildVersion === identity.buildVersion
      && releaseEvidence.artifacts?.root === identity.artifactRoot
      && releaseEvidence.artifacts?.count === artifactEntries.length
      && exactJson(releaseEvidence.artifacts?.files, artifactEntries)
      && releaseEvidence.artifacts?.artifactSetDigest === artifactSetDigest
      && identity.artifactSetDigest === artifactSetDigest
      && exactJson(releaseEvidence.artifacts?.components, components)
      && exactJson(identity.components, components)
      && releaseEvidence.gates?.engineeringGatePassed === true
      && releaseEvidence.claims?.engineeringEvidenceOnly === true
      && releaseEvidence.claims?.publicReleaseAuthorized === false,
    "artifact",
    "DEPLOYED_PWA_V2_RELEASE_ARTIFACT_MISMATCH",
    "Release Evidence, artifact inventory, and v2 artifact identity do not match."
  );

  const lockBinding = identity.identityLock;
  const lockBytes = await readBoundFile({
    workspace,
    requiredRoot: roots.receiptsRoot,
    rootLock: roots.receiptsRootLock,
    binding: lockBinding,
    label: "Artifact identity lock"
  });
  const lockDocument = parseBoundJson(lockBytes, "Artifact identity lock");
  const unsignedLock = structuredClone(lockDocument);
  delete unsignedLock.lockDigest;
  requireCondition(
    exactKeys(lockDocument, [
      "schemaVersion",
      "recordType",
      "channel",
      "evidenceId",
      "createdAt",
      "artifactRoot",
      "descriptor",
      "manifestDigest",
      "buildVersion",
      "fileCount",
      "artifactSetDigest",
      "files",
      "lockDigest"
    ])
      && lockDocument.schemaVersion === 1
      && lockDocument.recordType === "release_artifact_identity_lock"
      && lockDocument.channel === "default-v13"
      && lockDocument.evidenceId === releaseEvidence.evidenceId
      && lockDocument.evidenceId === lockBinding.evidenceId
      && lockDocument.lockDigest === lockBinding.lockDigest
      && lockDocument.artifactSetDigest === lockBinding.artifactSetDigest
      && lockDocument.createdAt === lockBinding.createdAt
      && Number.isFinite(Date.parse(lockDocument.createdAt))
      && lockDocument.artifactRoot === identity.artifactRoot
      && exactJson(lockDocument.descriptor, identity.descriptor)
      && lockDocument.manifestDigest === identity.manifestDigest
      && lockDocument.buildVersion === identity.buildVersion
      && lockDocument.fileCount === artifactEntries.length
      && lockDocument.artifactSetDigest === identity.artifactSetDigest
      && exactJson(lockDocument.files, artifactEntries)
      && lockDocument.lockDigest === sha256(canonicalJson(unsignedLock)),
    "artifact",
    "DEPLOYED_PWA_V2_IDENTITY_LOCK_BINDING_MISMATCH",
    "Artifact identity lock binding is inconsistent."
  );

  const formalBinding = identity.formalReceipt;
  const formalBytes = await readBoundFile({
    workspace,
    requiredRoot: roots.receiptsRoot,
    rootLock: roots.receiptsRootLock,
    binding: formalBinding,
    label: "Formal Release Evidence receipt"
  });
  const formalReceipt = parseBoundJson(formalBytes, "Formal Release Evidence receipt");
  const formalGateNames = [
    "sourceTreeClean",
    "evidenceIdBound",
    "defaultReleaseDescriptorMatched",
    "requiredReceiptsPresent",
    "allRecordedReceiptsPassed",
    "policyReceiptSetMatched",
    "recordedReceiptSetMatched",
    "policyReceiptCommandsMatched",
    "browserResultSummariesMatched",
    "artifactIdentityStable",
    "requiredArtifactComponentsPresent",
    "engineeringGatePassed"
  ];
  requireCondition(
    exactKeys(formalReceipt, [
      "schemaVersion",
      "receiptType",
      "receiptId",
      "summaryType",
      "verificationKind",
      "releaseEvidenceId",
      "status",
      "verifiedAt",
      "evidenceId",
      "releaseEvidence",
      "release",
      "artifacts",
      "receiptCount",
      "gates",
      "formalReleaseEvidenceVerified",
      "claims"
    ])
      && formalBinding.schemaVersion === 1
      && formalBinding.receiptType === "formal_release_evidence_verification"
      && formalBinding.status === "passed"
      && formalBinding.releaseEvidenceId === releaseEvidence.evidenceId
      && formalBinding.receiptId === `formal-${releaseEvidence.evidenceId}`
      && formalReceipt.schemaVersion === 1
      && formalReceipt.schemaVersion === formalBinding.schemaVersion
      && formalReceipt.receiptType === "formal_release_evidence_verification"
      && formalReceipt.receiptType === formalBinding.receiptType
      && formalReceipt.receiptId === formalBinding.receiptId
      && formalReceipt.releaseEvidenceId === formalBinding.releaseEvidenceId
      && formalReceipt.status === "passed"
      && formalReceipt.status === formalBinding.status
      && formalReceipt.verifiedAt === formalBinding.verifiedAt
      && formalReceipt.summaryType === "formal_release_evidence_verification_v1"
      && formalReceipt.verificationKind === "formal-current-source-and-artifact"
      && formalReceipt.releaseEvidenceId === releaseEvidence.evidenceId
      && formalReceipt.evidenceId === releaseEvidence.evidenceId
      && formalReceipt.receiptId === `formal-${releaseEvidence.evidenceId}`
      && formalReceipt.formalReleaseEvidenceVerified === true
      && Date.parse(formalReceipt.verifiedAt) >= Date.parse(releaseEvidence.generatedAt)
      && Date.parse(formalReceipt.verifiedAt) >= Date.parse(lockDocument.createdAt)
      && exactKeys(formalReceipt.releaseEvidence, ["path", "sha256"])
      && formalReceipt.releaseEvidence.path === releaseBinding.path
      && formalReceipt.releaseEvidence?.sha256 === releaseBinding.sha256
      && exactKeys(formalReceipt.release, [
        "descriptor",
        "manifestVersion",
        "manifestDigest",
        "buildVersion"
      ])
      && exactJson(formalReceipt.release?.descriptor, identity.descriptor)
      && formalReceipt.release?.manifestVersion === identity.manifestVersion
      && formalReceipt.release?.manifestDigest === identity.manifestDigest
      && formalReceipt.release?.buildVersion === identity.buildVersion
      && exactKeys(formalReceipt.artifacts, [
        "root",
        "count",
        "artifactSetDigest",
        "identityLock",
        "mutationBoundary"
      ])
      && formalReceipt.artifacts.root === identity.artifactRoot
      && formalReceipt.artifacts.count === artifactEntries.length
      && formalReceipt.artifacts?.artifactSetDigest === identity.artifactSetDigest
      && exactKeys(formalReceipt.artifacts.identityLock, [
        "path",
        "sha256",
        "lockDigest",
        "artifactSetDigest"
      ])
      && formalReceipt.artifacts?.identityLock?.path === lockBinding.path
      && formalReceipt.artifacts?.identityLock?.sha256 === lockBinding.sha256
      && formalReceipt.artifacts?.identityLock?.lockDigest === lockBinding.lockDigest
      && formalReceipt.artifacts?.identityLock?.artifactSetDigest === identity.artifactSetDigest
      && exactArtifactMutationBoundary(
        formalReceipt.artifacts?.mutationBoundary,
        releaseEvidence.artifacts?.mutationBoundary
      )
      && formalReceipt.receiptCount === releaseEvidence.testReceipts.length
      && formalReceipt.receiptCount > 0
      && exactKeys(formalReceipt.gates, formalGateNames)
      && formalGateNames.every((name) => formalReceipt.gates[name] === true)
      && exactJson(formalReceipt.claims, {
        engineeringEvidenceOnly: true,
        sourceAndArtifactCurrentVerified: true,
        codeSignature: false,
        browserRuntimeBeyondBoundReceiptsVerified: false,
        publicReleaseAuthorized: false
      }),
    "artifact",
    "DEPLOYED_PWA_V2_FORMAL_RECEIPT_BINDING_MISMATCH",
    "Formal receipt bytes do not match Release Evidence and artifact identity."
  );
  return Object.freeze({
    releaseEvidence,
    formalReceipt,
    lockDocument,
    artifactEntries,
    serviceWorkerBytes: await readBoundFile({
      workspace,
      requiredRoot: roots.artifactRoot,
      rootLock: roots.artifactRootLock,
      binding: identity.components.serviceWorker,
      label: "Locked Service Worker artifact",
      pathBase: roots.artifactRoot
    })
  });
}

function digestReceiptDocument(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

async function verifyHostReceipt({ workspace, roots, evidence, artifact }) {
  const binding = evidence.receipts.host;
  const bytes = await readBoundFile({
    workspace,
    requiredRoot: roots.receiptsRoot,
    rootLock: roots.receiptsRootLock,
    binding,
    label: "Deployed host receipt"
  });
  const receipt = parseBoundJson(bytes, "Deployed host receipt");
  requireCondition(
    exactKeys(receipt, [
      "schemaVersion",
      "receiptType",
      "receiptId",
      "summaryType",
      "verificationKind",
      "targetOrigin",
      "deploymentPlatform",
      "releaseEvidenceId",
      "artifactSetDigest",
      "networkCompleted",
      "strictGatePassed",
      "realHostVerified",
      "publicDeploymentAuthorized",
      "completedAt",
      "receiptDigest"
    ])
      && receipt.schemaVersion === 2
      && receipt.receiptType === "deployed_pwa_host_receipt_candidate_v2"
      && receipt.receiptId === binding.receiptId
      && receipt.summaryType === binding.summaryType
      && receipt.verificationKind === binding.verificationKind
      && receipt.targetOrigin === binding.targetOrigin
      && receipt.deploymentPlatform === binding.deploymentPlatform
      && receipt.releaseEvidenceId === binding.releaseEvidenceId
      && receipt.artifactSetDigest === binding.artifactSetDigest
      && receipt.networkCompleted === true
      && receipt.strictGatePassed === true
      && receipt.realHostVerified === true
      && receipt.publicDeploymentAuthorized === false
      && receipt.completedAt === binding.completedAt
      && receipt.receiptDigest === binding.receiptDigest
      && receipt.receiptDigest === digestReceiptDocument(receipt)
      && receipt.targetOrigin === evidence.scope.candidateCanonicalOrigin
      && receipt.deploymentPlatform === evidence.scope.candidateDeploymentPlatform
      && receipt.releaseEvidenceId === artifact.releaseEvidence.evidenceId
      && receipt.artifactSetDigest === evidence.artifactIdentity.artifactSetDigest,
    "host",
    "DEPLOYED_PWA_V2_HOST_RECEIPT_MISMATCH",
    "Host receipt bytes are not an exact internally bound candidate envelope."
  );
  return receipt;
}

function routeSemanticProjection(routeObservations, casePath) {
  requireCondition(
    Array.isArray(routeObservations)
      && routeObservations.length === DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS.length
      && exactJson(
        routeObservations.map((observation) => observation.routeId),
        DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS
      )
      && new Set(routeObservations.map((observation) => observation.cdpRequestId)).size
        === routeObservations.length,
    "browser",
    "DEPLOYED_PWA_V2_ROUTE_SET_INVALID",
    "Browser route observations are not the exact ordered route set."
  );
  const expected = [
    {
      routeId: "online-root",
      path: "/",
      navigationKind: "online",
      offline: false,
      playwrightFromServiceWorkerRecorded: false,
      cdpFromServiceWorkerRecorded: false
    },
    {
      routeId: "offline-settings-data",
      path: "/settings/data",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true
    },
    {
      routeId: "offline-case-revision",
      path: casePath,
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true
    },
    {
      routeId: "offline-help-cold-start",
      path: "/help",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true
    },
    {
      routeId: "offline-help-reload",
      path: "/help",
      navigationKind: "reload",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true
    }
  ];
  for (let index = 0; index < expected.length; index += 1) {
    const actual = routeObservations[index];
    for (const [key, value] of Object.entries(expected[index])) {
      requireCondition(
        actual?.[key] === value,
        "browser",
        "DEPLOYED_PWA_V2_ROUTE_SEMANTICS_MISMATCH",
        `Route ${expected[index].routeId} field ${key} is not exact.`
      );
    }
  }
  return routeObservations;
}

function receiptCoreDocument(binding) {
  const copy = structuredClone(binding);
  delete copy.path;
  delete copy.size;
  delete copy.sha256;
  return copy;
}

function verifyCaseRevisionCapture({ document, receipt, projectName, capturePhase }) {
  const match = receipt.caseRevision.path.match(
    /^\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/revisions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/u
  );
  requireCondition(
    match !== null
      && exactKeys(document, [
        "schemaVersion",
        "recordType",
        "projectName",
        "captureId",
        "capturePhase",
        "capturedAt",
        "projection"
      ])
      && document.schemaVersion === 1
      && document.recordType === receipt.caseRevision.projectionVersion
      && document.projectName === projectName
      && /^[a-z0-9][a-z0-9-]{7,127}$/u.test(document.captureId ?? "")
      && document.capturePhase === capturePhase
      && Number.isFinite(Date.parse(document.capturedAt))
      && exactKeys(document.projection, [
        "databaseName",
        "dbGeneration",
        "targetSchema",
        "migrationId",
        "caseId",
        "revisionId",
        "caseRecordSha256",
        "revisionRecordSha256"
      ])
      && document.projection.databaseName === DEFAULT_RELEASE_DESCRIPTOR.databaseName
      && document.projection.dbGeneration === DEFAULT_RELEASE_IDENTITY.dbGeneration
      && document.projection.targetSchema === DEFAULT_RELEASE_IDENTITY.targetSchema
      && document.projection.migrationId === null
      && document.projection.caseId === match?.[1]
      && document.projection.revisionId === match?.[2]
      && /^[a-f0-9]{64}$/u.test(document.projection.caseRecordSha256 ?? "")
      && /^[a-f0-9]{64}$/u.test(document.projection.revisionRecordSha256 ?? "")
      && document.projection.caseRecordSha256 !== document.projection.revisionRecordSha256,
    "browser",
    "DEPLOYED_PWA_V2_CASE_CAPTURE_INVALID",
    `${projectName} ${capturePhase} case/revision capture is not exact.`
  );
  return Object.freeze({
    captureId: document.captureId,
    capturedAt: Date.parse(document.capturedAt),
    projection: document.projection,
    projectionDigest: sha256(canonicalJson(document.projection))
  });
}

async function verifyBrowserReceipt({
  workspace,
  roots,
  evidence,
  artifact,
  projectName,
  browserChannel,
  productPattern,
  envelope
}) {
  requireCondition(
    envelope.projectName === projectName
      && envelope.browserChannel === browserChannel
      && productPattern.test(envelope.actualProduct),
    "browser",
    "DEPLOYED_PWA_V2_BROWSER_TUPLE_INVALID",
    `${projectName} browser tuple is invalid.`
  );
  const binding = envelope.receipt;
  const receiptBytes = await readBoundFile({
    workspace,
    requiredRoot: roots.receiptsRoot,
    rootLock: roots.receiptsRootLock,
    binding,
    label: `${projectName} browser receipt`
  });
  const receipt = parseBoundJson(receiptBytes, `${projectName} browser receipt`);
  const expectedReceipt = {
    schemaVersion: 2,
    receiptType: "deployed_pwa_browser_runtime_receipt_candidate_v2",
    projectName,
    browserChannel,
    actualProduct: envelope.actualProduct,
    ...receiptCoreDocument(binding)
  };
  requireCondition(
    exactJson(receipt, expectedReceipt)
      && receipt.receiptDigest === digestReceiptDocument(receipt)
      && receipt.targetOrigin === evidence.scope.candidateCanonicalOrigin
      && receipt.releaseEvidenceId === artifact.releaseEvidence.evidenceId
      && receipt.artifactSetDigest === evidence.artifactIdentity.artifactSetDigest
      && receipt.attemptCount === 1
      && receipt.retryCount === 0
      && receipt.skippedCount === 0
      && receipt.flakyCount === 0
      && receipt.profileDirectoryExistedBeforeRun === false
      && receipt.profileCreatedByRunner === true
      && receipt.unexpectedExternalRequestCount === 0,
    "browser",
    "DEPLOYED_PWA_V2_BROWSER_RECEIPT_MISMATCH",
    `${projectName} browser receipt does not match its exact envelope.`
  );

  const controller = receipt.controller;
  const expectedWorkerUrl = `${evidence.scope.candidateCanonicalOrigin}/sw.js`;
  requireCondition(
    controller.registrationScope === `${evidence.scope.candidateCanonicalOrigin}/`
      && controller.controllerScriptUrl === expectedWorkerUrl
      && controller.activeScriptUrl === expectedWorkerUrl
      && controller.controllerState === "activated"
      && controller.activeState === "activated"
      && controller.waitingScriptUrl === null
      && controller.installingScriptUrl === null
      && controller.buildVersion === evidence.artifactIdentity.buildVersion
      && exactJson(controller.descriptor, evidence.artifactIdentity.descriptor)
      && controller.remoteServiceWorkerSha256
        === evidence.artifactIdentity.components.serviceWorker.sha256
      && controller.controllerSourceSha256
        === evidence.artifactIdentity.components.serviceWorker.sha256
      && controller.controllerSourceEvidenceMethod === "cdp_debugger_get_script_source_v1",
    "browser",
    "DEPLOYED_PWA_V2_CONTROLLER_IDENTITY_MISMATCH",
    `${projectName} controller identity does not match the locked Service Worker.`
  );
  routeSemanticProjection(receipt.routeObservations, receipt.caseRevision.path);
  requireCondition(
    Array.isArray(receipt.attachments)
      && exactJson(
        receipt.attachments.map((attachment) => attachment.role),
        DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES
      )
      && new Set(receipt.attachments.map((attachment) => attachment.path)).size
        === DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES.length
      && receipt.rawAttachmentSetDigest === sha256(canonicalJson(receipt.attachments)),
    "browser",
    "DEPLOYED_PWA_V2_ATTACHMENT_SET_MISMATCH",
    `${projectName} attachment set is not exact.`
  );

  const attachmentBytes = new Map();
  for (const attachment of receipt.attachments) {
    attachmentBytes.set(attachment.role, await readBoundFile({
      workspace,
      requiredRoot: roots.receiptsRoot,
      rootLock: roots.receiptsRootLock,
      binding: attachment,
      label: `${projectName} ${attachment.role} attachment`
    }));
  }
  const browserVersion = parseBoundJson(
    attachmentBytes.get("browser-version"),
    `${projectName} browser-version attachment`
  );
  requireCondition(
    exactJson(browserVersion, {
      schemaVersion: 1,
      projectName,
      browserChannel,
      actualProduct: envelope.actualProduct
    }),
    "browser",
    "DEPLOYED_PWA_V2_BROWSER_VERSION_ATTACHMENT_MISMATCH",
    `${projectName} browser-version attachment is inconsistent.`
  );
  const profile = parseBoundJson(
    attachmentBytes.get("profile-preflight"),
    `${projectName} profile-preflight attachment`
  );
  requireCondition(
    exactJson(profile, {
      schemaVersion: 1,
      projectName,
      profileBindingDigest: receipt.profileBindingDigest,
      directoryExistedBeforeRun: false,
      createdByRunner: true
    }),
    "browser",
    "DEPLOYED_PWA_V2_PROFILE_ATTACHMENT_MISMATCH",
    `${projectName} profile attachment is inconsistent.`
  );
  const networkEvents = parseBoundJson(
    attachmentBytes.get("network-events"),
    `${projectName} network-events attachment`
  );
  requireCondition(
    exactJson(networkEvents, {
      schemaVersion: 1,
      recordType: "deployed_pwa_cdp_network_events_v1",
      projectName,
      routeObservations: receipt.routeObservations
    }),
    "browser",
    "DEPLOYED_PWA_V2_NETWORK_ATTACHMENT_MISMATCH",
    `${projectName} CDP network attachment is inconsistent.`
  );
  const controllerMeta = parseBoundJson(
    attachmentBytes.get("controller-script-meta"),
    `${projectName} controller-script-meta attachment`
  );
  requireCondition(
    exactJson(controllerMeta, {
      schemaVersion: 1,
      projectName,
      controller
    }),
    "browser",
    "DEPLOYED_PWA_V2_CONTROLLER_META_ATTACHMENT_MISMATCH",
    `${projectName} controller metadata attachment is inconsistent.`
  );
  const controllerSource = attachmentBytes.get("controller-source");
  const remoteServiceWorker = attachmentBytes.get("remote-service-worker-body");
  requireCondition(
    Buffer.from(controllerSource).equals(Buffer.from(remoteServiceWorker))
      && Buffer.from(controllerSource).equals(Buffer.from(artifact.serviceWorkerBytes))
      && sha256(controllerSource) === controller.controllerSourceSha256
      && sha256(remoteServiceWorker) === controller.remoteServiceWorkerSha256,
    "browser",
    "DEPLOYED_PWA_V2_SERVICE_WORKER_BYTES_MISMATCH",
    `${projectName} controller, remote, and artifact Service Worker bytes differ.`
  );

  const beforeAttachment = receipt.attachments.find((entry) => entry.role === "case-revision-before");
  const afterAttachment = receipt.attachments.find((entry) => entry.role === "case-revision-after");
  requireCondition(
    exactJson(receipt.caseRevision.before, {
      path: beforeAttachment.path,
      size: beforeAttachment.size,
      sha256: beforeAttachment.sha256
    })
      && exactJson(receipt.caseRevision.after, {
        path: afterAttachment.path,
        size: afterAttachment.size,
        sha256: afterAttachment.sha256
      }),
    "browser",
    "DEPLOYED_PWA_V2_CASE_ATTACHMENT_BINDING_MISMATCH",
    `${projectName} case projection bindings do not match attachments.`
  );
  const beforeDocument = parseBoundJson(
    attachmentBytes.get("case-revision-before"),
    `${projectName} case-revision-before attachment`
  );
  const afterDocument = parseBoundJson(
    attachmentBytes.get("case-revision-after"),
    `${projectName} case-revision-after attachment`
  );
  const beforeCapture = verifyCaseRevisionCapture({
    document: beforeDocument,
    receipt,
    projectName,
    capturePhase: "before_offline_cold_start"
  });
  const afterCapture = verifyCaseRevisionCapture({
    document: afterDocument,
    receipt,
    projectName,
    capturePhase: "after_offline_cold_start"
  });
  requireCondition(
    beforeCapture.projectionDigest === receipt.caseRevision.beforeDigest
      && afterCapture.projectionDigest === receipt.caseRevision.afterDigest
      && beforeCapture.projectionDigest === afterCapture.projectionDigest
      && beforeCapture.captureId !== afterCapture.captureId
      && exactJson(beforeCapture.projection, afterCapture.projection),
    "browser",
    "DEPLOYED_PWA_V2_CASE_PROJECTION_MISMATCH",
    `${projectName} case/revision projection changed across offline cold start.`
  );
  const started = Date.parse(receipt.startedAt);
  const completed = Date.parse(receipt.completedAt);
  const caseRouteObserved = Date.parse(receipt.routeObservations[2].observedAt);
  requireCondition(
    Number.isFinite(started)
      && Number.isFinite(completed)
      && started <= completed
      && beforeCapture.capturedAt >= started
      && beforeCapture.capturedAt < caseRouteObserved
      && caseRouteObserved < afterCapture.capturedAt
      && afterCapture.capturedAt <= completed
      && receipt.routeObservations.every((observation) => {
        const observed = Date.parse(observation.observedAt);
        return Number.isFinite(observed) && observed >= started && observed <= completed;
      }),
    "browser",
    "DEPLOYED_PWA_V2_BROWSER_TIME_ORDER_INVALID",
    `${projectName} browser timestamps are not ordered.`
  );
  return receipt;
}

async function verifyDeploymentReceipt({ workspace, roots, evidence, artifact }) {
  const binding = evidence.receipts.deployment;
  if (binding === null) return null;
  const bytes = await readBoundFile({
    workspace,
    requiredRoot: roots.receiptsRoot,
    rootLock: roots.receiptsRootLock,
    binding,
    label: "Provider deployment receipt"
  });
  const receipt = parseBoundJson(bytes, "Provider deployment receipt");
  const expected = {
    schemaVersion: 2,
    receiptType: "deployed_pwa_provider_deployment_receipt_candidate_v2",
    ...receiptCoreDocument(binding)
  };
  requireCondition(
    exactJson(receipt, expected)
      && receipt.receiptDigest === digestReceiptDocument(receipt)
      && receipt.provider === evidence.scope.candidateDeploymentPlatform
      && receipt.targetOrigin === evidence.scope.candidateCanonicalOrigin
      && receipt.releaseEvidenceId === artifact.releaseEvidence.evidenceId
      && receipt.artifactSetDigest === evidence.artifactIdentity.artifactSetDigest,
    "deployment",
    "DEPLOYED_PWA_V2_DEPLOYMENT_RECEIPT_MISMATCH",
    "Provider deployment receipt is not internally consistent."
  );
  return receipt;
}

async function verifyReceipts({ workspace, roots, evidence, artifact }) {
  await assertDirectoryLock(roots.receiptsRoot, roots.receiptsRootLock, "receipts");
  const receiptPaths = [
    evidence.artifactIdentity.identityLock.path,
    evidence.artifactIdentity.formalReceipt.path,
    evidence.receipts.host.path,
    evidence.receipts.edge.receipt.path,
    ...evidence.receipts.edge.receipt.attachments.map((attachment) => attachment.path),
    evidence.receipts.chrome.receipt.path,
    ...evidence.receipts.chrome.receipt.attachments.map((attachment) => attachment.path),
    ...(evidence.receipts.deployment === null ? [] : [evidence.receipts.deployment.path])
  ];
  const receiptRealPaths = await Promise.all(receiptPaths.map(async (candidate) => {
    const absolute = path.resolve(workspace, candidate);
    await assertRegularFileWithin(roots.receiptsRoot, absolute, "Receipt path uniqueness preflight");
    const resolved = await realpath(absolute);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }));
  requireCondition(
    receiptPaths.every((candidate) => typeof candidate === "string")
      && new Set(receiptPaths).size === receiptPaths.length
      && new Set(receiptRealPaths).size === receiptRealPaths.length,
    "binding",
    "DEPLOYED_PWA_V2_RECEIPT_PATH_ALIAS",
    "Every receipt and raw attachment role must bind a distinct file path."
  );
  await assertDirectoryLock(roots.receiptsRoot, roots.receiptsRootLock, "receipts");
  const host = await verifyHostReceipt({ workspace, roots, evidence, artifact });
  const edge = await verifyBrowserReceipt({
    workspace,
    roots,
    evidence,
    artifact,
    projectName: "msedge",
    browserChannel: "msedge",
    productPattern: /^Edg\/\d+(?:\.\d+)+$/u,
    envelope: evidence.receipts.edge
  });
  const chrome = await verifyBrowserReceipt({
    workspace,
    roots,
    evidence,
    artifact,
    projectName: "chrome",
    browserChannel: "chrome",
    productPattern: /^Chrome\/\d+(?:\.\d+)+$/u,
    envelope: evidence.receipts.chrome
  });
  const deployment = await verifyDeploymentReceipt({ workspace, roots, evidence, artifact });
  requireCondition(
    edge.profileBindingDigest !== chrome.profileBindingDigest
      && Date.parse(artifact.formalReceipt.verifiedAt) <= Date.parse(host.completedAt)
      && Date.parse(host.completedAt) <= Date.parse(edge.startedAt)
      && Date.parse(host.completedAt) <= Date.parse(chrome.startedAt)
      && Date.parse(edge.completedAt) <= Date.parse(evidence.generatedAt)
      && Date.parse(chrome.completedAt) <= Date.parse(evidence.generatedAt)
      && (deployment === null || Date.parse(deployment.completedAt) <= Date.parse(host.completedAt)),
    "binding",
    "DEPLOYED_PWA_V2_RECEIPT_ORDER_OR_PROFILE_INVALID",
    "Receipt timestamps or fresh-profile identities are not independent and ordered."
  );
  return Object.freeze({ host, edge, chrome, deployment });
}

function validateTerminalLedger(evidence) {
  requireCondition(
    exactJson(
      evidence.semanticGates,
      Object.fromEntries(DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES.map((name) => [name, true]))
    )
      && exactJson(evidence.admissionGates, EMPTY_ADMISSION_GATES)
      && exactJson(evidence.claims, EMPTY_CLAIMS)
      && exactJson(evidence.failures, [terminalFailureRecord()]),
    "execution_admission",
    "DEPLOYED_PWA_V2_TERMINAL_LEDGER_INVALID",
    "v2 terminal gates, claims, or failure ledger do not preserve not-admitted semantics."
  );
  const identity = computeDeployedPwaEvidenceV2Identity(evidence);
  requireCondition(
    evidence.evidenceId === identity.evidenceId
      && evidence.evidenceDigest === identity.evidenceDigest,
    "binding",
    "DEPLOYED_PWA_V2_EVIDENCE_IDENTITY_MISMATCH",
    "v2 Evidence id or digest does not match canonical terminal bytes."
  );
}

function emptySemanticGates() {
  return Object.freeze(Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES.map((name) => [name, false])
  ));
}

function progressSnapshot(progress = {}) {
  return Object.freeze({
    schemaReadAttempted: progress.schemaReadAttempted === true,
    policyReadAttempted: progress.policyReadAttempted === true,
    rootPreflightAttempted: progress.rootPreflightAttempted === true,
    inputReadAttempted: progress.inputReadAttempted === true,
    artifactReadAttempted: progress.artifactReadAttempted === true,
    receiptReadAttempted: progress.receiptReadAttempted === true,
    formalVerifierAttempted: false,
    gitAttempted: false,
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false
  });
}

export async function verifyDeployedPwaEvidenceV2({
  cwd = process.cwd(),
  inputPath,
  artifactRoot,
  receiptsRoot,
  privateRoot
} = {}) {
  const workspace = path.resolve(cwd);
  const progress = {};
  try {
    requireCondition(
      [inputPath, artifactRoot, receiptsRoot, privateRoot]
        .every((value) => typeof value === "string" && value.length > 0),
      "arguments",
      "DEPLOYED_PWA_V2_ARGUMENTS_REQUIRED",
      "v2 requires explicit input, artifact, receipts, and private roots."
    );
    const workspaceLock = await captureDirectoryLock(workspace, "workspace");
    progress.schemaReadAttempted = true;
    const schemaSource = await readCheckedWorkspaceJson(
      workspace,
      workspaceLock,
      DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_PATH,
      "Deployed-PWA v2 Schema"
    );
    let schemaValidator;
    try {
      schemaValidator = compileDeployedPwaEvidenceV2Schema(schemaSource.value);
    } catch (error) {
      fail("schema", "DEPLOYED_PWA_V2_SCHEMA_INVALID", "v2 Schema failed checked compilation.", error);
    }

    progress.policyReadAttempted = true;
    const [policySource, hostingSource, decisionsSource, releaseSchemaSource] = await Promise.all([
      readCheckedWorkspaceJson(
        workspace,
        workspaceLock,
        DEPLOYED_PWA_EVIDENCE_V2_POLICY_PATH,
        "Deployed-PWA v2 policy"
      ),
      readCheckedWorkspaceJson(
        workspace,
        workspaceLock,
        DEPLOYED_PWA_EVIDENCE_V2_HOSTING_POLICY_PATH,
        "Hosting policy"
      ),
      readCheckedWorkspaceJson(
        workspace,
        workspaceLock,
        DEPLOYED_PWA_EVIDENCE_V2_RELEASE_DECISIONS_PATH,
        "Release decisions"
      ),
      readCheckedWorkspaceJson(
        workspace,
        workspaceLock,
        "docs/release/release-evidence.schema.json",
        "Release Evidence Schema"
      )
    ]);
    let releaseValidator;
    try {
      releaseValidator = compileReleaseEvidenceSchema(releaseSchemaSource.value);
    } catch (error) {
      fail("schema", "DEPLOYED_PWA_V2_RELEASE_SCHEMA_INVALID", "Release Evidence Schema failed checked compilation.", error);
    }
    validateDeployedPwaEvidenceV2GovernanceState({
      policy: policySource.value,
      hostingPolicy: hostingSource.value,
      decisions: decisionsSource.value
    });

    progress.rootPreflightAttempted = true;
    const roots = await assertIsolatedDeployedPwaEvidenceV2Roots({
      workspace,
      workspaceLock,
      inputPath: path.resolve(workspace, inputPath),
      artifactRoot: path.resolve(workspace, artifactRoot),
      receiptsRoot: path.resolve(workspace, receiptsRoot),
      privateRoot: path.resolve(workspace, privateRoot)
    });
    await assertDeployedPwaEvidenceV2RootsStillLocked(roots);
    progress.inputReadAttempted = true;
    const input = await readInputAndSidecar(
      path.resolve(workspace, inputPath),
      roots.privateRoot,
      roots.privateRootLock
    );
    try {
      schemaValidator.assert(input.evidence);
    } catch (error) {
      fail("schema", "DEPLOYED_PWA_V2_INPUT_SCHEMA_INVALID", "v2 Evidence failed its checked Schema.", error);
    }
    const evidence = input.evidence;
    requireReleaseIdentityAndScope(evidence);
    const policySnapshots = new Map([
      [schemaSource.path, schemaSource],
      [policySource.path, policySource],
      [hostingSource.path, hostingSource],
      [decisionsSource.path, decisionsSource],
      [releaseSchemaSource.path, releaseSchemaSource]
    ]);
    await verifyPolicyBindings({ evidence, policySnapshots });

    progress.artifactReadAttempted = true;
    const artifact = await verifyArtifactIdentity({
      workspace,
      roots,
      evidence,
      releaseValidator
    });
    progress.receiptReadAttempted = true;
    await verifyReceipts({ workspace, roots, evidence, artifact });
    validateTerminalLedger(evidence);
    await assertDeployedPwaEvidenceV2RootsStillLocked(roots);

    return Object.freeze({
      schemaVersion: 2,
      summaryType: "deployed_pwa_evidence_v2_verification",
      verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
      receiptTrustClass: "untrusted_candidate_envelopes",
      status: "not_admitted",
      executionAdmission: "closed_missing_https_origin",
      semanticConsistencyVerified: true,
      strictGatePassed: false,
      deployedPwaEngineeringVerified: false,
      artifactMutationBoundary: freezeArtifactMutationBoundary(
        artifact.formalReceipt.artifacts.mutationBoundary
      ),
      gates: Object.freeze({
        semantic: Object.freeze(Object.fromEntries(
          DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES.map((name) => [name, true])
        )),
        admission: EMPTY_ADMISSION_GATES
      }),
      claims: EMPTY_CLAIMS,
      attempts: progressSnapshot(progress),
      errors: Object.freeze([terminalFailureRecord()])
    });
  } catch (error) {
    if (error && typeof error === "object") {
      try {
        Object.defineProperty(error, "verificationProgress", {
          configurable: true,
          enumerable: false,
          value: progressSnapshot(progress)
        });
      } catch {
        // A frozen foreign error remains safe to report with the default all-false attempt ledger.
      }
    }
    throw error;
  }
}

export function buildDeployedPwaEvidenceV2Failure(error) {
  const known = error instanceof DeployedPwaEvidenceV2VerificationError;
  const stage = known ? error.stage : "internal";
  const code = known ? error.code : "DEPLOYED_PWA_V2_VERIFICATION_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    schemaVersion: 2,
    summaryType: "deployed_pwa_evidence_v2_verification",
    verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
    receiptTrustClass: "untrusted_candidate_envelopes",
    status: "failed",
    executionAdmission: "closed_missing_https_origin",
    semanticConsistencyVerified: false,
    strictGatePassed: false,
    deployedPwaEngineeringVerified: false,
    artifactMutationBoundary: null,
    gates: Object.freeze({
      semantic: emptySemanticGates(),
      admission: EMPTY_ADMISSION_GATES
    }),
    claims: EMPTY_CLAIMS,
    attempts: progressSnapshot(error?.verificationProgress),
    errors: Object.freeze([Object.freeze({
      stage,
      code,
      messageDigest: sha256(message)
    })])
  });
}
