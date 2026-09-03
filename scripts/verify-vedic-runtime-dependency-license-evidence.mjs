#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
  readVedicRuntimeDependencyLicenseEvidence,
  verifyVedicRuntimeDependencyLicenseEvidence
} from "./vedic-runtime-dependency-license-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function writeResult(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

if (process.argv.length !== 2) {
  writeResult({
    runtimeDependencyLicenseEvidenceVerified: false,
    error: "unexpected_arguments",
    message: "This verifier accepts no command-line arguments."
  });
  process.exitCode = 2;
} else {
  try {
    const evidence = await readVedicRuntimeDependencyLicenseEvidence(workspaceRoot);
    const result = await verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, evidence);
    writeResult({
      artifact: VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
      dependenciesWithObservedRefs: result.dependenciesWithObservedRefs,
      dependenciesWithoutObservedRefs: result.dependenciesWithoutObservedRefs,
      evidenceDigest: result.evidenceDigest,
      legalReviewsComplete: result.legalReviewsComplete,
      loopbackEvidenceRefs: result.loopbackEvidenceRefs,
      publicHttpReadsObserved: result.publicHttpReadsObserved,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      redistributionAuthorizations: result.redistributionAuthorizations,
      releaseReady: result.releaseReady,
      runtimeDependencyLicenseEvidenceVerified: true,
      sourceObservationCount: result.sourceObservationCount,
      stableImmediateReadPairs: result.stableImmediateReadPairs,
      status: result.status,
      unstableImmediateReadPairs: result.unstableImmediateReadPairs
    });
  } catch (error) {
    writeResult({
      runtimeDependencyLicenseEvidenceVerified: false,
      error: typeof error?.code === "string" ? error.code : "verification_failed",
      message: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  }
}
