import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyWesternRegistryTarballParityChild,
  isVerifiedWesternRegistryTarballParityChild,
  loadWesternRegistryTarballParityChild
} from "./western-registry-tarball-parity-observation-child-lib.mjs";
import {
  isVerifiedWesternSourceBindingCurrentBasisSuccessor,
  loadWesternSourceBindingCurrentBasisSuccessor
} from "./western-source-binding-requirements-current-basis-successor-lib.mjs";

export const WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/western-source-binding-requirements.v1.4.0.json";

const LEDGER_ID = "hakimi.western-astrology.source-binding-requirements/1.4.0";
const RECORD_TYPE =
  "independent_system_source_binding_requirements_registry_tarball_parity_successor_candidate";
const STATUS =
  "nonformal_registry_tarball_parity_plus_one_partial_engine_rights_candidate_no_bindings_frozen";
const CREATED_AT = "2026-09-01T14:53:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.western.source-binding-requirements.registry-tarball-successor-candidate.v1.4\0";
const TARGET_SUBJECT_ID = "western.rights.engine-code-and-distribution";
const CANDIDATE_ID = "western-registry-tarball-parity-engine-rights-candidate-v1";
const DEFAULT_WORKSPACE_ROOT = fileURLToPath(new URL("../", import.meta.url));

const PARENT_V13 = Object.freeze({
  path: "content/system-admission/western-source-binding-requirements.v1.3.0.json",
  rawBytes: 37_140,
  rawSha256: "08418368dfc668cc59f7814a88e2b629bfda5867b69c264a42483951b469eb67",
  ledgerId: "hakimi.western-astrology.source-binding-requirements/1.3.0",
  ledgerDigest: "76ae1299965405f86f161473adb11dc87db66e5e02e4e7d0bbb9f60f85e9e2ac"
});

const CHILD = Object.freeze({
  path: "content/system-admission/western-registry-tarball-parity-observation-child.v1.json",
  rawBytes: 13_945,
  rawSha256: "92aaea4cc66836c25c5c810d69a9154812361ebb0db91c7467e992a3b9c3413a",
  childId: "hakimi.western.registry-tarball-parity-observation-child/1.0.0",
  childDigest: "d449f225a10c8a8a4e63a9e6990ef5c9a4cced687d1d5d4bacba8146af749a60"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 42_349,
  rawSha256: "da755745c327b72aa617e40aed8d37a5e3f2c69aeb367dbfd9262dd5cece9f35"
});
const VERIFIED_CONTEXTS = new WeakSet();
const VERIFIED_RESULTS = new WeakSet();

export class WesternSourceBindingRegistryTarballSuccessorError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternSourceBindingRegistryTarballSuccessorError";
    this.code = code;
    this.safeForCli = true;
  }
}

function fail(code, message, cause) {
  throw new WesternSourceBindingRegistryTarballSuccessorError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function canonical(value) {
  return canonicalStringifyWesternRegistryTarballParityChild(value);
}

export function canonicalStringifyWesternSourceBindingRegistryTarballSuccessor(value) {
  return canonical(value);
}

function capture(value) {
  return JSON.parse(canonical(value));
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) deepFreeze(value[key], seen);
  Object.setPrototypeOf(value, null);
  return Object.freeze(value);
}

function unsigned(value) {
  const result = capture(value);
  delete result.ledgerDigest;
  return result;
}

function sha256Text(value) {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

export function computeWesternSourceBindingRegistryTarballSuccessorDigest(value) {
  return sha256Text(DIGEST_DOMAIN + canonical(unsigned(value)));
}

function serialize(value) {
  return JSON.stringify(JSON.parse(canonical(value)), null, 2) + "\n";
}

function strictJson(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail(cause?.code ?? "STRICT_JSON_INVALID", label + " is not strict JSON.", cause);
  }
}

function assertArtifact(snapshot, spec, label) {
  if (snapshot.path !== spec.path || snapshot.rawBytes !== spec.rawBytes
    || snapshot.rawSha256 !== spec.rawSha256) {
    fail("UPSTREAM_RAW_IDENTITY_DRIFT", label + " raw identity drifted.");
  }
}

function identity(snapshot) {
  return { path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 };
}

async function collectCurrentInputs(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const root = path.resolve(workspaceRoot);
  if (root !== path.resolve(DEFAULT_WORKSPACE_ROOT)) {
    fail("FIXED_WORKSPACE_REQUIRED", "v1.4 successor is fixed to this workspace.");
  }
  const [parent, child] = await Promise.all([
    loadWesternSourceBindingCurrentBasisSuccessor(root),
    loadWesternRegistryTarballParityChild(root)
  ]);
  if (!isVerifiedWesternSourceBindingCurrentBasisSuccessor(parent)
    || !isVerifiedWesternRegistryTarballParityChild(child)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED", "v1.3 and registry child private brands are required.");
  }
  const [parentSnapshot, childSnapshot] = await Promise.all([
    readBaziDttStableWorkspaceArtifact(root, PARENT_V13.path),
    readBaziDttStableWorkspaceArtifact(root, CHILD.path)
  ]);
  assertArtifact(parentSnapshot, PARENT_V13, "v1.3 parent");
  assertArtifact(childSnapshot, CHILD, "registry child");
  const parentArtifact = strictJson(parentSnapshot, "v1.3 parent");
  const childArtifact = strictJson(childSnapshot, "registry child");
  if (parentArtifact.ledgerId !== PARENT_V13.ledgerId
    || parentArtifact.ledgerDigest !== PARENT_V13.ledgerDigest
    || parentArtifact.formalStateBoundary?.successorIsFormalCurrent !== false
    || parentArtifact.formalStateBoundary?.successorActiveEffect !== "none"
    || parentArtifact.gateSummary?.currentPartialCandidatesAttached !== 1
    || parentArtifact.gateSummary?.bindingFrozenVerified !== 0
    || parentArtifact.subjects?.length !== 28
    || childArtifact.childId !== CHILD.childId
    || childArtifact.childDigest !== CHILD.childDigest
    || childArtifact.gateSummary?.currentPartialCandidatesAttached !== 1
    || childArtifact.gateSummary?.bindingFrozenVerified !== 0) {
    fail("PARENT_BOUNDARY_DRIFT", "v1.3 or registry child boundary drifted.");
  }
  const context = Object.freeze({ root, parent, child, parentSnapshot, childSnapshot });
  VERIFIED_CONTEXTS.add(context);
  return context;
}

function registrySummary(child) {
  return child.packages.map((item) => ({
    packageName: item.packageName,
    version: item.version,
    metadataEndpoint: item.metadata.endpoint,
    metadataRawBytes: item.metadata.rawBytes,
    metadataRawSha256: item.metadata.rawSha256,
    tarballEndpoint: item.tarball.endpoint,
    tarballRawBytes: item.tarball.rawBytes,
    tarballSha512Integrity: item.tarball.sha512Integrity,
    tarballSha1: item.tarball.sha1,
    tarballSha256: item.tarball.sha256,
    lockResolvedParityObserved: item.parity.metadataTarballMatchesPackageLockResolved,
    lockIntegrityParityObserved: item.parity.metadataIntegrityMatchesPackageLockIntegrity,
    tarballPackageManifestLocalParityObserved:
      item.parity.tarballPackageManifestMatchesInstalledPackageManifest,
    tarballStandaloneLicenseMembers: item.tarball.standaloneLicenseMembers,
    tarballLicenseLocalParityObserved:
      item.packageName === "zod" ? item.parity.tarballLicenseMatchesInstalledLicense : false
  }));
}

function buildProjection(context) {
  if (!VERIFIED_CONTEXTS.has(context)) fail("VERIFIED_CONTEXT_REQUIRED", "Verified context required.");
  const parent = capture(context.parent.ledger);
  const child = capture(context.child.child);
  const priorCandidate = capture(parent.candidateEvidenceBindings[0]);
  const priorEvidence = priorCandidate.evidenceArtifact;
  const registryEvidence = {
    ...identity(context.childSnapshot),
    childId: CHILD.childId,
    childDigest: CHILD.childDigest
  };

  parent.ledgerId = LEDGER_ID;
  parent.schemaVersion = "1.4.0";
  parent.createdAt = CREATED_AT;
  parent.recordType = RECORD_TYPE;
  parent.status = STATUS;
  parent.parentNonformalV13Binding = {
    ...identity(context.parentSnapshot),
    ledgerId: PARENT_V13.ledgerId,
    ledgerDigest: PARENT_V13.ledgerDigest,
    privateBrandVerified: true,
    isFormalCurrent: false,
    activeEffect: "none",
    relationship: "one_way_nonformal_v1_3_parent_to_nonformal_v1_4_successor"
  };
  parent.registryTarballParityChildBinding = {
    ...registryEvidence,
    privateBrandVerified: true,
    childIsFormalCurrent: false,
    childActiveEffectBeforeSuccessor: "none",
    relationship: "one_way_registry_tarball_child_to_nonformal_v1_4_successor"
  };

  const candidate = {
    ...priorCandidate,
    candidateId: CANDIDATE_ID,
    coverageScope:
      "astronomy_engine_2_1_19_and_zod_4_4_3_registry_metadata_tarball_lock_and_local_member_parity_only",
    evidenceArtifact: capture(registryEvidence),
    priorCurrentBasisEvidenceArtifact: capture(priorEvidence),
    registryTarballParityObservations: registrySummary(child),
    publisherAuthenticityEstablished: false,
    licenseApplicabilityEstablished: false,
    licenseCompatibilityEstablished: false,
    workRightsEstablished: false,
    versionRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    noticeObligationSatisfied: false,
    independentRightsReviewVerified: false,
    exactLocatorEstablished: false,
    exactQuoteStored: false,
    sourceBodyDigest: null,
    frozenBindingId: null,
    countsTowardFrozenBindingGate: false,
    subjectFullySatisfied: false,
    bindingState: "candidate_only_unbound"
  };
  parent.candidateEvidenceBindings = [candidate];

  const targetIndex = parent.subjects.findIndex((item) => item.subjectId === TARGET_SUBJECT_ID);
  if (targetIndex < 0) fail("TARGET_SUBJECT_MISSING", "Target rights subject is missing.");
  const target = parent.subjects[targetIndex];
  parent.subjects[targetIndex] = {
    ...target,
    sourceCandidateIds: [CANDIDATE_ID],
    candidateObservation: {
      candidateId: CANDIDATE_ID,
      coverageScope: candidate.coverageScope,
      evidenceArtifact: capture(registryEvidence),
      priorCurrentBasisEvidenceArtifact: capture(priorEvidence),
      exactQuoteStored: false,
      rightsLegalConclusionEstablished: false,
      subjectFullySatisfied: false
    },
    bindingState: "candidate_only_unbound",
    countsTowardFrozenBindingGate: false,
    exactLocatorEstablished: false,
    exactQuoteStored: false,
    sourceBodyDigest: null,
    frozenBindingId: null,
    workRightsEstablished: false,
    carrierRightsEstablished: false,
    editionRightsEstablished: false,
    rightsLegalConclusion: "not_established",
    subjectFullySatisfied: false
  };

  parent.formalStateBoundary = {
    ...parent.formalStateBoundary,
    nonformalV13ParentPrivateBrandVerified: true,
    nonformalV13ParentIsFormalCurrent: false,
    nonformalV13ParentActiveEffect: "none",
    nonformalParentConsumptionEstablished: true,
    v14SuccessorIsFormalCurrent: false,
    v14SuccessorActiveEffect: "none",
    formalV1RemainsDeclaredCurrent: true,
    formalManifestIntegrated: false,
    formalRegistryIntegrated: false,
    ownerAdmissionAccepted: false,
    predecessorOrHistoricalArtifactMutated: false,
    predecessorOrHistoricalBacklinkAdded: false
  };
  parent.gateSummary = {
    ...parent.gateSummary,
    currentPartialCandidatesAttached: 1,
    sourceCandidatesAttached: 1,
    registryVersionMetadataResponsesObserved: 2,
    registryTarballByteArtifactsObserved: 2,
    registryTarballLockParityObserved: 2,
    registryTarballPackageManifestLocalParityObserved: 2,
    registryTarballLicenseLocalParityObserved: 1,
    publisherAuthenticityEstablished: 0,
    licenseApplicabilityEstablished: 0,
    licenseCompatibilityEstablished: 0,
    workRightsEstablished: 0,
    versionRightsEstablished: 0,
    editionRightsEstablished: 0,
    carrierRightsEstablished: 0,
    independentRightsReviewsVerified: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 28,
    subjectFullySatisfied: 0,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    independentDomainExpertReviewsVerified: 0,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  };
  parent.evidenceLedger = {
    engineeringEvidence:
      "public_registry_exact_version_metadata_tarball_lock_and_local_member_parity_observed",
    browserRuntimeEvidence: "not_assessed",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsLegalConclusion: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  };
  parent.timeBoundary = {
    createdAtIsUntrustedOperatorLabel: true,
    trustedClockOrTimestampAuthorityEstablished: false,
    registryResponseTimeAuthorityEstablished: false,
    verificationIntervalBoundToCreatedAt: false
  };
  parent.doesNotEstablish = [
    ...parent.doesNotEstablish,
    "registry_or_tls_endpoint_as_publisher_identity_signature_or_first_seen_proof",
    "registry_tarball_parity_as_authenticity_license_applicability_or_rights_legal_conclusion",
    "registry_tarball_bytes_as_content_truth_expert_truth_release_readiness_or_public_authorization"
  ];
  parent.ledgerDigest = "";
  parent.ledgerDigest = computeWesternSourceBindingRegistryTarballSuccessorDigest(parent);
  return parent;
}

export async function buildCurrentWesternSourceBindingRegistryTarballSuccessor(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  return buildProjection(await collectCurrentInputs(workspaceRoot));
}

export function serializeWesternSourceBindingRegistryTarballSuccessor(value) {
  return serialize(value);
}

export function parseWesternSourceBindingRegistryTarballSuccessorArtifact(snapshot) {
  return strictJson(snapshot, "Western v1.4 source-binding successor");
}

export function verifyWesternSourceBindingRegistryTarballSuccessorLedger(input, context) {
  if (!VERIFIED_CONTEXTS.has(context)) fail("VERIFIED_CONTEXT_REQUIRED", "Verified context required.");
  const expected = buildProjection(context);
  if (input?.ledgerDigest !== computeWesternSourceBindingRegistryTarballSuccessorDigest(input)) {
    fail("SELF_DIGEST_MISMATCH", "v1.4 successor self digest mismatched.");
  }
  if (canonical(input) !== canonical(expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "v1.4 successor contract mismatched.");
  }
  return expected;
}

export async function loadWesternSourceBindingRegistryTarballSuccessor(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const context = await collectCurrentInputs(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    path.resolve(workspaceRoot),
    WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_IDENTITY_MISMATCH", "Persisted v1.4 identity mismatched.");
  }
  const parsed = strictJson(snapshot, "Western v1.4 source-binding successor");
  const ledger = verifyWesternSourceBindingRegistryTarballSuccessorLedger(parsed, context);
  if (serialize(ledger) !== Buffer.from(snapshot.bytes).toString("utf8")) {
    fail("PERSISTED_MATERIALIZATION_MISMATCH", "Persisted v1.4 is not canonical pretty LF JSON.");
  }
  const result = deepFreeze({
    artifact: identity(snapshot),
    ledger,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    parentV13PrivateBrandVerified: ledger.formalStateBoundary.nonformalV13ParentPrivateBrandVerified,
    successorIsFormalCurrent: ledger.formalStateBoundary.v14SuccessorIsFormalCurrent,
    successorActiveEffect: ledger.formalStateBoundary.v14SuccessorActiveEffect,
    currentPartialCandidatesAttached: ledger.gateSummary.currentPartialCandidatesAttached,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    bindingRequired: ledger.gateSummary.bindingRequired,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternSourceBindingRegistryTarballSuccessor(value) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value) && Object.isFrozen(value);
}

export const westernSourceBindingRegistryTarballSuccessorTestOnly = Object.freeze({
  LEDGER_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  TARGET_SUBJECT_ID,
  CANDIDATE_ID,
  PARENT_V13,
  CHILD,
  EXPECTED_PERSISTED,
  collectCurrentInputs,
  buildProjection
});
