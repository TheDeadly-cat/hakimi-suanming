import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WesternSameArtifactV11Error,
  loadWesternSameArtifactV11Candidate,
  summarizeWesternSameArtifactV11Candidate
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function run({ argv = process.argv, execArgv = process.execArgv, env = process.env,
  stdout = process.stdout, stderr = process.stderr } = {}) {
  if (argv.length !== 2) { stderr.write("WESTERN_SAME_ARTIFACT_V1_1_OPERANDS_FORBIDDEN\n"); return 2; }
  if (execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("WESTERN_SAME_ARTIFACT_V1_1_NODE_ENV_FORBIDDEN\n"); return 2;
  }
  try {
    const candidate = loadWesternSameArtifactV11Candidate(workspaceRoot);
    stdout.write(`${JSON.stringify({ status: candidate.status,
      ...summarizeWesternSameArtifactV11Candidate(candidate) })}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error instanceof WesternSameArtifactV11Error ? error.code : "WESTERN_SAME_ARTIFACT_V1_1_INTERNAL_FAILURE"}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = run();
