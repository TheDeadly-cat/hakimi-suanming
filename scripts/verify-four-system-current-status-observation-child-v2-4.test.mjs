import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  FourSystemCurrentStatusObservationChildV24Error,
  fourSystemCurrentStatusObservationChildV24TestOnly as testOnly,
  buildCurrentFourSystemCurrentStatusObservationChildV24,
  computeFourSystemCurrentStatusObservationChildV24Digest,
  getFourSystemCurrentStatusObservationChildV24Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV24,
  loadFourSystemCurrentStatusObservationChildV24,
  serializeFourSystemCurrentStatusObservationChildV24
} from "./four-system-current-status-observation-child-v2-4-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV23
} from "./four-system-current-status-observation-child-v2-3-lib.mjs";
import {
  loadBaziCurrentMachineIdentitySuccessor
} from "./bazi-current-machine-identity-successor-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "verify-four-system-current-status-observation-child-v2-4.mjs");
const ARTIFACT = path.join(ROOT, "content", "system-admission", "four-system-current-status-observation-child.v2.4.0.json");

let fixturePromise;
function fixture() {
  if (!fixturePromise) {
    fixturePromise = (async () => {
      const loaded = await loadFourSystemCurrentStatusObservationChildV24(ROOT);
      const parent = await loadFourSystemCurrentStatusObservationChildV23(ROOT);
      const successor = await loadBaziCurrentMachineIdentitySuccessor(ROOT);
      const built = await buildCurrentFourSystemCurrentStatusObservationChildV24(ROOT);
      return { loaded, parent, successor, built };
    })();
  }
  return fixturePromise;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function codeIs(expected) {
  return (error) => error instanceof FourSystemCurrentStatusObservationChildV24Error && error.code === expected;
}

function reseal(value) {
  value.childDigest = computeFourSystemCurrentStatusObservationChildV24Digest(value);
  return value;
}

function bySystem(value, id) {
  return value.systems.find((system) => system.productSystemId === id);
}

function assertActuallyDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertActuallyDeepFrozen(descriptor.value, seen);
  }
}

test("exact persisted loader grants the v2.4 private brand and builder does not", async () => {
  const { loaded, built } = await fixture();
  assert.deepEqual(built, loaded);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(built), false);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(loaded), true);
  assertActuallyDeepFrozen(loaded);
});

test("persisted raw bytes, SHA-256, self digest and canonical materialization are frozen", async () => {
  const bytes = await readFile(ARTIFACT);
  const parsed = JSON.parse(bytes.toString("utf8"));
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(parsed.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(parsed.childDigest, computeFourSystemCurrentStatusObservationChildV24Digest(parsed));
  assert.equal(bytes.toString("utf8"), serializeFourSystemCurrentStatusObservationChildV24(parsed));
});

test("createdAt is canonical UTC and does not exceed the fixed build upper bound", async () => {
  const { loaded } = await fixture();
  assert.match(loaded.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  const instant = Date.parse(loaded.createdAt);
  const upperBound = Date.parse("2026-09-01T08:34:06.207Z");
  assert.equal(Number.isFinite(instant), true);
  assert.equal(new Date(instant).toISOString(), loaded.createdAt);
  assert.equal(instant <= upperBound, true);
});

test("v2.3 and Bazi successor are exact full-loader private brands with fixed raw+self bindings", async () => {
  const { parent, successor, loaded } = await fixture();
  assert.doesNotThrow(() => testOnly.assertParentV23(parent));
  assert.doesNotThrow(() => testOnly.assertBaziSuccessor(successor));
  assert.throws(() => testOnly.assertParentV23(clone(parent)), codeIs("PARENT_V23_BRAND_REQUIRED"));
  assert.throws(() => testOnly.assertBaziSuccessor(clone(successor)), codeIs("BAZI_SUCCESSOR_BRAND_REQUIRED"));
  assert.deepEqual(loaded.artifactBindings, [
    {
      role: testOnly.PARENT_V23.role,
      path: testOnly.PARENT_V23.path,
      rawBytes: testOnly.PARENT_V23.rawBytes,
      rawSha256: testOnly.PARENT_V23.rawSha256,
      semanticDigestField: testOnly.PARENT_V23.semanticDigestField,
      semanticDigest: testOnly.PARENT_V23.semanticDigest
    },
    {
      role: testOnly.BAZI_SUCCESSOR.role,
      path: testOnly.BAZI_SUCCESSOR.path,
      rawBytes: testOnly.BAZI_SUCCESSOR.rawBytes,
      rawSha256: testOnly.BAZI_SUCCESSOR.rawSha256,
      semanticDigestField: testOnly.BAZI_SUCCESSOR.semanticDigestField,
      semanticDigest: testOnly.BAZI_SUCCESSOR.semanticDigest
    }
  ]);
});

test("only Bazi endpoint and status differ from v2.3", async () => {
  const { loaded, parent } = await fixture();
  const currentBazi = clone(bySystem(loaded, "bazi"));
  const parentBazi = clone(bySystem(parent, "bazi"));
  assert.equal(currentBazi.currentStatus, testOnly.BAZI_CURRENT_STATUS);
  assert.deepEqual(currentBazi.currentEvidence.endpoints, [{
    role: testOnly.BAZI_SUCCESSOR.role,
    path: testOnly.BAZI_SUCCESSOR.path,
    rawBytes: testOnly.BAZI_SUCCESSOR.rawBytes,
    rawSha256: testOnly.BAZI_SUCCESSOR.rawSha256,
    semanticDigestField: testOnly.BAZI_SUCCESSOR.semanticDigestField,
    semanticDigest: testOnly.BAZI_SUCCESSOR.semanticDigest
  }]);
  currentBazi.currentStatus = parentBazi.currentStatus;
  currentBazi.currentEvidence.endpoints = parentBazi.currentEvidence.endpoints;
  assert.deepEqual(currentBazi, parentBazi);
});

test("Ziwei, Western and Vedic are canonical exact copies of v2.3", async () => {
  const { loaded, parent } = await fixture();
  for (const id of ["ziwei-doushu", "western-astrology", "vedic-astrology"]) {
    assert.deepEqual(bySystem(loaded, id), bySystem(parent, id), id);
  }
  assert.doesNotThrow(() => testOnly.assertSystems(loaded, parent));
});

test("formal full Manifest remains false and all four systems keep zero gates and authority", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.currentStatusSummary.allSystemsCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(loaded.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(loaded.currentStatusSummary.systemsFormallyAdmitted, 0);
  assert.equal(loaded.currentStatusSummary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(loaded.currentStatusSummary.systemsReleaseReady, 0);
  assert.equal(loaded.currentStatusSummary.systemsPublicReleaseAuthorized, 0);
  for (const system of loaded.systems) {
    assert.equal(system.currentEvidence.currentFullDomainManifestMechanicallyVerified, false, system.productSystemId);
    assert.equal(system.gateSummary.admissionGatesSatisfied, 0, system.productSystemId);
    assert.equal(system.gateSummary.bindingFrozenVerified, 0, system.productSystemId);
    assert.equal(system.gateSummary.independentExpertReviewsVerified, 0, system.productSystemId);
    for (const value of Object.values(system.authorityBoundary)) assert.equal(value, false, system.productSystemId);
  }
});

test("v2.3 non-Bazi projection mutation is rejected even after v2.4 self resealing", async () => {
  const { loaded, parent } = await fixture();
  for (const mutate of [
    (value) => { bySystem(value, "ziwei-doushu").currentStatus = "forged"; },
    (value) => { bySystem(value, "western-astrology").currentEvidence.endpoints.length = 0; },
    (value) => { bySystem(value, "vedic-astrology").currentEvidence.currentEngineeringManifestMechanicallyVerified = false; }
  ]) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(() => testOnly.assertChildBoundary(forged, parent), codeIs("NON_BAZI_PROJECTION_DRIFT"));
  }
});

test("Bazi projection mutation beyond endpoint/status is rejected after self resealing", async () => {
  const { loaded, parent } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "bazi").currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
  reseal(forged);
  assert.throws(() => testOnly.assertChildBoundary(forged, parent), codeIs("BAZI_PROJECTION_DRIFT"));
});

test("clone and exact-content reseal never gain the v2.4 private brand", async () => {
  const { loaded, parent } = await fixture();
  const copied = clone(loaded);
  const forged = clone(loaded);
  forged.childDigest = computeFourSystemCurrentStatusObservationChildV24Digest(forged);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(copied), false);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(forged), false);
  assert.throws(() => getFourSystemCurrentStatusObservationChildV24Summary(copied), codeIs("CHILD_BRAND_REQUIRED"));
  assert.doesNotThrow(() => testOnly.assertChildBoundary(forged, parent, loaded));
});

test("authority, registry and owner promotion are rejected after self resealing", async () => {
  const { loaded, parent } = await fixture();
  for (const mutate of [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.versionBoundary.persistedAsCentralRegistry = true; },
    (value) => { value.versionBoundary.manifestRebindOrResignPerformed = true; },
    (value) => { value.versionBoundary.ownerPromotionDecisionReceipt = "forged"; }
  ]) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(() => testOnly.assertChildBoundary(forged, parent), codeIs("BOUNDARY_PROMOTION_FORBIDDEN"));
  }
});

test("non-atomic, epoch, interval and ABA promotions are rejected", async () => {
  const { loaded, parent } = await fixture();
  for (const field of ["crossFileAtomicSnapshot", "mutationEpochAvailableForSchema13", "intervalMutationExcludedAcrossFiles", "abaExcluded"]) {
    const forged = clone(loaded);
    forged.observationBoundary[field] = true;
    reseal(forged);
    assert.throws(() => testOnly.assertChildBoundary(forged, parent), codeIs("BOUNDARY_PROMOTION_FORBIDDEN"));
  }
  assert.equal(loaded.observationBoundary.mutationEpochReceipt, null);
});

test("project remains legacy-v13 / targetSchema 13 / migrationId null without inheritance", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(loaded.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(loaded.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(loaded.projectReleaseGovernanceContext.publicDeploymentAuthorized, false);
  assert.equal(loaded.projectReleaseGovernanceContext.expertClaimsAuthorized, false);
  assert.equal(loaded.projectReleaseGovernanceContext.inheritedByZiweiWesternOrVedicProductIdentity, false);
});

test("captured WeakSet intrinsics resist post-import brand poisoning", async () => {
  const { loaded } = await fixture();
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.add = () => { throw new Error("poisoned add"); };
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(loaded), true);
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(clone(loaded)), false);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import Object.isFrozen poison still yields an actually deep-frozen brand", async () => {
  const nativeIsFrozen = Object.isFrozen;
  let loaded;
  try {
    Object.isFrozen = () => true;
    loaded = await loadFourSystemCurrentStatusObservationChildV24(ROOT);
  } finally {
    Object.isFrozen = nativeIsFrozen;
  }
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV24(loaded), true);
  assertActuallyDeepFrozen(loaded);
  assert.throws(() => { loaded.authorityBoundary.releaseReady = true; }, TypeError);
  assert.throws(() => { loaded.systems[0].gateSummary.admissionGatesSatisfied = 8; }, TypeError);
});

test("captured canonical and summary paths ignore poisoned array map and iterator", async () => {
  const { loaded } = await fixture();
  const originalMap = Array.prototype.map;
  const originalIterator = Array.prototype[Symbol.iterator];
  let summary;
  let serialized;
  try {
    Array.prototype.map = () => { throw new Error("poisoned map"); };
    Array.prototype[Symbol.iterator] = function* poisonedIterator() { throw new Error("poisoned iterator"); };
    summary = getFourSystemCurrentStatusObservationChildV24Summary(loaded);
    serialized = serializeFourSystemCurrentStatusObservationChildV24(loaded);
  } finally {
    Array.prototype.map = originalMap;
    Array.prototype[Symbol.iterator] = originalIterator;
  }
  assert.equal(summary.systemsRequired, 4);
  assert.match(serialized, /four_system_current_status_observation_child_v2_4/u);
});

test("CLI emits one narrow calibrated summary", () => {
  const run = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_OK \{/u);
  const summary = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.systemsFormallyAdmitted, 0);
  assert.equal(summary.systemsReleaseReady, 0);
  assert.equal(summary.systemsPublicReleaseAuthorized, 0);
  assert.equal(summary.baziCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
});

test("CLI rejects operands and visible preload options without detail leakage", () => {
  const operand = spawnSync(process.execPath, [CLI, "unexpected"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr, "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_FAILED VERIFICATION_FAILED\n");
  const preload = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "--trace-warnings" } });
  assert.equal(preload.status, 1);
  assert.equal(preload.stderr, "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_4_FAILED VERIFICATION_FAILED\n");
});

test("importing the CLI is side-effect free", () => {
  const code = `await import(${JSON.stringify(pathToFileURL(CLI).href)}); process.stdout.write("IMPORTED\\n");`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
