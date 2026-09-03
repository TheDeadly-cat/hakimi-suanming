import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyVedicTzdb2026cSourceRightsEvidence as canonicalStringify
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";
import {
  isVerifiedVedicSourceBindingRequirementsSuccessorV12,
  loadVedicSourceBindingRequirementsSuccessorV12
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2-lib.mjs";
import {
  isVerifiedVedicTzdbCoreRegistryTarballParityChild,
  loadVedicTzdbCoreRegistryTarballParityChild
} from "./vedic-tzdb-core-registry-tarball-parity-observation-child-lib.mjs";

export const VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_3_RELATIVE_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.3.0.json";

const LEDGER_ID =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.3.0";
const RECORD_TYPE =
  "vedic_source_binding_and_three_layer_rights_requirements_registry_tarball_parity_delta_successor_candidate_v1_3";
const STATUS =
  "v1_2_two_partial_candidates_plus_public_registry_tarball_local_carrier_parity_nonformal_zero_active_effect_zero_of_38_frozen";
const CREATED_AT = "2026-09-01T14:44:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T14:44:30.000Z";
const DIGEST_DOMAIN =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements.successor.v1.3\0";
const TIME_ZONE_SUBJECT_ID = "vedic.input.iana_time_zone_and_tzdb_identity";
const RIGHTS_SUBJECT_ID = "vedic.rule.rights_license_and_redistribution_review";
const TIME_ZONE_CANDIDATE_ID = "vedic-iana-tzdb-2026c-input-source-candidate-v1";
const RIGHTS_CANDIDATE_ID = "vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const REGEXP_TEST = RegExp.prototype.test;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const FORMAL_V1 = OBJECT_FREEZE({
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
  rawBytes: 85_752,
  rawSha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
  ledgerId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0",
  ledgerDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e"
});

const PREDECESSOR_V1_1 = OBJECT_FREEZE({
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json",
  rawBytes: 94_582,
  rawSha256: "9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd",
  ledgerId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.1.0",
  ledgerDigest: "afd65de96a850c1632e8c00b03b6be2ff05a2f8b1dd0a19fbe27d4376ac2bb6b"
});

const PREDECESSOR_V1_2 = OBJECT_FREEZE({
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.2.0.json",
  rawBytes: 15_738,
  rawSha256: "6d3a36f041801e7120a3d270695f94b34242a97fc1559000f8d4d2c0002a3239",
  ledgerId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.2.0",
  ledgerDigest: "0decafbdc8c94dd9ae206fb453a8a64e8132eb02e5b4f50a1eb12797804b8ef2"
});

const PARITY_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/vedic-tzdb-core-registry-tarball-parity-observation-child.v1.json",
  rawBytes: 19_758,
  rawSha256: "8c6cbafa49a2ff4b5c453a7c43fd9474aff338b05b1c0a5b32f303bd0cf5d074",
  childId: "hakimi.vedic.tzdb-core-registry-tarball-parity-observation-child/1.0.0",
  childDigest: "51c4c7ec945050d3bf40b0051d9a3b3237b310a22892f2a57c9399d8d331c86c"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 12_056,
  rawSha256: "52a86e9b6cac141b8914b5462b92e713a5029d82acb7b97d2f2a92621035920a"
});

export class VedicSourceBindingRequirementsSuccessorV13Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicSourceBindingRequirementsSuccessorV13Error";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicSourceBindingRequirementsSuccessorV13Error(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capture(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, null, [canonicalStringify(value)]);
  } catch (cause) {
    if (cause?.code) throw cause;
    fail("INPUT_INVALID", "Vedic v1.3 successor 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_VALUES, Object, [
    REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value])
  ]);
  for (let index = 0; index < descriptors.length; index += 1) {
    if ("value" in descriptors[index]) deepFreeze(descriptors[index].value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function safePrettyValue(value) {
  const snapshot = capture(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [input])) {
      const output = [];
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, "toJSON", { value: null }]);
      for (let index = 0; index < input.length; index += 1) {
        REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      }
      return output;
    }
    const output = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
    const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [input]);
    REFLECT_APPLY(ARRAY_SORT, keys, [(left, right) => left < right ? -1 : left > right ? 1 : 0]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        value: materialize(input[key]), enumerable: true, configurable: true, writable: true
      }]);
    }
    return output;
  }
  return materialize(snapshot);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function publicIdentity(spec) {
  return { path: spec.path, rawBytes: spec.rawBytes, rawSha256: spec.rawSha256 };
}

function assertPredecessor(result) {
  if (!isVerifiedVedicSourceBindingRequirementsSuccessorV12(result)) {
    fail("PREDECESSOR_PRIVATE_BRAND_MISSING", "必须先通过 Vedic v1.2 full loader。" );
  }
  if (result.ledgerId !== PREDECESSOR_V1_2.ledgerId
    || result.ledgerDigest !== PREDECESSOR_V1_2.ledgerDigest
    || result.artifact?.path !== PREDECESSOR_V1_2.path
    || result.artifact?.rawBytes !== PREDECESSOR_V1_2.rawBytes
    || result.artifact?.rawSha256 !== PREDECESSOR_V1_2.rawSha256
    || result.bindingRequired !== 38 || result.bindingFrozenVerified !== 0
    || result.inheritedPartialCandidates !== 2 || result.newCandidateIdsAdded !== 0
    || result.successorIsFormalCurrent !== false || result.successorActiveEffect !== "none"
    || result.rightsLegalConclusionEstablished !== false
    || result.redistributionAuthorized !== false || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail("PREDECESSOR_IDENTITY_DRIFT", "Vedic v1.2 predecessor identity/state 漂移。" );
  }
  return result.ledger;
}

function assertParityChild(result) {
  if (!isVerifiedVedicTzdbCoreRegistryTarballParityChild(result)) {
    fail("PARITY_CHILD_PRIVATE_BRAND_MISSING", "必须先通过 Registry parity child full loader。" );
  }
  if (result.childId !== PARITY_CHILD.childId || result.childDigest !== PARITY_CHILD.childDigest
    || result.artifact?.path !== PARITY_CHILD.path
    || result.artifact?.rawBytes !== PARITY_CHILD.rawBytes
    || result.artifact?.rawSha256 !== PARITY_CHILD.rawSha256
    || result.metadataEndpointsObserved !== 3 || result.tarballEndpointsObserved !== 3
    || result.selectedEntryByteParitiesObserved !== 8
    || result.bindingRequired !== 38 || result.bindingFrozenVerified !== 0
    || result.inheritedPartialCandidates !== 2
    || result.rightsLegalConclusionEstablished !== false
    || result.redistributionAuthorized !== false) {
    fail("PARITY_CHILD_IDENTITY_DRIFT", "Registry parity child identity/state 漂移。" );
  }
  return result.child;
}

function parityBindings(child) {
  return [
    {
      subjectId: TIME_ZONE_SUBJECT_ID,
      existingCandidateId: TIME_ZONE_CANDIDATE_ID,
      evidenceArtifact: {
        ...publicIdentity(PARITY_CHILD),
        childId: PARITY_CHILD.childId,
        childDigest: PARITY_CHILD.childDigest
      },
      evidenceScope: "public_registry_tarball_package_manifest_and_2026c_2025b_packed_local_byte_parity_only",
      observedPackageKeys: child.packageParityObservations.map((entry) => entry.observationKey),
      supplementsExistingCandidate: true,
      replacesPredecessorEvidence: false,
      bindingState: "candidate_only_unbound",
      sourceBodyBound: false,
      formalExactQuoteBound: false,
      formalExactLocatorEstablished: false,
      contentTruthEstablished: false,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false
    },
    {
      subjectId: RIGHTS_SUBJECT_ID,
      existingCandidateId: RIGHTS_CANDIDATE_ID,
      evidenceArtifact: {
        ...publicIdentity(PARITY_CHILD),
        childId: PARITY_CHILD.childId,
        childDigest: PARITY_CHILD.childDigest
      },
      evidenceScope: "public_registry_tarball_package_manifest_license_and_packed_local_byte_parity_only",
      observedPackageKeys: child.packageParityObservations.map((entry) => entry.observationKey),
      supplementsExistingCandidate: true,
      replacesPredecessorEvidence: false,
      bindingState: "candidate_only_unbound",
      publisherIdentityVerified: false,
      packageSignatureVerified: false,
      packageAuthenticityEstablished: false,
      licenseAuthenticityEstablished: false,
      licenseApplicabilityEstablished: false,
      workRightsEstablished: false,
      versionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false
    }
  ];
}

export function computeVedicSourceBindingRequirementsSuccessorV13Digest(ledger) {
  const unsigned = capture(ledger);
  delete unsigned.ledgerDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function buildExpectedVedicSourceBindingRequirementsSuccessorV13(
  predecessorResult,
  parityChildResult
) {
  const predecessor = assertPredecessor(predecessorResult);
  const parityChild = assertParityChild(parityChildResult);
  if (predecessor.candidateCarrierEvidenceBindings?.length !== 2
    || predecessor.gateSummary?.inheritedPartialCandidates !== 2
    || predecessor.gateSummary?.newCandidateIdsAdded !== 0) {
    fail("PREDECESSOR_CANDIDATE_STATE_DRIFT", "v1.2 必须保持两项 inherited partial 且无新 candidate。" );
  }
  const unsigned = {
    schemaVersion: "1.3.0",
    recordType: RECORD_TYPE,
    artifactRole: "append_only_nonformal_registry_tarball_parity_delta_successor_candidate",
    ledgerId: LEDGER_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    lineage: {
      formalV1: {
        ...publicIdentity(FORMAL_V1),
        ledgerId: FORMAL_V1.ledgerId,
        ledgerDigest: FORMAL_V1.ledgerDigest,
        remainsFormalCurrent: true
      },
      predecessorV11: {
        ...publicIdentity(PREDECESSOR_V1_1),
        ledgerId: PREDECESSOR_V1_1.ledgerId,
        ledgerDigest: PREDECESSOR_V1_1.ledgerDigest,
        remainsNonformal: true,
        activeEffect: "none"
      },
      predecessorV12: {
        ...publicIdentity(PREDECESSOR_V1_2),
        ledgerId: PREDECESSOR_V1_2.ledgerId,
        ledgerDigest: PREDECESSOR_V1_2.ledgerDigest,
        remainsNonformal: true,
        activeEffect: "none"
      },
      registryTarballParityChild: {
        ...publicIdentity(PARITY_CHILD),
        childId: PARITY_CHILD.childId,
        childDigest: PARITY_CHILD.childDigest,
        relationship: "one_way_point_in_time_carrier_parity_supplement_to_two_existing_candidates"
      },
      formalV1Modified: false,
      predecessorV11Modified: false,
      predecessorV12Modified: false,
      predecessorBacklinkAdded: false
    },
    requirementsUniverse: {
      bindingRequired: 38,
      countsByLayer: { input: 13, fact: 12, rule: 13 },
      requirementsUniverseClosed: false,
      exhaustiveVedicSourceRightsUniverseClaimed: false
    },
    predecessorStateBoundary: {
      inheritedPartialCandidates: 2,
      requiredUnbound: 36,
      frozenBindings: 0,
      subjectFullySatisfied: 0,
      newCandidateIdsAdded: 0,
      verifiedThroughV12FullLoaderPrivateBrand: true,
      predecessorSubjectBodiesCopiedIntoThisDeltaSuccessor: false,
      predecessorCandidateBindingsReplaced: false
    },
    registryTarballParityEvidenceBindings: parityBindings(parityChild),
    sourceRightsBoundary: {
      inheritedCandidateCount: 2,
      newCandidateIdsAdded: 0,
      predecessorCarrierEvidenceChildrenAttached: 1,
      registryTarballParityChildrenAttached: 1,
      totalCarrierEvidenceChildrenAttached: 2,
      publicRegistryTarballToLocalCarrierByteParityObserved: true,
      publisherIdentityVerified: false,
      packageSignatureVerified: false,
      packageAuthenticityEstablished: false,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      bindingFrozenVerified: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false
    },
    formalStateBoundary: {
      formalV1RemainsCurrent: true,
      predecessorV11RemainsNonformal: true,
      predecessorV12RemainsNonformal: true,
      successorIsFormalCurrent: false,
      successorActiveEffect: "none",
      formalParentConsumptionEstablished: false,
      formalRegistryIntegrated: false,
      formalManifestIntegrated: false,
      ownerAdmissionAccepted: false,
      publicReleaseAuthorized: false
    },
    gateSummary: {
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      inheritedPartialCandidates: 2,
      newCandidateIdsAdded: 0,
      registryTarballParityEvidenceBindingsAttached: 2,
      registryTarballParityChildrenAttached: 1,
      carrierEvidenceChildrenTotal: 2,
      metadataEndpointsObserved: 3,
      tarballEndpointsObserved: 3,
      selectedEntryByteParitiesObserved: 8,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      subjectFullySatisfied: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      independentDomainExpertReviewsVerified: 0,
      independentEngineeringReviewsVerified: 0,
      independentRightsReviewsVerified: 0,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    crossSystemIsolationBoundary: {
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      ziweiAuthorityInherited: false,
      sharedCarrierIdentityIsAuthorityInheritance: false
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByVedicProductIdentity: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    observationBoundary: {
      predecessorAndParityChildVerifiedThroughIndependentFullLoaders: true,
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      publicRegistryObservationWasPointInTimeOnly: true,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFilesAndNetwork: false,
      abaExcluded: false
    },
    timeBoundary: {
      createdAtIsUntrustedLocalClockLabel: true,
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityUsed: false,
      clockRollbackExcluded: false
    },
    runtimeTrustBoundary: {
      assumesNoArbitraryPreEvaluationCodeExecution: true,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIdentityEstablished: false,
      selectedLedgerIdentityBindsCliImplementation: false,
      visibleGuardIsSecurityBoundary: false,
      cliOutputTrustedAttestation: false
    },
    authorityBoundary: {
      authenticityEstablished: false,
      contentTruthEstablished: false,
      traditionalAuthorityEstablished: false,
      expertTruthEstablished: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionEstablished: false,
      formalAdmissionAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedgerSeparation: {
      engineeringEvidence: "v1_2_plus_point_in_time_public_registry_tarball_local_carrier_byte_parity_child",
      browserRuntimeEvidence: "not_assessed_by_this_successor",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalJudgment: "not_established",
      releaseReadiness: "not_established",
      publicReleaseAuthorization: "not_authorized"
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestExcludesOwnField: true,
      digestIsDigitalSignature: false,
      authenticityEstablished: false,
      exclusiveCreateWriterRequired: true,
      canonicalPrettyJsonWithLfRequired: true,
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true
    },
    doesNotEstablish: [
      "formal_v1_replacement_or_v1_1_v1_2_promotion",
      "new_source_candidate_frozen_binding_or_subject_satisfaction",
      "source_body_exact_quote_or_exact_locator",
      "npm_publisher_identity_package_signature_first_seen_or_authenticity",
      "license_authenticity_applicability_or_notice_obligation_satisfaction",
      "work_version_carrier_rights_legal_conclusion_or_redistribution",
      "vedic_content_truth_traditional_authority_or_expert_truth",
      "browser_pwa_service_worker_product_runtime_or_release_evidence",
      "formal_parent_registry_manifest_owner_or_public_admission",
      "trusted_time_mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeVedicSourceBindingRequirementsSuccessorV13Digest(unsigned)
  });
}

function assertFailClosed(ledger) {
  const gate = ledger?.gateSummary;
  const rights = ledger?.sourceRightsBoundary;
  const formal = ledger?.formalStateBoundary;
  const authority = ledger?.authorityBoundary;
  const observation = ledger?.observationBoundary;
  const runtime = ledger?.runtimeTrustBoundary;
  if (!gate || gate.bindingRequired !== 38 || gate.bindingFrozenVerified !== 0
    || gate.inheritedPartialCandidates !== 2 || gate.newCandidateIdsAdded !== 0
    || gate.registryTarballParityEvidenceBindingsAttached !== 2
    || gate.registryTarballParityChildrenAttached !== 1
    || gate.carrierEvidenceChildrenTotal !== 2
    || gate.metadataEndpointsObserved !== 3 || gate.tarballEndpointsObserved !== 3
    || gate.selectedEntryByteParitiesObserved !== 8
    || gate.sourceBodiesBound !== 0 || gate.exactQuotesBound !== 0
    || gate.exactLocatorsEstablished !== 0 || gate.subjectFullySatisfied !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentRightsReviewsVerified !== 0
    || gate.releaseEvidenceComplete !== false || gate.releaseReady !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "Vedic v1.3 必须保持两项 partial、0/38、零专家/权利/发布。" );
  }
  if (!rights || rights.publicRegistryTarballToLocalCarrierByteParityObserved !== true
    || rights.publisherIdentityVerified !== false || rights.packageSignatureVerified !== false
    || rights.packageAuthenticityEstablished !== false
    || rights.sourceBodiesBound !== 0 || rights.exactQuotesBound !== 0
    || rights.exactLocatorsEstablished !== 0 || rights.bindingFrozenVerified !== 0
    || rights.workRightsEstablished !== 0 || rights.versionRightsEstablished !== 0
    || rights.carrierRightsEstablished !== 0
    || rights.rightsLegalConclusionEstablished !== false
    || rights.redistributionAuthorized !== false
    || rights.sourceBundleComplete !== false || rights.rightsBundleComplete !== false) {
    fail("RIGHTS_OVERCLAIM_FORBIDDEN", "Registry parity 不得升级为真实性、许可或三层权利结论。" );
  }
  if (!formal || formal.formalV1RemainsCurrent !== true
    || formal.predecessorV11RemainsNonformal !== true
    || formal.predecessorV12RemainsNonformal !== true
    || formal.successorIsFormalCurrent !== false || formal.successorActiveEffect !== "none"
    || formal.formalParentConsumptionEstablished !== false
    || formal.formalRegistryIntegrated !== false || formal.formalManifestIntegrated !== false
    || formal.ownerAdmissionAccepted !== false || formal.publicReleaseAuthorized !== false) {
    fail("FORMAL_PROMOTION_FORBIDDEN", "v1.3 必须保持 nonformal、zero active effect。" );
  }
  const authorityKeys = REFLECT_APPLY(OBJECT_KEYS, Object, [authority ?? {}]);
  if (authorityKeys.length !== 10) fail("AUTHORITY_BOUNDARY_INVALID", "authorityBoundary 字段漂移。" );
  for (let index = 0; index < authorityKeys.length; index += 1) {
    if (authority[authorityKeys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", authorityKeys[index] + " 必须为 false。" );
    }
  }
  if (!observation || observation.crossFileAtomicSnapshotEstablished !== false
    || observation.mutationEpochAvailable !== false || observation.mutationEpochReceipt !== null
    || observation.intervalMutationExcludedAcrossFilesAndNetwork !== false
    || observation.abaExcluded !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "mutation/atomic/interval/ABA 边界必须保持红。" );
  }
  if (!runtime || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.loaderIdentityEstablished !== false || runtime.launcherIdentityEstablished !== false
    || runtime.selectedLedgerIdentityBindsCliImplementation !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.cliOutputTrustedAttestation !== false) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "CLI/runtime trust 边界必须保持红。" );
  }
  if (ledger?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || ledger.projectReleaseGovernanceContext.targetSchema !== 13
    || ledger.projectReleaseGovernanceContext.migrationId !== null
    || ledger.projectReleaseGovernanceContext.inheritedByVedicProductIdentity !== false
    || ledger.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13 !== false
    || ledger.projectReleaseGovernanceContext.mutationEpochReceipt !== null
    || ledger.projectReleaseGovernanceContext.expertClaimsAuthorized !== false
    || ledger.projectReleaseGovernanceContext.publicDeploymentAuthorized !== false) {
    fail("PROJECT_GOVERNANCE_DRIFT", "legacy-v13/13/null 只能是未继承的项目上下文。" );
  }
  if (ledger?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
      !== CREATED_AT_UPPER_BOUND
    || ledger.timeBoundary.trustedTimestampEstablished !== false
    || ledger.timeBoundary.externalTimeAuthorityUsed !== false
    || ledger.timeBoundary.clockRollbackExcluded !== false
    || Date.parse(ledger.createdAt) > Date.parse(CREATED_AT_UPPER_BOUND)) {
    fail("TIME_BOUNDARY_INVALID", "createdAt 只能是不可信本机时钟标签。" );
  }
}

export function verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
  input,
  predecessorResult,
  parityChildResult
) {
  const ledger = capture(input);
  assertPredecessor(predecessorResult);
  assertParityChild(parityChildResult);
  assertFailClosed(ledger);
  if (typeof ledger.ledgerDigest !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [ledger.ledgerDigest])) {
    fail("LEDGER_DIGEST_INVALID", "ledgerDigest 必须是小写 SHA-256。" );
  }
  if (computeVedicSourceBindingRequirementsSuccessorV13Digest(ledger)
      !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "ledgerDigest 不匹配。" );
  }
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV13(
    predecessorResult,
    parityChildResult
  );
  if (!exactJson(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "Vedic v1.3 与固定 v1.2/parity child delta 合同不一致。" );
  }
  return deepFreeze(ledger);
}

export function serializeVedicSourceBindingRequirementsSuccessorV13(
  ledger,
  predecessorResult,
  parityChildResult
) {
  return REFLECT_APPLY(JSON_STRINGIFY, null, [
    safePrettyValue(verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
      ledger,
      predecessorResult,
      parityChildResult
    )),
    null,
    2
  ]) + "\n";
}

export function parseVedicSourceBindingRequirementsSuccessorV13JsonBytes(
  bytes,
  label = VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_3_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

async function loadUpstreams(workspaceRoot) {
  const predecessor = await loadVedicSourceBindingRequirementsSuccessorV12(workspaceRoot);
  assertPredecessor(predecessor);
  const parityChild = await loadVedicTzdbCoreRegistryTarballParityChild(workspaceRoot);
  assertParityChild(parityChild);
  return { predecessor, parityChild };
}

export async function buildCurrentVedicSourceBindingRequirementsSuccessorV13(
  workspaceRoot = process.cwd()
) {
  const upstreams = await loadUpstreams(workspaceRoot);
  return buildExpectedVedicSourceBindingRequirementsSuccessorV13(
    upstreams.predecessor,
    upstreams.parityChild
  );
}

export async function loadVedicSourceBindingRequirementsSuccessorV13(
  workspaceRoot = process.cwd()
) {
  const upstreams = await loadUpstreams(workspaceRoot);
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV13(
    upstreams.predecessor,
    upstreams.parityChild
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_3_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "Vedic v1.3 successor raw identity 漂移。" );
  }
  const parsed = parseVedicSourceBindingRequirementsSuccessorV13JsonBytes(
    snapshot.bytes,
    snapshot.path
  );
  const ledger = verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
    parsed,
    upstreams.predecessor,
    upstreams.parityChild
  );
  const canonical = serializeVedicSourceBindingRequirementsSuccessorV13(
    ledger,
    upstreams.predecessor,
    upstreams.parityChild
  );
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (decoded !== canonical) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "Vedic v1.3 必须保持唯一 pretty JSON 与 LF 终止。" );
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    formalV1RemainsCurrent: ledger.formalStateBoundary.formalV1RemainsCurrent,
    predecessorV11RemainsNonformal: ledger.formalStateBoundary.predecessorV11RemainsNonformal,
    predecessorV12RemainsNonformal: ledger.formalStateBoundary.predecessorV12RemainsNonformal,
    successorIsFormalCurrent: ledger.formalStateBoundary.successorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.successorActiveEffect,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    inheritedPartialCandidates: ledger.gateSummary.inheritedPartialCandidates,
    newCandidateIdsAdded: ledger.gateSummary.newCandidateIdsAdded,
    metadataEndpointsObserved: ledger.gateSummary.metadataEndpointsObserved,
    tarballEndpointsObserved: ledger.gateSummary.tarballEndpointsObserved,
    selectedEntryByteParitiesObserved: ledger.gateSummary.selectedEntryByteParitiesObserved,
    rightsLegalConclusionEstablished: ledger.sourceRightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: ledger.sourceRightsBoundary.redistributionAuthorized,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: OBJECT_FREEZE({
      path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256
    }),
    predecessorArtifact: OBJECT_FREEZE(publicIdentity(PREDECESSOR_V1_2)),
    parityChildArtifact: OBJECT_FREEZE(publicIdentity(PARITY_CHILD)),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicSourceBindingRequirementsSuccessorV13(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getVedicSourceBindingRequirementsSuccessorV13Summary(value) {
  if (!isVerifiedVedicSourceBindingRequirementsSuccessorV13(value)) {
    fail("PRIVATE_BRAND_MISSING", "summary 只接受 Vedic v1.3 full-loader 私有品牌。" );
  }
  return OBJECT_FREEZE({
    ledgerId: value.ledgerId,
    ledgerDigest: value.ledgerDigest,
    status: value.status,
    formalV1RemainsCurrent: value.formalV1RemainsCurrent,
    predecessorV11RemainsNonformal: value.predecessorV11RemainsNonformal,
    predecessorV12RemainsNonformal: value.predecessorV12RemainsNonformal,
    successorIsFormalCurrent: value.successorIsFormalCurrent,
    successorActiveEffect: value.successorActiveEffect,
    inheritedPartialCandidates: value.inheritedPartialCandidates,
    newCandidateIdsAdded: value.newCandidateIdsAdded,
    bindingFrozenVerified: value.bindingFrozenVerified,
    bindingRequired: value.bindingRequired,
    metadataEndpointsObserved: value.metadataEndpointsObserved,
    tarballEndpointsObserved: value.tarballEndpointsObserved,
    selectedEntryByteParitiesObserved: value.selectedEntryByteParitiesObserved,
    rightsLegalConclusionEstablished: value.rightsLegalConclusionEstablished,
    redistributionAuthorized: value.redistributionAuthorized,
    releaseReady: value.releaseReady,
    publicReleaseAuthorized: value.publicReleaseAuthorized,
    rawBytes: value.artifact.rawBytes,
    rawSha256: value.artifact.rawSha256
  });
}

export const vedicSourceBindingRequirementsSuccessorV13TestOnly = OBJECT_FREEZE({
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  FORMAL_V1,
  LEDGER_ID,
  PARITY_CHILD,
  PREDECESSOR_V1_1,
  PREDECESSOR_V1_2,
  RECORD_TYPE,
  RIGHTS_CANDIDATE_ID,
  RIGHTS_SUBJECT_ID,
  STATUS,
  TIME_ZONE_CANDIDATE_ID,
  TIME_ZONE_SUBJECT_ID,
  exactJson,
  sha256Text
});
