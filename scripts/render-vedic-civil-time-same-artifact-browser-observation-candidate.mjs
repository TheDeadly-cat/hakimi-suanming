import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VedicSameArtifactObservationError,
  buildExpectedVedicSameArtifactCandidate,
  serializeVedicSameArtifactCandidate,
  vedicSameArtifactTestOnly
} from "./vedic-civil-time-same-artifact-browser-observation-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDirectory, ".."));
const RUNTIME_FILE = /^hakimi-vedic-same-artifact-runtime-[a-f0-9-]{36}\.json$/u;
const CANDIDATE_FILE = /^hakimi-vedic-same-artifact-candidate-[a-f0-9-]{36}\.json$/u;

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function realTemporaryFilePath(value, leafPattern, mustExist) {
  if (typeof value !== "string" || !path.isAbsolute(value) || !leafPattern.test(path.basename(value))) {
    throw new Error("temporary evidence endpoint is invalid");
  }
  const canonical = path.resolve(value);
  const parent = path.dirname(canonical);
  const realParent = realpathSync.native(parent);
  const temporaryRoot = realpathSync.native(os.tmpdir());
  const relative = path.relative(temporaryRoot, realParent);
  if (!samePath(parent, realParent) || relative.length === 0 || relative.startsWith("..")
      || path.isAbsolute(relative) || existsSync(canonical) !== mustExist) {
    throw new Error("temporary evidence endpoint must be a new or existing regular system-temp child");
  }
  if (mustExist && !samePath(realpathSync.native(canonical), canonical)) {
    throw new Error("temporary evidence endpoint is an alias");
  }
  return canonical;
}

function stableReadRuntime(filePath) {
  const before = lstatSync(filePath, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size <= 0n || before.size > 4n * 1024n * 1024n) {
    throw new Error("runtime evidence endpoint is not a bounded single-link regular file");
  }
  const handle = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(handle, { bigint: true });
    const bytes = readFileSync(handle);
    const after = fstatSync(handle, { bigint: true });
    const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino
      && left.mode === right.mode && left.nlink === right.nlink && left.size === right.size
      && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
    if (!opened.isFile() || !sameIdentity(before, opened) || !sameIdentity(opened, after)
        || BigInt(bytes.byteLength) !== opened.size) {
      throw new Error("runtime evidence endpoint changed during held read");
    }
    return bytes;
  } finally {
    closeSync(handle);
  }
}

export function renderVedicSameArtifactCandidate(root, observation) {
  const candidate = buildExpectedVedicSameArtifactCandidate(root, observation);
  return Object.freeze({
    candidate,
    serialized: serializeVedicSameArtifactCandidate(candidate)
  });
}

export function runVedicSameArtifactCandidateRenderer({
  argv = process.argv,
  execArgv = process.execArgv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 6 || argv[2] !== "--runtime" || argv[4] !== "--candidate-out") {
    stderr.write("VEDIC_SAME_ARTIFACT_CANDIDATE_RENDERER_ARGUMENTS_INVALID\n");
    return 2;
  }
  if (execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("VEDIC_SAME_ARTIFACT_CANDIDATE_RENDERER_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const runtimePath = realTemporaryFilePath(argv[3], RUNTIME_FILE, true);
    const candidatePath = realTemporaryFilePath(argv[5], CANDIDATE_FILE, false);
    const runtimeBytes = stableReadRuntime(runtimePath);
    const runtime = vedicSameArtifactTestOnly.parseStrictJsonBytes(runtimeBytes, "sanitized runtime evidence");
    const rendered = renderVedicSameArtifactCandidate(workspaceRoot, runtime);
    writeFileSync(candidatePath, rendered.serialized, { encoding: "utf8", flag: "wx" });
    stdout.write(`${JSON.stringify({
      status: "candidate_rendered_to_system_temp_only",
      observationDigest: rendered.candidate.observationDigest,
      authorityRaised: false
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof VedicSameArtifactObservationError
      ? error.code
      : "VEDIC_SAME_ARTIFACT_CANDIDATE_RENDERER_FAILED_CLOSED";
    stderr.write(`${code}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runVedicSameArtifactCandidateRenderer();
