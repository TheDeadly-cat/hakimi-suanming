import { writeFile } from "node:fs/promises";
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
  if (process.argv.length !== 2) throw new Error("writer 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("writer 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH) throw new Error("writer 不接受 NODE_PATH。");
  for (const argument of process.execArgv) {
    for (const prefix of FORBIDDEN_EXEC_ARGV_PREFIXES) {
      if (argument === prefix || argument.startsWith(prefix + "=")) {
        throw new Error("writer 不接受 Node preload 或 loader 参数。");
      }
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("writer 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    buildExpectedWesternTzdb2026cSourceRightsEvidence,
    serializeWesternTzdb2026cSourceRightsEvidence
  } = await import("./western-tzdb-2026c-source-rights-evidence-lib.mjs");
  const ledger = buildExpectedWesternTzdb2026cSourceRightsEvidence();
  const output = serializeWesternTzdb2026cSourceRightsEvidence(ledger);
  const absolutePath = path.resolve(workspaceRoot, WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH);
  await writeFile(absolutePath, output, { encoding: "utf8", flag: "wx" });
  process.stdout.write(JSON.stringify({
    ok: true,
    path: WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    evidenceDigest: ledger.evidenceDigest
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "WRITE_FAILED",
    message: error?.message ?? "西洋 tzdb evidence 写入失败。"
  }) + "\n");
  process.exitCode = 1;
}
