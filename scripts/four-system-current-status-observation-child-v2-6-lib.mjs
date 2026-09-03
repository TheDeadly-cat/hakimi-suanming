import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV25Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV25,
  loadFourSystemCurrentStatusObservationChildV25
} from "./four-system-current-status-observation-child-v2-5-lib.mjs";
import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  computeWesternIndependentEngineeringManifestV2Digest,
  isVerifiedWesternIndependentEngineeringManifestV2,
  loadWesternIndependentEngineeringManifestV2
} from "./western-independent-engineering-manifest-v2-lib.mjs";
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

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.6.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.6.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_6";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T10:24:11.544Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.6";
const WESTERN_CURRENT_STATUS =
  "current_three_selected_package_roots_machine_identity_manifest_plus_source_and_manifest_drift_receipt_formal_source_and_historical_domain_manifest_stale";
const WESTERN_BROWSER_RUNTIME_EVIDENCE = "not_assessed_by_this_child";

const PARENT_V25 = OBJECT_FREEZE({
  role:
    "current_direct_predecessor_four_system_current_status_observation_child_v2_5",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_RELATIVE_PATH,
  rawBytes: 17_970,
  rawSha256:
    "020ce7b2affa18fa25483ffbded8400ef4bb5151e822fee17d68f33afb610ec2",
  semanticDigestField: "childDigest",
  semanticDigest:
    "183253a83af0029a525eefe95207e4b4ad39d7febcc00c5c317bbaa5e837cdbc"
});

const WESTERN_MANIFEST_V2 = OBJECT_FREEZE({
  role:
    "current_western_three_selected_package_roots_machine_identity_manifest_v2",
  path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  rawBytes: 72_472,
  rawSha256:
    "a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27",
  semanticDigestField: "manifestDigest",
  semanticDigest:
    "4ed66eeae3d0f7a45dcb850a67dfb6407b695a2f6ecb58eac8b0dd1748db632d"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 18_673,
  rawSha256:
    "7e82402069b9a761cd23a8d428b74f389754bd1e30654428fc5bd965bdf57dd5",
  childDigest:
    "72f9cb10f46025662730bd2a4d12c1d7ec8796109350358c815a97c492b07ee7"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV26Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "FourSystemCurrentStatusObservationChildV26Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV26Error(
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
    fail("NON_PASSIVE_OBJECT", "v2.6 不接受 Proxy。");
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
        "v2.6 只接受无 accessor 的被动 JSON 值。"
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
      fail("VALUE_LIMIT_EXCEEDED", "v2.6 JSON 超过固定边界。");
    }
    if (current === null) return "null";
    if (typeof current === "string") {
      const encoded = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      state.text += encoded.length;
      if (state.text > LIMITS.maxText) {
        fail("VALUE_LIMIT_EXCEEDED", "v2.6 JSON 文本过长。");
      }
      return encoded;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (
        !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])
      ) {
        fail("NON_CANONICAL_JSON", "v2.6 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (
      typeof current !== "object"
      || REFLECT_APPLY(IS_PROXY, utilTypes, [current])
    ) {
      fail("NON_CANONICAL_JSON", "v2.6 仅接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v2.6 不接受循环或别名。");
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
        fail("NON_CANONICAL_JSON", "v2.6 数组键不合法。");
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
            "v2.6 不接受稀疏/accessor 数组。"
          );
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [
          visit(descriptor.value, depth + 1)
        ]);
      }
      return "[" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "]";
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "v2.6 对象原型不合法。");
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
        fail("NON_CANONICAL_JSON", "v2.6 对象键不合法。");
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

export function computeFourSystemCurrentStatusObservationChildV26Digest(value) {
  return sha256Text(
    DIGEST_DOMAIN + "\0" + canonicalStringify(unsignedChild(value))
  );
}

export function serializeFourSystemCurrentStatusObservationChildV26(value) {
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
    fail(code, "v2.6 upstream raw identity 漂移。");
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

function assertParentV25(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV25(parent)) {
    fail(
      "PARENT_V25_BRAND_REQUIRED",
      "必须消费 v2.5 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    parent?.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.5.0"
    || parent?.childDigest !== PARENT_V25.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV25Digest(parent)
      !== PARENT_V25.semanticDigest
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
      "PARENT_V25_SEMANTIC_DRIFT",
      "v2.5 parent 身份或红门语义漂移。"
    );
  }
  requireAllFalse(parent.authorityBoundary, "parent.authorityBoundary");
  const western =
    parent.systems[systemIndex(parent.systems, "western-astrology")];
  if (
    western?.currentStatus
      !== "current_source_and_manifest_identity_drift_receipt_formal_source_v1_v1_2_chain_and_formal_domain_manifest_stale"
    || western?.currentEvidence?.browserRuntimeEvidence
      !== WESTERN_BROWSER_RUNTIME_EVIDENCE
    || western?.currentEvidence
      ?.currentEndpointMechanicallyVerified !== true
    || western?.currentEvidence
      ?.currentEngineeringManifestMechanicallyVerified !== false
    || western?.currentEvidence
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || !REFLECT_APPLY(
      ARRAY_IS_ARRAY,
      Array,
      [western?.currentEvidence?.endpoints]
    )
    || western.currentEvidence.endpoints.length !== 2
  ) {
    fail(
      "PARENT_V25_WESTERN_DRIFT",
      "v2.5 Western current drift baseline 漂移。"
    );
  }
}

function assertWesternManifestV2(verified) {
  if (!isVerifiedWesternIndependentEngineeringManifestV2(verified)) {
    fail(
      "WESTERN_MANIFEST_V2_BRAND_REQUIRED",
      "必须消费 Western Manifest v2 fixed-path full-loader 私有品牌。"
    );
  }
  const manifest = verified?.manifest;
  const artifact = verified?.artifact;
  if (
    artifact?.path !== WESTERN_MANIFEST_V2.path
    || artifact?.rawBytes !== WESTERN_MANIFEST_V2.rawBytes
    || artifact?.rawSha256 !== WESTERN_MANIFEST_V2.rawSha256
    || manifest?.manifestId
      !== "hakimi.western-astrology.three-package-authored-machine-identity-manifest/2.0.0"
    || manifest?.manifestDigest !== WESTERN_MANIFEST_V2.semanticDigest
    || computeWesternIndependentEngineeringManifestV2Digest(manifest)
      !== WESTERN_MANIFEST_V2.semanticDigest
    || manifest?.schemaVersion !== "2.0.0"
    || manifest?.recordType
      !== "western_three_package_authored_machine_identity_manifest"
    || manifest?.activeAdmissionEffect !== "none"
    || manifest?.threePackageAuthoredFileClosure
      ?.scopeClass
      !== "three_selected_package_roots_exact_not_entire_western_engineering_closure"
    || manifest?.threePackageAuthoredFileClosure
      ?.threeSelectedPackageRootsExact !== true
    || manifest?.threePackageAuthoredFileClosure
      ?.entireWesternEngineeringClosureEstablished !== false
    || manifest?.threePackageAuthoredFileClosure
      ?.packageRootCount !== 3
    || manifest?.threePackageAuthoredFileClosure
      ?.observedUniquePhysicalPaths !== 70
    || manifest?.componentAccounting?.componentCount !== 9
    || manifest?.componentAccounting?.componentFileReferences !== 152
    || manifest?.componentAccounting?.uniquePhysicalPaths !== 70
    || manifest?.componentClassificationBoundary
      ?.pathNameHeuristicRoutingOnly !== true
    || manifest?.componentClassificationBoundary
      ?.componentReferenceFanoutEqualsIndependentSemanticChanges !== false
    || manifest?.componentClassificationBoundary
      ?.componentMembershipEstablishesDomainTruth !== false
    || manifest?.currentnessBoundary
      ?.currentThreePackageAuthoredMachineIdentityManifestMechanicallyVerified
      !== true
    || manifest?.currentnessBoundary
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest?.currentnessBoundary
      ?.browserRuntimeEvidenceEstablished !== false
    || manifest?.currentnessBoundary
      ?.entireWesternEngineeringClosureEstablished !== false
    || manifest?.currentnessBoundary?.productIdentityEstablished !== false
    || manifest?.productBoundary?.productIdentity !== null
    || manifest?.productBoundary?.releaseIdentity !== null
    || manifest?.productBoundary?.targetSchema !== null
    || manifest?.productBoundary?.migrationId !== null
    || manifest?.productBoundary?.mainApplicationIntegrated !== false
    || manifest?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || manifest?.projectReleaseGovernanceContext?.targetSchema !== 13
    || manifest?.projectReleaseGovernanceContext?.migrationId !== null
    || manifest?.projectReleaseGovernanceContext
      ?.inheritedByWesternProductIdentity !== false
    || manifest?.gateState?.admissionGatesRequired !== 8
    || manifest?.gateState?.admissionGatesSatisfied !== 0
    || manifest?.gateState?.bindingRequired !== 28
    || manifest?.gateState?.bindingFrozenVerified !== 0
    || manifest?.gateState?.independentExpertsRequired !== 2
    || manifest?.gateState?.independentExpertReviewsVerified !== 0
    || manifest?.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest?.observationBoundary?.mutationEpochAvailable !== false
    || manifest?.observationBoundary?.mutationEpochReceipt !== null
    || manifest?.observationBoundary
      ?.intervalMutationExcludedAcrossFiles !== false
    || manifest?.observationBoundary?.abaExcluded !== false
    || manifest?.observationBoundary
      ?.manifestDigestIsDigitalSignature !== false
  ) {
    fail(
      "WESTERN_MANIFEST_V2_SEMANTIC_DRIFT",
      "Western Manifest v2 machine identity/scope/authority 红门漂移。"
    );
  }
  requireAllFalse(
    manifest.authorityBoundary,
    "westernManifestV2.authorityBoundary"
  );
}

function westernProjection(parentWestern) {
  const western = captureJson(parentWestern);
  western.currentStatus = WESTERN_CURRENT_STATUS;
  western.currentEvidence.currentEngineeringManifestMechanicallyVerified =
    true;
  western.currentEvidence.currentFullDomainManifestMechanicallyVerified =
    false;
  western.currentEvidence.browserRuntimeEvidence =
    WESTERN_BROWSER_RUNTIME_EVIDENCE;
  const endpoints = captureJson(parentWestern.currentEvidence.endpoints);
  REFLECT_APPLY(ARRAY_PUSH, endpoints, [binding(WESTERN_MANIFEST_V2)]);
  western.currentEvidence.endpoints = endpoints;
  return western;
}

function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.6.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [
    binding(PARENT_V25),
    binding(WESTERN_MANIFEST_V2)
  ];
  const westernIndex = systemIndex(candidate.systems, "western-astrology");
  candidate.systems[westernIndex] = westernProjection(
    parent.systems[
      systemIndex(parent.systems, "western-astrology")
    ]
  );
  candidate.lineage = {
    parent: binding(PARENT_V25),
    westernEngineeringManifest: binding(WESTERN_MANIFEST_V2),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    westernEngineeringManifestMechanicallyCurrent: true,
    westernEngineeringManifestPrivateBrandLoaderRecursivelyReverifiedItsUpstreams:
      true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    westernManifestEndpointAppended: true,
    westernCurrentEngineeringManifestFlagRaised: true,
    westernCurrentFullDomainManifestFlagRemainsFalse: true,
    westernBrowserRuntimeEvidenceUnchangedAndNotAssessed: true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "ziwei-doushu",
      "vedic-astrology"
    ],
    uniqueBlockerClaimed: false
  };
  candidate.childDigest =
    computeFourSystemCurrentStatusObservationChildV26Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (
    !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
  ) {
    fail("SYSTEM_SET_INVALID", "v2.6 必须恰含四体系。");
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
    if (id === "western-astrology") {
      if (!exactJson(
        system,
        westernProjection(parent.systems[parentIndex])
      )) {
        fail(
          "WESTERN_PROJECTION_DRIFT",
          "Western 只能追加 Manifest endpoint 并提升 selected-roots engineering flag。"
        );
      }
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail(
        "NON_WESTERN_PROJECTION_DRIFT",
        id + " 必须是 v2.5 canonical exact copy。"
      );
    }
    const expectedEngineering =
      id === "western-astrology" || id === "vedic-astrology";
    if (
      system?.gateSummary?.admissionGatesSatisfied !== 0
      || system?.gateSummary?.bindingFrozenVerified !== 0
      || system?.gateSummary?.independentExpertReviewsVerified !== 0
      || system?.currentEvidence
        ?.currentEngineeringManifestMechanicallyVerified
        !== expectedEngineering
      || system?.currentEvidence
        ?.currentFullDomainManifestMechanicallyVerified !== false
      || system?.authorityBoundary?.formalAdmissionAuthorized !== false
      || system?.authorityBoundary?.releaseReady !== false
      || system?.authorityBoundary?.publicReleaseAuthorized !== false
      || system?.authorityBoundary?.publicDeploymentAuthorized !== false
    ) {
      fail(
        "SYSTEM_AUTHORITY_PROMOTION",
        id + " currentness/zero gates/authority 漂移。"
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
  westernManifest,
  expectedProjection = undefined
) {
  if (
    candidate?.schemaVersion !== "2.6.0"
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID
    || candidate?.status !== STATUS
    || candidate?.createdAt !== CREATED_AT
    || !exactJson(
      candidate?.artifactBindings,
      [binding(PARENT_V25), binding(WESTERN_MANIFEST_V2)]
    )
  ) {
    fail(
      "CHILD_IDENTITY_INVALID",
      "v2.6 child identity 或 direct bindings 漂移。"
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
      parent.doesNotEstablish
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
      "v2.6 summary/governance/authority/epoch/atomic/ABA 必须 exact copy 且全红。"
    );
  }
  requireAllFalse(candidate.authorityBoundary, "authorityBoundary");
  assertWesternManifestV2(westernManifest);
  if (
    !SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV26Digest(candidate)
      !== candidate.childDigest
  ) {
    fail("CHILD_DIGEST_INVALID", "v2.6 childDigest 无效。");
  }
  if (
    expectedProjection !== undefined
    && !exactJson(candidate, expectedProjection)
  ) {
    fail(
      "CURRENT_STATUS_MISMATCH",
      "v2.6 不等于 v2.5 + Western Manifest v2 当前唯一投影。"
    );
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent =
    await loadFourSystemCurrentStatusObservationChildV25(workspaceRoot);
  const westernManifest =
    await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  assertDeepFrozen(parent);
  assertDeepFrozen(westernManifest);
  assertParentV25(parent);
  assertWesternManifestV2(westernManifest);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V25.path
  );
  const westernSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_MANIFEST_V2.path
  );
  assertSnapshot(parentSnapshot, PARENT_V25, "PARENT_V25_RAW_DRIFT");
  assertSnapshot(
    westernSnapshot,
    WESTERN_MANIFEST_V2,
    "WESTERN_MANIFEST_V2_RAW_DRIFT"
  );
  if (
    !exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(
      parseBaziDttStrictJsonArtifact(westernSnapshot),
      westernManifest.manifest
    )
  ) {
    fail(
      "UPSTREAM_BRAND_RAW_MISMATCH",
      "upstream 私有品牌不等于固定 raw artifact。"
    );
  }
  return { parent, westernManifest };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV26(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent, westernManifest } =
    await collectCurrentInputs(workspaceRoot);
  return deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      westernManifest
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
    fail("INVALID_UTF8", "v2.6 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV26(
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
      "v2.6 raw/self identity 尚未冻结。"
    );
  }
  const { parent, westernManifest } =
    await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      westernManifest
    )
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_RELATIVE_PATH
  );
  assertSnapshot(
    snapshot,
    {
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_RELATIVE_PATH,
      ...EXPECTED_PERSISTED
    },
    "PERSISTED_IDENTITY_DRIFT"
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (
    persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot)
      !== serializeFourSystemCurrentStatusObservationChildV26(persisted)
  ) {
    fail(
      "PERSISTED_MATERIALIZATION_DRIFT",
      "v2.6 raw/self/canonical materialization 漂移。"
    );
  }
  assertChildBoundary(
    persisted,
    parent,
    westernManifest,
    expected
  );
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV26(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV26Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV26(value)) {
    fail(
      "CHILD_BRAND_REQUIRED",
      "summary 只接受 v2.6 exact persisted loader 私有品牌。"
    );
  }
  const western =
    value.systems[systemIndex(value.systems, "western-astrology")];
  const endpointRoles = [];
  for (
    let index = 0;
    index < western.currentEvidence.endpoints.length;
    index += 1
  ) {
    REFLECT_APPLY(ARRAY_PUSH, endpointRoles, [
      western.currentEvidence.endpoints[index].role
    ]);
  }
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    westernStatus: western.currentStatus,
    westernBrowserRuntimeEvidence:
      western.currentEvidence.browserRuntimeEvidence,
    westernEndpointRoles: endpointRoles,
    westernCurrentEngineeringManifestMechanicallyVerified:
      western.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    westernCurrentFullDomainManifestMechanicallyVerified:
      western.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    westernManifestScope:
      "three_selected_package_roots_exact_not_entire_western_engineering_closure",
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

export const fourSystemCurrentStatusObservationChildV26TestOnly =
  OBJECT_FREEZE({
    CHILD_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    WESTERN_CURRENT_STATUS,
    WESTERN_BROWSER_RUNTIME_EVIDENCE,
    PARENT_V25,
    WESTERN_MANIFEST_V2,
    EXPECTED_PERSISTED,
    canonicalStringify,
    captureJson,
    deepFreeze,
    assertDeepFrozen,
    assertParentV25,
    assertWesternManifestV2,
    westernProjection,
    buildProjection,
    assertSystems,
    assertChildBoundary
  });
