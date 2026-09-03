import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenEnvironmentKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenExecArgPrefixes = [
  "--experimental-loader",
  "--import",
  "--loader",
  "--require",
  "-r"
];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactString(left, right) {
  if (typeof left !== "string" || typeof right !== "string"
    || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function stringHasPrefix(value, prefix) {
  if (typeof value !== "string" || typeof prefix !== "string"
    || value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  return true;
}

function isForbiddenExecArgument(argument) {
  for (let index = 0; index < forbiddenExecArgPrefixes.length; index += 1) {
    const prefix = forbiddenExecArgPrefixes[index];
    if (exactString(argument, prefix)
      || stringHasPrefix(argument, prefix + "=")
      || (exactString(prefix, "-r") && argument.length > 2
        && stringHasPrefix(argument, "-r"))) return true;
  }
  return false;
}

function assertSafeFixedInvocation() {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_FORBIDDEN", "Vedic v1.3 successor fixed-path CLI 不接受参数。" );
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Vedic v1.3 CLI rejects " + key + ".");
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects visible loader/preload argument.");
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "CLI 必须从固定 workspace root 调用。" );
  }
}

try {
  assertSafeFixedInvocation();
  const {
    getVedicSourceBindingRequirementsSuccessorV13Summary,
    isVerifiedVedicSourceBindingRequirementsSuccessorV13,
    loadVedicSourceBindingRequirementsSuccessorV13
  } = await import("./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3-lib.mjs");
  const verified = await loadVedicSourceBindingRequirementsSuccessorV13();
  if (!isVerifiedVedicSourceBindingRequirementsSuccessorV13(verified)) {
    fail("PRIVATE_BRAND_MISSING", "Vedic v1.3 full-loader private brand 缺失。" );
  }
  process.stdout.write(
    "VEDIC_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_3_OK "
      + JSON.stringify(getVedicSourceBindingRequirementsSuccessorV13Summary(verified))
      + "\n"
  );
} catch (reason) {
  process.stderr.write(JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Vedic v1.3 successor verification failed."
  }) + "\n");
  process.exitCode = 1;
}
