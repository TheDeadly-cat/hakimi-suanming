#!/usr/bin/env node

import {
  buildDeployedPwaEvidenceV3Failure,
  DeployedPwaEvidenceV3VerificationError,
  verifyDeployedPwaEvidenceV3
} from "./deployed-pwa-evidence-v3-lib.mjs";

const USAGE =
  "Usage: node scripts/verify-deployed-pwa-evidence-v3.mjs --input <path> --artifact-root <path> --receipts-root <path> --private-root <path>";

function invalidArguments() {
  return new DeployedPwaEvidenceV3VerificationError(
    "arguments",
    "DEPLOYED_PWA_V3_ARGUMENTS_INVALID",
    USAGE
  );
}

function parseArguments(argv) {
  const mapping = new Map([
    ["--input", "inputPath"],
    ["--artifact-root", "artifactRoot"],
    ["--receipts-root", "receiptsRoot"],
    ["--private-root", "privateRoot"]
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
  if (Object.keys(values).length !== mapping.size || argv.length !== mapping.size * 2) {
    throw invalidArguments();
  }
  return Object.freeze(values);
}

try {
  const args = parseArguments(process.argv.slice(2));
  const result = await verifyDeployedPwaEvidenceV3({ cwd: process.cwd(), ...args });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify(buildDeployedPwaEvidenceV3Failure(error), null, 2)}\n`);
  process.exitCode = 1;
}
