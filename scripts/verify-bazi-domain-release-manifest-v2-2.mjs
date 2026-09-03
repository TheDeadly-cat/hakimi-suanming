import path from "node:path";
import { fileURLToPath } from "node:url";

const PROCESS_ARGV = process.argv;
const PROCESS_EXEC_ARGV = process.execArgv;
const PROCESS_ENV = process.env;
const PROCESS_STDOUT_WRITE = process.stdout.write;
const PROCESS_STDERR_WRITE = process.stderr.write;
const JSON_STRINGIFY = JSON.stringify;
const REFLECT_APPLY = Reflect.apply;

const OK_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_OBSERVATION_OK";
const FAILED_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_FAILED";
const cliPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(cliPath), "..");
const isDirectEntry = typeof PROCESS_ARGV[1] === "string" && path.resolve(PROCESS_ARGV[1]) === cliPath;

function writeFailure(code) {
  REFLECT_APPLY(PROCESS_STDERR_WRITE, process.stderr, [`${FAILED_PREFIX} ${code}\n`]);
  process.exitCode = 1;
}

function safeCode(error) {
  const candidate = typeof error?.code === "string" ? error.code : "";
  const allowed = [
    "READINESS_V19_BRAND_REQUIRED",
    "READINESS_V19_BOUNDARY_MISMATCH",
    "HISTORICAL_RAW_IDENTITY_MISMATCH",
    "HISTORICAL_SEMANTIC_IDENTITY_MISMATCH",
    "COMPONENT_FILE_IDENTITY_CONFLICT",
    "COMPONENT_FILE_IDENTITY_DRIFT",
    "PERSISTED_IDENTITY_UNPINNED",
    "PERSISTED_RAW_IDENTITY_MISMATCH",
    "PERSISTED_DIGEST_MISMATCH",
    "MANIFEST_DIGEST_INVALID",
    "MANIFEST_MISMATCH",
    "SUMMARY_RED_GATE_MISMATCH"
  ];
  for (let index = 0; index < allowed.length; index += 1) {
    if (candidate === allowed[index]) return candidate;
  }
  return "VERIFICATION_FAILED";
}

function mismatch() {
  const error = new Error("summary red gate mismatch");
  error.code = "SUMMARY_RED_GATE_MISMATCH";
  throw error;
}

function expectedSummary(summary) {
  const exact = (actual, expected) => {
    if (actual !== expected) mismatch();
  };
  exact(summary.baziV17MachineIdentityManifestV22MechanicallyVerified, true);
  exact(summary.manifestId, "hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0");
  exact(summary.manifestDigest, "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e");
  exact(summary.artifact?.path, "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json");
  exact(summary.artifact?.bytes, 23399);
  exact(summary.artifact?.sha256, "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d");
  exact(summary.directCurrentPrivateBrandCount, 1);
  exact(summary.historicalRawSemanticContextsVerified, 3);
  exact(summary.bindingReadinessV19MechanicallyVerified, true);
  exact(summary.predecessorManifestV21BrandCurrent, false);
  exact(summary.sourceCarrierReadinessV11BrandCurrent, false);
  exact(summary.privacyFormalIntakeReconciliationBrandCurrent, false);
  exact(summary.historicalRecursiveFullLoadersCurrent, false);
  exact(summary.historicalRecursiveFullLoaderFailureCode, "BOUND_READINESS_BASIS_DRIFT");
  exact(summary.productionBundledKnowledgeManifestMetadataContractPinned, true);
  exact(summary.webBundledKnowledgeAuditImplementationPinned, true);
  exact(summary.productionWebConsumerClosureEstablished, false);
  exact(summary.productionWebCallSitePinned, false);
  exact(summary.productionBodyInventoryAndBytesAudited, false);
  exact(summary.currentBuildGateExecuted, false);
  exact(summary.stageCMaterialAdmissionCandidateActiveSurfaceIncluded, false);
  exact(summary.bindingRequired, 12);
  exact(summary.bindingFrozenVerified, 0);
  exact(summary.formalKnowledgeDocuments, 0);
  exact(summary.formalSourceRightsRecords, 0);
  exact(summary.formalSourceCarrierRecords, 0);
  exact(summary.independentExpertsRequired, 2);
  exact(summary.reviewerSlotsOccupied, 0);
  exact(summary.independentExpertReviewsVerified, 0);
  exact(summary.sealedOriginalOpinions, 0);
  exact(summary.candidateProjectedArtifactLockExactMatches, 11);
  exact(summary.candidateProjectedArtifactLockDrifts, 1);
  exact(summary.packetArtifactLocksCurrent, false);
  exact(summary.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  exact(summary.currentOpaqueContextInstances, 0);
  exact(summary.persistedRealPersonInstancesAllowed, false);
  exact(summary.collectionAuthorized, false);
  exact(summary.personDataPresenceAssessed, false);
  exact(summary.personDerivedDigestExcluded, false);
  exact(summary.safeToPublish, false);
  exact(summary.contentTruthEstablished, false);
  exact(summary.expertTruthEstablished, false);
  exact(summary.rightsLegalConclusionEstablished, false);
  exact(summary.releaseReady, false);
  exact(summary.publicDeploymentAuthorized, false);
  exact(summary.expertClaimsAuthorized, false);
  exact(summary.activeAdmissionEffect, "none");
  exact(summary.releaseIdentity, "legacy-v13");
  exact(summary.targetSchema, 13);
  exact(summary.migrationId, null);
  exact(summary.crossFileAtomicSnapshot, false);
  exact(summary.mutationEpochAvailableForSchema13, false);
  exact(summary.mutationEpochReceipt, null);
  exact(summary.intervalMutationExcludedAcrossFiles, false);
  exact(summary.abaExcluded, false);
  exact(summary.replayExcluded, false);
  exact(summary.hiddenPreloadExcluded, false);
  exact(summary.nodeRuntimeIdentityEstablished, false);
  exact(summary.loaderIdentityEstablished, false);
  exact(summary.runtimeLauncherIdentityEstablished, false);
  exact(summary.cliOutputTrustedAttestation, false);
  exact(summary.visibleLoaderGuardIsSecurityBoundary, false);
  exact(summary.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution, true);
  exact(summary.centralSystemAdmissionRegistryIntegrated, false);
  exact(summary.crossSystemEngineeringReceiptRegistryIntegrated, false);
}

function visibleLoaderInjectionPresent() {
  for (let index = 0; index < PROCESS_EXEC_ARGV.length; index += 1) {
    const argument = PROCESS_EXEC_ARGV[index];
    if (typeof argument === "string"
      && /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)) return true;
  }
  return false;
}

if (isDirectEntry) {
  if (PROCESS_ARGV.length !== 2 || PROCESS_ENV.NODE_OPTIONS || visibleLoaderInjectionPresent()) {
    writeFailure("CLI_INVOCATION_REJECTED");
  } else {
    try {
      const module = await import("./bazi-domain-release-manifest-v2-2-lib.mjs");
      const result = await module.loadBaziDomainReleaseManifestV22(workspaceRoot);
      if (!module.isVerifiedBaziDomainReleaseManifestV22(result)) {
        const error = new Error("private result brand missing");
        error.code = "MANIFEST_V22_BRAND_REQUIRED";
        throw error;
      }
      const summary = module.getBaziDomainReleaseManifestV22Summary(result);
      expectedSummary(summary);
      const output = {
        mechanicalObservationVerified: true,
        manifest: {
          id: summary.manifestId,
          digest: summary.manifestDigest,
          artifact: summary.artifact
        },
        contextAccounting: {
          directCurrentPrivateBrands: summary.directCurrentPrivateBrandCount,
          historicalRawSemanticContexts: summary.historicalRawSemanticContextsVerified,
          historicalRecursiveFullLoadersCurrent: summary.historicalRecursiveFullLoadersCurrent,
          historicalRecursiveFullLoaderFailureCode: summary.historicalRecursiveFullLoaderFailureCode
        },
        productionBoundary: {
          manifestMetadataContractPinned: summary.productionBundledKnowledgeManifestMetadataContractPinned,
          webAuditImplementationPinned: summary.webBundledKnowledgeAuditImplementationPinned,
          webConsumerClosureEstablished: summary.productionWebConsumerClosureEstablished,
          webCallSitePinned: summary.productionWebCallSitePinned,
          bodyInventoryAndBytesAudited: summary.productionBodyInventoryAndBytesAudited,
          currentBuildGateExecuted: summary.currentBuildGateExecuted,
          stageCCandidateActiveSurfaceIncluded: summary.stageCMaterialAdmissionCandidateActiveSurfaceIncluded
        },
        redGates: {
          binding: `${summary.bindingFrozenVerified}/${summary.bindingRequired}`,
          experts: `${summary.independentExpertReviewsVerified}/${summary.independentExpertsRequired}`,
          formalKnowledgeDocuments: summary.formalKnowledgeDocuments,
          formalSourceRightsRecords: summary.formalSourceRightsRecords,
          formalSourceCarrierRecords: summary.formalSourceCarrierRecords,
          activeAdmissionEffect: summary.activeAdmissionEffect,
          contentTruthEstablished: summary.contentTruthEstablished,
          expertTruthEstablished: summary.expertTruthEstablished,
          rightsLegalConclusionEstablished: summary.rightsLegalConclusionEstablished,
          releaseReady: summary.releaseReady,
          publicDeploymentAuthorized: summary.publicDeploymentAuthorized,
          expertClaimsAuthorized: summary.expertClaimsAuthorized
        },
        governance: {
          releaseIdentity: summary.releaseIdentity,
          targetSchema: summary.targetSchema,
          migrationId: summary.migrationId
        },
        snapshotBoundary: {
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
