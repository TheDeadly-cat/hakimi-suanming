import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  independentDomainManifestTestOnly as domainTestOnly,
  parseIndependentDomainManifestJsonBytes
} from "./independent-domain-release-manifest-lib.mjs";
import {
  isVerifiedZiweiIndependentEngineeringManifestV3,
  loadZiweiIndependentEngineeringManifestV3
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";

export const ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH =
  "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v4.json";

const MANIFEST_ID =
  "hakimi.ziwei-doushu.four-package-authored-source-root-machine-identity-manifest/4.0.0";
const RECORD_TYPE = "ziwei_four_package_authored_source_root_machine_identity_manifest_v4";
const STATUS = "current_four_package_authored_source_root_machine_identity_zero_admission_effect";
const CREATED_AT = "2026-09-03T05:10:47.068Z";
const DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.four-package-authored-source-root-machine-identity-manifest.v4";
const TREE_DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.four-package-authored-source-root-tree.v4";
const PATH_SET_DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.four-package-authored-source-root-path-set.v4";
const MAX_MANIFEST_BYTES = 1_000_000;
const MAX_AUTHORED_FILE_BYTES = 5_000_000;
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const PACKAGE_ROOTS = Object.freeze([
  "packages/ziwei-doushu-contracts-draft",
  "packages/ziwei-fortel-differential-draft",
  "packages/ziwei-iztro-adapter-draft",
  "packages/ziwei-workspace-artifact-draft"
]);

const EXCLUDED_GENERATED_SUBTREES = Object.freeze(PACKAGE_ROOTS.flatMap((root) => [
  `${root}/dist`,
  `${root}/node_modules`
]));

// This existing empty directory carries no file bytes and is permitted but is
// deliberately not promoted into the authored-file identity.
const EXPECTED_EMPTY_DIRECTORIES = Object.freeze([
  "packages/ziwei-fortel-differential-draft/fixtures"
]);

const EXPECTED_AUTHORED_PATHS = Object.freeze([
  "packages/ziwei-doushu-contracts-draft/README.md",
  "packages/ziwei-doushu-contracts-draft/package.json",
  "packages/ziwei-doushu-contracts-draft/src/index.test.ts",
  "packages/ziwei-doushu-contracts-draft/src/index.ts",
  "packages/ziwei-doushu-contracts-draft/tsconfig.json",
  "packages/ziwei-fortel-differential-draft/README.md",
  "packages/ziwei-fortel-differential-draft/package.json",
  "packages/ziwei-fortel-differential-draft/src/contract-bridge.ts",
  "packages/ziwei-fortel-differential-draft/src/demo.ts",
  "packages/ziwei-fortel-differential-draft/src/fortel-worker-entry.mjs",
  "packages/ziwei-fortel-differential-draft/src/fortel-ziweidoushu-1.3.4-lock-closure.json",
  "packages/ziwei-fortel-differential-draft/src/index.test.ts",
  "packages/ziwei-fortel-differential-draft/src/index.ts",
  "packages/ziwei-fortel-differential-draft/src/iztro-adapter-bridge.ts",
  "packages/ziwei-fortel-differential-draft/tsconfig.json",
  "packages/ziwei-iztro-adapter-draft/README.md",
  "packages/ziwei-iztro-adapter-draft/browser-preview/emit-rule-snapshot.mjs",
  "packages/ziwei-iztro-adapter-draft/browser-preview/index.html",
  "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-2025.json",
  "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
  "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
  "packages/ziwei-iztro-adapter-draft/licenses/iztro-2.5.8-LICENSE.txt",
  "packages/ziwei-iztro-adapter-draft/package.json",
  "packages/ziwei-iztro-adapter-draft/scripts/audit-hko-calendar-boundary-matrix.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-artifact.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-artifact.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-protocol.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-worker.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/core-minor-star-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/core-minor-star-sanfang-review-feedback.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/core-minor-star-sanfang-review.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/display-projection.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/generated-browser-source-identity.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/generated-rule-snapshot.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-policy.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-view.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/main-response-gate.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/main.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-combination-review.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-palace-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-synthesis-review.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-palace-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-palace-review-feedback.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-review.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/palace-first-synthesis-review.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/palace-four-part-synthesis-content.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/styles.css",
  "packages/ziwei-iztro-adapter-draft/src/contract-bridge.ts",
  "packages/ziwei-iztro-adapter-draft/src/core-minor-star-sanfang-review-feedback.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.ts",
  "packages/ziwei-iztro-adapter-draft/src/demo.ts",
  "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-policy.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-view.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/index.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/index.ts",
  "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
  "packages/ziwei-iztro-adapter-draft/src/natal-transformation-palace-review-feedback.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/node-worker-entry.mjs",
  "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.ts",
  "packages/ziwei-iztro-adapter-draft/tsconfig.browser-preview.json",
  "packages/ziwei-iztro-adapter-draft/tsconfig.json",
  "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs",
  "packages/ziwei-workspace-artifact-draft/README.md",
  "packages/ziwei-workspace-artifact-draft/browser-app/index.html",
  "packages/ziwei-workspace-artifact-draft/e2e/core-minor-sanfang-review-v013.spec.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/same-artifact-summary-reporter.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/workspace-browser-gate.spec.ts",
  "packages/ziwei-workspace-artifact-draft/package.json",
  "packages/ziwei-workspace-artifact-draft/playwright.same-artifact-evidence.config.ts",
  "packages/ziwei-workspace-artifact-draft/playwright.v013.config.ts",
  "packages/ziwei-workspace-artifact-draft/playwright.workspace.config.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-app/main.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-app/styles.css",
  "packages/ziwei-workspace-artifact-draft/src/browser-artifact-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-calculation-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-persistence.test.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-persistence.ts",
  "packages/ziwei-workspace-artifact-draft/src/contract-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/src/demo.ts",
  "packages/ziwei-workspace-artifact-draft/src/index.test.ts",
  "packages/ziwei-workspace-artifact-draft/src/index.ts",
  "packages/ziwei-workspace-artifact-draft/src/iztro-adapter-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/tsconfig.browser-app.json",
  "packages/ziwei-workspace-artifact-draft/tsconfig.json",
  "packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs",
  "packages/ziwei-workspace-artifact-draft/vite.same-artifact-evidence.config.mjs"
]);

const EXPECTED_NEWLY_COVERED_PATHS = Object.freeze([
  "packages/ziwei-doushu-contracts-draft/src/index.test.ts",
  "packages/ziwei-fortel-differential-draft/src/contract-bridge.ts",
  "packages/ziwei-fortel-differential-draft/src/demo.ts",
  "packages/ziwei-fortel-differential-draft/src/fortel-worker-entry.mjs",
  "packages/ziwei-fortel-differential-draft/src/index.test.ts",
  "packages/ziwei-fortel-differential-draft/src/index.ts",
  "packages/ziwei-fortel-differential-draft/src/iztro-adapter-bridge.ts",
  "packages/ziwei-fortel-differential-draft/tsconfig.json",
  "packages/ziwei-iztro-adapter-draft/browser-preview/index.html",
  "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-2025.json",
  "packages/ziwei-iztro-adapter-draft/scripts/audit-hko-calendar-boundary-matrix.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-artifact.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/styles.css",
  "packages/ziwei-iztro-adapter-draft/src/core-minor-star-sanfang-review-feedback.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/demo.ts",
  "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-policy.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-view.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/index.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/natal-transformation-palace-review-feedback.test.ts",
  "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.test.ts",
  "packages/ziwei-iztro-adapter-draft/tsconfig.browser-preview.json",
  "packages/ziwei-workspace-artifact-draft/e2e/core-minor-sanfang-review-v013.spec.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/same-artifact-summary-reporter.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/workspace-browser-gate.spec.ts",
  "packages/ziwei-workspace-artifact-draft/playwright.same-artifact-evidence.config.ts",
  "packages/ziwei-workspace-artifact-draft/playwright.v013.config.ts",
  "packages/ziwei-workspace-artifact-draft/playwright.workspace.config.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-persistence.test.ts",
  "packages/ziwei-workspace-artifact-draft/src/demo.ts",
  "packages/ziwei-workspace-artifact-draft/src/index.test.ts",
  "packages/ziwei-workspace-artifact-draft/src/iztro-adapter-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/tsconfig.browser-app.json"
]);

const ROOT_FILE_COUNTS = Object.freeze({
  "packages/ziwei-doushu-contracts-draft": 5,
  "packages/ziwei-fortel-differential-draft": 10,
  "packages/ziwei-iztro-adapter-draft": 52,
  "packages/ziwei-workspace-artifact-draft": 24
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 40_230,
  rawSha256: "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e",
  manifestDigest: "46c2784875462e1851d0e3c7e352163660fbe29916e6ad6abd4f50065db42170"
});

const VERIFIED_RESULTS = new WeakSet();

export class ZiweiIndependentEngineeringManifestV4Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "ZiweiIndependentEngineeringManifestV4Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new ZiweiIndependentEngineeringManifestV4Error(code, message, cause);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizedJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) fail("NON_JSON_VALUE", "manifest 不能包含循环引用。");
  seen.add(value);
  if (Array.isArray(value)) {
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("SPARSE_ARRAY", "manifest 数组必须 dense。");
      output.push(normalizedJson(value[index], seen));
    }
    seen.delete(value);
    return output;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("NON_PLAIN_OBJECT", "manifest 只接受 plain JSON object。");
  }
  const output = Object.create(null);
  for (const key of Object.keys(value).sort(compareCodeUnits)) {
    output[key] = normalizedJson(value[key], seen);
  }
  seen.delete(value);
  return output;
}

function canonicalStringify(value) {
  return JSON.stringify(normalizedJson(value));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(normalizedJson(value)));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizePathIdentity(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLocaleLowerCase("en-US") : resolved;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`)
    && relative !== ".." && !path.isAbsolute(relative));
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath === ""
    || relativePath.includes("\\") || path.posix.isAbsolute(relativePath)
    || /^[A-Za-z]:/u.test(relativePath) || relativePath.includes("\0")) {
    fail("PATH_INVALID", "authored source path 必须是规范 POSIX 相对路径。");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.includes(":"))) {
    fail("PATH_ESCAPE", `authored source path 越界：${relativePath}`);
  }
  return parts;
}

function resolveInsideWorkspace(workspaceRoot, relativePath) {
  const parts = validateRelativePath(relativePath);
  const candidate = path.resolve(workspaceRoot, ...parts);
  if (!insideRoot(workspaceRoot, candidate)) fail("PATH_ESCAPE", relativePath);
  return candidate;
}

function expectedDirectorySet() {
  const directories = new Set(PACKAGE_ROOTS);
  for (const directory of EXPECTED_EMPTY_DIRECTORIES) directories.add(directory);
  for (const filePath of EXPECTED_AUTHORED_PATHS) {
    let current = path.posix.dirname(filePath);
    while (current !== "." && !directories.has(current)) {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return directories;
}

const EXPECTED_DIRECTORIES = expectedDirectorySet();
const EXCLUDED_GENERATED_SUBTREE_SET = new Set(EXCLUDED_GENERATED_SUBTREES);

function assertConstants() {
  if (PACKAGE_ROOTS.length !== 4 || EXPECTED_AUTHORED_PATHS.length !== 91
    || EXCLUDED_GENERATED_SUBTREES.length !== 8 || EXPECTED_EMPTY_DIRECTORIES.length !== 1
    || EXPECTED_NEWLY_COVERED_PATHS.length !== 33) {
    fail("EXPECTED_CLOSURE_INVALID", "Ziwei v4 closure 常量计数漂移。");
  }
  for (const [values, label] of [
    [PACKAGE_ROOTS, "package roots"],
    [EXCLUDED_GENERATED_SUBTREES, "excluded generated subtrees"],
    [EXPECTED_EMPTY_DIRECTORIES, "expected empty directories"],
    [EXPECTED_NEWLY_COVERED_PATHS, "expected newly covered paths"],
    [EXPECTED_AUTHORED_PATHS, "expected authored paths"]
  ]) {
    let previous = "";
    const unique = new Set();
    for (const value of values) {
      if (typeof value !== "string" || value === "" || value <= previous || unique.has(value)) {
        fail("EXPECTED_CLOSURE_INVALID", `${label} 必须按 code-unit 严格排序且唯一。`);
      }
      previous = value;
      unique.add(value);
    }
  }
  for (const subtree of EXCLUDED_GENERATED_SUBTREES) {
    const root = PACKAGE_ROOTS.find((candidate) => subtree.startsWith(`${candidate}/`));
    const suffix = root === undefined ? "" : subtree.slice(root.length + 1);
    if (root === undefined || suffix.includes("/") || !["dist", "node_modules"].includes(suffix)) {
      fail("EXPECTED_CLOSURE_INVALID", "只允许排除 package-root 直属 dist/node_modules。");
    }
  }
  for (const filePath of EXPECTED_AUTHORED_PATHS) {
    if (!PACKAGE_ROOTS.some((root) => filePath.startsWith(`${root}/`))
      || EXCLUDED_GENERATED_SUBTREES.some((subtree) => filePath.startsWith(`${subtree}/`))) {
      fail("EXPECTED_CLOSURE_INVALID", `authored path 范围无效：${filePath}`);
    }
  }
}

async function requirePhysicalDirectory(absolutePath, label) {
  let stats;
  let resolved;
  try {
    stats = await lstat(absolutePath, { bigint: true });
    resolved = await realpath(absolutePath);
  } catch (cause) {
    fail("DIRECTORY_MISSING", `${label} 不存在。`, cause);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN", `${label} 必须是无 symlink/junction 或 resolved-path alias 的物理目录。`);
  }
  return Object.freeze({ stats, resolved });
}

async function enumerateAuthoredPaths(workspaceRootInput) {
  assertConstants();
  if (typeof workspaceRootInput !== "string" || workspaceRootInput === "") {
    fail("WORKSPACE_ROOT_INVALID", "workspace root 必须是非空字符串。");
  }
  const workspaceRoot = path.resolve(workspaceRootInput);
  await requirePhysicalDirectory(workspaceRoot, "workspace root");
  const discovered = [];

  async function walk(relativeDirectory) {
    const absoluteDirectory = resolveInsideWorkspace(workspaceRoot, relativeDirectory);
    await requirePhysicalDirectory(absoluteDirectory, relativeDirectory);
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (cause) {
      fail("DIRECTORY_READ_FAILED", relativeDirectory, cause);
    }
    entries.sort((left, right) => compareCodeUnits(left.name, right.name));
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`.replaceAll("\\", "/");
      const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
      let stats;
      let resolved;
      try {
        stats = await lstat(absolutePath, { bigint: true });
        resolved = await realpath(absolutePath);
      } catch (cause) {
        fail("ENDPOINT_CHANGED", relativePath, cause);
      }
      if (stats.isSymbolicLink() || entry.isSymbolicLink()
        || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
        fail("SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN", relativePath);
      }
      if (entry.isDirectory() && stats.isDirectory()) {
        if (EXCLUDED_GENERATED_SUBTREE_SET.has(relativePath)) continue;
        if (!EXPECTED_DIRECTORIES.has(relativePath)) {
          fail("UNEXPECTED_DIRECTORY", relativePath);
        }
        await walk(relativePath);
      } else if (entry.isFile() && stats.isFile()) {
        discovered.push(relativePath);
      } else {
        fail("ENDPOINT_TYPE_FORBIDDEN", relativePath);
      }
    }
  }

  for (const root of PACKAGE_ROOTS) {
    await requirePhysicalDirectory(resolveInsideWorkspace(workspaceRoot, root), root);
    await walk(root);
  }
  discovered.sort(compareCodeUnits);
  const unique = new Set();
  const caseFolded = new Set();
  for (const filePath of discovered) {
    if (unique.has(filePath)) fail("DUPLICATE_PATH", filePath);
    const folded = filePath.toLocaleLowerCase("en-US");
    if (caseFolded.has(folded)) fail("CASE_FOLD_ALIAS", filePath);
    unique.add(filePath);
    caseFolded.add(folded);
  }
  if (!exactJson(discovered, EXPECTED_AUTHORED_PATHS)) {
    fail("AUTHORED_PATH_SET_MISMATCH", "Ziwei 四 package authored file set 漂移。");
  }
  return Object.freeze(discovered);
}

async function collectTreePass(workspaceRoot) {
  const paths = await enumerateAuthoredPaths(workspaceRoot);
  const files = [];
  for (const relativePath of paths) {
    const snapshot = await domainTestOnly.readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      MAX_AUTHORED_FILE_BYTES
    );
    files.push(Object.freeze({
      path: relativePath,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    }));
  }
  return Object.freeze(files);
}

async function collectAuthoredTreeIdentity(workspaceRoot, testHooks = undefined) {
  const beforeFiles = await collectTreePass(workspaceRoot);
  const treeDigestBefore = domainDigest(TREE_DIGEST_DOMAIN, beforeFiles);
  if (typeof testHooks?.afterFirstPass === "function") {
    await testHooks.afterFirstPass(Object.freeze({ beforeFiles, treeDigestBefore }));
  }
  const afterFiles = await collectTreePass(workspaceRoot);
  const treeDigestAfter = domainDigest(TREE_DIGEST_DOMAIN, afterFiles);
  if (!exactJson(beforeFiles, afterFiles) || treeDigestBefore !== treeDigestAfter) {
    fail("TREE_PRE_POST_MISMATCH", "Ziwei authored tree 在两次完整快照之间漂移。");
  }
  return deepFreeze({
    files: beforeFiles,
    pathSetDigest: domainDigest(
      PATH_SET_DIGEST_DOMAIN,
      beforeFiles.map((entry) => entry.path)
    ),
    treeDigestBefore,
    treeDigestAfter,
    prePostTreeDigestEqual: true
  });
}

function rootFileCounts(files) {
  const counts = Object.fromEntries(PACKAGE_ROOTS.map((root) => [root, 0]));
  for (const file of files) {
    const root = PACKAGE_ROOTS.find((candidate) => file.path.startsWith(`${candidate}/`));
    if (root === undefined) fail("FILE_OUTSIDE_ROOTS", file.path);
    counts[root] += 1;
  }
  return counts;
}

function requireVerifiedPredecessor(value) {
  if (!isVerifiedZiweiIndependentEngineeringManifestV3(value)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED", "Ziwei v4 只接受 v3 fixed-path full-loader 私有品牌。");
  }
  return value;
}

function flattenKnownOmissions(predecessorManifest) {
  const byRoot = predecessorManifest.scopeOmissions?.knownOmittedNonRuntimePathsAtAuthoringByRoot;
  if (byRoot === null || typeof byRoot !== "object" || Array.isArray(byRoot)) {
    fail("PREDECESSOR_OMISSION_BOUNDARY_INVALID", "v3 omission ledger 缺失。");
  }
  const paths = [];
  for (const root of PACKAGE_ROOTS) {
    const entries = byRoot[root];
    if (!Array.isArray(entries)) fail("PREDECESSOR_OMISSION_BOUNDARY_INVALID", root);
    paths.push(...entries);
  }
  paths.sort(compareCodeUnits);
  return paths;
}

function buildProjection(predecessor, treeIdentity) {
  requireVerifiedPredecessor(predecessor);
  const predecessorManifest = predecessor.manifest;
  const predecessorPackagePaths = predecessorManifest.selectedClosure.files
    .map((entry) => entry.path)
    .filter((filePath) => PACKAGE_ROOTS.some((root) => filePath.startsWith(`${root}/`)))
    .sort(compareCodeUnits);
  const predecessorPackageSet = new Set(predecessorPackagePaths);
  const newlyCoveredPaths = EXPECTED_AUTHORED_PATHS.filter(
    (filePath) => !predecessorPackageSet.has(filePath)
  );
  const predecessorOmissions = flattenKnownOmissions(predecessorManifest);
  if (predecessorPackagePaths.length !== 58 || newlyCoveredPaths.length !== 33
    || predecessorManifest.scopeOmissions.knownOmittedNonRuntimePathsAtAuthoringTotal !== 33
    || !exactJson(newlyCoveredPaths, predecessorOmissions)
    || !exactJson(newlyCoveredPaths, EXPECTED_NEWLY_COVERED_PATHS)) {
    fail("PREDECESSOR_DELTA_MISMATCH", "v3 selected path 与 v4 authored root 差集不是固定 33 项。");
  }
  const fileByPath = new Map(treeIdentity.files.map((entry) => [entry.path, entry]));
  const newlyCoveredExtra = newlyCoveredPaths.map((filePath) => {
    const file = fileByPath.get(filePath);
    if (file === undefined) fail("NEWLY_COVERED_FILE_MISSING", filePath);
    return {
      ...file,
      coverageMeaning: "authored_source_identity_only",
      priorState: "known_v3_unselected_nonruntime_path",
      authorizationClaimed: false
    };
  });
  const unsigned = {
    schemaVersion: "4.0.0",
    recordType: RECORD_TYPE,
    manifestId: MANIFEST_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    releaseStatus: "draft",
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "ziwei",
      productSystemId: "ziwei-doushu",
      systemId: "ziwei"
    },
    lineage: {
      appendOnlySuccessor: true,
      predecessorModified: false,
      predecessorBacklinkAdded: false,
      predecessor: {
        role: "current_selected_path_manifest_v3_private_brand_parent",
        path: predecessor.artifact.path,
        rawBytes: predecessor.artifact.bytes,
        rawSha256: predecessor.artifact.sha256,
        manifestId: predecessorManifest.manifestId,
        manifestDigest: predecessor.manifestDigest,
        privateBrandRequired: true,
        currentFullLoaderVerified: true
      },
      predecessorSelectedPackageFileCount: predecessorPackagePaths.length,
      newlyCoveredExtraCount: newlyCoveredExtra.length
    },
    authoredSourceRootClosure: {
      scopeClass: "four_explicit_ziwei_package_authored_source_roots_exact_not_domain_product_or_dependency_closure",
      fourPackageAuthoredSourceRootsExact: true,
      packageRootCount: PACKAGE_ROOTS.length,
      packageRoots: [...PACKAGE_ROOTS],
      excludedGeneratedSubtrees: [...EXCLUDED_GENERATED_SUBTREES],
      excludedGeneratedSubtreeContentsBound: false,
      exclusionLimitedToDirectDistAndNodeModules: true,
      recursiveEnumerationPerformed: true,
      ordinarySingleLinkFilesOnly: true,
      symlinkJunctionAndResolvedPathAliasRejected: true,
      genericNtfsReparseTagEnumerated: false,
      allReparseClassesExcluded: false,
      pathEscapeAndRootAliasRejected: true,
      unexpectedNonExcludedFileOrDirectoryRejected: true,
      authoredFileCount: treeIdentity.files.length,
      rootFileCounts: rootFileCounts(treeIdentity.files),
      files: cloneJson(treeIdentity.files),
      pathSetDigest: treeIdentity.pathSetDigest,
      treeDigestAlgorithm: "sha256_domain_separated_canonical_file_evidence_v1",
      treeDigestBefore: treeIdentity.treeDigestBefore,
      treeDigestAfter: treeIdentity.treeDigestAfter,
      prePostTreeDigestEqual: true,
      newlyCoveredExtra: cloneJson(newlyCoveredExtra),
      newlyCoveredExtraCount: newlyCoveredExtra.length,
      newlyCoveredExtraAuthorizationClaimed: false,
      completeInstalledDependencyClosureEstablished: false,
      completeRepositoryClosureEstablished: false,
      entireZiweiEngineeringClosureEstablished: false,
      entireZiweiDomainClosureEstablished: false,
      entireZiweiProductClosureEstablished: false
    },
    componentBoundary: {
      predecessorComponentLedgerRetainedByReference: true,
      v4ReclassifiesNewlyCoveredFilesSemantically: false,
      semanticComponentMembershipEstablished: false,
      componentCompletenessEstablished: false,
      domainTruthEstablished: false
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 27,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertIdentityQualificationIndependenceEstablished: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      redistributionAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false,
      safeToPublish: false
    },
    projectDefaultReleaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      inheritedByThisSystem: false,
      mutationEpochBoundaryRequired: true
    },
    productBoundary: {
      formalProductSurface: "absent",
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      mainApplicationIntegrated: false,
      pwaOrServiceWorkerValidated: false,
      publicHostValidated: false
    },
    observationBoundary: {
      endpointObservationOnly: true,
      sameHeldHandleHashAndReadPerFile: true,
      completeTreeReadTwice: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      prePostDigestEqualityIsNotIntervalProof: true,
      digestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      trustedTimestampEstablished: false
    },
    runtimeTrustBoundary: {
      cliOutputTrustedAttestation: false,
      hiddenPreEvaluationCodeExcluded: false,
      launcherIdentityEstablished: false,
      loaderIdentityEstablished: false,
      nodeRuntimeIdentityEstablished: false,
      toolAttestationEstablished: false
    },
    versionBoundary: {
      currentPredecessorSelectedPathManifestMechanicallyVerified: true,
      currentFourPackageAuthoredSourceRootManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      entireZiweiEngineeringClosureEstablished: false,
      productIdentityEstablished: false,
      ownerPromotionDecisionReceipt: null
    },
    evidenceLedgerSeparation: [
      { accountId: "engineering_evidence", state: "four_package_authored_source_root_identity_observed" },
      { accountId: "browser_runtime_evidence", state: "not_established_by_this_manifest" },
      { accountId: "content_truth", state: "not_established" },
      { accountId: "expert_truth", state: "not_established" },
      { accountId: "rights_legal_judgment", state: "not_established" },
      { accountId: "release_readiness", state: "not_ready" },
      { accountId: "public_release_authorization", state: "not_authorized" }
    ],
    doesNotEstablish: [
      "complete_repository_installed_dependency_build_tooling_or_runtime_closure",
      "entire_ziwei_engineering_domain_or_product_closure",
      "semantic_component_membership_component_completeness_or_domain_truth",
      "source_body_exact_quote_frozen_binding_or_complete_source_bundle",
      "work_edition_carrier_rights_legal_conclusion_or_redistribution_authorization",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "browser_runtime_full_application_pwa_service_worker_public_host_or_fixed_device_evidence",
      "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion",
      "trusted_runtime_launcher_loader_node_tool_time_signature_or_signer_identity",
      "formal_admission_release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return { ...unsigned, manifestDigest: domainDigest(DIGEST_DOMAIN, unsigned) };
}

export function computeZiweiIndependentEngineeringManifestV4Digest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.manifestDigest;
  return domainDigest(DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyZiweiIndependentEngineeringManifestV4(value) {
  return `${JSON.stringify(normalizedJson(value), null, 2)}\n`;
}

export function parseZiweiIndependentEngineeringManifestV4JsonBytes(
  bytes,
  label = "Ziwei independent engineering manifest v4 JSON"
) {
  return normalizedJson(parseIndependentDomainManifestJsonBytes(bytes, label, MAX_MANIFEST_BYTES));
}

function requireFixedBoundary(value) {
  const manifest = normalizedJson(value);
  const closure = manifest.authoredSourceRootClosure;
  if (manifest.schemaVersion !== "4.0.0" || manifest.recordType !== RECORD_TYPE
    || manifest.manifestId !== MANIFEST_ID || manifest.status !== STATUS
    || manifest.releaseStatus !== "draft" || manifest.activeAdmissionEffect !== "none"
    || manifest.lineage?.appendOnlySuccessor !== true
    || manifest.lineage?.predecessorModified !== false
    || manifest.lineage?.predecessorBacklinkAdded !== false
    || manifest.lineage?.predecessor?.privateBrandRequired !== true
    || manifest.lineage?.predecessor?.currentFullLoaderVerified !== true
    || manifest.lineage?.predecessorSelectedPackageFileCount !== 58
    || manifest.lineage?.newlyCoveredExtraCount !== 33
    || closure?.scopeClass !== "four_explicit_ziwei_package_authored_source_roots_exact_not_domain_product_or_dependency_closure"
    || closure?.fourPackageAuthoredSourceRootsExact !== true
    || closure?.packageRootCount !== 4 || closure?.authoredFileCount !== 91
    || closure?.newlyCoveredExtraCount !== 33
    || closure?.newlyCoveredExtra?.length !== 33
    || closure?.newlyCoveredExtraAuthorizationClaimed !== false
    || closure?.excludedGeneratedSubtreeContentsBound !== false
    || closure?.exclusionLimitedToDirectDistAndNodeModules !== true
    || closure?.recursiveEnumerationPerformed !== true
    || closure?.ordinarySingleLinkFilesOnly !== true
    || closure?.symlinkJunctionAndResolvedPathAliasRejected !== true
    || closure?.genericNtfsReparseTagEnumerated !== false
    || closure?.allReparseClassesExcluded !== false
    || closure?.pathEscapeAndRootAliasRejected !== true
    || closure?.unexpectedNonExcludedFileOrDirectoryRejected !== true
    || closure?.prePostTreeDigestEqual !== true
    || closure?.completeInstalledDependencyClosureEstablished !== false
    || closure?.completeRepositoryClosureEstablished !== false
    || closure?.entireZiweiEngineeringClosureEstablished !== false
    || closure?.entireZiweiDomainClosureEstablished !== false
    || closure?.entireZiweiProductClosureEstablished !== false
    || !exactJson(closure?.packageRoots, PACKAGE_ROOTS)
    || !exactJson(closure?.excludedGeneratedSubtrees, EXCLUDED_GENERATED_SUBTREES)
    || !exactJson(closure?.rootFileCounts, ROOT_FILE_COUNTS)
    || closure?.files?.length !== 91
    || closure?.treeDigestAlgorithm !== "sha256_domain_separated_canonical_file_evidence_v1"
    || !LOWERCASE_SHA256.test(closure?.pathSetDigest ?? "")
    || !LOWERCASE_SHA256.test(closure?.treeDigestBefore ?? "")
    || closure?.treeDigestAfter !== closure?.treeDigestBefore
    || manifest.componentBoundary?.v4ReclassifiesNewlyCoveredFilesSemantically !== false
    || manifest.componentBoundary?.semanticComponentMembershipEstablished !== false
    || manifest.componentBoundary?.componentCompletenessEstablished !== false
    || manifest.gateState?.admissionGatesRequired !== 8
    || manifest.gateState?.admissionGatesSatisfied !== 0
    || manifest.gateState?.bindingRequired !== 27
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.independentExpertsRequired !== 2
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.authorityBoundary?.contentTruthEstablished !== false
    || manifest.authorityBoundary?.domainAuthorityAuthorized !== false
    || manifest.authorityBoundary?.expertClaimsAuthorized !== false
    || manifest.authorityBoundary?.expertIdentityQualificationIndependenceEstablished !== false
    || manifest.authorityBoundary?.expertTruthEstablished !== false
    || manifest.authorityBoundary?.formalAdmissionAuthorized !== false
    || manifest.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest.authorityBoundary?.redistributionAuthorized !== false
    || manifest.authorityBoundary?.releaseReady !== false
    || manifest.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest.authorityBoundary?.safeToPublish !== false
    || manifest.gateState?.sourceBundleComplete !== false
    || manifest.gateState?.rightsBundleComplete !== false
    || manifest.gateState?.expertReviewBundleComplete !== false
    || manifest.gateState?.highRiskPolicyBound !== false
    || manifest.gateState?.releaseEvidenceComplete !== false
    || manifest.projectDefaultReleaseGovernance?.activeLine !== "legacy-v13"
    || manifest.projectDefaultReleaseGovernance?.targetSchema !== 13
    || manifest.projectDefaultReleaseGovernance?.migrationId !== null
    || manifest.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false
    || manifest.projectDefaultReleaseGovernance?.mutationEpochBoundaryRequired !== true
    || manifest.productBoundary?.formalProductSurface !== "absent"
    || manifest.productBoundary?.productIdentity !== null
    || manifest.productBoundary?.releaseIdentity !== null
    || manifest.productBoundary?.targetSchema !== null
    || manifest.productBoundary?.migrationId !== null
    || manifest.productBoundary?.mainApplicationIntegrated !== false
    || manifest.productBoundary?.pwaOrServiceWorkerValidated !== false
    || manifest.productBoundary?.publicHostValidated !== false
    || manifest.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest.observationBoundary?.mutationEpochAvailable !== false
    || manifest.observationBoundary?.mutationEpochReceipt !== null
    || manifest.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || manifest.observationBoundary?.abaExcluded !== false
    || manifest.observationBoundary?.prePostDigestEqualityIsNotIntervalProof !== true
    || manifest.observationBoundary?.digestIsDigitalSignature !== false
    || manifest.observationBoundary?.signerIdentityEstablished !== false
    || manifest.observationBoundary?.trustedTimestampEstablished !== false
    || manifest.runtimeTrustBoundary?.cliOutputTrustedAttestation !== false
    || manifest.runtimeTrustBoundary?.hiddenPreEvaluationCodeExcluded !== false
    || manifest.runtimeTrustBoundary?.launcherIdentityEstablished !== false
    || manifest.runtimeTrustBoundary?.loaderIdentityEstablished !== false
    || manifest.runtimeTrustBoundary?.nodeRuntimeIdentityEstablished !== false
    || manifest.runtimeTrustBoundary?.toolAttestationEstablished !== false
    || manifest.versionBoundary?.currentPredecessorSelectedPathManifestMechanicallyVerified !== true
    || manifest.versionBoundary?.currentFourPackageAuthoredSourceRootManifestMechanicallyVerified !== true
    || manifest.versionBoundary?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest.versionBoundary?.entireZiweiEngineeringClosureEstablished !== false
    || manifest.versionBoundary?.productIdentityEstablished !== false
    || manifest.versionBoundary?.ownerPromotionDecisionReceipt !== null
    || manifest.manifestDigest !== computeZiweiIndependentEngineeringManifestV4Digest(manifest)) {
    fail("RED_OR_SCOPE_BOUNDARY_MISMATCH", "Ziwei v4 scope、身份、证据或权限边界被抬高。");
  }
  const seen = new Set();
  for (const file of closure.files) {
    validateRelativePath(file?.path);
    if (seen.has(file.path) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0
      || !LOWERCASE_SHA256.test(file.sha256 ?? "")) {
      fail("FILE_EVIDENCE_INVALID", file?.path ?? "unknown");
    }
    seen.add(file.path);
  }
  if (!exactJson([...seen].sort(compareCodeUnits), EXPECTED_AUTHORED_PATHS)) {
    fail("FILE_EVIDENCE_PATH_SET_MISMATCH", "v4 persisted file evidence path set 漂移。");
  }
  if (closure.pathSetDigest !== domainDigest(
    PATH_SET_DIGEST_DOMAIN,
    closure.files.map((entry) => entry.path)
  ) || closure.treeDigestBefore !== domainDigest(TREE_DIGEST_DOMAIN, closure.files)) {
    fail("TREE_DIGEST_MISMATCH", "v4 persisted authored tree 摘要与文件证据不一致。");
  }
  if (!exactJson(rootFileCounts(closure.files), ROOT_FILE_COUNTS)) {
    fail("ROOT_FILE_COUNT_MISMATCH", "v4 persisted root file counts 漂移。");
  }
  const fileByPath = new Map(closure.files.map((entry) => [entry.path, entry]));
  const newlySeen = new Set();
  for (const entry of closure.newlyCoveredExtra) {
    if (entry?.coverageMeaning !== "authored_source_identity_only"
      || entry?.priorState !== "known_v3_unselected_nonruntime_path"
      || entry?.authorizationClaimed !== false || newlySeen.has(entry?.path)) {
      fail("NEWLY_COVERED_BOUNDARY_INVALID", entry?.path ?? "unknown");
    }
    const file = fileByPath.get(entry.path);
    if (file === undefined || entry.bytes !== file.bytes || entry.sha256 !== file.sha256) {
      fail("NEWLY_COVERED_EVIDENCE_MISMATCH", entry.path);
    }
    newlySeen.add(entry.path);
  }
  if (!exactJson([...newlySeen], EXPECTED_NEWLY_COVERED_PATHS)) {
    fail("NEWLY_COVERED_PATH_SET_MISMATCH", "v4 newlyCoveredExtra path set 漂移。");
  }
  return manifest;
}

function assertExpectedProjection(candidate, expected) {
  const normalized = requireFixedBoundary(candidate);
  if (!exactJson(normalized, expected)) {
    fail("CURRENT_MANIFEST_MISMATCH", "Ziwei v4 与当前四 package authored source root 投影不一致。");
  }
  return normalized;
}

export async function buildCurrentZiweiIndependentEngineeringManifestV4(
  workspaceRoot = process.cwd(),
  testHooks = undefined
) {
  const predecessor = await loadZiweiIndependentEngineeringManifestV3(workspaceRoot);
  requireVerifiedPredecessor(predecessor);
  const treeIdentity = await collectAuthoredTreeIdentity(workspaceRoot, testHooks);
  return deepFreeze(normalizedJson(requireFixedBoundary(buildProjection(predecessor, treeIdentity))));
}

export async function loadZiweiIndependentEngineeringManifestV4(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentZiweiIndependentEngineeringManifestV4(workspaceRoot);
  const snapshot = await domainTestOnly.readStableWorkspaceFile(
    workspaceRoot,
    ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
    MAX_MANIFEST_BYTES
  );
  const persisted = parseZiweiIndependentEngineeringManifestV4JsonBytes(snapshot.bytes);
  const canonicalText = canonicalPrettyStringifyZiweiIndependentEngineeringManifestV4(persisted);
  if (Buffer.byteLength(canonicalText, "utf8") !== snapshot.rawBytes
    || sha256Text(canonicalText) !== snapshot.rawSha256) {
    fail("MANIFEST_MATERIALIZATION_MISMATCH", "Ziwei v4 不是唯一 canonical LF materialization。");
  }
  assertExpectedProjection(persisted, expected);
  if (EXPECTED_PERSISTED.rawBytes !== 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "persisted Ziwei v4 冻结身份漂移。");
  }
  const result = deepFreeze(normalizedJson({
    artifact: {
      path: ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    manifest: persisted,
    manifestDigest: persisted.manifestDigest,
    mechanicallyVerified: true
  }));
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedZiweiIndependentEngineeringManifestV4(value) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value) && Object.isFrozen(value);
}

export function getZiweiIndependentEngineeringManifestV4Summary(value) {
  if (!isVerifiedZiweiIndependentEngineeringManifestV4(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受 Ziwei v4 fixed-path full-loader 私有品牌。");
  }
  const manifest = value.manifest;
  return deepFreeze(normalizedJson({
    activeAdmissionEffect: manifest.activeAdmissionEffect,
    artifact: value.artifact,
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    authoredFileCount: manifest.authoredSourceRootClosure.authoredFileCount,
    newlyCoveredExtraCount: manifest.authoredSourceRootClosure.newlyCoveredExtraCount,
    treeDigest: manifest.authoredSourceRootClosure.treeDigestBefore,
    prePostTreeDigestEqual: manifest.authoredSourceRootClosure.prePostTreeDigestEqual,
    bindingRequired: manifest.gateState.bindingRequired,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    independentExpertReviewsVerified: manifest.gateState.independentExpertReviewsVerified,
    currentFourPackageAuthoredSourceRootManifestMechanicallyVerified:
      manifest.versionBoundary.currentFourPackageAuthoredSourceRootManifestMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.versionBoundary.currentFullDomainManifestMechanicallyVerified,
    releaseReady: manifest.authorityBoundary.releaseReady,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized
  }));
}

export const ziweiIndependentEngineeringManifestV4TestOnly = Object.freeze({
  CREATED_AT,
  DIGEST_DOMAIN,
  EXCLUDED_GENERATED_SUBTREES,
  EXPECTED_EMPTY_DIRECTORIES,
  EXPECTED_AUTHORED_PATHS,
  EXPECTED_NEWLY_COVERED_PATHS,
  EXPECTED_PERSISTED,
  MANIFEST_ID,
  PACKAGE_ROOTS,
  RECORD_TYPE,
  ROOT_FILE_COUNTS,
  STATUS,
  assertConstants,
  assertExpectedProjection,
  collectAuthoredTreeIdentity,
  enumerateAuthoredPaths,
  exactJson,
  requireFixedBoundary,
  requireVerifiedPredecessor,
  resolveInsideWorkspace,
  sha256Bytes,
  sha256Text
});
