import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild as canonicalStringify
} from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";
import {
  isVerifiedZiweiRegistryTarballParityChild,
  loadZiweiRegistryTarballParityChild
} from "./ziwei-registry-tarball-parity-observation-child-lib.mjs";
import {
  isVerifiedZiweiSourceBindingRequirementsSuccessor,
  loadZiweiSourceBindingRequirementsSuccessor
} from "./ziwei-source-binding-requirements-successor-lib.mjs";

export const ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH =
  "content/system-admission/ziwei-source-binding-requirements.v1.2.0.json";

const LEDGER_ID = "hakimi.ziwei-doushu.source-binding-requirements/1.2.0";
const RECORD_TYPE = "independent_system_source_binding_requirements_registry_tarball_parity_delta_successor_candidate";
const STATUS = "v1_1_two_partial_candidates_plus_seven_registry_tarball_local_carrier_parities_nonformal_zero_active_effect_zero_of_27_frozen";
const CREATED_AT = "2026-09-01T15:02:45.100Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T15:02:45.437Z";
const DIGEST_DOMAIN = "hakimi.ziwei-doushu.source-binding-requirements.successor.v1.2\0";
const TARGET_SUBJECT_ID = "ziwei.rights.engine-code-and-dependency-notices";
const RIGHTS_CANDIDATE_ID = "hakimi.ziwei.source-candidate/declared-dependency-license-carriers/1.0.0";
const SHA256 = /^[0-9a-f]{64}$/u;

const FORMAL_V1 = Object.freeze({
  path: "content/system-admission/ziwei-source-binding-requirements.v1.json",
  rawBytes: 25_790,
  rawSha256: "6ea7baee1e0ea63d7337ea6b6d78b8e7cb5da91a62bb902eaa591245539c7b3f",
  ledgerId: "hakimi.ziwei-doushu.source-binding-requirements/1.0.0",
  ledgerDigest: "5d3961d46e5d3d35872621faac17b0ec886c32f8d925d44c0c71f7967d19b03f"
});

const PREDECESSOR_V1_1 = Object.freeze({
  path: "content/system-admission/ziwei-source-binding-requirements.v1.1.0.json",
  rawBytes: 32_889,
  rawSha256: "c7cecdb82e5a42788c3329fc63d5948115ad58252b092a2b2cc70a9649b2953e",
  ledgerId: "hakimi.ziwei-doushu.source-binding-requirements/1.1.0",
  ledgerDigest: "26c8f7fe35cae35a47f575a272a578fbeeeff7713ab1545065bcb8d72f191388"
});

const PARITY_CHILD = Object.freeze({
  path: "content/system-admission/ziwei-registry-tarball-parity-observation-child.v1.json",
  rawBytes: 30_844,
  rawSha256: "4449cc05c2972c8d50b0a5f76c02baf0d58c8e60f2bc6e07cd302d40a1293410",
  childId: "hakimi.ziwei.registry-tarball-parity-observation-child/1.0.0",
  childDigest: "778eac80398629ee92b8bb1fbac902a605766461c26498794960d16b915ea59d"
});

const EXPECTED_PERSISTED_RAW = Object.freeze({
  rawBytes: 37_570,
  rawSha256: "63c0b8776978432dbcaaaaf5b2638acbc5d28d755dc1387c59c7e3421865c9a1"
});
const VERIFIED_RESULTS = new WeakSet();

export class ZiweiSourceBindingRequirementsSuccessorV12Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiSourceBindingRequirementsSuccessorV12Error";
    Object.defineProperty(this, "code", { value: code, enumerable: false });
    Object.defineProperty(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new ZiweiSourceBindingRequirementsSuccessorV12Error(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capture(value) {
  try {
    return JSON.parse(canonicalStringify(value));
  } catch (cause) {
    if (cause?.code) throw cause;
    fail("INPUT_INVALID", "Ziwei v1.2 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function publicIdentity(value) {
  return { path: value.path, rawBytes: value.rawBytes, rawSha256: value.rawSha256 };
}

function requirePredecessor(result) {
  if (!isVerifiedZiweiSourceBindingRequirementsSuccessor(result)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED", "v1.2 必须消费 v1.1 full-loader 私有品牌。");
  }
  const formalBinding = result.ledger?.predecessorBinding;
  if (result.ledgerId !== PREDECESSOR_V1_1.ledgerId
    || result.ledgerDigest !== PREDECESSOR_V1_1.ledgerDigest
    || result.artifact?.path !== PREDECESSOR_V1_1.path
    || result.artifact?.rawBytes !== PREDECESSOR_V1_1.rawBytes
    || result.artifact?.rawSha256 !== PREDECESSOR_V1_1.rawSha256
    || result.predecessorRemainsFormalCurrent !== true
    || result.successorIsFormalCurrent !== false || result.successorActiveEffect !== "none"
    || result.bindingRequired !== 27 || result.bindingFrozenVerified !== 0
    || result.partialCandidatesAttached !== 2 || result.subjectFullySatisfied !== 0
    || result.rightsLegalConclusionEstablished !== false || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false || result.publicReleaseAuthorized !== false
    || !formalBinding || formalBinding.path !== FORMAL_V1.path
    || formalBinding.rawBytes !== FORMAL_V1.rawBytes
    || formalBinding.rawSha256 !== FORMAL_V1.rawSha256
    || formalBinding.ledgerId !== FORMAL_V1.ledgerId
    || formalBinding.ledgerDigest !== FORMAL_V1.ledgerDigest
    || formalBinding.remainsFormalCurrent !== true
    || result.ledger?.subjects?.length !== 27
    || result.ledger?.candidateEvidenceBindings?.length !== 2) {
    fail("PREDECESSOR_IDENTITY_OR_STATE_DRIFT", "Ziwei v1.1 identity、formal v1 current 或 2 partial / 0/27 漂移。");
  }
  return result;
}

function requireParityChild(result) {
  if (!isVerifiedZiweiRegistryTarballParityChild(result)) {
    fail("PARITY_CHILD_PRIVATE_BRAND_REQUIRED", "v1.2 必须消费 parity child full-loader 私有品牌。");
  }
  if (result.childId !== PARITY_CHILD.childId || result.childDigest !== PARITY_CHILD.childDigest
    || result.artifact?.path !== PARITY_CHILD.path
    || result.artifact?.rawBytes !== PARITY_CHILD.rawBytes
    || result.artifact?.rawSha256 !== PARITY_CHILD.rawSha256
    || result.packagesObserved !== 7
    || result.selectedEntryByteParitiesOperatorObserved !== 14
    || result.inheritedPartialCandidates !== 2 || result.bindingRequired !== 27
    || result.bindingFrozenVerified !== 0
    || result.rightsLegalConclusionEstablished !== false
    || result.redistributionAuthorized !== false) {
    fail("PARITY_CHILD_IDENTITY_OR_STATE_DRIFT", "Ziwei parity child identity 或失败关闭边界漂移。");
  }
  return result;
}

export function computeZiweiSourceBindingRequirementsSuccessorV12Digest(ledger) {
  const unsigned = capture(ledger);
  delete unsigned.ledgerDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

function enhanceTargetSubject(subject) {
  if (subject.subjectId !== TARGET_SUBJECT_ID) return capture(subject);
  return {
    ...capture(subject),
    candidateRegistryTarballParityObserved: true,
    candidateRegistryTarballParityEvidenceArtifact: {
      ...publicIdentity(PARITY_CHILD),
      childId: PARITY_CHILD.childId,
      childDigest: PARITY_CHILD.childDigest
    },
    candidatePackageTarballsObserved: 7,
    candidateSelectedEntryByteParitiesObserved: 14
  };
}

function enhanceRightsCandidate(binding) {
  return {
    ...capture(binding),
    registryTarballParityEvidenceArtifact: {
      ...publicIdentity(PARITY_CHILD),
      childId: PARITY_CHILD.childId,
      childDigest: PARITY_CHILD.childDigest
    },
    registryTarballParityOperatorObserved: true,
    registryPackageTarballsObserved: 7,
    registrySelectedEntryByteParitiesObserved: 14,
    metadataHttpStatusCaptured: false,
    redirectBehaviorCaptured: false,
    responseHeadersCaptured: false,
    networkTimeCaptured: false,
    publisherIdentityVerified: false,
    packageSignatureVerified: false,
    firstSeenEstablished: false,
    packageAuthenticityEstablished: false
  };
}

export function buildExpectedZiweiSourceBindingRequirementsSuccessorV12(
  predecessorResult,
  parityChildResult
) {
  const predecessor = requirePredecessor(predecessorResult).ledger;
  requireParityChild(parityChildResult);
  const unsigned = capture(predecessor);
  delete unsigned.ledgerDigest;
  unsigned.schemaVersion = "1.2.0";
  unsigned.recordType = RECORD_TYPE;
  unsigned.ledgerId = LEDGER_ID;
  unsigned.status = STATUS;
  unsigned.createdAt = CREATED_AT;
  unsigned.timeBoundary = {
    createdAtClock: "untrusted_local_clock_label",
    createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
    registryNetworkObservationTimeCaptured: false,
    registryNetworkObservationTime: null,
    trustedTimestampEstablished: false,
    externalTimeAuthorityEstablished: false,
    crossArtifactTemporalOrderEstablished: false,
    clockRollbackExcluded: false
  };
  unsigned.nonformalPredecessorBinding = {
    ...publicIdentity(PREDECESSOR_V1_1),
    ledgerId: PREDECESSOR_V1_1.ledgerId,
    ledgerDigest: PREDECESSOR_V1_1.ledgerDigest,
    remainsNonformal: true,
    activeEffect: "none",
    privateBrandRequiredAtVerification: true,
    relationship: "append_only_nonformal_v1_1_to_nonformal_v1_2_registry_tarball_parity_delta"
  };
  unsigned.registryTarballParityEvidenceBinding = {
    ...publicIdentity(PARITY_CHILD),
    childId: PARITY_CHILD.childId,
    childDigest: PARITY_CHILD.childDigest,
    privateBrandRequiredAtVerification: true,
    relationship: "one_way_registry_tarball_parity_child_to_existing_rights_candidate_only"
  };
  unsigned.formalStateBoundary = {
    ...capture(predecessor.formalStateBoundary),
    formalV1RemainsCurrent: true,
    predecessorV11RemainsNonformal: true,
    predecessorV11ActiveEffect: "none",
    predecessorV11Modified: false,
    predecessorV11BacklinkAdded: false,
    parityChildModified: false,
    parityChildBacklinkAdded: false
  };
  unsigned.subjects = predecessor.subjects.map(enhanceTargetSubject);
  unsigned.candidateEvidenceBindings = [
    capture(predecessor.candidateEvidenceBindings[0]),
    enhanceRightsCandidate(predecessor.candidateEvidenceBindings[1])
  ];
  unsigned.gateSummary = {
    ...capture(predecessor.gateSummary),
    newCandidateIdsAdded: 0,
    registryPackageTarballsObserved: 7,
    registryPackageManifestByteParitiesOperatorObserved: 7,
    registryLicenseCarrierByteParitiesOperatorObserved: 7,
    registrySelectedEntryByteParitiesOperatorObserved: 14
  };
  unsigned.sourceRightsBoundary = {
    publicRegistryTarballToLocalManifestLicenseByteParityOperatorObserved: true,
    publisherIdentityVerified: false,
    packageSignatureVerified: false,
    firstSeenEstablished: false,
    packageAuthenticityEstablished: false,
    licenseAuthenticityEstablished: false,
    licenseApplicabilityEstablished: false,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    noticeObligationSatisfied: false
  };
  unsigned.evidenceLedger = {
    ...capture(predecessor.evidenceLedger),
    engineeringRequirementIdentity:
      "v1_1_two_existing_candidates_plus_seven_public_registry_tarball_lock_and_current_local_manifest_license_byte_parities_only"
  };
  unsigned.integrityBoundary = {
    ...capture(predecessor.integrityBoundary),
    digestDomain: DIGEST_DOMAIN,
    predecessorAndParityChildAtomicSnapshotEstablished: false,
    intervalMutationExcludedAcrossFilesAndNetwork: false
  };
  unsigned.observationBoundary = {
    ...capture(predecessor.observationBoundary),
    predecessorAndParityChildAtomicSnapshot: false,
    networkAndLocalCrossFileAtomicSnapshotEstablished: false,
    registryMetadataRawResponsesCaptured: false,
    registryHttpStatusCaptured: false,
    registryRedirectBehaviorCaptured: false,
    registryResponseHeadersCaptured: false,
    registryNetworkTimeCaptured: false
  };
  unsigned.doesNotEstablish = [
    ...capture(predecessor.doesNotEstablish),
    "registry_http_status_redirect_headers_tls_network_time_publisher_identity_signature_first_seen_or_authenticity",
    "license_applicability_work_edition_carrier_rights_legal_conclusion_redistribution_or_notice_closure"
  ];
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeZiweiSourceBindingRequirementsSuccessorV12Digest(unsigned)
  });
}

function assertSubjects(predecessor, ledger) {
  if (!Array.isArray(ledger?.subjects) || ledger.subjects.length !== 27) {
    fail("SUBJECT_INVENTORY_DRIFT", "v1.2 必须保持 27 个 subject。");
  }
  const added = [
    "candidateRegistryTarballParityObserved",
    "candidateRegistryTarballParityEvidenceArtifact",
    "candidatePackageTarballsObserved",
    "candidateSelectedEntryByteParitiesObserved"
  ];
  let targetChanges = 0;
  for (let index = 0; index < 27; index += 1) {
    const before = predecessor.subjects[index];
    const after = ledger.subjects[index];
    if (before.subjectId !== after?.subjectId) fail("SUBJECT_ORDER_DRIFT", "subject 顺序或身份漂移。");
    if (before.subjectId !== TARGET_SUBJECT_ID) {
      if (!exactJson(before, after)) fail("NON_TARGET_SUBJECT_DRIFT", "26 个非目标 subject 必须与 v1.1 canonical-exact。");
      continue;
    }
    const restored = capture(after);
    for (const key of added) delete restored[key];
    if (!exactJson(restored, before)
      || after.candidateRegistryTarballParityObserved !== true
      || after.candidatePackageTarballsObserved !== 7
      || after.candidateSelectedEntryByteParitiesObserved !== 14
      || after.bindingState !== "candidate_only_unbound"
      || after.subjectFullySatisfied !== false
      || after.countsTowardFrozenBindingGate !== false) {
      fail("TARGET_SUBJECT_DELTA_DRIFT", "rights subject 只能增加固定 parity observation delta。");
    }
    targetChanges += 1;
  }
  if (targetChanges !== 1) fail("TARGET_SUBJECT_COUNT_DRIFT", "只能增强一个既有 rights subject。");
}

function assertCandidates(predecessor, ledger) {
  if (!Array.isArray(ledger?.candidateEvidenceBindings)
    || ledger.candidateEvidenceBindings.length !== 2
    || !exactJson(ledger.candidateEvidenceBindings[0], predecessor.candidateEvidenceBindings[0])) {
    fail("HKO_FIRST_CANDIDATE_DRIFT", "HKO 第一 candidate 必须保持 canonical-exact 与首位。");
  }
  const before = predecessor.candidateEvidenceBindings[1];
  const after = ledger.candidateEvidenceBindings[1];
  const added = [
    "registryTarballParityEvidenceArtifact", "registryTarballParityOperatorObserved",
    "registryPackageTarballsObserved", "registrySelectedEntryByteParitiesObserved",
    "metadataHttpStatusCaptured", "redirectBehaviorCaptured", "responseHeadersCaptured",
    "networkTimeCaptured", "publisherIdentityVerified", "packageSignatureVerified",
    "firstSeenEstablished", "packageAuthenticityEstablished"
  ];
  const restored = capture(after);
  for (const key of added) delete restored[key];
  if (!exactJson(restored, before) || after.candidateId !== RIGHTS_CANDIDATE_ID
    || after.registryTarballParityOperatorObserved !== true
    || after.registryPackageTarballsObserved !== 7
    || after.registrySelectedEntryByteParitiesObserved !== 14
    || after.subjectFullySatisfied !== false || after.countsTowardFrozenBindingGate !== false) {
    fail("RIGHTS_CANDIDATE_DELTA_DRIFT", "第二条 rights candidate 只能增加固定 parity observation delta。");
  }
  if (!exactJson(
    ledger.candidateEvidenceBindings.map((entry) => entry.candidateId),
    predecessor.candidateEvidenceBindings.map((entry) => entry.candidateId)
  )) fail("NEW_CANDIDATE_FORBIDDEN", "v1.2 不得新增或重排 candidate ID。");
}

function assertFailClosed(ledger) {
  const formal = ledger?.formalStateBoundary;
  const gate = ledger?.gateSummary;
  const rights = ledger?.sourceRightsBoundary;
  const authority = ledger?.authorityBoundary;
  const runtime = ledger?.runtimeTrustBoundary;
  const observation = ledger?.observationBoundary;
  const integrity = ledger?.integrityBoundary;
  if (!formal || formal.predecessorRemainsFormalCurrent !== true
    || formal.formalV1RemainsCurrent !== true
    || formal.successorIsFormalCurrent !== false || formal.successorActiveEffect !== "none"
    || formal.predecessorV11RemainsNonformal !== true || formal.predecessorV11ActiveEffect !== "none"
    || formal.predecessorMutated !== false || formal.predecessorBacklinkAdded !== false
    || formal.predecessorV11Modified !== false || formal.predecessorV11BacklinkAdded !== false
    || formal.parityChildModified !== false || formal.parityChildBacklinkAdded !== false
    || formal.formalManifestIntegrated !== false || formal.formalRegistryIntegrated !== false
    || formal.centralAdmissionIntegrated !== false || formal.ownerAdmissionAccepted !== false) {
    fail("FORMAL_STATE_PROMOTION_FORBIDDEN", "formal v1 必须保持 current；v1.1/v1.2 均 nonformal 且 activeEffect none。");
  }
  if (!gate || gate.bindingRequired !== 27 || gate.bindingFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.sourceCandidatesAttached !== 2
    || gate.subjectsWithPartialCandidate !== 2 || gate.newCandidateIdsAdded !== 0
    || gate.subjectFullySatisfied !== 0 || gate.sourceBodiesBound !== 1
    || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 1
    || gate.registryPackageTarballsObserved !== 7
    || gate.registryPackageManifestByteParitiesOperatorObserved !== 7
    || gate.registryLicenseCarrierByteParitiesOperatorObserved !== 7
    || gate.registrySelectedEntryByteParitiesOperatorObserved !== 14
    || gate.workRightsEstablished !== 0 || gate.editionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.expertReviewedSubjects !== 0
    || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.sourceBundleComplete !== false || gate.rightsBundleComplete !== false
    || gate.expertReviewBundleComplete !== false
    || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.releaseReady !== false
    || gate.publicDeploymentAuthorized !== false || gate.publicReleaseAuthorized !== false
    || gate.expertClaimsAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "v1.2 必须保持 2 partial、0/27 与所有高阶门关闭。");
  }
  if (!rights || rights.publicRegistryTarballToLocalManifestLicenseByteParityOperatorObserved !== true) {
    fail("PARITY_OBSERVATION_MISSING", "v1.2 必须仅记录公开 tarball 与本机载体字节 parity。");
  }
  for (const [key, value] of Object.entries(rights)) {
    if (key !== "publicRegistryTarballToLocalManifestLicenseByteParityOperatorObserved" && value !== false) {
      fail("RIGHTS_OVERCLAIM_FORBIDDEN", "authenticity/applicability/rights/legal/redistribution 必须全红。");
    }
  }
  for (const value of Object.values(authority ?? {})) {
    if (value !== false) fail("AUTHORITY_PROMOTION_FORBIDDEN", "content/expert/rights/release authority 必须全红。");
  }
  if (!runtime || runtime.fixedPathCliImplementationBoundBySuccessorIdentity !== false
    || runtime.launcherIntegrityEstablished !== false || runtime.loaderIdentityEstablished !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.cliOutputTrustedAttestation !== false
    || runtime.assumesNoArbitraryPreEvaluationCodeExecution !== true) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "runtime/loader/launcher/hidden preload 边界必须保持红。");
  }
  if (!observation || observation.predecessorAndParityChildAtomicSnapshot !== false
    || observation.networkAndLocalCrossFileAtomicSnapshotEstablished !== false
    || observation.registryMetadataRawResponsesCaptured !== false
    || observation.registryHttpStatusCaptured !== false
    || observation.registryRedirectBehaviorCaptured !== false
    || observation.registryResponseHeadersCaptured !== false
    || observation.registryNetworkTimeCaptured !== false
    || observation.mutationEpochReceipt !== null || observation.intervalMutationExcluded !== false
    || observation.abaExcluded !== false
    || !integrity || integrity.crossFileAtomicSnapshotEstablished !== false
    || integrity.mutationEpochAvailable !== false || integrity.mutationEpochReceipt !== null
    || integrity.predecessorAndParityChildAtomicSnapshotEstablished !== false
    || integrity.intervalMutationExcludedAcrossFilesAndNetwork !== false
    || integrity.abaExcluded !== false || integrity.digestIsDigitalSignature !== false
    || integrity.authenticityEstablished !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "network/raw/atomic/epoch/interval/ABA/signature 边界必须保持红。");
  }
  if (ledger?.releaseGovernance?.activeLine !== "legacy-v13"
    || ledger.releaseGovernance.targetSchema !== 13
    || ledger.releaseGovernance.migrationId !== null
    || ledger.releaseGovernance.mutationEpochBoundaryRequired !== true
    || ledger.releaseGovernance.mutationEpochAvailableForSchema13 !== false
    || ledger.releaseGovernance.mutationEpochReceipt !== null
    || ledger.releaseGovernance.publicDeploymentAuthorized !== false
    || ledger.releaseGovernance.expertClaimsAuthorized !== false) {
    fail("RELEASE_GOVERNANCE_DRIFT", "必须固定 legacy-v13 / 13 / null 并保持授权关闭。");
  }
  if (ledger?.createdAt !== CREATED_AT
    || ledger?.timeBoundary?.createdAtClock !== "untrusted_local_clock_label"
    || ledger.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock !== CREATED_AT_UPPER_BOUND
    || ledger.timeBoundary.registryNetworkObservationTimeCaptured !== false
    || ledger.timeBoundary.registryNetworkObservationTime !== null
    || ledger.timeBoundary.trustedTimestampEstablished !== false
    || ledger.timeBoundary.externalTimeAuthorityEstablished !== false
    || ledger.timeBoundary.crossArtifactTemporalOrderEstablished !== false
    || ledger.timeBoundary.clockRollbackExcluded !== false
    || Date.parse(ledger.createdAt) > Date.parse(CREATED_AT_UPPER_BOUND)) {
    fail("TIME_OVERCLAIM_FORBIDDEN", "network/trusted/external time 必须保持红。");
  }
}

export function verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
  input,
  predecessorResult,
  parityChildResult
) {
  const ledger = capture(input);
  const predecessor = requirePredecessor(predecessorResult).ledger;
  requireParityChild(parityChildResult);
  assertFailClosed(ledger);
  assertSubjects(predecessor, ledger);
  assertCandidates(predecessor, ledger);
  if (typeof ledger.ledgerDigest !== "string" || !SHA256.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "v1.2 ledgerDigest 必须是小写 SHA-256。");
  }
  if (computeZiweiSourceBindingRequirementsSuccessorV12Digest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "v1.2 domain-separated ledgerDigest 不匹配。");
  }
  const expected = buildExpectedZiweiSourceBindingRequirementsSuccessorV12(predecessorResult, parityChildResult);
  if (!exactJson(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "v1.2 与固定 branded v1.1/parity child delta 合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeZiweiSourceBindingRequirementsSuccessorV12(
  ledger,
  predecessorResult,
  parityChildResult
) {
  const verified = verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
    ledger,
    predecessorResult,
    parityChildResult
  );
  return JSON.stringify(capture(verified), null, 2) + "\n";
}

export function parseZiweiSourceBindingRequirementsSuccessorV12JsonBytes(
  bytes,
  label = ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

async function loadUpstreams() {
  const predecessor = requirePredecessor(await loadZiweiSourceBindingRequirementsSuccessor());
  const parityChild = requireParityChild(await loadZiweiRegistryTarballParityChild());
  return { predecessor, parityChild };
}

export async function buildCurrentZiweiSourceBindingRequirementsSuccessorV12() {
  const upstreams = await loadUpstreams();
  return buildExpectedZiweiSourceBindingRequirementsSuccessorV12(
    upstreams.predecessor,
    upstreams.parityChild
  );
}

export async function loadZiweiSourceBindingRequirementsSuccessorV12() {
  const upstreams = await loadUpstreams();
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    process.cwd(),
    ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "Ziwei v1.2 raw identity 漂移。");
  }
  const ledger = verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
    parseZiweiSourceBindingRequirementsSuccessorV12JsonBytes(snapshot.bytes, snapshot.path),
    upstreams.predecessor,
    upstreams.parityChild
  );
  if (new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)
    !== serializeZiweiSourceBindingRequirementsSuccessorV12(
      ledger,
      upstreams.predecessor,
      upstreams.parityChild
    )) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "Ziwei v1.2 必须保持唯一 pretty JSON 与 LF。");
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
    partialCandidatesAttached: ledger.gateSummary.partialCandidatesAttached,
    newCandidateIdsAdded: ledger.gateSummary.newCandidateIdsAdded,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    registryPackageTarballsObserved: ledger.gateSummary.registryPackageTarballsObserved,
    registrySelectedEntryByteParitiesOperatorObserved:
      ledger.gateSummary.registrySelectedEntryByteParitiesOperatorObserved,
    rightsLegalConclusionEstablished: ledger.sourceRightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: ledger.sourceRightsBoundary.redistributionAuthorized,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    artifact: publicIdentity(snapshot),
    predecessorArtifact: publicIdentity(PREDECESSOR_V1_1),
    parityChildArtifact: publicIdentity(PARITY_CHILD),
    ledger
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedZiweiSourceBindingRequirementsSuccessorV12(value) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value) && Object.isFrozen(value);
}

export function getZiweiSourceBindingRequirementsSuccessorV12Summary(value) {
  if (!isVerifiedZiweiSourceBindingRequirementsSuccessorV12(value)) {
    fail("PRIVATE_BRAND_MISSING", "summary 只接受 Ziwei v1.2 full-loader 私有品牌。");
  }
  return Object.freeze({
    ledgerId: value.ledgerId,
    ledgerDigest: value.ledgerDigest,
    status: value.status,
    formalV1RemainsCurrent: value.formalV1RemainsCurrent,
    predecessorV11RemainsNonformal: value.predecessorV11RemainsNonformal,
    successorIsFormalCurrent: value.successorIsFormalCurrent,
    successorActiveEffect: value.successorActiveEffect,
    partialCandidatesAttached: value.partialCandidatesAttached,
    newCandidateIdsAdded: value.newCandidateIdsAdded,
    bindingFrozenVerified: value.bindingFrozenVerified,
    bindingRequired: value.bindingRequired,
    registryPackageTarballsObserved: value.registryPackageTarballsObserved,
    registrySelectedEntryByteParitiesOperatorObserved:
      value.registrySelectedEntryByteParitiesOperatorObserved,
    rightsLegalConclusionEstablished: value.rightsLegalConclusionEstablished,
    redistributionAuthorized: value.redistributionAuthorized,
    releaseReady: value.releaseReady,
    publicReleaseAuthorized: value.publicReleaseAuthorized,
    rawBytes: value.artifact.rawBytes,
    rawSha256: value.artifact.rawSha256
  });
}

export const ziweiSourceBindingRequirementsSuccessorV12TestOnly = Object.freeze({
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  FORMAL_V1,
  LEDGER_ID,
  PARITY_CHILD,
  PREDECESSOR_V1_1,
  RECORD_TYPE,
  RIGHTS_CANDIDATE_ID,
  STATUS,
  TARGET_SUBJECT_ID,
  exactJson
});
