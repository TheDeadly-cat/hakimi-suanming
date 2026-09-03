import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_RELEASE_ARTIFACT_LOCK_PATH,
  verifyReleaseArtifactIdentityLock,
  writeReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import { parseCli } from "./release-evidence-lib.mjs";

const flags = parseCli(process.argv.slice(2));
const writeMode = flags.get("write") === true;
const verifyMode = flags.get("verify") === true;
if (writeMode === verifyMode) throw new Error("Choose exactly one of --write or --verify.");

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(cwd, String(flags.get("dist") ?? "dist/web"));
const lockPath = path.resolve(cwd, String(flags.get("lock") ?? DEFAULT_RELEASE_ARTIFACT_LOCK_PATH));
const evidenceId = process.env.HAKIMI_RELEASE_EVIDENCE_ID ?? null;

const result = writeMode
  ? await writeReleaseArtifactIdentityLock({
    cwd,
    dist,
    lockPath,
    channel: "default-v13",
    evidenceId
  })
  : await verifyReleaseArtifactIdentityLock({ cwd, dist, lockPath, evidenceId });

process.stdout.write(`${JSON.stringify({
  ok: true,
  mode: writeMode ? "write" : "verify",
  lockPath: path.relative(cwd, lockPath).replaceAll("\\", "/"),
  lockFileSha256: result.lockFileSha256,
  artifactSetDigest: result.lock.artifactSetDigest,
  fileCount: result.lock.fileCount,
  evidenceId: result.lock.evidenceId,
  releaseIdentity: result.lock.descriptor.dbGeneration,
  targetSchema: result.lock.descriptor.targetSchema,
  migrationId: result.lock.descriptor.migrationId
})}\n`);
