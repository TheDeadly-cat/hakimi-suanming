import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

export const WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json";

const DIGEST_DOMAIN =
  "hakimi.western.independent-productization.version-aware-observation-candidate.v1";
const MAX_CANDIDATE_BYTES = 256 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const CURRENT_CONTEXTS = Object.freeze([
  Object.freeze({
    contextId: "western_independent_domain_manifest_v0_1",
    role: "existing_independent_domain_manifest",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    bytes: 10832,
    sha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    semanticDigestField: "manifestDigest",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e",
    status: "draft"
  }),
  Object.freeze({
    contextId: "western_source_binding_requirements_v1",
    role: "existing_requirements_only_source_ledger",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    bytes: 25909,
    sha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
    status: "requirements_only_no_bindings_frozen"
  }),
  Object.freeze({
    contextId: "western_astronomy_engine_notice_child_v1",
    role: "existing_one_way_build_notice_child",
    path: "content/system-admission/western-astronomy-engine-build-notice-evidence.v1.json",
    bytes: 8994,
    sha256: "98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9",
    semanticDigestField: "evidenceDigest",
    semanticDigest: "0645b6a4fd6308576346b9efefd9caabfd42684609702e87c6077e724b046a30",
    status: "controlled_ephemeral_build_notice_artifacts_observed_unbound"
  })
]);

const IMPLEMENTATION_ARTIFACTS = Object.freeze([
  Object.freeze({
    role: "western_input_and_fact_contract_draft",
    path: "packages/western-astrology-contracts-draft/src/index.ts",
    bytes: 41394,
    sha256: "3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515"
  }),
  Object.freeze({
    role: "civil_time_adapter_package_boundary",
    path: "packages/western-civil-time-input-adapter-draft/package.json",
    bytes: 553,
    sha256: "7b196bb3cbb248a010e5b293d9447d861f7c1aca2629a320925ce22b1a69a8df"
  }),
  Object.freeze({
    role: "civil_time_adapter_implementation",
    path: "packages/western-civil-time-input-adapter-draft/src/index.ts",
    bytes: 27692,
    sha256: "80f7b3627d5a4651d0ab2d9509a314f49d93fbdac6d5f92b10ac97c34892fc77"
  }),
  Object.freeze({
    role: "civil_time_adapter_tests",
    path: "packages/western-civil-time-input-adapter-draft/src/index.test.ts",
    bytes: 16752,
    sha256: "1a048047ace95ee30fb35584f05f64e64f0ef4dd0e9e24b79327d3c8e3ace4e5"
  }),
  Object.freeze({
    role: "tzdb_core_package_boundary",
    path: "packages/tzdb-core/package.json",
    bytes: 241,
    sha256: "fb12b19a6f6c971185bd2f2c9226fe50ad816595e3acec4f0a0b373593136236"
  }),
  Object.freeze({
    role: "tzdb_descriptor_registry_source",
    path: "packages/tzdb-core/src/index.ts",
    bytes: 7819,
    sha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e"
  }),
  Object.freeze({
    role: "astronomy_engine_adapter_package_boundary",
    path: "packages/western-astronomy-engine-adapter-draft/package.json",
    bytes: 540,
    sha256: "e7639fc309f3d92729ce2084275bad75702cb70df151c663bffd8b35cae15786"
  }),
  Object.freeze({
    role: "astronomy_engine_diagnostic_adapter",
    path: "packages/western-astronomy-engine-adapter-draft/src/index.ts",
    bytes: 19629,
    sha256: "ccf29e09dbcd0422da67cdb8c623061f974ff05335a768758254e869b8ac4d83"
  }),
  Object.freeze({
    role: "strict_calculation_receipt_fail_closed_gate",
    path: "packages/western-astronomy-engine-adapter-draft/src/strict-receipt-draft.ts",
    bytes: 3616,
    sha256: "9b156ca0040c4216da08d65682da5bbfb1770858dccd7f4b604bf94f745cb14d"
  }),
  Object.freeze({
    role: "rules_preview_package_boundary",
    path: "packages/western-astrology-rules-preview-draft/package.json",
    bytes: 497,
    sha256: "42d5a3860d53b3a1cd243341ecc9aee6b7ffc10ec7799d61a4218ff31f99418b"
  }),
  Object.freeze({
    role: "rules_preview_rule_layer_bridge",
    path: "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts",
    bytes: 526,
    sha256: "4ca446e65844ebacd8c452389928df181395c93008da2946aad68491b284493b"
  }),
  Object.freeze({
    role: "rules_preview_content_layer",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/content-layer.ts",
    bytes: 86923,
    sha256: "0b53443ad3d39ba70e0572c33209e599a9da1cf9c8f1df5d45a1d32f88da11c7"
  }),
  Object.freeze({
    role: "rules_preview_base_review_contract",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/content-review-feedback.ts",
    bytes: 35764,
    sha256: "b58d6ebbc4fc86bdae9a246c791ba90d1ec14c1a2df49764083ee2b8ed0899e4"
  }),
  Object.freeze({
    role: "rules_preview_dynamic_review_contract",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/dynamic-content-review-feedback.ts",
    bytes: 50521,
    sha256: "df540561017ca83f95e367c04c16bdd0b2012ba0b2c227a792086e0f84290334"
  }),
  Object.freeze({
    role: "rules_preview_browser_composition",
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
    bytes: 72690,
    sha256: "27284f9817d6b8414402b8fbedbcb06e49aab738115c084a55a6c0100357ea7e"
  }),
  Object.freeze({
    role: "rules_preview_content_layer_tests",
    path: "packages/western-astrology-rules-preview-draft/src/content-layer.test.ts",
    bytes: 16458,
    sha256: "edf098daeba61e73a754c8033e8d5c7b0ed67c9b3036384a4b5b897f31501e27"
  }),
  Object.freeze({
    role: "rules_preview_base_review_tests",
    path: "packages/western-astrology-rules-preview-draft/src/content-review-feedback.test.ts",
    bytes: 12674,
    sha256: "4079fc8310c0258966521e49b72f2500ea62b2de773b0a5dd74ac4f2180845fa"
  }),
  Object.freeze({
    role: "rules_preview_dynamic_review_tests",
    path: "packages/western-astrology-rules-preview-draft/src/dynamic-content-review-feedback.test.ts",
    bytes: 17429,
    sha256: "e7e459a152aee74d11ff9913d128cb494518e9fd83b33582c257ed603f5ec960"
  }),
  Object.freeze({
    role: "rules_preview_browser_gate_spec",
    path: "packages/western-astrology-rules-preview-draft/e2e/rules-preview-browser-gate.spec.ts",
    bytes: 39519,
    sha256: "82b678f319a75261901c19d1748944654227749d7c68d8ca19ccbd91292c6e7f"
  })
]);

const CENTRAL_REGISTRY = Object.freeze({
  path: "content/system-admission/four-system-admission.v1.json",
  bytes: 19093,
  sha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959"
});

const WESTERN_REGISTRY_COMPARISONS = Object.freeze([
  Object.freeze({
    role: "independent_domain_release_manifest_draft",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    registryBytes: 10607,
    registrySha256: "265ad91de85f41f7ebd455374ccc43129d21a152055f587620b10b33cd3edc86",
    currentBytes: 10832,
    currentSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    matchesCurrent: false
  }),
  Object.freeze({
    role: "source_binding_requirements_inventory",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    registryBytes: 25909,
    registrySha256: "711bc4d445dd2a02edb6859361663cf3ce1512ed75c25a365430706f1f9c0ec8",
    currentBytes: 25909,
    currentSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    matchesCurrent: false
  }),
  Object.freeze({
    role: "isolated_contract_draft",
    path: "packages/western-astrology-contracts-draft/src/index.ts",
    registryBytes: 41394,
    registrySha256: "3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515",
    currentBytes: 41394,
    currentSha256: "3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515",
    matchesCurrent: true
  }),
  Object.freeze({
    role: "isolated_astronomy_engine_lock_closure",
    path: "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
    registryBytes: 960,
    registrySha256: "dd12ce93af144ee11965e0b89444150a2d0a6c68fe6bbf67650684ff3476bb39",
    currentBytes: 960,
    currentSha256: "dd12ce93af144ee11965e0b89444150a2d0a6c68fe6bbf67650684ff3476bb39",
    matchesCurrent: true
  }),
  Object.freeze({
    role: "isolated_rule_layer_bridge_draft",
    path: "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts",
    registryBytes: 526,
    registrySha256: "4ca446e65844ebacd8c452389928df181395c93008da2946aad68491b284493b",
    currentBytes: 526,
    currentSha256: "4ca446e65844ebacd8c452389928df181395c93008da2946aad68491b284493b",
    matchesCurrent: true
  }),
  Object.freeze({
    role: "source_and_rights_research_notes",
    path: "docs/西洋星盘契约草案与来源门-v0.1.md",
    registryBytes: 20351,
    registrySha256: "518116de8187893ddbe04542431681f6d17969e41b337988d189af6d977d9984",
    currentBytes: 20999,
    currentSha256: "3a8e38d3f321e3232c0c895476cb4b7be61473c67d7a956444ccb8d4776c6c57",
    matchesCurrent: false
  })
]);

const HORIZONS_ABSENT_PATHS = Object.freeze([
  "packages/western-astronomy-engine-adapter-draft/evidence/horizons-2025-equinox-candidate.txt",
  "packages/western-astronomy-engine-adapter-draft/evidence/horizons-2025-equinox-candidate.json",
  "packages/western-astronomy-engine-adapter-draft/evidence/horizons-2025-equinox-official.txt",
  "packages/western-astronomy-engine-adapter-draft/evidence/horizons-2025-equinox-official.json"
]);

const VERIFIED_RESULTS = new WeakSet();

export class WesternProductizationVersionAwareObservationCandidateError extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "WesternProductizationVersionAwareObservationCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new WesternProductizationVersionAwareObservationCandidateError(code, message, cause);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalStringify(value, seen = new WeakSet()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("NON_JSON_NUMBER", "观察候选不接受非有限数值或 -0。");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    fail("NON_JSON_VALUE", "观察候选只接受被动 JSON 值。");
  }
  if (seen.has(value)) {
    fail("NON_JSON_GRAPH", "观察候选不接受 cycle 或 alias。");
  }
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("NON_JSON_KEY", "观察候选不接受 Symbol 属性。");
  }
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype
      || ownKeys.length !== value.length + 1
      || descriptors.length?.value !== value.length) {
      fail("NON_PASSIVE_ARRAY", "观察候选数组必须稠密且无额外属性。");
    }
    const parts = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_ARRAY", "观察候选数组不得包含 hole 或 accessor。");
      }
      parts.push(canonicalStringify(descriptor.value, seen));
    }
    return "[" + parts.join(",") + "]";
  }
  if (prototype !== Object.prototype && prototype !== null) {
    fail("NON_PASSIVE_OBJECT", "观察候选不接受自定义 prototype。");
  }
  const keys = ownKeys.sort();
  const parts = [];
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      fail("NON_PASSIVE_OBJECT", "观察候选不得包含 accessor 或隐藏字段。");
    }
    parts.push(JSON.stringify(key) + ":" + canonicalStringify(descriptor.value, seen));
  }
  return "{" + parts.join(",") + "}";
}

function canonicalValue(value) {
  return JSON.parse(canonicalStringify(value));
}

function domainSeparatedDigest(value) {
  return createHash("sha256")
    .update(DIGEST_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

export function computeWesternProductizationVersionAwareObservationCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(unsigned);
}

export function canonicalPrettyStringifyWesternProductizationVersionAwareObservationCandidate(value) {
  return JSON.stringify(canonicalValue(value), null, 2) + "\n";
}

function buildExpectedUnsignedCandidate() {
  return {
    admissionAccounting: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      sourceCandidatesAttached: 0,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      workRightsEstablished: 0,
      editionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      expertReviewedSubjects: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    authorityBoundary: {
      engineeringObservationOnly: true,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      sourceFreezeEstablished: false,
      highRiskClaimsAuthorized: false,
      formalAdmissionAuthorized: false,
      expertClaimsAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    candidateId:
      "hakimi.western.independent-productization.version-aware-observation-candidate/1.0.0",
    centralRegistryStaleness: {
      activeAdmissionEffect: "none",
      centralRegistry: CENTRAL_REGISTRY,
      centralRegistryModifiedByThisChild: false,
      centralRegistryCurrentForWestern: false,
      centralRegistryUsableForWesternAdmission: false,
      currentWesternArtifactComparisons: WESTERN_REGISTRY_COMPARISONS,
      formalPromotionBlocked: true,
      matchingWesternArtifactIdentities: 3,
      mismatchingWesternArtifactIdentities: 3,
      observationCandidateBacklinkPresentInRegistry: false,
      staleForWestern: true,
      westernArtifactIdentitiesCompared: 6
    },
    createdAt: "2026-08-31T00:00:00.000Z",
    currentContexts: {
      contextCount: CURRENT_CONTEXTS.length,
      contexts: CURRENT_CONTEXTS.map((entry) => ({ ...entry })),
      contextsAreAuthorityReceipts: false,
      contextsAreReleaseParents: false,
      parentFilesModifiedByThisChild: false,
      semanticProjectionCheckedFromSameCapturedBytes: true
    },
    doesNotEstablish: [
      "current_central_registry_identity_or_formal_parent_supersession",
      "formal_input_contract_or_browser_pwa_input_runtime",
      "ut1_tai_tt_tdb_leap_second_eop_or_astronomical_time_scale_provenance",
      "official_jpl_horizons_response_publisher_identity_or_network_provenance",
      "astronomical_accuracy_ephemeris_truth_chart_truth_or_scientific_validity",
      "source_body_exact_quote_locator_frozen_binding_or_three_layer_rights",
      "expert_identity_credentials_independence_original_opinion_or_expert_truth",
      "admitted_or_semantically_complete_high_risk_expression_policy",
      "mutation_epoch_storage_backup_recovery_rollback_or_cross_file_atomicity",
      "default_web_browser_service_worker_host_release_evidence_or_deployment",
      "release_readiness_public_deployment_public_release_or_expert_claims_authorization",
      "bazi_authority_inheritance_cross_system_equivalence_scoring_or_winner_selection"
    ],
    evidenceLedgerSeparation: {
      engineeringEndpointEvidenceObserved: true,
      browserOrRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReadinessEstablished: false,
      publicReleaseAuthorizationEstablished: false
    },
    implementationObservation: {
      artifactCount: IMPLEMENTATION_ARTIFACTS.length,
      artifactInventory: IMPLEMENTATION_ARTIFACTS.map((entry) => ({ ...entry })),
      astronomyAndStrictReceipt: {
        astronomyEngineVersionObserved: "2.1.19",
        diagnosticOnly: true,
        officialHorizonsCandidateCount: 0,
        officialHorizonsCandidatePathsExpectedAbsent: [...HORIZONS_ABSENT_PATHS],
        strictReceiptIssued: false,
        strictReceiptSuccessPathImplemented: false,
        timeScalePrerequisitesBound: false,
        officialEvidenceBound: false,
        domainReviewBound: false,
        astronomicalFactsFormallyAdmitted: false
      },
      civilTimeAdapter: {
        adapterVersionObserved: "0.1.0-draft.1",
        runtimeBoundary: "node-test-only",
        productionImportForbidden: true,
        manifestBound: false,
        centralRegistryBound: false,
        formalInputContractAdmitted: false,
        timeScaleProvenanceEstablished: false,
        persistencePerformed: false,
        mutationEpochAvailable: false,
        personDerivedDataPresent: true,
        safeToLog: false,
        safeToPersist: false,
        safeToPublish: false
      },
      rulesPreviewAndReview: {
        productionImportForbidden: true,
        resultAuthorized: false,
        formalActivationAllowed: false,
        autoIntegrationAllowed: false,
        reviewerIdentityVerified: false,
        digitalSignatureVerified: false,
        scientificValidityEstablished: false,
        expertTruthEstablished: false,
        highRiskPolicyBound: false,
        formalReportContractAdmitted: false
      },
      tzdbDescriptors: [
        {
          snapshotRole: "current",
          snapshotId:
            "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3",
          ianaVersion: "2026c",
          dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
          resolverName: "hakimi-tzdb-core",
          resolverVersion: "1.0.0",
          adapterName: "moment-timezone",
          adapterVersion: "0.6.3",
          supportedRange: { from: "1900-01-01", to: "2100-12-31" }
        },
        {
          snapshotRole: "retained",
          snapshotId:
            "iana-tzdb@2025b/sha256:b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3",
          ianaVersion: "2025b",
          dataSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425",
          resolverName: "hakimi-tzdb-core",
          resolverVersion: "1.0.0",
          adapterName: "moment-timezone",
          adapterVersion: "0.6.3",
          supportedRange: { from: "1900-01-01", to: "2100-12-31" }
        }
      ],
      tzdbRightsOrPublisherAuthenticityEstablished: false
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      signerIdentity: null,
      digitalSignature: null,
      authenticityEstablished: false
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      pathEndpointRevalidated: true,
      sameBufferHashAndParsePerJsonContext: true,
      candidateHashAndParseUseSameHeldHandleBuffer: true,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      candidateObjectCarriesPrivateBrand: false,
      verifierResultCarriesPrivateBrand: true,
      privateBrandMeaning:
        "fixed_path_endpoint_mechanical_observation_only_not_authority_or_continued_currentness"
    },
    productBoundary: {
      activeAdmissionEffect: "none",
      productStatus: "isolated_engineering_draft",
      productSurface: "isolated_preview_only",
      centralRegistryIntegration: "absent",
      independentDomainManifestUpdatedByThisChild: false,
      sourceRequirementsUpdatedByThisChild: false,
      noticeChildUpdatedByThisChild: false,
      formalStorageSchema: "absent",
      mutationEpochImplementation: "absent",
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      legacyV13Inherited: false,
      schema13Inherited: false,
      baziAuthorityInherited: false
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    recordType:
      "western_independent_productization_version_aware_observation_candidate_v1",
    schemaVersion: "1.0.0",
    status:
      "current_endpoint_identity_observation_only_central_registry_stale_parent_files_unchanged_zero_admission_effect",
    systemIdentity: {
      productSystemId: "western-astrology",
      contractSystemId: "western",
      authorityStatus: "not-authoritative",
      integrationStatus: "not-integrated",
      productStatus: "isolated-engineering-draft"
    }
  };
}

export function buildExpectedWesternProductizationVersionAwareObservationCandidate() {
  const unsigned = buildExpectedUnsignedCandidate();
  return {
    ...unsigned,
    candidateDigest: domainSeparatedDigest(unsigned)
  };
}

export function parseWesternProductizationVersionAwareObservationCandidateJsonBytes(
  bytes,
  label = "西洋独立产品化版本感知观察候选 JSON"
) {
  if (!(bytes instanceof Uint8Array)
    || bytes.byteLength < 2
    || bytes.byteLength > MAX_CANDIDATE_BYTES) {
    fail("CANDIDATE_BYTES_INVALID", label + " 字节长度无效。");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("CANDIDATE_UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
  if (text.charCodeAt(0) === 0xfeff || text.includes("\0")) {
    fail("CANDIDATE_TEXT_INVALID", label + " 不接受 BOM 或 NUL。");
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    fail("CANDIDATE_JSON_INVALID", label + " 不是有效 JSON。", cause);
  }
}

export function verifyWesternProductizationVersionAwareObservationCandidate(value) {
  const canonical = canonicalValue(value);
  if (!SHA256_PATTERN.test(canonical.candidateDigest ?? "")) {
    fail("CANDIDATE_DIGEST_INVALID", "candidateDigest 格式无效。");
  }
  const recomputed = computeWesternProductizationVersionAwareObservationCandidateDigest(canonical);
  if (canonical.candidateDigest !== recomputed) {
    fail("CANDIDATE_DIGEST_MISMATCH", "candidateDigest 与当前候选内容不一致。");
  }
  const expected = buildExpectedWesternProductizationVersionAwareObservationCandidate();
  if (canonicalStringify(canonical) !== canonicalStringify(expected)) {
    fail(
      "CANDIDATE_SEMANTICS_MISMATCH",
      "观察候选必须与固定零授权、中央登记 stale 和当前 endpoint 身份精确一致。"
    );
  }
  return canonical;
}

function safeWorkspacePath(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string"
    || relativePath.length < 1
    || relativePath.length > 400
    || relativePath.includes("\0")
    || relativePath.includes("\\")
    || relativePath.includes(":")
    || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_ARTIFACT_PATH", "观察候选包含不安全路径。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".."
    || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "观察候选路径越出工作区。");
  }
  return absolute;
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

async function captureWorkspaceFile(workspaceRoot, relativePath) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspacePath(root, relativePath);
  const initialPathStat = await lstat(absolute);
  if (!initialPathStat.isFile() || initialPathStat.isSymbolicLink()) {
    fail("ARTIFACT_ENDPOINT_INVALID", relativePath + " 不是普通文件 endpoint。");
  }
  const initialRealPath = await realpath(absolute);
  if (!isSameOrWithin(root, initialRealPath)) {
    fail("ARTIFACT_PATH_ESCAPE", relativePath + " 的 realpath 越出工作区。");
  }
  const handle = await open(absolute, "r");
  let before;
  let bytes;
  let after;
  try {
    before = await handle.stat();
    bytes = await handle.readFile();
    after = await handle.stat();
  } finally {
    await handle.close();
  }
  const finalPathStat = await lstat(absolute);
  const finalRealPath = await realpath(absolute);
  if (!sameEndpoint(before, after)
    || before.dev !== initialPathStat.dev
    || before.ino !== initialPathStat.ino
    || after.dev !== finalPathStat.dev
    || after.ino !== finalPathStat.ino
    || initialRealPath !== finalRealPath
    || bytes.byteLength !== after.size) {
    fail("ARTIFACT_ENDPOINT_CHANGED", relativePath + " 在读取窗口内改变。");
  }
  return bytes;
}

async function captureBoundArtifact(workspaceRoot, descriptor) {
  const bytes = await captureWorkspaceFile(workspaceRoot, descriptor.path);
  const digest = sha256Bytes(bytes);
  if (bytes.byteLength !== descriptor.bytes || digest !== descriptor.sha256) {
    fail("ARTIFACT_DRIFT", descriptor.path + " 的当前 bytes/SHA-256 与观察候选不一致。");
  }
  return bytes;
}

function parseJsonContext(bytes, label) {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (cause) {
    fail("CONTEXT_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

function assertExactFalseObject(object, keys, label) {
  for (const key of keys) {
    if (object?.[key] !== false) {
      fail("AUTHORITY_ESCALATION", label + "." + key + " 必须为 false。");
    }
  }
}

function verifyDomainManifest(manifest, descriptor) {
  if (manifest.systemId !== "western"
    || manifest.releaseStatus !== descriptor.status
    || manifest.manifestDigest !== descriptor.semanticDigest
    || manifest.releaseGovernance?.targetSchema !== null
    || manifest.releaseGovernance?.migrationId !== null
    || manifest.gateState?.bindingRequired !== 28
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.gateState?.sourceBundleComplete !== false
    || manifest.gateState?.rightsBundleComplete !== false
    || manifest.gateState?.expertReviewBundleComplete !== false
    || manifest.gateState?.highRiskPolicyBound !== false
    || manifest.gateState?.releaseEvidenceComplete !== false) {
    fail("DOMAIN_MANIFEST_PROJECTION_MISMATCH", "西洋独立 domain manifest 的全红投影漂移。");
  }
  assertExactFalseObject(
    manifest.releaseGovernance,
    ["publicDeploymentAuthorized", "expertClaimsAuthorized"],
    "domainManifest.releaseGovernance"
  );
}

function verifySourceRequirements(ledger, descriptor) {
  if (ledger.productSystemId !== "western-astrology"
    || ledger.contractSystemId !== "western"
    || ledger.status !== descriptor.status
    || ledger.ledgerDigest !== descriptor.semanticDigest
    || !Array.isArray(ledger.subjects)
    || ledger.subjects.length !== 28
    || ledger.gateSummary?.bindingRequired !== 28
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.sourceCandidatesAttached !== 0
    || ledger.gateSummary?.sourceBodiesBound !== 0
    || ledger.gateSummary?.exactQuotesBound !== 0
    || ledger.gateSummary?.exactLocatorsEstablished !== 0
    || ledger.gateSummary?.workRightsEstablished !== 0
    || ledger.gateSummary?.editionRightsEstablished !== 0
    || ledger.gateSummary?.carrierRightsEstablished !== 0
    || ledger.gateSummary?.expertReviewedSubjects !== 0
    || ledger.gateSummary?.sourceBundleComplete !== false
    || ledger.gateSummary?.rightsBundleComplete !== false
    || ledger.gateSummary?.expertReviewBundleComplete !== false
    || ledger.gateSummary?.releaseReady !== false) {
    fail("SOURCE_REQUIREMENTS_PROJECTION_MISMATCH", "西洋 28 条来源要求账的零实例投影漂移。");
  }
  for (const subject of ledger.subjects) {
    if (subject.bindingState !== "required_unbound"
      || !Array.isArray(subject.sourceCandidateIds)
      || subject.sourceCandidateIds.length !== 0
      || subject.frozenBindingId !== null
      || subject.sourceBodyDigest !== null
      || subject.exactQuoteStored !== false
      || subject.exactLocatorEstablished !== false
      || subject.workRightsEstablished !== false
      || subject.editionRightsEstablished !== false
      || subject.carrierRightsEstablished !== false
      || subject.rightsLegalConclusion !== "not_established"
      || !Array.isArray(subject.expertReviewIds)
      || subject.expertReviewIds.length !== 0) {
      fail("SOURCE_SUBJECT_ESCALATION", "西洋来源要求 subject 不再保持 required_unbound 全红状态。");
    }
  }
}

async function verifyNoticeChild(workspaceRoot, notice, descriptor) {
  if (notice.evidenceDigest !== descriptor.semanticDigest
    || notice.status !== descriptor.status
    || notice.systemIdentity?.productSystemId !== "western-astrology"
    || notice.coverageBoundary?.westernRightsSubjectFullySatisfied !== false
    || notice.parentBindingBoundary?.bindsWesternManifest !== false
    || notice.parentBindingBoundary?.bindsWesternRequirements !== false
    || notice.parentBindingBoundary?.bindsFourSystemRegistry !== false
    || notice.parentBindingBoundary?.bindsCrossSystemReceipts !== false
    || notice.parentBindingBoundary?.bindsDefaultWeb !== false) {
    fail("NOTICE_CHILD_PROJECTION_MISMATCH", "Astronomy Engine notice child 的单向边界漂移。");
  }
  assertExactFalseObject(
    notice.authorityBoundary,
    [
      "publisherAuthenticityEstablished",
      "licenseReviewComplete",
      "rightsLegalConclusionEstablished",
      "redistributionAuthorized",
      "noticeObligationSatisfied",
      "formalAdmissionAuthorized",
      "domainAuthorityAuthorized",
      "expertClaimsAuthorized",
      "releaseReady",
      "publicDeploymentAuthorized",
      "baziAuthorityInherited"
    ],
    "notice.authorityBoundary"
  );
  if (!Array.isArray(notice.basisArtifacts) || notice.basisArtifacts.length !== 9) {
    fail("NOTICE_BASIS_INVALID", "Astronomy Engine notice child 必须继续绑定 9 个 basis artifacts。");
  }
  for (const artifact of notice.basisArtifacts) {
    await captureBoundArtifact(workspaceRoot, artifact);
  }
}

function verifyPrivatePackageBoundary(packageJson, expectedName, expectedRuntime) {
  if (packageJson.name !== expectedName
    || packageJson.private !== true
    || packageJson.exports === null
    || typeof packageJson.exports !== "object"
    || Array.isArray(packageJson.exports)
    || Object.keys(packageJson.exports).length !== 0
    || packageJson["x-hakimi-isolated-draft"]?.productionImport !== "forbidden"
    || (expectedRuntime !== undefined
      && packageJson["x-hakimi-isolated-draft"]?.runtime !== expectedRuntime)) {
    fail("PACKAGE_BOUNDARY_MISMATCH", expectedName + " 不再保持 private/export-closed/production-forbidden。");
  }
}

function requireSourceNeedles(bytes, needles, label) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      fail("SOURCE_SEMANTIC_MARKER_MISSING", label + " 缺少固定失败关闭标记：" + needle);
    }
  }
}

async function assertPathAbsent(workspaceRoot, relativePath) {
  const absolute = safeWorkspacePath(workspaceRoot, relativePath);
  try {
    await lstat(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  fail("OFFICIAL_HORIZONS_CANDIDATE_PRESENT", relativePath + " 已出现，零候选观察必须重新评审。");
}

function verifyCentralRegistry(registry, candidate) {
  if (registry.releaseGovernance?.activeLine !== "legacy-v13"
    || registry.releaseGovernance?.targetSchema !== 13
    || registry.releaseGovernance?.migrationId !== null
    || registry.releaseGovernance?.publicDeploymentAuthorized !== false
    || registry.releaseGovernance?.expertClaimsAuthorized !== false) {
    fail("CENTRAL_REGISTRY_GOVERNANCE_MISMATCH", "中央 registry 的默认治理边界漂移。");
  }
  const western = registry.systems?.find((system) => system.productSystemId === "western-astrology");
  if (!western
    || western.productStatus !== "isolated_engineering_draft"
    || western.authorityBoundary?.formalAdmissionAuthorized !== false
    || western.authorityBoundary?.domainAuthorityAuthorized !== false
    || western.authorityBoundary?.expertClaimsAuthorized !== false
    || western.authorityBoundary?.publicDeploymentAuthorized !== false
    || !Array.isArray(western.artifacts)
    || western.artifacts.length !== 6) {
    fail("CENTRAL_REGISTRY_WESTERN_PROJECTION_MISMATCH", "中央 registry 的西洋全红投影漂移。");
  }
  const comparisons = candidate.centralRegistryStaleness.currentWesternArtifactComparisons;
  let matches = 0;
  let mismatches = 0;
  for (const comparison of comparisons) {
    const registered = western.artifacts.find((artifact) => artifact.role === comparison.role);
    if (!registered
      || registered.path !== comparison.path
      || registered.bytes !== comparison.registryBytes
      || registered.sha256 !== comparison.registrySha256) {
      fail("CENTRAL_REGISTRY_STORED_IDENTITY_MISMATCH", comparison.role + " 的登记身份漂移。");
    }
    const actualMatch = comparison.registryBytes === comparison.currentBytes
      && comparison.registrySha256 === comparison.currentSha256;
    if (actualMatch !== comparison.matchesCurrent) {
      fail("CENTRAL_REGISTRY_COMPARISON_INVALID", comparison.role + " 的 stale 比较不自洽。");
    }
    if (actualMatch) matches += 1;
    else mismatches += 1;
  }
  if (matches !== 3 || mismatches !== 3
    || candidate.centralRegistryStaleness.staleForWestern !== true
    || candidate.centralRegistryStaleness.centralRegistryCurrentForWestern !== false
    || candidate.centralRegistryStaleness.centralRegistryUsableForWesternAdmission !== false
    || candidate.centralRegistryStaleness.formalPromotionBlocked !== true) {
    fail("CENTRAL_REGISTRY_STALE_GATE_MISMATCH", "中央 registry 必须继续因 3 项西洋身份漂移失败关闭。");
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      fail("RESULT_FREEZE_INVALID", "结果包含 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

export async function loadWesternProductizationVersionAwareObservationCandidate(
  workspaceRoot = process.cwd()
) {
  const candidateBytes = await captureWorkspaceFile(
    workspaceRoot,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  );
  const parsed = parseWesternProductizationVersionAwareObservationCandidateJsonBytes(candidateBytes);
  if (canonicalPrettyStringifyWesternProductizationVersionAwareObservationCandidate(parsed)
    !== new TextDecoder("utf-8", { fatal: true }).decode(candidateBytes)) {
    fail("CANDIDATE_NOT_CANONICAL", "观察候选必须是唯一 canonical pretty JSON 与 LF 终止。");
  }
  const candidate = verifyWesternProductizationVersionAwareObservationCandidate(parsed);

  const contextBytes = new Map();
  for (const context of candidate.currentContexts.contexts) {
    const bytes = await captureBoundArtifact(workspaceRoot, context);
    contextBytes.set(context.contextId, bytes);
    const parsedContext = parseJsonContext(bytes, context.path);
    if (parsedContext[context.semanticDigestField] !== context.semanticDigest) {
      fail("CONTEXT_SEMANTIC_DIGEST_MISMATCH", context.path + " 的 semantic digest 漂移。");
    }
    if (context.contextId === "western_independent_domain_manifest_v0_1") {
      verifyDomainManifest(parsedContext, context);
    } else if (context.contextId === "western_source_binding_requirements_v1") {
      verifySourceRequirements(parsedContext, context);
    } else if (context.contextId === "western_astronomy_engine_notice_child_v1") {
      await verifyNoticeChild(workspaceRoot, parsedContext, context);
    }
  }

  const artifacts = new Map();
  for (const artifact of candidate.implementationObservation.artifactInventory) {
    artifacts.set(artifact.role, await captureBoundArtifact(workspaceRoot, artifact));
  }

  verifyPrivatePackageBoundary(
    parseJsonContext(artifacts.get("civil_time_adapter_package_boundary"), "civil time package"),
    "@hakimi/western-civil-time-input-adapter-draft",
    "node-test-only"
  );
  verifyPrivatePackageBoundary(
    parseJsonContext(artifacts.get("astronomy_engine_adapter_package_boundary"), "astronomy package"),
    "@hakimi/western-astronomy-engine-adapter-draft"
  );
  verifyPrivatePackageBoundary(
    parseJsonContext(artifacts.get("rules_preview_package_boundary"), "rules preview package"),
    "@hakimi/western-astrology-rules-preview-draft"
  );

  requireSourceNeedles(
    artifacts.get("civil_time_adapter_implementation"),
    [
      "formalInputContractAdmitted: false",
      "timeScaleProvenanceEstablished: false",
      "highRiskClaimsAuthorized: false",
      "safeToPersist: false",
      "safeToPublish: false",
      "mutationEpochAvailable: false"
    ],
    "civil-time adapter"
  );
  requireSourceNeedles(
    artifacts.get("tzdb_descriptor_registry_source"),
    candidate.implementationObservation.tzdbDescriptors.flatMap((descriptor) => [
      "iana-tzdb@" + descriptor.ianaVersion + "/sha256:" + descriptor.dataSha256,
      "/hakimi-tzdb-core@" + descriptor.resolverVersion +
        "/moment-timezone@" + descriptor.adapterVersion,
      'ianaVersion: "' + descriptor.ianaVersion + '"',
      'dataSha256: "' + descriptor.dataSha256 + '"'
    ]),
    "tzdb descriptor registry"
  );
  requireSourceNeedles(
    artifacts.get("strict_calculation_receipt_fail_closed_gate"),
    [
      "issued: false",
      'reason: "REVIEW_UNBOUND"',
      "Deliberately unreachable"
    ],
    "strict calculation receipt"
  );
  requireSourceNeedles(
    artifacts.get("rules_preview_content_layer"),
    [
      "expertTruthClaimed: false",
      "scientificValidityClaimed: false",
      "medicalOrFinancialAdviceGenerated: false"
    ],
    "rules preview content layer"
  );
  for (const role of ["rules_preview_base_review_contract", "rules_preview_dynamic_review_contract"]) {
    requireSourceNeedles(
      artifacts.get(role),
      [
        "identityVerified: false",
        "digitalSignatureVerified: false",
        "scientificValidityEstablished: false",
        "formalActivationAllowed: false",
        "autoIntegrationAllowed: false"
      ],
      role
    );
  }

  for (const absentPath of candidate.implementationObservation.astronomyAndStrictReceipt
    .officialHorizonsCandidatePathsExpectedAbsent) {
    await assertPathAbsent(workspaceRoot, absentPath);
  }

  const registryBytes = await captureBoundArtifact(
    workspaceRoot,
    candidate.centralRegistryStaleness.centralRegistry
  );
  const registry = parseJsonContext(registryBytes, "four-system admission registry");
  verifyCentralRegistry(registry, candidate);
  for (const comparison of candidate.centralRegistryStaleness.currentWesternArtifactComparisons) {
    await captureBoundArtifact(workspaceRoot, {
      path: comparison.path,
      bytes: comparison.currentBytes,
      sha256: comparison.currentSha256
    });
  }

  const backlinkNeedles = [
    candidate.candidateId,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  ];
  for (const bytes of [...contextBytes.values(), registryBytes]) {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    for (const needle of backlinkNeedles) {
      if (text.includes(needle)) {
        fail("UPSTREAM_BACKLINK_FORBIDDEN", "既有 parent/registry 不得反绑本 observation child。");
      }
    }
  }

  const result = deepFreeze({
    ok: true,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    currentContextCount: candidate.currentContexts.contextCount,
    implementationArtifactCount: candidate.implementationObservation.artifactCount,
    centralRegistryStaleForWestern: true,
    matchingWesternRegistryArtifacts: 3,
    mismatchingWesternRegistryArtifacts: 3,
    bindingRequired: 28,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    activeAdmissionEffect: "none",
    formalAdmissionAuthorized: false,
    rightsLegalConclusionEstablished: false,
    expertClaimsAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternProductizationVersionAwareObservationResult(value) {
  return value !== null
    && typeof value === "object"
    && VERIFIED_RESULTS.has(value)
    && Object.isFrozen(value);
}

export const testOnly = Object.freeze({
  CURRENT_CONTEXTS,
  IMPLEMENTATION_ARTIFACTS,
  CENTRAL_REGISTRY,
  WESTERN_REGISTRY_COMPARISONS,
  HORIZONS_ABSENT_PATHS,
  DIGEST_DOMAIN
});
