import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyWesternSourceBindingRequirementsSuccessor as predecessorCanonicalStringify,
  isVerifiedWesternSourceBindingRequirementsSuccessor,
  loadWesternSourceBindingRequirementsSuccessor
} from "./western-source-binding-requirements-successor-lib.mjs";
import {
  isVerifiedWesternTzdb2026cControlledReproductionObservation,
  loadWesternTzdb2026cControlledReproductionObservation
} from "./western-tzdb-2026c-controlled-reproduction-observation-lib.mjs";
import {
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

export const WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH =
  "content/system-admission/western-source-binding-requirements.v1.2.0.json";

const DIGEST_DOMAIN = "hakimi-western-source-binding-requirements-successor-candidate-v1.2\0";
const LEDGER_ID = "hakimi.western-astrology.source-binding-requirements/1.2.0";
const CREATED_AT = "2026-08-31T07:20:00.000Z";
const CALENDAR_SUBJECT_ID = "western.input.calendar-time-zone-and-dst";
const RIGHTS_SUBJECT_ID = "western.rights.ephemeris-time-data-redistribution";
const CALENDAR_OBSERVATION_CANDIDATE_ID =
  "western-iana-tzdb-2026c-to-moment-timezone-controlled-reproduction-v1";
const RIGHTS_OBSERVATION_CANDIDATE_ID =
  "western-iana-tzdb-2026c-to-moment-timezone-controlled-reproduction-rights-context-v1";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const OBJECT_HAS_OWN = Object.prototype.hasOwnProperty;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const STRING_INCLUDES = String.prototype.includes;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const FORMAL_CURRENT = OBJECT_FREEZE({
  role: "formal_current_western_source_binding_requirements",
  path: "content/system-admission/western-source-binding-requirements.v1.json",
  rawBytes: 25_909,
  rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.0.0"
});

const PREDECESSOR_CANDIDATE = OBJECT_FREEZE({
  role: "nonformal_predecessor_candidate",
  path: "content/system-admission/western-source-binding-requirements.v1.1.0.json",
  rawBytes: 34_338,
  rawSha256: "7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.1.0"
});

const OBSERVATION_CHILD = OBJECT_FREEZE({
  role: "private_branded_controlled_reproduction_observation_candidate",
  path: "content/system-admission/western-tzdb-2026c-controlled-reproduction-observation.v1.json",
  rawBytes: 26_020,
  rawSha256: "41ef81e05f428286be7721529dbb0e911ad408b1d8a583b24abadac5f23f3d76",
  semanticDigestField: "observationDigest",
  semanticDigest: "5d3eea3297b7cd024fb53f5a9c9e92d5a396f972d802fede6ced7c58f496b612",
  observationId:
    "hakimi.western.controlled-reproduction/iana-tzdb-2026c-to-moment-timezone-0.6.3/1.0.0"
});

const SOURCE_RIGHTS_CHILD = OBJECT_FREEZE({
  role: "private_branded_source_rights_child",
  path: "content/system-admission/western-tzdb-2026c-source-rights-evidence.v1.json",
  rawBytes: 16_931,
  rawSha256: "ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1",
  semanticDigestField: "evidenceDigest",
  semanticDigest: "14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465",
  evidenceId: "hakimi.western.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0"
});

const FORMAL_CONTEXTS = OBJECT_FREEZE([
  FORMAL_CURRENT,
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
  rawBytes: 40_667,
  rawSha256: "e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1"
});

const EXECUTION_FALSE_FIELDS = OBJECT_FREEZE([
  "allIntermediateLayersTimeIndependent",
  "browserRuntimeValidated",
  "commitOrTagSignatureVerified",
  "completeProcessReadSetMechanicallyTraced",
  "crossHostToolBitReproducibilityEstablished",
  "detachedSignatureCryptographicallyVerified",
  "environmentClosureEstablished",
  "launcherIntegrityEstablished",
  "networkIsolationEstablished",
  "networkIsolationMechanicallyEstablished",
  "osLevelExpectedOutputInvisibilityEstablished",
  "osLevelReadSetTraceCaptured",
  "preEntryExecutionOrErasureExcluded",
  "probeReceiptCryptographicallyAttested",
  "publisherAuthenticityEstablished",
  "publisherBuildProvenanceEstablished",
  "publisherOriginalBuildProvenanceEstablished",
  "replayableFromThisRecordAlone",
  "signingKeyTrustEstablished",
  "targetInvisibilityMechanicallyEstablished",
  "toolchainCrossHostBitReproducibilityEstablished",
  "transformationProvenanceEstablished"
]);

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "formal_current_requirements_replacement_or_active_effect",
  "formal_manifest_registry_or_owner_admission",
  "complete_calendar_time_zone_and_dst_subject",
  "complete_ephemeris_time_data_redistribution_subject",
  "source_body_persistence_exact_quote_binding_or_complete_source_bundle",
  "binding_freeze_or_either_subject_full_satisfaction",
  "complete_transformation_provenance_or_publisher_build_provenance",
  "publisher_authenticity_signature_verification_or_signing_key_trust",
  "target_invisibility_complete_process_read_set_or_network_isolation",
  "environment_closure_cross_host_tool_bit_reproducibility_or_replayability",
  "probe_receipt_attestation_or_persisted_probe_runner",
  "work_version_edition_carrier_rights_or_redistribution_authorization",
  "rights_legal_conclusion_content_truth_or_expert_truth",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternSourceBindingRequirementsSuccessorV12Error extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "WesternSourceBindingRequirementsSuccessorV12Error";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternSourceBindingRequirementsSuccessorV12Error(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capturePassiveJson(value) {
  try {
    const canonical = predecessorCanonicalStringify(value);
    return REFLECT_APPLY(JSON_PARSE, JSON, [canonical]);
  } catch (cause) {
    fail(cause?.code ?? "INPUT_NOT_PASSIVE_JSON", "v1.2 只接受被动、有限、无别名 JSON 值。", cause);
  }
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_VALUES(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value));
  for (let index = 0; index < descriptors.length; index += 1) {
    if ("value" in descriptors[index]) deepFreeze(descriptors[index].value, seen);
  }
  return OBJECT_FREEZE(value);
}

function trustedCopy(value) {
  return capturePassiveJson(value);
}

function prettySafeValue(value) {
  const snapshot = capturePassiveJson(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (ARRAY_IS_ARRAY(input)) {
      const output = [];
      OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
      for (let index = 0; index < input.length; index += 1) {
        REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      }
      return output;
    }
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(input);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: materialize(input[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  return materialize(snapshot);
}

export function canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(value) {
  try {
    return predecessorCanonicalStringify(value);
  } catch (cause) {
    fail(cause?.code ?? "NON_CANONICAL_JSON", "v1.2 只接受规范 JSON 值。", cause);
  }
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeWesternSourceBindingRequirementsSuccessorV12Digest(ledger) {
  const snapshot = capturePassiveJson(ledger);
  const unsigned = {};
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key !== "ledgerDigest") {
      OBJECT_DEFINE_PROPERTY(unsigned, key, {
        value: snapshot[key],
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }
  return sha256Text(
    DIGEST_DOMAIN + canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(unsigned)
  );
}

export function parseWesternSourceBindingRequirementsSuccessorV12JsonBytes(
  bytes,
  label = WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_V12_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", label + " raw identity 漂移。");
  }
}

function sameCanonical(left, right) {
  return canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(left)
    === canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(right);
}

function requireVerifiedSourceRightsChild(result) {
  if (!isVerifiedWesternTzdb2026cSourceRightsEvidence(result)) {
    fail("SOURCE_RIGHTS_PRIVATE_BRAND_REQUIRED", "必须消费 source-rights child 真实 WeakSet brand。");
  }
  if (result.evidenceId !== SOURCE_RIGHTS_CHILD.evidenceId
    || result.evidenceDigest !== SOURCE_RIGHTS_CHILD.semanticDigest
    || result.ledgerArtifact?.path !== SOURCE_RIGHTS_CHILD.path
    || result.ledgerArtifact?.rawBytes !== SOURCE_RIGHTS_CHILD.rawBytes
    || result.ledgerArtifact?.rawSha256 !== SOURCE_RIGHTS_CHILD.rawSha256
    || result.sourceBindingsRequired !== 28 || result.sourceBindingsFrozenVerified !== 0
    || result.rightsLegalConclusionEstablished !== false
    || result.releaseReady !== false || result.publicReleaseAuthorized !== false) {
    fail("SOURCE_RIGHTS_IDENTITY_OR_BOUNDARY_DRIFT", "source-rights child 身份或失败关闭边界漂移。");
  }
  return result;
}

function requireVerifiedPredecessorCandidate(result) {
  if (!isVerifiedWesternSourceBindingRequirementsSuccessor(result)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED", "必须消费 v1.1 predecessor candidate 真实 WeakSet brand。");
  }
  if (result.ledgerId !== PREDECESSOR_CANDIDATE.ledgerId
    || result.ledgerDigest !== PREDECESSOR_CANDIDATE.semanticDigest
    || result.artifact?.path !== PREDECESSOR_CANDIDATE.path
    || result.artifact?.rawBytes !== PREDECESSOR_CANDIDATE.rawBytes
    || result.artifact?.rawSha256 !== PREDECESSOR_CANDIDATE.rawSha256
    || result.predecessorArtifact?.path !== FORMAL_CURRENT.path
    || result.predecessorArtifact?.rawBytes !== FORMAL_CURRENT.rawBytes
    || result.predecessorArtifact?.rawSha256 !== FORMAL_CURRENT.rawSha256
    || result.bindingRequired !== 28 || result.bindingFrozenVerified !== 0
    || result.subjectFullySatisfied !== 0 || result.exactQuotesBound !== 0
    || result.successorIsFormalCurrent !== false || result.successorActiveEffect !== "none"
    || result.formalManifestIntegrated !== false || result.formalRegistryIntegrated !== false
    || result.ownerAdmissionAccepted !== false || result.releaseReady !== false
    || result.publicReleaseAuthorized !== false) {
    fail("PREDECESSOR_IDENTITY_OR_BOUNDARY_DRIFT", "v1.1 predecessor candidate 身份或失败关闭边界漂移。");
  }
  if (result.ledger?.status
      !== "requirements_plus_two_partial_candidates_no_bindings_frozen_not_manifest_integrated"
    || !ARRAY_IS_ARRAY(result.ledger?.subjects) || result.ledger.subjects.length !== 28
    || !ARRAY_IS_ARRAY(result.ledger?.candidateEvidenceBindings)
    || result.ledger.candidateEvidenceBindings.length !== 2) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "v1.1 predecessor candidate 合同漂移。");
  }
  return result;
}

function requireFalseExecutionBoundaries(boundaries) {
  if (!boundaries) fail("OBSERVATION_EXECUTION_BOUNDARY_MISSING", "observation execution boundary 缺失。");
  for (let index = 0; index < EXECUTION_FALSE_FIELDS.length; index += 1) {
    const field = EXECUTION_FALSE_FIELDS[index];
    if (boundaries[field] !== false) {
      fail("OBSERVATION_EXECUTION_PROMOTION", "observation " + field + " 必须保持 false。");
    }
  }
}

function requireVerifiedObservationChild(result) {
  if (!isVerifiedWesternTzdb2026cControlledReproductionObservation(result)) {
    fail("OBSERVATION_PRIVATE_BRAND_REQUIRED", "必须消费 controlled reproduction child 真实 WeakSet brand。");
  }
  if (result.observationId !== OBSERVATION_CHILD.observationId
    || result.observationDigest !== OBSERVATION_CHILD.semanticDigest
    || result.ledgerArtifact?.path !== OBSERVATION_CHILD.path
    || result.ledgerArtifact?.rawBytes !== OBSERVATION_CHILD.rawBytes
    || result.ledgerArtifact?.rawSha256 !== OBSERVATION_CHILD.rawSha256
    || result.sourceBindingsRequired !== 28 || result.sourceBindingsFrozenVerified !== 0
    || result.observationSubjectsTotal !== 2 || result.observationSubjectsFullySatisfied !== 0
    || result.transformationProvenanceEstablished !== false
    || result.rightsLegalConclusionEstablished !== false
    || result.releaseReady !== false || result.publicReleaseAuthorized !== false) {
    fail("OBSERVATION_IDENTITY_OR_BOUNDARY_DRIFT", "controlled reproduction child 身份或失败关闭边界漂移。");
  }
  requireFalseExecutionBoundaries(result.ledger?.executionBoundaries);
  const observations = result.ledger?.subjectObservations;
  if (!ARRAY_IS_ARRAY(observations) || observations.length !== 2
    || observations[0]?.subjectId !== CALENDAR_SUBJECT_ID
    || observations[0]?.observationCandidateId !== CALENDAR_OBSERVATION_CANDIDATE_ID
    || observations[1]?.subjectId !== RIGHTS_SUBJECT_ID
    || observations[1]?.observationCandidateId !== RIGHTS_OBSERVATION_CANDIDATE_ID) {
    fail("OBSERVATION_SUBJECT_DRIFT", "controlled reproduction child 的两个 subject/candidate 漂移。");
  }
  for (let index = 0; index < observations.length; index += 1) {
    const entry = observations[index];
    if (entry.evidenceState !== "partial_observation_candidate_only"
      || entry.subjectFullySatisfied !== false || entry.frozenBindingId !== null
      || entry.transformationProvenanceEstablished !== false
      || entry.countsTowardFrozenBindingGate !== false) {
      fail("OBSERVATION_SUBJECT_PROMOTION", "controlled reproduction subject 不得升格。");
    }
  }
  const probe = result.ledger?.operatorRecordedProbe;
  if (probe?.twoSuccessfulRunsByteExact !== true
    || !ARRAY_IS_ARRAY(probe.successfulRuns) || probe.successfulRuns.length !== 2) {
    fail("OBSERVATION_TWO_RUN_DRIFT", "operator-recorded two-run byte-exact 观察漂移。");
  }
  if (result.ledger?.observationWindow?.rawProbeReceiptPersisted !== false
    || result.ledger.observationWindow.probeRunnerPersisted !== false
    || result.ledger.observationWindow.probeFullWindow !== "unavailable_not_sampled"
    || result.ledger?.cleanupAndStorageBoundary?.rawProbeReceiptPersisted !== false
    || result.ledger.cleanupAndStorageBoundary.probeRunnerPersisted !== false
    || result.ledger.cleanupAndStorageBoundary.workspaceWideAbsenceMechanicallyVerified !== false
    || result.ledger.cleanupAndStorageBoundary.remoteBodiesPersistedInThisRecord !== 0
    || result.ledger?.snapshotBoundary?.crossFileAtomicSnapshotEstablished !== false
    || result.ledger.snapshotBoundary.mutationEpochReceipt !== null
    || result.ledger.snapshotBoundary.intervalMutationExcluded !== false
    || result.ledger.snapshotBoundary.abaExcluded !== false
    || result.ledger?.formalIntegration?.activeEffect !== "none") {
    fail("OBSERVATION_RECEIPT_OR_INTEGRITY_PROMOTION", "receipt、runner、snapshot 或 active effect 边界漂移。");
  }
  return result;
}

function crossCheckSourceRightsChain(predecessor, observation, sourceRights) {
  const expected = {
    path: SOURCE_RIGHTS_CHILD.path,
    rawBytes: SOURCE_RIGHTS_CHILD.rawBytes,
    rawSha256: SOURCE_RIGHTS_CHILD.rawSha256,
    evidenceId: SOURCE_RIGHTS_CHILD.evidenceId,
    evidenceDigest: SOURCE_RIGHTS_CHILD.semanticDigest
  };
  const predecessorBinding = predecessor.ledger?.childEvidenceBinding;
  const observationBinding = observation.ledger?.sourceRightsChild;
  if (!predecessorBinding || !observationBinding
    || predecessorBinding.path !== expected.path
    || predecessorBinding.rawBytes !== expected.rawBytes
    || predecessorBinding.rawSha256 !== expected.rawSha256
    || predecessorBinding.evidenceId !== expected.evidenceId
    || predecessorBinding.evidenceDigest !== expected.evidenceDigest
    || observationBinding.path !== expected.path
    || observationBinding.rawBytes !== expected.rawBytes
    || observationBinding.rawSha256 !== expected.rawSha256
    || observationBinding.evidenceId !== expected.evidenceId
    || observationBinding.evidenceDigest !== expected.evidenceDigest
    || sourceRights.ledgerArtifact.path !== expected.path
    || sourceRights.ledgerArtifact.rawBytes !== expected.rawBytes
    || sourceRights.ledgerArtifact.rawSha256 !== expected.rawSha256) {
    fail("SOURCE_RIGHTS_CHAIN_DRIFT", "v1.1、observation 与 source-rights child 身份链不一致。");
  }
}

function observationProjection(childObservation) {
  return {
    observationCandidateId: childObservation.observationCandidateId,
    evidenceState: childObservation.evidenceState,
    observationArtifact: {
      path: OBSERVATION_CHILD.path,
      rawBytes: OBSERVATION_CHILD.rawBytes,
      rawSha256: OBSERVATION_CHILD.rawSha256,
      observationId: OBSERVATION_CHILD.observationId,
      observationDigest: OBSERVATION_CHILD.semanticDigest
    },
    operatorRecordedTwoRunByteExactObservation: true,
    transformationProvenanceEstablished: false,
    subjectFullySatisfied: false,
    frozenBindingId: null,
    countsTowardFrozenBindingGate: false
  };
}

function successorSubject(predecessorSubject, childObservation) {
  const copy = trustedCopy(predecessorSubject);
  if (childObservation === null) return copy;
  OBJECT_DEFINE_PROPERTY(copy, "controlledReproductionObservation", {
    value: observationProjection(childObservation),
    enumerable: true,
    configurable: true,
    writable: true
  });
  return copy;
}

function buildBoundaryConsumption(observation) {
  const ledger = observation.ledger;
  return {
    status: ledger.status,
    operatorRecordedPointInTimeOnly: true,
    operatorRecordedTwoRunByteExactObservation: ledger.operatorRecordedProbe.twoSuccessfulRunsByteExact,
    successfulRunsObserved: ledger.operatorRecordedProbe.successfulRuns.length,
    executionBoundaries: trustedCopy(ledger.executionBoundaries),
    receiptRunnerReplayBoundary: {
      probeFullWindow: ledger.observationWindow.probeFullWindow,
      fullWindowFabricated: ledger.observationWindow.fullWindowFabricated,
      rawProbeReceiptPersisted: ledger.observationWindow.rawProbeReceiptPersisted,
      probeRunnerPersisted: ledger.observationWindow.probeRunnerPersisted,
      probeReceiptCryptographicallyAttested:
        ledger.executionBoundaries.probeReceiptCryptographicallyAttested,
      replayableFromThisRecordAlone: ledger.executionBoundaries.replayableFromThisRecordAlone
    },
    cleanupStorageBoundary: {
      remoteBodiesPersistedInThisRecord:
        ledger.cleanupAndStorageBoundary.remoteBodiesPersistedInThisRecord,
      rawProbeReceiptPersisted: ledger.cleanupAndStorageBoundary.rawProbeReceiptPersisted,
      probeRunnerPersisted: ledger.cleanupAndStorageBoundary.probeRunnerPersisted,
      workspaceWideAbsenceMechanicallyVerified:
        ledger.cleanupAndStorageBoundary.workspaceWideAbsenceMechanicallyVerified
    },
    rightsContentExpertReleaseBoundary: {
      rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
      redistributionAuthorized: ledger.gateSummary.redistributionAuthorized,
      contentTruthEstablished: ledger.gateSummary.contentTruthEstablished,
      expertTruthEstablished: ledger.gateSummary.expertTruthEstablished,
      independentEngineeringReviewsVerified:
        ledger.gateSummary.independentEngineeringReviewsVerified,
      independentDomainExpertReviewsVerified:
        ledger.gateSummary.independentDomainExpertReviewsVerified,
      expertOpinionsVerified: ledger.gateSummary.expertOpinionsVerified,
      releaseReady: ledger.gateSummary.releaseReady,
      publicDeploymentAuthorized: ledger.gateSummary.publicDeploymentAuthorized,
      publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized
    }
  };
}

export function buildExpectedWesternSourceBindingRequirementsSuccessorV12(
  predecessorResult,
  observationResult,
  sourceRightsResult
) {
  const predecessor = requireVerifiedPredecessorCandidate(predecessorResult);
  const observation = requireVerifiedObservationChild(observationResult);
  const sourceRights = requireVerifiedSourceRightsChild(sourceRightsResult);
  crossCheckSourceRightsChain(predecessor, observation, sourceRights);
  const observationBySubject = OBJECT_CREATE(null);
  const childObservations = observation.ledger.subjectObservations;
  for (let index = 0; index < childObservations.length; index += 1) {
    const entry = childObservations[index];
    OBJECT_DEFINE_PROPERTY(observationBySubject, entry.subjectId, {
      value: entry,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  const subjects = [];
  for (let index = 0; index < predecessor.ledger.subjects.length; index += 1) {
    const subject = predecessor.ledger.subjects[index];
    const childObservation = observationBySubject[subject.subjectId] ?? null;
    REFLECT_APPLY(ARRAY_PUSH, subjects, [successorSubject(subject, childObservation)]);
  }
  const unsigned = {
    schemaVersion: "1.2.0",
    recordType: "independent_system_source_binding_requirements_successor_observation_candidate",
    ledgerId: LEDGER_ID,
    productSystemId: predecessor.ledger.productSystemId,
    contractSystemId: predecessor.ledger.contractSystemId,
    status:
      "nonformal_successor_two_partial_source_candidates_plus_two_partial_observations_no_bindings_frozen",
    createdAt: CREATED_AT,
    releaseGovernance: trustedCopy(predecessor.ledger.releaseGovernance),
    formalCurrentBinding: {
      path: FORMAL_CURRENT.path,
      rawBytes: FORMAL_CURRENT.rawBytes,
      rawSha256: FORMAL_CURRENT.rawSha256,
      ledgerId: FORMAL_CURRENT.ledgerId,
      ledgerDigest: FORMAL_CURRENT.semanticDigest,
      remainsFormalCurrent: true
    },
    predecessorCandidateBinding: {
      path: PREDECESSOR_CANDIDATE.path,
      rawBytes: PREDECESSOR_CANDIDATE.rawBytes,
      rawSha256: PREDECESSOR_CANDIDATE.rawSha256,
      ledgerId: PREDECESSOR_CANDIDATE.ledgerId,
      ledgerDigest: PREDECESSOR_CANDIDATE.semanticDigest,
      privateBrandRequiredAtVerification: true,
      isFormalCurrent: false,
      remainsFormalCurrent: false,
      activeEffect: "none"
    },
    controlledReproductionObservationBinding: {
      path: OBSERVATION_CHILD.path,
      rawBytes: OBSERVATION_CHILD.rawBytes,
      rawSha256: OBSERVATION_CHILD.rawSha256,
      observationId: OBSERVATION_CHILD.observationId,
      observationDigest: OBSERVATION_CHILD.semanticDigest,
      privateBrandRequiredAtVerification: true,
      isFormalCurrent: false,
      activeEffect: "none"
    },
    sourceRightsIdentityChain: {
      path: SOURCE_RIGHTS_CHILD.path,
      rawBytes: SOURCE_RIGHTS_CHILD.rawBytes,
      rawSha256: SOURCE_RIGHTS_CHILD.rawSha256,
      evidenceId: SOURCE_RIGHTS_CHILD.evidenceId,
      evidenceDigest: SOURCE_RIGHTS_CHILD.semanticDigest,
      privateBrandRequiredAtVerification: true,
      v11AndObservationReferenceSameChild: true,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false
    },
    formalStateBoundary: {
      formalCurrentIsV1: true,
      v11PredecessorCandidateIsFormalCurrent: false,
      v12SuccessorIsFormalCurrent: false,
      v12SuccessorActiveEffect: "none",
      formalParentConsumptionEstablished: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      formalCurrentMutated: false,
      predecessorCandidateMutated: false,
      formalCurrentBacklinkAdded: false,
      predecessorCandidateBacklinkAdded: false
    },
    defaultClosureRequirements: trustedCopy(predecessor.ledger.defaultClosureRequirements),
    basisArtifacts: trustedCopy(predecessor.ledger.basisArtifacts),
    candidateEvidenceBindings: trustedCopy(predecessor.ledger.candidateEvidenceBindings),
    controlledReproductionBoundaryConsumption: buildBoundaryConsumption(observation),
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
      controlledReproductionObservationSubjectsTotal: 2,
      controlledReproductionObservationSubjectsFullySatisfied: 0,
      partialControlledReproductionObservationCandidatesAttached: 2,
      operatorRecordedTwoRunByteExactObservation: true,
      transformationProvenanceEstablished: false,
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
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      browserRuntimeValidated: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence:
        "v11_raw_semantics_and_26_unchanged_subjects_plus_two_operator_recorded_observations_verified",
      browserRuntimeEvidence: "not_assessed",
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
    doesNotEstablish: trustedCopy(DOES_NOT_ESTABLISH)
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeWesternSourceBindingRequirementsSuccessorV12Digest(unsigned)
  });
}

function assertBoundaryConsumption(ledger) {
  const consumption = ledger?.controlledReproductionBoundaryConsumption;
  if (!consumption
    || consumption.status
      !== "operator_recorded_point_in_time_two_run_byte_exact_observation_candidate_only"
    || consumption.operatorRecordedPointInTimeOnly !== true
    || consumption.operatorRecordedTwoRunByteExactObservation !== true
    || consumption.successfulRunsObserved !== 2) {
    fail("OBSERVATION_CONSUMPTION_DRIFT", "受控重放只能作为 two-run operator observation 被消费。");
  }
  requireFalseExecutionBoundaries(consumption.executionBoundaries);
  const receipt = consumption.receiptRunnerReplayBoundary;
  if (!receipt || receipt.probeFullWindow !== "unavailable_not_sampled"
    || receipt.fullWindowFabricated !== false
    || receipt.rawProbeReceiptPersisted !== false
    || receipt.probeRunnerPersisted !== false
    || receipt.probeReceiptCryptographicallyAttested !== false
    || receipt.replayableFromThisRecordAlone !== false) {
    fail("RECEIPT_RUNNER_REPLAY_PROMOTION", "receipt、runner、full window 与 replay 必须保持 false/不可用。");
  }
  const cleanup = consumption.cleanupStorageBoundary;
  if (!cleanup || cleanup.remoteBodiesPersistedInThisRecord !== 0
    || cleanup.rawProbeReceiptPersisted !== false
    || cleanup.probeRunnerPersisted !== false
    || cleanup.workspaceWideAbsenceMechanicallyVerified !== false) {
    fail("CLEANUP_STORAGE_PROMOTION", "清理和存储结论不得扩展为 workspace-wide 机械证明。");
  }
  const truth = consumption.rightsContentExpertReleaseBoundary;
  if (!truth || truth.rightsLegalConclusionEstablished !== false
    || truth.redistributionAuthorized !== false
    || truth.contentTruthEstablished !== false || truth.expertTruthEstablished !== false
    || truth.independentEngineeringReviewsVerified !== 0
    || truth.independentDomainExpertReviewsVerified !== 0
    || truth.expertOpinionsVerified !== 0 || truth.releaseReady !== false
    || truth.publicDeploymentAuthorized !== false
    || truth.publicReleaseAuthorized !== false) {
    fail("TRUTH_RIGHTS_RELEASE_PROMOTION", "权利、内容、专家与发布账必须保持失败关闭。");
  }
}

function assertFailClosed(ledger) {
  if (ledger?.releaseGovernance?.activeLine !== "legacy-v13"
    || ledger.releaseGovernance.targetSchema !== 13
    || ledger.releaseGovernance.migrationId !== null
    || ledger.releaseGovernance.mutationEpochBoundaryRequired !== true
    || ledger.releaseGovernance.expertClaimsAuthorized !== false
    || ledger.releaseGovernance.publicDeploymentAuthorized !== false) {
    fail("RELEASE_GOVERNANCE_DRIFT", "必须固定 legacy-v13 / targetSchema 13 / migrationId null 并保持授权关闭。");
  }
  const formal = ledger?.formalStateBoundary;
  if (!formal || formal.formalCurrentIsV1 !== true
    || formal.v11PredecessorCandidateIsFormalCurrent !== false
    || formal.v12SuccessorIsFormalCurrent !== false
    || formal.v12SuccessorActiveEffect !== "none"
    || formal.formalParentConsumptionEstablished !== false
    || formal.formalManifestIntegrated !== false
    || formal.formalRegistryIntegrated !== false
    || formal.ownerAdmissionAccepted !== false
    || formal.formalCurrentMutated !== false
    || formal.predecessorCandidateMutated !== false
    || formal.formalCurrentBacklinkAdded !== false
    || formal.predecessorCandidateBacklinkAdded !== false) {
    fail("FORMAL_STATE_PROMOTION_FORBIDDEN", "formal v1 必须保持唯一 current，v1.1/v1.2 都是 nonformal candidate。");
  }
  if (ledger?.formalCurrentBinding?.remainsFormalCurrent !== true
    || ledger.formalCurrentBinding.ledgerId !== FORMAL_CURRENT.ledgerId
    || ledger.formalCurrentBinding.ledgerDigest !== FORMAL_CURRENT.semanticDigest
    || ledger?.predecessorCandidateBinding?.isFormalCurrent !== false
    || ledger.predecessorCandidateBinding.remainsFormalCurrent !== false
    || ledger.predecessorCandidateBinding.activeEffect !== "none"
    || ledger?.controlledReproductionObservationBinding?.isFormalCurrent !== false
    || ledger.controlledReproductionObservationBinding.activeEffect !== "none") {
    fail("THREE_ACCOUNT_BOUNDARY_DRIFT", "formal current、predecessor candidate 与 observation 三账混淆。");
  }
  const gate = ledger?.gateSummary;
  if (!gate || gate.bindingRequired !== 28 || gate.bindingFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.sourceCandidatesAttached !== 2
    || gate.subjectFullySatisfied !== 0 || gate.sourceBodiesBound !== 0
    || gate.minimalExactQuotesStored !== 3
    || gate.minimalExactQuoteObservationsAttached !== 3
    || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 2
    || gate.controlledReproductionObservationSubjectsTotal !== 2
    || gate.controlledReproductionObservationSubjectsFullySatisfied !== 0
    || gate.partialControlledReproductionObservationCandidatesAttached !== 2
    || gate.operatorRecordedTwoRunByteExactObservation !== true
    || gate.transformationProvenanceEstablished !== false
    || gate.remoteBodiesPersistedInThisSuccessorRecord !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.editionRightsEstablished !== 0 || gate.carrierRightsEstablished !== 0
    || gate.expertReviewedSubjects !== 0 || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.sourceBundleComplete !== false || gate.rightsBundleComplete !== false
    || gate.expertReviewBundleComplete !== false
    || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.contentTruthEstablished !== false
    || gate.expertTruthEstablished !== false || gate.browserRuntimeValidated !== false
    || gate.formalManifestIntegrated !== false || gate.formalRegistryIntegrated !== false
    || gate.ownerAdmissionAccepted !== false || gate.releaseReady !== false
    || gate.publicDeploymentAuthorized !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "v1.2 必须保持 0/28、0/2 及权利/专家/内容/发布失败关闭。");
  }
  const integrity = ledger?.integrityBoundary;
  if (!integrity || integrity.perFileHeldHandleStableReadsUsed !== true
    || integrity.strictDuplicateKeyRejectingJsonUsed !== true
    || integrity.exclusiveCreateWriterRequired !== true
    || integrity.canonicalPrettyJsonWithLfRequired !== true
    || integrity.domainSeparatedDigestIsDigitalSignature !== false
    || integrity.crossFileAtomicSnapshotEstablished !== false
    || integrity.mutationEpochAvailable !== false
    || integrity.mutationEpochReceipt !== null
    || integrity.intervalMutationExcludedAcrossFiles !== false
    || integrity.abaExcluded !== false) {
    fail("INTEGRITY_OVERCLAIM_FORBIDDEN", "不得声称跨文件原子、mutation epoch、区间完整性或 ABA 排除。");
  }
  assertBoundaryConsumption(ledger);
}

function assertSubjectsAgainstPredecessor(predecessor, successor) {
  if (!ARRAY_IS_ARRAY(predecessor?.subjects) || predecessor.subjects.length !== 28
    || !ARRAY_IS_ARRAY(successor?.subjects) || successor.subjects.length !== 28) {
    fail("SUBJECT_INVENTORY_DRIFT", "v1.1 与 v1.2 都必须保持精确 28 subject。");
  }
  let changed = 0;
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = successor.subjects[index];
    if (before.subjectId !== after?.subjectId) {
      fail("SUBJECT_ORDER_DRIFT", "v1.2 subject 顺序或身份漂移。");
    }
    const target = before.subjectId === CALENDAR_SUBJECT_ID
      || before.subjectId === RIGHTS_SUBJECT_ID;
    if (!target) {
      if (!sameCanonical(before, after)) {
        fail("NON_TARGET_SUBJECT_DRIFT", "26 个非目标 subject 必须与 v1.1 canonical-exact。");
      }
      continue;
    }
    changed += 1;
    const stripped = trustedCopy(after);
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, stripped, ["controlledReproductionObservation"])) {
      fail("TARGET_OBSERVATION_MISSING", "两个目标 subject 必须追加 observation 字段。");
    }
    delete stripped.controlledReproductionObservation;
    if (!sameCanonical(before, stripped)) {
      fail("TARGET_EXISTING_FIELDS_DRIFT", "目标 subject 除 observation 追加字段外必须与 v1.1 canonical-exact。");
    }
    const observation = after.controlledReproductionObservation;
    const expectedCandidate = before.subjectId === CALENDAR_SUBJECT_ID
      ? CALENDAR_OBSERVATION_CANDIDATE_ID
      : RIGHTS_OBSERVATION_CANDIDATE_ID;
    if (observation?.observationCandidateId !== expectedCandidate
      || observation.evidenceState !== "partial_observation_candidate_only"
      || observation.operatorRecordedTwoRunByteExactObservation !== true
      || observation.transformationProvenanceEstablished !== false
      || observation.subjectFullySatisfied !== false
      || observation.frozenBindingId !== null
      || observation.countsTowardFrozenBindingGate !== false
      || observation.observationArtifact?.path !== OBSERVATION_CHILD.path
      || observation.observationArtifact?.rawBytes !== OBSERVATION_CHILD.rawBytes
      || observation.observationArtifact?.rawSha256 !== OBSERVATION_CHILD.rawSha256
      || observation.observationArtifact?.observationId !== OBSERVATION_CHILD.observationId
      || observation.observationArtifact?.observationDigest !== OBSERVATION_CHILD.semanticDigest
      || after.bindingState !== "candidate_only_unbound"
      || after.frozenBindingId !== null || after.sourceBodyDigest !== null
      || after.workRightsEstablished !== false || after.editionRightsEstablished !== false
      || after.carrierRightsEstablished !== false
      || after.rightsLegalConclusion !== "not_established"
      || !ARRAY_IS_ARRAY(after.expertReviewIds) || after.expertReviewIds.length !== 0
      || after.subjectFullySatisfied !== false
      || after.countsTowardFrozenBindingGate !== false) {
      fail("TARGET_OBSERVATION_PROMOTION", "两个目标 subject 只能追加 partial observation 且保持 unbound/unsatisfied。");
    }
  }
  if (changed !== 2) fail("SUBJECT_CHANGE_COUNT_DRIFT", "v1.2 必须且只能改变两个 target subject。");
}

export function verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
  input,
  predecessorResult,
  observationResult,
  sourceRightsResult
) {
  const ledger = capturePassiveJson(input);
  const predecessor = requireVerifiedPredecessorCandidate(predecessorResult);
  const observation = requireVerifiedObservationChild(observationResult);
  const sourceRights = requireVerifiedSourceRightsChild(sourceRightsResult);
  crossCheckSourceRightsChain(predecessor, observation, sourceRights);
  assertFailClosed(ledger);
  assertSubjectsAgainstPredecessor(predecessor.ledger, ledger);
  if (!sameCanonical(ledger.candidateEvidenceBindings, predecessor.ledger.candidateEvidenceBindings)) {
    fail("SOURCE_CANDIDATE_BINDINGS_DRIFT", "v1.1 source candidate/quote/rights 字段必须原样保留。");
  }
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "v1.2 ledgerDigest 必须是小写 SHA-256。");
  }
  if (computeWesternSourceBindingRequirementsSuccessorV12Digest(ledger)
      !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "v1.2 domain-separated digest 不匹配。");
  }
  const expected = buildExpectedWesternSourceBindingRequirementsSuccessorV12(
    predecessor,
    observation,
    sourceRights
  );
  if (!sameCanonical(ledger, expected)) {
    fail("SUCCESSOR_V12_CONTRACT_MISMATCH", "v1.2 与固定三账、observation 红线及零生效合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeWesternSourceBindingRequirementsSuccessorV12(ledger) {
  const snapshot = capturePassiveJson(ledger);
  assertFailClosed(snapshot);
  if (computeWesternSourceBindingRequirementsSuccessorV12Digest(snapshot)
      !== snapshot.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "v1.2 序列化前摘要不匹配。");
  }
  return JSON_STRINGIFY(prettySafeValue(snapshot), null, 2) + "\n";
}

function assertNoBacklinkText(text, label) {
  const needles = [
    LEDGER_ID,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
    OBSERVATION_CHILD.observationId,
    OBSERVATION_CHILD.path
  ];
  for (let index = 0; index < needles.length; index += 1) {
    if (REFLECT_APPLY(STRING_INCLUDES, text, [needles[index]])) {
      fail("UPSTREAM_BACKLINK_FORBIDDEN", label + " 不得反向消费 v1.2 或 observation child。");
    }
  }
}

async function scanFormalContextsAndPredecessorForBacklinks(workspaceRoot) {
  const formalSnapshots = [];
  for (let index = 0; index < FORMAL_CONTEXTS.length; index += 1) {
    const expected = FORMAL_CONTEXTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    let parsed;
    try {
      parsed = parseBaziDttStrictJsonArtifact(snapshot);
    } catch (cause) {
      fail("FORMAL_CONTEXT_JSON_INVALID", expected.role + " 不是严格 JSON。", cause);
    }
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest) {
      fail("FORMAL_CONTEXT_SEMANTIC_DRIFT", expected.role + " semantic identity 漂移。");
    }
    assertNoBacklinkText(decodeUtf8(snapshot.bytes, expected.role), expected.role);
    REFLECT_APPLY(ARRAY_PUSH, formalSnapshots, [snapshot]);
  }
  const predecessorSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    PREDECESSOR_CANDIDATE.path
  );
  assertArtifactIdentity(predecessorSnapshot, PREDECESSOR_CANDIDATE, "v1.1 predecessor candidate");
  let predecessorParsed;
  try {
    predecessorParsed = parseBaziDttStrictJsonArtifact(predecessorSnapshot);
  } catch (cause) {
    fail("PREDECESSOR_JSON_INVALID", "v1.1 predecessor candidate 不是严格 JSON。", cause);
  }
  if (predecessorParsed?.ledgerId !== PREDECESSOR_CANDIDATE.ledgerId
    || predecessorParsed?.ledgerDigest !== PREDECESSOR_CANDIDATE.semanticDigest) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "v1.1 predecessor candidate semantic identity 漂移。");
  }
  assertNoBacklinkText(
    decodeUtf8(predecessorSnapshot.bytes, "v1.1 predecessor candidate"),
    "v1.1 predecessor candidate"
  );
  return OBJECT_FREEZE({ formalSnapshots, predecessorSnapshot });
}

async function loadUpstreams(workspaceRoot) {
  const predecessor = requireVerifiedPredecessorCandidate(
    await loadWesternSourceBindingRequirementsSuccessor(workspaceRoot)
  );
  const observation = requireVerifiedObservationChild(
    await loadWesternTzdb2026cControlledReproductionObservation(workspaceRoot)
  );
  const sourceRights = requireVerifiedSourceRightsChild(
    await loadWesternTzdb2026cSourceRightsEvidence(workspaceRoot)
  );
  crossCheckSourceRightsChain(predecessor, observation, sourceRights);
  const backlinks = await scanFormalContextsAndPredecessorForBacklinks(workspaceRoot);
  return OBJECT_FREEZE({ predecessor, observation, sourceRights, backlinks });
}

export async function buildCurrentWesternSourceBindingRequirementsSuccessorV12(
  workspaceRoot = process.cwd()
) {
  const upstreams = await loadUpstreams(workspaceRoot);
  return buildExpectedWesternSourceBindingRequirementsSuccessorV12(
    upstreams.predecessor,
    upstreams.observation,
    upstreams.sourceRights
  );
}

export async function loadWesternSourceBindingRequirementsSuccessorV12(
  workspaceRoot = process.cwd()
) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0
    || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)
    || EXPECTED_PERSISTED_RAW.rawSha256
      === "0000000000000000000000000000000000000000000000000000000000000000") {
    fail("PERSISTED_IDENTITY_UNSET", "v1.2 raw identity 尚未冻结。");
  }
  const upstreams = await loadUpstreams(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("SUCCESSOR_V12_RAW_IDENTITY_DRIFT", "v1.2 raw identity 漂移。");
  }
  const parsed = parseWesternSourceBindingRequirementsSuccessorV12JsonBytes(
    snapshot.bytes,
    snapshot.path
  );
  const ledger = verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
    parsed,
    upstreams.predecessor,
    upstreams.observation,
    upstreams.sourceRights
  );
  if (decodeUtf8(snapshot.bytes, "western source requirements successor v1.2")
      !== serializeWesternSourceBindingRequirementsSuccessorV12(ledger)) {
    fail("SUCCESSOR_V12_CANONICAL_BYTES_DRIFT", "v1.2 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const formalContextArtifacts = [];
  for (let index = 0; index < upstreams.backlinks.formalSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, formalContextArtifacts, [
      publicIdentity(upstreams.backlinks.formalSnapshots[index])
    ]);
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    formalCurrentIsV1: ledger.formalStateBoundary.formalCurrentIsV1,
    v11PredecessorCandidateIsFormalCurrent:
      ledger.formalStateBoundary.v11PredecessorCandidateIsFormalCurrent,
    v12SuccessorIsFormalCurrent: ledger.formalStateBoundary.v12SuccessorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.v12SuccessorActiveEffect,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    observationSubjectsTotal:
      ledger.gateSummary.controlledReproductionObservationSubjectsTotal,
    observationSubjectsFullySatisfied:
      ledger.gateSummary.controlledReproductionObservationSubjectsFullySatisfied,
    transformationProvenanceEstablished:
      ledger.gateSummary.transformationProvenanceEstablished,
    exactQuotesBound: ledger.gateSummary.exactQuotesBound,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    contentTruthEstablished: ledger.gateSummary.contentTruthEstablished,
    expertTruthEstablished: ledger.gateSummary.expertTruthEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicDeploymentAuthorized: ledger.gateSummary.publicDeploymentAuthorized,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: publicIdentity(snapshot),
    formalCurrentArtifact: publicIdentity(upstreams.backlinks.formalSnapshots[0]),
    predecessorCandidateArtifact: publicIdentity(upstreams.backlinks.predecessorSnapshot),
    observationArtifact: upstreams.observation.ledgerArtifact,
    sourceRightsArtifact: upstreams.sourceRights.ledgerArtifact,
    formalContextArtifacts,
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternSourceBindingRequirementsSuccessorV12(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernSourceBindingRequirementsSuccessorV12TestOnly = OBJECT_FREEZE({
  DIGEST_DOMAIN,
  LEDGER_ID,
  CREATED_AT,
  FORMAL_CURRENT,
  PREDECESSOR_CANDIDATE,
  OBSERVATION_CHILD,
  SOURCE_RIGHTS_CHILD,
  FORMAL_CONTEXTS,
  EXPECTED_PERSISTED_RAW,
  EXECUTION_FALSE_FIELDS,
  DOES_NOT_ESTABLISH,
  CALENDAR_SUBJECT_ID,
  RIGHTS_SUBJECT_ID,
  CALENDAR_OBSERVATION_CANDIDATE_ID,
  RIGHTS_OBSERVATION_CANDIDATE_ID,
  assertNoBacklinkText,
  requireVerifiedPredecessorCandidate,
  requireVerifiedObservationChild,
  requireVerifiedSourceRightsChild,
  scanFormalContextsAndPredecessorForBacklinks
});
