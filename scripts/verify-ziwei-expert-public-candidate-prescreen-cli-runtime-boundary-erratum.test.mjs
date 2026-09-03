import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH,
  ZiweiPrescreenCliRuntimeBoundaryErratumError,
  computeZiweiPrescreenCliRuntimeBoundaryErratumDigest,
  getZiweiPrescreenCliRuntimeBoundaryErratumSummary,
  isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum,
  loadZiweiPrescreenCliRuntimeBoundaryErratum,
  parseZiweiPrescreenCliRuntimeBoundaryErratumJsonBytes,
  serializeZiweiPrescreenCliRuntimeBoundaryErratum,
  verifyZiweiPrescreenCliRuntimeBoundaryErratum,
  ziweiPrescreenCliRuntimeBoundaryErratumTestOnly as testOnly
} from "./ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum-lib.mjs";
import { isVerifiedZiweiExpertPublicCandidatePrescreen } from "./ziwei-expert-public-candidate-prescreen-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ARTIFACT = path.join(ROOT, ...ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH.split("/"));
const CLI = path.join(HERE, "verify-ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum.mjs");
const LEGACY_CLI = path.join(HERE, "verify-ziwei-expert-public-candidate-prescreen.mjs");
const OK_PREFIX = "ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_SCOPE_OK ";
const FAIL_PREFIX = "ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_SCOPE_FAILED ";
const persistedBytes = await readFile(ARTIFACT);
const persisted = JSON.parse(persistedBytes.toString("utf8"));

function cleanEnvironment(extra = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...extra };
}

function mutableCopy(value = persisted) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.erratumDigest = computeZiweiPrescreenCliRuntimeBoundaryErratumDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (reason) => {
    assert.ok(reason instanceof ZiweiPrescreenCliRuntimeBoundaryErratumError);
    assert.equal(reason.code, code);
    return true;
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseCliSummary(stdout) {
  assert.ok(stdout.startsWith(OK_PREFIX), stdout);
  return JSON.parse(stdout.slice(OK_PREFIX.length));
}

test("persisted append-only erratum has exact raw, canonical, digest, deep freeze, and private brand", async () => {
  assert.equal(persistedBytes.byteLength, testOnly.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(sha256(persistedBytes), testOnly.EXPECTED_PERSISTED_RAW.rawSha256);
  assert.equal(persistedBytes.toString("utf8"), serializeZiweiPrescreenCliRuntimeBoundaryErratum(persisted));
  assert.equal(persisted.erratumDigest, computeZiweiPrescreenCliRuntimeBoundaryErratumDigest(persisted));
  const loaded = await loadZiweiPrescreenCliRuntimeBoundaryErratum(ROOT);
  assert.equal(isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(loaded), true);
  assert.equal(isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum({ ...loaded }), false);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.value), true);
  assert.throws(
    () => getZiweiPrescreenCliRuntimeBoundaryErratumSummary({ ...loaded }),
    (reason) => reason?.code === "PRIVATE_BRAND_REQUIRED"
  );
});

test("all five predecessor files retain exact raw identities and zero backlink", async () => {
  const loaded = await loadZiweiPrescreenCliRuntimeBoundaryErratum(ROOT);
  assert.equal(loaded.originalFiveArtifacts.length, 5);
  for (let index = 0; index < testOnly.ORIGINAL_FIVE_ARTIFACTS.length; index += 1) {
    const expected = testOnly.ORIGINAL_FIVE_ARTIFACTS[index];
    const bytes = await readFile(path.join(ROOT, ...expected.path.split("/")));
    assert.equal(bytes.byteLength, expected.rawBytes, expected.path);
    assert.equal(sha256(bytes), expected.rawSha256, expected.path);
    const text = bytes.toString("utf8");
    assert.equal(text.includes(testOnly.ERRATUM_ID), false, expected.path);
    assert.equal(text.includes(ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH), false, expected.path);
  }
  assert.equal(loaded.value.lineageBoundary.originalFiveArtifactsModified, 0);
  assert.equal(loaded.value.lineageBoundary.originalFiveBacklinksAdded, 0);
});

test("predecessor is accepted only through its full-loader private brand and remains zero-instance", async () => {
  const loaded = await loadZiweiPrescreenCliRuntimeBoundaryErratum(ROOT);
  assert.equal(isVerifiedZiweiExpertPublicCandidatePrescreen(loaded.predecessor), true);
  assert.equal(isVerifiedZiweiExpertPublicCandidatePrescreen({ ...loaded.predecessor }), false);
  assert.equal(loaded.predecessor.reviewerSlotsRequired, 2);
  assert.equal(loaded.predecessor.reviewerSlotsOccupied, 0);
  assert.equal(loaded.predecessor.independentExpertReviewsVerified, 0);
  assert.equal(loaded.predecessor.sourceRequirementPartialCandidates, 2);
  assert.equal(loaded.predecessor.sourceBindingsFrozenVerified, 0);
  assert.equal(loaded.predecessor.sourceBindingsRequired, 27);
});

test("two historical operator PoCs are frozen without treating legacy OK as attestation", () => {
  assert.equal(persisted.reproducedOperatorPocs.length, 2);
  assert.deepEqual(
    persisted.reproducedOperatorPocs.map((entry) => entry.launchSurface),
    ["direct_node_exec_argv_import", "node_options_import"]
  );
  for (const entry of persisted.reproducedOperatorPocs) {
    assert.equal(entry.legacyCliExitCode, 0);
    assert.equal(entry.legacyCliStdoutPrefix, testOnly.POC_STDOUT.prefix);
    assert.equal(entry.legacyCliStdoutBytes, testOnly.POC_STDOUT.bytes);
    assert.equal(entry.legacyCliStdoutSha256, testOnly.POC_STDOUT.sha256);
    assert.equal(entry.legacyCliStderrBytes, 0);
    assert.equal(entry.legacyOkOutputTrustedAttestation, false);
    assert.equal(entry.preloadArbitraryLocalCodeExecutionAlreadyAvailable, true);
    assert.equal(entry.newAttackerCapabilityDemonstrated, false);
    assert.equal(entry.networkAttemptedByPoc, false);
    assert.equal(entry.projectFilesModifiedByPoc, false);
  }
});

test("both historical hiding PoCs still reach legacy OK and match the frozen stdout identity", () => {
  const cases = [
    {
      args: ["--import=data:text/javascript,process.execArgv.length=0", LEGACY_CLI],
      env: cleanEnvironment()
    },
    {
      args: [LEGACY_CLI],
      env: cleanEnvironment({
        NODE_OPTIONS: "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS%3Bprocess.execArgv.length%3D0"
      })
    }
  ];
  for (const item of cases) {
    const child = spawnSync(process.execPath, item.args, {
      cwd: ROOT,
      env: item.env,
      encoding: null
    });
    assert.equal(child.status, 0, child.stderr.toString("utf8"));
    assert.equal(child.stderr.byteLength, 0);
    assert.equal(child.stdout.byteLength, testOnly.POC_STDOUT.bytes);
    assert.equal(sha256(child.stdout), testOnly.POC_STDOUT.sha256);
    assert.ok(child.stdout.toString("utf8").startsWith(`${testOnly.POC_STDOUT.prefix} `));
  }
});

test("runtime correction withdraws every overbroad launcher, preload, process, and attestation claim", () => {
  const value = verifyZiweiPrescreenCliRuntimeBoundaryErratum(persisted);
  const correction = value.runtimeClaimCorrection;
  for (const key of [
    "allPreloadsRejected",
    "wholeProcessOffline",
    "cliOutputTrustedAttestation",
    "launcherIdentityEstablished",
    "loaderIdentityEstablished",
    "nodeRuntimeIdentityEstablished",
    "hiddenPreEvaluationExcluded",
    "visibleInputGuardSecurityBoundary",
    "erratumDemonstratesNewAttackerCapability"
  ]) assert.equal(correction[key], false, key);
  assert.equal(correction.visibleInputGuardRejectsOnlyInputsStillVisibleAtCliEvaluationStart, true);
  assert.equal(correction.preloadAlreadyHasArbitraryLocalCodeExecution, true);
  assert.equal(value.postImportPrimordialBoundary.postImportPrimordialPollutionResistanceMechanicallyTested, true);
  assert.equal(value.postImportPrimordialBoundary.liveWeakSetPrototypeAddOrHasUsedByBrandPaths, false);
  assert.equal(value.postImportPrimordialBoundary.preEvaluationPrimordialIntegrityEstablished, false);
  assert.equal(value.postImportPrimordialBoundary.hostilePreloadBlocked, false);
  assert.equal(value.postImportPrimordialBoundary.securityBoundaryPromoted, false);
});

test("post-import primordial pollution cannot mint a fake brand or break a real brand and summary", async () => {
  async function exercise(spoofedIsFrozenValue) {
    const originalWeakSetConstructor = WeakSet;
    const originalWeakSetHas = WeakSet.prototype.has;
    const originalWeakSetAdd = WeakSet.prototype.add;
    const originalObjectDefineProperty = Object.defineProperty;
    const originalObjectIsFrozen = Object.isFrozen;
    const originalObjectFreeze = Object.freeze;
    const originalObjectValues = Object.values;
    const originalReflectApply = Reflect.apply;
    const alreadyVerified = await loadZiweiPrescreenCliRuntimeBoundaryErratum(ROOT);
    const fake = { ...alreadyVerified };
    let fakeBrand;
    let existingRealBrand;
    let fakeSummaryErrorCode;
    let summary;
    let unexpected;
    try {
      WeakSet.prototype.has = () => true;
      WeakSet.prototype.add = () => { throw new Error("polluted WeakSet.add"); };
      globalThis.WeakSet = class PollutedWeakSet {
        constructor() { throw new Error("polluted WeakSet constructor"); }
      };
      Object.defineProperty = () => { throw new Error("polluted Object.defineProperty"); };
      Object.isFrozen = () => spoofedIsFrozenValue;
      Object.freeze = () => { throw new Error("polluted Object.freeze"); };
      Object.values = () => { throw new Error("polluted Object.values"); };
      Reflect.apply = () => { throw new Error("polluted Reflect.apply"); };
      fakeBrand = isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(fake);
      existingRealBrand = isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(alreadyVerified);
      try {
        getZiweiPrescreenCliRuntimeBoundaryErratumSummary(fake);
      } catch (reason) {
        fakeSummaryErrorCode = reason?.code;
      }
      summary = getZiweiPrescreenCliRuntimeBoundaryErratumSummary(alreadyVerified);
    } catch (reason) {
      unexpected = reason;
    } finally {
      globalThis.WeakSet = originalWeakSetConstructor;
      originalWeakSetConstructor.prototype.has = originalWeakSetHas;
      originalWeakSetConstructor.prototype.add = originalWeakSetAdd;
      Object.defineProperty = originalObjectDefineProperty;
      Object.isFrozen = originalObjectIsFrozen;
      Object.freeze = originalObjectFreeze;
      Object.values = originalObjectValues;
      Reflect.apply = originalReflectApply;
    }
    assert.equal(unexpected, undefined);
    assert.equal(fakeBrand, false);
    assert.equal(existingRealBrand, true);
    assert.equal(fakeSummaryErrorCode, "PRIVATE_BRAND_REQUIRED");
    assert.equal(summary.cliOutputTrustedAttestation, false);
    assert.equal(summary.wholeProcessOffline, false);
    assert.equal(summary.postImportPrimordialPollutionResistanceMechanicallyTested, true);
    assert.equal(summary.preEvaluationPrimordialIntegrityEstablished, false);
    assert.equal(originalObjectIsFrozen(summary), true);
  }

  await exercise(true);
  await exercise(false);
  const basis = await readFile(
    path.join(ROOT, ...testOnly.BASIS_ARTIFACT.path.split("/")),
    "utf8"
  );
  assert.ok(basis.includes(
    "污染前已由 full loader 铸造的真实品牌在导入后污染下仍可验真并生成 summary。污染后重新调用 loader 不承诺成功，允许 fail closed。"
  ));
  assert.equal(basis.includes("污染后重新加载的真实品牌仍必须工作"), false);
});

test("own-source network check remains explicitly static and not whole-process evidence", async () => {
  const loaded = await loadZiweiPrescreenCliRuntimeBoundaryErratum(ROOT);
  assert.equal(loaded.ownSourceForbiddenDirectNetworkTokensFound, 0);
  assert.equal(loaded.value.fixedVerifierStaticScope.scope, "own_source_static_token_absence_only");
  assert.equal(loaded.value.fixedVerifierStaticScope.normalCleanInvocationRefetchesPublicSources, false);
  assert.equal(loaded.value.fixedVerifierStaticScope.transitiveWholeProcessNetworkAbsenceEstablished, false);
  assert.equal(loaded.value.fixedVerifierStaticScope.preloadOrLoaderHookNetworkAbsenceEstablished, false);
  for (const relativePath of testOnly.OWN_SOURCE_PATHS) {
    const source = await readFile(path.join(ROOT, ...relativePath.split("/")), "utf8");
    for (const token of testOnly.FORBIDDEN_DIRECT_NETWORK_TOKENS) {
      assert.equal(source.includes(token), false, `${relativePath}: ${token}`);
    }
    if (relativePath.endsWith("-lib.mjs")) {
      assert.doesNotMatch(source, /\.(?:add|has)\s*\(/u);
      for (const marker of [
        "const NATIVE_WEAK_SET = WeakSet;",
        "const WEAK_SET_ADD = WeakSet.prototype.add;",
        "const WEAK_SET_HAS = WeakSet.prototype.has;",
        "const REFLECT_APPLY = Reflect.apply;",
        "const OBJECT_DEFINE_PROPERTY = Object.defineProperty;",
        "const OBJECT_FREEZE = Object.freeze;",
        "const OBJECT_IS_FROZEN = Object.isFrozen;",
        "const OBJECT_VALUES = Object.values;"
      ]) assert.ok(source.includes(marker), marker);
    }
  }
});

test("expert, source, formal/current endpoint, release, time, and epoch accounts all remain red", () => {
  const value = verifyZiweiPrescreenCliRuntimeBoundaryErratum(persisted);
  assert.deepEqual(value.zeroState, {
    publicCandidateLeadsObserved: 4,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    sourceRequirementPartialCandidates: 2,
    sourceBindingsRequired: 27,
    sourceBindingsFrozenVerified: 0,
    formalExpertEntriesAdded: 0,
    currentExpertEntriesAdded: 0,
    formalOrCurrentEndpointIntegrationsAdded: 0
  });
  for (const flag of Object.values(value.authorityBoundary)) assert.equal(flag, false);
  assert.equal(value.releaseGovernance.activeLine, "legacy-v13");
  assert.equal(value.releaseGovernance.targetSchema, 13);
  assert.equal(value.releaseGovernance.migrationId, null);
  assert.equal(value.releaseGovernance.mutationEpochAvailableForSchema13, false);
  assert.equal(value.releaseGovernance.mutationEpochReceipt, null);
  for (const key of [
    "trustedTimestampEstablished",
    "externalTimeAuthorityEstablished",
    "serverDateHeaderCaptured",
    "firstSeenEstablished",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailable",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded",
    "runtimeLauncherIdentityEstablished",
    "loaderHookIdentityEstablished",
    "nodeRuntimeIdentityEstablished",
    "hiddenPreEvaluationExcluded"
  ]) assert.equal(value.observationBoundary[key], false, key);
  assert.equal(value.observationBoundary.mutationEpochReceipt, null);
  assert.equal(value.lineageBoundary.activeAdmissionEffect, "none");
  for (const key of [
    "predecessorLedgerReplaced",
    "formalManifestIntegrated",
    "formalRegistryIntegrated",
    "currentRegistryIntegrated",
    "fourSystemEndpointIntegrated",
    "defaultBuildOrRuntimeIntegrated"
  ]) assert.equal(value.lineageBoundary[key], false, key);
});

test("self-resealed runtime, authority, zero-state, and integration promotions fail closed", () => {
  for (const key of [
    "allPreloadsRejected",
    "wholeProcessOffline",
    "cliOutputTrustedAttestation",
    "launcherIdentityEstablished",
    "loaderIdentityEstablished",
    "nodeRuntimeIdentityEstablished",
    "hiddenPreEvaluationExcluded",
    "visibleInputGuardSecurityBoundary"
  ]) {
    const candidate = mutableCopy();
    candidate.runtimeClaimCorrection[key] = true;
    expectCode(() => verifyZiweiPrescreenCliRuntimeBoundaryErratum(reseal(candidate)), "RUNTIME_CLAIM_PROMOTION_FORBIDDEN");
  }
  for (const key of [
    "preEvaluationPrimordialIntegrityEstablished",
    "hostilePreloadBlocked",
    "securityBoundaryPromoted"
  ]) {
    const candidate = mutableCopy();
    candidate.postImportPrimordialBoundary[key] = true;
    expectCode(
      () => verifyZiweiPrescreenCliRuntimeBoundaryErratum(reseal(candidate)),
      "PRE_EVALUATION_CLAIM_PROMOTION_FORBIDDEN"
    );
  }
  for (const key of testOnly.AUTHORITY_KEYS) {
    const candidate = mutableCopy();
    candidate.authorityBoundary[key] = true;
    expectCode(() => verifyZiweiPrescreenCliRuntimeBoundaryErratum(reseal(candidate)), "AUTHORITY_PROMOTION_FORBIDDEN");
  }
  for (const mutate of [
    (value) => { value.zeroState.independentExpertReviewsVerified = 1; },
    (value) => { value.zeroState.sourceBindingsFrozenVerified = 1; },
    (value) => { value.zeroState.formalExpertEntriesAdded = 1; },
    (value) => { value.zeroState.currentExpertEntriesAdded = 1; },
    (value) => { value.zeroState.formalOrCurrentEndpointIntegrationsAdded = 1; },
    (value) => { value.lineageBoundary.activeAdmissionEffect = "candidate"; },
    (value) => { value.lineageBoundary.originalFiveArtifactsModified = 1; },
    (value) => { value.lineageBoundary.originalFiveBacklinksAdded = 1; }
  ]) {
    const candidate = mutableCopy();
    mutate(candidate);
    expectCode(() => verifyZiweiPrescreenCliRuntimeBoundaryErratum(reseal(candidate)), "ZERO_EFFECT_PROMOTION_FORBIDDEN");
  }
});

test("ordinary unknown fields, self-digest drift, duplicate keys, BOM, and invalid UTF-8 fail closed", () => {
  const unknown = mutableCopy();
  unknown.claim = false;
  expectCode(
    () => verifyZiweiPrescreenCliRuntimeBoundaryErratum(reseal(unknown)),
    "ERRATUM_CONTRACT_MISMATCH"
  );
  const stale = mutableCopy();
  stale.status = "promoted";
  expectCode(() => verifyZiweiPrescreenCliRuntimeBoundaryErratum(stale), "ERRATUM_DIGEST_MISMATCH");
  for (const bytes of [
    Buffer.from('{"a":1,"a":2}', "utf8"),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}", "utf8")]),
    Buffer.from([0xc3, 0x28])
  ]) {
    expectCode(
      () => parseZiweiPrescreenCliRuntimeBoundaryErratumJsonBytes(bytes, "negative.json"),
      "ERRATUM_JSON_INVALID"
    );
  }
});

test("scope-explicit CLI succeeds cleanly and reports false trust and whole-process claims", () => {
  const child = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    env: cleanEnvironment(),
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  const summary = parseCliSummary(child.stdout);
  assert.equal(summary.scope, "own_source_static_token_absence_only");
  assert.equal(summary.historicalPreloadLimitationsRecorded, 2);
  assert.equal(summary.visibleInputGuardSecurityBoundary, false);
  assert.equal(summary.allPreloadsRejected, false);
  assert.equal(summary.wholeProcessOffline, false);
  assert.equal(summary.cliOutputTrustedAttestation, false);
  assert.equal(summary.launcherIdentityEstablished, false);
  assert.equal(summary.loaderIdentityEstablished, false);
  assert.equal(summary.nodeRuntimeIdentityEstablished, false);
  assert.equal(summary.hiddenPreEvaluationExcluded, false);
  assert.equal(summary.postImportPrimordialPollutionResistanceMechanicallyTested, true);
  assert.equal(summary.preEvaluationPrimordialIntegrityEstablished, false);
  assert.equal(summary.reviewerSlots, "0/2");
  assert.equal(summary.sourceBindings, "0/27");
  assert.equal(summary.sourceRequirementPartialCandidates, 2);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
  assert.equal(summary.mutationEpochReceipt, null);
});

test("scope-explicit CLI rejects args, wrong cwd, and preload markers still visible at evaluation", () => {
  const cases = [
    {
      args: [CLI, "unexpected"], cwd: ROOT, env: cleanEnvironment(),
      code: "CLI_ARGUMENTS_REJECTED"
    },
    {
      args: [CLI], cwd: os.tmpdir(), env: cleanEnvironment(),
      code: "FIXED_WORKSPACE_ROOT_REQUIRED"
    },
    {
      args: [CLI], cwd: ROOT, env: cleanEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
      code: "STILL_VISIBLE_PRELOAD_ENVIRONMENT_REJECTED"
    },
    {
      args: [CLI], cwd: ROOT, env: cleanEnvironment({ NODE_PATH: "." }),
      code: "STILL_VISIBLE_PRELOAD_ENVIRONMENT_REJECTED"
    },
    {
      args: ["--import=data:text/javascript,globalThis.__ziweiErratumVisible=true", CLI],
      cwd: ROOT, env: cleanEnvironment(), code: "STILL_VISIBLE_PRELOAD_EXECARGV_REJECTED"
    }
  ];
  for (const item of cases) {
    const child = spawnSync(process.execPath, item.args, {
      cwd: item.cwd,
      env: item.env,
      encoding: "utf8"
    });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(child.stderr, `${FAIL_PREFIX}${item.code}\n`);
  }
});

test("a hidden preload may reach the new scope output but cannot turn its false trust fields true", () => {
  const cases = [
    {
      args: ["--import=data:text/javascript,process.execArgv.length=0", CLI],
      env: cleanEnvironment()
    },
    {
      args: [CLI],
      env: cleanEnvironment({
        NODE_OPTIONS: "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS%3Bprocess.execArgv.length%3D0"
      })
    }
  ];
  for (const item of cases) {
    const child = spawnSync(process.execPath, item.args, {
      cwd: ROOT,
      env: item.env,
      encoding: "utf8"
    });
    assert.equal(child.status, 0, child.stderr);
    const summary = parseCliSummary(child.stdout);
    assert.equal(summary.visibleInputGuardSecurityBoundary, false);
    assert.equal(summary.allPreloadsRejected, false);
    assert.equal(summary.wholeProcessOffline, false);
    assert.equal(summary.cliOutputTrustedAttestation, false);
    assert.equal(summary.hiddenPreEvaluationExcluded, false);
  }
});

test("CLI import is side-effect free", () => {
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(CLI).href)});process.stdout.write("imported")`],
    { cwd: ROOT, env: cleanEnvironment(), encoding: "utf8" }
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "imported");
  assert.equal(child.stderr, "");
});
