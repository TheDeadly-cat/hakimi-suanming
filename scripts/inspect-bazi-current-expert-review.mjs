#!/usr/bin/env node

// Reject visible injection and operands before importing any current data reader.
const hasPrefix = (value, prefix) => typeof value === "string" && value.startsWith(prefix);
const injection = !Array.isArray(process.execArgv) || process.execArgv.some((arg) =>
  typeof arg !== "string" || ["--require", "--import", "--loader", "--experimental-loader"].includes(arg)
  || ["--require=", "--import=", "--loader=", "--experimental-loader="].some((prefix) => hasPrefix(arg, prefix))
  || /^-[^-]*r/u.test(arg))
  || Boolean(process.env.NODE_OPTIONS) || Boolean(process.env.NODE_PATH);
const args = process.argv.slice(2);
const validArguments = args.length === 1 && ["--structure", "--progress"].includes(args[0])
  || args.length === 3 && args[0] === "--progress" && args[1] === "--private-intake"
    && typeof args[2] === "string" && args[2].trim().length > 0 && !hasPrefix(args[2], "-");

if (injection) {
  process.stderr.write("PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  process.exitCode = 1;
} else if (!validArguments) {
  process.stderr.write("ARGUMENTS_FORBIDDEN\n");
  process.exitCode = 1;
} else {
  const { invokedThroughRealEntrypoint } = await import("./bazi-scoped-current-cli-lib.mjs");
  try {
    if (invokedThroughRealEntrypoint(import.meta.url)) {
      const { runBaziExpertInspectionCli } = await import("./bazi-expert-inspection-cli-lib.mjs");
      process.exitCode = await runBaziExpertInspectionCli(import.meta.url);
    }
  } catch {
    process.stderr.write("ENTRYPOINT_REALPATH_FAILED\n");
    process.exitCode = 1;
  }
}
