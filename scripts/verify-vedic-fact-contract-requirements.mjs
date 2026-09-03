import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  readVedicFactContractRequirementsLedger,
  verifyVedicFactContractRequirementsLedger
} from "./vedic-fact-contract-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀事实要求账，不接受位置参数。",
    factRequirementsClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const ledger = await readVedicFactContractRequirementsLedger(workspaceRoot);
    const result = await verifyVedicFactContractRequirementsLedger(workspaceRoot, ledger);
    const inventory = result.ledger.requirementInventory;
    const receipt = result.ledger.zeroInstanceRequirementsReceipt;
    process.stdout.write(`${JSON.stringify({
      ledger: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      status: result.status,
      requirementsInventoryDefined: inventory.requirementsInventoryDefined,
      inventoryScope: inventory.inventoryScope,
      requirementsUniverseClosed: result.requirementsUniverseClosed,
      bindingRequirementsInventoryDefined: inventory.bindingRequirementsInventoryDefined,
      bindingRequired: inventory.bindingRequired,
      requirementsDefined: result.requirementsDefined,
      requirementsDraftCovered: result.requirementsDraftCovered,
      requirementsResolved: result.requirementsResolved,
      factContract: result.ledger.productBoundary.factContract,
      factContractArtifacts: result.factContractArtifacts,
      factInstancesObserved: result.factInstancesObserved,
      factValueInstances: receipt.factValueInstances,
      factProducerInstances: receipt.factProducerInstances,
      factProjectorInstances: receipt.factProjectorInstances,
      factFailureReceipts: receipt.factFailureReceipts,
      factReceipts: receipt.factReceipts,
      successReceipts: receipt.successReceipts,
      factReceiptIssued: receipt.factReceiptIssued,
      successReceiptIssued: receipt.successReceiptIssued,
      countsTowardAdmission: receipt.countsTowardAdmission,
      factContractGateSatisfied: result.factContractGateSatisfied,
      deterministicFactsGateSatisfied:
        result.ledger.authorityBoundary.deterministicFactsGateSatisfied,
      releaseReady: result.releaseReady,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      factRequirementsClosureVerified: true,
      ledgerDigest: result.ledgerDigest
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      factRequirementsClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
