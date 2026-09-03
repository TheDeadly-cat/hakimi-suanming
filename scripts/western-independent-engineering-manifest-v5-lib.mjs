import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
  getWesternIndependentEngineeringManifestV4Summary,
  isVerifiedWesternIndependentEngineeringManifestV4,
  loadWesternIndependentEngineeringManifestV4
} from "./western-independent-engineering-manifest-v4-lib.mjs";

export const WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH =
  "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v5.json";

const MANIFEST_ID =
  "hakimi.western-astrology.six-allowlisted-authored-root-recursive-machine-identity-manifest/5.0.0";
const RECORD_TYPE =
  "western_six_allowlisted_authored_root_recursive_machine_identity_manifest_v5";
const STATUS =
  "current_six_allowlisted_authored_root_recursive_machine_identity_zero_admission_effect";
const CREATED_AT = "2026-09-03T07:30:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.western-astrology.six-allowlisted-authored-root-recursive-machine-identity-manifest.v5";
const TREE_DIGEST_DOMAIN =
  "hakimi.western-astrology.six-allowlisted-authored-root-tree.v5";
const PATH_SET_DIGEST_DOMAIN =
  "hakimi.western-astrology.six-allowlisted-authored-root-path-set.v5";
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_MANIFEST_BYTES = 1_000_000;

const ROOTS = Object.freeze([
  "isolated-drafts/western-civil-time-fact-browser-draft",
  "packages/tzdb-core",
  "packages/western-astrology-contracts-draft",
  "packages/western-astrology-rules-preview-draft",
  "packages/western-astronomy-engine-adapter-draft",
  "packages/western-civil-time-input-adapter-draft"
]);

const EXCLUDED_RUNTIME_SUBTREES = Object.freeze(ROOTS.flatMap((root) => [
  `${root}/.tmp`,
  `${root}/dist`,
  `${root}/node_modules`,
  `${root}/temp`,
  `${root}/tmp`
]));

const PREVIOUSLY_UNSELECTED_PATHS = Object.freeze([
  "isolated-drafts/western-civil-time-fact-browser-draft/README.md",
  "isolated-drafts/western-civil-time-fact-browser-draft/src/browser-fact-projection.test.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/src/civil-client.test.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/src/civil-time.test.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/src/ui-format.test.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/vitest.config.ts",
  "packages/tzdb-core/scripts/run-release-gate.mjs",
  "packages/tzdb-core/scripts/verify-artifact.mjs",
  "packages/tzdb-core/scripts/verify-artifact.test.mjs",
  "packages/tzdb-core/src/index.test.ts",
  "packages/western-civil-time-input-adapter-draft/README.md",
  "packages/western-civil-time-input-adapter-draft/package.json",
  "packages/western-civil-time-input-adapter-draft/src/index.test.ts",
  "packages/western-civil-time-input-adapter-draft/src/index.ts",
  "packages/western-civil-time-input-adapter-draft/tsconfig.json"
]);

const ROOT_FILE_COUNTS = Object.freeze({
  "isolated-drafts/western-civil-time-fact-browser-draft": 27,
  "packages/tzdb-core": 8,
  "packages/western-astrology-contracts-draft": 6,
  "packages/western-astrology-rules-preview-draft": 24,
  "packages/western-astronomy-engine-adapter-draft": 40,
  "packages/western-civil-time-input-adapter-draft": 5
});

const PARENT_IDENTITY = Object.freeze({
  path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
  rawBytes: 54_129,
  rawSha256: "05bc031267561e790b783bd0c06b10ecf0936af864a26a613800ffccfbe6854b",
  semanticDigest: "e61566259493c888a2e0de77c0886710b720df6fa61551ca4a6a2747803b313b"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 43_571,
  rawSha256: "8dfe4a25fb4194d8e9e7b53f8d5b786813b11db9a7ed11e8a88c4f96aad41904",
  manifestDigest: "3617e2bb812e64ea6a79c5a9c6660344e09ed85f5869ff1528415cab13f434b4"
});

const VERIFIED_RESULTS = new WeakSet();

const FALSE_AUTHORITY = Object.freeze({
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
});

export class WesternIndependentEngineeringManifestV5Error extends Error {
  constructor(code, detail = "", options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "WesternIndependentEngineeringManifestV5Error";
    this.code = code;
  }
}

function fail(code, detail = "", cause = undefined) {
  throw new WesternIndependentEngineeringManifestV5Error(
    code,
    detail,
    cause === undefined ? undefined : { cause }
  );
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonical(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) fail("NON_JSON_VALUE", "循环引用不是 JSON。 ");
  seen.add(value);
  if (Array.isArray(value)) {
    const output = value.map((entry, index) => {
      if (!Object.hasOwn(value, index)) fail("SPARSE_ARRAY", "数组必须 dense。 ");
      return canonical(entry, seen);
    });
    seen.delete(value);
    return output;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("NON_PLAIN_OBJECT", "只接受 plain JSON object。 ");
  }
  const output = Object.create(null);
  for (const key of Object.keys(value).sort(compare)) output[key] = canonical(value[key], seen);
  seen.delete(value);
  return output;
}

function compact(value) {
  return JSON.stringify(canonical(value));
}

function clone(value) {
  return JSON.parse(compact(value));
}

function exact(left, right) {
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
    fail("PATH_INVALID", String(relativePath));
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.includes(":"))) {
    fail("PATH_ESCAPE", relativePath);
  }
  return parts;
}

function resolveInsideWorkspace(workspaceRoot, relativePath) {
  const candidate = path.resolve(workspaceRoot, ...validateRelativePath(relativePath));
  if (!insideRoot(workspaceRoot, candidate)) fail("PATH_ESCAPE", relativePath);
  return candidate;
}

function endpointFingerprint(stats, resolved) {
  return {
    dev: String(stats.dev),
    ino: String(stats.ino),
    mode: String(stats.mode),
    nlink: String(stats.nlink),
    size: String(stats.size),
    mtimeNs: String(stats.mtimeNs),
    ctimeNs: String(stats.ctimeNs),
    resolved: normalizePathIdentity(resolved)
  };
}

async function requirePhysicalDirectory(absolutePath, label) {
  let stats;
  let resolved;
  try {
    [stats, resolved] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
  } catch (cause) {
    fail("ROOT_DIRECTORY_MISSING", label, cause);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("ROOT_SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN", label);
  }
  return endpointFingerprint(stats, resolved);
}

function rootFor(relativePath) {
  return ROOTS.find((root) => relativePath.startsWith(`${root}/`));
}

function assertSortedUnique(values, label) {
  const sorted = [...values].sort(compare);
  if (!exact(values, sorted) || new Set(values).size !== values.length) {
    fail("CONSTANT_SET_INVALID", label);
  }
}

function assertConstants() {
  if (ROOTS.length !== 6 || EXCLUDED_RUNTIME_SUBTREES.length !== 30
    || PREVIOUSLY_UNSELECTED_PATHS.length !== 15
    || Object.values(ROOT_FILE_COUNTS).reduce((sum, count) => sum + count, 0) !== 110) {
    fail("CONSTANT_COUNT_INVALID");
  }
  assertSortedUnique(ROOTS, "roots");
  assertSortedUnique(EXCLUDED_RUNTIME_SUBTREES, "excluded runtime subtrees");
  assertSortedUnique(PREVIOUSLY_UNSELECTED_PATHS, "previously unselected paths");
  for (const subtree of EXCLUDED_RUNTIME_SUBTREES) {
    const root = rootFor(`${subtree}/sentinel`);
    const suffix = root === undefined ? "" : subtree.slice(root.length + 1);
    if (root === undefined || suffix.includes("/")
      || ![".tmp", "dist", "node_modules", "temp", "tmp"].includes(suffix)) {
      fail("EXCLUSION_SCOPE_INVALID", subtree);
    }
  }
  for (const filePath of PREVIOUSLY_UNSELECTED_PATHS) {
    if (rootFor(filePath) === undefined
      || EXCLUDED_RUNTIME_SUBTREES.some((subtree) => filePath.startsWith(`${subtree}/`))) {
      fail("PREVIOUSLY_UNSELECTED_SCOPE_INVALID", filePath);
    }
  }
}

function requireParent(value) {
  if (!isVerifiedWesternIndependentEngineeringManifestV4(value)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  const summary = getWesternIndependentEngineeringManifestV4Summary(value);
  if (summary.manifestId
      !== "hakimi.western-astrology.nonce-bound-browser-child-selected-path-manifest/4.0.0"
    || summary.manifestDigest !== PARENT_IDENTITY.semanticDigest
    || summary.selectedUniquePhysicalPathCount !== 151
    || summary.passedScenarioOutcomes !== 10
    || summary.currentFullDomainManifestMechanicallyVerified !== false
    || summary.gateState?.admissionGatesRequired !== 8
    || summary.gateState?.admissionGatesSatisfied !== 0
    || summary.gateState?.bindingRequired !== 28
    || summary.gateState?.bindingFrozenVerified !== 0
    || summary.gateState?.independentExpertsRequired !== 2
    || summary.gateState?.independentExpertReviewsVerified !== 0
    || Object.values(summary.authorityBoundary).some((entry) => entry !== false)) {
    fail("PARENT_IDENTITY_OR_BOUNDARY_INVALID");
  }
  return { value, summary };
}

function deriveExpectedPartition(parent) {
  requireParent(parent);
  const selected = parent.manifest.selectedPathMachineIdentity.files;
  if (!Array.isArray(selected) || selected.length !== 151) fail("PARENT_SELECTED_SET_INVALID");
  const withinRoots = selected
    .map((entry) => entry.path)
    .filter((filePath) => rootFor(filePath) !== undefined)
    .sort(compare);
  if (withinRoots.length !== 95 || new Set(withinRoots).size !== 95
    || PREVIOUSLY_UNSELECTED_PATHS.some((filePath) => withinRoots.includes(filePath))) {
    fail("PARENT_SIX_ROOT_PARTITION_INVALID");
  }
  const expectedPaths = [...withinRoots, ...PREVIOUSLY_UNSELECTED_PATHS].sort(compare);
  if (expectedPaths.length !== 110 || new Set(expectedPaths).size !== 110) {
    fail("EXPECTED_SIX_ROOT_SET_INVALID");
  }
  return deepFreeze({ withinRoots, expectedPaths });
}

function expectedDirectorySet(expectedPaths) {
  const directories = new Set(ROOTS);
  for (const filePath of expectedPaths) {
    let current = path.posix.dirname(filePath);
    while (current !== ".") {
      directories.add(current);
      if (ROOTS.includes(current)) break;
      current = path.posix.dirname(current);
    }
  }
  return directories;
}

async function enumerateAuthoredPaths(workspaceRootInput, parent) {
  assertConstants();
  const partition = deriveExpectedPartition(parent);
  if (typeof workspaceRootInput !== "string" || workspaceRootInput === "") {
    fail("WORKSPACE_ROOT_INVALID");
  }
  const workspaceRoot = path.resolve(workspaceRootInput);
  await requirePhysicalDirectory(workspaceRoot, "workspace root");
  const expectedDirectories = expectedDirectorySet(partition.expectedPaths);
  const excluded = new Set(EXCLUDED_RUNTIME_SUBTREES);
  const paths = [];
  const endpoints = Object.create(null);

  async function walk(relativeDirectory) {
    const absoluteDirectory = resolveInsideWorkspace(workspaceRoot, relativeDirectory);
    endpoints[relativeDirectory] = await requirePhysicalDirectory(
      absoluteDirectory,
      relativeDirectory
    );
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (cause) {
      fail("ROOT_DIRECTORY_READ_FAILED", relativeDirectory, cause);
    }
    entries.sort((left, right) => compare(left.name, right.name));
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
      let stats;
      let resolved;
      try {
        [stats, resolved] = await Promise.all([
          lstat(absolutePath, { bigint: true }),
          realpath(absolutePath)
        ]);
      } catch (cause) {
        fail("ROOT_ENDPOINT_CHANGED", relativePath, cause);
      }
      if (stats.isSymbolicLink() || entry.isSymbolicLink()
        || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
        fail("ROOT_SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN", relativePath);
      }
      endpoints[relativePath] = endpointFingerprint(stats, resolved);
      if (entry.isDirectory() && stats.isDirectory()) {
        if (excluded.has(relativePath)) continue;
        if (!expectedDirectories.has(relativePath)) {
          fail("ROOT_DIRECTORY_SET_DRIFT", relativePath);
        }
        await walk(relativePath);
      } else if (entry.isFile() && stats.isFile()) {
        if (stats.nlink !== 1n) fail("ROOT_HARDLINK_FORBIDDEN", relativePath);
        paths.push(relativePath);
      } else {
        fail("ROOT_ENDPOINT_TYPE_FORBIDDEN", relativePath);
      }
    }
  }

  for (const root of ROOTS) await walk(root);
  paths.sort(compare);
  const caseFolded = new Set();
  for (const filePath of paths) {
    const folded = filePath.toLocaleLowerCase("en-US");
    if (caseFolded.has(folded)) fail("ROOT_CASE_FOLD_ALIAS", filePath);
    caseFolded.add(folded);
  }
  if (!exact(paths, partition.expectedPaths)) fail("ROOT_FILE_SET_DRIFT");
  return deepFreeze({ paths, endpoints });
}

async function collectTreePass(workspaceRoot, parent, hooks = undefined, pass = 1) {
  const before = await enumerateAuthoredPaths(workspaceRoot, parent);
  if (typeof hooks?.afterEnumeration === "function") {
    await hooks.afterEnumeration({ pass, paths: before.paths });
  }
  const files = [];
  for (let index = 0; index < before.paths.length; index += 1) {
    const relativePath = before.paths[index];
    let snapshot;
    try {
      snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    } catch (cause) {
      fail("ROOT_STABLE_READ_FAILED", relativePath, cause);
    }
    files.push({
      path: relativePath,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    });
    if (typeof hooks?.afterFileSnapshot === "function") {
      await hooks.afterFileSnapshot({ pass, index, relativePath });
    }
  }
  const after = await enumerateAuthoredPaths(workspaceRoot, parent);
  if (!exact(before, after)) fail("ROOT_INVENTORY_ENDPOINT_DRIFT");
  return deepFreeze(files);
}

async function collectAuthoredTreeIdentity(workspaceRoot, parent, hooks = undefined) {
  const beforeFiles = await collectTreePass(workspaceRoot, parent, hooks, 1);
  const treeDigestBefore = digest(TREE_DIGEST_DOMAIN, beforeFiles);
  if (typeof hooks?.afterFirstPass === "function") {
    await hooks.afterFirstPass({ beforeFiles, treeDigestBefore });
  }
  const afterFiles = await collectTreePass(workspaceRoot, parent, hooks, 2);
  const treeDigestAfter = digest(TREE_DIGEST_DOMAIN, afterFiles);
  if (!exact(beforeFiles, afterFiles) || treeDigestBefore !== treeDigestAfter) {
    fail("ROOT_TREE_PRE_POST_DRIFT");
  }
  return deepFreeze({
    files: beforeFiles,
    pathSetDigest: digest(PATH_SET_DIGEST_DOMAIN, beforeFiles.map((entry) => entry.path)),
    treeDigestBefore,
    treeDigestAfter,
    prePostTreeDigestEqual: true
  });
}

function calculateRootFileCounts(files) {
  const counts = Object.fromEntries(ROOTS.map((root) => [root, 0]));
  for (const file of files) {
    const root = rootFor(file.path);
    if (root === undefined) fail("FILE_OUTSIDE_ROOTS", file.path);
    counts[root] += 1;
  }
  return counts;
}

async function collectInputs(workspaceRoot, hooks = undefined) {
  let parent;
  try {
    parent = await loadWesternIndependentEngineeringManifestV4(workspaceRoot);
  } catch (cause) {
    fail("PARENT_REVERIFICATION_FAILED", "Western v4 复验失败。", cause);
  }
  const { summary } = requireParent(parent);
  let parentSnapshot;
  try {
    parentSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PARENT_IDENTITY.path);
  } catch (cause) {
    fail("PARENT_RAW_IDENTITY_READ_FAILED", PARENT_IDENTITY.path, cause);
  }
  if (parentSnapshot.rawBytes !== PARENT_IDENTITY.rawBytes
    || parentSnapshot.rawSha256 !== PARENT_IDENTITY.rawSha256) {
    fail("PARENT_RAW_IDENTITY_INVALID");
  }
  const treeIdentity = await collectAuthoredTreeIdentity(workspaceRoot, parent, hooks);
  return { parent, parentSnapshot, parentSummary: summary, treeIdentity };
}

function buildProjection(inputs) {
  const parent = inputs.parent;
  const partition = deriveExpectedPartition(parent);
  const fileByPath = new Map(inputs.treeIdentity.files.map((entry) => [entry.path, entry]));
  const predecessorFileByPath = new Map(
    parent.manifest.selectedPathMachineIdentity.files.map((entry) => [entry.path, entry])
  );
  for (const filePath of partition.withinRoots) {
    const current = fileByPath.get(filePath);
    const predecessor = predecessorFileByPath.get(filePath);
    if (!current || !predecessor || current.bytes !== predecessor.bytes
      || current.sha256 !== predecessor.sha256) {
      fail("PARENT_SELECTED_IDENTITY_DRIFT", filePath);
    }
  }
  const previouslyUnselectedFiles = PREVIOUSLY_UNSELECTED_PATHS.map((filePath) => {
    const file = fileByPath.get(filePath);
    if (file === undefined) fail("PREVIOUSLY_UNSELECTED_FILE_MISSING", filePath);
    return {
      ...file,
      priorState: "absent_from_v4_selected_path_set",
      coverageMeaning: "authored_root_machine_identity_only",
      authorizationDeterminationMade: false,
      formallyPromoted: false
    };
  });
  const parentBoundary = parent.manifest.browserEvidenceBoundary;
  const parentBinding = {
    role: "current_western_manifest_v4_private_brand_parent",
    path: PARENT_IDENTITY.path,
    rawBytes: inputs.parentSnapshot.rawBytes,
    rawSha256: inputs.parentSnapshot.rawSha256,
    manifestId: inputs.parentSummary.manifestId,
    semanticDigest: inputs.parentSummary.manifestDigest,
    semanticDigestField: "manifestDigest",
    privateBrandConsumed: true
  };
  const unsigned = {
    schemaVersion: "5.0.0",
    recordType: RECORD_TYPE,
    manifestId: MANIFEST_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    releaseStatus: "draft",
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "western",
      productSystemId: "western-astrology",
      productStatus: "isolated_engineering_draft",
      baziAuthorityInherited: false
    },
    lineage: {
      appendOnlySuccessor: true,
      predecessorModified: false,
      predecessorBacklinkAdded: false,
      predecessor: parentBinding,
      predecessorSelectedPathCount: 151,
      predecessorSelectedPathsInsideSixRoots: partition.withinRoots.length,
      previouslyUnselectedCount: previouslyUnselectedFiles.length,
      predecessorBrowserChildBindingRetainedByReference: true,
      browserMatrixRerunByThisManifest: false
    },
    recursiveAuthoredRootClosure: {
      scopeClass:
        "six_explicit_western_allowlisted_authored_roots_exact_not_entire_engineering_domain_product_or_dependency_closure",
      sixAllowlistedAuthoredRootsExact: true,
      allowlistedRootCount: ROOTS.length,
      allowlistedRoots: [...ROOTS],
      expectedAuthoredOrdinaryFileCount: 110,
      observedAuthoredOrdinaryFileCount: inputs.treeIdentity.files.length,
      files: clone(inputs.treeIdentity.files),
      rootFileCounts: calculateRootFileCounts(inputs.treeIdentity.files),
      recursiveEnumerationWithinVisitedAuthoredTreePerformed: true,
      ordinarySingleLinkFilesOnly: true,
      symlinkJunctionAndResolvedPathAliasRejected: true,
      genericNtfsReparseTagEnumerated: false,
      allReparseClassesExcluded: false,
      pathEscapeAndRootAliasRejected: true,
      unexpectedNonExcludedFileOrDirectoryRejected: true,
      exactRelativePathBytesAndSha256Recorded: true,
      directoryAndFileEndpointsReobservedAfterFileReads: true,
      completeTreeReadTwice: true,
      pathSetDigest: inputs.treeIdentity.pathSetDigest,
      treeDigestAlgorithm: "sha256_domain_separated_canonical_file_evidence_v1",
      treeDigestBefore: inputs.treeIdentity.treeDigestBefore,
      treeDigestAfter: inputs.treeIdentity.treeDigestAfter,
      prePostTreeDigestEqual: true,
      excludedRuntimeSubtreeCount: EXCLUDED_RUNTIME_SUBTREES.length,
      excludedRuntimeSubtrees: [...EXCLUDED_RUNTIME_SUBTREES],
      excludedRuntimeSubtreeContentsEnumerated: false,
      excludedRuntimeSubtreeContentsAuthoritative: false,
      exclusionLimitedToAllowlistedRootDirectRuntimeSubtrees: true,
      completeInstalledDependencyClosureEstablished: false,
      completeRepositoryClosureEstablished: false,
      entireWesternEngineeringClosureEstablished: false,
      fullDomainManifestEstablished: false,
      entireWesternProductClosureEstablished: false
    },
    predecessorV4Partition: {
      predecessorSelectedPathCount: 151,
      predecessorSelectedPathsInsideSixRoots: partition.withinRoots.length,
      previouslyUnselectedFileCount: previouslyUnselectedFiles.length,
      previouslyUnselectedFiles,
      previouslyUnselectedMeansOnlyAbsentFromV4SelectedPathSet: true,
      authorizationDeterminationMade: false,
      previouslyUnselectedFilesAuthorizedAsDomainContent: false,
      previouslyUnselectedFilesFormallyPromoted: false,
      allPreviouslyUnselectedFilesIncludedInCurrentRootIdentity: true
    },
    sharedDependencyBoundary: {
      sharedRoot: "packages/tzdb-core",
      includedAsMachineIdentityDependencyRoot: true,
      exclusivelyOwnedByWesternEstablished: false,
      sourceProvenanceComplete: false,
      rightsOrRedistributionCleared: false,
      establishesWesternRuleset: false,
      establishesEntireWesternEngineeringClosure: false
    },
    componentAndCapabilityBoundary: {
      predecessorSelectedPathLedgerRetainedByReference: true,
      previouslyUnselectedFilesSemanticallyClassifiedByThisSuccessor: false,
      semanticDependencyOrCallgraphEstablished: false,
      formalInputContractEstablished: false,
      factContractFormallyEstablished: false,
      executionRulesetEstablished: false,
      interpretationRulesetEstablished: false,
      reportContractEstablished: false,
      highRiskPolicyBound: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false
    },
    browserEvidenceBoundary: {
      predecessorCarriesCurrentBrowserChildPrivateBrand: true,
      browserChildPreservedByPredecessorReference: true,
      browserMatrixRerunByThisManifest: false,
      exactSingleBuildAtChildIssuance: parentBoundary.exactSingleBuildAtChildIssuance,
      sameOutputTreeServedToBothBrowsersAtChildIssuance:
        parentBoundary.sameOutputTreeServedToBothBrowsersAtChildIssuance,
      runNonceCommitmentAtChildIssuance: parentBoundary.runNonceCommitmentAtChildIssuance,
      inMatrixCdpProductProtocolAndUserAgentsAttachedAtChildIssuance:
        parentBoundary.inMatrixCdpProductProtocolAndUserAgentsAttachedAtChildIssuance,
      chromeScenarioOutcomesAtChildIssuance: parentBoundary.chromeScenarioOutcomesAtChildIssuance,
      edgeScenarioOutcomesAtChildIssuance: parentBoundary.edgeScenarioOutcomesAtChildIssuance,
      totalPassedScenarioOutcomesAtChildIssuance:
        parentBoundary.totalPassedScenarioOutcomesAtChildIssuance,
      chromeVersionAtChildIssuance: parentBoundary.chromeVersionAtChildIssuance,
      edgeVersionAtChildIssuance: parentBoundary.edgeVersionAtChildIssuance,
      outputTreeDigestAtChildIssuance: parentBoundary.outputTreeDigestAtChildIssuance,
      browserExecutablePathOrHashEstablished: false,
      browserOsProcessOrNetworkPeerBindingEstablished: false,
      browserVendorSignatureEstablished: false,
      browserRuntimeEvidenceEstablishedByThisManifest: false,
      fullApplicationRuntimeValidated: false,
      mainApplicationRuntimeValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false
    },
    productBoundary: {
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      formalProductSurface: "absent",
      mainApplicationIntegrated: false,
      centralRegistryIntegration: "absent"
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    currentnessBoundary: {
      predecessorV4PrivateBrandVerified: true,
      currentSixAllowlistedAuthoredRootMachineIdentityMechanicallyVerified: true,
      currentEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      entireWesternEngineeringClosureEstablished: false,
      productIdentityEstablished: false,
      ownerPromotionDecisionReceipt: null
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 28,
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
      endpointObservationOnly: true,
      sameHeldHandleHashAndReadPerFile: true,
      completeTreeReadTwice: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      prePostDigestEqualityIsNotIntervalProof: true,
      manifestDigestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      trustedTimestampEstablished: false,
      createdAtClock: "untrusted_local_clock_label"
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      completeRuntimeToolClosureBound: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    evidenceLedger: {
      engineeringEvidence:
        "six_allowlisted_authored_root_recursive_machine_identity_with_v4_browser_child_retained_by_reference",
      browserAndRuntimeEvidence:
        "predecessor_child_isolated_loopback_same_artifact_nonce_correlated_in_matrix_cdp_identity_only_not_rerun",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsAndLegalJudgment: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    authorityBoundary: clone(FALSE_AUTHORITY),
    doesNotEstablish: [
      "complete_repository_installed_dependency_build_tooling_or_runtime_closure",
      "entire_western_engineering_domain_or_product_closure",
      "previously_unselected_files_as_authorized_unauthorized_or_formally_promoted_content",
      "semantic_component_membership_input_fact_rule_report_completeness_or_domain_truth",
      "source_body_exact_quote_frozen_binding_or_complete_source_bundle",
      "work_edition_carrier_rights_legal_conclusion_or_redistribution_authorization",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "new_browser_run_full_application_pwa_service_worker_public_host_or_production_runtime",
      "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion",
      "trusted_runtime_launcher_loader_node_tool_time_signature_or_signer_identity",
      "formal_admission_release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return { ...unsigned, manifestDigest: digest(DIGEST_DOMAIN, unsigned) };
}

export function computeWesternIndependentEngineeringManifestV5Digest(value) {
  const unsigned = clone(value);
  delete unsigned.manifestDigest;
  return digest(DIGEST_DOMAIN, unsigned);
}

export function serializeWesternIndependentEngineeringManifestV5(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function allFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || !exact(value, FALSE_AUTHORITY)) fail(code);
}

function assertBoundary(value) {
  const closure = value?.recursiveAuthoredRootClosure;
  const partition = value?.predecessorV4Partition;
  if (value?.schemaVersion !== "5.0.0" || value?.recordType !== RECORD_TYPE
    || value?.manifestId !== MANIFEST_ID || value?.status !== STATUS
    || value?.createdAt !== CREATED_AT || value?.releaseStatus !== "draft"
    || value?.activeAdmissionEffect !== "none"
    || value?.lineage?.appendOnlySuccessor !== true
    || value?.lineage?.predecessorModified !== false
    || value?.lineage?.predecessorBacklinkAdded !== false
    || value?.lineage?.predecessor?.privateBrandConsumed !== true
    || value?.lineage?.predecessorSelectedPathCount !== 151
    || value?.lineage?.predecessorSelectedPathsInsideSixRoots !== 95
    || value?.lineage?.previouslyUnselectedCount !== 15
    || value?.lineage?.predecessorBrowserChildBindingRetainedByReference !== true
    || value?.lineage?.browserMatrixRerunByThisManifest !== false
    || value?.systemIdentity?.contractSystemId !== "western"
    || value?.systemIdentity?.productSystemId !== "western-astrology"
    || value?.systemIdentity?.baziAuthorityInherited !== false
    || value?.lineage?.predecessor?.path !== PARENT_IDENTITY.path
    || value?.lineage?.predecessor?.rawBytes !== PARENT_IDENTITY.rawBytes
    || value?.lineage?.predecessor?.rawSha256 !== PARENT_IDENTITY.rawSha256
    || value?.lineage?.predecessor?.semanticDigest !== PARENT_IDENTITY.semanticDigest
    || closure?.sixAllowlistedAuthoredRootsExact !== true
    || closure?.allowlistedRootCount !== 6
    || closure?.expectedAuthoredOrdinaryFileCount !== 110
    || closure?.observedAuthoredOrdinaryFileCount !== 110
    || closure?.recursiveEnumerationWithinVisitedAuthoredTreePerformed !== true
    || closure?.ordinarySingleLinkFilesOnly !== true
    || closure?.symlinkJunctionAndResolvedPathAliasRejected !== true
    || closure?.genericNtfsReparseTagEnumerated !== false
    || closure?.allReparseClassesExcluded !== false
    || closure?.unexpectedNonExcludedFileOrDirectoryRejected !== true
    || closure?.directoryAndFileEndpointsReobservedAfterFileReads !== true
    || closure?.completeTreeReadTwice !== true
    || closure?.prePostTreeDigestEqual !== true
    || closure?.excludedRuntimeSubtreeCount !== 30
    || closure?.excludedRuntimeSubtreeContentsEnumerated !== false
    || closure?.excludedRuntimeSubtreeContentsAuthoritative !== false
    || closure?.completeInstalledDependencyClosureEstablished !== false
    || closure?.completeRepositoryClosureEstablished !== false
    || closure?.entireWesternEngineeringClosureEstablished !== false
    || closure?.fullDomainManifestEstablished !== false
    || closure?.entireWesternProductClosureEstablished !== false
    || !exact(closure?.allowlistedRoots, ROOTS)
    || !exact(closure?.excludedRuntimeSubtrees, EXCLUDED_RUNTIME_SUBTREES)
    || !exact(closure?.rootFileCounts, ROOT_FILE_COUNTS)
    || !Array.isArray(closure?.files) || closure.files.length !== 110
    || partition?.predecessorSelectedPathCount !== 151
    || partition?.predecessorSelectedPathsInsideSixRoots !== 95
    || partition?.previouslyUnselectedFileCount !== 15
    || partition?.previouslyUnselectedFiles?.length !== 15
    || partition?.previouslyUnselectedMeansOnlyAbsentFromV4SelectedPathSet !== true
    || partition?.authorizationDeterminationMade !== false
    || partition?.previouslyUnselectedFilesAuthorizedAsDomainContent !== false
    || partition?.previouslyUnselectedFilesFormallyPromoted !== false
    || value?.sharedDependencyBoundary?.sharedRoot !== "packages/tzdb-core"
    || value?.sharedDependencyBoundary?.includedAsMachineIdentityDependencyRoot !== true
    || value?.sharedDependencyBoundary?.exclusivelyOwnedByWesternEstablished !== false
    || value?.sharedDependencyBoundary?.sourceProvenanceComplete !== false
    || value?.sharedDependencyBoundary?.rightsOrRedistributionCleared !== false
    || value?.sharedDependencyBoundary?.establishesWesternRuleset !== false
    || value?.sharedDependencyBoundary?.establishesEntireWesternEngineeringClosure !== false
    || value?.componentAndCapabilityBoundary?.previouslyUnselectedFilesSemanticallyClassifiedByThisSuccessor !== false
    || value?.componentAndCapabilityBoundary?.formalInputContractEstablished !== false
    || value?.componentAndCapabilityBoundary?.factContractFormallyEstablished !== false
    || value?.componentAndCapabilityBoundary?.semanticDependencyOrCallgraphEstablished !== false
    || value?.componentAndCapabilityBoundary?.executionRulesetEstablished !== false
    || value?.componentAndCapabilityBoundary?.interpretationRulesetEstablished !== false
    || value?.componentAndCapabilityBoundary?.reportContractEstablished !== false
    || value?.componentAndCapabilityBoundary?.highRiskPolicyBound !== false
    || value?.componentAndCapabilityBoundary?.sourceBundleComplete !== false
    || value?.componentAndCapabilityBoundary?.rightsBundleComplete !== false
    || value?.componentAndCapabilityBoundary?.expertReviewBundleComplete !== false
    || value?.browserEvidenceBoundary?.browserMatrixRerunByThisManifest !== false
    || value?.browserEvidenceBoundary?.totalPassedScenarioOutcomesAtChildIssuance !== 10
    || value?.browserEvidenceBoundary?.browserRuntimeEvidenceEstablishedByThisManifest !== false
    || value?.browserEvidenceBoundary?.fullApplicationRuntimeValidated !== false
    || value?.browserEvidenceBoundary?.mainApplicationRuntimeValidated !== false
    || value?.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false
    || value?.browserEvidenceBoundary?.publicHostValidated !== false
    || value?.browserEvidenceBoundary?.pwaOrServiceWorkerValidated !== false
    || value?.productBoundary?.productIdentity !== null
    || value?.productBoundary?.releaseIdentity !== null
    || value?.productBoundary?.targetSchema !== null
    || value?.productBoundary?.migrationId !== null
    || value?.productBoundary?.runtimeOption !== "unselected"
    || value?.productBoundary?.storageBackend !== "unselected"
    || value?.productBoundary?.formalProductSurface !== "absent"
    || value?.productBoundary?.mainApplicationIntegrated !== false
    || value?.productBoundary?.centralRegistryIntegration !== "absent"
    || value?.currentnessBoundary?.currentSixAllowlistedAuthoredRootMachineIdentityMechanicallyVerified !== true
    || value?.currentnessBoundary?.currentFullDomainManifestMechanicallyVerified !== false
    || value?.currentnessBoundary?.entireWesternEngineeringClosureEstablished !== false
    || value?.gateState?.admissionGatesRequired !== 8
    || value?.gateState?.admissionGatesSatisfied !== 0
    || value?.gateState?.bindingRequired !== 28
    || value?.gateState?.bindingFrozenVerified !== 0
    || value?.gateState?.independentExpertsRequired !== 2
    || value?.gateState?.independentExpertReviewsVerified !== 0
    || value?.gateState?.sourceBundleComplete !== false
    || value?.gateState?.rightsBundleComplete !== false
    || value?.gateState?.expertReviewBundleComplete !== false
    || value?.gateState?.highRiskPolicyBound !== false
    || value?.gateState?.releaseEvidenceComplete !== false
    || value?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || value?.projectReleaseGovernanceContext?.targetSchema !== 13
    || value?.projectReleaseGovernanceContext?.migrationId !== null
    || value?.projectReleaseGovernanceContext?.inheritedByWesternProductIdentity !== false
    || value?.projectReleaseGovernanceContext?.expertClaimsAuthorized !== false
    || value?.projectReleaseGovernanceContext?.publicDeploymentAuthorized !== false
    || value?.projectReleaseGovernanceContext?.mutationEpochAvailableForSchema13 !== false
    || value?.projectReleaseGovernanceContext?.mutationEpochReceipt !== null
    || value?.observationBoundary?.crossFileAtomicSnapshot !== false
    || value?.observationBoundary?.mutationEpochAvailable !== false
    || value?.observationBoundary?.mutationEpochReceipt !== null
    || value?.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || value?.observationBoundary?.abaExcluded !== false
    || value?.runtimeTrustBoundary?.hiddenPreloadExcluded !== false
    || value?.runtimeTrustBoundary?.nodeRuntimeIdentityEstablished !== false
    || value?.runtimeTrustBoundary?.loaderIdentityEstablished !== false
    || value?.runtimeTrustBoundary?.runtimeLauncherIdentityEstablished !== false
    || value?.runtimeTrustBoundary?.completeRuntimeToolClosureBound !== false
    || value?.runtimeTrustBoundary?.cliOutputTrustedAttestation !== false
    || !SHA256.test(value?.manifestDigest ?? "")
    || value.manifestDigest !== computeWesternIndependentEngineeringManifestV5Digest(value)) {
    fail("MANIFEST_BOUNDARY_INVALID");
  }
  allFalse(value.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  const paths = closure.files.map((entry) => entry.path);
  if (new Set(paths).size !== 110 || !exact(paths, [...paths].sort(compare))
    || closure.files.some((entry) => !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0
      || !SHA256.test(entry.sha256 ?? ""))
    || closure.pathSetDigest !== digest(PATH_SET_DIGEST_DOMAIN, paths)
    || closure.treeDigestBefore !== digest(TREE_DIGEST_DOMAIN, closure.files)
    || closure.treeDigestAfter !== closure.treeDigestBefore) {
    fail("TREE_EVIDENCE_INVALID");
  }
  const fileByPath = new Map(closure.files.map((entry) => [entry.path, entry]));
  if (!exact(partition.previouslyUnselectedFiles.map((entry) => entry.path),
    PREVIOUSLY_UNSELECTED_PATHS)) fail("PREVIOUSLY_UNSELECTED_SET_INVALID");
  for (const entry of partition.previouslyUnselectedFiles) {
    const file = fileByPath.get(entry.path);
    if (!file || file.bytes !== entry.bytes || file.sha256 !== entry.sha256
      || entry.priorState !== "absent_from_v4_selected_path_set"
      || entry.coverageMeaning !== "authored_root_machine_identity_only"
      || entry.authorizationDeterminationMade !== false
      || entry.formallyPromoted !== false) {
      fail("PREVIOUSLY_UNSELECTED_EVIDENCE_INVALID", entry.path);
    }
  }
  return value;
}

export async function buildCurrentWesternIndependentEngineeringManifestV5(
  workspaceRoot = process.cwd(),
  hooks = undefined
) {
  const inputs = await collectInputs(workspaceRoot, hooks);
  return deepFreeze(assertBoundary(buildProjection(inputs)));
}

export async function loadWesternIndependentEngineeringManifestV5(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentWesternIndependentEngineeringManifestV5(workspaceRoot);
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH
    );
  } catch (cause) {
    fail("PERSISTED_MANIFEST_READ_FAILED", "Western v5 不可稳定读取。", cause);
  }
  if (snapshot.rawBytes > MAX_MANIFEST_BYTES) fail("PERSISTED_MANIFEST_TOO_LARGE");
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot));
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeWesternIndependentEngineeringManifestV5(persisted)
    || !exact(persisted, expected)) fail("CURRENT_MANIFEST_MISMATCH");
  if (EXPECTED_PERSISTED.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH");
  }
  const result = deepFreeze({
    artifact: {
      path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    manifest: clone(persisted)
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternIndependentEngineeringManifestV5(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value)
    && VERIFIED_RESULTS.has(value);
}

export function getWesternIndependentEngineeringManifestV5Summary(value) {
  if (!isVerifiedWesternIndependentEngineeringManifestV5(value)) {
    fail("MANIFEST_PRIVATE_BRAND_REQUIRED");
  }
  const manifest = value.manifest;
  return deepFreeze({
    artifact: value.artifact,
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    allowlistedRootCount: manifest.recursiveAuthoredRootClosure.allowlistedRootCount,
    authoredOrdinaryFileCount:
      manifest.recursiveAuthoredRootClosure.observedAuthoredOrdinaryFileCount,
    predecessorSelectedPathsInsideSixRoots:
      manifest.predecessorV4Partition.predecessorSelectedPathsInsideSixRoots,
    previouslyUnselectedFileCount:
      manifest.predecessorV4Partition.previouslyUnselectedFileCount,
    treeDigest: manifest.recursiveAuthoredRootClosure.treeDigestBefore,
    prePostTreeDigestEqual: manifest.recursiveAuthoredRootClosure.prePostTreeDigestEqual,
    currentSixAllowlistedAuthoredRootMachineIdentityMechanicallyVerified:
      manifest.currentnessBoundary
        .currentSixAllowlistedAuthoredRootMachineIdentityMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.currentnessBoundary.currentFullDomainManifestMechanicallyVerified,
    gateState: manifest.gateState,
    productBoundary: manifest.productBoundary,
    authorityBoundary: manifest.authorityBoundary
  });
}

export const westernIndependentEngineeringManifestV5TestOnly = deepFreeze({
  CREATED_AT,
  DIGEST_DOMAIN,
  EXCLUDED_RUNTIME_SUBTREES,
  EXPECTED_PERSISTED,
  MANIFEST_ID,
  PARENT_IDENTITY,
  PATH_SET_DIGEST_DOMAIN,
  PREVIOUSLY_UNSELECTED_PATHS,
  RECORD_TYPE,
  ROOTS,
  ROOT_FILE_COUNTS,
  STATUS,
  TREE_DIGEST_DOMAIN,
  assertBoundary,
  assertConstants,
  collectAuthoredTreeIdentity,
  deriveExpectedPartition,
  enumerateAuthoredPaths,
  exact
});
