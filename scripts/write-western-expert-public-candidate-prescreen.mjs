import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  buildExpectedWesternExpertPublicCandidatePrescreen,
  serializeWesternExpertPublicCandidatePrescreen
} from "./western-expert-public-candidate-prescreen-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function rejectUnsafeInvocation() {
  if (process.argv.length !== 2) throw new Error("writer 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("writer 不接受 NODE_OPTIONS。");
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("writer 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const ledger = buildExpectedWesternExpertPublicCandidatePrescreen();
  const output = serializeWesternExpertPublicCandidatePrescreen(ledger);
  const absolutePath = path.resolve(workspaceRoot, WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH);
  await writeFile(absolutePath, output, { encoding: "utf8", flag: "wx" });
  process.stdout.write(JSON.stringify({
    ok: true,
    path: WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
    ledgerDigest: ledger.ledgerDigest
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "WRITE_FAILED",
    message: error?.message ?? "西洋专家公开候选账写入失败。"
  }) + "\n");
  process.exitCode = 1;
}
