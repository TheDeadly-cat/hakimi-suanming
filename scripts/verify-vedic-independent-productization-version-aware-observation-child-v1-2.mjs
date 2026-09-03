import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  readCurrentVedicProductizationVersionAwareObservationChildV12
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";

const WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export async function verifyVedicProductizationVersionAwareObservationChildV12(
  workspaceRoot = WORKSPACE_ROOT
) {
  const candidate =
    await readCurrentVedicProductizationVersionAwareObservationChildV12(
      workspaceRoot
    );
  return Object.freeze({
    activeAdmissionEffect: candidate.activeAdmissionEffect,
    admissionGatesRequired: candidate.gateSummary.admissionGatesRequired,
    admissionGatesSatisfied: candidate.gateSummary.admissionGatesSatisfied,
    bindingFrozenVerified: candidate.gateSummary.bindingFrozenVerified,
    bindingRequired: candidate.gateSummary.bindingRequired,
    candidateDigest: candidate.candidateDigest,
    candidateId: candidate.candidateId,
    contentTruthEstablished: candidate.authorityBoundary.contentTruthEstablished,
    expertClaimsAuthorized: candidate.authorityBoundary.expertClaimsAuthorized,
    expertTruthEstablished: candidate.authorityBoundary.expertTruthEstablished,
    formalAdmissionAuthorized: candidate.authorityBoundary.formalAdmissionAuthorized,
    independentExpertReviewsVerified:
      candidate.gateSummary.independentExpertReviewsVerified,
    independentExpertsRequired: candidate.gateSummary.independentExpertsRequired,
    inputKernelMechanicallyObserved:
      candidate.inputKernelObservation.kernelDraftMechanicallyObserved,
    inputKernelFormalParentIntegrated:
      candidate.inputKernelObservation.formalParentIntegrated,
    mutationExperimentProductGateSatisfied:
      candidate.mutationEpochExperimentObservation.productMutationGateSatisfied,
    mutationExperimentTestsExecutedByThisObservation:
      candidate.mutationEpochExperimentObservation.testsExecutedByThisObservation,
    observationClass: "version_aware_non_atomic_engineering_child",
    priorArtifactPreserved: candidate.versionBoundary.priorArtifactPreserved,
    publicDeploymentAuthorized:
      candidate.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: candidate.authorityBoundary.publicReleaseAuthorized,
    releaseEvidenceComplete: candidate.authorityBoundary.releaseEvidenceComplete,
    releaseReady: candidate.authorityBoundary.releaseReady,
    rightsLegalConclusionEstablished:
      candidate.authorityBoundary.rightsLegalConclusionEstablished
  });
}

const isCli = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  if (process.argv.length !== 2) {
    process.stderr.write(`${JSON.stringify({
      errorCode: "CLI_ARGUMENTS_FORBIDDEN",
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    })}\n`);
    process.exitCode = 2;
  } else {
    try {
      const report =
        await verifyVedicProductizationVersionAwareObservationChildV12(
          WORKSPACE_ROOT
        );
      process.stdout.write(`${JSON.stringify(report)}\n`);
    } catch (cause) {
      process.stderr.write(`${JSON.stringify({
        errorCode: typeof cause?.code === "string"
          ? cause.code
          : "UNEXPECTED_ERROR",
        formalAdmissionAuthorized: false,
        message: cause instanceof Error ? cause.message : "Unexpected verifier failure.",
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        releaseReady: false
      })}\n`);
      process.exitCode = 1;
    }
  }
}
