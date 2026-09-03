#!/usr/bin/env node

import path from "node:path";

import {
  buildRollbackVerificationFailure,
  verifyRollbackEvidence
} from "./rollback-evidence-lib.mjs";

function parseArguments(argv) {
  const allowed = new Set([
    "--input",
    "--baseline-root",
    "--candidate-root",
    "--receipts-root",
    "--private-root"
  ]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(name) || typeof value !== "string" || value.length === 0) {
      throw new Error(
        "Usage: node scripts/verify-rollback-evidence.mjs "
        + "--input <rollback-evidence.json> "
        + "--baseline-root <artifact-root> "
        + "--candidate-root <artifact-root> "
        + "--receipts-root <receipt-root> "
        + "--private-root <private-root>"
      );
    }
    if (values.has(name)) throw new Error(`Duplicate CLI option: ${name}`);
    values.set(name, value);
  }
  if (values.size !== allowed.size) throw new Error("All rollback verifier CLI options are required exactly once.");
  return Object.freeze({
    inputPath: path.resolve(values.get("--input")),
    baselineRoot: path.resolve(values.get("--baseline-root")),
    candidateRoot: path.resolve(values.get("--candidate-root")),
    receiptsRoot: path.resolve(values.get("--receipts-root")),
    privateRoot: path.resolve(values.get("--private-root"))
  });
}

let args = null;
try {
  args = parseArguments(process.argv.slice(2));
  const result = await verifyRollbackEvidence({
    cwd: process.cwd(),
    ...args
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const failure = buildRollbackVerificationFailure({
    inputPath: args?.inputPath ?? null,
    error
  });
  process.stdout.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
}

