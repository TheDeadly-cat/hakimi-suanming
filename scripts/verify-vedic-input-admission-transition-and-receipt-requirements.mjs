import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
  isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements,
  loadVedicInputAdmissionTransitionAndReceiptRequirements
} from "./vedic-input-admission-transition-and-receipt-requirements-lib.mjs";

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
      "本验证器只读取固定吠陀 transition/receipt 要求路径，不接受 caller operand。"
    );
  }
  const launchState = visibleUnsafeNodeLaunchState();
  if (launchState.execArgv.length !== 0 || launchState.inherited.length !== 0) {
    fail(
      "NODE_LAUNCH_STATE_FORBIDDEN",
      "本验证器拒绝当前可见的 NODE_OPTIONS、NODE_PATH 或 Node execArgv；这不证明已擦除 preload、loader、模块字节或 launcher 身份。"
    );
  }

  const result =
    await loadVedicInputAdmissionTransitionAndReceiptRequirements(workspaceRoot);
  if (!isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(result)) {
    fail(
      "ENDPOINT_SET_OBSERVATION_BRAND_MISSING",
      "固定 loader 没有签发同模块私有非原子 endpoint-set 观察品牌。"
    );
  }

  process.stdout.write(JSON.stringify({
    artifact:
      VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
    contractId: result.contractId,
    contractDigest: result.contractDigest,
    requirementsOnlyContractMechanicallyObservedUnderUnverifiedRuntime: true,
    endpointSetObservationBrandVerified: true,
    visibleNodeLaunchStateCleanObserved: true,
    erasedPreloadExcluded: false,
    loadedModuleByteIdentityVerified: false,
    nodeLoaderIntegrityVerified: false,
    runtimeLauncherIdentityVerified: false,
    runtimeIntrinsicIntegrityVerified: false,
    upstreamLoadersCalledSeparately:
      result.observationBoundary.upstreamLoadersCalledSeparately,
    simultaneousCurrentRawClosureVerified: false,
    crossFileAtomicSnapshot: false,
    parentAndChildrenAtomicSnapshot: false,
    mutationEpochAvailable: result.mutationEpochAvailable,
    intervalMutationExcluded: result.intervalMutationExcluded,
    abaExcluded: result.abaExcluded,
    requirementIdsRequired: result.requirementIdsRequired,
    invariantIdsRequired: result.invariantIdsRequired,
    conditionsRequired: result.conditionsRequired,
    guardsDefined: result.guardsDefined,
    actorRolesDefined: result.actorRolesDefined,
    authorityRolesRequired: result.authorityRolesRequired,
    formalProjectionActorsRequired: result.formalProjectionActorsRequired,
    receiptFamiliesDefined: result.receiptFamiliesDefined,
    nonSuccessLifecycleReceiptKindsDefined:
      result.nonSuccessLifecycleReceiptKindsDefined,
    forwardInvalidationReceiptKindsDefined:
      result.forwardInvalidationReceiptKindsDefined,
    noMutationReceiptKindsDefined: result.noMutationReceiptKindsDefined,
    typeSpecificTransitionBoundSuccessReceiptKindsDefined:
      result.typeSpecificTransitionBoundSuccessReceiptKindsDefined,
    successFamiliesFormOneFlatManifest:
      result.successFamiliesFormOneFlatManifest,
    successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput:
      result.successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput,
    packetReviewContentBindingFieldsRequired:
      result.packetReviewContentBindingFieldsRequired,
    draftReceiptEnvelopeRequirementsDefined:
      result.draftReceiptEnvelopeRequirementsDefined,
    aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements:
      result
        .aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements,
    executableReceiptSchemasImplemented:
      result.executableReceiptSchemasImplemented,
    positiveTransitionEvaluatorImplemented:
      result.positiveTransitionEvaluatorImplemented,
    receiptInstances: result.receiptInstances,
    transitionInstances: result.transitionInstances,
    admissionCycleInstances: result.admissionCycleInstances,
    ledgerGenerationInstances: result.ledgerGenerationInstances,
    evaluationSnapshotInstances: result.evaluationSnapshotInstances,
    preSnapshotEvidenceManifestInstances:
      result.preSnapshotEvidenceManifestInstances,
    conditionsOneToSevenEvaluationInputManifestInstances:
      result.conditionsOneToSevenEvaluationInputManifestInstances,
    finalReadinessEvaluationInputManifestInstances:
      result.finalReadinessEvaluationInputManifestInstances,
    manifestLayerCount: result.manifestLayerCount,
    manifestLayerInstances: result.manifestLayerInstances,
    manifestLayeringAcyclicRequired: result.manifestLayeringAcyclicRequired,
    outputReceiptMayBeIncludedInOwnInputManifest:
      result.outputReceiptMayBeIncludedInOwnInputManifest,
    manifestDigestDomainsMustBeDistinct:
      result.manifestDigestDomainsMustBeDistinct,
    manifestLayerExactSetRuntimeVerified:
      result.manifestLayerExactSetRuntimeVerified,
    nonSuccessLifecycleReceiptInstances:
      result.nonSuccessLifecycleReceiptInstances,
    forwardInvalidationEpochHeadNonceAtomicAdvanceRequired:
      result.forwardInvalidationEpochHeadNonceAtomicAdvanceRequired,
    transitionRejectionDeterministicNoMutationRequired:
      result.transitionRejectionDeterministicNoMutationRequired,
    failedTransitionChangesAnyAtomicCommitField:
      result.failedTransitionChangesAnyAtomicCommitField,
    nonSuccessLifecycleReceiptExecutionObserved:
      result.nonSuccessLifecycleReceiptExecutionObserved,
    forwardInvalidationRuntimeVerified:
      result.forwardInvalidationRuntimeVerified,
    transitionRejectionRuntimeVerified:
      result.transitionRejectionRuntimeVerified,
    operationNoncesConsumed: result.operationNoncesConsumed,
    currentConsumedNonceSetHeadDigest:
      result.currentConsumedNonceSetHeadDigest,
    generationScopedNonceRequired: result.generationScopedNonceRequired,
    consumedNonceHeadCommittedAtomically:
      result.consumedNonceHeadCommittedAtomically,
    generationScopedNonceRuntimeEnforced:
      result.generationScopedNonceRuntimeEnforced,
    consumedNonceHeadAtomicCommitRuntimeObserved:
      result.consumedNonceHeadAtomicCommitRuntimeObserved,
    runtimeReceiptEvidenceEstablished: result.runtimeReceiptEvidenceEstablished,
    runtimeReceiptExecutionObserved: result.runtimeReceiptExecutionObserved,
    browserRuntimeObserved: result.browserRuntimeObserved,
    singleWriterFencingEstablished: result.singleWriterFencingEstablished,
    externalMonotonicAnchorEstablished: result.externalMonotonicAnchorEstablished,
    offlineCloneOrOldBackupRollbackResistanceEstablished:
      result.offlineCloneOrOldBackupRollbackResistanceEstablished,
    candidateInstanceCount: result.candidateInstanceCount,
    personalDataFieldCount: result.personalDataFieldCount,
    personDerivedDigestCount: result.personDerivedDigestCount,
    publicProjectionMayClaimAnonymous: result.publicProjectionMayClaimAnonymous,
    stableDigestMechanicallyBlockedForArbitraryCandidate:
      result.stableDigestMechanicallyBlockedForArbitraryCandidate,
    publicNonPersonLifecycleAttestationRequired:
      result.publicNonPersonLifecycleAttestationRequired,
    publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator:
      result.publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator,
    publicNonPersonLifecycleAttestationCurrentInstances:
      result.publicNonPersonLifecycleAttestationCurrentInstances,
    publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead:
      result
        .publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead,
    publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest:
      result
        .publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest,
    publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage:
      result
        .publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage,
    publicNonPersonLifecycleAttestationRuntimeVerified:
      result.publicNonPersonLifecycleAttestationRuntimeVerified,
    independentLegalAuthorityRoleStatus:
      result.independentLegalAuthorityRoleStatus,
    independentLegalAuthorityMinimumSeatCount:
      result.independentLegalAuthorityMinimumSeatCount,
    independentLegalAuthorityCurrentSeatCount:
      result.independentLegalAuthorityCurrentSeatCount,
    inputContractGateSatisfied: result.inputContractGateSatisfied,
    activeAdmissionEffect: result.activeAdmissionEffect,
    contentTruthEstablished: result.contentTruthEstablished,
    expertTruthEstablished: result.expertTruthEstablished,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    domainAuthorityAuthorized: result.domainAuthorityAuthorized,
    legalConclusionAuthorized: result.legalConclusionAuthorized,
    formalProjectionAuthorized: result.formalProjectionAuthorized,
    formalAdmissionAuthorized: result.formalAdmissionAuthorized,
    highRiskClaimsAuthorized: result.highRiskClaimsAuthorized,
    releaseEvidenceComplete: result.releaseEvidenceComplete,
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
    requirementsOnlyContractMechanicallyObservedUnderUnverifiedRuntime: false,
    endpointSetObservationBrandVerified: false,
    visibleNodeLaunchStateCleanObserved: false,
    erasedPreloadExcluded: false,
    loadedModuleByteIdentityVerified: false,
    nodeLoaderIntegrityVerified: false,
    runtimeLauncherIdentityVerified: false,
    runtimeIntrinsicIntegrityVerified: false,
    simultaneousCurrentRawClosureVerified: false,
    crossFileAtomicSnapshot: false,
    parentAndChildrenAtomicSnapshot: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    guardsDefined: 0,
    receiptFamiliesDefined: 0,
    nonSuccessLifecycleReceiptKindsDefined: 0,
    forwardInvalidationReceiptKindsDefined: 0,
    noMutationReceiptKindsDefined: 0,
    typeSpecificTransitionBoundSuccessReceiptKindsDefined: 0,
    manifestLayerCount: 0,
    manifestLayerInstances: 0,
    manifestLayerExactSetRuntimeVerified: false,
    nonSuccessLifecycleReceiptInstances: 0,
    nonSuccessLifecycleReceiptExecutionObserved: false,
    forwardInvalidationRuntimeVerified: false,
    transitionRejectionRuntimeVerified: false,
    operationNoncesConsumed: 0,
    currentConsumedNonceSetHeadDigest: null,
    generationScopedNonceRuntimeEnforced: false,
    consumedNonceHeadAtomicCommitRuntimeObserved: false,
    publicNonPersonLifecycleAttestationCurrentInstances: 0,
    publicNonPersonLifecycleAttestationRuntimeVerified: false,
    code,
    message,
    inputContractGateSatisfied: false,
    legalConclusionAuthorized: false,
    formalProjectionAuthorized: false,
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
