#!/usr/bin/env node

import {
  buildSwAbUpdateCandidateFailure,
  SwAbUpdateCandidateVerificationError,
  verifySwAbUpdateCandidate
} from "./sw-ab-update-candidate-lib.mjs";

const USAGE =
  "Usage: node scripts/verify-sw-ab-update-candidate.mjs --input <path> --attachments-root <path> --private-root <path> --artifact-a-root <path> --artifact-b-root <path>";

function invalidArguments() {
  return new SwAbUpdateCandidateVerificationError(
    "arguments",
    "SW_AB_UPDATE_ARGUMENTS_INVALID",
    USAGE
  );
}

function parseArguments(argv) {
  const mapping = new Map([
    ["--input", "inputPath"],
    ["--attachments-root", "attachmentsRoot"],
    ["--private-root", "privateRoot"],
    ["--artifact-a-root", "artifactARoot"],
    ["--artifact-b-root", "artifactBRoot"]
  ]);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const key = mapping.get(flag);
    if (!key || typeof value !== "string" || value.length === 0 || key in values) {
      throw invalidArguments();
    }
    values[key] = value;
  }
  if (argv.length !== mapping.size * 2 || Object.keys(values).length !== mapping.size) {
    throw invalidArguments();
  }
  return Object.freeze(values);
}

try {
  const args = parseArguments(process.argv.slice(2));
  const result = await verifySwAbUpdateCandidate({ cwd: process.cwd(), ...args });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify(buildSwAbUpdateCandidateFailure(error), null, 2)}\n`);
  process.exitCode = 1;
}
