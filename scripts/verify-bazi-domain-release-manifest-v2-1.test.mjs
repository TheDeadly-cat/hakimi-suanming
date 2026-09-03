import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  loadBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";
import {
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";
import {
  loadBaziExpertPrivacyFormalIntakeReconciliation
} from "./bazi-expert-privacy-formal-intake-reconciliation-lib.mjs";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_RELATIVE_PATH,
  baziDomainReleaseManifestV21TestOnly,
  buildCurrentBaziDomainReleaseManifestV21,
  computeBaziDomainReleaseManifestV21Digest,
  getBaziDomainReleaseManifestV21Summary,
  isVerifiedBaziDomainReleaseManifestV21,
  loadBaziDomainReleaseManifestV21,
  serializeBaziDomainReleaseManifestV21
} from "./bazi-domain-release-manifest-v2-1-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.resolve(workspaceRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_RELATIVE_PATH);
const cliPath = path.resolve(workspaceRoot, "scripts/verify-bazi-domain-release-manifest-v2-1.mjs");
const cliUrl = pathToFileURL(cliPath).href;
const OK_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_OBSERVATION_OK ";
const FAILED_PREFIX = "BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_FAILED";

const fixturePromise = (async () => {
  const parent = await loadBaziDomainReleaseManifestV2(workspaceRoot);
  const carrier = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);
  const reconciliation = await loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot);
  const expected = await buildCurrentBaziDomainReleaseManifestV21(workspaceRoot);
  const loaded = await loadBaziDomainReleaseManifestV21(workspaceRoot);
  return { parent, carrier, reconciliation, expected, loaded };
})();

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
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
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(descriptor && Object.hasOwn(descriptor, "value"));
    assertDeepFrozen(descriptor.value, seen);
  }
}

function resigned(expected, mutate) {
  const forged = cloneJson(expected);
  mutate(forged);
  forged.manifestDigest = computeBaziDomainReleaseManifestV21Digest(forged);
  return forged;
}

function expectManifestMismatch(forged, expected) {
  assert.throws(
    () => baziDomainReleaseManifestV21TestOnly.assertPersistedSemantic(forged, expected),
    (error) => error?.code === "MANIFEST_MISMATCH"
  );
}

function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  return env;
}

test("full loader returns the private brand and recursively frozen manifest", async () => {
  const { loaded } = await fixturePromise;
  assert.equal(isVerifiedBaziDomainReleaseManifestV21(loaded), true);
  assertDeepFrozen(loaded);
  assert.equal(loaded.manifest.schemaVersion, "2.1.0");
  assert.equal(loaded.manifest.releaseStatus, "engineering_candidate");
});

test("persisted raw identity and self digest are exact", async () => {
  const { loaded } = await fixturePromise;
  const bytes = await readFile(artifactPath);
  assert.equal(bytes.byteLength, 19064);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413");
  assert.equal(loaded.manifestDigest,
    "f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2");
  assert.equal(computeBaziDomainReleaseManifestV21Digest(loaded.manifest), loaded.manifestDigest);
});

test("builder serialization exactly equals the append-only persisted artifact", async () => {
  const { expected } = await fixturePromise;
  const bytes = await readFile(artifactPath, "utf8");
  assert.equal(serializeBaziDomainReleaseManifestV21(expected), bytes);
});

test("lineage pins manifest v2 and leaves both registries uninvolved", async () => {
  const { expected } = await fixturePromise;
  assert.deepEqual(expected.lineage.supersedesForCurrentMachineIdentityOnly,
    baziDomainReleaseManifestV21TestOnly.PARENT_MANIFEST);
  assert.equal(expected.lineage.predecessorPreservedUnmodified, true);
  assert.equal(expected.lineage.predecessorCurrent, false);
  assert.equal(expected.lineage.predecessorComponentCount, 10);
  assert.equal(expected.lineage.unchangedComponentCount, 8);
  assert.deepEqual(expected.lineage.reboundComponentIds,
    ["rights_bundle", "expert_review_preconditions"]);
  assert.equal(expected.lineage.centralSystemAdmissionRegistryIntegrated, false);
  assert.equal(expected.lineage.crossSystemEngineeringReceiptRegistryIntegrated, false);
});

test("exactly three direct contexts carry genuine private-brand observations", async () => {
  const { expected } = await fixturePromise;
  assert.equal(expected.verifiedMechanicalContexts.length, 3);
  assert.deepEqual(expected.verifiedMechanicalContexts.map((entry) => entry.contextId), [
    "hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0",
    "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
    "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0"
  ]);
  for (const context of expected.verifiedMechanicalContexts) {
    assert.equal(context.privateBrandVerified, true);
    assert.equal(context.activeAdmissionEffect, "none");
  }
});

test("rights bundle replaces only the historical carrier with v1.1 successor", async () => {
  const { expected } = await fixturePromise;
  const rights = component(expected, "rights_bundle");
  assert.equal(rights.version,
    "hakimi.bazi.strength.source-rights-candidates/1.3.0+source-carrier-readiness.version-aware-candidate/1.1.0");
  assert.equal(rights.files.length, 4);
  assert.equal(rights.files[0].path, "content/bazi-strength-source-rights-candidates.v1.3.0.json");
  assert.deepEqual(rights.files[1], {
    path: "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
    rawBytes: 18654,
    sha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377"
  });
  assert.equal(rights.files.some((file) => file.path.endsWith("readiness.v1.json")), false);
});

test("expert preconditions append reconciliation without a real-person instance", async () => {
  const { expected } = await fixturePromise;
  const preconditions = component(expected, "expert_review_preconditions");
  assert.equal(preconditions.files.length, 3);
  assert.equal(preconditions.files[2].path,
    "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json");
  assert.equal(expected.gateState.currentOpaqueContextInstances, 0);
  assert.equal(expected.gateState.privacyFormalIntakeReconciliationMechanicallyVerified, true);
});

test("the other eight component projections remain byte-for-byte semantic matches", async () => {
  const { parent, expected } = await fixturePromise;
  const rebound = new Set(["rights_bundle", "expert_review_preconditions"]);
  for (const before of parent.manifest.components) {
    if (!rebound.has(before.componentId)) {
      assert.deepEqual(component(expected, before.componentId), before);
    }
  }
});

test("binding and all formal record counters remain zero", async () => {
  const { expected } = await fixturePromise;
  const gate = expected.gateState;
  assert.equal(gate.bindingFrozenVerified, 0);
  assert.equal(gate.bindingRequired, 12);
  assert.equal(gate.formalKnowledgeDocuments, 0);
  assert.equal(gate.formalSourceRightsRecords, 0);
  assert.equal(gate.formalSourceCarrierRecords, 0);
  assert.equal(gate.sourceBundleComplete, false);
  assert.equal(gate.rightsBundleComplete, false);
});

test("expert accounting stays 0/2 with the exact expected formal failure", async () => {
  const { expected } = await fixturePromise;
  const gate = expected.gateState;
  assert.equal(gate.independentExpertsRequired, 2);
  assert.equal(gate.reviewerSlotsOccupied, 0);
  assert.equal(gate.independentExpertReviewsVerified, 0);
  assert.equal(gate.sealedOriginalOpinions, 0);
  assert.equal(gate.candidateProjectedArtifactLockExactMatches, 11);
  assert.equal(gate.candidateProjectedArtifactLockDrifts, 1);
  assert.equal(gate.packetArtifactLocksCurrent, false);
  assert.equal(gate.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT");
});

test("binding readiness remains on historical parents despite successor observation", async () => {
  const { expected } = await fixturePromise;
  assert.equal(expected.gateState.sourceCarrierReadinessSuccessorCreated, true);
  assert.equal(expected.gateState.bindingReadinessConsumesLatestSourceRightsPair, false);
  assert.equal(expected.gateState.bindingReadinessStillPinsHistoricalParents, true);
});

test("privacy, collection, persistence, and publication authority stay false", async () => {
  const { expected } = await fixturePromise;
  const authority = expected.authorityBoundary;
  assert.equal(authority.persistedRealPersonInstancesAllowed, false);
  assert.equal(authority.collectionAuthorized, false);
  assert.equal(authority.personDataPresenceAssessed, false);
  assert.equal(authority.personDerivedDigestExcluded, false);
  assert.equal(authority.safeToPublish, false);
});

test("truth, expert, legal, release, public, and expert-claim gates stay red", async () => {
  const { expected } = await fixturePromise;
  const authority = expected.authorityBoundary;
  assert.equal(authority.expertTruthEstablished, false);
  assert.equal(authority.rightsLegalConclusionEstablished, false);
  assert.equal(authority.releaseEvidenceComplete, false);
  assert.equal(authority.releaseReady, false);
  assert.equal(authority.publicDeploymentAuthorized, false);
  assert.equal(authority.expertClaimsAuthorized, false);
  assert.equal(expected.evidenceLedger.contentTruth, "not_established");
});

test("governance remains legacy-v13 / 13 / null", async () => {
  const { expected } = await fixturePromise;
  assert.equal(expected.releaseGovernance.releaseIdentity, "legacy-v13");
  assert.equal(expected.releaseGovernance.targetSchema, 13);
  assert.equal(expected.releaseGovernance.migrationId, null);
});

test("atomic, epoch, interval, ABA, and replay boundaries remain unestablished", async () => {
  const { expected } = await fixturePromise;
  assert.equal(expected.snapshotBoundary.crossFileAtomicSnapshot, false);
  assert.equal(expected.snapshotBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(expected.snapshotBoundary.mutationEpochReceipt, null);
  assert.equal(expected.snapshotBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(expected.snapshotBoundary.abaExcluded, false);
  assert.equal(expected.snapshotBoundary.replayExcluded, false);
});

test("runtime, loader, launcher, CLI, and hidden-preload trust remain unestablished", async () => {
  const { expected } = await fixturePromise;
  assert.deepEqual(expected.runtimeTrustBoundary, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  });
});

test("doesNotEstablish names person-data and trusted-runtime limitations", async () => {
  const { expected } = await fixturePromise;
  assert.ok(expected.doesNotEstablish.includes(
    "real_person_data_presence_or_person_derived_digest_exclusion"));
  assert.ok(expected.doesNotEstablish.includes(
    "collection_persistence_or_privacy_safe_to_publish_authority"));
  assert.ok(expected.doesNotEstablish.includes(
    "trusted_runtime_loader_launcher_cli_attestation_or_hidden_preload_exclusion"));
});

test("a structural clone cannot substitute for the manifest v2 parent brand", async () => {
  const { parent, carrier, reconciliation } = await fixturePromise;
  assert.throws(
    () => baziDomainReleaseManifestV21TestOnly.buildFromVerifiedParents({
      manifest: cloneJson(parent), carrier, reconciliation
    }),
    (error) => error?.code === "MANIFEST_V2_BRAND_REQUIRED"
  );
});

test("a structural clone cannot substitute for the carrier v1.1 parent brand", async () => {
  const { parent, carrier, reconciliation } = await fixturePromise;
  assert.throws(
    () => baziDomainReleaseManifestV21TestOnly.buildFromVerifiedParents({
      manifest: parent, carrier: cloneJson(carrier), reconciliation
    }),
    (error) => error?.code === "CARRIER_V11_BRAND_REQUIRED"
  );
});

test("a structural clone cannot substitute for the reconciliation parent brand", async () => {
  const { parent, carrier, reconciliation } = await fixturePromise;
  assert.throws(
    () => baziDomainReleaseManifestV21TestOnly.buildFromVerifiedParents({
      manifest: parent, carrier, reconciliation: cloneJson(reconciliation)
    }),
    (error) => error?.code === "RECONCILIATION_V1_BRAND_REQUIRED"
  );
});

test("a re-signed release-ready forgery is rejected", async () => {
  const { expected } = await fixturePromise;
  expectManifestMismatch(resigned(expected, (forged) => {
    forged.authorityBoundary.releaseReady = true;
    forged.gateState.releaseEvidenceComplete = true;
  }), expected);
});

test("deleting or reordering the three direct parent contexts is rejected", async () => {
  const { expected } = await fixturePromise;
  expectManifestMismatch(resigned(expected, (forged) => {
    forged.verifiedMechanicalContexts.pop();
  }), expected);
  expectManifestMismatch(resigned(expected, (forged) => {
    forged.verifiedMechanicalContexts.reverse();
  }), expected);
});

test("mixing the historical carrier back into the new rights bundle is rejected", async () => {
  const { expected } = await fixturePromise;
  expectManifestMismatch(resigned(expected, (forged) => {
    component(forged, "rights_bundle").files[1] = {
      path: "content/system-admission/bazi-source-carrier-record-readiness.v1.json",
      rawBytes: 27322,
      sha256: "d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9"
    };
  }), expected);
});

test("formal-record, expert, and first-failure elevation is rejected even when re-signed", async () => {
  const { expected } = await fixturePromise;
  expectManifestMismatch(resigned(expected, (forged) => {
    forged.gateState.formalSourceCarrierRecords = 1;
    forged.gateState.reviewerSlotsOccupied = 1;
    forged.gateState.firstFormalParentFailureCode = null;
  }), expected);
});

test("collection, person-data, publication, or runtime trust elevation is rejected", async () => {
  const { expected } = await fixturePromise;
  expectManifestMismatch(resigned(expected, (forged) => {
    forged.authorityBoundary.collectionAuthorized = true;
    forged.authorityBoundary.personDataPresenceAssessed = true;
    forged.authorityBoundary.safeToPublish = true;
    forged.runtimeTrustBoundary.hiddenPreloadExcluded = true;
    forged.runtimeTrustBoundary.cliOutputTrustedAttestation = true;
  }), expected);
});

test("post-import WeakSet prototype tampering cannot forge the private brand", async () => {
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  try {
    let captured;
    WeakSet.prototype.add = function poisonedAdd(value) {
      captured = this;
      return Reflect.apply(originalAdd, this, [value]);
    };
    WeakSet.prototype.has = () => true;
    const fake = {};
    assert.equal(isVerifiedBaziDomainReleaseManifestV21(fake), false);
    assert.equal(captured, undefined);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import freeze, JSON, String, iterator, and inherited toJSON tampering cannot rewrite summary", async () => {
  const { loaded } = await fixturePromise;
  const originalFreeze = Object.freeze;
  const originalParse = JSON.parse;
  const originalString = globalThis.String;
  const originalIterator = Array.prototype[Symbol.iterator];
  const priorToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  try {
    Object.freeze = (value) => value;
    JSON.parse = () => ({ releaseReady: true });
    globalThis.String = () => "0";
    Array.prototype[Symbol.iterator] = function* poisonedIterator() {};
    Object.defineProperty(Object.prototype, "toJSON", {
      value: () => ({ releaseReady: true }), configurable: true
    });
    const summary = getBaziDomainReleaseManifestV21Summary(loaded);
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.safeToPublish, false);
    assert.equal(summary.artifact.sha256,
      "68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413");
    assertDeepFrozen(summary);
  } finally {
    Object.freeze = originalFreeze;
    JSON.parse = originalParse;
    globalThis.String = originalString;
    Array.prototype[Symbol.iterator] = originalIterator;
    if (priorToJson) Object.defineProperty(Object.prototype, "toJSON", priorToJson);
    else delete Object.prototype.toJSON;
  }
});

test("summary surface requires the private full-loader brand and exposes no raw summary helper", async () => {
  const { loaded } = await fixturePromise;
  const clone = cloneJson(loaded);
  assert.equal(isVerifiedBaziDomainReleaseManifestV21(clone), false);
  assert.throws(
    () => getBaziDomainReleaseManifestV21Summary(clone),
    (error) => error?.code === "MANIFEST_V21_BRAND_REQUIRED"
  );
  assert.equal(Object.hasOwn(baziDomainReleaseManifestV21TestOnly, "summaryFrom"), false);
  assert.equal(
    getBaziDomainReleaseManifestV21Summary(loaded)
      .baziV17MachineIdentityManifestV21MechanicallyVerified,
    true
  );
});

test("canonical digest rejects accessor, sparse array, aliases, and -0", () => {
  const accessor = {};
  Object.defineProperty(accessor, "x", { get: () => 1, enumerable: true });
  assert.throws(() => baziDomainReleaseManifestV21TestOnly.canonicalStringify(accessor));
  assert.throws(() => baziDomainReleaseManifestV21TestOnly.canonicalStringify([, 1]));
  const shared = {};
  assert.throws(() => baziDomainReleaseManifestV21TestOnly.canonicalStringify({ a: shared, b: shared }));
  assert.throws(() => baziDomainReleaseManifestV21TestOnly.canonicalStringify(-0));
});

test("CLI emits the narrow observation with every requested red boundary", () => {
  const run = spawnSync(process.execPath, [cliPath], { cwd: workspaceRoot, env: cleanEnv(), encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.ok(run.stdout.startsWith(OK_PREFIX));
  const output = JSON.parse(run.stdout.slice(OK_PREFIX.length));
  assert.equal(output.manifest.artifact.bytes, 19064);
  assert.equal(output.formalRedGates.binding, "0/12");
  assert.equal(output.formalRedGates.experts, "0/2");
  assert.equal(output.formalRedGates.firstFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  assert.equal(output.privacyRedGates.collectionAuthorized, false);
  assert.equal(output.privacyRedGates.personDataPresenceAssessed, false);
  assert.equal(output.privacyRedGates.safeToPublish, false);
  assert.equal(output.authorityRedGates.releaseReady, false);
  assert.equal(output.integrityRedGates.replayExcluded, false);
  assert.equal(output.runtimeTrustCalibration.hiddenPreloadExcluded, false);
  assert.equal(output.runtimeTrustCalibration.cliOutputTrustedAttestation, false);
  assert.equal(output.downstreamIntegration.centralSystemAdmissionRegistryIntegrated, false);
});

test("CLI rejects extra argv, NODE_OPTIONS, and visible --import without leaking paths", () => {
  const cases = [
    { args: [cliPath, "forged-path"], env: cleanEnv(), code: "CLI_ARGUMENTS_FORBIDDEN" },
    { args: [cliPath], env: { ...cleanEnv(), NODE_OPTIONS: "--no-warnings" }, code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN" },
    {
      args: ["--import", "data:text/javascript,globalThis.__v21Poc=true", cliPath],
      env: cleanEnv(),
      code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN"
    }
  ];
  for (const item of cases) {
    const run = spawnSync(process.execPath, item.args, {
      cwd: workspaceRoot, env: item.env, encoding: "utf8"
    });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, `${FAILED_PREFIX} ${item.code}\n`);
    assert.equal(run.stderr.includes(workspaceRoot), false);
    assert.equal(run.stderr.includes("at "), false);
  }
});

test("importing CLI is side-effect free and business module stays behind direct-entry import", async () => {
  const source = await readFile(cliPath, "utf8");
  assert.match(source, /await import\("\.\/bazi-domain-release-manifest-v2-1-lib\.mjs"\)/u);
  assert.doesNotMatch(source, /^import .*bazi-domain-release-manifest-v2-1-lib/mu);
  const program = `process.exitCode=7;await import(${JSON.stringify(cliUrl)});process.stdout.write(JSON.stringify({exitCode:process.exitCode}));`;
  const run = spawnSync(process.execPath, ["--input-type=module", "--eval", program], {
    cwd: workspaceRoot, env: cleanEnv(), encoding: "utf8"
  });
  assert.equal(run.status, 7);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, '{"exitCode":7}');
});
