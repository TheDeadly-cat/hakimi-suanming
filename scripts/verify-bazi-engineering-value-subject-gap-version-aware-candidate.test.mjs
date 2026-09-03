import test from "node:test";
import assert from "node:assert/strict";
import fsPromises, {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import crypto, { createHash } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest,
  isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate,
  loadBaziEngineeringValueSubjectGapVersionAwareCandidate,
  baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
} from "./bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs";
import {
  verifyBaziEngineeringBindingValueSubjectGap
} from "./bazi-engineering-binding-value-subject-gap-lib.mjs";
import {
  loadBaziPr10bcVersionAwareCandidate
} from "./bazi-pr10bc-version-aware-candidate-lib.mjs";
import {
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const HISTORICAL_GAP_PATH =
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json";
const CANDIDATE_PR10BC_PATH =
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json";
const CANDIDATE_READINESS_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  CANDIDATE_READINESS_PATH,
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json",
  CANDIDATE_PR10BC_PATH,
  HISTORICAL_GAP_PATH,
  BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/bazi-interpretation/src/interpretation-evidence-envelope.ts",
  "packages/bazi-interpretation/src/source-refs.ts",
  "packages/bazi-core/src/index.ts",
  "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
  "apps/web/src/components/bazi-interpretation-panel.tsx",
  "apps/web/src/lib/local-ai-draft-validation.ts",
  "packages/research-export/src/single-chart-report.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts",
  "package-lock.json"
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-gap-v11-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of FIXTURE_PATHS) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), target);
  }
  return root;
}

async function mutateJson(root, relativePath, mutate) {
  const target = path.join(root, relativePath);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameLengthSemanticWhitespaceDrift(bytes) {
  const source = bytes.toString("utf8");
  const drifted = source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"');
  assert.notEqual(drifted, source);
  const result = Buffer.from(drifted, "utf8");
  assert.equal(result.byteLength, bytes.byteLength);
  return result;
}

test("live gap v1.1 is private-branded, candidate-only and keeps every authority gate red", async () => {
  const result = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(result), true);
  assert.equal(result.versionAwareCandidateEngineeringValueSubjectGapMechanicallyVerified, true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.versionAwareCandidateParentArtifacts, 2);
  assert.equal(result.historicalValueSubjectProjectionReusedAfterRawIdentityMatch, true);
  assert.equal(result.bindingInventoryChanged, false);
  assert.equal(result.parallelBindingsCreated, 0);
  assert.equal(result.currentBindings, 12);
  assert.equal(result.engineeringBindingsScoped, 7);
  assert.equal(result.engineeringValueSubjectsObserved, 33);
  assert.equal(result.valueSubjectsFreezeEligible, 0);
  assert.equal(result.bindingRequired, 12);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.distributionPolicy, "link_only");
  assert.equal(result.formalSourceRightsRecordCount, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
  assert.equal(result.candidateNoticeProjectionReconciliationsResolved, 1);
  assert.equal(result.activeNoticeDiscrepancyPromotionBlocks, 1);
  assert.equal(result.candidateNoticeProjectionDiscrepancyPromotionBlocks, 0);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  assert.equal(result.formalActivationAllowed, false);
  assert.equal(result.contentTruthEstablished, false);
  assert.equal(result.expertTruthEstablished, false);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.crossFileAtomicSnapshot, false);
  assert.equal(result.mutationEpochAvailable, false);
  assert.equal(result.mutationEpochReceipt, null);
  assert.equal(result.intervalMutationExcludedAcrossFiles, false);
  assert.equal(result.abaExcluded, false);
});

test("deterministic builder reproduces frozen raw and semantic identities", async () => {
  const first = await baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const second = await baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.ledger, second.ledger);
  assert.equal(first.snapshot.rawBytes,
    baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(first.snapshot.rawSha256,
    baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(first.ledger.ledgerDigest,
    baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.ledgerDigest);
  assert.equal(computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(first.ledger),
    first.ledger.ledgerDigest);
});

test("historical gap stays byte-for-byte frozen and template-only", async () => {
  const bytes = await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH));
  assert.equal(bytes.byteLength, 52073);
  assert.equal(sha256(bytes),
    "5c7a999738200b55f5e3e79a3ff7b2c73f59d8af61846046d26ea1e31987c4c0");
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.historicalLineage.ledgerDigest,
    "7a03874b6009928367bf8c5aa60a1312d519d0f8c4ee339c83bc7a40f0b8e81d");
  assert.equal(next.historicalLineage.role,
    "fixed_value_subject_projection_template_only_not_current_capability");
});

test("the seven bindings and all 33 value subjects remain exact historical projections", async () => {
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.currentBindingInventory, oldLedger.currentBindingInventory);
  assert.deepEqual(next.valueSubjectBoundary, oldLedger.valueSubjectBoundary);
  assert.deepEqual(next.engineeringBindings, oldLedger.engineeringBindings);
  assert.deepEqual(next.crossBindingGaps, oldLedger.crossBindingGaps);
  assert.equal(next.engineeringBindings.reduce((sum, entry) => sum + entry.valueSubjects.length, 0), 33);
  assert.equal(next.engineeringBindings.every((entry) => entry.bindingFreezeEligible === false), true);
  assert.equal(next.engineeringBindings.every((entry) => entry.freezeEffect === "none"), true);
});

test("scope, gate and does-not-establish data only gain candidate-qualified metadata", async () => {
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  const scope = structuredClone(next.scopeBoundary);
  delete scope.versionAwareCandidateParentRebound;
  delete scope.activeAdmissionEffect;
  assert.deepEqual(scope, oldLedger.scopeBoundary);
  const gate = structuredClone(next.gateSummary);
  delete gate.versionAwareCandidateParentArtifacts;
  delete gate.historicalValueSubjectProjectionReusedAfterRawIdentityMatch;
  delete gate.bindingInventoryChanged;
  delete gate.parallelBindingsCreated;
  delete gate.activeAdmissionEffect;
  delete gate.formalAdmissionPromotionBlocked;
  assert.deepEqual(gate, oldLedger.gateSummary);
  assert.deepEqual(next.doesNotEstablish.slice(0, -2), oldLedger.doesNotEstablish);
  assert.equal(next.doesNotEstablish.at(-2), "active_readiness_or_formal_admission");
  assert.equal(next.doesNotEstablish.at(-1), "formal_parent_identity");
});

test("only the first two of sixteen basis artifacts rebind and fourteen remain exact", async () => {
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.basisArtifacts.length, 16);
  assert.equal(next.basisArtifacts[0].path, CANDIDATE_PR10BC_PATH);
  assert.equal(next.basisArtifacts[0].role, "version_aware_pr10bc_candidate_parent");
  assert.equal(next.basisArtifacts[1].path, CANDIDATE_READINESS_PATH);
  assert.equal(next.basisArtifacts[1].role, "version_aware_candidate_readiness_parent");
  assert.deepEqual(next.basisArtifacts.slice(2), oldLedger.basisArtifacts.slice(2));
});

test("observation wording does not claim transitive same-buffer or fresh AST verification", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.observationBoundary.directHistoricalGapRawAndSemanticIdentityVerified, true);
  assert.equal(next.observationBoundary.historicalValueSubjectProjectionReusedAfterBasisRawIdentityMatch, true);
  assert.equal(next.observationBoundary.unchangedDirectBasisPointInTimeRawIdentitiesVerified, 14);
  assert.equal(next.observationBoundary.upstreamBrandedDependenciesVerified, true);
  assert.equal(next.observationBoundary.nestedVerifierSameBufferTransitivityClaimed, false);
  assert.equal(next.observationBoundary.stableExecutableSyntaxProjectionReusedAfterRawIdentityMatch, true);
  assert.equal("directBasisHashAndParseUseSameReadBuffer" in next.observationBoundary, false);
  assert.equal("directSourceHashAndAstInspectionUseSameReadBuffer" in next.observationBoundary, false);
});

test("clones, test-only projections, old ledgers and self-resealed plain values never gain the brand", async () => {
  const branded = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  const bundle = await baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH), "utf8"));
  assert.equal(isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(
    structuredClone(branded)), false);
  assert.equal(isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(bundle.ledger), false);
  assert.equal(isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(oldLedger), false);
  assert.equal(isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate({
    ...branded,
    ledgerDigest: branded.ledgerDigest
  }), false);
});

test("returned capability and all nested value subjects are deeply frozen", async () => {
  const result = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.engineeringBindings), true);
  assert.equal(Object.isFrozen(result.ledger.engineeringBindings[0].valueSubjects), true);
  assert.throws(() => {
    result.ledger.engineeringBindings[0].bindingFreezeEligible = true;
  }, TypeError);
});

test("legacy engineering gap chain remains red before it can consume the independent v1.1 candidate", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  await assert.rejects(verifyBaziEngineeringBindingValueSubjectGap(workspaceRoot, next),
    (error) => error?.code === "LEDGER_MISMATCH");
});

test("this layer directly requires both upstream WeakSet brands and invokes both tuple assertions", async () => {
  const candidatePr10bc = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  const candidateReadiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.doesNotThrow(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidatePr10bc(candidatePr10bc));
  assert.doesNotThrow(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidateReadiness(candidateReadiness));
  assert.throws(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidatePr10bc(structuredClone(candidatePr10bc)),
  expectCode("CANDIDATE_PR10BC_BRAND_REQUIRED"));
  assert.throws(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidateReadiness(structuredClone(candidateReadiness)),
  expectCode("CANDIDATE_READINESS_BRAND_REQUIRED"));
  assert.throws(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidatePr10bc(candidateReadiness),
  expectCode("CANDIDATE_PR10BC_BRAND_REQUIRED"));
  assert.throws(() => baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
    .assertCandidateReadiness(candidatePr10bc),
  expectCode("CANDIDATE_READINESS_BRAND_REQUIRED"));
  const source = await readFile(path.join(workspaceRoot,
    "scripts/bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs"), "utf8");
  assert.match(source, /assertCandidatePr10bc\(candidatePr10bc\);/u);
  assert.match(source, /assertCandidateReadiness\(candidateReadiness\);/u);
});

test("same-semantic whitespace drift fails the v1.1 raw pin", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const original = await readFile(target);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed value freeze and authority promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.engineeringBindings[0].bindingFreezeEligible = true;
      value.engineeringBindings[0].freezeEffect = "formal";
      value.gateSummary.valueSubjectsFreezeEligible = 1;
      value.gateSummary.releaseReady = true;
      value.gateSummary.publicDeploymentAuthorized = true;
      value.ledgerDigest = computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("GAP_V11_MISMATCH"));
});

test("self-resealed atomicity epoch receipt and ABA promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.observationBoundary.crossFileAtomicSnapshot = true;
      value.observationBoundary.mutationEpochAvailableForSchema13 = true;
      value.observationBoundary.mutationEpochReceipt = "forged";
      value.observationBoundary.intervalMutationExcluded = true;
      value.observationBoundary.abaExcluded = true;
      value.ledgerDigest = computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("GAP_V11_MISMATCH"));
});

test("candidate PR10BC raw drift cannot reach gap v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, CANDIDATE_PR10BC_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("candidate readiness raw drift cannot reach gap v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, CANDIDATE_READINESS_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("one of fourteen unchanged direct basis artifacts drifting fails closed", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, "apps/web/src/lib/local-ai-draft-validation.ts");
  await writeFile(target, `${await readFile(target, "utf8")}\n`, "utf8");
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("UNCHANGED_BASIS_RAW_DRIFT"));
});

test("historical gap raw drift cannot be hidden by its semantic digest", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, HISTORICAL_GAP_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('{"schemaVersion"', '{ "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("HISTORICAL_GAP_RAW_DRIFT"));
});

test("duplicate and escaped duplicate keys fail closed", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('  "schemaVersion":',
    '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("JSON_DUPLICATE_KEY"));
});

test("BOM and invalid UTF-8 persisted bytes fail closed", async (t) => {
  const bomRoot = await fixture(t);
  const bomTarget = path.join(bomRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(bomTarget, Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    await readFile(bomTarget)
  ]));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(bomRoot),
    expectCode("JSON_BOM_FORBIDDEN"));

  const utf8Root = await fixture(t);
  const utf8Target = path.join(utf8Root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(utf8Target, Buffer.from([0xc3, 0x28]));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(utf8Root),
    expectCode("JSON_UTF8_INVALID"));
});

test("hard-linked persisted gap v1.1 is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await link(target, path.join(root, "gap-v11-hardlink.json"));
  await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
    expectCode("HARDLINK_REJECTED"));
});

test("captured builtins survive post-import same-realm poisoning", async () => {
  const originals = {
    objectFreeze: Object.freeze,
    objectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    reflectOwnKeys: Reflect.ownKeys,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    arraySlice: Array.prototype.slice,
    fsOpen: fsPromises.open,
    fsLstat: fsPromises.lstat,
    fsRealpath: fsPromises.realpath
  };
  const poison = () => { throw new Error("poisoned builtin invoked"); };
  try {
    Object.freeze = poison;
    Object.getOwnPropertyDescriptor = poison;
    Reflect.ownKeys = poison;
    WeakSet.prototype.add = poison;
    WeakSet.prototype.has = poison;
    Array.prototype.slice = poison;
    fsPromises.open = poison;
    fsPromises.lstat = poison;
    fsPromises.realpath = poison;
    syncBuiltinESMExports();
    const result = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
    assert.equal(result.engineeringValueSubjectsObserved, 33);
    assert.equal(result.valueSubjectsFreezeEligible, 0);
  } finally {
    Object.freeze = originals.objectFreeze;
    Object.getOwnPropertyDescriptor = originals.objectGetOwnPropertyDescriptor;
    Reflect.ownKeys = originals.reflectOwnKeys;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.has = originals.weakSetHas;
    Array.prototype.slice = originals.arraySlice;
    fsPromises.open = originals.fsOpen;
    fsPromises.lstat = originals.fsLstat;
    fsPromises.realpath = originals.fsRealpath;
    syncBuiltinESMExports();
  }
});

test("same-length drift cannot be hidden by fs clean-clone, Hash or FileHandle poisoning", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "gap-v11-clean-clone.json");
  const originalBytes = await readFile(target);
  const driftedBytes = sameLengthSemanticWhitespaceDrift(originalBytes);
  await writeFile(cleanClone, originalBytes);
  await writeFile(target, driftedBytes);

  const originalOpen = fsPromises.open;
  const originalLstat = fsPromises.lstat;
  const originalRealpath = fsPromises.realpath;
  const originalCreateHash = crypto.createHash;
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalHashUpdate = hashPrototype.update;
  const originalHashDigest = hashPrototype.digest;
  const targetedHashes = new WeakSet();
  const probe = await open(target, "r");
  const fileHandlePrototype = Object.getPrototypeOf(probe);
  const originalHandleReadFile = fileHandlePrototype.readFile;
  await probe.close();
  const targetKey = target.toLowerCase();
  const redirectsTarget = (value) => typeof value === "string"
    && path.resolve(value).toLowerCase() === targetKey;
  try {
    fsPromises.open = (value, ...args) => originalOpen(
      redirectsTarget(value) ? cleanClone : value,
      ...args
    );
    fsPromises.lstat = (value, ...args) => originalLstat(
      redirectsTarget(value) ? cleanClone : value,
      ...args
    );
    fsPromises.realpath = (value, ...args) => originalRealpath(value, ...args);
    crypto.createHash = (...args) => Reflect.apply(originalCreateHash, crypto, args);
    hashPrototype.update = function poisonedUpdate(data, ...args) {
      const observed = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, typeof args[0] === "string" ? args[0] : "utf8");
      if (observed.equals(driftedBytes)) targetedHashes.add(this);
      return Reflect.apply(originalHashUpdate, this, [data, ...args]);
    };
    hashPrototype.digest = function poisonedDigest(...args) {
      if (targetedHashes.has(this)) {
        const expected = baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly
          .EXPECTED_PERSISTED.rawSha256;
        return args[0] === "hex" ? expected : Buffer.from(expected, "hex");
      }
      return Reflect.apply(originalHashDigest, this, args);
    };
    fileHandlePrototype.readFile = async function poisonedReadFile(...args) {
      const actual = await Reflect.apply(originalHandleReadFile, this, args);
      return actual.equals(driftedBytes) ? Buffer.from(originalBytes) : actual;
    };
    syncBuiltinESMExports();
    await assert.rejects(loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root),
      expectCode("PERSISTED_RAW_DRIFT"));
  } finally {
    fsPromises.open = originalOpen;
    fsPromises.lstat = originalLstat;
    fsPromises.realpath = originalRealpath;
    crypto.createHash = originalCreateHash;
    hashPrototype.update = originalHashUpdate;
    hashPrototype.digest = originalHashDigest;
    fileHandlePrototype.readFile = originalHandleReadFile;
    syncBuiltinESMExports();
  }
});

test("a valid decoy and extra caller arguments cannot replace the fixed artifact", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const decoy = path.join(root, "gap-v11-decoy.json");
  const original = await readFile(target);
  await writeFile(decoy, original);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(
    loadBaziEngineeringValueSubjectGapVersionAwareCandidate(root, decoy, {
      ledgerPath: decoy,
      releaseReady: true
    }),
    expectCode("PERSISTED_RAW_DRIFT")
  );
});

test("every directly raw-bound gap text path is pinned to LF checkout semantics", async () => {
  const attributes = new Set((await readFile(path.join(workspaceRoot, ".gitattributes"), "utf8"))
    .split(/\r?\n/u));
  const historical = JSON.parse(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH),
    "utf8"));
  const requiredPaths = [
    HISTORICAL_GAP_PATH,
    CANDIDATE_PR10BC_PATH,
    CANDIDATE_READINESS_PATH,
    ...historical.basisArtifacts.slice(2).map((entry) => entry.path),
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    "scripts/bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs",
    "scripts/verify-bazi-engineering-value-subject-gap-version-aware-candidate.mjs",
    "scripts/verify-bazi-engineering-value-subject-gap-version-aware-candidate.test.mjs",
    "docs/阶段C-engineering-value-subject-gap版本感知候选-v1-2026-08-30.md"
  ];
  for (const relativePath of requiredPaths) {
    assert.equal(attributes.has(`/${relativePath} text eol=lf`), true, relativePath);
  }
});

test("old weights, C-M1 and active/default consumers do not import the new gap capability", async () => {
  const paths = [
    "scripts/bazi-engineering-binding-value-subject-gap-lib.mjs",
    "scripts/verify-bazi-engineering-binding-value-subject-gap.mjs",
    "scripts/bazi-policy-weights-value-evidence-candidate-lib.mjs",
    "scripts/bazi-project-copy-materialization-lib.mjs",
    "scripts/bazi-expert-review-packet-lib.mjs",
    "scripts/bazi-expert-authority-material-precheck-lib.mjs",
    "scripts/bazi-private-exact-quote-material-verifier-lib.mjs",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/cross-system-engineering-fact-receipt-lib.mjs"
  ];
  for (const relativePath of paths) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes("bazi-engineering-value-subject-gap-version-aware-candidate"),
      false, relativePath);
    assert.equal(source.includes(
      BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH),
    false, relativePath);
  }
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes("verify-bazi-engineering-value-subject-gap-version-aware-candidate"),
      false, scriptName);
    assert.equal(script.includes("bazi-engineering-value-subject-gap-version-aware-candidate"),
      false, scriptName);
  }
});
