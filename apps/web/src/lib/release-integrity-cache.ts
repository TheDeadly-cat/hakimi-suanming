import {
  FULL_BACKUP_FORMAT_VERSION,
  type FullBackupPayload
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import type {
  CaseRepository,
  ResearchDatabase,
  ResearchDatabaseMutationState
} from "@hakimi/storage";
import type { ReleaseDatabaseDescriptor } from "../../release-protocol";
import { APP_VERSION } from "./app-version";
import {
  FULL_BACKUP_WORKER_PROTOCOL,
  FULL_BACKUP_WORKER_PROTOCOL_VERSION
} from "./full-backup-worker-protocol";

export const RELEASE_INTEGRITY_CACHE_PROTOCOL = "hakimi.release-integrity-cache" as const;
export const RELEASE_INTEGRITY_CACHE_PROTOCOL_VERSION = 1 as const;
export const FULL_BACKUP_SNAPSHOT_VALIDATOR_IDENTITY =
  "hakimi.full-backup.create-from-snapshot-validator.v1" as const;

export type ReleaseIntegrityContractIdentity = Readonly<{
  appVersion: string;
  fullBackupFormatVersion: string;
  validatorIdentity: string;
  workerProtocol: string;
  workerProtocolVersion: number;
}>;

export const CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY: ReleaseIntegrityContractIdentity =
  Object.freeze({
    appVersion: APP_VERSION,
    fullBackupFormatVersion: FULL_BACKUP_FORMAT_VERSION,
    validatorIdentity: FULL_BACKUP_SNAPSHOT_VALIDATOR_IDENTITY,
    workerProtocol: FULL_BACKUP_WORKER_PROTOCOL,
    workerProtocolVersion: FULL_BACKUP_WORKER_PROTOCOL_VERSION
  });

export type ReleaseIntegrityVerificationMode = "cache_hit" | "full_audit";

export type ReleaseIntegrityEvidence = Readonly<{
  mode: ReleaseIntegrityVerificationMode;
  epoch: number;
  digest: string;
  logicalPayloadBytes: number | null;
}>;

type ReleaseIntegrityRepository = Pick<
  CaseRepository,
  | "markMutationStateVerified"
  | "readFullDataSnapshotWithMutationState"
  | "readMutationState"
>;

type ReleaseIntegrityDatabase = Pick<ResearchDatabase, "withReleaseMigrationWriteAccess">;

type SnapshotInspection = Readonly<{
  payloadDigest: string;
  canonicalJsonByteLength: number;
}>;

export type VerifyReleaseIntegrityOptions = Readonly<{
  repository: ReleaseIntegrityRepository;
  database: ReleaseIntegrityDatabase;
  contractVersion: string;
  inspectSnapshot: (payload: FullBackupPayload) => Promise<SnapshotInspection>;
  now?: () => string;
}>;

export type ReleaseIntegrityCacheErrorCode =
  | "CAS_CONFLICT"
  | "INVALID_CONTRACT"
  | "INVALID_INSPECTION"
  | "INVALID_SNAPSHOT_EPOCH"
  | "VERIFICATION_MARKER_MISMATCH";

export class ReleaseIntegrityCacheError extends Error {
  constructor(
    readonly code: ReleaseIntegrityCacheErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ReleaseIntegrityCacheError";
  }
}

const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

function requireCanonicalIdentityValue(value: string, field: string): string {
  if (value.length === 0 || value.trim() !== value) {
    throw new ReleaseIntegrityCacheError(
      "INVALID_CONTRACT",
      `${field} must be a canonical non-empty string.`
    );
  }
  return value;
}

/**
 * Produces the opaque identity persisted by Schema 16 mutation state. The hash
 * deliberately includes the complete descriptor object so adding or changing
 * any release-protocol field invalidates prior evidence by default.
 */
export async function createReleaseIntegrityContractVersion(
  descriptor: ReleaseDatabaseDescriptor,
  buildId: string,
  identity: ReleaseIntegrityContractIdentity = CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY
): Promise<string> {
  requireCanonicalIdentityValue(buildId, "buildId");
  requireCanonicalIdentityValue(identity.appVersion, "appVersion");
  requireCanonicalIdentityValue(identity.fullBackupFormatVersion, "fullBackupFormatVersion");
  requireCanonicalIdentityValue(identity.validatorIdentity, "validatorIdentity");
  requireCanonicalIdentityValue(identity.workerProtocol, "workerProtocol");
  if (!Number.isSafeInteger(identity.workerProtocolVersion) || identity.workerProtocolVersion < 1) {
    throw new ReleaseIntegrityCacheError(
      "INVALID_CONTRACT",
      "workerProtocolVersion must be a positive safe integer."
    );
  }

  const digest = await sha256Hex({
    protocol: RELEASE_INTEGRITY_CACHE_PROTOCOL,
    protocolVersion: RELEASE_INTEGRITY_CACHE_PROTOCOL_VERSION,
    releaseDescriptor: descriptor,
    buildId,
    appVersion: identity.appVersion,
    fullBackupFormatVersion: identity.fullBackupFormatVersion,
    validator: {
      identity: identity.validatorIdentity,
      workerProtocol: identity.workerProtocol,
      workerProtocolVersion: identity.workerProtocolVersion,
      operation: "inspect_snapshot"
    }
  });
  return `${RELEASE_INTEGRITY_CACHE_PROTOCOL}.v${RELEASE_INTEGRITY_CACHE_PROTOCOL_VERSION}.sha256.${digest}`;
}

/**
 * Storage performs the authoritative strict-shape read. These checks are the
 * additional Web-owned rules that turn a valid state record into clean boot
 * evidence for one exact verifier contract.
 */
export function hasCleanReleaseIntegrityEvidence(
  state: ResearchDatabaseMutationState | null,
  contractVersion: string
): state is ResearchDatabaseMutationState & {
  verifiedEpoch: number;
  verifiedPayloadDigest: string;
  verifiedContractVersion: string;
  verifiedAt: string;
} {
  if (state === null || contractVersion.length === 0) return false;
  return (
    Number.isSafeInteger(state.epoch) &&
    state.epoch >= 0 &&
    state.verifiedEpoch === state.epoch &&
    typeof state.verifiedPayloadDigest === "string" &&
    LOWERCASE_SHA256.test(state.verifiedPayloadDigest) &&
    state.verifiedContractVersion === contractVersion &&
    typeof state.verifiedAt === "string" &&
    state.verifiedAt.length > 0
  );
}

function requireSnapshotEpoch(
  epoch: number,
  state: ResearchDatabaseMutationState | null
): void {
  if (!Number.isSafeInteger(epoch) || epoch < 0 || (state !== null && state.epoch !== epoch)) {
    throw new ReleaseIntegrityCacheError(
      "INVALID_SNAPSHOT_EPOCH",
      "Atomic mutation snapshot returned an inconsistent epoch."
    );
  }
}

/**
 * Schema 16 boot verifier. A miss reads payload and epoch atomically, runs the
 * full backup validator, then blesses that exact epoch through a metadata-only
 * compare-and-set. A concurrent write therefore fails closed.
 */
export async function verifyReleaseIntegrity(
  options: VerifyReleaseIntegrityOptions
): Promise<ReleaseIntegrityEvidence> {
  const contractVersion = requireCanonicalIdentityValue(
    options.contractVersion,
    "contractVersion"
  );
  const cachedState = await options.repository.readMutationState();
  if (hasCleanReleaseIntegrityEvidence(cachedState, contractVersion)) {
    return {
      mode: "cache_hit",
      epoch: cachedState.epoch,
      digest: cachedState.verifiedPayloadDigest,
      logicalPayloadBytes: null
    };
  }

  const snapshot = await options.repository.readFullDataSnapshotWithMutationState();
  requireSnapshotEpoch(snapshot.epoch, snapshot.mutationState);
  // Another verifier may have completed between the cheap state read and the
  // atomic payload read. Its same-contract marker is sufficient evidence.
  if (hasCleanReleaseIntegrityEvidence(snapshot.mutationState, contractVersion)) {
    return {
      mode: "cache_hit",
      epoch: snapshot.epoch,
      digest: snapshot.mutationState.verifiedPayloadDigest,
      logicalPayloadBytes: null
    };
  }

  const inspected = await options.inspectSnapshot(snapshot.payload);
  if (
    !LOWERCASE_SHA256.test(inspected.payloadDigest) ||
    !Number.isSafeInteger(inspected.canonicalJsonByteLength) ||
    inspected.canonicalJsonByteLength < 0
  ) {
    throw new ReleaseIntegrityCacheError(
      "INVALID_INSPECTION",
      "Full snapshot validator returned invalid integrity evidence."
    );
  }

  const verifiedAt = (options.now ?? (() => new Date().toISOString()))();
  const marked = await options.database.withReleaseMigrationWriteAccess(() =>
    options.repository.markMutationStateVerified({
      expectedEpoch: snapshot.epoch,
      payloadDigest: inspected.payloadDigest,
      contractVersion,
      verifiedAt
    })
  );
  if (marked === null) {
    throw new ReleaseIntegrityCacheError(
      "CAS_CONFLICT",
      "Mutation epoch changed while the full snapshot was being verified."
    );
  }
  if (
    !hasCleanReleaseIntegrityEvidence(marked, contractVersion) ||
    marked.epoch !== snapshot.epoch ||
    marked.verifiedPayloadDigest !== inspected.payloadDigest
  ) {
    throw new ReleaseIntegrityCacheError(
      "VERIFICATION_MARKER_MISMATCH",
      "Persisted mutation verification marker does not match the audited snapshot."
    );
  }

  return {
    mode: "full_audit",
    epoch: snapshot.epoch,
    digest: inspected.payloadDigest,
    logicalPayloadBytes: inspected.canonicalJsonByteLength
  };
}
