import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV212,
  computeFourSystemCurrentStatusObservationChildV212Digest,
  fourSystemCurrentStatusObservationChildV212TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV212Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV212,
  loadFourSystemCurrentStatusObservationChildV212,
  serializeFourSystemCurrentStatusObservationChildV212
} from "./four-system-current-status-observation-child-v2-12-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV211
} from "./four-system-current-status-observation-child-v2-11-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(
  ROOT,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-12.mjs"
);

const loadedPromise = loadFourSystemCurrentStatusObservationChildV212(ROOT);
const builtPromise = buildCurrentFourSystemCurrentStatusObservationChildV212(ROOT);
const parentPromise = loadFourSystemCurrentStatusObservationChildV211(ROOT);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  value.childDigest = computeFourSystemCurrentStatusObservationChildV212Digest(value);
  return value;
}

test("fixed-path v2.12 loader verifies its exact persisted child", async () => {
  const child = await loadedPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV212(child), true);
  assert.equal(Object.isFrozen(child), true);
  assert.equal(Object.isFrozen(child.systems), true);
  assert.equal(child.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
});

test("fresh projection is byte-for-byte the canonical persisted v2.12", async () => {
  const built = await builtPromise;
  const bytes = await readFile(
    path.join(ROOT, ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH.split("/"))
  );
  assert.equal(bytes.length, 20_369);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "f5280c1ba72d4e1da3968f7b9a82db078ebd54f39e19b0b3665871b5787f32e4"
  );
  assert.equal(serializeFourSystemCurrentStatusObservationChildV212(built), bytes.toString("utf8"));
  assert.deepEqual(built, JSON.parse(bytes.toString("utf8")));
});

test("Bazi, Ziwei, and Western remain canonical exact parent copies", async () => {
  const [child, parent] = await Promise.all([loadedPromise, parentPromise]);
  for (const id of ["bazi", "ziwei", "western"]) {
    assert.deepEqual(
      child.systems.find((entry) => entry.contractSystemId === id),
      parent.systems.find((entry) => entry.contractSystemId === id)
    );
  }
});

test("Vedic v2 endpoint is replaced exactly once by current recursive v3", async () => {
  const child = await loadedPromise;
  const vedic = child.systems.find((entry) => entry.contractSystemId === "vedic");
  assert.equal(vedic.currentEvidence.endpoints.length, 3);
  assert.equal(
    vedic.currentEvidence.endpoints.some((entry) =>
      entry.path.endsWith("vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json")),
    false
  );
  const endpoints = vedic.currentEvidence.endpoints.filter((entry) =>
    entry.path === testOnly.VEDIC_MANIFEST_IDENTITY.path
  );
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].rawBytes, 35_325);
  assert.equal(endpoints[0].rawSha256,
    "c3d35e24073e7be14be971dae4e6825758b9fbfc3efd4adbc372e91fb74bf278");
  assert.equal(endpoints[0].semanticDigest,
    "b466a83ada3c9f39721cfc4a54628eb1a9afa03ff4794f51461fb6b4100041b2");
  assert.equal(vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
});

test("aggregate remains 0/32 and Vedic remains 0/38 and 0/2", async () => {
  const child = await loadedPromise;
  const vedic = child.systems.find((entry) => entry.contractSystemId === "vedic");
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(vedic.gateSummary.bindingRequired, 38);
  assert.equal(vedic.gateSummary.bindingFrozenVerified, 0);
  assert.equal(vedic.gateSummary.independentExpertsRequired, 2);
  assert.equal(vedic.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(child.currentStatusSummary.systemsFormallyAdmitted, 0);
  assert.equal(child.currentStatusSummary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(child.currentStatusSummary.systemsReleaseReady, 0);
  assert.equal(child.currentStatusSummary.systemsPublicReleaseAuthorized, 0);
});

test("aggregate keeps legacy-v13 context and all mutation epoch boundaries red", async () => {
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

test("aggregate and all systems preserve false authority ledgers", async () => {
  const child = await loadedPromise;
  assert.ok(Object.values(child.authorityBoundary).every((value) => value === false));
  for (const system of child.systems) {
    assert.ok(Object.values(system.authorityBoundary).every((value) => value === false));
  }
});

test("boundary rejects recomputed gate, authority, product, and mutation promotions", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  const mutations = [
    (value) => { value.currentStatusSummary.totalAdmissionGatesSatisfied = 1; },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "vedic")
        .gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "vedic")
        .gateSummary.independentExpertReviewsVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "vedic")
        .productBoundary.releaseIdentity = "vedic-release";
    },
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

test("boundary rejects drift in every non-Vedic system copy", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  for (const id of ["bazi", "ziwei", "western"]) {
    const candidate = clone(built);
    candidate.systems.find((entry) => entry.contractSystemId === id).currentStatus += "_drift";
    redigest(candidate);
    assert.throws(
      () => testOnly.assertBoundary(candidate, parent),
      (error) => error.code === "NON_VEDIC_SYSTEM_DRIFT"
    );
  }
});

test("summary is branded and does not promote Vedic", async () => {
  const child = await loadedPromise;
  const summary = getFourSystemCurrentStatusObservationChildV212Summary(child);
  assert.equal(summary.vedicCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.vedicCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.vedicBindingFrozenVerified, 0);
  assert.equal(summary.vedicBindingRequired, 38);
  assert.equal(summary.vedicIndependentExpertReviewsVerified, 0);
  assert.equal(summary.vedicIndependentExpertsRequired, 2);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.totalAdmissionGatesRequired, 32);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
});

test("unbranded build cannot be consumed as a verified v2.12 child", async () => {
  const built = await builtPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV212(built), false);
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV212Summary(built),
    (error) => error.code === "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("CLI succeeds normally and rejects arguments or visible preload state", () => {
  const cleanEnv = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv,
    timeout: 60_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /^FOUR_SYSTEM_CURRENT_STATUS_V2_12_OK /u);

  const argumentsRejected = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv
  });
  assert.notEqual(argumentsRejected.status, 0);
  assert.match(argumentsRejected.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preloadRejected = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...cleanEnv, NODE_PATH: "visible-loader-path" }
  });
  assert.notEqual(preloadRejected.status, 0);
  assert.match(preloadRejected.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
