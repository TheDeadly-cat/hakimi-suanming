import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  readVedicRuleContractDraft,
  vedicRuleContractDraftTestOnly,
  verifyVedicRuleContractDraft
} from "./vedic-rule-contract-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀规则合同草案，不接受位置参数。",
    ruleContractDraftClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const schema = await readVedicRuleContractDraft(workspaceRoot);
    const result = await verifyVedicRuleContractDraft(workspaceRoot, schema);
    process.stdout.write(`${JSON.stringify({
      artifactRole: result.artifactRole,
      blockedPrerequisites: result.blockedPrerequisiteIds.length,
      blockedPrerequisitesResolved: result.blockedPrerequisitesResolved,
      blockedPrerequisitesUniverseClosed: result.blockedPrerequisitesUniverseClosed,
      bytes: vedicRuleContractDraftTestOnly.expectedDraftRawIdentity.bytes,
      countsTowardAdmission: result.countsTowardAdmission,
      factContractGateSatisfied: result.factContractGateSatisfied,
      factInstancesObserved: result.factInstancesObserved,
      formalAdmissionAuthorized: result.formalAdmissionAuthorized,
      inputContractGateSatisfied: result.inputContractGateSatisfied,
      methodSelectionsIncluded: result.methodSelectionsIncluded,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      requirementSelectionsIncluded: result.requirementSelectionsIncluded,
      ruleBodiesIncluded: result.ruleBodiesIncluded,
      ruleContractDraftClosureVerified: true,
      ruleContractGateSatisfied: result.ruleContractGateSatisfied,
      ruleDefinitionsIncluded: result.ruleDefinitionsIncluded,
      ruleEvaluationCapability: result.ruleEvaluationCapability,
      ruleInstancesObserved: result.ruleInstancesObserved,
      ruleReceiptIssued: result.ruleReceiptIssued,
      rulesetExecutionCapability: result.rulesetExecutionCapability,
      rulesetInstancesObserved: result.rulesetInstancesObserved,
      schema: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
      schemaSemanticDigest: result.schemaSemanticDigest,
      schemaSha256: vedicRuleContractDraftTestOnly.expectedDraftRawIdentity.sha256,
      schemaStatus: result.schemaStatus,
      sourceBodiesIncluded: result.sourceBodiesIncluded,
      structuralPrecheckOnly: result.structuralPrecheckOnly,
      structuralPrecheckPassed: result.structuralPrecheckPassed,
      successReceiptIssued: result.successReceiptIssued,
      versionedRulesetGateSatisfied: result.versionedRulesetGateSatisfied
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      ruleContractDraftClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
