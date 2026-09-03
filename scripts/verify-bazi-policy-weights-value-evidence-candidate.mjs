#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH,
  BaziPolicyWeightsValueEvidenceCandidateError,
  readBaziPolicyWeightsValueEvidenceCandidate,
  verifyBaziPolicyWeightsValueEvidenceCandidate
} from "./bazi-policy-weights-value-evidence-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultWorkspaceRoot = path.resolve(scriptDirectory, "..");
const args = process.argv.slice(2);

if (args.length > 1) {
  console.error("usage: node scripts/verify-bazi-policy-weights-value-evidence-candidate.mjs [absolute-workspace-root]");
  process.exitCode = 2;
} else {
  const workspaceRoot = args.length === 1 ? path.resolve(args[0]) : defaultWorkspaceRoot;
  try {
    const candidate = await readBaziPolicyWeightsValueEvidenceCandidate(
      workspaceRoot,
      BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH
    );
    const verified = await verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, candidate);
    console.log(JSON.stringify({
      ok: true,
      candidateId: verified.candidateId,
      candidateDigest: verified.candidateDigest,
      bindingId: verified.policyBinding.bindingId,
      valueSubjectIds: verified.policyBinding.valueSubjectIds,
      factorWeights: verified.valueEvidenceRecords[0].repositoryProjection,
      bindingFreezeEligible: verified.gateSummary.bindingFreezeEligible,
      bindingFrozenVerified: verified.gateSummary.bindingFrozenVerified,
      engineeringRationaleFrozen: verified.authorityBoundary.engineeringRationaleFrozen,
      sourceRightsRecordId: verified.externalEvidence.sourceRightsRecordId,
      sourceCarrierRecordId: verified.externalEvidence.sourceCarrierRecordId,
      expertReviewIds: verified.externalEvidence.expertReviewIds,
      releaseGovernance: verified.releaseGovernance,
      observationBoundary: {
        heldFileHandleReads: verified.observationBoundary.heldFileHandleReads,
        endpointSnapshotOnly: verified.observationBoundary.endpointSnapshotOnly,
        crossFileAtomicSnapshot: verified.observationBoundary.crossFileAtomicSnapshot,
        mutationEpochReceipt: verified.observationBoundary.mutationEpochReceipt,
        intervalMutationExcluded: verified.observationBoundary.intervalMutationExcluded,
        abaExcluded: verified.observationBoundary.abaExcluded
      }
    }, null, 2));
  } catch (error) {
    if (error instanceof BaziPolicyWeightsValueEvidenceCandidateError && error.safeForCli) {
      console.error(`${error.code}: ${error.message}`);
    } else {
      console.error("UNEXPECTED_VERIFICATION_FAILURE: candidate verification failed");
    }
    process.exitCode = 1;
  }
}
