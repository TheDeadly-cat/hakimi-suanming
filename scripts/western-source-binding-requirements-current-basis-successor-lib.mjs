import { createHash } from "node:crypto";
import { Buffer as NodeBuffer } from "node:buffer";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH,
  canonicalStringifyWesternCurrentBasisLicenseCarrierChild,
  isVerifiedWesternCurrentBasisLicenseCarrierChild,
  loadWesternCurrentBasisLicenseCarrierChild
} from "./western-current-basis-license-carrier-observation-child-lib.mjs";

export const WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/western-source-binding-requirements.v1.3.0.json";

const LEDGER_ID = "hakimi.western-astrology.source-binding-requirements/1.3.0";
const RECORD_TYPE =
  "independent_system_source_binding_requirements_current_basis_successor_candidate";
const STATUS =
  "nonformal_current_basis_plus_one_partial_engine_license_carrier_candidate_no_bindings_frozen";
const CREATED_AT = "2026-09-01T13:22:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.western.source-binding-requirements.current-basis-successor-candidate.v1.3\0";
const TARGET_SUBJECT_ID = "western.rights.engine-code-and-distribution";
const CANDIDATE_ID =
  "western-current-basis-declared-engine-license-carrier-candidate-v1";
const SHA256 = /^[0-9a-f]{64}$/u;

const FORMAL_V1 = Object.freeze({
  path: "content/system-admission/western-source-binding-requirements.v1.json",
  rawBytes: 25_909,
  rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.0.0",
  ledgerDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
  digestDomain: ""
});

const HISTORICAL_V11 = Object.freeze({
  path: "content/system-admission/western-source-binding-requirements.v1.1.0.json",
  rawBytes: 34_338,
  rawSha256: "7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.1.0",
  ledgerDigest: "254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db",
  digestDomain: "hakimi-western-source-binding-requirements-successor-candidate-v1\0"
});

const HISTORICAL_V12 = Object.freeze({
  path: "content/system-admission/western-source-binding-requirements.v1.2.0.json",
  rawBytes: 40_667,
  rawSha256: "e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.2.0",
  ledgerDigest: "91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58",
  digestDomain: "hakimi-western-source-binding-requirements-successor-candidate-v1.2\0"
});

const CHILD = Object.freeze({
  path: WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH,
  rawBytes: 14_068,
  rawSha256: "abde812040df2f8589ce20b31ede147253a18e8656332cdc8c17255de1ccbb2d",
  childId: "hakimi.western.current-basis-license-carrier-observation-child/1.0.0",
  childDigest: "5f752ba6bad7d9411993907ed93ce6b5d665e8ecae2b467907dc71761e9a4c25"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 37_140,
  rawSha256: "08418368dfc668cc59f7814a88e2b629bfda5867b69c264a42483951b469eb67"
});

const REFLECT_APPLY = Reflect.apply;
const NATIVE_JSON = JSON;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_SET_PROTOTYPE_OF = Object.setPrototypeOf;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const BUFFER_FROM = NodeBuffer.from;
const BUFFER_TO_STRING = NodeBuffer.prototype.toString;
const VERIFIED_CONTEXTS = new NATIVE_WEAK_SET();
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class WesternSourceBindingCurrentBasisSuccessorError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternSourceBindingCurrentBasisSuccessorError";
    this.code = code;
    this.safeForCli = true;
  }
}

function fail(code, message, cause) {
  throw new WesternSourceBindingCurrentBasisSuccessorError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function canonical(value) {
  return canonicalStringifyWesternCurrentBasisLicenseCarrierChild(value);
}

export function canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(value) {
  return canonical(value);
}

function capture(value) {
  return REFLECT_APPLY(JSON_PARSE, NATIVE_JSON, [canonical(value)]);
}

function nullPrototypes(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) nullPrototypes(value[keys[index]], seen);
  REFLECT_APPLY(OBJECT_SET_PROTOTYPE_OF, Object, [value, null]);
  return value;
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) deepFreeze(value[keys[index]], seen);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function pretty(value) {
  const passive = nullPrototypes(capture(value));
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [passive, null, 2]) + "\n";
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [REFLECT_APPLY(BUFFER_FROM, NodeBuffer, [value, "utf8"])]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function unsignedLedger(value) {
  const snapshot = capture(value);
  delete snapshot.ledgerDigest;
  return snapshot;
}

function computeWithDomain(value, domain) {
  return sha256Text(domain + canonical(unsignedLedger(value)));
}

export function computeWesternSourceBindingCurrentBasisSuccessorDigest(value) {
  return computeWithDomain(value, DIGEST_DOMAIN);
}

function exact(left, right) {
  return canonical(left) === canonical(right);
}

function strictJson(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail(cause?.code ?? "STRICT_JSON_INVALID", label + " is not strict JSON.", cause);
  }
}

function publicIdentity(snapshot) {
  return { path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 };
}

function assertArtifact(snapshot, spec, label) {
  if (snapshot.path !== spec.path || snapshot.rawBytes !== spec.rawBytes
    || snapshot.rawSha256 !== spec.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", label + " raw identity drifted.");
  }
}

function assertSelfDigest(ledger, spec, label) {
  if (ledger?.ledgerId !== spec.ledgerId || ledger?.ledgerDigest !== spec.ledgerDigest
    || computeWithDomain(ledger, spec.digestDomain) !== spec.ledgerDigest) {
    fail("UPSTREAM_SELF_DIGEST_DRIFT", label + " self digest drifted.");
  }
}

function assertHistoricalBoundaries(formal, v11, v12) {
  if (formal.status !== "requirements_only_no_bindings_frozen"
    || formal?.gateSummary?.bindingRequired !== 28
    || formal?.gateSummary?.bindingFrozenVerified !== 0
    || formal?.gateSummary?.sourceCandidatesAttached !== 0
    || formal?.subjects?.length !== 28) {
    fail("FORMAL_V1_BOUNDARY_DRIFT", "Formal v1 fail-closed boundary drifted.");
  }
  if (v11?.formalStateBoundary?.successorIsFormalCurrent !== false
    || v11?.formalStateBoundary?.successorActiveEffect !== "none"
    || v11?.gateSummary?.partialCandidatesAttached !== 2
    || v11?.gateSummary?.bindingFrozenVerified !== 0
    || v11?.subjects?.length !== 28) {
    fail("HISTORICAL_V11_BOUNDARY_DRIFT", "Historical v1.1 boundary drifted.");
  }
  if (v12?.formalStateBoundary?.v12SuccessorIsFormalCurrent !== false
    || v12?.formalStateBoundary?.v12SuccessorActiveEffect !== "none"
    || v12?.gateSummary?.partialCandidatesAttached !== 2
    || v12?.gateSummary?.bindingFrozenVerified !== 0
    || v12?.subjects?.length !== 28) {
    fail("HISTORICAL_V12_BOUNDARY_DRIFT", "Historical v1.2 boundary drifted.");
  }
}

function assertNoBacklinkText(snapshot, needles, label) {
  const text = REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"]);
  for (let index = 0; index < needles.length; index += 1) {
    if (text.includes(needles[index])) fail("UPSTREAM_BACKLINK_FORBIDDEN", label + " contains a successor backlink.");
  }
}

async function collectCurrentInputs(workspaceRoot = process.cwd()) {
  const childResult = await loadWesternCurrentBasisLicenseCarrierChild(workspaceRoot);
  if (!isVerifiedWesternCurrentBasisLicenseCarrierChild(childResult)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED", "Current-basis carrier child private brand is required.");
  }
  if (childResult.artifact?.path !== CHILD.path
    || childResult.artifact?.rawBytes !== CHILD.rawBytes
    || childResult.artifact?.rawSha256 !== CHILD.rawSha256
    || childResult.childId !== CHILD.childId || childResult.childDigest !== CHILD.childDigest) {
    fail("CHILD_IDENTITY_DRIFT", "Current-basis carrier child identity drifted.");
  }

  const specs = [FORMAL_V1, HISTORICAL_V11, HISTORICAL_V12];
  const snapshots = [];
  const ledgers = [];
  for (let index = 0; index < specs.length; index += 1) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, specs[index].path);
    assertArtifact(snapshot, specs[index], specs[index].path);
    const ledger = strictJson(snapshot, specs[index].path);
    assertSelfDigest(ledger, specs[index], specs[index].path);
    snapshots.push(snapshot);
    ledgers.push(ledger);
  }
  assertHistoricalBoundaries(ledgers[0], ledgers[1], ledgers[2]);
  const needles = [
    LEDGER_ID,
    WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH,
    CHILD.childId,
    CHILD.path
  ];
  for (let index = 0; index < snapshots.length; index += 1) {
    assertNoBacklinkText(snapshots[index], needles, specs[index].path);
    REFLECT_APPLY(OBJECT_FREEZE, Object, [snapshots[index]]);
    deepFreeze(ledgers[index]);
  }

  const context = OBJECT_FREEZE({
    childResult,
    snapshots: OBJECT_FREEZE(snapshots),
    ledgers: OBJECT_FREEZE(ledgers)
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CONTEXTS, [context]);
  return context;
}

function requireContext(value) {
  if (!value || !REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CONTEXTS, [value])
    || !REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    fail("VERIFIED_CONTEXT_REQUIRED", "Verified fixed-path successor context is required.");
  }
  return value;
}

function candidateEvidenceBinding(childResult) {
  const child = childResult.child;
  const astronomy = child.dependencyLicenseCarrierObservations[0];
  const zod = child.dependencyLicenseCarrierObservations[1];
  return {
    subjectId: TARGET_SUBJECT_ID,
    candidateId: CANDIDATE_ID,
    coverageScope:
      "astronomy_engine_2_1_19_and_zod_4_4_3_declared_fields_and_local_carrier_endpoints_only",
    bindingState: "candidate_only_unbound",
    evidenceArtifact: {
      ...childResult.artifact,
      childId: childResult.childId,
      childDigest: childResult.childDigest
    },
    fixedDependencyIdentities: [
      {
        packageName: astronomy.packageName,
        version: astronomy.version,
        packageManifest: astronomy.packageManifest,
        installedExactLicenseEndpoint: astronomy.installedExactLicenseEndpoint,
        controlledProjectLicenseCopies: astronomy.controlledProjectLicenseCopies
      },
      {
        packageName: zod.packageName,
        version: zod.version,
        packageManifest: zod.packageManifest,
        installedLicenseCarrier: zod.installedLicenseCarrier
      }
    ],
    coversAstronomyEngine2_1_19: true,
    coversZod4_4_3: true,
    coversSofa: false,
    coversSwissEphemeris: false,
    coversCivilTimeTzdbOrMomentTimezone: false,
    sourceBodyDigest: null,
    exactQuoteStored: false,
    exactLocatorEstablished: false,
    subjectFullySatisfied: false,
    frozenBindingId: null,
    workRightsEstablished: false,
    versionRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    noticeObligationSatisfied: false,
    independentRightsReviewVerified: false,
    licenseApplicabilityEstablished: false,
    licenseCompatibilityEstablished: false,
    countsTowardFrozenBindingGate: false,
    publisherAuthenticityEstablished: false
  };
}

function successorSubjects(formalSubjects, childResult) {
  const evidence = candidateEvidenceBinding(childResult);
  let targetCount = 0;
  const subjects = formalSubjects.map((subject) => {
    if (subject.subjectId !== TARGET_SUBJECT_ID) return capture(subject);
    targetCount += 1;
    return {
      ...capture(subject),
      bindingState: "candidate_only_unbound",
      sourceCandidateIds: [CANDIDATE_ID],
      sourceBodyDigest: null,
      exactQuoteStored: false,
      exactLocatorEstablished: false,
      workRightsEstablished: false,
      editionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusion: "not_established",
      expertReviewIds: [],
      frozenAt: null,
      frozenBindingId: null,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false,
      candidateObservation: {
        evidenceArtifact: evidence.evidenceArtifact,
        candidateId: CANDIDATE_ID,
        coverageScope: evidence.coverageScope,
        exactQuoteStored: false,
        subjectFullySatisfied: false,
        rightsLegalConclusionEstablished: false
      }
    };
  });
  if (targetCount !== 1 || subjects.length !== 28) {
    fail("TARGET_SUBJECT_SCOPE_DRIFT", "Exactly one Western engine-code rights subject is required.");
  }
  return subjects;
}

function buildProjection(contextInput) {
  const context = requireContext(contextInput);
  const [formal, v11, v12] = context.ledgers;
  const child = context.childResult.child;
  const candidate = candidateEvidenceBinding(context.childResult);
  const unsigned = {
    schemaVersion: "1.3.0",
    recordType: RECORD_TYPE,
    ledgerId: LEDGER_ID,
    productSystemId: "western-astrology",
    contractSystemId: "western",
    status: STATUS,
    createdAt: CREATED_AT,
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    formalCurrentBinding: {
      ...publicIdentity(context.snapshots[0]),
      ledgerId: FORMAL_V1.ledgerId,
      ledgerDigest: FORMAL_V1.ledgerDigest,
      remainsDeclaredFormalCurrent: true,
      mechanicallyCurrent: false,
      loaderFailureClass: "LEDGER_MISMATCH"
    },
    historicalCandidateBoundary: {
      historicalCandidates: [
        {
          ...publicIdentity(context.snapshots[1]),
          ledgerId: HISTORICAL_V11.ledgerId,
          ledgerDigest: HISTORICAL_V11.ledgerDigest,
          isFormalCurrent: false,
          activeEffect: "none",
          mechanicallyCurrent: false,
          currentPrivateBrandAvailable: false,
          loaderFailureClass: "LEDGER_MISMATCH"
        },
        {
          ...publicIdentity(context.snapshots[2]),
          ledgerId: HISTORICAL_V12.ledgerId,
          ledgerDigest: HISTORICAL_V12.ledgerDigest,
          isFormalCurrent: false,
          activeEffect: "none",
          mechanicallyCurrent: false,
          currentPrivateBrandAvailable: false,
          loaderFailureClass: "LEDGER_MISMATCH"
        }
      ],
      historicalTzdbPartialCandidatesObserved: 2,
      historicalControlledReproductionObservationsObserved: 2,
      historicalCandidatesConsumedByThisSuccessor: 0,
      historicalCandidatesCarriedForwardAsCurrent: 0,
      historicalCandidateEvidenceTrustedAsCurrent: false,
      staleOrUnconsumedReason: "recursive_formal_parent_LEDGER_MISMATCH",
      rawAndSelfDigestContextOnly: true
    },
    currentBasisChildBinding: {
      ...context.childResult.artifact,
      childId: context.childResult.childId,
      childDigest: context.childResult.childDigest,
      privateBrandVerified: true,
      relationship: "one_way_current_basis_and_carrier_child_to_nonformal_successor",
      childActiveEffectBeforeSuccessor: "none"
    },
    formalStateBoundary: {
      formalV1RemainsDeclaredCurrent: true,
      formalV1MechanicallyCurrent: false,
      historicalV11IsFormalCurrent: false,
      historicalV12IsFormalCurrent: false,
      successorIsFormalCurrent: false,
      successorActiveEffect: "none",
      formalParentConsumptionEstablished: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      predecessorOrHistoricalArtifactMutated: false,
      predecessorOrHistoricalBacklinkAdded: false
    },
    defaultClosureRequirements: capture(formal.defaultClosureRequirements),
    currentBasisArtifacts: capture(child.currentSourceBasisObservation.artifacts),
    basisEvolutionBoundary: {
      oldFormalBasisArtifactCount: formal.basisArtifacts.length,
      currentBasisArtifactCount: child.currentSourceBasisObservation.currentBasisEndpointCount,
      currentSplitCivilInputExplicitlyIncluded: true,
      currentBasisObservationDoesNotPromoteFormalV1: true,
      sourceOrDomainTruthEstablished: false
    },
    candidateEvidenceBindings: [candidate],
    subjects: successorSubjects(formal.subjects, context.childResult),
    gateSummary: {
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      currentPartialCandidatesAttached: 1,
      sourceCandidatesAttached: 1,
      historicalStaleCandidatesObserved: 2,
      historicalCandidatesConsumed: 0,
      subjectFullySatisfied: 0,
      sourceBodiesBound: 0,
      exactQuotesStored: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      currentSourceBasisEndpointsObserved: 4,
      externalDependencyCarriersObserved: 2,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      editionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      independentRightsReviewsVerified: 0,
      expertReviewedSubjects: 0,
      independentDomainExpertReviewsVerified: 0,
      publisherAuthenticityEstablished: 0,
      licenseApplicabilityEstablished: 0,
      licenseCompatibilityEstablished: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      browserRuntimeValidated: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence:
        "current_four_endpoint_basis_and_three_package_two_external_dependency_carrier_observation_verified",
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
      canonicalPrettyJsonWithLfRequired: true,
      digestIsDigitalSignature: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    runtimeTrustBoundary: {
      fixedPathCliRejectsVisiblePreloadEnvironment: true,
      fixedPathCliRejectsVisiblePreloadOrLoaderArguments: true,
      visibleGuardIsSecurityBoundary: false,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      trustedTimeEstablished: false,
      assumesNoArbitraryPreEvaluationCodeExecution: true
    },
    doesNotEstablish: [
      "formal_current_requirements_replacement_or_active_effect",
      "formal_manifest_registry_or_owner_admission",
      "historical_tzdb_candidate_currentness_private_brand_or_consumption",
      "complete_engine_code_and_distribution_subject_or_any_frozen_binding",
      "sofa_swiss_ephemeris_civil_time_tzdb_or_entire_western_dependency_closure",
      "source_body_exact_quote_locator_or_complete_source_bundle",
      "publisher_license_authenticity_applicability_compatibility_or_notice_satisfaction",
      "work_version_edition_carrier_rights_legal_conclusion_or_redistribution_authorization",
      "content_truth_expert_truth_scientific_validity_or_domain_authority",
      "browser_runtime_pwa_service_worker_cross_browser_or_public_host_validation",
      "release_readiness_public_deployment_or_public_release_authorization",
      "trusted_time_runtime_loader_launcher_identity_or_cli_attestation",
      "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeWesternSourceBindingCurrentBasisSuccessorDigest(unsigned)
  });
}

export async function buildCurrentWesternSourceBindingCurrentBasisSuccessor(
  workspaceRoot = process.cwd()
) {
  return buildProjection(await collectCurrentInputs(workspaceRoot));
}

export function serializeWesternSourceBindingCurrentBasisSuccessor(value) {
  const snapshot = capture(value);
  if (snapshot.ledgerDigest !== computeWesternSourceBindingCurrentBasisSuccessorDigest(snapshot)) {
    fail("LEDGER_DIGEST_MISMATCH", "Successor digest does not match.");
  }
  return pretty(snapshot);
}

export function parseWesternSourceBindingCurrentBasisSuccessorArtifact(snapshot) {
  return strictJson(snapshot, "Western source-binding current-basis successor");
}

export function verifyWesternSourceBindingCurrentBasisSuccessorLedger(input, contextInput) {
  const context = requireContext(contextInput);
  const ledger = capture(input);
  if (ledger.schemaVersion !== "1.3.0" || ledger.recordType !== RECORD_TYPE
    || ledger.ledgerId !== LEDGER_ID || ledger.status !== STATUS || ledger.createdAt !== CREATED_AT) {
    fail("LEDGER_IDENTITY_MISMATCH", "Successor identity fields drifted.");
  }
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)
    || ledger.ledgerDigest !== computeWesternSourceBindingCurrentBasisSuccessorDigest(ledger)) {
    fail("LEDGER_DIGEST_MISMATCH", "Successor digest does not match.");
  }
  const expected = buildProjection(context);
  if (!exact(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "Successor differs from the current-basis fail-closed projection.");
  }
  return deepFreeze(ledger);
}

function assertPersistedIdentity(snapshot) {
  if (!Number.isSafeInteger(EXPECTED_PERSISTED.rawBytes) || EXPECTED_PERSISTED.rawBytes <= 0
    || !SHA256.test(EXPECTED_PERSISTED.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "Successor persisted identity is not frozen.");
  }
  if (snapshot.path !== WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_IDENTITY_DRIFT", "Successor persisted raw identity drifted.");
  }
}

export async function loadWesternSourceBindingCurrentBasisSuccessor(
  workspaceRoot = process.cwd()
) {
  const context = await collectCurrentInputs(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH
  );
  assertPersistedIdentity(snapshot);
  const parsed = parseWesternSourceBindingCurrentBasisSuccessorArtifact(snapshot);
  const ledger = verifyWesternSourceBindingCurrentBasisSuccessorLedger(parsed, context);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
    !== serializeWesternSourceBindingCurrentBasisSuccessor(ledger)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "Successor is not canonical LF JSON.");
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    formalV1RemainsDeclaredCurrent: ledger.formalStateBoundary.formalV1RemainsDeclaredCurrent,
    formalV1MechanicallyCurrent: ledger.formalStateBoundary.formalV1MechanicallyCurrent,
    successorIsFormalCurrent: ledger.formalStateBoundary.successorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.successorActiveEffect,
    currentPartialCandidatesAttached: ledger.gateSummary.currentPartialCandidatesAttached,
    historicalStaleCandidatesObserved: ledger.gateSummary.historicalStaleCandidatesObserved,
    historicalCandidatesConsumed: ledger.gateSummary.historicalCandidatesConsumed,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicDeploymentAuthorized: ledger.gateSummary.publicDeploymentAuthorized,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: publicIdentity(snapshot),
    currentBasisChildArtifact: context.childResult.artifact,
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternSourceBindingCurrentBasisSuccessor(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const westernSourceBindingCurrentBasisSuccessorTestOnly = Object.freeze({
  LEDGER_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  TARGET_SUBJECT_ID,
  CANDIDATE_ID,
  FORMAL_V1,
  HISTORICAL_V11,
  HISTORICAL_V12,
  CHILD,
  EXPECTED_PERSISTED,
  collectCurrentInputs,
  buildProjection,
  computeWithDomain
});
