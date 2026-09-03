import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const rightsLedger = JSON.parse(readFileSync(
  path.resolve(workspaceRoot, "content/bazi-strength-source-rights-candidates.v1.json"),
  "utf8"
));
const sourceLedger = JSON.parse(readFileSync(
  path.resolve(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json"),
  "utf8"
));
const verified = verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
console.log(JSON.stringify({
  ok: true,
  ledgerId: verified.ledgerId,
  ledgerDigest: verified.ledgerDigest,
  rightsCandidateCount: verified.gateSummary.rightsCandidateCount,
  formalSourceRightsRecordsCreated: verified.gateSummary.formalSourceRightsRecordsCreated,
  formalSourceCarrierRecordsCreated: verified.gateSummary.formalSourceCarrierRecordsCreated,
  redistributableSources: verified.gateSummary.redistributableSources,
  distributionPolicy: "link_only",
  legalConclusion: "not_established"
}));
