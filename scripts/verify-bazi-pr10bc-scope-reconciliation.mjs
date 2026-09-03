import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readBaziPr10bcScopeReconciliation,
  verifyBaziPr10bcScopeReconciliation
} from "./bazi-pr10bc-scope-reconciliation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const result = await verifyBaziPr10bcScopeReconciliation(workspaceRoot, ledger);
  console.log(JSON.stringify({
    status: "pass",
    ledgerDigest: result.ledgerDigest,
    scopeProjectionsReproduced: result.scopeProjectionsReproduced,
    parallelBindingsCreated: result.parallelBindingsCreated,
    bindingsFrozen: result.bindingsFrozen,
    releaseGovernance: ledger.releaseGovernance,
    gateSummary: ledger.gateSummary
  }, null, 2));
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "VERIFY_FAILED";
  const message = typeof error?.message === "string"
    ? error.message
    : "PR10B/PR10C 概念范围对账验证失败。";
  console.error(JSON.stringify({ status: "fail", code, message }, null, 2));
  process.exitCode = 1;
}
