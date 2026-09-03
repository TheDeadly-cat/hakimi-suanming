import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = resolve(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(dirname(scriptPath), "..");

if (import.meta.main !== true) {
  throw new Error("writer 只允许作为 import.meta.main 直接启动。");
}
const directEntryPath = typeof process.argv[1] === "string"
  ? resolve(process.argv[1])
  : null;
if (directEntryPath !== scriptPath) {
  throw new Error("writer 只允许由自身脚本路径直接启动。");
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
  if (process.argv.length !== 2) throw new Error("writer 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("writer 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH !== undefined) throw new Error("writer 不接受 NODE_PATH。");
  if (hasUnsafeExecArgv()) throw new Error("writer 不接受可见 preload 或 loader execArgv。");
  if (resolve(cwd()) !== workspaceRoot) throw new Error("writer 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
    buildExpectedWesternExpertPublicEvidenceFollowup,
    preflightWesternExpertPublicEvidenceFollowup,
    serializeWesternExpertPublicEvidenceFollowup
  } = await import("./western-expert-public-evidence-followup-lib.mjs");
  await preflightWesternExpertPublicEvidenceFollowup(workspaceRoot);
  const followup = buildExpectedWesternExpertPublicEvidenceFollowup();
  const output = serializeWesternExpertPublicEvidenceFollowup(followup);
  const absolutePath = resolve(
    workspaceRoot,
    ...WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH.split("/")
  );
  await writeFile(absolutePath, output, { encoding: "utf8", flag: "wx" });
  process.stdout.write(JSON.stringify({
    followupArtifactCreatedExclusively: true,
    path: WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
    followupDigest: followup.followupDigest
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    followupArtifactCreatedExclusively: false,
    code: error?.code ?? "WRITE_FAILED",
    message: "西洋 follow-up child 独占写入失败。"
  }) + "\n");
  process.exitCode = 1;
}
