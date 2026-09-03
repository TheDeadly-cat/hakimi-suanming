import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WesternCivilTimeFactBrowserObservationError,
  loadWesternCivilTimeFactBrowserObservationCandidate,
  verifyWesternCivilTimeFactBrowserObservation
} from "./western-civil-time-fact-browser-observation-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");

export function runWesternCivilTimeFactBrowserObservationCli({
  argv = process.argv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write("WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_OPERANDS_FORBIDDEN\n");
    return 2;
  }
  if (Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const result = verifyWesternCivilTimeFactBrowserObservation(workspaceRoot);
    const candidate = loadWesternCivilTimeFactBrowserObservationCandidate(workspaceRoot);
    stdout.write(`${JSON.stringify({
      kind: result.kind,
      schemaVersion: result.schemaVersion,
      runtimeModuleCount: result.runtimeModuleCount,
      runtimeImportEdgeCount: result.runtimeImportEdgeCount,
      appsWebReadableSourceFilesScanned:
        result.productionReachability.appsWebReadableSourceFilesScanned,
      appsWebReverseReferenceCount:
        result.productionReachability.appsWebReverseReferenceCount,
      observationDigest: candidate.observationDigest,
      artifactBindingCount: candidate.artifactBindingCount,
      incompleteProductionReachabilityAudit: result.incompleteProductionReachabilityAudit,
      wholeRepositoryProductionUnreachableEstablished:
        result.wholeRepositoryProductionUnreachableEstablished,
      browserRuntimeEvidenceEstablished: result.browserRuntimeEvidenceEstablished,
      contentTruthEstablished: result.contentTruthEstablished,
      expertTruthEstablished: result.expertTruthEstablished,
      rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
      releaseReadyEstablished: result.releaseReadyEstablished,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof WesternCivilTimeFactBrowserObservationError
      ? error.code
      : "WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_INTERNAL_FAILURE";
    stderr.write(`${code}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = runWesternCivilTimeFactBrowserObservationCli();
}
