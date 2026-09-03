#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_OK";
const FAILED_PREFIX = "BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_FAILED";
const CLI_PATH = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(CLI_PATH), "..");
const IS_DIRECT_ENTRY = typeof process.argv[1] === "string"
  && path.resolve(process.argv[1]) === CLI_PATH;
const FORBIDDEN_EXEC_ARG_PREFIXES = [
  "--experimental-loader", "--import", "--loader", "--require", "-r"
];

function hasExactFlagPrefix(argument, prefix) {
  if (argument.length < prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (argument[index] !== prefix[index]) return false;
  }
  return argument.length === prefix.length
    || prefix === "-r"
    || argument[prefix.length] === "=";
}

function visibleLoaderInjectionPresent() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument !== "string") continue;
    for (let prefixIndex = 0; prefixIndex < FORBIDDEN_EXEC_ARG_PREFIXES.length; prefixIndex += 1) {
      if (hasExactFlagPrefix(argument, FORBIDDEN_EXEC_ARG_PREFIXES[prefixIndex])) return true;
    }
  }
  return false;
}

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

export async function main() {
  if (process.argv.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
    return;
  }
  if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
    return;
  }
  try {
    const {
      isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
      loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
      summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor
    } = await import("./bazi-private-exact-quote-smt-v2-current-line-successor-lib.mjs");
    const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
    if (!isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability)) {
      throw new Error("PRIVATE_BRAND_REQUIRED");
    }
    const summary = summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability);
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(summary)}\n`);
  } catch {
    writeFailure("VERIFICATION_FAILED");
  }
}

if (IS_DIRECT_ENTRY) await main();
