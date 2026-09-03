#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_OBSERVATION_OK";
const FAILED_PREFIX = "BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_FAILED";
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
  const allowed = new Set([
    "PREDECESSOR_BRAND_REQUIRED",
    "SMT_SUPERSESSION_BRAND_REQUIRED",
    "CARRIER_READINESS_BRAND_REQUIRED",
    "PREDECESSOR_IDENTITY_MISMATCH",
    "SMT_SUPERSESSION_SUMMARY_MISMATCH",
    "CARRIER_READINESS_SUMMARY_MISMATCH",
    "RAW_IDENTITY_MISMATCH",
    "SEMANTIC_IDENTITY_MISMATCH",
    "PERSISTED_DIGEST_MISMATCH",
    "FROZEN_DIGEST_MISMATCH"
  ]);
  return typeof error?.code === "string" && allowed.has(error.code)
    ? error.code
    : "VERIFICATION_FAILED";
}

if (isDirectEntry) {
  if (process.argv.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
  } else if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  } else {
    try {
      const {
        isVerifiedBaziSmtV10VersionAwareBindingReadiness,
        loadBaziSmtV10VersionAwareBindingReadiness
      } = await import("./bazi-smt-v10-version-aware-binding-readiness-lib.mjs");
      const result = await loadBaziSmtV10VersionAwareBindingReadiness(workspaceRoot);
      if (!isVerifiedBaziSmtV10VersionAwareBindingReadiness(result)) {
        const error = new Error("unbranded observation result");
        error.code = "PRIVATE_WEAKSET_BRAND_REQUIRED";
        throw error;
      }
      process.stdout.write(`${OK_PREFIX} ${JSON.stringify({
      mechanicalObservationVerified: result.versionAwareSmtV10BindingReadinessMechanicallyVerified,
      ledgerId: result.ledgerId,
      ledgerDigest: result.ledgerDigest,
      sourceLedgerId: result.sourceLedgerId,
      sourceLedgerDigest: result.sourceLedgerDigest,
      rightsLedgerId: result.rightsLedgerId,
      rightsLedgerDigest: result.rightsLedgerDigest,
      bindingRequired: result.bindingRequired,
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
      activeAdmissionEffect: result.activeAdmissionEffect,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
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
