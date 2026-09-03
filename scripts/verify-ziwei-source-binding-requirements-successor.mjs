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
      || stringHasPrefix(argument, `${prefix}=`)
      || (exactString(prefix, "-r") && typeof argument === "string"
        && argument.length > 2 && stringHasPrefix(argument, "-r"))) return true;
  }
  return false;
}

function assertSafeFixedInvocation() {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_FORBIDDEN", "Ziwei source successor fixed-path CLI 不接受参数。");
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", `CLI 不接受 ${key}。`);
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI 不接受可见 preload/loader execArgv。");
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "CLI 必须从固定 workspace root 调用。");
  }
}

try {
  assertSafeFixedInvocation();
  const {
    isVerifiedZiweiSourceBindingRequirementsSuccessor,
    loadZiweiSourceBindingRequirementsSuccessor
  } = await import("./ziwei-source-binding-requirements-successor-lib.mjs");
  const result = await loadZiweiSourceBindingRequirementsSuccessor();
  if (!isVerifiedZiweiSourceBindingRequirementsSuccessor(result)) {
    fail("PRIVATE_BRAND_MISSING", "successor full-loader private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    status: result.status,
    predecessorRemainsFormalCurrent: result.predecessorRemainsFormalCurrent,
    successorIsFormalCurrent: result.successorIsFormalCurrent,
    successorActiveEffect: result.successorActiveEffect,
    partialCandidatesAttached: result.partialCandidatesAttached,
    bindings: `${result.bindingFrozenVerified}/${result.bindingRequired}`,
    subjectFullySatisfied: result.subjectFullySatisfied,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Ziwei source successor 验证失败。"
  }) + "\n");
  process.exitCode = 1;
}
