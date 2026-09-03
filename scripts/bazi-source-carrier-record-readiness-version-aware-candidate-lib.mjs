import { createHash } from "node:crypto";

import {
  isVerifiedBaziSmtV10VersionedParentSupersession,
  loadBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";
import {
  getBaziSourceCarrierRecordReadinessSummary,
  isVerifiedBaziSourceCarrierRecordReadiness,
  loadBaziSourceCarrierRecordReadiness
} from "./bazi-source-carrier-record-readiness-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export const BAZI_SOURCE_CARRIER_RECORD_READINESS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json";

const LEDGER_ID = "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0";
const LEDGER_DIGEST_DOMAIN =
  "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.v1.1";
const ROW_DIGEST_DOMAIN =
  "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.row.v1";
const ROW_SET_DIGEST_DOMAIN =
  "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.row-set.v1";
const PROJECTION_DIGEST_DOMAIN =
  "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.projection.v1";

const SOURCE_V17 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.7.0.json",
  rawBytes: 58579,
  rawSha256: "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.7.0",
  ledgerDigest: "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9"
});
const RIGHTS_V13 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.3.0.json",
  rawBytes: 25852,
  rawSha256: "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.3.0",
  ledgerDigest: "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1"
});
const SUPERSESSION_RECEIPT = OBJECT_FREEZE({
  path: "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json",
  rawBytes: 12256,
  rawSha256: "e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5",
  supersessionId: "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
  supersessionDigest: "a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd"
});
const PREDECESSOR = OBJECT_FREEZE({
  path: "content/system-admission/bazi-source-carrier-record-readiness.v1.json",
  rawBytes: 27322,
  rawSha256: "d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9",
  ledgerId: "hakimi.bazi.source-carrier-record-readiness/1.0.0",
  ledgerDigest: "7b34f976c58b541895747177a2326af82241d76432acba3dbbd8fac2b68ad3c5"
});
const BINDING_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8",
  historicalSourceParentPath: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  historicalRightsParentPath: "content/bazi-strength-source-rights-candidates.v1.2.0.json"
});
const C_M1 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
  ledgerId: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
  ledgerDigest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f",
  historicalSourceParentPath: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  historicalRightsParentPath: "content/bazi-strength-source-rights-candidates.v1.2.0.json"
});
const ANCHOR = OBJECT_FREEZE({
  anchorId: "smt-v10-cadal-06056486-pages-3-4-facsimile-v1",
  carrierBytes: 8321599,
  carrierRawSha256: "d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe",
  carrierPageCount: 176
});
const SOURCE_CANDIDATES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
    candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d"
  }),
  OBJECT_FREEZE({
    candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59"
  }),
  OBJECT_FREEZE({
    candidateId: "smt-v5-wikisource-r2706483-candidate-v1",
    candidateDigest: "c9dead89c020772224db8e0802373797d939839b184a32ab0d6db05c7a2c2b62"
  }),
  OBJECT_FREEZE({
    candidateId: "yhzp-wikisource-r2593607-candidate-v1",
    candidateDigest: "8a2d7aa5705cd8735af2b9563bb094f09b0d9bcd9881bb6d711dc108f9fc0257"
  })
]);
const RIGHTS_CANDIDATES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
    sourceCandidateId: SOURCE_CANDIDATES[0].candidateId,
    candidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d"
  }),
  OBJECT_FREEZE({
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
    sourceCandidateId: SOURCE_CANDIDATES[1].candidateId,
    candidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
  }),
  OBJECT_FREEZE({
    rightsCandidateId: "smt-v5-wikisource-r2706483-rights-candidate-v1",
    sourceCandidateId: SOURCE_CANDIDATES[2].candidateId,
    candidateDigest: "4b6b1187147e81ecee5e7f45b219a7c627b7da3d63a845f6faaf192ee9480d43"
  }),
  OBJECT_FREEZE({
    rightsCandidateId: "yhzp-wikisource-r2593607-rights-candidate-v1",
    sourceCandidateId: SOURCE_CANDIDATES[3].candidateId,
    candidateDigest: "2a4ed5ce56564eac5813bdd75378fff0d3288b92d3f9d4bb46cd2429c9c0ad43"
  })
]);
const PROMOTION_BLOCKERS = OBJECT_FREEZE([
  "knowledge_document_absent",
  "formal_source_rights_record_absent",
  "formal_source_carrier_record_absent",
  "work_layer_not_cleared",
  "edition_or_transcription_layer_not_cleared",
  "carrier_layer_not_cleared",
  "jurisdiction_and_notice_applicability_not_adjudicated",
  "carrier_permission_matrix_not_adjudicated",
  "independent_rights_reviewer_identity_scope_and_independence_unverified",
  "carrier_custody_acquisition_and_access_record_absent",
  "normalized_text_content_digest_absent",
  "project_copy_materialization_absent",
  "platform_notice_is_observation_not_legal_conclusion",
  "carrier_raw_digest_is_not_normalized_document_digest"
]);
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 18654,
  rawSha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
  ledgerDigest: "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziSourceCarrierRecordReadinessVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziSourceCarrierRecordReadinessVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziSourceCarrierRecordReadinessVersionAwareCandidateError(code, message, cause);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  function visit(current) {
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])) fail("NON_JSON_VALUE", "非有限数值不可进入 canonical JSON。");
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (current === null || typeof current !== "object") fail("NON_JSON_VALUE", "只接受被动 JSON 值。");
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) fail("NON_TREE_JSON", "canonical JSON 不接受循环或对象别名。");
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
    const expectedPrototype = isArray ? ARRAY_PROTOTYPE : OBJECT_PROTOTYPE;
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if (prototype !== expectedPrototype && (!isArray && prototype !== null)) {
      fail("NON_PASSIVE_OBJECT", "canonical JSON 只接受普通对象或数组。");
    }
    if (isArray) {
      const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
      if (ownKeys.length !== current.length + 1 || ownKeys[ownKeys.length - 1] !== "length") {
        fail("NON_PASSIVE_OBJECT", "JSON 数组必须稠密且无额外属性。");
      }
      let text = "[";
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [current, String(index)]);
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_OBJECT", "JSON 数组不得含空洞或 accessor。");
        }
        if (index > 0) text += ",";
        text += visit(descriptor.value);
      }
      REFLECT_APPLY(WEAK_SET_DELETE, seen, [current]);
      return `${text}]`;
    }
    const keys = [];
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string") fail("NON_JSON_KEY", "canonical JSON 不接受 symbol key。");
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [current, key]);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_OBJECT", "canonical JSON 不接受 accessor 或不可枚举字段。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [current, key]);
      if (index > 0) text += ",";
      text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptor.value)}`;
    }
    REFLECT_APPLY(WEAK_SET_DELETE, seen, [current]);
    return `${text}}`;
  }
  return visit(value);
}

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "递归冻结拒绝 accessor。");
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function digest(domain, value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function serialize(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value), null, 2])}\n`;
}

function equal(actual, expected, label) {
  if (actual !== expected) fail("SEMANTIC_DRIFT", `${label} 漂移。`);
}

function exact(actual, expected, label) {
  if (canonicalStringify(actual) !== canonicalStringify(expected)) fail("EXPECTED_PROJECTION_MISMATCH", `${label} 不等于机械重建投影。`);
}

function findBy(array, key, expected, label) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [array])) fail("SHAPE_INVALID", `${label} 必须是数组。`);
  let found;
  for (let index = 0; index < array.length; index += 1) {
    if (array[index]?.[key] === expected) {
      if (found !== undefined) fail("SET_INVALID", `${label} 含重复 ${expected}。`);
      found = array[index];
    }
  }
  if (found === undefined) fail("SET_INVALID", `${label} 缺少 ${expected}。`);
  return found;
}

function assertSnapshot(snapshot, pin, label) {
  equal(snapshot.path, pin.path, `${label}.path`);
  equal(snapshot.rawBytes, pin.rawBytes, `${label}.rawBytes`);
  equal(snapshot.rawSha256, pin.rawSha256, `${label}.rawSha256`);
}

function assertZeroOrFalseBoundary(record, zeros, falses, label) {
  for (let index = 0; index < zeros.length; index += 1) equal(record?.[zeros[index]], 0, `${label}.${zeros[index]}`);
  for (let index = 0; index < falses.length; index += 1) equal(record?.[falses[index]], false, `${label}.${falses[index]}`);
}

function assertVerifiedUpstreams(supersession, predecessorCapability) {
  if (!isVerifiedBaziSmtV10VersionedParentSupersession(supersession)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "必须消费 SMT v10 supersession 私有 WeakSet 品牌。");
  }
  if (!isVerifiedBaziSourceCarrierRecordReadiness(predecessorCapability)) {
    fail("PREDECESSOR_BRAND_REQUIRED", "必须消费 predecessor readiness 私有品牌。");
  }
  const summary = getBaziSourceCarrierRecordReadinessSummary(predecessorCapability);
  equal(summary.ledgerId, PREDECESSOR.ledgerId, "predecessor brand ledgerId");
  equal(summary.ledgerDigest, PREDECESSOR.ledgerDigest, "predecessor brand ledgerDigest");
  equal(summary.carrierObservationLayers, 5, "predecessor brand rows");
  equal(summary.dttCarrierObservationLayers, 2, "predecessor brand DTT rows");
  assertZeroOrFalseBoundary(summary,
    ["formalSourceRightsRecords", "formalSourceCarrierRecords", "projectCopyMaterializationRecords", "materializationsVerified", "adjudicationReceiptsIssued", "verifiedRightsReviewers", "sourceBindingsFrozen"],
    ["releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized", "crossFileAtomicSnapshot", "mutationEpochAvailableForSchema13", "intervalMutationExcluded", "abaExcluded"],
    "predecessor brand");
  equal(summary.mutationEpochReceipt, null, "predecessor brand mutationEpochReceipt");
  equal(summary.activeAdmissionEffect, "none", "predecessor brand activeAdmissionEffect");
  equal(supersession.supersessionId, SUPERSESSION_RECEIPT.supersessionId, "supersession brand id");
  equal(supersession.supersessionDigest, SUPERSESSION_RECEIPT.supersessionDigest, "supersession brand digest");
  equal(supersession.sourceLedgerId, SOURCE_V17.ledgerId, "supersession brand source id");
  equal(supersession.sourceLedgerDigest, SOURCE_V17.ledgerDigest, "supersession brand source digest");
  equal(supersession.rightsLedgerId, RIGHTS_V13.ledgerId, "supersession brand rights id");
  equal(supersession.rightsLedgerDigest, RIGHTS_V13.ledgerDigest, "supersession brand rights digest");
  assertZeroOrFalseBoundary(supersession,
    ["humanFacsimileCollatorAttestations", "domainExpertReviewCount", "rightsLegalReviewCount", "formalKnowledgeDocumentCount", "formalSourceRightsRecordCount", "formalSourceCarrierRecordCount", "bindingFrozenVerified"],
    ["sameEditionVerified", "specificWikisourceCarrierProvenanceEstablished", "externalCarrierLiveVerifiedThisRun", "boundReadinessConsumesSupersedingParents", "sourceCarrierReadinessSuccessorCreated", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized", "crossFileAtomicSnapshot", "mutationEpochAvailable", "intervalMutationExcludedAcrossFiles", "abaExcluded"],
    "supersession brand");
  equal(supersession.bindingRequired, 12, "supersession brand bindingRequired");
  equal(supersession.boundReadinessStillPinsHistoricalParents, true, "supersession brand historical readiness parent");
  equal(supersession.operatorRecordedCarrierRawBytes, ANCHOR.carrierBytes, "supersession brand carrier bytes");
  equal(supersession.operatorRecordedCarrierRawSha256, ANCHOR.carrierRawSha256, "supersession brand carrier digest");
  equal(supersession.mutationEpochReceipt, null, "supersession brand mutationEpochReceipt");
}

function verifyInputs(source, rights, receipt, predecessor) {
  canonicalStringify(source);
  canonicalStringify(rights);
  canonicalStringify(receipt);
  canonicalStringify(predecessor);
  equal(source.ledgerId, SOURCE_V17.ledgerId, "source ledger id");
  equal(source.ledgerDigest, SOURCE_V17.ledgerDigest, "source ledger digest");
  equal(rights.ledgerId, RIGHTS_V13.ledgerId, "rights ledger id");
  equal(rights.ledgerDigest, RIGHTS_V13.ledgerDigest, "rights ledger digest");
  equal(receipt.supersessionId, SUPERSESSION_RECEIPT.supersessionId, "receipt id");
  equal(receipt.supersessionDigest, SUPERSESSION_RECEIPT.supersessionDigest, "receipt digest");
  equal(predecessor.ledgerId, PREDECESSOR.ledgerId, "predecessor id");
  equal(predecessor.ledgerDigest, PREDECESSOR.ledgerDigest, "predecessor digest");
  equal(digest("hakimi.bazi.source-carrier-record-readiness.v1", (() => {
    const unsigned = canonicalValue(predecessor);
    delete unsigned.ledgerDigest;
    return unsigned;
  })()), PREDECESSOR.ledgerDigest, "predecessor recomputed digest");
  equal(source.candidates?.length, 4, "source candidate family count");
  equal(rights.candidates?.length, 4, "rights candidate family count");
  for (let index = 0; index < SOURCE_CANDIDATES.length; index += 1) {
    const sourceCandidate = source.candidates[index];
    const sourcePin = SOURCE_CANDIDATES[index];
    const rightsCandidate = rights.candidates[index];
    const rightsPin = RIGHTS_CANDIDATES[index];
    equal(sourceCandidate?.candidateId, sourcePin.candidateId, `source candidate[${index}] id`);
    equal(sourceCandidate?.candidateDigest, sourcePin.candidateDigest, `source candidate[${index}] digest`);
    equal(rightsCandidate?.rightsCandidateId, rightsPin.rightsCandidateId, `rights candidate[${index}] id`);
    equal(rightsCandidate?.sourceCandidateId, rightsPin.sourceCandidateId, `rights candidate[${index}] source id`);
    equal(rightsCandidate?.candidateDigest, rightsPin.candidateDigest, `rights candidate[${index}] digest`);
  }
  equal(source.gateSummary?.corroboratingFacsimileAnchors, 6, "source carrier observations");
  equal(source.gateSummary?.bindingRequired, 12, "source bindingRequired");
  assertZeroOrFalseBoundary(source.gateSummary,
    ["bindingFrozenVerified", "sourceBodiesStored", "quoteTextsStored", "rightsReviewsVerified", "expertReviewsVerified"],
    ["sourceBundleComplete", "rightsBundleComplete", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"],
    "source gate");
  assertZeroOrFalseBoundary(rights.gateSummary,
    ["formalSourceRightsRecordsCreated", "formalSourceCarrierRecordsCreated", "legalReviewsVerified", "workLayersCleared", "editionLayersCleared", "carrierLayersCleared", "redistributableSources", "sourceBodiesStored", "quoteTextsStored", "carrierFilesStored"],
    ["rightsBundleComplete", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"],
    "rights gate");
  equal(receipt.subjectLock?.newAnchorId, ANCHOR.anchorId, "receipt anchor");
  equal(receipt.supersedingParents?.sourceBinding?.rawSha256, SOURCE_V17.rawSha256, "receipt source raw pin");
  equal(receipt.supersedingParents?.sourceRights?.rawSha256, RIGHTS_V13.rawSha256, "receipt rights raw pin");
  equal(receipt.evidenceChain?.commonsCarrier?.operatorRecordedCarrierRawBytes, ANCHOR.carrierBytes, "receipt carrier bytes");
  equal(receipt.evidenceChain?.commonsCarrier?.operatorRecordedCarrierRawSha256, ANCHOR.carrierRawSha256, "receipt carrier digest");
  equal(receipt.evidenceChain?.commonsCarrier?.carrierPageCount, ANCHOR.carrierPageCount, "receipt carrier pages");
  equal(receipt.editionAndProvenanceBoundary?.sameEditionVerified, false, "receipt same edition");
  equal(receipt.editionAndProvenanceBoundary?.specificWikisourceCarrierProvenanceEstablished, false, "receipt provenance");
  equal(receipt.formalAdmissionBoundary?.boundReadinessConsumesSupersedingParents, false, "binding readiness rebind");
  equal(receipt.formalAdmissionBoundary?.boundReadinessStillPinsHistoricalParents, true, "binding readiness historical parent");
  equal(receipt.formalAdmissionBoundary?.sourceCarrierReadinessSuccessorCreated, false, "historical receipt successor state");
  equal(predecessor.carrierGaps?.length, 5, "predecessor row count");
  equal(predecessor.counts?.distinctSourceCandidateFamilies, 4, "predecessor family count");
  equal(predecessor.counts?.dttCarrierObservationLayers, 2, "predecessor DTT rows");
  equal(predecessor.parentLocks?.sourceBinding?.path, BINDING_READINESS.historicalSourceParentPath, "predecessor source parent");
  equal(predecessor.parentLocks?.sourceRights?.path, BINDING_READINESS.historicalRightsParentPath, "predecessor rights parent");
  equal(predecessor.parentLocks?.bindingReadiness?.ledgerId, BINDING_READINESS.ledgerId, "predecessor binding readiness");
  const cM1 = findBy(predecessor.parentLocks?.supportingBasis, "ledgerId", C_M1.ledgerId, "predecessor supporting basis");
  equal(cM1.path, C_M1.path, "predecessor C-M1 path");
  assertZeroOrFalseBoundary(predecessor.counts,
    ["sourceBindingsFrozen", "knowledgeDocuments", "formalSourceRightsRecords", "formalSourceCarrierRecords", "projectCopyMaterializationRecords", "materializationsVerified", "adjudicationReceiptsIssued", "verifiedRightsReviewers", "workLayersCleared", "editionOrTranscriptionLayersCleared", "carrierLayersCleared", "redistributableSources"], [], "predecessor counts");
}

function buildFieldReadiness() {
  return {
    schemaVersion: "contract_observed_no_instance", recordType: "not_instantiated",
    carrierId: null, documentId: null, documentContentHash: null,
    carrierType: "not_formally_adjudicated", provider: "observed_candidate_not_formalized",
    sourceUrl: "observed_candidate_not_formalized", acquiredAt: null, accessMethod: null,
    contentDigest: null, imageDigest: "carrier_raw_sha256_observed_not_formalized", ocrDigest: null,
    rights: "unknown_not_adjudicated", storagePolicy: "link_only_candidate_default_not_formal_record",
    review: "unreviewed_zero_attestations", editVersion: null, createdAt: null, updatedAt: null,
    alignedSourceRightsRecordId: null, sourceCarrierRecordId: null,
    projectCopyMaterializationRecordId: null, adjudicationReceiptIds: [],
    formalRecordCreated: false, eligibleForMaterialization: false
  };
}

function buildSixthRow(source, rights) {
  const sourceCandidate = findBy(source.candidates, "candidateId", SOURCE_CANDIDATES[0].candidateId, "SMT source candidates");
  const rightsCandidate = findBy(rights.candidates, "rightsCandidateId", RIGHTS_CANDIDATES[0].rightsCandidateId, "SMT rights candidates");
  const sourceCarrier = findBy(sourceCandidate.facsimileAnchors, "anchorId", ANCHOR.anchorId, "SMT source anchors");
  const rightsCarrier = findBy(rightsCandidate.carrierLayers, "anchorId", ANCHOR.anchorId, "SMT rights carriers");
  for (const key of ["carrierFilePageId", "carrierFileTitle", "carrierDescriptionUrl", "carrierMediaWikiSha1", "carrierSha256"]) {
    equal(rightsCarrier[key], sourceCarrier[key], `sixth row ${key}`);
  }
  equal(sourceCarrier.carrierBytes, ANCHOR.carrierBytes, "sixth row carrier bytes");
  equal(sourceCarrier.carrierSha256, ANCHOR.carrierRawSha256, "sixth row carrier digest");
  equal(sourceCarrier.carrierPageCount, ANCHOR.carrierPageCount, "sixth row carrier pages");
  equal(sourceCarrier.storagePolicy, "link_only", "sixth row storage policy");
  equal(sourceCarrier.repositoryCarrierFileStored, false, "sixth row repository carrier");
  equal(sourceCarrier.repositoryPageImagesStored, false, "sixth row repository pages");
  equal(rightsCarrier.status, "notice_observed_not_cleared", "sixth row rights status");
  equal(rightsCarrier.rightsReviewerIds?.length, 0, "sixth row rights reviewers");
  return {
    rowId: `carrier-gap:${ANCHOR.anchorId}`, ordinal: 6,
    bindingId: sourceCandidate.bindingId, evidenceSubjectId: sourceCandidate.evidenceSubjectId,
    sourceId: sourceCandidate.sourceId, sourceCandidateId: sourceCandidate.candidateId,
    sourceCandidateDigest: sourceCandidate.candidateDigest,
    rightsCandidateId: rightsCandidate.rightsCandidateId,
    rightsCandidateDigest: rightsCandidate.candidateDigest,
    observedCarrierIdentity: {
      anchorId: ANCHOR.anchorId, anchorRole: sourceCarrier.anchorRole, provider: sourceCarrier.provider,
      carrierFilePageId: sourceCarrier.carrierFilePageId, carrierFileTitle: sourceCarrier.carrierFileTitle,
      carrierDescriptionUrl: sourceCarrier.carrierDescriptionUrl,
      carrierFileTimestamp: sourceCarrier.carrierFileTimestamp,
      carrierMediaWikiSha1: sourceCarrier.carrierMediaWikiSha1,
      carrierRawSha256: sourceCarrier.carrierSha256, carrierBytes: sourceCarrier.carrierBytes,
      carrierPageCount: sourceCarrier.carrierPageCount, carrierMime: sourceCarrier.carrierMime,
      licenseOrNoticeObserved: sourceCarrier.licenseOrNoticeObserved,
      sourceProvenanceObservation: sourceCarrier.sourceProvenanceObservation,
      editionRelation: sourceCarrier.editionRelation, comparisonScope: sourceCarrier.comparisonScope,
      exactCollationStatus: sourceCarrier.exactCollationStatus,
      repositoryCarrierFileStored: false, repositoryPageImagesStored: false, storagePolicy: "link_only",
      rightsNoticeState: rightsCarrier.noticeState, reusePolicyId: rightsCarrier.reusePolicyId,
      rightsStatus: rightsCarrier.status, rightsEvidenceRefCount: rightsCarrier.evidenceRefs.length,
      rightsEvidenceRefsDigest: digest("hakimi.bazi.carrier-rights-evidence-refs.v1", rightsCarrier.evidenceRefs),
      rightsReviewerIds: [], fixedFilePageRevisionId: rightsCarrier.fixedFilePageRevisionId,
      publicDomainMarkCountsAsLicense: false, markerAuthorityAndAccuracyVerified: false
    },
    targetFieldReadiness: buildFieldReadiness(), promotionBlockerCodes: [...PROMOTION_BLOCKERS],
    decision: {
      carrierByteIdentityObserved: true, carrierIdentityAdjudicated: false,
      workLayerCleared: false, editionOrTranscriptionLayerCleared: false, carrierLayerCleared: false,
      reproductionAllowed: false, quotationAllowed: false, redistributionAllowed: false,
      distributionPolicy: "link_only", legalConclusion: "not_established", admissionEffect: "none"
    }
  };
}

function rowLock(row, storage) {
  canonicalStringify(row);
  return {
    ordinal: row.ordinal, rowId: row.rowId, anchorId: row.observedCarrierIdentity.anchorId,
    fullRowDigest: digest(ROW_DIGEST_DOMAIN, row), fullRowAvailableVia: storage
  };
}

function buildCandidateLedger({ supersession, predecessorCapability, source, rights, receipt, predecessor }) {
  assertVerifiedUpstreams(supersession, predecessorCapability);
  verifyInputs(source, rights, receipt, predecessor);
  const predecessorRows = [];
  const predecessorTopLevelFieldNames = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [predecessor.carrierGaps[0]]);
  REFLECT_APPLY(ARRAY_SORT, predecessorTopLevelFieldNames, []);
  for (let index = 0; index < predecessor.carrierGaps.length; index += 1) {
    const row = predecessor.carrierGaps[index];
    equal(row.ordinal, index + 1, `predecessor row[${index}] ordinal`);
    const fieldNames = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [row]);
    REFLECT_APPLY(ARRAY_SORT, fieldNames, []);
    exact(fieldNames, predecessorTopLevelFieldNames, `predecessor row[${index}] top-level fields`);
    REFLECT_APPLY(ARRAY_PUSH, predecessorRows, [rowLock(row, PREDECESSOR.path)]);
  }
  const successorCarrierGap = buildSixthRow(source, rights);
  const successorRowLock = rowLock(successorCarrierGap, "successorCarrierGap");
  const projectionCore = {
    predecessorRawAndSemanticIdentityVerified: true,
    predecessorRowsCanonicalDigest: digest(ROW_SET_DIGEST_DOMAIN, predecessor.carrierGaps),
    predecessorRowCount: 5, predecessorFullRowsRepeatedInSuccessorArtifact: false,
    predecessorTopLevelFieldCount: predecessorTopLevelFieldNames.length,
    predecessorTopLevelFieldNames,
    rowDigestDomain: ROW_DIGEST_DOMAIN, everyPredecessorFieldPreservedByFullRowDigest: true,
    rows: predecessorRows
  };
  const projectionProof = {
    ...projectionCore,
    projectionDigest: digest(PROJECTION_DIGEST_DOMAIN, projectionCore)
  };
  const carrierGapSequence = [];
  for (const lock of [...predecessorRows, successorRowLock]) {
    REFLECT_APPLY(ARRAY_PUSH, carrierGapSequence, [{
      ordinal: lock.ordinal, rowId: lock.rowId, fullRowDigest: lock.fullRowDigest
    }]);
  }
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "bazi_source_carrier_record_readiness_version_aware_candidate_v1_1",
    ledgerId: LEDGER_ID,
    status: "candidate_only_version_aware_six_carrier_gap_inventory_zero_instance_no_admission_effect",
    createdAt: "2026-08-31T00:00:00.000Z",
    releaseGovernance: {
      activeLine: "legacy-v13", targetSchema: 13, migrationId: null,
      mutationEpochBoundaryRequired: true, publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    versionAwareParentRebind: {
      successorConsumesSupersedingParents: true, rebindScope: "this_successor_candidate_only",
      sourceBinding: { ...SOURCE_V17, candidateDigests: SOURCE_CANDIDATES },
      sourceRights: { ...RIGHTS_V13, candidateDigests: RIGHTS_CANDIDATES },
      supportingSupersessionReceipt: SUPERSESSION_RECEIPT,
      predecessorReadiness: PREDECESSOR,
      smtSupersessionWeakSetBrandVerified: true,
      predecessorReadinessPrivateBrandVerified: true,
      historicalParentArtifactsMutated: false, predecessorArtifactMutated: false
    },
    unreboundConsumers: {
      bindingReadiness: {
        ...BINDING_READINESS, consumesSupersedingParents: false,
        claimedToConsumeSupersedingParentsByThisSuccessor: false,
        observationBasis: "verified_supersession_receipt_and_predecessor_parent_lock"
      },
      projectCopyMaterializationCandidateCM1: {
        ...C_M1, consumesSupersedingParents: false,
        claimedToConsumeSupersedingParentsByThisSuccessor: false,
        currentArtifactReexecutedByThisLayer: false
      }
    },
    predecessorProjection: projectionProof,
    successorCarrierGap,
    carrierGapSequence,
    counts: {
      distinctSourceFamilies: 4, currentSourceCandidateFamilies: 4,
      versionedSourceCandidateIdentitiesReferenced: 5, carrierObservationLayers: 6,
      smtV10CarrierObservationLayers: 2, allSmtCarrierObservationLayersIncludingV5: 3,
      dttCarrierObservationLayers: 2, sourceBindingsRequired: 12, sourceBindingsFrozen: 0,
      knowledgeDocuments: 0, formalSourceRightsRecords: 0, formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0, materializationsVerified: 0,
      adjudicationReceiptsIssued: 0, verifiedNaturalPersonRightsReviewers: 0,
      domainExpertReviews: 0, rightsLegalReviews: 0, workLayersCleared: 0,
      editionOrTranscriptionLayersCleared: 0, carrierLayersCleared: 0, redistributableSources: 0
    },
    editionAndProvenanceBoundary: {
      sameEditionVerified: false, sameCopyVerified: false, bibliographicIdentityEstablished: false,
      specificWikisourceCarrierProvenanceEstablished: false, directDerivationChainEstablished: false,
      externalCarrierLiveVerifiedThisRun: false,
      observationSource: "persisted_operator_recorded_public_evidence_not_live_replayed_by_offline_loader"
    },
    reviewAndRightsBoundary: {
      rightsReviewerIds: [], expertReviewerIds: [], legalReviewerIds: [],
      verifiedNaturalPersonRightsReviewers: 0, domainExpertReviewCount: 0, rightsLegalReviewCount: 0,
      workLayerCleared: false, editionOrTranscriptionLayerCleared: false, carrierLayerCleared: false,
      reproductionAuthorized: false, quotationAuthorized: false, redistributionAuthorized: false,
      distributionPolicy: "link_only", legalConclusion: "not_established"
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256", digestDomain: LEDGER_DIGEST_DOMAIN,
      predecessorRowDigestDomain: ROW_DIGEST_DOMAIN, parentRawAndSemanticIdentityPinned: true,
      persistedChildMustEqualMechanicallyRebuiltExpected: true, stableSingleFileReadsUsed: true,
      endpointSnapshotOnly: true, crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false, mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false, abaExcluded: false,
      digestIsDigitalSignature: false, digitalSignature: null, signerIdentity: null
    },
    authorityBoundary: {
      rightsEffect: "none", bindingFreezeEffect: "none", contentTruthEstablished: false,
      baziRuleTruthEstablished: false, expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false, activeAdmissionEffect: "none",
      releaseReady: false, publicDeploymentAuthorized: false, expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "binding_readiness_or_c_m1_parent_rebind", "same_edition_same_copy_or_bibliographic_identity",
      "specific_wikisource_carrier_provenance_or_direct_derivation_chain",
      "external_carrier_live_verification_this_run", "formal_knowledge_document_source_rights_or_source_carrier_record",
      "project_copy_materialization_or_adjudication_receipt", "work_edition_transcription_or_carrier_rights_clearance",
      "reviewer_real_identity_credentials_scope_or_independence", "content_bazi_rule_or_expert_truth",
      "binding_freeze", "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
      "release_readiness_or_public_release_authorization"
    ]
  };
  return deepFreeze({ ...unsigned, ledgerDigest: computeBaziSourceCarrierRecordReadinessVersionAwareCandidateDigest(unsigned) });
}

export function computeBaziSourceCarrierRecordReadinessVersionAwareCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return digest(LEDGER_DIGEST_DOMAIN, unsigned);
}

async function loadExpectedBundle(workspaceRoot) {
  const supersession = await loadBaziSmtV10VersionedParentSupersession(workspaceRoot);
  const predecessorCapability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
  assertVerifiedUpstreams(supersession, predecessorCapability);
  const sourceSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, SOURCE_V17.path);
  const rightsSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, RIGHTS_V13.path);
  const receiptSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, SUPERSESSION_RECEIPT.path);
  const predecessorSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  assertSnapshot(sourceSnapshot, SOURCE_V17, "source v1.7");
  assertSnapshot(rightsSnapshot, RIGHTS_V13, "rights v1.3");
  assertSnapshot(receiptSnapshot, SUPERSESSION_RECEIPT, "SMT receipt");
  assertSnapshot(predecessorSnapshot, PREDECESSOR, "predecessor readiness");
  const ledger = buildCandidateLedger({
    supersession, predecessorCapability,
    source: parseBaziDttStrictJsonArtifact(sourceSnapshot),
    rights: parseBaziDttStrictJsonArtifact(rightsSnapshot),
    receipt: parseBaziDttStrictJsonArtifact(receiptSnapshot),
    predecessor: parseBaziDttStrictJsonArtifact(predecessorSnapshot)
  });
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(ledger), "utf8"]);
  return OBJECT_FREEZE({ ledger, bytes });
}

function assertPersistedCandidateSemantic(persisted, expected) {
  equal(persisted.ledgerId, LEDGER_ID, "persisted ledger id");
  equal(persisted.ledgerDigest, computeBaziSourceCarrierRecordReadinessVersionAwareCandidateDigest(persisted), "persisted ledger digest");
  exact(persisted, expected, "persisted successor");
}

function assertExpectedRawPins(snapshot, persisted) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || EXPECTED_PERSISTED.rawSha256.length !== 64 || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "successor raw/semantic identity 尚未冻结。");
  }
  equal(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "successor raw bytes");
  equal(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "successor raw sha256");
  equal(persisted.ledgerDigest, EXPECTED_PERSISTED.ledgerDigest, "successor frozen ledger digest");
}

export async function loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot = process.cwd()) {
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, BAZI_SOURCE_CARRIER_RECORD_READINESS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedCandidateSemantic(persisted, expected.ledger);
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwareSourceCarrierRecordReadinessMechanicallyVerified: true,
    ledgerId: persisted.ledgerId, ledgerDigest: persisted.ledgerDigest,
    artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    predecessorRowsPreservedByDigest: 5, carrierObservationLayers: 6,
    distinctSourceFamilies: 4, smtV10CarrierObservationLayers: 2, dttCarrierObservationLayers: 2,
    sourceBindingParentVersion: "1.7.0", sourceRightsParentVersion: "1.3.0",
    bindingReadinessConsumesSupersedingParents: false, cM1ConsumesSupersedingParents: false,
    formalKnowledgeDocumentCount: 0, formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0, projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0, bindingFrozenVerified: 0, bindingRequired: 12,
    verifiedNaturalPersonRightsReviewers: 0, domainExpertReviewCount: 0, rightsLegalReviewCount: 0,
    sameEditionVerified: false, specificWikisourceCarrierProvenanceEstablished: false,
    externalCarrierLiveVerifiedThisRun: false, activeAdmissionEffect: "none",
    releaseReady: false, publicDeploymentAuthorized: false, expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false, mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null, intervalMutationExcludedAcrossFiles: false, abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(value) {
  return value !== null && typeof value === "object" && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary(value) {
  if (!isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受本模块 loader 返回的 WeakSet 品牌对象。");
  }
  return deepFreeze(canonicalValue(value));
}

export const baziSourceCarrierRecordReadinessVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  SOURCE_V17, RIGHTS_V13, SUPERSESSION_RECEIPT, PREDECESSOR, BINDING_READINESS, C_M1, ANCHOR,
  SOURCE_CANDIDATES, RIGHTS_CANDIDATES, EXPECTED_PERSISTED, ROW_DIGEST_DOMAIN,
  canonicalStringify, serialize, digest, assertVerifiedUpstreams, verifyInputs,
  buildSixthRow, rowLock, buildCandidateLedger, loadExpectedBundle,
  assertPersistedCandidateSemantic
});
