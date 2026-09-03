import { fileURLToPath } from "node:url";
import path from "node:path";

const MODULE_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(MODULE_PATH), "..");
const FORBIDDEN_ENVIRONMENT_KEYS = ["NODE_OPTIONS", "NODE_PATH"];
const FORBIDDEN_EXEC_ARG_PREFIXES = [
  "--experimental-loader",
  "--import",
  "--loader",
  "--require",
  "-r"
];

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sameText(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function hasPrefix(value, prefix) {
  if (typeof value !== "string" || typeof prefix !== "string" || value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  return true;
}

function forbiddenExecArg(value) {
  for (let index = 0; index < FORBIDDEN_EXEC_ARG_PREFIXES.length; index += 1) {
    const prefix = FORBIDDEN_EXEC_ARG_PREFIXES[index];
    if (sameText(value, prefix) || hasPrefix(value, `${prefix}=`)
      || (sameText(prefix, "-r") && value.length > 2 && hasPrefix(value, "-r"))) return true;
  }
  return false;
}

function assertFixedLauncher() {
  if (process.argv.length !== 2) fail("ARGUMENTS_FORBIDDEN");
  for (let index = 0; index < FORBIDDEN_ENVIRONMENT_KEYS.length; index += 1) {
    if (typeof process.env[FORBIDDEN_ENVIRONMENT_KEYS[index]] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN");
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (forbiddenExecArg(process.execArgv[index])) fail("PRELOAD_ENVIRONMENT_FORBIDDEN");
  }
}

try {
  assertFixedLauncher();
  const {
    getBaziExpertCurrentLineZeroInstanceObservationChildV11Summary,
    isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11,
    loadBaziExpertCurrentLineZeroInstanceObservationChildV11
  } = await import("./bazi-expert-current-line-zero-instance-observation-child-v1-1-lib.mjs");
  const verified = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(PROJECT_ROOT);
  if (!isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(verified)) {
    fail("PRIVATE_BRAND_REQUIRED");
  }
  process.stdout.write(
    "BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_OK "
      + JSON.stringify(getBaziExpertCurrentLineZeroInstanceObservationChildV11Summary(verified))
      + "\n"
  );
} catch (reason) {
  process.stderr.write(JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "VERIFICATION_FAILED",
    message: reason instanceof Error ? reason.message : "Bazi expert v1.1 verification failed."
  }) + "\n");
  process.exitCode = 1;
}
