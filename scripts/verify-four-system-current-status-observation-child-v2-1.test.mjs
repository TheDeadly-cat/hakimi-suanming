import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV21,
  computeFourSystemCurrentStatusObservationChildV21Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV21,
  loadFourSystemCurrentStatusObservationChildV21,
  serializeFourSystemCurrentStatusObservationChildV21,
  fourSystemCurrentStatusObservationChildV21TestOnly as testOnly
} from "./four-system-current-status-observation-child-v2-1-lib.mjs";
import {
  attachCurrentFourSystemCli,
  createFourSystemV22HistoricalInputs
} from "./four-system-v22-history.test-fixture.mjs";
import {
  createFourSystemV21HistoricalInputs,
  ORIGINAL_ZIWEI_CONTRACT_ARCHIVE_URL,
  readOriginalZiweiContract
} from "./four-system-v21-history.test-fixture.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV22
} from "./four-system-current-status-observation-child-v2-2-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH.split("/")
);
const actualCliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-1.mjs"
);
const oldRegistryCliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-observation-registry-v2.mjs"
);
let historicalInputs;
let cliPath;
let builtPromise;
let loadedPromise;
before(async () => {
  historicalInputs = await createFourSystemV21HistoricalInputs();
  cliPath = await attachCurrentFourSystemCli(historicalInputs, 1);
  builtPromise = buildCurrentFourSystemCurrentStatusObservationChildV21(historicalInputs.root);
  loadedPromise = loadFourSystemCurrentStatusObservationChildV21(historicalInputs.root);
  await Promise.all([builtPromise, loadedPromise]);
});
after(async () => { await historicalInputs?.cleanup(); });

test("v2.1 restoration requires the exact original Ziwei contract archive", async () => {
  const original = await readFile(ORIGINAL_ZIWEI_CONTRACT_ARCHIVE_URL);
  const changed = Buffer.from(original);
  changed[Math.floor(changed.length / 2)] ^= 1;
  for (const bytes of [changed, original.subarray(0, -1), Buffer.alloc(0)]) {
    assert.throws(() => readOriginalZiweiContract(bytes), /original Ziwei contract archive identity changed/u);
  }
});

test("v2.1 and v2.2 loaders cannot substitute each other's input context", async () => {
  const later = await createFourSystemV22HistoricalInputs();
  try {
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV21(later.root),
      { code: "MANIFEST_MISMATCH" });
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root),
      { code: "CONTRACT_SOURCE_DRIFT" });
  } finally {
    await later.cleanup();
  }
});

test("actual v2.1 CLI stays anchored to its checkout even with a valid historical working directory", async () => {
  await assert.rejects(execFileAsync(process.execPath, [actualCliPath], {
    cwd: historicalInputs.root, env: sanitizedEnvironment(), encoding: "utf8", windowsHide: true
  }), (error) => error?.code === 1 && error.stdout === ""
    && error.stderr.trim() === "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_MECHANICS_FAILED UNEXPECTED_ERROR");
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizedEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  return { ...environment, ...extra };
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

test("v2.1 child has one exact canonical persisted identity and only the loader grants its private brand", async () => {
  const [built, loaded, bytes] = await Promise.all([
    builtPromise,
    loadedPromise,
    readFile(persistedPath)
  ]);
  assert.equal(bytes.length, 18_874);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "2b1ea37e3e168d2e91cb17a9f864ef93ebb55286de1ff02da83bc4847e74b42b"
  );
  assert.equal(
    built.childDigest,
    "e2fb723d2c0ddfdb5e41918a0ffa1ceb5d5d1cbbd8f1ac3a86f0be38b05fd64c"
  );
  assert.equal(bytes.toString("utf8"), serializeFourSystemCurrentStatusObservationChildV21(built));
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV21(built), false);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV21(loaded), true);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV21(structuredClone(loaded)), false);
  assertDeepFrozen(loaded);
});

test("the append-only child preserves stale registry v2 and records three exact staleness reasons", async () => {
  const child = await builtPromise;
  assert.deepEqual(child.lineage.parent, {
    path: testOnly.PARENT_REGISTRY.path,
    rawBytes: testOnly.PARENT_REGISTRY.rawBytes,
    rawSha256: testOnly.PARENT_REGISTRY.rawSha256,
    role: testOnly.PARENT_REGISTRY.role,
    semanticDigest: testOnly.PARENT_REGISTRY.semanticDigest,
    semanticDigestField: testOnly.PARENT_REGISTRY.semanticDigestField
  });
  assert.equal(child.lineage.parentPreservedUnmodified, true);
  assert.equal(child.lineage.parentMechanicallyCurrent, false);
  assert.equal(child.lineage.parentOverwritten, false);
  assert.equal(child.lineage.parentBacklinkToThisChildPresent, false);
  assert.deepEqual(
    child.lineage.stalenessReasons.map((entry) => entry.productSystemId),
    ["bazi", "western-astrology", "vedic-astrology"]
  );
});

test("each system keeps an independent current or drift status without claiming four current full manifests", async () => {
  const child = await builtPromise;
  assert.deepEqual(
    child.systems.map((entry) => entry.productSystemId),
    ["bazi", "ziwei-doushu", "western-astrology", "vedic-astrology"]
  );
  assert.deepEqual(
    child.systems.map(
      (entry) => entry.currentEvidence.currentFullDomainManifestMechanicallyVerified
    ),
    [false, true, false, false]
  );
  assert.equal(
    child.currentStatusSummary.allSystemsCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(child.currentStatusSummary.systemsWithCurrentEndpointMechanicallyVerified, 4);
});

test("Vedic binds observation, engineering manifest and isolated Edge/Chrome fact child without product-runtime promotion", async () => {
  const vedic = (await builtPromise).systems[3];
  assert.deepEqual(
    vedic.currentEvidence.endpoints.map((entry) => entry.role),
    [
      "current_vedic_version_aware_observation_child_v1_2",
      "current_vedic_independent_engineering_manifest_v1",
      "current_vedic_isolated_civil_time_same_artifact_browser_child"
    ]
  );
  assert.equal(vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(
    vedic.currentEvidence.browserRuntimeEvidence,
    "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
  );
  assert.equal(vedic.productBoundary.releaseIdentity, null);
  assert.equal(vedic.productBoundary.targetSchema, null);
});

test("all 32 admission gates, source bindings, expert reviews and authority ledgers stay red", async () => {
  const child = await builtPromise;
  assert.deepEqual(
    child.systems.map((entry) => [
      entry.gateSummary.bindingFrozenVerified,
      entry.gateSummary.bindingRequired,
      entry.gateSummary.independentExpertReviewsVerified,
      entry.gateSummary.independentExpertsRequired
    ]),
    [[0, 12, 0, 2], [0, 27, 0, 2], [0, 28, 0, 2], [0, 38, 0, 2]]
  );
  for (const system of child.systems) {
    assert.equal(system.gateSummary.admissionGatesSatisfied, 0);
    assert.ok(Object.values(system.authorityBoundary).every((value) => value === false));
  }
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.ok(Object.values(child.authorityBoundary).every((value) => value === false));
});

test("legacy-v13 / 13 / null remains project context and is not inherited by independent systems", async () => {
  const child = await builtPromise;
  assert.deepEqual(child.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    projectContextOnly: true,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    inheritedByZiweiWesternOrVedicProductIdentity: false
  });
  assert.deepEqual(
    child.systems.map((entry) => entry.productBoundary.targetSchema),
    [13, null, null, null]
  );
  assert.ok(child.systems.every((entry) => entry.productBoundary.baziAuthorityInherited === false));
});

test("cross-system scoring, weighting, voting, averaging, model arbitration, merging and equivalence remain forbidden", async () => {
  const policy = (await builtPromise).crossSystemPolicy;
  for (const field of [
    "factsFrozenForFormalComparison",
    "scoringAllowed",
    "weightingAllowed",
    "majorityVoteAllowed",
    "opinionAveragingAllowed",
    "generatedModelWinnerSelectionAllowed",
    "autoPersonMergeAllowed",
    "authorityInheritanceAllowed",
    "conceptEquivalenceInferenceAllowed",
    "formalComparisonAuthorized"
  ]) assert.equal(policy[field], false, field);
});

test("the child keeps seven evidence accounts separate and no digest or endpoint is a signature", async () => {
  const child = await builtPromise;
  assert.deepEqual(child.evidenceLedgerSeparation, [
    "engineering_evidence",
    "browser_and_runtime_evidence",
    "content_truth",
    "expert_truth",
    "rights_and_legal_judgment",
    "release_readiness",
    "public_release_authorization"
  ]);
  assert.equal(child.observationBoundary.childDigestIsDigitalSignature, false);
  assert.equal(child.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
  assert.equal(child.runtimeTrustBoundary.nodeRuntimeIdentityEstablished, false);
});

test("snapshot claims stop at per-file held buffers and do not claim atomicity, epoch, interval or ABA closure", async () => {
  const boundary = (await builtPromise).observationBoundary;
  assert.equal(boundary.sameHeldBufferHashAndParsePerJsonArtifact, true);
  assert.equal(boundary.pointInTimeOnly, true);
  assert.equal(boundary.crossFileAtomicSnapshot, false);
  assert.equal(boundary.mutationEpochAvailableForSchema13, false);
  assert.equal(boundary.mutationEpochReceipt, null);
  assert.equal(boundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(boundary.abaExcluded, false);
});

test("re-digested authority, manifest, gate, comparison and epoch promotions are rejected", async () => {
  const expected = await builtPromise;
  const mutations = [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.systems[2].currentEvidence.currentFullDomainManifestMechanicallyVerified = true; },
    (value) => { value.systems[1].gateSummary.independentExpertReviewsVerified = 1; },
    (value) => { value.crossSystemPolicy.generatedModelWinnerSelectionAllowed = true; },
    (value) => { value.observationBoundary.mutationEpochAvailableForSchema13 = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(expected);
    mutate(candidate);
    candidate.childDigest = computeFourSystemCurrentStatusObservationChildV21Digest(candidate);
    assert.throws(
      () => testOnly.assertChildBoundary(candidate),
      (error) => /PROMOTION_FORBIDDEN$/u.test(error?.code ?? "")
    );
  }
});

test("raw and semantic persisted identity drift fail before any private brand can be granted", async () => {
  const persisted = await builtPromise;
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes + 1,
      rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256
    }, persisted),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
  const changed = clone(persisted);
  changed.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes,
      rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256
    }, changed),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
});

test("canonical capture rejects accessors, proxies, aliases and cycles without invoking a getter", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    }
  });
  assert.throws(() => testOnly.captureJson(accessor));
  assert.equal(getterCalls, 0);
  assert.throws(() => testOnly.captureJson(new Proxy({}, {})));
  const shared = {};
  assert.throws(() => testOnly.captureJson({ left: shared, right: shared }));
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => testOnly.captureJson(cyclic));
});

test("semantic digest binds an own __proto__ JSON field and the boundary rejects it as unknown", async () => {
  const left = clone(await builtPromise);
  const right = clone(await builtPromise);
  Object.defineProperty(left, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "left",
    writable: true
  });
  Object.defineProperty(right, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "right",
    writable: true
  });
  left.childDigest = computeFourSystemCurrentStatusObservationChildV21Digest(left);
  right.childDigest = computeFourSystemCurrentStatusObservationChildV21Digest(right);
  assert.notEqual(left.childDigest, right.childDigest);
  assert.throws(
    () => testOnly.assertChildBoundary(left),
    (error) => error?.code === "KEY_SET_INVALID"
  );
});

test("captured brand primitives resist post-load WeakSet and Object.isFrozen poisoning", async () => {
  const loaded = await loadedPromise;
  const originalHas = WeakSet.prototype.has;
  const originalIsFrozen = Object.isFrozen;
  try {
    WeakSet.prototype.has = () => false;
    Object.isFrozen = () => false;
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV21(loaded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
    Object.isFrozen = originalIsFrozen;
  }
});

test("CLI reports only calibrated current-status claims and rejects operands", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(stderr, "");
  const report = JSON.parse(stdout);
  assert.equal(report.currentStatusObservationChildV21MechanicallyVerified, true);
  assert.equal(report.parentRegistryV2MechanicallyCurrent, false);
  assert.equal(report.systems.length, 4);
  assert.equal(report.systemsFormallyAdmitted, 0);
  assert.equal(report.totalAdmissionGatesSatisfied, 0);
  assert.equal(report.formalCrossSystemComparisonAuthorized, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicReleaseAuthorized, false);
  assert.equal(report.persistedAsCentralRegistry, false);
  assert.equal(report.activeAdmissionEffect, "none");

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "unexpected"], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1 && /ARGUMENTS_FORBIDDEN/u.test(error.stderr)
  );
});

test("CLI anchors to its own workspace, rejects preload environments and imports without side effects", async () => {
  const outsideCwd = path.parse(workspaceRoot).root;
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: outsideCwd,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(JSON.parse(stdout).currentStatusObservationChildV21MechanicallyVerified, true);

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1 && /PRELOAD_ENVIRONMENT_FORBIDDEN/u.test(error.stderr)
  );

  const imported = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(cliPath).href)});`],
    {
      cwd: outsideCwd,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }
  );
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
});

test("historical registry v2 remains fail-closed and is not silently rebound by the child", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [oldRegistryCliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && /FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_MECHANICS_FAILED ARTIFACT_DRIFT/u.test(
        error.stderr
      )
  );
});
