#!/usr/bin/env node

import {
  loadBaziDttVersionedParentSupersession
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

try {
  const result = await loadBaziDttVersionedParentSupersession(process.cwd());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
