import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VedicCivilTimeFactBrowserObservationError,
  loadVedicCivilTimeFactBrowserObservationCandidate,
  summarizeVedicCivilTimeFactBrowserObservation,
  verifyVedicCivilTimeFactBrowserObservation
} from "./vedic-civil-time-fact-browser-observation-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");

export function runVedicCivilTimeFactBrowserObservationCli({
  argv = process.argv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write(
      "VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_OPERANDS_FORBIDDEN\n"
    );
    return 2;
  }
  if (Object.hasOwn(env, "NODE_OPTIONS")
    || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write(
      "VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_NODE_ENV_FORBIDDEN\n"
    );
    return 2;
  }
  try {
    const staticObservation =
      verifyVedicCivilTimeFactBrowserObservation(workspaceRoot);
    const candidate =
      loadVedicCivilTimeFactBrowserObservationCandidate(workspaceRoot);
    stdout.write(JSON.stringify({
      staticObservation:
        summarizeVedicCivilTimeFactBrowserObservation(staticObservation),
      candidate:
        summarizeVedicCivilTimeFactBrowserObservation(candidate)
    }) + "\n");
    return 0;
  } catch (error) {
    const code = error instanceof VedicCivilTimeFactBrowserObservationError
      ? error.code
      : "VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_INTERNAL_FAILURE";
    stderr.write(code + "\n");
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = runVedicCivilTimeFactBrowserObservationCli();
}
