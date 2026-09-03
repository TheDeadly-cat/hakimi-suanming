import process from "node:process";
import {
  readCrossSystemEngineeringFactReceiptRegistry,
  verifyCrossSystemEngineeringFactReceiptRegistry
} from "./cross-system-engineering-fact-receipt-lib.mjs";

try {
  const workspaceRoot = process.cwd();
  const { registry } = await readCrossSystemEngineeringFactReceiptRegistry(workspaceRoot);
  const result = await verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registry);
  const verified = result.registry.systems.filter((entry) => entry.receipt !== null);
  console.log(JSON.stringify({
    status: "pass_partial_engineering_replay_receipts_fail_closed",
    registryDigest: result.registry.registryDigest,
    engineeringReplayReceiptsVerified: result.engineeringReplayReceiptsVerified,
    systems: verified.map((entry) => ({
      systemId: entry.systemId,
      receiptDigest: entry.receipt.receiptDigest,
      manifestDigest: entry.receipt.domainManifest.manifestDigest,
      projectedFacts: entry.receipt.projectedFacts.length,
      bindingRequired: entry.receipt.sourceRequirementLedger.bindingRequired,
      bindingFrozenVerified: entry.receipt.sourceRequirementLedger.bindingFrozenVerified
    })),
    baziReceiptStatus: result.registry.systems[0].receiptStatus,
    vedicReceiptStatus: result.registry.systems[3].receiptStatus,
    fourSystemRegistryObservation: result.registry.fourSystemRegistryObservation,
    formalCrossSystemComparisonAuthorized: result.formalCrossSystemComparisonAuthorized,
    releaseGovernance: result.registry.releaseGovernance,
    observationBoundary: result.registry.observationBoundary
  }, null, 2));
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause));
  process.exitCode = 1;
}
