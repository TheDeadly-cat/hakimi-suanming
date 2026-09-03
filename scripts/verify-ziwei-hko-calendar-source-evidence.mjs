import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyZiweiHkoCalendarSourceEvidence } from "./ziwei-hko-calendar-source-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    candidateId: result.candidateId,
    subjectId: result.subjectId,
    coverageScope: result.coverageScope,
    annualResourcesBound: result.evidence.derivedCoverage.annualResourcesBound,
    rawSourceBodiesStored: result.evidence.derivedCoverage.rawSourceBodiesStored,
    dailyRowsBound: result.evidence.derivedCoverage.dailyRowsBound,
    boundaryPairsBound: result.evidence.derivedCoverage.boundaryPairsBound,
    crossFileSeamsBound: result.evidence.derivedCoverage.crossFileSeamsBound,
    bindingFrozenVerified: result.evidence.candidateIdentity.bindingFrozenVerified,
    rightsLegalConclusion: result.evidence.rightsBoundary.rightsLegalConclusion,
    expertTruthClaimed: result.evidence.expertBoundary.expertTruthClaimed,
    releaseReady: result.evidence.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: result.evidence.authorityBoundary.publicDeploymentAuthorized,
    evidenceDigest: result.evidenceDigest
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "Ziwei HKO source evidence 验证失败。"}\n`);
  process.exitCode = 1;
}
