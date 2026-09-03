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
  isVerifiedVedicSourceBindingRequirementsSuccessor,
  loadVedicSourceBindingRequirementsSuccessor
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs";
import {
  isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild,
  loadVedicTzdbCoreDependencyLicenseCarrierChild
} from "./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs";

export const VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.2.0.json";

const LEDGER_ID =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.2.0";
const RECORD_TYPE =
  "vedic_source_binding_and_three_layer_rights_requirements_carrier_delta_successor_candidate_v1_2";
const STATUS =
  "v1_1_two_partial_candidates_plus_three_node_carrier_child_nonformal_zero_active_effect_zero_of_38_frozen";
const CREATED_AT = "2026-09-01T13:08:05.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T13:08:07.824Z";
const DIGEST_DOMAIN =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements.successor.v1.2\0";
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
const STRING_INCLUDES = String.prototype.includes;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
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

const CHILD = OBJECT_FREEZE({
  path: "content/system-admission/vedic-tzdb-core-dependency-license-carrier-observation-child.v1.json",
  rawBytes: 12_983,
  rawSha256: "3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884",
  childId: "hakimi.vedic.tzdb-core-dependency-license-carrier-observation-child/1.0.0",
  childDigest: "37800051745eeff337134962eb2518c9149eab14cf8369d559419ea76cdca4d0"
});

const NONCONSUMING_CONTEXTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    path: "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json",
    rawBytes: 47_107,
    rawSha256: "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4",
    artifactIdField: "manifestId",
    artifactId: "hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest/2.0.0",
    semanticDigestField: "manifestDigest",
    semanticDigest: "7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347"
  }),
  OBJECT_FREEZE({
    path: "content/system-admission/four-system-current-observation-registry.v2.json",
    rawBytes: 22_261,
    rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
    artifactIdField: "registryId",
    artifactId: "hakimi.system-admission/four-system-current-observation/2.0.0",
    semanticDigestField: "registryDigest",
    semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
  }),
  OBJECT_FREEZE({
    path: "content/system-admission/four-system-admission.v1.json",
    rawBytes: 19_093,
    rawSha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959",
    artifactIdField: "registryId",
    artifactId: "hakimi.system-admission/four-system/1.0.0",
    semanticDigestField: "registryDigest",
    semanticDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a"
  })
]);

const EXPECTED_SUBJECT_INVENTORY = OBJECT_FREEZE({
  subjectCount: 38,
  requiredUnbound: 36,
  candidateOnlyUnbound: 2,
  frozenBindings: 0,
  subjectFullySatisfied: 0,
  canonicalJsonBytes: 60_751,
  canonicalSha256: "207a571b7454856e3f9363ba619cb76ef1e03cb876ff753bb09e94c09a7c15a5"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 15_738,
  rawSha256: "6d3a36f041801e7120a3d270695f94b34242a97fc1559000f8d4d2c0002a3239"
});

export class VedicSourceBindingRequirementsSuccessorV12Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicSourceBindingRequirementsSuccessorV12Error";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicSourceBindingRequirementsSuccessorV12Error(
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
    fail("INPUT_INVALID", "Vedic v1.2 successor 只接受安全有限 JSON。", cause);
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

function decodeUtf8(bytes, label) {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function parseStrict(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: snapshot.path, bytes: snapshot.bytes });
  } catch (cause) {
    fail(cause?.code ?? "JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

function publicIdentity(spec) {
  return { path: spec.path, rawBytes: spec.rawBytes, rawSha256: spec.rawSha256 };
}

function assertSnapshotIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", label + " raw identity 漂移。");
  }
}

function assertPredecessor(predecessorResult) {
  if (!isVerifiedVedicSourceBindingRequirementsSuccessor(predecessorResult)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED", "v1.2 必须消费 v1.1 full-loader 私有品牌。" );
  }
  const ledger = predecessorResult.ledger;
  if (predecessorResult.ledgerId !== PREDECESSOR_V1_1.ledgerId
    || predecessorResult.ledgerDigest !== PREDECESSOR_V1_1.ledgerDigest
    || predecessorResult.ledgerArtifact?.rawBytes !== PREDECESSOR_V1_1.rawBytes
    || predecessorResult.ledgerArtifact?.rawSha256 !== PREDECESSOR_V1_1.rawSha256
    || predecessorResult.predecessorRemainsFormalCurrent !== true
    || predecessorResult.successorIsFormalCurrent !== false
    || predecessorResult.successorActiveEffect !== "none"
    || predecessorResult.bindingRequired !== 38
    || predecessorResult.bindingFrozenVerified !== 0
    || predecessorResult.partialCandidatesAttached !== 2
    || predecessorResult.subjectFullySatisfied !== 0
    || predecessorResult.exactQuotesBound !== 0
    || predecessorResult.formalParentIntegrated !== false
    || predecessorResult.formalRegistryIntegrated !== false
    || predecessorResult.releaseReady !== false
    || predecessorResult.publicReleaseAuthorized !== false
    || ledger?.subjects?.length !== 38
    || ledger?.candidateEvidenceBindings?.length !== 2) {
    fail("PREDECESSOR_IDENTITY_OR_BOUNDARY_DRIFT", "v1.1 raw/self/0-of-38/formal 边界漂移。" );
  }
  const states = { required_unbound: 0, candidate_only_unbound: 0, other: 0 };
  let fullySatisfied = 0;
  let frozen = 0;
  for (let index = 0; index < ledger.subjects.length; index += 1) {
    const subject = ledger.subjects[index];
    if (subject.bindingState === "required_unbound") states.required_unbound += 1;
    else if (subject.bindingState === "candidate_only_unbound") states.candidate_only_unbound += 1;
    else states.other += 1;
    if (subject.subjectFullySatisfied === true) fullySatisfied += 1;
    if (subject.frozenBindingId !== null) frozen += 1;
  }
  const subjectCanonical = canonicalStringify(ledger.subjects);
  if (states.required_unbound !== EXPECTED_SUBJECT_INVENTORY.requiredUnbound
    || states.candidate_only_unbound !== EXPECTED_SUBJECT_INVENTORY.candidateOnlyUnbound
    || states.other !== 0 || fullySatisfied !== 0 || frozen !== 0
    || Buffer.byteLength(subjectCanonical, "utf8") !== EXPECTED_SUBJECT_INVENTORY.canonicalJsonBytes
    || sha256Text(subjectCanonical) !== EXPECTED_SUBJECT_INVENTORY.canonicalSha256) {
    fail("PREDECESSOR_SUBJECT_INVENTORY_DRIFT", "v1.1 38-subject inventory 漂移。" );
  }
  const bySubject = new Map(ledger.candidateEvidenceBindings.map((entry) => [entry.subjectId, entry]));
  if (bySubject.get(TIME_ZONE_SUBJECT_ID)?.candidateId !== TIME_ZONE_CANDIDATE_ID
    || bySubject.get(RIGHTS_SUBJECT_ID)?.candidateId !== RIGHTS_CANDIDATE_ID
    || bySubject.size !== 2) {
    fail("PREDECESSOR_CANDIDATE_DRIFT", "v1.1 必须只保留两个既有 tzdb candidates。" );
  }
  return ledger;
}

function assertChild(childResult) {
  if (!isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(childResult)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED", "v1.2 必须消费 carrier child full-loader 私有品牌。" );
  }
  if (childResult.childId !== CHILD.childId || childResult.childDigest !== CHILD.childDigest
    || childResult.artifact?.rawBytes !== CHILD.rawBytes
    || childResult.artifact?.rawSha256 !== CHILD.rawSha256
    || childResult.dependencyCarrierCount !== 3
    || childResult.licenseCarrierEndpointsVerified !== 3
    || childResult.packedCarrierEndpointsVerified !== 2
    || childResult.bindingRequired !== 38 || childResult.bindingFrozenVerified !== 0
    || childResult.rightsLegalConclusionEstablished !== false
    || childResult.redistributionAuthorized !== false
    || childResult.child?.sourceRequirementsProjectionBoundary?.carrierScopeOnly !== true
    || childResult.child.sourceRequirementsProjectionBoundary.subjectFullySatisfied !== false
    || childResult.child.sourceRequirementsProjectionBoundary.countsTowardFrozenBindingGate !== false) {
    fail("CHILD_IDENTITY_OR_BOUNDARY_DRIFT", "carrier child raw/self/失败关闭边界漂移。" );
  }
  return childResult.child;
}

function carrierIdentity(entry) {
  return {
    declaredDependencyName: entry.declaredDependencyName,
    packageName: entry.packageName,
    version: entry.version,
    packageManifest: publicIdentity(entry.packageManifest),
    licenseCarrier: publicIdentity(entry.licenseCarrier),
    packedCarrier: entry.packedCarrier === null ? null : {
      ...publicIdentity(entry.packedCarrier),
      ianaVersion: entry.packedCarrier.ianaVersion
    },
    licenseAuthenticityEstablished: false,
    licenseApplicabilityEstablished: false,
    publisherTarballByteEqualityEstablished: false
  };
}

function candidateCarrierBindings(childLedger) {
  return [
    {
      subjectId: TIME_ZONE_SUBJECT_ID,
      existingCandidateId: TIME_ZONE_CANDIDATE_ID,
      evidenceArtifact: {
        ...publicIdentity(CHILD), childId: CHILD.childId, childDigest: CHILD.childDigest
      },
      carrierScope: "current_local_tzdb_core_2026c_and_retained_2025b_packed_carriers_only",
      relevantCarriers: childLedger.dependencyCarriers
        .filter((entry) => entry.packedCarrier !== null)
        .map(carrierIdentity),
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
        ...publicIdentity(CHILD), childId: CHILD.childId, childDigest: CHILD.childDigest
      },
      carrierScope: "current_local_tzdb_core_three_node_manifest_license_notice_carriers_only",
      relevantCarriers: childLedger.dependencyCarriers.map(carrierIdentity),
      supplementsExistingCandidate: true,
      replacesPredecessorEvidence: false,
      bindingState: "candidate_only_unbound",
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

export function computeVedicSourceBindingRequirementsSuccessorV12Digest(ledger) {
  const unsigned = capture(ledger);
  delete unsigned.ledgerDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function buildExpectedVedicSourceBindingRequirementsSuccessorV12(
  predecessorResult,
  childResult
) {
  assertPredecessor(predecessorResult);
  const childLedger = assertChild(childResult);
  const unsigned = {
    schemaVersion: "1.2.0",
    recordType: RECORD_TYPE,
    artifactRole: "append_only_nonformal_carrier_evidence_delta_successor_candidate",
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
      carrierChild: {
        ...publicIdentity(CHILD),
        childId: CHILD.childId,
        childDigest: CHILD.childDigest,
        relationship: "one_way_carrier_scope_supplement_to_two_existing_candidates"
      },
      formalV1Modified: false,
      predecessorV11Modified: false,
      predecessorBacklinkAdded: false
    },
    requirementsUniverse: {
      bindingRequired: 38,
      countsByLayer: { input: 13, fact: 12, rule: 13 },
      requirementsUniverseClosed: false,
      exhaustiveVedicSourceRightsUniverseClaimed: false
    },
    predecessorSubjectInventoryBoundary: {
      ...EXPECTED_SUBJECT_INVENTORY,
      verifiedThroughPredecessorFullLoaderPrivateBrand: true,
      subjectBodiesCopiedIntoThisDeltaSuccessor: false,
      subjectInventoryReplacedByThisSuccessor: false
    },
    candidateCarrierEvidenceBindings: candidateCarrierBindings(childLedger),
    sourceRightsBoundary: {
      inheritedCandidateCount: 2,
      newCandidateIdsAdded: 0,
      carrierEvidenceChildAttached: 1,
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
      carrierEvidenceBindingsAttached: 2,
      carrierEvidenceChildrenAttached: 1,
      dependencyCarriersObserved: 3,
      licenseCarrierEndpointsVerified: 3,
      packedCarrierEndpointsVerified: 2,
      noticeEntriesObserved: 3,
      subjectFullySatisfied: 0,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      independentRightsReviewsVerified: 0,
      independentEngineeringReviewsVerified: 0,
      independentDomainExpertReviewsVerified: 0,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicReleaseAuthorized: false
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
    crossSystemIsolationBoundary: {
      baziAuthorityInherited: false,
      ziweiAuthorityInherited: false,
      westernAuthorityInherited: false,
      sharedCarrierIdentityIsAuthorityInheritance: false
    },
    observationBoundary: {
      predecessorAndChildAtomicSnapshot: false,
      formalV1PredecessorV11ManifestAndRegistryBacklinkAbsenceObserved: true,
      knownContextArtifactsBound: 5,
      workspaceWideBacklinkAbsenceEstablished: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
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
      engineeringEvidence: "predecessor_private_brand_plus_local_carrier_child_identity",
      browserRuntimeEvidence: "not_assessed_by_this_successor",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalJudgment: "not_established",
      releaseReadiness: "not_established",
      publicReleaseAuthorization: "not_authorized"
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
      authenticityEstablished: false
    },
    doesNotEstablish: [
      "formal_v1_replacement_or_v1_1_promotion",
      "new_source_candidate_or_frozen_binding",
      "source_body_exact_quote_exact_locator_or_subject_satisfaction",
      "npm_publisher_tarball_equality_authenticity_or_license_applicability",
      "work_version_carrier_rights_legal_conclusion_or_redistribution",
      "vedic_content_truth_traditional_authority_or_expert_truth",
      "browser_pwa_service_worker_product_runtime_or_release_evidence",
      "formal_parent_registry_manifest_owner_or_public_admission",
      "trusted_time_mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeVedicSourceBindingRequirementsSuccessorV12Digest(unsigned)
  });
}

function assertFailClosed(ledger) {
  const formal = ledger?.formalStateBoundary;
  const gate = ledger?.gateSummary;
  const rights = ledger?.sourceRightsBoundary;
  const observation = ledger?.observationBoundary;
  if (!formal || formal.formalV1RemainsCurrent !== true
    || formal.predecessorV11RemainsNonformal !== true
    || formal.successorIsFormalCurrent !== false
    || formal.successorActiveEffect !== "none"
    || formal.formalParentConsumptionEstablished !== false
    || formal.formalRegistryIntegrated !== false
    || formal.formalManifestIntegrated !== false
    || formal.ownerAdmissionAccepted !== false
    || formal.publicReleaseAuthorized !== false) {
    fail("FORMAL_PROMOTION_FORBIDDEN", "v1.2 必须保持 formal v1 current、v1.1/v1.2 nonformal 与零生效。" );
  }
  if (!gate || gate.bindingRequired !== 38 || gate.bindingFrozenVerified !== 0
    || gate.inheritedPartialCandidates !== 2 || gate.newCandidateIdsAdded !== 0
    || gate.carrierEvidenceBindingsAttached !== 2 || gate.carrierEvidenceChildrenAttached !== 1
    || gate.dependencyCarriersObserved !== 3 || gate.licenseCarrierEndpointsVerified !== 3
    || gate.packedCarrierEndpointsVerified !== 2 || gate.noticeEntriesObserved !== 3
    || gate.subjectFullySatisfied !== 0 || gate.sourceBodiesBound !== 0
    || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.releaseEvidenceComplete !== false || gate.releaseReady !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "v1.2 必须保持 0/38、两个既有 partial 与零权利/专家/发布门。" );
  }
  if (!rights || rights.inheritedCandidateCount !== 2 || rights.newCandidateIdsAdded !== 0
    || rights.carrierEvidenceChildAttached !== 1 || rights.sourceBodiesBound !== 0
    || rights.exactQuotesBound !== 0 || rights.exactLocatorsEstablished !== 0
    || rights.bindingFrozenVerified !== 0 || rights.workRightsEstablished !== 0
    || rights.versionRightsEstablished !== 0 || rights.carrierRightsEstablished !== 0
    || rights.rightsLegalConclusionEstablished !== false
    || rights.redistributionAuthorized !== false || rights.sourceBundleComplete !== false
    || rights.rightsBundleComplete !== false) {
    fail("RIGHTS_PROMOTION_FORBIDDEN", "carrier-scope supplement 不得提升 source/rights closure。" );
  }
  if (!observation || observation.crossFileAtomicSnapshotEstablished !== false
    || observation.formalV1PredecessorV11ManifestAndRegistryBacklinkAbsenceObserved !== true
    || observation.knownContextArtifactsBound !== 5
    || observation.mutationEpochAvailable !== false || observation.mutationEpochReceipt !== null
    || observation.intervalMutationExcludedAcrossFiles !== false
    || observation.abaExcluded !== false
    || observation.workspaceWideBacklinkAbsenceEstablished !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "mutation/atomic/interval/ABA/workspace-wide 边界必须保持红。" );
  }
  const authorityKeys = REFLECT_APPLY(OBJECT_KEYS, Object, [ledger?.authorityBoundary ?? {}]);
  if (authorityKeys.length !== 10) fail("AUTHORITY_BOUNDARY_INVALID", "authorityBoundary 字段漂移。" );
  for (let index = 0; index < authorityKeys.length; index += 1) {
    if (ledger.authorityBoundary[authorityKeys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", authorityKeys[index] + " 必须为 false。" );
    }
  }
  const runtime = ledger?.runtimeTrustBoundary;
  if (!runtime || runtime.assumesNoArbitraryPreEvaluationCodeExecution !== true
    || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.loaderIdentityEstablished !== false
    || runtime.launcherIdentityEstablished !== false
    || runtime.selectedLedgerIdentityBindsCliImplementation !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.cliOutputTrustedAttestation !== false) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "runtime/CLI trust 边界必须保持红。" );
  }
  const project = ledger?.projectReleaseGovernanceContext;
  if (!project || project.activeLine !== "legacy-v13" || project.targetSchema !== 13
    || project.migrationId !== null || project.projectContextOnly !== true
    || project.inheritedByVedicProductIdentity !== false
    || project.mutationEpochAvailableForSchema13 !== false
    || project.mutationEpochReceipt !== null || project.expertClaimsAuthorized !== false
    || project.publicDeploymentAuthorized !== false) {
    fail("PROJECT_GOVERNANCE_DRIFT", "legacy-v13/13/null 只能是未继承的项目上下文。" );
  }
  if (ledger?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
      !== CREATED_AT_UPPER_BOUND
    || ledger.timeBoundary.trustedTimestampEstablished !== false
    || ledger.timeBoundary.externalTimeAuthorityUsed !== false
    || ledger.timeBoundary.clockRollbackExcluded !== false
    || Date.parse(ledger.createdAt) > Date.parse(CREATED_AT_UPPER_BOUND)) {
    fail("TIME_BOUNDARY_INVALID", "createdAt 必须不晚于固定不可信本机时钟上界。" );
  }
}

export function verifyVedicSourceBindingRequirementsSuccessorV12Ledger(
  input,
  predecessorResult,
  childResult
) {
  const ledger = capture(input);
  assertPredecessor(predecessorResult);
  assertChild(childResult);
  assertFailClosed(ledger);
  if (typeof ledger.ledgerDigest !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [ledger.ledgerDigest])) {
    fail("LEDGER_DIGEST_INVALID", "ledgerDigest 必须是小写 SHA-256。" );
  }
  if (computeVedicSourceBindingRequirementsSuccessorV12Digest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "ledgerDigest 不匹配。" );
  }
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV12(
    predecessorResult,
    childResult
  );
  if (!exactJson(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "v1.2 与固定 v1.1、carrier child 或 carrier-only delta 合同不一致。" );
  }
  return deepFreeze(ledger);
}

export function serializeVedicSourceBindingRequirementsSuccessorV12(
  ledger,
  predecessorResult,
  childResult
) {
  return REFLECT_APPLY(JSON_STRINGIFY, null, [
    safePrettyValue(
      verifyVedicSourceBindingRequirementsSuccessorV12Ledger(
        ledger,
        predecessorResult,
        childResult
      )
    ),
    null,
    2
  ]) + "\n";
}

export function parseVedicSourceBindingRequirementsSuccessorV12JsonBytes(
  bytes,
  label = VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

async function scanKnownContextsForBacklinks(workspaceRoot) {
  const specs = [
    {
      ...FORMAL_V1,
      artifactIdField: "ledgerId",
      artifactId: FORMAL_V1.ledgerId,
      semanticDigestField: "ledgerDigest",
      semanticDigest: FORMAL_V1.ledgerDigest
    },
    {
      ...PREDECESSOR_V1_1,
      artifactIdField: "ledgerId",
      artifactId: PREDECESSOR_V1_1.ledgerId,
      semanticDigestField: "ledgerDigest",
      semanticDigest: PREDECESSOR_V1_1.ledgerDigest
    },
    ...NONCONSUMING_CONTEXTS
  ];
  const needles = [CHILD.childId, CHILD.path, LEDGER_ID,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH];
  const snapshots = [];
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, spec.path);
    assertSnapshotIdentity(snapshot, spec, spec.artifactId);
    const parsed = parseStrict(snapshot, spec.artifactId);
    if (parsed?.[spec.artifactIdField] !== spec.artifactId
      || parsed?.[spec.semanticDigestField] !== spec.semanticDigest) {
      fail("UPSTREAM_SEMANTIC_IDENTITY_DRIFT", spec.artifactId + " semantic identity 漂移。" );
    }
    const text = decodeUtf8(snapshot.bytes, spec.artifactId);
    for (let needleIndex = 0; needleIndex < needles.length; needleIndex += 1) {
      if (REFLECT_APPLY(STRING_INCLUDES, text, [needles[needleIndex]])) {
        fail("KNOWN_CONTEXT_BACKLINK_FORBIDDEN", "formal v1、nonformal v1.1、当前 Vedic manifest 与已知 registry 不得回链新 child/v1.2。" );
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  return snapshots;
}

async function loadUpstreams(workspaceRoot) {
  const predecessor = await loadVedicSourceBindingRequirementsSuccessor(workspaceRoot);
  assertPredecessor(predecessor);
  const child = await loadVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  assertChild(child);
  const knownContexts = await scanKnownContextsForBacklinks(workspaceRoot);
  return { predecessor, child, knownContexts };
}

export async function buildCurrentVedicSourceBindingRequirementsSuccessorV12(
  workspaceRoot = process.cwd()
) {
  const upstreams = await loadUpstreams(workspaceRoot);
  return buildExpectedVedicSourceBindingRequirementsSuccessorV12(
    upstreams.predecessor,
    upstreams.child
  );
}

export async function loadVedicSourceBindingRequirementsSuccessorV12(
  workspaceRoot = process.cwd()
) {
  const upstreams = await loadUpstreams(workspaceRoot);
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV12(
    upstreams.predecessor,
    upstreams.child
  );
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "Vedic v1.2 successor raw identity 漂移。" );
  }
  const parsed = parseVedicSourceBindingRequirementsSuccessorV12JsonBytes(
    snapshot.bytes,
    snapshot.path
  );
  const ledger = verifyVedicSourceBindingRequirementsSuccessorV12Ledger(
    parsed,
    upstreams.predecessor,
    upstreams.child
  );
  const canonical = serializeVedicSourceBindingRequirementsSuccessorV12(
    ledger,
    upstreams.predecessor,
    upstreams.child
  );
  if (decodeUtf8(snapshot.bytes, "Vedic v1.2 successor") !== canonical) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "v1.2 必须保持唯一 pretty JSON 与 LF 终止。" );
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    formalV1RemainsCurrent: ledger.formalStateBoundary.formalV1RemainsCurrent,
    predecessorV11RemainsNonformal: ledger.formalStateBoundary.predecessorV11RemainsNonformal,
    successorIsFormalCurrent: ledger.formalStateBoundary.successorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.successorActiveEffect,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    inheritedPartialCandidates: ledger.gateSummary.inheritedPartialCandidates,
    newCandidateIdsAdded: ledger.gateSummary.newCandidateIdsAdded,
    carrierEvidenceBindingsAttached: ledger.gateSummary.carrierEvidenceBindingsAttached,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    rightsLegalConclusionEstablished: ledger.sourceRightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: ledger.sourceRightsBoundary.redistributionAuthorized,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: OBJECT_FREEZE({
      path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256
    }),
    predecessorArtifact: OBJECT_FREEZE(publicIdentity(PREDECESSOR_V1_1)),
    childArtifact: OBJECT_FREEZE(publicIdentity(CHILD)),
    knownContextArtifacts: upstreams.knownContexts.map((entry) => OBJECT_FREEZE({
      path: entry.path, rawBytes: entry.rawBytes, rawSha256: entry.rawSha256
    })),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicSourceBindingRequirementsSuccessorV12(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const vedicSourceBindingRequirementsSuccessorV12TestOnly = OBJECT_FREEZE({
  CHILD,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  EXPECTED_SUBJECT_INVENTORY,
  FORMAL_V1,
  LEDGER_ID,
  NONCONSUMING_CONTEXTS,
  PREDECESSOR_V1_1,
  RECORD_TYPE,
  RIGHTS_CANDIDATE_ID,
  RIGHTS_SUBJECT_ID,
  STATUS,
  TIME_ZONE_CANDIDATE_ID,
  TIME_ZONE_SUBJECT_ID,
  exactJson,
  sha256Text
});
