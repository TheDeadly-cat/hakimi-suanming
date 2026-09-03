#!/usr/bin/env node

const FAILURE_PREFIX = "WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_V2_FAILED";
const forbiddenEnvironment = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_DEBUG",
  "NODE_REPL_EXTERNAL_MODULE"
];

try {
  if (process.argv.length !== 2) {
    throw Object.assign(new Error("CLI 不接受 operand。"), { code: "CLI_OPERAND_FORBIDDEN" });
  }
  const visible = forbiddenEnvironment.filter((name) => (
    typeof process.env[name] === "string" && process.env[name].trim().length > 0
  ));
  if (visible.length > 0) {
    throw Object.assign(new Error(`CLI 拒绝可见 Node loader/debug 环境：${visible.join(",")}`), {
      code: "CLI_ENVIRONMENT_FORBIDDEN"
    });
  }
  const module = await import("./western-source-and-manifest-identity-drift-receipt-candidate-v2-lib.mjs");
  const receipt = await module.loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  if (!module.isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(receipt)) {
    throw Object.assign(new Error("固定 loader 未产生私有 verified brand。"), {
      code: "VERIFIED_BRAND_MISSING"
    });
  }
  process.stdout.write(`${JSON.stringify({
    candidateId: receipt.candidateId,
    candidateStatus: receipt.candidateStatus,
    receiptDigest: receipt.receiptDigest,
    parentBuildGraphDrift: receipt.driftPartitions.preExistingParentBuildGraph.driftCount,
    westernSourceDrift: receipt.driftPartitions.westernSixRootSource.driftCount,
    totalDistinctChangedPaths: receipt.crossPartitionBoundary.totalDistinctChangedPaths,
    historicalWesternV5Current: receipt.currentnessBoundary.historicalWesternV5Current,
    historicalFourSystemV214Current: receipt.currentnessBoundary.historicalFourSystemV214Current,
    activeAdmissionEffect: receipt.activeAdmissionEffect,
    verified: true
  })}\n`);
} catch (cause) {
  const code = typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR";
  process.stderr.write(`${FAILURE_PREFIX} ${code}\n`);
  process.exitCode = 1;
}
