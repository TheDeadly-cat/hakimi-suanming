import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

import {
  CURRENT_INDEX_RELATIVE_PATH,
  buildExpectedIndex,
  serializeCurrentIndex
} from "./current-index-lib.mjs";
import { loadHistoryCheckpoint } from "./history-checkpoint-lib.mjs";

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
    fail("WRITE_CONFIRMATION_REQUIRED", "current-index writer requires the exact --write operand");
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
  const workspaceRoot = path.resolve(import.meta.dirname, "..");
  const target = path.resolve(workspaceRoot, ...CURRENT_INDEX_RELATIVE_PATH.split("/"));
  const [realRoot, realTarget] = await Promise.all([realpath(workspaceRoot), realpath(target)]);
  if (realRoot !== workspaceRoot || realTarget !== target) {
    fail("WRITE_TARGET_INVALID", "current-index target must be the existing non-aliased workspace file");
  }
  const handle = await open(target, "r+");
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n) {
      fail("WRITE_TARGET_INVALID", "current-index target must be a single-link regular file");
    }
    await loadHistoryCheckpoint(workspaceRoot);
    const value = await buildExpectedIndex(workspaceRoot);
    const text = serializeCurrentIndex(value);
    const bytes = Buffer.from(text, "utf8");
    await handle.truncate(0);
    await handle.writeFile(bytes);
    await handle.sync();
    process.stdout.write(`CURRENT_INDEX_WRITTEN ${JSON.stringify({
      path: CURRENT_INDEX_RELATIVE_PATH,
      rawBytes: bytes.length,
      rawSha256: createHash("sha256").update(bytes).digest("hex"),
      indexDigest: value.indexDigest
    })}\n`);
  } finally {
    await handle.close();
  }
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "current-index write failed"}\n`);
  process.exitCode = 1;
}
