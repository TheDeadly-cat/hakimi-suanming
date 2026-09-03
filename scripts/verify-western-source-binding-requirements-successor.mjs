import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Node executes preload hooks before this launcher starts. This guard cannot
// undo such execution; it only refuses visible preload/loader invocations
// before importing the successor business module or verifying artifacts.
function hasUnsafeExecArgv() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const value = process.execArgv[index];
    if (typeof value !== "string"
      || value === "--require" || value === "-r" || value === "--import"
      || value === "--loader" || value === "--experimental-loader"
      || value.startsWith("--require=") || value.startsWith("--import=")
      || value.startsWith("--loader=") || value.startsWith("--experimental-loader=")
      || (value.startsWith("-r") && value.length > 2)) {
      return true;
    }
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
    isVerifiedWesternSourceBindingRequirementsSuccessor,
    loadWesternSourceBindingRequirementsSuccessor
  } = await import("./western-source-binding-requirements-successor-lib.mjs");
  const result = await loadWesternSourceBindingRequirementsSuccessor(workspaceRoot);
  if (!isVerifiedWesternSourceBindingRequirementsSuccessor(result)) {
    throw new Error("verifier private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    status: result.status,
    predecessorRemainsFormalCurrent: result.predecessorRemainsFormalCurrent,
    successorIsFormalCurrent: result.successorIsFormalCurrent,
    successorActiveEffect: result.successorActiveEffect,
    partialCandidatesAttached: result.partialCandidatesAttached,
    bindings: `${result.bindingFrozenVerified}/${result.bindingRequired}`,
    subjectFullySatisfied: result.subjectFullySatisfied,
    minimalExactQuotesStored: result.minimalExactQuotesStored,
    minimalExactQuoteObservationsAttached: result.minimalExactQuoteObservationsAttached,
    exactQuotesBound: result.exactQuotesBound,
    formalManifestIntegrated: result.formalManifestIntegrated,
    formalRegistryIntegrated: result.formalRegistryIntegrated,
    ownerAdmissionAccepted: result.ownerAdmissionAccepted,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "VERIFY_FAILED",
    message: error?.safeForCli === true
      ? error.message
      : "西洋来源 requirements 后继候选验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
