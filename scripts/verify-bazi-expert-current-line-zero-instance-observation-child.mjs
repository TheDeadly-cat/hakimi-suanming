import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  getBaziExpertCurrentLineZeroInstanceObservationChildSummary,
  isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild,
  loadBaziExpertCurrentLineZeroInstanceObservationChild
} from "./bazi-expert-current-line-zero-instance-observation-child-lib.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(MODULE_PATH), "..");
const FORBIDDEN_EXEC_ARG = /^(?:-r|--require|--import|--loader|--experimental-loader)(?:=|$)/u;

function isDirectExecution() {
  if (typeof process.argv[1] !== "string" || process.argv[1].length === 0) return false;
  return path.resolve(process.argv[1]).toLowerCase() === path.resolve(MODULE_PATH).toLowerCase();
}

function assertNarrowLauncher() {
  if (process.argv.length !== 2) throw new Error("CLI_ARGUMENTS_REJECTED");
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS.trim() !== "") {
    throw new Error("VISIBLE_PRELOAD_OPTIONS_REJECTED");
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (FORBIDDEN_EXEC_ARG.test(process.execArgv[index])) throw new Error("VISIBLE_PRELOAD_OPTIONS_REJECTED");
  }
}

export async function main() {
  assertNarrowLauncher();
  const result = await loadBaziExpertCurrentLineZeroInstanceObservationChild(PROJECT_ROOT);
  if (!isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(result)) throw new Error("PRIVATE_BRAND_REQUIRED");
  const summary = getBaziExpertCurrentLineZeroInstanceObservationChildSummary(result);
  process.stdout.write(`BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_OK ${JSON.stringify(summary)}\n`);
}

if (isDirectExecution()) {
  main().catch(() => {
    process.stderr.write("BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_FAILED VERIFICATION_FAILED\n");
    process.exitCode = 1;
  });
}
