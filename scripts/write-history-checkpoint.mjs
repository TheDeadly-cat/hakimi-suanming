#!/usr/bin/env node

import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

const forbiddenEnvironmentKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenExecArgPrefixes = ["--experimental-loader", "--import", "--loader", "--require", "-r"];

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

function assertInvocation() {
  if (process.argv.length !== 3 || process.argv[2] !== "--write") {
    fail("WRITE_CONFIRMATION_REQUIRED",
      "history-checkpoint writer requires the exact --write operand");
  }
  for (const key of forbiddenEnvironmentKeys) {
    if (typeof process.env[key] === "string") fail("PRELOAD_ENVIRONMENT_FORBIDDEN", key);
  }
  for (const argument of process.execArgv) {
    if (isForbiddenExecArgument(argument)) fail("PRELOAD_ENVIRONMENT_FORBIDDEN", argument);
  }
}

try {
  assertInvocation();
  const {
    buildExpectedHistoryCheckpoint,
    HISTORY_CHECKPOINT_RELATIVE_PATH,
    serializeHistoryCheckpoint
  } = await import("./history-checkpoint-lib.mjs");
  const workspaceRoot = path.resolve(import.meta.dirname, "..");
  const target = path.resolve(
    workspaceRoot,
    ...HISTORY_CHECKPOINT_RELATIVE_PATH.split("/")
  );
  const [realRoot, realTarget] = await Promise.all([
    realpath(workspaceRoot),
    realpath(target)
  ]);
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  if (normalize(realRoot) !== normalize(workspaceRoot)
    || normalize(realTarget) !== normalize(target)) {
    fail("WRITE_TARGET_INVALID",
      "history-checkpoint target must be the existing non-aliased workspace file");
  }
  const handle = await open(target, "r+");
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n) {
      fail("WRITE_TARGET_INVALID",
        "history-checkpoint target must be a single-link regular file");
    }
    const value = await buildExpectedHistoryCheckpoint(workspaceRoot);
    const text = serializeHistoryCheckpoint(value);
    const bytes = Buffer.from(text, "utf8");
    await handle.truncate(0);
    await handle.writeFile(bytes);
    await handle.sync();
    process.stdout.write(`HISTORY_CHECKPOINT_WRITTEN ${JSON.stringify({
      path: HISTORY_CHECKPOINT_RELATIVE_PATH,
      rawBytes: bytes.length,
      rawSha256: createHash("sha256").update(bytes).digest("hex"),
      familyInventoryDigest: value.familyInventoryDigest,
      historyRootDigest: value.historyRootDigest,
      checkpointDigest: value.checkpointDigest
    })}\n`);
  } finally {
    await handle.close();
  }
} catch (reason) {
  process.stderr.write(
    `${reason instanceof Error ? reason.message : "history-checkpoint write failed"}\n`
  );
  process.exitCode = 1;
}
