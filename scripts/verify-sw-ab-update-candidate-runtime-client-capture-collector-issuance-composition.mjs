#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbFourChainCompositionFailure,
  composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuance
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs";

const FLAGS = Object.freeze(new Map([
  ["--binding-root", "bindingRoot"],
  ["--candidate-input", "candidateInputPath"],
  ["--attachments-root", "attachmentsRoot"],
  ["--private-root", "privateRoot"],
  ["--artifact-a-root", "artifactARoot"],
  ["--artifact-b-root", "artifactBRoot"],
  ["--runtime-capture-input", "runtimeCaptureInputPath"],
  ["--issuance-run-root", "issuanceRunRoot"]
]));

function parseArguments(argv) {
  if (argv.length !== FLAGS.size * 2) {
    throw new Error("SW_AB_FOUR_CHAIN_ARGUMENTS_INVALID: expected exactly eight path bindings.");
  }
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = FLAGS.get(argv[index]);
    const value = argv[index + 1];
    if (
      key === undefined
      || typeof value !== "string"
      || value.length === 0
      || value.trim() !== value
      || Object.hasOwn(values, key)
    ) {
      throw new Error("SW_AB_FOUR_CHAIN_ARGUMENTS_INVALID: bindings are missing or repeated.");
    }
    values[key] = path.resolve(value);
  }
  return values;
}

let output;
try {
  output = await composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuance(
    parseArguments(process.argv.slice(2)),
    { cwd: process.cwd() }
  );
} catch (error) {
  output = buildSwAbFourChainCompositionFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
