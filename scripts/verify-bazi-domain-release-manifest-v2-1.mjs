#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const JSON_STRINGIFY = JSON.stringify;
const PROCESS_ARGV = process.argv;
const PROCESS_EXEC_ARGV = process.execArgv;
const PROCESS_STDOUT_WRITE = process.stdout.write;
const PROCESS_STDERR_WRITE = process.stderr.write;

const OK_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_OBSERVATION_OK";
const FAILED_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_FAILED";
const cliPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(cliPath), "..");
const isDirectEntry = typeof PROCESS_ARGV[1] === "string" && path.resolve(PROCESS_ARGV[1]) === cliPath;

const EXPECTED_SUMMARY = {
  baziV17MachineIdentityManifestV21MechanicallyVerified: true,
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.1.0",
  manifestDigest: "f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2",
  artifact: {
    bytes: 19064,
    path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.1.0.json",
    sha256: "68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413"
  },
  directParentPrivateBrandCount: 3,
  sourceCarrierReadinessSuccessorCreated: true,
  privacyFormalIntakeReconciliationMechanicallyVerified: true,
  bindingRequired: 12,
  bindingFrozenVerified: 0,
  formalKnowledgeDocuments: 0,
  formalSourceRightsRecords: 0,
  formalSourceCarrierRecords: 0,
  independentExpertsRequired: 2,
  reviewerSlotsOccupied: 0,
  independentExpertReviewsVerified: 0,
  sealedOriginalOpinions: 0,
  candidateProjectedArtifactLockExactMatches: 11,
  candidateProjectedArtifactLockDrifts: 1,
  packetArtifactLocksCurrent: false,
  firstFormalParentFailureCode: "INTAKE_GAP_BINDING_DRIFT",
  currentOpaqueContextInstances: 0,
  persistedRealPersonInstancesAllowed: false,
  collectionAuthorized: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  safeToPublish: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false,
  activeAdmissionEffect: "none",
  releaseIdentity: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false,
  replayExcluded: false,
  hiddenPreloadExcluded: false,
  nodeRuntimeIdentityEstablished: false,
  loaderIdentityEstablished: false,
  runtimeLauncherIdentityEstablished: false,
  cliOutputTrustedAttestation: false,
  visibleLoaderGuardIsSecurityBoundary: false,
  mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
  centralSystemAdmissionRegistryIntegrated: false,
  crossSystemEngineeringReceiptRegistryIntegrated: false
};

function writeFailure(code) {
  REFLECT_APPLY(PROCESS_STDERR_WRITE, process.stderr, [`${FAILED_PREFIX} ${code}\n`]);
  process.exitCode = 1;
}

function safeCode(error) {
  const allowed = [
    "MANIFEST_V2_BRAND_REQUIRED",
    "CARRIER_V11_BRAND_REQUIRED",
    "RECONCILIATION_V1_BRAND_REQUIRED",
    "PARENT_BOUNDARY_MISMATCH",
    "PERSISTED_IDENTITY_UNPINNED",
    "MANIFEST_MISMATCH",
    "SUMMARY_RED_GATE_MISMATCH"
  ];
  const candidate = typeof error?.code === "string" ? error.code : "";
  for (let index = 0; index < allowed.length; index += 1) {
    if (candidate === allowed[index]) return candidate;
  }
  return "VERIFICATION_FAILED";
}

function exactFrozenData(actual, expected) {
  if (actual === null || typeof actual !== "object"
    || REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [actual]) !== OBJECT_PROTOTYPE
    || !REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [actual])) return false;
  const actualKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [actual]);
  const expectedKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [expected]);
  if (actualKeys.length !== expectedKeys.length) return false;
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    if (actualKeys[index] !== key) return false;
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [actual, key]);
    const expectedValue = expected[key];
    if (!descriptor || descriptor.enumerable !== true
      || descriptor.writable !== false || descriptor.configurable !== false) return false;
    if (expectedValue !== null && typeof expectedValue === "object") {
      if (!exactFrozenData(descriptor.value, expectedValue)) return false;
    } else if (descriptor.value !== expectedValue) return false;
  }
  return true;
}

function visibleLoaderInjectionPresent() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") return true;
  for (let index = 0; index < PROCESS_EXEC_ARGV.length; index += 1) {
    const argument = PROCESS_EXEC_ARGV[index];
    if (typeof argument === "string"
      && /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)) return true;
  }
  return false;
}

if (isDirectEntry) {
  if (PROCESS_ARGV.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
  } else if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  } else {
    try {
      const module = await import("./bazi-domain-release-manifest-v2-1-lib.mjs");
      const result = await module.loadBaziDomainReleaseManifestV21(workspaceRoot);
      if (!module.isVerifiedBaziDomainReleaseManifestV21(result)) {
        const error = new Error("unbranded result");
        error.code = "UNBRANDED_RESULT";
        throw error;
      }
      const summary = module.getBaziDomainReleaseManifestV21Summary(result);
      if (!exactFrozenData(summary, EXPECTED_SUMMARY)) {
        const error = new Error("summary red gate mismatch");
        error.code = "SUMMARY_RED_GATE_MISMATCH";
        throw error;
      }
      const output = {
        mechanicalObservationVerified: summary.baziV17MachineIdentityManifestV21MechanicallyVerified,
        manifest: {
          id: summary.manifestId,
          digest: summary.manifestDigest,
          artifact: summary.artifact,
          directParentPrivateBrands: summary.directParentPrivateBrandCount
        },
        successorObservations: {
          sourceCarrierReadinessSuccessorCreated: summary.sourceCarrierReadinessSuccessorCreated,
          privacyFormalIntakeReconciliationMechanicallyVerified:
            summary.privacyFormalIntakeReconciliationMechanicallyVerified
        },
        formalRedGates: {
          binding: `${summary.bindingFrozenVerified}/${summary.bindingRequired}`,
          experts: `${summary.independentExpertReviewsVerified}/${summary.independentExpertsRequired}`,
          reviewerSlotsOccupied: summary.reviewerSlotsOccupied,
          sealedOriginalOpinions: summary.sealedOriginalOpinions,
          formalKnowledgeDocuments: summary.formalKnowledgeDocuments,
          formalSourceRightsRecords: summary.formalSourceRightsRecords,
          formalSourceCarrierRecords: summary.formalSourceCarrierRecords,
          packetArtifactLockExactMatches: summary.candidateProjectedArtifactLockExactMatches,
          packetArtifactLockDrifts: summary.candidateProjectedArtifactLockDrifts,
          packetArtifactLocksCurrent: summary.packetArtifactLocksCurrent,
          firstFailureCode: summary.firstFormalParentFailureCode
        },
        privacyRedGates: {
          currentOpaqueContextInstances: summary.currentOpaqueContextInstances,
          persistedRealPersonInstancesAllowed: summary.persistedRealPersonInstancesAllowed,
          collectionAuthorized: summary.collectionAuthorized,
          personDataPresenceAssessed: summary.personDataPresenceAssessed,
          personDerivedDigestExcluded: summary.personDerivedDigestExcluded,
          safeToPublish: summary.safeToPublish
        },
        authorityRedGates: {
          activeAdmissionEffect: summary.activeAdmissionEffect,
          contentTruthEstablished: summary.contentTruthEstablished,
          expertTruthEstablished: summary.expertTruthEstablished,
          rightsLegalConclusionEstablished: summary.rightsLegalConclusionEstablished,
          releaseReady: summary.releaseReady,
          publicDeploymentAuthorized: summary.publicDeploymentAuthorized,
          expertClaimsAuthorized: summary.expertClaimsAuthorized
        },
        fixedGovernance: {
          activeLine: summary.releaseIdentity,
          targetSchema: summary.targetSchema,
          migrationId: summary.migrationId
        },
        integrityRedGates: {
          crossFileAtomicSnapshot: summary.crossFileAtomicSnapshot,
          mutationEpochAvailableForSchema13: summary.mutationEpochAvailableForSchema13,
          mutationEpochReceipt: summary.mutationEpochReceipt,
          intervalMutationExcludedAcrossFiles: summary.intervalMutationExcludedAcrossFiles,
          abaExcluded: summary.abaExcluded,
          replayExcluded: summary.replayExcluded
        },
        runtimeTrustCalibration: {
          hiddenPreloadExcluded: summary.hiddenPreloadExcluded,
          nodeRuntimeIdentityEstablished: summary.nodeRuntimeIdentityEstablished,
          loaderIdentityEstablished: summary.loaderIdentityEstablished,
          runtimeLauncherIdentityEstablished: summary.runtimeLauncherIdentityEstablished,
          cliOutputTrustedAttestation: summary.cliOutputTrustedAttestation,
          visibleLoaderGuardIsSecurityBoundary: summary.visibleLoaderGuardIsSecurityBoundary,
          mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution:
            summary.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution
        },
        downstreamIntegration: {
          centralSystemAdmissionRegistryIntegrated: summary.centralSystemAdmissionRegistryIntegrated,
          crossSystemEngineeringReceiptRegistryIntegrated:
            summary.crossSystemEngineeringReceiptRegistryIntegrated
        }
      };
      REFLECT_APPLY(PROCESS_STDOUT_WRITE, process.stdout, [
        `${OK_PREFIX} ${REFLECT_APPLY(JSON_STRINGIFY, JSON, [output])}\n`
      ]);
    } catch (error) {
      writeFailure(safeCode(error));
    }
  }
}
