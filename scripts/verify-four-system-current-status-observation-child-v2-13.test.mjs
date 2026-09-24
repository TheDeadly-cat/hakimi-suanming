import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV213,
  computeFourSystemCurrentStatusObservationChildV213Digest,
  fourSystemCurrentStatusObservationChildV213TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV213Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV213,
  loadFourSystemCurrentStatusObservationChildV213,
  serializeFourSystemCurrentStatusObservationChildV213
} from "./four-system-current-status-observation-child-v2-13-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV212
} from "./four-system-current-status-observation-child-v2-12-lib.mjs";

import {
  FOUR_SYSTEM_V213_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV213HistoricalInputs,
  parseFourSystemV213AdditionalArchive
} from "./four-system-v213-history.test-fixture.mjs";
import { attachCurrentFourSystemCli } from "./four-system-v22-history.test-fixture.mjs";

const actualWorkspaceRoot = path.resolve(import.meta.dirname, "..");
let historicalInputs, ROOT, CLI, loadedPromise, builtPromise, parentPromise;
before(async () => {
  historicalInputs = await createFourSystemV213HistoricalInputs();
  ROOT = historicalInputs.root;
  const relativePath = FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH;
  assert.deepEqual(await readFile(path.join(ROOT, relativePath)),
    await readFile(path.join(actualWorkspaceRoot, relativePath)));
  CLI = await attachCurrentFourSystemCli(historicalInputs, 13);
  // Attach all rejection handlers in this hook before yielding to any test.
  loadedPromise = loadFourSystemCurrentStatusObservationChildV213(ROOT);
  builtPromise = buildCurrentFourSystemCurrentStatusObservationChildV213(ROOT);
  parentPromise = loadFourSystemCurrentStatusObservationChildV212(ROOT);
  await Promise.all([loadedPromise, builtPromise, parentPromise]);
});
after(async () => { await historicalInputs?.cleanup(); });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  value.childDigest = computeFourSystemCurrentStatusObservationChildV213Digest(value);
  return value;
}

test("fixed-path v2.13 loader verifies its exact persisted child", async () => {
  const child = await loadedPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV213(child), true);
  assert.equal(Object.isFrozen(child), true);
  assert.equal(Object.isFrozen(child.systems), true);
  assert.equal(child.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
});

test("fresh projection is byte-for-byte the canonical persisted v2.13", async () => {
  const built = await builtPromise;
  const bytes = await readFile(
    path.join(ROOT, ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH.split("/"))
  );
  assert.equal(bytes.length, 20_784);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "5d8ecab2d59c8897ad27d9ba6226e1093231d33f874e58b49c9194b8166d74ff"
  );
  assert.equal(serializeFourSystemCurrentStatusObservationChildV213(built), bytes.toString("utf8"));
  assert.deepEqual(built, JSON.parse(bytes.toString("utf8")));
});

test("Bazi, Western, and Vedic remain canonical exact v2.12 copies", async () => {
  const [child, parent] = await Promise.all([loadedPromise, parentPromise]);
  for (const id of ["bazi", "western", "vedic"]) {
    assert.deepEqual(
      child.systems.find((entry) => entry.contractSystemId === id),
      parent.systems.find((entry) => entry.contractSystemId === id)
    );
  }
});

test("Ziwei v3 endpoint is replaced exactly once by current authored-root v4", async () => {
  const child = await loadedPromise;
  const ziwei = child.systems.find((entry) => entry.contractSystemId === "ziwei");
  assert.equal(ziwei.currentEvidence.endpoints.length, 3);
  assert.equal(
    ziwei.currentEvidence.endpoints.some((entry) =>
      entry.path.endsWith("ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json")),
    false
  );
  const endpoints = ziwei.currentEvidence.endpoints.filter((entry) =>
    entry.path === testOnly.ZIWEI_MANIFEST_IDENTITY.path
  );
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].rawBytes, 40_230);
  assert.equal(endpoints[0].rawSha256,
    "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e");
  assert.equal(endpoints[0].semanticDigest,
    "46c2784875462e1851d0e3c7e352163660fbe29916e6ad6abd4f50065db42170");
  assert.equal(ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
});

test("aggregate remains 0/32 and Ziwei remains 0/27 and 0/2", async () => {
  const child = await loadedPromise;
  const ziwei = child.systems.find((entry) => entry.contractSystemId === "ziwei");
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(ziwei.gateSummary.bindingRequired, 27);
  assert.equal(ziwei.gateSummary.bindingFrozenVerified, 0);
  assert.equal(ziwei.gateSummary.independentExpertsRequired, 2);
  assert.equal(ziwei.gateSummary.independentExpertReviewsVerified, 0);
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
      value.systems.find((entry) => entry.contractSystemId === "ziwei")
        .gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "ziwei")
        .gateSummary.independentExpertReviewsVerified = 1;
    },
    (value) => {
      value.systems.find((entry) => entry.contractSystemId === "ziwei")
        .productBoundary.releaseIdentity = "ziwei-release";
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

test("boundary rejects drift in every non-Ziwei system copy", async () => {
  const [built, parent] = await Promise.all([builtPromise, parentPromise]);
  for (const id of ["bazi", "western", "vedic"]) {
    const candidate = clone(built);
    candidate.systems.find((entry) => entry.contractSystemId === id).currentStatus += "_drift";
    redigest(candidate);
    assert.throws(
      () => testOnly.assertBoundary(candidate, parent),
      (error) => error.code === "NON_ZIWEI_SYSTEM_DRIFT"
    );
  }
});

test("summary is branded and does not promote Ziwei", async () => {
  const child = await loadedPromise;
  const summary = getFourSystemCurrentStatusObservationChildV213Summary(child);
  assert.equal(summary.ziweiCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.ziweiCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.ziweiBindingFrozenVerified, 0);
  assert.equal(summary.ziweiBindingRequired, 27);
  assert.equal(summary.ziweiIndependentExpertReviewsVerified, 0);
  assert.equal(summary.ziweiIndependentExpertsRequired, 2);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.totalAdmissionGatesRequired, 32);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
});

test("unbranded build cannot be consumed as a verified v2.13 child", async () => {
  const built = await builtPromise;
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV213(built), false);
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV213Summary(built),
    (error) => error.code === "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("CLI succeeds normally and rejects arguments or visible preload state", () => {
  const cleanEnv = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv,
    timeout: 90_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /^FOUR_SYSTEM_CURRENT_STATUS_V2_13_OK /u);

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

test("current v2.13 loader and source CLI cannot inherit historical input success", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV213(actualWorkspaceRoot),
    { code: "PARENT_REVERIFICATION_FAILED" });
  const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
  const run = spawnSync(process.execPath,
    [path.join(actualWorkspaceRoot, "scripts/verify-four-system-current-status-observation-child-v2-13.mjs")],
    { cwd: ROOT, encoding: "utf8", env, windowsHide: true, timeout: 120_000 });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "FOUR_SYSTEM_CURRENT_STATUS_V2_13_FAILED PARENT_REVERIFICATION_FAILED\n");
});

test("v2.13 supplemental archive rejects tampering, truncation and a valid empty ZIP", async () => {
  const original = await readFile(FOUR_SYSTEM_V213_ADDITIONAL_ARCHIVE_URL);
  assert.equal(parseFourSystemV213AdditionalArchive(original).manifest.files.length, 31);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV213AdditionalArchive(bytes), /v2\.13 additional archive identity changed/u);
  }
});

test("v2.13 refuses altered or missing Ziwei authored-root input bytes", async () => {
  const inputs = await createFourSystemV213HistoricalInputs();
  try {
    const target = path.join(inputs.root, "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-view.test.ts");
    const changed = Buffer.from(await readFile(target)); changed[changed.length - 1] ^= 1;
    await writeFile(target, changed);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV213(inputs.root), (error) =>
      error.code === "ZIWEI_MANIFEST_REVERIFICATION_FAILED" && error.cause?.code === "CURRENT_MANIFEST_MISMATCH");
    await rm(target);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV213(inputs.root), (error) =>
      error.code === "ZIWEI_MANIFEST_REVERIFICATION_FAILED" && error.cause?.code === "AUTHORED_PATH_SET_MISMATCH");
  } finally { await inputs.cleanup(); }
});
