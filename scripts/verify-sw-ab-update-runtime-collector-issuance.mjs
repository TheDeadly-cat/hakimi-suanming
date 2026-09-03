#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbRuntimeCollectorIssuanceFailure,
  failSwAbRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";

function parseArguments(argv) {
  if (
    argv.length !== 2
    || argv[0] !== "--run-root"
    || typeof argv[1] !== "string"
    || argv[1].length === 0
    || argv[1].trim() !== argv[1]
  ) {
    failSwAbRuntimeCollectorIssuance(
      "INPUT_INVALID",
      "cli",
      "Expected exactly --run-root <absolute-or-relative-directory>."
    );
  }
  return path.resolve(argv[1]);
}

let output;
try {
  const runRoot = parseArguments(process.argv.slice(2));
  output = (await loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
    cwd: process.cwd(),
    bindingRoot: process.cwd(),
    runRoot
  })).result;
} catch (error) {
  output = buildSwAbRuntimeCollectorIssuanceFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
