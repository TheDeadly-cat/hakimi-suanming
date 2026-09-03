#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  BaziExpertPublicCandidatePrescreenError,
  loadBaziExpertPublicCandidatePrescreen
} from "./bazi-expert-public-candidate-prescreen-lib.mjs";

export async function runBaziExpertPublicCandidatePrescreenVerification(workspaceRoot = process.cwd()) {
  return loadBaziExpertPublicCandidatePrescreen(workspaceRoot);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const result = await runBaziExpertPublicCandidatePrescreenVerification();
    process.stdout.write(`${JSON.stringify({
      ok: true,
      status: result.status,
      ledgerDigest: result.ledgerDigest,
      candidateLeads: result.candidateLeads,
      sourceObservations: result.sourceObservations,
      deduplicatedSourceGroups: result.deduplicatedSourceGroups,
      scopeQuestions: result.scopeQuestions,
      independenceFactors: result.independenceFactors,
      pairwiseAssessments: result.pairwiseAssessments,
      expertGateCount: result.expertGateCount,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      ledgerArtifact: result.ledgerArtifact,
      basisArtifacts: result.basisArtifacts
    })}\n`);
  } catch (error) {
    const code = error instanceof BaziExpertPublicCandidatePrescreenError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 1;
  }
}
