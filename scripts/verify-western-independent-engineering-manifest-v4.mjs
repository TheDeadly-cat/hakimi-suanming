import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WesternIndependentEngineeringManifestV4Error,
  getWesternIndependentEngineeringManifestV4Summary,
  loadWesternIndependentEngineeringManifestV4
} from "./western-independent-engineering-manifest-v4-lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function run({ argv = process.argv, execArgv = process.execArgv, env = process.env,
  stdout = process.stdout, stderr = process.stderr } = {}) {
  if (argv.length !== 2 || execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS")
      || Object.hasOwn(env, "NODE_PATH")) { stderr.write("WESTERN_MANIFEST_V4_INVOCATION_FORBIDDEN\n"); return 2; }
  try {
    const result = await loadWesternIndependentEngineeringManifestV4(root);
    stdout.write(`${JSON.stringify({ status: result.manifest.status,
      artifact: result.artifact, ...getWesternIndependentEngineeringManifestV4Summary(result) })}\n`); return 0;
  } catch (error) {
    stderr.write(`${error instanceof WesternIndependentEngineeringManifestV4Error
      ? error.code : "WESTERN_MANIFEST_V4_INTERNAL_FAILURE"}\n`); return 1;
  }
}
if (import.meta.main) process.exitCode = await run();
