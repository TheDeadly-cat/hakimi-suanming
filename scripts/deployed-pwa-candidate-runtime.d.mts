export type DeployedPwaCandidateEnvironment = Readonly<{
  origin: string;
  outputRoot: string;
  bindingRoot: string;
  artifactRoot: string;
  artifactLock: string;
  releaseEvidenceId: string;
  runId: string;
}>;

export type CandidateFilesystemIdentity = Readonly<{
  realPath: string;
  dev: number;
  ino: number;
  birthtimeMs: number;
}>;

export type PreparedCandidateProjectOutput = Readonly<{
  bindingRoot: string;
  bindingReal: string;
  bindingIdentity: CandidateFilesystemIdentity;
  outputRoot: string;
  outputReal: string;
  outputIdentity: CandidateFilesystemIdentity;
  projectName: "msedge" | "chrome";
  projectRoot: string;
  projectReal: string;
  projectIdentity: CandidateFilesystemIdentity;
}>;

export const DEPLOYED_PWA_CANDIDATE_ENVIRONMENT_KEYS: Readonly<Record<string, string>>;
export const DEPLOYED_PWA_CANDIDATE_ATTACHMENT_ROLES: readonly string[];
export const DEPLOYED_PWA_CANDIDATE_ROUTE_IDS: readonly string[];
export const DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR: Readonly<Record<string, unknown>>;

export type VerifiedDeployedPwaCandidateArtifact = Readonly<{
  releaseEvidenceId: string;
  descriptor: Readonly<Record<string, unknown>>;
  buildVersion: string;
  artifactSetDigest: string;
  pwaManifest: Readonly<{ path: string; size: number; sha256: string }>;
  serviceWorker: Readonly<{ path: string; size: number; sha256: string }>;
  lockDigest: string;
  verificationSnapshot: Readonly<Record<string, unknown>>;
}>;

export function parseDeployedPwaCandidateEnvironment(
  environment: Record<string, string | undefined>
): DeployedPwaCandidateEnvironment;

export function loadVerifiedDeployedPwaCandidateArtifact(
  candidate: DeployedPwaCandidateEnvironment
): Promise<VerifiedDeployedPwaCandidateArtifact>;

export function assertDeployedPwaCandidateArtifactIdentityStable(
  initial: VerifiedDeployedPwaCandidateArtifact,
  final: VerifiedDeployedPwaCandidateArtifact
): VerifiedDeployedPwaCandidateArtifact;

export function revalidateDeployedPwaCandidateArtifactIdentity(
  candidate: DeployedPwaCandidateEnvironment,
  initial: VerifiedDeployedPwaCandidateArtifact
): Promise<VerifiedDeployedPwaCandidateArtifact>;

export function prepareCandidateProjectOutput(input: Readonly<{
  bindingRoot: string;
  outputRoot: string;
  artifactRoot: string;
  projectName: "msedge" | "chrome";
}>): Promise<PreparedCandidateProjectOutput>;

export function assertFreshProfileDirectory(userDataDir: string): Promise<void>;

export function deployedPwaCandidateProfileBindingDigest(input: Readonly<{
  projectName: "msedge" | "chrome";
  userDataDir: string;
}>): string;

export function writeDeployedPwaBrowserCandidate(input: Record<string, unknown>): Promise<Readonly<{
  receiptPath: string;
  receiptBinding: Readonly<{ path: string; size: number; sha256: string }>;
  document: Readonly<Record<string, unknown>>;
  envelope: Readonly<Record<string, unknown>>;
}>>;
