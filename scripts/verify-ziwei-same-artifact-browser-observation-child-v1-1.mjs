#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_PATH = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(MODULE_PATH), "..");
const OK_PREFIX = "ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V1_1_OK";
const FAILED_PREFIX = "ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V1_1_FAILED";

function isExactOrEqualsOption(value, option) {
  if (typeof value !== "string" || value.length < option.length) return false;
  for (let index = 0; index < option.length; index += 1) {
    if (value[index] !== option[index]) return false;
  }
  return value.length === option.length || value[option.length] === "=";
}

function visiblePreloadFailureCode() {
  const nodeOptions = process.env.NODE_OPTIONS;
  if (nodeOptions !== undefined || process.env.NODE_PATH !== undefined) {
    return "VISIBLE_PRELOAD_ENVIRONMENT_FORBIDDEN";
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if ((typeof argument === "string" && argument.length >= 2
        && argument[0] === "-" && argument[1] === "r")
      || isExactOrEqualsOption(argument, "--require")
      || isExactOrEqualsOption(argument, "--import")
      || isExactOrEqualsOption(argument, "--loader")
      || isExactOrEqualsOption(argument, "--experimental-loader")) {
      return "VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN";
    }
  }
  return null;
}

function isDirectExecution() {
  return typeof process.argv[1] === "string"
    && path.resolve(process.argv[1]) === MODULE_PATH;
}

function assertNarrowInvocation() {
  if (process.argv.length !== 2) throw new Error("CLI_OPERANDS_FORBIDDEN");
  const preloadFailureCode = visiblePreloadFailureCode();
  if (preloadFailureCode !== null) throw new Error(preloadFailureCode);
}

export async function main() {
  assertNarrowInvocation();
  const {
    getZiweiSameArtifactBrowserObservationChildV11Summary,
    isVerifiedZiweiSameArtifactBrowserObservationChildV11,
    loadZiweiSameArtifactBrowserObservationChildV11
  } = await import("./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs");
  const child = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
  if (!isVerifiedZiweiSameArtifactBrowserObservationChildV11(child)) {
    throw new Error("PRIVATE_CHILD_BRAND_REQUIRED");
  }
  const summary = getZiweiSameArtifactBrowserObservationChildV11Summary(child);
  process.stdout.write(`${OK_PREFIX} ${JSON.stringify(summary)}\n`);
  return 0;
}

const preloadFailureCode = visiblePreloadFailureCode();
if (preloadFailureCode !== null) {
  process.stderr.write(`${FAILED_PREFIX} ${preloadFailureCode}\n`);
  process.exitCode = 1;
} else if (isDirectExecution()) {
  main().catch((error) => {
    const code = typeof error?.code === "string"
      ? error.code
      : typeof error?.message === "string" && /^[A-Z0-9_]+$/u.test(error.message)
        ? error.message
        : "VERIFICATION_FAILED";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    process.exitCode = 1;
  });
}
