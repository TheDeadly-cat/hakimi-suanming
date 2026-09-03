import assert from "node:assert/strict";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectProviderDeploymentCandidate,
  collectProviderDeploymentCandidateForTest,
  createSyntheticProviderDeploymentAdapter,
  parseProviderDeploymentCandidateEnvironment,
  parseProviderDeploymentRawJsonBytes,
  PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS,
  PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_ID,
  PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_PATH
} from "./provider-deployment-candidate-runtime.mjs";
import { loadVerifiedProviderDeploymentCandidateOutput } from "./provider-deployment-candidate-loader.mjs";
import {
  loadVerifiedProviderDeploymentCandidateSequence,
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
} from "./provider-deployment-candidate-sequence-loader.mjs";
import {
  writeProviderDeploymentCandidateSequenceCandidate
} from "./provider-deployment-candidate-sequence-writer.mjs";
import {
  verifyPersistedProviderDeploymentCandidateSequence
} from "./provider-deployment-candidate-sequence-verifier.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pendingTerminalCommitFileName =
  ".provider-deployment-candidate-receipt-publication-pending";
const terminalCommitFileName = "provider-deployment-candidate-receipt-commit.sha256";
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const provider = "fixture-provider-neutral";
const origin = "https://staging.example.com";
const immutableDeploymentUrl = "https://deployment-b.example.net";
const descriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

function normalizedRelative(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function projection(action = "deploy_candidate", overrides = null) {
  const deploy = action === "deploy_candidate";
  const base = {
    schemaVersion: 1,
    recordType: "synthetic_provider_deployment_projection_v1",
    provider,
    action,
    actionResponse: {
      provider,
      action,
      operationId: deploy ? "operation-deploy-001" : "operation-restore-001",
      accountId: "account-1",
      projectId: "project-1",
      environment: "staging",
      origin,
      beforeActiveDeploymentId: deploy ? "deployment-a" : "deployment-b",
      requestedTargetDeploymentId: deploy ? null : "deployment-a",
      resultActiveDeploymentId: deploy ? "deployment-b" : "deployment-a",
      immutableDeploymentUrl: deploy ? immutableDeploymentUrl : "https://deployment-a.example.net",
      resultDerivation: deploy ? "provider_assigned_new" : "activated_requested",
      derivedFromDeploymentId: null,
      sequenceEligible: true,
      startedAt: "2020-01-01T00:00:00.000Z",
      acceptedAt: "2020-01-01T00:00:01.000Z",
      completedAt: "2020-01-01T00:00:02.000Z",
      credentialMaterialEmbedded: false
    },
    finalReadback: {
      provider,
      action,
      operationId: deploy ? "operation-deploy-001" : "operation-restore-001",
      accountId: "account-1",
      projectId: "project-1",
      environment: "staging",
      origin,
      activeDeploymentId: deploy ? "deployment-b" : "deployment-a",
      immutableDeploymentUrl: deploy ? immutableDeploymentUrl : "https://deployment-a.example.net",
      providerStatus: "success",
      terminal: true,
      successful: true,
      observedAt: "2020-01-01T00:00:03.000Z",
      credentialMaterialEmbedded: false
    }
  };
  return typeof overrides === "function" ? (overrides(base) ?? base) : base;
}

function adapterFor(action = "deploy_candidate", mutate = null) {
  return createSyntheticProviderDeploymentAdapter({
    adapterId: "fixture-synthetic-adapter",
    adapterVersion: "1.0.0",
    provider,
    parse: async (input) => {
      assert.equal(input.provider, provider);
      assert.equal(input.action, action);
      const value = projection(action);
      if (mutate) await mutate(value, input);
      if (input.role === "raw-action-response") {
        assert.equal(input.rawJson.kind, "sanitized-action-response");
        return value.actionResponse;
      }
      assert.equal(input.role, "raw-final-readback");
      assert.equal(input.rawJson.kind, "sanitized-final-readback");
      return value.finalReadback;
    }
  });
}

async function createFormalFixture(t, {
  action = "deploy_candidate",
  rawAction = null,
  rawReadback = null,
  artifactVariant = "default"
} = {}) {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "provider-candidate-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, "dist", "web");
  const rawRoot = path.join(root, "private-raw");
  const outputRoot = path.join(root, "candidate-output");
  const lockPath = path.join(root, "private-lock", "release-artifact-identity.json");
  const actionPath = path.join(rawRoot, "action-response.json");
  const readbackPath = path.join(rawRoot, "final-readback.json");
  await Promise.all([
    mkdir(artifactRoot, { recursive: true }),
    mkdir(rawRoot, { recursive: true }),
    mkdir(path.dirname(lockPath), { recursive: true })
  ]);
  const storageManifestText = JSON.stringify({ manifestVersion: 1, database: descriptor });
  const manifestDigest = sha256(storageManifestText);
  const buildVersion = artifactVariant === "default"
    ? "abcdef123456"
    : sha256(`build:${artifactVariant}`).slice(0, 12);
  const fixtureReleaseEvidenceId = artifactVariant === "default"
    ? releaseEvidenceId
    : `hre1-${sha256(`evidence:${artifactVariant}`).slice(0, 32)}`;
  const artifactLabel = artifactVariant === "default" ? "fixture" : `fixture-${artifactVariant}`;
  const metadata = [
    `<meta name="hakimi-release-database" content="${htmlEscape(JSON.stringify(descriptor))}">`,
    `<meta name="hakimi-release-storage-manifest" content="${htmlEscape(storageManifestText)}">`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${manifestDigest}">`,
    `<meta name="hakimi-build-version" content="${buildVersion}">`,
    `<meta name="hakimi-release-evidence-id" content="${fixtureReleaseEvidenceId}">`
  ].join("");
  const variantArtifact = artifactVariant !== "default";
  const artifactFiles = {
    "index.html": `<!doctype html><html><head>${metadata}</head><body>${variantArtifact ? artifactLabel : ""}</body></html>`,
    "manifest.webmanifest": JSON.stringify({ name: artifactLabel, start_url: "/" }),
    "sw.js": variantArtifact
      ? `self.addEventListener('fetch', () => {}); // ${artifactLabel}\n`
      : "self.addEventListener('fetch', () => {});\n",
    "_headers": variantArtifact
      ? `fixture deployment control ${artifactLabel}\n`
      : "fixture deployment control\n"
  };
  for (const [relative, value] of Object.entries(artifactFiles)) {
    await writeFile(path.join(artifactRoot, relative), value, "utf8");
  }
  const identityLock = await writeReleaseArtifactIdentityLock({
    cwd: workspaceRoot,
    dist: artifactRoot,
    lockPath,
    channel: "default-v13",
    evidenceId: fixtureReleaseEvidenceId,
    createdAt: "2026-08-27T00:10:00.000Z"
  });
  const artifactEntries = await collectArtifactEntries(artifactRoot);
  const artifactSetDigest = sha256(canonicalJson(artifactEntries));
  const policyPath = path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json");
  const policyBytes = await readFile(policyPath);
  const hashes = Array.from({ length: 8 }, (_, index) => (index + 1).toString(16).padStart(64, "0"));
  const evidence = {
    schemaVersion: 1,
    evidenceType: "engineering_release_evidence",
    evidenceId: fixtureReleaseEvidenceId,
    generatedAt: "2026-08-27T00:12:00.000Z",
    source: {
      repository: null,
      commit: "b".repeat(40),
      branch: "fixture",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: hashes[0],
      packageLockSha256: hashes[1]
    },
    release: {
      channel: "default-v13",
      candidateLabel: "provider-candidate-fixture",
      descriptor: structuredClone(descriptor),
      manifestVersion: 1,
      manifestDigest,
      buildVersion,
      builtEvidenceId: fixtureReleaseEvidenceId,
      evidenceIdBound: true,
      requiredReceiptIds: ["unit"]
    },
    toolchain: {
      node: process.version,
      npm: "11.13.0",
      platform: process.platform,
      arch: process.arch,
      osRelease: "fixture",
      browsers: { edge: "fixture", chrome: "fixture" }
    },
    policyFiles: [
      { path: "docs/release/web-v1-release-decisions.json", sha256: hashes[2] },
      { path: "docs/release/release-generation-history.json", sha256: hashes[3] },
      { path: "docs/security/hosting-security-policy.json", sha256: sha256(policyBytes) },
      { path: "docs/release/release-evidence.schema.json", sha256: hashes[4] }
    ],
    testReceipts: [{
      id: "unit",
      evidenceId: fixtureReleaseEvidenceId,
      status: "passed",
      exitCode: 0,
      command: ["npm", "test"],
      startedAt: "2026-08-27T00:00:00.000Z",
      completedAt: "2026-08-27T00:01:00.000Z",
      durationMs: 60000,
      browserResultSummary: null,
      path: "tmp/release-evidence-receipts/unit.json",
      sha256: hashes[5]
    }],
    artifacts: {
      root: normalizedRelative(workspaceRoot, artifactRoot),
      count: artifactEntries.length,
      artifactSetDigest,
      identityLock: {
        path: normalizedRelative(workspaceRoot, lockPath),
        sha256: identityLock.lockFileSha256,
        lockDigest: identityLock.lock.lockDigest,
        artifactSetDigest,
        verified: true
      },
      mutationBoundary: {
        schemaVersion: 1,
        boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
        coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
        endpointSnapshotsMatched: true,
        verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
        mutationEpochCapability: "absent_schema13",
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      },
      components: releaseArtifactComponents(artifactEntries),
      files: artifactEntries
    },
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true,
      releaseHistoryOwnerConfirmed: false,
      hostingSecurityVerified: false,
      publicDeploymentAuthorized: false,
      licenseOwnerSelectionRecorded: false,
      expertClaimsAuthorized: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      codeSignature: false,
      expertSignature: false,
      contentRightsGrant: false,
      publicReleaseAuthorized: false
    }
  };
  const evidencePath = path.join(artifactRoot, "release-evidence.json");
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(evidencePath, evidenceBytes);
  await writeFile(`${evidencePath}.sha256`, `${sha256(evidenceBytes)}  release-evidence.json\n`, "utf8");
  await writeFile(actionPath, rawAction ?? `${JSON.stringify({ kind: "sanitized-action-response", provider })}\n`, "utf8");
  await writeFile(readbackPath, rawReadback ?? `${JSON.stringify({ kind: "sanitized-final-readback", provider })}\n`, "utf8");
  const environment = {
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_PROVIDER: provider,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ACTION: action,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_BINDING_ROOT: workspaceRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ROOT: rawRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_OUTPUT_ROOT: outputRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ACTION_RESPONSE: actionPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_FINAL_READBACK: readbackPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_ROOT: artifactRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_LOCK: lockPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RELEASE_EVIDENCE_ID: fixtureReleaseEvidenceId,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RUN_ID: action === "deploy_candidate" ? "provider-run-0001" : "provider-run-0002"
  };
  return { root, artifactRoot, rawRoot, outputRoot, lockPath, actionPath, readbackPath, environment };
}

test("environment requires explicit provider/action, a private raw root, and disjoint absolute paths", async (t) => {
  const fixture = await createFormalFixture(t);
  const parsed = parseProviderDeploymentCandidateEnvironment(fixture.environment);
  assert.equal(parsed.provider, provider);
  assert.equal(parsed.action, "deploy_candidate");
  assert.equal(parsed.rawRoot, fixture.rawRoot);
  assert.throws(() => parseProviderDeploymentCandidateEnvironment({
    ...fixture.environment,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_PROVIDER: "unselected"
  }), /PROVIDER_CANDIDATE_PROVIDER_INVALID/u);
  assert.throws(() => parseProviderDeploymentCandidateEnvironment({
    ...fixture.environment,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_OUTPUT_ROOT: path.join(fixture.rawRoot, "output")
  }), /PROVIDER_CANDIDATE_ROOTS_OVERLAP/u);
  assert.throws(() => parseProviderDeploymentCandidateEnvironment({
    ...fixture.environment,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ACTION_RESPONSE: path.resolve(fixture.rawRoot, "..", "outside.json")
  }), /PATH_OUTSIDE_BINDING/u);
  assert.throws(() => parseProviderDeploymentCandidateEnvironment({
    ...fixture.environment,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_OUTPUT_ROOT: `${fixture.outputRoot}${path.sep}`
  }), /PATH_NOT_CANONICAL/u);
});

test("raw JSON parsing is strict UTF-8 and rejects duplicate keys", () => {
  assert.deepEqual(parseProviderDeploymentRawJsonBytes(Buffer.from('{"a":1}')), { a: 1 });
  assert.throws(() => parseProviderDeploymentRawJsonBytes(Buffer.from('{"a":1,"a":2}')), /RAW_JSON_DUPLICATE_KEY/u);
  assert.throws(() => parseProviderDeploymentRawJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), /BOM_FORBIDDEN/u);
  assert.throws(() => parseProviderDeploymentRawJsonBytes(Buffer.from([0xc3, 0x28])), /UTF8_INVALID/u);
});

test("synthetic offline collection binds its inputs and commits with one exact terminal marker", async (t) => {
  const fixture = await createFormalFixture(t);
  const result = await collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  });
  const names = (await readdir(fixture.outputRoot)).sort();
  assert.deepEqual(names, [
    "artifact-final.json",
    "artifact-initial.json",
    terminalCommitFileName,
    "provider-deployment-candidate-receipt.json",
    "raw-action-response.json",
    "raw-final-readback.json",
    "synthetic-normalized-projection.json"
  ]);
  assert.equal(path.basename(result.receiptPath), "provider-deployment-candidate-receipt.json");
  const receiptBytes = await readFile(result.receiptPath);
  const terminalCommitBytes = await readFile(path.join(fixture.outputRoot, terminalCommitFileName));
  assert.equal(terminalCommitBytes.length, 65);
  assert.equal(terminalCommitBytes.toString("utf8"), `${sha256(receiptBytes)}\n`);
  assert.deepEqual(result.terminalGateBinding, {
    path: normalizedRelative(workspaceRoot, path.join(fixture.outputRoot, terminalCommitFileName)),
    size: 65,
    sha256: sha256(terminalCommitBytes),
    commitsReceiptSha256: sha256(receiptBytes)
  });
  assert.equal(result.document.trustClass, "untrusted_candidate");
  assert.equal(result.document.admissionStatus, "not_admitted");
  assert.equal(result.document.adapter.providerAuthenticated, false);
  assert.equal(result.document.operation.resultDerivation, "provider_assigned_new");
  assert.equal(result.document.operation.resultActiveDeploymentId, "deployment-b");
  assert.equal(result.document.artifactIdentity.descriptor.dbGeneration, "legacy-v13");
  assert.equal(result.document.artifactIdentity.descriptor.targetSchema, 13);
  assert.equal(result.document.artifactIdentity.descriptor.migrationId, null);
  assert.ok(result.document.artifactIdentity.releaseEvidence.sha256.match(/^[a-f0-9]{64}$/u));
  assert.equal(result.document.artifactIdentity.hostingPolicy.policyId, "hakimi-web-public-hosting-baseline-v2");
  assert.equal(result.document.rawInputs.credentialMaterialEmbedded, false);
  assert.ok(Object.values(result.document.attempts).every((value) => value === false));
  assert.ok(Object.values(result.document.admissionGates).every((value) => value === false));
  assert.ok(Object.values(result.document.claims).every((value) => value === false));
  assert.equal(Object.isFrozen(result.document), true);
  assert.equal(Object.isFrozen(result.document.operation), true);
  assert.equal(Object.isFrozen(result.document.attachments["artifact-final"]), true);
  assert.throws(() => {
    result.document.claims.publicReleaseAuthorized = true;
  }, TypeError);
  assert.equal(result.document.claims.publicReleaseAuthorized, false);
  const initialArtifactAttachment = JSON.parse(await readFile(
    path.join(fixture.outputRoot, "artifact-initial.json"),
    "utf8"
  ));
  assert.equal(
    Object.hasOwn(initialArtifactAttachment.releaseEvidenceExpectation.artifactIdentityLockBinding, "realPath"),
    false
  );
  const independentlyLoaded = await loadVerifiedProviderDeploymentCandidateOutput({
    bindingRoot: workspaceRoot,
    outputRoot: fixture.outputRoot,
    receiptPath: result.receiptPath,
    cwd: workspaceRoot
  });
  assert.equal(independentlyLoaded.candidateOutputIntegrityVerified, true);
  assert.equal(independentlyLoaded.trustClass, "untrusted_candidate");
  assert.equal(independentlyLoaded.admissionStatus, "not_admitted");
  assert.deepEqual(independentlyLoaded.terminalGateBinding, result.terminalGateBinding);
  assert.equal(independentlyLoaded.gates.terminalCommitMarkerVerified, true);
  assert.equal(independentlyLoaded.gates.rawProjectionDerivationVerified, false);
  assert.equal(independentlyLoaded.gates.providerAuthenticatedReceiptVerified, false);
  const schema = JSON.parse(await readFile(path.join(workspaceRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_PATH), "utf8"));
  const validator = compileEvidenceSchemaForId(schema, PROVIDER_DEPLOYMENT_CANDIDATE_SCHEMA_ID);
  assert.doesNotThrow(() => validator.assert(result.document));
  const mutated = structuredClone(result.document);
  mutated.claims.publicReleaseAuthorized = true;
  assert.throws(() => validator.assert(mutated), /validation failed/u);
  const missingRole = structuredClone(result.document);
  delete missingRole.attachments["artifact-final"];
  assert.throws(() => validator.assert(missingRole), /validation failed/u);
  const substitutedRole = structuredClone(result.document);
  substitutedRole.attachments["artifact-final-duplicate"] = substitutedRole.attachments["artifact-initial"];
  delete substitutedRole.attachments["artifact-final"];
  assert.throws(() => validator.assert(substitutedRole), /validation failed/u);
  assert.equal(Object.hasOwn(PROVIDER_DEPLOYMENT_CANDIDATE_ENVIRONMENT_KEYS, "onReceiptPublishedCheckpoint"), false);
  const runtimeSource = await readFile(
    path.join(workspaceRoot, "scripts", "provider-deployment-candidate-runtime.mjs"),
    "utf8"
  );
  assert.doesNotMatch(runtimeSource, /onReceiptPublishedCheckpoint|onDestinationPublished/u);
});

test("production runtime commits deploy and restore exact-7 packages consumed by sequence loader and verifier", async (t) => {
  const deployFixture = await createFormalFixture(t, {
    action: "deploy_candidate",
    artifactVariant: "candidate-b"
  });
  const restoreFixture = await createFormalFixture(t, {
    action: "restore_baseline",
    artifactVariant: "baseline-a"
  });
  const deployCollected = await collectProviderDeploymentCandidate({
    environment: deployFixture.environment,
    adapter: adapterFor("deploy_candidate"),
    cwd: workspaceRoot
  });
  const restoreCollected = await collectProviderDeploymentCandidate({
    environment: restoreFixture.environment,
    adapter: adapterFor("restore_baseline", (value) => {
      value.actionResponse.startedAt = "2020-01-01T00:10:00.000Z";
      value.actionResponse.acceptedAt = "2020-01-01T00:10:01.000Z";
      value.actionResponse.completedAt = "2020-01-01T00:10:02.000Z";
      value.finalReadback.observedAt = "2020-01-01T00:10:03.000Z";
    }),
    cwd: workspaceRoot
  });
  const pair = {
    deploy: { ...deployFixture, receiptPath: deployCollected.receiptPath, collected: deployCollected },
    restore: { ...restoreFixture, receiptPath: restoreCollected.receiptPath, collected: restoreCollected }
  };
  const expectedCommittedNames = [
    "artifact-final.json",
    "artifact-initial.json",
    terminalCommitFileName,
    "provider-deployment-candidate-receipt.json",
    "raw-action-response.json",
    "raw-final-readback.json",
    "synthetic-normalized-projection.json"
  ].sort();
  const markerIdentities = [];

  for (const [role, candidate] of Object.entries(pair)) {
    assert.deepEqual((await readdir(candidate.outputRoot)).sort(), expectedCommittedNames);
    const terminalCommitPath = path.join(candidate.outputRoot, terminalCommitFileName);
    const pendingTerminalCommitPath = path.join(candidate.outputRoot, pendingTerminalCommitFileName);
    assert.equal(path.basename(terminalCommitPath), terminalCommitFileName);
    await assert.rejects(
      lstat(pendingTerminalCommitPath),
      (error) => error?.code === "ENOENT"
    );
    const [receiptBytes, markerBytes, markerMetadata] = await Promise.all([
      readFile(candidate.receiptPath),
      readFile(terminalCommitPath),
      lstat(terminalCommitPath, { bigint: true })
    ]);
    const receiptSha256 = sha256(receiptBytes);
    const markerSha256 = sha256(markerBytes);
    assert.equal(markerBytes.length, 65);
    assert.equal(markerBytes.toString("utf8"), `${receiptSha256}\n`);
    assert.equal(markerMetadata.isFile(), true);
    assert.equal(markerMetadata.nlink, 1n);
    markerIdentities.push([markerMetadata.dev, markerMetadata.ino]);
    assert.deepEqual(candidate.collected.terminalGateBinding, {
      path: normalizedRelative(workspaceRoot, terminalCommitPath),
      size: 65,
      sha256: markerSha256,
      commitsReceiptSha256: receiptSha256
    }, `${role} marker must bind the raw production receipt bytes`);
    assert.equal(candidate.collected.receiptBinding.sha256, receiptSha256);
  }
  assert.notDeepEqual(markerIdentities[0], markerIdentities[1]);

  const sequenceInput = {
    bindingRoot: workspaceRoot,
    deployOutputRoot: deployFixture.outputRoot,
    deployReceiptPath: deployCollected.receiptPath,
    restoreOutputRoot: restoreFixture.outputRoot,
    restoreReceiptPath: restoreCollected.receiptPath,
    cwd: workspaceRoot
  };
  const sequence = await loadVerifiedProviderDeploymentCandidateSequence(sequenceInput);
  assert.equal(sequence.deploymentIdRelation.baselineAId, "deployment-a");
  assert.equal(sequence.deploymentIdRelation.candidateBId, "deployment-b");
  assert.equal(sequence.deploymentIdRelation.restoredActiveDeploymentId, "deployment-a");
  assert.equal(sequence.mechanicalChecks.twoPackageIntegrityVerified, true);
  assert.equal(sequence.mechanicalChecks.twoPackageFilesystemEpochBound, true);
  for (const [role, candidate] of Object.entries(pair)) {
    assert.deepEqual(sequence.packages[role].fixedFiles["terminal-commit"], {
      path: candidate.collected.terminalGateBinding.path,
      size: candidate.collected.terminalGateBinding.size,
      sha256: candidate.collected.terminalGateBinding.sha256,
      commitsReceiptSha256: candidate.collected.terminalGateBinding.commitsReceiptSha256
    });
    assert.equal(
      sequence.packages[role].fixedFiles.receipt.sha256,
      candidate.collected.terminalGateBinding.commitsReceiptSha256
    );
  }
  assert.ok(Object.values(sequence.claims).every((value) => value === false));

  const sequenceOutputRoot = path.join(deployFixture.root, "runtime-sequence-output");
  const written = await writeProviderDeploymentCandidateSequenceCandidate({
    ...sequenceInput,
    sequenceOutputRoot
  });
  const verified = await verifyPersistedProviderDeploymentCandidateSequence({
    ...sequenceInput,
    sequenceOutputRoot,
    sequencePath: path.join(sequenceOutputRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME)
  });
  assert.equal(written.sequenceCandidateWritten, true);
  assert.equal(verified.externalSequenceCandidateIntegrityVerified, true);
  assert.equal(verified.currentRecompositionMatched, true);
  assert.equal(verified.sequenceDigest, sequence.sequenceDigest);
  for (const result of [sequence, verified]) {
    assert.equal(result.admissionStatus, "not_admitted");
    assert.deepEqual(result.attempts, {
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false
    });
    assert.deepEqual(result.authorizationBoundary, {
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    });
  }
  assert.ok(Object.values(verified.claims).every((value) => value === false));
});

test("unbranded adapters fail before any output is created", async (t) => {
  const fixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: { provider, parse: () => projection() },
    cwd: workspaceRoot
  }), /ADAPTER_UNAVAILABLE/u);
  await assert.rejects(readFile(fixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");
});

test("binding root and cwd must share one unambiguous path base", async (t) => {
  const fixture = await createFormalFixture(t);
  const mismatchedEnvironment = {
    ...fixture.environment,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_BINDING_ROOT: fixture.root
  };
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: mismatchedEnvironment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  }), /BINDING_ROOT_CWD_MISMATCH/u);
  await assert.rejects(readFile(fixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");
});

test("provider, account, project, environment, origin, active id, and immutable URL must agree", async (t) => {
  const mutations = [
    (value) => { value.finalReadback.provider = "other-provider"; },
    (value) => { value.finalReadback.accountId = "account-2"; },
    (value) => { value.finalReadback.projectId = "project-2"; },
    (value) => { value.finalReadback.environment = "production"; },
    (value) => { value.finalReadback.origin = "https://other.example.com"; },
    (value) => { value.finalReadback.activeDeploymentId = "deployment-c"; },
    (value) => { value.finalReadback.immutableDeploymentUrl = "https://deployment-c.example.net"; }
  ];
  for (const mutate of mutations) {
    const fixture = await createFormalFixture(t);
    await assert.rejects(collectProviderDeploymentCandidate({
      environment: fixture.environment,
      adapter: adapterFor("deploy_candidate", mutate),
      cwd: workspaceRoot
    }), /PROVIDER_IDENTITY_MISMATCH/u);
    await assert.rejects(readFile(fixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");
  }
});

test("terminal status and operation chronology fail closed", async (t) => {
  const fixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: adapterFor("deploy_candidate", (value) => {
      value.finalReadback.terminal = false;
      value.finalReadback.observedAt = "2026-08-26T23:59:59.000Z";
    }),
    cwd: workspaceRoot
  }), /OPERATION_NOT_TERMINAL/u);

  const futureFixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: futureFixture.environment,
    adapter: adapterFor("deploy_candidate", (value) => {
      value.actionResponse.startedAt = "2099-01-01T00:00:00.000Z";
      value.actionResponse.acceptedAt = "2099-01-01T00:00:01.000Z";
      value.actionResponse.completedAt = "2099-01-01T00:00:02.000Z";
      value.finalReadback.observedAt = "2099-01-01T00:00:03.000Z";
    }),
    cwd: workspaceRoot
  }), /TIME_ORDER_INVALID/u);
});

test("deploy and restore deployment-id derivation rules are explicit", async (t) => {
  const deployFixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: deployFixture.environment,
    adapter: adapterFor("deploy_candidate", (value) => {
      value.actionResponse.resultDerivation = "activated_requested";
    }),
    cwd: workspaceRoot
  }), /RESULT_DERIVATION_INVALID/u);

  const restoreFixture = await createFormalFixture(t, { action: "restore_baseline" });
  const restored = await collectProviderDeploymentCandidate({
    environment: restoreFixture.environment,
    adapter: adapterFor("restore_baseline"),
    cwd: workspaceRoot
  });
  assert.equal(restored.document.operation.beforeActiveDeploymentId, "deployment-b");
  assert.equal(restored.document.operation.requestedTargetDeploymentId, "deployment-a");
  assert.equal(restored.document.operation.resultActiveDeploymentId, "deployment-a");
  assert.equal(restored.document.operation.sequenceEligible, true);
  assert.equal(restored.document.claims.rollbackObserved, false);
});

test("credential-like keys and values are rejected before adapter execution and output", async (t) => {
  for (const rawAction of [
    '{"kind":"sanitized-action-response","x_api.key":"not-a-secret"}\n',
    '{"kind":"sanitized-action-response","cf_access_client_secret":"redacted"}\n',
    '{"kind":"sanitized-action-response","github_access_token":"redacted"}\n',
    '{"kind":"sanitized-action-response","github_token":"opaque-value"}\n',
    '{"kind":"sanitized-action-response","AWS_SECRET_ACCESS_KEY":"opaque-value"}\n',
    '{"kind":"sanitized-action-response","aws_access_key_id":"AKIAEXAMPLE"}\n',
    '{"kind":"sanitized-action-response","vendor_oauth":"opaque-value"}\n',
    '{"kind":"sanitized-action-response","oauth":"redacted"}\n',
    '{"kind":"sanitized-action-response","note":"Basic QQ=="}\n',
    '{"kind":"sanitized-action-response","note":"CF_API_TOKEN=opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"Authorization: opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"https://example.com/callback?access_token=opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"https://example.com/callback?access%5Ftoken=opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"https://example.com/callback#access_token=opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"https://example.com/callback#access%5Ftoken=opaque-value"}\n',
    '{"kind":"sanitized-action-response","note":"https://example.com/#/callback?access_token=opaque-value"}\n',
    '{"kind":"sanitized-action-response","headers":[["Authorization","opaque-value"]]}\n',
    '{"kind":"sanitized-action-response","headers":[{"name":"X-API-Key","value":"opaque-value"}]}\n',
    '{"kind":"sanitized-action-response","query":[["access%5Ftoken","opaque-value"]]}\n',
    '{"kind":"sanitized-action-response","note":"postgres://user:password@database.example.com/app"}\n',
    '{"kind":"sanitized-action-response","note":"wss://single-user@socket.example.com/path"}\n',
    '{"kind":"sanitized-action-response","note":"https://user:password@example.com"}\n',
    '{"kind":"sanitized-action-response","note":"eyJabcdefgh.eyJijklmnop.qrstuvwxyz"}\n'
  ]) {
    const fixture = await createFormalFixture(t, { rawAction });
    let invoked = false;
    const adapter = createSyntheticProviderDeploymentAdapter({
      adapterId: "fixture-synthetic-adapter",
      adapterVersion: "1.0.0",
      provider,
      parse: (input) => {
        invoked = true;
        const value = projection();
        return input.role === "raw-action-response" ? value.actionResponse : value.finalReadback;
      }
    });
    await assert.rejects(collectProviderDeploymentCandidate({
      environment: fixture.environment,
      adapter,
      cwd: workspaceRoot
    }), /CREDENTIAL_MATERIAL_PRESENT/u);
    assert.equal(invoked, false);
  }
});

test("hard-linked raw inputs are rejected", async (t) => {
  const fixture = await createFormalFixture(t);
  await link(fixture.actionPath, path.join(fixture.rawRoot, "action-response-alias.json"));
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  }), /RAW_FILE_UNSAFE/u);
});

test("raw and artifact mutations during adapter parsing are detected before output", async (t) => {
  const rawFixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: rawFixture.environment,
    adapter: adapterFor("deploy_candidate", async () => {
      await writeFile(rawFixture.actionPath, `${JSON.stringify({ kind: "sanitized-action-response", provider, changed: true })}\n`, "utf8");
    }),
    cwd: workspaceRoot
  }), /RAW_FILE_REBOUND/u);
  await assert.rejects(readFile(rawFixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");

  const artifactFixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: artifactFixture.environment,
    adapter: adapterFor("deploy_candidate", async () => {
      await writeFile(path.join(artifactFixture.artifactRoot, "sw.js"), "self.skipWaiting();\n", "utf8");
    }),
    cwd: workspaceRoot
  }), /changed after the identity lock|ARTIFACT_IDENTITY_REBOUND/u);
  await assert.rejects(readFile(artifactFixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");
});

test("terminal rename failure leaves only a non-loadable prepared package", async (t) => {
  const fixture = await createFormalFixture(t);
  const receiptPath = path.join(fixture.outputRoot, "provider-deployment-candidate-receipt.json");
  await assert.rejects(collectProviderDeploymentCandidateForTest({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  }, {
    fault: "create_target_directory_collision"
  }));

  const pendingPath = path.join(fixture.outputRoot, pendingTerminalCommitFileName);
  const terminalPath = path.join(fixture.outputRoot, terminalCommitFileName);
  const receiptBytes = await readFile(receiptPath);
  assert.equal(await readFile(pendingPath, "utf8"), `${sha256(receiptBytes)}\n`);
  assert.equal((await lstat(terminalPath)).isDirectory(), true);
  assert.deepEqual((await readdir(fixture.outputRoot)).sort(), [
    pendingTerminalCommitFileName,
    "artifact-final.json",
    "artifact-initial.json",
    terminalCommitFileName,
    "provider-deployment-candidate-receipt.json",
    "raw-action-response.json",
    "raw-final-readback.json",
    "synthetic-normalized-projection.json"
  ].sort());
  await assert.rejects(loadVerifiedProviderDeploymentCandidateOutput({
    bindingRoot: workspaceRoot,
    outputRoot: fixture.outputRoot,
    receiptPath,
    cwd: workspaceRoot
  }), /PROVIDER_CANDIDATE_LOADER_OUTPUT_SET_INVALID/u);
});

test("test-only collector exposes no arbitrary fault or callback seam", async (t) => {
  const fixture = await createFormalFixture(t);
  await assert.rejects(collectProviderDeploymentCandidateForTest({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  }, {
    fault: "throw_after_commit"
  }), /PROVIDER_CANDIDATE_TEST_FAULT_INVALID/u);
  await assert.rejects(readFile(fixture.outputRoot), (error) => error?.code === "ENOENT" || error?.code === "EISDIR");

  await assert.rejects(collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot,
    onReceiptPublishedCheckpoint: async () => undefined
  }), /PROVIDER_CANDIDATE_COLLECTOR_INPUT_INVALID/u);
});

test("existing output is never overwritten and candidate scripts remain outside formal Release Evidence", async (t) => {
  const fixture = await createFormalFixture(t);
  await mkdir(fixture.outputRoot);
  await assert.rejects(collectProviderDeploymentCandidate({
    environment: fixture.environment,
    adapter: adapterFor(),
    cwd: workspaceRoot
  }), /OUTPUT_EXISTS/u);
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  assert.doesNotMatch(packageJson.scripts["test:release-evidence"], /provider-deployment-candidate/u);
});
