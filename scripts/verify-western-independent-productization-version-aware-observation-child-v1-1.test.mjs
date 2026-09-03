import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  link,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH,
  buildCurrentWesternProductizationVersionAwareObservationChildV11,
  buildExpectedWesternProductizationVersionAwareObservationChildV11,
  canonicalPrettyStringifyWesternProductizationVersionAwareObservationChildV11,
  computeWesternProductizationVersionAwareObservationChildV11Digest,
  isVerifiedWesternProductizationVersionAwareObservationChildV11,
  loadWesternProductizationVersionAwareObservationChildV11,
  parseWesternProductizationVersionAwareObservationChildV11JsonBytes,
  verifyWesternProductizationVersionAwareObservationChildV11Object,
  westernProductizationVersionAwareObservationChildV11TestOnly as testOnly
} from "./western-independent-productization-version-aware-observation-child-v1-1-lib.mjs";
import {
  loadWesternProductizationVersionAwareObservationCandidate
} from "./western-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  loadWesternSourceBindingRequirementsSuccessorV12
} from "./western-source-binding-requirements-successor-v1.2-lib.mjs";
import {
  loadFourSystemCurrentObservationRegistryV2
} from "./four-system-current-observation-registry-v2-lib.mjs";

const WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.candidateDigest = computeWesternProductizationVersionAwareObservationChildV11Digest(value);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("current v1.1 child loads with a private brand and exact current identities", async () => {
  const [built, loaded] = await Promise.all([
    buildCurrentWesternProductizationVersionAwareObservationChildV11(WORKSPACE_ROOT),
    loadWesternProductizationVersionAwareObservationChildV11(WORKSPACE_ROOT)
  ]);
  const expected = buildExpectedWesternProductizationVersionAwareObservationChildV11();
  assert.deepEqual(built, expected);
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationChildV11(loaded), true);
  assert.equal(loaded.candidateDigest, expected.candidateDigest);
  assert.equal(loaded.currentContractArtifactCount, 2);
  assert.equal(loaded.predecessorStillCurrent, false);
  assert.equal(loaded.currentObservationRegistryMechanicallyCurrentForWestern, false);
  assert.equal(loaded.upstreamPrivateBrandCount, 0);
});

test("persisted candidate has the frozen raw identity and canonical LF bytes", async () => {
  const absolute = path.join(
    WORKSPACE_ROOT,
    ...WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH.split("/")
  );
  const bytes = await readFile(absolute);
  assert.equal(bytes.byteLength, testOnly.EXPECTED_PERSISTED.bytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.sha256);
  const parsed = parseWesternProductizationVersionAwareObservationChildV11JsonBytes(bytes);
  assert.equal(
    bytes.toString("utf8"),
    canonicalPrettyStringifyWesternProductizationVersionAwareObservationChildV11(parsed)
  );
  assert.doesNotThrow(() => testOnly.assertCanonicalCandidateBytes(bytes, parsed));
});

test("all authority, admission, identity and mutation boundaries remain red", () => {
  const candidate = buildExpectedWesternProductizationVersionAwareObservationChildV11();
  assert.equal(candidate.activeAdmissionEffect, "none");
  assert.equal(Object.values(candidate.authorityBoundary).every((value) => value === false), true);
  assert.deepEqual(JSON.parse(JSON.stringify(candidate.gateSummary)), {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 28,
    expertReviewBundleComplete: false,
    highRiskPolicyBound: false,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    releaseEvidenceComplete: false,
    requirementsUniverseClosed: false,
    rightsBundleComplete: false,
    sourceBundleComplete: false
  });
  assert.equal(candidate.productBoundary.releaseIdentity, null);
  assert.equal(candidate.productBoundary.targetSchema, null);
  assert.equal(candidate.productBoundary.migrationId, null);
  assert.equal(candidate.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(candidate.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(candidate.projectReleaseGovernanceContext.inheritedByWesternProductIdentity, false);
  assert.equal(candidate.observationBoundary.mutationEpochAvailable, false);
  assert.equal(candidate.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(candidate.observationBoundary.intervalMutationExcluded, false);
  assert.equal(candidate.observationBoundary.abaExcluded, false);
});

test("the child records rather than conceals the three existing current-verifier failures", async () => {
  await assert.rejects(
    loadWesternProductizationVersionAwareObservationCandidate(WORKSPACE_ROOT),
    (error) => error?.code === "ARTIFACT_DRIFT"
  );
  await assert.rejects(
    loadWesternSourceBindingRequirementsSuccessorV12(WORKSPACE_ROOT),
    (error) => error?.code === "LEDGER_MISMATCH"
  );
  await assert.rejects(
    loadFourSystemCurrentObservationRegistryV2(WORKSPACE_ROOT),
    (error) => error?.code === "ARTIFACT_DRIFT"
  );
});

test("self-resigned authority and product promotions are rejected", () => {
  const cases = [
    (candidate) => { candidate.authorityBoundary.releaseReady = true; },
    (candidate) => { candidate.authorityBoundary.contentTruthEstablished = true; },
    (candidate) => { candidate.gateSummary.admissionGatesSatisfied = 1; },
    (candidate) => { candidate.gateSummary.bindingFrozenVerified = 1; },
    (candidate) => { candidate.gateSummary.independentExpertReviewsVerified = 1; },
    (candidate) => { candidate.productBoundary.targetSchema = 13; },
    (candidate) => { candidate.productBoundary.releaseIdentity = "legacy-v13"; },
    (candidate) => { candidate.observationBoundary.mutationEpochAvailable = true; },
    (candidate) => { candidate.versionBoundary.formalSupersessionEffect = "active"; }
  ];
  for (const mutate of cases) {
    const candidate = clone(buildExpectedWesternProductizationVersionAwareObservationChildV11());
    mutate(candidate);
    resign(candidate);
    assert.throws(
      () => verifyWesternProductizationVersionAwareObservationChildV11Object(candidate),
      (error) => error?.code === "CANDIDATE_SEMANTICS_MISMATCH"
    );
  }
});

test("self-resigned path, role, raw identity and registry substitutions are rejected", () => {
  const cases = [
    (candidate) => { candidate.artifactBindings[5].path = "content/system-admission/alias.json"; },
    (candidate) => { candidate.artifactBindings[0].role = candidate.artifactBindings[1].role; },
    (candidate) => { candidate.artifactBindings[3].sha256 = "0".repeat(64); },
    (candidate) => { candidate.currentContractObservation.currentDirectArtifacts[0].bytes += 1; },
    (candidate) => { candidate.registryObservation.registryBindings[1].sha256 = "f".repeat(64); },
    (candidate) => { candidate.upstreamVerification.sourceRequirementsV12PrivateBrandVerified = true; },
    (candidate) => { candidate.upstreamVerification.upstreamCapabilityBrandCount = 2; }
  ];
  for (const mutate of cases) {
    const candidate = clone(buildExpectedWesternProductizationVersionAwareObservationChildV11());
    mutate(candidate);
    resign(candidate);
    assert.throws(
      () => verifyWesternProductizationVersionAwareObservationChildV11Object(candidate),
      (error) => error?.code === "CANDIDATE_SEMANTICS_MISMATCH"
    );
  }
});

test("civil canonical-zone promotion and bound-path substitution fail after self-resigning", async () => {
  const binding = testOnly.ARTIFACT_BINDINGS[5];
  const bytes = await readFile(path.join(WORKSPACE_ROOT, ...binding.path.split("/")));
  const original = JSON.parse(bytes.toString("utf8"));

  const promoted = clone(original);
  promoted.authorityBoundary.canonicalZoneIdentityEstablished = true;
  promoted.observationDigest = testOnly.computeCivilDigest(promoted);
  const promotedBinding = { ...binding, semanticDigest: promoted.observationDigest };
  assert.throws(
    () => testOnly.verifyCivilCandidateMaterial(promoted, promotedBinding),
    (error) => error?.code === "AUTHORITY_PROMOTION_FORBIDDEN"
  );

  const moved = clone(original);
  const contractBinding = moved.artifactBindings.find(
    (entry) => entry.path === "packages/western-astrology-contracts-draft/src/civil-input.ts"
  );
  contractBinding.path = "packages/western-astrology-contracts-draft/src/civil-input-alias.ts";
  moved.observationDigest = testOnly.computeCivilDigest(moved);
  const movedBinding = { ...binding, semanticDigest: moved.observationDigest };
  assert.throws(
    () => testOnly.verifyCivilCandidateMaterial(moved, movedBinding),
    (error) => error?.code === "CIVIL_TIME_CONTRACT_BINDING_MISSING"
  );
});

test("duplicate keys, BOM, CRLF materialization and non-passive values fail closed", async () => {
  const absolute = path.join(
    WORKSPACE_ROOT,
    ...WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH.split("/")
  );
  const bytes = await readFile(absolute);
  assert.throws(
    () => parseWesternProductizationVersionAwareObservationChildV11JsonBytes(
      Buffer.from('{"schemaVersion":"1.1.0","schemaVersion":"1.1.0"}\n')
    )
  );
  assert.throws(
    () => parseWesternProductizationVersionAwareObservationChildV11JsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes])
    )
  );
  const crlf = Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n"), "utf8");
  const crlfParsed = parseWesternProductizationVersionAwareObservationChildV11JsonBytes(crlf);
  assert.throws(
    () => testOnly.assertCanonicalCandidateBytes(crlf, crlfParsed),
    (error) => error?.code === "CANDIDATE_CANONICAL_BYTES_DRIFT"
  );
  assert.throws(
    () => verifyWesternProductizationVersionAwareObservationChildV11Object(new Proxy({}, {})),
    (error) => error?.code === "NON_PASSIVE_JSON"
  );
  const accessor = clone(buildExpectedWesternProductizationVersionAwareObservationChildV11());
  Object.defineProperty(accessor, "releaseReady", { enumerable: true, get: () => true });
  assert.throws(() => verifyWesternProductizationVersionAwareObservationChildV11Object(accessor));
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => testOnly.capturePassiveJson(sparse));
  const shared = {};
  assert.throws(() => testOnly.capturePassiveJson({ left: shared, right: shared }));
  assert.throws(() => testOnly.capturePassiveJson({ value: -0 }));
});

test("held-handle reader rejects hardlink and symlink endpoints", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "western-v11-endpoint-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "source.json"), "{}\n", "utf8");
  await link(path.join(root, "source.json"), path.join(root, "hardlink.json"));
  await assert.rejects(
    testOnly.readStableWorkspaceArtifact(root, "hardlink.json")
  );
  try {
    await symlink(path.join(root, "source.json"), path.join(root, "symlink.json"), "file");
    await assert.rejects(
      testOnly.readStableWorkspaceArtifact(root, "symlink.json")
    );
  } catch (error) {
    if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
  }
});

test("same-length raw identity drift and fixed-path candidate replacement fail", () => {
  const source = testOnly.CURRENT_CONTRACT_ARTIFACTS[0];
  assert.throws(
    () => testOnly.assertRawIdentity({
      path: source.path,
      rawBytes: source.bytes,
      rawSha256: "0".repeat(64)
    }, source, "same-length drift"),
    (error) => error?.code === "UPSTREAM_RAW_IDENTITY_DRIFT"
  );
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.bytes,
      rawSha256: "f".repeat(64)
    }),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
});

test("verified results are frozen, and clones or spreads do not carry the brand", async () => {
  const result = await loadWesternProductizationVersionAwareObservationChildV11(WORKSPACE_ROOT);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationChildV11(result), true);
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationChildV11({ ...result }), false);
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationChildV11(clone(result)), false);
  assert.throws(() => {
    result.releaseReady = true;
  }, TypeError);
  assert.equal(result.releaseReady, false);
});

test("post-import inherited setter and ambient Array.push pollution cannot mint authority", async () => {
  const originalPush = Array.prototype.push;
  const originalReleaseReady = Object.getOwnPropertyDescriptor(Object.prototype, "releaseReady");
  let result;
  try {
    Object.defineProperty(Object.prototype, "releaseReady", {
      configurable: true,
      set() {
        throw new Error("inherited releaseReady setter invoked");
      }
    });
    result = await loadWesternProductizationVersionAwareObservationChildV11(WORKSPACE_ROOT);
  } finally {
    if (originalReleaseReady) {
      Object.defineProperty(Object.prototype, "releaseReady", originalReleaseReady);
    } else {
      delete Object.prototype.releaseReady;
    }
  }
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationChildV11(result), true);
  assert.equal(result.releaseReady, false);

  const candidate = buildExpectedWesternProductizationVersionAwareObservationChildV11();
  let verified;
  try {
    Array.prototype.push = function poisonedPush() {
      throw new Error("ambient Array.push invoked");
    };
    verified = verifyWesternProductizationVersionAwareObservationChildV11Object(candidate);
  } finally {
    Array.prototype.push = originalPush;
  }
  assert.equal(verified.candidateDigest, candidate.candidateDigest);
});

test("CLI succeeds only without operands", () => {
  const cli = path.join(
    WORKSPACE_ROOT,
    "scripts",
    "verify-western-independent-productization-version-aware-observation-child-v1-1.mjs"
  );
  const success = spawnSync(process.execPath, [cli], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8"
  });
  assert.equal(success.status, 0, success.stderr);
  const payload = JSON.parse(success.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.predecessorStillCurrent, false);
  assert.equal(payload.releaseReady, false);

  const rejected = spawnSync(process.execPath, [cli, "unexpected"], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8"
  });
  assert.equal(rejected.status, 1);
  assert.equal(JSON.parse(rejected.stderr).code, "CLI_OPERANDS_FORBIDDEN");
});

test("new v1.1 implementation contains no dynamic import expression", async () => {
  for (const fileName of [
    "western-independent-productization-version-aware-observation-child-v1-1-lib.mjs",
    "verify-western-independent-productization-version-aware-observation-child-v1-1.mjs",
    "verify-western-independent-productization-version-aware-observation-child-v1-1.test.mjs"
  ]) {
    const source = await readFile(path.join(WORKSPACE_ROOT, "scripts", fileName), "utf8");
    assert.equal(/\bimport\s*\(/u.test(source), false, fileName);
  }
});
