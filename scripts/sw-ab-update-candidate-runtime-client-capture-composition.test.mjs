import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  computeSwAbUpdateCandidateAttachmentDigest,
  computeSwAbUpdateCandidateBrowserReceiptDigest,
  computeSwAbUpdateCandidateClientChallengeResponseDigest,
  computeSwAbUpdateCandidateEvidenceDigest,
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY
} from "./sw-ab-update-candidate-lib.mjs";
import {
  createFixture as createCandidateDiskFixture
} from "./sw-ab-update-candidate-fixture.mjs";
import {
  composeSwAbUpdateCandidateRuntimeClientCapture,
  computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity,
  parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput,
  swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly,
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionDocument,
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy,
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections
} from "./sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs";
import {
  computeSwAbUpdateRuntimeClientCaptureDigest,
  computeSwAbUpdateRuntimeClientId,
  computeSwAbUpdateRuntimeObservationDigest,
  computeSwAbUpdateRuntimeTargetId,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const origin = "https://pwa.hakimi.cn";
const runId = `run-${"1".repeat(64)}`;
const attemptId = `attempt-${"2".repeat(64)}`;

function digest(label) {
  return sha256(label);
}

function iso(second) {
  return `2026-08-27T00:00:${String(second).padStart(2, "0")}.000Z`;
}

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

function clientId(projectName, phase, slot) {
  const identityPhase = slot === "retained-old-a" ? "retained" : phase;
  return `client-${digest(`${projectName}-${identityPhase}-${slot}-client`)}`;
}

function targetId(projectName, slot) {
  return `target-${digest(`${projectName}-${slot}-target`)}`;
}

function challengeNonce(projectName, phase, slot) {
  return `challenge-${digest(`${projectName}-${phase}-${slot}-challenge`)}`;
}

function candidateProof(projectName, phase, slot) {
  const initial = phase === "initial-a";
  const retained = slot === "retained-old-a";
  return {
    slot,
    documentTag: initial || retained ? "A" : "B",
    controllerTag: initial ? "A" : "B",
    clientId: clientId(projectName, phase, slot),
    cdpTargetId: targetId(projectName, slot),
    challengeNonce: challengeNonce(projectName, phase, slot),
    challengeResponseDigest: digest(`${projectName}-${phase}-${slot}-candidate-response`),
    controllerChangeCount: initial ? 0 : 1
  };
}

function browserReceipt(projectName) {
  const edge = projectName === "msedge";
  return {
    projectName,
    capturedAt: iso(edge ? 29 : 30),
    initialAClients: [
      candidateProof(projectName, "initial-a", "retained-old-a"),
      candidateProof(projectName, "initial-a", "reload-to-b")
    ],
    postClaimClients: [
      candidateProof(projectName, "post-claim", "retained-old-a"),
      candidateProof(projectName, "post-claim", "reload-to-b")
    ],
    timeline: {
      twoArtifactAClientsControlledAt: iso(edge ? 5 : 6),
      artifactBActivationAndClaimObservedAt: iso(edge ? 18 : 20),
      oneADocumentReloadedToBAt: iso(edge ? 22 : 25),
      staleAProductionWriteRejectedAt: iso(edge ? 27 : 28)
    }
  };
}

function runtimeObservedSecond(tuple) {
  const key = `${tuple.phase}/${tuple.projectName}/${tuple.slot}`;
  return {
    "initial-a/msedge/retained-old-a": 1,
    "initial-a/msedge/reload-to-b": 2,
    "initial-a/chrome/retained-old-a": 3,
    "initial-a/chrome/reload-to-b": 4,
    "post-claim/msedge/retained-old-a": 21,
    "post-claim/msedge/reload-to-b": 23,
    "post-claim/chrome/retained-old-a": 24,
    "post-claim/chrome/reload-to-b": 26
  }[key];
}

function baselineVerifications() {
  const candidateProjection = {
    projectionType: "sw_ab_update_candidate_composition_projection_v1",
    runId,
    attemptId,
    canonicalHttpsOrigin: origin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_CANDIDATE_CAPABILITIES),
    artifactBindings: structuredClone(artifactBindings),
    deploymentChronology: {
      edgeTwoAClientsReadyAt: iso(5),
      chromeTwoAClientsReadyAt: iso(6),
      artifactBProviderSwitchStartedAt: iso(10),
      bothBrowsersBActivatedAndClaimedAt: iso(20),
      bothOldAWritesRejectedAt: iso(28)
    },
    browserReceipts: [browserReceipt("msedge"), browserReceipt("chrome")],
    capturedAt: iso(32),
    evidenceDigest: digest("candidate-evidence")
  };
  const runtimeProjection = {
    projectionType: "sw_ab_update_runtime_client_capture_composition_projection_v1",
    runId,
    attemptId,
    canonicalHttpsOrigin: origin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_CANDIDATE_CAPABILITIES),
    artifactBindings: structuredClone(artifactBindings),
    observations: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.map((tuple, index) => ({
      ...tuple,
      sequence: index + 1,
      observedAt: iso(runtimeObservedSecond(tuple)),
      pseudonymousClientId: clientId(tuple.projectName, tuple.phase, tuple.slot),
      pseudonymousTargetId: targetId(tuple.projectName, tuple.slot),
      challengeNonce: challengeNonce(tuple.projectName, tuple.phase, tuple.slot),
      runtimeRequestDigest: digest(`${index}-request`),
      runtimeResponseDigest: digest(`${index}-response`),
      runtimeObservationDigest: digest(`${index}-observation`)
    })),
    capturedAt: iso(31),
    evidenceDigest: digest("runtime-evidence")
  };
  return {
    candidateVerification: {
      schemaVersion: 1,
      resultType: "sw_ab_update_candidate_offline_verification_v1",
      verificationKind: "offline_no_git_no_network_no_browser_no_deployment",
      internalConsistencyVerified: true,
      trustClass: "untrusted_candidate",
      status: "not_admitted",
      executionAdmission: "closed_missing_https_origin",
      strictGatePassed: false,
      usableForAdmission: false,
      formalReleaseEvidenceReceipt: false,
      attemptFreshnessExternallyVerified: false,
      bundleReplayResistanceVerified: false,
      runtimeCollectorProvenanceVerified: false,
      osProcessRestartProvenanceVerified: false,
      twoClientRuntimeProvenanceVerified: false,
      serviceWorkerResponseProvenanceVerified: false,
      cacheApiProvenanceVerified: false,
      concurrentFilesystemMutationResistanceVerified: false,
      runId,
      attemptId,
      evidenceDigest: candidateProjection.evidenceDigest,
      compositionProjection: candidateProjection,
      browserProjects: ["msedge", "chrome"],
      authority: structuredClone(SW_AB_UPDATE_CANDIDATE_AUTHORITY),
      verifierNetworkAttempted: false,
      verifierBrowserAttempted: false,
      verifierDeploymentAttempted: false,
      code: "SW_AB_UPDATE_CANDIDATE_INTERNALLY_CONSISTENT_NOT_ADMITTED",
      messageDigest: digest("candidate-message")
    },
    runtimeVerification: {
      code: "SW_AB_RUNTIME_CLIENT_CAPTURE_INTERNALLY_CONSISTENT_BUT_INCOMPLETE",
      status: "capture_incomplete",
      executionAdmission: "closed_missing_https_origin",
      internalConsistencyVerified: true,
      implementedObservationScopeCount: 2,
      deferredObservationScopeCount: 8,
      observationCount: 8,
      compositionProjection: runtimeProjection,
      callerSuppliedPageAuthenticityVerified: false,
      runtimeCollectorProvenanceVerified: false,
      osProcessRestartProvenanceVerified: false,
      twoClientRuntimeProvenanceVerified: false,
      serviceWorkerResponseProvenanceVerified: false,
      cacheApiProvenanceVerified: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      verifierNetworkAttempted: false,
      cliExitCode: 1
    },
    candidateInputBinding: {
      path: "tmp/sw-ab-composition/candidate/evidence.json",
      size: 1024,
      sha256: digest("candidate-raw")
    },
    runtimeInputBinding: {
      path: "tmp/sw-ab-composition/runtime/capture.json",
      size: 2048,
      sha256: digest("runtime-raw")
    }
  };
}

function cloneBaseline() {
  return structuredClone(baselineVerifications());
}

function sourceBindingFixture() {
  return swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly.sourceSpecs.map((spec) => ({
    ...spec,
    size: 100,
    sha256: digest(`${spec.role}-raw`),
    canonicalSha256: digest(`${spec.role}-canonical`)
  }));
}

function rebindDocumentIdentity(document) {
  Object.assign(
    document,
    computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(document)
  );
}

async function writePrettyJson(filePath, document) {
  const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
  await writeFile(filePath, bytes);
  return bytes;
}

function rawRuntimeClientId({ projectName, phase, slot }) {
  return slot === "retained-old-a"
    ? `${projectName}-retained-client`
    : `${projectName}-reload-${phase}-client`;
}

function rawRuntimeTargetId({ projectName, slot }) {
  return `${projectName}-${slot}-target`;
}

function candidateClientByTuple(evidence, tuple) {
  const receipt = evidence.browserReceipts.find(({ projectName }) =>
    projectName === tuple.projectName
  );
  const clients = tuple.phase === "initial-a"
    ? receipt.initialAClients ?? receipt.clientProofs.initialAClients
    : receipt.postClaimClients ?? receipt.clientProofs.postClaimClients;
  return clients.find(({ slot }) => slot === tuple.slot);
}

async function rebindCandidateRuntimeIdentities(fixture) {
  const evidence = JSON.parse(await readFile(fixture.inputPath, "utf8"));
  for (const receipt of evidence.browserReceipts) {
    for (const [phase, clients] of [
      ["initial-a", receipt.clientProofs.initialAClients],
      ["post-claim", receipt.clientProofs.postClaimClients]
    ]) {
      for (const client of clients) {
        const tuple = { projectName: receipt.projectName, phase, slot: client.slot };
        client.clientId = computeSwAbUpdateRuntimeClientId({
          runId: evidence.runId,
          attemptId: evidence.attemptId,
          projectName: receipt.projectName,
          rawSourceClientId: rawRuntimeClientId(tuple)
        });
        client.cdpTargetId = computeSwAbUpdateRuntimeTargetId({
          runId: evidence.runId,
          attemptId: evidence.attemptId,
          projectName: receipt.projectName,
          rawTargetId: rawRuntimeTargetId(tuple)
        });
        client.challengeResponseDigest =
          computeSwAbUpdateCandidateClientChallengeResponseDigest({
            evidence,
            projectName: receipt.projectName,
            phase,
            client
          });
      }
      const role = phase === "initial-a"
        ? "initial-two-client-census"
        : "post-claim-two-client-census";
      const attachment = evidence.attachments.find((entry) =>
        entry.browserProject === receipt.projectName && entry.role === role
      );
      const attachmentPath = path.join(
        fixture.attachmentsRoot,
        ...attachment.path.split("/")
      );
      const envelope = JSON.parse(await readFile(attachmentPath, "utf8"));
      envelope.payload.clients = structuredClone(clients);
      envelope.payloadDigest = sha256(canonicalJson(envelope.payload));
      const attachmentBytes = await writePrettyJson(attachmentPath, envelope);
      attachment.size = attachmentBytes.length;
      attachment.sha256 = sha256(attachmentBytes);
      attachment.digest = computeSwAbUpdateCandidateAttachmentDigest(attachment);
    }
    receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  }
  evidence.evidenceDigest = computeSwAbUpdateCandidateEvidenceDigest(evidence);
  const evidenceBytes = await writePrettyJson(fixture.inputPath, evidence);
  await writeFile(
    `${fixture.inputPath}.sha256`,
    `${sha256(evidenceBytes)}  evidence.json\n`,
    "ascii"
  );
  return evidence;
}

function candidateArtifactBindings(evidence) {
  return Object.fromEntries(["A", "B"].map((label) => [label, {
    label,
    releaseEvidenceId: evidence.artifacts[label].releaseEvidenceId,
    buildVersion: evidence.artifacts[label].buildVersion,
    serviceWorkerSha256: evidence.artifacts[label].serviceWorkerSha256,
    artifactSetDigest: evidence.artifacts[label].artifactSetDigest
  }]));
}

function receiptEventTime(evidence, projectName, eventId) {
  const receipt = evidence.browserReceipts.find((entry) => entry.projectName === projectName);
  return Date.parse(receipt.timeline.find((event) => event.eventId === eventId).observedAt);
}

function runtimeObservationTimes(evidence) {
  const edgeReady = receiptEventTime(
    evidence,
    "msedge",
    "two_artifact_a_clients_controlled"
  );
  const chromeReady = receiptEventTime(
    evidence,
    "chrome",
    "two_artifact_a_clients_controlled"
  );
  const activationMaximum = Math.max(...["msedge", "chrome"].map((projectName) =>
    receiptEventTime(evidence, projectName, "artifact_b_activation_and_claim_observed")
  ));
  const reloadByProject = Object.fromEntries(["msedge", "chrome"].map((projectName) => [
    projectName,
    receiptEventTime(evidence, projectName, "one_a_document_reloaded_to_b")
  ]));
  const initialStart = Math.min(edgeReady, chromeReady) - 800;
  const values = [
    initialStart,
    initialStart + 100,
    initialStart + 200,
    initialStart + 300,
    activationMaximum + 100,
    Math.max(reloadByProject.msedge, activationMaximum + 200),
    Math.max(reloadByProject.msedge, activationMaximum + 200) + 100,
    Math.max(
      reloadByProject.chrome,
      Math.max(reloadByProject.msedge, activationMaximum + 200) + 200
    )
  ];
  return values.map((value) => new Date(value).toISOString());
}

function buildRuntimeDiskEvidence(candidateEvidence) {
  const artifactBindings = candidateArtifactBindings(candidateEvidence);
  const observedAt = runtimeObservationTimes(candidateEvidence);
  const evidence = {
    schemaVersion: 1,
    evidenceType: "sw_ab_update_runtime_client_capture_candidate_v1",
    trustClass: "untrusted_raw_capture_candidate",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    usableForCandidateAssembly: false,
    runId: candidateEvidence.runId,
    attemptId: candidateEvidence.attemptId,
    capturedAt: new Date(Date.parse(observedAt.at(-1)) + 100).toISOString(),
    origin: candidateEvidence.deploymentCandidate.canonicalHttpsOrigin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES),
    artifactBindings,
    implementedObservationScopes: [
      ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES
    ],
    deferredObservationScopes: [
      ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES
    ],
    observations: [],
    provenance: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE),
    authority: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY),
    evidenceDigest: "0".repeat(64)
  };
  evidence.observations = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.map((tuple, index) => {
    const rawTargetId = rawRuntimeTargetId(tuple);
    const rawSourceClientId = rawRuntimeClientId(tuple);
    const pageUrl = `${evidence.origin}/runtime-client/${tuple.projectName}/${tuple.slot}`;
    const targetProjection = {
      targetId: rawTargetId,
      type: "page",
      url: pageUrl,
      attached: true
    };
    const challengeNonce = candidateClientByTuple(candidateEvidence, tuple).challengeNonce;
    const request = { type: "SW_AB_RUNTIME_CHALLENGE_V1", challengeNonce };
    const response = {
      type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
      challengeNonce,
      sourceClientId: rawSourceClientId,
      buildVersion: artifactBindings[tuple.phase === "initial-a" ? "A" : "B"].buildVersion,
      ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR
    };
    const observation = {
      ...tuple,
      sequence: index + 1,
      observedAt: observedAt[index],
      pageUrl,
      cdp: {
        method: "Target.getTargetInfo",
        sourceTrust: "caller_supplied_page_adapter_untrusted",
        sessionHeldAcrossChallenge: true,
        preChallengeResponseProjection: targetProjection,
        preChallengeResponseProjectionDigest: sha256(canonicalJson(targetProjection)),
        postChallengeResponseProjection: structuredClone(targetProjection),
        postChallengeResponseProjectionDigest: sha256(canonicalJson(targetProjection)),
        rawTargetId,
        pseudonymousTargetId: computeSwAbUpdateRuntimeTargetId({
          runId: evidence.runId,
          attemptId: evidence.attemptId,
          projectName: tuple.projectName,
          rawTargetId
        })
      },
      serviceWorkerMessage: {
        realm: "page_main_world_untrusted",
        request,
        requestDigest: sha256(canonicalJson(request)),
        response,
        responseDigest: sha256(canonicalJson(response)),
        rawSourceClientId,
        pseudonymousClientId: computeSwAbUpdateRuntimeClientId({
          runId: evidence.runId,
          attemptId: evidence.attemptId,
          projectName: tuple.projectName,
          rawSourceClientId
        })
      },
      observationDigest: "0".repeat(64)
    };
    observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
    return observation;
  });
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  return evidence;
}

test("checked composition policy and Schema compile with closed v13 authority", async () => {
  const policy = JSON.parse(await readFile(
    path.join(workspaceRoot,
      "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json"),
    "utf8"
  ));
  assert.equal(validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy(policy), policy);
  const validator = await loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator(
    workspaceRoot
  );
  assert.equal(validator.schema.properties.cliExitCode.const, 1);
  assert.equal(validator.schema.properties.usableForCandidateAssembly.const, false);
  assert.equal(validator.schema.$defs.FalseLedger.properties.publicDeploymentAuthorized.const, false);
});

test("tuple-key composition maps browser-major candidate proofs into phase-major runtime order", () => {
  const projection = validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections(
    baselineVerifications()
  );
  assert.deepEqual(
    projection.clientMappings.map(({ projectName, phase, slot }) => ({ projectName, phase, slot })),
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
  );
  assert.equal(projection.clientMappings[2].projectName, "chrome");
  assert.equal(projection.clientMappings[4].projectName, "msedge");
  assert.equal(projection.scope.releaseIdentity.targetSchema, 13);
  assert.equal(projection.scope.releaseIdentity.migrationId, null);
  assert.equal(projection.scope.capabilities.epoch, null);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.clientMappings[0]), true);
});

test("composition document retains chronology and stays terminally untrusted", async () => {
  const projection = validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections(
    baselineVerifications()
  );
  const document = swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly.buildDocument(
    projection,
    sourceBindingFixture()
  );
  const validator = await loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator(
    workspaceRoot
  );
  assert.equal(
    validateSwAbUpdateCandidateRuntimeClientCaptureCompositionDocument(document, validator),
    document
  );
  assert.equal(document.status, "not_admitted");
  assert.equal(document.usableForCandidateAssembly, false);
  assert.equal(document.formalReleaseEvidenceReceipt, false);
  assert.equal(document.cliExitCode, 1);
  assert.ok(Object.values(document.provenanceAndClaims).every((value) => value === false));
  assert.equal(document.mutationBoundary.intervalMutationExcluded, false);
  assert.equal(document.mutationBoundary.abaExcluded, false);
  assert.equal(document.chronologyBindings.runtimeCaptureCapturedAt, iso(31));
  assert.equal(document.chronologyBindings.candidateCapturedAt, iso(32));
  const firstIdentity =
    computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(document);
  const identityDocument = structuredClone(document);
  Object.assign(identityDocument, firstIdentity);
  assert.deepEqual(
    computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(identityDocument),
    firstIdentity
  );
});

test("projection validator rejects scope, artifact, identity, nonce, and chronology drift", () => {
  const cases = [
    ["run", /SW_AB_COMPOSITION_SCOPE_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.runId = `run-${"f".repeat(64)}`;
    }],
    ["origin", /SW_AB_COMPOSITION_SCOPE_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.canonicalHttpsOrigin =
        "https://other.hakimi.cn";
    }],
    ["artifact", /SW_AB_COMPOSITION_ARTIFACT_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.artifactBindings.B.artifactSetDigest =
        "e".repeat(64);
    }],
    ["client", /SW_AB_COMPOSITION_CLIENT_ID_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.observations[0].pseudonymousClientId =
        `client-${"f".repeat(64)}`;
    }],
    ["target", /SW_AB_COMPOSITION_TARGET_ID_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.observations[0].pseudonymousTargetId =
        `target-${"f".repeat(64)}`;
    }],
    ["nonce", /SW_AB_COMPOSITION_CHALLENGE_NONCE_MISMATCH/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.observations[0].challengeNonce =
        `challenge-${"f".repeat(64)}`;
    }],
    ["phase barrier", /SW_AB_COMPOSITION_PHASE_BARRIER_INVALID/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.observations[4].observedAt = iso(4);
    }],
    ["switch window", /SW_AB_COMPOSITION_RUNTIME_CANDIDATE_TIME_INVALID/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.observations[5].observedAt = iso(21);
    }],
    ["capture order", /SW_AB_COMPOSITION_CAPTURE_ORDER_INVALID/u, (fixture) => {
      fixture.runtimeVerification.compositionProjection.capturedAt = iso(33);
    }]
  ];
  for (const [label, pattern, mutate] of cases) {
    const fixture = cloneBaseline();
    mutate(fixture);
    assert.throws(
      () => validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections(fixture),
      pattern,
      label
    );
  }
});

test("document validator rejects sequence, source, chronology, authority, and identity tamper", async () => {
  const validator = await loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator(
    workspaceRoot
  );
  const makeDocument = () => swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly
    .buildDocument(
      validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections(
        baselineVerifications()
      ),
      sourceBindingFixture()
    );
  const cases = [
    ["sequence", /SW_AB_COMPOSITION_DOCUMENT_MAPPING_SEMANTICS_INVALID/u, (document) => {
      document.clientMappings[1].sequence = 1;
    }, true],
    ["source role", /SW_AB_COMPOSITION_DOCUMENT_BINDING_INVALID/u, (document) => {
      document.sourceBindings[1].role = document.sourceBindings[0].role;
    }, true],
    ["chronology", /SW_AB_COMPOSITION_DOCUMENT_SHARED_SWITCH_ORDER_INVALID/u, (document) => {
      document.chronologyBindings.artifactBProviderSwitchStartedAt = iso(4);
    }, true],
    ["shared maximum", /SW_AB_COMPOSITION_DOCUMENT_SHARED_PROJECTION_INVALID/u, (document) => {
      document.chronologyBindings.bothBrowsersBActivatedAndClaimedAt = iso(21);
    }, true],
    ["runtime monotonicity", /SW_AB_COMPOSITION_DOCUMENT_PHASE_BARRIER_INVALID/u, (document) => {
      document.clientMappings[6].runtimeObservedAt = iso(22);
    }, true],
    ["client continuity", /SW_AB_COMPOSITION_DOCUMENT_CONTINUITY_INVALID/u, (document) => {
      document.clientMappings[4].pseudonymousClientId = `client-${"f".repeat(64)}`;
    }, true],
    ["artifact relabel", /SW_AB_COMPOSITION_ARTIFACT_BINDING_INVALID/u, (document) => {
      document.artifactBindings.B.releaseEvidenceId =
        document.artifactBindings.A.releaseEvidenceId;
      document.artifactBindings.B.buildVersion = document.artifactBindings.A.buildVersion;
      document.artifactBindings.B.serviceWorkerSha256 =
        document.artifactBindings.A.serviceWorkerSha256;
      document.artifactBindings.B.artifactSetDigest =
        document.artifactBindings.A.artifactSetDigest;
    }, true],
    ["input alias", /SW_AB_COMPOSITION_DOCUMENT_INPUT_ALIAS/u, (document) => {
      document.inputBindings.runtimeCapture.path = document.inputBindings.candidate.path;
      document.inputBindings.runtimeCapture.size = document.inputBindings.candidate.size;
      document.inputBindings.runtimeCapture.sha256 = document.inputBindings.candidate.sha256;
    }, true],
    ["browser runtime window", /SW_AB_COMPOSITION_DOCUMENT_RUNTIME_WINDOW_INVALID/u, (document) => {
      document.chronologyBindings.browserReceipts[0].oneADocumentReloadedToBAt = iso(17);
    }, true],
    ["browser activation before provider switch", /SW_AB_COMPOSITION_DOCUMENT_RUNTIME_WINDOW_INVALID/u, (document) => {
      document.chronologyBindings.browserReceipts[0]
        .artifactBActivationAndClaimObservedAt = iso(8);
    }, true],
    ["browser reload before both activations", /SW_AB_COMPOSITION_DOCUMENT_RUNTIME_WINDOW_INVALID/u, (document) => {
      document.chronologyBindings.browserReceipts[0].oneADocumentReloadedToBAt = iso(19);
    }, true],
    ["browser stale rejection before peer reload", /SW_AB_COMPOSITION_DOCUMENT_CROSS_BROWSER_BARRIER_INVALID/u, (document) => {
      document.chronologyBindings.browserReceipts[0]
        .staleAProductionWriteRejectedAt = iso(24);
    }, true],
    ["browser receipt before shared stale rejection", /SW_AB_COMPOSITION_DOCUMENT_RUNTIME_WINDOW_INVALID/u, (document) => {
      document.chronologyBindings.browserReceipts[0].capturedAt = iso(26);
    }, true],
    ["noncanonical timestamp", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.chronologyBindings.runtimeCaptureCapturedAt = "2026-08-27T00:00:31Z";
    }, true],
    ["uppercase origin", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.scope.canonicalHttpsOrigin = "https://PWA.HAKIMI.CN";
    }, true],
    ["reserved origin", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.scope.canonicalHttpsOrigin = "https://pwa.example";
    }, true],
    ["trailing path separator", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.inputBindings.candidate.path = "tmp/sw-ab-composition/candidate/";
    }, true],
    ["oversize source", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.sourceBindings[0].size = 8 * 1024 * 1024 + 1;
    }, true],
    ["oversize source set", /SW_AB_COMPOSITION_DOCUMENT_BINDING_INVALID/u, (document) => {
      for (const binding of document.sourceBindings) binding.size = 6 * 1024 * 1024;
    }, true],
    ["Windows path", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.sourceBindings[0].path = "..\\outside.json";
    }, true],
    ["authority", /SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u, (document) => {
      document.provenanceAndClaims.publicDeploymentAuthorized = true;
    }, true],
    ["digest", /SW_AB_COMPOSITION_IDENTITY_INVALID/u, (document) => {
      document.compositionDigest = "f".repeat(64);
    }, false]
  ];
  for (const [label, pattern, mutate, rebind] of cases) {
    const document = structuredClone(makeDocument());
    mutate(document);
    if (rebind) {
      document.sourceSetDigest = sha256(canonicalJson(document.sourceBindings));
      for (const mapping of document.clientMappings) {
        mapping.mappingDigest =
          swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly.mappingIdentity(mapping);
      }
      rebindDocumentIdentity(document);
    }
    assert.throws(
      () => validateSwAbUpdateCandidateRuntimeClientCaptureCompositionDocument(
        document,
        validator
      ),
      pattern,
      label
    );
  }
});

test("composition input rejects escape, alias, noncanonical, and extra bindings", () => {
  const root = path.join(workspaceRoot, "tmp", "sw-ab-composition-input");
  const input = {
    bindingRoot: root,
    candidateInputPath: path.join(root, "candidate-private", "candidate.json"),
    attachmentsRoot: path.join(root, "attachments"),
    privateRoot: path.join(root, "candidate-private"),
    artifactARoot: path.join(root, "artifact-a"),
    artifactBRoot: path.join(root, "artifact-b"),
    runtimeCaptureInputPath: path.join(root, "runtime", "capture.json")
  };
  assert.deepEqual(
    parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput(input),
    input
  );
  assert.throws(
    () => parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput({
      ...input,
      surprise: "x"
    }),
    /SW_AB_COMPOSITION_INPUT_INVALID/u
  );
  assert.throws(
    () => parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput({
      ...input,
      candidateInputPath: path.join(root, "..", "outside.json")
    }),
    /SW_AB_COMPOSITION_PATH_INVALID|SW_AB_COMPOSITION_PATH_OUTSIDE_ROOT/u
  );
  assert.throws(
    () => parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput({
      ...input,
      runtimeCaptureInputPath: input.candidateInputPath
    }),
    /SW_AB_COMPOSITION_INPUT_ALIAS/u
  );
});

test("synthetic fixtures traverse real disk compose and CLI but remain not admitted", async (t) => {
  const fixture = await createCandidateDiskFixture(t);

  const candidateEvidence = await rebindCandidateRuntimeIdentities(fixture);
  const runtimeDirectory = path.join(fixture.fixtureRoot, "runtime");
  await mkdir(runtimeDirectory, { recursive: true });
  const runtimeCaptureInputPath = path.join(runtimeDirectory, "capture.json");
  const runtimeEvidence = buildRuntimeDiskEvidence(candidateEvidence);
  await writePrettyJson(runtimeCaptureInputPath, runtimeEvidence);
  const input = {
    bindingRoot: workspaceRoot,
    candidateInputPath: path.resolve(fixture.inputPath),
    attachmentsRoot: path.resolve(fixture.attachmentsRoot),
    privateRoot: path.resolve(fixture.privateRoot),
    artifactARoot: path.resolve(fixture.artifactARoot),
    artifactBRoot: path.resolve(fixture.artifactBRoot),
    runtimeCaptureInputPath: path.resolve(runtimeCaptureInputPath)
  };

  const document = await composeSwAbUpdateCandidateRuntimeClientCapture(input, {
    cwd: workspaceRoot
  });
  assert.equal(document.recordType,
    "sw_ab_update_candidate_runtime_client_capture_composition_v1");
  assert.equal(document.status, "not_admitted");
  assert.equal(document.executionAdmission, "closed_missing_https_origin");
  assert.equal(document.usableForCandidateAssembly, false);
  assert.equal(document.usableForAdmission, false);
  assert.equal(document.formalReleaseEvidenceReceipt, false);
  assert.equal(document.cliExitCode, 1);
  assert.equal(document.clientMappings.length, 8);
  assert.equal(document.sourceBindings.length, 6);
  assert.equal(document.inputBindings.candidate.evidenceDigest, candidateEvidence.evidenceDigest);
  assert.equal(document.inputBindings.runtimeCapture.evidenceDigest, runtimeEvidence.evidenceDigest);
  assert.notEqual(
    document.inputBindings.candidate.sha256,
    document.inputBindings.candidate.evidenceDigest
  );
  assert.notEqual(
    document.inputBindings.runtimeCapture.sha256,
    document.inputBindings.runtimeCapture.evidenceDigest
  );
  assert.equal(document.mutationBoundary.intervalMutationExcluded, false);
  assert.equal(document.mutationBoundary.abaExcluded, false);
  assert.equal(document.provenanceAndClaims.publicDeploymentAuthorized, false);
  assert.equal(document.provenanceAndClaims.expertClaimsAuthorized, false);

  const outcome = spawnSync(process.execPath, [
    path.join(
      workspaceRoot,
      "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
    ),
    "--binding-root",
    input.bindingRoot,
    "--candidate-input",
    input.candidateInputPath,
    "--attachments-root",
    input.attachmentsRoot,
    "--private-root",
    input.privateRoot,
    "--artifact-a-root",
    input.artifactARoot,
    "--artifact-b-root",
    input.artifactBRoot,
    "--runtime-capture-input",
    input.runtimeCaptureInputPath
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stderr, "");
  const cliDocument = JSON.parse(outcome.stdout);
  assert.equal(cliDocument.recordType,
    "sw_ab_update_candidate_runtime_client_capture_composition_v1");
  assert.equal(cliDocument.compositionId, document.compositionId);
  assert.equal(cliDocument.compositionDigest, document.compositionDigest);
  assert.equal(cliDocument.status, "not_admitted");
  assert.equal(cliDocument.usableForCandidateAssembly, false);
  assert.equal(cliDocument.publicDeploymentAuthorized, undefined);
  assert.equal(cliDocument.provenanceAndClaims.publicDeploymentAuthorized, false);
});

test("composition CLI rejects incomplete arguments and always exits 1", () => {
  const outcome = spawnSync(process.execPath, [
    path.join(
      workspaceRoot,
      "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
    ),
    "--binding-root",
    workspaceRoot
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stderr, "");
  const failure = JSON.parse(outcome.stdout);
  assert.equal(failure.status, "not_admitted");
  assert.equal(failure.usableForCandidateAssembly, false);
  assert.equal(failure.publicDeploymentAuthorized, false);
  assert.equal(failure.cliExitCode, 1);
});
