#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FourSystemCurrentStatusObservationChildV22Error,
  loadFourSystemCurrentStatusObservationChildV22,
  isVerifiedFourSystemCurrentStatusObservationChildV22
} from "./four-system-current-status-observation-child-v2-2-lib.mjs";

const FAILED_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_MECHANICS_FAILED";
const REFLECT_APPLY = Reflect.apply;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_TRIM = String.prototype.trim;

function hasVisiblePreloadArgument() {
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (argument === "-r"
      || argument === "--require"
      || REFLECT_APPLY(STRING_STARTS_WITH, argument, ["--require="])
      || argument === "--import"
      || REFLECT_APPLY(STRING_STARTS_WITH, argument, ["--import="])
      || argument === "--loader"
      || REFLECT_APPLY(STRING_STARTS_WITH, argument, ["--loader="])
      || argument === "--experimental-loader"
      || REFLECT_APPLY(STRING_STARTS_WITH, argument, ["--experimental-loader="])) {
      return true;
    }
  }
  return false;
}

export async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  if (REFLECT_APPLY(STRING_TRIM, process.env.NODE_OPTIONS ?? "", []) !== ""
    || hasVisiblePreloadArgument()) {
    process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
    return 1;
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const child = await loadFourSystemCurrentStatusObservationChildV22(workspaceRoot);
    if (!isVerifiedFourSystemCurrentStatusObservationChildV22(child)) {
      throw new Error("PRIVATE_BRAND_MISSING");
    }
    const systems = new Array(child.systems.length);
    for (let index = 0; index < child.systems.length; index += 1) {
      const entry = child.systems[index];
      systems[index] = {
        productSystemId: entry.productSystemId,
        currentStatus: entry.currentStatus,
        currentEndpointMechanicallyVerified:
          entry.currentEvidence.currentEndpointMechanicallyVerified,
        currentFullDomainManifestMechanicallyVerified:
          entry.currentEvidence.currentFullDomainManifestMechanicallyVerified,
        currentEngineeringManifestMechanicallyVerified:
          entry.currentEvidence.currentEngineeringManifestMechanicallyVerified,
        bindingFrozenVerified: entry.gateSummary.bindingFrozenVerified,
        bindingRequired: entry.gateSummary.bindingRequired,
        independentExpertReviewsVerified:
          entry.gateSummary.independentExpertReviewsVerified,
        independentExpertsRequired: entry.gateSummary.independentExpertsRequired,
        browserRuntimeEvidence: entry.currentEvidence.browserRuntimeEvidence
      };
    }
    process.stdout.write(`${JSON.stringify({
      currentStatusObservationChildV22MechanicallyVerified: true,
      childId: child.childId,
      childDigest: child.childDigest,
      parentV21MechanicallyCurrent: child.lineage.parentMechanicallyCurrent,
      parentV21PreservedUnmodified: child.lineage.parentPreservedUnmodified,
      uniqueBlockerClaimed: child.lineage.uniqueBlockerClaimed,
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
    const code = error instanceof FourSystemCurrentStatusObservationChildV22Error
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
