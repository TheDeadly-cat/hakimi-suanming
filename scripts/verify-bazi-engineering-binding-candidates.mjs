import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_ENGINEERING_BINDING_CANDIDATE_LEDGER_RELATIVE_PATH,
  readBaziEngineeringBindingCandidateLedger,
  verifyBaziEngineeringBindingCandidateLedger
} from "./bazi-engineering-binding-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = await readBaziEngineeringBindingCandidateLedger(workspaceRoot);
const verified = await verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, ledger);

process.stdout.write(`${JSON.stringify({
  ledger: BAZI_ENGINEERING_BINDING_CANDIDATE_LEDGER_RELATIVE_PATH,
  ledgerId: ledger.ledgerId,
  ledgerDigest: verified.ledgerDigest,
  candidatesVerified: verified.candidatesVerified,
  uniqueRepositoryArtifactsLocked: ledger.gateSummary.uniqueRepositoryArtifactsLocked,
  rationaleDraftsPresent: ledger.gateSummary.rationaleDraftsPresent,
  engineeringRationalesFrozen: ledger.gateSummary.engineeringRationalesFrozen,
  independentDomainReviewsVerified: ledger.gateSummary.independentDomainReviewsVerified,
  bindingsFrozen: verified.bindingsFrozen,
  classicalAuthorityClaims: ledger.gateSummary.classicalAuthorityClaims,
  releaseReady: ledger.gateSummary.releaseReady,
  publicDeploymentAuthorized: ledger.releaseGovernance.publicDeploymentAuthorized,
  expertClaimsAuthorized: ledger.releaseGovernance.expertClaimsAuthorized
}, null, 2)}\n`);
