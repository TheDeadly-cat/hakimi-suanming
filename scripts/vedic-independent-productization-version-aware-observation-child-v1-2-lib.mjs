import { createHash } from "node:crypto";

import {
  canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate,
  computeVedicProductizationVersionAwareObservationCandidateDigest,
  parseVedicProductizationVersionAwareObservationCandidateJsonBytes,
  verifyVedicProductizationVersionAwareObservationCandidateObject,
  vedicProductizationVersionAwareObservationCandidateTestOnly as v11TestOnly
} from "./vedic-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  computeVedicProductizationRequirementsDigest,
  parseVedicProductizationRequirementsJsonBytes
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
  parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";
import {
  computeVedicRealIndependentExpertReviewPlanDigest,
  parseVedicRealIndependentExpertReviewPlanJsonBytes
} from "./vedic-real-independent-expert-review-plan-lib.mjs";
import {
  computeVedicHighRiskExpressionPolicyDraftDigest,
  parseVedicHighRiskExpressionPolicyDraftJsonBytes
} from "./vedic-high-risk-expression-policy-draft-lib.mjs";
import {
  computeVedicInputStructuralRejectionEvidenceDigest,
  parseVedicInputStructuralRejectionEvidenceJsonBytes
} from "./vedic-input-structural-rejection-evidence-lib.mjs";
import {
  computeVedicInputAdmissionReadinessCandidateDigest,
  parseVedicInputAdmissionReadinessCandidateJsonBytes,
  verifyVedicInputAdmissionReadinessCandidateObject
} from "./vedic-input-admission-readiness-candidate-lib.mjs";
import {
  computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest,
  parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes,
  verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject
} from "./vedic-input-admission-transition-and-receipt-requirements-lib.mjs";
import {
  computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest,
  parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes,
  verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject
} from "./vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs";
import {
  verifyVedicInputAdmissionKernelDraft
} from "./verify-vedic-input-admission-kernel-draft.mjs";

const MAX_BOUND_BYTES = 512 * 1024;
const MAX_CANDIDATE_BYTES = 256 * 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DIGEST_DOMAIN =
  "hakimi.vedic.independent-productization.version-aware-observation-child.v1.2";
const CLOSURE_DIGEST_DOMAIN =
  "hakimi.vedic.independent-productization.version-aware-observation-child.source-closure.v1";

export const VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_2_RELATIVE_PATH =
  "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json";

const CANDIDATE_ID =
  "hakimi.vedic.independent-productization.version-aware-observation-child/1.2.0";
const RECORD_TYPE =
  "vedic_independent_productization_version_aware_observation_child_v1_2";
const STATUS =
  "current_version_aware_non_atomic_engineering_observation_child_zero_admission_effect_all_authority_false";
const CREATED_AT = "2026-08-31T00:00:00.000Z";

const ARTIFACT_PATHS = Object.freeze({
  parent: "content/system-admission/vedic-independent-productization-requirements.v1.json",
  priorObservation:
    "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json",
  sourceRights:
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
  expertPlan:
    "content/system-admission/vedic-real-independent-expert-review-plan.v1.json",
  highRisk:
    "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json",
  inputStructural:
    "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
  readiness:
    "content/system-admission/vedic-input-admission-readiness-candidate.v0.1.0.json",
  transition:
    "content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json",
  storage:
    "content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json"
});

const KERNEL_PACKAGE_DIRECTORY = "packages/vedic-input-admission-kernel-draft";
const KERNEL_PACKAGE_FILES = Object.freeze([
  "README.md",
  "package.json",
  "src/evaluator.test.ts",
  "src/evaluator.ts",
  "src/frozen-packet-schema.ts",
  "src/protocol.ts",
  "tsconfig.json",
  "vitest.config.ts"
]);
const KERNEL_VERIFIER_PATH = "scripts/verify-vedic-input-admission-kernel-draft.mjs";
const DOWNSTREAM_REGISTRY_PATH =
  "scripts/system-contract-downstream-draft-registry.json";

const MUTATION_PACKAGE_DIRECTORY =
  "packages/vedic-mutation-epoch-runtime-experiment-draft";
const MUTATION_PACKAGE_FILES = Object.freeze([
  "README.md",
  "browser-app/index.html",
  "package.json",
  "src/browser-app/main.ts",
  "src/browser-app/styles.css",
  "src/runtime.test.ts",
  "src/runtime.ts",
  "tsconfig.json",
  "vite.browser-experiment.config.mjs",
  "vitest.config.ts"
]);

const EXPECTED_SEMANTIC_IDENTITIES = Object.freeze({
  parent: Object.freeze({
    artifactId: "hakimi.vedic.independent-productization-requirements/1.0.0",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb"
  }),
  priorObservation: Object.freeze({
    artifactId:
      "hakimi.vedic.independent-productization.version-aware-observation-candidate/1.1.0",
    semanticDigestField: "candidateDigest",
    semanticDigest: "3eebcbcd60dfd1f4a96671ec2ab18bd6cceb20d14806acd44a00603e4848a8d1"
  }),
  sourceRights: Object.freeze({
    artifactId:
      "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e"
  }),
  expertPlan: Object.freeze({
    artifactId: "hakimi.vedic.real-independent-expert-review-plan/1.0.0",
    semanticDigestField: "planDigest",
    semanticDigest: "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af"
  }),
  highRisk: Object.freeze({
    artifactId: "hakimi.vedic.high-risk-expression-policy-draft/0.1.0",
    semanticDigestField: "policyDigest",
    semanticDigest: "bc1996b042e84214f86d35416c4589e3309a5654250e43c30688568a28ee9fb9"
  }),
  inputStructural: Object.freeze({
    artifactId:
      "hakimi.vedic.input-structural-rejection-execution-evidence/1.0.0",
    semanticDigestField: "evidenceDigest",
    semanticDigest: "b068269d809d49e6ff2f8a80ee2c3ee2bcb649f9fbfc0cb1fa3240b3722422a2"
  }),
  readiness: Object.freeze({
    artifactId: "vedic-input-admission-readiness-candidate-v0.1.0",
    semanticDigestField: "candidateDigest",
    semanticDigest: "688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb"
  }),
  transition: Object.freeze({
    artifactId:
      "vedic-input-admission-transition-and-receipt-requirements-v0.1.0",
    semanticDigestField: "contractDigest",
    semanticDigest: "548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac"
  }),
  storage: Object.freeze({
    artifactId:
      "hakimi.vedic.independent-storage-backup-recovery-rollback.design-candidate/0.1.0",
    semanticDigestField: "designDigest",
    semanticDigest: "5a96993f7750722a984eb6f5845ce1e49e6c5f49e5b49735629698a47eb11958"
  })
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 16_272,
  rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845",
  candidateDigest: "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171"
});

const VERIFIED_RESULTS = new WeakSet();
const canonicalStringify = v11TestOnly.canonicalStringify;
const readStableWorkspaceFile = v11TestOnly.readStableWorkspaceFile;

export class VedicProductizationVersionAwareObservationChildV12Error extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "VedicProductizationVersionAwareObservationChildV12Error";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicProductizationVersionAwareObservationChildV12Error(
    code,
    message,
    cause
  );
}

function canonicalValue(value) {
  try {
    return JSON.parse(canonicalStringify(value));
  } catch (cause) {
    if (cause instanceof VedicProductizationVersionAwareObservationChildV12Error) {
      throw cause;
    }
    fail("NON_CANONICAL_VALUE", "v1.2 observation child 只接受被动 JSON 值。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "v1.2 observation child 不接受 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function requireAllFalse(value, label) {
  const entries = Object.entries(value ?? {});
  if (entries.length === 0 || entries.some(([, state]) => state !== false)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} 必须全部保持 false。`);
  }
}

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value ?? {}).sort();
  const wanted = [...expected].sort();
  if (!exactJson(actual, wanted)) {
    fail("KEY_SET_MISMATCH", `${label} 的键集合漂移。`);
  }
}

function requireDigest(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail("DIGEST_INVALID", `${label} 不是 lowercase SHA-256。`);
  }
}

function artifactIdOf(role, value) {
  const fields = {
    parent: "ledgerId",
    priorObservation: "candidateId",
    sourceRights: "ledgerId",
    expertPlan: "planId",
    highRisk: "policyId",
    inputStructural: "artifactId",
    readiness: "candidateId",
    transition: "contractId",
    storage: "designId"
  };
  return value[fields[role]];
}

function makeArtifactBinding(role, snapshot, value) {
  const expected = EXPECTED_SEMANTIC_IDENTITIES[role];
  return {
    artifactId: expected.artifactId,
    bytes: snapshot.rawBytes,
    path: ARTIFACT_PATHS[role],
    role,
    semanticDigest: expected.semanticDigest,
    semanticDigestField: expected.semanticDigestField,
    sha256: snapshot.rawSha256,
    status: value.status
  };
}

async function readJson(workspaceRoot, role, parser) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ARTIFACT_PATHS[role],
    MAX_BOUND_BYTES,
    {
      invalidCode: "BOUND_ARTIFACT_ENDPOINT_INVALID",
      missingCode: "BOUND_ARTIFACT_MISSING",
      label: `v1.2 ${role} binding`
    }
  );
  let value;
  try {
    value = parser(snapshot.bytes, `v1.2 ${role} binding`, MAX_BOUND_BYTES);
  } catch (cause) {
    fail("BOUND_ARTIFACT_PARSE_FAILED", `${role} binding 无法严格解析。`, cause);
  }
  return { snapshot, value };
}

function verifySemanticIdentity(role, value, computedDigest) {
  const expected = EXPECTED_SEMANTIC_IDENTITIES[role];
  if (artifactIdOf(role, value) !== expected.artifactId
    || value[expected.semanticDigestField] !== expected.semanticDigest
    || computedDigest !== expected.semanticDigest) {
    fail("BOUND_SEMANTIC_IDENTITY_MISMATCH", `${role} semantic identity 漂移。`);
  }
}

async function collectArtifactBindings(workspaceRoot) {
  const parent = await readJson(
    workspaceRoot,
    "parent",
    parseVedicProductizationRequirementsJsonBytes
  );
  verifySemanticIdentity(
    "parent",
    parent.value,
    computeVedicProductizationRequirementsDigest(parent.value)
  );

  const priorObservation = await readJson(
    workspaceRoot,
    "priorObservation",
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes
  );
  verifyVedicProductizationVersionAwareObservationCandidateObject(
    priorObservation.value
  );
  verifySemanticIdentity(
    "priorObservation",
    priorObservation.value,
    computeVedicProductizationVersionAwareObservationCandidateDigest(
      priorObservation.value
    )
  );

  const sourceRights = await readJson(
    workspaceRoot,
    "sourceRights",
    parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes
  );
  verifySemanticIdentity(
    "sourceRights",
    sourceRights.value,
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(
      sourceRights.value
    )
  );

  const expertPlan = await readJson(
    workspaceRoot,
    "expertPlan",
    parseVedicRealIndependentExpertReviewPlanJsonBytes
  );
  verifySemanticIdentity(
    "expertPlan",
    expertPlan.value,
    computeVedicRealIndependentExpertReviewPlanDigest(expertPlan.value)
  );

  const highRisk = await readJson(
    workspaceRoot,
    "highRisk",
    parseVedicHighRiskExpressionPolicyDraftJsonBytes
  );
  verifySemanticIdentity(
    "highRisk",
    highRisk.value,
    computeVedicHighRiskExpressionPolicyDraftDigest(highRisk.value)
  );

  const inputStructural = await readJson(
    workspaceRoot,
    "inputStructural",
    parseVedicInputStructuralRejectionEvidenceJsonBytes
  );
  verifySemanticIdentity(
    "inputStructural",
    inputStructural.value,
    computeVedicInputStructuralRejectionEvidenceDigest(inputStructural.value)
  );

  const readiness = await readJson(
    workspaceRoot,
    "readiness",
    parseVedicInputAdmissionReadinessCandidateJsonBytes
  );
  verifyVedicInputAdmissionReadinessCandidateObject(readiness.value);
  verifySemanticIdentity(
    "readiness",
    readiness.value,
    computeVedicInputAdmissionReadinessCandidateDigest(readiness.value)
  );

  const transition = await readJson(
    workspaceRoot,
    "transition",
    parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes
  );
  verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(
    transition.value
  );
  verifySemanticIdentity(
    "transition",
    transition.value,
    computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(
      transition.value
    )
  );

  const storage = await readJson(
    workspaceRoot,
    "storage",
    parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes
  );
  verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
    storage.value
  );
  verifySemanticIdentity(
    "storage",
    storage.value,
    computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
      storage.value
    )
  );

  return {
    bindings: [
      ["parent", parent],
      ["priorObservation", priorObservation],
      ["sourceRights", sourceRights],
      ["expertPlan", expertPlan],
      ["highRisk", highRisk],
      ["inputStructural", inputStructural],
      ["readiness", readiness],
      ["transition", transition],
      ["storage", storage]
    ].map(([role, entry]) => makeArtifactBinding(
      role,
      entry.snapshot,
      entry.value
    )),
    values: {
      expertPlan: expertPlan.value,
      parent: parent.value,
      readiness: readiness.value,
      sourceRights: sourceRights.value,
      storage: storage.value,
      transition: transition.value
    }
  };
}

async function collectFileClosure(workspaceRoot, directory, fileNames, label) {
  const files = [];
  for (const fileName of fileNames) {
    const relativePath = `${directory}/${fileName}`;
    const snapshot = await readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      MAX_BOUND_BYTES,
      {
        invalidCode: "SOURCE_CLOSURE_ENDPOINT_INVALID",
        missingCode: "SOURCE_CLOSURE_FILE_MISSING",
        label: `${label} ${fileName}`
      }
    );
    files.push({
      bytes: snapshot.rawBytes,
      path: relativePath,
      sha256: snapshot.rawSha256
    });
  }
  return {
    closureDigest: domainDigest(CLOSURE_DIGEST_DOMAIN, files),
    files
  };
}

function parsePackageManifest(bytes, label) {
  return parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
    bytes,
    label,
    MAX_BOUND_BYTES
  );
}

async function collectKernelObservation(workspaceRoot) {
  const closure = await collectFileClosure(
    workspaceRoot,
    KERNEL_PACKAGE_DIRECTORY,
    KERNEL_PACKAGE_FILES,
    "Vedic input kernel"
  );
  const manifestRef = closure.files.find((entry) => entry.path.endsWith("/package.json"));
  const manifestSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    manifestRef.path,
    MAX_BOUND_BYTES,
    { label: "Vedic input kernel package manifest" }
  );
  const manifest = parsePackageManifest(
    manifestSnapshot.bytes,
    "Vedic input kernel package manifest"
  );
  if (manifest.name !== "@hakimi/vedic-input-admission-kernel-draft"
    || manifest.private !== true
    || !exactJson(manifest.exports, {})
    || manifest["x-hakimi-isolated-draft"]?.productionImport !== "forbidden") {
    fail("KERNEL_PACKAGE_BOUNDARY_DRIFT", "input kernel 不再保持 private/empty exports/production forbidden。" );
  }

  const verifierSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    KERNEL_VERIFIER_PATH,
    MAX_BOUND_BYTES,
    { label: "Vedic input kernel verifier" }
  );
  const registrySnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    DOWNSTREAM_REGISTRY_PATH,
    MAX_BOUND_BYTES,
    { label: "downstream draft registry" }
  );
  const report = await verifyVedicInputAdmissionKernelDraft(workspaceRoot);
  if (report.kernelDraftMechanicallyObserved !== true
    || report.restrictedWebFileIntentionallyNotRead !== true
    || report.restrictedWebPath !== "apps/web/src/lib/local-user-data-cleanup.ts"
    || report.observationClass !== "point_in_time_non_atomic_source_observation"
    || report.authorityEffect !== "none") {
    fail("KERNEL_VERIFIER_NOT_CURRENT_RED_OBSERVATION", "input kernel verifier 未返回预期的非原子、零权限观察。" );
  }

  return {
    authorityEffect: "none",
    crossFileAtomicSnapshot: report.crossFileAtomicSnapshot,
    executableSuccessReceiptSchemasAvailable:
      report.executableSuccessReceiptSchemasAvailable,
    formalParentIntegrated: report.formalParentIntegrated,
    fourSystemRegistryIntegrated: report.fourSystemRegistryIntegrated,
    kernelDraftMechanicallyObserved: report.kernelDraftMechanicallyObserved,
    packageBoundary: {
      exportsEmpty: true,
      packageName: manifest.name,
      private: true,
      productionImport: "forbidden"
    },
    persistenceEstablished: report.persistenceEstablished,
    pointInTimeSourceObservation: report.pointInTimeSourceObservation,
    productInputReceiptIssued: report.acceptedReceiptIssued,
    productionDependencyClosureEstablished:
      report.productionDependencyClosureEstablished,
    registryBinding: {
      bytes: registrySnapshot.rawBytes,
      path: DOWNSTREAM_REGISTRY_PATH,
      sha256: registrySnapshot.rawSha256
    },
    restrictedWebFileIntentionallyNotRead:
      report.restrictedWebFileIntentionallyNotRead,
    runtimeEstablished: report.runtimeEstablished,
    sourceClosure: closure,
    transitionPersisted: report.transitionPersisted,
    trustedRuntimeObserved: report.trustedRuntimeObserved,
    upstreamReadinessRegistryBacklinkObserved:
      report.upstreamReadinessRegistryBacklinkObserved,
    verifierBinding: {
      bytes: verifierSnapshot.rawBytes,
      path: KERNEL_VERIFIER_PATH,
      sha256: verifierSnapshot.rawSha256
    }
  };
}

async function collectMutationObservation(workspaceRoot) {
  const closure = await collectFileClosure(
    workspaceRoot,
    MUTATION_PACKAGE_DIRECTORY,
    MUTATION_PACKAGE_FILES,
    "Vedic mutation epoch experiment"
  );
  const packageSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    `${MUTATION_PACKAGE_DIRECTORY}/package.json`,
    MAX_BOUND_BYTES,
    { label: "Vedic mutation epoch experiment package manifest" }
  );
  const manifest = parsePackageManifest(
    packageSnapshot.bytes,
    "Vedic mutation epoch experiment package manifest"
  );
  const isolated = manifest["x-hakimi-isolated-draft"];
  if (manifest.name !== "@hakimi/vedic-mutation-epoch-runtime-experiment-draft"
    || manifest.private !== true
    || !exactJson(manifest.exports, {})
    || isolated?.productIdentity !== null
    || isolated?.targetSchema !== null
    || isolated?.migrationId !== null
    || isolated?.runtimeOptionSelected !== false
    || isolated?.storageBackendSelected !== false
    || isolated?.productionImport !== "forbidden") {
    fail("MUTATION_EXPERIMENT_BOUNDARY_DRIFT", "mutation epoch experiment 越出独立非产品边界。" );
  }

  const readmeSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    `${MUTATION_PACKAGE_DIRECTORY}/README.md`,
    MAX_BOUND_BYTES,
    { label: "Vedic mutation epoch experiment README" }
  );
  const readme = decodeStrictUtf8(readmeSnapshot.bytes, "mutation experiment README");
  const requiredFragments = [
    "This package is deliberately not a product storage implementation",
    "No external monotonic anchor or exclusive/authenticated same-origin store",
    "productMutationReceiptIssued",
    "six-probe button",
    "no browser evidence yet exists",
    "`1 file / 10 tests`"
  ];
  if (requiredFragments.some((fragment) => !readme.includes(fragment))) {
    fail("MUTATION_EXPERIMENT_DISCLOSURE_DRIFT", "mutation experiment README 的非产品披露漂移。" );
  }

  return {
    abaExcludedForFormalProduct: false,
    browserButtonFlowObserved: false,
    externalMonotonicAnchorAvailable: false,
    focusedEvidenceReportedByReadme: {
      isolatedViteBuildReported: true,
      nodeTestFiles: 1,
      nodeTests: 10,
      recordedAsExecutionByThisObservation: false,
      strictTypeScriptReported: true
    },
    packageBoundary: {
      exportsEmpty: true,
      migrationId: null,
      packageName: manifest.name,
      private: true,
      productIdentity: null,
      productionImport: "forbidden",
      runtimeOptionSelected: false,
      storageBackendSelected: false,
      targetSchema: null
    },
    productMutationGateSatisfied: false,
    productMutationReceiptIssued: false,
    sourceClosure: closure,
    testsExecutedByThisObservation: false
  };
}

export function computeVedicProductizationVersionAwareObservationChildV12Digest(
  value
) {
  const unsigned = canonicalValue(value);
  delete unsigned.candidateDigest;
  return domainDigest(DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyVedicProductizationVersionAwareObservationChildV12(
  value
) {
  return canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate(
    value
  );
}

export function parseVedicProductizationVersionAwareObservationChildV12JsonBytes(
  bytes,
  label = "Vedic v1.2 observation child JSON",
  maxBytes = MAX_CANDIDATE_BYTES
) {
  return parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
    bytes,
    label,
    maxBytes
  );
}

function validateArtifactBindings(bindings) {
  if (!Array.isArray(bindings) || bindings.length !== 9) {
    fail("ARTIFACT_BINDING_SET_MISMATCH", "v1.2 必须精确绑定 9 个现有治理 artifact。" );
  }
  const expectedRoles = Object.keys(ARTIFACT_PATHS);
  for (let index = 0; index < expectedRoles.length; index += 1) {
    const role = expectedRoles[index];
    const binding = bindings[index];
    const expected = EXPECTED_SEMANTIC_IDENTITIES[role];
    if (binding?.role !== role
      || binding.path !== ARTIFACT_PATHS[role]
      || binding.artifactId !== expected.artifactId
      || binding.semanticDigestField !== expected.semanticDigestField
      || binding.semanticDigest !== expected.semanticDigest
      || !Number.isSafeInteger(binding.bytes)
      || binding.bytes <= 0
      || !SHA256_PATTERN.test(binding.sha256)
      || typeof binding.status !== "string"
      || binding.status.length === 0) {
      fail("ARTIFACT_BINDING_IDENTITY_MISMATCH", `${role} binding 不完整或发生提升。`);
    }
  }
}

function validateSourceClosure(closure, fileNames, directory, label) {
  if (!Array.isArray(closure?.files)
    || closure.files.length !== fileNames.length
    || !SHA256_PATTERN.test(closure.closureDigest)
    || closure.closureDigest !== domainDigest(CLOSURE_DIGEST_DOMAIN, closure.files)) {
    fail("SOURCE_CLOSURE_INVALID", `${label} source closure 无效。`);
  }
  for (let index = 0; index < closure.files.length; index += 1) {
    const file = closure.files[index];
    if (typeof file.path !== "string"
      || file.path !== `${directory}/${fileNames[index]}`
      || !Number.isSafeInteger(file.bytes)
      || file.bytes <= 0
      || !SHA256_PATTERN.test(file.sha256)) {
      fail("SOURCE_CLOSURE_INVALID", `${label} source closure 文件身份无效。`);
    }
  }
}

export function verifyVedicProductizationVersionAwareObservationChildV12Object(
  value
) {
  const candidate = canonicalValue(value);
  requireExactKeys(candidate, [
    "activeAdmissionEffect",
    "artifactBindings",
    "authorityBoundary",
    "candidateDigest",
    "candidateId",
    "createdAt",
    "doesNotEstablish",
    "evidenceLedgerSeparation",
    "gateSummary",
    "inputKernelObservation",
    "integrityBoundary",
    "mutationEpochExperimentObservation",
    "observationBoundary",
    "productBoundary",
    "projectReleaseGovernanceContext",
    "recordType",
    "schemaVersion",
    "status",
    "systemIdentity",
    "versionBoundary"
  ], "v1.2 top level");
  if (candidate.schemaVersion !== "1.2.0"
    || candidate.recordType !== RECORD_TYPE
    || candidate.candidateId !== CANDIDATE_ID
    || candidate.status !== STATUS
    || candidate.createdAt !== CREATED_AT
    || candidate.activeAdmissionEffect !== "none") {
    fail("CANDIDATE_IDENTITY_MISMATCH", "v1.2 observation child 身份或零效力边界漂移。" );
  }

  validateArtifactBindings(candidate.artifactBindings);
  requireAllFalse(candidate.authorityBoundary, "v1.2 authorityBoundary");

  const gate = candidate.gateSummary;
  if (gate.admissionGatesRequired !== 8
    || gate.admissionGatesSatisfied !== 0
    || gate.bindingRequired !== 38
    || gate.bindingFrozenVerified !== 0
    || gate.independentExpertsRequired !== 2
    || gate.independentExpertReviewsVerified !== 0
    || gate.inputRequirementsDefined !== 13
    || gate.inputRequirementsResolved !== 0
    || gate.rereviewRequirementsRequired !== 7
    || gate.rereviewRequirementsComplete !== 3
    || gate.requirementsUniverseClosed !== false
    || gate.releaseEvidenceComplete !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "v1.2 gateSummary 必须保持 0/8、0/38、0/2 及其全红派生状态。" );
  }

  const version = candidate.versionBoundary;
  if (version.priorArtifactPreserved !== true
    || version.overwritesPriorArtifact !== false
    || version.supersedesPriorArtifact !== false
    || version.formalParentModifiedByThisChild !== false
    || version.centralRegistryModifiedByThisChild !== false
    || version.downstreamRegistryModifiedByThisChild !== false
    || version.kernelVerifierModifiedByThisChild !== false
    || version.ownerPromotionDecisionReceipt !== null) {
    fail("VERSION_BOUNDARY_PROMOTION_FORBIDDEN", "v1.2 不得覆盖 v1.1 或改写任何正式/下游治理对象。" );
  }

  const kernel = candidate.inputKernelObservation;
  if (kernel.kernelDraftMechanicallyObserved !== true
    || kernel.pointInTimeSourceObservation !== true
    || kernel.crossFileAtomicSnapshot !== false
    || kernel.trustedRuntimeObserved !== false
    || kernel.runtimeEstablished !== false
    || kernel.persistenceEstablished !== false
    || kernel.transitionPersisted !== false
    || kernel.productInputReceiptIssued !== false
    || kernel.executableSuccessReceiptSchemasAvailable !== false
    || kernel.formalParentIntegrated !== false
    || kernel.fourSystemRegistryIntegrated !== false
    || kernel.upstreamReadinessRegistryBacklinkObserved !== false
    || kernel.productionDependencyClosureEstablished !== false
    || kernel.restrictedWebFileIntentionallyNotRead !== true
    || kernel.authorityEffect !== "none"
    || kernel.packageBoundary?.private !== true
    || kernel.packageBoundary?.exportsEmpty !== true
    || kernel.packageBoundary?.productionImport !== "forbidden") {
    fail("KERNEL_OBSERVATION_PROMOTION_FORBIDDEN", "kernel observation 只能是当前非原子、未集成、未持久化的机械观察。" );
  }
  validateSourceClosure(
    kernel.sourceClosure,
    KERNEL_PACKAGE_FILES,
    KERNEL_PACKAGE_DIRECTORY,
    "input kernel"
  );
  for (const binding of [kernel.registryBinding, kernel.verifierBinding]) {
    if (!Number.isSafeInteger(binding?.bytes)
      || binding.bytes <= 0
      || !SHA256_PATTERN.test(binding.sha256)) {
      fail("KERNEL_SUPPORT_BINDING_INVALID", "kernel verifier/registry binding 无效。" );
    }
  }

  const mutation = candidate.mutationEpochExperimentObservation;
  if (mutation.testsExecutedByThisObservation !== false
    || mutation.browserButtonFlowObserved !== false
    || mutation.externalMonotonicAnchorAvailable !== false
    || mutation.abaExcludedForFormalProduct !== false
    || mutation.productMutationReceiptIssued !== false
    || mutation.productMutationGateSatisfied !== false
    || mutation.packageBoundary?.private !== true
    || mutation.packageBoundary?.exportsEmpty !== true
    || mutation.packageBoundary?.productIdentity !== null
    || mutation.packageBoundary?.targetSchema !== null
    || mutation.packageBoundary?.migrationId !== null
    || mutation.packageBoundary?.runtimeOptionSelected !== false
    || mutation.packageBoundary?.storageBackendSelected !== false
    || mutation.packageBoundary?.productionImport !== "forbidden"
    || mutation.focusedEvidenceReportedByReadme?.recordedAsExecutionByThisObservation !== false) {
    fail("MUTATION_EXPERIMENT_PROMOTION_FORBIDDEN", "mutation experiment 不得外推为产品 mutation epoch 能力。" );
  }
  validateSourceClosure(
    mutation.sourceClosure,
    MUTATION_PACKAGE_FILES,
    MUTATION_PACKAGE_DIRECTORY,
    "mutation experiment"
  );

  const observation = candidate.observationBoundary;
  if (observation.pointInTimeOnly !== true
    || observation.crossFileAtomicSnapshot !== false
    || observation.parentAndChildrenAtomicSnapshot !== false
    || observation.intervalMutationExcluded !== false
    || observation.abaExcludedForFormalProduct !== false
    || observation.sameBufferHashAndParsePerBoundFile !== true) {
    fail("OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN", "v1.2 不得声称跨文件原子、区间无变异或产品级 ABA 排除。" );
  }

  const product = candidate.productBoundary;
  if (product.productIdentity !== null
    || product.targetSchema !== null
    || product.migrationId !== null
    || product.releaseIdentity !== null
    || product.runtimeOption !== "unselected"
    || product.storageBackend !== "unselected"
    || product.formalProductSurface !== "absent") {
    fail("PRODUCT_IDENTITY_PROMOTION_FORBIDDEN", "Vedic 独立产品身份、schema、migration、runtime 与 storage backend 必须保持空缺。" );
  }

  const release = candidate.projectReleaseGovernanceContext;
  if (release.activeLine !== "legacy-v13"
    || release.targetSchema !== 13
    || release.migrationId !== null
    || release.projectContextOnly !== true
    || release.inheritedByVedicProductIdentity !== false
    || release.publicDeploymentAuthorized !== false
    || release.expertClaimsAuthorized !== false) {
    fail("PROJECT_CONTEXT_INHERITANCE_FORBIDDEN", "legacy-v13/13/null 只能作为项目上下文，不能成为 Vedic 产品身份。" );
  }

  if (!Array.isArray(candidate.doesNotEstablish)
    || candidate.doesNotEstablish.length < 12
    || candidate.doesNotEstablish.includes("formal_admission")) {
    fail("NON_CLAIM_SET_INVALID", "v1.2 必须列明不能外推的分账证据。" );
  }
  if (!Array.isArray(candidate.evidenceLedgerSeparation)
    || candidate.evidenceLedgerSeparation.length !== 7) {
    fail("EVIDENCE_LEDGER_SEPARATION_INVALID", "v1.2 必须保持七类证据分账。" );
  }
  if (candidate.integrityBoundary.candidateDigestAlgorithm !== "sha256"
    || candidate.integrityBoundary.candidateDigestDomain !== DIGEST_DOMAIN
    || candidate.integrityBoundary.candidateDigestIsDigitalSignature !== false
    || candidate.integrityBoundary.crossFileAtomicSnapshot !== false) {
    fail("INTEGRITY_BOUNDARY_INVALID", "v1.2 digest 不得冒充签名或原子快照。" );
  }
  requireDigest(candidate.candidateDigest, "candidateDigest");
  if (candidate.candidateDigest
    !== computeVedicProductizationVersionAwareObservationChildV12Digest(candidate)) {
    fail("CANDIDATE_DIGEST_MISMATCH", "v1.2 candidateDigest 无效。" );
  }
  if (EXPECTED_PERSISTED.candidateDigest !== ""
    && candidate.candidateDigest !== EXPECTED_PERSISTED.candidateDigest) {
    fail(
      "PERSISTED_SEMANTIC_IDENTITY_MISMATCH",
      "v1.2 candidateDigest 不等于冻结的独立 observation child identity。"
    );
  }

  const frozen = deepFreeze(candidate);
  VERIFIED_RESULTS.add(frozen);
  return frozen;
}

export async function buildCurrentVedicProductizationVersionAwareObservationChildV12(
  workspaceRoot = process.cwd()
) {
  const artifacts = await collectArtifactBindings(workspaceRoot);
  const parent = artifacts.values.parent;
  const readiness = artifacts.values.readiness;
  const sourceRights = artifacts.values.sourceRights;
  const expertPlan = artifacts.values.expertPlan;
  const storage = artifacts.values.storage;
  const transition = artifacts.values.transition;

  if (parent.gateSummary.admissionGatesRequired !== 8
    || parent.gateSummary.admissionGatesSatisfied !== 0
    || sourceRights.gateSummary.bindingRequired !== 38
    || sourceRights.gateSummary.bindingFrozenVerified !== 0
    || parent.gateSummary.independentExpertsRequired !== 2
    || parent.gateSummary.independentExpertReviewsVerified !== 0
    || readiness.gateSummary.requirementsDefined !== 13
    || readiness.gateSummary.requirementsResolved !== 0
    || expertPlan.reviewStarted !== false
    || expertPlan.reviewStartPrerequisites?.required !== 16
    || expertPlan.reviewStartPrerequisites?.satisfied !== 0
    || storage.designCoverage.interfaceRequirementsDefined !== 6
    || transition.zeroInstanceState.mutationEpochAvailable !== false) {
    fail("UPSTREAM_RED_PROJECTION_DRIFT", "当前 upstream 已不等于 v1.2 允许记录的全红投影。" );
  }
  requireAllFalse(parent.authorityBoundary, "parent authorityBoundary");
  requireAllFalse(readiness.authorityBoundary, "readiness authorityBoundary");
  requireAllFalse(expertPlan.authorityBoundary, "expert authorityBoundary");
  requireAllFalse(storage.authorityBoundary, "storage authorityBoundary");
  requireAllFalse(transition.authorityBoundary, "transition authorityBoundary");

  const inputKernelObservation = await collectKernelObservation(workspaceRoot);
  const mutationEpochExperimentObservation =
    await collectMutationObservation(workspaceRoot);

  const unsigned = {
    activeAdmissionEffect: "none",
    artifactBindings: artifacts.bindings,
    authorityBoundary: {
      baziAuthorityInherited: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      inputContractGateSatisfied: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false,
      ruleEvaluationAuthorized: false
    },
    candidateId: CANDIDATE_ID,
    createdAt: CREATED_AT,
    doesNotEstablish: [
      "browser_runtime_acceptance",
      "content_truth",
      "domain_authority",
      "expert_claims_authority",
      "expert_truth",
      "formal_input_admission",
      "high_risk_claims_authority",
      "legal_or_rights_conclusion",
      "product_mutation_epoch_capability",
      "public_deployment_authority",
      "public_release_authority",
      "release_evidence_completeness",
      "release_readiness",
      "source_binding_or_redistribution_rights",
      "vedic_product_identity",
      "versioned_ruleset_authority"
    ],
    evidenceLedgerSeparation: [
      "engineering_evidence",
      "browser_and_runtime_evidence",
      "content_truth",
      "expert_truth",
      "rights_and_legal_judgment",
      "release_readiness",
      "public_release_authorization"
    ],
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      inputRequirementsDefined: 13,
      inputRequirementsResolved: 0,
      releaseEvidenceComplete: false,
      requirementsUniverseClosed: false,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7
    },
    inputKernelObservation,
    integrityBoundary: {
      candidateDigestAlgorithm: "sha256",
      candidateDigestDomain: DIGEST_DOMAIN,
      candidateDigestExcludesOwnField: true,
      candidateDigestIsDigitalSignature: false,
      crossFileAtomicSnapshot: false,
      rawIdentitiesAreSignatures: false,
      semanticDigestsAreAuthorityReceipts: false
    },
    mutationEpochExperimentObservation,
    observationBoundary: {
      abaExcludedForFormalProduct: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      parentAndChildrenAtomicSnapshot: false,
      pointInTimeOnly: true,
      sameBufferHashAndParsePerBoundFile: true
    },
    productBoundary: {
      formalProductSurface: "absent",
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      targetSchema: null
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      expertClaimsAuthorized: false,
      inheritedByVedicProductIdentity: false,
      migrationId: null,
      projectContextOnly: true,
      publicDeploymentAuthorized: false,
      targetSchema: 13
    },
    recordType: RECORD_TYPE,
    schemaVersion: "1.2.0",
    status: STATUS,
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productType: "research_boundary_only"
    },
    versionBoundary: {
      centralRegistryModifiedByThisChild: false,
      downstreamRegistryModifiedByThisChild: false,
      formalParentModifiedByThisChild: false,
      kernelVerifierModifiedByThisChild: false,
      overwritesPriorArtifact: false,
      ownerPromotionDecisionReceipt: null,
      priorArtifactPath: ARTIFACT_PATHS.priorObservation,
      priorArtifactPreserved: true,
      priorCandidateDigest:
        EXPECTED_SEMANTIC_IDENTITIES.priorObservation.semanticDigest,
      supersedesPriorArtifact: false
    }
  };
  const candidate = {
    ...unsigned,
    candidateDigest: domainDigest(DIGEST_DOMAIN, unsigned)
  };
  return verifyVedicProductizationVersionAwareObservationChildV12Object(candidate);
}

export async function readCurrentVedicProductizationVersionAwareObservationChildV12(
  workspaceRoot = process.cwd()
) {
  const expected =
    await buildCurrentVedicProductizationVersionAwareObservationChildV12(
      workspaceRoot
    );
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_2_RELATIVE_PATH,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "CANDIDATE_ENDPOINT_INVALID",
      missingCode: "CANDIDATE_MISSING",
      label: "Vedic v1.2 observation child"
    }
  );
  const persisted =
    parseVedicProductizationVersionAwareObservationChildV12JsonBytes(
      snapshot.bytes
    );
  if (decodeStrictUtf8(snapshot.bytes, "Vedic v1.2 observation child")
    !== canonicalPrettyStringifyVedicProductizationVersionAwareObservationChildV12(
      persisted
    )) {
    fail("CANDIDATE_MATERIALIZATION_MISMATCH", "v1.2 artifact 不是唯一 canonical LF materialization。" );
  }
  const verified =
    verifyVedicProductizationVersionAwareObservationChildV12Object(persisted);
  if (!exactJson(verified, expected)) {
    fail("CURRENT_OBSERVATION_MISMATCH", "persisted v1.2 artifact 与当前允许投影不一致。" );
  }
  if (EXPECTED_PERSISTED.rawBytes !== 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || verified.candidateDigest !== EXPECTED_PERSISTED.candidateDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "persisted v1.2 artifact identity 漂移。" );
  }
  return verified;
}

export function isVerifiedVedicProductizationVersionAwareObservationChildV12(
  value
) {
  return value !== null
    && typeof value === "object"
    && VERIFIED_RESULTS.has(value)
    && Object.isFrozen(value);
}

export const vedicProductizationVersionAwareObservationChildV12TestOnly =
  Object.freeze({
    ARTIFACT_PATHS,
    CANDIDATE_ID,
    CREATED_AT,
    DIGEST_DOMAIN,
    DOWNSTREAM_REGISTRY_PATH,
    EXPECTED_PERSISTED,
    EXPECTED_SEMANTIC_IDENTITIES,
    KERNEL_PACKAGE_DIRECTORY,
    KERNEL_PACKAGE_FILES,
    KERNEL_VERIFIER_PATH,
    MAX_CANDIDATE_BYTES,
    MUTATION_PACKAGE_DIRECTORY,
    MUTATION_PACKAGE_FILES,
    RECORD_TYPE,
    STATUS,
    canonicalStringify,
    exactJson,
    readStableWorkspaceFile
  });
