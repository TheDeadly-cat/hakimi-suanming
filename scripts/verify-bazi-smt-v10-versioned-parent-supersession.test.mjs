import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  computeCandidateDigest,
  computeFacsimileCollationCandidateDigest,
  computeLedgerDigest,
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest,
  verifyBaziSourceRightsCandidateLedger
} from "./bazi-source-rights-candidate-lib.mjs";
import {
  baziDttVersionedParentSupersessionTestOnly,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  BaziSmtV10VersionedParentSupersessionError,
  RIGHTS_SUPERSESSION_RELATIVE_PATH,
  SOURCE_SUPERSESSION_RELATIVE_PATH,
  SUPERSESSION_RECEIPT_RELATIVE_PATH,
  baziSmtV10VersionedParentSupersessionTestOnly,
  isVerifiedBaziSmtV10VersionedParentSupersession,
  loadBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";

const WORKSPACE_ROOT = resolve(import.meta.dirname, "..");
const NEW_ARTIFACT_PATHS = [
  SOURCE_SUPERSESSION_RELATIVE_PATH,
  RIGHTS_SUPERSESSION_RELATIVE_PATH,
  SUPERSESSION_RECEIPT_RELATIVE_PATH
];
const REQUIRED_PARENT_PATHS = [
  baziDttVersionedParentSupersessionTestOnly.HISTORICAL_SOURCE.path,
  baziDttVersionedParentSupersessionTestOnly.HISTORICAL_RIGHTS.path,
  baziDttVersionedParentSupersessionTestOnly.DTT_PUBLIC_EVIDENCE.path,
  baziDttVersionedParentSupersessionTestOnly.DTT_RECONCILIATION.path,
  baziDttVersionedParentSupersessionTestOnly.EXPECTED_NEW_SOURCE.path,
  baziDttVersionedParentSupersessionTestOnly.EXPECTED_NEW_RIGHTS.path,
  baziDttVersionedParentSupersessionTestOnly.EXPECTED_RECEIPT.path,
  baziDttVersionedParentSupersessionTestOnly.BOUND_READINESS.path,
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts",
  baziSmtV10VersionedParentSupersessionTestOnly.BINDING_READINESS.path,
  baziSmtV10VersionedParentSupersessionTestOnly.CARRIER_READINESS.path
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function copyArtifact(relativePath, destinationRoot) {
  const destination = join(destinationRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(WORKSPACE_ROOT, relativePath), destination);
}

async function makeWorkspace(t, { includeNewArtifacts = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), "hakimi-smt-v10-supersession-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relativePath of REQUIRED_PARENT_PATHS) await copyArtifact(relativePath, root);
  if (includeNewArtifacts) {
    for (const relativePath of NEW_ARTIFACT_PATHS) await copyArtifact(relativePath, root);
  }
  return root;
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(join(root, relativePath), "utf8"));
}

async function writeJson(root, relativePath, value) {
  await writeFile(join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("loads the exact paired SMT-v10 supersession with a private brand", async () => {
  const result = await loadBaziSmtV10VersionedParentSupersession(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(result), true);
  assert.equal(result.offlineVersionedParentSupersessionMechanicallyVerified, true);
  assert.equal(result.operatorRecordedSameSikuLabelObserved, true);
  assert.equal(result.sameEditionVerified, false);
  assert.equal(result.specificWikisourceCarrierProvenanceEstablished, false);
  assert.equal(result.operatorRecordedCarrierRawBytes, 8321599);
  assert.equal(result.externalCarrierLiveVerifiedThisRun, false);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
});

test("builder is deterministic and persisted artifacts are byte-exact", async () => {
  const first = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const second = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  assert.deepEqual(first.sourceBytes, second.sourceBytes);
  assert.deepEqual(first.rightsBytes, second.rightsBytes);
  assert.deepEqual(first.receiptBytes, second.receiptBytes);
  assert.deepEqual(first.sourceBytes, await readFile(join(WORKSPACE_ROOT, SOURCE_SUPERSESSION_RELATIVE_PATH)));
  assert.deepEqual(first.rightsBytes, await readFile(join(WORKSPACE_ROOT, RIGHTS_SUPERSESSION_RELATIVE_PATH)));
  assert.deepEqual(first.receiptBytes, await readFile(join(WORKSPACE_ROOT, SUPERSESSION_RECEIPT_RELATIVE_PATH)));
});

test("only SMT-v10 changes and the change is exactly one anchor, two collations, and one rights layer", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  assert.equal(bundle.source.candidates.length, bundle.parentSource.candidates.length);
  assert.equal(bundle.rights.candidates.length, bundle.parentRights.candidates.length);
  for (let index = 1; index < bundle.source.candidates.length; index += 1) {
    assert.deepEqual(bundle.source.candidates[index], bundle.parentSource.candidates[index]);
    assert.deepEqual(bundle.rights.candidates[index], bundle.parentRights.candidates[index]);
  }
  assert.equal(bundle.source.candidates[0].facsimileAnchors.length,
    bundle.parentSource.candidates[0].facsimileAnchors.length + 1);
  assert.equal(bundle.source.candidates[0].facsimileCollationCandidates.length,
    bundle.parentSource.candidates[0].facsimileCollationCandidates.length + 2);
  assert.equal(bundle.rights.candidates[0].carrierLayers.length,
    bundle.parentRights.candidates[0].carrierLayers.length + 1);
});

test("CADAL carrier raw identity and page locators cannot masquerade as Page namespace revisions", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const anchor = bundle.source.candidates[0].facsimileAnchors.at(-1);
  assert.equal(anchor.anchorId, baziSmtV10VersionedParentSupersessionTestOnly.ANCHOR_ID);
  assert.equal(anchor.anchorRole,
    "same_siku_label_visual_candidate_not_bibliographic_or_edition_identity_proof");
  assert.equal(anchor.sourceProvenanceObservation,
    "shared_title_author_and_siku_label_only_no_shared_carrier_identifier_or_direct_derivation_chain");
  assert.equal(anchor.carrierSha256,
    "d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe");
  assert.equal(anchor.carrierBytes, 8321599);
  assert.equal(anchor.carrierMediaWikiSha1, "01e1cde49e92697abd4ec7c671e96c28f07e854c");
  assert.deepEqual(anchor.pageRefs.map((entry) => entry.scanPageNumber), [3, 4]);
  assert.deepEqual(anchor.pageRefs.map((entry) => entry.pageId), [null, null]);
  assert.deepEqual(anchor.pageRefs.map((entry) => entry.pageRevisionId), [null, null]);
  assert.deepEqual(anchor.pageRefs.map((entry) => entry.visibleHeading), ["看命口訣", null]);
});

test("page 3 remains normalized while page 4 is only a nonexpert exact-glyph candidate", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const additions = bundle.source.candidates[0].facsimileCollationCandidates.slice(-2);
  assert.equal(additions[0].scriptVariantPairCount, 3);
  assert.equal(additions[0].exactGlyphSequenceEqual, false);
  assert.equal(additions[0].result, "normalized_correspondence_observed_not_exact_transcription");
  assert.equal(additions[1].scriptVariantPairCount, 0);
  assert.equal(additions[1].exactGlyphSequenceEqual, true);
  assert.equal(additions[1].result,
    "exact_glyph_correspondence_observed_nonexpert_not_verified_collation");
  for (const collation of additions) {
    assert.equal(collation.observerClass, "automated_agent_nonexpert_visual_inspection");
    assert.deepEqual(collation.humanCollatorAttestations, []);
    assert.deepEqual(collation.domainExpertReviewIds, []);
    assert.equal(collation.rightsEffect, "none");
    assert.equal(collation.bindingFreezeEffect, "none");
  }
});

test("platform PD observations remain link-only and do not create legal authority", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const rightsCandidate = bundle.rights.candidates[0];
  assert.equal(bundle.rights.sourceBindingLedger.candidateCount, 4);
  const layer = rightsCandidate.carrierLayers.at(-1);
  assert.equal(layer.noticeState,
    "pd_old_and_public_domain_mark_observed_without_pd_scan_template_not_adjudicated");
  assert.equal(layer.fixedFilePageRevisionId, 1207460960);
  assert.equal(layer.publicDomainMarkCountsAsLicense, false);
  assert.equal(layer.markerAuthorityAndAccuracyVerified, false);
  assert.deepEqual(layer.rightsReviewerIds, []);
  assert.equal(rightsCandidate.decision.distributionPolicy, "link_only");
  assert.equal(rightsCandidate.decision.legalConclusion, "not_established");
  assert.equal(rightsCandidate.decision.formalSourceRightsRecordCreated, false);
  assert.equal(rightsCandidate.decision.formalSourceCarrierRecordCreated, false);
});

test("receipt denies edition, provenance, readiness, mutation, expert, and release promotion", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const { receipt } = bundle;
  assert.equal(receipt.editionAndProvenanceBoundary.sameEditionVerified, false);
  assert.equal(receipt.editionAndProvenanceBoundary.specificWikisourceCarrierProvenanceEstablished, false);
  assert.equal(receipt.editionAndProvenanceBoundary.wikisourceIndexOrPageChainEstablished, false);
  assert.equal(receipt.formalAdmissionBoundary.boundReadinessConsumesSupersedingParents, false);
  assert.equal(receipt.formalAdmissionBoundary.boundReadinessStillPinsHistoricalParents, true);
  assert.equal(receipt.formalAdmissionBoundary.sourceCarrierReadinessSuccessorCreated, false);
  assert.equal(receipt.integrityBoundary.crossFileAtomicSnapshot, false);
  assert.equal(receipt.integrityBoundary.mutationEpochAvailable, false);
  assert.equal(receipt.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(receipt.integrityBoundary.abaExcluded, false);
  assert.equal(receipt.authorityBoundary.expertTruthEstablished, false);
  assert.equal(receipt.authorityBoundary.releaseReady, false);
  assert.equal(receipt.authorityBoundary.publicDeploymentAuthorized, false);
});

test("current binding and carrier readiness remain pinned to the historical parents", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  const binding = bundle.bindingReadiness.bindings.find(
    (entry) => entry.bindingId === "binding:smt-v10:whole-chart"
  );
  assert.deepEqual(binding.candidateIds, [
    baziSmtV10VersionedParentSupersessionTestOnly.OLD_SOURCE_CANDIDATE_ID
  ]);
  assert.equal(bundle.carrierReadiness.counts.carrierObservationLayers, 5);
  assert.equal(bundle.carrierReadiness.parentLocks.sourceBinding.path,
    baziSmtV10VersionedParentSupersessionTestOnly.HISTORICAL_SOURCE.path);
  assert.equal(bundle.carrierReadiness.parentLocks.sourceRights.path,
    baziSmtV10VersionedParentSupersessionTestOnly.HISTORICAL_RIGHTS.path);
});

test("legacy generic verifiers reject the new versioned envelopes", async () => {
  const bundle = await baziSmtV10VersionedParentSupersessionTestOnly
    .buildBaziSmtV10VersionedParentSupersessionBundle(WORKSPACE_ROOT);
  assert.throws(() => verifyBaziSourceBindingCandidateLedger(bundle.source));
  assert.throws(() => verifyBaziSourceRightsCandidateLedger(bundle.rights, bundle.source));
});

test("strict JSON parser rejects literal and escaped duplicate keys", () => {
  for (const text of [
    '{"status":"a","status":"b"}',
    '{"status":"a","sta\\u0074us":"b"}'
  ]) {
    const bytes = Buffer.from(text, "utf8");
    assert.throws(() => parseBaziDttStrictJsonArtifact({
      path: "duplicate.json",
      rawBytes: bytes.length,
      rawSha256: "0".repeat(64),
      bytes
    }), /duplicate/u);
  }
});

test("a changed carrier hash fails even when source candidate and ledger digests are resealed", async (t) => {
  const root = await makeWorkspace(t);
  const source = await readJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const smt = source.candidates[0];
  smt.facsimileAnchors.at(-1).carrierSha256 = "0".repeat(64);
  smt.facsimileCollationCandidates.at(-1).carrierSha256 = "0".repeat(64);
  smt.facsimileCollationCandidates.at(-1).collationDigest =
    computeFacsimileCollationCandidateDigest(smt.facsimileCollationCandidates.at(-1));
  smt.candidateDigest = computeCandidateDigest(smt);
  source.ledgerDigest = computeLedgerDigest(source);
  await writeJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, source);
  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root),
    BaziSmtV10VersionedParentSupersessionError);
});

test("rights cannot promote Public Domain Mark after a syntactic reseal", async (t) => {
  const root = await makeWorkspace(t);
  const rights = await readJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH);
  rights.candidates[0].carrierLayers.at(-1).publicDomainMarkCountsAsLicense = true;
  rights.candidates[0].candidateDigest = computeRightsCandidateDigest(rights.candidates[0]);
  rights.ledgerDigest = computeRightsCandidateLedgerDigest(rights);
  await writeJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, rights);
  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root),
    BaziSmtV10VersionedParentSupersessionError);
});

test("receipt cannot promote formal records, binding freeze, or authority after reseal", async (t) => {
  const root = await makeWorkspace(t);
  const receipt = await readJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  receipt.formalAdmissionBoundary.formalSourceCarrierRecordCount = 1;
  receipt.formalAdmissionBoundary.bindingFrozenVerified = 1;
  receipt.authorityBoundary.releaseReady = true;
  receipt.supersessionDigest = baziSmtV10VersionedParentSupersessionTestOnly
    .computeReceiptDigest(receipt);
  await writeJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, receipt);
  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root),
    BaziSmtV10VersionedParentSupersessionError);
});

test("a coordinated three-artifact reseal cannot create a second accepted lineage", async (t) => {
  const root = await makeWorkspace(t);
  const source = await readJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  source.candidates[0].reviewState.frozenAt = "2026-08-31T00:00:00.000Z";
  source.candidates[0].candidateDigest = computeCandidateDigest(source.candidates[0]);
  source.ledgerDigest = computeLedgerDigest(source);
  await writeJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, source);

  const rights = await readJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH);
  rights.sourceBindingLedger.ledgerDigest = source.ledgerDigest;
  rights.supersession.pairedSourceLedger.ledgerDigest = source.ledgerDigest;
  rights.ledgerDigest = computeRightsCandidateLedgerDigest(rights);
  await writeJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, rights);

  const sourceBytes = await readFile(join(root, SOURCE_SUPERSESSION_RELATIVE_PATH));
  const rightsBytes = await readFile(join(root, RIGHTS_SUPERSESSION_RELATIVE_PATH));
  const receipt = await readJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  receipt.supersedingParents.sourceBinding.rawBytes = sourceBytes.length;
  receipt.supersedingParents.sourceBinding.rawSha256 =
    await import("node:crypto").then(({ createHash }) => createHash("sha256").update(sourceBytes).digest("hex"));
  receipt.supersedingParents.sourceBinding.ledgerDigest = source.ledgerDigest;
  receipt.supersedingParents.sourceBinding.smtCandidateDigest = source.candidates[0].candidateDigest;
  receipt.supersedingParents.sourceRights.rawBytes = rightsBytes.length;
  receipt.supersedingParents.sourceRights.rawSha256 =
    await import("node:crypto").then(({ createHash }) => createHash("sha256").update(rightsBytes).digest("hex"));
  receipt.supersedingParents.sourceRights.ledgerDigest = rights.ledgerDigest;
  receipt.supersessionDigest = baziSmtV10VersionedParentSupersessionTestOnly
    .computeReceiptDigest(receipt);
  await writeJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, receipt);

  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root),
    BaziSmtV10VersionedParentSupersessionError);
});

test("source-only or rights-only persisted successors fail closed", async (t) => {
  const root = await makeWorkspace(t);
  await rm(join(root, RIGHTS_SUPERSESSION_RELATIVE_PATH));
  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root));
});

test("readiness rebind or parent drift fails before a branded result", async (t) => {
  const root = await makeWorkspace(t);
  const readiness = await readJson(root,
    baziSmtV10VersionedParentSupersessionTestOnly.BINDING_READINESS.path);
  readiness.bindings.find((entry) => entry.bindingId === "binding:smt-v10:whole-chart")
    .candidateIds = [baziSmtV10VersionedParentSupersessionTestOnly.NEW_SOURCE_CANDIDATE_ID];
  await writeJson(root, baziSmtV10VersionedParentSupersessionTestOnly.BINDING_READINESS.path, readiness);
  await assert.rejects(() => loadBaziSmtV10VersionedParentSupersession(root));
});

test("verified result is recursively frozen and a clone cannot forge the brand", async () => {
  const result = await loadBaziSmtV10VersionedParentSupersession(WORKSPACE_ROOT);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.artifacts), true);
  assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(clone(result)), false);
  assert.throws(() => {
    result.releaseReady = true;
  }, TypeError);
});

test("post-import WeakSet and Object.freeze poisoning cannot forge or unfreeze the result", async () => {
  const originalHas = WeakSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  const originalFreeze = Object.freeze;
  const originalWeakSet = globalThis.WeakSet;
  try {
    originalWeakSet.prototype.has = () => true;
    originalWeakSet.prototype.add = function poisonedAdd() {
      return this;
    };
    Object.freeze = (value) => value;
    globalThis.WeakSet = class PoisonedWeakSet {
      has() { return true; }
      add() { return this; }
    };
    const result = await loadBaziSmtV10VersionedParentSupersession(WORKSPACE_ROOT);
    assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(result), true);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.artifacts), true);
    assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(clone(result)), false);
    assert.throws(() => {
      result.releaseReady = true;
    }, TypeError);
  } finally {
    originalWeakSet.prototype.has = originalHas;
    originalWeakSet.prototype.add = originalAdd;
    Object.freeze = originalFreeze;
    globalThis.WeakSet = originalWeakSet;
  }
});

test("post-import Array iterator poisoning cannot skip recursive freezing", async () => {
  const originalIterator = Array.prototype[Symbol.iterator];
  try {
    Array.prototype[Symbol.iterator] = function poisonedIterator() {
      if (this.includes("offlineVersionedParentSupersessionMechanicallyVerified")) {
        return Reflect.apply(originalIterator, [], []);
      }
      return Reflect.apply(originalIterator, this, []);
    };
    const result = await loadBaziSmtV10VersionedParentSupersession(WORKSPACE_ROOT);
    assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(result), true);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.artifacts), true);
    assert.equal(Object.isFrozen(result.artifacts.source), true);
    assert.throws(() => {
      result.artifacts.source.rawBytes = 1;
    }, TypeError);
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
  }
});

test("post-import Promise.all poisoning cannot substitute readiness or artifact snapshots", async () => {
  const originalAll = Promise.all;
  try {
    Promise.all = async () => [
      { path: "forged", rawBytes: 0, rawSha256: "0".repeat(64), bytes: Buffer.alloc(0) }
    ];
    const result = await loadBaziSmtV10VersionedParentSupersession(WORKSPACE_ROOT);
    assert.equal(isVerifiedBaziSmtV10VersionedParentSupersession(result), true);
    assert.equal(result.releaseReady, false);
    assert.equal(result.boundReadinessStillPinsHistoricalParents, true);
  } finally {
    Promise.all = originalAll;
  }
});

test("CLI emits bounded status metadata with every authority gate closed", () => {
  const outcome = spawnSync(process.execPath,
    [join(WORKSPACE_ROOT, "scripts/verify-bazi-smt-v10-versioned-parent-supersession.mjs")],
    { cwd: WORKSPACE_ROOT, encoding: "utf8" });
  assert.equal(outcome.status, 0, outcome.stderr);
  const parsed = JSON.parse(outcome.stdout);
  assert.equal(parsed.offlineVersionedParentSupersessionMechanicallyVerified, true);
  assert.equal(parsed.operatorRecordedSameSikuLabelObserved, true);
  assert.equal(parsed.externalCarrierLiveVerifiedThisRun, false);
  assert.equal(parsed.sameEditionVerified, false);
  assert.equal(parsed.formalKnowledgeDocumentCount, 0);
  assert.equal(parsed.releaseReady, false);
  assert.equal(parsed.publicDeploymentAuthorized, false);
  assert.equal(parsed.expertClaimsAuthorized, false);
  assert.equal(Object.hasOwn(parsed, "source"), false);
  assert.equal(Object.hasOwn(parsed, "rights"), false);
});
