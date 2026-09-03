import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

import {
  computeSwAbUpdateRuntimeClientCaptureDigest,
  computeSwAbUpdateRuntimeClientId,
  computeSwAbUpdateRuntimeObservationDigest,
  computeSwAbUpdateRuntimeTargetId,
  parseSwAbUpdateRuntimeClientCaptureJsonBytes,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  validateSwAbUpdateRuntimeClientCapturePolicy,
  verifySwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  buildSwAbUpdateRuntimeClientCaptureEvidence,
  captureUntrustedSwAbUpdateRuntimeClientObservation
} from "./sw-ab-update-runtime-client-capture-probe.mjs";
import {
  loadSwAbUpdateRuntimeClientCaptureSchemaValidator,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-loader.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const testRoot = path.join(workspaceRoot, "tmp", "sw-ab-runtime-client-capture-tests");
const origin = "https://pwa.hakimi.cn";
const runId = `run-${"1".repeat(64)}`;
const attemptId = `attempt-${"2".repeat(64)}`;
const artifactBindings = Object.freeze({
  A: Object.freeze({
    label: "A",
    releaseEvidenceId: `hre1-${"a".repeat(32)}`,
    buildVersion: "a".repeat(12),
    serviceWorkerSha256: "a".repeat(64),
    artifactSetDigest: "b".repeat(64)
  }),
  B: Object.freeze({
    label: "B",
    releaseEvidenceId: `hre1-${"b".repeat(32)}`,
    buildVersion: "b".repeat(12),
    serviceWorkerSha256: "c".repeat(64),
    artifactSetDigest: "d".repeat(64)
  })
});

function rawTargetId(projectName, slot) {
  return `${projectName}-${slot}-target`;
}

function rawClientId(projectName, phase, slot) {
  if (slot === "retained-old-a") return `${projectName}-retained-client`;
  return `${projectName}-reload-${phase}-client`;
}

function fakePage({
  projectName,
  phase,
  slot,
  mutateResponse = (value) => value,
  postChallengePageUrl,
  postChallengeTargetId
}) {
  const initialPageUrl = `${origin}/runtime-client/${projectName}/${slot}`;
  const targetId = rawTargetId(projectName, slot);
  const sourceClientId = rawClientId(projectName, phase, slot);
  const buildVersion = artifactBindings[phase === "initial-a" ? "A" : "B"].buildVersion;
  let detached = false;
  let challengeCompleted = false;
  let targetInfoCalls = 0;
  let newCdpSessionCalls = 0;
  const sessionEvents = [];
  const session = {
    async send(method) {
      assert.equal(method, "Target.getTargetInfo");
      targetInfoCalls += 1;
      sessionEvents.push(`target-info-${targetInfoCalls}`);
      return {
        targetInfo: {
          targetId: challengeCompleted && postChallengeTargetId
            ? postChallengeTargetId
            : targetId,
          type: "page",
          url: challengeCompleted && postChallengePageUrl
            ? postChallengePageUrl
            : initialPageUrl,
          attached: true,
          title: "unretained extra field"
        }
      };
    },
    async detach() {
      detached = true;
      sessionEvents.push("detach");
    }
  };
  return {
    url: () => challengeCompleted && postChallengePageUrl
      ? postChallengePageUrl
      : initialPageUrl,
    context: () => ({
      async newCDPSession() {
        newCdpSessionCalls += 1;
        sessionEvents.push("session-create");
        return session;
      }
    }),
    async evaluate(_fn, nonce) {
      sessionEvents.push("challenge");
      const response = mutateResponse({
        type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
        challengeNonce: nonce,
        sourceClientId,
        buildVersion,
        protocolVersion: 1,
        dbGeneration: "legacy-v13",
        databaseName: "hakimi-bazi-research",
        targetSchema: 13,
        minReadableSchema: 13,
        maxReadableSchema: 13,
        migrationId: null,
        acceptedCommittedMigrationIds: [null],
        sourceGeneration: null,
        sourceDatabaseName: null,
        sourceSchema: null
      });
      challengeCompleted = true;
      return response;
    },
    detached: () => detached,
    targetInfoCalls: () => targetInfoCalls,
    newCdpSessionCalls: () => newCdpSessionCalls,
    sessionEvents: () => [...sessionEvents]
  };
}

async function createEvidence(transformCaptures = (captures) => captures) {
  const captures = [];
  for (const phase of ["initial-a", "post-claim"]) {
    if (phase === "post-claim") {
      const initialPhaseTimestamp = Date.now();
      while (Date.now() <= initialPhaseTimestamp) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
    for (const projectName of ["msedge", "chrome"]) {
      for (const slot of ["retained-old-a", "reload-to-b"]) {
        const page = fakePage({ projectName, phase, slot });
        const capture = await captureUntrustedSwAbUpdateRuntimeClientObservation({
          page,
          runId,
          attemptId,
          origin,
          projectName,
          phase,
          slot,
          expectedBuildVersion:
            artifactBindings[phase === "initial-a" ? "A" : "B"].buildVersion
        });
        assert.equal(page.detached(), true);
        assert.equal(page.targetInfoCalls(), 2);
        assert.equal(page.newCdpSessionCalls(), 1);
        assert.deepEqual(page.sessionEvents(), [
          "session-create",
          "target-info-1",
          "challenge",
          "target-info-2",
          "detach"
        ]);
        captures.push(capture);
      }
    }
  }
  return buildSwAbUpdateRuntimeClientCaptureEvidence({
    runId,
    attemptId,
    origin,
    artifactBindings,
    captures: transformCaptures(captures)
  });
}

function rebindObservationTime(observation, observedAt) {
  observation.observedAt = observedAt;
  observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
}

async function loadContract() {
  const [policyBytes, schemaValidator] = await Promise.all([
    readFile(path.join(workspaceRoot, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH)),
    loadSwAbUpdateRuntimeClientCaptureSchemaValidator(workspaceRoot)
  ]);
  const policy = parseSwAbUpdateRuntimeClientCaptureJsonBytes(policyBytes, "capture policy");
  return { policy, schemaValidator };
}

function rebindObservationTarget(observation, rawTargetId) {
  observation.cdp.rawTargetId = rawTargetId;
  for (const projectionName of [
    "preChallengeResponseProjection",
    "postChallengeResponseProjection"
  ]) observation.cdp[projectionName].targetId = rawTargetId;
  observation.cdp.preChallengeResponseProjectionDigest = sha256(
    canonicalJson(observation.cdp.preChallengeResponseProjection)
  );
  observation.cdp.postChallengeResponseProjectionDigest = sha256(
    canonicalJson(observation.cdp.postChallengeResponseProjection)
  );
  observation.cdp.pseudonymousTargetId = computeSwAbUpdateRuntimeTargetId({
    runId,
    attemptId,
    projectName: observation.projectName,
    rawTargetId
  });
  observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
}

function rebindObservationClient(observation, rawSourceClientId) {
  observation.serviceWorkerMessage.rawSourceClientId = rawSourceClientId;
  observation.serviceWorkerMessage.response.sourceClientId = rawSourceClientId;
  observation.serviceWorkerMessage.responseDigest = sha256(
    canonicalJson(observation.serviceWorkerMessage.response)
  );
  observation.serviceWorkerMessage.pseudonymousClientId = computeSwAbUpdateRuntimeClientId({
    runId,
    attemptId,
    projectName: observation.projectName,
    rawSourceClientId
  });
  observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
}

test("policy and schema freeze a partial, non-admissible legacy-v13 capture family", async () => {
  const { policy, schemaValidator } = await loadContract();
  validateSwAbUpdateRuntimeClientCapturePolicy(policy);
  assert.equal(schemaValidator.schema.properties.status.const, "capture_incomplete");
  assert.equal(schemaValidator.schema.properties.usableForCandidateAssembly.const, false);
  assert.equal(schemaValidator.schema.properties.observations.minItems, 8);
  assert.equal(schemaValidator.schema.properties.observations.maxItems, 8);
  assert.deepEqual(policy.requiredObservationTuples, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES);
  assert.ok(Object.values(schemaValidator.schema.$defs.Provenance.properties)
    .every((entry) => entry.const === false));
  assert.ok(Object.values(schemaValidator.schema.$defs.Authority.properties)
    .every((entry) => entry.const === false));
});

test("untrusted caller page adapter records stable pre/post CDP projections and nonce echo", async () => {
  const evidence = await createEvidence();
  const { policy, schemaValidator } = await loadContract();
  const result = verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator });
  assert.equal(result.internalConsistencyVerified, true);
  assert.equal(result.observationCount, 8);
  assert.equal(result.callerSuppliedPageAuthenticityVerified, false);
  assert.equal(result.runtimeCollectorProvenanceVerified, false);
  assert.equal(result.twoClientRuntimeProvenanceVerified, false);
  assert.equal(result.usableForCandidateAssembly, false);
  assert.equal(result.cliExitCode, 1);
  assert.equal(Object.isFrozen(result.compositionProjection), true);
  assert.equal(Object.isFrozen(result.compositionProjection.observations), true);
  assert.equal(Object.isFrozen(result.compositionProjection.observations[0]), true);
  assert.deepEqual(
    result.compositionProjection.observations.map(({ projectName, phase, slot }) => ({
      projectName,
      phase,
      slot
    })),
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
  );
});

test("evidence builder rejects caller-authored capsules not issued by the untrusted probe path", () => {
  assert.throws(() => buildSwAbUpdateRuntimeClientCaptureEvidence({
    runId,
    attemptId,
    origin,
    artifactBindings,
    captures: Array.from({ length: 8 }, () => ({}))
  }), /SW_AB_RUNTIME_PROBE_CAPTURE_SET_INVALID/u);
});

test("evidence builder rejects branded capsules reordered into the former project-major sequence", async () => {
  await assert.rejects(
    createEvidence((captures) => [
      captures[0],
      captures[1],
      captures[4],
      captures[5],
      captures[2],
      captures[3],
      captures[6],
      captures[7]
    ]),
    /SW_AB_RUNTIME_PROBE_CAPTURE_SET_INVALID/u
  );
});

test("probe rejects a challenge response whose nonce is not the host nonce", async () => {
  const page = fakePage({
    projectName: "msedge",
    phase: "initial-a",
    slot: "retained-old-a",
    mutateResponse(value) {
      return { ...value, challengeNonce: `challenge-${"f".repeat(64)}` };
    }
  });
  await assert.rejects(
    captureUntrustedSwAbUpdateRuntimeClientObservation({
      page,
      runId,
      attemptId,
      origin,
      projectName: "msedge",
      phase: "initial-a",
      slot: "retained-old-a",
      expectedBuildVersion: artifactBindings.A.buildVersion
    }),
    /SW_AB_RUNTIME_PROBE_CHALLENGE_INVALID/u
  );
  assert.equal(page.detached(), true);
});

test("probe keeps one CDP session across the challenge and rejects a post-challenge target swap", async () => {
  const page = fakePage({
    projectName: "msedge",
    phase: "initial-a",
    slot: "retained-old-a",
    postChallengeTargetId: "msedge-swapped-target"
  });
  await assert.rejects(
    captureUntrustedSwAbUpdateRuntimeClientObservation({
      page,
      runId,
      attemptId,
      origin,
      projectName: "msedge",
      phase: "initial-a",
      slot: "retained-old-a",
      expectedBuildVersion: artifactBindings.A.buildVersion
    }),
    /SW_AB_RUNTIME_PROBE_TARGET_CHANGED_DURING_CHALLENGE/u
  );
  assert.equal(page.targetInfoCalls(), 2);
  assert.equal(page.newCdpSessionCalls(), 1);
  assert.deepEqual(page.sessionEvents(), [
    "session-create",
    "target-info-1",
    "challenge",
    "target-info-2",
    "detach"
  ]);
  assert.equal(page.detached(), true);
});

test("probe rejects a page URL swap during the challenge before accepting post-state", async () => {
  const page = fakePage({
    projectName: "msedge",
    phase: "initial-a",
    slot: "retained-old-a",
    postChallengePageUrl: `${origin}/runtime-client/msedge/replaced-document`
  });
  await assert.rejects(
    captureUntrustedSwAbUpdateRuntimeClientObservation({
      page,
      runId,
      attemptId,
      origin,
      projectName: "msedge",
      phase: "initial-a",
      slot: "retained-old-a",
      expectedBuildVersion: artifactBindings.A.buildVersion
    }),
    /SW_AB_RUNTIME_PROBE_TARGET_CHANGED_DURING_CHALLENGE/u
  );
  assert.equal(page.newCdpSessionCalls(), 1);
  assert.deepEqual(page.sessionEvents(), [
    "session-create",
    "target-info-1",
    "challenge",
    "detach"
  ]);
  assert.equal(page.detached(), true);
});

test("offline verifier rejects a cross-browser raw target alias after all digests are recomputed", async () => {
  const evidence = structuredClone(await createEvidence());
  const edge = evidence.observations[0];
  const chromeInitial = evidence.observations[2];
  const chromePost = evidence.observations[6];
  rebindObservationTarget(chromeInitial, edge.cdp.rawTargetId);
  rebindObservationTarget(chromePost, edge.cdp.rawTargetId);
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_CROSS_BROWSER_ALIAS/u
  );
});

test("offline verifier rejects same-phase slot target alias after all digests are recomputed", async () => {
  const evidence = structuredClone(await createEvidence());
  const initialRetained = evidence.observations[0];
  const initialReload = evidence.observations[1];
  const postReload = evidence.observations[5];
  rebindObservationTarget(initialReload, initialRetained.cdp.rawTargetId);
  rebindObservationTarget(postReload, initialRetained.cdp.rawTargetId);
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_CLIENT_CONTINUITY_INVALID/u
  );
});

test("offline verifier rejects same-phase slot client alias after all digests are recomputed", async () => {
  const evidence = structuredClone(await createEvidence());
  const retained = evidence.observations[0];
  const reload = evidence.observations[1];
  rebindObservationClient(reload, retained.serviceWorkerMessage.rawSourceClientId);
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_CLIENT_CONTINUITY_INVALID/u
  );
});

test("offline verifier rejects post-phase slot client alias after all digests are recomputed", async () => {
  const evidence = structuredClone(await createEvidence());
  const postRetained = evidence.observations[4];
  const postReload = evidence.observations[5];
  rebindObservationClient(postReload, postRetained.serviceWorkerMessage.rawSourceClientId);
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_CLIENT_CONTINUITY_INVALID/u
  );
});

test("offline verifier rejects the former project-major order even after sequence and digests are rebound", async () => {
  const evidence = structuredClone(await createEvidence());
  evidence.observations = [
    evidence.observations[0],
    evidence.observations[1],
    evidence.observations[4],
    evidence.observations[5],
    evidence.observations[2],
    evidence.observations[3],
    evidence.observations[6],
    evidence.observations[7]
  ];
  evidence.observations.forEach((observation, index) => {
    observation.sequence = index + 1;
    observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
  });
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_OBSERVATION_SET_INVALID/u
  );
});

test("offline verifier rejects any post-claim observation at or before the final cross-browser initial-A observation", async () => {
  const evidence = structuredClone(await createEvidence());
  rebindObservationTime(
    evidence.observations[4],
    evidence.observations[3].observedAt
  );
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_PHASE_BARRIER_INVALID/u
  );
});

test("provenance or authority promotion is rejected by Schema before semantic verification", async () => {
  const evidence = structuredClone(await createEvidence());
  evidence.provenance.twoClientRuntimeProvenanceVerified = true;
  evidence.authority.publicDeploymentAuthorized = true;
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  const { policy, schemaValidator } = await loadContract();
  assert.throws(
    () => verifySwAbUpdateRuntimeClientCapture({ evidence, policy, schemaValidator }),
    /SW_AB_RUNTIME_CAPTURE_SCHEMA_INVALID/u
  );
});

test("strict parser rejects duplicate JSON keys", () => {
  assert.throws(
    () => parseSwAbUpdateRuntimeClientCaptureJsonBytes(
      Buffer.from('{"schemaVersion":1,"schemaVersion":1}', "utf8"),
      "duplicate fixture"
    ),
    /SW_AB_RUNTIME_CAPTURE_JSON_DUPLICATE_KEY/u
  );
});

test("CLI returns an internally-consistent incomplete result but always exits 1", async (t) => {
  await mkdir(testRoot, { recursive: true });
  const fixtureRoot = path.join(testRoot, randomBytes(24).toString("hex"));
  await mkdir(fixtureRoot, { recursive: true });
  t.after(async () => rm(fixtureRoot, { recursive: true, force: true }));
  const inputPath = path.join(fixtureRoot, "capture.json");
  await writeFile(inputPath, `${JSON.stringify(await createEvidence(), null, 2)}\n`);
  const loaded = await loadVerifiedSwAbUpdateRuntimeClientCapture({
    cwd: workspaceRoot,
    bindingRoot: workspaceRoot,
    inputPath
  });
  assert.equal(loaded.result.internalConsistencyVerified, true);
  const inputBytes = await readFile(inputPath);
  assert.deepEqual(loaded.inputBinding, {
    path: path.relative(workspaceRoot, inputPath).replaceAll("\\", "/"),
    size: inputBytes.length,
    sha256: sha256(inputBytes)
  });
  assert.deepEqual(loaded.endpointFingerprint.input.binding, loaded.inputBinding);
  assert.deepEqual(
    loaded.sourceBindings.map(({ role }) => role),
    ["runtime-client-capture-policy", "runtime-client-capture-schema"]
  );
  const expectedSourcePaths = [
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
  ];
  for (let index = 0; index < expectedSourcePaths.length; index += 1) {
    const sourcePath = expectedSourcePaths[index];
    const sourceBytes = await readFile(path.join(workspaceRoot, sourcePath));
    const sourceDocument = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
      sourceBytes,
      `runtime loader source ${index + 1}`
    );
    assert.equal(loaded.sourceBindings[index].path, sourcePath);
    assert.equal(loaded.sourceBindings[index].size, sourceBytes.length);
    assert.equal(loaded.sourceBindings[index].sha256, sha256(sourceBytes));
    assert.equal(
      loaded.sourceBindings[index].canonicalSha256,
      sha256(canonicalJson(sourceDocument))
    );
  }
  assert.deepEqual(loaded.endpointFingerprint.sourceBindings, loaded.sourceBindings);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeClientCapture({
      cwd: workspaceRoot,
      bindingRoot: workspaceRoot,
      inputPath: path.join(workspaceRoot, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH)
    }),
    /SW_AB_RUNTIME_CAPTURE_PHYSICAL_ALIAS/u
  );
  const outcome = spawnSync(process.execPath, [
    path.join(workspaceRoot, "scripts", "verify-sw-ab-update-runtime-client-capture.mjs"),
    "--input",
    inputPath
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stderr, "");
  const result = JSON.parse(outcome.stdout);
  assert.equal(result.internalConsistencyVerified, true);
  assert.equal(result.status, "capture_incomplete");
  assert.equal(result.usableForCandidateAssembly, false);
  assert.equal(result.publicDeploymentAuthorized, false);
});
