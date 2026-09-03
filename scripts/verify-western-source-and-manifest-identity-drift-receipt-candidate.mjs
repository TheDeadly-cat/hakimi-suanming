#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WesternSourceAndManifestIdentityDriftReceiptCandidateError,
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate,
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";

const OK_PREFIX =
  "WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK";
const FAILED_PREFIX =
  "WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED";

function hasVisiblePreloadArgument() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (argument === "-r"
      || argument === "--require"
      || argument.startsWith("--require=")
      || argument === "--import"
      || argument.startsWith("--import=")
      || argument === "--loader"
      || argument.startsWith("--loader=")
      || argument === "--experimental-loader"
      || argument.startsWith("--experimental-loader=")) return true;
  }
  return false;
}

export async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(FAILED_PREFIX + " ARGUMENTS_FORBIDDEN\n");
    return 1;
  }
  if ((process.env.NODE_OPTIONS ?? "").trim() !== "" || hasVisiblePreloadArgument()) {
    process.stderr.write(FAILED_PREFIX + " PRELOAD_ENVIRONMENT_FORBIDDEN\n");
    return 1;
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const receipt =
      await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(workspaceRoot);
    if (!isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(receipt)) {
      process.stderr.write(FAILED_PREFIX + " PRIVATE_CANDIDATE_BRAND_MISSING\n");
      return 1;
    }
    const summary = {
      westernSourceAndManifestIdentityDriftReceiptCandidateMechanicallyVerified: true,
      candidateId: receipt.candidateId,
      receiptDigest: receipt.receiptDigest,
      candidateOnly: true,
      currentStatus: receipt.currentStatus,
      activeAdmissionEffect: receipt.activeAdmissionEffect,
      sourceLoaderMechanicallyCurrent:
        receipt.formalSourceDrift.currentV12LoaderMechanicallyCurrent,
      sourceLoaderFailureClass:
        receipt.formalSourceDrift.currentV12LoaderFailureClass,
      manifestMechanicallyCurrent:
        receipt.formalManifestDrift.historicalManifestMechanicallyCurrent,
      manifestLoaderFailureClass:
        receipt.formalManifestDrift.currentLoaderFailureClass,
      sourceCounterfactualPersisted:
        receipt.formalSourceDrift.oldDefinitionCounterfactual.persisted,
      manifestCounterfactualPersisted:
        receipt.formalManifestDrift.oldDefinitionCounterfactual.persisted,
      currentEngineeringManifestComplete:
        receipt.oldDefinitionCoverageBoundary.currentEngineeringManifestComplete,
      changedComponentCount: receipt.formalManifestDrift.changedComponentCount,
      sixComponentDigestDriftsEqualSixIndependentSemanticChanges:
        receipt.formalManifestDrift
          .sixComponentDigestDriftsEqualSixIndependentSemanticChanges,
      uniqueBlockerClaimed: receipt.formalManifestDrift.uniqueBlockerClaimed,
      bindingFrozenVerified: receipt.gateSummary.bindingFrozenVerified,
      bindingRequired: receipt.gateSummary.bindingRequired,
      independentExpertReviewsVerified:
        receipt.gateSummary.independentExpertReviewsVerified,
      independentExpertsRequired: receipt.gateSummary.independentExpertsRequired,
      projectDefaultReleaseIdentity:
        receipt.releaseGovernance.projectDefaultContext.releaseIdentity,
      projectDefaultTargetSchema:
        receipt.releaseGovernance.projectDefaultContext.targetSchema,
      projectDefaultMigrationId:
        receipt.releaseGovernance.projectDefaultContext.migrationId,
      inheritedByWesternProductIdentity:
        receipt.releaseGovernance.projectDefaultContext.inheritedByWesternProductIdentity,
      crossFileAtomicSnapshot: receipt.observationBoundary.crossFileAtomicSnapshot,
      mutationEpochReceipt: receipt.observationBoundary.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles:
        receipt.observationBoundary.intervalMutationExcludedAcrossFiles,
      abaExcluded: receipt.observationBoundary.abaExcluded,
      receiptDigestIsDigitalSignature:
        receipt.observationBoundary.receiptDigestIsDigitalSignature,
      expertClaimsAuthorized: receipt.authorityBoundary.expertClaimsAuthorized,
      releaseReady: receipt.authorityBoundary.releaseReady,
      publicDeploymentAuthorized:
        receipt.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: receipt.authorityBoundary.publicReleaseAuthorized
    };
    process.stdout.write(OK_PREFIX + " " + JSON.stringify(summary) + "\n");
    return 0;
  } catch (error) {
    const code = error
      instanceof WesternSourceAndManifestIdentityDriftReceiptCandidateError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(FAILED_PREFIX + " " + code + "\n");
    return 1;
  }
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) process.exitCode = await main();
