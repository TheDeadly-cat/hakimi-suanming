import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeCrossSystemEngineeringFactReceiptDigest,
  computeCrossSystemEngineeringFactReceiptRegistryDigest,
  parseCrossSystemEngineeringFactReceiptJsonBytes,
  readCrossSystemEngineeringFactReceiptRegistry,
  verifyCrossSystemEngineeringFactReceiptRegistry
} from "./cross-system-engineering-fact-receipt-lib.mjs";

const workspaceRoot = process.cwd();

async function currentRegistry() {
  return (await readCrossSystemEngineeringFactReceiptRegistry(workspaceRoot)).registry;
}

function clone(value) {
  return structuredClone(value);
}

function resignReceipt(registry, systemIndex) {
  registry.systems[systemIndex].receipt.receiptDigest =
    computeCrossSystemEngineeringFactReceiptDigest(registry.systems[systemIndex].receipt);
  registry.registryDigest = computeCrossSystemEngineeringFactReceiptRegistryDigest(registry);
  return registry;
}

test("current registry replays two independent producers through system-owned projectors", async () => {
  const registry = await currentRegistry();
  const result = await verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registry);
  assert.equal(result.engineeringReplayReceiptsVerified, 2);
  assert.equal(result.formalCrossSystemComparisonAuthorized, false);
  assert.deepEqual(
    result.registry.systems.map((entry) => entry.receiptStatus),
    [
      "blocked_saved_manifest_not_current",
      "engineering_replay_verified_not_admitted",
      "engineering_replay_verified_not_admitted",
      "absent_no_registered_product_or_fact_producer"
    ]
  );
  assert.equal(result.registry.fourSystemRegistryObservation.currentVerifierPassed, false);
  assert.equal(result.registry.fourSystemRegistryObservation.failureCode, "MANIFEST_MISMATCH");
  assert.equal(result.registry.fourSystemRegistryObservation.staleArtifactLockCount, 4);
  assert.deepEqual(
    result.registry.fourSystemRegistryObservation.staleArtifactLocks.map((entry) => entry.path),
    [
      "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
      "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json",
      "docs/release/release-evidence.schema.json",
      "packages/cross-system-comparison-draft/src/index.ts"
    ]
  );
});

test("raw registry rejects BOM invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseCrossSystemEngineeringFactReceiptJsonBytes(
      Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    { code: "JSON_BOM_FORBIDDEN" }
  );
  assert.throws(
    () => parseCrossSystemEngineeringFactReceiptJsonBytes(Uint8Array.from([0x7b, 0xff, 0x7d])),
    { code: "JSON_UTF8_INVALID" }
  );
  assert.throws(
    () => parseCrossSystemEngineeringFactReceiptJsonBytes(
      new TextEncoder().encode('{"schemaVersion":"1","schemaVersion":"2"}')
    ),
    { code: "JSON_DUPLICATE_KEY" }
  );
});

test("receipt scope binds current draft manifests and still records zero frozen sources", async () => {
  const registry = (await verifyCrossSystemEngineeringFactReceiptRegistry(
    workspaceRoot,
    await currentRegistry()
  )).registry;
  const ziwei = registry.systems[1].receipt;
  const western = registry.systems[2].receipt;
  assert.equal(ziwei.domainManifest.targetSchema, null);
  assert.equal(western.domainManifest.targetSchema, null);
  assert.deepEqual(
    ziwei.domainManifest.boundComponents.map((entry) => entry.componentId),
    ["execution_rules", "input_policy", "fact_contract"]
  );
  assert.deepEqual(
    western.domainManifest.boundComponents.map((entry) => entry.componentId),
    ["execution_rules", "input_policy", "fact_contract"]
  );
  assert.equal(ziwei.sourceRequirementLedger.bindingRequired, 27);
  assert.equal(western.sourceRequirementLedger.bindingRequired, 28);
  assert.equal(ziwei.sourceRequirementLedger.bindingFrozenVerified, 0);
  assert.equal(western.sourceRequirementLedger.bindingFrozenVerified, 0);
});

test("changed projected fact is rejected even after receipt and registry are resigned", async () => {
  const registry = clone(await currentRegistry());
  registry.systems[1].receipt.projectedFacts[0].value = "fabricated-but-resigned";
  registry.systems[1].receipt.projectedFactsSha256 = "f".repeat(64);
  await assert.rejects(
    verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, resignReceipt(registry, 1)),
    { code: "REGISTRY_MISMATCH" }
  );
});

test("copied legitimate receipt identity cannot authorize a contradictory system", async () => {
  const registry = clone(await currentRegistry());
  registry.systems[1].receipt = clone(registry.systems[2].receipt);
  registry.systems[1].receipt.systemId = "ziwei-doushu";
  await assert.rejects(
    verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, resignReceipt(registry, 1)),
    { code: "REGISTRY_MISMATCH" }
  );
});

test("manifest component projector and producer digest promotion cannot be fabricated", async () => {
  for (const mutate of [
    (receipt) => { receipt.domainManifest.manifestDigest = "a".repeat(64); },
    (receipt) => { receipt.domainManifest.boundComponents[2].digest = "b".repeat(64); },
    (receipt) => { receipt.projector.sourceSha256 = "c".repeat(64); },
    (receipt) => { receipt.producerOutput.stableProjectionSha256 = "d".repeat(64); }
  ]) {
    const registry = clone(await currentRegistry());
    mutate(registry.systems[2].receipt);
    await assert.rejects(
      verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, resignReceipt(registry, 2)),
      { code: "REGISTRY_MISMATCH" }
    );
  }
});

test("Bazi receipt Vedic completion authority and mutation epoch cannot be fabricated", async () => {
  const mutations = [
    (registry) => { registry.systems[0].receiptStatus = "engineering_replay_verified_not_admitted"; },
    (registry) => { registry.systems[3].blocker.bindingRequired = 0; },
    (registry) => { registry.gateSummary.formalCrossSystemComparisonAuthorized = true; },
    (registry) => { registry.releaseGovernance.publicDeploymentAuthorized = true; },
    (registry) => { registry.observationBoundary.mutationEpochReceipt = { epoch: 1 }; },
    (registry) => { registry.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const registry = clone(await currentRegistry());
    mutate(registry);
    registry.registryDigest = computeCrossSystemEngineeringFactReceiptRegistryDigest(registry);
    await assert.rejects(
      verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registry),
      { code: "REGISTRY_MISMATCH" }
    );
  }
});

test("object API rejects an accessor without invoking it", async () => {
  const registry = clone(await currentRegistry());
  let reads = 0;
  Object.defineProperty(registry, "registryStatus", {
    enumerable: true,
    configurable: true,
    get() {
      reads += 1;
      return "fail_closed_partial_two_of_four";
    }
  });
  await assert.rejects(
    verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registry),
    { code: "INPUT_ACCESSOR_FORBIDDEN" }
  );
  assert.equal(reads, 0);
});

test("successful object verification returns a detached recursively frozen registry", async () => {
  const input = clone(await currentRegistry());
  const result = await verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, input);
  assert.notEqual(result.registry, input);
  assert.equal(Object.isFrozen(result.registry), true);
  assert.equal(Object.isFrozen(result.registry.systems[1].receipt.projectedFacts[0]), true);
  const before = result.registry.systems[1].receipt.projectedFacts[0].value;
  input.systems[1].receipt.projectedFacts[0].value = "after-verification";
  assert.equal(result.registry.systems[1].receipt.projectedFacts[0].value, before);
});
