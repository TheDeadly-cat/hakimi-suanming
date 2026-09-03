import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadZiweiRegistryTarballParityChild } from "./ziwei-registry-tarball-parity-observation-child-lib.mjs";
import { loadZiweiSourceBindingRequirementsSuccessor } from "./ziwei-source-binding-requirements-successor-lib.mjs";
import {
  ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
  buildExpectedZiweiSourceBindingRequirementsSuccessorV12,
  computeZiweiSourceBindingRequirementsSuccessorV12Digest,
  getZiweiSourceBindingRequirementsSuccessorV12Summary,
  isVerifiedZiweiSourceBindingRequirementsSuccessorV12,
  loadZiweiSourceBindingRequirementsSuccessorV12,
  parseZiweiSourceBindingRequirementsSuccessorV12JsonBytes,
  serializeZiweiSourceBindingRequirementsSuccessorV12,
  verifyZiweiSourceBindingRequirementsSuccessorV12Ledger,
  ziweiSourceBindingRequirementsSuccessorV12TestOnly
} from "./ziwei-source-binding-requirements-successor-v1-2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts/verify-ziwei-source-binding-requirements-successor-v1-2.mjs");

async function loadInputs() {
  const predecessor = await loadZiweiSourceBindingRequirementsSuccessor();
  const parityChild = await loadZiweiRegistryTarballParityChild();
  const verified = await loadZiweiSourceBindingRequirementsSuccessorV12();
  return { predecessor, parityChild, verified };
}

function reseal(ledger) {
  ledger.ledgerDigest = computeZiweiSourceBindingRequirementsSuccessorV12Digest(ledger);
  return ledger;
}

test("full loader verifies the nonformal v1.2 successor", async () => {
  const { verified } = await loadInputs();
  assert.equal(isVerifiedZiweiSourceBindingRequirementsSuccessorV12(verified), true);
  assert.equal(verified.formalV1RemainsCurrent, true);
  assert.equal(verified.predecessorV11RemainsNonformal, true);
  assert.equal(verified.successorIsFormalCurrent, false);
  assert.equal(verified.successorActiveEffect, "none");
});

test("persisted bytes equal independently built raw-pinned canonical v1.2", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  const expected = buildExpectedZiweiSourceBindingRequirementsSuccessorV12(predecessor, parityChild);
  assert.deepEqual(verified.ledger, expected);
  const bytes = await readFile(path.join(workspaceRoot, ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH));
  assert.equal(bytes.toString("utf8"), serializeZiweiSourceBindingRequirementsSuccessorV12(
    expected, predecessor, parityChild
  ));
  assert.equal(bytes.byteLength, ziweiSourceBindingRequirementsSuccessorV12TestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(verified.artifact.rawSha256, ziweiSourceBindingRequirementsSuccessorV12TestOnly.EXPECTED_PERSISTED_RAW.rawSha256);
});

test("lineage freezes formal v1, nonformal v1.1 and parity child without backlinks", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.ledger.predecessorBinding.remainsFormalCurrent, true);
  assert.equal(verified.ledger.nonformalPredecessorBinding.remainsNonformal, true);
  assert.equal(verified.ledger.nonformalPredecessorBinding.activeEffect, "none");
  assert.equal(verified.ledger.registryTarballParityEvidenceBinding.childDigest,
    "778eac80398629ee92b8bb1fbac902a605766461c26498794960d16b915ea59d");
  assert.equal(verified.ledger.formalStateBoundary.predecessorV11Modified, false);
  assert.equal(verified.ledger.formalStateBoundary.predecessorV11BacklinkAdded, false);
  assert.equal(verified.ledger.formalStateBoundary.parityChildModified, false);
  assert.equal(verified.ledger.formalStateBoundary.parityChildBacklinkAdded, false);
});

test("HKO first candidate stays canonical-exact and candidate IDs are unchanged", async () => {
  const { predecessor, verified } = await loadInputs();
  assert.equal(ziweiSourceBindingRequirementsSuccessorV12TestOnly.exactJson(
    predecessor.ledger.candidateEvidenceBindings[0], verified.ledger.candidateEvidenceBindings[0]
  ), true);
  assert.deepEqual(
    verified.ledger.candidateEvidenceBindings.map((entry) => entry.candidateId),
    predecessor.ledger.candidateEvidenceBindings.map((entry) => entry.candidateId)
  );
  assert.equal(verified.newCandidateIdsAdded, 0);
});

test("all 26 non-target subjects are canonical-exact to v1.1", async () => {
  const { predecessor, verified } = await loadInputs();
  const pairs = predecessor.ledger.subjects.map((before, index) => [before, verified.ledger.subjects[index]])
    .filter(([before]) => before.subjectId !== "ziwei.rights.engine-code-and-dependency-notices");
  assert.equal(pairs.length, 26);
  for (const [before, after] of pairs) {
    assert.equal(ziweiSourceBindingRequirementsSuccessorV12TestOnly.exactJson(before, after), true);
  }
});

test("only the existing rights subject and second candidate gain parity evidence", async () => {
  const { verified } = await loadInputs();
  const subject = verified.ledger.subjects.find((entry) => entry.subjectId === "ziwei.rights.engine-code-and-dependency-notices");
  const candidate = verified.ledger.candidateEvidenceBindings[1];
  assert.equal(subject.candidateRegistryTarballParityObserved, true);
  assert.equal(subject.candidatePackageTarballsObserved, 7);
  assert.equal(subject.candidateSelectedEntryByteParitiesObserved, 14);
  assert.equal(subject.subjectFullySatisfied, false);
  assert.equal(candidate.registryTarballParityOperatorObserved, true);
  assert.equal(candidate.registryPackageTarballsObserved, 7);
  assert.equal(candidate.registrySelectedEntryByteParitiesObserved, 14);
  assert.equal(candidate.subjectFullySatisfied, false);
  assert.equal(candidate.countsTowardFrozenBindingGate, false);
});

test("v1.2 remains two partial candidates and zero of 27 frozen", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.partialCandidatesAttached, 2);
  assert.equal(verified.newCandidateIdsAdded, 0);
  assert.equal(verified.bindingFrozenVerified, 0);
  assert.equal(verified.bindingRequired, 27);
  assert.equal(verified.subjectFullySatisfied, 0);
});

test("authenticity applicability rights legal expert release runtime time and epoch stay red", async () => {
  const { verified } = await loadInputs();
  for (const value of Object.values(verified.ledger.authorityBoundary)) assert.equal(value, false);
  for (const [key, value] of Object.entries(verified.ledger.sourceRightsBoundary)) {
    if (key === "publicRegistryTarballToLocalManifestLicenseByteParityOperatorObserved") assert.equal(value, true);
    else assert.equal(value, false);
  }
  assert.equal(verified.ledger.timeBoundary.registryNetworkObservationTimeCaptured, false);
  assert.equal(verified.ledger.timeBoundary.trustedTimestampEstablished, false);
  assert.equal(verified.ledger.runtimeTrustBoundary.loaderIdentityEstablished, false);
  assert.equal(verified.ledger.observationBoundary.networkAndLocalCrossFileAtomicSnapshotEstablished, false);
  assert.equal(verified.ledger.observationBoundary.mutationEpochReceipt, null);
  assert.equal(verified.ledger.observationBoundary.intervalMutationExcluded, false);
  assert.equal(verified.ledger.observationBoundary.abaExcluded, false);
});

test("digest tampering fails closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  const tampered = structuredClone(verified.ledger);
  tampered.ledgerDigest = "0".repeat(64);
  assert.throws(() => verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
    tampered, predecessor, parityChild
  ), /ledgerDigest/u);
});

test("self-resealed candidate and frozen-binding promotion fail closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutate of [
    (value) => { value.gateSummary.newCandidateIdsAdded = 1; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.candidateEvidenceBindings[1].subjectFullySatisfied = true; }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutate(tampered);
    reseal(tampered);
    assert.throws(() => verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
      tampered, predecessor, parityChild
    ));
  }
});

test("self-resealed publisher, legal or redistribution promotion fails closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutate of [
    (value) => { value.sourceRightsBoundary.publisherIdentityVerified = true; },
    (value) => { value.sourceRightsBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.sourceRightsBoundary.redistributionAuthorized = true; }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutate(tampered);
    reseal(tampered);
    assert.throws(() => verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
      tampered, predecessor, parityChild
    ));
  }
});

test("self-resealed formal promotion or lineage drift fails closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutate of [
    (value) => { value.formalStateBoundary.successorIsFormalCurrent = true; },
    (value) => { value.nonformalPredecessorBinding.rawSha256 = "f".repeat(64); }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutate(tampered);
    reseal(tampered);
    assert.throws(() => verifyZiweiSourceBindingRequirementsSuccessorV12Ledger(
      tampered, predecessor, parityChild
    ));
  }
});

test("strict parser rejects duplicate keys and BOM", async () => {
  const { verified } = await loadInputs();
  const raw = JSON.stringify(verified.ledger);
  const duplicate = Buffer.from(raw.replace("{", "{\"schemaVersion\":\"9.9.9\","), "utf8");
  assert.throws(() => parseZiweiSourceBindingRequirementsSuccessorV12JsonBytes(duplicate), /strict|duplicate|严格|重复/iu);
  assert.throws(() => parseZiweiSourceBindingRequirementsSuccessorV12JsonBytes(
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(raw, "utf8")])
  ), /strict|BOM|严格/iu);
});

test("private brands reject lookalike result objects", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  assert.throws(() => getZiweiSourceBindingRequirementsSuccessorV12Summary(structuredClone(verified)), /private|品牌/iu);
  assert.throws(() => buildExpectedZiweiSourceBindingRequirementsSuccessorV12(
    structuredClone(predecessor), parityChild
  ), /private|品牌/iu);
  assert.throws(() => buildExpectedZiweiSourceBindingRequirementsSuccessorV12(
    predecessor, structuredClone(parityChild)
  ), /private|品牌/iu);
});

test("fixed CLI succeeds and rejects arguments and visible preload environment", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [cliPath], { cwd: workspaceRoot, env: cleanEnv, encoding: "utf8" });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_OK /u);
  const argument = spawnSync(process.execPath, [cliPath, "--write"], { cwd: workspaceRoot, env: cleanEnv, encoding: "utf8" });
  assert.equal(argument.status, 1);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);
  const preload = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot, env: { ...cleanEnv, NODE_PATH: workspaceRoot }, encoding: "utf8"
  });
  assert.equal(preload.status, 1);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
