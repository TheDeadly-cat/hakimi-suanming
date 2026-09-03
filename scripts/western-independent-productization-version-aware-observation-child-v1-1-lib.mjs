import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  computeIndependentDomainManifestDigest
} from "./independent-domain-release-manifest-lib.mjs";
import {
  computeIndependentSourceRequirementsDigest
} from "./independent-source-binding-requirements-lib.mjs";
import {
  computeWesternLicenseNoticeEvidenceDigest
} from "./western-isolated-build-license-notice-lib.mjs";
import {
  computeFourSystemCurrentObservationRegistryV2Digest
} from "./four-system-current-observation-registry-v2-lib.mjs";
import {
  computeSystemAdmissionRegistryDigest
} from "./system-admission-registry-lib.mjs";
export const WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH =
  "content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json";

const CANDIDATE_ID =
  "hakimi.western.independent-productization.version-aware-observation-child/1.1.0";
const DIGEST_DOMAIN =
  "hakimi.western.independent-productization.version-aware-observation-child.v1.1";
const PREDECESSOR_DIGEST_DOMAIN =
  "hakimi.western.independent-productization.version-aware-observation-candidate.v1";
const SOURCE_V12_DIGEST_PREFIX =
  "hakimi-western-source-binding-requirements-successor-candidate-v1.2\0";
const CIVIL_DIGEST_DOMAIN =
  "hakimi.western.civil-time-fact-browser-observation-candidate.v1";
const CREATED_AT = "2026-09-01T00:00:00.000Z";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const STRING_INCLUDES = String.prototype.includes;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const ARTIFACT_BINDINGS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    artifactId: "hakimi.western.independent-productization.version-aware-observation-candidate/1.0.0",
    bytes: 18_879,
    path: "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
    role: "historical_predecessor_observation_no_longer_current",
    semanticDigest: "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb",
    semanticDigestField: "candidateDigest",
    semanticIdField: "candidateId",
    sha256: "956fa352a87253abc893056e443bd45e3fa731531b839144e3121c43639f19df",
    status: "current_endpoint_identity_observation_only_central_registry_stale_parent_files_unchanged_zero_admission_effect"
  }),
  OBJECT_FREEZE({
    artifactId: "western-isolated-rules-preview-draft",
    bytes: 10_832,
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    role: "historical_stale_domain_manifest_not_current_parent",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e",
    semanticDigestField: "manifestDigest",
    semanticIdField: "surface.surfaceId",
    sha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    status: "draft"
  }),
  OBJECT_FREEZE({
    artifactId: "hakimi.western-astrology.source-binding-requirements/1.0.0",
    bytes: 25_909,
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    role: "formal_designated_source_requirements_v1_current_basis_red",
    semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
    semanticDigestField: "ledgerDigest",
    semanticIdField: "ledgerId",
    sha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    status: "requirements_only_no_bindings_frozen"
  }),
  OBJECT_FREEZE({
    artifactId: "hakimi.western-astrology.source-binding-requirements/1.2.0",
    bytes: 40_667,
    path: "content/system-admission/western-source-binding-requirements.v1.2.0.json",
    role: "nonformal_stored_source_requirements_v1_2_current_closure_red",
    semanticDigest: "91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58",
    semanticDigestField: "ledgerDigest",
    semanticIdField: "ledgerId",
    sha256: "e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1",
    status: "nonformal_successor_two_partial_source_candidates_plus_two_partial_observations_no_bindings_frozen"
  }),
  OBJECT_FREEZE({
    artifactId: "hakimi.western.astronomy-engine-build-notice-evidence/1.0.0",
    bytes: 8_994,
    path: "content/system-admission/western-astronomy-engine-build-notice-evidence.v1.json",
    role: "historical_controlled_build_notice_child_not_release_build",
    semanticDigest: "0645b6a4fd6308576346b9efefd9caabfd42684609702e87c6077e724b046a30",
    semanticDigestField: "evidenceDigest",
    semanticIdField: "evidenceLedgerId",
    sha256: "98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9",
    status: "controlled_ephemeral_build_notice_artifacts_observed_unbound"
  }),
  OBJECT_FREEZE({
    artifactId: "hakimi.western.civil-time-fact-only-browser-observation/1.0.0",
    bytes: 21_132,
    path: "content/system-admission/western-civil-time-fact-browser-observation-candidate.v1.0.0.json",
    role: "current_civil_time_browser_observation_not_production_evidence",
    semanticDigest: "e898edd1e91aa69193157bdbfc5ea24610a828ce16588388cd9b7cb5b6331b81",
    semanticDigestField: "observationDigest",
    semanticIdField: "observationId",
    sha256: "c23cef0c53f433e4996c78769c4f9ffe023309e8ef136414e67fc35d7e0932b2",
    status: "isolated_controlled_loopback_browser_observation_only_not_admitted"
  })
]);

const CURRENT_CONTRACT_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    bytes: 39_756,
    path: "packages/western-astrology-contracts-draft/src/index.ts",
    role: "current_contract_barrel_and_remaining_contracts",
    sha256: "87bf4fcecc7ec85542eed25c7c06869ba3a084c5e7d7fb305fcd7712ef508416"
  }),
  OBJECT_FREEZE({
    bytes: 2_910,
    path: "packages/western-astrology-contracts-draft/src/civil-input.ts",
    role: "current_split_civil_input_contract",
    sha256: "e1e9cfa1f8f800e5c1ef61b7fdd134fcf0276664411c0691d64ccba21ed81458"
  })
]);

const REGISTRY_BINDINGS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    bytes: 19_093,
    path: "content/system-admission/four-system-admission.v1.json",
    role: "formal_four_system_admission_registry_still_unmodified",
    semanticDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a",
    semanticDigestField: "registryDigest",
    sha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959"
  }),
  OBJECT_FREEZE({
    bytes: 22_261,
    path: "content/system-admission/four-system-current-observation-registry.v2.json",
    role: "current_observation_registry_still_points_to_stale_predecessor",
    semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738",
    semanticDigestField: "registryDigest",
    sha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39"
  })
]);

const PREDECESSOR_CONTRACT_IDENTITY = OBJECT_FREEZE({
  bytes: 41_394,
  path: "packages/western-astrology-contracts-draft/src/index.ts",
  sha256: "3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515"
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  bytes: 12_692,
  sha256: "140bed89a638deb970e1a60d3ffcbc96eebef509bd14bd692726b8c561d13593"
});

export class WesternProductizationVersionAwareObservationChildV11Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "WesternProductizationVersionAwareObservationChildV11Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new WesternProductizationVersionAwareObservationChildV11Error(
    code,
    message,
    cause
  );
}

function sortedKeys(value) {
  const keys = OBJECT_KEYS(value);
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  return keys;
}

function capturePassiveJson(value, label = "value", seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("NON_JSON_NUMBER", `${label} 含非有限数字或负零。`);
    }
    return value;
  }
  if (typeof value !== "object" || utilTypes.isProxy(value)) {
    fail("NON_PASSIVE_JSON", `${label} 必须是非 Proxy 的被动 JSON 值。`);
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) {
    fail("NON_JSON_GRAPH", `${label} 含循环或共享引用。`);
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const ownKeys = REFLECT_OWN_KEYS(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("NON_JSON_KEY", `${label} 含 Symbol 属性。`);
  }
  if (ARRAY_IS_ARRAY(value)) {
    if (OBJECT_GET_PROTOTYPE_OF(value) !== Array.prototype
      || descriptors.length?.value !== value.length) {
      fail("NON_PASSIVE_ARRAY", `${label} 必须是普通稠密数组。`);
    }
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_ARRAY", `${label} 含 hole、accessor 或隐藏元素。`);
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        configurable: true,
        enumerable: true,
        value: capturePassiveJson(descriptor.value, `${label}[${index}]`, seen),
        writable: true
      });
    }
    const dataKeys = ownKeys.filter((key) => key !== "length");
    if (dataKeys.length !== value.length) {
      fail("NON_PASSIVE_ARRAY", `${label} 含额外数组属性。`);
    }
    return output;
  }
  const prototype = OBJECT_GET_PROTOTYPE_OF(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("NON_PASSIVE_OBJECT", `${label} 含自定义 prototype。`);
  }
  const output = OBJECT_CREATE(null);
  for (const key of ownKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      fail("NON_PASSIVE_OBJECT", `${label}.${key} 含 accessor 或隐藏字段。`);
    }
    OBJECT_DEFINE_PROPERTY(output, key, {
      configurable: true,
      enumerable: true,
      value: capturePassiveJson(descriptor.value, `${label}.${key}`, seen),
      writable: true
    });
  }
  return output;
}

function stringifySnapshot(value) {
  if (value === null || typeof value !== "object") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (ARRAY_IS_ARRAY(value)) {
    let output = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) output += ",";
      output += stringifySnapshot(value[index]);
    }
    return `${output}]`;
  }
  const keys = sortedKeys(value);
  let output = "{";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) output += ",";
    const key = keys[index];
    output += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${stringifySnapshot(value[key])}`;
  }
  return `${output}}`;
}

export function canonicalStringifyWesternProductizationVersionAwareObservationChildV11(value) {
  return stringifySnapshot(capturePassiveJson(value));
}

function materializeSorted(value) {
  if (value === null || typeof value !== "object") return value;
  if (ARRAY_IS_ARRAY(value)) {
    const output = [];
    OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
    for (let index = 0; index < value.length; index += 1) {
      OBJECT_DEFINE_PROPERTY(output, String(index), {
        configurable: true,
        enumerable: true,
        value: materializeSorted(value[index]),
        writable: true
      });
    }
    return output;
  }
  const output = OBJECT_CREATE(null);
  for (const key of sortedKeys(value)) {
    OBJECT_DEFINE_PROPERTY(output, key, {
      configurable: true,
      enumerable: true,
      value: materializeSorted(value[key]),
      writable: true
    });
  }
  return output;
}

export function canonicalPrettyStringifyWesternProductizationVersionAwareObservationChildV11(value) {
  const snapshot = capturePassiveJson(value);
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [materializeSorted(snapshot), null, 2])}\n`;
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function digestValue(domain, value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [
    canonicalStringifyWesternProductizationVersionAwareObservationChildV11(value),
    "utf8"
  ]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function withoutOwnField(value, excludedField) {
  const snapshot = capturePassiveJson(value);
  const output = OBJECT_CREATE(null);
  for (const key of sortedKeys(snapshot)) {
    if (key === excludedField) continue;
    OBJECT_DEFINE_PROPERTY(output, key, {
      configurable: true,
      enumerable: true,
      value: snapshot[key],
      writable: true
    });
  }
  return output;
}

export function computeWesternProductizationVersionAwareObservationChildV11Digest(value) {
  return digestValue(DIGEST_DOMAIN, withoutOwnField(value, "candidateDigest"));
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  for (const key of REFLECT_OWN_KEYS(descriptors)) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_RESULT", "结果含 accessor。" );
    }
    deepFreeze(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function copyJson(value) {
  return capturePassiveJson(value);
}

function exactJson(left, right) {
  return canonicalStringifyWesternProductizationVersionAwareObservationChildV11(left)
    === canonicalStringifyWesternProductizationVersionAwareObservationChildV11(right);
}

function buildUnsignedCandidate() {
  return {
    activeAdmissionEffect: "none",
    artifactBindings: copyJson(ARTIFACT_BINDINGS),
    authorityBoundary: {
      baziAuthorityInherited: false,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false,
      sourceFreezeEstablished: false
    },
    browserEvidenceBoundary: {
      browserProduct: "Codex In-app Browser",
      browserVersion: null,
      chromeValidated: false,
      civilTimeArtifactBindingCount: 25,
      civilTimeStoredCandidateAnd25BindingsVerified: true,
      crossBrowserValidated: false,
      edgeValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      productionHostValidated: false,
      serviceWorkerValidated: false
    },
    candidateId: CANDIDATE_ID,
    createdAt: CREATED_AT,
    currentContractObservation: {
      civilInputModuleReferenceObservedInIndex: true,
      currentDirectArtifactCount: 2,
      currentDirectArtifacts: copyJson(CURRENT_CONTRACT_ARTIFACTS),
      currentDirectEndpointIdentitiesObserved: true,
      entirePackageSourceClosureEstablished: false,
      formalInputContractAdmitted: false,
      predecessorRecordedSingleFileIdentity: copyJson(PREDECESSOR_CONTRACT_IDENTITY),
      predecessorRecordedSingleFileIdentityStillCurrent: false,
      restrictedWebFileIntentionallyNotRead: true,
      restrictedWebPath: "apps/web/src/lib/local-user-data-cleanup.ts",
      sourceSemanticsOrDomainTruthEstablished: false,
      testsExecutedByThisObservation: false
    },
    doesNotEstablish: [
      "formal_parent_or_registry_repair_or_supersession",
      "formal_input_contract_or_complete_contract_source_closure",
      "astronomical_accuracy_ephemeris_truth_chart_truth_or_scientific_validity",
      "source_body_exact_quote_locator_frozen_binding_or_three_layer_rights",
      "expert_identity_credentials_independence_original_opinion_or_expert_truth",
      "admitted_or_semantically_complete_high_risk_expression_policy",
      "runtime_bundle_capacity_storage_backup_recovery_or_rollback_design",
      "mutation_epoch_cross_file_atomic_snapshot_interval_integrity_or_aba_exclusion",
      "chrome_edge_cross_browser_pwa_service_worker_or_production_host_acceptance",
      "complete_release_evidence_release_readiness_deployment_or_public_release_authorization",
      "western_product_release_schema_or_migration_identity",
      "bazi_authority_inheritance_cross_system_equivalence_scoring_or_winner_selection"
    ],
    evidenceLedgerSeparation: {
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      engineeringCurrentEndpointEvidenceObserved: true,
      expertTruthEstablished: false,
      publicReleaseAuthorizationEstablished: false,
      releaseReadinessEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 28,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      releaseEvidenceComplete: false,
      requirementsUniverseClosed: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    },
    integrityBoundary: {
      candidateDigestAlgorithm: "SHA-256",
      candidateDigestDomain: DIGEST_DOMAIN,
      candidateDigestExcludesOwnField: true,
      candidateDigestIsDigitalSignature: false,
      fixedPathCurrentVerificationRequired: true,
      preImportIntrinsicIntegrityEstablished: false,
      rawIdentitiesAreDigitalSignatures: false,
      semanticDigestsAreAuthorityReceipts: false,
      upstreamPrivateBrandCount: 0
    },
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      parentChildrenAndRegistriesAtomicSnapshot: false,
      pointInTimeOnly: true,
      sameBufferHashAndParsePerJsonArtifact: true
    },
    productBoundary: {
      centralRegistryIntegration: "absent",
      formalProductSurface: "absent",
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      targetSchema: null
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      expertClaimsAuthorized: false,
      inheritedByWesternProductIdentity: false,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      projectContextOnly: true,
      publicDeploymentAuthorized: false,
      targetSchema: 13
    },
    recordType:
      "western_independent_productization_version_aware_observation_child_v1_1",
    registryObservation: {
      currentObservationRegistryMechanicallyCurrentForWestern: false,
      currentObservationRegistryStillPointsToPredecessorV1: true,
      formalAdmissionRegistryBacklinkPresent: false,
      newChildBacklinkPresent: false,
      registryBindings: copyJson(REGISTRY_BINDINGS),
      registryRepairPerformed: false
    },
    schemaVersion: "1.1.0",
    status:
      "current_non_atomic_western_endpoint_observation_child_predecessor_and_registries_stale_zero_admission_effect",
    systemIdentity: {
      contractSystemId: "western",
      productSystemId: "western-astrology",
      productType: "isolated_engineering_research_boundary"
    },
    upstreamVerification: {
      buildNoticeRawAndSelfDigestVerified: true,
      civilTimeAuthorityBoundaryAllFalseReverified: true,
      civilTimeCandidatePrivateBrandVerified: false,
      civilTimeRawSelfDigestAnd25BindingsVerified: true,
      formalSourceV1RawAndSelfDigestVerified: true,
      historicalManifestRawAndSelfDigestVerified: true,
      predecessorRawAndSelfDigestVerified: true,
      sourceRequirementsV12CurrentClosureEstablished: false,
      sourceRequirementsV12PrivateBrandVerified: false,
      sourceRequirementsV12RawAndSelfDigestVerified: true,
      upstreamCapabilityBrandCount: 0
    },
    versionBoundary: {
      centralRegistriesModifiedByThisChild: false,
      formalDomainParentCurrent: false,
      formalDomainParentHistoricalStale: true,
      formalSourceRequirementsCurrentVersion: "1.0.0",
      formalSupersessionEffect: "none",
      nonformalSourceRequirementsSuccessorVersion: "1.2.0",
      overwritesPriorArtifact: false,
      predecessorCurrentnessRestored: false,
      predecessorPath: ARTIFACT_BINDINGS[0].path,
      predecessorPreserved: true,
      predecessorStillCurrent: false,
      sourceRequirementsV12PromotedToFormalCurrent: false
    }
  };
}

export function buildExpectedWesternProductizationVersionAwareObservationChildV11() {
  const unsigned = buildUnsignedCandidate();
  return deepFreeze(copyJson({
    ...unsigned,
    candidateDigest: digestValue(DIGEST_DOMAIN, unsigned)
  }));
}

export function parseWesternProductizationVersionAwareObservationChildV11JsonBytes(
  bytes,
  label = WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH
) {
  try {
    return capturePassiveJson(parseBaziDttStrictJsonArtifact({ path: label, bytes }), label);
  } catch (cause) {
    if (cause instanceof WesternProductizationVersionAwareObservationChildV11Error) {
      throw cause;
    }
    fail(cause?.code ?? "CANDIDATE_JSON_INVALID", `${label} 不是严格被动 JSON。`, cause);
  }
}

export function verifyWesternProductizationVersionAwareObservationChildV11Object(value) {
  const candidate = capturePassiveJson(value, "candidate");
  if (!SHA256_PATTERN.test(candidate.candidateDigest ?? "")
    || computeWesternProductizationVersionAwareObservationChildV11Digest(candidate)
      !== candidate.candidateDigest) {
    fail("CANDIDATE_DIGEST_MISMATCH", "v1.1 child candidateDigest 无效。" );
  }
  const expected = buildExpectedWesternProductizationVersionAwareObservationChildV11();
  if (!exactJson(candidate, expected)) {
    fail(
      "CANDIDATE_SEMANTICS_MISMATCH",
      "v1.1 child 必须精确保持当前身份、零准入、非原子和全红权限边界。"
    );
  }
  return deepFreeze(candidate);
}

function assertCanonicalCandidateBytes(bytes, candidate) {
  if (decodeStrictUtf8(bytes, "Western v1.1 child")
    !== canonicalPrettyStringifyWesternProductizationVersionAwareObservationChildV11(candidate)) {
    fail("CANDIDATE_CANONICAL_BYTES_DRIFT", "v1.1 child 必须是唯一 canonical pretty JSON 与 LF 终止。" );
  }
}

function assertRawIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.bytes
    || snapshot.rawSha256 !== expected.sha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", `${label} 原始字节身份漂移。`);
  }
}

function readSemanticId(value, field) {
  if (field === "surface.surfaceId") return value?.surface?.surfaceId;
  return value?.[field];
}

function assertBindingSemantics(binding, value, computedDigest) {
  const observedStatus = binding.semanticIdField === "surface.surfaceId"
    ? value?.releaseStatus
    : value?.status;
  if (readSemanticId(value, binding.semanticIdField) !== binding.artifactId
    || value?.[binding.semanticDigestField] !== binding.semanticDigest
    || computedDigest !== binding.semanticDigest
    || observedStatus !== binding.status) {
    fail("UPSTREAM_SEMANTIC_IDENTITY_DRIFT", `${binding.role} semantic identity 漂移。`);
  }
}

function computePredecessorDigest(value) {
  return digestValue(PREDECESSOR_DIGEST_DOMAIN, withoutOwnField(value, "candidateDigest"));
}

function computeSourceV12Digest(value) {
  return sha256Text(
    SOURCE_V12_DIGEST_PREFIX
      + canonicalStringifyWesternProductizationVersionAwareObservationChildV11(
        withoutOwnField(value, "ledgerDigest")
      )
  );
}

function computeCivilDigest(value) {
  return sha256Text(
    `${CIVIL_DIGEST_DOMAIN}\n${canonicalStringifyWesternProductizationVersionAwareObservationChildV11(
      withoutOwnField(value, "observationDigest")
    )}`
  );
}

function requireAllFalse(value, label) {
  const entries = OBJECT_VALUES(value ?? {});
  if (entries.length === 0 || entries.some((state) => state !== false)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} 必须全部保持 false。`);
  }
}

function decodeStrictUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function requireNeedles(bytes, needles, label) {
  const text = decodeStrictUtf8(bytes, label);
  for (const needle of needles) {
    if (!REFLECT_APPLY(STRING_INCLUDES, text, [needle])) {
      fail("CURRENT_SOURCE_STRUCTURE_DRIFT", `${label} 缺少固定结构：${needle}`);
    }
  }
}

async function readBoundJson(workspaceRoot, binding) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, binding.path);
  assertRawIdentity(snapshot, binding, binding.role);
  return {
    snapshot,
    value: parseBaziDttStrictJsonArtifact(snapshot)
  };
}

function verifyFormalSourceV1(value, binding) {
  assertBindingSemantics(
    binding,
    value,
    computeIndependentSourceRequirementsDigest(value)
  );
  if (value.contractSystemId !== "western"
    || value.gateSummary?.bindingRequired !== 28
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.expertReviewedSubjects !== 0
    || value.gateSummary?.expertReviewBundleComplete !== false
    || value.subjects?.length !== 28
    || value.subjects.some((subject) => subject.bindingState !== "required_unbound")) {
    fail("FORMAL_SOURCE_V1_GATE_DRIFT", "formal source v1 不再是 0/28、0 expert 的要求账。" );
  }
  const contractBasis = value.basisArtifacts.find(
    (artifact) => artifact.path === PREDECESSOR_CONTRACT_IDENTITY.path
  );
  if (!contractBasis
    || contractBasis.bytes !== PREDECESSOR_CONTRACT_IDENTITY.bytes
    || contractBasis.sha256 !== PREDECESSOR_CONTRACT_IDENTITY.sha256) {
    fail("FORMAL_SOURCE_V1_BASIS_DRIFT", "formal source v1 未保持 predecessor contract identity。" );
  }
}

function verifyBuildNotice(value, binding) {
  assertBindingSemantics(binding, value, computeWesternLicenseNoticeEvidenceDigest(value));
  requireAllFalse(value.authorityBoundary, "build notice authorityBoundary");
  if (value.noticeCandidate?.releaseBuildProvenanceEstablished !== false
    || value.noticeCandidate?.controlledBuildReceipt?.surfaces?.length !== 2
    || value.noticeCandidate.controlledBuildReceipt.surfaces.some(
      (surface) => surface.engineWorkerObservation?.executionEstablished !== false
    )
    || value.readBoundary?.crossFileAtomicityEstablished !== false
    || value.readBoundary?.intervalIntegrityEstablished !== false
    || value.readBoundary?.abaResistanceEstablished !== false
    || value.readBoundary?.mutationEpochEstablished !== false) {
    fail("BUILD_NOTICE_BOUNDARY_PROMOTED", "历史 build notice 不得晋级为执行、发布或原子性证据。" );
  }
}

function verifyCivilCandidateMaterial(value, binding) {
  assertBindingSemantics(binding, value, computeCivilDigest(value));
  requireAllFalse(value.authorityBoundary, "civil-time authorityBoundary");
  if (value.authorityBoundary?.canonicalZoneIdentityEstablished !== false
    || value.browserObservation?.browserProduct !== "Codex In-app Browser"
    || value.browserObservation?.browserVersion !== null
    || value.browserObservation?.chromeValidated !== false
    || value.browserObservation?.edgeValidated !== false
    || value.browserObservation?.crossBrowserValidated !== false
    || value.browserObservation?.productionBrowserRuntimeEvidenceEstablished !== false
    || value.gateSummary?.bindingRequired !== 28
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.independentExpertsRequired !== 2
    || value.gateSummary?.independentExpertReviewsVerified !== 0
    || value.gateSummary?.admissionGatesRequired !== 8
    || value.gateSummary?.admissionGatesSatisfied !== 0) {
    fail("CIVIL_TIME_BOUNDARY_PROMOTED", "civil-time child 的浏览器或 authority 红门漂移。" );
  }
  const expectedPaths = new Map(CURRENT_CONTRACT_ARTIFACTS.map((entry) => [entry.path, entry]));
  for (const artifact of value.artifactBindings ?? []) {
    const expected = expectedPaths.get(artifact.path);
    if (expected) {
      if (artifact.bytes !== expected.bytes || artifact.sha256 !== expected.sha256) {
        fail("CIVIL_TIME_CONTRACT_BINDING_DRIFT", `${artifact.path} 在 civil child 中的绑定漂移。`);
      }
      expectedPaths.delete(artifact.path);
    }
  }
  if (expectedPaths.size !== 0) {
    fail("CIVIL_TIME_CONTRACT_BINDING_MISSING", "civil child 未绑定两个当前 contract source endpoint。" );
  }
}

async function verifyCivilArtifactEndpoints(workspaceRoot, value) {
  if (!ARRAY_IS_ARRAY(value.artifactBindings) || value.artifactBindings.length !== 25) {
    fail("CIVIL_TIME_ARTIFACT_COUNT_DRIFT", "civil child 必须保持精确 25 个绑定端点。" );
  }
  const seenPaths = new Set();
  for (const binding of value.artifactBindings) {
    if (typeof binding?.path !== "string"
      || seenPaths.has(binding.path)
      || binding.path === ARTIFACT_BINDINGS[5].path
      || binding.path === "apps/web/src/lib/local-user-data-cleanup.ts"
      || !Number.isSafeInteger(binding.bytes)
      || binding.bytes < 1
      || !SHA256_PATTERN.test(binding.sha256 ?? "")) {
      fail("CIVIL_TIME_ARTIFACT_BINDING_INVALID", "civil child 绑定路径或原始身份无效。" );
    }
    seenPaths.add(binding.path);
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, binding.path);
    if (snapshot.rawBytes !== binding.bytes || snapshot.rawSha256 !== binding.sha256) {
      fail("CIVIL_TIME_ARTIFACT_ENDPOINT_DRIFT", `${binding.path} 当前端点漂移。`);
    }
  }
}

function verifyCurrentRegistry(value) {
  const western = value.systems?.find((entry) => entry.contractSystemId === "western");
  if (!western
    || western.currentMachineIdentity?.secondaryObservation?.path !== ARTIFACT_BINDINGS[0].path
    || western.currentMachineIdentity.secondaryObservation.rawSha256 !== ARTIFACT_BINDINGS[0].sha256
    || western.currentMachineIdentity.secondaryObservation.semanticDigest
      !== ARTIFACT_BINDINGS[0].semanticDigest
    || western.gateSummary?.admissionGatesSatisfied !== 0
    || western.gateSummary?.bindingFrozenVerified !== 0
    || western.gateSummary?.independentExpertReviewsVerified !== 0
    || OBJECT_VALUES(western.authorityBoundary ?? {}).some((state) => state !== false)) {
    fail("CURRENT_REGISTRY_WESTERN_STATE_DRIFT", "current registry 不再精确指向 stale Western v1 predecessor 红门。" );
  }
}

async function verifyRegistries(workspaceRoot) {
  const [formal, current] = await Promise.all(REGISTRY_BINDINGS.map(async (binding) => {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, binding.path);
    assertRawIdentity(snapshot, binding, binding.role);
    return { binding, snapshot, value: parseBaziDttStrictJsonArtifact(snapshot) };
  }));
  const formalUnsigned = withoutOwnField(formal.value, "registryDigest");
  if (formal.value.registryDigest !== formal.binding.semanticDigest
    || computeSystemAdmissionRegistryDigest(formalUnsigned) !== formal.binding.semanticDigest) {
    fail("FORMAL_REGISTRY_DIGEST_DRIFT", "formal four-system registry self digest 漂移。" );
  }
  if (current.value.registryDigest !== current.binding.semanticDigest
    || computeFourSystemCurrentObservationRegistryV2Digest(current.value)
      !== current.binding.semanticDigest) {
    fail("CURRENT_REGISTRY_DIGEST_DRIFT", "current-observation registry self digest 漂移。" );
  }
  verifyCurrentRegistry(current.value);
  return [formal, current];
}

async function verifyCurrentUpstreams(workspaceRoot) {
  const [predecessor, manifest, formalSource, sourceV12, buildNotice, civil, registries] = await Promise.all([
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[0]),
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[1]),
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[2]),
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[3]),
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[4]),
    readBoundJson(workspaceRoot, ARTIFACT_BINDINGS[5]),
    verifyRegistries(workspaceRoot)
  ]);

  assertBindingSemantics(
    ARTIFACT_BINDINGS[0],
    predecessor.value,
    computePredecessorDigest(predecessor.value)
  );
  assertBindingSemantics(
    ARTIFACT_BINDINGS[1],
    manifest.value,
    computeIndependentDomainManifestDigest(manifest.value)
  );
  if (manifest.value.systemId !== "western"
    || manifest.value.gateState?.bindingFrozenVerified !== 0
    || manifest.value.gateState?.independentExpertReviewsVerified !== 0
    || manifest.value.gateState?.highRiskPolicyBound !== false
    || manifest.value.gateState?.releaseEvidenceComplete !== false) {
    fail("HISTORICAL_MANIFEST_BOUNDARY_DRIFT", "historical manifest 不再保持 Western 红门。" );
  }
  const manifestContractBindings = manifest.value.components
    .flatMap((component) => component.files)
    .filter((artifact) => artifact.path === PREDECESSOR_CONTRACT_IDENTITY.path);
  if (manifestContractBindings.length < 1
    || manifestContractBindings.some(
      (artifact) => artifact.sha256 !== PREDECESSOR_CONTRACT_IDENTITY.sha256
    )) {
    fail("HISTORICAL_MANIFEST_CONTRACT_BASIS_DRIFT", "historical manifest 未保持 predecessor contract hash。" );
  }
  verifyFormalSourceV1(formalSource.value, ARTIFACT_BINDINGS[2]);
  assertBindingSemantics(
    ARTIFACT_BINDINGS[3],
    sourceV12.value,
    computeSourceV12Digest(sourceV12.value)
  );
  if (sourceV12.value.contractSystemId !== "western"
    || sourceV12.value.formalStateBoundary?.formalCurrentIsV1 !== true
    || sourceV12.value.formalStateBoundary?.v12SuccessorIsFormalCurrent !== false
    || sourceV12.value.formalStateBoundary?.v12SuccessorActiveEffect !== "none"
    || sourceV12.value.gateSummary?.bindingRequired !== 28
    || sourceV12.value.gateSummary?.bindingFrozenVerified !== 0
    || sourceV12.value.gateSummary?.rightsLegalConclusionEstablished !== false
    || sourceV12.value.gateSummary?.releaseReady !== false
    || sourceV12.value.gateSummary?.publicDeploymentAuthorized !== false
    || sourceV12.value.gateSummary?.publicReleaseAuthorized !== false) {
    fail("SOURCE_V12_BOUNDARY_DRIFT", "保存的 nonformal source v1.2 自摘要或红门漂移。" );
  }
  const sourceV12ContractBasis = sourceV12.value.basisArtifacts.find(
    (artifact) => artifact.path === PREDECESSOR_CONTRACT_IDENTITY.path
  );
  if (!sourceV12ContractBasis
    || sourceV12ContractBasis.bytes !== PREDECESSOR_CONTRACT_IDENTITY.bytes
    || sourceV12ContractBasis.sha256 !== PREDECESSOR_CONTRACT_IDENTITY.sha256) {
    fail("SOURCE_V12_CONTRACT_BASIS_DRIFT", "nonformal source v1.2 未保持 predecessor contract identity。" );
  }
  verifyBuildNotice(buildNotice.value, ARTIFACT_BINDINGS[4]);
  verifyCivilCandidateMaterial(civil.value, ARTIFACT_BINDINGS[5]);
  await verifyCivilArtifactEndpoints(workspaceRoot, civil.value);

  const sourceSnapshots = [];
  for (const binding of CURRENT_CONTRACT_ARTIFACTS) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, binding.path);
    assertRawIdentity(snapshot, binding, binding.role);
    sourceSnapshots.push(snapshot);
  }
  requireNeedles(sourceSnapshots[0].bytes, [
    'from "./civil-input.ts"',
    "productionEligible: z.literal(false)"
  ], "Western contract index.ts");
  requireNeedles(sourceSnapshots[1].bytes, [
    'WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION = "0.1.0-draft.1"',
    'WESTERN_ASTROLOGY_SYSTEM_ID = "western-astrology"',
    "westernBirthInputDraftSchema"
  ], "Western civil-input.ts");

  const childNeedles = [
    CANDIDATE_ID,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH
  ];
  for (const entry of [
    predecessor,
    manifest,
    formalSource,
    sourceV12,
    buildNotice,
    civil,
    ...registries
  ]) {
    const text = decodeStrictUtf8(entry.snapshot.bytes, entry.binding?.role ?? "upstream");
    for (const needle of childNeedles) {
      if (REFLECT_APPLY(STRING_INCLUDES, text, [needle])) {
        fail("UPSTREAM_BACKLINK_FORBIDDEN", "既有 parent/registry 不得反绑新 v1.1 child。" );
      }
    }
  }
}

export async function buildCurrentWesternProductizationVersionAwareObservationChildV11(
  workspaceRoot = process.cwd()
) {
  await verifyCurrentUpstreams(workspaceRoot);
  return buildExpectedWesternProductizationVersionAwareObservationChildV11();
}

function assertPersistedIdentity(snapshot) {
  if (EXPECTED_PERSISTED.bytes <= 0
    || !SHA256_PATTERN.test(EXPECTED_PERSISTED.sha256)
    || EXPECTED_PERSISTED.sha256 === "0".repeat(64)) {
    fail("PERSISTED_IDENTITY_UNSET", "v1.1 child 固定路径 raw identity 尚未冻结。" );
  }
  if (snapshot.path !== WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.bytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.sha256) {
    fail("PERSISTED_IDENTITY_DRIFT", "v1.1 child 固定路径 raw identity 漂移。" );
  }
}

export async function loadWesternProductizationVersionAwareObservationChildV11(
  workspaceRoot = process.cwd()
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH
  );
  assertPersistedIdentity(snapshot);
  const parsed = parseWesternProductizationVersionAwareObservationChildV11JsonBytes(
    snapshot.bytes,
    snapshot.path
  );
  assertCanonicalCandidateBytes(snapshot.bytes, parsed);
  const candidate = verifyWesternProductizationVersionAwareObservationChildV11Object(parsed);
  const expected = await buildCurrentWesternProductizationVersionAwareObservationChildV11(
    workspaceRoot
  );
  if (!exactJson(candidate, expected)) {
    fail("CANDIDATE_CURRENT_EXPECTATION_MISMATCH", "v1.1 child 与当前固定上游身份不一致。" );
  }
  const result = deepFreeze(copyJson({
    activeAdmissionEffect: "none",
    admissionGatesSatisfied: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 28,
    browserRuntimeEvidenceEstablished: false,
    candidateDigest: candidate.candidateDigest,
    candidateId: candidate.candidateId,
    currentContractArtifactCount: 2,
    currentObservationRegistryMechanicallyCurrentForWestern: false,
    expertClaimsAuthorized: false,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    predecessorStillCurrent: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    status: candidate.status,
    upstreamPrivateBrandCount: 0
  }));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternProductizationVersionAwareObservationChildV11(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernProductizationVersionAwareObservationChildV11TestOnly = OBJECT_FREEZE({
  ARTIFACT_BINDINGS,
  CURRENT_CONTRACT_ARTIFACTS,
  REGISTRY_BINDINGS,
  PREDECESSOR_CONTRACT_IDENTITY,
  EXPECTED_PERSISTED,
  DIGEST_DOMAIN,
  assertRawIdentity,
  assertPersistedIdentity,
  assertCanonicalCandidateBytes,
  capturePassiveJson,
  computeCivilDigest,
  verifyCivilCandidateMaterial,
  readStableWorkspaceArtifact: readBaziDttStableWorkspaceArtifact
});
