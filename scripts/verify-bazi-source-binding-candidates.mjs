import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const ledgerPath = path.resolve(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));

verifyBaziSourceBindingCandidateLedger(ledger);
console.log(JSON.stringify({
  ok: true,
  ledgerId: ledger.ledgerId,
  ledgerDigest: ledger.ledgerDigest,
  candidateBindingCount: ledger.gateSummary.candidateBindingCount,
  normalizedFacsimileCollationCandidatesObserved:
    ledger.gateSummary.normalizedFacsimileCollationCandidatesObserved,
  exactGlyphFacsimileCorrespondenceCandidatesObserved:
    ledger.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved,
  exactFacsimileCollationsVerified: ledger.gateSummary.exactFacsimileCollationsVerified,
  independentHumanFacsimileCollationsVerified:
    ledger.gateSummary.independentHumanFacsimileCollationsVerified,
  bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
  distributionDecision: "link_only"
}));
