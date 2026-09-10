import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadBaziDomainReleaseManifestV2,
  isVerifiedBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const operands = process.argv.slice(2);
const historicalInputRequested = operands.length === 2
  && operands[0] === "--historical-input-root"
  && operands[1].trim().length > 0
  && !operands[1].startsWith("-");
const invocationValid = operands.length === 0 || historicalInputRequested;

if (!invocationValid || process.env.NODE_OPTIONS) {
  console.error("BAZI_DOMAIN_RELEASE_MANIFEST_V2_MECHANICS_FAILED CLI_INVOCATION_REJECTED");
  process.exitCode = 1;
} else {
  try {
    // Only the input root changes. The verifier code always comes from this
    // repository, and neither input mode establishes a current release choice.
    const inputRoot = historicalInputRequested ? path.resolve(operands[1]) : workspaceRoot;
    const result = await loadBaziDomainReleaseManifestV2(inputRoot);
    if (!isVerifiedBaziDomainReleaseManifestV2(result)) {
      throw new Error("private result brand missing");
    }
    console.log(JSON.stringify({
      baziV17MachineIdentityManifestV2MechanicallyVerified: true,
      verificationScope: historicalInputRequested ? "historical_input_root" : "repository_inputs",
      currentApplicabilityAssessed: false,
      ...(historicalInputRequested ? { historicalInputRoot: inputRoot } : {}),
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
