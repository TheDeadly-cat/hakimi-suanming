import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CREATE_HASH = createHash;
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
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const NATIVE_STRING = String;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

const ERRATUM_ID = "hakimi.bazi.expert-current-line-created-at-label-erratum/1.0.0";
const RECORD_TYPE = "bazi_expert_current_line_created_at_label_erratum_v1";
const STATUS = "append_only_time_label_erratum_no_endpoint_or_admission_effect";
const CREATED_AT = "2026-09-01T13:09:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T13:09:44.233Z";
const DIGEST_DOMAIN = "hakimi.bazi.expert-current-line-created-at-label-erratum/1.0.0";
const MAX_TEXT_CHARACTERS = 10_000_000;
const MAX_VALUE_NODES = 1_000_000;
const MAX_DEPTH = 128;
const SHA256 = /^[a-f0-9]{64}$/u;

export const BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_RELATIVE_PATH =
  "content/system-admission/bazi-expert-current-line-created-at-label-erratum.v1.0.0.json";

const OLD_EXPERT_CHILD = OBJECT_FREEZE({
  role: "affected_old_expert_zero_instance_child",
  path: "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json",
  rawBytes: 9_122,
  rawSha256: "c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce",
  idField: "childId",
  id: "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0",
  digestField: "childDigest",
  digest: "f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db",
  digestDomain: "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0",
  createdAt: "2026-09-01T14:00:00.000Z"
});

const BAZI_SUCCESSOR_V1 = OBJECT_FREEZE({
  role: "direct_consumer_bazi_machine_identity_successor_v1",
  path: "content/system-admission/bazi-current-machine-identity-successor.v1.0.0.json",
  rawBytes: 30_801,
  rawSha256: "9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d",
  idField: "successorId",
  id: "hakimi.bazi.current-machine-identity-successor/1.0.0",
  digestField: "receiptDigest",
  digest: "f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05",
  digestDomain: "hakimi.bazi.current-machine-identity-successor.receipt/1.0.0",
  createdAt: "2026-09-01T08:10:46.766Z"
});

const FOUR_SYSTEM_V28 = OBJECT_FREEZE({
  role: "then_current_four_system_status_aggregate_exposing_affected_bazi_endpoint_at_erratum_observation",
  path: "content/system-admission/four-system-current-status-observation-child.v2.8.0.json",
  rawBytes: 19_327,
  rawSha256: "3e5181c53fbc8eddc6e57fce7c7c6bfb94a05ae5498c408b52198851f7580dea",
  idField: "childId",
  id: "hakimi.system-admission/four-system-current-status-observation-child/2.8.0",
  digestField: "childDigest",
  digest: "a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792",
  digestDomain: "hakimi.system-admission.four-system-current-status-observation-child.v2.8",
  createdAt: "2026-09-01T11:54:00.000Z"
});

const FOUR_SYSTEM_V23 = OBJECT_FREEZE({
  role: "additional_inversion_parent_four_system_v2_3",
  path: "content/system-admission/four-system-current-status-observation-child.v2.3.0.json",
  rawBytes: 17_398,
  rawSha256: "7f6a12f52cf035c2138c17c6f58855db03ba686c7c71ebf2221021461387f1b7",
  idField: "childId",
  id: "hakimi.system-admission/four-system-current-status-observation-child/2.3.0",
  digestField: "childDigest",
  digest: "ea16c7ae69271c2a4ea5902e4ec8b9ff6df224c5d58433b07a56004a2c46e2de",
  digestDomain: "hakimi.system-admission.four-system-current-status-observation-child.v2.3",
  createdAt: "2026-09-01T11:00:00.000Z"
});

const FOUR_SYSTEM_V24 = OBJECT_FREEZE({
  role: "additional_inversion_consumer_four_system_v2_4",
  path: "content/system-admission/four-system-current-status-observation-child.v2.4.0.json",
  rawBytes: 16_791,
  rawSha256: "fa70f8dbe13cacb0a4af282cfed4055a088d9c29d3d76fbb85a4bf52aa737e58",
  idField: "childId",
  id: "hakimi.system-admission/four-system-current-status-observation-child/2.4.0",
  digestField: "childDigest",
  digest: "bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840",
  digestDomain: "hakimi.system-admission.four-system-current-status-observation-child.v2.4",
  createdAt: "2026-09-01T08:17:44.862Z"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 8_821,
  rawSha256: "cf387592c507660f3ec00f31b5b735c7e90eb6bf1a92aefbb361240a2518bb21"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziExpertCurrentLineCreatedAtLabelErratumError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziExpertCurrentLineCreatedAtLabelErratumError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new BaziExpertCurrentLineCreatedAtLabelErratumError(code, message, options);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const budget = { nodes: 0, text: 0 };
  function visit(current, depth = 0) {
    if (depth > MAX_DEPTH) fail("VALUE_LIMIT_EXCEEDED", "erratum 超过最大深度。");
    budget.nodes += 1;
    if (budget.nodes > MAX_VALUE_NODES) fail("VALUE_LIMIT_EXCEEDED", "erratum 超过最大节点数。");
    if (current === null) return "null";
    if (typeof current === "string") {
      const text = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      budget.text += text.length;
      if (budget.text > MAX_TEXT_CHARACTERS) fail("VALUE_LIMIT_EXCEEDED", "erratum 文本过长。");
      return text;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_CANONICAL_JSON", "erratum 数字必须是有限且不是负零的 JSON 数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_CANONICAL_JSON", "erratum 只接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "erratum 不接受循环或对象别名。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const parts = [];
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (prototype !== ARRAY_PROTOTYPE || ownKeys.length !== current.length + 1) {
        fail("NON_CANONICAL_JSON", "erratum 数组原型或键集合不合法。");
      }
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor || !descriptor.enumerable
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_CANONICAL_JSON", "erratum 不接受稀疏或 accessor 数组。");
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [visit(descriptor.value, depth + 1)]);
      }
      return `[${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}]`;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("NON_CANONICAL_JSON", "erratum 对象原型不合法。");
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
        fail("NON_CANONICAL_JSON", "erratum 对象键不合法。");
      }
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
        fail("NON_CANONICAL_JSON", "erratum 不接受 accessor 或隐藏字段。");
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

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function sha256Text(value) {
  const hash = REFLECT_APPLY(CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function unsignedValue(value, digestField) {
  const result = canonicalValue(value);
  delete result[digestField];
  return result;
}

function computeExternalSelfDigest(value, pin) {
  return sha256Text(`${pin.digestDomain}\0${canonicalStringify(unsignedValue(value, pin.digestField))}`);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function assertDeepFrozen(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    fail("RESULT_NOT_DEEP_FROZEN", "verified erratum 必须实际深冻结。");
  }
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function publicPin(pin) {
  return {
    role: pin.role,
    path: pin.path,
    rawBytes: pin.rawBytes,
    rawSha256: pin.rawSha256,
    idField: pin.idField,
    id: pin.id,
    digestField: pin.digestField,
    digest: pin.digest,
    observedCreatedAt: pin.createdAt,
    fullLoaderImportedByErratum: false,
    fullLoaderInvokedByErratum: false
  };
}

async function readPinnedArtifact(workspaceRoot, pin) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, pin.path);
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes
    || snapshot.rawSha256 !== pin.rawSha256) {
    fail("BOUND_ARTIFACT_RAW_DRIFT", `${pin.path} raw identity 漂移。`);
  }
  const value = parseBaziDttStrictJsonArtifact(snapshot);
  if (value?.[pin.idField] !== pin.id || value?.[pin.digestField] !== pin.digest
    || value?.createdAt !== pin.createdAt
    || computeExternalSelfDigest(value, pin) !== pin.digest) {
    fail("BOUND_ARTIFACT_SELF_DRIFT", `${pin.path} self identity 或 createdAt 标签漂移。`);
  }
  return OBJECT_FREEZE({ snapshot, value });
}

function findExactPath(entries, expectedPath) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [entries])) return null;
  let found = null;
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index]?.path === expectedPath) {
      if (found !== null) fail("RELATIONSHIP_AMBIGUOUS", `${expectedPath} 出现多次。`);
      found = entries[index];
    }
  }
  return found;
}

function assertRelationships(observed) {
  const successorBinding = observed.successor.value?.currentParentBindings?.expertZeroInstanceChild;
  if (successorBinding?.path !== OLD_EXPERT_CHILD.path
    || successorBinding.rawBytes !== OLD_EXPERT_CHILD.rawBytes
    || successorBinding.rawSha256 !== OLD_EXPERT_CHILD.rawSha256
    || successorBinding.childId !== OLD_EXPERT_CHILD.id
    || successorBinding.childDigest !== OLD_EXPERT_CHILD.digest
    || successorBinding.role !== "current_expert_zero_instance_overlay_parent"
    || successorBinding.exactFullLoaderPrivateBrandVerified !== true) {
    fail("DIRECT_CONSUMER_RELATIONSHIP_DRIFT", "Bazi successor 不再精确消费旧专家 child。");
  }
  if (observed.successor.value?.expertOverlay?.childId !== OLD_EXPERT_CHILD.id
    || observed.successor.value?.expertOverlay?.childDigest !== OLD_EXPERT_CHILD.digest
    || observed.successor.value.expertOverlay.includedInCurrentMachineIdentityDigest !== false
    || observed.successor.value.expertOverlay.independentExpertReviewsVerified !== 0
    || observed.successor.value.expertOverlay.realReviewerInstancesVerified !== 0) {
    fail("DIRECT_CONSUMER_EXPERT_OVERLAY_DRIFT", "Bazi successor 的专家 overlay 边界漂移。");
  }
  const v24Parent = findExactPath(observed.v24.value?.artifactBindings, FOUR_SYSTEM_V23.path);
  const v24Bazi = findExactPath(observed.v24.value?.artifactBindings, BAZI_SUCCESSOR_V1.path);
  if (v24Parent?.rawBytes !== FOUR_SYSTEM_V23.rawBytes
    || v24Parent?.rawSha256 !== FOUR_SYSTEM_V23.rawSha256
    || v24Parent?.semanticDigest !== FOUR_SYSTEM_V23.digest
    || v24Bazi?.rawBytes !== BAZI_SUCCESSOR_V1.rawBytes
    || v24Bazi?.rawSha256 !== BAZI_SUCCESSOR_V1.rawSha256
    || v24Bazi?.semanticDigest !== BAZI_SUCCESSOR_V1.digest) {
    fail("FOUR_SYSTEM_V24_RELATIONSHIP_DRIFT", "four-system v2.4 的 parent/Bazi 关系漂移。");
  }
  let baziSystem = null;
  const systems = observed.v28.value?.systems;
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [systems])) {
    for (let index = 0; index < systems.length; index += 1) {
      if (systems[index]?.contractSystemId === "bazi") {
        if (baziSystem !== null) fail("RELATIONSHIP_AMBIGUOUS", "four-system v2.8 Bazi 系统重复。");
        baziSystem = systems[index];
      }
    }
  }
  const endpoint = findExactPath(baziSystem?.currentEvidence?.endpoints, BAZI_SUCCESSOR_V1.path);
  if (endpoint?.rawBytes !== BAZI_SUCCESSOR_V1.rawBytes
    || endpoint?.rawSha256 !== BAZI_SUCCESSOR_V1.rawSha256
    || endpoint?.semanticDigest !== BAZI_SUCCESSOR_V1.digest
    || baziSystem?.gateSummary?.independentExpertReviewsVerified !== 0
    || baziSystem?.authorityBoundary?.expertClaimsAuthorized !== false
    || baziSystem?.authorityBoundary?.expertTruthEstablished !== false) {
    fail("FOUR_SYSTEM_V28_BAZI_ENDPOINT_DRIFT", "four-system v2.8 不再精确暴露受影响 Bazi endpoint。");
  }
}

async function observeWorkspace(workspaceRoot) {
  const [oldChild, successor, v28, v23, v24] = await Promise.all([
    readPinnedArtifact(workspaceRoot, OLD_EXPERT_CHILD),
    readPinnedArtifact(workspaceRoot, BAZI_SUCCESSOR_V1),
    readPinnedArtifact(workspaceRoot, FOUR_SYSTEM_V28),
    readPinnedArtifact(workspaceRoot, FOUR_SYSTEM_V23),
    readPinnedArtifact(workspaceRoot, FOUR_SYSTEM_V24)
  ]);
  const observed = OBJECT_FREEZE({ oldChild, successor, v28, v23, v24 });
  assertRelationships(observed);
  return observed;
}

function buildExpected() {
  return {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    erratumId: ERRATUM_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    correctedCreatedAt: null,
    timeBoundary: {
      createdAtClock: "untrusted_local_clock_label",
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false,
      monotonicClockEstablished: false,
      notaryReceiptEstablished: false,
      filesystemTimestampsUsedAsAuthority: false,
      correctedHistoricalInstantEstablished: false
    },
    boundArtifacts: [
      publicPin(OLD_EXPERT_CHILD),
      publicPin(BAZI_SUCCESSOR_V1),
      publicPin(FOUR_SYSTEM_V28)
    ],
    additionalIssueEvidence: [
      publicPin(FOUR_SYSTEM_V23),
      publicPin(FOUR_SYSTEM_V24)
    ],
    temporalLabelIssues: [
      {
        issueId: "expert-child-v1-label-after-direct-consumer-v1-label",
        relationship: "old_expert_child_is_direct_current_overlay_parent_of_bazi_successor_v1",
        parentPath: OLD_EXPERT_CHILD.path,
        parentCreatedAtLabel: OLD_EXPERT_CHILD.createdAt,
        consumerPath: BAZI_SUCCESSOR_V1.path,
        consumerCreatedAtLabel: BAZI_SUCCESSOR_V1.createdAt,
        parentLabelLaterThanConsumerLabel: true,
        parentLabelLaterThanErratumUpperBoundOnSameUntrustedClock: true,
        chronologyMeaningWithdrawn: true,
        correctedParentCreatedAt: null,
        actualCreationOrderEstablished: false,
        causeEstablished: false
      },
      {
        issueId: "four-system-v2-3-label-after-direct-consumer-v2-4-label",
        relationship: "four_system_v2_3_is_direct_parent_of_four_system_v2_4",
        parentPath: FOUR_SYSTEM_V23.path,
        parentCreatedAtLabel: FOUR_SYSTEM_V23.createdAt,
        consumerPath: FOUR_SYSTEM_V24.path,
        consumerCreatedAtLabel: FOUR_SYSTEM_V24.createdAt,
        parentLabelLaterThanConsumerLabel: true,
        parentLabelLaterThanErratumUpperBoundOnSameUntrustedClock: false,
        chronologyMeaningWithdrawn: true,
        correctedParentCreatedAt: null,
        actualCreationOrderEstablished: false,
        causeEstablished: false
      }
    ],
    currentEndpointBoundary: {
      activeAdmissionEffect: "none",
      replacesOldExpertChildAsCurrentEndpoint: false,
      replacesBaziMachineIdentitySuccessorAsCurrentEndpoint: false,
      replacesFourSystemStatusAggregateAsCurrentEndpoint: false,
      formalManifestModified: false,
      centralRegistryModified: false,
      oldFrozenArtifactsModified: false,
      parentBacklinksAdded: false,
      defaultOrRuntimeIntegration: "absent"
    },
    expertBoundary: {
      realReviewerInstancesVerified: 0,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      pairwiseIndependenceAssessments: 0,
      originalOpinionsVerified: 0,
      expertReviewBundleComplete: false,
      countsTowardExpertGate: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      rightsBundleComplete: false,
      rightsLegalConclusionEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      sameHeldHandlePerArtifact: true,
      crossFileAtomicSnapshot: false,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      replayExcluded: false,
      visibleCliGuardIsSecurityBoundary: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      cliOutputTrustedAttestation: false
    },
    doesNotEstablish: [
      "a_correct_historical_created_at_or_actual_creation_order",
      "trusted_time_external_timestamp_authority_signature_or_notary_receipt",
      "a_repaired_or_replaced_current_expert_bazi_or_four_system_endpoint",
      "real_expert_identity_credentials_scope_independence_opinion_or_truth",
      "content_truth_source_or_rights_legal_closure",
      "manifest_currentness_registry_currentness_or_formal_admission",
      "browser_runtime_release_evidence_deployment_or_rollback_confirmation",
      "release_readiness_public_release_public_deployment_or_expert_claims_authorization",
      "cross_file_atomic_snapshot_mutation_epoch_interval_mutation_aba_or_replay_exclusion"
    ]
  };
}

function validateTimeAndAuthority(value) {
  const created = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [value?.createdAt]);
  const upper = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [
    value?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
  ]);
  if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [created])
    || !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [upper]) || created > upper) {
    fail("FUTURE_CREATED_AT_FORBIDDEN", "erratum createdAt 晚于固定未认证本机时钟上界。");
  }
  if (value?.correctedCreatedAt !== null
    || value?.timeBoundary?.correctedHistoricalInstantEstablished !== false) {
    fail("CORRECTED_TIME_INVENTION_FORBIDDEN", "erratum 不得虚构旧工件的 correctedCreatedAt。");
  }
  const timeBoundary = value?.timeBoundary;
  if (timeBoundary?.trustedTimestampEstablished !== false
    || timeBoundary?.externalTimeAuthorityEstablished !== false
    || timeBoundary?.crossArtifactTemporalOrderEstablished !== false
    || timeBoundary?.monotonicClockEstablished !== false
    || timeBoundary?.notaryReceiptEstablished !== false
    || timeBoundary?.filesystemTimestampsUsedAsAuthority !== false) {
    fail("TIME_AUTHORITY_PROMOTION_FORBIDDEN", "本机标签不得提升为可信时间或跨工件 chronology。");
  }
  const authority = value?.authorityBoundary;
  if (authority === null || typeof authority !== "object") {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "authorityBoundary 缺失。");
  }
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [authority]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [authority]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      || descriptor.value !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", "erratum 的内容、专家、权利、法律或发布权威必须全红。");
    }
  }
}

function validateLabelInversions(value) {
  const issues = value?.temporalLabelIssues;
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [issues]) || issues.length !== 2) {
    fail("TEMPORAL_ISSUE_INVENTORY_DRIFT", "erratum 必须精确登记两处标签倒置。");
  }
  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const parent = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [issue?.parentCreatedAtLabel]);
    const consumer = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [issue?.consumerCreatedAtLabel]);
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [parent])
      || !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [consumer]) || parent <= consumer
      || issue?.parentLabelLaterThanConsumerLabel !== true
      || issue?.chronologyMeaningWithdrawn !== true
      || issue?.correctedParentCreatedAt !== null
      || issue?.actualCreationOrderEstablished !== false
      || issue?.causeEstablished !== false) {
      fail("TEMPORAL_LABEL_INVERSION_NOT_PRESERVED", "两处 createdAt 标签倒置或其否定边界漂移。");
    }
  }
}

function verifyCandidateAgainstExpected(candidate) {
  const passive = canonicalValue(candidate);
  validateTimeAndAuthority(passive);
  validateLabelInversions(passive);
  if (passive.erratumDigest !== computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(passive)) {
    fail("ERRATUM_DIGEST_MISMATCH", "erratum self digest 不匹配。");
  }
  const expected = buildExpected();
  expected.erratumDigest = computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(expected);
  if (canonicalStringify(passive) !== canonicalStringify(expected)) {
    fail("ERRATUM_SEMANTIC_DRIFT", "erratum 与固定两处倒置、红门或 endpoint 边界不一致。");
  }
  const verified = deepFreeze(passive);
  assertDeepFrozen(verified);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(value) {
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(unsignedValue(value, "erratumDigest"))}`);
}

export function serializeBaziExpertCurrentLineCreatedAtLabelErratum(value) {
  const passive = canonicalValue(value);
  if (passive.erratumDigest !== computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(passive)) {
    fail("ERRATUM_DIGEST_MISMATCH", "无法序列化 self digest 不匹配的 erratum。");
  }
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [passive, null, 2])}\n`;
}

export async function buildCurrentBaziExpertCurrentLineCreatedAtLabelErratum(
  workspaceRoot = process.cwd()
) {
  await observeWorkspace(workspaceRoot);
  const candidate = buildExpected();
  candidate.erratumDigest = computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(candidate);
  return deepFreeze(candidate);
}

export async function verifyBaziExpertCurrentLineCreatedAtLabelErratum(
  candidate,
  workspaceRoot = process.cwd()
) {
  await observeWorkspace(workspaceRoot);
  return verifyCandidateAgainstExpected(candidate);
}

export async function loadBaziExpertCurrentLineCreatedAtLabelErratum(
  workspaceRoot = process.cwd()
) {
  await observeWorkspace(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_ERRATUM_RAW_DRIFT", "persisted erratum raw identity 漂移。");
  }
  return verifyCandidateAgainstExpected(parseBaziDttStrictJsonArtifact(snapshot));
}

export function isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziExpertCurrentLineCreatedAtLabelErratumSummary(value) {
  if (!isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(value)) {
    fail("PRIVATE_BRAND_REQUIRED", "summary 只接受 exact persisted loader 的 verified erratum。");
  }
  return deepFreeze({
    erratumId: value.erratumId,
    erratumDigest: value.erratumDigest,
    temporalLabelIssuesRecorded: value.temporalLabelIssues.length,
    boundArtifactsVerified: value.boundArtifacts.length,
    additionalIssueEvidenceVerified: value.additionalIssueEvidence.length,
    correctedCreatedAt: value.correctedCreatedAt,
    replacesCurrentEndpoint: false,
    independentExpertReviewsVerified: value.expertBoundary.independentExpertReviewsVerified,
    contentTruthEstablished: value.authorityBoundary.contentTruthEstablished,
    expertTruthEstablished: value.authorityBoundary.expertTruthEstablished,
    rightsLegalConclusionEstablished: value.authorityBoundary.rightsLegalConclusionEstablished,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized,
    releaseIdentity: value.releaseGovernance.releaseIdentity,
    targetSchema: value.releaseGovernance.targetSchema,
    migrationId: value.releaseGovernance.migrationId,
    mutationEpochReceipt: value.releaseGovernance.mutationEpochReceipt,
    crossArtifactTemporalOrderEstablished: value.timeBoundary.crossArtifactTemporalOrderEstablished
  });
}

export const baziExpertCurrentLineCreatedAtLabelErratumTestOnly = OBJECT_FREEZE({
  ERRATUM_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  OLD_EXPERT_CHILD,
  BAZI_SUCCESSOR_V1,
  FOUR_SYSTEM_V28,
  FOUR_SYSTEM_V23,
  FOUR_SYSTEM_V24,
  EXPECTED_PERSISTED,
  canonicalStringify,
  parseStrictJson: parseBaziDttStrictJsonArtifact
});
