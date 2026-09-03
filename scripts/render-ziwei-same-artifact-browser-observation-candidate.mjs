import os from "node:os";
import path from "node:path";
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
import { fileURLToPath } from "node:url";

import {
  ZiweiSameArtifactObservationError,
  buildCurrentZiweiSameArtifactCandidate,
  serializeZiweiSameArtifactCandidate
} from "./ziwei-same-artifact-browser-observation-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDir, ".."));
const systemTempRoot = realpathSync.native(os.tmpdir());
const UUID = "[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
const RUNTIME_FILE = new RegExp(`^hakimi-ziwei-same-artifact-runtime-${UUID}\\.json$`, "u");
const CANDIDATE_FILE = new RegExp(`^hakimi-ziwei-same-artifact-candidate-${UUID}\\.json$`, "u");

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function realTemporaryFilePath(raw, expectedName, mustExist) {
  if (typeof raw !== "string" || !path.isAbsolute(raw) || !expectedName.test(path.basename(raw))) {
    throw new Error("temporary evidence endpoint is not a fixed absolute UUID path");
  }
  const resolved = path.resolve(raw);
  const parent = path.dirname(resolved);
  const parentStat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const relative = path.relative(systemTempRoot, realParent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.startsWith("..") || path.isAbsolute(relative)
      || existsSync(resolved) !== mustExist) {
    throw new Error("temporary evidence endpoint is outside a real system-temp parent");
  }
  const canonical = path.join(realParent, path.basename(resolved));
  if (mustExist && !samePath(realpathSync.native(canonical), canonical)) {
    throw new Error("runtime evidence endpoint is an alias");
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

export function runZiweiSameArtifactCandidateRenderer({
  argv = process.argv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 6 || argv[2] !== "--runtime" || argv[4] !== "--candidate-out") {
    stderr.write("ZIWEI_SAME_ARTIFACT_CANDIDATE_RENDERER_ARGUMENTS_INVALID\n");
    return 2;
  }
  if (Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("ZIWEI_SAME_ARTIFACT_CANDIDATE_RENDERER_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const runtimePath = realTemporaryFilePath(argv[3], RUNTIME_FILE, true);
    const candidatePath = realTemporaryFilePath(argv[5], CANDIDATE_FILE, false);
    const runtime = JSON.parse(stableReadRuntime(runtimePath).toString("utf8"));
    const candidate = buildCurrentZiweiSameArtifactCandidate(
      workspaceRoot,
      runtime,
      runtime.observedAt
    );
    const serialized = serializeZiweiSameArtifactCandidate(candidate);
    writeFileSync(candidatePath, serialized, { encoding: "utf8", flag: "wx" });
    stdout.write(`${JSON.stringify({
      status: "candidate_rendered_to_system_temp_only",
      candidatePath,
      observationDigest: candidate.observationDigest,
      authorityRaised: false
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof ZiweiSameArtifactObservationError
      ? error.code
      : "ZIWEI_SAME_ARTIFACT_CANDIDATE_RENDERER_FAILED_CLOSED";
    stderr.write(`${code}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runZiweiSameArtifactCandidateRenderer();
