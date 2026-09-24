import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { after, test } from "node:test";
import {
  computeCrossSystemEngineeringFactReceiptDigest,
  computeCrossSystemEngineeringFactReceiptRegistryDigest,
  parseCrossSystemEngineeringFactReceiptJsonBytes,
  readCrossSystemEngineeringFactReceiptRegistry,
  verifyHistoricalV1CrossSystemEngineeringFactReceiptRegistry as verifyCrossSystemEngineeringFactReceiptRegistry,
  verifyCrossSystemEngineeringFactReceiptRegistry as verifyActualCurrentRegistry
} from "./cross-system-engineering-fact-receipt-lib.mjs";

import { createFactReceiptV1HistoricalInputs } from "./cross-system-fact-receipt-v1-history.test-fixture.mjs";
import { FACT_RECEIPT_V1_INPUT_ARCHIVE_URL, parseFactReceiptV1InputArchive } from "./cross-system-fact-receipt-v1-history.test-fixture.mjs";

// Preserve all nine original callbacks, including exact tamper rejection codes.
// "current" in their historical titles means current at this original v1 scope.
const historicalInputs = await createFactReceiptV1HistoricalInputs();
after(() => historicalInputs.cleanup());
const workspaceRoot = historicalInputs.root;

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

test("historical-v1 result explicitly excludes current verification and current selection changes", async () => {
  const result = await verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, await currentRegistry());
  assert.equal(result.consumerContract, "historical-v1");
  assert.equal(result.currentProducerVerification, false);
  assert.equal(result.currentSelectionChanged, false);
  assert.equal(result.archivedModulesExecuted, false);
  assert.equal(result.registry.registryDigest, "27630244f1ec8bc90a3a1ad5ebd3b1fa97d0a1d09d497f747d88a27d1872e263");
});

test("actual-current consumer does not inherit historical success or mutate the selected head", async () => {
  const selectedPath = path.join(process.cwd(), "content/system-admission/current-index.v1.json");
  const before = await readFile(selectedPath);
  const saved = await readCrossSystemEngineeringFactReceiptRegistry(process.cwd());
  await assert.rejects(verifyActualCurrentRegistry(process.cwd(), saved.registry), { code: "LEDGER_MISMATCH" });
  assert.deepEqual(await readFile(selectedPath), before);
  assert.deepEqual((await readCrossSystemEngineeringFactReceiptRegistry(process.cwd())).snapshot.bytes, saved.snapshot.bytes);
});

test("supplying historical data to the current consumer cannot select the v1 contract", async () => {
  await assert.rejects(verifyActualCurrentRegistry(workspaceRoot, await currentRegistry()), { code: "COMPONENT_FILE_MISSING" });
});

test("historical consumer rejects changed projector bytes before replay", async (t) => {
  const inputs = await createFactReceiptV1HistoricalInputs();
  t.after(() => inputs.cleanup());
  const target = path.join(inputs.root, "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.ts");
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n// changed\n")]));
  await assert.rejects(verifyCrossSystemEngineeringFactReceiptRegistry(inputs.root, await currentRegistry()), { code: "HISTORICAL_V1_INPUT_MISMATCH" });
});

test("historical consumer rejects a missing original D0 record", async (t) => {
  const inputs = await createFactReceiptV1HistoricalInputs();
  t.after(() => inputs.cleanup());
  await unlink(path.join(inputs.root, "content/system-admission/bazi-v17-manifest-drift-decisions.v1.json"));
  await assert.rejects(verifyCrossSystemEngineeringFactReceiptRegistry(inputs.root, await currentRegistry()), { code: "BOUND_FILE_MISSING" });
});

test("historical input archive cannot be replaced with another self-described inventory", async () => {
  const bytes = Buffer.from(await readFile(FACT_RECEIPT_V1_INPUT_ARCHIVE_URL));
  bytes[30] ^= 1;
  assert.throws(() => parseFactReceiptV1InputArchive(bytes), { code: "HISTORICAL_V1_INPUT_MISMATCH" });
});
