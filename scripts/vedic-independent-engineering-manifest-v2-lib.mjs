import { createHash } from "node:crypto";

import {
  isVerifiedVedicIndependentEngineeringManifestV1,
  parseVedicIndependentEngineeringManifestV1JsonBytes,
  readCurrentVedicIndependentEngineeringManifestV1,
  vedicIndependentEngineeringManifestV1TestOnly as v1TestOnly
} from "./vedic-independent-engineering-manifest-v1-lib.mjs";
import {
  VEDIC_SAME_ARTIFACT_CANDIDATE_PATH,
  isVerifiedVedicSameArtifactCandidate,
  loadVedicSameArtifactCandidate,
  vedicSameArtifactTestOnly
} from "./vedic-civil-time-same-artifact-browser-observation-lib.mjs";
import {
  vedicProductizationVersionAwareObservationChildV12TestOnly as stableReadTestOnly
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_BUFFER = Buffer;
const NATIVE_MAP = Map;
const NATIVE_SET = Set;
const NATIVE_WEAK_SET = WeakSet;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_KEYS = Object.keys;
const MAP_GET = Map.prototype.get;
const MAP_HAS = Map.prototype.has;
const MAP_SET = Map.prototype.set;
const REFLECT_APPLY = Reflect.apply;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

const HASH_PRIMORDIAL_INSTANCE = createHash("sha256");
const HASH_PROTOTYPE = Object.getPrototypeOf(HASH_PRIMORDIAL_INSTANCE);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
REFLECT_APPLY(HASH_DIGEST, HASH_PRIMORDIAL_INSTANCE, ["hex"]);

const canonicalStringify = v1TestOnly.canonicalStringify;
const readStableWorkspaceFile = stableReadTestOnly.readStableWorkspaceFile;

export const VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH =
  "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json";

const MANIFEST_ID =
  "hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest/2.0.0";
const RECORD_TYPE =
  "vedic_parent_declared_selected_path_machine_identity_manifest_v2";
const STATUS =
  "current_parent_declared_selected_path_machine_identity_zero_admission_effect";
const CREATED_AT = "2026-09-01T00:00:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest.v2";
const SELECTED_PATH_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.parent-declared-selected-path-set.v2";
const COMPONENT_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.path-name-file-role-component-reference.v2";
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_SURFACE_BYTES = 64 * 1024;

const EXPECTED_PREDECESSOR = OBJECT_FREEZE({
  path: "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json",
  rawBytes: 19_557,
  rawSha256: "a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5",
  manifestId:
    "hakimi.vedic-astrology.isolated-engineering-current-machine-identity-manifest/1.0.0",
  manifestDigest:
    "96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685"
});

const EXPECTED_BROWSER_CHILD = OBJECT_FREEZE({
  path: VEDIC_SAME_ARTIFACT_CANDIDATE_PATH,
  rawBytes: 41_077,
  rawSha256: "fef063bb880ca0f65aa9fa10ac65cd5d6733216c1aa83faaa05fc536e7431710",
  childId: "hakimi.vedic.civil-time.same-artifact-edge-chrome-observation/1.0.0",
  observationDigest:
    "795638cbe93459ad598c2a138f627c2ba4a9db28b4bebd528e78d934083f3f6e",
  authoredGraphDigest:
    "c6132f9397dfceadbb5e29764e061eee6694ab705d27e224a2762502d05bec6f",
  lockedGraphDigest:
    "ded4e291d462d842ac53b453b6bd3bec1888afbb4aa174639fc9f49657b54b80",
  evidenceToolGraphDigest:
    "ff1a8bc71fc70c4f6b375b5dc0b97b87f67f49d266e49a7f9f12cebf971031e3",
  outputTreeDigest:
    "cceaaa8766293f4fe778ccc9af0723953556c328c6631acf503e009c1efa424e"
});

const SURFACE_PACKAGE_PATH =
  "isolated-drafts/vedic-civil-time-fact-browser-draft/package.json";

const COMPONENT_PATHS = OBJECT_FREEZE({
  execution_rules: OBJECT_FREEZE([
    "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-worker.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/worker-fact-projection.ts",
    "packages/tzdb-core/src/index.ts",
    "packages/tzdb-core/src/packed-resolver.ts",
    "packages/tzdb-core/src/artifacts/iana-2025b.ts"
  ]),
  interpretation_rules: OBJECT_FREEZE([]),
  input_policy: OBJECT_FREEZE([
    "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
    "content/system-admission/vedic-input-admission-readiness-candidate.v0.1.0.json",
    "content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json",
    "packages/vedic-input-admission-kernel-draft/src/evaluator.test.ts",
    "packages/vedic-input-admission-kernel-draft/src/evaluator.ts",
    "packages/vedic-input-admission-kernel-draft/src/frozen-packet-schema.ts",
    "packages/vedic-input-admission-kernel-draft/src/protocol.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/input-contract.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/protocol.ts"
  ]),
  fact_contract: OBJECT_FREEZE([
    "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.test.ts",
    "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-worker.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/constants.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/worker-fact-projection.ts"
  ]),
  source_bundle: OBJECT_FREEZE([
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json",
    "packages/tzdb-core/package.json",
    "packages/tzdb-core/src/artifacts/iana-2025b.ts"
  ]),
  rights_bundle: OBJECT_FREEZE([
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json"
  ]),
  expert_review_bundle: OBJECT_FREEZE([]),
  high_risk_policy: OBJECT_FREEZE([
    "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json"
  ]),
  report_contract: OBJECT_FREEZE([
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/main.ts",
    "isolated-drafts/vedic-civil-time-fact-browser-draft/src/ui-format.ts"
  ])
});

const COMPONENT_ORDER = OBJECT_FREEZE([
  "execution_rules",
  "interpretation_rules",
  "input_policy",
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "high_risk_policy",
  "report_contract"
]);

const COMPONENT_STATUS = OBJECT_FREEZE({
  execution_rules:
    "incomplete_civil_time_tzdb_implementation_slice_not_executed_or_vedic_ruleset",
  interpretation_rules: "absent_no_interpretation_rules_selected",
  input_policy: "incomplete_draft_input_policy_and_kernel_implementation_only",
  fact_contract: "incomplete_draft_fact_implementation_and_test_evidence_only",
  source_bundle:
    "incomplete_requirements_and_private_package_metadata_not_source_provenance",
  rights_bundle: "requirements_only_no_rights_evidence_or_legal_conclusion",
  expert_review_bundle:
    "absent_no_expert_review_instance_selected_plan_is_attachment_only",
  high_risk_policy: "incomplete_draft_policy_only_not_bound",
  report_contract:
    "preview_projection_implementation_only_no_report_contract"
});

const FACT_BROWSER_OMITTED_NON_EVIDENCE = OBJECT_FREEZE([
  "isolated-drafts/vedic-civil-time-fact-browser-draft/README.md",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/browser-fact-projection.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-client.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/civil-time.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/input-contract.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/src/ui-format.test.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/vitest.config.ts"
]);

const FACT_BROWSER_EVIDENCE_TOOL_ONLY = OBJECT_FREEZE([
  "isolated-drafts/vedic-civil-time-fact-browser-draft/playwright.same-artifact-evidence.config.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/tsconfig.same-artifact-evidence.json",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/civil-time-browser-gate.spec.ts",
  "isolated-drafts/vedic-civil-time-fact-browser-draft/e2e/same-artifact-summary-reporter.ts"
]);

const TZDB_CORE_OMITTED = OBJECT_FREEZE([
  "packages/tzdb-core/scripts/run-release-gate.mjs",
  "packages/tzdb-core/scripts/verify-artifact.mjs",
  "packages/tzdb-core/scripts/verify-artifact.test.mjs",
  "packages/tzdb-core/src/index.test.ts"
]);

const HISTORICAL_SCENARIO_RUNTIME_PATHS = OBJECT_FREEZE([
  "assets/civil-worker-DltlCpqw.js",
  "assets/index-BxE6jOMI.js",
  "assets/index-OpA1Rqqk.css",
  "index.html"
]);

const HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS = OBJECT_FREEZE([
  "assets/iana-2025b-BLy5AmWt.js"
]);

const HISTORICAL_NEITHER_SCENARIO_NOR_PROBE_PATHS = OBJECT_FREEZE([
  "assets/civil-worker-DltlCpqw.js.map",
  "assets/iana-2025b-BLy5AmWt.js.map",
  "assets/index-BxE6jOMI.js.map",
  "hakimi-vedic-fact-only-build-manifest.v1.json",
  "licenses/moment-2.30.1-LICENSE.txt",
  "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
  "licenses/moment-timezone-0.6.3-LICENSE.txt"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 47_107,
  rawSha256: "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4",
  manifestDigest: "7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class VedicIndependentEngineeringManifestV2Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicIndependentEngineeringManifestV2Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new VedicIndependentEngineeringManifestV2Error(code, message, options);
}

function canonicalValue(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
  } catch (cause) {
    if (cause instanceof VedicIndependentEngineeringManifestV2Error) throw cause;
    fail("NON_CANONICAL_JSON_VALUE", "Vedic v2 只接受被动、无别名的 JSON 值。", { cause });
  }
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  for (const key of OBJECT_KEYS(descriptors)) {
    const descriptor = descriptors[key];
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "Vedic v2 结果不得包含 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainDigest(domain, value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function codeUnitPathCompare(left, right) {
  if (left.path < right.path) return -1;
  if (left.path > right.path) return 1;
  return 0;
}

function codeUnitStringCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function exactHistoricalOutputPathPartition(outputFiles) {
  if (!ARRAY_IS_ARRAY(outputFiles) || outputFiles.length !== 12) return false;
  const expected = [];
  const seen = new NATIVE_SET();
  let seenCount = 0;
  const groups = [
    HISTORICAL_SCENARIO_RUNTIME_PATHS,
    HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS,
    HISTORICAL_NEITHER_SCENARIO_NOR_PROBE_PATHS
  ];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    for (let index = 0; index < group.length; index += 1) {
      const path = group[index];
      if (REFLECT_APPLY(SET_HAS, seen, [path])) return false;
      REFLECT_APPLY(SET_ADD, seen, [path]);
      seenCount += 1;
      REFLECT_APPLY(ARRAY_PUSH, expected, [path]);
    }
  }
  if (seenCount !== 12) return false;
  const actual = [];
  for (let index = 0; index < outputFiles.length; index += 1) {
    const file = outputFiles[index];
    if (file === null || typeof file !== "object"
      || typeof file.path !== "string") return false;
    REFLECT_APPLY(ARRAY_PUSH, actual, [file.path]);
  }
  REFLECT_APPLY(ARRAY_SORT, expected, [codeUnitStringCompare]);
  REFLECT_APPLY(ARRAY_SORT, actual, [codeUnitStringCompare]);
  return exactJson(expected, actual);
}

function stripDeclaredBy(file) {
  return {
    path: file.path,
    bytes: file.bytes,
    sha256: file.sha256
  };
}

function requireVerifiedPredecessor(value) {
  if (!isVerifiedVedicIndependentEngineeringManifestV1(value)) {
    fail(
      "PREDECESSOR_PRIVATE_BRAND_REQUIRED",
      "Vedic v2 只接受固定路径完整 v1 loader 的私有品牌。"
    );
  }
  if (value.artifact?.path !== EXPECTED_PREDECESSOR.path
    || value.artifact?.bytes !== EXPECTED_PREDECESSOR.rawBytes
    || value.artifact?.sha256 !== EXPECTED_PREDECESSOR.rawSha256
    || value.manifest?.manifestId !== EXPECTED_PREDECESSOR.manifestId
    || value.manifestDigest !== EXPECTED_PREDECESSOR.manifestDigest
    || value.manifest?.manifestDigest !== EXPECTED_PREDECESSOR.manifestDigest
    || value.manifest?.activeAdmissionEffect !== "none"
    || value.manifest?.componentAccounting?.componentFileReferences !== 33
    || value.manifest?.componentAccounting?.uniquePhysicalPaths !== 33
    || value.manifest?.productBoundary?.productIdentity !== null
    || value.manifest?.productBoundary?.releaseIdentity !== null
    || value.manifest?.productBoundary?.targetSchema !== null
    || value.manifest?.productBoundary?.migrationId !== null) {
    fail("PREDECESSOR_IDENTITY_MISMATCH", "Vedic v1 私有品牌内容或全红边界漂移。");
  }
  return value;
}

function requireVerifiedBrowserChild(value) {
  if (!isVerifiedVedicSameArtifactCandidate(value)) {
    fail(
      "BROWSER_CHILD_PRIVATE_BRAND_REQUIRED",
      "Vedic v2 只接受 fixed-path same-artifact child loader 的私有品牌。"
    );
  }
  if (value.childId !== EXPECTED_BROWSER_CHILD.childId
    || value.observationDigest !== EXPECTED_BROWSER_CHILD.observationDigest
    || value.status
      !== "isolated_fact_only_single_build_dual_browser_observation_not_admitted"
    || value.activeAdmissionEffect !== "none"
    || value.expectedAuthoredBuildInputClosure?.fileCount !== 24
    || value.expectedAuthoredBuildInputClosure?.graphDigest
      !== EXPECTED_BROWSER_CHILD.authoredGraphDigest
    || value.lockedBuildInputSnapshot?.inputCount !== 17
    || value.lockedBuildInputSnapshot?.graphDigest
      !== EXPECTED_BROWSER_CHILD.lockedGraphDigest
    || value.evidenceToolingSnapshot?.fileCount !== 20
    || value.evidenceToolingSnapshot?.graphDigest
      !== EXPECTED_BROWSER_CHILD.evidenceToolGraphDigest
    || value.runtimeObservation?.outputTreeBefore?.fileCount !== 12
    || value.runtimeObservation?.outputTreeBefore?.treeDigest
      !== EXPECTED_BROWSER_CHILD.outputTreeDigest
    || value.runtimeObservation?.outputTreeAfter?.treeDigest
      !== EXPECTED_BROWSER_CHILD.outputTreeDigest
    || value.browserEvidenceBoundary?.chromeScenarioOutcomes !== 5
    || value.browserEvidenceBoundary?.edgeScenarioOutcomes !== 5
    || value.browserEvidenceBoundary?.totalPassedScenarioOutcomes !== 10
    || value.browserEvidenceBoundary?.formalChromeBrowserReceiptIssued !== false
    || value.browserEvidenceBoundary?.formalEdgeBrowserReceiptIssued !== false
    || value.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false
    || value.browserEvidenceBoundary?.publicHostValidated !== false
    || value.browserEvidenceBoundary?.pwaOrServiceWorkerValidated !== false
    || value.browserEvidenceBoundary?.retained2025bChunkScenarioRuntimeRequested !== false
    || value.browserEvidenceBoundary
      ?.retainedIanaChunkExecutedByCivilResolverEstablished !== false
    || !exactJson(
      value.runtimeObservation?.server?.scenarioRuntimePaths,
      HISTORICAL_SCENARIO_RUNTIME_PATHS
    )
    || !exactJson(
      value.runtimeObservation?.server?.evidenceOnlyOutputBodyProbePaths,
      HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS
    )
    || value.runtimeObservation?.server
      ?.scenarioRuntimePathsServedByBothBrowsers !== true
    || value.runtimeObservation?.server
      ?.evidenceOnlyOutputBodyProbePathsServedByBothBrowsers !== true
    || value.runtimeObservation?.server?.singleOutputTreeServedWithoutRebuild !== true
    || value.formalContext?.currentEngineeringManifestConsumesThisChild !== false
    || value.formalContext?.currentEngineeringManifestConsumesFactBrowserDraft !== false
    || value.systemIdentity?.productIdentity !== null
    || value.systemIdentity?.releaseIdentity !== null
    || value.systemIdentity?.targetSchema !== null
    || value.systemIdentity?.migrationId !== null
    || value.observationBoundary?.repositoryCrossFileAtomicSnapshot !== false
    || value.observationBoundary?.repositoryIntervalMutationExcluded !== false
    || value.observationBoundary?.repositoryAbaExcluded !== false
    || value.observationBoundary?.mutationEpochClaimed !== false
    || value.observationBoundary?.mutationEpochReceipt !== null
    || value.gateSummary?.bindingRequired !== 38
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.independentExpertsRequired !== 2
    || value.gateSummary?.independentExpertReviewsVerified !== 0
    || value.gateSummary?.admissionGatesRequired !== 8
    || value.gateSummary?.admissionGatesSatisfied !== 0
    || !exactHistoricalOutputPathPartition(
      value.runtimeObservation.outputTreeAfter.files
    )) {
    fail("BROWSER_CHILD_IDENTITY_MISMATCH", "same-artifact child 身份或有限证据边界漂移。");
  }
  return value;
}

function extractPredecessorFiles(predecessor) {
  const byPath = new NATIVE_MAP();
  const files = [];
  let fileCount = 0;
  const components = predecessor.manifest.components;
  if (!ARRAY_IS_ARRAY(components) || components.length !== 5) {
    fail("PREDECESSOR_PATH_SET_MISMATCH", "Vedic v1 component closure 数量漂移。");
  }
  for (const component of components) {
    if (!ARRAY_IS_ARRAY(component.files)) {
      fail("PREDECESSOR_PATH_SET_MISMATCH", "Vedic v1 component files 不是数组。");
    }
    for (const file of component.files) {
      if (REFLECT_APPLY(MAP_HAS, byPath, [file.path])) {
        fail("PREDECESSOR_PATH_SET_MISMATCH", "Vedic v1 selected paths 存在重复。");
      }
      const selected = {
        path: file.path,
        bytes: file.bytes,
        sha256: file.sha256,
        declaredBy: "predecessor_manifest_v1"
      };
      REFLECT_APPLY(MAP_SET, byPath, [file.path, selected]);
      REFLECT_APPLY(ARRAY_PUSH, files, [selected]);
      fileCount += 1;
    }
  }
  if (fileCount !== 33) {
    fail("PREDECESSOR_PATH_SET_MISMATCH", "Vedic v1 selected path 数量不为 33。");
  }
  return files;
}

function extractBrowserAuthoredFiles(child) {
  const files = child.expectedAuthoredBuildInputClosure.files;
  if (!ARRAY_IS_ARRAY(files) || files.length !== 24) {
    fail("BROWSER_AUTHORED_PATH_SET_MISMATCH", "browser child authored graph 不为 24。");
  }
  const byPath = new NATIVE_MAP();
  const selectedFiles = [];
  for (const file of files) {
    if (REFLECT_APPLY(MAP_HAS, byPath, [file.path])) {
      fail("BROWSER_AUTHORED_PATH_SET_MISMATCH", "browser child authored graph 路径重复。");
    }
    const selected = {
      path: file.path,
      bytes: file.bytes,
      sha256: file.sha256,
      declaredBy: "browser_child_expected_authored_build_graph"
    };
    REFLECT_APPLY(MAP_SET, byPath, [file.path, selected]);
    REFLECT_APPLY(ARRAY_PUSH, selectedFiles, [selected]);
  }
  return selectedFiles;
}

function buildSelectedFiles(predecessor, child) {
  const predecessorFiles = extractPredecessorFiles(predecessor);
  const browserFiles = extractBrowserAuthoredFiles(child);
  const byPath = new NATIVE_MAP();
  const files = [];
  for (const file of predecessorFiles) {
    REFLECT_APPLY(MAP_SET, byPath, [file.path, file]);
    REFLECT_APPLY(ARRAY_PUSH, files, [file]);
  }
  for (const file of browserFiles) {
    if (REFLECT_APPLY(MAP_HAS, byPath, [file.path])) {
      fail("SELECTED_PATH_OVERLAP", "33-path predecessor 与 24-path browser graph 不得重叠。");
    }
    REFLECT_APPLY(MAP_SET, byPath, [file.path, file]);
    REFLECT_APPLY(ARRAY_PUSH, files, [file]);
  }
  REFLECT_APPLY(ARRAY_SORT, files, [codeUnitPathCompare]);
  if (files.length !== 57) {
    fail("SELECTED_PATH_COUNT_MISMATCH", "parent-declared selected path union 不为 57。");
  }
  return files;
}

function componentBoundary(componentId) {
  const common = {
    componentComplete: false,
    semanticMembershipEstablished: false
  };
  if (componentId === "execution_rules") {
    return {
      ...common,
      retainedIana2025bCivilResolverExecutionEstablished: false,
      retainedIana2025bScenarioRuntimeRequested: false,
      vedicRulesetEstablished: false
    };
  }
  if (componentId === "interpretation_rules") {
    return { ...common, interpretationRulesEstablished: false };
  }
  if (componentId === "input_policy") {
    return { ...common, formalInputPolicyEstablished: false };
  }
  if (componentId === "fact_contract") {
    return {
      ...common,
      domainFactTruthEstablished: false,
      factContractEstablished: false,
      testEvidenceIsDomainTruth: false
    };
  }
  if (componentId === "source_bundle") {
    return {
      ...common,
      packageMetadataIsSourceProvenance: false,
      sourceBodyOrProvenanceEstablished: false
    };
  }
  if (componentId === "rights_bundle") {
    return {
      ...common,
      rightsBindingEstablished: false,
      rightsEvidenceEstablished: false,
      rightsLegalConclusionEstablished: false
    };
  }
  if (componentId === "expert_review_bundle") {
    return {
      ...common,
      expertIdentityQualificationIndependenceEstablished: false,
      expertReviewInstanceEstablished: false
    };
  }
  if (componentId === "high_risk_policy") {
    return { ...common, highRiskPolicyBound: false };
  }
  return {
    ...common,
    formalReportEstablished: false,
    reportContractEstablished: false
  };
}

function buildComponents(selectedFiles) {
  const selectedByPath = new NATIVE_MAP();
  for (const file of selectedFiles) {
    REFLECT_APPLY(MAP_SET, selectedByPath, [
      file.path,
      stripDeclaredBy(file)
    ]);
  }
  const components = [];
  const mappedPaths = new NATIVE_SET();
  let mappedPathCount = 0;
  let referenceCount = 0;
  for (const componentId of COMPONENT_ORDER) {
    const paths = COMPONENT_PATHS[componentId];
    const files = [];
    for (const path of paths) {
      const file = REFLECT_APPLY(MAP_GET, selectedByPath, [path]);
      if (file === undefined) {
        fail("COMPONENT_PATH_OUTSIDE_SELECTED_SET", componentId + " 引用了 selected 57 之外的路径。");
      }
      REFLECT_APPLY(ARRAY_PUSH, files, [{
        path: file.path,
        bytes: file.bytes,
        sha256: file.sha256
      }]);
      if (!REFLECT_APPLY(SET_HAS, mappedPaths, [path])) {
        REFLECT_APPLY(SET_ADD, mappedPaths, [path]);
        mappedPathCount += 1;
      }
      referenceCount += 1;
    }
    REFLECT_APPLY(ARRAY_PUSH, components, [{
      boundary: componentBoundary(componentId),
      classificationBasis: "path_name_and_file_role_heuristic_only",
      componentDigest: domainDigest(COMPONENT_DIGEST_DOMAIN, {
        componentId,
        files
      }),
      componentId,
      fileReferenceCount: files.length,
      files,
      status: COMPONENT_STATUS[componentId]
    }]);
  }
  const engineeringAttachments = [];
  for (const file of selectedFiles) {
    if (!REFLECT_APPLY(SET_HAS, mappedPaths, [file.path])) {
      REFLECT_APPLY(ARRAY_PUSH, engineeringAttachments, [
        stripDeclaredBy(file)
      ]);
    }
  }
  if (referenceCount !== 35
    || mappedPathCount !== 26
    || engineeringAttachments.length !== 31) {
    fail(
      "COMPONENT_ACCOUNTING_MISMATCH",
      "保守 heuristic 分类必须保持 35 refs / 26 mapped / 31 attachments。"
    );
  }
  return {
    components,
    engineeringAttachments,
    mappedPathCount,
    referenceCount
  };
}

async function collectCurrentInputs(workspaceRoot) {
  const predecessor = requireVerifiedPredecessor(
    await readCurrentVedicIndependentEngineeringManifestV1(workspaceRoot)
  );
  const browserChild = requireVerifiedBrowserChild(
    loadVedicSameArtifactCandidate(workspaceRoot)
  );
  const childArtifact = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_BROWSER_CHILD.path,
    MAX_MANIFEST_BYTES,
    {
      invalidCode: "BROWSER_CHILD_ENDPOINT_INVALID",
      missingCode: "BROWSER_CHILD_MISSING",
      label: "Vedic same-artifact browser observation child"
    }
  );
  if (childArtifact.rawBytes !== EXPECTED_BROWSER_CHILD.rawBytes
    || childArtifact.rawSha256 !== EXPECTED_BROWSER_CHILD.rawSha256) {
    fail("BROWSER_CHILD_RAW_IDENTITY_MISMATCH", "browser child persisted raw 身份漂移。");
  }
  let selectedChildPackage;
  const authoredFiles = browserChild.expectedAuthoredBuildInputClosure.files;
  for (let index = 0; index < authoredFiles.length; index += 1) {
    if (authoredFiles[index].path === SURFACE_PACKAGE_PATH) {
      selectedChildPackage = authoredFiles[index];
      break;
    }
  }
  if (selectedChildPackage === undefined) {
    fail("SURFACE_PACKAGE_NOT_SELECTED", "surface package 不在 browser authored graph。");
  }
  const surfaceSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    SURFACE_PACKAGE_PATH,
    MAX_SURFACE_BYTES,
    {
      invalidCode: "SURFACE_PACKAGE_ENDPOINT_INVALID",
      missingCode: "SURFACE_PACKAGE_MISSING",
      label: "Vedic observed private surface package"
    }
  );
  if (surfaceSnapshot.rawBytes !== selectedChildPackage.bytes
    || surfaceSnapshot.rawSha256 !== selectedChildPackage.sha256) {
    fail("SURFACE_PACKAGE_IDENTITY_MISMATCH", "surface package 与 child authored graph 不一致。");
  }
  const surfacePackage = vedicSameArtifactTestOnly.parseStrictJsonBytes(
    surfaceSnapshot.bytes,
    "Vedic observed private surface package"
  );
  if (surfacePackage.name !== "@hakimi/vedic-civil-time-fact-browser-draft"
    || surfacePackage.version !== "0.0.0-draft.0"
    || surfacePackage.private !== true
    || surfacePackage["x-hakimi-isolated-draft"]?.systemId !== "vedic-astrology"
    || surfacePackage["x-hakimi-isolated-draft"]?.productionImport !== "forbidden"
    || surfacePackage["x-hakimi-isolated-draft"]?.formalAdmissionEffect !== "none") {
    fail("SURFACE_PACKAGE_LABEL_MISMATCH", "private package label/version 或隔离边界漂移。");
  }
  return {
    browserChild,
    childArtifact,
    predecessor,
    surfacePackage
  };
}

function buildProjection(inputs) {
  const predecessor = requireVerifiedPredecessor(inputs.predecessor);
  const child = requireVerifiedBrowserChild(inputs.browserChild);
  const selectedFiles = buildSelectedFiles(predecessor, child);
  const classification = buildComponents(selectedFiles);
  const unsigned = {
    activeAdmissionEffect: "none",
    artifactBindings: [
      {
        manifestDigest: predecessor.manifestDigest,
        manifestId: predecessor.manifest.manifestId,
        path: predecessor.artifact.path,
        privateBrandVerified: true,
        rawBytes: predecessor.artifact.bytes,
        rawSha256: predecessor.artifact.sha256,
        role: "predecessor_manifest_v1"
      },
      {
        childId: child.childId,
        observationDigest: child.observationDigest,
        path: EXPECTED_BROWSER_CHILD.path,
        privateBrandVerified: true,
        rawBytes: inputs.childArtifact.rawBytes,
        rawSha256: inputs.childArtifact.rawSha256,
        role: "civil_time_same_artifact_browser_observation_child"
      }
    ],
    authorityBoundary: {
      baziAuthorityInherited: false,
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
    },
    browserEvidenceBoundary: {
      allTwelveOutputPathsWereScenarioRequestedOrEvidenceProbed: false,
      browserRuntimeEvidenceEstablishedByThisManifest: false,
      childEvidenceScope:
        "historical_isolated_loopback_civil_time_fact_only_same_artifact_observation",
      chromeScenarioOutcomesAtChildIssuance: 5,
      currentWorkspaceOutputInventoryEstablished: false,
      edgeScenarioOutcomesAtChildIssuance: 5,
      evidenceToolFileCountAtChildIssuance: 20,
      evidenceToolGraphDigestAtChildIssuance:
        child.evidenceToolingSnapshot.graphDigest,
      evidenceToolSnapshotIsSelectedComponentInventory: false,
      formalChromeBrowserReceiptIssued: false,
      formalEdgeBrowserReceiptIssued: false,
      historicalIssuanceOutputFileCount: 12,
      historicalIssuanceOutputTreeDigest:
        child.runtimeObservation.outputTreeAfter.treeDigest,
      historicalIssuanceOutputTreeOnly: true,
      historicalIssuanceEvidenceOnlyProbePathCount: 1,
      historicalIssuanceEvidenceOnlyProbePaths:
        HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS,
      historicalIssuanceNeitherScenarioRequestedNorEvidenceProbedPathCount: 7,
      historicalIssuanceNeitherScenarioRequestedNorEvidenceProbedPaths:
        HISTORICAL_NEITHER_SCENARIO_NOR_PROBE_PATHS,
      historicalIssuancePathClassificationExhaustsOutputTree: true,
      historicalIssuanceScenarioRuntimePathCount: 4,
      historicalIssuanceScenarioRuntimePaths:
        HISTORICAL_SCENARIO_RUNTIME_PATHS,
      lockedBuildInputCountAtChildIssuance: 17,
      lockedBuildInputGraphDigestAtChildIssuance:
        child.lockedBuildInputSnapshot.graphDigest,
      lockedBuildInputsAreSelectedComponentInventory: false,
      manifestRerunsBrowserMatrix: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false,
      retained2025bChunkScenarioRuntimeRequested: false,
      retainedIanaChunkBodyObservedByEvidenceOnlyNavigation: true,
      retainedIanaChunkExecutedByCivilResolverEstablished: false,
      sameOutputTreeIdentityUsedForBothBrowsersAtChildIssuance: true,
      singleOutputTreeServedWithoutRebuildAtChildIssuance: true,
      totalPassedScenarioOutcomesAtChildIssuance: 10
    },
    componentAccounting: {
      componentCount: 9,
      componentFileReferences: classification.referenceCount,
      engineeringAttachmentPaths: classification.engineeringAttachments.length,
      mappedUniquePhysicalPaths: classification.mappedPathCount,
      selectedUniquePhysicalPaths: selectedFiles.length
    },
    componentClassificationBoundary: {
      classificationIsDomainOrExpertJudgment: false,
      classificationIsSemanticCompletenessProof: false,
      classificationMethod: "path_name_and_file_role_heuristic_only",
      componentIds: COMPONENT_ORDER,
      semanticMembershipEstablished: false
    },
    components: classification.components,
    createdAt: CREATED_AT,
    doesNotEstablish: [
      "recursive_directory_or_extra_file_absence_closure",
      "entire_fact_browser_draft_tzdb_core_or_vedic_engineering_closure",
      "current_full_domain_manifest_or_formal_admission",
      "vedic_interpretation_ruleset_fact_truth_or_report_contract",
      "source_body_provenance_exact_quote_frozen_binding_or_three_layer_rights",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "semantic_complete_high_risk_policy_or_high_risk_claims_authority",
      "current_browser_rerun_product_pwa_service_worker_public_host_or_production_receipt",
      "product_release_schema_migration_runtime_storage_or_central_registry_identity",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ],
    engineeringAttachments: classification.engineeringAttachments,
    evidenceLedgerSeparation: {
      accountsMustNotBeCollapsed: true,
      browserRuntimeEvidence:
        "historical_child_only_not_reverified_by_this_manifest",
      contentTruthEstablished: false,
      engineeringIdentityEvidence:
        "selected_parent_declared_57_path_projection_mechanically_current",
      expertTruthEstablished: false,
      publicReleaseAuthorizationEstablished: false,
      releaseReadinessEstablished: false,
      rightsLegalJudgmentEstablished: false
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      releaseEvidenceComplete: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    },
    integrationBoundary: {
      centralFormalRegistryConsumesThisManifest: false,
      crossSystemSuccessorBacklinkPresent: false,
      mainApplicationIntegrated: false,
      ownerAcceptanceForFormalAdmissionEstablished: false
    },
    manifestId: MANIFEST_ID,
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      digestIsDigitalSignature: false,
      endpointSnapshotOnly: true,
      exactPersistedRawIdentitiesVerified: true,
      intervalMutationExcludedAcrossFiles: false,
      mutationEpochAvailableForProduct: false,
      mutationEpochReceipt: null,
      signerIdentityEstablished: false,
      upstreamPrivateBrandsVerified: 2
    },
    productBoundary: {
      formalProductSurface: "absent",
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      targetSchema: null
    },
    projectDefaultReleaseGovernance: {
      activeLine: "legacy-v13",
      inheritedByThisSystem: false,
      migrationId: null,
      targetSchema: 13
    },
    recordType: RECORD_TYPE,
    releaseStatus: "draft",
    runtimeTrustBoundary: {
      completeSourceToBuildAttestationEstablished: false,
      hiddenPreEvaluationCodeExcluded: false,
      repositoryIntervalIntegrityEstablished: false,
      toolAttestationEstablished: false,
      visibleCliLoaderInjectionRejected: true
    },
    schemaVersion: "2.0.0",
    scopeOmissions: {
      factBrowserDraftRoot: {
        authoredSelectedPaths: 16,
        evidenceToolOnlyPaths: FACT_BROWSER_EVIDENCE_TOOL_ONLY,
        evidenceToolOnlyPathsCount: 4,
        entireRootClosureEstablished: false,
        knownOrdinaryFilesAtAuthoring: 27,
        loaderRecursivelyEnumeratesThisRoot: false,
        omittedNonEvidencePaths: FACT_BROWSER_OMITTED_NON_EVIDENCE,
        omittedNonEvidencePathsCount: 7
      },
      omissionListsMechanicallyReverifiedByThisLoader: false,
      omissionListsPurpose:
        "authoring_time_counterexamples_against_directory_or_domain_closure_claims",
      tzdbCorePackage: {
        authoredSelectedPaths: 4,
        entirePackageClosureEstablished: false,
        knownOrdinaryFilesAtAuthoring: 8,
        loaderRecursivelyEnumeratesThisRoot: false,
        omittedPaths: TZDB_CORE_OMITTED,
        omittedPathsCount: 4
      }
    },
    selectedClosure: {
      canonicalPathSortApplied: true,
      childDeclaredAuthoredBuildPaths: 24,
      entireFactBrowserDraftRootClosureEstablished: false,
      entireTzdbCorePackageClosureEstablished: false,
      entireVedicEngineeringClosureEstablished: false,
      extraFileAbsenceEstablished: false,
      files: selectedFiles,
      mappedAndAttachmentPartitionExact: true,
      overlapBetweenParentSets: 0,
      predecessorDeclaredPaths: 33,
      recursiveDirectoryEnumerationPerformed: false,
      scopeClass:
        "parent_declared_selected_path_union_not_directory_or_domain_closure",
      selectedPathSetDigest: domainDigest(
        SELECTED_PATH_DIGEST_DOMAIN,
        selectedFiles
      ),
      selectedUniquePhysicalPaths: 57
    },
    status: STATUS,
    surface: {
      observedDraftMarker:
        inputs.surfacePackage["x-hakimi-isolated-draft"].kind,
      observedFormalAdmissionEffect:
        inputs.surfacePackage["x-hakimi-isolated-draft"].formalAdmissionEffect,
      observedPackageName: inputs.surfacePackage.name,
      observedPackagePrivate: inputs.surfacePackage.private,
      observedPackageVersion: inputs.surfacePackage.version,
      observedProductionImport: inputs.surfacePackage[
        "x-hakimi-isolated-draft"
      ].productionImport,
      ownerAssignedProductIdentity: false,
      packageLabelOrVersionIsProductIdentity: false,
      surfaceId: "vedic-civil-time-fact-browser-draft",
      surfaceVersion: "0.0.0-draft.0"
    },
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productType: "parent_declared_selected_path_engineering_boundary"
    },
    versionBoundary: {
      currentEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      currentSelectedParentDeclaredPathManifestMechanicallyVerified: true,
      entireVedicEngineeringClosureEstablished: false,
      ownerPromotionDecisionReceipt: null,
      productIdentityEstablished: false,
      upstreamPrivateBrandCount: 2
    }
  };
  return {
    ...unsigned,
    manifestDigest: domainDigest(DIGEST_DOMAIN, unsigned)
  };
}

export function computeVedicIndependentEngineeringManifestV2Digest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.manifestDigest;
  return domainDigest(DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyVedicIndependentEngineeringManifestV2(value) {
  const normalized = canonicalValue(value);
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [normalized, null, 2]) + "\n";
}

export function parseVedicIndependentEngineeringManifestV2JsonBytes(
  bytes,
  label = "Vedic independent engineering manifest v2 JSON"
) {
  return canonicalValue(
    parseVedicIndependentEngineeringManifestV1JsonBytes(bytes, label)
  );
}

function requireFixedBoundary(value) {
  const manifest = canonicalValue(value);
  if (manifest.manifestId !== MANIFEST_ID
    || manifest.recordType !== RECORD_TYPE
    || manifest.schemaVersion !== "2.0.0"
    || manifest.status !== STATUS
    || manifest.releaseStatus !== "draft"
    || manifest.activeAdmissionEffect !== "none"
    || manifest.artifactBindings?.length !== 2
    || manifest.componentAccounting?.componentCount !== 9
    || manifest.componentAccounting?.componentFileReferences !== 35
    || manifest.componentAccounting?.mappedUniquePhysicalPaths !== 26
    || manifest.componentAccounting?.engineeringAttachmentPaths !== 31
    || manifest.componentAccounting?.selectedUniquePhysicalPaths !== 57
    || manifest.componentClassificationBoundary?.semanticMembershipEstablished !== false
    || manifest.selectedClosure?.scopeClass
      !== "parent_declared_selected_path_union_not_directory_or_domain_closure"
    || manifest.selectedClosure?.predecessorDeclaredPaths !== 33
    || manifest.selectedClosure?.childDeclaredAuthoredBuildPaths !== 24
    || manifest.selectedClosure?.overlapBetweenParentSets !== 0
    || manifest.selectedClosure?.selectedUniquePhysicalPaths !== 57
    || manifest.selectedClosure?.recursiveDirectoryEnumerationPerformed !== false
    || manifest.selectedClosure?.extraFileAbsenceEstablished !== false
    || manifest.selectedClosure?.entireFactBrowserDraftRootClosureEstablished !== false
    || manifest.selectedClosure?.entireTzdbCorePackageClosureEstablished !== false
    || manifest.selectedClosure?.entireVedicEngineeringClosureEstablished !== false
    || manifest.versionBoundary?.currentEngineeringManifestMechanicallyVerified !== true
    || manifest.versionBoundary
      ?.currentSelectedParentDeclaredPathManifestMechanicallyVerified !== true
    || manifest.versionBoundary?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest.versionBoundary?.entireVedicEngineeringClosureEstablished !== false
    || manifest.versionBoundary?.productIdentityEstablished !== false
    || manifest.versionBoundary?.upstreamPrivateBrandCount !== 2
    || manifest.surface?.ownerAssignedProductIdentity !== false
    || manifest.surface?.packageLabelOrVersionIsProductIdentity !== false
    || manifest.productBoundary?.productIdentity !== null
    || manifest.productBoundary?.releaseIdentity !== null
    || manifest.productBoundary?.targetSchema !== null
    || manifest.productBoundary?.migrationId !== null
    || manifest.projectDefaultReleaseGovernance?.activeLine !== "legacy-v13"
    || manifest.projectDefaultReleaseGovernance?.targetSchema !== 13
    || manifest.projectDefaultReleaseGovernance?.migrationId !== null
    || manifest.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false
    || manifest.browserEvidenceBoundary?.browserRuntimeEvidenceEstablishedByThisManifest
      !== false
    || manifest.browserEvidenceBoundary?.currentWorkspaceOutputInventoryEstablished
      !== false
    || manifest.browserEvidenceBoundary?.historicalIssuanceOutputTreeOnly !== true
    || manifest.browserEvidenceBoundary
      ?.allTwelveOutputPathsWereScenarioRequestedOrEvidenceProbed !== false
    || manifest.browserEvidenceBoundary?.historicalIssuanceScenarioRuntimePathCount
      !== 4
    || manifest.browserEvidenceBoundary?.historicalIssuanceEvidenceOnlyProbePathCount
      !== 1
    || manifest.browserEvidenceBoundary
      ?.historicalIssuanceNeitherScenarioRequestedNorEvidenceProbedPathCount !== 7
    || manifest.browserEvidenceBoundary
      ?.historicalIssuancePathClassificationExhaustsOutputTree !== true
    || manifest.browserEvidenceBoundary?.totalPassedScenarioOutcomesAtChildIssuance !== 10
    || manifest.browserEvidenceBoundary?.retained2025bChunkScenarioRuntimeRequested
      !== false
    || manifest.browserEvidenceBoundary
      ?.retainedIanaChunkExecutedByCivilResolverEstablished !== false
    || manifest.gateState?.admissionGatesRequired !== 8
    || manifest.gateState?.admissionGatesSatisfied !== 0
    || manifest.gateState?.bindingRequired !== 38
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.independentExpertsRequired !== 2
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.authorityBoundary?.baziAuthorityInherited !== false
    || manifest.authorityBoundary?.contentTruthEstablished !== false
    || manifest.authorityBoundary?.expertTruthEstablished !== false
    || manifest.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest.authorityBoundary?.releaseReady !== false
    || manifest.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest.authorityBoundary?.expertClaimsAuthorized !== false
    || manifest.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || manifest.observationBoundary?.abaExcluded !== false
    || manifest.observationBoundary?.mutationEpochReceipt !== null
    || manifest.manifestDigest
      !== computeVedicIndependentEngineeringManifestV2Digest(manifest)) {
    fail("RED_OR_SCOPE_BOUNDARY_MISMATCH", "Vedic v2 scope、身份、证据或权限边界被抬高。");
  }
  return manifest;
}

function assertExpectedProjection(candidate, expected) {
  const normalized = requireFixedBoundary(candidate);
  if (!exactJson(normalized, expected)) {
    fail("CURRENT_MANIFEST_MISMATCH", "Vedic v2 与允许的当前 selected-path 投影不一致。");
  }
  return normalized;
}

export async function buildCurrentVedicIndependentEngineeringManifestV2(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(canonicalValue(requireFixedBoundary(buildProjection(inputs))));
}

export async function readCurrentVedicIndependentEngineeringManifestV2(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentVedicIndependentEngineeringManifestV2(workspaceRoot);
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
    MAX_MANIFEST_BYTES,
    {
      invalidCode: "MANIFEST_ENDPOINT_INVALID",
      missingCode: "MANIFEST_MISSING",
      label: "Vedic independent engineering manifest v2"
    }
  );
  const persisted = parseVedicIndependentEngineeringManifestV2JsonBytes(snapshot.bytes);
  const canonicalText =
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2(persisted);
  if (REFLECT_APPLY(BUFFER_BYTE_LENGTH, NATIVE_BUFFER, [canonicalText, "utf8"])
      !== snapshot.rawBytes
    || sha256Text(canonicalText) !== snapshot.rawSha256) {
    fail("MANIFEST_MATERIALIZATION_MISMATCH", "Vedic v2 不是唯一 canonical LF materialization。");
  }
  assertExpectedProjection(persisted, expected);
  if (EXPECTED_PERSISTED.rawBytes !== 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "persisted Vedic v2 冻结身份漂移。");
  }
  const result = deepFreeze(canonicalValue({
    artifact: {
      path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    manifest: persisted,
    manifestDigest: persisted.manifestDigest,
    mechanicallyVerified: true
  }));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export const loadVedicIndependentEngineeringManifestV2 =
  readCurrentVedicIndependentEngineeringManifestV2;

export function isVerifiedVedicIndependentEngineeringManifestV2(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getVedicIndependentEngineeringManifestV2Summary(value) {
  if (!isVerifiedVedicIndependentEngineeringManifestV2(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受本模块 fixed-path loader 的私有品牌。");
  }
  const manifest = value.manifest;
  return deepFreeze(canonicalValue({
    activeAdmissionEffect: manifest.activeAdmissionEffect,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    artifact: value.artifact,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    browserRuntimeEvidenceEstablishedByThisManifest:
      manifest.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest,
    currentEngineeringManifestMechanicallyVerified:
      manifest.versionBoundary.currentEngineeringManifestMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.versionBoundary.currentFullDomainManifestMechanicallyVerified,
    engineeringAttachmentPaths:
      manifest.componentAccounting.engineeringAttachmentPaths,
    independentExpertReviewsVerified:
      manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    manifestDigest: value.manifestDigest,
    manifestId: manifest.manifestId,
    migrationId: manifest.productBoundary.migrationId,
    ownerAssignedProductIdentity: manifest.surface.ownerAssignedProductIdentity,
    publicDeploymentAuthorized: manifest.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized,
    releaseIdentity: manifest.productBoundary.releaseIdentity,
    releaseReady: manifest.authorityBoundary.releaseReady,
    selectedUniquePhysicalPaths:
      manifest.selectedClosure.selectedUniquePhysicalPaths,
    targetSchema: manifest.productBoundary.targetSchema
  }));
}

export const vedicIndependentEngineeringManifestV2TestOnly = OBJECT_FREEZE({
  COMPONENT_ORDER,
  COMPONENT_PATHS,
  COMPONENT_STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  EXPECTED_BROWSER_CHILD,
  EXPECTED_PERSISTED,
  EXPECTED_PREDECESSOR,
  FACT_BROWSER_EVIDENCE_TOOL_ONLY,
  FACT_BROWSER_OMITTED_NON_EVIDENCE,
  HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS,
  HISTORICAL_NEITHER_SCENARIO_NOR_PROBE_PATHS,
  HISTORICAL_SCENARIO_RUNTIME_PATHS,
  MANIFEST_ID,
  RECORD_TYPE,
  STATUS,
  SURFACE_PACKAGE_PATH,
  TZDB_CORE_OMITTED,
  assertExpectedProjection,
  buildComponents,
  buildProjection,
  buildSelectedFiles,
  canonicalStringify,
  exactJson,
  requireFixedBoundary,
  requireVerifiedBrowserChild,
  requireVerifiedPredecessor,
  sha256Text
});
