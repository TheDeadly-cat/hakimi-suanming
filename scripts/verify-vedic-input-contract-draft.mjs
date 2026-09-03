import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  readVedicInputContractDraft,
  vedicInputContractDraftTestOnly,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀输入合同草案，不接受位置参数。",
    structuralClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const schema = await readVedicInputContractDraft(workspaceRoot);
    const result = await verifyVedicInputContractDraft(workspaceRoot, schema);
    process.stdout.write(`${JSON.stringify({
      artifactRole: result.artifactRole,
      bytes: vedicInputContractDraftTestOnly.expectedDraftRawIdentity.bytes,
      countsTowardAdmission: result.countsTowardAdmission,
      factReceiptIssued: result.factReceiptIssued,
      formalAdmissionAuthorized: result.formalAdmissionAuthorized,
      inputAcceptanceReceiptIssued: result.inputAcceptanceReceiptIssued,
      inputAccepted: result.inputAccepted,
      inputContractGateSatisfied: result.inputContractGateSatisfied,
      inputInstancesObserved: result.inputInstancesObserved,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      requirementFieldsDefined: result.requirementFieldsDefined,
      requirementSelectionsIncluded: result.requirementSelectionsIncluded,
      requirementsResolved: result.requirementsResolved,
      schema: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
      schemaSemanticDigest: result.schemaSemanticDigest,
      schemaSha256: vedicInputContractDraftTestOnly.expectedDraftRawIdentity.sha256,
      schemaStatus: result.schemaStatus,
      structuralClosureVerified: true,
      structuralPrecheckOnly: result.structuralPrecheckOnly,
      structuralPrecheckPassed: result.structuralPrecheckPassed,
      successReceiptIssued: result.successReceiptIssued
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      structuralClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
