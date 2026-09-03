import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertStableDirectoryPathWithin,
  canonicalJson,
  collectArtifactEntries,
  readStableRegularFileSnapshot,
  readBuiltReleaseMetadata,
  relativePathWithin,
  releaseArtifactComponents,
  sha256,
} from "./release-evidence-lib.mjs";

export const RELEASE_ARTIFACT_IDENTITY_LOCK_SCHEMA_VERSION = 1;
export const DEFAULT_RELEASE_ARTIFACT_LOCK_PATH = "tmp/release-artifact-identity.json";
export const RELEASE_EVIDENCE_ARTIFACT_EXCLUSIONS = Object.freeze([
  "release-evidence.json",
  "release-evidence.json.sha256"
]);
export const RELEASE_ARTIFACT_RECEIPT_BINDING_SCHEMA_VERSION = 1;
export const RELEASE_ARTIFACT_RECEIPT_BINDING_SCOPE =
  "endpoint_snapshots_only_no_interval_mutation_epoch";
export const RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS = Object.freeze([
  "backup",
  "boot",
  "pwa",
  "web-v1-flow"
]);
export const RELEASE_ARTIFACT_MUTATION_BOUNDARY_TYPE =
  "release_artifact_endpoint_snapshot_boundary_v1";

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function artifactLockDigest(lock) {
  const { lockDigest: _lockDigest, ...unsigned } = lock;
  return sha256(canonicalJson(unsigned));
}

function requireCanonicalEvidenceId(value) {
  if (!/^hre1-[a-f0-9]{32}$/u.test(value ?? "")) {
    throw new Error("Release artifact identity requires a canonical bound evidence id.");
  }
  return value;
}

function pathIsWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`)
    && relative !== ".." && !path.isAbsolute(relative));
}

function requireLockOutsideArtifact(dist, lockPath) {
  const relative = path.relative(path.resolve(dist), path.resolve(lockPath));
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Release artifact identity lock must be stored outside the artifact root.");
  }
}

async function requirePhysicalLockOutsideArtifact({ cwd, dist, lockPath, lockSnapshot = null }) {
  const artifactState = await assertStableDirectoryPathWithin(cwd, dist, "Release artifact root");
  const lockParentState = await assertStableDirectoryPathWithin(
    cwd,
    path.dirname(lockPath),
    "Release artifact identity lock parent"
  );
  const physicalLockPath = lockSnapshot?.realPath
    ?? path.resolve(lockParentState.realPath, path.basename(lockPath));
  if (pathIsWithin(artifactState.realPath, physicalLockPath)) {
    throw new Error("Release artifact identity lock must be stored physically outside the artifact root.");
  }
}

function receiptBindingEndpoint(verification) {
  const lock = verification?.lock;
  if (!lock || typeof verification.lockPath !== "string"
    || typeof verification.lockFileSha256 !== "string") {
    throw new Error("Release artifact receipt binding requires a verified identity lock.");
  }
  return {
    lockPath: verification.lockPath,
    lockFileSha256: verification.lockFileSha256,
    lockDigest: lock.lockDigest,
    artifactSetDigest: lock.artifactSetDigest,
    evidenceId: lock.evidenceId,
    buildVersion: lock.buildVersion,
    manifestDigest: lock.manifestDigest,
    fileCount: lock.fileCount,
    descriptor: structuredClone(lock.descriptor)
  };
}

export function buildReleaseArtifactReceiptBinding({ beforeCommand, afterCommand }) {
  const before = receiptBindingEndpoint(beforeCommand);
  const after = receiptBindingEndpoint(afterCommand);
  if (canonicalJson(before) !== canonicalJson(after)) {
    throw new Error("Release artifact identity changed across the receipt command endpoints.");
  }
  return Object.freeze({
    schemaVersion: RELEASE_ARTIFACT_RECEIPT_BINDING_SCHEMA_VERSION,
    bindingType: "release_artifact_receipt_endpoint_binding_v1",
    verificationScope: RELEASE_ARTIFACT_RECEIPT_BINDING_SCOPE,
    mutationEpochCapability: "absent_schema13",
    intervalMutationExclusionClaimed: false,
    beforeCommand: Object.freeze(before),
    afterCommand: Object.freeze(after)
  });
}

export function assertReleaseArtifactReceiptBinding(value, currentVerification) {
  if (!exactKeys(value, [
    "schemaVersion", "bindingType", "verificationScope", "mutationEpochCapability",
    "intervalMutationExclusionClaimed", "beforeCommand", "afterCommand"
  ])
    || value.schemaVersion !== RELEASE_ARTIFACT_RECEIPT_BINDING_SCHEMA_VERSION
    || value.bindingType !== "release_artifact_receipt_endpoint_binding_v1"
    || value.verificationScope !== RELEASE_ARTIFACT_RECEIPT_BINDING_SCOPE
    || value.mutationEpochCapability !== "absent_schema13"
    || value.intervalMutationExclusionClaimed !== false) {
    throw new Error("Release artifact receipt endpoint binding is malformed.");
  }
  const expected = receiptBindingEndpoint(currentVerification);
  if (canonicalJson(value.beforeCommand) !== canonicalJson(expected)
    || canonicalJson(value.afterCommand) !== canonicalJson(expected)) {
    throw new Error("Release artifact receipt endpoint binding does not match the current lock.");
  }
  return true;
}

export function buildReleaseArtifactMutationBoundary({
  coveredReceiptIds,
  endpointSnapshotsMatched
}) {
  if (canonicalJson(coveredReceiptIds) !== canonicalJson(RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS)
    || endpointSnapshotsMatched !== true) {
    throw new Error("Release artifact mutation boundary requires every canonical browser receipt endpoint snapshot.");
  }
  return Object.freeze({
    schemaVersion: 1,
    boundaryType: RELEASE_ARTIFACT_MUTATION_BOUNDARY_TYPE,
    coveredReceiptIds: Object.freeze([...RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS]),
    endpointSnapshotsMatched: true,
    verificationScope: RELEASE_ARTIFACT_RECEIPT_BINDING_SCOPE,
    mutationEpochCapability: "absent_schema13",
    intervalMutationExclusionClaimed: false,
    abaMutationExclusionClaimed: false
  });
}

export function assertReleaseArtifactMutationBoundary(value) {
  if (!exactKeys(value, [
    "schemaVersion",
    "boundaryType",
    "coveredReceiptIds",
    "endpointSnapshotsMatched",
    "verificationScope",
    "mutationEpochCapability",
    "intervalMutationExclusionClaimed",
    "abaMutationExclusionClaimed"
  ])
    || value.schemaVersion !== 1
    || value.boundaryType !== RELEASE_ARTIFACT_MUTATION_BOUNDARY_TYPE
    || canonicalJson(value.coveredReceiptIds)
      !== canonicalJson(RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS)
    || value.endpointSnapshotsMatched !== true
    || value.verificationScope !== RELEASE_ARTIFACT_RECEIPT_BINDING_SCOPE
    || value.mutationEpochCapability !== "absent_schema13"
    || value.intervalMutationExclusionClaimed !== false
    || value.abaMutationExclusionClaimed !== false) {
    throw new Error("Release artifact mutation boundary projection is malformed.");
  }
  return true;
}

export async function buildReleaseArtifactIdentityLock({
  cwd,
  dist,
  channel = "default-v13",
  evidenceId,
  createdAt = new Date().toISOString()
}) {
  const root = path.resolve(cwd);
  const artifactRoot = path.resolve(dist);
  const canonicalEvidenceId = requireCanonicalEvidenceId(evidenceId);
  if (channel !== "default-v13" || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("Release artifact identity only accepts the default-v13 channel and a valid timestamp.");
  }
  const artifactRootRelative = relativePathWithin(root, artifactRoot, "Release artifact root");
  await assertStableDirectoryPathWithin(root, artifactRoot, "Release artifact root");
  const built = await readBuiltReleaseMetadata(artifactRoot, { containmentRoot: root });
  if (built.evidenceId !== canonicalEvidenceId) {
    throw new Error("Release artifact identity does not match the evidence id embedded in the build.");
  }
  if (built.descriptor.dbGeneration !== "legacy-v13"
    || built.descriptor.targetSchema !== 13
    || built.descriptor.migrationId !== null) {
    throw new Error("Release artifact identity is not the frozen default legacy-v13 descriptor.");
  }
  const files = await collectArtifactEntries(
    artifactRoot,
    RELEASE_EVIDENCE_ARTIFACT_EXCLUSIONS,
    { containmentRoot: root }
  );
  const components = releaseArtifactComponents(files);
  if (components.applicationShell.sha256 !== built.indexSha256
    || components.applicationShell.size !== built.indexSize) {
    throw new Error("Built release metadata and artifact inventory did not use the same stable index bytes.");
  }
  const unsigned = {
    schemaVersion: RELEASE_ARTIFACT_IDENTITY_LOCK_SCHEMA_VERSION,
    recordType: "release_artifact_identity_lock",
    channel,
    evidenceId: canonicalEvidenceId,
    createdAt,
    artifactRoot: artifactRootRelative,
    descriptor: built.descriptor,
    manifestDigest: built.manifestDigest,
    buildVersion: built.buildVersion,
    fileCount: files.length,
    artifactSetDigest: sha256(canonicalJson(files)),
    files
  };
  return { ...unsigned, lockDigest: artifactLockDigest(unsigned) };
}

export async function writeReleaseArtifactIdentityLock({ cwd, dist, lockPath, channel, evidenceId, createdAt }) {
  const root = path.resolve(cwd);
  const absoluteLockPath = path.resolve(lockPath);
  relativePathWithin(root, absoluteLockPath, "Release artifact identity lock");
  requireLockOutsideArtifact(dist, absoluteLockPath);
  const lock = await buildReleaseArtifactIdentityLock({ cwd: root, dist, channel, evidenceId, createdAt });
  await mkdir(path.dirname(absoluteLockPath), { recursive: true });
  await requirePhysicalLockOutsideArtifact({
    cwd: root,
    dist,
    lockPath: absoluteLockPath
  });
  const serialized = Buffer.from(`${JSON.stringify(lock, null, 2)}\n`, "utf8");
  await writeFile(absoluteLockPath, serialized, { flag: "wx" });
  const snapshot = await readStableRegularFileSnapshot(absoluteLockPath, {
    containmentRoot: root,
    label: "Release artifact identity lock"
  });
  if (!snapshot.bytes.equals(serialized)) {
    throw new Error("Release artifact identity lock bytes changed immediately after creation.");
  }
  return Object.freeze({ lock, lockPath: absoluteLockPath, lockFileSha256: snapshot.sha256 });
}

export async function verifyReleaseArtifactIdentityLock({ cwd, dist, lockPath, evidenceId = null }) {
  const root = path.resolve(cwd);
  const absoluteLockPath = path.resolve(lockPath);
  const lockRelativePath = relativePathWithin(root, absoluteLockPath, "Release artifact identity lock");
  requireLockOutsideArtifact(dist, absoluteLockPath);
  const snapshot = await readStableRegularFileSnapshot(absoluteLockPath, {
    containmentRoot: root,
    label: "Release artifact identity lock"
  });
  await requirePhysicalLockOutsideArtifact({
    cwd: root,
    dist,
    lockPath: absoluteLockPath,
    lockSnapshot: snapshot
  });
  const { bytes } = snapshot;
  const lock = JSON.parse(bytes.toString("utf8"));
  if (!exactKeys(lock, [
    "schemaVersion", "recordType", "channel", "evidenceId", "createdAt", "artifactRoot",
    "descriptor", "manifestDigest", "buildVersion", "fileCount", "artifactSetDigest", "files", "lockDigest"
  ]) || lock.schemaVersion !== RELEASE_ARTIFACT_IDENTITY_LOCK_SCHEMA_VERSION
    || lock.recordType !== "release_artifact_identity_lock"
    || lock.channel !== "default-v13"
    || Number.isNaN(Date.parse(lock.createdAt))
    || !/^[a-f0-9]{64}$/u.test(lock.lockDigest ?? "")
    || lock.lockDigest !== artifactLockDigest(lock)) {
    throw new Error("Release artifact identity lock is malformed or has a digest mismatch.");
  }
  if (evidenceId !== null && lock.evidenceId !== requireCanonicalEvidenceId(evidenceId)) {
    throw new Error("Release artifact identity lock evidence id does not match the current release run.");
  }
  const current = await buildReleaseArtifactIdentityLock({
    cwd: root,
    dist,
    channel: lock.channel,
    evidenceId: lock.evidenceId,
    createdAt: lock.createdAt
  });
  if (canonicalJson(current) !== canonicalJson(lock)) {
    throw new Error("Release artifact bytes changed after the identity lock was created.");
  }
  return Object.freeze({
    lock,
    lockPath: lockRelativePath,
    lockFileSha256: snapshot.sha256,
    artifactSetDigest: lock.artifactSetDigest
  });
}
