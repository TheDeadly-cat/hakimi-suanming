import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
  readZiweiHighRiskExpressionPolicyDraft,
  verifyZiweiHighRiskExpressionPolicyDraft
} from "./ziwei-high-risk-expression-policy-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    engineeringSourceBindingVerified: false,
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的紫微高风险表达 policy child，不接受位置参数。",
    publicReleaseAuthorized: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const artifact = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
    const result = await verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, artifact);
    process.stdout.write(`${JSON.stringify({
      activeAdmissionEffect: result.activeAdmissionEffect,
      admissionGatesSatisfied: result.admissionGatesSatisfied,
      artifact: ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
      candidateCallSitesWiredToGate: result.candidateCallSitesWiredToGate,
      childDigest: result.childDigest,
      engineeringSourceBindingVerified: result.engineeringSourceBindingVerified,
      highRiskPolicyEstablished: result.highRiskPolicyEstablished,
      highRiskPolicyGateSatisfied: result.highRiskPolicyGateSatisfied,
      policyCanonicalDigest: result.policyCanonicalDigest,
      preImportIntrinsicIntegrityEstablished: result.preImportIntrinsicIntegrityEstablished,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      riskCategoryCount: result.riskCategoryCount,
      semanticCoverageComplete: result.semanticCoverageComplete,
      status: result.status,
      surfaceCount: result.surfaceCount
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      engineeringSourceBindingVerified: false,
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      publicReleaseAuthorized: false
    })}\n`);
    process.exitCode = 1;
  }
}
