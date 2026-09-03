import { createHash } from "node:crypto";

import {
  isVerifiedBaziExpertAuthorityMaterialPrecheck,
  loadBaziExpertAuthorityMaterialPrecheck
} from "./bazi-expert-authority-material-precheck-lib.mjs";
import {
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate,
  loadBaziExpertReviewIntakeGapVersionAwareCandidate
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_JOIN = Array.prototype.join;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_STRING = String;
const STRING_REPEAT = String.prototype.repeat;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export const BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_RELATIVE_PATH =
  "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json";

const LEDGER_ID = "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0";
const DIGEST_DOMAIN = "hakimi.bazi.expert-privacy-formal-intake-reconciliation.v1";
const PRECHECK = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-authority-material-precheck.v1.json",
  rawBytes: 12974,
  rawSha256: "ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af",
  ledgerId: "hakimi.bazi.expert-authority-material-precheck/1.0.0",
  ledgerDigest: "0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80"
});
const INTAKE = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
  rawBytes: 32579,
  rawSha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  ledgerId: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
  ledgerDigest: "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({ rawBytes: 10260, rawSha256: "f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17", ledgerDigest: "cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2" });
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziExpertPrivacyFormalIntakeReconciliationError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "BaziExpertPrivacyFormalIntakeReconciliationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziExpertPrivacyFormalIntakeReconciliationError(code, message);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  function visit(current) {
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current]) || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_VALUE", "非有限数值与 -0 不可进入 canonical JSON。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (current === null || typeof current !== "object") {
      fail("NON_JSON_VALUE", "只接受 JSON 原语、普通对象和数组。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) fail("NON_TREE_JSON", "canonical JSON 不接受循环或对象别名。");
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (keys.length !== current.length + 1 || keys[keys.length - 1] !== "length") {
        fail("NON_JSON_ARRAY_SHAPE", "数组必须稠密且无额外属性或 symbol。");
      }
      const values = [];
      for (let index = 0; index < current.length; index += 1) {
        const indexKey = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
        const descriptor = descriptors[indexKey];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"]) || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_OBJECT", "数组不得含空洞或 accessor。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [values, indexKey, {
          value: visit(descriptor.value), writable: true, enumerable: true, configurable: true
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
      const descriptor = descriptors[key];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"]) || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_OBJECT", "canonical JSON 不接受 accessor 或不可枚举字段。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [fields, REFLECT_APPLY(NATIVE_STRING, undefined, [index]), {
        value: `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptor.value)}`,
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

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function prettyStringifyPassive(value) {
  function indent(depth) {
    return REFLECT_APPLY(STRING_REPEAT, "  ", [depth]);
  }
  function visit(current, depth) {
    if (current === null || typeof current === "boolean" || typeof current === "string" || typeof current === "number") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (current.length === 0) return "[]";
      const lines = [];
      for (let index = 0; index < current.length; index += 1) {
        const indexKey = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
        const descriptor = descriptors[indexKey];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_PASSIVE_OBJECT", "pretty JSON 数组不得含空洞或 accessor。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, indexKey, {
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
        fail("NON_PASSIVE_OBJECT", "pretty JSON 对象必须为被动字符串字段。");
      }
      const indexKey = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, indexKey, {
        value: `${indent(depth + 1)}${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}: ${visit(descriptor.value, depth + 1)}`,
        writable: true, enumerable: true, configurable: true
      }]);
    }
    return `{\n${REFLECT_APPLY(ARRAY_JOIN, lines, [",\n"])}\n${indent(depth)}}`;
  }
  return visit(value, 0);
}

function serialize(value) {
  return `${prettyStringifyPassive(canonicalValue(value))}\n`;
}

function digest(domain, value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value)]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function equal(actual, expected, label) {
  if (actual !== expected) fail("PARENT_BOUNDARY_MISMATCH", `${label} 漂移。`);
}

function assertVerifiedParents(precheck, intake) {
  if (!isVerifiedBaziExpertAuthorityMaterialPrecheck(precheck)) {
    fail("PRECHECK_BRAND_REQUIRED", "必须消费 authority precheck loader 的原始 WeakSet 品牌。");
  }
  if (!isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(intake)) {
    fail("INTAKE_BRAND_REQUIRED", "必须消费 expert intake v1.1 loader 的原始 WeakSet 品牌。");
  }
  equal(precheck.ledgerId, PRECHECK.ledgerId, "precheck ledger id");
  equal(precheck.ledgerDigest, PRECHECK.ledgerDigest, "precheck ledger digest");
  equal(precheck.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT", "formal first failure");
  equal(precheck.authorityMaterialContractStructurallyPrechecked, true, "precheck structural flag");
  equal(precheck.realReviewerInstances, 0, "precheck reviewer instances");
  equal(precheck.verifierAuthorityGrantInstances, 0, "precheck verifier grants");
  equal(precheck.countsTowardExpertGate, false, "precheck expert gate");
  equal(precheck.expertTruthEstablished, false, "precheck expert truth");
  equal(precheck.releaseReady, false, "precheck release");
  equal(precheck.publicDeploymentAuthorized, false, "precheck public deployment");
  equal(precheck.expertClaimsAuthorized, false, "precheck expert claims");

  equal(intake.ledgerId, INTAKE.ledgerId, "intake ledger id");
  equal(intake.ledgerDigest, INTAKE.ledgerDigest, "intake ledger digest");
  equal(intake.artifact?.path, INTAKE.path, "intake artifact path");
  equal(intake.artifact?.bytes, INTAKE.rawBytes, "intake raw bytes");
  equal(intake.artifact?.sha256, INTAKE.rawSha256, "intake raw sha256");
  equal(intake.domainExpertsRequired, 2, "intake expert requirement");
  equal(intake.reviewerSlotsOccupied, 0, "intake reviewer occupancy");
  equal(intake.currentRecordInstances, 0, "intake record instances");
  equal(intake.sealedOriginalOpinions, 0, "intake sealed opinions");
  equal(intake.candidateProjectedArtifactLockExactMatches, 11, "intake exact locks");
  equal(intake.candidateProjectedArtifactLockDrifts, 1, "intake drift locks");
  equal(intake.packetArtifactLocksCurrent, false, "intake packet locks current");
  equal(intake.bindingRequired, 12, "intake binding required");
  equal(intake.bindingFrozenVerified, 0, "intake binding frozen");
  const expectedIntakeGates = {
    candidateFeedbackCollectionReady: false,
    countsTowardExpertGate: false,
    expertReviewBundleComplete: false,
    formalAdmissionPromotionBlocked: true,
    formalActivationAllowed: false,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  };
  const gateKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [expectedIntakeGates]);
  const gateDescriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [expectedIntakeGates]);
  for (let index = 0; index < gateKeys.length; index += 1) {
    const key = gateKeys[index];
    equal(intake[key], gateDescriptors[key].value, `intake ${key}`);
  }
  equal(intake.mutationEpochReceipt, null, "intake mutation epoch receipt");
  equal(intake.activeAdmissionEffect, "none", "intake admission effect");
}

const PUBLIC_IDENTITY_FIELD_DISPOSITIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({ field: "reviewerId", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_real_person_identifier_use_fixed_reviewerSeatId_only" }),
  OBJECT_FREEZE({ field: "displayNameOrControlledPseudonym", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden" }),
  OBJECT_FREEZE({ field: "verificationMethod", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_free_text_use_controlled_verificationMethodCode_vocabulary_only" }),
  OBJECT_FREEZE({ field: "credentialDigest", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_as_persisted_person_binding_use_private_runtime_opaqueCredentialEvidenceRef_only" }),
  OBJECT_FREEZE({ field: "verificationDate", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_use_opaqueFirstSeenReceiptRef_only" }),
  OBJECT_FREEZE({ field: "reviewScope", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_free_text_use_fixed_reviewQuestionIds_only" }),
  OBJECT_FREEZE({ field: "evidenceType", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden_free_text_use_controlled_evidenceCategoryCode_vocabulary_only" }),
  OBJECT_FREEZE({ field: "verifiedBy", disposition: "historical_template_only_not_collection_or_persistence_authority", currentRule: "forbidden" })
]);

const OPAQUE_VOCABULARY = OBJECT_FREEZE([
  "reviewerSeatId",
  "opaqueReviewerContextRef",
  "opaqueIdentityDossierRef",
  "opaqueCredentialEvidenceRef",
  "opaqueScopeEvidenceRef",
  "opaqueVerifierAuthorityGrantRef",
  "opaquePairwiseIndependenceRef",
  "opaqueFirstSeenReceiptRef",
  "opaqueCustodyReceiptRef",
  "opaqueRetrievalRef",
  "privateArtifactSha256",
  "privateArtifactByteLength",
  "redactedPublicBindingRef",
  "verificationMethodCode",
  "evidenceCategoryCode"
]);

function buildLedger(precheck, intake) {
  assertVerifiedParents(precheck, intake);
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_privacy_formal_intake_reconciliation_v1",
    ledgerId: LEDGER_ID,
    status: "candidate_only_zero_instance_opaque_privacy_formal_intake_reconciliation_no_admission_effect",
    createdAt: "2026-08-31T00:00:00.000Z",
    parentCapabilities: {
      verifiedPrivateBrandCount: 2,
      onlyVerifiedParentBrands: [
        "isVerifiedBaziExpertAuthorityMaterialPrecheck",
        "isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate"
      ],
      authorityPrecheck: { ...PRECHECK, privateWeakSetBrandVerified: true },
      versionAwareIntake: { ...INTAKE, privateWeakSetBrandVerified: true },
      formalPacketDirectParent: false,
      formalPacketVerifierImportedOrInvoked: false,
      manifestObserverDependency: false,
      reviewCycleKernelDependency: false,
      historicalParentsMutated: false,
      parentBacklinkAdded: false
    },
    historicalPublicIdentityTemplate: {
      source: "verified_intake_parent_historical_packet_template_projection",
      role: "historical_template_only_not_collection_or_persistence_authority",
      fieldCount: 8,
      fields: PUBLIC_IDENTITY_FIELD_DISPOSITIONS,
      displayNameOrControlledPseudonymForbidden: true,
      verifiedByForbidden: true,
      historicalTemplateActivatesCollection: false,
      historicalTemplateAuthorizesPersistence: false
    },
    candidateOnlyOpaqueSchema: {
      role: "non_executable_future_private_runtime_vocabulary_only",
      opaqueFieldVocabulary: OPAQUE_VOCABULARY,
      reviewerSeatIds: ["domain-expert-a", "domain-expert-b"],
      reviewQuestionIds: [
        "month-command-hidden-stem-duplication",
        "relative-factor-weighting",
        "strength-band-thresholds",
        "strength-invalidation-structures"
      ],
      currentInstances: [],
      currentInstanceCount: 0,
      executableCollectionApiDefined: false,
      collectionAuthorized: false,
      persistedRealPersonInstancesAllowed: false,
      privateRuntimeEndpointInvoked: false,
      opaqueVocabularyEstablishesIdentityAuthorityOrConsent: false,
      forbiddenRepositoryMaterial: [
        "legal_or_display_name",
        "email_phone_address_government_id_or_contact_handle",
        "raw_credential_private_dossier_or_original_opinion",
        "exact_quote_screenshot_url_or_auth_path",
        "operator_or_generated_biography_or_profile"
      ]
    },
    privacyBoundary: {
      actualOpaqueReviewerContextsVerified: 0,
      actualPrivateDossierArtifactsVerified: 0,
      actualPrivateOpinionFilesVerified: 0,
      identityEstablished: false,
      participationOrConsentVerified: false,
      artifactEncryptionVerified: false,
      encryptedStorageVerified: false,
      requiredDossierFieldsVerified: false,
      immutableFirstSeenVerified: false,
      custodyVerified: false,
      authenticityEstablished: false,
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      safeToPublish: false,
      errorOrCliMayEchoSensitiveValues: false
    },
    formalIntakeDriftBoundary: {
      firstFailureCode: "INTAKE_GAP_BINDING_DRIFT",
      formalPacketVerifierPasses: false,
      formalPacketVerifierInvokedByThisCandidate: false,
      historicalFailureResolvedByThisCandidate: false,
      historicalPacketArtifactLockSlots: 12,
      candidateProjectedArtifactLockExactMatches: 11,
      candidateProjectedArtifactLockDrifts: 1,
      packetArtifactLocksCurrent: false,
      driftObservationSource: "verified_version_aware_intake_parent",
      driftedArtifact: {
        artifactId: "bazi-core-fact-engine",
        path: "packages/bazi-core/src/index.ts",
        lockedSha256: "73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f",
        observedBytes: 46847,
        observedSha256: "4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f"
      },
      childMayRepairRefreshOrResignHistoricalPacket: false
    },
    zeroInstanceGate: {
      domainExpertsRequired: 2,
      reviewerSlotsOccupied: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      verifierAuthorityGrantInstances: 0,
      pairwiseIndependenceMaterials: 0,
      independentExpertReviewsVerified: 0,
      currentFormalIntakeRecordInstances: 0,
      originalOpinionInstances: 0,
      sealedOriginalOpinions: 0,
      expertReviewBundles: 0,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      expertReviewBundleComplete: false,
      countsTowardExpertGate: false,
      formalAdmissionPromotionBlocked: true
    },
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundary: "preserved",
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visibleLoaderGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    integrityBoundary: {
      parentRawAndSemanticIdentityVerifiedByBrandedLoaders: true,
      persistedChildStableHeldHandleReadRequired: true,
      persistedChildMustEqualMechanicallyRebuiltExpected: true,
      duplicateJsonKeysRejected: true,
      strictUtf8Required: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      replayExcludedAcrossParentLoads: false,
      ledgerDigestIsDigitalSignature: false,
      digestDomain: DIGEST_DOMAIN
    },
    authorityBoundary: {
      collectionAuthorized: false,
      privateDossierRetrievalAuthorized: false,
      formalActivationAllowed: false,
      identityAuthorityEstablished: false,
      credentialAuthorityEstablished: false,
      verifierAuthorityEstablished: false,
      reviewerIndependenceEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicReleaseAuthorized: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "collection_or_persistence_authority",
      "real_reviewer_identity_credentials_scope_consent_or_independence",
      "private_dossier_encryption_storage_custody_authenticity_or_first_seen",
      "formal_packet_repair_refresh_resign_or_activation",
      "source_or_rights_closure_binding_freeze_or_expert_gate_closure",
      "content_expert_or_legal_truth",
      "cross_file_atomic_snapshot_epoch_interval_aba_or_replay_exclusion",
      "trusted_runtime_loader_launcher_identity_or_hidden_preload_exclusion",
      "release_readiness_public_release_or_expert_claims"
    ]
  };
  return deepFreeze({ ...unsigned, ledgerDigest: computeBaziExpertPrivacyFormalIntakeReconciliationDigest(unsigned) });
}

export function computeBaziExpertPrivacyFormalIntakeReconciliationDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return digest(DIGEST_DOMAIN, unsigned);
}

async function loadExpectedBundle(workspaceRoot) {
  const precheck = await loadBaziExpertAuthorityMaterialPrecheck(workspaceRoot);
  const intake = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const ledger = buildLedger(precheck, intake);
  return OBJECT_FREEZE({ ledger, bytes: REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(ledger), "utf8"]) });
}

function assertPersistedSemantic(persisted, expected) {
  equal(persisted.ledgerId, LEDGER_ID, "persisted ledger id");
  if (persisted.ledgerDigest !== computeBaziExpertPrivacyFormalIntakeReconciliationDigest(persisted)) {
    fail("LEDGER_DIGEST_MISMATCH", "persisted reconciliation 自摘要不匹配。");
  }
  if (!exactJson(persisted, expected)) {
    fail("EXPECTED_PROJECTION_MISMATCH", "persisted reconciliation 不等于双品牌机械投影。");
  }
}

function assertExpectedRawPins(snapshot, persisted) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || EXPECTED_PERSISTED.rawSha256.length !== 64 || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "reconciliation raw/semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "reconciliation raw identity 漂移。");
  }
  if (persisted.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "reconciliation frozen ledger digest 漂移。");
  }
}

export async function loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])) {
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedSemantic(persisted, expected.ledger);
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    privacyFormalIntakeReconciliationMechanicallyVerified: true,
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    verifiedParentPrivateBrandCount: 2,
    historicalPublicIdentityBindingFieldCount: 8,
    currentOpaqueContextInstances: 0,
    persistedRealPersonInstancesAllowed: false,
    collectionAuthorized: false,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    safeToPublish: false,
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
    domainExpertsRequired: 2,
    reviewerSlotsOccupied: 0,
    currentFormalIntakeRecordInstances: 0,
    sealedOriginalOpinions: 0,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    candidateProjectedArtifactLockExactMatches: 11,
    candidateProjectedArtifactLockDrifts: 1,
    packetArtifactLocksCurrent: false,
    firstFormalParentFailureCode: "INTAKE_GAP_BINDING_DRIFT",
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    activeAdmissionEffect: "none",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(value) {
  return value !== null && typeof value === "object" && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziExpertPrivacyFormalIntakeReconciliationSummary(value) {
  if (!isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受本模块 loader 返回的 WeakSet 品牌对象。");
  }
  return deepFreeze(canonicalValue(value));
}

export const baziExpertPrivacyFormalIntakeReconciliationTestOnly = OBJECT_FREEZE({
  PRECHECK,
  INTAKE,
  EXPECTED_PERSISTED,
  PUBLIC_IDENTITY_FIELD_DISPOSITIONS,
  OPAQUE_VOCABULARY,
  canonicalStringify,
  serialize,
  digest,
  assertVerifiedParents,
  buildLedger,
  loadExpectedBundle,
  assertPersistedSemantic
});
