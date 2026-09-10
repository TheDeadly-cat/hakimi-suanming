import assert from "node:assert/strict";
import path from "node:path";
import {
  verifyReleaseArtifactIdentityLock,
  type ReleaseArtifactIdentityVerification
} from "../../../scripts/release-artifact-identity-lib.mjs";

export const artifactWorkspaceRoot = path.resolve(import.meta.dirname, "../../..");

export type LockedDefaultV13Artifact = Readonly<{
  evidenceId: string;
  buildVersion: string;
  descriptor: ReleaseArtifactIdentityVerification["lock"]["descriptor"];
  manifestDigest: string;
  lockFileSha256: string;
  artifactSetDigest: string;
  fileCount: number;
}>;

/** Read the existing lock and recompute its inventory; never build or write it. */
export async function verifyLockedDefaultV13Artifact(
  expected?: LockedDefaultV13Artifact
): Promise<LockedDefaultV13Artifact> {
  const evidenceId = process.env.HAKIMI_RELEASE_EVIDENCE_ID;
  if (!evidenceId || !/^hre1-[a-f0-9]{32}$/u.test(evidenceId)) {
    throw new Error("Local data-boundary tests require the explicit evidence ID of an already locked default-v13 artifact.");
  }
  const verified = await verifyReleaseArtifactIdentityLock({
    cwd: artifactWorkspaceRoot,
    dist: path.join(artifactWorkspaceRoot, "dist/web"),
    lockPath: path.join(artifactWorkspaceRoot, "tmp/release-artifact-identity.json"),
    evidenceId
  });
  const lock = verified.lock;
  const snapshot: LockedDefaultV13Artifact = Object.freeze({
    evidenceId: lock.evidenceId,
    buildVersion: lock.buildVersion,
    descriptor: lock.descriptor,
    manifestDigest: lock.manifestDigest,
    lockFileSha256: verified.lockFileSha256,
    artifactSetDigest: lock.artifactSetDigest,
    fileCount: lock.fileCount
  });
  if (expected) assert.deepEqual(snapshot, expected, "Locked artifact changed across the local data-boundary test.");
  return snapshot;
}
