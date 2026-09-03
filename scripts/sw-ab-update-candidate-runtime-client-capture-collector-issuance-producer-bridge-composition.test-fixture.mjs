import { readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY
} from "./sw-ab-update-candidate-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs";

export const producerBridgeCompositionFixtureWorkspaceRoot = path.resolve(import.meta.dirname, "..");
export const producerBridgeCompositionFixtureRunId = `run-${"1".repeat(64)}`;
export const producerBridgeCompositionFixtureAttemptId = `attempt-${"2".repeat(64)}`;
export const producerBridgeCompositionFixtureEvidenceDigest = sha256("producer-bridge-v2-runtime");

function iso(index) {
  return `2026-08-28T01:00:${String(index).padStart(2, "0")}.000Z`;
}

function relativePath(filePath) {
  return path.relative(producerBridgeCompositionFixtureWorkspaceRoot, filePath).split(path.sep).join("/");
}

function identity(label, logicalPath = label) {
  return {
    realPath: `c:/producer-bridge-v2-fixture/${logicalPath}`.toLowerCase(),
    dev: "91",
    ino: String(Number.parseInt(sha256(label).slice(0, 12), 16)),
    birthtimeNs: String(Number.parseInt(sha256(`birth-${label}`).slice(0, 12), 16)),
    size: "1",
    mtimeNs: "2",
    ctimeNs: "3",
    nlink: "1"
  };
}

function noOpHandle() {
  return { close: async () => undefined };
}

function bindingFor(filePath, bytes) {
  return {
    path: relativePath(filePath),
    size: bytes.length,
    sha256: sha256(bytes)
  };
}

function artifactBindings() {
  return {
    A: {
      label: "A",
      releaseEvidenceId: `hre1-${"a".repeat(32)}`,
      buildVersion: "a".repeat(12),
      serviceWorkerSha256: "b".repeat(64),
      artifactSetDigest: "c".repeat(64)
    },
    B: {
      label: "B",
      releaseEvidenceId: `hre1-${"d".repeat(32)}`,
      buildVersion: "e".repeat(12),
      serviceWorkerSha256: "f".repeat(64),
      artifactSetDigest: "1".repeat(64)
    }
  };
}

function tupleRows() {
  return SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.map((tuple, index) => ({
    ...tuple,
    sequence: index + 1,
    observedAt: iso(index + 1),
    pseudonymousClientId: `client-${sha256(`${tuple.projectName}-${tuple.phase}-${tuple.slot}-client`)}`,
    pseudonymousTargetId: `target-${sha256(`${tuple.projectName}-${tuple.slot}-target`)}`,
    challengeNonce: `challenge-${sha256(`${tuple.projectName}-${tuple.phase}-${tuple.slot}-challenge`)}`,
    runtimeRequestDigest: sha256(`${index}-request`),
    runtimeResponseDigest: sha256(`${index}-response`),
    runtimeObservationDigest: sha256(`${index}-observation`)
  }));
}

function clientMappings(rows) {
  return rows.map((row) => ({
    sequence: row.sequence,
    projectName: row.projectName,
    phase: row.phase,
    slot: row.slot,
    artifactLabel: row.phase === "initial-a" ? "A" : "B",
    documentTag: row.phase === "initial-a" || row.slot === "retained-old-a" ? "A" : "B",
    controllerTag: row.phase === "initial-a" ? "A" : "B",
    controllerChangeCount: row.phase === "initial-a" ? 0 : 1,
    pseudonymousClientId: row.pseudonymousClientId,
    pseudonymousTargetId: row.pseudonymousTargetId,
    challengeNonce: row.challengeNonce,
    candidateChallengeResponseDigest: sha256(`${row.sequence}-candidate-response`),
    runtimeRequestDigest: row.runtimeRequestDigest,
    runtimeResponseDigest: row.runtimeResponseDigest,
    runtimeObservationDigest: row.runtimeObservationDigest,
    runtimeObservedAt: row.observedAt,
    mappingDigest: sha256(`${row.sequence}-mapping`)
  }));
}

function chronology() {
  return {
    edgeTwoAClientsReadyAt: iso(9),
    chromeTwoAClientsReadyAt: iso(10),
    artifactBProviderSwitchStartedAt: iso(11),
    bothBrowsersBActivatedAndClaimedAt: iso(12),
    bothOldAWritesRejectedAt: iso(13),
    browserReceipts: ["msedge", "chrome"].map((projectName, index) => ({
      projectName,
      capturedAt: iso(20 + index),
      twoArtifactAClientsControlledAt: iso(9 + index),
      artifactBActivationAndClaimObservedAt: iso(12),
      oneADocumentReloadedToBAt: iso(14 + index),
      staleAProductionWriteRejectedAt: iso(18 + index)
    })),
    runtimeCaptureCapturedAt: iso(22),
    candidateCapturedAt: iso(23)
  };
}

export async function loadCheckedProducerBridgeCompositionSources() {
  return Promise.all(SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.map(async (spec, index) => {
    const bytes = await readFile(path.join(
      producerBridgeCompositionFixtureWorkspaceRoot,
      ...spec.path.split("/")
    ));
    const value = JSON.parse(bytes.toString("utf8"));
    const binding = {
      path: spec.path,
      size: bytes.length,
      sha256: sha256(bytes)
    };
    return {
      spec,
      bytes,
      value,
      binding,
      canonicalSha256: sha256(canonicalJson(value)),
      identity: identity(`source-${index}`, spec.path),
      handle: noOpHandle()
    };
  }));
}

export function projectCheckedSourceBindings(sourceHeld) {
  return sourceHeld.map(({ spec, binding, canonicalSha256 }) => ({
    role: spec.role,
    path: binding.path,
    size: binding.size,
    rawSha256: binding.sha256,
    canonicalSha256
  }));
}

function nestedSources(outer, paths, roles = paths) {
  const byPath = new Map(outer.map((entry) => [entry.path, entry]));
  return paths.map((sourcePath, index) => {
    const source = byPath.get(sourcePath);
    if (!source) throw new Error(`fixture source missing: ${sourcePath}`);
    return {
      role: roles[index],
      path: source.path,
      size: source.size,
      rawSha256: source.rawSha256,
      canonicalSha256: source.canonicalSha256
    };
  });
}

function physicalLayout(outerSourceBindings, identitiesByPath) {
  const tupleBindings = Array.from({ length: 8 }, (_, index) => ({
    path: `${String(index + 1).padStart(2, "0")}-decoded-api-object.json`,
    size: 100 + index,
    sha256: sha256(`tuple-file-${index}`)
  }));
  const manifestBinding = {
    path: "bundle-manifest.json",
    size: 250,
    sha256: sha256("manifest-file")
  };
  const transcriptIdentities = [
    ...tupleBindings.map((binding, index) => identity(`tuple-${index}`, binding.path)),
    identity("manifest", manifestBinding.path)
  ];
  const markerBinding = { path: "00-attempt-marker.json", size: 120, sha256: sha256("marker") };
  const receiptBinding = { path: "99-collector-issuance-receipt.json", size: 220, sha256: sha256("receipt") };
  const markerIdentity = identity("marker", markerBinding.path);
  const receiptIdentity = identity("receipt", receiptBinding.path);
  const sourcesFor = (paths) => paths.map((sourcePath) => identitiesByPath.get(sourcePath));
  const transcriptSourcePaths = [
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[8].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[9].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[6].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[7].path
  ];
  const issuanceSourcePaths = [
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[10].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[11].path,
    ...transcriptSourcePaths
  ];
  return {
    tupleBindings,
    manifestBinding,
    markerBinding,
    receiptBinding,
    transcriptEndpoint: {
      manifest: transcriptIdentities[8],
      tuples: transcriptIdentities.slice(0, 8),
      sources: sourcesFor(transcriptSourcePaths)
    },
    issuanceEndpoint: {
      marker: markerIdentity,
      receipt: receiptIdentity,
      transcript: transcriptIdentities,
      sources: sourcesFor(issuanceSourcePaths)
    },
    outerSourceBindings
  };
}

export function makeProducerBridgeCompositionFixture({ sourceHeld, schemaValidator }) {
  const outerSourceBindings = projectCheckedSourceBindings(sourceHeld);
  const identitiesByPath = new Map(sourceHeld.map(({ binding, identity: value }) => [binding.path, value]));
  const root = path.join(
    producerBridgeCompositionFixtureWorkspaceRoot,
    "tmp",
    "sw-ab-producer-bridge-composition-v2-synthetic"
  );
  const input = {
    bindingRoot: producerBridgeCompositionFixtureWorkspaceRoot,
    candidateInputPath: path.join(root, "private", "candidate.json"),
    attachmentsRoot: path.join(root, "attachments"),
    privateRoot: path.join(root, "private"),
    artifactARoot: path.join(root, "artifact-a"),
    artifactBRoot: path.join(root, "artifact-b"),
    issuanceRunRoot: path.join(root, "issuance"),
    bridgeRoot: path.join(root, "bridge")
  };
  const runtimePath = path.join(
    input.bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE
  );
  const publicationPath = path.join(
    input.bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
  );
  const rows = tupleRows();
  const mappings = clientMappings(rows);
  const artifacts = artifactBindings();
  const scope = {
    runId: producerBridgeCompositionFixtureRunId,
    attemptId: producerBridgeCompositionFixtureAttemptId,
    canonicalHttpsOrigin: "https://pwa.hakimi.cn",
    releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_CANDIDATE_CAPABILITIES),
    browserProjects: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS),
    phases: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES),
    slots: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
  };
  const derivedProjection = {
    projectionType: "sw_ab_update_runtime_client_capture_composition_projection_v1",
    runId: scope.runId,
    attemptId: scope.attemptId,
    canonicalHttpsOrigin: scope.canonicalHttpsOrigin,
    releaseIdentity: structuredClone(scope.releaseIdentity),
    capabilities: structuredClone(scope.capabilities),
    artifactBindings: structuredClone(artifacts),
    observations: structuredClone(rows),
    capturedAt: iso(22),
    evidenceDigest: producerBridgeCompositionFixtureEvidenceDigest
  };
  const runtimeEvidence = {
    schemaVersion: 1,
    runId: scope.runId,
    attemptId: scope.attemptId,
    origin: scope.canonicalHttpsOrigin,
    releaseIdentity: structuredClone(scope.releaseIdentity),
    capabilities: structuredClone(scope.capabilities),
    artifactBindings: structuredClone(artifacts),
    observations: structuredClone(rows),
    capturedAt: iso(22),
    evidenceDigest: producerBridgeCompositionFixtureEvidenceDigest
  };
  const candidateBytes = Buffer.from("{\"syntheticCandidate\":true}\n", "utf8");
  const runtimeBytes = Buffer.from(`${canonicalJson(runtimeEvidence)}\n`, "utf8");
  const candidateBinding = bindingFor(input.candidateInputPath, candidateBytes);
  const runtimeBinding = bindingFor(runtimePath, runtimeBytes);
  const candidateIdentity = identity("candidate", candidateBinding.path);
  const runtimeIdentity = identity("bridge-evidence", runtimeBinding.path);
  const physical = physicalLayout(outerSourceBindings, identitiesByPath);

  const oldSources = nestedSources(
    outerSourceBindings,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.slice(2, 8).map(({ path: sourcePath }) => sourcePath),
    [
      "composition-policy", "composition-schema", "sw-ab-update-policy",
      "sw-ab-update-schema", "runtime-client-capture-policy", "runtime-client-capture-schema"
    ]
  ).map(({ rawSha256, ...entry }) => ({ ...entry, sha256: rawSha256 }));
  const transcriptSourcePaths = [
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[8].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[9].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[6].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[7].path
  ];
  const transcriptSources = nestedSources(
    outerSourceBindings,
    transcriptSourcePaths,
    ["api-transcript-policy", "api-transcript-schema", "runtime-capture-policy", "runtime-capture-schema"]
  );
  const issuanceSourcePaths = [
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[10].path,
    SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[11].path,
    ...transcriptSourcePaths
  ];
  const issuanceSources = nestedSources(
    outerSourceBindings,
    issuanceSourcePaths,
    [
      "collector-issuance-policy", "collector-issuance-schema", "api-transcript-policy",
      "api-transcript-schema", "runtime-capture-policy", "runtime-capture-schema"
    ]
  );
  const bridgeSources = nestedSources(
    outerSourceBindings,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.map(({ path: sourcePath }) => sourcePath),
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.map(({ role }) => role)
  );

  const transcriptLoaded = {
    result: {
      code: "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_NOT_ADMITTED",
      status: "capture_incomplete",
      terminalEndpointSnapshotsMatched: true,
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      bundleId: `swabapi1-${"3".repeat(32)}`,
      bundleDigest: sha256("bundle"),
      derivedEvidenceDigest: producerBridgeCompositionFixtureEvidenceDigest,
      derivedProjection,
      cliExitCode: 1
    },
    manifestBinding: physical.manifestBinding,
    tupleBindings: physical.tupleBindings,
    sourceBindings: transcriptSources,
    endpointFingerprint: physical.transcriptEndpoint
  };
  const issuanceLoaded = {
    result: {
      code: "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_NOT_ADMITTED",
      status: "issuance_incomplete",
      transcriptBundleBindingVerified: true,
      terminalEndpointSnapshotsMatched: true,
      overlappingHeldFileEpochEstablished: true,
      continuousMutationEpochVerified: false,
      samePermissionMutationExcluded: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochCapability: "absent_schema13",
      epoch: null,
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      runId: scope.runId,
      attemptId: scope.attemptId,
      issuanceId: `swabci1-${"4".repeat(32)}`,
      receiptDigest: sha256("receipt"),
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: producerBridgeCompositionFixtureEvidenceDigest,
      releaseIdentity: structuredClone(scope.releaseIdentity),
      capabilities: structuredClone(scope.capabilities),
      cliExitCode: 1
    },
    markerBinding: physical.markerBinding,
    receiptBinding: physical.receiptBinding,
    transcriptBundleBinding: {
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: producerBridgeCompositionFixtureEvidenceDigest
    },
    sourceBindings: issuanceSources,
    endpointFingerprint: physical.issuanceEndpoint
  };
  const derivedEvidenceBinding = {
    path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
    size: runtimeBytes.length,
    rawSha256: sha256(runtimeBytes),
    canonicalSha256: sha256(canonicalJson(runtimeEvidence)),
    semanticDigest: producerBridgeCompositionFixtureEvidenceDigest
  };
  const publication = {
    bridgeId: `swabpb1-${"5".repeat(32)}`,
    publicationDigest: sha256("bridge-publication"),
    sourceSetDigest: sha256(canonicalJson(bridgeSources))
  };
  const publicationBytes = Buffer.from(`${canonicalJson(publication)}\n`, "utf8");
  const publicationBinding = bindingFor(publicationPath, publicationBytes);
  const publicationIdentity = identity("bridge-publication", publicationBinding.path);
  const terminalGateIdentity = identity(
    "bridge-terminal-gate",
    `${path.dirname(publicationBinding.path)}/100-producer-bridge-publication-commit.sha256`
  );
  const bridgeLoaded = {
    result: {
      code: "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED",
      producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
      status: "bridge_candidate_not_admitted",
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      runId: scope.runId,
      attemptId: scope.attemptId,
      issuanceId: issuanceLoaded.result.issuanceId,
      receiptDigest: issuanceLoaded.result.receiptDigest,
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: producerBridgeCompositionFixtureEvidenceDigest,
      bridgeId: publication.bridgeId,
      publicationDigest: publication.publicationDigest,
      releaseIdentity: structuredClone(scope.releaseIdentity),
      capabilities: structuredClone(scope.capabilities),
      derivedProjection: structuredClone(derivedProjection),
      cliExitCode: 1
    },
    publication,
    derivedEvidenceBinding,
    sourceBindings: bridgeSources,
    endpointFingerprint: {
      outputs: [runtimeIdentity, publicationIdentity],
      terminalGate: terminalGateIdentity,
      bridgeSources: [
        identitiesByPath.get(SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[12].path),
        identitiesByPath.get(SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[13].path)
      ],
      issuance: structuredClone(physical.issuanceEndpoint)
    }
  };
  const oldComposition = {
    schemaVersion: 1,
    recordType: "sw_ab_update_candidate_runtime_client_capture_composition_v1",
    trustClass: "untrusted_candidate_composition",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1,
    compositionId: `swabrc1-${"6".repeat(32)}`,
    compositionDigest: sha256("old-composition"),
    sourceSetDigest: sha256(canonicalJson(oldSources)),
    scope,
    artifactBindings: structuredClone(artifacts),
    inputBindings: {
      candidate: {
        ...candidateBinding,
        evidenceDigest: sha256("candidate-evidence"),
        capturedAt: iso(23)
      },
      runtimeCapture: {
        ...runtimeBinding,
        evidenceDigest: producerBridgeCompositionFixtureEvidenceDigest,
        capturedAt: iso(22)
      }
    },
    clientMappings: mappings,
    chronologyBindings: chronology(),
    sourceBindings: oldSources
  };
  const held = {
    candidate: {
      binding: candidateBinding,
      identity: candidateIdentity,
      bytes: candidateBytes,
      handle: noOpHandle()
    },
    runtime: {
      binding: runtimeBinding,
      identity: runtimeIdentity,
      bytes: runtimeBytes,
      handle: noOpHandle()
    },
    publication: {
      binding: publicationBinding,
      identity: publicationIdentity,
      bytes: publicationBytes,
      handle: noOpHandle()
    },
    sources: sourceHeld
  };
  return {
    input,
    runtimePath,
    publicationPath,
    schemaValidator,
    sourceHeld,
    outerSourceBindings,
    runtimeEvidence,
    publication,
    oldComposition,
    transcriptLoaded,
    issuanceLoaded,
    bridgeLoaded,
    held
  };
}

export function makeProducerBridgeCompositionDependencies(fixture) {
  const state = {
    checkpointCalls: 0,
    stableChecks: [],
    branchCalls: [],
    replacedPaths: new Set()
  };
  const heldByPath = new Map([
    [path.resolve(fixture.input.candidateInputPath), fixture.held.candidate],
    [path.resolve(fixture.runtimePath), fixture.held.runtime],
    [path.resolve(fixture.publicationPath), fixture.held.publication]
  ]);
  const dependencies = {
    holdSources: async () => ({
      held: fixture.held.sources,
      schemaValidator: fixture.schemaValidator
    }),
    holdFile: async ({ filePath }) => {
      const found = heldByPath.get(path.resolve(filePath));
      if (!found) throw new Error(`unexpected held path: ${filePath}`);
      return found;
    },
    assertHeldStable: async (heldFile) => {
      state.stableChecks.push(heldFile.binding.path);
      if (state.replacedPaths.has(heldFile.binding.path)) {
        throw new Error("SW_AB_PRODUCER_BRIDGE_COMPOSITION_HELD_FILE_CHANGED: synthetic path replacement");
      }
    },
    composeOld: async () => {
      state.branchCalls.push("old");
      return structuredClone(fixture.oldComposition);
    },
    loadTranscript: async () => {
      state.branchCalls.push("transcript");
      return structuredClone(fixture.transcriptLoaded);
    },
    loadBridge: async () => {
      state.branchCalls.push("bridge");
      return structuredClone(fixture.bridgeLoaded);
    },
    loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
      state.checkpointCalls += 1;
      await onHeldEpochCheckpoint({
        phase: "after_initial_validation_before_terminal_reread",
        runRoot
      });
      return structuredClone(fixture.issuanceLoaded);
    }
  };
  return { dependencies, state };
}
