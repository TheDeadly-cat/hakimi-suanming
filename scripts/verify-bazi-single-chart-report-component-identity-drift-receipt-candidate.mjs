import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BaziSingleChartReportComponentIdentityDriftReceiptCandidateError,
  isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate
} from "./bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs";

const OK_PREFIX =
  "BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK";
const FAILED_PREFIX =
  "BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED";

function hasVisiblePreloadArgument() {
  return process.execArgv.some((argument) => (
    argument === "-r"
    || argument === "--require"
    || argument.startsWith("--require=")
    || argument === "--import"
    || argument.startsWith("--import=")
    || argument === "--loader"
    || argument.startsWith("--loader=")
    || argument === "--experimental-loader"
    || argument.startsWith("--experimental-loader=")
  ));
}

export async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(`${FAILED_PREFIX} ARGUMENTS_FORBIDDEN\n`);
    return 1;
  }
  if ((process.env.NODE_OPTIONS ?? "").trim() !== "" || hasVisiblePreloadArgument()) {
    process.stderr.write(`${FAILED_PREFIX} PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
    return 1;
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const workspaceRoot = path.resolve(path.dirname(scriptPath), "..");
  try {
    const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
    if (!isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(receipt)) {
      process.stderr.write(`${FAILED_PREFIX} PRIVATE_CANDIDATE_BRAND_MISSING\n`);
      return 1;
    }
    const drift = receipt.scope.reportComponent.driftEntries[0];
    const summary = {
      candidateId: receipt.candidateId,
      receiptDigest: receipt.receiptDigest,
      candidateOnly: true,
      persistedAsDomainManifest: receipt.observationBoundary.persistedAsDomainManifest,
      activeAdmissionEffect: receipt.observationBoundary.activeAdmissionEffect,
      formalManifestCurrent: receipt.scope.formalManifest.currentAfterComponentChange,
      failureCode: receipt.blockingRelationship.code,
      componentId: receipt.scope.reportComponent.componentId,
      componentDigestChanged: receipt.scope.reportComponent.digestChanged,
      driftEntryCount: receipt.scope.reportComponent.driftEntries.length,
      currentSourceBytes: drift.currentRawBytes,
      currentSourceSha256: drift.currentSha256,
      frozenGoldenUnchanged: receipt.scope.frozenGolden.unchanged,
      currentFullDomainManifestEstablished:
        receipt.observationBoundary.currentFullDomainManifestEstablished,
      ownerDecisionsRecorded: receipt.ownerDecisionBoundary.ownerDecisionsRecorded,
      manifestRebindAuthorized: receipt.ownerDecisionBoundary.manifestRebindAuthorized,
      manifestResignAuthorized: receipt.ownerDecisionBoundary.manifestResignAuthorized,
      releaseReady: receipt.authorityBoundary.releaseReady,
      publicDeploymentAuthorized: receipt.authorityBoundary.publicDeploymentAuthorized,
      expertClaimsAuthorized: receipt.authorityBoundary.expertClaimsAuthorized,
      releaseIdentity: receipt.releaseGovernance.releaseIdentity,
      targetSchema: receipt.releaseGovernance.targetSchema,
      migrationId: receipt.releaseGovernance.migrationId
    };
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    const code = error instanceof BaziSingleChartReportComponentIdentityDriftReceiptCandidateError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
    return 1;
  }
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) process.exitCode = await main();
