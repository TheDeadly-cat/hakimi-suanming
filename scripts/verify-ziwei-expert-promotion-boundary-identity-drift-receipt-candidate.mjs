#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError,
  isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate
} from "./ziwei-expert-promotion-boundary-identity-drift-receipt-candidate-lib.mjs";

const OK_PREFIX =
  "ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK";
const FAILED_PREFIX =
  "ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED";

function hasVisiblePreloadArgument() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (argument === "-r"
      || argument === "--require"
      || argument.startsWith("--require=")
      || argument === "--import"
      || argument.startsWith("--import=")
      || argument === "--loader"
      || argument.startsWith("--loader=")
      || argument === "--experimental-loader"
      || argument.startsWith("--experimental-loader=")) return true;
  }
  return false;
}

export async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  if ((process.env.NODE_OPTIONS ?? "").trim() !== "" || hasVisiblePreloadArgument()) {
    process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
    return 1;
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const receipt =
      await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(workspaceRoot);
    if (!isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(receipt)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_CANDIDATE_BRAND_MISSING\n`);
      return 1;
    }
    const summary = {
      ziweiExpertPromotionBoundaryIdentityDriftReceiptCandidateMechanicallyVerified: true,
      candidateId: receipt.candidateId,
      receiptDigest: receipt.receiptDigest,
      candidateOnly: true,
      activeAdmissionEffect: receipt.activeAdmissionEffect,
      sourceIdentityDriftEstablished:
        receipt.observationBoundary.engineeringIdentityDriftEstablished,
      oneSourceIdentityFansOutToFiveComponentDigests:
        receipt.manifestDrift.oneSourceIdentityFansOutToFiveComponentDigests,
      fiveIndependentSemanticChangesClaimed:
        receipt.manifestDrift.fiveIndependentSemanticChangesClaimed,
      uniqueBlockerClaimed: receipt.manifestDrift.uniqueBlockerClaimed,
      historicalManifestMechanicallyCurrent:
        receipt.manifestDrift.historicalManifestMechanicallyCurrent,
      currentCandidateManifestPersisted:
        receipt.manifestDrift.currentCandidateManifestPersisted,
      historicalBrowserChildMechanicallyCurrent:
        receipt.browserObservationDrift.historicalChildMechanicallyCurrent,
      browserFailureClass: receipt.browserObservationDrift.failureClass,
      browserRerunPerformedByThisReceipt:
        receipt.browserObservationDrift.browserRerunPerformedByThisReceipt,
      currentBrowserRuntimeEvidenceEstablished:
        receipt.browserObservationDrift.currentBrowserRuntimeEvidenceEstablished,
      bindingFrozenVerified: receipt.gateSummary.bindingFrozenVerified,
      bindingRequired: receipt.gateSummary.bindingRequired,
      independentExpertReviewsVerified:
        receipt.gateSummary.independentExpertReviewsVerified,
      independentExpertsRequired: receipt.gateSummary.independentExpertsRequired,
      externalVerifiedExpertReceiptsVerified:
        receipt.gateSummary.externalVerifiedExpertReceiptsVerified,
      externalVerifiedExpertReceiptsRequired:
        receipt.gateSummary.externalVerifiedExpertReceiptsRequired,
      localReviewerIdsEstablishRealIdentityQualificationOrIndependence:
        receipt.scope.expertPromotionBoundary
          .localReviewerIdsEstablishRealIdentityQualificationOrIndependence,
      projectDefaultReleaseIdentity:
        receipt.releaseGovernance.projectDefaultContext.releaseIdentity,
      projectDefaultTargetSchema:
        receipt.releaseGovernance.projectDefaultContext.targetSchema,
      projectDefaultMigrationId:
        receipt.releaseGovernance.projectDefaultContext.migrationId,
      inheritedByZiweiProductIdentity:
        receipt.releaseGovernance.projectDefaultContext.inheritedByZiweiProductIdentity,
      crossFileAtomicSnapshot: receipt.observationBoundary.crossFileAtomicSnapshot,
      mutationEpochReceipt: receipt.observationBoundary.mutationEpochReceipt,
      abaExcluded: receipt.observationBoundary.abaExcluded,
      expertClaimsAuthorized: receipt.authorityBoundary.expertClaimsAuthorized,
      releaseReady: receipt.authorityBoundary.releaseReady,
      publicDeploymentAuthorized:
        receipt.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: receipt.authorityBoundary.publicReleaseAuthorized
    };
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    const code = error
      instanceof ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) process.exitCode = await main();
