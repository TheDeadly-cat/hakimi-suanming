import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyZiweiHkoPublicEndpointObservation } from "./ziwei-hko-calendar-public-endpoint-observation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await verifyZiweiHkoPublicEndpointObservation(workspaceRoot);
  process.stdout.write(`${JSON.stringify({
    offlineObservationArtifactMechanicallyVerified: true,
    observationId: result.observation.observationId,
    observationArtifact: result.artifact,
    sourceCandidateArtifact: result.sourceCandidateArtifact,
    operatorRecordedExactResourceBodyMatches: result.operatorRecordedExactResourceBodyMatches,
    preExistingCandidateAnnualRawBodiesStored: result.preExistingCandidateAnnualRawBodiesStored,
    automaticDecompressionClaimedByOperator: result.automaticDecompressionClaimedByOperator,
    automaticDecompressionMechanicallyVerified: result.automaticDecompressionMechanicallyVerified,
    contentEncodingCaptured: result.contentEncodingCaptured,
    httpClientDeliveredBodyHashOperatorRecorded: result.httpClientDeliveredBodyHashOperatorRecorded,
    captureExecutionReceiptStored: result.captureExecutionReceiptStored,
    remoteCaptureMechanicallyVerified: result.remoteCaptureMechanicallyVerified,
    requestedToFinalUrlBindingEstablished: result.requestedToFinalUrlBindingEstablished,
    termsApplicabilityConflictOrAmbiguityObserved:
      result.termsApplicabilityConflictOrAmbiguityObserved,
    rightsLegalConclusion: result.rightsLegalConclusion,
    preExistingCandidateRawBodiesStorageRightsEstablished:
      result.preExistingCandidateRawBodiesStorageRightsEstablished,
    formalSourceRightsRecordsCreated: result.formalSourceRightsRecordsCreated,
    formalSourceCarrierRecordsCreated: result.formalSourceCarrierRecordsCreated,
    independentRightsReviewsVerified: result.independentRightsReviewsVerified,
    bindingFrozenVerified: result.bindingFrozenVerified,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    observationDigest: result.observationDigest
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error
    ? reason.message
    : "Ziwei HKO public endpoint observation 验证失败。"}\n`);
  process.exitCode = 1;
}
