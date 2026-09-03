import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS,
  BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS,
  BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS,
  isVerifiedBaziExpertAuthorityMaterialPrecheck,
  loadBaziExpertAuthorityMaterialPrecheck
} from "./bazi-expert-authority-material-precheck-lib.mjs";
import {
  isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum,
  loadBaziExpertCurrentLineCreatedAtLabelErratum
} from "./bazi-expert-current-line-created-at-label-erratum-lib.mjs";
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
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

const CHILD_ID = "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0";
const RECORD_TYPE = "bazi_expert_current_line_zero_instance_observation_child_v1_1";
const STATUS = "append_only_current_line_zero_instance_observation_successor_no_admission_effect";
const CREATED_AT = "2026-09-01T13:21:30.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T13:22:09.883Z";
const DIGEST_DOMAIN = "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0";
const OLD_V1_DIGEST_DOMAIN = "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0";
const MAX_DEPTH = 128;
const MAX_NODES = 1_000_000;
const MAX_TEXT = 10_000_000;

export const BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH =
  "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.1.0.json";

const READINESS_V19 = OBJECT_FREEZE({
  role: "current_binding_readiness_zero_authority_parent",
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
  rawBytes: 45_551,
  rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
  ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
});

const AUTHORITY_PRECHECK_V1 = OBJECT_FREEZE({
  role: "current_zero_instance_authority_contract_parent",
  path: "content/system-admission/bazi-expert-authority-material-precheck.v1.json",
  rawBytes: 12_974,
  rawSha256: "ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af",
  ledgerId: "hakimi.bazi.expert-authority-material-precheck/1.0.0",
  ledgerDigest: "0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80"
});

const CREATED_AT_ERRATUM_V1 = OBJECT_FREEZE({
  role: "current_created_at_label_erratum_parent_no_endpoint_effect",
  path: "content/system-admission/bazi-expert-current-line-created-at-label-erratum.v1.0.0.json",
  rawBytes: 8_821,
  rawSha256: "cf387592c507660f3ec00f31b5b735c7e90eb6bf1a92aefbb361240a2518bb21",
  erratumId: "hakimi.bazi.expert-current-line-created-at-label-erratum/1.0.0",
  erratumDigest: "f16e24eb71145203d15eec73e1ddcd7ef5a375e349284597744a249dd47cc8cf"
});

const OLD_V1 = OBJECT_FREEZE({
  role: "historical_time_label_affected_predecessor_not_current_authority",
  path: "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json",
  rawBytes: 9_122,
  rawSha256: "c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce",
  childId: "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0",
  childDigest: "f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db",
  createdAt: "2026-09-01T14:00:00.000Z"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 9_765,
  rawSha256: "598b662c7c58913fe9326290d08a1559f46f91909e5d040f9e335ad23562f9e2"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziExpertCurrentLineZeroInstanceObservationChildV11Error extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziExpertCurrentLineZeroInstanceObservationChildV11Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new BaziExpertCurrentLineZeroInstanceObservationChildV11Error(code, message, options);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const budget = { nodes: 0, text: 0 };
  function visit(current, depth = 0) {
    if (depth > MAX_DEPTH) fail("VALUE_LIMIT_EXCEEDED", "v1.1 child 超过最大深度。");
    budget.nodes += 1;
    if (budget.nodes > MAX_NODES) fail("VALUE_LIMIT_EXCEEDED", "v1.1 child 超过最大节点数。");
    if (current === null) return "null";
    if (typeof current === "string") {
      const text = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      budget.text += text.length;
      if (budget.text > MAX_TEXT) fail("VALUE_LIMIT_EXCEEDED", "v1.1 child 文本过长。");
      return text;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_CANONICAL_JSON", "v1.1 child 数字必须为有限且不是负零的 JSON 数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_CANONICAL_JSON", "v1.1 child 只接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_JSON", "v1.1 child 不接受循环或对象别名。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const parts = [];
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (prototype !== ARRAY_PROTOTYPE || ownKeys.length !== current.length + 1) {
        fail("NON_CANONICAL_JSON", "v1.1 child 数组原型或键集合不合法。");
      }
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor || !descriptor.enumerable
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_CANONICAL_JSON", "v1.1 child 不接受稀疏或 accessor 数组。");
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [visit(descriptor.value, depth + 1)]);
      }
      return `[${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}]`;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("NON_CANONICAL_JSON", "v1.1 child 对象原型不合法。");
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
        fail("NON_CANONICAL_JSON", "v1.1 child 对象键不合法。");
      }
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
        fail("NON_CANONICAL_JSON", "v1.1 child 不接受 accessor 或隐藏字段。");
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

function sha256Text(text) {
  const hash = REFLECT_APPLY(CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function withoutDigest(value, field) {
  const result = canonicalValue(value);
  delete result[field];
  return result;
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

function assertDeepFrozen(value, label, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    fail("PARENT_OR_RESULT_NOT_DEEP_FROZEN", `${label} 必须实际深冻结。`);
  }
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      assertDeepFrozen(descriptor.value, label, seen);
    }
  }
}

function copyStringArray(source) {
  const result = [];
  for (let index = 0; index < source.length; index += 1) {
    if (typeof source[index] !== "string" || source[index].length === 0) {
      fail("PARENT_CONTRACT_DRIFT", "review contract 数组包含非法标识。");
    }
    REFLECT_APPLY(ARRAY_PUSH, result, [source[index]]);
  }
  return result;
}

function currentParent(pin, idField, digestField) {
  return {
    role: pin.role,
    path: pin.path,
    rawBytes: pin.rawBytes,
    rawSha256: pin.rawSha256,
    [idField]: pin[idField],
    [digestField]: pin[digestField],
    exactFullLoaderPrivateBrandVerified: true
  };
}

async function readOldV1HistoricalContext(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, OLD_V1.path);
  if (snapshot.path !== OLD_V1.path || snapshot.rawBytes !== OLD_V1.rawBytes
    || snapshot.rawSha256 !== OLD_V1.rawSha256) {
    fail("OLD_V1_RAW_DRIFT", "旧 v1 raw identity 漂移。");
  }
  const value = parseBaziDttStrictJsonArtifact(snapshot);
  const recomputed = sha256Text(
    `${OLD_V1_DIGEST_DOMAIN}\0${canonicalStringify(withoutDigest(value, "childDigest"))}`
  );
  if (value?.childId !== OLD_V1.childId || value?.childDigest !== OLD_V1.childDigest
    || recomputed !== OLD_V1.childDigest || value?.createdAt !== OLD_V1.createdAt) {
    fail("OLD_V1_SELF_DRIFT", "旧 v1 self identity 或旧 createdAt 标签漂移。");
  }
  if (value?.currentMechanicalGate?.realReviewerInstancesVerified !== 0
    || value?.currentMechanicalGate?.domainExpertReviewsVerified !== 0
    || value?.reviewContract?.reviewerSeats?.length !== 2
    || value.reviewContract.reviewerSeats[0]?.status !== "vacant"
    || value.reviewContract.reviewerSeats[1]?.status !== "vacant"
    || value?.materialAccessBoundary?.privateDossierArtifactsReadByThisChild !== 0
    || value?.materialAccessBoundary?.privateOpinionFilesReadByThisChild !== 0
    || value?.materialAccessBoundary?.realPersonMaterialCollectedByThisChild !== 0) {
    fail("OLD_V1_HISTORICAL_PROJECTION_DRIFT", "旧 v1 的历史零实例或私有材料投影漂移。");
  }
  return OBJECT_FREEZE({ snapshot, value });
}

function assertReadiness(parent) {
  if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(parent)) {
    fail("READINESS_PRIVATE_BRAND_REQUIRED", "readiness v1.9 缺少当前私有品牌。");
  }
  assertDeepFrozen(parent, "readiness v1.9");
  if (parent.ledgerId !== READINESS_V19.ledgerId
    || parent.ledgerDigest !== READINESS_V19.ledgerDigest
    || parent.artifact?.path !== READINESS_V19.path
    || parent.artifact.bytes !== READINESS_V19.rawBytes
    || parent.artifact.sha256 !== READINESS_V19.rawSha256
    || parent.bindingRequired !== 12 || parent.bindingFrozenVerified !== 0
    || parent.formalKnowledgeDocumentCount !== 0
    || parent.formalSourceRightsRecordCount !== 0
    || parent.formalSourceCarrierRecordCount !== 0
    || parent.projectCopyMaterializationRecordCount !== 0
    || parent.materializationsVerified !== 0
    || parent.domainExpertReviewCount !== 0
    || parent.verifiedNaturalPersonRightsReviewers !== 0
    || parent.sourceBundleComplete !== false || parent.rightsBundleComplete !== false
    || parent.expertReviewBundleComplete !== false
    || parent.contentTruthEstablished !== false || parent.expertTruthEstablished !== false
    || parent.rightsLegalConclusionEstablished !== false || parent.releaseReady !== false
    || parent.publicDeploymentAuthorized !== false || parent.expertClaimsAuthorized !== false
    || parent.releaseIdentity !== "legacy-v13" || parent.targetSchema !== 13
    || parent.migrationId !== null || parent.mutationEpochReceipt !== null
    || parent.crossFileAtomicSnapshot !== false
    || parent.mutationEpochAvailableForSchema13 !== false
    || parent.intervalMutationExcludedAcrossFiles !== false || parent.abaExcluded !== false) {
    fail("READINESS_PARENT_DRIFT", "readiness v1.9 的零实例、治理或 epoch 边界漂移。");
  }
}

function assertAuthorityPrecheck(parent) {
  if (!isVerifiedBaziExpertAuthorityMaterialPrecheck(parent)) {
    fail("AUTHORITY_PRECHECK_PRIVATE_BRAND_REQUIRED", "authority precheck v1 缺少当前私有品牌。");
  }
  assertDeepFrozen(parent, "authority precheck v1");
  if (parent.ledgerId !== AUTHORITY_PRECHECK_V1.ledgerId
    || parent.ledgerDigest !== AUTHORITY_PRECHECK_V1.ledgerDigest
    || parent.status !== "zero_instance_authority_precheck_contract_mechanically_verified"
    || parent.authorityMaterialContractStructurallyPrechecked !== true
    || parent.countsTowardExpertGate !== false
    || parent.realReviewerInstances !== 0
    || parent.verifierAuthorityGrantInstances !== 0
    || parent.expertClaimsAuthorized !== false || parent.expertTruthEstablished !== false
    || parent.publicDeploymentAuthorized !== false || parent.releaseReady !== false) {
    fail("AUTHORITY_PRECHECK_PARENT_DRIFT", "authority precheck v1 的零实例或授权边界漂移。");
  }
}

function assertErratum(parent) {
  if (!isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(parent)) {
    fail("ERRATUM_PRIVATE_BRAND_REQUIRED", "createdAt erratum 缺少当前私有品牌。");
  }
  assertDeepFrozen(parent, "createdAt erratum v1");
  if (parent.erratumId !== CREATED_AT_ERRATUM_V1.erratumId
    || parent.erratumDigest !== CREATED_AT_ERRATUM_V1.erratumDigest
    || parent.correctedCreatedAt !== null || parent.temporalLabelIssues?.length !== 2
    || parent.currentEndpointBoundary?.replacesOldExpertChildAsCurrentEndpoint !== false
    || parent.currentEndpointBoundary?.replacesBaziMachineIdentitySuccessorAsCurrentEndpoint !== false
    || parent.currentEndpointBoundary?.replacesFourSystemStatusAggregateAsCurrentEndpoint !== false
    || parent.timeBoundary?.trustedTimestampEstablished !== false
    || parent.timeBoundary?.externalTimeAuthorityEstablished !== false
    || parent.timeBoundary?.crossArtifactTemporalOrderEstablished !== false) {
    fail("ERRATUM_PARENT_DRIFT", "createdAt erratum 的时间或 endpoint 边界漂移。");
  }
  const authorityKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [parent.authorityBoundary]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [parent.authorityBoundary]);
  for (let index = 0; index < authorityKeys.length; index += 1) {
    const descriptor = descriptors[authorityKeys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      || descriptor.value !== false) {
      fail("ERRATUM_AUTHORITY_DRIFT", "createdAt erratum authority 不再全红。");
    }
  }
}

async function observeParents(workspaceRoot) {
  const [readiness, authorityPrecheck, erratum, oldV1] = await Promise.all([
    loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot),
    loadBaziExpertAuthorityMaterialPrecheck(workspaceRoot),
    loadBaziExpertCurrentLineCreatedAtLabelErratum(workspaceRoot),
    readOldV1HistoricalContext(workspaceRoot)
  ]);
  assertReadiness(readiness);
  assertAuthorityPrecheck(authorityPrecheck);
  assertErratum(erratum);
  return OBJECT_FREEZE({ readiness, authorityPrecheck, erratum, oldV1 });
}

function buildExpected(observed) {
  const reviewerSeatIds = copyStringArray(BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS);
  const reviewQuestionIds = copyStringArray(BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS);
  const independenceFactorIds = copyStringArray(BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS);
  if (reviewerSeatIds.length !== 2 || reviewQuestionIds.length !== 4
    || independenceFactorIds.length !== 10) {
    fail("PARENT_CONTRACT_DRIFT", "专家席位、问题或独立性因素数量漂移。");
  }
  const oldReviewContract = observed.oldV1.value.reviewContract;
  if (canonicalStringify(oldReviewContract.reviewerSeatIds) !== canonicalStringify(reviewerSeatIds)
    || canonicalStringify(oldReviewContract.reviewQuestionIds) !== canonicalStringify(reviewQuestionIds)
    || canonicalStringify(oldReviewContract.independenceFactorIds) !== canonicalStringify(independenceFactorIds)) {
    fail("OLD_V1_REVIEW_CONTRACT_DRIFT", "旧 v1 历史 review contract 与当前 authority contract 不一致。");
  }
  return {
    schemaVersion: "1.1.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    timeBoundary: {
      createdAtClock: "untrusted_local_clock_label",
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false,
      monotonicClockEstablished: false,
      notaryReceiptEstablished: false,
      filesystemTimestampsUsedAsAuthority: false,
      predecessorV1ChronologyMeaningWithdrawnByErratum: true,
      predecessorV1CorrectedCreatedAt: null,
      erratumPrivateBrandConsumed: true
    },
    currentParentBrands: {
      exactCurrentPrivateBrandsVerified: 3,
      readinessV19: currentParent(READINESS_V19, "ledgerId", "ledgerDigest"),
      authorityPrecheckV1: currentParent(
        AUTHORITY_PRECHECK_V1,
        "ledgerId",
        "ledgerDigest"
      ),
      createdAtErratumV1: currentParent(
        CREATED_AT_ERRATUM_V1,
        "erratumId",
        "erratumDigest"
      )
    },
    historicalPredecessorV1: {
      role: OLD_V1.role,
      path: OLD_V1.path,
      rawBytes: OLD_V1.rawBytes,
      rawSha256: OLD_V1.rawSha256,
      childId: OLD_V1.childId,
      childDigest: OLD_V1.childDigest,
      observedCreatedAtLabel: OLD_V1.createdAt,
      correctedCreatedAt: null,
      rawAndSelfDigestVerified: true,
      fullLoaderImportedByThisChild: false,
      fullLoaderInvokedByThisChild: false,
      privateBrandConsumed: false,
      brandCurrent: false,
      chronologyMeaningWithdrawnByErratum: true
    },
    reviewContract: {
      reviewerSeatIds,
      reviewerSeats: [
        { slotId: reviewerSeatIds[0], status: "vacant" },
        { slotId: reviewerSeatIds[1], status: "vacant" }
      ],
      reviewQuestionIds,
      independenceFactorIds,
      noWinnerPolicy: {
        majorityVoteAllowed: false,
        opinionAveragingAllowed: false,
        generatedModelWinnerSelectionAllowed: false,
        unresolvedDisagreementMayBeAdopted: false,
        allowedUnresolvedDisposition: ["defer", "reject"]
      }
    },
    currentRepositoryZeroInstanceProjection: {
      reviewerSlotsOccupied: 0,
      realReviewerInstancesVerified: 0,
      publicIdentityBindingsVerified: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      pairwiseIndependenceAssessmentsVerified: 0,
      originalOpinionsVerified: 0,
      sealedOriginalOpinionsVerified: 0,
      disagreementInventoriesVerified: 0,
      expertReviewBundlesVerified: 0,
      independentExpertReviewsVerified: 0,
      verifierAuthorityGrantInstancesVerified: 0,
      projectionIsRealWorldAbsenceAttestation: false,
      realWorldPrivateMaterialExistenceAssessed: false,
      absenceOfPrivateMaterialInRealityClaimed: false
    },
    currentMechanicalGate: {
      activeAdmissionEffect: "none",
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      domainExpertsRequired: 2,
      domainExpertReviewsVerified: 0,
      realReviewerInstancesVerified: 0,
      verifierAuthorityGrantInstancesVerified: 0,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      expertReviewBundleComplete: false,
      countsTowardExpertGate: false
    },
    materialAccessBoundary: {
      privateDossierArtifactsReadByThisChild: 0,
      privateOpinionFilesReadByThisChild: 0,
      piiBearingArtifactsReadByThisChild: 0,
      realPersonMaterialCollectedByThisChild: 0,
      privateRuntimeEndpointInvokedByThisChild: false,
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      realWorldPrivateMaterialExistenceAssessed: false,
      absenceOfPrivateMaterialInRealityClaimed: false,
      safeToPublish: false
    },
    sourceRightsBoundary: {
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      verifiedNaturalPersonRightsReviewers: 0,
      rightsLegalReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      contentTruthEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    authorityBoundary: {
      collectionAuthorized: false,
      persistedRealPersonInstancesAllowed: false,
      identityAuthorityEstablished: false,
      credentialAuthorityEstablished: false,
      reviewerIndependenceEstablished: false,
      originalOpinionAuthenticityEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      formalActivationAllowed: false,
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    },
    manifestAndEndpointBoundary: {
      currentFullDomainManifestEstablished: false,
      formalManifestLoadedByThisChild: false,
      formalManifestModified: false,
      centralRegistryModified: false,
      globalCurrentEndpointRegistrationModified: false,
      predecessorArtifactsModified: false,
      predecessorBacklinksAdded: false,
      defaultOrRuntimeIntegration: "absent",
      thisChildReplacesBaziMachineIdentityEndpoint: false,
      thisChildReplacesFourSystemStatusEndpoint: false
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      sameHeldHandleForHistoricalPredecessorV1: true,
      crossFileAtomicSnapshot: false,
      intervalMutationExcludedAcrossFiles: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      abaExcluded: false,
      replayExcluded: false
    },
    runtimeTrustBoundary: {
      visibleLoaderGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      cliOutputTrustedAttestation: false
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "a_correct_historical_created_at_trusted_time_or_cross_artifact_chronology",
      "real_expert_identity_credentials_scope_pairwise_independence_or_opinion_truth",
      "private_material_absence_authenticity_first_seen_custody_or_consent",
      "content_truth_source_binding_rights_carrier_materialization_or_legal_closure",
      "formal_manifest_currentness_current_endpoint_registration_or_formal_admission",
      "browser_runtime_release_evidence_deployment_or_rollback_confirmation",
      "release_readiness_public_release_public_deployment_or_expert_claims_authorization",
      "cross_file_atomic_snapshot_mutation_epoch_interval_mutation_aba_or_replay_exclusion"
    ]
  };
}

function validateTimeBoundary(value) {
  const created = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [value?.createdAt]);
  const upper = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [
    value?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
  ]);
  if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [created])
    || !REFLECT_APPLY(NUMBER_IS_FINITE, Number, [upper]) || created > upper) {
    fail("FUTURE_CREATED_AT_FORBIDDEN", "v1.1 createdAt 晚于固定未认证本机时钟上界。");
  }
  const time = value?.timeBoundary;
  if (time?.trustedTimestampEstablished !== false
    || time?.externalTimeAuthorityEstablished !== false
    || time?.crossArtifactTemporalOrderEstablished !== false
    || time?.monotonicClockEstablished !== false
    || time?.notaryReceiptEstablished !== false
    || time?.filesystemTimestampsUsedAsAuthority !== false) {
    fail("TIME_AUTHORITY_PROMOTION_FORBIDDEN", "v1.1 不得提升本机时间标签或跨工件 chronology。");
  }
  if (time?.predecessorV1CorrectedCreatedAt !== null
    || value?.historicalPredecessorV1?.correctedCreatedAt !== null) {
    fail("CORRECTED_TIME_INVENTION_FORBIDDEN", "v1.1 不得虚构旧 v1 的 correctedCreatedAt。");
  }
}

function validateZeroAndAuthority(value) {
  const projection = value?.currentRepositoryZeroInstanceProjection;
  const zeroFields = [
    "reviewerSlotsOccupied",
    "realReviewerInstancesVerified",
    "publicIdentityBindingsVerified",
    "identitiesVerified",
    "credentialsVerified",
    "scopesVerified",
    "pairwiseIndependenceAssessmentsVerified",
    "originalOpinionsVerified",
    "sealedOriginalOpinionsVerified",
    "disagreementInventoriesVerified",
    "expertReviewBundlesVerified",
    "independentExpertReviewsVerified",
    "verifierAuthorityGrantInstancesVerified"
  ];
  for (let index = 0; index < zeroFields.length; index += 1) {
    if (projection?.[zeroFields[index]] !== 0) {
      fail("EXPERT_INSTANCE_INVENTION_FORBIDDEN", "v1.1 不得制造专家身份、资质、scope、独立性或意见实例。");
    }
  }
  const material = value?.materialAccessBoundary;
  if (material?.privateDossierArtifactsReadByThisChild !== 0
    || material?.privateOpinionFilesReadByThisChild !== 0
    || material?.piiBearingArtifactsReadByThisChild !== 0
    || material?.realPersonMaterialCollectedByThisChild !== 0
    || material?.privateRuntimeEndpointInvokedByThisChild !== false) {
    fail("PRIVATE_MATERIAL_ACCESS_PROMOTION_FORBIDDEN", "v1.1 不得声明访问 PII 或私有专家材料。");
  }
  const authority = value?.authorityBoundary;
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [authority]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [authority]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
      || descriptor.value !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", "v1.1 的专家、内容、权利、法律或发布权威必须全红。");
    }
  }
}

function verifyAgainstExpected(candidate, observed) {
  const passive = canonicalValue(candidate);
  validateTimeBoundary(passive);
  validateZeroAndAuthority(passive);
  if (passive.childDigest !== computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(passive)) {
    fail("CHILD_DIGEST_MISMATCH", "v1.1 child self digest 不匹配。");
  }
  const expected = buildExpected(observed);
  expected.childDigest = computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(expected);
  if (canonicalStringify(passive) !== canonicalStringify(expected)) {
    fail("CHILD_SEMANTIC_DRIFT", "v1.1 child 与当前三父品牌、历史 v1 或全红边界不一致。");
  }
  const verified = deepFreeze(passive);
  assertDeepFrozen(verified, "verified v1.1 child");
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(value) {
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(withoutDigest(value, "childDigest"))}`);
}

export function serializeBaziExpertCurrentLineZeroInstanceObservationChildV11(value) {
  const passive = canonicalValue(value);
  if (passive.childDigest !== computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(passive)) {
    fail("CHILD_DIGEST_MISMATCH", "无法序列化 self digest 不匹配的 v1.1 child。");
  }
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [passive, null, 2])}\n`;
}

export async function buildCurrentBaziExpertCurrentLineZeroInstanceObservationChildV11(
  workspaceRoot = process.cwd()
) {
  const observed = await observeParents(workspaceRoot);
  const candidate = buildExpected(observed);
  candidate.childDigest = computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(candidate);
  return deepFreeze(candidate);
}

export async function verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(
  candidate,
  workspaceRoot = process.cwd()
) {
  return verifyAgainstExpected(candidate, await observeParents(workspaceRoot));
}

export async function loadBaziExpertCurrentLineZeroInstanceObservationChildV11(
  workspaceRoot = process.cwd()
) {
  const observed = await observeParents(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_CHILD_RAW_DRIFT", "persisted v1.1 child raw identity 漂移。");
  }
  return verifyAgainstExpected(parseBaziDttStrictJsonArtifact(snapshot), observed);
}

export function isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziExpertCurrentLineZeroInstanceObservationChildV11Summary(value) {
  if (!isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(value)) {
    fail("PRIVATE_BRAND_REQUIRED", "summary 只接受 exact persisted v1.1 child private brand。");
  }
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    currentPrivateBrandsVerified: value.currentParentBrands.exactCurrentPrivateBrandsVerified,
    historicalPredecessorRawSelfVerified: value.historicalPredecessorV1.rawAndSelfDigestVerified,
    oldV1FullLoaderImported: value.historicalPredecessorV1.fullLoaderImportedByThisChild,
    oldV1FullLoaderInvoked: value.historicalPredecessorV1.fullLoaderInvokedByThisChild,
    correctedCreatedAt: value.historicalPredecessorV1.correctedCreatedAt,
    reviewerSeatsVacant: value.reviewContract.reviewerSeats.length,
    realReviewerInstancesVerified: value.currentRepositoryZeroInstanceProjection.realReviewerInstancesVerified,
    identitiesVerified: value.currentRepositoryZeroInstanceProjection.identitiesVerified,
    credentialsVerified: value.currentRepositoryZeroInstanceProjection.credentialsVerified,
    scopesVerified: value.currentRepositoryZeroInstanceProjection.scopesVerified,
    pairwiseIndependenceAssessmentsVerified:
      value.currentRepositoryZeroInstanceProjection.pairwiseIndependenceAssessmentsVerified,
    originalOpinionsVerified: value.currentRepositoryZeroInstanceProjection.originalOpinionsVerified,
    independentExpertReviewsVerified:
      value.currentRepositoryZeroInstanceProjection.independentExpertReviewsVerified,
    countsTowardExpertGate: value.currentMechanicalGate.countsTowardExpertGate,
    replacesCurrentEndpoint: value.manifestAndEndpointBoundary.globalCurrentEndpointRegistrationModified,
    contentTruthEstablished: value.authorityBoundary.contentTruthEstablished,
    expertTruthEstablished: value.authorityBoundary.expertTruthEstablished,
    rightsLegalConclusionEstablished: value.authorityBoundary.rightsLegalConclusionEstablished,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized,
    releaseIdentity: value.releaseGovernance.releaseIdentity,
    targetSchema: value.releaseGovernance.targetSchema,
    migrationId: value.releaseGovernance.migrationId,
    mutationEpochReceipt: value.observationBoundary.mutationEpochReceipt,
    crossArtifactTemporalOrderEstablished: value.timeBoundary.crossArtifactTemporalOrderEstablished
  });
}

export const baziExpertCurrentLineZeroInstanceObservationChildV11TestOnly = OBJECT_FREEZE({
  CHILD_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  OLD_V1_DIGEST_DOMAIN,
  READINESS_V19,
  AUTHORITY_PRECHECK_V1,
  CREATED_AT_ERRATUM_V1,
  OLD_V1,
  EXPECTED_PERSISTED,
  canonicalStringify,
  parseStrictJson: parseBaziDttStrictJsonArtifact,
  readOldV1HistoricalContext
});
