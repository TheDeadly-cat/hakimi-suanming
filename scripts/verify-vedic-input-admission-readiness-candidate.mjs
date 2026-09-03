import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
  isVerifiedVedicInputAdmissionReadinessCandidate,
  loadVedicInputAdmissionReadinessCandidate
} from "./vedic-input-admission-readiness-candidate-lib.mjs";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function fail(code, message) {
  const error = new Error(code + ": " + message);
  error.code = code;
  throw error;
}

function visibleUnsafeNodeLaunchState() {
  const inherited = ["NODE_OPTIONS", "NODE_PATH"].filter(
    (key) => typeof process.env[key] === "string"
      && process.env[key].trim() !== ""
  );
  return {
    execArgv: [...process.execArgv],
    inherited
  };
}

async function main() {
  if (process.argv.length !== 2) {
    fail(
      "CLI_ARGUMENTS_FORBIDDEN",
      "本验证器只读取固定吠陀输入准入准备候选路径，不接受候选路径、loader 或其他 caller operand。"
    );
  }
  const launchState = visibleUnsafeNodeLaunchState();
  if (launchState.execArgv.length !== 0 || launchState.inherited.length !== 0) {
    fail(
      "NODE_LAUNCH_STATE_FORBIDDEN",
      "本验证器拒绝当前仍可见的 NODE_OPTIONS、NODE_PATH 或 Node execArgv；这不证明 preload、loader、模块字节或 launcher 身份。"
    );
  }

  const result = await loadVedicInputAdmissionReadinessCandidate(workspaceRoot);
  if (!isVerifiedVedicInputAdmissionReadinessCandidate(result)) {
    fail(
      "ENDPOINT_SET_OBSERVATION_BRAND_MISSING",
      "固定路径完整加载器没有签发同模块私有非原子 endpoint-set 观察品牌。"
    );
  }

  process.stdout.write(JSON.stringify({
    artifact: VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
    candidateId: result.candidateId,
    candidateDigest: result.candidateDigest,
    candidateEndpointMechanicallyObservedUnderUnverifiedRuntime: true,
    endpointSetObservationBrandVerified: true,
    visibleNodeLaunchStateCleanObserved: true,
    erasedPreloadExcluded: false,
    currentBrandVerified: false,
    loadedModuleByteIdentityVerified: false,
    nodeLoaderIntegrityVerified: false,
    runtimeLauncherIdentityVerified: false,
    runtimeIntrinsicIntegrityVerified: false,
    simultaneousCurrentRawClosureVerified: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    admissionGatesSatisfied: result.admissionGatesSatisfied,
    necessaryConditionsRequired: result.necessaryConditionsRequired,
    necessaryConditionsSatisfied: result.necessaryConditionsSatisfied,
    conditionsAreNecessaryNotSufficient:
      result.conjunctiveReadinessConditions.conditionsAreNecessaryNotSufficient,
    allConditionsAloneConferEligibility:
      result.conjunctiveReadinessConditions.allConditionsAloneConferEligibility,
    positiveTransitionEvaluatorImplemented:
      result.conjunctiveReadinessConditions.positiveTransitionEvaluatorImplemented,
    positiveReceiptSchemasDefined:
      result.conjunctiveReadinessConditions.positiveReceiptSchemasDefined,
    positiveTransitionReceiptsAccepted:
      result.conjunctiveReadinessConditions.positiveTransitionReceiptsAccepted,
    legalAuthorityRoleDefinition:
      result.roleSeparationBoundary.independentLegalAuthority.roleDefinition,
    legalAuthoritySeatCount:
      result.roleSeparationBoundary.independentLegalAuthority.seatCount,
    rightsLegalConclusionEstablished:
      result.roleSeparationBoundary.rightsLegalConclusionEstablished,
    requirementRowsRequired: result.requirementsDefined,
    requirementRowsReady: result.requirementsResolved,
    requirementsDefined: result.requirementsDefined,
    requirementsResolved: result.requirementsResolved,
    inputContractGateSatisfied: result.inputContractGateSatisfied,
    activeAdmissionEffect: result.activeAdmissionEffect,
    formalAdmissionAuthorized: result.formalAdmissionAuthorized,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    publicReleaseAuthorized: result.publicReleaseAuthorized,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    status: result.status
  }, null, 2) + "\n");
}

try {
  await main();
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "UNEXPECTED_FAILURE";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(JSON.stringify({
    ok: false,
    candidateEndpointMechanicallyObservedUnderUnverifiedRuntime: false,
    endpointSetObservationBrandVerified: false,
    visibleNodeLaunchStateCleanObserved: false,
    erasedPreloadExcluded: false,
    loadedModuleByteIdentityVerified: false,
    nodeLoaderIntegrityVerified: false,
    runtimeLauncherIdentityVerified: false,
    runtimeIntrinsicIntegrityVerified: false,
    simultaneousCurrentRawClosureVerified: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    code,
    message,
    formalAdmissionAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false
  }) + "\n");
  process.exitCode = code === "CLI_ARGUMENTS_FORBIDDEN"
    || code === "NODE_LAUNCH_STATE_FORBIDDEN"
    ? 2
    : 1;
}
