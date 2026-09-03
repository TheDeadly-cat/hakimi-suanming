import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WesternIndependentEngineeringManifestV3Error,
  getWesternIndependentEngineeringManifestV3Summary,
  loadWesternIndependentEngineeringManifestV3
} from "./western-independent-engineering-manifest-v3-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");

export async function runWesternIndependentEngineeringManifestV3Verifier({
  argv = process.argv,
  execArgv = process.execArgv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write("WESTERN_ENGINEERING_MANIFEST_V3_OPERANDS_FORBIDDEN\n");
    return 2;
  }
  if (execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("WESTERN_ENGINEERING_MANIFEST_V3_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const result = await loadWesternIndependentEngineeringManifestV3(workspaceRoot);
    const summary = getWesternIndependentEngineeringManifestV3Summary(result);
    stdout.write(`${JSON.stringify({
      status: result.manifest.status,
      ...summary
    })}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error instanceof WesternIndependentEngineeringManifestV3Error
      ? error.code
      : "WESTERN_ENGINEERING_MANIFEST_V3_INTERNAL_FAILURE"}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = await runWesternIndependentEngineeringManifestV3Verifier();
