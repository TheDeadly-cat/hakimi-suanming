import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild,
  isVerifiedZiweiDeclaredDependencyLicenseCarrierChild,
  loadZiweiDeclaredDependencyLicenseCarrierChild
} from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";

const REFLECT_APPLY = Reflect.apply;
const NATIVE_JSON = JSON;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const REGEXP_TEST = RegExp.prototype.test;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export const ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/ziwei-source-binding-requirements.v1.1.0.json";

const PREDECESSOR = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-source-binding-requirements.v1.json",
  rawBytes: 25_790,
  rawSha256: "6ea7baee1e0ea63d7337ea6b6d78b8e7cb5da91a62bb902eaa591245539c7b3f",
  ledgerId: "hakimi.ziwei-doushu.source-binding-requirements/1.0.0",
  ledgerDigest: "5d3961d46e5d3d35872621faac17b0ec886c32f8d925d44c0c71f7967d19b03f"
});

const CHILD = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-declared-dependency-license-carrier-observation-child.v1.json",
  rawBytes: 14_812,
  rawSha256: "201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8",
  childId: "hakimi.ziwei.declared-dependency-license-carrier-observation-child/1.0.0",
  childDigest: "714b5e0b1ff2c75a85bd3804ca53f01b07ad2e663c0f89b381b3cdcbb4df0c27",
  createdAtUpperBound: "2026-09-01T12:22:29.817Z"
});

const LEDGER_ID = "hakimi.ziwei-doushu.source-binding-requirements/1.1.0";
const RECORD_TYPE = "independent_system_source_binding_requirements_successor_candidate";
const STATUS =
  "requirements_plus_existing_hko_and_one_partial_declared_dependency_carrier_candidate_no_bindings_frozen_nonformal_zero_active_effect";
const CREATED_AT = "2026-09-01T12:22:20.000Z";
const DIGEST_DOMAIN = "hakimi.ziwei-doushu.source-binding-requirements.successor.v1.1\0";
const TARGET_SUBJECT_ID = "ziwei.rights.engine-code-and-dependency-notices";
const CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/declared-dependency-license-carriers/1.0.0";
const SHA256 = /^[0-9a-f]{64}$/u;

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 32_889,
  rawSha256: "c7cecdb82e5a42788c3329fc63d5948115ad58252b092a2b2cc70a9649b2953e"
});

export class ZiweiSourceBindingRequirementsSuccessorError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiSourceBindingRequirementsSuccessorError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new ZiweiSourceBindingRequirementsSuccessorError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capture(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, NATIVE_JSON, [
      canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(value)
    ]);
  } catch (cause) {
    if (cause instanceof ZiweiSourceBindingRequirementsSuccessorError) throw cause;
    fail("INPUT_INVALID", "Ziwei source successor 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(left)
    === canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const keys = OBJECT_KEYS(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeZiweiSourceBindingRequirementsSuccessorDigest(ledger) {
  const snapshot = capture(ledger);
  delete snapshot.ledgerDigest;
  return sha256Text(
    DIGEST_DOMAIN
      + canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(snapshot)
  );
}

export function parseZiweiSourceBindingRequirementsSuccessorJsonBytes(
  bytes,
  label = ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "SUCCESSOR_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function publicIdentity(snapshot) {
  return {
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  };
}

function requireVerifiedChild(result) {
  if (!isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(result)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED", "successor 必须消费 carrier child full-loader 私有品牌。");
  }
  if (result.childId !== CHILD.childId || result.childDigest !== CHILD.childDigest
    || result.artifact?.path !== CHILD.path || result.artifact?.rawBytes !== CHILD.rawBytes
    || result.artifact?.rawSha256 !== CHILD.rawSha256
    || result.dependencyCarrierCount !== 7 || result.bindingRequired !== 27
    || result.bindingFrozenVerified !== 0
    || result.rightsLegalConclusionEstablished !== false
    || result.redistributionAuthorized !== false
    || result.child?.sourceRequirementsProjectionBoundary?.targetSubjectId !== TARGET_SUBJECT_ID
    || result.child.sourceRequirementsProjectionBoundary.subjectFullySatisfied !== false
    || result.child.sourceRequirementsProjectionBoundary.formalExactQuoteBound !== false
    || result.child.sourceRequirementsProjectionBoundary.sourceBodyBound !== false
    || result.child.sourceRequirementsProjectionBoundary.completeDependencyNoticeClosureEstablished
      !== false
    || result.child?.parentBindingBoundary?.bindsZiweiSourceRequirementsV1 !== false
    || result.child?.observationBoundary?.mutationEpochAvailable !== false
    || result.child.observationBoundary.mutationEpochReceipt !== null
    || result.child.observationBoundary.crossFileAtomicSnapshotEstablished !== false
    || result.child.observationBoundary.intervalMutationExcluded !== false
    || result.child.observationBoundary.abaExcluded !== false) {
    fail("CHILD_IDENTITY_OR_BOUNDARY_DRIFT", "carrier child raw/self 或失败关闭边界漂移。");
  }
  return result;
}

export async function readZiweiSourceBindingRequirementsPredecessor(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  if (snapshot.rawBytes !== PREDECESSOR.rawBytes
    || snapshot.rawSha256 !== PREDECESSOR.rawSha256) {
    fail("PREDECESSOR_RAW_IDENTITY_DRIFT", "Ziwei requirements formal v1 raw identity 漂移。");
  }
  let ledger;
  try {
    ledger = parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail("PREDECESSOR_JSON_INVALID", "Ziwei requirements formal v1 不是严格 JSON。", cause);
  }
  if (ledger?.ledgerId !== PREDECESSOR.ledgerId
    || ledger?.ledgerDigest !== PREDECESSOR.ledgerDigest
    || ledger?.schemaVersion !== "1.0.0"
    || !ARRAY_IS_ARRAY(ledger.subjects) || ledger.subjects.length !== 27
    || !ARRAY_IS_ARRAY(ledger.candidateEvidenceBindings)
    || ledger.candidateEvidenceBindings.length !== 1
    || ledger.candidateEvidenceBindings[0]?.subjectId
      !== "ziwei.engineering.official-calendar-differential"
    || ledger.gateSummary?.bindingRequired !== 27
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.sourceCandidatesAttached !== 1) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "Ziwei requirements formal v1 语义或 1 partial / 0/27 状态漂移。");
  }
  return deepFreeze({ snapshot: publicIdentity(snapshot), ledger: capture(ledger) });
}

function candidateBinding() {
  return {
    subjectId: TARGET_SUBJECT_ID,
    candidateId: CANDIDATE_ID,
    coverageScope:
      "seven_declared_local_package_manifest_and_license_carrier_endpoint_identities_only_not_complete_dependency_notice_closure",
    bindingState: "candidate_only_unbound",
    evidenceArtifact: {
      path: CHILD.path,
      rawBytes: CHILD.rawBytes,
      rawSha256: CHILD.rawSha256,
      childId: CHILD.childId,
      childDigest: CHILD.childDigest
    },
    dependencyCarrierEndpointsObserved: 7,
    sourceBodyDigest: null,
    exactQuoteStored: false,
    candidateExactLocatorObserved: true,
    formalExactLocatorEstablished: false,
    subjectFullySatisfied: false,
    frozenBindingId: null,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    independentRightsReviewVerified: false,
    countsTowardFrozenBindingGate: false
  };
}

function successorSubject(subject) {
  if (subject.subjectId !== TARGET_SUBJECT_ID) return capture(subject);
  return {
    ...capture(subject),
    bindingState: "candidate_only_unbound",
    sourceCandidateIds: [CANDIDATE_ID],
    candidateEvidenceDigest: CHILD.childDigest,
    candidateCoverageScope:
      "seven_declared_local_package_manifest_and_license_carrier_endpoint_identities_only_not_complete_dependency_notice_closure",
    candidateLicenseCarrierEndpointsObserved: 7,
    candidateExactQuoteObserved: false,
    candidateExactLocatorObserved: true,
    subjectFullySatisfied: false,
    countsTowardFrozenBindingGate: false
  };
}

export function buildExpectedZiweiSourceBindingRequirementsSuccessor(
  predecessorInput,
  childResult
) {
  const predecessor = capture(predecessorInput);
  requireVerifiedChild(childResult);
  if (predecessor.ledgerId !== PREDECESSOR.ledgerId
    || predecessor.ledgerDigest !== PREDECESSOR.ledgerDigest
    || predecessor.subjects?.length !== 27
    || predecessor.candidateEvidenceBindings?.length !== 1) {
    fail("PREDECESSOR_SEMANTIC_DRIFT", "successor 只接受固定 Ziwei formal v1 predecessor。");
  }
  const subjects = [];
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, subjects, [successorSubject(predecessor.subjects[index])]);
  }
  const candidateEvidenceBindings = [capture(predecessor.candidateEvidenceBindings[0])];
  REFLECT_APPLY(ARRAY_PUSH, candidateEvidenceBindings, [candidateBinding()]);
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: RECORD_TYPE,
    ledgerId: LEDGER_ID,
    productSystemId: predecessor.productSystemId,
    contractSystemId: predecessor.contractSystemId,
    status: STATUS,
    createdAt: CREATED_AT,
    timeBoundary: {
      createdAtClock: "untrusted_local_clock_label",
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CHILD.createdAtUpperBound,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false
    },
    releaseGovernance: {
      ...capture(predecessor.releaseGovernance),
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null
    },
    predecessorBinding: {
      path: PREDECESSOR.path,
      rawBytes: PREDECESSOR.rawBytes,
      rawSha256: PREDECESSOR.rawSha256,
      ledgerId: PREDECESSOR.ledgerId,
      ledgerDigest: PREDECESSOR.ledgerDigest,
      remainsFormalCurrent: true
    },
    childEvidenceBinding: {
      path: CHILD.path,
      rawBytes: CHILD.rawBytes,
      rawSha256: CHILD.rawSha256,
      childId: CHILD.childId,
      childDigest: CHILD.childDigest,
      privateBrandRequiredAtVerification: true,
      relationship: "one_way_carrier_child_to_nonformal_source_requirements_successor"
    },
    formalStateBoundary: {
      predecessorRemainsFormalCurrent: true,
      successorIsFormalCurrent: false,
      successorActiveEffect: "none",
      predecessorMutated: false,
      predecessorBacklinkAdded: false,
      childMutated: false,
      childBacklinkAdded: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      centralAdmissionIntegrated: false,
      ownerAdmissionAccepted: false
    },
    crossSystemIsolationBoundary: {
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      vedicAuthorityInherited: false,
      crossSystemContentTruthInherited: false,
      crossSystemRightsConclusionInherited: false,
      crossSystemLegalConclusionInherited: false,
      crossSystemExpertConclusionInherited: false
    },
    defaultClosureRequirements: capture(predecessor.defaultClosureRequirements),
    basisArtifacts: capture(predecessor.basisArtifacts),
    candidateEvidenceBindings,
    subjects,
    gateSummary: {
      bindingRequired: 27,
      bindingFrozenVerified: 0,
      partialCandidatesAttached: 2,
      sourceCandidatesAttached: 2,
      subjectsWithPartialCandidate: 2,
      subjectFullySatisfied: 0,
      sourceBodiesBound: 1,
      licenseCarrierEndpointObservationsAttached: 7,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 1,
      workRightsEstablished: 0,
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
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      centralAdmissionIntegrated: false,
      ownerAdmissionAccepted: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    },
    evidenceLedger: {
      engineeringRequirementIdentity:
        "formal_v1_raw_semantics_existing_hko_candidate_26_canonical_exact_subjects_and_one_partial_rights_carrier_candidate_verified",
      browserRuntimeEvidence: "not_assessed_in_successor_candidate",
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
    observationBoundary: {
      endpointSnapshotOnly: true,
      predecessorAndChildAtomicSnapshot: false,
      contextArtifactsAtomicSnapshot: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    runtimeTrustBoundary: {
      fixedPathCliImplementationBoundBySuccessorIdentity: false,
      launcherIntegrityEstablished: false,
      loaderIdentityEstablished: false,
      visibleGuardIsSecurityBoundary: false,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      assumesNoArbitraryPreEvaluationCodeExecution: true
    },
    authorityBoundary: {
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      formalAdmissionAuthorized: false,
      expertClaimsAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    doesNotEstablish: [
      "formal_current_requirements_replacement_or_active_effect",
      "formal_manifest_registry_central_or_owner_admission",
      "complete_dependency_notice_or_installed_runtime_build_tooling_fortel_default_web_closure",
      "source_body_exact_quote_formal_locator_or_binding_freeze",
      "work_edition_carrier_rights_legal_conclusion_or_redistribution_authorization",
      "any_of_27_ziwei_subjects_fully_satisfied",
      "content_truth_expert_truth_or_domain_authority",
      "browser_runtime_pwa_service_worker_or_cross_browser_validation",
      "release_readiness_public_deployment_or_public_release_authorization",
      "trusted_time_digital_signature_authenticity_or_cli_attestation",
      "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    ledgerDigest: computeZiweiSourceBindingRequirementsSuccessorDigest(unsigned)
  });
}

function assertFailClosed(ledger) {
  const formal = ledger?.formalStateBoundary;
  const gate = ledger?.gateSummary;
  const integrity = ledger?.integrityBoundary;
  const authority = ledger?.authorityBoundary;
  const isolation = ledger?.crossSystemIsolationBoundary;
  const runtime = ledger?.runtimeTrustBoundary;
  if (!formal || formal.predecessorRemainsFormalCurrent !== true
    || formal.successorIsFormalCurrent !== false || formal.successorActiveEffect !== "none"
    || formal.predecessorMutated !== false || formal.predecessorBacklinkAdded !== false
    || formal.childMutated !== false || formal.childBacklinkAdded !== false
    || formal.formalManifestIntegrated !== false || formal.formalRegistryIntegrated !== false
    || formal.centralAdmissionIntegrated !== false || formal.ownerAdmissionAccepted !== false) {
    fail("FORMAL_STATE_PROMOTION_FORBIDDEN", "successor 必须保持 formal v1 当前且零 active effect。");
  }
  if (!gate || gate.bindingRequired !== 27 || gate.bindingFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.sourceCandidatesAttached !== 2
    || gate.subjectsWithPartialCandidate !== 2 || gate.subjectFullySatisfied !== 0
    || gate.sourceBodiesBound !== 1 || gate.licenseCarrierEndpointObservationsAttached !== 7
    || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 1
    || gate.workRightsEstablished !== 0 || gate.editionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.expertReviewedSubjects !== 0
    || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.sourceBundleComplete !== false || gate.rightsBundleComplete !== false
    || gate.expertReviewBundleComplete !== false
    || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.formalManifestIntegrated !== false
    || gate.formalRegistryIntegrated !== false || gate.centralAdmissionIntegrated !== false
    || gate.ownerAdmissionAccepted !== false || gate.releaseReady !== false
    || gate.publicDeploymentAuthorized !== false || gate.publicReleaseAuthorized !== false
    || gate.expertClaimsAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "successor 必须保持 0/27、两条 partial 和所有准入关闭。");
  }
  if (!integrity || integrity.digestIsDigitalSignature !== false
    || integrity.authenticityEstablished !== false
    || integrity.crossFileAtomicSnapshotEstablished !== false
    || integrity.mutationEpochAvailable !== false || integrity.mutationEpochReceipt !== null
    || integrity.intervalMutationExcludedAcrossFiles !== false || integrity.abaExcluded !== false) {
    fail("INTEGRITY_OVERCLAIM_FORBIDDEN", "successor 不得声称签名、epoch、原子、区间或 ABA 保证。");
  }
  if (!authority || authority.sourceBundleComplete !== false
    || authority.rightsBundleComplete !== false || authority.contentTruthEstablished !== false
    || authority.expertTruthEstablished !== false
    || authority.rightsLegalConclusionEstablished !== false
    || authority.redistributionAuthorized !== false || authority.formalAdmissionAuthorized !== false
    || authority.expertClaimsAuthorized !== false || authority.releaseReady !== false
    || authority.publicDeploymentAuthorized !== false || authority.publicReleaseAuthorized !== false) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "successor 的内容、专家、权利和发布 authority 必须全红。");
  }
  if (!isolation || isolation.baziAuthorityInherited !== false
    || isolation.westernAuthorityInherited !== false
    || isolation.vedicAuthorityInherited !== false
    || isolation.crossSystemContentTruthInherited !== false
    || isolation.crossSystemRightsConclusionInherited !== false
    || isolation.crossSystemLegalConclusionInherited !== false
    || isolation.crossSystemExpertConclusionInherited !== false) {
    fail(
      "CROSS_SYSTEM_INHERITANCE_FORBIDDEN",
      "successor 不得继承其他体系 authority、truth、rights、legal 或 expert 结论。"
    );
  }
  if (!runtime || runtime.fixedPathCliImplementationBoundBySuccessorIdentity !== false
    || runtime.launcherIntegrityEstablished !== false
    || runtime.loaderIdentityEstablished !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.cliOutputTrustedAttestation !== false
    || runtime.assumesNoArbitraryPreEvaluationCodeExecution !== true) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "CLI guard 不得抬为 launcher、loader、runtime 身份或可信 attestation。");
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
}

function assertSubjects(predecessor, successor) {
  if (!ARRAY_IS_ARRAY(successor?.subjects) || successor.subjects.length !== 27) {
    fail("SUBJECT_INVENTORY_DRIFT", "successor 必须保持 27 个 subject。");
  }
  let changed = 0;
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = successor.subjects[index];
    if (before.subjectId !== after?.subjectId) {
      fail("SUBJECT_ORDER_DRIFT", "subject 顺序或身份漂移。");
    }
    if (before.subjectId !== TARGET_SUBJECT_ID) {
      if (!exactJson(before, after)) {
        fail("NON_TARGET_SUBJECT_DRIFT", "26 个非目标 subject 必须与 formal v1 canonical-exact。");
      }
      continue;
    }
    if (exactJson(before, after) || after.bindingState !== "candidate_only_unbound"
      || after.sourceCandidateIds?.length !== 1
      || after.sourceCandidateIds[0] !== CANDIDATE_ID
      || after.frozenBindingId !== null || after.sourceBodyDigest !== null
      || after.exactQuoteStored !== false || after.exactLocatorEstablished !== false
      || after.workRightsEstablished !== false || after.editionRightsEstablished !== false
      || after.carrierRightsEstablished !== false
      || after.rightsLegalConclusion !== "not_established"
      || after.expertReviewIds?.length !== 0 || after.frozenAt !== null
      || after.subjectFullySatisfied !== false || after.countsTowardFrozenBindingGate !== false) {
      fail("TARGET_SUBJECT_BOUNDARY_DRIFT", "rights target 只能成为 partial candidate，formal closure 继续未建立。");
    }
    const restored = capture(after);
    restored.bindingState = before.bindingState;
    restored.sourceCandidateIds = capture(before.sourceCandidateIds);
    const addedKeys = [
      "candidateEvidenceDigest",
      "candidateCoverageScope",
      "candidateLicenseCarrierEndpointsObserved",
      "candidateExactQuoteObserved",
      "candidateExactLocatorObserved",
      "subjectFullySatisfied",
      "countsTowardFrozenBindingGate"
    ];
    for (let keyIndex = 0; keyIndex < addedKeys.length; keyIndex += 1) {
      delete restored[addedKeys[keyIndex]];
    }
    if (!exactJson(restored, before)) {
      fail("TARGET_SUBJECT_UNEXPECTED_DRIFT", "rights target 除 candidate projection 外不得漂移。");
    }
    changed += 1;
  }
  if (changed !== 1) fail("SUBJECT_CHANGE_COUNT_DRIFT", "successor 必须且只能改变 rights target。");
}

function assertCandidateBindings(predecessor, successor) {
  if (!ARRAY_IS_ARRAY(successor?.candidateEvidenceBindings)
    || successor.candidateEvidenceBindings.length !== 2
    || !exactJson(successor.candidateEvidenceBindings[0], predecessor.candidateEvidenceBindings[0])) {
    fail("HKO_CANDIDATE_ORDER_OR_IDENTITY_DRIFT", "既有 HKO candidate 必须 canonical-exact 且保持首位。");
  }
  if (!exactJson(successor.candidateEvidenceBindings[1], candidateBinding())) {
    fail("RIGHTS_CANDIDATE_DRIFT", "第二条必须是固定 carrier partial candidate。");
  }
}

function assertTimeBoundary(ledger) {
  if (ledger?.createdAt !== CREATED_AT
    || ledger?.timeBoundary?.createdAtClock !== "untrusted_local_clock_label"
    || ledger.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock
      !== CHILD.createdAtUpperBound
    || REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [ledger.createdAt])
      > REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [CHILD.createdAtUpperBound])
    || ledger.timeBoundary.trustedTimestampEstablished !== false
    || ledger.timeBoundary.externalTimeAuthorityEstablished !== false
    || ledger.timeBoundary.crossArtifactTemporalOrderEstablished !== false) {
    fail("TIME_BOUNDARY_DRIFT", "createdAt 必须不晚于 child 上界且不能成为时间权威。");
  }
}

export function verifyZiweiSourceBindingRequirementsSuccessorLedger(
  input,
  predecessorInput,
  childResult
) {
  const ledger = capture(input);
  const predecessor = capture(predecessorInput);
  requireVerifiedChild(childResult);
  assertFailClosed(ledger);
  assertTimeBoundary(ledger);
  assertSubjects(predecessor, ledger);
  assertCandidateBindings(predecessor, ledger);
  if (typeof ledger.ledgerDigest !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [ledger.ledgerDigest])) {
    fail("LEDGER_DIGEST_INVALID", "successor ledgerDigest 必须是小写 SHA-256。");
  }
  if (computeZiweiSourceBindingRequirementsSuccessorDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "successor domain-separated ledgerDigest 不匹配。");
  }
  const expected = buildExpectedZiweiSourceBindingRequirementsSuccessor(
    predecessor,
    childResult
  );
  if (!exactJson(ledger, expected)) {
    fail("SUCCESSOR_CONTRACT_MISMATCH", "successor 与固定 predecessor、branded child 和零效力合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeZiweiSourceBindingRequirementsSuccessor(
  ledger,
  predecessor,
  childResult
) {
  const verified = verifyZiweiSourceBindingRequirementsSuccessorLedger(
    ledger,
    predecessor,
    childResult
  );
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [capture(verified), null, 2]) + "\n";
}

async function loadUpstreams() {
  const predecessor = await readZiweiSourceBindingRequirementsPredecessor();
  const child = requireVerifiedChild(
    await loadZiweiDeclaredDependencyLicenseCarrierChild()
  );
  return { predecessor, child };
}

export async function buildCurrentZiweiSourceBindingRequirementsSuccessor() {
  const upstreams = await loadUpstreams();
  return buildExpectedZiweiSourceBindingRequirementsSuccessor(
    upstreams.predecessor.ledger,
    upstreams.child
  );
}

export async function loadZiweiSourceBindingRequirementsSuccessor() {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [EXPECTED_PERSISTED_RAW.rawSha256])
    || EXPECTED_PERSISTED_RAW.rawSha256
      === "0000000000000000000000000000000000000000000000000000000000000000") {
    fail("PERSISTED_IDENTITY_UNSET", "Ziwei source successor raw identity 尚未冻结。");
  }
  const upstreams = await loadUpstreams();
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    REFLECT_APPLY(PROCESS_CWD, process, []),
    ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("SUCCESSOR_RAW_IDENTITY_DRIFT", "Ziwei source successor raw identity 漂移。");
  }
  const parsed = parseZiweiSourceBindingRequirementsSuccessorJsonBytes(
    snapshot.bytes,
    snapshot.path
  );
  const ledger = verifyZiweiSourceBindingRequirementsSuccessorLedger(
    parsed,
    upstreams.predecessor.ledger,
    upstreams.child
  );
  const canonical = serializeZiweiSourceBindingRequirementsSuccessor(
    ledger,
    upstreams.predecessor.ledger,
    upstreams.child
  );
  const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
  if (REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [snapshot.bytes]) !== canonical) {
    fail("SUCCESSOR_CANONICAL_BYTES_DRIFT", "successor 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const result = deepFreeze({
    ok: true,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    status: ledger.status,
    predecessorRemainsFormalCurrent: true,
    successorIsFormalCurrent: false,
    successorActiveEffect: "none",
    bindingRequired: 27,
    bindingFrozenVerified: 0,
    partialCandidatesAttached: 2,
    subjectFullySatisfied: 0,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    artifact: publicIdentity(snapshot),
    predecessorArtifact: publicIdentity(upstreams.predecessor.snapshot),
    childArtifact: publicIdentity(upstreams.child.artifact),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedZiweiSourceBindingRequirementsSuccessor(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const ziweiSourceBindingRequirementsSuccessorTestOnly = OBJECT_FREEZE({
  PREDECESSOR,
  CHILD,
  LEDGER_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  TARGET_SUBJECT_ID,
  CANDIDATE_ID,
  EXPECTED_PERSISTED_RAW,
  candidateBinding,
  exactJson
});
