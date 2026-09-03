import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Preloads run before this launcher. This guard only refuses visible preload or
// loader state before importing business code; it cannot prove launcher integrity.
function hasUnsafeExecArgv() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const value = process.execArgv[index];
    if (typeof value !== "string"
      || value === "--require" || value === "-r" || value === "--import"
      || value === "--loader" || value === "--experimental-loader"
      || value.startsWith("--require=") || value.startsWith("--import=")
      || value.startsWith("--loader=") || value.startsWith("--experimental-loader=")
      || (value.startsWith("-r") && value.length > 2)) return true;
  }
  return false;
}

function rejectUnsafeInvocation() {
  if (process.argv.length !== 2) throw new Error("verifier 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("verifier 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH !== undefined) throw new Error("verifier 不接受 NODE_PATH。");
  if (hasUnsafeExecArgv()) throw new Error("verifier 不接受 preload 或 loader execArgv。");
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    throw new Error("verifier 必须从固定 workspaceRoot 调用。");
  }
}

try {
  rejectUnsafeInvocation();
  const {
    isVerifiedWesternSourceBindingRequirementsSuccessorV12,
    loadWesternSourceBindingRequirementsSuccessorV12
  } = await import("./western-source-binding-requirements-successor-v1.2-lib.mjs");
  const result = await loadWesternSourceBindingRequirementsSuccessorV12(workspaceRoot);
  if (!isVerifiedWesternSourceBindingRequirementsSuccessorV12(result)) {
    throw new Error("verifier private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    status: result.status,
    formalCurrentIsV1: result.formalCurrentIsV1,
    v11PredecessorCandidateIsFormalCurrent: result.v11PredecessorCandidateIsFormalCurrent,
    v12SuccessorIsFormalCurrent: result.v12SuccessorIsFormalCurrent,
    activeEffect: result.successorActiveEffect,
    bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
    observations: result.observationSubjectsFullySatisfied
      + "/" + result.observationSubjectsTotal,
    transformationProvenanceEstablished: result.transformationProvenanceEstablished,
    exactQuotesBound: result.exactQuotesBound,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    contentTruthEstablished: result.contentTruthEstablished,
    expertTruthEstablished: result.expertTruthEstablished,
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
      : "西洋来源 requirements v1.2 nonformal successor 验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
