import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH,
  buildCurrentVedicTzdbCoreDependencyLicenseCarrierChild,
  computeVedicTzdbCoreDependencyLicenseCarrierChildDigest,
  getVedicTzdbCoreDependencyLicenseCarrierChildSummary,
  isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild,
  loadVedicTzdbCoreDependencyLicenseCarrierChild,
  parseVedicTzdbCoreDependencyLicenseCarrierChildArtifact,
  serializeVedicTzdbCoreDependencyLicenseCarrierChild,
  verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger,
  vedicTzdbCoreDependencyLicenseCarrierChildTestOnly as fixed
} from "./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.resolve(
  ROOT,
  ...VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH.split("/")
);
const CLI = path.resolve(
  ROOT,
  "scripts",
  "verify-vedic-tzdb-core-dependency-license-carrier-observation-child.mjs"
);
const persistedBytes = await readFile(ARTIFACT);
const persisted = JSON.parse(persistedBytes.toString("utf8"));
const current = await buildCurrentVedicTzdbCoreDependencyLicenseCarrierChild();

function clone(value = persisted) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.childDigest = computeVedicTzdbCoreDependencyLicenseCarrierChildDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (reason) => reason?.code === code);
}

function cleanEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd ?? ROOT,
    env: cleanEnv(options.env),
    encoding: "utf8"
  });
}

test("fixed carrier child loads with private brand and exact identity", async () => {
  const result = await loadVedicTzdbCoreDependencyLicenseCarrierChild();
  assert.equal(isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(getVedicTzdbCoreDependencyLicenseCarrierChildSummary(result), {
    childId: fixed.CHILD_ID,
    childDigest: "37800051745eeff337134962eb2518c9149eab14cf8369d559419ea76cdca4d0",
    status: fixed.STATUS,
    createdAt: fixed.CREATED_AT,
    dependencyCarrierCount: 3,
    licenseCarrierEndpointsVerified: 3,
    packedCarrierEndpointsVerified: 2,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    rawBytes: 12_983,
    rawSha256: "3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884"
  });
  const forged = { ...result };
  assert.equal(isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(forged), false);
  expectCode(
    () => getVedicTzdbCoreDependencyLicenseCarrierChildSummary(forged),
    "PRIVATE_BRAND_MISSING"
  );
});

test("persisted raw and canonical identities are exact", () => {
  assert.equal(persistedBytes.byteLength, fixed.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    fixed.EXPECTED_PERSISTED_RAW.rawSha256
  );
  assert.equal(persistedBytes.toString("utf8"), serializeVedicTzdbCoreDependencyLicenseCarrierChild(current, current));
  assert.equal(persisted.childDigest, computeVedicTzdbCoreDependencyLicenseCarrierChildDigest(persisted));
  assert.deepEqual(persisted, current);
});

test("child observes exactly the current tzdb-core three-node closure", () => {
  assert.deepEqual(
    persisted.dependencyCarriers.map((entry) => [
      entry.ordinal,
      entry.relationship,
      entry.declaredDependencyName,
      entry.packageName,
      entry.version,
      entry.lockEntry.declaredLicense
    ]),
    [
      [1, "tzdb_core_direct_current_dependency", "moment-timezone", "moment-timezone", "0.6.3", "MIT"],
      [2, "tzdb_core_direct_retained_alias_dependency", "moment-timezone-2025b", "moment-timezone", "0.5.48", "MIT"],
      [3, "shared_transitive_dependency_of_both_moment_timezone_nodes", "moment", "moment", "2.30.1", "MIT"]
    ]
  );
  assert.equal(persisted.dependencyClosure.completeCurrentTzdbCoreThirdPartyLockClosureObserved, true);
  assert.equal(persisted.dependencyClosure.completeVedicProductRuntimeClosureObserved, false);
  assert.equal(persisted.dependencyClosure.buildAndTestToolingClosureObserved, false);
});

test("2026c and retained 2025b packed carriers are exact and do not claim provenance", () => {
  const packed = persisted.dependencyCarriers
    .filter((entry) => entry.packedCarrier !== null)
    .map((entry) => [
      entry.packedCarrier.ianaVersion,
      entry.packedCarrier.rawBytes,
      entry.packedCarrier.rawSha256,
      entry.packedCarrier.publisherTarballByteEqualityEstablished,
      entry.packedCarrier.dataTransformationProvenanceEstablished
    ]);
  assert.deepEqual(packed, [
    ["2026c", 715_527, "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81", false, false],
    ["2025b", 727_104, "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425", false, false]
  ]);
});

test("license bodies are not copied and notice observations remain non-legal", () => {
  const source = persistedBytes.toString("utf8");
  assert.equal(source.includes("Permission is hereby granted"), false);
  assert.equal(source.includes("THE SOFTWARE IS PROVIDED"), false);
  for (const entry of persisted.dependencyCarriers) {
    assert.equal(entry.licenseCarrier.bodyCopiedIntoChild, false);
    assert.equal(entry.licenseCarrier.exactQuoteStoredInChild, false);
    assert.equal(entry.noticeObservation.entryObserved, true);
    assert.equal(entry.noticeObservation.noticeObligationSatisfied, false);
    assert.equal(entry.noticeObservation.legalReviewComplete, false);
  }
});

test("rights authority release runtime time and epoch boundaries stay red", () => {
  for (const key of [
    "licenseAuthenticityEstablished",
    "publisherTarballByteEqualityEstablished",
    "licenseApplicabilityEstablished",
    "workRightsEstablished",
    "versionRightsEstablished",
    "carrierRightsEstablished",
    "rightsLegalConclusionEstablished",
    "redistributionAuthorized",
    "noticeObligationSatisfied"
  ]) assert.equal(persisted.rightsBoundary[key], false, key);
  for (const [key, value] of Object.entries(persisted.authorityBoundary)) {
    assert.equal(value, false, key);
  }
  assert.equal(persisted.observationBoundary.mutationEpochAvailable, false);
  assert.equal(persisted.observationBoundary.mutationEpochReceipt, null);
  assert.equal(persisted.observationBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(persisted.observationBoundary.intervalMutationExcluded, false);
  assert.equal(persisted.observationBoundary.abaExcluded, false);
  assert.equal(persisted.runtimeTrustBoundary.hiddenPreEvaluationCodeExecutionExcluded, false);
  assert.equal(persisted.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
  assert.equal(persisted.timeBoundary.trustedTimestampEstablished, false);
});

test("only the two existing tzdb subjects are carrier-scope targets", () => {
  assert.deepEqual(persisted.sourceRequirementsProjectionBoundary.targetSubjectIds, [
    "vedic.input.iana_time_zone_and_tzdb_identity",
    "vedic.rule.rights_license_and_redistribution_review"
  ]);
  assert.equal(persisted.sourceRequirementsProjectionBoundary.carrierScopeOnly, true);
  assert.equal(persisted.sourceRequirementsProjectionBoundary.bindsFormalV1, false);
  assert.equal(persisted.sourceRequirementsProjectionBoundary.bindsNonformalV11, false);
  assert.equal(persisted.sourceRequirementsProjectionBoundary.countsTowardFrozenBindingGate, false);
});

test("digest-only tampering is rejected", () => {
  const value = clone();
  value.childDigest = "0".repeat(64);
  expectCode(
    () => verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(value, current),
    "CHILD_DIGEST_MISMATCH"
  );
});

test("re-signed binding promotion is rejected", () => {
  const value = clone();
  value.gateSummary.bindingFrozenVerified = 1;
  reseal(value);
  expectCode(
    () => verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(value, current),
    "GATE_PROMOTION_FORBIDDEN"
  );
});

test("re-signed legal or redistribution promotion is rejected", () => {
  for (const key of ["rightsLegalConclusionEstablished", "redistributionAuthorized"]) {
    const value = clone();
    value.rightsBoundary[key] = true;
    reseal(value);
    expectCode(
      () => verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(value, current),
      "RIGHTS_OVERCLAIM_FORBIDDEN"
    );
  }
});

test("re-signed closure edge or carrier identity drift is rejected", () => {
  for (const mutate of [
    (value) => { value.dependencyCarriers[1].lockEntry.dependencyEdges.moment = "*"; },
    (value) => { value.dependencyCarriers[2].licenseCarrier.rawBytes += 1; },
    (value) => { value.dependencyClosure.observedThirdPartyNodeCount = 4; }
  ]) {
    const value = clone();
    mutate(value);
    reseal(value);
    assert.throws(
      () => verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(value, current)
    );
  }
});

test("future createdAt beyond the fixed untrusted upper bound is rejected", () => {
  const value = clone();
  value.createdAt = "2026-09-01T13:08:08.000Z";
  reseal(value);
  expectCode(
    () => verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(value, current),
    "TIME_BOUNDARY_INVALID"
  );
});

test("duplicate-key JSON is rejected before semantic verification", () => {
  const duplicate = Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}\n', "utf8");
  assert.throws(
    () => parseVedicTzdbCoreDependencyLicenseCarrierChildArtifact(duplicate, "duplicate.json")
  );
});

test("fixed CLI succeeds and prints only the bounded summary", () => {
  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_OK /u);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes("Permission is hereby granted"), false);
});

test("fixed CLI rejects arguments, wrong cwd, NODE_OPTIONS, and NODE_PATH", () => {
  const cases = [
    runCli(["unexpected"]),
    runCli([], { cwd: os.tmpdir() }),
    runCli([], { env: { NODE_OPTIONS: "" } }),
    runCli([], { env: { NODE_PATH: "" } })
  ];
  for (const result of cases) {
    assert.notEqual(result.status, 0);
    assert.notEqual(result.stderr, "");
  }
});
