import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const IS_PROXY = utilTypes.isProxy;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
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
const STRING_REPEAT = String.prototype.repeat;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_HAS = Map.prototype.has;
const MAP_SET = Map.prototype.set;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const ZERO_SHA256 = "0000000000000000000000000000000000000000000000000000000000000000";
const VALUE_LIMITS = OBJECT_FREEZE({
  maxDepth: 96,
  maxTextCharacters: 5_000_000,
  maxValueNodes: 500_000
});

export const BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json";

const MANIFEST_ID = "hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0";
const CREATED_AT = "2026-08-31T15:00:00.000Z";
const HISTORICAL_FAILURE_CODE = "BOUND_READINESS_BASIS_DRIFT";
const READINESS_V19 = OBJECT_FREEZE({
  path: BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
  rawBytes: 45551,
  rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
  ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
});
const PREDECESSOR_V21 = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.1.0.json",
  rawBytes: 19064,
  rawSha256: "68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.1.0",
  manifestDigest: "f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2"
});
const CARRIER_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
  rawBytes: 18654,
  rawSha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
  ledgerId: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
  ledgerDigest: "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531",
  digestDomain: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.v1.1"
});
const RECONCILIATION_V1 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json",
  rawBytes: 10260,
  rawSha256: "f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17",
  ledgerId: "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0",
  ledgerDigest: "cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2",
  digestDomain: "hakimi.bazi.expert-privacy-formal-intake-reconciliation.v1"
});
const KNOWLEDGE_CORE = OBJECT_FREEZE({
  path: "packages/knowledge-core/src/index.ts",
  rawBytes: 41040,
  rawSha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
});
const WEB_AUDIT = OBJECT_FREEZE({
  path: "apps/web/bundled-knowledge-audit.ts",
  rawBytes: 12271,
  rawSha256: "d7d35bbfe5dfa50674f2d51667ea0c970cdb7e57082ac0d2fdca90e4888fb3c1"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 23399,
  rawSha256: "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d",
  manifestDigest: "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziDomainReleaseManifestV22Error extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "BaziDomainReleaseManifestV22Error";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziDomainReleaseManifestV22Error(code, message);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET(), budget = { valueNodes: 0 }, depth = 0) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) {
    fail("NON_PASSIVE_OBJECT", "manifest 不接受 Proxy。");
  }
  if (depth > VALUE_LIMITS.maxDepth) fail("VALUE_LIMIT_EXCEEDED", "manifest 超过最大深度。");
  budget.valueNodes += 1;
  if (budget.valueNodes > VALUE_LIMITS.maxValueNodes) {
    fail("VALUE_LIMIT_EXCEEDED", "manifest 超过最大节点数。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "manifest 只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen, budget, depth + 1);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const budget = { textCharacters: 0, valueNodes: 0 };
  function visit(current, depth = 0) {
    if (depth > VALUE_LIMITS.maxDepth) fail("VALUE_LIMIT_EXCEEDED", "canonical JSON 超过最大深度。");
    budget.valueNodes += 1;
    if (budget.valueNodes > VALUE_LIMITS.maxValueNodes) {
      fail("VALUE_LIMIT_EXCEEDED", "canonical JSON 超过最大节点数。");
    }
    if (typeof current === "string") {
      budget.textCharacters += current.length;
      if (budget.textCharacters > VALUE_LIMITS.maxTextCharacters) {
        fail("VALUE_LIMIT_EXCEEDED", "canonical JSON 超过最大文本量。");
      }
    }
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_VALUE", "非有限数值与 -0 不可进入 canonical JSON。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (current === null || typeof current !== "object") {
      fail("NON_JSON_VALUE", "只接受 JSON 原语、普通对象和数组。");
    }
    if (REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_PASSIVE_OBJECT", "canonical JSON 不接受 Proxy。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_TREE_JSON", "canonical JSON 不接受循环或对象别名。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]) !== ARRAY_PROTOTYPE) {
        fail("NON_PASSIVE_OBJECT", "canonical JSON 数组必须使用原生 Array prototype。");
      }
      if (keys.length !== current.length + 1 || keys[keys.length - 1] !== "length") {
        fail("NON_JSON_ARRAY_SHAPE", "数组必须稠密且无额外属性或 symbol。");
      }
      const values = [];
      for (let index = 0; index < current.length; index += 1) {
        const indexKey = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
        const descriptor = descriptors[indexKey];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_OBJECT", "数组不得含空洞或 accessor。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [values, indexKey, {
          value: visit(descriptor.value, depth + 1), writable: true, enumerable: true, configurable: true
        }]);
      }
      return `[${REFLECT_APPLY(ARRAY_JOIN, values, [","])}]`;
    }
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("NON_PASSIVE_OBJECT", "canonical JSON 只接受普通对象。");
    }
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") fail("NON_JSON_KEY", "canonical JSON 不接受 symbol key。");
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    const fields = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      budget.textCharacters += key.length;
      if (budget.textCharacters > VALUE_LIMITS.maxTextCharacters) {
        fail("VALUE_LIMIT_EXCEEDED", "canonical JSON 超过最大文本量。");
      }
      const descriptor = descriptors[key];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_OBJECT", "canonical JSON 不接受 accessor 或不可枚举字段。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [fields, REFLECT_APPLY(NATIVE_STRING, undefined, [index]), {
        value: `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptor.value, depth + 1)}`,
        writable: true, enumerable: true, configurable: true
      }]);
    }
    return `{${REFLECT_APPLY(ARRAY_JOIN, fields, [","])}}`;
  }
  return visit(value);
}

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function prettyStringifyPassive(value) {
  function indent(depth) {
    return REFLECT_APPLY(STRING_REPEAT, "  ", [depth]);
  }
  function visit(current, depth) {
    if (current === null || typeof current === "boolean"
      || typeof current === "string" || typeof current === "number") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (current.length === 0) return "[]";
      const lines = [];
      for (let index = 0; index < current.length; index += 1) {
        const key = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
        const descriptor = descriptors[key];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_PASSIVE_OBJECT", "pretty JSON 数组不得含空洞或 accessor。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, key, {
          value: `${indent(depth + 1)}${visit(descriptor.value, depth + 1)}`,
          writable: true, enumerable: true, configurable: true
        }]);
      }
      return `[\n${REFLECT_APPLY(ARRAY_JOIN, lines, [",\n"])}\n${indent(depth)}]`;
    }
    if (keys.length === 0) return "{}";
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    const lines = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (typeof key !== "string" || !descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
        fail("NON_PASSIVE_OBJECT", "pretty JSON 仅接受 data properties。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, REFLECT_APPLY(NATIVE_STRING, undefined, [index]), {
        value: `${indent(depth + 1)}${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}: ${visit(descriptor.value, depth + 1)}`,
        writable: true, enumerable: true, configurable: true
      }]);
    }
    return `{\n${REFLECT_APPLY(ARRAY_JOIN, lines, [",\n"])}\n${indent(depth)}}`;
  }
  canonicalStringify(value);
  return `${visit(value, 0)}\n`;
}

function sha256Text(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function equal(actual, expected, label, code = "BOUNDARY_MISMATCH") {
  if (actual !== expected) fail(code, `${label} 不符合固定边界。`);
}

function rawPin(pin) {
  return { path: pin.path, rawBytes: pin.rawBytes, sha256: pin.rawSha256 };
}

function assertSnapshot(snapshot, pin, label, code = "HISTORICAL_RAW_IDENTITY_MISMATCH") {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes
    || snapshot.rawSha256 !== pin.rawSha256) {
    fail(code, `${label} raw identity 漂移。`);
  }
}

function unsignedDigest(value, domain = null) {
  const unsigned = canonicalValue(value);
  delete unsigned.manifestDigest;
  delete unsigned.ledgerDigest;
  const canonical = canonicalStringify(unsigned);
  return domain === null ? sha256Text(canonical) : sha256Text(`${domain}\0${canonical}`);
}

function assertReadiness(readiness) {
  if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(readiness)) {
    fail("READINESS_V19_BRAND_REQUIRED", "v2.2 必须消费 readiness v1.9 full-loader 私有品牌。");
  }
  const boundary = (actual, expected, label) => equal(
    actual, expected, label, "READINESS_V19_BOUNDARY_MISMATCH"
  );
  boundary(readiness.ledgerId, READINESS_V19.ledgerId, "readiness id");
  boundary(readiness.ledgerDigest, READINESS_V19.ledgerDigest, "readiness digest");
  boundary(readiness.artifact?.path, READINESS_V19.path, "readiness artifact path");
  boundary(readiness.artifact?.bytes, READINESS_V19.rawBytes, "readiness artifact bytes");
  boundary(readiness.artifact?.sha256, READINESS_V19.rawSha256, "readiness artifact sha256");
  boundary(readiness.predecessorCurrent, false, "readiness predecessor current");
  boundary(readiness.predecessorPrivateBrandConsumed, false, "readiness predecessor brand");
  boundary(readiness.historicalObservationBrandCurrent, false, "historical observation brand current");
  boundary(readiness.historicalPrivateBrandsConsumed, 0, "historical private brand count");
  boundary(readiness.historicalUpstreamPrivateBrandsInvoked, false, "historical loader invocation");
  boundary(readiness.productionWebConsumerClosureEstablished, false, "production consumer closure");
  boundary(readiness.productionBodyInventoryAndBytesAudited, false, "production body audit");
  boundary(readiness.productionWebCallSitePinned, false, "production call-site pin");
  boundary(readiness.currentBuildGateExecuted, false, "current build gate execution");
  boundary(readiness.currentKnowledgeCoreIdentity?.path, KNOWLEDGE_CORE.path, "knowledge-core path");
  boundary(readiness.currentKnowledgeCoreIdentity?.bytes, KNOWLEDGE_CORE.rawBytes, "knowledge-core bytes");
  boundary(readiness.currentKnowledgeCoreIdentity?.sha256, KNOWLEDGE_CORE.rawSha256, "knowledge-core sha256");
  boundary(readiness.currentMachineIdentityRebindCount, 1, "machine identity rebind count");
  boundary(readiness.bindingRequired, 12, "binding required");
  boundary(readiness.bindingRowsChanged, 0, "binding rows changed");
  boundary(readiness.bindingFrozenVerified, 0, "binding frozen");
  boundary(readiness.carrierObservationLayersObserved, 6, "carrier observations");
  boundary(readiness.visualPageCorrespondencesObserved, 9, "visual correspondences");
  boundary(readiness.normalizedFacsimileCollationCandidatesObserved, 8, "normalized collations");
  boundary(readiness.exactGlyphFacsimileCorrespondenceCandidatesObserved, 2, "exact glyph candidates");
  boundary(readiness.candidateQuoteDigestsObserved, 6, "quote digests");
  const zeroCounters = [
    ["formal knowledge documents", readiness.formalKnowledgeDocumentCount],
    ["formal rights records", readiness.formalSourceRightsRecordCount],
    ["formal carrier records", readiness.formalSourceCarrierRecordCount],
    ["materialization records", readiness.projectCopyMaterializationRecordCount],
    ["verified materializations", readiness.materializationsVerified],
    ["natural-person rights reviewers", readiness.verifiedNaturalPersonRightsReviewers],
    ["domain expert reviews", readiness.domainExpertReviewCount],
    ["rights legal reviews", readiness.rightsLegalReviewCount]
  ];
  for (let index = 0; index < zeroCounters.length; index += 1) {
    boundary(zeroCounters[index][1], 0, zeroCounters[index][0]);
  }
  const falseGates = [
    ["source bundle complete", readiness.sourceBundleComplete],
    ["rights bundle complete", readiness.rightsBundleComplete],
    ["expert bundle complete", readiness.expertReviewBundleComplete],
    ["content truth", readiness.contentTruthEstablished],
    ["expert truth", readiness.expertTruthEstablished],
    ["rights legal conclusion", readiness.rightsLegalConclusionEstablished],
    ["release ready", readiness.releaseReady],
    ["public deployment", readiness.publicDeploymentAuthorized],
    ["expert claims", readiness.expertClaimsAuthorized],
    ["cross-file atomic snapshot", readiness.crossFileAtomicSnapshot],
    ["schema-13 epoch", readiness.mutationEpochAvailableForSchema13],
    ["interval mutation exclusion", readiness.intervalMutationExcludedAcrossFiles],
    ["ABA exclusion", readiness.abaExcluded]
  ];
  for (let index = 0; index < falseGates.length; index += 1) {
    boundary(falseGates[index][1], false, falseGates[index][0]);
  }
  boundary(readiness.activeAdmissionEffect, "none", "active admission effect");
  boundary(readiness.releaseIdentity, "legacy-v13", "release identity");
  boundary(readiness.targetSchema, 13, "target schema");
  boundary(readiness.migrationId, null, "migration id");
  boundary(readiness.mutationEpochReceipt, null, "mutation epoch receipt");
}

function assertHistoricalManifest(value) {
  const semantic = (actual, expected, label) => equal(
    actual, expected, label, "HISTORICAL_SEMANTIC_IDENTITY_MISMATCH"
  );
  semantic(value?.schemaVersion, "2.1.0", "v2.1 schema");
  semantic(value?.recordType, "system_domain_release_manifest", "v2.1 record type");
  semantic(value?.manifestId, PREDECESSOR_V21.manifestId, "v2.1 id");
  semantic(value?.manifestRevision, "2.1.0", "v2.1 revision");
  semantic(value?.manifestDigest, PREDECESSOR_V21.manifestDigest, "v2.1 digest pin");
  semantic(unsignedDigest(value), PREDECESSOR_V21.manifestDigest, "v2.1 self digest");
  semantic(value?.components?.length, 10, "v2.1 component count");
  semantic(value?.gateState?.bindingRequired, 12, "v2.1 binding required");
  semantic(value?.gateState?.bindingFrozenVerified, 0, "v2.1 binding frozen");
  semantic(value?.gateState?.formalKnowledgeDocuments, 0, "v2.1 knowledge records");
  semantic(value?.gateState?.formalSourceRightsRecords, 0, "v2.1 rights records");
  semantic(value?.gateState?.formalSourceCarrierRecords, 0, "v2.1 carrier records");
  semantic(value?.gateState?.independentExpertsRequired, 2, "v2.1 experts required");
  semantic(value?.gateState?.independentExpertReviewsVerified, 0, "v2.1 expert reviews");
  semantic(value?.authorityBoundary?.releaseReady, false, "v2.1 release ready");
  semantic(value?.authorityBoundary?.publicDeploymentAuthorized, false, "v2.1 public deployment");
  semantic(value?.authorityBoundary?.expertClaimsAuthorized, false, "v2.1 expert claims");
  semantic(value?.releaseGovernance?.releaseIdentity, "legacy-v13", "v2.1 release identity");
  semantic(value?.releaseGovernance?.targetSchema, 13, "v2.1 target schema");
  semantic(value?.releaseGovernance?.migrationId, null, "v2.1 migration id");
}

function assertHistoricalCarrier(value) {
  const semantic = (actual, expected, label) => equal(
    actual, expected, label, "HISTORICAL_SEMANTIC_IDENTITY_MISMATCH"
  );
  semantic(value?.schemaVersion, "1.1.0", "carrier schema");
  semantic(value?.ledgerId, CARRIER_V11.ledgerId, "carrier id");
  semantic(value?.ledgerDigest, CARRIER_V11.ledgerDigest, "carrier digest pin");
  semantic(unsignedDigest(value, CARRIER_V11.digestDomain), CARRIER_V11.ledgerDigest, "carrier self digest");
  semantic(value?.counts?.knowledgeDocuments, 0, "carrier knowledge documents");
  semantic(value?.counts?.formalSourceRightsRecords, 0, "carrier formal rights");
  semantic(value?.counts?.formalSourceCarrierRecords, 0, "carrier formal carriers");
  semantic(value?.counts?.sourceBindingsFrozen, 0, "carrier frozen bindings");
  semantic(value?.authorityBoundary?.activeAdmissionEffect, "none", "carrier admission effect");
  semantic(value?.authorityBoundary?.rightsLegalConclusionEstablished, false, "carrier legal conclusion");
  semantic(value?.authorityBoundary?.releaseReady, false, "carrier release ready");
  semantic(value?.releaseGovernance?.activeLine, "legacy-v13", "carrier release line");
  semantic(value?.releaseGovernance?.targetSchema, 13, "carrier schema target");
  semantic(value?.releaseGovernance?.migrationId, null, "carrier migration id");
}

function assertHistoricalReconciliation(value) {
  const semantic = (actual, expected, label) => equal(
    actual, expected, label, "HISTORICAL_SEMANTIC_IDENTITY_MISMATCH"
  );
  semantic(value?.schemaVersion, "1.0.0", "reconciliation schema");
  semantic(value?.ledgerId, RECONCILIATION_V1.ledgerId, "reconciliation id");
  semantic(value?.ledgerDigest, RECONCILIATION_V1.ledgerDigest, "reconciliation digest pin");
  semantic(unsignedDigest(value, RECONCILIATION_V1.digestDomain), RECONCILIATION_V1.ledgerDigest,
    "reconciliation self digest");
  semantic(value?.zeroInstanceGate?.bindingRequired, 12, "reconciliation binding required");
  semantic(value?.zeroInstanceGate?.bindingFrozenVerified, 0, "reconciliation frozen bindings");
  semantic(value?.zeroInstanceGate?.domainExpertsRequired, 2, "reconciliation experts required");
  semantic(value?.zeroInstanceGate?.reviewerSlotsOccupied, 0, "reconciliation reviewer slots");
  semantic(value?.zeroInstanceGate?.independentExpertReviewsVerified, 0, "reconciliation reviews");
  semantic(value?.zeroInstanceGate?.sealedOriginalOpinions, 0, "reconciliation sealed opinions");
  semantic(value?.formalIntakeDriftBoundary?.firstFailureCode, "INTAKE_GAP_BINDING_DRIFT",
    "reconciliation formal failure");
  semantic(value?.privacyBoundary?.personDataPresenceAssessed, false, "person-data assessment");
  semantic(value?.privacyBoundary?.personDerivedDigestExcluded, false, "person digest exclusion");
  semantic(value?.privacyBoundary?.safeToPublish, false, "privacy publication safety");
  semantic(value?.authorityBoundary?.collectionAuthorized, false, "collection authority");
  semantic(value?.authorityBoundary?.activeAdmissionEffect, "none", "reconciliation admission effect");
  semantic(value?.authorityBoundary?.releaseReady, false, "reconciliation release ready");
  semantic(value?.authorityBoundary?.publicDeploymentAuthorized, false, "reconciliation public deployment");
  semantic(value?.authorityBoundary?.expertClaimsAuthorized, false, "reconciliation expert claims");
}

async function loadVerifiedInputs(workspaceRoot) {
  const readiness = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assertReadiness(readiness);
  const predecessorSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR_V21.path);
  const carrierSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, CARRIER_V11.path);
  const reconciliationSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, RECONCILIATION_V1.path);
  assertSnapshot(predecessorSnapshot, PREDECESSOR_V21, "manifest v2.1");
  assertSnapshot(carrierSnapshot, CARRIER_V11, "carrier v1.1");
  assertSnapshot(reconciliationSnapshot, RECONCILIATION_V1, "privacy reconciliation v1");
  const predecessor = parseBaziDttStrictJsonArtifact(predecessorSnapshot);
  const carrier = parseBaziDttStrictJsonArtifact(carrierSnapshot);
  const reconciliation = parseBaziDttStrictJsonArtifact(reconciliationSnapshot);
  assertHistoricalManifest(predecessor);
  assertHistoricalCarrier(carrier);
  assertHistoricalReconciliation(reconciliation);
  return { readiness, predecessor, carrier, reconciliation };
}

function findComponentIndex(components, componentId) {
  let match = -1;
  for (let index = 0; index < components.length; index += 1) {
    if (components[index]?.componentId === componentId) {
      if (match !== -1) fail("COMPONENT_DUPLICATE", `组件 ${componentId} 重复。`);
      match = index;
    }
  }
  if (match === -1) fail("COMPONENT_MISSING", `组件 ${componentId} 缺失。`);
  return match;
}

function componentDigest(component) {
  return sha256Text(canonicalStringify({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  }));
}

export function computeBaziDomainReleaseManifestV22Digest(manifest) {
  if (manifest === null || typeof manifest !== "object" || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [manifest])) {
    fail("MANIFEST_INVALID", "manifest 必须是 plain object。");
  }
  return unsignedDigest(manifest);
}

function historicalContext(pin, kind, role) {
  return {
    contextId: pin[`${kind}Id`],
    contextDigest: pin[`${kind}Digest`],
    role,
    artifact: rawPin(pin),
    historicalRawIdentityVerified: true,
    historicalSelfDigestVerified: true,
    historicalSelectedRedSemanticsVerified: true,
    privateBrandVerified: false,
    brandCurrent: false,
    recursiveFullLoaderCurrent: false,
    recursiveFailureCode: HISTORICAL_FAILURE_CODE,
    activeAdmissionEffect: "none"
  };
}

function currentFileContext(pin, contextId, role) {
  return {
    contextId,
    contextDigest: pin.rawSha256,
    role,
    artifact: rawPin(pin),
    rawIdentityVerified: true,
    privateBrandApplicable: false,
    privateBrandVerified: false,
    brandCurrent: false,
    activeAdmissionEffect: "none"
  };
}

function buildFromVerifiedInputs(inputs) {
  const { readiness, predecessor, carrier, reconciliation } = inputs;
  assertReadiness(readiness);
  assertHistoricalManifest(predecessor);
  assertHistoricalCarrier(carrier);
  assertHistoricalReconciliation(reconciliation);

  const current = canonicalValue(predecessor);
  const predecessorComponents = canonicalValue(predecessor.components);
  const components = current.components;
  equal(components.length, 10, "predecessor component count", "PREDECESSOR_COMPONENT_DRIFT");
  const sourceIndex = findComponentIndex(components, "source_bundle");
  const rightsIndex = findComponentIndex(components, "rights_bundle");
  const oldSource = components[sourceIndex];
  const oldRights = components[rightsIndex];
  equal(oldSource.files.length, 5, "predecessor source file count", "PREDECESSOR_COMPONENT_DRIFT");
  equal(oldSource.files[2]?.path, "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
    "historical readiness position", "PREDECESSOR_COMPONENT_DRIFT");
  equal(oldRights.files.length, 4, "predecessor rights file count", "PREDECESSOR_COMPONENT_DRIFT");

  const source = {
    componentId: "source_bundle",
    version: "hakimi.bazi.strength.source-binding-candidates/1.7.0+binding-readiness/1.9.0",
    status: "incomplete_candidate_only_zero_frozen_bindings",
    files: [
      canonicalValue(oldSource.files[0]),
      canonicalValue(oldSource.files[1]),
      rawPin(READINESS_V19),
      canonicalValue(oldSource.files[3]),
      canonicalValue(oldSource.files[4])
    ]
  };
  source.digest = componentDigest(source);
  const rights = {
    componentId: "rights_bundle",
    version: "hakimi.bazi.strength.source-rights-candidates/1.3.0+source-carrier-readiness.version-aware-candidate/1.1.0+production-bundled-knowledge-contract/0.2.0",
    status: "incomplete_candidate_only_zero_formal_rights_or_carrier_records",
    files: [
      canonicalValue(oldRights.files[0]),
      canonicalValue(oldRights.files[1]),
      canonicalValue(oldRights.files[2]),
      canonicalValue(oldRights.files[3]),
      rawPin(KNOWLEDGE_CORE),
      rawPin(WEB_AUDIT)
    ]
  };
  rights.digest = componentDigest(rights);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [components, REFLECT_APPLY(NATIVE_STRING, undefined, [sourceIndex]), {
    value: source, writable: true, enumerable: true, configurable: true
  }]);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [components, REFLECT_APPLY(NATIVE_STRING, undefined, [rightsIndex]), {
    value: rights, writable: true, enumerable: true, configurable: true
  }]);
  for (let index = 0; index < components.length; index += 1) {
    if (index !== sourceIndex && index !== rightsIndex
      && !exactJson(components[index], predecessorComponents[index])) {
      fail("PREDECESSOR_COMPONENT_DRIFT", `组件 ${components[index]?.componentId ?? index} 不再精确继承 v2.1。`);
    }
  }

  current.schemaVersion = "2.2.0";
  current.manifestId = MANIFEST_ID;
  current.manifestRevision = "2.2.0";
  current.lineage = {
    supersedesForCurrentMachineIdentityOnly: {
      path: PREDECESSOR_V21.path,
      rawBytes: PREDECESSOR_V21.rawBytes,
      rawSha256: PREDECESSOR_V21.rawSha256,
      manifestId: PREDECESSOR_V21.manifestId,
      manifestDigest: PREDECESSOR_V21.manifestDigest
    },
    predecessorPreservedUnmodified: true,
    predecessorCurrent: false,
    predecessorComponentCount: 10,
    unchangedComponentCount: 8,
    reboundComponentIds: ["source_bundle", "rights_bundle"],
    directCurrentPrivateBrandCount: 1,
    historicalRawSemanticContextCount: 3,
    centralSystemAdmissionRegistryIntegrated: false,
    crossSystemEngineeringReceiptRegistryIntegrated: false
  };
  current.domainIdentity.sourceBundleVersion = source.version;
  current.domainIdentity.sourceBundleDigest = source.digest;
  current.domainIdentity.rightsBundleVersion = rights.version;
  current.domainIdentity.rightsBundleDigest = rights.digest;
  current.verifiedMechanicalContexts = [
    {
      contextId: READINESS_V19.ledgerId,
      contextDigest: READINESS_V19.ledgerDigest,
      role: "current_binding_readiness_v1_9_full_loader_private_brand",
      artifact: rawPin(READINESS_V19),
      privateBrandVerified: true,
      brandCurrent: true,
      recursiveFullLoaderCurrent: true,
      activeAdmissionEffect: "none"
    },
    historicalContext(PREDECESSOR_V21, "manifest", "historical_predecessor_manifest_raw_self_digest_and_red_semantics"),
    historicalContext(CARRIER_V11, "ledger", "historical_source_carrier_readiness_raw_self_digest_and_red_semantics"),
    historicalContext(RECONCILIATION_V1, "ledger", "historical_privacy_formal_intake_reconciliation_raw_self_digest_and_red_semantics"),
    currentFileContext(
      KNOWLEDGE_CORE,
      "hakimi.bazi.production-bundled-knowledge-manifest-metadata-contract/0.2.0",
      "current_production_manifest_metadata_contract_file_identity"
    ),
    currentFileContext(
      WEB_AUDIT,
      "hakimi.bazi.web-bundled-knowledge-audit-implementation/0.2.0",
      "current_web_bundled_knowledge_audit_implementation_file_identity"
    )
  ];
  current.gateState = {
    ...current.gateState,
    verifiedDirectParentPrivateBrands: 1,
    directCurrentPrivateBrandCount: 1,
    historicalRawSemanticContextsVerified: 3,
    bindingReadinessV19MechanicallyVerified: true,
    privacyFormalIntakeReconciliationMechanicallyVerified: false,
    historicalRecursiveFullLoadersCurrent: false,
    historicalRecursiveFullLoaderFailureCode: HISTORICAL_FAILURE_CODE,
    productionBundledKnowledgeManifestMetadataContractPinned: true,
    webBundledKnowledgeAuditImplementationPinned: true,
    productionWebConsumerClosureEstablished: false,
    productionWebCallSitePinned: false,
    productionBodyInventoryAndBytesAudited: false,
    currentBuildGateExecuted: false,
    stageCMaterialAdmissionCandidateActiveSurfaceIncluded: false,
    activeAdmissionEffect: "none"
  };
  current.snapshotBoundary = {
    ...current.snapshotBoundary,
    replayExcluded: false
  };
  current.evidenceLedger = {
    engineeringIdentity: "persisted_v2_2_manifest_one_current_private_brand_three_historical_raw_semantic_contexts_and_two_current_production_contract_file_identities_mechanically_verified",
    browserRuntimeEvidence: "not_assessed_in_domain_manifest_v2_2",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsLegalConclusion: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  };
  current.authorityBoundary = {
    ...current.authorityBoundary,
    persistedRealPersonInstancesAllowed: false,
    collectionAuthorized: false,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    safeToPublish: false
  };
  current.runtimeTrustBoundary = {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  };
  current.doesNotEstablish = [
    "domain_or_content_truth",
    "expert_identity_credentials_independence_opinion_or_truth",
    "source_freeze_or_rights_legal_conclusion",
    "browser_pwa_service_worker_or_runtime_validation",
    "cross_file_atomic_snapshot_or_schema13_mutation_epoch",
    "interval_mutation_aba_or_replay_exclusion",
    "owner_acceptance_for_release_candidate",
    "release_candidate_freeze_release_evidence_or_release_readiness",
    "public_release_deployment_or_expert_claims_authorization",
    "real_person_data_presence_or_person_derived_digest_exclusion",
    "collection_persistence_or_privacy_safe_to_publish_authority",
    "trusted_runtime_loader_launcher_cli_attestation_or_hidden_preload_exclusion",
    "historical_raw_or_semantic_identity_as_current_private_brand",
    "production_web_call_site_body_inventory_bytes_or_build_execution",
    "stage_c_material_admission_candidate_as_active_release_surface",
    "cross_system_authority_inheritance"
  ];
  current.releaseStatus = "engineering_candidate";
  current.createdAt = CREATED_AT;
  current.manifestDigest = computeBaziDomainReleaseManifestV22Digest(current);
  return deepFreeze(current);
}

async function verifyComponentFileIdentities(workspaceRoot, manifest) {
  const expectedByPath = new NATIVE_MAP();
  const expectedFiles = [];
  for (let componentIndex = 0; componentIndex < manifest.components.length; componentIndex += 1) {
    const component = manifest.components[componentIndex];
    for (let fileIndex = 0; fileIndex < component.files.length; fileIndex += 1) {
      const file = component.files[fileIndex];
      if (REFLECT_APPLY(MAP_HAS, expectedByPath, [file.path])) {
        const previous = REFLECT_APPLY(MAP_GET, expectedByPath, [file.path]);
        if (previous.rawBytes !== file.rawBytes || previous.sha256 !== file.sha256) {
          fail("COMPONENT_FILE_IDENTITY_CONFLICT", `组件间文件身份冲突：${file.path}`);
        }
      } else {
        REFLECT_APPLY(MAP_SET, expectedByPath, [file.path, file]);
        REFLECT_APPLY(ARRAY_PUSH, expectedFiles, [file]);
      }
    }
  }
  for (let index = 0; index < expectedFiles.length; index += 1) {
    const file = expectedFiles[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, file.path);
    if (snapshot.path !== file.path || snapshot.rawBytes !== file.rawBytes
      || snapshot.rawSha256 !== file.sha256) {
      fail("COMPONENT_FILE_IDENTITY_DRIFT", `当前组件文件 identity 漂移：${file.path}`);
    }
  }
  return expectedFiles.length;
}

export async function buildCurrentBaziDomainReleaseManifestV22(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const inputs = await loadVerifiedInputs(workspaceRoot);
  const manifest = buildFromVerifiedInputs(inputs);
  await verifyComponentFileIdentities(workspaceRoot, manifest);
  return manifest;
}

export function serializeBaziDomainReleaseManifestV22(manifest) {
  return prettyStringifyPassive(manifest);
}

function assertPersistedSemantic(persisted, expected) {
  equal(persisted.manifestId, MANIFEST_ID, "persisted manifest id", "MANIFEST_MISMATCH");
  equal(persisted.manifestDigest, computeBaziDomainReleaseManifestV22Digest(persisted),
    "persisted self digest", "MANIFEST_DIGEST_INVALID");
  if (!exactJson(persisted, expected)) {
    fail("MANIFEST_MISMATCH", "v2.2 manifest 与 v1.9 当前品牌、三份历史 identity 或组件重绑不一致。");
  }
}

function assertPersistedIdentity(snapshot, persisted) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256 === ZERO_SHA256
    || EXPECTED_PERSISTED.manifestDigest === ZERO_SHA256) {
    fail("PERSISTED_IDENTITY_UNPINNED", "v2.2 manifest 固定 raw identity 尚未写入 verifier。");
  }
  equal(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "persisted raw bytes", "PERSISTED_RAW_IDENTITY_MISMATCH");
  equal(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "persisted raw sha256", "PERSISTED_RAW_IDENTITY_MISMATCH");
  equal(persisted.manifestDigest, EXPECTED_PERSISTED.manifestDigest,
    "persisted manifest digest pin", "PERSISTED_DIGEST_MISMATCH");
}

function summaryFrom(result) {
  const gate = result.manifest.gateState;
  const snapshot = result.manifest.snapshotBoundary;
  const authority = result.manifest.authorityBoundary;
  const runtime = result.manifest.runtimeTrustBoundary;
  return deepFreeze({
    baziV17MachineIdentityManifestV22MechanicallyVerified: true,
    manifestId: result.manifestId,
    manifestDigest: result.manifestDigest,
    artifact: canonicalValue(result.artifact),
    directCurrentPrivateBrandCount: gate.directCurrentPrivateBrandCount,
    historicalRawSemanticContextsVerified: gate.historicalRawSemanticContextsVerified,
    bindingReadinessV19MechanicallyVerified: gate.bindingReadinessV19MechanicallyVerified,
    predecessorManifestV21BrandCurrent: false,
    sourceCarrierReadinessV11BrandCurrent: false,
    privacyFormalIntakeReconciliationBrandCurrent: false,
    historicalRecursiveFullLoadersCurrent: gate.historicalRecursiveFullLoadersCurrent,
    historicalRecursiveFullLoaderFailureCode: gate.historicalRecursiveFullLoaderFailureCode,
    productionBundledKnowledgeManifestMetadataContractPinned:
      gate.productionBundledKnowledgeManifestMetadataContractPinned,
    webBundledKnowledgeAuditImplementationPinned: gate.webBundledKnowledgeAuditImplementationPinned,
    productionWebConsumerClosureEstablished: gate.productionWebConsumerClosureEstablished,
    productionWebCallSitePinned: gate.productionWebCallSitePinned,
    productionBodyInventoryAndBytesAudited: gate.productionBodyInventoryAndBytesAudited,
    currentBuildGateExecuted: gate.currentBuildGateExecuted,
    stageCMaterialAdmissionCandidateActiveSurfaceIncluded:
      gate.stageCMaterialAdmissionCandidateActiveSurfaceIncluded,
    bindingRequired: gate.bindingRequired,
    bindingFrozenVerified: gate.bindingFrozenVerified,
    formalKnowledgeDocuments: gate.formalKnowledgeDocuments,
    formalSourceRightsRecords: gate.formalSourceRightsRecords,
    formalSourceCarrierRecords: gate.formalSourceCarrierRecords,
    independentExpertsRequired: gate.independentExpertsRequired,
    reviewerSlotsOccupied: gate.reviewerSlotsOccupied,
    independentExpertReviewsVerified: gate.independentExpertReviewsVerified,
    sealedOriginalOpinions: gate.sealedOriginalOpinions,
    candidateProjectedArtifactLockExactMatches: gate.candidateProjectedArtifactLockExactMatches,
    candidateProjectedArtifactLockDrifts: gate.candidateProjectedArtifactLockDrifts,
    packetArtifactLocksCurrent: gate.packetArtifactLocksCurrent,
    firstFormalParentFailureCode: gate.firstFormalParentFailureCode,
    currentOpaqueContextInstances: gate.currentOpaqueContextInstances,
    persistedRealPersonInstancesAllowed: authority.persistedRealPersonInstancesAllowed,
    collectionAuthorized: authority.collectionAuthorized,
    personDataPresenceAssessed: authority.personDataPresenceAssessed,
    personDerivedDigestExcluded: authority.personDerivedDigestExcluded,
    safeToPublish: authority.safeToPublish,
    contentTruthEstablished: false,
    expertTruthEstablished: authority.expertTruthEstablished,
    rightsLegalConclusionEstablished: authority.rightsLegalConclusionEstablished,
    releaseReady: authority.releaseReady,
    publicDeploymentAuthorized: authority.publicDeploymentAuthorized,
    expertClaimsAuthorized: authority.expertClaimsAuthorized,
    activeAdmissionEffect: gate.activeAdmissionEffect,
    releaseIdentity: result.manifest.releaseGovernance.releaseIdentity,
    targetSchema: result.manifest.releaseGovernance.targetSchema,
    migrationId: result.manifest.releaseGovernance.migrationId,
    crossFileAtomicSnapshot: snapshot.crossFileAtomicSnapshot,
    mutationEpochAvailableForSchema13: snapshot.mutationEpochAvailableForSchema13,
    mutationEpochReceipt: snapshot.mutationEpochReceipt,
    intervalMutationExcludedAcrossFiles: snapshot.intervalMutationExcludedAcrossFiles,
    abaExcluded: snapshot.abaExcluded,
    replayExcluded: snapshot.replayExcluded,
    hiddenPreloadExcluded: runtime.hiddenPreloadExcluded,
    nodeRuntimeIdentityEstablished: runtime.nodeRuntimeIdentityEstablished,
    loaderIdentityEstablished: runtime.loaderIdentityEstablished,
    runtimeLauncherIdentityEstablished: runtime.runtimeLauncherIdentityEstablished,
    cliOutputTrustedAttestation: runtime.cliOutputTrustedAttestation,
    visibleLoaderGuardIsSecurityBoundary: runtime.visibleLoaderGuardIsSecurityBoundary,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution:
      runtime.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution,
    centralSystemAdmissionRegistryIntegrated: result.manifest.lineage.centralSystemAdmissionRegistryIntegrated,
    crossSystemEngineeringReceiptRegistryIntegrated:
      result.manifest.lineage.crossSystemEngineeringReceiptRegistryIntegrated
  });
}

export async function loadBaziDomainReleaseManifestV22(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const inputs = await loadVerifiedInputs(workspaceRoot);
  const expected = buildFromVerifiedInputs(inputs);
  await verifyComponentFileIdentities(workspaceRoot, expected);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, persisted);
  assertPersistedSemantic(persisted, expected);
  const result = deepFreeze({
    manifest: persisted,
    manifestId: persisted.manifestId,
    manifestDigest: persisted.manifestDigest,
    artifact: {
      path: snapshot.path,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestV22(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziDomainReleaseManifestV22Summary(value) {
  if (!isVerifiedBaziDomainReleaseManifestV22(value)) {
    fail("MANIFEST_V22_BRAND_REQUIRED", "summary 只接受本模块 full-loader 私有品牌。");
  }
  return summaryFrom(value);
}

export const baziDomainReleaseManifestV22TestOnly = OBJECT_FREEZE({
  READINESS_V19,
  PREDECESSOR_V21,
  CARRIER_V11,
  RECONCILIATION_V1,
  KNOWLEDGE_CORE,
  WEB_AUDIT,
  EXPECTED_PERSISTED,
  HISTORICAL_FAILURE_CODE,
  canonicalStringify,
  canonicalValue,
  componentDigest,
  unsignedDigest,
  assertReadiness,
  assertHistoricalManifest,
  assertHistoricalCarrier,
  assertHistoricalReconciliation,
  buildFromVerifiedInputs,
  verifyComponentFileIdentities,
  assertPersistedSemantic
});
