#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_OK";
const FAILED_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_FAILED";
const PRELOAD_REJECTED = "VISIBLE_PRELOAD_OPTIONS_REJECTED";
const FORBIDDEN_EXEC_OPTIONS = [
  "-r",
  "--require",
  "--import",
  "--loader",
  "--experimental-loader"
];

function isOptionOrEqualsForm(value, option) {
  if (value === option) return true;
  if (
    typeof value !== "string"
    || value.length <= option.length
    || value[option.length] !== "="
  ) {
    return false;
  }
  for (let index = 0; index < option.length; index += 1) {
    if (value[index] !== option[index]) return false;
  }
  return true;
}

function visiblePreloadRejection() {
  if (
    typeof process.env.NODE_OPTIONS === "string"
    && process.env.NODE_OPTIONS !== ""
  ) {
    return PRELOAD_REJECTED;
  }
  if (typeof process.env.NODE_PATH === "string") {
    return PRELOAD_REJECTED;
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const value = process.execArgv[index];
    for (
      let optionIndex = 0;
      optionIndex < FORBIDDEN_EXEC_OPTIONS.length;
      optionIndex += 1
    ) {
      if (
        isOptionOrEqualsForm(
          value,
          FORBIDDEN_EXEC_OPTIONS[optionIndex]
        )
      ) {
        return PRELOAD_REJECTED;
      }
    }
  }
  return null;
}

function modulePathAfterPreloadCheck() {
  return fileURLToPath(import.meta.url);
}

function isDirectExecution(modulePath) {
  return typeof process.argv[1] === "string"
    && path.resolve(process.argv[1]) === path.resolve(modulePath);
}

function assertNarrowInvocation() {
  const preload = visiblePreloadRejection();
  if (preload !== null) throw new Error(preload);
  if (process.argv.length !== 2) {
    throw new Error("CLI_ARGUMENTS_REJECTED");
  }
}

export async function main() {
  assertNarrowInvocation();
  const modulePath = modulePathAfterPreloadCheck();
  const projectRoot = path.resolve(path.dirname(modulePath), "..");
  const {
    getFourSystemCurrentStatusObservationChildV27Summary,
    isVerifiedFourSystemCurrentStatusObservationChildV27,
    loadFourSystemCurrentStatusObservationChildV27
  } = await import("./four-system-current-status-observation-child-v2-7-lib.mjs");
  const result =
    await loadFourSystemCurrentStatusObservationChildV27(projectRoot);
  if (!isVerifiedFourSystemCurrentStatusObservationChildV27(result)) {
    throw new Error("PRIVATE_BRAND_REQUIRED");
  }
  const summary =
    getFourSystemCurrentStatusObservationChildV27Summary(result);
  process.stdout.write(OK_PREFIX + " " + JSON.stringify(summary) + "\n");
}

const preloadAtDispatch = visiblePreloadRejection();
if (preloadAtDispatch !== null) {
  process.stderr.write(
    FAILED_PREFIX + " " + PRELOAD_REJECTED + "\n"
  );
  process.exitCode = 1;
} else {
  const modulePath = modulePathAfterPreloadCheck();
  if (isDirectExecution(modulePath)) {
    main().catch((error) => {
      const code =
        typeof error?.message === "string"
        && /^[A-Z0-9_]+$/u.test(error.message)
          ? error.message
          : "VERIFICATION_FAILED";
      process.stderr.write(FAILED_PREFIX + " " + code + "\n");
      process.exitCode = 1;
    });
  }
}



