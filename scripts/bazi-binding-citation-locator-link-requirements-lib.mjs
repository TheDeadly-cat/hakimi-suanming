import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
  computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest,
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  computeBaziProjectCopyMaterializationVersionAwareCandidateDigest
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";

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

export const BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/bazi-binding-citation-locator-link-requirements.v1.0.0.json";

const LEDGER_ID = "hakimi.bazi.binding-citation-locator-link-requirements/1.0.0";
const LEDGER_DIGEST_DOMAIN =
  "hakimi.bazi.binding-citation-locator-link-requirements.v1";
const CREATED_AT = "2026-09-01T00:00:00.000Z";

const PARENT_READINESS = OBJECT_FREEZE({
  path: BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
  rawBytes: 45551,
  rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
  ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1",
  bindingRowsCanonicalSha256:
    "2cd5d5c44b777cc71fa9c022e77b89598341a6aeab8f24c46eb8ccbb5d2b1794"
});

const BASIS_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_strength_claim_registry_exact_source_and_locator_projection",
    path: "packages/bazi-interpretation/src/strength-claim-registry.ts",
    rawBytes: 44959,
    rawSha256: "b08d4e6b0fb5c830b251e0c03ac49b7620729f223805b145b839a89245aa3888"
  }),
  OBJECT_FREEZE({
    role: "source_rights_and_source_carrier_schema_basis",
    path: "packages/contracts/src/index.ts",
    rawBytes: 244747,
    rawSha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"
  }),
  OBJECT_FREEZE({
    role: "current_three_layer_material_gate_and_manifest_contract",
    path: "packages/knowledge-core/src/index.ts",
    rawBytes: 41040,
    rawSha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
  }),
  OBJECT_FREEZE({
    role: "isolated_stage_c_material_tuple_candidate_not_active_admission",
    path: "packages/bazi-stage-c-material-admission-candidate/src/index.ts",
    rawBytes: 28529,
    rawSha256: "2c2d3635530d8ec57ba7e6af838c868c7d0cc7cf9ed4c8fbd12436b76648c229"
  }),
  OBJECT_FREEZE({
    role: "historical_zero_instance_project_copy_materialization_requirements",
    path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
    rawBytes: 10887,
    rawSha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
    ledgerId: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
    ledgerDigest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
  })
]);

const REGISTRY_BINDING_INVENTORY = [
  {
    order: 1,
    bindingId: "binding:core:derive-assessment",
    evidenceSubjectId: "bazi.strength.binding.core.derive-assessment.v1",
    source: {
      sourceId: "hakimi-strength-core-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-assessment-core.ts",
      stableRevision: "hakimi-bazi-strength-ten-god-candidate/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "deriveBaziStrengthAssessment + collectBaziStrengthFactors",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 2,
    bindingId: "binding:policy:factor-inclusion",
    evidenceSubjectId: "bazi.strength.binding.policy.factor-inclusion.v1",
    source: {
      sourceId: "hakimi-strength-policy-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-policy.ts",
      stableRevision: "hakimi.bazi.strength_policy/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_POLICY.factorInclusion",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 3,
    bindingId: "binding:policy:direction-map",
    evidenceSubjectId: "bazi.strength.binding.policy.direction-map.v1",
    source: {
      sourceId: "hakimi-strength-policy-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-policy.ts",
      stableRevision: "hakimi.bazi.strength_policy/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_TEN_GOD_GROUPS + strengthFactorDirectionForTenGod",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 4,
    bindingId: "binding:policy:weights",
    evidenceSubjectId: "bazi.strength.binding.policy.weights.v1",
    source: {
      sourceId: "hakimi-strength-policy-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-policy.ts",
      stableRevision: "hakimi.bazi.strength_policy/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_FACTOR_WEIGHTS",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 5,
    bindingId: "binding:policy:month-duplication",
    evidenceSubjectId: "bazi.strength.binding.policy.month-duplication.v1",
    source: {
      sourceId: "hakimi-strength-policy-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-policy.ts",
      stableRevision: "hakimi.bazi.strength_policy/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_POLICY.monthMainDuplication",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 6,
    bindingId: "binding:policy:thresholds",
    evidenceSubjectId: "bazi.strength.binding.policy.thresholds.v1",
    source: {
      sourceId: "hakimi-strength-policy-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-policy.ts",
      stableRevision: "hakimi.bazi.strength_policy/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_BAND_THRESHOLDS + classifyStrengthBand",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 7,
    bindingId: "binding:sensitivity:six-scenarios",
    evidenceSubjectId: "bazi.strength.binding.sensitivity.six-scenarios.v1",
    source: {
      sourceId: "hakimi-strength-sensitivity-0.1.0",
      sourceType: "engineering_contract",
      url: "/packages/bazi-interpretation/src/strength-sensitivity-review.ts",
      stableRevision: "hakimi.bazi.strength_sensitivity_review/0.1.0",
      verificationStatus: "repository_policy_verified"
    },
    registryLocator: {
      kind: "stable_symbol",
      value: "BAZI_STRENGTH_SENSITIVITY_SCENARIOS + buildStrengthSensitivityReview",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 8,
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    source: {
      sourceId: "dtt-chanwei-wikisource-r2600158",
      sourceType: "public_domain_classic_transcription",
      url: "https://zh.wikisource.org/w/index.php?title=%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE&oldid=2600158",
      stableRevision: "2600158",
      verificationStatus: "locator_verified_in_pinned_revision"
    },
    registryLocator: {
      kind: "chapter_heading",
      value: "通神论 > 十五、月令；十七、衰旺",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 9,
    bindingId: "binding:smt-v5:relative-relations",
    evidenceSubjectId: "bazi.strength.binding.smt-v5.relative-relations.v1",
    source: {
      sourceId: "smt-v5-wikisource-r2706483",
      sourceType: "public_domain_classic_transcription",
      url: "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%94&oldid=2706483",
      stableRevision: "2706483",
      verificationStatus: "locator_verified_in_pinned_revision"
    },
    registryLocator: {
      kind: "chapter_heading",
      value: "卷五 > 论古人立印食官财名义",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 10,
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    source: {
      sourceId: "smt-siku-v10-wikisource-r761703",
      sourceType: "public_domain_classic_transcription",
      url: "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B710&oldid=761703",
      stableRevision: "761703",
      verificationStatus: "locator_verified_in_pinned_revision"
    },
    registryLocator: {
      kind: "chapter_heading",
      value: "卷十 > 看命口诀；玉井奥诀 > 物须提豁方明轻重",
      verificationStatus: "verified",
      contentSha256: null
    }
  },
  {
    order: 11,
    bindingId: "binding:yhzp:hidden-listing",
    evidenceSubjectId: "bazi.strength.binding.yhzp.hidden-listing.v1",
    source: {
      sourceId: "yhzp-wikisource-r2593607",
      sourceType: "public_domain_classic_transcription",
      url: "https://zh.wikisource.org/w/index.php?title=%E6%B7%B5%E6%B5%B7%E5%AD%90%E5%B9%B3&oldid=2593607",
      stableRevision: "2593607",
      verificationStatus: "source_warning_unresolved"
    },
    registryLocator: {
      kind: "chapter_heading",
      value: "论天干地支暗藏总诀；又地支藏遁歌",
      verificationStatus: "pending_manual_textual_verification",
      contentSha256: null
    }
  },
  {
    order: 12,
    bindingId: "binding:zpzz:review-gates",
    evidenceSubjectId: "bazi.strength.binding.zpzz.review-gates.v1",
    source: {
      sourceId: "zpzz-ctext-ch974137-unfrozen",
      sourceType: "review_gate_locator",
      url: "https://ctext.org/wiki.pl?chapter=974137&if=gb&remap=gb",
      stableRevision: null,
      verificationStatus: "locator_only_unfrozen"
    },
    registryLocator: {
      kind: "chapter_heading",
      value: "九、十三、十四、十八、十九：成败救应、气候、破格与成格",
      verificationStatus: "pending_manual_textual_verification",
      contentSha256: null
    }
  }
];

const FUTURE_RECEIPT_CONTRACT = {
  schemaVersion: "1.0.0",
  recordType: "bazi_binding_citation_locator_link_receipt_v1",
  issuerBoundary: {
    thisLedgerMayIssueReceipt: false,
    separateOwnerAuthorizedCapabilityIssuerRequired: true,
    callerAuthoredReceiptAccepted: false,
    digestOnlyReceiptAccepted: false,
    partialReceiptMergeAllowed: false,
    oneReceiptMustConjoinAllIdentityLayers: true
  },
  requiredConjunction: {
    registryBinding: ["order", "bindingId", "evidenceSubjectId"],
    registrySource: [
      "sourceId", "sourceType", "url", "stableRevision", "verificationStatus"
    ],
    registryLocator: ["kind", "value", "verificationStatus", "contentSha256"],
    knowledgeDocument: [
      "documentId", "documentContentHash", "editVersion", "canonicalRecordDigest"
    ],
    citation: [
      "citationId", "editVersion", "documentId", "documentContentHash",
      "sectionId", "startLine", "endLine", "quoteSha256", "targetKeysDigest",
      "status"
    ],
    sourceRights: [
      "documentId", "documentContentHash", "editVersion", "canonicalRecordDigest"
    ],
    sourceCarrier: [
      "carrierId", "documentId", "documentContentHash", "contentDigest",
      "editVersion", "canonicalRecordDigest"
    ],
    projectCopyMaterialization: [
      "materializationReceiptId", "sourceCarrierRecordId", "projectRawSha256",
      "normalizedUtf8Sha256", "knowledgeDocumentContentHash", "verifiedAt"
    ]
  },
  identityRules: {
    bindingSubjectSourceMustMatchOneInventoryRow: true,
    registryLocatorMustMatchSameInventoryRow: true,
    citationMustTargetExactlyOneMatchingEvidenceSubject: true,
    knowledgeDocumentCitationRightsCarrierContentIdentityMustMatch: true,
    materializationMustTerminateAtSameKnowledgeDocumentContentHash: true,
    nullRegistryLocatorContentSha256CannotBeTreatedAsLinked: true,
    candidateLocatorVerificationCannotBePromotedByReceiptShape: true
  },
  quoteBoundary: {
    exactQuoteTextStoredByThisLedger: false,
    quoteDigestRequiredForFutureReceipt: true,
    quoteMustBeVerifiedAgainstSameKnowledgeDocumentBytes: true,
    minimalQuoteSufficiency: "not_established",
    automaticMinimalSufficiencyInferenceAllowed: false,
    quoteLengthOrUniquenessEstablishesSufficiency: false,
    independentHumanMinimalSufficiencyReviewRequired: true
  },
  authorityEffect: "none"
};

const SINGLE_CHART_REPORT_BOUNDARY = {
  knowledgeCoreMapping: {
    artifactPath: BASIS_ARTIFACTS[2].path,
    exportName: "SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS",
    currentBindingEvidenceSubjectCount: 12,
    currentBindingEvidenceSubjectsIncluded: true
  },
  mappingObservationScope: "current_binding_evidence_subject_registry_membership_only",
  mappingAloneEstablishesReportAdmission: false,
  reportConsumerClosureAssessedByThisChild: false,
  reportCitationAdmissionReplayedByThisChild: false,
  singleChartReportAdmissionEffect: "none",
  frozenGoldenReverifiedByThisChild: false,
  browserEvidenceEstablishedByThisChild: false
};

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 28463,
  rawSha256: "4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b",
  ledgerDigest: "2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziBindingCitationLocatorLinkRequirementsError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziBindingCitationLocatorLinkRequirementsError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziBindingCitationLocatorLinkRequirementsError(code, message, cause);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  let nodes = 0;
  let textCodeUnits = 0;
  function visit(current, depth) {
    if (depth > 64) fail("NON_PASSIVE_JSON", "JSON depth exceeds the fixed limit.");
    nodes += 1;
    if (nodes > 200000) fail("NON_PASSIVE_JSON", "JSON node count exceeds the fixed limit.");
    if (current === null || typeof current === "boolean") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "string") {
      textCodeUnits += current.length;
      if (textCodeUnits > 4000000) fail("NON_PASSIVE_JSON", "JSON text exceeds the fixed limit.");
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_NUMBER", "JSON numbers must be finite and not negative zero.");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_PASSIVE_JSON", "Only passive non-Proxy JSON values are accepted.");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("ALIASED_OR_CYCLIC_JSON", "Aliased or cyclic JSON objects are rejected.");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    if (isArray ? prototype !== ARRAY_PROTOTYPE : prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("NON_CANONICAL_PROTOTYPE", "Non-JSON native prototypes are rejected.");
    }
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") fail("NON_JSON_KEY", "JSON artifacts cannot contain symbol keys.");
    }
    if (isArray) {
      const length = descriptors.length?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length]) || length < 0
        || keys.length !== length + 1) {
        fail("NON_CANONICAL_ARRAY", "Arrays must be dense and have no extra properties.");
      }
      let output = "[";
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_JSON", "Array elements must be enumerable data properties.");
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
        fail("NON_PASSIVE_JSON", "Object fields must be enumerable data properties.");
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
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) fail("NON_PASSIVE_JSON", "Proxy values are rejected.");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_JSON", "Only passive data properties may be frozen.");
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
    fail("SEMANTIC_MISMATCH", `${label} does not match the frozen requirement.`);
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
    fail("RAW_IDENTITY_MISMATCH", `${label} raw identity drifted.`);
  }
}

function assertParentCapability(parent) {
  if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED", "The exact v1.9 full-loader private brand is required.");
  }
  const exactFields = {
    ledgerId: PARENT_READINESS.ledgerId,
    ledgerDigest: PARENT_READINESS.ledgerDigest,
    artifact: rawIdentity(PARENT_READINESS),
    bindingRequired: 12,
    bindingRowsChanged: 0,
    bindingFrozenVerified: 0,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    projectCopyMaterializationRecordCount: 0,
    materializationsVerified: 0,
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
  };
  const keys = REFLECT_OWN_KEYS(exactFields);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    exact(parent[key], exactFields[key], `v1.9 private-brand field ${key}`);
  }
}

function assertParentLedger(parentLedger) {
  if (parentLedger?.ledgerId !== PARENT_READINESS.ledgerId
    || parentLedger?.ledgerDigest !== PARENT_READINESS.ledgerDigest
    || computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(parentLedger)
      !== PARENT_READINESS.ledgerDigest) {
    fail("PARENT_SELF_IDENTITY_MISMATCH", "The v1.9 raw/self identity is not exact.");
  }
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parentLedger.bindings])
    || parentLedger.bindings.length !== 12
    || sha256Canonical(parentLedger.bindings) !== PARENT_READINESS.bindingRowsCanonicalSha256) {
    fail("PARENT_BINDING_INVENTORY_MISMATCH", "The v1.9 twelve-row binding inventory drifted.");
  }
}

function assertMaterializationBasis(snapshot) {
  const pin = BASIS_ARTIFACTS[4];
  const ledger = parseBaziDttStrictJsonArtifact(snapshot);
  if (ledger?.ledgerId !== pin.ledgerId || ledger?.ledgerDigest !== pin.ledgerDigest
    || computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(ledger)
      !== pin.ledgerDigest) {
    fail("MATERIALIZATION_BASIS_MISMATCH", "The fixed zero-instance materialization basis drifted.");
  }
}

function buildBindingInventory(parentBindings) {
  const projected = [];
  for (let index = 0; index < REGISTRY_BINDING_INVENTORY.length; index += 1) {
    const expected = REGISTRY_BINDING_INVENTORY[index];
    const parent = parentBindings[index];
    if (parent?.order !== expected.order
      || parent?.bindingId !== expected.bindingId
      || parent?.evidenceSubjectId !== expected.evidenceSubjectId
      || parent?.sourceId !== expected.source.sourceId
      || parent?.sourceType !== expected.source.sourceType
      || parent?.registryLocatorKind !== expected.registryLocator.kind
      || parent?.registryLocatorVerification !== expected.registryLocator.verificationStatus) {
      fail("BINDING_SUBJECT_SOURCE_LOCATOR_MISMATCH",
        `Binding inventory row ${index + 1} does not match the frozen registry projection.`);
    }
    REFLECT_APPLY(ARRAY_PUSH, projected, [{
      order: expected.order,
      bindingId: expected.bindingId,
      evidenceSubjectId: expected.evidenceSubjectId,
      source: cloneJson(expected.source),
      registryLocator: cloneJson(expected.registryLocator),
      readiness: {
        freezeState: parent.freezeState,
        candidateState: parent.candidateState,
        currentDistributionBoundary: parent.currentDistributionBoundary,
        sourceBodyStored: parent.sourceBodyStored,
        sourceBodyDigest: parent.sourceBodyDigest,
        exactQuoteTextStored: parent.exactQuoteTextStored,
        exactQuoteDigest: parent.exactQuoteDigest,
        exactLocatorEstablishedForFreeze: parent.exactLocatorEstablishedForFreeze,
        workIdentityFrozen: parent.workIdentityFrozen,
        editionIdentityFrozen: parent.editionIdentityFrozen,
        carrierIdentityFrozen: parent.carrierIdentityFrozen,
        workRightsEvidenceBound: parent.workRightsEvidenceBound,
        editionRightsEvidenceBound: parent.editionRightsEvidenceBound,
        carrierRightsEvidenceBound: parent.carrierRightsEvidenceBound,
        sourceRightsRecordId: parent.sourceRightsRecordId,
        sourceCarrierRecordId: parent.sourceCarrierRecordId,
        bindingDigest: parent.bindingDigest,
        frozenAt: parent.frozenAt
      },
      parentReadinessRowCanonicalSha256: sha256Canonical(parent)
    }]);
  }
  return projected;
}

function assertZeroInstanceAndAuthorityBoundary(ledger) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [ledger.currentReceipts])
    || ledger.currentReceipts.length !== 0) {
    fail("RECEIPT_FORGERY", "The requirements ledger must remain zero-instance.");
  }
  const counts = ledger.counts;
  const zeroKeys = [
    "locatorLinkReceipts", "bindingsLocatorLinked", "minimalQuoteSufficiencyEstablished",
    "formalKnowledgeDocuments", "formalSourceRightsRecords", "formalSourceCarrierRecords",
    "projectCopyMaterializationRecords", "materializationsVerified", "bindingsFrozen",
    "verifiedNaturalPersonRightsReviewers", "domainExpertReviews", "rightsLegalReviews"
  ];
  for (let index = 0; index < zeroKeys.length; index += 1) {
    if (counts?.[zeroKeys[index]] !== 0) {
      fail("ZERO_COUNT_PROMOTION_FORBIDDEN", `${zeroKeys[index]} must remain zero.`);
    }
  }
  if (counts.bindingsRequired !== 12 || counts.inventoryRows !== 12) {
    fail("INVENTORY_COUNT_MISMATCH", "The exact inventory must remain twelve rows.");
  }
  if (ledger.futureReceiptContract?.quoteBoundary?.minimalQuoteSufficiency !== "not_established"
    || ledger.futureReceiptContract?.quoteBoundary?.automaticMinimalSufficiencyInferenceAllowed !== false
    || ledger.futureReceiptContract?.issuerBoundary?.thisLedgerMayIssueReceipt !== false) {
    fail("QUOTE_OR_RECEIPT_AUTHORITY_PROMOTION_FORBIDDEN",
      "Quote sufficiency and receipt issuance must remain unavailable.");
  }
  const reportBoundary = ledger.singleChartReportBoundary;
  if (reportBoundary?.knowledgeCoreMapping?.artifactPath !== BASIS_ARTIFACTS[2].path
    || reportBoundary?.knowledgeCoreMapping?.exportName !== "SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS"
    || reportBoundary?.knowledgeCoreMapping?.currentBindingEvidenceSubjectCount !== 12
    || reportBoundary?.knowledgeCoreMapping?.currentBindingEvidenceSubjectsIncluded !== true
    || reportBoundary?.mappingObservationScope
      !== "current_binding_evidence_subject_registry_membership_only"
    || reportBoundary?.mappingAloneEstablishesReportAdmission !== false
    || reportBoundary?.reportConsumerClosureAssessedByThisChild !== false
    || reportBoundary?.reportCitationAdmissionReplayedByThisChild !== false
    || reportBoundary?.singleChartReportAdmissionEffect !== "none"
    || reportBoundary?.frozenGoldenReverifiedByThisChild !== false
    || reportBoundary?.browserEvidenceEstablishedByThisChild !== false) {
    fail("REPORT_ADMISSION_PROMOTION_FORBIDDEN",
      "Knowledge Core subject membership cannot be promoted to report admission evidence.");
  }
  const authority = ledger.authorityBoundary;
  if (authority.contentTruthEstablished !== false || authority.expertTruthEstablished !== false
    || authority.rightsLegalConclusionEstablished !== false
    || authority.bindingFreezeEffect !== "none" || authority.activeAdmissionEffect !== "none"
    || authority.releaseReady !== false || authority.publicDeploymentAuthorized !== false
    || authority.expertClaimsAuthorized !== false || authority.publicReleaseAuthorized !== false) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "Authority and release gates must remain closed.");
  }
  const integrity = ledger.integrityBoundary;
  if (integrity.builderOutputPrivatelyBranded !== false
    || integrity.exactPersistedLoaderPrivateBrandRequired !== true
    || integrity.crossFileAtomicSnapshot !== false
    || integrity.mutationEpochAvailableForSchema13 !== false
    || integrity.mutationEpochReceipt !== null
    || integrity.intervalMutationExcludedAcrossFiles !== false
    || integrity.abaExcluded !== false) {
    fail("INTEGRITY_PROMOTION_FORBIDDEN", "Epoch, atomicity and ABA boundaries must remain red.");
  }
}

function buildExpectedLedger(parentLedger) {
  assertParentLedger(parentLedger);
  const bindingInventory = buildBindingInventory(parentLedger.bindings);
  const basisArtifacts = [];
  for (let index = 0; index < BASIS_ARTIFACTS.length; index += 1) {
    const pin = BASIS_ARTIFACTS[index];
    REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [rawIdentity(pin)]);
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_binding_citation_locator_link_requirements_v1",
    ledgerId: LEDGER_ID,
    status: "zero_instance_deny_only_current_binding_locator_material_link_requirements",
    createdAt: CREATED_AT,
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    currentReadinessParent: {
      artifact: rawIdentity(PARENT_READINESS),
      ledgerId: PARENT_READINESS.ledgerId,
      ledgerDigest: PARENT_READINESS.ledgerDigest,
      bindingRowsCanonicalSha256: PARENT_READINESS.bindingRowsCanonicalSha256,
      fullLoaderPrivateBrandRequired: true,
      fullLoaderPrivateBrandConsumedByBuilder: true,
      parentPrivateBrandTransferredToBuilderOutput: false,
      bindingRequired: 12,
      bindingFrozenVerified: 0
    },
    basisArtifacts,
    registryProjection: {
      projectionVersion: "hakimi.bazi.strength_claim_registry/0.2.0",
      contentVersion: "0.18.0",
      bindingInventoryCount: 12,
      inventoryOrdering: "exact_registry_source_binding_order",
      inventoryCanonicalSha256: sha256Canonical(bindingInventory),
      parentBindingRowsCanonicalSha256: PARENT_READINESS.bindingRowsCanonicalSha256
    },
    singleChartReportBoundary: cloneJson(SINGLE_CHART_REPORT_BOUNDARY),
    bindingInventory,
    futureReceiptContract: cloneJson(FUTURE_RECEIPT_CONTRACT),
    currentReceipts: [],
    counts: {
      bindingsRequired: 12,
      inventoryRows: 12,
      locatorLinkReceipts: 0,
      bindingsLocatorLinked: 0,
      minimalQuoteSufficiencyEstablished: 0,
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      bindingsFrozen: 0,
      verifiedNaturalPersonRightsReviewers: 0,
      domainExpertReviews: 0,
      rightsLegalReviews: 0
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      parentFullLoaderPrivateBrandConsumed: true,
      parentRawIdentityPinned: true,
      parentSelfDigestRecomputed: true,
      registryAndSchemaBasisRawIdentitiesPinned: true,
      builderOutputPrivatelyBranded: false,
      exactPersistedLoaderPrivateBrandRequired: true,
      persistedRawIdentityPinned: true,
      persistedSelfDigestPinned: true,
      stableSingleFileReadsUsed: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    authorityBoundary: {
      sourceIdentityAdjudicated: false,
      minimalQuoteSufficiencyEstablished: false,
      realReviewerIdentityAndIndependenceVerified: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      bindingFreezeEffect: "none",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    },
    doesNotEstablish: [
      "registry_locator_to_citation_material_link",
      "knowledge_document_source_rights_source_carrier_or_materialization_instance",
      "minimal_quote_sufficiency",
      "lawful_material_access_or_storage_authority",
      "work_edition_carrier_rights_or_legal_conclusion",
      "reviewer_real_identity_credentials_scope_or_independence",
      "content_or_expert_truth",
      "binding_freeze",
      "single_chart_report_consumer_closure_citation_admission_frozen_golden_or_browser_evidence",
      "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
      "release_readiness_or_public_release_authorization"
    ]
  };
  const ledger = {
    ...unsigned,
    ledgerDigest: computeBaziBindingCitationLocatorLinkRequirementsDigest(unsigned)
  };
  assertZeroInstanceAndAuthorityBoundary(ledger);
  return deepFreeze(ledger);
}

export function computeBaziBindingCitationLocatorLinkRequirementsDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.ledgerDigest;
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [
    `${LEDGER_DIGEST_DOMAIN}\u0000${canonicalStringify(unsigned)}`,
    "utf8"
  ]));
}

async function loadExpectedBundle(workspaceRoot) {
  const parentCapability = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assertParentCapability(parentCapability);

  const parentSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PARENT_READINESS.path);
  assertSnapshot(parentSnapshot, PARENT_READINESS, "binding readiness v1.9");
  exact(parentCapability.artifact, rawIdentity(parentSnapshot), "v1.9 capability/raw snapshot identity");
  const parentLedger = parseBaziDttStrictJsonArtifact(parentSnapshot);
  assertParentLedger(parentLedger);

  for (let index = 0; index < BASIS_ARTIFACTS.length; index += 1) {
    const pin = BASIS_ARTIFACTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, pin.path);
    assertSnapshot(snapshot, pin, pin.role);
    if (index === 4) assertMaterializationBasis(snapshot);
  }

  return OBJECT_FREEZE({
    parentCapability,
    parentLedger,
    ledger: buildExpectedLedger(parentLedger)
  });
}

function assertPersistedSemantic(persisted, expected) {
  if (persisted?.ledgerId !== LEDGER_ID
    || persisted?.ledgerDigest !== computeBaziBindingCitationLocatorLinkRequirementsDigest(persisted)) {
    fail("PERSISTED_DIGEST_MISMATCH", "The persisted requirements identity or self digest drifted.");
  }
  if (persisted.bindingInventory?.length !== 12
    || persisted.registryProjection?.inventoryCanonicalSha256
      !== sha256Canonical(persisted.bindingInventory)) {
    fail("PERSISTED_INVENTORY_MISMATCH", "The persisted twelve-row inventory drifted.");
  }
  assertZeroInstanceAndAuthorityBoundary(persisted);
  exact(persisted, expected, "persisted binding-citation locator-link requirements");
}

export async function buildBaziBindingCitationLocatorLinkRequirements(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  return (await loadExpectedBundle(workspaceRoot)).ledger;
}

export function serializeBaziBindingCitationLocatorLinkRequirements(ledger) {
  return serialize(ledger);
}

export async function loadBaziBindingCitationLocatorLinkRequirements(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(SHA256.test, SHA256, [EXPECTED_PERSISTED.rawSha256])
    || EXPECTED_PERSISTED.rawSha256 === ZERO_SHA256
    || EXPECTED_PERSISTED.ledgerDigest === ZERO_SHA256) {
    fail("PERSISTED_IDENTITY_UNPINNED", "The requirements raw/self identity is not frozen.");
  }
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH
  );
  assertSnapshot(snapshot, {
    path: BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH,
    rawBytes: EXPECTED_PERSISTED.rawBytes,
    rawSha256: EXPECTED_PERSISTED.rawSha256
  }, "binding-citation locator-link requirements");
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (persisted.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest) {
    fail("FROZEN_DIGEST_MISMATCH", "The frozen requirements semantic digest drifted.");
  }
  assertPersistedSemantic(persisted, expected.ledger);
  const result = deepFreeze({
    bindingCitationLocatorLinkRequirementsMechanicallyVerified: true,
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: rawIdentity(snapshot),
    parentReadinessLedgerId: PARENT_READINESS.ledgerId,
    parentReadinessLedgerDigest: PARENT_READINESS.ledgerDigest,
    parentFullLoaderPrivateBrandConsumed: true,
    bindingRequired: 12,
    inventoryRows: 12,
    singleChartReportEvidenceSubjectMappingObserved: true,
    singleChartReportBindingEvidenceSubjectsIncluded: 12,
    reportConsumerClosureAssessedByThisChild: false,
    reportCitationAdmissionReplayedByThisChild: false,
    singleChartReportAdmissionEffect: "none",
    singleChartReportFrozenGoldenReverifiedByThisChild: false,
    singleChartReportBrowserEvidenceEstablishedByThisChild: false,
    currentReceipts: 0,
    bindingsLocatorLinked: 0,
    minimalQuoteSufficiency: "not_established",
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    materializationsVerified: 0,
    bindingsFrozen: 0,
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

export function isVerifiedBaziBindingCitationLocatorLinkRequirements(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziBindingCitationLocatorLinkRequirementsTestOnly = OBJECT_FREEZE({
  PARENT_READINESS,
  BASIS_ARTIFACTS,
  REGISTRY_BINDING_INVENTORY: deepFreeze(cloneJson(REGISTRY_BINDING_INVENTORY)),
  FUTURE_RECEIPT_CONTRACT: deepFreeze(cloneJson(FUTURE_RECEIPT_CONTRACT)),
  SINGLE_CHART_REPORT_BOUNDARY: deepFreeze(cloneJson(SINGLE_CHART_REPORT_BOUNDARY)),
  EXPECTED_PERSISTED,
  canonicalStringify,
  cloneJson,
  sha256Canonical,
  assertSnapshot,
  assertParentCapability,
  assertParentLedger,
  buildBindingInventory,
  buildExpectedLedger,
  loadExpectedBundle,
  assertPersistedSemantic,
  assertZeroInstanceAndAuthorityBoundary
});
