import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
  readVedicRealIndependentExpertReviewPlan,
  verifyVedicRealIndependentExpertReviewPlan
} from "./vedic-real-independent-expert-review-plan-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    expertReviewPlanClosureVerified: false,
    message: "该 CLI 只验证固定项目内的吠陀现实独立专家审阅计划，不接受位置参数。"
  }) + "\n");
  process.exitCode = 2;
} else {
  try {
    const plan = await readVedicRealIndependentExpertReviewPlan(workspaceRoot);
    const result = await verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, plan);
    process.stdout.write(JSON.stringify({
      expertReviewBundleComplete: result.expertReviewBundleComplete,
      expertReviewPlanClosureVerified: true,
      independentExpertReviewsVerified: result.independentExpertReviewsVerified,
      plan: VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
      planCoverageComplete: result.planCoverageComplete,
      planCoverageMeaning: result.planCoverageMeaning,
      planDigest: result.planDigest,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      releaseReady: result.releaseReady,
      reviewStarted: result.reviewStarted,
      reviewerSlotsDefined: result.reviewerSlotsDefined,
      reviewerSlotsOccupied: result.reviewerSlotsOccupied,
      status: result.status
    }) + "\n");
  } catch (cause) {
    process.stderr.write(JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      expertReviewPlanClosureVerified: false,
      message: cause instanceof Error ? cause.message : String(cause)
    }) + "\n");
    process.exitCode = 1;
  }
}
