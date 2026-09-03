import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
  isVerifiedFourSystemCurrentObservationRegistryV2,
  loadFourSystemCurrentObservationRegistryV2
} from "./four-system-current-observation-registry-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2 || process.env.NODE_OPTIONS) {
  console.error(
    "FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_MECHANICS_FAILED CLI_INVOCATION_REJECTED"
  );
  process.exitCode = 1;
} else {
  try {
    const result = await loadFourSystemCurrentObservationRegistryV2(workspaceRoot);
    if (!isVerifiedFourSystemCurrentObservationRegistryV2(result)) {
      throw new Error("private result brand missing");
    }
    console.log(JSON.stringify({
      currentObservationRegistryV2MechanicallyVerified: true,
      registryId: result.registryId,
      registryDigest: result.registryDigest,
      artifact: {
        path: FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
        rawBytes: result.rawBytes,
        rawSha256: result.rawSha256
      },
      projectReleaseGovernance: {
        activeLine: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      systemsObserved: result.systemsObserved,
      systemsFormallyAdmitted: result.systemsFormallyAdmitted,
      totalAdmissionGatesRequired: 32,
      totalAdmissionGatesSatisfied: result.totalAdmissionGatesSatisfied,
      formalCentralRegistry: result.formalCentralRegistry,
      formalCrossSystemComparisonAuthorized:
        result.formalCrossSystemComparisonAuthorized,
      crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13:
        result.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: result.mutationEpochReceipt,
      intervalMutationExcludedAcrossFiles:
        result.intervalMutationExcludedAcrossFiles,
      abaExcluded: result.abaExcluded,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      expertClaimsAuthorized: result.expertClaimsAuthorized
    }, null, 2));
  } catch (error) {
    console.error(
      "FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_MECHANICS_FAILED",
      error?.code ?? error?.name ?? "UNKNOWN"
    );
    process.exitCode = 1;
  }
}
