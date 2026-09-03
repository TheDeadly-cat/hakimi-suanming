import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

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
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
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
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const SHA256 = /^[a-f0-9]{64}$/u;
const ZERO_SHA256 = "0000000000000000000000000000000000000000000000000000000000000000";
const BINDING_ROWS_CANONICAL_SHA256 =
  "2cd5d5c44b777cc71fa9c022e77b89598341a6aeab8f24c46eb8ccbb5d2b1794";
const REBOUND_BASIS_ARTIFACTS_CANONICAL_SHA256 =
  "28f72ce98e84ea272b3abb7bb59fb7baab2da1621f2342691fc9a2c66873d18f";

export const BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json";

const LEDGER_ID = "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0";
const CREATED_AT = "2026-08-31T14:00:00.000Z";
const PREDECESSOR = OBJECT_FREEZE({
  role: "binding_readiness_v1_8_predecessor",
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.8.0.json",
  rawBytes: 35616,
  rawSha256: "f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3",
  semanticIdField: "ledgerId",
  semanticId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.8.0",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "6ed301be956d160e06126eed63a7155ab8182adbcbc7e0def2690e8271e50866",
  status: "candidate_readiness_only_smt_v10_parent_pair_rebound_formal_admission_blocked_bindings_frozen_0_of_12",
  createdAt: "2026-08-31T00:00:00.000Z"
});

function semanticPin(role, path, rawBytes, rawSha256, semanticIdField, semanticId,
  semanticDigestField, semanticDigest) {
  return OBJECT_FREEZE({
    role, path, rawBytes, rawSha256, semanticIdField, semanticId,
    semanticDigestField, semanticDigest
  });
}

const HISTORICAL_SEMANTIC_CONTEXTS = OBJECT_FREEZE([
  semanticPin(
    "engineering_binding_candidates",
    "content/bazi-strength-engineering-binding-candidates.v1.json",
    21712,
    "95154d55d9e368351f5a69a1fa2ff63a51ba946d33a800dbd1f2460d9ac97b2f",
    "ledgerId",
    "hakimi.bazi.strength.engineering-binding-candidates/1.0.0",
    "ledgerDigest",
    "05ce9c6d9c03822cf246b0406d15616e8c4a6938650296135142827a00a5a28e"
  ),
  semanticPin(
    "expert_review_packet",
    "content/bazi-strength-expert-review-packet.v1.json",
    12684,
    "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
    "packetId",
    "hakimi.bazi.strength.expert-review-packet/1.5.0",
    "packetDigest",
    "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f"
  ),
  semanticPin(
    "source_binding_candidates_v1_7",
    "content/bazi-strength-source-binding-candidates.v1.7.0.json",
    58579,
    "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
    "ledgerId",
    "hakimi.bazi.strength.source-binding-candidates/1.7.0",
    "ledgerDigest",
    "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9"
  ),
  semanticPin(
    "source_rights_candidates_v1_3",
    "content/bazi-strength-source-rights-candidates.v1.3.0.json",
    25852,
    "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
    "ledgerId",
    "hakimi.bazi.strength.source-rights-candidates/1.3.0",
    "ledgerDigest",
    "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1"
  ),
  semanticPin(
    "dtt_notice_reconciliation_v2",
    "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
    8881,
    "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
    "reconciliationId",
    "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
    "reconciliationDigest",
    "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
  ),
  semanticPin(
    "dtt_versioned_parent_supersession_v1",
    "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
    9229,
    "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
    "supersessionId",
    "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
    "supersessionDigest",
    "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
  ),
  semanticPin(
    "smt_v10_versioned_parent_supersession_v1",
    "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json",
    12256,
    "e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5",
    "supersessionId",
    "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
    "supersessionDigest",
    "a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd"
  ),
  semanticPin(
    "source_carrier_record_readiness_v1_1",
    "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
    18654,
    "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
    "ledgerId",
    "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
    "ledgerDigest",
    "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
  )
]);

const HISTORICAL_RAW_CONTEXTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "strength_claim_registry",
    path: "packages/bazi-interpretation/src/strength-claim-registry.ts",
    rawBytes: 44959,
    rawSha256: "b08d4e6b0fb5c830b251e0c03ac49b7620729f223805b145b839a89245aa3888"
  }),
  OBJECT_FREEZE({
    role: "contracts",
    path: "packages/contracts/src/index.ts",
    rawBytes: 244747,
    rawSha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"
  })
]);

const PREVIOUS_KNOWLEDGE_CORE = OBJECT_FREEZE({
  path: "packages/knowledge-core/src/index.ts",
  rawBytes: 39595,
  rawSha256: "9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0"
});
const CURRENT_KNOWLEDGE_CORE = OBJECT_FREEZE({
  path: "packages/knowledge-core/src/index.ts",
  rawBytes: 41040,
  rawSha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 45551,
  rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
  ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziKnowledgeCoreIdentityReboundBindingReadinessError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziKnowledgeCoreIdentityReboundBindingReadinessError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziKnowledgeCoreIdentityReboundBindingReadinessError(code, message, cause);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  let nodes = 0;
  let textCodeUnits = 0;
  function visit(current, depth) {
    if (depth > 64) fail("NON_PASSIVE_JSON", "JSON 深度超过 64。 ");
    nodes += 1;
    if (nodes > 200000) fail("NON_PASSIVE_JSON", "JSON 节点超过上限。");
    if (current === null || typeof current === "boolean") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "string") {
      textCodeUnits += current.length;
      if (textCodeUnits > 4000000) fail("NON_PASSIVE_JSON", "JSON 文本超过上限。");
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_NUMBER", "JSON number 必须有限且不能为负零。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_PASSIVE_JSON", "只接受非 Proxy 的被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("ALIASED_OR_CYCLIC_JSON", "拒绝 alias 或循环 JSON 对象。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if (isArray ? prototype !== ARRAY_PROTOTYPE : prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("NON_CANONICAL_PROTOTYPE", "拒绝非 JSON 原生 prototype。");
    }
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") fail("NON_JSON_KEY", "JSON 工件不得含 symbol key。");
    }
    if (isArray) {
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length]) || length < 0
        || keys.length !== length + 1) {
        fail("NON_CANONICAL_ARRAY", "数组必须稠密且不得含额外属性。");
      }
      let output = "[";
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_JSON", "数组元素必须是可枚举 data property。");
        }
        if (index > 0) output += ",";
        output += visit(descriptor.value, depth + 1);
      }
      return `${output}]`;
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    let output = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_JSON", "对象字段必须是可枚举 data property。");
      }
      if (index > 0) output += ",";
      output += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptor.value, depth + 1)}`;
    }
    return `${output}}`;
  }
  return visit(value, 0);
}

function cloneJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) fail("NON_PASSIVE_JSON", "拒绝 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_JSON", "只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Bytes(bytes) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Canonical(value) {
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [canonicalStringify(value), "utf8"]));
}

function exact(left, right, label) {
  if (canonicalStringify(left) !== canonicalStringify(right)) {
    fail("SEMANTIC_MISMATCH", `${label} 不匹配。`);
  }
}

function serialize(value) {
  canonicalStringify(value);
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

function rawIdentity(pin) {
  return { path: pin.path, bytes: pin.rawBytes, sha256: pin.rawSha256 };
}

function assertSnapshot(snapshot, pin, label) {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes
    || snapshot.rawSha256 !== pin.rawSha256) {
    fail("RAW_IDENTITY_MISMATCH", `${label} raw identity 漂移。`);
  }
}

function assertSemantic(snapshot, pin, label) {
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  if (parsed?.[pin.semanticIdField] !== pin.semanticId
    || parsed?.[pin.semanticDigestField] !== pin.semanticDigest) {
    fail("SEMANTIC_IDENTITY_MISMATCH", `${label} semantic identity 漂移。`);
  }
  return parsed;
}

export function computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.ledgerDigest;
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [canonicalStringify(unsigned), "utf8"]));
}

function assertZeroAndFalseBoundary(predecessor) {
  const gate = predecessor.gateSummary;
  const smt = predecessor.smtV10VersionAwareRebindGate;
  const zeroFields = [
    "formalKnowledgeDocumentCount", "formalSourceRightsRecordCount",
    "formalSourceCarrierRecordCount", "projectCopyMaterializationRecordCount",
    "materializationsVerified", "verifiedNaturalPersonRightsReviewers",
    "domainExpertReviewCount", "rightsLegalReviewCount", "bindingFrozenVerified"
  ];
  for (let index = 0; index < zeroFields.length; index += 1) {
    if (gate?.[zeroFields[index]] !== 0 || smt?.[zeroFields[index]] !== 0) {
      fail("PREDECESSOR_RED_GATE_MISMATCH", `${zeroFields[index]} 必须保持 0。`);
    }
  }
  if (gate.bindingRequired !== 12 || gate.sourceBundleComplete !== false
    || gate.rightsBundleComplete !== false || gate.expertReviewBundleComplete !== false
    || gate.releaseReady !== false || smt.releaseReady !== false
    || smt.publicDeploymentAuthorized !== false || smt.expertClaimsAuthorized !== false) {
    fail("PREDECESSOR_RED_GATE_MISMATCH", "v1.8 权威与发布门必须保持红色。");
  }
}

function assertPredecessorBasisCrosswalk(predecessor) {
  const expected = [
    HISTORICAL_SEMANTIC_CONTEXTS[0],
    HISTORICAL_SEMANTIC_CONTEXTS[1],
    HISTORICAL_RAW_CONTEXTS[0],
    HISTORICAL_RAW_CONTEXTS[1],
    PREVIOUS_KNOWLEDGE_CORE,
    HISTORICAL_SEMANTIC_CONTEXTS[2],
    HISTORICAL_SEMANTIC_CONTEXTS[3],
    HISTORICAL_SEMANTIC_CONTEXTS[4],
    HISTORICAL_SEMANTIC_CONTEXTS[5],
    HISTORICAL_SEMANTIC_CONTEXTS[6],
    HISTORICAL_SEMANTIC_CONTEXTS[7]
  ];
  for (let index = 0; index < expected.length; index += 1) {
    exact(predecessor.basisArtifacts[index], rawIdentity(expected[index]),
      `v1.8 basis ordinal ${index + 1} crosswalk`);
  }
}

function assertPredecessor(predecessor) {
  if (predecessor?.ledgerId !== PREDECESSOR.semanticId
    || predecessor?.ledgerDigest !== PREDECESSOR.semanticDigest
    || computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(predecessor)
      !== PREDECESSOR.semanticDigest) {
    fail("PREDECESSOR_SEMANTIC_MISMATCH", "v1.8 predecessor semantic identity 漂移。");
  }
  if (predecessor.bindings?.length !== 12 || predecessor.basisArtifacts?.length !== 11) {
    fail("PREDECESSOR_SHAPE_MISMATCH", "v1.8 predecessor 必须包含 12 binding 与 11 basis。");
  }
  assertPredecessorBasisCrosswalk(predecessor);
  if (predecessor.releaseGovernance?.activeLine !== "legacy-v13"
    || predecessor.releaseGovernance?.targetSchema !== 13
    || predecessor.releaseGovernance?.migrationId !== null
    || predecessor.releaseGovernance?.publicDeploymentAuthorized !== false
    || predecessor.releaseGovernance?.expertClaimsAuthorized !== false) {
    fail("GOVERNANCE_MISMATCH", "release governance 必须保持 legacy-v13 / 13 / null 且无授权。");
  }
  assertZeroAndFalseBoundary(predecessor);
}

function historicalSemanticObservation(pin) {
  return {
    role: pin.role,
    artifact: rawIdentity(pin),
    semanticIdentity: {
      idField: pin.semanticIdField,
      id: pin.semanticId,
      digestField: pin.semanticDigestField,
      digest: pin.semanticDigest
    },
    observationMode: "fixed_raw_and_embedded_semantic_tuple_historical_context",
    brandCurrent: false,
    privateBrandConsumed: false,
    activeAdmissionEffect: "none"
  };
}

function historicalRawObservation(pin) {
  return {
    role: pin.role,
    artifact: rawIdentity(pin),
    observationMode: "fixed_raw_historical_context",
    brandCurrent: false,
    privateBrandConsumed: false,
    activeAdmissionEffect: "none"
  };
}

function buildHistoricalSemanticObservations() {
  const observations = [];
  for (let index = 0; index < HISTORICAL_SEMANTIC_CONTEXTS.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, observations, [
      historicalSemanticObservation(HISTORICAL_SEMANTIC_CONTEXTS[index])
    ]);
  }
  return observations;
}

function buildHistoricalRawObservations() {
  const observations = [];
  for (let index = 0; index < HISTORICAL_RAW_CONTEXTS.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, observations, [historicalRawObservation(HISTORICAL_RAW_CONTEXTS[index])]);
  }
  return observations;
}

function assertRowsAndCountsCopied(predecessor, successor) {
  exact(successor.bindings, predecessor.bindings, "12 binding rows");
  if (sha256Canonical(predecessor.bindings) !== BINDING_ROWS_CANONICAL_SHA256
    || sha256Canonical(successor.bindings) !== BINDING_ROWS_CANONICAL_SHA256) {
    fail("BINDING_ROWS_DIGEST_MISMATCH", "12 binding rows canonical identity 漂移。");
  }
  exact(successor.gateSummary, predecessor.gateSummary, "gate summary counts");
  exact(successor.dttNoticeReconciliationGate, predecessor.dttNoticeReconciliationGate,
    "DTT historical gate");
  exact(successor.smtV10VersionAwareRebindGate, predecessor.smtV10VersionAwareRebindGate,
    "SMT historical gate");
}

function assertOnlyKnowledgeCoreBasisChanged(predecessor, successor) {
  if (predecessor.basisArtifacts.length !== 11 || successor.basisArtifacts.length !== 11) {
    fail("BASIS_COUNT_MISMATCH", "predecessor 与 successor basis 必须各为 11 项。");
  }
  for (let index = 0; index < 11; index += 1) {
    exact(
      successor.basisArtifacts[index],
      index === 4 ? rawIdentity(CURRENT_KNOWLEDGE_CORE) : predecessor.basisArtifacts[index],
      `basis ordinal ${index + 1}`
    );
  }
  if (sha256Canonical(successor.basisArtifacts) !== REBOUND_BASIS_ARTIFACTS_CANONICAL_SHA256) {
    fail("BASIS_DIGEST_MISMATCH", "rebound basis canonical identity 漂移。");
  }
}

function assertIdentityReboundGate(ledger) {
  const lineage = ledger.lineage;
  const gate = ledger.knowledgeCoreIdentityReboundGate;
  if (lineage?.predecessorCurrent !== false
    || lineage?.predecessorPrivateBrandConsumed !== false
    || lineage?.historicalUpstreamPrivateBrandsInvoked !== false
    || lineage?.productionWebConsumerClosureEstablished !== false
    || lineage?.bindingRowsCopied !== 12 || lineage?.bindingRowsChanged !== 0
    || lineage?.gateSummaryFieldsChanged !== 0 || lineage?.currentMachineIdentityRebindCount !== 1) {
    fail("LINEAGE_BOUNDARY_MISMATCH", "v1.9 lineage current/history 边界漂移。");
  }
  exact(gate?.previousKnowledgeCoreIdentity, rawIdentity(PREVIOUS_KNOWLEDGE_CORE),
    "previous knowledge-core identity");
  exact(gate?.currentKnowledgeCoreIdentity, rawIdentity(CURRENT_KNOWLEDGE_CORE),
    "current knowledge-core identity");
  if (gate.currentKnowledgeCoreRawIdentityObserved !== true
    || gate.currentKnowledgeCorePrivateBrandAvailable !== false
    || gate.currentKnowledgeCorePrivateBrandConsumed !== false
    || gate.historicalObservationBrandCurrent !== false
    || gate.historicalPrivateBrandsConsumed !== 0
    || gate.historicalUpstreamPrivateBrandsInvoked !== false
    || gate.productionWebConsumerClosureEstablished !== false
    || gate.productionBodyInventoryAndBytesAudited !== false
    || gate.productionWebCallSitePinned !== false
    || gate.currentBuildGateExecuted !== false
    || gate.bindingRowsChanged !== 0
    || gate.bindingRowsCanonicalSha256 !== BINDING_ROWS_CANONICAL_SHA256
    || gate.basisArtifactsCanonicalSha256 !== REBOUND_BASIS_ARTIFACTS_CANONICAL_SHA256
    || gate.historicalSemanticObservations?.length !== HISTORICAL_SEMANTIC_CONTEXTS.length
    || gate.historicalRawObservations?.length !== HISTORICAL_RAW_CONTEXTS.length
    || gate.releaseReady !== false || gate.publicDeploymentAuthorized !== false
    || gate.expertClaimsAuthorized !== false || gate.activeAdmissionEffect !== "none") {
    fail("IDENTITY_REBOUND_GATE_MISMATCH", "knowledge-core identity rebound gate 漂移。");
  }
  exact(gate.historicalSemanticObservations, buildHistoricalSemanticObservations(),
    "historical embedded semantic tuple observations");
  exact(gate.historicalRawObservations, buildHistoricalRawObservations(),
    "historical raw observations");
  const integrity = ledger.integrityBoundary;
  if (integrity.reconciliationV2WeakSetBrandRequiredByLoader !== false
    || integrity.supersessionWeakSetBrandVerified !== false
    || integrity.predecessorReadinessWeakSetBrandVerified !== false
    || integrity.smtV10PairedSupersessionWeakSetBrandVerified !== false
    || integrity.sourceCarrierReadinessV11WeakSetBrandVerified !== false
    || integrity.currentPrivateBrandsConsumed !== 0
    || integrity.historicalUpstreamPrivateBrandsInvoked !== false
    || integrity.crossFileAtomicSnapshot !== false || integrity.mutationEpochAvailable !== false
    || integrity.mutationEpochReceipt !== null
    || integrity.intervalMutationExcludedAcrossFiles !== false || integrity.abaExcluded !== false) {
    fail("INTEGRITY_BOUNDARY_MISMATCH", "历史品牌或 mutation/atomic 边界漂移。");
  }
}

function buildExpectedLedger(predecessor) {
  assertPredecessor(predecessor);
  const ledger = cloneJson(predecessor);
  ledger.schemaVersion = "1.9.0";
  ledger.recordType = "bazi_binding_freeze_knowledge_core_identity_rebound_candidate_readiness_v1_9";
  ledger.ledgerId = LEDGER_ID;
  ledger.status =
    "candidate_readiness_only_knowledge_core_machine_identity_rebound_zero_binding_or_authority_progress";
  ledger.createdAt = CREATED_AT;
  ledger.supersedes = {
    path: PREDECESSOR.path,
    rawBytes: PREDECESSOR.rawBytes,
    rawSha256: PREDECESSOR.rawSha256,
    ledgerId: PREDECESSOR.semanticId,
    ledgerDigest: PREDECESSOR.semanticDigest,
    status: PREDECESSOR.status,
    createdAt: PREDECESSOR.createdAt
  };
  ledger.basisArtifacts[4] = rawIdentity(CURRENT_KNOWLEDGE_CORE);
  ledger.lineage = {
    predecessorPreservedUnmodified: true,
    predecessorCurrent: false,
    predecessorPrivateBrandConsumed: false,
    replacesOrMutatesPredecessor: false,
    currentMachineIdentityRebindCount: 1,
    currentMachineIdentityRebindPaths: [CURRENT_KNOWLEDGE_CORE.path],
    bindingRowsCopied: 12,
    bindingRowsChanged: 0,
    gateSummaryFieldsChanged: 0,
    historicalUpstreamPrivateBrandsInvoked: false,
    productionWebConsumerClosureEstablished: false
  };
  ledger.knowledgeCoreIdentityReboundGate = {
    previousKnowledgeCoreIdentity: rawIdentity(PREVIOUS_KNOWLEDGE_CORE),
    currentKnowledgeCoreIdentity: rawIdentity(CURRENT_KNOWLEDGE_CORE),
    currentKnowledgeCoreRawIdentityObserved: true,
    currentKnowledgeCorePrivateBrandAvailable: false,
    currentKnowledgeCorePrivateBrandConsumed: false,
    predecessorBasisArtifactIndex: 4,
    predecessorBasisArtifactCount: 11,
    successorBasisArtifactCount: 11,
    basisArtifactsOtherThanKnowledgeCoreChanged: 0,
    bindingRowsCanonicalSha256: BINDING_ROWS_CANONICAL_SHA256,
    basisArtifactsCanonicalSha256: REBOUND_BASIS_ARTIFACTS_CANONICAL_SHA256,
    bindingRowsChanged: 0,
    historicalSemanticObservations: buildHistoricalSemanticObservations(),
    historicalRawObservations: buildHistoricalRawObservations(),
    historicalObservationBrandCurrent: false,
    historicalPrivateBrandsConsumed: 0,
    historicalUpstreamPrivateBrandsInvoked: false,
    productionWebConsumerClosureEstablished: false,
    productionBodyInventoryAndBytesAudited: false,
    productionWebCallSitePinned: false,
    currentBuildGateExecuted: false,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0,
    verifiedNaturalPersonRightsReviewers: 0,
    domainExpertReviewCount: 0,
    rightsLegalReviewCount: 0,
    bindingFrozenVerified: 0,
    activeAdmissionEffect: "none",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  };
  ledger.integrityBoundary.reconciliationV2WeakSetBrandRequiredByLoader = false;
  ledger.integrityBoundary.supersessionWeakSetBrandVerified = false;
  ledger.integrityBoundary.predecessorReadinessWeakSetBrandVerified = false;
  ledger.integrityBoundary.smtV10PairedSupersessionWeakSetBrandVerified = false;
  ledger.integrityBoundary.sourceCarrierReadinessV11WeakSetBrandVerified = false;
  ledger.integrityBoundary.currentPrivateBrandsConsumed = 0;
  ledger.integrityBoundary.historicalUpstreamPrivateBrandsInvoked = false;
  ledger.integrityBoundary.fixedHistoricalRawAndEmbeddedSemanticTuplesObserved =
    HISTORICAL_SEMANTIC_CONTEXTS.length;
  ledger.integrityBoundary.fixedHistoricalRawOnlyObservationsVerified = HISTORICAL_RAW_CONTEXTS.length;
  ledger.integrityBoundary.currentKnowledgeCoreRawIdentityVerified = true;
  ledger.integrityBoundary.crossFileAtomicSnapshot = false;
  ledger.integrityBoundary.mutationEpochAvailable = false;
  ledger.integrityBoundary.mutationEpochReceipt = null;
  ledger.integrityBoundary.intervalMutationExcludedAcrossFiles = false;
  ledger.integrityBoundary.abaExcluded = false;
  ledger.evidenceLedger.engineeringReadinessIdentity =
    "v1_8_predecessor_self_digest_recomputed_historical_raw_and_embedded_semantic_tuples_observed_current_knowledge_core_raw_identity_rebound_verified";
  REFLECT_APPLY(ARRAY_PUSH, ledger.doesNotEstablish, [
    "historical_private_brand_currency_or_current_parent_authority",
    "knowledge_core_body_audit_or_bundled_material_admission"
  ]);
  delete ledger.ledgerDigest;
  ledger.ledgerDigest = computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(ledger);
  assertOnlyKnowledgeCoreBasisChanged(predecessor, ledger);
  assertRowsAndCountsCopied(predecessor, ledger);
  assertIdentityReboundGate(ledger);
  assertZeroAndFalseBoundary(ledger);
  return deepFreeze(ledger);
}

async function loadExpectedBundle(workspaceRoot) {
  const predecessorSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  assertSnapshot(predecessorSnapshot, PREDECESSOR, "v1.8 predecessor");
  const predecessor = assertSemantic(predecessorSnapshot, PREDECESSOR, "v1.8 predecessor");
  assertPredecessor(predecessor);

  const semanticSnapshots = [];
  for (let index = 0; index < HISTORICAL_SEMANTIC_CONTEXTS.length; index += 1) {
    const pin = HISTORICAL_SEMANTIC_CONTEXTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, pin.path);
    REFLECT_APPLY(ARRAY_PUSH, semanticSnapshots, [snapshot]);
    assertSnapshot(snapshot, pin, pin.role);
    assertSemantic(snapshot, pin, pin.role);
  }

  const rawSnapshots = [];
  for (let index = 0; index < HISTORICAL_RAW_CONTEXTS.length; index += 1) {
    const pin = HISTORICAL_RAW_CONTEXTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, pin.path);
    REFLECT_APPLY(ARRAY_PUSH, rawSnapshots, [snapshot]);
    assertSnapshot(snapshot, pin, pin.role);
  }

  const knowledgeCoreSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    CURRENT_KNOWLEDGE_CORE.path
  );
  assertSnapshot(knowledgeCoreSnapshot, CURRENT_KNOWLEDGE_CORE, "current knowledge-core");
  return OBJECT_FREEZE({ predecessor, ledger: buildExpectedLedger(predecessor) });
}

function assertPersistedSemantic(persisted, expected, predecessor) {
  if (persisted?.ledgerId !== LEDGER_ID
    || persisted?.ledgerDigest !== computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(persisted)) {
    fail("PERSISTED_DIGEST_MISMATCH", "v1.9 ledger 身份或 self digest 漂移。");
  }
  assertRowsAndCountsCopied(predecessor, persisted);
  assertOnlyKnowledgeCoreBasisChanged(predecessor, persisted);
  assertIdentityReboundGate(persisted);
  assertZeroAndFalseBoundary(persisted);
  exact(persisted, expected, "持久化 readiness v1.9");
}

export async function buildBaziKnowledgeCoreIdentityReboundBindingReadiness(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  return (await loadExpectedBundle(workspaceRoot)).ledger;
}

export function serializeBaziKnowledgeCoreIdentityReboundBindingReadiness(ledger) {
  return serialize(ledger);
}

export async function loadBaziKnowledgeCoreIdentityReboundBindingReadiness(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || !REFLECT_APPLY(SHA256.test, SHA256, [EXPECTED_PERSISTED.rawSha256])
    || EXPECTED_PERSISTED.rawSha256 === ZERO_SHA256
    || EXPECTED_PERSISTED.ledgerDigest === ZERO_SHA256) {
    fail("PERSISTED_IDENTITY_UNPINNED", "v1.9 raw/semantic identity 尚未冻结。");
  }
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH
  );
  assertSnapshot(snapshot, {
    path: BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
    rawBytes: EXPECTED_PERSISTED.rawBytes,
    rawSha256: EXPECTED_PERSISTED.rawSha256
  }, "readiness v1.9");
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (persisted.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest) {
    fail("FROZEN_DIGEST_MISMATCH", "v1.9 frozen semantic digest 漂移。");
  }
  assertPersistedSemantic(persisted, expected.ledger, expected.predecessor);
  const result = deepFreeze({
    knowledgeCoreIdentityReboundBindingReadinessMechanicallyVerified: true,
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: rawIdentity(snapshot),
    predecessorCurrent: false,
    predecessorPrivateBrandConsumed: false,
    historicalObservationBrandCurrent: false,
    historicalPrivateBrandsConsumed: 0,
    historicalUpstreamPrivateBrandsInvoked: false,
    productionWebConsumerClosureEstablished: false,
    productionBodyInventoryAndBytesAudited: false,
    productionWebCallSitePinned: false,
    currentBuildGateExecuted: false,
    currentKnowledgeCoreIdentity: cloneJson(persisted.knowledgeCoreIdentityReboundGate.currentKnowledgeCoreIdentity),
    currentMachineIdentityRebindCount: 1,
    bindingRequired: 12,
    bindingRowsChanged: 0,
    bindingFrozenVerified: 0,
    carrierObservationLayersObserved: persisted.gateSummary.carrierObservationLayersObserved,
    visualPageCorrespondencesObserved: persisted.gateSummary.visualPageCorrespondencesObserved,
    normalizedFacsimileCollationCandidatesObserved:
      persisted.gateSummary.normalizedFacsimileCollationCandidatesObserved,
    exactGlyphFacsimileCorrespondenceCandidatesObserved:
      persisted.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved,
    candidateQuoteDigestsObserved: persisted.gateSummary.candidateQuoteDigestsObserved,
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
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    activeAdmissionEffect: "none",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziKnowledgeCoreIdentityReboundBindingReadinessTestOnly = OBJECT_FREEZE({
  PREDECESSOR,
  HISTORICAL_SEMANTIC_CONTEXTS,
  HISTORICAL_RAW_CONTEXTS,
  PREVIOUS_KNOWLEDGE_CORE,
  CURRENT_KNOWLEDGE_CORE,
  EXPECTED_PERSISTED,
  canonicalStringify,
  cloneJson,
  assertSnapshot,
  assertPredecessor,
  assertPredecessorBasisCrosswalk,
  assertRowsAndCountsCopied,
  assertOnlyKnowledgeCoreBasisChanged,
  assertIdentityReboundGate,
  buildExpectedLedger,
  loadExpectedBundle,
  assertPersistedSemantic
});
