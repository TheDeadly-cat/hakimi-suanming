#!/usr/bin/env node

const OK_PREFIX = "FOUR_SYSTEM_CURRENT_STATUS_V2_13_OK";
const FAILED_PREFIX = "FOUR_SYSTEM_CURRENT_STATUS_V2_13_FAILED";

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
    FourSystemCurrentStatusObservationChildV213Error,
    getFourSystemCurrentStatusObservationChildV213Summary,
    isVerifiedFourSystemCurrentStatusObservationChildV213,
    loadFourSystemCurrentStatusObservationChildV213
  } = await import("./four-system-current-status-observation-child-v2-13-lib.mjs");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const child = await loadFourSystemCurrentStatusObservationChildV213(root);
    if (!isVerifiedFourSystemCurrentStatusObservationChildV213(child)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_CHILD_BRAND_MISSING\n`);
      return 1;
    }
    process.stdout.write(
      `${OK_PREFIX} ${JSON.stringify(getFourSystemCurrentStatusObservationChildV213Summary(child))}\n`
    );
    return 0;
  } catch (error) {
    const code = error instanceof FourSystemCurrentStatusObservationChildV213Error
      ? error.code
      : "INTERNAL_FAILURE";
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
