import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedZiweiIndependentEngineeringManifestV3,
  loadZiweiIndependentEngineeringManifestV3
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";
import {
  isVerifiedZiweiSourceBindingRequirementsSuccessorV12,
  loadZiweiSourceBindingRequirementsSuccessorV12
} from "./ziwei-source-binding-requirements-successor-v1-2-lib.mjs";

export const ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH =
  "content/system-admission/ziwei-expert-public-candidate-prescreen.v1.json";

const DIGEST_DOMAIN = "hakimi-ziwei-expert-public-candidate-prescreen-v1\0";
const LEDGER_ID = "hakimi.ziwei.expert-public-candidate-prescreen/1.0.0";
const CREATED_ON_LABEL = "2026-09-01";
const OBSERVED_ON_LABEL = "2026-09-01";
const CANDIDATE_STATE = "uncontacted_public_candidate_lead";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SOME = Array.prototype.some;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
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
  path: "docs/阶段E-紫微现实专家公开候选预筛-2026-09-01.md",
  role: "non_authoritative_public_prescreen_narrative_basis",
  rawBytes: 7_524,
  rawSha256: "f5f1b56c486072f8c1ea7453a1328db78eeb936d69a8bee5c26a0e7b3b965da5"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 29_196,
  rawSha256: "3dcf8c849aae41e5afec8b08653432504160a53006a3e82458a5bc5dc4947f89"
});

const UPSTREAM_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_nonformal_ziwei_source_requirements_successor_private_brand",
    path: "content/system-admission/ziwei-source-binding-requirements.v1.2.0.json",
    rawBytes: 37_570,
    rawSha256: "63c0b8776978432dbcaaaaf5b2638acbc5d28d755dc1387c59c7e3421865c9a1",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "0ea8fa98ac54926a019cb1aa428cdc8150e5a824400cc144b85bc1a645092624"
  }),
  OBJECT_FREEZE({
    role: "current_ziwei_independent_engineering_manifest_v3_private_brand",
    path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json",
    rawBytes: 68_696,
    rawSha256: "6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396",
    semanticDigestField: "manifestDigest",
    semanticDigest: "7018bf1df4bec8f6c753a11f72bcb2f3f2d63f3d46b194ef27fc2991dd06cb60"
  })
]);

const NO_BACKLINK_ARTIFACT_PATHS = OBJECT_FREEZE([
  "content/system-admission/ziwei-source-binding-requirements.v1.json",
  "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json",
  "content/system-admission/four-system-current-observation-registry.v2.json",
  "content/system-admission/four-system-admission.v1.json"
]);

export const ZIWEI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS = OBJECT_FREEZE([
  "civil-time-calendar-policy",
  "sex-parameter-major-period-direction",
  "leap-month-lunar-policy",
  "natal-palace-star-four-transformations-school-profile",
  "major-period-rule-counterexamples",
  "high-risk-expression-uncertainty-abstention"
]);

export const ZIWEI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS = OBJECT_FREEZE([
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
    sourceUpstreamGroupId: "NUK",
    publicOwnerLabel: "National University of Kaohsiung Extension Education Center",
    observationIds: OBJECT_FREEZE(["ZIWEI-NUK-2026-COURSE"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "NTUB",
    publicOwnerLabel: "National Taipei University of Business Continuing Education",
    observationIds: OBJECT_FREEZE(["ZIWEI-NTUB-2026-COURSE"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "PCCU",
    publicOwnerLabel: "Chinese Culture University School of Continuing Education",
    observationIds: OBJECT_FREEZE(["ZIWEI-PCCU-2026-COURSE"])
  }),
  OBJECT_FREEZE({
    sourceUpstreamGroupId: "YUNTECH_GHC_JOURNAL",
    publicOwnerLabel: "National Yunlin University of Science and Technology GHC Journal",
    observationIds: OBJECT_FREEZE(["ZIWEI-YUNTECH-2021-JOURNAL-PDF"])
  })
]);

const SOURCE_OBSERVATIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    sourceObservationId: "ZIWEI-NUK-2026-COURSE",
    candidateLeadId: "ziwei-public-lead-001",
    sourceUrl: "https://eec.nuk.edu.tw/course_detail.php?sn=1310",
    finalUrl: "https://eec.nuk.edu.tw/course_detail.php?sn=1310",
    sourceUpstreamGroupId: "NUK",
    sourceType: "public_official_course_page",
    httpStatus: 200,
    redirectObserved: false,
    contentType: "text/html; charset=utf-8",
    observedResponseBytes: 54_043,
    observedResponseSha256: "3adaf422315f6c1c13e2147162295134836b546f180ddd83a9357c9cb6d1fdec",
    observationSummary: "公开课程页只提供课程教师以及三合派、飞星派、主星和格局教学主题的候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "ZIWEI-NTUB-2026-COURSE",
    candidateLeadId: "ziwei-public-lead-002",
    sourceUrl: "https://cec.ntub.edu.tw/p/405-1030-118315,c818.php?Lang=zh-tw",
    finalUrl: "https://cec.ntub.edu.tw/p/405-1030-118315,c818.php?Lang=zh-tw",
    sourceUpstreamGroupId: "NTUB",
    sourceType: "public_official_course_page",
    httpStatus: 200,
    redirectObserved: false,
    contentType: "text/html; charset=UTF-8",
    observedResponseBytes: 61_875,
    observedResponseSha256: "a5f78e4ef5a1872dca0c02da384328e268825f089574e7275e440cf113728546",
    observationSummary: "公开课程页只提供资深讲师标签、紫微斗数专业领域以及星曜、四化、庙旺平陷教学主题的候选线索。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "ZIWEI-PCCU-2026-COURSE",
    candidateLeadId: "ziwei-public-lead-003",
    sourceUrl: "https://www.sce.pccu.edu.tw/courses/3O14B5080?c=2500",
    finalUrl: "https://www.sce.pccu.edu.tw/courses/3O14B5080?c=2500",
    sourceUpstreamGroupId: "PCCU",
    sourceType: "public_official_course_marketing_page",
    httpStatus: 200,
    redirectObserved: false,
    contentType: "text/html; charset=utf-8",
    observedResponseBytes: 60_444,
    observedResponseSha256: "537d7cce893c05ef9195174dae62eaf938efff6afa3cc59771963a98cbf7c090",
    observationSummary: "公开页面只提供别名关联、课程与著作营销说明以及古今斗数、闰月教学主题的候选线索；营销自述不是 credential 或 authenticity。"
  }),
  OBJECT_FREEZE({
    sourceObservationId: "ZIWEI-YUNTECH-2021-JOURNAL-PDF",
    candidateLeadId: "ziwei-public-lead-004",
    sourceUrl: "https://ghc.yuntech.edu.tw/images/Journal/Journal22.pdf",
    finalUrl: "https://ghc.yuntech.edu.tw/images/Journal/Journal22.pdf",
    sourceUpstreamGroupId: "YUNTECH_GHC_JOURNAL",
    sourceType: "public_official_journal_pdf",
    httpStatus: 200,
    redirectObserved: false,
    contentType: "application/pdf",
    observedResponseBytes: 4_355_708,
    observedResponseSha256: "869899282cd4eb2b5dd5dbafe9413759c1f4e9e89b352932c33e4097d3835064",
    observationSummary: "公开 journal PDF 只提供论文作者、当时硕士生脚注和题名《紫微斗數之起源與發展》的候选线索，不证明当前角色或实务规则能力。"
  })
]);

const CANDIDATES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    candidateLeadId: "ziwei-public-lead-001",
    publicDisplayName: "宋杭融",
    proposedReviewDirection: "ziwei_school_profile_and_natal_rule_candidate",
    sourceObservationIds: OBJECT_FREEZE(["ZIWEI-NUK-2026-COURSE"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["NUK"]),
    scopeStates: OBJECT_FREEZE([
      "unknown",
      "unknown",
      "unknown",
      "public_scope_lead_observed",
      "potentially_related_scope_confirmation_required",
      "unknown"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "ziwei-public-lead-002",
    publicDisplayName: "林于棻",
    proposedReviewDirection: "ziwei_star_four_transformations_and_dignity_candidate",
    sourceObservationIds: OBJECT_FREEZE(["ZIWEI-NTUB-2026-COURSE"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["NTUB"]),
    scopeStates: OBJECT_FREEZE([
      "unknown",
      "unknown",
      "unknown",
      "public_scope_lead_observed",
      "potentially_related_scope_confirmation_required",
      "unknown"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "ziwei-public-lead-003",
    publicDisplayName: "了無居士（黃忠霖）",
    proposedReviewDirection: "ziwei_leap_month_and_historical_school_candidate_marketing_claims_unverified",
    sourceObservationIds: OBJECT_FREEZE(["ZIWEI-PCCU-2026-COURSE"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["PCCU"]),
    scopeStates: OBJECT_FREEZE([
      "unknown",
      "unknown",
      "public_scope_lead_observed",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "unknown"
    ])
  }),
  OBJECT_FREEZE({
    candidateLeadId: "ziwei-public-lead-004",
    publicDisplayName: "趙翊吾",
    proposedReviewDirection: "ziwei_history_and_source_context_candidate_not_practice_rule_credential",
    sourceObservationIds: OBJECT_FREEZE(["ZIWEI-YUNTECH-2021-JOURNAL-PDF"]),
    sourceUpstreamGroupIds: OBJECT_FREEZE(["YUNTECH_GHC_JOURNAL"]),
    scopeStates: OBJECT_FREEZE([
      "unknown",
      "unknown",
      "unknown",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "unknown"
    ])
  })
]);

const PAIR_IDS = OBJECT_FREEZE([
  "ziwei-public-lead-001--ziwei-public-lead-002",
  "ziwei-public-lead-001--ziwei-public-lead-003",
  "ziwei-public-lead-001--ziwei-public-lead-004",
  "ziwei-public-lead-002--ziwei-public-lead-003",
  "ziwei-public-lead-002--ziwei-public-lead-004",
  "ziwei-public-lead-003--ziwei-public-lead-004"
]);

const ROLE_SEPARATION = OBJECT_FREEZE([
  OBJECT_FREEZE({
    roleId: "ziwei_domain_expert",
    mayReview: OBJECT_FREEZE(["ziwei_rule_versions", "school_profile", "interpretation_and_high_risk_expression_boundary"]),
    doesNotEstablish: OBJECT_FREEZE(["engineering_implementation_correctness", "source_rights_or_legal_conclusion", "release_authorization"])
  }),
  OBJECT_FREEZE({
    roleId: "calendar_engineering_reproducibility_reviewer",
    mayReview: OBJECT_FREEZE(["civil_time_and_calendar_inputs", "calendar_conversion_reproducibility", "boundary_cases_and_tolerances"]),
    doesNotEstablish: OBJECT_FREEZE(["ziwei_domain_truth", "interpretation_authority", "source_rights_or_legal_conclusion"])
  }),
  OBJECT_FREEZE({
    roleId: "source_rights_reviewer",
    mayReview: OBJECT_FREEZE(["work_version_carrier_identity", "license_evidence", "redistribution_facts"]),
    doesNotEstablish: OBJECT_FREEZE(["ziwei_domain_truth", "legal_judgment", "release_authorization"])
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
  sourceRightsEstablished: false,
  rightsLegalConclusionEstablished: false,
  redistributionAuthorized: false,
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
  publicObservationMethod: "operator_recorded_public_read_only_no_credentials",
  exactUserAgentStringStored: false,
  publicResponseBodiesStored: false,
  publicResponseBodiesRefetchedByFixedVerifier: false,
  fixedVerifierNetworkAttempted: false,
  observedStatusFinalUrlRedirectContentTypeBytesAndSha256Recorded: true,
  sourceMeaningBoundByObservedResponseHash: false,
  serverDateHeaderCaptured: false,
  exactLocalClockInstantCaptured: false,
  redirectHopHeadersCaptured: false,
  tlsPeerCertificateCaptured: false,
  networkProvenanceEstablished: false,
  publisherAuthenticityEstablished: false,
  publisherSignatureVerified: false,
  firstSeenEstablished: false,
  futureFreshnessEstablished: false,
  privateContactDataStored: false,
  paidOrBackendMaterialsAccessed: false,
  unknownFieldsRejected: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false
});

const LINEAGE_BOUNDARY = OBJECT_FREEZE({
  appendOnlyChild: true,
  activeAdmissionEffect: "none",
  predecessorArtifactsModified: 0,
  predecessorBacklinksAdded: 0,
  formalManifestIntegrated: false,
  formalRegistryIntegrated: false,
  centralAdmissionIntegrated: false,
  formalZiweiSourceRequirementsV1RemainsCurrent: true,
  sourceRequirementsV12RemainsNonformal: true
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "real_person_identity_or_current_role",
  "current_credentials_or_practice_rule_capability",
  "six_question_scope_fit",
  "participation_consent",
  "pairwise_independence",
  "expert_status_opinion_or_seal",
  "content_truth_or_expert_truth",
  "source_body_exact_quote_or_binding",
  "work_version_carrier_rights_legal_or_redistribution_conclusion",
  "publisher_authenticity_signature_tls_identity_first_seen_or_future_freshness",
  "response_hash_to_semantic_interpretation_binding",
  "formal_review_gate_admission_registry_or_manifest_integration",
  "cross_system_equivalence_scoring_weighting_or_winner",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class ZiweiExpertPublicCandidatePrescreenError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiExpertPublicCandidatePrescreenError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new ZiweiExpertPublicCandidatePrescreenError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "紫微专家公开候选账超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "紫微专家公开候选账超过节点上限。");
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

export function canonicalStringifyZiweiExpertPublicCandidatePrescreen(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeZiweiExpertPublicCandidatePrescreenDigest(ledger) {
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
  return sha256Text(DIGEST_DOMAIN + canonicalStringifyZiweiExpertPublicCandidatePrescreen(unsigned));
}

export function parseZiweiExpertPublicCandidatePrescreenJsonBytes(
  bytes,
  label = ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "LEDGER_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function copyArray(input) {
  const output = [];
  for (let index = 0; index < input.length; index += 1) REFLECT_APPLY(ARRAY_PUSH, output, [input[index]]);
  return output;
}

function mapArray(input, callback) {
  return REFLECT_APPLY(ARRAY_MAP, input, [callback]);
}

function sourceObservation(entry) {
  return {
    ...entry,
    observedOnLabel: OBSERVED_ON_LABEL,
    observationMethod: "operator_recorded_public_read_only_no_credentials",
    responseBodyRetained: false,
    supportsCandidateDiscoveryOnly: true,
    sourceMeaningBoundByObservedResponseHash: false,
    authoritative: false
  };
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
    scopeMatrix: mapArray(ZIWEI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS, (questionId, index) => ({
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
    factorStates: mapArray(ZIWEI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS, (factorId) => ({
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

export function buildExpectedZiweiExpertPublicCandidatePrescreen() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "ziwei_expert_public_candidate_prescreen_v1",
    ledgerId: LEDGER_ID,
    status: "public_candidate_discovery_only_non_authoritative_nonformal_zero_active_effect",
    createdOnLabel: CREATED_ON_LABEL,
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
    lineageBoundary: { ...LINEAGE_BOUNDARY },
    noBacklinkScan: {
      upstreamArtifactsChecked: 2,
      formalOrCurrentConsumerArtifactsChecked: 4,
      backlinksFound: 0,
      formalOrCurrentRegistryManifestIntegrationAdded: false,
      paths: copyArray(NO_BACKLINK_ARTIFACT_PATHS)
    },
    roleSeparation: mapArray(ROLE_SEPARATION, (entry) => ({
      roleId: entry.roleId,
      mayReview: copyArray(entry.mayReview),
      doesNotEstablish: copyArray(entry.doesNotEstablish)
    })),
    sourceGroupPolicy: {
      deduplicationKey: "sourceUpstreamGroupId",
      sameGroupObservationsCountOnce: true,
      sourceObservationCount: 4,
      deduplicatedSourceGroupCount: 4,
      distinctPublicUpstreamGroupsDoNotEstablishCandidatePairwiseIndependence: true,
      sourceGroupCountDoesNotEstablishIdentityCredentialOrScope: true
    },
    sourceGroups: mapArray(SOURCE_GROUPS, (entry) => ({
      sourceUpstreamGroupId: entry.sourceUpstreamGroupId,
      publicOwnerLabel: entry.publicOwnerLabel,
      observationIds: copyArray(entry.observationIds)
    })),
    sourceObservations: mapArray(SOURCE_OBSERVATIONS, sourceObservation),
    reviewQuestionIds: copyArray(ZIWEI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS),
    candidates: mapArray(CANDIDATES, candidate),
    independenceFactorIds: copyArray(ZIWEI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS),
    pairwiseIndependenceAssessments: mapArray(PAIR_IDS, pairwiseAssessment),
    disagreementPolicy: {
      opinionsStoredSideBySideWhenAvailable: true,
      majorityVoteAllowed: false,
      opinionAveragingAllowed: false,
      generatedModelWinnerSelectionAllowed: false
    },
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
      sourceBindingsRequired: 27,
      sourceBindingsFrozenVerified: 0,
      sourceRequirementPartialCandidates: 2,
      expertReviewBundleStatus: "absent/0",
      formalExpertGateCount: 0
    },
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    observationBoundary: { ...OBSERVATION_BOUNDARY },
    doesNotEstablish: copyArray(DOES_NOT_ESTABLISH)
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeZiweiExpertPublicCandidatePrescreenDigest(unsigned)
  });
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
    if (/^(?:pageBody|body|html|rawText|fullText|excerpt|quote|exactQuote|documentContent|pageContent|pdfBytes|htmlBytes)$/iu.test(key)) {
      fail("PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN", "公开候选账不得保存页面正文、PDF、摘录或 exact quote。");
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
    fail("AUTHORITY_BOUNDARY_INVALID", "公开候选预筛必须保持 candidateDiscoveryOnly。");
  }
  const authorityKeys = OBJECT_KEYS(ledger.authorityBoundary);
  for (let index = 0; index < authorityKeys.length; index += 1) {
    const key = authorityKeys[index];
    if (key !== "candidateDiscoveryOnly" && ledger.authorityBoundary[key] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `authorityBoundary.${key} 必须保持 false。`);
    }
  }
  if (!ARRAY_IS_ARRAY(ledger.candidates) || REFLECT_APPLY(ARRAY_SOME, ledger.candidates, [(entry) =>
    entry.candidateState !== CANDIDATE_STATE
    || entry.reviewerSlot !== null
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
  if (ledger?.observationBoundary?.sourceMeaningBoundByObservedResponseHash !== false
    || REFLECT_APPLY(ARRAY_SOME, ledger.sourceObservations ?? [], [(entry) =>
      entry.sourceMeaningBoundByObservedResponseHash !== false])) {
    fail("HASH_SEMANTIC_PROMOTION_FORBIDDEN", "公开响应 hash 不得绑定语义解释。");
  }
}

export function verifyZiweiExpertPublicCandidatePrescreenLedger(input) {
  const ledger = capturePassiveJson(input);
  scanForbiddenPayload(ledger);
  assertZeroAndFalseBoundaries(ledger);
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "紫微专家公开候选账必须具有小写 SHA-256 摘要。");
  }
  if (computeZiweiExpertPublicCandidatePrescreenDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "紫微专家公开候选账摘要不匹配。");
  }
  const expected = buildExpectedZiweiExpertPublicCandidatePrescreen();
  if (canonicalStringifyZiweiExpertPublicCandidatePrescreen(ledger)
    !== canonicalStringifyZiweiExpertPublicCandidatePrescreen(expected)) {
    fail("LEDGER_CONTRACT_MISMATCH", "紫微专家公开候选账与固定来源、候选、范围和零实例合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeZiweiExpertPublicCandidatePrescreen(ledger) {
  return JSON_STRINGIFY(verifyZiweiExpertPublicCandidatePrescreenLedger(ledger), null, 2) + "\n";
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
  const markers = [
    "# 阶段 E：紫微现实专家公开候选预筛",
    "正式专家席位：`0/2`",
    "不多数表决、不平均、不由生成模型选赢家",
    "SHA-256 只是当时观察到的响应载体字节摘要，不绑定上述语义概括"
  ];
  for (let index = 0; index < CANDIDATES.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, markers, [CANDIDATES[index].candidateLeadId]);
  }
  if (REFLECT_APPLY(ARRAY_SOME, markers, [(marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])])) {
    fail("BASIS_MARKER_MISSING", "公开预筛叙述 basis 缺少固定边界标记。");
  }
  if (canonicalStringifyZiweiExpertPublicCandidatePrescreen(ledger.basisArtifacts)
    !== canonicalStringifyZiweiExpertPublicCandidatePrescreen([{ ...BASIS_ARTIFACT }])) {
    fail("BASIS_BINDING_DRIFT", "公开预筛账 basis binding 漂移。");
  }
  return snapshot;
}

function assertNoBacklink(text, label) {
  if (REFLECT_APPLY(STRING_INCLUDES, text, [LEDGER_ID])
    || REFLECT_APPLY(STRING_INCLUDES, text, [ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH])) {
    fail("UPSTREAM_BACKLINK_FORBIDDEN", `${label} 不得消费本公开候选 child。`);
  }
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
    assertNoBacklink(decodeUtf8(snapshot.bytes, expected.role), expected.role);
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (canonicalStringifyZiweiExpertPublicCandidatePrescreen(ledger.upstreamArtifacts)
    !== canonicalStringifyZiweiExpertPublicCandidatePrescreen(mapArray(UPSTREAM_ARTIFACTS, (entry) => ({ ...entry })))) {
    fail("UPSTREAM_BINDING_DRIFT", "公开预筛账 upstream binding 漂移。");
  }

  const source = await loadZiweiSourceBindingRequirementsSuccessorV12();
  if (!isVerifiedZiweiSourceBindingRequirementsSuccessorV12(source)
    || source.ledgerDigest !== UPSTREAM_ARTIFACTS[0].semanticDigest
    || source.artifact?.path !== UPSTREAM_ARTIFACTS[0].path
    || source.artifact?.rawBytes !== UPSTREAM_ARTIFACTS[0].rawBytes
    || source.artifact?.rawSha256 !== UPSTREAM_ARTIFACTS[0].rawSha256
    || source.formalV1RemainsCurrent !== true
    || source.predecessorV11RemainsNonformal !== true
    || source.successorIsFormalCurrent !== false
    || source.successorActiveEffect !== "none"
    || source.bindingRequired !== 27
    || source.bindingFrozenVerified !== 0
    || source.partialCandidatesAttached !== 2
    || source.rightsLegalConclusionEstablished !== false
    || source.redistributionAuthorized !== false
    || source.releaseReady !== false
    || source.publicReleaseAuthorized !== false) {
    fail("ZIWEI_SOURCE_REQUIREMENTS_ZERO_STATE_DRIFT", "Ziwei source requirements v1.2 私有品牌必须保持 nonformal、2 partial 与 0/27。");
  }

  const manifest = await loadZiweiIndependentEngineeringManifestV3(workspaceRoot);
  if (!isVerifiedZiweiIndependentEngineeringManifestV3(manifest)
    || manifest.manifestDigest !== UPSTREAM_ARTIFACTS[1].semanticDigest
    || manifest.artifact?.path !== UPSTREAM_ARTIFACTS[1].path
    || manifest.artifact?.bytes !== UPSTREAM_ARTIFACTS[1].rawBytes
    || manifest.artifact?.sha256 !== UPSTREAM_ARTIFACTS[1].rawSha256
    || manifest.manifest.activeAdmissionEffect !== "none"
    || manifest.manifest.gateState?.bindingRequired !== 27
    || manifest.manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.manifest.gateState?.independentExpertsRequired !== 2
    || manifest.manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.manifest.gateState?.expertReviewBundleComplete !== false
    || manifest.manifest.authorityBoundary?.contentTruthEstablished !== false
    || manifest.manifest.authorityBoundary?.expertTruthEstablished !== false
    || manifest.manifest.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest.manifest.authorityBoundary?.expertClaimsAuthorized !== false
    || manifest.manifest.authorityBoundary?.releaseReady !== false
    || manifest.manifest.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest.manifest.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest.manifest.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest.manifest.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || manifest.manifest.observationBoundary?.abaExcluded !== false
    || manifest.manifest.observationBoundary?.mutationEpochReceipt !== null) {
    fail("ZIWEI_MANIFEST_ZERO_STATE_DRIFT", "Ziwei v3 manifest 私有品牌必须保持 0/27、0/2 与所有权限红。");
  }

  const noBacklinkSnapshots = [];
  for (let index = 0; index < NO_BACKLINK_ARTIFACT_PATHS.length; index += 1) {
    const relativePath = NO_BACKLINK_ARTIFACT_PATHS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    assertNoBacklink(decodeUtf8(snapshot.bytes, relativePath), relativePath);
    REFLECT_APPLY(ARRAY_PUSH, noBacklinkSnapshots, [snapshot]);
  }
  if (ledger.noBacklinkScan?.backlinksFound !== 0
    || ledger.noBacklinkScan?.formalOrCurrentRegistryManifestIntegrationAdded !== false
    || canonicalStringifyZiweiExpertPublicCandidatePrescreen(ledger.noBacklinkScan?.paths)
      !== canonicalStringifyZiweiExpertPublicCandidatePrescreen(copyArray(NO_BACKLINK_ARTIFACT_PATHS))) {
    fail("NO_BACKLINK_CONTRACT_DRIFT", "formal/current registry/manifest 不接入边界漂移。");
  }
  return { snapshots, noBacklinkSnapshots };
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function loadZiweiExpertPublicCandidatePrescreen(workspaceRoot = process.cwd()) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "紫微专家公开候选账 raw identity 尚未冻结。");
  }
  const ledgerSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH
  );
  if (ledgerSnapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || ledgerSnapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("LEDGER_RAW_IDENTITY_DRIFT", "紫微专家公开候选账 raw identity 漂移。");
  }
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(
    parseZiweiExpertPublicCandidatePrescreenJsonBytes(ledgerSnapshot.bytes, ledgerSnapshot.path)
  );
  if (decodeUtf8(ledgerSnapshot.bytes, "紫微专家公开候选账")
    !== serializeZiweiExpertPublicCandidatePrescreen(ledger)) {
    fail("LEDGER_CANONICAL_BYTES_DRIFT", "紫微专家公开候选账必须保持唯一 pretty JSON 与 LF 终止。");
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
    sourceRequirementPartialCandidates: ledger.zeroInstanceReceipt.sourceRequirementPartialCandidates,
    fixedVerifierNetworkAttempted: ledger.observationBoundary.fixedVerifierNetworkAttempted,
    expertClaimsAuthorized: ledger.authorityBoundary.expertClaimsAuthorized,
    releaseReady: ledger.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: ledger.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: ledger.authorityBoundary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(ledgerSnapshot),
    basisArtifact: publicIdentity(basisSnapshot),
    upstreamArtifacts: mapArray(upstream.snapshots, publicIdentity),
    noBacklinkArtifacts: mapArray(upstream.noBacklinkSnapshots, publicIdentity),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedZiweiExpertPublicCandidatePrescreen(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const ziweiExpertPublicCandidatePrescreenTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACT,
  CANDIDATES,
  DIGEST_DOMAIN,
  DOES_NOT_ESTABLISH,
  EXPECTED_PERSISTED_RAW,
  LEDGER_ID,
  LINEAGE_BOUNDARY,
  NO_BACKLINK_ARTIFACT_PATHS,
  OBSERVATION_BOUNDARY,
  PAIR_IDS,
  ROLE_SEPARATION,
  SOURCE_GROUPS,
  SOURCE_OBSERVATIONS,
  UPSTREAM_ARTIFACTS
});
