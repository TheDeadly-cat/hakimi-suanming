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
  BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  computeBaziPr10bcVersionAwareCandidateDigest,
  isVerifiedBaziPr10bcVersionAwareCandidate,
  loadBaziPr10bcVersionAwareCandidate,
  baziPr10bcVersionAwareCandidateTestOnly
} from "./bazi-pr10bc-version-aware-candidate-lib.mjs";
import {
  verifyBaziPr10bcScopeReconciliation
} from "./bazi-pr10bc-scope-reconciliation-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const HISTORICAL_PR10BC_PATH =
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json";
const CANDIDATE_READINESS_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";
const SOURCE_V16_PATH = "content/bazi-strength-source-binding-candidates.v1.6.0.json";
const RIGHTS_V12_PATH = "content/bazi-strength-source-rights-candidates.v1.2.0.json";
const DTT_V1 = "dtt-chanwei-wikisource-r2600158-candidate-v1";
const DTT_V2 = "dtt-chanwei-wikisource-r2600158-candidate-v2";

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  SOURCE_V16_PATH,
  RIGHTS_V12_PATH,
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  CANDIDATE_READINESS_PATH,
  HISTORICAL_PR10BC_PATH,
  BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/bazi-core/src/index.ts",
  "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-pr10bc-v11-test-"));
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

function stripCandidateContextMetadata(value) {
  const clone = structuredClone(value);
  delete clone.supersedesCandidateId;
  delete clone.candidateIdentityRebound;
  delete clone.candidateParentRole;
  return clone;
}

test("live PR10BC v1.1 is a private-branded candidate-only capability with every red gate preserved", async () => {
  const result = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziPr10bcVersionAwareCandidate(result), true);
  assert.equal(result.versionAwareCandidateScopeReconciliationMechanicallyVerified, true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.scopeProjectionsReproduced, 9);
  assert.equal(result.dttAdjacentCandidateReferenceRebinds, 3);
  assert.equal(result.uniqueSupersedingSourceCandidateParents, 1);
  assert.equal(result.parallelBindingsCreated, 0);
  assert.equal(result.bindingRequired, 12);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.distributionPolicy, "link_only");
  assert.equal(result.formalSourceRightsRecordCount, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
  assert.equal(result.candidateNoticeProjectionReconciliationsResolved, 1);
  assert.equal(result.activeNoticeDiscrepancyPromotionBlocks, 1);
  assert.equal(result.candidateNoticeProjectionDiscrepancyPromotionBlocks, 0);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
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

test("deterministic builder reproduces the frozen persisted raw and semantic identities", async () => {
  const first = await baziPr10bcVersionAwareCandidateTestOnly.buildExpectedBundle(workspaceRoot);
  const second = await baziPr10bcVersionAwareCandidateTestOnly.buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.ledger, second.ledger);
  assert.equal(first.snapshot.rawBytes,
    baziPr10bcVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(first.snapshot.rawSha256,
    baziPr10bcVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(first.ledger.ledgerDigest,
    baziPr10bcVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.ledgerDigest);
  assert.equal(computeBaziPr10bcVersionAwareCandidateDigest(first.ledger),
    first.ledger.ledgerDigest);
});

test("historical PR10BC stays byte-for-byte frozen and is declared template-only", async () => {
  const bytes = await readFile(path.join(workspaceRoot, HISTORICAL_PR10BC_PATH));
  assert.equal(bytes.byteLength, 31668);
  assert.equal(sha256(bytes),
    "0aa6dda66b5d3b47a69d1decb73220ae5811af7d779516858aeb32ef18a1abd6");
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.historicalLineage.ledgerDigest,
    "5e742a8a92a8ca4ebf2337f5eb0866be6c962e53801e3d259de4571b0cd65116");
  assert.equal(next.historicalLineage.role,
    "fixed_projection_template_only_not_current_capability");
});

test("exactly three DTT adjacency references rebind while all other concept semantics stay unchanged", async () => {
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_PR10BC_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.concepts.length, oldLedger.concepts.length);
  let dttRebinds = 0;
  let nonDttContexts = 0;
  for (let index = 0; index < oldLedger.concepts.length; index += 1) {
    const before = structuredClone(oldLedger.concepts[index]);
    const after = structuredClone(next.concepts[index]);
    const oldAdjacent = before.adjacentHistoricalCandidates;
    const nextAdjacent = after.adjacentCandidateContexts;
    delete before.adjacentHistoricalCandidates;
    delete after.adjacentCandidateContexts;
    assert.deepEqual(after, before);
    assert.equal(nextAdjacent.length, oldAdjacent.length);
    for (let candidateIndex = 0; candidateIndex < oldAdjacent.length; candidateIndex += 1) {
      const oldCandidate = oldAdjacent[candidateIndex];
      const nextCandidate = nextAdjacent[candidateIndex];
      const stripped = stripCandidateContextMetadata(nextCandidate);
      if (oldCandidate.candidateId === DTT_V1) {
        dttRebinds += 1;
        assert.equal(nextCandidate.candidateId, DTT_V2);
        assert.equal(nextCandidate.supersedesCandidateId, DTT_V1);
        assert.equal(nextCandidate.candidateIdentityRebound, true);
        assert.equal(nextCandidate.candidateParentRole,
          "superseding_candidate_input_only_not_active_formal_parent");
        stripped.candidateId = DTT_V1;
      } else {
        nonDttContexts += 1;
        assert.equal(nextCandidate.supersedesCandidateId, null);
        assert.equal(nextCandidate.candidateIdentityRebound, false);
        assert.equal(nextCandidate.candidateParentRole,
          "unchanged_historical_text_candidate_context");
      }
      assert.deepEqual(stripped, oldCandidate);
    }
  }
  assert.equal(dttRebinds, 3);
  assert.equal(nonDttContexts, 6);
});

test("basis is exactly six current candidate artifacts and same-buffer transitivity is not claimed", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.basisArtifacts.map((entry) => entry.path), [
    CANDIDATE_READINESS_PATH,
    "content/bazi-strength-engineering-binding-candidates.v1.json",
    SOURCE_V16_PATH,
    RIGHTS_V12_PATH,
    "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
    "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json"
  ]);
  assert.equal(next.observationBoundary.directHistoricalPr10bcRawAndSemanticIdentityVerified, true);
  assert.equal(next.observationBoundary.historicalScopedInspectionProjectionReusedAfterRawIdentityMatch, true);
  assert.equal(next.observationBoundary.scopedArtifactPointInTimeRawIdentitiesVerified, 6);
  assert.equal(next.observationBoundary.upstreamBrandedDependenciesVerified, true);
  assert.equal(next.observationBoundary.nestedVerifierSameBufferTransitivityClaimed, false);
  assert.equal("basisArtifactHashAndParsedValidationUseSameReadBuffer" in next.observationBoundary, false);
  assert.equal("scopedSourceHashAndInspectionUseSameReadBuffer" in next.observationBoundary, false);
  assert.equal(next.gateSummary.candidateBindingsReferencedAsAdjacentContext, 4);
  assert.equal("historicalCandidateBindingsReferencedAsAdjacentContext" in next.gateSummary, false);
});

test("clones, test-only projections, old ledgers and self-resealed plain values never acquire the new brand", async () => {
  const branded = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  const bundle = await baziPr10bcVersionAwareCandidateTestOnly.buildExpectedBundle(workspaceRoot);
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_PR10BC_PATH), "utf8"));
  assert.equal(isVerifiedBaziPr10bcVersionAwareCandidate(structuredClone(branded)), false);
  assert.equal(isVerifiedBaziPr10bcVersionAwareCandidate(bundle.ledger), false);
  assert.equal(isVerifiedBaziPr10bcVersionAwareCandidate(oldLedger), false);
  assert.equal(isVerifiedBaziPr10bcVersionAwareCandidate({
    ...branded,
    ledgerDigest: branded.ledgerDigest
  }), false);
});

test("returned capability and nested ledger are deeply frozen", async () => {
  const result = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.concepts), true);
  assert.equal(Object.isFrozen(result.ledger.concepts[0].adjacentCandidateContexts), true);
  assert.throws(() => {
    result.ledger.concepts[0].formalScoringAllowed = true;
  }, TypeError);
});

test("legacy PR10BC chain remains red before it can consume the independent v1.1 candidate", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  await assert.rejects(verifyBaziPr10bcScopeReconciliation(workspaceRoot, next),
    (error) => error?.code === "LEDGER_MISMATCH");
});

test("same-semantic whitespace drift fails the v1.1 raw pin", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root), expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed binding and authority promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH, (value) => {
    value.gateSummary.bindingFrozenVerified = 1;
    value.gateSummary.releaseReady = true;
    value.gateSummary.publicDeploymentAuthorized = true;
    value.ledgerDigest = computeBaziPr10bcVersionAwareCandidateDigest(value);
  });
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("PR10BC_V11_MISMATCH"));
});

test("self-resealed atomicity epoch receipt and ABA promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH, (value) => {
    value.observationBoundary.crossFileAtomicSnapshot = true;
    value.observationBoundary.mutationEpochAvailableForSchema13 = true;
    value.observationBoundary.mutationEpochReceipt = "forged";
    value.observationBoundary.intervalMutationExcluded = true;
    value.observationBoundary.abaExcluded = true;
    value.ledgerDigest = computeBaziPr10bcVersionAwareCandidateDigest(value);
  });
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("PR10BC_V11_MISMATCH"));
});

test("partial DTT reference rollback cannot pass even with a recomputed digest", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH, (value) => {
    const target = value.concepts.flatMap((entry) => entry.adjacentCandidateContexts)
      .find((entry) => entry.candidateId === DTT_V2);
    target.candidateId = DTT_V1;
    target.candidateIdentityRebound = false;
    value.ledgerDigest = computeBaziPr10bcVersionAwareCandidateDigest(value);
  });
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("PR10BC_V11_MISMATCH"));
});

test("old source on the superseding path cannot reach PR10BC v1.1", async (t) => {
  const root = await fixture(t);
  await copyFile(path.join(root, "content/bazi-strength-source-binding-candidates.v1.json"),
    path.join(root, SOURCE_V16_PATH));
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    (error) => error?.code === "SOURCE_SUPERSESSION_MISMATCH"
      || error?.code === "SOURCE_SUPERSESSION_RAW_DRIFT");
});

test("old rights on the superseding path cannot reach PR10BC v1.1", async (t) => {
  const root = await fixture(t);
  await copyFile(path.join(root, "content/bazi-strength-source-rights-candidates.v1.json"),
    path.join(root, RIGHTS_V12_PATH));
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    (error) => error?.code === "RIGHTS_SUPERSESSION_MISMATCH"
      || error?.code === "RIGHTS_SUPERSESSION_RAW_DRIFT");
});

test("candidate readiness drift is rejected by its upstream fixed raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, CANDIDATE_READINESS_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    (error) => error?.code === "PERSISTED_RAW_DRIFT"
      || error?.code === "READINESS_V17_MISMATCH");
});

test("a scoped production artifact drift fails before historical projection reuse", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, "packages/bazi-core/src/index.ts");
  await writeFile(target, `${await readFile(target, "utf8")}\n`, "utf8");
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("SCOPED_ARTIFACT_DRIFT"));
});

test("historical PR10BC raw drift cannot be hidden by its semantic digest", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, HISTORICAL_PR10BC_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("HISTORICAL_PR10BC_RAW_DRIFT"));
});

test("duplicate and escaped duplicate keys fail closed", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('  "schemaVersion":',
    '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("JSON_DUPLICATE_KEY"));
});

test("BOM and invalid UTF-8 persisted bytes fail closed", async (t) => {
  const bomRoot = await fixture(t);
  const bomTarget = path.join(bomRoot, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const original = await readFile(bomTarget);
  await writeFile(bomTarget, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), original]));
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(bomRoot),
    (error) => error?.code === "JSON_BOM_FORBIDDEN");

  const utf8Root = await fixture(t);
  const utf8Target = path.join(utf8Root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(utf8Target, Buffer.from([0xc3, 0x28]));
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(utf8Root),
    (error) => error?.code === "JSON_UTF8_INVALID");
});

test("hard-linked persisted v1.1 artifact is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await link(target, path.join(root, "pr10bc-v11-hardlink.json"));
  await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
    expectCode("HARDLINK_REJECTED"));
});

test("captured builtins survive post-import same-realm poisoning", async () => {
  const originals = {
    objectFreeze: Object.freeze,
    objectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    reflectOwnKeys: Reflect.ownKeys,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
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
    fsPromises.open = poison;
    fsPromises.lstat = poison;
    fsPromises.realpath = poison;
    syncBuiltinESMExports();
    const result = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
    assert.equal(result.bindingFrozenVerified, 0);
    assert.equal(result.formalAdmissionPromotionBlocked, true);
  } finally {
    Object.freeze = originals.objectFreeze;
    Object.getOwnPropertyDescriptor = originals.objectGetOwnPropertyDescriptor;
    Reflect.ownKeys = originals.reflectOwnKeys;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.has = originals.weakSetHas;
    fsPromises.open = originals.fsOpen;
    fsPromises.lstat = originals.fsLstat;
    fsPromises.realpath = originals.fsRealpath;
    syncBuiltinESMExports();
  }
});

test("same-length raw drift cannot be hidden by fs clean-clone, Hash or FileHandle poisoning", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "pr10bc-v11-clean-clone.json");
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
        const expected = baziPr10bcVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256;
        return args[0] === "hex" ? expected : Buffer.from(expected, "hex");
      }
      return Reflect.apply(originalHashDigest, this, args);
    };
    fileHandlePrototype.readFile = async function poisonedReadFile(...args) {
      const actual = await Reflect.apply(originalHandleReadFile, this, args);
      return actual.equals(driftedBytes) ? Buffer.from(originalBytes) : actual;
    };
    syncBuiltinESMExports();
    await assert.rejects(loadBaziPr10bcVersionAwareCandidate(root),
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

test("a valid decoy and extra caller arguments cannot replace a drifted fixed artifact path", async (t) => {
  const root = await fixture(t);
  const decoy = path.join(root, "decoy.json");
  const target = path.join(root, BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const original = await readFile(target);
  await writeFile(decoy, original);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(
    loadBaziPr10bcVersionAwareCandidate(root, decoy, {
      ledgerPath: decoy,
      publicDeploymentAuthorized: true
    }),
    expectCode("PERSISTED_RAW_DRIFT")
  );
});

test("every directly raw-bound PR10BC text path is pinned to LF checkout semantics", async () => {
  const attributes = new Set((await readFile(path.join(workspaceRoot, ".gitattributes"), "utf8"))
    .split(/\r?\n/u));
  const requiredPaths = [
    HISTORICAL_PR10BC_PATH,
    "content/bazi-strength-engineering-binding-candidates.v1.json",
    "packages/bazi-interpretation/src/strength-assessment-core.ts",
    "packages/bazi-interpretation/src/strength-policy.ts",
    "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
    "packages/bazi-core/src/index.ts",
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
    "packages/bazi-interpretation/src/strength-claim-registry.ts",
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    "scripts/bazi-pr10bc-version-aware-candidate-lib.mjs",
    "scripts/verify-bazi-pr10bc-version-aware-candidate.mjs",
    "scripts/verify-bazi-pr10bc-version-aware-candidate.test.mjs",
    "docs/阶段C-PR10BC版本感知候选重绑-v1-2026-08-30.md"
  ];
  for (const relativePath of requiredPaths) {
    assert.equal(attributes.has(`/${relativePath} text eol=lf`), true, relativePath);
  }
});

test("old gap and active/default consumers do not import the new PR10BC candidate capability", async () => {
  const paths = [
    "scripts/bazi-pr10bc-scope-reconciliation-lib.mjs",
    "scripts/verify-bazi-pr10bc-scope-reconciliation.mjs",
    "scripts/bazi-engineering-binding-value-subject-gap-lib.mjs",
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
    assert.equal(source.includes("bazi-pr10bc-version-aware-candidate"), false, relativePath);
    assert.equal(source.includes(BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), false,
      relativePath);
  }
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes("verify-bazi-pr10bc-version-aware-candidate"), false, scriptName);
    assert.equal(script.includes("bazi-pr10bc-version-aware-candidate"), false, scriptName);
  }
});
