import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_RELATIVE_PATH,
  computeBaziExpertPrivacyFormalIntakeReconciliationDigest,
  getBaziExpertPrivacyFormalIntakeReconciliationSummary,
  isVerifiedBaziExpertPrivacyFormalIntakeReconciliation,
  loadBaziExpertPrivacyFormalIntakeReconciliation,
  baziExpertPrivacyFormalIntakeReconciliationTestOnly as testOnly
} from "./bazi-expert-privacy-formal-intake-reconciliation-lib.mjs";
import { loadBaziExpertAuthorityMaterialPrecheck } from "./bazi-expert-authority-material-precheck-lib.mjs";
import { loadBaziExpertReviewIntakeGapVersionAwareCandidate } from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(workspaceRoot, BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_RELATIVE_PATH);
const cliPath = path.join(workspaceRoot, "scripts/verify-bazi-expert-privacy-formal-intake-reconciliation.mjs");
const bundle = await testOnly.loadExpectedBundle(workspaceRoot);
const verified = await loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot);
const precheck = await loadBaziExpertAuthorityMaterialPrecheck(workspaceRoot);
const intake = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
const persistedText = await readFile(artifactPath, "utf8");
const persisted = JSON.parse(persistedText);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function forgeDigest(value) {
  value.ledgerDigest = computeBaziExpertPrivacyFormalIntakeReconciliationDigest(value);
  return value;
}

function rejectsProjection(value) {
  assert.throws(
    () => testOnly.assertPersistedSemantic(forgeDigest(value), bundle.ledger),
    (error) => error?.code === "EXPECTED_PROJECTION_MISMATCH"
  );
}

test("loader returns its private WeakSet brand and recursively freezes the result", () => {
  assert.equal(isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(verified), true);
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.artifact), true);
  assert.equal(isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(clone(verified)), false);
});

test("summary requires the original brand and preserves primary red gates", () => {
  const summary = getBaziExpertPrivacyFormalIntakeReconciliationSummary(verified);
  assert.equal(summary.verifiedParentPrivateBrandCount, 2);
  assert.equal(summary.collectionAuthorized, false);
  assert.equal(summary.currentOpaqueContextInstances, 0);
  assert.equal(summary.personDataPresenceAssessed, false);
  assert.equal(summary.personDerivedDigestExcluded, false);
  assert.equal(summary.safeToPublish, false);
  assert.equal(summary.hiddenPreloadExcluded, false);
  assert.equal(summary.nodeRuntimeIdentityEstablished, false);
  assert.equal(summary.loaderIdentityEstablished, false);
  assert.equal(summary.runtimeLauncherIdentityEstablished, false);
  assert.equal(summary.cliOutputTrustedAttestation, false);
  assert.equal(summary.visibleLoaderGuardIsSecurityBoundary, false);
  assert.equal(summary.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution, true);
  assert.equal(summary.activeAdmissionEffect, "none");
  assert.deepEqual(persisted.runtimeTrustBoundary, {
    cliOutputTrustedAttestation: false,
    hiddenPreloadExcluded: false,
    loaderIdentityEstablished: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
    nodeRuntimeIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    visibleLoaderGuardIsSecurityBoundary: false
  });
  assert.equal(
    persisted.doesNotEstablish.includes("trusted_runtime_loader_launcher_identity_or_hidden_preload_exclusion"),
    true
  );
  assert.throws(
    () => getBaziExpertPrivacyFormalIntakeReconciliationSummary(clone(verified)),
    (error) => error?.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("persisted artifact is the canonical mechanical projection with frozen raw identity", () => {
  assert.equal(persistedText, testOnly.serialize(bundle.ledger));
  assert.equal(Buffer.byteLength(persistedText), testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(createHash("sha256").update(persistedText).digest("hex"), testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(persisted.ledgerDigest, testOnly.EXPECTED_PERSISTED.ledgerDigest);
});

test("a clone of the authority precheck cannot forge its WeakSet brand", () => {
  assert.throws(
    () => testOnly.assertVerifiedParents(clone(precheck), intake),
    (error) => error?.code === "PRECHECK_BRAND_REQUIRED"
  );
});

test("a clone of intake v1.1 cannot forge its WeakSet brand", () => {
  assert.throws(
    () => testOnly.assertVerifiedParents(precheck, clone(intake)),
    (error) => error?.code === "INTAKE_BRAND_REQUIRED"
  );
});

test("all eight historical public identity fields retain exact order and historical-only disposition", () => {
  assert.deepEqual(
    persisted.historicalPublicIdentityTemplate.fields.map((entry) => entry.field),
    ["reviewerId", "displayNameOrControlledPseudonym", "verificationMethod", "credentialDigest", "verificationDate", "reviewScope", "evidenceType", "verifiedBy"]
  );
  for (const entry of persisted.historicalPublicIdentityTemplate.fields) {
    assert.equal(entry.disposition, "historical_template_only_not_collection_or_persistence_authority");
  }
});

test("displayNameOrControlledPseudonym and verifiedBy are explicitly forbidden", () => {
  const byName = Object.fromEntries(persisted.historicalPublicIdentityTemplate.fields.map((entry) => [entry.field, entry]));
  assert.equal(byName.displayNameOrControlledPseudonym.currentRule, "forbidden");
  assert.equal(byName.verifiedBy.currentRule, "forbidden");
  assert.equal(persisted.historicalPublicIdentityTemplate.displayNameOrControlledPseudonymForbidden, true);
  assert.equal(persisted.historicalPublicIdentityTemplate.verifiedByForbidden, true);
});

test("historical identity field deletion, reordering, or disposition change is rejected", () => {
  const deleted = clone(persisted);
  deleted.historicalPublicIdentityTemplate.fields.pop();
  rejectsProjection(deleted);
  const reordered = clone(persisted);
  reordered.historicalPublicIdentityTemplate.fields.reverse();
  rejectsProjection(reordered);
  const promoted = clone(persisted);
  promoted.historicalPublicIdentityTemplate.fields[0].disposition = "collection_authority";
  rejectsProjection(promoted);
});

test("opaque vocabulary is candidate-only, non-executable, and currently vacant", () => {
  const schema = persisted.candidateOnlyOpaqueSchema;
  assert.deepEqual(schema.opaqueFieldVocabulary, testOnly.OPAQUE_VOCABULARY);
  assert.equal(schema.currentInstanceCount, 0);
  assert.deepEqual(schema.currentInstances, []);
  assert.equal(schema.executableCollectionApiDefined, false);
  assert.equal(schema.collectionAuthorized, false);
  assert.equal(schema.persistedRealPersonInstancesAllowed, false);
});

test("adding an opaque instance is rejected even after recomputing the digest", () => {
  const forged = clone(persisted);
  forged.candidateOnlyOpaqueSchema.currentInstances.push({ opaqueReviewerContextRef: "opaque:fake" });
  forged.candidateOnlyOpaqueSchema.currentInstanceCount = 1;
  rejectsProjection(forged);
});

test("adding unknown PII or a raw dossier field is rejected", () => {
  const pii = clone(persisted);
  pii.candidateOnlyOpaqueSchema.displayNameOrControlledPseudonym = "redacted-but-still-forbidden";
  rejectsProjection(pii);
  const raw = clone(persisted);
  raw.candidateOnlyOpaqueSchema.rawCredentialDocument = "not-allowed";
  rejectsProjection(raw);
});

test("collection and real-person persistence escalation is rejected", () => {
  for (const key of ["collectionAuthorized", "persistedRealPersonInstancesAllowed", "privateRuntimeEndpointInvoked", "executableCollectionApiDefined"]) {
    const forged = clone(persisted);
    forged.candidateOnlyOpaqueSchema[key] = true;
    rejectsProjection(forged);
  }
});

test("privacy truth escalation is rejected even with a fresh ledger digest", () => {
  for (const key of [
    "identityEstablished", "artifactEncryptionVerified", "custodyVerified", "authenticityEstablished",
    "personDataPresenceAssessed", "personDerivedDigestExcluded", "safeToPublish"
  ]) {
    const forged = clone(persisted);
    forged.privacyBoundary[key] = true;
    rejectsProjection(forged);
  }
});

test("reviewer, identity, credential, scope, opinion, and verifier instances stay at zero", () => {
  const gate = persisted.zeroInstanceGate;
  assert.equal(gate.domainExpertsRequired, 2);
  for (const key of [
    "reviewerSlotsOccupied", "identitiesVerified", "credentialsVerified", "scopesVerified",
    "verifierAuthorityGrantInstances", "pairwiseIndependenceMaterials", "independentExpertReviewsVerified",
    "currentFormalIntakeRecordInstances", "originalOpinionInstances", "sealedOriginalOpinions", "expertReviewBundles"
  ]) assert.equal(gate[key], 0, key);
});

test("any formal instance or reviewer count escalation is rejected", () => {
  for (const key of ["reviewerSlotsOccupied", "identitiesVerified", "currentFormalIntakeRecordInstances", "sealedOriginalOpinions"]) {
    const forged = clone(persisted);
    forged.zeroInstanceGate[key] = 1;
    rejectsProjection(forged);
  }
});

test("formal drift remains exactly 11 current projections plus one bazi-core drift", () => {
  const drift = persisted.formalIntakeDriftBoundary;
  assert.equal(drift.firstFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  assert.equal(drift.historicalPacketArtifactLockSlots, 12);
  assert.equal(drift.candidateProjectedArtifactLockExactMatches, 11);
  assert.equal(drift.candidateProjectedArtifactLockDrifts, 1);
  assert.equal(drift.packetArtifactLocksCurrent, false);
  assert.equal(drift.driftedArtifact.artifactId, "bazi-core-fact-engine");
  assert.equal(drift.driftedArtifact.path, "packages/bazi-core/src/index.ts");
});

test("formal failure resolution, lock promotion, repair, or verifier invocation is rejected", () => {
  for (const key of ["formalPacketVerifierPasses", "formalPacketVerifierInvokedByThisCandidate", "historicalFailureResolvedByThisCandidate", "packetArtifactLocksCurrent", "childMayRepairRefreshOrResignHistoricalPacket"]) {
    const forged = clone(persisted);
    forged.formalIntakeDriftBoundary[key] = true;
    rejectsProjection(forged);
  }
  const wrongFailure = clone(persisted);
  wrongFailure.formalIntakeDriftBoundary.firstFailureCode = "NONE";
  rejectsProjection(wrongFailure);
});

test("binding, source, rights, bundle, and expert-gate closure remains red", () => {
  const gate = persisted.zeroInstanceGate;
  assert.equal(gate.bindingRequired, 12);
  assert.equal(gate.bindingFrozenVerified, 0);
  for (const key of ["sourceBindingClosureComplete", "sourceRightsClosureComplete", "expertReviewBundleComplete", "countsTowardExpertGate"]) {
    assert.equal(gate[key], false);
    const forged = clone(persisted);
    forged.zeroInstanceGate[key] = true;
    rejectsProjection(forged);
  }
});

test("authority or release promotion is rejected after digest recomputation", () => {
  for (const key of ["formalActivationAllowed", "expertTruthEstablished", "rightsLegalConclusionEstablished", "releaseReady", "publicReleaseAuthorized", "expertClaimsAuthorized"]) {
    const forged = clone(persisted);
    forged.authorityBoundary[key] = true;
    rejectsProjection(forged);
  }
});

test("release governance remains legacy-v13 schema 13 without a migration", () => {
  assert.deepEqual(persisted.releaseGovernance, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    migrationId: null,
    mutationEpochBoundary: "preserved",
    publicDeploymentAuthorized: false,
    targetSchema: 13
  });
  const forged = clone(persisted);
  forged.releaseGovernance.migrationId = "fake-migration";
  rejectsProjection(forged);
});

test("integrity guarantee escalation is rejected", () => {
  for (const key of ["crossFileAtomicSnapshot", "mutationEpochAvailableForSchema13", "intervalMutationExcludedAcrossFiles", "abaExcluded", "replayExcludedAcrossParentLoads"]) {
    const forged = clone(persisted);
    forged.integrityBoundary[key] = true;
    rejectsProjection(forged);
  }
});

test("formal packet, manifest observer, and review-cycle kernel are explicitly not dependencies", () => {
  const parents = persisted.parentCapabilities;
  assert.equal(parents.verifiedPrivateBrandCount, 2);
  assert.equal(parents.formalPacketDirectParent, false);
  assert.equal(parents.formalPacketVerifierImportedOrInvoked, false);
  assert.equal(parents.manifestObserverDependency, false);
  assert.equal(parents.reviewCycleKernelDependency, false);
  const forged = clone(persisted);
  forged.parentCapabilities.reviewCycleKernelDependency = true;
  rejectsProjection(forged);
});

test("canonicalization rejects symbols, sparse arrays, aliases, and non-finite numbers", () => {
  const symbolObject = { ok: true };
  symbolObject[Symbol("hidden")] = true;
  assert.throws(() => testOnly.canonicalStringify(symbolObject), (error) => error?.code === "NON_JSON_KEY");
  const sparse = [];
  sparse.length = 2;
  sparse[1] = "x";
  assert.throws(() => testOnly.canonicalStringify(sparse), (error) => error?.code === "NON_JSON_ARRAY_SHAPE");
  const shared = { value: 1 };
  assert.throws(() => testOnly.canonicalStringify({ a: shared, b: shared }), (error) => error?.code === "NON_TREE_JSON");
  assert.throws(() => testOnly.canonicalStringify({ value: Number.POSITIVE_INFINITY }), (error) => error?.code === "NON_JSON_VALUE");
});

test("a recomputed digest cannot alter the ledger identity or add unknown fields", () => {
  const wrongId = clone(persisted);
  wrongId.ledgerId = "hakimi.bazi.expert-privacy-formal-intake-reconciliation/9.9.9";
  assert.throws(
    () => testOnly.assertPersistedSemantic(forgeDigest(wrongId), bundle.ledger),
    (error) => error?.code === "PARENT_BOUNDARY_MISMATCH"
  );
  const unknown = clone(persisted);
  unknown.unreviewedAuthority = true;
  rejectsProjection(unknown);
});

test("post-import WeakSet.add capture and WeakSet.has always-true cannot forge this module brand", async () => {
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  const capturedSets = [];
  try {
    WeakSet.prototype.add = function captureSet(value) {
      capturedSets[capturedSets.length] = this;
      return Reflect.apply(originalAdd, this, [value]);
    };
    const fresh = await loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot);
    assert.equal(isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(fresh), true);
  } finally {
    WeakSet.prototype.add = originalAdd;
  }
  const forged = {};
  for (let index = 0; index < capturedSets.length; index += 1) {
    Reflect.apply(originalAdd, capturedSets[index], [forged]);
  }
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(forged), false);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import Object.freeze and Array iterator tampering cannot skip nested result freezing", () => {
  const originalFreeze = Object.freeze;
  const originalIterator = Array.prototype[Symbol.iterator];
  let finalResultReachedLiveFreeze = false;
  try {
    Object.freeze = (value) => {
      if (value?.privacyFormalIntakeReconciliationMechanicallyVerified === true) {
        finalResultReachedLiveFreeze = true;
        value.releaseReady = true;
      }
      return value;
    };
    Array.prototype[Symbol.iterator] = function* emptyIterator() {};
    const summary = getBaziExpertPrivacyFormalIntakeReconciliationSummary(verified);
    assert.equal(summary.releaseReady, false);
    assert.equal(Object.isFrozen(summary), true);
    assert.equal(Object.isFrozen(summary.artifact), true);
  } finally {
    Object.freeze = originalFreeze;
    Array.prototype[Symbol.iterator] = originalIterator;
  }
  assert.equal(finalResultReachedLiveFreeze, false);
});

test("post-import JSON.parse, toJSON, and String tampering cannot rewrite summaries or serialization", () => {
  const originalParse = JSON.parse;
  const originalString = globalThis.String;
  const previousToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  try {
    JSON.parse = () => ({ releaseReady: true, safeToPublish: true, forged: true });
    globalThis.String = () => "0";
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value() { return { releaseReady: true, safeToPublish: true }; }
    });
    const summary = getBaziExpertPrivacyFormalIntakeReconciliationSummary(verified);
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.safeToPublish, false);
    assert.equal("forged" in summary, false);
    assert.equal(testOnly.canonicalStringify(["a", "b"]), "[\"a\",\"b\"]");
    assert.equal(testOnly.serialize({ a: 1 }), "{\n  \"a\": 1\n}\n");
    assert.throws(() => testOnly.canonicalStringify({ value: -0 }), (error) => error?.code === "NON_JSON_VALUE");
  } finally {
    JSON.parse = originalParse;
    globalThis.String = originalString;
    delete Object.prototype.toJSON;
    if (previousToJson) Object.defineProperty(Object.prototype, "toJSON", previousToJson);
  }
});

test("inherited descriptor.value and Array prototype index setters cannot bypass passive canonicalization", () => {
  const previousValue = Object.getOwnPropertyDescriptor(Object.prototype, "value");
  const previousIndex = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  let accessorInvoked = false;
  let inheritedSetterInvoked = false;
  const hostile = {};
  Object.defineProperty(hostile, "secret", {
    enumerable: true,
    get() { accessorInvoked = true; return "leak"; }
  });
  try {
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      set() { inheritedSetterInvoked = true; }
    });
    Object.defineProperty(Object.prototype, "value", { value: "forged", configurable: true });
    assert.throws(() => testOnly.canonicalStringify(hostile), (error) => error?.code === "NON_PASSIVE_OBJECT");
    assert.equal(testOnly.canonicalStringify(["x"]), "[\"x\"]");
  } finally {
    delete Object.prototype.value;
    if (previousValue) Object.defineProperty(Object.prototype, "value", previousValue);
    if (previousIndex) Object.defineProperty(Array.prototype, "0", previousIndex);
    else delete Array.prototype[0];
  }
  assert.equal(accessorInvoked, false);
  assert.equal(inheritedSetterInvoked, false);
});

test("CLI reports runtime-trust calibration and keeps visible/specific mutation failures non-leaking", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  const normal = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot, env: cleanEnv, encoding: "utf8"
  });
  const okPrefix = "BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_OBSERVATION_OK ";
  assert.equal(normal.status, 0);
  assert.equal(normal.stderr, "");
  assert.equal(normal.stdout.startsWith(okPrefix), true);
  const observation = JSON.parse(normal.stdout.slice(okPrefix.length));
  assert.equal(observation.mechanicalObservationVerified, true);
  assert.deepEqual(observation.runtimeTrustCalibration, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  });
  const hiddenPreload = [
    "process.execArgv.length=0;delete process.env.NODE_OPTIONS;",
    "Object.freeze=(value)=>{",
    "if(value&&value.privacyFormalIntakeReconciliationMechanicallyVerified===true){",
    "value.releaseReady=true;value.safeToPublish=true;value.hiddenPreloadMutation=true;}",
    "return value;};"
  ].join("");
  const cases = [
    {
      args: [cliPath, path.join(workspaceRoot, "private", "secret-dossier.json")],
      env: cleanEnv,
      code: "CLI_ARGUMENTS_FORBIDDEN"
    },
    {
      args: [cliPath],
      env: { ...cleanEnv, NODE_OPTIONS: "--no-warnings" },
      code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN"
    },
    {
      args: ["--import", "data:text/javascript,globalThis.__baziPoc%3Dtrue", cliPath],
      env: cleanEnv,
      code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN"
    },
    {
      args: ["--import", `data:text/javascript,${encodeURIComponent(hiddenPreload)}`, cliPath],
      env: cleanEnv,
      code: "SUMMARY_RED_GATE_MISMATCH"
    }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const current = cases[index];
    const child = spawnSync(process.execPath, current.args, { cwd: workspaceRoot, env: current.env, encoding: "utf8" });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(child.stderr, `BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_FAILED ${current.code}\n`);
    assert.equal(child.stderr.includes(workspaceRoot), false);
    assert.equal(child.stderr.includes("secret-dossier"), false);
    assert.equal(child.stderr.includes("Error:"), false);
  }
});

test("importing the CLI is side-effect free and keeps the business module behind direct-entry dynamic import", async () => {
  const cliSource = await readFile(cliPath, "utf8");
  assert.match(cliSource, /await import\("\.\/bazi-expert-privacy-formal-intake-reconciliation-lib\.mjs"\)/u);
  assert.doesNotMatch(cliSource, /^import .*bazi-expert-privacy-formal-intake-reconciliation-lib/mu);
  const cliUrl = pathToFileURL(cliPath).href;
  const program = `process.exitCode=7;await import(${JSON.stringify(cliUrl)});process.stdout.write(JSON.stringify({exitCode:process.exitCode}));`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], {
    cwd: workspaceRoot,
    env: { ...process.env, NODE_OPTIONS: "" },
    encoding: "utf8"
  });
  assert.equal(child.status, 7);
  assert.equal(child.stdout, "{\"exitCode\":7}");
  assert.equal(child.stderr, "");
});
