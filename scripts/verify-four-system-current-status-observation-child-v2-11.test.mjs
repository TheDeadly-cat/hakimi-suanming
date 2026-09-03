import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCurrentFourSystemCurrentStatusObservationChildV211,
  computeFourSystemCurrentStatusObservationChildV211Digest,
  fourSystemCurrentStatusObservationChildV211TestOnly,
  loadFourSystemCurrentStatusObservationChildV211
} from "./four-system-current-status-observation-child-v2-11-lib.mjs";
import { loadFourSystemCurrentStatusObservationChildV210 } from
  "./four-system-current-status-observation-child-v2-10-lib.mjs";

test("v2.11 changes only Western endpoints/status while preserving 0/32 and all authority false", async () => {
  const child = await loadFourSystemCurrentStatusObservationChildV211(process.cwd());
  const parent = await loadFourSystemCurrentStatusObservationChildV210(process.cwd());
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.ok(Object.values(child.authorityBoundary).every((value) => value === false));
  for (const id of ["bazi", "ziwei", "vedic"]) {
    assert.equal(fourSystemCurrentStatusObservationChildV211TestOnly.compact(
      child.systems.find((entry) => entry.contractSystemId === id)),
    fourSystemCurrentStatusObservationChildV211TestOnly.compact(
      parent.systems.find((entry) => entry.contractSystemId === id)));
  }
  const western = child.systems.find((entry) => entry.contractSystemId === "western");
  assert.equal(western.currentEvidence.endpoints.length, 4);
  assert.equal(western.gateSummary.bindingFrozenVerified, 0);
  assert.equal(western.gateSummary.independentExpertReviewsVerified, 0);
});

test("persisted v2.11 equals current projection and rejects authority promotion", async () => {
  const child = await loadFourSystemCurrentStatusObservationChildV211(process.cwd());
  const current = await buildCurrentFourSystemCurrentStatusObservationChildV211(process.cwd());
  assert.equal(fourSystemCurrentStatusObservationChildV211TestOnly.compact(child),
    fourSystemCurrentStatusObservationChildV211TestOnly.compact(current));
  const promoted = structuredClone(current);
  promoted.authorityBoundary.releaseReady = true;
  promoted.childDigest = computeFourSystemCurrentStatusObservationChildV211Digest(promoted);
  assert.throws(() => fourSystemCurrentStatusObservationChildV211TestOnly.assertBoundary(promoted, child),
    /AUTHORITY_BOUNDARY_INVALID/u);
});
