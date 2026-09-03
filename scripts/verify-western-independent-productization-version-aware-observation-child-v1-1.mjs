#!/usr/bin/env node

import {
  loadWesternProductizationVersionAwareObservationChildV11
} from "./western-independent-productization-version-aware-observation-child-v1-1-lib.mjs";

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    code: "CLI_OPERANDS_FORBIDDEN",
    message: "Western v1.1 observation child verifier 不接受 operands。"
  })}\n`);
  process.exitCode = 1;
} else {
  try {
    const result = await loadWesternProductizationVersionAwareObservationChildV11(
      process.cwd()
    );
    process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      code: error?.code ?? "WESTERN_V11_OBSERVATION_CHILD_FAILED",
      message: error?.message ?? String(error)
    })}\n`);
    process.exitCode = 1;
  }
}
