import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH,
  BAZI_V17_FROZEN_GOLDEN_SHA256,
  buildCurrentBaziDomainReleaseManifestV2,
  canonicalStringifyBaziDomainReleaseManifestV2,
  computeBaziDomainReleaseManifestV2Digest,
  isVerifiedBaziDomainReleaseManifestV2,
  loadBaziDomainReleaseManifestV2,
  serializeBaziDomainReleaseManifestV2,
  baziDomainReleaseManifestV2TestOnly
} from "./bazi-domain-release-manifest-v2-lib.mjs";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Object.keys(value)) assertDeepFrozen(value[key], seen);
}

test("loads the persisted v2 machine identity with exact bytes and a private brand", async () => {
  const result = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  assert.equal(isVerifiedBaziDomainReleaseManifestV2(result), true);
  assert.equal(result.manifestId, "hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0");
  assert.equal(result.rawBytes, 16743);
  assert.equal(result.rawSha256, "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1");
  assert.equal(result.manifestDigest, "5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80");
  assert.equal(result.frozenGoldenSha256, BAZI_V17_FROZEN_GOLDEN_SHA256);
  assertDeepFrozen(result);
  assert.equal(isVerifiedBaziDomainReleaseManifestV2(clone(result)), false);
});

test("maps product 1.7 to exact rules input fact source rights expert policy and report digests", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  assert.equal(manifest.surface.productVersion, "1.7");
  assert.equal(manifest.surface.surfaceVersion, "1.7.0");
  assert.equal(manifest.domainIdentity.productVersion, "1.7");
  const componentById = Object.fromEntries(manifest.components.map((entry) => [entry.componentId, entry]));
  assert.equal(manifest.domainIdentity.rulesetDigest, componentById.interpretation_rules.digest);
  assert.equal(manifest.domainIdentity.inputPolicyDigest, componentById.input_policy.digest);
  assert.equal(manifest.domainIdentity.factSchemaDigest, componentById.fact_contract.digest);
  assert.equal(manifest.domainIdentity.sourceBundleDigest, componentById.source_bundle.digest);
  assert.equal(manifest.domainIdentity.rightsBundleDigest, componentById.rights_bundle.digest);
  assert.equal(manifest.domainIdentity.expertReviewBundleDigest, componentById.expert_review_bundle.digest);
  assert.equal(manifest.domainIdentity.highRiskPolicyDigest, componentById.high_risk_policy.digest);
  assert.equal(manifest.domainIdentity.reportContractDigest, componentById.report_contract.digest);
  assert.deepEqual(manifest.domainIdentity.expertReviewIds, []);
});

test("holds every authority gate red while preserving legacy-v13 and the epoch boundary", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  assert.deepEqual(manifest.releaseGovernance, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(manifest.gateState.bindingRequired, 12);
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.independentExpertsRequired, 2);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(manifest.gateState.bindingReadinessConsumesLatestSourceRightsPair, false);
  assert.equal(manifest.gateState.bindingReadinessStillPinsHistoricalParents, true);
  assert.equal(manifest.gateState.sourceCarrierReadinessSuccessorCreated, false);
  assert.equal(manifest.gateState.formalAdmissionPromotionBlocked, true);
  assert.equal(manifest.gateState.releaseCandidateFreezeAllowed, false);
  assert.equal(manifest.snapshotBoundary.crossFileAtomicSnapshot, false);
  assert.equal(manifest.snapshotBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(manifest.snapshotBoundary.abaExcluded, false);
  assert.equal(manifest.authorityBoundary.releaseReady, false);
  assert.equal(manifest.authorityBoundary.publicDeploymentAuthorized, false);
  assert.equal(manifest.authorityBoundary.expertClaimsAuthorized, false);
});

test("binds the latest SMT source-rights pair plus carrier and vacant expert private contexts", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  assert.deepEqual(
    manifest.verifiedMechanicalContexts.map((entry) => entry.contextId),
    [
      "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
      "hakimi.bazi.source-carrier-record-readiness/1.0.0",
      "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0"
    ]
  );
  assert.equal(manifest.verifiedMechanicalContexts[0].sourceLedgerId,
    "hakimi.bazi.strength.source-binding-candidates/1.7.0");
  assert.equal(manifest.verifiedMechanicalContexts[0].rightsLedgerId,
    "hakimi.bazi.strength.source-rights-candidates/1.3.0");
  for (const context of manifest.verifiedMechanicalContexts) {
    assert.equal(context.privateBrandVerified, true);
    assert.equal(context.activeAdmissionEffect, "none");
  }
});

test("preserves the stale predecessor byte-for-byte and does not silently integrate central consumers", async () => {
  const predecessor = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    baziDomainReleaseManifestV2TestOnly.PREDECESSOR.path
  );
  assert.equal(predecessor.rawBytes, baziDomainReleaseManifestV2TestOnly.PREDECESSOR.rawBytes);
  assert.equal(predecessor.rawSha256, baziDomainReleaseManifestV2TestOnly.PREDECESSOR.rawSha256);
  const registrySource = await readFile(
    path.resolve(workspaceRoot, "scripts/system-admission-registry-lib.mjs"),
    "utf8"
  );
  assert.equal(registrySource.includes(BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH), false);
  const { manifest } = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  assert.equal(manifest.lineage.predecessorPreservedUnmodified, true);
  assert.equal(manifest.lineage.predecessorCurrent, false);
  assert.equal(manifest.lineage.centralSystemAdmissionRegistryIntegrated, false);
  assert.equal(manifest.lineage.crossSystemEngineeringReceiptRegistryIntegrated, false);
});

test("persisted bytes are exact pretty JSON with one terminal LF and a valid digest", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  const text = await readFile(
    path.resolve(workspaceRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH.split("/")),
    "utf8"
  );
  assert.equal(text, serializeBaziDomainReleaseManifestV2(expected));
  assert.equal(text.endsWith("\n"), true);
  assert.equal(text.endsWith("\n\n"), false);
  assert.equal(Buffer.byteLength(text), 16743);
  assert.equal(createHash("sha256").update(text).digest("hex"),
    "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1");
  assert.equal(computeBaziDomainReleaseManifestV2Digest(expected), expected.manifestDigest);
});

test("self-resealed authority promotions and unknown fields cannot pass the fixed persisted identity", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH
  );
  const cases = [
    (value) => { value.gateState.bindingFrozenVerified = 12; },
    (value) => { value.gateState.independentExpertReviewsVerified = 2; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.releaseStatus = "release_candidate"; },
    (value) => { value.publicReleaseApproved = true; }
  ];
  for (const mutate of cases) {
    const value = clone(expected);
    mutate(value);
    value.manifestDigest = computeBaziDomainReleaseManifestV2Digest(value);
    assert.throws(
      () => baziDomainReleaseManifestV2TestOnly.verifyPersistedAgainstExpected(snapshot, value, expected),
      (error) => ["MANIFEST_DIGEST_DRIFT", "MANIFEST_MISMATCH"].includes(error.code)
    );
  }
});

test("raw drift and duplicate JSON keys fail before any candidate can be branded", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  const persistedSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(persistedSnapshot);
  assert.throws(
    () => baziDomainReleaseManifestV2TestOnly.verifyPersistedAgainstExpected(
      { ...persistedSnapshot, rawSha256: "0".repeat(64) },
      persisted,
      expected
    ),
    (error) => error.code === "MANIFEST_RAW_DRIFT"
  );
  const duplicate = new TextEncoder().encode('{"manifestDigest":"a","manifestDigest":"b"}');
  assert.throws(
    () => parseBaziDttStrictJsonArtifact({ path: "duplicate.json", bytes: duplicate }),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
});

test("canonical digest input rejects accessors without invoking their getter", () => {
  let calls = 0;
  const value = {};
  Object.defineProperty(value, "createdAt", {
    enumerable: true,
    get() {
      calls += 1;
      return "never";
    }
  });
  assert.throws(
    () => computeBaziDomainReleaseManifestV2Digest(value),
    (error) => error.code === "NON_CANONICAL_JSON"
  );
  assert.equal(calls, 0);

  const array = [];
  Object.defineProperty(array, "0", {
    enumerable: true,
    configurable: true,
    get() {
      calls += 1;
      return "never";
    }
  });
  array.length = 1;
  assert.throws(
    () => canonicalStringifyBaziDomainReleaseManifestV2({ array }),
    (error) => error.code === "NON_CANONICAL_JSON"
  );
  assert.equal(calls, 0);
});

test("captured manifest primordials survive post-import Array WeakSet freeze descriptor and hash poisoning", () => {
  const source = `
    const lib = await import('./scripts/bazi-domain-release-manifest-v2-lib.mjs');
    const result = await lib.loadBaziDomainReleaseManifestV2(process.cwd());
    const clone = JSON.parse(JSON.stringify(result.manifest));
    Array.prototype.push = function () { throw new Error('push poisoned'); };
    Array.prototype.sort = function () { throw new Error('sort poisoned'); };
    Array.prototype[Symbol.iterator] = function* () { return; };
    WeakSet.prototype.has = function () { return false; };
    WeakSet.prototype.add = function () { throw new Error('weakset poisoned'); };
    Object.freeze = (value) => value;
    Object.getOwnPropertyDescriptor = () => ({ get() { return 1; } });
    const crypto = await import('node:crypto');
    crypto.Hash.prototype.update = function () { throw new Error('hash poisoned'); };
    if (!lib.isVerifiedBaziDomainReleaseManifestV2(result)) process.exit(91);
    if (lib.canonicalStringifyBaziDomainReleaseManifestV2(result.manifest).length === 0) process.exit(93);
    if (lib.computeBaziDomainReleaseManifestV2Digest(result.manifest) !== result.manifestDigest) process.exit(94);
    lib.baziDomainReleaseManifestV2TestOnly.deepFreezeInternal(clone);
    if (!Object.isFrozen(result.manifest.components[0].files[0])) process.exit(92);
    if (!Object.isFrozen(clone.components[0].files[0])) process.exit(95);
    process.stdout.write('ok');
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "ok");
});

test("CLI emits only the narrow machine identity and rejects argv or NODE_OPTIONS", () => {
  const cli = spawnSync(process.execPath, ["scripts/verify-bazi-domain-release-manifest-v2.mjs"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.baziV17MachineIdentityManifestV2MechanicallyVerified, true);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);

  const argv = spawnSync(process.execPath,
    ["scripts/verify-bazi-domain-release-manifest-v2.mjs", "unexpected"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" }
    });
  assert.equal(argv.status, 1);
  assert.match(argv.stderr, /CLI_INVOCATION_REJECTED/u);

  const options = spawnSync(process.execPath,
    ["scripts/verify-bazi-domain-release-manifest-v2.mjs"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
    });
  assert.equal(options.status, 1);
  assert.match(options.stderr, /CLI_INVOCATION_REJECTED/u);
});

test("exclusive writer refuses to overwrite the persisted machine identity", () => {
  const writer = spawnSync(process.execPath, ["scripts/write-bazi-domain-release-manifest-v2.mjs"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(writer.status, 1);
  assert.match(writer.stderr, /EEXIST/u);
});

test("the historical formal manifest stays expected-red instead of borrowing v2 authority", () => {
  const old = spawnSync(process.execPath, ["scripts/verify-bazi-domain-release-manifest.mjs"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(old.status, 1);
  assert.match(`${old.stdout}\n${old.stderr}`, /manifest|MANIFEST/u);
});

test("canonical rendering is deterministic for the current manifest", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  const rebuilt = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
  assert.equal(
    canonicalStringifyBaziDomainReleaseManifestV2(expected),
    canonicalStringifyBaziDomainReleaseManifestV2(rebuilt)
  );
});
