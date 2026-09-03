import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  process.stdout.write(
    `DTT_VERSION_AWARE_CANDIDATE_READINESS_MECHANICS_OK ${JSON.stringify({
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      activeAdmissionEffect: result.activeAdmissionEffect,
      candidateNoticeProjectionReconciliationsResolved:
        result.candidateNoticeProjectionReconciliationsResolved,
      activeNoticeDiscrepancyPromotionBlocks: result.activeNoticeDiscrepancyPromotionBlocks,
      candidateNoticeProjectionDiscrepancyPromotionBlocks:
        result.candidateNoticeProjectionDiscrepancyPromotionBlocks,
      formalAdmissionPromotionBlocked: result.formalAdmissionPromotionBlocked,
      bindingFrozenVerified: result.bindingFrozenVerified,
      bindingRequired: result.bindingRequired,
      distributionPolicy: result.distributionPolicy,
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
