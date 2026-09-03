import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCurrentWesternIndependentEngineeringManifestV4,
  computeWesternIndependentEngineeringManifestV4Digest,
  loadWesternIndependentEngineeringManifestV4,
  westernIndependentEngineeringManifestV4TestOnly
} from "./western-independent-engineering-manifest-v4-lib.mjs";

test("persisted manifest v4 equals current private-brand projection and remains zero admission", async () => {
  const result = await loadWesternIndependentEngineeringManifestV4(process.cwd());
  const current = await buildCurrentWesternIndependentEngineeringManifestV4(process.cwd());
  assert.equal(westernIndependentEngineeringManifestV4TestOnly.compact(result.manifest),
    westernIndependentEngineeringManifestV4TestOnly.compact(current));
  assert.equal(result.manifest.gateState.admissionGatesSatisfied, 0);
  assert.equal(result.manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(result.manifest.gateState.independentExpertReviewsVerified, 0);
  assert.ok(Object.values(result.manifest.authorityBoundary).every((value) => value === false));
});

test("manifest v4 rejects authority and selected-path digest promotion", async () => {
  const current = await buildCurrentWesternIndependentEngineeringManifestV4(process.cwd());
  const promoted = structuredClone(current);
  promoted.authorityBoundary.publicReleaseAuthorized = true;
  promoted.manifestDigest = computeWesternIndependentEngineeringManifestV4Digest(promoted);
  assert.throws(() => westernIndependentEngineeringManifestV4TestOnly.assertBoundary(promoted),
    /AUTHORITY_BOUNDARY_INVALID/u);
  const drift = structuredClone(current);
  drift.selectedPathMachineIdentity.selectedPathDigest = "0".repeat(64);
  drift.manifestDigest = computeWesternIndependentEngineeringManifestV4Digest(drift);
  assert.throws(() => westernIndependentEngineeringManifestV4TestOnly.assertBoundary(drift),
    /SELECTED_PATH_SET_INVALID/u);
});
