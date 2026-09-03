import {
  createStorageV13MatrixCandidateAttemptMarker,
  loadVerifiedDeployedPwaCandidateArtifact,
  parseStorageV13MatrixCandidateEnvironment,
  prepareFreshStorageV13MatrixCandidateRun
} from "../../scripts/storage-v13-matrix-candidate-runtime.mjs";

/**
 * A run id is single-use. The shared run root is created atomically before
 * either browser project starts, so a failed rerun cannot be confused with a
 * fresh attempt that reused an older candidate directory.
 */
export default async function storageV13MatrixCandidateGlobalSetup(): Promise<void> {
  if (process.argv.includes("--list")) return;
  const candidate = parseStorageV13MatrixCandidateEnvironment(process.env);
  await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  await prepareFreshStorageV13MatrixCandidateRun(candidate);
  await createStorageV13MatrixCandidateAttemptMarker(candidate);
}
