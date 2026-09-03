import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { types as nodeUtilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const OBJECT_CREATE = Object.create;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;

function freeze(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

export const WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_V2_RELATIVE_PATH =
  "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v2.0.0.json";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_TYPE = "western_source_and_manifest_identity_drift_receipt_candidate";
const CANDIDATE_ID =
  "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/2.0.0";
const STATUS =
  "append_only_dual_partition_western_parent_graph_and_zodiac_method_source_identity_drift_observation_candidate_zero_admission_effect";
const DIGEST_PREFIX =
  "hakimi.western.source-and-manifest-identity-drift-receipt-candidate.v2\0";
const SHA256 = /^[0-9a-f]{64}$/u;
const EXCLUDED_DIRECT_RUNTIME_DIRS = new Set([".tmp", "dist", "node_modules", "temp", "tmp"]);
const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET();
const EXPECTED_GRAPH_DRIFT_DIGEST =
  "afe3812b7caada805428ab7df125ceacf9e9e8b41e0bf28831fa68e4aa89916d";
const EXPECTED_WESTERN_DRIFT_DIGEST =
  "cb2261a69de31417e308d1c0eff3f29023deabb84224cb356e307185da46c0dd";
const EXPECTED_ROOT_FILE_COUNTS_DIGEST =
  "cd0ca1f6c9724254c9b2074a082c8ecf3b713a3dfaf01b5507bce916fb46ffec";
const EXPECTED_ROOT_DRIFT_COUNTS_DIGEST =
  "940879e4675b4de76dadf7e1d6212358a08882c69e5002b422c40abaa196e5ec";

// Updated only after the canonical persisted artifact is materialized.
const EXPECTED_PERSISTED_IDENTITY = freeze({
  rawBytes: 18_030,
  rawSha256: "e2f9daed6470c3965a3ce7d4088760687653e4ddf068022288e7be851ea35dd0"
});

const HISTORICAL = freeze({
  predecessorV1: freeze({
    role: "direct_predecessor_append_only_drift_receipt_v1",
    path: "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json",
    rawBytes: 12_537,
    rawSha256: "09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26",
    digestField: "receiptDigest",
    semanticDigest: "f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097",
    digestPrefix: "hakimi.western.source-and-manifest-identity-drift-receipt-candidate.v1\0"
  }),
  parentBrowserGraph: freeze({
    role: "historical_root_build_graph_origin_observation",
    path: "content/system-admission/western-civil-time-same-artifact-browser-observation-child.v1.0.0.json",
    rawBytes: 40_760,
    rawSha256: "0da9cd9bccfeb6d1d8234f5fac87b4f6d8999e7e6319aa4fce15a2050b3e7aca",
    digestField: "observationDigest",
    semanticDigest: "c23522cd6eed4753efe12b9d4e9a5354afaa6e9df41d8b76f458706625715ded",
    digestPrefix: "hakimi.western.civil-time.same-artifact-browser-observation-child.v1\0"
  }),
  westernManifestV5: freeze({
    role: "historical_western_six_root_manifest_v5",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v5.json",
    rawBytes: 43_571,
    rawSha256: "8dfe4a25fb4194d8e9e7b53f8d5b786813b11db9a7ed11e8a88c4f96aad41904",
    digestField: "manifestDigest",
    semanticDigest: "3617e2bb812e64ea6a79c5a9c6660344e09ed85f5869ff1528415cab13f434b4",
    digestPrefix:
      "hakimi.western-astrology.six-allowlisted-authored-root-recursive-machine-identity-manifest.v5\0"
  }),
  fourSystemV214: freeze({
    role: "historical_four_system_status_v2_14",
    path: "content/system-admission/four-system-current-status-observation-child.v2.14.0.json",
    rawBytes: 21_317,
    rawSha256: "5aae5229c9e4cac8f15e31cfaa43f8f4bc6156fddedd74cbb206236dd29f954a",
    digestField: "childDigest",
    semanticDigest: "78e493c478737baca20b73338310f3077fd172e20e5d1546077c9514b6b16eee",
    digestPrefix: "hakimi.system-admission.four-system-current-status-observation-child.v2.14\0"
  })
});

export class WesternSourceAndManifestIdentityDriftReceiptCandidateV2Error extends Error {
  constructor(code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "WesternSourceAndManifestIdentityDriftReceiptCandidateV2Error";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new WesternSourceAndManifestIdentityDriftReceiptCandidateV2Error(code, message, cause);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function captureJson(
  value,
  label = "value",
  seen = new NATIVE_WEAK_SET(),
  active = new NATIVE_WEAK_SET()
) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value]) || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", `${label} 数值无效。`);
    }
    return value;
  }
  if (typeof value !== "object" || nodeUtilTypes.isProxy(value)) {
    fail("NON_CANONICAL_JSON", `${label} 不是被动 JSON 数据。`);
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, active, [value])) fail("NON_CANONICAL_JSON", `${label} 含循环。`);
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) fail("NON_CANONICAL_JSON", `${label} 含对象别名。`);
  REFLECT_APPLY(WEAK_SET_ADD, active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    fail("NON_CANONICAL_JSON", `${label} 含 Symbol。`);
  }
  let output;
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE
      || ownKeys.some((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key))) {
      fail("NON_CANONICAL_JSON", `${label} 数组结构无效。`);
    }
    output = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("NON_CANONICAL_JSON", `${label} 必须是稠密 data-property 数组。`);
      }
      output.push(captureJson(descriptor.value, `${label}[${index}]`, seen, active));
    }
  } else {
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("NON_CANONICAL_JSON", `${label} 对象原型无效。`);
    }
    output = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
    for (const key of REFLECT_APPLY(OBJECT_KEYS, Object, [descriptors]).sort(compare)) {
      const descriptor = descriptors[key];
      if (!("value" in descriptor) || !descriptor.enumerable) {
        fail("NON_CANONICAL_JSON", `${label}.${key} 必须是可枚举 data property。`);
      }
      output[key] = captureJson(descriptor.value, `${label}.${key}`, seen, active);
    }
  }
  REFLECT_APPLY(WEAK_SET_DELETE, active, [value]);
  return output;
}

function canonical(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value)]);
}

function clone(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonical(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const children = REFLECT_APPLY(OBJECT_VALUES, Object, [value]);
  for (let index = 0; index < children.length; index += 1) {
    deepFreeze(children[index], seen);
  }
  return freeze(value);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function digestWithoutField(prefix, value, field) {
  const unsigned = clone(value);
  delete unsigned[field];
  return sha256Bytes(Buffer.from(prefix + canonical(unsigned), "utf8"));
}

export function computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(value) {
  return digestWithoutField(DIGEST_PREFIX, value, "receiptDigest");
}

export function serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2])}\n`;
}

function exact(left, right) {
  return canonical(left) === canonical(right);
}

function canonicalDigest(value) {
  return sha256Bytes(Buffer.from(canonical(value), "utf8"));
}

function assertExactKeys(value, expected, code) {
  if (value === null || typeof value !== "object"
    || !exact(REFLECT_APPLY(OBJECT_KEYS, Object, [value]).sort(compare), [...expected].sort(compare))) {
    fail(code, `${code} 字段闭集漂移。`);
  }
}

function assertExact(value, expected, code) {
  if (!exact(value, expected)) fail(code, `${code} 固定值漂移。`);
}

function normalizePathIdentity(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function fixedWorkspaceRoot(workspaceRoot) {
  const candidate = workspaceRoot === undefined ? MODULE_ROOT : path.resolve(workspaceRoot);
  if (normalizePathIdentity(candidate) !== normalizePathIdentity(MODULE_ROOT)) {
    fail("WORKSPACE_ROOT_FORBIDDEN", "v2 drift receipt 只能绑定 verifier 模块固定项目根。 ");
  }
  return MODULE_ROOT;
}

async function stableJson(workspaceRoot, expected) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("HISTORICAL_RAW_IDENTITY_DRIFT", `${expected.path} 历史 raw identity 漂移。`);
  }
  const value = parseBaziDttStrictJsonArtifact(snapshot);
  if (value[expected.digestField] !== expected.semanticDigest
    || digestWithoutField(expected.digestPrefix, value, expected.digestField) !== expected.semanticDigest) {
    fail("HISTORICAL_SELF_DIGEST_DRIFT", `${expected.path} 历史 self digest 漂移。`);
  }
  return { snapshot, value };
}

async function readHistorical(workspaceRoot) {
  const predecessorV1 = await stableJson(workspaceRoot, HISTORICAL.predecessorV1);
  const parentBrowserGraph = await stableJson(workspaceRoot, HISTORICAL.parentBrowserGraph);
  const westernManifestV5 = await stableJson(workspaceRoot, HISTORICAL.westernManifestV5);
  const fourSystemV214 = await stableJson(workspaceRoot, HISTORICAL.fourSystemV214);
  const v5Binding = fourSystemV214.value.artifactBindings?.filter((entry) => (
    entry.path === HISTORICAL.westernManifestV5.path
  ));
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [v5Binding]) || v5Binding.length !== 1
    || v5Binding[0].rawBytes !== HISTORICAL.westernManifestV5.rawBytes
    || v5Binding[0].rawSha256 !== HISTORICAL.westernManifestV5.rawSha256
    || v5Binding[0].semanticDigest !== HISTORICAL.westernManifestV5.semanticDigest
    || v5Binding[0].semanticDigestField !== HISTORICAL.westernManifestV5.digestField) {
    fail("FOUR_SYSTEM_HISTORICAL_V5_BINDING_DRIFT", "v2.14 的历史 v5 binding 漂移。 ");
  }
  return { predecessorV1, parentBrowserGraph, westernManifestV5, fourSystemV214 };
}

async function enumerateRoot(workspaceRoot, rootRelativePath) {
  const rootAbsolute = path.resolve(workspaceRoot, rootRelativePath);
  const rootReal = await realpath(rootAbsolute);
  if (normalizePathIdentity(rootReal) !== normalizePathIdentity(rootAbsolute)) {
    fail("ROOT_ALIAS_REJECTED", `${rootRelativePath} 根目录是 alias。`);
  }
  const files = [];
  async function visit(directoryAbsolute, directoryRelative, depth) {
    const directoryStats = await lstat(directoryAbsolute, { bigint: true });
    if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
      fail("NON_ORDINARY_DIRECTORY", `${directoryRelative} 不是普通目录。`);
    }
    const entries = await readdir(directoryAbsolute, { withFileTypes: true });
    entries.sort((left, right) => compare(left.name, right.name));
    for (const entry of entries) {
      const childRelative = `${directoryRelative}/${entry.name}`;
      const childAbsolute = path.resolve(directoryAbsolute, entry.name);
      if (!normalizePathIdentity(childAbsolute).startsWith(`${normalizePathIdentity(rootAbsolute)}${path.sep}`)) {
        fail("PATH_ESCAPE_REJECTED", `${childRelative} 逃逸 allowlisted root。`);
      }
      const stats = await lstat(childAbsolute, { bigint: true });
      if (stats.isSymbolicLink()) fail("REPARSE_POINT_REJECTED", `${childRelative} 是 symlink/junction。`);
      if (stats.isDirectory()) {
        if (depth === 0 && EXCLUDED_DIRECT_RUNTIME_DIRS.has(entry.name)) continue;
        await visit(childAbsolute, childRelative, depth + 1);
      } else if (stats.isFile()) {
        if (stats.nlink !== 1n) fail("HARDLINK_REJECTED", `${childRelative} 不是单链接文件。`);
        files.push(childRelative.replaceAll("\\", "/"));
      } else {
        fail("NON_ORDINARY_ENDPOINT", `${childRelative} 不是普通文件或目录。`);
      }
    }
  }
  await visit(rootAbsolute, rootRelativePath, 0);
  return files.sort(compare);
}

async function enumerateWesternPaths(workspaceRoot, roots) {
  const groups = [];
  for (const root of roots) groups.push(await enumerateRoot(workspaceRoot, root));
  const all = groups.flat().sort(compare);
  if (new Set(all.map((entry) => entry.toLowerCase())).size !== all.length) {
    fail("CASE_FOLD_COLLISION", "Western 六根路径存在大小写折叠冲突。 ");
  }
  return all;
}

async function readIdentityPass(workspaceRoot, paths) {
  const output = [];
  for (const relativePath of paths) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    output.push({ path: relativePath, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 });
  }
  return output;
}

async function readWesternTwice(workspaceRoot, historicalFiles, roots) {
  const expectedPaths = historicalFiles.map((entry) => entry.path).sort(compare);
  const beforePaths = await enumerateWesternPaths(workspaceRoot, roots);
  if (!exact(beforePaths, expectedPaths)) fail("WESTERN_PATH_SET_DRIFT", "Western 六根当前路径集漂移。 ");
  const first = await readIdentityPass(workspaceRoot, expectedPaths);
  const middlePaths = await enumerateWesternPaths(workspaceRoot, roots);
  if (!exact(middlePaths, expectedPaths)) fail("WESTERN_PATH_SET_DRIFT", "Western 第一遍后路径集漂移。 ");
  const second = await readIdentityPass(workspaceRoot, expectedPaths);
  const afterPaths = await enumerateWesternPaths(workspaceRoot, roots);
  if (!exact(afterPaths, expectedPaths) || !exact(first, second)) {
    fail("WESTERN_DOUBLE_READ_DRIFT", "Western 六根双遍稳定读取不一致。 ");
  }
  return first;
}

async function readGraphTwice(workspaceRoot, historicalFiles) {
  const paths = historicalFiles.map((entry) => entry.path);
  const first = await readIdentityPass(workspaceRoot, paths);
  const second = await readIdentityPass(workspaceRoot, paths);
  if (!exact(first, second)) fail("PARENT_GRAPH_DOUBLE_READ_DRIFT", "父构建图双遍读取不一致。 ");
  return first;
}

function compareFiles(historicalFiles, currentFiles) {
  if (historicalFiles.length !== currentFiles.length) fail("COMPARED_PATH_COUNT_DRIFT", "比较路径数漂移。 ");
  const currentByPath = new Map(currentFiles.map((entry) => [entry.path, entry]));
  const drift = [];
  let unchangedCount = 0;
  for (const historical of historicalFiles) {
    const current = currentByPath.get(historical.path);
    if (!current) fail("COMPARED_PATH_MISSING", `${historical.path} 缺失。`);
    if (current.bytes === historical.bytes && current.sha256 === historical.sha256) {
      unchangedCount += 1;
    } else {
      drift.push({
        path: historical.path,
        historical: { bytes: historical.bytes, sha256: historical.sha256 },
        current: { bytes: current.bytes, sha256: current.sha256 }
      });
    }
  }
  return { drift, unchangedCount };
}

function historicalBindings() {
  return REFLECT_APPLY(OBJECT_VALUES, Object, [HISTORICAL]).map((entry) => ({
    role: entry.role,
    path: entry.path,
    rawBytes: entry.rawBytes,
    rawSha256: entry.rawSha256,
    semanticDigestField: entry.digestField,
    semanticDigest: entry.semanticDigest,
    rawAndSelfDigestVerified: true,
    fullLoaderImported: false,
    fullLoaderInvoked: false,
    privateBrandConsumed: false,
    brandCurrent: false,
    currentEndpointClaimed: false,
    preservedUnmodified: true
  }));
}

function rootCounts(files, roots) {
  const result = Object.create(null);
  for (const root of roots) result[root] = files.filter((entry) => entry.path.startsWith(`${root}/`)).length;
  return result;
}

function driftCounts(drift, roots) {
  const result = Object.create(null);
  for (const root of roots) result[root] = drift.filter((entry) => entry.path.startsWith(`${root}/`)).length;
  return result;
}

export async function buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2(options = {}) {
  const workspaceRoot = fixedWorkspaceRoot(options.workspaceRoot);
  const historical = await readHistorical(workspaceRoot);
  const graphClosure = historical.parentBrowserGraph.value.expectedAuthoredBuildInputClosure;
  const westernClosure = historical.westernManifestV5.value.recursiveAuthoredRootClosure;
  if (graphClosure.fileCount !== 24 || graphClosure.files?.length !== 24
    || graphClosure.graphDigest !== "45b70e7373489b8eaf5d21fa68a881ae0c243a644d067e521c5e82cb85b6d0bb") {
    fail("HISTORICAL_PARENT_GRAPH_DRIFT", "历史父构建图身份漂移。 ");
  }
  if (westernClosure.allowlistedRootCount !== 6 || westernClosure.files?.length !== 110
    || westernClosure.expectedAuthoredOrdinaryFileCount !== 110) {
    fail("HISTORICAL_WESTERN_CLOSURE_DRIFT", "历史 Western 六根闭包身份漂移。 ");
  }

  const graphCurrent = await readGraphTwice(workspaceRoot, graphClosure.files);
  const westernCurrent = await readWesternTwice(
    workspaceRoot,
    westernClosure.files,
    westernClosure.allowlistedRoots
  );
  const graphComparison = compareFiles(graphClosure.files, graphCurrent);
  const westernComparison = compareFiles(westernClosure.files, westernCurrent);
  const graphPaths = new Set(graphComparison.drift.map((entry) => entry.path));
  const westernPaths = new Set(westernComparison.drift.map((entry) => entry.path));
  const overlap = [...graphPaths].filter((entry) => westernPaths.has(entry));

  const unsigned = {
    schemaVersion: "2.0.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    candidateStatus: STATUS,
    activeAdmissionEffect: "none",
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    },
    lineage: {
      predecessorCandidateId:
        "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0",
      historicalWesternManifestPath: HISTORICAL.westernManifestV5.path,
      historicalFourSystemStatusPath: HISTORICAL.fourSystemV214.path,
      successorManifestCreated: false,
      successorFourSystemStatusCreated: false
    },
    historicalRawSelfBindings: historicalBindings(),
    driftPartitions: {
      preExistingParentBuildGraph: {
        classification: "pre_existing_parent_build_graph_drift_per_prior_read_only_observation",
        historicalGraphPathCount: 24,
        comparedPathCount: graphCurrent.length,
        driftCount: graphComparison.drift.length,
        unchangedCount: graphComparison.unchangedCount,
        missingCount: 0,
        currentGraphMatchesHistorical: graphComparison.drift.length === 0,
        persistedPreTrancheSnapshotAvailable: false,
        trustedTemporalOrderEstablished: false,
        causalOriginEstablished: false,
        doubleReadStable: true,
        drift: graphComparison.drift
      },
      westernSixRootSource: {
        classification: "current_western_zodiac_method_and_dependent_source_drift_observation",
        allowlistedRoots: westernClosure.allowlistedRoots,
        historicalPathCount: 110,
        currentPathCount: westernCurrent.length,
        addedPathCount: 0,
        missingPathCount: 0,
        driftCount: westernComparison.drift.length,
        unchangedCount: westernComparison.unchangedCount,
        rootFileCounts: rootCounts(westernCurrent, westernClosure.allowlistedRoots),
        rootDriftCounts: driftCounts(westernComparison.drift, westernClosure.allowlistedRoots),
        pathSetExact: true,
        doubleReadStable: true,
        crossFileAtomicSnapshotEstablished: false,
        intervalIntegrityEstablished: false,
        abaExcluded: false,
        drift: westernComparison.drift
      }
    },
    crossPartitionBoundary: {
      changedPathSetsDisjoint: overlap.length === 0,
      overlapPaths: overlap,
      packageGraphPathsOutsideSixWesternRoots: true,
      totalDistinctChangedPaths: new Set([...graphPaths, ...westernPaths]).size,
      mustRemainSeparateAccounting: true,
      singleCausalEventEstablished: false,
      uniqueBlockerClaimed: false,
      collapseIntoCurrentManifestForbidden: true
    },
    currentnessBoundary: {
      historicalWesternV5Current: false,
      historicalFourSystemV214Current: false,
      currentEngineeringManifestMechanicallyVerified: false,
      currentFullDomainManifestMechanicallyVerified: false,
      currentFourSystemStatusMechanicallyVerified: false,
      currentPrivateParentBrandsVerified: 0,
      persistedAsDomainManifest: false,
      persistedAsFourSystemChild: false,
      persistedAsCentralRegistry: false,
      newBrowserEvidenceEstablished: false
    },
    gateSummary: {
      westernIndependentProductizationSubgatesPassed: 0,
      westernIndependentProductizationSubgatesTotal: 8,
      bindingSubjectsFrozen: 0,
      bindingSubjectsRequired: 28,
      realIndependentExpertReviews: 0,
      realIndependentExpertReviewsRequired: 2,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false
    },
    evidenceLedgerSeparation: {
      engineeringEvidenceIsContentTruth: false,
      browserRuntimeEvidenceIsExpertTruth: false,
      sourceIdentityIsRightsLegalConclusion: false,
      rightsEvidenceIsPublicReleaseAuthorization: false,
      expertOpinionIsPredictiveAccuracyProof: false
    },
    ownerDecisionBoundary: {
      ownerAcceptanceVerified: false,
      ownerAttributionVerified: false,
      ownerDecisionsRecorded: 0,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      fourSystemRebindAuthorized: false,
      fourSystemResignAuthorized: false,
      centralRegistryUpdateAuthorized: false,
      centralRegistryResignAuthorized: false,
      formalAdmissionPromotionAuthorized: false,
      currentAuthorityAuthorized: false
    },
    observationBoundary: {
      heldHandlePerFile: true,
      completeWesternTreeReadTwice: true,
      parentGraphReadTwice: true,
      mutationEpochBound: false,
      trustedTimestampEstablished: false,
      crossFileAtomicSnapshotEstablished: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    runtimeTrustBoundary: {
      historicalFullLoaderImported: false,
      historicalFullLoaderInvoked: false,
      historicalPrivateBrandConsumed: false,
      currentRuntimeAttested: false,
      signerIdentityEstablished: false,
      digitalSignatureVerified: false
    },
    authorityBoundary: {
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      sourceRedistributionAuthorized: false,
      formalAdmissionAllowed: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    doesNotEstablish: [
      "current_western_manifest_or_four_system_status",
      "full_domain_or_product_identity",
      "content_or_expert_truth",
      "source_rights_or_redistribution_legal_conclusion",
      "real_expert_identity_qualification_independence_or_opinion",
      "predictive_accuracy_or_scientific_validity",
      "full_application_pwa_service_worker_public_host_or_release_evidence",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_readiness_deployment_rollback_or_public_release_authorization"
    ]
  };
  const receipt = { ...unsigned, receiptDigest: computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(unsigned) };
  assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(receipt);
  return deepFreeze(receipt);
}

export function assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(value) {
  const captured = captureJson(value, "receipt");
  assertExactKeys(captured, [
    "activeAdmissionEffect", "authorityBoundary", "candidateId", "candidateStatus",
    "crossPartitionBoundary", "currentnessBoundary", "doesNotEstablish", "driftPartitions",
    "evidenceLedgerSeparation", "gateSummary", "historicalRawSelfBindings", "lineage",
    "observationBoundary", "ownerDecisionBoundary", "receiptDigest", "recordType",
    "releaseGovernance", "runtimeTrustBoundary", "schemaVersion"
  ], "RECEIPT_KEYS_INVALID");
  if (captured.schemaVersion !== "2.0.0" || captured.recordType !== RECORD_TYPE
    || captured.candidateId !== CANDIDATE_ID || captured.candidateStatus !== STATUS
    || captured.activeAdmissionEffect !== "none") {
    fail("RECEIPT_IDENTITY_INVALID", "v2 drift receipt 身份漂移。 ");
  }
  const graph = captured.driftPartitions?.preExistingParentBuildGraph;
  const western = captured.driftPartitions?.westernSixRootSource;
  assertExactKeys(captured.driftPartitions, [
    "preExistingParentBuildGraph", "westernSixRootSource"
  ], "DRIFT_PARTITION_KEYS_INVALID");
  assertExactKeys(graph, [
    "causalOriginEstablished", "classification", "comparedPathCount",
    "currentGraphMatchesHistorical", "doubleReadStable", "drift", "driftCount",
    "historicalGraphPathCount", "missingCount", "persistedPreTrancheSnapshotAvailable",
    "trustedTemporalOrderEstablished", "unchangedCount"
  ], "PARENT_GRAPH_KEYS_INVALID");
  assertExactKeys(western, [
    "abaExcluded", "addedPathCount", "allowlistedRoots", "classification",
    "crossFileAtomicSnapshotEstablished", "currentPathCount", "doubleReadStable", "drift",
    "driftCount", "historicalPathCount", "intervalIntegrityEstablished", "missingPathCount",
    "pathSetExact", "rootDriftCounts", "rootFileCounts", "unchangedCount"
  ], "WESTERN_PARTITION_KEYS_INVALID");
  if (graph?.historicalGraphPathCount !== 24 || graph.comparedPathCount !== 24
    || graph.driftCount !== 2 || graph.unchangedCount !== 22 || graph.missingCount !== 0
    || graph.currentGraphMatchesHistorical !== false || graph.doubleReadStable !== true
    || western?.historicalPathCount !== 110 || western.currentPathCount !== 110
    || western.addedPathCount !== 0 || western.missingPathCount !== 0
    || western.driftCount !== 18 || western.unchangedCount !== 92
    || western.pathSetExact !== true || western.doubleReadStable !== true) {
    fail("DRIFT_PARTITION_INVALID", "v2 drift receipt 两个漂移分区计数或稳定性漂移。 ");
  }
  const graphSummary = clone(graph);
  delete graphSummary.drift;
  assertExact(graphSummary, {
    classification: "pre_existing_parent_build_graph_drift_per_prior_read_only_observation",
    historicalGraphPathCount: 24, comparedPathCount: 24, driftCount: 2,
    unchangedCount: 22, missingCount: 0, currentGraphMatchesHistorical: false,
    persistedPreTrancheSnapshotAvailable: false, trustedTemporalOrderEstablished: false,
    causalOriginEstablished: false, doubleReadStable: true
  }, "PARENT_GRAPH_SUMMARY_INVALID");
  const westernSummary = clone(western);
  delete westernSummary.drift;
  assertExact(westernSummary, {
    classification: "current_western_zodiac_method_and_dependent_source_drift_observation",
    allowlistedRoots: [
      "isolated-drafts/western-civil-time-fact-browser-draft",
      "packages/tzdb-core",
      "packages/western-astrology-contracts-draft",
      "packages/western-astrology-rules-preview-draft",
      "packages/western-astronomy-engine-adapter-draft",
      "packages/western-civil-time-input-adapter-draft"
    ],
    historicalPathCount: 110, currentPathCount: 110, addedPathCount: 0,
    missingPathCount: 0, driftCount: 18, unchangedCount: 92,
    rootFileCounts: {
      "isolated-drafts/western-civil-time-fact-browser-draft": 27,
      "packages/tzdb-core": 8,
      "packages/western-astrology-contracts-draft": 6,
      "packages/western-astrology-rules-preview-draft": 24,
      "packages/western-astronomy-engine-adapter-draft": 40,
      "packages/western-civil-time-input-adapter-draft": 5
    },
    rootDriftCounts: {
      "isolated-drafts/western-civil-time-fact-browser-draft": 0,
      "packages/tzdb-core": 0,
      "packages/western-astrology-contracts-draft": 0,
      "packages/western-astrology-rules-preview-draft": 12,
      "packages/western-astronomy-engine-adapter-draft": 6,
      "packages/western-civil-time-input-adapter-draft": 0
    },
    pathSetExact: true, doubleReadStable: true,
    crossFileAtomicSnapshotEstablished: false, intervalIntegrityEstablished: false,
    abaExcluded: false
  }, "WESTERN_PARTITION_SUMMARY_INVALID");
  if (canonicalDigest(graph.drift) !== EXPECTED_GRAPH_DRIFT_DIGEST
    || canonicalDigest(western.drift) !== EXPECTED_WESTERN_DRIFT_DIGEST
    || canonicalDigest(western.rootFileCounts) !== EXPECTED_ROOT_FILE_COUNTS_DIGEST
    || canonicalDigest(western.rootDriftCounts) !== EXPECTED_ROOT_DRIFT_COUNTS_DIGEST) {
    fail("DRIFT_IDENTITY_INVALID", "v2 drift receipt 精确漂移 identity 漂移。 ");
  }
  assertExact(captured.releaseGovernance, {
    releaseIdentity: "legacy-v13", targetSchema: 13, migrationId: null,
    publicDeploymentAuthorized: false, expertClaimsAuthorized: false,
    publicReleaseAuthorized: false
  }, "RELEASE_GOVERNANCE_INVALID");
  assertExact(captured.lineage, {
    predecessorCandidateId:
      "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0",
    historicalWesternManifestPath: HISTORICAL.westernManifestV5.path,
    historicalFourSystemStatusPath: HISTORICAL.fourSystemV214.path,
    successorManifestCreated: false,
    successorFourSystemStatusCreated: false
  }, "LINEAGE_INVALID");
  assertExact(captured.historicalRawSelfBindings, historicalBindings(), "HISTORICAL_BINDING_INVALID");
  assertExact(captured.crossPartitionBoundary, {
    changedPathSetsDisjoint: true, overlapPaths: [], packageGraphPathsOutsideSixWesternRoots: true,
    totalDistinctChangedPaths: 20, mustRemainSeparateAccounting: true,
    singleCausalEventEstablished: false, uniqueBlockerClaimed: false,
    collapseIntoCurrentManifestForbidden: true
  }, "CROSS_PARTITION_BOUNDARY_INVALID");
  assertExact(captured.currentnessBoundary, {
    historicalWesternV5Current: false, historicalFourSystemV214Current: false,
    currentEngineeringManifestMechanicallyVerified: false,
    currentFullDomainManifestMechanicallyVerified: false,
    currentFourSystemStatusMechanicallyVerified: false, currentPrivateParentBrandsVerified: 0,
    persistedAsDomainManifest: false, persistedAsFourSystemChild: false,
    persistedAsCentralRegistry: false, newBrowserEvidenceEstablished: false
  }, "CURRENTNESS_BOUNDARY_INVALID");
  assertExact(captured.gateSummary, {
    westernIndependentProductizationSubgatesPassed: 0,
    westernIndependentProductizationSubgatesTotal: 8,
    bindingSubjectsFrozen: 0, bindingSubjectsRequired: 28,
    realIndependentExpertReviews: 0, realIndependentExpertReviewsRequired: 2,
    contentTruthEstablished: false, expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false, releaseReady: false
  }, "GATE_SUMMARY_INVALID");
  assertExact(captured.evidenceLedgerSeparation, {
    engineeringEvidenceIsContentTruth: false, browserRuntimeEvidenceIsExpertTruth: false,
    sourceIdentityIsRightsLegalConclusion: false,
    rightsEvidenceIsPublicReleaseAuthorization: false,
    expertOpinionIsPredictiveAccuracyProof: false
  }, "LEDGER_SEPARATION_INVALID");
  assertExact(captured.ownerDecisionBoundary, {
    ownerAcceptanceVerified: false, ownerAttributionVerified: false, ownerDecisionsRecorded: 0,
    manifestRebindAuthorized: false, manifestResignAuthorized: false,
    fourSystemRebindAuthorized: false, fourSystemResignAuthorized: false,
    centralRegistryUpdateAuthorized: false, centralRegistryResignAuthorized: false,
    formalAdmissionPromotionAuthorized: false, currentAuthorityAuthorized: false
  }, "OWNER_BOUNDARY_INVALID");
  assertExact(captured.observationBoundary, {
    heldHandlePerFile: true, completeWesternTreeReadTwice: true, parentGraphReadTwice: true,
    mutationEpochBound: false, trustedTimestampEstablished: false,
    crossFileAtomicSnapshotEstablished: false, intervalMutationExcluded: false, abaExcluded: false
  }, "OBSERVATION_BOUNDARY_INVALID");
  assertExact(captured.runtimeTrustBoundary, {
    historicalFullLoaderImported: false, historicalFullLoaderInvoked: false,
    historicalPrivateBrandConsumed: false, currentRuntimeAttested: false,
    signerIdentityEstablished: false, digitalSignatureVerified: false
  }, "RUNTIME_TRUST_BOUNDARY_INVALID");
  assertExact(captured.authorityBoundary, {
    domainAuthorityAuthorized: false, expertClaimsAuthorized: false,
    sourceRedistributionAuthorized: false, formalAdmissionAllowed: false,
    publicDeploymentAuthorized: false, publicReleaseAuthorized: false
  }, "AUTHORITY_ESCALATION");
  assertExact(captured.doesNotEstablish, [
    "current_western_manifest_or_four_system_status", "full_domain_or_product_identity",
    "content_or_expert_truth", "source_rights_or_redistribution_legal_conclusion",
    "real_expert_identity_qualification_independence_or_opinion",
    "predictive_accuracy_or_scientific_validity",
    "full_application_pwa_service_worker_public_host_or_release_evidence",
    "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
    "release_readiness_deployment_rollback_or_public_release_authorization"
  ], "DOES_NOT_ESTABLISH_INVALID");
  if (!SHA256.test(captured.receiptDigest ?? "")
    || computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(captured)
      !== captured.receiptDigest) {
    fail("RECEIPT_DIGEST_INVALID", "v2 drift receipt self digest 漂移。 ");
  }
  return deepFreeze(captured);
}

export async function loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2(options = {}) {
  const workspaceRoot = fixedWorkspaceRoot(options.workspaceRoot);
  if (EXPECTED_PERSISTED_IDENTITY.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_IDENTITY.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "v2 drift receipt 固定 raw identity 尚未冻结。 ");
  }
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_V2_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_IDENTITY.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_IDENTITY.rawSha256) {
    fail("PERSISTED_RAW_IDENTITY_DRIFT", "v2 drift receipt persisted raw identity 漂移。 ");
  }
  const persisted = assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(
    parseBaziDttStrictJsonArtifact(snapshot)
  );
  if (serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2(persisted)
    !== Buffer.from(snapshot.bytes).toString("utf8")) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "v2 drift receipt 不是 canonical pretty JSON + LF。 ");
  }
  const current = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  if (!exact(persisted, current)) fail("CURRENT_RECEIPT_MISMATCH", "persisted v2 receipt 不等于当前观察。 ");
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [persisted]);
  return persisted;
}

export function isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value]);
}

export const westernSourceAndManifestIdentityDriftReceiptCandidateV2TestOnly = freeze({
  MODULE_ROOT,
  HISTORICAL,
  EXPECTED_PERSISTED_IDENTITY,
  captureJson,
  canonical,
  deepFreeze,
  enumerateWesternPaths,
  readHistorical
});
