#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";
import { realpathSync } from "node:fs";

const OK_PREFIX = "BAZI_PR10A_PRIVATE_FILE_RUNNER_OK";
const FAILED_PREFIX = "BAZI_PR10A_PRIVATE_FILE_RUNNER_FAILED";
const ROOT_ENVIRONMENT_NAME = "HAKIMI_BAZI_PR10A_PRIVATE_ROOT";
const CLI_PATH = fileURLToPath(import.meta.url);
const normalizePath = (value) => process.platform === "win32" ? value.toLowerCase() : value;
const argvEntryPath = typeof process.argv[1] === "string" ? path.resolve(process.argv[1]) : null;
const IS_DIRECT_ENTRY = argvEntryPath !== null
  && normalizePath(argvEntryPath) === normalizePath(CLI_PATH);
let IS_ALIASED_DIRECT_ENTRY = false;
if (!IS_DIRECT_ENTRY && argvEntryPath !== null) {
  try {
    IS_ALIASED_DIRECT_ENTRY = normalizePath(realpathSync(argvEntryPath))
      === normalizePath(realpathSync(CLI_PATH));
  } catch {
    IS_ALIASED_DIRECT_ENTRY = false;
  }
}

const FORBIDDEN_EXEC_ARG_PREFIXES = [
  "--experimental-loader", "--import", "--loader", "--preserve-symlinks",
  "--preserve-symlinks-main", "--require", "-r"
];

function hasFlagPrefix(argument, prefix) {
  if (prefix === "-r") return argument === "-r" || (argument.startsWith("-r") && argument.length > 2);
  return argument === prefix || argument.startsWith(`${prefix}=`);
}

function visibleInjectionStatePresent() {
  for (const key of Object.keys(process.env)) {
    const upper = key.toUpperCase();
    if ((upper === "NODE_OPTIONS" || upper === "NODE_PATH" || upper === "NPM_CONFIG_NODE_OPTIONS")
      && typeof process.env[key] === "string" && process.env[key] !== "") return true;
  }
  return process.execArgv.some((argument) => (
    typeof argument === "string" && FORBIDDEN_EXEC_ARG_PREFIXES.some((prefix) => hasFlagPrefix(argument, prefix))
  ));
}

function fail(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

export async function main() {
  if (process.argv.length !== 2) {
    fail("CLI_ARGUMENTS_FORBIDDEN");
    return;
  }
  if (visibleInjectionStatePresent()) {
    fail("VISIBLE_NODE_INJECTION_STATE_FORBIDDEN");
    return;
  }
  const privateRoot = process.env[ROOT_ENVIRONMENT_NAME];
  if (typeof privateRoot !== "string" || privateRoot.length === 0 || privateRoot.includes("\0")) {
    fail("PRIVATE_ROOT_ENVIRONMENT_REQUIRED");
    return;
  }
  try {
    const {
      isVerifiedBaziPr10aPrivateFileRunnerReceipt,
      safeBaziPr10aPrivateFileRunnerCliCode,
      verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot
    } = await import("./bazi-private-exact-quote-pr10a-current-line-file-runner-lib.mjs");
    try {
      const receipt = await verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot(privateRoot);
      if (!isVerifiedBaziPr10aPrivateFileRunnerReceipt(receipt)) {
        fail("PRODUCTION_RECEIPT_BRAND_REQUIRED");
        return;
      }
      process.stdout.write(`${OK_PREFIX} ${JSON.stringify(receipt)}\n`);
    } catch (error) {
      fail(safeBaziPr10aPrivateFileRunnerCliCode(error));
    }
  } catch {
    fail("VERIFICATION_FAILED");
  }
}

if (IS_ALIASED_DIRECT_ENTRY) fail("CLI_ENTRY_ALIAS_FORBIDDEN");
else if (IS_DIRECT_ENTRY) await main();
