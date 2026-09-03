import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV27Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV27,
  loadFourSystemCurrentStatusObservationChildV27
} from "./four-system-current-status-observation-child-v2-7-lib.mjs";
import {
  ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  getZiweiIndependentEngineeringManifestV3Summary,
  isVerifiedZiweiIndependentEngineeringManifestV3,
  loadZiweiIndependentEngineeringManifestV3
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";
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

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.8.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.8.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_8";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T11:54:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.8";
const PARENT_ZIWEI_CURRENT_STATUS =
  "current_expert_promotion_boundary_identity_drift_receipt_plus_current_isolated_same_artifact_browser_child_formal_manifest_stale";
const ZIWEI_CURRENT_STATUS =
  "current_expert_promotion_boundary_identity_drift_receipt_plus_current_isolated_same_artifact_browser_child_plus_current_selected_path_engineering_manifest_full_domain_false";
const ZIWEI_BROWSER_RUNTIME_EVIDENCE =
  "isolated_same_artifact_edge_chrome_28_of_28_current_source_graph_not_web_pwa_or_product_runtime";

const PARENT_V27 = OBJECT_FREEZE({
  role:
    "current_direct_predecessor_four_system_current_status_observation_child_v2_7",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_RELATIVE_PATH,
  rawBytes: 18_697,
  rawSha256:
    "93e4b0487974d6b4b11312eaec7ee4e759a3af603e67389891bba31a42df4307",
  semanticDigestField: "childDigest",
  semanticDigest:
    "2dde1ccaf92d3437da13dc0ebcd2153fa11724b0be5bfed832ba519b9d5b9637"
});

const ZIWEI_MANIFEST_V3 = OBJECT_FREEZE({
  role: "current_ziwei_selected_path_engineering_manifest_v3",
  path: ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  rawBytes: 68_696,
  rawSha256:
    "6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396",
  semanticDigestField: "manifestDigest",
  semanticDigest:
    "7018bf1df4bec8f6c753a11f72bcb2f3f2d63f3d46b194ef27fc2991dd06cb60"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 19_327,
  rawSha256:
    "3e5181c53fbc8eddc6e57fce7c7c6bfb94a05ae5498c408b52198851f7580dea",
  childDigest:
    "a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV28Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "FourSystemCurrentStatusObservationChildV28Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV28Error(
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
    fail("NON_PASSIVE_OBJECT", "v2.8 不接受 Proxy。");
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
        "v2.8 只接受无 accessor 的被动 JSON 值。"
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
      fail("VALUE_LIMIT_EXCEEDED", "v2.8 JSON 超过固定边界。");
    }
    if (current === null) return "null";
    if (typeof current === "string") {
      const encoded = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      state.text += encoded.length;
      if (state.text > LIMITS.maxText) {
        fail("VALUE_LIMIT_EXCEEDED", "v2.8 JSON 文本过长。");
      }
      return encoded;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (
        !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])
      ) {
        fail("NON_CANONICAL_JSON", "v2.8 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (
      typeof current !== "object"
      || REFLECT_APPLY(IS_PROXY, utilTypes, [current])
    ) {
      fail("NON_CANONICAL_JSON", "v2.8 仅接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v2.8 不接受循环或别名。");
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
        fail("NON_CANONICAL_JSON", "v2.8 数组键不合法。");
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
            "v2.8 不接受稀疏/accessor 数组。"
          );
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [
          visit(descriptor.value, depth + 1)
        ]);
      }
      return "[" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "]";
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "v2.8 对象原型不合法。");
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
        fail("NON_CANONICAL_JSON", "v2.8 对象键不合法。");
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

export function computeFourSystemCurrentStatusObservationChildV28Digest(value) {
  return sha256Text(
    DIGEST_DOMAIN + "\0" + canonicalStringify(unsignedChild(value))
  );
}

export function serializeFourSystemCurrentStatusObservationChildV28(value) {
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
    fail(code, "v2.8 upstream raw identity 漂移。");
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

function assertParentV27(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV27(parent)) {
    fail(
      "PARENT_V27_BRAND_REQUIRED",
      "必须消费 v2.7 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    parent?.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.7.0"
    || parent?.childDigest !== PARENT_V27.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV27Digest(parent)
      !== PARENT_V27.semanticDigest
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
      "PARENT_V27_SEMANTIC_DRIFT",
      "v2.7 parent 身份或红门语义漂移。"
    );
  }
  requireAllFalse(parent.authorityBoundary, "parent.authorityBoundary");
  const ziwei =
    parent.systems[systemIndex(parent.systems, "ziwei-doushu")];
  if (
    ziwei?.currentStatus
      !== PARENT_ZIWEI_CURRENT_STATUS
    || ziwei?.currentEvidence?.browserRuntimeEvidence
      !== ZIWEI_BROWSER_RUNTIME_EVIDENCE
    || ziwei?.currentEvidence
      ?.currentEndpointMechanicallyVerified !== true
    || ziwei?.currentEvidence
      ?.currentEngineeringManifestMechanicallyVerified !== false
    || ziwei?.currentEvidence
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || !REFLECT_APPLY(
      ARRAY_IS_ARRAY,
      Array,
      [ziwei?.currentEvidence?.endpoints]
    )
    || ziwei.currentEvidence.endpoints.length !== 2
    || ziwei?.productBoundary?.baziAuthorityInherited !== false
    || ziwei?.productBoundary?.releaseIdentity !== null
    || ziwei?.productBoundary?.targetSchema !== null
    || ziwei?.productBoundary?.migrationId !== null
  ) {
    fail(
      "PARENT_V27_ZIWEI_DRIFT",
      "v2.7 Ziwei receipt+browser、engineering false、full-domain false baseline 漂移。"
    );
  }
}

function assertZiweiManifestV3(verified) {
  if (!isVerifiedZiweiIndependentEngineeringManifestV3(verified)) {
    fail(
      "ZIWEI_MANIFEST_V3_BRAND_REQUIRED",
      "必须消费 Ziwei Manifest v3 fixed-path full-loader 私有品牌。"
    );
  }
  const summary = getZiweiIndependentEngineeringManifestV3Summary(verified);
  const manifest = verified?.manifest;
  const artifact = verified?.artifact;
  if (
    ZIWEI_MANIFEST_V3.rawBytes <= 0
    || !SHA256.test(ZIWEI_MANIFEST_V3.rawSha256)
    || /^0+$/u.test(ZIWEI_MANIFEST_V3.rawSha256)
    || !SHA256.test(ZIWEI_MANIFEST_V3.semanticDigest)
    || /^0+$/u.test(ZIWEI_MANIFEST_V3.semanticDigest)
    || artifact?.path !== ZIWEI_MANIFEST_V3.path
    || artifact?.bytes !== ZIWEI_MANIFEST_V3.rawBytes
    || artifact?.sha256 !== ZIWEI_MANIFEST_V3.rawSha256
    || manifest?.manifestId
      !== "hakimi.ziwei-doushu.definition-and-browser-child-selected-path-machine-identity-manifest/3.0.0"
    || manifest?.recordType
      !== "ziwei_definition_and_browser_child_selected_path_machine_identity_manifest_v3"
    || manifest?.schemaVersion !== "3.0.0"
    || manifest?.manifestDigest !== ZIWEI_MANIFEST_V3.semanticDigest
    || summary?.manifestDigest !== ZIWEI_MANIFEST_V3.semanticDigest
    || manifest?.activeAdmissionEffect !== "none"
    || manifest?.componentAccounting?.componentCount !== 9
    || manifest?.componentAccounting?.componentFileReferences !== 59
    || manifest?.componentAccounting?.mappedUniquePhysicalPaths !== 46
    || manifest?.componentAccounting?.engineeringAttachmentPaths !== 30
    || manifest?.componentAccounting?.selectedUniquePhysicalPaths !== 76
    || manifest?.selectedClosure?.definitionDeclaredComponentFileReferences !== 59
    || manifest?.selectedClosure?.definitionDeclaredUniquePaths !== 46
    || manifest?.selectedClosure?.browserChildDeclaredAuthoredBuildPaths !== 50
    || manifest?.selectedClosure?.overlapBetweenDeclaredSets !== 20
    || manifest?.selectedClosure?.selectedUniquePhysicalPaths !== 76
    || manifest?.selectedClosure?.recursiveDirectoryEnumerationPerformed !== false
    || manifest?.selectedClosure?.extraFileAbsenceEstablished !== false
    || manifest?.selectedClosure?.entireZiweiEngineeringClosureEstablished !== false
    || manifest?.scopeOmissions?.knownOmittedNonRuntimePathsAtAuthoringTotal !== 33
    || manifest?.scopeOmissions?.omissionListsMechanicallyReverifiedByThisLoader !== false
    || manifest?.browserEvidenceBoundary
      ?.browserRuntimeEvidenceEstablishedByThisManifest !== false
    || manifest?.browserEvidenceBoundary?.runtimeObservationRerunByThisManifest !== false
    || manifest?.browserEvidenceBoundary?.childIssuanceTotalPassedScenarioOutcomes !== 28
    || manifest?.browserEvidenceBoundary
      ?.productionBrowserRuntimeEvidenceEstablished !== false
    || manifest?.browserEvidenceBoundary?.pwaOrServiceWorkerValidated !== false
    || manifest?.browserEvidenceBoundary?.publicHostValidated !== false
    || manifest?.runtimeTrustBoundary
      ?.visibleCliLoaderInjectionRejectedBySelectedIdentity !== false
    || REFLECT_APPLY(
      OBJECT_HAS_OWN,
      Object,
      [
        manifest?.runtimeTrustBoundary,
        "visibleCliLoaderInjectionRejected"
      ]
    )
    || manifest?.gateState?.admissionGatesRequired !== 8
    || manifest?.gateState?.admissionGatesSatisfied !== 0
    || manifest?.gateState?.bindingRequired !== 27
    || manifest?.gateState?.bindingFrozenVerified !== 0
    || manifest?.gateState?.independentExpertsRequired !== 2
    || manifest?.gateState?.independentExpertReviewsVerified !== 0
    || manifest?.productBoundary?.productIdentity !== null
    || manifest?.productBoundary?.releaseIdentity !== null
    || manifest?.productBoundary?.targetSchema !== null
    || manifest?.productBoundary?.migrationId !== null
    || manifest?.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false
    || manifest?.projectDefaultReleaseGovernance?.activeLine !== "legacy-v13"
    || manifest?.projectDefaultReleaseGovernance?.targetSchema !== 13
    || manifest?.projectDefaultReleaseGovernance?.migrationId !== null
    || manifest?.versionBoundary
      ?.currentEngineeringManifestMechanicallyVerified !== true
    || manifest?.versionBoundary
      ?.currentSelectedPathManifestMechanicallyVerified !== true
    || manifest?.versionBoundary
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest?.versionBoundary
      ?.entireZiweiEngineeringClosureEstablished !== false
    || manifest?.versionBoundary?.productIdentityEstablished !== false
    || manifest?.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest?.observationBoundary
      ?.intervalMutationExcludedAcrossFiles !== false
    || manifest?.observationBoundary?.abaExcluded !== false
    || manifest?.observationBoundary
      ?.mutationEpochAvailableForProduct !== false
    || manifest?.observationBoundary?.mutationEpochReceipt !== null
    || manifest?.authorityBoundary?.formalAdmissionAuthorized !== false
    || manifest?.authorityBoundary?.releaseReady !== false
    || manifest?.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest?.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest?.authorityBoundary?.expertClaimsAuthorized !== false
  ) {
    fail(
      "ZIWEI_MANIFEST_V3_SEMANTIC_DRIFT",
      "Ziwei Manifest v3 selected-path currentness 或治理红门漂移。"
    );
  }
  requireAllFalse(
    manifest.authorityBoundary,
    "ziweiManifestV3.authorityBoundary"
  );
}

function ziweiProjection(parentZiwei) {
  const ziwei = captureJson(parentZiwei);
  const endpoints = captureJson(parentZiwei.currentEvidence.endpoints);
  REFLECT_APPLY(ARRAY_PUSH, endpoints, [binding(ZIWEI_MANIFEST_V3)]);
  ziwei.currentStatus = ZIWEI_CURRENT_STATUS;
  ziwei.currentEvidence.endpoints = endpoints;
  ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  return ziwei;
}
function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.8.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [
    binding(PARENT_V27),
    binding(ZIWEI_MANIFEST_V3)
  ];
  const ziweiIndex = systemIndex(candidate.systems, "ziwei-doushu");
  candidate.systems[ziweiIndex] = ziweiProjection(
    parent.systems[
      systemIndex(parent.systems, "ziwei-doushu")
    ]
  );
  candidate.lineage = {
    parent: binding(PARENT_V27),
    ziweiEngineeringManifest: binding(ZIWEI_MANIFEST_V3),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    ziweiEngineeringManifestMechanicallyCurrent: true,
    ziweiEngineeringManifestPrivateBrandLoaderRecursivelyReverifiedItsUpstreams:
      true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    ziweiManifestEndpointAppendedAfterExistingReceiptAndBrowserEndpoints: true,
    ziweiExistingReceiptEndpointPreservedExact: true,
    ziweiExistingBrowserEndpointPreservedExact: true,
    ziweiCurrentEngineeringManifestFlagChangedFromFalseToTrue: true,
    ziweiCurrentFullDomainManifestFlagRemainsFalse: true,
    ziweiBrowserRuntimeEvidenceUnchangedAtIsolatedSameArtifact28Of28: true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "western-astrology",
      "vedic-astrology"
    ],
    uniqueBlockerClaimed: false
  };
  candidate.childDigest =
    computeFourSystemCurrentStatusObservationChildV28Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (
    !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
  ) {
    fail("SYSTEM_SET_INVALID", "v2.8 必须恰含四体系。");
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
      const expectedZiwei = ziweiProjection(parent.systems[parentIndex]);
      if (!exactJson(system, expectedZiwei)) {
        fail(
          "ZIWEI_PROJECTION_DRIFT",
          "Ziwei 只允许保留 receipt/browser 两端点并末尾追加 v3，同时 engineering false→true；其他字段必须 exact。"
        );
      }
      if (
        system?.currentStatus !== ZIWEI_CURRENT_STATUS
        || system?.currentEvidence?.browserRuntimeEvidence
          !== ZIWEI_BROWSER_RUNTIME_EVIDENCE
        || system?.currentEvidence
          ?.currentEngineeringManifestMechanicallyVerified !== true
        || system?.currentEvidence
          ?.currentFullDomainManifestMechanicallyVerified !== false
        || system?.currentEvidence?.endpoints?.length !== 3
        || !exactJson(
          system.currentEvidence.endpoints[0],
          parent.systems[parentIndex].currentEvidence.endpoints[0]
        )
        || !exactJson(
          system.currentEvidence.endpoints[1],
          parent.systems[parentIndex].currentEvidence.endpoints[1]
        )
        || !exactJson(
          system.currentEvidence.endpoints[2],
          binding(ZIWEI_MANIFEST_V3)
        )
      ) {
        fail(
          "ZIWEI_ENDPOINT_APPEND_INVALID",
          "Ziwei receipt/browser 必须原序 exact 保留，v3 只能作为第三端点追加。"
        );
      }
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail(
        "NON_ZIWEI_PROJECTION_DRIFT",
        id + " 必须是 v2.7 canonical exact copy。"
      );
    }
    const expectedEngineering =
      id === "ziwei-doushu"
      || id === "western-astrology"
      || id === "vedic-astrology";
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
  ziweiManifest,
  expectedProjection = undefined
) {
  if (
    candidate?.schemaVersion !== "2.8.0"
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID
    || candidate?.status !== STATUS
    || candidate?.createdAt !== CREATED_AT
    || !exactJson(
      candidate?.artifactBindings,
      [binding(PARENT_V27), binding(ZIWEI_MANIFEST_V3)]
    )
  ) {
    fail(
      "CHILD_IDENTITY_INVALID",
      "v2.8 child identity 或 direct bindings 漂移。"
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
    || candidate.versionBoundary.persistedAsCentralRegistry !== false
    || candidate.versionBoundary.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .formalAdmissionRegistryModifiedByThisChild !== false
    || candidate.versionBoundary
      .existingDomainManifestsModifiedByThisChild !== false
    || candidate.versionBoundary.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary.ownerPromotionDecisionReceipt !== null
    || candidate.lineage?.ziweiManifestEndpointAppendedAfterExistingReceiptAndBrowserEndpoints
      !== true
    || candidate.lineage?.ziweiCurrentEngineeringManifestFlagChangedFromFalseToTrue
      !== true
    || candidate.lineage?.ziweiCurrentFullDomainManifestFlagRemainsFalse
      !== true
  ) {
    fail(
      "BOUNDARY_PROMOTION_FORBIDDEN",
      "v2.8 summary/governance/authority/epoch/atomic/ABA 必须 exact copy 且全红。"
    );
  }
  requireAllFalse(candidate.authorityBoundary, "authorityBoundary");
  assertZiweiManifestV3(ziweiManifest);
  if (
    !SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV28Digest(candidate)
      !== candidate.childDigest
  ) {
    fail("CHILD_DIGEST_INVALID", "v2.8 childDigest 无效。");
  }
  if (
    expectedProjection !== undefined
    && !exactJson(candidate, expectedProjection)
  ) {
    fail(
      "CURRENT_STATUS_MISMATCH",
      "v2.8 不等于 v2.7 + Ziwei Manifest v3 当前唯一追加式投影。"
    );
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent =
    await loadFourSystemCurrentStatusObservationChildV27(workspaceRoot);
  const ziweiManifest =
    await loadZiweiIndependentEngineeringManifestV3(workspaceRoot);
  assertDeepFrozen(parent);
  assertDeepFrozen(ziweiManifest);
  assertParentV27(parent);
  assertZiweiManifestV3(ziweiManifest);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V27.path
  );
  const ziweiSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_MANIFEST_V3.path
  );
  assertSnapshot(parentSnapshot, PARENT_V27, "PARENT_V27_RAW_DRIFT");
  assertSnapshot(
    ziweiSnapshot,
    ZIWEI_MANIFEST_V3,
    "ZIWEI_MANIFEST_V3_RAW_DRIFT"
  );
  if (
    !exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(
      parseBaziDttStrictJsonArtifact(ziweiSnapshot),
      ziweiManifest.manifest
    )
  ) {
    fail(
      "UPSTREAM_BRAND_RAW_MISMATCH",
      "upstream 私有品牌不等于固定 raw artifact。"
    );
  }
  return { parent, ziweiManifest };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV28(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent, ziweiManifest } =
    await collectCurrentInputs(workspaceRoot);
  return deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      ziweiManifest
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
    fail("INVALID_UTF8", "v2.8 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV28(
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
      "v2.8 raw/self identity 尚未冻结。"
    );
  }
  const { parent, ziweiManifest } =
    await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      ziweiManifest
    )
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_RELATIVE_PATH
  );
  assertSnapshot(
    snapshot,
    {
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_RELATIVE_PATH,
      ...EXPECTED_PERSISTED
    },
    "PERSISTED_IDENTITY_DRIFT"
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (
    persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot)
      !== serializeFourSystemCurrentStatusObservationChildV28(persisted)
  ) {
    fail(
      "PERSISTED_MATERIALIZATION_DRIFT",
      "v2.8 raw/self/canonical materialization 漂移。"
    );
  }
  assertChildBoundary(
    persisted,
    parent,
    ziweiManifest,
    expected
  );
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV28(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV28Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV28(value)) {
    fail(
      "CHILD_BRAND_REQUIRED",
      "summary 只接受 v2.8 exact persisted loader 私有品牌。"
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
    ziweiManifestScope:
      "selected_path_current_manifest_not_directory_or_full_domain_closure",
    systemsRequired: value.currentStatusSummary.systemsRequired,
    systemsWithCurrentEndpointMechanicallyVerified:
      value.currentStatusSummary
        .systemsWithCurrentEndpointMechanicallyVerified,
    totalAdmissionGatesSatisfied:
      value.currentStatusSummary.totalAdmissionGatesSatisfied,
    allSystemsCurrentFullDomainManifestMechanicallyVerified:
      value.currentStatusSummary
        .allSystemsCurrentFullDomainManifestMechanicallyVerified,
    systemsFormallyAdmitted:
      value.currentStatusSummary.systemsFormallyAdmitted,
    systemsDomainAuthorityAuthorized:
      value.currentStatusSummary.systemsDomainAuthorityAuthorized,
    systemsReleaseReady: value.currentStatusSummary.systemsReleaseReady,
    systemsPublicReleaseAuthorized:
      value.currentStatusSummary.systemsPublicReleaseAuthorized,
    activeAdmissionEffect: value.activeAdmissionEffect,
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
    ziweiProductReleaseIdentity: ziwei.productBoundary.releaseIdentity,
    ziweiProductTargetSchema: ziwei.productBoundary.targetSchema,
    ziweiProductMigrationId: ziwei.productBoundary.migrationId
  });
}

export const fourSystemCurrentStatusObservationChildV28TestOnly =
  OBJECT_FREEZE({
    CHILD_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    PARENT_ZIWEI_CURRENT_STATUS,
    ZIWEI_CURRENT_STATUS,
    ZIWEI_BROWSER_RUNTIME_EVIDENCE,
    PARENT_V27,
    ZIWEI_MANIFEST_V3,
    EXPECTED_PERSISTED,
    canonicalStringify,
    captureJson,
    deepFreeze,
    assertDeepFrozen,
    assertParentV27,
    assertZiweiManifestV3,
    ziweiProjection,
    buildProjection,
    assertSystems,
    assertChildBoundary
  });
