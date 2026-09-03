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
    fail("ARGUMENTS_FORBIDDEN", "Vedic carrier child fixed-path CLI 不接受参数。");
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Vedic carrier child CLI rejects " + key + ".");
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects visible loader/preload argument.");
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "CLI 必须从固定 workspace root 调用。");
  }
}

try {
  assertSafeFixedInvocation();
  const {
    getVedicTzdbCoreDependencyLicenseCarrierChildSummary,
    isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild,
    loadVedicTzdbCoreDependencyLicenseCarrierChild
  } = await import("./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs");
  const verified = await loadVedicTzdbCoreDependencyLicenseCarrierChild();
  if (!isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(verified)) {
    fail("PRIVATE_BRAND_MISSING", "carrier child full-loader private brand 缺失。");
  }
  process.stdout.write(
    "VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_OK "
      + JSON.stringify(getVedicTzdbCoreDependencyLicenseCarrierChildSummary(verified))
      + "\n"
  );
} catch (reason) {
  process.stderr.write(JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Vedic carrier child verification failed."
  }) + "\n");
  process.exitCode = 1;
}
