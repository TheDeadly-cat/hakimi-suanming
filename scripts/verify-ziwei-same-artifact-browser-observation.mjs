import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ZiweiSameArtifactObservationError,
  loadZiweiSameArtifactCandidate
} from "./ziwei-same-artifact-browser-observation-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

export function runZiweiSameArtifactBrowserObservationVerifier({
  argv = process.argv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write("ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_OPERANDS_FORBIDDEN\n");
    return 2;
  }
  if (Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const result = loadZiweiSameArtifactCandidate(workspaceRoot);
    const candidate = result.candidate;
    stdout.write(`${JSON.stringify({
      kind: candidate.recordType,
      schemaVersion: candidate.schemaVersion,
      status: candidate.status,
      rawSha256: result.rawSha256,
      observationDigest: result.observationDigest,
      buildSourceFileCount: candidate.buildSourceSnapshot.fileCount,
      evidenceToolFileCount: candidate.evidenceToolingSnapshot.fileCount,
      outputTreeDigest: candidate.runtimeObservation.outputTreeBefore.treeDigest,
      chromeVersion: candidate.runtimeObservation.browserProbes.find(
        (entry) => entry.projectName === "chrome"
      )?.versionBefore,
      edgeVersion: candidate.runtimeObservation.browserProbes.find(
        (entry) => entry.projectName === "msedge"
      )?.versionBefore,
      passedOutcomeCount: candidate.runtimeObservation.playwrightSummary.passedOutcomeCount,
      fullStorageSnapshotComparisonScenariosPerBrowser:
        candidate.storageBackupRecoveryBoundary.fullStorageSnapshotComparisonScenariosPerBrowser,
      completeStorageValueCoverageAcrossAllScenarios:
        candidate.storageBackupRecoveryBoundary.completeStorageValueCoverageAcrossAllScenarios,
      releaseReady: candidate.authorityBoundary.releaseReady,
      publicDeploymentAuthorized: candidate.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: candidate.authorityBoundary.publicReleaseAuthorized,
      expertClaimsAuthorized: candidate.authorityBoundary.expertClaimsAuthorized
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof ZiweiSameArtifactObservationError
      ? error.code
      : "ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_INTERNAL_FAILURE";
    stderr.write(`${code}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runZiweiSameArtifactBrowserObservationVerifier();
