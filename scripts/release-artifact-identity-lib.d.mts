import type { ReleaseDatabaseDescriptor } from "../apps/web/release-protocol.ts";

export type ReleaseArtifactIdentityFile = Readonly<{
  path: string;
  size: number;
  sha256: string;
}>;

export type ReleaseArtifactIdentityLock = Readonly<{
  schemaVersion: 1;
  recordType: "release_artifact_identity_lock";
  channel: "default-v13";
  evidenceId: string;
  createdAt: string;
  artifactRoot: string;
  descriptor: ReleaseDatabaseDescriptor;
  manifestDigest: string;
  buildVersion: string;
  fileCount: number;
  artifactSetDigest: string;
  files: readonly ReleaseArtifactIdentityFile[];
  lockDigest: string;
}>;

export type ReleaseArtifactIdentityVerification = Readonly<{
  lock: ReleaseArtifactIdentityLock;
  lockPath: string;
  lockFileSha256: string;
  artifactSetDigest: string;
}>;

export function verifyReleaseArtifactIdentityLock(input: Readonly<{
  cwd: string;
  dist: string;
  lockPath: string;
  evidenceId?: string | null;
}>): Promise<ReleaseArtifactIdentityVerification>;
