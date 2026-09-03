import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("verifier 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    isVerifiedVedicTzdb2026cSourceRightsEvidence,
    loadVedicTzdb2026cSourceRightsEvidence
  } = await import("./vedic-tzdb-2026c-source-rights-evidence-lib.mjs");
  const result = await loadVedicTzdb2026cSourceRightsEvidence(workspaceRoot);
  if (!isVerifiedVedicTzdb2026cSourceRightsEvidence(result)) {
    throw new Error("verifier private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    evidenceId: result.evidenceId,
    evidenceDigest: result.evidenceDigest,
    partialCandidatesAttached: result.partialCandidatesAttached,
    bindings: `${result.sourceBindingsFrozenVerified}/${result.sourceBindingsRequired}`,
    subjectFullySatisfied: result.subjectFullySatisfied,
    exactQuotesBound: result.exactQuotesBound,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "VERIFY_FAILED",
    message: error?.safeForCli === true ? error.message : "Vedic tzdb evidence 验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
