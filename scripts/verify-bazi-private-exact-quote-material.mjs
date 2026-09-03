import path from "node:path";
import { types as utilTypes } from "node:util";
import { fileURLToPath } from "node:url";
import { verifyBaziPrivateExactQuoteMaterialFromFiles } from "./bazi-private-exact-quote-material-verifier-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  const error = new Error(message);
  Object.defineProperty(error, "safeForCli", {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false
  });
  throw error;
}

function safeCliMessage(error) {
  if (!utilTypes.isNativeError(error)) return null;
  const safeDescriptor = Object.getOwnPropertyDescriptor(error, "safeForCli");
  const messageDescriptor = Object.getOwnPropertyDescriptor(error, "message");
  if (safeDescriptor === undefined || !("value" in safeDescriptor) || safeDescriptor.value !== true) return null;
  if (messageDescriptor === undefined || !("value" in messageDescriptor)
    || typeof messageDescriptor.value !== "string") return null;
  return messageDescriptor.value;
}

function parseArguments(argv) {
  const allowed = new Set(["--private-root", "--request"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || typeof value !== "string" || !value) {
      fail(
        "Usage: node scripts/verify-bazi-private-exact-quote-material.mjs "
        + "--private-root <absolute-private-directory> --request <relative-request.json>"
      );
    }
    if (values.has(flag)) fail(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  if (!values.has("--private-root") || !values.has("--request")) {
    fail("--private-root and --request are required");
  }
  return Object.freeze({
    privateRoot: values.get("--private-root"),
    requestRelativePath: values.get("--request")
  });
}

try {
  const args = parseArguments(process.argv.slice(2));
  const receipt = await verifyBaziPrivateExactQuoteMaterialFromFiles({
    workspaceRoot,
    privateRoot: args.privateRoot,
    requestRelativePath: args.requestRelativePath
  });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} catch (error) {
  const message = safeCliMessage(error)
    ?? "PRIVATE_EXACT_QUOTE_VERIFICATION_FAILED: verification failed closed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
