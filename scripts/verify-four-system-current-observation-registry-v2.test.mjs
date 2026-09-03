import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
  buildCurrentFourSystemObservationRegistryV2,
  canonicalStringifyFourSystemCurrentObservationRegistryV2,
  computeFourSystemCurrentObservationRegistryV2Digest,
  isVerifiedFourSystemCurrentObservationRegistryV2,
  loadFourSystemCurrentObservationRegistryV2,
  serializeFourSystemCurrentObservationRegistryV2,
  fourSystemCurrentObservationRegistryV2TestOnly as testOnly
} from "./four-system-current-observation-registry-v2-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-observation-registry-v2.mjs"
);
const writerPath = path.join(
  workspaceRoot,
  "scripts",
  "write-four-system-current-observation-registry-v2.mjs"
);
const persistedPath = path.resolve(
  workspaceRoot,
  ...FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH.split("/")
);
const builtPromise = buildCurrentFourSystemObservationRegistryV2(workspaceRoot);
const loadedPromise = loadFourSystemCurrentObservationRegistryV2(workspaceRoot);

function sanitizedEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  delete environment.NODE_OPTIONS;
  return environment;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function pinnedSnapshot(overrides = {}) {
  return {
    path: FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
    rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes,
    rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256,
    ...overrides
  };
}

test("registry v2 has one exact canonical persisted identity and a private verified result", async () => {
  const [built, loaded, text] = await Promise.all([
    builtPromise,
    loadedPromise,
    readFile(persistedPath, "utf8")
  ]);
  assert.equal(text, serializeFourSystemCurrentObservationRegistryV2(built));
  assert.equal(Buffer.byteLength(text), 22261);
  assert.equal(
    createHash("sha256").update(text, "utf8").digest("hex"),
    "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39"
  );
  assert.equal(
    built.registryDigest,
    "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
  );
  assert.equal(computeFourSystemCurrentObservationRegistryV2Digest(built), built.registryDigest);
  assert.equal(isVerifiedFourSystemCurrentObservationRegistryV2(loaded), true);
  assert.equal(isVerifiedFourSystemCurrentObservationRegistryV2(structuredClone(loaded)), false);
  assertDeepFrozen(loaded);
});

test("the registry observes Bazi, Ziwei, Western and Vedic in fixed order and pins their current identities", async () => {
  const registry = await builtPromise;
  assert.deepEqual(
    registry.systems.map((entry) => entry.productSystemId),
    ["bazi", "ziwei-doushu", "western-astrology", "vedic-astrology"]
  );
  assert.deepEqual(
    registry.systems.map((entry) => entry.currentMachineIdentity.primary.semanticDigest),
    [
      "5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80",
      "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e",
      "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e",
      "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171"
    ]
  );
  assert.equal(
    registry.systems[2].currentMachineIdentity.secondaryObservation.semanticDigest,
    "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb"
  );
});

test("all 32 admission gates remain false with exact 0/N binding and 0/2 expert ledgers", async () => {
  const registry = await builtPromise;
  assert.deepEqual(
    registry.systems.map((entry) => entry.gateSummary.bindingRequired),
    [12, 27, 28, 38]
  );
  let gateCount = 0;
  for (const system of registry.systems) {
    const gates = Object.values(system.admissionGates);
    gateCount += gates.length;
    assert.equal(gates.length, 8);
    assert.ok(gates.every((entry) => entry.formalGateSatisfied === false));
    assert.equal(system.gateSummary.bindingFrozenVerified, 0);
    assert.equal(system.gateSummary.independentExpertReviewsVerified, 0);
    assert.ok(Object.values(system.authorityBoundary).every((value) => value === false));
  }
  assert.equal(gateCount, 32);
  assert.equal(registry.gateSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(registry.gateSummary.systemsFormallyAdmitted, 0);
});

test("project legacy-v13 governance is context only and is not inherited by the three independent systems", async () => {
  const registry = await builtPromise;
  assert.deepEqual(registry.projectReleaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.deepEqual(
    registry.systems.map((entry) => entry.integrationBoundary.targetSchema),
    [13, null, null, null]
  );
  assert.ok(registry.systems.every((entry) => entry.integrationBoundary.baziAuthorityInherited === false));
  assert.ok(registry.systems.every((entry) => entry.integrationBoundary.mainApplicationIntegrated === false));
});

test("Vedic remains a research observation without manifest, product identity or comparison support", async () => {
  const registry = await builtPromise;
  const vedic = registry.systems[3];
  assert.equal(vedic.productState, "research_boundary_current_observation_no_domain_manifest_no_product_identity");
  assert.deepEqual(vedic.currentMachineIdentity.secondaryObservation, {
    domainReleaseManifestPresent: false,
    productIdentityEstablished: false,
    inputKernelFormalParentIntegrated: false,
    mutationExperimentProductGateSatisfied: false
  });
  assert.equal(registry.crossSystemPolicy.comparisonContract.vedicSupportedByCurrentComparisonContract, false);
  assert.equal(registry.crossSystemPolicy.systemsWithDomainReleaseManifest, 3);
});

test("cross-system arbitration, equivalence, merging and authority inheritance are all prohibited", async () => {
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
  assert.deepEqual(
    policy.nonEquivalentConceptExamples.map((entry) => entry.conceptId),
    ["bazi.wealth_star", "ziwei.wealth_palace", "western.house_2", "vedic.d2_hora"]
  );
});

test("legacy central registry and receipt registry are preserved but explicitly stale for formal use", async () => {
  const registry = await builtPromise;
  assert.deepEqual(registry.lineage.predecessor, testOnly.LEGACY_REGISTRY);
  assert.equal(registry.lineage.predecessorPreservedUnmodified, true);
  assert.equal(registry.lineage.predecessorCurrent, false);
  assert.equal(registry.lineage.replacesOrMutatesPredecessor, false);
  assert.equal(registry.lineage.formalCentralRegistry, false);
  assert.equal(
    registry.crossSystemPolicy.legacyEngineeringReceiptRegistry.consumesThisRegistryV2,
    false
  );
  assert.equal(
    registry.crossSystemPolicy.legacyEngineeringReceiptRegistry.currentForFormalComparison,
    false
  );
});

test("snapshot claims stop at held-handle endpoints and do not claim epoch, interval or ABA closure", async () => {
  const boundary = (await builtPromise).snapshotBoundary;
  assert.equal(boundary.heldHandleEndpointSnapshots, true);
  assert.equal(boundary.crossFileAtomicSnapshot, false);
  assert.equal(boundary.mutationEpochAvailableForSchema13, false);
  assert.equal(boundary.mutationEpochReceipt, null);
  assert.equal(boundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(boundary.abaExcluded, false);
  assert.equal(boundary.registryDigestIsDigitalSignature, false);
});

test("re-signed authority, expert, binding, comparison and epoch promotions remain rejected", async () => {
  const expected = await builtPromise;
  const mutations = [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.systems[1].authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.systems[2].gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.crossSystemPolicy.formalComparisonAuthorized = true; },
    (value) => { value.snapshotBoundary.mutationEpochAvailableForSchema13 = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(expected);
    mutate(candidate);
    candidate.registryDigest = computeFourSystemCurrentObservationRegistryV2Digest(candidate);
    assert.throws(
      () => testOnly.verifyPersistedAgainstExpected(pinnedSnapshot(), candidate, expected),
      (error) => error?.code === "REGISTRY_DIGEST_DRIFT"
    );
  }
});

test("raw identity drift and an unre-signed semantic change fail closed", async () => {
  const expected = await builtPromise;
  assert.throws(
    () => testOnly.verifyPersistedAgainstExpected(
      pinnedSnapshot({ rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes + 1 }),
      expected,
      expected
    ),
    (error) => error?.code === "REGISTRY_RAW_DRIFT"
  );
  const promoted = clone(expected);
  promoted.gateSummary.totalAdmissionGatesSatisfied = 1;
  assert.throws(
    () => testOnly.verifyPersistedAgainstExpected(pinnedSnapshot(), promoted, expected),
    (error) => error?.code === "REGISTRY_DIGEST_DRIFT"
  );
});

test("strict JSON and canonical capture reject duplicate keys, accessors, proxies, aliases and cycles", () => {
  const duplicateBytes = Buffer.from('{"schemaVersion":"2.0.0","schemaVersion":"2.0.0"}\n');
  assert.throws(() => parseBaziDttStrictJsonArtifact({
    path: "duplicate.json",
    rawBytes: duplicateBytes.byteLength,
    rawSha256: createHash("sha256").update(duplicateBytes).digest("hex"),
    bytes: duplicateBytes
  }));

  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    }
  });
  assert.throws(
    () => testOnly.captureCanonical(accessor),
    (error) => error?.code === "NON_CANONICAL_JSON"
  );
  assert.equal(getterCalls, 0);
  assert.throws(() => testOnly.captureCanonical(new Proxy({}, {})));
  const shared = {};
  assert.throws(() => testOnly.captureCanonical({ left: shared, right: shared }));
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => testOnly.captureCanonical(cyclic));
});

test("canonical capture keeps an own __proto__ JSON key without changing the output prototype", () => {
  const input = {};
  Object.defineProperty(input, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "data-only",
    writable: true
  });
  const captured = testOnly.captureCanonical(input);
  assert.equal(Object.getPrototypeOf(captured), Object.prototype);
  assert.equal(Object.hasOwn(captured, "__proto__"), true);
  assert.equal(captured.__proto__, "data-only");
  assert.equal(
    canonicalStringifyFourSystemCurrentObservationRegistryV2(input),
    '{"__proto__":"data-only"}'
  );
});

test("CLI exposes only the calibrated current-observation claims and rejects caller operands", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(stderr, "");
  const report = JSON.parse(stdout);
  assert.equal(report.currentObservationRegistryV2MechanicallyVerified, true);
  assert.equal(report.systemsObserved, 4);
  assert.equal(report.systemsFormallyAdmitted, 0);
  assert.equal(report.totalAdmissionGatesSatisfied, 0);
  assert.equal(report.formalCentralRegistry, false);
  assert.equal(report.formalCrossSystemComparisonAuthorized, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicReleaseAuthorized, false);
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "caller-controlled"], {
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr.includes("CLI_INVOCATION_REJECTED")
  );
});

test("exclusive writer cannot overwrite the frozen registry v2 materialization", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [writerPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1 && error.stderr.includes("EEXIST")
  );
});

test("legacy central and receipt verifiers remain expected-red instead of being re-signed", async () => {
  for (const [script, expectedText] of [
    ["verify-system-admission-registry.mjs", "八字体系 manifest 与当前组件"],
    ["verify-cross-system-engineering-fact-receipts.mjs", "expected-manifest preview 摘要已变化"]
  ]) {
    await assert.rejects(
      () => execFileAsync(process.execPath, [path.join(workspaceRoot, "scripts", script)], {
        cwd: workspaceRoot,
        env: sanitizedEnvironment(),
        encoding: "utf8",
        windowsHide: true
      }),
      (error) => error?.code === 1
        && `${error.stdout}${error.stderr}`.includes(expectedText)
    );
  }
});
