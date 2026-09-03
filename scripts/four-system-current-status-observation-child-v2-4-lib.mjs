import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH,
  computeFourSystemCurrentStatusObservationChildV23Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV23,
  loadFourSystemCurrentStatusObservationChildV23
} from "./four-system-current-status-observation-child-v2-3-lib.mjs";
import {
  BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_RELATIVE_PATH,
  isVerifiedBaziCurrentMachineIdentitySuccessor,
  loadBaziCurrentMachineIdentitySuccessor
} from "./bazi-current-machine-identity-successor-lib.mjs";
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
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const SHA256 = /^[a-f0-9]{64}$/u;
const ZERO_SHA256 = "0000000000000000000000000000000000000000000000000000000000000000";
const LIMITS = OBJECT_FREEZE({ maxDepth: 128, maxNodes: 1_000_000, maxText: 10_000_000 });

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.4.0.json";

const CHILD_ID = "hakimi.system-admission/four-system-current-status-observation-child/2.4.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_4";
const STATUS = "append_only_non_atomic_current_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-01T08:17:44.862Z";
const DIGEST_DOMAIN = "hakimi.system-admission.four-system-current-status-observation-child.v2.4";
const BAZI_CURRENT_STATUS =
  "current_machine_identity_successor_full_component_file_set_observed_formal_domain_manifest_not_current_expert_zero_instance";
const PARENT_V23 = OBJECT_FREEZE({
  role: "current_direct_predecessor_four_system_current_status_observation_child_v2_3",
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH,
  rawBytes: 17_398,
  rawSha256: "7f6a12f52cf035c2138c17c6f58855db03ba686c7c71ebf2221021461387f1b7",
  semanticDigestField: "childDigest",
  semanticDigest: "ea16c7ae69271c2a4ea5902e4ec8b9ff6df224c5d58433b07a56004a2c46e2de"
});
const BAZI_SUCCESSOR = OBJECT_FREEZE({
  role: "current_bazi_machine_identity_successor",
  path: BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_RELATIVE_PATH,
  rawBytes: 30_801,
  rawSha256: "9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d",
  semanticDigestField: "receiptDigest",
  semanticDigest: "f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05",
  currentMachineIdentityDigest: "58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 16_791,
  rawSha256: "fa70f8dbe13cacb0a4af282cfed4055a088d9c29d3d76fbb85a4bf52aa737e58",
  childDigest: "bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class FourSystemCurrentStatusObservationChildV24Error extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "FourSystemCurrentStatusObservationChildV24Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FourSystemCurrentStatusObservationChildV24Error(code, message, options);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) fail("NON_PASSIVE_OBJECT", "v2.4 不接受 Proxy。");
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "v2.4 只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function assertDeepFrozen(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) fail("UPSTREAM_NOT_DEEP_FROZEN", "upstream 品牌结果未实际深冻结。");
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) assertDeepFrozen(descriptor.value, seen);
  }
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const state = { nodes: 0, text: 0 };
  function visit(current, depth = 0) {
    if (depth > LIMITS.maxDepth || ++state.nodes > LIMITS.maxNodes) fail("VALUE_LIMIT_EXCEEDED", "v2.4 JSON 超过固定边界。");
    if (current === null) return "null";
    if (typeof current === "string") {
      const encoded = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      state.text += encoded.length;
      if (state.text > LIMITS.maxText) fail("VALUE_LIMIT_EXCEEDED", "v2.4 JSON 文本过长。");
      return encoded;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current]) || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_CANONICAL_JSON", "v2.4 仅接受有限非负零数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) fail("NON_CANONICAL_JSON", "v2.4 仅接受被动 JSON 值。");
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) fail("NON_CANONICAL_JSON", "v2.4 不接受循环或别名。");
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const parts = [];
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (prototype !== ARRAY_PROTOTYPE || ownKeys.length !== current.length + 1) fail("NON_CANONICAL_JSON", "v2.4 数组键不合法。");
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor || !descriptor.enumerable || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_CANONICAL_JSON", "v2.4 不接受稀疏/accessor 数组。");
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [visit(descriptor.value, depth + 1)]);
      }
      return `[${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}]`;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("NON_CANONICAL_JSON", "v2.4 对象原型不合法。");
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      const descriptor = descriptors[key];
      if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype"
        || !descriptor || !descriptor.enumerable || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
        fail("NON_CANONICAL_JSON", "v2.4 对象键不合法。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      REFLECT_APPLY(ARRAY_PUSH, parts, [
        `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptors[key].value, depth + 1)}`
      ]);
    }
    return `{${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}}`;
  }
  return visit(value);
}

function captureJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Text(text) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
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

export function computeFourSystemCurrentStatusObservationChildV24Digest(value) {
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(unsignedChild(value))}`);
}

export function serializeFourSystemCurrentStatusObservationChildV24(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2])}\n`;
}

function assertSnapshot(snapshot, pin, code) {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes || snapshot.rawSha256 !== pin.rawSha256) {
    fail(code, "v2.4 upstream raw identity 漂移。");
  }
}

function assertParentV23(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV23(parent)) fail("PARENT_V23_BRAND_REQUIRED", "必须消费 v2.3 exact full-loader 私有品牌。");
  if (parent?.childId !== "hakimi.system-admission/four-system-current-status-observation-child/2.3.0"
    || parent?.childDigest !== PARENT_V23.semanticDigest
    || computeFourSystemCurrentStatusObservationChildV23Digest(parent) !== PARENT_V23.semanticDigest
    || parent?.activeAdmissionEffect !== "none"
    || parent?.currentStatusSummary?.systemsRequired !== 4
    || parent?.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
    || parent?.currentStatusSummary?.systemsFormallyAdmitted !== 0
    || parent?.currentStatusSummary?.systemsReleaseReady !== 0
    || parent?.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
    || parent?.observationBoundary?.crossFileAtomicSnapshot !== false
    || parent?.observationBoundary?.mutationEpochReceipt !== null
    || parent?.observationBoundary?.abaExcluded !== false
    || parent?.authorityBoundary?.releaseReady !== false
    || parent?.authorityBoundary?.publicDeploymentAuthorized !== false
    || parent?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || parent?.projectReleaseGovernanceContext?.targetSchema !== 13
    || parent?.projectReleaseGovernanceContext?.migrationId !== null
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parent?.systems]) || parent.systems.length !== 4) {
    fail("PARENT_V23_SEMANTIC_DRIFT", "v2.3 parent 身份或红门语义漂移。");
  }
}

function assertBaziSuccessor(successor) {
  if (!isVerifiedBaziCurrentMachineIdentitySuccessor(successor)) fail("BAZI_SUCCESSOR_BRAND_REQUIRED", "必须消费 Bazi successor exact full-loader 私有品牌。");
  if (successor?.successorId !== "hakimi.bazi.current-machine-identity-successor/1.0.0"
    || successor?.receiptDigest !== BAZI_SUCCESSOR.semanticDigest
    || successor?.currentMachineIdentity?.currentMachineIdentityDigest !== BAZI_SUCCESSOR.currentMachineIdentityDigest
    || successor?.currentMachineIdentity?.orderedUniqueFileIdentityCount !== 28
    || successor?.currentMachineIdentity?.uniqueFileDriftCount !== 1
    || successor?.currentMachineIdentity?.componentDriftCount !== 1
    || successor?.gateSummary?.bindingRequired !== 12
    || successor?.gateSummary?.bindingFrozenVerified !== 0
    || successor?.gateSummary?.independentExpertsRequired !== 2
    || successor?.gateSummary?.independentExpertReviewsVerified !== 0
    || successor?.observationBoundary?.persistedAsDomainManifest !== false
    || successor?.observationBoundary?.currentFullDomainManifestEstablished !== false
    || successor?.authorityBoundary?.releaseReady !== false
    || successor?.authorityBoundary?.publicDeploymentAuthorized !== false
    || successor?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || successor?.releaseGovernance?.targetSchema !== 13
    || successor?.releaseGovernance?.migrationId !== null) {
    fail("BAZI_SUCCESSOR_SEMANTIC_DRIFT", "Bazi successor 身份或红门语义漂移。");
  }
}

function systemIndex(systems, productSystemId) {
  let found = -1;
  for (let index = 0; index < systems.length; index += 1) {
    if (systems[index]?.productSystemId === productSystemId) {
      if (found !== -1) fail("SYSTEM_DUPLICATE", `${productSystemId} 重复。`);
      found = index;
    }
  }
  if (found === -1) fail("SYSTEM_MISSING", `${productSystemId} 缺失。`);
  return found;
}

function baziProjection(parentBazi) {
  const bazi = captureJson(parentBazi);
  bazi.currentStatus = BAZI_CURRENT_STATUS;
  bazi.currentEvidence.endpoints = [binding(BAZI_SUCCESSOR)];
  return bazi;
}

function buildProjection(parent) {
  const candidate = captureJson(parent);
  candidate.schemaVersion = "2.4.0";
  candidate.recordType = RECORD_TYPE;
  candidate.childId = CHILD_ID;
  candidate.status = STATUS;
  candidate.createdAt = CREATED_AT;
  candidate.artifactBindings = [binding(PARENT_V23), binding(BAZI_SUCCESSOR)];
  const baziIndex = systemIndex(candidate.systems, "bazi");
  candidate.systems[baziIndex] = baziProjection(parent.systems[systemIndex(parent.systems, "bazi")]);
  candidate.lineage = {
    parent: binding(PARENT_V23),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    baziEndpointReplacedByCurrentSuccessor: true,
    baziStatusReplacedByCurrentSuccessor: true,
    otherSystemCanonicalCopiesPreserved: ["ziwei-doushu", "western-astrology", "vedic-astrology"],
    uniqueBlockerClaimed: false
  };
  candidate.childDigest = computeFourSystemCurrentStatusObservationChildV24Digest(candidate);
  return candidate;
}

function assertSystems(candidate, parent) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [candidate.systems]) || candidate.systems.length !== 4) fail("SYSTEM_SET_INVALID", "v2.4 必须恰含四体系。");
  const ids = ["bazi", "ziwei-doushu", "western-astrology", "vedic-astrology"];
  for (let index = 0; index < ids.length; index += 1) {
    const currentIndex = systemIndex(candidate.systems, ids[index]);
    const parentIndex = systemIndex(parent.systems, ids[index]);
    const system = candidate.systems[currentIndex];
    if (ids[index] === "bazi") {
      if (!exactJson(system, baziProjection(parent.systems[parentIndex]))) fail("BAZI_PROJECTION_DRIFT", "Bazi 只能替换 endpoint/status。");
    } else if (!exactJson(system, parent.systems[parentIndex])) {
      fail("NON_BAZI_PROJECTION_DRIFT", `${ids[index]} 必须是 v2.3 canonical exact copy。`);
    }
    if (system?.gateSummary?.admissionGatesSatisfied !== 0
      || system?.gateSummary?.bindingFrozenVerified !== 0
      || system?.gateSummary?.independentExpertReviewsVerified !== 0
      || system?.currentEvidence?.currentFullDomainManifestMechanicallyVerified !== false
      || system?.authorityBoundary?.formalAdmissionAuthorized !== false
      || system?.authorityBoundary?.releaseReady !== false
      || system?.authorityBoundary?.publicReleaseAuthorized !== false
      || system?.authorityBoundary?.publicDeploymentAuthorized !== false) {
      fail("SYSTEM_AUTHORITY_PROMOTION", `${ids[index]} 零门或 authority 被抬升。`);
    }
  }
}

function assertChildBoundary(candidate, parent, expectedProjection = undefined) {
  if (candidate?.schemaVersion !== "2.4.0" || candidate?.recordType !== RECORD_TYPE
    || candidate?.childId !== CHILD_ID || candidate?.status !== STATUS || candidate?.createdAt !== CREATED_AT
    || !exactJson(candidate?.artifactBindings, [binding(PARENT_V23), binding(BAZI_SUCCESSOR)])) {
    fail("CHILD_IDENTITY_INVALID", "v2.4 child identity 或 direct bindings 漂移。");
  }
  assertSystems(candidate, parent);
  if (!exactJson(candidate.currentStatusSummary, parent.currentStatusSummary)
    || candidate.currentStatusSummary.totalAdmissionGatesSatisfied !== 0
    || candidate.currentStatusSummary.systemsFormallyAdmitted !== 0
    || candidate.currentStatusSummary.systemsReleaseReady !== 0
    || candidate.currentStatusSummary.systemsPublicReleaseAuthorized !== 0
    || !exactJson(candidate.authorityBoundary, parent.authorityBoundary)
    || candidate.authorityBoundary.releaseReady !== false
    || candidate.authorityBoundary.publicDeploymentAuthorized !== false
    || candidate.crossSystemPolicy.authorityInheritanceAllowed !== false
    || candidate.crossSystemPolicy.formalComparisonAuthorized !== false
    || candidate.observationBoundary.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary.mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary.mutationEpochReceipt !== null
    || candidate.observationBoundary.intervalMutationExcludedAcrossFiles !== false
    || candidate.observationBoundary.abaExcluded !== false
    || candidate.projectReleaseGovernanceContext.activeLine !== "legacy-v13"
    || candidate.projectReleaseGovernanceContext.targetSchema !== 13
    || candidate.projectReleaseGovernanceContext.migrationId !== null
    || candidate.projectReleaseGovernanceContext.publicDeploymentAuthorized !== false
    || candidate.projectReleaseGovernanceContext.expertClaimsAuthorized !== false
    || candidate.versionBoundary.appendOnlyChild !== true
    || candidate.versionBoundary.persistedAsCentralRegistry !== false
    || candidate.versionBoundary.centralRegistryModifiedByThisChild !== false
    || candidate.versionBoundary.existingDomainManifestsModifiedByThisChild !== false
    || candidate.versionBoundary.manifestRebindOrResignPerformed !== false
    || candidate.versionBoundary.ownerPromotionDecisionReceipt !== null
    || candidate.activeAdmissionEffect !== "none") {
    fail("BOUNDARY_PROMOTION_FORBIDDEN", "v2.4 非原子、epoch、authority、Manifest 或准入边界被抬升。");
  }
  if (!SHA256.test(candidate.childDigest)
    || computeFourSystemCurrentStatusObservationChildV24Digest(candidate) !== candidate.childDigest) {
    fail("CHILD_DIGEST_INVALID", "v2.4 childDigest 无效。");
  }
  if (expectedProjection !== undefined && !exactJson(candidate, expectedProjection)) fail("CURRENT_STATUS_MISMATCH", "v2.4 不等于当前唯一投影。");
  return candidate;
}

async function collectCurrentInputs(workspaceRoot) {
  const parent = await loadFourSystemCurrentStatusObservationChildV23(workspaceRoot);
  const successor = await loadBaziCurrentMachineIdentitySuccessor(workspaceRoot);
  deepFreeze(parent);
  deepFreeze(successor);
  assertDeepFrozen(parent);
  assertDeepFrozen(successor);
  assertParentV23(parent);
  assertBaziSuccessor(successor);
  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PARENT_V23.path);
  const successorSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BAZI_SUCCESSOR.path);
  assertSnapshot(parentSnapshot, PARENT_V23, "PARENT_V23_RAW_DRIFT");
  assertSnapshot(successorSnapshot, BAZI_SUCCESSOR, "BAZI_SUCCESSOR_RAW_DRIFT");
  if (!exactJson(parseBaziDttStrictJsonArtifact(parentSnapshot), parent)
    || !exactJson(parseBaziDttStrictJsonArtifact(successorSnapshot), successor)) {
    fail("UPSTREAM_BRAND_RAW_MISMATCH", "upstream 私有品牌不等于固定 raw artifact。");
  }
  return { parent, successor };
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV24(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { parent } = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(assertChildBoundary(buildProjection(parent), parent));
}

function decodeSnapshot(snapshot) {
  try {
    return REFLECT_APPLY(TEXT_DECODER_DECODE, UTF8_DECODER, [snapshot.bytes]);
  } catch (cause) {
    fail("INVALID_UTF8", "v2.4 artifact 不是严格 UTF-8。", { cause });
  }
}

export async function loadFourSystemCurrentStatusObservationChildV24(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !SHA256.test(EXPECTED_PERSISTED.childDigest)) fail("PERSISTED_IDENTITY_UNSET", "v2.4 raw/self identity 尚未冻结。");
  const { parent } = await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(assertChildBoundary(buildProjection(parent), parent));
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_RELATIVE_PATH);
  assertSnapshot(snapshot, { path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_RELATIVE_PATH, ...EXPECTED_PERSISTED }, "PERSISTED_IDENTITY_DRIFT");
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (persisted?.childDigest !== EXPECTED_PERSISTED.childDigest
    || decodeSnapshot(snapshot) !== serializeFourSystemCurrentStatusObservationChildV24(persisted)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "v2.4 raw/self/canonical materialization 漂移。");
  }
  assertChildBoundary(persisted, parent, expected);
  const verified = deepFreeze(captureJson(persisted));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV24(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getFourSystemCurrentStatusObservationChildV24Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV24(value)) fail("CHILD_BRAND_REQUIRED", "summary 只接受 v2.4 exact persisted loader 私有品牌。");
  const bazi = value.systems[systemIndex(value.systems, "bazi")];
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    baziStatus: bazi.currentStatus,
    baziEndpointRole: bazi.currentEvidence.endpoints[0].role,
    baziCurrentFullDomainManifestMechanicallyVerified: bazi.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    systemsRequired: value.currentStatusSummary.systemsRequired,
    systemsWithCurrentEndpointMechanicallyVerified: value.currentStatusSummary.systemsWithCurrentEndpointMechanicallyVerified,
    totalAdmissionGatesSatisfied: value.currentStatusSummary.totalAdmissionGatesSatisfied,
    systemsFormallyAdmitted: value.currentStatusSummary.systemsFormallyAdmitted,
    systemsReleaseReady: value.currentStatusSummary.systemsReleaseReady,
    systemsPublicReleaseAuthorized: value.currentStatusSummary.systemsPublicReleaseAuthorized,
    crossFileAtomicSnapshot: value.observationBoundary.crossFileAtomicSnapshot,
    releaseIdentity: value.projectReleaseGovernanceContext.activeLine,
    targetSchema: value.projectReleaseGovernanceContext.targetSchema,
    migrationId: value.projectReleaseGovernanceContext.migrationId
  });
}

export const fourSystemCurrentStatusObservationChildV24TestOnly = OBJECT_FREEZE({
  CHILD_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  BAZI_CURRENT_STATUS,
  PARENT_V23,
  BAZI_SUCCESSOR,
  EXPECTED_PERSISTED,
  canonicalStringify,
  captureJson,
  deepFreeze,
  assertDeepFrozen,
  assertParentV23,
  assertBaziSuccessor,
  baziProjection,
  buildProjection,
  assertSystems,
  assertChildBoundary
});
