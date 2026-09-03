#!/usr/bin/env node

import path from "node:path";

import {
  buildRollbackProviderSequenceCompositionFailure,
  composeRollbackProviderSequenceCandidate
} from "./rollback-provider-sequence-composition-lib.mjs";

const FLAGS = Object.freeze(new Map([
  ["--binding-root", "bindingRoot"],
  ["--rollback-evidence-root", "rollbackEvidenceRoot"],
  ["--rollback-evidence", "rollbackEvidencePath"],
  ["--rollback-receipts-root", "rollbackReceiptsRoot"],
  ["--provider-deploy-output-root", "deployOutputRoot"],
  ["--provider-deploy-receipt", "deployReceiptPath"],
  ["--provider-restore-output-root", "restoreOutputRoot"],
  ["--provider-restore-receipt", "restoreReceiptPath"],
  ["--provider-sequence-output-root", "sequenceOutputRoot"],
  ["--provider-sequence", "sequencePath"]
]));

function parseArguments(argv) {
  if (argv.length !== FLAGS.size * 2) {
    throw new Error(
      "ROLLBACK_PROVIDER_COMPOSITION_ARGUMENTS_INVALID: expected exactly ten path bindings."
    );
  }
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const key = FLAGS.get(flag);
    if (
      key === undefined
      || typeof value !== "string"
      || value.length === 0
      || value.trim() !== value
      || Object.hasOwn(values, key)
    ) {
      throw new Error(
        "ROLLBACK_PROVIDER_COMPOSITION_ARGUMENTS_INVALID: path bindings are missing, unknown, or repeated."
      );
    }
    values[key] = path.resolve(value);
  }
  return values;
}

let output;
try {
  output = await composeRollbackProviderSequenceCandidate(
    parseArguments(process.argv.slice(2)),
    { cwd: process.cwd() }
  );
} catch (error) {
  output = buildRollbackProviderSequenceCompositionFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
