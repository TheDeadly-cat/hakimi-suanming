import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadWesternExpertPublicCandidatePrescreen,
  isVerifiedWesternExpertPublicCandidatePrescreen
} from "./western-expert-public-candidate-prescreen-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function rejectUnsafeInvocation() {
  if (process.argv.length !== 2) throw new Error("verifier 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("verifier 不接受 NODE_OPTIONS。");
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("verifier 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const result = await loadWesternExpertPublicCandidatePrescreen(workspaceRoot);
  if (!isVerifiedWesternExpertPublicCandidatePrescreen(result)) {
    throw new Error("verifier private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    publicCandidateLeadsObserved: result.publicCandidateLeadsObserved,
    sourceObservations: result.sourceObservations,
    deduplicatedSourceGroups: result.deduplicatedSourceGroups,
    reviewQuestions: result.reviewQuestions,
    pairwiseAssessments: result.pairwiseAssessments,
    reviewerSlots: `${result.reviewerSlotsOccupied}/${result.reviewerSlotsRequired}`,
    sourceBindings: `${result.sourceBindingsFrozenVerified}/${result.sourceBindingsRequired}`,
    independentExpertReviewsVerified: result.independentExpertReviewsVerified,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "VERIFY_FAILED",
    message: error?.safeForCli === true
      ? error.message
      : "西洋专家公开候选账验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
