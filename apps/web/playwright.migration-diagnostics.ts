import { mkdirSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Only diagnostic output belongs here; persistent profiles use their own temporary roots. */
export function migrationDiagnosticOutput(suite: string): { testResults: string; jsonReport: string } {
  if (!/^[a-z0-9-]+$/u.test(suite)) throw new Error("Invalid migration diagnostic suite.");
  const suppliedRoot = process.env.HAKIMI_MIGRATION_EVIDENCE_DIR;
  if (suppliedRoot && !path.isAbsolute(suppliedRoot)) {
    throw new Error("Migration diagnostics require an absolute output directory.");
  }
  const root = suppliedRoot ?? mkdtempSync(path.join(os.tmpdir(), `hakimi-${suite}-diagnostics-`));
  mkdirSync(root, { recursive: true });
  return {
    testResults: path.join(root, "test-results"),
    jsonReport: path.join(root, "results.json")
  };
}
