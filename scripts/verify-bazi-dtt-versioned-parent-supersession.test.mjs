import test from "node:test";
import assert from "node:assert/strict";
import crypto, { createHash } from "node:crypto";
import fsPromises, {
  mkdtemp,
  mkdir,
  copyFile,
  readFile,
  writeFile,
  rm,
  link,
  symlink,
  open
} from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SOURCE_SUPERSESSION_RELATIVE_PATH,
  RIGHTS_SUPERSESSION_RELATIVE_PATH,
  SUPERSESSION_RECEIPT_RELATIVE_PATH,
  computeSupersessionReceiptDigest,
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  baziDttVersionedParentSupersessionTestOnly
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  computeCandidateDigest,
  computeLedgerDigest,
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest,
  verifyBaziSourceRightsCandidateLedger
} from "./bazi-source-rights-candidate-lib.mjs";
import {
  computeBaziBindingFreezeRequirementsDigest
} from "./bazi-binding-freeze-requirements-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const {
  buildBaziDttVersionedParentSupersessionBundle,
  buildExpectedSourceSupersession,
  buildExpectedRightsSupersession
} = baziDttVersionedParentSupersessionTestOnly;
const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts",
  SOURCE_SUPERSESSION_RELATIVE_PATH,
  RIGHTS_SUPERSESSION_RELATIVE_PATH,
  SUPERSESSION_RECEIPT_RELATIVE_PATH
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-dtt-supersession-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of FIXTURE_PATHS) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), target);
  }
  return root;
}

async function mutateJson(root, relativePath, mutate) {
  const fullPath = path.join(root, relativePath);
  const value = JSON.parse(await readFile(fullPath, "utf8"));
  await mutate(value);
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function sameLengthSemanticWhitespaceDrift(bytes) {
  const source = bytes.toString("utf8");
  const drifted = source.replace('\n  "', '\n\t "');
  assert.notEqual(drifted, source);
  const driftedBytes = Buffer.from(drifted, "utf8");
  assert.equal(driftedBytes.byteLength, bytes.byteLength);
  assert.deepEqual(JSON.parse(drifted), JSON.parse(source));
  return driftedBytes;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("live package verifies as an unpromoted paired supersession", async () => {
  const result = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  assert.equal(result.offlineVersionedParentSupersessionMechanicallyVerified, true);
  assert.equal(result.noticeProjectionCorrectedAtSupersedingCandidateParentLayer, true);
  assert.equal(result.boundReadinessConsumesSupersedingParents, false);
  assert.equal(result.boundReadinessStillPinsHistoricalParents, true);
  assert.equal(result.boundReadinessBasisArtifactsPointInTimeRawVerified, 8);
  assert.equal(result.boundReadinessLedgerDigest,
    "97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c");
  assert.equal(result.promotionBlocked, true);
  assert.equal(result.formalSourceRightsRecordCount, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(isVerifiedBaziDttVersionedParentSupersession(result), true);
});

test("builder is deterministic and keeps the two new ledgers paired", async () => {
  const first = await buildBaziDttVersionedParentSupersessionBundle(workspaceRoot);
  const second = await buildBaziDttVersionedParentSupersessionBundle(workspaceRoot);
  assert.deepEqual(first.source, second.source);
  assert.deepEqual(first.rights, second.rights);
  assert.deepEqual(first.receipt, second.receipt);
  assert.equal(first.rights.sourceBindingLedger.ledgerDigest, first.source.ledgerDigest);
  assert.equal(first.receipt.noticeResolutionBoundary.sourceAndRightsSupersessionPaired, true);
});

test("source builder rejects a self-consistent but non-fixed historical parent", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  historical.conceptualTopicMapping[0].note = "different non-empty note that the generic verifier permits";
  historical.ledgerDigest = computeLedgerDigest(historical);
  assert.throws(
    () => buildExpectedSourceSupersession(historical),
    expectCode("HISTORICAL_SOURCE_IDENTITY_REQUIRED")
  );
});

test("rights builder rejects a self-consistent but non-fixed historical parent", async () => {
  const historicalSource = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  const historicalRights = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-rights-candidates.v1.json"), "utf8"));
  const source = buildExpectedSourceSupersession(historicalSource);
  historicalRights.observedAt = "2026-08-25T20:17:11.106Z";
  historicalRights.ledgerDigest = computeRightsCandidateLedgerDigest(historicalRights);
  assert.throws(
    () => buildExpectedRightsSupersession(historicalRights, source),
    expectCode("HISTORICAL_RIGHTS_IDENTITY_REQUIRED")
  );
});

test("non-DTT source candidates remain byte-semantically unchanged", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  const next = buildExpectedSourceSupersession(historical);
  const oldOther = historical.candidates.filter((entry) => !entry.candidateId.startsWith("dtt-chanwei-"));
  const newOther = next.candidates.filter((entry) => !entry.candidateId.startsWith("dtt-chanwei-"));
  assert.deepEqual(newOther, oldOther);
});

test("non-DTT rights candidates remain byte-semantically unchanged", async () => {
  const historicalSource = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  const historicalRights = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-rights-candidates.v1.json"), "utf8"));
  const source = buildExpectedSourceSupersession(historicalSource);
  const next = buildExpectedRightsSupersession(historicalRights, source);
  const oldOther = historicalRights.candidates.filter((entry) => !entry.rightsCandidateId.startsWith("dtt-chanwei-"));
  const newOther = next.candidates.filter((entry) => !entry.rightsCandidateId.startsWith("dtt-chanwei-"));
  assert.deepEqual(newOther, oldOther);
});

test("legacy generic verifiers must reject versioned parents until a version-aware consumer exists", async () => {
  const source = JSON.parse(await readFile(path.join(workspaceRoot, SOURCE_SUPERSESSION_RELATIVE_PATH), "utf8"));
  const rights = JSON.parse(await readFile(path.join(workspaceRoot, RIGHTS_SUPERSESSION_RELATIVE_PATH), "utf8"));
  assert.throws(() => verifyBaziSourceBindingCandidateLedger(source), /ledger keys expected/u);
  assert.throws(() => verifyBaziSourceRightsCandidateLedger(rights, source), /ledger keys expected/u);
});

test("source transform separates SSID PD-scan from CADAL PD-old", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  const next = buildExpectedSourceSupersession(historical);
  const dtt = next.candidates.find((entry) => entry.candidateId.endsWith("candidate-v2"));
  assert.equal(dtt.facsimileAnchors[0].licenseOrNoticeObserved,
    "commons_pd_scan_top_level_notice_observed_not_adjudicated");
  assert.equal(dtt.facsimileAnchors[1].licenseOrNoticeObserved,
    "commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated");
  assert.equal(dtt.rightsObservation.noticeProjectionEvidence.publicDomainMarkCountsAsLicense, false);
});

test("rights transform separates oldid literal from rendered dependency", async () => {
  const historicalSource = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.json"), "utf8"));
  const historicalRights = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-rights-candidates.v1.json"), "utf8"));
  const source = buildExpectedSourceSupersession(historicalSource);
  const rights = buildExpectedRightsSupersession(historicalRights, source);
  const dtt = rights.candidates.find((entry) => entry.rightsCandidateId.endsWith("candidate-v2"));
  assert.deepEqual(dtt.workLayer.observedTemplateNames, ["Template:清朝作品"]);
  assert.deepEqual(dtt.workLayer.renderedDependencyTemplateNamesObserved,
    ["Template:License", "Template:PD-old", "Template:清朝作品"]);
  assert.equal(dtt.workLayer.noticeDependencyBoundary.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(dtt.workLayer.noticeDependencyBoundary.oldidAlonePinsRenderedNotice, false);
});

test("strict parser rejects duplicate receipt keys", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('{\n  "schemaVersion":', '{\n  "schemaVersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("JSON_DUPLICATE_KEY"));
});

test("strict parser rejects escaped duplicate source keys", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('{\n  "schemaVersion":',
    '{\n  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("JSON_DUPLICATE_KEY"));
});

test("strict parser rejects escaped duplicate rights keys", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, RIGHTS_SUPERSESSION_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('{\n  "schemaVersion":',
    '{\n  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("JSON_DUPLICATE_KEY"));
});

test("source carrier notice swap fails even after candidate and ledger reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    const dtt = ledger.candidates.find((entry) => entry.candidateId.endsWith("candidate-v2"));
    [dtt.facsimileAnchors[0].licenseOrNoticeObserved,
      dtt.facsimileAnchors[1].licenseOrNoticeObserved] = [
      dtt.facsimileAnchors[1].licenseOrNoticeObserved,
      dtt.facsimileAnchors[0].licenseOrNoticeObserved
    ];
    dtt.candidateDigest = computeCandidateDigest(dtt);
    ledger.ledgerDigest = computeLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SOURCE_SUPERSESSION_MISMATCH"));
});

test("source work notice cannot conflate rendered PD-old with an oldid literal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    const dtt = ledger.candidates.find((entry) => entry.candidateId.endsWith("candidate-v2"));
    dtt.rightsObservation.noticeProjectionEvidence.oldidMainSlotPdOldLiteralObserved = true;
    dtt.candidateDigest = computeCandidateDigest(dtt);
    ledger.ledgerDigest = computeLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SOURCE_SUPERSESSION_MISMATCH"));
});

test("source cannot drop explicit historical supersession", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    ledger.supersession.supersedes = null;
    ledger.ledgerDigest = computeLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SOURCE_SUPERSESSION_MISMATCH"));
});

test("source cannot smuggle stored body or quote state", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    ledger.accessBoundary.sourceBodiesStored = true;
    ledger.ledgerDigest = computeLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SOURCE_SUPERSESSION_MISMATCH"));
});

test("rights must point to the superseding source ledger", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    ledger.sourceBindingLedger.path = "content/bazi-strength-source-binding-candidates.v1.json";
    ledger.sourceBindingLedger.ledgerId = baziDttVersionedParentSupersessionTestOnly.HISTORICAL_SOURCE.ledgerId;
    ledger.sourceBindingLedger.ledgerDigest = baziDttVersionedParentSupersessionTestOnly.HISTORICAL_SOURCE.ledgerDigest;
    ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("RIGHTS_SUPERSESSION_MISMATCH"));
});

test("rights cannot call Public Domain Mark a license", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    const dtt = ledger.candidates.find((entry) => entry.rightsCandidateId.endsWith("candidate-v2"));
    dtt.carrierLayers[0].publicDomainMarkCountsAsLicense = true;
    dtt.candidateDigest = computeRightsCandidateDigest(dtt);
    ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("RIGHTS_SUPERSESSION_MISMATCH"));
});

test("rights cannot promote distribution after a syntactic reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    const dtt = ledger.candidates.find((entry) => entry.rightsCandidateId.endsWith("candidate-v2"));
    dtt.decision.distributionPolicy = "redistributable";
    dtt.decision.carrierLayerCleared = true;
    dtt.candidateDigest = computeRightsCandidateDigest(dtt);
    ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("RIGHTS_SUPERSESSION_MISMATCH"));
});

test("rights cannot reuse the historical candidate identity", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    const dtt = ledger.candidates.find((entry) => entry.rightsCandidateId.endsWith("candidate-v2"));
    dtt.rightsCandidateId = baziDttVersionedParentSupersessionTestOnly.HISTORICAL_RIGHTS.candidateId;
    dtt.candidateDigest = computeRightsCandidateDigest(dtt);
    ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("RIGHTS_SUPERSESSION_MISMATCH"));
});

test("receipt cannot claim bound readiness adoption after reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.noticeResolutionBoundary.boundReadinessConsumesSupersedingParents = true;
    receipt.noticeResolutionBoundary.boundReadinessStillPinsHistoricalParents = false;
    receipt.noticeResolutionBoundary.promotionBlocked = false;
    receipt.supersessionDigest = computeSupersessionReceiptDigest(receipt);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_RECEIPT_MISMATCH"));
});

test("missing bound readiness fails before a branded result", async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, "content/system-admission/bazi-binding-freeze-requirements.v1.json"));
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("ARTIFACT_UNREADABLE"));
});

test("rebound readiness is rejected even after its ledger digest is recomputed", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, "content/system-admission/bazi-binding-freeze-requirements.v1.json", (ledger) => {
    ledger.dttNoticeReconciliationGate.currentParentIdentities.sourceBinding.path =
      SOURCE_SUPERSESSION_RELATIVE_PATH;
    ledger.dttNoticeReconciliationGate.currentParentsVersionedSupersessionComplete = true;
    ledger.ledgerDigest = computeBaziBindingFreezeRequirementsDigest(ledger);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("BOUND_READINESS_DRIFT"));
});

test("receipt cannot claim formal records or binding freeze after reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.formalAdmissionBoundary.formalSourceRightsRecordCount = 1;
    receipt.formalAdmissionBoundary.formalSourceCarrierRecordCount = 1;
    receipt.formalAdmissionBoundary.bindingFrozenVerified = 1;
    receipt.supersessionDigest = computeSupersessionReceiptDigest(receipt);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_RECEIPT_MISMATCH"));
});

test("receipt cannot claim mutation epoch or ABA closure after reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.integrityBoundary.mutationEpochAvailable = true;
    receipt.integrityBoundary.abaExcluded = true;
    receipt.supersessionDigest = computeSupersessionReceiptDigest(receipt);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_RECEIPT_MISMATCH"));
});

test("receipt cannot claim content, legal, release, or public authority after reseal", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.authorityBoundary.contentTruthEstablished = true;
    receipt.authorityBoundary.rightsLegalConclusionEstablished = true;
    receipt.authorityBoundary.releaseReady = true;
    receipt.authorityBoundary.publicDeploymentAuthorized = true;
    receipt.supersessionDigest = computeSupersessionReceiptDigest(receipt);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_RECEIPT_MISMATCH"));
});

test("raw receipt digest tampering fails", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.supersessionDigest = "0".repeat(64);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_DIGEST_MISMATCH"));
});

test("coordinated source rights and receipt reseal cannot create a second accepted lineage", async (t) => {
  const root = await fixture(t);
  let changedSource;
  await mutateJson(root, SOURCE_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    ledger.supersession.changeScope = "tampered_self_consistent_lineage";
    ledger.ledgerDigest = computeLedgerDigest(ledger);
    changedSource = ledger;
  });
  const sourceBytes = await readFile(path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH));

  let changedRights;
  await mutateJson(root, RIGHTS_SUPERSESSION_RELATIVE_PATH, (ledger) => {
    ledger.sourceBindingLedger.ledgerDigest = changedSource.ledgerDigest;
    ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
    changedRights = ledger;
  });
  const rightsBytes = await readFile(path.join(root, RIGHTS_SUPERSESSION_RELATIVE_PATH));

  await mutateJson(root, SUPERSESSION_RECEIPT_RELATIVE_PATH, (receipt) => {
    receipt.supersedingParents.sourceBinding.rawBytes = sourceBytes.byteLength;
    receipt.supersedingParents.sourceBinding.rawSha256 = sha256(sourceBytes);
    receipt.supersedingParents.sourceBinding.ledgerDigest = changedSource.ledgerDigest;
    receipt.supersedingParents.sourceRights.rawBytes = rightsBytes.byteLength;
    receipt.supersedingParents.sourceRights.rawSha256 = sha256(rightsBytes);
    receipt.supersedingParents.sourceRights.ledgerDigest = changedRights.ledgerDigest;
    receipt.supersessionDigest = computeSupersessionReceiptDigest(receipt);
  });
  await assert.rejects(loadBaziDttVersionedParentSupersession(root),
    expectCode("SOURCE_SUPERSESSION_MISMATCH"));
});

test("semantic-preserving source reformat still fails the frozen raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const value = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(value), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
});

test("semantic-preserving rights reformat still fails the frozen raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, RIGHTS_SUPERSESSION_RELATIVE_PATH);
  const value = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(value), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("RIGHTS_SUPERSESSION_RAW_DRIFT"));
});

test("semantic-preserving receipt reformat still fails the frozen raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  const value = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(value), "utf8");
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("SUPERSESSION_RECEIPT_RAW_DRIFT"));
});

test("new artifacts reject a second hardlink name", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  await link(target, path.join(root, "receipt-hardlink.json"));
  await assert.rejects(loadBaziDttVersionedParentSupersession(root), expectCode("HARDLINK_REJECTED"));
});

test("post-import WeakSet prototype poisoning cannot forge the verification brand", () => {
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziDttVersionedParentSupersession({}), false);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import Object.freeze poisoning cannot make the branded result mutable", async () => {
  const originalFreeze = Object.freeze;
  try {
    Object.freeze = (value) => value;
    const result = await loadBaziDttVersionedParentSupersession(workspaceRoot);
    assert.equal(Object.isFrozen(result), true);
    assert.throws(() => {
      result.publicDeploymentAuthorized = true;
    }, TypeError);
    assert.equal(result.publicDeploymentAuthorized, false);
    assert.equal(isVerifiedBaziDttVersionedParentSupersession(result), true);
  } finally {
    Object.freeze = originalFreeze;
  }
});

test("post-import Array iterator poisoning fails closed before a forged brand", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const originalBytes = await readFile(target);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(originalBytes));
  const originalIterator = Array.prototype[Symbol.iterator];
  try {
    Array.prototype[Symbol.iterator] = function poisonedIterator() {
      return { next: () => ({ done: true, value: undefined }) };
    };
    let result;
    let rejected = false;
    try {
      result = await loadBaziDttVersionedParentSupersession(root);
    } catch {
      rejected = true;
    }
    assert.equal(rejected || !isVerifiedBaziDttVersionedParentSupersession(result), true);
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
  }
});

test("Array species Proxy cannot redirect an intended readiness basis path", async (t) => {
  const root = await fixture(t);
  const intendedRelativePath = "content/bazi-strength-engineering-binding-candidates.v1.json";
  const cleanRelativePath = "content/engineering-basis-species-clean-clone.json";
  const intendedPath = path.join(root, intendedRelativePath);
  const cleanPath = path.join(root, cleanRelativePath);
  const originalBytes = await readFile(intendedPath);
  await writeFile(cleanPath, originalBytes);
  await writeFile(intendedPath, sameLengthSemanticWhitespaceDrift(originalBytes));

  const originalConstructor = Array.prototype.constructor;
  function PoisonedArrayConstructor() {}
  function PoisonedSpecies() {
    return new Proxy([], {
      defineProperty(target, key, descriptor) {
        const value = descriptor.value?.path === intendedRelativePath
          ? { ...descriptor.value, path: cleanRelativePath }
          : descriptor.value;
        return Reflect.defineProperty(target, key, { ...descriptor, value });
      }
    });
  }
  Object.defineProperty(PoisonedArrayConstructor, Symbol.species, {
    configurable: true,
    value: PoisonedSpecies
  });
  try {
    Array.prototype.constructor = PoisonedArrayConstructor;
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("BOUND_READINESS_BASIS_DRIFT"));
  } finally {
    Array.prototype.constructor = originalConstructor;
  }
});

test("syncBuiltinESMExports cannot redirect captured fs entrypoints to a clean clone", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "source-clean-clone.json");
  const originalBytes = await readFile(target);
  await writeFile(cleanClone, originalBytes);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(originalBytes));

  const originalOpen = fsPromises.open;
  const originalLstat = fsPromises.lstat;
  const originalRealpath = fsPromises.realpath;
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
    syncBuiltinESMExports();
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
  } finally {
    fsPromises.open = originalOpen;
    fsPromises.lstat = originalLstat;
    fsPromises.realpath = originalRealpath;
    syncBuiltinESMExports();
  }
});

test("readiness basis raw drift cannot be hidden by poisoned builtin redirects", async (t) => {
  const root = await fixture(t);
  const relativePath = "content/bazi-strength-engineering-binding-candidates.v1.json";
  const target = path.resolve(root, relativePath);
  const cleanClone = path.resolve(root, "engineering-basis-clean-clone.json");
  const originalBytes = await readFile(target);
  await writeFile(cleanClone, originalBytes);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(originalBytes));

  const originalOpen = fsPromises.open;
  const originalLstat = fsPromises.lstat;
  const originalRealpath = fsPromises.realpath;
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
    syncBuiltinESMExports();
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("BOUND_READINESS_BASIS_DRIFT"));
  } finally {
    fsPromises.open = originalOpen;
    fsPromises.lstat = originalLstat;
    fsPromises.realpath = originalRealpath;
    syncBuiltinESMExports();
  }
});

test("syncBuiltinESMExports cannot replace the captured createHash entrypoint", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const originalBytes = await readFile(target);
  const driftedBytes = sameLengthSemanticWhitespaceDrift(originalBytes);
  await writeFile(target, driftedBytes);

  const originalCreateHash = crypto.createHash;
  const hashPrototype = Object.getPrototypeOf(originalCreateHash("sha256"));
  const originalUpdate = hashPrototype.update;
  const originalDigest = hashPrototype.digest;
  try {
    crypto.createHash = function poisonedCreateHash(...createArgs) {
      const nativeHash = Reflect.apply(originalCreateHash, crypto, createArgs);
      let targeted = false;
      const wrapper = {
        update(data, ...updateArgs) {
          const observed = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data, typeof updateArgs[0] === "string" ? updateArgs[0] : "utf8");
          if (observed.equals(driftedBytes)) targeted = true;
          Reflect.apply(originalUpdate, nativeHash, [data, ...updateArgs]);
          return wrapper;
        },
        digest(...digestArgs) {
          if (targeted) {
            const expected = baziDttVersionedParentSupersessionTestOnly.EXPECTED_NEW_SOURCE.rawSha256;
            return digestArgs[0] === "hex" ? expected : Buffer.from(expected, "hex");
          }
          return Reflect.apply(originalDigest, nativeHash, digestArgs);
        }
      };
      return wrapper;
    };
    syncBuiltinESMExports();
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
  } finally {
    crypto.createHash = originalCreateHash;
    syncBuiltinESMExports();
  }
});

test("post-import Hash prototype poisoning cannot forge a same-length raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const originalBytes = await readFile(target);
  const driftedBytes = sameLengthSemanticWhitespaceDrift(originalBytes);
  await writeFile(target, driftedBytes);

  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalUpdate = hashPrototype.update;
  const originalDigest = hashPrototype.digest;
  const targetedHashes = new WeakSet();
  try {
    hashPrototype.update = function poisonedUpdate(data, ...args) {
      const observed = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, typeof args[0] === "string" ? args[0] : "utf8");
      if (observed.equals(driftedBytes)) targetedHashes.add(this);
      return Reflect.apply(originalUpdate, this, [data, ...args]);
    };
    hashPrototype.digest = function poisonedDigest(...args) {
      if (targetedHashes.has(this)) {
        const expected = baziDttVersionedParentSupersessionTestOnly.EXPECTED_NEW_SOURCE.rawSha256;
        return args[0] === "hex" ? expected : Buffer.from(expected, "hex");
      }
      return Reflect.apply(originalDigest, this, args);
    };
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
  } finally {
    hashPrototype.update = originalUpdate;
    hashPrototype.digest = originalDigest;
  }
});

test("post-import FileHandle.readFile poisoning cannot hide same-length byte drift", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const originalBytes = await readFile(target);
  const driftedBytes = sameLengthSemanticWhitespaceDrift(originalBytes);
  await writeFile(target, driftedBytes);

  const probe = await open(target, "r");
  const fileHandlePrototype = Object.getPrototypeOf(probe);
  const originalReadFile = fileHandlePrototype.readFile;
  await probe.close();
  try {
    fileHandlePrototype.readFile = async function poisonedReadFile(...args) {
      const actual = await Reflect.apply(originalReadFile, this, args);
      return actual.equals(driftedBytes) ? Buffer.from(originalBytes) : actual;
    };
    await assert.rejects(loadBaziDttVersionedParentSupersession(root),
      expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
  } finally {
    fileHandlePrototype.readFile = originalReadFile;
  }
});

test("pre-path to held-handle endpoint swap is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const aliasTarget = path.join(root, "source-alias-target.json");
  await copyFile(target, aliasTarget);
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
      root,
      SOURCE_SUPERSESSION_RELATIVE_PATH,
      2 * 1024 * 1024,
      {
        afterPrePathBeforeOpen: async () => {
          await rm(target);
          await symlink(aliasTarget, target, "file");
        }
      }
    ),
    (error) => error?.code === "ENDPOINT_CHANGED" || error?.code === "ARTIFACT_UNREADABLE"
  );
});

test("post-read path replacement is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const aliasTarget = path.join(root, "source-post-read-alias-target.json");
  await copyFile(target, aliasTarget);
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
      root,
      SOURCE_SUPERSESSION_RELATIVE_PATH,
      2 * 1024 * 1024,
      {
        afterBytesRead: async () => {
          await rm(target);
          await symlink(aliasTarget, target, "file");
        }
      }
    ),
    expectCode("ENDPOINT_CHANGED")
  );
});

test("held-handle growth is bounded at maxBytes plus one", async (t) => {
  const root = await fixture(t);
  const relativePath = "content/reader-growth-probe.json";
  const target = path.join(root, relativePath);
  await writeFile(target, '{"ok":true}\n', "utf8");
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(root, relativePath, 128, {
      afterOpenBeforeRead: async () => writeFile(target, Buffer.alloc(1024, 0x20))
    }),
    expectCode("ARTIFACT_SIZE_INVALID")
  );
});

test("workspace path escape is rejected before I/O", async () => {
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(workspaceRoot, "../outside.json"),
    expectCode("PATH_INVALID")
  );
});
