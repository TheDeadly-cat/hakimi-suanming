import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyWesternV11ProjectCredential
} from "./run-western-civil-time-same-artifact-browser-observation-v1-1.mjs";
import {
  buildExpectedWesternSameArtifactV11Candidate,
  isVerifiedWesternSameArtifactV11Candidate,
  loadWesternSameArtifactV11Candidate,
  verifyWesternSameArtifactV11CandidateObject
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

test("run-scoped credential classifier rejects missing, stale, and cross-project values", () => {
  const expected = { chrome: "a".repeat(64), msedge: "b".repeat(64) };
  assert.equal(classifyWesternV11ProjectCredential(undefined, undefined, expected), "missing");
  assert.equal(classifyWesternV11ProjectCredential("safari", "a".repeat(64), expected), "invalid_project");
  assert.equal(classifyWesternV11ProjectCredential("chrome", "b".repeat(64), expected), "cross_project");
  assert.equal(classifyWesternV11ProjectCredential("chrome", "c".repeat(64), expected), "replayed_or_stale");
  assert.equal(classifyWesternV11ProjectCredential("chrome", "a".repeat(64), expected), "accepted");
});

test("persisted v1.1 candidate is current, privately branded, and keeps all authority false", () => {
  const candidate = loadWesternSameArtifactV11Candidate(process.cwd());
  assert.equal(isVerifiedWesternSameArtifactV11Candidate(candidate), true);
  assert.equal(candidate.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(candidate.gateSummary.bindingFrozenVerified, 0);
  assert.equal(candidate.gateSummary.independentExpertReviewsVerified, 0);
  assert.ok(Object.values(candidate.authorityBoundary).every((value) => value === false));
});

test("matrix identity/product mismatch and authority promotion fail closed", () => {
  const current = loadWesternSameArtifactV11Candidate(process.cwd());
  const badIdentity = structuredClone(current.runtimeObservation);
  badIdentity.playwrightSummary.matrixBrowserIdentities[0].product = "Chrome/999.0.0.1";
  assert.throws(() => buildExpectedWesternSameArtifactV11Candidate(process.cwd(), badIdentity),
    /PROBE_MATRIX_IDENTITY_MISMATCH/u);
  const promoted = structuredClone(current);
  promoted.authorityBoundary.releaseReady = true;
  assert.throws(() => verifyWesternSameArtifactV11CandidateObject(process.cwd(), promoted),
    /CANDIDATE_CURRENT_REBUILD_MISMATCH/u);
});

test("tree digest and exact served-body path set are independently recomputed", () => {
  const current = loadWesternSameArtifactV11Candidate(process.cwd());
  const badTree = structuredClone(current.runtimeObservation);
  badTree.outputTreeBefore.treeDigest = "f".repeat(64);
  badTree.outputTreeAfter.treeDigest = "f".repeat(64);
  badTree.server.outputTreeDigest = "f".repeat(64);
  assert.throws(() => buildExpectedWesternSameArtifactV11Candidate(process.cwd(), badTree),
    /TREE_PATH_OR_DIGEST_INVALID/u);
  const badLedger = structuredClone(current.runtimeObservation);
  badLedger.server.servedArtifactsByProject[0].files[0].path =
    badLedger.outputTreeBefore.files.find((entry) => entry.path.endsWith(".map")).path;
  assert.throws(() => buildExpectedWesternSameArtifactV11Candidate(process.cwd(), badLedger),
    /LEDGER_FILE_INVALID|LEDGER_PATH_SET_INVALID/u);
});
