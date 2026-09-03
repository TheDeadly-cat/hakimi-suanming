import { createHash } from "node:crypto";

import {
  BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  isVerifiedBaziSmtV10VersionedParentSupersession,
  loadBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";
import {
  BAZI_SOURCE_CARRIER_RECORD_READINESS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate,
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_ASSIGN = Object.assign;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NUMBER_IS_FINITE = Number.isFinite;
const OBJECT_IS = Object.is;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [UINT8_ARRAY_PROTOTYPE]);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;

export const BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.8.0.json";

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
const PREDECESSOR = OBJECT_FREEZE({
  path: BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const SMT_SUPERSESSION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json",
  rawBytes: 12256,
  rawSha256: "e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5",
  supersessionId: "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
  supersessionDigest: "a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd"
});
const CARRIER_READINESS = OBJECT_FREEZE({
  path: BAZI_SOURCE_CARRIER_RECORD_READINESS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  rawBytes: 18654,
  rawSha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
  ledgerId: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
  ledgerDigest: "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 35616,
  rawSha256: "f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3",
  ledgerDigest: "6ed301be956d160e06126eed63a7155ab8182adbcbc7e0def2690e8271e50866"
});
const LEDGER_ID = "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.8.0";
const OLD_SMT_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-candidate-v1";
const NEW_SMT_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-candidate-v2";
const SMT_BINDING_ID = "binding:smt-v10:whole-chart";
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziSmtV10VersionAwareBindingReadinessError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziSmtV10VersionAwareBindingReadinessError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziSmtV10VersionAwareBindingReadinessError(code, message, cause);
}

function ownValue(value, key) {
  const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
  if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_JSON", `字段 ${String(key)} 缺失或为 accessor。`);
  return descriptor.value;
}

function canonicalStringify(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_JSON_NUMBER", "只接受有限且不为负零的 JSON number。");
    }
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (typeof value !== "object") fail("NON_JSON_VALUE", "只接受被动 JSON 值。");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) fail("ALIASED_OR_CYCLIC_JSON", "拒绝 alias 或循环对象。");
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  if (isArray ? prototype !== ARRAY_PROTOTYPE : prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail("NON_CANONICAL_PROTOTYPE", "拒绝非 JSON 原生 prototype。");
  }
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  if (isArray) {
    if (ownKeys.length !== value.length + 1 || ownKeys[ownKeys.length - 1] !== "length") {
      fail("NON_CANONICAL_ARRAY", "数组只能包含连续索引和 length。");
    }
    let text = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (ownKeys[index] !== String(index)) fail("SPARSE_OR_EXOTIC_ARRAY", "拒绝稀疏或异形数组。");
      if (index > 0) text += ",";
      text += canonicalStringify(ownValue(value, String(index)), seen);
    }
    return `${text}]`;
  }
  const keys = [];
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key !== "string") fail("NON_JSON_KEY", "JSON 工件不能含 symbol key。");
    ownValue(value, key);
    REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
  }
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  let text = "{";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) text += ",";
    text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [keys[index]])}:${canonicalStringify(ownValue(value, keys[index]), seen)}`;
  }
  return `${text}}`;
}

function cloneJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_JSON", "只接受无 accessor 的 JSON 值。");
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Bytes(bytes) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function exact(left, right, label) {
  if (canonicalStringify(left) !== canonicalStringify(right)) fail("SEMANTIC_MISMATCH", `${label} 不匹配。`);
}

function serialize(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

function rawIdentity(snapshot) {
  return { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 };
}

function assertSnapshot(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("RAW_IDENTITY_MISMATCH", `${label} raw identity 漂移。`);
  }
}

function assertSemanticIdentity(value, expected, label) {
  if (ownValue(value, "ledgerId") !== expected.ledgerId || ownValue(value, "ledgerDigest") !== expected.ledgerDigest) {
    fail("SEMANTIC_IDENTITY_MISMATCH", `${label} semantic identity 漂移。`);
  }
}

export function computeBaziSmtV10VersionAwareBindingReadinessDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.ledgerDigest;
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [canonicalStringify(unsigned), "utf8"]);
  return sha256Bytes(bytes);
}

function assertVerifiedUpstreams(predecessor, supersession, carrier) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(predecessor)) {
    fail("PREDECESSOR_BRAND_REQUIRED", "必须消费 readiness 1.7 loader 的私有 WeakSet 品牌。");
  }
  if (!isVerifiedBaziSmtV10VersionedParentSupersession(supersession)) {
    fail("SMT_SUPERSESSION_BRAND_REQUIRED", "必须消费 SMT-v10 paired supersession 的私有 WeakSet 品牌。");
  }
  if (!isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(carrier)) {
    fail("CARRIER_READINESS_BRAND_REQUIRED", "必须消费 SourceCarrier readiness 1.1 的私有 WeakSet 品牌。");
  }
}

function assertUpstreamSummaries(predecessor, supersession, carrier) {
  if (predecessor.ledgerId !== PREDECESSOR.ledgerId || predecessor.ledgerDigest !== PREDECESSOR.ledgerDigest) {
    fail("PREDECESSOR_IDENTITY_MISMATCH", "readiness 1.7 品牌身份漂移。");
  }
  if (supersession.supersessionId !== SMT_SUPERSESSION.supersessionId
    || supersession.supersessionDigest !== SMT_SUPERSESSION.supersessionDigest
    || supersession.sourceLedgerId !== SOURCE_V17.ledgerId
    || supersession.sourceLedgerDigest !== SOURCE_V17.ledgerDigest
    || supersession.rightsLedgerId !== RIGHTS_V13.ledgerId
    || supersession.rightsLedgerDigest !== RIGHTS_V13.ledgerDigest
    || supersession.operatorRecordedCarrierRawBytes !== 8321599
    || supersession.operatorRecordedCarrierRawSha256 !== "d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe"
    || supersession.normalizedCollationCandidatesAdded !== 1
    || supersession.exactGlyphCandidatesAdded !== 1
    || supersession.formalSourceRightsRecordCount !== 0
    || supersession.formalSourceCarrierRecordCount !== 0
    || supersession.bindingFrozenVerified !== 0
    || supersession.activeAdmissionEffect !== undefined) {
    fail("SMT_SUPERSESSION_SUMMARY_MISMATCH", "SMT-v10 paired supersession 摘要不满足固定机械边界。");
  }
  if (carrier.ledgerId !== CARRIER_READINESS.ledgerId || carrier.ledgerDigest !== CARRIER_READINESS.ledgerDigest
    || carrier.carrierObservationLayers !== 6 || carrier.smtV10CarrierObservationLayers !== 2
    || carrier.dttCarrierObservationLayers !== 2 || carrier.sourceBindingParentVersion !== "1.7.0"
    || carrier.sourceRightsParentVersion !== "1.3.0" || carrier.materializationsVerified !== 0
    || carrier.formalSourceRightsRecordCount !== 0 || carrier.formalSourceCarrierRecordCount !== 0
    || carrier.bindingFrozenVerified !== 0 || carrier.activeAdmissionEffect !== "none"
    || carrier.releaseReady !== false || carrier.publicDeploymentAuthorized !== false
    || carrier.expertClaimsAuthorized !== false || carrier.crossFileAtomicSnapshot !== false
    || carrier.mutationEpochAvailableForSchema13 !== false || carrier.mutationEpochReceipt !== null
    || carrier.intervalMutationExcludedAcrossFiles !== false || carrier.abaExcluded !== false) {
    fail("CARRIER_READINESS_SUMMARY_MISMATCH", "SourceCarrier readiness 1.1 摘要不满足固定机械边界。");
  }
}

function assertPredecessorBindings(predecessorLedger, successorLedger) {
  if (predecessorLedger.bindings.length !== 12 || successorLedger.bindings.length !== 12) {
    fail("BINDING_COUNT_MISMATCH", "readiness 必须保持 12 条 binding。");
  }
  for (let index = 0; index < 12; index += 1) {
    const previous = predecessorLedger.bindings[index];
    const current = successorLedger.bindings[index];
    if (previous.bindingId !== current.bindingId || previous.order !== current.order) {
      fail("BINDING_ORDER_MISMATCH", `binding ordinal ${index + 1} 顺序或身份漂移。`);
    }
    if (index === 9) {
      const expected = cloneJson(previous);
      if (expected.bindingId !== SMT_BINDING_ID || expected.candidateIds.length !== 1
        || expected.candidateIds[0] !== OLD_SMT_CANDIDATE_ID) {
        fail("PREDECESSOR_SMT_ROW_MISMATCH", "readiness 1.7 SMT-v10 行不是固定 v1 父行。");
      }
      expected.candidateIds[0] = NEW_SMT_CANDIDATE_ID;
      exact(current, expected, "SMT-v10 v2 successor 行");
    } else {
      exact(current, previous, `未变 binding ordinal ${index + 1}`);
    }
  }
}

function buildExpectedLedger(predecessor, supersession, carrier, snapshots) {
  assertVerifiedUpstreams(predecessor, supersession, carrier);
  assertUpstreamSummaries(predecessor, supersession, carrier);
  const ledger = cloneJson(predecessor.readiness);
  ledger.schemaVersion = "1.8.0";
  ledger.recordType = "bazi_binding_freeze_smt_v10_version_aware_candidate_readiness_v1_8";
  ledger.ledgerId = LEDGER_ID;
  ledger.status = "candidate_readiness_only_smt_v10_parent_pair_rebound_formal_admission_blocked_bindings_frozen_0_of_12";
  ledger.createdAt = "2026-08-31T00:00:00.000Z";
  ledger.supersedes = {
    path: PREDECESSOR.path, rawBytes: PREDECESSOR.rawBytes, rawSha256: PREDECESSOR.rawSha256,
    ledgerId: PREDECESSOR.ledgerId, ledgerDigest: PREDECESSOR.ledgerDigest,
    status: predecessor.readiness.status, createdAt: predecessor.readiness.createdAt
  };
  if (ledger.basisArtifacts.length !== 9
    || ledger.basisArtifacts[5].path !== "content/bazi-strength-source-binding-candidates.v1.6.0.json"
    || ledger.basisArtifacts[6].path !== "content/bazi-strength-source-rights-candidates.v1.2.0.json") {
    fail("PREDECESSOR_BASIS_MISMATCH", "readiness 1.7 basis 位置漂移。");
  }
  ledger.basisArtifacts[5] = rawIdentity(snapshots.source);
  ledger.basisArtifacts[6] = rawIdentity(snapshots.rights);
  ledger.basisArtifacts.push(rawIdentity(snapshots.smtReceipt));
  ledger.basisArtifacts.push(rawIdentity(snapshots.carrierReadiness));
  ledger.bindings[9].candidateIds[0] = NEW_SMT_CANDIDATE_ID;
  ledger.smtV10VersionAwareRebindGate = {
    bindingId: SMT_BINDING_ID,
    predecessorCandidateId: OLD_SMT_CANDIDATE_ID,
    currentCandidateId: NEW_SMT_CANDIDATE_ID,
    sourceParent: { ledgerId: SOURCE_V17.ledgerId, ledgerDigest: SOURCE_V17.ledgerDigest },
    rightsParent: { ledgerId: RIGHTS_V13.ledgerId, ledgerDigest: RIGHTS_V13.ledgerDigest },
    pairedSupersession: {
      supersessionId: SMT_SUPERSESSION.supersessionId,
      supersessionDigest: SMT_SUPERSESSION.supersessionDigest
    },
    sourceCarrierReadiness: { ledgerId: CARRIER_READINESS.ledgerId, ledgerDigest: CARRIER_READINESS.ledgerDigest },
    carrierObservationLayersObserved: 6,
    visualPageCorrespondencesObserved: 9,
    normalizedFacsimileCollationCandidatesObserved: 8,
    exactGlyphFacsimileCorrespondenceCandidatesObserved: 2,
    candidateQuoteDigestsObserved: 6,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0,
    verifiedNaturalPersonRightsReviewers: 0,
    domainExpertReviewCount: 0,
    rightsLegalReviewCount: 0,
    bindingFrozenVerified: 0,
    sameEditionVerified: false,
    specificWikisourceCarrierProvenanceEstablished: false,
    externalCarrierLiveVerifiedThisRun: false,
    activeAdmissionEffect: "none",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  };
  REFLECT_APPLY(OBJECT_ASSIGN, Object, [ledger.gateSummary, {
    carrierObservationLayersObserved: 6,
    visualPageCorrespondencesObserved: 9,
    normalizedFacsimileCollationCandidatesObserved: 8,
    exactGlyphFacsimileCorrespondenceCandidatesObserved: 2,
    candidateQuoteDigestsObserved: 6,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0,
    verifiedNaturalPersonRightsReviewers: 0,
    domainExpertReviewCount: 0,
    rightsLegalReviewCount: 0
  }]);
  REFLECT_APPLY(OBJECT_ASSIGN, Object, [ledger.integrityBoundary, {
    predecessorReadinessWeakSetBrandVerified: true,
    smtV10PairedSupersessionWeakSetBrandVerified: true,
    sourceCarrierReadinessV11WeakSetBrandVerified: true,
    candidateReadinessBasisArtifactsPointInTimeRawVerified: 11,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  }]);
  if (ledger.releaseGovernance.activeLine !== "legacy-v13" || ledger.releaseGovernance.targetSchema !== 13
    || ledger.releaseGovernance.migrationId !== null) {
    fail("GOVERNANCE_MISMATCH", "release governance 必须保持 legacy-v13 / 13 / null。");
  }
  delete ledger.ledgerDigest;
  ledger.ledgerDigest = computeBaziSmtV10VersionAwareBindingReadinessDigest(ledger);
  assertPredecessorBindings(predecessor.readiness, ledger);
  return deepFreeze(ledger);
}

async function loadExpectedBundle(workspaceRoot) {
  const predecessor = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const supersession = await loadBaziSmtV10VersionedParentSupersession(workspaceRoot);
  const carrier = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);
  assertVerifiedUpstreams(predecessor, supersession, carrier);
  const source = await readBaziDttStableWorkspaceArtifact(workspaceRoot, SOURCE_V17.path);
  const rights = await readBaziDttStableWorkspaceArtifact(workspaceRoot, RIGHTS_V13.path);
  const predecessorArtifact = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  const smtReceipt = await readBaziDttStableWorkspaceArtifact(workspaceRoot, SMT_SUPERSESSION.path);
  const carrierReadiness = await readBaziDttStableWorkspaceArtifact(workspaceRoot, CARRIER_READINESS.path);
  assertSnapshot(source, SOURCE_V17, "source 1.7");
  assertSnapshot(rights, RIGHTS_V13, "rights 1.3");
  assertSnapshot(predecessorArtifact, PREDECESSOR, "readiness 1.7");
  assertSnapshot(smtReceipt, SMT_SUPERSESSION, "SMT-v10 paired supersession");
  assertSnapshot(carrierReadiness, CARRIER_READINESS, "SourceCarrier readiness 1.1");
  assertSemanticIdentity(parseBaziDttStrictJsonArtifact(source), SOURCE_V17, "source 1.7");
  assertSemanticIdentity(parseBaziDttStrictJsonArtifact(rights), RIGHTS_V13, "rights 1.3");
  assertSemanticIdentity(parseBaziDttStrictJsonArtifact(predecessorArtifact), PREDECESSOR, "readiness 1.7");
  assertSemanticIdentity(parseBaziDttStrictJsonArtifact(carrierReadiness), CARRIER_READINESS, "SourceCarrier readiness 1.1");
  const receipt = parseBaziDttStrictJsonArtifact(smtReceipt);
  if (receipt.supersessionId !== SMT_SUPERSESSION.supersessionId
    || receipt.supersessionDigest !== SMT_SUPERSESSION.supersessionDigest) {
    fail("SMT_RECEIPT_SEMANTIC_IDENTITY_MISMATCH", "SMT-v10 paired supersession semantic identity 漂移。");
  }
  const ledger = buildExpectedLedger(predecessor, supersession, carrier, { source, rights, smtReceipt, carrierReadiness });
  return OBJECT_FREEZE({ predecessor, ledger });
}

function assertPersistedSemantic(persisted, expected, predecessorLedger) {
  if (persisted.ledgerId !== LEDGER_ID
    || persisted.ledgerDigest !== computeBaziSmtV10VersionAwareBindingReadinessDigest(persisted)) {
    fail("PERSISTED_DIGEST_MISMATCH", "v1.8 ledger 身份或 digest 漂移。");
  }
  assertPredecessorBindings(predecessorLedger, persisted);
  exact(persisted, expected, "持久化 readiness v1.8");
}

export async function loadBaziSmtV10VersionAwareBindingReadiness(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedSemantic(persisted, expected.ledger, expected.predecessor.readiness);
  if (EXPECTED_PERSISTED.rawBytes <= 0 || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.ledgerDigest.length !== 64) fail("RAW_PIN_NOT_FROZEN", "v1.8 raw/semantic pin 尚未冻结。");
  assertSnapshot(snapshot, {
    path: BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH,
    rawBytes: EXPECTED_PERSISTED.rawBytes,
    rawSha256: EXPECTED_PERSISTED.rawSha256
  }, "readiness v1.8");
  if (persisted.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest) fail("FROZEN_DIGEST_MISMATCH", "v1.8 frozen digest 漂移。");
  const result = deepFreeze({
    versionAwareSmtV10BindingReadinessMechanicallyVerified: true,
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: rawIdentity(snapshot),
    sourceLedgerId: SOURCE_V17.ledgerId,
    sourceLedgerDigest: SOURCE_V17.ledgerDigest,
    rightsLedgerId: RIGHTS_V13.ledgerId,
    rightsLedgerDigest: RIGHTS_V13.ledgerDigest,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    carrierObservationLayersObserved: 6,
    visualPageCorrespondencesObserved: 9,
    normalizedFacsimileCollationCandidatesObserved: 8,
    exactGlyphFacsimileCorrespondenceCandidatesObserved: 2,
    candidateQuoteDigestsObserved: 6,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0,
    verifiedNaturalPersonRightsReviewers: 0,
    domainExpertReviewCount: 0,
    rightsLegalReviewCount: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false,
    sameEditionVerified: false,
    specificWikisourceCarrierProvenanceEstablished: false,
    externalCarrierLiveVerifiedThisRun: false,
    distributionPolicy: "link_only",
    activeAdmissionEffect: "none",
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

export function isVerifiedBaziSmtV10VersionAwareBindingReadiness(value) {
  return value !== null && typeof value === "object" && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziSmtV10VersionAwareBindingReadinessTestOnly = OBJECT_FREEZE({
  SOURCE_V17,
  RIGHTS_V13,
  PREDECESSOR,
  SMT_SUPERSESSION,
  CARRIER_READINESS,
  EXPECTED_PERSISTED,
  OLD_SMT_CANDIDATE_ID,
  NEW_SMT_CANDIDATE_ID,
  canonicalStringify,
  cloneJson,
  serialize,
  assertVerifiedUpstreams,
  assertPredecessorBindings,
  buildExpectedLedger,
  loadExpectedBundle,
  assertPersistedSemantic
});
