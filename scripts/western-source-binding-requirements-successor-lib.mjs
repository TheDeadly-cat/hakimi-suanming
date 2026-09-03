import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS,
  verifyIndependentSourceRequirements
} from "./independent-source-binding-requirements-lib.mjs";
import {
  WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

export const WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/western-source-binding-requirements.v1.1.0.json";

const DIGEST_DOMAIN = "hakimi-western-source-binding-requirements-successor-candidate-v1\0";
const LEDGER_ID = "hakimi.western-astrology.source-binding-requirements/1.1.0";
const CREATED_AT = "2026-08-31T05:00:00.000Z";
const CHILD_EVIDENCE_ID =
  "hakimi.western.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0";
const CALENDAR_SUBJECT_ID = "western.input.calendar-time-zone-and-dst";
const RIGHTS_SUBJECT_ID = "western.rights.ephemeris-time-data-redistribution";
const CALENDAR_CANDIDATE_ID = "western-iana-tzdb-2026c-input-source-candidate-v1";
const RIGHTS_CANDIDATE_ID = "western-iana-tzdb-2026c-moment-timezone-rights-candidate-v1";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
// Captured as part of the primordial inventory. Result projection below uses an
// explicit loop because native Array#map still performs ArraySpeciesCreate.
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_VALUES = Object.values;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const JSON_STRINGIFY = JSON.stringify;
const STRING_INCLUDES = String.prototype.includes;
const NATIVE_SET = Set;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const IS_PROXY = utilTypes.isProxy;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PREDECESSOR = OBJECT_FREEZE({
  role: "formal_current_western_source_binding_requirements",
  path: "content/system-admission/western-source-binding-requirements.v1.json",
  rawBytes: 25_909,
  rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.0.0"
});

const CHILD_EVIDENCE = OBJECT_FREEZE({
  role: "verified_private_branded_tzdb_source_rights_child",
  path: WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
  rawBytes: 16_931,
  rawSha256: "ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1",
  semanticDigestField: "evidenceDigest",
  semanticDigest: "14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465",
  evidenceId: CHILD_EVIDENCE_ID
});

const FORMAL_CONTEXTS = OBJECT_FREEZE([
  PREDECESSOR,
  OBJECT_FREEZE({
    role: "formal_current_western_domain_manifest",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    rawBytes: 10_832,
    rawSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    semanticDigestField: "manifestDigest",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e"
  }),
  OBJECT_FREEZE({
    role: "formal_current_western_version_observation",
    path: "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
    rawBytes: 18_879,
    rawSha256: "956fa352a87253abc893056e443bd45e3fa731531b839144e3121c43639f19df",
    semanticDigestField: "candidateDigest",
    semanticDigest: "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb"
  }),
  OBJECT_FREEZE({
    role: "four_system_current_observation_registry_v2",
    path: "content/system-admission/four-system-current-observation-registry.v2.json",
    rawBytes: 22_261,
    rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
    semanticDigestField: "registryDigest",
    semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
  }),
  OBJECT_FREEZE({
    role: "legacy_four_system_admission_registry_v1",
    path: "content/system-admission/four-system-admission.v1.json",
    rawBytes: 19_093,
    rawSha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959",
    semanticDigestField: "registryDigest",
    semanticDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a"
  })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 34_338,
  rawSha256: "7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc"
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "formal_current_requirements_replacement_or_active_effect",
  "formal_manifest_registry_or_owner_admission",
  "complete_calendar_time_zone_and_dst_subject",
  "complete_ephemeris_time_data_redistribution_subject",
  "source_body_persistence_or_complete_subject_source_bundle",
  "binding_freeze_or_subject_full_satisfaction",
  "work_version_edition_or_carrier_rights_establishment",
  "rights_legal_conclusion_or_redistribution_authorization",
  "content_truth_or_western_astrology_domain_truth",
  "expert_truth_or_independent_expert_review",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_system_equivalence_scoring_weighting_or_generated_model_winner",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternSourceBindingRequirementsSuccessorError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "WesternSourceBindingRequirementsSuccessorError";
    this.code = code;
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternSourceBindingRequirementsSuccessorError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "西洋来源后继候选超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "西洋来源后继候选超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_VALUE_INVALID", "西洋来源后继候选含无效数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "西洋来源后继候选超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "西洋来源后继候选只接受 JSON 数据值。");
  if (IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "西洋来源后继候选不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("INPUT_CYCLE_FORBIDDEN", "西洋来源后继候选不接受循环引用。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("INPUT_ALIAS_FORBIDDEN", "西洋来源后继候选不接受对象别名。");
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = ARRAY_IS_ARRAY(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "西洋来源后继候选对象不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      if (typeof descriptorKeys[keyIndex] === "symbol") {
        fail("INPUT_SYMBOL_FORBIDDEN", "西洋来源后继候选不接受 Symbol 属性。");
      }
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋来源后继候选数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set || !NUMBER_IS_SAFE_INTEGER(length)
        || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "西洋来源后继候选数组长度无效。");
      }
      const allowed = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowed, ["length"]);
      for (let index = 0; index < length; index += 1) REFLECT_APPLY(SET_ADD, allowed, [String(index)]);
      for (let index = 0; index < descriptorKeys.length; index += 1) {
        if (!REFLECT_APPLY(SET_HAS, allowed, [descriptorKeys[index]])) {
          fail("INPUT_ARRAY_INVALID", "西洋来源后继候选数组含额外属性。");
        }
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "西洋来源后继候选不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [passiveCapture(descriptor.value, state, depth + 1)]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋来源后继候选只接受普通对象。");
    const output = {};
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      const key = descriptorKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "西洋来源后继候选不接受访问器或不可枚举字段。");
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: passiveCapture(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function capturePassiveJson(value) {
  return passiveCapture(value, {
    active: new NATIVE_WEAK_SET(),
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    text: 0
  }, 0);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_VALUES(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value));
  for (let index = 0; index < descriptors.length; index += 1) {
    if ("value" in descriptors[index]) deepFreeze(descriptors[index].value, seen);
  }
  return OBJECT_FREEZE(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && NUMBER_IS_FINITE(value) && !OBJECT_IS(value, -0)) return value;
  if (ARRAY_IS_ARRAY(value)) {
    const output = [];
    OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
    for (let index = 0; index < value.length; index += 1) {
      REFLECT_APPLY(ARRAY_PUSH, output, [canonicalValue(value[index])]);
    }
    return output;
  }
  if (value && typeof value === "object" && OBJECT_GET_PROTOTYPE_OF(value) === OBJECT_PROTOTYPE) {
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(value);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalValue(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "西洋来源后继候选只接受有限规范 JSON 值。");
}

export function canonicalStringifyWesternSourceBindingRequirementsSuccessor(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeWesternSourceBindingRequirementsSuccessorDigest(ledger) {
  const captured = capturePassiveJson(ledger);
  const unsigned = {};
  const keys = OBJECT_KEYS(captured);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "ledgerDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, key, {
      value: captured[key],
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return sha256Text(
    DIGEST_DOMAIN + canonicalStringifyWesternSourceBindingRequirementsSuccessor(unsigned)
  );
}

export function parseWesternSourceBindingRequirementsSuccessorJsonBytes(
  bytes,
  label = WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function artifactIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

function westernDefinition() {
  for (let index = 0; index < INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS.length; index += 1) {
    const definition = INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS[index];
    if (definition.productSystemId === "western-astrology") return definition;
  }
  fail("WESTERN_DEFINITION_MISSING", "西洋来源 requirement definition 缺失。");
}

async function loadVerifiedPredecessor(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  assertArtifactIdentity(snapshot, PREDECESSOR, "western source requirements predecessor");
  let ledger;
  try {
    ledger = parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail("PREDECESSOR_JSON_INVALID", "西洋来源 requirements v1 不是严格 JSON。", cause);
  }
  const verification = await verifyIndependentSourceRequirements(workspaceRoot, westernDefinition(), ledger);
  if (verification.ledgerDigest !== PREDECESSOR.semanticDigest
    || ledger.ledgerId !== PREDECESSOR.ledgerId
    || ledger.status !== "requirements_only_no_bindings_frozen"
    || ledger.gateSummary?.bindingRequired !== 28
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.sourceCandidatesAttached !== 0
    || !ARRAY_IS_ARRAY(ledger.subjects) || ledger.subjects.length !== 28) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "西洋来源 requirements v1 语义身份或 0/28 状态漂移。");
  }
  return OBJECT_FREEZE({ snapshot, ledger: verification.ledger });
}

function requireVerifiedChild(childResult) {
  if (!isVerifiedWesternTzdb2026cSourceRightsEvidence(childResult)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED", "后继候选必须消费 loader 私有品牌的 tzdb child。");
  }
  if (childResult.evidenceId !== CHILD_EVIDENCE.evidenceId
    || childResult.evidenceDigest !== CHILD_EVIDENCE.semanticDigest
    || childResult.ledgerArtifact?.path !== CHILD_EVIDENCE.path
    || childResult.ledgerArtifact?.rawBytes !== CHILD_EVIDENCE.rawBytes
    || childResult.ledgerArtifact?.rawSha256 !== CHILD_EVIDENCE.rawSha256
    || childResult.partialCandidatesAttached !== 2
    || childResult.sourceBindingsRequired !== 28
    || childResult.sourceBindingsFrozenVerified !== 0
    || childResult.rightsLegalConclusionEstablished !== false
    || childResult.releaseReady !== false
    || childResult.publicReleaseAuthorized !== false) {
    fail("CHILD_IDENTITY_DRIFT", "私有品牌 tzdb child 的 raw、semantic 或失败关闭身份漂移。");
  }
  const projections = childResult.ledger?.subjectProjections;
  if (!ARRAY_IS_ARRAY(projections) || projections.length !== 2
    || projections[0]?.subjectId !== CALENDAR_SUBJECT_ID
    || projections[0]?.candidateId !== CALENDAR_CANDIDATE_ID
    || projections[0]?.coverageScope !== "iana_2026c_release_and_bundled_packed_artifact_identity_only"
    || projections[1]?.subjectId !== RIGHTS_SUBJECT_ID
    || projections[1]?.candidateId !== RIGHTS_CANDIDATE_ID
    || projections[1]?.coverageScope !== "iana_tzdb_and_moment_timezone_only") {
    fail("CHILD_PROJECTION_DRIFT", "tzdb child 两个 subject projection 漂移。");
  }
  for (let index = 0; index < projections.length; index += 1) {
    const projection = projections[index];
    if (projection.bindingState !== "candidate_only_unbound"
      || projection.subjectFullySatisfied !== false
      || projection.frozenBindingId !== null
      || projection.countsTowardFrozenBindingGate !== false) {
      fail("CHILD_PROJECTION_PROMOTION", "tzdb child projection 不得伪造冻结或完整满足。");
    }
  }
  return childResult;
}

function quoteRecord(sourceId, quote) {
  return {
    sourceId,
    text: quote.text,
    utf8Bytes: quote.utf8Bytes,
    sha256: quote.sha256,
    locator: quote.locator
  };
}

function candidateEvidenceBindings(childResult) {
  const ledger = childResult.ledger;
  const evidenceArtifact = {
    path: CHILD_EVIDENCE.path,
    rawBytes: CHILD_EVIDENCE.rawBytes,
    rawSha256: CHILD_EVIDENCE.rawSha256,
    evidenceId: CHILD_EVIDENCE.evidenceId,
    evidenceDigest: CHILD_EVIDENCE.semanticDigest
  };
  return [
    {
      subjectId: CALENDAR_SUBJECT_ID,
      candidateId: CALENDAR_CANDIDATE_ID,
      coverageScope: "iana_2026c_release_and_bundled_packed_artifact_identity_only",
      bindingState: "candidate_only_unbound",
      evidenceArtifact: { ...evidenceArtifact },
      fixedSourceIdentities: [
        {
          role: "iana_tzdb_2026c_release_archive",
          version: "2026c",
          url: ledger.officialIanaEvidence.dataArchive.url,
          rawBytes: ledger.officialIanaEvidence.dataArchive.rawBytes,
          rawSha256: ledger.officialIanaEvidence.dataArchive.rawSha256
        },
        {
          role: "moment_timezone_0_6_3_packed_carrier",
          version: "0.6.3/iana-2026c",
          url: ledger.npmCarrierEvidence.tarball.url,
          rawBytes: ledger.npmCarrierEvidence.tarball.rawBytes,
          rawSha256: ledger.npmCarrierEvidence.tarball.rawSha256
        }
      ],
      minimalExactQuotes: [
        quoteRecord(
          "iana_tzdb_2026c_version_representation",
          ledger.officialIanaEvidence.versionRepresentation.exactQuote
        )
      ],
      sourceBodyDigest: null,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      exactLocatorEstablished: true,
      subjectFullySatisfied: false,
      frozenBindingId: null,
      workRightsEstablished: false,
      versionRightsEstablished: false,
      carrierRightsEstablished: false,
      independentExpertReviewVerified: false,
      countsTowardFrozenBindingGate: false
    },
    {
      subjectId: RIGHTS_SUBJECT_ID,
      candidateId: RIGHTS_CANDIDATE_ID,
      coverageScope: "iana_tzdb_and_moment_timezone_only",
      bindingState: "candidate_only_unbound",
      evidenceArtifact: { ...evidenceArtifact },
      fixedSourceIdentities: [
        {
          role: "iana_tzdb_2026c_license_representation",
          version: "2026c",
          url: ledger.officialIanaEvidence.licenseRepresentation.url,
          rawBytes: ledger.officialIanaEvidence.licenseRepresentation.rawBytes,
          rawSha256: ledger.officialIanaEvidence.licenseRepresentation.rawSha256
        },
        {
          role: "moment_timezone_0_6_3_license_carrier",
          version: "0.6.3",
          path: "node_modules/moment-timezone/LICENSE",
          rawBytes: 1_097,
          rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
        }
      ],
      minimalExactQuotes: [
        quoteRecord(
          "iana_tzdb_2026c_license_representation",
          ledger.officialIanaEvidence.licenseRepresentation.exactQuote
        ),
        quoteRecord(
          "moment_timezone_0_6_3_license_carrier",
          ledger.npmCarrierEvidence.mitMinimalExactQuote
        )
      ],
      sourceBodyDigest: null,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      exactLocatorEstablished: true,
      subjectFullySatisfied: false,
      frozenBindingId: null,
      workRightsEstablished: false,
      versionRightsEstablished: false,
      carrierRightsEstablished: false,
      independentRightsReviewVerified: false,
      countsTowardFrozenBindingGate: false
    }
  ];
}

function successorSubject(predecessorSubject, binding) {
  if (binding === null) return predecessorSubject;
  return {
    ...predecessorSubject,
    bindingState: "candidate_only_unbound",
    sourceCandidateIds: [binding.candidateId],
    frozenBindingId: null,
    sourceBodyDigest: null,
    exactQuoteStored: true,
    exactLocatorEstablished: true,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusion: "not_established",
    expertReviewIds: [],
    frozenAt: null,
    coverageScope: binding.coverageScope,
    candidateEvidenceDigest: CHILD_EVIDENCE.semanticDigest,
    subjectFullySatisfied: false,
    countsTowardFrozenBindingGate: false
  };
}

export function buildExpectedWesternSourceBindingRequirementsSuccessor(
  predecessorInput,
  childResult
) {
  const predecessor = capturePassiveJson(predecessorInput);
  requireVerifiedChild(childResult);
  if (predecessor.ledgerId !== PREDECESSOR.ledgerId
    || predecessor.ledgerDigest !== PREDECESSOR.semanticDigest
    || predecessor.subjects?.length !== 28) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "后继构建只接受固定 v1 predecessor。");
  }
  const bindings = candidateEvidenceBindings(childResult);
  const bindingBySubject = new NATIVE_MAP();
  REFLECT_APPLY(MAP_SET, bindingBySubject, [CALENDAR_SUBJECT_ID, bindings[0]]);
  REFLECT_APPLY(MAP_SET, bindingBySubject, [RIGHTS_SUBJECT_ID, bindings[1]]);
  const subjects = [];
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const subject = predecessor.subjects[index];
    const binding = REFLECT_APPLY(MAP_GET, bindingBySubject, [subject.subjectId]);
    REFLECT_APPLY(ARRAY_PUSH, subjects, [successorSubject(subject, binding ?? null)]);
  }
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "independent_system_source_binding_requirements_successor_candidate",
    ledgerId: LEDGER_ID,
    productSystemId: predecessor.productSystemId,
    contractSystemId: predecessor.contractSystemId,
    status: "requirements_plus_two_partial_candidates_no_bindings_frozen_not_manifest_integrated",
    createdAt: CREATED_AT,
    releaseGovernance: capturePassiveJson(predecessor.releaseGovernance),
    predecessorBinding: {
      path: PREDECESSOR.path,
      rawBytes: PREDECESSOR.rawBytes,
      rawSha256: PREDECESSOR.rawSha256,
      ledgerId: PREDECESSOR.ledgerId,
      ledgerDigest: PREDECESSOR.semanticDigest,
      remainsFormalCurrent: true
    },
    childEvidenceBinding: {
      path: CHILD_EVIDENCE.path,
      rawBytes: CHILD_EVIDENCE.rawBytes,
      rawSha256: CHILD_EVIDENCE.rawSha256,
      evidenceId: CHILD_EVIDENCE.evidenceId,
      evidenceDigest: CHILD_EVIDENCE.semanticDigest,
      privateBrandRequiredAtVerification: true,
      relationship: "one_way_child_evidence_to_non_consumed_successor_candidate"
    },
    formalStateBoundary: {
      predecessorRemainsFormalCurrent: true,
      successorIsFormalCurrent: false,
      successorActiveEffect: "none",
      formalParentConsumptionEstablished: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      predecessorMutated: false,
      predecessorBacklinkAdded: false
    },
    defaultClosureRequirements: capturePassiveJson(predecessor.defaultClosureRequirements),
    basisArtifacts: capturePassiveJson(predecessor.basisArtifacts),
    candidateEvidenceBindings: bindings,
    subjects,
    gateSummary: {
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      partialCandidatesAttached: 2,
      sourceCandidatesAttached: 2,
      subjectFullySatisfied: 0,
      sourceBodiesBound: 0,
      minimalExactQuotesStored: 3,
      minimalExactQuoteObservationsAttached: 3,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 2,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      editionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      expertReviewedSubjects: 0,
      independentRightsReviewsVerified: 0,
      independentEngineeringReviewsVerified: 0,
      independentDomainExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringRequirementIdentity: "predecessor_raw_semantics_and_26_unchanged_subjects_plus_two_partial_candidates_verified",
      browserRuntimeEvidence: "not_assessed_in_successor_candidate",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    integrityBoundary: {
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      exclusiveCreateWriterRequired: true,
      canonicalPrettyJsonWithLfRequired: true,
      domainSeparatedDigestIsDigitalSignature: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH]
  };
  const ledger = {
    ...unsigned,
    ledgerDigest: computeWesternSourceBindingRequirementsSuccessorDigest(unsigned)
  };
  return deepFreeze(ledger);
}

function assertFailClosed(ledger) {
  const formal = ledger?.formalStateBoundary;
  const gate = ledger?.gateSummary;
  const integrity = ledger?.integrityBoundary;
  if (!formal || formal.predecessorRemainsFormalCurrent !== true
    || formal.successorIsFormalCurrent !== false || formal.successorActiveEffect !== "none"
    || formal.formalParentConsumptionEstablished !== false
    || formal.formalManifestIntegrated !== false || formal.formalRegistryIntegrated !== false
    || formal.ownerAdmissionAccepted !== false || formal.predecessorMutated !== false
    || formal.predecessorBacklinkAdded !== false) {
    fail("FORMAL_STATE_PROMOTION_FORBIDDEN", "后继候选必须保持 predecessor 正式当前、successor 零生效。");
  }
  if (!gate || gate.bindingRequired !== 28 || gate.bindingFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.sourceCandidatesAttached !== 2
    || gate.subjectFullySatisfied !== 0 || gate.sourceBodiesBound !== 0
    || gate.minimalExactQuotesStored !== 3
    || gate.minimalExactQuoteObservationsAttached !== 3 || gate.exactQuotesBound !== 0
    || gate.remoteBodiesPersistedInThisSuccessorRecord !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.editionRightsEstablished !== 0 || gate.carrierRightsEstablished !== 0
    || gate.expertReviewedSubjects !== 0 || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.sourceBundleComplete !== false || gate.rightsBundleComplete !== false
    || gate.expertReviewBundleComplete !== false || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.formalManifestIntegrated !== false
    || gate.formalRegistryIntegrated !== false || gate.ownerAdmissionAccepted !== false
    || gate.releaseReady !== false || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "后继候选必须保持 0/28、无权利、无专家及无发布准入。");
  }
  if (!integrity || integrity.mutationEpochAvailable !== false
    || integrity.mutationEpochReceipt !== null
    || integrity.crossFileAtomicSnapshotEstablished !== false
    || integrity.intervalMutationExcludedAcrossFiles !== false
    || integrity.abaExcluded !== false) {
    fail("INTEGRITY_OVERCLAIM_FORBIDDEN", "后继候选不得声称 mutation epoch、跨文件原子性、区间完整性或 ABA 排除。");
  }
}

function assertTwentySixSubjectsCanonicalExact(predecessor, successor) {
  if (!ARRAY_IS_ARRAY(successor?.subjects) || successor.subjects.length !== 28) {
    fail("SUBJECT_INVENTORY_DRIFT", "后继候选必须保持 28 个 canonical subject。");
  }
  let changed = 0;
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = successor.subjects[index];
    if (before.subjectId !== after?.subjectId) fail("SUBJECT_ORDER_DRIFT", "后继候选 subject 顺序或身份漂移。");
    const target = before.subjectId === CALENDAR_SUBJECT_ID || before.subjectId === RIGHTS_SUBJECT_ID;
    const equal = canonicalStringifyWesternSourceBindingRequirementsSuccessor(before)
      === canonicalStringifyWesternSourceBindingRequirementsSuccessor(after);
    if (target) {
      if (equal || after.bindingState !== "candidate_only_unbound"
        || after.subjectFullySatisfied !== false || after.frozenBindingId !== null
        || after.workRightsEstablished !== false || after.editionRightsEstablished !== false
        || after.carrierRightsEstablished !== false || after.rightsLegalConclusion !== "not_established"
        || !ARRAY_IS_ARRAY(after.expertReviewIds) || after.expertReviewIds.length !== 0
        || after.countsTowardFrozenBindingGate !== false) {
        fail("TARGET_SUBJECT_BOUNDARY_DRIFT", "两个目标 subject 必须仅成为 partial candidate 且保持 unbound。");
      }
      changed += 1;
    } else if (!equal) {
      fail("NON_TARGET_SUBJECT_DRIFT", "26 个非目标 subject 必须与 predecessor canonical-exact。");
    }
  }
  if (changed !== 2) fail("SUBJECT_CHANGE_COUNT_DRIFT", "后继候选必须且只能改变两个 subject。");
}

export function verifyWesternSourceBindingRequirementsSuccessorLedger(
  input,
  predecessorInput,
  childResult
) {
  const ledger = capturePassiveJson(input);
  const predecessor = capturePassiveJson(predecessorInput);
  requireVerifiedChild(childResult);
  assertFailClosed(ledger);
  assertTwentySixSubjectsCanonicalExact(predecessor, ledger);
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "后继候选 ledgerDigest 必须是小写 SHA-256。");
  }
  if (computeWesternSourceBindingRequirementsSuccessorDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "后继候选 domain-separated digest 不匹配。");
  }
  const expected = buildExpectedWesternSourceBindingRequirementsSuccessor(predecessor, childResult);
  if (canonicalStringifyWesternSourceBindingRequirementsSuccessor(ledger)
    !== canonicalStringifyWesternSourceBindingRequirementsSuccessor(expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "后继候选与固定 predecessor、child 及零生效合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeWesternSourceBindingRequirementsSuccessor(ledger) {
  const captured = capturePassiveJson(ledger);
  assertFailClosed(captured);
  if (computeWesternSourceBindingRequirementsSuccessorDigest(captured) !== captured.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "后继候选序列化前摘要不匹配。");
  }
  return JSON_STRINGIFY(captured, null, 2) + "\n";
}

async function scanFormalContextsForBacklinks(workspaceRoot) {
  const snapshots = [];
  const needles = [
    LEDGER_ID,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH,
    CHILD_EVIDENCE.evidenceId,
    CHILD_EVIDENCE.path
  ];
  for (let index = 0; index < FORMAL_CONTEXTS.length; index += 1) {
    const expected = FORMAL_CONTEXTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    let parsed;
    try {
      parsed = parseBaziDttStrictJsonArtifact(snapshot);
    } catch (cause) {
      fail("FORMAL_CONTEXT_JSON_INVALID", `${expected.role} 不是严格 JSON。`, cause);
    }
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest) {
      fail("FORMAL_CONTEXT_SEMANTIC_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    const text = decodeUtf8(snapshot.bytes, expected.role);
    for (let needleIndex = 0; needleIndex < needles.length; needleIndex += 1) {
      if (REFLECT_APPLY(STRING_INCLUDES, text, [needles[needleIndex]])) {
        fail("FORMAL_CONTEXT_BACKLINK_FORBIDDEN", `${expected.role} 不得反向消费 child 或 successor candidate。`);
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  return snapshots;
}

async function loadUpstreams(workspaceRoot) {
  const predecessor = await loadVerifiedPredecessor(workspaceRoot);
  const child = requireVerifiedChild(await loadWesternTzdb2026cSourceRightsEvidence(workspaceRoot));
  const formalContextSnapshots = await scanFormalContextsForBacklinks(workspaceRoot);
  return OBJECT_FREEZE({ predecessor, child, formalContextSnapshots });
}

export async function buildCurrentWesternSourceBindingRequirementsSuccessor(workspaceRoot = process.cwd()) {
  const upstreams = await loadUpstreams(workspaceRoot);
  return buildExpectedWesternSourceBindingRequirementsSuccessor(
    upstreams.predecessor.ledger,
    upstreams.child
  );
}

export async function loadWesternSourceBindingRequirementsSuccessor(workspaceRoot = process.cwd()) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)
    || EXPECTED_PERSISTED_RAW.rawSha256 === "0".repeat(64)) {
    fail("PERSISTED_IDENTITY_UNSET", "西洋来源后继候选 raw identity 尚未冻结。");
  }
  const upstreams = await loadUpstreams(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "西洋来源后继候选 raw identity 漂移。");
  }
  const parsed = parseWesternSourceBindingRequirementsSuccessorJsonBytes(snapshot.bytes, snapshot.path);
  const ledger = verifyWesternSourceBindingRequirementsSuccessorLedger(
    parsed,
    upstreams.predecessor.ledger,
    upstreams.child
  );
  if (decodeUtf8(snapshot.bytes, "western source requirements successor")
    !== serializeWesternSourceBindingRequirementsSuccessor(ledger)) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "后继候选必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const formalContextArtifacts = [];
  for (let index = 0; index < upstreams.formalContextSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, formalContextArtifacts, [
      artifactIdentity(upstreams.formalContextSnapshots[index])
    ]);
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    predecessorRemainsFormalCurrent: ledger.formalStateBoundary.predecessorRemainsFormalCurrent,
    successorIsFormalCurrent: ledger.formalStateBoundary.successorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.successorActiveEffect,
    partialCandidatesAttached: ledger.gateSummary.partialCandidatesAttached,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    minimalExactQuotesStored: ledger.gateSummary.minimalExactQuotesStored,
    minimalExactQuoteObservationsAttached:
      ledger.gateSummary.minimalExactQuoteObservationsAttached,
    exactQuotesBound: ledger.gateSummary.exactQuotesBound,
    workRightsEstablished: ledger.gateSummary.workRightsEstablished,
    versionRightsEstablished: ledger.gateSummary.versionRightsEstablished,
    carrierRightsEstablished: ledger.gateSummary.carrierRightsEstablished,
    formalManifestIntegrated: ledger.gateSummary.formalManifestIntegrated,
    formalRegistryIntegrated: ledger.gateSummary.formalRegistryIntegrated,
    ownerAdmissionAccepted: ledger.gateSummary.ownerAdmissionAccepted,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: artifactIdentity(snapshot),
    predecessorArtifact: artifactIdentity(upstreams.predecessor.snapshot),
    childArtifact: { ...CHILD_EVIDENCE },
    formalContextArtifacts,
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternSourceBindingRequirementsSuccessor(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernSourceBindingRequirementsSuccessorTestOnly = OBJECT_FREEZE({
  DIGEST_DOMAIN,
  LEDGER_ID,
  CREATED_AT,
  PREDECESSOR,
  CHILD_EVIDENCE,
  FORMAL_CONTEXTS,
  EXPECTED_PERSISTED_RAW,
  DOES_NOT_ESTABLISH,
  CALENDAR_SUBJECT_ID,
  RIGHTS_SUBJECT_ID,
  CALENDAR_CANDIDATE_ID,
  RIGHTS_CANDIDATE_ID,
  ARRAY_MAP,
  scanFormalContextsForBacklinks,
  loadVerifiedPredecessor
});
