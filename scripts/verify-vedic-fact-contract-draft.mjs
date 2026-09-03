import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  readVedicFactContractDraft,
  vedicFactContractDraftTestOnly,
  verifyVedicFactContractDraft
} from "./vedic-fact-contract-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    factContractDraftClosureVerified: false,
    message: "该 CLI 只验证固定项目内的吠陀事实合同草案，不接受位置参数。"
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const schema = await readVedicFactContractDraft(workspaceRoot);
    const result = await verifyVedicFactContractDraft(workspaceRoot, schema);
    process.stdout.write(`${JSON.stringify({
      artifactRole: result.artifactRole,
      blockedPrerequisites: result.blockedPrerequisiteIds.length,
      bytes: vedicFactContractDraftTestOnly.expectedDraftRawIdentity.bytes,
      countsTowardAdmission: result.countsTowardAdmission,
      deterministicFactsGateSatisfied: result.deterministicFactsGateSatisfied,
      factContractDraftClosureVerified: true,
      factContractGateSatisfied: result.factContractGateSatisfied,
      factFamiliesDefined: result.factFamiliesDefined,
      factGenerationCapability: result.factGenerationCapability,
      factInstancesObserved: result.factInstancesObserved,
      factReceiptIssued: result.factReceiptIssued,
      formalAdmissionAuthorized: result.formalAdmissionAuthorized,
      inputAcceptanceReceiptIssued: result.inputAcceptanceReceiptIssued,
      inputContractGateSatisfied: result.inputContractGateSatisfied,
      methodSelectionsIncluded: result.methodSelectionsIncluded,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      requirementSelectionsIncluded: result.requirementSelectionsIncluded,
      requirementsResolved: result.requirementsResolved,
      schema: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
      schemaSemanticDigest: result.schemaSemanticDigest,
      schemaSha256: vedicFactContractDraftTestOnly.expectedDraftRawIdentity.sha256,
      schemaStatus: result.schemaStatus,
      structuralPrecheckOnly: result.structuralPrecheckOnly,
      structuralPrecheckPassed: result.structuralPrecheckPassed
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      factContractDraftClosureVerified: false,
      message: cause instanceof Error ? cause.message : String(cause)
    })}\n`);
    process.exitCode = 1;
  }
}
