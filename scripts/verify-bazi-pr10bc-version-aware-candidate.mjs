import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBaziPr10bcVersionAwareCandidate
} from "./bazi-pr10bc-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  process.stdout.write(
    `BAZI_PR10BC_VERSION_AWARE_CANDIDATE_MECHANICS_OK ${JSON.stringify({
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      activeAdmissionEffect: result.activeAdmissionEffect,
      scopeProjectionsReproduced: result.scopeProjectionsReproduced,
      dttAdjacentCandidateReferenceRebinds: result.dttAdjacentCandidateReferenceRebinds,
      uniqueSupersedingSourceCandidateParents: result.uniqueSupersedingSourceCandidateParents,
      parallelBindingsCreated: result.parallelBindingsCreated,
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
