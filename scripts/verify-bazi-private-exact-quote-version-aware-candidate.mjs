import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles,
  safeBaziPrivateExactQuoteVersionAwareCandidateCliMessage
} from "./bazi-private-exact-quote-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = "USAGE_INVALID: verification failed closed";

function parseArguments(argv) {
  if (!Array.isArray(argv) || argv.length !== 4) throw new Error(usage);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if ((flag !== "--private-root" && flag !== "--request")
      || typeof value !== "string"
      || value.length === 0
      || values.has(flag)) {
      throw new Error(usage);
    }
    values.set(flag, value);
  }
  if (!values.has("--private-root") || !values.has("--request")) throw new Error(usage);
  return Object.freeze({
    privateRoot: values.get("--private-root"),
    requestRelativePath: values.get("--request")
  });
}

try {
  const args = parseArguments(process.argv.slice(2));
  const receipt = await verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
    workspaceRoot,
    privateRoot: args.privateRoot,
    requestRelativePath: args.requestRelativePath
  });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} catch (error) {
  const safeMessage = safeBaziPrivateExactQuoteVersionAwareCandidateCliMessage(error)
    ?? (error?.message === usage ? usage : "PRIVATE_EXACT_QUOTE_CURRENT_CANDIDATE_FAILED: verification failed closed");
  process.stderr.write(`${safeMessage}\n`);
  process.exitCode = 1;
}
