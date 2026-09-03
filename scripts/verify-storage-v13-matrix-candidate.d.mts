import type {
  StorageV13MatrixAttemptMarkerBinding,
  StorageV13MatrixCandidateEnvironment,
  StorageV13MatrixTerminalGateBinding
} from "./storage-v13-matrix-candidate-runtime.mjs";

export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_PATH: string;
export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_ID: string;
export const STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256:
  "1a67adbb0c4a0f63002c4973a532d152fd49297da7d229b1797fa3902144c3af";
export const STORAGE_V13_MATRIX_CANDIDATE_VERIFIER_ENVIRONMENT_KEYS: Readonly<Record<string, string>>;

export class StorageV13MatrixCandidateVerificationError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: ErrorOptions);
}

export type StorageV13MatrixCandidateReceiptBinding = Readonly<{
  path: string;
  size: number;
  sha256: string;
}>;

export type StorageV13MatrixCandidateSchemaBinding = Readonly<{
  path: "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json";
  schemaId: "https://hakimi.invalid/schemas/storage-v13-matrix-browser-receipt-candidate-v2.json";
  canonicalSha256: typeof STORAGE_V13_MATRIX_CANDIDATE_SCHEMA_CANONICAL_SHA256;
}>;

export type StorageV13MatrixCandidateVerificationResult = Readonly<{
  verificationKind: "offline-independent-storage-v13-browser-matrix-candidate-v2";
  verificationScope: "offline_candidate_envelopes_and_local_artifact_only";
  candidateEnvelopeIntegrityVerified: true;
  schemaValidated: true;
  schemaBinding: StorageV13MatrixCandidateSchemaBinding;
  browserReceiptEnvelopesVerified: true;
  attemptMarkerVerified: true;
  terminalCommitMarkerVerified: true;
  candidateCaptureComplete: true;
  attachmentsVerifiedPerProject: 16;
  totalAttachmentsVerified: 32;
  lockedLocalArtifactIdentityVerified: true;
  remoteServedArtifactBytesVerified: false;
  downloadBodiesRetainedForOfflineVerification: false;
  formalReceiptDecisionIdsExcluded: true;
  trustClass: "untrusted_candidate";
  admissionStatus: "not_admitted";
  executionAdmission: "closed_deferred_boundaries";
  matrixComplete: false;
  strictGatePassed: false;
  usableForAdmission: false;
  verifierNetworkAttempted: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  releaseReady: false;
  artifactIdentity: Readonly<Record<string, unknown>>;
  receiptBindings: Readonly<{
    msedge: StorageV13MatrixCandidateReceiptBinding;
    chrome: StorageV13MatrixCandidateReceiptBinding;
  }>;
  receiptDigests: Readonly<{ msedge: string; chrome: string }>;
  attemptMarkerBinding: StorageV13MatrixAttemptMarkerBinding;
  terminalGateBinding: StorageV13MatrixTerminalGateBinding;
  runSummaryBinding: StorageV13MatrixCandidateReceiptBinding;
  runSummaryDigest: string;
  documents: Readonly<{
    msedge: Readonly<Record<string, unknown>>;
    chrome: Readonly<Record<string, unknown>>;
    runSummary: Readonly<Record<string, unknown>>;
  }>;
}>;

export type StorageV13MatrixCandidateVerificationFailure = Readonly<{
  verificationKind: "offline-independent-storage-v13-browser-matrix-candidate-v2";
  verificationScope: "offline_candidate_envelopes_and_local_artifact_only";
  candidateEnvelopeIntegrityVerified: false;
  schemaValidated: false;
  schemaBinding: StorageV13MatrixCandidateSchemaBinding;
  browserReceiptEnvelopesVerified: false;
  attemptMarkerVerified: false;
  terminalCommitMarkerVerified: false;
  candidateCaptureComplete: false;
  attachmentsVerifiedPerProject: 0;
  totalAttachmentsVerified: 0;
  lockedLocalArtifactIdentityVerified: false;
  remoteServedArtifactBytesVerified: false;
  downloadBodiesRetainedForOfflineVerification: false;
  formalReceiptDecisionIdsExcluded: false;
  trustClass: "untrusted_candidate";
  admissionStatus: "not_admitted";
  executionAdmission: "closed_deferred_boundaries";
  matrixComplete: false;
  strictGatePassed: false;
  usableForAdmission: false;
  verifierNetworkAttempted: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  releaseReady: false;
  error: string;
}>;

export function parseStorageV13MatrixCandidateVerifierInput(
  input: StorageV13MatrixCandidateEnvironment
): StorageV13MatrixCandidateEnvironment;

export function parseStorageV13MatrixCandidateVerifierEnvironment(
  environment?: Record<string, string | undefined>
): StorageV13MatrixCandidateEnvironment;

export function verifyStorageV13MatrixCandidate(
  options: StorageV13MatrixCandidateEnvironment & Readonly<{
    cwd?: string;
    onVerificationCheckpoint?: (
      phase: "after_candidate_validation_before_final_revalidation"
    ) => void | Promise<void>;
  }>
): Promise<StorageV13MatrixCandidateVerificationResult>;

export function buildStorageV13MatrixCandidateVerificationFailure(
  error: unknown
): StorageV13MatrixCandidateVerificationFailure;
