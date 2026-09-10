#!/usr/bin/env node

const OK_PREFIX = "CURRENT_INDEX_STATUS_OK";
const FAILED_PREFIX = "CURRENT_INDEX_STATUS_FAILED";

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
    CurrentIndexStatusError,
    getCurrentIndexStatusSummary,
    isVerifiedCurrentIndexStatus,
    loadCurrentIndexStatus
  } = await import("./current-index-status-lib.mjs");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const status = await loadCurrentIndexStatus(root);
    if (!isVerifiedCurrentIndexStatus(status)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_STATUS_BRAND_MISSING\n`);
      return 1;
    }
    process.stdout.write(
      `${OK_PREFIX} ${JSON.stringify(getCurrentIndexStatusSummary(status))}\n`
    );
    return 0;
  } catch (error) {
    const code = error instanceof CurrentIndexStatusError
      ? error.code
      : (typeof error?.code === "string" ? error.code : "INTERNAL_FAILURE");
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

if (!INVOCATION_REJECTED) {
  const { realpathSync } = await import("node:fs");
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  let invokedDirectly = false;
  if (typeof process.argv[1] === "string") {
    try {
      const invoked = realpathSync(path.resolve(process.argv[1]));
      const moduleFile = realpathSync(fileURLToPath(import.meta.url));
      invokedDirectly = process.platform === "win32"
        ? invoked.toLowerCase() === moduleFile.toLowerCase()
        : invoked === moduleFile;
    } catch {
      process.stderr.write(`${FAILED_PREFIX} ENTRYPOINT_REALPATH_FAILED\n`);
      process.exitCode = 1;
      invokedDirectly = false;
    }
  }
  if (invokedDirectly) process.exitCode = await main();
}
