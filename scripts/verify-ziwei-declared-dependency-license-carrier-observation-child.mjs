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

function assertNoVisiblePreloadInjection() {
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "Carrier child CLI rejects " + key + ".");
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (isForbiddenExecArgument(process.execArgv[index])) {
      fail(
        "PRELOAD_ENVIRONMENT_FORBIDDEN",
        "Carrier child CLI rejects visible loader/preload argument."
      );
    }
  }
}

try {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_FORBIDDEN", "Carrier child fixed-path CLI accepts no operands.");
  }
  assertNoVisiblePreloadInjection();
  const {
    getZiweiDeclaredDependencyLicenseCarrierChildSummary,
    isVerifiedZiweiDeclaredDependencyLicenseCarrierChild,
    loadZiweiDeclaredDependencyLicenseCarrierChild
  } = await import("./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs");
  const verified = await loadZiweiDeclaredDependencyLicenseCarrierChild();
  if (!isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(verified)) {
    fail("PRIVATE_BRAND_MISSING", "Carrier child full-loader private brand is missing.");
  }
  process.stdout.write(
    "ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_OK "
      + JSON.stringify(getZiweiDeclaredDependencyLicenseCarrierChildSummary(verified))
      + "\n"
  );
} catch (reason) {
  process.stderr.write(JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason instanceof Error ? reason.message : "Carrier child verification failed."
  }) + "\n");
  process.exitCode = 1;
}
