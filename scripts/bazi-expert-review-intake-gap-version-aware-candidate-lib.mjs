import { createHash } from "node:crypto";

import {
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [UINT8_ARRAY_PROTOTYPE]);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;

export const BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json";

const HISTORICAL_PACKET = OBJECT_FREEZE({
  path: "content/bazi-strength-expert-review-packet.v1.json",
  rawBytes: 12684,
  rawSha256: "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
  packetId: "hakimi.bazi.strength.expert-review-packet/1.5.0",
  packetDigest: "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f",
  schemaVersion: "1.0.0",
  recordType: "bazi_strength_expert_review_packet_candidate",
  status: "mechanically_bound_vacant_review_packet"
});
const HISTORICAL_GAP = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-review-intake-gap.v1.json",
  rawBytes: 4309,
  rawSha256: "7d01f000358f6938675c34fbebf6379e55c3f56dadee12fab6a3d801b33ef6ac",
  ledgerId: "hakimi.bazi.expert-review-intake-gap/1.0.0",
  ledgerDigest: "6cf349fda4c4fd2b8ddada22417e12741c37abc6fc884338dbf5c741e0fc1766",
  schemaVersion: "1.0.0",
  recordType: "bazi_expert_review_intake_gap_v1",
  status: "zero_instance_intake_contract_not_collection_ready"
});
const HISTORICAL_GAP_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  ledgerId: "hakimi.bazi.strength.binding-freeze-readiness/1.5.0",
  ledgerDigest: "feea402079cab44a5d3e0855f867114684da96e4005343a1b1a7cdc75fbee9ad",
  rawBytes: 26038,
  rawSha256: "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201"
});
const SOURCE_V16 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c",
  candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
  candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59"
});
const RIGHTS_V12 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc",
  candidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
  candidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
});
const READINESS_V17 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const SUPERSESSION_RECEIPT = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const BAZI_CORE_DRIFT = OBJECT_FREEZE({
  artifactId: "bazi-core-fact-engine",
  path: "packages/bazi-core/src/index.ts",
  lockedSha256: "73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f",
  observedBytes: 46847,
  observedSha256: "4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f"
});
const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundary: "preserved",
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});
const PACKET_PROJECTION_DIGEST_DOMAIN =
  "hakimi.bazi.expert-review-packet.version-aware-template-projection.v1.1";
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.bazi.expert-review-intake-gap.version-aware-candidate.v1.1";
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 32579,
  rawSha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  ledgerDigest: "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziExpertReviewIntakeGapVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziExpertReviewIntakeGapVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziExpertReviewIntakeGapVersionAwareCandidateError(code, message, cause);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "专家 intake candidate 只接受无 accessor 的被动值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, null, [value])) {
      fail("NON_JSON_VALUE", "专家 intake JSON 不接受非有限数值。");
    }
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (value === null || typeof value !== "object") {
    fail("NON_JSON_VALUE", "专家 intake candidate 含非 JSON 值。");
  }
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    const arrayKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
    if (arrayKeys.length !== value.length + 1) {
      fail("NON_JSON_ARRAY_SHAPE", "专家 intake JSON 数组不得含 holes、symbol 或额外属性。");
    }
    for (let index = 0; index < arrayKeys.length; index += 1) {
      const key = arrayKeys[index];
      if (key !== "length" && (typeof key !== "string" || key !== `${index}`)) {
        fail("NON_JSON_ARRAY_SHAPE", "专家 intake JSON 数组不得含 holes、symbol 或额外属性。");
      }
    }
    let text = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) text += ",";
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, index]);
      if (!descriptor || !("value" in descriptor)) {
        fail("NON_PASSIVE_OBJECT", "专家 intake JSON 数组必须稠密且无 accessor。");
      }
      text += canonicalStringify(descriptor.value);
    }
    return `${text}]`;
  }
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail("NON_JSON_OBJECT_PROTOTYPE", "专家 intake JSON 只接受普通对象，不接受 Map、Date 或自定义实例。");
  }
  const keys = [];
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key !== "string") fail("NON_JSON_KEY", "专家 intake JSON 不接受 symbol key。");
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "专家 intake JSON 不接受 accessor。");
    }
    REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
  }
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  let text = "{";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) text += ",";
    const key = keys[index];
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "专家 intake JSON 不接受 accessor。");
    }
    text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${canonicalStringify(descriptor.value)}`;
  }
  return `${text}}`;
}

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function cloneJson(value) {
  return canonicalValue(value);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Text(text) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainSeparatedDigest(domain, value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function serialize(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value), null, 2])}\n`;
}

function snapshotForValue(value) {
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(value), "utf8"]);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
    rawSha256: sha256Bytes(bytes),
    bytes
  }]);
}

export function computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

function findExactlyOne(values, predicate, label) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [values])) {
    fail("EXPECTED_ARRAY", `${label} 必须是数组。`);
  }
  let found;
  let count = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (predicate(values[index])) {
      found = values[index];
      count += 1;
    }
  }
  if (count !== 1) fail("EXACTLY_ONE_REQUIRED", `${label} 必须且只能出现一次。`);
  return found;
}

function assertSupersession(result) {
  if (!isVerifiedBaziDttVersionedParentSupersession(result)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "专家 intake v1.1 必须消费同根 source/rights supersession WeakSet 品牌。");
  }
  const source = result.supersedingParents?.sourceBinding;
  const rights = result.supersedingParents?.sourceRights;
  if (result.offlineVersionedParentSupersessionMechanicallyVerified !== true
    || result.supersessionId !== SUPERSESSION_RECEIPT.supersessionId
    || result.supersessionDigest !== SUPERSESSION_RECEIPT.supersessionDigest
    || result.sourceLedgerId !== SOURCE_V16.ledgerId
    || result.sourceLedgerDigest !== SOURCE_V16.ledgerDigest
    || result.rightsLedgerId !== RIGHTS_V12.ledgerId
    || result.rightsLedgerDigest !== RIGHTS_V12.ledgerDigest
    || !exactJson(source, {
      path: SOURCE_V16.path,
      rawBytes: SOURCE_V16.rawBytes,
      rawSha256: SOURCE_V16.rawSha256,
      ledgerId: SOURCE_V16.ledgerId,
      ledgerDigest: SOURCE_V16.ledgerDigest,
      dttCandidateId: SOURCE_V16.candidateId,
      dttCandidateDigest: SOURCE_V16.candidateDigest
    })
    || !exactJson(rights, {
      path: RIGHTS_V12.path,
      rawBytes: RIGHTS_V12.rawBytes,
      rawSha256: RIGHTS_V12.rawSha256,
      ledgerId: RIGHTS_V12.ledgerId,
      ledgerDigest: RIGHTS_V12.ledgerDigest,
      dttCandidateId: RIGHTS_V12.candidateId,
      dttCandidateDigest: RIGHTS_V12.candidateDigest
    })
    || result.artifacts?.sourceBinding?.path !== SOURCE_V16.path
    || result.artifacts?.sourceBinding?.rawBytes !== SOURCE_V16.rawBytes
    || result.artifacts?.sourceBinding?.rawSha256 !== SOURCE_V16.rawSha256
    || result.artifacts?.sourceRights?.path !== RIGHTS_V12.path
    || result.artifacts?.sourceRights?.rawBytes !== RIGHTS_V12.rawBytes
    || result.artifacts?.sourceRights?.rawSha256 !== RIGHTS_V12.rawSha256
    || result.artifacts?.receipt?.path !== SUPERSESSION_RECEIPT.path
    || result.artifacts?.receipt?.rawBytes !== SUPERSESSION_RECEIPT.rawBytes
    || result.artifacts?.receipt?.rawSha256 !== SUPERSESSION_RECEIPT.rawSha256
    || result.noticeProjectionCorrectedAtSupersedingCandidateParentLayer !== true
    || result.boundReadinessConsumesSupersedingParents !== false
    || result.boundReadinessStillPinsHistoricalParents !== true
    || result.promotionBlocked !== true
    || result.distributionPolicy !== "link_only"
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.bindingFrozenVerified !== 0
    || result.noticeProjection?.publicDomainMarkCountsAsLicense !== false
    || result.noticeProjection?.noticeApplicabilityEstablished !== false
    || result.noticeProjection?.legalConclusion !== "not_established"
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("SUPERSESSION_TUPLE_MISMATCH", "专家 intake source/rights supersession 身份、receipt 或红门漂移。");
  }
  return {
    sourceBinding: {
      path: source.path,
      rawBytes: source.rawBytes,
      rawSha256: source.rawSha256,
      ledgerId: source.ledgerId,
      ledgerDigest: source.ledgerDigest,
      candidateId: source.dttCandidateId,
      candidateDigest: source.dttCandidateDigest
    },
    sourceRights: {
      path: rights.path,
      rawBytes: rights.rawBytes,
      rawSha256: rights.rawSha256,
      ledgerId: rights.ledgerId,
      ledgerDigest: rights.ledgerDigest,
      candidateId: rights.dttCandidateId,
      candidateDigest: rights.dttCandidateDigest
    },
    supportingSupersessionReceipt: {
      path: result.artifacts.receipt.path,
      rawBytes: result.artifacts.receipt.rawBytes,
      rawSha256: result.artifacts.receipt.rawSha256,
      supersessionId: result.supersessionId,
      supersessionDigest: result.supersessionDigest
    }
  };
}

function assertReadiness(result) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(result)) {
    fail("READINESS_BRAND_REQUIRED", "专家 intake v1.1 必须消费同根 readiness 1.7 WeakSet 品牌。");
  }
  const readiness = result.readiness;
  const gate = readiness?.dttNoticeReconciliationGate;
  const source = gate?.currentCandidateParentIdentities?.sourceBinding;
  const rights = gate?.currentCandidateParentIdentities?.sourceRights;
  const receipt = gate?.supersessionReceipt;
  const packetBasis = findExactlyOne(
    readiness?.basisArtifacts,
    (entry) => entry?.path === HISTORICAL_PACKET.path,
    "readiness 1.7 historical expert packet basis"
  );
  if (result.versionAwareCandidateReadinessMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.ledgerId !== READINESS_V17.ledgerId
    || result.ledgerDigest !== READINESS_V17.ledgerDigest
    || result.artifact?.path !== READINESS_V17.path
    || result.artifact?.bytes !== READINESS_V17.rawBytes
    || result.artifact?.sha256 !== READINESS_V17.rawSha256
    || packetBasis?.bytes !== HISTORICAL_PACKET.rawBytes
    || packetBasis?.sha256 !== HISTORICAL_PACKET.rawSha256
    || !exactJson(source, {
      path: SOURCE_V16.path,
      rawBytes: SOURCE_V16.rawBytes,
      rawSha256: SOURCE_V16.rawSha256,
      ledgerId: SOURCE_V16.ledgerId,
      ledgerDigest: SOURCE_V16.ledgerDigest,
      candidateId: SOURCE_V16.candidateId,
      candidateDigest: SOURCE_V16.candidateDigest
    })
    || !exactJson(rights, {
      path: RIGHTS_V12.path,
      rawBytes: RIGHTS_V12.rawBytes,
      rawSha256: RIGHTS_V12.rawSha256,
      ledgerId: RIGHTS_V12.ledgerId,
      ledgerDigest: RIGHTS_V12.ledgerDigest,
      candidateId: RIGHTS_V12.candidateId,
      candidateDigest: RIGHTS_V12.candidateDigest
    })
    || !exactJson(receipt, {
      path: SUPERSESSION_RECEIPT.path,
      bytes: SUPERSESSION_RECEIPT.rawBytes,
      sha256: SUPERSESSION_RECEIPT.rawSha256,
      supersessionId: SUPERSESSION_RECEIPT.supersessionId,
      supersessionDigest: SUPERSESSION_RECEIPT.supersessionDigest
    })
    || gate?.candidateProjectionResolved !== true
    || gate?.candidateParentPairVersionedSupersessionReceiptComplete !== true
    || gate?.candidateNoticeProjectionReconciliationPassed !== true
    || gate?.noticeApplicabilityEstablished !== false
    || gate?.rightsLegalConclusionEstablished !== false
    || gate?.formalAdmissionPromotionBlocked !== true
    || gate?.promotionBlocked !== true
    || gate?.activeAdmissionEffect !== "none"
    || gate?.currentDistributionBoundary !== "link_only_no_redistribution_clearance"
    || result.candidateNoticeProjectionReconciliationsResolved !== 1
    || result.activeNoticeDiscrepancyPromotionBlocks !== 1
    || result.candidateNoticeProjectionDiscrepancyPromotionBlocks !== 0
    || result.formalAdmissionPromotionBlocked !== true
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || readiness?.gateSummary?.independentDomainReviewsVerified !== 0
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.sourceBundleComplete !== false
    || result.rightsBundleComplete !== false
    || result.expertReviewBundleComplete !== false
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.distributionPolicy !== "link_only"
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("READINESS_TUPLE_MISMATCH", "专家 intake readiness 1.7 身份、packet basis、parent coherence 或红门漂移。");
  }
  return {
    sourceBinding: cloneJson(source),
    sourceRights: cloneJson(rights),
    supportingSupersessionReceipt: {
      path: receipt.path,
      rawBytes: receipt.bytes,
      rawSha256: receipt.sha256,
      supersessionId: receipt.supersessionId,
      supersessionDigest: receipt.supersessionDigest
    }
  };
}

function assertZeroInstances(gap) {
  const instances = gap.currentInstances;
  const arrayKeys = [
    "publicIdentityBindings",
    "originalOpinions",
    "privateOpinionSealReceipts",
    "pairwiseIndependenceAssessments",
    "disagreementInventories",
    "reconciliationNotes",
    "overallBundles"
  ];
  for (let index = 0; index < arrayKeys.length; index += 1) {
    const value = instances?.[arrayKeys[index]];
    if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]) || value.length !== 0) {
      fail("HISTORICAL_GAP_INSTANCE_DRIFT", "历史 intake gap 的所有 record instance 必须保持 0。");
    }
  }
  if (!exactJson(instances?.counts, {
    publicIdentityBindings: 0,
    originalOpinions: 0,
    privateOpinionSealReceipts: 0,
    pairwiseIndependenceAssessments: 0,
    disagreementInventories: 0,
    reconciliationNotes: 0,
    overallBundles: 0,
    sealedOriginalOpinions: 0,
    independentExpertReviewsVerified: 0
  })) {
    fail("HISTORICAL_GAP_INSTANCE_DRIFT", "历史 intake gap instance counts 必须保持全 0。");
  }
}

async function readHistoricalTemplates(workspaceRoot) {
  const packetSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_PACKET.path);
  if (packetSnapshot.rawBytes !== HISTORICAL_PACKET.rawBytes
    || packetSnapshot.rawSha256 !== HISTORICAL_PACKET.rawSha256) {
    fail("HISTORICAL_PACKET_RAW_DRIFT", "历史 expert packet raw identity 漂移。");
  }
  const packet = parseBaziDttStrictJsonArtifact(packetSnapshot);
  const unsignedPacket = cloneJson(packet);
  delete unsignedPacket.packetDigest;
  if (packet.schemaVersion !== HISTORICAL_PACKET.schemaVersion
    || packet.recordType !== HISTORICAL_PACKET.recordType
    || packet.packetId !== HISTORICAL_PACKET.packetId
    || packet.packetDigest !== HISTORICAL_PACKET.packetDigest
    || packet.status !== HISTORICAL_PACKET.status
    || sha256Text(canonicalStringify(unsignedPacket)) !== packet.packetDigest
    || packet.artifactLocks?.length !== 12
    || packet.reviewQuestions?.length !== 4
    || packet.independenceChecklist?.length !== 10
    || packet.roleSeparation?.length !== 3
    || packet.reviewerSlots?.length !== 2
    || packet.disagreementPolicy?.length !== 7
    || packet.gateSummary?.packetArtifactLocksVerified !== 12
    || packet.gateSummary?.domainExpertsRequired !== 2
    || packet.gateSummary?.reviewerSlotsOccupied !== 0
    || packet.gateSummary?.identitiesVerified !== 0
    || packet.gateSummary?.credentialsVerified !== 0
    || packet.gateSummary?.scopesVerified !== 0
    || packet.gateSummary?.independentExpertReviewsVerified !== 0
    || packet.gateSummary?.sealedOriginalOpinions !== 0
    || packet.gateSummary?.expertReviewBundleComplete !== false
    || packet.gateSummary?.contentTruthEstablished !== false
    || packet.gateSummary?.expertTruthEstablished !== false
    || packet.gateSummary?.rightsLegalConclusionEstablished !== false
    || packet.gateSummary?.releaseReady !== false
    || packet.gateSummary?.publicDeploymentAuthorized !== false
    || packet.gateSummary?.expertClaimsAuthorized !== false) {
    fail("HISTORICAL_PACKET_SEMANTIC_DRIFT", "历史 expert packet semantic identity、模板合同或红门漂移。");
  }
  for (let index = 0; index < packet.reviewerSlots.length; index += 1) {
    const slot = packet.reviewerSlots[index];
    if (slot?.reviewerBinding !== null
      || slot?.identityVerificationState !== "absent"
      || slot?.credentialVerificationState !== "absent"
      || slot?.scopeVerificationState !== "absent"
      || slot?.independenceVerificationState !== "absent"
      || slot?.originalOpinionDigest !== null
      || slot?.originalOpinionStored !== false
      || slot?.submittedAt !== null
      || slot?.priorExposureToOtherOpinion !== null
      || slot?.status !== "vacant") {
      fail("HISTORICAL_PACKET_SLOT_DRIFT", "历史 expert packet 两席必须保持 vacant/absent/null。");
    }
  }

  const gapSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_GAP.path);
  if (gapSnapshot.rawBytes !== HISTORICAL_GAP.rawBytes
    || gapSnapshot.rawSha256 !== HISTORICAL_GAP.rawSha256) {
    fail("HISTORICAL_GAP_RAW_DRIFT", "历史 expert intake gap raw identity 漂移。");
  }
  const gap = parseBaziDttStrictJsonArtifact(gapSnapshot);
  const unsignedGap = cloneJson(gap);
  delete unsignedGap.ledgerDigest;
  assertZeroInstances(gap);
  const questionIds = [];
  for (let index = 0; index < packet.reviewQuestions.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, questionIds, [packet.reviewQuestions[index].questionId]);
  }
  if (gap.schemaVersion !== HISTORICAL_GAP.schemaVersion
    || gap.recordType !== HISTORICAL_GAP.recordType
    || gap.ledgerId !== HISTORICAL_GAP.ledgerId
    || gap.ledgerDigest !== HISTORICAL_GAP.ledgerDigest
    || gap.status !== HISTORICAL_GAP.status
    || sha256Text(canonicalStringify(unsignedGap)) !== gap.ledgerDigest
    || !exactJson(gap.releaseGovernance, RELEASE_GOVERNANCE)
    || !exactJson(gap.approvedPacketBinding, {
      path: HISTORICAL_PACKET.path,
      packetId: HISTORICAL_PACKET.packetId,
      packetDigest: HISTORICAL_PACKET.packetDigest,
      rawBytes: HISTORICAL_PACKET.rawBytes,
      rawSha256: HISTORICAL_PACKET.rawSha256
    })
    || !exactJson(gap.readinessLedgerBinding, HISTORICAL_GAP_READINESS)
    || !exactJson(gap.reviewQuestionIds, questionIds)
    || !exactJson(gap.independenceFactorIds, packet.independenceChecklist)
    || gap.candidateRecordFormats?.length !== 7
    || gap.currentReadiness?.packetArtifactLocksCurrent !== false
    || gap.currentReadiness?.bindingFrozenVerified !== 0
    || gap.currentReadiness?.bindingFrozenRequired !== 12
    || gap.currentReadiness?.sourceBindingClosureComplete !== false
    || gap.currentReadiness?.sourceRightsClosureComplete !== false
    || gap.currentReadiness?.candidateFeedbackCollectionReady !== false
    || gap.currentReadiness?.releaseClosureReviewReady !== false
    || gap.expertReviewBundle?.state !== "absent"
    || gap.expertReviewBundle?.count !== 0
    || gap.expertReviewBundle?.countsTowardExpertGate !== false
    || gap.expertReviewBundle?.contentTruthEstablished !== false
    || gap.expertReviewBundle?.expertTruthEstablished !== false
    || gap.expertReviewBundle?.releaseReady !== false
    || gap.gapSummary?.currentRecordInstances !== 0
    || gap.gapSummary?.currentSealedOriginalOpinions !== 0
    || gap.gapSummary?.currentIndependentExpertReviewsVerified !== 0
    || gap.gapSummary?.expertReviewBundleComplete !== false
    || gap.gapSummary?.candidateFeedbackCollectionReady !== false
    || gap.gapSummary?.releaseClosureReviewReady !== false
    || gap.gapSummary?.publicDeploymentAuthorized !== false
    || gap.gapSummary?.expertClaimsAuthorized !== false) {
    fail("HISTORICAL_GAP_SEMANTIC_DRIFT", "历史 expert intake gap semantic identity、cross-template 合同或红门漂移。");
  }
  return { packet, packetSnapshot, gap, gapSnapshot };
}

function buildPacketProjection(packet) {
  const locks = cloneJson(packet.artifactLocks);
  const sourceLock = findExactlyOne(
    locks,
    (entry) => entry?.artifactId === "source-binding-candidate-ledger",
    "packet source binding artifact lock"
  );
  sourceLock.path = SOURCE_V16.path;
  sourceLock.sha256 = SOURCE_V16.rawSha256;
  const rightsLock = findExactlyOne(
    locks,
    (entry) => entry?.artifactId === "source-rights-candidate-ledger",
    "packet source rights artifact lock"
  );
  rightsLock.path = RIGHTS_V12.path;
  rightsLock.sha256 = RIGHTS_V12.rawSha256;
  const sourceLedgerBindings = cloneJson(packet.sourceLedgerBindings);
  sourceLedgerBindings.sourceBindingLedgerId = SOURCE_V16.ledgerId;
  sourceLedgerBindings.sourceBindingLedgerDigest = SOURCE_V16.ledgerDigest;
  sourceLedgerBindings.sourceRightsLedgerId = RIGHTS_V12.ledgerId;
  sourceLedgerBindings.sourceRightsLedgerDigest = RIGHTS_V12.ledgerDigest;
  const unsigned = {
    projectionId: "hakimi.bazi.strength.expert-review-packet.version-aware-template-projection/1.1.0",
    projectionRole: "candidate_only_in_memory_template_projection_not_approved_or_standalone_packet",
    historicalPacketBinding: cloneJson(HISTORICAL_PACKET),
    artifactLocks: locks,
    sourceLedgerBindings,
    reviewScope: cloneJson(packet.reviewScope),
    reviewQuestions: cloneJson(packet.reviewQuestions),
    roleSeparation: cloneJson(packet.roleSeparation),
    identityPrivacyPolicy: cloneJson(packet.identityPrivacyPolicy),
    independenceChecklist: cloneJson(packet.independenceChecklist),
    reviewerSlots: cloneJson(packet.reviewerSlots),
    reviewProcess: cloneJson(packet.reviewProcess),
    disagreementPolicy: cloneJson(packet.disagreementPolicy),
    automatedResolutionPolicy: cloneJson(packet.automatedResolutionPolicy),
    historicalPacketGateSummaryTemplate: cloneJson(packet.gateSummary),
    historicalPacketDoesNotEstablish: cloneJson(packet.doesNotEstablish),
    sourceRightsArtifactLockSlotsRebound: 2,
    sourceRightsLedgerBindingSlotsRebound: 2,
    historicalPacketMutated: false,
    persistedAsStandalonePacket: false,
    countsAsApprovedPacket: false
  };
  return {
    ...unsigned,
    projectionDigest: domainSeparatedDigest(PACKET_PROJECTION_DIGEST_DOMAIN, unsigned)
  };
}

async function inspectProjectedArtifactLocks(workspaceRoot, artifactLocks) {
  const inspection = [];
  let matches = 0;
  let drifts = 0;
  for (let index = 0; index < artifactLocks.length; index += 1) {
    const lock = artifactLocks[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, lock.path);
    const lockCurrent = snapshot.rawSha256 === lock.sha256;
    if (lockCurrent) matches += 1;
    else drifts += 1;
    REFLECT_APPLY(ARRAY_PUSH, inspection, [{
      artifactId: lock.artifactId,
      path: lock.path,
      evidenceLayer: lock.evidenceLayer,
      lockedSha256: lock.sha256,
      observedBytes: snapshot.rawBytes,
      observedSha256: snapshot.rawSha256,
      lockCurrent
    }]);
  }
  if (artifactLocks.length !== 12 || inspection.length !== 12 || matches !== 11 || drifts !== 1) {
    fail("PROJECTED_ARTIFACT_LOCK_COUNTS_MISMATCH", "packet candidate projection 必须精确为 12 locks、11 current、1 drift。");
  }
  const drift = findExactlyOne(inspection, (entry) => entry.lockCurrent === false, "projected packet artifact drift");
  if (!exactJson(drift, {
    artifactId: BAZI_CORE_DRIFT.artifactId,
    path: BAZI_CORE_DRIFT.path,
    evidenceLayer: "engineering_input_fact_contract",
    lockedSha256: BAZI_CORE_DRIFT.lockedSha256,
    observedBytes: BAZI_CORE_DRIFT.observedBytes,
    observedSha256: BAZI_CORE_DRIFT.observedSha256,
    lockCurrent: false
  })) {
    fail("UNEXPECTED_PRODUCTION_ARTIFACT_DRIFT", "唯一 production artifact drift 必须保持为固定 bazi-core identity。");
  }
  return { inspection, matches, drifts };
}

function readinessBinding() {
  return {
    path: READINESS_V17.path,
    ledgerId: READINESS_V17.ledgerId,
    ledgerDigest: READINESS_V17.ledgerDigest,
    rawBytes: READINESS_V17.rawBytes,
    rawSha256: READINESS_V17.rawSha256
  };
}

async function buildExpectedBundle(workspaceRoot) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const supersessionTuple = assertSupersession(supersession);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const readinessTuple = assertReadiness(readiness);
  if (!exactJson(supersessionTuple, readinessTuple)) {
    fail("CROSS_BRAND_PARENT_TUPLE_MISMATCH", "supersession 与 readiness 品牌的 source/rights/receipt actual tuple 不一致。");
  }
  const historical = await readHistoricalTemplates(workspaceRoot);
  const packetProjection = buildPacketProjection(historical.packet);
  const lockState = await inspectProjectedArtifactLocks(workspaceRoot, packetProjection.artifactLocks);
  const intakeProjection = {
    projectionRole: "candidate_only_zero_instance_intake_contract_projection_not_collection_ready",
    approvedHistoricalPacketTemplateBinding: cloneJson(historical.gap.approvedPacketBinding),
    candidatePacketProjectionBinding: {
      projectionId: packetProjection.projectionId,
      projectionDigest: packetProjection.projectionDigest,
      persistedAsStandalonePacket: false,
      countsAsApprovedPacket: false
    },
    historicalReadinessLedgerBindingTemplate: cloneJson(HISTORICAL_GAP_READINESS),
    readinessLedgerBinding: readinessBinding(),
    readinessLedgerBindingSlotsRebound: 1,
    reviewQuestionIds: cloneJson(historical.gap.reviewQuestionIds),
    independenceFactorIds: cloneJson(historical.gap.independenceFactorIds),
    candidateRecordFormats: cloneJson(historical.gap.candidateRecordFormats),
    currentInstances: cloneJson(historical.gap.currentInstances),
    currentReadiness: {
      ...cloneJson(historical.gap.currentReadiness),
      packetArtifactLocksCurrent: false,
      bindingFrozenVerified: 0,
      bindingFrozenRequired: 12,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      candidateFeedbackCollectionReady: false,
      releaseClosureReviewReady: false
    },
    expertReviewBundle: cloneJson(historical.gap.expertReviewBundle),
    gapSummary: cloneJson(historical.gap.gapSummary),
    historicalGapDoesNotEstablish: cloneJson(historical.gap.doesNotEstablish)
  };
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "bazi_expert_review_intake_gap_version_aware_candidate_v1_1",
    ledgerId: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
    status: "candidate_only_version_aware_vacant_intake_not_collection_ready_artifact_drift",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: cloneJson(RELEASE_GOVERNANCE),
    historicalTemplateLineage: {
      packet: {
        ...cloneJson(HISTORICAL_PACKET),
        role: "fixed_raw_and_semantic_review_contract_template_only"
      },
      intakeGap: {
        ...cloneJson(HISTORICAL_GAP),
        role: "fixed_raw_and_semantic_zero_instance_intake_template_only"
      },
      historicalTemplateArtifactCount: 2,
      historicalArtifactsMutated: false,
      historicalFormalVerifierInvokedByThisCandidate: false,
      historicalFormalFailureResolvedByThisCandidate: false
    },
    dependencyBoundary: {
      sourceRightsSupersessionWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      verifiedUpstreamPrivateBrandCount: 2,
      historicalDirectParentSlotsRebound: 3,
      readinessLedgerBindingSlotsRebound: 1,
      supportingSupersessionReceiptArtifactCount: 1,
      currentSourceBindingParent: cloneJson(SOURCE_V16),
      currentSourceRightsParent: cloneJson(RIGHTS_V12),
      currentCandidateReadinessParent: cloneJson(READINESS_V17),
      supportingSupersessionReceipt: cloneJson(SUPERSESSION_RECEIPT),
      crossBrandActualSourceRightsReceiptTupleExact: true,
      readinessHistoricalPacketBasisRawIdentityExact: true,
      projectCopyMaterializationCandidateDependency: false,
      policyWeightsCandidateDependency: false,
      engineeringValueSubjectGapCandidateDependency: false,
      pr10bcCandidateDependency: false,
      activeAdmissionEffect: "none"
    },
    packetTemplateProjection: {
      ...packetProjection,
      artifactLockInspection: lockState.inspection,
      artifactLockSummary: {
        historicalPacketArtifactLockSlots: 12,
        sourceRightsArtifactLockSlotsRebound: 2,
        unchangedPacketArtifactLockSlotsChecked: 10,
        candidateProjectedArtifactLockExactMatches: lockState.matches,
        candidateProjectedArtifactLockDrifts: lockState.drifts,
        packetArtifactLocksCurrent: false,
        historicalPacketDeclaredArtifactLocksVerified: 12,
        historicalDeclaredCountInterpretedAsCurrentClaim: false
      }
    },
    intakeContractProjection: intakeProjection,
    gateSummary: {
      historicalTemplateArtifactCount: 2,
      historicalDirectParentSlotsRebound: 3,
      verifiedUpstreamPrivateBrandCount: 2,
      supportingSupersessionReceiptArtifactCount: 1,
      historicalPacketArtifactLockSlots: 12,
      sourceRightsArtifactLockSlotsRebound: 2,
      unchangedPacketArtifactLockSlotsChecked: 10,
      candidateProjectedArtifactLockExactMatches: 11,
      candidateProjectedArtifactLockDrifts: 1,
      packetArtifactLocksCurrent: false,
      domainExpertsRequired: 2,
      reviewerSlotsOccupied: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      candidateRecordFormatsDefined: 7,
      currentRecordInstances: 0,
      sealedOriginalOpinions: 0,
      independentExpertReviewsVerified: 0,
      expertReviewBundleComplete: false,
      candidateFeedbackCollectionReady: false,
      countsTowardExpertGate: false,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      formalAdmissionPromotionBlocked: true,
      formalActivationAllowed: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      activeAdmissionEffect: "none"
    },
    integrityBoundary: {
      historicalPacketHeldHandleRawAndStrictSemanticIdentityVerified: true,
      historicalGapHeldHandleRawAndStrictSemanticIdentityVerified: true,
      candidateArtifactHeldHandleRawAndStrictSemanticIdentityRequiredByLoader: true,
      duplicateJsonKeysRejected: true,
      strictUtf8Required: true,
      nestedVerifierSameBufferTransitivityClaimed: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      digestDomain: CANDIDATE_DIGEST_DOMAIN,
      ledgerDigestIsDigitalSignature: false
    },
    authorityBoundary: {
      feedbackCollectionAuthorized: false,
      expertGateClosureAuthorized: false,
      formalActivationAllowed: false,
      bindingFreezeEffect: "none",
      rightsEffect: "none",
      legalConclusion: "not_established",
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "approved_or_active_expert_review_packet",
      "collection_ready_expert_intake",
      "real_reviewer_identity",
      "reviewer_credentials",
      "reviewer_independence",
      "expert_opinion_authenticity",
      "immutable_first_seen_chronology",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "cross_file_atomic_snapshot",
      "mutation_epoch_interval_or_aba_exclusion",
      "binding_freeze_or_expert_gate_closure",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  const ledger = deepFreeze({
    ...unsigned,
    ledgerDigest: computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(unsigned)
  });
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{ ledger, snapshot: snapshotForValue(ledger) }]);
}

function assertExpectedRawPins(snapshot, ledger) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "专家 intake v1.1 raw/semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "专家 intake v1.1 raw identity 漂移。");
  }
  if (ledger.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest
    || computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(ledger) !== ledger.ledgerDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "专家 intake v1.1 semantic digest 漂移。");
  }
}

export async function loadBaziExpertReviewIntakeGapVersionAwareCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.ledger)) {
    fail("EXPERT_INTAKE_V11_MISMATCH", "持久化 expert intake v1.1 不等于允许的 version-aware vacant projection。");
  }
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwareExpertReviewIntakeGapMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: {
      path: BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    historicalTemplateArtifactCount: 2,
    historicalDirectParentSlotsRebound: 3,
    verifiedUpstreamPrivateBrandCount: 2,
    supportingSupersessionReceiptArtifactCount: 1,
    historicalPacketArtifactLockSlots: 12,
    sourceRightsArtifactLockSlotsRebound: 2,
    unchangedPacketArtifactLockSlotsChecked: 10,
    candidateProjectedArtifactLockExactMatches: 11,
    candidateProjectedArtifactLockDrifts: 1,
    packetArtifactLocksCurrent: false,
    domainExpertsRequired: 2,
    reviewerSlotsOccupied: 0,
    candidateRecordFormatsDefined: 7,
    currentRecordInstances: 0,
    sealedOriginalOpinions: 0,
    independentExpertReviewsVerified: 0,
    expertReviewBundleComplete: false,
    candidateFeedbackCollectionReady: false,
    countsTowardExpertGate: false,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    formalAdmissionPromotionBlocked: true,
    formalActivationAllowed: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziExpertReviewIntakeGapVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  HISTORICAL_PACKET,
  HISTORICAL_GAP,
  HISTORICAL_GAP_READINESS,
  SOURCE_V16,
  RIGHTS_V12,
  READINESS_V17,
  SUPERSESSION_RECEIPT,
  BAZI_CORE_DRIFT,
  EXPECTED_PERSISTED,
  assertSupersession,
  assertReadiness,
  readHistoricalTemplates,
  buildPacketProjection,
  inspectProjectedArtifactLocks,
  buildExpectedBundle,
  serialize,
  exactJson
});
