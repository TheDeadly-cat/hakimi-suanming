#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  BaziExpertPublicEvidenceFollowupError,
  loadBaziExpertPublicEvidenceFollowup
} from "./bazi-expert-public-evidence-followup-lib.mjs";

export async function runBaziExpertPublicEvidenceFollowupVerification(workspaceRoot = process.cwd()) {
  return loadBaziExpertPublicEvidenceFollowup(workspaceRoot);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const result = await runBaziExpertPublicEvidenceFollowupVerification();
    process.stdout.write(`${JSON.stringify({
      offlineFollowupArtifactMechanicallyVerified:
        result.offlineFollowupArtifactMechanicallyVerified,
      status: result.status,
      followupDigest: result.followupDigest,
      parentPrescreenBound: result.parentPrescreenBound,
      candidateFollowups: result.candidateFollowups,
      sourceObservations: result.sourceObservations,
      deduplicatedSourceGroups: result.deduplicatedSourceGroups,
      expertGateCount: result.expertGateCount,
      remoteCaptureMechanicallyVerified: result.remoteCaptureMechanicallyVerified,
      identityVerified: result.identityVerified,
      credentialVerified: result.credentialVerified,
      scopeVerified: result.scopeVerified,
      independenceVerified: result.independenceVerified,
      expertStatusVerified: result.expertStatusVerified,
      releaseReady: result.releaseReady,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      followupArtifact: result.followupArtifact,
      parentPrescreenArtifact: result.parentPrescreenArtifact,
      basisArtifact: result.basisArtifact
    })}\n`);
  } catch (error) {
    const code = error instanceof BaziExpertPublicEvidenceFollowupError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${JSON.stringify({
      offlineFollowupArtifactMechanicallyVerified: false,
      code
    })}\n`);
    process.exitCode = 1;
  }
}
