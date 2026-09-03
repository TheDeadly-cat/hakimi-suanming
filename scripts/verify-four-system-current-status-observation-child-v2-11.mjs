import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FourSystemCurrentStatusObservationChildV211Error,
  getFourSystemCurrentStatusObservationChildV211Summary,
  loadFourSystemCurrentStatusObservationChildV211
} from "./four-system-current-status-observation-child-v2-11-lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function run({ argv = process.argv, execArgv = process.execArgv, env = process.env,
  stdout = process.stdout, stderr = process.stderr } = {}) {
  if (argv.length !== 2 || execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS")
      || Object.hasOwn(env, "NODE_PATH")) { stderr.write("FOUR_SYSTEM_CURRENT_STATUS_V2_11_INVOCATION_FORBIDDEN\n"); return 2; }
  try {
    const child = await loadFourSystemCurrentStatusObservationChildV211(root);
    stdout.write(`${JSON.stringify({ status: child.status,
      ...getFourSystemCurrentStatusObservationChildV211Summary(child) })}\n`); return 0;
  } catch (error) {
    stderr.write(`${error instanceof FourSystemCurrentStatusObservationChildV211Error
      ? error.code : "FOUR_SYSTEM_CURRENT_STATUS_V2_11_INTERNAL_FAILURE"}\n`); return 1;
  }
}
if (import.meta.main) process.exitCode = await run();
