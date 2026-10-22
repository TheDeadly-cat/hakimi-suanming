import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  assertBaziDomainReleaseManifestV25SemanticIdentity,
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_5_RELATIVE_PATH,
  buildBaziDomainReleaseManifestV25FromHistoricalBasis,
  buildCurrentBaziDomainReleaseManifestV25,
  computeBaziDomainReleaseManifestV25Digest,
  getBaziDomainReleaseManifestV25Summary,
  isVerifiedBaziDomainReleaseManifestV24HistoricalBasis,
  isVerifiedBaziDomainReleaseManifestV25,
  loadBaziDomainReleaseManifestV24HistoricalBasis,
  loadBaziDomainReleaseManifestV25,
  serializeBaziDomainReleaseManifestV25
} from "./bazi-domain-release-manifest-v2-5-lib.mjs";
import { isVerifiedBaziDomainReleaseManifestV24, loadBaziDomainReleaseManifestV24 } from "./bazi-domain-release-manifest-v2-4-lib.mjs";
import { createBaziDomainManifestV24HistoricalInputs } from "./bazi-domain-manifest-v24-history.test-fixture.mjs";
const ROOT = path.resolve(import.meta.dirname, "..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const code = expected => error => error?.code === expected;
const clone = value => JSON.parse(JSON.stringify(value));
let fixturePromise;
function fixture() {
  fixturePromise ??= Promise.all([loadBaziDomainReleaseManifestV24HistoricalBasis(ROOT), loadBaziDomainReleaseManifestV25(ROOT)]);
  return fixturePromise;
}

test("v2.5 consumes exact historical v2.4 without claiming its current component brand", async () => {
  const [basis] = await fixture();
  assert.equal(isVerifiedBaziDomainReleaseManifestV24HistoricalBasis(basis), true);
  assert.equal(isVerifiedBaziDomainReleaseManifestV24(basis), false);
  assert.equal(basis.currentComponentIdentitiesVerified, false);
  assert.equal(basis.historicalManifestBrandCurrent, false);
  assert.equal(isVerifiedBaziDomainReleaseManifestV24HistoricalBasis(clone(basis)), false);
  assert.equal(sha(await readFile(path.join(ROOT, basis.artifact.path))), "d630c555ec7441a7547d49878e25aac4d6d9481d929178f8369937a282b66689");
  await assert.rejects(loadBaziDomainReleaseManifestV24(ROOT), code("COMPONENT_FILE_IDENTITY_DRIFT"));
});

test("v2.5 full loader verifies all 28 current files and the audited dependency patch lock", async () => {
  const [basis, loaded] = await fixture();
  const bytes = await readFile(path.join(ROOT, BAZI_DOMAIN_RELEASE_MANIFEST_V2_5_RELATIVE_PATH));
  assert.equal(bytes.length, 23347);
  assert.equal(sha(bytes), "83ae87f913875636f5b82f717f3d1a0856812676e932190a7c05f85b99fec7cc");
  assert.equal(loaded.manifestDigest, "d00ebd0f3d6c26b31bc0b933d4b94845cc6b3b40879049f5cafe0e26a523d5c1");
  assert.equal(serializeBaziDomainReleaseManifestV25(loaded.manifest), bytes.toString("utf8"));
  assert.deepEqual(await buildCurrentBaziDomainReleaseManifestV25(ROOT), loaded.manifest);
  assert.deepEqual(buildBaziDomainReleaseManifestV25FromHistoricalBasis(basis), loaded.manifest);
  assert.equal(loaded.uniqueComponentFileIdentitiesVerified, 28);
  const files = new Map(loaded.manifest.components.flatMap(c => c.files.map(f => [f.path, f])));
  assert.equal(files.size, 28);
  for (const file of files.values()) {
    const actual = await readFile(path.join(ROOT, file.path));
    assert.equal(actual.length, file.rawBytes, file.path); assert.equal(sha(actual), file.sha256, file.path);
  }
});

test("v2.5 changes one lock binding while preserving domain rules report rights expert and authority semantics", async () => {
  const [basis, loaded] = await fixture();
  const before = basis.manifest, after = loaded.manifest, normalized = clone(after);
  const changed = [];
  for (let i = 0; i < before.components.length; i++) {
    const oldComponent = before.components[i], next = after.components[i];
    assert.equal(next.componentId, oldComponent.componentId);
    assert.equal(next.files.length, oldComponent.files.length);
    for (let n = 0; n < oldComponent.files.length; n++) {
      if (JSON.stringify(next.files[n]) !== JSON.stringify(oldComponent.files[n])) changed.push(next.files[n].path);
    }
    if (next.componentId === "execution_rules") normalized.components[i] = clone(oldComponent);
    else assert.deepEqual(next, oldComponent);
  }
  assert.deepEqual(changed, ["package-lock.json"]);
  assert.deepEqual(after.domainIdentity, before.domainIdentity);
  assert.equal(after.authorityBoundary.ownerAcceptanceForReleaseCandidateEstablished, false);
  for (const field of ["schemaVersion", "manifestRevision", "manifestId", "createdAt", "lineage", "evidenceLedger", "manifestDigest"]) normalized[field] = clone(before[field]);
  assert.deepEqual(normalized, before);
  assert.deepEqual(after.lineage.reboundComponentIds, ["execution_rules"]);
  assert.equal(after.lineage.supersedesForCurrentMachineIdentityOnly.rawSha256, basis.artifact.sha256);
});

test("v2.5 rejects re-signed authority promotion rules changes and replayed old lock identity", async () => {
  const [basis, loaded] = await fixture();
  for (const mutate of [
    value => { value.authorityBoundary.releaseReady = true; },
    value => { value.authorityBoundary.expertClaimsAuthorized = true; },
    value => { value.gateState.independentExpertReviewsVerified = 1; },
    value => { value.domainIdentity.rulesetDigest = "0".repeat(64); },
    value => { value.components.find(c => c.componentId === "execution_rules").files = clone(basis.manifest.components.find(c => c.componentId === "execution_rules").files); },
    value => { value.components[0].files[0].rawBytes++; }
  ]) {
    const altered = clone(loaded.manifest); mutate(altered);
    altered.manifestDigest = computeBaziDomainReleaseManifestV25Digest(altered);
    assert.throws(() => assertBaziDomainReleaseManifestV25SemanticIdentity(altered, basis), code("MANIFEST_MISMATCH"));
  }
});

test("v2.5 rejects unverified clones and incorrect self digests and preserves all external gates", async () => {
  const [basis, loaded] = await fixture();
  assert.throws(() => buildBaziDomainReleaseManifestV25FromHistoricalBasis(clone(basis)), code("HISTORICAL_BASIS_BRAND_REQUIRED"));
  assert.equal(isVerifiedBaziDomainReleaseManifestV25(loaded), true);
  assert.equal(isVerifiedBaziDomainReleaseManifestV25(clone(loaded)), false);
  assert.throws(() => getBaziDomainReleaseManifestV25Summary(clone(loaded)), code("MANIFEST_V25_BRAND_REQUIRED"));
  const changed = clone(loaded.manifest); changed.manifestDigest = "0".repeat(64);
  assert.throws(() => assertBaziDomainReleaseManifestV25SemanticIdentity(changed, basis), code("MANIFEST_DIGEST_INVALID"));
  const summary = getBaziDomainReleaseManifestV25Summary(loaded);
  assert.equal(summary.reboundComponentFileCount, 1); assert.equal(summary.unchangedComponentFileCount, 27);
  assert.equal(summary.repositorySelectionEstablished, false); assert.equal(summary.historicalManifestV24BrandCurrent, false);
  assert.deepEqual(summary.authorityBoundary, basis.manifest.authorityBoundary);
  assert.deepEqual(summary.gateState, basis.manifest.gateState);
  assert.deepEqual(summary.releaseGovernance, basis.manifest.releaseGovernance);
});

test("v2.5 still rejects the original dependency lock in a separate historical workspace", async t => {
  const historical = await createBaziDomainManifestV24HistoricalInputs();
  t.after(() => historical.cleanup());
  await writeFile(path.join(historical.root, BAZI_DOMAIN_RELEASE_MANIFEST_V2_5_RELATIVE_PATH),
    await readFile(path.join(ROOT, BAZI_DOMAIN_RELEASE_MANIFEST_V2_5_RELATIVE_PATH)));
  await assert.rejects(loadBaziDomainReleaseManifestV25(historical.root), code("COMPONENT_FILE_IDENTITY_DRIFT"));
  assert.equal(isVerifiedBaziDomainReleaseManifestV24(await loadBaziDomainReleaseManifestV24(historical.root)), true);
});
