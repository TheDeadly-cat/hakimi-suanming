import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readBaziEngineeringBindingValueSubjectGap,
  verifyBaziEngineeringBindingValueSubjectGap
} from "./bazi-engineering-binding-value-subject-gap-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const result = await verifyBaziEngineeringBindingValueSubjectGap(workspaceRoot, ledger);
  console.log(JSON.stringify({
    status: "pass",
    ledgerDigest: result.ledgerDigest,
    engineeringBindingsScoped: result.engineeringBindingsScoped,
    engineeringValueSubjectsObserved: result.engineeringValueSubjectsObserved,
    valueSubjectsFreezeEligible: result.valueSubjectsFreezeEligible,
    bindingsFrozen: result.bindingsFrozen,
    releaseGovernance: ledger.releaseGovernance,
    observationBoundary: ledger.observationBoundary,
    gateSummary: ledger.gateSummary
  }, null, 2));
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "VERIFY_FAILED";
  const message = typeof error?.message === "string"
    ? error.message
    : "八字工程 binding value-subject 缺口账验证失败。";
  console.error(JSON.stringify({ status: "fail", code, message }, null, 2));
  process.exitCode = 1;
}
