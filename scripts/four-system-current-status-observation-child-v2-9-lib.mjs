import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV28Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV28,
  loadFourSystemCurrentStatusObservationChildV28
} from "./four-system-current-status-observation-child-v2-8-lib.mjs";
import {
  BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_V1_1_RELATIVE_PATH,
  computeBaziCurrentMachineIdentitySuccessorV11Digest,
  isVerifiedBaziCurrentMachineIdentitySuccessorV11,
  loadBaziCurrentMachineIdentitySuccessorV11
} from "./bazi-current-machine-identity-successor-v1-1-lib.mjs";
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

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.9.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.9.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_9";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T14:06:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T14:06:10.988Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.9";
const PARENT_BAZI_CURRENT_STATUS =
  "current_machine_identity_successor_full_component_file_set_observed_formal_domain_manifest_not_current_expert_zero_instance";
const BAZI_CURRENT_STATUS =
  "current_machine_identity_successor_v1_1_full_component_file_set_observed_formal_domain_manifest_not_current_expert_zero_instance_time_authority_false";

const PARENT_V28 = OBJECT_FREEZE({
  role:
    "current_direct_predecessor_four_system_current_status_observation_child_v2_8",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_RELATIVE_PATH,
  rawBytes: 19_327,
  rawSha256:
    "3e5181c53fbc8eddc6e57fce7c7c6bfb94a05ae5498c408b52198851f7580dea",
  semanticDigestField: "childDigest",
  semanticDigest:
    "a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792"
});

const PARENT_BAZI_SUCCESSOR_V10_ENDPOINT = OBJECT_FREEZE({
  role: "current_bazi_machine_identity_successor",
  path:
    "content/system-admission/bazi-current-machine-identity-successor.v1.0.0.json",
  rawBytes: 30_801,
  rawSha256:
    "9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d",
  semanticDigestField: "receiptDigest",
  semanticDigest:
    "f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05"
});

const BAZI_SUCCESSOR_V11 = OBJECT_FREEZE({
  role: "current_bazi_machine_identity_successor_v1_1",
  path: BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_V1_1_RELATIVE_PATH,
  rawBytes: 32_806,
  rawSha256:
    "787c5cd5994923805ca37b096be5ae36a94cf5f809c6892ce854e9b193ddff7b",
  semanticDigestField: "receiptDigest",
  semanticDigest:
    "589e7157fb4cd4943ceea7b44d27ed2fc7b32cd6f21b788ca3b59b92973e54bf",
  currentMachineIdentityDigest:
    "58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 19_364,
  rawSha256:
    "3b12caaa35c08bfb685ef713f12b38196c17463116dc3ee7b4e8135a41ed7838",
  childDigest:
    "0406537cf99b025644fb294068d9515c2c0a0ff4a0bf322edcbf39722447b6a1"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV29Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "FourSystemCurrentStatusObservationChildV29Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV29Error(
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
    fail("NON_PASSIVE_OBJECT", "v2.9 不接受 Proxy。");
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
        "v2.9 只接受无 accessor 的被动 JSON 值。"
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
  if (
    REFLECT_APPLY(IS_PROXY, utilTypes, [value])
    || !REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])
  ) {
    fail("UPSTREAM_NOT_DEEP_FROZEN", "upstream 私有品牌未深冻结。");
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
      fail("UPSTREAM_NOT_DEEP_FROZEN", "upstream 含 accessor。");
    }
    assertDeepFrozen(descriptor.value, seen);
  }
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  let nodes = 0;
  let text = 0;

  function encode(current, depth) {
    nodes += 1;
    if (depth > LIMITS.maxDepth || nodes > LIMITS.maxNodes) {
      fail("VALUE_LIMIT_EXCEEDED", "v2.9 JSON 超过固定边界。");
    }
    if (current === null) return "null";
    if (typeof current === "string") {
      text += current.length;
      if (text > LIMITS.maxText) {
        fail("VALUE_LIMIT_EXCEEDED", "v2.9 JSON 文本过长。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (
        !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])
      ) {
        fail("NON_CANONICAL_JSON", "v2.9 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (
      typeof current !== "object"
      || current === null
      || REFLECT_APPLY(IS_PROXY, utilTypes, [current])
    ) {
      fail("NON_CANONICAL_JSON", "v2.9 仅接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v2.9 不接受循环或对象别名。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const descriptors = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
      Object,
      [current]
    );
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]) !== Array.prototype) {
        fail("NON_CANONICAL_JSON", "v2.9 数组原型不合法。");
      }
      const parts = [];
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[NATIVE_STRING(index)];
        if (
          !descriptor
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        ) {
          fail("NON_CANONICAL_JSON", "v2.9 不接受稀疏/accessor 数组。");
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [encode(descriptor.value, depth + 1)]);
      }
      if (ownKeys.length !== current.length + 1) {
        fail("NON_CANONICAL_JSON", "v2.9 数组含额外键。");
      }
      REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
      return "[" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "]";
    }
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("NON_CANONICAL_JSON", "v2.9 对象原型不合法。");
    }
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      const descriptor = descriptors[key];
      if (
        typeof key !== "string"
        || !descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      ) {
        fail("NON_CANONICAL_JSON", "v2.9 对象键不合法。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    const parts = [];
    for (let index = 0; index < keys.length; index += 1) {
      REFLECT_APPLY(ARRAY_PUSH, parts, [
        REFLECT_APPLY(JSON_STRINGIFY, JSON, [keys[index]])
          + ":"
          + encode(descriptors[keys[index]].value, depth + 1)
      ]);
    }
    return "{" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "}";
  }

  return encode(value, 0);
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

export function computeFourSystemCurrentStatusObservationChildV29Digest(value) {
  return sha256Text(
    DIGEST_DOMAIN + "\0" + canonicalStringify(unsignedChild(value))
  );
}

export function serializeFourSystemCurrentStatusObservationChildV29(value) {
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
    fail(code, "v2.9 upstream raw identity 漂移。");
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

function assertParentV28(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV28(parent)) {
    fail(
      "PARENT_V28_BRAND_REQUIRED",
      "必须消费 v2.8 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    parent?.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.8.0"
    || parent?.childDigest !== PARENT_V28.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV28Digest(parent)
      !== PARENT_V28.semanticDigest
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
    || parent?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || parent?.projectReleaseGovernanceContext?.targetSchema !== 13
    || parent?.projectReleaseGovernanceContext?.migrationId !== null
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parent?.systems])
    || parent.systems.length !== 4
  ) {
    fail("PARENT_V28_SEMANTIC_DRIFT", "v2.8 parent 身份或红门语义漂移。");
  }
  requireAllFalse(parent.authorityBoundary, "parent.authorityBoundary");
  const bazi = parent.systems[systemIndex(parent.systems, "bazi")];
  if (
    bazi?.currentStatus !== PARENT_BAZI_CURRENT_STATUS
    || bazi?.currentEvidence?.currentEndpointMechanicallyVerified !== true
    || bazi?.currentEvidence
      ?.currentEngineeringManifestMechanicallyVerified !== false
    || bazi?.currentEvidence
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || !REFLECT_APPLY(
      ARRAY_IS_ARRAY,
      Array,
      [bazi?.currentEvidence?.endpoints]
    )
    || bazi.currentEvidence.endpoints.length !== 1
    || !exactJson(
      bazi.currentEvidence.endpoints[0],
      binding(PARENT_BAZI_SUCCESSOR_V10_ENDPOINT)
    )
    || bazi?.gateSummary?.bindingRequired !== 12
    || bazi?.gateSummary?.bindingFrozenVerified !== 0
    || bazi?.gateSummary?.independentExpertsRequired !== 2
    || bazi?.gateSummary?.independentExpertReviewsVerified !== 0
    || bazi?.productBoundary?.releaseIdentity !== "legacy-v13"
    || bazi?.productBoundary?.targetSchema !== 13
    || bazi?.productBoundary?.migrationId !== null
  ) {
    fail(
      "PARENT_V28_BAZI_DRIFT",
      "v2.8 Bazi v1.0 endpoint/status/全红 baseline 漂移。"
    );
  }
  requireAllFalse(bazi.authorityBoundary, "parent.bazi.authorityBoundary");
}

function assertBaziSuccessorV11(successor) {
  if (!isVerifiedBaziCurrentMachineIdentitySuccessorV11(successor)) {
    fail(
      "BAZI_SUCCESSOR_V11_BRAND_REQUIRED",
      "必须消费 Bazi v1.1 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    successor?.successorId
      !== "hakimi.bazi.current-machine-identity-successor/1.1.0"
    || successor?.recordType !== "bazi_current_machine_identity_successor_v1_1"
    || successor?.status
      !== "append_only_current_machine_identity_observation_successor_no_manifest_or_release_authority"
    || successor?.receiptDigest !== BAZI_SUCCESSOR_V11.semanticDigest
    || computeBaziCurrentMachineIdentitySuccessorV11Digest(successor)
      !== BAZI_SUCCESSOR_V11.semanticDigest
    || successor?.currentMachineIdentity?.currentMachineIdentityDigest
      !== BAZI_SUCCESSOR_V11.currentMachineIdentityDigest
    || successor?.currentMachineIdentity?.orderedUniqueFileIdentityCount !== 28
    || successor?.currentMachineIdentity?.uniqueFileDriftCount !== 1
    || successor?.currentMachineIdentity?.componentDriftCount !== 1
    || successor?.currentParentBindings?.exactCurrentPrivateBrandsVerified !== 2
    || successor?.currentParentBindings?.expertZeroInstanceChild?.childId
      !== "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0"
    || successor?.expertOverlay?.realReviewerInstancesVerified !== 0
    || successor?.expertOverlay?.independentExpertReviewsVerified !== 0
    || successor?.expertOverlay?.includedInCurrentMachineIdentityDigest !== false
    || successor?.gateSummary?.bindingRequired !== 12
    || successor?.gateSummary?.bindingFrozenVerified !== 0
    || successor?.gateSummary?.independentExpertsRequired !== 2
    || successor?.gateSummary?.independentExpertReviewsVerified !== 0
    || successor?.observationBoundary?.persistedAsDomainManifest !== false
    || successor?.observationBoundary?.currentFullDomainManifestEstablished !== false
    || successor?.observationBoundary?.crossFileAtomicSnapshot !== false
    || successor?.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || successor?.observationBoundary?.mutationEpochReceipt !== null
    || successor?.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || successor?.observationBoundary?.abaExcluded !== false
    || successor?.timeBoundary?.createdAtClock !== "untrusted_local_clock_label"
    || successor?.timeBoundary?.trustedTimestampEstablished !== false
    || successor?.timeBoundary?.externalTimeAuthorityEstablished !== false
    || successor?.timeBoundary?.crossArtifactTemporalOrderEstablished !== false
    || successor?.timeBoundary?.predecessorV1CorrectedCreatedAt !== null
    || successor?.lineage?.thisSuccessorReplacesFourSystemStatusEndpoint !== false
    || successor?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || successor?.releaseGovernance?.targetSchema !== 13
    || successor?.releaseGovernance?.migrationId !== null
    || successor?.releaseGovernance?.publicDeploymentAuthorized !== false
    || successor?.releaseGovernance?.expertClaimsAuthorized !== false
  ) {
    fail(
      "BAZI_SUCCESSOR_V11_SEMANTIC_DRIFT",
      "Bazi v1.1 身份、时间边界或全红语义漂移。"
    );
  }
  requireAllFalse(successor.authorityBoundary, "baziV11.authorityBoundary");
}

function baziProjection(parentBazi) {
  const bazi = captureJson(parentBazi);
  const endpoints = captureJson(parentBazi.currentEvidence.endpoints);
  endpoints[0] = binding(BAZI_SUCCESSOR_V11);
  bazi.currentStatus = BAZI_CURRENT_STATUS;
  bazi.currentEvidence.endpoints = endpoints;
  return bazi;
}

function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.9.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [
    binding(PARENT_V28),
    binding(BAZI_SUCCESSOR_V11)
  ];
  const baziIndex = systemIndex(candidate.systems, "bazi");
  candidate.systems[baziIndex] = baziProjection(
    parent.systems[systemIndex(parent.systems, "bazi")]
  );
  candidate.lineage = {
    parent: binding(PARENT_V28),
    baziCurrentMachineIdentitySuccessorV11: binding(BAZI_SUCCESSOR_V11),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    baziSuccessorMechanicallyCurrent: true,
    baziSuccessorPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    baziEndpointReplacedFromV10ToV11: true,
    baziStatusUpdatedForV11: true,
    baziAllOtherSystemFieldsPreservedExact: true,
    childCreatedAtClock: "untrusted_local_clock_label",
    childCreatedAtUpperBoundObservedOnSameUntrustedLocalClock:
      CREATED_AT_UPPER_BOUND,
    trustedTimestampEstablished: false,
    externalTimeAuthorityEstablished: false,
    crossArtifactTemporalOrderEstablished: false,
    otherSystemCanonicalCopiesPreserved: [
      "ziwei-doushu",
      "western-astrology",
      "vedic-astrology"
    ],
    uniqueBlockerClaimed: false
  };
  candidate.childDigest =
    computeFourSystemCurrentStatusObservationChildV29Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (
    !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
  ) {
    fail("SYSTEM_SET_INVALID", "v2.9 必须恰含四体系。");
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
    if (id === "bazi") {
      if (!exactJson(system, baziProjection(parent.systems[parentIndex]))) {
        fail(
          "BAZI_PROJECTION_DRIFT",
          "Bazi 只能把 v1.0 endpoint 原位替换为 v1.1 并更新 status。"
        );
      }
      if (
        system?.currentStatus !== BAZI_CURRENT_STATUS
        || system?.currentEvidence?.endpoints?.length !== 1
        || !exactJson(
          system.currentEvidence.endpoints[0],
          binding(BAZI_SUCCESSOR_V11)
        )
      ) {
        fail("BAZI_ENDPOINT_REPLACEMENT_INVALID", "Bazi v1.1 endpoint 不精确。");
      }
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail(
        "NON_BAZI_PROJECTION_DRIFT",
        id + " 必须是 v2.8 canonical exact copy。"
      );
    }
    const expectedEngineering = id !== "bazi";
    if (
      system?.gateSummary?.admissionGatesSatisfied !== 0
      || system?.gateSummary?.bindingFrozenVerified !== 0
      || system?.gateSummary?.independentExpertReviewsVerified !== 0
      || system?.currentEvidence?.currentEndpointMechanicallyVerified !== true
      || system?.currentEvidence
        ?.currentEngineeringManifestMechanicallyVerified !== expectedEngineering
      || system?.currentEvidence
        ?.currentFullDomainManifestMechanicallyVerified !== false
      || system?.authorityBoundary?.formalAdmissionAuthorized !== false
      || system?.authorityBoundary?.releaseReady !== false
      || system?.authorityBoundary?.publicReleaseAuthorized !== false
      || system?.authorityBoundary?.publicDeploymentAuthorized !== false
    ) {
      fail("SYSTEM_AUTHORITY_PROMOTION", id + " currentness/红门漂移。");
    }
    requireAllFalse(system.authorityBoundary, id + ".authorityBoundary");
  }
}

function assertChildBoundary(
  candidate,
  parent,
  successor,
  expectedProjection = undefined
) {
  if (
    candidate?.schemaVersion !== "2.9.0"
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID
    || candidate?.status !== STATUS
    || candidate?.createdAt !== CREATED_AT
    || !exactJson(
      candidate?.artifactBindings,
      [binding(PARENT_V28), binding(BAZI_SUCCESSOR_V11)]
    )
  ) {
    fail("CHILD_IDENTITY_INVALID", "v2.9 child identity/direct bindings 漂移。");
  }
  assertSystems(candidate, parent);
  assertBaziSuccessorV11(successor);
  if (
    !exactJson(candidate.currentStatusSummary, parent.currentStatusSummary)
    || !exactJson(candidate.authorityBoundary, parent.authorityBoundary)
    || !exactJson(candidate.crossSystemPolicy, parent.crossSystemPolicy)
    || !exactJson(candidate.observationBoundary, parent.observationBoundary)
    || !exactJson(
      candidate.projectReleaseGovernanceContext,
      parent.projectReleaseGovernanceContext
    )
    || !exactJson(
      candidate.evidenceLedgerSeparation,
      parent.evidenceLedgerSeparation
    )
    || !exactJson(candidate.runtimeTrustBoundary, parent.runtimeTrustBoundary)
    || !exactJson(candidate.versionBoundary, parent.versionBoundary)
    || !exactJson(candidate.doesNotEstablish, parent.doesNotEstablish)
    || candidate.activeAdmissionEffect !== "none"
    || candidate.currentStatusSummary.systemsRequired !== 4
    || candidate.currentStatusSummary
      .systemsWithCurrentEndpointMechanicallyVerified !== 4
    || candidate.currentStatusSummary.totalAdmissionGatesRequired !== 32
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
    || candidate.projectReleaseGovernanceContext.publicDeploymentAuthorized
      !== false
    || candidate.projectReleaseGovernanceContext.expertClaimsAuthorized !== false
    || candidate.versionBoundary.persistedAsCentralRegistry !== false
    || candidate.versionBoundary.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .formalAdmissionRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .existingDomainManifestsModifiedByThisChild !== false
    || candidate.versionBoundary.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary.ownerPromotionDecisionReceipt !== null
    || candidate.lineage?.baziEndpointReplacedFromV10ToV11 !== true
    || candidate.lineage?.baziStatusUpdatedForV11 !== true
    || candidate.lineage?.crossArtifactTemporalOrderEstablished !== false
    || candidate.lineage?.trustedTimestampEstablished !== false
    || candidate.lineage?.externalTimeAuthorityEstablished !== false
    || candidate.lineage?.childCreatedAtClock !== "untrusted_local_clock_label"
    || candidate.lineage
      ?.childCreatedAtUpperBoundObservedOnSameUntrustedLocalClock
      !== CREATED_AT_UPPER_BOUND
    || candidate.createdAt >= CREATED_AT_UPPER_BOUND
  ) {
    fail(
      "BOUNDARY_PROMOTION_FORBIDDEN",
      "v2.9 summary/governance/time/authority/epoch/atomic/ABA 必须全红。"
    );
  }
  requireAllFalse(candidate.authorityBoundary, "authorityBoundary");
  if (
    !SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV29Digest(candidate)
      !== candidate.childDigest
  ) {
    fail("CHILD_DIGEST_INVALID", "v2.9 childDigest 无效。");
  }
  if (
    expectedProjection !== undefined
    && !exactJson(candidate, expectedProjection)
  ) {
    fail(
      "CURRENT_STATUS_MISMATCH",
      "v2.9 不等于 v2.8 + Bazi successor v1.1 唯一机械投影。"
    );
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent =
    await loadFourSystemCurrentStatusObservationChildV28(workspaceRoot);
  const successor =
    await loadBaziCurrentMachineIdentitySuccessorV11(workspaceRoot);
  assertDeepFrozen(parent);
  assertDeepFrozen(successor);
  assertParentV28(parent);
  assertBaziSuccessorV11(successor);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V28.path
  );
  const successorSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_SUCCESSOR_V11.path
  );
  assertSnapshot(parentSnapshot, PARENT_V28, "PARENT_V28_RAW_DRIFT");
  assertSnapshot(
    successorSnapshot,
    BAZI_SUCCESSOR_V11,
    "BAZI_SUCCESSOR_V11_RAW_DRIFT"
  );
  if (
    !exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(
      parseBaziDttStrictJsonArtifact(successorSnapshot),
      successor
    )
  ) {
    fail(
      "UPSTREAM_BRAND_RAW_MISMATCH",
      "upstream 私有品牌不等于固定 raw artifact。"
    );
  }
  return { parent, successor };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV29(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent, successor } = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(
    assertChildBoundary(buildProjection(parent), parent, successor)
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
    fail("INVALID_UTF8", "v2.9 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV29(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (
    EXPECTED_PERSISTED.rawBytes <= 0
    || !SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !SHA256.test(EXPECTED_PERSISTED.childDigest)
    || /^0+$/u.test(EXPECTED_PERSISTED.rawSha256)
    || /^0+$/u.test(EXPECTED_PERSISTED.childDigest)
  ) {
    fail("PERSISTED_IDENTITY_UNSET", "v2.9 raw/self identity 尚未冻结。");
  }
  const { parent, successor } = await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(
    assertChildBoundary(buildProjection(parent), parent, successor)
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_RELATIVE_PATH
  );
  assertSnapshot(
    snapshot,
    {
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_RELATIVE_PATH,
      ...EXPECTED_PERSISTED
    },
    "PERSISTED_IDENTITY_DRIFT"
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (
    persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot)
      !== serializeFourSystemCurrentStatusObservationChildV29(persisted)
  ) {
    fail(
      "PERSISTED_MATERIALIZATION_DRIFT",
      "v2.9 raw/self/canonical materialization 漂移。"
    );
  }
  assertChildBoundary(persisted, parent, successor, expected);
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV29(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV29Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV29(value)) {
    fail(
      "CHILD_BRAND_REQUIRED",
      "summary 只接受 v2.9 exact persisted loader 私有品牌。"
    );
  }
  const bazi = value.systems[systemIndex(value.systems, "bazi")];
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    baziStatus: bazi.currentStatus,
    baziEndpointRole: bazi.currentEvidence.endpoints[0].role,
    baziEndpointPath: bazi.currentEvidence.endpoints[0].path,
    baziEndpointReceiptDigest:
      bazi.currentEvidence.endpoints[0].semanticDigest,
    baziCurrentMachineIdentityDigest:
      BAZI_SUCCESSOR_V11.currentMachineIdentityDigest,
    baziCurrentEndpointMechanicallyVerified:
      bazi.currentEvidence.currentEndpointMechanicallyVerified,
    baziCurrentEngineeringManifestMechanicallyVerified:
      bazi.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    baziCurrentFullDomainManifestMechanicallyVerified:
      bazi.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    baziBindingFrozenVerified: bazi.gateSummary.bindingFrozenVerified,
    baziBindingRequired: bazi.gateSummary.bindingRequired,
    baziIndependentExpertReviewsVerified:
      bazi.gateSummary.independentExpertReviewsVerified,
    baziIndependentExpertsRequired:
      bazi.gateSummary.independentExpertsRequired,
    systemsRequired: value.currentStatusSummary.systemsRequired,
    systemsWithCurrentEndpointMechanicallyVerified:
      value.currentStatusSummary.systemsWithCurrentEndpointMechanicallyVerified,
    totalAdmissionGatesSatisfied:
      value.currentStatusSummary.totalAdmissionGatesSatisfied,
    systemsFormallyAdmitted:
      value.currentStatusSummary.systemsFormallyAdmitted,
    systemsDomainAuthorityAuthorized:
      value.currentStatusSummary.systemsDomainAuthorityAuthorized,
    systemsReleaseReady: value.currentStatusSummary.systemsReleaseReady,
    systemsPublicReleaseAuthorized:
      value.currentStatusSummary.systemsPublicReleaseAuthorized,
    allSystemsCurrentFullDomainManifestMechanicallyVerified:
      value.currentStatusSummary
        .allSystemsCurrentFullDomainManifestMechanicallyVerified,
    activeAdmissionEffect: value.activeAdmissionEffect,
    childCreatedAtClock: value.lineage.childCreatedAtClock,
    trustedTimestampEstablished:
      value.lineage.trustedTimestampEstablished,
    externalTimeAuthorityEstablished:
      value.lineage.externalTimeAuthorityEstablished,
    crossArtifactTemporalOrderEstablished:
      value.lineage.crossArtifactTemporalOrderEstablished,
    crossFileAtomicSnapshot:
      value.observationBoundary.crossFileAtomicSnapshot,
    mutationEpochAvailableForSchema13:
      value.observationBoundary.mutationEpochAvailableForSchema13,
    mutationEpochReceipt:
      value.observationBoundary.mutationEpochReceipt,
    intervalMutationExcludedAcrossFiles:
      value.observationBoundary.intervalMutationExcludedAcrossFiles,
    abaExcluded: value.observationBoundary.abaExcluded,
    formalAdmissionAuthorized:
      value.authorityBoundary.formalAdmissionAuthorized,
    domainAuthorityAuthorized:
      value.authorityBoundary.domainAuthorityAuthorized,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized:
      value.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized:
      value.authorityBoundary.publicReleaseAuthorized,
    expertClaimsAuthorized:
      value.authorityBoundary.expertClaimsAuthorized,
    projectDefaultActiveLine:
      value.projectReleaseGovernanceContext.activeLine,
    projectDefaultTargetSchema:
      value.projectReleaseGovernanceContext.targetSchema,
    projectDefaultMigrationId:
      value.projectReleaseGovernanceContext.migrationId,
    baziProductReleaseIdentity: bazi.productBoundary.releaseIdentity,
    baziProductTargetSchema: bazi.productBoundary.targetSchema,
    baziProductMigrationId: bazi.productBoundary.migrationId
  });
}

export const fourSystemCurrentStatusObservationChildV29TestOnly =
  OBJECT_FREEZE({
    CHILD_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    CREATED_AT_UPPER_BOUND,
    DIGEST_DOMAIN,
    PARENT_BAZI_CURRENT_STATUS,
    BAZI_CURRENT_STATUS,
    PARENT_V28,
    PARENT_BAZI_SUCCESSOR_V10_ENDPOINT,
    BAZI_SUCCESSOR_V11,
    EXPECTED_PERSISTED,
    canonicalStringify,
    captureJson,
    deepFreeze,
    assertDeepFrozen,
    assertParentV28,
    assertBaziSuccessorV11,
    baziProjection,
    buildProjection,
    assertSystems,
    assertChildBoundary
  });
