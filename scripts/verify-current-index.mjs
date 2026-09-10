#!/usr/bin/env node

const OK_PREFIX = "CURRENT_INDEX_OK";
const FAILED_PREFIX = "CURRENT_INDEX_FAILED";

function hasPrefix(value, prefix) {
  return typeof value === "string" && value.slice(0, prefix.length) === prefix;
}

function visibleLoaderInjectionPresent() {
  if (!Array.isArray(process.execArgv)) return true;
  for (const argument of process.execArgv) {
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
    CurrentIndexError,
    getCurrentIndexSummary,
    isVerifiedCurrentIndex,
    loadCurrentIndex
  } = await import("./current-index-lib.mjs");
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const index = await loadCurrentIndex(workspaceRoot);
    if (!isVerifiedCurrentIndex(index)) {
      throw new CurrentIndexError(
        "INDEX_PRIVATE_BRAND_REQUIRED",
        "current index 缺少私有验证品牌。"
      );
    }
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(getCurrentIndexSummary(index))}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof CurrentIndexError
      ? error.code
      : "INTERNAL_FAILURE";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

if (!INVOCATION_REJECTED) {
  const path = (await import("node:path")).default;
  const { realpathSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  if (typeof process.argv[1] === "string") {
    let invokedDirectly;
    try {
      const normalize = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
      const invokedReal = realpathSync(path.resolve(process.argv[1]));
      const moduleReal = realpathSync(path.resolve(fileURLToPath(import.meta.url)));
      invokedDirectly = normalize(invokedReal) === normalize(moduleReal);
    } catch {
      process.stderr.write(`${FAILED_PREFIX} ENTRYPOINT_REALPATH_FAILED\n`);
      process.exitCode = 1;
      invokedDirectly = false;
    }
    if (invokedDirectly) process.exitCode = await main();
  }
}
