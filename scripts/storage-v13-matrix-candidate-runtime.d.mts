import type { StorageV13NativeReadonlySnapshot } from "../apps/web/e2e/storage-v13-native-readonly.ts";
import type {
  VerifiedDeployedPwaCandidateArtifact
} from "./deployed-pwa-candidate-runtime.mjs";

export type StorageV13MatrixExactFilesystemIdentity = Readonly<{
  realPath: string;
  dev: string;
  ino: string;
  birthtimeNs: string;
}>;

export type StorageV13MatrixVerifiedArtifact = VerifiedDeployedPwaCandidateArtifact & Readonly<{
  storageV13ExactFilesystemIdentity: Readonly<{
    artifactRoot: StorageV13MatrixExactFilesystemIdentity;
    identityLock: StorageV13MatrixExactFilesystemIdentity;
  }>;
}>;

export type StorageV13MatrixPreparedOutput = Readonly<{
  bindingRoot: string;
  bindingReal: string;
  outputRoot: string;
  outputReal: string;
  projectName: "msedge" | "chrome";
  projectRoot: string;
  projectReal: string;
  exactDirectoryIdentities: Readonly<{
    bindingRoot: StorageV13MatrixExactFilesystemIdentity;
    outputRoot: StorageV13MatrixExactFilesystemIdentity;
    projectRoot: StorageV13MatrixExactFilesystemIdentity;
  }>;
  attemptMarker: StorageV13MatrixAttemptMarker;
}>;

export type StorageV13MatrixCandidateEnvironment = Readonly<{
  origin: string;
  outputRoot: string;
  bindingRoot: string;
  artifactRoot: string;
  artifactLock: string;
  releaseEvidenceId: string;
  runId: string;
  attemptId: string;
}>;

export type StorageV13MatrixAttemptMarkerBinding = Readonly<{
  attemptId: string;
  path: string;
  size: number;
  sha256: string;
  markerDigest: string;
}>;

export type StorageV13MatrixAttemptMarker = Readonly<{
  document: Readonly<Record<string, unknown>>;
  binding: StorageV13MatrixAttemptMarkerBinding;
  exactFilesystemIdentity: Readonly<{
    realPath: string;
    dev: string;
    ino: string;
    birthtimeNs: string;
    mtimeNs: string;
    ctimeNs: string;
  }>;
}>;

export type StorageV13MatrixTerminalGateBinding = Readonly<{
  path: string;
  size: 65;
  sha256: string;
  commitsSummarySha256: string;
}>;

export type StorageV13MatrixCandidatePublicationDirectoryLocks = Readonly<{
  bindingRoot: StorageV13MatrixExactFilesystemIdentity;
  outputRoot: StorageV13MatrixExactFilesystemIdentity;
  projectRoots: Readonly<Record<"msedge" | "chrome", StorageV13MatrixExactFilesystemIdentity>>;
  projectEntryNames: Readonly<Record<"msedge" | "chrome", readonly string[]>>;
}>;

export type StorageV13MatrixDownloadObservation = Readonly<{
  observed: boolean;
  eventCount: number;
  size: number | null;
  sha256: string | null;
  suggestedFilename: string | null;
}>;

export type StorageV13MatrixOperationObservation = Readonly<{
  operationId: "create" | "edit" | "delete" | "export" | "restore" | "cancel";
  status: "observed_pass";
  uiPath: string;
  observationMethod: "native_indexeddb_readonly_v2";
  captures: readonly StorageV13NativeReadonlySnapshot[];
  download: StorageV13MatrixDownloadObservation;
  backup: Readonly<{
    formatVersion: string;
    payloadDigest: string;
    logicalPartitionNames: readonly string[];
    counts: Readonly<Record<string, number>>;
    sharedPartitionContentDigests: Readonly<Record<string, string>>;
  }> | null;
  safetyBackup: Readonly<{
    formatVersion: string;
    payloadDigest: string;
    logicalPartitionNames: readonly string[];
    counts: Readonly<Record<string, number>>;
    sharedPartitionContentDigests: Readonly<Record<string, string>>;
  }> | null;
}>;

export const STORAGE_V13_MATRIX_POLICY_PATH: string;
export const STORAGE_V13_MATRIX_RELEASE_DECISIONS_PATH: string;
export const STORAGE_V13_MATRIX_ENVIRONMENT_KEYS: Readonly<Record<string, string>>;
export const STORAGE_V13_MATRIX_OBSERVED_OPERATION_IDS: readonly string[];
export const STORAGE_V13_MATRIX_DEFERRED_BOUNDARY_IDS: readonly string[];
export const STORAGE_V13_MATRIX_PHYSICAL_STORE_NAMES: readonly string[];
export const STORAGE_V13_MATRIX_LOGICAL_BACKUP_PARTITION_NAMES: readonly string[];
export const STORAGE_V13_MATRIX_SHARED_PARTITION_NAMES: readonly string[];
export const STORAGE_V13_MATRIX_SEMANTIC_WITNESS_MAX_ENTRIES: 4096;
export const STORAGE_V13_MATRIX_CAPABILITIES: Readonly<Record<string, unknown>>;
export const STORAGE_V13_MATRIX_AUTHORITY: Readonly<Record<string, boolean>>;
export const STORAGE_V13_MATRIX_MAX_DOWNLOAD_BYTES: number;
export const STORAGE_V13_MATRIX_ATTEMPT_MARKER_FILE_NAME: string;
export const STORAGE_V13_MATRIX_PENDING_SUMMARY_FILE_NAME: string;
export const STORAGE_V13_MATRIX_SUMMARY_FILE_NAME: string;
export const STORAGE_V13_MATRIX_PENDING_TERMINAL_COMMIT_FILE_NAME: string;
export const STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME: string;

export function parseStorageV13MatrixCandidateEnvironment(
  environment: Record<string, string | undefined>
): StorageV13MatrixCandidateEnvironment;

export function loadStorageV13MatrixCandidatePolicy(cwd?: string): Promise<Readonly<{
  path: string;
  size: number;
  sha256: string;
  canonicalSha256: string;
  document: Readonly<Record<string, unknown>>;
}>>;

export function loadStorageV13MatrixGovernanceBindings(cwd?: string): Promise<Readonly<Record<string, unknown>>>;

export function loadVerifiedDeployedPwaCandidateArtifact(
  candidate: StorageV13MatrixCandidateEnvironment
): Promise<StorageV13MatrixVerifiedArtifact>;

export function revalidateDeployedPwaCandidateArtifactIdentity(
  candidate: StorageV13MatrixCandidateEnvironment,
  initial: StorageV13MatrixVerifiedArtifact
): Promise<StorageV13MatrixVerifiedArtifact>;

export function prepareCandidateProjectOutput(input: Readonly<{
  candidateEnvironment: StorageV13MatrixCandidateEnvironment;
  bindingRoot: string;
  outputRoot: string;
  artifactRoot: string;
  projectName: "msedge" | "chrome";
}>): Promise<StorageV13MatrixPreparedOutput>;

export function prepareFreshStorageV13MatrixCandidateRun(
  candidateEnvironment: StorageV13MatrixCandidateEnvironment,
  options?: Readonly<{ cwd?: string }>
): Promise<Readonly<{
  runId: string;
  outputRoot: string;
  outputIdentity: StorageV13MatrixExactFilesystemIdentity;
  projectRoots: Readonly<Record<"msedge" | "chrome", StorageV13MatrixExactFilesystemIdentity>>;
}>>;

export function createStorageV13MatrixCandidateAttemptMarker(
  candidateEnvironment: StorageV13MatrixCandidateEnvironment,
  options?: Readonly<{ cwd?: string; createdAt?: string }>
): Promise<StorageV13MatrixAttemptMarker>;

export function loadStorageV13MatrixCandidateAttemptMarker(
  candidateEnvironment: StorageV13MatrixCandidateEnvironment
): Promise<StorageV13MatrixAttemptMarker>;

export function assertStorageV13MatrixCandidateAttemptMarkerStable(
  initial: StorageV13MatrixAttemptMarker,
  final: StorageV13MatrixAttemptMarker
): StorageV13MatrixAttemptMarker;

export function publishStorageV13MatrixCandidateSummary(input: Readonly<{
  candidateEnvironment: StorageV13MatrixCandidateEnvironment;
  expectedAttemptMarker: StorageV13MatrixAttemptMarker;
  expectedBytes: Uint8Array;
  directoryLocks: StorageV13MatrixCandidatePublicationDirectoryLocks;
}>): Promise<Readonly<{
  published: true;
  path: string;
  size: number;
  sha256: string;
  summaryDigest: string;
  markerDigest: string;
  attemptId: string;
  terminalGateBinding: StorageV13MatrixTerminalGateBinding;
}>>;

export function writeStorageV13MatrixBrowserCandidate(
  input: Readonly<Record<string, unknown>>
): Promise<Readonly<{
  receiptPath: string;
  receiptBinding: Readonly<{ path: string; size: number; sha256: string }>;
  document: Readonly<Record<string, unknown>>;
}>>;
