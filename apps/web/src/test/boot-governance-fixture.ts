const BOOT_GOVERNANCE_DATASET_KEYS = [
  "appBootReady",
  "appBootReadyRejection",
  "dbGeneration",
  "dbSchema",
  "releaseContract",
  "targetSchema",
  "migrationId",
  "engineeringEvidenceOnly",
  "publicReleaseAuthorized",
  "expertTruthClaimed",
  "mutationEpochBypassed"
] as const;

/** Installs the same fixed legacy-v13 governance identity required by production boot. */
export function installLegacyV13BootGovernance(ready = true): void {
  Object.assign(document.documentElement.dataset, {
    appBootReady: String(ready),
    dbGeneration: "legacy-v13",
    dbSchema: "13",
    releaseContract: "legacy-v13",
    targetSchema: "13",
    migrationId: "null",
    engineeringEvidenceOnly: "true",
    publicReleaseAuthorized: "false",
    expertTruthClaimed: "false",
    mutationEpochBypassed: "false"
  });
}

export function clearBootGovernanceFixture(): void {
  const dataset = document.documentElement.dataset;
  for (const key of BOOT_GOVERNANCE_DATASET_KEYS) delete dataset[key];
}
