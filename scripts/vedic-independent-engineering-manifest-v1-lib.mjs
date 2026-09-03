import { createHash } from "node:crypto";

import {
  isVerifiedVedicProductizationVersionAwareObservationChildV12,
  readCurrentVedicProductizationVersionAwareObservationChildV12,
  vedicProductizationVersionAwareObservationChildV12TestOnly as parentTestOnly
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";
import {
  parseVedicProductizationRequirementsJsonBytes
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  isVerifiedVedicSourceBindingRequirementsSuccessor,
  loadVedicSourceBindingRequirementsSuccessor
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_BUFFER = Buffer;
const NATIVE_SET = Set;
const NATIVE_WEAK_SET = WeakSet;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

const HASH_PRIMORDIAL_INSTANCE = createHash("sha256");
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(HASH_PRIMORDIAL_INSTANCE);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
REFLECT_APPLY(HASH_DIGEST, HASH_PRIMORDIAL_INSTANCE, ["hex"]);

const canonicalStringify = parentTestOnly.canonicalStringify;
const readStableWorkspaceFile = parentTestOnly.readStableWorkspaceFile;

export const VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V1_RELATIVE_PATH =
  "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json";

const MANIFEST_ID =
  "hakimi.vedic-astrology.isolated-engineering-current-machine-identity-manifest/1.0.0";
const RECORD_TYPE =
  "vedic_isolated_engineering_current_machine_identity_manifest_v1";
const STATUS =
  "draft_current_machine_identity_research_boundary_no_product_identity_no_admission_effect";
const CREATED_AT = "2026-08-31T00:00:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.vedic-astrology.isolated-engineering-current-machine-identity-manifest.v1";
const CLOSURE_DIGEST_DOMAIN =
  "hakimi.vedic-astrology.isolated-engineering-component-closure.v1";
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_COMPONENT_BYTES = 2 * 1024 * 1024;

const EXPECTED_PARENT = OBJECT_FREEZE({
  path: "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json",
  rawBytes: 16_272,
  rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845",
  candidateId:
    "hakimi.vedic.independent-productization.version-aware-observation-child/1.2.0",
  candidateDigest:
    "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171"
});

const EXPECTED_SOURCE_SUCCESSOR = OBJECT_FREEZE({
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json",
  rawBytes: 94_582,
  rawSha256: "9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd",
  ledgerId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.1.0",
  ledgerDigest: "afd65de96a850c1632e8c00b03b6be2ff05a2f8b1dd0a19fbe27d4376ac2bb6b",
  status:
    "requirements_plus_two_partial_candidates_36_canonical_exact_no_bindings_frozen_nonformal_zero_active_effect"
});

const CIVIL_TIME_FILES = OBJECT_FREEZE([
  "isolated-drafts/vedic-civil-time-input-resolution-draft/README.md",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/package.json",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.test.ts",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.ts",
  "isolated-drafts/vedic-civil-time-input-resolution-draft/tsconfig.json"
]);

const KERNEL_FILES = OBJECT_FREEZE([
  "packages/vedic-input-admission-kernel-draft/README.md",
  "packages/vedic-input-admission-kernel-draft/package.json",
  "packages/vedic-input-admission-kernel-draft/src/evaluator.test.ts",
  "packages/vedic-input-admission-kernel-draft/src/evaluator.ts",
  "packages/vedic-input-admission-kernel-draft/src/frozen-packet-schema.ts",
  "packages/vedic-input-admission-kernel-draft/src/protocol.ts",
  "packages/vedic-input-admission-kernel-draft/tsconfig.json",
  "packages/vedic-input-admission-kernel-draft/vitest.config.ts"
]);

const EPOCH_EXPERIMENT_FILES = OBJECT_FREEZE([
  "packages/vedic-mutation-epoch-runtime-experiment-draft/README.md",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/browser-app/index.html",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/package.json",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/browser-app/main.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/browser-app/styles.css",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/runtime.test.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/src/runtime.ts",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/tsconfig.json",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/vite.browser-experiment.config.mjs",
  "packages/vedic-mutation-epoch-runtime-experiment-draft/vitest.config.ts"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 19_557,
  rawSha256: "a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5",
  manifestDigest: "96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class VedicIndependentEngineeringManifestV1Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicIndependentEngineeringManifestV1Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new VedicIndependentEngineeringManifestV1Error(code, message, options);
}

function canonicalValue(value) {
  try {
    const compact = canonicalStringify(value);
    return REFLECT_APPLY(JSON_PARSE, JSON, [compact]);
  } catch (cause) {
    if (cause instanceof VedicIndependentEngineeringManifestV1Error) throw cause;
    fail("NON_CANONICAL_JSON_VALUE", "manifest 只接受被动、无别名的 JSON 值。", { cause });
  }
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  for (const key of OBJECT_KEYS(descriptors)) {
    const descriptor = descriptors[key];
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "manifest 结果不得包含 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainDigest(domain, value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function componentClosureDigest(componentId, files) {
  return domainDigest(CLOSURE_DIGEST_DOMAIN, { componentId, files });
}

function requireVerifiedParent(parent) {
  if (!isVerifiedVedicProductizationVersionAwareObservationChildV12(parent)) {
    fail("PARENT_BRAND_REQUIRED", "manifest 只接受 Vedic v1.2 loader 的私有品牌结果。");
  }
  if (parent.candidateId !== EXPECTED_PARENT.candidateId
    || parent.candidateDigest !== EXPECTED_PARENT.candidateDigest
    || parent.activeAdmissionEffect !== "none") {
    fail("PARENT_IDENTITY_MISMATCH", "Vedic v1.2 parent 身份或权威边界漂移。");
  }
  return parent;
}

function requireVerifiedSourceSuccessor(successor) {
  if (!isVerifiedVedicSourceBindingRequirementsSuccessor(successor)) {
    fail(
      "SOURCE_SUCCESSOR_BRAND_REQUIRED",
      "manifest 只接受固定路径完整 loader 签发的 Vedic source-rights successor 私有品牌结果。"
    );
  }
  if (successor.ledgerArtifact?.path !== EXPECTED_SOURCE_SUCCESSOR.path
    || successor.ledgerArtifact?.rawBytes !== EXPECTED_SOURCE_SUCCESSOR.rawBytes
    || successor.ledgerArtifact?.rawSha256 !== EXPECTED_SOURCE_SUCCESSOR.rawSha256
    || successor.ledgerId !== EXPECTED_SOURCE_SUCCESSOR.ledgerId
    || successor.ledgerDigest !== EXPECTED_SOURCE_SUCCESSOR.ledgerDigest
    || successor.status !== EXPECTED_SOURCE_SUCCESSOR.status
    || successor.predecessorRemainsFormalCurrent !== true
    || successor.successorIsFormalCurrent !== false
    || successor.successorActiveEffect !== "none"
    || successor.bindingRequired !== 38
    || successor.bindingFrozenVerified !== 0
    || successor.partialCandidatesAttached !== 2
    || successor.subjectFullySatisfied !== 0
    || successor.candidateExactQuoteObservationsStored !== 3
    || successor.exactQuotesBound !== 0
    || successor.formalParentIntegrated !== false
    || successor.formalRegistryIntegrated !== false
    || successor.releaseReady !== false
    || successor.publicReleaseAuthorized !== false) {
    fail(
      "SOURCE_SUCCESSOR_IDENTITY_MISMATCH",
      "Vedic source-rights successor 身份或非正式零准入边界漂移。"
    );
  }
  return successor;
}

async function snapshotOne(workspaceRoot, relativePath, label) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    relativePath,
    MAX_COMPONENT_BYTES,
    {
      invalidCode: "COMPONENT_ENDPOINT_INVALID",
      missingCode: "COMPONENT_MISSING",
      label
    }
  );
  return {
    path: relativePath,
    bytes: snapshot.rawBytes,
    sha256: snapshot.rawSha256
  };
}

async function snapshotMany(workspaceRoot, paths, label) {
  const files = [];
  for (let index = 0; index < paths.length; index += 1) {
    appendSnapshot(files, await snapshotOne(
      workspaceRoot,
      paths[index],
      `${label} ${index + 1}`
    ));
  }
  return files;
}

function appendSnapshot(files, snapshot) {
  REFLECT_APPLY(ARRAY_PUSH, files, [snapshot]);
  return files;
}

function mapRequirementBindings(artifactBindings) {
  return {
    paths: REFLECT_APPLY(
      ARRAY_MAP,
      artifactBindings,
      [(entry) => entry.path]
    ),
    files: REFLECT_APPLY(
      ARRAY_MAP,
      artifactBindings,
      [(entry) => ({
        path: entry.path,
        bytes: entry.bytes,
        sha256: entry.sha256
      })]
    )
  };
}

function requireExactFileClosure(actual, expected, label) {
  if (!ARRAY_IS_ARRAY(expected) || actual.length !== expected.length) {
    fail("UPSTREAM_CLOSURE_MISMATCH", `${label} 文件数漂移。`);
  }
  for (let index = 0; index < actual.length; index += 1) {
    const current = actual[index];
    const frozen = expected[index];
    if (current.path !== frozen.path
      || current.bytes !== frozen.bytes
      || current.sha256 !== frozen.sha256) {
      fail("UPSTREAM_CLOSURE_MISMATCH", `${label} 当前字节与 v1.2 parent 不一致。`);
    }
  }
}

async function collectCurrentInputs(workspaceRoot) {
  const parent = requireVerifiedParent(
    await readCurrentVedicProductizationVersionAwareObservationChildV12(workspaceRoot)
  );
  const sourceSuccessor = requireVerifiedSourceSuccessor(
    await loadVedicSourceBindingRequirementsSuccessor(workspaceRoot)
  );
  const sourceSuccessorFile = {
    path: sourceSuccessor.ledgerArtifact.path,
    bytes: sourceSuccessor.ledgerArtifact.rawBytes,
    sha256: sourceSuccessor.ledgerArtifact.rawSha256
  };
  const parentArtifact = await snapshotOne(
    workspaceRoot,
    EXPECTED_PARENT.path,
    "Vedic v1.2 observation artifact"
  );
  if (parentArtifact.bytes !== EXPECTED_PARENT.rawBytes
    || parentArtifact.sha256 !== EXPECTED_PARENT.rawSha256) {
    fail("PARENT_RAW_IDENTITY_MISMATCH", "Vedic v1.2 parent raw identity 漂移。");
  }

  const requirementBindings = mapRequirementBindings(parent.artifactBindings);
  const requirementPaths = requirementBindings.paths;
  const requirementFiles = await snapshotMany(
    workspaceRoot,
    requirementPaths,
    "Vedic requirements child"
  );
  const expectedRequirementFiles = requirementBindings.files;
  requireExactFileClosure(
    requirementFiles,
    expectedRequirementFiles,
    "requirements children"
  );

  const kernelFiles = await snapshotMany(workspaceRoot, KERNEL_FILES, "Vedic input kernel");
  requireExactFileClosure(
    kernelFiles,
    parent.inputKernelObservation.sourceClosure.files,
    "input kernel"
  );

  const epochFiles = await snapshotMany(
    workspaceRoot,
    EPOCH_EXPERIMENT_FILES,
    "Vedic temporary epoch experiment"
  );
  requireExactFileClosure(
    epochFiles,
    parent.mutationEpochExperimentObservation.sourceClosure.files,
    "temporary epoch experiment"
  );

  const civilTimeFiles = await snapshotMany(
    workspaceRoot,
    CIVIL_TIME_FILES,
    "Vedic civil-time adapter"
  );

  return {
    parent,
    parentArtifact,
    requirementFiles,
    kernelFiles,
    epochFiles,
    civilTimeFiles,
    sourceSuccessor,
    sourceSuccessorFile
  };
}

function buildProjection(inputs) {
  const components = [
    {
      componentId: "governance_and_requirements_children",
      status: "bound_current_requirements_only_zero_authority",
      closureDigest: componentClosureDigest(
        "governance_and_requirements_children",
        inputs.requirementFiles
      ),
      files: inputs.requirementFiles
    },
    {
      componentId: "civil_time_input_resolution_adapter",
      status: "bound_node_test_only_engineering_candidate",
      closureDigest: componentClosureDigest(
        "civil_time_input_resolution_adapter",
        inputs.civilTimeFiles
      ),
      files: inputs.civilTimeFiles
    },
    {
      componentId: "input_admission_kernel_draft",
      status: "bound_private_export_closed_not_formally_integrated",
      closureDigest: componentClosureDigest(
        "input_admission_kernel_draft",
        inputs.kernelFiles
      ),
      files: inputs.kernelFiles
    },
    {
      componentId: "temporary_mutation_epoch_experiment",
      status: "bound_ephemeral_experiment_not_product_runtime",
      closureDigest: componentClosureDigest(
        "temporary_mutation_epoch_experiment",
        inputs.epochFiles
      ),
      files: inputs.epochFiles
    },
    {
      componentId: "source_binding_and_three_layer_rights_requirements_successor",
      status: "bound_requirements_only_nonformal_successor_zero_active_effect",
      closureDigest: componentClosureDigest(
        "source_binding_and_three_layer_rights_requirements_successor",
        [inputs.sourceSuccessorFile]
      ),
      files: [{
        path: inputs.sourceSuccessorFile.path,
        bytes: inputs.sourceSuccessorFile.bytes,
        sha256: inputs.sourceSuccessorFile.sha256
      }]
    }
  ];

  const unsigned = {
    activeAdmissionEffect: "none",
    authorityBoundary: {
      baziAuthorityInherited: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    componentAccounting: {
      componentClosures: 5,
      componentFileReferences: 33,
      uniquePhysicalPaths: 33
    },
    components,
    createdAt: CREATED_AT,
    doesNotEstablish: [
      "vedic_product_or_release_identity",
      "main_application_or_formal_registry_integration",
      "formal_input_contract_fact_bundle_or_versioned_ruleset",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "content_expert_or_legal_truth",
      "browser_pwa_service_worker_or_public_host_acceptance",
      "product_runtime_storage_schema_backup_recovery_or_rollback",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "cross_system_comparison_support_or_authority_inheritance",
      "release_readiness_deployment_or_public_release_authorization"
    ],
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      releaseEvidenceComplete: false,
      requirementsUniverseClosed: false,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7
    },
    integrationBoundary: {
      centralFormalRegistryConsumesThisManifest: false,
      crossSystemEngineeringReceiptsConsumeThisManifest: false,
      fourSystemObservationRegistryV2ConsumesThisManifest: false,
      mainApplicationIntegrated: false,
      ownerAcceptanceForFormalAdmissionEstablished: false
    },
    manifestId: MANIFEST_ID,
    productBoundary: {
      formalProductSurface: "absent",
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      targetSchema: null
    },
    projectDefaultReleaseGovernance: {
      activeLine: "legacy-v13",
      inheritedByThisSystem: false,
      migrationId: null,
      targetSchema: 13
    },
    recordType: RECORD_TYPE,
    releaseStatus: "draft",
    requirementsAccounting: {
      factRequirementsDefined: 12,
      inputRequirementsDefined: 13,
      requirementsResolved: 0,
      ruleRequirementsDefined: 13,
      totalRequirementsDefined: 38
    },
    schemaVersion: "1.0.0",
    snapshotBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      intervalMutationExcludedAcrossFiles: false,
      manifestDigestIsDigitalSignature: false,
      mutationEpochAvailableForProduct: false,
      mutationEpochReceipt: null
    },
    status: STATUS,
    sourceRequirementsSuccessor: {
      artifact: {
        path: inputs.sourceSuccessorFile.path,
        bytes: inputs.sourceSuccessorFile.bytes,
        sha256: inputs.sourceSuccessorFile.sha256
      },
      bindingFrozenVerified: inputs.sourceSuccessor.bindingFrozenVerified,
      bindingRequired: inputs.sourceSuccessor.bindingRequired,
      candidateExactQuoteObservationsStored:
        inputs.sourceSuccessor.candidateExactQuoteObservationsStored,
      exactQuotesBound: inputs.sourceSuccessor.exactQuotesBound,
      formalParentIntegrated: inputs.sourceSuccessor.formalParentIntegrated,
      formalRegistryIntegrated: inputs.sourceSuccessor.formalRegistryIntegrated,
      ledgerDigest: inputs.sourceSuccessor.ledgerDigest,
      ledgerId: inputs.sourceSuccessor.ledgerId,
      partialCandidatesAttached: inputs.sourceSuccessor.partialCandidatesAttached,
      predecessorRemainsFormalCurrent:
        inputs.sourceSuccessor.predecessorRemainsFormalCurrent,
      privateBrandVerified: true,
      publicReleaseAuthorized: inputs.sourceSuccessor.publicReleaseAuthorized,
      releaseReady: inputs.sourceSuccessor.releaseReady,
      status: inputs.sourceSuccessor.status,
      subjectFullySatisfied: inputs.sourceSuccessor.subjectFullySatisfied,
      successorActiveEffect: inputs.sourceSuccessor.successorActiveEffect,
      successorIsFormalCurrent: inputs.sourceSuccessor.successorIsFormalCurrent
    },
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productType: "research_boundary_only"
    },
    upstreamObservation: {
      artifact: inputs.parentArtifact,
      candidateDigest: inputs.parent.candidateDigest,
      candidateId: inputs.parent.candidateId,
      privateBrandVerified: true
    },
    upstreamRequirementsChildren: inputs.parent.artifactBindings
  };
  return {
    ...unsigned,
    manifestDigest: domainDigest(DIGEST_DOMAIN, unsigned)
  };
}

export function computeVedicIndependentEngineeringManifestV1Digest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.manifestDigest;
  return domainDigest(DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyVedicIndependentEngineeringManifestV1(value) {
  const normalized = canonicalValue(value);
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [normalized, null, 2])}\n`;
}

export function parseVedicIndependentEngineeringManifestV1JsonBytes(
  bytes,
  label = "Vedic independent engineering manifest JSON"
) {
  return canonicalValue(
    parseVedicProductizationRequirementsJsonBytes(bytes, label, MAX_MANIFEST_BYTES)
  );
}

function requireFixedRedBoundary(manifest) {
  if (manifest.manifestId !== MANIFEST_ID
    || manifest.recordType !== RECORD_TYPE
    || manifest.schemaVersion !== "1.0.0"
    || manifest.status !== STATUS
    || manifest.releaseStatus !== "draft"
    || manifest.activeAdmissionEffect !== "none"
    || manifest.productBoundary?.productIdentity !== null
    || manifest.productBoundary?.releaseIdentity !== null
    || manifest.productBoundary?.targetSchema !== null
    || manifest.productBoundary?.migrationId !== null
    || manifest.integrationBoundary?.mainApplicationIntegrated !== false
    || manifest.authorityBoundary?.baziAuthorityInherited !== false
    || manifest.authorityBoundary?.contentTruthEstablished !== false
    || manifest.authorityBoundary?.expertTruthEstablished !== false
    || manifest.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest.authorityBoundary?.releaseReady !== false
    || manifest.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest.authorityBoundary?.expertClaimsAuthorized !== false
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.bindingRequired !== 38
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.gateState?.independentExpertsRequired !== 2
    || manifest.gateState?.admissionGatesSatisfied !== 0
    || manifest.gateState?.admissionGatesRequired !== 8
    || manifest.componentAccounting?.componentClosures !== 5
    || manifest.componentAccounting?.componentFileReferences !== 33
    || manifest.componentAccounting?.uniquePhysicalPaths !== 33
    || manifest.sourceRequirementsSuccessor?.artifact?.path
      !== EXPECTED_SOURCE_SUCCESSOR.path
    || manifest.sourceRequirementsSuccessor?.artifact?.bytes
      !== EXPECTED_SOURCE_SUCCESSOR.rawBytes
    || manifest.sourceRequirementsSuccessor?.artifact?.sha256
      !== EXPECTED_SOURCE_SUCCESSOR.rawSha256
    || manifest.sourceRequirementsSuccessor?.ledgerId
      !== EXPECTED_SOURCE_SUCCESSOR.ledgerId
    || manifest.sourceRequirementsSuccessor?.ledgerDigest
      !== EXPECTED_SOURCE_SUCCESSOR.ledgerDigest
    || manifest.sourceRequirementsSuccessor?.status
      !== EXPECTED_SOURCE_SUCCESSOR.status
    || manifest.sourceRequirementsSuccessor?.privateBrandVerified !== true
    || manifest.sourceRequirementsSuccessor?.predecessorRemainsFormalCurrent !== true
    || manifest.sourceRequirementsSuccessor?.successorIsFormalCurrent !== false
    || manifest.sourceRequirementsSuccessor?.successorActiveEffect !== "none"
    || manifest.sourceRequirementsSuccessor?.bindingFrozenVerified !== 0
    || manifest.sourceRequirementsSuccessor?.bindingRequired !== 38
    || manifest.sourceRequirementsSuccessor?.partialCandidatesAttached !== 2
    || manifest.sourceRequirementsSuccessor?.subjectFullySatisfied !== 0
    || manifest.sourceRequirementsSuccessor?.candidateExactQuoteObservationsStored !== 3
    || manifest.sourceRequirementsSuccessor?.exactQuotesBound !== 0
    || manifest.sourceRequirementsSuccessor?.formalParentIntegrated !== false
    || manifest.sourceRequirementsSuccessor?.formalRegistryIntegrated !== false
    || manifest.sourceRequirementsSuccessor?.releaseReady !== false
    || manifest.sourceRequirementsSuccessor?.publicReleaseAuthorized !== false) {
    fail("RED_BOUNDARY_MISMATCH", "Vedic manifest 的独立、零准入或全红边界被提升。");
  }
  if (manifest.manifestDigest
    !== computeVedicIndependentEngineeringManifestV1Digest(manifest)) {
    fail("MANIFEST_DIGEST_MISMATCH", "Vedic manifest 自摘要不匹配。");
  }
  return manifest;
}

function assertExpectedProjection(candidate, expected) {
  requireFixedRedBoundary(candidate);
  if (!exactJson(candidate, expected)) {
    fail("CURRENT_MANIFEST_MISMATCH", "Vedic manifest 与允许的当前工程投影不一致。");
  }
  return candidate;
}

export async function buildCurrentVedicIndependentEngineeringManifestV1(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(canonicalValue(requireFixedRedBoundary(buildProjection(inputs))));
}

export async function readCurrentVedicIndependentEngineeringManifestV1(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentVedicIndependentEngineeringManifestV1(workspaceRoot);
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V1_RELATIVE_PATH,
    MAX_MANIFEST_BYTES,
    {
      invalidCode: "MANIFEST_ENDPOINT_INVALID",
      missingCode: "MANIFEST_MISSING",
      label: "Vedic independent engineering manifest v1"
    }
  );
  const persisted = parseVedicIndependentEngineeringManifestV1JsonBytes(snapshot.bytes);
  const canonicalText =
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV1(persisted);
  if (REFLECT_APPLY(BUFFER_BYTE_LENGTH, NATIVE_BUFFER, [canonicalText, "utf8"])
      !== snapshot.rawBytes
    || sha256Text(canonicalText) !== snapshot.rawSha256) {
    fail("MANIFEST_MATERIALIZATION_MISMATCH", "Vedic manifest 不是唯一 canonical LF materialization。");
  }
  assertExpectedProjection(persisted, expected);
  if (EXPECTED_PERSISTED.rawBytes !== 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "persisted Vedic manifest 冻结身份漂移。");
  }
  const result = deepFreeze(canonicalValue({
    artifact: {
      path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V1_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    manifest: persisted,
    manifestDigest: persisted.manifestDigest,
    mechanicallyVerified: true
  }));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicIndependentEngineeringManifestV1(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getVedicIndependentEngineeringManifestV1Summary(value) {
  if (!isVerifiedVedicIndependentEngineeringManifestV1(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受本模块 loader 的私有品牌结果。");
  }
  const manifest = value.manifest;
  return deepFreeze(canonicalValue({
    activeAdmissionEffect: manifest.activeAdmissionEffect,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    artifact: value.artifact,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    expertClaimsAuthorized: manifest.authorityBoundary.expertClaimsAuthorized,
    independentExpertReviewsVerified:
      manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    mainApplicationIntegrated: manifest.integrationBoundary.mainApplicationIntegrated,
    manifestDigest: value.manifestDigest,
    manifestId: manifest.manifestId,
    migrationId: manifest.productBoundary.migrationId,
    productIdentity: manifest.productBoundary.productIdentity,
    publicDeploymentAuthorized: manifest.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized,
    releaseIdentity: manifest.productBoundary.releaseIdentity,
    releaseReady: manifest.authorityBoundary.releaseReady,
    targetSchema: manifest.productBoundary.targetSchema
  }));
}

export const vedicIndependentEngineeringManifestV1TestOnly = OBJECT_FREEZE({
  CIVIL_TIME_FILES,
  CREATED_AT,
  DIGEST_DOMAIN,
  EPOCH_EXPERIMENT_FILES,
  EXPECTED_PARENT,
  EXPECTED_PERSISTED,
  EXPECTED_SOURCE_SUCCESSOR,
  KERNEL_FILES,
  MANIFEST_ID,
  RECORD_TYPE,
  STATUS,
  appendSnapshot,
  assertExpectedProjection,
  buildProjection,
  canonicalStringify,
  exactJson,
  mapRequirementBindings,
  requireFixedRedBoundary,
  requireVerifiedSourceSuccessor,
  sha256Text
});
