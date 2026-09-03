import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RollbackProviderSequenceCompositionError,
  assertProviderVerifierBoundary,
  composeRollbackProviderSequenceCandidate
} from "./rollback-provider-sequence-composition-lib.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  appendUnboundBytes,
  createRollbackProviderSequenceCompositionFixture,
  rewriteDeploymentReceiptFixture,
  runOverlappingCheckpointMutationProbe,
  runRollbackProviderSequenceCompositionCli,
  verifyPersistedProviderSequenceFixture,
  writeRollbackEvidenceFixture
} from "./rollback-provider-sequence-composition.test-fixture.mjs";

function assertRecursivelyFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child);
}

function allFalse(record) {
  return Object.values(record).every((value) => value === false);
}

function driftSha256(value) {
  return `${value[0] === "0" ? "1" : "0"}${value.slice(1)}`;
}

function errorChainHasCode(error, code) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.code === code) return true;
  }
  return false;
}

async function assertCompositionCode(fixture, code) {
  await assert.rejects(
    () => composeRollbackProviderSequenceCandidate(fixture.input, {
      cwd: fixture.input.bindingRoot
    }),
    (error) => error instanceof RollbackProviderSequenceCompositionError
      && error.code === code
  );
}

test("composition tests use the shared fixture and production entrypoint without direct downstream guards", async () => {
  const [testSource, fixtureSource] = await Promise.all([
    readFile(new URL(import.meta.url), "utf8"),
    readFile(new URL("./rollback-provider-sequence-composition.test-fixture.mjs", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(testSource, /from\s+["'][^"']+\.test\.mjs["']/u);
  assert.doesNotMatch(
    testSource,
    /from\s+["']\.\/(?:rollback-evidence-lib|provider-deployment-candidate-sequence-(?:loader|verifier))\.mjs["']/u
  );
  assert.match(testSource, /composeRollbackProviderSequenceCandidate/u);
  assert.match(fixtureSource, /provider-deployment-candidate-sequence\.test-fixture\.mjs/u);
  assert.match(fixtureSource, /writeProviderDeploymentCandidateSequenceCandidate/u);
  assert.match(fixtureSource, /verifyPersistedProviderDeploymentCandidateSequence/u);
});

test("production composition returns a recursively frozen closed candidate", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const result = await composeRollbackProviderSequenceCandidate(fixture.input, {
    cwd: fixture.input.bindingRoot
  });

  assert.equal(result.status, "not_admitted");
  assert.equal(result.admissionStatus, "not_admitted");
  assert.equal(result.usableForAdmission, false);
  assert.equal(result.formalRollbackEvidenceVerified, false);
  assert.equal(result.formalRollbackDownstreamReached, false);
  assert.equal(result.samePolicyEpochFormalCompositionAvailable, false);
  assert.equal(result.releaseIdentity.descriptor.dbGeneration, "legacy-v13");
  assert.equal(result.releaseIdentity.descriptor.targetSchema, 13);
  assert.equal(result.releaseIdentity.descriptor.migrationId, null);
  assert.equal(result.releaseIdentity.mutationEpochCapability, "absent_schema13");
  assert.equal(result.releaseIdentity.epoch, null);
  assert.equal(result.currentPolicyBindings.length, 7);
  assert.equal(result.hostingPolicy.deploymentPlatform, "unselected");
  assert.equal(result.deploymentRelation.candidateBId, "deployment-b");
  assert.equal(result.deploymentRelation.restoredActiveDeploymentId, "deployment-a");
  assert.equal(result.deploymentReceipts.candidate.deploymentId, "deployment-b");
  assert.equal(result.deploymentReceipts.rollbackObserved.deploymentId, "deployment-a");
  for (const role of ["deploy", "restore"]) {
    const sequencePackage = fixture.providerSequenceDocument.packages[role];
    assert.deepEqual(
      result.providerSequence.terminalGates[role],
      sequencePackage.fixedFiles["terminal-commit"]
    );
    assert.equal(result.providerSequence.terminalGates[role].size, 65);
    assert.equal(
      result.providerSequence.terminalGates[role].commitsReceiptSha256,
      sequencePackage.fixedFiles.receipt.sha256
    );
    assert.equal(
      result.providerSequence.terminalGates[role].sha256,
      sha256(`${sequencePackage.fixedFiles.receipt.sha256}\n`)
    );
  }
  assert.equal(result.mechanicalChecks.providerTerminalGatesCrossBound, true);
  const { compositionDigest, ...unsigned } = structuredClone(result);
  assert.equal(compositionDigest, sha256(canonicalJson(unsigned)));
  unsigned.providerSequence.terminalGates.deploy.sha256 = driftSha256(
    unsigned.providerSequence.terminalGates.deploy.sha256
  );
  assert.notEqual(compositionDigest, sha256(canonicalJson(unsigned)));
  assert.equal(allFalse(result.attempts), true);
  assert.equal(allFalse(result.claims), true);
  assert.equal(allFalse(result.authority), true);
  assertRecursivelyFrozen(result);
  assert.throws(() => {
    result.authority.publicReleaseAuthorized = true;
  }, TypeError);
});

test("provider verifier boundary rejects pending sequence integrity", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const providerResult = structuredClone(await verifyPersistedProviderSequenceFixture(fixture));
  providerResult.pendingSequenceCandidateIntegrityVerified = true;
  assert.throws(
    () => assertProviderVerifierBoundary(providerResult),
    (error) => error instanceof RollbackProviderSequenceCompositionError
      && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_VERIFIER_BOUNDARY_INVALID"
  );
});

test("provider verifier boundary rejects a non-final output set", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const providerResult = structuredClone(await verifyPersistedProviderSequenceFixture(fixture));
  providerResult.outputFinalization.finalOutputSetVerified = false;
  assert.throws(
    () => assertProviderVerifierBoundary(providerResult),
    (error) => error instanceof RollbackProviderSequenceCompositionError
      && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_VERIFIER_BOUNDARY_INVALID"
  );
});

test("provider verifier boundary rejects authority drift", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const providerResult = structuredClone(await verifyPersistedProviderSequenceFixture(fixture));
  providerResult.authorizationBoundary.publicDeploymentAuthorized = true;
  assert.throws(
    () => assertProviderVerifierBoundary(providerResult),
    (error) => error instanceof RollbackProviderSequenceCompositionError
      && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_VERIFIER_BOUNDARY_INVALID"
  );
});

test("provider verifier boundary rejects recomposition, overlap, and attempt drift", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const baseline = await verifyPersistedProviderSequenceFixture(fixture);
  const mutations = [
    (result) => { result.currentRecompositionMatched = false; },
    (result) => { result.overlappingFilesystemEpochVerified = false; },
    (result) => { result.attempts.networkAttempted = true; },
    (result) => { result.attempts.deploymentAttempted = true; },
    (result) => { result.attempts.rollbackAttempted = true; }
  ];
  for (const mutate of mutations) {
    const providerResult = structuredClone(baseline);
    mutate(providerResult);
    assert.throws(
      () => assertProviderVerifierBoundary(providerResult),
      (error) => error instanceof RollbackProviderSequenceCompositionError
        && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_VERIFIER_BOUNDARY_INVALID"
    );
  }
});

for (const role of ["deploy", "restore"]) {
  test(`${role} terminal marker digest drift is rejected by the composition consumer`, async (t) => {
    const fixture = await createRollbackProviderSequenceCompositionFixture(t);
    const providerResult = structuredClone(await verifyPersistedProviderSequenceFixture(fixture));
    const terminalGate = providerResult.document.packages[role].fixedFiles["terminal-commit"];
    terminalGate.sha256 = driftSha256(terminalGate.sha256);
    assert.throws(
      () => assertProviderVerifierBoundary(providerResult),
      (error) => error instanceof RollbackProviderSequenceCompositionError
        && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_TERMINAL_GATE_INVALID"
    );
  });
}

test("terminal marker commit-to-receipt mismatch is rejected by the composition consumer", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const providerResult = structuredClone(await verifyPersistedProviderSequenceFixture(fixture));
  const terminalGate = providerResult.document.packages.deploy.fixedFiles["terminal-commit"];
  terminalGate.commitsReceiptSha256 = driftSha256(terminalGate.commitsReceiptSha256);
  assert.throws(
    () => assertProviderVerifierBoundary(providerResult),
    (error) => error instanceof RollbackProviderSequenceCompositionError
      && error.code === "ROLLBACK_PROVIDER_COMPOSITION_PROVIDER_TERMINAL_GATE_INVALID"
  );
});

test("composition CLI prints the same closed candidate and exits one", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const execution = runRollbackProviderSequenceCompositionCli(fixture.input);
  assert.equal(execution.signal, null);
  assert.equal(execution.status, 1);
  assert.equal(execution.stderr, "");
  const result = JSON.parse(execution.stdout);
  assert.equal(result.status, "not_admitted");
  assert.equal(result.admissionStatus, "not_admitted");
  assert.equal(result.usableForAdmission, false);
  assert.equal(result.formalRollbackEvidenceVerified, false);
  assert.equal(result.formalRollbackDownstreamReached, false);
  assert.equal(result.samePolicyEpochFormalCompositionAvailable, false);
  assert.equal(allFalse(result.attempts), true);
  assert.equal(allFalse(result.claims), true);
  assert.equal(allFalse(result.authority), true);
});

test("active deployment id cannot be rebound to a provider operation id", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  await rewriteDeploymentReceiptFixture(fixture, "candidate", (receipt) => {
    receipt.deploymentId = fixture.pair.deploy.receipt.operation.operationId;
  });
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_DEPLOYMENT_ID_MISMATCH");
});

test("rollback A-prime deployment id is rejected", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  await rewriteDeploymentReceiptFixture(fixture, "rollbackObserved", (receipt) => {
    receipt.deploymentId = "deployment-a-prime";
  });
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_DEPLOYMENT_ID_MISMATCH");
});

test("rollback artifact drift cannot match the persisted provider sequence", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const document = structuredClone(fixture.evidence);
  document.identities.candidate.artifactSetDigest = "f".repeat(64);
  document.identities.candidate.identityLock.artifactSetDigest = "f".repeat(64);
  await rewriteDeploymentReceiptFixture(fixture, "candidate", (receipt) => {
    receipt.expectedIdentity.artifactSetDigest = "f".repeat(64);
  }, { document });
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_ARTIFACT_PROJECTION_MISMATCH");
});

test("receipt provider and origin drift remain rejected inside the production checkpoint", async (t) => {
  await t.test("provider drift", async (st) => {
    const fixture = await createRollbackProviderSequenceCompositionFixture(st);
    await rewriteDeploymentReceiptFixture(fixture, "candidate", (receipt) => {
      receipt.provider = "selected-provider";
    });
    await assert.rejects(
      () => composeRollbackProviderSequenceCandidate(fixture.input, { cwd: fixture.input.bindingRoot }),
      (error) => error.message.includes("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TEST_CHECKPOINT_FAILED")
        && errorChainHasCode(error, "DEPLOYMENT_RECEIPT_INVALID")
    );
  });
  await t.test("origin drift", async (st) => {
    const fixture = await createRollbackProviderSequenceCompositionFixture(st);
    await rewriteDeploymentReceiptFixture(fixture, "rollbackObserved", (receipt) => {
      receipt.origin = "https://drift.example.com";
    });
    await assert.rejects(
      () => composeRollbackProviderSequenceCandidate(fixture.input, { cwd: fixture.input.bindingRoot }),
      (error) => error.message.includes("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TEST_CHECKPOINT_FAILED")
        && errorChainHasCode(error, "DEPLOYMENT_RECEIPT_INVALID")
    );
  });
});

test("current policy raw hash drift is rejected", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const document = structuredClone(fixture.evidence);
  document.policyBindings.find((binding) =>
    binding.policyId === "hosting-security-policy").sha256 = "0".repeat(64);
  await writeRollbackEvidenceFixture(fixture, document);
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_POLICY_DIGEST_MISMATCH");
});

test("schema 13 cannot smuggle epoch zero", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const document = structuredClone(fixture.evidence);
  document.dataCopy.epochBefore = 0;
  await writeRollbackEvidenceFixture(fixture, document, { validate: false });
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_ROLLBACK_SCHEMA_FAILED");
});

test("deployment receipt raw-byte drift is rejected before composition", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  await appendUnboundBytes(fixture.deploymentReceiptPaths.candidate);
  await assertCompositionCode(fixture, "ROLLBACK_PROVIDER_COMPOSITION_FILE_BINDING_MISMATCH");
});

test("persisted provider sequence raw-byte drift is rejected", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  await appendUnboundBytes(fixture.input.sequencePath);
  await assert.rejects(
    () => composeRollbackProviderSequenceCandidate(fixture.input, { cwd: fixture.input.bindingRoot }),
    /PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_(?:BINDING_MISMATCH|NON_CANONICAL_BYTES)/u
  );
});

test("mutation after rollback receipts are held is caught during the overlapping provider checkpoint", async (t) => {
  const fixture = await createRollbackProviderSequenceCompositionFixture(t);
  const execution = runOverlappingCheckpointMutationProbe(fixture);
  assert.equal(execution.signal, null);
  assert.equal(execution.status, 0);
  assert.equal(execution.stderr, "");
  const probe = JSON.parse(execution.stdout);
  assert.equal(probe.ok, false);
  assert.equal(probe.mutated, true);
  assert.equal(
    probe.chain.some((entry) => entry.code === "ROLLBACK_PROVIDER_COMPOSITION_FILE_REBOUND"),
    true
  );
  assert.equal(
    probe.chain.some((entry) =>
      entry.message.includes("PROVIDER_CANDIDATE_SEQUENCE_EXTERNAL_TEST_CHECKPOINT_FAILED")),
    true
  );
});
