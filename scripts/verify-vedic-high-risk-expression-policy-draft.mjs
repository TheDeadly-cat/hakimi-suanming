import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
  readVedicHighRiskExpressionPolicyDraft,
  verifyVedicHighRiskExpressionPolicyDraft
} from "./vedic-high-risk-expression-policy-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀 requirements-only 高风险表达政策草案，不接受位置参数。",
    requirementsMaterialVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
    const result = await verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, policy);
    process.stdout.write(`${JSON.stringify({
      activeAdmissionEffect: result.activeAdmissionEffect,
      admissionGatesSatisfied: result.admissionGatesSatisfied,
      artifact: VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
      highRiskPolicyEstablished: result.highRiskPolicyEstablished,
      highRiskPolicyGateSatisfied: result.highRiskPolicyGateSatisfied,
      policyDigest: result.policyDigest,
      policyEnforced: result.policyEnforced,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      receiptIssued: result.receiptIssued,
      requirementsMaterialVerified: true,
      status: result.status
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      policyEnforced: false,
      receiptIssued: false,
      requirementsMaterialVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
