import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
  readBaziExpertReviewPacket,
  verifyBaziExpertReviewPacket
} from "./bazi-expert-review-packet-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const packet = await readBaziExpertReviewPacket(workspaceRoot);
  const verified = await verifyBaziExpertReviewPacket(workspaceRoot, packet);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    packet: BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
    packetDigest: verified.packetDigest,
    artifactLocksVerified: verified.artifactLocksVerified,
    reviewersRequired: packet.gateSummary.domainExpertsRequired,
    reviewerSlotsOccupied: verified.reviewerSlotsOccupied,
    independentExpertReviewsVerified: verified.independentExpertReviewsVerified,
    expertReviewBundleComplete: packet.gateSummary.expertReviewBundleComplete,
    publicDeploymentAuthorized: packet.releaseGovernance.publicDeploymentAuthorized,
    expertClaimsAuthorized: packet.releaseGovernance.expertClaimsAuthorized
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "八字现实专家审阅候选包验证失败。"}\n`);
  process.exitCode = 1;
}
