import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_V2_RELATIVE_PATH,
  assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2,
  buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2,
  computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest,
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2,
  loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2,
  serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2,
  westernSourceAndManifestIdentityDriftReceiptCandidateV2TestOnly
} from "./western-source-and-manifest-identity-drift-receipt-candidate-v2-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts", "verify-western-source-and-manifest-identity-drift-receipt-candidate-v2.mjs");
const RECEIPT = path.join(ROOT, WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_V2_RELATIVE_PATH);

function clone(value) {
  return structuredClone(value);
}

function reseal(value) {
  value.receiptDigest = computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(value);
  return value;
}

function cleanCliEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_REPL_EXTERNAL_MODULE"]) {
    if (!(key in extra)) delete environment[key];
  }
  return environment;
}

test("builds exact separate 2/22 and 18/92 drift partitions", async () => {
  const receipt = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  assert.equal(receipt.driftPartitions.preExistingParentBuildGraph.driftCount, 2);
  assert.equal(receipt.driftPartitions.preExistingParentBuildGraph.unchangedCount, 22);
  assert.deepEqual(
    receipt.driftPartitions.preExistingParentBuildGraph.drift.map((entry) => entry.path),
    ["package.json", "package-lock.json"]
  );
  assert.equal(receipt.driftPartitions.westernSixRootSource.driftCount, 18);
  assert.equal(receipt.driftPartitions.westernSixRootSource.unchangedCount, 92);
  assert.equal(receipt.driftPartitions.westernSixRootSource.pathSetExact, true);
  assert.equal(receipt.crossPartitionBoundary.changedPathSetsDisjoint, true);
  assert.equal(receipt.crossPartitionBoundary.totalDistinctChangedPaths, 20);
  assert.equal(receipt.crossPartitionBoundary.mustRemainSeparateAccounting, true);
});

test("binds exact six-root counts and confines drift to preview plus adapter", async () => {
  const receipt = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  const western = receipt.driftPartitions.westernSixRootSource;
  assert.deepEqual({ ...western.rootFileCounts }, {
    "isolated-drafts/western-civil-time-fact-browser-draft": 27,
    "packages/tzdb-core": 8,
    "packages/western-astrology-contracts-draft": 6,
    "packages/western-astrology-rules-preview-draft": 24,
    "packages/western-astronomy-engine-adapter-draft": 40,
    "packages/western-civil-time-input-adapter-draft": 5
  });
  assert.deepEqual({ ...western.rootDriftCounts }, {
    "isolated-drafts/western-civil-time-fact-browser-draft": 0,
    "packages/tzdb-core": 0,
    "packages/western-astrology-contracts-draft": 0,
    "packages/western-astrology-rules-preview-draft": 12,
    "packages/western-astronomy-engine-adapter-draft": 6,
    "packages/western-civil-time-input-adapter-draft": 0
  });
  assert.equal(western.drift.length, 18);
  assert.ok(western.drift.every((entry) => (
    /^[0-9a-f]{64}$/u.test(entry.historical.sha256)
    && /^[0-9a-f]{64}$/u.test(entry.current.sha256)
    && entry.historical.sha256 !== entry.current.sha256
  )));
});

test("verifies four historical raw+self parents without importing their private brands", async () => {
  const receipt = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  assert.equal(receipt.historicalRawSelfBindings.length, 4);
  for (const binding of receipt.historicalRawSelfBindings) {
    assert.equal(binding.rawAndSelfDigestVerified, true);
    assert.equal(binding.fullLoaderImported, false);
    assert.equal(binding.fullLoaderInvoked, false);
    assert.equal(binding.privateBrandConsumed, false);
    assert.equal(binding.brandCurrent, false);
    assert.equal(binding.currentEndpointClaimed, false);
    assert.equal(binding.preservedUnmodified, true);
  }
});

test("only the fixed persisted loader produces the process-local verified brand", async () => {
  const built = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(built), false);
  const loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(loaded), true);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(clone(loaded)), false);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(
    assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(clone(loaded))
  ), false);
});

test("keeps persisted bytes canonical and equal to a fresh current projection", async () => {
  const raw = await readFile(RECEIPT, "utf8");
  const loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  const built = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  assert.equal(raw, serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2(loaded));
  assert.equal(
    serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2(loaded),
    serializeWesternSourceAndManifestIdentityDriftReceiptCandidateV2(built)
  );
  assert.equal(loaded.receiptDigest, "7e562d0fa00239f5ef5293d70f6e66f6742fde82ef107bfb0461309c15667b4c");
});

test("rejects authority and currentness escalation even after attacker resealing", async () => {
  const base = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  for (const [mutate, expectedCode] of [
    [(value) => { value.authorityBoundary.formalAdmissionAllowed = true; }, "AUTHORITY_ESCALATION"],
    [(value) => { value.ownerDecisionBoundary.manifestRebindAuthorized = true; }, "OWNER_BOUNDARY_INVALID"],
    [(value) => { value.currentnessBoundary.historicalWesternV5Current = true; }, "CURRENTNESS_BOUNDARY_INVALID"],
    [(value) => { value.observationBoundary.mutationEpochBound = true; }, "OBSERVATION_BOUNDARY_INVALID"],
    [(value) => { value.releaseGovernance.publicReleaseAuthorized = true; }, "RELEASE_GOVERNANCE_INVALID"]
  ]) {
    const tampered = clone(base);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(tampered),
      (error) => error?.code === expectedCode
    );
  }
});

test("rejects collapsed or altered drift partitions even after resealing", async () => {
  const base = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  const countTamper = clone(base);
  countTamper.driftPartitions.westernSixRootSource.driftCount = 17;
  reseal(countTamper);
  assert.throws(
    () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(countTamper),
    (error) => error?.code === "DRIFT_PARTITION_INVALID"
  );

  const collapse = clone(base);
  collapse.crossPartitionBoundary.mustRemainSeparateAccounting = false;
  reseal(collapse);
  assert.throws(
    () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(collapse),
    (error) => error?.code === "CROSS_PARTITION_BOUNDARY_INVALID"
  );

  const identityTamper = clone(base);
  identityTamper.driftPartitions.westernSixRootSource.drift[0].current.sha256 = "0".repeat(64);
  reseal(identityTamper);
  assert.throws(
    () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(identityTamper),
    (error) => error?.code === "DRIFT_IDENTITY_INVALID"
  );

  const extraAuthority = clone(base);
  extraAuthority.formalAuthority = true;
  reseal(extraAuthority);
  assert.throws(
    () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(extraAuthority),
    (error) => error?.code === "RECEIPT_KEYS_INVALID"
  );
});

test("pins every causal, atomicity, ABA, classification and root-scope partition field", async () => {
  const base = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  const cases = [
    ["PARENT_GRAPH_SUMMARY_INVALID", (value) => { value.driftPartitions.preExistingParentBuildGraph.classification = "current"; }],
    ["PARENT_GRAPH_SUMMARY_INVALID", (value) => { value.driftPartitions.preExistingParentBuildGraph.persistedPreTrancheSnapshotAvailable = true; }],
    ["PARENT_GRAPH_SUMMARY_INVALID", (value) => { value.driftPartitions.preExistingParentBuildGraph.trustedTemporalOrderEstablished = true; }],
    ["PARENT_GRAPH_SUMMARY_INVALID", (value) => { value.driftPartitions.preExistingParentBuildGraph.causalOriginEstablished = true; }],
    ["WESTERN_PARTITION_SUMMARY_INVALID", (value) => { value.driftPartitions.westernSixRootSource.classification = "current_manifest"; }],
    ["WESTERN_PARTITION_SUMMARY_INVALID", (value) => { value.driftPartitions.westernSixRootSource.allowlistedRoots.pop(); }],
    ["WESTERN_PARTITION_SUMMARY_INVALID", (value) => { value.driftPartitions.westernSixRootSource.crossFileAtomicSnapshotEstablished = true; }],
    ["WESTERN_PARTITION_SUMMARY_INVALID", (value) => { value.driftPartitions.westernSixRootSource.intervalIntegrityEstablished = true; }],
    ["WESTERN_PARTITION_SUMMARY_INVALID", (value) => { value.driftPartitions.westernSixRootSource.abaExcluded = true; }]
  ];
  for (const [expectedCode, mutate] of cases) {
    const tampered = clone(base);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(tampered),
      (error) => error?.code === expectedCode
    );
  }
});

test("rejects historical loader or brand promotion even after resealing", async () => {
  const base = await buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
  const tampered = clone(base);
  tampered.historicalRawSelfBindings[2].fullLoaderInvoked = true;
  tampered.historicalRawSelfBindings[2].brandCurrent = true;
  reseal(tampered);
  assert.throws(
    () => assertWesternSourceAndManifestIdentityDriftReceiptCandidateV2(tampered),
    (error) => error?.code === "HISTORICAL_BINDING_INVALID"
  );
});

test("rejects caller-selected workspace roots", async () => {
  await assert.rejects(
    buildWesternSourceAndManifestIdentityDriftReceiptCandidateV2({ workspaceRoot: os.tmpdir() }),
    (error) => error?.code === "WORKSPACE_ROOT_FORBIDDEN"
  );
  await assert.rejects(
    loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2({ workspaceRoot: os.tmpdir() }),
    (error) => error?.code === "WORKSPACE_ROOT_FORBIDDEN"
  );
});

test("canonical capture rejects accessors, proxies, aliases, cycles and sparse arrays", () => {
  let getterCalled = false;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() { getterCalled = true; return 1; }
  });
  assert.throws(() => computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(accessor));
  assert.equal(getterCalled, false);
  assert.throws(() => computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(new Proxy({}, {})));
  const shared = {};
  assert.throws(() => computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest({ a: shared, b: shared }));
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(cycle));
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => computeWesternSourceAndManifestIdentityDriftReceiptCandidateV2Digest(sparse));
});

test("captured freeze and WeakSet intrinsics resist same-realm post-import poisoning", async () => {
  const originalFreeze = Object.freeze;
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  let loaded;
  try {
    Object.freeze = (value) => value;
    WeakSet.prototype.add = function poisonedAdd() { return this; };
    WeakSet.prototype.has = () => true;
    loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidateV2();
    assert.equal(Object.isFrozen(loaded), true);
    assert.equal(Object.isFrozen(loaded.authorityBoundary), true);
    assert.equal(Object.isFrozen(loaded.driftPartitions.westernSixRootSource), true);
    assert.equal(Object.isFrozen(loaded.driftPartitions.westernSixRootSource.drift[0].current), true);
    assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(loaded), true);
    assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2({}), false);
  } finally {
    Object.freeze = originalFreeze;
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
  assert.throws(() => { loaded.authorityBoundary.formalAdmissionAllowed = true; }, TypeError);
  assert.equal(loaded.authorityBoundary.formalAdmissionAllowed, false);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidateV2(loaded), true);
});

test("recursive freeze does not depend on the mutable Array iterator", () => {
  const originalIterator = Array.prototype[Symbol.iterator];
  const candidate = { nested: { leaf: { value: false } }, rows: [{ current: false }] };
  try {
    Array.prototype[Symbol.iterator] = function emptyIterator() {
      return { next: () => ({ done: true, value: undefined }) };
    };
    westernSourceAndManifestIdentityDriftReceiptCandidateV2TestOnly.deepFreeze(candidate);
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
  }
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.nested), true);
  assert.equal(Object.isFrozen(candidate.nested.leaf), true);
  assert.equal(Object.isFrozen(candidate.rows), true);
  assert.equal(Object.isFrozen(candidate.rows[0]), true);
});

test("CLI succeeds from an unrelated cwd and rejects operands or loader environment", () => {
  const success = spawnSync(process.execPath, [CLI], {
    cwd: os.tmpdir(),
    env: cleanCliEnvironment(),
    encoding: "utf8"
  });
  assert.equal(success.status, 0, success.stderr);
  const summary = JSON.parse(success.stdout);
  assert.equal(summary.verified, true);
  assert.equal(summary.parentBuildGraphDrift, 2);
  assert.equal(summary.westernSourceDrift, 18);
  assert.equal(summary.activeAdmissionEffect, "none");

  const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
    env: cleanCliEnvironment(),
    encoding: "utf8"
  });
  assert.equal(operand.status, 1);
  assert.match(operand.stderr, /CLI_OPERAND_FORBIDDEN/u);

  const loaderEnvironment = spawnSync(process.execPath, [CLI], {
    env: cleanCliEnvironment({ NODE_OPTIONS: "--no-warnings" }),
    encoding: "utf8"
  });
  assert.equal(loaderEnvironment.status, 1);
  assert.match(loaderEnvironment.stderr, /CLI_ENVIRONMENT_FORBIDDEN/u);
});

test("the transitive static import closure contains no dynamic or historical full loader", async () => {
  const entry = path.join(
    ROOT, "scripts", "western-source-and-manifest-identity-drift-receipt-candidate-v2-lib.mjs"
  );
  const visited = new Set();
  async function visit(file) {
    const normalized = path.resolve(file);
    if (visited.has(normalized)) return;
    visited.add(normalized);
    const source = await readFile(normalized, "utf8");
    assert.doesNotMatch(source, /\bimport\s*\(/u, `${normalized} contains dynamic import`);
    assert.doesNotMatch(source, /\bcreateRequire\s*\(/u, `${normalized} contains createRequire`);
    assert.doesNotMatch(source, /\bmodule\.register\s*\(/u, `${normalized} contains module.register`);
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/gu)]
      .map((match) => path.resolve(path.dirname(normalized), match[1]));
    for (const imported of imports) await visit(imported);
  }
  await visit(entry);
  const forbidden = new Set([
    "western-independent-engineering-manifest-v5-lib.mjs",
    "four-system-current-status-observation-child-v2-14-lib.mjs",
    "western-civil-time-same-artifact-browser-observation-lib.mjs",
    "western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs"
  ]);
  assert.equal([...visited].some((file) => forbidden.has(path.basename(file))), false);
  assert.equal(westernSourceAndManifestIdentityDriftReceiptCandidateV2TestOnly.MODULE_ROOT, ROOT);
});
