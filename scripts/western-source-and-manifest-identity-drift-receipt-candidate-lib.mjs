import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

export const WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json";

const CANDIDATE_ID =
  "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0";
const RECORD_TYPE =
  "western_source_and_manifest_identity_drift_receipt_candidate";
const STATUS =
  "current_append_only_western_source_and_manifest_identity_drift_observation_candidate_zero_admission_effect";
const CREATED_AT = "2026-09-01T10:30:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.western.source-and-manifest-identity-drift-receipt-candidate.v1";
const SOURCE_V11_DIGEST_PREFIX =
  "hakimi-western-source-binding-requirements-successor-candidate-v1\0";
const SOURCE_V12_DIGEST_PREFIX =
  "hakimi-western-source-binding-requirements-successor-candidate-v1.2\0";
const OBSERVATION_V11_DIGEST_DOMAIN =
  "hakimi.western.independent-productization.version-aware-observation-child.v1.1";
const HIGH_RISK_DIGEST_DOMAIN =
  "hakimi.western.high-risk-expression-policy-draft.v0.1";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_TO_STRING = Buffer.prototype.toString;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_ARRAY = Array;
const NATIVE_WEAK_SET = WeakSet;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const UTIL_IS_PROXY = nodeUtilTypes.isProxy;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;

const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET();

const FORMAL_SOURCE_CHAIN = OBJECT_FREEZE([
  OBJECT_FREEZE({
    versionRole: "formal_current_v1",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    rawBytes: 25_909,
    rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    ledgerId: "hakimi.western-astrology.source-binding-requirements/1.0.0",
    ledgerDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
    digestKind: "formal_v1"
  }),
  OBJECT_FREEZE({
    versionRole: "nonformal_successor_v1_1",
    path: "content/system-admission/western-source-binding-requirements.v1.1.0.json",
    rawBytes: 34_338,
    rawSha256: "7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc",
    ledgerId: "hakimi.western-astrology.source-binding-requirements/1.1.0",
    ledgerDigest: "254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db",
    digestKind: "successor_v1_1"
  }),
  OBJECT_FREEZE({
    versionRole: "nonformal_successor_v1_2",
    path: "content/system-admission/western-source-binding-requirements.v1.2.0.json",
    rawBytes: 40_667,
    rawSha256: "e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1",
    ledgerId: "hakimi.western-astrology.source-binding-requirements/1.2.0",
    ledgerDigest: "91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58",
    digestKind: "successor_v1_2"
  })
]);

const FORMAL_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
  rawBytes: 10_832,
  rawSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
  systemId: "western",
  surfaceId: "western-isolated-rules-preview-draft",
  manifestDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e"
});

const CURRENT_OBSERVATION = OBJECT_FREEZE({
  path: "content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json",
  rawBytes: 12_692,
  rawSha256: "140bed89a638deb970e1a60d3ffcbc96eebef509bd14bd692726b8c561d13593",
  candidateId: "hakimi.western.independent-productization.version-aware-observation-child/1.1.0",
  candidateDigest: "664bdbddd48bc0205eb6dba4cf923903a78d35e6d63ab29ca8e7de3faa5975af"
});

const HIGH_RISK_CANDIDATE = OBJECT_FREEZE({
  path: "content/system-admission/western-high-risk-expression-policy-draft.v0.1.0.json",
  rawBytes: 9_526,
  rawSha256: "caf4b85e9ce72d0aaaec1b57e5a634b4acf7d376ef39ff6f02b9cf84875d1485",
  candidateId: "hakimi.western.high-risk-expression-policy-draft/0.1.0",
  candidateDigest: "f04ac69f2eae777802dbe6946aeb1898eb21440f71d46cb0643b7e6fe38ca4ba"
});

const CURRENT_SOURCES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_contract_index",
    path: "packages/western-astrology-contracts-draft/src/index.ts",
    rawBytes: 39_756,
    rawSha256: "87bf4fcecc7ec85542eed25c7c06869ba3a084c5e7d7fb305fcd7712ef508416"
  }),
  OBJECT_FREEZE({
    role: "current_split_civil_input_contract",
    path: "packages/western-astrology-contracts-draft/src/civil-input.ts",
    rawBytes: 2_910,
    rawSha256: "e1e9cfa1f8f800e5c1ef61b7fdd134fcf0276664411c0691d64ccba21ed81458"
  }),
  OBJECT_FREEZE({
    role: "current_contract_focused_test",
    path: "packages/western-astrology-contracts-draft/src/index.test.ts",
    rawBytes: 18_738,
    rawSha256: "ff029f322cc3243a40ad174cbc0e96a23b40d7a5603a21d711cbb79f32eba2d0"
  }),
  OBJECT_FREEZE({
    role: "current_rules_preview_main",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
    rawBytes: 78_206,
    rawSha256: "37d85c18a7895e5f75d3e1fc6fa8435b2f5c10376d5b2e6296bd5801fd59a61b"
  }),
  OBJECT_FREEZE({
    role: "current_high_risk_expression_egress",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts",
    rawBytes: 22_464,
    rawSha256: "2edb1f38df4dd8854648bfbdd4b321e2e5fad8bbff3710eff009814ac15eedf8"
  })
]);

const CONTRACT_INDEX_DRIFT = OBJECT_FREEZE({
  path: CURRENT_SOURCES[0].path,
  persistedRawBytes: 41_394,
  persistedRawSha256: "3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515",
  currentRawBytes: CURRENT_SOURCES[0].rawBytes,
  currentRawSha256: CURRENT_SOURCES[0].rawSha256
});

const RULES_PREVIEW_MAIN_DRIFT = OBJECT_FREEZE({
  path: CURRENT_SOURCES[3].path,
  persistedRawSha256: "27284f9817d6b8414402b8fbedbcb06e49aab738115c084a55a6c0100357ea7e",
  currentRawBytes: CURRENT_SOURCES[3].rawBytes,
  currentRawSha256: CURRENT_SOURCES[3].rawSha256
});

const SOURCE_COUNTERFACTUAL = OBJECT_FREEZE({
  oldDefinitionCandidateLedgerDigest:
    "7ddaf8afc40bb6d3bddc0161e115ec2237b1a91305e885de32e49eb362d5cc44"
});

const COMPONENT_DRIFTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    componentId: "execution_rules",
    persistedDigest: "b3eaf0b9f5d91d182a1cc9aad185b708388a1eee04c53e9a6766de80d0cf7748",
    currentOldDefinitionCandidateDigest: "f45e5e0fbc9c57c933f67bbf987dfed9d8a51cfab05fc8da35121b0948c3a7cf",
    uniqueObservedHashDriftSource: CONTRACT_INDEX_DRIFT.path
  }),
  OBJECT_FREEZE({
    componentId: "interpretation_rules",
    persistedDigest: "76e3929b057a129601ed88e150392c373ad1ffab4217e9453f1faeb25994af7c",
    currentOldDefinitionCandidateDigest: "283a5e5f29ed05969a476e39dbb1cb77083ea146fdd1bfc9428b85cc487f73da",
    uniqueObservedHashDriftSource: CONTRACT_INDEX_DRIFT.path
  }),
  OBJECT_FREEZE({
    componentId: "input_policy",
    persistedDigest: "3d010ea228360407c76b6332dad72c881d7065109ad7d3e9fac75a17fedc22a3",
    currentOldDefinitionCandidateDigest: "ec586d5ea27d37f585fa4d960235780a89155728ddc216bb6c5b9633f1e2add7",
    uniqueObservedHashDriftSource: CONTRACT_INDEX_DRIFT.path
  }),
  OBJECT_FREEZE({
    componentId: "fact_contract",
    persistedDigest: "3e1b629cf778b404353ebf244c19315746748b902c11f5ebd83953fce993a989",
    currentOldDefinitionCandidateDigest: "6f3508a856cbfb8477c74cbf9b5d0ed9b5590d6c4267df0f0c4d938b4b225e95",
    uniqueObservedHashDriftSource: CONTRACT_INDEX_DRIFT.path
  }),
  OBJECT_FREEZE({
    componentId: "high_risk_policy",
    persistedDigest: "fb7f66e7398ec80301f449507a00683ed1f61acdd49746431ce91b22be0eb936",
    currentOldDefinitionCandidateDigest: "390cfffb571580988ae07a4ef657e569a80c4538afc86b8fcaba73767d538a29",
    uniqueObservedHashDriftSource: CONTRACT_INDEX_DRIFT.path
  }),
  OBJECT_FREEZE({
    componentId: "report_contract",
    persistedDigest: "de813d916c6b9f558f0039fa91079282ae380ebe911e6072738271d7797a9dd7",
    currentOldDefinitionCandidateDigest: "911b173f3396f11d38ce77ae3004ee331ccdc5c1b1068d99bd861cefe2c042eb",
    uniqueObservedHashDriftSource: RULES_PREVIEW_MAIN_DRIFT.path
  })
]);

const UNCHANGED_COMPONENT_IDS = OBJECT_FREEZE([
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle"
]);

const MANIFEST_COUNTERFACTUAL = OBJECT_FREEZE({
  oldDefinitionCandidateManifestDigest:
    "8dd95748538886284b2cde1413c963fb1e21606f431732492def2be338df7702"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 12_537,
  rawSha256: "09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26",
  receiptDigest: "f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097"
});

export class WesternSourceAndManifestIdentityDriftReceiptCandidateError extends Error {
  constructor(code, message, cause = undefined) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "WesternSourceAndManifestIdentityDriftReceiptCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new WesternSourceAndManifestIdentityDriftReceiptCandidateError(
    code,
    message,
    cause
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function captureCanonical(value, state = {
  active: new NATIVE_WEAK_SET(),
  seen: new NATIVE_WEAK_SET(),
  nodes: 0,
  textCodeUnits: 0
}, depth = 0) {
  if (depth > 64) fail("NON_CANONICAL_JSON", "Western drift receipt 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("NON_CANONICAL_JSON", "Western drift receipt 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", "Western drift receipt 数值必须有限且不能为负零。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > 2_000_000) fail("NON_CANONICAL_JSON", "Western drift receipt 文本超过上限。");
    return value;
  }
  if (typeof value !== "object"
    || REFLECT_APPLY(UTIL_IS_PROXY, nodeUtilTypes, [value])) {
    fail("NON_CANONICAL_JSON", "Western drift receipt 只接受非 Proxy JSON 数据值。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("NON_CANONICAL_JSON", "Western drift receipt 不接受 cycle。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("NON_CANONICAL_JSON", "Western drift receipt 不接受 alias。");
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  try {
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] === "symbol") fail("NON_CANONICAL_JSON", "Western drift receipt 不接受 Symbol 属性。");
    }
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE) {
        fail("NON_CANONICAL_JSON", "Western drift receipt 数组原型无效。");
      }
      const length = descriptors.length?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
        || length < 0 || keys.length !== length + 1) {
        fail("NON_CANONICAL_JSON", "Western drift receipt 数组必须稠密且无额外字段。");
      }
      const output = new NATIVE_ARRAY(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_CANONICAL_JSON", "Western drift receipt 数组元素必须是自有 data property。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, index, {
          configurable: true,
          enumerable: true,
          value: captureCanonical(descriptor.value, state, depth + 1),
          writable: true
        }]);
      }
      return output;
    }
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "Western drift receipt 对象原型无效。");
    }
    const stringKeys = new NATIVE_ARRAY(keys.length);
    for (let index = 0; index < keys.length; index += 1) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [stringKeys, index, {
        configurable: true,
        enumerable: true,
        value: keys[index],
        writable: true
      }]);
    }
    REFLECT_APPLY(ARRAY_SORT, stringKeys, [compareCodeUnits]);
    const output = {};
    for (let index = 0; index < stringKeys.length; index += 1) {
      const key = stringKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_CANONICAL_JSON", "Western drift receipt 字段必须是自有可枚举 data property。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function canonicalStringify(value) {
  try {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureCanonical(value)]);
  } catch (cause) {
    if (cause instanceof WesternSourceAndManifestIdentityDriftReceiptCandidateError) throw cause;
    fail("NON_CANONICAL_JSON", "Western drift receipt 只接受被动、无别名 JSON。", cause);
  }
}

function captureJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_CANONICAL_JSON", "Western drift receipt 不接受 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function withoutOwnField(value, field) {
  const snapshot = captureJson(value);
  const output = {};
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [snapshot]);
  REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === field) continue;
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
      configurable: true,
      enumerable: true,
      value: snapshot[key],
      writable: true
    }]);
  }
  return output;
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function appendOwn(array, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, array.length, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  }]);
}

function computeDigestWithPrefix(prefix, value, field) {
  return sha256Text(prefix + canonicalStringify(withoutOwnField(value, field)));
}

function computeDigestWithDomain(domain, value, field) {
  return sha256Text(domain + "\0" + canonicalStringify(withoutOwnField(value, field)));
}

function computeFormalSourceDigest(value) {
  return sha256Text(canonicalStringify(withoutOwnField(value, "ledgerDigest")));
}

function computeManifestComponentDigest(value) {
  return sha256Text(canonicalStringify({
    componentId: value.componentId,
    version: value.version,
    status: value.status,
    files: value.files
  }));
}

function computeManifestDigest(value) {
  return sha256Text(canonicalStringify(withoutOwnField(value, "manifestDigest")));
}

export function computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(value) {
  return computeDigestWithDomain(DIGEST_DOMAIN, value, "receiptDigest");
}

export function serializeWesternSourceAndManifestIdentityDriftReceiptCandidate(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2]) + "\n";
}

function assertRawSnapshot(snapshot, expected, code) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, expected.path + " raw identity 漂移。");
  }
}

function requireExactKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("KEY_SET_INVALID", label + " 必须是对象。");
  }
  const actual = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, actual, [compareCodeUnits]);
  const expected = new NATIVE_ARRAY(expectedKeys.length);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [expected, index, {
      configurable: true,
      enumerable: true,
      value: expectedKeys[index],
      writable: true
    }]);
  }
  REFLECT_APPLY(ARRAY_SORT, expected, [compareCodeUnits]);
  if (!exactJson(actual, expected)) fail("KEY_SET_INVALID", label + " 字段不精确。");
}

function requireAllFalse(value, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("AUTHORITY_INVALID", label + " 必须是全 false 对象。");
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  if (keys.length === 0) fail("AUTHORITY_INVALID", label + " 不得为空。");
  for (let index = 0; index < keys.length; index += 1) {
    if (value[keys[index]] !== false) fail("AUTHORITY_PROMOTION_FORBIDDEN", label + "." + keys[index] + " 不得提升。");
  }
}

function authorityBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertIdentityQualificationIndependenceEstablished: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    safeToPublish: false
  };
}

function publicSourceChain() {
  const output = [];
  for (let index = 0; index < FORMAL_SOURCE_CHAIN.length; index += 1) {
    const entry = FORMAL_SOURCE_CHAIN[index];
    appendOwn(output, {
      versionRole: entry.versionRole,
      path: entry.path,
      rawBytes: entry.rawBytes,
      rawSha256: entry.rawSha256,
      ledgerId: entry.ledgerId,
      ledgerDigest: entry.ledgerDigest,
      preservedUnmodified: true,
      rebindOrResignPerformed: false
    });
  }
  return output;
}

function publicCurrentSources() {
  const output = [];
  for (let index = 0; index < CURRENT_SOURCES.length; index += 1) {
    appendOwn(output, {
      role: CURRENT_SOURCES[index].role,
      path: CURRENT_SOURCES[index].path,
      rawBytes: CURRENT_SOURCES[index].rawBytes,
      rawSha256: CURRENT_SOURCES[index].rawSha256
    });
  }
  return output;
}

function buildProjection() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    candidateStatus: STATUS,
    currentStatus: STATUS,
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    releaseGovernance: {
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultContext: {
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        inheritedByWesternProductIdentity: false
      }
    },
    formalSourceDrift: {
      sourceChain: publicSourceChain(),
      formalCurrentRemainsV1: true,
      v11AndV12RemainNonformal: true,
      sourceArtifactsPreservedUnmodified: true,
      sourceRebindOrResignPerformed: false,
      currentV12LoaderMechanicallyCurrent: false,
      currentV12LoaderFailureClass: "LEDGER_MISMATCH",
      contractIndexDrift: CONTRACT_INDEX_DRIFT,
      oldDefinitionCounterfactual: {
        ledgerDigest: SOURCE_COUNTERFACTUAL.oldDefinitionCandidateLedgerDigest,
        persisted: false,
        oldDefinitionOnly: true,
        currentCompleteClosure: false
      },
      contractIndexIsOnlyObservedOldDefinitionBasisHashDriftSource: true,
      uniqueBlockerClaimed: false
    },
    formalManifestDrift: {
      historicalManifest: {
        path: FORMAL_MANIFEST.path,
        rawBytes: FORMAL_MANIFEST.rawBytes,
        rawSha256: FORMAL_MANIFEST.rawSha256,
        systemId: FORMAL_MANIFEST.systemId,
        surfaceId: FORMAL_MANIFEST.surfaceId,
        manifestDigest: FORMAL_MANIFEST.manifestDigest
      },
      historicalManifestPreservedUnmodified: true,
      historicalManifestMechanicallyCurrent: false,
      currentLoaderFailureClass: "MANIFEST_MISMATCH",
      oldDefinitionCounterfactual: {
        manifestDigest: MANIFEST_COUNTERFACTUAL.oldDefinitionCandidateManifestDigest,
        persisted: false,
        oldDefinitionOnly: true,
        currentCompleteClosure: false
      },
      changedComponentCount: 6,
      changedComponents: COMPONENT_DRIFTS,
      unchangedComponentCount: 3,
      unchangedComponentIds: UNCHANGED_COMPONENT_IDS,
      contractIndexOneSourceFansOutToFiveComponentDigests: true,
      rulesPreviewMainIsOnlyObservedReportContractHashDriftSource: true,
      sixComponentDigestDriftsEqualSixIndependentSemanticChanges: false,
      uniqueBlockerClaimed: false,
      manifestRebindOrResignPerformed: false
    },
    currentEndpointBindings: {
      currentVersionAwareObservation: {
        path: CURRENT_OBSERVATION.path,
        rawBytes: CURRENT_OBSERVATION.rawBytes,
        rawSha256: CURRENT_OBSERVATION.rawSha256,
        candidateId: CURRENT_OBSERVATION.candidateId,
        candidateDigest: CURRENT_OBSERVATION.candidateDigest
      },
      currentHighRiskCandidate: {
        path: HIGH_RISK_CANDIDATE.path,
        rawBytes: HIGH_RISK_CANDIDATE.rawBytes,
        rawSha256: HIGH_RISK_CANDIDATE.rawSha256,
        candidateId: HIGH_RISK_CANDIDATE.candidateId,
        candidateDigest: HIGH_RISK_CANDIDATE.candidateDigest
      },
      currentSourceSnapshots: publicCurrentSources()
    },
    oldDefinitionCoverageBoundary: {
      civilInputDirectFileIncludedInFormalSourceV1Basis: false,
      civilInputDirectFileIncludedInFormalManifestInputPolicy: false,
      contractFocusedTestIncludedInFormalSourceOrManifestDefinition: false,
      highRiskEgressSourceIncludedInFormalManifestHighRiskPolicy: false,
      highRiskCandidateIncludedInFormalManifestHighRiskPolicy: false,
      oldDefinitionCounterfactualMayBeSignedAsCurrentEngineeringManifest: false,
      currentEngineeringManifestComplete: false
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false
    },
    ownerDecisionBoundary: {
      ownerAcceptanceVerified: false,
      ownerDecisionsRecorded: 0,
      sourceRebindAuthorized: false,
      sourceResignAuthorized: false,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      formalAdmissionPromotionAuthorized: false
    },
    observationBoundary: {
      endpointObservationOnly: true,
      sourceAndManifestIdentityDriftEstablished: true,
      sameHeldBufferHashAndParsePerJsonArtifact: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      receiptDigestIsDigitalSignature: false
    },
    runtimeTrustBoundary: {
      nodeRuntimeIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      loaderIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    authorityBoundary: authorityBoundary(),
    doesNotEstablish: [
      "current_complete_western_source_definition_or_engineering_manifest",
      "source_binding_or_three_layer_rights",
      "content_truth_expert_truth_or_domain_authority",
      "rights_legal_conclusion_or_redistribution_authorization",
      "current_browser_runtime_full_app_pwa_service_worker_or_public_host_evidence",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "digital_signature_runtime_attestation_or_owner_acceptance",
      "release_readiness_deployment_rollback_or_public_release_authorization",
      "bazi_authority_or_legacy_v13_schema_inheritance"
    ]
  };
  const output = captureJson(unsigned);
  output.receiptDigest =
    computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(unsigned);
  return output;
}

function assertReceiptBoundary(value) {
  requireExactKeys(value, [
    "activeAdmissionEffect",
    "authorityBoundary",
    "candidateId",
    "candidateStatus",
    "createdAt",
    "currentEndpointBindings",
    "currentStatus",
    "doesNotEstablish",
    "formalManifestDrift",
    "formalSourceDrift",
    "gateSummary",
    "observationBoundary",
    "oldDefinitionCoverageBoundary",
    "ownerDecisionBoundary",
    "receiptDigest",
    "recordType",
    "releaseGovernance",
    "runtimeTrustBoundary",
    "schemaVersion"
  ], "Western source/manifest drift receipt");
  if (value.schemaVersion !== "1.0.0"
    || value.recordType !== RECORD_TYPE
    || value.candidateId !== CANDIDATE_ID
    || value.candidateStatus !== STATUS
    || value.currentStatus !== STATUS
    || value.createdAt !== CREATED_AT
    || value.activeAdmissionEffect !== "none") {
    fail("RECEIPT_IDENTITY_INVALID", "Western drift receipt 身份或零效力边界漂移。");
  }
  if (value.formalSourceDrift?.currentV12LoaderMechanicallyCurrent !== false
    || value.formalSourceDrift?.currentV12LoaderFailureClass !== "LEDGER_MISMATCH"
    || value.formalSourceDrift?.oldDefinitionCounterfactual?.persisted !== false
    || value.formalSourceDrift?.oldDefinitionCounterfactual?.currentCompleteClosure !== false
    || value.formalSourceDrift?.uniqueBlockerClaimed !== false
    || value.formalManifestDrift?.historicalManifestMechanicallyCurrent !== false
    || value.formalManifestDrift?.currentLoaderFailureClass !== "MANIFEST_MISMATCH"
    || value.formalManifestDrift?.oldDefinitionCounterfactual?.persisted !== false
    || value.formalManifestDrift?.oldDefinitionCounterfactual?.currentCompleteClosure !== false
    || value.formalManifestDrift?.sixComponentDigestDriftsEqualSixIndependentSemanticChanges !== false
    || value.formalManifestDrift?.uniqueBlockerClaimed !== false
    || value.oldDefinitionCoverageBoundary?.currentEngineeringManifestComplete !== false
    || value.oldDefinitionCoverageBoundary?.oldDefinitionCounterfactualMayBeSignedAsCurrentEngineeringManifest !== false
    || value.gateSummary?.bindingRequired !== 28
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.independentExpertsRequired !== 2
    || value.gateSummary?.independentExpertReviewsVerified !== 0) {
    fail("PROMOTION_FORBIDDEN", "Western source/manifest drift receipt 必须继续失败关闭。");
  }
  if (!exactJson(value.formalSourceDrift?.sourceChain, publicSourceChain())
    || !exactJson(
      value.formalSourceDrift?.contractIndexDrift,
      CONTRACT_INDEX_DRIFT
    )
    || value.formalSourceDrift?.oldDefinitionCounterfactual?.ledgerDigest
      !== SOURCE_COUNTERFACTUAL.oldDefinitionCandidateLedgerDigest
    || !exactJson(value.formalManifestDrift?.changedComponents, COMPONENT_DRIFTS)
    || !exactJson(
      value.formalManifestDrift?.unchangedComponentIds,
      UNCHANGED_COMPONENT_IDS
    )
    || value.formalManifestDrift?.oldDefinitionCounterfactual?.manifestDigest
      !== MANIFEST_COUNTERFACTUAL.oldDefinitionCandidateManifestDigest
    || !exactJson(
      value.currentEndpointBindings?.currentVersionAwareObservation,
      {
        path: CURRENT_OBSERVATION.path,
        rawBytes: CURRENT_OBSERVATION.rawBytes,
        rawSha256: CURRENT_OBSERVATION.rawSha256,
        candidateId: CURRENT_OBSERVATION.candidateId,
        candidateDigest: CURRENT_OBSERVATION.candidateDigest
      }
    )
    || !exactJson(
      value.currentEndpointBindings?.currentHighRiskCandidate,
      {
        path: HIGH_RISK_CANDIDATE.path,
        rawBytes: HIGH_RISK_CANDIDATE.rawBytes,
        rawSha256: HIGH_RISK_CANDIDATE.rawSha256,
        candidateId: HIGH_RISK_CANDIDATE.candidateId,
        candidateDigest: HIGH_RISK_CANDIDATE.candidateDigest
      }
    )
    || !exactJson(
      value.currentEndpointBindings?.currentSourceSnapshots,
      publicCurrentSources()
    )) {
    fail("IDENTITY_PROJECTION_INVALID", "Western frozen identity projection 漂移。");
  }
  requireAllFalse(value.authorityBoundary, "Western authorityBoundary");
  if (value.observationBoundary?.crossFileAtomicSnapshot !== false
    || value.observationBoundary?.mutationEpochAvailable !== false
    || value.observationBoundary?.mutationEpochReceipt !== null
    || value.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || value.observationBoundary?.abaExcluded !== false
    || value.observationBoundary?.receiptDigestIsDigitalSignature !== false) {
    fail("OBSERVATION_PROMOTION_FORBIDDEN", "receipt 不得声称 atomicity、epoch、interval、ABA 或签名。");
  }
  if (!REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [value.receiptDigest])
    || computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(value)
      !== value.receiptDigest) {
    fail("RECEIPT_DIGEST_INVALID", "Western drift receiptDigest 无效。");
  }
  return value;
}

function assertSemanticIdentity(value, expected) {
  if (value.ledgerId !== expected.ledgerId
    || value.ledgerDigest !== expected.ledgerDigest) {
    fail("SOURCE_SEMANTIC_IDENTITY_DRIFT", expected.path + " semantic identity 漂移。");
  }
  let computed;
  if (expected.digestKind === "formal_v1") computed = computeFormalSourceDigest(value);
  else if (expected.digestKind === "successor_v1_1") {
    computed = computeDigestWithPrefix(SOURCE_V11_DIGEST_PREFIX, value, "ledgerDigest");
  } else {
    computed = computeDigestWithPrefix(SOURCE_V12_DIGEST_PREFIX, value, "ledgerDigest");
  }
  if (computed !== expected.ledgerDigest) {
    fail("SOURCE_SELF_DIGEST_INVALID", expected.path + " self digest 无效。");
  }
}

function findCurrentSource(path) {
  for (let index = 0; index < CURRENT_SOURCES.length; index += 1) {
    if (CURRENT_SOURCES[index].path === path) return CURRENT_SOURCES[index];
  }
  return undefined;
}

async function collectCurrentInputs(workspaceRoot) {
  const sourceValues = [];
  for (let index = 0; index < FORMAL_SOURCE_CHAIN.length; index += 1) {
    const expected = FORMAL_SOURCE_CHAIN[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertRawSnapshot(snapshot, expected, "SOURCE_RAW_IDENTITY_DRIFT");
    const value = parseBaziDttStrictJsonArtifact(snapshot);
    assertSemanticIdentity(value, expected);
    appendOwn(sourceValues, value);
  }

  const manifestSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FORMAL_MANIFEST.path
  );
  assertRawSnapshot(manifestSnapshot, FORMAL_MANIFEST, "MANIFEST_RAW_IDENTITY_DRIFT");
  const manifest = parseBaziDttStrictJsonArtifact(manifestSnapshot);
  if (manifest.systemId !== FORMAL_MANIFEST.systemId
    || manifest.surface?.surfaceId !== FORMAL_MANIFEST.surfaceId
    || manifest.manifestDigest !== FORMAL_MANIFEST.manifestDigest
    || computeManifestDigest(manifest) !== FORMAL_MANIFEST.manifestDigest) {
    fail("MANIFEST_SELF_DIGEST_INVALID", "Western formal manifest semantic identity 或 self digest 漂移。");
  }

  const observationSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    CURRENT_OBSERVATION.path
  );
  assertRawSnapshot(observationSnapshot, CURRENT_OBSERVATION, "CURRENT_OBSERVATION_RAW_DRIFT");
  const observation = parseBaziDttStrictJsonArtifact(observationSnapshot);
  if (observation.candidateId !== CURRENT_OBSERVATION.candidateId
    || observation.candidateDigest !== CURRENT_OBSERVATION.candidateDigest
    || computeDigestWithDomain(
      OBSERVATION_V11_DIGEST_DOMAIN,
      observation,
      "candidateDigest"
    ) !== CURRENT_OBSERVATION.candidateDigest) {
    fail("CURRENT_OBSERVATION_SELF_DIGEST_INVALID", "Western v1.1 observation identity 漂移。");
  }

  const highRiskSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    HIGH_RISK_CANDIDATE.path
  );
  assertRawSnapshot(highRiskSnapshot, HIGH_RISK_CANDIDATE, "HIGH_RISK_CANDIDATE_RAW_DRIFT");
  const highRisk = parseBaziDttStrictJsonArtifact(highRiskSnapshot);
  if (highRisk.candidateId !== HIGH_RISK_CANDIDATE.candidateId
    || highRisk.candidateDigest !== HIGH_RISK_CANDIDATE.candidateDigest
    || computeDigestWithDomain(HIGH_RISK_DIGEST_DOMAIN, highRisk, "candidateDigest")
      !== HIGH_RISK_CANDIDATE.candidateDigest) {
    fail("HIGH_RISK_CANDIDATE_SELF_DIGEST_INVALID", "Western high-risk candidate identity 漂移。");
  }

  const currentSnapshots = [];
  for (let index = 0; index < CURRENT_SOURCES.length; index += 1) {
    const expected = CURRENT_SOURCES[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertRawSnapshot(snapshot, expected, "CURRENT_SOURCE_DRIFT");
    appendOwn(currentSnapshots, snapshot);
  }

  const formalSource = sourceValues[0];
  const counterfactualSource = captureJson(formalSource);
  for (let index = 0; index < counterfactualSource.basisArtifacts.length; index += 1) {
    const basis = counterfactualSource.basisArtifacts[index];
    const current = findCurrentSource(basis.path);
    let snapshot;
    if (current) {
      snapshot = current;
    } else {
      snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, basis.path);
    }
    basis.bytes = snapshot.rawBytes;
    basis.sha256 = snapshot.rawSha256;
  }
  counterfactualSource.ledgerDigest = computeFormalSourceDigest(counterfactualSource);
  if (counterfactualSource.ledgerDigest
      !== SOURCE_COUNTERFACTUAL.oldDefinitionCandidateLedgerDigest) {
    fail("SOURCE_COUNTERFACTUAL_DRIFT", "Western old-definition source counterfactual digest 漂移。");
  }

  const currentManifest = captureJson(manifest);
  const observedDrifts = [];
  const observedUnchanged = [];
  for (let componentIndex = 0;
    componentIndex < currentManifest.components.length;
    componentIndex += 1) {
    const persistedComponent = manifest.components[componentIndex];
    const currentComponent = currentManifest.components[componentIndex];
    const changedPaths = [];
    for (let fileIndex = 0; fileIndex < currentComponent.files.length; fileIndex += 1) {
      const file = currentComponent.files[fileIndex];
      const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, file.path);
      if (snapshot.rawSha256 !== file.sha256) appendOwn(changedPaths, file.path);
      file.sha256 = snapshot.rawSha256;
    }
    currentComponent.digest = computeManifestComponentDigest(currentComponent);
    if (currentComponent.digest === persistedComponent.digest) {
      if (changedPaths.length !== 0) fail("COMPONENT_DIGEST_CLOSURE_INVALID", currentComponent.componentId + " changed file but unchanged digest.");
      appendOwn(observedUnchanged, currentComponent.componentId);
    } else {
      if (changedPaths.length !== 1) fail("COMPONENT_DRIFT_ROOT_INVALID", currentComponent.componentId + " drift root count invalid.");
      appendOwn(observedDrifts, {
        componentId: currentComponent.componentId,
        persistedDigest: persistedComponent.digest,
        currentOldDefinitionCandidateDigest: currentComponent.digest,
        uniqueObservedHashDriftSource: changedPaths[0]
      });
    }
  }
  currentManifest.manifestDigest = computeManifestDigest(currentManifest);
  if (!exactJson(observedDrifts, COMPONENT_DRIFTS)
    || !exactJson(observedUnchanged, UNCHANGED_COMPONENT_IDS)
    || currentManifest.manifestDigest
      !== MANIFEST_COUNTERFACTUAL.oldDefinitionCandidateManifestDigest) {
    fail("MANIFEST_COUNTERFACTUAL_DRIFT", "Western old-definition manifest/component counterfactual 漂移。");
  }
}

export async function buildWesternSourceAndManifestIdentityDriftReceiptCandidate(
  workspaceRoot = process.cwd()
) {
  await collectCurrentInputs(workspaceRoot);
  return deepFreeze(captureJson(assertReceiptBoundary(buildProjection())));
}

function assertPersistedIdentity(snapshot, value) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.rawSha256])
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.receiptDigest])) {
    fail("PERSISTED_IDENTITY_UNSET", "Western drift receipt 固定身份尚未冻结。");
  }
  if (snapshot.path
      !== WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || value.receiptDigest !== EXPECTED_PERSISTED.receiptDigest) {
    fail("PERSISTED_IDENTITY_DRIFT", "Western drift receipt raw 或 semantic identity 漂移。");
  }
}

export async function loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
  workspaceRoot = process.cwd()
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
  );
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, parsed);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
      !== serializeWesternSourceAndManifestIdentityDriftReceiptCandidate(parsed)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "Western drift receipt 不是唯一 canonical LF materialization。");
  }
  assertReceiptBoundary(parsed);
  await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(captureJson(assertReceiptBoundary(buildProjection())));
  if (!exactJson(parsed, expected)) {
    fail("CURRENT_RECEIPT_MISMATCH", "persisted Western drift receipt 不等于当前直接窄观察。");
  }
  const verified = deepFreeze(captureJson(parsed));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [verified]);
  return verified;
}

export function isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const westernSourceAndManifestIdentityDriftReceiptCandidateTestOnly =
  OBJECT_FREEZE({
    CANDIDATE_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    FORMAL_SOURCE_CHAIN,
    FORMAL_MANIFEST,
    CURRENT_OBSERVATION,
    HIGH_RISK_CANDIDATE,
    CURRENT_SOURCES,
    CONTRACT_INDEX_DRIFT,
    RULES_PREVIEW_MAIN_DRIFT,
    SOURCE_COUNTERFACTUAL,
    COMPONENT_DRIFTS,
    UNCHANGED_COMPONENT_IDS,
    MANIFEST_COUNTERFACTUAL,
    EXPECTED_PERSISTED,
    assertReceiptBoundary,
    assertPersistedIdentity,
    canonicalStringify,
    captureJson,
    exactJson
  });
