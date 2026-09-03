#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FourSystemCurrentStatusObservationChildV23Error,
  loadFourSystemCurrentStatusObservationChildV23,
  isVerifiedFourSystemCurrentStatusObservationChildV23
} from "./four-system-current-status-observation-child-v2-3-lib.mjs";

const FAILED_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_MECHANICS_FAILED";
const REFLECT_APPLY = Reflect.apply;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_TRIM = String.prototype.trim;
const JSON_STRINGIFY = JSON.stringify;

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
    const child = await loadFourSystemCurrentStatusObservationChildV23(workspaceRoot);
    if (!isVerifiedFourSystemCurrentStatusObservationChildV23(child)) {
      throw new Error("PRIVATE_BRAND_MISSING");
    }
    const systems = new Array(child.systems.length);
    for (let index = 0; index < child.systems.length; index += 1) {
      const entry = child.systems[index];
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [systems, index, {
        configurable: true,
        enumerable: true,
        value: {
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
        },
        writable: true
      }]);
    }
    process.stdout.write(`${REFLECT_APPLY(JSON_STRINGIFY, JSON, [{
      currentStatusObservationChildV23MechanicallyVerified: true,
      childId: child.childId,
      childDigest: child.childDigest,
      parentV22MechanicallyCurrent: child.lineage.parentMechanicallyCurrent,
      parentV22PreservedUnmodified: child.lineage.parentPreservedUnmodified,
      parentLoaderRecursivelyReverifiedItsUpstreams:
        child.lineage.parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams,
      uniqueBlockerClaimed: child.lineage.uniqueBlockerClaimed,
      systems,
      systemsFormallyAdmitted: child.currentStatusSummary.systemsFormallyAdmitted,
      totalAdmissionGatesSatisfied:
        child.currentStatusSummary.totalAdmissionGatesSatisfied,
      formalCrossSystemComparisonAuthorized:
        child.crossSystemPolicy.formalComparisonAuthorized,
      exactPersistedRawIdentitiesVerified:
        child.observationBoundary.exactPersistedRawIdentitiesVerified,
      upstreamPrivateBrandsVerified:
        child.observationBoundary.upstreamPrivateBrandsVerified,
      crossFileAtomicSnapshot: child.observationBoundary.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13:
        child.observationBoundary.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: child.observationBoundary.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles:
        child.observationBoundary.intervalMutationExcludedAcrossFiles,
      abaExcluded: child.observationBoundary.abaExcluded,
      childDigestIsDigitalSignature:
        child.observationBoundary.childDigestIsDigitalSignature,
      releaseReady: child.authorityBoundary.releaseReady,
      publicDeploymentAuthorized:
        child.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: child.authorityBoundary.publicReleaseAuthorized,
      expertClaimsAuthorized: child.authorityBoundary.expertClaimsAuthorized,
      persistedAsCentralRegistry:
        child.versionBoundary.persistedAsCentralRegistry,
      activeAdmissionEffect: child.activeAdmissionEffect
    }])}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof FourSystemCurrentStatusObservationChildV23Error
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
