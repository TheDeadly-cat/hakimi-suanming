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
    fail(
      "ARGUMENTS_FORBIDDEN",
      "Western source-binding current-basis successor fixed-path CLI accepts no operands."
    );
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail(
        "PRELOAD_ENVIRONMENT_FORBIDDEN",
        "Western source-binding current-basis successor CLI rejects " + key + "."
      );
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail(
        "PRELOAD_ENVIRONMENT_FORBIDDEN",
        "Western source-binding current-basis successor CLI rejects visible preload/loader arguments."
      );
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail(
      "WORKSPACE_ROOT_REQUIRED",
      "Western source-binding current-basis successor CLI must run from the fixed workspace root."
    );
  }
}

try {
  assertSafeFixedInvocation();
  const {
    isVerifiedWesternSourceBindingCurrentBasisSuccessor,
    loadWesternSourceBindingCurrentBasisSuccessor
  } = await import("./western-source-binding-requirements-current-basis-successor-lib.mjs");
  const result = await loadWesternSourceBindingCurrentBasisSuccessor();
  if (!isVerifiedWesternSourceBindingCurrentBasisSuccessor(result)) {
    fail(
      "PRIVATE_BRAND_MISSING",
      "Western source-binding current-basis successor full-loader private brand is missing."
    );
  }
  process.stdout.write(
    "WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_OK " + JSON.stringify({
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      status: result.status,
      formalV1RemainsDeclaredCurrent: result.formalV1RemainsDeclaredCurrent,
      formalV1MechanicallyCurrent: result.formalV1MechanicallyCurrent,
      successorIsFormalCurrent: result.successorIsFormalCurrent,
      successorActiveEffect: result.successorActiveEffect,
      currentPartialCandidatesAttached: result.currentPartialCandidatesAttached,
      historicalStaleCandidatesObserved: result.historicalStaleCandidatesObserved,
      historicalCandidatesConsumed: result.historicalCandidatesConsumed,
      bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
      subjectFullySatisfied: result.subjectFullySatisfied,
      rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      publicReleaseAuthorized: result.publicReleaseAuthorized
    }) + "\n"
  );
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Western source-binding current-basis successor verification failed."
  }) + "\n");
  process.exitCode = 1;
}
