import { writeFile } from "node:fs/promises";
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
  if (process.argv.length !== 2) throw new Error("writer 不接受命令行参数。");
  if (process.env.NODE_OPTIONS) throw new Error("writer 不接受 NODE_OPTIONS。");
  if (process.env.NODE_PATH !== undefined) throw new Error("writer 不接受 NODE_PATH。");
  if (hasUnsafeExecArgv()) throw new Error("writer 不接受 preload 或 loader execArgv。");
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    throw new Error("writer 必须从固定 workspaceRoot 调用。");
  }
}

try {
  rejectUnsafeInvocation();
  const {
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
    buildCurrentWesternSourceBindingRequirementsSuccessorV12,
    serializeWesternSourceBindingRequirementsSuccessorV12
  } = await import("./western-source-binding-requirements-successor-v1.2-lib.mjs");
  const ledger = await buildCurrentWesternSourceBindingRequirementsSuccessorV12(workspaceRoot);
  const output = serializeWesternSourceBindingRequirementsSuccessorV12(ledger);
  const absolutePath = path.resolve(
    workspaceRoot,
    ...WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH.split("/")
  );
  await writeFile(absolutePath, output, { encoding: "utf8", flag: "wx" });
  process.stdout.write(JSON.stringify({
    ok: true,
    path: WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    formalCurrent: ledger.formalCurrentBinding.ledgerId,
    predecessorCandidateIsFormalCurrent:
      ledger.predecessorCandidateBinding.isFormalCurrent,
    activeEffect: ledger.formalStateBoundary.v12SuccessorActiveEffect,
    bindings: ledger.gateSummary.bindingFrozenVerified + "/" + ledger.gateSummary.bindingRequired,
    observations: ledger.gateSummary.controlledReproductionObservationSubjectsFullySatisfied
      + "/" + ledger.gateSummary.controlledReproductionObservationSubjectsTotal
  }) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: error?.code ?? "WRITE_FAILED",
    message: error?.safeForCli === true
      ? error.message
      : "西洋来源 requirements v1.2 nonformal successor 写入失败。"
  }) + "\n");
  process.exitCode = 1;
}
