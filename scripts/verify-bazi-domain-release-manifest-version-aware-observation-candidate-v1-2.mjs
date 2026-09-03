import { fileURLToPath } from "node:url";

const OK_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_MECHANICS_OK";
const FAIL_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_MECHANICS_FAILED";

function cliFail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function rejectInvocationInjection() {
  if (process.argv.length !== 2) cliFail("CLI_ARGUMENTS_FORBIDDEN");
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS.trim() !== "") {
    cliFail("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  }
  const forbidden = [
    "--require",
    "-r",
    "--import",
    "--loader",
    "--experimental-loader"
  ];
  for (const argument of process.execArgv) {
    if (forbidden.some((prefix) => argument === prefix || argument.startsWith(prefix + "="))) {
      cliFail("NODE_EXEC_LOADER_OPTIONS_FORBIDDEN");
    }
  }
}

async function main() {
  rejectInvocationInjection();
  const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
  const {
    isVerifiedBaziDomainReleaseManifestObservationCandidateV12,
    loadBaziDomainReleaseManifestObservationCandidateV12
  } = await import("./bazi-domain-release-manifest-version-aware-observation-candidate-v1-2-lib.mjs");
  const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(workspaceRoot);
  if (!isVerifiedBaziDomainReleaseManifestObservationCandidateV12(verified)) {
    cliFail("PRIVATE_BRAND_REQUIRED");
  }
  const candidate = verified.candidate;
  const output = {
    candidateId: verified.candidateId,
    candidateDigest: verified.candidateDigest,
    artifact: verified.artifact,
    releaseGovernance: candidate.releaseGovernance,
    savedManifestAccounting: {
      savedManifestCurrent: candidate.savedManifestObservation.savedManifestCurrent,
      formalVerifierReplayPerformed:
        candidate.savedManifestObservation.formalVerifierReplayPerformed,
      formalVerifierOutputCaptured:
        candidate.savedManifestObservation.formalVerifierOutputCaptured,
      observedBlockingRelationships:
        candidate.savedManifestObservation.observedBlockingRelationships
    },
    currentPreviewAccounting: {
      authoritative: candidate.currentPreviewObservation.authoritative,
      persistedAsDomainManifest: candidate.currentPreviewObservation.persistedAsDomainManifest,
      nonAuthoritativeCurrentExpectedPreviewDigest:
        candidate.currentPreviewObservation.nonAuthoritativeCurrentExpectedPreviewDigest,
      componentsObserved: candidate.currentPreviewObservation.componentsObserved,
      unchangedComponentsObserved: candidate.currentPreviewObservation.unchangedComponentsObserved,
      changedComponentsObserved: candidate.currentPreviewObservation.changedComponentsObserved,
      componentFileDriftEntryCount:
        candidate.currentPreviewObservation.componentFileDriftEntryCount,
      uniqueDriftPathCount: candidate.currentPreviewObservation.uniqueDriftPathCount,
      frozenGoldenSha256: candidate.currentPreviewObservation.frozenGoldenSha256,
      frozenGoldenMatchesCurrentBytes:
        candidate.currentPreviewObservation.frozenGoldenMatchesCurrentBytes
    },
    contextAccounting: {
      verifiedDirectMechanicalContextBrandCount:
        candidate.contextBrandBoundary.verifiedDirectMechanicalContextBrandCount,
      verifiedTransitiveMechanicalContextBrandCount:
        candidate.contextBrandBoundary.verifiedTransitiveMechanicalContextBrandCount,
      verifiedMechanicalContextBrandResultCount:
        candidate.contextBrandBoundary.verifiedMechanicalContextBrandResultCount,
      staleObservedContextCount: candidate.contextBrandBoundary.staleObservedContextCount,
      verifiedReleaseParentBrandCount:
        candidate.contextBrandBoundary.verifiedReleaseParentBrandCount,
      authorityInherited: candidate.contextBrandBoundary.authorityInherited,
      activeAdmissionEffect: candidate.contextBrandBoundary.activeAdmissionEffect,
      staleContextFailureCodes:
        candidate.contextBrandBoundary.staleObservedContexts.map(
          (context) => context.loaderFailureCode
        )
    },
    ownerAndGateAccounting: {
      ownerDecisionsRecorded: candidate.ownerDecisionBoundary.ownerDecisionsRecorded,
      bindingFrozenVerified: candidate.gateSummary.bindingFrozenVerified,
      bindingRequired: candidate.gateSummary.bindingRequired,
      independentExpertReviewsVerified:
        candidate.gateSummary.independentExpertReviewsVerified,
      independentExpertsRequired: candidate.gateSummary.independentExpertsRequired,
      admissionAuthorized: candidate.gateSummary.admissionAuthorized,
      releaseReady: candidate.gateSummary.releaseReady
    },
    epochAndAuthorityAccounting: {
      crossFileAtomicSnapshot:
        candidate.currentPreviewObservation.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13:
        candidate.currentPreviewObservation.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: candidate.currentPreviewObservation.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles:
        candidate.currentPreviewObservation.intervalMutationExcludedAcrossFiles,
      abaExcluded: candidate.currentPreviewObservation.abaExcluded,
      contentTruthEstablished: candidate.authorityBoundary.contentTruthEstablished,
      expertTruthEstablished: candidate.authorityBoundary.expertTruthEstablished,
      rightsLegalConclusionEstablished:
        candidate.authorityBoundary.rightsLegalConclusionEstablished,
      browserRuntimeEvidenceEstablished:
        candidate.authorityBoundary.browserRuntimeEvidenceEstablished,
      publicDeploymentAuthorized:
        candidate.authorityBoundary.publicDeploymentAuthorized,
      expertClaimsAuthorized: candidate.authorityBoundary.expertClaimsAuthorized
    }
  };
  process.stdout.write(OK_PREFIX + " " + JSON.stringify(output) + "\n");
}

try {
  await main();
} catch (cause) {
  const code = typeof cause?.code === "string" && /^[A-Z0-9_]{2,80}$/u.test(cause.code)
    ? cause.code
    : "UNEXPECTED_FAILURE";
  process.stderr.write(FAIL_PREFIX + " " + code + "\n");
  process.exitCode = 1;
}
