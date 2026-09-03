import assert from "node:assert/strict";
import {
  link,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  loadVerifiedProviderDeploymentCandidateSequence,
  parseProviderDeploymentCandidateSequenceInput,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_ID,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_PATH
} from "./provider-deployment-candidate-sequence-loader.mjs";
import {
  parseProviderDeploymentCandidateSequenceWriterInput,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS,
  runProviderDeploymentCandidateSequenceWriterCli,
  writeProviderDeploymentCandidateSequenceCandidate
} from "./provider-deployment-candidate-sequence-writer.mjs";
import {
  parseProviderDeploymentCandidateSequenceVerifierInput,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_DOCUMENT,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
  verifyPersistedProviderDeploymentCandidateSequence
} from "./provider-deployment-candidate-sequence-verifier.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

import {
  createCandidatePackage,
  createValidPair,
  jsonBytes,
  runWriterCli,
  sequenceArgs,
  sequenceOutputRoot,
  verifierArgs,
  workspaceRoot,
  writerArgs
} from "./provider-deployment-candidate-sequence.test-fixture.mjs";

function refreshSequenceDigestClosure(document) {
  for (const role of ["deploy", "restore"]) {
    const { packageDigest: _packageDigest, ...unsignedPackage } = document.packages[role];
    document.packages[role].packageDigest = sha256(canonicalJson(unsignedPackage));
  }
  document.packageSetDigest = sha256(canonicalJson(document.packages));
  document.sequenceId = `provider-sequence-${sha256(canonicalJson({
    deployReceiptDigest: document.packages.deploy.receiptDigest,
    restoreReceiptDigest: document.packages.restore.receiptDigest,
    packageSetDigest: document.packageSetDigest
  })).slice(0, 32)}`;
  const { sequenceDigest: _sequenceDigest, ...unsignedSequence } = document;
  document.sequenceDigest = sha256(canonicalJson(unsignedSequence));
  return document;
}

function assertNoPersistedFilesystemIdentityKeys(value) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoPersistedFilesystemIdentityKeys(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert.equal(["dev", "ino", "realPath"].includes(key), false, `forbidden persisted identity key: ${key}`);
    assertNoPersistedFilesystemIdentityKeys(child);
  }
}

test("sequence loader binds one unified two-package epoch without promoting real rollback", async (t) => {
  const pair = await createValidPair(t, {
    restore: { providerStatus: "restored" }
  });
  assert.ok(Date.parse(pair.deploy.receipt.completedAt) > Date.parse(pair.restore.receipt.completedAt));
  const result = await loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(pair));
  assert.equal(result.trustClass, "untrusted_candidate");
  assert.equal(result.admissionStatus, "not_admitted");
  assert.equal(result.deploymentIdRelation.baselineAId, "deployment-a");
  assert.equal(result.deploymentIdRelation.candidateBId, "deployment-b");
  assert.equal(result.mechanicalChecks.twoPackageFilesystemEpochBound, true);
  assert.ok(Object.values(result.limitations).every((value) => value === false));
  assert.ok(Object.values(result.attempts).every((value) => value === false));
  assert.ok(Object.values(result.admissionGates).every((value) => value === false));
  assert.ok(Object.entries(result.authorizationBoundary)
    .filter(([key]) => key !== "authorizationMayNotBeDerivedFromCandidateEvidence")
    .every(([, value]) => value === false));
  assert.ok(Object.values(result.claims).every((value) => value === false));
  assert.equal(result.limitations.initialBaselineArtifactCrossBound, false);
  assert.equal(result.claims.applicationDataMutationEpochVerified, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.deploymentIdRelation), true);
  assert.equal(Object.isFrozen(result.packages.deploy.fixedFiles["artifact-final"]), true);
  assert.equal(Object.isFrozen(result.packages.deploy.fixedFiles["terminal-commit"]), true);
  const deployTerminalGate = result.packages.deploy.fixedFiles["terminal-commit"];
  assert.deepEqual(Object.keys(deployTerminalGate).sort(), [
    "commitsReceiptSha256", "path", "sha256", "size"
  ]);
  assert.equal(deployTerminalGate.size, 65);
  assert.equal(deployTerminalGate.commitsReceiptSha256, result.packages.deploy.receipt.sha256);
  assert.equal(Object.hasOwn(deployTerminalGate, "dev"), false);
  assert.equal(Object.hasOwn(deployTerminalGate, "ino"), false);
  assert.equal(Object.hasOwn(deployTerminalGate, "realPath"), false);
  assert.deepEqual(Object.keys(result.packages.restore.fixedFiles["terminal-commit"]).sort(), [
    "commitsReceiptSha256", "path", "sha256", "size"
  ]);
  assertNoPersistedFilesystemIdentityKeys(result);
  assert.throws(() => {
    result.claims.rollbackObserved = true;
  }, TypeError);
  const schema = JSON.parse(await readFile(
    path.join(workspaceRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_PATH),
    "utf8"
  ));
  const validator = compileEvidenceSchemaForId(schema, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_ID);
  assert.doesNotThrow(() => validator.assert(result));
  const missingTerminalReceiptBinding = structuredClone(result);
  delete missingTerminalReceiptBinding.packages.deploy.fixedFiles["terminal-commit"].commitsReceiptSha256;
  assert.throws(() => validator.assert(missingTerminalReceiptBinding), /validation failed/u);
  const wrongTerminalSize = structuredClone(result);
  wrongTerminalSize.packages.restore.fixedFiles["terminal-commit"].size = 64;
  assert.throws(() => validator.assert(wrongTerminalSize), /validation failed/u);
  const mutated = structuredClone(result);
  mutated.claims.rollbackObserved = true;
  assert.throws(() => validator.assert(mutated), /validation failed/u);
  const roleSwapped = structuredClone(result);
  roleSwapped.packages.deploy.role = "restore";
  roleSwapped.packages.deploy.action = "restore_baseline";
  assert.throws(() => validator.assert(roleSwapped), /validation failed/u);
});

test("sequence loader rejects role swaps, missing baseline, A-prime restore, id reuse, URL reuse, and time overlap", async (t) => {
  const swapped = await createValidPair(t);
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence({
    bindingRoot: workspaceRoot,
    deployOutputRoot: swapped.restore.outputRoot,
    deployReceiptPath: swapped.restore.receiptPath,
    restoreOutputRoot: swapped.deploy.outputRoot,
    restoreReceiptPath: swapped.deploy.receiptPath,
    cwd: workspaceRoot
  }), /ACTION_ORDER_INVALID/u);

  const cases = [
    {
      overrides: { deploy: { operationOverrides: { beforeActiveDeploymentId: null, sequenceEligible: false } } },
      error: /DEPLOYMENT_CHAIN_INVALID/u
    },
    {
      overrides: {
        restore: {
          operationOverrides: {
            resultActiveDeploymentId: "deployment-a-prime",
            resultDerivation: "provider_created_from_requested",
            derivedFromDeploymentId: "deployment-a"
          }
        }
      },
      error: /DEPLOYMENT_CHAIN_INVALID/u
    },
    {
      overrides: { restore: { operationOverrides: { operationId: "operation-deploy-001" } } },
      error: /OPERATION_ID_REUSED/u
    },
    {
      overrides: { restore: { receiptId: "sequence-run-0001-deploy-candidate" } },
      error: /RESTORE_PACKAGE_INVALID:.*RECEIPT_ID_INVALID/u
    },
    {
      overrides: { restore: { operationOverrides: { immutableDeploymentUrl: "https://deployment-b.example.net" } } },
      error: /IMMUTABLE_URL_CHAIN_INVALID/u
    },
    {
      overrides: { restore: { operationOverrides: { startedAt: "2020-01-01T00:00:03.000Z" } } },
      error: /TIME_ORDER_INVALID/u
    }
  ];
  for (const candidate of cases) {
    const pair = await createValidPair(t, candidate.overrides);
    await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(pair)), candidate.error);
  }
});

test("sequence loader rejects scope and adapter drift but does not equate provider status text", async (t) => {
  for (const restore of [
    { accountId: "account-2" },
    { projectId: "project-2" },
    { environment: "preview" },
    { candidateProvider: "fixture-provider-other" }
  ]) {
    const pair = await createValidPair(t, { restore });
    await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(pair)), /SCOPE_MISMATCH/u);
  }
  for (const restore of [
    { adapterId: "fixture-synthetic-adapter-v2" },
    { adapterVersion: "2.0.0" }
  ]) {
    const pair = await createValidPair(t, { restore });
    await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(pair)), /ADAPTER_MISMATCH/u);
  }
  const statusPair = await createValidPair(t, { restore: { providerStatus: "restored" } });
  await assert.doesNotReject(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(statusPair)));
});

test("sequence loader rejects no-op artifacts and wraps independently invalid packages by role", async (t) => {
  const noOp = await createValidPair(t, { restoreVariant: "candidate-b" });
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(noOp)), /ARTIFACT_RELATION_INVALID/u);

  const invalidRestore = await createValidPair(t, {
    restore: {
      operationOverrides: {
        acceptedAt: "2019-12-31T23:59:59.000Z"
      }
    }
  });
  await assert.rejects(
    loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(invalidRestore)),
    /RESTORE_PACKAGE_INVALID:.*OPERATION_INVALID/u
  );
});

test("sequence loader rejects overlapping, partial, extra, cross-linked, and aliased package roots", async (t) => {
  const pair = await createValidPair(t);
  assert.throws(() => parseProviderDeploymentCandidateSequenceInput({
    bindingRoot: workspaceRoot,
    deployOutputRoot: pair.deploy.outputRoot,
    deployReceiptPath: pair.deploy.receiptPath,
    restoreOutputRoot: pair.deploy.outputRoot,
    restoreReceiptPath: pair.deploy.receiptPath
  }), /PACKAGE_ROOT_OVERLAP/u);

  const extra = await createValidPair(t);
  await writeFile(path.join(extra.restore.outputRoot, "unexpected.tmp"), "partial", "utf8");
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(extra)), /OUTPUT_SET_INVALID/u);

  const partial = await createValidPair(t);
  await unlink(path.join(partial.deploy.outputRoot, "artifact-final.json"));
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(partial)), /OUTPUT_SET_INVALID/u);

  const crossLinked = await createValidPair(t);
  const deployAction = path.join(crossLinked.deploy.outputRoot, "raw-action-response.json");
  const restoreAction = path.join(crossLinked.restore.outputRoot, "raw-action-response.json");
  await unlink(restoreAction);
  await link(deployAction, restoreAction);
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(crossLinked)), /FILE_UNSAFE|FILE_IDENTITY_REUSED/u);

  const aliased = await createValidPair(t);
  const realRestoreRoot = path.join(aliased.restore.root, "candidate-output-physical");
  await rename(aliased.restore.outputRoot, realRestoreRoot);
  await symlink(realRestoreRoot, aliased.restore.outputRoot, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence(sequenceArgs(aliased)), /PATH_ALIAS/u);
});

test("sequence loader detects a deterministic mid-epoch package mutation", async (t) => {
  const pair = await createValidPair(t);
  let checkpointReached = false;
  await assert.rejects(loadVerifiedProviderDeploymentCandidateSequence({
    ...sequenceArgs(pair),
    onUnifiedEpochCheckpoint: async (checkpoint) => {
      assert.equal(checkpoint.phase, "after_initial_sequence_validation");
      assert.equal(Object.isFrozen(checkpoint), true);
      assert.equal(Object.isFrozen(checkpoint.recomposedDocument), true);
      assert.equal(Object.isFrozen(checkpoint.heldFileIdentities), true);
      assert.equal(checkpoint.heldFileIdentities.length, 17);
      checkpointReached = true;
      await writeFile(path.join(pair.restore.outputRoot, "artifact-final.json"), jsonBytes({ mutated: true }));
    }
  }), /RESTORE_PACKAGE_INVALID|FILE_REBOUND/u);
  assert.equal(checkpointReached, true);
});

test("sequence writer publishes one non-overwriting receipt and requires independent overlapping verification", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair);
  const written = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot));
  assert.equal(written.sequenceCandidateWritten, true);
  assert.equal(written.independentExternalVerificationPassed, true);
  assert.equal(written.independentFinalOutputSetVerificationPassed, false);
  assert.equal(written.discardSentinelArmedDuringVerification, true);
  assert.equal(written.discardSentinelRemovedAsFinalPublicationStep, true);
  assert.equal(written.mutationBoundary.finalOutputSetExternallyReverifiedInsideWriter, false);
  assert.equal(written.mutationBoundary.continuousFilesystemEpochVerified, false);
  assert.equal(written.mutationBoundary.samePermissionMutationExcluded, false);
  assert.equal(written.mutationBoundary.abaMutationExcluded, false);
  assert.equal(written.mutationBoundary.publicVerifierRequiredAfterWriterReturn, true);
  assert.equal(written.trustClass, "untrusted_candidate");
  assert.equal(written.admissionStatus, "not_admitted");
  assert.deepEqual((await readdir(outputRoot)).sort(), [PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME]);
  const metadata = await lstat(written.sequencePath, { bigint: true });
  assert.equal(metadata.isFile(), true);
  assert.equal(metadata.nlink, 1n);
  assert.ok(Object.values(written.attempts).every((value) => value === false));
  assert.ok(Object.entries(written.authorizationBoundary)
    .filter(([key]) => key !== "authorizationMayNotBeDerivedFromCandidateEvidence")
    .every(([, value]) => value === false));
  assert.ok(Object.values(written.claims).every((value) => value === false));
  assert.equal(Object.isFrozen(written), true);
  assert.equal(Object.isFrozen(written.document.packages.deploy), true);

  const verified = await verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot));
  assert.equal(verified.externalSequenceCandidateIntegrityVerified, true);
  assert.equal(verified.pendingSequenceCandidateIntegrityVerified, false);
  assert.equal(verified.outputFinalization.discardSentinelPresent, false);
  assert.equal(verified.outputFinalization.finalOutputSetVerified, true);
  assert.equal(verified.currentRecompositionMatched, true);
  assert.equal(verified.overlappingFilesystemEpochVerified, true);
  assert.equal(verified.sequenceBinding.sha256, written.sequenceBinding.sha256);
  assert.equal(verified.sequenceDigest, written.document.sequenceDigest);
  assert.ok(Object.values(verified.limitations).every((value) => value === false));
  assert.ok(Object.values(verified.attempts).every((value) => value === false));
  assert.ok(Object.values(verified.admissionGates).every((value) => value === false));
  assert.ok(Object.values(verified.claims).every((value) => value === false));
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.document.checkedSources), true);
});

test("sequence writer refuses existing, overlapping, or non-private output roots", async (t) => {
  const existingPair = await createValidPair(t);
  const existingRoot = sequenceOutputRoot(existingPair);
  await mkdir(existingRoot);
  await assert.rejects(
    writeProviderDeploymentCandidateSequenceCandidate(writerArgs(existingPair, existingRoot)),
    (error) => {
      assert.match(error.message, /WRITE_OUTPUT_EXISTS/u);
      assert.doesNotMatch(error.message, /OUTPUT_DISCARD_REQUIRED/u);
      return true;
    }
  );

  const secondPair = await createValidPair(t);
  const secondRoot = sequenceOutputRoot(secondPair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(secondPair, secondRoot));
  await assert.rejects(
    writeProviderDeploymentCandidateSequenceCandidate(writerArgs(secondPair, secondRoot)),
    /WRITE_OUTPUT_EXISTS/u
  );

  const scopedPair = await createValidPair(t);
  const { cwd: _scopedCwd, ...scopedPaths } = sequenceArgs(scopedPair);
  assert.throws(() => parseProviderDeploymentCandidateSequenceWriterInput({
    ...scopedPaths,
    sequenceOutputRoot: path.join(workspaceRoot, "sequence-output-outside-private-tmp")
  }), /OUTPUT_SCOPE_INVALID/u);
  assert.throws(() => parseProviderDeploymentCandidateSequenceWriterInput({
    ...scopedPaths,
    sequenceOutputRoot: path.join(scopedPair.deploy.outputRoot, "nested-sequence")
  }), /WRITE_ROOT_OVERLAP/u);
  const validRoot = sequenceOutputRoot(scopedPair);
  assert.throws(() => parseProviderDeploymentCandidateSequenceVerifierInput({
    ...scopedPaths,
    sequenceOutputRoot: validRoot,
    sequencePath: path.join(validRoot, "wrong.json")
  }), /EXTERNAL_PATH_INVALID/u);
});

test("a post-publication root rebound attempt cannot leave a reusable sequence directory", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair);
  const reboundRoot = `${outputRoot}-rebound`;
  let checkpointReached = false;
  let renamedWhileHeld = false;
  await assert.rejects(
    writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot, {
      onPublishedSequenceCheckpoint: async (checkpoint) => {
        assert.equal(checkpoint.phase, "after_sequence_publication_before_output_lock");
        assert.equal(checkpoint.sequencePath, path.join(outputRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME));
        assert.equal(Object.isFrozen(checkpoint), true);
        assert.equal(Object.isFrozen(checkpoint.sequenceBinding), true);
        checkpointReached = true;
        await rename(outputRoot, reboundRoot);
        renamedWhileHeld = true;
      }
    })),
    (error) => {
      assert.match(error.message, /PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_DISCARD_REQUIRED/u);
      assert.equal(error.discardSentinelArmed, true);
      const causeMessages = [];
      for (let current = error; current instanceof Error; current = current.cause) {
        causeMessages.push(current.message);
      }
      if (renamedWhileHeld) {
        assert.match(causeMessages.join("\n"), /PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_REBOUND/u);
      } else {
        assert.match(causeMessages.join("\n"), /EPERM|EACCES|EBUSY/u);
      }
      return true;
    }
  );
  assert.equal(checkpointReached, true);
  const failedRoot = renamedWhileHeld ? reboundRoot : outputRoot;
  assert.deepEqual((await readdir(failedRoot)).sort(), [
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
  ].sort());
  assert.deepEqual(
    JSON.parse(await readFile(path.join(
      failedRoot,
      PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME
    ), "utf8")),
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_DOCUMENT
  );
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, failedRoot)),
    /EXTERNAL_OUTPUT_SET_INVALID/u
  );
  if (renamedWhileHeld) await rm(reboundRoot, { recursive: true, force: true });
});

test("sequence writer leaves a durable discard sentinel after a trusted post-publication failure", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair);
  await assert.rejects(
    writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot, {
      onPublishedSequenceCheckpoint: async () => {
        throw new Error("injected post-publication failure");
      }
    })),
    (error) => {
      assert.match(error.message, /PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_DISCARD_REQUIRED/u);
      assert.equal(error.discardSentinelArmed, true);
      assert.equal(error.discardSentinelExpectedToRemain, true);
      return true;
    }
  );
  assert.deepEqual((await readdir(outputRoot)).sort(), [
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_DISCARD_SENTINEL_FILE_NAME,
    PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
  ].sort());
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot)),
    /EXTERNAL_OUTPUT_SET_INVALID|EXTERNAL_PATH_ALIAS/u
  );
});

test("sequence writer does not claim a sentinel was armed when failure precedes sentinel creation", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair);
  let checkpointReached = false;
  await assert.rejects(
    writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot, {
      onOutputRootCreatedCheckpoint: async (checkpoint) => {
        assert.equal(checkpoint.phase, "after_output_root_creation_before_discard_sentinel");
        assert.equal(checkpoint.sequenceOutputRoot, outputRoot);
        assert.equal(Object.isFrozen(checkpoint), true);
        checkpointReached = true;
        throw new Error("injected pre-sentinel failure");
      }
    })),
    (error) => {
      assert.match(error.message, /PROVIDER_CANDIDATE_SEQUENCE_WRITE_OUTPUT_DISCARD_REQUIRED/u);
      assert.equal(error.outputRootCreated, true);
      assert.equal(error.discardSentinelArmed, false);
      assert.equal(error.discardSentinelExpectedToRemain, false);
      return true;
    }
  );
  assert.equal(checkpointReached, true);
  assert.deepEqual(await readdir(outputRoot), []);
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot)),
    /EXTERNAL_OUTPUT_SET_INVALID|EXTERNAL_PATH_ALIAS/u
  );
});

test("sequence writer CLI never marks missing input or an existing user root discard-required", async (t) => {
  const missingEnvironment = { ...process.env };
  for (const key of Object.values(PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS)) {
    delete missingEnvironment[key];
  }
  const missing = runWriterCli(missingEnvironment);
  assert.equal(missing.status, 1, missing.stderr);
  assert.equal(missing.stdout, "");
  const missingLedger = JSON.parse(missing.stderr);
  assert.equal(missingLedger.candidatePublicationCompleted, false);
  assert.equal(missingLedger.sequenceCandidateWritten, false);
  assert.equal(missingLedger.stdoutPresentationCompleted, false);
  assert.equal(missingLedger.publicVerifierRequiredAfterWriterReturn, false);
  assert.equal(missingLedger.independentFinalOutputSetVerificationPassed, false);
  assert.equal(missingLedger.outputDiscardRequired, false);
  assert.equal(missingLedger.discardSentinelArmed, false);
  assert.equal(missingLedger.discardSentinelExpectedToRemain, false);
  assert.equal(missingLedger.networkAttempted, false);
  assert.equal(missingLedger.deploymentAttempted, false);
  assert.equal(missingLedger.rollbackAttempted, false);
  assert.equal(missingLedger.publicDeploymentAuthorized, false);
  assert.equal(missingLedger.publicReleaseAuthorized, false);

  const pair = await createValidPair(t);
  const existingRoot = sequenceOutputRoot(pair);
  await mkdir(existingRoot);
  const input = writerArgs(pair, existingRoot);
  const existingEnvironment = { ...process.env };
  for (const [field, key] of Object.entries(PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS)) {
    existingEnvironment[key] = input[field];
  }
  const existing = runWriterCli(existingEnvironment);
  assert.equal(existing.status, 1, existing.stderr);
  assert.equal(existing.stdout, "");
  const existingLedger = JSON.parse(existing.stderr);
  assert.match(existingLedger.error, /WRITE_OUTPUT_EXISTS/u);
  assert.equal(existingLedger.outputDiscardRequired, false);
  assert.equal(existingLedger.discardSentinelArmed, false);
  assert.equal(existingLedger.discardSentinelExpectedToRemain, false);
  assert.deepEqual(await readdir(existingRoot), []);
});

test("sequence writer CLI keeps committed publication distinct from failed JSON or stdout presentation", async (t) => {
  for (const failureMode of ["json", "stdout"]) {
    const pair = await createValidPair(t);
    const outputRoot = sequenceOutputRoot(pair, `sequence-output-${failureMode}-presentation-failure`);
    const input = writerArgs(pair, outputRoot);
    const environment = { ...process.env };
    for (const [field, key] of Object.entries(PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_ENVIRONMENT_KEYS)) {
      environment[key] = input[field];
    }
    let stdoutAttempted = false;
    let stderr = "";
    const exitCode = await runProviderDeploymentCandidateSequenceWriterCli({
      environment,
      cwd: workspaceRoot,
      serializeSuccess: failureMode === "json"
        ? () => { throw new Error("injected JSON presentation failure"); }
        : undefined,
      stdoutWrite: async () => {
        stdoutAttempted = true;
        if (failureMode === "stdout") throw new Error("injected stdout presentation failure");
      },
      stderrWrite: (text) => {
        stderr += text;
      }
    });
    assert.equal(exitCode, 1);
    assert.equal(stdoutAttempted, failureMode === "stdout");
    const ledger = JSON.parse(stderr);
    assert.equal(ledger.candidatePublicationCompleted, true);
    assert.equal(ledger.sequenceCandidateWritten, true);
    assert.equal(ledger.stdoutPresentationCompleted, false);
    assert.equal(ledger.publicVerifierRequiredAfterWriterReturn, true);
    assert.equal(ledger.independentFinalOutputSetVerificationPassed, false);
    assert.equal(ledger.outputDiscardRequired, false);
    assert.equal(ledger.discardSentinelArmed, false);
    assert.equal(ledger.discardSentinelExpectedToRemain, false);
    assert.equal(ledger.trustClass, "untrusted_candidate");
    assert.equal(ledger.admissionStatus, "not_admitted");
    assert.equal(ledger.publicDeploymentAuthorized, false);
    assert.equal(ledger.publicReleaseAuthorized, false);
    assert.match(ledger.error, new RegExp(`injected ${failureMode === "json" ? "JSON" : "stdout"} presentation failure`, "u"));
    assert.deepEqual(await readdir(outputRoot), [PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME]);
    const verified = await verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot));
    assert.equal(verified.externalSequenceCandidateIntegrityVerified, true);
    assert.equal(verified.outputFinalization.finalOutputSetVerified, true);
    assert.equal(verified.admissionStatus, "not_admitted");
    assert.equal(verified.authorizationBoundary.publicDeploymentAuthorized, false);
    assert.equal(verified.authorizationBoundary.publicReleaseAuthorized, false);
  }
});

test("external sequence verifier rejects semantic, duplicate-key, byte-format, and stale-pair drift", async (t) => {
  const semanticPair = await createValidPair(t);
  const semanticRoot = sequenceOutputRoot(semanticPair);
  const semanticWritten = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(semanticPair, semanticRoot));
  const semanticDocument = structuredClone(semanticWritten.document);
  semanticDocument.claims.rollbackObserved = true;
  const { sequenceDigest: _semanticDigest, ...semanticUnsigned } = semanticDocument;
  semanticDocument.sequenceDigest = sha256(canonicalJson(semanticUnsigned));
  await writeFile(semanticWritten.sequencePath, jsonBytes(semanticDocument));
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(semanticPair, semanticRoot)),
    /CURRENT_RECOMPOSITION_MISMATCH/u
  );

  const duplicatePair = await createValidPair(t);
  const duplicateRoot = sequenceOutputRoot(duplicatePair);
  const duplicateWritten = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(duplicatePair, duplicateRoot));
  await writeFile(duplicateWritten.sequencePath, Buffer.from('{"schemaVersion":1,"schemaVersion":1}\n', "utf8"));
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(duplicatePair, duplicateRoot)),
    /EXTERNAL_JSON_INVALID/u
  );

  const bytePair = await createValidPair(t);
  const byteRoot = sequenceOutputRoot(bytePair);
  const byteWritten = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(bytePair, byteRoot));
  await writeFile(byteWritten.sequencePath, Buffer.from(JSON.stringify(byteWritten.document), "utf8"));
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(bytePair, byteRoot)),
    /NON_CANONICAL_BYTES/u
  );

  const sourcePair = await createValidPair(t);
  const sourceRoot = sequenceOutputRoot(sourcePair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(sourcePair, sourceRoot));
  const otherPair = await createValidPair(t);
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(otherPair, sourceRoot)),
    /CURRENT_RECOMPOSITION_MISMATCH/u
  );
});

test("external sequence verifier independently rejects each persisted digest-closure layer", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair);
  const written = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot));
  const cases = [
    {
      mutate: (document) => { document.packages.deploy.packageDigest = "0".repeat(64); },
      error: /EXTERNAL_PACKAGE_DIGEST_MISMATCH/u
    },
    {
      mutate: (document) => { document.packageSetDigest = "0".repeat(64); },
      error: /EXTERNAL_PACKAGE_SET_DIGEST_MISMATCH/u
    },
    {
      mutate: (document) => { document.sequenceId = `provider-sequence-${"0".repeat(32)}`; },
      error: /EXTERNAL_SEQUENCE_ID_MISMATCH/u
    },
    {
      mutate: (document) => { document.sequenceDigest = "0".repeat(64); },
      error: /EXTERNAL_SEQUENCE_DIGEST_MISMATCH/u
    }
  ];
  for (const candidate of cases) {
    const document = structuredClone(written.document);
    candidate.mutate(document);
    await writeFile(written.sequencePath, jsonBytes(document));
    await assert.rejects(
      verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot)),
      candidate.error
    );
  }
});

test("external sequence verifier rejects non-self-describing persisted terminal commitments", async (t) => {
  const pair = await createValidPair(t);
  const outputRoot = sequenceOutputRoot(pair, "sequence-output-terminal-binding-negative");
  const written = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, outputRoot));
  const cases = [
    (document) => {
      delete document.packages.deploy.fixedFiles["terminal-commit"].commitsReceiptSha256;
    },
    (document) => {
      document.packages.restore.fixedFiles["terminal-commit"].commitsReceiptSha256 = "0".repeat(64);
    },
    (document) => {
      document.packages.deploy.fixedFiles["terminal-commit"].size = 64;
    },
    (document) => {
      document.packages.deploy.fixedFiles["terminal-commit"].path =
        `${document.packages.deploy.rootPath}/wrong-terminal-commit.sha256`;
    },
    (document) => {
      document.packages.restore.fixedFiles["terminal-commit"].sha256 = "0".repeat(64);
    },
    (document) => {
      document.packages.deploy.fixedFiles["terminal-commit"].dev = "persisted-dev";
    },
    (document) => {
      document.packages.restore.fixedFiles["terminal-commit"].ino = "persisted-ino";
    },
    (document) => {
      document.packages.restore.fixedFiles["terminal-commit"].realPath = "persisted-real-path";
    }
  ];
  for (const mutate of cases) {
    const document = structuredClone(written.document);
    mutate(document);
    refreshSequenceDigestClosure(document);
    await writeFile(written.sequencePath, jsonBytes(document));
    await assert.rejects(
      verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(pair, outputRoot)),
      /EXTERNAL_TERMINAL_GATE_BINDING_INVALID/u
    );
  }
});

test("external sequence verifier rejects extra files, hardlinks, aliases, and overlapping-epoch mutation", async (t) => {
  const extraPair = await createValidPair(t);
  const extraRoot = sequenceOutputRoot(extraPair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(extraPair, extraRoot));
  await writeFile(path.join(extraRoot, "unexpected.tmp"), "partial", "utf8");
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(extraPair, extraRoot)),
    /OUTPUT_SET_INVALID/u
  );

  const linkedPair = await createValidPair(t);
  const linkedRoot = sequenceOutputRoot(linkedPair);
  const linkedWritten = await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(linkedPair, linkedRoot));
  await link(linkedWritten.sequencePath, path.join(linkedPair.deploy.root, "sequence-cross-link.json"));
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(linkedPair, linkedRoot)),
    /EXTERNAL_FILE_UNSAFE/u
  );

  const aliasedPair = await createValidPair(t);
  const aliasedRoot = sequenceOutputRoot(aliasedPair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(aliasedPair, aliasedRoot));
  const physicalRoot = path.join(aliasedPair.deploy.root, "sequence-output-physical");
  await rename(aliasedRoot, physicalRoot);
  await symlink(physicalRoot, aliasedRoot, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(
    verifyPersistedProviderDeploymentCandidateSequence(verifierArgs(aliasedPair, aliasedRoot)),
    /EXTERNAL_PATH_ALIAS/u
  );

  const receiptMutationPair = await createValidPair(t);
  const receiptMutationRoot = sequenceOutputRoot(receiptMutationPair);
  const receiptMutationWritten = await writeProviderDeploymentCandidateSequenceCandidate(
    writerArgs(receiptMutationPair, receiptMutationRoot)
  );
  await assert.rejects(verifyPersistedProviderDeploymentCandidateSequence({
    ...verifierArgs(receiptMutationPair, receiptMutationRoot),
    onOverlappingEpochCheckpoint: async (phase) => {
      assert.equal(phase, "during_overlapping_sequence_package_epoch");
      await writeFile(receiptMutationWritten.sequencePath, jsonBytes({ mutated: true }));
    }
  }), /VERIFIED_CONSUMER_FAILED:.*EXTERNAL_FILE_REBOUND/u);

  const packageMutationPair = await createValidPair(t);
  const packageMutationRoot = sequenceOutputRoot(packageMutationPair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(packageMutationPair, packageMutationRoot));
  await assert.rejects(verifyPersistedProviderDeploymentCandidateSequence({
    ...verifierArgs(packageMutationPair, packageMutationRoot),
    onOverlappingEpochCheckpoint: async () => {
      await writeFile(
        path.join(packageMutationPair.restore.outputRoot, "artifact-final.json"),
        jsonBytes({ mutated: true })
      );
    }
  }), /RESTORE_PACKAGE_INVALID|FILE_REBOUND/u);
});

test("sequence candidate is directly governed but stays outside test:release-evidence and default-v13 receipt admission", async () => {
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["test:provider-deployment-candidate-sequence"],
    "node --test scripts/provider-deployment-candidate-sequence-loader.test.mjs"
  );
  assert.doesNotMatch(packageJson.scripts["test:release-evidence"], /provider-deployment-candidate-sequence/u);
  const governanceSource = await readFile(path.join(workspaceRoot, "scripts", "verify-release-governance.mjs"), "utf8");
  assert.match(
    governanceSource,
    /REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_SOURCE_SHA256/u
  );
  assert.match(
    governanceSource,
    /scripts\/provider-deployment-candidate-sequence-verifier\.mjs/u
  );
  assert.match(
    governanceSource,
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );
});
