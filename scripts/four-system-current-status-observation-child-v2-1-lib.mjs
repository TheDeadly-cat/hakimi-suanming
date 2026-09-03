import { createHash } from "node:crypto";

import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate
} from "./bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  loadIndependentDomainManifest,
  isVerifiedIndependentDomainManifestFullLoad
} from "./independent-domain-release-manifest-lib.mjs";
import {
  loadWesternProductizationVersionAwareObservationChildV11,
  isVerifiedWesternProductizationVersionAwareObservationChildV11
} from "./western-independent-productization-version-aware-observation-child-v1-1-lib.mjs";
import {
  readCurrentVedicProductizationVersionAwareObservationChildV12,
  isVerifiedVedicProductizationVersionAwareObservationChildV12
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";
import {
  readCurrentVedicIndependentEngineeringManifestV1,
  isVerifiedVedicIndependentEngineeringManifestV1,
  getVedicIndependentEngineeringManifestV1Summary
} from "./vedic-independent-engineering-manifest-v1-lib.mjs";
import {
  loadVedicSameArtifactCandidate,
  isVerifiedVedicSameArtifactCandidate,
  summarizeVedicSameArtifactCandidate
} from "./vedic-civil-time-same-artifact-browser-observation-lib.mjs";
import {
  canonicalStringifyFourSystemCurrentObservationRegistryV2,
  computeFourSystemCurrentObservationRegistryV2Digest
} from "./four-system-current-observation-registry-v2-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.1.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.1.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_1";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T06:30:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.1";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_SORT = Array.prototype.sort;
const NATIVE_ARRAY = Array;
const BUFFER_TO_STRING = Buffer.prototype.toString;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PARENT_REGISTRY = OBJECT_FREEZE({
  role: "historical_stale_parent_registry_v2",
  path: "content/system-admission/four-system-current-observation-registry.v2.json",
  rawBytes: 22_261,
  rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
  semanticDigestField: "registryDigest",
  semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
});

const CURRENT_ENDPOINTS = OBJECT_FREEZE({
  bazi: OBJECT_FREEZE({
    role: "current_bazi_component_identity_drift_receipt_candidate",
    path: "content/system-admission/bazi-single-chart-report-component-identity-drift-receipt-candidate.v1.0.0.json",
    rawBytes: 5_419,
    rawSha256: "c797aa7851d6f2ff64518abae42d25143307936bc63263e37f5000383511a9cf",
    semanticDigestField: "receiptDigest",
    semanticDigest: "95e5a1b99d0a021a0fabf6c42e1cc8de432b9565459a091e577d57abbcea5fc8"
  }),
  ziwei: OBJECT_FREEZE({
    role: "current_ziwei_independent_domain_manifest_v2",
    path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
    rawBytes: 17_968,
    rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
    semanticDigestField: "manifestDigest",
    semanticDigest: "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e"
  }),
  western: OBJECT_FREEZE({
    role: "current_western_version_aware_observation_child_v1_1",
    path: "content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json",
    rawBytes: 12_692,
    rawSha256: "140bed89a638deb970e1a60d3ffcbc96eebef509bd14bd692726b8c561d13593",
    semanticDigestField: "candidateDigest",
    semanticDigest: "664bdbddd48bc0205eb6dba4cf923903a78d35e6d63ab29ca8e7de3faa5975af"
  }),
  vedicObservation: OBJECT_FREEZE({
    role: "current_vedic_version_aware_observation_child_v1_2",
    path: "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json",
    rawBytes: 16_272,
    rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845",
    semanticDigestField: "candidateDigest",
    semanticDigest: "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171"
  }),
  vedicManifest: OBJECT_FREEZE({
    role: "current_vedic_independent_engineering_manifest_v1",
    path: "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json",
    rawBytes: 19_557,
    rawSha256: "a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5",
    semanticDigestField: "manifestDigest",
    semanticDigest: "96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685"
  }),
  vedicBrowser: OBJECT_FREEZE({
    role: "current_vedic_isolated_civil_time_same_artifact_browser_child",
    path: "content/system-admission/vedic-civil-time-same-artifact-browser-observation-child.v1.0.0.json",
    rawBytes: 41_077,
    rawSha256: "fef063bb880ca0f65aa9fa10ac65cd5d6733216c1aa83faaa05fc536e7431710",
    semanticDigestField: "observationDigest",
    semanticDigest: "795638cbe93459ad598c2a138f627c2ba4a9db28b4bebd528e78d934083f3f6e"
  })
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 18_874,
  rawSha256: "2b1ea37e3e168d2e91cb17a9f864ef93ebb55286de1ff02da83bc4847e74b42b",
  childDigest: "e2fb723d2c0ddfdb5e41918a0ffa1ceb5d5d1cbbd8f1ac3a86f0be38b05fd64c"
});

export class FourSystemCurrentStatusObservationChildV21Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "FourSystemCurrentStatusObservationChildV21Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new FourSystemCurrentStatusObservationChildV21Error(code, message, cause);
}

function canonicalStringify(value) {
  try {
    return canonicalStringifyFourSystemCurrentObservationRegistryV2(value);
  } catch (cause) {
    fail("NON_CANONICAL_JSON", "current-status child 只接受被动、无别名的 JSON 数据。", cause);
  }
}

function captureJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_CANONICAL_JSON", "current-status child 不接受 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function withoutOwnField(value, field) {
  const snapshot = captureJson(value);
  const output = {};
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [snapshot]);
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key !== field) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: snapshot[key],
        writable: true
      }]);
    }
  }
  return output;
}

export function computeFourSystemCurrentStatusObservationChildV21Digest(value) {
  return sha256Text(
    `${DIGEST_DOMAIN}\0${canonicalStringify(withoutOwnField(value, "childDigest"))}`
  );
}

export function serializeFourSystemCurrentStatusObservationChildV21(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2])}\n`;
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function artifactBinding(binding) {
  return {
    role: binding.role,
    path: binding.path,
    rawBytes: binding.rawBytes,
    rawSha256: binding.rawSha256,
    semanticDigestField: binding.semanticDigestField,
    semanticDigest: binding.semanticDigest
  };
}

function authorityBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false
  };
}

function gateSummary(bindingRequired) {
  return {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingRequired,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    releaseEvidenceComplete: false
  };
}

function systemEntry({
  productSystemId,
  contractSystemId,
  currentStatus,
  targetSchema,
  releaseIdentity,
  bindingRequired,
  endpoints,
  currentFullDomainManifestMechanicallyVerified,
  currentEngineeringManifestMechanicallyVerified,
  browserRuntimeEvidence
}) {
  return {
    productSystemId,
    contractSystemId,
    currentStatus,
    productBoundary: {
      releaseIdentity,
      targetSchema,
      migrationId: null,
      mainApplicationIntegrated: false,
      baziAuthorityInherited: false,
      independentSystemBoundaryPreserved: true
    },
    currentEvidence: {
      endpoints,
      currentEndpointMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified,
      currentEngineeringManifestMechanicallyVerified,
      browserRuntimeEvidence,
      activeAdmissionEffect: "none"
    },
    gateSummary: gateSummary(bindingRequired),
    authorityBoundary: authorityBoundary()
  };
}

function requireAllFalse(value, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("AUTHORITY_BOUNDARY_INVALID", `${label} 必须是全 false 对象。`);
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  let promoted = keys.length === 0;
  for (let index = 0; index < keys.length; index += 1) {
    if (value[keys[index]] !== false) promoted = true;
  }
  if (promoted) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} 不得出现任何 authority 提升。`);
  }
}

function requireExactKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("KEY_SET_INVALID", `${label} 必须是对象。`);
  }
  const actual = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, actual, []);
  const expected = new NATIVE_ARRAY(expectedKeys.length);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    expected[index] = expectedKeys[index];
  }
  REFLECT_APPLY(ARRAY_SORT, expected, []);
  if (!exactJson(actual, expected)) {
    fail("KEY_SET_INVALID", `${label} 字段集合不精确。`);
  }
}

function assertSnapshot(snapshot, binding, code = "ARTIFACT_IDENTITY_DRIFT") {
  if (snapshot.path !== binding.path
    || snapshot.rawBytes !== binding.rawBytes
    || snapshot.rawSha256 !== binding.rawSha256) {
    fail(code, `${binding.path} 原始身份漂移。`);
  }
}

function assertParentMaterial(parent) {
  if (parent.registryId !== "hakimi.system-admission/four-system-current-observation/2.0.0"
    || parent.registryDigest !== PARENT_REGISTRY.semanticDigest
    || computeFourSystemCurrentObservationRegistryV2Digest(parent)
      !== PARENT_REGISTRY.semanticDigest) {
    fail("PARENT_REGISTRY_IDENTITY_INVALID", "registry v2 parent 的语义身份无效。");
  }
  const systems = parent.systems;
  if (!ARRAY_IS_ARRAY(systems) || systems.length !== 4
    || systems[0]?.productSystemId !== "bazi"
    || systems[1]?.productSystemId !== "ziwei-doushu"
    || systems[2]?.productSystemId !== "western-astrology"
    || systems[3]?.productSystemId !== "vedic-astrology") {
    fail("PARENT_SYSTEM_SET_INVALID", "registry v2 parent 的四体系顺序漂移。");
  }
  if (systems[2].currentMachineIdentity?.secondaryObservation?.path
      !== "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json"
    || systems[3].currentMachineIdentity?.secondaryObservation?.domainReleaseManifestPresent
      !== false
    || parent.crossSystemPolicy?.comparisonContract?.vedicSupportedByCurrentComparisonContract
      !== false) {
    fail("PARENT_STALENESS_BASIS_DRIFT", "registry v2 的 Western/Vedic 陈旧基线不再等于已冻结父件。");
  }
}

function assertUpstreams({
  bazi,
  ziwei,
  western,
  vedicObservation,
  vedicManifest,
  vedicManifestSummary,
  vedicBrowser,
  vedicBrowserSummary
}) {
  if (!isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(bazi)
    || bazi.receiptDigest !== CURRENT_ENDPOINTS.bazi.semanticDigest
    || bazi.observationBoundary?.currentFullDomainManifestEstablished !== false
    || bazi.observationBoundary?.persistedAsDomainManifest !== false
    || bazi.observationBoundary?.activeAdmissionEffect !== "none"
    || bazi.gateSummary?.bindingRequired !== 12
    || bazi.gateSummary?.bindingFrozenVerified !== 0
    || bazi.gateSummary?.independentExpertReviewsVerified !== 0) {
    fail("BAZI_CURRENT_ENDPOINT_INVALID", "Bazi 只能消费当前 component drift candidate 红灯收据。");
  }
  requireAllFalse(bazi.authorityBoundary, "Bazi authorityBoundary");

  if (!isVerifiedIndependentDomainManifestFullLoad(ziwei)
    || ziwei.productSystemId !== "ziwei-doushu"
    || ziwei.manifestDigest !== CURRENT_ENDPOINTS.ziwei.semanticDigest
    || ziwei.manifest?.gateState?.bindingRequired !== 27
    || ziwei.manifest?.gateState?.bindingFrozenVerified !== 0
    || ziwei.manifest?.gateState?.independentExpertReviewsVerified !== 0
    || ziwei.manifest?.releaseGovernance?.targetSchema !== null
    || ziwei.manifest?.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false) {
    fail("ZIWEI_CURRENT_ENDPOINT_INVALID", "Ziwei v2 current engineering manifest 红灯投影漂移。");
  }
  requireAllFalse(ziwei.authorityBoundary, "Ziwei authorityBoundary");

  if (!isVerifiedWesternProductizationVersionAwareObservationChildV11(western)
    || western.candidateDigest !== CURRENT_ENDPOINTS.western.semanticDigest
    || western.currentObservationRegistryMechanicallyCurrentForWestern !== false
    || western.bindingRequired !== 28
    || western.bindingFrozenVerified !== 0
    || western.independentExpertReviewsVerified !== 0
    || western.activeAdmissionEffect !== "none") {
    fail("WESTERN_CURRENT_ENDPOINT_INVALID", "Western v1.1 current observation 红灯投影漂移。");
  }

  if (!isVerifiedVedicProductizationVersionAwareObservationChildV12(vedicObservation)
    || vedicObservation.candidateDigest !== CURRENT_ENDPOINTS.vedicObservation.semanticDigest
    || vedicObservation.gateSummary?.admissionGatesSatisfied !== 0
    || vedicObservation.gateSummary?.bindingRequired !== 38
    || vedicObservation.gateSummary?.bindingFrozenVerified !== 0
    || vedicObservation.gateSummary?.independentExpertReviewsVerified !== 0
    || vedicObservation.activeAdmissionEffect !== "none") {
    fail("VEDIC_OBSERVATION_INVALID", "Vedic v1.2 current observation 红灯投影漂移。");
  }
  requireAllFalse(vedicObservation.authorityBoundary, "Vedic observation authorityBoundary");

  if (!isVerifiedVedicIndependentEngineeringManifestV1(vedicManifest)
    || vedicManifestSummary.manifestDigest !== CURRENT_ENDPOINTS.vedicManifest.semanticDigest
    || vedicManifestSummary.activeAdmissionEffect !== "none"
    || vedicManifestSummary.bindingRequired !== 38
    || vedicManifestSummary.bindingFrozenVerified !== 0
    || vedicManifestSummary.independentExpertReviewsVerified !== 0
    || vedicManifestSummary.productIdentity !== null
    || vedicManifestSummary.targetSchema !== null
    || vedicManifestSummary.releaseReady !== false) {
    fail("VEDIC_MANIFEST_INVALID", "Vedic engineering manifest 只能保持无产品身份的红灯工程身份。");
  }

  if (!isVerifiedVedicSameArtifactCandidate(vedicBrowser)
    || vedicBrowserSummary.observationDigest !== CURRENT_ENDPOINTS.vedicBrowser.semanticDigest
    || vedicBrowserSummary.passedScenarioOutcomes !== 10
    || vedicBrowserSummary.perBrowserServedBodyManifestsEqual !== true
    || vedicBrowserSummary.gateSummary?.admissionGatesSatisfied !== 0
    || vedicBrowserSummary.gateSummary?.bindingFrozenVerified !== 0
    || vedicBrowserSummary.gateSummary?.independentExpertReviewsVerified !== 0) {
    fail("VEDIC_BROWSER_OBSERVATION_INVALID", "Vedic browser child 只能是 10/10 隔离 civil-time fact-only 观察。");
  }
  requireAllFalse(vedicBrowserSummary.authorityBoundary, "Vedic browser authorityBoundary");
}

function assertChildBoundary(candidate) {
  requireExactKeys(candidate, [
    "activeAdmissionEffect",
    "artifactBindings",
    "authorityBoundary",
    "childDigest",
    "childId",
    "createdAt",
    "crossSystemPolicy",
    "currentStatusSummary",
    "doesNotEstablish",
    "evidenceLedgerSeparation",
    "lineage",
    "observationBoundary",
    "projectReleaseGovernanceContext",
    "recordType",
    "runtimeTrustBoundary",
    "schemaVersion",
    "status",
    "systems",
    "versionBoundary"
  ], "current-status child");
  if (candidate.schemaVersion !== "2.1.0"
    || candidate.recordType !== RECORD_TYPE
    || candidate.childId !== CHILD_ID
    || candidate.status !== STATUS
    || candidate.createdAt !== CREATED_AT
    || candidate.activeAdmissionEffect !== "none") {
    fail("CHILD_IDENTITY_INVALID", "current-status child 身份或零准入效力漂移。");
  }
  if (!ARRAY_IS_ARRAY(candidate.systems)
    || candidate.systems.length !== 4
    || candidate.systems[0]?.productSystemId !== "bazi"
    || candidate.systems[1]?.productSystemId !== "ziwei-doushu"
    || candidate.systems[2]?.productSystemId !== "western-astrology"
    || candidate.systems[3]?.productSystemId !== "vedic-astrology") {
    fail("SYSTEM_SET_INVALID", "current-status child 必须精确记录四个独立体系。");
  }
  const expectedBindings = REFLECT_APPLY(ARRAY_MAP, [
    PARENT_REGISTRY,
    CURRENT_ENDPOINTS.bazi,
    CURRENT_ENDPOINTS.ziwei,
    CURRENT_ENDPOINTS.western,
    CURRENT_ENDPOINTS.vedicObservation,
    CURRENT_ENDPOINTS.vedicManifest,
    CURRENT_ENDPOINTS.vedicBrowser
  ], [artifactBinding]);
  if (!exactJson(candidate.artifactBindings, expectedBindings)) {
    fail("ARTIFACT_BINDING_SET_INVALID", "child 必须精确绑定 parent 与六个 current endpoints。");
  }
  for (let index = 0; index < candidate.systems.length; index += 1) {
    const system = candidate.systems[index];
    if (system.gateSummary?.admissionGatesRequired !== 8
      || system.gateSummary?.admissionGatesSatisfied !== 0
      || system.gateSummary?.bindingFrozenVerified !== 0
      || system.gateSummary?.independentExpertReviewsVerified !== 0
      || system.currentEvidence?.activeAdmissionEffect !== "none") {
      fail("GATE_PROMOTION_FORBIDDEN", `${system.productSystemId} 准入账不得提升。`);
    }
    requireAllFalse(system.authorityBoundary, `${system.productSystemId} authorityBoundary`);
  }
  const expectedCurrentFlags = [
    [false, false, "not_assessed_by_this_child"],
    [true, true, "not_assessed_by_this_child"],
    [false, false, "not_assessed_by_this_child"],
    [false, true, "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"]
  ];
  for (let index = 0; index < candidate.systems.length; index += 1) {
    const evidence = candidate.systems[index].currentEvidence;
    const expected = expectedCurrentFlags[index];
    if (evidence.currentFullDomainManifestMechanicallyVerified !== expected[0]
      || evidence.currentEngineeringManifestMechanicallyVerified !== expected[1]
      || evidence.browserRuntimeEvidence !== expected[2]) {
      fail("CURRENT_STATUS_PROMOTION_FORBIDDEN", `${candidate.systems[index].productSystemId} current 状态不得外推。`);
    }
  }
  if (candidate.lineage?.parentPreservedUnmodified !== true
    || candidate.lineage?.parentMechanicallyCurrent !== false
    || candidate.lineage?.parentOverwritten !== false
    || candidate.versionBoundary?.persistedAsCentralRegistry !== false
    || candidate.versionBoundary?.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary?.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary?.ownerPromotionDecisionReceipt !== null) {
    fail("VERSION_PROMOTION_FORBIDDEN", "child 不得覆盖 parent、中央 registry 或任何 manifest。");
  }
  const policy = candidate.crossSystemPolicy;
  for (const field of [
    "factsFrozenForFormalComparison",
    "scoringAllowed",
    "weightingAllowed",
    "majorityVoteAllowed",
    "opinionAveragingAllowed",
    "generatedModelWinnerSelectionAllowed",
    "autoPersonMergeAllowed",
    "authorityInheritanceAllowed",
    "conceptEquivalenceInferenceAllowed",
    "formalComparisonAuthorized"
  ]) {
    if (policy?.[field] !== false) {
      fail("CROSS_SYSTEM_PROMOTION_FORBIDDEN", `crossSystemPolicy.${field} 必须为 false。`);
    }
  }
  requireAllFalse(candidate.authorityBoundary, "child authorityBoundary");
  const summary = candidate.currentStatusSummary;
  if (summary?.systemsRequired !== 4
    || summary?.systemsWithCurrentEndpointMechanicallyVerified !== 4
    || summary?.allSystemsCurrentFullDomainManifestMechanicallyVerified !== false
    || summary?.systemsFormallyAdmitted !== 0
    || summary?.systemsDomainAuthorityAuthorized !== 0
    || summary?.systemsReleaseReady !== 0
    || summary?.systemsPublicReleaseAuthorized !== 0
    || summary?.totalAdmissionGatesRequired !== 32
    || summary?.totalAdmissionGatesSatisfied !== 0) {
    fail("SUMMARY_PROMOTION_FORBIDDEN", "四体系汇总必须保持 current endpoints 4/4、正式准入 0/4、准入门 0/32。");
  }
  const governance = candidate.projectReleaseGovernanceContext;
  if (governance?.activeLine !== "legacy-v13"
    || governance?.targetSchema !== 13
    || governance?.migrationId !== null
    || governance?.projectContextOnly !== true
    || governance?.inheritedByZiweiWesternOrVedicProductIdentity !== false
    || governance?.mutationEpochBoundaryRequired !== true
    || governance?.mutationEpochAvailableForSchema13 !== false
    || governance?.mutationEpochReceipt !== null
    || governance?.publicDeploymentAuthorized !== false
    || governance?.expertClaimsAuthorized !== false) {
    fail("PROJECT_GOVERNANCE_DRIFT", "legacy-v13 / 13 / null 只能作为项目上下文且必须继续全红。");
  }
  if (candidate.observationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary?.mutationEpochReceipt !== null
    || candidate.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || candidate.observationBoundary?.abaExcluded !== false
    || candidate.observationBoundary?.childDigestIsDigitalSignature !== false) {
    fail("OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN", "child 不得声称原子、epoch、interval 或 ABA 闭包。");
  }
  if (!LOWERCASE_SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV21Digest(candidate)
      !== candidate.childDigest) {
    fail("CHILD_DIGEST_INVALID", "childDigest 无效。");
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const ziweiDefinition = REFLECT_APPLY(
    ARRAY_FIND,
    INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
    [(entry) => entry.systemId === "ziwei"]
  );
  if (!ziweiDefinition) fail("ZIWEI_DEFINITION_MISSING", "找不到 Ziwei 独立 manifest 定义。");

  const [
    parentSnapshot,
    bazi,
    ziwei,
    western,
    vedicObservation,
    vedicManifest,
    vedicBrowser
  ] = await Promise.all([
    readBaziDttStableWorkspaceArtifact(workspaceRoot, PARENT_REGISTRY.path),
    loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot),
    loadIndependentDomainManifest(workspaceRoot, ziweiDefinition),
    loadWesternProductizationVersionAwareObservationChildV11(workspaceRoot),
    readCurrentVedicProductizationVersionAwareObservationChildV12(workspaceRoot),
    readCurrentVedicIndependentEngineeringManifestV1(workspaceRoot),
    Promise.resolve().then(() => loadVedicSameArtifactCandidate(workspaceRoot))
  ]);
  assertSnapshot(parentSnapshot, PARENT_REGISTRY, "PARENT_REGISTRY_RAW_DRIFT");
  const parent = parseBaziDttStrictJsonArtifact(parentSnapshot);
  assertParentMaterial(parent);

  const endpointBindings = REFLECT_APPLY(OBJECT_VALUES, Object, [CURRENT_ENDPOINTS]);
  const endpointSnapshots = await Promise.all(REFLECT_APPLY(
    ARRAY_MAP,
    endpointBindings,
    [(binding) => readBaziDttStableWorkspaceArtifact(workspaceRoot, binding.path)]
  ));
  for (let index = 0; index < endpointBindings.length; index += 1) {
    assertSnapshot(endpointSnapshots[index], endpointBindings[index]);
  }

  const vedicManifestSummary = getVedicIndependentEngineeringManifestV1Summary(vedicManifest);
  const vedicBrowserSummary = summarizeVedicSameArtifactCandidate(vedicBrowser);
  assertUpstreams({
    bazi,
    ziwei,
    western,
    vedicObservation,
    vedicManifest,
    vedicManifestSummary,
    vedicBrowser,
    vedicBrowserSummary
  });
  return {
    parent,
    bazi,
    ziwei,
    western,
    vedicObservation,
    vedicManifestSummary,
    vedicBrowserSummary
  };
}

function buildProjection() {
  const bindingInputs = [
    PARENT_REGISTRY,
    CURRENT_ENDPOINTS.bazi,
    CURRENT_ENDPOINTS.ziwei,
    CURRENT_ENDPOINTS.western,
    CURRENT_ENDPOINTS.vedicObservation,
    CURRENT_ENDPOINTS.vedicManifest,
    CURRENT_ENDPOINTS.vedicBrowser
  ];
  const bindings = REFLECT_APPLY(ARRAY_MAP, bindingInputs, [artifactBinding]);
  const unsigned = {
    schemaVersion: "2.1.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    artifactBindings: bindings,
    lineage: {
      parent: artifactBinding(PARENT_REGISTRY),
      parentPreservedUnmodified: true,
      parentMechanicallyCurrent: false,
      parentOverwritten: false,
      parentBacklinkToThisChildPresent: false,
      parentCurrentVerifierExpectedToFailClosed: true,
      parentStalenessMechanicallyEstablishedFromBoundEndpoints: true,
      stalenessReasons: [
        {
          productSystemId: "bazi",
          reason: "parent_full_manifest_identity_is_not_current_after_report_contract_change",
          currentEndpointRole: CURRENT_ENDPOINTS.bazi.role
        },
        {
          productSystemId: "western-astrology",
          reason: "parent_points_to_historical_manifest_and_predecessor_v1_observation",
          currentEndpointRole: CURRENT_ENDPOINTS.western.role
        },
        {
          productSystemId: "vedic-astrology",
          reason: "parent_omits_current_engineering_manifest_and_same_artifact_browser_child",
          currentEndpointRoles: [
            CURRENT_ENDPOINTS.vedicObservation.role,
            CURRENT_ENDPOINTS.vedicManifest.role,
            CURRENT_ENDPOINTS.vedicBrowser.role
          ]
        }
      ]
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      inheritedByZiweiWesternOrVedicProductIdentity: false
    },
    systems: [
      systemEntry({
        productSystemId: "bazi",
        contractSystemId: "bazi",
        currentStatus: "current_candidate_drift_receipt_full_domain_manifest_not_current",
        targetSchema: 13,
        releaseIdentity: "legacy-v13",
        bindingRequired: 12,
        endpoints: [artifactBinding(CURRENT_ENDPOINTS.bazi)],
        currentFullDomainManifestMechanicallyVerified: false,
        currentEngineeringManifestMechanicallyVerified: false,
        browserRuntimeEvidence: "not_assessed_by_this_child"
      }),
      systemEntry({
        productSystemId: "ziwei-doushu",
        contractSystemId: "ziwei",
        currentStatus: "current_independent_engineering_domain_manifest_v2_not_formally_admitted",
        targetSchema: null,
        releaseIdentity: null,
        bindingRequired: 27,
        endpoints: [artifactBinding(CURRENT_ENDPOINTS.ziwei)],
        currentFullDomainManifestMechanicallyVerified: true,
        currentEngineeringManifestMechanicallyVerified: true,
        browserRuntimeEvidence: "not_assessed_by_this_child"
      }),
      systemEntry({
        productSystemId: "western-astrology",
        contractSystemId: "western",
        currentStatus: "current_observation_child_formal_domain_manifest_stale",
        targetSchema: null,
        releaseIdentity: null,
        bindingRequired: 28,
        endpoints: [artifactBinding(CURRENT_ENDPOINTS.western)],
        currentFullDomainManifestMechanicallyVerified: false,
        currentEngineeringManifestMechanicallyVerified: false,
        browserRuntimeEvidence: "not_assessed_by_this_child"
      }),
      systemEntry({
        productSystemId: "vedic-astrology",
        contractSystemId: "vedic",
        currentStatus: "current_observation_plus_engineering_manifest_plus_isolated_fact_browser_child_no_product_identity",
        targetSchema: null,
        releaseIdentity: null,
        bindingRequired: 38,
        endpoints: [
          artifactBinding(CURRENT_ENDPOINTS.vedicObservation),
          artifactBinding(CURRENT_ENDPOINTS.vedicManifest),
          artifactBinding(CURRENT_ENDPOINTS.vedicBrowser)
        ],
        currentFullDomainManifestMechanicallyVerified: false,
        currentEngineeringManifestMechanicallyVerified: true,
        browserRuntimeEvidence: "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
      })
    ],
    currentStatusSummary: {
      systemsRequired: 4,
      systemsWithCurrentEndpointMechanicallyVerified: 4,
      allSystemsCurrentFullDomainManifestMechanicallyVerified: false,
      systemsFormallyAdmitted: 0,
      systemsDomainAuthorityAuthorized: 0,
      systemsReleaseReady: 0,
      systemsPublicReleaseAuthorized: 0,
      totalAdmissionGatesRequired: 32,
      totalAdmissionGatesSatisfied: 0,
      bindingFrozenVerifiedBySystem: {
        bazi: "0/12",
        ziwei: "0/27",
        western: "0/28",
        vedic: "0/38"
      },
      independentExpertReviewsVerifiedBySystem: {
        bazi: "0/2",
        ziwei: "0/2",
        western: "0/2",
        vedic: "0/2"
      }
    },
    crossSystemPolicy: {
      mode: "independent_status_observation_only",
      factsFrozenForFormalComparison: false,
      scoringAllowed: false,
      weightingAllowed: false,
      majorityVoteAllowed: false,
      opinionAveragingAllowed: false,
      generatedModelWinnerSelectionAllowed: false,
      autoPersonMergeAllowed: false,
      authorityInheritanceAllowed: false,
      conceptEquivalenceInferenceAllowed: false,
      formalComparisonAuthorized: false
    },
    evidenceLedgerSeparation: [
      "engineering_evidence",
      "browser_and_runtime_evidence",
      "content_truth",
      "expert_truth",
      "rights_and_legal_judgment",
      "release_readiness",
      "public_release_authorization"
    ],
    observationBoundary: {
      upstreamPrivateBrandsVerified: 6,
      exactPersistedRawIdentitiesVerified: 7,
      sameHeldBufferHashAndParsePerJsonArtifact: true,
      pointInTimeOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      childDigestIsDigitalSignature: false
    },
    runtimeTrustBoundary: {
      nodeRuntimeIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      loaderIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    versionBoundary: {
      appendOnlyChild: true,
      persistedAsCentralRegistry: false,
      centralRegistryModifiedByThisChild: false,
      formalAdmissionRegistryModifiedByThisChild: false,
      existingDomainManifestsModifiedByThisChild: false,
      manifestRebindOrResignPerformed: false,
      ownerPromotionDecisionReceipt: null,
      activeAdmissionEffect: "none"
    },
    authorityBoundary: authorityBoundary(),
    doesNotEstablish: [
      "formal_central_registry_supersession_or_owner_acceptance",
      "all_four_current_full_domain_manifests",
      "formal_admission_for_any_system",
      "content_truth_or_domain_authority_for_any_system",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "rights_or_legal_conclusion_or_redistribution_authorization",
      "cross_system_input_fact_rule_or_concept_equivalence",
      "formal_cross_system_comparison_scoring_weighting_or_arbitration",
      "web_pwa_service_worker_public_host_or_product_runtime_evidence",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_readiness_deployment_rollback_or_public_release_authorization"
    ]
  };
  return {
    ...unsigned,
    childDigest: computeFourSystemCurrentStatusObservationChildV21Digest(unsigned)
  };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV21(
  workspaceRoot = process.cwd()
) {
  await collectCurrentInputs(workspaceRoot);
  return deepFreeze(captureJson(assertChildBoundary(buildProjection())));
}

function assertPersistedIdentity(snapshot, persisted) {
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [EXPECTED_PERSISTED.rawBytes])
    || EXPECTED_PERSISTED.rawBytes <= 0
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.childDigest)) {
    fail("PERSISTED_IDENTITY_UNSET", "current-status child 固定 raw identity 尚未冻结。");
  }
  if (snapshot.path !== FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || persisted.childDigest !== EXPECTED_PERSISTED.childDigest) {
    fail("PERSISTED_IDENTITY_DRIFT", "current-status child 固定 raw 或 semantic identity 漂移。");
  }
}

export async function loadFourSystemCurrentStatusObservationChildV21(
  workspaceRoot = process.cwd()
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH
  );
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, parsed);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
      !== serializeFourSystemCurrentStatusObservationChildV21(parsed)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "current-status child 不是唯一 canonical LF materialization。");
  }
  assertChildBoundary(parsed);
  const expected = await buildCurrentFourSystemCurrentStatusObservationChildV21(
    workspaceRoot
  );
  if (!exactJson(parsed, expected)) {
    fail("CURRENT_STATUS_MISMATCH", "persisted child 不等于当前逐体系状态投影。");
  }
  const verified = deepFreeze(captureJson(parsed));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV21(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const fourSystemCurrentStatusObservationChildV21TestOnly = OBJECT_FREEZE({
  CHILD_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  PARENT_REGISTRY,
  CURRENT_ENDPOINTS,
  EXPECTED_PERSISTED,
  assertChildBoundary,
  assertParentMaterial,
  assertPersistedIdentity,
  requireExactKeys,
  canonicalStringify,
  captureJson,
  deepFreeze,
  exactJson
});
