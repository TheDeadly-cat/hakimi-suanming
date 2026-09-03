import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate
} from "./vedic-independent-browser-quality-gate-and-release-evidence-design-candidate-lib.mjs";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function visibleUnsafeNodeLaunchState() {
  const inherited = ["NODE_OPTIONS", "NODE_PATH"].filter(
    (key) => typeof process.env[key] === "string"
      && process.env[key].trim() !== ""
  );
  return {
    execArgv: [...process.execArgv],
    inherited
  };
}

async function main() {
  if (process.argv.length !== 2) {
    fail(
      "CLI_OPERAND_FORBIDDEN",
      "本验证器只读取模块根固定路径，不接受 caller 指定候选、loader 或 workspace。"
    );
  }
  const launchState = visibleUnsafeNodeLaunchState();
  if (launchState.execArgv.length !== 0 || launchState.inherited.length !== 0) {
    fail(
      "NODE_LAUNCH_STATE_FORBIDDEN",
      "本验证器拒绝当前仍可见的 NODE_OPTIONS、NODE_PATH 或 Node execArgv。"
    );
  }
  const result =
    await loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      workspaceRoot
    );
  if (!isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
    result
  )) {
    fail(
      "FIXED_PATH_PRIVATE_BRAND_MISSING",
      "固定路径完整加载器没有签发同模块私有顺序观察品牌。"
    );
  }
  process.stdout.write(JSON.stringify({
    ok: true,
    currentBrandVerified: false,
    loadedModuleByteIdentityVerified: false,
    nodeLoaderIntegrityVerified: false,
    postImportPollutionExcluded: false,
    runtimeIntrinsicIntegrityVerified: false,
    runtimeLauncherIdentityVerified: false,
    sequentialFixedPathObservationBrandVerified: true,
    simultaneousCurrentRawClosureVerified: false,
    ...result
  }, null, 2) + "\n");
}

try {
  await main();
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "UNEXPECTED_FAILURE";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(JSON.stringify({ ok: false, code, message }) + "\n");
  process.exitCode = code === "CLI_OPERAND_FORBIDDEN"
    || code === "NODE_LAUNCH_STATE_FORBIDDEN"
    ? 2
    : 1;
}
