#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_OK";
const FAILED_PREFIX = "BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_FAILED";
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
    case "PARENT_PRIVATE_BRAND_REQUIRED":
    case "PARENT_SEMANTIC_MISMATCH":
    case "PARENT_BINDING_INVENTORY_MISMATCH":
    case "BASIS_SEMANTIC_MISMATCH":
    case "PERSISTED_DIGEST_MISMATCH":
    case "PERSISTED_INVENTORY_MISMATCH":
    case "PERSISTED_SEMANTIC_MISMATCH":
    case "FROZEN_DIGEST_MISMATCH":
    case "PERSISTED_IDENTITY_UNPINNED":
    case "ZERO_INSTANCE_BOUNDARY_MISMATCH":
    case "AUTHORITY_BOUNDARY_MISMATCH":
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
        isVerifiedBaziBindingCitationLocatorLinkRequirements,
        loadBaziBindingCitationLocatorLinkRequirements
      } = await import("./bazi-binding-citation-locator-link-requirements-lib.mjs");
      const result = await loadBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
      if (!isVerifiedBaziBindingCitationLocatorLinkRequirements(result)) {
        const error = new Error("unbranded requirements result");
        error.code = "PRIVATE_WEAKSET_BRAND_REQUIRED";
        throw error;
      }
      process.stdout.write(`${OK_PREFIX} ${JSON.stringify({
        mechanicalRequirementsVerified:
          result.bindingCitationLocatorLinkRequirementsMechanicallyVerified,
        ledgerId: result.ledgerId,
        ledgerDigest: result.ledgerDigest,
        artifact: result.artifact,
        parentReadinessLedgerId: result.parentReadinessLedgerId,
        parentReadinessLedgerDigest: result.parentReadinessLedgerDigest,
        parentFullLoaderPrivateBrandConsumed: result.parentFullLoaderPrivateBrandConsumed,
        bindingRequired: result.bindingRequired,
        inventoryRows: result.inventoryRows,
        singleChartReportEvidenceSubjectMappingObserved:
          result.singleChartReportEvidenceSubjectMappingObserved,
        singleChartReportBindingEvidenceSubjectsIncluded:
          result.singleChartReportBindingEvidenceSubjectsIncluded,
        reportConsumerClosureAssessedByThisChild:
          result.reportConsumerClosureAssessedByThisChild,
        reportCitationAdmissionReplayedByThisChild:
          result.reportCitationAdmissionReplayedByThisChild,
        singleChartReportAdmissionEffect: result.singleChartReportAdmissionEffect,
        singleChartReportFrozenGoldenReverifiedByThisChild:
          result.singleChartReportFrozenGoldenReverifiedByThisChild,
        singleChartReportBrowserEvidenceEstablishedByThisChild:
          result.singleChartReportBrowserEvidenceEstablishedByThisChild,
        currentReceipts: result.currentReceipts,
        bindingsLocatorLinked: result.bindingsLocatorLinked,
        minimalQuoteSufficiency: result.minimalQuoteSufficiency,
        formalKnowledgeDocuments: result.formalKnowledgeDocuments,
        formalSourceRightsRecords: result.formalSourceRightsRecords,
        formalSourceCarrierRecords: result.formalSourceCarrierRecords,
        projectCopyMaterializationRecords: result.projectCopyMaterializationRecords,
        materializationsVerified: result.materializationsVerified,
        bindingsFrozen: result.bindingsFrozen,
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
