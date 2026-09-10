#!/usr/bin/env node

function hasPrefix(value, prefix) {
  return typeof value === "string" && value.slice(0, prefix.length) === prefix;
}

function visibleLoaderInjectionPresent() {
  if (!Array.isArray(process.execArgv)) return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument !== "string") return true;
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
  process.stderr.write("PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  process.exitCode = 1;
}

export async function main() {
  if (INVOCATION_REJECTED) return 1;
  if (process.argv.length !== 2) {
    process.stderr.write("ARGUMENTS_FORBIDDEN\n");
    return 1;
  }
  const { runFixedBaziScopedCurrentCli } = await import(
    "./bazi-scoped-current-cli-lib.mjs"
  );
  const { BAZI_SCOPED_CURRENT_PURPOSES } = await import(
    "./bazi-scoped-current-lib.mjs"
  );
  return runFixedBaziScopedCurrentCli(
    BAZI_SCOPED_CURRENT_PURPOSES.domainManifest,
    import.meta.url
  );
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
      process.stderr.write("ENTRYPOINT_REALPATH_FAILED\n");
      process.exitCode = 1;
      invokedDirectly = false;
    }
    if (invokedDirectly) process.exitCode = await main();
  }
}
