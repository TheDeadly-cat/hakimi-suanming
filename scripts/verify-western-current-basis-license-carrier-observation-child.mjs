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
    fail("ARGUMENTS_FORBIDDEN", "Western carrier child fixed-path CLI accepts no operands.");
  }
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Western carrier child CLI rejects " + key + ".");
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Western carrier child CLI rejects visible preload/loader arguments.");
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "Western carrier child CLI must run from the fixed workspace root.");
  }
}

try {
  assertSafeFixedInvocation();
  const {
    isVerifiedWesternCurrentBasisLicenseCarrierChild,
    loadWesternCurrentBasisLicenseCarrierChild
  } = await import("./western-current-basis-license-carrier-observation-child-lib.mjs");
  const result = await loadWesternCurrentBasisLicenseCarrierChild();
  if (!isVerifiedWesternCurrentBasisLicenseCarrierChild(result)) {
    fail("PRIVATE_BRAND_MISSING", "Western carrier child full-loader private brand is missing.");
  }
  process.stdout.write("WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_OK " + JSON.stringify({
    childId: result.childId,
    childDigest: result.childDigest,
    status: result.status,
    currentSourceBasisEndpointsObserved: result.currentSourceBasisEndpointsObserved,
    externalDependenciesObserved: result.externalDependenciesObserved,
    installedLicenseCarrierEndpointsPresent: result.installedLicenseCarrierEndpointsPresent,
    installedExactLicenseEndpointsAbsent: result.installedExactLicenseEndpointsAbsent,
    controlledProjectLicenseCopiesObserved: result.controlledProjectLicenseCopiesObserved,
    bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
    childActiveEffect: result.childActiveEffect,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized
  }) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message
      : "Western current-basis carrier child verification failed."
  }) + "\n");
  process.exitCode = 1;
}
