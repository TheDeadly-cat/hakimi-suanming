#!/usr/bin/env node

import { verifyBaziNonDttThreeCarrierByteObservation } from "./bazi-nondtt-three-carrier-byte-observation-lib.mjs";

try {
  const result = await verifyBaziNonDttThreeCarrierByteObservation(process.cwd());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
