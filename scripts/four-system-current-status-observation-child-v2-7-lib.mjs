import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV26Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV26,
  loadFourSystemCurrentStatusObservationChildV26
} from "./four-system-current-status-observation-child-v2-6-lib.mjs";
import {
  VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  computeVedicIndependentEngineeringManifestV2Digest,
  isVerifiedVedicIndependentEngineeringManifestV2,
  loadVedicIndependentEngineeringManifestV2
} from "./vedic-independent-engineering-manifest-v2-lib.mjs";
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

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.7.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.7.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_7";
const STATUS =
  "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T11:11:59.397Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.7";
const VEDIC_CURRENT_STATUS =
  "current_observation_plus_engineering_manifest_plus_isolated_fact_browser_child_no_product_identity";
const VEDIC_BROWSER_RUNTIME_EVIDENCE =
  "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime";

const PARENT_V26 = OBJECT_FREEZE({
  role:
    "current_direct_predecessor_four_system_current_status_observation_child_v2_6",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_RELATIVE_PATH,
  rawBytes: 18_673,
  rawSha256:
    "7e82402069b9a761cd23a8d428b74f389754bd1e30654428fc5bd965bdf57dd5",
  semanticDigestField: "childDigest",
  semanticDigest:
    "72f9cb10f46025662730bd2a4d12c1d7ec8796109350358c815a97c492b07ee7"
});

const PARENT_VEDIC_MANIFEST_V1_ENDPOINT = OBJECT_FREEZE({
  role: "current_vedic_independent_engineering_manifest_v1",
  path: "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json",
  rawBytes: 19_557,
  rawSha256:
    "a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5",
  semanticDigestField: "manifestDigest",
  semanticDigest:
    "96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685"
});

const VEDIC_MANIFEST_V2 = OBJECT_FREEZE({
  role: "vedic_current_parent_declared_selected_path_engineering_manifest_v2",
  path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  rawBytes: 47_107,
  rawSha256:
    "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4",
  semanticDigestField: "manifestDigest",
  semanticDigest:
    "7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 18_697,
  rawSha256:
    "93e4b0487974d6b4b11312eaec7ee4e759a3af603e67389891bba31a42df4307",
  childDigest:
    "2dde1ccaf92d3437da13dc0ebcd2153fa11724b0be5bfed832ba519b9d5b9637"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV27Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "FourSystemCurrentStatusObservationChildV27Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV27Error(
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
    fail("NON_PASSIVE_OBJECT", "v2.7 不接受 Proxy。");
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
        "v2.7 只接受无 accessor 的被动 JSON 值。"
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
      fail("VALUE_LIMIT_EXCEEDED", "v2.7 JSON 超过固定边界。");
    }
    if (current === null) return "null";
    if (typeof current === "string") {
      const encoded = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      state.text += encoded.length;
      if (state.text > LIMITS.maxText) {
        fail("VALUE_LIMIT_EXCEEDED", "v2.7 JSON 文本过长。");
      }
      return encoded;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (
        !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])
      ) {
        fail("NON_CANONICAL_JSON", "v2.7 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (
      typeof current !== "object"
      || REFLECT_APPLY(IS_PROXY, utilTypes, [current])
    ) {
      fail("NON_CANONICAL_JSON", "v2.7 仅接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v2.7 不接受循环或别名。");
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
        fail("NON_CANONICAL_JSON", "v2.7 数组键不合法。");
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
            "v2.7 不接受稀疏/accessor 数组。"
          );
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [
          visit(descriptor.value, depth + 1)
        ]);
      }
      return "[" + REFLECT_APPLY(ARRAY_JOIN, parts, [","]) + "]";
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "v2.7 对象原型不合法。");
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
        fail("NON_CANONICAL_JSON", "v2.7 对象键不合法。");
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

export function computeFourSystemCurrentStatusObservationChildV27Digest(value) {
  return sha256Text(
    DIGEST_DOMAIN + "\0" + canonicalStringify(unsignedChild(value))
  );
}

export function serializeFourSystemCurrentStatusObservationChildV27(value) {
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
    fail(code, "v2.7 upstream raw identity 漂移。");
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

function assertParentV26(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV26(parent)) {
    fail(
      "PARENT_V26_BRAND_REQUIRED",
      "必须消费 v2.6 fixed-path full-loader 私有品牌。"
    );
  }
  if (
    parent?.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.6.0"
    || parent?.childDigest !== PARENT_V26.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV26Digest(parent)
      !== PARENT_V26.semanticDigest
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
      "PARENT_V26_SEMANTIC_DRIFT",
      "v2.6 parent 身份或红门语义漂移。"
    );
  }
  requireAllFalse(parent.authorityBoundary, "parent.authorityBoundary");
  const vedic =
    parent.systems[systemIndex(parent.systems, "vedic-astrology")];
  if (
    vedic?.currentStatus
      !== VEDIC_CURRENT_STATUS
    || vedic?.currentEvidence?.browserRuntimeEvidence
      !== VEDIC_BROWSER_RUNTIME_EVIDENCE
    || vedic?.currentEvidence
      ?.currentEndpointMechanicallyVerified !== true
    || vedic?.currentEvidence
      ?.currentEngineeringManifestMechanicallyVerified !== true
    || vedic?.currentEvidence
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || !REFLECT_APPLY(
      ARRAY_IS_ARRAY,
      Array,
      [vedic?.currentEvidence?.endpoints]
    )
    || vedic.currentEvidence.endpoints.length !== 3
    || !exactJson(
      vedic.currentEvidence.endpoints[1],
      binding(PARENT_VEDIC_MANIFEST_V1_ENDPOINT)
    )
    || vedic?.productBoundary?.baziAuthorityInherited !== false
    || vedic?.productBoundary?.releaseIdentity !== null
    || vedic?.productBoundary?.targetSchema !== null
    || vedic?.productBoundary?.migrationId !== null
  ) {
    fail(
      "PARENT_V26_VEDIC_DRIFT",
      "v2.6 Vedic current true/three-endpoint baseline 漂移。"
    );
  }
}

function assertVedicManifestV2(verified) {
  if (!isVerifiedVedicIndependentEngineeringManifestV2(verified)) {
    fail(
      "VEDIC_MANIFEST_V2_BRAND_REQUIRED",
      "必须消费 Vedic Manifest v2 fixed-path full-loader 私有品牌。"
    );
  }
  const manifest = verified?.manifest;
  const artifact = verified?.artifact;
  if (
    artifact?.path !== VEDIC_MANIFEST_V2.path
    || artifact?.bytes !== VEDIC_MANIFEST_V2.rawBytes
    || artifact?.sha256 !== VEDIC_MANIFEST_V2.rawSha256
    || manifest?.manifestId
      !== "hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest/2.0.0"
    || manifest?.manifestDigest !== VEDIC_MANIFEST_V2.semanticDigest
    || computeVedicIndependentEngineeringManifestV2Digest(manifest)
      !== VEDIC_MANIFEST_V2.semanticDigest
    || manifest?.schemaVersion !== "2.0.0"
    || manifest?.recordType
      !== "vedic_parent_declared_selected_path_machine_identity_manifest_v2"
    || manifest?.activeAdmissionEffect !== "none"
    || manifest?.selectedClosure?.scopeClass
      !== "parent_declared_selected_path_union_not_directory_or_domain_closure"
    || manifest?.selectedClosure?.predecessorDeclaredPaths !== 33
    || manifest?.selectedClosure?.childDeclaredAuthoredBuildPaths !== 24
    || manifest?.selectedClosure?.overlapBetweenParentSets !== 0
    || manifest?.selectedClosure?.selectedUniquePhysicalPaths !== 57
    || manifest?.selectedClosure?.recursiveDirectoryEnumerationPerformed !== false
    || manifest?.selectedClosure?.extraFileAbsenceEstablished !== false
    || manifest?.selectedClosure
      ?.entireFactBrowserDraftRootClosureEstablished !== false
    || manifest?.selectedClosure
      ?.entireTzdbCorePackageClosureEstablished !== false
    || manifest?.selectedClosure?.entireVedicEngineeringClosureEstablished !== false
    || manifest?.componentAccounting?.componentCount !== 9
    || manifest?.componentAccounting?.componentFileReferences !== 35
    || manifest?.componentAccounting?.mappedUniquePhysicalPaths !== 26
    || manifest?.componentAccounting?.engineeringAttachmentPaths !== 31
    || manifest?.componentAccounting?.selectedUniquePhysicalPaths !== 57
    || manifest?.componentClassificationBoundary
      ?.classificationMethod !== "path_name_and_file_role_heuristic_only"
    || manifest?.componentClassificationBoundary
      ?.classificationIsDomainOrExpertJudgment !== false
    || manifest?.componentClassificationBoundary
      ?.classificationIsSemanticCompletenessProof !== false
    || manifest?.componentClassificationBoundary
      ?.semanticMembershipEstablished !== false
    || manifest?.versionBoundary
      ?.currentEngineeringManifestMechanicallyVerified !== true
    || manifest?.versionBoundary
      ?.currentSelectedParentDeclaredPathManifestMechanicallyVerified !== true
    || manifest?.versionBoundary
      ?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest?.versionBoundary
      ?.entireVedicEngineeringClosureEstablished !== false
    || manifest?.versionBoundary?.productIdentityEstablished !== false
    || manifest?.versionBoundary?.upstreamPrivateBrandCount !== 2
    || manifest?.productBoundary?.productIdentity !== null
    || manifest?.productBoundary?.releaseIdentity !== null
    || manifest?.productBoundary?.targetSchema !== null
    || manifest?.productBoundary?.migrationId !== null
    || manifest?.projectDefaultReleaseGovernance?.activeLine !== "legacy-v13"
    || manifest?.projectDefaultReleaseGovernance?.targetSchema !== 13
    || manifest?.projectDefaultReleaseGovernance?.migrationId !== null
    || manifest?.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false
    || manifest?.browserEvidenceBoundary
      ?.browserRuntimeEvidenceEstablishedByThisManifest !== false
    || manifest?.browserEvidenceBoundary
      ?.currentWorkspaceOutputInventoryEstablished !== false
    || manifest?.browserEvidenceBoundary?.historicalIssuanceOutputTreeOnly !== true
    || manifest?.browserEvidenceBoundary
      ?.totalPassedScenarioOutcomesAtChildIssuance !== 10
    || manifest?.browserEvidenceBoundary
      ?.retained2025bChunkScenarioRuntimeRequested !== false
    || manifest?.gateState?.admissionGatesRequired !== 8
    || manifest?.gateState?.admissionGatesSatisfied !== 0
    || manifest?.gateState?.bindingRequired !== 38
    || manifest?.gateState?.bindingFrozenVerified !== 0
    || manifest?.gateState?.independentExpertsRequired !== 2
    || manifest?.gateState?.independentExpertReviewsVerified !== 0
    || manifest?.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest?.observationBoundary?.mutationEpochAvailableForProduct !== false
    || manifest?.observationBoundary?.mutationEpochReceipt !== null
    || manifest?.observationBoundary
      ?.intervalMutationExcludedAcrossFiles !== false
    || manifest?.observationBoundary?.abaExcluded !== false
    || manifest?.observationBoundary
      ?.digestIsDigitalSignature !== false
  ) {
    fail(
      "VEDIC_MANIFEST_V2_SEMANTIC_DRIFT",
      "Vedic Manifest v2 machine identity/scope/authority 红门漂移。"
    );
  }
  requireAllFalse(
    manifest.authorityBoundary,
    "vedicManifestV2.authorityBoundary"
  );
}

function vedicProjection(parentVedic) {
  const vedic = captureJson(parentVedic);
  const endpoints = captureJson(parentVedic.currentEvidence.endpoints);
  endpoints[1] = binding(VEDIC_MANIFEST_V2);
  vedic.currentEvidence.endpoints = endpoints;
  return vedic;
}

function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.7.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [
    binding(PARENT_V26),
    binding(VEDIC_MANIFEST_V2)
  ];
  const vedicIndex = systemIndex(candidate.systems, "vedic-astrology");
  candidate.systems[vedicIndex] = vedicProjection(
    parent.systems[
      systemIndex(parent.systems, "vedic-astrology")
    ]
  );
  candidate.lineage = {
    parent: binding(PARENT_V26),
    vedicEngineeringManifest: binding(VEDIC_MANIFEST_V2),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    vedicEngineeringManifestMechanicallyCurrent: true,
    vedicEngineeringManifestPrivateBrandLoaderRecursivelyReverifiedItsUpstreams:
      true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    vedicManifestEndpointReplacedFromV1ToV2: true,
    vedicCurrentEngineeringManifestFlagRemainsTrue: true,
    vedicCurrentFullDomainManifestFlagRemainsFalse: true,
    vedicBrowserRuntimeEvidenceUnchangedAtIsolatedCivilTimeFactOnly10Of10:
      true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "ziwei-doushu",
      "western-astrology"
    ],
    uniqueBlockerClaimed: false
  };
  candidate.childDigest =
    computeFourSystemCurrentStatusObservationChildV27Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (
    !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems])
    || candidate.systems.length !== 4
  ) {
    fail("SYSTEM_SET_INVALID", "v2.7 必须恰含四体系。");
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
    if (id === "vedic-astrology") {
      if (!exactJson(
        system,
        vedicProjection(parent.systems[parentIndex])
      )) {
        fail(
          "VEDIC_PROJECTION_DRIFT",
          "Vedic 只能把 v1 Manifest endpoint 原位替换为 v2；engineering true、full-domain false 与 isolated 10/10 browser 边界不得改变。"
        );
      }
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail(
        "NON_VEDIC_PROJECTION_DRIFT",
        id + " 必须是 v2.6 canonical exact copy。"
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
  vedicManifest,
  expectedProjection = undefined
) {
  if (
    candidate?.schemaVersion !== "2.7.0"
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID
    || candidate?.status !== STATUS
    || candidate?.createdAt !== CREATED_AT
    || !exactJson(
      candidate?.artifactBindings,
      [binding(PARENT_V26), binding(VEDIC_MANIFEST_V2)]
    )
  ) {
    fail(
      "CHILD_IDENTITY_INVALID",
      "v2.7 child identity 或 direct bindings 漂移。"
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
      "v2.7 summary/governance/authority/epoch/atomic/ABA 必须 exact copy 且全红。"
    );
  }
  requireAllFalse(candidate.authorityBoundary, "authorityBoundary");
  assertVedicManifestV2(vedicManifest);
  if (
    !SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV27Digest(candidate)
      !== candidate.childDigest
  ) {
    fail("CHILD_DIGEST_INVALID", "v2.7 childDigest 无效。");
  }
  if (
    expectedProjection !== undefined
    && !exactJson(candidate, expectedProjection)
  ) {
    fail(
      "CURRENT_STATUS_MISMATCH",
      "v2.7 不等于 v2.6 + Vedic Manifest v2 当前唯一投影。"
    );
  }
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent =
    await loadFourSystemCurrentStatusObservationChildV26(workspaceRoot);
  const vedicManifest =
    await loadVedicIndependentEngineeringManifestV2(workspaceRoot);
  assertDeepFrozen(parent);
  assertDeepFrozen(vedicManifest);
  assertParentV26(parent);
  assertVedicManifestV2(vedicManifest);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PARENT_V26.path
  );
  const vedicSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_MANIFEST_V2.path
  );
  assertSnapshot(parentSnapshot, PARENT_V26, "PARENT_V26_RAW_DRIFT");
  assertSnapshot(
    vedicSnapshot,
    VEDIC_MANIFEST_V2,
    "VEDIC_MANIFEST_V2_RAW_DRIFT"
  );
  if (
    !exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(
      parseBaziDttStrictJsonArtifact(vedicSnapshot),
      vedicManifest.manifest
    )
  ) {
    fail(
      "UPSTREAM_BRAND_RAW_MISMATCH",
      "upstream 私有品牌不等于固定 raw artifact。"
    );
  }
  return { parent, vedicManifest };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV27(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent, vedicManifest } =
    await collectCurrentInputs(workspaceRoot);
  return deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      vedicManifest
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
    fail("INVALID_UTF8", "v2.7 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV27(
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
      "v2.7 raw/self identity 尚未冻结。"
    );
  }
  const { parent, vedicManifest } =
    await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(
    assertChildBoundary(
      buildProjection(parent),
      parent,
      vedicManifest
    )
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_RELATIVE_PATH
  );
  assertSnapshot(
    snapshot,
    {
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_RELATIVE_PATH,
      ...EXPECTED_PERSISTED
    },
    "PERSISTED_IDENTITY_DRIFT"
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (
    persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot)
      !== serializeFourSystemCurrentStatusObservationChildV27(persisted)
  ) {
    fail(
      "PERSISTED_MATERIALIZATION_DRIFT",
      "v2.7 raw/self/canonical materialization 漂移。"
    );
  }
  assertChildBoundary(
    persisted,
    parent,
    vedicManifest,
    expected
  );
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV27(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV27Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV27(value)) {
    fail(
      "CHILD_BRAND_REQUIRED",
      "summary 只接受 v2.7 exact persisted loader 私有品牌。"
    );
  }
  const vedic =
    value.systems[systemIndex(value.systems, "vedic-astrology")];
  const endpointRoles = [];
  for (
    let index = 0;
    index < vedic.currentEvidence.endpoints.length;
    index += 1
  ) {
    REFLECT_APPLY(ARRAY_PUSH, endpointRoles, [
      vedic.currentEvidence.endpoints[index].role
    ]);
  }
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    vedicStatus: vedic.currentStatus,
    vedicBrowserRuntimeEvidence:
      vedic.currentEvidence.browserRuntimeEvidence,
    vedicEndpointRoles: endpointRoles,
    vedicCurrentEngineeringManifestMechanicallyVerified:
      vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    vedicCurrentFullDomainManifestMechanicallyVerified:
      vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    vedicManifestScope:
      "parent_declared_selected_path_union_not_directory_or_domain_closure",
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
    projectDefaultActiveLine:
      value.projectReleaseGovernanceContext.activeLine,
    projectDefaultTargetSchema:
      value.projectReleaseGovernanceContext.targetSchema,
    projectDefaultMigrationId:
      value.projectReleaseGovernanceContext.migrationId,
    vedicProductReleaseIdentity: vedic.productBoundary.releaseIdentity,
    vedicProductTargetSchema: vedic.productBoundary.targetSchema,
    vedicProductMigrationId: vedic.productBoundary.migrationId
  });
}

export const fourSystemCurrentStatusObservationChildV27TestOnly =
  OBJECT_FREEZE({
    CHILD_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    VEDIC_CURRENT_STATUS,
    VEDIC_BROWSER_RUNTIME_EVIDENCE,
    PARENT_V26,
    PARENT_VEDIC_MANIFEST_V1_ENDPOINT,
    VEDIC_MANIFEST_V2,
    EXPECTED_PERSISTED,
    canonicalStringify,
    captureJson,
    deepFreeze,
    assertDeepFrozen,
    assertParentV26,
    assertVedicManifestV2,
    vedicProjection,
    buildProjection,
    assertSystems,
    assertChildBoundary
  });
