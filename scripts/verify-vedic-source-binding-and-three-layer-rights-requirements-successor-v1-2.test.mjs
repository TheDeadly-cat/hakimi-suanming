import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
  buildExpectedVedicSourceBindingRequirementsSuccessorV12,
  computeVedicSourceBindingRequirementsSuccessorV12Digest,
  isVerifiedVedicSourceBindingRequirementsSuccessorV12,
  loadVedicSourceBindingRequirementsSuccessorV12,
  parseVedicSourceBindingRequirementsSuccessorV12JsonBytes,
  serializeVedicSourceBindingRequirementsSuccessorV12,
  verifyVedicSourceBindingRequirementsSuccessorV12Ledger,
  vedicSourceBindingRequirementsSuccessorV12TestOnly as fixed
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2-lib.mjs";
import {
  loadVedicSourceBindingRequirementsSuccessor
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs";
import {
  loadVedicTzdbCoreDependencyLicenseCarrierChild
} from "./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.resolve(
  ROOT,
  ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH.split("/")
);
const CLI = path.resolve(
  ROOT,
  "scripts",
  "verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2.mjs"
);
const persistedBytes = await readFile(ARTIFACT);
const persisted = JSON.parse(persistedBytes.toString("utf8"));
const predecessor = await loadVedicSourceBindingRequirementsSuccessor();
const child = await loadVedicTzdbCoreDependencyLicenseCarrierChild();

function clone(value = persisted) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.ledgerDigest = computeVedicSourceBindingRequirementsSuccessorV12Digest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (reason) => reason?.code === code);
}

function cleanEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd ?? ROOT,
    env: cleanEnv(options.env),
    encoding: "utf8"
  });
}

test("current Vedic v1.2 successor loads with private brand and exact status", async () => {
  const result = await loadVedicSourceBindingRequirementsSuccessorV12();
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessorV12(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.ledgerId, fixed.LEDGER_ID);
  assert.equal(result.ledgerDigest, "0decafbdc8c94dd9ae206fb453a8a64e8132eb02e5b4f50a1eb12797804b8ef2");
  assert.equal(result.formalV1RemainsCurrent, true);
  assert.equal(result.predecessorV11RemainsNonformal, true);
  assert.equal(result.successorIsFormalCurrent, false);
  assert.equal(result.successorActiveEffect, "none");
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 38);
  assert.equal(result.inheritedPartialCandidates, 2);
  assert.equal(result.newCandidateIdsAdded, 0);
  assert.equal(result.carrierEvidenceBindingsAttached, 2);
  assert.equal(result.subjectFullySatisfied, 0);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.redistributionAuthorized, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
});

test("persisted raw canonical and domain-separated identities are exact", () => {
  assert.equal(persistedBytes.byteLength, fixed.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    fixed.EXPECTED_PERSISTED_RAW.rawSha256
  );
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV12(predecessor, child);
  assert.deepEqual(persisted, expected);
  assert.equal(
    persistedBytes.toString("utf8"),
    serializeVedicSourceBindingRequirementsSuccessorV12(expected, predecessor, child)
  );
  assert.equal(
    persisted.ledgerDigest,
    computeVedicSourceBindingRequirementsSuccessorV12Digest(persisted)
  );
});

test("v1.2 binds formal v1, nonformal v1.1, and the carrier child without backlinks", () => {
  assert.deepEqual(persisted.lineage.formalV1, {
    path: fixed.FORMAL_V1.path,
    rawBytes: fixed.FORMAL_V1.rawBytes,
    rawSha256: fixed.FORMAL_V1.rawSha256,
    ledgerId: fixed.FORMAL_V1.ledgerId,
    ledgerDigest: fixed.FORMAL_V1.ledgerDigest,
    remainsFormalCurrent: true
  });
  assert.equal(persisted.lineage.predecessorV11.ledgerId, fixed.PREDECESSOR_V1_1.ledgerId);
  assert.equal(persisted.lineage.predecessorV11.remainsNonformal, true);
  assert.equal(persisted.lineage.predecessorV11.activeEffect, "none");
  assert.equal(persisted.lineage.carrierChild.childId, fixed.CHILD.childId);
  assert.equal(persisted.lineage.formalV1Modified, false);
  assert.equal(persisted.lineage.predecessorV11Modified, false);
  assert.equal(persisted.lineage.predecessorBacklinkAdded, false);
});

test("predecessor 38-subject inventory remains 36 required plus two existing partials", () => {
  assert.deepEqual(persisted.predecessorSubjectInventoryBoundary, {
    ...fixed.EXPECTED_SUBJECT_INVENTORY,
    verifiedThroughPredecessorFullLoaderPrivateBrand: true,
    subjectBodiesCopiedIntoThisDeltaSuccessor: false,
    subjectInventoryReplacedByThisSuccessor: false
  });
  assert.equal(persisted.gateSummary.inheritedPartialCandidates, 2);
  assert.equal(persisted.gateSummary.newCandidateIdsAdded, 0);
});

test("carrier child supplements only the two existing tzdb candidate ids", () => {
  assert.deepEqual(
    persisted.candidateCarrierEvidenceBindings.map((entry) => [
      entry.subjectId,
      entry.existingCandidateId,
      entry.supplementsExistingCandidate,
      entry.replacesPredecessorEvidence,
      entry.bindingState,
      entry.subjectFullySatisfied,
      entry.countsTowardFrozenBindingGate
    ]),
    [
      [fixed.TIME_ZONE_SUBJECT_ID, fixed.TIME_ZONE_CANDIDATE_ID, true, false, "candidate_only_unbound", false, false],
      [fixed.RIGHTS_SUBJECT_ID, fixed.RIGHTS_CANDIDATE_ID, true, false, "candidate_only_unbound", false, false]
    ]
  );
  assert.equal(persisted.candidateCarrierEvidenceBindings[0].relevantCarriers.length, 2);
  assert.equal(persisted.candidateCarrierEvidenceBindings[1].relevantCarriers.length, 3);
});

test("rights applicability authenticity content expert release runtime time and epoch stay red", () => {
  const rightsBinding = persisted.candidateCarrierEvidenceBindings[1];
  for (const key of [
    "licenseAuthenticityEstablished", "licenseApplicabilityEstablished",
    "workRightsEstablished", "versionRightsEstablished",
    "carrierRightsEstablished", "rightsLegalConclusionEstablished",
    "redistributionAuthorized", "subjectFullySatisfied",
    "countsTowardFrozenBindingGate"
  ]) assert.equal(rightsBinding[key], false, key);
  for (const [key, value] of Object.entries(persisted.authorityBoundary)) {
    assert.equal(value, false, key);
  }
  assert.equal(persisted.observationBoundary.mutationEpochAvailable, false);
  assert.equal(persisted.observationBoundary.mutationEpochReceipt, null);
  assert.equal(persisted.observationBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(persisted.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(persisted.observationBoundary.abaExcluded, false);
  assert.equal(persisted.runtimeTrustBoundary.hiddenPreEvaluationCodeExecutionExcluded, false);
  assert.equal(persisted.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
  assert.equal(persisted.timeBoundary.trustedTimestampEstablished, false);
});

test("forged upstream wrappers cannot satisfy private-brand requirements", () => {
  expectCode(
    () => buildExpectedVedicSourceBindingRequirementsSuccessorV12({ ...predecessor }, child),
    "PREDECESSOR_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => buildExpectedVedicSourceBindingRequirementsSuccessorV12(predecessor, { ...child }),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("digest-only tampering is rejected", () => {
  const value = clone();
  value.ledgerDigest = "0".repeat(64);
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorV12Ledger(value, predecessor, child),
    "LEDGER_DIGEST_MISMATCH"
  );
});

test("re-signed formal, binding, rights, and release promotions are rejected", () => {
  const cases = [
    [(value) => { value.formalStateBoundary.successorIsFormalCurrent = true; }, "FORMAL_PROMOTION_FORBIDDEN"],
    [(value) => { value.gateSummary.bindingFrozenVerified = 1; }, "GATE_PROMOTION_FORBIDDEN"],
    [(value) => { value.sourceRightsBoundary.rightsLegalConclusionEstablished = true; }, "RIGHTS_PROMOTION_FORBIDDEN"],
    [(value) => { value.authorityBoundary.publicReleaseAuthorized = true; }, "AUTHORITY_PROMOTION_FORBIDDEN"]
  ];
  for (const [mutate, code] of cases) {
    const value = clone();
    mutate(value);
    reseal(value);
    expectCode(
      () => verifyVedicSourceBindingRequirementsSuccessorV12Ledger(value, predecessor, child),
      code
    );
  }
});

test("re-signed third candidate, carrier drift, or replacement claim is rejected", () => {
  const cases = [
    (value) => { value.candidateCarrierEvidenceBindings.push(clone(value.candidateCarrierEvidenceBindings[0])); },
    (value) => { value.candidateCarrierEvidenceBindings[0].relevantCarriers[0].packedCarrier.ianaVersion = "future"; },
    (value) => { value.candidateCarrierEvidenceBindings[1].replacesPredecessorEvidence = true; }
  ];
  for (const mutate of cases) {
    const value = clone();
    mutate(value);
    reseal(value);
    expectCode(
      () => verifyVedicSourceBindingRequirementsSuccessorV12Ledger(value, predecessor, child),
      "SUCCESSOR_CONTRACT_MISMATCH"
    );
  }
});

test("future createdAt beyond fixed untrusted upper bound is rejected", () => {
  const value = clone();
  value.createdAt = "2026-09-01T13:08:08.000Z";
  reseal(value);
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorV12Ledger(value, predecessor, child),
    "TIME_BOUNDARY_INVALID"
  );
});

test("duplicate-key JSON is rejected", () => {
  const duplicate = Buffer.from('{"schemaVersion":"1.2.0","schemaVersion":"1.2.0"}\n', "utf8");
  assert.throws(
    () => parseVedicSourceBindingRequirementsSuccessorV12JsonBytes(duplicate, "duplicate.json")
  );
});

test("fixed CLI succeeds and reports bounded zero-effect summary", () => {
  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.bindings, "0/38");
  assert.equal(summary.successorIsFormalCurrent, false);
  assert.equal(summary.successorActiveEffect, "none");
  assert.equal(summary.newCandidateIdsAdded, 0);
  assert.equal(summary.rightsLegalConclusionEstablished, false);
  assert.equal(summary.publicReleaseAuthorized, false);
});

test("fixed CLI rejects arguments, wrong cwd, NODE_OPTIONS, and NODE_PATH", () => {
  const cases = [
    runCli(["unexpected"]),
    runCli([], { cwd: os.tmpdir() }),
    runCli([], { env: { NODE_OPTIONS: "" } }),
    runCli([], { env: { NODE_PATH: "" } })
  ];
  for (const result of cases) {
    assert.notEqual(result.status, 0);
    assert.notEqual(result.stderr, "");
  }
});
