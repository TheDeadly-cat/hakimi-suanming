import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadBaziPolicyWeightsVersionAwareCandidate
} from "./bazi-policy-weights-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  process.stdout.write(
    `BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_MECHANICS_OK ${JSON.stringify({
      versionAwarePolicyWeightsCandidateMechanicallyVerified:
        result.versionAwarePolicyWeightsCandidateMechanicallyVerified,
      candidateId: result.candidateId,
      candidateDigest: result.candidateDigest,
      artifact: result.artifact,
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      activeAdmissionEffect: result.activeAdmissionEffect,
      versionAwareCandidateParentArtifacts: result.versionAwareCandidateParentArtifacts,
      historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind:
        result.historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind,
      bindingIdentityChanged: result.bindingIdentityChanged,
      parallelBindingsCreated: result.parallelBindingsCreated,
      bindingId: result.bindingId,
      policyVersion: result.policyVersion,
      policyWeightValueKeysObserved: result.policyWeightValueKeysObserved,
      scopedValueSubjectCount: result.scopedValueSubjectCount,
      stablePolicyDispatchSyntaxObserved: result.stablePolicyDispatchSyntaxObserved,
      directConsumerCallShapeCount: result.directConsumerCallShapeCount,
      sourceEvidenceRefsBound: result.sourceEvidenceRefsBound,
      formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
      formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
      engineeringRationalesFrozen: result.engineeringRationalesFrozen,
      engineeringReviewsVerified: result.engineeringReviewsVerified,
      expertReviewsVerified: result.expertReviewsVerified,
      independentDomainReviewsVerified: result.independentDomainReviewsVerified,
      bindingFreezeEligible: result.bindingFreezeEligible,
      scopedBindingFrozenVerified: result.scopedBindingFrozenVerified,
      scopedWeightsCurrentDistributionBoundary:
        result.scopedWeightsCurrentDistributionBoundary,
      sourceBundleComplete: result.sourceBundleComplete,
      rightsBundleComplete: result.rightsBundleComplete,
      expertReviewBundleComplete: result.expertReviewBundleComplete,
      formalAdmissionPromotionBlocked: result.formalAdmissionPromotionBlocked,
      formalActivationAllowed: result.formalActivationAllowed,
      contentTruthEstablished: result.contentTruthEstablished,
      expertTruthEstablished: result.expertTruthEstablished,
      rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
      browserRuntimeEvidenceEstablished: result.browserRuntimeEvidenceEstablished,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13: result.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: result.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
      abaExcluded: result.abaExcluded
    })}\n`
  );
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
