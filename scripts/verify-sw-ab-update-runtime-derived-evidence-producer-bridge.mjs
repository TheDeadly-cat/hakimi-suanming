#!/usr/bin/env node

import path from "node:path";

import {
  buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure,
  failSwAbRuntimeDerivedEvidenceProducerBridge
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs";

function parseArguments(argv) {
  if (
    argv.length !== 4
    || argv[0] !== "--issuance-run-root"
    || argv[2] !== "--bridge-root"
    || typeof argv[1] !== "string"
    || typeof argv[3] !== "string"
    || argv[1].length === 0
    || argv[3].length === 0
    || argv[1].trim() !== argv[1]
    || argv[3].trim() !== argv[3]
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "INPUT_INVALID",
      "cli",
      "Expected exactly --issuance-run-root <directory> --bridge-root <directory>."
    );
  }
  return Object.freeze({
    issuanceRunRoot: path.resolve(argv[1]),
    bridgeRoot: path.resolve(argv[3])
  });
}

let output;
try {
  const parsed = parseArguments(process.argv.slice(2));
  output = (await loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge({
    cwd: process.cwd(),
    bindingRoot: process.cwd(),
    issuanceRunRoot: parsed.issuanceRunRoot,
    bridgeRoot: parsed.bridgeRoot
  })).result;
} catch (error) {
  output = buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure(error);
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = 1;
