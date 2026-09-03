#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  BaziDttMonthCommandPublicEvidenceError,
  loadBaziDttMonthCommandPublicEvidence
} from "./bazi-dtt-month-command-public-evidence-lib.mjs";

export async function runBaziDttMonthCommandPublicEvidenceVerification(
  workspaceRoot = process.cwd()
) {
  return loadBaziDttMonthCommandPublicEvidence(workspaceRoot);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const result = await runBaziDttMonthCommandPublicEvidenceVerification();
    process.stdout.write(`${JSON.stringify({
      offlineCheckedInObservationContractMechanicallyVerified:
        result.offlineCheckedInObservationContractMechanicallyVerified,
      activeLine: result.activeLine,
      targetSchema: result.targetSchema,
      migrationId: result.migrationId,
      distinctCarrierByteIdentityCount: result.distinctCarrierByteIdentityCount,
      commonsUpstreamGroupCount: result.commonsUpstreamGroupCount,
      sharedUploaderIdentityVerified: result.sharedUploaderIdentityVerified,
      independentEditionWitnessCount: result.independentEditionWitnessCount,
      independentRightsSourceCount: result.independentRightsSourceCount,
      mediaInfoCountsAsIndependentRightsSource: result.mediaInfoCountsAsIndependentRightsSource,
      twoCarriersCountAsTwoIndependentEditions: result.twoCarriersCountAsTwoIndependentEditions,
      twoCarriersCountAsTwoIndependentLegalOpinions:
        result.twoCarriersCountAsTwoIndependentLegalOpinions,
      oldidMainSlotPdOldLiteralObserved: result.oldidMainSlotPdOldLiteralObserved,
      renderedPagePdOldDependencyObserved: result.renderedPagePdOldDependencyObserved,
      dependencyRevisionsPinnedAtCapture: result.dependencyRevisionsPinnedAtCapture,
      oldidAlonePinsRenderedNotice: result.oldidAlonePinsRenderedNotice,
      noticeDiscrepancyResolved: result.noticeDiscrepancyResolved,
      noticeDiscrepancyPromotionBlocked: result.noticeDiscrepancyPromotionBlocked,
      remoteCaptureMechanicallyVerifiedByOfflineVerifier:
        result.remoteCaptureMechanicallyVerifiedByOfflineVerifier,
      networkProvenanceEstablished: result.networkProvenanceEstablished,
      publisherAuthenticityEstablished: result.publisherAuthenticityEstablished,
      redirectChainCaptured: result.redirectChainCaptured,
      wireBytesCaptured: result.wireBytesCaptured,
      tlsPeerCertificateCaptured: result.tlsPeerCertificateCaptured,
      futureFreshnessEstablished: result.futureFreshnessEstablished,
      sameEditionRelationshipIndependentlyEstablished:
        result.sameEditionRelationshipIndependentlyEstablished,
      pageNamespaceAbsenceIsPointInTimeOnly: result.pageNamespaceAbsenceIsPointInTimeOnly,
      selectedPageNamespaceRevisionCount: result.selectedPageNamespaceRevisionCount,
      versionIdentityEstablished: result.versionIdentityEstablished,
      transcriptionIdentityEstablished: result.transcriptionIdentityEstablished,
      exactGlyphCollationEstablished: result.exactGlyphCollationEstablished,
      humanCollationEstablished: result.humanCollationEstablished,
      sourceBodyFrozen: result.sourceBodyFrozen,
      exactQuoteVerifiedForFreeze: result.exactQuoteVerifiedForFreeze,
      workIdentityEstablished: result.workIdentityEstablished,
      editionIdentityEstablished: result.editionIdentityEstablished,
      carrierIdentityEstablished: result.carrierIdentityEstablished,
      rightsEvidenceComplete: result.rightsEvidenceComplete,
      bindingFrozen: result.bindingFrozen,
      bindingFrozenVerified: result.bindingFrozenVerified,
      bindingRequired: result.bindingRequired,
      formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
      formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
      knowledgeDocumentCount: result.knowledgeDocumentCount,
      redistributableSourceCount: result.redistributableSourceCount,
      workLayerCleared: result.workLayerCleared,
      editionLayerCleared: result.editionLayerCleared,
      transcriptionLayerCleared: result.transcriptionLayerCleared,
      carrierLayerCleared: result.carrierLayerCleared,
      applicableTermsResolved: result.applicableTermsResolved,
      publicDomainMarkCountsAsLicense: result.publicDomainMarkCountsAsLicense,
      markerAuthorityAndAccuracyVerified: result.markerAuthorityAndAccuracyVerified,
      humanLegalReviewerCount: result.humanLegalReviewerCount,
      candidateSpecificLegalApplicationEstablished:
        result.candidateSpecificLegalApplicationEstablished,
      legalConclusion: result.legalConclusion,
      redistributionAuthorized: result.redistributionAuthorized,
      publicRepositoryBodyInclusionAuthorized: result.publicRepositoryBodyInclusionAuthorized,
      publicBuildInclusionAuthorized: result.publicBuildInclusionAuthorized,
      contentTruthEstablished: result.contentTruthEstablished,
      baziRuleTruthEstablished: result.baziRuleTruthEstablished,
      sourceBundleComplete: result.sourceBundleComplete,
      rightsBundleComplete: result.rightsBundleComplete,
      expertReviewBundleComplete: result.expertReviewBundleComplete,
      independentExpertReviewsVerified: result.independentExpertReviewsVerified,
      independentExpertReviewsRequired: result.independentExpertReviewsRequired,
      expertTruthEstablished: result.expertTruthEstablished,
      fullRepositoryTypecheckPassed: result.fullRepositoryTypecheckPassed,
      defaultWebBuildPassed: result.defaultWebBuildPassed,
      browserOrPwaAcceptancePassed: result.browserOrPwaAcceptancePassed,
      releaseEvidenceComplete: result.releaseEvidenceComplete,
      deploymentAndRollbackConfirmed: result.deploymentAndRollbackConfirmed,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
      mutationEpochAvailable: result.mutationEpochAvailable,
      intervalMutationExcluded: result.intervalMutationExcluded,
      abaExcluded: result.abaExcluded
    })}\n`);
  } catch (error) {
    const code = error instanceof BaziDttMonthCommandPublicEvidenceError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${JSON.stringify({
      offlineCheckedInObservationContractMechanicallyVerified: false,
      code
    })}\n`);
    process.exitCode = 1;
  }
}
