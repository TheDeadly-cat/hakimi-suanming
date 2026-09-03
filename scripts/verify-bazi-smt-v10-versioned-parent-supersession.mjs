#!/usr/bin/env node

import {
  loadBaziSmtV10VersionedParentSupersession,
  writeBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";

try {
  const write = process.argv.slice(2).includes("--write");
  const result = write
    ? await writeBaziSmtV10VersionedParentSupersession(process.cwd())
    : await loadBaziSmtV10VersionedParentSupersession(process.cwd());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
