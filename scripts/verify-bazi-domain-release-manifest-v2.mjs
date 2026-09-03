import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadBaziDomainReleaseManifestV2,
  isVerifiedBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2 || process.env.NODE_OPTIONS) {
  console.error("BAZI_DOMAIN_RELEASE_MANIFEST_V2_MECHANICS_FAILED CLI_INVOCATION_REJECTED");
  process.exitCode = 1;
} else {
  try {
    const result = await loadBaziDomainReleaseManifestV2(workspaceRoot);
    if (!isVerifiedBaziDomainReleaseManifestV2(result)) {
      throw new Error("private result brand missing");
    }
    console.log(JSON.stringify({
      baziV17MachineIdentityManifestV2MechanicallyVerified: true,
      manifestId: result.manifestId,
      manifestDigest: result.manifestDigest,
      artifact: {
        path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json",
        rawBytes: result.rawBytes,
        rawSha256: result.rawSha256
      },
      releaseGovernance: {
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      frozenGoldenSha256: result.frozenGoldenSha256,
      machineIdentityPinned: result.machineIdentityPinned,
      bindingRequired: result.bindingRequired,
      bindingFrozenVerified: result.bindingFrozenVerified,
      independentExpertsRequired: result.independentExpertsRequired,
      independentExpertReviewsVerified: result.independentExpertReviewsVerified,
      crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13: result.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: result.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
      abaExcluded: result.abaExcluded,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      centralSystemAdmissionRegistryIntegrated: false,
      crossSystemEngineeringReceiptRegistryIntegrated: false
    }, null, 2));
  } catch (error) {
    console.error(
      "BAZI_DOMAIN_RELEASE_MANIFEST_V2_MECHANICS_FAILED",
      error?.code ?? error?.name ?? "UNKNOWN"
    );
    process.exitCode = 1;
  }
}
