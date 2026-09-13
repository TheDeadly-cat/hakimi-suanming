import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV22,
  computeFourSystemCurrentStatusObservationChildV22Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV22,
  loadFourSystemCurrentStatusObservationChildV22,
  serializeFourSystemCurrentStatusObservationChildV22,
  fourSystemCurrentStatusObservationChildV22TestOnly as testOnly
} from "./four-system-current-status-observation-child-v2-2-lib.mjs";
import {
  FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL,
  attachCurrentFourSystemCli,
  createFourSystemV22HistoricalInputs,
  parseFourSystemV22InputArchive
} from "./four-system-v22-history.test-fixture.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_RELATIVE_PATH.split("/")
);
const actualCliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-2.mjs"
);
const oldRegistryCliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-observation-registry-v2.mjs"
);
const predecessorV21CliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-1.mjs"
);
let historicalInputs;
let cliPath;
let builtPromise;
let loadedPromise;
before(async () => {
  historicalInputs = await createFourSystemV22HistoricalInputs();
  cliPath = await attachCurrentFourSystemCli(historicalInputs, 2);
  // Persisted object and CLI positive contracts use their explicit input
  // context with current code. Current-checkout negatives remain separate.
  builtPromise = buildCurrentFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  loadedPromise = loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  await Promise.all([builtPromise, loadedPromise]);
});
after(async () => { await historicalInputs?.cleanup(); });

test("actual v2.2 CLI stays anchored to its checkout even with a valid historical working directory", async () => {
  await assert.rejects(execFileAsync(process.execPath, [actualCliPath], {
    cwd: historicalInputs.root, env: sanitizedEnvironment(), encoding: "utf8", windowsHide: true
  }), (error) => error?.code === 1 && error.stdout === ""
    && error.stderr.trim() === "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_MECHANICS_FAILED UNEXPECTED_ERROR");
});

test("v2.2 archived input context rejects corruption, truncation and an empty archive", async () => {
  const original = await readFile(FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL);
  const changed = Buffer.from(original);
  changed[Math.floor(changed.length / 2)] ^= 1;
  for (const bytes of [changed, original.subarray(0, -1), Buffer.alloc(0)]) {
    assert.throws(() => parseFourSystemV22InputArchive(bytes), /v2.2 input archive identity changed/u);
  }
});

test("actual current checkout cannot inherit the archived v2.2 input context's private brand", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV22(workspaceRoot),
    { code: "MANIFEST_IDENTITY_DRIFT" });
});

test("v2.2 input context rejects replacement of restored lock and test-configuration inputs", async () => {
  for (const [relativePath, expectedCode] of [
    ["package-lock.json", "LOCAL_RAW_IDENTITY_DRIFT"],
    ["apps/web/vitest.config.ts", "PRODUCTION_IMPORT_LEAKAGE"]
  ]) {
    const inputs = await createFourSystemV22HistoricalInputs();
    try {
      await writeFile(path.join(inputs.root, relativePath),
        await readFile(path.join(workspaceRoot, relativePath)));
      await assert.rejects(loadFourSystemCurrentStatusObservationChildV22(inputs.root),
        { code: expectedCode });
    } finally {
      await inputs.cleanup();
    }
  }
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

test("v2.2 child has one exact canonical persisted identity and only the loader grants its private brand", async () => {
  const [built, loaded, bytes] = await Promise.all([
    builtPromise,
    loadedPromise,
    readFile(persistedPath)
  ]);
  assert.equal(bytes.length, 18_625);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "1a81a03b682613c9221407cb2dfa9598728e63f683632d877abdb0524baade54"
  );
  assert.equal(
    built.childDigest,
    "b0d0340eae1190560831be2901afe9924e6c1a6434f5a7596d8be6aacb28d941"
  );
  assert.equal(bytes.toString("utf8"), serializeFourSystemCurrentStatusObservationChildV22(built));
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV22(built), false);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV22(loaded), true);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV22(structuredClone(loaded)), false);
  assertDeepFrozen(loaded);
});

test("the append-only child preserves stale v2.1 predecessor and records only the new Ziwei staleness relation", async () => {
  const child = await builtPromise;
  assert.deepEqual(child.lineage.parent, {
    path: testOnly.PARENT_V21.path,
    rawBytes: testOnly.PARENT_V21.rawBytes,
    rawSha256: testOnly.PARENT_V21.rawSha256,
    role: testOnly.PARENT_V21.role,
    semanticDigest: testOnly.PARENT_V21.semanticDigest,
    semanticDigestField: testOnly.PARENT_V21.semanticDigestField
  });
  assert.equal(child.lineage.parentPreservedUnmodified, true);
  assert.equal(child.lineage.parentMechanicallyCurrent, false);
  assert.equal(child.lineage.parentOverwritten, false);
  assert.equal(child.lineage.parentBacklinkToThisChildPresent, false);
  assert.equal(child.lineage.uniqueBlockerClaimed, false);
  assert.deepEqual(
    child.lineage.stalenessReasons.map((entry) => entry.productSystemId),
    ["ziwei-doushu"]
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
    [false, false, false, false]
  );
  assert.equal(
    child.currentStatusSummary.allSystemsCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(child.currentStatusSummary.systemsWithCurrentEndpointMechanicallyVerified, 4);
});

test("Ziwei consumes only the new private drift receipt and records no current manifest or browser evidence", async () => {
  const ziwei = (await builtPromise).systems[1];
  assert.equal(
    ziwei.currentStatus,
    "current_expert_promotion_boundary_identity_drift_receipt_manifest_and_browser_stale"
  );
  assert.deepEqual(ziwei.currentEvidence.endpoints, [{
    path: testOnly.CURRENT_ENDPOINTS.ziwei.path,
    rawBytes: testOnly.CURRENT_ENDPOINTS.ziwei.rawBytes,
    rawSha256: testOnly.CURRENT_ENDPOINTS.ziwei.rawSha256,
    role: testOnly.CURRENT_ENDPOINTS.ziwei.role,
    semanticDigest: testOnly.CURRENT_ENDPOINTS.ziwei.semanticDigest,
    semanticDigestField: testOnly.CURRENT_ENDPOINTS.ziwei.semanticDigestField
  }]);
  assert.equal(ziwei.currentEvidence.currentEndpointMechanicallyVerified, true);
  assert.equal(ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified, false);
  assert.equal(
    ziwei.currentEvidence.browserRuntimeEvidence,
    "historical_same_artifact_child_source_graph_stale_no_current_browser_runtime_evidence"
  );
  assert.equal(ziwei.gateSummary.bindingFrozenVerified, 0);
  assert.equal(ziwei.gateSummary.bindingRequired, 27);
  assert.equal(ziwei.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(ziwei.gateSummary.independentExpertsRequired, 2);
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

test("re-digested authority, manifest, browser, gate, comparison, epoch, lineage and version promotions are rejected", async () => {
  const expected = await builtPromise;
  const mutations = [
    [(value) => { value.authorityBoundary.releaseReady = true; }, "AUTHORITY_PROMOTION_FORBIDDEN"],
    [(value) => { value.systems[1].currentEvidence.currentFullDomainManifestMechanicallyVerified = true; }, "SYSTEM_STATUS_SET_INVALID"],
    [(value) => { value.systems[1].currentEvidence.browserRuntimeEvidence = "current"; }, "SYSTEM_STATUS_SET_INVALID"],
    [(value) => { value.systems[1].gateSummary.independentExpertReviewsVerified = 1; }, "SYSTEM_STATUS_SET_INVALID"],
    [(value) => { value.crossSystemPolicy.generatedModelWinnerSelectionAllowed = true; }, "CROSS_SYSTEM_PROMOTION_FORBIDDEN"],
    [(value) => { value.observationBoundary.mutationEpochAvailableForSchema13 = true; }, "OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN"],
    [(value) => { value.lineage.uniqueBlockerClaimed = true; }, "LINEAGE_INVALID"],
    [(value) => { value.versionBoundary.persistedAsCentralRegistry = true; }, "VERSION_PROMOTION_FORBIDDEN"],
    [(value) => { value.versionBoundary.manifestRebindOrResignPerformed = true; }, "VERSION_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, expectedCode] of mutations) {
    const candidate = clone(expected);
    mutate(candidate);
    candidate.childDigest = computeFourSystemCurrentStatusObservationChildV22Digest(candidate);
    assert.throws(
      () => testOnly.assertChildBoundary(candidate),
      (error) => error?.code === expectedCode
    );
  }
});

test("raw and semantic persisted identity drift fail before any private brand can be granted", async () => {
  const persisted = await builtPromise;
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes + 1,
      rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256
    }, persisted),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
  const changed = clone(persisted);
  changed.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_2_RELATIVE_PATH,
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

test("local canonical capture and exact-key checks resist Array index setters and global String replacement", async () => {
  const child = clone(await builtPromise);
  const originalDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const originalString = globalThis.String;
  Object.defineProperty(Array.prototype, "0", {
    configurable: true,
    set() {
      Object.defineProperty(this, "0", {
        configurable: true,
        enumerable: true,
        value: "evil",
        writable: true
      });
    }
  });
  globalThis.String = () => "__proto__";
  let exactResult;
  let digestResult;
  let capturedValue;
  let keyErrorCode = null;
  try {
    exactResult = testOnly.exactJson(["evil"], ["legit"]);
    digestResult = computeFourSystemCurrentStatusObservationChildV22Digest(child);
    const captured = testOnly.captureJson({ values: ["legit"] });
    capturedValue = captured.values[0];
    try {
      testOnly.requireExactKeys({ evil: false }, ["legit"], "poison probe");
    } catch (error) {
      keyErrorCode = error?.code ?? null;
    }
  } finally {
    globalThis.String = originalString;
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, "0", originalDescriptor);
    } else {
      delete Array.prototype[0];
    }
  }
  assert.equal(exactResult, false);
  assert.equal(digestResult, child.childDigest);
  assert.equal(capturedValue, "legit");
  assert.equal(keyErrorCode, "KEY_SET_INVALID");
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
  left.childDigest = computeFourSystemCurrentStatusObservationChildV22Digest(left);
  right.childDigest = computeFourSystemCurrentStatusObservationChildV22Digest(right);
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
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV22(loaded), true);
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
  assert.equal(report.currentStatusObservationChildV22MechanicallyVerified, true);
  assert.equal(report.parentV21MechanicallyCurrent, false);
  assert.equal(report.parentV21PreservedUnmodified, true);
  assert.equal(report.uniqueBlockerClaimed, false);
  assert.equal(report.systems.length, 4);
  assert.equal(report.systems[1].productSystemId, "ziwei-doushu");
  assert.equal(report.systems[1].currentEndpointMechanicallyVerified, true);
  assert.equal(report.systems[1].currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(report.systems[1].currentEngineeringManifestMechanicallyVerified, false);
  assert.equal(
    report.systems[1].browserRuntimeEvidence,
    "historical_same_artifact_child_source_graph_stale_no_current_browser_runtime_evidence"
  );
  assert.equal(report.systemsFormallyAdmitted, 0);
  assert.equal(report.totalAdmissionGatesSatisfied, 0);
  assert.equal(report.formalCrossSystemComparisonAuthorized, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicDeploymentAuthorized, false);
  assert.equal(report.publicReleaseAuthorized, false);
  assert.equal(report.expertClaimsAuthorized, false);
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
  assert.equal(JSON.parse(stdout).currentStatusObservationChildV22MechanicallyVerified, true);

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

test("historical v2.1 current-status loader remains fail-closed after the Ziwei identity change", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [predecessorV21CliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && /FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_1_MECHANICS_FAILED UNEXPECTED_ERROR/u.test(
        error.stderr
      )
  );
});
