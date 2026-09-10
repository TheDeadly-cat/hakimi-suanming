import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectCurrentIndependentScopeInventory,
  resolveCurrentIndependentScope
} from "./current-independent-scoped-lib.mjs";

const forbiddenEnvironmentKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenExecArgPrefixes = ["--experimental-loader", "--import", "--loader", "--require", "-r"];
const PATH_RESOLVE = path.resolve;

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function isForbiddenExecArgument(argument) {
  return forbiddenExecArgPrefixes.some((prefix) => argument === prefix
    || argument.startsWith(`${prefix}=`)
    || (prefix === "-r" && argument.startsWith("-r") && argument.length > 2));
}

async function assertInvocation(expectedModuleUrl) {
  if (process.argv.length !== 2) fail("ARGUMENTS_FORBIDDEN", "fixed current scope CLI accepts no operands");
  for (const key of forbiddenEnvironmentKeys) {
    if (typeof process.env[key] === "string") fail("PRELOAD_ENVIRONMENT_FORBIDDEN", key);
  }
  for (const argument of process.execArgv) {
    if (isForbiddenExecArgument(argument)) fail("PRELOAD_ENVIRONMENT_FORBIDDEN", argument);
  }
  const [invoked, expected] = await Promise.all([
    realpath(PATH_RESOLVE(process.argv[1])),
    realpath(fileURLToPath(expectedModuleUrl))
  ]);
  if (invoked !== expected) fail("ENTRYPOINT_IDENTITY_MISMATCH", "fixed current scope CLI entrypoint mismatch");
}

export async function runCurrentIndependentScopedCli({ scope, moduleUrl, successPrefix }) {
  try {
    await assertInvocation(moduleUrl);
    const result = await resolveCurrentIndependentScope(
      scope,
      PATH_RESOLVE(fileURLToPath(new URL("..", moduleUrl)))
    );
    process.stdout.write(`${successPrefix} ${JSON.stringify(result)}\n`);
  } catch (reason) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
      message: reason instanceof Error ? reason.message : "current independent scope verification failed",
      details: reason?.details ?? null
    })}\n`);
    process.exitCode = 1;
  }
}

export async function runCurrentIndependentInventoryCli({ scope, moduleUrl, successPrefix }) {
  try {
    await assertInvocation(moduleUrl);
    const result = await inspectCurrentIndependentScopeInventory(
      scope,
      PATH_RESOLVE(fileURLToPath(new URL("..", moduleUrl)))
    );
    process.stdout.write(`${successPrefix} ${JSON.stringify(result)}\n`);
  } catch (reason) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
      message: reason instanceof Error ? reason.message : "current independent scope verification failed",
      details: reason?.details ?? null
    })}\n`);
    process.exitCode = 1;
  }
}
