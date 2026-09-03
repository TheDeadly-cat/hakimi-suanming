#!/usr/bin/env node

const OK_PREFIX =
  "VEDIC_FIVE_ALLOWLISTED_AUTHORED_ROOT_RECURSIVE_MACHINE_IDENTITY_MANIFEST_V3_OK";
const FAILED_PREFIX =
  "VEDIC_FIVE_ALLOWLISTED_AUTHORED_ROOT_RECURSIVE_MACHINE_IDENTITY_MANIFEST_V3_FAILED";

function hasPrefix(value, prefix) {
  return typeof value === "string" && value.slice(0, prefix.length) === prefix;
}

function visibleLoaderInjectionPresent() {
  if (!Array.isArray(process.execArgv)) return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (!Object.hasOwn(process.execArgv, index)) return true;
    const argument = process.execArgv[index];
    if (argument === "--require" || hasPrefix(argument, "--require=")
        || argument === "--import" || hasPrefix(argument, "--import=")
        || argument === "--loader" || hasPrefix(argument, "--loader=")
        || argument === "--experimental-loader"
        || hasPrefix(argument, "--experimental-loader=")
        || (typeof argument === "string" && /^-[^-]*r/u.test(argument))) return true;
  }
  return (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS !== "")
    || (process.env.NODE_PATH !== undefined && process.env.NODE_PATH !== "");
}

const INVOCATION_REJECTED = visibleLoaderInjectionPresent();
if (INVOCATION_REJECTED) {
  process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
  process.exitCode = 1;
}

export async function main() {
  if (INVOCATION_REJECTED) return 1;
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const {
    VedicIndependentEngineeringManifestV3Error,
    getVedicIndependentEngineeringManifestV3Summary,
    isVerifiedVedicIndependentEngineeringManifestV3,
    loadVedicIndependentEngineeringManifestV3
  } = await import("./vedic-independent-engineering-manifest-v3-lib.mjs");
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const loaded = await loadVedicIndependentEngineeringManifestV3(workspaceRoot);
    if (!isVerifiedVedicIndependentEngineeringManifestV3(loaded)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_MANIFEST_BRAND_MISSING\n`);
      return 1;
    }
    process.stdout.write(
      `${OK_PREFIX} ${JSON.stringify(getVedicIndependentEngineeringManifestV3Summary(loaded))}\n`
    );
    return 0;
  } catch (error) {
    const code = error instanceof VedicIndependentEngineeringManifestV3Error
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

if (!INVOCATION_REJECTED) {
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const invokedDirectly = typeof process.argv[1] === "string"
    && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  if (invokedDirectly) process.exitCode = await main();
}
