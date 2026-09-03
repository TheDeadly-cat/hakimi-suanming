#!/usr/bin/env node

import {
  buildDeployedPwaVerificationFailure,
  verifyDeployedPwaEvidence
} from "./deployed-pwa-evidence-lib.mjs";

function parseArguments(argv) {
  if (argv.length === 0) return Object.freeze({ inputPath: null });
  if (argv.length !== 2 || argv[0] !== "--input" || argv[1].length === 0) {
    throw new Error(
      "Usage: node scripts/verify-deployed-pwa-evidence.mjs [--input <deployed-pwa-evidence.json>]"
    );
  }
  return Object.freeze({ inputPath: argv[1] });
}

let args = Object.freeze({ inputPath: null });
try {
  args = parseArguments(process.argv.slice(2));
  const result = await verifyDeployedPwaEvidence({
    cwd: process.cwd(),
    inputPath: args.inputPath
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.strictGatePassed) process.exitCode = 1;
} catch (error) {
  const failure = buildDeployedPwaVerificationFailure({
    inputPath: args.inputPath,
    error
  });
  process.stdout.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
}
