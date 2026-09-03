#!/usr/bin/env node

const OK_PREFIX = "WESTERN_THREE_PACKAGE_AUTHORED_MACHINE_IDENTITY_MANIFEST_V2_OK";
const FAILED_PREFIX =
  "WESTERN_THREE_PACKAGE_AUTHORED_MACHINE_IDENTITY_MANIFEST_V2_FAILED";

function hasAsciiPrefix(value, prefix) {
  if (typeof value !== "string" || value.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  return true;
}

function hasVisibleLoaderInjectionArgument() {
  const argumentsList = process.execArgv;
  if (!Array.isArray(argumentsList)) return true;
  for (let index = 0; index < argumentsList.length; index += 1) {
    if (!Object.hasOwn(argumentsList, index)) return true;
    const argument = argumentsList[index];
    if ((typeof argument === "string" && argument.length >= 2
        && argument[0] === "-" && argument[1] === "r")
      || argument === "--require"
      || hasAsciiPrefix(argument, "--require=")
      || argument === "--import"
      || hasAsciiPrefix(argument, "--import=")
      || argument === "--loader"
      || hasAsciiPrefix(argument, "--loader=")
      || argument === "--experimental-loader"
      || hasAsciiPrefix(argument, "--experimental-loader=")) return true;
  }
  return false;
}

function hasVisibleLoaderEnvironment() {
  const nodeOptions = process.env.NODE_OPTIONS;
  const nodePath = process.env.NODE_PATH;
  return (nodeOptions !== undefined && nodeOptions !== "")
    || (nodePath !== undefined && nodePath !== "");
}

// This guard intentionally precedes all dynamic imports and any argv[1]
// direct-dispatch decision. Arbitrary hidden pre-evaluation code remains outside
// what this CLI can establish and is reported as unestablished in the manifest.
const VISIBLE_LOADER_BOUNDARY_REJECTED =
  hasVisibleLoaderInjectionArgument() || hasVisibleLoaderEnvironment();

if (VISIBLE_LOADER_BOUNDARY_REJECTED) {
  process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
  process.exitCode = 1;
}

export async function main() {
  if (VISIBLE_LOADER_BOUNDARY_REJECTED) return 1;
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const {
    WesternIndependentEngineeringManifestV2Error,
    getWesternIndependentEngineeringManifestV2Summary,
    isVerifiedWesternIndependentEngineeringManifestV2,
    loadWesternIndependentEngineeringManifestV2
  } = await import("./western-independent-engineering-manifest-v2-lib.mjs");
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const loaded = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
    if (!isVerifiedWesternIndependentEngineeringManifestV2(loaded)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_MANIFEST_BRAND_MISSING\n`);
      return 1;
    }
    const summary = getWesternIndependentEngineeringManifestV2Summary(loaded);
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof WesternIndependentEngineeringManifestV2Error
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

if (!VISIBLE_LOADER_BOUNDARY_REJECTED) {
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const scriptPath = fileURLToPath(import.meta.url);
  const invokedDirectly = typeof process.argv[1] === "string"
    && path.resolve(process.argv[1]) === path.resolve(scriptPath);
  if (invokedDirectly) process.exitCode = await main();
}
