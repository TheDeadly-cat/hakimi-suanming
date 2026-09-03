#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_SCOPE_OK";
const FAILED_PREFIX = "ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_SCOPE_FAILED";
const FORBIDDEN_EXEC_OPTIONS = [
  "-r",
  "--require",
  "--import",
  "--loader",
  "--experimental-loader"
];

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isOptionOrAttachedForm(value, option) {
  if (value === option) return true;
  if (typeof value !== "string" || value.length <= option.length) return false;
  if (option === "-r") return value[0] === "-" && value[1] === "r";
  return value[option.length] === "=" && value.slice(0, option.length) === option;
}

function assertVisibleCleanInvocation(modulePath) {
  if (process.argv.length !== 2) fail("CLI_ARGUMENTS_REJECTED");
  if (typeof process.env.NODE_OPTIONS === "string"
    || typeof process.env.NODE_PATH === "string") {
    fail("STILL_VISIBLE_PRELOAD_ENVIRONMENT_REJECTED");
  }
  for (const value of process.execArgv) {
    for (const option of FORBIDDEN_EXEC_OPTIONS) {
      if (isOptionOrAttachedForm(value, option)) {
        fail("STILL_VISIBLE_PRELOAD_EXECARGV_REJECTED");
      }
    }
  }
  const workspaceRoot = path.resolve(path.dirname(modulePath), "..");
  if (path.resolve(process.cwd()) !== workspaceRoot) fail("FIXED_WORKSPACE_ROOT_REQUIRED");
  return workspaceRoot;
}

export async function main() {
  const modulePath = fileURLToPath(import.meta.url);
  const workspaceRoot = assertVisibleCleanInvocation(modulePath);
  const {
    getZiweiPrescreenCliRuntimeBoundaryErratumSummary,
    isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum,
    loadZiweiPrescreenCliRuntimeBoundaryErratum
  } = await import("./ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum-lib.mjs");
  const value = await loadZiweiPrescreenCliRuntimeBoundaryErratum(workspaceRoot);
  if (!isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(value)) fail("PRIVATE_BRAND_REQUIRED");
  process.stdout.write(
    OK_PREFIX + " "
      + JSON.stringify(getZiweiPrescreenCliRuntimeBoundaryErratumSummary(value))
      + "\n"
  );
}

const modulePath = fileURLToPath(import.meta.url);
if (typeof process.argv[1] === "string"
  && path.resolve(process.argv[1]) === path.resolve(modulePath)) {
  main().catch((reason) => {
    const code = typeof reason?.code === "string" && /^[A-Z0-9_]+$/u.test(reason.code)
      ? reason.code
      : "VERIFICATION_FAILED";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    process.exitCode = 1;
  });
}
