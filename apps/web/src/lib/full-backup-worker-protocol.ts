import type {
  FullBackupEnvelope,
  FullBackupPayload
} from "@hakimi/contracts";
import type {
  CreateFullBackupOptions,
  FullBackupImportPreparation,
  VerifiedFullBackupReplacement
} from "@hakimi/backup";

export const FULL_BACKUP_WORKER_PROTOCOL = "hakimi.full-backup.worker" as const;
export const FULL_BACKUP_WORKER_PROTOCOL_VERSION = 1 as const;

type RequestBase = {
  protocol: typeof FULL_BACKUP_WORKER_PROTOCOL;
  version: typeof FULL_BACKUP_WORKER_PROTOCOL_VERSION;
  jobId: string;
};

export type FullBackupWorkerRequest = RequestBase & (
  | {
    type: "create_from_snapshot";
    output: "zip" | "json";
    snapshot: FullBackupPayload;
    options: CreateFullBackupOptions;
  }
  | {
    type: "archive_envelope";
    envelope: FullBackupEnvelope;
  }
  | {
    type: "inspect_snapshot";
    snapshot: FullBackupPayload;
    options: CreateFullBackupOptions;
  }
  | {
    type: "prepare_import";
    blob: Blob;
    currentSnapshot: FullBackupPayload;
    options: CreateFullBackupOptions;
  }
  | {
    type: "verify_prepared";
    preparation: FullBackupImportPreparation;
  }
  | { type: "cancel" }
);

export type FullBackupWorkerOperation = Exclude<FullBackupWorkerRequest["type"], "cancel">;

export type FullBackupWorkerSerializedError = {
  name: string;
  message: string;
  code?: string;
  category: "archive" | "backup" | "cancelled" | "protocol" | "runtime";
};

type ResponseBase = {
  protocol: typeof FULL_BACKUP_WORKER_PROTOCOL;
  version: typeof FULL_BACKUP_WORKER_PROTOCOL_VERSION;
  jobId: string;
};

export type FullBackupWorkerResponse = ResponseBase & (
  | {
    type: "artifact_ready";
    output: "zip" | "json";
    blob: Blob;
    outputByteLength: number;
    canonicalJsonByteLength: number;
    payloadDigest: string;
  }
  | {
    type: "preparation_ready";
    preparation: FullBackupImportPreparation;
    sourceContainer: "zip" | "json";
    sourceByteLength: number;
    decodedJsonByteLength: number;
    canonicalJsonByteLength: number;
    payloadDigest: string;
  }
  | {
    type: "verified_ready";
    verified: VerifiedFullBackupReplacement;
  }
  | {
    type: "snapshot_verified";
    payloadDigest: string;
    canonicalJsonByteLength: number;
  }
  | {
    type: "error";
    operation: FullBackupWorkerOperation | "protocol";
    error: FullBackupWorkerSerializedError;
  }
);

export type FullBackupPreparedWorkerResult = Extract<
  FullBackupWorkerResponse,
  { type: "preparation_ready" }
>;

export type FullBackupArtifactWorkerResult = Extract<
  FullBackupWorkerResponse,
  { type: "artifact_ready" }
>;

export type FullBackupVerifiedWorkerResult = Extract<
  FullBackupWorkerResponse,
  { type: "verified_ready" }
>;

export type FullBackupSnapshotWorkerResult = Extract<
  FullBackupWorkerResponse,
  { type: "snapshot_verified" }
>;
