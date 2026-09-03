import { realpathSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  runWesternIsolatedBuildLicenseNoticeVerification
} from "./western-isolated-build-license-notice-lib.mjs";

const scriptPath = realpathSync(fileURLToPath(import.meta.url));
export { runWesternIsolatedBuildLicenseNoticeVerification };

const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (invokedPath === scriptPath) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== "--print-evidence-template")) {
      throw new Error("Usage: node scripts/verify-western-isolated-build-license-notices.mjs [--print-evidence-template]");
    }
    const result = runWesternIsolatedBuildLicenseNoticeVerification({
      evidenceMode: args[0] === "--print-evidence-template" ? "template" : "verify"
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 1;
  }
}
