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

function isForbiddenExecArgument(argument) {
  return forbiddenExecArgPrefixes.some((prefix) => argument === prefix
    || argument.startsWith(`${prefix}=`)
    || (prefix === "-r" && argument.startsWith("-r") && argument.length > 2));
}

function assertNoVisiblePreloadInjection() {
  for (const key of forbiddenEnvironmentKeys) {
    if (typeof process.env[key] === "string") {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", `Ziwei v4 CLI rejects ${key}.`);
    }
  }
  for (const argument of process.execArgv) {
    if (isForbiddenExecArgument(argument)) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", `Ziwei v4 CLI rejects ${argument}.`);
    }
  }
}

try {
  if (process.argv.length !== 2) {
    fail("ARGUMENTS_FORBIDDEN", "Ziwei v4 fixed-path CLI does not accept caller operands.");
  }
  assertNoVisiblePreloadInjection();
  const {
    getZiweiIndependentEngineeringManifestV4Summary,
    isVerifiedZiweiIndependentEngineeringManifestV4,
    loadZiweiIndependentEngineeringManifestV4
  } = await import("./ziwei-independent-engineering-manifest-v4-lib.mjs");
  const verified = await loadZiweiIndependentEngineeringManifestV4();
  if (!isVerifiedZiweiIndependentEngineeringManifestV4(verified)) {
    fail("PRIVATE_BRAND_MISSING", "Ziwei v4 fixed-path full-loader private brand is missing.");
  }
  process.stdout.write(
    `ZIWEI_FOUR_PACKAGE_AUTHORED_SOURCE_ROOT_MANIFEST_V4_OK ${JSON.stringify(
      getZiweiIndependentEngineeringManifestV4Summary(verified)
    )}\n`
  );
} catch (reason) {
  process.stderr.write(`${JSON.stringify({
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason instanceof Error ? reason.message : "Ziwei v4 verification failed."
  })}\n`);
  process.exitCode = 1;
}
