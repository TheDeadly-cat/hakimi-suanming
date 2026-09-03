import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WesternSameArtifactObservationError,
  loadWesternSameArtifactCandidate,
  serializeWesternSameArtifactCandidate,
  summarizeWesternSameArtifactCandidate
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");

export function runWesternSameArtifactBrowserObservationVerifier({
  argv = process.argv,
  execArgv = process.execArgv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  if (argv.length !== 2) {
    stderr.write("WESTERN_SAME_ARTIFACT_BROWSER_OBSERVATION_OPERANDS_FORBIDDEN\n");
    return 2;
  }
  if (execArgv.length !== 0 || Object.hasOwn(env, "NODE_OPTIONS") || Object.hasOwn(env, "NODE_PATH")) {
    stderr.write("WESTERN_SAME_ARTIFACT_BROWSER_OBSERVATION_NODE_ENV_FORBIDDEN\n");
    return 2;
  }
  try {
    const candidate = loadWesternSameArtifactCandidate(workspaceRoot);
    const summary = summarizeWesternSameArtifactCandidate(candidate);
    const rawSha256 = createHash("sha256")
      .update(Buffer.from(serializeWesternSameArtifactCandidate(candidate), "utf8"))
      .digest("hex");
    stdout.write(`${JSON.stringify({
      kind: candidate.recordType,
      schemaVersion: candidate.schemaVersion,
      status: candidate.status,
      rawSha256,
      observationDigest: summary.observationDigest,
      expectedAuthoredBuildInputFileCount: summary.expectedAuthoredBuildInputFileCount,
      lockedBuildInputCount: summary.lockedBuildInputCount,
      evidenceToolFileCount: summary.evidenceToolFileCount,
      outputFileCount: summary.outputFileCount,
      outputTreeDigest: summary.outputTreeDigest,
      chromeVersion: summary.browserVersions.chrome,
      edgeVersion: summary.browserVersions.msedge,
      passedOutcomeCount: summary.passedScenarioOutcomes,
      perBrowserServedBodyManifestsEqual: summary.perBrowserServedBodyManifestsEqual,
      cleanup: summary.cleanup,
      releaseReady: candidate.authorityBoundary.releaseReady,
      publicDeploymentAuthorized: candidate.authorityBoundary.publicDeploymentAuthorized,
      publicReleaseAuthorized: candidate.authorityBoundary.publicReleaseAuthorized,
      expertClaimsAuthorized: candidate.authorityBoundary.expertClaimsAuthorized
    })}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof WesternSameArtifactObservationError
      ? error.code
      : "WESTERN_SAME_ARTIFACT_BROWSER_OBSERVATION_INTERNAL_FAILURE";
    stderr.write(`${code}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runWesternSameArtifactBrowserObservationVerifier();

