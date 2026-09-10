import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  isVerifiedBaziDomainReleaseManifestV22,
  isVerifiedBaziDomainReleaseManifestV22HistoricalBasis,
  loadBaziDomainReleaseManifestV22,
  loadBaziDomainReleaseManifestV22HistoricalBasis,
  verifyBaziDomainReleaseManifestComponentFileIdentities
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH,
  assertBaziDomainReleaseManifestV23SemanticIdentity,
  buildBaziDomainReleaseManifestV23FromHistoricalBasis,
  buildCurrentBaziDomainReleaseManifestV23,
  computeBaziDomainReleaseManifestV23Digest,
  getBaziDomainReleaseManifestV23Summary,
  isVerifiedBaziDomainReleaseManifestV23,
  loadBaziDomainReleaseManifestV23,
  serializeBaziDomainReleaseManifestV23
} from "./bazi-domain-release-manifest-v2-3-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OLD_PATH = "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json";
const REBOUND_PATHS = ["package-lock.json", "packages/research-export/src/single-chart-report.ts"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));
const code = (expected) => (error) => error?.code === expected;

// Lazy setup: this file contains ordinary data/identity cases only. No fixture
// changes prototypes, loads preloads, aliases files or launches child processes.
let fixturePromise;
function fixture() {
  fixturePromise ??= (async () => {
    const basis = await loadBaziDomainReleaseManifestV22HistoricalBasis(ROOT);
    const loaded = await loadBaziDomainReleaseManifestV23(ROOT);
    return { basis, loaded, before: basis.manifest, after: loaded.manifest };
  })();
  return fixturePromise;
}

function component(manifest, id) {
  const matches = manifest.components.filter((entry) => entry.componentId === id);
  assert.equal(matches.length, 1);
  return matches[0];
}

function resigned(manifest, mutation) {
  const changed = clone(manifest);
  mutation(changed);
  changed.manifestDigest = computeBaziDomainReleaseManifestV23Digest(changed);
  return changed;
}

test("v2.2 historical construction has a distinct brand without current component verification", async () => {
  const { basis } = await fixture();
  assert.equal(isVerifiedBaziDomainReleaseManifestV22HistoricalBasis(basis), true);
  assert.equal(isVerifiedBaziDomainReleaseManifestV22(basis), false);
  assert.equal(basis.historicalConstructionVerified, true);
  assert.equal(basis.currentComponentIdentitiesVerified, false);
  assert.equal(basis.historicalManifestBrandCurrent, false);
  assert.equal(isVerifiedBaziDomainReleaseManifestV22HistoricalBasis(clone(basis)), false);
  assert.equal(Object.isFrozen(basis.manifest.authorityBoundary), true);
  const oldBytes = await readFile(path.join(ROOT, OLD_PATH));
  assert.equal(oldBytes.length, 23399);
  assert.equal(hash(oldBytes), "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d");
});

test("the unchanged v2.2 full loader still rejects its historical component pins", async () => {
  await assert.rejects(loadBaziDomainReleaseManifestV22(ROOT), code("COMPONENT_FILE_IDENTITY_DRIFT"));
});

test("v2.3 full loader and builder match pinned bytes and verify all 28 current component files", async () => {
  const { basis, loaded, after } = await fixture();
  const bytes = await readFile(path.join(ROOT, BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH));
  assert.equal(bytes.length, 23376);
  assert.equal(hash(bytes), "d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578");
  assert.equal(after.manifestDigest, "98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f");
  assert.equal(computeBaziDomainReleaseManifestV23Digest(after), after.manifestDigest);
  assert.equal(serializeBaziDomainReleaseManifestV23(after), bytes.toString("utf8"));
  assert.deepEqual(await buildCurrentBaziDomainReleaseManifestV23(ROOT), after);
  assert.deepEqual(buildBaziDomainReleaseManifestV23FromHistoricalBasis(basis), after);
  assert.equal(isVerifiedBaziDomainReleaseManifestV23(loaded), true);
  assert.equal(loaded.uniqueComponentFileIdentitiesVerified, 28);
  assert.equal(Object.isFrozen(loaded.manifest.components[0].files[0]), true);
  const files = new Map(after.components.flatMap((entry) => entry.files.map((file) => [file.path, file])));
  assert.equal(files.size, 28);
  for (const file of files.values()) {
    const actual = await readFile(path.join(ROOT, file.path));
    assert.equal(actual.length, file.rawBytes, file.path);
    assert.equal(hash(actual), file.sha256, file.path);
  }
});

test("v2.3 changes exactly two file identities and preserves all other domain and authority semantics", async () => {
  const { before, after } = await fixture();
  const normalized = clone(after);
  const changedPaths = [];
  for (let index = 0; index < before.components.length; index += 1) {
    const oldComponent = before.components[index];
    const newComponent = after.components[index];
    assert.equal(newComponent.componentId, oldComponent.componentId);
    assert.equal(newComponent.version, oldComponent.version);
    assert.equal(newComponent.status, oldComponent.status);
    assert.equal(newComponent.files.length, oldComponent.files.length);
    for (let fileIndex = 0; fileIndex < oldComponent.files.length; fileIndex += 1) {
      const oldFile = oldComponent.files[fileIndex];
      const newFile = newComponent.files[fileIndex];
      assert.equal(newFile.path, oldFile.path);
      if (JSON.stringify(newFile) !== JSON.stringify(oldFile)) changedPaths.push(newFile.path);
    }
    if (!["execution_rules", "report_contract"].includes(oldComponent.componentId)) {
      assert.deepEqual(newComponent, oldComponent);
    } else normalized.components[index] = clone(oldComponent);
  }
  assert.deepEqual(changedPaths, REBOUND_PATHS);
  assert.equal(after.domainIdentity.rulesetDigest, before.domainIdentity.rulesetDigest);
  assert.equal(after.domainIdentity.reportContractDigest, component(after, "report_contract").digest);
  assert.deepEqual(after.lineage.supersedesForCurrentMachineIdentityOnly, {
    path: OLD_PATH, rawBytes: 23399,
    rawSha256: "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d",
    manifestId: before.manifestId, manifestDigest: before.manifestDigest
  });
  assert.deepEqual(after.lineage.reboundComponentIds, ["execution_rules", "report_contract"]);
  normalized.domainIdentity.reportContractDigest = before.domainIdentity.reportContractDigest;
  for (const key of ["schemaVersion", "manifestRevision", "manifestId", "createdAt", "lineage", "evidenceLedger", "manifestDigest"]) {
    normalized[key] = clone(before[key]);
  }
  assert.deepEqual(normalized, before);
});

test("v2.3 rejects self-consistent ordinary data changes outside the two permitted bindings", async () => {
  const { basis, after } = await fixture();
  for (const mutation of [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.ownerAcceptanceForReleaseCandidateEstablished = true; },
    (value) => { value.gateState.independentExpertReviewsVerified = 1; },
    (value) => { value.gateState.bindingFrozenVerified = 1; },
    (value) => { value.domainIdentity.rulesetDigest = "0".repeat(64); },
    (value) => { component(value, "input_policy").files[0].rawBytes += 1; },
    (value) => { value.lineage.supersedesForCurrentMachineIdentityOnly.rawBytes += 1; },
    (value) => { value.components.push(clone(value.components[0])); }
  ]) {
    assert.throws(() => assertBaziDomainReleaseManifestV23SemanticIdentity(
      resigned(after, mutation), basis
    ), code("MANIFEST_MISMATCH"));
  }
});

test("v2.3 rejects missing or incorrect self digests and unverified ordinary basis objects", async () => {
  const { basis, after } = await fixture();
  const changed = clone(after);
  changed.manifestDigest = "0".repeat(64);
  assert.throws(() => assertBaziDomainReleaseManifestV23SemanticIdentity(changed, basis), code("MANIFEST_DIGEST_INVALID"));
  delete changed.manifestDigest;
  assert.throws(() => assertBaziDomainReleaseManifestV23SemanticIdentity(changed, basis), code("MANIFEST_DIGEST_INVALID"));
  assert.throws(() => buildBaziDomainReleaseManifestV23FromHistoricalBasis(clone(basis)), code("HISTORICAL_BASIS_BRAND_REQUIRED"));
});

test("v2.3 component verification rejects either old changed input identity without skipping the other files", async () => {
  const { before, after } = await fixture();
  for (const id of ["execution_rules", "report_contract"]) {
    const changed = clone(after);
    component(changed, id).files = clone(component(before, id).files);
    await assert.rejects(verifyBaziDomainReleaseManifestComponentFileIdentities(ROOT, changed), code("COMPONENT_FILE_IDENTITY_DRIFT"));
  }
  const unchangedFile = clone(after);
  component(unchangedFile, "interpretation_rules").files[0].rawBytes += 1;
  await assert.rejects(verifyBaziDomainReleaseManifestComponentFileIdentities(ROOT, unchangedFile), code("COMPONENT_FILE_IDENTITY_DRIFT"));
});

test("v2.3 mechanical summary preserves the current selection and external authority boundary", async () => {
  const { loaded, after } = await fixture();
  const summary = getBaziDomainReleaseManifestV23Summary(loaded);
  assert.equal(summary.baziV17MachineIdentityManifestV23MechanicallyVerified, true);
  assert.equal(summary.uniqueComponentFileIdentitiesVerified, 28);
  assert.equal(summary.reboundComponentFileCount, 2);
  assert.equal(summary.unchangedComponentFileCount, 26);
  assert.equal(summary.repositorySelectionEstablished, false);
  assert.equal(summary.historicalManifestV22BrandCurrent, false);
  assert.deepEqual(summary.authorityBoundary, after.authorityBoundary);
  assert.deepEqual(summary.gateState, after.gateState);
  assert.deepEqual(summary.releaseGovernance, after.releaseGovernance);
  assert.equal(summary.authorityBoundary.releaseReady, false);
  assert.equal(summary.authorityBoundary.publicDeploymentAuthorized, false);
  assert.equal(summary.authorityBoundary.expertClaimsAuthorized, false);
  assert.equal(isVerifiedBaziDomainReleaseManifestV23(clone(loaded)), false);
  assert.throws(() => getBaziDomainReleaseManifestV23Summary(clone(loaded)), code("MANIFEST_V23_BRAND_REQUIRED"));
});
