#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FourSystemCurrentStatusObservationChildV21Error,
  loadFourSystemCurrentStatusObservationChildV21,
  isVerifiedFourSystemCurrentStatusObservationChildV21
} from "./four-system-current-status-observation-child-v2-1-lib.mjs";

const FAILED_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_MECHANICS_FAILED";

function hasVisiblePreloadArgument() {
  return process.execArgv.some((argument) => (
    argument === "-r"
    || argument === "--require"
    || argument.startsWith("--require=")
    || argument === "--import"
    || argument.startsWith("--import=")
    || argument === "--loader"
    || argument.startsWith("--loader=")
    || argument === "--experimental-loader"
    || argument.startsWith("--experimental-loader=")
  ));
}

export async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  if ((process.env.NODE_OPTIONS ?? "").trim() !== "" || hasVisiblePreloadArgument()) {
    process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
    return 1;
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const child = await loadFourSystemCurrentStatusObservationChildV21(workspaceRoot);
    if (!isVerifiedFourSystemCurrentStatusObservationChildV21(child)) {
      throw new Error("PRIVATE_BRAND_MISSING");
    }
    const systems = child.systems.map((entry) => ({
      productSystemId: entry.productSystemId,
      currentStatus: entry.currentStatus,
      currentEndpointMechanicallyVerified:
        entry.currentEvidence.currentEndpointMechanicallyVerified,
      currentFullDomainManifestMechanicallyVerified:
        entry.currentEvidence.currentFullDomainManifestMechanicallyVerified,
      bindingFrozenVerified: entry.gateSummary.bindingFrozenVerified,
      bindingRequired: entry.gateSummary.bindingRequired,
      independentExpertReviewsVerified:
        entry.gateSummary.independentExpertReviewsVerified,
      independentExpertsRequired: entry.gateSummary.independentExpertsRequired,
      browserRuntimeEvidence: entry.currentEvidence.browserRuntimeEvidence
    }));
    process.stdout.write(`${JSON.stringify({
      currentStatusObservationChildV21MechanicallyVerified: true,
      childId: child.childId,
      childDigest: child.childDigest,
      parentRegistryV2MechanicallyCurrent: child.lineage.parentMechanicallyCurrent,
      systems,
      systemsFormallyAdmitted: child.currentStatusSummary.systemsFormallyAdmitted,
      totalAdmissionGatesSatisfied:
        child.currentStatusSummary.totalAdmissionGatesSatisfied,
      formalCrossSystemComparisonAuthorized:
        child.crossSystemPolicy.formalComparisonAuthorized,
      crossFileAtomicSnapshot: child.observationBoundary.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13:
        child.observationBoundary.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: child.observationBoundary.mutationEpochReceipt,
      releaseReady: child.authorityBoundary.releaseReady,
      publicDeploymentAuthorized:
        child.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: child.authorityBoundary.publicReleaseAuthorized,
      expertClaimsAuthorized: child.authorityBoundary.expertClaimsAuthorized,
      persistedAsCentralRegistry:
        child.versionBoundary.persistedAsCentralRegistry,
      activeAdmissionEffect: child.activeAdmissionEffect
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof FourSystemCurrentStatusObservationChildV21Error
      ? error.code
      : "UNEXPECTED_ERROR";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) process.exitCode = await main();
