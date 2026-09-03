import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_EXEC_ARGV_PREFIXES = [
  "--require",
  "-r",
  "--import",
  "--loader",
  "--experimental-loader"
];

function rejectUnsafeInvocation() {
  if (process.argv.length !== 2) throw new Error("verifier 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("verifier 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH) throw new Error("verifier 不接受 NODE_PATH。");
  for (const argument of process.execArgv) {
    for (const prefix of FORBIDDEN_EXEC_ARGV_PREFIXES) {
      if (argument === prefix || argument.startsWith(prefix + "=")) {
        throw new Error("verifier 不接受 Node preload 或 loader 参数。");
      }
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("verifier 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    isVerifiedWesternTzdb2026cSourceRightsEvidence,
    loadWesternTzdb2026cSourceRightsEvidence
  } = await import("./western-tzdb-2026c-source-rights-evidence-lib.mjs");
  const result = await loadWesternTzdb2026cSourceRightsEvidence(workspaceRoot);
  if (!isVerifiedWesternTzdb2026cSourceRightsEvidence(result)) throw new Error("verifier private brand 缺失。");
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    evidenceId: result.evidenceId,
    evidenceDigest: result.evidenceDigest,
    partialCandidatesAttached: result.partialCandidatesAttached,
    sourceBindings: `${result.sourceBindingsFrozenVerified}/${result.sourceBindingsRequired}`,
    remoteBodiesPersistedInThisRecord: result.remoteBodiesPersistedInThisRecord,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "VERIFY_FAILED",
    message: error?.safeForCli === true ? error.message : "西洋 tzdb evidence 验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
