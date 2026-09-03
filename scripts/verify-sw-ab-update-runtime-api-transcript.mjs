#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbUpdateRuntimeApiTranscriptFailure
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--bundle" || argv[1].trim() !== argv[1]) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_ARGUMENTS_REQUIRED: expected exactly --bundle <directory>."
    );
  }
  return path.resolve(argv[1]);
}

let output;
try {
  const bundleDirectory = parseArguments(process.argv.slice(2));
  output = (await loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle({
    cwd: process.cwd(),
    bindingRoot: process.cwd(),
    bundleDirectory
  })).result;
} catch (error) {
  output = buildSwAbUpdateRuntimeApiTranscriptFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
