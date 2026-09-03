import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  readVedicRuleContractRequirementsLedger,
  verifyVedicRuleContractRequirementsLedger
} from "./vedic-rule-contract-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀规则要求账，不接受位置参数。",
    ruleRequirementsClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const ledger = await readVedicRuleContractRequirementsLedger(workspaceRoot);
    const result = await verifyVedicRuleContractRequirementsLedger(workspaceRoot, ledger);
    const inventory = result.ledger.requirementInventory;
    const receipt = result.ledger.zeroInstanceRequirementsReceipt;
    process.stdout.write(`${JSON.stringify({
      bindingRequired: inventory.bindingRequired,
      bindingRequirementsInventoryDefined: inventory.bindingRequirementsInventoryDefined,
      countsTowardAdmission: receipt.countsTowardAdmission,
      ledger: VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      ledgerDigest: result.ledgerDigest,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      releaseReady: result.releaseReady,
      requirementsDefined: result.requirementsDefined,
      requirementsDraftCovered: result.requirementsDraftCovered,
      requirementsResolved: result.requirementsResolved,
      requirementsUniverseClosed: result.requirementsUniverseClosed,
      ruleCandidatesObserved: receipt.ruleCandidatesObserved,
      ruleContract: result.ledger.productBoundary.ruleContract,
      ruleContractArtifacts: result.ruleContractArtifacts,
      ruleContractGateSatisfied: result.ruleContractGateSatisfied,
      ruleDefinitionsObserved: receipt.ruleDefinitionsObserved,
      ruleEvaluatorInstances: receipt.ruleEvaluatorInstances,
      ruleFailureReceipts: receipt.ruleFailureReceipts,
      ruleImplementationInstances: receipt.ruleImplementationInstances,
      ruleInstancesObserved: result.ruleInstancesObserved,
      ruleReceiptIssued: receipt.ruleReceiptIssued,
      ruleReceipts: receipt.ruleReceipts,
      rulesetInstancesObserved: receipt.rulesetInstancesObserved,
      status: result.status,
      successReceiptIssued: receipt.successReceiptIssued,
      successReceipts: receipt.successReceipts,
      versionedRuleset: result.ledger.productBoundary.versionedRuleset,
      versionedRulesetGateSatisfied: result.versionedRulesetGateSatisfied,
      ruleRequirementsClosureVerified: true
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      ruleRequirementsClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
