import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBaziEngineeringValueSubjectGapVersionAwareCandidate
} from "./bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  process.stdout.write(
    `BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_OK ${JSON.stringify({
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      activeAdmissionEffect: result.activeAdmissionEffect,
      versionAwareCandidateParentArtifacts: result.versionAwareCandidateParentArtifacts,
      historicalValueSubjectProjectionReusedAfterRawIdentityMatch:
        result.historicalValueSubjectProjectionReusedAfterRawIdentityMatch,
      bindingInventoryChanged: result.bindingInventoryChanged,
      parallelBindingsCreated: result.parallelBindingsCreated,
      currentBindings: result.currentBindings,
      engineeringBindingsScoped: result.engineeringBindingsScoped,
      engineeringValueSubjectsObserved: result.engineeringValueSubjectsObserved,
      valueSubjectsFreezeEligible: result.valueSubjectsFreezeEligible,
      bindingRequired: result.bindingRequired,
      bindingFrozenVerified: result.bindingFrozenVerified,
      distributionPolicy: result.distributionPolicy,
      formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
      formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
      candidateNoticeProjectionReconciliationsResolved:
        result.candidateNoticeProjectionReconciliationsResolved,
      activeNoticeDiscrepancyPromotionBlocks:
        result.activeNoticeDiscrepancyPromotionBlocks,
      candidateNoticeProjectionDiscrepancyPromotionBlocks:
        result.candidateNoticeProjectionDiscrepancyPromotionBlocks,
      formalAdmissionPromotionBlocked: result.formalAdmissionPromotionBlocked,
      formalActivationAllowed: result.formalActivationAllowed,
      contentTruthEstablished: result.contentTruthEstablished,
      expertTruthEstablished: result.expertTruthEstablished,
      rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
      browserRuntimeEvidenceEstablished: result.browserRuntimeEvidenceEstablished,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
      mutationEpochAvailable: result.mutationEpochAvailable,
      mutationEpochReceipt: result.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
      abaExcluded: result.abaExcluded
    })}\n`
  );
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
