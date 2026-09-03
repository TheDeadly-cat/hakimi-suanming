import { dirname, resolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = resolve(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(dirname(scriptPath), "..");

if (import.meta.main !== true) {
  throw new Error("verifier 只允许作为 import.meta.main 直接启动。");
}
const directEntryPath = typeof process.argv[1] === "string"
  ? resolve(process.argv[1])
  : null;
if (directEntryPath !== scriptPath) {
  throw new Error("verifier 只允许由自身脚本路径直接启动。");
}

function hasPrefix(value, prefix) {
  if (value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  return true;
}

function hasUnsafeExecArgv() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const value = process.execArgv[index];
    if (typeof value !== "string"
      || value === "--require" || value === "-r" || value === "--import"
      || value === "--loader" || value === "--experimental-loader"
      || hasPrefix(value, "--require=") || hasPrefix(value, "--import=")
      || hasPrefix(value, "--loader=") || hasPrefix(value, "--experimental-loader=")
      || (hasPrefix(value, "-r") && value.length > 2)) return true;
  }
  return false;
}

function rejectUnsafeInvocation() {
  if (process.argv.length !== 2) throw new Error("verifier 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("verifier 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH !== undefined) throw new Error("verifier 不接受 NODE_PATH。");
  if (hasUnsafeExecArgv()) throw new Error("verifier 不接受可见 preload 或 loader execArgv。");
  if (resolve(cwd()) !== workspaceRoot) throw new Error("verifier 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    loadWesternExpertPublicEvidenceFollowup,
    isVerifiedWesternExpertPublicEvidenceFollowup
  } = await import("./western-expert-public-evidence-followup-lib.mjs");
  const result = await loadWesternExpertPublicEvidenceFollowup(workspaceRoot);
  if (!isVerifiedWesternExpertPublicEvidenceFollowup(result)) {
    throw new Error("verifier private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    offlineFollowupArtifactMechanicallyVerified:
      result.offlineFollowupArtifactMechanicallyVerified,
    status: result.status,
    followupId: result.followupId,
    followupDigest: result.followupDigest,
    parentPrivateBrandVerified: result.parentPrivateBrandVerified,
    parentPrescreenBound: result.parentPrescreenBound,
    candidateFollowups: result.candidateFollowups,
    sourceObservations: result.sourceObservations,
    readAttemptsOperatorRecorded: result.readAttemptsOperatorRecorded,
    deduplicatedSourceGroups: result.deduplicatedSourceGroups,
    reviewerSlots: result.reviewerSlots,
    sourceBindings: result.sourceBindings,
    expertGateCount: result.expertGateCount,
    remoteResponseBodiesPersisted: result.remoteResponseBodiesPersisted,
    remoteResponseBodiesPrinted: result.remoteResponseBodiesPrinted,
    remoteCaptureMechanicallyVerified: result.remoteCaptureMechanicallyVerified,
    networkAttestationEstablished: result.networkAttestationEstablished,
    identityVerified: result.identityVerified,
    credentialValidityVerified: result.credentialValidityVerified,
    scopeVerified: result.scopeVerified,
    independenceVerified: result.independenceVerified,
    expertStatusVerified: result.expertStatusVerified,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    publicReleaseAuthorized: result.publicReleaseAuthorized,
    noBacklinkContextsVerified: result.noBacklinkContextsVerified,
    followupArtifact: result.followupArtifact,
    parentArtifact: result.parentArtifact,
    basisArtifact: result.basisArtifact
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    offlineFollowupArtifactMechanicallyVerified: false,
    code: error?.code ?? "VERIFY_FAILED",
    message: "西洋公开证据 follow-up child 验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
