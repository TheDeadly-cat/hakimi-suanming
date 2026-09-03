import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenEnvironmentKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenExecArgPrefixes = ["--experimental-loader", "--import", "--loader", "--require", "-r"];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactString(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

function stringHasPrefix(value, prefix) {
  if (typeof value !== "string" || typeof prefix !== "string" || value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) if (value[index] !== prefix[index]) return false;
  return true;
}

function isForbiddenExecArgument(argument) {
  for (const prefix of forbiddenExecArgPrefixes) {
    if (exactString(argument, prefix) || stringHasPrefix(argument, prefix + "=")
      || (exactString(prefix, "-r") && argument.length > 2 && stringHasPrefix(argument, "-r"))) return true;
  }
  return false;
}

function assertSafeFixedInvocation() {
  if (process.argv.length !== 2) fail("ARGUMENTS_FORBIDDEN", "Ziwei v1.2 fixed-path CLI 不接受参数。");
  for (const key of forbiddenEnvironmentKeys) {
    if (typeof process.env[key] === "string") fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Ziwei v1.2 CLI rejects " + key + ".");
  }
  for (const argument of process.execArgv) {
    if (isForbiddenExecArgument(argument)) fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects visible loader/preload argument.");
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) fail("WORKSPACE_ROOT_REQUIRED", "CLI 必须从固定 workspace root 调用。");
}

try {
  assertSafeFixedInvocation();
  const {
    getZiweiSourceBindingRequirementsSuccessorV12Summary,
    isVerifiedZiweiSourceBindingRequirementsSuccessorV12,
    loadZiweiSourceBindingRequirementsSuccessorV12
  } = await import("./ziwei-source-binding-requirements-successor-v1-2-lib.mjs");
  const verified = await loadZiweiSourceBindingRequirementsSuccessorV12();
  if (!isVerifiedZiweiSourceBindingRequirementsSuccessorV12(verified)) {
    fail("PRIVATE_BRAND_MISSING", "Ziwei v1.2 full-loader private brand 缺失。");
  }
  process.stdout.write("ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_OK "
    + JSON.stringify(getZiweiSourceBindingRequirementsSuccessorV12Summary(verified)) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message : "Ziwei v1.2 verification failed."
  }) + "\n");
  process.exitCode = 1;
}
