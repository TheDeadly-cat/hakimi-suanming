import process from "node:process";
import {
  runZiweiIztroIsolatedBuildLicenseNoticeVerification
} from "./ziwei-iztro-isolated-build-license-notice-lib.mjs";

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--print-evidence-template")) {
    throw new Error(
      "Usage: node scripts/verify-ziwei-iztro-isolated-build-license-notices.mjs [--print-evidence-template]"
    );
  }
  const result = runZiweiIztroIsolatedBuildLicenseNoticeVerification({
    evidenceMode: args[0] === "--print-evidence-template" ? "template" : "verify"
  });
  if (args[0] === "--print-evidence-template") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const hkoBoundary = result.hkoRestrictedSourceMaterialBoundary;
  process.stdout.write(`${JSON.stringify({
    status: "verification_passed",
    publisherAuthenticityEstablished: false,
    noticeObligationSatisfied: false,
    formalAdmissionEstablished: false,
    publicReleaseAuthorized: false,
    verification: result.schemaVersion,
    surfaces: result.surfaces.map((surface) => surface.surfaceId),
    hkoRestrictedSourceMaterialBoundary: {
      candidateId: hkoBoundary.candidateId,
      annualBodyCount: hkoBoundary.annualBodyCount,
      currentKnownExactRepresentationsAbsentFromBothOutputs:
        hkoBoundary.currentKnownExactRepresentationsAbsentFromBothOutputs,
      controlledMaterialIdentityEquality: hkoBoundary.controlledMaterialIdentityEquality,
      exactCurrentRepresentationsOnly: hkoBoundary.exactCurrentRepresentationsOnly,
      universalTranscodingAbsenceEstablished: hkoBoundary.universalTranscodingAbsenceEstablished,
      workspaceRawBodiesRemovedOrVaulted: hkoBoundary.workspaceRawBodiesRemovedOrVaulted,
      linkOnlyStorageEstablished: hkoBoundary.linkOnlyStorageEstablished,
      rightsLegalConclusionEstablished: hkoBoundary.rightsLegalConclusionEstablished,
      publicBuildInclusionAuthorized: hkoBoundary.publicBuildInclusionAuthorized
    },
    evidenceChild: result.evidenceChild
  }, null, 2)}\n`);
}

try {
  main();
} catch (cause) {
  process.stderr.write(`${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}\n`);
  process.exitCode = 1;
}
