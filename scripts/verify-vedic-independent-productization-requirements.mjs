import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH,
  readVedicProductizationRequirementsLedger,
  verifyVedicProductizationRequirementsLedger
} from "./vedic-independent-productization-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀产品化要求账，不接受位置参数。",
    productizationRequirementsClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const ledger = await readVedicProductizationRequirementsLedger(workspaceRoot);
    const result = await verifyVedicProductizationRequirementsLedger(workspaceRoot, ledger);
    process.stdout.write(`${JSON.stringify({
      ledger: VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH,
      status: result.status,
      productStatus: "research_only",
      productArtifactsPresent: result.productArtifactsPresent,
      rereviewRequirementsComplete: result.rereviewRequirementsComplete,
      rereviewTriggered: result.rereviewTriggered,
      runtimeProposalStatus: result.runtimeProposalStatus,
      sourceRightsRequirementsStatus: result.sourceRightsRequirementsStatus,
      expertReviewPlanStatus: result.expertReviewPlanStatus,
      expertReviewPlanDefined: result.expertReviewPlanDefined,
      expertReviewSeatsDefined: result.expertReviewSeatsDefined,
      expertReviewSeatsFilled: result.expertReviewSeatsFilled,
      expertReviewStarted: result.expertReviewStarted,
      bindingRequirementsInventoryDefined: result.bindingRequirementsInventoryDefined,
      bindingRequired: result.bindingRequired,
      bindingFrozenVerified: result.bindingFrozenVerified,
      requirementsUniverseClosed: result.requirementsUniverseClosed,
      sourceBundleComplete: result.sourceBundleComplete,
      rightsBundleComplete: result.rightsBundleComplete,
      independentExpertsRequired: result.ledger.expertBoundary.independentExpertsRequired,
      independentExpertReviewsVerified: result.independentExpertReviewsVerified,
      releaseReady: result.releaseReady,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      baziAuthorityInherited: result.ledger.authorityBoundary.baziAuthorityInherited,
      comparisonIncluded: result.ledger.authorityBoundary.comparisonIncluded,
      factReceiptIssued: result.ledger.authorityBoundary.factReceiptIssued,
      productizationRequirementsClosureVerified: true,
      ledgerDigest: result.ledgerDigest
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      productizationRequirementsClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
