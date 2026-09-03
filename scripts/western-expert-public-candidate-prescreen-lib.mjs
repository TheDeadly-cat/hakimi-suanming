import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS,
  readIndependentSourceRequirements,
  verifyIndependentSourceRequirements
} from "./independent-source-binding-requirements-lib.mjs";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  loadIndependentDomainManifest,
  isVerifiedIndependentDomainManifestFullLoad
} from "./independent-domain-release-manifest-lib.mjs";
import {
  loadWesternProductizationVersionAwareObservationCandidate,
  isVerifiedWesternProductizationVersionAwareObservationResult
} from "./western-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  loadFourSystemCurrentObservationRegistryV2,
  isVerifiedFourSystemCurrentObservationRegistryV2
} from "./four-system-current-observation-registry-v2-lib.mjs";

export const WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH =
  "content/system-admission/western-expert-public-candidate-prescreen.v1.json";

const DIGEST_DOMAIN = "hakimi-western-expert-public-candidate-prescreen-v1\0";
const LEDGER_ID = "hakimi.western.expert-public-candidate-prescreen/1.0.0";
const CREATED_AT = "2026-08-31T10:00:00.000Z";
const OBSERVED_AT = "2026-08-31";
const CANDIDATE_STATE = "uncontacted_public_candidate_lead";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SOME = Array.prototype.some;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const JSON_STRINGIFY = JSON.stringify;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const STRING_INCLUDES = String.prototype.includes;
const STRING_SPLIT = String.prototype.split;
const NATIVE_SET = Set;
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

const BASIS_ARTIFACT = OBJECT_FREEZE({
  path: "docs/阶段E-西洋现实专家公开候选预筛-2026-08-31.md",
  role: "non_authoritative_public_prescreen_narrative_basis",
  rawBytes: 10_767,
  rawSha256: "0e14973a85f31c5bf4448578b939d99d70f6674bf3ec34442692f7d621037e7c"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 29_938,
  rawSha256: "5b98910325b953cbd29af3d194dbd31588ebc03e64319234088d17dfdca31ea8"
});

const UPSTREAM_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_western_source_binding_requirements",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    rawBytes: 25_909,
    rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd"
  }),
  OBJECT_FREEZE({
    role: "current_western_independent_domain_manifest",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    rawBytes: 10_832,
    rawSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    semanticDigestField: "manifestDigest",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e"
  }),
  OBJECT_FREEZE({
    role: "current_western_version_aware_observation",
    path: "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
    rawBytes: 18_879,
    rawSha256: "956fa352a87253abc893056e443bd45e3fa731531b839144e3121c43639f19df",
    semanticDigestField: "candidateDigest",
    semanticDigest: "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb"
  })
]);

export const WESTERN_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS = OBJECT_FREEZE([
  "technical-time-coordinate-astronomy",
  "zodiac-house-node-aspect",
  "dignity-retrograde-transit-progression",
  "interpretation-high-risk-boundary",
  "source-rights-role-boundary",
  "uncertainty-counterexamples-abstention"
]);

export const WESTERN_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS = OBJECT_FREEZE([
  "same_institution_or_organization",
  "teacher_student_or_lineage_relationship",
  "family_or_household_relationship",
  "shared_commercial_interest",
  "rule_or_case_set_coauthorship",
  "shared_professional_service",
  "reporting_or_supervision_relationship",
  "prior_exposure_to_other_reviewer_conclusion",
  "shared_unpublished_source_or_case_material",
  "same_upstream_algorithm_or_textbook_dependency"
]);

const SOURCE_GROUPS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "ASTROLOGICAL_ASSOCIATION",
    publicOwnerLabel: "Astrological Association",
    observationIds: OBJECT_FREEZE(["STACEY-AA-BOARD", "CHATHAM-AA-HOUSE-WORKSHOP"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "MAYO_SCHOOL",
    publicOwnerLabel: "Mayo School of Astrology",
    observationIds: OBJECT_FREEZE(["STACEY-MAYO-HISTORY"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "OPA",
    publicOwnerLabel: "Organization for Professional Astrology",
    observationIds: OBJECT_FREEZE(["STACEY-OPA-MENTORSHIP", "GRONLUND-OPA-ASTRONOMY"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "KEPLER",
    publicOwnerLabel: "Kepler College",
    observationIds: OBJECT_FREEZE([
      "GRONLUND-KEPLER-FACULTY",
      "SCOFIELD-KEPLER-FACULTY",
      "CHATHAM-KEPLER-HOUSE-COURSE"
    ])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "PAA_NCGR",
    publicOwnerLabel: "Professional Astrologers Alliance / NCGR-PAA",
    observationIds: OBJECT_FREEZE(["SCOFIELD-PAA-BOARD", "SCOFIELD-PAA-CERTIFIED"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "STA",
    publicOwnerLabel: "School of Traditional Astrology",
    observationIds: OBJECT_FREEZE(["CHATHAM-STA-DIRECTORY"])
  })
]);

const SOURCE_OBSERVATIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    sourceObservationId: "STACEY-AA-BOARD",
    candidateLeadId: "western-public-lead-001",
    sourceUrl: "https://www.astrologicalassociation.com/board-members/",
    sourceUpstreamGroupId: "ASTROLOGICAL_ASSOCIATION",
    sourceType: "public_association_board_page",
    observationSummary: "公开 board 页面提供管理、教学、写作与咨询相关候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "STACEY-MAYO-HISTORY",
    candidateLeadId: "western-public-lead-001",
    sourceUrl: "https://mayoastrology.com/history-of-the-mayo-school/",
    sourceUpstreamGroupId: "MAYO_SCHOOL",
    sourceType: "public_school_history_page",
    observationSummary: "公开学校历史页面提供 principal 角色候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "STACEY-OPA-MENTORSHIP",
    candidateLeadId: "western-public-lead-001",
    sourceUrl: "https://opaastrology.org/register/opa-mentorship-program-2026/",
    sourceUpstreamGroupId: "OPA",
    sourceType: "public_mentorship_program_page",
    observationSummary: "公开 mentorship 页面提供实践与沟通范围线索，并区分 mentorship 与 certification。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "GRONLUND-KEPLER-FACULTY",
    candidateLeadId: "western-public-lead-002",
    sourceUrl: "https://www.keplercollege.org/faculty/",
    sourceUpstreamGroupId: "KEPLER",
    sourceType: "public_faculty_page",
    observationSummary: "公开 faculty 页面提供 Astronomy for Astrologers 教学候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "GRONLUND-OPA-ASTRONOMY",
    candidateLeadId: "western-public-lead-002",
    sourceUrl: "https://opaastrology.org/immersion-workshops/astronomy-for-astrologers/",
    sourceUpstreamGroupId: "OPA",
    sourceType: "public_course_page",
    observationSummary: "公开课程页面提供占星天文学教学与 training 范围候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "SCOFIELD-PAA-BOARD",
    candidateLeadId: "western-public-lead-003",
    sourceUrl: "https://www.astrologersalliance.org/ncgr-paa-board",
    sourceUpstreamGroupId: "PAA_NCGR",
    sourceType: "public_professional_board_page",
    observationSummary: "公开 board 页面提供长期咨询、教育委员会和天文学教学候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "SCOFIELD-PAA-CERTIFIED",
    candidateLeadId: "western-public-lead-003",
    sourceUrl: "https://www.astrologersalliance.org/certified-astrologers-1",
    sourceUpstreamGroupId: "PAA_NCGR",
    sourceType: "public_certified_list_page",
    observationSummary: "公开 certified list 提供同一 PAA 上游内的候选发现线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "SCOFIELD-KEPLER-FACULTY",
    candidateLeadId: "western-public-lead-003",
    sourceUrl: "https://www.keplercollege.org/faculty/",
    sourceUpstreamGroupId: "KEPLER",
    sourceType: "public_faculty_page",
    observationSummary: "公开 faculty 页面提供天文学、技术占星与教学范围候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "CHATHAM-KEPLER-HOUSE-COURSE",
    candidateLeadId: "western-public-lead-004",
    sourceUrl: "https://store.keplercollege.org/courses/e212-astrological-house-division-the-symbolism-of-the-celestial-circles-spring-2024-25/",
    sourceUpstreamGroupId: "KEPLER",
    sourceType: "public_course_metadata_page",
    observationSummary: "公开课程元数据提供多种 house-system 比较范围候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "CHATHAM-STA-DIRECTORY",
    candidateLeadId: "western-public-lead-004",
    sourceUrl: "https://sta.co/directory/astrologers.html",
    sourceUpstreamGroupId: "STA",
    sourceType: "public_professional_directory_page",
    observationSummary: "公开目录提供 horary diploma 与实践范围候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "CHATHAM-AA-HOUSE-WORKSHOP",
    candidateLeadId: "western-public-lead-004",
    sourceUrl: "https://www.astrologicalassociation.com/product/astrological-house-division-and-the-symbolism-of-the-celestial-circles/",
    sourceUpstreamGroupId: "ASTROLOGICAL_ASSOCIATION",
    sourceType: "public_workshop_metadata_page",
    observationSummary: "公开 workshop 商品元数据提供 house-division 范围候选线索；未购买或访问材料。"
  })
]);

const CANDIDATES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    candidateLeadId: "western-public-lead-001",
    publicDisplayName: "Wendy Stacey",
    proposedReviewDirection: "western_domain_ethics_high_risk_and_methodology_candidate",
    sourceObservationIds: OBJECT_FREEZE(["STACEY-AA-BOARD", "STACEY-MAYO-HISTORY", "STACEY-OPA-MENTORSHIP"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["ASTROLOGICAL_ASSOCIATION", "MAYO_SCHOOL", "OPA"]),
    scopeStates: OBJECT_FREEZE([
      "unknown",
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "public_scope_lead_observed",
      "unknown",
      "partial_methodology_or_training_scope"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "western-public-lead-002",
    publicDisplayName: "Geoff Gronlund",
    proposedReviewDirection: "astrology_astronomy_semantics_interface_candidate_not_engineering_reviewer",
    sourceObservationIds: OBJECT_FREEZE(["GRONLUND-KEPLER-FACULTY", "GRONLUND-OPA-ASTRONOMY"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["KEPLER", "OPA"]),
    scopeStates: OBJECT_FREEZE([
      "public_scope_lead_observed",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "unknown"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "western-public-lead-003",
    publicDisplayName: "Bruce Scofield",
    proposedReviewDirection: "technical_astrology_astronomy_and_predictive_scope_candidate",
    sourceObservationIds: OBJECT_FREEZE(["SCOFIELD-PAA-BOARD", "SCOFIELD-PAA-CERTIFIED", "SCOFIELD-KEPLER-FACULTY"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["PAA_NCGR", "KEPLER"]),
    scopeStates: OBJECT_FREEZE([
      "public_scope_lead_observed",
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "unknown"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "western-public-lead-004",
    publicDisplayName: "Rhys Chatham",
    proposedReviewDirection: "house_system_comparison_candidate",
    sourceObservationIds: OBJECT_FREEZE(["CHATHAM-KEPLER-HOUSE-COURSE", "CHATHAM-STA-DIRECTORY", "CHATHAM-AA-HOUSE-WORKSHOP"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["KEPLER", "STA", "ASTROLOGICAL_ASSOCIATION"]),
    scopeStates: OBJECT_FREEZE([
      "partial_methodology_or_training_scope",
      "public_scope_lead_observed",
      "unknown",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "partial_methodology_or_training_scope"
    ])
  })
]);

const PAIR_IDS = OBJECT_FREEZE([
  "western-public-lead-001--western-public-lead-002",
  "western-public-lead-001--western-public-lead-003",
  "western-public-lead-001--western-public-lead-004",
  "western-public-lead-002--western-public-lead-003",
  "western-public-lead-002--western-public-lead-004",
  "western-public-lead-003--western-public-lead-004"
]);

const ROLE_SEPARATION = OBJECT_FREEZE([
  OBJECT_FREEZE({
    roleId: "western_domain_expert",
    mayReview: OBJECT_FREEZE(["astrology_rule_versions", "interpretation_boundaries", "high_risk_expression_boundary"]),
    doesNotEstablish: OBJECT_FREEZE(["engineering_implementation_correctness", "source_rights_or_legal_conclusion", "release_authorization"])
  }),
  OBJECT_FREEZE({
    roleId: "astronomy_engineering_reproducibility_reviewer",
    mayReview: OBJECT_FREEZE(["time_scales_and_reference_frames", "ephemeris_and_coordinate_reproducibility", "implementation_summary_and_tolerances"]),
    doesNotEstablish: OBJECT_FREEZE(["astrology_domain_truth", "interpretation_authority", "source_rights_or_legal_conclusion"])
  }),
  OBJECT_FREEZE({
    roleId: "source_rights_reviewer",
    mayReview: OBJECT_FREEZE(["work_version_carrier_identity", "license_evidence", "redistribution_facts"]),
    doesNotEstablish: OBJECT_FREEZE(["astrology_domain_truth", "legal_judgment", "release_authorization"])
  })
]);

const AUTHORITY_BOUNDARY = OBJECT_FREEZE({
  candidateDiscoveryOnly: true,
  identityVerified: false,
  credentialVerified: false,
  scopeVerified: false,
  independenceVerified: false,
  participationConsentVerified: false,
  expertStatusVerified: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  formalAdmissionAuthorized: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  crossSystemAuthorityInheritanceAuthorized: false
});

const OBSERVATION_BOUNDARY = OBJECT_FREEZE({
  heldHandleReadForLocalArtifacts: true,
  sameBufferHashAndParseForLocalJson: true,
  basisSameBufferHashAndInspection: true,
  publicPageBodiesStored: false,
  publicPageCryptographicallyAuthenticated: false,
  privateContactDataStored: false,
  paidMaterialsAccessed: false,
  unknownFieldsRejected: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "real_person_identity",
  "current_credentials",
  "six_question_scope_fit",
  "participation_consent",
  "pairwise_independence",
  "expert_status_or_expert_opinion",
  "content_truth_or_expert_truth",
  "source_body_exact_quote_or_binding",
  "rights_or_legal_conclusion",
  "formal_review_gate_or_admission",
  "cross_system_equivalence_scoring_weighting_or_winner",
  "release_readiness_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternExpertPublicCandidatePrescreenError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternExpertPublicCandidatePrescreenError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternExpertPublicCandidatePrescreenError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "西洋专家公开候选账超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "西洋专家公开候选账超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) fail("INPUT_VALUE_INVALID", "候选账含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > 1_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "候选账超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "候选账只接受 JSON 数据值。");
  if (IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "候选账不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("INPUT_CYCLE_FORBIDDEN", "候选账不接受循环引用。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("INPUT_ALIAS_FORBIDDEN", "候选账不接受对象别名。");
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
      fail("INPUT_OBJECT_UNSAFE", "候选账对象不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    if (REFLECT_APPLY(ARRAY_SOME, descriptorKeys, [(key) => typeof key === "symbol"])) {
      fail("INPUT_SYMBOL_FORBIDDEN", "候选账不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "候选账数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "候选账数组长度无效。");
      }
      const allowed = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowed, ["length"]);
      for (let index = 0; index < length; index += 1) REFLECT_APPLY(SET_ADD, allowed, [String(index)]);
      for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
        const key = descriptorKeys[keyIndex];
        if (!REFLECT_APPLY(SET_HAS, allowed, [key])) fail("INPUT_ARRAY_INVALID", "候选账数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "候选账不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [passiveCapture(descriptor.value, state, depth + 1)]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "候选账只接受普通对象。");
    const output = {};
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "候选账不接受访问器或不可枚举字段。");
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
    const descriptor = descriptors[index];
    if ("value" in descriptor) deepFreeze(descriptor.value, seen);
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
  fail("NON_CANONICAL_JSON", "候选账只接受有限规范 JSON 值。");
}

export function canonicalStringifyWesternExpertPublicCandidatePrescreen(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeWesternExpertPublicCandidatePrescreenDigest(ledger) {
  const snapshot = capturePassiveJson(ledger);
  const unsigned = {};
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "ledgerDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, key, {
      value: snapshot[key],
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return sha256Text(DIGEST_DOMAIN + canonicalStringifyWesternExpertPublicCandidatePrescreen(unsigned));
}

export function parseWesternExpertPublicCandidatePrescreenJsonBytes(
  bytes,
  label = WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "LEDGER_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function sourceObservation(entry) {
  return {
    ...entry,
    observedAt: OBSERVED_AT,
    supportsCandidateDiscoveryOnly: true,
    authoritative: false
  };
}

function copyArray(input) {
  const output = [];
  for (let index = 0; index < input.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, output, [input[index]]);
  }
  return output;
}

function mapArray(input, callback) {
  return REFLECT_APPLY(ARRAY_MAP, input, [callback]);
}

function candidate(entry) {
  return {
    candidateLeadId: entry.candidateLeadId,
    publicDisplayName: entry.publicDisplayName,
    candidateState: CANDIDATE_STATE,
    proposedReviewDirection: entry.proposedReviewDirection,
    sourceObservationIds: copyArray(entry.sourceObservationIds),
    sourceUpstreamGroupIds: copyArray(entry.sourceUpstreamGroupIds),
    deduplicatedSourceGroupCount: entry.sourceUpstreamGroupIds.length,
    multiplePublicUpstreamGroupsObserved: entry.sourceUpstreamGroupIds.length >= 2,
    scopeMatrix: mapArray(WESTERN_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS, (questionId, index) => ({
      questionId,
      state: entry.scopeStates[index]
    })),
    reviewerSlot: null,
    identityVerified: false,
    credentialVerified: false,
    scopeVerified: false,
    independenceVerified: false,
    participationConsentVerified: false,
    expertStatusVerified: false,
    expertOpinionCollected: false,
    sealedOriginalOpinion: false,
    countsTowardExpertGate: false
  };
}

function pairwiseAssessment(pairId) {
  return {
    pairId,
    candidateLeadIds: REFLECT_APPLY(STRING_SPLIT, pairId, ["--"]),
    assessmentState: "not_started",
    factorStates: mapArray(WESTERN_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS, (factorId) => ({
      factorId,
      state: factorId === "prior_exposure_to_other_reviewer_conclusion"
        ? "not_applicable_before_review"
        : "unknown"
    })),
    unknownFactorsPresent: true,
    pairwiseIndependenceEstablished: false,
    countsTowardExpertGate: false
  };
}

export function buildExpectedWesternExpertPublicCandidatePrescreen() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "western_expert_public_candidate_prescreen_v1",
    ledgerId: LEDGER_ID,
    status: "public_candidate_discovery_only_non_authoritative",
    createdAt: CREATED_AT,
    projectReleaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    basisArtifacts: [{ ...BASIS_ARTIFACT }],
    upstreamArtifacts: mapArray(UPSTREAM_ARTIFACTS, (entry) => ({ ...entry })),
    roleSeparation: mapArray(ROLE_SEPARATION, (entry) => ({
      roleId: entry.roleId,
      mayReview: copyArray(entry.mayReview),
      doesNotEstablish: copyArray(entry.doesNotEstablish)
    })),
    sourceGroupPolicy: {
      deduplicationKey: "sourceUpstreamGroupId",
      sameGroupObservationsCountOnce: true,
      sourceObservationCount: 11,
      deduplicatedSourceGroupCount: 6,
      sourceGroupCountDoesNotEstablishIdentityCredentialOrIndependence: true
    },
    sourceGroups: mapArray(SOURCE_GROUPS, (entry) => ({
      sourceUpstreamGroupId: entry.sourceUpstreamGroupId,
      publicOwnerLabel: entry.publicOwnerLabel,
      observationIds: copyArray(entry.observationIds)
    })),
    sourceObservations: mapArray(SOURCE_OBSERVATIONS, sourceObservation),
    reviewQuestionIds: copyArray(WESTERN_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS),
    candidates: mapArray(CANDIDATES, candidate),
    independenceFactorIds: copyArray(WESTERN_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS),
    pairwiseIndependenceAssessments: mapArray(PAIR_IDS, pairwiseAssessment),
    zeroInstanceReceipt: {
      publicCandidateLeadsObserved: 4,
      reviewerSlotsRequired: 2,
      reviewerSlotsOccupied: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopeFitsVerified: 0,
      participationConsentsVerified: 0,
      pairwiseIndependenceAssessmentsCompleted: 0,
      independentExpertReviewsVerified: 0,
      sealedOriginalOpinions: 0,
      sourceBindingsRequired: 28,
      sourceBindingsFrozenVerified: 0,
      expertReviewBundleStatus: "absent/0",
      formalExpertGateCount: 0
    },
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    observationBoundary: { ...OBSERVATION_BOUNDARY },
    doesNotEstablish: copyArray(DOES_NOT_ESTABLISH)
  };
  const ledger = {
    ...unsigned,
    ledgerDigest: computeWesternExpertPublicCandidatePrescreenDigest(unsigned)
  };
  return deepFreeze(ledger);
}

function scanForbiddenPayload(value) {
  if (ARRAY_IS_ARRAY(value)) {
    for (let index = 0; index < value.length; index += 1) scanForbiddenPayload(value[index]);
    return;
  }
  if (!value || typeof value !== "object") return;
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (/^(?:email|phone|telephone|address|contactDetails|privateDossier|credentialDocument|certificateImage)$/iu.test(key)) {
      fail("PRIVATE_CONTACT_OR_DOSSIER_FIELD_FORBIDDEN", "公开候选账不得保存私人联络或 dossier 字段。");
    }
    if (/^(?:pageBody|body|html|rawText|fullText|excerpt|quote|exactQuote|documentContent|pageContent)$/iu.test(key)) {
      fail("PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN", "公开候选账不得保存页面正文、摘录或 exact quote。");
    }
    if (/^(?:reviewPacket|formalManifestBacklink|formalRegistryBacklink|assignedExpertSeat)$/iu.test(key)) {
      fail("FORMAL_BACKLINK_OR_SEAT_FIELD_FORBIDDEN", "公开候选账不得反绑正式包、registry 或专家席位。");
    }
    scanForbiddenPayload(value[key]);
  }
}

function assertZeroAndFalseBoundaries(ledger) {
  const receipt = ledger?.zeroInstanceReceipt;
  if (!receipt || receipt.reviewerSlotsOccupied !== 0
    || receipt.identitiesVerified !== 0
    || receipt.credentialsVerified !== 0
    || receipt.scopeFitsVerified !== 0
    || receipt.participationConsentsVerified !== 0
    || receipt.pairwiseIndependenceAssessmentsCompleted !== 0
    || receipt.independentExpertReviewsVerified !== 0
    || receipt.sealedOriginalOpinions !== 0
    || receipt.sourceBindingsFrozenVerified !== 0
    || receipt.formalExpertGateCount !== 0) {
    fail("ZERO_INSTANCE_PROMOTION_FORBIDDEN", "公开候选预筛必须保持专家、意见、独立性与 binding 零实例。");
  }
  if (!ledger?.authorityBoundary || ledger.authorityBoundary.candidateDiscoveryOnly !== true) {
    fail("AUTHORITY_BOUNDARY_INVALID", "公开候选预筛必须保持 candidateDiscoveryOnly。 ");
  }
  const authorityEntries = OBJECT_ENTRIES(ledger.authorityBoundary);
  for (let index = 0; index < authorityEntries.length; index += 1) {
    const key = authorityEntries[index][0];
    const value = authorityEntries[index][1];
    if (key !== "candidateDiscoveryOnly" && value !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `authorityBoundary.${key} 必须保持 false。`);
    }
  }
  if (!ARRAY_IS_ARRAY(ledger.candidates) || REFLECT_APPLY(ARRAY_SOME, ledger.candidates, [(entry) =>
    entry.reviewerSlot !== null
    || entry.identityVerified !== false
    || entry.credentialVerified !== false
    || entry.scopeVerified !== false
    || entry.independenceVerified !== false
    || entry.participationConsentVerified !== false
    || entry.expertStatusVerified !== false
    || entry.expertOpinionCollected !== false
    || entry.sealedOriginalOpinion !== false
    || entry.countsTowardExpertGate !== false])) {
    fail("CANDIDATE_PROMOTION_FORBIDDEN", "公开候选不得占席、晋级专家或形成意见。");
  }
}

export function verifyWesternExpertPublicCandidatePrescreenLedger(input) {
  const ledger = capturePassiveJson(input);
  scanForbiddenPayload(ledger);
  assertZeroAndFalseBoundaries(ledger);
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "西洋专家公开候选账必须具有小写 SHA-256 摘要。");
  }
  if (computeWesternExpertPublicCandidatePrescreenDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "西洋专家公开候选账摘要不匹配。");
  }
  const expected = buildExpectedWesternExpertPublicCandidatePrescreen();
  if (canonicalStringifyWesternExpertPublicCandidatePrescreen(ledger)
    !== canonicalStringifyWesternExpertPublicCandidatePrescreen(expected)) {
    fail("LEDGER_CONTRACT_MISMATCH", "西洋专家公开候选账与固定候选、来源、范围和零实例合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeWesternExpertPublicCandidatePrescreen(ledger) {
  const verified = verifyWesternExpertPublicCandidatePrescreenLedger(ledger);
  return JSON_STRINGIFY(verified, null, 2) + "\n";
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

async function verifyBasis(workspaceRoot, ledger) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BASIS_ARTIFACT.path);
  assertArtifactIdentity(snapshot, BASIS_ARTIFACT, "公开预筛叙述 basis");
  const text = decodeUtf8(snapshot.bytes, "公开预筛叙述 basis");
  const markers = ["# 阶段 E：西洋占星现实专家公开候选预筛"];
  for (let index = 0; index < CANDIDATES.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, markers, [CANDIDATES[index].candidateLeadId]);
  }
  REFLECT_APPLY(ARRAY_PUSH, markers, [
    "正式专家席位：`0/2`",
    "不多数表决、不平均、不由生成模型选赢家"
  ]);
  if (REFLECT_APPLY(ARRAY_SOME, markers, [
    (marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])
  ])) fail("BASIS_MARKER_MISSING", "公开预筛叙述 basis 缺少固定边界标记。");
  if (canonicalStringifyWesternExpertPublicCandidatePrescreen(ledger.basisArtifacts)
    !== canonicalStringifyWesternExpertPublicCandidatePrescreen([{ ...BASIS_ARTIFACT }])) {
    fail("BASIS_BINDING_DRIFT", "公开预筛账 basis binding 漂移。");
  }
  return snapshot;
}

async function verifyUpstreams(workspaceRoot, ledger) {
  const snapshots = [];
  for (let index = 0; index < UPSTREAM_ARTIFACTS.length; index += 1) {
    const expected = UPSTREAM_ARTIFACTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    let parsed;
    try {
      parsed = parseBaziDttStrictJsonArtifact(snapshot);
    } catch (cause) {
      fail("UPSTREAM_JSON_INVALID", `${expected.role} 不是严格 JSON。`, cause);
    }
    if (parsed[expected.semanticDigestField] !== expected.semanticDigest) {
      fail("UPSTREAM_SEMANTIC_IDENTITY_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    const text = decodeUtf8(snapshot.bytes, expected.role);
    if (REFLECT_APPLY(STRING_INCLUDES, text, [LEDGER_ID])
      || REFLECT_APPLY(STRING_INCLUDES, text, [WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH])) {
      fail("UPSTREAM_BACKLINK_FORBIDDEN", "既有西洋 parent 不得反向绑定本公开候选 child。 ");
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (canonicalStringifyWesternExpertPublicCandidatePrescreen(ledger.upstreamArtifacts)
    !== canonicalStringifyWesternExpertPublicCandidatePrescreen(mapArray(UPSTREAM_ARTIFACTS, (entry) => ({ ...entry })))) {
    fail("UPSTREAM_BINDING_DRIFT", "公开预筛账 upstream binding 漂移。");
  }

  const sourceDefinition = REFLECT_APPLY(ARRAY_FIND, INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS, [
    (entry) => entry.productSystemId === "western-astrology"
  ]);
  const sourceLedger = await readIndependentSourceRequirements(workspaceRoot, sourceDefinition);
  const sourceResult = await verifyIndependentSourceRequirements(workspaceRoot, sourceDefinition, sourceLedger);
  if (sourceResult.bindingRequired !== 28
    || sourceResult.bindingFrozenVerified !== 0
    || sourceResult.ledgerDigest !== UPSTREAM_ARTIFACTS[0].semanticDigest) {
    fail("WESTERN_SOURCE_ZERO_STATE_DRIFT", "西洋来源 requirements 必须保持 0/28。");
  }

  const manifestDefinition = REFLECT_APPLY(ARRAY_FIND, INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS, [
    (entry) => entry.systemId === "western"
  ]);
  const manifestResult = await loadIndependentDomainManifest(workspaceRoot, manifestDefinition);
  if (!isVerifiedIndependentDomainManifestFullLoad(manifestResult)
    || manifestResult.manifestDigest !== UPSTREAM_ARTIFACTS[1].semanticDigest
    || manifestResult.manifest.gateState.bindingRequired !== 28
    || manifestResult.manifest.gateState.bindingFrozenVerified !== 0
    || manifestResult.manifest.gateState.independentExpertsRequired !== 2
    || manifestResult.manifest.gateState.independentExpertReviewsVerified !== 0
    || manifestResult.manifest.gateState.expertReviewBundleComplete !== false
    || manifestResult.authorityBoundary.expertClaimsAuthorized !== false
    || manifestResult.authorityBoundary.publicDeploymentAuthorized !== false) {
    fail("WESTERN_MANIFEST_ZERO_STATE_DRIFT", "西洋独立 manifest 必须保持 0/28、0/2 与授权 false。");
  }

  const observation = await loadWesternProductizationVersionAwareObservationCandidate(workspaceRoot);
  if (!isVerifiedWesternProductizationVersionAwareObservationResult(observation)
    || observation.candidateDigest !== UPSTREAM_ARTIFACTS[2].semanticDigest
    || observation.bindingRequired !== 28
    || observation.bindingFrozenVerified !== 0
    || observation.independentExpertsRequired !== 2
    || observation.independentExpertReviewsVerified !== 0
    || observation.activeAdmissionEffect !== "none"
    || observation.formalAdmissionAuthorized !== false
    || observation.expertClaimsAuthorized !== false
    || observation.releaseReady !== false
    || observation.publicDeploymentAuthorized !== false
    || observation.publicReleaseAuthorized !== false) {
    fail("WESTERN_OBSERVATION_ZERO_STATE_DRIFT", "西洋版本观察必须保持零准入效果与授权 false。");
  }

  const registry = await loadFourSystemCurrentObservationRegistryV2(workspaceRoot);
  const western = REFLECT_APPLY(ARRAY_FIND, registry.registry.systems, [
    (entry) => entry.productSystemId === "western-astrology"
  ]);
  if (!isVerifiedFourSystemCurrentObservationRegistryV2(registry)
    || !western
    || western.gateSummary.bindingRequired !== 28
    || western.gateSummary.bindingFrozenVerified !== 0
    || western.gateSummary.independentExpertsRequired !== 2
    || western.gateSummary.independentExpertReviewsVerified !== 0
    || western.gateSummary.admissionGatesSatisfied !== 0
    || western.authorityBoundary.formalAdmissionAuthorized !== false
    || western.authorityBoundary.expertClaimsAuthorized !== false
    || western.authorityBoundary.publicDeploymentAuthorized !== false
    || registry.registry.crossSystemPolicy.generatedModelWinnerSelectionAllowed !== false
    || registry.registry.crossSystemPolicy.majorityVoteAllowed !== false
    || registry.registry.crossSystemPolicy.opinionAveragingAllowed !== false) {
    fail("FOUR_SYSTEM_REGISTRY_ZERO_STATE_DRIFT", "四体系当前观察账必须保持西洋全红与禁止自动选赢家。");
  }
  const registrySnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    "content/system-admission/four-system-current-observation-registry.v2.json"
  );
  const registryText = decodeUtf8(registrySnapshot.bytes, "四体系当前观察 registry v2");
  if (REFLECT_APPLY(STRING_INCLUDES, registryText, [LEDGER_ID])
    || REFLECT_APPLY(STRING_INCLUDES, registryText, [WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH])) {
    fail("REGISTRY_BACKLINK_FORBIDDEN", "四体系当前观察 registry v2 不得消费公开候选 child。");
  }
  return { snapshots, registrySnapshot };
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function loadWesternExpertPublicCandidatePrescreen(workspaceRoot = process.cwd()) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "西洋专家公开候选账 raw identity 尚未冻结。");
  }
  const ledgerSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH
  );
  if (ledgerSnapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || ledgerSnapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("LEDGER_RAW_IDENTITY_DRIFT", "西洋专家公开候选账 raw identity 漂移。");
  }
  let parsed;
  try {
    parsed = parseWesternExpertPublicCandidatePrescreenJsonBytes(
      ledgerSnapshot.bytes,
      ledgerSnapshot.path
    );
  } catch (cause) {
    if (cause instanceof WesternExpertPublicCandidatePrescreenError) throw cause;
    fail("LEDGER_JSON_INVALID", "西洋专家公开候选账不是严格 JSON。", cause);
  }
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(parsed);
  if (decodeUtf8(ledgerSnapshot.bytes, "西洋专家公开候选账")
    !== serializeWesternExpertPublicCandidatePrescreen(ledger)) {
    fail("LEDGER_CANONICAL_BYTES_DRIFT", "西洋专家公开候选账必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const basisSnapshot = await verifyBasis(workspaceRoot, ledger);
  const upstream = await verifyUpstreams(workspaceRoot, ledger);
  const result = deepFreeze({
    ok: true,
    status: ledger.status,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    publicCandidateLeadsObserved: ledger.candidates.length,
    sourceObservations: ledger.sourceObservations.length,
    deduplicatedSourceGroups: ledger.sourceGroups.length,
    reviewQuestions: ledger.reviewQuestionIds.length,
    pairwiseAssessments: ledger.pairwiseIndependenceAssessments.length,
    reviewerSlotsRequired: ledger.zeroInstanceReceipt.reviewerSlotsRequired,
    reviewerSlotsOccupied: ledger.zeroInstanceReceipt.reviewerSlotsOccupied,
    independentExpertReviewsVerified: ledger.zeroInstanceReceipt.independentExpertReviewsVerified,
    sourceBindingsRequired: ledger.zeroInstanceReceipt.sourceBindingsRequired,
    sourceBindingsFrozenVerified: ledger.zeroInstanceReceipt.sourceBindingsFrozenVerified,
    expertClaimsAuthorized: ledger.authorityBoundary.expertClaimsAuthorized,
    releaseReady: ledger.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: ledger.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: ledger.authorityBoundary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(ledgerSnapshot),
    basisArtifact: publicIdentity(basisSnapshot),
    upstreamArtifacts: mapArray(upstream.snapshots, publicIdentity),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternExpertPublicCandidatePrescreen(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernExpertPublicCandidatePrescreenTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACT,
  EXPECTED_PERSISTED_RAW,
  UPSTREAM_ARTIFACTS,
  SOURCE_GROUPS,
  SOURCE_OBSERVATIONS,
  CANDIDATES,
  PAIR_IDS,
  ROLE_SEPARATION,
  AUTHORITY_BOUNDARY,
  OBSERVATION_BOUNDARY,
  DOES_NOT_ESTABLISH,
  DIGEST_DOMAIN
});
