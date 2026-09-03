#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbUpdateCandidateRuntimeClientCaptureCompositionFailure,
  composeSwAbUpdateCandidateRuntimeClientCapture
} from "./sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs";

const FLAGS = Object.freeze(new Map([
  ["--binding-root", "bindingRoot"],
  ["--candidate-input", "candidateInputPath"],
  ["--attachments-root", "attachmentsRoot"],
  ["--private-root", "privateRoot"],
  ["--artifact-a-root", "artifactARoot"],
  ["--artifact-b-root", "artifactBRoot"],
  ["--runtime-capture-input", "runtimeCaptureInputPath"]
]));

function parseArguments(argv) {
  const values = {};
  if (argv.length !== FLAGS.size * 2) {
    throw new Error("SW_AB_COMPOSITION_ARGUMENTS_INVALID: expected exactly seven path bindings.");
  }
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const key = FLAGS.get(flag);
    if (
      !key
      || typeof value !== "string"
      || value.length === 0
      || value.trim() !== value
      || Object.hasOwn(values, key)
    ) {
      throw new Error("SW_AB_COMPOSITION_ARGUMENTS_INVALID: path bindings are missing or repeated.");
    }
    values[key] = path.resolve(value);
  }
  return values;
}

let output;
try {
  output = await composeSwAbUpdateCandidateRuntimeClientCapture(
    parseArguments(process.argv.slice(2)),
    { cwd: process.cwd() }
  );
} catch (error) {
  output = buildSwAbUpdateCandidateRuntimeClientCaptureCompositionFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;

