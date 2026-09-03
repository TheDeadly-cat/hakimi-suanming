import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FourSystemCurrentStatusObservationChildV210Error,
  getFourSystemCurrentStatusObservationChildV210Summary,
  loadFourSystemCurrentStatusObservationChildV210
} from "./four-system-current-status-observation-child-v2-10-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");

export async function runFourSystemCurrentStatusObservationChildV210Verifier({
  argv = process.argv,
  execArgv = process.execArgv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write("FOUR_SYSTEM_CURRENT_STATUS_V2_10_OPERANDS_FORBIDDEN\n");
    return 2;
  }
  if (execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("FOUR_SYSTEM_CURRENT_STATUS_V2_10_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const child = await loadFourSystemCurrentStatusObservationChildV210(workspaceRoot);
    stdout.write(`${JSON.stringify({ status: child.status,
      ...getFourSystemCurrentStatusObservationChildV210Summary(child) })}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error instanceof FourSystemCurrentStatusObservationChildV210Error
      ? error.code
      : "FOUR_SYSTEM_CURRENT_STATUS_V2_10_INTERNAL_FAILURE"}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = await runFourSystemCurrentStatusObservationChildV210Verifier();
