import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH,
  WesternTzdb2026cControlledReproductionObservationError,
  buildExpectedWesternTzdb2026cControlledReproductionObservation,
  canonicalStringifyWesternTzdb2026cControlledReproductionObservation,
  computeWesternTzdb2026cControlledReproductionObservationDigest,
  isVerifiedWesternTzdb2026cControlledReproductionObservation,
  loadWesternTzdb2026cControlledReproductionObservation,
  parseWesternTzdb2026cControlledReproductionObservationJsonBytes,
  serializeWesternTzdb2026cControlledReproductionObservation,
  verifyWesternTzdb2026cControlledReproductionObservationLedger,
  westernTzdb2026cControlledReproductionObservationTestOnly
} from "./western-tzdb-2026c-controlled-reproduction-observation-lib.mjs";
import {
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH.split("/")
);
const VERIFY_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-western-tzdb-2026c-controlled-reproduction-observation.mjs"
);
const WRITE_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "write-western-tzdb-2026c-controlled-reproduction-observation.mjs"
);
const LIB_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "western-tzdb-2026c-controlled-reproduction-observation-lib.mjs"
);

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));

function cloneLedger() {
  return JSON.parse(JSON.stringify(persistedLedger));
}

function reseal(ledger) {
  ledger.observationDigest = computeWesternTzdb2026cControlledReproductionObservationDigest(ledger);
  return ledger;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternTzdb2026cControlledReproductionObservationError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function spawnNode(scriptPath, extraArgs = [], options = {}) {
  const { env = {}, ...spawnOptions } = options;
  return spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "", ...env },
    ...spawnOptions
  });
}

function spawnNodeWithExecArgv(scriptPath, execArgv, options = {}) {
  const { env = {}, ...spawnOptions } = options;
  return spawnSync(process.execPath, [...execArgv, scriptPath], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "", ...env },
    ...spawnOptions
  });
}

function spawnLauncherWithVisibleExecArgv(scriptPath, visibleExecArgv) {
  const source = `
    process.argv = [process.execPath, ${JSON.stringify(scriptPath)}];
    process.execArgv.length = 0;
    process.execArgv.push(...${JSON.stringify(visibleExecArgv)});
    await import(${JSON.stringify(pathToFileURL(scriptPath).href)});
  `;
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
}

test("persisted controlled reproduction child verifies through source child private brand and fixed formal context", async () => {
  const result = await loadWesternTzdb2026cControlledReproductionObservation(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedWesternTzdb2026cControlledReproductionObservation(result), true);
  assert.equal(isVerifiedWesternTzdb2026cControlledReproductionObservation({ ...result }), false);
  assert.equal(isVerifiedWesternTzdb2026cControlledReproductionObservation(result.ledger), false);
  assert.equal(result.sourceBindingsFrozenVerified, 0);
  assert.equal(result.sourceBindingsRequired, 28);
  assert.equal(result.observationSubjectsFullySatisfied, 0);
  assert.equal(result.observationSubjectsTotal, 2);
  assert.equal(result.transformationProvenanceEstablished, false);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.formalContext.length, 4);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("persisted raw identity, canonical LF pretty bytes, and domain-separated digest are exact", () => {
  const expectedRaw = westernTzdb2026cControlledReproductionObservationTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.byteLength, expectedRaw.rawBytes);
  assert.equal(sha256Bytes(persistedBytes), expectedRaw.rawSha256);
  assert.equal(
    persistedBytes.toString("utf8"),
    serializeWesternTzdb2026cControlledReproductionObservation(persistedLedger)
  );
  assert.equal(
    computeWesternTzdb2026cControlledReproductionObservationDigest(persistedLedger),
    persistedLedger.observationDigest
  );
  const unsigned = cloneLedger();
  delete unsigned.observationDigest;
  const canonicalUnsigned = canonicalStringifyWesternTzdb2026cControlledReproductionObservation(unsigned);
  assert.equal(
    sha256Text(westernTzdb2026cControlledReproductionObservationTestOnly.DIGEST_DOMAIN + canonicalUnsigned),
    persistedLedger.observationDigest
  );
  assert.notEqual(sha256Text(canonicalUnsigned), persistedLedger.observationDigest);
});

test("builder, strict parser, verifier, and persisted artifact converge on one contract", () => {
  const parsed = parseWesternTzdb2026cControlledReproductionObservationJsonBytes(
    persistedBytes,
    "persisted observation"
  );
  const verified = verifyWesternTzdb2026cControlledReproductionObservationLedger(parsed);
  const expected = buildExpectedWesternTzdb2026cControlledReproductionObservation();
  assert.equal(
    canonicalStringifyWesternTzdb2026cControlledReproductionObservation(verified),
    canonicalStringifyWesternTzdb2026cControlledReproductionObservation(expected)
  );
  assert.equal(serializeWesternTzdb2026cControlledReproductionObservation(expected), persistedBytes.toString("utf8"));
});

test("two successful runs freeze byte-exact meta collect unpacked and packed outputs plus distinct decoys", () => {
  const runs = persistedLedger.operatorRecordedProbe.successfulRuns;
  assert.equal(runs.length, 2);
  assert.notEqual(runs[0].decoy.decoyId, runs[1].decoy.decoyId);
  assert.equal(runs[0].decoy.didNotAffectPackedOutput, true);
  assert.equal(runs[1].decoy.didNotAffectPackedOutput, true);
  assert.deepEqual(runs[0].outputs, runs[1].outputs);
  assert.deepEqual(runs[0].outputs, persistedLedger.operatorRecordedProbe.successOutputIdentity);
  assert.deepEqual(runs[0].outputs.map((entry) => entry.name), ["meta", "collect", "unpacked", "packed"]);
  for (const run of runs) {
    assert.equal(run.zicFilesGenerated, 597);
    assert.equal(run.zdumpFilesGenerated, 597);
    assert.equal(run.projectTargetUseObservedInAuditedStaticPaths, false);
    assert.equal(run.projectTargetUseMechanicallyExcluded, false);
    assert.equal(run.quarantinedTargetUseObservedInAuditedStaticPaths, false);
    assert.equal(run.quarantinedTargetUseMechanicallyExcluded, false);
  }
  assert.equal(persistedLedger.operatorRecordedProbe.twoSuccessfulRunsByteExact, true);
});

test("full upstream task lock tzcode tool and runtime identities are frozen with full SHA-256 values", () => {
  const testOnly = westernTzdb2026cControlledReproductionObservationTestOnly;
  assert.equal(testOnly.UPSTREAM_AND_TOOL_IDENTITIES.length, 12);
  assert.equal(testOnly.TRANSFORMATION_FILE_IDENTITIES.length, 15);
  assert.equal(testOnly.TZCODE_FILE_IDENTITIES.length, 10);
  for (const group of [
    testOnly.UPSTREAM_AND_TOOL_IDENTITIES,
    testOnly.TRANSFORMATION_FILE_IDENTITIES,
    testOnly.TZCODE_FILE_IDENTITIES,
    testOnly.SUCCESS_OUTPUTS
  ]) {
    for (const entry of group) {
      assert.ok(Number.isSafeInteger(entry.rawBytes) && entry.rawBytes > 0);
      assert.match(entry.rawSha256, /^[0-9a-f]{64}$/u);
    }
  }
  assert.equal(persistedLedger.operatorRecordedProbe.runtimeEnvironment.node, "v24.16.0");
  assert.equal(persistedLedger.operatorRecordedProbe.runtimeEnvironment.npm, "11.13.0");
  assert.equal(persistedLedger.operatorRecordedProbe.runtimeEnvironment.zig, "0.16.0");
});

test("complete probe window and raw receipt remain unavailable rather than reconstructed", () => {
  const window = persistedLedger.observationWindow;
  assert.equal(window.probeFullWindow, "unavailable_not_sampled");
  assert.equal(window.fullWindowFabricated, false);
  assert.equal(window.compilerCacheSubwindow.explicitlyNotProbeFullWindow, true);
  assert.equal(window.rawProbeReceiptPersisted, false);
  assert.equal(window.probeRunnerPersisted, false);
});

test("quarantine read-set network environment cross-host and intermediate-time limits remain explicit false", () => {
  const boundaries = persistedLedger.executionBoundaries;
  for (const value of Object.values(boundaries)) assert.equal(value, false);
  const quarantine = persistedLedger.operatorRecordedProbe.quarantineObservation;
  assert.equal(quarantine.quarantineSharedSameCwd, true);
  assert.equal(quarantine.quarantinedTargetsTheoreticallyAccessible, true);
  assert.equal(quarantine.targetInvisibilityMechanicallyEstablished, false);
  assert.equal(persistedLedger.operatorRecordedProbe.staticReadWriteReview.osLevelReadSetTraceCaptured, false);
  assert.equal(persistedLedger.operatorRecordedProbe.fixedOffsetZdumpFallbackReadsCurrentClock, true);
  assert.equal(persistedLedger.operatorRecordedProbe.rawZdumpIntermediateStrictlyTimeIndependent, false);
});

test("cleanup is operator-recorded and never promoted to workspace-wide absence", () => {
  const cleanup = persistedLedger.cleanupAndStorageBoundary;
  assert.equal(cleanup.probeRootCleanupOperatorRecorded, true);
  assert.equal(cleanup.zigCacheCleanupOperatorRecorded, true);
  assert.equal(cleanup.remoteBodiesPersistedInThisRecord, 0);
  assert.equal(cleanup.remoteBodiesPersistedByThisProbeInRepoAfterCleanupOperatorRecorded, 0);
  assert.equal(cleanup.projectFilesModifiedOperatorRecorded, 0);
  assert.equal(cleanup.projectFilesDeletedOperatorRecorded, 0);
  assert.equal(cleanup.workspaceWideAbsenceMechanicallyVerified, false);
});

test("Windows macros remain host adaptations rather than upstream or general product defaults", () => {
  const adaptations = persistedLedger.operatorRecordedProbe.windowsHostAdaptations;
  assert.deepEqual(adaptations.zdumpAdditionalMacros, [
    "HAVE_STRUCT_STAT_ST_CTIM=0",
    "SUPPRESS_TZDIR=1",
    "HAVE_TZNAME=1",
    "time_tz=__int64"
  ]);
  assert.equal(adaptations.timeTzChangesInternalTypeAndSymbolRange, true);
  assert.equal(adaptations.suppressTzdirChangesWindowsPathLookupSemantics, true);
  assert.equal(adaptations.upstreamDefaultBuild, false);
  assert.equal(adaptations.generalProductBuildDefaultAuthorized, false);
});

test("diagnostic outputs are frozen while only audited static-input exclusion is recorded", () => {
  const failed = persistedLedger.operatorRecordedProbe.failedDiagnosticRuns;
  assert.equal(failed.length, 2);
  for (const run of failed) {
    assert.equal(run.excludedFromAuditedStaticInputsOperatorRecorded, true);
    assert.equal(run.useMechanicallyExcluded, false);
    assert.equal(run.collectIdentity, "unavailable_not_captured");
    assert.equal(run.outputs.length, 2);
  }
  assert.equal(persistedLedger.operatorRecordedProbe.failedDiagnosticOutputUseObservedInAuditedStaticInputs, false);
  assert.equal(persistedLedger.operatorRecordedProbe.failedDiagnosticOutputUseMechanicallyExcluded, false);
});

test("self-resigning cannot promote status, provenance, subjects, truth, expert, rights, release or public authority", () => {
  const mutations = [
    [(value) => { value.status = "verified_transformation_provenance"; }, "STATUS_PROMOTION_FORBIDDEN"],
    [(value) => { value.subjectObservations[0].subjectFullySatisfied = true; }, "SUBJECT_PROMOTION_FORBIDDEN"],
    [(value) => { value.subjectObservations[1].transformationProvenanceEstablished = true; }, "SUBJECT_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.transformationProvenanceEstablished = true; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.contentTruthEstablished = true; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.expertOpinionsVerified = 2; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.rightsLegalConclusionEstablished = true; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.releaseReady = true; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.publicReleaseAuthorized = true; }, "GATE_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, expectedCode] of mutations) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)), expectedCode);
  }
});

test("self-resigning cannot promote target invisibility read-set network environment signature or provenance boundaries", () => {
  const fields = [
    "publisherOriginalBuildProvenanceEstablished",
    "publisherBuildProvenanceEstablished",
    "publisherAuthenticityEstablished",
    "commitOrTagSignatureVerified",
    "signingKeyTrustEstablished",
    "targetInvisibilityMechanicallyEstablished",
    "osLevelExpectedOutputInvisibilityEstablished",
    "osLevelReadSetTraceCaptured",
    "completeProcessReadSetMechanicallyTraced",
    "networkIsolationEstablished",
    "networkIsolationMechanicallyEstablished",
    "environmentClosureEstablished",
    "crossHostToolBitReproducibilityEstablished",
    "toolchainCrossHostBitReproducibilityEstablished",
    "probeReceiptCryptographicallyAttested",
    "replayableFromThisRecordAlone",
    "allIntermediateLayersTimeIndependent"
  ];
  for (const field of fields) {
    const ledger = cloneLedger();
    ledger.executionBoundaries[field] = true;
    expectCode(
      () => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)),
      "EXECUTION_BOUNDARY_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-resigning cannot invent a full window receipt workspace absence or snapshot integrity", () => {
  const cases = [
    [(value) => { value.observationWindow.probeFullWindow = "fabricated"; }, "RECEIPT_OR_WINDOW_PROMOTION_FORBIDDEN"],
    [(value) => { value.observationWindow.rawProbeReceiptPersisted = true; }, "RECEIPT_OR_WINDOW_PROMOTION_FORBIDDEN"],
    [(value) => { value.cleanupAndStorageBoundary.workspaceWideAbsenceMechanicallyVerified = true; }, "STORAGE_PROMOTION_FORBIDDEN"],
    [(value) => { value.snapshotBoundary.crossFileAtomicSnapshotEstablished = true; }, "SNAPSHOT_PROMOTION_FORBIDDEN"],
    [(value) => { value.snapshotBoundary.mutationEpochReceipt = "forged"; }, "SNAPSHOT_PROMOTION_FORBIDDEN"],
    [(value) => { value.snapshotBoundary.intervalMutationExcluded = true; }, "SNAPSHOT_PROMOTION_FORBIDDEN"],
    [(value) => { value.snapshotBoundary.abaExcluded = true; }, "SNAPSHOT_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, expectedCode] of cases) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)), expectedCode);
  }
});

test("self-resigning output drift, toolchain drift, macro promotion, or failed-run mixing stays rejected", () => {
  const mutations = [
    [(value) => { value.operatorRecordedProbe.successfulRuns[1].outputs[3].rawSha256 = "a".repeat(64); }, "OBSERVATION_CONTRACT_MISMATCH"],
    [(value) => { value.operatorRecordedProbe.runtimeEnvironment.zig = "0.17.0"; }, "OBSERVATION_CONTRACT_MISMATCH"],
    [(value) => { value.operatorRecordedProbe.windowsHostAdaptations.upstreamDefaultBuild = true; }, "OBSERVATION_CONTRACT_MISMATCH"],
    [(value) => { value.operatorRecordedProbe.windowsHostAdaptations.generalProductBuildDefaultAuthorized = true; }, "OBSERVATION_CONTRACT_MISMATCH"],
    [(value) => { value.operatorRecordedProbe.failedDiagnosticRuns[0].excludedFromAuditedStaticInputsOperatorRecorded = false; }, "FAILED_RUN_USE_SCOPE_PROMOTION_FORBIDDEN"],
    [(value) => { value.operatorRecordedProbe.failedDiagnosticOutputUseMechanicallyExcluded = true; }, "FAILED_RUN_USE_SCOPE_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, expectedCode] of mutations) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(
      () => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)),
      expectedCode
    );
  }
});

test("target-use, runtime-network, and comparison-ordering limits cannot be mechanically promoted", () => {
  const cases = [
    [(value) => { value.operatorRecordedProbe.successfulRuns[0].projectTargetUseMechanicallyExcluded = true; }, "TARGET_USE_SCOPE_PROMOTION_FORBIDDEN"],
    [(value) => { value.operatorRecordedProbe.successfulRuns[1].quarantinedTargetUseMechanicallyExcluded = true; }, "TARGET_USE_SCOPE_PROMOTION_FORBIDDEN"],
    [(value) => { value.operatorRecordedProbe.cleanExecution.runtimeNetworkAccessMechanicallyExcluded = true; }, "OFFLINE_OR_ORDERING_SCOPE_PROMOTION_FORBIDDEN"],
    [(value) => { value.operatorRecordedProbe.cleanExecution.projectTargetComparisonOrderingMechanicallyTraced = true; }, "OFFLINE_OR_ORDERING_SCOPE_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, expectedCode] of cases) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(
      () => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)),
      expectedCode
    );
  }
});

test("formal binding manifest registry and owner state cannot gain an active effect by self-signing", () => {
  for (const mutate of [
    (value) => { value.formalIntegration.bindingModified = true; },
    (value) => { value.formalIntegration.manifestModified = true; },
    (value) => { value.formalIntegration.registryModified = true; },
    (value) => { value.formalIntegration.ownerAdmissionAccepted = true; },
    (value) => { value.formalIntegration.activeEffect = "current"; }
  ]) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(
      () => verifyWesternTzdb2026cControlledReproductionObservationLedger(reseal(ledger)),
      "FORMAL_INTEGRATION_FORBIDDEN"
    );
  }
});

test("a structural clone cannot substitute for the source-rights child's actual private brand", async () => {
  const sourceChild = await loadWesternTzdb2026cSourceRightsEvidence(PROJECT_ROOT);
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence(sourceChild), true);
  assert.equal(
    westernTzdb2026cControlledReproductionObservationTestOnly.requireVerifiedSourceRightsChild(sourceChild),
    sourceChild
  );
  expectCode(
    () => westernTzdb2026cControlledReproductionObservationTestOnly.requireVerifiedSourceRightsChild({ ...sourceChild }),
    "SOURCE_CHILD_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => westernTzdb2026cControlledReproductionObservationTestOnly.requireVerifiedSourceRightsChild(sourceChild.ledger),
    "SOURCE_CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("formal context backlink detector rejects either observation identity or artifact path", () => {
  const testOnly = westernTzdb2026cControlledReproductionObservationTestOnly;
  assert.doesNotThrow(() => testOnly.assertNoFormalBacklinkText("unrelated fixed formal artifact", "fixture"));
  expectCode(
    () => testOnly.assertNoFormalBacklinkText(`backlink ${testOnly.OBSERVATION_ID}`, "fixture"),
    "FORMAL_BACKLINK_FORBIDDEN"
  );
  expectCode(
    () => testOnly.assertNoFormalBacklinkText(
      `backlink ${WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH}`,
      "fixture"
    ),
    "FORMAL_BACKLINK_FORBIDDEN"
  );
});

test("Proxy accessor alias cycle foreign prototype and negative zero inputs fail before semantic verification", () => {
  expectCode(
    () => verifyWesternTzdb2026cControlledReproductionObservationLedger(new Proxy(cloneLedger(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const accessor = cloneLedger();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return persistedLedger.status; } });
  expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  const alias = cloneLedger();
  alias.shared = alias.projectReleaseGovernance;
  expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(alias), "INPUT_ALIAS_FORBIDDEN");
  const cycle = cloneLedger();
  cycle.self = cycle;
  expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(cycle), "INPUT_CYCLE_FORBIDDEN");
  const foreign = Object.create(null);
  Object.assign(foreign, cloneLedger());
  expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(foreign), "INPUT_PROTOTYPE_INVALID");
  const negativeZero = cloneLedger();
  negativeZero.gateSummary.sourceBindingsFrozenVerified = -0;
  expectCode(() => verifyWesternTzdb2026cControlledReproductionObservationLedger(negativeZero), "INPUT_VALUE_INVALID");
});

test("strict JSON parser rejects duplicate keys", () => {
  expectCode(
    () => parseWesternTzdb2026cControlledReproductionObservationJsonBytes(
      Buffer.from('{"status":"a","status":"b"}', "utf8"),
      "duplicate.json"
    ),
    "JSON_DUPLICATE_KEY"
  );
});

test("post-import primordial and inherited toJSON poisoning cannot forge serialize or held-handle load", () => {
  const childSource = `
    const { readFile } = await import("node:fs/promises");
    const m = await import(${JSON.stringify(pathToFileURL(LIB_SCRIPT).href)});
    const expectedRaw = await readFile(${JSON.stringify(LEDGER_PATH)});
    const originalArrayMap = Array.prototype.map;
    const originalArrayPush = Array.prototype.push;
    const originalMapGet = Map.prototype.get;
    const originalObjectEntries = Object.entries;
    const originalObjectValues = Object.values;
    const originalJsonStringify = JSON.stringify;
    const originalWeakSetAdd = WeakSet.prototype.add;
    Array.prototype.map = function () { throw new Error("poisoned map"); };
    Array.prototype.push = function () { throw new Error("poisoned push"); };
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      value() { return ["forged-array"]; }
    });
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value() { return { forgedObject: true }; }
    });
    Map.prototype.get = function () { throw new Error("poisoned map get"); };
    Object.entries = function () { throw new Error("poisoned entries"); };
    Object.values = function () { throw new Error("poisoned values"); };
    JSON.stringify = function () { throw new Error("poisoned stringify"); };
    WeakSet.prototype.add = function () { throw new Error("poisoned weakset add"); };
    const value = m.buildExpectedWesternTzdb2026cControlledReproductionObservation();
    const verified = m.verifyWesternTzdb2026cControlledReproductionObservationLedger(value);
    const serialized = m.serializeWesternTzdb2026cControlledReproductionObservation(verified);
    if (!expectedRaw.equals(Buffer.from(serialized, "utf8"))) {
      throw new Error("pretty serializer consulted inherited toJSON");
    }
    Array.prototype.map = originalArrayMap;
    Array.prototype.push = originalArrayPush;
    Map.prototype.get = originalMapGet;
    Object.entries = originalObjectEntries;
    Object.values = originalObjectValues;
    JSON.stringify = originalJsonStringify;
    WeakSet.prototype.add = originalWeakSetAdd;
    const loaded = await m.loadWesternTzdb2026cControlledReproductionObservation(
      ${JSON.stringify(PROJECT_ROOT)}
    );
    if (!m.isVerifiedWesternTzdb2026cControlledReproductionObservation(loaded)) {
      throw new Error("held-handle load brand missing");
    }
    if (verified.observationDigest !== ${JSON.stringify(persistedLedger.observationDigest)}) {
      throw new Error("digest forged");
    }
    process.stdout.write(verified.observationDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.observationDigest);
});

test("verifier CLI is fixed-path, narrow, red, and rejects wrong cwd or extra arguments", () => {
  const success = spawnNode(VERIFY_SCRIPT);
  assert.equal(success.status, 0, success.stderr);
  const payload = JSON.parse(success.stdout);
  assert.equal(payload.sourceBindings, "0/28");
  assert.equal(payload.observationSubjects, "0/2");
  assert.equal(payload.transformationProvenanceEstablished, false);
  assert.equal(payload.publicReleaseAuthorized, false);

  const extra = spawnNode(VERIFY_SCRIPT, ["decoy.json"]);
  assert.notEqual(extra.status, 0);
  assert.deepEqual(JSON.parse(extra.stderr), {
    ok: false,
    code: "VERIFY_FAILED",
    message: "受控重放 observation 验证失败。"
  });

  const wrongCwd = spawnNode(VERIFY_SCRIPT, [], { cwd: os.tmpdir() });
  assert.notEqual(wrongCwd.status, 0);
  assert.equal(JSON.parse(wrongCwd.stderr).code, "VERIFY_FAILED");
});

test("visible benign --import, NODE_OPTIONS, and NODE_PATH are rejected by the accidental-misuse guard", () => {
  const actualImport = spawnNodeWithExecArgv(
    VERIFY_SCRIPT,
    ["--import=data:text/javascript,globalThis.__hakimiPreloaded%3Dtrue"]
  );
  assert.notEqual(actualImport.status, 0);
  assert.equal(JSON.parse(actualImport.stderr).code, "VERIFY_FAILED");

  const nodeOptions = spawnNode(VERIFY_SCRIPT, [], {
    env: { NODE_OPTIONS: "--import=data:text/javascript,globalThis.__hakimiPreloaded%3Dtrue" }
  });
  assert.notEqual(nodeOptions.status, 0);
  assert.equal(JSON.parse(nodeOptions.stderr).code, "VERIFY_FAILED");

  const nodePath = spawnNode(VERIFY_SCRIPT, [], { env: { NODE_PATH: "C:\\decoy" } });
  assert.notEqual(nodePath.status, 0);
  assert.equal(JSON.parse(nodePath.stderr).code, "VERIFY_FAILED");
});

test("a preload can erase visible execArgv and enter business verification, so launcher integrity stays false", () => {
  const erased = spawnNodeWithExecArgv(
    VERIFY_SCRIPT,
    ["--import=data:text/javascript,process.execArgv.length%3D0"]
  );
  assert.equal(erased.status, 0, erased.stderr);
  const payload = JSON.parse(erased.stdout);
  assert.equal(payload.ok, true);
  assert.equal(persistedLedger.executionBoundaries.preEntryExecutionOrErasureExcluded, false);
  assert.equal(persistedLedger.executionBoundaries.launcherIntegrityEstablished, false);
});

test("synthetic visible preload and loader flags reject separate and equals forms for writer and verifier", () => {
  const forms = [
    ["--require", "decoy.cjs"],
    ["-r=decoy.cjs"],
    ["--import", "decoy.mjs"],
    ["--import=decoy.mjs"],
    ["--loader", "decoy.mjs"],
    ["--loader=decoy.mjs"],
    ["--experimental-loader", "decoy.mjs"],
    ["--experimental-loader=decoy.mjs"]
  ];
  for (const scriptPath of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    for (const form of forms) {
      const result = spawnLauncherWithVisibleExecArgv(scriptPath, form);
      assert.notEqual(result.status, 0, `${path.basename(scriptPath)} ${form.join(" ")}`);
      assert.equal(
        JSON.parse(result.stderr).code,
        scriptPath === VERIFY_SCRIPT ? "VERIFY_FAILED" : "WRITE_FAILED"
      );
    }
  }
});

test("exclusive writer cannot overwrite the persisted observation", () => {
  const beforeHash = sha256Bytes(persistedBytes);
  const result = spawnNode(WRITE_SCRIPT);
  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EEXIST");
  const after = spawnNode(VERIFY_SCRIPT);
  assert.equal(after.status, 0, after.stderr);
  assert.equal(beforeHash, westernTzdb2026cControlledReproductionObservationTestOnly.EXPECTED_PERSISTED_RAW.rawSha256);
});

test("CLI imports remain guarded when NODE_PATH is non-empty for both writer and verifier", () => {
  for (const scriptPath of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    const result = spawnNode(scriptPath, [], { env: { NODE_PATH: "C:\\forged-node-path" } });
    assert.notEqual(result.status, 0);
    assert.equal(
      JSON.parse(result.stderr).code,
      scriptPath === VERIFY_SCRIPT ? "VERIFY_FAILED" : "WRITE_FAILED"
    );
  }
});

test("doesNotEstablish names provenance, invisibility, legal, expert, release, public and snapshot gaps", () => {
  const text = persistedLedger.doesNotEstablish.join("\n");
  for (const marker of [
    "transformation_provenance",
    "target_invisibility",
    "network_isolation",
    "rights_legal_clearance",
    "content_truth_expert_truth",
    "release_readiness",
    "public_release_authorization",
    "mutation_epoch"
  ]) {
    assert.match(text, new RegExp(marker, "u"));
  }
});
