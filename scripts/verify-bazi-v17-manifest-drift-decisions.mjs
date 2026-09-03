import {
  readBaziV17ManifestDriftDecisionLedger,
  verifyBaziV17ManifestDriftDecisionLedger
} from "./bazi-v17-manifest-drift-decision-lib.mjs";

try {
  const workspaceRoot = process.cwd();
  const ledger = await readBaziV17ManifestDriftDecisionLedger(workspaceRoot);
  const result = await verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, ledger);
  process.stdout.write(`${JSON.stringify({
    status: "pass_fail_closed_gap_ledger",
    ledgerDigest: result.ledgerDigest,
    savedManifestDigest: result.ledger.savedManifest.semanticManifestDigest,
    currentExpectedManifestPreviewDigest: result.ledger.currentExpectedManifestPreview.semanticManifestDigest,
    manifestFilesDrifted: result.manifestFilesDrifted,
    ownerDecisionsRecorded: result.ownerDecisionsRecorded,
    expertPacketArtifactDrifts: result.ledger.gateSummary.expertPacketArtifactDrifts,
    independentExpertReviewsVerified: result.independentExpertReviewsVerified,
    releaseCandidateFreezeAllowed: result.releaseCandidateFreezeAllowed,
    releaseGovernance: result.ledger.releaseGovernance,
    observationBoundary: result.ledger.observationBoundary
  }, null, 2)}\n`);
} catch (cause) {
  process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
  process.exitCode = 1;
}
