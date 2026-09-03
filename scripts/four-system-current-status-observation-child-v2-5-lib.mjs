import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV24Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV24,
  loadFourSystemCurrentStatusObservationChildV24
} from "./four-system-current-status-observation-child-v2-4-lib.mjs";
import {
  ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH,
  computeZiweiSameArtifactBrowserObservationChildV11Digest,
  isVerifiedZiweiSameArtifactBrowserObservationChildV11,
  loadZiweiSameArtifactBrowserObservationChildV11
} from "./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const IS_PROXY = utilTypes.isProxy;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_JOIN = Array.prototype.join;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_STRING = String;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [CRYPTO_CREATE_HASH("sha256")]
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const SHA256 = /^[a-f0-9]{64}$/u;
const LIMITS = OBJECT_FREEZE({
  maxDepth: 128,
  maxNodes: 1_000_000,
  maxText: 10_000_000
});

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.5.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.5.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_5";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T09:30:20.774Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.5";
const ZIWEI_CURRENT_STATUS =
  "current_expert_promotion_boundary_identity_drift_receipt_plus_current_isolated_same_artifact_browser_child_formal_manifest_stale";
const ZIWEI_BROWSER_RUNTIME_EVIDENCE =
  "isolated_same_artifact_edge_chrome_28_of_28_current_source_graph_not_web_pwa_or_product_runtime";
const STALE_ZIWEI_DOES_NOT_ESTABLISH =
  "current_ziwei_manifest_or_current_ziwei_browser_runtime_evidence";
const CURRENT_ZIWEI_DOES_NOT_ESTABLISH =
  "current_ziwei_formal_domain_manifest_or_production_browser_runtime_evidence";

const PARENT_V24 = OBJECT_FREEZE({
  role:
    "current_direct_predecessor_four_system_current_status_observation_child_v2_4",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_RELATIVE_PATH,
  rawBytes: 16_791,
  rawSha256:
    "fa70f8dbe13cacb0a4af282cfed4055a088d9c29d3d76fbb85a4bf52aa737e58",
  semanticDigestField: "childDigest",
  semanticDigest:
    "bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840"
});
const ZIWEI_EXPERT_DRIFT_RECEIPT = OBJECT_FREEZE({
  role:
    "current_ziwei_expert_promotion_boundary_identity_drift_receipt_candidate",
  path:
    "content/system-admission/ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.v1.0.0.json",
  rawBytes: 7_905,
  rawSha256:
    "c6728e943d713cf63be2b1d7e01d5170cf2a2b7b308e332abbbc53ff1ab37348",
  semanticDigestField: "receiptDigest",
  semanticDigest:
    "09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb"
});
const ZIWEI_BROWSER_V11 = OBJECT_FREEZE({
  role: "current_ziwei_same_artifact_browser_observation_child_v1_1",
  path: ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH,
  rawBytes: 57_541,
  rawSha256:
    "da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5",
  semanticDigestField: "childDigest",
  semanticDigest:
    "08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 17_970,
  rawSha256:
    "020ce7b2affa18fa25483ffbded8400ef4bb5151e822fee17d68f33afb610ec2",
  childDigest:
    "183253a83af0029a525eefe95207e4b4ad39d7febcc00c5c317bbaa5e837cdbc"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV25Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "FourSystemCurrentStatusObservationChildV25Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV25Error(
    code,
    message,
    options
  );
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (
    value === null
    || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])
  ) {
    return value;
  }
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) {
    fail("NON_PASSIVE_OBJECT", "v2.5 不接受 Proxy。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value]
  );
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (
      !descriptor
      || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
    ) {
      fail(
        "NON_PASSIVE_OBJECT",
        "v2.5 只接受无 accessor 的被动 JSON 值。"
      );
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function assertDeepFrozen(value, seen = new NATIVE_WEAK_SET()) {
  if (
    value === null
    || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])
  ) {
    return;
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    fail(
      "UPSTREAM_NOT_DEEP_FROZEN",
      "upstream 品牌结果未实际深冻结。"
    );
  }
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value]
  );
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (
      descriptor
      && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
    ) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const state = { nodes: 0, text: 0 };

  function visit(current, depth = 0) {
    state.nodes += 1;
    if (depth > LIMITS.maxDepth || state.nodes > LIMITS.maxNodes) {
      fail("VALUE_LIMIT_EXCEEDED", "v2.5 JSON 超过固定边界。");
    }
    if (current === null) return "null";
    if (typeof current === "string") {
      const encoded = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      state.text += encoded.length;
      if (state.text > LIMITS.maxText) {
        fail("VALUE_LIMIT_EXCEEDED", "v2.5 JSON 文本过长。");
      }
      return encoded;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (
        !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])
      ) {
        fail("NON_CANONICAL_JSON", "v2.5 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (
      typeof current !== "object"
      || REFLECT_APPLY(IS_PROXY, utilTypes, [current])
    ) {
      fail("NON_CANONICAL_JSON", "v2.5 仅接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v2.5 不接受循环或别名。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const prototype = REFLECT_APPLY(
      OBJECT_GET_PROTOTYPE_OF,
      Object,
      [current]
    );
    const descriptors = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
      Object,
      [current]
    );
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const parts = [];
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (
        prototype !== ARRAY_PROTOTYPE
        || ownKeys.length !== current.length + 1
      ) {
        fail("NON_CANONICAL_JSON", "v2.5 数组键不合法。");
      }
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (
          !descriptor
          || !descriptor.enumerable
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        ) {
          fail(
            "NON_CANONICAL_JSON",
            "v2.5 不接受稀疏/accessor 数组。"
          );
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [
          visit(descriptor.value, depth + 1)
        ]);
      }
      return "[" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "]";
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "v2.5 对象原型不合法。");
    }
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      const descriptor = descriptors[key];
      if (
        typeof key !== "string"
        || key === "__proto__"
        || key === "constructor"
        || key === "prototype"
        || !descriptor
        || !descriptor.enumerable
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      ) {
        fail("NON_CANONICAL_JSON", "v2.5 对象键不合法。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      REFLECT_APPLY(ARRAY_PUSH, parts, [
        REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])
          + ":"
          + visit(descriptors[key].value, depth + 1)
      ]);
    }
    return "{" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "}";
  }

  return visit(value);
}

function captureJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Text(value) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function binding(pin) {
  return {
    role: pin.role,
    path: pin.path,
    rawBytes: pin.rawBytes,
    rawSha256: pin.rawSha256,
    semanticDigestField: pin.semanticDigestField,
    semanticDigest: pin.semanticDigest
  };
}

function unsignedChild(value) {
  const unsigned = captureJson(value);
  delete unsigned.childDigest;
  return unsigned;
}

export function computeFourSystemCurrentStatusObservationChildV25Digest(value) {
  return sha256Text(
    DIGEST_DOMAIN + "\0" + canonicalStringify(unsignedChild(value))
  );
}

export function serializeFourSystemCurrentStatusObservationChildV25(value) {
  return REFLECT_APPLY(
    JSON_STRINGIFY,
    JSON,
    [captureJson(value), null, 2]
  ) + "\n";
}

function assertSnapshot(snapshot, pin, code) {
  if (
    snapshot.path !== pin.path
    || snapshot.rawBytes !== pin.rawBytes
    || snapshot.rawSha256 !== pin.rawSha256
  ) {
    fail(code, "v2.5 upstream raw identity 漂移。");
  }
}

function systemIndex(systems, productSystemId) {
  let found = -1;
  for (let index = 0; index < systems.length; index += 1) {
    if (systems[index]?.productSystemId === productSystemId) {
      if (found !== -1) {
        fail("SYSTEM_DUPLICATE", productSystemId + " 重复。");
      }
      found = index;
    }
  }
  if (found === -1) {
    fail("SYSTEM_MISSING", productSystemId + " 缺失。");
  }
  return found;
}

function requireAllFalse(value, label) {
  if (
    value === null
    || typeof value !== "object"
    || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])
  ) {
    fail("AUTHORITY_INVALID", label + " 必须是对象。");
  }
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value]
  );
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  if (keys.length === 0) {
    fail("AUTHORITY_INVALID", label + " 不得为空。");
  }
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (
      typeof keys[index] !== "string"
      || !descriptor
      || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      || descriptor.value !== false
    ) {
      fail("AUTHORITY_PROMOTION", label + " 必须全红。");
    }
  }
}

function assertParentV24(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV24(parent)) {
    fail(
      "PARENT_V24_BRAND_REQUIRED",
      "必须消费 v2.4 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    parent?.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.4.0"
    || parent?.childDigest !== PARENT_V24.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV24Digest(parent)
      !== PARENT_V24.semanticDigest
    || parent?.activeAdmissionEffect !== "none"
    || parent?.currentStatusSummary?.systemsRequired !== 4
    || parent?.currentStatusSummary
      ?.systemsWithCurrentEndpointMechanicallyVerified !== 4
    || parent?.currentStatusSummary?.totalAdmissionGatesRequired !== 32
    || parent?.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
    || parent?.currentStatusSummary?.systemsFormallyAdmitted !== 0
    || parent?.currentStatusSummary?.systemsDomainAuthorityAuthorized !== 0
    || parent?.currentStatusSummary?.systemsReleaseReady !== 0
    || parent?.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
    || parent?.currentStatusSummary
      ?.allSystemsCurrentFullDomainManifestMechanicallyVerified !== false
    || parent?.observationBoundary?.exactPersistedRawIdentitiesVerified !== 2
    || parent?.observationBoundary?.upstreamPrivateBrandsVerified !== 2
    || parent?.observationBoundary?.crossFileAtomicSnapshot !== false
    || parent?.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || parent?.observationBoundary?.mutationEpochReceipt !== null
    || parent?.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || parent?.observationBoundary?.abaExcluded !== false
    || parent?.authorityBoundary?.releaseReady !== false
    || parent?.authorityBoundary?.publicDeploymentAuthorized !== false
    || parent?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || parent?.projectReleaseGovernanceContext?.targetSchema !== 13
    || parent?.projectReleaseGovernanceContext?.migrationId !== null
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parent?.systems])
    || parent.systems.length !== 4
  ) {
    fail(
      "PARENT_V24_SEMANTIC_DRIFT",
      "v2.4 parent 身份或红门语义漂移。"
    );
  }
  requireAllFalse(parent.authorityBoundary, "parent.authorityBoundary");
  const ziwei =
    parent.systems[systemIndex(parent.systems, "ziwei-doushu")];
  if (
    ziwei?.currentStatus
      !== "current_expert_promotion_boundary_identity_drift_receipt_manifest_and_browser_stale"
    || ziwei?.currentEvidence?.browserRuntimeEvidence
      !== "historical_same_artifact_child_source_graph_stale_no_current_browser_runtime_evidence"
    || !exactJson(
      ziwei?.currentEvidence?.endpoints,
      [binding(ZIWEI_EXPERT_DRIFT_RECEIPT)]
    )
  ) {
    fail(
      "PARENT_V24_ZIWEI_DRIFT",
      "v2.4 Ziwei stale endpoint/status 基线漂移。"
    );
  }
}

function assertZiweiBrowserV11(browserChild) {
  if (
    !isVerifiedZiweiSameArtifactBrowserObservationChildV11(browserChild)
  ) {
    fail(
      "ZIWEI_BROWSER_V11_BRAND_REQUIRED",
      "必须消费 Ziwei v1.1 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    browserChild?.childId
      !== "hakimi.ziwei.same-artifact-browser-observation/1.1.0"
    || browserChild?.childDigest !== ZIWEI_BROWSER_V11.semanticDigest
    || computeZiweiSameArtifactBrowserObservationChildV11Digest(browserChild)
      !== ZIWEI_BROWSER_V11.semanticDigest
    || browserChild?.activeAdmissionEffect !== "none"
    || browserChild?.systemIdentity?.releaseIdentity !== null
    || browserChild?.systemIdentity?.targetSchema !== null
    || browserChild?.systemIdentity?.migrationId !== null
    || browserChild?.lineage?.expertDriftReceipt
      ?.privateBrandConsumed !== true
    || browserChild?.lineage?.expertDriftReceipt
      ?.currentAtVerification !== true
    || browserChild?.browserEvidenceBoundary
      ?.totalPassedScenarioOutcomes !== 28
    || browserChild?.browserEvidenceBoundary
      ?.failedScenarioOutcomes !== 0
    || browserChild?.browserEvidenceBoundary
      ?.retriedScenarioOutcomes !== 0
    || browserChild?.browserEvidenceBoundary
      ?.exactSingleBuildExecuted !== true
    || browserChild?.browserEvidenceBoundary
      ?.sameOutputTreeServedToBothBrowsers !== true
    || browserChild?.browserEvidenceBoundary
      ?.currentSourceGraphCanonicalExact !== true
    || browserChild?.browserEvidenceBoundary
      ?.isolatedLoopbackBrowserRuntimeObservationEstablished !== true
    || browserChild?.browserEvidenceBoundary
      ?.productionBrowserRuntimeEvidenceEstablished !== false
    || browserChild?.browserEvidenceBoundary?.publicHostValidated !== false
    || browserChild?.browserEvidenceBoundary
      ?.pwaOrServiceWorkerValidated !== false
    || browserChild?.browserEvidenceBoundary
      ?.fixedPhysicalDeviceValidated !== false
    || browserChild?.manifestBoundary
      ?.historicalManifestMechanicallyCurrent !== false
    || browserChild?.manifestBoundary
      ?.currentCandidateManifestPersisted !== false
    || browserChild?.manifestBoundary
      ?.currentFullEngineeringManifestEstablished !== false
    || browserChild?.manifestBoundary
      ?.manifestRebindOrResignPerformed !== false
    || browserChild?.manifestBoundary?.ownerPromotionDecisionReceipt !== null
    || browserChild?.gateSummary?.admissionGatesSatisfied !== 0
    || browserChild?.gateSummary?.bindingFrozenVerified !== 0
    || browserChild?.gateSummary?.independentExpertReviewsVerified !== 0
    || browserChild?.gateSummary?.externalVerifiedExpertReceiptsVerified !== 0
    || browserChild?.gateSummary?.sourceBundleComplete !== false
    || browserChild?.gateSummary?.rightsBundleComplete !== false
    || browserChild?.gateSummary?.expertReviewBundleComplete !== false
    || browserChild?.gateSummary?.releaseEvidenceComplete !== false
    || browserChild?.observationBoundary
      ?.repositoryCrossFileAtomicSnapshot !== false
    || browserChild?.observationBoundary?.mutationEpochAvailable !== false
    || browserChild?.observationBoundary?.mutationEpochReceipt !== null
    || browserChild?.observationBoundary
      ?.repositoryIntervalMutationExcluded !== false
    || browserChild?.observationBoundary?.repositoryAbaExcluded !== false
    || browserChild?.observationBoundary?.digestIsDigitalSignature !== false
  ) {
    fail(
      "ZIWEI_BROWSER_V11_SEMANTIC_DRIFT",
      "Ziwei v1.1 identity/browser/Manifest/authority 红门漂移。"
    );
  }
  requireAllFalse(
    browserChild.authorityBoundary,
    "ziweiBrowserV11.authorityBoundary"
  );
  const receiptFields = [
    "releaseEvidenceReceipts",
    "productionBrowserReceipts",
    "deploymentReceipts",
    "rollbackReceipts",
    "expertReviewReceipts",
    "rightsLegalDecisionReceipts"
  ];
  for (let index = 0; index < receiptFields.length; index += 1) {
    if (browserChild?.formalReceiptCounts?.[receiptFields[index]] !== 0) {
      fail(
        "ZIWEI_BROWSER_V11_RECEIPT_PROMOTION",
        "Ziwei v1.1 formal receipts 必须保持 0。"
      );
    }
  }
}

function ziweiProjection(parentZiwei) {
  const ziwei = captureJson(parentZiwei);
  ziwei.currentStatus = ZIWEI_CURRENT_STATUS;
  ziwei.currentEvidence.browserRuntimeEvidence =
    ZIWEI_BROWSER_RUNTIME_EVIDENCE;
  ziwei.currentEvidence.endpoints = [
    binding(ZIWEI_EXPERT_DRIFT_RECEIPT),
    binding(ZIWEI_BROWSER_V11)
  ];
  return ziwei;
}

function doesNotEstablishProjection(parentValue) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parentValue])) {
    fail(
      "DOES_NOT_ESTABLISH_INVALID",
      "v2.4 doesNotEstablish 必须是数组。"
    );
  }
  const projected = captureJson(parentValue);
  let replacements = 0;
  for (let index = 0; index < projected.length; index += 1) {
    if (projected[index] === STALE_ZIWEI_DOES_NOT_ESTABLISH) {
      projected[index] = CURRENT_ZIWEI_DOES_NOT_ESTABLISH;
      replacements += 1;
    }
  }
  if (replacements !== 1) {
    fail(
      "DOES_NOT_ESTABLISH_BASELINE_DRIFT",
      "Ziwei stale disclaimer 必须恰好出现一次。"
    );
  }
  return projected;
}

function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.5.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [
    binding(PARENT_V24),
    binding(ZIWEI_BROWSER_V11)
  ];
  const ziweiIndex = systemIndex(candidate.systems, "ziwei-doushu");
  candidate.systems[ziweiIndex] = ziweiProjection(
    parent.systems[systemIndex(parent.systems, "ziwei-doushu")]
  );
  candidate.lineage = {
    parent: binding(PARENT_V24),
    ziweiBrowserChild: binding(ZIWEI_BROWSER_V11),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    ziweiBrowserChildMechanicallyCurrent: true,
    ziweiBrowserChildPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    ziweiEndpointSetReplacedByExpertDriftAndCurrentBrowserChild: true,
    ziweiBrowserStatusReplacedByCurrentChild: true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "western-astrology",
      "vedic-astrology"
    ],
    uniqueBlockerClaimed: false
  };
  candidate.doesNotEstablish =
    doesNotEstablishProjection(parent.doesNotEstablish);
  candidate.childDigest =
    computeFourSystemCurrentStatusObservationChildV25Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (
    !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
  ) {
    fail("SYSTEM_SET_INVALID", "v2.5 必须恰含四体系。");
  }
  const ids = [
    "bazi",
    "ziwei-doushu",
    "western-astrology",
    "vedic-astrology"
  ];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const currentIndex = systemIndex(candidate.systems, id);
    const parentIndex = systemIndex(parent.systems, id);
    const system = candidate.systems[currentIndex];
    if (id === "ziwei-doushu") {
      if (!exactJson(system, ziweiProjection(parent.systems[parentIndex]))) {
        fail(
          "ZIWEI_PROJECTION_DRIFT",
          "Ziwei 只能替换 currentStatus/browserRuntimeEvidence/endpoints。"
        );
      }
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail(
        "NON_ZIWEI_PROJECTION_DRIFT",
        id + " 必须是 v2.4 canonical exact copy。"
      );
    }
    if (
      system?.gateSummary?.admissionGatesSatisfied !== 0
      || system?.gateSummary?.bindingFrozenVerified !== 0
      || system?.gateSummary?.independentExpertReviewsVerified !== 0
      || system?.currentEvidence
        ?.currentFullDomainManifestMechanicallyVerified !== false
      || system?.authorityBoundary?.formalAdmissionAuthorized !== false
      || system?.authorityBoundary?.releaseReady !== false
      || system?.authorityBoundary?.publicReleaseAuthorized !== false
      || system?.authorityBoundary?.publicDeploymentAuthorized !== false
    ) {
      fail(
        "SYSTEM_AUTHORITY_PROMOTION",
        id + " 零门或 authority 被抬升。"
      );
    }
    requireAllFalse(
      system.authorityBoundary,
      id + ".authorityBoundary"
    );
  }
}

function assertChildBoundary(
  candidate,
  parent,
  browserChild,
  expectedProjection = undefined
) {
  if (
    candidate?.schemaVersion !== "2.5.0"
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID
    || candidate?.status !== STATUS
    || candidate?.createdAt !== CREATED_AT
    || !exactJson(
      candidate?.artifactBindings,
      [binding(PARENT_V24), binding(ZIWEI_BROWSER_V11)]
    )
  ) {
    fail(
      "CHILD_IDENTITY_INVALID",
      "v2.5 child identity 或 direct bindings 漂移。"
    );
  }
  assertSystems(candidate, parent);
  if (
    !exactJson(
      candidate.currentStatusSummary,
      parent.currentStatusSummary
    )
    || !exactJson(candidate.authorityBoundary, parent.authorityBoundary)
    || !exactJson(candidate.crossSystemPolicy, parent.crossSystemPolicy)
    || !exactJson(
      candidate.observationBoundary,
      parent.observationBoundary
    )
    || !exactJson(
      candidate.projectReleaseGovernanceContext,
      parent.projectReleaseGovernanceContext
    )
    || !exactJson(
      candidate.evidenceLedgerSeparation,
      parent.evidenceLedgerSeparation
    )
    || !exactJson(
      candidate.runtimeTrustBoundary,
      parent.runtimeTrustBoundary
    )
    || !exactJson(candidate.versionBoundary, parent.versionBoundary)
    || !exactJson(
      candidate.doesNotEstablish,
      doesNotEstablishProjection(parent.doesNotEstablish)
    )
    || candidate.activeAdmissionEffect !== "none"
    || candidate.currentStatusSummary.totalAdmissionGatesSatisfied !== 0
    || candidate.currentStatusSummary.systemsFormallyAdmitted !== 0
    || candidate.currentStatusSummary.systemsDomainAuthorityAuthorized !== 0
    || candidate.currentStatusSummary.systemsReleaseReady !== 0
    || candidate.currentStatusSummary.systemsPublicReleaseAuthorized !== 0
    || candidate.currentStatusSummary
      .allSystemsCurrentFullDomainManifestMechanicallyVerified !== false
    || candidate.observationBoundary.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary
      .mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary.mutationEpochReceipt !== null
    || candidate.observationBoundary
      .intervalMutationExcludedAcrossFiles !== false
    || candidate.observationBoundary.abaExcluded !== false
    || candidate.projectReleaseGovernanceContext.activeLine !== "legacy-v13"
    || candidate.projectReleaseGovernanceContext.targetSchema !== 13
    || candidate.projectReleaseGovernanceContext.migrationId !== null
    || candidate.versionBoundary.persistedAsCentralRegistry !== false
    || candidate.versionBoundary.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .formalAdmissionRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .existingDomainManifestsModifiedByThisChild !== false
    || candidate.versionBoundary.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary.ownerPromotionDecisionReceipt !== null
  ) {
    fail(
      "BOUNDARY_PROMOTION_FORBIDDEN",
      "v2.5 summary/governance/authority/epoch/atomic/ABA 必须 exact copy 且全红。"
    );
  }
  requireAllFalse(candidate.authorityBoundary, "authorityBoundary");
  assertZiweiBrowserV11(browserChild);
  if (
    !SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV25Digest(candidate)
      !== candidate.childDigest
  ) {
    fail("CHILD_DIGEST_INVALID", "v2.5 childDigest 无效。");
  }
  if (
    expectedProjection !== undefined
    && !exactJson(candidate, expectedProjection)
  ) {
    fail(
      "CURRENT_STATUS_MISMATCH",
      "v2.5 不等于 v2.4 + Ziwei v1.1 当前唯一投影。"
    );
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent =
    await loadFourSystemCurrentStatusObservationChildV24(workspaceRoot);
  const browserChild =
    await loadZiweiSameArtifactBrowserObservationChildV11(workspaceRoot);
  assertDeepFrozen(parent);
  assertDeepFrozen(browserChild);
  assertParentV24(parent);
  assertZiweiBrowserV11(browserChild);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V24.path
  );
  const browserSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_BROWSER_V11.path
  );
  assertSnapshot(parentSnapshot, PARENT_V24, "PARENT_V24_RAW_DRIFT");
  assertSnapshot(
    browserSnapshot,
    ZIWEI_BROWSER_V11,
    "ZIWEI_BROWSER_V11_RAW_DRIFT"
  );
  if (
    !exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(
      parseBaziDttStrictJsonArtifact(browserSnapshot),
      browserChild
    )
  ) {
    fail(
      "UPSTREAM_BRAND_RAW_MISMATCH",
      "upstream 私有品牌不等于固定 raw artifact。"
    );
  }
  return { parent, browserChild };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV25(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent, browserChild } = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      browserChild
    )
  );
}

function decodeSnapshot(snapshot) {
  try {
    return REFLECT_APPLY(
      TEXT_DECODER_DECODE,
      UTF8_DECODER,
      [snapshot.bytes]
    );
  } catch (cause) {
    fail("INVALID_UTF8", "v2.5 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV25(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (
    EXPECTED_PERSISTED.rawBytes <= 0
    || !SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !SHA256.test(EXPECTED_PERSISTED.childDigest)
    || /^0+$/u.test(EXPECTED_PERSISTED.rawSha256)
    || /^0+$/u.test(EXPECTED_PERSISTED.childDigest)
  ) {
    fail(
      "PERSISTED_IDENTITY_UNSET",
      "v2.5 raw/self identity 尚未冻结。"
    );
  }
  const { parent, browserChild } = await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      browserChild
    )
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_RELATIVE_PATH
  );
  assertSnapshot(
    snapshot,
    {
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_RELATIVE_PATH,
      ...EXPECTED_PERSISTED
    },
    "PERSISTED_IDENTITY_DRIFT"
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (
    persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot)
      !== serializeFourSystemCurrentStatusObservationChildV25(persisted)
  ) {
    fail(
      "PERSISTED_MATERIALIZATION_DRIFT",
      "v2.5 raw/self/canonical materialization 漂移。"
    );
  }
  assertChildBoundary(persisted, parent, browserChild, expected);
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV25(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV25Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV25(value)) {
    fail(
      "CHILD_BRAND_REQUIRED",
      "summary 只接受 v2.5 exact persisted loader 私有品牌。"
    );
  }
  const ziwei =
    value.systems[systemIndex(value.systems, "ziwei-doushu")];
  const endpointRoles = [];
  for (
    let index = 0;
    index < ziwei.currentEvidence.endpoints.length;
    index += 1
  ) {
    REFLECT_APPLY(ARRAY_PUSH, endpointRoles, [
      ziwei.currentEvidence.endpoints[index].role
    ]);
  }
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    ziweiStatus: ziwei.currentStatus,
    ziweiBrowserRuntimeEvidence:
      ziwei.currentEvidence.browserRuntimeEvidence,
    ziweiEndpointRoles: endpointRoles,
    ziweiCurrentEngineeringManifestMechanicallyVerified:
      ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    ziweiCurrentFullDomainManifestMechanicallyVerified:
      ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    systemsRequired: value.currentStatusSummary.systemsRequired,
    systemsWithCurrentEndpointMechanicallyVerified:
      value.currentStatusSummary
        .systemsWithCurrentEndpointMechanicallyVerified,
    totalAdmissionGatesSatisfied:
      value.currentStatusSummary.totalAdmissionGatesSatisfied,
    systemsFormallyAdmitted:
      value.currentStatusSummary.systemsFormallyAdmitted,
    systemsDomainAuthorityAuthorized:
      value.currentStatusSummary.systemsDomainAuthorityAuthorized,
    systemsReleaseReady: value.currentStatusSummary.systemsReleaseReady,
    systemsPublicReleaseAuthorized:
      value.currentStatusSummary.systemsPublicReleaseAuthorized,
    crossFileAtomicSnapshot:
      value.observationBoundary.crossFileAtomicSnapshot,
    mutationEpochReceipt:
      value.observationBoundary.mutationEpochReceipt,
    abaExcluded: value.observationBoundary.abaExcluded,
    releaseIdentity:
      value.projectReleaseGovernanceContext.activeLine,
    targetSchema: value.projectReleaseGovernanceContext.targetSchema,
    migrationId: value.projectReleaseGovernanceContext.migrationId
  });
}

export const fourSystemCurrentStatusObservationChildV25TestOnly =
  OBJECT_FREEZE({
    CHILD_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    ZIWEI_CURRENT_STATUS,
    ZIWEI_BROWSER_RUNTIME_EVIDENCE,
    STALE_ZIWEI_DOES_NOT_ESTABLISH,
    CURRENT_ZIWEI_DOES_NOT_ESTABLISH,
    PARENT_V24,
    ZIWEI_EXPERT_DRIFT_RECEIPT,
    ZIWEI_BROWSER_V11,
    EXPECTED_PERSISTED,
    canonicalStringify,
    captureJson,
    deepFreeze,
    assertDeepFrozen,
    assertParentV24,
    assertZiweiBrowserV11,
    ziweiProjection,
    doesNotEstablishProjection,
    buildProjection,
    assertSystems,
    assertChildBoundary
  });
