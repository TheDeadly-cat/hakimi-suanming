#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH,
  readVedicInputStructuralRejectionEvidence,
  verifyVedicInputStructuralRejectionEvidence
} from "./vedic-input-structural-rejection-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function write(value) {
  process.stdout.write(JSON.stringify(value) + "\n");
}

function visibleUnsafeNodeLaunchState() {
  const inherited = ["NODE_OPTIONS", "NODE_PATH"].filter(
    (key) => typeof process.env[key] === "string" && process.env[key].trim() !== ""
  );
  return {
    execArgv: [...process.execArgv],
    inherited
  };
}

if (process.argv.length !== 2) {
  write({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    fixedProbeRejectionEvidenceVerified: false,
    message: "该 CLI 只验证固定项目内的吠陀结构预检拒绝执行 child，不接受位置参数。"
  });
  process.exitCode = 2;
} else {
  const launchState = visibleUnsafeNodeLaunchState();
  if (launchState.execArgv.length !== 0 || launchState.inherited.length !== 0) {
    write({
      errorCode: "NODE_LAUNCH_STATE_FORBIDDEN",
      fixedProbeRejectionEvidenceVerified: false,
      message: "该 CLI 拒绝当前仍可见的 NODE_OPTIONS、NODE_PATH 或 Node execArgv；preload 可在入口前抹除痕迹，因此这不是 loader 或 launcher 身份证明。"
    });
    process.exitCode = 2;
  } else {
    try {
      const evidence = await readVedicInputStructuralRejectionEvidence(workspaceRoot);
      const result = await verifyVedicInputStructuralRejectionEvidence(workspaceRoot, evidence);
      write({
        acceptedInputs: result.acceptedInputs,
        artifact: VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH,
        diagnosticProbeExecutions: result.diagnosticProbeExecutions,
        evidenceDigest: result.evidenceDigest,
        fixedProbeRejectionEvidenceVerified: true,
        fixedProbeSetVerified: result.fixedProbeSetVerified,
        historicalExecutionAttested: false,
        inputInstances: result.inputInstances,
        loadedModuleByteIdentityVerified: false,
        nodeLoaderIntegrityVerified: false,
        probeCoverageComplete: result.probeCoverageComplete,
        productInputRejectionReceipts: result.productInputRejectionReceipts,
        publicDeploymentAuthorized: result.publicDeploymentAuthorized,
        publicReleaseAuthorized: result.publicReleaseAuthorized,
        releaseReady: result.releaseReady,
        runtimeLauncherIdentityVerified: false,
        status: result.status
      });
    } catch (cause) {
      write({
        errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
        fixedProbeRejectionEvidenceVerified: false,
        message: cause instanceof Error ? cause.message : String(cause)
      });
      process.exitCode = 1;
    }
  }
}
