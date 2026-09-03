import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV22,
  isVerifiedFourSystemCurrentStatusObservationChildV22,
  computeFourSystemCurrentStatusObservationChildV22Digest
} from "./four-system-current-status-observation-child-v2-2-lib.mjs";
import {
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate,
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.3.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.3.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_3";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T11:00:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.3";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
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
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const UTIL_IS_PROXY = nodeUtilTypes.isProxy;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PARENT_V22 = OBJECT_FREEZE({
  role: "current_direct_predecessor_four_system_current_status_observation_child_v2_2",
  path: "content/system-admission/four-system-current-status-observation-child.v2.2.0.json",
  rawBytes: 18_625,
  rawSha256: "1a81a03b682613c9221407cb2dfa9598728e63f683632d877abdb0524baade54",
  semanticDigestField: "childDigest",
  semanticDigest: "b0d0340eae1190560831be2901afe9924e6c1a6434f5a7596d8be6aacb28d941"
});

// The receipt binding is frozen only after its independent append-only artifact exists.
// Until then, build/load fail closed through assertBindingsFrozen().
const WESTERN_RECEIPT = OBJECT_FREEZE({
  role: "current_append_only_source_and_manifest_identity_drift_receipt_candidate",
  path: "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json",
  rawBytes: 12_537,
  rawSha256: "09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26",
  semanticDigestField: "receiptDigest",
  semanticDigest: "f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097"
});

const WESTERN_OBSERVATION_V11 = OBJECT_FREEZE({
  role: "current_western_version_aware_observation_child_v1_1",
  path: "content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json",
  rawBytes: 12_692,
  rawSha256: "140bed89a638deb970e1a60d3ffcbc96eebef509bd14bd692726b8c561d13593",
  semanticDigestField: "candidateDigest",
  semanticDigest: "664bdbddd48bc0205eb6dba4cf923903a78d35e6d63ab29ca8e7de3faa5975af"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 17_398,
  rawSha256: "7f6a12f52cf035c2138c17c6f58855db03ba686c7c71ebf2221021461387f1b7",
  childDigest: "ea16c7ae69271c2a4ea5902e4ec8b9ff6df224c5d58433b07a56004a2c46e2de"
});

const WESTERN_CURRENT_STATUS =
  "current_source_and_manifest_identity_drift_receipt_formal_source_v1_v1_2_chain_and_formal_domain_manifest_stale";

export class FourSystemCurrentStatusObservationChildV23Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "FourSystemCurrentStatusObservationChildV23Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new FourSystemCurrentStatusObservationChildV23Error(code, message, cause);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function ownArray() {
  const output = new NATIVE_ARRAY(arguments.length);
  for (let index = 0; index < arguments.length; index += 1) {
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, index, {
      configurable: true,
      enumerable: true,
      value: arguments[index],
      writable: true
    }]);
  }
  return output;
}

function appendOwn(values, value) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [values])) {
    fail("NON_CANONICAL_JSON", "appendOwn 只接受数组。 ");
  }
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [values]
  );
  const output = new NATIVE_ARRAY(values.length + 1);
  for (let index = 0; index < values.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor
      || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      || descriptor.enumerable !== true) {
      fail("NON_CANONICAL_JSON", "appendOwn 输入必须是稠密 data-property 数组。");
    }
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, index, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true
    }]);
  }
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, values.length, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  }]);
  return output;
}

function setOwn(target, key, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  }]);
}

function captureCanonical(value, state = {
  active: new NATIVE_WEAK_SET(),
  seen: new NATIVE_WEAK_SET(),
  nodes: 0,
  textCodeUnits: 0
}, depth = 0) {
  if (depth > 64) fail("NON_CANONICAL_JSON", "current-status v2.3 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) {
    fail("NON_CANONICAL_JSON", "current-status v2.3 输入超过节点上限。");
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", "current-status v2.3 数值必须有限且不能为负零。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > 2_000_000) {
      fail("NON_CANONICAL_JSON", "current-status v2.3 文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object"
    || REFLECT_APPLY(UTIL_IS_PROXY, nodeUtilTypes, [value])) {
    fail("NON_CANONICAL_JSON", "current-status v2.3 只接受非 Proxy JSON 数据值。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("NON_CANONICAL_JSON", "current-status v2.3 不接受 cycle。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("NON_CANONICAL_JSON", "current-status v2.3 不接受 alias。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  try {
    const descriptors = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
      Object,
      [value]
    );
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] === "symbol") {
        fail("NON_CANONICAL_JSON", "current-status v2.3 不接受 Symbol 属性。");
      }
    }
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE) {
        fail("NON_CANONICAL_JSON", "current-status v2.3 数组原型无效。");
      }
      const length = descriptors.length?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
        || length < 0
        || keys.length !== length + 1) {
        fail("NON_CANONICAL_JSON", "current-status v2.3 数组必须稠密且无额外字段。");
      }
      const output = new NATIVE_ARRAY(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_CANONICAL_JSON", "current-status v2.3 数组元素必须是自有 data property。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, index, {
          configurable: true,
          enumerable: true,
          value: captureCanonical(descriptor.value, state, depth + 1),
          writable: true
        }]);
      }
      return output;
    }
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "current-status v2.3 对象原型无效。");
    }
    const stringKeys = new NATIVE_ARRAY(keys.length);
    for (let index = 0; index < keys.length; index += 1) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [stringKeys, index, {
        configurable: true,
        enumerable: true,
        value: keys[index],
        writable: true
      }]);
    }
    REFLECT_APPLY(ARRAY_SORT, stringKeys, [compareCodeUnits]);
    const output = {};
    for (let index = 0; index < stringKeys.length; index += 1) {
      const key = stringKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_CANONICAL_JSON", "current-status v2.3 字段必须是自有可枚举 data property。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function canonicalStringify(value) {
  try {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureCanonical(value)]);
  } catch (cause) {
    if (cause instanceof FourSystemCurrentStatusObservationChildV23Error) throw cause;
    fail("NON_CANONICAL_JSON", "current-status v2.3 只接受被动、无别名 JSON 数据。", cause);
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
      fail("NON_CANONICAL_JSON", "current-status v2.3 不接受 accessor。");
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
    if (key !== field) setOwn(output, key, snapshot[key]);
  }
  return output;
}

export function computeFourSystemCurrentStatusObservationChildV23Digest(value) {
  return sha256Text(
    `${DIGEST_DOMAIN}\0${canonicalStringify(withoutOwnField(value, "childDigest"))}`
  );
}

export function serializeFourSystemCurrentStatusObservationChildV23(value) {
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

function assertBindingsFrozen() {
  const bindings = ownArray(PARENT_V22, WESTERN_RECEIPT);
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [binding.rawBytes])
      || binding.rawBytes <= 0
      || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [binding.rawSha256])
      || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [binding.semanticDigest])) {
      fail("DIRECT_BINDING_IDENTITY_UNSET", `${binding.path} 固定 raw/self identity 尚未冻结。`);
    }
  }
}

function requireExactKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    fail("KEY_SET_INVALID", `${label} 必须是对象。`);
  }
  const actual = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, actual, []);
  const expected = new NATIVE_ARRAY(expectedKeys.length);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [expected, index, {
      configurable: true,
      enumerable: true,
      value: expectedKeys[index],
      writable: true
    }]);
  }
  REFLECT_APPLY(ARRAY_SORT, expected, []);
  if (!exactJson(actual, expected)) {
    fail("KEY_SET_INVALID", `${label} 字段集合不精确。`);
  }
}

function requireAllFalse(value, label) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    fail("AUTHORITY_BOUNDARY_INVALID", `${label} 必须是全 false 对象。`);
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  if (keys.length === 0) fail("AUTHORITY_BOUNDARY_INVALID", `${label} 不能为空。`);
  for (let index = 0; index < keys.length; index += 1) {
    if (value[keys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} 不得出现 authority 提升。`);
    }
  }
}

function assertSnapshot(snapshot, binding, code = "DIRECT_ARTIFACT_IDENTITY_DRIFT") {
  if (snapshot.path !== binding.path
    || snapshot.rawBytes !== binding.rawBytes
    || snapshot.rawSha256 !== binding.rawSha256) {
    fail(code, `${binding.path} 原始身份漂移。`);
  }
}

function assertUpstreams(parent, receipt) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV22(parent)
    || parent.schemaVersion !== "2.2.0"
    || parent.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.2.0"
    || parent.childDigest !== PARENT_V22.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV22Digest(parent)
      !== PARENT_V22.semanticDigest
    || parent.observationBoundary?.sameHeldBufferHashAndParsePerJsonArtifact !== true
    || parent.versionBoundary?.persistedAsCentralRegistry !== false
    || parent.activeAdmissionEffect !== "none"
    || parent.authorityBoundary?.releaseReady !== false) {
    fail("PARENT_V22_PRIVATE_PROJECTION_INVALID", "v2.2 parent 私有品牌或固定投影无效。");
  }
  if (!isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(receipt)
    || receipt.candidateId
      !== "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0"
    || receipt.candidateStatus
      !== "current_append_only_western_source_and_manifest_identity_drift_observation_candidate_zero_admission_effect"
    || receipt.currentStatus
      !== "current_append_only_western_source_and_manifest_identity_drift_observation_candidate_zero_admission_effect"
    || receipt.receiptDigest !== WESTERN_RECEIPT.semanticDigest
    || receipt.activeAdmissionEffect !== "none"
    || receipt.formalSourceDrift?.formalCurrentRemainsV1 !== true
    || receipt.formalSourceDrift?.v11AndV12RemainNonformal !== true
    || receipt.formalSourceDrift?.currentV12LoaderMechanicallyCurrent !== false
    || receipt.formalSourceDrift?.currentV12LoaderFailureClass !== "LEDGER_MISMATCH"
    || receipt.formalSourceDrift?.sourceRebindOrResignPerformed !== false
    || receipt.formalSourceDrift?.uniqueBlockerClaimed !== false
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [receipt.formalSourceDrift?.sourceChain])
    || receipt.formalSourceDrift.sourceChain.length !== 3
    || receipt.formalSourceDrift.sourceChain[0]?.versionRole !== "formal_current_v1"
    || receipt.formalSourceDrift.sourceChain[1]?.versionRole
      !== "nonformal_successor_v1_1"
    || receipt.formalSourceDrift.sourceChain[2]?.versionRole
      !== "nonformal_successor_v1_2"
    || receipt.formalManifestDrift?.historicalManifestMechanicallyCurrent !== false
    || receipt.formalManifestDrift?.currentLoaderFailureClass !== "MANIFEST_MISMATCH"
    || receipt.formalManifestDrift?.manifestRebindOrResignPerformed !== false
    || receipt.formalManifestDrift?.uniqueBlockerClaimed !== false
    || receipt.currentEndpointBindings?.currentVersionAwareObservation
      ?.candidateDigest !== WESTERN_OBSERVATION_V11.semanticDigest
    || receipt.gateSummary?.admissionGatesSatisfied !== 0
    || receipt.gateSummary?.bindingRequired !== 28
    || receipt.gateSummary?.bindingFrozenVerified !== 0
    || receipt.gateSummary?.independentExpertsRequired !== 2
    || receipt.gateSummary?.independentExpertReviewsVerified !== 0
    || receipt.releaseGovernance?.releaseIdentity !== null
    || receipt.releaseGovernance?.targetSchema !== null
    || receipt.releaseGovernance?.migrationId !== null
    || receipt.releaseGovernance?.projectDefaultContext
      ?.inheritedByWesternProductIdentity !== false
    || receipt.observationBoundary?.sourceAndManifestIdentityDriftEstablished !== true
    || receipt.observationBoundary?.sameHeldBufferHashAndParsePerJsonArtifact !== true
    || receipt.observationBoundary?.crossFileAtomicSnapshot !== false
    || receipt.observationBoundary?.mutationEpochReceipt !== null
    || receipt.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || receipt.observationBoundary?.abaExcluded !== false
    || receipt.observationBoundary?.receiptDigestIsDigitalSignature !== false) {
    fail("WESTERN_RECEIPT_PRIVATE_PROJECTION_INVALID", "Western drift receipt 私有品牌或固定投影无效。");
  }
  requireAllFalse(receipt.authorityBoundary, "Western receipt authorityBoundary");
}

function lineageProjection(parent) {
  return {
    parent: artifactBinding(PARENT_V22),
    parentPreservedUnmodified: true,
    parentMechanicallyCurrent: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    parentCurrentVerifierExpectedToFailClosed: false,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    parentStalenessMechanicallyEstablishedFromBoundEndpoints: true,
    uniqueBlockerClaimed: false,
    stalenessReasons: appendOwn(
      captureJson(parent.lineage.stalenessReasons),
      {
        productSystemId: "western-astrology",
        reason: "parent_western_status_predates_current_source_and_manifest_identity_drift_receipt_formal_source_v1_v1_2_chain_and_stale_formal_domain_manifest",
        currentEndpointRole: WESTERN_RECEIPT.role
      }
    )
  };
}

function buildProjection(parent) {
  const child = captureJson(parent);
  setOwn(child, "schemaVersion", "2.3.0");
  setOwn(child, "recordType", RECORD_TYPE);
  setOwn(child, "childId", CHILD_ID);
  setOwn(child, "status", STATUS);
  setOwn(child, "createdAt", CREATED_AT);
  setOwn(child, "activeAdmissionEffect", "none");
  setOwn(child, "artifactBindings", ownArray(
    artifactBinding(PARENT_V22),
    artifactBinding(WESTERN_RECEIPT)
  ));
  setOwn(child, "lineage", lineageProjection(parent));

  const western = child.systems[2];
  setOwn(western, "currentStatus", WESTERN_CURRENT_STATUS);
  setOwn(
    western.currentEvidence,
    "endpoints",
    appendOwn(western.currentEvidence.endpoints, artifactBinding(WESTERN_RECEIPT))
  );
  setOwn(western.currentEvidence, "currentEndpointMechanicallyVerified", true);
  setOwn(western.currentEvidence, "currentFullDomainManifestMechanicallyVerified", false);
  setOwn(western.currentEvidence, "currentEngineeringManifestMechanicallyVerified", false);
  setOwn(western.currentEvidence, "browserRuntimeEvidence", "not_assessed_by_this_child");

  setOwn(child, "observationBoundary", {
    upstreamPrivateBrandsVerified: 2,
    exactPersistedRawIdentitiesVerified: 2,
    sameHeldBufferHashAndParsePerJsonArtifact: true,
    pointInTimeOnly: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false,
    childDigestIsDigitalSignature: false
  });

  setOwn(child, "childDigest", computeFourSystemCurrentStatusObservationChildV23Digest(child));
  return child;
}

function assertSystemBoundaries(candidate) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
    || candidate.systems[0]?.productSystemId !== "bazi"
    || candidate.systems[1]?.productSystemId !== "ziwei-doushu"
    || candidate.systems[2]?.productSystemId !== "western-astrology"
    || candidate.systems[3]?.productSystemId !== "vedic-astrology") {
    fail("SYSTEM_SET_INVALID", "v2.3 必须精确记录四个独立体系及固定顺序。");
  }
  const expectedStatuses = ownArray(
    "current_candidate_drift_receipt_full_domain_manifest_not_current",
    "current_expert_promotion_boundary_identity_drift_receipt_manifest_and_browser_stale",
    WESTERN_CURRENT_STATUS,
    "current_observation_plus_engineering_manifest_plus_isolated_fact_browser_child_no_product_identity"
  );
  const expectedFlags = ownArray(
    ownArray(false, false, "not_assessed_by_this_child"),
    ownArray(
      false,
      false,
      "historical_same_artifact_child_source_graph_stale_no_current_browser_runtime_evidence"
    ),
    ownArray(false, false, "not_assessed_by_this_child"),
    ownArray(
      false,
      true,
      "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
    )
  );
  const expectedBindingRequired = ownArray(12, 27, 28, 38);
  for (let index = 0; index < candidate.systems.length; index += 1) {
    const system = candidate.systems[index];
    const evidence = system.currentEvidence;
    const gates = system.gateSummary;
    const flags = expectedFlags[index];
    if (system.currentStatus !== expectedStatuses[index]
      || evidence?.currentEndpointMechanicallyVerified !== true
      || evidence?.currentFullDomainManifestMechanicallyVerified !== flags[0]
      || evidence?.currentEngineeringManifestMechanicallyVerified !== flags[1]
      || evidence?.browserRuntimeEvidence !== flags[2]
      || evidence?.activeAdmissionEffect !== "none"
      || gates?.admissionGatesRequired !== 8
      || gates?.admissionGatesSatisfied !== 0
      || gates?.bindingRequired !== expectedBindingRequired[index]
      || gates?.bindingFrozenVerified !== 0
      || gates?.independentExpertsRequired !== 2
      || gates?.independentExpertReviewsVerified !== 0
      || gates?.releaseEvidenceComplete !== false
      || system.productBoundary?.migrationId !== null
      || system.productBoundary?.mainApplicationIntegrated !== false
      || system.productBoundary?.baziAuthorityInherited !== false
      || system.productBoundary?.independentSystemBoundaryPreserved !== true) {
      fail("SYSTEM_STATUS_SET_INVALID", `${system.productSystemId} current status 或红灯边界漂移。`);
    }
    requireAllFalse(system.authorityBoundary, `${system.productSystemId} authorityBoundary`);
  }
  const western = candidate.systems[2];
  if (!exactJson(western.currentEvidence.endpoints, ownArray(
    artifactBinding(WESTERN_OBSERVATION_V11),
    artifactBinding(WESTERN_RECEIPT)
  ))
    || western.productBoundary?.releaseIdentity !== null
    || western.productBoundary?.targetSchema !== null) {
    fail("WESTERN_STATUS_PROJECTION_INVALID", "Western 必须保留 v1.1 endpoint 并追加当前 drift receipt 红灯端点。");
  }
}

function assertChildBoundary(candidate, expectedProjection = undefined) {
  requireExactKeys(candidate, ownArray(
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
  ), "current-status v2.3 child");
  if (candidate.schemaVersion !== "2.3.0"
    || candidate.recordType !== RECORD_TYPE
    || candidate.childId !== CHILD_ID
    || candidate.status !== STATUS
    || candidate.createdAt !== CREATED_AT
    || candidate.activeAdmissionEffect !== "none") {
    fail("CHILD_IDENTITY_INVALID", "v2.3 identity 或零准入效力漂移。");
  }
  if (!exactJson(candidate.artifactBindings, ownArray(
    artifactBinding(PARENT_V22),
    artifactBinding(WESTERN_RECEIPT)
  ))) {
    fail("ARTIFACT_BINDING_SET_INVALID", "v2.3 只能直接绑定 v2.2 parent 与 Western receipt。");
  }
  assertSystemBoundaries(candidate);
  requireAllFalse(candidate.authorityBoundary, "v2.3 authorityBoundary");

  const lineage = candidate.lineage;
  if (!exactJson(lineage?.parent, artifactBinding(PARENT_V22))
    || lineage?.parentPreservedUnmodified !== true
    || lineage?.parentMechanicallyCurrent !== true
    || lineage?.parentOverwritten !== false
    || lineage?.parentBacklinkToThisChildPresent !== false
    || lineage?.parentCurrentVerifierExpectedToFailClosed !== false
    || lineage?.parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams !== true
    || lineage?.parentStalenessMechanicallyEstablishedFromBoundEndpoints !== true
    || lineage?.uniqueBlockerClaimed !== false
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [lineage?.stalenessReasons])
    || lineage.stalenessReasons.length !== 2
    || lineage.stalenessReasons[0]?.productSystemId !== "ziwei-doushu"
    || lineage.stalenessReasons[1]?.productSystemId !== "western-astrology"
    || lineage.stalenessReasons[1]?.currentEndpointRole !== WESTERN_RECEIPT.role) {
    fail("LINEAGE_INVALID", "v2.2 parent、既有 Ziwei 与新增 Western staleness lineage 必须精确。");
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
    fail("PROJECT_GOVERNANCE_DRIFT", "legacy-v13 / 13 / null 只能是项目上下文且不得被独立体系继承。");
  }

  const summary = candidate.currentStatusSummary;
  if (!exactJson(summary, {
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
  })) {
    fail("SUMMARY_PROMOTION_FORBIDDEN", "四体系汇总必须保持 4/4 endpoint、0/32 gates 与零准入。");
  }

  const policy = candidate.crossSystemPolicy;
  const policyFalseFields = ownArray(
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
  );
  if (policy?.mode !== "independent_status_observation_only") {
    fail("CROSS_SYSTEM_PROMOTION_FORBIDDEN", "cross-system mode 必须保持独立状态观察。");
  }
  for (let index = 0; index < policyFalseFields.length; index += 1) {
    if (policy?.[policyFalseFields[index]] !== false) {
      fail("CROSS_SYSTEM_PROMOTION_FORBIDDEN", `${policyFalseFields[index]} 必须为 false。`);
    }
  }

  if (candidate.observationBoundary?.upstreamPrivateBrandsVerified !== 2
    || candidate.observationBoundary?.exactPersistedRawIdentitiesVerified !== 2
    || candidate.observationBoundary?.sameHeldBufferHashAndParsePerJsonArtifact !== true
    || candidate.observationBoundary?.pointInTimeOnly !== true
    || candidate.observationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary?.mutationEpochReceipt !== null
    || candidate.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || candidate.observationBoundary?.abaExcluded !== false
    || candidate.observationBoundary?.childDigestIsDigitalSignature !== false) {
    fail("OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN", "v2.3 不得声称跨文件原子、epoch、interval、ABA 或签名闭包。");
  }
  if (!exactJson(candidate.runtimeTrustBoundary, {
    nodeRuntimeIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    hiddenPreloadExcluded: false,
    loaderIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  })) {
    fail("RUNTIME_TRUST_PROMOTION_FORBIDDEN", "runtime trust 边界必须保持全红假设。");
  }
  if (candidate.versionBoundary?.appendOnlyChild !== true
    || candidate.versionBoundary?.persistedAsCentralRegistry !== false
    || candidate.versionBoundary?.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary?.formalAdmissionRegistryModifiedByThisChild !== false
    || candidate.versionBoundary?.existingDomainManifestsModifiedByThisChild !== false
    || candidate.versionBoundary?.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary?.ownerPromotionDecisionReceipt !== null
    || candidate.versionBoundary?.activeAdmissionEffect !== "none") {
    fail("VERSION_PROMOTION_FORBIDDEN", "v2.3 只能是无准入效力且不改 registry/manifest 的 append-only child。");
  }
  if (!exactJson(candidate.evidenceLedgerSeparation, ownArray(
    "engineering_evidence",
    "browser_and_runtime_evidence",
    "content_truth",
    "expert_truth",
    "rights_and_legal_judgment",
    "release_readiness",
    "public_release_authorization"
  ))) {
    fail("EVIDENCE_LEDGER_CONFLATION_FORBIDDEN", "七类证据账必须保持精确分离。");
  }
  if (!REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [candidate.childDigest])
    || computeFourSystemCurrentStatusObservationChildV23Digest(candidate)
      !== candidate.childDigest) {
    fail("CHILD_DIGEST_INVALID", "v2.3 childDigest 无效。");
  }
  if (expectedProjection !== undefined && !exactJson(candidate, expectedProjection)) {
    fail("CURRENT_STATUS_MISMATCH", "v2.3 不等于当前 parent + Western receipt 的精确投影。");
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  assertBindingsFrozen();
  const parent = await loadFourSystemCurrentStatusObservationChildV22(workspaceRoot);
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assertUpstreams(parent, receipt);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V22.path
  );
  assertSnapshot(parentSnapshot, PARENT_V22, "PARENT_V22_RAW_DRIFT");
  const receiptSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_RECEIPT.path
  );
  assertSnapshot(receiptSnapshot, WESTERN_RECEIPT, "WESTERN_RECEIPT_RAW_DRIFT");
  return { parent, receipt };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV23(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  const projection = buildProjection(inputs.parent);
  return deepFreeze(captureJson(assertChildBoundary(projection)));
}

function assertPersistedIdentity(snapshot, persisted) {
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [EXPECTED_PERSISTED.rawBytes])
    || EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.rawSha256])
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.childDigest])) {
    fail("PERSISTED_IDENTITY_UNSET", "v2.3 固定 raw/self identity 尚未冻结。");
  }
  if (snapshot.path !== FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || persisted.childDigest !== EXPECTED_PERSISTED.childDigest) {
    fail("PERSISTED_IDENTITY_DRIFT", "v2.3 固定 raw 或 semantic identity 漂移。");
  }
}

export async function loadFourSystemCurrentStatusObservationChildV23(
  workspaceRoot = process.cwd()
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH
  );
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, parsed);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
      !== serializeFourSystemCurrentStatusObservationChildV23(parsed)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "v2.3 不是唯一 canonical LF materialization。");
  }
  assertChildBoundary(parsed);
  const expected = await buildCurrentFourSystemCurrentStatusObservationChildV23(
    workspaceRoot
  );
  assertChildBoundary(parsed, expected);
  const verified = deepFreeze(captureJson(parsed));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV23(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const fourSystemCurrentStatusObservationChildV23TestOnly = OBJECT_FREEZE({
  CHILD_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  PARENT_V22,
  WESTERN_RECEIPT,
  WESTERN_OBSERVATION_V11,
  WESTERN_CURRENT_STATUS,
  EXPECTED_PERSISTED,
  assertBindingsFrozen,
  assertSnapshot,
  assertUpstreams,
  buildProjection,
  assertChildBoundary,
  assertPersistedIdentity,
  requireExactKeys,
  canonicalStringify,
  captureJson,
  deepFreeze,
  exactJson,
  ownArray,
  appendOwn
});
