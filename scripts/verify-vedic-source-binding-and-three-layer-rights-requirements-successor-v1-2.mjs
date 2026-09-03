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
    fail("ARGUMENTS_FORBIDDEN", "Vedic v1.2 fixed-path CLI 不接受参数。");
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Vedic v1.2 CLI rejects " + key + ".");
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
    isVerifiedVedicSourceBindingRequirementsSuccessorV12,
    loadVedicSourceBindingRequirementsSuccessorV12
  } = await import(
    "./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2-lib.mjs"
  );
  const result = await loadVedicSourceBindingRequirementsSuccessorV12();
  if (!isVerifiedVedicSourceBindingRequirementsSuccessorV12(result)) {
    fail("PRIVATE_BRAND_MISSING", "Vedic v1.2 full-loader private brand 缺失。");
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    status: result.status,
    formalV1RemainsCurrent: result.formalV1RemainsCurrent,
    predecessorV11RemainsNonformal: result.predecessorV11RemainsNonformal,
    successorIsFormalCurrent: result.successorIsFormalCurrent,
    successorActiveEffect: result.successorActiveEffect,
    inheritedPartialCandidates: result.inheritedPartialCandidates,
    newCandidateIdsAdded: result.newCandidateIdsAdded,
    carrierEvidenceBindingsAttached: result.carrierEvidenceBindingsAttached,
    bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
    subjectFullySatisfied: result.subjectFullySatisfied,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    redistributionAuthorized: result.redistributionAuthorized,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Vedic v1.2 successor verification failed."
  }) + "\n");
  process.exitCode = 1;
}
