import { createHash } from "node:crypto";

import {
  isVerifiedBaziDomainReleaseManifestV2,
  loadBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";
import {
  isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate,
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziExpertPrivacyFormalIntakeReconciliation,
  loadBaziExpertPrivacyFormalIntakeReconciliation
} from "./bazi-expert-privacy-formal-intake-reconciliation-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
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
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export const BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.1.0.json";

const MANIFEST_ID = "hakimi.bazi.single-chart-report.domain-release-manifest/2.1.0";
const CREATED_AT = "2026-08-31T12:00:00.000Z";
const PARENT_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json",
  rawBytes: 16743,
  rawSha256: "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0",
  manifestDigest: "5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80"
});
const CARRIER = OBJECT_FREEZE({
  path: "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
  rawBytes: 18654,
  rawSha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
  ledgerId: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
  ledgerDigest: "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
});
const RECONCILIATION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json",
  rawBytes: 10260,
  rawSha256: "f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17",
  ledgerId: "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0",
  ledgerDigest: "cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 19064,
  rawSha256: "68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413",
  manifestDigest: "f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziDomainReleaseManifestV21Error extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "BaziDomainReleaseManifestV21Error";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziDomainReleaseManifestV21Error(code, message);
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
      fail("NON_PASSIVE_OBJECT", "manifest 只接受无 accessor 的被动 JSON 值。");
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
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_VALUE", "非有限数值与 -0 不可进入 canonical JSON。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (current === null || typeof current !== "object") {
      fail("NON_JSON_VALUE", "只接受 JSON 原语、普通对象和数组。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_TREE_JSON", "canonical JSON 不接受循环或对象别名。");
    }
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
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
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
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
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

function prettyStringifyPassive(value) {
  function indent(depth) {
    return REFLECT_APPLY(STRING_REPEAT, "  ", [depth]);
  }
  function visit(current, depth) {
    if (current === null || typeof current === "boolean"
      || typeof current === "string" || typeof current === "number") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (current.length === 0) return "[]";
      const lines = [];
      for (let index = 0; index < current.length; index += 1) {
        const key = REFLECT_APPLY(NATIVE_STRING, undefined, [index]);
        const descriptor = descriptors[key];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_PASSIVE_OBJECT", "pretty JSON 数组不得含空洞或 accessor。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, key, {
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
        fail("NON_PASSIVE_OBJECT", "pretty JSON 仅接受 data properties。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [lines, REFLECT_APPLY(NATIVE_STRING, undefined, [index]), {
        value: `${indent(depth + 1)}${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}: ${visit(descriptor.value, depth + 1)}`,
        writable: true, enumerable: true, configurable: true
      }]);
    }
    return `{\n${REFLECT_APPLY(ARRAY_JOIN, lines, [",\n"])}\n${indent(depth)}}`;
  }
  canonicalStringify(value);
  return `${visit(value, 0)}\n`;
}

function sha256Text(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function equal(actual, expected, label) {
  if (actual !== expected) fail("PARENT_BOUNDARY_MISMATCH", `${label} 不符合固定边界。`);
}

function parentArtifact(summary, pin, label) {
  equal(summary.artifact?.path, pin.path, `${label}.path`);
  equal(summary.artifact?.bytes, pin.rawBytes, `${label}.rawBytes`);
  equal(summary.artifact?.sha256, pin.rawSha256, `${label}.rawSha256`);
}

function assertManifestParent(parent) {
  if (!isVerifiedBaziDomainReleaseManifestV2(parent)) {
    fail("MANIFEST_V2_BRAND_REQUIRED", "必须消费当前 manifest v2 full-loader 私有品牌。");
  }
  equal(parent.manifestId, PARENT_MANIFEST.manifestId, "manifest parent id");
  equal(parent.manifestDigest, PARENT_MANIFEST.manifestDigest, "manifest parent digest");
  equal(parent.rawBytes, PARENT_MANIFEST.rawBytes, "manifest parent raw bytes");
  equal(parent.rawSha256, PARENT_MANIFEST.rawSha256, "manifest parent raw sha256");
  equal(parent.bindingRequired, 12, "manifest binding required");
  equal(parent.bindingFrozenVerified, 0, "manifest frozen bindings");
  equal(parent.independentExpertsRequired, 2, "manifest experts required");
  equal(parent.independentExpertReviewsVerified, 0, "manifest expert reviews");
  equal(parent.releaseReady, false, "manifest release ready");
  equal(parent.publicDeploymentAuthorized, false, "manifest public deployment");
  equal(parent.expertClaimsAuthorized, false, "manifest expert claims");
  equal(parent.manifest?.releaseGovernance?.releaseIdentity, "legacy-v13", "release line");
  equal(parent.manifest?.releaseGovernance?.targetSchema, 13, "target schema");
  equal(parent.manifest?.releaseGovernance?.migrationId, null, "migration id");
}

function assertCarrierParent(carrier) {
  if (!isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(carrier)) {
    fail("CARRIER_V11_BRAND_REQUIRED", "必须消费 SourceCarrier readiness v1.1 私有品牌。");
  }
  equal(carrier.ledgerId, CARRIER.ledgerId, "carrier id");
  equal(carrier.ledgerDigest, CARRIER.ledgerDigest, "carrier digest");
  parentArtifact(carrier, CARRIER, "carrier artifact");
  equal(carrier.formalKnowledgeDocumentCount, 0, "carrier formal knowledge documents");
  equal(carrier.formalSourceRightsRecordCount, 0, "carrier formal rights records");
  equal(carrier.formalSourceCarrierRecordCount, 0, "carrier formal carrier records");
  equal(carrier.bindingFrozenVerified, 0, "carrier frozen bindings");
  equal(carrier.bindingRequired, 12, "carrier binding required");
  equal(carrier.bindingReadinessConsumesSupersedingParents, false, "binding readiness parent rebind");
  equal(carrier.cM1ConsumesSupersedingParents, false, "C-M1 parent rebind");
  equal(carrier.releaseReady, false, "carrier release ready");
}

function assertReconciliationParent(reconciliation) {
  if (!isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(reconciliation)) {
    fail("RECONCILIATION_V1_BRAND_REQUIRED", "必须消费 privacy/formal-intake reconciliation 私有品牌。");
  }
  equal(reconciliation.ledgerId, RECONCILIATION.ledgerId, "reconciliation id");
  equal(reconciliation.ledgerDigest, RECONCILIATION.ledgerDigest, "reconciliation digest");
  parentArtifact(reconciliation, RECONCILIATION, "reconciliation artifact");
  equal(reconciliation.domainExpertsRequired, 2, "experts required");
  equal(reconciliation.reviewerSlotsOccupied, 0, "reviewer slots occupied");
  equal(reconciliation.currentFormalIntakeRecordInstances, 0, "formal intake instances");
  equal(reconciliation.sealedOriginalOpinions, 0, "sealed opinions");
  equal(reconciliation.candidateProjectedArtifactLockExactMatches, 11, "packet exact locks");
  equal(reconciliation.candidateProjectedArtifactLockDrifts, 1, "packet drift locks");
  equal(reconciliation.packetArtifactLocksCurrent, false, "packet lock currency");
  equal(reconciliation.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT", "formal first failure");
  equal(reconciliation.currentOpaqueContextInstances, 0, "opaque context instances");
  equal(reconciliation.persistedRealPersonInstancesAllowed, false, "person persistence");
  equal(reconciliation.collectionAuthorized, false, "collection authority");
  equal(reconciliation.personDataPresenceAssessed, false, "person data assessment");
  equal(reconciliation.personDerivedDigestExcluded, false, "person digest exclusion");
  equal(reconciliation.safeToPublish, false, "privacy publication safety");
  equal(reconciliation.hiddenPreloadExcluded, false, "hidden preload exclusion");
  equal(reconciliation.nodeRuntimeIdentityEstablished, false, "node runtime identity");
  equal(reconciliation.loaderIdentityEstablished, false, "loader identity");
  equal(reconciliation.runtimeLauncherIdentityEstablished, false, "launcher identity");
  equal(reconciliation.cliOutputTrustedAttestation, false, "CLI attestation");
  equal(reconciliation.visibleLoaderGuardIsSecurityBoundary, false, "visible loader guard boundary");
  equal(reconciliation.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution, true, "pre-evaluation assumption");
  equal(reconciliation.releaseReady, false, "reconciliation release ready");
}

async function loadVerifiedParents(workspaceRoot) {
  const manifest = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  const carrier = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);
  const reconciliation = await loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot);
  assertManifestParent(manifest);
  assertCarrierParent(carrier);
  assertReconciliationParent(reconciliation);
  return { manifest, carrier, reconciliation };
}

function findComponentIndex(components, componentId) {
  let match = -1;
  for (let index = 0; index < components.length; index += 1) {
    if (components[index]?.componentId === componentId) {
      if (match !== -1) fail("COMPONENT_DUPLICATE", `组件 ${componentId} 重复。`);
      match = index;
    }
  }
  if (match === -1) fail("COMPONENT_MISSING", `组件 ${componentId} 缺失。`);
  return match;
}

function componentDigest(component) {
  return sha256Text(canonicalStringify({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  }));
}

export function computeBaziDomainReleaseManifestV21Digest(manifest) {
  if (manifest === null || typeof manifest !== "object" || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [manifest])) {
    fail("MANIFEST_INVALID", "manifest 必须是 plain object。");
  }
  const unsigned = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [manifest]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [manifest]);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string") fail("MANIFEST_INVALID", "manifest 不接受 symbol key。");
    if (key === "manifestDigest") continue;
    const descriptor = descriptors[key];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "manifest digest 不接受 accessor。");
    }
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [unsigned, key, {
      value: descriptor.value, writable: true, enumerable: true, configurable: true
    }]);
  }
  return sha256Text(canonicalStringify(unsigned));
}

function buildFromVerifiedParents(parents) {
  const { manifest: parent, carrier, reconciliation } = parents;
  assertManifestParent(parent);
  assertCarrierParent(carrier);
  assertReconciliationParent(reconciliation);

  const current = canonicalValue(parent.manifest);
  const components = current.components;
  equal(components.length, 10, "predecessor component count");
  const rightsIndex = findComponentIndex(components, "rights_bundle");
  const preconditionsIndex = findComponentIndex(components, "expert_review_preconditions");
  const oldRights = components[rightsIndex];
  const oldPreconditions = components[preconditionsIndex];
  equal(oldRights.files.length, 4, "predecessor rights file count");
  equal(oldRights.files[1]?.path, "content/system-admission/bazi-source-carrier-record-readiness.v1.json", "historical carrier position");
  equal(oldPreconditions.files.length, 2, "predecessor expert precondition file count");

  const rights = {
    componentId: "rights_bundle",
    version: "hakimi.bazi.strength.source-rights-candidates/1.3.0+source-carrier-readiness.version-aware-candidate/1.1.0",
    status: "incomplete_candidate_only_zero_formal_rights_or_carrier_records",
    files: [
      canonicalValue(oldRights.files[0]),
      { path: CARRIER.path, rawBytes: CARRIER.rawBytes, sha256: CARRIER.rawSha256 },
      canonicalValue(oldRights.files[2]),
      canonicalValue(oldRights.files[3])
    ]
  };
  rights.digest = componentDigest(rights);
  const preconditions = {
    componentId: "expert_review_preconditions",
    version: "vacant-intake/1.1.0+authority-material-precheck/1.0.0+privacy-formal-intake-reconciliation/1.0.0",
    status: "incomplete_zero_real_expert_instances_privacy_and_formal_intake_reconciled_candidate_only",
    files: [
      canonicalValue(oldPreconditions.files[0]),
      canonicalValue(oldPreconditions.files[1]),
      { path: RECONCILIATION.path, rawBytes: RECONCILIATION.rawBytes, sha256: RECONCILIATION.rawSha256 }
    ]
  };
  preconditions.digest = componentDigest(preconditions);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [components, REFLECT_APPLY(NATIVE_STRING, undefined, [rightsIndex]), {
    value: rights, writable: true, enumerable: true, configurable: true
  }]);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [components, REFLECT_APPLY(NATIVE_STRING, undefined, [preconditionsIndex]), {
    value: preconditions, writable: true, enumerable: true, configurable: true
  }]);

  current.schemaVersion = "2.1.0";
  current.manifestId = MANIFEST_ID;
  current.manifestRevision = "2.1.0";
  current.lineage = {
    supersedesForCurrentMachineIdentityOnly: PARENT_MANIFEST,
    predecessorPreservedUnmodified: true,
    predecessorCurrent: false,
    predecessorComponentCount: 10,
    unchangedComponentCount: 8,
    reboundComponentIds: ["rights_bundle", "expert_review_preconditions"],
    centralSystemAdmissionRegistryIntegrated: false,
    crossSystemEngineeringReceiptRegistryIntegrated: false
  };
  current.domainIdentity.rightsBundleVersion = rights.version;
  current.domainIdentity.rightsBundleDigest = rights.digest;
  current.domainIdentity.expertReviewPreconditionBundleVersion = preconditions.version;
  current.domainIdentity.expertReviewPreconditionBundleDigest = preconditions.digest;
  current.verifiedMechanicalContexts = [
    {
      contextId: PARENT_MANIFEST.manifestId,
      contextDigest: PARENT_MANIFEST.manifestDigest,
      role: "predecessor_machine_manifest_full_loader_private_brand",
      artifact: { path: PARENT_MANIFEST.path, rawBytes: PARENT_MANIFEST.rawBytes, sha256: PARENT_MANIFEST.rawSha256 },
      privateBrandVerified: true,
      activeAdmissionEffect: "none"
    },
    {
      contextId: CARRIER.ledgerId,
      contextDigest: CARRIER.ledgerDigest,
      role: "current_source_carrier_version_aware_zero_instance_readiness",
      artifact: { path: CARRIER.path, rawBytes: CARRIER.rawBytes, sha256: CARRIER.rawSha256 },
      privateBrandVerified: true,
      activeAdmissionEffect: "none"
    },
    {
      contextId: RECONCILIATION.ledgerId,
      contextDigest: RECONCILIATION.ledgerDigest,
      role: "expert_privacy_formal_intake_zero_instance_reconciliation",
      artifact: { path: RECONCILIATION.path, rawBytes: RECONCILIATION.rawBytes, sha256: RECONCILIATION.rawSha256 },
      privateBrandVerified: true,
      activeAdmissionEffect: "none"
    }
  ];
  current.gateState = {
    ...current.gateState,
    verifiedDirectParentPrivateBrands: 3,
    sourceCarrierReadinessSuccessorCreated: true,
    privacyFormalIntakeReconciliationMechanicallyVerified: true,
    currentOpaqueContextInstances: 0,
    candidateProjectedArtifactLockExactMatches: 11,
    candidateProjectedArtifactLockDrifts: 1,
    packetArtifactLocksCurrent: false,
    firstFormalParentFailureCode: "INTAKE_GAP_BINDING_DRIFT"
  };
  current.snapshotBoundary = {
    ...current.snapshotBoundary,
    replayExcluded: false
  };
  current.evidenceLedger = {
    engineeringIdentity: "persisted_v2_1_manifest_and_three_fixed_private_brand_parent_projections_mechanically_verified",
    browserRuntimeEvidence: "not_assessed_in_domain_manifest_v2_1",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsLegalConclusion: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  };
  current.authorityBoundary = {
    ...current.authorityBoundary,
    persistedRealPersonInstancesAllowed: false,
    collectionAuthorized: false,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    safeToPublish: false
  };
  current.runtimeTrustBoundary = {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  };
  current.doesNotEstablish = [
    "domain_or_content_truth",
    "expert_identity_credentials_independence_opinion_or_truth",
    "source_freeze_or_rights_legal_conclusion",
    "browser_pwa_service_worker_or_runtime_validation",
    "cross_file_atomic_snapshot_or_schema13_mutation_epoch",
    "interval_mutation_aba_or_replay_exclusion",
    "owner_acceptance_for_release_candidate",
    "release_candidate_freeze_release_evidence_or_release_readiness",
    "public_release_deployment_or_expert_claims_authorization",
    "real_person_data_presence_or_person_derived_digest_exclusion",
    "collection_persistence_or_privacy_safe_to_publish_authority",
    "trusted_runtime_loader_launcher_cli_attestation_or_hidden_preload_exclusion",
    "cross_system_authority_inheritance"
  ];
  current.releaseStatus = "engineering_candidate";
  current.createdAt = CREATED_AT;
  current.manifestDigest = computeBaziDomainReleaseManifestV21Digest(current);
  return deepFreeze(current);
}

export async function buildCurrentBaziDomainReleaseManifestV21(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  return buildFromVerifiedParents(await loadVerifiedParents(workspaceRoot));
}

export function serializeBaziDomainReleaseManifestV21(manifest) {
  return prettyStringifyPassive(manifest);
}

function assertPersistedSemantic(persisted, expected) {
  equal(persisted.manifestId, MANIFEST_ID, "persisted manifest id");
  equal(persisted.manifestDigest, computeBaziDomainReleaseManifestV21Digest(persisted), "persisted self digest");
  if (!exactJson(persisted, expected)) {
    fail("MANIFEST_MISMATCH", "v2.1 manifest 与三父品牌、组件重绑或红门不一致。");
  }
}

function assertPersistedIdentity(snapshot, persisted) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.manifestDigest.length !== 64) {
    fail("PERSISTED_IDENTITY_UNPINNED", "v2.1 manifest 固定 raw identity 尚未写入 verifier。");
  }
  equal(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "persisted raw bytes");
  equal(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "persisted raw sha256");
  equal(persisted.manifestDigest, EXPECTED_PERSISTED.manifestDigest, "persisted manifest digest pin");
}

function summaryFrom(result) {
  const gate = result.manifest.gateState;
  const snapshot = result.manifest.snapshotBoundary;
  const authority = result.manifest.authorityBoundary;
  const runtime = result.manifest.runtimeTrustBoundary;
  return deepFreeze({
    baziV17MachineIdentityManifestV21MechanicallyVerified: true,
    manifestId: result.manifestId,
    manifestDigest: result.manifestDigest,
    artifact: canonicalValue(result.artifact),
    directParentPrivateBrandCount: gate.verifiedDirectParentPrivateBrands,
    sourceCarrierReadinessSuccessorCreated: gate.sourceCarrierReadinessSuccessorCreated,
    privacyFormalIntakeReconciliationMechanicallyVerified: gate.privacyFormalIntakeReconciliationMechanicallyVerified,
    bindingRequired: gate.bindingRequired,
    bindingFrozenVerified: gate.bindingFrozenVerified,
    formalKnowledgeDocuments: gate.formalKnowledgeDocuments,
    formalSourceRightsRecords: gate.formalSourceRightsRecords,
    formalSourceCarrierRecords: gate.formalSourceCarrierRecords,
    independentExpertsRequired: gate.independentExpertsRequired,
    reviewerSlotsOccupied: gate.reviewerSlotsOccupied,
    independentExpertReviewsVerified: gate.independentExpertReviewsVerified,
    sealedOriginalOpinions: gate.sealedOriginalOpinions,
    candidateProjectedArtifactLockExactMatches: gate.candidateProjectedArtifactLockExactMatches,
    candidateProjectedArtifactLockDrifts: gate.candidateProjectedArtifactLockDrifts,
    packetArtifactLocksCurrent: gate.packetArtifactLocksCurrent,
    firstFormalParentFailureCode: gate.firstFormalParentFailureCode,
    currentOpaqueContextInstances: gate.currentOpaqueContextInstances,
    persistedRealPersonInstancesAllowed: authority.persistedRealPersonInstancesAllowed,
    collectionAuthorized: authority.collectionAuthorized,
    personDataPresenceAssessed: authority.personDataPresenceAssessed,
    personDerivedDigestExcluded: authority.personDerivedDigestExcluded,
    safeToPublish: authority.safeToPublish,
    contentTruthEstablished: false,
    expertTruthEstablished: authority.expertTruthEstablished,
    rightsLegalConclusionEstablished: authority.rightsLegalConclusionEstablished,
    releaseReady: authority.releaseReady,
    publicDeploymentAuthorized: authority.publicDeploymentAuthorized,
    expertClaimsAuthorized: authority.expertClaimsAuthorized,
    activeAdmissionEffect: "none",
    releaseIdentity: result.manifest.releaseGovernance.releaseIdentity,
    targetSchema: result.manifest.releaseGovernance.targetSchema,
    migrationId: result.manifest.releaseGovernance.migrationId,
    crossFileAtomicSnapshot: snapshot.crossFileAtomicSnapshot,
    mutationEpochAvailableForSchema13: snapshot.mutationEpochAvailableForSchema13,
    mutationEpochReceipt: snapshot.mutationEpochReceipt,
    intervalMutationExcludedAcrossFiles: snapshot.intervalMutationExcludedAcrossFiles,
    abaExcluded: snapshot.abaExcluded,
    replayExcluded: snapshot.replayExcluded,
    hiddenPreloadExcluded: runtime.hiddenPreloadExcluded,
    nodeRuntimeIdentityEstablished: runtime.nodeRuntimeIdentityEstablished,
    loaderIdentityEstablished: runtime.loaderIdentityEstablished,
    runtimeLauncherIdentityEstablished: runtime.runtimeLauncherIdentityEstablished,
    cliOutputTrustedAttestation: runtime.cliOutputTrustedAttestation,
    visibleLoaderGuardIsSecurityBoundary: runtime.visibleLoaderGuardIsSecurityBoundary,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution:
      runtime.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution,
    centralSystemAdmissionRegistryIntegrated: result.manifest.lineage.centralSystemAdmissionRegistryIntegrated,
    crossSystemEngineeringReceiptRegistryIntegrated:
      result.manifest.lineage.crossSystemEngineeringReceiptRegistryIntegrated
  });
}

export async function loadBaziDomainReleaseManifestV21(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const parents = await loadVerifiedParents(workspaceRoot);
  const expected = buildFromVerifiedParents(parents);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, persisted);
  assertPersistedSemantic(persisted, expected);
  const result = deepFreeze({
    manifest: persisted,
    manifestId: persisted.manifestId,
    manifestDigest: persisted.manifestDigest,
    artifact: {
      path: snapshot.path,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestV21(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziDomainReleaseManifestV21Summary(value) {
  if (!isVerifiedBaziDomainReleaseManifestV21(value)) {
    fail("MANIFEST_V21_BRAND_REQUIRED", "summary 只接受本模块 full-loader 私有品牌。");
  }
  return summaryFrom(value);
}

export const baziDomainReleaseManifestV21TestOnly = OBJECT_FREEZE({
  PARENT_MANIFEST,
  CARRIER,
  RECONCILIATION,
  EXPECTED_PERSISTED,
  canonicalStringify,
  canonicalValue,
  componentDigest,
  buildFromVerifiedParents,
  assertPersistedSemantic
});
