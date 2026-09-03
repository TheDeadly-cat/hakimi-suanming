import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX =
  "BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_OK";
const FAILED_PREFIX =
  "BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_FAILED";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function safeCode(error) {
  return typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/u.test(error.code)
    ? error.code
    : "UNEXPECTED_FAILURE";
}

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

function visibleLoaderInjectionPresent() {
  const nodeOptions = typeof process.env.NODE_OPTIONS === "string"
    ? process.env.NODE_OPTIONS.trim()
    : "";
  const injectedExecArgument = process.execArgv.some((argument) =>
    /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)
  );
  return nodeOptions !== "" || injectedExecArgument;
}

if (process.argv.length !== 2) {
  writeFailure("CLI_ARGUMENTS_FORBIDDEN");
} else if (visibleLoaderInjectionPresent()) {
  writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
} else {
  try {
    const module = await import(
      "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs"
    );
    const result = await module.loadBaziExpertReviewIntakeGapVersionAwareCandidate(
      workspaceRoot
    );
    if (!module.isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(result)) {
      const error = new Error("loader result lacks the private candidate brand");
      error.code = "UNBRANDED_CANDIDATE_RESULT";
      throw error;
    }
    if (
      result.historicalDirectParentSlotsRebound !== 3
      || result.verifiedUpstreamPrivateBrandCount !== 2
      || result.supportingSupersessionReceiptArtifactCount !== 1
      || result.historicalPacketArtifactLockSlots !== 12
      || result.candidateProjectedArtifactLockExactMatches !== 11
      || result.candidateProjectedArtifactLockDrifts !== 1
      || result.domainExpertsRequired !== 2
      || result.reviewerSlotsOccupied !== 0
      || result.currentRecordInstances !== 0
    ) {
      const error = new Error("candidate narrow public summary drifted");
      error.code = "PUBLIC_SUMMARY_DRIFT";
      throw error;
    }
    if (
      typeof result.artifact?.path !== "string"
      || path.isAbsolute(result.artifact.path)
      || result.artifact.path.split(/[\\/]/u).includes("..")
    ) {
      const error = new Error("candidate artifact path is not a safe relative path");
      error.code = "UNSAFE_PUBLIC_ARTIFACT_PATH";
      throw error;
    }

    const output = {
      versionAwareExpertReviewIntakeGapMechanicallyVerified:
        result.versionAwareExpertReviewIntakeGapMechanicallyVerified,
      candidateResultWeakSetBrandVerified: true,
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      artifact: {
        path: result.artifact.path,
        bytes: result.artifact.bytes,
        sha256: result.artifact.sha256
      },
      fixedDefaultGovernance: {
        activeLine: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      activeAdmissionEffect: result.activeAdmissionEffect,
      parentAccounting: {
        historicalDirectParentSlotsRebound: result.historicalDirectParentSlotsRebound,
        verifiedUpstreamPrivateBrandCount: result.verifiedUpstreamPrivateBrandCount,
        supportingReceiptArtifactCount:
          result.supportingSupersessionReceiptArtifactCount
      },
      artifactLockAccounting: {
        packetArtifactLocksRequired: result.historicalPacketArtifactLockSlots,
        candidateProjectedArtifactLockExactMatches:
          result.candidateProjectedArtifactLockExactMatches,
        candidateProjectedArtifactLockDrifts:
          result.candidateProjectedArtifactLockDrifts,
        packetArtifactLocksCurrent: result.packetArtifactLocksCurrent
      },
      reviewerSeatAccounting: {
        domainExpertsRequired: result.domainExpertsRequired,
        vacantReviewerSeats: result.domainExpertsRequired - result.reviewerSlotsOccupied,
        realReviewerInstances: result.reviewerSlotsOccupied,
        independentExpertReviewsVerified: result.independentExpertReviewsVerified
      },
      collectionRedGates: {
        currentRecordInstances: result.currentRecordInstances,
        sealedOriginalOpinions: result.sealedOriginalOpinions,
        candidateFeedbackCollectionReady: result.candidateFeedbackCollectionReady,
        expertReviewBundleComplete: result.expertReviewBundleComplete
      },
      authorityRedGates: {
        countsTowardExpertGate: result.countsTowardExpertGate,
        bindingRequired: result.bindingRequired,
        bindingFrozenVerified: result.bindingFrozenVerified,
        sourceBundleComplete: result.sourceBundleComplete,
        rightsBundleComplete: result.rightsBundleComplete,
        formalAdmissionPromotionBlocked: result.formalAdmissionPromotionBlocked,
        formalActivationAllowed: result.formalActivationAllowed,
        contentTruthEstablished: result.contentTruthEstablished,
        expertTruthEstablished: result.expertTruthEstablished,
        rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished
      },
      observationRedGates: {
        crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
        mutationEpochAvailableForSchema13: result.mutationEpochAvailableForSchema13,
        mutationEpochReceipt: result.mutationEpochReceipt,
        intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
        abaExcluded: result.abaExcluded
      },
      releaseRedGates: {
        releaseReady: result.releaseReady,
        publicDeploymentAuthorized: result.publicDeploymentAuthorized,
        expertClaimsAuthorized: result.expertClaimsAuthorized
      }
    };

    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(output)}\n`);
  } catch (error) {
    writeFailure(safeCode(error));
  }
}
