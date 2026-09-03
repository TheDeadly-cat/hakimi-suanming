import { createHash, Hash } from "node:crypto";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  loadBaziSmtV10VersionedParentSupersession,
  isVerifiedBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";
import {
  loadBaziSourceCarrierRecordReadiness,
  isVerifiedBaziSourceCarrierRecordReadiness,
  getBaziSourceCarrierRecordReadinessSummary
} from "./bazi-source-carrier-record-readiness-lib.mjs";
import {
  loadBaziExpertReviewIntakeGapVersionAwareCandidate,
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";

const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_IS = Object.is;
const OBJECT_HAS_OWN = Object.prototype.hasOwnProperty;
const NUMBER_IS_FINITE = Number.isFinite;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_STRINGIFY = JSON.stringify;
const REFLECT_APPLY = Reflect.apply;
const HASH_UPDATE = Hash.prototype.update;
const HASH_DIGEST = Hash.prototype.digest;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const NATIVE_WEAK_SET = WeakSet;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

export const BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json";

export const BAZI_V17_FROZEN_GOLDEN_SHA256 =
  "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29";

const CREATED_AT = "2026-08-31T04:00:00.000Z";

const PREDECESSOR = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.json",
  rawBytes: 12777,
  rawSha256: "d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6",
  manifestDigest: "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932"
});

// Filled only after the generated manifest bytes are stable. The manifest does
// not include this verifier, so these pins do not create a self-hash cycle.
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 16743,
  rawSha256: "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1",
  manifestDigest: "5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80"
});

const COMPONENT_SPECS = deepFreezeInternal([
  {
    componentId: "execution_rules",
    version: "ziping-working-default@0.1.0+lunar-typescript-lock",
    status: "bound_engineering_identity_only",
    files: [
      "package-lock.json",
      "packages/contracts/src/index.ts",
      "packages/rule-profiles/src/index.ts",
      "packages/bazi-core/src/index.ts"
    ]
  },
  {
    componentId: "interpretation_rules",
    version: "hakimi-bazi-strength-ten-god-candidate@0.1.0",
    status: "bound_engineering_candidate_not_expert_approved",
    files: [
      "packages/bazi-interpretation/src/index.ts",
      "packages/bazi-interpretation/src/strength-assessment-core.ts",
      "packages/bazi-interpretation/src/strength-policy.ts",
      "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
      "packages/bazi-interpretation/src/strength-claim-registry.ts",
      "packages/bazi-interpretation/src/strength-evidence-narrative.ts"
    ]
  },
  {
    componentId: "input_policy",
    version: "hakimi.bazi.input_policy/0.1.0",
    status: "bound_engineering_identity_only",
    files: [
      "packages/contracts/src/index.ts",
      "packages/rule-profiles/src/index.ts"
    ]
  },
  {
    componentId: "fact_contract",
    version: "hakimi.bazi.current_chart_review_facts/0.1.0",
    status: "bound_engineering_identity_only",
    files: [
      "packages/bazi-core/src/index.ts",
      "packages/bazi-interpretation/src/current-chart-review-snapshot.ts",
      "packages/contracts/src/index.ts"
    ]
  },
  {
    componentId: "source_bundle",
    version: "hakimi.bazi.strength.source-binding-candidates/1.7.0+binding-readiness/1.7.0",
    status: "incomplete_candidate_only_zero_frozen_bindings",
    files: [
      "content/bazi-strength-engineering-binding-candidates.v1.json",
      "content/bazi-strength-source-binding-candidates.v1.7.0.json",
      "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
      "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
      "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json"
    ]
  },
  {
    componentId: "rights_bundle",
    version: "hakimi.bazi.strength.source-rights-candidates/1.3.0+source-carrier-readiness/1.0.0",
    status: "incomplete_candidate_only_zero_formal_rights_or_carrier_records",
    files: [
      "content/bazi-strength-source-rights-candidates.v1.3.0.json",
      "content/system-admission/bazi-source-carrier-record-readiness.v1.json",
      "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
      "content/knowledge/manifest.v2.json"
    ]
  },
  {
    componentId: "expert_review_bundle",
    version: "absent/0",
    status: "absent",
    files: []
  },
  {
    componentId: "expert_review_preconditions",
    version: "vacant-intake/1.1.0+authority-material-precheck/1.0.0",
    status: "incomplete_zero_real_expert_instances",
    files: [
      "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
      "content/system-admission/bazi-expert-authority-material-precheck.v1.json"
    ]
  },
  {
    componentId: "high_risk_policy",
    version: "hakimi.bazi.high_risk_policy-candidate/0.2.0",
    status: "incomplete_not_expert_approved",
    files: [
      "content/bazi-strength-expert-review-packet.v1.json",
      "packages/bazi-interpretation/src/strength-claim-registry.ts",
      "packages/bazi-interpretation/src/strength-policy.ts"
    ]
  },
  {
    componentId: "report_contract",
    version: "single-chart-report@1.7.0",
    status: "bound_frozen_golden_engineering_contract",
    files: [
      "packages/research-export/src/golden/single-chart-report.contract.v1.7.json",
      "packages/research-export/src/single-chart-report.ts"
    ]
  }
]);

export class BaziDomainReleaseManifestV2Error extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziDomainReleaseManifestV2Error";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDomainReleaseManifestV2Error(code, message, cause ? { cause } : undefined);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function isPlainDataObject(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) === Object.prototype;
}

function canonicalClone(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number"
    && REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
    && !REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) return value;
  if (typeof value !== "object") fail("NON_CANONICAL_JSON", "manifest 只接受有限 JSON 数据图。 ");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) fail("NON_CANONICAL_JSON", "manifest 不接受 alias 或 cycle。 ");
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    const output = new Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [value, String(index)]
      );
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, descriptor, ["value"])) {
        fail("NON_CANONICAL_JSON", "manifest 不接受 sparse array。 ");
      }
      output[index] = canonicalClone(descriptor.value, seen);
    }
    return output;
  }
  if (!isPlainDataObject(value)) fail("NON_CANONICAL_JSON", "manifest 只接受 plain object。 ");
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  const output = {};
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, descriptor, ["value"])) {
      fail("NON_CANONICAL_JSON", "manifest 不接受 accessor。 ");
    }
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
      value: canonicalClone(descriptor.value, seen),
      enumerable: true,
      configurable: true,
      writable: true
    }]);
  }
  return output;
}

export function canonicalStringifyBaziDomainReleaseManifestV2(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalClone(value)]);
}

function deepFreezeInternal(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, descriptor, ["value"])) {
      deepFreezeInternal(descriptor.value, seen);
    }
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function componentDigest(component) {
  return sha256Text(canonicalStringifyBaziDomainReleaseManifestV2({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  }));
}

export function computeBaziDomainReleaseManifestV2Digest(manifest) {
  if (!isPlainDataObject(manifest)) fail("MANIFEST_INVALID", "manifest 必须是 plain object。 ");
  const unsigned = {};
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [manifest]);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key !== "manifestDigest") {
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [manifest, key]);
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, descriptor, ["value"])) {
        fail("NON_CANONICAL_JSON", "manifest digest 不接受 accessor。 ");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [unsigned, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: true,
        writable: true
      }]);
    }
  }
  return sha256Text(canonicalStringifyBaziDomainReleaseManifestV2(unsigned));
}

function requireEqual(actual, expected, code, label) {
  if (actual !== expected) fail(code, `${label} 不符合固定边界。`);
}

function findComponent(components, componentId) {
  let match = null;
  for (let index = 0; index < components.length; index += 1) {
    if (components[index].componentId === componentId) {
      if (match) fail("COMPONENT_DUPLICATE", `组件 ${componentId} 重复。`);
      match = components[index];
    }
  }
  if (!match) fail("COMPONENT_MISSING", `组件 ${componentId} 缺失。`);
  return match;
}

async function readPredecessor(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  requireEqual(snapshot.rawBytes, PREDECESSOR.rawBytes, "PREDECESSOR_DRIFT", "旧 manifest raw bytes");
  requireEqual(snapshot.rawSha256, PREDECESSOR.rawSha256, "PREDECESSOR_DRIFT", "旧 manifest raw SHA-256");
  const manifest = parseBaziDttStrictJsonArtifact(snapshot);
  requireEqual(manifest.manifestDigest, PREDECESSOR.manifestDigest, "PREDECESSOR_DRIFT", "旧 manifest digest");
  return { snapshot, manifest };
}

async function buildComponents(workspaceRoot) {
  const components = [];
  for (let specIndex = 0; specIndex < COMPONENT_SPECS.length; specIndex += 1) {
    const spec = COMPONENT_SPECS[specIndex];
    const files = [];
    for (let fileIndex = 0; fileIndex < spec.files.length; fileIndex += 1) {
      const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, spec.files[fileIndex]);
      REFLECT_APPLY(ARRAY_PUSH, files, [{
        path: snapshot.path,
        rawBytes: snapshot.rawBytes,
        sha256: snapshot.rawSha256
      }]);
    }
    const component = {
      componentId: spec.componentId,
      version: spec.version,
      status: spec.status,
      files
    };
    REFLECT_APPLY(ARRAY_PUSH, components, [{ ...component, digest: componentDigest(component) }]);
  }
  return components;
}

async function loadVerifiedContexts(workspaceRoot) {
  const smt = await loadBaziSmtV10VersionedParentSupersession(workspaceRoot);
  if (!isVerifiedBaziSmtV10VersionedParentSupersession(smt)) {
    fail("UPSTREAM_BRAND_REQUIRED", "SMT source/rights supersession private brand 缺失。 ");
  }
  const carrierCapability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
  if (!isVerifiedBaziSourceCarrierRecordReadiness(carrierCapability)) {
    fail("UPSTREAM_BRAND_REQUIRED", "SourceCarrier readiness private brand 缺失。 ");
  }
  const carrier = getBaziSourceCarrierRecordReadinessSummary(carrierCapability);
  const expert = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  if (!isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(expert)) {
    fail("UPSTREAM_BRAND_REQUIRED", "expert intake private brand 缺失。 ");
  }

  requireEqual(smt.bindingRequired, 12, "UPSTREAM_GATE_DRIFT", "SMT bindingRequired");
  requireEqual(smt.bindingFrozenVerified, 0, "UPSTREAM_GATE_DRIFT", "SMT bindingFrozenVerified");
  requireEqual(smt.formalKnowledgeDocumentCount, 0, "UPSTREAM_GATE_DRIFT", "KnowledgeDocument count");
  requireEqual(smt.formalSourceRightsRecordCount, 0, "UPSTREAM_GATE_DRIFT", "SourceRights count");
  requireEqual(smt.formalSourceCarrierRecordCount, 0, "UPSTREAM_GATE_DRIFT", "SourceCarrier count");
  requireEqual(
    smt.boundReadinessConsumesSupersedingParents,
    false,
    "UPSTREAM_GATE_DRIFT",
    "binding readiness latest-parent adoption"
  );
  requireEqual(
    smt.boundReadinessStillPinsHistoricalParents,
    true,
    "UPSTREAM_GATE_DRIFT",
    "binding readiness historical-parent pin"
  );
  requireEqual(
    smt.sourceCarrierReadinessSuccessorCreated,
    false,
    "UPSTREAM_GATE_DRIFT",
    "SourceCarrier readiness successor"
  );
  requireEqual(smt.releaseReady, false, "UPSTREAM_GATE_DRIFT", "SMT releaseReady");
  requireEqual(carrier.formalSourceRightsRecords, 0, "UPSTREAM_GATE_DRIFT", "carrier rights record count");
  requireEqual(carrier.formalSourceCarrierRecords, 0, "UPSTREAM_GATE_DRIFT", "carrier record count");
  requireEqual(carrier.sourceBindingsFrozen, 0, "UPSTREAM_GATE_DRIFT", "carrier frozen binding count");
  requireEqual(expert.domainExpertsRequired, 2, "UPSTREAM_GATE_DRIFT", "expert seats required");
  requireEqual(expert.reviewerSlotsOccupied, 0, "UPSTREAM_GATE_DRIFT", "expert seats occupied");
  requireEqual(expert.independentExpertReviewsVerified, 0, "UPSTREAM_GATE_DRIFT", "expert reviews verified");
  requireEqual(expert.expertReviewBundleComplete, false, "UPSTREAM_GATE_DRIFT", "expert bundle completion");
  requireEqual(expert.packetArtifactLocksCurrent, false, "UPSTREAM_GATE_DRIFT", "formal expert packet currency");
  return { smt, carrier, expert };
}

function assertFrozenGolden(components) {
  const report = findComponent(components, "report_contract");
  let golden = null;
  for (let index = 0; index < report.files.length; index += 1) {
    if (report.files[index].path === "packages/research-export/src/golden/single-chart-report.contract.v1.7.json") {
      golden = report.files[index];
    }
  }
  if (!golden || golden.sha256 !== BAZI_V17_FROZEN_GOLDEN_SHA256) {
    fail("V17_GOLDEN_DRIFT", "v1.7 frozen golden 漂移；不得签发 v2 机器身份。 ");
  }
}

function buildUnsignedManifest(components, contexts) {
  const interpretation = findComponent(components, "interpretation_rules");
  const input = findComponent(components, "input_policy");
  const fact = findComponent(components, "fact_contract");
  const source = findComponent(components, "source_bundle");
  const rights = findComponent(components, "rights_bundle");
  const expertBundle = findComponent(components, "expert_review_bundle");
  const expertPreconditions = findComponent(components, "expert_review_preconditions");
  const highRisk = findComponent(components, "high_risk_policy");
  const report = findComponent(components, "report_contract");
  const { smt, carrier, expert } = contexts;
  return {
    schemaVersion: "2.0.0",
    recordType: "system_domain_release_manifest",
    manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0",
    manifestRevision: "2.0.0",
    systemId: "bazi",
    surface: {
      surfaceId: "single-chart-report",
      productVersion: "1.7",
      surfaceVersion: "1.7.0",
      versionMeaning: "product_surface_contract_not_database_schema_domain_truth_expert_truth_or_release_authority"
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    lineage: {
      supersedesForCurrentMachineIdentityOnly: PREDECESSOR,
      predecessorPreservedUnmodified: true,
      predecessorCurrent: false,
      centralSystemAdmissionRegistryIntegrated: false,
      crossSystemEngineeringReceiptRegistryIntegrated: false
    },
    domainIdentity: {
      productVersion: "1.7",
      domainRulesetVersion: interpretation.version,
      rulesetDigest: interpretation.digest,
      inputPolicyVersion: input.version,
      inputPolicyDigest: input.digest,
      factSchemaVersion: fact.version,
      factSchemaDigest: fact.digest,
      sourceBundleVersion: source.version,
      sourceBundleDigest: source.digest,
      rightsBundleVersion: rights.version,
      rightsBundleDigest: rights.digest,
      expertReviewIds: [],
      expertReviewBundleVersion: expertBundle.version,
      expertReviewBundleDigest: expertBundle.digest,
      expertReviewPreconditionBundleVersion: expertPreconditions.version,
      expertReviewPreconditionBundleDigest: expertPreconditions.digest,
      highRiskPolicyVersion: highRisk.version,
      highRiskPolicyDigest: highRisk.digest,
      reportContractVersion: report.version,
      reportContractDigest: report.digest,
      frozenGoldenSha256: BAZI_V17_FROZEN_GOLDEN_SHA256
    },
    verifiedMechanicalContexts: [
      {
        contextId: smt.supersessionId,
        contextDigest: smt.supersessionDigest,
        role: "current_source_rights_versioned_pair_candidate_only",
        sourceLedgerId: smt.sourceLedgerId,
        sourceLedgerDigest: smt.sourceLedgerDigest,
        rightsLedgerId: smt.rightsLedgerId,
        rightsLedgerDigest: smt.rightsLedgerDigest,
        privateBrandVerified: true,
        activeAdmissionEffect: "none"
      },
      {
        contextId: carrier.ledgerId,
        contextDigest: carrier.ledgerDigest,
        role: "source_carrier_zero_instance_readiness",
        privateBrandVerified: true,
        activeAdmissionEffect: carrier.activeAdmissionEffect
      },
      {
        contextId: expert.ledgerId,
        contextDigest: expert.ledgerDigest,
        role: "vacant_expert_intake_gap_candidate",
        privateBrandVerified: true,
        activeAdmissionEffect: expert.activeAdmissionEffect
      }
    ],
    components,
    gateState: {
      machineIdentityPinnedToPersistedManifestBytes: true,
      frozenGoldenMatchesCurrentBytes: true,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      independentExpertsRequired: 2,
      reviewerSlotsOccupied: 0,
      independentExpertReviewsVerified: 0,
      sealedOriginalOpinions: 0,
      bindingReadinessConsumesLatestSourceRightsPair: smt.boundReadinessConsumesSupersedingParents,
      bindingReadinessStillPinsHistoricalParents: smt.boundReadinessStillPinsHistoricalParents,
      sourceCarrierReadinessSuccessorCreated: smt.sourceCarrierReadinessSuccessorCreated,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyExpertApproved: false,
      releaseEvidenceComplete: false,
      releaseCandidateFreezeAllowed: false,
      formalAdmissionPromotionBlocked: true
    },
    snapshotBoundary: {
      eachComponentFileReadThroughStableHeldHandle: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    evidenceLedger: {
      engineeringIdentity: "persisted_v2_manifest_and_component_endpoint_hashes_mechanically_verified",
      browserRuntimeEvidence: "not_assessed_in_domain_manifest_v2",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    authorityBoundary: {
      machineIdentityOnly: true,
      ownerAcceptanceForReleaseCandidateEstablished: false,
      sourceFreezeEstablished: false,
      rightsLegalConclusionEstablished: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    doesNotEstablish: [
      "domain_or_content_truth",
      "expert_identity_credentials_independence_opinion_or_truth",
      "source_freeze_or_rights_legal_conclusion",
      "browser_pwa_service_worker_or_runtime_validation",
      "cross_file_atomic_snapshot_or_schema13_mutation_epoch",
      "interval_mutation_or_aba_exclusion",
      "owner_acceptance_for_release_candidate",
      "release_candidate_freeze_release_evidence_or_release_readiness",
      "public_release_deployment_or_expert_claims_authorization",
      "cross_system_authority_inheritance"
    ],
    releaseStatus: "engineering_candidate",
    createdAt: CREATED_AT
  };
}

export async function buildCurrentBaziDomainReleaseManifestV2(workspaceRoot) {
  const predecessor = await readPredecessor(workspaceRoot);
  void predecessor;
  const contexts = await loadVerifiedContexts(workspaceRoot);
  const components = await buildComponents(workspaceRoot);
  assertFrozenGolden(components);
  const unsigned = buildUnsignedManifest(components, contexts);
  return { ...unsigned, manifestDigest: computeBaziDomainReleaseManifestV2Digest(unsigned) };
}

export function serializeBaziDomainReleaseManifestV2(manifest) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [manifest, null, 2])}\n`;
}

function verifyPersistedAgainstExpected(snapshot, persisted, expected) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_UNPINNED", "v2 manifest 固定 raw identity 尚未写入 verifier。 ");
  }
  requireEqual(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "MANIFEST_RAW_DRIFT", "v2 manifest raw bytes");
  requireEqual(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "MANIFEST_RAW_DRIFT", "v2 manifest raw SHA-256");
  requireEqual(persisted.manifestDigest, EXPECTED_PERSISTED.manifestDigest, "MANIFEST_DIGEST_DRIFT", "v2 manifest digest pin");
  requireEqual(
    computeBaziDomainReleaseManifestV2Digest(persisted),
    persisted.manifestDigest,
    "MANIFEST_DIGEST_INVALID",
    "v2 manifest self digest"
  );
  if (canonicalStringifyBaziDomainReleaseManifestV2(persisted)
    !== canonicalStringifyBaziDomainReleaseManifestV2(expected)) {
    fail("MANIFEST_MISMATCH", "v2 manifest 与当前组件、上游红门或证据分账不一致。 ");
  }
}

export async function loadBaziDomainReleaseManifestV2(workspaceRoot) {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  verifyPersistedAgainstExpected(snapshot, persisted, expected);
  const result = deepFreezeInternal({
    manifest: persisted,
    manifestId: persisted.manifestId,
    manifestDigest: persisted.manifestDigest,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    machineIdentityPinned: true,
    frozenGoldenSha256: persisted.domainIdentity.frozenGoldenSha256,
    bindingRequired: persisted.gateState.bindingRequired,
    bindingFrozenVerified: persisted.gateState.bindingFrozenVerified,
    independentExpertsRequired: persisted.gateState.independentExpertsRequired,
    independentExpertReviewsVerified: persisted.gateState.independentExpertReviewsVerified,
    releaseReady: persisted.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: persisted.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: persisted.authorityBoundary.expertClaimsAuthorized,
    crossFileAtomicSnapshot: persisted.snapshotBoundary.crossFileAtomicSnapshot,
    mutationEpochAvailableForSchema13: persisted.snapshotBoundary.mutationEpochAvailableForSchema13,
    mutationEpochReceipt: persisted.snapshotBoundary.mutationEpochReceipt,
    intervalMutationExcludedAcrossFiles: persisted.snapshotBoundary.intervalMutationExcludedAcrossFiles,
    abaExcluded: persisted.snapshotBoundary.abaExcluded
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestV2(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziDomainReleaseManifestV2TestOnly = OBJECT_FREEZE({
  PREDECESSOR,
  EXPECTED_PERSISTED,
  COMPONENT_SPECS,
  componentDigest,
  verifyPersistedAgainstExpected,
  deepFreezeInternal
});
