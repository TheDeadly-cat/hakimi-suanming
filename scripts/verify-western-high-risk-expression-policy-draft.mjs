import {
  isVerifiedWesternHighRiskExpressionPolicyDraftResult,
  loadWesternHighRiskExpressionPolicyDraft
} from "./western-high-risk-expression-policy-draft-lib.mjs";

if (process.argv.length !== 2) {
  process.stderr.write("verify-western-high-risk-expression-policy-draft.mjs accepts no operands\n");
  process.exitCode = 2;
} else if ((process.env.NODE_OPTIONS ?? "") !== "" || (process.env.NODE_PATH ?? "") !== "") {
  process.stderr.write("Node preload and module-path overrides are forbidden\n");
  process.exitCode = 2;
} else {
  try {
    const result = await loadWesternHighRiskExpressionPolicyDraft(process.cwd());
    if (!isVerifiedWesternHighRiskExpressionPolicyDraftResult(result)) {
      throw new Error("verified result brand missing");
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (cause) {
    const code = cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : "WESTERN_HIGH_RISK_POLICY_VERIFICATION_FAILED";
    const message = cause instanceof Error && cause.message
      ? cause.message
      : "Western high-risk policy verification failed";
    process.stderr.write(`${code}: ${message}\n`);
    process.exitCode = 1;
  }
}
