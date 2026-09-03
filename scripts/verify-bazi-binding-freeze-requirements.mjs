import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readBaziBindingFreezeRequirements,
  verifyBaziBindingFreezeRequirements
} from "./bazi-binding-freeze-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const verified = await verifyBaziBindingFreezeRequirements(workspaceRoot, ledger);
  process.stdout.write(`${JSON.stringify({
    offlineBindingReadinessContractMechanicallyVerified: true,
    ledger: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
    bindingRequired: verified.bindingRequired,
    sourceCandidatesObserved: verified.sourceCandidatesObserved,
    normalizedFacsimileCollationCandidatesObserved:
      ledger.gateSummary.normalizedFacsimileCollationCandidatesObserved,
    exactGlyphFacsimileCorrespondenceCandidatesObserved:
      ledger.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved,
    exactFacsimileCollationsVerified: ledger.gateSummary.exactFacsimileCollationsVerified,
    independentHumanFacsimileCollationsVerified:
      ledger.gateSummary.independentHumanFacsimileCollationsVerified,
    dttNoticeDiscrepancyPromotionBlocked:
      verified.dttNoticeDiscrepancyPromotionBlocked,
    sourceNoticeReconciliationsResolved:
      verified.sourceNoticeReconciliationsResolved,
    bindingFrozenVerified: verified.bindingFrozenVerified,
    ledgerDigest: verified.ledgerDigest,
    sourceBundleComplete: ledger.gateSummary.sourceBundleComplete,
    rightsBundleComplete: ledger.gateSummary.rightsBundleComplete,
    expertReviewBundleComplete: ledger.gateSummary.expertReviewBundleComplete,
    contentTruthEstablished: ledger.dttNoticeReconciliationGate.contentTruthEstablished,
    expertTruthEstablished: ledger.dttNoticeReconciliationGate.expertTruthEstablished,
    rightsLegalConclusionEstablished:
      ledger.dttNoticeReconciliationGate.rightsLegalConclusionEstablished,
    releaseReady: ledger.dttNoticeReconciliationGate.releaseReady,
    publicDeploymentAuthorized: ledger.releaseGovernance.publicDeploymentAuthorized,
    expertClaimsAuthorized: ledger.releaseGovernance.expertClaimsAuthorized
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "八字 binding readiness 验证失败。"}\n`);
  process.exitCode = 1;
}
