import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
  readVedicRuntimeAndBundleSizeProposal,
  verifyVedicRuntimeAndBundleSizeProposal
} from "./vedic-runtime-and-bundle-size-proposal-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀运行时与体积提案，不接受位置参数。",
    runtimeAndBundleSizeProposalClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const proposal = await readVedicRuntimeAndBundleSizeProposal(workspaceRoot);
    const result = await verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposal);
    process.stdout.write(`${JSON.stringify({
      artifactRole: result.artifactRole,
      browserReceipts: result.browserReceipts,
      browserRunsExecuted: result.browserRunsExecuted,
      budgetCeilingsProposed: result.budgetCeilingsProposed,
      buildReceipts: result.buildReceipts,
      observedMeasurementCount: result.observedMeasurementCount,
      primarySourceObservationCount: result.primarySourceObservationCount,
      proposal: VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
      proposalDigest: result.proposalDigest,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      publicSourceHttpReadsObserved: result.publicSourceHttpReadsObserved,
      releaseReady: result.releaseReady,
      runtimeAndBundleSizeProposalClosureVerified: true,
      runtimeOptionsProposed: result.runtimeOptionsProposed,
      runtimeReceipts: result.runtimeReceipts,
      selectedRuntimeOptionId: result.selectedRuntimeOptionId,
      stableImmediateReadPairs: result.stableImmediateReadPairs,
      status: result.status
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      runtimeAndBundleSizeProposalClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
