import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
  BaziDttNoticeReconciliationError,
  loadBaziDttNoticeReconciliation
} from "./bazi-dtt-notice-reconciliation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await loadBaziDttNoticeReconciliation(workspaceRoot);
  process.stdout.write(`${JSON.stringify({
    offlineDttNoticeReconciliationOverlayMechanicallyVerified:
      result.offlineDttNoticeReconciliationOverlayMechanicallyVerified,
    artifact: BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
    rawBytes: result.artifact.rawBytes,
    rawSha256: result.artifact.rawSha256,
    reconciliationId: result.reconciliationId,
    reconciliationDigest: result.reconciliationDigest,
    bindingId: result.bindingId,
    resolved: result.resolved,
    promotionBlocked: result.promotionBlocked,
    distributionPolicy: result.distributionPolicy,
    formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
    formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
    bindingFrozenVerified: result.bindingFrozenVerified,
    contentTruthEstablished: result.contentTruthEstablished,
    expertTruthEstablished: result.expertTruthEstablished,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
    mutationEpochAvailable: result.mutationEpochAvailable,
    intervalMutationExcluded: result.intervalMutationExcluded,
    abaExcluded: result.abaExcluded
  })}\n`);
} catch (cause) {
  const code = cause instanceof BaziDttNoticeReconciliationError
    ? cause.code
    : "UNEXPECTED_FAILURE";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
