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
import {
  isVerifiedBaziPolicyWeightsVersionAwareCandidate,
  loadBaziPolicyWeightsVersionAwareCandidate
} from "./bazi-policy-weights-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
  loadBaziProjectCopyMaterializationVersionAwareCandidate
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate,
  loadBaziExpertReviewIntakeGapVersionAwareCandidate
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_PROTOTYPE = Object.prototype;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_FLOOR = Math.floor;
const STRING_CONSTRUCTOR = String;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const PROCESS_CWD = process.cwd;
const PROCESS_OBJECT = process;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [CRYPTO_CREATE_HASH("sha256")]
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [UINT8_ARRAY_PROTOTYPE]
);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;

const MAX_CANONICAL_DEPTH = 96;
const MAX_CANONICAL_NODES = 200_000;
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate.v1.1";
const FROZEN_GOLDEN_SHA256 =
  "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29";

export const BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.1.0.json";

const CANDIDATE_ID =
  "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.1.0";
const RECORD_TYPE =
  "bazi_domain_release_manifest_version_aware_observation_candidate_v1_1";
const CANDIDATE_STATUS =
  "candidate_only_current_component_observation_owner_acceptance_absent_no_release_authority";
const CANDIDATE_CREATED_AT = "2026-08-30T00:00:00.000Z";

const SAVED_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.json",
  rawBytes: 12777,
  rawSha256: "d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6",
  manifestDigest: "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932",
  createdAt: "2026-08-25T14:30:00.000Z"
});
const HISTORICAL_D0 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-v17-manifest-drift-decisions.v1.json",
  rawBytes: 11291,
  rawSha256: "91e6cda96190b43f65018c913ffa31f5346500d82842f6ebbd4e8af543734486",
  ledgerId: "hakimi.bazi.v17.manifest-drift-decisions/1.0.0",
  ledgerDigest: "5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f",
  storedPreviewDigest: "be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954",
  storedDriftEntryCount: 7,
  ownerDecisionsRecorded: 0,
  currentFailureCode: "CURRENT_EXPECTED_MANIFEST_CHANGED"
});
const CURRENT_PREVIEW_DIGEST =
  "85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68";
const DRIFT_COMPONENT_IDS = OBJECT_FREEZE([
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "high_risk_policy"
]);
const SOURCE_V16 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  bytes: 50427,
  sha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  id: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  digest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
});
const SOURCE_V16_CANDIDATE = OBJECT_FREEZE({
  id: "dtt-chanwei-wikisource-r2600158-candidate-v2",
  digest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59"
});
const RIGHTS_V12 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  bytes: 23947,
  sha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  id: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  digest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
});
const RIGHTS_V12_CANDIDATE = OBJECT_FREEZE({
  id: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
  digest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
});
const SUPERSESSION_RECEIPT = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  bytes: 9229,
  sha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  id: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  digest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const READINESS_V17 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  bytes: 32629,
  sha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  id: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  digest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const POLICY_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json",
  bytes: 13295,
  sha256: "0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1",
  id: "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
  digest: "95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b"
});
const C_M1_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
  bytes: 10887,
  sha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
  id: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
  digest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
});
const D_INTAKE_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
  bytes: 32579,
  sha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  id: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
  digest: "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
});
const ENGINEERING_GAP_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json",
  bytes: 71168,
  sha256: "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
  id: "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
  digest: "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
});
const PR10BC_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
  bytes: 38161,
  sha256: "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
  id: "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
  digest: "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
});
const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 21859,
  rawSha256: "7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d",
  candidateDigest: "be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziDomainReleaseManifestVersionAwareObservationCandidateError extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "BaziDomainReleaseManifestVersionAwareObservationCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDomainReleaseManifestVersionAwareObservationCandidateError(
    code,
    message,
    cause
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const state = { nodes: 0 };
  function walk(current, depth) {
    state.nodes += 1;
    if (state.nodes > MAX_CANONICAL_NODES || depth > MAX_CANONICAL_DEPTH) {
      fail("CANONICAL_LIMIT_EXCEEDED", "观察候选 JSON 超过规范化深度或节点上限。");
    }
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_VALUE", "观察候选 JSON 不接受非有限数值或 -0。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current !== "object") {
      fail("NON_JSON_VALUE", "观察候选只接受有限被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_JSON_GRAPH", "观察候选 JSON 不接受 cycle 或 alias。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if ((isArray && prototype !== ARRAY_PROTOTYPE)
      || (!isArray && prototype !== OBJECT_PROTOTYPE)) {
      fail("NON_PASSIVE_OBJECT", "观察候选 JSON 不接受自定义 prototype。");
    }
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    if (isArray) {
      const lengthDescriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [current, "length"]
      );
      const length = lengthDescriptor?.value;
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [length])
        || length < 0
        || REFLECT_APPLY(NUMBER_FLOOR, Math, [length]) !== length
        || ownKeys.length !== length + 1) {
        fail("NON_PASSIVE_OBJECT", "观察候选数组必须稠密且无额外属性。");
      }
      let text = "[";
      for (let index = 0; index < length; index += 1) {
        const descriptor = REFLECT_APPLY(
          OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
          Object,
          [current, REFLECT_APPLY(STRING_CONSTRUCTOR, null, [index])]
        );
        if (!descriptor || !("value" in descriptor)) {
          fail("NON_PASSIVE_OBJECT", "观察候选数组不得含 hole 或 accessor。");
        }
        if (index > 0) text += ",";
        text += walk(descriptor.value, depth + 1);
      }
      return text + "]";
    }
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string") {
        fail("NON_JSON_KEY", "观察候选 JSON 不接受 symbol key。");
      }
      const descriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [current, key]
      );
      if (!descriptor || !("value" in descriptor)) {
        fail("NON_PASSIVE_OBJECT", "观察候选 JSON 不接受 accessor。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [current, key]
      );
      if (!descriptor || !("value" in descriptor)) {
        fail("NON_PASSIVE_OBJECT", "观察候选 JSON 不接受 accessor。");
      }
      if (index > 0) text += ",";
      text += REFLECT_APPLY(JSON_STRINGIFY, JSON, [key]) + ":";
      text += walk(descriptor.value, depth + 1);
    }
    return text + "}";
  }
  return walk(value, 0);
}

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [value, keys[index]]
    );
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "观察候选冻结前发现 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Value(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
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
  const normalized = canonicalValue(value);
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [normalized, null, 2]) + "\n";
}

function snapshotForValue(value) {
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(value), "utf8"]);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
    rawSha256: sha256Bytes(bytes),
    bytes
  }]);
}

export function computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

function computeHistoricalManifestDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.manifestDigest;
  return sha256Value(unsigned);
}

function computeHistoricalD0Digest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return sha256Value(unsigned);
}

function computeComponentDigest(value) {
  return sha256Value({
    componentId: value.componentId,
    version: value.version,
    status: value.status,
    files: value.files
  });
}

function artifactMatches(actual, expected) {
  return actual?.path === expected.path
    && (actual?.bytes ?? actual?.rawBytes) === expected.bytes
    && (actual?.sha256 ?? actual?.rawSha256) === expected.sha256;
}

function assertAllFalse(result, fields, label) {
  for (let index = 0; index < fields.length; index += 1) {
    if (result?.[fields[index]] !== false) {
      fail("CONTEXT_AUTHORITY_NOT_RED", label + " 权威红门漂移：" + fields[index]);
    }
  }
}

function normalizedSupersessionActualTuple(result) {
  return {
    sourceBinding: {
      path: result.supersedingParents?.sourceBinding?.path,
      rawBytes: result.supersedingParents?.sourceBinding?.rawBytes,
      rawSha256: result.supersedingParents?.sourceBinding?.rawSha256,
      ledgerId: result.supersedingParents?.sourceBinding?.ledgerId,
      ledgerDigest: result.supersedingParents?.sourceBinding?.ledgerDigest,
      candidateId: result.supersedingParents?.sourceBinding?.dttCandidateId,
      candidateDigest: result.supersedingParents?.sourceBinding?.dttCandidateDigest
    },
    sourceRights: {
      path: result.supersedingParents?.sourceRights?.path,
      rawBytes: result.supersedingParents?.sourceRights?.rawBytes,
      rawSha256: result.supersedingParents?.sourceRights?.rawSha256,
      ledgerId: result.supersedingParents?.sourceRights?.ledgerId,
      ledgerDigest: result.supersedingParents?.sourceRights?.ledgerDigest,
      candidateId: result.supersedingParents?.sourceRights?.dttCandidateId,
      candidateDigest: result.supersedingParents?.sourceRights?.dttCandidateDigest
    },
    receipt: {
      path: result.artifacts?.receipt?.path,
      bytes: result.artifacts?.receipt?.rawBytes,
      sha256: result.artifacts?.receipt?.rawSha256,
      supersessionId: result.supersessionId,
      supersessionDigest: result.supersessionDigest
    }
  };
}

function normalizedReadinessActualTuple(result) {
  const gate = result.readiness?.dttNoticeReconciliationGate;
  const parents = gate?.currentCandidateParentIdentities;
  return {
    sourceBinding: {
      path: parents?.sourceBinding?.path,
      rawBytes: parents?.sourceBinding?.rawBytes,
      rawSha256: parents?.sourceBinding?.rawSha256,
      ledgerId: parents?.sourceBinding?.ledgerId,
      ledgerDigest: parents?.sourceBinding?.ledgerDigest,
      candidateId: parents?.sourceBinding?.candidateId,
      candidateDigest: parents?.sourceBinding?.candidateDigest
    },
    sourceRights: {
      path: parents?.sourceRights?.path,
      rawBytes: parents?.sourceRights?.rawBytes,
      rawSha256: parents?.sourceRights?.rawSha256,
      ledgerId: parents?.sourceRights?.ledgerId,
      ledgerDigest: parents?.sourceRights?.ledgerDigest,
      candidateId: parents?.sourceRights?.candidateId,
      candidateDigest: parents?.sourceRights?.candidateDigest
    },
    receipt: {
      path: gate?.supersessionReceipt?.path,
      bytes: gate?.supersessionReceipt?.bytes,
      sha256: gate?.supersessionReceipt?.sha256,
      supersessionId: gate?.supersessionReceipt?.supersessionId,
      supersessionDigest: gate?.supersessionReceipt?.supersessionDigest
    }
  };
}

const EXPECTED_SUPERSESSION_ACTUAL_TUPLE = OBJECT_FREEZE({
  sourceBinding: OBJECT_FREEZE({
    path: SOURCE_V16.path,
    rawBytes: SOURCE_V16.bytes,
    rawSha256: SOURCE_V16.sha256,
    ledgerId: SOURCE_V16.id,
    ledgerDigest: SOURCE_V16.digest,
    candidateId: SOURCE_V16_CANDIDATE.id,
    candidateDigest: SOURCE_V16_CANDIDATE.digest
  }),
  sourceRights: OBJECT_FREEZE({
    path: RIGHTS_V12.path,
    rawBytes: RIGHTS_V12.bytes,
    rawSha256: RIGHTS_V12.sha256,
    ledgerId: RIGHTS_V12.id,
    ledgerDigest: RIGHTS_V12.digest,
    candidateId: RIGHTS_V12_CANDIDATE.id,
    candidateDigest: RIGHTS_V12_CANDIDATE.digest
  }),
  receipt: OBJECT_FREEZE({
    path: SUPERSESSION_RECEIPT.path,
    bytes: SUPERSESSION_RECEIPT.bytes,
    sha256: SUPERSESSION_RECEIPT.sha256,
    supersessionId: SUPERSESSION_RECEIPT.id,
    supersessionDigest: SUPERSESSION_RECEIPT.digest
  })
});

function assertSupersession(result) {
  if (!isVerifiedBaziDttVersionedParentSupersession(result)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "必须消费同根 supersession WeakSet 品牌。");
  }
  if (result.offlineVersionedParentSupersessionMechanicallyVerified !== true
    || result.supersessionId !== SUPERSESSION_RECEIPT.id
    || result.supersessionDigest !== SUPERSESSION_RECEIPT.digest
    || result.sourceLedgerId !== SOURCE_V16.id
    || result.sourceLedgerDigest !== SOURCE_V16.digest
    || result.rightsLedgerId !== RIGHTS_V12.id
    || result.rightsLedgerDigest !== RIGHTS_V12.digest
    || !artifactMatches(result.artifacts?.sourceBinding, SOURCE_V16)
    || !artifactMatches(result.artifacts?.sourceRights, RIGHTS_V12)
    || !artifactMatches(result.artifacts?.receipt, SUPERSESSION_RECEIPT)
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.bindingFrozenVerified !== 0
    || result.promotionBlocked !== true
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("SUPERSESSION_CONTEXT_MISMATCH", "supersession 机械上下文不等于固定红态。");
  }
  if (!exactJson(
    normalizedSupersessionActualTuple(result),
    EXPECTED_SUPERSESSION_ACTUAL_TUPLE
  )) {
    fail(
      "SUPERSESSION_ACTUAL_TUPLE_MISMATCH",
      "supersession source/right/receipt actual tuple 不等于固定闭包。"
    );
  }
  assertAllFalse(result, [
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "supersession");
  return {
    capabilityId: result.supersessionId,
    capabilityDigest: result.supersessionDigest,
    role: "source_rights_versioned_parent_supersession_context",
    artifacts: [SOURCE_V16, RIGHTS_V12, SUPERSESSION_RECEIPT],
    activeAdmissionEffect: "none"
  };
}

function assertReadiness(result, supersession) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(result)) {
    fail("READINESS_BRAND_REQUIRED", "必须消费同根 readiness 1.7 WeakSet 品牌。");
  }
  const currentParents =
    result.readiness?.dttNoticeReconciliationGate?.currentCandidateParentIdentities;
  if (result.versionAwareCandidateReadinessMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.ledgerId !== READINESS_V17.id
    || result.ledgerDigest !== READINESS_V17.digest
    || !artifactMatches(result.artifact, READINESS_V17)
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.formalAdmissionPromotionBlocked !== true
    || currentParents?.sourceBinding?.ledgerId !== supersession.sourceLedgerId
    || currentParents?.sourceBinding?.ledgerDigest !== supersession.sourceLedgerDigest
    || currentParents?.sourceBinding?.rawBytes !== SOURCE_V16.bytes
    || currentParents?.sourceBinding?.rawSha256 !== SOURCE_V16.sha256
    || currentParents?.sourceRights?.ledgerId !== supersession.rightsLedgerId
    || currentParents?.sourceRights?.ledgerDigest !== supersession.rightsLedgerDigest
    || currentParents?.sourceRights?.rawBytes !== RIGHTS_V12.bytes
    || currentParents?.sourceRights?.rawSha256 !== RIGHTS_V12.sha256
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("READINESS_CONTEXT_MISMATCH", "readiness 1.7 机械上下文或 actual tuple 一致性漂移。");
  }
  if (!exactJson(
    normalizedReadinessActualTuple(result),
    normalizedSupersessionActualTuple(supersession)
  )) {
    fail(
      "READINESS_SUPERSESSION_ACTUAL_TUPLE_MISMATCH",
      "readiness 与 supersession 的 source/right/receipt actual tuple 不完全一致。"
    );
  }
  assertAllFalse(result, [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "readiness");
  return {
    capabilityId: result.ledgerId,
    capabilityDigest: result.ledgerDigest,
    role: "bazi_v17_candidate_readiness_context",
    artifact: READINESS_V17,
    activeAdmissionEffect: "none"
  };
}

function assertPolicy(result) {
  if (!isVerifiedBaziPolicyWeightsVersionAwareCandidate(result)) {
    fail("POLICY_BRAND_REQUIRED", "必须消费同根 policy 1.1 WeakSet 品牌。");
  }
  if (result.versionAwarePolicyWeightsCandidateMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.candidateId !== POLICY_V11.id
    || result.candidateDigest !== POLICY_V11.digest
    || !artifactMatches(result.artifact, POLICY_V11)
    || result.bindingFreezeEligible !== false
    || result.scopedBindingFrozenVerified !== false
    || result.formalAdmissionPromotionBlocked !== true
    || result.formalActivationAllowed !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailableForSchema13 !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("POLICY_CONTEXT_MISMATCH", "policy 1.1 机械上下文不等于固定红态。");
  }
  assertAllFalse(result, [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "browserRuntimeEvidenceEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "policy");
  return {
    capabilityId: result.candidateId,
    capabilityDigest: result.candidateDigest,
    role: "interpretation_and_high_risk_policy_observation_context",
    artifact: POLICY_V11,
    activeAdmissionEffect: "none"
  };
}

function assertCM1(result) {
  if (!isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(result)) {
    fail("C_M1_BRAND_REQUIRED", "必须消费同根 C-M1 1.1 WeakSet 品牌。");
  }
  if (result.versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.ledgerId !== C_M1_V11.id
    || result.ledgerDigest !== C_M1_V11.digest
    || !artifactMatches(result.artifact, C_M1_V11)
    || result.materializationApiIntegratedByThisCandidate !== false
    || result.materializationVerifiedCount !== 0
    || result.projectCopyMaterializationRecordCount !== 0
    || result.redistributableSourceCount !== 0
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || result.formalAdmissionPromotionBlocked !== true
    || result.formalActivationAllowed !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailableForSchema13 !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("C_M1_CONTEXT_MISMATCH", "C-M1 1.1 机械上下文不等于固定零实例红态。");
  }
  assertAllFalse(result, [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "browserRuntimeEvidenceEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "C-M1");
  return {
    capabilityId: result.ledgerId,
    capabilityDigest: result.ledgerDigest,
    role: "rights_and_project_copy_materialization_zero_instance_context",
    artifact: C_M1_V11,
    activeAdmissionEffect: "none"
  };
}

function assertExpertIntake(result) {
  if (!isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(result)) {
    fail("D_INTAKE_BRAND_REQUIRED", "必须消费同根 D-intake 1.1 WeakSet 品牌。");
  }
  if (result.versionAwareExpertReviewIntakeGapMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.ledgerId !== D_INTAKE_V11.id
    || result.ledgerDigest !== D_INTAKE_V11.digest
    || !artifactMatches(result.artifact, D_INTAKE_V11)
    || result.domainExpertsRequired !== 2
    || result.reviewerSlotsOccupied !== 0
    || result.currentRecordInstances !== 0
    || result.sealedOriginalOpinions !== 0
    || result.independentExpertReviewsVerified !== 0
    || result.expertReviewBundleComplete !== false
    || result.countsTowardExpertGate !== false
    || result.formalAdmissionPromotionBlocked !== true
    || result.formalActivationAllowed !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailableForSchema13 !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("D_INTAKE_CONTEXT_MISMATCH", "D-intake 1.1 机械上下文不等于固定空席红态。");
  }
  assertAllFalse(result, [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "D-intake");
  return {
    capabilityId: result.ledgerId,
    capabilityDigest: result.ledgerDigest,
    role: "expert_intake_zero_instance_gap_context",
    artifact: D_INTAKE_V11,
    activeAdmissionEffect: "none"
  };
}

function assertRawIdentity(snapshot, expected, label) {
  if (snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("HISTORICAL_BASIS_RAW_DRIFT", label + " raw identity 漂移。");
  }
}

function assertHistoricalManifest(snapshot, manifest) {
  assertRawIdentity(snapshot, SAVED_MANIFEST, "saved manifest");
  if (manifest?.manifestDigest !== SAVED_MANIFEST.manifestDigest
    || manifest?.createdAt !== SAVED_MANIFEST.createdAt
    || computeHistoricalManifestDigest(manifest) !== SAVED_MANIFEST.manifestDigest
    || manifest?.systemId !== "bazi"
    || manifest?.surface?.surfaceId !== "single-chart-report"
    || manifest?.surface?.surfaceVersion !== "1.7.0"
    || manifest?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || manifest?.releaseGovernance?.targetSchema !== 13
    || manifest?.releaseGovernance?.migrationId !== null
    || manifest?.releaseGovernance?.publicDeploymentAuthorized !== false
    || manifest?.releaseGovernance?.expertClaimsAuthorized !== false
    || manifest?.components?.length !== 9) {
    fail("SAVED_MANIFEST_MISMATCH", "saved Bazi v1.7 manifest 固定历史身份或结构漂移。");
  }
}

function assertHistoricalD0(snapshot, ledger) {
  assertRawIdentity(snapshot, HISTORICAL_D0, "historical D0");
  if (ledger?.ledgerId !== HISTORICAL_D0.ledgerId
    || ledger?.ledgerDigest !== HISTORICAL_D0.ledgerDigest
    || computeHistoricalD0Digest(ledger) !== HISTORICAL_D0.ledgerDigest
    || ledger?.currentExpectedManifestPreview?.semanticManifestDigest
      !== HISTORICAL_D0.storedPreviewDigest
    || ledger?.driftDecisions?.length !== HISTORICAL_D0.storedDriftEntryCount
    || ledger?.gateSummary?.driftEntriesWithOwnerDecision
      !== HISTORICAL_D0.ownerDecisionsRecorded
    || ledger?.gateSummary?.manifestRebindAuthorized !== false
    || ledger?.gateSummary?.releaseCandidateFreezeAllowed !== false
    || ledger?.gateSummary?.publicDeploymentAuthorized !== false
    || ledger?.gateSummary?.expertClaimsAuthorized !== false) {
    fail("HISTORICAL_D0_MISMATCH", "旧 D0 固定失败关闭账身份或红门漂移。");
  }
}

function assertTransitivePolicyClosure(policySnapshot, policy, gapSnapshot, gap) {
  if (policySnapshot.rawBytes !== POLICY_V11.bytes
    || policySnapshot.rawSha256 !== POLICY_V11.sha256
    || policy?.candidateId !== POLICY_V11.id
    || policy?.candidateDigest !== POLICY_V11.digest
    || !artifactMatches(policy?.versionedCandidateParentRebind?.candidateGap, ENGINEERING_GAP_V11)
    || !artifactMatches(policy?.versionedCandidateParentRebind?.candidateReadiness, READINESS_V17)
    || policy?.versionedCandidateParentRebind?.activeAdmissionEffect !== "none"
    || policy?.versionedCandidateParentRebind?.formalActivationAllowed !== false) {
    fail("POLICY_TRANSITIVE_CLOSURE_MISMATCH", "policy 1.1 transitive gap/readiness 身份漂移。");
  }
  if (gapSnapshot.rawBytes !== ENGINEERING_GAP_V11.bytes
    || gapSnapshot.rawSha256 !== ENGINEERING_GAP_V11.sha256
    || gap?.ledgerId !== ENGINEERING_GAP_V11.id
    || gap?.ledgerDigest !== ENGINEERING_GAP_V11.digest
    || !artifactMatches(gap?.versionedCandidateParentRebind?.candidatePr10bc, PR10BC_V11)
    || !artifactMatches(gap?.versionedCandidateParentRebind?.candidateReadiness, READINESS_V17)
    || gap?.versionedCandidateParentRebind?.activeAdmissionEffect !== "none"
    || gap?.versionedCandidateParentRebind?.formalActivationAllowed !== false) {
    fail("GAP_TRANSITIVE_CLOSURE_MISMATCH", "engineering gap 1.1 transitive PR/readiness 身份漂移。");
  }
}

async function replayCurrentPreview(workspaceRoot, savedManifest, reader) {
  const cachePaths = [];
  const cacheSnapshots = [];
  const components = [];
  const changedFiles = [];
  const componentReceipts = [];
  let unchangedComponentCount = 0;
  let changedComponentCount = 0;
  async function readOnce(relativePath) {
    for (let index = 0; index < cachePaths.length; index += 1) {
      if (cachePaths[index] === relativePath) return cacheSnapshots[index];
    }
    const snapshot = await reader(workspaceRoot, relativePath);
    REFLECT_APPLY(ARRAY_PUSH, cachePaths, [relativePath]);
    REFLECT_APPLY(ARRAY_PUSH, cacheSnapshots, [snapshot]);
    return snapshot;
  }
  for (let componentIndex = 0;
    componentIndex < savedManifest.components.length;
    componentIndex += 1) {
    const savedComponent = savedManifest.components[componentIndex];
    const currentFiles = [];
    const componentChangedFiles = [];
    for (let fileIndex = 0; fileIndex < savedComponent.files.length; fileIndex += 1) {
      const savedFile = savedComponent.files[fileIndex];
      const snapshot = await readOnce(savedFile.path);
      const currentFile = { path: savedFile.path, sha256: snapshot.rawSha256 };
      REFLECT_APPLY(ARRAY_PUSH, currentFiles, [currentFile]);
      if (savedFile.sha256 !== currentFile.sha256) {
        REFLECT_APPLY(ARRAY_PUSH, componentChangedFiles, [{
          componentId: savedComponent.componentId,
          path: savedFile.path,
          savedSha256: savedFile.sha256,
          currentSha256: currentFile.sha256
        }]);
      }
    }
    const currentComponentUnsigned = {
      componentId: savedComponent.componentId,
      version: savedComponent.version,
      status: savedComponent.status,
      files: currentFiles
    };
    const currentComponent = {
      ...currentComponentUnsigned,
      digest: computeComponentDigest(currentComponentUnsigned)
    };
    for (let index = 0; index < componentChangedFiles.length; index += 1) {
      componentChangedFiles[index].savedComponentDigest = savedComponent.digest;
      componentChangedFiles[index].currentComponentDigest = currentComponent.digest;
      REFLECT_APPLY(ARRAY_PUSH, changedFiles, [componentChangedFiles[index]]);
    }
    const changed = savedComponent.digest !== currentComponent.digest;
    if (changed) changedComponentCount += 1;
    else unchangedComponentCount += 1;
    REFLECT_APPLY(ARRAY_PUSH, componentReceipts, [{
      componentId: savedComponent.componentId,
      version: savedComponent.version,
      status: savedComponent.status,
      fileCount: savedComponent.files.length,
      driftEntryCount: componentChangedFiles.length,
      savedComponentDigest: savedComponent.digest,
      currentComponentDigest: currentComponent.digest,
      savedMatchesCurrent: !changed
    }]);
    REFLECT_APPLY(ARRAY_PUSH, components, [currentComponent]);
  }
  const preview = canonicalValue(savedManifest);
  preview.components = components;
  preview.manifestDigest = computeHistoricalManifestDigest(preview);
  let goldenSha256 = null;
  for (let index = 0; index < cachePaths.length; index += 1) {
    if (cachePaths[index]
      === "packages/research-export/src/golden/single-chart-report.contract.v1.7.json") {
      goldenSha256 = cacheSnapshots[index].rawSha256;
    }
  }
  if (preview.manifestDigest !== CURRENT_PREVIEW_DIGEST
    || components.length !== 9
    || unchangedComponentCount !== 5
    || changedComponentCount !== 4
    || changedFiles.length !== 11
    || goldenSha256 !== FROZEN_GOLDEN_SHA256) {
    fail("CURRENT_PREVIEW_CHANGED", "当前非权威 Bazi preview 不等于冻结的 9/5/4/11 观察点。");
  }
  const uniqueDriftPaths = [];
  for (let index = 0; index < changedFiles.length; index += 1) {
    let found = false;
    for (let prior = 0; prior < uniqueDriftPaths.length; prior += 1) {
      if (uniqueDriftPaths[prior] === changedFiles[index].path) found = true;
    }
    if (!found) REFLECT_APPLY(ARRAY_PUSH, uniqueDriftPaths, [changedFiles[index].path]);
  }
  if (uniqueDriftPaths.length !== 8) {
    fail("CURRENT_PREVIEW_CHANGED", "当前非权威 Bazi preview 唯一漂移路径数不再为 8。");
  }
  const observedDriftIds = [];
  for (let index = 0; index < componentReceipts.length; index += 1) {
    if (!componentReceipts[index].savedMatchesCurrent) {
      REFLECT_APPLY(ARRAY_PUSH, observedDriftIds, [componentReceipts[index].componentId]);
    }
  }
  if (!exactJson(observedDriftIds, DRIFT_COMPONENT_IDS)) {
    fail("CURRENT_PREVIEW_CHANGED", "当前非权威 Bazi preview 漂移组件集合变化。");
  }
  return deepFreeze(canonicalValue({
    previewDigest: preview.manifestDigest,
    componentReceipts,
    driftEntries: changedFiles,
    uniqueDriftPaths,
    componentsObserved: components.length,
    unchangedComponentsObserved: unchangedComponentCount,
    changedComponentsObserved: changedComponentCount,
    componentFileDriftEntryCount: changedFiles.length,
    uniqueDriftPathCount: uniqueDriftPaths.length,
    frozenGoldenSha256: goldenSha256,
    totalUniqueComponentFilesObserved: cachePaths.length
  }));
}

async function collectObservationInputs(workspaceRoot, options = {}) {
  const reader = options.reader ?? readBaziDttStableWorkspaceArtifact;
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const policy = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  const cm1 = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  const expertIntake =
    await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const contextCapabilities = [
    assertSupersession(supersession),
    assertReadiness(readiness, supersession),
    assertPolicy(policy),
    assertCM1(cm1),
    assertExpertIntake(expertIntake)
  ];
  const savedSnapshot = await reader(workspaceRoot, SAVED_MANIFEST.path);
  const savedManifest = parseBaziDttStrictJsonArtifact(savedSnapshot);
  assertHistoricalManifest(savedSnapshot, savedManifest);
  const d0Snapshot = await reader(workspaceRoot, HISTORICAL_D0.path);
  const d0 = parseBaziDttStrictJsonArtifact(d0Snapshot);
  assertHistoricalD0(d0Snapshot, d0);
  const policySnapshot = await reader(workspaceRoot, POLICY_V11.path);
  const policyLedger = parseBaziDttStrictJsonArtifact(policySnapshot);
  const gapSnapshot = await reader(workspaceRoot, ENGINEERING_GAP_V11.path);
  const gapLedger = parseBaziDttStrictJsonArtifact(gapSnapshot);
  assertTransitivePolicyClosure(policySnapshot, policyLedger, gapSnapshot, gapLedger);
  const preview = await replayCurrentPreview(workspaceRoot, savedManifest, reader);
  return deepFreeze(canonicalValue({
    historicalManifest: {
      path: SAVED_MANIFEST.path,
      rawBytes: savedSnapshot.rawBytes,
      rawSha256: savedSnapshot.rawSha256,
      manifestDigest: savedManifest.manifestDigest,
      createdAt: savedManifest.createdAt
    },
    historicalD0: {
      path: HISTORICAL_D0.path,
      rawBytes: d0Snapshot.rawBytes,
      rawSha256: d0Snapshot.rawSha256,
      ledgerId: d0.ledgerId,
      ledgerDigest: d0.ledgerDigest,
      storedPreviewDigest:
        d0.currentExpectedManifestPreview.semanticManifestDigest,
      storedDriftEntryCount: d0.driftDecisions.length,
      ownerDecisionsRecorded:
        d0.gateSummary.driftEntriesWithOwnerDecision
    },
    contextCapabilities,
    transitivePolicyArtifacts: [ENGINEERING_GAP_V11, PR10BC_V11],
    preview
  }));
}

export function buildBaziDomainReleaseManifestVersionAwareObservationCandidate(observations) {
  const inputs = canonicalValue(observations);
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    status: CANDIDATE_STATUS,
    createdAt: CANDIDATE_CREATED_AT,
    releaseGovernance: RELEASE_GOVERNANCE,
    historicalLineage: {
      historicalBasisArtifactCount: 2,
      verifiedReleaseParentBrandCount: 0,
      savedManifest: {
        ...inputs.historicalManifest,
        current: false,
        currentVerifierPassed: false,
        currentVerifierFailureCode: "MANIFEST_MISMATCH"
      },
      oldD0: {
        ...inputs.historicalD0,
        current: false,
        currentVerifierPassed: false,
        currentVerifierFailureCode: HISTORICAL_D0.currentFailureCode
      }
    },
    contextBrandBoundary: {
      verifiedMechanicalContextBrandCount: 5,
      directLogicalParentArtifactCount: 6,
      supportingReceiptArtifactCount: 1,
      transitivePolicyClosureArtifactCount: 2,
      verifiedReleaseParentBrandCount: 0,
      authorityInherited: false,
      activeAdmissionEffect: "none",
      capabilities: inputs.contextCapabilities,
      transitivePolicyArtifacts: inputs.transitivePolicyArtifacts
    },
    currentPreviewObservation: {
      authoritative: false,
      persistedAsDomainManifest: false,
      historicalManifestCurrentArtifactClosure: false,
      currentVerifierPassed: false,
      currentVerifierFailureCode: "MANIFEST_MISMATCH",
      perFileComponentBytesObservedWithStableHeldHandle: true,
      nonAuthoritativeCurrentExpectedPreviewDigest: inputs.preview.previewDigest,
      componentsObserved: inputs.preview.componentsObserved,
      unchangedComponentsObserved: inputs.preview.unchangedComponentsObserved,
      changedComponentsObserved: inputs.preview.changedComponentsObserved,
      componentFileDriftEntryCount: inputs.preview.componentFileDriftEntryCount,
      uniqueDriftPathCount: inputs.preview.uniqueDriftPathCount,
      totalUniqueComponentFilesObserved: inputs.preview.totalUniqueComponentFilesObserved,
      componentDriftIds: DRIFT_COMPONENT_IDS,
      componentReceipts: inputs.preview.componentReceipts,
      driftEntries: inputs.preview.driftEntries,
      frozenGoldenSha256: inputs.preview.frozenGoldenSha256,
      frozenGoldenMatchesCurrentBytes: true
    },
    candidateObservationOverlays: [
      {
        overlayId: "interpretation_and_high_risk_policy_context",
        contextCapabilityIds: [POLICY_V11.id],
        overlaysAppliedToProductionManifest: false
      },
      {
        overlayId: "source_versioned_parent_and_readiness_context",
        contextCapabilityIds: [SUPERSESSION_RECEIPT.id, READINESS_V17.id],
        overlaysAppliedToProductionManifest: false
      },
      {
        overlayId: "rights_and_materialization_context",
        contextCapabilityIds: [
          SUPERSESSION_RECEIPT.id,
          READINESS_V17.id,
          C_M1_V11.id
        ],
        overlaysAppliedToProductionManifest: false
      },
      {
        overlayId: "expert_intake_zero_instance_gap_context",
        contextCapabilityIds: [D_INTAKE_V11.id],
        overlaysAppliedToProductionManifest: false
      }
    ],
    ownerDecisionBoundary: {
      ownerAttributionVerified: false,
      ownerAcceptanceVerified: false,
      ownerDecisionsRecorded: 0,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      generatedModelMayChooseOrSign: false
    },
    observationBoundary: {
      savedManifestHashAndParseUseSameHeldHandleBuffer: true,
      oldD0HashAndParseUseSameHeldHandleBuffer: true,
      componentFileHashUsesSameHeldHandleBuffer: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    gateSummary: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      reviewerSlotsOccupied: 0,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      formalAdmissionPromotionBlocked: true,
      formalActivationAllowed: false,
      releaseCandidateFreezeAllowed: false,
      releaseReady: false
    },
    authorityBoundary: {
      engineeringObservationOnly: true,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      sourceFreezeEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    doesNotEstablish: [
      "historical_manifest_current_artifact_closure",
      "owner_attribution_acceptance_rebind_or_resign",
      "domain_or_content_truth",
      "expert_identity_credentials_independence_opinion_or_truth",
      "source_freeze_or_rights_legal_conclusion",
      "browser_pwa_service_worker_or_runtime_validation",
      "cross_file_atomic_snapshot_or_mutation_epoch",
      "interval_mutation_or_aba_exclusion",
      "release_candidate_freeze_or_release_readiness",
      "public_release_deployment_or_expert_claims_authorization",
      "cross_system_authority_inheritance"
    ]
  };
  return deepFreeze({
    ...unsigned,
    candidateDigest:
      computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(unsigned)
  });
}

function assertFalseBoundary(boundary, fields, label) {
  for (let index = 0; index < fields.length; index += 1) {
    if (boundary?.[fields[index]] !== false) {
      fail("CANDIDATE_AUTHORITY_NOT_RED", label + " 必须保持 false：" + fields[index]);
    }
  }
}

export function verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject(
  value
) {
  const candidate = canonicalValue(value);
  if (candidate.schemaVersion !== "1.1.0"
    || candidate.recordType !== RECORD_TYPE
    || candidate.candidateId !== CANDIDATE_ID
    || candidate.status !== CANDIDATE_STATUS
    || candidate.createdAt !== CANDIDATE_CREATED_AT
    || !exactJson(candidate.releaseGovernance, RELEASE_GOVERNANCE)
    || candidate.candidateDigest !== EXPECTED_PERSISTED.candidateDigest
    || candidate.candidateDigest
      !== computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(candidate)
    || candidate.historicalLineage?.historicalBasisArtifactCount !== 2
    || candidate.historicalLineage?.verifiedReleaseParentBrandCount !== 0
    || candidate.historicalLineage?.savedManifest?.rawBytes !== SAVED_MANIFEST.rawBytes
    || candidate.historicalLineage?.savedManifest?.rawSha256 !== SAVED_MANIFEST.rawSha256
    || candidate.historicalLineage?.savedManifest?.manifestDigest
      !== SAVED_MANIFEST.manifestDigest
    || candidate.historicalLineage?.savedManifest?.current !== false
    || candidate.historicalLineage?.savedManifest?.currentVerifierFailureCode
      !== "MANIFEST_MISMATCH"
    || candidate.historicalLineage?.oldD0?.rawBytes !== HISTORICAL_D0.rawBytes
    || candidate.historicalLineage?.oldD0?.rawSha256 !== HISTORICAL_D0.rawSha256
    || candidate.historicalLineage?.oldD0?.ledgerDigest !== HISTORICAL_D0.ledgerDigest
    || candidate.historicalLineage?.oldD0?.current !== false
    || candidate.historicalLineage?.oldD0?.currentVerifierFailureCode
      !== HISTORICAL_D0.currentFailureCode
    || candidate.contextBrandBoundary?.verifiedMechanicalContextBrandCount !== 5
    || candidate.contextBrandBoundary?.verifiedReleaseParentBrandCount !== 0
    || candidate.contextBrandBoundary?.authorityInherited !== false
    || candidate.contextBrandBoundary?.activeAdmissionEffect !== "none"
    || candidate.contextBrandBoundary?.capabilities?.length !== 5
    || candidate.contextBrandBoundary?.transitivePolicyArtifacts?.length !== 2
    || candidate.currentPreviewObservation?.authoritative !== false
    || candidate.currentPreviewObservation?.persistedAsDomainManifest !== false
    || candidate.currentPreviewObservation?.historicalManifestCurrentArtifactClosure !== false
    || candidate.currentPreviewObservation?.currentVerifierPassed !== false
    || candidate.currentPreviewObservation?.currentVerifierFailureCode !== "MANIFEST_MISMATCH"
    || candidate.currentPreviewObservation?.nonAuthoritativeCurrentExpectedPreviewDigest
      !== CURRENT_PREVIEW_DIGEST
    || candidate.currentPreviewObservation?.componentsObserved !== 9
    || candidate.currentPreviewObservation?.unchangedComponentsObserved !== 5
    || candidate.currentPreviewObservation?.changedComponentsObserved !== 4
    || candidate.currentPreviewObservation?.componentFileDriftEntryCount !== 11
    || candidate.currentPreviewObservation?.uniqueDriftPathCount !== 8
    || !exactJson(candidate.currentPreviewObservation?.componentDriftIds, DRIFT_COMPONENT_IDS)
    || candidate.currentPreviewObservation?.componentReceipts?.length !== 9
    || candidate.currentPreviewObservation?.driftEntries?.length !== 11
    || candidate.currentPreviewObservation?.frozenGoldenSha256 !== FROZEN_GOLDEN_SHA256
    || candidate.currentPreviewObservation?.frozenGoldenMatchesCurrentBytes !== true
    || candidate.ownerDecisionBoundary?.ownerDecisionsRecorded !== 0
    || candidate.ownerDecisionBoundary?.manifestRebindAuthorized !== false
    || candidate.ownerDecisionBoundary?.manifestResignAuthorized !== false
    || candidate.observationBoundary?.endpointSnapshotOnly !== true
    || candidate.observationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary?.mutationEpochReceipt !== null
    || candidate.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || candidate.observationBoundary?.abaExcluded !== false
    || candidate.gateSummary?.bindingRequired !== 12
    || candidate.gateSummary?.bindingFrozenVerified !== 0
    || candidate.gateSummary?.independentExpertsRequired !== 2
    || candidate.gateSummary?.reviewerSlotsOccupied !== 0
    || candidate.gateSummary?.independentExpertReviewsVerified !== 0
    || candidate.gateSummary?.formalAdmissionPromotionBlocked !== true
    || candidate.gateSummary?.formalActivationAllowed !== false
    || candidate.gateSummary?.releaseCandidateFreezeAllowed !== false
    || candidate.gateSummary?.releaseReady !== false
    || candidate.authorityBoundary?.engineeringObservationOnly !== true) {
    fail("CANDIDATE_OBJECT_MISMATCH", "观察候选对象身份、闭包计数或红门漂移。");
  }
  assertFalseBoundary(candidate.ownerDecisionBoundary, [
    "ownerAttributionVerified",
    "ownerAcceptanceVerified",
    "manifestRebindAuthorized",
    "manifestResignAuthorized",
    "generatedModelMayChooseOrSign"
  ], "ownerDecisionBoundary");
  assertFalseBoundary(candidate.gateSummary, [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "formalActivationAllowed",
    "releaseCandidateFreezeAllowed",
    "releaseReady"
  ], "gateSummary");
  assertFalseBoundary(candidate.authorityBoundary, [
    "browserRuntimeEvidenceEstablished",
    "contentTruthEstablished",
    "expertIdentityCredentialsIndependenceEstablished",
    "expertTruthEstablished",
    "sourceFreezeEstablished",
    "rightsLegalConclusionEstablished",
    "releaseEvidenceComplete",
    "deploymentAndRollbackConfirmed",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossSystemAuthorityInheritanceAllowed"
  ], "authorityBoundary");
  return deepFreeze(candidate);
}

async function buildExpectedBundle(workspaceRoot, options = {}) {
  const observations = await collectObservationInputs(workspaceRoot, options);
  const candidate =
    buildBaziDomainReleaseManifestVersionAwareObservationCandidate(observations);
  verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject(candidate);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    observations,
    candidate,
    snapshot: snapshotForValue(candidate)
  }]);
}

function assertExpectedRawPins(snapshot, candidate) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.candidateDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "观察候选 raw/semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "观察候选 persisted raw identity 漂移。");
  }
  if (candidate.candidateDigest !== EXPECTED_PERSISTED.candidateDigest
    || computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(candidate)
      !== candidate.candidateDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "观察候选 persisted semantic digest 漂移。");
  }
}

export async function loadBaziDomainReleaseManifestVersionAwareObservationCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, PROCESS_OBJECT, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.candidate)) {
    fail("PERSISTED_CANDIDATE_MISMATCH", "persisted 观察候选不等于当前允许的独立观察投影。");
  }
  const verified =
    verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject(persisted);
  assertExpectedRawPins(snapshot, verified);
  const result = deepFreeze({
    versionAwareBaziManifestObservationMechanicallyVerified: true,
    candidateId: verified.candidateId,
    candidateDigest: verified.candidateDigest,
    artifact: {
      path:
        BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    fixedDefaultGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    activeAdmissionEffect: "none",
    historicalBasisAccounting: {
      historicalBasisArtifactCount: 2,
      verifiedReleaseParentBrandCount: 0,
      savedManifestCurrent: false,
      savedManifestVerifierFailureCode: "MANIFEST_MISMATCH",
      oldD0Current: false,
      oldD0VerifierFailureCode: HISTORICAL_D0.currentFailureCode
    },
    contextBrandAccounting: {
      verifiedMechanicalContextBrandCount: 5,
      verifiedReleaseParentBrandCount: 0,
      directLogicalParentArtifactCount: 6,
      supportingReceiptArtifactCount: 1,
      transitivePolicyClosureArtifactCount: 2,
      authorityInherited: false
    },
    currentPreviewAccounting: {
      authoritative: false,
      persistedAsDomainManifest: false,
      nonAuthoritativeCurrentExpectedPreviewDigest: CURRENT_PREVIEW_DIGEST,
      componentsObserved: 9,
      unchangedComponentsObserved: 5,
      changedComponentsObserved: 4,
      componentFileDriftEntryCount: 11,
      uniqueDriftPathCount: 8,
      componentDriftIds: DRIFT_COMPONENT_IDS
    },
    ownerDecisionAccounting: {
      ownerDecisionsRecorded: 0,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false
    },
    observationRedGates: {
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    authorityRedGates: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(
  value
) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziDomainReleaseManifestVersionAwareObservationCandidateTestOnly =
  OBJECT_FREEZE({
    CANDIDATE_ID,
    RECORD_TYPE,
    CANDIDATE_STATUS,
    CANDIDATE_DIGEST_DOMAIN,
    SAVED_MANIFEST,
    HISTORICAL_D0,
    CURRENT_PREVIEW_DIGEST,
    DRIFT_COMPONENT_IDS,
    SOURCE_V16,
    RIGHTS_V12,
    SUPERSESSION_RECEIPT,
    READINESS_V17,
    POLICY_V11,
    C_M1_V11,
    D_INTAKE_V11,
    ENGINEERING_GAP_V11,
    PR10BC_V11,
    RELEASE_GOVERNANCE,
    EXPECTED_PERSISTED,
    canonicalStringify,
    exactJson,
    serialize,
    replayCurrentPreview,
    collectObservationInputs,
    buildExpectedBundle
  });
