import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
  loadBaziProjectCopyMaterializationVersionAwareCandidate
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OK_PREFIX = "BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_MECHANICS_OK";
const FAILED_PREFIX = "BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_MECHANICS_FAILED";

try {
  const result = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  if (!isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(result)) {
    const error = new Error("loader result lacks the private candidate brand");
    error.code = "UNBRANDED_CANDIDATE_RESULT";
    throw error;
  }

  const output = {
    versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified:
      result.versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified,
    candidateResultWeakSetBrandVerified: true,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    artifact: result.artifact,
    fixedDefaultGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    activeAdmissionEffect: result.activeAdmissionEffect,
    parentAccounting: {
      directBasisArtifactCount: 6,
      historicalDirectParentSlotsRebound: result.historicalDirectParentSlotsRebound,
      verifiedUpstreamPrivateBrandCount: result.verifiedUpstreamCapabilityCount,
      supportingReceiptArtifactCount: 1,
      unchangedDirectNonParentBasisCount: result.unchangedDirectNonParentBasisCount
    },
    historicalProjectionReuse: {
      materializationContractProjectionReused:
        result.historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind
    },
    materializationApi: {
      integratedByThisCandidate: result.materializationApiIntegratedByThisCandidate,
      candidateSchemaVersion: result.materializationCandidateSchemaVersion,
      receiptSchemaVersion: result.materializationReceiptSchemaVersion,
      normalizationProfileId: result.normalizationProfileId
    },
    zeroInstanceCounts: {
      bundledManifestEntryCount: result.bundledManifestEntryCount,
      formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
      formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
      materializationVerifiedCount: result.materializationVerifiedCount,
      projectCopyMaterializationRecordCount: result.projectCopyMaterializationRecordCount,
      redistributableSourceCount: result.redistributableSourceCount
    },
    redGates: {
      bindingRequired: result.bindingRequired,
      bindingFrozenVerified: result.bindingFrozenVerified,
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
    }
  };

  process.stdout.write(`${OK_PREFIX} ${JSON.stringify(output)}\n`);
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "UNEXPECTED_FAILURE";
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}
