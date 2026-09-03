import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertSwAbProducerBridgeCompositionPhysicalIdentities,
  buildSwAbProducerBridgeCompositionFailure,
  composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridge,
  parseSwAbProducerBridgeCompositionInput,
  swAbProducerBridgeCompositionTestOnly,
  validateSwAbProducerBridgeCompositionBindings,
  validateSwAbProducerBridgeCompositionDocument,
  validateSwAbProducerBridgeCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs";
import {
  loadCheckedProducerBridgeCompositionSources,
  makeProducerBridgeCompositionDependencies,
  makeProducerBridgeCompositionFixture,
  producerBridgeCompositionFixtureAttemptId,
  producerBridgeCompositionFixtureEvidenceDigest,
  producerBridgeCompositionFixtureRunId,
  producerBridgeCompositionFixtureWorkspaceRoot
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test-fixture.mjs";

const workspaceRoot = producerBridgeCompositionFixtureWorkspaceRoot;

const fixtureContextPromise = (async () => {
  const [sourceHeld, schemaValidator] = await Promise.all([
    loadCheckedProducerBridgeCompositionSources(),
    loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchemaValidator(
      workspaceRoot
    )
  ]);
  return makeProducerBridgeCompositionFixture({ sourceHeld, schemaValidator });
})();

function validationArguments(fixture) {
  return structuredClone({
    oldComposition: fixture.oldComposition,
    transcriptLoaded: fixture.transcriptLoaded,
    issuanceLoaded: fixture.issuanceLoaded,
    bridgeLoaded: fixture.bridgeLoaded,
    candidateHeld: {
      binding: fixture.held.candidate.binding,
      identity: fixture.held.candidate.identity
    },
    runtimeHeld: {
      binding: fixture.held.runtime.binding,
      identity: fixture.held.runtime.identity
    },
    publicationHeld: {
      binding: fixture.held.publication.binding,
      identity: fixture.held.publication.identity
    },
    runtimeEvidence: fixture.runtimeEvidence,
    publication: fixture.publication,
    outerSourceBindings: fixture.outerSourceBindings
  });
}

function validateFixtureBindings(fixture, mutate = () => undefined) {
  const args = validationArguments(fixture);
  mutate(args);
  return validateSwAbProducerBridgeCompositionBindings(args);
}

test("v2 policy, closed Schema, and exact fourteen-source inventory are frozen", async () => {
  const fixture = await fixtureContextPromise;
  const policyPath = path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json"
  );
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  assert.equal(validateSwAbProducerBridgeCompositionPolicy(policy), policy);
  assert.deepEqual(policy.requiredSourceBindings, swAbProducerBridgeCompositionTestOnly.sourceSpecs);
  assert.equal(policy.requiredSourceBindings.length, 14);
  assert.equal(new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size, 14);
  assert.equal(new Set(policy.requiredSourceBindings.map(({ role }) => role)).size, 14);
  assert.deepEqual(policy.releaseIdentity, {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.equal(fixture.schemaValidator.schema.additionalProperties, false);
  assert.equal(fixture.schemaValidator.schema.properties.sourceBindings.minItems, 14);
  assert.equal(fixture.schemaValidator.schema.properties.sourceBindings.maxItems, 14);
  const implementation = await readFile(path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs"
  ), "utf8");
  assert.equal(
    implementation.includes("sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs"),
    false,
    "v2 must not call frozen four-chain v1"
  );
});

test("pure binding closes scope, artifacts, bridge publication, bundle, and all eight tuples", async () => {
  const fixture = await fixtureContextPromise;
  const projection = validateFixtureBindings(fixture);
  assert.equal(projection.runtimeTupleBindings.length, 8);
  assert.equal(projection.transcriptBinding.derivedEvidenceDigest, producerBridgeCompositionFixtureEvidenceDigest);
  assert.equal(projection.issuanceBinding.bundleId, projection.producerBridgeBinding.bundleId);
  assert.equal(projection.issuanceBinding.bundleDigest, projection.producerBridgeBinding.bundleDigest);
  assert.equal(projection.issuanceBinding.issuanceId, projection.producerBridgeBinding.issuanceId);
  assert.equal(projection.issuanceBinding.receiptDigest, projection.producerBridgeBinding.receiptDigest);
  const document = swAbProducerBridgeCompositionTestOnly.buildDocument(
    projection,
    fixture.outerSourceBindings
  );
  assert.equal(validateSwAbProducerBridgeCompositionDocument(document, fixture.schemaValidator), document);
  assert.equal(document.producerBridgeStatus, "producer_bridge_present_mechanically_untrusted");
  assert.equal(document.candidateBridgeArtifactPresent, true);
  assert.equal(document.trustedProducerBridgeVerified, false);
  assert.equal(document.runAttemptIdentifiersMatched, true);
  assert.equal(document.runAttemptCoordinationVerified, false);
  assert.equal(document.candidateProducerBoundToIssuanceAttempt, false);
  assert.deepEqual(document.runAttemptBoundary, {
    runAttemptIdentifiersMatched: true,
    runAttemptCoordinationStatus: "run_attempt_coordination_absent",
    runAttemptCoordinationVerified: false,
    candidateProducerBoundToIssuanceAttempt: false
  });
  assert.equal(document.status, "not_admitted");
  assert.equal(document.cliExitCode, 1);
  assert.equal(document.mutationBoundary.candidateAndBridgePrimaryInputsHeldAcrossIssuance, true);
  assert.equal(document.mutationBoundary.issuanceFilesHeldAcrossCompositionBranches, true);
  assert.equal(document.mutationBoundary.allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition, false);
  assert.equal(document.mutationBoundary.continuousMutationEpochVerified, false);
  assert.equal(document.mutationBoundary.samePermissionMutationExcluded, false);
  assert.equal(document.mutationBoundary.intervalMutationExcluded, false);
  assert.equal(document.mutationBoundary.abaExcluded, false);
  assert.equal(document.mutationBoundary.epoch, null);
});

test("input fixes runtime to bridge 01 and rejects runtimeCaptureInputPath", async () => {
  const fixture = await fixtureContextPromise;
  const parsed = parseSwAbProducerBridgeCompositionInput(fixture.input);
  assert.equal(parsed.runtimeCaptureInputPath, fixture.runtimePath);
  assert.equal(parsed.bridgePublicationPath, fixture.publicationPath);
  assert.throws(
    () => parseSwAbProducerBridgeCompositionInput({
      ...fixture.input,
      runtimeCaptureInputPath: path.join(workspaceRoot, "tmp", "forbidden-runtime.json")
    }),
    /SW_AB_PRODUCER_BRIDGE_COMPOSITION_INPUT_INVALID/u
  );
});

test("scope, artifact, evidence, tuple, bridge, issuance, publication, and source drift fail closed", async (t) => {
  const fixture = await fixtureContextPromise;
  const cases = [
    ["scope", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCOPE_MISMATCH/u, (args) => {
      args.oldComposition.scope.runId = `run-${"9".repeat(64)}`;
    }],
    ["artifact", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_ARTIFACT_OR_PROJECTION_MISMATCH/u, (args) => {
      args.oldComposition.artifactBindings.B.artifactSetDigest = "9".repeat(64);
    }],
    ["evidence digest", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_EVIDENCE_DIGEST_MISMATCH/u, (args) => {
      args.oldComposition.inputBindings.runtimeCapture.evidenceDigest = "9".repeat(64);
    }],
    ["tuple", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_TUPLE_MISMATCH/u, (args) => {
      args.oldComposition.clientMappings[0].runtimeResponseDigest = "9".repeat(64);
    }],
    ["bridge result", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_BRIDGE_INVALID/u, (args) => {
      args.bridgeLoaded.result.status = "trusted";
    }],
    ["bridge terminal gate", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_BRIDGE_INVALID/u, (args) => {
      delete args.bridgeLoaded.endpointFingerprint.terminalGate;
    }],
    ["bridge derived binding", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_BRIDGE_DERIVED_BINDING_MISMATCH/u, (args) => {
      args.bridgeLoaded.derivedEvidenceBinding.canonicalSha256 = "9".repeat(64);
    }],
    ["issuance identity", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHAIN_IDENTITY_MISMATCH/u, (args) => {
      args.issuanceLoaded.result.receiptDigest = "9".repeat(64);
    }],
    ["publication", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_PUBLICATION_MISMATCH/u, (args) => {
      args.bridgeLoaded.publication.publicationDigest = "9".repeat(64);
    }],
    ["transcript", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_TRANSCRIPT_INVALID/u, (args) => {
      args.transcriptLoaded.result.terminalEndpointSnapshotsMatched = false;
    }],
    ["source", /SW_AB_PRODUCER_BRIDGE_COMPOSITION_NESTED_SOURCE_DRIFT/u, (args) => {
      args.bridgeLoaded.sourceBindings[0].canonicalSha256 = "9".repeat(64);
    }]
  ];
  for (const [name, pattern, mutate] of cases) {
    await t.test(name, () => {
      assert.throws(() => validateFixtureBindings(fixture, mutate), pattern);
    });
  }
});

test("full composer rejects a bridge terminal gate physically aliased to another input", async () => {
  const fixture = await fixtureContextPromise;
  const { dependencies, state } = makeProducerBridgeCompositionDependencies(fixture);
  dependencies.loadBridge = async () => {
    state.branchCalls.push("bridge");
    const loaded = structuredClone(fixture.bridgeLoaded);
    loaded.endpointFingerprint.terminalGate = structuredClone(fixture.held.candidate.identity);
    return loaded;
  };
  await assert.rejects(
    swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
      fixture.input,
      { cwd: workspaceRoot, dependencies }
    ),
    /SW_AB_PRODUCER_BRIDGE_COMPOSITION_PHYSICAL_ALIAS/u
  );
});

test("physical alias rejection permits only exact repeated views of one logical endpoint", () => {
  const first = {
    realPath: "c:/fixture/one",
    dev: "1", ino: "1", birthtimeNs: "1", size: "1", mtimeNs: "1", ctimeNs: "1", nlink: "1"
  };
  assert.equal(assertSwAbProducerBridgeCompositionPhysicalIdentities([
    { logicalPath: "tmp/one.json", identity: first },
    { logicalPath: "tmp/one.json", identity: structuredClone(first) }
  ]), true);
  assert.throws(() => assertSwAbProducerBridgeCompositionPhysicalIdentities([
    { logicalPath: "tmp/one.json", identity: first },
    { logicalPath: "tmp/two.json", identity: structuredClone(first) }
  ]), /SW_AB_PRODUCER_BRIDGE_COMPOSITION_PHYSICAL_ALIAS/u);
  const drifted = { ...first, realPath: "c:/fixture/replacement", ino: "2" };
  assert.throws(() => assertSwAbProducerBridgeCompositionPhysicalIdentities([
    { logicalPath: "tmp/one.json", identity: first },
    { logicalPath: "tmp/one.json", identity: drifted }
  ]), /SW_AB_PRODUCER_BRIDGE_COMPOSITION_SHARED_ENDPOINT_DRIFT/u);
});

test("public composer rejects dependency injection", async () => {
  const fixture = await fixtureContextPromise;
  await assert.rejects(
    composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridge(
      fixture.input,
      { cwd: workspaceRoot, dependencies: {} }
    ),
    /SW_AB_PRODUCER_BRIDGE_COMPOSITION_PUBLIC_OPTIONS_INVALID/u
  );
});

test("injected synthetic orchestration holds three primary inputs and fourteen sources across one checkpoint", async () => {
  const fixture = await fixtureContextPromise;
  const { dependencies, state } = makeProducerBridgeCompositionDependencies(fixture);
  const document = await swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
    fixture.input,
    { cwd: workspaceRoot, dependencies }
  );
  assert.equal(state.checkpointCalls, 1);
  assert.deepEqual([...state.branchCalls].sort(), ["bridge", "old", "transcript"]);
  assert.equal(state.stableChecks.length, 17);
  assert.equal(document.mechanicalChecks.issuanceCheckpointCalledExactlyOnce, true);
  assert.equal(document.mechanicalChecks.allCompositionBranchesSettledInsideIssuanceHeldWindow, true);
  assert.equal(document.mechanicalChecks.runAttemptIdentifiersMatched, true);
  assert.equal(document.mechanicalChecks.runAttemptCoordinationVerified, false);
  assert.equal(document.runAttemptBoundary.candidateProducerBoundToIssuanceAttempt, false);
  assert.equal(document.runAttemptBoundary.runAttemptCoordinationStatus, "run_attempt_coordination_absent");
});

test("checkpoint phase, zero invocation, and duplicate invocation all fail closed", async (t) => {
  const fixture = await fixtureContextPromise;
  await t.test("wrong phase", async () => {
    const { dependencies } = makeProducerBridgeCompositionDependencies(fixture);
    dependencies.loadIssuance = async ({ onHeldEpochCheckpoint, runRoot }) => {
      await onHeldEpochCheckpoint({ phase: "wrong", runRoot });
      return structuredClone(fixture.issuanceLoaded);
    };
    await assert.rejects(
      swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
        fixture.input,
        { cwd: workspaceRoot, dependencies }
      ),
      /SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_PHASE_INVALID/u
    );
  });
  await t.test("zero", async () => {
    const { dependencies } = makeProducerBridgeCompositionDependencies(fixture);
    dependencies.loadIssuance = async () => structuredClone(fixture.issuanceLoaded);
    await assert.rejects(
      swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
        fixture.input,
        { cwd: workspaceRoot, dependencies }
      ),
      /SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_COUNT_INVALID/u
    );
  });
  await t.test("duplicate", async () => {
    const { dependencies } = makeProducerBridgeCompositionDependencies(fixture);
    dependencies.loadIssuance = async ({ onHeldEpochCheckpoint, runRoot }) => {
      const checkpoint = { phase: "after_initial_validation_before_terminal_reread", runRoot };
      await onHeldEpochCheckpoint(checkpoint);
      await onHeldEpochCheckpoint(checkpoint);
      return structuredClone(fixture.issuanceLoaded);
    };
    await assert.rejects(
      swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
        fixture.input,
        { cwd: workspaceRoot, dependencies }
      ),
      /SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_COUNT_INVALID/u
    );
  });
});

test("allSettled waits for delayed siblings before rejecting a held-window branch", async () => {
  const fixture = await fixtureContextPromise;
  const { dependencies } = makeProducerBridgeCompositionDependencies(fixture);
  let transcriptSettled = false;
  let bridgeSettled = false;
  dependencies.composeOld = async () => {
    throw new Error(`sensitive-${producerBridgeCompositionFixtureRunId}`);
  };
  dependencies.loadTranscript = async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    transcriptSettled = true;
    return structuredClone(fixture.transcriptLoaded);
  };
  dependencies.loadBridge = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    bridgeSettled = true;
    return structuredClone(fixture.bridgeLoaded);
  };
  await assert.rejects(
    swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
      fixture.input,
      { cwd: workspaceRoot, dependencies }
    ),
    /SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_BRANCH_FAILED/u
  );
  assert.equal(transcriptSettled, true);
  assert.equal(bridgeSettled, true);
});

test("terminal reread rejects a persistent primary-input path replacement", async () => {
  const fixture = await fixtureContextPromise;
  const { dependencies, state } = makeProducerBridgeCompositionDependencies(fixture);
  const baseLoadIssuance = dependencies.loadIssuance;
  dependencies.loadIssuance = async (args) => {
    const result = await baseLoadIssuance(args);
    state.replacedPaths.add(fixture.held.candidate.binding.path);
    return result;
  };
  await assert.rejects(
    swAbProducerBridgeCompositionTestOnly.composeWithDependencies(
      fixture.input,
      { cwd: workspaceRoot, dependencies }
    ),
    /SW_AB_PRODUCER_BRIDGE_COMPOSITION_HELD_FILE_CHANGED/u
  );
});

test("failure output is fail-closed and never repeats raw payload or unverified identifiers", () => {
  const failure = buildSwAbProducerBridgeCompositionFailure(new Error(
    `raw payload ${producerBridgeCompositionFixtureRunId} ${producerBridgeCompositionFixtureAttemptId}`
  ));
  const serialized = JSON.stringify(failure);
  assert.equal(failure.status, "not_admitted");
  assert.equal(failure.producerBridgeStatus, "producer_bridge_present_mechanically_untrusted");
  assert.equal(failure.trustedProducerBridgeVerified, false);
  assert.equal(failure.runAttemptCoordinationStatus, "run_attempt_coordination_absent");
  assert.equal(failure.cliExitCode, 1);
  assert.equal(serialized.includes("raw payload"), false);
  assert.equal(serialized.includes(producerBridgeCompositionFixtureRunId), false);
  assert.equal(serialized.includes(producerBridgeCompositionFixtureAttemptId), false);
});

test("CLI accepts only the exact eight bridge-aware flags, writes JSON only, and exits 1", async () => {
  const fixture = await fixtureContextPromise;
  const verifier = path.join(
    workspaceRoot,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs"
  );
  const flags = [
    "--binding-root", fixture.input.bindingRoot,
    "--candidate-input", fixture.input.candidateInputPath,
    "--attachments-root", fixture.input.attachmentsRoot,
    "--private-root", fixture.input.privateRoot,
    "--artifact-a-root", fixture.input.artifactARoot,
    "--artifact-b-root", fixture.input.artifactBRoot,
    "--issuance-run-root", fixture.input.issuanceRunRoot,
    "--bridge-root", fixture.input.bridgeRoot
  ];
  const exact = spawnSync(process.execPath, [verifier, ...flags], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(exact.status, 1);
  assert.equal(exact.stderr, "");
  assert.equal(exact.stdout.trimStart().startsWith("{"), true);
  const output = JSON.parse(exact.stdout);
  assert.equal(output.status, "not_admitted");
  assert.equal(output.cliExitCode, 1);

  const legacyRuntimeFlag = spawnSync(process.execPath, [
    verifier,
    ...flags,
    "--runtime-capture-input",
    fixture.runtimePath
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(legacyRuntimeFlag.status, 1);
  assert.equal(legacyRuntimeFlag.stderr, "");
  const rejected = JSON.parse(legacyRuntimeFlag.stdout);
  assert.equal(rejected.status, "not_admitted");
  assert.equal(rejected.cliExitCode, 1);
});
