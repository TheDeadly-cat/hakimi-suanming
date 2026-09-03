import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH,
  baziNonDttThreeCarrierByteObservationTestOnly,
  computeBaziNonDttThreeCarrierByteObservationDigest,
  isVerifiedBaziNonDttThreeCarrierByteObservation,
  parseBaziNonDttThreeCarrierByteObservationJsonBytes,
  verifyBaziNonDttThreeCarrierByteObservation
} from "./bazi-nondtt-three-carrier-byte-observation-lib.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const clone = (value) => structuredClone(value);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(workspaceRoot, ...relativePath.split("/")), "utf8"));
}

async function semanticInputs() {
  const inputs = await baziNonDttThreeCarrierByteObservationTestOnly.readInputs(workspaceRoot);
  return {
    observation: clone(inputs.observation),
    context: {
      sourceSnapshot: inputs.sourceSnapshot,
      rightsSnapshot: inputs.rightsSnapshot,
      readinessSnapshot: inputs.readinessSnapshot,
      producerSnapshot: inputs.producerSnapshot,
      sourceLedger: clone(inputs.sourceLedger),
      rightsLedger: clone(inputs.rightsLedger),
      readiness: clone(inputs.readiness)
    }
  };
}

function sealDigest(observation) {
  observation.observationDigest = computeBaziNonDttThreeCarrierByteObservationDigest(observation);
  return observation;
}

async function expectSemanticReject(mutate, code) {
  const { observation, context } = await semanticInputs();
  mutate(observation, context);
  sealDigest(observation);
  assert.throws(
    () => baziNonDttThreeCarrierByteObservationTestOnly.validateObservation(observation, context),
    (reason) => reason?.code === code
  );
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child, seen);
}

test("verifies the persisted three-carrier point-in-time observation without promoting authority", async () => {
  const result = await verifyBaziNonDttThreeCarrierByteObservation(workspaceRoot);
  assert.equal(result.operatorRecordedCarrierRawByteIdentitiesRevalidated, 3);
  assert.equal(result.offlineVerifierNetworkRequestsPerformed, false);
  assert.equal(result.offlineVerifierReDownloadedCarrierFiles, false);
  assert.equal(result.downloadedCarrierBytes, 50_699_301);
  assert.equal(result.formalKnowledgeDocuments, 0);
  assert.equal(result.formalSourceRightsRecords, 0);
  assert.equal(result.formalSourceCarrierRecords, 0);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.canonicalSourceRightsSupersessionBrandVerified, true);
  assert.equal(result.canonicalBindingReadinessV17BrandVerified, true);
  assert.equal(result.crossFileAtomicSnapshot, false);
  assert.equal(result.mutationEpochAvailable, false);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
});

test("locks raw bytes, SHA-256 and canonical digest", async () => {
  const bytes = await readFile(path.resolve(
    workspaceRoot,
    ...BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH.split("/")
  ));
  assert.equal(bytes.byteLength, baziNonDttThreeCarrierByteObservationTestOnly.OBSERVATION_RAW_IDENTITY.rawBytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    baziNonDttThreeCarrierByteObservationTestOnly.OBSERVATION_RAW_IDENTITY.rawSha256
  );
  const observation = await readJson(BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH);
  assert.equal(
    computeBaziNonDttThreeCarrierByteObservationDigest(observation),
    baziNonDttThreeCarrierByteObservationTestOnly.OBSERVATION_DIGEST
  );
});

test("strict parser rejects duplicate keys", () => {
  assert.throws(
    () => parseBaziNonDttThreeCarrierByteObservationJsonBytes(
      Buffer.from('{"schemaVersion":1,"schemaVersion":2}', "utf8")
    ),
    (reason) => reason?.code === "JSON_DUPLICATE_KEY"
      || reason?.cause?.code === "JSON_DUPLICATE_KEY"
  );
});

test("rejects a tampered digest", async () => {
  const { observation, context } = await semanticInputs();
  observation.observationDigest = "f".repeat(64);
  assert.throws(
    () => baziNonDttThreeCarrierByteObservationTestOnly.validateObservation(observation, context),
    (reason) => reason?.code === "DIGEST_MISMATCH"
  );
});

test("rejects source parent raw drift", async () => {
  await expectSemanticReject(
    (_observation, context) => {
      context.sourceSnapshot = Object.freeze({
        ...context.sourceSnapshot,
        rawSha256: "0".repeat(64)
      });
    },
    "PARENT_DRIFT"
  );
});

test("rejects producer raw drift", async () => {
  await expectSemanticReject(
    (_observation, context) => {
      context.producerSnapshot = Object.freeze({
        ...context.producerSnapshot,
        rawSha256: "0".repeat(64)
      });
    },
    "PRODUCER_DRIFT"
  );
});

test("rejects carrier byte identity tampering even with a recomputed digest", async () => {
  await expectSemanticReject(
    (observation) => { observation.results[0].carrier.rawByte.downloadedBytes += 1; },
    "CARRIER_BYTE_IDENTITY_DRIFT"
  );
  await expectSemanticReject(
    (observation) => { observation.results[1].carrier.rawByte.downloadedSha256 = "0".repeat(64); },
    "CARRIER_BYTE_IDENTITY_DRIFT"
  );
});

test("rejects quote hash and locator tampering even with a recomputed digest", async () => {
  await expectSemanticReject(
    (observation) => { observation.results[0].sourceRevision.quoteLocators[0].quoteSha256 = "0".repeat(64); },
    "QUOTE_LOCATOR_DRIFT"
  );
  await expectSemanticReject(
    (observation) => { observation.results[2].sourceRevision.quoteLocators[0].rawCharacterStartZeroBased += 1; },
    "QUOTE_LOCATOR_DRIFT"
  );
});

test("rejects rights promotion in either child or parent", async () => {
  await expectSemanticReject(
    (observation) => { observation.rightsBoundary.redistributionAllowed = true; },
    "AUTHORITY_PROMOTION_FORBIDDEN"
  );
  await expectSemanticReject(
    (_observation, context) => { context.rightsLedger.candidates[0].decision.carrierLayerCleared = true; },
    "AUTHORITY_PROMOTION_FORBIDDEN"
  );
});

test("rejects readiness row digest, carrier identity and decision drift", async () => {
  await expectSemanticReject(
    (_observation, context) => {
      context.readiness.carrierGaps[0].sourceCandidateDigest = "0".repeat(64);
    },
    "CARRIER_READINESS_ROW_DRIFT"
  );
  await expectSemanticReject(
    (_observation, context) => {
      context.readiness.carrierGaps[3].observedCarrierIdentity.carrierBytes += 1;
    },
    "CARRIER_READINESS_ROW_DRIFT"
  );
  await expectSemanticReject(
    (_observation, context) => {
      context.readiness.carrierGaps[4].decision.redistributionAllowed = true;
    },
    "AUTHORITY_PROMOTION_FORBIDDEN"
  );
});

test("rejects forbidden raw material fields", async () => {
  await expectSemanticReject(
    (observation) => { observation.results[0].sourceRevision.quoteText = "forbidden"; },
    "RAW_MATERIAL_FORBIDDEN"
  );
});

test("verified result has a private brand and is recursively frozen", async () => {
  const result = await verifyBaziNonDttThreeCarrierByteObservation(workspaceRoot);
  assert.equal(isVerifiedBaziNonDttThreeCarrierByteObservation(result), true);
  assert.equal(isVerifiedBaziNonDttThreeCarrierByteObservation({ ...result }), false);
  assertRecursivelyFrozen(result);
});

test("post-import Set, WeakSet and Object.freeze poisoning cannot forge or unfreeze the result", async () => {
  const brandedResult = await verifyBaziNonDttThreeCarrierByteObservation(workspaceRoot);
  const originalSet = globalThis.Set;
  const originalSetAdd = originalSet.prototype.add;
  const originalSetHas = originalSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  const originalFreeze = Object.freeze;
  let directlyFrozen;
  try {
    originalSet.prototype.add = function poisonedSetAdd() { throw new Error("poisoned Set add"); };
    originalSet.prototype.has = function poisonedSetHas() { return true; };
    globalThis.Set = class PoisonedSet {
      has() { return true; }
      add() { throw new Error("poisoned global Set"); }
    };
    WeakSet.prototype.add = function poisonedAdd() { throw new Error("poisoned add"); };
    WeakSet.prototype.has = function poisonedHas() { return true; };
    Object.freeze = function poisonedFreeze(value) { return value; };
    assert.equal(isVerifiedBaziNonDttThreeCarrierByteObservation(brandedResult), true);
    assert.equal(isVerifiedBaziNonDttThreeCarrierByteObservation({ ...brandedResult }), false);
    directlyFrozen = baziNonDttThreeCarrierByteObservationTestOnly.deepFreeze({
      nested: { releaseReady: false }
    });
  } finally {
    globalThis.Set = originalSet;
    originalSet.prototype.add = originalSetAdd;
    originalSet.prototype.has = originalSetHas;
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
    Object.freeze = originalFreeze;
  }
  assertRecursivelyFrozen(brandedResult);
  assertRecursivelyFrozen(directlyFrozen);
  assert.throws(() => { brandedResult.releaseReady = true; }, TypeError);
  assert.throws(() => { directlyFrozen.nested.releaseReady = true; }, TypeError);
});

test("post-import Hash prototype poisoning cannot rewrite the canonical observation digest", async () => {
  const observation = await readJson(BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH);
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalUpdate = hashPrototype.update;
  const originalDigest = hashPrototype.digest;
  try {
    hashPrototype.update = function poisonedUpdate() { return this; };
    hashPrototype.digest = function poisonedDigest() { return "0".repeat(64); };
    assert.equal(
      computeBaziNonDttThreeCarrierByteObservationDigest(observation),
      baziNonDttThreeCarrierByteObservationTestOnly.OBSERVATION_DIGEST
    );
  } finally {
    hashPrototype.update = originalUpdate;
    hashPrototype.digest = originalDigest;
  }
});
