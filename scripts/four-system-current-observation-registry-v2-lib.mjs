import { createHash, Hash } from "node:crypto";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  loadBaziDomainReleaseManifestV2,
  isVerifiedBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";
import {
  verifyAllIndependentDomainManifests,
  isVerifiedIndependentDomainManifestFullLoad
} from "./independent-domain-release-manifest-lib.mjs";
import {
  loadWesternProductizationVersionAwareObservationCandidate,
  isVerifiedWesternProductizationVersionAwareObservationResult
} from "./western-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  readCurrentVedicProductizationVersionAwareObservationChildV12,
  isVerifiedVedicProductizationVersionAwareObservationChildV12
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";

const NODE_UTIL_TYPES = process.getBuiltinModule("node:util")?.types;
const UTIL_IS_PROXY = NODE_UTIL_TYPES?.isProxy;
const NATIVE_ARRAY = Array;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_KEYS = Object.keys;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const JSON_STRINGIFY = JSON.stringify;
const HASH_UPDATE = Hash.prototype.update;
const HASH_DIGEST = Hash.prototype.digest;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const NATIVE_WEAK_SET = WeakSet;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-observation-registry.v2";
const CREATED_AT = "2026-08-31T08:00:00.000Z";

export const FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH =
  "content/system-admission/four-system-current-observation-registry.v2.json";

const LEGACY_REGISTRY = OBJECT_FREEZE({
  path: "content/system-admission/four-system-admission.v1.json",
  rawBytes: 19093,
  rawSha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959",
  registryDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a"
});

const WESTERN_OBSERVATION = OBJECT_FREEZE({
  path: "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
  rawBytes: 18879,
  rawSha256: "956fa352a87253abc893056e443bd45e3fa731531b839144e3121c43639f19df",
  candidateDigest: "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb"
});

const VEDIC_OBSERVATION = OBJECT_FREEZE({
  path: "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json",
  rawBytes: 16272,
  rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845",
  candidateDigest: "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171"
});

const COMPARISON_CONTRACT_PATH =
  "packages/cross-system-comparison-draft/src/index.ts";
const LEGACY_RECEIPT_REGISTRY_PATH =
  "packages/cross-system-comparison-draft/src/generated-engineering-fact-receipts.v1.json";

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 22261,
  rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
  registryDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
});

export class FourSystemCurrentObservationRegistryV2Error extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "FourSystemCurrentObservationRegistryV2Error";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new FourSystemCurrentObservationRegistryV2Error(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function captureCanonical(value, state = {
  active: new NATIVE_WEAK_SET(),
  seen: new NATIVE_WEAK_SET(),
  nodes: 0,
  textCodeUnits: 0
}, depth = 0) {
  if (depth > 64) fail("NON_CANONICAL_JSON", "registry 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200000) fail("NON_CANONICAL_JSON", "registry 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", "registry 数值必须有限且不能为负零。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > 2000000) {
      fail("NON_CANONICAL_JSON", "registry 文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object" || UTIL_IS_PROXY?.(value)) {
    fail("NON_CANONICAL_JSON", "registry 只接受非 Proxy JSON 数据值。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("NON_CANONICAL_JSON", "registry 不接受 cycle。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("NON_CANONICAL_JSON", "registry 不接受 alias。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  try {
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] === "symbol") {
        fail("NON_CANONICAL_JSON", "registry 不接受 Symbol 属性。");
      }
    }
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE) {
        fail("NON_CANONICAL_JSON", "registry 数组原型无效。");
      }
      const length = descriptors.length?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length]) || length < 0) {
        fail("NON_CANONICAL_JSON", "registry 数组长度无效。");
      }
      if (keys.length !== length + 1) {
        fail("NON_CANONICAL_JSON", "registry 数组不得稀疏或含额外属性。");
      }
      const output = new NATIVE_ARRAY(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_CANONICAL_JSON", "registry 数组元素必须是自有 data descriptor。");
        }
        output[index] = captureCanonical(descriptor.value, state, depth + 1);
      }
      return output;
    }
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "registry 对象原型无效。");
    }
    const stringKeys = [];
    for (let index = 0; index < keys.length; index += 1) {
      REFLECT_APPLY(ARRAY_PUSH, stringKeys, [keys[index]]);
    }
    REFLECT_APPLY(ARRAY_SORT, stringKeys, [compareCodeUnits]);
    const output = {};
    for (let index = 0; index < stringKeys.length; index += 1) {
      const key = stringKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_CANONICAL_JSON", "registry 字段必须是自有可枚举 data descriptor。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
    return output;
  } catch (cause) {
    if (cause instanceof FourSystemCurrentObservationRegistryV2Error) throw cause;
    fail("NON_CANONICAL_JSON", "registry 数据图不可安全捕获。", cause);
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_CANONICAL_JSON", "registry 结果不得含 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

export function canonicalStringifyFourSystemCurrentObservationRegistryV2(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureCanonical(value)]);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Unsigned(value, digestField, domain = null) {
  const snapshot = captureCanonical(value);
  const unsigned = {};
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [snapshot]);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key !== digestField) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [unsigned, key, {
        configurable: true,
        enumerable: true,
        value: snapshot[key],
        writable: true
      }]);
    }
  }
  const canonical = canonicalStringifyFourSystemCurrentObservationRegistryV2(unsigned);
  return sha256Text(domain === null ? canonical : `${domain}\0${canonical}`);
}

export function computeFourSystemCurrentObservationRegistryV2Digest(value) {
  return sha256Unsigned(value, "registryDigest", DIGEST_DOMAIN);
}

export function serializeFourSystemCurrentObservationRegistryV2(value) {
  const snapshot = captureCanonical(value);
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [snapshot, null, 2])}\n`;
}

function requireExact(value, expected, code, label) {
  if (value !== expected) fail(code, `${label} 不等于固定失败关闭值。`);
}

function assertAllFalseAuthority(authority, label) {
  const expectedKeys = [
    "contentTruthEstablished",
    "domainAuthorityAuthorized",
    "expertClaimsAuthorized",
    "expertTruthEstablished",
    "formalAdmissionAuthorized",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "releaseReady",
    "rightsLegalConclusionEstablished"
  ];
  for (let index = 0; index < expectedKeys.length; index += 1) {
    requireExact(authority?.[expectedKeys[index]], false, "UPSTREAM_AUTHORITY_PROMOTION", `${label}.${expectedKeys[index]}`);
  }
}

function gate(engineeringState, closureState) {
  return {
    engineeringState,
    closureState,
    formalGateSatisfied: false
  };
}

function authorityBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false
  };
}

function evidenceAccounts(engineeringIdentity) {
  return {
    engineeringIdentity,
    browserRuntimeEvidence: "not_assessed_by_this_registry",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsLegalConclusion: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  };
}

function artifact(snapshot, semanticField, semanticDigest, role) {
  return {
    role,
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    semanticDigestField: semanticField,
    semanticDigest
  };
}

async function verifyLegacyRegistry(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, LEGACY_REGISTRY.path);
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  requireExact(snapshot.rawBytes, LEGACY_REGISTRY.rawBytes, "LEGACY_REGISTRY_DRIFT", "legacy registry raw bytes");
  requireExact(snapshot.rawSha256, LEGACY_REGISTRY.rawSha256, "LEGACY_REGISTRY_DRIFT", "legacy registry raw SHA-256");
  requireExact(parsed.registryDigest, LEGACY_REGISTRY.registryDigest, "LEGACY_REGISTRY_DRIFT", "legacy registry digest");
  requireExact(
    sha256Unsigned(parsed, "registryDigest"),
    LEGACY_REGISTRY.registryDigest,
    "LEGACY_REGISTRY_DRIFT",
    "legacy registry recomputed digest"
  );
  return { snapshot, parsed };
}

function assertBazi(result) {
  if (!isVerifiedBaziDomainReleaseManifestV2(result)) {
    fail("UPSTREAM_BRAND_MISSING", "八字 v2 manifest 缺少私有验证品牌。");
  }
  requireExact(result.bindingRequired, 12, "UPSTREAM_GATE_DRIFT", "Bazi bindingRequired");
  requireExact(result.bindingFrozenVerified, 0, "UPSTREAM_GATE_DRIFT", "Bazi bindingFrozenVerified");
  requireExact(result.independentExpertReviewsVerified, 0, "UPSTREAM_GATE_DRIFT", "Bazi expert reviews");
  requireExact(result.releaseReady, false, "UPSTREAM_AUTHORITY_PROMOTION", "Bazi releaseReady");
  requireExact(result.publicDeploymentAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", "Bazi public deployment");
  requireExact(result.expertClaimsAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", "Bazi expert claims");
}

function assertIndependent(result, expectedSystem, expectedBindings) {
  if (!isVerifiedIndependentDomainManifestFullLoad(result)
    || result.productSystemId !== expectedSystem) {
    fail("UPSTREAM_BRAND_MISSING", `${expectedSystem} manifest 缺少私有验证品牌。`);
  }
  const manifest = result.manifest;
  requireExact(manifest.gateState.bindingRequired, expectedBindings, "UPSTREAM_GATE_DRIFT", `${expectedSystem} bindingRequired`);
  requireExact(manifest.gateState.bindingFrozenVerified, 0, "UPSTREAM_GATE_DRIFT", `${expectedSystem} bindingFrozenVerified`);
  requireExact(manifest.gateState.independentExpertReviewsVerified, 0, "UPSTREAM_GATE_DRIFT", `${expectedSystem} expert reviews`);
  requireExact(manifest.releaseGovernance.targetSchema, null, "UPSTREAM_SCHEMA_DRIFT", `${expectedSystem} targetSchema`);
  requireExact(manifest.releaseGovernance.migrationId, null, "UPSTREAM_SCHEMA_DRIFT", `${expectedSystem} migrationId`);
  requireExact(manifest.releaseGovernance.publicDeploymentAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", `${expectedSystem} public deployment`);
  requireExact(manifest.releaseGovernance.expertClaimsAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", `${expectedSystem} expert claims`);
  for (const field of [
    "domainAuthorityAuthorized",
    "expertClaimsAuthorized",
    "formalAdmissionAuthorized",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "releaseReady"
  ]) {
    requireExact(
      result.authorityBoundary?.[field],
      false,
      "UPSTREAM_AUTHORITY_PROMOTION",
      `${expectedSystem}.${field}`
    );
  }
}

function assertWesternObservation(result) {
  if (!isVerifiedWesternProductizationVersionAwareObservationResult(result)) {
    fail("UPSTREAM_BRAND_MISSING", "Western observation 缺少私有验证品牌。");
  }
  requireExact(result.centralRegistryStaleForWestern, true, "UPSTREAM_GATE_DRIFT", "Western legacy registry staleness");
  requireExact(result.bindingRequired, 28, "UPSTREAM_GATE_DRIFT", "Western bindingRequired");
  requireExact(result.bindingFrozenVerified, 0, "UPSTREAM_GATE_DRIFT", "Western bindingFrozenVerified");
  requireExact(result.formalAdmissionAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", "Western formal admission");
  requireExact(result.releaseReady, false, "UPSTREAM_AUTHORITY_PROMOTION", "Western releaseReady");
  requireExact(result.publicReleaseAuthorized, false, "UPSTREAM_AUTHORITY_PROMOTION", "Western public release");
}

function assertVedicObservation(result) {
  if (!isVerifiedVedicProductizationVersionAwareObservationChildV12(result)) {
    fail("UPSTREAM_BRAND_MISSING", "Vedic v1.2 observation 缺少私有验证品牌。");
  }
  requireExact(result.activeAdmissionEffect, "none", "UPSTREAM_GATE_DRIFT", "Vedic active admission effect");
  requireExact(result.gateSummary.admissionGatesRequired, 8, "UPSTREAM_GATE_DRIFT", "Vedic gates required");
  requireExact(result.gateSummary.admissionGatesSatisfied, 0, "UPSTREAM_GATE_DRIFT", "Vedic gates satisfied");
  requireExact(result.gateSummary.bindingRequired, 38, "UPSTREAM_GATE_DRIFT", "Vedic bindingRequired");
  requireExact(result.gateSummary.bindingFrozenVerified, 0, "UPSTREAM_GATE_DRIFT", "Vedic bindingFrozenVerified");
  assertAllFalseAuthority(result.authorityBoundary, "Vedic");
}

function systemEntry({
  productSystemId,
  contractSystemId,
  productState,
  surface,
  releaseIdentity,
  targetSchema,
  migrationId,
  bindingRequired,
  machineIdentity,
  secondaryObservation,
  inputEngineeringState,
  factEngineeringState,
  ruleEngineeringState
}) {
  return {
    productSystemId,
    contractSystemId,
    productState,
    integrationBoundary: {
      surface,
      releaseIdentity,
      targetSchema,
      migrationId,
      mainApplicationIntegrated: false,
      baziAuthorityInherited: false,
      isolatedFromOtherSystems: true
    },
    currentMachineIdentity: {
      primary: machineIdentity,
      secondaryObservation,
      observationClass: "authority_free_current_endpoint_identity",
      formalAdmissionEffect: "none"
    },
    admissionGates: {
      inputContract: gate(inputEngineeringState, "formal_input_contract_not_admitted"),
      deterministicFacts: gate(factEngineeringState, "formal_fact_bundle_not_admitted"),
      ruleset: gate(ruleEngineeringState, "versioned_ruleset_not_expert_admitted"),
      sourceBundle: gate("requirements_or_candidates_observed", `binding_frozen_0_of_${bindingRequired}`),
      rightsBundle: gate("candidate_or_requirement_mechanics_observed", "three_layer_rights_and_legal_closure_not_established"),
      expertReviewBundle: gate("no_verified_review_bundle", "verified_independent_experts_0_of_2"),
      highRiskPolicy: gate("candidate_or_boundary_observed", "system_specific_policy_not_formally_admitted"),
      releaseEvidence: gate("engineering_observation_only", "formal_release_evidence_absent")
    },
    gateSummary: {
      bindingRequired,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0
    },
    authorityBoundary: authorityBoundary(),
    evidenceAccounts: evidenceAccounts("current_machine_identity_mechanically_observed")
  };
}

async function buildExpected(workspaceRoot) {
  const [bazi, independent, westernObservation, vedicObservation, legacy, comparison, legacyReceipts] =
    await Promise.all([
      loadBaziDomainReleaseManifestV2(workspaceRoot),
      verifyAllIndependentDomainManifests(workspaceRoot),
      loadWesternProductizationVersionAwareObservationCandidate(workspaceRoot),
      readCurrentVedicProductizationVersionAwareObservationChildV12(workspaceRoot),
      verifyLegacyRegistry(workspaceRoot),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, COMPARISON_CONTRACT_PATH),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, LEGACY_RECEIPT_REGISTRY_PATH)
    ]);
  assertBazi(bazi);
  if (independent.length !== 2) fail("UPSTREAM_COUNT_DRIFT", "独立 Manifest 必须精确为紫微与西洋两项。");
  const ziwei = independent.find((entry) => entry.productSystemId === "ziwei-doushu");
  const western = independent.find((entry) => entry.productSystemId === "western-astrology");
  assertIndependent(ziwei, "ziwei-doushu", 27);
  assertIndependent(western, "western-astrology", 28);
  assertWesternObservation(westernObservation);
  assertVedicObservation(vedicObservation);

  const [westernManifestSnapshot, westernObservationSnapshot, vedicObservationSnapshot] =
    await Promise.all([
      readBaziDttStableWorkspaceArtifact(workspaceRoot, western.artifact.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, WESTERN_OBSERVATION.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, VEDIC_OBSERVATION.path)
    ]);
  requireExact(westernObservationSnapshot.rawBytes, WESTERN_OBSERVATION.rawBytes, "WESTERN_OBSERVATION_DRIFT", "Western observation raw bytes");
  requireExact(westernObservationSnapshot.rawSha256, WESTERN_OBSERVATION.rawSha256, "WESTERN_OBSERVATION_DRIFT", "Western observation raw SHA-256");
  requireExact(westernObservation.candidateDigest, WESTERN_OBSERVATION.candidateDigest, "WESTERN_OBSERVATION_DRIFT", "Western observation digest");
  requireExact(vedicObservationSnapshot.rawBytes, VEDIC_OBSERVATION.rawBytes, "VEDIC_OBSERVATION_DRIFT", "Vedic observation raw bytes");
  requireExact(vedicObservationSnapshot.rawSha256, VEDIC_OBSERVATION.rawSha256, "VEDIC_OBSERVATION_DRIFT", "Vedic observation raw SHA-256");
  requireExact(vedicObservation.candidateDigest, VEDIC_OBSERVATION.candidateDigest, "VEDIC_OBSERVATION_DRIFT", "Vedic observation digest");

  const legacyReceipt = parseBaziDttStrictJsonArtifact(legacyReceipts);
  const unsigned = {
    schemaVersion: "2.0.0",
    recordType: "four_system_current_machine_identity_observation_registry_v2",
    registryId: "hakimi.system-admission/four-system-current-observation/2.0.0",
    registryStatus: "authority_free_current_observation_candidate_not_formal_central_registry",
    createdAt: CREATED_AT,
    projectReleaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    lineage: {
      predecessor: {
        path: LEGACY_REGISTRY.path,
        rawBytes: LEGACY_REGISTRY.rawBytes,
        rawSha256: LEGACY_REGISTRY.rawSha256,
        registryDigest: LEGACY_REGISTRY.registryDigest
      },
      predecessorPreservedUnmodified: true,
      predecessorCurrent: false,
      predecessorFormalVerifierExpectedToFailClosed: true,
      predecessorFailureClass: "current_bazi_manifest_mismatch",
      replacesOrMutatesPredecessor: false,
      formalCentralRegistry: false,
      ownerFormalAdmissionAcceptanceEstablished: false
    },
    systems: [
      systemEntry({
        productSystemId: "bazi",
        contractSystemId: "bazi",
        productState: "existing_research_surface_current_machine_identity_not_formally_admitted",
        surface: "single-chart-report@1.7.0-on-legacy-v13",
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        bindingRequired: 12,
        machineIdentity: {
          role: "current_domain_release_machine_identity_manifest",
          path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json",
          rawBytes: bazi.rawBytes,
          rawSha256: bazi.rawSha256,
          semanticDigestField: "manifestDigest",
          semanticDigest: bazi.manifestDigest,
          upstreamDeclaresFormalCentralIntegration: false
        },
        secondaryObservation: null,
        inputEngineeringState: "bound_current_surface_engineering_identity",
        factEngineeringState: "bound_current_surface_engineering_identity",
        ruleEngineeringState: "versioned_engineering_candidate"
      }),
      systemEntry({
        productSystemId: "ziwei-doushu",
        contractSystemId: "ziwei",
        productState: "isolated_engineering_draft_current_machine_identity_not_formally_admitted",
        surface: "ziwei-isolated-workspace-draft@0.1.0",
        releaseIdentity: null,
        targetSchema: null,
        migrationId: null,
        bindingRequired: 27,
        machineIdentity: {
          role: "current_independent_domain_manifest_v2",
          path: ziwei.artifact.path,
          rawBytes: ziwei.artifact.rawBytes,
          rawSha256: ziwei.artifact.rawSha256,
          semanticDigestField: "manifestDigest",
          semanticDigest: ziwei.manifestDigest,
          upstreamDeclaresFormalCentralIntegration: false
        },
        secondaryObservation: null,
        inputEngineeringState: "isolated_contract_draft",
        factEngineeringState: "isolated_adapter_and_workspace_draft",
        ruleEngineeringState: "isolated_rule_and_high_risk_candidate"
      }),
      systemEntry({
        productSystemId: "western-astrology",
        contractSystemId: "western",
        productState: "isolated_engineering_draft_current_observation_not_formally_admitted",
        surface: "western-isolated-rules-preview-draft@0.1.0",
        releaseIdentity: null,
        targetSchema: null,
        migrationId: null,
        bindingRequired: 28,
        machineIdentity: artifact(
          westernManifestSnapshot,
          "manifestDigest",
          western.manifestDigest,
          "current_independent_domain_manifest"
        ),
        secondaryObservation: artifact(
          westernObservationSnapshot,
          "candidateDigest",
          westernObservation.candidateDigest,
          "current_version_aware_productization_observation"
        ),
        inputEngineeringState: "isolated_contract_and_civil_time_adapter_draft",
        factEngineeringState: "isolated_astronomy_adapter_draft",
        ruleEngineeringState: "isolated_geometry_and_content_preview_draft"
      }),
      systemEntry({
        productSystemId: "vedic-astrology",
        contractSystemId: "vedic",
        productState: "research_boundary_current_observation_no_domain_manifest_no_product_identity",
        surface: "no_admitted_product_surface",
        releaseIdentity: null,
        targetSchema: null,
        migrationId: null,
        bindingRequired: 38,
        machineIdentity: artifact(
          vedicObservationSnapshot,
          "candidateDigest",
          vedicObservation.candidateDigest,
          "current_version_aware_research_boundary_observation"
        ),
        secondaryObservation: {
          domainReleaseManifestPresent: false,
          productIdentityEstablished: false,
          inputKernelFormalParentIntegrated: false,
          mutationExperimentProductGateSatisfied: false
        },
        inputEngineeringState: "input_kernel_and_transition_candidates_observed",
        factEngineeringState: "formal_fact_bundle_absent",
        ruleEngineeringState: "versioned_ruleset_authority_absent"
      })
    ],
    crossSystemPolicy: {
      mode: "authority_free_current_identity_observation_only",
      comparisonContract: {
        path: comparison.path,
        rawBytes: comparison.rawBytes,
        rawSha256: comparison.rawSha256,
        currentDraftSystemIds: ["bazi", "ziwei-doushu", "western-astrology"],
        vedicSupportedByCurrentComparisonContract: false
      },
      legacyEngineeringReceiptRegistry: {
        path: legacyReceipts.path,
        rawBytes: legacyReceipts.rawBytes,
        rawSha256: legacyReceipts.rawSha256,
        registryId: legacyReceipt.registryId,
        registryDigest: legacyReceipt.registryDigest,
        consumesThisRegistryV2: false,
        currentForFormalComparison: false
      },
      systemsWithCurrentMachineIdentityOrObservation: 4,
      systemsWithDomainReleaseManifest: 3,
      systemsFormallyAdmitted: 0,
      factsFrozenForFormalComparison: false,
      scoringAllowed: false,
      weightingAllowed: false,
      majorityVoteAllowed: false,
      opinionAveragingAllowed: false,
      generatedModelWinnerSelectionAllowed: false,
      autoPersonMergeAllowed: false,
      authorityInheritanceAllowed: false,
      conceptEquivalenceInferenceAllowed: false,
      formalComparisonAuthorized: false,
      nonEquivalentConceptExamples: [
        { productSystemId: "bazi", conceptId: "bazi.wealth_star", label: "财星" },
        { productSystemId: "ziwei-doushu", conceptId: "ziwei.wealth_palace", label: "财帛宫" },
        { productSystemId: "western-astrology", conceptId: "western.house_2", label: "第二宫" },
        { productSystemId: "vedic-astrology", conceptId: "vedic.d2_hora", label: "D2/Hora" }
      ]
    },
    gateSummary: {
      systemsRequired: 4,
      systemsObservedWithCurrentMachineIdentityOrObservation: 4,
      systemsWithDomainReleaseManifest: 3,
      systemsFormallyAdmitted: 0,
      systemsDomainAuthorityAuthorized: 0,
      systemsReleaseReady: 0,
      systemsPublicReleaseAuthorized: 0,
      admissionGatesRequiredPerSystem: 8,
      totalAdmissionGatesRequired: 32,
      totalAdmissionGatesSatisfied: 0,
      formalCrossSystemComparisonAuthorized: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    snapshotBoundary: {
      upstreamPrivateBrandsVerified: 5,
      heldHandleEndpointSnapshots: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      registryDigestIsDigitalSignature: false
    },
    authorityBoundary: authorityBoundary(),
    doesNotEstablish: [
      "formal_central_registry_supersession_or_owner_acceptance",
      "browser_runtime_pwa_service_worker_or_public_host_evidence",
      "content_truth_or_domain_authority_for_any_system",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "rights_or_legal_conclusion_or_redistribution_authorization",
      "cross_system_input_or_concept_equivalence",
      "vedic_product_identity_domain_manifest_or_comparison_support",
      "facts_frozen_for_formal_cross_system_comparison",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_readiness_deployment_rollback_or_public_release_authorization"
    ]
  };
  return deepFreeze({
    ...unsigned,
    registryDigest: computeFourSystemCurrentObservationRegistryV2Digest(unsigned)
  });
}

export async function buildCurrentFourSystemObservationRegistryV2(workspaceRoot) {
  return buildExpected(workspaceRoot);
}

function verifyPersistedAgainstExpected(snapshot, persisted, expected) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !LOWERCASE_SHA256.test(EXPECTED_PERSISTED.registryDigest)) {
    fail("PERSISTED_IDENTITY_NOT_FROZEN", "registry v2 原始身份尚未冻结。");
  }
  requireExact(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "REGISTRY_RAW_DRIFT", "registry v2 raw bytes");
  requireExact(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "REGISTRY_RAW_DRIFT", "registry v2 raw SHA-256");
  requireExact(persisted.registryDigest, EXPECTED_PERSISTED.registryDigest, "REGISTRY_DIGEST_DRIFT", "registry v2 digest pin");
  requireExact(
    computeFourSystemCurrentObservationRegistryV2Digest(persisted),
    persisted.registryDigest,
    "REGISTRY_DIGEST_DRIFT",
    "registry v2 recomputed digest"
  );
  requireExact(
    canonicalStringifyFourSystemCurrentObservationRegistryV2(persisted),
    canonicalStringifyFourSystemCurrentObservationRegistryV2(expected),
    "REGISTRY_MISMATCH",
    "registry v2 current projection"
  );
}

export async function loadFourSystemCurrentObservationRegistryV2(workspaceRoot) {
  const expected = await buildExpected(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  verifyPersistedAgainstExpected(snapshot, persisted, expected);
  const result = deepFreeze({
    registry: persisted,
    registryId: persisted.registryId,
    registryDigest: persisted.registryDigest,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    systemsObserved: 4,
    systemsFormallyAdmitted: 0,
    totalAdmissionGatesSatisfied: 0,
    formalCentralRegistry: false,
    formalCrossSystemComparisonAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedFourSystemCurrentObservationRegistryV2(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const fourSystemCurrentObservationRegistryV2TestOnly = OBJECT_FREEZE({
  CREATED_AT,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED,
  LEGACY_REGISTRY,
  VEDIC_OBSERVATION,
  WESTERN_OBSERVATION,
  captureCanonical,
  deepFreeze,
  sha256Unsigned,
  verifyPersistedAgainstExpected
});
