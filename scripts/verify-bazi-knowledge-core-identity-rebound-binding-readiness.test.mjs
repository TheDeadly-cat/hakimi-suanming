import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdtemp, open, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
  baziKnowledgeCoreIdentityReboundBindingReadinessTestOnly as testOnly,
  buildBaziKnowledgeCoreIdentityReboundBindingReadiness,
  computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest,
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness,
  serializeBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.resolve(
  workspaceRoot,
  ...BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH.split("/")
);
const cliPath = path.resolve(
  workspaceRoot,
  "scripts/verify-bazi-knowledge-core-identity-rebound-binding-readiness.mjs"
);
const libPath = path.resolve(
  workspaceRoot,
  "scripts/bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs"
);

const fixturePromise = (async () => {
  const result = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  const expected = await testOnly.loadExpectedBundle(workspaceRoot);
  const persisted = JSON.parse(await readFile(artifactPath, "utf8"));
  return { result, expected, persisted };
})();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.ledgerDigest = computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(value);
  return value;
}

function rejectsResigned(value, expected, pattern = /MISMATCH/) {
  assert.throws(
    () => testOnly.assertPersistedSemantic(resign(value), expected.ledger, expected.predecessor),
    pattern
  );
}

test("loader returns the private branded frozen v1.9 raw and semantic identity", async () => {
  const { result } = await fixturePromise;
  assert.equal(isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.ledgerId, "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0");
  assert.equal(result.ledgerDigest,
    "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1");
  assert.deepEqual(result.artifact, {
    path: BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_RELATIVE_PATH,
    bytes: 45551,
    sha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797"
  });
});

test("artifact bytes independently match the frozen raw SHA-256", async () => {
  const bytes = await readFile(artifactPath);
  assert.equal(bytes.byteLength, 45551);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797");
});

test("v1.8 is a fixed historical predecessor without a current private brand", async () => {
  const { persisted, result } = await fixturePromise;
  assert.deepEqual(persisted.supersedes, {
    path: testOnly.PREDECESSOR.path,
    rawBytes: testOnly.PREDECESSOR.rawBytes,
    rawSha256: testOnly.PREDECESSOR.rawSha256,
    ledgerId: testOnly.PREDECESSOR.semanticId,
    ledgerDigest: testOnly.PREDECESSOR.semanticDigest,
    status: testOnly.PREDECESSOR.status,
    createdAt: testOnly.PREDECESSOR.createdAt
  });
  assert.equal(persisted.lineage.predecessorCurrent, false);
  assert.equal(persisted.lineage.predecessorPrivateBrandConsumed, false);
  assert.equal(result.predecessorCurrent, false);
  assert.equal(result.predecessorPrivateBrandConsumed, false);
});

test("all historical raw and embedded semantic tuple observations explicitly remain unbranded", async () => {
  const { persisted, result } = await fixturePromise;
  const gate = persisted.knowledgeCoreIdentityReboundGate;
  assert.equal(gate.historicalSemanticObservations.length, 8);
  assert.equal(gate.historicalRawObservations.length, 2);
  for (const observation of [
    ...gate.historicalSemanticObservations,
    ...gate.historicalRawObservations
  ]) {
    assert.equal(observation.brandCurrent, false);
    assert.equal(observation.privateBrandConsumed, false);
    assert.equal(observation.activeAdmissionEffect, "none");
  }
  assert.equal(gate.historicalUpstreamPrivateBrandsInvoked, false);
  assert.equal(result.historicalObservationBrandCurrent, false);
  assert.equal(result.historicalPrivateBrandsConsumed, 0);
  assert.equal(result.historicalUpstreamPrivateBrandsInvoked, false);
});

test("predecessor basis crosswalk is exact and only knowledge-core ordinal 5 changes", async () => {
  const { expected, persisted } = await fixturePromise;
  assert.doesNotThrow(() => testOnly.assertPredecessorBasisCrosswalk(expected.predecessor));
  assert.doesNotThrow(() => testOnly.assertOnlyKnowledgeCoreBasisChanged(expected.predecessor, persisted));
  assert.deepEqual(persisted.basisArtifacts[4], {
    path: "packages/knowledge-core/src/index.ts",
    bytes: 41040,
    sha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
  });
  assert.equal(persisted.knowledgeCoreIdentityReboundGate.basisArtifactsCanonicalSha256,
    "28f72ce98e84ea272b3abb7bb59fb7baab2da1621f2342691fc9a2c66873d18f");
});

test("all twelve v1.8 binding rows copy exactly with zero row rebind", async () => {
  const { expected, persisted, result } = await fixturePromise;
  assert.equal(persisted.bindings.length, 12);
  assert.equal(testOnly.canonicalStringify(persisted.bindings),
    testOnly.canonicalStringify(expected.predecessor.bindings));
  assert.equal(persisted.lineage.bindingRowsChanged, 0);
  assert.equal(result.bindingRowsChanged, 0);
  assert.equal(persisted.knowledgeCoreIdentityReboundGate.bindingRowsCanonicalSha256,
    "2cd5d5c44b777cc71fa9c022e77b89598341a6aeab8f24c46eb8ccbb5d2b1794");
});

test("all v1.8 gate counts copy exactly and observation counts remain 6/9/8/2/6", async () => {
  const { expected, persisted, result } = await fixturePromise;
  assert.equal(testOnly.canonicalStringify(persisted.gateSummary),
    testOnly.canonicalStringify(expected.predecessor.gateSummary));
  assert.deepEqual([
    result.carrierObservationLayersObserved,
    result.visualPageCorrespondencesObserved,
    result.normalizedFacsimileCollationCandidatesObserved,
    result.exactGlyphFacsimileCorrespondenceCandidatesObserved,
    result.candidateQuoteDigestsObserved
  ], [6, 9, 8, 2, 6]);
});

test("formal records, materialization, reviewers, legal, experts and binding remain zero", async () => {
  const { result } = await fixturePromise;
  assert.deepEqual([
    result.formalKnowledgeDocumentCount,
    result.formalSourceRightsRecordCount,
    result.formalSourceCarrierRecordCount,
    result.projectCopyMaterializationRecordCount,
    result.materializationsVerified,
    result.verifiedNaturalPersonRightsReviewers,
    result.domainExpertReviewCount,
    result.rightsLegalReviewCount,
    result.bindingFrozenVerified
  ], [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test("content, expert, legal, release and public authority accounts all remain red", async () => {
  const { result } = await fixturePromise;
  assert.deepEqual([
    result.sourceBundleComplete,
    result.rightsBundleComplete,
    result.expertReviewBundleComplete,
    result.contentTruthEstablished,
    result.expertTruthEstablished,
    result.rightsLegalConclusionEstablished,
    result.releaseReady,
    result.publicDeploymentAuthorized,
    result.expertClaimsAuthorized
  ], [false, false, false, false, false, false, false, false, false]);
  assert.equal(result.activeAdmissionEffect, "none");
});

test("source/carrier red gates remain explicit in the successor brand summary", async () => {
  const { result } = await fixturePromise;
  assert.deepEqual([
    result.sameEditionVerified,
    result.specificWikisourceCarrierProvenanceEstablished,
    result.externalCarrierLiveVerifiedThisRun,
    result.distributionPolicy
  ], [false, false, false, "link_only"]);
});

test("Web/body/build closure is not smuggled into the knowledge-core identity rebind", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual([
    persisted.knowledgeCoreIdentityReboundGate.productionWebConsumerClosureEstablished,
    result.productionWebConsumerClosureEstablished,
    result.productionBodyInventoryAndBytesAudited,
    result.productionWebCallSitePinned,
    result.currentBuildGateExecuted
  ], [false, false, false, false, false]);
});

test("legacy-v13 / targetSchema 13 / migrationId null and mutation boundaries remain exact", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual(persisted.releaseGovernance, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  });
  assert.deepEqual([
    result.releaseIdentity,
    result.targetSchema,
    result.migrationId,
    result.crossFileAtomicSnapshot,
    result.mutationEpochAvailableForSchema13,
    result.mutationEpochReceipt,
    result.intervalMutationExcludedAcrossFiles,
    result.abaExcluded
  ], ["legacy-v13", 13, null, false, false, null, false, false]);
});

test("every inherited current WeakSet-brand field is false", async () => {
  const { persisted } = await fixturePromise;
  const integrity = persisted.integrityBoundary;
  assert.deepEqual([
    integrity.reconciliationV2WeakSetBrandRequiredByLoader,
    integrity.supersessionWeakSetBrandVerified,
    integrity.predecessorReadinessWeakSetBrandVerified,
    integrity.smtV10PairedSupersessionWeakSetBrandVerified,
    integrity.sourceCarrierReadinessV11WeakSetBrandVerified,
    integrity.historicalUpstreamPrivateBrandsInvoked
  ], [false, false, false, false, false, false]);
  assert.equal(integrity.currentPrivateBrandsConsumed, 0);
});

test("clones and test-only exports cannot mint the successor private brand", async () => {
  const { result } = await fixturePromise;
  assert.equal(isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(clone(result)), false);
  assert.equal(isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(testOnly), false);
});

test("re-signed row mutation, omission, append or reorder cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const changed = clone(persisted);
  changed.bindings[9].candidateIds[0] = "smt-v10-forged-v3";
  rejectsResigned(changed, expected);
  const omitted = clone(persisted);
  omitted.bindings.splice(1, 1);
  rejectsResigned(omitted, expected);
  const appended = clone(persisted);
  appended.bindings.push(clone(appended.bindings[0]));
  rejectsResigned(appended, expected);
  const reordered = clone(persisted);
  [reordered.bindings[0], reordered.bindings[1]] = [reordered.bindings[1], reordered.bindings[0]];
  rejectsResigned(reordered, expected);
});

test("re-signed non-knowledge basis mutation or second rebind cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const basis = clone(persisted);
  basis.basisArtifacts[0].sha256 = "0".repeat(64);
  rejectsResigned(basis, expected);
  const second = clone(persisted);
  second.basisArtifacts[3].bytes += 1;
  rejectsResigned(second, expected);
});

test("re-signed historical observation rename, reordering or brand promotion cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const renamed = clone(persisted);
  renamed.knowledgeCoreIdentityReboundGate.historicalSemanticObservations[0].role = "unrelated";
  rejectsResigned(renamed, expected);
  const reordered = clone(persisted);
  const observations = reordered.knowledgeCoreIdentityReboundGate.historicalSemanticObservations;
  [observations[0], observations[1]] = [observations[1], observations[0]];
  rejectsResigned(reordered, expected);
  const branded = clone(persisted);
  branded.knowledgeCoreIdentityReboundGate.historicalSemanticObservations[2].brandCurrent = true;
  rejectsResigned(branded, expected);
});

test("re-signed private-brand invocation or predecessor-current claim cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const invoked = clone(persisted);
  invoked.integrityBoundary.historicalUpstreamPrivateBrandsInvoked = true;
  rejectsResigned(invoked, expected);
  const current = clone(persisted);
  current.lineage.predecessorCurrent = true;
  rejectsResigned(current, expected);
});

test("re-signed formal count, authority, Web closure or build claims cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const formal = clone(persisted);
  formal.knowledgeCoreIdentityReboundGate.formalKnowledgeDocumentCount = 1;
  rejectsResigned(formal, expected);
  const authority = clone(persisted);
  authority.knowledgeCoreIdentityReboundGate.publicDeploymentAuthorized = true;
  rejectsResigned(authority, expected);
  const web = clone(persisted);
  web.knowledgeCoreIdentityReboundGate.productionWebConsumerClosureEstablished = true;
  rejectsResigned(web, expected);
  const build = clone(persisted);
  build.knowledgeCoreIdentityReboundGate.currentBuildGateExecuted = true;
  rejectsResigned(build, expected);
});

test("re-signed governance, atomic, epoch, interval or ABA promotion cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const governance = clone(persisted);
  governance.releaseGovernance.targetSchema = 14;
  rejectsResigned(governance, expected);
  for (const field of [
    "crossFileAtomicSnapshot", "mutationEpochAvailable",
    "intervalMutationExcludedAcrossFiles", "abaExcluded"
  ]) {
    const forged = clone(persisted);
    forged.integrityBoundary[field] = true;
    rejectsResigned(forged, expected);
  }
});

test("builder is independent of poisoned Promise.all and Array.prototype.map", async () => {
  const nativePromiseAll = Promise.all;
  const nativeArrayMap = Array.prototype.map;
  let ledger;
  try {
    Promise.all = () => { throw new Error("poisoned Promise.all invoked"); };
    Array.prototype.map = () => { throw new Error("poisoned Array.map invoked"); };
    ledger = await buildBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  } finally {
    Promise.all = nativePromiseAll;
    Array.prototype.map = nativeArrayMap;
  }
  assert.equal(ledger.ledgerDigest,
    "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1");
});

test("a selective Array iterator cannot omit successor boundary fields", async () => {
  const { expected } = await fixturePromise;
  const predecessor = clone(expected.predecessor);
  const target = predecessor.doesNotEstablish;
  const nativeIterator = Array.prototype[Symbol.iterator];
  let ledger;
  try {
    Array.prototype[Symbol.iterator] = function selectiveIterator() {
      return nativeIterator.call(this === target ? [] : this);
    };
    ledger = testOnly.buildExpectedLedger(predecessor);
  } finally {
    Array.prototype[Symbol.iterator] = nativeIterator;
  }
  assert.equal(ledger.doesNotEstablish.includes(
    "historical_private_brand_currency_or_current_parent_authority"), true);
  assert.equal(ledger.doesNotEstablish.includes(
    "knowledge_core_body_audit_or_bundled_material_admission"), true);
});

test("stale v1.8 full-loader fails closed while the v1.9 loader succeeds", async () => {
  const { loadBaziSmtV10VersionAwareBindingReadiness } =
    await import("./bazi-smt-v10-version-aware-binding-readiness-lib.mjs");
  await assert.rejects(
    loadBaziSmtV10VersionAwareBindingReadiness(workspaceRoot),
    /BOUND_READINESS_BASIS_DRIFT|BASIS.*DRIFT|RAW_IDENTITY_MISMATCH/u
  );
  const result = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assert.equal(isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(result), true);
});

test("library never invokes stale private-brand loaders and avoids dynamic map/Promise.all", async () => {
  const source = await readFile(libPath, "utf8");
  for (const forbidden of [
    "loadBaziBindingFreezeRequirementsV17",
    "loadBaziSmtV10VersionedParentSupersession",
    "loadBaziSourceCarrierRecordReadinessVersionAwareCandidate",
    ".map(",
    "Promise.all("
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("canonicalization rejects getters without invoking them", () => {
  let invoked = 0;
  const forged = {};
  Object.defineProperty(forged, "ledgerId", {
    enumerable: true,
    get() { invoked += 1; return "forged"; }
  });
  assert.throws(() => testOnly.canonicalStringify(forged), /NON_PASSIVE_JSON/);
  assert.equal(invoked, 0);
});

test("canonicalization rejects custom prototypes, aliases, proxies and negative zero", () => {
  assert.throws(() => testOnly.canonicalStringify(Object.create({ authority: true })),
    /NON_CANONICAL_PROTOTYPE/);
  const shared = {};
  assert.throws(() => testOnly.canonicalStringify({ left: shared, right: shared }),
    /ALIASED_OR_CYCLIC_JSON/);
  assert.throws(() => testOnly.canonicalStringify(new Proxy({}, {})), /NON_PASSIVE_JSON/);
  assert.throws(() => testOnly.canonicalStringify({ count: -0 }), /NON_JSON_NUMBER/);
});

test("raw identity assertions reject a forged current knowledge-core snapshot", () => {
  assert.throws(() => testOnly.assertSnapshot({
    path: testOnly.CURRENT_KNOWLEDGE_CORE.path,
    rawBytes: testOnly.CURRENT_KNOWLEDGE_CORE.rawBytes,
    rawSha256: "f".repeat(64)
  }, testOnly.CURRENT_KNOWLEDGE_CORE, "current knowledge-core"), /RAW_IDENTITY_MISMATCH/);
});

test("persisted artifact is the exact deterministic builder serialization", async () => {
  const { persisted } = await fixturePromise;
  const built = await buildBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assert.equal(testOnly.canonicalStringify(persisted), testOnly.canonicalStringify(built));
  assert.equal(await readFile(artifactPath, "utf8"),
    serializeBaziKnowledgeCoreIdentityReboundBindingReadiness(built));
});

test("exclusive wx semantics cannot overwrite a temporary copy of the persisted artifact", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-readiness-wx-"));
  t.after(async () => {
    assert.equal(path.isAbsolute(temporaryRoot), true);
    assert.equal(path.dirname(temporaryRoot), path.resolve(os.tmpdir()));
    assert.match(path.basename(temporaryRoot), /^hakimi-bazi-readiness-wx-[a-z0-9]{6}$/iu);
    const metadata = await lstat(temporaryRoot);
    assert.equal(metadata.isDirectory(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(await realpath(temporaryRoot), temporaryRoot);
    await rm(temporaryRoot, { recursive: true, force: true });
  });
  const target = path.join(temporaryRoot, "readiness.json");
  await copyFile(artifactPath, target);
  const expectedBytes = await readFile(target);
  await assert.rejects(open(target, "wx"), (error) => error?.code === "EEXIST");
  assert.deepEqual(await readFile(target), expectedBytes);
  const { result } = await fixturePromise;
  assert.equal(result.artifact.sha256,
    "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797");
});

test("CLI emits a calibrated observation and no authority", () => {
  const child = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  const prefix = "BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_OBSERVATION_OK ";
  assert.equal(child.stdout.startsWith(prefix), true);
  const output = JSON.parse(child.stdout.slice(prefix.length));
  assert.equal(output.mechanicalObservationVerified, true);
  assert.equal(output.bindingRowsChanged, 0);
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.historicalUpstreamPrivateBrandsInvoked, false);
  assert.equal(output.productionWebConsumerClosureEstablished, false);
  assert.equal(output.publicDeploymentAuthorized, false);
  assert.deepEqual(output.runtimeTrustCalibration, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  });
});

test("CLI rejects operands and visible NODE_OPTIONS with fixed non-leaking failures", () => {
  const operand = spawnSync(process.execPath, [cliPath, "unexpected"], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr,
    "BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_FAILED CLI_ARGUMENTS_FORBIDDEN\n");

  const visibleOptions = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
  });
  assert.equal(visibleOptions.status, 1);
  assert.equal(visibleOptions.stdout, "");
  assert.equal(visibleOptions.stderr,
    "BAZI_KNOWLEDGE_CORE_IDENTITY_REBOUND_BINDING_READINESS_FAILED VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n");
});

test("importing the CLI is side-effect free", () => {
  const child = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(pathToFileURL(cliPath).href)}); process.stdout.write("IMPORT_OK\\n");`
  ], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "IMPORT_OK\n");
  assert.equal(child.stderr, "");
});
