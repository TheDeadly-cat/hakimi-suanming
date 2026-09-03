#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_OBSERVATION_OK";
const FAILED_PREFIX = "BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_FAILED";
const cliPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(cliPath), "..");
const isDirectEntry = typeof process.argv[1] === "string"
  && path.resolve(process.argv[1]) === cliPath;

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

function visibleLoaderInjectionPresent() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument === "string"
      && /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)) return true;
  }
  return false;
}

function safeCode(error) {
  switch (error?.code) {
    case "RAW_IDENTITY_MISMATCH":
    case "SEMANTIC_IDENTITY_MISMATCH":
    case "PREDECESSOR_SEMANTIC_MISMATCH":
    case "PREDECESSOR_SHAPE_MISMATCH":
    case "PREDECESSOR_RED_GATE_MISMATCH":
    case "GOVERNANCE_MISMATCH":
    case "BINDING_ROWS_DIGEST_MISMATCH":
    case "BASIS_DIGEST_MISMATCH":
    case "PERSISTED_DIGEST_MISMATCH":
    case "FROZEN_DIGEST_MISMATCH":
    case "PERSISTED_IDENTITY_UNPINNED":
      return error.code;
    default:
      return "VERIFICATION_FAILED";
  }
}

if (isDirectEntry) {
  if (process.argv.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
  } else if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  } else {
    try {
      const {
        isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
        loadBaziKnowledgeCoreIdentityReboundBindingReadiness
      } = await import("./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs");
      const result = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
      if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(result)) {
        const error = new Error("unbranded observation result");
        error.code = "PRIVATE_WEAKSET_BRAND_REQUIRED";
        throw error;
      }
      process.stdout.write(`${OK_PREFIX} ${JSON.stringify({
        mechanicalObservationVerified:
          result.knowledgeCoreIdentityReboundBindingReadinessMechanicallyVerified,
        ledgerId: result.ledgerId,
        ledgerDigest: result.ledgerDigest,
        artifact: result.artifact,
        predecessorCurrent: result.predecessorCurrent,
        predecessorPrivateBrandConsumed: result.predecessorPrivateBrandConsumed,
        historicalObservationBrandCurrent: result.historicalObservationBrandCurrent,
        historicalPrivateBrandsConsumed: result.historicalPrivateBrandsConsumed,
        historicalUpstreamPrivateBrandsInvoked: result.historicalUpstreamPrivateBrandsInvoked,
        productionWebConsumerClosureEstablished: result.productionWebConsumerClosureEstablished,
        productionBodyInventoryAndBytesAudited: result.productionBodyInventoryAndBytesAudited,
        productionWebCallSitePinned: result.productionWebCallSitePinned,
        currentBuildGateExecuted: result.currentBuildGateExecuted,
        currentKnowledgeCoreIdentity: result.currentKnowledgeCoreIdentity,
        currentMachineIdentityRebindCount: result.currentMachineIdentityRebindCount,
        bindingRequired: result.bindingRequired,
        bindingRowsChanged: result.bindingRowsChanged,
        bindingFrozenVerified: result.bindingFrozenVerified,
        carrierObservationLayersObserved: result.carrierObservationLayersObserved,
        visualPageCorrespondencesObserved: result.visualPageCorrespondencesObserved,
        normalizedFacsimileCollationCandidatesObserved:
          result.normalizedFacsimileCollationCandidatesObserved,
        exactGlyphFacsimileCorrespondenceCandidatesObserved:
          result.exactGlyphFacsimileCorrespondenceCandidatesObserved,
        candidateQuoteDigestsObserved: result.candidateQuoteDigestsObserved,
        formalKnowledgeDocumentCount: result.formalKnowledgeDocumentCount,
        formalSourceRightsRecordCount: result.formalSourceRightsRecordCount,
        formalSourceCarrierRecordCount: result.formalSourceCarrierRecordCount,
        projectCopyMaterializationRecordCount: result.projectCopyMaterializationRecordCount,
        materializationsVerified: result.materializationsVerified,
        verifiedNaturalPersonRightsReviewers: result.verifiedNaturalPersonRightsReviewers,
        domainExpertReviewCount: result.domainExpertReviewCount,
        rightsLegalReviewCount: result.rightsLegalReviewCount,
        sourceBundleComplete: result.sourceBundleComplete,
        rightsBundleComplete: result.rightsBundleComplete,
        expertReviewBundleComplete: result.expertReviewBundleComplete,
        sameEditionVerified: result.sameEditionVerified,
        specificWikisourceCarrierProvenanceEstablished:
          result.specificWikisourceCarrierProvenanceEstablished,
        externalCarrierLiveVerifiedThisRun: result.externalCarrierLiveVerifiedThisRun,
        distributionPolicy: result.distributionPolicy,
        contentTruthEstablished: result.contentTruthEstablished,
        expertTruthEstablished: result.expertTruthEstablished,
        rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
        activeAdmissionEffect: result.activeAdmissionEffect,
        releaseReady: result.releaseReady,
        publicDeploymentAuthorized: result.publicDeploymentAuthorized,
        expertClaimsAuthorized: result.expertClaimsAuthorized,
        releaseIdentity: result.releaseIdentity,
        targetSchema: result.targetSchema,
        migrationId: result.migrationId,
        crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
        mutationEpochAvailableForSchema13: result.mutationEpochAvailableForSchema13,
        mutationEpochReceipt: result.mutationEpochReceipt,
        intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
        abaExcluded: result.abaExcluded,
        runtimeTrustCalibration: {
          hiddenPreloadExcluded: false,
          nodeRuntimeIdentityEstablished: false,
          loaderIdentityEstablished: false,
          runtimeLauncherIdentityEstablished: false,
          cliOutputTrustedAttestation: false,
          visibleLoaderGuardIsSecurityBoundary: false,
          mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
        }
      })}\n`);
    } catch (error) {
      writeFailure(safeCode(error));
    }
  }
}
