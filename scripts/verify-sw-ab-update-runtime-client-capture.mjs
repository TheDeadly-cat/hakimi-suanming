#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbUpdateRuntimeClientCaptureFailure
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-loader.mjs";

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--input" || argv[1].trim() !== argv[1]) {
    throw new Error(
      "SW_AB_RUNTIME_CAPTURE_ARGUMENTS_INVALID: expected exactly --input <capture.json>."
    );
  }
  return path.resolve(argv[1]);
}

let output;
try {
  const inputPath = parseArguments(process.argv.slice(2));
  output = (await loadVerifiedSwAbUpdateRuntimeClientCapture({
    cwd: process.cwd(),
    bindingRoot: process.cwd(),
    inputPath
  })).result;
} catch (error) {
  output = buildSwAbUpdateRuntimeClientCaptureFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
