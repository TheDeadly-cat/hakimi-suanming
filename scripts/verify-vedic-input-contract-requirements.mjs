import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  readVedicInputContractRequirementsLedger,
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀输入要求账，不接受位置参数。",
    requirementsClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const ledger = await readVedicInputContractRequirementsLedger(workspaceRoot);
    const result = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
    process.stdout.write(`${JSON.stringify({
      ledger: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      status: result.status,
      requirementsInventoryDefined: result.ledger.requirementInventory.requirementsInventoryDefined,
      requirementsDefined: result.requirementsDefined,
      requirementsDraftCovered: result.requirementsDraftCovered,
      requirementsResolved: result.requirementsResolved,
      inputContract: result.ledger.productBoundary.inputContract,
      inputContractArtifacts: result.inputContractArtifacts,
      inputInstancesObserved: result.inputInstancesObserved,
      inputAcceptanceReceiptIssued:
        result.ledger.zeroInstanceRequirementsReceipt.inputAcceptanceReceiptIssued,
      factReceiptIssued: result.ledger.zeroInstanceRequirementsReceipt.factReceiptIssued,
      countsTowardAdmission: result.ledger.zeroInstanceRequirementsReceipt.countsTowardAdmission,
      inputContractGateSatisfied: result.inputContractGateSatisfied,
      releaseReady: result.releaseReady,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      requirementsClosureVerified: true,
      ledgerDigest: result.ledgerDigest
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      requirementsClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
