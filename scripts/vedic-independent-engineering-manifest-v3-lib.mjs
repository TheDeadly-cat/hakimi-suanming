import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  isVerifiedVedicIndependentEngineeringManifestV2,
  readCurrentVedicIndependentEngineeringManifestV2
} from "./vedic-independent-engineering-manifest-v2-lib.mjs";

export const VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH =
  "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v3.json";

const MANIFEST_ID =
  "hakimi.vedic-astrology.five-allowlisted-authored-root-recursive-machine-identity-manifest/3.0.0";
const CREATED_AT = "2026-09-03T06:30:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T06:31:00.000Z";
const MANIFEST_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.five-allowlisted-authored-root-recursive-machine-identity-manifest.v3";
const ROOT_TREE_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.allowlisted-authored-root-tree.v3";
const ADDITIONAL_FILE_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.v2-unselected-additional-authored-files.v3";
const SHA256 = /^[a-f0-9]{64}$/u;

const PARENT_IDENTITY = Object.freeze({
  path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  rawBytes: 47_107,
  rawSha256: "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4",
  manifestId:
    "hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest/2.0.0",
  manifestDigest: "7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347"
});

const ALLOWLISTED_ROOTS = Object.freeze([
  "isolated-drafts/vedic-civil-time-fact-browser-draft",
  "isolated-drafts/vedic-civil-time-input-resolution-draft",
  "packages/tzdb-core",
  "packages/vedic-input-admission-kernel-draft",
  "packages/vedic-mutation-epoch-runtime-experiment-draft"
]);

const RUNTIME_SUBTREE_NAMES = Object.freeze([
  ".tmp",
  "dist",
  "node_modules",
  "temp",
  "tmp"
]);

const EXCLUDED_RUNTIME_SUBTREES = Object.freeze(
  ALLOWLISTED_ROOTS.flatMap((root) =>
    RUNTIME_SUBTREE_NAMES.map((name) => `${root}/${name}`)
  ).sort(compareCodeUnits)
);

const EXPECTED_AUTHORED_PATHS = Object.freeze([
  "isolated-drafts/vedic-civil-time-fact-browser-draft/README.md",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/browser-app/index.html",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/civil-time-browser-gate.spec.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/same-artifact-summary-reporter.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/package.json",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/playwright.same-artifact-evidence.config.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-worker.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/constants.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/input-contract.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/input-contract.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/main.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/protocol.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/styles.css",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/ui-format.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/ui-format.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/worker-fact-projection.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/tsconfig.json",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/tsconfig.same-artifact-evidence.json",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/vite.config.mjs",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/vite.same-artifact-evidence.config.mjs",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/vitest.config.ts",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/README.md",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/package.json",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.test.ts",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.ts",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/tsconfig.json",
  "packages/tzdb-core/package.json",
  "packages/tzdb-core/scripts/run-release-gate.mjs",
  "packages/tzdb-core/scripts/verify-artifact.mjs",
  "packages/tzdb-core/scripts/verify-artifact.test.mjs",
  "packages/tzdb-core/src/artifacts/iana-2025b.ts",
  "packages/tzdb-core/src/index.test.ts",
  "packages/tzdb-core/src/index.ts",
  "packages/tzdb-core/src/packed-resolver.ts",
  "packages/vedic-input-admission-kernel-draft/README.md",
  "packages/vedic-input-admission-kernel-draft/package.json",
  "packages/vedic-input-admission-kernel-draft/src/evaluator.test.ts",
  "packages/vedic-input-admission-kernel-draft/src/evaluator.ts",
  "packages/vedic-input-admission-kernel-draft/src/frozen-packet-schema.ts",
  "packages/vedic-input-admission-kernel-draft/src/protocol.ts",
  "packages/vedic-input-admission-kernel-draft/tsconfig.json",
  "packages/vedic-input-admission-kernel-draft/vitest.config.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/README.md",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/browser-app/index.html",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/package.json",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/browser-app/main.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/browser-app/styles.css",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/runtime.test.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/runtime.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/tsconfig.json",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/vite.browser-experiment.config.mjs",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/vitest.config.ts"
]);

const EXPECTED_ADDITIONAL_PATHS = Object.freeze([
  "isolated-drafts/vedic-civil-time-fact-browser-draft/README.md",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/civil-time-browser-gate.spec.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/same-artifact-summary-reporter.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/playwright.same-artifact-evidence.config.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/input-contract.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/ui-format.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/tsconfig.same-artifact-evidence.json",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/vitest.config.ts",
  "packages/tzdb-core/scripts/run-release-gate.mjs",
  "packages/tzdb-core/scripts/verify-artifact.mjs",
  "packages/tzdb-core/scripts/verify-artifact.test.mjs",
  "packages/tzdb-core/src/index.test.ts"
]);

const EXPECTED_ROOT_COUNTS = Object.freeze({
  "isolated-drafts/vedic-civil-time-fact-browser-draft": 27,
  "isolated-drafts/vedic-civil-time-input-resolution-draft": 5,
  "packages/tzdb-core": 8,
  "packages/vedic-input-admission-kernel-draft": 8,
  "packages/vedic-mutation-epoch-runtime-experiment-draft": 10
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 35_325,
  rawSha256: "c3d35e24073e7be14be971dae4e6825758b9fbfc3efd4adbc372e91fb74bf278",
  manifestDigest: "b466a83ada3c9f39721cfc4a54628eb1a9afa03ff4794f51461fb6b4100041b2"
});

const EXCLUDED_RUNTIME_SUBTREE_SET = new Set(EXCLUDED_RUNTIME_SUBTREES);
const EXPECTED_DIRECTORY_SET = expectedDirectorySet();
const BRAND = new WeakSet();

export class VedicIndependentEngineeringManifestV3Error extends Error {
  constructor(code, detail = "", options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "VedicIndependentEngineeringManifestV3Error";
    this.code = code;
  }
}

function fail(code, detail = "", cause = undefined) {
  throw new VedicIndependentEngineeringManifestV3Error(
    code,
    detail,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function compact(value) {
  return JSON.stringify(canonical(value));
}

function exactJson(left, right) {
  return compact(left) === compact(right);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function digest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(compact(value), "utf8")
    .digest("hex");
}

export function computeVedicIndependentEngineeringManifestV3Digest(value) {
  const unsigned = clone(value);
  delete unsigned.manifestDigest;
  return digest(MANIFEST_DIGEST_DOMAIN, unsigned);
}

export function serializeVedicIndependentEngineeringManifestV3(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeAbsolute(value) {
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLocaleLowerCase("en-US") : normalized;
}

function inside(root, candidate) {
  const normalizedRoot = normalizeAbsolute(root);
  const normalizedCandidate = normalizeAbsolute(candidate);
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

function endpointRecord(stats) {
  return {
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    nlink: stats.nlink,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs
  };
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function endpointKey(stats) {
  return `${stats.dev.toString()}:${stats.ino.toString()}`;
}

function validateFixedConstants() {
  if (ALLOWLISTED_ROOTS.length !== 5 || EXPECTED_AUTHORED_PATHS.length !== 58
      || EXPECTED_ADDITIONAL_PATHS.length !== 15
      || EXCLUDED_RUNTIME_SUBTREES.length !== 25) {
    fail("FIXED_CLOSURE_INVALID", "Vedic v3 固定计数漂移。");
  }
  for (const values of [ALLOWLISTED_ROOTS, EXPECTED_AUTHORED_PATHS,
    EXPECTED_ADDITIONAL_PATHS, EXCLUDED_RUNTIME_SUBTREES]) {
    const seen = new Set();
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (typeof value !== "string" || value === "" || value.includes("\\")
          || value.startsWith("/") || value.includes("../") || seen.has(value)
          || (index > 0 && compareCodeUnits(values[index - 1], value) >= 0)) {
        fail("FIXED_CLOSURE_INVALID", value);
      }
      seen.add(value);
    }
  }
  for (const extra of EXPECTED_ADDITIONAL_PATHS) {
    if (!EXPECTED_AUTHORED_PATHS.includes(extra)) {
      fail("FIXED_CLOSURE_INVALID", `additional 不在 authored closure: ${extra}`);
    }
  }
}

function expectedDirectorySet() {
  const directories = new Set(ALLOWLISTED_ROOTS);
  for (const filePath of EXPECTED_AUTHORED_PATHS) {
    let current = path.posix.dirname(filePath);
    while (current !== "." && !directories.has(current)) {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return directories;
}

function rootFor(filePath) {
  const matches = ALLOWLISTED_ROOTS.filter((root) => filePath.startsWith(`${root}/`));
  if (matches.length !== 1) fail("ROOT_MEMBERSHIP_INVALID", filePath);
  return matches[0];
}

async function observeDirectory(absolutePath, relativePath, workspaceReal) {
  let stats;
  let resolved;
  try {
    stats = await lstat(absolutePath, { bigint: true });
    resolved = await realpath(absolutePath);
  } catch (cause) {
    fail("ROOT_DIRECTORY_ENDPOINT_UNREADABLE", relativePath, cause);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    fail("ROOT_DIRECTORY_REPARSE_OR_TYPE_FORBIDDEN", relativePath);
  }
  if (!inside(workspaceReal, resolved)
      || normalizeAbsolute(resolved) !== normalizeAbsolute(absolutePath)) {
    fail("ROOT_DIRECTORY_REALPATH_ESCAPE_OR_ALIAS", relativePath);
  }
  return { relativePath, absolutePath, resolved, stats: endpointRecord(stats) };
}

async function enumerateAllowlistedAuthoredRoots(workspaceRoot, testHooks = undefined) {
  validateFixedConstants();
  const requestedWorkspace = path.resolve(workspaceRoot);
  let workspaceStats;
  let workspaceReal;
  try {
    workspaceStats = await lstat(requestedWorkspace, { bigint: true });
    workspaceReal = await realpath(requestedWorkspace);
  } catch (cause) {
    fail("WORKSPACE_ROOT_UNREADABLE", requestedWorkspace, cause);
  }
  if (!workspaceStats.isDirectory() || workspaceStats.isSymbolicLink()
      || normalizeAbsolute(workspaceReal) !== normalizeAbsolute(requestedWorkspace)) {
    fail("WORKSPACE_ROOT_ALIAS_OR_TYPE_FORBIDDEN", requestedWorkspace);
  }

  const fileRecords = [];
  const directoryRecords = [];
  const excludedEndpointRecords = [];
  const physicalFiles = new Set();

  async function walk(relativeDirectory) {
    const absoluteDirectory = path.resolve(workspaceReal, ...relativeDirectory.split("/"));
    if (!inside(workspaceReal, absoluteDirectory)) {
      fail("ROOT_PATH_ESCAPE", relativeDirectory);
    }
    const before = await observeDirectory(
      absoluteDirectory,
      relativeDirectory,
      workspaceReal
    );
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (cause) {
      fail("ROOT_DIRECTORY_READ_FAILED", relativeDirectory, cause);
    }
    entries.sort((left, right) => compareCodeUnits(left.name, right.name));
    const names = new Set();
    const caseFoldedNames = new Set();
    for (const entry of entries) {
      if (entry.name === "" || entry.name === "." || entry.name === ".."
          || entry.name.includes("/") || entry.name.includes("\\")
          || names.has(entry.name)) {
        fail("ROOT_DIRECTORY_ENTRY_NAME_INVALID", `${relativeDirectory}/${entry.name}`);
      }
      const folded = entry.name.toLocaleLowerCase("en-US");
      if (caseFoldedNames.has(folded)) {
        fail("ROOT_DIRECTORY_CASE_FOLD_ALIAS", `${relativeDirectory}/${entry.name}`);
      }
      names.add(entry.name);
      caseFoldedNames.add(folded);
      const relativeEntry = `${relativeDirectory}/${entry.name}`;
      const absoluteEntry = path.resolve(workspaceReal, ...relativeEntry.split("/"));
      if (!inside(workspaceReal, absoluteEntry)) fail("ROOT_PATH_ESCAPE", relativeEntry);
      let stats;
      let resolved;
      try {
        stats = await lstat(absoluteEntry, { bigint: true });
        resolved = await realpath(absoluteEntry);
      } catch (cause) {
        fail("ROOT_ENTRY_ENDPOINT_CHANGED", relativeEntry, cause);
      }
      if (stats.isSymbolicLink() || entry.isSymbolicLink()) {
        fail("ROOT_REPARSE_OR_SYMLINK_FORBIDDEN", relativeEntry);
      }
      if (!inside(workspaceReal, resolved)
          || normalizeAbsolute(resolved) !== normalizeAbsolute(absoluteEntry)) {
        fail("ROOT_REALPATH_ESCAPE_OR_ALIAS", relativeEntry);
      }
      if (stats.isDirectory() && entry.isDirectory()) {
        if (EXCLUDED_RUNTIME_SUBTREE_SET.has(relativeEntry)) {
          excludedEndpointRecords.push({
            path: relativeEntry,
            stats: endpointRecord(stats)
          });
          continue;
        }
        if (!EXPECTED_DIRECTORY_SET.has(relativeEntry)) {
          fail("ROOT_DIRECTORY_SET_DRIFT", relativeEntry);
        }
        await walk(relativeEntry);
      } else if (stats.isFile() && entry.isFile()) {
        if (stats.nlink !== 1n) fail("ROOT_HARDLINK_FORBIDDEN", relativeEntry);
        const physicalKey = endpointKey(stats);
        if (physicalFiles.has(physicalKey)) {
          fail("ROOT_DUPLICATE_PHYSICAL_FILE", relativeEntry);
        }
        physicalFiles.add(physicalKey);
        fileRecords.push({ path: relativeEntry, stats: endpointRecord(stats) });
      } else {
        fail("ROOT_ENTRY_TYPE_FORBIDDEN", relativeEntry);
      }
    }
    const after = await observeDirectory(
      absoluteDirectory,
      relativeDirectory,
      workspaceReal
    );
    if (!sameEndpoint(before.stats, after.stats)) {
      fail("ROOT_DIRECTORY_ENDPOINT_DRIFT", relativeDirectory);
    }
    directoryRecords.push({ path: relativeDirectory, stats: after.stats });
  }

  for (const root of ALLOWLISTED_ROOTS) await walk(root);
  fileRecords.sort((left, right) => compareCodeUnits(left.path, right.path));
  directoryRecords.sort((left, right) => compareCodeUnits(left.path, right.path));
  excludedEndpointRecords.sort((left, right) => compareCodeUnits(left.path, right.path));
  const paths = fileRecords.map((entry) => entry.path);
  if (!exactJson(paths, EXPECTED_AUTHORED_PATHS)) {
    fail("ROOT_FILE_SET_DRIFT", "allowlisted authored roots 的普通文件集合漂移。");
  }
  const directoryPaths = directoryRecords.map((entry) => entry.path);
  const expectedDirectories = [...EXPECTED_DIRECTORY_SET].sort(compareCodeUnits);
  if (!exactJson(directoryPaths, expectedDirectories)) {
    fail("ROOT_DIRECTORY_SET_DRIFT", "allowlisted authored roots 的目录集合漂移。");
  }
  if (typeof testHooks?.afterEnumeration === "function") {
    await testHooks.afterEnumeration({ workspaceRoot: workspaceReal, paths: [...paths] });
  }
  return { workspaceReal, fileRecords, directoryRecords, excludedEndpointRecords };
}

function sameInventory(left, right) {
  if (left.fileRecords.length !== right.fileRecords.length
      || left.directoryRecords.length !== right.directoryRecords.length
      || left.excludedEndpointRecords.length !== right.excludedEndpointRecords.length) return false;
  for (let index = 0; index < left.fileRecords.length; index += 1) {
    const a = left.fileRecords[index];
    const b = right.fileRecords[index];
    if (a.path !== b.path || !sameEndpoint(a.stats, b.stats)) return false;
  }
  for (let index = 0; index < left.directoryRecords.length; index += 1) {
    const a = left.directoryRecords[index];
    const b = right.directoryRecords[index];
    if (a.path !== b.path || !sameEndpoint(a.stats, b.stats)) return false;
  }
  for (let index = 0; index < left.excludedEndpointRecords.length; index += 1) {
    const a = left.excludedEndpointRecords[index];
    const b = right.excludedEndpointRecords[index];
    if (a.path !== b.path || !sameEndpoint(a.stats, b.stats)) return false;
  }
  return true;
}

async function collectRecursiveRootClosure(workspaceRoot, parent, testHooks = undefined) {
  const parentSelectedPaths = new Set(
    parent.manifest.selectedClosure.files.map((entry) => entry.path)
  );
  const initial = await enumerateAllowlistedAuthoredRoots(workspaceRoot, testHooks);
  const files = [];
  for (let index = 0; index < initial.fileRecords.length; index += 1) {
    const filePath = initial.fileRecords[index].path;
    let snapshot;
    try {
      snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, filePath);
    } catch (cause) {
      fail("ROOT_FILE_STABLE_READ_FAILED", filePath, cause);
    }
    files.push({
      path: filePath,
      root: rootFor(filePath),
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256,
      selectedByParentV2: parentSelectedPaths.has(filePath)
    });
    if (typeof testHooks?.afterFileSnapshot === "function") {
      await testHooks.afterFileSnapshot({
        workspaceRoot: initial.workspaceReal,
        filePath,
        index
      });
    }
  }
  const final = await enumerateAllowlistedAuthoredRoots(workspaceRoot);
  if (!sameInventory(initial, final)) {
    fail("ROOT_INVENTORY_ENDPOINT_DRIFT", "目录或文件端点在多文件读取窗口内漂移。");
  }
  const parentSelectedRootPaths = files
    .filter((file) => file.selectedByParentV2)
    .map((file) => file.path);
  const additionalFiles = files
    .filter((file) => !file.selectedByParentV2)
    .map(({ path: filePath, root, bytes, sha256 }) => ({
      path: filePath,
      root,
      bytes,
      sha256,
      disposition:
        "observed_inside_allowlisted_authored_root_not_selected_by_parent_v2_zero_authority_effect"
    }));
  if (parentSelectedRootPaths.length !== 43
      || !exactJson(additionalFiles.map((file) => file.path), EXPECTED_ADDITIONAL_PATHS)) {
    fail("PARENT_V2_ROOT_PARTITION_DRIFT", "v2 selected 与 additional 分区漂移。");
  }
  return { files, parentSelectedRootPaths, additionalFiles };
}

function requireParent(parent) {
  if (!isVerifiedVedicIndependentEngineeringManifestV2(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  if (parent.artifact?.path !== PARENT_IDENTITY.path
      || parent.artifact?.bytes !== PARENT_IDENTITY.rawBytes
      || parent.artifact?.sha256 !== PARENT_IDENTITY.rawSha256
      || parent.manifest?.manifestId !== PARENT_IDENTITY.manifestId
      || parent.manifestDigest !== PARENT_IDENTITY.manifestDigest
      || parent.manifest?.activeAdmissionEffect !== "none"
      || parent.manifest?.selectedClosure?.selectedUniquePhysicalPaths !== 57
      || parent.manifest?.selectedClosure?.recursiveDirectoryEnumerationPerformed !== false
      || parent.manifest?.selectedClosure?.extraFileAbsenceEstablished !== false
      || parent.manifest?.versionBoundary?.currentFullDomainManifestMechanicallyVerified !== false
      || parent.manifest?.gateState?.bindingRequired !== 38
      || parent.manifest?.gateState?.bindingFrozenVerified !== 0
      || parent.manifest?.gateState?.independentExpertsRequired !== 2
      || parent.manifest?.gateState?.independentExpertReviewsVerified !== 0) {
    fail("PARENT_IDENTITY_OR_BOUNDARY_MISMATCH");
  }
  return parent;
}

async function collectInputs(workspaceRoot, testHooks = undefined) {
  let parent;
  try {
    parent = requireParent(
      await readCurrentVedicIndependentEngineeringManifestV2(workspaceRoot)
    );
  } catch (cause) {
    if (cause instanceof VedicIndependentEngineeringManifestV3Error) throw cause;
    fail("PARENT_REVERIFICATION_FAILED", "Vedic v2 当前性复验失败。", cause);
  }
  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_IDENTITY.path
  );
  if (parentSnapshot.rawBytes !== PARENT_IDENTITY.rawBytes
      || parentSnapshot.rawSha256 !== PARENT_IDENTITY.rawSha256) {
    fail("PARENT_RAW_IDENTITY_MISMATCH");
  }
  const closure = await collectRecursiveRootClosure(workspaceRoot, parent, testHooks);
  return { parent, parentSnapshot, closure };
}

function allFalseBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertIdentityQualificationIndependenceEstablished: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    redistributionAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    safeToPublish: false
  };
}

function buildProjection(inputs) {
  const rootCounts = Object.fromEntries(ALLOWLISTED_ROOTS.map((root) => [root, 0]));
  const rootFiles = Object.fromEntries(ALLOWLISTED_ROOTS.map((root) => [root, []]));
  for (const file of inputs.closure.files) {
    rootCounts[file.root] += 1;
    rootFiles[file.root].push({ path: file.path, bytes: file.bytes, sha256: file.sha256 });
  }
  const rootDigests = Object.fromEntries(ALLOWLISTED_ROOTS.map((root) => [
    root,
    digest(ROOT_TREE_DIGEST_DOMAIN, { root, files: rootFiles[root] })
  ]));
  const parentBinding = {
    role: "current_vedic_parent_declared_selected_path_machine_identity_manifest_v2",
    path: PARENT_IDENTITY.path,
    rawBytes: inputs.parentSnapshot.rawBytes,
    rawSha256: inputs.parentSnapshot.rawSha256,
    manifestId: PARENT_IDENTITY.manifestId,
    semanticDigest: PARENT_IDENTITY.manifestDigest,
    semanticDigestField: "manifestDigest",
    privateBrandConsumed: true,
    currentFullLoaderVerified: true
  };
  const unsigned = {
    schemaVersion: "3.0.0",
    recordType:
      "vedic_five_allowlisted_authored_root_recursive_machine_identity_manifest_v3",
    manifestId: MANIFEST_ID,
    status:
      "current_five_allowlisted_authored_root_recursive_machine_identity_zero_admission_effect",
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productType: "five_allowlisted_authored_root_recursive_machine_identity_boundary"
    },
    parentBinding,
    recursiveAuthoredRootClosure: {
      scopeClass:
        "five_allowlisted_authored_roots_excluding_exact_runtime_subtrees_not_full_vedic_engineering_or_domain_closure",
      allowlistedRootCount: ALLOWLISTED_ROOTS.length,
      allowlistedRoots: [...ALLOWLISTED_ROOTS],
      expectedAuthoredOrdinaryFileCount: 58,
      observedAuthoredOrdinaryFileCount: inputs.closure.files.length,
      files: clone(inputs.closure.files),
      rootFileCounts: rootCounts,
      rootTreeDigests: rootDigests,
      recursiveEnumerationWithinVisitedAuthoredTreePerformed: true,
      exactRelativePathBytesAndSha256Recorded: true,
      ordinaryFilesOnly: true,
      hardlinksRejected: true,
      duplicatePhysicalMembershipRejected: true,
      unexpectedFileOrDirectoryRequiresNewSuccessor: true,
      symlinkJunctionOrReparseRejectedWithinVisitedTree: true,
      realpathEscapeOrAliasRejectedAtObservedEndpoints: true,
      directoryAndFileEndpointsReobservedAfterFileReads: true,
      toctouDetectableEndpointDriftRejected: true,
      allOrdinaryFilesUnderPhysicalRootsEnumerated: false,
      excludedRuntimeSubtreeCount: EXCLUDED_RUNTIME_SUBTREES.length,
      excludedRuntimeSubtrees: [...EXCLUDED_RUNTIME_SUBTREES],
      excludedRuntimeSubtreeContentsEnumerated: false,
      excludedRuntimeSubtreeContentsAuthoritative: false,
      excludedRuntimeSubtreeEndpointsTypeCheckedWhenPresent: true,
      excludedRuntimeSubtreeEndpointsReobservedAfterFileReadsWhenPresent: true,
      entireFivePhysicalRootsClosureEstablished: false,
      entireVedicEngineeringClosureEstablished: false,
      fullDomainManifestEstablished: false
    },
    parentV2Partition: {
      parentSelectedPathsTotal: 57,
      parentSelectedPathsInsideAllowlistedRoots: 43,
      parentSelectedPathsOutsideAllowlistedRoots: 14,
      additionalDiscoveredFileCount: inputs.closure.additionalFiles.length,
      additionalDiscoveredFiles: clone(inputs.closure.additionalFiles),
      additionalFileSetDigest: digest(
        ADDITIONAL_FILE_DIGEST_DOMAIN,
        inputs.closure.additionalFiles
      ),
      additionalMeansNotSelectedByV2NotUnauthorized: true,
      allAdditionalFilesIncludedInCurrentRootIdentity: true,
      additionalFilesAuthorizedAsDomainContent: false,
      additionalFilesPromotedToFormalComponents: false,
      unauthorizedFileDeterminationMade: false
    },
    sharedDependencyBoundary: {
      sharedRoot: "packages/tzdb-core",
      includedAsMachineIdentityDependencyRoot: true,
      exclusivelyOwnedByVedicEstablished: false,
      sourceProvenanceComplete: false,
      rightsOrRedistributionCleared: false,
      establishesVedicRuleset: false,
      establishesFullVedicEngineeringClosure: false
    },
    componentAndCapabilityBoundary: {
      parentV2ComponentProjectionReverifiedThroughPrivateBrand: true,
      additionalFilesSemanticallyClassifiedByThisSuccessor: false,
      semanticDependencyOrCallgraphEstablished: false,
      inputContractFormallyEstablished: false,
      factContractFormallyEstablished: false,
      executionRulesetEstablished: false,
      interpretationRulesetEstablished: false,
      reportContractEstablished: false,
      highRiskPolicyBound: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false
    },
    productBoundary: {
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      mainApplicationIntegrated: false,
      formalProductSurface: "absent",
      centralRegistryIntegration: "absent"
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByVedicProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    currentnessBoundary: {
      parentV2PrivateBrandVerified: true,
      currentFiveAllowlistedAuthoredRootMachineIdentityMechanicallyVerified: true,
      currentEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      entireVedicEngineeringClosureEstablished: false,
      productIdentityEstablished: false,
      ownerPromotionDecisionReceipt: null
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false
    },
    observationBoundary: {
      heldHandlePerFileSnapshots: true,
      directoryAndFileEndpointCheckpointComparison: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      manifestDigestIsDigitalSignature: false,
      rawIdentitiesAreDigitalSignatures: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    evidenceLedger: {
      engineeringEvidence:
        "current_exact_five_allowlisted_authored_root_recursive_machine_identity",
      browserAndRuntimeEvidence: "not_reverified_by_this_manifest",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsAndLegalJudgment: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    authorityBoundary: allFalseBoundary(),
    doesNotEstablish: [
      "all_files_inside_excluded_runtime_subtrees_or_entire_physical_root_closure",
      "entire_vedic_engineering_or_product_file_closure",
      "current_full_domain_manifest_or_formal_admission",
      "formal_input_fact_execution_interpretation_or_report_contract",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "content_truth_real_expert_truth_or_domain_authority",
      "runtime_storage_product_release_schema_migration_or_central_registry_identity",
      "browser_pwa_service_worker_public_host_or_product_runtime_evidence",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return {
    ...unsigned,
    manifestDigest: computeVedicIndependentEngineeringManifestV3Digest(unsigned)
  };
}

function requireAllFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0
      || Object.values(value).some((entry) => entry !== false)) fail(code);
}

function requireExactKeys(value, expectedKeys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || !exactJson(Object.keys(value).sort(compareCodeUnits), [...expectedKeys].sort(compareCodeUnits))) {
    fail(code);
  }
}

function assertFileIdentity(file, expectedPath, parentSelected) {
  if (file?.path !== expectedPath || file?.root !== rootFor(expectedPath)
      || !Number.isSafeInteger(file?.bytes) || file.bytes <= 0
      || !SHA256.test(file?.sha256 ?? "")
      || file?.selectedByParentV2 !== parentSelected) {
    fail("ROOT_FILE_IDENTITY_BOUNDARY_INVALID", expectedPath);
  }
}

function assertBoundary(manifest) {
  if (manifest?.schemaVersion !== "3.0.0"
      || manifest?.recordType
        !== "vedic_five_allowlisted_authored_root_recursive_machine_identity_manifest_v3"
      || manifest?.manifestId !== MANIFEST_ID
      || manifest?.status
        !== "current_five_allowlisted_authored_root_recursive_machine_identity_zero_admission_effect"
      || manifest?.createdAt !== CREATED_AT || manifest.createdAt >= CREATED_AT_UPPER_BOUND
      || manifest?.activeAdmissionEffect !== "none") {
    fail("MANIFEST_IDENTITY_BOUNDARY_INVALID");
  }
  const closure = manifest.recursiveAuthoredRootClosure;
  requireExactKeys(closure, [
    "scopeClass", "allowlistedRootCount", "allowlistedRoots",
    "expectedAuthoredOrdinaryFileCount", "observedAuthoredOrdinaryFileCount",
    "files", "rootFileCounts", "rootTreeDigests",
    "recursiveEnumerationWithinVisitedAuthoredTreePerformed",
    "exactRelativePathBytesAndSha256Recorded", "ordinaryFilesOnly",
    "hardlinksRejected", "duplicatePhysicalMembershipRejected",
    "unexpectedFileOrDirectoryRequiresNewSuccessor",
    "symlinkJunctionOrReparseRejectedWithinVisitedTree",
    "realpathEscapeOrAliasRejectedAtObservedEndpoints",
    "directoryAndFileEndpointsReobservedAfterFileReads",
    "toctouDetectableEndpointDriftRejected",
    "allOrdinaryFilesUnderPhysicalRootsEnumerated", "excludedRuntimeSubtreeCount",
    "excludedRuntimeSubtrees", "excludedRuntimeSubtreeContentsEnumerated",
    "excludedRuntimeSubtreeContentsAuthoritative",
    "excludedRuntimeSubtreeEndpointsTypeCheckedWhenPresent",
    "excludedRuntimeSubtreeEndpointsReobservedAfterFileReadsWhenPresent",
    "entireFivePhysicalRootsClosureEstablished",
    "entireVedicEngineeringClosureEstablished", "fullDomainManifestEstablished"
  ], "RECURSIVE_ROOT_CLOSURE_KEYS_INVALID");
  if (closure?.scopeClass
        !== "five_allowlisted_authored_roots_excluding_exact_runtime_subtrees_not_full_vedic_engineering_or_domain_closure"
      || closure?.allowlistedRootCount !== 5
      || !exactJson(closure?.allowlistedRoots, ALLOWLISTED_ROOTS)
      || closure?.expectedAuthoredOrdinaryFileCount !== 58
      || closure?.observedAuthoredOrdinaryFileCount !== 58
      || !Array.isArray(closure?.files) || closure.files.length !== 58
      || !exactJson(closure?.rootFileCounts, EXPECTED_ROOT_COUNTS)
      || closure?.recursiveEnumerationWithinVisitedAuthoredTreePerformed !== true
      || closure?.exactRelativePathBytesAndSha256Recorded !== true
      || closure?.ordinaryFilesOnly !== true || closure?.hardlinksRejected !== true
      || closure?.duplicatePhysicalMembershipRejected !== true
      || closure?.unexpectedFileOrDirectoryRequiresNewSuccessor !== true
      || closure?.symlinkJunctionOrReparseRejectedWithinVisitedTree !== true
      || closure?.realpathEscapeOrAliasRejectedAtObservedEndpoints !== true
      || closure?.directoryAndFileEndpointsReobservedAfterFileReads !== true
      || closure?.toctouDetectableEndpointDriftRejected !== true
      || closure?.allOrdinaryFilesUnderPhysicalRootsEnumerated !== false
      || closure?.excludedRuntimeSubtreeCount !== 25
      || !exactJson(closure?.excludedRuntimeSubtrees, EXCLUDED_RUNTIME_SUBTREES)
      || closure?.excludedRuntimeSubtreeContentsEnumerated !== false
      || closure?.excludedRuntimeSubtreeContentsAuthoritative !== false
      || closure?.excludedRuntimeSubtreeEndpointsTypeCheckedWhenPresent !== true
      || closure?.excludedRuntimeSubtreeEndpointsReobservedAfterFileReadsWhenPresent !== true
      || closure?.entireFivePhysicalRootsClosureEstablished !== false
      || closure?.entireVedicEngineeringClosureEstablished !== false
      || closure?.fullDomainManifestEstablished !== false) {
    fail("RECURSIVE_ROOT_CLOSURE_BOUNDARY_INVALID");
  }
  const parentSelectedSet = new Set(
    EXPECTED_AUTHORED_PATHS.filter((filePath) => !EXPECTED_ADDITIONAL_PATHS.includes(filePath))
  );
  for (let index = 0; index < EXPECTED_AUTHORED_PATHS.length; index += 1) {
    assertFileIdentity(
      closure.files[index],
      EXPECTED_AUTHORED_PATHS[index],
      parentSelectedSet.has(EXPECTED_AUTHORED_PATHS[index])
    );
  }
  const recomputedRootFiles = Object.fromEntries(ALLOWLISTED_ROOTS.map((root) => [root, []]));
  for (const file of closure.files) {
    recomputedRootFiles[file.root].push({ path: file.path, bytes: file.bytes, sha256: file.sha256 });
  }
  for (const root of ALLOWLISTED_ROOTS) {
    if (closure.rootTreeDigests?.[root]
        !== digest(ROOT_TREE_DIGEST_DOMAIN, { root, files: recomputedRootFiles[root] })) {
      fail("ROOT_TREE_DIGEST_INVALID", root);
    }
  }
  if (!exactJson(Object.keys(closure.rootTreeDigests).sort(compareCodeUnits), ALLOWLISTED_ROOTS)) {
    fail("ROOT_TREE_DIGEST_KEYS_INVALID");
  }
  const partition = manifest.parentV2Partition;
  requireExactKeys(partition, [
    "parentSelectedPathsTotal", "parentSelectedPathsInsideAllowlistedRoots",
    "parentSelectedPathsOutsideAllowlistedRoots", "additionalDiscoveredFileCount",
    "additionalDiscoveredFiles", "additionalFileSetDigest",
    "additionalMeansNotSelectedByV2NotUnauthorized",
    "allAdditionalFilesIncludedInCurrentRootIdentity",
    "additionalFilesAuthorizedAsDomainContent",
    "additionalFilesPromotedToFormalComponents", "unauthorizedFileDeterminationMade"
  ], "PARENT_V2_PARTITION_KEYS_INVALID");
  if (partition?.parentSelectedPathsTotal !== 57
      || partition?.parentSelectedPathsInsideAllowlistedRoots !== 43
      || partition?.parentSelectedPathsOutsideAllowlistedRoots !== 14
      || partition?.additionalDiscoveredFileCount !== 15
      || !Array.isArray(partition?.additionalDiscoveredFiles)
      || partition.additionalDiscoveredFiles.length !== 15
      || partition?.additionalMeansNotSelectedByV2NotUnauthorized !== true
      || partition?.allAdditionalFilesIncludedInCurrentRootIdentity !== true
      || partition?.additionalFilesAuthorizedAsDomainContent !== false
      || partition?.additionalFilesPromotedToFormalComponents !== false
      || partition?.unauthorizedFileDeterminationMade !== false
      || partition?.additionalFileSetDigest
        !== digest(ADDITIONAL_FILE_DIGEST_DOMAIN, partition.additionalDiscoveredFiles)) {
    fail("PARENT_V2_PARTITION_BOUNDARY_INVALID");
  }
  for (let index = 0; index < EXPECTED_ADDITIONAL_PATHS.length; index += 1) {
    const additional = partition.additionalDiscoveredFiles[index];
    const physical = closure.files.find((file) => file.path === EXPECTED_ADDITIONAL_PATHS[index]);
    if (!physical || additional?.path !== physical.path || additional?.root !== physical.root
        || additional?.bytes !== physical.bytes || additional?.sha256 !== physical.sha256
        || additional?.disposition
          !== "observed_inside_allowlisted_authored_root_not_selected_by_parent_v2_zero_authority_effect") {
      fail("ADDITIONAL_FILE_ACCOUNTING_INVALID", EXPECTED_ADDITIONAL_PATHS[index]);
    }
  }
  if (!exactJson(manifest.parentBinding, {
    role: "current_vedic_parent_declared_selected_path_machine_identity_manifest_v2",
    path: PARENT_IDENTITY.path,
    rawBytes: PARENT_IDENTITY.rawBytes,
    rawSha256: PARENT_IDENTITY.rawSha256,
    manifestId: PARENT_IDENTITY.manifestId,
    semanticDigest: PARENT_IDENTITY.manifestDigest,
    semanticDigestField: "manifestDigest",
    privateBrandConsumed: true,
    currentFullLoaderVerified: true
  })) fail("PARENT_BINDING_INVALID");
  if (!exactJson(manifest.systemIdentity, {
    contractSystemId: "vedic",
    productSystemId: "vedic-astrology",
    productType: "five_allowlisted_authored_root_recursive_machine_identity_boundary"
  }) || !exactJson(manifest.productBoundary, {
    productIdentity: null,
    releaseIdentity: null,
    targetSchema: null,
    migrationId: null,
    runtimeOption: "unselected",
    storageBackend: "unselected",
    mainApplicationIntegrated: false,
    formalProductSurface: "absent",
    centralRegistryIntegration: "absent"
  }) || !exactJson(manifest.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    projectContextOnly: true,
    inheritedByVedicProductIdentity: false,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false
  })) {
    fail("PRODUCT_OR_PROJECT_BOUNDARY_INVALID");
  }
  if (!exactJson(manifest.componentAndCapabilityBoundary, {
    parentV2ComponentProjectionReverifiedThroughPrivateBrand: true,
    additionalFilesSemanticallyClassifiedByThisSuccessor: false,
    semanticDependencyOrCallgraphEstablished: false,
    inputContractFormallyEstablished: false,
    factContractFormallyEstablished: false,
    executionRulesetEstablished: false,
    interpretationRulesetEstablished: false,
    reportContractEstablished: false,
    highRiskPolicyBound: false,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false
  })) {
    fail("CAPABILITY_BOUNDARY_INVALID");
  }
  if (!exactJson(manifest.sharedDependencyBoundary, {
    sharedRoot: "packages/tzdb-core",
    includedAsMachineIdentityDependencyRoot: true,
    exclusivelyOwnedByVedicEstablished: false,
    sourceProvenanceComplete: false,
    rightsOrRedistributionCleared: false,
    establishesVedicRuleset: false,
    establishesFullVedicEngineeringClosure: false
  })) {
    fail("SHARED_DEPENDENCY_BOUNDARY_INVALID");
  }
  if (!exactJson(manifest.currentnessBoundary, {
    parentV2PrivateBrandVerified: true,
    currentFiveAllowlistedAuthoredRootMachineIdentityMechanicallyVerified: true,
    currentEngineeringManifestMechanicallyVerified: true,
    currentFullDomainManifestMechanicallyVerified: false,
    entireVedicEngineeringClosureEstablished: false,
    productIdentityEstablished: false,
    ownerPromotionDecisionReceipt: null
  })) {
    fail("CURRENTNESS_BOUNDARY_INVALID");
  }
  const gate = manifest.gateState;
  if (gate?.admissionGatesRequired !== 8 || gate?.admissionGatesSatisfied !== 0
      || gate?.bindingRequired !== 38 || gate?.bindingFrozenVerified !== 0
      || gate?.independentExpertsRequired !== 2
      || gate?.independentExpertReviewsVerified !== 0
      || gate?.sourceBundleComplete !== false || gate?.rightsBundleComplete !== false
      || gate?.expertReviewBundleComplete !== false || gate?.highRiskPolicyBound !== false
      || gate?.releaseEvidenceComplete !== false) fail("GATE_BOUNDARY_INVALID");
  requireAllFalse(manifest.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  if (!exactJson(manifest.authorityBoundary, allFalseBoundary())) {
    fail("AUTHORITY_BOUNDARY_KEYS_INVALID");
  }
  if (!exactJson(manifest.observationBoundary, {
    heldHandlePerFileSnapshots: true,
    directoryAndFileEndpointCheckpointComparison: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false,
    manifestDigestIsDigitalSignature: false,
    rawIdentitiesAreDigitalSignatures: false
  })) {
    fail("MUTATION_BOUNDARY_PROMOTION_FORBIDDEN");
  }
  if (!exactJson(manifest.runtimeTrustBoundary, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  }) || !exactJson(manifest.evidenceLedger, {
    engineeringEvidence:
      "current_exact_five_allowlisted_authored_root_recursive_machine_identity",
    browserAndRuntimeEvidence: "not_reverified_by_this_manifest",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsAndLegalJudgment: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  }) || !exactJson(manifest.doesNotEstablish, [
    "all_files_inside_excluded_runtime_subtrees_or_entire_physical_root_closure",
    "entire_vedic_engineering_or_product_file_closure",
    "current_full_domain_manifest_or_formal_admission",
    "formal_input_fact_execution_interpretation_or_report_contract",
    "source_body_exact_quote_frozen_binding_or_three_layer_rights",
    "content_truth_real_expert_truth_or_domain_authority",
    "runtime_storage_product_release_schema_migration_or_central_registry_identity",
    "browser_pwa_service_worker_public_host_or_product_runtime_evidence",
    "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
    "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
    "legacy_v13_or_bazi_authority_inheritance"
  ])) fail("EVIDENCE_LEDGER_OR_RUNTIME_BOUNDARY_INVALID");
  if (!SHA256.test(manifest.manifestDigest ?? "")
      || computeVedicIndependentEngineeringManifestV3Digest(manifest)
        !== manifest.manifestDigest) fail("MANIFEST_DIGEST_INVALID");
  return manifest;
}

export async function buildCurrentVedicIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd(),
  testHooks = undefined
) {
  const inputs = await collectInputs(workspaceRoot, testHooks);
  return deepFreeze(assertBoundary(buildProjection(inputs)));
}

export async function loadVedicIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentVedicIndependentEngineeringManifestV3(workspaceRoot);
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH
    );
  } catch (cause) {
    fail("PERSISTED_MANIFEST_STABLE_READ_FAILED", "Vedic v3 manifest 不可稳定读取。", cause);
  }
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot));
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeVedicIndependentEngineeringManifestV3(persisted)) {
    fail("MANIFEST_MATERIALIZATION_INVALID");
  }
  if (!exactJson(persisted, expected)) fail("CURRENT_MANIFEST_MISMATCH");
  if (EXPECTED_PERSISTED.rawBytes > 0
      && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
        || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
        || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH");
  }
  const result = deepFreeze({
    artifact: {
      path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    manifest: clone(persisted),
    manifestDigest: persisted.manifestDigest,
    mechanicallyVerified: true
  });
  BRAND.add(result);
  return result;
}

export function isVerifiedVedicIndependentEngineeringManifestV3(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value)
    && BRAND.has(value);
}

export function getVedicIndependentEngineeringManifestV3Summary(value) {
  if (!isVerifiedVedicIndependentEngineeringManifestV3(value)) {
    fail("VERIFIED_BRAND_REQUIRED");
  }
  const manifest = value.manifest;
  return deepFreeze({
    artifact: clone(value.artifact),
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    allowlistedRootCount: manifest.recursiveAuthoredRootClosure.allowlistedRootCount,
    authoredOrdinaryFileCount:
      manifest.recursiveAuthoredRootClosure.observedAuthoredOrdinaryFileCount,
    additionalDiscoveredFileCount:
      manifest.parentV2Partition.additionalDiscoveredFileCount,
    excludedRuntimeSubtreeCount:
      manifest.recursiveAuthoredRootClosure.excludedRuntimeSubtreeCount,
    currentEngineeringManifestMechanicallyVerified:
      manifest.currentnessBoundary.currentEngineeringManifestMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.currentnessBoundary.currentFullDomainManifestMechanicallyVerified,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    independentExpertReviewsVerified:
      manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    productIdentity: manifest.productBoundary.productIdentity,
    releaseIdentity: manifest.productBoundary.releaseIdentity,
    targetSchema: manifest.productBoundary.targetSchema,
    migrationId: manifest.productBoundary.migrationId,
    releaseReady: manifest.authorityBoundary.releaseReady,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized
  });
}

export const vedicIndependentEngineeringManifestV3TestOnly = deepFreeze({
  MANIFEST_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  PARENT_IDENTITY,
  ALLOWLISTED_ROOTS,
  EXCLUDED_RUNTIME_SUBTREES,
  EXPECTED_AUTHORED_PATHS,
  EXPECTED_ADDITIONAL_PATHS,
  EXPECTED_ROOT_COUNTS,
  EXPECTED_PERSISTED,
  compact,
  exactJson,
  assertBoundary,
  enumerateAllowlistedAuthoredRoots,
  collectRecursiveRootClosure,
  buildProjection,
  collectInputs
});
