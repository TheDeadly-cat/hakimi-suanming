import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_RELATIVE_PATH,
  baziDomainReleaseManifestV22TestOnly,
  buildCurrentBaziDomainReleaseManifestV22,
  computeBaziDomainReleaseManifestV22Digest,
  getBaziDomainReleaseManifestV22Summary,
  isVerifiedBaziDomainReleaseManifestV22,
  loadBaziDomainReleaseManifestV22,
  serializeBaziDomainReleaseManifestV22
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.resolve(workspaceRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_RELATIVE_PATH);
const cliPath = path.resolve(workspaceRoot, "scripts/verify-bazi-domain-release-manifest-v2-2.mjs");
const cliUrl = pathToFileURL(cliPath).href;
const OK_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_OBSERVATION_OK ";
const FAILED_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_2_FAILED";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.resolve(workspaceRoot, relativePath), "utf8"));
}

function component(manifest, componentId) {
  const matches = manifest.components.filter((entry) => entry.componentId === componentId);
  assert.equal(matches.length, 1);
  return matches[0];
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  const keys = Reflect.ownKeys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, keys[index]);
    assert.ok(descriptor && "value" in descriptor);
    assertDeepFrozen(descriptor.value, seen);
  }
}

function resigned(expected, mutate) {
  const forged = cloneJson(expected);
  mutate(forged);
  forged.manifestDigest = computeBaziDomainReleaseManifestV22Digest(forged);
  return forged;
}

function expectCode(code) {
  return (error) => error?.code === code;
}

const fixturePromise = (async () => {
  const readiness = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assert.equal(isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(readiness), true);
  const predecessor = await json(baziDomainReleaseManifestV22TestOnly.PREDECESSOR_V21.path);
  const carrier = await json(baziDomainReleaseManifestV22TestOnly.CARRIER_V11.path);
  const reconciliation = await json(baziDomainReleaseManifestV22TestOnly.RECONCILIATION_V1.path);
  const expected = await buildCurrentBaziDomainReleaseManifestV22(workspaceRoot);
  const loaded = await loadBaziDomainReleaseManifestV22(workspaceRoot);
  return { readiness, predecessor, carrier, reconciliation, expected, loaded };
})();

test("full loader returns the sole current private brand and a recursively frozen manifest", async () => {
  const { loaded } = await fixturePromise;
  assert.equal(isVerifiedBaziDomainReleaseManifestV22(loaded), true);
  assertDeepFrozen(loaded);
  assert.equal(loaded.manifest.schemaVersion, "2.2.0");
  assert.equal(loaded.manifest.lineage.directCurrentPrivateBrandCount, 1);
});

test("persisted raw identity, self digest, and builder serialization are exact", async () => {
  const { expected, loaded } = await fixturePromise;
  const bytes = await readFile(artifactPath);
  assert.equal(bytes.byteLength, 23399);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d");
  assert.equal(loaded.manifestDigest,
    "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e");
  assert.equal(computeBaziDomainReleaseManifestV22Digest(loaded.manifest), loaded.manifestDigest);
  assert.equal(serializeBaziDomainReleaseManifestV22(expected), bytes.toString("utf8"));
});

test("source bundle changes only the readiness slot to v1.9", async () => {
  const { predecessor, loaded } = await fixturePromise;
  const before = component(predecessor, "source_bundle");
  const after = component(loaded.manifest, "source_bundle");
  assert.equal(after.files.length, 5);
  assert.deepEqual(after.files.slice(0, 2), before.files.slice(0, 2));
  assert.deepEqual(after.files.slice(3), before.files.slice(3));
  assert.deepEqual(after.files[2], {
    path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
    rawBytes: 45551,
    sha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797"
  });
  assert.equal(after.digest, "a0d189306a10c2d50d3dee70eeee1e2b99a7239ee014dbcc531aa0dd2fd40523");
});

test("rights bundle appends only knowledge-core and Web audit identities", async () => {
  const { predecessor, loaded } = await fixturePromise;
  const before = component(predecessor, "rights_bundle");
  const after = component(loaded.manifest, "rights_bundle");
  assert.deepEqual(after.files.slice(0, 4), before.files);
  assert.deepEqual(after.files.slice(4), [
    {
      path: "packages/knowledge-core/src/index.ts",
      rawBytes: 41040,
      sha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
    },
    {
      path: "apps/web/bundled-knowledge-audit.ts",
      rawBytes: 12271,
      sha256: "d7d35bbfe5dfa50674f2d51667ea0c970cdb7e57082ac0d2fdca90e4888fb3c1"
    }
  ]);
  assert.equal(after.digest, "0e1178b768e3a4277d951f0234c325dc01e06bdb128a74f56960d1cf180afd4d");
});

test("the other eight components remain canonical-exact with v2.1", async () => {
  const { predecessor, loaded } = await fixturePromise;
  for (let index = 0; index < predecessor.components.length; index += 1) {
    const id = predecessor.components[index].componentId;
    if (id !== "source_bundle" && id !== "rights_bundle") {
      assert.deepEqual(loaded.manifest.components[index], predecessor.components[index], id);
    }
  }
});

test("Stage-C candidate and Vite call-site are absent from the active component surface", async () => {
  const { loaded } = await fixturePromise;
  const paths = loaded.manifest.components.flatMap((entry) => entry.files.map((file) => file.path));
  assert.equal(paths.some((entry) => entry.includes("bazi-stage-c-material-admission-candidate")), false);
  assert.equal(paths.includes("apps/web/vite.config.ts"), false);
  assert.equal(loaded.manifest.gateState.stageCMaterialAdmissionCandidateActiveSurfaceIncluded, false);
  assert.equal(loaded.manifest.gateState.productionWebCallSitePinned, false);
});

test("one current brand and three historical contexts are explicitly separated", async () => {
  const { loaded } = await fixturePromise;
  const contexts = loaded.manifest.verifiedMechanicalContexts;
  assert.equal(contexts.length, 6);
  assert.equal(contexts.filter((entry) => entry.privateBrandVerified && entry.brandCurrent).length, 1);
  assert.equal(contexts[0].contextId, baziDomainReleaseManifestV22TestOnly.READINESS_V19.ledgerId);
  for (let index = 1; index <= 3; index += 1) {
    assert.equal(contexts[index].privateBrandVerified, false);
    assert.equal(contexts[index].brandCurrent, false);
    assert.equal(contexts[index].historicalRawIdentityVerified, true);
    assert.equal(contexts[index].historicalSelfDigestVerified, true);
    assert.equal(contexts[index].historicalSelectedRedSemanticsVerified, true);
    assert.equal(contexts[index].recursiveFullLoaderCurrent, false);
    assert.equal(contexts[index].recursiveFailureCode, "BOUND_READINESS_BASIS_DRIFT");
    assert.equal(contexts[index].activeAdmissionEffect, "none");
  }
});

test("historical v2.1, carrier, and privacy records pass local self-digest and red semantics", async () => {
  const { predecessor, carrier, reconciliation } = await fixturePromise;
  assert.doesNotThrow(() => baziDomainReleaseManifestV22TestOnly.assertHistoricalManifest(predecessor));
  assert.doesNotThrow(() => baziDomainReleaseManifestV22TestOnly.assertHistoricalCarrier(carrier));
  assert.doesNotThrow(() => baziDomainReleaseManifestV22TestOnly.assertHistoricalReconciliation(reconciliation));
});

test("each historical self digest or selected red semantic drift fails closed", async () => {
  const { predecessor, carrier, reconciliation } = await fixturePromise;
  const forgedManifest = cloneJson(predecessor);
  forgedManifest.authorityBoundary.releaseReady = true;
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.assertHistoricalManifest(forgedManifest),
    expectCode("HISTORICAL_SEMANTIC_IDENTITY_MISMATCH")
  );
  const forgedCarrier = cloneJson(carrier);
  forgedCarrier.counts.formalSourceRightsRecords = 1;
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.assertHistoricalCarrier(forgedCarrier),
    expectCode("HISTORICAL_SEMANTIC_IDENTITY_MISMATCH")
  );
  const forgedReconciliation = cloneJson(reconciliation);
  forgedReconciliation.privacyBoundary.safeToPublish = true;
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.assertHistoricalReconciliation(forgedReconciliation),
    expectCode("HISTORICAL_SEMANTIC_IDENTITY_MISMATCH")
  );
});

test("a structural clone cannot substitute for the readiness v1.9 brand", async () => {
  const { readiness, predecessor, carrier, reconciliation } = await fixturePromise;
  const clone = cloneJson(readiness);
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.buildFromVerifiedInputs({
      readiness: clone, predecessor, carrier, reconciliation
    }),
    expectCode("READINESS_V19_BRAND_REQUIRED")
  );
});

test("re-signed current-brand, historical-brand, and failure-code elevation is rejected", async () => {
  const { expected } = await fixturePromise;
  for (const mutate of [
    (value) => { value.gateState.directCurrentPrivateBrandCount = 2; },
    (value) => { value.verifiedMechanicalContexts[1].brandCurrent = true; },
    (value) => { value.verifiedMechanicalContexts[2].privateBrandVerified = true; },
    (value) => { value.verifiedMechanicalContexts[3].recursiveFullLoaderCurrent = true; },
    (value) => { value.gateState.historicalRecursiveFullLoaderFailureCode = "VERIFICATION_FAILED"; }
  ]) {
    assert.throws(
      () => baziDomainReleaseManifestV22TestOnly.assertPersistedSemantic(resigned(expected, mutate), expected),
      expectCode("MANIFEST_MISMATCH")
    );
  }
});

test("re-signed production closure, Stage-C inclusion, and authority elevation is rejected", async () => {
  const { expected } = await fixturePromise;
  for (const mutate of [
    (value) => { value.gateState.productionWebConsumerClosureEstablished = true; },
    (value) => { value.gateState.productionWebCallSitePinned = true; },
    (value) => { value.gateState.productionBodyInventoryAndBytesAudited = true; },
    (value) => { value.gateState.currentBuildGateExecuted = true; },
    (value) => { value.gateState.stageCMaterialAdmissionCandidateActiveSurfaceIncluded = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; }
  ]) {
    assert.throws(
      () => baziDomainReleaseManifestV22TestOnly.assertPersistedSemantic(resigned(expected, mutate), expected),
      expectCode("MANIFEST_MISMATCH")
    );
  }
});

test("re-signed component addition, removal, and reordering is rejected", async () => {
  const { expected } = await fixturePromise;
  for (const mutate of [
    (value) => { component(value, "source_bundle").files.splice(2, 1); },
    (value) => { component(value, "rights_bundle").files.pop(); },
    (value) => { component(value, "rights_bundle").files.reverse(); },
    (value) => {
      component(value, "rights_bundle").files.push({
        path: "packages/bazi-stage-c-material-admission-candidate/src/index.ts",
        rawBytes: 1,
        sha256: "0".repeat(64)
      });
    }
  ]) {
    assert.throws(
      () => baziDomainReleaseManifestV22TestOnly.assertPersistedSemantic(resigned(expected, mutate), expected),
      expectCode("MANIFEST_MISMATCH")
    );
  }
});

test("binding, expert, privacy, truth, legal, and release gates remain red", async () => {
  const { loaded } = await fixturePromise;
  const summary = getBaziDomainReleaseManifestV22Summary(loaded);
  assert.deepEqual({
    binding: [summary.bindingFrozenVerified, summary.bindingRequired],
    experts: [summary.independentExpertReviewsVerified, summary.independentExpertsRequired],
    records: [summary.formalKnowledgeDocuments, summary.formalSourceRightsRecords,
      summary.formalSourceCarrierRecords],
    privacy: [summary.collectionAuthorized, summary.personDataPresenceAssessed,
      summary.personDerivedDigestExcluded, summary.safeToPublish],
    authority: [summary.contentTruthEstablished, summary.expertTruthEstablished,
      summary.rightsLegalConclusionEstablished, summary.releaseReady,
      summary.publicDeploymentAuthorized, summary.expertClaimsAuthorized]
  }, {
    binding: [0, 12],
    experts: [0, 2],
    records: [0, 0, 0],
    privacy: [false, false, false, false],
    authority: [false, false, false, false, false, false]
  });
  assert.equal(summary.activeAdmissionEffect, "none");
});

test("governance and mutation boundaries remain legacy-v13 / 13 / null and fail closed", async () => {
  const { loaded } = await fixturePromise;
  const summary = getBaziDomainReleaseManifestV22Summary(loaded);
  assert.deepEqual({
    releaseIdentity: summary.releaseIdentity,
    targetSchema: summary.targetSchema,
    migrationId: summary.migrationId,
    atomic: summary.crossFileAtomicSnapshot,
    epoch: summary.mutationEpochAvailableForSchema13,
    receipt: summary.mutationEpochReceipt,
    interval: summary.intervalMutationExcludedAcrossFiles,
    aba: summary.abaExcluded,
    replay: summary.replayExcluded
  }, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    atomic: false,
    epoch: false,
    receipt: null,
    interval: false,
    aba: false,
    replay: false
  });
});

test("runtime, loader, launcher, CLI, and hidden-preload trust remain unestablished", async () => {
  const { loaded } = await fixturePromise;
  const summary = getBaziDomainReleaseManifestV22Summary(loaded);
  assert.deepEqual({
    hidden: summary.hiddenPreloadExcluded,
    node: summary.nodeRuntimeIdentityEstablished,
    loader: summary.loaderIdentityEstablished,
    launcher: summary.runtimeLauncherIdentityEstablished,
    cli: summary.cliOutputTrustedAttestation,
    guard: summary.visibleLoaderGuardIsSecurityBoundary,
    assumption: summary.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution
  }, { hidden: false, node: false, loader: false, launcher: false, cli: false, guard: false, assumption: true });
});

test("summary requires the private v2.2 brand", async () => {
  const { loaded } = await fixturePromise;
  assert.throws(
    () => getBaziDomainReleaseManifestV22Summary(cloneJson(loaded)),
    expectCode("MANIFEST_V22_BRAND_REQUIRED")
  );
});

test("WeakSet prototype poisoning cannot forge the manifest brand", async () => {
  const { loaded } = await fixturePromise;
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziDomainReleaseManifestV22(cloneJson(loaded)), false);
    assert.equal(isVerifiedBaziDomainReleaseManifestV22(loaded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("selective Map-iterator prototype poisoning cannot skip component identity reads", async () => {
  const iteratorPrototype = Object.getPrototypeOf(new Map().values());
  const originalNext = iteratorPrototype.next;
  const fakeManifest = {
    components: [{
      componentId: "probe",
      files: [{
        path: "scripts/bazi-domain-release-manifest-v2-2-lib.mjs",
        rawBytes: 1,
        sha256: "0".repeat(64)
      }]
    }]
  };
  try {
    iteratorPrototype.next = () => ({ done: true, value: undefined });
    await assert.rejects(
      baziDomainReleaseManifestV22TestOnly.verifyComponentFileIdentities(workspaceRoot, fakeManifest),
      expectCode("COMPONENT_FILE_IDENTITY_DRIFT")
    );
  } finally {
    iteratorPrototype.next = originalNext;
  }
});

test("canonical digest rejects Proxy and exotic Array prototypes", () => {
  const proxy = new Proxy({ value: 1 }, {});
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.canonicalStringify(proxy),
    expectCode("NON_PASSIVE_OBJECT")
  );
  const exotic = [1, 2];
  Object.setPrototypeOf(exotic, Object.create(Array.prototype));
  assert.throws(
    () => baziDomainReleaseManifestV22TestOnly.canonicalStringify(exotic),
    expectCode("NON_PASSIVE_OBJECT")
  );
});

test("canonical digest rejects accessor, sparse array, aliases, -0, and excessive depth", () => {
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get: () => 1 });
  assert.throws(() => baziDomainReleaseManifestV22TestOnly.canonicalStringify(accessor),
    expectCode("NON_PASSIVE_OBJECT"));
  assert.throws(() => baziDomainReleaseManifestV22TestOnly.canonicalStringify(new Array(1)),
    expectCode("NON_JSON_ARRAY_SHAPE"));
  const shared = {};
  assert.throws(() => baziDomainReleaseManifestV22TestOnly.canonicalStringify({ left: shared, right: shared }),
    expectCode("NON_TREE_JSON"));
  assert.throws(() => baziDomainReleaseManifestV22TestOnly.canonicalStringify({ value: -0 }),
    expectCode("NON_JSON_VALUE"));
  let deep = {};
  for (let index = 0; index < 100; index += 1) deep = { child: deep };
  assert.throws(() => baziDomainReleaseManifestV22TestOnly.canonicalStringify(deep),
    expectCode("VALUE_LIMIT_EXCEEDED"));
});

test("post-import JSON, String, Array iterator, and inherited toJSON tampering cannot rewrite summary", async () => {
  const { loaded } = await fixturePromise;
  const originalStringify = JSON.stringify;
  const originalString = globalThis.String;
  const originalIterator = Array.prototype[Symbol.iterator];
  const originalToJSON = Object.prototype.toJSON;
  try {
    JSON.stringify = () => "forged";
    globalThis.String = () => "forged";
    Array.prototype[Symbol.iterator] = function* poisoned() { yield "forged"; };
    Object.prototype.toJSON = () => ({ releaseReady: true });
    const summary = getBaziDomainReleaseManifestV22Summary(loaded);
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.directCurrentPrivateBrandCount, 1);
    assert.equal(summary.artifact.sha256,
      "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d");
    assertDeepFrozen(summary);
  } finally {
    JSON.stringify = originalStringify;
    globalThis.String = originalString;
    Array.prototype[Symbol.iterator] = originalIterator;
    if (originalToJSON === undefined) delete Object.prototype.toJSON;
    else Object.prototype.toJSON = originalToJSON;
  }
});

test("CLI emits the narrow observation with all authority boundaries still red", () => {
  const result = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.ok(result.stdout.startsWith(OK_PREFIX));
  const output = JSON.parse(result.stdout.slice(OK_PREFIX.length));
  assert.equal(output.contextAccounting.directCurrentPrivateBrands, 1);
  assert.equal(output.contextAccounting.historicalRawSemanticContexts, 3);
  assert.equal(output.productionBoundary.webCallSitePinned, false);
  assert.equal(output.productionBoundary.bodyInventoryAndBytesAudited, false);
  assert.equal(output.productionBoundary.stageCCandidateActiveSurfaceIncluded, false);
  assert.equal(output.redGates.binding, "0/12");
  assert.equal(output.redGates.experts, "0/2");
  assert.equal(output.redGates.releaseReady, false);
  assert.equal(output.redGates.publicDeploymentAuthorized, false);
  assert.equal(output.governance.releaseIdentity, "legacy-v13");
});

test("CLI rejects extra argv, NODE_OPTIONS, and visible --import without leaking paths", () => {
  const cases = [
    { args: [cliPath, "extra"], env: { ...process.env, NODE_OPTIONS: "" } },
    { args: [cliPath], env: { ...process.env, NODE_OPTIONS: "--trace-warnings" } },
    { args: ["--import", "data:text/javascript,", cliPath], env: { ...process.env, NODE_OPTIONS: "" } }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const result = spawnSync(process.execPath, cases[index].args, {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: cases[index].env
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.trim(), `${FAILED_PREFIX} CLI_INVOCATION_REJECTED`);
    assert.equal(result.stderr.includes(workspaceRoot), false);
  }
});

test("importing the CLI is side-effect free", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import(${JSON.stringify(cliUrl)})`], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});
