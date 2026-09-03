import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_14_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV214,
  computeFourSystemCurrentStatusObservationChildV214Digest,
  fourSystemCurrentStatusObservationChildV214TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV214Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV214,
  loadFourSystemCurrentStatusObservationChildV214,
  serializeFourSystemCurrentStatusObservationChildV214
} from "./four-system-current-status-observation-child-v2-14-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV213
} from "./four-system-current-status-observation-child-v2-13-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(
  ROOT,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-14.mjs"
);
const loadedPromise = loadFourSystemCurrentStatusObservationChildV214(ROOT);
const builtPromise = buildCurrentFourSystemCurrentStatusObservationChildV214(ROOT);
const parentPromise = loadFourSystemCurrentStatusObservationChildV213(ROOT);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  value.childDigest = computeFourSystemCurrentStatusObservationChildV214Digest(value);
  return value;
}

test("fixed-path v2.14 loader verifies the exact persisted child and private brand", async () => {
  const child = await loadedPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV214(child), true);
  assert.equal(Object.isFrozen(child), true);
  assert.equal(Object.isFrozen(child.systems), true);
  assert.equal(child.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
});

test("fresh projection exactly matches canonical persisted v2.14 bytes", async () => {
  const built = await builtPromise;
  const bytes = await readFile(path.join(
    ROOT,
    ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_14_RELATIVE_PATH.split("/")
  ));
  assert.equal(serializeFourSystemCurrentStatusObservationChildV214(built), bytes.toString("utf8"));
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.deepEqual(built, JSON.parse(bytes.toString("utf8")));
});

test("Bazi, Ziwei, and Vedic are canonical exact v2.13 copies", async () => {
  const [child, parent] = await Promise.all([loadedPromise, parentPromise]);
  for (const id of ["bazi", "ziwei", "vedic"]) {
    assert.deepEqual(
      child.systems.find((entry) => entry.contractSystemId === id),
      parent.systems.find((entry) => entry.contractSystemId === id)
    );
  }
});

test("Western v4 endpoint is replaced exactly once by recursive-root v5", async () => {
  const child = await loadedPromise;
  const western = child.systems.find((entry) => entry.contractSystemId === "western");
  assert.equal(western.currentEvidence.endpoints.length, 4);
  assert.equal(western.currentEvidence.endpoints.some((entry) =>
    entry.path.endsWith("western-astrology.engineering-draft.v0.1.0.manifest.v4.json")), false);
  const endpoints = western.currentEvidence.endpoints.filter((entry) =>
    entry.path === testOnly.WESTERN_V5_IDENTITY.path);
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].rawBytes, 43_571);
  assert.equal(endpoints[0].rawSha256,
    "8dfe4a25fb4194d8e9e7b53f8d5b786813b11db9a7ed11e8a88c4f96aad41904");
  assert.equal(endpoints[0].semanticDigest,
    "3617e2bb812e64ea6a79c5a9c6660344e09ed85f5869ff1528415cab13f434b4");
  assert.equal(western.currentEvidence.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(western.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
});

test("Western browser evidence is byte-identical to v2.13 and was not rerun", async () => {
  const [child, parent] = await Promise.all([loadedPromise, parentPromise]);
  const western = child.systems.find((entry) => entry.contractSystemId === "western");
  const previous = parent.systems.find((entry) => entry.contractSystemId === "western");
  assert.equal(western.currentEvidence.browserRuntimeEvidence,
    previous.currentEvidence.browserRuntimeEvidence);
  assert.equal(child.lineage.westernBrowserEvidencePreservedWithoutRerun, true);
  assert.equal(child.lineage.westernEndpointCountBefore, 4);
  assert.equal(child.lineage.westernEndpointCountAfter, 4);
});

test("aggregate remains 0/32 and Western remains 0/28 and 0/2", async () => {
  const child = await loadedPromise;
  const western = child.systems.find((entry) => entry.contractSystemId === "western");
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(western.gateSummary.admissionGatesRequired, 8);
  assert.equal(western.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(western.gateSummary.bindingRequired, 28);
  assert.equal(western.gateSummary.bindingFrozenVerified, 0);
  assert.equal(western.gateSummary.independentExpertsRequired, 2);
  assert.equal(western.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(child.currentStatusSummary.systemsFormallyAdmitted, 0);
  assert.equal(child.currentStatusSummary.systemsReleaseReady, 0);
  assert.equal(child.currentStatusSummary.systemsPublicReleaseAuthorized, 0);
});

test("legacy-v13 context and all mutation epoch boundaries remain red", async () => {
  const child = await loadedPromise;
  assert.equal(child.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(child.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(child.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(child.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13, false);
  assert.equal(child.projectReleaseGovernanceContext.mutationEpochReceipt, null);
  assert.equal(child.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(child.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(child.observationBoundary.abaExcluded, false);
});

test("aggregate and all four systems preserve false authority ledgers", async () => {
  const child = await loadedPromise;
  assert.ok(Object.values(child.authorityBoundary).every((entry) => entry === false));
  for (const system of child.systems) {
    assert.ok(Object.values(system.authorityBoundary).every((entry) => entry === false));
  }
});

test("boundary rejects recomputed aggregate, Western, product, authority, and epoch promotions", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  const mutations = [
    (value) => { value.currentStatusSummary.totalAdmissionGatesSatisfied = 1; },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "western")
        .gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "western")
        .gateSummary.independentExpertReviewsVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "western")
        .productBoundary.releaseIdentity = "western-release";
    },
    (value) => { value.authorityBoundary.contentTruthEstablished = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13 = true; },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.intervalMutationExcludedAcrossFiles = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(built);
    mutate(candidate);
    redigest(candidate);
    assert.throws(() => testOnly.assertBoundary(candidate, parent));
  }
});

test("boundary rejects any drift in Bazi, Ziwei, or Vedic canonical copies", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  for (const id of ["bazi", "ziwei", "vedic"]) {
    const candidate = clone(built);
    candidate.systems.find((entry) => entry.contractSystemId === id).currentStatus += "_drift";
    redigest(candidate);
    assert.throws(() => testOnly.assertBoundary(candidate, parent),
      (error) => error.code === "NON_WESTERN_SYSTEM_DRIFT");
  }
});

test("boundary rejects drift in cross-system policy or aggregate summary", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  const policy = clone(built);
  policy.crossSystemPolicy.scoringAllowed = true;
  redigest(policy);
  assert.throws(() => testOnly.assertBoundary(policy, parent),
    (error) => error.code === "PARENT_TOP_LEVEL_DRIFT");

  const summary = clone(built);
  summary.currentStatusSummary.systemsWithCurrentEndpointMechanicallyVerified = 3;
  redigest(summary);
  assert.throws(() => testOnly.assertBoundary(summary, parent));
});

test("branded summary exposes no admission or publication promotion", async () => {
  const child = await loadedPromise;
  const summary = getFourSystemCurrentStatusObservationChildV214Summary(child);
  assert.equal(summary.westernCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.westernCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.westernBindingFrozenVerified, 0);
  assert.equal(summary.westernBindingRequired, 28);
  assert.equal(summary.westernIndependentExpertReviewsVerified, 0);
  assert.equal(summary.westernIndependentExpertsRequired, 2);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.totalAdmissionGatesRequired, 32);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
});

test("unbranded build cannot be consumed as a verified v2.14 child", async () => {
  const built = await builtPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV214(built), false);
  assert.throws(() => getFourSystemCurrentStatusObservationChildV214Summary(built),
    (error) => error.code === "CHILD_PRIVATE_BRAND_REQUIRED");
});

test("CLI succeeds normally and rejects arguments or visible preload state", () => {
  const clean = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: clean,
    timeout: 120_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /^FOUR_SYSTEM_CURRENT_STATUS_V2_14_OK /u);

  const argument = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: clean
  });
  assert.notEqual(argument.status, 0);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preload = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...clean, NODE_PATH: "visible-loader-path" }
  });
  assert.notEqual(preload.status, 0);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
