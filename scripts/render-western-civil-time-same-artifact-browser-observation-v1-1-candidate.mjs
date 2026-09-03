import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { westernSameArtifactTestOnly } from
  "./western-civil-time-same-artifact-browser-observation-lib.mjs";
import {
  buildExpectedWesternSameArtifactV11Candidate,
  serializeWesternSameArtifactV11Candidate
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

const workspaceRoot = realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));

function exactSystemTempFile(value, mustExist) {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw new Error("absolute system-temp file required");
  const resolved = path.resolve(value);
  const systemTemp = realpathSync.native(os.tmpdir());
  if (path.dirname(resolved).toLowerCase() !== systemTemp.toLowerCase()) throw new Error("direct system-temp file required");
  if (mustExist) {
    const stat = lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink() || realpathSync.native(resolved).toLowerCase() !== resolved.toLowerCase()) {
      throw new Error("runtime observation input identity invalid");
    }
  } else if (existsSync(resolved)) throw new Error("candidate output must not exist");
  return resolved;
}

export function renderWesternSameArtifactV11Candidate(root, observation) {
  const candidate = buildExpectedWesternSameArtifactV11Candidate(root, observation);
  return { candidate, serialized: serializeWesternSameArtifactV11Candidate(candidate) };
}

export function main(argv = process.argv) {
  if (argv.length !== 4 || process.execArgv.length !== 0
      || Object.hasOwn(process.env, "NODE_OPTIONS") || Object.hasOwn(process.env, "NODE_PATH")) {
    throw new Error("exact input and output operands with no loader injection required");
  }
  const input = exactSystemTempFile(argv[2], true);
  const output = exactSystemTempFile(argv[3], false);
  const observation = westernSameArtifactTestOnly.parseStrictJsonBytes(readFileSync(input), "v1.1 runtime observation");
  const rendered = renderWesternSameArtifactV11Candidate(workspaceRoot, observation);
  writeFileSync(output, rendered.serialized, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: "rendered", output, observationDigest: rendered.candidate.observationDigest,
    authorityRaised: false })}\n`);
}

if (import.meta.main) {
  try { main(); } catch (error) {
    process.stderr.write("WESTERN_SAME_ARTIFACT_V1_1_RENDER_FAILED_CLOSED\n");
    process.exitCode = 1;
  }
}
