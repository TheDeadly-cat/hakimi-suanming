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
      || (exactString(prefix, "-r")
        && argument.length > 2
        && stringHasPrefix(argument, "-r"))) return true;
  }
  return false;
}

function assertNoVisiblePreloadInjection() {
  for (let index = 0; index < forbiddenEnvironmentKeys.length; index += 1) {
    const key = forbiddenEnvironmentKeys[index];
    if (typeof process.env[key] === "string") {
      fail(
        "PRELOAD_ENVIRONMENT_FORBIDDEN",
        `Ziwei v3 CLI rejects visible loader/preload environment: ${key}.`
      );
    }
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (isForbiddenExecArgument(argument)) {
      fail(
        "PRELOAD_ENVIRONMENT_FORBIDDEN",
        `Ziwei v3 CLI rejects visible loader/preload argument: ${argument}.`
      );
    }
  }
}

try {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_FORBIDDEN", "Ziwei v3 fixed-path CLI does not accept caller operands.");
  }
  assertNoVisiblePreloadInjection();
  const {
    getZiweiIndependentEngineeringManifestV3Summary,
    isVerifiedZiweiIndependentEngineeringManifestV3,
    loadZiweiIndependentEngineeringManifestV3
  } = await import("./ziwei-independent-engineering-manifest-v3-lib.mjs");
  const verified = await loadZiweiIndependentEngineeringManifestV3();
  if (!isVerifiedZiweiIndependentEngineeringManifestV3(verified)) {
    fail("PRIVATE_BRAND_MISSING", "Ziwei v3 fixed-path full-loader private brand is missing.");
  }
  const summary = getZiweiIndependentEngineeringManifestV3Summary(verified);
  process.stdout.write(
    `ZIWEI_DEFINITION_AND_BROWSER_CHILD_SELECTED_PATH_MACHINE_IDENTITY_MANIFEST_V3_OK ${JSON.stringify(summary)}\n`
  );
} catch (reason) {
  process.stderr.write(`${JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason instanceof Error ? reason.message : "Ziwei v3 verification failed."
  })}\n`);
  process.exitCode = 1;
}
