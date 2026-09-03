import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyVedicTzdb2026cSourceRightsEvidence as canonicalStringify,
  isVerifiedVedicTzdb2026cSourceRightsEvidence,
  loadVedicTzdb2026cSourceRightsEvidence
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";
import {
  readVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

export const VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json";

const LEDGER_ID = "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.1.0";
const RECORD_TYPE = "vedic_source_binding_and_three_layer_rights_requirements_successor_candidate_v1_1";
const STATUS = "requirements_plus_two_partial_candidates_36_canonical_exact_no_bindings_frozen_nonformal_zero_active_effect";
const CREATED_AT = "2026-08-31T07:01:42.5368561Z";
const DIGEST_DOMAIN = "hakimi.vedic.source-binding-and-three-layer-rights-requirements.successor.v1.1\0";
const TIME_ZONE_SUBJECT_ID = "vedic.input.iana_time_zone_and_tzdb_identity";
const RIGHTS_SUBJECT_ID = "vedic.rule.rights_license_and_redistribution_review";
const TIME_ZONE_CANDIDATE_ID = "vedic-iana-tzdb-2026c-input-source-candidate-v1";
const RIGHTS_CANDIDATE_ID = "vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_MAP = Array.prototype.map;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const STRING_INCLUDES = String.prototype.includes;
const REGEXP_TEST = RegExp.prototype.test;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PREDECESSOR = OBJECT_FREEZE({
  role: "formal_current_vedic_source_binding_and_three_layer_rights_requirements",
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
  rawBytes: 85_752,
  rawSha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e",
  artifactIdField: "ledgerId",
  artifactId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0"
});

const CHILD_EVIDENCE = OBJECT_FREEZE({
  role: "verified_private_branded_vedic_tzdb_source_rights_child",
  path: "content/system-admission/vedic-tzdb-2026c-source-rights-evidence.v1.json",
  rawBytes: 20_505,
  rawSha256: "baa55f5e21f3a91075048c85e5b2a880f0d0e6c62e611a881e7d636b10db58fa",
  semanticDigestField: "evidenceDigest",
  semanticDigest: "9be3d2631d1bcee5ccea174b55884f4f7f5655fed69ecd2adc94ca31cefb1bc0",
  evidenceId: "hakimi.vedic.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0"
});

const FORMAL_CONTEXTS = OBJECT_FREEZE([
  PREDECESSOR,
  OBJECT_FREEZE({ role: "vedic_productization_requirements_parent_context_only", path: "content/system-admission/vedic-independent-productization-requirements.v1.json", rawBytes: 25_578, rawSha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8", semanticDigestField: "ledgerDigest", semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb", artifactIdField: "ledgerId", artifactId: "hakimi.vedic.independent-productization-requirements/1.0.0" }),
  OBJECT_FREEZE({ role: "preserved_vedic_version_observation_v1_1_context_only", path: "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json", rawBytes: 14_110, rawSha256: "d87a9340c4afd280e1aeb004f4322d2088868b79f31b7c2fd3191e8d14e1343a", semanticDigestField: "candidateDigest", semanticDigest: "3eebcbcd60dfd1f4a96671ec2ab18bd6cceb20d14806acd44a00603e4848a8d1", artifactIdField: "candidateId", artifactId: "hakimi.vedic.independent-productization.version-aware-observation-candidate/1.1.0" }),
  OBJECT_FREEZE({ role: "current_vedic_version_observation_child_v1_2_context_only", path: "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json", rawBytes: 16_272, rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845", semanticDigestField: "candidateDigest", semanticDigest: "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171", artifactIdField: "candidateId", artifactId: "hakimi.vedic.independent-productization.version-aware-observation-child/1.2.0" }),
  OBJECT_FREEZE({ role: "four_system_current_observation_registry_v2_context_only", path: "content/system-admission/four-system-current-observation-registry.v2.json", rawBytes: 22_261, rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39", semanticDigestField: "registryDigest", semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738", artifactIdField: "registryId", artifactId: "hakimi.system-admission/four-system-current-observation/2.0.0" }),
  OBJECT_FREEZE({ role: "legacy_four_system_admission_registry_v1_context_only", path: "content/system-admission/four-system-admission.v1.json", rawBytes: 19_093, rawSha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959", semanticDigestField: "registryDigest", semanticDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a", artifactIdField: "registryId", artifactId: "hakimi.system-admission/four-system/1.0.0" })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 94_582,
  rawSha256: "9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd"
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "formal_current_requirements_replacement_or_active_effect",
  "formal_parent_version_registry_manifest_or_owner_admission",
  "complete_iana_time_zone_and_tzdb_identity_subject",
  "dst_gap_overlap_resolution_policy_or_subject",
  "complete_rights_license_and_redistribution_review_subject",
  "source_body_persistence_binding_freeze_or_subject_full_satisfaction",
  "formal_subject_exact_quote_or_locator_binding",
  "work_version_carrier_rights_establishment_legal_conclusion_or_redistribution_authorization",
  "vedic_content_truth_traditional_authority_or_expert_truth",
  "western_evidence_authority_brand_or_controlled_reproduction_inheritance",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class VedicSourceBindingRequirementsSuccessorError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicSourceBindingRequirementsSuccessorError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicSourceBindingRequirementsSuccessorError(
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
    fail("INPUT_INVALID", "Vedic source successor 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
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

function safePrettyValue(value) {
  const snapshot = capture(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (ARRAY_IS_ARRAY(input)) {
      const output = [];
      OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
      for (let index = 0; index < input.length; index += 1) REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      return output;
    }
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(input);
    REFLECT_APPLY(ARRAY_SORT, keys, [(left, right) => left < right ? -1 : left > right ? 1 : 0]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, { value: materialize(input[key]), enumerable: true, configurable: true, writable: true });
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

export function computeVedicSourceBindingRequirementsSuccessorDigest(ledger) {
  const unsigned = capture(ledger);
  delete unsigned.ledgerDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function parseVedicSourceBindingRequirementsSuccessorJsonBytes(
  bytes,
  label = VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function evidenceIdentity() {
  return {
    path: CHILD_EVIDENCE.path,
    rawBytes: CHILD_EVIDENCE.rawBytes,
    rawSha256: CHILD_EVIDENCE.rawSha256,
    evidenceId: CHILD_EVIDENCE.evidenceId,
    evidenceDigest: CHILD_EVIDENCE.semanticDigest
  };
}

function requireVerifiedChild(childResult) {
  if (!isVerifiedVedicTzdb2026cSourceRightsEvidence(childResult)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED", "successor 只接受 loader 验证的 Vedic tzdb child private brand。");
  }
  if (childResult.evidenceId !== CHILD_EVIDENCE.evidenceId
    || childResult.evidenceDigest !== CHILD_EVIDENCE.semanticDigest
    || childResult.ledgerArtifact?.rawBytes !== CHILD_EVIDENCE.rawBytes
    || childResult.ledgerArtifact?.rawSha256 !== CHILD_EVIDENCE.rawSha256
    || childResult.sourceBindingsRequired !== 38 || childResult.sourceBindingsFrozenVerified !== 0
    || childResult.partialCandidatesAttached !== 2 || childResult.subjectFullySatisfied !== 0
    || childResult.exactQuotesBound !== 0 || childResult.rightsLegalConclusionEstablished !== false
    || childResult.releaseReady !== false || childResult.publicReleaseAuthorized !== false) {
    fail("CHILD_IDENTITY_OR_BOUNDARY_DRIFT", "branded Vedic tzdb child 身份或 fail-closed 边界漂移。");
  }
  return childResult;
}

function quoteRecord(sourceId, quote) {
  return { sourceId, text: quote.text, utf8Bytes: quote.utf8Bytes, sha256: quote.sha256, locator: quote.locator };
}

function candidateEvidenceBindings(childResult) {
  const ledger = childResult.ledger;
  const artifact = evidenceIdentity();
  return [
    {
      subjectId: TIME_ZONE_SUBJECT_ID,
      candidateId: TIME_ZONE_CANDIDATE_ID,
      coverageScope: "iana_2026c_release_version_and_system_local_moment_timezone_0_6_3_packed_identity_only",
      bindingState: "candidate_only_unbound",
      evidenceArtifact: { ...artifact },
      fixedSourceIdentities: [
        { role: "iana_tzdb_2026c_release_archive", version: "2026c", url: ledger.officialIanaEvidence.dataArchive.requestedUrl, rawBytes: ledger.officialIanaEvidence.dataArchive.rawBytes, rawSha256: ledger.officialIanaEvidence.dataArchive.rawSha256 },
        { role: "iana_tzdb_2026c_version_representation", version: "2026c", url: ledger.officialIanaEvidence.versionRepresentation.requestedUrl, rawBytes: ledger.officialIanaEvidence.versionRepresentation.rawBytes, rawSha256: ledger.officialIanaEvidence.versionRepresentation.rawSha256 },
        { role: "system_local_moment_timezone_0_6_3_packed_carrier", version: "0.6.3/iana-2026c", path: "node_modules/moment-timezone/data/packed/latest.json", rawBytes: 715_527, rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" }
      ],
      minimalExactQuoteObservations: [quoteRecord("iana_tzdb_2026c_version_representation", ledger.officialIanaEvidence.versionRepresentation.exactQuote)],
      sourceBodyDigest: null,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      candidateExactQuoteObserved: true,
      candidateExactLocatorObserved: true,
      formalExactQuoteBound: false,
      formalExactLocatorEstablished: false,
      subjectFullySatisfied: false,
      frozenBindingId: null,
      contentTruthEstablished: false,
      independentEngineeringReviewVerified: false,
      independentDomainExpertReviewVerified: false,
      countsTowardFrozenBindingGate: false
    },
    {
      subjectId: RIGHTS_SUBJECT_ID,
      candidateId: RIGHTS_CANDIDATE_ID,
      coverageScope: "iana_tzdb_2026c_and_local_moment_timezone_0_6_3_only_not_general_vedic_rights_review",
      bindingState: "candidate_only_unbound",
      evidenceArtifact: { ...artifact },
      fixedSourceIdentities: [
        { role: "iana_tzdb_2026c_license_representation", version: "2026c", url: ledger.officialIanaEvidence.licenseRepresentation.requestedUrl, rawBytes: ledger.officialIanaEvidence.licenseRepresentation.rawBytes, rawSha256: ledger.officialIanaEvidence.licenseRepresentation.rawSha256 },
        { role: "system_local_moment_timezone_0_6_3_license_carrier", version: "0.6.3", path: "node_modules/moment-timezone/LICENSE", rawBytes: 1_097, rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" }
      ],
      minimalExactQuoteObservations: [
        quoteRecord("iana_tzdb_2026c_license_representation", ledger.officialIanaEvidence.licenseRepresentation.exactQuote),
        quoteRecord("system_local_moment_timezone_0_6_3_license_carrier", ledger.localMomentTimezoneCarrierEvidence.mitMinimalExactQuote)
      ],
      sourceBodyDigest: null,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      candidateExactQuoteObserved: true,
      candidateExactLocatorObserved: true,
      formalExactQuoteBound: false,
      formalExactLocatorEstablished: false,
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
    candidateEvidenceDigest: CHILD_EVIDENCE.semanticDigest,
    candidateCoverageScope: binding.coverageScope,
    candidateExactQuoteObserved: true,
    candidateExactLocatorObserved: true,
    subjectFullySatisfied: false,
    countsTowardFrozenBindingGate: false
  };
}

export function buildExpectedVedicSourceBindingRequirementsSuccessor(predecessorInput, childResult) {
  const predecessor = capture(predecessorInput);
  requireVerifiedChild(childResult);
  if (predecessor.ledgerId !== PREDECESSOR.artifactId
    || predecessor.ledgerDigest !== PREDECESSOR.semanticDigest
    || predecessor.subjects?.length !== 38
    || predecessor.gateSummary?.bindingFrozenVerified !== 0
    || predecessor.gateSummary?.sourceCandidatesAttached !== 0) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "successor 只接受固定、全未绑定的 Vedic formal v1 predecessor。");
  }
  const bindings = candidateEvidenceBindings(childResult);
  const bindingBySubject = new NATIVE_MAP();
  REFLECT_APPLY(MAP_SET, bindingBySubject, [TIME_ZONE_SUBJECT_ID, bindings[0]]);
  REFLECT_APPLY(MAP_SET, bindingBySubject, [RIGHTS_SUBJECT_ID, bindings[1]]);
  const subjects = [];
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const subject = predecessor.subjects[index];
    const binding = REFLECT_APPLY(MAP_GET, bindingBySubject, [subject.subjectId]);
    REFLECT_APPLY(ARRAY_PUSH, subjects, [successorSubject(subject, binding ?? null)]);
  }
  const sourceCandidateIds = [TIME_ZONE_CANDIDATE_ID, RIGHTS_CANDIDATE_ID];
  const unsigned = {
    artifactRole: "nonformal_vedic_source_binding_and_three_layer_rights_successor_candidate",
    authorityBoundary: capture(predecessor.authorityBoundary),
    boundaryBindings: capture(predecessor.boundaryBindings),
    candidateEvidenceBindings: bindings,
    childEvidenceBinding: {
      ...evidenceIdentity(),
      privateBrandRequiredAtVerification: true,
      relationship: "one_way_vedic_child_evidence_to_non_consumed_nonformal_successor"
    },
    createdAt: CREATED_AT,
    defaultClosureRequirements: capture(predecessor.defaultClosureRequirements),
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedger: {
      engineeringRequirementIdentity: "formal_predecessor_raw_semantics_36_canonical_exact_subjects_and_two_partial_candidates_verified",
      browserRuntimeEvidence: "not_assessed_in_successor_candidate",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    expertBoundary: capture(predecessor.expertBoundary),
    formalStateBoundary: {
      predecessorRemainsFormalCurrent: true,
      successorIsFormalCurrent: false,
      successorActiveEffect: "none",
      formalParentConsumptionEstablished: false,
      formalVersionChildModified: false,
      formalRegistryIntegrated: false,
      formalManifestIntegrated: false,
      ownerAdmissionAccepted: false,
      predecessorMutated: false,
      predecessorBacklinkAdded: false,
      westernAuthorityInherited: false
    },
    gateSummary: {
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      bindingRequirementsInventoryDefined: true,
      partialCandidatesAttached: 2,
      sourceCandidatesAttached: 2,
      subjectFullySatisfied: 0,
      sourceBodiesBound: 0,
      candidateExactQuoteObservationsStored: 3,
      subjectsWithCandidateExactQuoteObservation: 2,
      candidateExactLocatorsObserved: 2,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
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
      formalParentIntegrated: false,
      formalRegistryIntegrated: false,
      formalManifestIntegrated: false,
      ownerAdmissionAccepted: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    integrityBoundary: {
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      exclusiveCreateWriterRequired: true,
      canonicalPrettyJsonWithLfRequired: true,
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestExcludesOwnField: true,
      digestIsDigitalSignature: false,
      authenticityEstablished: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    ledgerId: LEDGER_ID,
    observationBoundary: {
      endpointSnapshotOnly: true,
      predecessorAndChildAtomicSnapshot: false,
      contextArtifactsAtomicSnapshot: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    predecessorBinding: {
      path: PREDECESSOR.path,
      rawBytes: PREDECESSOR.rawBytes,
      rawSha256: PREDECESSOR.rawSha256,
      ledgerId: PREDECESSOR.artifactId,
      ledgerDigest: PREDECESSOR.semanticDigest,
      remainsFormalCurrent: true
    },
    productBoundary: capture(predecessor.productBoundary),
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
    recordType: RECORD_TYPE,
    requirementsUniverse: capture(predecessor.requirementsUniverse),
    schemaVersion: "1.1.0",
    scopeExclusions: capture(predecessor.scopeExclusions),
    sourceRightsBoundary: {
      ...capture(predecessor.sourceRightsBoundary),
      sourceCandidateIds,
      sourceCandidatesAttached: 2
    },
    status: STATUS,
    subjects,
    systemIdentity: capture(predecessor.systemIdentity)
  };
  return deepFreeze({ ...unsigned, ledgerDigest: computeVedicSourceBindingRequirementsSuccessorDigest(unsigned) });
}

function assertFailClosed(ledger) {
  const formal = ledger?.formalStateBoundary;
  const gate = ledger?.gateSummary;
  const integrity = ledger?.integrityBoundary;
  if (!formal || formal.predecessorRemainsFormalCurrent !== true
    || formal.successorIsFormalCurrent !== false || formal.successorActiveEffect !== "none"
    || formal.formalParentConsumptionEstablished !== false || formal.formalVersionChildModified !== false
    || formal.formalRegistryIntegrated !== false || formal.formalManifestIntegrated !== false
    || formal.ownerAdmissionAccepted !== false || formal.predecessorMutated !== false
    || formal.predecessorBacklinkAdded !== false || formal.westernAuthorityInherited !== false) {
    fail("FORMAL_STATE_PROMOTION_FORBIDDEN", "Vedic successor 必须保持 formal v1 当前、parent/version/registry 不变且零生效。");
  }
  if (!gate || gate.bindingRequired !== 38 || gate.bindingFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.sourceCandidatesAttached !== 2
    || gate.subjectFullySatisfied !== 0 || gate.sourceBodiesBound !== 0
    || gate.candidateExactQuoteObservationsStored !== 3
    || gate.subjectsWithCandidateExactQuoteObservation !== 2
    || gate.candidateExactLocatorsObserved !== 2
    || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.expertReviewedSubjects !== 0
    || gate.independentRightsReviewsVerified !== 0 || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0 || gate.sourceBundleComplete !== false
    || gate.rightsBundleComplete !== false || gate.expertReviewBundleComplete !== false
    || gate.rightsLegalConclusionEstablished !== false || gate.redistributionAuthorized !== false
    || gate.formalParentIntegrated !== false || gate.formalRegistryIntegrated !== false
    || gate.formalManifestIntegrated !== false || gate.ownerAdmissionAccepted !== false
    || gate.releaseReady !== false || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "Vedic successor 必须保持 0/38、两项 partial、formal quote 0、无权利专家与发布准入。");
  }
  if (!integrity || integrity.mutationEpochAvailable !== false || integrity.mutationEpochReceipt !== null
    || integrity.crossFileAtomicSnapshotEstablished !== false
    || integrity.intervalMutationExcludedAcrossFiles !== false || integrity.abaExcluded !== false
    || integrity.digestIsDigitalSignature !== false || integrity.authenticityEstablished !== false) {
    fail("INTEGRITY_OVERCLAIM_FORBIDDEN", "Vedic successor 不得声称签名、真实性、mutation epoch、跨文件原子性、区间完整性或 ABA 排除。");
  }
  const release = ledger?.projectReleaseGovernanceContext;
  if (!release || release.activeLine !== "legacy-v13" || release.targetSchema !== 13
    || release.migrationId !== null || release.projectContextOnly !== true
    || release.inheritedByVedicProductIdentity !== false
    || release.mutationEpochAvailableForSchema13 !== false || release.mutationEpochReceipt !== null
    || release.expertClaimsAuthorized !== false || release.publicDeploymentAuthorized !== false) {
    fail("PROJECT_CONTEXT_PROMOTION_FORBIDDEN", "legacy-v13/13/null 只能作为未被 Vedic 产品继承的项目上下文。");
  }
}

function assertThirtySixSubjectsCanonicalExact(predecessor, successor) {
  if (!ARRAY_IS_ARRAY(successor?.subjects) || successor.subjects.length !== 38) {
    fail("SUBJECT_INVENTORY_DRIFT", "Vedic successor 必须保持 38 个 canonical subject。");
  }
  const addedKeys = [
    "candidateEvidenceDigest",
    "candidateCoverageScope",
    "candidateExactQuoteObserved",
    "candidateExactLocatorObserved",
    "subjectFullySatisfied",
    "countsTowardFrozenBindingGate"
  ];
  let changed = 0;
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = successor.subjects[index];
    if (before.subjectId !== after?.subjectId) fail("SUBJECT_ORDER_DRIFT", "Vedic successor subject 顺序或身份漂移。");
    const target = before.subjectId === TIME_ZONE_SUBJECT_ID || before.subjectId === RIGHTS_SUBJECT_ID;
    const equal = exactJson(before, after);
    if (!target) {
      if (!equal) fail("NON_TARGET_SUBJECT_DRIFT", "36 个非目标 Vedic subject 必须与 formal v1 canonical-exact。");
      continue;
    }
    if (equal || after.bindingState !== "candidate_only_unbound"
      || !ARRAY_IS_ARRAY(after.sourceCandidateIds) || after.sourceCandidateIds.length !== 1
      || after.selectedSourceCandidateId !== null || after.sourceOrProvenanceMode !== null
      || after.sourceBodyDigest !== null || after.sourceBindingEstablished !== false
      || after.exactQuoteStored !== false || after.exactQuoteDigest !== null
      || after.exactQuoteRefs?.length !== 0 || after.exactLocatorEstablished !== false
      || after.exactLocatorRefs?.length !== 0 || after.frozenBindingId !== null
      || after.workRightsEstablished !== false || after.versionRightsEstablished !== false
      || after.carrierRightsEstablished !== false || after.licenseEstablished !== false
      || after.redistributionAuthorized !== false || after.rightsLegalConclusionEstablished !== false
      || after.contentTruthEstablished !== false || after.expertTruthEstablished !== false
      || after.expertReviewIds?.length !== 0 || after.subjectFullySatisfied !== false
      || after.countsTowardFrozenBindingGate !== false) {
      fail("TARGET_SUBJECT_BOUNDARY_DRIFT", "两个 target 只能成为 candidate-only，formal closure 字段必须继续未建立。");
    }
    const restored = capture(after);
    restored.bindingState = before.bindingState;
    restored.sourceCandidateIds = capture(before.sourceCandidateIds);
    for (let keyIndex = 0; keyIndex < addedKeys.length; keyIndex += 1) delete restored[addedKeys[keyIndex]];
    if (!exactJson(restored, before)) {
      fail("TARGET_SUBJECT_UNEXPECTED_DRIFT", "target subject 除 candidate projection 外不得漂移。");
    }
    changed += 1;
  }
  if (changed !== 2) fail("SUBJECT_CHANGE_COUNT_DRIFT", "Vedic successor 必须且只能改变两个 subject。");
}

export function verifyVedicSourceBindingRequirementsSuccessorLedger(input, predecessorInput, childResult) {
  const ledger = capture(input);
  const predecessor = capture(predecessorInput);
  requireVerifiedChild(childResult);
  assertFailClosed(ledger);
  assertThirtySixSubjectsCanonicalExact(predecessor, ledger);
  if (typeof ledger.ledgerDigest !== "string" || !REFLECT_APPLY(REGEXP_TEST, SHA256, [ledger.ledgerDigest])) {
    fail("LEDGER_DIGEST_INVALID", "Vedic successor ledgerDigest 必须是小写 SHA-256。");
  }
  if (computeVedicSourceBindingRequirementsSuccessorDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "Vedic successor ledgerDigest 不匹配。");
  }
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessor(predecessor, childResult);
  if (!exactJson(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "Vedic successor 与固定 predecessor、branded child 和零效力合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeVedicSourceBindingRequirementsSuccessor(ledger, predecessor, childResult) {
  return JSON_STRINGIFY(
    safePrettyValue(verifyVedicSourceBindingRequirementsSuccessorLedger(ledger, predecessor, childResult)),
    null,
    2
  ) + "\n";
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("FORMAL_CONTEXT_RAW_DRIFT", `${label} raw identity 漂移。`);
  }
}

function parseStrict(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: snapshot.path, bytes: snapshot.bytes });
  } catch (cause) {
    fail("FORMAL_CONTEXT_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
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

async function scanFormalContextsForBacklinks(workspaceRoot) {
  const snapshots = [];
  const needles = [
    CHILD_EVIDENCE.evidenceId,
    CHILD_EVIDENCE.path,
    LEDGER_ID,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
  ];
  for (let index = 0; index < FORMAL_CONTEXTS.length; index += 1) {
    const expected = FORMAL_CONTEXTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    const parsed = parseStrict(snapshot, expected.role);
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest
      || parsed?.[expected.artifactIdField] !== expected.artifactId) {
      fail("FORMAL_CONTEXT_SEMANTIC_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    const text = decodeUtf8(snapshot.bytes, expected.role);
    for (let needleIndex = 0; needleIndex < needles.length; needleIndex += 1) {
      if (REFLECT_APPLY(STRING_INCLUDES, text, [needles[needleIndex]])) {
        fail("FORMAL_CONTEXT_BACKLINK_FORBIDDEN", "formal v1、parent、version 或 registry 不得回链 Vedic source child/successor。");
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  return snapshots;
}

async function loadUpstreams(workspaceRoot) {
  const predecessor = await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  if (predecessor.ledgerId !== PREDECESSOR.artifactId
    || predecessor.ledgerDigest !== PREDECESSOR.semanticDigest
    || predecessor.subjects?.length !== 38
    || predecessor.gateSummary?.bindingFrozenVerified !== 0
    || predecessor.gateSummary?.sourceCandidatesAttached !== 0) {
    fail("PREDECESSOR_ZERO_STATE_DRIFT", "Vedic formal v1 predecessor 必须保持 0 candidate / 0/38 frozen。");
  }
  const child = await loadVedicTzdb2026cSourceRightsEvidence(workspaceRoot);
  requireVerifiedChild(child);
  const formalContexts = await scanFormalContextsForBacklinks(workspaceRoot);
  return { predecessor, child, formalContexts };
}

export async function buildCurrentVedicSourceBindingRequirementsSuccessor(workspaceRoot = process.cwd()) {
  const upstreams = await loadUpstreams(workspaceRoot);
  return buildExpectedVedicSourceBindingRequirementsSuccessor(upstreams.predecessor, upstreams.child);
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({ path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 });
}

export async function loadVedicSourceBindingRequirementsSuccessor(workspaceRoot = process.cwd()) {
  const upstreams = await loadUpstreams(workspaceRoot);
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessor(upstreams.predecessor, upstreams.child);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "Vedic successor raw identity 漂移。");
  }
  const parsed = parseVedicSourceBindingRequirementsSuccessorJsonBytes(snapshot.bytes, snapshot.path);
  const ledger = verifyVedicSourceBindingRequirementsSuccessorLedger(
    parsed,
    upstreams.predecessor,
    upstreams.child
  );
  const canonical = serializeVedicSourceBindingRequirementsSuccessor(ledger, upstreams.predecessor, upstreams.child);
  if (decodeUtf8(snapshot.bytes, "Vedic source successor") !== canonical) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "Vedic successor 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  if (!exactJson(ledger, expected)) fail("CURRENT_SUCCESSOR_MISMATCH", "persisted Vedic successor 不是当前允许投影。");
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    predecessorRemainsFormalCurrent: ledger.formalStateBoundary.predecessorRemainsFormalCurrent,
    successorIsFormalCurrent: ledger.formalStateBoundary.successorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.successorActiveEffect,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    partialCandidatesAttached: ledger.gateSummary.partialCandidatesAttached,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    candidateExactQuoteObservationsStored: ledger.gateSummary.candidateExactQuoteObservationsStored,
    exactQuotesBound: ledger.gateSummary.exactQuotesBound,
    formalParentIntegrated: ledger.gateSummary.formalParentIntegrated,
    formalRegistryIntegrated: ledger.gateSummary.formalRegistryIntegrated,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(snapshot),
    childEvidenceArtifact: publicIdentity(upstreams.child.ledgerArtifact),
    formalContextArtifacts: REFLECT_APPLY(ARRAY_MAP, upstreams.formalContexts, [publicIdentity]),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicSourceBindingRequirementsSuccessor(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const vedicSourceBindingRequirementsSuccessorTestOnly = OBJECT_FREEZE({
  CHILD_EVIDENCE,
  CREATED_AT,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  FORMAL_CONTEXTS,
  LEDGER_ID,
  PREDECESSOR,
  RECORD_TYPE,
  RIGHTS_CANDIDATE_ID,
  RIGHTS_SUBJECT_ID,
  STATUS,
  TIME_ZONE_CANDIDATE_ID,
  TIME_ZONE_SUBJECT_ID,
  exactJson,
  sha256Text
});
