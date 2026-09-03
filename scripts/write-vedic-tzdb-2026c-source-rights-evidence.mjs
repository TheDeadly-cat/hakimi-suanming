import { writeFile } from "node:fs/promises";
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
  if (process.argv.length !== 2) throw new Error("writer 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("writer 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH !== undefined) throw new Error("writer 不接受 NODE_PATH。");
  if (hasUnsafeExecArgv()) throw new Error("writer 不接受 preload 或 loader execArgv。");
  if (path.resolve(process.cwd()) !== workspaceRoot) throw new Error("writer 必须从固定 workspaceRoot 调用。");
}

try {
  rejectUnsafeInvocation();
  const {
    VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    buildExpectedVedicTzdb2026cSourceRightsEvidence,
    serializeVedicTzdb2026cSourceRightsEvidence
  } = await import("./vedic-tzdb-2026c-source-rights-evidence-lib.mjs");
  const ledger = buildExpectedVedicTzdb2026cSourceRightsEvidence();
  const output = serializeVedicTzdb2026cSourceRightsEvidence(ledger);
  const absolutePath = path.resolve(
    workspaceRoot,
    ...VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH.split("/")
  );
  await writeFile(absolutePath, output, { encoding: "utf8", flag: "wx" });
  process.stdout.write(JSON.stringify({
    ok: true,
    path: VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    evidenceId: ledger.evidenceId,
    evidenceDigest: ledger.evidenceDigest
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "WRITE_FAILED",
    message: error?.safeForCli === true ? error.message : "Vedic tzdb evidence 写入失败。"
  }) + "\n");
  process.exitCode = 1;
}
