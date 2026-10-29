import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
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
import { createBaziDomainManifestV25HistoricalInputs } from "./bazi-dependency-predecessor.test-fixture.mjs";
const historicalInputs = await createBaziDomainManifestV25HistoricalInputs();
const ROOT = historicalInputs.root;
after(() => historicalInputs.cleanup());
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

// The dependency successor is a new current identity. The preceding tests run
// the unchanged v2.5 loader only against its exact archived inputs.
const currentRoot = path.resolve(import.meta.dirname, "..");
const successor = await import("./bazi-dependency-identity-successor-lib.mjs");
const predecessorPaths = [
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.5.0.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
  "content/bazi-strength-expert-review-packet.current.json"
];

test("v2.6 binds all 28 actual files and only three changed sources plus readiness", async () => {
  const result = await successor.loadBaziDependencyDomainManifestV26(currentRoot);
  const summary = successor.getBaziDependencyDomainManifestV26Summary(result);
  assert.equal(summary.uniqueComponentFileIdentitiesVerified, 28);
  assert.equal(summary.historicalManifestV25BrandCurrent, false);
  assert.equal(summary.historicalFullLoaderReexecuted, false);
  assert.equal(summary.reboundSourceFileCount, 3);
  const old = JSON.parse(await readFile(path.join(currentRoot, predecessorPaths[0]), "utf8"));
  // Independent original-contract crosswalk: execution_rules has no rulesetDigest slot.
  for (const [field, id] of [
    ["rulesetDigest", "interpretation_rules"], ["inputPolicyDigest", "input_policy"],
    ["factSchemaDigest", "fact_contract"], ["reportContractDigest", "report_contract"],
    ["sourceBundleDigest", "source_bundle"], ["rightsBundleDigest", "rights_bundle"],
    ["expertReviewBundleDigest", "expert_review_bundle"],
    ["expertReviewPreconditionBundleDigest", "expert_review_preconditions"],
    ["highRiskPolicyDigest", "high_risk_policy"]
  ]) {
    assert.equal(result.manifest.domainIdentity[field], result.manifest.components.find(c => c.componentId === id).digest, field);
    assert.equal(old.domainIdentity[field], old.components.find(c => c.componentId === id).digest, "original " + field);
  }
  assert.deepEqual(result.manifest.components.find(c => c.componentId === "interpretation_rules"),
    old.components.find(c => c.componentId === "interpretation_rules"));
  assert.deepEqual(result.manifest.verifiedMechanicalContexts.slice(1), old.verifiedMechanicalContexts.slice(1));
  const normalizedIdentity = clone(result.manifest.domainIdentity);
  for (const field of ["inputPolicyDigest", "factSchemaDigest", "reportContractDigest", "sourceBundleDigest", "sourceBundleVersion"])
    normalizedIdentity[field] = old.domainIdentity[field];
  assert.deepEqual(normalizedIdentity, old.domainIdentity);
  const changed = new Set();
  for (let c = 0; c < old.components.length; c++) {
    for (let f = 0; f < old.components[c].files.length; f++) {
      const before = old.components[c].files[f], after = result.manifest.components[c].files[f];
      if (JSON.stringify(before) !== JSON.stringify(after)) changed.add(before.path);
    }
  }
  assert.deepEqual([...changed].sort(), ["package-lock.json", "packages/contracts/src/index.ts",
    "packages/research-export/src/single-chart-report.ts", predecessorPaths[1]].sort());
  assert.deepEqual(result.manifest.authorityBoundary, old.authorityBoundary);
  assert.deepEqual(result.manifest.releaseGovernance, old.releaseGovernance);
  assert.equal(result.manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(result.manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(result.manifest.gateState.bindingReadinessV110MechanicallyVerified, true);
  for (const component of result.manifest.components) {
    for (const file of component.files) {
      const bytes = await readFile(path.join(currentRoot, file.path));
      assert.equal(bytes.length, file.rawBytes); assert.equal(sha(bytes), file.sha256);
    }
  }
  assert.throws(() => successor.getBaziDependencyDomainManifestV26Summary(clone(result)), /MANIFEST_V26_BRAND_REQUIRED/);
});

test("readiness v1.10 preserves all 12 bindings, all zero authority and 10 unaffected basis files", async () => {
  const result = await successor.loadBaziDependencyReadinessV110(currentRoot);
  const old = JSON.parse(await readFile(path.join(currentRoot, predecessorPaths[1]), "utf8"));
  assert.equal(successor.isVerifiedBaziDependencyReadinessV110(result), true);
  assert.equal(successor.isVerifiedBaziDependencyReadinessV110(clone(result)), false);
  assert.deepEqual(result.ledger.bindings, old.bindings);
  assert.deepEqual(result.ledger.gateSummary, old.gateSummary);
  assert.deepEqual(result.ledger.releaseGovernance, old.releaseGovernance);
  assert.deepEqual(result.ledger.defaultClosureRequirements, old.defaultClosureRequirements);
  assert.equal(result.ledger.basisArtifacts.length, 11);
  const changes = result.ledger.basisArtifacts.filter((f, i) => !isDeepStrictEqual(f, old.basisArtifacts[i]));
  assert.deepEqual(changes.map(f => f.path), ["packages/contracts/src/index.ts"]);
  assert.equal(result.currentBasisFilesVerified, 11);
});

test("expert v1.7 changes only the contracts lock and session identity; it cannot manufacture qualifications", async () => {
  const result = await successor.verifyBaziDependencyExpertPacketV17(currentRoot);
  const old = JSON.parse(await readFile(path.join(currentRoot, predecessorPaths[2]), "utf8"));
  const normalized = clone(result.packet);
  for (const key of ["packetId", "createdAt", "packetDigest"]) normalized[key] = old[key];
  const changed = normalized.artifactLocks.filter((f, i) => !isDeepStrictEqual(f, old.artifactLocks[i]));
  assert.deepEqual(changed.map(f => f.artifactId), ["contracts"]);
  normalized.artifactLocks = old.artifactLocks;
  assert.deepEqual(normalized, old);
  assert.equal(result.packet.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(result.packet.gateSummary.expertReviewBundleComplete, false);
  assert(result.packet.reviewerSlots.every(s => s.status === "vacant"));
});

async function successorFixture(t) {
  const historical = await createBaziDomainManifestV25HistoricalInputs();
  t.after(() => historical.cleanup());
  for (const file of successor.BAZI_DEPENDENCY_REBOUND_FILES) {
    await writeFile(path.join(historical.root, file.path), await readFile(path.join(currentRoot, file.path)));
  }
  return historical.root;
}

test("successor rejects old current-source replay and unlisted actual source drift", async t => {
  const temp = await successorFixture(t);
  const good = await successor.loadBaziDependencyDomainManifestV26(temp);
  assert.equal(good.manifestId, "hakimi.bazi.single-chart-report.domain-release-manifest/2.6.0");
  const actual = await readFile(path.join(temp, "packages/contracts/src/index.ts"));
  await writeFile(path.join(temp, "packages/contracts/src/index.ts"), Buffer.concat([actual, Buffer.from("\n")]));
  await assert.rejects(successor.loadBaziDependencyReadinessV110(temp), /RAW_IDENTITY_MISMATCH/);
  await assert.rejects(successor.verifyBaziDependencyExpertPacketV17(temp), /CURRENT_EXPERT_ARTIFACT_DRIFT/);
  await writeFile(path.join(temp, "packages/contracts/src/index.ts"), actual);
  await writeFile(path.join(temp, "package-lock.json"), await readFile(path.join(ROOT, "package-lock.json")));
  await assert.rejects(successor.loadBaziDependencyDomainManifestV26(temp), /COMPONENT_FILE_IDENTITY_DRIFT/);
});

test("successor rejects re-signed authority and a re-signed changed binding", async t => {
  const temp = await successorFixture(t);
  const relative = successor.BAZI_DEPENDENCY_SUCCESSOR_PATHS.readiness;
  const original = await readFile(path.join(temp, relative), "utf8");
  const value = JSON.parse(original);
  value.gateSummary.bindingFrozenVerified = 1;
  const { computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest } = await import("./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs");
  value.ledgerDigest = computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(value);
  await writeFile(path.join(temp, relative), successor.serializeBaziDependencySuccessor(value));
  await assert.rejects(successor.loadBaziDependencyReadinessV110(temp), /RAW_IDENTITY_MISMATCH/);
  await writeFile(path.join(temp, relative), original);
  const domainPath = successor.BAZI_DEPENDENCY_SUCCESSOR_PATHS.domain;
  const domain = JSON.parse(await readFile(path.join(temp, domainPath), "utf8"));
  domain.authorityBoundary.expertClaimsAuthorized = true;
  domain.manifestDigest = computeBaziDomainReleaseManifestV25Digest(domain);
  await writeFile(path.join(temp, domainPath), successor.serializeBaziDependencySuccessor(domain));
  await assert.rejects(successor.loadBaziDependencyDomainManifestV26(temp), /RAW_IDENTITY_MISMATCH/);
});
