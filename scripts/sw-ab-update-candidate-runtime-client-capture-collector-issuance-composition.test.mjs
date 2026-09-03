import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  assertSwAbFourChainPhysicalSeparation,
  buildSwAbFourChainCompositionFailure,
  composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuance,
  swAbFourChainCompositionTestOnly,
  validateSwAbFourChainCompositionBindings,
  validateSwAbFourChainCompositionDocument,
  validateSwAbFourChainCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY
} from "./sw-ab-update-candidate-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const runId = `run-${"1".repeat(64)}`;
const attemptId = `attempt-${"2".repeat(64)}`;
const runtimeEvidenceDigest = sha256("runtime-evidence");

function iso(index) {
  return `2026-08-28T00:00:${String(index).padStart(2, "0")}.000Z`;
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

async function checkedSources() {
  return Promise.all(swAbFourChainCompositionTestOnly.sourceSpecs.map(async (spec) => {
    const bytes = await readFile(path.join(workspaceRoot, ...spec.path.split("/")));
    const value = JSON.parse(bytes.toString("utf8"));
    return {
      ...spec,
      size: bytes.length,
      rawSha256: sha256(bytes),
      canonicalSha256: sha256(canonicalJson(value))
    };
  }));
}

function nestedSources(outer, indexes, roles) {
  return indexes.map((index, roleIndex) => ({
    role: roles[roleIndex],
    path: outer[index].path,
    size: outer[index].size,
    rawSha256: outer[index].rawSha256,
    canonicalSha256: outer[index].canonicalSha256
  }));
}

function baseline({ candidateBinding, runtimeBinding, sources, physical }) {
  const rows = tupleRows();
  const mappings = clientMappings(rows);
  const oldSourceBindings = nestedSources(
    sources,
    [2, 3, 4, 5, 6, 7],
    [
      "composition-policy", "composition-schema", "sw-ab-update-policy",
      "sw-ab-update-schema", "runtime-client-capture-policy",
      "runtime-client-capture-schema"
    ]
  ).map(({ rawSha256, ...binding }) => ({ ...binding, sha256: rawSha256 }));
  const transcriptSources = nestedSources(
    sources,
    [8, 9, 6, 7],
    ["api-transcript-policy", "api-transcript-schema", "runtime-capture-policy", "runtime-capture-schema"]
  );
  const issuanceSources = nestedSources(
    sources,
    [10, 11, 8, 9, 6, 7],
    [
      "collector-issuance-policy", "collector-issuance-schema", "api-transcript-policy",
      "api-transcript-schema", "runtime-capture-policy", "runtime-capture-schema"
    ]
  );
  const scope = {
    runId,
    attemptId,
    canonicalHttpsOrigin: "https://pwa.hakimi.cn",
    releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_CANDIDATE_CAPABILITIES),
    browserProjects: ["msedge", "chrome"],
    phases: ["initial-a", "post-claim"],
    slots: ["retained-old-a", "reload-to-b"]
  };
  const tupleBindings = physical.tupleBindings;
  const transcriptLoaded = {
    result: {
      code: "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_NOT_ADMITTED",
      status: "capture_incomplete",
      executionAdmission: "closed_missing_selected_https_origin",
      decodedApiObjectProjectionDerivationVerified: true,
      terminalEndpointSnapshotsMatched: true,
      overlappingFileHandleEpochEstablished: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochCapability: "absent_schema13",
      epoch: null,
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false,
      verifierNetworkAttempted: false,
      verifierBrowserAttempted: false,
      verifierDeploymentAttempted: false,
      bundleId: `swabapi1-${"3".repeat(32)}`,
      bundleDigest: sha256("bundle"),
      tupleCount: 8,
      sourceBindingCount: 4,
      derivedEvidenceDigest: runtimeEvidenceDigest,
      derivedProjection: {
        projectionType: "sw_ab_update_runtime_client_capture_composition_projection_v1",
        runId,
        attemptId,
        canonicalHttpsOrigin: scope.canonicalHttpsOrigin,
        releaseIdentity: structuredClone(scope.releaseIdentity),
        capabilities: structuredClone(scope.capabilities),
        artifactBindings: artifactBindings(),
        observations: rows,
        capturedAt: iso(22),
        evidenceDigest: runtimeEvidenceDigest
      },
      cliExitCode: 1
    },
    manifestBinding: physical.manifestBinding,
    tupleBindings,
    sourceBindings: transcriptSources,
    endpointFingerprint: {
      manifest: physical.transcriptIdentities[8],
      tuples: physical.transcriptIdentities.slice(0, 8),
      sources: [8, 9, 6, 7].map((index) => physical.sourceIdentities[index])
    }
  };
  const issuanceLoaded = {
    result: {
      code: "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_NOT_ADMITTED",
      trustClass: "untrusted_ephemeral_self_signed_collector_issuance_candidate",
      status: "issuance_incomplete",
      executionAdmission: "closed_missing_selected_https_origin",
      ephemeralSelfSignatureChainVerified: true,
      collectorIssuanceProjectionVerified: true,
      phaseMajorIssuanceChainVerified: true,
      transcriptBundleBindingVerified: true,
      terminalEndpointSnapshotsMatched: true,
      overlappingHeldFileEpochEstablished: true,
      attemptMarkerHandleHeldAcrossIssuance: false,
      continuousMutationEpochVerified: false,
      samePermissionMutationExcluded: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochCapability: "absent_schema13",
      epoch: null,
      releaseIdentity: structuredClone(scope.releaseIdentity),
      capabilities: structuredClone(scope.capabilities),
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false,
      runId,
      attemptId,
      issuanceId: `swabci1-${"4".repeat(32)}`,
      receiptDigest: sha256("receipt"),
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: runtimeEvidenceDigest,
      tupleCount: 8,
      verifierNetworkAttempted: false,
      verifierBrowserAttempted: false,
      verifierDeploymentAttempted: false,
      cliExitCode: 1
    },
    markerBinding: physical.markerBinding,
    receiptBinding: physical.receiptBinding,
    transcriptBundleBinding: {
      relativeDirectory: "api-transcript",
      manifestPath: `api-transcript/${physical.manifestBinding.path}`,
      manifestSize: physical.manifestBinding.size,
      manifestSha256: physical.manifestBinding.sha256,
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: runtimeEvidenceDigest,
      sourceSetDigest: sha256("transcript-sources"),
      tupleFileCount: 8,
      tupleBindings: tupleBindings.map((binding, index) => ({
        sequence: index + 1,
        ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index],
        ...binding,
        recordDigest: sha256(`${index}-record`)
      }))
    },
    sourceBindings: issuanceSources,
    endpointFingerprint: {
      marker: physical.markerIdentity,
      receipt: physical.receiptIdentity,
      transcript: physical.transcriptIdentities,
      sources: [10, 11, 8, 9, 6, 7].map((index) => physical.sourceIdentities[index])
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
    compositionId: `swabrc1-${"5".repeat(32)}`,
    compositionDigest: sha256("old-composition"),
    scope,
    artifactBindings: artifactBindings(),
    inputBindings: {
      candidate: { ...candidateBinding, evidenceDigest: sha256("candidate-evidence"), capturedAt: iso(23) },
      runtimeCapture: { ...runtimeBinding, evidenceDigest: runtimeEvidenceDigest, capturedAt: iso(22) }
    },
    clientMappings: mappings,
    chronologyBindings: chronology(),
    sourceBindings: oldSourceBindings,
    sourceSetDigest: sha256(canonicalJson(oldSourceBindings))
  };
  return { oldComposition, transcriptLoaded, issuanceLoaded };
}

function dummyPhysical(sources) {
  const identity = (label) => ({
    realPath: `c:/fixture/${label}`,
    dev: "1",
    ino: String(Number.parseInt(sha256(label).slice(0, 8), 16)),
    birthtimeNs: "1",
    size: "1",
    mtimeNs: "1",
    ctimeNs: "1",
    nlink: "1"
  });
  const tupleBindings = Array.from({ length: 8 }, (_, index) => ({
    path: `${String(index + 1).padStart(2, "0")}-tuple.json`,
    size: 10 + index,
    sha256: sha256(`${index}-tuple-file`)
  }));
  return {
    markerBinding: { path: "00-marker.json", size: 10, sha256: sha256("marker-file") },
    receiptBinding: { path: "99-receipt.json", size: 10, sha256: sha256("receipt-file") },
    manifestBinding: { path: "bundle-manifest.json", size: 10, sha256: sha256("manifest-file") },
    tupleBindings,
    markerIdentity: identity("marker"),
    receiptIdentity: identity("receipt"),
    transcriptIdentities: [...tupleBindings.map((_, index) => identity(`tuple-${index}`)), identity("manifest")],
    sourceIdentities: sources.map((_, index) => identity(`source-${index}`))
  };
}

function held(binding, label) {
  return {
    binding,
    identity: {
      realPath: `c:/fixture/${label}`,
      dev: "2",
      ino: label === "candidate" ? "1" : "2",
      birthtimeNs: "2",
      size: String(binding.size),
      mtimeNs: "2",
      ctimeNs: "2",
      nlink: "1"
    }
  };
}

async function fileIdentity(filePath) {
  const stat = await lstat(filePath, { bigint: true });
  const physical = await realpath(filePath);
  return {
    realPath: process.platform === "win32" ? physical.toLowerCase() : physical,
    dev: String(stat.dev), ino: String(stat.ino), birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size), mtimeNs: String(stat.mtimeNs), ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
  };
}

async function diskSetup(t) {
  const parent = path.join(workspaceRoot, "tmp");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "sw-ab-four-chain-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const privateRoot = path.join(root, "private");
  const attachmentsRoot = path.join(root, "attachments");
  const artifactARoot = path.join(root, "artifact-a");
  const artifactBRoot = path.join(root, "artifact-b");
  await Promise.all([privateRoot, attachmentsRoot, artifactARoot, artifactBRoot]
    .map((directory) => mkdir(directory, { recursive: true })));
  const candidateInputPath = path.join(privateRoot, "candidate.json");
  const runtimeCaptureInputPath = path.join(root, "runtime.json");
  const candidateBytes = Buffer.from("{\"candidate\":true}\n");
  const runtimeBytes = Buffer.from("{\"runtime\":true}\n");
  await Promise.all([
    writeFile(candidateInputPath, candidateBytes),
    writeFile(runtimeCaptureInputPath, runtimeBytes)
  ]);
  const endpointRoot = path.join(root, "endpoint-files");
  await mkdir(endpointRoot);
  const names = [
    "00-marker.json",
    ...Array.from({ length: 8 }, (_, index) => `${String(index + 1).padStart(2, "0")}-tuple.json`),
    "bundle-manifest.json",
    "99-receipt.json"
  ];
  await Promise.all(names.map((name, index) =>
    writeFile(path.join(endpointRoot, name), Buffer.from(`{\"index\":${index}}\n`))
  ));
  const bindingFor = async (name) => {
    const bytes = await readFile(path.join(endpointRoot, name));
    return { path: name, size: bytes.length, sha256: sha256(bytes) };
  };
  const tupleNames = names.slice(1, 9);
  const tupleBindings = await Promise.all(tupleNames.map(bindingFor));
  const transcriptIdentities = await Promise.all([
    ...tupleNames,
    "bundle-manifest.json"
  ].map((name) => fileIdentity(path.join(endpointRoot, name))));
  const sourceIdentities = await Promise.all(
    swAbFourChainCompositionTestOnly.sourceSpecs.map(({ path: sourcePath }) =>
      fileIdentity(path.join(workspaceRoot, ...sourcePath.split("/")))
    )
  );
  const physical = {
    markerBinding: await bindingFor("00-marker.json"),
    receiptBinding: await bindingFor("99-receipt.json"),
    manifestBinding: await bindingFor("bundle-manifest.json"),
    tupleBindings,
    markerIdentity: await fileIdentity(path.join(endpointRoot, "00-marker.json")),
    receiptIdentity: await fileIdentity(path.join(endpointRoot, "99-receipt.json")),
    transcriptIdentities,
    sourceIdentities
  };
  return {
    root,
    input: {
      bindingRoot: workspaceRoot,
      candidateInputPath,
      attachmentsRoot,
      privateRoot,
      artifactARoot,
      artifactBRoot,
      runtimeCaptureInputPath,
      issuanceRunRoot: path.join(root, "issuance")
    },
    candidateBinding: {
      path: path.relative(workspaceRoot, candidateInputPath).replaceAll("\\", "/"),
      size: candidateBytes.length,
      sha256: sha256(candidateBytes)
    },
    runtimeBinding: {
      path: path.relative(workspaceRoot, runtimeCaptureInputPath).replaceAll("\\", "/"),
      size: runtimeBytes.length,
      sha256: sha256(runtimeBytes)
    },
    physical
  };
}

test("policy and Schema freeze producer_bridge_absent and twelve unique sources", async () => {
  const policy = JSON.parse(await readFile(path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json"
  ), "utf8"));
  assert.equal(validateSwAbFourChainCompositionPolicy(policy), policy);
  assert.equal(policy.producerBridgeStatus, "producer_bridge_absent");
  assert.equal(policy.requiredSourceBindings.length, 12);
  assert.equal(new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size, 12);
  const validator = await loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator(workspaceRoot);
  assert.equal(validator.schema.properties.cliExitCode.const, 1);
  assert.equal(validator.schema.properties.sourceBindings.minItems, 12);
});

test("pure four-chain binding preserves all exact projections and closed document", async () => {
  const sources = await checkedSources();
  const candidateBinding = { path: "tmp/candidate.json", size: 10, sha256: sha256("candidate") };
  const runtimeBinding = { path: "tmp/runtime.json", size: 11, sha256: sha256("runtime") };
  const fixture = baseline({ candidateBinding, runtimeBinding, sources, physical: dummyPhysical(sources) });
  const projection = validateSwAbFourChainCompositionBindings({
    ...fixture,
    candidateHeld: held(candidateBinding, "candidate"),
    runtimeHeld: held(runtimeBinding, "runtime"),
    outerSourceBindings: sources
  });
  assert.equal(projection.runtimeTupleBindings.length, 8);
  assert.equal(projection.transcriptBinding.derivedEvidenceDigest, runtimeEvidenceDigest);
  assert.equal(projection.issuanceBinding.derivedEvidenceDigest, runtimeEvidenceDigest);
  const document = swAbFourChainCompositionTestOnly.buildDocument(projection, sources);
  const validator = await loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator(workspaceRoot);
  assert.equal(validateSwAbFourChainCompositionDocument(document, validator), document);
  assert.equal(document.producerBridgeStatus, "producer_bridge_absent");
  assert.equal(document.mutationBoundary.candidateAndRuntimePrimaryInputsHeldAcrossIssuance, true);
  assert.equal(
    document.mutationBoundary.issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification,
    true
  );
  assert.equal(document.mutationBoundary.allEvidenceFilesContinuouslyHeldAcrossComposition, false);
  assert.equal(document.mutationBoundary.continuousMutationEpochVerified, false);
  assert.equal(document.mutationBoundary.samePermissionMutationExcluded, false);
  assert.equal(document.mutationBoundary.intervalMutationExcluded, false);
  assert.equal(document.mutationBoundary.abaExcluded, false);
  assert.equal(document.mutationBoundary.epoch, null);
  assert.equal(document.cliExitCode, 1);
});

test("scope, artifact, evidence digest, tuple, issuance, transcript, and source drift fail closed", async (t) => {
  const sources = await checkedSources();
  const candidateBinding = { path: "tmp/candidate.json", size: 10, sha256: sha256("candidate") };
  const runtimeBinding = { path: "tmp/runtime.json", size: 11, sha256: sha256("runtime") };
  const make = () => baseline({ candidateBinding, runtimeBinding, sources, physical: dummyPhysical(sources) });
  const invoke = (fixture) => validateSwAbFourChainCompositionBindings({
    ...fixture,
    candidateHeld: held(candidateBinding, "candidate"),
    runtimeHeld: held(runtimeBinding, "runtime"),
    outerSourceBindings: sources
  });
  const cases = [
    ["scope", /SW_AB_FOUR_CHAIN_SCOPE_MISMATCH/u, (fixture) => { fixture.transcriptLoaded.result.derivedProjection.runId = `run-${"9".repeat(64)}`; }],
    ["artifact", /SW_AB_FOUR_CHAIN_ARTIFACT_MISMATCH/u, (fixture) => { fixture.transcriptLoaded.result.derivedProjection.artifactBindings.B.artifactSetDigest = "9".repeat(64); }],
    ["evidence digest", /SW_AB_FOUR_CHAIN_EVIDENCE_DIGEST_MISMATCH/u, (fixture) => { fixture.oldComposition.inputBindings.runtimeCapture.evidenceDigest = "9".repeat(64); }],
    ["tuple", /SW_AB_FOUR_CHAIN_TUPLE_MISMATCH/u, (fixture) => { fixture.transcriptLoaded.result.derivedProjection.observations[0].runtimeResponseDigest = "9".repeat(64); }],
    ["issuance", /SW_AB_FOUR_CHAIN_ISSUANCE_IDENTITY_INVALID/u, (fixture) => { fixture.issuanceLoaded.result.receiptDigest = "bad"; }],
    ["transcript", /SW_AB_FOUR_CHAIN_TRANSCRIPT_INVALID/u, (fixture) => { fixture.transcriptLoaded.result.terminalEndpointSnapshotsMatched = false; }],
    ["source", /SW_AB_FOUR_CHAIN_NESTED_SOURCE_DRIFT/u, (fixture) => { fixture.oldComposition.sourceBindings[0].canonicalSha256 = "9".repeat(64); }]
  ];
  for (const [name, pattern, mutate] of cases) {
    await t.test(name, () => {
      const fixture = structuredClone(make());
      mutate(fixture);
      assert.throws(() => invoke(fixture), pattern);
    });
  }
});

test("physical aliases fail while exact shared source identities are accepted", async () => {
  const sources = await checkedSources();
  const physical = dummyPhysical(sources);
  const candidateBinding = { path: "tmp/candidate.json", size: 10, sha256: sha256("candidate") };
  const runtimeBinding = { path: "tmp/runtime.json", size: 11, sha256: sha256("runtime") };
  const fixture = baseline({ candidateBinding, runtimeBinding, sources, physical });
  const sourceHeld = sources.map((spec, index) => ({ spec, identity: physical.sourceIdentities[index] }));
  assert.equal(assertSwAbFourChainPhysicalSeparation({
    candidateHeld: held(candidateBinding, "candidate"),
    runtimeHeld: held(runtimeBinding, "runtime"),
    sourceHeld,
    transcriptLoaded: fixture.transcriptLoaded,
    issuanceLoaded: fixture.issuanceLoaded
  }), true);
  const aliased = structuredClone(fixture);
  aliased.issuanceLoaded.endpointFingerprint.marker = held(candidateBinding, "candidate").identity;
  assert.throws(() => assertSwAbFourChainPhysicalSeparation({
    candidateHeld: held(candidateBinding, "candidate"),
    runtimeHeld: held(runtimeBinding, "runtime"),
    sourceHeld,
    transcriptLoaded: aliased.transcriptLoaded,
    issuanceLoaded: aliased.issuanceLoaded
  }), /SW_AB_FOUR_CHAIN_EVIDENCE_PHYSICAL_ALIAS/u);
});

test("public composer rejects dependency injection and keeps verifier dependencies internal", async () => {
  await assert.rejects(
    composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuance(
      {},
      { cwd: workspaceRoot, dependencies: {} }
    ),
    /SW_AB_FOUR_CHAIN_PUBLIC_OPTIONS_INVALID/u
  );
});

test("injected full composer establishes one exact held checkpoint and validates Schema", async (t) => {
  const disk = await diskSetup(t);
  const sources = await checkedSources();
  const fixture = baseline({
    candidateBinding: disk.candidateBinding,
    runtimeBinding: disk.runtimeBinding,
    sources,
    physical: disk.physical
  });
  let callbackCalls = 0;
  const dependencies = {
    composeOld: async () => structuredClone(fixture.oldComposition),
    loadTranscript: async () => structuredClone(fixture.transcriptLoaded),
    loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
      callbackCalls += 1;
      await onHeldEpochCheckpoint({
        phase: "after_initial_validation_before_terminal_reread",
        runRoot
      });
      return structuredClone(fixture.issuanceLoaded);
    }
  };
  const document = await swAbFourChainCompositionTestOnly.composeWithDependencies(
    disk.input,
    { cwd: workspaceRoot, dependencies }
  );
  assert.equal(callbackCalls, 1);
  assert.equal(document.recordType, "sw_ab_update_candidate_runtime_client_capture_collector_issuance_composition_v1");
  assert.equal(document.status, "not_admitted");
  assert.equal(document.executionAdmission, "closed_missing_selected_https_origin");
  assert.equal(document.sourceBindings.length, 12);
  assert.equal(document.cliExitCode, 1);
});

test("checkpoint wrong phase, zero calls, and duplicate calls are rejected", async (t) => {
  const disk = await diskSetup(t);
  const sources = await checkedSources();
  const fixture = baseline({ candidateBinding: disk.candidateBinding, runtimeBinding: disk.runtimeBinding, sources, physical: disk.physical });
  const shared = {
    composeOld: async () => structuredClone(fixture.oldComposition),
    loadTranscript: async () => structuredClone(fixture.transcriptLoaded)
  };
  await assert.rejects(
    swAbFourChainCompositionTestOnly.composeWithDependencies(disk.input, {
      cwd: workspaceRoot,
      dependencies: {
        ...shared,
        loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
          await onHeldEpochCheckpoint({ phase: "wrong", runRoot });
          return structuredClone(fixture.issuanceLoaded);
        }
      }
    }),
    /SW_AB_FOUR_CHAIN_CHECKPOINT_PHASE_INVALID/u
  );
  await assert.rejects(
    swAbFourChainCompositionTestOnly.composeWithDependencies(disk.input, {
      cwd: workspaceRoot,
      dependencies: { ...shared, loadIssuance: async () => structuredClone(fixture.issuanceLoaded) }
    }),
    /SW_AB_FOUR_CHAIN_CHECKPOINT_COUNT_INVALID/u
  );
  await assert.rejects(
    swAbFourChainCompositionTestOnly.composeWithDependencies(disk.input, {
      cwd: workspaceRoot,
      dependencies: {
        ...shared,
        loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
          const checkpoint = { phase: "after_initial_validation_before_terminal_reread", runRoot };
          await onHeldEpochCheckpoint(checkpoint);
          await onHeldEpochCheckpoint(checkpoint);
          return structuredClone(fixture.issuanceLoaded);
        }
      }
    }),
    /SW_AB_FOUR_CHAIN_CHECKPOINT_COUNT_INVALID/u
  );
});

test("allSettled waits for the delayed sibling before a checkpoint branch failure escapes", async (t) => {
  const disk = await diskSetup(t);
  let delayedCompleted = false;
  const dependencies = {
    composeOld: async () => { throw new Error(`raw-${runId}`); },
    loadTranscript: async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      delayedCompleted = true;
      return {};
    },
    loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
      await onHeldEpochCheckpoint({
        phase: "after_initial_validation_before_terminal_reread",
        runRoot
      });
      return {};
    }
  };
  await assert.rejects(
    swAbFourChainCompositionTestOnly.composeWithDependencies(
      disk.input,
      { cwd: workspaceRoot, dependencies }
    ),
    /SW_AB_FOUR_CHAIN_CHECKPOINT_BRANCH_FAILED/u
  );
  assert.equal(delayedCompleted, true);
});

test("terminal held-file check rejects a persistent path replacement after the callback", async (t) => {
  const disk = await diskSetup(t);
  const displaced = `${disk.input.candidateInputPath}.displaced`;
  const dependencies = {
    composeOld: async () => ({}),
    loadTranscript: async () => ({}),
    loadIssuance: async ({ onHeldEpochCheckpoint, runRoot }) => {
      await onHeldEpochCheckpoint({
        phase: "after_initial_validation_before_terminal_reread",
        runRoot
      });
      await rename(disk.input.candidateInputPath, displaced);
      await writeFile(disk.input.candidateInputPath, "{\"replacement\":true}\n");
      return {};
    }
  };
  await assert.rejects(
    swAbFourChainCompositionTestOnly.composeWithDependencies(
      disk.input,
      { cwd: workspaceRoot, dependencies }
    ),
    /SW_AB_FOUR_CHAIN_HELD_FILE_CHANGED/u
  );
});

test("failure output hashes errors without raw payload or unverified identifiers", () => {
  const secretAttempt = `attempt-${"9".repeat(64)}`;
  const failure = buildSwAbFourChainCompositionFailure(
    new Error(`raw payload ${runId} ${secretAttempt}`)
  );
  const serialized = JSON.stringify(failure);
  assert.equal(failure.status, "not_admitted");
  assert.equal(failure.executionAdmission, "closed_missing_selected_https_origin");
  assert.equal(failure.cliExitCode, 1);
  assert.equal(serialized.includes(runId), false);
  assert.equal(serialized.includes(secretAttempt), false);
  assert.equal(serialized.includes("raw payload"), false);
});

test("CLI accepts the exact eight flags, writes JSON only, and always exits 1", async (t) => {
  const disk = await diskSetup(t);
  const outcome = spawnSync(process.execPath, [
    path.join(workspaceRoot, "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs"),
    "--binding-root", disk.input.bindingRoot,
    "--candidate-input", disk.input.candidateInputPath,
    "--attachments-root", disk.input.attachmentsRoot,
    "--private-root", disk.input.privateRoot,
    "--artifact-a-root", disk.input.artifactARoot,
    "--artifact-b-root", disk.input.artifactBRoot,
    "--runtime-capture-input", disk.input.runtimeCaptureInputPath,
    "--issuance-run-root", disk.input.issuanceRunRoot
  ], { cwd: workspaceRoot, encoding: "utf8", windowsHide: true });
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stderr, "");
  const output = JSON.parse(outcome.stdout);
  assert.equal(output.status, "not_admitted");
  assert.equal(output.executionAdmission, "closed_missing_selected_https_origin");
  assert.equal(output.cliExitCode, 1);
});
