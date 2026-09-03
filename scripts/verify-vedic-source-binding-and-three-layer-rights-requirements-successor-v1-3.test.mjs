import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadVedicSourceBindingRequirementsSuccessorV12
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2-lib.mjs";
import {
  loadVedicTzdbCoreRegistryTarballParityChild
} from "./vedic-tzdb-core-registry-tarball-parity-observation-child-lib.mjs";
import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_3_RELATIVE_PATH,
  buildExpectedVedicSourceBindingRequirementsSuccessorV13,
  computeVedicSourceBindingRequirementsSuccessorV13Digest,
  getVedicSourceBindingRequirementsSuccessorV13Summary,
  isVerifiedVedicSourceBindingRequirementsSuccessorV13,
  loadVedicSourceBindingRequirementsSuccessorV13,
  parseVedicSourceBindingRequirementsSuccessorV13JsonBytes,
  serializeVedicSourceBindingRequirementsSuccessorV13,
  vedicSourceBindingRequirementsSuccessorV13TestOnly,
  verifyVedicSourceBindingRequirementsSuccessorV13Ledger
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3.mjs"
);

async function loadInputs() {
  const predecessor = await loadVedicSourceBindingRequirementsSuccessorV12(workspaceRoot);
  const parityChild = await loadVedicTzdbCoreRegistryTarballParityChild(workspaceRoot);
  const verified = await loadVedicSourceBindingRequirementsSuccessorV13(workspaceRoot);
  return { predecessor, parityChild, verified };
}

function withRefreshedDigest(ledger) {
  ledger.ledgerDigest = computeVedicSourceBindingRequirementsSuccessorV13Digest(ledger);
  return ledger;
}

test("full loader verifies the nonformal v1.3 successor", async () => {
  const { verified } = await loadInputs();
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessorV13(verified), true);
  assert.equal(verified.formalV1RemainsCurrent, true);
  assert.equal(verified.predecessorV11RemainsNonformal, true);
  assert.equal(verified.predecessorV12RemainsNonformal, true);
  assert.equal(verified.successorIsFormalCurrent, false);
  assert.equal(verified.successorActiveEffect, "none");
});

test("persisted bytes equal independently built canonical v1.3", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  const expected = buildExpectedVedicSourceBindingRequirementsSuccessorV13(
    predecessor,
    parityChild
  );
  assert.deepEqual(verified.ledger, expected);
  const bytes = await readFile(path.join(
    workspaceRoot,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_V1_3_RELATIVE_PATH
  ));
  assert.equal(bytes.toString("utf8"), serializeVedicSourceBindingRequirementsSuccessorV13(
    expected,
    predecessor,
    parityChild
  ));
  assert.equal(bytes.byteLength, vedicSourceBindingRequirementsSuccessorV13TestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
});

test("lineage freezes formal v1, v1.1, v1.2 and the parity child", async () => {
  const { verified } = await loadInputs();
  const lineage = verified.ledger.lineage;
  assert.equal(lineage.formalV1.remainsFormalCurrent, true);
  assert.equal(lineage.predecessorV11.remainsNonformal, true);
  assert.equal(lineage.predecessorV12.remainsNonformal, true);
  assert.equal(lineage.predecessorV11.activeEffect, "none");
  assert.equal(lineage.predecessorV12.activeEffect, "none");
  assert.equal(lineage.registryTarballParityChild.childDigest,
    "51c4c7ec945050d3bf40b0051d9a3b3237b310a22892f2a57c9399d8d331c86c");
  assert.equal(lineage.formalV1Modified, false);
  assert.equal(lineage.predecessorV11Modified, false);
  assert.equal(lineage.predecessorV12Modified, false);
  assert.equal(lineage.predecessorBacklinkAdded, false);
});

test("two evidence bindings only supplement the same existing candidates", async () => {
  const { verified } = await loadInputs();
  const bindings = verified.ledger.registryTarballParityEvidenceBindings;
  assert.equal(bindings.length, 2);
  assert.deepEqual(bindings.map((entry) => entry.existingCandidateId), [
    "vedic-iana-tzdb-2026c-input-source-candidate-v1",
    "vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1"
  ]);
  for (const entry of bindings) {
    assert.equal(entry.supplementsExistingCandidate, true);
    assert.equal(entry.replacesPredecessorEvidence, false);
    assert.equal(entry.bindingState, "candidate_only_unbound");
    assert.equal(entry.subjectFullySatisfied, false);
    assert.equal(entry.countsTowardFrozenBindingGate, false);
  }
});

test("v1.3 remains two partial candidates and zero of 38 frozen", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.inheritedPartialCandidates, 2);
  assert.equal(verified.newCandidateIdsAdded, 0);
  assert.equal(verified.bindingFrozenVerified, 0);
  assert.equal(verified.bindingRequired, 38);
  assert.equal(verified.ledger.gateSummary.subjectFullySatisfied, 0);
  assert.equal(verified.ledger.predecessorStateBoundary.requiredUnbound, 36);
});

test("public parity is recorded without authenticity, rights or legal promotion", async () => {
  const { verified } = await loadInputs();
  const rights = verified.ledger.sourceRightsBoundary;
  assert.equal(rights.publicRegistryTarballToLocalCarrierByteParityObserved, true);
  assert.equal(rights.publisherIdentityVerified, false);
  assert.equal(rights.packageSignatureVerified, false);
  assert.equal(rights.packageAuthenticityEstablished, false);
  assert.equal(rights.workRightsEstablished, 0);
  assert.equal(rights.versionRightsEstablished, 0);
  assert.equal(rights.carrierRightsEstablished, 0);
  assert.equal(rights.rightsLegalConclusionEstablished, false);
  assert.equal(rights.redistributionAuthorized, false);
});

test("formal, expert, release and authority gates remain red", async () => {
  const { verified } = await loadInputs();
  for (const value of Object.values(verified.ledger.authorityBoundary)) assert.equal(value, false);
  assert.equal(verified.releaseReady, false);
  assert.equal(verified.publicReleaseAuthorized, false);
  assert.equal(verified.ledger.formalStateBoundary.formalRegistryIntegrated, false);
  assert.equal(verified.ledger.formalStateBoundary.formalManifestIntegrated, false);
  assert.equal(verified.ledger.gateSummary.independentDomainExpertReviewsVerified, 0);
  assert.equal(verified.ledger.gateSummary.independentRightsReviewsVerified, 0);
});

test("legacy-v13 and mutation epoch boundaries remain fixed", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.ledger.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(verified.ledger.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(verified.ledger.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(verified.ledger.projectReleaseGovernanceContext.mutationEpochReceipt, null);
  assert.equal(verified.ledger.observationBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(verified.ledger.observationBoundary.intervalMutationExcludedAcrossFilesAndNetwork, false);
  assert.equal(verified.ledger.observationBoundary.abaExcluded, false);
});

test("digest tampering fails closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  const tampered = structuredClone(verified.ledger);
  tampered.ledgerDigest = "0".repeat(64);
  assert.throws(
    () => verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
      tampered,
      predecessor,
      parityChild
    ),
    /ledgerDigest/u
  );
});

test("candidate and binding promotion fail even with refreshed digest", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutation of [
    (value) => { value.gateSummary.newCandidateIdsAdded = 1; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.registryTarballParityEvidenceBindings[0].subjectFullySatisfied = true; }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutation(tampered);
    withRefreshedDigest(tampered);
    assert.throws(() => verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
      tampered,
      predecessor,
      parityChild
    ));
  }
});

test("publisher identity or rights overclaim fails closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutation of [
    (value) => { value.sourceRightsBoundary.publisherIdentityVerified = true; },
    (value) => { value.sourceRightsBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.sourceRightsBoundary.redistributionAuthorized = true; }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutation(tampered);
    withRefreshedDigest(tampered);
    assert.throws(() => verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
      tampered,
      predecessor,
      parityChild
    ));
  }
});

test("formal promotion and lineage drift fail closed", async () => {
  const { predecessor, parityChild, verified } = await loadInputs();
  for (const mutation of [
    (value) => { value.formalStateBoundary.successorIsFormalCurrent = true; },
    (value) => { value.lineage.predecessorV12.rawSha256 = "f".repeat(64); }
  ]) {
    const tampered = structuredClone(verified.ledger);
    mutation(tampered);
    withRefreshedDigest(tampered);
    assert.throws(() => verifyVedicSourceBindingRequirementsSuccessorV13Ledger(
      tampered,
      predecessor,
      parityChild
    ));
  }
});

test("strict parser rejects duplicate keys and BOM", async () => {
  const { verified } = await loadInputs();
  const raw = JSON.stringify(verified.ledger);
  const duplicate = Buffer.from(raw.replace("{", "{\"schemaVersion\":\"9.9.9\","), "utf8");
  assert.throws(
    () => parseVedicSourceBindingRequirementsSuccessorV13JsonBytes(duplicate),
    /strict|duplicate|严格|重复/iu
  );
  assert.throws(
    () => parseVedicSourceBindingRequirementsSuccessorV13JsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(raw, "utf8")])
    ),
    /strict|BOM|严格/iu
  );
});

test("summary rejects unbranded lookalikes", async () => {
  const { verified } = await loadInputs();
  assert.throws(
    () => getVedicSourceBindingRequirementsSuccessorV13Summary(structuredClone(verified)),
    /private|品牌/iu
  );
});

test("fixed CLI succeeds and rejects arguments and visible preload environment", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8"
  });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^VEDIC_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_3_OK /u);
  const argument = spawnSync(process.execPath, [cliPath, "--write"], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8"
  });
  assert.equal(argument.status, 1);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);
  const preload = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: { ...cleanEnv, NODE_PATH: workspaceRoot },
    encoding: "utf8"
  });
  assert.equal(preload.status, 1);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
